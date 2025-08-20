# Developer Onboarding Checklist

Follow these steps to continue development of the cybersecurity platform.

## Step 1: Environment Setup
```bash
# Verify Git repository status
git status
git log --oneline -5

# Ensure you're in the project root
pwd
# Should show: .../test
```

## Step 2: Infrastructure Startup
```bash
# Start core infrastructure services
docker-compose -f docker/infrastructure.yml up -d

# Verify services are running
docker-compose -f docker/infrastructure.yml ps

# Check service logs if needed
docker-compose -f docker/infrastructure.yml logs opensearch
```

## Step 3: Verify Infrastructure
```bash
# Test OpenSearch (wait 30-60 seconds for startup)
curl http://localhost:9200/_cluster/health

# Test Redis
docker exec cybersec-redis redis-cli ping

# Access OpenSearch Dashboards: http://localhost:5601
# Access MISP: http://localhost:8080 (admin/admin)
```

## Step 4: Module Development Priority
```bash
# Choose first module to implement (recommended order):
# 1. ingest-api (core foundation)
# 2. agent-windows (data source)  
# 3. edr-av-integration (security analysis)

cd ingest-api
# OR
cd agent-windows
```

## Step 5: Python Environment Setup
```bash
# Create virtual environment for chosen module
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install base dependencies
pip install fastapi uvicorn pytest httpx python-dotenv opensearch-py redis pydantic
```

## Step 6: Generate Module Implementation
```bash
# Use the detailed implementation prompt for your chosen module
# Example for ingest-api:
# Copy prompt from DEVELOPMENT_PLAN.md and feed to AI assistant
```

## Step 7: Test Development Environment
```bash
# Create sample event to test infrastructure
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-001",
    "timestamp": "2025-08-20T12:00:00Z",
    "event_type": "process",
    "source_host": "test-host",
    "source_agent": "test-agent",
    "process_id": 1234,
    "process_name": "test.exe"
  }'
```

## Step 8: Run Tests
```bash
# Run existing tests
pytest tests/ -v

# Run specific module tests
cd ingest-api
pytest tests/ -v
```

## Step 9: Development Workflow
```bash
# Create feature branch
git checkout -b feature/ingest-api-implementation

# Make changes, commit frequently
git add .
git commit -m "feat(ingest): implement basic FastAPI structure"

# Run tests before pushing
pytest tests/
```

## Step 10: Documentation Updates
```bash
# Update module status after completing work
# Edit MODULE_STATUS.md to reflect progress

# Update this recovery guide
# Edit CHANGELOG_RECOVERY.md with your session notes

# Create snapshot before major changes
./EXPORT_SNAPSHOT.sh
```

## Acceptance Criteria Checklist

- [ ] Infrastructure services running (docker-compose ps shows all UP)
- [ ] OpenSearch accessible at localhost:9200
- [ ] Redis responding to ping
- [ ] Chosen module has basic structure
- [ ] Tests pass (pytest returns 0 exit code)
- [ ] Documentation updated with progress
- [ ] Git commits follow conventional format
- [ ] .env.example configured for module
- [ ] Docker setup working for module
- [ ] API endpoints responding (if applicable)

## Quick Reference Commands

```bash
# Infrastructure management
docker-compose -f docker/infrastructure.yml up -d
docker-compose -f docker/infrastructure.yml down
docker-compose -f docker/infrastructure.yml logs [service]

# Module development
pytest tests/ -v
uvicorn app.main:app --reload  # For FastAPI modules
python agent.py --once --profile minimal  # For agent modules

# Monitoring
curl http://localhost:9200/_cat/indices  # OpenSearch indices
curl http://localhost:8000/health  # Service health
```

## Next Priority Modules

1. **ingest-api** - FastAPI service for telemetry ingestion
2. **agent-windows** - Windows endpoint data collection
3. **edr-av-integration** - Malware detection and analysis

Choose one module and follow the implementation prompt from DEVELOPMENT_PLAN.md.
