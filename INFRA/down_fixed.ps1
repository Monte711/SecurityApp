#!/usr/bin/env pwsh
# Infrastructure shutdown script for Windows PowerShell
# Equivalent of down.sh for cross-platform compatibility

param(
    [switch]$Help,
    [switch]$CleanAll,
    [switch]$Verbose
)

if ($Help) {
    Write-Host "Infrastructure Shutdown Script"
    Write-Host "Usage: .\down_fixed.ps1 [-CleanAll] [-Verbose] [-Help]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -CleanAll   Remove all containers, networks, and volumes"
    Write-Host "  -Verbose    Show detailed output"
    Write-Host "  -Help       Show this help message"
    exit 0
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Stopping Cybersecurity Platform Infrastructure" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Check if Docker is available
try {
    docker --version 2>$null | Out-Null
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
    Write-Host "Working directory: $(Get-Location)" -ForegroundColor Blue

    if ($Verbose) {
        Write-Host "`nCurrent container status:" -ForegroundColor Yellow
        docker-compose ps
    }

    # Stop services
    Write-Host "`nStopping services..." -ForegroundColor Yellow
    docker-compose stop

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Some services may not have stopped cleanly" -ForegroundColor Yellow
    }

    # Remove containers
    Write-Host "Removing containers..." -ForegroundColor Yellow
    docker-compose down --remove-orphans

    if ($CleanAll) {
        Write-Host "`nPerforming deep cleanup..." -ForegroundColor Red
        Write-Host "This will remove ALL Docker resources related to this project!" -ForegroundColor Red
        
        $confirmation = Read-Host "Are you sure? (y/N)"
        if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
            # Remove volumes
            Write-Host "Removing volumes..." -ForegroundColor Yellow
            docker-compose down --volumes

            # Remove networks
            Write-Host "Removing networks..." -ForegroundColor Yellow
            docker network prune -f

            # Remove unused images
            Write-Host "Removing unused images..." -ForegroundColor Yellow
            docker image prune -f

            # Clean up data directory if it exists
            $dataDir = "data"
            if (Test-Path $dataDir) {
                Write-Host "Removing local data directory..." -ForegroundColor Yellow
                Remove-Item -Path $dataDir -Recurse -Force
            }

            Write-Host "✓ Deep cleanup completed" -ForegroundColor Green
        } else {
            Write-Host "Deep cleanup cancelled" -ForegroundColor Yellow
        }
    }

    # System cleanup
    Write-Host "`nCleaning up Docker system..." -ForegroundColor Yellow
    docker system prune -f

    Write-Host "`n===============================================" -ForegroundColor Cyan
    Write-Host "✓ Infrastructure stopped successfully" -ForegroundColor Green

    if ($Verbose) {
        Write-Host "`nRemaining containers:" -ForegroundColor Yellow
        docker ps -a --filter "name=infra"
        
        Write-Host "`nRemaining networks:" -ForegroundColor Yellow
        docker network ls --filter "name=infra"
    }

    Write-Host "`nTo restart infrastructure:" -ForegroundColor Cyan
    Write-Host "  .\up_fixed.ps1" -ForegroundColor White
    Write-Host "===============================================" -ForegroundColor Cyan
}
catch {
    Write-Host "`nError occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    Set-Location $originalLocation
}
