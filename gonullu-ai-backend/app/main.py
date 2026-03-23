from contextlib import asynccontextmanager
import asyncio
import logging
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.routers import auth, events, users, clubs, rewards, leaderboard, notifications, journal, analytics, coach, share
from app.config import settings, cors_allow_origins

log = logging.getLogger(__name__)

# Uploads klasörü — uvicorn'un çalıştığı dizine (gonullu-ai-backend/) göre
UPLOADS_DIR = Path(os.getcwd()) / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "event_photos").mkdir(exist_ok=True)


async def _reminder_background_loop():
    from app.database import AsyncSessionLocal
    from app.services import reminder_service

    first = True
    while True:
        try:
            if not first:
                await asyncio.sleep(900)
            first = False
            async with AsyncSessionLocal() as db:
                try:
                    n = await reminder_service.run_due_reminders(db)
                    if n:
                        log.info("Etkinlik hatırlatıcı: %s e-posta gönderildi", n)
                except Exception:
                    log.exception("reminder_service.run_due_reminders")
                    await db.rollback()
        except asyncio.CancelledError:
            break
        except Exception:
            log.exception("reminder background loop")


async def _digest_background_loop():
    from app.database import AsyncSessionLocal
    from app.services import digest_service

    await asyncio.sleep(120)
    while True:
        try:
            async with AsyncSessionLocal() as db:
                try:
                    n = await digest_service.run_weekly_digest_if_due(db)
                    if n:
                        log.info("Haftalık özet e-posta: %s gönderildi", n)
                except Exception:
                    log.exception("digest_service.run_weekly_digest_if_due")
                    await db.rollback()
        except asyncio.CancelledError:
            break
        await asyncio.sleep(1800)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: tabloları otomatik oluştur
    from app.database import create_all_tables
    await create_all_tables()
    reminder_task = asyncio.create_task(_reminder_background_loop())
    digest_task = asyncio.create_task(_digest_background_loop())
    try:
        yield
    finally:
        reminder_task.cancel()
        digest_task.cancel()
        try:
            await reminder_task
        except asyncio.CancelledError:
            pass
        try:
            await digest_task
        except asyncio.CancelledError:
            pass


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="GönüllüAI API",
    version="4.0",
    description="Yapay Zeka Destekli Gönüllülük Platformu",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/auth")
app.include_router(events.router,        prefix="/api/events")
app.include_router(users.router,         prefix="/api/users")
app.include_router(clubs.router,         prefix="/api/clubs")
app.include_router(rewards.router,       prefix="/api/rewards")
app.include_router(leaderboard.router,   prefix="/api/leaderboard")
app.include_router(notifications.router, prefix="/api/notifications")
app.include_router(journal.router,       prefix="/api/journal")
app.include_router(analytics.router,     prefix="/api/analytics")
app.include_router(coach.router,         prefix="/api/coach")
app.include_router(share.router)

# Yüklenen fotoğrafları statik olarak sun
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR), check_dir=False), name="uploads")


@app.get("/")
async def root():
    return {
        "name":    "GönüllüAI API",
        "version": "4.0",
        "docs":    "/docs",
        "status":  "running",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
