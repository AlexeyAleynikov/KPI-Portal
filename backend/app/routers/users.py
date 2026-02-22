from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List

from app.database import get_db
from app.auth.deps import require_manager, require_admin, get_current_user
from app.models.user import User, UserRole, AccessLevel
from app.schemas.user import UserRead

router = APIRouter()


class CreateUserSchema(BaseModel):
    email: EmailStr
    full_name: str
    city: str
    country: Optional[str] = None
    continent: Optional[str] = None
    role: UserRole = UserRole.EMPLOYEE
    portal_role_id: Optional[int] = None


@router.get("/team", response_model=List[UserRead])
async def get_team(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Список подчиненных.
    Админ видит всех, Менеджер — только свою команду.
    """
    if current_user.role == UserRole.ADMIN:
        result = await db.execute(select(User).where(User.is_active == True))
    else:
        result = await db.execute(
            select(User).where(User.manager_id == current_user.id, User.is_active == True)
        )
    
    users = result.scalars().all()
    for u in users:
        u.display_id = u.display_name()
    return users


@router.post("/", response_model=UserRead)
async def create_user(
    body: CreateUserSchema,
    db: AsyncSession = Depends(get_db),
    manager: User = Depends(require_manager),
):
    """Менеджер добавляет нового сотрудника в свою команду."""
    if not manager.can_manage_team:
        raise HTTPException(status_code=403, detail="No permission to manage team")

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        email=body.email,
        full_name=body.full_name,
        city=body.city,
        country=body.country or manager.country,
        continent=body.continent or manager.continent,
        role=body.role if body.role != UserRole.ADMIN else UserRole.EMPLOYEE,
        portal_role_id=body.portal_role_id,
        manager_id=manager.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    user.display_id = user.display_name()
    return user


@router.delete("/{user_id}")
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    manager: User = Depends(require_manager),
):
    if not manager.can_manage_team:
        raise HTTPException(status_code=403, detail="No permission to manage team")

    result = await db.execute(
        select(User).where(User.id == user_id, User.manager_id == manager.id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in your team")

    user.is_active = False
    await db.commit()
    return {"detail": "User deactivated"}
