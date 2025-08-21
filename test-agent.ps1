# UECP Agent Connectivity Test
param(
    [string]$ApiUrl = "http://localhost:8000"
)

Write-Host "Testing UECP Agent Connectivity..." -ForegroundColor Green

# Test API availability
Write-Host "Checking API availability..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 5
    Write-Host "API is available and healthy" -ForegroundColor Green
    
    # Get current stats
    try {
        $stats = Invoke-RestMethod -Uri "$ApiUrl/stats" -TimeoutSec 5
        Write-Host "Current events in system: $($stats.total_events)" -ForegroundColor White
        Write-Host "Unique hosts: $($stats.unique_hosts)" -ForegroundColor White
    } catch {
        Write-Host "Could not retrieve statistics" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERROR: API is not available at $ApiUrl" -ForegroundColor Red
    Write-Host "Please ensure the platform is running: .\start.ps1" -ForegroundColor Yellow
    exit 1
}

# Send test event
Write-Host "`nSending test event..." -ForegroundColor Cyan

try {
    $testEvent = @{
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
            agent_id = "test-agent"
            agent_version = "1.0.0"
        }
        data = @{
            test = $true
            message = "Test event from connectivity test"
            timestamp = (Get-Date).ToString()
        }
    }
    
    $jsonBody = $testEvent | ConvertTo-Json -Depth 5
    $response = Invoke-RestMethod -Uri "$ApiUrl/ingest" -Method POST -ContentType "application/json" -Body $jsonBody
    
    Write-Host "Test event sent successfully!" -ForegroundColor Green
    Write-Host "Event ID: $($response.event_id)" -ForegroundColor White
    
} catch {
    Write-Host "ERROR sending test event: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nConnectivity test completed successfully!" -ForegroundColor Green
Write-Host "You can now:" -ForegroundColor Yellow
Write-Host "  - View events at: http://localhost:3000" -ForegroundColor Gray
Write-Host "  - Start data collection: .\start-agent.ps1" -ForegroundColor Gray
