"""
Расширения схем для поддержки данных Windows агента
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SecurityFindingSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class SecurityFinding(BaseModel):
    """Результат анализа безопасности"""
    rule_id: str = Field(..., description="ID правила безопасности")
    title: str = Field(..., description="Заголовок проблемы")
    description: str = Field(..., description="Описание проблемы")
    severity: SecurityFindingSeverity = Field(..., description="Уровень критичности")
    recommendation: str = Field(..., description="Рекомендация по устранению")
    evidence: Dict[str, Any] = Field(default_factory=dict, description="Доказательства")
    affected_items: List[str] = Field(default_factory=list, description="Затронутые элементы")

class ProcessInfo(BaseModel):
    """Информация о процессе"""
    pid: int = Field(..., description="ID процесса")
    name: str = Field(..., description="Имя процесса")
    exe: Optional[str] = Field(None, description="Путь к исполняемому файлу")
    cmdline: Optional[str] = Field(None, description="Командная строка")
    username: Optional[str] = Field(None, description="Пользователь")
    memory_info: Optional[Dict[str, int]] = Field(None, description="Информация о памяти")
    cpu_percent: Optional[float] = Field(None, description="Использование CPU")
    create_time: Optional[datetime] = Field(None, description="Время создания")
    is_suspicious_path: bool = Field(False, description="Подозрительный путь")
    signature_status: Optional[str] = Field(None, description="Статус цифровой подписи")
    file_hash: Optional[str] = Field(None, description="SHA256 хеш файла")

class AutorunEntry(BaseModel):
    """Запись автозапуска"""
    name: str = Field(..., description="Имя записи")
    command: str = Field(..., description="Команда запуска")
    location: str = Field(..., description="Расположение (реестр/папка)")
    file_exists: bool = Field(True, description="Существует ли файл")
    is_signed: bool = Field(False, description="Подписан ли файл")
    signature_valid: bool = Field(False, description="Валидна ли подпись")
    file_hash: Optional[str] = Field(None, description="SHA256 хеш файла")

class AutorunData(BaseModel):
    """Данные автозапусков"""
    registry: List[AutorunEntry] = Field(default_factory=list, description="Записи реестра")
    startup_folders: List[AutorunEntry] = Field(default_factory=list, description="Папки автозапуска")
    services: List[Dict[str, Any]] = Field(default_factory=list, description="Автоматические службы")
    scheduled_tasks: List[Dict[str, Any]] = Field(default_factory=list, description="Запланированные задачи")

class SecuritySettings(BaseModel):
    """Настройки безопасности Windows"""
    defender: Optional[Dict[str, Any]] = Field(None, description="Настройки Windows Defender")
    firewall: Optional[Dict[str, Any]] = Field(None, description="Настройки Windows Firewall")
    uac: Optional[Dict[str, Any]] = Field(None, description="Настройки UAC")
    rdp: Optional[Dict[str, Any]] = Field(None, description="Настройки RDP")
    bitlocker: Optional[Dict[str, Any]] = Field(None, description="Статус BitLocker")
    smb1: Optional[Dict[str, Any]] = Field(None, description="Статус SMB1")

class InventoryData(BaseModel):
    """Данные инвентаризации"""
    processes: List[ProcessInfo] = Field(default_factory=list, description="Список процессов")
    autoruns: AutorunData = Field(default_factory=AutorunData, description="Данные автозапусков")

class HostInfo(BaseModel):
    """Информация о хосте"""
    host_id: str = Field(..., description="Уникальный ID хоста")
    hostname: str = Field(..., description="Имя хоста")
    os_version: str = Field(..., description="Версия ОС")
    uptime_seconds: int = Field(..., description="Время работы в секундах")
    timezone: str = Field(..., description="Временная зона")

class AgentInfo(BaseModel):
    """Информация об агенте"""
    agent_id: str = Field(..., description="ID агента")
    agent_version: str = Field(..., description="Версия агента")
    hostname: str = Field(..., description="Имя хоста агента")

class HostPostureEvent(BaseModel):
    """Событие оценки состояния хоста"""
    event_type: str = Field("host_posture", description="Тип события")
    timestamp: datetime = Field(..., description="Время события")
    agent: AgentInfo = Field(..., description="Информация об агенте")
    host: HostInfo = Field(..., description="Информация о хосте")
    inventory: InventoryData = Field(..., description="Данные инвентаризации")
    security: SecuritySettings = Field(..., description="Настройки безопасности")
    findings: List[SecurityFinding] = Field(default_factory=list, description="Результаты анализа безопасности")

    class Config:
        schema_extra = {
            "example": {
                "event_type": "host_posture",
                "timestamp": "2024-01-01T12:00:00Z",
                "agent": {
                    "agent_id": "win-agent-001",
                    "agent_version": "0.1.0",
                    "hostname": "DESKTOP-ABC123"
                },
                "host": {
                    "host_id": "12345678-1234-1234-1234-123456789012",
                    "hostname": "DESKTOP-ABC123",
                    "os_version": "Windows 11 Pro",
                    "uptime_seconds": 3600,
                    "timezone": "UTC+03:00"
                },
                "inventory": {
                    "processes": [
                        {
                            "pid": 1234,
                            "name": "notepad.exe",
                            "exe": "C:\\Windows\\System32\\notepad.exe",
                            "username": "Administrator",
                            "is_suspicious_path": False,
                            "signature_status": "valid"
                        }
                    ],
                    "autoruns": {
                        "registry": [
                            {
                                "name": "Windows Security notification icon",
                                "command": "%windir%\\system32\\SecurityHealthSystray.exe",
                                "location": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
                                "file_exists": True,
                                "is_signed": True,
                                "signature_valid": True
                            }
                        ]
                    }
                },
                "security": {
                    "defender": {
                        "RealTimeProtectionEnabled": True,
                        "AntivirusEnabled": True
                    },
                    "firewall": {
                        "Domain": {"Enabled": True},
                        "Private": {"Enabled": True},
                        "Public": {"Enabled": True}
                    }
                },
                "findings": [
                    {
                        "rule_id": "UAC_DISABLED",
                        "title": "UAC отключен",
                        "description": "User Account Control (UAC) отключен, что снижает безопасность системы",
                        "severity": "high",
                        "recommendation": "Включите UAC в панели управления",
                        "evidence": {"EnableLUA": 0}
                    }
                ]
            }
        }

# Обновленная схема для существующих событий с поддержкой host_posture
class TelemetryEvent(BaseModel):
    """Базовое телеметрическое событие"""
    event_type: str = Field(..., description="Тип события")
    timestamp: datetime = Field(..., description="Время события")
    source: str = Field(..., description="Источник события")
    data: Dict[str, Any] = Field(..., description="Данные события")

    # Поддержка специализированных типов событий
    def parse_as_host_posture(self) -> Optional[HostPostureEvent]:
        """Парсинг как событие оценки состояния хоста"""
        if self.event_type == "host_posture":
            try:
                return HostPostureEvent(**self.data, 
                                       event_type=self.event_type, 
                                       timestamp=self.timestamp)
            except Exception:
                return None
        return None
