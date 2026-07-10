from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException

from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

from app.models.product import Product

from app.auth.oauth2 import (
    get_current_user
)

from app.cache.redis_client import (
    redis_client
)

router = APIRouter(
    prefix="/cart",
    tags=["Cart"]
)

@router.post("/add/{product_id}")
async def add_to_cart(
    product_id: int,
    quantity: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if product exists & has enough stock
    result = await db.execute(select(Product).where(Product.id == product_id, Product.is_active == True))
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found or inactive")
    if product.stock < quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    cart_key = f"cart:{current_user.id}"
    
    # Get current quantity to add to it instead of replacing
    current_qty = await redis_client.hget(cart_key, str(product_id))
    new_qty = int(current_qty) + quantity if current_qty else quantity

    if new_qty > product.stock:
        raise HTTPException(status_code=400, detail="Requested total quantity exceeds available stock")

    await redis_client.hset(cart_key, str(product_id), str(new_qty))
    return {"message": "Added to cart"}

@router.get("/")
async def get_cart(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user), coupon_code: str = None):
    cart_key = f"cart:{current_user.id}"
    cart_items = await redis_client.hgetall(cart_key)
    
    if not cart_items:
        return {"items": [], "subtotal": 0, "tax": 0, "shipping": 0, "discount": 0, "total": 0}

    product_ids = [int(pid) for pid in cart_items.keys()]
    
    result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products = result.scalars().all()
    
    items_list = []
    subtotal = 0.0

    for product in products:
        qty = int(cart_items[str(product.id)])
        item_total = product.price * qty
        subtotal += item_total
        
        items_list.append({
            "product_id": product.id,
            "name": product.name,
            "price": product.price,
            "quantity": qty,
            "item_total": item_total,
            "image_url": product.image_url
        })

    # Business Logic Calculations
    tax = subtotal * 0.18 # 18% GST
    shipping = 50.0 if subtotal < 500 else 0.0
    
    # Simple mock coupon logic
    discount = 0.0
    if coupon_code == "WELCOME10":
        discount = subtotal * 0.10

    total = (subtotal + tax + shipping) - discount

    return {
        "items": items_list,
        "subtotal": round(subtotal, 2),
        "tax": round(tax, 2),
        "shipping": round(shipping, 2),
        "discount": round(discount, 2),
        "total": round(total, 2)
    }

@router.delete("/remove/{product_id}")
async def remove_from_cart(product_id: int, current_user = Depends(get_current_user)):
    cart_key = f"cart:{current_user.id}"
    await redis_client.hdel(cart_key, str(product_id))
    return {"message": "Item removed"}

@router.post("/merge")
async def merge_guest_cart(guest_cart: dict, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    """
    guest_cart format from frontend local storage: {"product_id": quantity}
    """
    cart_key = f"cart:{current_user.id}"
    
    for pid, qty in guest_cart.items():
        # Ideally, validate stock here again
        current_qty = await redis_client.hget(cart_key, str(pid))
        new_qty = int(current_qty) + int(qty) if current_qty else int(qty)
        await redis_client.hset(cart_key, str(pid), str(new_qty))

    return {"message": "Guest cart merged successfully"}

@router.delete("/clear")
async def clear_cart(current_user = Depends(get_current_user)):
    cart_key = f"cart:{current_user.id}"
    await redis_client.delete(cart_key)
    return {"message": "Cart cleared"}