# Простой тест нового endpoint для host_posture
$testData = @{
    event_id = "test-12345"
    event_type = "host_posture"
    "@timestamp" = "2025-08-25T16:10:00Z"
    host = @{
        hostname = "test-host"
        host_id = "test-host-id"
        os = @{
            name = "Windows 10"
            version = "10.0"
        }
        uptime_seconds = 3600
    }
    agent = @{
        agent_id = "test-agent"
        agent_version = "0.1.0"
    }
    inventory = @{
        processes = @()
        autoruns = @{
            startup_programs = @()
        }
    }
    security = @{
        modules = @()
    }
    findings = @()
    metadata = @{
        collector = "test"
        schema_version = "1.0"
    }
}

$json = $testData | ConvertTo-Json -Depth 5

try {
    Write-Host "Отправка тестовых данных на /ingest/host-posture..."
    $result = Invoke-RestMethod -Uri "http://localhost:8000/ingest/host-posture" -Method POST -Body $json -ContentType "application/json"
    Write-Host "Успешно! Ответ:" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Ошибка: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Детали ошибки: $responseBody"
    }
}
