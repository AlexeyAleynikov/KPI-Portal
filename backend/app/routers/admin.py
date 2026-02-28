from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List

from app.database import get_db
from app.auth.deps import require_admin
from app.models.user import User, UserRole
from app.models.kpi import KpiIndicator, ValueType, SourceType
from app.models.links import LinkSection, Link
from app.models.role import Role
from app.schemas.user import UserRead, UserUpdate

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
    period_type: str = "month"
    cron_schedule: Optional[str] = None
    formula: Optional[str] = None


@router.post("/indicators")
async def create_indicator(body: KpiSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    ind = KpiIndicator(**body.model_dump())
    db.add(ind)
    await db.commit()
    await db.refresh(ind)
    return {"id": ind.id, "name_system": ind.name_system}

@router.delete("/indicators/{indicator_id}")
async def delete_indicator(indicator_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    ind = await db.get(KpiIndicator, indicator_id)
    if not ind:
        raise HTTPException(status_code=404, detail="Indicator not found")
    await db.delete(ind)
    await db.commit()
    return {"detail": "Indicator deleted"}

@router.patch("/indicators/{indicator_id}")
async def update_indicator(indicator_id: int, body: KpiSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    ind = await db.get(KpiIndicator, indicator_id)
    if not ind:
        raise HTTPException(status_code=404, detail="Indicator not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(ind, field, value)
    await db.commit()
    return {"detail": "Indicator updated"}

@router.get("/indicators")
async def list_indicators(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(KpiIndicator))
    return [{"id": i.id, "name_display": i.name_display, "name_system": i.name_system, "value_type": i.value_type.value, "source_type": i.source_type.value, "period_type": i.period_type if i.period_type else "month", "formula": i.formula} for i in result.scalars()]


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
    section_id: Optional[int] = None
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

@router.patch("/links/{link_id}")
async def update_link(link_id: int, body: LinkSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    link = await db.get(Link, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(link, field, value)
    await db.commit()
    return {"detail": "Link updated"}

@router.delete("/links/{link_id}")
async def delete_link(link_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    link = await db.get(Link, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    await db.delete(link)
    await db.commit()
    return {"detail": "Link deleted"}

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

#@router.get("/users")
#async def list_users(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
#    result = await db.execute(select(User))
#    return [
#        {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role.value, "is_active": u.is_active}
#        for u in result.scalars()
#    ]

@router.get("/users", response_model=List[UserRead])
async def list_users(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(User))
    users = result.scalars().all()
    for u in users:
        u.display_id = u.display_name()
    return users

@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int, 
    obj_in: UserUpdate, 
    db: AsyncSession = Depends(get_db), 
    _=Depends(require_admin)
):
    """Обновление профиля, ролей, локации и прав делегирования (п. 5.4-5.5 ТЗ)"""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    user.display_id = user.display_name()
    return user

@router.delete("/users/{user_id}")
async def deactivate_user(user_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    """Мягкое удаление пользователя"""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = False
    await db.commit()
    return {"detail": f"User {user_id} deactivated"}

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


@router.delete("/sections/{section_id}")
async def delete_section(section_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    section = await db.get(LinkSection, section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    await db.delete(section)
    await db.commit()
    return {"detail": "Section deleted"}


# ─── Geo dictionaries ─────────────────────────────────────────────────────────
from app.models.geo import Continent, Country, City

@router.get("/geo/continents")
async def list_continents(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(Continent).order_by(Continent.name))
    return [{"id": c.id, "name": c.name} for c in result.scalars()]

@router.post("/geo/continents")
async def create_continent(name: str, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    c = Continent(name=name)
    db.add(c); await db.commit(); await db.refresh(c)
    return {"id": c.id, "name": c.name}

@router.patch("/geo/continents/{id}")
async def update_continent(id: int, name: str, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    c = await db.get(Continent, id)
    if not c: raise HTTPException(status_code=404, detail="Not found")
    c.name = name; await db.commit()
    return {"id": c.id, "name": c.name}

@router.delete("/geo/continents/{id}")
async def delete_continent(id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    c = await db.get(Continent, id)
    if not c: raise HTTPException(status_code=404, detail="Not found")
    await db.delete(c); await db.commit()
    return {"detail": "Deleted"}


@router.get("/geo/countries")
async def list_countries(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(Country).order_by(Country.name))
    return [{"id": c.id, "name": c.name} for c in result.scalars()]

@router.post("/geo/countries")
async def create_country(name: str, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    c = Country(name=name)
    db.add(c); await db.commit(); await db.refresh(c)
    return {"id": c.id, "name": c.name}

@router.patch("/geo/countries/{id}")
async def update_country(id: int, name: str, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    c = await db.get(Country, id)
    if not c: raise HTTPException(status_code=404, detail="Not found")
    c.name = name; await db.commit()
    return {"id": c.id, "name": c.name}

@router.delete("/geo/countries/{id}")
async def delete_country(id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    c = await db.get(Country, id)
    if not c: raise HTTPException(status_code=404, detail="Not found")
    await db.delete(c); await db.commit()
    return {"detail": "Deleted"}


@router.get("/geo/cities")
async def list_cities(continent_id: Optional[int] = None, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    q = select(City).order_by(City.name)
    if continent_id:
        q = q.where(City.continent_id == continent_id)
    result = await db.execute(q)
    return [{"id": c.id, "name": c.name, "continent_id": c.continent_id} for c in result.scalars()]

@router.post("/geo/cities")
async def create_city(name: str, continent_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    c = City(name=name, continent_id=continent_id)
    db.add(c); await db.commit(); await db.refresh(c)
    return {"id": c.id, "name": c.name, "continent_id": c.continent_id}

@router.patch("/geo/cities/{id}")
async def update_city(id: int, name: str, continent_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    c = await db.get(City, id)
    if not c: raise HTTPException(status_code=404, detail="Not found")
    c.name = name; c.continent_id = continent_id; await db.commit()
    return {"id": c.id, "name": c.name}

@router.delete("/geo/cities/{id}")
async def delete_city(id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    c = await db.get(City, id)
    if not c: raise HTTPException(status_code=404, detail="Not found")
    await db.delete(c); await db.commit()
    return {"detail": "Deleted"}


# ─── KPI Targets (планы) ──────────────────────────────────────────────────────
from app.models.kpi import KpiTarget, KpiValue
from datetime import date

class TargetSchema(BaseModel):
    user_id: int
    indicator_id: int
    period_start: date
    period_end: date
    target_value: float

@router.get("/targets")
async def list_targets(user_id: Optional[int] = None, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    q = select(KpiTarget)
    if user_id:
        q = q.where(KpiTarget.user_id == user_id)
    result = await db.execute(q)
    return [{"id": t.id, "user_id": t.user_id, "indicator_id": t.indicator_id,
             "period_start": t.period_start, "period_end": t.period_end,
             "target_value": t.target_value} for t in result.scalars()]

@router.post("/targets")
async def create_target(body: TargetSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    t = KpiTarget(**body.model_dump())
    db.add(t); await db.commit(); await db.refresh(t)
    return {"id": t.id}

@router.patch("/targets/{target_id}")
async def update_target(target_id: int, body: TargetSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    t = await db.get(KpiTarget, target_id)
    if not t: raise HTTPException(status_code=404, detail="Not found")
    for f, v in body.model_dump(exclude_unset=True).items():
        setattr(t, f, v)
    await db.commit()
    return {"detail": "Updated"}

@router.delete("/targets/{target_id}")
async def delete_target(target_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    t = await db.get(KpiTarget, target_id)
    if not t: raise HTTPException(status_code=404, detail="Not found")
    await db.delete(t); await db.commit()
    return {"detail": "Deleted"}


# ─── KPI Values (фактические значения) ───────────────────────────────────────
class ValueSchema(BaseModel):
    user_id: int
    indicator_id: int
    date: date
    value: float

@router.get("/values")
async def list_values(user_id: Optional[int] = None, indicator_id: Optional[int] = None,
                      db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    q = select(KpiValue)
    if user_id: q = q.where(KpiValue.user_id == user_id)
    if indicator_id: q = q.where(KpiValue.indicator_id == indicator_id)
    result = await db.execute(q.order_by(KpiValue.date.desc()).limit(200))
    return [{"id": v.id, "user_id": v.user_id, "indicator_id": v.indicator_id,
             "date": v.date, "value": v.value} for v in result.scalars()]

@router.post("/values")
async def create_value(body: ValueSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    v = KpiValue(**body.model_dump())
    db.add(v); await db.commit(); await db.refresh(v)
    return {"id": v.id}

@router.patch("/values/{value_id}")
async def update_value(value_id: int, body: ValueSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    v = await db.get(KpiValue, value_id)
    if not v: raise HTTPException(status_code=404, detail="Not found")
    for f, val in body.model_dump(exclude_unset=True).items():
        setattr(v, f, val)
    await db.commit()
    return {"detail": "Updated"}

@router.delete("/values/{value_id}")
async def delete_value(value_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    v = await db.get(KpiValue, value_id)
    if not v: raise HTTPException(status_code=404, detail="Not found")
    await db.delete(v); await db.commit()
    return {"detail": "Deleted"}


# ─── Dimensions (измерения/разрезы) ───────────────────────────────────────────
from app.models.dimension import Dimension, DimensionValue

class DimensionSchema(BaseModel):
    name: str
    name_system: str

class DimensionValueSchema(BaseModel):
    value: str

@router.get("/dimensions")
async def list_dimensions(db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(Dimension).order_by(Dimension.name))
    dims = result.scalars().all()
    out = []
    for d in dims:
        vals = await db.execute(select(DimensionValue).where(DimensionValue.dimension_id == d.id).order_by(DimensionValue.value))
        out.append({"id": d.id, "name": d.name, "name_system": d.name_system,
                    "values": [{"id": v.id, "value": v.value} for v in vals.scalars()]})
    return out

@router.post("/dimensions")
async def create_dimension(body: DimensionSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    d = Dimension(**body.model_dump())
    db.add(d); await db.commit(); await db.refresh(d)
    return {"id": d.id, "name": d.name, "name_system": d.name_system}

@router.patch("/dimensions/{dim_id}")
async def update_dimension(dim_id: int, body: DimensionSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    d = await db.get(Dimension, dim_id)
    if not d: raise HTTPException(status_code=404, detail="Not found")
    d.name = body.name; d.name_system = body.name_system
    await db.commit()
    return {"id": d.id, "name": d.name}

@router.delete("/dimensions/{dim_id}")
async def delete_dimension(dim_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    d = await db.get(Dimension, dim_id)
    if not d: raise HTTPException(status_code=404, detail="Not found")
    await db.delete(d); await db.commit()
    return {"detail": "Deleted"}

@router.post("/dimensions/{dim_id}/values")
async def create_dimension_value(dim_id: int, body: DimensionValueSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    v = DimensionValue(dimension_id=dim_id, value=body.value)
    db.add(v); await db.commit(); await db.refresh(v)
    return {"id": v.id, "value": v.value}

@router.patch("/dimensions/values/{val_id}")
async def update_dimension_value(val_id: int, body: DimensionValueSchema, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    v = await db.get(DimensionValue, val_id)
    if not v: raise HTTPException(status_code=404, detail="Not found")
    v.value = body.value; await db.commit()
    return {"id": v.id, "value": v.value}

@router.delete("/dimensions/values/{val_id}")
async def delete_dimension_value(val_id: int, db: AsyncSession = Depends(get_db), _=Depends(require_admin)):
    v = await db.get(DimensionValue, val_id)
    if not v: raise HTTPException(status_code=404, detail="Not found")
    await db.delete(v); await db.commit()
    return {"detail": "Deleted"}
