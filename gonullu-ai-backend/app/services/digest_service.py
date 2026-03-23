import asyncio
import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.event import Event
from app.models.user import User
from app.services.email_service import send_email_plain

log = logging.getLogger(__name__)

TR = ZoneInfo("Europe/Istanbul")


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


async def run_weekly_digest_if_due(db: AsyncSession) -> int:
    """
    Pazartesi 09:00–10:59 (Europe/Istanbul) arasında, haftalık özeti açık kullanıcılara e-posta.
    Son 6 gün içinde gönderildiyse atla.
    """
    now_tr = datetime.now(TR)
    if now_tr.weekday() != 0 or not (9 <= now_tr.hour < 11):
        return 0

    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(days=6)

    result = await db.execute(
        select(User).where(
            User.is_active == True,  # noqa: E712
            User.email_weekly_digest == True,  # noqa: E712
        )
    )
    users = result.scalars().all()
    sent = 0
    base = (settings.FRONTEND_URL or "http://localhost:5175").rstrip("/")

    for user in users:
        prev = _as_utc(getattr(user, "weekly_digest_sent_at", None))
        if prev and prev > cutoff:
            continue

        email = (user.email or "").strip()
        if not email:
            continue

        stmt = select(Event).where(
            Event.status.in_(["active", "full"]),
        )
        if user.city:
            stmt = stmt.where(Event.city == user.city)
        stmt = stmt.order_by(Event.event_date.asc()).limit(12)
        ev_res = await db.execute(stmt)
        evs = [e for e in ev_res.scalars().all() if e.event_date and _as_utc(e.event_date) and _as_utc(e.event_date) > now_utc]
        evs = evs[:6]
        if not evs:
            continue

        lines = [f"Merhaba {user.full_name or 'gönüllü'},", "", "Yaklaşan etkinlik önerileri:", ""]
        for e in evs:
            when = e.event_date.strftime("%d.%m.%Y %H:%M") if e.event_date else "—"
            lines.append(f"• {e.title} — {e.city or '—'} ({when})")
            lines.append(f"  {base}/events/{e.id}")
            lines.append("")

        lines.append("— GönüllüAI · Keşfet: " + base + "/discover")
        body = "\n".join(lines)
        subject = "GönüllüAI — Haftalık etkinlik özeti"

        ok = await asyncio.to_thread(send_email_plain, email, subject, body)
        if ok:
            user.weekly_digest_sent_at = datetime.now(timezone.utc).replace(tzinfo=None)
            await db.flush()
            sent += 1

    if sent:
        await db.commit()
    return sent
