import pytest_asyncio

from httpx import AsyncClient
from httpx import ASGITransport

from app.main import app
from app.database import get_db

from tests.test_database import TestingSessionLocal, engine

from app.database import Base


async def override_get_db():

    async with TestingSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client():
    from sqlalchemy import text
    from app.database import engine as prod_engine

    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:

        yield ac

    await engine.dispose()
    await prod_engine.dispose()
