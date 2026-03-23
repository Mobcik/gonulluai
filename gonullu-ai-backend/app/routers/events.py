import json
import os
import random
import string
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
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
from app.services import event_export
from app.services import ical_export
from app.services.graphics_service import build_event_poster_png

router  = APIRouter(tags=["events"])
limiter = Limiter(key_func=get_remote_address)

PAGE_SIZE = 24


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


def _event_bounds_utc(ev: Event) -> tuple[datetime | None, datetime | None]:
    ed = ev.event_date
    if not ed:
        return None, None
    start = ed.replace(tzinfo=timezone.utc) if ed.tzinfo is None else ed.astimezone(timezone.utc)
    en = ev.end_time
    if en:
        end = en.replace(tzinfo=timezone.utc) if en.tzinfo is None else en.astimezone(timezone.utc)
    else:
        end = start + timedelta(hours=2)
    return start, end


async def _schedule_overlap_warning(db: AsyncSession, user_id: str, target: Event) -> str | None:
    t0, t1 = _event_bounds_utc(target)
    if not t0 or not t1:
        return None
    stmt = (
        select(Event)
        .join(EventParticipant, EventParticipant.event_id == Event.id)
        .where(
            EventParticipant.user_id == user_id,
            EventParticipant.status == "confirmed",
            Event.id != target.id,
            Event.status.in_(["active", "full", "ongoing"]),
        )
    )
    res = await db.execute(stmt)
    hits: list[str] = []
    for ev in res.scalars().all():
        a0, a1 = _event_bounds_utc(ev)
        if not a0 or not a1:
            continue
        if t0 < a1 and a0 < t1:
            hits.append((ev.title or "Etkinlik")[:60])
    if not hits:
        return None
    show = hits[:2]
    msg = "Aynı zaman aralığında kayıtlı başka etkinlik(ler): " + ", ".join(show)
    if len(hits) > 2:
        msg += f" (+{len(hits) - 2})"
    return msg


def _apply_event_date_range(
    stmt,
    date_from: str | None,
    date_to:   str | None,
):
    if date_from:
        try:
            d0 = date.fromisoformat(date_from.strip())
            stmt = stmt.where(Event.event_date >= datetime.combine(d0, time.min))
        except ValueError:
            pass
    if date_to:
        try:
            d1 = date.fromisoformat(date_to.strip())
            stmt = stmt.where(Event.event_date <= datetime.combine(d1, time.max))
        except ValueError:
            pass
    return stmt


def _apply_q_search(stmt, q: str | None):
    if not q or not str(q).strip():
        return stmt
    qq = f"%{str(q).strip()}%"
    return stmt.where(
        or_(
            Event.title.ilike(qq),
            Event.short_description.ilike(qq),
        )
    )


async def _count_filtered_events(db: AsyncSession, stmt) -> int:
    subq = stmt.subquery()
    r = await db.execute(select(func.count()).select_from(subq))
    return int(r.scalar() or 0)


async def _require_event_creator(db: AsyncSession, event_id: str, user: User) -> Event:
    event = await get_event_or_404(db, event_id)
    if str(event.creator_id) != str(user.id) and not user.is_admin:
        raise HTTPException(403, "Yalnızca etkinlik organizatörü bu işlemi yapabilir")
    return event


class DiscoverParseBody(BaseModel):
    q: str = Field(default="", max_length=2000)


@router.get("/discover")
async def discover_events(
    response:   Response,
    category:   str | None = None,
    city:       str | None = None,
    q:          str | None = None,
    date_from:  str | None = None,
    date_to:    str | None = None,
    page:       int        = 1,
    user: User | None      = Depends(get_optional_user),
    db: AsyncSession       = Depends(get_db),
):
    page = max(1, page)
    stmt = select(Event).where(Event.status.in_(["active", "full"]))
    if category:
        stmt = stmt.where(Event.category == category)
    if city:
        stmt = stmt.where(Event.city == city)
    stmt = _apply_q_search(stmt, q)
    stmt = _apply_event_date_range(stmt, date_from, date_to)

    total = await _count_filtered_events(db, stmt)
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page-Size"] = str(PAGE_SIZE)

    if user:
        result = await db.execute(stmt.order_by(Event.event_date.asc()))
        all_events = list(result.scalars().all())
        ranked = await ai_service.rank_events(user, all_events)
        chunk = ranked[(page - 1) * PAGE_SIZE : page * PAGE_SIZE]
        return [await enrich_event(db, e, user) for e in chunk]

    stmt = stmt.order_by(Event.event_date.asc()).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    result = await db.execute(stmt)
    events = list(result.scalars().all())
    return [await enrich_event(db, e, user) for e in events]


@router.post("/discover/parse-natural-language")
async def discover_parse_natural_language(
    body: DiscoverParseBody,
    _user: User | None = Depends(get_optional_user),
):
    """Doğal dil sorgusunu keşif filtrelerine çevirir (kurallar + isteğe bağlı Gemini). Giriş isteğe bağlı."""
    raw = (body.q or "").strip()
    if not raw:
        raise HTTPException(400, "q alanı boş olamaz")
    return await ai_service.parse_natural_language_discover(raw)


@router.get("/")
async def list_events(
    response:  Response,
    category:  str | None = None,
    city:      str | None = None,
    status:    str | None = None,
    q:         str | None = None,
    date_from: str | None = None,
    date_to:   str | None = None,
    page:      int        = 1,
    user: User | None     = Depends(get_optional_user),
    db: AsyncSession      = Depends(get_db),
):
    page = max(1, page)
    stmt = select(Event)
    if category:
        stmt = stmt.where(Event.category == category)
    if city:
        stmt = stmt.where(Event.city == city)
    if status:
        stmt = stmt.where(Event.status == status)
    stmt = _apply_q_search(stmt, q)
    stmt = _apply_event_date_range(stmt, date_from, date_to)

    total = await _count_filtered_events(db, stmt)
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page-Size"] = str(PAGE_SIZE)

    stmt = stmt.order_by(Event.event_date.asc()).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    result = await db.execute(stmt)
    events = result.scalars().all()
    return [await enrich_event(db, e, user) for e in events]


@router.get("/joined/calendar.ics")
async def joined_events_calendar(
    user: User        = Depends(get_current_user),
    db: AsyncSession  = Depends(get_db),
):
    """Onaylı katıldığın yaklaşan etkinlikler — tek .ics dosyası."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(Event)
        .join(EventParticipant, EventParticipant.event_id == Event.id)
        .where(
            EventParticipant.user_id == user.id,
            EventParticipant.status == "confirmed",
            Event.status.in_(["active", "full", "ongoing"]),
        )
        .order_by(Event.event_date.asc())
    )
    result = await db.execute(stmt)
    upcoming: list[Event] = []
    for ev in result.scalars().all():
        ed = ev.event_date
        if ed is None:
            continue
        if ed.tzinfo is None:
            ed = ed.replace(tzinfo=timezone.utc)
        if ed >= now:
            upcoming.append(ev)

    content = ical_export.calendar_bytes_for_events(upcoming)
    return Response(
        content=content,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="gonulluai-katildigim-etkinlikler.ics"',
        },
    )


@router.get("/mine/created")
async def list_my_created_events(
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Yalnızca oturumdaki kullanıcının oluşturduğu etkinlikler (taslak / aktif / tamamlandı dahil)."""
    result = await db.execute(
        select(Event)
        .where(Event.creator_id == user.id)
        .order_by(Event.event_date.desc())
    )
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

    schedule_warning = await _schedule_overlap_warning(db, str(user.id), event)

    participant = EventParticipant(event_id=event.id, user_id=user.id)
    db.add(participant)
    # Katılım kaydı oluşturuldu — puan etkinlik günü doğrulama yapıldığında verilir

    from app.models.reward import Notification
    event_date_str = event.event_date.strftime("%d %B") if event.event_date else ""
    db.add(Notification(
        user_id=user.id,
        type="event_join",
        message=f'"{event.title}" etkinliğine kayıt oldun! {event_date_str} tarihinde katılımını doğrula ve +35 puan kazan. 🎯',
    ))
    await db.commit()
    out: dict = {"message": "Etkinliğe kayıt oldun! Katılımını doğrulayarak 35 puan kazan. 🎯"}
    if schedule_warning:
        out["schedule_warning"] = schedule_warning
    return out


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
    await award_points(db, str(user.id), 35, "attendance_verified", event_id)

    from app.models.reward import Notification
    db.add(Notification(
        user_id=user.id,
        type="attendance_verified",
        message=f'Katılımın doğrulandı! +35 puan kazandın. Harika iş! ✅',
    ))
    await db.commit()
    return {"message": "+35 puan kazandın! Katılımın doğrulandı ✅"}


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
        select(EventComment, User)
        .join(User, EventComment.user_id == User.id)
        .where(EventComment.event_id == event_id)
        .order_by(EventComment.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": str(c.id),
            "event_id": c.event_id,
            "user_id": str(c.user_id),
            "user": {
                "id": str(u.id),
                "full_name": u.full_name or "",
                "avatar_url": u.avatar_url or None,
                "badge": getattr(u, "badge", None),
            },
            "content": c.content,
            "rating": c.rating,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c, u in rows
    ]


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
    await db.refresh(comment)  # created_at vs. için
    return {
        "id": str(comment.id),
        "event_id": event_id,
        "user_id": str(user.id),
        "user": {
            "id": str(user.id),
            "full_name": user.full_name or "",
            "avatar_url": user.avatar_url or None,
            "badge": getattr(user, "badge", None),
        },
        "content": comment.content,
        "rating": comment.rating,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
        "message": "+5 puan kazandın!",
    }


@router.get("/{event_id}/poster.png")
async def event_poster_png(
    event_id: str,
    user: User        = Depends(get_current_user),
    db: AsyncSession  = Depends(get_db),
):
    """Organizatör için QR + doğrulama kodlu basit poster (PNG)."""
    event = await _require_event_creator(db, event_id, user)
    url = f"{settings.FRONTEND_URL.rstrip('/')}/events/{event_id}"
    when = event.event_date.strftime("%d.%m.%Y %H:%M") if event.event_date else "—"
    code = event.verification_code or "------"
    png = build_event_poster_png(
        url,
        event.title or "Etkinlik",
        f"{when} · {event.city or ''}",
        code,
        cover_photo_url=event.cover_photo_url,
        category=event.category,
        short_description=event.short_description,
    )
    return Response(
        content=png,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="poster-{event_id[:8]}.png"'},
    )


@router.get("/{event_id}/calendar.ics")
async def event_calendar_ics(event_id: str, db: AsyncSession = Depends(get_db)):
    """Tek etkinlik — Google/Apple Takvim’e aktarılabilir .ics."""
    event = await get_event_or_404(db, event_id)
    if event.status not in ("active", "full", "ongoing", "completed"):
        raise HTTPException(404, "Bu etkinlik için takvim dosyası yok")
    content = ical_export.calendar_bytes_for_events([event])
    fn = f"etkinlik-{event_id[:8]}.ics"
    return Response(
        content=content,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fn}"'},
    )


@router.get("/{event_id}/participants/export.csv")
async def export_participants_csv(
    event_id: str,
    user: User        = Depends(get_current_user),
    db: AsyncSession  = Depends(get_db),
):
    await _require_event_creator(db, event_id, user)
    result = await db.execute(
        select(EventParticipant, User)
        .join(User, User.id == EventParticipant.user_id)
        .where(EventParticipant.event_id == event_id)
        .order_by(EventParticipant.joined_at.asc())
    )
    rows_out: list[tuple] = []
    for part, u in result.all():
        ja = part.joined_at.isoformat() if part.joined_at else ""
        va = part.verified_at.isoformat() if part.verified_at else ""
        rows_out.append((u.full_name or "", u.email or "", part.status or "", ja, va))
    content = event_export.participants_csv_bytes(rows_out)
    fname = f"katilimcilar_{event_id[:8]}.csv"
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/{event_id}/impact-report.pdf")
async def export_impact_pdf(
    event_id: str,
    user: User        = Depends(get_current_user),
    db: AsyncSession  = Depends(get_db),
):
    event = await _require_event_creator(db, event_id, user)
    confirmed = await get_participant_count(db, event_id)
    vq = await db.execute(
        select(func.count()).where(
            EventParticipant.event_id == event_id,
            EventParticipant.status == "confirmed",
            EventParticipant.verified_at.isnot(None),
        )
    )
    verified = vq.scalar() or 0
    cq = await db.execute(
        select(func.count()).where(EventComment.event_id == event_id)
    )
    comment_count = cq.scalar() or 0
    aq = await db.execute(
        select(func.avg(EventComment.rating)).where(
            EventComment.event_id == event_id,
            EventComment.rating.isnot(None),
        )
    )
    avg_rating = aq.scalar()
    pdf_bytes = event_export.impact_pdf_bytes(
        event, confirmed, verified, comment_count, float(avg_rating) if avg_rating is not None else None
    )
    fname = f"etki_raporu_{event_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


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


@router.post("/ai-generate-description")
async def ai_generate_description(
    data: dict,
    user: User = Depends(get_current_user),
):
    """Gemini ile etkinlik açıklaması üret. Gemini çalışmazsa başlık/kategoriye özel şablon döner."""
    title         = data.get("title", "Gönüllülük Etkinliği")
    category      = data.get("category", "Genel")
    city          = data.get("city", "Türkiye")
    extra_context = data.get("extra_context", "")   # adres, buluşma noktası, saat

    result = await ai_service.generate_event_description(title, category, city, extra_context)

    if not result:
        result = _build_fallback_description(title, category, city, extra_context)
    return result


def _build_fallback_description(
    title: str, category: str, city: str, extra_context: str = "",
) -> dict:
    """Gemini başarısız olduğunda başlık, kategori ve şehre özgü açıklama üretir."""
    actions = {
        "Çevre":         f"çevre koruma ve yeşillendirme",
        "Eğitim":        f"eğitim destek ve öğretim",
        "Sağlık":        f"sağlık hizmetleri ve bilinçlendirme",
        "Hayvan Hakları":f"hayvan refahı ve barınak destek",
        "Yaşlı Bakımı":  f"yaşlı bakımı ve sosyal destek",
        "Çocuk Gelişimi":f"çocuk gelişimi ve eğitim destek",
        "Teknoloji":     f"teknoloji ile sosyal fayda",
        "Sanat & Kültür":f"sanat ve kültür",
    }
    tasks = {
        "Çevre":         f"Etkinlik boyunca ağaç dikme, alan temizliği ve farkındalık çalışmaları yürütülecek.",
        "Eğitim":        f"Öğrencilere birebir ders desteği verilecek, eğitim materyalleri hazırlanacak.",
        "Sağlık":        f"Sağlık taraması organizasyonu, bilgi standı kurulumu ve materyal dağıtımı yapılacak.",
        "Hayvan Hakları":f"Barınak hayvanlarına bakılacak, mama dağıtımı yapılacak ve sahiplendirme organizasyonu düzenlenecek.",
        "Yaşlı Bakımı":  f"Yaşlı bireylere ziyaret, sohbet ve aktivite desteği sağlanacak.",
        "Çocuk Gelişimi":f"Oyun, sanat ve eğitim atölyeleri düzenlenecek; çocukların bireysel gelişimleri desteklenecek.",
        "Teknoloji":     f"Kod yazma, tasarım veya teknik destek görevlerinden biri üstlenilecek.",
        "Sanat & Kültür":f"Etkinlik organizasyonu, dekor hazırlığı veya performans süreçlerinde aktif görev alınacak.",
    }
    action = actions.get(category, f"{category.lower()} alanında gönüllü çalışmalar")
    task   = tasks.get(category, f"Gönüllüler {title} etkinliğinde aktif görev üstlenecek.")

    logistics = f"\n\nBuluşma ve lojistik: {extra_context.strip()}" if (extra_context or "").strip() else ""

    return {
        "short_description": (
            f"{city}'de '{title}' etkinliğiyle {action} alanında gönüllüler bir araya geliyor."
        ),
        "description": (
            f"{title}, {city}'deki {action} faaliyetlerinin bir parçası olarak düzenleniyor. "
            f"Bu etkinlik; yerel topluluğun ihtiyaçlarına doğrudan yanıt veren, "
            f"pratik ve ölçülebilir bir etki yaratmayı hedefliyor.\n\n"
            f"{task} Organizasyon ekibi gerekli tüm malzeme ve yönlendirmeyi sağlayacak; "
            f"önceden deneyim şartı aranmıyor.\n\n"
            f"Katılımcılar bu etkinlikten {city} özelinde somut bir iz bırakmanın yanı sıra "
            f"{category} alanında uygulamalı deneyim ve yeni bir sosyal çevre kazanacak."
            f"{logistics}"
        ),
    }


@router.post("/{event_id}/complete")
async def complete_event(
    event_id: str,
    user: User        = Depends(get_current_user),
    db: AsyncSession  = Depends(get_db),
):
    """Organizatör etkinliği tamamlandı olarak işaretler."""
    event = await get_event_or_404(db, event_id)

    if str(event.creator_id) != str(user.id) and not user.is_admin:
        raise HTTPException(403, "Yalnızca etkinlik organizatörü tamamlayabilir")

    if event.status == "completed":
        raise HTTPException(400, "Etkinlik zaten tamamlandı")

    if event.status not in ["active", "full", "ongoing"]:
        raise HTTPException(400, "Bu etkinlik tamamlanamaz")

    event.status = "completed"

    # Doğrulanmış katılımcılara +25 bonus puan ver
    from app.models.reward import Notification
    result = await db.execute(
        select(EventParticipant).where(
            EventParticipant.event_id == event_id,
            EventParticipant.verified_at.isnot(None),
        )
    )
    verified_participants = result.scalars().all()

    for p in verified_participants:
        await award_points(db, str(p.user_id), 25, "event_complete", event_id)
        db.add(Notification(
            user_id=p.user_id,
            type="event_complete",
            message=f'"{event.title}" tamamlandı! Katılımın için +25 bonus puan kazandın. 🏁',
        ))

    await db.commit()
    return {
        "message": "Etkinlik tamamlandı olarak işaretlendi",
        "verified_count": len(verified_participants),
    }


@router.post("/ai-skill-reasons")
async def ai_skill_reasons(
    data: dict,
    user: User = Depends(get_current_user),
):
    """
    Kullanıcı yeteneklerine göre etkinlik eşleşme nedenlerini Gemini ile üret.
    Body: { skills: [...], events: [{id, title, category, required_skills}] }
    """
    skills = data.get("skills", [])
    events = data.get("events", [])
    if not events:
        return []
    result = await ai_service.generate_skill_reasons(skills, events)
    if not result:
        result = ai_service.skill_match_reasons_local(skills, events)
    return result


@router.get("/ai-welcome")
async def ai_welcome(
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dashboard için kişiselleştirilmiş AI karşılama mesajı üret."""
    # ORM modelindeki JSON string alanlarını Python listesine dönüştür
    user.interests = _safe_json_list(user.interests)  # type: ignore[assignment]
    user.skills    = _safe_json_list(user.skills)     # type: ignore[assignment]

    stmt   = select(Event).where(Event.status.in_(["active", "full"])).limit(10)
    result = await db.execute(stmt)
    events = result.scalars().all()

    ranked    = await ai_service.rank_events(user, list(events)) if events else []
    top_title = ranked[0].title if ranked else ""

    message = await ai_service.generate_welcome(user, top_title)
    return {"message": message}


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
        "required_skills":     _safe_json_list(event.required_skills),
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


def _safe_json_list(value) -> list:
    """JSON string'i güvenli biçimde Python listesine çevirir.
    None, boş string veya geçersiz JSON durumunda [] döner.
    """
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        result = json.loads(value)
        return result if isinstance(result, list) else []
    except (json.JSONDecodeError, TypeError):
        return []
