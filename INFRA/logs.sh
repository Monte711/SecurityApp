#!/bin/bash

# Скрипт просмотра логов CyberSec Platform
# logs.sh - показывает логи всех сервисов

set -e

# Переход в директорию infra
cd "$(dirname "$0")"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Логи Unified Enterprise Cybersecurity Platform${NC}"
echo "================================================="

# Проверка параметров
if [ "$1" == "help" ] || [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    echo "Использование:"
    echo "  ./logs.sh                    # Логи всех сервисов"
    echo "  ./logs.sh [service]          # Логи конкретного сервиса"
    echo "  ./logs.sh -f                 # Следить за логами в реальном времени"
    echo "  ./logs.sh [service] -f       # Следить за логами сервиса"
    echo ""
    echo "Доступные сервисы:"
    echo "  - opensearch"
    echo "  - opensearch_dashboards" 
    echo "  - redis"
    echo "  - ingest_api"
    echo "  - ui"
    echo ""
    exit 0
fi

# Проверка запущенных контейнеров
if ! docker-compose -f docker-compose.yml ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Сервисы не запущены. Запустите ./up.sh${NC}"
    exit 1
fi

# Определение параметров
SERVICE=""
FOLLOW=""

# Обработка аргументов
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW="-f"
            shift
            ;;
        opensearch|opensearch_dashboards|redis|ingest_api|ui)
            SERVICE="$1"
            shift
            ;;
        *)
            echo "Неизвестный параметр: $1"
            echo "Используйте ./logs.sh help для справки"
            exit 1
            ;;
    esac
done

echo "🔍 Статус сервисов:"
docker-compose -f docker-compose.yml ps
echo ""

if [ -n "$SERVICE" ]; then
    echo -e "${GREEN}📋 Логи сервиса: $SERVICE${NC}"
    echo "================================"
    docker-compose -f docker-compose.yml logs $FOLLOW "$SERVICE"
else
    echo -e "${GREEN}📋 Логи всех сервисов${NC}"
    echo "====================="
    
    if [ -n "$FOLLOW" ]; then
        echo "👀 Следим за логами (Ctrl+C для выхода)..."
        docker-compose -f docker-compose.yml logs -f
    else
        echo "📊 OpenSearch:"
        docker-compose -f docker-compose.yml logs --tail=10 opensearch | head -20
        echo ""
        
        echo "📈 OpenSearch Dashboards:"
        docker-compose -f docker-compose.yml logs --tail=10 opensearch_dashboards | head -20
        echo ""
        
        echo "🔴 Redis:"
        docker-compose -f docker-compose.yml logs --tail=10 redis | head -20
        echo ""
        
        echo "🔗 Ingest API:"
        docker-compose -f docker-compose.yml logs --tail=10 ingest_api | head -20
        echo ""
        
        # UI логи (если контейнер запущен)
        if docker ps --format 'table {{.Names}}' | grep -q cybersec_ui; then
            echo "🌐 UI:"
            docker-compose -f docker-compose.yml logs --tail=10 ui | head -20
            echo ""
        fi
        
        echo -e "${YELLOW}💡 Для просмотра полных логов используйте:${NC}"
        echo "   ./logs.sh -f                    # Все логи в реальном времени"
        echo "   ./logs.sh [service] -f          # Логи конкретного сервиса"
    fi
fi
