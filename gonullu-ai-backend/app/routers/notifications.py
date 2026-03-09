from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from app.database import get_db
from app.models.reward import Notification
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(tags=["notifications"])

NOTIF_ICONS = {
    "event_join":    "🤝",
    "event_create":  "✏️",
    "event_remind":  "⏰",
    "badge_earned":  "🏅",
    "photo_upload":  "📸",
    "point_earned":  "⭐",
    "welcome":       "👋",
    "info":          "ℹ️",
}


def _serialize(n: Notification) -> dict:
    return {
        "id":         str(n.id),
        "type":       n.type,
        "message":    n.message,
        "icon":       NOTIF_ICONS.get(n.type, "🔔"),
        "is_read":    n.is_read,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


@router.get("/")
async def list_notifications(
    page: int = 1,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .offset((page - 1) * 20)
        .limit(20)
    )
    return [_serialize(n) for n in result.scalars().all()]


@router.get("/unread-count")
async def unread_count(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(func.count()).where(
            Notification.user_id == user.id,
            Notification.is_read == False,  # noqa: E712
        )
    )
    return {"count": result.scalar() or 0}


@router.put("/read-all")
async def read_all(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "Tüm bildirimler okundu"}


@router.put("/{notification_id}/read")
async def read_one(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notif = await db.get(Notification, notification_id)
    if notif and str(notif.user_id) == str(user.id):
        notif.is_read = True
        await db.commit()
    return {"message": "Bildirim okundu"}
