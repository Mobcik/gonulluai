import json
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User
from app.models.event import Event, EventParticipant
from app.models.reward import PointTransaction, Notification
from app.schemas.user import UserResponse, UserUpdate
from app.dependencies import get_current_user

router = APIRouter(tags=["users"])

POINT_REASON_LABELS = {
    "profile_complete":    "Profil tamamlama bonusu",
    "event_join":          "Etkinliğe katılım",
    "event_create":        "Etkinlik oluşturma",
    "attendance_verified": "Varlık doğrulama bonusu",
    "photo_upload":        "Fotoğraf yükleme",
    "comment":             "Yorum",
    "streak_7":            "7 günlük streak bonusu",
    "streak_30":           "30 günlük streak bonusu",
    "invite_friend":       "Arkadaş daveti",
    "event_complete":      "Etkinlik tamamlama",
    "late_cancel":         "Geç iptal cezası",
}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = data.model_dump(exclude_none=True)
    for field, value in updates.items():
        # SQLite: list alanlarını JSON string olarak kaydet
        if isinstance(value, list):
            setattr(user, field, json.dumps(value, ensure_ascii=False))
        else:
            setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User       = Depends(get_current_user),
    db:   AsyncSession = Depends(get_db),
):
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    content_type = (file.content_type or "").split(";")[0].strip()
    if content_type not in allowed:
        raise HTTPException(400, "Sadece JPEG, PNG, WebP veya GIF yüklenebilir")

    save_dir = Path(os.getcwd()) / "uploads" / "avatars"
    save_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "avatar.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = save_dir / filename

    contents = await file.read()
    dest.write_bytes(contents)

    avatar_url = f"/uploads/avatars/{filename}"
    user.avatar_url = avatar_url
    await db.commit()
    await db.refresh(user)

    return {"avatar_url": avatar_url}


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Kullanıcı bulunamadı")
    return user


@router.get("/{user_id}/stats")
async def get_user_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    """Kullanıcı istatistikleri: katıldığı, oluşturduğu, toplam puan."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Kullanıcı bulunamadı")

    joined_count = await db.execute(
        select(func.count()).where(EventParticipant.user_id == user_id)
    )
    created_count = await db.execute(
        select(func.count()).where(Event.creator_id == user_id)
    )

    return {
        "total_points":  user.total_points,
        "earned_points": user.earned_points,
        "badge":         user.badge,
        "streak_days":   user.streak_days,
        "joined_count":  joined_count.scalar() or 0,
        "created_count": created_count.scalar() or 0,
    }


@router.get("/{user_id}/events")
async def get_user_events(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının katıldığı + oluşturduğu tüm etkinlikler."""
    # Katıldığı etkinlikler
    joined_result = await db.execute(
        select(Event, EventParticipant)
        .join(EventParticipant, EventParticipant.event_id == Event.id)
        .where(EventParticipant.user_id == user_id)
        .order_by(Event.event_date.desc())
    )
    joined_rows = joined_result.all()

    # Oluşturduğu etkinlikler (katılmamış olabilir)
    created_result = await db.execute(
        select(Event)
        .where(Event.creator_id == user_id)
        .order_by(Event.event_date.desc())
    )
    created_events = {e.id: e for e in created_result.scalars().all()}

    # Zaten joined_rows'ta olan event id'leri
    joined_ids = {row[0].id for row in joined_rows}

    out = []

    # Katıldığı etkinlikler
    for event, participant in joined_rows:
        out.append(await _serialize_event(event, user_id, db, is_joined=True))

    # Sadece oluşturduğu ama katılmadığı etkinlikler
    for event_id, event in created_events.items():
        if event_id not in joined_ids:
            out.append(await _serialize_event(event, user_id, db, is_joined=False))

    # Tarihe göre sırala
    out.sort(key=lambda e: e.get("event_date", ""), reverse=True)
    return out


@router.get("/{user_id}/points")
async def get_user_points(user_id: str, db: AsyncSession = Depends(get_db)):
    """Kullanıcının puan geçmişi."""
    result = await db.execute(
        select(PointTransaction)
        .where(PointTransaction.user_id == user_id)
        .order_by(PointTransaction.created_at.desc())
        .limit(50)
    )
    txs = result.scalars().all()
    return [
        {
            "id":         str(tx.id),
            "user_id":    str(tx.user_id),
            "points":     tx.points,
            "reason":     tx.reason,
            "label":      POINT_REASON_LABELS.get(tx.reason, tx.reason),
            "event_id":   str(tx.event_id) if tx.event_id else None,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
        }
        for tx in txs
    ]


@router.get("/{user_id}/notifications")
async def get_user_notifications(
    user_id: str,
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if str(user.id) != user_id and not user.is_admin:
        raise HTTPException(403, "Yetkisiz")

    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    notifs = result.scalars().all()
    return [
        {
            "id":         str(n.id),
            "type":       n.type,
            "message":    n.message,
            "is_read":    n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]


async def _serialize_event(event: Event, user_id: str, db: AsyncSession, is_joined: bool) -> dict:
    """Event nesnesini frontend uyumlu dict'e çevirir."""
    # Katılımcı sayısı
    count_result = await db.execute(
        select(func.count()).where(
            EventParticipant.event_id == event.id,
            EventParticipant.status == "confirmed",
        )
    )
    participant_count = count_result.scalar() or 0

    # Oluşturan kullanıcı
    creator = await db.get(User, event.creator_id)

    # required_skills parse
    skills = event.required_skills
    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except Exception:
            skills = []

    return {
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
        "participant_count":   participant_count,
        "cover_photo_url":     event.cover_photo_url,
        "required_skills":     skills,
        "status":              event.status,
        "verification_method": event.verification_method,
        "created_at":          event.created_at.isoformat() if event.created_at else None,
        "is_joined":           is_joined,
        "is_creator":          str(event.creator_id) == user_id,
        "creator": {
            "id":        str(creator.id),
            "full_name": creator.full_name,
            "avatar_url": creator.avatar_url,
            "badge":     creator.badge,
        } if creator else None,
    }
