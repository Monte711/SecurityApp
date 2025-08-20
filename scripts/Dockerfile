FROM python:3.11-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Создание рабочей директории
WORKDIR /app

# Копирование и установка Python зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование скриптов
COPY redis_to_opensearch.py .
COPY log_generator.py .

# Создание пользователя для безопасности
RUN useradd --create-home --shell /bin/bash worker && \
    chown -R worker:worker /app
USER worker

# Health check для worker
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import redis, json, os; r = redis.from_url(os.getenv('REDIS_URL', 'redis://redis:6379')); data = r.get('worker:health:redis-opensearch-worker'); print('healthy' if data and json.loads(data).get('status') == 'healthy' else 'unhealthy')" || exit 1

# Команда запуска worker
CMD ["python", "redis_to_opensearch.py"]
