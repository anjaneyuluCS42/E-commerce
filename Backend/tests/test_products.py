import pytest


@pytest.mark.asyncio
async def test_get_products(client):

    response = await client.get(
        "/products/"
    )

    assert response.status_code == 200