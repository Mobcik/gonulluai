from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from io import BytesIO
from app.database import get_db
from app.models.reward import DigitalReward, RewardUnlock
from app.models.user import User
from app.dependencies import get_current_user
from app.services.cert_service import generate_certificate

router = APIRouter(tags=["rewards"])

DEFAULT_REWARDS = [
    {"id": "r1", "name": "Filizlendi",            "description": "Gönüllülük yolculuğuna ilk adımı attın!", "threshold": 100,  "icon": "🌱", "type": "badge"},
    {"id": "r2", "name": "Aktif Gönüllü",         "description": "Özel profil çerçevesi ve liderlik ikonu", "threshold": 300,  "icon": "🏅", "type": "frame"},
    {"id": "r3", "name": "Gönüllülük Sertifikası","description": "Kişisel PDF sertifikan indirilmeye hazır!", "threshold": 500, "icon": "📜", "type": "certificate"},
    {"id": "r4", "name": "Ağaç Dikti",            "description": "Çevreye katkın dijital rozetinle kanıtlandı!", "threshold": 750, "icon": "🌳", "type": "badge"},
    {"id": "r5", "name": "Gönüllü Lideri",        "description": "Altın profil çerçevesi + özel unvan",     "threshold": 1000, "icon": "⭐", "type": "title"},
    {"id": "r6", "name": "Efsane Gönüllü",        "description": "Animasyonlu rozet + paylaşım kartı",      "threshold": 1500, "icon": "🏆", "type": "badge"},
]


@router.get("/")
async def list_rewards():
    return DEFAULT_REWARDS


@router.get("/my-unlocks")
async def my_unlocks(user: User = Depends(get_current_user)):
    return [r for r in DEFAULT_REWARDS if user.earned_points >= r["threshold"]]


@router.get("/certificate")
async def download_certificate(user: User = Depends(get_current_user)):
    if user.earned_points < 500:
        raise HTTPException(403, "Sertifika için 500 puan gerekli")

    pdf_bytes = await generate_certificate(user)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=gonulluai-sertifika.pdf"},
    )
