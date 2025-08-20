# Операционное руководство

## Быстрый старт

### Требования к системе
- Docker 20.10+ и Docker Compose 2.0+
- Python 3.11+
- Node.js 18+ (для UI разработки)
- Минимум 8GB RAM, 50GB диска
- Ubuntu 20.04+ или Windows 10+ или macOS 12+

### Развертывание для разработки

#### 1. Клонирование и настройка
```bash
git clone <repository>
cd unified-cybersecurity-platform

# Создание .env файлов из примеров
cp .env.example .env
cp ingest-api/.env.example ingest-api/.env
cp ui-dashboard/.env.example ui-dashboard/.env
```

#### 2. Запуск инфраструктуры
```bash
# Запуск OpenSearch + Redis + основных сервисов
docker-compose -f docker/docker-compose.dev.yml up -d

# Проверка статуса
docker-compose -f docker/docker-compose.dev.yml ps
```

#### 3. Запуск Ingest API
```bash
cd ingest-api
python -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 4. Запуск UI Dashboard
```bash
cd ui-dashboard
npm install
npm run dev
```

#### 5. Проверка работоспособности
```bash
# API Health Check
curl http://localhost:8000/health

# UI доступен на http://localhost:3000
# OpenSearch dashboard на http://localhost:5601
```

### Тестирование интеграции

#### Отправка тестового события
```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: test-agent-001" \
  -d @tests/fixtures/sample_event.json
```

#### Проверка в OpenSearch
```bash
curl "http://localhost:9200/agent-events-*/_search?pretty" \
  -H "Content-Type: application/json" \
  -d '{"query": {"match_all": {}}, "size": 1}'
```

## Конфигурация

### Переменные окружения

#### Общие настройки (.env)
```bash
# Режим развертывания
ENVIRONMENT=development  # development|staging|production
DEBUG=true
LOG_LEVEL=INFO

# Безопасность
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1

# Интеграции
OPENSEARCH_URL=http://localhost:9200
REDIS_URL=redis://localhost:6379
```

#### Ingest API (ingest-api/.env)
```bash
# API настройки
API_HOST=0.0.0.0
API_PORT=8000
WORKERS=4

# Rate limiting
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600

# Безопасность агентов
AGENT_AUTH_REQUIRED=true
AGENT_CERT_PATH=/etc/ssl/certs/agents/
```

#### UI Dashboard (ui-dashboard/.env)
```bash
# Vite настройки
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_DATA=false
VITE_DEBUG_MODE=true

# Аутентификация
VITE_AUTH_PROVIDER=local  # local|oauth|saml
VITE_SESSION_TIMEOUT=3600
```

### Файлы конфигурации

#### docker-compose.dev.yml
```yaml
version: '3.8'
services:
  opensearch:
    image: opensearchproject/opensearch:2.11.0
    environment:
      - cluster.name=cybersec-cluster
      - node.name=cybersec-node1
      - discovery.seed_hosts=cybersec-node1
      - cluster.initial_cluster_manager_nodes=cybersec-node1
      - bootstrap.memory_lock=true
      - "OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m"
      - "DISABLE_INSTALL_DEMO_CONFIG=true"
      - "DISABLE_SECURITY_PLUGIN=true"
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - opensearch-data:/usr/share/opensearch/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

volumes:
  opensearch-data:
  redis-data:
```

## Мониторинг и диагностика

### Логи приложений

#### Структура логирования
```python
# Формат JSON логов
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "ingest-api",
  "request_id": "req-12345",
  "message": "Event processed successfully",
  "event_id": "evt-67890",
  "host_id": "host-001",
  "processing_time_ms": 45
}
```

#### Просмотр логов
```bash
# Ingest API логи
docker-compose logs -f ingest-api

# UI развертывание логи
docker-compose logs -f ui-dashboard

# Инфраструктурные логи
docker-compose logs -f opensearch redis
```

### Метрики производительности

#### API метрики
```bash
# Статистика запросов
curl http://localhost:8000/metrics

# Пример ответа:
# ingest_requests_total{method="POST",status="200"} 1500
# ingest_request_duration_seconds{quantile="0.95"} 0.12
# opensearch_writes_total 1450
# redis_publishes_total 1500
```

#### Системные метрики
```bash
# Использование ресурсов контейнерами
docker stats

# Состояние OpenSearch кластера
curl http://localhost:9200/_cluster/health?pretty

# Redis информация
docker exec -it $(docker ps -q -f name=redis) redis-cli INFO
```

### Healthcheck endpoints

#### Ingest API
```bash
# Базовый health check
GET /health
# Ответ: {"status": "healthy", "timestamp": "2024-01-15T10:30:00Z"}

# Детальный статус
GET /health/detailed
# Ответ: {
#   "status": "healthy",
#   "services": {
#     "opensearch": {"status": "healthy", "response_time_ms": 5},
#     "redis": {"status": "healthy", "response_time_ms": 2}
#   }
# }
```

#### Инфраструктура
```bash
# OpenSearch
curl http://localhost:9200/_cluster/health

# Redis
docker exec redis redis-cli ping
```

## Эксплуатация

### Бэкапы данных

#### OpenSearch бэкап
```bash
# Создание snapshot repository
curl -X PUT "localhost:9200/_snapshot/backup_repository" \
  -H "Content-Type: application/json" \
  -d '{"type": "fs", "settings": {"location": "/backup/opensearch"}}'

# Создание snapshot
curl -X PUT "localhost:9200/_snapshot/backup_repository/snapshot_$(date +%Y%m%d)" \
  -H "Content-Type: application/json" \
  -d '{"indices": "agent-events-*,incidents-*"}'
```

#### Redis бэкап
```bash
# Создание RDB snapshot
docker exec redis redis-cli BGSAVE

# Копирование файла
docker cp redis:/data/dump.rdb ./backup/redis_$(date +%Y%m%d).rdb
```

### Ротация логов

#### Логи приложений
```bash
# Настройка logrotate
cat > /etc/logrotate.d/cybersec-platform << EOF
/var/log/cybersec/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        docker-compose -f /opt/cybersec/docker-compose.yml restart ingest-api
    endscript
}
EOF
```

#### OpenSearch индексы
```bash
# Политика управления жизненным циклом индексов
curl -X PUT "localhost:9200/_ilm/policy/agent-events-policy" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": {
      "phases": {
        "hot": {"actions": {}},
        "warm": {"min_age": "7d", "actions": {"allocate": {"number_of_replicas": 0}}},
        "delete": {"min_age": "90d"}
      }
    }
  }'
```

### Масштабирование

#### Горизонтальное масштабирование Ingest API
```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  ingest-api:
    image: cybersec/ingest-api:latest
    deploy:
      replicas: 3
    depends_on:
      - redis
      - opensearch
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - ingest-api
```

#### nginx load balancer конфигурация
```nginx
upstream ingest_api {
    server ingest-api:8000;
    # Дополнительные инстансы добавляются автоматически
}

server {
    listen 80;
    location /ingest {
        proxy_pass http://ingest_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Обновления

#### Обновление Ingest API
```bash
# Скачивание новой версии
docker pull cybersec/ingest-api:v2.1.0

# Graceful restart
docker-compose -f docker-compose.prod.yml up -d --no-deps ingest-api

# Проверка статуса
curl http://localhost:8000/health
```

#### Миграции данных
```bash
# Запуск миграций OpenSearch
cd scripts/migrations
python migrate_schemas.py --version 2.1.0

# Проверка целостности данных
python verify_migration.py --version 2.1.0
```

## Безопасность

### Конфигурация TLS

#### Генерация сертификатов для агентов
```bash
# Создание CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 365 -key ca.key -out ca.crt

# Сертификат для агента
openssl genrsa -out agent.key 2048
openssl req -new -key agent.key -out agent.csr
openssl x509 -req -in agent.csr -CA ca.crt -CAkey ca.key -out agent.crt -days 365
```

#### Конфигурация nginx с TLS
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    
    location /ingest {
        proxy_pass http://ingest_api;
        proxy_ssl_verify on;
        proxy_ssl_trusted_certificate /etc/ssl/certs/ca.crt;
    }
}
```

### Мониторинг безопасности

#### Аудит доступа
```bash
# Логи аутентификации агентов
grep "agent_auth" /var/log/cybersec/ingest-api.log | tail -20

# Неуспешные попытки входа
grep "auth_failed" /var/log/cybersec/ingest-api.log | tail -10

# Подозрительная активность
grep "rate_limit_exceeded" /var/log/cybersec/ingest-api.log
```

#### Сканирование уязвимостей
```bash
# Сканирование Docker образов
docker scan cybersec/ingest-api:latest

# Проверка зависимостей Python
cd ingest-api
pip-audit

# Проверка зависимостей Node.js
cd ui-dashboard
npm audit
```

## Устранение неполадок

### Частые проблемы

#### 1. Ingest API не принимает события
```bash
# Проверка статуса API
curl -v http://localhost:8000/health

# Проверка логов
docker-compose logs ingest-api | tail -50

# Проверка соединения с OpenSearch
curl http://localhost:9200/_cluster/health
```

#### 2. OpenSearch недоступен
```bash
# Проверка статуса контейнера
docker ps | grep opensearch

# Проверка логов
docker logs opensearch-container

# Проверка дискового пространства
df -h
```

#### 3. UI не загружается
```bash
# Проверка статуса npm dev server
curl http://localhost:3000

# Проверка логов браузера (F12 Console)
# Проверка переменных окружения
cat ui-dashboard/.env
```

### Диагностические команды

#### Сетевая диагностика
```bash
# Проверка портов
netstat -tlnp | grep -E ":(8000|9200|6379|3000)"

# Проверка DNS разрешения
nslookup opensearch
nslookup redis

# Тест соединения между контейнерами
docker exec ingest-api curl http://opensearch:9200/_cluster/health
```

#### Производительность
```bash
# Мониторинг CPU/Memory
htop

# I/O статистика
iostat -x 1

# Сетевая активность
iftop

# Статистика Docker
docker stats --no-stream
```

### Контакты поддержки

- **Техническая поддержка**: support@cybersec-platform.local
- **Экстренные инциденты**: +7-xxx-xxx-xxxx (24/7)
- **Документация**: https://docs.cybersec-platform.local
- **Issue tracker**: https://github.com/org/cybersec-platform/issues
