#!/bin/bash

# Скрипт остановки инфраструктуры CyberSec Platform
# down.sh - останавливает все сервисы и очищает данные

set -e

echo "🛑 Остановка Unified Enterprise Cybersecurity Platform..."
echo "======================================================="

# Переход в директорию infra
cd "$(dirname "$0")"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Остановка и удаление контейнеров с volumes
echo "📦 Остановка контейнеров..."
docker-compose -f docker-compose.yml down -v

# Удаление неиспользуемых образов (опционально)
read -p "🗑️  Удалить неиспользуемые Docker образы? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Очистка неиспользуемых образов..."
    docker image prune -f
fi

# Удаление volumes (опционально)
read -p "💾 Удалить все данные (volumes)? ВНИМАНИЕ: Все данные будут потеряны! (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Удаление volumes..."
    docker volume prune -f
    echo -e "${YELLOW}⚠️  Все данные удалены!${NC}"
fi

echo -e "${GREEN}✅ Платформа остановлена${NC}"
echo ""
echo "📋 Для повторного запуска используйте:"
echo "   ./up.sh"
