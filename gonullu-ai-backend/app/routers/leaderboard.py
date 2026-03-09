from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User

router = APIRouter(tags=["leaderboard"])


@router.get("/")
async def get_leaderboard(
    period: str = Query("all", enum=["week", "month", "all"]),
    city:   str | None = None,
    limit:  int = 50,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.is_active == True)
    if city:
        stmt = stmt.where(User.city == city)
    stmt = stmt.order_by(User.total_points.desc()).limit(limit)

    result = await db.execute(stmt)
    users  = result.scalars().all()

    return [
        {
            "rank":         i + 1,
            "user": {
                "id":         str(u.id),
                "full_name":  u.full_name,
                "avatar_url": u.avatar_url,
                "badge":      u.badge,
                "city":       u.city,
            },
            "total_points": u.total_points,
            "event_count":  0,
        }
        for i, u in enumerate(users)
    ]
