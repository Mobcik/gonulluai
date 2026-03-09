from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# SQLite için connect_args, PostgreSQL için pool ayarları
is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    # SQLite'ta pool_size desteklenmez
    **({} if is_sqlite else {"pool_size": 10, "max_overflow": 20}),
    connect_args={"check_same_thread": False} if is_sqlite else {},
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_all_tables():
    """Tüm tabloları oluşturur. Uygulama başlarken çağrılır."""
    # Tüm modelleri import et (Base'e kaydettirmek için)
    from app.models import (  # noqa: F401
        User, Club, ClubMembership,
        Event, EventParticipant, EventPhoto, EventComment,
        DigitalReward, RewardUnlock, PointTransaction, Notification, RefreshToken,
    )
    from app.models.journal import JournalEntry  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Tablolar hazir.")
