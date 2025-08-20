#!/bin/bash

# Скрипт запуска инфраструктуры CyberSec Platform
# up.sh - поднимает все сервисы и ждет их готовности

set -e

echo "🚀 Запуск Unified Enterprise Cybersecurity Platform..."
echo "=============================================="

# Переход в директорию infra
cd "$(dirname "$0")"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция проверки доступности сервиса
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    echo -n "⏳ Ждем готовности $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e " ${GREEN}✅ Готов!${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e " ${RED}❌ Таймаут ожидания${NC}"
    return 1
}

# Остановка существующих контейнеров (если есть)
echo "🛑 Остановка существующих контейнеров..."
docker-compose -f docker-compose.yml down -v 2>/dev/null || true

# Сборка и запуск сервисов
echo "🏗️  Сборка и запуск сервисов..."
docker-compose -f docker-compose.yml up --build -d

echo ""
echo "🔍 Проверка готовности сервисов..."

# Проверка OpenSearch
if check_service "OpenSearch" "http://localhost:9200/_cluster/health"; then
    echo "   📊 OpenSearch Dashboard: http://localhost:5601"
else
    echo -e "${RED}❌ OpenSearch не запустился${NC}"
    exit 1
fi

# Проверка Redis
if check_service "Redis" "http://localhost:6379" || docker exec cybersec_redis redis-cli ping > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Redis готов${NC}"
else
    echo -e "${RED}❌ Redis не запустился${NC}"
    exit 1
fi

# Проверка Ingest API
if check_service "Ingest API" "http://localhost:8000/health"; then
    echo "   🔗 API Swagger UI: http://localhost:8000/docs"
else
    echo -e "${RED}❌ Ingest API не запустился${NC}"
    exit 1
fi

# Проверка UI (если включен)
if docker ps --format 'table {{.Names}}' | grep -q cybersec_ui; then
    if check_service "UI Dashboard" "http://localhost:3000/health"; then
        echo "   🌐 Web UI: http://localhost:3000"
    else
        echo -e "${YELLOW}⚠️  UI Dashboard недоступен${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Все сервисы успешно запущены!${NC}"
echo ""
echo "📋 Доступные эндпоинты:"
echo "   • OpenSearch: http://localhost:9200"
echo "   • OpenSearch Dashboards: http://localhost:5601"
echo "   • Ingest API: http://localhost:8000"
echo "   • API Documentation: http://localhost:8000/docs"
echo "   • Web UI: http://localhost:3000 (если включен)"
echo ""
echo "🧪 Быстрая проверка:"
echo "   curl http://localhost:9200/_cluster/health"
echo "   curl http://localhost:8000/health"
echo ""
echo "📚 Документация: ./README.md"
