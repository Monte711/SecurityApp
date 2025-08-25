"""
Cybersecurity Ingest API - Main Application
Unified Enterprise Cybersecurity Platform

FastAPI service для приема телеметрии от агентов и веб-интерфейса.
"""

import asyncio
import json
import logging
import os
import random
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException, Depends, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from opensearchpy import AsyncOpenSearch, RequestError
from pydantic import BaseModel, Field, validator
import uvicorn

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Конфигурация
OPENSEARCH_URL = os.getenv("OPENSEARCH_URL", "http://localhost:9200")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"

# Pydantic схемы

# === Схемы для телеметрии агентов (существующий формат) ===

class HostInfo(BaseModel):
    host_id: str = Field(..., description="Уникальный идентификатор хоста")
    hostname: str = Field(..., description="Имя хоста")
    domain: Optional[str] = Field(None, description="Домен хоста")
    os_version: Optional[str] = Field(None, description="Версия ОС")
    ip_addresses: Optional[List[str]] = Field(default_factory=list, description="IP адреса")

class AgentInfo(BaseModel):
    agent_version: str = Field(..., description="Версия агента")
    collect_level: str = Field(default="standard", description="Уровень сбора данных")
    
    @validator('collect_level')
    def validate_collect_level(cls, v):
        if v not in ['minimal', 'standard', 'detailed']:
            raise ValueError('collect_level должен быть minimal, standard или detailed')
        return v

class ProcessInfo(BaseModel):
    pid: Optional[int] = Field(None, description="PID процесса")
    ppid: Optional[int] = Field(None, description="PPID родительского процесса")
    name: Optional[str] = Field(None, description="Имя процесса")
    path: Optional[str] = Field(None, description="Путь к исполняемому файлу")
    command_line: Optional[str] = Field(None, description="Командная строка")
    user: Optional[str] = Field(None, description="Пользователь")

class FileInfo(BaseModel):
    path: Optional[str] = Field(None, description="Путь к файлу")
    name: Optional[str] = Field(None, description="Имя файла")
    size: Optional[int] = Field(None, description="Размер файла")
    created: Optional[str] = Field(None, description="Время создания")
    modified: Optional[str] = Field(None, description="Время модификации")

class NetworkInfo(BaseModel):
    protocol: Optional[str] = Field(None, description="Протокол")
    source_ip: Optional[str] = Field(None, description="IP источника")
    source_port: Optional[int] = Field(None, description="Порт источника")
    destination_ip: Optional[str] = Field(None, description="IP назначения")
    destination_port: Optional[int] = Field(None, description="Порт назначения")
    bytes_sent: Optional[int] = Field(None, description="Байт отправлено")
    bytes_received: Optional[int] = Field(None, description="Байт получено")

class AgentTelemetryEvent(BaseModel):
    event_id: str = Field(..., description="Уникальный ID события")
    event_type: str = Field(..., description="Тип события")
    timestamp: str = Field(..., description="Время события ISO 8601")
    severity: str = Field(default="info", description="Уровень критичности")
    host: HostInfo = Field(..., description="Информация о хосте")
    agent: AgentInfo = Field(..., description="Информация об агенте")
    
    # Опциональные поля в зависимости от типа события
    process: Optional[ProcessInfo] = Field(None, description="Информация о процессе")
    file: Optional[FileInfo] = Field(None, description="Информация о файле")
    network: Optional[NetworkInfo] = Field(None, description="Сетевая информация")
    raw_data: Optional[Dict[str, Any]] = Field(None, description="Дополнительные данные")
    tags: Optional[List[str]] = Field(default_factory=list, description="Теги")
    
    @validator('event_type')
    def validate_event_type(cls, v):
        valid_types = [
            'process_start', 'process_end', 'file_create', 'file_modify', 
            'file_delete', 'network_connection', 'registry_modify',
            'service_start', 'service_stop', 'user_login', 'user_logout',
            'security_alert', 'system_info'
        ]
        if v not in valid_types:
            raise ValueError(f'event_type должен быть одним из: {valid_types}')
        return v
    
    @validator('severity')
    def validate_severity(cls, v):
        if v not in ['info', 'low', 'medium', 'high', 'critical']:
            raise ValueError('severity должен быть info, low, medium, high или critical')
        return v

class IngestResponse(BaseModel):
    event_id: str = Field(..., description="ID обработанного события")
    status: str = Field(..., description="Статус обработки")
    message: Optional[str] = Field(None, description="Дополнительное сообщение")
    processing_time_ms: Optional[int] = Field(None, description="Время обработки в мс")

# === Схемы для агента host_posture (формат Go-агента) ===

class GoAgentInfo(BaseModel):
    agent_id: Optional[str] = Field(None, description="ID агента")
    agent_version: Optional[str] = Field(None, description="Версия агента")

class GoHostInfo(BaseModel):
    host_id: Optional[str] = Field(None, description="ID хоста")
    hostname: str = Field(..., description="Имя хоста")
    os: Optional[Dict[str, Any]] = Field(None, description="Информация об ОС")
    uptime_seconds: Optional[int] = Field(None, description="Время работы в секундах")

class GoProcessInfo(BaseModel):
    pid: Optional[int] = Field(None, description="PID процесса")
    ppid: Optional[int] = Field(None, description="PPID родительского процесса")
    name: Optional[str] = Field(None, description="Имя процесса")
    exe_path: Optional[str] = Field(None, description="Путь к exe")
    cmdline: Optional[str] = Field(None, description="Командная строка")
    username: Optional[str] = Field(None, description="Пользователь")

class GoAutorunInfo(BaseModel):
    name: Optional[str] = Field(None, description="Имя автозапуска")
    command: Optional[str] = Field(None, description="Команда")
    location: Optional[str] = Field(None, description="Расположение")
    enabled: Optional[bool] = Field(None, description="Включен ли")

class GoAutorunsInfo(BaseModel):
    startup_programs: Optional[List[GoAutorunInfo]] = Field(None, description="Программы автозапуска")
    run_keys: Optional[List[GoAutorunInfo]] = Field(None, description="Ключи реестра Run")
    services: Optional[List[GoAutorunInfo]] = Field(None, description="Службы")
    scheduled_tasks: Optional[List[GoAutorunInfo]] = Field(None, description="Запланированные задачи")

class GoInventoryInfo(BaseModel):
    processes: Optional[List[GoProcessInfo]] = Field(None, description="Список процессов")
    autoruns: Optional[GoAutorunsInfo] = Field(None, description="Автозапуски")

class GoSecurityModule(BaseModel):
    name: str = Field(..., description="Название модуля")
    status: str = Field(..., description="Статус")
    details: Optional[Dict[str, Any]] = Field(None, description="Детали")

class GoSecurityInfo(BaseModel):
    modules: Optional[List[GoSecurityModule]] = Field(None, description="Модули безопасности")

class GoFinding(BaseModel):
    rule_id: str = Field(..., description="ID правила")
    severity: str = Field(..., description="Уровень критичности")
    message_ru: str = Field(..., description="Сообщение на русском")
    evidence: Optional[str] = Field(None, description="Доказательства")

class GoMetadataInfo(BaseModel):
    collector: Optional[str] = Field(None, description="Коллектор")
    schema_version: Optional[str] = Field(None, description="Версия схемы")

class HostPostureEvent(BaseModel):
    event_id: str = Field(..., description="ID события")
    event_type: str = Field(..., description="Тип события")
    timestamp: str = Field(..., alias="@timestamp", description="Время события")
    host: GoHostInfo = Field(..., description="Информация о хосте")
    agent: GoAgentInfo = Field(..., description="Информация об агенте")
    inventory: Optional[GoInventoryInfo] = Field(None, description="Инвентарь")
    security: Optional[GoSecurityInfo] = Field(None, description="Безопасность")
    findings: Optional[List[GoFinding]] = Field(None, description="Находки")
    metadata: Optional[GoMetadataInfo] = Field(None, description="Метаданные")

# === Схемы для событий безопасности (новый формат) ===

class SecurityEvent(BaseModel):
    """Схема для событий безопасности от внешних источников"""
    event_id: Optional[str] = Field(None, description="Уникальный ID события")
    timestamp: str = Field(..., description="Время события ISO 8601")
    source: str = Field(..., description="Источник события")
    threat_type: str = Field(..., description="Тип угрозы")
    description: str = Field(..., description="Описание события")
    severity: str = Field(..., description="Уровень критичности")
    
    # Опциональные поля для дополнительной информации
    cve_id: Optional[str] = Field(None, description="Идентификатор CVE")
    cvss_score: Optional[float] = Field(None, description="Оценка CVSS")
    malware_family: Optional[str] = Field(None, description="Семейство вредоносного ПО")
    file_hash: Optional[str] = Field(None, description="Хеш файла")
    source_ip: Optional[str] = Field(None, description="IP источника")
    target_port: Optional[int] = Field(None, description="Целевой порт")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Дополнительные метаданные")
    
    @validator('threat_type')
    def validate_threat_type(cls, v):
        valid_types = [
            'exploit', 'malware', 'phishing', 'vulnerability', 'intrusion',
            'ransomware', 'trojan', 'backdoor', 'rootkit', 'botnet'
        ]
        if v not in valid_types:
            raise ValueError(f'threat_type должен быть одним из: {valid_types}')
        return v
    
    @validator('severity')
    def validate_severity(cls, v):
        if v not in ['critical', 'high', 'medium', 'low', 'info']:
            raise ValueError('severity должен быть critical, high, medium, low или info')
        return v

class EventsResponse(BaseModel):
    events: List[Dict[str, Any]] = Field(..., description="Список событий")
    total: int = Field(..., description="Общее количество")
    page: int = Field(..., description="Номер страницы")
    size: int = Field(..., description="Размер страницы")

# Глобальные подключения
opensearch_client: Optional[AsyncOpenSearch] = None
redis_client: Optional[aioredis.Redis] = None

# Инициализация FastAPI
app = FastAPI(
    title="Cybersecurity Ingest API",
    description="API для приема телеметрии от агентов безопасности",
    version="1.0.0",
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None
)

# CORS middleware для развития
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://172.20.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lifecycle events
@app.on_event("startup")
async def startup_event():
    """Инициализация соединений при запуске"""
    global opensearch_client, redis_client
    
    logger.info("Запуск Ingest API...")
    
    # Инициализация OpenSearch
    try:
        opensearch_client = AsyncOpenSearch([OPENSEARCH_URL])
        # Проверка соединения
        await opensearch_client.ping()
        logger.info(f"OpenSearch подключен: {OPENSEARCH_URL}")
    except Exception as e:
        logger.error(f"Ошибка подключения к OpenSearch: {e}")
        opensearch_client = None
    
    # Инициализация Redis
    try:
        redis_client = aioredis.from_url(REDIS_URL)
        # Проверка соединения
        await redis_client.ping()
        logger.info(f"Redis подключен: {REDIS_URL}")
    except Exception as e:
        logger.error(f"Ошибка подключения к Redis: {e}")
        redis_client = None
    
    logger.info("Ingest API готов к работе")

@app.on_event("shutdown")
async def shutdown_event():
    """Закрытие соединений при остановке"""
    global opensearch_client, redis_client
    
    logger.info("Остановка Ingest API...")
    
    if opensearch_client:
        await opensearch_client.close()
    
    if redis_client:
        await redis_client.close()
    
    logger.info("Ingest API остановлен")

# Dependency functions
async def get_opensearch() -> AsyncOpenSearch:
    """Получение OpenSearch клиента"""
    if not opensearch_client:
        raise HTTPException(status_code=503, detail="OpenSearch недоступен")
    return opensearch_client

async def get_redis() -> aioredis.Redis:
    """Получение Redis клиента"""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis недоступен")
    return redis_client

# Helper functions
def get_index_name(timestamp: str) -> str:
    """Генерация имени индекса на основе даты"""
    try:
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        return f"agent-events-{dt.strftime('%Y.%m.%d')}"
    except Exception:
        # Fallback на текущую дату
        return f"agent-events-{datetime.now().strftime('%Y.%m.%d')}"

async def check_event_exists(opensearch: AsyncOpenSearch, index: str, event_id: str) -> bool:
    """Проверка существования события (для идемпотентности)"""
    try:
        response = await opensearch.exists(index=index, id=event_id)
        return response
    except Exception as e:
        logger.warning(f"Ошибка проверки существования события {event_id}: {e}")
        return False

async def index_event(opensearch: AsyncOpenSearch, index: str, event_id: str, event_data: dict) -> bool:
    """Индексация события в OpenSearch"""
    try:
        # Добавляем метаданные обработки
        event_data['indexed_at'] = datetime.now(timezone.utc).isoformat()
        event_data['index_name'] = index
        
        await opensearch.index(
            index=index,
            id=event_id,
            body=event_data,
            refresh=True  # Для немедленной доступности в поиске
        )
        return True
    except RequestError as e:
        logger.error(f"OpenSearch ошибка индексации события {event_id}: {e}")
        return False
    except Exception as e:
        logger.error(f"Ошибка индексации события {event_id}: {e}")
        return False

async def publish_to_stream(redis: aioredis.Redis, stream: str, event_data: dict) -> bool:
    """Публикация события в Redis Stream"""
    try:
        # Подготавливаем данные для Redis Stream
        cleaned_data = {}
        for k, v in event_data.items():
            if v is not None:
                # Для сложных объектов сериализуем в JSON
                if isinstance(v, (dict, list)):
                    cleaned_data[k] = json.dumps(v, ensure_ascii=False, default=str)
                else:
                    cleaned_data[k] = str(v)
        
        await redis.xadd(stream, cleaned_data)
        return True
    except Exception as e:
        logger.error(f"Ошибка публикации в Redis Stream {stream}: {e}")
        return False

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {}
    }
    
    # Проверка OpenSearch
    if opensearch_client:
        try:
            await opensearch_client.ping()
            status["services"]["opensearch"] = "healthy"
        except:
            status["services"]["opensearch"] = "unhealthy"
            status["status"] = "degraded"
    else:
        status["services"]["opensearch"] = "unavailable"
        status["status"] = "degraded"
    
    # Проверка Redis
    if redis_client:
        try:
            await redis_client.ping()
            status["services"]["redis"] = "healthy"
        except:
            status["services"]["redis"] = "unhealthy"
            status["status"] = "degraded"
    else:
        status["services"]["redis"] = "unavailable"
        status["status"] = "degraded"
    
    return status

@app.post("/ingest", response_model=IngestResponse)
async def ingest_event(
    event: AgentTelemetryEvent,
    request: Request,
    background_tasks: BackgroundTasks,
    opensearch: AsyncOpenSearch = Depends(get_opensearch),
    redis: aioredis.Redis = Depends(get_redis)
) -> IngestResponse:
    """
    Прием события телеметрии от агента или UI (старый формат).
    
    Обеспечивает:
    - Валидацию события по схеме AgentTelemetryEvent
    - Идемпотентность через event_id
    - Сохранение в OpenSearch (индекс agent-events)
    - Публикацию в Redis Stream
    """
    start_time = datetime.now()
    
    try:
        # Получение дополнительных заголовков
        agent_id = request.headers.get("X-Agent-ID", "unknown")
        user_agent = request.headers.get("User-Agent", "")
        
        logger.info(f"Получено событие {event.event_id} от агента {agent_id}")
        
        # Определение индекса
        index_name = get_index_name(event.timestamp)
        
        # Проверка идемпотентности
        exists = await check_event_exists(opensearch, index_name, event.event_id)
        if exists:
            logger.info(f"Событие {event.event_id} уже существует")
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            return IngestResponse(
                event_id=event.event_id,
                status="duplicate",
                message="Событие уже было обработано",
                processing_time_ms=processing_time
            )
        
        # Подготовка данных для сохранения
        event_data = event.dict()
        event_data['received_at'] = datetime.now(timezone.utc).isoformat()
        event_data['agent_id'] = agent_id
        event_data['user_agent'] = user_agent
        
        # Сохранение в OpenSearch
        indexed = await index_event(opensearch, index_name, event.event_id, event_data)
        if not indexed:
            raise HTTPException(status_code=500, detail="Ошибка сохранения события")
        
        # Публикация в Redis Stream для дальнейшей обработки
        published = await publish_to_stream(redis, "events:ingestion", event_data)
        if not published:
            logger.warning(f"Событие {event.event_id} сохранено в OpenSearch, но не опубликовано в Redis")
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        logger.info(f"Событие {event.event_id} успешно обработано за {processing_time}ms")
        
        return IngestResponse(
            event_id=event.event_id,
            status="accepted",
            message="Событие успешно обработано",
            processing_time_ms=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        logger.error(f"Ошибка обработки события {event.event_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Внутренняя ошибка обработки события"
        )

@app.post("/ingest/host-posture", response_model=IngestResponse)
async def ingest_host_posture_event(
    event: HostPostureEvent,
    request: Request,
    background_tasks: BackgroundTasks,
    opensearch: AsyncOpenSearch = Depends(get_opensearch),
    redis: aioredis.Redis = Depends(get_redis)
) -> IngestResponse:
    """
    Прием события host_posture от Go-агента.
    
    Обеспечивает:
    - Валидацию события по схеме HostPostureEvent
    - Идемпотентность через event_id
    - Сохранение в OpenSearch
    - Публикацию в Redis Stream
    """
    start_time = datetime.now()
    
    try:
        # Получение дополнительных заголовков
        agent_id = request.headers.get("X-Agent-ID", event.agent.agent_id or "unknown")
        user_agent = request.headers.get("User-Agent", "")
        
        logger.info(f"Получено событие host_posture {event.event_id} от агента {agent_id}")
        
        # Определение индекса
        index_name = get_index_name(event.timestamp)
        
        # Проверка идемпотентности
        exists = await check_event_exists(opensearch, index_name, event.event_id)
        if exists:
            logger.info(f"Событие host_posture {event.event_id} уже существует")
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            return IngestResponse(
                event_id=event.event_id,
                status="duplicate",
                message="Событие уже было обработано",
                processing_time_ms=processing_time
            )
        
        # Подготовка данных для сохранения
        event_data = event.dict()
        event_data['received_at'] = datetime.now(timezone.utc).isoformat()
        event_data['agent_id'] = agent_id
        event_data['user_agent'] = user_agent
        event_data['format_type'] = 'host_posture'
        
        # Добавляем совместимые поля для UI
        event_data['severity'] = 'info'
        event_data['host_info'] = {
            'hostname': event.host.hostname,
            'host_id': event.host.host_id or event.host.hostname,
            'os': event.host.os,
            'uptime_seconds': event.host.uptime_seconds
        }
        
        # Сохранение в OpenSearch
        indexed = await index_event(opensearch, index_name, event.event_id, event_data)
        if not indexed:
            raise HTTPException(status_code=500, detail="Ошибка сохранения события host_posture")
        
        # Публикация в Redis Stream для дальнейшей обработки
        published = await publish_to_stream(redis, "events:host_posture", event_data)
        if not published:
            logger.warning(f"Событие host_posture {event.event_id} сохранено в OpenSearch, но не опубликовано в Redis")
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        logger.info(f"Событие host_posture {event.event_id} успешно обработано за {processing_time}ms")
        
        return IngestResponse(
            event_id=event.event_id,
            status="accepted",
            message="Событие host_posture успешно обработано",
            processing_time_ms=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        logger.error(f"Ошибка обработки события host_posture {event.event_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Внутренняя ошибка обработки события host_posture"
        )

@app.post("/ingest/security", response_model=IngestResponse)
async def ingest_security_event(
    event: SecurityEvent,
    request: Request,
    background_tasks: BackgroundTasks,
    opensearch: AsyncOpenSearch = Depends(get_opensearch),
    redis: aioredis.Redis = Depends(get_redis)
) -> IngestResponse:
    """
    Прием события безопасности от внешних источников.
    
    Поддерживает новый формат событий для угроз безопасности:
    - Валидация по схеме SecurityEvent
    - Автоматическая генерация event_id если не указан
    - Сохранение в индекс security-events
    - Публикация в Redis Stream для обработки
    """
    start_time = datetime.now()
    
    try:
        # Генерация event_id если не указан
        if not event.event_id:
            event.event_id = f"sec-{int(time.time())}-{random.randint(1000, 9999)}"
        
        # Получение дополнительных заголовков
        source_system = request.headers.get("X-Source-System", "unknown")
        user_agent = request.headers.get("User-Agent", "")
        
        logger.info(f"Получено событие безопасности {event.event_id} от источника {source_system}")
        
        # Определение индекса для событий безопасности
        try:
            dt = datetime.fromisoformat(event.timestamp.replace('Z', '+00:00'))
            index_name = f"security-events-{dt.strftime('%Y.%m.%d')}"
        except Exception:
            # Fallback на текущую дату
            index_name = f"security-events-{datetime.now().strftime('%Y.%m.%d')}"
        
        # Проверка идемпотентности
        exists = await check_event_exists(opensearch, index_name, event.event_id)
        if exists:
            logger.info(f"Событие безопасности {event.event_id} уже существует")
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            return IngestResponse(
                event_id=event.event_id,
                status="duplicate",
                message="Событие уже было обработано",
                processing_time_ms=processing_time
            )
        
        # Подготовка данных для сохранения
        event_data = event.dict()
        event_data['received_at'] = datetime.now(timezone.utc).isoformat()
        event_data['source_system'] = source_system
        event_data['user_agent'] = user_agent
        event_data['event_format'] = 'security_v1'
        
        # Добавление русских названий для Dashboard
        severity_translations = {
            'critical': 'критический',
            'high': 'высокий', 
            'medium': 'средний',
            'low': 'низкий',
            'info': 'информационный'
        }
        event_data['severity_ru'] = severity_translations.get(event.severity, event.severity)
        
        threat_type_translations = {
            'exploit': 'эксплойт',
            'malware': 'вредоносное ПО',
            'phishing': 'фишинг',
            'vulnerability': 'уязвимость',
            'intrusion': 'вторжение',
            'ransomware': 'вымогатель',
            'trojan': 'троян',
            'backdoor': 'бэкдор',
            'rootkit': 'руткит',
            'botnet': 'ботнет'
        }
        event_data['threat_type_ru'] = threat_type_translations.get(event.threat_type, event.threat_type)
        
        # Сохранение в OpenSearch
        indexed = await index_event(opensearch, index_name, event.event_id, event_data)
        if not indexed:
            raise HTTPException(status_code=500, detail="Ошибка сохранения события безопасности")
        
        # Публикация в Redis Stream для дальнейшей обработки
        published = await publish_to_stream(redis, "events:security", event_data)
        if not published:
            logger.warning(f"Событие безопасности {event.event_id} сохранено в OpenSearch, но не опубликовано в Redis")
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        logger.info(f"Событие безопасности {event.event_id} успешно обработано за {processing_time}ms")
        
        return IngestResponse(
            event_id=event.event_id,
            status="accepted",
            message="Событие безопасности успешно обработано",
            processing_time_ms=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        logger.error(f"Ошибка обработки события безопасности {event.event_id if hasattr(event, 'event_id') else 'unknown'}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Внутренняя ошибка обработки события безопасности: {str(e)}"
        )

@app.get("/events", response_model=EventsResponse)
async def get_events(
    limit: int = 100,
    page: int = 1,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    host_id: Optional[str] = None,
    opensearch: AsyncOpenSearch = Depends(get_opensearch)
) -> EventsResponse:
    """
    Получение списка событий с фильтрацией и пагинацией.
    Объединяет события агентов и события безопасности.
    """
    logger.info(f"DEBUG: get_events called with limit={limit}, page={page}")
    try:
        # Валидация параметров
        if limit > 1000:
            limit = 1000
        if page < 1:
            page = 1
        
        offset = (page - 1) * limit
        
        # Простой запрос для получения всех событий агентов
        query = {"match_all": {}}
        
        # Добавление фильтров если есть
        filters = []
        if event_type:
            filters.append({"term": {"event_type.keyword": event_type}})
        if severity:
            filters.append({"term": {"severity.keyword": severity}})
        if host_id:
            filters.append({"term": {"host.hostname.keyword": host_id}})
        
        if filters:
            query = {"bool": {"filter": filters}}
        
        search_body = {
            "query": query,
            "sort": [{"timestamp": {"order": "desc"}}],
            "from": offset,
            "size": limit
        }
        
        logger.info(f"Search query: {search_body}")
        logger.info(f"Searching index: agent-events-*")
        
        response = await opensearch.search(
            index="agent-events-*",
            body=search_body
        )
        
        logger.info(f"OpenSearch response: hits total = {response['hits']['total']}, got {len(response['hits']['hits'])} hits")
        
        total = response['hits']['total']['value']
        events = []
        
        for hit in response['hits']['hits']:
            event_data = hit['_source']
            
            # Определяем тип события для отображения
            event_type_display = {
                'system_info': 'System Information',
                'process_start': 'Process Start',
                'process_end': 'Process End',
                'file_create': 'File Created',
                'file_modify': 'File Modified',
                'file_delete': 'File Deleted',
                'network_connection': 'Network Connection',
                'user_login': 'User Login',
                'user_logout': 'User Logout',
                'security_alert': 'Security Alert'
            }.get(event_data.get('event_type'), event_data.get('event_type', 'Unknown'))
            
            formatted_event = {
                "_id": hit['_id'],
                "_index": hit['_index'],
                "event_id": event_data.get('event_id'),
                "event_type": event_type_display,
                "timestamp": event_data.get('timestamp'),
                "severity": event_data.get('severity', 'info'),
                "host": event_data.get('host', {}).get('hostname', 'unknown'),
                "agent": event_data.get('agent', {}).get('agent_id', 'unknown'),
                "description": f"Event from agent {event_data.get('agent', {}).get('agent_id', 'unknown')}",
                "data": event_data.get('data', {}),
                "raw_data": event_data
            }
            events.append(formatted_event)
        
        logger.info(f"Returned {len(events)} events from total {total} (page {page})")
        
        return EventsResponse(
            events=events,
            total=total,
            page=page,
            size=len(events)
        )
        
    except Exception as e:
        logger.error(f"Error getting events: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting events: {str(e)}")

async def get_agent_events(opensearch: AsyncOpenSearch, limit: int, offset: int, event_type: Optional[str], severity: Optional[str], host_id: Optional[str]):
    """Получение событий от агентов"""
    query = {"match_all": {}}
    
    # Добавление фильтров
    filters = []
    if event_type:
        filters.append({"term": {"event_type.keyword": event_type}})
    if severity:
        filters.append({"term": {"severity.keyword": severity}})
    if host_id:
        filters.append({"term": {"host.hostname.keyword": host_id}})
    
    if filters:
        query = {"bool": {"filter": filters}}
    
    search_body = {
        "query": query,
        "sort": [{"timestamp": {"order": "desc"}}],
        "from": 0,
        "size": limit * 2  # Берем больше для объединения
    }
    
    try:
        response = await opensearch.search(
            index="agent-events-*",
            body=search_body
        )
        
        events = []
        for hit in response['hits']['hits']:
            event_data = hit['_source']
            
            # Определяем тип события для отображения
            event_type_display = {
                'system_info': 'Системная информация',
                'process_start': 'Запуск процесса',
                'process_end': 'Завершение процесса',
                'file_create': 'Создание файла',
                'file_modify': 'Изменение файла',
                'file_delete': 'Удаление файла',
                'network_connection': 'Сетевое соединение',
                'user_login': 'Вход пользователя',
                'user_logout': 'Выход пользователя',
                'security_alert': 'Алерт безопасности'
            }.get(event_data.get('event_type'), event_data.get('event_type', 'Неизвестно'))
            
            # Преобразуем в удобный формат для UI
            formatted_event = {
                "_id": hit['_id'],
                "_index": hit['_index'],
                "event_id": event_data.get('event_id'),
                "event_type": event_type_display,
                "timestamp": event_data.get('timestamp'),
                "severity": event_data.get('severity', 'info'),
                "severity_ru": {"info": "Информация", "low": "Низкий", "medium": "Средний", "high": "Высокий", "critical": "Критический"}.get(event_data.get('severity', 'info'), 'Информация'),
                "source": "Агент " + event_data.get('agent', {}).get('agent_version', '1.0.0'),
                "description": event_data.get('description', f"Событие от агента {event_data.get('agent', {}).get('agent_id', 'unknown')}"),
                "details": {
                    "Хост": event_data.get('host', {}).get('hostname', 'неизвестно'),
                    "ОС": event_data.get('host', {}).get('os', 'неизвестно'),
                    "Агент ID": event_data.get('agent', {}).get('agent_id', 'неизвестно'),
                    "Версия агента": event_data.get('agent', {}).get('agent_version', 'неизвестно')
                },
                "raw_data": event_data.get('data', {}),
                "tags": event_data.get('tags', [])
            }
            
            # Добавляем специфичные для типа события поля
            if event_data.get('process'):
                formatted_event["details"]["PID"] = event_data['process'].get('pid', 'неизвестно')
                formatted_event["details"]["Процесс"] = event_data['process'].get('name', 'неизвестно')
            
            if event_data.get('file'):
                formatted_event["details"]["Файл"] = event_data['file'].get('path', 'неизвестно')
                formatted_event["details"]["Размер"] = event_data['file'].get('size', 'неизвестно')
            
            if event_data.get('network'):
                formatted_event["details"]["Протокол"] = event_data['network'].get('protocol', 'неизвестно')
                formatted_event["details"]["Источник"] = f"{event_data['network'].get('source_ip', '')}:{event_data['network'].get('source_port', '')}"
                formatted_event["details"]["Назначение"] = f"{event_data['network'].get('destination_ip', '')}:{event_data['network'].get('destination_port', '')}"
            
            events.append(formatted_event)
        
        return events
    except Exception as e:
        logger.error(f"Ошибка получения событий агентов: {e}")
        return []

async def get_security_events_data(opensearch: AsyncOpenSearch, limit: int, offset: int, event_type: Optional[str], severity: Optional[str], host_id: Optional[str]):
    """Получение событий безопасности"""
    query = {"match_all": {}}
    
    # Добавление фильтров для событий безопасности
    filters = []
    if event_type and event_type != "system_info":
        filters.append({"term": {"threat_type.keyword": event_type}})
    if severity:
        filters.append({"term": {"severity.keyword": severity}})
    if host_id:
        filters.append({"term": {"source.keyword": host_id}})
    
    if filters:
        query = {"bool": {"filter": filters}}
    
    search_body = {
        "query": query,
        "sort": [{"timestamp": {"order": "desc"}}],
        "from": 0,
        "size": limit
    }
    
    try:
        response = await opensearch.search(
            index="security-events-*",
            body=search_body
        )
        
        events = []
        for hit in response['hits']['hits']:
            event_data = hit['_source']
            
            formatted_event = {
                "_id": hit['_id'],
                "_index": hit['_index'],
                "event_id": event_data.get('event_id'),
                "event_type": event_data.get('threat_type_ru', event_data.get('threat_type', 'Угроза')),
                "timestamp": event_data.get('timestamp'),
                "severity": event_data.get('severity', 'medium'),
                "severity_ru": event_data.get('severity_ru', 'Средний'),
                "source": event_data.get('source', 'Система безопасности'),
                "description": event_data.get('description', ''),
                "details": {
                    "Источник": event_data.get('source', 'неизвестно'),
                    "CVE ID": event_data.get('cve_id', 'нет'),
                    "CVSS": event_data.get('cvss_score', 'нет'),
                    "Семейство": event_data.get('malware_family', 'нет'),
                    "Хеш файла": event_data.get('file_hash', 'нет'),
                    "IP источника": event_data.get('source_ip', 'нет'),
                    "Порт": event_data.get('target_port', 'нет')
                },
                "raw_data": event_data,
                "tags": []
            }
            events.append(formatted_event)
        
        return events
    except:
        return []

@app.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    opensearch: AsyncOpenSearch = Depends(get_opensearch)
):
    """Удаление события по ID"""
    try:
        # Ищем событие во всех индексах
        search_body = {
            "query": {"term": {"_id": event_id}},
            "size": 1
        }
        
        # Ищем в индексах агентов
        try:
            response = await opensearch.search(
                index="agent-events-*",
                body=search_body
            )
            if response['hits']['total']['value'] > 0:
                hit = response['hits']['hits'][0]
                await opensearch.delete(index=hit['_index'], id=event_id)
                logger.info(f"Удалено событие агента {event_id}")
                return {"success": True, "message": "Событие агента удалено"}
        except:
            pass
        
        # Ищем в индексах безопасности
        try:
            response = await opensearch.search(
                index="security-events-*",
                body=search_body
            )
            if response['hits']['total']['value'] > 0:
                hit = response['hits']['hits'][0]
                await opensearch.delete(index=hit['_index'], id=event_id)
                logger.info(f"Удалено событие безопасности {event_id}")
                return {"success": True, "message": "Событие безопасности удалено"}
        except:
            pass
        
        raise HTTPException(status_code=404, detail="Событие не найдено")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка удаления события {event_id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка удаления события")

@app.get("/security-events", response_model=EventsResponse)
async def get_security_events(
    limit: int = 100,
    page: int = 1,
    threat_type: Optional[str] = None,
    severity: Optional[str] = None,
    source: Optional[str] = None,
    opensearch: AsyncOpenSearch = Depends(get_opensearch)
) -> EventsResponse:
    """
    Получение списка событий безопасности с фильтрацией и пагинацией.
    
    Параметры:
    - limit: количество событий на странице (макс 1000)
    - page: номер страницы (начиная с 1)
    - threat_type: фильтр по типу угрозы
    - severity: фильтр по уровню критичности
    - source: фильтр по источнику
    """
    try:
        # Валидация параметров
        if limit > 1000:
            limit = 1000
        if page < 1:
            page = 1
        
        offset = (page - 1) * limit
        
        # Построение запроса
        query = {"match_all": {}}
        
        # Добавление фильтров
        filters = []
        if threat_type:
            filters.append({"term": {"threat_type.keyword": threat_type}})
        if severity:
            filters.append({"term": {"severity.keyword": severity}})
        if source:
            filters.append({"term": {"source.keyword": source}})
        
        if filters:
            query = {"bool": {"filter": filters}}
        
        # Выполнение поискового запроса
        search_body = {
            "query": query,
            "sort": [{"timestamp": {"order": "desc"}}],
            "from": offset,
            "size": limit
        }
        
        response = await opensearch.search(
            index="security-events-*",
            body=search_body
        )
        
        # Получение общего количества
        total = response['hits']['total']['value']
        
        # Извлечение событий
        events = []
        for hit in response['hits']['hits']:
            event_data = hit['_source']
            event_data['_id'] = hit['_id']
            event_data['_index'] = hit['_index']
            events.append(event_data)
        
        logger.info(f"Получено {len(events)} событий безопасности (страница {page}, всего {total})")
        
        return EventsResponse(
            events=events,
            total=total,
            page=page,
            size=len(events)
        )
        
    except Exception as e:
        logger.error(f"Ошибка получения событий безопасности: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения событий безопасности")

@app.get("/events/{event_id}")
async def get_event_by_id(
    event_id: str,
    opensearch: AsyncOpenSearch = Depends(get_opensearch)
):
    """Получение конкретного события по ID"""
    try:
        # Поиск по всем индексам
        search_body = {
            "query": {"term": {"event_id": event_id}},
            "size": 1
        }
        
        response = await opensearch.search(
            index="agent-events-*",
            body=search_body
        )
        
        if response['hits']['total']['value'] == 0:
            raise HTTPException(status_code=404, detail="Событие не найдено")
        
        hit = response['hits']['hits'][0]
        event_data = hit['_source']
        event_data['_id'] = hit['_id']
        event_data['_index'] = hit['_index']
        
        return event_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка получения события {event_id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения события")

@app.get("/stats")
async def get_stats(
    opensearch: AsyncOpenSearch = Depends(get_opensearch)
):
    """Получение статистики системы с данными агентов"""
    try:
        logger.info("Запрос статистики для dashboard")
        
        # Сначала получаем статистику агентов (активные хосты)
        agent_stats = await get_agent_stats_data(opensearch)
        
        # Затем получаем статистику событий безопасности
        security_stats = await get_security_stats_data(opensearch)
        
        # Объединяем статистику
        combined_stats = {
            "total_events": agent_stats["total_events"] + security_stats["total_events"],
            "unique_hosts": agent_stats["unique_hosts"],  # Активные хосты из данных агентов
            "event_types": agent_stats["event_types"] + security_stats["threat_types"],
            "severity_levels": security_stats["severity_levels"],
            "events_per_hour": agent_stats["events_per_hour"] + security_stats["events_per_hour"]
        }
        
        logger.info(f"Статистика получена: {combined_stats['total_events']} событий от {combined_stats['unique_hosts']} хостов")
        return combined_stats
        
    except Exception as e:
        logger.error(f"Ошибка получения статистики: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка получения статистики: {str(e)}")

async def get_agent_stats_data(opensearch: AsyncOpenSearch):
    """Получение статистики агентов"""
    search_body = {
        "query": {
            "bool": {
                "filter": [
                    {"term": {"event_type": "system_info"}},
                    {"range": {"timestamp": {"gte": "now-24h"}}}
                ]
            }
        },
        "size": 0,
        "aggs": {
            "unique_hosts": {
                "cardinality": {"field": "host.hostname.keyword"}
            },
            "events_per_hour": {
                "date_histogram": {
                    "field": "timestamp",
                    "calendar_interval": "1h",
                    "min_doc_count": 0
                }
            }
        }
    }
    
    try:
        response = await opensearch.search(
            index="agent-events-*",
            body=search_body
        )
        
        total_events = response['hits']['total']['value']
        
        # Обработка случая когда нет данных (aggregations может отсутствовать)
        if 'aggregations' in response and total_events > 0:
            return {
                "total_events": total_events,
                "unique_hosts": response['aggregations']['unique_hosts']['value'],
                "event_types": [{"key": "system_info", "doc_count": total_events}],
                "events_per_hour": response['aggregations']['events_per_hour']['buckets']
            }
        else:
            # Нет данных - возвращаем пустую статистику
            return {
                "total_events": 0,
                "unique_hosts": 0,
                "event_types": [],
                "events_per_hour": []
            }
    except Exception as e:
        logger.warning(f"Ошибка при получении статистики агентов: {e}")
        return {
            "total_events": 0,
            "unique_hosts": 0,
            "event_types": [],
            "events_per_hour": []
        }

async def get_security_stats_data(opensearch: AsyncOpenSearch):
    """Получение статистики событий безопасности"""
    search_body = {
        "query": {"match_all": {}},
        "size": 0,
        "aggs": {
            "threat_types": {
                "terms": {"field": "threat_type.keyword", "size": 20}
            },
            "severity_levels": {
                "terms": {"field": "severity.keyword", "size": 10}
            },
            "events_per_hour": {
                "date_histogram": {
                    "field": "timestamp",
                    "calendar_interval": "1h",
                    "min_doc_count": 0
                }
            }
        }
    }
    
    try:
        response = await opensearch.search(
            index="security-events-*",
            body=search_body
        )
        
        total_events = response['hits']['total']['value']
        
        # Обработка случая когда нет данных (aggregations может отсутствовать)
        if 'aggregations' in response and total_events > 0:
            return {
                "total_events": total_events,
                "threat_types": response['aggregations']['threat_types']['buckets'],
                "severity_levels": response['aggregations']['severity_levels']['buckets'],
                "events_per_hour": response['aggregations']['events_per_hour']['buckets']
            }
        else:
            # Нет данных - возвращаем пустую статистику
            return {
                "total_events": 0,
                "threat_types": [],
                "severity_levels": [],
                "events_per_hour": []
            }
    except Exception as e:
        logger.warning(f"Ошибка при получении статистики безопасности: {e}")
        return {
            "total_events": 0,
            "threat_types": [],
            "severity_levels": [],
            "events_per_hour": []
        }
        # Если нет индекса security-events, возвращаем пустые данные
        return {
            "total_events": 0,
            "threat_types": [],
            "severity_levels": [],
            "events_per_hour": []
        }

@app.get("/admin/clear")
async def simple_clear():
    """Простая очистка данных"""
    try:
        if opensearch_client:
            # Удаляем индексы событий
            try:
                await opensearch_client.indices.delete(index="agent-events-*")
            except:
                pass
            try:
                await opensearch_client.indices.delete(index="security-events-*")
            except:
                pass
        
        return {"status": "cleared", "message": "Data cleared successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Точка входа для запуска
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=DEBUG,
        log_level="info"
    )
