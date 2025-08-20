# Infrastructure Services

This directory contains Docker configurations for the core infrastructure services.

## Services Included

### OpenSearch & Dashboards
- **OpenSearch**: Primary data storage and search engine
- **OpenSearch Dashboards**: Data visualization and exploration
- Ports: 9200 (OpenSearch), 5601 (Dashboards)

### Redis
- Message queues and caching
- Persistent storage with append-only file
- Port: 6379

### MISP (Threat Intelligence)
- Threat intelligence platform
- Includes MySQL database
- Ports: 8080 (HTTP), 8443 (HTTPS)

### OpenVAS (Vulnerability Scanning)
- Greenbone vulnerability scanner
- Community feeds enabled
- Port: 9392

### ClamAV (Antivirus)
- Open source antivirus engine
- Automatic signature updates
- Port: 3310

## Usage

Start all infrastructure services:
```bash
docker-compose -f infrastructure.yml up -d
```

Start specific services:
```bash
docker-compose -f infrastructure.yml up -d opensearch redis
```

Check service status:
```bash
docker-compose -f infrastructure.yml ps
```

Stop all services:
```bash
docker-compose -f infrastructure.yml down
```

## Configuration

Services are configured for development use. For production:
- Enable security plugins
- Configure proper authentication
- Set up TLS certificates
- Adjust resource limits
- Configure backups

## Data Persistence

All services use named volumes for data persistence:
- `opensearch-data`: Search indices and data
- `redis-data`: Redis persistence
- `misp-data`: MISP application data
- `misp-db-data`: MySQL database
- `openvas-data`: Vulnerability definitions
- `clamav-data`: Antivirus signatures

## Network

All services communicate through the `cybersec-network` bridge network.
