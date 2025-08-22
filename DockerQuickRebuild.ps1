# UECP Platform Quick Rebuild Script
# Rebuilds only application containers, preserves data

param(
    [string[]]$Modules = @(),
    [switch]$SkipTests
)

Write-Host "UECP Platform - Quick Rebuild" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

# Check Docker
Write-Host "`nChecking Docker availability..." -ForegroundColor Cyan
try {
    docker version | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$allModules = @("ingest-api", "agent/windows", "ui")

# Determine which modules to rebuild
if ($Modules.Count -eq 0) {
    $Modules = $allModules
    Write-Host "Rebuilding all modules: $($Modules -join ', ')" -ForegroundColor Cyan
} else {
    Write-Host "Rebuilding specified modules: $($Modules -join ', ')" -ForegroundColor Cyan
}

# Stop only application containers (preserve data containers)
Write-Host "`nStopping application containers..." -ForegroundColor Yellow
Set-Location "$scriptPath\INFRA"
docker-compose stop ingest_api ui

foreach ($module in $Modules) {
    $modulePath = "$scriptPath\$module"
    if (Test-Path "$modulePath\docker-compose.yml") {
        Write-Host "Stopping $module containers..." -ForegroundColor Gray
        Set-Location $modulePath
        docker-compose stop 2>$null
    }
}

# Run tests before rebuild (optional)
if (-not $SkipTests) {
    Write-Host "`nRunning tests..." -ForegroundColor Cyan
    foreach ($module in $Modules) {
        $modulePath = "$scriptPath\$module"
        if (Test-Path "$modulePath\tests") {
            Write-Host "Testing $module..." -ForegroundColor Gray
            Set-Location $modulePath
            if (Test-Path "requirements-dev.txt") {
                # Python module
                python -m pytest tests/ --tb=short -q
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "WARNING: Tests failed for $module" -ForegroundColor Yellow
                }
            } elseif (Test-Path "package.json") {
                # Node.js module
                npm test 2>$null
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "WARNING: Tests failed for $module" -ForegroundColor Yellow
                }
            }
        }
    }
}

# Rebuild specified modules
Write-Host "`nRebuilding modules..." -ForegroundColor Cyan
foreach ($module in $Modules) {
    Write-Host "Rebuilding $module..." -ForegroundColor Green
    
    if ($module -eq "ingest-api" -or $module -eq "ui") {
        # Infrastructure modules
        Set-Location "$scriptPath\INFRA"
        docker-compose build --no-cache $($module.Replace("-", "_"))
    } else {
        # Standalone modules
        $modulePath = "$scriptPath\$module"
        if (Test-Path "$modulePath\docker-compose.yml") {
            Set-Location $modulePath
            docker-compose build --no-cache --parallel
        }
    }
}

# Restart services
Write-Host "`nRestarting services..." -ForegroundColor Green
Set-Location "$scriptPath\INFRA"

# Start infrastructure services
docker-compose up -d opensearch redis opensearch_dashboards

# Start rebuilt application services
foreach ($module in $Modules) {
    if ($module -eq "ingest-api") {
        docker-compose up -d ingest_api
    } elseif ($module -eq "ui") {
        docker-compose --profile dev up -d ui
    } else {
        $modulePath = "$scriptPath\$module"
        if (Test-Path "$modulePath\docker-compose.yml") {
            Set-Location $modulePath
            docker-compose up -d
        }
    }
}

# Health checks
Write-Host "`nPerforming health checks..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

if ($Modules -contains "ingest-api") {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Ingest API is healthy" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠ Ingest API health check failed" -ForegroundColor Yellow
    }
}

if ($Modules -contains "ui") {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ UI Dashboard is healthy" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠ UI Dashboard health check failed" -ForegroundColor Yellow
    }
}

Write-Host "`nQuick rebuild completed!" -ForegroundColor Green
Write-Host "Use '.\status.ps1' to check all services" -ForegroundColor Gray

# Usage examples
Write-Host "`nUsage examples:" -ForegroundColor Yellow
Write-Host "  .\rebuild-quick.ps1                    # Rebuild all modules" -ForegroundColor Gray
Write-Host "  .\rebuild-quick.ps1 -Modules ui        # Rebuild only UI" -ForegroundColor Gray
Write-Host "  .\rebuild-quick.ps1 -SkipTests         # Skip tests" -ForegroundColor Gray