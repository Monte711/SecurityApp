#!/usr/bin/env pwsh
# Quick start script for the entire platform

Write-Host "Unified Enterprise Cybersecurity Platform" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Navigate to infrastructure folder
Set-Location INFRA

# Start all services including UI
Write-Host "Starting all services..." -ForegroundColor Green
docker-compose --profile dev up -d

Start-Sleep 3

# Check status
Write-Host "`nService Status:" -ForegroundColor Yellow
docker-compose ps

Write-Host "`nAvailable Interfaces:" -ForegroundColor Cyan
Write-Host "- UI Dashboard:     http://localhost:3000" -ForegroundColor White
Write-Host "- API Docs:         http://localhost:8000/docs" -ForegroundColor White
Write-Host "- Health Check:     http://localhost:8000/health" -ForegroundColor White
Write-Host "- OpenSearch:       http://localhost:9200" -ForegroundColor White
Write-Host "- Dashboards:       http://localhost:5601" -ForegroundColor White

Write-Host "`nTo stop use: .\stop.ps1" -ForegroundColor Red
Write-Host "==========================================" -ForegroundColor Cyan
