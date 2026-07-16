import asyncio
import logging
from typing import Optional
import cloudinary
import cloudinary.uploader

logger = logging.getLogger("app")


async def init_storage_bucket(*args, **kwargs):
    """
    Stub function for backward compatibility. Cloudinary does not require bucket pre-creation.
    """
    pass


async def upload_image(
    cloud_name: str, api_key: str, api_secret: str, file_bytes: bytes, filename: str
) -> Optional[str]:
    """
    Uploads file bytes to Cloudinary and returns the secure public HTTPS URL.
    Runs the blocking Cloudinary SDK call in a separate thread so that it doesn't block the event loop.
    """
    if not cloud_name or not api_key or not api_secret:
        return None

    try:
        # Configure Cloudinary
        cloudinary.config(
            cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True
        )

        # Determine public_id without extension
        public_id = filename.split(".")[0] if "." in filename else filename

        # Upload file bytes to Cloudinary (executed in a thread pool)
        response = await asyncio.to_thread(
            cloudinary.uploader.upload,
            file_bytes,
            folder="product_images",
            public_id=public_id,
        )

        secure_url = response.get("secure_url")
        if secure_url:
            logger.info(
                f"Successfully uploaded image to Cloudinary. Public URL: {secure_url}"
            )
            return secure_url
        else:
            logger.error(f"Cloudinary upload did not return secure_url: {response}")
            raise Exception("Secure URL not returned by Cloudinary")
    except Exception as e:
        logger.error(f"Error uploading image to Cloudinary: {str(e)}", exc_info=True)
        raise e
