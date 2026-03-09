import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.event import Event, EventParticipant, EventPhoto, EventComment
from app.models.user import User
from app.models.reward import PointTransaction
from app.dependencies import get_current_user

router = APIRouter(tags=["analytics"])


@router.get("/events/{event_id}")
async def event_analytics(
    event_id: str,
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Etkinlik bulunamadı")
    if str(event.creator_id) != str(user.id) and not user.is_admin:
        raise HTTPException(403, "Sadece organizatör görebilir")

    # Katılımcılar
    parts_result = await db.execute(
        select(EventParticipant).where(EventParticipant.event_id == event_id)
    )
    participants = parts_result.scalars().all()
    participant_count = len(participants)

    # Şehir dağılımı
    city_map: dict[str, int] = {}
    univ_map: dict[str, int] = {}
    student_count = 0

    for p in participants:
        u = await db.get(User, p.user_id)
        if u:
            city = u.city or "Diğer"
            city_map[city] = city_map.get(city, 0) + 1
            if u.is_student:
                student_count += 1
                univ = u.university_name or "Belirtilmemiş"
                univ_map[univ] = univ_map.get(univ, 0) + 1

    # Fotoğraf sayısı
    photo_result = await db.execute(
        select(func.count()).where(EventPhoto.event_id == event_id)
    )
    photo_count = photo_result.scalar() or 0

    # Yorum sayısı ve ortalama puan
    comment_result = await db.execute(
        select(EventComment).where(EventComment.event_id == event_id)
    )
    comments = comment_result.scalars().all()
    comment_count = len(comments)
    ratings = [c.rating for c in comments if c.rating is not None]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else None

    # Dağılımı sıralı liste haline getir
    city_dist = sorted(
        [{"label": k, "count": v} for k, v in city_map.items()],
        key=lambda x: x["count"], reverse=True
    )[:8]
    univ_dist = sorted(
        [{"label": k, "count": v} for k, v in univ_map.items()],
        key=lambda x: x["count"], reverse=True
    )[:8]

    capacity_pct = round(participant_count / event.max_participants * 100) if event.max_participants else 100

    return {
        "event_id":         event_id,
        "event_title":      event.title,
        "event_date":       event.event_date.isoformat() if event.event_date else None,
        "event_category":   event.category,
        "max_participants": event.max_participants,
        "participant_count": participant_count,
        "capacity_pct":     capacity_pct,
        "student_count":    student_count,
        "student_pct":      round(student_count / participant_count * 100) if participant_count else 0,
        "photo_count":      photo_count,
        "comment_count":    comment_count,
        "avg_rating":       avg_rating,
        "city_distribution":     city_dist,
        "university_distribution": univ_dist,
        "total_points_awarded":   participant_count * 20,
    }


@router.get("/impact")
async def platform_impact(db: AsyncSession = Depends(get_db)):
    """Platform geneli etki istatistikleri (herkese açık)."""

    # Toplam etkinlik sayısı
    total_events = (await db.execute(select(func.count()).select_from(Event))).scalar() or 0
    completed    = (await db.execute(
        select(func.count()).where(Event.status == "completed")
    )).scalar() or 0

    # Toplam katılım
    total_parts = (await db.execute(
        select(func.count()).select_from(EventParticipant)
    )).scalar() or 0

    # Toplam kullanıcı
    total_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)  # noqa: E712
    )).scalar() or 0

    # Şehir sayısı
    city_result = await db.execute(
        select(Event.city).distinct().where(Event.city.isnot(None))
    )
    city_count = len(city_result.scalars().all())

    # Fotoğraf
    photo_count = (await db.execute(
        select(func.count()).select_from(EventPhoto)
    )).scalar() or 0

    # Puan işlemleri
    points_result = await db.execute(
        select(func.sum(PointTransaction.points)).where(PointTransaction.points > 0)
    )
    total_points = int(points_result.scalar() or 0)

    # Kategori dağılımı
    cat_result = await db.execute(
        select(Event.category, func.count()).group_by(Event.category)
        .where(Event.category.isnot(None))
    )
    categories = [
        {"category": row[0], "count": row[1]}
        for row in cat_result.all()
    ]

    # Tahmini etki metrikleri (etkinlik sayısına orantılı)
    return {
        "total_events":       total_events,
        "completed_events":   completed,
        "total_participants": total_parts,
        "total_users":        total_users,
        "active_cities":      city_count,
        "total_photos":       photo_count,
        "total_points":       total_points,
        "category_breakdown": categories,
        # Tahmini somut etkiler
        "trees_planted":      completed * 12,
        "children_educated":  completed * 8,
        "animals_helped":     completed * 5,
        "hours_volunteered":  total_parts * 4,
        "kg_waste_collected": completed * 25,
    }


@router.get("/impact/user/{user_id}")
async def user_impact(user_id: str, db: AsyncSession = Depends(get_db)):
    """Kullanıcının kişisel etki özeti."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Kullanıcı bulunamadı")

    # Katıldığı etkinlikler
    parts_result = await db.execute(
        select(EventParticipant).where(EventParticipant.user_id == user_id)
    )
    parts = parts_result.scalars().all()
    joined_count = len(parts)

    # Oluşturduğu etkinlikler
    created_result = await db.execute(
        select(func.count()).where(Event.creator_id == user_id)
    )
    created_count = created_result.scalar() or 0

    # Yüklediği fotoğraflar
    photos_count = (await db.execute(
        select(func.count()).where(EventPhoto.uploader_id == user_id)
    )).scalar() or 0

    # Kategori kırılımı
    cat_map: dict[str, int] = {}
    for p in parts:
        ev = await db.get(Event, p.event_id)
        if ev and ev.category:
            cat_map[ev.category] = cat_map.get(ev.category, 0) + 1

    top_category = max(cat_map, key=lambda k: cat_map[k]) if cat_map else None

    return {
        "user_id":         user_id,
        "full_name":       user.full_name,
        "avatar_url":      user.avatar_url,
        "badge":           user.badge,
        "total_points":    user.total_points,
        "joined_count":    joined_count,
        "created_count":   created_count,
        "photos_uploaded": photos_count,
        "volunteer_hours": joined_count * 4,
        "top_category":    top_category,
        "categories":      cat_map,
        # Kişisel tahmini etki
        "trees_planted":   joined_count * 2,
        "children_helped": joined_count,
        "hours_given":     joined_count * 4,
    }
