from sqlalchemy import Column, String, Integer, Text, Boolean, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from uuid import uuid4
from app.database import Base


def new_uuid():
    return str(uuid4())


class DigitalReward(Base):
    __tablename__ = "digital_rewards"

    id          = Column(String(36), primary_key=True, default=new_uuid)
    name        = Column(String(100), nullable=False)
    description = Column(Text)
    threshold   = Column(Integer, nullable=False)
    icon        = Column(String(10), default="🏅")
    reward_type = Column(String(20), default="badge")  # badge, frame, certificate, title


class RewardUnlock(Base):
    __tablename__ = "reward_unlocks"

    id          = Column(String(36), primary_key=True, default=new_uuid)
    user_id     = Column(String(36), ForeignKey("users.id"), nullable=False)
    reward_id   = Column(String(36), ForeignKey("digital_rewards.id"), nullable=False)
    unlocked_at = Column(TIMESTAMP, server_default=func.now())


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id         = Column(String(36), primary_key=True, default=new_uuid)
    user_id    = Column(String(36), ForeignKey("users.id"), nullable=False)
    points     = Column(Integer, nullable=False)
    reason     = Column(String(100), nullable=False)
    event_id   = Column(String(36), ForeignKey("events.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(String(36), primary_key=True, default=new_uuid)
    user_id    = Column(String(36), ForeignKey("users.id"), nullable=False)
    type       = Column(String(50), nullable=False)
    message    = Column(Text, nullable=False)
    is_read    = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id         = Column(String(36), primary_key=True, default=new_uuid)
    user_id    = Column(String(36), ForeignKey("users.id"), nullable=False)
    token      = Column(Text, unique=True, nullable=False, index=True)
    expires_at = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
