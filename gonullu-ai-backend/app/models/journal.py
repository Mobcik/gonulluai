from sqlalchemy import Column, String, Integer, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
from app.utils import new_uuid


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id          = Column(String(36), primary_key=True, default=new_uuid)
    user_id     = Column(String(36), ForeignKey("users.id"), nullable=False)
    event_id    = Column(String(36), ForeignKey("events.id"), nullable=True)
    title       = Column(String(120), nullable=False)
    content     = Column(Text, nullable=False)
    mood        = Column(String(20), default="happy")      # happy, proud, motivated, tired, mixed
    impact_note = Column(Text, nullable=True)               # AI özeti veya manüel etki notu
    skills_used = Column(Text, default="[]")               # JSON string
    is_public   = Column(Integer, default=0)               # 0=private, 1=public (SQLite bool)
    created_at  = Column(TIMESTAMP, server_default=func.now())
    updated_at  = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
