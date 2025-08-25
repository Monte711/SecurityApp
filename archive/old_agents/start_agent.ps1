# Скрипт запуска агента с автоматической отправкой данных
Write-Host "🚀 UECP Agent - Автоматическая отправка данных" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Проверяем, что API доступен
try {
    Write-Host "🔍 Проверка API..." -ForegroundColor Yellow
    $apiTest = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
    Write-Host "✅ API доступен" -ForegroundColor Green
} catch {
    Write-Host "❌ API недоступен! Убедитесь что запущена инфраструктура (docker-compose up -d)" -ForegroundColor Red
    Write-Host "💡 Для запуска инфраструктуры выполните:" -ForegroundColor Yellow
    Write-Host "   cd ..\INFRA" -ForegroundColor White
    Write-Host "   docker-compose up -d" -ForegroundColor White
    exit 1
}

# Проверяем исполняемый файл агента
if (-not (Test-Path "uecp-agent-auto-fixed.exe")) {
    Write-Host "❌ Исполняемый файл агента не найден!" -ForegroundColor Red
    Write-Host "💡 Убедитесь что вы в правильной директории: agent/windows/" -ForegroundColor Yellow
    exit 1
}

# Проверяем конфигурацию
if (-not (Test-Path "config.json")) {
    Write-Host "❌ Файл конфигурации не найден!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Параметры запуска:" -ForegroundColor Cyan
Write-Host "   • Интервал отправки: 60 секунд" -ForegroundColor White
Write-Host "   • API URL: http://localhost:8000/ingest" -ForegroundColor White
Write-Host "   • Автообновление UI: каждые 30 секунд" -ForegroundColor White
Write-Host ""

# Запускаем автоматическую отправку
Write-Host "🎯 Запуск автоматической отправки данных..." -ForegroundColor Green
Write-Host "⏹️ Для остановки нажмите Ctrl+C" -ForegroundColor Yellow
Write-Host ""

& ".\auto_sender.ps1"
