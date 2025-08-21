# Enhanced UECP Agent - Full System Data Collection
# Полнофункциональный агент с расширенным сбором данных

param(
    [int]$IntervalSeconds = 60,
    [string]$ApiUrl = "http://localhost:8000/ingest",
    [string]$AgentId = "$env:COMPUTERNAME-enhanced",
    [string]$CollectionLevel = "detailed"  # minimal, standard, detailed
)

# Конфигурация агента
$agentConfig = @{
    agent_id = $AgentId
    agent_version = "1.0.0"
    collection_level = $CollectionLevel
    api_url = $ApiUrl
    interval = $IntervalSeconds
}

Write-Host "🚀 Запуск Enhanced UECP Agent..." -ForegroundColor Green
Write-Host "📊 Конфигурация:" -ForegroundColor Cyan
Write-Host "  • Agent ID: $($agentConfig.agent_id)" -ForegroundColor Gray
Write-Host "  • Интервал: $($agentConfig.interval) сек" -ForegroundColor Gray
Write-Host "  • Уровень сбора: $($agentConfig.collection_level)" -ForegroundColor Gray
Write-Host "  • API URL: $($agentConfig.api_url)" -ForegroundColor Gray

# Функция сбора базовой системной информации
function Get-SystemInfo {
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $cs = Get-CimInstance Win32_ComputerSystem
        $proc = Get-CimInstance Win32_Processor | Select-Object -First 1
        
        return @{
            hostname = $env:COMPUTERNAME
            domain = $env:USERDOMAIN
            username = $env:USERNAME
            os_name = $os.Caption
            os_version = $os.Version
            os_build = $os.BuildNumber
            architecture = $os.OSArchitecture
            total_memory_gb = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
            cpu_name = $proc.Name
            cpu_cores = $proc.NumberOfCores
            cpu_threads = $proc.NumberOfLogicalProcessors
            last_boot = $os.LastBootUpTime
            timezone = (Get-TimeZone).Id
        }
    } catch {
        Write-Host "⚠️ Ошибка сбора системной информации: $_" -ForegroundColor Yellow
        return @{ error = $_.Message }
    }
}

# Функция сбора информации о процессах
function Get-ProcessInfo {
    param([string]$level = "standard")
    
    try {
        $processes = Get-Process | Where-Object { $_.ProcessName -ne "Idle" }
        
        if ($level -eq "minimal") {
            return @{
                total_processes = $processes.Count
                unique_processes = ($processes | Group-Object ProcessName).Count
            }
        } elseif ($level -eq "standard") {
            $topProcesses = $processes | Sort-Object WorkingSet64 -Descending | Select-Object -First 10
            return @{
                total_processes = $processes.Count
                unique_processes = ($processes | Group-Object ProcessName).Count
                top_memory_processes = $topProcesses | ForEach-Object {
                    @{
                        name = $_.ProcessName
                        pid = $_.Id
                        memory_mb = [math]::Round($_.WorkingSet64 / 1MB, 2)
                        cpu_time = $_.TotalProcessorTime.TotalSeconds
                    }
                }
            }
        } else {  # detailed
            return @{
                total_processes = $processes.Count
                unique_processes = ($processes | Group-Object ProcessName).Count
                all_processes = $processes | ForEach-Object {
                    @{
                        name = $_.ProcessName
                        pid = $_.Id
                        memory_mb = [math]::Round($_.WorkingSet64 / 1MB, 2)
                        cpu_time = $_.TotalProcessorTime.TotalSeconds
                        start_time = $_.StartTime
                        path = $_.Path
                        company = $_.Company
                    }
                }
            }
        }
    } catch {
        Write-Host "⚠️ Ошибка сбора информации о процессах: $_" -ForegroundColor Yellow
        return @{ error = $_.Message }
    }
}

# Функция сбора сетевой информации
function Get-NetworkInfo {
    param([string]$level = "standard")
    
    try {
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
        $connections = Get-NetTCPConnection | Where-Object { $_.State -eq "Established" }
        
        if ($level -eq "minimal") {
            return @{
                active_adapters = $adapters.Count
                active_connections = $connections.Count
            }
        } else {
            return @{
                active_adapters = $adapters.Count
                active_connections = $connections.Count
                adapters = $adapters | ForEach-Object {
                    @{
                        name = $_.Name
                        interface_description = $_.InterfaceDescription
                        link_speed = $_.LinkSpeed
                        mac_address = $_.MacAddress
                    }
                }
                ip_addresses = (Get-NetIPAddress | Where-Object { $_.AddressFamily -eq "IPv4" -and $_.IPAddress -ne "127.0.0.1" }).IPAddress
                connections_by_state = $connections | Group-Object State | ForEach-Object {
                    @{ state = $_.Name; count = $_.Count }
                }
            }
        }
    } catch {
        Write-Host "⚠️ Ошибка сбора сетевой информации: $_" -ForegroundColor Yellow
        return @{ error = $_.Message }
    }
}

# Функция сбора информации о безопасности
function Get-SecurityInfo {
    try {
        $antivirus = Get-CimInstance -Namespace "root\SecurityCenter2" -ClassName "AntiVirusProduct" -ErrorAction SilentlyContinue
        $firewall = Get-NetFirewallProfile
        
        return @{
            windows_defender = @{
                enabled = (Get-MpComputerStatus -ErrorAction SilentlyContinue).AntivirusEnabled
                real_time_protection = (Get-MpComputerStatus -ErrorAction SilentlyContinue).RealTimeProtectionEnabled
                signature_age = (Get-MpComputerStatus -ErrorAction SilentlyContinue).AntispywareSignatureAge
            }
            antivirus_products = $antivirus | ForEach-Object {
                @{
                    name = $_.displayName
                    state = $_.productState
                }
            }
            firewall_profiles = $firewall | ForEach-Object {
                @{
                    profile = $_.Name
                    enabled = $_.Enabled
                    default_inbound_action = $_.DefaultInboundAction
                    default_outbound_action = $_.DefaultOutboundAction
                }
            }
            uac_enabled = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -Name "EnableLUA" -ErrorAction SilentlyContinue).EnableLUA -eq 1
        }
    } catch {
        Write-Host "⚠️ Ошибка сбора информации о безопасности: $_" -ForegroundColor Yellow
        return @{ error = $_.Message }
    }
}

# Функция сбора информации о дисках
function Get-DiskInfo {
    try {
        $disks = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
        
        return @{
            disk_count = $disks.Count
            disks = $disks | ForEach-Object {
                @{
                    drive = $_.DeviceID
                    total_gb = [math]::Round($_.Size / 1GB, 2)
                    free_gb = [math]::Round($_.FreeSpace / 1GB, 2)
                    used_gb = [math]::Round(($_.Size - $_.FreeSpace) / 1GB, 2)
                    free_percent = [math]::Round(($_.FreeSpace / $_.Size) * 100, 2)
                }
            }
        }
    } catch {
        Write-Host "⚠️ Ошибка сбора информации о дисках: $_" -ForegroundColor Yellow
        return @{ error = $_.Message }
    }
}

# Функция отправки данных
function Send-EnhancedData {
    try {
        Write-Host "📊 Сбор данных..." -ForegroundColor Cyan
        
        # Базовая информация
        $systemInfo = Get-SystemInfo
        $processInfo = Get-ProcessInfo -level $CollectionLevel
        $networkInfo = Get-NetworkInfo -level $CollectionLevel
        $securityInfo = Get-SecurityInfo
        $diskInfo = Get-DiskInfo
        
        # Формирование события
        $event = @{
            event_id = [System.Guid]::NewGuid().ToString()
            event_type = "enhanced_system_telemetry"
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            collection_level = $CollectionLevel
            host = @{
                host_id = $env:COMPUTERNAME
                hostname = $systemInfo.hostname
                domain = $systemInfo.domain
                ip_address = "127.0.0.1"  # Будет обновлено из сетевой информации
                os = $systemInfo.os_name
                architecture = $systemInfo.architecture
                total_memory_gb = $systemInfo.total_memory_gb
                cpu_info = @{
                    name = $systemInfo.cpu_name
                    cores = $systemInfo.cpu_cores
                    threads = $systemInfo.cpu_threads
                }
            }
            agent = @{
                agent_id = $AgentId
                agent_version = $agentConfig.agent_version
                collection_level = $CollectionLevel
            }
            telemetry = @{
                system = $systemInfo
                processes = $processInfo
                network = $networkInfo
                security = $securityInfo
                storage = $diskInfo
                performance = @{
                    cpu_usage = (Get-Counter "\Processor(_Total)\% Processor Time" -SampleInterval 1 -MaxSamples 1).CounterSamples.CookedValue
                    memory_usage_percent = [math]::Round(((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize - (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory) / (Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize * 100, 2)
                }
            }
        }
        
        # Обновление IP адреса из сетевой информации
        if ($networkInfo.ip_addresses -and $networkInfo.ip_addresses.Count -gt 0) {
            $event.host.ip_address = $networkInfo.ip_addresses[0]
        }
        
        $jsonBody = $event | ConvertTo-Json -Depth 10
        
        Write-Host "📤 Отправка данных в API..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri $ApiUrl -Method POST -ContentType "application/json" -Body $jsonBody -TimeoutSec 30
        
        Write-Host "✅ Данные отправлены! Event ID: $($response.event_id)" -ForegroundColor Green
        Write-Host "📈 Статистика:" -ForegroundColor White
        Write-Host "  • Процессы: $($processInfo.total_processes)" -ForegroundColor Gray
        Write-Host "  • Сетевые адаптеры: $($networkInfo.active_adapters)" -ForegroundColor Gray
        Write-Host "  • Диски: $($diskInfo.disk_count)" -ForegroundColor Gray
        
        return $true
        
    } catch {
        Write-Host "❌ Ошибка отправки данных: $_" -ForegroundColor Red
        return $false
    }
}

# Проверка доступности API
Write-Host "🔍 Проверка доступности API..." -ForegroundColor Cyan
try {
    $healthCheck = Invoke-RestMethod -Uri "$($ApiUrl.Replace('/ingest', '/health'))" -TimeoutSec 10
    Write-Host "✅ API доступен" -ForegroundColor Green
} catch {
    Write-Host "⚠️ API недоступен, но агент продолжит работу" -ForegroundColor Yellow
}

# Главный цикл агента
Write-Host "`n🔄 Запуск циклического сбора данных..." -ForegroundColor Green
Write-Host "⏹️ Нажмите Ctrl+C для остановки`n" -ForegroundColor Yellow

$successCount = 0
$errorCount = 0

while ($true) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] 🚀 Цикл сбора данных..." -ForegroundColor Cyan
    
    if (Send-EnhancedData) {
        $successCount++
    } else {
        $errorCount++
    }
    
    Write-Host "📊 Статистика агента: ✅ $successCount успешно, ❌ $errorCount ошибок" -ForegroundColor White
    Write-Host "⏰ Следующий сбор через $IntervalSeconds секунд...`n" -ForegroundColor Gray
    
    Start-Sleep -Seconds $IntervalSeconds
}
