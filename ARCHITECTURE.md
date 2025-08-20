# System Architecture

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Windows       │    │   Windows       │    │   Windows       │
│   Agent         │    │   Agent         │    │   Agent         │
│                 │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ HTTPS/TLS           │ HTTPS/TLS           │ HTTPS/TLS
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │      Ingest API          │
                    │    (FastAPI Service)     │
                    │                          │
                    │  • JSON Validation       │
                    │  • Rate Limiting         │
                    │  • Authentication        │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │    Message Broker        │
                    │   (Redis Streams)        │
                    └────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼──────┐    ┌────────────▼─────┐    ┌─────────────▼─────┐
│  OpenSearch  │    │   Processing     │    │    Analysis       │
│   Storage    │    │   Pipeline       │    │   Services        │
│              │    │                  │    │                   │
│ • Indexing   │    │ • Enrichment     │    │ • EDR/AV          │
│ • Search     │    │ • Correlation    │    │ • Vuln Scanner    │
│ • Analytics  │    │ • Filtering      │    │ • ML Detection    │
└──────────────┘    └──────────────────┘    └───────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │     Response Engine      │
                    │    (SOAR Playbooks)      │
                    │                          │
                    │  • Incident Response     │
                    │  • Automated Actions     │
                    │  • Approval Workflows    │
                    └────────────┬─────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │    Web Dashboard         │
                    │   (React Interface)      │
                    │                          │
                    │  • Incident Management   │
                    │  • Playbook Execution    │
                    │  • Analytics & Reports   │
                    └──────────────────────────┘
```

## Core Components

### Data Ingestion Layer
- **Windows Agent**: Collects endpoint telemetry (processes, files, network, authentication)
- **Ingest API**: Validates, authenticates, and routes incoming events
- **Message Broker**: Redis Streams for event distribution and queuing

### Storage & Search Layer  
- **OpenSearch**: Primary data store with full-text search and analytics
- **Redis**: Caching, session storage, and real-time data processing
- **File Storage**: Quarantine area and artifact storage

### Analysis & Detection Layer
- **EDR/AV Integration**: ClamAV + YARA for malware detection
- **Vulnerability Scanner**: OpenVAS for security assessments
- **Threat Intelligence**: MISP platform for IOC management
- **ML Module**: Behavioral analytics and anomaly detection

### Response & Orchestration Layer
- **SOAR Engine**: Playbook execution and incident response automation
- **Notification System**: Alert routing and escalation
- **Approval Workflow**: Human-in-the-loop decision making

### Presentation Layer
- **Web Dashboard**: React-based operator interface
- **API Gateway**: Unified API access point
- **Reporting Engine**: Automated report generation

## Integration Points

### API Endpoints

| Service | Endpoint | Method | Purpose |
|---------|----------|--------|---------|
| Ingest API | `/ingest` | POST | Accept telemetry events |
| Ingest API | `/health` | GET | Service health check |
| EDR Service | `/scan/file` | POST | Submit file for analysis |
| EDR Service | `/scan/hash` | POST | Check hash reputation |
| Vuln Scanner | `/scans` | POST | Initiate vulnerability scan |
| SOAR Engine | `/execute` | POST | Execute playbook |
| TIP Service | `/ioc/search` | GET | Query threat intelligence |
| ML Service | `/analyze` | POST | Behavioral analysis |

### Message Streams

| Stream Name | Publisher | Consumer | Event Types |
|-------------|-----------|----------|-------------|
| `telemetry-events` | Ingest API | All analyzers | All event types |
| `alerts` | Analysis services | SOAR, Dashboard | Alert events |
| `threats` | EDR, ML | TIP, SOAR | Threat indicators |
| `responses` | SOAR Engine | Dashboard | Response actions |

### Data Flows

1. **Event Collection**: Agent → Ingest API → Redis → OpenSearch
2. **Threat Detection**: OpenSearch → EDR/ML → Alert Generation
3. **Intelligence Enrichment**: Events → TIP → Enhanced Events
4. **Incident Response**: Alerts → SOAR → Automated Actions
5. **Monitoring**: All Services → Dashboard → Operator Interface

## Security Architecture

### Network Security
- TLS 1.2+ for all communications
- Mutual TLS for agent authentication
- Network segmentation between components
- API rate limiting and DDoS protection

### Data Security
- Encryption at rest (OpenSearch, Redis)
- Field-level encryption for sensitive data
- Secure key management and rotation
- Data retention and purging policies

### Access Control
- Role-based access control (RBAC)
- API key authentication for services
- Session management for web interface
- Audit logging for all access

### Operational Security
- Container security scanning
- Secrets management (external vault)
- Regular security updates
- Penetration testing protocols

## Scalability Design

### Horizontal Scaling
- Multiple ingest API instances behind load balancer
- OpenSearch cluster with multiple nodes
- Redis clustering for high availability
- Containerized microservices architecture

### Performance Optimization
- Event batching and bulk operations
- Asynchronous processing pipelines
- Caching strategies for frequent queries
- Database sharding and indexing

### Monitoring & Observability
- Prometheus metrics collection
- Centralized logging with structured formats
- Distributed tracing for request flows
- Health checks and alerting

## Deployment Architecture

### Development Environment
- Docker Compose for local development
- Single-node configurations
- Mock external services
- Simplified security settings

### Production Environment
- Kubernetes orchestration
- Multi-node clusters
- External service dependencies
- Full security hardening
- Backup and disaster recovery
