#!/usr/bin/env pwsh
# Infrastructure shutdown script for Windows PowerShell

param(
    [switch]$Help,
    [switch]$CleanAll
)

if ($Help) {
    Write-Host "Infrastructure Shutdown Script"
    Write-Host "Usage: .\down_clean.ps1 [-CleanAll] [-Help]"
    Write-Host "  -CleanAll   Remove all containers, networks, and volumes"
    exit 0
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Stopping Cybersecurity Platform Infrastructure" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Check if Docker is available
try {
    $null = docker --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not found"
    }
}
catch {
    Write-Host "Docker is not available!" -ForegroundColor Red
    exit 1
}

# Change to infrastructure directory
$originalLocation = Get-Location

try {
    Set-Location $PSScriptRoot

    # Stop services
    Write-Host "Stopping services..." -ForegroundColor Yellow
    docker-compose stop

    # Remove containers
    Write-Host "Removing containers..." -ForegroundColor Yellow
    docker-compose down --remove-orphans

    if ($CleanAll) {
        Write-Host "Performing deep cleanup..." -ForegroundColor Red
        $confirmation = Read-Host "Remove all volumes and data? (y/N)"
        if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
            docker-compose down --volumes
            docker system prune -f
            Write-Host "Deep cleanup completed" -ForegroundColor Green
        }
    }

    Write-Host "Infrastructure stopped successfully" -ForegroundColor Green
    Write-Host "To restart: .\up_clean.ps1" -ForegroundColor Yellow
}
catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    Set-Location $originalLocation
}
