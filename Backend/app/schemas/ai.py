from pydantic import BaseModel
from typing import List, Optional

class ProductRecommendation(BaseModel):
    id: int
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    match_reason: str

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    text: str
    products: Optional[List[ProductRecommendation]] = None
    suggestions: Optional[List[str]] = None

    class Config:
        from_attributes = True

class GenerateDescriptionRequest(BaseModel):
    name: str
    category: Optional[str] = None
    price: Optional[float] = None

class GenerateDescriptionResponse(BaseModel):
    description: str
