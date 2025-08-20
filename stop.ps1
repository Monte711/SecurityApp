#!/usr/bin/env pwsh
# Stop script for the entire platform

Write-Host "Stopping Cybersecurity Platform" -ForegroundColor Red
Write-Host "================================" -ForegroundColor Red

# Navigate to infrastructure folder
Set-Location INFRA

# Stop services
Write-Host "Stopping all services..." -ForegroundColor Yellow
docker-compose --profile dev down

Write-Host "`nAll services stopped" -ForegroundColor Green
Write-Host "To start use: .\start.ps1" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Red
