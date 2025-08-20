# PowerShell версия up.sh для Windows
# up.ps1 - поднимает все сервисы и ждет их готовности

param(
    [switch]$WithUI = $false
)

Write-Host "🚀 Запуск Unified Enterprise Cybersecurity Platform..." -ForegroundColor Green
Write-Host "=============================================="

# Переход в директорию скрипта
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Функция проверки доступности сервиса
function Test-ServiceReady {
    param(
        [string]$ServiceName,
        [string]$Url,
        [int]$MaxAttempts = 30
    )
    
    Write-Host "⏳ Ждем готовности $ServiceName..." -NoNewline
    
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Host " ✅ Готов!" -ForegroundColor Green
                return $true
            }
        }
        catch {
            # Игнорируем ошибки и продолжаем попытки
        }
        
        Write-Host "." -NoNewline
        Start-Sleep 2
    }
    
    Write-Host " ❌ Таймаут ожидания" -ForegroundColor Red
    return $false
}

# Проверка наличия Docker
try {
    $dockerVersion = docker --version 2>$null
    if (-not $dockerVersion) {
        throw "Docker не найден"
    }
    Write-Host "✅ Docker найден: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker не установлен или недоступен!" -ForegroundColor Red
    Write-Host "   Для тестирования инфраструктуры необходим Docker" -ForegroundColor Yellow
    Write-Host "   Скачайте Docker Desktop с https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Проверка наличия docker-compose
try {
    $composeVersion = docker-compose --version 2>$null
    if (-not $composeVersion) {
        throw "Docker Compose не найден"
    }
    Write-Host "✅ Docker Compose найден: $composeVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker Compose не установлен!" -ForegroundColor Red
    exit 1
}

# Остановка существующих контейнеров (если есть)
Write-Host "🛑 Остановка существующих контейнеров..."
try {
    docker-compose -f docker-compose.yml down -v 2>$null
}
catch {
    # Игнорируем ошибки если контейнеры не запущены
}

# Сборка и запуск сервисов
Write-Host "🏗️  Сборка и запуск сервисов..."
try {
    if ($WithUI) {
        Write-Host "   Запуск с UI (профиль dev)..." -ForegroundColor Yellow
        docker-compose -f docker-compose.yml --profile dev up --build -d
    } else {
        Write-Host "   Запуск основных сервисов (без UI)..." -ForegroundColor Yellow
        docker-compose -f docker-compose.yml up --build -d
    }
}
catch {
    Write-Host "❌ Ошибка при запуске контейнеров: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔍 Проверка готовности сервисов..."

# Проверка OpenSearch
if (Test-ServiceReady -ServiceName "OpenSearch" -Url "http://localhost:9200/_cluster/health") {
    Write-Host "   📊 OpenSearch Dashboard: http://localhost:5601" -ForegroundColor Cyan
} else {
    Write-Host "❌ OpenSearch не запустился" -ForegroundColor Red
    Write-Host "   Проверьте логи: docker-compose logs opensearch" -ForegroundColor Yellow
    exit 1
}

# Проверка Redis через Docker exec (так как Redis не имеет HTTP endpoint)
try {
    $redisTest = docker exec cybersec_redis redis-cli ping 2>$null
    if ($redisTest -eq "PONG") {
        Write-Host "   ✅ Redis готов" -ForegroundColor Green
    } else {
        throw "Redis не отвечает"
    }
}
catch {
    Write-Host "❌ Redis не запустился: $_" -ForegroundColor Red
    Write-Host "   Проверьте логи: docker-compose logs redis" -ForegroundColor Yellow
    exit 1
}

# Проверка Ingest API
if (Test-ServiceReady -ServiceName "Ingest API" -Url "http://localhost:8000/health") {
    Write-Host "   🔗 API Swagger UI: http://localhost:8000/docs" -ForegroundColor Cyan
} else {
    Write-Host "❌ Ingest API не запустился" -ForegroundColor Red
    Write-Host "   Проверьте логи: docker-compose logs ingest_api" -ForegroundColor Yellow
    exit 1
}

# Проверка UI (если включен)
try {
    $uiContainer = docker ps --format "table {{.Names}}" | Select-String "cybersec_ui"
    if ($uiContainer) {
        if (Test-ServiceReady -ServiceName "UI Dashboard" -Url "http://localhost:3000") {
            Write-Host "   🌐 Web UI: http://localhost:3000" -ForegroundColor Cyan
        } else {
            Write-Host "⚠️  UI Dashboard недоступен" -ForegroundColor Yellow
        }
    }
}
catch {
    # UI может быть отключен
}

Write-Host ""
Write-Host "🎉 Все сервисы успешно запущены!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Доступные эндпоинты:" -ForegroundColor Cyan
Write-Host "   • OpenSearch: http://localhost:9200"
Write-Host "   • OpenSearch Dashboards: http://localhost:5601"
Write-Host "   • Ingest API: http://localhost:8000"
Write-Host "   • API Documentation: http://localhost:8000/docs"
if ($WithUI) {
    Write-Host "   • Web UI: http://localhost:3000"
}
Write-Host ""
Write-Host "🧪 Быстрая проверка:" -ForegroundColor Yellow
Write-Host "   Invoke-WebRequest http://localhost:9200/_cluster/health"
Write-Host "   Invoke-WebRequest http://localhost:8000/health"
Write-Host ""
Write-Host "📚 Документация: ./README.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 Для остановки используйте: ./down.ps1" -ForegroundColor Yellow
