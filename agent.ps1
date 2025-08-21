# UECP Data Collection Agent
param(
    [int]$IntervalSeconds = 60,
    [string]$ApiUrl = "http://localhost:8000/ingest",
    [string]$AgentId = "$env:COMPUTERNAME-agent"
)

Write-Host "Starting UECP Data Collection Agent..." -ForegroundColor Green
Write-Host "Agent ID: $AgentId" -ForegroundColor Cyan
Write-Host "Collection interval: $IntervalSeconds seconds" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl" -ForegroundColor Cyan

# Test API connectivity
Write-Host "`nTesting API connectivity..." -ForegroundColor Yellow
try {
    $healthUrl = $ApiUrl.Replace('/ingest', '/health')
    $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 10
    Write-Host "API connection successful" -ForegroundColor Green
} catch {
    Write-Host "WARNING: API not available. Agent will continue and retry..." -ForegroundColor Yellow
}

# Data collection function
function Collect-SystemData {
    try {
        # System information
        $os = Get-CimInstance Win32_OperatingSystem
        $cs = Get-CimInstance Win32_ComputerSystem
        
        # Process information
        $processes = Get-Process | Where-Object { $_.ProcessName -ne "Idle" }
        $topProcesses = $processes | Sort-Object WorkingSet64 -Descending | Select-Object -First 5
        
        # Network information
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
        $connections = Get-NetTCPConnection | Where-Object { $_.State -eq "Established" }
        
        # Disk information
        $disks = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
        
        return @{
            system = @{
                hostname = $env:COMPUTERNAME
                domain = $env:USERDOMAIN
                os_name = $os.Caption
                os_version = $os.Version
                total_memory_gb = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
                uptime_hours = [math]::Round(((Get-Date) - $os.LastBootUpTime).TotalHours, 2)
            }
            processes = @{
                total_count = $processes.Count
                unique_names = ($processes | Group-Object ProcessName).Count
                top_memory = $topProcesses | ForEach-Object {
                    @{
                        name = $_.ProcessName
                        pid = $_.Id
                        memory_mb = [math]::Round($_.WorkingSet64 / 1MB, 2)
                    }
                }
            }
            network = @{
                active_adapters = $adapters.Count
                established_connections = $connections.Count
                adapter_names = $adapters.Name
            }
            storage = @{
                disks = $disks | ForEach-Object {
                    @{
                        drive = $_.DeviceID
                        total_gb = [math]::Round($_.Size / 1GB, 2)
                        free_gb = [math]::Round($_.FreeSpace / 1GB, 2)
                        free_percent = [math]::Round(($_.FreeSpace / $_.Size) * 100, 2)
                    }
                }
            }
        }
    } catch {
        Write-Host "Warning: Error collecting some system data: $_" -ForegroundColor Yellow
        return @{ error = $_.Message }
    }
}

# Data sending function
function Send-CollectedData {
    try {
        Write-Host "Collecting system data..." -ForegroundColor Cyan
        $systemData = Collect-SystemData
        
        # Create event
        $event = @{
            event_id = [System.Guid]::NewGuid().ToString()
            event_type = "system_info"
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            host = @{
                host_id = $env:COMPUTERNAME
                hostname = $systemData.system.hostname
                domain = $systemData.system.domain
                ip_address = "127.0.0.1"
                os = $systemData.system.os_name
                architecture = "x64"
            }
            agent = @{
                agent_id = $AgentId
                agent_version = "1.0.0"
            }
            data = $systemData
        }
        
        $jsonBody = $event | ConvertTo-Json -Depth 10
        
        Write-Host "Sending data to API..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri $ApiUrl -Method POST -ContentType "application/json" -Body $jsonBody -TimeoutSec 30
        
        Write-Host "Data sent successfully! Event ID: $($response.event_id)" -ForegroundColor Green
        Write-Host "Summary: $($systemData.processes.total_count) processes, $($systemData.network.active_adapters) network adapters, $($systemData.storage.disks.Count) disks" -ForegroundColor White
        
        return $true
        
    } catch {
        Write-Host "Error sending data: $_" -ForegroundColor Red
        return $false
    }
}

# Main collection loop
Write-Host "`nStarting data collection loop..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the agent" -ForegroundColor Yellow

$successCount = 0
$errorCount = 0
$startTime = Get-Date

while ($true) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "`n[$timestamp] Starting collection cycle..." -ForegroundColor Cyan
    
    if (Send-CollectedData) {
        $successCount++
    } else {
        $errorCount++
    }
    
    $runtime = [DateTime]::Now - $startTime
    Write-Host "Agent statistics: $successCount successful, $errorCount errors (running for $($runtime.ToString('hh\:mm\:ss')))" -ForegroundColor White
    Write-Host "Next collection in $IntervalSeconds seconds..." -ForegroundColor Gray
    
    Start-Sleep -Seconds $IntervalSeconds
}
