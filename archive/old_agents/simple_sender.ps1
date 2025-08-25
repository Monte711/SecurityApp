# Simple UECP Agent - Basic Data Collection
param([int]$IntervalSeconds = 60)

$apiUrl = "http://localhost:8000/ingest"
$agentId = "simple-agent-$env:COMPUTERNAME"
$agentVersion = "1.0.0"

Write-Host "Starting Simple UECP Agent..." -ForegroundColor Green
Write-Host "Agent ID: $agentId" -ForegroundColor Cyan
Write-Host "Collection interval: $IntervalSeconds seconds" -ForegroundColor Cyan

function Send-SimpleData {
    try {
        $event = @{
            event_id = [System.Guid]::NewGuid().ToString()
            event_type = "system_info"
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            host = @{
                host_id = $env:COMPUTERNAME
                hostname = $env:COMPUTERNAME
                ip_address = "127.0.0.1"
                os = "Windows"
                architecture = "x64"
            }
            agent = @{
                agent_id = $agentId
                agent_version = $agentVersion
            }
            data = @{
                process_count = (Get-Process).Count
                timestamp = (Get-Date).ToString()
                uptime_hours = [math]::Round(((Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime).TotalHours, 2)
            }
        }
        
        $jsonBody = $event | ConvertTo-Json -Depth 5
        Write-Host "Sending data to API..." -ForegroundColor Yellow
        
        $response = Invoke-RestMethod -Uri $apiUrl -Method POST -ContentType "application/json" -Body $jsonBody
        Write-Host "Success! Event ID: $($response.event_id)" -ForegroundColor Green
        
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

Write-Host "Starting data collection loop..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

while ($true) {
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "`n[$timestamp] Collecting and sending data..." -ForegroundColor Cyan
    
    Send-SimpleData
    
    Write-Host "Next collection in $IntervalSeconds seconds..." -ForegroundColor Gray
    Start-Sleep -Seconds $IntervalSeconds
}
