from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.club import Club, ClubMembership
from app.models.event import Event
from app.models.user import User
from app.dependencies import get_current_user

router = APIRouter(tags=["clubs"])


@router.get("/")
async def list_clubs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Club).order_by(Club.created_at.desc()))
    clubs  = result.scalars().all()
    return [await enrich_club(db, c) for c in clubs]


@router.get("/me/memberships")
async def my_club_memberships(
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Üyenin katıldığı kulüpler (sosyal / topluluk özeti için)."""
    result = await db.execute(
        select(Club)
        .join(ClubMembership, ClubMembership.club_id == Club.id)
        .where(ClubMembership.user_id == user.id)
        .order_by(Club.name.asc())
    )
    clubs = result.scalars().all()
    return [await enrich_club(db, c) for c in clubs]


@router.post("/")
async def create_club(
    data: dict,
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not user.is_student:
        raise HTTPException(403, "Kulüp oluşturmak için .edu.tr e-postası gerekli")

    club = Club(
        name         = data.get("name"),
        university   = user.university_name or data.get("university", ""),
        description  = data.get("description"),
        organizer_id = user.id,
        verified     = False,
    )
    db.add(club)
    await db.commit()
    return {"id": str(club.id), "message": "Kulüp oluşturuldu, admin onayı bekleniyor"}


@router.put("/{club_id}")
async def update_club(
    club_id: str,
    data: dict,
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    club = await db.get(Club, club_id)
    if not club:
        raise HTTPException(404, "Kulüp bulunamadı")
    if str(club.organizer_id) != str(user.id) and not user.is_admin:
        raise HTTPException(403, "Sadece kulüp organizatörü düzenleyebilir")
    if "announcement" in data:
        ann = data.get("announcement")
        club.announcement = (str(ann).strip() or None) if ann is not None else None
    if "description" in data:
        club.description = data.get("description")
    if data.get("name"):
        club.name = str(data["name"]).strip()[:100]
    await db.commit()
    await db.refresh(club)
    return await enrich_club(db, club)


@router.get("/{club_id}")
async def get_club(club_id: str, db: AsyncSession = Depends(get_db)):
    club = await db.get(Club, club_id)
    if not club:
        raise HTTPException(404, "Kulüp bulunamadı")
    return await enrich_club(db, club)


@router.post("/{club_id}/join")
async def join_club(
    club_id: str,
    user: User       = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(ClubMembership).where(
            ClubMembership.club_id == club_id,
            ClubMembership.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Zaten üyesin")

    db.add(ClubMembership(club_id=club_id, user_id=user.id))
    await db.commit()
    return {"message": "Kulübe katıldın!"}


@router.get("/{club_id}/events")
async def club_events(club_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Event).where(Event.club_id == club_id).order_by(Event.event_date.asc())
    )
    return result.scalars().all()


async def enrich_club(db: AsyncSession, club: Club) -> dict:
    member_count = (await db.execute(
        select(func.count()).where(ClubMembership.club_id == club.id)
    )).scalar() or 0
    event_count = (await db.execute(
        select(func.count()).where(Event.club_id == club.id)
    )).scalar() or 0

    return {
        "id":           str(club.id),
        "name":         club.name,
        "university":   club.university,
        "logo_url":     club.logo_url,
        "description":  club.description,
        "announcement": getattr(club, "announcement", None),
        "member_count": member_count,
        "event_count":  event_count,
        "verified":     club.verified,
        "organizer_id": str(club.organizer_id),
        "created_at":   club.created_at.isoformat() if club.created_at else None,
    }
