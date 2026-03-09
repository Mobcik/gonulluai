from sqlalchemy import Column, String, Boolean, Integer, Text, TIMESTAMP
from sqlalchemy.sql import func
from uuid import uuid4
from app.database import Base


def new_uuid():
    return str(uuid4())


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
    created_at       = Column(TIMESTAMP, server_default=func.now())
