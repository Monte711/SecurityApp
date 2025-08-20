# 🚀 Локальная PoC-инфраструктура Unified Enterprise Cybersecurity Platform

Этот каталог содержит Docker-инфраструктуру для локального развертывания полнофункциональной платформы кибербезопасности.

## 📋 Архитектура

Платформа состоит из следующих сервисов:

- **OpenSearch** (9200, 9300) - Основное хранилище данных и поиск
- **OpenSearch Dashboards** (5601) - Веб-интерфейс для визуализации данных
- **Redis** (6379) - Кеш и очередь сообщений
- **Ingest API** (8000) - REST API для приема телеметрии
- **Web UI** (3000) - Фронтенд-интерфейс (опционально)

## 🚀 Быстрый старт

### 1. Предварительные требования

- Docker 20.10+
- Docker Compose 2.0+
- Минимум 4GB RAM (рекомендуется 8GB)
- 10GB свободного места на диске

### 2. Запуск платформы

```bash
# Переход в директорию infra
cd infra

# Запуск всех сервисов
./up.sh
```

Скрипт автоматически:
- Соберет Docker образы
- Запустит все сервисы
- Проверит их готовность
- Выведет доступные эндпоинты

### 3. Проверка работоспособности

После запуска выполните базовые проверки:

```bash
# Проверка OpenSearch
curl http://localhost:9200/_cluster/health

# Проверка API
curl http://localhost:8000/health

# Проверка статистики API
curl http://localhost:8000/api/stats
```

### 4. Доступ к интерфейсам

- **OpenSearch Dashboards**: http://localhost:5601
- **API Documentation**: http://localhost:8000/docs  
- **Web UI**: http://localhost:3000 (если включен)

## 🔧 Управление сервисами

### Остановка платформы

```bash
./down.sh
```

Опции:
- Удаление неиспользуемых образов
- Полная очистка данных (volumes)

### Просмотр логов

```bash
# Логи всех сервисов
./logs.sh

# Логи конкретного сервиса
./logs.sh opensearch
./logs.sh ingest_api

# Мониторинг в реальном времени
./logs.sh -f
./logs.sh ingest_api -f
```

### Включение UI для разработки

По умолчанию UI отключен для экономии ресурсов. Для включения:

```bash
# Запуск с UI
docker-compose --profile dev up --build -d

# Или изменить в docker-compose.yml:
# Убрать блок profiles: [dev] из секции ui
```

## 🧪 Тестирование API

### Отправка тестового события

```bash
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent-001",
    "event_type": "system_monitor",
    "severity": "info",
    "source": "test",
    "data": {
      "cpu_usage": 45.2,
      "memory_usage": 68.1
    },
    "host_info": {
      "hostname": "test-host",
      "os": "Linux"
    },
    "tags": ["test", "demo"]
  }'
```

### Получение статистики

```bash
curl http://localhost:8000/api/stats
```

### Просмотр событий

```bash
curl http://localhost:8000/api/events
```

## 🔍 Проверка данных в OpenSearch

### Просмотр индексов

```bash
curl http://localhost:9200/_cat/indices?v
```

### Поиск в индексе событий

```bash
curl -X GET "http://localhost:9200/cybersec-events/_search?pretty" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "match_all": {}
    },
    "size": 10
  }'
```

### Проверка здоровья кластера

```bash
curl http://localhost:9200/_cluster/health?pretty
```

## 🔴 Проверка Redis

### Подключение к Redis CLI

```bash
docker exec -it cybersec_redis redis-cli
```

### Проверка ключей и стримов

```bash
# В Redis CLI:
KEYS *
XINFO STREAM cybersec-events
XLEN cybersec-events
```

## ⚙️ Конфигурация

### Переменные окружения

Основные переменные можно настроить в `docker-compose.yml`:

#### OpenSearch
- `OPENSEARCH_JAVA_OPTS`: Настройки JVM (по умолчанию `-Xms512m -Xmx512m`)
- `DISABLE_SECURITY_PLUGIN`: Отключение безопасности для PoC

#### Ingest API
- `OPENSEARCH_URL`: URL OpenSearch (по умолчанию `http://opensearch:9200`)
- `REDIS_URL`: URL Redis (по умолчанию `redis://redis:6379`)
- `LOG_LEVEL`: Уровень логирования (INFO, DEBUG, WARNING, ERROR)

#### UI
- `VITE_API_BASE_URL`: URL API для фронтенда
- `VITE_USE_MOCK_DATA`: Использование mock данных (true/false)

### Настройка памяти

Для слабых машин уменьшите выделение памяти:

```yaml
# В docker-compose.yml для opensearch:
environment:
  - "OPENSEARCH_JAVA_OPTS=-Xms256m -Xmx256m"
```

## 🐛 Устранение неполадок

### OpenSearch не запускается

**Проблема**: Ошибка `bootstrap check failed`
```bash
# Решение 1: Увеличить vm.max_map_count (Linux/WSL)
sudo sysctl -w vm.max_map_count=262144

# Решение 2: Уменьшить память
# Изменить OPENSEARCH_JAVA_OPTS на -Xms256m -Xmx256m
```

**Проблема**: Нехватка памяти
```bash
# Решение: Проверить доступную память
docker stats

# Освободить память
docker system prune -f
```

### API не подключается к OpenSearch

```bash
# Проверка сетевого взаимодействия
docker network ls
docker exec cybersec_ingest_api ping opensearch

# Проверка логов
./logs.sh ingest_api
```

### Redis недоступен

```bash
# Проверка статуса Redis
docker exec cybersec_redis redis-cli ping

# Перезапуск Redis
docker-compose restart redis
```

### UI не загружается

```bash
# Проверка Nginx логов
./logs.sh ui

# Проверка сборки
docker-compose build ui --no-cache
```

### Медленная работа

```bash
# Оптимизация для слабых машин:
# 1. Отключить UI (убрать --profile dev)
# 2. Уменьшить память OpenSearch
# 3. Ограничить ресурсы контейнеров

# Проверка использования ресурсов
docker stats
```

## 📊 Мониторинг

### Health checks

Все сервисы имеют health checks. Проверка:

```bash
docker-compose ps
```

### Статус сервисов

```bash
# Статус всех контейнеров
docker ps

# Использование ресурсов
docker stats

# Логи конкретного сервиса
./logs.sh [service_name]
```

## 🔒 Безопасность

⚠️ **ВАЖНО**: Эта конфигурация предназначена только для PoC и локальной разработки!

Отключены:
- Аутентификация OpenSearch
- HTTPS
- Файрволлы

Для продакшена требуется:
- Включение security plugin OpenSearch
- Настройка SSL/TLS
- Ограничение сетевого доступа
- Аутентификация и авторизация

## 📚 Дополнительная документация

- [OpenSearch Documentation](https://opensearch.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🎯 Следующие шаги

После успешного запуска платформы:

1. Изучите API через Swagger UI: http://localhost:8000/docs
2. Создайте дашборды в OpenSearch: http://localhost:5601
3. Протестируйте отправку событий через API
4. Настройте индексы и mappings в OpenSearch
5. Интегрируйте с реальными агентами

---

**🆘 Нужна помощь?**

Если возникли проблемы, проверьте:
1. Логи: `./logs.sh`
2. Статус: `docker-compose ps`
3. Ресурсы: `docker stats`
4. Сеть: `docker network inspect infra_cybersec_network`
