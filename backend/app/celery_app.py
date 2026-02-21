from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "portal",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.kpi_sync"],
)

celery_app.conf.timezone = "UTC"
celery_app.conf.beat_schedule = {
    "sync-kpi-daily": {
        "task": "app.tasks.kpi_sync.sync_all_kpi",
        "schedule": crontab(hour=1, minute=0),  # каждый день в 01:00 UTC
    },
}
