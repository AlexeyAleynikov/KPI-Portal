from fastapi import Depends, HTTPException, status, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, UserRole
from app.auth.service import decode_token


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    access_token: str | None = Cookie(default=None),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    if not access_token:
        raise credentials_exception
    try:
        payload = decode_token(access_token)
        user_id: int = int(payload.get("sub"))
    except Exception:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise credentials_exception
    return user


async def require_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.MANAGER, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager role required")
    return current_user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_user
