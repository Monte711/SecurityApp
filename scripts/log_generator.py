#!/usr/bin/env python3
"""
Генератор тестовых событий безопасности
Отправляет события в ingest API для тестирования полного пайплайна
"""

import asyncio
import json
import random
import time
from datetime import datetime, timezone
from typing import List, Dict, Any
import aiohttp
import argparse
from pathlib import Path

# Конфигурация
API_URL = "http://localhost:8000/ingest/security"
DEFAULT_RATE = 5  # событий в секунду
DEFAULT_DURATION = 60  # секунд

# Шаблоны данных для генерации событий
THREAT_SOURCES = [
    "zero-day.cz",
    "cve.mitre.org", 
    "security-scanner",
    "antivirus-engine",
    "network-monitor",
    "file-analyzer",
    "malware-detector",
    "vulnerability-scanner"
]

THREAT_TYPES = [
    "exploit",
    "malware", 
    "phishing",
    "vulnerability",
    "intrusion",
    "ransomware",
    "trojan",
    "backdoor",
    "rootkit",
    "botnet"
]

SEVERITY_LEVELS = [
    {"level": "critical", "weight": 5},
    {"level": "high", "weight": 15}, 
    {"level": "medium", "weight": 40},
    {"level": "low", "weight": 30},
    {"level": "info", "weight": 10}
]

# Шаблоны описаний на русском языке
THREAT_DESCRIPTIONS = {
    "exploit": [
        "Обнаружена новая уязвимость CVE-2025-{:04d}",
        "Попытка эксплуатации уязвимости в {service}",
        "Обнаружен эксплойт нулевого дня против {service}",
        "Зафиксирована атака через уязвимость переполнения буфера"
    ],
    "malware": [
        "Обнаружено вредоносное ПО: {malware_name}",
        "Детектирован троянский конь в файле {file_name}",
        "Найден вирус семейства {family_name}",
        "Подозрительная активность процесса {process_name}"
    ],
    "phishing": [
        "Обнаружена фишинговая атака с домена {domain}",
        "Подозрительное письмо от отправителя {sender}",
        "Попытка кражи учетных данных через поддельный сайт",
        "Зафиксирована социальная инженерия"
    ],
    "vulnerability": [
        "Найдена критическая уязвимость в системе {system}",
        "Обнаружена неисправленная уязвимость CVE-2025-{:04d}",
        "Выявлен слабый пароль для пользователя {username}",
        "Обнаружена незащищенная конфигурация сервиса {service}"
    ],
    "intrusion": [
        "Попытка несанкционированного доступа с IP {ip_address}",
        "Обнаружено подозрительное подключение к порту {port}",
        "Зафиксирована попытка брутфорса пароля",
        "Аномальная активность пользователя {username}"
    ]
}

class ThreatEventGenerator:
    """Генератор событий безопасности"""
    
    def __init__(self, api_url: str = API_URL):
        self.api_url = api_url
        self.session = None
        self.event_counter = 0
        
    async def __aenter__(self):
        """Инициализация HTTP сессии"""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Закрытие HTTP сессии"""
        if self.session:
            await self.session.close()
    
    def generate_event(self) -> Dict[str, Any]:
        """Генерация одного случайного события"""
        self.event_counter += 1
        
        # Выбор случайных параметров
        source = random.choice(THREAT_SOURCES)
        threat_type = random.choice(THREAT_TYPES)
        
        # Выбор уровня критичности с весами
        severity = random.choices(
            [s["level"] for s in SEVERITY_LEVELS],
            weights=[s["weight"] for s in SEVERITY_LEVELS]
        )[0]
        
        # Генерация описания
        description_templates = THREAT_DESCRIPTIONS.get(threat_type, ["Обнаружена угроза типа {threat_type}"])
        description_template = random.choice(description_templates)
        
        # Подстановка переменных в описание
        description = description_template.format(
            service=random.choice(["Apache", "nginx", "IIS", "MySQL", "PostgreSQL", "Redis"]),
            malware_name=f"Trojan.Win32.{random.choice(['Backdoor', 'Keylogger', 'Spyware'])}.{random.randint(1000, 9999)}",
            file_name=f"suspicious_{random.randint(100, 999)}.exe",
            family_name=random.choice(["Zeus", "Emotet", "TrickBot", "Ryuk", "Maze"]),
            process_name=f"malicious_{random.randint(100, 999)}.exe",
            domain=f"phishing-{random.randint(100, 999)}.com",
            sender=f"fake-{random.randint(100, 999)}@suspicious.com",
            system=random.choice(["Windows Server", "Linux", "Docker", "Kubernetes"]),
            username=f"user{random.randint(1, 100)}",
            ip_address=f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            port=random.choice([22, 80, 443, 3389, 445, 135]),
            threat_type=threat_type
        )
        
        # Создание события
        event = {
            "event_id": f"gen-{self.event_counter:06d}-{int(time.time())}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "source": source,
            "threat_type": threat_type,
            "description": description,
            "severity": severity,
            "metadata": {
                "generated": True,
                "generator_version": "1.0.0",
                "event_number": self.event_counter
            }
        }
        
        # Добавление дополнительных полей в зависимости от типа угрозы
        if threat_type in ["exploit", "vulnerability"]:
            event["cve_id"] = f"CVE-2025-{random.randint(1000, 9999)}"
            event["cvss_score"] = round(random.uniform(1.0, 10.0), 1)
            
        elif threat_type == "malware":
            event["malware_family"] = random.choice(["Zeus", "Emotet", "TrickBot", "Ryuk"])
            event["file_hash"] = f"sha256:{random.randint(10**63, 10**64-1):064x}"
            
        elif threat_type == "intrusion":
            event["source_ip"] = f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
            event["target_port"] = random.choice([22, 80, 443, 3389, 445])
            
        return event
    
    async def send_event(self, event: Dict[str, Any]) -> bool:
        """Отправка события в API"""
        try:
            async with self.session.post(
                self.api_url,
                json=event,
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                if response.status == 200:
                    response_data = await response.json()
                    print(f"✅ Событие {event['event_id']} отправлено: {response_data.get('status', 'unknown')}")
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Ошибка отправки события {event['event_id']}: {response.status} - {error_text}")
                    return False
                    
        except asyncio.TimeoutError:
            print(f"⏰ Таймаут при отправке события {event['event_id']}")
            return False
        except Exception as e:
            print(f"💥 Исключение при отправке события {event['event_id']}: {e}")
            return False
    
    async def generate_stream(self, rate: float, duration: int, burst_mode: bool = False):
        """
        Генерация потока событий
        
        Args:
            rate: события в секунду
            duration: продолжительность в секундах  
            burst_mode: режим пакетной отправки
        """
        print(f"🚀 Запуск генератора событий:")
        print(f"   📊 Частота: {rate} событий/сек")
        print(f"   ⏱️  Длительность: {duration} сек")
        print(f"   📦 Режим: {'пакетный' if burst_mode else 'потоковый'}")
        print(f"   🎯 Цель: {self.api_url}")
        print()
        
        start_time = time.time()
        successful_events = 0
        failed_events = 0
        
        if burst_mode:
            # Пакетный режим - отправляем группами
            events_per_batch = max(1, int(rate))
            batch_interval = 1.0 / rate * events_per_batch
            
            while time.time() - start_time < duration:
                batch_start = time.time()
                
                # Отправляем пакет событий
                tasks = []
                for _ in range(events_per_batch):
                    event = self.generate_event()
                    task = asyncio.create_task(self.send_event(event))
                    tasks.append(task)
                
                # Ждем завершения пакета
                results = await asyncio.gather(*tasks, return_exceptions=True)
                successful_events += sum(1 for r in results if r is True)
                failed_events += sum(1 for r in results if r is not True)
                
                # Пауза до следующего пакета
                elapsed = time.time() - batch_start
                sleep_time = max(0, batch_interval - elapsed)
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    
        else:
            # Потоковый режим - равномерная отправка
            interval = 1.0 / rate
            
            while time.time() - start_time < duration:
                event_start = time.time()
                
                # Генерируем и отправляем событие
                event = self.generate_event()
                success = await self.send_event(event)
                
                if success:
                    successful_events += 1
                else:
                    failed_events += 1
                
                # Пауза до следующего события
                elapsed = time.time() - event_start
                sleep_time = max(0, interval - elapsed)
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
        
        # Статистика
        total_time = time.time() - start_time
        total_events = successful_events + failed_events
        actual_rate = total_events / total_time if total_time > 0 else 0
        
        print()
        print("📈 Статистика генерации:")
        print(f"   ✅ Успешно отправлено: {successful_events}")
        print(f"   ❌ Ошибок: {failed_events}")
        print(f"   📊 Всего событий: {total_events}")
        print(f"   ⚡ Фактическая частота: {actual_rate:.2f} событий/сек")
        print(f"   ⏱️  Общее время: {total_time:.2f} сек")


def load_events_from_file(file_path: str) -> List[Dict[str, Any]]:
    """Загрузка событий из JSON файла"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Поддержка разных форматов файлов
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and 'events' in data:
            return data['events']
        else:
            return [data]
            
    except Exception as e:
        print(f"❌ Ошибка загрузки файла {file_path}: {e}")
        return []


async def send_events_from_file(file_path: str, api_url: str = API_URL):
    """Отправка событий из файла"""
    events = load_events_from_file(file_path)
    if not events:
        return
        
    print(f"📁 Загружено {len(events)} событий из файла {file_path}")
    
    async with ThreatEventGenerator(api_url) as generator:
        successful = 0
        failed = 0
        
        for i, event in enumerate(events, 1):
            # Обновляем timestamp если нужно
            if 'timestamp' not in event:
                event['timestamp'] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                
            # Добавляем event_id если нужно
            if 'event_id' not in event:
                event['event_id'] = f"file-{i:06d}-{int(time.time())}"
            
            success = await generator.send_event(event)
            if success:
                successful += 1
            else:
                failed += 1
                
            # Небольшая пауза между событиями
            await asyncio.sleep(0.1)
    
    print(f"📈 Результат: {successful} успешно, {failed} ошибок")


async def main():
    """Основная функция"""
    parser = argparse.ArgumentParser(
        description="Генератор тестовых событий безопасности",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Примеры использования:

  # Генерация 10 событий в секунду в течение 30 секунд
  python log_generator.py --rate 10 --duration 30

  # Пакетная отправка со скоростью 50 событий/сек
  python log_generator.py --rate 50 --duration 60 --burst

  # Отправка событий из файла
  python log_generator.py --file events.json

  # Генерация одного тестового события
  python log_generator.py --single

  # Нагрузочное тестирование
  python log_generator.py --rate 100 --duration 120 --burst
        """
    )
    
    # Группы аргументов
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument("--rate", type=float, help="События в секунду (по умолчанию: %(default)s)")
    mode_group.add_argument("--file", type=str, help="Путь к JSON файлу с событиями")
    mode_group.add_argument("--single", action="store_true", help="Отправить одно тестовое событие")
    
    parser.add_argument("--duration", type=int, default=DEFAULT_DURATION,
                       help="Длительность генерации в секундах (по умолчанию: %(default)s)")
    parser.add_argument("--burst", action="store_true",
                       help="Пакетный режим отправки")
    parser.add_argument("--api-url", default=API_URL,
                       help="URL API для отправки событий (по умолчанию: %(default)s)")
    
    args = parser.parse_args()
    
    try:
        if args.single:
            # Отправка одного события
            async with ThreatEventGenerator(args.api_url) as generator:
                event = generator.generate_event()
                print("📝 Сгенерированное событие:")
                print(json.dumps(event, ensure_ascii=False, indent=2))
                print()
                
                success = await generator.send_event(event)
                if success:
                    print("✅ Событие успешно отправлено")
                else:
                    print("❌ Ошибка отправки события")
                    
        elif args.file:
            # Отправка из файла
            await send_events_from_file(args.file, args.api_url)
            
        elif args.rate:
            # Генерация потока
            if args.rate <= 0:
                print("❌ Частота должна быть положительным числом")
                return
                
            async with ThreatEventGenerator(args.api_url) as generator:
                await generator.generate_stream(args.rate, args.duration, args.burst)
                
    except KeyboardInterrupt:
        print("\n⏹️  Генерация остановлена пользователем")
    except Exception as e:
        print(f"💥 Неожиданная ошибка: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
