from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles

from app.routers.product import (
    router as product_router )

from app.models.user import User
from app.models.product import Product
from app.models.category import Category

from app.database import engine, Base, get_db
from sqlalchemy.ext.asyncio import AsyncSession

from app.routers.cart import (
    router as cart_router
)

from app.routers.websocket import (
    router as websocket_router
)

from app.routers.auth import router as auth_router
from app.routers.tasks import router as tasks_router

from app.routers.ai import router as ai_router

from app.models.order import (
    Order,
    OrderItem
)

from app.routers.order import (
    router as order_router
)

from app.auth.oauth2 import get_current_user

from app.config import ENVIRONMENT, FRONTEND_URL, ROOT_PATH

app = FastAPI(root_path=ROOT_PATH)

from slowapi.errors import RateLimitExceeded
from app.security.rate_limit import limiter

app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request, exc: RateLimitExceeded):
    logger.warning(f"Rate limit exceeded on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down and try again later."}
    )

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

logger = logging.getLogger("uvicorn")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    errors = exc.errors()
    # Format a simple user-readable detail string
    detail = "Validation error: " + ", ".join([f"'{err['loc'][-1]}' {err['msg']}" for err in errors])
    logger.warning(f"Validation error on {request.url.path}: {detail}")
    return JSONResponse(
        status_code=422,
        content={"detail": detail, "errors": errors}
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc: StarletteHTTPException):
    logger.error(f"HTTP exception {exc.status_code} on {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    logger.critical(f"Unhandled server error on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."}
    )

app.include_router(product_router)
app.include_router(cart_router)
app.include_router(order_router)
app.include_router(websocket_router)
app.include_router(tasks_router)
app.include_router(ai_router)

# Phase 1: Dynamic CORS Configuration based on Environment
if ENVIRONMENT == "production":
    allowed_origins = [
        FRONTEND_URL, 
        # Add other production domains here (e.g., "https://www.yourdomain.com")
    ]
else:
    # Development: Allow localhost for Vite, etc.
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        FRONTEND_URL
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"], # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"], # Allow all headers
)

from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Exclude Swagger/Redoc from strict Content-Security-Policy to allow loading CDN resources
    path = request.url.path.rstrip("/")
    if path.startswith("/docs") or path.startswith("/redoc") or request.url.path == "/openapi.json":
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' https://cdn.jsdelivr.net; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: uploads/ https://fastapi.tiangolo.com;"
        )
    else:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: uploads/;"
        )
        
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if ENVIRONMENT == "production":
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    return response

@app.middleware("http")
async def add_cache_control_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/uploads/"):
        response.headers["Cache-Control"] = "public, max-age=86400"
    return response

@app.middleware("http")
async def add_request_id_header(request: Request, call_next):
    import uuid
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


@app.on_event("startup")
async def startup():
    from sqlalchemy import text
    async with engine.begin() as conn:
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        except Exception as e:
            logger.warning(f"Could not create pg_trgm extension: {e}")
        await conn.run_sync(
            Base.metadata.create_all
        )


app.include_router(auth_router)


@app.get("/health", tags=["Monitoring"])
async def health_check(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    from app.cache.redis_client import redis_client
    
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        
    redis_status = "healthy"
    try:
        await redis_client.ping()
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"
        
    status_code = 200
    if "unhealthy" in db_status or "unhealthy" in redis_status:
        status_code = 503
        
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if status_code == 200 else "unhealthy",
            "database": db_status,
            "redis": redis_status
        }
    )


@app.get("/", tags = ["Home"])
async def root():
    return {
        "message": "E-Commerce Backend Running"
    }


@app.get("/profile", tags = ["users"])
async def profile(
    current_user = Depends(get_current_user)
):

    return {
        "message": "Protected Route",
        "user": current_user.email
    }

app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)