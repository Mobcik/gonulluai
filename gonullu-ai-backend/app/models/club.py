from sqlalchemy import Column, String, Boolean, Text, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from uuid import uuid4
from app.database import Base


def new_uuid():
    return str(uuid4())


class Club(Base):
    __tablename__ = "clubs"

    id           = Column(String(36), primary_key=True, default=new_uuid)
    name         = Column(String(100), nullable=False)
    university   = Column(String(200), nullable=False)
    logo_url     = Column(Text)
    description  = Column(Text)
    organizer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    verified     = Column(Boolean, default=False)
    created_at   = Column(TIMESTAMP, server_default=func.now())


class ClubMembership(Base):
    __tablename__ = "club_memberships"

    id        = Column(String(36), primary_key=True, default=new_uuid)
    club_id   = Column(String(36), ForeignKey("clubs.id"), nullable=False)
    user_id   = Column(String(36), ForeignKey("users.id"), nullable=False)
    joined_at = Column(TIMESTAMP, server_default=func.now())
