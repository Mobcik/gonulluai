from sqlalchemy import Column, String, Boolean, Integer, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
from app.utils import new_uuid


class Event(Base):
    __tablename__ = "events"

    id                  = Column(String(36), primary_key=True, default=new_uuid)
    creator_id          = Column(String(36), ForeignKey("users.id"), nullable=False)
    club_id             = Column(String(36), ForeignKey("clubs.id"), nullable=True)
    title               = Column(String(80), nullable=False)
    short_description   = Column(String(160))
    description         = Column(Text, nullable=False)
    category            = Column(String(50))
    city                = Column(String(80))
    address             = Column(Text)
    meeting_point       = Column(String(200))
    event_date          = Column(TIMESTAMP, nullable=False)
    end_time            = Column(TIMESTAMP)
    max_participants    = Column(Integer)
    cover_photo_url     = Column(Text)
    required_skills     = Column(Text, default="[]")  # JSON string
    preparation_notes   = Column(Text)
    contact_info        = Column(String(200))
    status              = Column(String(20), default="pending")
    verification_method = Column(String(20), default="code")
    verification_code   = Column(String(6))
    created_at          = Column(TIMESTAMP, server_default=func.now())


class EventParticipant(Base):
    __tablename__ = "event_participants"

    id             = Column(String(36), primary_key=True, default=new_uuid)
    event_id       = Column(String(36), ForeignKey("events.id"), nullable=False)
    user_id        = Column(String(36), ForeignKey("users.id"), nullable=False)
    status         = Column(String(20), default="confirmed")
    joined_at      = Column(TIMESTAMP, server_default=func.now())
    verified_at    = Column(TIMESTAMP, nullable=True)
    points_awarded = Column(Boolean, default=False)


class EventPhoto(Base):
    __tablename__ = "event_photos"

    id          = Column(String(36), primary_key=True, default=new_uuid)
    event_id    = Column(String(36), ForeignKey("events.id"), nullable=False)
    uploader_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    photo_url   = Column(Text, nullable=False)
    created_at  = Column(TIMESTAMP, server_default=func.now())


class EventComment(Base):
    __tablename__ = "event_comments"

    id         = Column(String(36), primary_key=True, default=new_uuid)
    event_id   = Column(String(36), ForeignKey("events.id"), nullable=False)
    user_id    = Column(String(36), ForeignKey("users.id"), nullable=False)
    content    = Column(Text, nullable=False)
    rating     = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
