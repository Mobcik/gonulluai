import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

log = logging.getLogger(__name__)


def send_email_plain(to_addr: str, subject: str, body: str) -> bool:
    """SMTP ile düz metin e-posta. SMTP_USER/SMTP_PASS yoksa False döner (sessiz atlama)."""
    user = (settings.SMTP_USER or "").strip()
    password = (settings.SMTP_PASS or "").strip()
    if not user or not password:
        log.debug("SMTP_USER/SMTP_PASS tanımlı değil; e-posta gönderilmedi: %s", subject[:40])
        return False

    to_addr = (to_addr or "").strip()
    if not to_addr:
        return False

    host = (settings.SMTP_HOST or "smtp.gmail.com").strip()
    port = int(settings.SMTP_PORT or 587)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = to_addr
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        with smtplib.SMTP(host, port, timeout=30) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(user, [to_addr], msg.as_string())
        return True
    except Exception as e:
        log.warning("send_email_plain failed to %s: %s", to_addr, e)
        return False
