from pydantic import BaseModel, Field, field_validator
import re
from html import escape, unescape


def sanitize_string(value: str) -> str:
    # Remove HTML tags to prevent HTML injection
    clean = re.sub(r"<[^>]*>", "", value)
    # Unescape recursively to resolve any deeply nested entities
    current = clean.strip()
    while True:
        nxt = unescape(current)
        if nxt == current:
            break
        current = nxt
    return escape(current)


class ProductBase(BaseModel):
    name: str
    description: str
    price: float
    stock: int
    category_id: int | None = None
    image_url: str | None = None
    images: list[str] = []


class ProductCreate(ProductBase):
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=5, max_length=10000)
    price: float = Field(..., gt=0, lt=1000000)
    stock: int = Field(..., ge=0, lt=100000)
    category_id: int | None = Field(None, ge=1)

    @field_validator("name", "description")
    @classmethod
    def validate_and_sanitize_fields(cls, v: str) -> str:
        return sanitize_string(v)


class ProductResponse(ProductBase):
    id: int
    owner_id: int
    category_id: int | None = None
    image_url: str | None = None
    images: list[str] = []

    class Config:
        from_attributes = True
