from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, Index, text, Computed, ARRAY
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import relationship
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    __table_args__ = (
        Index("ix_products_price", "price"),
        Index("ix_products_category_id", "category_id"),
        Index(
            "ix_products_active_name",
            "name",
            postgresql_where=text("status = 'active' AND is_active = true")
        ),
        Index(
            "ix_products_search_vector",
            "search_vector",
            postgresql_using="gin"
        ),
        Index(
            "ix_products_name_trgm",
            "name",
            postgresql_using="gin",
            postgresql_ops={"name": "gin_trgm_ops"}
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    price = Column(Float)
    stock = Column(Integer, default=0)
    image_url = Column(String, nullable=True)
    images = Column(ARRAY(String), server_default='{}')

    # Precomputed weighted search vector for full text search
    search_vector = Column(
        TSVECTOR,
        Computed(
            "setweight(to_tsvector('english', coalesce(name, '')), 'A') || "
            "setweight(to_tsvector('english', coalesce(description, '')), 'B')",
            persisted=True
        )
    )

    # Phase 3: Production Upgrades
    status = Column(String, default="active") # active, draft, out_of_stock
    is_active = Column(Boolean, default=True) # Soft delete

    # Relationships
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="products")

    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="products")