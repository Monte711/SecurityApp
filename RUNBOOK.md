# Operational Runbook

## Test Event Generation

### Generate Sample Process Event
```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secure_api_key_here_32_chars" \
  -d '{
    "event_id": "test-proc-001",
    "timestamp": "2025-08-20T12:00:00Z",
    "event_type": "process",
    "source_host": "workstation-01",
    "source_agent": "agent-001",
    "severity": "medium",
    "process_id": 1234,
    "parent_process_id": 567,
    "process_name": "notepad.exe",
    "command_line": "notepad.exe C:\\temp\\document.txt",
    "user": "john.doe",
    "file_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }'
```

### Generate Sample File Event
```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secure_api_key_here_32_chars" \
  -d '{
    "event_id": "test-file-001", 
    "timestamp": "2025-08-20T12:01:00Z",
    "event_type": "file",
    "source_host": "workstation-01",
    "source_agent": "agent-001",
    "severity": "low",
    "file_path": "C:\\temp\\document.txt",
    "file_hash": "d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2d2",
    "file_size": 1024,
    "operation": "create",
    "process_id": 1234
  }'
```

### Generate Sample Alert
```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secure_api_key_here_32_chars" \
  -d '{
    "event_id": "test-alert-001",
    "timestamp": "2025-08-20T12:02:00Z", 
    "event_type": "alert",
    "source_host": "security-server",
    "source_agent": "detection-engine",
    "severity": "high",
    "alert_name": "Suspicious Process Execution",
    "description": "Detected potentially malicious process execution pattern",
    "rule_id": "RULE_001",
    "related_events": ["test-proc-001", "test-file-001"],
    "recommended_actions": ["Investigate process", "Check file integrity", "Notify SOC"]
  }'
```

## OpenSearch Data Verification

### Check Indices
```bash
# List all indices
curl http://localhost:9200/_cat/indices?v

# Expected to see: cybersec-telemetry-YYYY.MM.DD
```

### Search for Events
```bash
# Search recent events
curl -X GET http://localhost:9200/cybersec-telemetry-*/_search?pretty \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "range": {
        "timestamp": {
          "gte": "now-1h"
        }
      }
    },
    "sort": [{"timestamp": {"order": "desc"}}],
    "size": 10
  }'
```

### Search by Event Type
```bash
# Find process events
curl -X GET http://localhost:9200/cybersec-telemetry-*/_search?pretty \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "term": {
        "event_type": "process"
      }
    }
  }'
```

### Search by Severity
```bash
# Find high severity events
curl -X GET http://localhost:9200/cybersec-telemetry-*/_search?pretty \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "term": {
        "severity": "high"
      }
    }
  }'
```

## OpenSearch Dashboards

### Access Dashboard
1. Open http://localhost:5601 in browser
2. Navigate to "Discover" section
3. Create index pattern: `cybersec-telemetry-*`
4. Set time field: `timestamp`

### Create Visualizations
1. **Event Timeline**: Line chart of events over time
2. **Severity Distribution**: Pie chart of severity levels  
3. **Top Hosts**: Bar chart of most active hosts
4. **Event Types**: Donut chart of event type distribution

## Manual Playbook Execution

### Notify Operator Playbook
```bash
curl -X POST http://localhost:8001/soar/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_soar_api_key" \
  -d '{
    "playbook_id": "notify_operator",
    "parameters": {
      "alert_id": "test-alert-001",
      "message": "High severity alert requires attention",
      "priority": "high"
    },
    "triggered_by": "manual_operator"
  }'
```

### Quarantine Host Playbook
```bash
curl -X POST http://localhost:8001/soar/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_soar_api_key" \
  -d '{
    "playbook_id": "quarantine_host",
    "target_host": "workstation-01",
    "parameters": {
      "reason": "Suspected malware infection",
      "duration": "24h"
    },
    "approval_required": true,
    "triggered_by": "manual_operator"
  }'
```

## Incident Response Workflow

### 1. Alert Detection
- Monitor OpenSearch Dashboards for new alerts
- Check severity and event correlation
- Review related events and timeline

### 2. Initial Assessment
```bash
# Get alert details
curl -X GET http://localhost:9200/cybersec-telemetry-*/_search \
  -d '{"query": {"term": {"event_id": "ALERT_ID_HERE"}}}'

# Check related events
curl -X GET http://localhost:9200/cybersec-telemetry-*/_search \
  -d '{"query": {"terms": {"event_id": ["EVENT1", "EVENT2"]}}}'
```

### 3. Threat Validation
```bash
# Check file hash reputation
curl -X POST http://localhost:8002/edr/scan/hash \
  -d '{"hash": "SHA256_HASH_HERE"}'

# Query threat intelligence
curl -X GET http://localhost:8080/misp/attributes/search \
  -H "Authorization: your_misp_api_key" \
  -d '{"value": "INDICATOR_VALUE"}'
```

### 4. Response Actions
```bash
# Execute containment playbook
curl -X POST http://localhost:8001/soar/execute \
  -d '{"playbook_id": "contain_threat", "target_host": "HOST"}'

# Notify security team
curl -X POST http://localhost:8001/soar/execute \
  -d '{"playbook_id": "notify_operator", "parameters": {"urgency": "high"}}'
```

## Health Monitoring

### Service Health Checks
```bash
# Ingest API
curl http://localhost:8000/health

# SOAR Engine  
curl http://localhost:8001/health

# EDR Integration
curl http://localhost:8002/health

# Expected: {"status": "healthy", "timestamp": "..."}
```

### Infrastructure Status
```bash
# OpenSearch cluster health
curl http://localhost:9200/_cluster/health

# Redis ping
docker exec cybersec-redis redis-cli ping

# Check all containers
docker-compose -f docker/infrastructure.yml ps
```

### Log Analysis
```bash
# Check application logs
docker-compose -f docker/infrastructure.yml logs ingest-api
docker-compose -f docker/infrastructure.yml logs soar-engine

# Check for errors
docker-compose -f docker/infrastructure.yml logs | grep ERROR
```

## Troubleshooting Common Issues

### Events Not Appearing in OpenSearch
1. Check ingest API logs: `docker logs cybersec-ingest-api`
2. Verify OpenSearch connectivity: `curl http://localhost:9200/_cluster/health`
3. Check index creation: `curl http://localhost:9200/_cat/indices`

### Playbook Execution Failures
1. Check SOAR engine logs: `docker logs cybersec-soar-engine`
2. Verify playbook syntax: Review YAML configuration
3. Check approval status: Manual approval may be required

### Missing Threat Intelligence
1. Verify MISP connectivity: `curl http://localhost:8080`
2. Check API key configuration
3. Review feed import status in MISP interface

## Emergency Procedures

### Complete System Restart
```bash
# Stop all services
docker-compose -f docker/infrastructure.yml down

# Clean up (⚠️ deletes data)
docker-compose -f docker/infrastructure.yml down -v

# Restart everything
docker-compose -f docker/infrastructure.yml up -d

# Wait 2-3 minutes for full initialization
```

### Data Recovery
```bash
# List available backups
ls -la ARTIFACTS/backups/

# Restore from snapshot
./EXPORT_SNAPSHOT.sh restore backup_file.zip
```
