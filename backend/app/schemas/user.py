from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole, AccessLevel

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.EMPLOYEE
    access_level: Optional[AccessLevel] = AccessLevel.CITY
    continent: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    manager_id: Optional[int] = None
    portal_role_id: Optional[int] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    access_level: Optional[AccessLevel] = None
    continent: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    manager_id: Optional[int] = None
    portal_role_id: Optional[int] = None
    is_active: Optional[bool] = None
    # Права делегирования (п. 5.4 ТЗ)
    can_edit_links: Optional[bool] = None
    can_edit_kpi: Optional[bool] = None
    can_set_plan: Optional[bool] = None
    can_adjust_kpi: Optional[bool] = None
    kpi_adjust_limit_pct: Optional[int] = None
    can_manage_team: Optional[bool] = None

    class Config:
        from_attributes = True

class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    display_id: Optional[str] = None # Поле для Азия-Россия-Москва-17

    class Config:
        from_attributes = True