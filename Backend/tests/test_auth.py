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
