from pydantic import BaseModel, EmailStr, Field, field_validator
import re
from html import escape, unescape

def sanitize_string(value: str) -> str:
    # Remove HTML tags
    clean = re.sub(r'<[^>]*>', '', value)
    # Unescape first to prevent double escaping of already escaped entities
    return escape(unescape(clean.strip()))


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr = Field(..., max_length=100)
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator('username')
    @classmethod
    def validate_and_sanitize_username(cls, v: str) -> str:
        sanitized = sanitize_string(v)
        # Enforce regex to only allow safe username characters (alphanumeric, underscore, hyphen)
        if not re.match(r'^[a-zA-Z0-9_\-]+$', sanitized):
            raise ValueError('Username can only contain alphanumeric characters, underscores, and hyphens.')
        return sanitized


class UserLogin(BaseModel):
    email: EmailStr = Field(..., max_length=100)
    password: str = Field(..., min_length=6, max_length=128)


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr

    class Config:
        from_attributes = True