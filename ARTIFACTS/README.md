# Unified Enterprise Cybersecurity Platform

A modular, open-source cybersecurity platform for enterprise environments, designed for local development and proof-of-concept deployments.

## Architecture Overview

This platform consists of independent, containerized modules that work together to provide comprehensive cybersecurity monitoring and response capabilities:

### Core Modules

1. **ingest-api** - Central telemetry ingestion service
   - FastAPI-based REST API
   - JSON Schema validation
   - OpenSearch storage
   - Redis Stream publishing

2. **agent-windows** - Windows endpoint agent
   - Process monitoring
   - File system events
   - Authentication events
   - Network activity collection

3. **edr-av-integration** - Endpoint Detection & Response
   - ClamAV antivirus integration
   - YARA rule engine
   - Hash-based file analysis

4. **vuln-scanner** - Vulnerability scanning
   - OpenVAS integration
   - Automated security assessments
   - Results ingestion pipeline

5. **tip-misp** - Threat Intelligence Platform
   - MISP integration
   - IOC management
   - Threat feed processing

6. **soar-engine** - Security Orchestration
   - Playbook execution
   - Incident response automation
   - Operator approval workflows

7. **ui-dashboard** - Web interface
   - React-based dashboard
   - Incident visualization
   - Manual playbook triggers

8. **ml-module** - Behavioral analytics
   - Anomaly detection
   - Machine learning models
   - Behavioral pattern analysis

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js (for UI development)

### Development Setup

1. Clone and navigate to the project:
```bash
cd c:\Users\PC\Desktop\test
```

2. Start core infrastructure:
```bash
docker-compose -f docker/infrastructure.yml up -d
```

3. Each module can be developed independently:
```bash
cd ingest-api
docker-compose up --build
```

## Module Development

Each module follows these standards:
- Autonomous operation with mocked dependencies
- Comprehensive test coverage (pytest)
- Docker containerization
- Environment-based configuration
- API documentation (OpenAPI/Swagger)

## Security & Privacy

- TLS encryption for all communications
- Configurable data collection levels
- No proprietary dependencies (OSS only)
- Local deployment focused
- Operator approval required for automated actions

## Technology Stack

- **Languages**: Python 3.11, JavaScript/TypeScript
- **Frameworks**: FastAPI, React
- **Storage**: OpenSearch, Redis
- **Security**: ClamAV, YARA, MISP
- **Containerization**: Docker, Docker Compose
- **Testing**: pytest, Jest
- **ML**: scikit-learn, PyTorch

## License

This project uses only open-source components with MIT/Apache/BSD compatible licenses.
