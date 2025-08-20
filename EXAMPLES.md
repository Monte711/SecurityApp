# 📖 Примеры использования Cybersecurity Platform

## 🚀 Быстрый старт

### Запуск платформы
```powershell
# Из корня проекта
.\start.ps1

# Или вручную
cd INFRA
docker-compose --profile dev up -d
```

### Остановка платформы
```powershell
# Из корня проекта
.\stop.ps1

# Или вручную
cd INFRA
.\down_clean.ps1
```

## 📡 Примеры работы с API

### 1. Проверка состояния системы
```powershell
# Health check
Invoke-WebRequest http://localhost:8000/health

# Статус всех сервисов
curl http://localhost:8000/health | ConvertFrom-Json | Format-Table
```

### 2. Отправка событий безопасности

#### Событие запуска процесса
```powershell
$processEvent = @{
    event_id = "proc-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    event_type = "process_start"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    severity = "info"
    host = @{
        host_id = $env:COMPUTERNAME
        hostname = $env:COMPUTERNAME
        domain = $env:USERDNSDOMAIN
        os_version = (Get-WmiObject Win32_OperatingSystem).Caption
        ip_addresses = @((Get-NetIPAddress -AddressFamily IPv4 | Where {$_.IPAddress -ne "127.0.0.1"}).IPAddress)
    }
    agent = @{
        agent_version = "1.0.0"
        collect_level = "standard"
    }
    process = @{
        pid = 1234
        ppid = 4567
        name = "notepad.exe"
        path = "C:\Windows\System32\notepad.exe"
        command_line = "notepad.exe document.txt"
        user = $env:USERNAME
    }
    tags = @("demo", "process", "windows")
} | ConvertTo-Json -Depth 10

$headers = @{"Content-Type"="application/json"}
Invoke-WebRequest -Uri http://localhost:8000/ingest -Method POST -Body $processEvent -Headers $headers
```

#### Событие создания файла
```powershell
$fileEvent = @{
    event_id = "file-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    event_type = "file_create"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    severity = "low"
    host = @{
        host_id = $env:COMPUTERNAME
        hostname = $env:COMPUTERNAME
        domain = $env:USERDNSDOMAIN
        os_version = (Get-WmiObject Win32_OperatingSystem).Caption
        ip_addresses = @((Get-NetIPAddress -AddressFamily IPv4).IPAddress[0])
    }
    agent = @{
        agent_version = "1.0.0"
        collect_level = "detailed"
    }
    file = @{
        path = "C:\Users\$env:USERNAME\Documents\suspicious.txt"
        name = "suspicious.txt"
        size = 1024
        created = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        modified = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    process = @{
        pid = 2468
        name = "explorer.exe"
        user = $env:USERNAME
    }
    tags = @("file_activity", "suspicious", "monitoring")
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:8000/ingest -Method POST -Body $fileEvent -Headers $headers
```

#### Событие сетевого подключения
```powershell
$networkEvent = @{
    event_id = "net-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    event_type = "network_connection"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    severity = "medium"
    host = @{
        host_id = $env:COMPUTERNAME
        hostname = $env:COMPUTERNAME
        os_version = (Get-WmiObject Win32_OperatingSystem).Caption
        ip_addresses = @("192.168.1.100")
    }
    agent = @{
        agent_version = "1.0.0"
        collect_level = "standard"
    }
    network = @{
        protocol = "TCP"
        source_ip = "192.168.1.100"
        source_port = 54321
        destination_ip = "8.8.8.8"
        destination_port = 443
        bytes_sent = 2048
        bytes_received = 4096
    }
    process = @{
        pid = 3456
        name = "chrome.exe"
        path = "C:\Program Files\Google\Chrome\Application\chrome.exe"
        user = $env:USERNAME
    }
    tags = @("network", "outbound", "https")
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:8000/ingest -Method POST -Body $networkEvent -Headers $headers
```

#### Критическое событие безопасности
```powershell
$securityEvent = @{
    event_id = "sec-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    event_type = "security_alert"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    severity = "critical"
    host = @{
        host_id = $env:COMPUTERNAME
        hostname = $env:COMPUTERNAME
        domain = $env:USERDNSDOMAIN
        os_version = (Get-WmiObject Win32_OperatingSystem).Caption
        ip_addresses = @("192.168.1.100")
    }
    agent = @{
        agent_version = "1.0.0"
        collect_level = "detailed"
    }
    raw_data = @{
        alert_type = "malware_detected"
        threat_name = "Trojan.Win32.Generic"
        detection_method = "signature"
        confidence_score = 0.95
        quarantined = $true
    }
    file = @{
        path = "C:\Temp\malicious.exe"
        name = "malicious.exe"
        size = 51200
    }
    tags = @("malware", "critical", "quarantined", "trojan")
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:8000/ingest -Method POST -Body $securityEvent -Headers $headers
```

### 3. Получение и анализ событий

#### Получение последних событий
```powershell
# Все события (последние 100)
$events = Invoke-WebRequest http://localhost:8000/events | ConvertFrom-Json
$events.events | Format-Table event_id, event_type, severity, timestamp

# События определенного типа
$processEvents = Invoke-WebRequest "http://localhost:8000/events?event_type=process_start" | ConvertFrom-Json
$processEvents.events | Select-Object event_id, @{Name="Process"; Expression={$_.process.name}}, @{Name="PID"; Expression={$_.process.pid}}

# Критические события
$criticalEvents = Invoke-WebRequest "http://localhost:8000/events?severity=critical" | ConvertFrom-Json
$criticalEvents.events | Format-Table event_id, event_type, @{Name="Host"; Expression={$_.host.hostname}}, timestamp
```

#### Получение событий конкретного хоста
```powershell
$hostEvents = Invoke-WebRequest "http://localhost:8000/events?host_id=$env:COMPUTERNAME" | ConvertFrom-Json
$hostEvents.events | Group-Object event_type | Format-Table Count, Name
```

#### Поиск событий по времени
```powershell
# События за последний час (через фильтрацию на клиенте)
$recentEvents = Invoke-WebRequest http://localhost:8000/events | ConvertFrom-Json
$oneHourAgo = (Get-Date).AddHours(-1)
$recentEvents.events | Where-Object { 
    [DateTime]::Parse($_.timestamp) -gt $oneHourAgo 
} | Format-Table event_id, event_type, timestamp
```

## 🌐 Работа с веб-интерфейсами

### UI Dashboard (http://localhost:3000)
- Основной веб-интерфейс для мониторинга
- Просмотр событий в реальном времени
- Фильтрация и поиск по событиям
- Визуализация статистики

### API Documentation (http://localhost:8000/docs)
- Interactive Swagger UI
- Тестирование API endpoints
- Просмотр схем данных
- Примеры запросов и ответов

### OpenSearch Dashboards (http://localhost:5601)
- Администрирование индексов
- Создание визуализаций
- Настройка алертов
- Экспорт данных

## 🔍 Мониторинг и отладка

### Проверка логов
```powershell
# Логи API
docker logs cybersec_ingest_api -f

# Логи UI
docker logs cybersec_ui -f

# Логи OpenSearch
docker logs cybersec_opensearch -f

# Все логи
docker-compose logs -f
```

### Проверка состояния сервисов
```powershell
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Детальная информация о контейнере
docker inspect cybersec_ingest_api
```

### Прямое подключение к OpenSearch
```powershell
# Информация о кластере
Invoke-WebRequest http://localhost:9200/_cluster/health | ConvertFrom-Json

# Список индексов
Invoke-WebRequest http://localhost:9200/_cat/indices?v

# Поиск в индексах
$searchQuery = @{
    query = @{
        match = @{
            event_type = "process_start"
        }
    }
    size = 10
} | ConvertTo-Json -Depth 5

Invoke-WebRequest -Uri "http://localhost:9200/agent-events-*/_search" -Method POST -Body $searchQuery -ContentType "application/json"
```

## 🧪 Тестирование системы

### Массовая отправка тестовых событий
```powershell
# Генерация множественных событий для тестирования
1..10 | ForEach-Object {
    $testEvent = @{
        event_id = "test-batch-$_"
        event_type = @("process_start", "file_create", "network_connection")[(Get-Random -Maximum 3)]
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        severity = @("info", "low", "medium")[(Get-Random -Maximum 3)]
        host = @{
            host_id = "test-host-$(Get-Random -Maximum 5)"
            hostname = "test-machine-$(Get-Random -Maximum 5)"
            os_version = "Windows 10"
            ip_addresses = @("192.168.1.$((Get-Random -Maximum 254) + 1)")
        }
        agent = @{
            agent_version = "1.0.0"
            collect_level = "standard"
        }
        tags = @("test", "batch", "demo")
    } | ConvertTo-Json -Depth 10
    
    Invoke-WebRequest -Uri http://localhost:8000/ingest -Method POST -Body $testEvent -Headers @{"Content-Type"="application/json"}
    Start-Sleep 0.5
}

Write-Host "✅ Отправлено 10 тестовых событий"
```

### Производительностный тест
```powershell
# Измерение времени отправки события
Measure-Command {
    $testEvent = @{
        event_id = "perf-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
        event_type = "system_info"
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        severity = "info"
        host = @{
            host_id = $env:COMPUTERNAME
            hostname = $env:COMPUTERNAME
            os_version = "Windows 10"
            ip_addresses = @("192.168.1.100")
        }
        agent = @{
            agent_version = "1.0.0"
            collect_level = "minimal"
        }
        tags = @("performance", "test")
    } | ConvertTo-Json -Depth 10
    
    Invoke-WebRequest -Uri http://localhost:8000/ingest -Method POST -Body $testEvent -Headers @{"Content-Type"="application/json"}
}
```

## 🚨 Примеры для разных сценариев безопасности

### 1. Подозрительная активность процессов
```powershell
# Сценарий: Обнаружение подозрительного процесса
$suspiciousProcess = @{
    event_id = "sus-proc-$(Get-Date -Format 'HHmmss')"
    event_type = "process_start"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    severity = "high"
    host = @{
        host_id = $env:COMPUTERNAME
        hostname = $env:COMPUTERNAME
        os_version = "Windows 10"
        ip_addresses = @("192.168.1.100")
    }
    agent = @{
        agent_version = "1.0.0"
        collect_level = "detailed"
    }
    process = @{
        pid = 6666
        ppid = 4
        name = "svchost.exe"
        path = "C:\Windows\Temp\svchost.exe"  # Подозрительное расположение
        command_line = "svchost.exe -k malware"
        user = "SYSTEM"
    }
    tags = @("suspicious", "process", "malware", "investigation")
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:8000/ingest -Method POST -Body $suspiciousProcess -Headers @{"Content-Type"="application/json"}
```

### 2. Несанкционированный доступ к файлам
```powershell
# Сценарий: Попытка доступа к конфиденциальным файлам
$unauthorizedAccess = @{
    event_id = "unauth-$(Get-Date -Format 'HHmmss')"
    event_type = "file_modify"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    severity = "critical"
    host = @{
        host_id = $env:COMPUTERNAME
        hostname = $env:COMPUTERNAME
        os_version = "Windows 10"
        ip_addresses = @("192.168.1.100")
    }
    agent = @{
        agent_version = "1.0.0"
        collect_level = "detailed"
    }
    file = @{
        path = "C:\SecretData\confidential.xlsx"
        name = "confidential.xlsx"
        size = 5242880
        modified = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    process = @{
        pid = 9999
        name = "unknown.exe"
        path = "C:\Temp\unknown.exe"
        user = "guest"
    }
    tags = @("unauthorized", "file_access", "confidential", "breach")
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:8000/ingest -Method POST -Body $unauthorizedAccess -Headers @{"Content-Type"="application/json"}
```

### 3. Подозрительная сетевая активность
```powershell
# Сценарий: Подключение к подозрительному IP
$suspiciousNetwork = @{
    event_id = "net-sus-$(Get-Date -Format 'HHmmss')"
    event_type = "network_connection"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    severity = "high"
    host = @{
        host_id = $env:COMPUTERNAME
        hostname = $env:COMPUTERNAME
        os_version = "Windows 10"
        ip_addresses = @("192.168.1.100")
    }
    agent = @{
        agent_version = "1.0.0"
        collect_level = "detailed"
    }
    network = @{
        protocol = "TCP"
        source_ip = "192.168.1.100"
        source_port = 49157
        destination_ip = "192.30.253.112"  # Подозрительный IP
        destination_port = 443
        bytes_sent = 10240
        bytes_received = 51200
    }
    process = @{
        pid = 7777
        name = "malware.exe"
        path = "C:\Users\Public\malware.exe"
        user = $env:USERNAME
    }
    tags = @("network", "suspicious", "c2", "malware")
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:8000/ingest -Method POST -Body $suspiciousNetwork -Headers @{"Content-Type"="application/json"}
```

## 📊 Анализ собранных данных

### Статистика по типам событий
```powershell
# Получение статистики по типам событий
$allEvents = Invoke-WebRequest http://localhost:8000/events?limit=1000 | ConvertFrom-Json
$allEvents.events | Group-Object event_type | Sort-Object Count -Descending | Format-Table Count, Name

# Статистика по уровням критичности
$allEvents.events | Group-Object severity | Sort-Object Count -Descending | Format-Table Count, Name

# Статистика по хостам
$allEvents.events | Group-Object {$_.host.hostname} | Sort-Object Count -Descending | Format-Table Count, Name
```

### Временной анализ
```powershell
# События по часам
$allEvents.events | ForEach-Object {
    [PSCustomObject]@{
        Hour = ([DateTime]::Parse($_.timestamp)).Hour
        EventType = $_.event_type
        Severity = $_.severity
    }
} | Group-Object Hour | Sort-Object Name | Format-Table Name, Count

# Критические события за последние 24 часа
$yesterday = (Get-Date).AddDays(-1)
$allEvents.events | Where-Object {
    $_.severity -eq "critical" -and [DateTime]::Parse($_.timestamp) -gt $yesterday
} | Format-Table event_id, event_type, timestamp
```

Этот файл содержит множество практических примеров для тестирования и использования вашей cybersecurity платформы! 🛡️
