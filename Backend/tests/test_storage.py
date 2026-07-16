import pytest
from unittest.mock import patch
from app.services.storage import init_storage_bucket, upload_image


@pytest.mark.asyncio
async def test_init_storage_bucket():
    # Verify init_storage_bucket behaves as a backward-compatible no-op
    await init_storage_bucket()


@pytest.mark.asyncio
@patch("cloudinary.uploader.upload")
@patch("cloudinary.config")
async def test_upload_image_success(mock_config, mock_upload):
    # Mock Cloudinary API response
    mock_upload.return_value = {
        "secure_url": "https://res.cloudinary.com/testcloud/image/upload/v12345/product_images/test.png"
    }

    public_url = await upload_image(
        cloud_name="testcloud",
        api_key="testkey",
        api_secret="testsecret",
        file_bytes=b"fake-bytes",
        filename="test.png",
    )

    assert (
        public_url
        == "https://res.cloudinary.com/testcloud/image/upload/v12345/product_images/test.png"
    )

    mock_config.assert_called_once_with(
        cloud_name="testcloud", api_key="testkey", api_secret="testsecret", secure=True
    )
    mock_upload.assert_called_once_with(
        b"fake-bytes", folder="product_images", public_id="test"
    )
