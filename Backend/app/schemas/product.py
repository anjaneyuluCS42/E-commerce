from pydantic import BaseModel, Field, field_validator
import re
from html import escape

def sanitize_string(value: str) -> str:
    # Remove HTML tags to prevent HTML injection
    clean = re.sub(r'<[^>]*>', '', value)
    # Escape characters to prevent XSS injection
    return escape(clean.strip())


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=5, max_length=1000)
    price: float = Field(..., gt=0, lt=1000000)
    stock: int = Field(..., ge=0, lt=100000)

    @field_validator('name', 'description')
    @classmethod
    def sanitize_fields(cls, v: str) -> str:
        return sanitize_string(v)


class ProductResponse(ProductCreate):
    id: int
    owner_id: int
    category_id: int | None = None
    image_url: str | None = None

    class Config:
        from_attributes = True