# Infrastructure Deployment Guide

## Quick Start

Deploy the complete cybersecurity platform infrastructure with one command:

```bash
docker-compose -f ../docker/infrastructure.yml up -d
```

## Services Overview

| Service | Port | Purpose | UI/Access |
|---------|------|---------|-----------|
| **OpenSearch** | 9200 | Data storage and search | HTTP API |
| **OpenSearch Dashboards** | 5601 | Data visualization | http://localhost:5601 |
| **Redis** | 6379 | Message queues | Redis CLI |
| **MISP** | 8080, 8443 | Threat Intelligence | http://localhost:8080 |
| **OpenVAS** | 9392 | Vulnerability Scanner | GSA Protocol |
| **ClamAV** | 3310 | Antivirus Engine | TCP Socket |

## Environment Variables

Create `.env` file in project root:

```bash
# OpenSearch Configuration
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin

# Redis Configuration  
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# MISP Configuration
MISP_URL=http://localhost:8080
MISP_API_KEY=your_misp_api_key_here
MISP_VERIFY_SSL=false

# OpenVAS Configuration
OPENVAS_HOST=localhost
OPENVAS_PORT=9392
OPENVAS_USERNAME=admin
OPENVAS_PASSWORD=admin

# ClamAV Configuration
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# Application Configuration
INGEST_API_PORT=8000
INGEST_API_KEY=your_secure_api_key_here
LOG_LEVEL=INFO
```

## Deployment Commands

### Start All Services
```bash
docker-compose -f ../docker/infrastructure.yml up -d
```

### Check Service Status
```bash
docker-compose -f ../docker/infrastructure.yml ps
```

### View Logs
```bash
# All services
docker-compose -f ../docker/infrastructure.yml logs

# Specific service
docker-compose -f ../docker/infrastructure.yml logs opensearch
docker-compose -f ../docker/infrastructure.yml logs redis
docker-compose -f ../docker/infrastructure.yml logs misp
```

### Stop Services
```bash
docker-compose -f ../docker/infrastructure.yml down
```

### Reset Everything (⚠️ Deletes Data)
```bash
docker-compose -f ../docker/infrastructure.yml down -v
docker-compose -f ../docker/infrastructure.yml up -d
```

## Service Verification

### OpenSearch
```bash
# Health check
curl http://localhost:9200/_cluster/health

# Create test index
curl -X PUT http://localhost:9200/test-index

# Expected: {"acknowledged":true}
```

### Redis
```bash
# Test connection
docker exec cybersec-redis redis-cli ping

# Expected: PONG
```

### MISP
```bash
# Check web interface
curl -I http://localhost:8080

# Expected: HTTP/200 OK
```

### OpenVAS
```bash
# Check if scanner is running
docker logs cybersec-openvas | grep "scanner"
```

### ClamAV
```bash
# Test daemon
docker exec cybersec-clamav clamdscan --version
```

## Troubleshooting

### OpenSearch Won't Start
- Check memory: OpenSearch needs at least 512MB RAM
- Verify vm.max_map_count: `sysctl vm.max_map_count`
- Should be >= 262144

### MISP Setup Issues  
- Default credentials: admin/admin
- First login requires password change
- Database initialization takes 2-3 minutes

### ClamAV Database Updates
```bash
# Manual update
docker exec cybersec-clamav freshclam
```

### Port Conflicts
If ports are in use, modify `../docker/infrastructure.yml`:
```yaml
ports:
  - "9201:9200"  # Change OpenSearch port
  - "5602:5601"  # Change Dashboards port
```

## Monitoring & Maintenance

### Log Rotation
```bash
# Clean up old logs
docker system prune -f
```

### Data Backup
```bash
# Backup volumes
docker run --rm -v cybersec_opensearch-data:/data -v $(pwd):/backup alpine tar czf /backup/opensearch-backup.tar.gz /data
```

### Resource Usage
```bash
# Monitor container resources
docker stats cybersec-opensearch cybersec-redis cybersec-misp
```

## Development vs Production

**Development (Current Setup):**
- Disabled security plugins
- Default passwords
- Single-node configurations
- Local storage only

**Production Requirements:**
- Enable TLS/SSL
- Strong authentication
- Multi-node clusters
- External storage/backups
- Load balancing
- Network segmentation

## Next Steps

1. ✅ Start infrastructure: `docker-compose -f ../docker/infrastructure.yml up -d`
2. ✅ Verify all services are running
3. ✅ Configure environment variables
4. → Proceed to module development (see `../HOW_TO_CONTINUE.md`)
