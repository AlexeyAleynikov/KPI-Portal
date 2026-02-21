from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.auth.deps import require_admin
from app.models.user import User, UserRole
from app.models.kpi import KpiIndicator, ValueType, SourceType
from app.models.links import LinkSection, Link
from app.models.role import Role

router = APIRouter()


# ─── Roles ────────────────────────────────────────────────────────────────────

class RoleSchema(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None


@router.post("/roles")
async def create_role(body: RoleSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    role = Role(**body.model_dump())
    db.add(role)
    await db.commit()
    await db.refresh(role)
    return {"id": role.id, "name": role.name}


@router.get("/roles")
async def list_roles(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(Role))
    return [{"id": r.id, "name": r.name, "description": r.description} for r in result.scalars()]


# ─── KPI Indicators ───────────────────────────────────────────────────────────

class KpiSchema(BaseModel):
    name_display: str
    name_system: str
    value_type: ValueType = ValueType.NUMBER
    source_type: SourceType = SourceType.MANUAL
    cron_schedule: Optional[str] = None


@router.post("/indicators")
async def create_indicator(body: KpiSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    ind = KpiIndicator(**body.model_dump())
    db.add(ind)
    await db.commit()
    await db.refresh(ind)
    return {"id": ind.id, "name_system": ind.name_system}


@router.get("/indicators")
async def list_indicators(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(KpiIndicator))
    return [{"id": i.id, "name_display": i.name_display, "source_type": i.source_type.value} for i in result.scalars()]


# ─── Link Sections & Links ─────────────────────────────────────────────────────

class SectionSchema(BaseModel):
    name: str
    icon: Optional[str] = None
    order: int = 0
    is_global: bool = False


@router.post("/sections")
async def create_section(body: SectionSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    section = LinkSection(**body.model_dump())
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return {"id": section.id}


class LinkSchema(BaseModel):
    section_id: int
    name: str
    url: str
    icon: Optional[str] = None
    description: Optional[str] = None
    open_in_iframe: bool = False
    order: int = 0


@router.post("/links")
async def create_link(body: LinkSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    link = Link(**body.model_dump())
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return {"id": link.id}


# ─── Delegation ───────────────────────────────────────────────────────────────

class DelegationSchema(BaseModel):
    can_edit_links: bool = False
    can_edit_kpi: bool = False
    can_set_plan: bool = False
    can_adjust_kpi: bool = False
    kpi_adjust_limit_pct: int = 0
    can_manage_team: bool = False


@router.patch("/users/{user_id}/delegation")
async def set_delegation(
    user_id: int,
    body: DelegationSchema,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in body.model_dump().items():
        setattr(user, field, value)
    await db.commit()
    return {"detail": "Delegation updated"}


# ─── Users ────────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(User))
    return [
        {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role.value, "is_active": u.is_active}
        for u in result.scalars()
    ]


@router.patch("/users/{user_id}/role")
async def set_user_role(
    user_id: int,
    role: UserRole,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    await db.commit()
    return {"detail": "Role updated"}
