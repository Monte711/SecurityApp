# UECP Platform Quick Start Script
Write-Host "Starting UECP Platform..." -ForegroundColor Green

# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Cyan
try {
    docker version | Out-Null
    Write-Host "Docker is ready" -ForegroundColor Green
} catch {
    Write-Host "Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Navigate to infrastructure directory
Set-Location "c:\Users\PC\Desktop\test\INFRA"

# Stop existing containers
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose down --remove-orphans | Out-Null

# Start infrastructure
Write-Host "Starting infrastructure..." -ForegroundColor Cyan
docker-compose up -d opensearch redis opensearch_dashboards ingest_api

# Wait for services
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check services
Write-Host "Checking service status..." -ForegroundColor Cyan
$services = @(
    @{Name="OpenSearch"; URL="http://localhost:9200/_cluster/health"},
    @{Name="Ingest API"; URL="http://localhost:8000/health"}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.URL -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "$($service.Name) is ready" -ForegroundColor Green
        }
    } catch {
        Write-Host "$($service.Name) is not ready" -ForegroundColor Yellow
    }
}

# Start UI
Write-Host "Starting UI..." -ForegroundColor Cyan
docker-compose --profile dev up -d ui

Write-Host "`nUECP Platform Started!" -ForegroundColor Green
Write-Host "Services:" -ForegroundColor White
Write-Host "  OpenSearch:      http://localhost:9200" -ForegroundColor Cyan
Write-Host "  OpenSearch UI:   http://localhost:5601" -ForegroundColor Cyan
Write-Host "  Ingest API:      http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Dashboard UI:    http://localhost:3000" -ForegroundColor Cyan

Write-Host "`nTo start agent:" -ForegroundColor Yellow
Write-Host "  .\manage-agent.ps1 -Action start" -ForegroundColor Gray
Write-Host "`nTo stop platform:" -ForegroundColor Red
Write-Host "  .\stop-all.ps1" -ForegroundColor Gray
