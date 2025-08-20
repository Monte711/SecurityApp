# Ingest API

Central telemetry ingestion service for the cybersecurity platform.

## Overview

The Ingest API is a FastAPI-based service that receives, validates, and processes telemetry data from various sources including endpoint agents, vulnerability scanners, and threat intelligence feeds.

## Features

- **JSON Schema Validation**: Validates incoming events against predefined schemas
- **OpenSearch Integration**: Stores events in OpenSearch for search and analysis
- **Redis Streaming**: Publishes events to Redis streams for real-time processing
- **Idempotency**: Prevents duplicate event processing using event_id
- **Rate Limiting**: Protects against abuse and overload
- **Authentication**: API key-based authentication for agents

## API Endpoints

### POST /ingest
Accepts telemetry events for processing.

**Request Body**: Any valid event schema (ProcessEvent, FileEvent, etc.)
**Response**: IngestResponse with processing status

### GET /health
Health check endpoint for monitoring.

### GET /metrics
Prometheus-compatible metrics endpoint.

## Configuration

Environment variables:
- `OPENSEARCH_URL`: OpenSearch connection URL
- `REDIS_URL`: Redis connection URL  
- `API_KEYS`: Comma-separated list of valid API keys
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARN, ERROR)
- `RATE_LIMIT`: Requests per minute per client

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn app.main:app --reload --port 8000

# Run tests
pytest

# Run with Docker
docker-compose up --build
```

## Event Schemas

See `../shared/schemas.py` for complete event schema definitions.

## TODO
- [ ] Implement API key authentication
- [ ] Add rate limiting middleware  
- [ ] Set up metrics collection
- [ ] Add event enrichment pipeline
- [ ] Implement batch ingestion endpoint
