# Start UECP Agent Script
Write-Host "Starting UECP Data Collection Agent..." -ForegroundColor Green

# Check if platform is running
Write-Host "Checking platform availability..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "Platform is running" -ForegroundColor Green
    }
} catch {
    Write-Host "WARNING: Platform may not be running" -ForegroundColor Yellow
    Write-Host "Start platform first with: .\start.ps1" -ForegroundColor Gray
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 0
    }
}

# Agent configuration
$defaultInterval = 30
$intervalInput = Read-Host "Collection interval in seconds (default: $defaultInterval)"
$interval = if ($intervalInput) { [int]$intervalInput } else { $defaultInterval }

Write-Host "`nStarting agent with $interval second interval..." -ForegroundColor Green
Write-Host "Agent will run in a new window" -ForegroundColor Yellow
Write-Host "Close the agent window to stop data collection" -ForegroundColor Gray

# Start agent in new window
Start-Process powershell -ArgumentList "-NoExit", "-File", "agent.ps1", "-IntervalSeconds", $interval

Write-Host "`nAgent started successfully!" -ForegroundColor Green
Write-Host "Check .\status.ps1 to see agent status" -ForegroundColor Gray
