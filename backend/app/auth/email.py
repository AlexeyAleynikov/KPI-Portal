import urllib.request
import urllib.parse
from app.config import settings


def send_otp_email(
    to_email: str,
    code: str,
    telegram_chat_id: str = None,
    otp_channel: str = "email",
) -> None:
    if otp_channel == "telegram" and telegram_chat_id:
        _send_telegram(telegram_chat_id, code)
    elif otp_channel == "email" and settings.SMTP_HOST:
        _send_smtp(to_email, code)
    else:
        _send_log(to_email, code)


def _send_telegram(chat_id: str, code: str) -> None:
    text = (
        f"🔐 KPI Portal\n\n"
        f"Код для входа:\n<b>{code}</b>\n\n"
        f"Действителен {settings.OTP_TTL_MINUTES} минут."
    )
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }).encode()
    urllib.request.urlopen(url, data=data, timeout=5)


def _send_smtp(to_email: str, code: str) -> None:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

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


def _send_log(to_email: str, code: str) -> None:
    print(f"[DEV] OTP for {to_email}: {code}")
