from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base

from app.config import (
    DATABASE_URL,
    DEBUG,
    DB_POOL_SIZE,
    DB_MAX_OVERFLOW,
    DB_POOL_TIMEOUT,
    DB_POOL_RECYCLE,
    DB_POOL_PRE_PING,
)

# Force asyncpg driver for PostgreSQL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

connect_args = {}

# Enable SSL only for cloud databases, not local Docker/PostgreSQL
if (
    "localhost" not in DATABASE_URL
    and "127.0.0.1" not in DATABASE_URL
    and "@postgres:" not in DATABASE_URL
):
    import ssl

    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    connect_args["ssl"] = ssl_context
    connect_args["statement_cache_size"] = 0

# Create async SQLAlchemy engine
engine = create_async_engine(
    DATABASE_URL,
    echo=DEBUG,
    pool_size=DB_POOL_SIZE,
    max_overflow=DB_MAX_OVERFLOW,
    pool_timeout=DB_POOL_TIMEOUT,
    pool_recycle=DB_POOL_RECYCLE,
    pool_pre_ping=DB_POOL_PRE_PING,
    connect_args=connect_args,
)

AsyncSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
