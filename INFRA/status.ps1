# UECP Platform Status Check
Write-Host "UECP Platform Status" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green

# Check Docker containers
Write-Host "`nDocker Containers:" -ForegroundColor Cyan
try {
    $containers = docker ps --filter "name=cybersec" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Out-String
    if ($containers.Trim()) {
        Write-Host $containers -ForegroundColor White
    } else {
        Write-Host "No UECP containers running" -ForegroundColor Red
        Write-Host "Run agent\windows\uecp-agent.exe to start the platform" -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "Docker not available" -ForegroundColor Red
    exit 1
}

# Check API Services
Write-Host "Service Health:" -ForegroundColor Cyan
$services = @(
    @{Name="OpenSearch"; URL="http://localhost:9200/_cluster/health"},
    @{Name="OpenSearch UI"; URL="http://localhost:5601"},
    @{Name="Ingest API"; URL="http://localhost:8000/health"},
    @{Name="Dashboard UI"; URL="http://localhost:3000"}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.URL -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            Write-Host "  $($service.Name): Available" -ForegroundColor Green
        }
    } catch {
        Write-Host "  $($service.Name): Not Available" -ForegroundColor Red
    }
}

# Check API Stats
Write-Host "`nAPI Statistics:" -ForegroundColor Cyan
try {
    $stats = Invoke-RestMethod -Uri "http://localhost:8000/stats" -TimeoutSec 5
    Write-Host "  Total Events: $($stats.total_events)" -ForegroundColor White
    Write-Host "  Unique Hosts: $($stats.unique_hosts)" -ForegroundColor White
    Write-Host "  Event Types: $($stats.event_types.Count)" -ForegroundColor White
} catch {
    Write-Host "  API Stats not available" -ForegroundColor Red
}

# Check Agent Processes
Write-Host "`nAgent Processes:" -ForegroundColor Cyan
$agentProcesses = Get-WmiObject Win32_Process | Where-Object { 
    $_.CommandLine -like "*agent.ps1*" -or
    $_.ProcessName -like "*uecp-agent*"
}

if ($agentProcesses) {
    foreach ($proc in $agentProcesses) {
        $agentType = if ($proc.CommandLine -like "*agent.ps1*") { "PowerShell Agent" } 
                    else { "Go Agent" }
        $startTime = [System.Management.ManagementDateTimeConverter]::ToDateTime($proc.CreationDate)
        $runtime = [DateTime]::Now - $startTime
        Write-Host "  $agentType (PID: $($proc.ProcessId)) - Running for $($runtime.ToString('hh\:mm\:ss'))" -ForegroundColor Green
    }
} else {
    Write-Host "  No agents running" -ForegroundColor Yellow
    Write-Host "  Start agent with: agent\windows\uecp-agent.exe" -ForegroundColor Gray
}

Write-Host "`nManagement Commands:" -ForegroundColor White
Write-Host "  .\start.ps1         - Start platform" -ForegroundColor Gray
Write-Host "  .\stop.ps1          - Stop platform" -ForegroundColor Gray
Write-Host "  agent\windows\uecp-agent.exe   - Start data collection" -ForegroundColor Gray

Write-Host "`nDashboard URLs:" -ForegroundColor White
Write-Host "  http://localhost:3000 - Main Dashboard" -ForegroundColor Cyan
Write-Host "  http://localhost:8000/docs - API Documentation" -ForegroundColor Cyan
