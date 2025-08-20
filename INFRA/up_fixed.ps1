#!/usr/bin/env pwsh
# Infrastructure startup script for Windows PowerShell
# Equivalent of up.sh for cross-platform compatibility

param(
    [switch]$Help,
    [switch]$Verbose
)

if ($Help) {
    Write-Host "Infrastructure Startup Script"
    Write-Host "Usage: .\up_fixed.ps1 [-Verbose] [-Help]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Verbose    Show detailed output"
    Write-Host "  -Help       Show this help message"
    exit 0
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Starting Cybersecurity Platform Infrastructure" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Check if Docker is available
try {
    $dockerVersion = docker --version 2>$null
    if (-not $dockerVersion) {
        throw "Docker not found"
    }
    Write-Host "Docker found: $dockerVersion" -ForegroundColor Green
}
catch {
    Write-Host "Docker is not installed or not available!" -ForegroundColor Red
    Write-Host "Docker is required for infrastructure testing" -ForegroundColor Yellow
    Write-Host "Download Docker Desktop from https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Check if docker-compose is available
try {
    $composeVersion = docker-compose --version 2>$null
    if (-not $composeVersion) {
        throw "Docker Compose not found"
    }
    Write-Host "Docker Compose found: $composeVersion" -ForegroundColor Green
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
    Write-Host "`nStopping existing containers..." -ForegroundColor Yellow
    docker-compose down --remove-orphans 2>$null

    # Clean up old containers and networks
    Write-Host "Cleaning up old resources..." -ForegroundColor Yellow
    docker system prune -f 2>$null

    # Create necessary directories for volumes
    $dataDir = "data"
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
        Write-Host "Created data directory" -ForegroundColor Green
    }

    # Start the infrastructure
    Write-Host "`nStarting infrastructure services..." -ForegroundColor Cyan
    docker-compose up -d

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start infrastructure"
    }

    # Wait for services to be ready
    Write-Host "`nWaiting for services to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # Check service health
    Write-Host "`nChecking service health:" -ForegroundColor Cyan

    # Function to check if a service is healthy
    function Test-ServiceHealth {
        param($serviceName, $url, $timeout = 30)
        
        Write-Host "Checking $serviceName..." -NoNewline
        
        $elapsed = 0
        $interval = 2
        
        while ($elapsed -lt $timeout) {
            try {
                $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing 2>$null
                if ($response.StatusCode -eq 200) {
                    Write-Host " ✓ Healthy" -ForegroundColor Green
                    return $true
                }
            }
            catch {
                # Service not ready yet
            }
            
            Start-Sleep -Seconds $interval
            $elapsed += $interval
            Write-Host "." -NoNewline
        }
        
        Write-Host " ✗ Not responding" -ForegroundColor Red
        return $false
    }

    # Check each service
    $services = @(
        @{ Name = "OpenSearch"; Url = "http://localhost:9200/_cluster/health" },
        @{ Name = "Redis"; Url = "http://localhost:8080/health" },  # Through API
        @{ Name = "Ingest API"; Url = "http://localhost:8080/health" },
        @{ Name = "UI"; Url = "http://localhost:3000" },
        @{ Name = "Dashboards"; Url = "http://localhost:5601" }
    )

    $allHealthy = $true
    foreach ($service in $services) {
        if (-not (Test-ServiceHealth -serviceName $service.Name -url $service.Url)) {
            $allHealthy = $false
        }
    }

    # Display status
    Write-Host "`n===============================================" -ForegroundColor Cyan
    if ($allHealthy) {
        Write-Host "✓ All services are healthy!" -ForegroundColor Green
    } else {
        Write-Host "⚠ Some services may not be ready yet" -ForegroundColor Yellow
    }

    Write-Host "`nService URLs:" -ForegroundColor Cyan
    Write-Host "- UI Dashboard:     http://localhost:3000" -ForegroundColor White
    Write-Host "- Ingest API:       http://localhost:8080" -ForegroundColor White
    Write-Host "- OpenSearch:       http://localhost:9200" -ForegroundColor White
    Write-Host "- Dashboards:       http://localhost:5601" -ForegroundColor White
    Write-Host "- Redis:            localhost:6379" -ForegroundColor White

    Write-Host "`nUseful commands:" -ForegroundColor Cyan
    Write-Host "- View logs:        docker-compose logs -f" -ForegroundColor White
    Write-Host "- Stop services:    .\down_fixed.ps1" -ForegroundColor White
    Write-Host "- Restart:          .\down_fixed.ps1; .\up_fixed.ps1" -ForegroundColor White

    if ($Verbose) {
        Write-Host "`nContainer status:" -ForegroundColor Cyan
        docker-compose ps
    }

    Write-Host "===============================================" -ForegroundColor Cyan
}
catch {
    Write-Host "`nError occurred: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose logs" -ForegroundColor Yellow
    exit 1
}
finally {
    Set-Location $originalLocation
}
