import json
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email:     EmailStr
    password:  str
    full_name: str
    city:      Optional[str] = None


class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class UserResponse(BaseModel):
    id:              str
    email:           str
    full_name:       str
    avatar_url:      Optional[str] = None
    city:            Optional[str] = None
    bio:             Optional[str] = None
    interests:       list[str] = []
    skills:          list[str] = []
    total_points:    int = 0
    earned_points:   int = 0
    badge:           str = "filiz"
    role:            str = "user"
    is_student:      bool = False
    university_name: Optional[str] = None
    streak_days:     int = 0
    email_event_reminders: bool = True
    email_weekly_digest: bool = False
    created_at:      Optional[datetime] = None

    model_config = {"from_attributes": True}

    @field_validator("email_event_reminders", mode="before")
    @classmethod
    def coerce_reminders(cls, v):
        if v is None:
            return True
        return bool(v)

    @field_validator("email_weekly_digest", mode="before")
    @classmethod
    def coerce_digest(cls, v):
        if v is None:
            return False
        return bool(v)

    @field_validator("interests", "skills", mode="before")
    @classmethod
    def parse_json_list(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []

    @field_validator("id", mode="before")
    @classmethod
    def id_to_str(cls, v):
        return str(v)


class UserUpdate(BaseModel):
    full_name:  Optional[str] = None
    city:       Optional[str] = None
    bio:        Optional[str] = None
    interests:  Optional[list[str]] = None
    skills:     Optional[list[str]] = None
    avatar_url: Optional[str] = None
    email_event_reminders: Optional[bool] = None
    email_weekly_digest: Optional[bool] = None


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    user:          UserResponse
