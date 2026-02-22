from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.redis_client import get_redis
from app.models.user import User
from app.models.audit import AuditLog
from app.auth.service import send_otp, verify_otp, create_access_token, create_refresh_token, decode_token
from app.auth.email import send_otp_email
from app.auth.deps import get_current_user
from app.config import settings

router = APIRouter()


class OtpRequestSchema(BaseModel):
    email: EmailStr


class OtpVerifySchema(BaseModel):
    email: EmailStr
    code: str


@router.post("/otp/send")
async def otp_send(
    body: OtpRequestSchema,
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    ip = request.client.host
    result = await db.execute(select(User).where(User.email == body.email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        # Не раскрываем, существует ли пользователь
        return {"detail": "If this email is registered, you'll receive a code."}

    try:
        code = await send_otp(redis, body.email, ip)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))

    send_otp_email(body.email, code, telegram_chat_id=user.telegram_chat_id, otp_channel=user.otp_channel)

    db.add(AuditLog(user_id=user.id, action="otp_sent", ip_address=ip, method="email_otp"))
    await db.commit()
    return {"detail": "If this email is registered, you'll receive a code."}


@router.post("/otp/verify")
async def otp_verify(
    body: OtpVerifySchema,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    ip = request.client.host
    result = await db.execute(select(User).where(User.email == body.email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    ok = await verify_otp(redis, body.email, body.code)
    if not ok:
        db.add(AuditLog(user_id=user.id, action="login_failed", ip_address=ip, success=False))
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired OTP")

    token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    response.set_cookie("access_token", access_token, httponly=True, secure=True, samesite="lax",
                        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=True, samesite="lax",
                        max_age=settings.REFRESH_TOKEN_EXPIRE_HOURS * 3600)

    db.add(AuditLog(user_id=user.id, action="login_success", ip_address=ip, method="email_otp"))
    await db.commit()
    return {"detail": "Authenticated", "user_id": user.id, "role": user.role.value}


@router.post("/refresh")
async def refresh(response: Response, refresh_token: str | None = None):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token = create_access_token({"sub": payload["sub"], "role": payload["role"]})
    response.set_cookie("access_token", access_token, httponly=True, secure=True, samesite="lax",
                        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    return {"detail": "Token refreshed"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"detail": "Logged out"}


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "display_name": current_user.display_name(),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "continent": current_user.continent,
        "country": current_user.country,
        "city": current_user.city,
    }
