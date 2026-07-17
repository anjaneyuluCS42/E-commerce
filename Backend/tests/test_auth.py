import pytest
import uuid


@pytest.mark.asyncio
async def test_register_user(client):

    unique_id = str(uuid.uuid4())

    response = await client.post(
        "/auth/register",
        json={
            "username": f"testuser_{unique_id}",
            "email": f"{unique_id}@gmail.com",
            "password": "test123",
        },
    )

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_google_login_url(client):
    import os
    original_key = os.environ.get("SUPABASE_ANON_KEY")
    os.environ["SUPABASE_ANON_KEY"] = original_key or "mocked-anon-key-123"
    try:
        response = await client.get("/auth/google/url")
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "provider=google" in data["url"]
        assert "apikey=" in data["url"]
    finally:
        if original_key is None:
            del os.environ["SUPABASE_ANON_KEY"]
        else:
            os.environ["SUPABASE_ANON_KEY"] = original_key


@pytest.mark.asyncio
async def test_oauth_callback_invalid_token(client):
    response = await client.post(
        "/auth/oauth-callback",
        json={"access_token": "invalid-token-12345"}
    )
    # This should fail either because Supabase is not configured or token is invalid
    assert response.status_code in (400, 401)
