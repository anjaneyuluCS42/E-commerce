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
from app.tasks.order_tasks import send_welcome_email

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

    new_user = User(
        username=user.username,
        email=user.email,
        password=hash_password(user.password)
    )

    db.add(new_user)
    await db.commit()

    # Phase 8: Trigger Celery Task asynchronously
    send_welcome_email.delay(user.email, user.username)

    return {"message": "User registered successfully"}


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