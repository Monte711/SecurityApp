# UECP - Unified Enterprise Cybersecurity Platform

## 🚀 Quick Start (4 Simple Steps)

### 1. Start Platform
```powershell
.\start.ps1
```

### 2. Check Status
```powershell
.\status.ps1
```

### 3. Send Test Data
```powershell
.\test-data.ps1
```

### 4. View Dashboard
Open: http://localhost:3000

## � Essential Files Only

This project now contains only the essential files you need:

### 🎯 Main Management Scripts
- **`start.ps1`** - Start the entire platform
- **`stop.ps1`** - Stop all services  
- **`status.ps1`** - Check system status
- **`test-data.ps1`** - Send test events
- **`test-agent.ps1`** - Test connectivity

### 🤖 Agent Scripts  
- **`agent.ps1`** - Full-featured data collection agent
- **`start-agent.ps1`** - Start agent in new window
- **`agent/windows/simple_sender.ps1`** - Basic agent (alternative)

### 🐳 Infrastructure
- **`INFRA/docker-compose.yml`** - All service definitions
- **`ingest-api/`** - FastAPI backend
- **`ui/`** - React frontend

## 🌐 Web Interfaces

| Service | URL | Purpose |
|---------|-----|---------|
| **Main Dashboard** | http://localhost:3000 | View events and data |
| **API Docs** | http://localhost:8000/docs | API documentation |
| **API Health** | http://localhost:8000/health | Service status |
| **OpenSearch** | http://localhost:5601 | Data administration |

## � Common Workflows

### Complete Test Cycle
```powershell
# 1. Start everything
.\start.ps1

# 2. Send test data  
.\test-data.ps1

# 3. Check results
.\status.ps1

# 4. View in browser
# Open http://localhost:3000

# 5. Stop when done
.\stop.ps1
```

### Start Data Collection
```powershell
# Interactive agent setup
.\start-agent.ps1

# Or direct agent start
.\agent.ps1

# Or simple agent
cd agent\windows
.\simple_sender.ps1
```

### Verify Everything Works
```powershell
.\test-agent.ps1  # Test API connectivity
.\test-data.ps1   # Send sample events
.\status.ps1      # Check all services
```

## 🛠️ Troubleshooting

### Platform Won't Start
1. Check Docker is running: `docker version`
2. Free up ports: 3000, 5601, 6379, 8000, 9200
3. Restart Docker Desktop

### No Data in Dashboard
1. Run `.\test-data.ps1` to send sample events
2. Check API: http://localhost:8000/stats
3. Verify agent is running: `.\status.ps1`

### Agent Connection Issues
1. Ensure platform is running: `.\status.ps1`
2. Test connectivity: `.\test-agent.ps1`
3. Check firewall/antivirus settings

## 📊 What Data is Collected

The agents collect:
- **System Info**: OS, memory, CPU, uptime
- **Processes**: Running processes, memory usage
- **Network**: Active connections, network adapters  
- **Storage**: Disk usage and free space
- **Events**: Process starts, file operations, network connections

## � Security Notes

- All services run locally (localhost only)
- No external network access required
- Data stays on your machine
- No authentication for development/testing

## � Tips

- **Dashboard updates every 30 seconds** - wait a moment to see new events
- **Agent runs in separate window** - close window to stop collection
- **Multiple agents can run** - each gets unique ID
- **Test data includes different event types** - processes, files, network

---

**Need help?** 
- Run `.\status.ps1` to see current state
- Check http://localhost:8000/docs for API details
- All scripts show progress and error messages
