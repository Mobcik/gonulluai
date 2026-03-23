import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.event import Event, EventParticipant
from app.models.event_reminder_log import EventReminderLog
from app.models.user import User
from app.services.email_service import send_email_plain

log = logging.getLogger(__name__)


def _event_dt_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def _already_sent(db: AsyncSession, user_id: str, event_id: str, kind: str) -> bool:
    q = await db.execute(
        select(EventReminderLog.id).where(
            EventReminderLog.user_id == user_id,
            EventReminderLog.event_id == event_id,
            EventReminderLog.kind == kind,
        ).limit(1)
    )
    return q.scalar_one_or_none() is not None


async def run_due_reminders(db: AsyncSession) -> int:
    """
    Yaklaşan etkinlikler için onaylı katılımcılara 24 saat ve 1 saat önce hatırlatma.
    SMTP yapılandırılmadıysa veya gönderim başarısızsa log kaydı eklenmez (tekrar denenir).
    Dönüş: gönderilen e-posta sayısı.
    """
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=2)

    result = await db.execute(
        select(Event).where(Event.status.in_(["active", "full"])).order_by(Event.event_date.asc())
    )
    events = list(result.scalars().all())

    sent = 0
    base_url = (settings.FRONTEND_URL or "http://localhost:5175").rstrip("/")

    for event in events:
        ev_dt = _event_dt_utc(event.event_date)
        if ev_dt is None or ev_dt <= now or ev_dt > horizon:
            continue

        hours_left = (ev_dt - now).total_seconds() / 3600.0

        kinds: list[tuple[str, str]] = []
        if 22.5 <= hours_left <= 25.5:
            kinds.append(("24h", "24 saat"))
        if 0.5 <= hours_left <= 1.5:
            kinds.append(("1h", "1 saat"))
        if not kinds:
            continue

        pairs = await db.execute(
            select(EventParticipant, User)
            .join(User, User.id == EventParticipant.user_id)
            .where(
                EventParticipant.event_id == event.id,
                EventParticipant.status == "confirmed",
            )
        )
        rows = pairs.all()

        for _part, usr in rows:
            uid, eid = str(usr.id), str(event.id)
            if getattr(usr, "email_event_reminders", True) is False:
                continue
            email = (usr.email or "").strip()
            if not email:
                continue

            for kind_code, label_tr in kinds:
                if await _already_sent(db, uid, eid, kind_code):
                    continue

                subject = f"Hatırlatma: {event.title} — {label_tr} kaldı"
                link = f"{base_url}/events/{eid}"
                when_str = event.event_date.isoformat() if event.event_date else "—"
                body = (
                    f"Merhaba {usr.full_name or 'gönüllü'},\n\n"
                    f"\"{event.title}\" etkinliğine yaklaşıyorsun ({event.city or '—'}).\n"
                    f"Etkinlik zamanı: {when_str}\n\n"
                    f"Detay ve yol tarifi için: {link}\n\n"
                    f"— GönüllüAI"
                )

                ok = await asyncio.to_thread(send_email_plain, email, subject, body)
                if ok:
                    db.add(EventReminderLog(user_id=uid, event_id=eid, kind=kind_code))
                    await db.flush()
                    sent += 1

    if sent:
        await db.commit()
    return sent
