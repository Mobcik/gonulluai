import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.database import get_db
from app.models.journal import JournalEntry
from app.models.event import Event
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(tags=["journal"])


class JournalCreate(BaseModel):
    title:       str
    content:     str
    mood:        str        = "happy"
    impact_note: Optional[str] = None
    skills_used: list[str]  = []
    is_public:   bool       = False
    event_id:    Optional[str] = None


class JournalUpdate(BaseModel):
    title:       Optional[str] = None
    content:     Optional[str] = None
    mood:        Optional[str] = None
    impact_note: Optional[str] = None
    skills_used: Optional[list[str]] = None
    is_public:   Optional[bool] = None


def _serialize(entry: JournalEntry, event: Event | None = None) -> dict:
    skills = entry.skills_used
    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except Exception:
            skills = []
    return {
        "id":          str(entry.id),
        "user_id":     str(entry.user_id),
        "event_id":    str(entry.event_id) if entry.event_id else None,
        "event_title": event.title if event else None,
        "event_date":  event.event_date.isoformat() if event and event.event_date else None,
        "event_category": event.category if event else None,
        "title":       entry.title,
        "content":     entry.content,
        "mood":        entry.mood,
        "impact_note": entry.impact_note,
        "skills_used": skills,
        "is_public":   bool(entry.is_public),
        "created_at":  entry.created_at.isoformat() if entry.created_at else None,
    }


@router.get("/")
async def list_entries(
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JournalEntry)
        .where(JournalEntry.user_id == user.id)
        .order_by(JournalEntry.created_at.desc())
    )
    entries = result.scalars().all()
    out = []
    for entry in entries:
        event = await db.get(Event, entry.event_id) if entry.event_id else None
        out.append(_serialize(entry, event))
    return out


@router.post("/")
async def create_entry(
    data: JournalCreate,
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = JournalEntry(
        user_id     = user.id,
        event_id    = data.event_id,
        title       = data.title,
        content     = data.content,
        mood        = data.mood,
        impact_note = data.impact_note,
        skills_used = json.dumps(data.skills_used),
        is_public   = 1 if data.is_public else 0,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    event = await db.get(Event, entry.event_id) if entry.event_id else None
    return _serialize(entry, event)


@router.put("/{entry_id}")
async def update_entry(
    entry_id: str,
    data: JournalUpdate,
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await db.get(JournalEntry, entry_id)
    if not entry or str(entry.user_id) != str(user.id):
        raise HTTPException(404, "Günlük yazısı bulunamadı")

    if data.title       is not None: entry.title       = data.title
    if data.content     is not None: entry.content     = data.content
    if data.mood        is not None: entry.mood        = data.mood
    if data.impact_note is not None: entry.impact_note = data.impact_note
    if data.is_public   is not None: entry.is_public   = 1 if data.is_public else 0
    if data.skills_used is not None: entry.skills_used = json.dumps(data.skills_used)

    await db.commit()
    await db.refresh(entry)
    event = await db.get(Event, entry.event_id) if entry.event_id else None
    return _serialize(entry, event)


@router.delete("/{entry_id}")
async def delete_entry(
    entry_id: str,
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await db.get(JournalEntry, entry_id)
    if not entry or str(entry.user_id) != str(user.id):
        raise HTTPException(404, "Günlük yazısı bulunamadı")
    await db.delete(entry)
    await db.commit()
    return {"message": "Silindi"}
