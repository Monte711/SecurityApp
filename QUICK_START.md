# 🚀 Как запустить Step 5 - Полный пайплайн обработки данных

## Быстрый запуск (5 минут)

### 1. Запуск всех сервисов
```bash
cd INFRA
docker-compose up -d
```
**Ожидаемый результат**: 4 сервиса в статусе `healthy`

### 2. Запуск обработчика данных
```bash
cd scripts
python redis_to_opensearch.py
```
**Важно**: Держите этот терминал открытым

### 3. Генерация тестовых данных
```bash
# В новом терминале
cd scripts
python log_generator.py --rate 2 --duration 10
```
**Результат**: 20 событий будут отправлены в систему

### 4. Просмотр данных в Dashboard
Откройте: http://localhost:5601

## 📊 Проверка работы

### Проверить количество событий в OpenSearch:
```bash
docker exec cybersec_opensearch curl -s "localhost:9200/security-events-*/_count"
```

### Просмотр последних событий:
```bash
docker exec cybersec_opensearch curl -s "localhost:9200/security-events-*/_search?size=3&sort=timestamp:desc" | jq
```

### Статус всех сервисов:
```bash
cd INFRA && docker-compose ps
```

## 🛠️ Режимы генерации

### Разовая партия:
```bash
python log_generator.py --batch 50
```

### Постоянная генерация:
```bash
python log_generator.py --rate 1 --duration 300  # 5 минут
```

### Высокая нагрузка:
```bash
python log_generator.py --rate 10 --duration 30
```

## 📋 Архитектура

```
📱 Log Generator → 🔗 FastAPI → 📨 Redis → ⚙️ Worker → 🗃️ OpenSearch → 📊 Dashboard
```

## 🔗 Доступные сервисы

| Сервис | URL | Описание |
|--------|-----|----------|
| FastAPI | http://localhost:8000/docs | API документация |
| Dashboard | http://localhost:5601 | Визуализация данных |
| OpenSearch | http://localhost:9200 | REST API |
| Redis | localhost:6379 | Очередь сообщений |

## 🚨 Устранение проблем

### Сервисы не запускаются:
```bash
docker-compose down --volumes
docker-compose up -d
```

### Worker не обрабатывает события:
1. Перезапустите worker: `Ctrl+C` → `python redis_to_opensearch.py`
2. Проверьте соединения: `python redis_to_opensearch.py --health-check`

### Нет данных в Dashboard:
1. Проверьте количество событий в OpenSearch
2. В Dashboard создайте Index Pattern: `security-events-*`

## 📚 Документация

- `docs/DASHBOARD_GUIDE.md` - Подробное руководство по Dashboard
- `docs/dashboard-config.json` - Готовые конфигурации визуализации
- `FINAL_CHECK.md` - Итоговый отчет о тестировании

---

**Результат**: Полностью рабочий пайплайн обработки событий безопасности с русской локализацией! 🇷🇺
