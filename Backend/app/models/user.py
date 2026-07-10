from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    
    # Phase 2: Added Production Fields
    role = Column(String, default="user") # 'user' or 'admin'
    is_active = Column(Boolean, default=True)
    
    # Email Verification Fields
    is_verified = Column(Boolean, default=True)
    verification_token = Column(String, nullable=True)

    products = relationship(
        "Product",
        back_populates="owner"
    )