# Unified Enterprise Cybersecurity Platform

This workspace contains a modular cybersecurity platform with the following components:

## Project Structure
- `ingest-api/` - Telemetry ingestion service (FastAPI)
- `agent/windows/` - Windows endpoint agent
- `ui/` - React-based web interface
- `shared/` - Common utilities and schemas
- `INFRA/` - Docker infrastructure configurations
- Core management scripts (start.ps1, stop.ps1, status.ps1, etc.)

## Development Guidelines
- Each module is autonomous with its own tests and README
- Use Python 3.11 with type hints, black formatting, flake8 linting
- All services containerized with Docker
- OpenSearch for data storage, Redis for queues
- TLS encryption for agent communications
- Configurable data collection levels (minimal/standard/detailed)

## Getting Started
1. Each module has its own docker-compose.yml for local development
2. Run tests with `pytest` in each module directory
3. Use `.env.example` files for configuration templates

✅ Project structure created and copilot-instructions.md configured
