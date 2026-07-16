from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.config import DATABASE_URL

# Force asyncpg driver for PostgreSQL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

connect_args = {}

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

engine = create_async_engine(DATABASE_URL, echo=True, connect_args=connect_args)

TestingSessionLocal = sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)
