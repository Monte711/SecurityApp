#!/usr/bin/env pwsh
# Infrastructure startup script for Windows PowerShell

param(
    [switch]$Help,
    [switch]$Verbose
)

if ($Help) {
    Write-Host "Infrastructure Startup Script"
    Write-Host "Usage: .\up_clean.ps1 [-Verbose] [-Help]"
    exit 0
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Starting Cybersecurity Platform Infrastructure" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Check if Docker is available
try {
    $null = docker --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not found"
    }
    Write-Host "Docker is available" -ForegroundColor Green
}
catch {
    Write-Host "Docker is not installed or not available!" -ForegroundColor Red
    Write-Host "Docker is required for infrastructure testing" -ForegroundColor Yellow
    Write-Host "Download Docker Desktop from https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Check if docker-compose is available
try {
    $null = docker-compose --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose not found"
    }
    Write-Host "Docker Compose is available" -ForegroundColor Green
}
catch {
    Write-Host "Docker Compose is not installed!" -ForegroundColor Red
    exit 1
}

# Change to infrastructure directory
$originalLocation = Get-Location

try {
    Set-Location $PSScriptRoot
    Write-Host "Working directory: $(Get-Location)" -ForegroundColor Blue

    # Stop any existing containers
    Write-Host "Stopping existing containers..." -ForegroundColor Yellow
    docker-compose down --remove-orphans 2>$null

    # Start the infrastructure
    Write-Host "Starting infrastructure services..." -ForegroundColor Cyan
    docker-compose up -d

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start infrastructure"
    }

    # Wait for services to be ready
    Write-Host "Waiting for services to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15

    # Simple health check
    Write-Host "Checking service status:" -ForegroundColor Cyan
    
    Write-Host "Container status:" -ForegroundColor Yellow
    docker-compose ps

    Write-Host "`nService URLs:" -ForegroundColor Cyan
    Write-Host "- UI Dashboard:     http://localhost:3000" -ForegroundColor White
    Write-Host "- Ingest API:       http://localhost:8080" -ForegroundColor White
    Write-Host "- OpenSearch:       http://localhost:9200" -ForegroundColor White
    Write-Host "- Dashboards:       http://localhost:5601" -ForegroundColor White
    Write-Host "- Redis:            localhost:6379" -ForegroundColor White

    Write-Host "`nTo stop services: .\down_clean.ps1" -ForegroundColor Yellow
    Write-Host "===============================================" -ForegroundColor Cyan
}
catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose logs" -ForegroundColor Yellow
    exit 1
}
finally {
    Set-Location $originalLocation
}
