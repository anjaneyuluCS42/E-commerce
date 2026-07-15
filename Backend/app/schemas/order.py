from pydantic import BaseModel, computed_field
from typing import List, Optional
from datetime import datetime

class CheckoutRequest(BaseModel):
    shipping_address: str
    payment_method: str
    coupon_code: Optional[str] = None

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    price: float

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    user_id: int
    subtotal: float
    tax: float
    shipping_fee: float
    discount: float
    total_price: float
    shipping_address: str
    payment_method: str
    payment_status: str
    order_status: str
    current_location: Optional[str] = "Warehouse"
    tracking_history: Optional[str] = "[]"
    created_at: datetime
    items: List[OrderItemResponse] = []
    email_task_id: Optional[str] = None

    @computed_field
    @property
    def status(self) -> str:
        return self.order_status

    class Config:
        from_attributes = True