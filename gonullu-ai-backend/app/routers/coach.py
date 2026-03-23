import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.dependencies import get_current_user
from app.models.event import Event
from app.models.user import User
from app.services import ai_service

router = APIRouter(tags=["coach"])
limiter = Limiter(key_func=get_remote_address)

COACH_EVENT_CAP = 18


def _event_dt_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _is_upcoming_event(event_date: datetime | None) -> bool:
    ed = _event_dt_utc(event_date)
    if ed is None:
        return False
    return ed >= datetime.now(timezone.utc)


def _required_skills_list(raw) -> list[str]:
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw]
    try:
        parsed = json.loads(raw)
        return [str(x) for x in parsed] if isinstance(parsed, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _events_compact(events: list[Event]) -> list[dict]:
    out: list[dict] = []
    for e in events:
        out.append(
            {
                "id": str(e.id),
                "title": e.title or "",
                "category": e.category or "",
                "city": e.city or "",
                "event_date": e.event_date.isoformat() if e.event_date else None,
                "required_skills": _required_skills_list(e.required_skills),
            }
        )
    return out


class CoachChatBody(BaseModel):
    message: str = Field(default="", max_length=1200)


class CoachChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=CoachChatResponse)
@limiter.limit("20/hour")
async def coach_chat(
    request: Request,
    body: CoachChatBody,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Event)
        .where(Event.status.in_(["active", "full"]))
        .order_by(Event.event_date.asc())
    )
    result = await db.execute(stmt)
    rows = list(result.scalars().all())
    upcoming = [e for e in rows if _is_upcoming_event(e.event_date)]
    ranked = await ai_service.rank_events(user, upcoming)
    ranked = ranked[:COACH_EVENT_CAP]
    compact = _events_compact(ranked)
    reply = await ai_service.coach_reply(user, body.message, compact)
    return CoachChatResponse(reply=reply)
