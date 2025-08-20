# Project Overview

## Mission Statement

Develop a modular, locally deployable cybersecurity platform for enterprise clients (Russian market focus), consisting of independent modules: Windows agent, ingest API, EDR/AV integration, vulnerability scanner (OpenVAS), TIP (MISP), SOAR (playbooks), UI, and ML module (behavioral analytics). Built exclusively on open-source components for personal development and local testing environments.

## Key Development Principles

### Modularity
Each block (module) must be completely autonomous with clear inputs/outputs, container/script for local execution, tests, and README. Modules should not require other blocks for correct testing.

### Repeatability
Everything runs locally via Docker/docker-compose or virtual environments for agents.

### OSS-Only
Use only open-source components/libraries (MIT/Apache/BSD compatible licenses), avoiding proprietary dependencies.

### Windows-First
Primary agent and PoC oriented for Windows endpoints. Linux (Astra) support planned for later phases.

### Privacy & Data Security
- Flexible collection level configuration (minimal/standard/detailed)
- Option to disable binary uploads
- TLS encryption for communications (optional in PoC)

### Human-in-the-Loop
Product focus on monitoring/detection; automatic actions (quarantine) require operator confirmation by default (configurable).

### Testing & CI
Each module must contain unit and integration tests (pytest), local execution instructions, and commit examples.

## Target Clients

- Russian enterprise organizations
- Corporate security teams
- Compliance and audit departments
- Security researchers and analysts
- Educational institutions

## MVP Module List

### Priority 1 (Core Platform)
1. **ingest-api** - Telemetry ingestion, JSON Schema validation, OpenSearch storage, Redis Stream publishing, idempotency by event_id
2. **agent-windows** - Process, file events, auth events, basic network info collection, JSON formatting, POST to /ingest
3. **edr-av-integration** - ClamAV + YARA integration, local hash checking, configurable hash upload

### Priority 2 (Detection & Response)
4. **vuln-scanner** - OpenVAS in Docker (PoC) + export results in vuln_scan_result format
5. **tip-misp** - MISP instance for IOC import/export, endpoint for IOC retrieval in ingest pipeline
6. **soar-engine** - Basic playbook executor (YAML/Ansible compatible) with two base playbooks: notify operator, quarantine host

### Priority 3 (Interface & Analytics)
7. **ui-dashboard** - Simple web panel (React) for incident/alert viewing and manual playbook execution
8. **ml-module** - Autonomous service for anomaly detection (IsolationForest/Autoencoder), REST API, trained on collected telemetry

### Future Phases
- **NDR/network sensors** - Deferred to later phases (not MVP)
- **Advanced behavioral analytics**
- **Compliance reporting modules**

## Technical Stack

- **Languages:** Python 3.11 (backend/agents PoC), Go for high-performance services
- **Backend:** FastAPI (ingest, ML serving), uvicorn
- **Queue:** Redis Streams (PoC), future Kafka migration
- **Storage/Search:** OpenSearch (license compatibility vs Elasticsearch)
- **TIP:** MISP (Docker image)
- **Vulnerability:** OpenVAS (Greenbone) Docker image
- **EDR/AV:** ClamAV + YARA rule sets
- **ML:** scikit-learn/PyTorch/TensorFlow (simple models first)
- **UI:** React (Create React App or Vite) - minimalist PoC
- **Tests:** pytest, pytest-asyncio, httpx for async tests
- **Config:** dotenv + env vars, production config via Vault later

## Success Criteria

- All modules run independently with Docker
- Complete test coverage for each component
- Functional PoC demonstration capability
- Clear documentation for deployment and operation
- Secure by default configuration
- Extensible architecture for future enhancements
