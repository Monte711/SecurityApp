# Архитектура платформы

## Обзор системы

Unified Enterprise Cybersecurity Platform - это модульная платформа кибербезопасности, построенная по микросервисной архитектуре с использованием современных технологий и паттернов проектирования.

## Основные принципы

- **Модульность**: Каждый компонент независим и может разрабатываться/развертываться отдельно
- **Масштабируемость**: Горизонтальное масштабирование через Docker и Kubernetes
- **Безопасность**: TLS шифрование, аутентификация, авторизация на всех уровнях
- **Наблюдаемость**: Централизованное логирование, метрики, трассировка
- **Отказоустойчивость**: Graceful degradation, circuit breakers, retry patterns

## Компоненты системы

### 1. Ingest API (ingest-api/)
- **Технологии**: FastAPI, Pydantic, asyncio
- **Назначение**: Прием телеметрии от агентов
- **Функции**:
  - Валидация событий по JSON Schema
  - Идемпотентность через event_id
  - Rate limiting по хосту
  - Асинхронная обработка
- **Интеграции**: OpenSearch (индексация), Redis (очереди)

### 2. Windows Agent (agent-windows/)
- **Технологии**: Python, Windows API, asyncio
- **Назначение**: Сбор телеметрии с Windows хостов
- **Функции**:
  - Мониторинг процессов, файлов, сети, реестра
  - Настраиваемые уровни сбора (minimal/standard/detailed)
  - TLS коммуникация с ingest-api
  - Буферизация и batch отправка
- **Развертывание**: Windows Service или standalone

### 3. EDR/AV Integration (edr-av-integration/)
- **Технологии**: ClamAV, YARA, Python bindings
- **Назначение**: Антивирусная защита и обнаружение угроз
- **Функции**:
  - Сканирование файлов через ClamAV
  - YARA правила для поведенческого анализа
  - Интеграция с threat intelligence
  - Карантин подозрительных файлов

### 4. Vulnerability Scanner (vuln-scanner/)
- **Технологии**: OpenVAS, GMP Protocol, Python
- **Назначение**: Сканирование уязвимостей
- **Функции**:
  - Автоматические сканы по расписанию
  - Интеграция с CVE базами
  - Приоритизация уязвимостей
  - Отчеты и рекомендации

### 5. Threat Intelligence Platform (tip-misp/)
- **Технологии**: MISP, PyMISP, REST API
- **Назначение**: Управление индикаторами компрометации
- **Функции**:
  - Импорт/экспорт IOC
  - Корреляция с событиями
  - Threat feeds интеграция
  - Sharing communities

### 6. SOAR Engine (soar-engine/)
- **Технологии**: Celery, Redis, Python
- **Назначение**: Автоматизация реагирования на инциденты
- **Функции**:
  - Playbooks для автоматизации
  - Workflow engine
  - Интеграция с внешними системами
  - Эскалация инцидентов

### 7. Web Dashboard (ui-dashboard/)
- **Технологии**: React, TypeScript, Vite, Tailwind CSS
- **Назначение**: Веб-интерфейс для аналитиков
- **Функции**:
  - Дашборды и визуализация
  - Управление инцидентами
  - Настройка правил и политик
  - Отчеты и аналитика

### 8. ML Module (ml-module/)
- **Технологии**: scikit-learn, pandas, numpy
- **Назначение**: Машинное обучение для поведенческой аналитики
- **Функции**:
  - Обнаружение аномалий
  - Кластеризация событий
  - Предиктивная аналитика
  - Feature engineering

## Архитектура данных

### Схемы данных
- **AgentTelemetryEvent**: Унифицированная схема событий от агентов
- **IncidentSchema**: Структура инцидентов безопасности  
- **ThreatIntelligence**: IOC и threat feeds
- **VulnerabilityReport**: Результаты сканирования уязвимостей

### Хранилища данных

#### OpenSearch Cluster
```yaml
Индексы:
- agent-events-{YYYY.MM.DD}: Телеметрия агентов (retention: 90 days)
- incidents-{YYYY.MM}: Инциденты (retention: 2 years)
- threat-intel: IOC и артефакты (retention: 1 year)
- vulnerabilities: Результаты сканов (retention: 6 months)
- audit-logs: Аудит действий (retention: 7 years)
```

#### Redis Streams
```yaml
Очереди:
- events:ingestion: Буфер входящих событий
- alerts:processing: Обработка алертов
- soar:workflows: SOAR задачи
- ml:analysis: ML обработка
```

## Сетевая архитектура

### Внутренние коммуникации
```yaml
Services:
- ingest-api:8000 ← agents (TLS)
- ui-dashboard:3000 ← users (HTTPS)
- opensearch:9200 ← services (TLS)
- redis:6379 ← services (TLS)
- misp:443 ← tip integration (HTTPS)
```

### Безопасность
- **Agent Authentication**: Взаимная TLS аутентификация
- **API Security**: JWT токены, rate limiting
- **Network Segmentation**: Docker networks, firewall rules
- **Encryption**: TLS 1.3 для всех соединений

## Процессы обработки данных

### 1. Ingestion Pipeline
```
Agent → TLS → Ingest API → Validation → Redis → Processors
                ↓
            OpenSearch ← Enrichment ← Correlation ← ML Analysis
```

### 2. Alert Processing
```
Rules Engine → Alert Generation → SOAR Workflows → Actions
     ↓              ↓                    ↓
Correlation → Prioritization → Escalation → Notification
```

### 3. Incident Management
```
Alert → Incident Creation → Investigation → Response → Closure
   ↓           ↓                ↓            ↓         ↓
Context → Case Management → Playbooks → Actions → Lessons
```

## Масштабирование и производительность

### Горизонтальное масштабирование
- **Ingest API**: Множественные инстансы за load balancer
- **Workers**: Celery workers для фоновой обработки
- **OpenSearch**: Кластер с репликацией и шардированием
- **Redis**: Cluster mode для высокой доступности

### Производительность
- **Пропускная способность**: 10,000+ событий/сек на инстанс
- **Latency**: <100ms для критических алертов
- **Storage**: Сжатие и архивирование старых данных
- **Caching**: Redis для горячих данных

## Мониторинг и наблюдаемость

### Метрики
```yaml
Application:
- events_ingested_total
- alerts_generated_total
- response_time_seconds
- error_rate_percentage

Infrastructure:
- cpu_usage_percent
- memory_usage_bytes
- disk_usage_percent
- network_io_bytes
```

### Логирование
```yaml
Levels:
- ERROR: Критические ошибки
- WARN: Предупреждения и аномалии
- INFO: Бизнес события
- DEBUG: Техническая диагностика

Format: JSON structured logging
Retention: 30 days для debug, 1 year для business
```

### Трассировка
- **Distributed Tracing**: OpenTelemetry интеграция
- **Request ID**: Сквозная трассировка запросов
- **Span Correlation**: Связь между микросервисами

## Развертывание

### Docker Compose (Development)
```yaml
Services:
- ingest-api + workers
- opensearch + kibana
- redis
- ui-dashboard
- mock-agent (для тестирования)
```

### Kubernetes (Production)
```yaml
Deployments:
- ingest-api (3 replicas)
- workers (5 replicas)
- ui-dashboard (2 replicas)

StatefulSets:
- opensearch-cluster (3 nodes)
- redis-cluster (3 nodes)

Services:
- LoadBalancer для внешнего доступа
- ClusterIP для внутренних коммуникаций
```

## Безопасность архитектуры

### Аутентификация и авторизация
- **Agent Auth**: X.509 сертификаты
- **User Auth**: OIDC/SAML интеграция
- **Service Auth**: Service mesh с mTLS
- **API Auth**: JWT с refresh tokens

### Сетевая безопасность
- **Network Policies**: Kubernetes network policies
- **Firewall Rules**: Ограничение портов и протоколов  
- **VPN Access**: Secure remote access
- **DMZ**: Разделение внешних и внутренних сервисов

### Защита данных
- **Encryption at Rest**: AES-256 для OpenSearch
- **Encryption in Transit**: TLS 1.3 everywhere
- **Data Classification**: PII detection и masking
- **Backup Encryption**: Encrypted backups

### Compliance
- **GDPR**: Право на забвение, согласие
- **SOX**: Audit trails, data integrity
- **ISO 27001**: Security controls framework
- **NIST**: Cybersecurity framework alignment

## Планы развития

### Ближайшие улучшения
- **Machine Learning**: Улучшение моделей обнаружения
- **API v2**: GraphQL интерфейс
- **Mobile App**: Мобильное приложение для SOC
- **Cloud Integration**: AWS/Azure/GCP коннекторы

### Долгосрочные цели
- **AI Integration**: Large Language Models для анализа
- **Federated Learning**: Распределенное обучение моделей
- **Quantum Cryptography**: Подготовка к квантовым угрозам
- **Zero Trust**: Полная реализация zero trust архитектуры
