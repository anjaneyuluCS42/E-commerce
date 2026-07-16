import pytest
from unittest.mock import AsyncMock, patch
from app.services.storage import get_supabase_url, init_storage_bucket, upload_image


def test_get_supabase_url():
    # Valid Supabase DB URL
    db_url = "postgresql+asyncpg://postgres.kvqccplpvqcjuctjbkre:Password123@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"
    url = get_supabase_url(db_url)
    assert url == "https://kvqccplpvqcjuctjbkre.supabase.co"

    # Non-matching URL
    invalid_url = "postgresql://localhost:5432/postgres"
    assert get_supabase_url(invalid_url) is None


@pytest.mark.asyncio
@patch("httpx.AsyncClient.get")
async def test_init_storage_bucket_exists(mock_get):
    # Mocking bucket check response (200 OK)
    mock_get.return_value = AsyncMock(status_code=200)

    db_url = (
        "postgresql+asyncpg://postgres.kvqccplpvqcjuctjbkre:Pass@host:6543/postgres"
    )
    await init_storage_bucket(db_url, "fake-key")

    mock_get.assert_called_once_with(
        "https://kvqccplpvqcjuctjbkre.supabase.co/storage/v1/bucket/product-images",
        headers={
            "Authorization": "Bearer fake-key",
            "Content-Type": "application/json",
        },
    )


@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
@patch("httpx.AsyncClient.get")
async def test_init_storage_bucket_create(mock_get, mock_post):
    # Mocking bucket check response (404 Not Found)
    mock_get.return_value = AsyncMock(status_code=404)
    # Mocking bucket creation response (200 OK)
    mock_post.return_value = AsyncMock(status_code=200)

    db_url = (
        "postgresql+asyncpg://postgres.kvqccplpvqcjuctjbkre:Pass@host:6543/postgres"
    )
    await init_storage_bucket(db_url, "fake-key")

    mock_get.assert_called_once()
    mock_post.assert_called_once_with(
        "https://kvqccplpvqcjuctjbkre.supabase.co/storage/v1/bucket",
        headers={
            "Authorization": "Bearer fake-key",
            "Content-Type": "application/json",
        },
        json={
            "id": "product-images",
            "name": "product-images",
            "public": True,
            "file_size_limit": 5242880,
            "allowed_mime_types": [
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
            ],
        },
    )


@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_upload_image_success(mock_post):
    mock_post.return_value = AsyncMock(status_code=200)

    db_url = (
        "postgresql+asyncpg://postgres.kvqccplpvqcjuctjbkre:Pass@host:6543/postgres"
    )
    public_url = await upload_image(
        db_url, "fake-key", "test.png", "image/png", b"fake-bytes"
    )

    assert (
        public_url
        == "https://kvqccplpvqcjuctjbkre.supabase.co/storage/v1/object/public/product-images/test.png"
    )
    mock_post.assert_called_once_with(
        "https://kvqccplpvqcjuctjbkre.supabase.co/storage/v1/object/product-images/test.png",
        headers={"Authorization": "Bearer fake-key", "Content-Type": "image/png"},
        content=b"fake-bytes",
    )
