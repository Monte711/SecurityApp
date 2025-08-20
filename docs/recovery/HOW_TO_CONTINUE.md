# Как продолжить разработку

## Текущий статус проекта

### ✅ Что уже готово (Step 1-2)
1. **Организация репозитория** (95% готово)
   - ✅ Модульная структура проекта
   - ✅ Scripts для автоматизации (organize_repo.py)
   - ✅ Базовая система тестирования
   - ✅ Конфигурация development environment

2. **Документация для восстановления** (90% готово)
   - ✅ RECOVERY_GUIDE.md - полное руководство
   - ✅ PROJECT_OVERVIEW.md - общий обзор
   - ✅ MODULE_STATUS.md - статус модулей
   - ✅ TELEMETRY_SCHEMA.json - схема данных
   - ✅ ARCHITECTURE.md - архитектура системы
   - ✅ RUNBOOK.md - операционное руководство
   - ✅ TESTS_STATUS.md - статус тестирования
   - ✅ BACKLOG.md - планирование и приоритеты
   - ✅ ROADMAP.md - долгосрочная стратегия
   - ✅ DESIGN_DECISIONS.md - проектные решения
   - ✅ SECURITY_REQUIREMENTS.md - требования безопасности

3. **GUI прототип** (100% готово)
   - ✅ React + TypeScript + Vite
   - ✅ Dashboard с компонентами
   - ✅ Mock данные
   - ✅ Запущен на localhost:3000

## 🎯 Немедленные следующие шаги (Step 3)

### Step 3: Интеграция GUI с Ingest API

#### 3.1 Создание переключателя mock/real данных
```typescript
// ui-dashboard/.env
VITE_USE_MOCK_DATA=false  # toggle между mock и real API

// src/api/client.ts
const API_BASE_URL = import.meta.env.VITE_USE_MOCK_DATA 
  ? '/api/mock' 
  : 'http://localhost:8000';
```

#### 3.2 Реализация real API endpoints
```typescript
// Добавить в src/api/client.ts
export const sendEvent = async (event: AgentTelemetryEvent) => {
  const response = await fetch(`${API_BASE_URL}/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Agent-ID': 'ui-dashboard-001'
    },
    body: JSON.stringify(event)
  });
  return response.json();
};

export const getEvents = async (limit = 100) => {
  const response = await fetch(`${API_BASE_URL}/events?limit=${limit}`);
  return response.json();
};
```

#### 3.3 Интеграция с существующими компонентами
- Модификация AlertsTable.tsx для отображения real данных
- Добавление loading states и error handling
- Реализация real-time updates через WebSocket или polling

### Step 4: Docker инфраструктура (следующая неделя)

#### 4.1 Создание production docker-compose.yml
```yaml
# docker/docker-compose.prod.yml
version: '3.8'
services:
  ingest-api:
    build: ../ingest-api
    ports:
      - "8000:8000"
    environment:
      - OPENSEARCH_URL=http://opensearch:9200
      - REDIS_URL=redis://redis:6379
    depends_on:
      - opensearch
      - redis

  opensearch:
    image: opensearchproject/opensearch:2.11.0
    environment:
      - cluster.name=cybersec-cluster
      - node.name=cybersec-node1
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - "OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g"
    ports:
      - "9200:9200"
    volumes:
      - opensearch_data:/usr/share/opensearch/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  opensearch_data:
  redis_data:
```

### Step 5: Production-ready Ingest API (следующие 2 недели)

#### 5.1 Основной FastAPI код
```python
# ingest-api/main.py
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import asyncio
import aioredis
from opensearchpy import AsyncOpenSearch
import logging

app = FastAPI(title="Cybersecurity Ingest API", version="1.0.0")

# Schemas
class AgentTelemetryEvent(BaseModel):
    event_id: str
    event_type: str
    timestamp: str
    host: dict
    agent: dict
    # ... остальные поля из TELEMETRY_SCHEMA.json

# Dependencies
async def get_opensearch():
    return AsyncOpenSearch([{'host': 'localhost', 'port': 9200}])

async def get_redis():
    return await aioredis.from_url("redis://localhost:6379")

# Endpoints
@app.post("/ingest")
async def ingest_event(
    event: AgentTelemetryEvent,
    opensearch: AsyncOpenSearch = Depends(get_opensearch),
    redis = Depends(get_redis)
):
    try:
        # Идемпотентность - проверка дубликатов
        exists = await opensearch.exists(
            index=f"agent-events-{event.timestamp[:10]}", 
            id=event.event_id
        )
        if exists:
            return {"status": "duplicate", "event_id": event.event_id}
        
        # Сохранение в OpenSearch
        await opensearch.index(
            index=f"agent-events-{event.timestamp[:10]}",
            id=event.event_id,
            body=event.dict()
        )
        
        # Публикация в Redis Stream
        await redis.xadd("events:ingestion", event.dict())
        
        return {"status": "accepted", "event_id": event.event_id}
    
    except Exception as e:
        logging.error(f"Failed to process event {event.event_id}: {e}")
        raise HTTPException(500, "Internal server error")

@app.get("/events")
async def get_events(
    limit: int = 100,
    opensearch: AsyncOpenSearch = Depends(get_opensearch)
):
    try:
        response = await opensearch.search(
            index="agent-events-*",
            body={
                "query": {"match_all": {}},
                "sort": [{"timestamp": {"order": "desc"}}],
                "size": limit
            }
        )
        return response['hits']['hits']
    except Exception as e:
        logging.error(f"Failed to fetch events: {e}")
        raise HTTPException(500, "Internal server error")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2024-01-15T10:30:00Z"}
```

#### 5.2 Requirements и конфигурация
```python
# ingest-api/requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
aioredis==2.0.1
opensearch-py==2.4.0
python-multipart==0.0.6
```

```dockerfile
# ingest-api/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🚀 План выполнения по неделям

### Неделя 1: GUI Integration (Step 3)
**Понедельник-Вторник**:
- [ ] Создать VITE_USE_MOCK toggle в UI
- [ ] Реализовать real API client methods
- [ ] Добавить error handling и loading states

**Среда-Четверг**:
- [ ] Интеграция real data в AlertsTable.tsx
- [ ] Добавить WebSocket для real-time updates
- [ ] Тестирование GUI с mock и real данными

**Пятница**:
- [ ] Code review и рефакторинг
- [ ] Документация изменений
- [ ] Подготовка к Step 4

### Неделя 2: Docker Infrastructure (Step 4)
**Понедельник-Вторник**:
- [ ] Создать production docker-compose.yml
- [ ] Настроить OpenSearch и Redis конфигурацию
- [ ] Создать health check scripts

**Среда-Четверг**:
- [ ] Тестирование full stack deployment
- [ ] Настройка volume persistence
- [ ] Network security конфигурация

**Пятница**:
- [ ] Performance testing инфраструктуры
- [ ] Backup и recovery процедуры
- [ ] Документирование deployment

### Неделя 3-4: Production API (Step 5)
**Неделя 3**:
- [ ] Реализация основного FastAPI кода
- [ ] OpenSearch интеграция
- [ ] Redis Streams implementation
- [ ] Идемпотентность и error handling

**Неделя 4**:
- [ ] Rate limiting и authentication
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Production deployment

## 🔧 Команды для быстрого старта

### 1. Запуск GUI с real API
```bash
# Терминал 1: Запуск инфраструктуры
cd docker
docker-compose -f docker-compose.dev.yml up -d

# Терминал 2: Запуск Ingest API (когда будет готов)
cd ingest-api
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload

# Терминал 3: Запуск UI с real API
cd ui-dashboard
$env:VITE_USE_MOCK_DATA="false"  # PowerShell
npm run dev
```

### 2. Проверка интеграции
```bash
# Отправка тестового события
curl -X POST http://localhost:8000/ingest `
  -H "Content-Type: application/json" `
  -H "X-Agent-ID: test-agent-001" `
  -d '@tests/fixtures/sample_event.json'

# Проверка в UI на http://localhost:3000
# Событие должно появиться в AlertsTable
```

### 3. Валидация Step 3
```bash
# UI должен работать с обоими режимами
# Mock mode: VITE_USE_MOCK_DATA=true
# Real mode: VITE_USE_MOCK_DATA=false

# Проверить переключение между режимами
# Проверить error handling при недоступности API
# Проверить real-time updates
```

## 📝 Чеклист готовности каждого Step

### Step 3 готов когда:
- [ ] GUI корректно работает с VITE_USE_MOCK_DATA=true
- [ ] GUI корректно работает с VITE_USE_MOCK_DATA=false  
- [ ] Proper error handling при недоступности API
- [ ] Loading states для async операций
- [ ] Real-time updates работают
- [ ] Unit tests покрывают новую функциональность
- [ ] E2E тесты проходят в обоих режимах

### Step 4 готов когда:
- [ ] docker-compose.prod.yml запускает все сервисы
- [ ] OpenSearch accessible и индексирует данные
- [ ] Redis принимает streams
- [ ] Health checks проходят для всех сервисов
- [ ] Data persistence работает после restart
- [ ] Network connectivity между сервисами
- [ ] Performance acceptable для basic load

### Step 5 готов когда:
- [ ] Ingest API принимает и валидирует события
- [ ] Идемпотентность работает корректно
- [ ] События сохраняются в OpenSearch
- [ ] События публикуются в Redis Streams
- [ ] API возвращает stored события
- [ ] Rate limiting работает
- [ ] Comprehensive error handling
- [ ] Performance tests проходят (1000+ events/sec)
- [ ] Production deployment успешен

## 🎯 Ключевые метрики успеха

### Technical Metrics:
- **API Response Time**: <100ms для /ingest
- **Throughput**: 1000+ events/sec
- **Uptime**: 99.9% availability
- **Error Rate**: <0.1% для valid requests

### Quality Metrics:
- **Test Coverage**: 85%+ для всех модулей
- **Code Quality**: SonarQube score A
- **Security**: No high/critical vulnerabilities
- **Documentation**: 100% API documentation

### User Experience:
- **UI Load Time**: <3 seconds
- **Real-time Updates**: <5 seconds latency
- **Error Handling**: Graceful degradation
- **Mobile Responsive**: Works на всех devices

## 🚨 Риски и митигация

### Высокие риски:
1. **OpenSearch performance под нагрузкой**
   - Митигация: Load testing, proper indexing strategy
   
2. **Real-time updates scaling**
   - Митигация: WebSocket connection pooling, fallback к polling

3. **Docker networking complexity**
   - Митигация: Простая конфигурация, extensive testing

### Средние риски:
1. **API authentication complexity**
   - Митигация: Поэтапная реализация, начать с basic auth
   
2. **Data schema evolution**
   - Митигация: Версioning strategy, backward compatibility

## 💡 Советы для успешного продолжения

1. **Начни с Step 3** - это самый простой и быстрый способ получить working integration
2. **Тестируй на каждом шаге** - не переходи к следующему step пока текущий не работает полностью
3. **Используй инкрементальный подход** - добавляй функциональность постепенно
4. **Документируй изменения** - обновляй README и другие docs файлы
5. **Делай commits часто** - малые commits легче debug и rollback

## 📞 Где получить помощь

1. **Technical Issues**: Проверь RUNBOOK.md для troubleshooting
2. **Architecture Questions**: Изучи ARCHITECTURE.md и DESIGN_DECISIONS.md  
3. **Security Concerns**: Смотри SECURITY_REQUIREMENTS.md
4. **Planning**: Используй BACKLOG.md и ROADMAP.md

---

**Следующий файл для создания**: Начни с создания `ingest-api/main.py` и реализации Step 3 GUI integration. Вся необходимая информация есть в этом руководстве!
