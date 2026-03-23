"""Sosyal paylaşım önizlemesi: Open Graph meta ile yönlendirme sayfası."""
from __future__ import annotations

import html

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.routers.events import get_event_or_404

router = APIRouter(tags=["share"])


def _absolute_image_url(url: str | None) -> str:
    if not url:
        return f"{settings.FRONTEND_URL.rstrip('/')}/logo.svg"
    u = url.strip()
    if u.startswith("http://") or u.startswith("https://"):
        return u
    base = settings.BACKEND_URL.rstrip("/")
    if u.startswith("/"):
        return base + u
    return base + "/" + u


@router.get("/share/events/{event_id}", response_class=HTMLResponse)
async def share_event_og(event_id: str, db: AsyncSession = Depends(get_db)):
    """
    WhatsApp / LinkedIn vb. önizleme için og:* meta.
    Paylaşılacak link: {BACKEND_URL}/share/events/{id}
    """
    event = await get_event_or_404(db, event_id)
    front = f"{settings.FRONTEND_URL.rstrip('/')}/events/{event_id}"
    title = html.escape((event.title or "Etkinlik")[:120])
    desc_raw = (event.short_description or event.description or "GönüllüAI etkinliği")[:240]
    desc = html.escape(desc_raw)
    img = html.escape(_absolute_image_url(event.cover_photo_url))
    site = html.escape("GönüllüAI")
    front_e = html.escape(front)

    return HTMLResponse(
        content=f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="{site}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:image" content="{img}" />
  <meta property="og:url" content="{front_e}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url={front_e}" />
</head>
<body>
  <p style="font-family:sans-serif;padding:1rem"><a href="{front_e}">Etkinliğe git →</a></p>
</body>
</html>"""
    )
