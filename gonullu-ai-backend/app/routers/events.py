import json
import os
import random
import string
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_db
from app.models.event import Event, EventParticipant, EventPhoto, EventComment
from app.models.user import User
from app.schemas.event import EventCreate, EventResponse
from app.dependencies import get_current_user, get_optional_user
from app.config import settings
from app.services.point_service import award_points, deduct_points
from app.services import photo_validator
from app.services import ai_service

router  = APIRouter(tags=["events"])
limiter = Limiter(key_func=get_remote_address)


def generate_code() -> str:
    return "".join(random.choices(string.digits, k=6))


async def get_event_or_404(db: AsyncSession, event_id: str) -> Event:
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Etkinlik bulunamadı")
    return event


async def get_participant_count(db: AsyncSession, event_id: str) -> int:
    result = await db.execute(
        select(func.count()).where(
            EventParticipant.event_id == event_id,
            EventParticipant.status == "confirmed",
        )
    )
    return result.scalar() or 0


@router.get("/discover")
async def discover_events(
    category: str | None = None,
    city:     str | None = None,
    q:        str | None = None,
    page:     int        = 1,
    user: User | None    = Depends(get_optional_user),
    db: AsyncSession     = Depends(get_db),
):
    stmt = select(Event).where(Event.status.in_(["active", "full"]))
    if category:
        stmt = stmt.where(Event.category == category)
    if city:
        stmt = stmt.where(Event.city == city)
    if q:
        stmt = stmt.where(Event.title.ilike(f"%{q}%"))
    stmt = stmt.order_by(Event.event_date.asc())

    result = await db.execute(stmt)
    events = result.scalars().all()

    if user and settings_available():
        events = await ai_service.rank_events(user, list(events))

    return [await enrich_event(db, e, user) for e in events]


@router.get("/")
async def list_events(
    category: str | None = None,
    city:     str | None = None,
    status:   str | None = None,
    q:        str | None = None,
    page:     int        = 1,
    user: User | None    = Depends(get_optional_user),
    db: AsyncSession     = Depends(get_db),
):
    stmt = select(Event)
    if category:
        stmt = stmt.where(Event.category == category)
    if city:
        stmt = stmt.where(Event.city == city)
    if status:
        stmt = stmt.where(Event.status == status)
    if q:
        stmt = stmt.where(Event.title.ilike(f"%{q}%"))
    stmt = stmt.order_by(Event.event_date.asc())

    result = await db.execute(stmt)
    events = result.scalars().all()
    return [await enrich_event(db, e, user) for e in events]


@router.post("/", response_model=dict)
async def create_event(
    data: EventCreate,
    user: User        = Depends(get_current_user),
    db: AsyncSession  = Depends(get_db),
):
    event = Event(
        creator_id          = user.id,
        title               = data.title,
        short_description   = data.short_description,
        description         = data.description,
        category            = data.category,
        city                = data.city,
        address             = data.address,
        meeting_point       = data.meeting_point,
        event_date          = data.event_date,
        end_time            = data.end_time,
        max_participants    = data.max_participants,
        required_skills     = json.dumps(data.required_skills),
        preparation_notes   = data.preparation_notes,
        contact_info        = data.contact_info,
        verification_method = data.verification_method,
        verification_code   = generate_code(),
        cover_photo_url     = data.cover_photo_url,
        status              = "active",
    )
    db.add(event)
    await db.flush()
    await award_points(db, str(user.id), 50, "event_create", str(event.id))

    # Bildirim: etkinlik oluşturuldu
    from app.models.reward import Notification
    db.add(Notification(
        user_id=user.id,
        type="event_create",
        message=f'"{data.title}" etkinliğini oluşturdun! +50 puan kazandın.',
    ))
    await db.commit()
    return {"id": str(event.id), "message": "Etkinlik oluşturuldu! +50 puan kazandın 🎉"}


@router.get("/{event_id}")
async def get_event(
    event_id: str,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession  = Depends(get_db),
):
    event = await get_event_or_404(db, event_id)
    return await enrich_event(db, event, user, detailed=True)


@router.put("/{event_id}")
async def update_event(
    event_id: str,
    data:     EventCreate,
    user:     User          = Depends(get_current_user),
    db:       AsyncSession  = Depends(get_db),
):
    """Etkinliği güncelle — sadece organizatör."""
    event = await get_event_or_404(db, event_id)
    if str(event.creator_id) != str(user.id) and not getattr(user, "is_admin", False):
        raise HTTPException(403, "Sadece organizatör etkinliği düzenleyebilir")

    # Güncellenebilir alanlar
    event.title               = data.title
    event.short_description   = data.short_description
    event.description         = data.description
    event.category            = data.category
    event.city                = data.city
    event.address             = data.address
    event.meeting_point       = data.meeting_point
    event.event_date          = data.event_date
    event.end_time            = data.end_time
    event.max_participants    = data.max_participants
    event.required_skills     = json.dumps(data.required_skills)
    event.preparation_notes   = data.preparation_notes
    event.contact_info        = data.contact_info
    event.verification_method = data.verification_method
    if data.cover_photo_url:
        event.cover_photo_url = data.cover_photo_url

    await db.commit()
    return await enrich_event(db, event, user, detailed=True)


@router.post("/{event_id}/join")
async def join_event(
    event_id: str,
    user: User        = Depends(get_current_user),
    db: AsyncSession  = Depends(get_db),
):
    event = await get_event_or_404(db, event_id)
    if event.status not in ["active", "full"]:
        raise HTTPException(400, "Bu etkinliğe katılınamaz")

    existing = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Zaten katıldın")

    count = await get_participant_count(db, str(event.id))
    if event.max_participants and count >= event.max_participants:
        raise HTTPException(400, "Etkinlik dolu")

    participant = EventParticipant(event_id=event.id, user_id=user.id)
    db.add(participant)
    await award_points(db, str(user.id), 20, "event_join", str(event.id))

    # Bildirim: etkinliğe katılındı
    from app.models.reward import Notification
    from datetime import date
    event_date_str = event.event_date.strftime("%d %B") if event.event_date else ""
    db.add(Notification(
        user_id=user.id,
        type="event_join",
        message=f'"{event.title}" etkinliğine katıldın! {event_date_str} tarihinde görüşürüz. +20 puan 🎉',
    ))
    await db.commit()
    return {"message": "+20 puan kazandın! 🎉"}


@router.delete("/{event_id}/join")
async def leave_event(
    event_id: str,
    user: User        = Depends(get_current_user),
    db: AsyncSession  = Depends(get_db),
):
    result = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id  == user.id,
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(400, "Bu etkinliğe katılmamışsın")

    event = await get_event_or_404(db, event_id)
    from datetime import timedelta
    hours_left = (event.event_date - datetime.now(timezone.utc)).total_seconds() / 3600

    await db.delete(participant)
    if hours_left < 24:
        await deduct_points(db, str(user.id), 5, "late_cancel")
        return {"message": "Katılımın iptal edildi. Son 24 saat olduğu için -5 puan uygulandı."}

    return {"message": "Katılımın iptal edildi"}


@router.post("/{event_id}/verify")
@limiter.limit("10/minute")
async def verify_attendance(
    request:  Request,
    event_id: str,
    code:     str,
    user: User        = Depends(get_current_user),
    db: AsyncSession  = Depends(get_db),
):
    event = await get_event_or_404(db, event_id)

    if event.event_date.date() != datetime.today().date():
        raise HTTPException(400, "Doğrulama sadece etkinlik günü yapılabilir")

    if event.verification_code != code:
        raise HTTPException(400, "Geçersiz kod")

    result = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.user_id  == user.id,
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(400, "Bu etkinliğe katılmamışsın")
    if participant.verified_at:
        raise HTTPException(400, "Zaten doğrulandın")

    participant.verified_at = datetime.now(timezone.utc)
    await award_points(db, str(user.id), 15, "attendance_verified", event_id)
    return {"message": "+15 puan kazandın! Katılımın doğrulandı ✅"}


@router.post("/{event_id}/photos")
async def upload_photo(
    event_id: str,
    file: UploadFile    = File(...),
    user: User          = Depends(get_current_user),
    db: AsyncSession    = Depends(get_db),
):
    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Boş dosya yüklendi")
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "Maksimum dosya boyutu 10MB")

    # Dosya uzantısını belirle (content_type veya dosya adından)
    ext_map = {
        "image/jpeg": ".jpg", "image/jpg": ".jpg",
        "image/png": ".png", "image/webp": ".webp",
        "image/gif": ".gif",
    }
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    fname = (file.filename or "").lower()

    if content_type in ext_map:
        ext = ext_map[content_type]
    elif fname.endswith((".jpg", ".jpeg")):
        ext = ".jpg"
    elif fname.endswith(".png"):
        ext = ".png"
    elif fname.endswith(".webp"):
        ext = ".webp"
    else:
        ext = ".jpg"   # varsayılan

    # uvicorn'un çalıştığı dizin (gonullu-ai-backend/) baz alınır
    save_dir   = Path(os.getcwd()) / "uploads" / "event_photos" / event_id
    save_dir.mkdir(parents=True, exist_ok=True)

    filename   = f"{uuid4()}{ext}"
    save_path  = save_dir / filename
    save_path.write_bytes(contents)

    # Erişilebilir URL
    photo_url = f"{settings.BACKEND_URL}/uploads/event_photos/{event_id}/{filename}"

    # Veritabanına kaydet
    photo = EventPhoto(event_id=event_id, uploader_id=user.id, photo_url=photo_url)
    db.add(photo)
    await db.flush()  # ID üret

    # Kapak fotoğrafı yoksa bu fotoğrafı kapak yap
    event = await get_event_or_404(db, event_id)
    if not event.cover_photo_url:
        event.cover_photo_url = photo_url

    # Puan ver
    await award_points(db, str(user.id), 10, "photo_upload", event_id)

    # Bildirim
    from app.models.reward import Notification
    db.add(Notification(
        user_id=user.id,
        type="photo_upload",
        message="Fotoğraf yükledin! +10 puan kazandın",
    ))
    await db.commit()

    return {"url": photo_url, "message": "+10 puan kazandın! 📸"}


@router.post("/{event_id}/cover")
async def upload_cover(
    event_id: str,
    file: UploadFile    = File(...),
    user: User          = Depends(get_current_user),
    db: AsyncSession    = Depends(get_db),
):
    """Etkinlik kapak fotoğrafını yükle (sadece organizatör)."""
    event = await get_event_or_404(db, event_id)
    if str(event.creator_id) != str(user.id) and not user.is_admin:
        raise HTTPException(403, "Sadece organizatör kapak fotoğrafı ekleyebilir")

    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Boş dosya")

    fname = (file.filename or "").lower()
    if fname.endswith((".jpg", ".jpeg")):
        ext = ".jpg"
    elif fname.endswith(".png"):
        ext = ".png"
    elif fname.endswith(".webp"):
        ext = ".webp"
    else:
        ext = ".jpg"

    save_dir  = Path(os.getcwd()) / "uploads" / "event_photos" / event_id
    save_dir.mkdir(parents=True, exist_ok=True)
    filename  = f"cover_{uuid4()}{ext}"
    (save_dir / filename).write_bytes(contents)

    cover_url = f"{settings.BACKEND_URL}/uploads/event_photos/{event_id}/{filename}"
    event.cover_photo_url = cover_url
    await db.commit()

    return {"url": cover_url, "message": "Kapak fotoğrafı yüklendi!"}


@router.get("/{event_id}/photos")
async def get_photos(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EventPhoto).where(EventPhoto.event_id == event_id).order_by(EventPhoto.created_at.desc())
    )
    photos = result.scalars().all()

    out = []
    for p in photos:
        uploader = await db.get(User, p.uploader_id)
        out.append({
            "id":          str(p.id),
            "event_id":    str(p.event_id),
            "uploader_id": str(p.uploader_id),
            "photo_url":   p.photo_url,
            "created_at":  p.created_at.isoformat() if p.created_at else None,
            "uploader": {
                "id":        str(uploader.id),
                "full_name": uploader.full_name,
                "avatar_url": uploader.avatar_url,
            } if uploader else None,
        })
    return out


@router.get("/{event_id}/comments")
async def get_comments(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EventComment).where(EventComment.event_id == event_id).order_by(EventComment.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{event_id}/comments")
async def add_comment(
    event_id: str,
    data: dict,
    user: User        = Depends(get_current_user),
    db: AsyncSession  = Depends(get_db),
):
    comment = EventComment(
        event_id = event_id,
        user_id  = user.id,
        content  = data.get("content", ""),
        rating   = data.get("rating"),
    )
    db.add(comment)
    await award_points(db, str(user.id), 5, "comment", event_id)
    await db.commit()
    return {"id": str(comment.id), "message": "+5 puan kazandın!"}


@router.get("/{event_id}/participants")
async def get_participants(
    event_id: str,
    user: User        = Depends(get_current_user),
    db: AsyncSession  = Depends(get_db),
):
    result = await db.execute(
        select(EventParticipant).where(EventParticipant.event_id == event_id)
    )
    return result.scalars().all()


async def enrich_event(db: AsyncSession, event: Event, user: User | None, detailed: bool = False) -> dict:
    count = await get_participant_count(db, str(event.id))
    data  = {
        "id":                  str(event.id),
        "creator_id":          str(event.creator_id),
        "title":               event.title,
        "short_description":   event.short_description,
        "description":         event.description,
        "category":            event.category,
        "city":                event.city,
        "address":             event.address,
        "meeting_point":       event.meeting_point,
        "event_date":          event.event_date.isoformat() if event.event_date else None,
        "end_time":            event.end_time.isoformat() if event.end_time else None,
        "max_participants":    event.max_participants,
        "participant_count":   count,
        "cover_photo_url":     event.cover_photo_url,
        "required_skills":     json.loads(event.required_skills) if isinstance(event.required_skills, str) else (event.required_skills or []),
        "preparation_notes":   event.preparation_notes,
        "status":              event.status,
        "verification_method": event.verification_method,
        "created_at":          event.created_at.isoformat() if event.created_at else None,
    }

    creator = await db.get(User, event.creator_id)
    if creator:
        data["creator"] = {
            "id":         str(creator.id),
            "full_name":  creator.full_name,
            "avatar_url": creator.avatar_url,
            "badge":      creator.badge,
        }

    if user:
        result = await db.execute(
            select(EventParticipant).where(
                EventParticipant.event_id == event.id,
                EventParticipant.user_id  == user.id,
            )
        )
        participant = result.scalar_one_or_none()
        data["is_joined"]    = participant is not None
        data["is_creator"]   = str(event.creator_id) == str(user.id)
        data["user_verified"] = participant.verified_at is not None if participant else False

    return data


def settings_available() -> bool:
    from app.config import settings
    return bool(settings.ANTHROPIC_API_KEY)
