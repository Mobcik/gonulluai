"""Mevcut etkinliklerin cover_photo_url'lerini günceller."""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import update, select
from app.config import settings
from app.models.event import Event

PHOTO_MAP = {
    "Sahil Temizli": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    "Okuma Sevgisi": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80",
    "Barınak":       "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80",
    "Yaşlılarla":    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80",
    "İzmir":         "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
    "Konak":         "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
}


async def update_photos():
    engine = create_async_engine(settings.DATABASE_URL)
    sm = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with sm() as db:
        result = await db.execute(select(Event))
        events = result.scalars().all()

        for event in events:
            for keyword, url in PHOTO_MAP.items():
                if keyword.lower() in (event.title or "").lower():
                    event.cover_photo_url = url
                    print(f"Updated: {event.title}")
                    break

        await db.commit()

    await engine.dispose()
    print("Done!")


if __name__ == "__main__":
    asyncio.run(update_photos())
