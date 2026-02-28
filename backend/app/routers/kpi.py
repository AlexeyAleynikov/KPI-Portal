from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from app.database import get_db
from app.auth.deps import get_current_user, require_manager
from app.models.user import User
from app.models.kpi import KpiValue, KpiTarget, KpiIndicator, SourceType
from app.models.role import RoleIndicator
import re


async def compute_formula(formula: str, user_id: int, target_date, db) -> float | None:
    """Вычисляет формулу KPI подставляя значения других показателей по name_system."""
    # Находим все {name_system} в формуле
    names = re.findall(r'\{(\w+)\}', formula)
    if not names:
        return None
    
    values = {}
    for name in names:
        # Находим показатель по name_system
        ind_result = await db.execute(
            select(KpiIndicator).where(KpiIndicator.name_system == name)
        )
        ind = ind_result.scalar_one_or_none()
        if not ind:
            return None
        
        # Берём значение за дату
        val_result = await db.execute(
            select(KpiValue).where(
                KpiValue.indicator_id == ind.id,
                KpiValue.user_id == user_id,
                KpiValue.date == target_date,
            )
        )
        kpi_val = val_result.scalar_one_or_none()
        values[name] = kpi_val.value if kpi_val else 0.0
    
    # Подставляем значения в формулу
    expr = formula
    for name, val in values.items():
        expr = expr.replace(f'{{{name}}}', str(val))
    
    try:
        result = eval(expr, {"__builtins__": {}}, {})
        return round(float(result), 4)
    except Exception:
        return None

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(
    user_date: Optional[date] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Возвращает все KPI текущего пользователя для дашборда."""
    target_date = user_date or date.today()

    # Получаем показатели роли пользователя
    if not current_user.portal_role_id:
        return {"indicators": [], "rating": None}

    ri_result = await db.execute(
        select(RoleIndicator).where(RoleIndicator.role_id == current_user.portal_role_id)
    )
    role_indicators = ri_result.scalars().all()

    result = []
    total_weight = sum(ri.weight for ri in role_indicators)
    weighted_sum = 0.0

    for ri in role_indicators:
        ind: KpiIndicator = ri.indicator  # joined
        val_result = await db.execute(
            select(KpiValue).where(
                KpiValue.indicator_id == ri.indicator_id,
                KpiValue.user_id == current_user.id,
                KpiValue.date == target_date,
            )
        )
        kpi_val = val_result.scalar_one_or_none()

        # Для вычисляемых показателей считаем формулу
        ind_row_check = await db.get(KpiIndicator, ri.indicator_id)
        if ind_row_check and ind_row_check.source_type == SourceType.COMPUTED and ind_row_check.formula and kpi_val is None:
            computed_val = await compute_formula(ind_row_check.formula, current_user.id, target_date, db)
            if computed_val is not None:
                class _FakeVal:
                    value = computed_val
                kpi_val = _FakeVal()

        target_result = await db.execute(
            select(KpiTarget).where(
                KpiTarget.indicator_id == ri.indicator_id,
                KpiTarget.user_id == current_user.id,
                KpiTarget.period_start <= target_date,
                KpiTarget.period_end >= target_date,
            )
        )
        target = target_result.scalar_one_or_none()

        actual = kpi_val.value if kpi_val else None
        plan = target.target_value if target else None

        pct = None
        color = "gray"
        if actual is not None and plan is not None and plan > 0:
            pct = round(actual / plan * 100, 1)
            color = "green" if pct >= 100 else ("yellow" if pct >= 80 else "red")
            weighted_sum += (pct / 100) * ri.weight

        ind_row = await db.get(KpiIndicator, ri.indicator_id)
        result.append({
            "indicator_id": ri.indicator_id,
            "name": ind_row.name_display,
            "value_type": ind_row.value_type.value,
            "actual": actual,
            "plan": plan,
            "percent": pct,
            "weight": ri.weight,
            "color": color,
        })

    rating = round(weighted_sum / total_weight * 100, 1) if total_weight > 0 else None
    return {"date": target_date, "indicators": result, "rating": rating}


@router.get("/history")
async def get_kpi_history(
    indicator_id: int,
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """История значений одного KPI за N дней."""
    result = await db.execute(
        select(KpiValue)
        .where(KpiValue.indicator_id == indicator_id, KpiValue.user_id == current_user.id)
        .order_by(KpiValue.date.desc())
        .limit(days)
    )
    values = result.scalars().all()
    return [{"date": v.date, "value": v.value} for v in reversed(values)]


class AdjustKpiSchema(BaseModel):
    user_id: int
    indicator_id: int
    date: date
    value: float


@router.post("/adjust")
async def adjust_kpi(
    body: AdjustKpiSchema,
    db: AsyncSession = Depends(get_db),
    manager: User = Depends(require_manager),
):
    """Менеджер корректирует значение KPI подчинённого."""
    if not manager.can_adjust_kpi:
        raise HTTPException(status_code=403, detail="You don't have permission to adjust KPI values")

    result = await db.execute(
        select(KpiValue).where(
            KpiValue.indicator_id == body.indicator_id,
            KpiValue.user_id == body.user_id,
            KpiValue.date == body.date,
        )
    )
    kpi_val = result.scalar_one_or_none()
    if kpi_val:
        if manager.kpi_adjust_limit_pct > 0:
            max_delta = abs(kpi_val.value or 0) * manager.kpi_adjust_limit_pct / 100
            if abs(body.value - (kpi_val.value or 0)) > max_delta:
                raise HTTPException(status_code=400, detail=f"Adjustment exceeds ±{manager.kpi_adjust_limit_pct}% limit")
        kpi_val.value = body.value
        kpi_val.adjusted_by_id = manager.id
        from datetime import datetime
        kpi_val.adjusted_at = datetime.utcnow()
    else:
        kpi_val = KpiValue(
            indicator_id=body.indicator_id,
            user_id=body.user_id,
            date=body.date,
            value=body.value,
            adjusted_by_id=manager.id,
        )
        db.add(kpi_val)

    await db.commit()
    return {"detail": "KPI value updated"}
