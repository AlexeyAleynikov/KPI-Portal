"""
Celery-задача синхронизации KPI.
MVP: раз в день. Расширяется по cron-расписанию каждого показателя.
"""
import asyncio
from datetime import date

from app.celery_app import celery_app


@celery_app.task(name="app.tasks.kpi_sync.sync_all_kpi")
def sync_all_kpi():
    asyncio.run(_sync())


async def _sync():
    from app.database import AsyncSessionLocal
    from app.models.kpi import KpiIndicator, SourceType

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(
            select(KpiIndicator).where(KpiIndicator.is_active == True)
        )
        indicators = result.scalars().all()

        for ind in indicators:
            try:
                if ind.source_type == SourceType.REST_API:
                    await _sync_rest_api(db, ind)
                elif ind.source_type == SourceType.MANUAL:
                    pass  # вводится вручную — пропускаем
                elif ind.source_type == SourceType.COMPUTED:
                    await _sync_computed(db, ind)
                # TODO: database, csv, xlsx, sftp, webhook

                from datetime import datetime
                ind.last_run_at = datetime.utcnow()
                ind.last_run_status = "success"
            except Exception as e:
                from datetime import datetime
                ind.last_run_at = datetime.utcnow()
                ind.last_run_status = f"error: {str(e)[:200]}"

        await db.commit()


async def _sync_rest_api(db, indicator):
    """Пример: GET запрос к API, ожидаем [{user_id: X, value: Y}]"""
    import httpx
    from app.models.kpi import KpiDataSource, KpiValue

    ds = indicator.data_source
    if not ds or not ds.api_url:
        return

    headers = {}
    if ds.api_auth_type == "bearer":
        headers["Authorization"] = f"Bearer {ds.api_auth_value}"
    elif ds.api_auth_type == "api_key":
        headers["X-API-Key"] = ds.api_auth_value

    async with httpx.AsyncClient() as client:
        resp = await client.request(ds.api_method or "GET", ds.api_url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()  # ожидаем список [{user_id, value}]

    today = date.today()
    for row in data:
        from sqlalchemy import select
        existing = await db.execute(
            select(KpiValue).where(
                KpiValue.indicator_id == indicator.id,
                KpiValue.user_id == row["user_id"],
                KpiValue.date == today,
            )
        )
        kv = existing.scalar_one_or_none()
        if kv:
            kv.value = row["value"]
        else:
            db.add(KpiValue(indicator_id=indicator.id, user_id=row["user_id"], date=today, value=row["value"]))


async def _sync_computed(db, indicator):
    """Вычисляемый показатель: простая арифметика над другими показателями."""
    # Placeholder — конкретная логика зависит от формата formula
    pass
