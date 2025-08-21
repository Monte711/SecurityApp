# Send Test Data to UECP Platform
Write-Host "Sending test data to UECP Platform..." -ForegroundColor Green

# Check API
$apiUrl = "http://localhost:8000"
try {
    $health = Invoke-RestMethod -Uri "$apiUrl/health" -TimeoutSec 5
    Write-Host "API is available" -ForegroundColor Green
} catch {
    Write-Host "ERROR: API not available. Start platform with .\start.ps1" -ForegroundColor Red
    exit 1
}

# Get current stats
try {
    $statsBefore = Invoke-RestMethod -Uri "$apiUrl/stats" -TimeoutSec 5
    Write-Host "Events before test: $($statsBefore.total_events)" -ForegroundColor White
} catch {
    Write-Host "Could not get initial stats" -ForegroundColor Yellow
}

# Test data scenarios
$testEvents = @(
    @{
        event_type = "process_start"
        description = "Process start event"
        data = @{
            process = @{
                pid = 1234
                name = "notepad.exe"
                path = "C:\Windows\System32\notepad.exe"
                user = $env:USERNAME
                command_line = "notepad.exe test.txt"
            }
        }
    },
    @{
        event_type = "file_create"
        description = "File creation event"
        data = @{
            file = @{
                path = "C:\temp\test_file.txt"
                size_bytes = 1024
                created_by = $env:USERNAME
                file_type = "text"
            }
        }
    },
    @{
        event_type = "network_connection"
        description = "Network connection event"
        data = @{
            network = @{
                local_ip = "192.168.1.100"
                local_port = 12345
                remote_ip = "8.8.8.8"
                remote_port = 443
                protocol = "TCP"
                direction = "outbound"
            }
        }
    },
    @{
        event_type = "system_info"
        description = "System information event"
        data = @{
            system = @{
                cpu_usage = 25.5
                memory_usage = 67.3
                disk_usage = 45.2
                uptime_hours = 48.5
            }
        }
    }
)

Write-Host "`nSending $($testEvents.Count) test events..." -ForegroundColor Cyan

$sentCount = 0
foreach ($testEvent in $testEvents) {
    try {
        $event = @{
            event_id = [System.Guid]::NewGuid().ToString()
            event_type = $testEvent.event_type
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            host = @{
                host_id = $env:COMPUTERNAME
                hostname = $env:COMPUTERNAME
                ip_address = "127.0.0.1"
                os = "Windows"
                architecture = "x64"
            }
            agent = @{
                agent_id = "test-data-sender"
                agent_version = "1.0.0"
            }
            data = $testEvent.data
        }
        
        $jsonBody = $event | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$apiUrl/ingest" -Method POST -ContentType "application/json" -Body $jsonBody
        
        Write-Host "  Sent: $($testEvent.description) - ID: $($response.event_id)" -ForegroundColor Green
        $sentCount++
        
    } catch {
        Write-Host "  Failed: $($testEvent.description) - Error: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 500
}

# Get final stats
Start-Sleep -Seconds 2
try {
    $statsAfter = Invoke-RestMethod -Uri "$apiUrl/stats" -TimeoutSec 5
    Write-Host "`nEvents after test: $($statsAfter.total_events)" -ForegroundColor White
    $newEvents = $statsAfter.total_events - $statsBefore.total_events
    Write-Host "New events added: $newEvents" -ForegroundColor Cyan
} catch {
    Write-Host "Could not get final stats" -ForegroundColor Yellow
}

Write-Host "`nTest data sending completed!" -ForegroundColor Green
Write-Host "Successfully sent: $sentCount/$($testEvents.Count) events" -ForegroundColor White
Write-Host "View events at: http://localhost:3000" -ForegroundColor Cyan
