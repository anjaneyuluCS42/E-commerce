from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional

from app.database import get_db
from app.tasks.order_tasks import send_order_confirmation_email, generate_invoice_task
from app.websocket.manager import manager
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.auth.oauth2 import get_current_user, get_current_admin_user
from app.cache.redis_client import redis_client
from app.schemas.order import OrderResponse, CheckoutRequest

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("/checkout", response_model=OrderResponse)
async def place_order(
    checkout_data: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    cart_key = f"cart:{current_user.id}"
    cart_items = await redis_client.hgetall(cart_key)

    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Fetch products
    product_ids = [int(pid) for pid in cart_items.keys()]
    result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products = result.scalars().all()
    product_dict = {p.id: p for p in products}

    subtotal = 0.0
    order_items_to_add = []

    for pid_str, qty_str in cart_items.items():
        pid = int(pid_str)
        qty = int(qty_str)
        product = product_dict.get(pid)

        if not product or product.stock < qty:
            raise HTTPException(status_code=400, detail=f"Stock issue for product {pid}")

        # Reduce stock
        product.stock -= qty
        
        item_total = product.price * qty
        subtotal += item_total
        
        # Prepare OrderItem
        order_items_to_add.append(OrderItem(
            product_id=product.id,
            quantity=qty,
            price=product.price
        ))

    # Business Calculations
    tax = subtotal * 0.18
    shipping = 50.0 if subtotal < 500 else 0.0
    discount = (subtotal * 0.10) if checkout_data.coupon_code == "WELCOME10" else 0.0
    total_price = (subtotal + tax + shipping) - discount

    # Mock Payment Processing
    if checkout_data.payment_method == "FailMe":
        payment_status = "Failed"
    elif checkout_data.payment_method in ["Cash on Delivery", "COD"]:
        payment_status = "Pending"
    else:
        payment_status = "Completed"
    
    if payment_status == "Failed":
        raise HTTPException(status_code=402, detail="Payment Failed")

    # Initialize tracking history
    import json
    from datetime import datetime
    initial_history = [
        {
            "status": "Confirmed",
            "location": "Warehouse",
            "timestamp": datetime.utcnow().isoformat()
        }
    ]

    # Create Order
    order = Order(
        user_id=current_user.id,
        subtotal=subtotal,
        tax=tax,
        shipping_fee=shipping,
        discount=discount,
        total_price=total_price,
        shipping_address=checkout_data.shipping_address,
        payment_method=checkout_data.payment_method,
        payment_status=payment_status,
        order_status="Confirmed",
        current_location="Warehouse",
        tracking_history=json.dumps(initial_history),
        items=order_items_to_add
    )

    db.add(order)
    await db.commit()
    await db.refresh(order)

    # Clear Cart
    await redis_client.delete(cart_key)

    # Clear Products Search Cache to update stock in search list
    try:
        from app.routers.product import clear_products_cache
        await clear_products_cache()
    except Exception as e:
        import logging
        logging.getLogger("uvicorn").error(f"Failed to clear products cache on checkout: {e}")

    # Fire background task and generate PDF Invoice
    serializable_items = [
        {"name": product_dict.get(item.product_id).name, "quantity": item.quantity, "price": item.price} 
        for item in order_items_to_add
    ]
    task = send_order_confirmation_email.delay(current_user.email, order.id, total_price, serializable_items)
    order.email_task_id = task.id

    # Notify Customer and Admin via stored Redis notifications
    await manager.send_notification(
        user_id=current_user.id,
        title="Order Placed Successfully",
        message=f"Your order #{order.id} has been placed. Total: ₹{total_price:.2f}",
        payload={"order_id": order.id, "type": "notification"}
    )
    await manager.send_notification(
        user_id=1,
        title="New Order Received",
        message=f"New Order #{order.id} placed by User #{current_user.id}. Total: ₹{total_price:.2f}",
        payload={"order_id": order.id, "type": "notification"}
    )

    return order


@router.get("/all", response_model=list[OrderResponse])
async def get_all_orders(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin_user)
):
    query = select(Order).options(selectinload(Order.items))
    if status:
        query = query.where(Order.order_status.ilike(status))
    
    if sort_by == "total_price":
        sort_col = Order.total_price
    else:
        sort_col = Order.created_at
        
    if sort_order.lower() == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())
        
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    orders = result.scalars().all()
    return orders


@router.get("/history", response_model=list[OrderResponse])
async def order_history(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    return orders


from pydantic import BaseModel

class StatusUpdate(BaseModel):
    status: str
    current_location: Optional[str] = None

@router.put("/{order_id}/status", response_model=OrderResponse)
@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int, 
    status_data: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin = Depends(get_current_admin_user)
):
    valid_statuses = ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"]
    # Normalize status case (capitalize the first letter, e.g., 'shipped' -> 'Shipped')
    status_input = status_data.status.capitalize()
    if status_input not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    result = await db.execute(select(Order).where(Order.id == order_id).options(selectinload(Order.items)))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.order_status = status_input
    if status_data.current_location is not None:
        order.current_location = status_data.current_location

    if status_input == "Delivered" and order.payment_method in ["Cash on Delivery", "COD"]:
        order.payment_status = "Completed"

    # Append to tracking history
    import json
    from datetime import datetime
    history = []
    if order.tracking_history:
        try:
            history = json.loads(order.tracking_history)
        except Exception:
            history = []

    latest_status = history[-1].get("status") if history else None
    latest_location = history[-1].get("location") if history else None
    
    if not history or latest_status != status_input or (status_data.current_location and latest_location != status_data.current_location):
        history.append({
            "status": status_input,
            "location": order.current_location or "Warehouse",
            "timestamp": datetime.utcnow().isoformat()
        })
        order.tracking_history = json.dumps(history)

    await db.commit()
    await db.refresh(order)

    # Send targeted update to the specific customer and store it
    await manager.send_notification(
        user_id=order.user_id,
        title="Order Status Updated",
        message=f"Your order #{order.id} status was updated to {order.order_status}.",
        payload={"order_id": order.id, "type": "order_update", "status": order.order_status}
    )

    # Notify admin too
    await manager.send_notification(
        user_id=1,
        title="Order Status Updated",
        message=f"Order #{order.id} status updated to {order.order_status}.",
        payload={"order_id": order.id, "type": "notification", "status": order.order_status}
    )

    return order

@router.post("/{order_id}/invoice")
async def trigger_invoice_generation(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Fetch the order with its items and products
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Check authorization (only order owner or admin can generate the invoice)
    if order.user_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to access this invoice")

    # Serialize items
    items_list = []
    for item in order.items:
        items_list.append({
            "product_id": item.product_id,
            "name": item.product.name if item.product else f"Product ID {item.product_id}",
            "quantity": item.quantity,
            "price": item.price
        })

    # Trigger Celery background task
    task = generate_invoice_task.delay(order.id, current_user.email, order.total_price, items_list)
    
    # Store task ownership in Redis for 24 hours
    await redis_client.set(f"task_owner:{task.id}", current_user.id, ex=86400)
    
    return {"task_id": task.id, "status": "QUEUED"}

@router.get("/{order_id}/invoice/download")
async def download_invoice(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Fetch the order with items and products to check ownership
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Check authorization (only order owner or admin can download the invoice)
    if order.user_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not authorized to access this invoice")

    import os
    file_path = f"invoices/invoice_order_{order_id}.pdf"
    if not os.path.exists(file_path):
        # Generate the invoice PDF dynamically
        items_list = []
        for item in order.items:
            items_list.append({
                "product_id": item.product_id,
                "name": item.product.name if item.product else f"Product ID {item.product_id}",
                "quantity": item.quantity,
                "price": item.price
            })
        from app.services.pdf_service import generate_invoice_pdf
        try:
            generate_invoice_pdf(order.id, current_user.email, order.total_price, items_list)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate invoice: {str(e)}")
        
    from fastapi.responses import FileResponse
    return FileResponse(file_path, media_type="application/pdf", filename=f"invoice_order_{order_id}.pdf")