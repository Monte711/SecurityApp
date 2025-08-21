# UECP Platform Startup Script
# Полный запуск всех компонентов платформы кибербезопасности

Write-Host "🚀 Запуск UECP Platform..." -ForegroundColor Green

# Функция проверки статуса контейнера
function Test-ContainerHealth {
    param([string]$containerName)
    try {
        $status = docker inspect --format='{{.State.Health.Status}}' $containerName 2>$null
        return $status -eq "healthy"
    } catch {
        return $false
    }
}

# Функция ожидания готовности сервиса
function Wait-ServiceReady {
    param(
        [string]$serviceName,
        [string]$url,
        [int]$maxAttempts = 30
    )
    
    Write-Host "⏳ Ожидание готовности $serviceName..." -ForegroundColor Yellow
    
    for ($i = 1; $i -le $maxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ $serviceName готов!" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "🔄 Попытка $i/$maxAttempts..." -ForegroundColor Gray
        }
        Start-Sleep -Seconds 2
    }
    
    Write-Host "❌ $serviceName не готов после $maxAttempts попыток" -ForegroundColor Red
    return $false
}

# Проверка Docker
Write-Host "🔍 Проверка Docker..." -ForegroundColor Cyan
try {
    docker version | Out-Null
    Write-Host "✅ Docker готов" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker не запущен. Запустите Docker Desktop." -ForegroundColor Red
    exit 1
}

# Переход в директорию инфраструктуры
Set-Location "c:\Users\PC\Desktop\test\INFRA"

# Остановка существующих контейнеров
Write-Host "🛑 Остановка существующих контейнеров..." -ForegroundColor Yellow
docker-compose down --remove-orphans

# Запуск основной инфраструктуры
Write-Host "🔧 Запуск базовой инфраструктуры..." -ForegroundColor Cyan
docker-compose up -d opensearch redis opensearch_dashboards ingest_api

# Проверка готовности OpenSearch
if (-not (Wait-ServiceReady "OpenSearch" "http://localhost:9200/_cluster/health")) {
    Write-Host "❌ Не удалось запустить OpenSearch" -ForegroundColor Red
    exit 1
}

# Проверка готовности Redis
Write-Host "⏳ Проверка Redis..." -ForegroundColor Yellow
try {
    docker exec cybersec_redis redis-cli ping | Out-Null
    Write-Host "✅ Redis готов!" -ForegroundColor Green
} catch {
    Write-Host "❌ Redis не готов" -ForegroundColor Red
    exit 1
}

# Проверка готовности Ingest API
if (-not (Wait-ServiceReady "Ingest API" "http://localhost:8000/health")) {
    Write-Host "❌ Не удалось запустить Ingest API" -ForegroundColor Red
    exit 1
}

# Запуск UI с профилем dev
Write-Host "🌐 Запуск UI Dashboard..." -ForegroundColor Cyan
docker-compose --profile dev up -d ui

# Проверка готовности UI
if (-not (Wait-ServiceReady "UI Dashboard" "http://localhost:3000")) {
    Write-Host "⚠️ UI не готов, но можно продолжить" -ForegroundColor Yellow
}

# Запуск Redis Worker
Write-Host "⚙️ Запуск Redis Worker..." -ForegroundColor Cyan
docker-compose --profile dev up -d redis_worker

Write-Host "`n🎉 UECP Platform успешно запущена!" -ForegroundColor Green
Write-Host "📊 Сервисы:" -ForegroundColor White
Write-Host "  • OpenSearch:      http://localhost:9200" -ForegroundColor Cyan
Write-Host "  • OpenSearch UI:   http://localhost:5601" -ForegroundColor Cyan
Write-Host "  • Ingest API:      http://localhost:8000" -ForegroundColor Cyan
Write-Host "  • Dashboard UI:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "  • Redis:           localhost:6379" -ForegroundColor Cyan

Write-Host "`n🔧 API Endpoints:" -ForegroundColor White
Write-Host "  • Health:          http://localhost:8000/health" -ForegroundColor Gray
Write-Host "  • Events:          http://localhost:8000/events" -ForegroundColor Gray
Write-Host "  • Statistics:      http://localhost:8000/stats" -ForegroundColor Gray
Write-Host "  • Ingest:          http://localhost:8000/ingest" -ForegroundColor Gray

Write-Host "`n✨ Для запуска агента выполните:" -ForegroundColor Yellow
Write-Host "  cd c:\Users\PC\Desktop\test\agent\windows" -ForegroundColor Gray
Write-Host "  .\simple_sender.ps1" -ForegroundColor Gray

Write-Host "`nДля остановки: .\stop-all.ps1" -ForegroundColor Red
