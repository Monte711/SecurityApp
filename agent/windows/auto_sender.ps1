# Автоматический скрипт отправки данных от агента
param(
    [int]$IntervalSeconds = 60,
    [string]$ConfigFile = "config.json"
)

Write-Host "🚀 Запуск автоматической отправки данных агента" -ForegroundColor Green
Write-Host "📅 Интервал: $IntervalSeconds секунд" -ForegroundColor Cyan
Write-Host "⚙️ Конфигурация: $ConfigFile" -ForegroundColor Cyan

# Читаем конфигурацию
if (Test-Path $ConfigFile) {
    $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
    $apiUrl = $config.ingest_url
    $agentId = $config.agent_id
    $agentVersion = $config.agent_version
    Write-Host "✅ Конфигурация загружена: API = $apiUrl" -ForegroundColor Green
} else {
    Write-Host "❌ Файл конфигурации не найден: $ConfigFile" -ForegroundColor Red
    exit 1
}

# Функция отправки данных
function Send-AgentData {
    try {
        # Формируем простое событие для API
        $event = @{
            event_id = [System.Guid]::NewGuid().ToString()
            event_type = "system_info"
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            host = @{
                host_id = $env:COMPUTERNAME
                hostname = $env:COMPUTERNAME
                ip_address = "127.0.0.1"
                os = "Windows 11"
                architecture = "x64"
            }
            agent = @{
                agent_id = $agentId
                agent_version = $agentVersion
            }
            data = @{
                process_count = (Get-Process).Count
                security_enabled = $true
                timestamp = (Get-Date).ToString()
            }
        }
        
        # Отправляем в API
        $jsonBody = $event | ConvertTo-Json -Depth 5
        Write-Host "📡 Отправка данных в API: $apiUrl" -ForegroundColor Yellow
        
        $response = Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json" -Body $jsonBody
        Write-Host "✅ Данные успешно отправлены! ID: $($response.event_id)" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Ошибка отправки данных: $_" -ForegroundColor Red
    }
}

# Основной цикл
Write-Host "🔄 Начинаю автоматическую отправку данных..." -ForegroundColor Green
Write-Host "⏹️ Для остановки нажмите Ctrl+C" -ForegroundColor Yellow

while ($true) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "`n[$timestamp] Начинаю отправку данных..." -ForegroundColor Cyan
    
    Send-AgentData
    
    Write-Host "⏰ Следующая отправка через $IntervalSeconds секунд..." -ForegroundColor Gray
    Start-Sleep -Seconds $IntervalSeconds
}
