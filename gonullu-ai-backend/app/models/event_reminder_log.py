from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base
from app.utils import new_uuid


class EventReminderLog(Base):
    """Etkinlik hatırlatıcı e-postası gönderildi mi (24s / 1s önce)."""

    __tablename__ = "event_reminder_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "event_id", "kind", name="uq_event_reminder_user_event_kind"),
    )

    id        = Column(String(36), primary_key=True, default=new_uuid)
    user_id   = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    event_id  = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    kind      = Column(String(10), nullable=False)  # "24h" | "1h"
    sent_at   = Column(TIMESTAMP, server_default=func.now())
