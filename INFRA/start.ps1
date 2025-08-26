# UECP Platform Startup Script
Write-Host "Starting UECP Platform..." -ForegroundColor Green

# Check Docker
Write-Host "Checking Docker availability..." -ForegroundColor Cyan
try {
    docker version | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Navigate to infrastructure
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptPath"

# Stop existing containers
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose down --remove-orphans | Out-Null

# Start core infrastructure
Write-Host "Starting core infrastructure..." -ForegroundColor Cyan
docker-compose up -d opensearch redis opensearch_dashboards ingest_api

# Wait for services
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check OpenSearch
Write-Host "Checking OpenSearch..." -ForegroundColor Cyan
$maxAttempts = 20
for ($i = 1; $i -le $maxAttempts; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9200/_cluster/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "OpenSearch is ready" -ForegroundColor Green
            break
        }
    } catch {
        if ($i -eq $maxAttempts) {
            Write-Host "ERROR: OpenSearch failed to start" -ForegroundColor Red
            exit 1
        }
        Write-Host "Waiting for OpenSearch... (attempt $i/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 3
    }
}

# Check Ingest API
Write-Host "Checking Ingest API..." -ForegroundColor Cyan
for ($i = 1; $i -le $maxAttempts; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "Ingest API is ready" -ForegroundColor Green
            break
        }
    } catch {
        if ($i -eq $maxAttempts) {
            Write-Host "ERROR: Ingest API failed to start" -ForegroundColor Red
            exit 1
        }
        Write-Host "Waiting for Ingest API... (attempt $i/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 3
    }
}

# Start UI
Write-Host "Starting UI Dashboard..." -ForegroundColor Cyan
docker-compose --profile dev up -d ui

# Check UI
Write-Host "Checking UI Dashboard..." -ForegroundColor Cyan
for ($i = 1; $i -le 15; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "UI Dashboard is ready" -ForegroundColor Green
            break
        }
    } catch {
        if ($i -eq 15) {
            Write-Host "WARNING: UI Dashboard may not be ready" -ForegroundColor Yellow
        } else {
            Write-Host "Waiting for UI... (attempt $i/15)" -ForegroundColor Gray
            Start-Sleep -Seconds 4
        }
    }
}

Write-Host "`nUECP Platform Started Successfully!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Available Services:" -ForegroundColor White
Write-Host "  Main Dashboard:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "  API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  API Health:        http://localhost:8000/health" -ForegroundColor Cyan
Write-Host "  OpenSearch UI:     http://localhost:5601" -ForegroundColor Cyan

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Start agent:    INFRA\uecp-agent.exe" -ForegroundColor Gray
Write-Host "  2. Check status:   .\status.ps1" -ForegroundColor Gray
Write-Host "  3. Stop platform:  .\stop.ps1" -ForegroundColor Gray
