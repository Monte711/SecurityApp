# UECP Agent Management Script
# Управление агентами и их конфигурацией

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("start", "stop", "status", "config", "test")]
    [string]$Action = "status",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("simple", "enhanced")]
    [string]$AgentType = "enhanced",
    
    [Parameter(Mandatory=$false)]
    [int]$Interval = 60,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("minimal", "standard", "detailed")]
    [string]$CollectionLevel = "standard"
)

$agentPath = "c:\Users\PC\Desktop\test\agent\windows"
$apiUrl = "http://localhost:8000"

# Функция проверки статуса API
function Test-ApiStatus {
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/health" -TimeoutSec 5
        return $true
    } catch {
        return $false
    }
}

# Функция получения статистики событий
function Get-EventsStats {
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/stats" -TimeoutSec 5
        return $response
    } catch {
        return $null
    }
}

# Функция проверки запущенных агентов
function Get-AgentProcesses {
    $processes = @()
    
    # PowerShell агенты
    $psAgents = Get-WmiObject Win32_Process | Where-Object { 
        $_.CommandLine -like "*simple_sender.ps1*" -or 
        $_.CommandLine -like "*enhanced_agent.ps1*" 
    }
    
    foreach ($proc in $psAgents) {
        $agentName = if ($proc.CommandLine -like "*simple_sender*") { "Simple Agent" } else { "Enhanced Agent" }
        $processes += @{
            Name = $agentName
            PID = $proc.ProcessId
            StartTime = [System.Management.ManagementDateTimeConverter]::ToDateTime($proc.CreationDate)
            CommandLine = $proc.CommandLine
        }
    }
    
    # Go агенты
    $goAgents = Get-Process | Where-Object { $_.ProcessName -like "*uecp-agent*" }
    foreach ($proc in $goAgents) {
        $processes += @{
            Name = "Go Agent"
            PID = $proc.Id
            StartTime = $proc.StartTime
            Path = $proc.Path
        }
    }
    
    return $processes
}

Write-Host "🔧 UECP Agent Manager" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green

# Проверка API
Write-Host "`n🔍 Проверка API..." -ForegroundColor Cyan
if (Test-ApiStatus) {
    Write-Host "✅ API доступен ($apiUrl)" -ForegroundColor Green
    
    $stats = Get-EventsStats
    if ($stats) {
        Write-Host "📊 События в системе: $($stats.total_events)" -ForegroundColor White
        Write-Host "📈 Уникальных хостов: $($stats.unique_hosts)" -ForegroundColor White
    }
} else {
    Write-Host "❌ API недоступен ($apiUrl)" -ForegroundColor Red
    Write-Host "💡 Запустите платформу: .\start-all.ps1" -ForegroundColor Yellow
}

switch ($Action) {
    "status" {
        Write-Host "`n📋 Статус агентов:" -ForegroundColor Cyan
        $agents = Get-AgentProcesses
        
        if ($agents.Count -eq 0) {
            Write-Host "❌ Агенты не запущены" -ForegroundColor Red
        } else {
            foreach ($agent in $agents) {
                Write-Host "✅ $($agent.Name) (PID: $($agent.PID)) - запущен $(([DateTime]::Now - $agent.StartTime).ToString('hh\:mm\:ss')) назад" -ForegroundColor Green
            }
        }
        
        Write-Host "`n📁 Доступные агенты:" -ForegroundColor White
        Write-Host "  • Simple Agent:    .\manage-agent.ps1 -Action start -AgentType simple" -ForegroundColor Gray
        Write-Host "  • Enhanced Agent:  .\manage-agent.ps1 -Action start -AgentType enhanced" -ForegroundColor Gray
    }
    
    "start" {
        Write-Host "`n🚀 Запуск агента..." -ForegroundColor Green
        
        # Остановка существующих агентов
        $existingAgents = Get-AgentProcesses
        if ($existingAgents.Count -gt 0) {
            Write-Host "🛑 Остановка существующих агентов..." -ForegroundColor Yellow
            foreach ($agent in $existingAgents) {
                try {
                    Stop-Process -Id $agent.PID -Force
                    Write-Host "✅ Остановлен $($agent.Name) (PID: $($agent.PID))" -ForegroundColor Green
                } catch {
                    Write-Host "⚠️ Ошибка остановки $($agent.Name): $_" -ForegroundColor Yellow
                }
            }
            Start-Sleep -Seconds 2
        }
        
        # Запуск выбранного агента
        Set-Location $agentPath
        
        if ($AgentType -eq "simple") {
            Write-Host "🔵 Запуск Simple Agent (интервал: $Interval сек)..." -ForegroundColor Cyan
            Start-Process powershell -ArgumentList "-File", "simple_sender.ps1", "-IntervalSeconds", $Interval
        } else {
            Write-Host "🔵 Запуск Enhanced Agent (интервал: $Interval сек, уровень: $CollectionLevel)..." -ForegroundColor Cyan
            Start-Process powershell -ArgumentList "-File", "enhanced_agent.ps1", "-IntervalSeconds", $Interval, "-CollectionLevel", $CollectionLevel
        }
        
        Start-Sleep -Seconds 3
        
        # Проверка запуска
        $newAgents = Get-AgentProcesses
        if ($newAgents.Count -gt 0) {
            Write-Host "✅ Агент успешно запущен!" -ForegroundColor Green
        } else {
            Write-Host "❌ Ошибка запуска агента" -ForegroundColor Red
        }
    }
    
    "stop" {
        Write-Host "`n🛑 Остановка всех агентов..." -ForegroundColor Red
        $agents = Get-AgentProcesses
        
        if ($agents.Count -eq 0) {
            Write-Host "✅ Агенты не запущены" -ForegroundColor Green
        } else {
            foreach ($agent in $agents) {
                try {
                    Stop-Process -Id $agent.PID -Force
                    Write-Host "✅ Остановлен $($agent.Name) (PID: $($agent.PID))" -ForegroundColor Green
                } catch {
                    Write-Host "❌ Ошибка остановки $($agent.Name): $_" -ForegroundColor Red
                }
            }
        }
    }
    
    "test" {
        Write-Host "`n🧪 Тестовая отправка данных..." -ForegroundColor Cyan
        
        if (-not (Test-ApiStatus)) {
            Write-Host "❌ API недоступен" -ForegroundColor Red
            return
        }
        
        try {
            $testEvent = @{
                event_id = [System.Guid]::NewGuid().ToString()
                event_type = "test_event"
                timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                host = @{
                    host_id = $env:COMPUTERNAME
                    hostname = $env:COMPUTERNAME
                    ip_address = "127.0.0.1"
                    os = "Windows"
                    architecture = "x64"
                }
                agent = @{
                    agent_id = "test-agent"
                    agent_version = "1.0.0"
                }
                data = @{
                    test = $true
                    message = "Test event from agent manager"
                    timestamp = (Get-Date).ToString()
                }
            }
            
            $jsonBody = $testEvent | ConvertTo-Json -Depth 5
            $response = Invoke-RestMethod -Uri "$apiUrl/ingest" -Method POST -ContentType "application/json" -Body $jsonBody
            
            Write-Host "✅ Тестовое событие отправлено!" -ForegroundColor Green
            Write-Host "📝 Event ID: $($response.event_id)" -ForegroundColor White
            
        } catch {
            Write-Host "❌ Ошибка отправки тестового события: $_" -ForegroundColor Red
        }
    }
    
    "config" {
        Write-Host "`n⚙️ Конфигурация агентов:" -ForegroundColor Cyan
        Write-Host "📍 Путь к агентам: $agentPath" -ForegroundColor White
        Write-Host "🌐 API URL: $apiUrl" -ForegroundColor White
        Write-Host "⏱️ Интервал по умолчанию: $Interval сек" -ForegroundColor White
        Write-Host "📊 Уровень сбора: $CollectionLevel" -ForegroundColor White
        
        Write-Host "`n📋 Доступные команды:" -ForegroundColor White
        Write-Host "  .\manage-agent.ps1 -Action start -AgentType simple" -ForegroundColor Gray
        Write-Host "  .\manage-agent.ps1 -Action start -AgentType enhanced -CollectionLevel detailed" -ForegroundColor Gray
        Write-Host "  .\manage-agent.ps1 -Action stop" -ForegroundColor Gray
        Write-Host "  .\manage-agent.ps1 -Action status" -ForegroundColor Gray
        Write-Host "  .\manage-agent.ps1 -Action test" -ForegroundColor Gray
    }
}
