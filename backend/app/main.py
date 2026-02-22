from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users, kpi, links, admin
from app.routers import telegram


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if settings.TELEGRAM_BOT_TOKEN and settings.FRONTEND_URL:
        import urllib.request
        webhook_url = f"{settings.FRONTEND_URL}/api/telegram/webhook"
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/setWebhook?url={webhook_url}"
        try:
            urllib.request.urlopen(url, timeout=5)
            print(f"[Telegram] Webhook зарегистрирован: {webhook_url}")
        except Exception as e:
            print(f"[Telegram] Ошибка регистрации webhook: {e}")
    yield
    # Shutdown


app = FastAPI(
    title="Corporate Portal API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(kpi.router, prefix="/api/kpi", tags=["kpi"])
app.include_router(links.router, prefix="/api/links", tags=["links"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(telegram.router, prefix="/api/telegram", tags=["telegram"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
