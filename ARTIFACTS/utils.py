"""
Common utilities for the cybersecurity platform.
"""

import hashlib
import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pathlib import Path


def generate_event_id() -> str:
    """Generate a unique event ID."""
    return str(uuid.uuid4())


def get_file_hash(file_path: str) -> Optional[str]:
    """Calculate SHA256 hash of a file."""
    try:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    except Exception as e:
        logging.error(f"Failed to calculate hash for {file_path}: {e}")
        return None


def get_string_hash(data: str) -> str:
    """Calculate SHA256 hash of a string."""
    return hashlib.sha256(data.encode()).hexdigest()


def setup_logging(
    level: str = "INFO",
    format_string: Optional[str] = None,
    log_file: Optional[str] = None
) -> logging.Logger:
    """Setup standardized logging configuration."""
    if format_string is None:
        format_string = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format=format_string,
        filename=log_file
    )
    
    return logging.getLogger(__name__)


def load_config(config_file: str = ".env") -> Dict[str, str]:
    """Load configuration from environment file."""
    config = {}
    config_path = Path(config_file)
    
    if config_path.exists():
        with open(config_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip().strip('"\'')
    
    # Override with environment variables
    config.update(os.environ)
    return config


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage."""
    # Remove/replace dangerous characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    return filename[:255]  # Limit length


def current_timestamp() -> datetime:
    """Get current UTC timestamp."""
    return datetime.utcnow()


def format_bytes(bytes_value: int) -> str:
    """Format bytes as human-readable string."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_value < 1024.0:
            return f"{bytes_value:.1f} {unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.1f} PB"


def mask_sensitive_data(data: Dict[str, Any], sensitive_fields: Optional[list] = None) -> Dict[str, Any]:
    """Mask sensitive fields in data dictionary."""
    if sensitive_fields is None:
        sensitive_fields = ['password', 'token', 'key', 'secret', 'credential']
    
    masked_data = data.copy()
    for field in sensitive_fields:
        if field in masked_data:
            masked_data[field] = "***MASKED***"
    
    return masked_data


def validate_ip_address(ip: str) -> bool:
    """Validate IP address format."""
    import ipaddress
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def is_private_ip(ip: str) -> bool:
    """Check if IP address is private."""
    import ipaddress
    try:
        ip_obj = ipaddress.ip_address(ip)
        return ip_obj.is_private
    except ValueError:
        return False


class ConfigManager:
    """Configuration manager with environment variable support."""
    
    def __init__(self, config_file: str = ".env"):
        self.config = load_config(config_file)
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value."""
        return self.config.get(key, default)
    
    def get_int(self, key: str, default: int = 0) -> int:
        """Get integer configuration value."""
        value = self.config.get(key, default)
        try:
            return int(value)
        except (ValueError, TypeError):
            return default
    
    def get_bool(self, key: str, default: bool = False) -> bool:
        """Get boolean configuration value."""
        value = self.config.get(key, str(default)).lower()
        return value in ('true', '1', 'yes', 'on')
    
    def get_list(self, key: str, delimiter: str = ",", default: Optional[list] = None) -> list:
        """Get list configuration value."""
        if default is None:
            default = []
        
        value = self.config.get(key)
        if not value:
            return default
        
        return [item.strip() for item in value.split(delimiter) if item.strip()]


def retry_with_backoff(max_retries: int = 3, backoff_factor: float = 1.0):
    """Decorator for retrying functions with exponential backoff."""
    import time
    import functools
    
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise e
                    
                    wait_time = backoff_factor * (2 ** attempt)
                    logging.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
            
            return None
        return wrapper
    return decorator
