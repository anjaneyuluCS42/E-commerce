from sqlalchemy import Column, Integer, Float, ForeignKey, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    # Financials
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    shipping_fee = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total_price = Column(Float)

    # Checkout Data
    shipping_address = Column(String, nullable=True)
    payment_method = Column(String, default="Credit Card")  # Mock payment method

    # Phase 6 Prep: Order Tracking & Status
    payment_status = Column(String, default="Pending")  # Pending, Completed, Failed
    order_status = Column(
        String, default="Pending"
    )  # Pending, Confirmed, Packed, Shipped, Delivered, Cancelled
    current_location = Column(String, default="Warehouse")
    tracking_history = Column(String, default="[]")

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))

    quantity = Column(Integer)
    price = Column(Float)  # Store the price AT THE TIME OF PURCHASE

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
