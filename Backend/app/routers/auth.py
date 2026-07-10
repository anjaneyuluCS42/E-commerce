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
from app.config import SECRET_KEY, ALGORITHM, ENVIRONMENT, FRONTEND_URL
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

import logging
logger = logging.getLogger("uvicorn")

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

    # Trigger Supabase Auth registration if Anon Key is configured
    import httpx
    from app.config import SMTP_USER
    supabase_url = os.environ.get("SUPABASE_URL", "https://kvqccplpvqcjuctjbkre.supabase.co")
    supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY")
    
    supabase_auth_success = False
    if supabase_anon_key:
        try:
            # Dynamically extract origin from headers
            origin = request.headers.get("origin")
            if not origin:
                referer = request.headers.get("referer")
                if referer:
                    from urllib.parse import urlparse
                    parsed_url = urlparse(referer)
                    origin = f"{parsed_url.scheme}://{parsed_url.netloc}"
            if not origin:
                origin = FRONTEND_URL
            origin = origin.rstrip("/")
            redirect_url = f"{origin}/login?verified=true"

            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{supabase_url}/auth/v1/signup?redirect_to={redirect_url}",
                    headers={
                        "apikey": supabase_anon_key,
                        "Content-Type": "application/json"
                    },
                    json={
                        "email": user.email,
                        "password": user.password,
                        "data": {
                            "username": user.username
                        }
                    }
                )
                if resp.status_code in (200, 201):
                    supabase_auth_success = True
                    logger.info(f"Successfully registered user in Supabase Auth: {user.email}")
                else:
                    logger.error(f"Supabase Auth signup returned: {resp.status_code} - {resp.text}")
                    try:
                        err_data = resp.json()
                        error_msg = err_data.get("msg", "Failed to register with authentication service.")
                    except:
                        error_msg = "Failed to register with authentication service."
                    raise HTTPException(status_code=resp.status_code, detail=error_msg)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error registering in Supabase Auth: {e}")
            raise HTTPException(status_code=500, detail="Failed to connect to authentication service.")

    # Save to our database only if auth succeeded (or wasn't configured)
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

    # Fallback to local email simulation if Supabase Auth wasn't used
    if not supabase_auth_success:
        send_verification_email_task.delay(user.email, user.username, verification_token)
        
    send_welcome_email.delay(user.email, user.username)

    backend_url = os.environ.get("BACKEND_URL", "https://e-commerce-pice.onrender.com")
    response_data = {
        "message": "Registration successful! Please check your email to verify your account."
    }
    
    # If Supabase Auth is not set up and no SMTP_USER is set up, return a testing verification link
    if not supabase_auth_success and not SMTP_USER:
        response_data["test_verification_url"] = f"{backend_url}/auth/verify?token={verification_token}"
        
    return response_data


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    import httpx
    # Check if user exists in public.users
    res = await db.execute(select(User).where(User.email == payload.email))
    db_user = res.scalar_one_or_none()
    
    supabase_url = os.environ.get("SUPABASE_URL", "https://kvqccplpvqcjuctjbkre.supabase.co")
    supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY")
    
    if db_user and supabase_anon_key:
        try:
            async with httpx.AsyncClient() as client:
                origin = request.headers.get("origin")
                if not origin:
                    referer = request.headers.get("referer")
                    if referer:
                        from urllib.parse import urlparse
                        parsed_url = urlparse(referer)
                        origin = f"{parsed_url.scheme}://{parsed_url.netloc}"
                if not origin:
                    origin = FRONTEND_URL
                origin = origin.rstrip("/")
                redirect_url = f"{origin}/reset-password"
                
                resp = await client.post(
                    f"{supabase_url}/auth/v1/recover?redirect_to={redirect_url}",
                    headers={
                        "apikey": supabase_anon_key,
                        "Content-Type": "application/json"
                    },
                    json={"email": payload.email}
                )
                if resp.status_code in (200, 201):
                    logger.info(f"Successfully sent password recovery email via Supabase to: {payload.email}")
                else:
                    logger.error(f"Supabase Auth recover returned: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"Error requesting password recovery in Supabase: {e}")
            
    return {"message": "If the email exists, a password reset link has been sent."}


@router.post("/reset-password")
@limiter.limit("3/minute")
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    import httpx
    # The payload.token here will be the access_token passed from the frontend url fragment
    supabase_url = os.environ.get("SUPABASE_URL", "https://kvqccplpvqcjuctjbkre.supabase.co")
    supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY")
    
    if not supabase_anon_key:
        raise HTTPException(status_code=400, detail="Supabase Auth is not configured.")
        
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{supabase_url}/auth/v1/user",
                headers={
                    "apikey": supabase_anon_key,
                    "Authorization": f"Bearer {payload.token}"
                }
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
                
            user_data = resp.json()
            email = user_data.get("email")
            if not email:
                raise HTTPException(status_code=400, detail="Could not retrieve email from token.")
    except Exception as e:
        logger.error(f"Error verifying reset token with Supabase Auth: {e}")
        raise HTTPException(status_code=400, detail="Failed to verify reset token.")
        
    # Find user in our database
    res = await db.execute(select(User).where(User.email == email))
    db_user = res.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Update password in our database
    db_user.password = hash_password(payload.new_password)
    # Also ensure user is verified
    db_user.is_verified = True
    await db.commit()
    
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

    # Check verification status
    try:
        res = await db.execute(
            text("SELECT email_confirmed_at FROM auth.users WHERE email = :email"),
            {"email": db_user.email}
        )
        row = res.fetchone()
        if row:
            email_confirmed_at = row[0]
            if not email_confirmed_at:
                raise HTTPException(
                    status_code=400,
                    detail="Please verify your email address before logging in."
                )
            else:
                # Sync verified state to our local public.users table
                if not db_user.is_verified:
                    db_user.is_verified = True
                    await db.commit()
        else:
            # Fallback for users not in auth.users (e.g. old users)
            if not db_user.is_verified:
                raise HTTPException(
                    status_code=400,
                    detail="Please verify your email address before logging in."
                )
    except Exception as e:
        logger.error(f"Error checking Supabase Auth verification state: {e}")
        # Fallback to local is_verified flag
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


@router.get("/test-db-query")
async def test_db_query(email: str, db: AsyncSession = Depends(get_db)):
    import traceback
    from sqlalchemy import text
    from app.database import engine
    try:
        res = await db.execute(
            text("SELECT email_confirmed_at FROM auth.users WHERE email = :email"),
            {"email": email}
        )
        row = res.fetchone()
        if row:
            return {"status": "success", "row": str(row), "email_confirmed_at": str(row[0])}
            
        # Try direct connection test
        async with engine.connect() as conn:
            res = await conn.execute(
                text("SELECT email_confirmed_at FROM auth.users WHERE email = :email"),
                {"email": email}
            )
            row = res.fetchone()
            return {"status": "success_direct", "row": str(row)}
            
    except Exception as e:
        return {
            "status": "error",
            "error_type": str(type(e)),
            "error_message": str(e),
            "traceback": traceback.format_exc()
        }