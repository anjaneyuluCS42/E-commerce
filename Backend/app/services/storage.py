import re
import httpx
import logging
from typing import Optional

logger = logging.getLogger("app")


def get_supabase_url(database_url: str) -> Optional[str]:
    """
    Extracts the Supabase project reference from the database URL
    and returns the Supabase API base URL.
    Example:
    postgresql+asyncpg://postgres.kvqccplpvqcjuctjbkre:... -> https://kvqccplpvqcjuctjbkre.supabase.co
    """
    if not database_url:
        return None

    # Matches the user portion of the url: postgres.[project_ref]
    match = re.search(r"postgres\.([a-z0-9]+)[:@]", database_url)
    if match:
        project_ref = match.group(1)
        return f"https://{project_ref}.supabase.co"

    return None


async def init_storage_bucket(database_url: str, supabase_key: str):
    """
    Checks if the 'product-images' bucket exists in Supabase Storage.
    If not, creates it and configures it to be public.
    """
    if not supabase_key:
        logger.info(
            "SUPABASE_KEY not configured. Storage bucket initialization skipped."
        )
        return

    supabase_url = get_supabase_url(database_url)
    if not supabase_url:
        logger.warning(
            "Could not determine Supabase URL from DATABASE_URL. Storage bucket initialization skipped."
        )
        return

    bucket_url = f"{supabase_url}/storage/v1/bucket/product-images"
    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "apikey": supabase_key,
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(bucket_url, headers=headers)
            if response.status_code == 200:
                logger.info(
                    "Supabase storage bucket 'product-images' already exists and is ready."
                )
                return

            if response.status_code == 404:
                logger.info(
                    "Supabase storage bucket 'product-images' not found. Creating bucket..."
                )
                create_url = f"{supabase_url}/storage/v1/bucket"
                payload = {
                    "id": "product-images",
                    "name": "product-images",
                    "public": True,
                    "file_size_limit": 5242880,  # 5MB limit
                    "allowed_mime_types": [
                        "image/jpeg",
                        "image/png",
                        "image/gif",
                        "image/webp",
                    ],
                }
                create_resp = await client.post(
                    create_url, headers=headers, json=payload
                )
                if create_resp.status_code == 200:
                    logger.info(
                        "Supabase storage bucket 'product-images' created and configured as public successfully."
                    )
                else:
                    logger.error(
                        f"Failed to create Supabase storage bucket: {create_resp.status_code} - {create_resp.text}"
                    )
            else:
                logger.error(
                    f"Unexpected response when checking Supabase bucket: {response.status_code} - {response.text}"
                )
    except Exception as e:
        logger.error(
            f"Error initializing Supabase Storage bucket: {str(e)}", exc_info=True
        )


async def upload_image(
    database_url: str,
    supabase_key: str,
    filename: str,
    content_type: str,
    file_bytes: bytes,
) -> Optional[str]:
    """
    Uploads file bytes to Supabase Storage and returns the public HTTP URL.
    """
    supabase_url = get_supabase_url(database_url)
    if not supabase_url or not supabase_key:
        return None

    upload_url = f"{supabase_url}/storage/v1/object/product-images/{filename}"
    headers = {
        "Authorization": f"Bearer {supabase_key}",
        "apikey": supabase_key,
        "Content-Type": content_type,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                upload_url, headers=headers, content=file_bytes
            )
            if response.status_code == 200:
                public_url = (
                    f"{supabase_url}/storage/v1/object/public/product-images/{filename}"
                )
                logger.info(
                    f"Successfully uploaded image '{filename}' to Supabase Storage. Public URL: {public_url}"
                )
                return public_url
            else:
                logger.error(
                    f"Supabase upload failed: {response.status_code} - {response.text}"
                )
                raise Exception(f"Failed to upload image to Supabase: {response.text}")
    except Exception as e:
        logger.error(
            f"Error uploading image to Supabase Storage: {str(e)}", exc_info=True
        )
        raise e
