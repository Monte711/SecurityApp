#!/usr/bin/env python3
"""
Redis to OpenSearch Worker
Cybersecurity Platform - Step 5

Worker сервис для обработки событий из Redis и записи в OpenSearch.
Обеспечивает надежную доставку и обработку ошибок.
"""

import asyncio
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from opensearchpy import AsyncOpenSearch, RequestError
import aiohttp

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Конфигурация из переменных окружения
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
OPENSEARCH_URL = os.getenv("OPENSEARCH_URL", "http://localhost:9200")
WORKER_NAME = os.getenv("WORKER_NAME", "redis-opensearch-worker")
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "10"))
BATCH_TIMEOUT = int(os.getenv("BATCH_TIMEOUT", "5"))
RETRY_ATTEMPTS = int(os.getenv("RETRY_ATTEMPTS", "3"))
RETRY_DELAY = int(os.getenv("RETRY_DELAY", "5"))
HEALTH_CHECK_INTERVAL = int(os.getenv("HEALTH_CHECK_INTERVAL", "30"))

# Streams для обработки
STREAMS = [
    "events:security",   # События безопасности
    "events:ingestion"   # События телеметрии агентов
]

class WorkerHealthChecker:
    """Проверка здоровья worker'а"""
    
    def __init__(self, redis_client: aioredis.Redis, opensearch_client: AsyncOpenSearch):
        self.redis = redis_client
        self.opensearch = opensearch_client
        self.last_activity = time.time()
        self.processed_events = 0
        self.failed_events = 0
        
    async def update_activity(self, success: bool = True):
        """Обновление активности"""
        self.last_activity = time.time()
        if success:
            self.processed_events += 1
        else:
            self.failed_events += 1
    
    async def health_check(self) -> Dict[str, Any]:
        """Полная проверка здоровья"""
        status = {
            "worker_name": WORKER_NAME,
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "uptime_seconds": time.time() - start_time,
            "processed_events": self.processed_events,
            "failed_events": self.failed_events,
            "last_activity": self.last_activity,
            "services": {}
        }
        
        # Проверка Redis
        try:
            await self.redis.ping()
            status["services"]["redis"] = "healthy"
        except Exception as e:
            status["services"]["redis"] = f"unhealthy: {e}"
            status["status"] = "degraded"
        
        # Проверка OpenSearch
        try:
            await self.opensearch.ping()
            status["services"]["opensearch"] = "healthy"
        except Exception as e:
            status["services"]["opensearch"] = f"unhealthy: {e}"
            status["status"] = "degraded"
        
        return status
    
    async def start_health_reporter(self):
        """Запуск периодической отправки статуса здоровья"""
        while True:
            try:
                await asyncio.sleep(HEALTH_CHECK_INTERVAL)
                health = await self.health_check()
                
                # Отправляем статус в Redis для мониторинга
                await self.redis.setex(
                    f"worker:health:{WORKER_NAME}",
                    HEALTH_CHECK_INTERVAL * 2,  # TTL в два раза больше интервала
                    json.dumps(health)
                )
                
                if health["status"] != "healthy":
                    logger.warning(f"Worker не здоров: {health}")
                else:
                    logger.debug(f"Health check: обработано {health['processed_events']} событий")
                    
            except Exception as e:
                logger.error(f"Ошибка health check: {e}")

class EventProcessor:
    """Процессор событий из Redis в OpenSearch"""
    
    def __init__(self, redis_client: aioredis.Redis, opensearch_client: AsyncOpenSearch):
        self.redis = redis_client
        self.opensearch = opensearch_client
        self.health_checker = WorkerHealthChecker(redis_client, opensearch_client)
        
    async def get_index_name(self, timestamp_str: str, event_type: str = "security") -> str:
        """Определение имени индекса на основе даты и типа события"""
        try:
            # Парсинг timestamp
            if timestamp_str.endswith('Z'):
                timestamp_str = timestamp_str[:-1] + '+00:00'
            
            dt = datetime.fromisoformat(timestamp_str)
            date_part = dt.strftime('%Y.%m.%d')
            
            if event_type == "security":
                return f"security-events-{date_part}"
            else:
                return f"agent-events-{date_part}"
                
        except Exception as e:
            logger.warning(f"Ошибка парсинга timestamp {timestamp_str}: {e}")
            # Fallback на текущую дату
            date_part = datetime.now().strftime('%Y.%m.%d')
            return f"security-events-{date_part}" if event_type == "security" else f"agent-events-{date_part}"
    
    async def ensure_index_exists(self, index_name: str):
        """Создание индекса если он не существует"""
        try:
            exists = await self.opensearch.indices.exists(index=index_name)
            if not exists:
                # Создаем индекс с базовыми настройками
                index_config = {
                    "settings": {
                        "number_of_shards": 1,
                        "number_of_replicas": 0,
                        "index": {
                            "refresh_interval": "5s"
                        }
                    },
                    "mappings": {
                        "properties": {
                            "timestamp": {"type": "date"},
                            "received_at": {"type": "date"},
                            "event_id": {"type": "keyword"},
                            "source": {"type": "keyword"},
                            "threat_type": {"type": "keyword"},
                            "threat_type_ru": {"type": "keyword"},
                            "severity": {"type": "keyword"},
                            "severity_ru": {"type": "keyword"},
                            "description": {
                                "type": "text",
                                "analyzer": "standard",
                                "fields": {
                                    "keyword": {
                                        "type": "keyword",
                                        "ignore_above": 256
                                    }
                                }
                            },
                            "metadata": {
                                "type": "object",
                                "dynamic": True
                            },
                            "cve_id": {"type": "keyword"},
                            "cvss_score": {"type": "float"},
                            "malware_family": {"type": "keyword"},
                            "file_hash": {"type": "keyword"},
                            "source_ip": {"type": "ip"},
                            "target_port": {"type": "integer"},
                            "processed_at": {"type": "date"},
                            "processed_by": {"type": "keyword"}
                        }
                    }
                }
                
                await self.opensearch.indices.create(index=index_name, body=index_config)
                logger.info(f"Создан индекс: {index_name}")
                
        except Exception as e:
            logger.error(f"Ошибка создания индекса {index_name}: {e}")
    
    async def index_event(self, event_data: Dict[str, Any]) -> bool:
        """Индексация одного события в OpenSearch"""
        try:
            # Определение типа события и индекса
            if 'threat_type' in event_data:
                event_type = "security"
                index_name = await self.get_index_name(event_data.get('timestamp', ''), "security")
            else:
                event_type = "agent"
                index_name = await self.get_index_name(event_data.get('timestamp', ''), "agent")
            
            # Убеждаемся что индекс существует
            await self.ensure_index_exists(index_name)
            
            # Добавляем метаданные обработки
            event_data['processed_at'] = datetime.now(timezone.utc).isoformat()
            event_data['processed_by'] = WORKER_NAME
            
            # Индексируем событие
            event_id = event_data.get('event_id', f"auto-{int(time.time())}")
            
            await self.opensearch.index(
                index=index_name,
                id=event_id,
                body=event_data,
                refresh=True
            )
            
            logger.debug(f"Событие {event_id} проиндексировано в {index_name}")
            return True
            
        except RequestError as e:
            logger.error(f"OpenSearch RequestError для события {event_data.get('event_id', 'unknown')}: {e}")
            return False
        except Exception as e:
            logger.error(f"Ошибка индексации события {event_data.get('event_id', 'unknown')}: {e}")
            return False
    
    async def process_stream_message(self, stream: str, message_id: str, fields: Dict) -> bool:
        """Обработка одного сообщения из stream"""
        try:
            # Декодируем поля сообщения
            event_data = {}
            for key, value in fields.items():
                if isinstance(value, bytes):
                    value = value.decode('utf-8')
                
                key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                
                # Специальная обработка для поля metadata - пытаемся распарсить как JSON
                if key_str == 'metadata' and isinstance(value, str):
                    try:
                        # Сначала пытаемся JSON
                        event_data[key_str] = json.loads(value)
                    except json.JSONDecodeError:
                        # Если не JSON, попытаемся eval (небезопасно, но для нашего контролируемого случая)
                        try:
                            import ast
                            event_data[key_str] = ast.literal_eval(value)
                        except (ValueError, SyntaxError):
                            # Оставляем как строку
                            event_data[key_str] = value
                # Для остальных полей - обычная обработка JSON
                elif isinstance(value, str) and (value.startswith('{') or value.startswith('[')):
                    try:
                        event_data[key_str] = json.loads(value)
                    except json.JSONDecodeError:
                        event_data[key_str] = value
                else:
                    event_data[key_str] = value
            
            # Если все данные в одном поле (обычно при отправке через xadd)
            if len(event_data) == 1:
                key = list(event_data.keys())[0]
                if isinstance(event_data[key], (str, bytes)):
                    try:
                        parsed_data = json.loads(event_data[key])
                        if isinstance(parsed_data, dict):
                            event_data = parsed_data
                    except json.JSONDecodeError:
                        pass
            
            logger.debug(f"Обработка сообщения {message_id} из {stream}: {event_data.get('event_id', 'unknown')}")
            
            # Индексируем событие
            success = await self.index_event(event_data)
            
            if success:
                # Подтверждаем обработку сообщения
                await self.redis.xack(stream, WORKER_NAME, message_id)
                await self.health_checker.update_activity(True)
                return True
            else:
                await self.health_checker.update_activity(False)
                return False
                
        except Exception as e:
            logger.error(f"Ошибка обработки сообщения {message_id} из {stream}: {e}")
            await self.health_checker.update_activity(False)
            return False
    
    async def setup_consumer_groups(self):
        """Настройка consumer groups для streams"""
        for stream in STREAMS:
            try:
                # Создаем consumer group если не существует
                try:
                    await self.redis.xgroup_create(stream, WORKER_NAME, id='0', mkstream=True)
                    logger.info(f"Создана consumer group {WORKER_NAME} для stream {stream}")
                except aioredis.RedisError as e:
                    if "BUSYGROUP" not in str(e):
                        logger.error(f"Ошибка создания consumer group для {stream}: {e}")
                    else:
                        logger.debug(f"Consumer group {WORKER_NAME} уже существует для {stream}")
                        
            except Exception as e:
                logger.error(f"Ошибка настройки consumer group для {stream}: {e}")
    
    async def process_pending_messages(self):
        """Обработка незавершенных сообщений"""
        for stream in STREAMS:
            try:
                # Получаем pending сообщения
                pending = await self.redis.xpending_range(
                    stream, WORKER_NAME, min='-', max='+', count=BATCH_SIZE
                )
                
                if pending:
                    logger.info(f"Найдено {len(pending)} незавершенных сообщений в {stream}")
                    
                    for msg_info in pending:
                        message_id = msg_info['message_id']
                        
                        # Получаем само сообщение
                        messages = await self.redis.xrange(stream, min=message_id, max=message_id)
                        if messages:
                            _, fields = messages[0]
                            await self.process_stream_message(stream, message_id, fields)
                            
            except Exception as e:
                logger.error(f"Ошибка обработки pending сообщений для {stream}: {e}")
    
    async def process_streams(self):
        """Основной цикл обработки streams"""
        logger.info(f"Запуск обработки streams: {STREAMS}")
        
        while True:
            try:
                # Читаем сообщения из всех streams
                streams_dict = {stream: '>' for stream in STREAMS}
                
                messages = await self.redis.xreadgroup(
                    WORKER_NAME,
                    WORKER_NAME,
                    streams_dict,
                    count=BATCH_SIZE,
                    block=1000  # блокируемся на 1 секунду
                )
                
                if messages:
                    for stream, stream_messages in messages:
                        stream = stream.decode('utf-8')
                        
                        for message_id, fields in stream_messages:
                            message_id = message_id.decode('utf-8')
                            await self.process_stream_message(stream, message_id, fields)
                
            except asyncio.CancelledError:
                logger.info("Обработка streams остановлена")
                break
            except Exception as e:
                logger.error(f"Ошибка в цикле обработки streams: {e}")
                await asyncio.sleep(RETRY_DELAY)

# Глобальные переменные для graceful shutdown
shutdown_event = asyncio.Event()
start_time = time.time()

async def shutdown_handler():
    """Обработчик graceful shutdown"""
    logger.info("Получен сигнал завершения, начинаем graceful shutdown...")
    shutdown_event.set()

def signal_handler(signum, frame):
    """Обработчик системных сигналов"""
    logger.info(f"Получен сигнал {signum}")
    asyncio.create_task(shutdown_handler())

@asynccontextmanager
async def create_clients():
    """Создание и управление клиентами Redis и OpenSearch"""
    redis_client = None
    opensearch_client = None
    
    try:
        # Подключение к Redis
        logger.info(f"Подключение к Redis: {REDIS_URL}")
        redis_client = aioredis.from_url(REDIS_URL)
        await redis_client.ping()
        logger.info("Redis подключен успешно")
        
        # Подключение к OpenSearch
        logger.info(f"Подключение к OpenSearch: {OPENSEARCH_URL}")
        opensearch_client = AsyncOpenSearch([OPENSEARCH_URL])
        await opensearch_client.ping()
        logger.info("OpenSearch подключен успешно")
        
        yield redis_client, opensearch_client
        
    except Exception as e:
        logger.error(f"Ошибка подключения к сервисам: {e}")
        raise
    finally:
        # Закрытие соединений
        if opensearch_client:
            await opensearch_client.close()
            logger.info("OpenSearch соединение закрыто")
        
        if redis_client:
            await redis_client.close()
            logger.info("Redis соединение закрыто")

async def main():
    """Основная функция worker'а"""
    global start_time
    start_time = time.time()
    
    # Установка обработчиков сигналов
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info(f"Запуск {WORKER_NAME}")
    logger.info(f"Redis URL: {REDIS_URL}")
    logger.info(f"OpenSearch URL: {OPENSEARCH_URL}")
    logger.info(f"Batch size: {BATCH_SIZE}")
    logger.info(f"Retry attempts: {RETRY_ATTEMPTS}")
    
    retry_count = 0
    
    while retry_count < RETRY_ATTEMPTS and not shutdown_event.is_set():
        try:
            async with create_clients() as (redis_client, opensearch_client):
                processor = EventProcessor(redis_client, opensearch_client)
                
                # Настройка consumer groups
                await processor.setup_consumer_groups()
                
                # Обработка незавершенных сообщений
                await processor.process_pending_messages()
                
                # Запуск health reporter в фоне
                health_task = asyncio.create_task(
                    processor.health_checker.start_health_reporter()
                )
                
                # Запуск основного процессора
                process_task = asyncio.create_task(processor.process_streams())
                
                logger.info("Worker успешно запущен и готов к обработке событий")
                
                # Ждем сигнала завершения
                await shutdown_event.wait()
                
                # Graceful shutdown
                logger.info("Завершение работы...")
                health_task.cancel()
                process_task.cancel()
                
                try:
                    await asyncio.gather(health_task, process_task, return_exceptions=True)
                except Exception:
                    pass
                
                logger.info("Worker успешно остановлен")
                return
                
        except Exception as e:
            retry_count += 1
            logger.error(f"Ошибка работы worker'а (попытка {retry_count}/{RETRY_ATTEMPTS}): {e}")
            
            if retry_count < RETRY_ATTEMPTS:
                logger.info(f"Повторная попытка через {RETRY_DELAY} секунд...")
                await asyncio.sleep(RETRY_DELAY)
            else:
                logger.error("Превышено максимальное количество попыток, завершение работы")
                sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker остановлен пользователем")
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
        sys.exit(1)
