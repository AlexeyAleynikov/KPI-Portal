import json
import urllib.request
import urllib.parse
from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.redis_client import get_redis
from app.config import settings
from app.models.user import User
from app.auth.service import send_otp
from fastapi import Depends

router = APIRouter()


def tg_send(chat_id: str, text: str) -> None:
    """Отправить сообщение пользователю в Telegram."""
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }).encode()
    urllib.request.urlopen(url, data=data, timeout=5)


@router.post("/webhook")
async def telegram_webhook(request: Request, db: AsyncSession = Depends(get_db), redis=Depends(get_redis)):
    """Принимает входящие сообщения от Telegram."""
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=503, detail="Telegram не настроен")

    body = await request.json()
    message = body.get("message", {})
    chat_id = str(message.get("chat", {}).get("id", ""))
    text = message.get("text", "").strip()

    if not chat_id:
        return {"ok": True}

    # /start — приветствие
    if text == "/start":
        tg_send(chat_id,
            "👋 Добро пожаловать в <b>KPI Portal</b>!\n\n"
            "Введите ваш рабочий email чтобы получить код для входа:"
        )
        return {"ok": True}

    # Пользователь ввёл email
    if "@" in text:
        email = text.lower()
        result = await db.execute(
            select(User).where(User.email == email, User.is_active == True)
        )
        user = result.scalar_one_or_none()

        if not user:
            tg_send(chat_id,
                "❌ Пользователь с таким email не найден.\n"
                "Проверьте email или обратитесь к администратору."
            )
            return {"ok": True}

        # Сохраняем telegram_chat_id если ещё не привязан
        if not user.telegram_chat_id:
            user.telegram_chat_id = chat_id
            user.telegram_confirmed = True
            await db.commit()
        elif user.telegram_chat_id != chat_id:
            tg_send(chat_id,
                "❌ Этот email привязан к другому Telegram-аккаунту."
            )
            return {"ok": True}

        # Генерируем и отправляем OTP
        import random, string
        code = "".join(random.choices(string.digits, k=6))
        await redis.setex(f"otp:code:{email}", settings.OTP_TTL_MINUTES * 60, code)

        tg_send(chat_id,
            f"🔐 Ваш код для входа:\n\n"
            f"<b>{code}</b>\n\n"
            f"Действителен {settings.OTP_TTL_MINUTES} минут.\n"
            f"Введите его на сайте."
        )
        return {"ok": True}

    # Непонятное сообщение
    tg_send(chat_id, "Введите ваш рабочий email для получения кода.")
    return {"ok": True}


@router.get("/info")
async def telegram_info():
    """Возвращает имя бота для фронтенда."""
    return {"bot_username": settings.TELEGRAM_BOT_USERNAME}