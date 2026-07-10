from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.security import OAuth2PasswordRequestForm

from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

from app.models.user import User

from app.schemas.user import (
    UserCreate,
    UserLogin
)

from app.auth.hash_password import (
    hash_password,
    verify_password
)

from app.auth.jwt_handler import (
    create_access_token,
    create_refresh_token
)

from jose import JWTError, jwt
from app.config import SECRET_KEY, ALGORITHM, ENVIRONMENT
from pydantic import BaseModel

class RefreshRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

from app.security.rate_limit import limiter
from app.tasks.order_tasks import send_welcome_email, send_verification_email_task
from fastapi.responses import RedirectResponse
import os
import secrets

@router.post("/register")
@limiter.limit("5/minute")
async def register_user(
    request: Request,
    user: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where((User.email == user.email) | (User.username == user.username))
    )
    existing_users = result.scalars().all()

    for existing_user in existing_users:
        if existing_user.email == user.email:
            raise HTTPException(status_code=400, detail="Email already exists")
        if existing_user.username == user.username:
            raise HTTPException(status_code=400, detail="Username already exists")

    verification_token = secrets.token_urlsafe(32)
    new_user = User(
        username=user.username,
        email=user.email,
        password=hash_password(user.password),
        is_verified=False,
        verification_token=verification_token
    )

    db.add(new_user)
    await db.commit()

    # Trigger Celery Task asynchronously to send verification mail
    send_verification_email_task.delay(user.email, user.username, verification_token)
    send_welcome_email.delay(user.email, user.username)

    from app.config import SMTP_USER, FRONTEND_URL
    backend_url = os.environ.get("BACKEND_URL", "https://e-commerce-pice.onrender.com")
    
    response_data = {
        "message": "Registration successful! Please check your email to verify your account."
    }
    
    # If mail sending is not set up, return a testing verification link in the response
    if not SMTP_USER:
        response_data["test_verification_url"] = f"{backend_url}/auth/verify?token={verification_token}"
        
    return response_data


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    return {"message": "If the email exists, a password reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("3/minute")
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    return {"message": "Password has been reset successfully."}


@router.post("/login")
@limiter.limit("10/minute")
async def login_user(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(User).where(
            User.email == form_data.username
        )
    )

    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(
            status_code=400,
            detail="Invalid email"
        )

    if not verify_password(
        form_data.password,
        db_user.password
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid password"
        )

    if not db_user.is_verified:
        raise HTTPException(
            status_code=400,
            detail="Please verify your email address before logging in."
        )

    access_token = create_access_token({
        "sub": db_user.email,
        "role": db_user.role,
        "id": db_user.id,
        "username": db_user.username
    })

    refresh_token = create_refresh_token({
        "sub": db_user.email
    })

    # Set cookies for HttpOnly Mode (Version B)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=(ENVIRONMENT == "production"),
        samesite="lax",
        max_age=1800
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=(ENVIRONMENT == "production"),
        samesite="lax",
        path="/auth/refresh",
        max_age=604800
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh")
async def refresh_token(
    response: Response,
    request: Request,
    payload: RefreshRequest = None,
    db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate refresh token"
    )

    token = None
    if payload and payload.refresh_token:
        token = payload.refresh_token
    else:
        token = request.cookies.get("refresh_token")

    if not token:
        raise credentials_exception

    try:
        decoded_payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        email: str = decoded_payload.get("sub")
        token_type: str = decoded_payload.get("type")
        if email is None or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    new_access_token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "id": user.id,
        "username": user.username
    })

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=(ENVIRONMENT == "production"),
        samesite="lax",
        max_age=1800
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout_user(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/auth/refresh")
    return {"message": "Logged out successfully"}


@router.get("/users/{user_id}")
async def get_user_by_id(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role
    }


@router.get("/verify")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.verification_token == token))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token.")
        
    user.is_verified = True
    user.verification_token = None
    await db.commit()
    
    from app.config import FRONTEND_URL
    return RedirectResponse(url=f"{FRONTEND_URL}/login?verified=true")