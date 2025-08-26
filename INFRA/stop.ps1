# UECP Platform Stop Script
Write-Host "Stopping UECP Platform..." -ForegroundColor Red

# Navigate to infrastructure
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptPath"

# Stop all containers
Write-Host "Stopping all containers..." -ForegroundColor Yellow
docker-compose --profile dev down --remove-orphans

# Check remaining containers
Write-Host "`nChecking for remaining containers..." -ForegroundColor Cyan
$containers = docker ps -a --filter "name=cybersec" --format "table {{.Names}}\t{{.Status}}"
if ($containers) {
    Write-Host $containers -ForegroundColor Gray
} else {
    Write-Host "All containers stopped successfully" -ForegroundColor Green
}

Write-Host "`nUECP Platform Stopped" -ForegroundColor Green
Write-Host "To start again: .\start.ps1" -ForegroundColor Gray
