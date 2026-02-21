"""
auth/service.py — OTP-генерация, верификация, JWT
"""
import random
import string
from datetime import datetime, timedelta

import redis.asyncio as aioredis
from jose import JWTError, jwt

from app.config import settings


# ─── OTP ──────────────────────────────────────────────────────────────────────

def _otp_key(email: str) -> str:
    return f"otp:code:{email}"

def _attempt_key(ip: str) -> str:
    return f"otp:attempts:{ip}"


async def send_otp(redis: aioredis.Redis, email: str, ip: str) -> str:
    """Генерирует OTP, сохраняет в Redis, возвращает код (для отправки по email)."""
    # Проверка лимита попыток по IP
    attempt_key = _attempt_key(ip)
    attempts = await redis.get(attempt_key)
    if attempts and int(attempts) >= settings.OTP_MAX_ATTEMPTS_PER_HOUR:
        raise ValueError("Too many OTP attempts from this IP")

    code = "".join(random.choices(string.digits, k=6))
    ttl = settings.OTP_TTL_MINUTES * 60

    await redis.setex(_otp_key(email), ttl, code)

    # Увеличиваем счётчик попыток (TTL = 1 час)
    pipe = redis.pipeline()
    pipe.incr(attempt_key)
    pipe.expire(attempt_key, 3600)
    await pipe.execute()

    return code


async def verify_otp(redis: aioredis.Redis, email: str, code: str) -> bool:
    stored = await redis.get(_otp_key(email))
    if stored and stored == code:
        await redis.delete(_otp_key(email))
        return True
    return False


# ─── JWT ──────────────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["type"] = "access"
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=settings.REFRESH_TOKEN_EXPIRE_HOURS)
    payload["type"] = "refresh"
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise ValueError("Invalid or expired token")
