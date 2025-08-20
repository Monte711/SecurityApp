# PowerShell версия down.sh для Windows
# down.ps1 - останавливает все сервисы

param(
    [switch]$RemoveImages = $false,
    [switch]$RemoveVolumes = $false,
    [switch]$Force = $false
)

Write-Host "🛑 Остановка Unified Enterprise Cybersecurity Platform..." -ForegroundColor Yellow
Write-Host "=============================================="

# Переход в директорию скрипта
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Проверка наличия Docker
try {
    docker --version | Out-Null
}
catch {
    Write-Host "❌ Docker не найден!" -ForegroundColor Red
    exit 1
}

# Остановка и удаление контейнеров
Write-Host "🛑 Остановка контейнеров..."
try {
    if ($RemoveVolumes) {
        Write-Host "   🗑️  Удаление volumes..." -ForegroundColor Yellow
        docker-compose -f docker-compose.yml down -v
    } else {
        docker-compose -f docker-compose.yml down
    }
}
catch {
    Write-Host "⚠️  Ошибка при остановке: $_" -ForegroundColor Yellow
    if ($Force) {
        Write-Host "   🔨 Принудительная остановка..." -ForegroundColor Red
        docker stop $(docker ps -q --filter "name=cybersec_") 2>$null
        docker rm $(docker ps -aq --filter "name=cybersec_") 2>$null
    }
}

# Удаление образов (если запрошено)
if ($RemoveImages) {
    Write-Host "🗑️  Удаление неиспользуемых образов..."
    try {
        docker image prune -f
        Write-Host "   ✅ Образы очищены" -ForegroundColor Green
    }
    catch {
        Write-Host "   ⚠️  Ошибка при удалении образов: $_" -ForegroundColor Yellow
    }
}

# Проверка что все остановлено
$runningContainers = docker ps --filter "name=cybersec_" --format "table {{.Names}}" 2>$null
if ($runningContainers) {
    Write-Host "⚠️  Некоторые контейнеры все еще запущены:" -ForegroundColor Yellow
    Write-Host $runningContainers
} else {
    Write-Host "✅ Все сервисы остановлены" -ForegroundColor Green
}

Write-Host ""
Write-Host "📊 Статистика Docker:"
try {
    Write-Host "   Контейнеры: $(docker ps -a | Measure-Object | Select-Object -ExpandProperty Count) всего"
    Write-Host "   Образы: $(docker images | Measure-Object | Select-Object -ExpandProperty Count) всего"
    Write-Host "   Volumes: $(docker volume ls | Measure-Object | Select-Object -ExpandProperty Count) всего"
}
catch {
    Write-Host "   Не удалось получить статистику Docker"
}

Write-Host ""
Write-Host "🚀 Для повторного запуска используйте: ./up.ps1" -ForegroundColor Cyan

# Показать доступные опции
Write-Host ""
Write-Host "💡 Доступные опции:" -ForegroundColor Yellow
Write-Host "   ./down.ps1                    # Обычная остановка"
Write-Host "   ./down.ps1 -RemoveVolumes     # Остановка + удаление данных"
Write-Host "   ./down.ps1 -RemoveImages      # Остановка + очистка образов"
Write-Host "   ./down.ps1 -Force             # Принудительная остановка"
