# UECP Platform Full Rebuild Script
# Performs complete rebuild of all containers with cleanup

param(
    [switch]$SkipConfirmation
)

Write-Host "UECP Platform - Full Rebuild" -ForegroundColor Red
Write-Host "============================" -ForegroundColor Red

if (-not $SkipConfirmation) {
    Write-Host "WARNING: This will remove ALL containers, images, and volumes!" -ForegroundColor Yellow
    $confirmation = Read-Host "Continue? (y/N)"
    if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
        Write-Host "Operation cancelled." -ForegroundColor Gray
        exit 0
    }
}

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

# Stop all containers
Write-Host "`nStopping all UECP containers..." -ForegroundColor Yellow
Set-Location "$scriptPath\INFRA"
docker-compose down --remove-orphans --volumes

# Stop module-specific containers
$modules = @("ingest-api", "agent\windows", "ui")
foreach ($module in $modules) {
    $modulePath = "$scriptPath\$module"
    if (Test-Path "$modulePath\docker-compose.yml") {
        Write-Host "Stopping $module containers..." -ForegroundColor Gray
        Set-Location $modulePath
        docker-compose down --remove-orphans --volumes 2>$null
    }
}

# Clean up Docker system
Write-Host "`nCleaning Docker system..." -ForegroundColor Yellow
Write-Host "Removing UECP images..." -ForegroundColor Gray
docker images --filter "reference=uecp*" --filter "reference=security*" --filter "reference=*ingest*" --filter "reference=*agent*" --filter "reference=*ui*" -q | ForEach-Object { docker rmi $_ -f 2>$null }

Write-Host "Cleaning unused Docker resources..." -ForegroundColor Gray
docker system prune -af --volumes

# Rebuild infrastructure
Write-Host "`nRebuilding core infrastructure..." -ForegroundColor Cyan
Set-Location "$scriptPath\INFRA"
docker-compose build --no-cache --parallel

# Rebuild modules
foreach ($module in $modules) {
    $modulePath = "$scriptPath\$module"
    if (Test-Path "$modulePath\docker-compose.yml") {
        Write-Host "Rebuilding $module..." -ForegroundColor Cyan
        Set-Location $modulePath
        docker-compose build --no-cache --parallel
    }
}

Write-Host "`nStarting rebuilt platform..." -ForegroundColor Green
Set-Location "$scriptPath"
& ".\start.ps1"

Write-Host "`nFull rebuild completed successfully!" -ForegroundColor Green