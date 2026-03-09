import json
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class EventCreate(BaseModel):
    title:               str
    short_description:   Optional[str] = None
    description:         str
    category:            Optional[str] = None
    city:                Optional[str] = None
    address:             Optional[str] = None
    meeting_point:       Optional[str] = None
    event_date:          datetime
    end_time:            Optional[datetime] = None
    max_participants:    Optional[int] = None
    required_skills:     list[str] = []
    preparation_notes:   Optional[str] = None
    contact_info:        Optional[str] = None
    verification_method: str = "code"
    cover_photo_url:     Optional[str] = None


class EventResponse(BaseModel):
    id:                  str
    creator_id:          str
    title:               str
    short_description:   Optional[str] = None
    description:         str
    category:            Optional[str] = None
    city:                Optional[str] = None
    address:             Optional[str] = None
    meeting_point:       Optional[str] = None
    event_date:          datetime
    end_time:            Optional[datetime] = None
    max_participants:    Optional[int] = None
    participant_count:   int = 0
    cover_photo_url:     Optional[str] = None
    required_skills:     list[str] = []
    preparation_notes:   Optional[str] = None
    status:              str = "pending"
    verification_method: str = "code"
    is_joined:           Optional[bool] = None
    is_creator:          Optional[bool] = None
    user_verified:       Optional[bool] = None
    created_at:          Optional[datetime] = None

    model_config = {"from_attributes": True}

    @field_validator("required_skills", mode="before")
    @classmethod
    def parse_skills(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []

    @field_validator("id", "creator_id", mode="before")
    @classmethod
    def ids_to_str(cls, v):
        return str(v)
