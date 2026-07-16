from fastapi import Depends
from fastapi import HTTPException
from fastapi.security import OAuth2PasswordBearer

from jose import JWTError, jwt

from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User

from app.config import SECRET_KEY, ALGORITHM


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


from fastapi import Request


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)):

    credentials_exception = HTTPException(
        status_code=401, detail="Could not validate credentials"
    )

    token = None
    authorization: str = request.headers.get("Authorization")
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    if not token:
        token = request.cookies.get("access_token")

    if not token:
        raise credentials_exception

    try:

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        email: str = payload.get("sub")

        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.email == email))

    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


# Phase 10: Role-Based Access Control (RBAC) Dependency
async def get_current_admin_user(current_user: User = Depends(get_current_user)):
    """
    Dependency that enforces Admin-only access.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden. Admin access required.")
    return current_user
