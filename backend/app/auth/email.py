import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings


def send_otp_email(to_email: str, code: str) -> None:
    if not settings.SMTP_HOST:
        # В dev-режиме просто выводим в консоль
        print(f"[DEV] OTP for {to_email}: {code}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Ваш код для входа"
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email

    html = f"""
    <html><body>
      <h2>Код для входа в Корпоративный портал</h2>
      <p>Ваш одноразовый код:</p>
      <h1 style="letter-spacing: 8px; color: #2E5C8A;">{code}</h1>
      <p>Код действителен {settings.OTP_TTL_MINUTES} минут.</p>
      <p>Если вы не запрашивали вход — проигнорируйте это письмо.</p>
    </body></html>
    """
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
