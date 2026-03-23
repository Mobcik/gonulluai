from sqlalchemy import Column, String, Boolean, Integer, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base
from app.utils import new_uuid


class User(Base):
    __tablename__ = "users"

    id               = Column(String(36), primary_key=True, default=new_uuid)
    email            = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password  = Column(String(255), nullable=False)
    full_name        = Column(String(100))
    avatar_url       = Column(Text)
    city             = Column(String(80))
    bio              = Column(Text)
    interests        = Column(Text, default="[]")   # JSON string olarak saklanır
    skills           = Column(Text, default="[]")   # JSON string olarak saklanır
    total_points     = Column(Integer, default=0)
    earned_points    = Column(Integer, default=0)
    badge            = Column(String(50), default="filiz")
    role             = Column(String(20), default="user")
    is_student       = Column(Boolean, default=False)
    university_name  = Column(String(200))
    club_id          = Column(String(36), nullable=True)
    streak_days      = Column(Integer, default=0)
    last_login       = Column(TIMESTAMP, nullable=True)
    is_active        = Column(Boolean, default=True)
    is_admin         = Column(Boolean, default=False)
    email_event_reminders = Column(Boolean, default=True, server_default="1", nullable=False)
    email_weekly_digest   = Column(Boolean, default=False, server_default="0", nullable=False)
    weekly_digest_sent_at = Column(TIMESTAMP, nullable=True)
    created_at       = Column(TIMESTAMP, server_default=func.now())
