# Windows Agent

Endpoint monitoring agent for Windows systems.

## Overview

A lightweight Python agent that collects telemetry data from Windows endpoints and sends it to the ingest API. Designed for minimal performance impact while providing comprehensive monitoring.

## Features

- **Process Monitoring**: Track process creation, termination, and execution
- **File System Events**: Monitor file creation, modification, and deletion
- **Authentication Events**: Capture login/logout and authentication attempts  
- **Network Activity**: Basic network connection and DNS query monitoring
- **Configurable Collection**: Three levels - minimal, standard, detailed
- **Secure Communication**: TLS encryption for data transmission
- **Offline Capability**: Local buffering when ingest API is unavailable

## Collection Levels

### Minimal
- Critical process events only
- Authentication events
- High-severity file changes

### Standard (Default)
- All process events
- File system monitoring for key directories
- Network connections
- Authentication events

### Detailed
- Comprehensive process monitoring with command lines
- Full file system monitoring
- Detailed network activity
- Registry monitoring (future)

## Usage

```bash
# Install as Windows service
python agent.py install

# Run once (for testing)
python agent.py --once --profile standard

# Run with custom config
python agent.py --config custom_config.yaml --profile detailed

# Uninstall service
python agent.py uninstall
```

## Configuration

Create `config.yaml`:
```yaml
ingest_url: "https://your-ingest-api/ingest"
api_key: "your-api-key"
collection_profile: "standard"
buffer_size: 1000
send_interval: 30
tls_verify: true
```

## Installation

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/
```

## Security Considerations

- Agent runs with minimal required privileges
- File hashes computed locally (SHA256)
- No sensitive data in logs
- Optional binary upload (disabled by default)
- TLS 1.2+ for all communications

## TODO
- [ ] Windows service implementation
- [ ] Registry monitoring
- [ ] WMI integration for detailed system info
- [ ] Digital signature verification
- [ ] Encrypted local storage for buffered events
