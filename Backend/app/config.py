from dotenv import load_dotenv
import os

# Monkey patch redis connection to use protocol=2 by default
# to support older Redis versions (compatibility with RESP2)
# and avoid "unknown command HELLO" error on celery/redis startup.
try:
    import redis.connection

    original_init = redis.connection.Connection.__init__

    def patched_init(self, *args, **kwargs):
        if "protocol" not in kwargs:
            kwargs["protocol"] = 2
        original_init(self, *args, **kwargs)

    redis.connection.Connection.__init__ = patched_init
    redis.connection.Connection._configure_maintenance_notifications = (
        lambda *args, **kwargs: None
    )
except ImportError:
    pass

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    FRONTEND_URL: str = "http://localhost:5173"
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REDIS_URL: str = "redis://localhost:6379"
    ROOT_PATH: str = ""

    # SMTP Email Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # Observability Configuration
    SENTRY_DSN: Optional[str] = None
    LOG_FORMAT: str = "json"
    PROMETHEUS_METRICS_ENABLED: bool = True

    # Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # Database Pool Configuration
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_POOL_PRE_PING: bool = True

    # Redis Pool Configuration
    REDIS_MAX_CONNECTIONS: int = 50
    REDIS_SOCKET_TIMEOUT: float = 5.0
    REDIS_HEALTH_CHECK_INTERVAL: int = 30

    # Security Configuration
    ALLOWED_HOSTS: List[str] = ["*"]


settings = Settings()

# Export settings for backward compatibility
ENVIRONMENT = settings.ENVIRONMENT
DEBUG = settings.DEBUG
FRONTEND_URL = settings.FRONTEND_URL
DATABASE_URL = settings.DATABASE_URL
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REDIS_URL = settings.REDIS_URL
ROOT_PATH = settings.ROOT_PATH
SMTP_HOST = settings.SMTP_HOST
SMTP_PORT = settings.SMTP_PORT
SMTP_USER = settings.SMTP_USER
SMTP_PASSWORD = settings.SMTP_PASSWORD
SENTRY_DSN = settings.SENTRY_DSN
LOG_FORMAT = settings.LOG_FORMAT
PROMETHEUS_METRICS_ENABLED = settings.PROMETHEUS_METRICS_ENABLED
CLOUDINARY_CLOUD_NAME = settings.CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY = settings.CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET = settings.CLOUDINARY_API_SECRET
DB_POOL_SIZE = settings.DB_POOL_SIZE
DB_MAX_OVERFLOW = settings.DB_MAX_OVERFLOW
DB_POOL_TIMEOUT = settings.DB_POOL_TIMEOUT
DB_POOL_RECYCLE = settings.DB_POOL_RECYCLE
DB_POOL_PRE_PING = settings.DB_POOL_PRE_PING
REDIS_MAX_CONNECTIONS = settings.REDIS_MAX_CONNECTIONS
REDIS_SOCKET_TIMEOUT = settings.REDIS_SOCKET_TIMEOUT
REDIS_HEALTH_CHECK_INTERVAL = settings.REDIS_HEALTH_CHECK_INTERVAL
ALLOWED_HOSTS = settings.ALLOWED_HOSTS
