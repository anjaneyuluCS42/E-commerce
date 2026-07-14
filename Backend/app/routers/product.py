
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from app.security.rate_limit import limiter

import json
import shutil
import uuid

from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

from app.models.product import Product

from app.schemas.product import (
    ProductCreate,
    ProductResponse
)

from app.auth.oauth2 import (
    get_current_user,
    get_current_admin_user
)

from app.cache.redis_client import (
    redis_client
)

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)

async def clear_products_cache():
    await redis_client.delete("all_products")
    try:
        keys = await redis_client.keys("products_search:*")
        if keys:
            await redis_client.delete(*keys)
    except Exception:
        pass


# CREATE PRODUCT
@router.post("", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    db: AsyncSession = Depends(get_db),
    # Phase 10: Only Admins can create products
    current_admin = Depends(get_current_admin_user)
):

    new_product = Product(
        **product.dict(),
        owner_id=current_admin.id
    )

    db.add(new_product)

    await db.commit()

    # CLEAR CACHE
    await clear_products_cache()

    await db.refresh(new_product)

    return new_product


from sqlalchemy import or_, desc, asc, func, case
from typing import Optional
from app.models.category import Category

# GET ALL PRODUCTS (Advanced Search & Filtering)
@router.get("", response_model=list[ProductResponse])
@limiter.limit("30/minute")
async def get_products(
    request: Request,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: Optional[str] = None, # price_asc, price_desc, newest
    skip: int = 0,
    limit: int = 1000,
    db: AsyncSession = Depends(get_db)
):
    import json
    # Generate unique cache key based on query params
    cache_key = f"products_search:q={search or ''}:cat={category_id or ''}:min={min_price or ''}:max={max_price or ''}:sort={sort_by or ''}:skip={skip}:limit={limit}"
    
    try:
        cached_data = await redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
    except Exception:
        pass

    # Enforce a maximum pagination limit to mitigate Unrestricted Resource Consumption (OWASP API4)
    limit = min(limit, 100)

    # Base query for active products only
    query = select(Product).where(Product.is_active == True)

    # 1. Apply Filtering parameters first
    if category_id:
        query = query.where(Product.category_id == category_id)
    if min_price is not None:
        query = query.where(Product.price >= min_price)
    if max_price is not None:
        query = query.where(Product.price <= max_price)

    # 2. Combined Search Strategy
    products = []
    if search:
        search = search.strip()
        ts_query = func.websearch_to_tsquery('english', search)
        base_rank = func.ts_rank_cd(Product.search_vector, ts_query)
        category_boost = case(
            (Category.name.ilike(f"%{search}%"), 0.5),
            else_=0.0
        )
        total_rank = base_rank + category_boost

        fts_query = (
            query
            .outerjoin(Category, Product.category_id == Category.id)
            .where(
                (Product.search_vector.bool_op("@@")(ts_query)) | (Category.name.ilike(f"%{search}%"))
            )
        )

        # Apply sorting/ranking to FTS
        if sort_by == "price_asc":
            fts_query = fts_query.order_by(asc(Product.price))
        elif sort_by == "price_desc":
            fts_query = fts_query.order_by(desc(Product.price))
        elif sort_by == "newest":
            fts_query = fts_query.order_by(desc(Product.id))
        else:
            fts_query = fts_query.order_by(desc(total_rank))

        # Paginate and execute FTS query
        fts_query = fts_query.offset(skip).limit(limit)
        result = await db.execute(fts_query)
        products = result.scalars().all()

        # Step B: Fallback to Trigram Fuzzy Search if FTS found 0 matches (likely due to typos)
        if not products:
            similarity_score = func.similarity(Product.name, search)
            trigram_query = query.where(similarity_score > 0.2)

            # Apply sorting/ranking to Trigrams
            if sort_by == "price_asc":
                trigram_query = trigram_query.order_by(asc(Product.price))
            elif sort_by == "price_desc":
                trigram_query = trigram_query.order_by(desc(Product.price))
            elif sort_by == "newest":
                trigram_query = trigram_query.order_by(desc(Product.id))
            else:
                trigram_query = trigram_query.order_by(desc(similarity_score))

            # Paginate and execute Trigram query
            trigram_query = trigram_query.offset(skip).limit(limit)
            result = await db.execute(trigram_query)
            products = result.scalars().all()
    else:
        # Standard query flow when no search text is supplied
        if sort_by == "price_asc":
            query = query.order_by(asc(Product.price))
        elif sort_by == "price_desc":
            query = query.order_by(desc(Product.price))
        elif sort_by == "newest":
            query = query.order_by(desc(Product.id))
        else:
            query = query.order_by(asc(Product.id))

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        products = result.scalars().all()

    # Cache results in Redis for 1 hour
    try:
        serialized = [{
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "price": p.price,
            "stock": p.stock,
            "image_url": p.image_url,
            "owner_id": p.owner_id,
            "category_id": p.category_id,
            "status": p.status,
            "is_active": p.is_active
        } for p in products]
        await redis_client.set(cache_key, json.dumps(serialized), ex=3600)
    except Exception:
        pass

    return products


# GET SINGLE PRODUCT
@router.get("/{product_id}",
            response_model=ProductResponse)
async def get_single_product(
    product_id: int,
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(Product).where(
            Product.id == product_id
        )
    )

    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return product


# UPDATE PRODUCT
@router.put("/{product_id}",
            response_model=ProductResponse)
async def update_product(
    product_id: int,
    updated_product: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):

    result = await db.execute(
        select(Product).where(
            Product.id == product_id
        )
    )

    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # OWNER CHECK
    if product.owner_id != current_user.id and current_user.role != "admin":

        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    product.name = updated_product.name
    product.description = updated_product.description
    product.price = updated_product.price
    product.stock = updated_product.stock

    await db.commit()

    # CLEAR CACHE
    await redis_client.delete(
        "all_products"
    )

    await db.refresh(product)

    return product


# DELETE PRODUCT
@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):

    result = await db.execute(
        select(Product).where(
            Product.id == product_id
        )
    )

    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # OWNER CHECK
    if product.owner_id != current_user.id and current_user.role != "admin":

        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    await db.delete(product)

    await db.commit()

    # CLEAR CACHE
    await clear_products_cache()

    return {
        "message": "Product deleted"
    }


# UPLOAD PRODUCT IMAGE
@router.post("/{product_id}/upload-image")
@limiter.limit("5/minute")
async def upload_product_image(
    request: Request,
    product_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):

    result = await db.execute(
        select(Product).where(
            Product.id == product_id
        )
    )

    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # OWNER CHECK
    if product.owner_id != current_user.id and current_user.role != "admin":

        raise HTTPException(
            status_code=403,
            detail="Not authorized"
        )

    # IMAGE VALIDATION
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Only image files allowed"
        )

    # UNIQUE FILE NAME
    filename = f"{uuid.uuid4()}_{file.filename}"

    filepath = f"uploads/product_images/{filename}"

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    product.image_url = filepath

    await db.commit()

    # CLEAR CACHE
    await clear_products_cache()

    return {
        "message": "Image uploaded",
        "image_url": filepath
    }

@router.post("/import", response_model=dict)
async def import_products_csv(
    file: UploadFile = File(...),
    current_admin = Depends(get_current_admin_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed")
        
    import os
    import uuid
    import shutil
    
    # Ensure temporary upload directory exists
    temp_dir = "uploads/imports"
    os.makedirs(temp_dir, exist_ok=True)
    
    # Save the uploaded CSV file temporarily
    file_name = f"import_{uuid.uuid4()}.csv"
    file_path = os.path.join(temp_dir, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Trigger Celery background task
    from app.tasks.order_tasks import bulk_import_products_task
    task = bulk_import_products_task.delay(file_path, current_admin.id)
    
    # Store task ownership in Redis for 24 hours
    from app.cache.redis_client import redis_client
    await redis_client.set(f"task_owner:{task.id}", current_admin.id, ex=86400)
    
    return {"task_id": task.id, "status": "QUEUED"}

