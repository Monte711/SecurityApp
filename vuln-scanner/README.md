# Vulnerability Scanner

OpenVAS-based vulnerability assessment module.

## Overview

Automated vulnerability scanning using OpenVAS (Greenbone) with integration into the cybersecurity platform. Provides scheduled scans, result processing, and risk assessment.

## Features

- **OpenVAS Integration**: Full Greenbone vulnerability scanner
- **Scheduled Scanning**: Automated periodic assessments
- **Target Management**: IP ranges, hostnames, and network discovery
- **Report Generation**: Multiple output formats (XML, JSON, PDF)
- **Risk Prioritization**: CVSS scoring and business impact assessment
- **Compliance Mapping**: Standards alignment (NIST, ISO 27001, etc.)

## Scan Types

### Discovery Scan
- Network topology mapping
- Service enumeration
- Operating system detection

### Vulnerability Assessment
- CVE identification
- Configuration auditing
- Patch level analysis

### Compliance Scan
- Policy compliance checking
- Configuration benchmarks
- Regulatory requirements

## API Endpoints

### POST /scans
Create new vulnerability scan.

### GET /scans/{scan_id}
Get scan status and results.

### GET /reports/{scan_id}
Download scan report.

### POST /targets
Add scan targets.

## Configuration

```yaml
openvas:
  host: "openvas"
  port: 9392
  username: "admin"
  password: "admin"

scanning:
  max_concurrent: 3
  default_profile: "Full and fast"
  schedule_enabled: true

reporting:
  formats: ["json", "xml", "pdf"]
  retention_days: 90

integration:
  ingest_url: "http://ingest-api:8000/ingest"
  send_results: true
```

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run scanner service
python -m app.main

# Run tests
pytest tests/

# Docker deployment
docker-compose up --build
```

## Scan Profiles

Predefined scan configurations:
- **Discovery**: Network mapping only
- **Basic**: Common vulnerabilities
- **Full and Fast**: Comprehensive quick scan
- **Full and Deep**: Thorough assessment
- **Custom**: User-defined parameters

## Integration

Results automatically sent to:
- Ingest API for centralized storage
- MISP for threat intelligence correlation
- SOAR for automated response

## TODO
- [ ] Custom vulnerability checks
- [ ] Asset inventory integration
- [ ] Continuous monitoring mode
- [ ] False positive management
- [ ] Advanced reporting dashboards
