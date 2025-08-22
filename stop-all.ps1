# UECP Platform Shutdown Script
# Полная остановка всех компонентов платформы кибербезопасности

Write-Host "🛑 Остановка UECP Platform..." -ForegroundColor Red

# Переход в директорию инфраструктуры
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptPath\INFRA"

# Остановка контейнеров с профилем dev
Write-Host "🔄 Остановка dev-сервисов..." -ForegroundColor Yellow
docker-compose --profile dev down

# Остановка основной инфраструктуры
Write-Host "🔄 Остановка основной инфраструктуры..." -ForegroundColor Yellow
docker-compose down --remove-orphans

# Показать оставшиеся контейнеры
Write-Host "`n📋 Проверка оставшихся контейнеров..." -ForegroundColor Cyan
$containers = docker ps -a --filter "name=cybersec" --format "table {{.Names}}\t{{.Status}}"
if ($containers) {
    Write-Host $containers -ForegroundColor Gray
} else {
    Write-Host "✅ Все контейнеры остановлены" -ForegroundColor Green
}

# Опциональная очистка
Write-Host "`n🧹 Хотите очистить неиспользуемые ресурсы? (y/N): " -ForegroundColor Yellow -NoNewline
$cleanup = Read-Host
if ($cleanup -eq "y" -or $cleanup -eq "Y") {
    Write-Host "🧹 Очистка неиспользуемых ресурсов..." -ForegroundColor Yellow
    docker system prune -f
    Write-Host "✅ Очистка завершена" -ForegroundColor Green
}

Write-Host "`n✅ UECP Platform остановлена" -ForegroundColor Green
