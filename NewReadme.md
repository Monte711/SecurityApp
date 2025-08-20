# 🛡️ Unified Enterprise Cybersecurity Platform

Модульная платформа кибербезопасности для сбора, анализа и мониторинга телеметрии с конечных точек.

## 🏗️ Архитектура

Платформа состоит из следующих компонентов:

### 🚀 Активные компоненты (готовы к использованию):
- **`ingest-api/`** - FastAPI сервис для приема телеметрии
- **`ui/`** - React веб-интерфейс с TypeScript
- **`INFRA/`** - Docker Compose инфраструктура

### 📦 Заготовки компонентов (для будущей разработки):
- **`agent-windows/`** - Windows endpoint agent
- **`edr-av-integration/`** - ClamAV + YARA интеграция
- **`vuln-scanner/`** - OpenVAS сканер уязвимостей
- **`tip-misp/`** - Threat Intelligence Platform
- **`soar-engine/`** - Security Orchestration and Response
- **`ml-module/`** - ML поведенческая аналитика

## 🚀 Быстрый старт

### Предварительные требования

- **Docker Desktop** ([скачать](https://www.docker.com/products/docker-desktop/))
- **PowerShell** (для Windows)
- **Git** (опционально)

### 1. Запуск инфраструктуры

```powershell
# Перейти в папку инфраструктуры
cd INFRA

# Запустить основные сервисы (OpenSearch, Redis, API, Dashboards)
.\up_clean.ps1

# Дождаться запуска всех сервисов (~ 1-2 минуты)
```

### 2. Запуск с веб-интерфейсом

```powershell
# Запустить все сервисы включая UI Dashboard
docker-compose --profile dev up -d

# Проверить статус всех контейнеров
docker-compose ps
```

### 3. Остановка сервисов

```powershell
# Остановить все сервисы
.\down_clean.ps1

# Остановить с полной очисткой (удаление данных)
.\down_clean.ps1 -CleanAll
```

## 🌐 Доступные интерфейсы

После запуска доступны следующие веб-интерфейсы:

| Сервис | URL | Описание |
|--------|-----|----------|
| **UI Dashboard** | http://localhost:3000 | Основной веб-интерфейс |
| **API Documentation** | http://localhost:8000/docs | Swagger UI для API |
| **Ingest API** | http://localhost:8000 | REST API для телеметрии |
| **OpenSearch Dashboards** | http://localhost:5601 | Администрирование данных |
| **OpenSearch API** | http://localhost:9200 | Прямой доступ к данным |

## 📡 Использование API

### Health Check
```bash
curl http://localhost:8000/health
```

### Отправка события
```powershell
$body = @{
    event_id = "example-001"
    event_type = "process_start"
    timestamp = "2025-08-20T12:00:00Z"
    severity = "info"
    host = @{
        host_id = "workstation-001"
        hostname = "WIN-PC01"
        domain = "company.local"
        os_version = "Windows 10"
        ip_addresses = @("192.168.1.100")
    }
    agent = @{
        agent_version = "1.0.0"
        collect_level = "standard"
    }
    process = @{
        pid = 1234
        name = "notepad.exe"
        path = "C:\Windows\System32\notepad.exe"
        user = "john.doe"
    }
    tags = @("demo", "test")
} | ConvertTo-Json -Depth 10

$headers = @{"Content-Type"="application/json"}
Invoke-WebRequest -Uri http://localhost:8000/ingest -Method POST -Body $body -Headers $headers
```

### Получение событий
```bash
curl http://localhost:8000/events
curl "http://localhost:8000/events?limit=10&event_type=process_start"
curl "http://localhost:8000/events?severity=high&host_id=workstation-001"
```

## 🔧 Разработка

### Структура проекта
```
├── ingest-api/          # FastAPI бэкенд
│   ├── main.py         # Основной модуль API
│   ├── requirements.txt # Python зависимости
│   └── Dockerfile      # Docker образ
├── ui/                 # React фронтенд
│   ├── src/           # Исходный код
│   ├── package.json   # Node.js зависимости
│   └── Dockerfile     # Docker образ
├── INFRA/             # Docker Compose
│   ├── docker-compose.yml
│   ├── up_clean.ps1   # Скрипт запуска
│   └── down_clean.ps1 # Скрипт остановки
└── shared/            # Общие утилиты
```

### Локальная разработка API
```powershell
cd ingest-api
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Локальная разработка UI
```powershell
cd ui
npm install
npm run dev
```

## 📊 Схема событий

События телеметрии должны соответствовать следующей схеме:

### Обязательные поля:
- `event_id` - уникальный идентификатор события
- `event_type` - тип события (process_start, file_create, network_connection и др.)
- `timestamp` - время события в ISO 8601
- `severity` - уровень критичности (info, low, medium, high, critical)
- `host` - информация о хосте
- `agent` - информация об агенте

### Опциональные поля:
- `process` - информация о процессе
- `file` - информация о файле
- `network` - сетевая информация
- `tags` - теги для классификации

Полную схему см. в API документации: http://localhost:8000/docs

## 🐛 Устранение неполадок

### Проблемы с запуском
1. **Docker не установлен**: Установите Docker Desktop
2. **Порты заняты**: Проверьте что порты 3000, 5601, 6379, 8000, 9200 свободны
3. **Недостаточно памяти**: Увеличьте лимиты памяти для Docker

### Проверка состояния
```powershell
# Статус контейнеров
docker-compose ps

# Логи сервисов
docker-compose logs ingest_api
docker-compose logs ui
docker-compose logs opensearch

# Health check
curl http://localhost:8000/health
```

### Очистка данных
```powershell
# Полная очистка (удаление всех данных)
.\down_clean.ps1 -CleanAll

# Удаление образов
docker image prune -f
```

## 📚 Дополнительная документация

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Техническая архитектура
- **[DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)** - Проектные решения
- **[SECURITY_REQUIREMENTS.md](SECURITY_REQUIREMENTS.md)** - Требования безопасности
- **[BACKLOG.md](BACKLOG.md)** - План развития
- **[ROADMAP.md](ROADMAP.md)** - Дорожная карта

## 📞 Поддержка

При возникновении вопросов или проблем:
1. Проверьте раздел "Устранение неполадок"
2. Изучите логи Docker контейнеров
3. Обратитесь к API документации
4. Создайте issue в репозитории

---

**Версия**: 1.0.0  
**Статус**: В разработке  
**Последнее обновление**: Август 2025
