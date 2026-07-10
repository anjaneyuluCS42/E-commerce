from dotenv import load_dotenv
import os

# Monkey patch redis connection to use protocol=2 by default
# to support older Redis versions (compatibility with RESP2)
# and avoid "unknown command HELLO" error on celery/redis startup.
try:
    import redis.connection
    original_init = redis.connection.Connection.__init__
    def patched_init(self, *args, **kwargs):
        if 'protocol' not in kwargs:
            kwargs['protocol'] = 2
        original_init(self, *args, **kwargs)
    redis.connection.Connection.__init__ = patched_init
    redis.connection.Connection._configure_maintenance_notifications = lambda *args, **kwargs: None
except ImportError:
    pass

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
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