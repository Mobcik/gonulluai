"""
Veritabanı tabloları oluşturur ve örnek veri ekler.
Çalıştır: python create_tables.py
"""
import asyncio
import json
from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.config import settings
from app.database import Base

# Modelleri import et (Base'e kaydetmek için)
from app.models.user import User
from app.models.club import Club, ClubMembership
from app.models.event import Event, EventParticipant
from app.models.reward import DigitalReward, PointTransaction, Notification, RewardUnlock, RefreshToken  # noqa


def uid():
    return str(uuid4())


async def create_tables():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("\n[OK] Tum tablolar olusturuldu!\n")

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as db:
        # Zaten veri varsa ekleme
        existing = await db.execute(select(User).limit(1))
        if existing.scalar_one_or_none():
            print("[SKIP] Ornek veri zaten mevcut, atlaniyor.")
            return

        # ─── Kullanıcılar ──────────────────────────────────────────────────────────
        from app.services.auth_service import hash_password

        admin_id  = uid()
        user1_id  = uid()
        user2_id  = uid()
        user3_id  = uid()

        users = [
            User(
                id=admin_id,
                email="admin@gonulluai.com",
                hashed_password=hash_password("admin123"),
                full_name="Admin Kullanıcı",
                city="İstanbul",
                role="admin",
                is_admin=True,
                is_active=True,
                total_points=5000,
                earned_points=5000,
                badge="efsane",
                streak_days=30,
                interests=json.dumps(["çevre", "eğitim"]),
                skills=json.dumps(["liderlik", "organizasyon"]),
            ),
            User(
                id=user1_id,
                email="demo@test.com",
                hashed_password=hash_password("demo123"),
                full_name="Zeynep Kaya",
                city="İstanbul",
                role="user",
                is_active=True,
                total_points=1250,
                earned_points=1250,
                badge="lider",
                streak_days=7,
                interests=json.dumps(["çevre", "hayvan hakları", "eğitim"]),
                skills=json.dumps(["iletişim", "takım çalışması"]),
                bio="Gönüllülük benim için bir yaşam biçimi.",
            ),
            User(
                id=user2_id,
                email="student@metu.edu.tr",
                hashed_password=hash_password("student123"),
                full_name="Ahmet Yılmaz",
                city="Ankara",
                role="student",
                is_student=True,
                university_name="Orta Doğu Teknik Üniversitesi",
                is_active=True,
                total_points=480,
                earned_points=480,
                badge="aktif",
                streak_days=3,
                interests=json.dumps(["teknoloji", "eğitim"]),
                skills=json.dumps(["programlama", "analitik düşünce"]),
            ),
            User(
                id=user3_id,
                email="ayse@gmail.com",
                hashed_password=hash_password("pass1234"),
                full_name="Ayşe Demir",
                city="İzmir",
                role="user",
                is_active=True,
                total_points=320,
                earned_points=320,
                badge="aktif",
                streak_days=5,
                interests=json.dumps(["hayvan hakları", "spor"]),
                skills=json.dumps(["empati", "sabır"]),
            ),
        ]
        db.add_all(users)
        await db.flush()
        print("[OK] Kullanicilar eklendi")

        # ─── Kulüp ────────────────────────────────────────────────────────────────
        club_id = uid()
        club = Club(
            id=club_id,
            name="ODTÜ Gönüllülük Kulübü",
            university="Orta Doğu Teknik Üniversitesi",
            description="ODTÜ kampüsünde gönüllülük faaliyetlerini koordine eden kulüp.",
            organizer_id=user2_id,
            verified=True,
        )
        db.add(club)
        db.add(ClubMembership(club_id=club_id, user_id=user2_id))
        await db.flush()
        print("[OK] Kulup eklendi")

        # ─── Etkinlikler ──────────────────────────────────────────────────────────
        now = datetime.now()
        events_data = [
            {
                "id": uid(),
                "creator_id": admin_id,
                "title": "Sahil Temizliği — Florya",
                "short_description": "İstanbul Florya sahilini birlikte temizliyoruz!",
                "description": (
                    "İstanbul'un en güzel sahillerinden Florya'da kapsamlı bir temizlik etkinliği düzenliyoruz. "
                    "Eldivenler ve çöp torbaları tarafımızdan sağlanacak. Aile ve arkadaşlarınızla katılabilirsiniz."
                ),
                "category": "cevre",
                "city": "İstanbul",
                "address": "Florya Sahili, Bakırköy",
                "meeting_point": "Florya Metro İstasyonu Çıkışı",
                "event_date": now + timedelta(days=5),
                "end_time": now + timedelta(days=5, hours=3),
                "max_participants": 50,
                "status": "active",
                "verification_method": "code",
                "verification_code": "FLR001",
                "required_skills": json.dumps([]),
                "cover_photo_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
            },
            {
                "id": uid(),
                "creator_id": user1_id,
                "title": "Okuma Sevgisi Projesi",
                "short_description": "İlkokul öğrencilerine gönüllü okuma dersleri",
                "description": (
                    "Bağcılar'daki ilkokullarda dezavantajlı öğrencilere hafta sonu okuma ve yazma desteği veriyoruz. "
                    "Sabır ve empati en büyük yardımcılarınız olacak."
                ),
                "category": "egitim",
                "city": "İstanbul",
                "address": "Bağcılar İlçe Milli Eğitim Müdürlüğü",
                "meeting_point": "Bağcılar Meydanı",
                "event_date": now + timedelta(days=10),
                "end_time": now + timedelta(days=10, hours=4),
                "max_participants": 20,
                "status": "active",
                "verification_method": "code",
                "verification_code": "OKU002",
                "required_skills": json.dumps(["sabır", "iletişim"]),
                "cover_photo_url": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80",
            },
            {
                "id": uid(),
                "creator_id": user2_id,
                "club_id": club_id,
                "title": "Barınak Ziyareti — Ankara",
                "short_description": "Sokak hayvanları barınağında bakım ve oyun etkinliği",
                "description": (
                    "Ankara Büyükşehir Belediyesi Hayvan Barınağı'ndaki köpek ve kedilere sevgi göstermeye "
                    "ve bakımlarına yardım etmeye davet ediyoruz. Mama bağışları kabul edilmektedir."
                ),
                "category": "hayvan",
                "city": "Ankara",
                "address": "Ankara Büyükşehir Belediyesi Hayvan Barınağı",
                "meeting_point": "Barınak Ana Girişi",
                "event_date": now + timedelta(days=3),
                "end_time": now + timedelta(days=3, hours=2),
                "max_participants": 15,
                "status": "active",
                "verification_method": "code",
                "verification_code": "BAR003",
                "required_skills": json.dumps([]),
                "cover_photo_url": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80",
            },
            {
                "id": uid(),
                "creator_id": admin_id,
                "title": "Yaşlılarla Dijital Dünya",
                "short_description": "Huzurevinde akıllı telefon kullanımı eğitimi",
                "description": (
                    "Kadıköy'deki huzurevinde yaşlı bireylere akıllı telefon, WhatsApp ve video görüşme "
                    "kullanımını öğretiyoruz. Teknoloji bilgisi olan herkes başvurabilir."
                ),
                "category": "sosyal",
                "city": "İstanbul",
                "address": "Kadıköy Huzurevi",
                "meeting_point": "Huzurevi Resepsiyonu",
                "event_date": now + timedelta(days=7),
                "end_time": now + timedelta(days=7, hours=3),
                "max_participants": 12,
                "status": "active",
                "verification_method": "code",
                "verification_code": "DJT004",
                "required_skills": json.dumps(["teknoloji", "sabır"]),
                "cover_photo_url": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80",
            },
            {
                "id": uid(),
                "creator_id": user3_id,
                "title": "İzmir Konak Çevre Yürüyüşü",
                "short_description": "Konak'ta çevre farkındalığı yürüyüşü",
                "description": (
                    "İzmir Konak sahil şeridinde çevre kirliliğine dikkat çeken bir farkındalık yürüyüşü. "
                    "Pankartlar hazır, sen de katıl!"
                ),
                "category": "cevre",
                "city": "İzmir",
                "address": "Konak Meydanı, İzmir",
                "meeting_point": "Saat Kulesi Önü",
                "event_date": now + timedelta(days=14),
                "end_time": now + timedelta(days=14, hours=2),
                "max_participants": 100,
                "status": "active",
                "verification_method": "code",
                "verification_code": "IZM005",
                "required_skills": json.dumps([]),
                "cover_photo_url": "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
            },
        ]

        event_ids = []
        for ev_data in events_data:
            ev = Event(**ev_data)
            db.add(ev)
            event_ids.append(ev_data["id"])
        await db.flush()
        print("[OK] Etkinlikler eklendi")

        # user1 ilk iki etkinliğe katıldı
        db.add(EventParticipant(event_id=event_ids[0], user_id=user1_id))
        db.add(EventParticipant(event_id=event_ids[1], user_id=user1_id))
        db.add(EventParticipant(event_id=event_ids[2], user_id=user3_id))
        await db.flush()

        # ─── Dijital Ödüller ──────────────────────────────────────────────────────
        rewards = [
            DigitalReward(id=uid(), name="İlk Adım",        description="İlk gönüllü etkinliğini tamamladın!", threshold=50,   icon="🌱", reward_type="badge"),
            DigitalReward(id=uid(), name="Gönüllü Filizi",  description="100 puana ulaştın",                   threshold=100,  icon="🌿", reward_type="badge"),
            DigitalReward(id=uid(), name="Aktif Gönüllü",   description="300 puana ulaştın",                   threshold=300,  icon="⭐", reward_type="badge"),
            DigitalReward(id=uid(), name="Deneyimli Çevre", description="700 puana ulaştın",                   threshold=700,  icon="🏆", reward_type="badge"),
            DigitalReward(id=uid(), name="Lider Gönüllü",   description="1500 puana ulaştın",                  threshold=1500, icon="👑", reward_type="certificate"),
            DigitalReward(id=uid(), name="Efsane",          description="3000 puana ulaştın",                  threshold=3000, icon="💎", reward_type="certificate"),
        ]
        db.add_all(rewards)

        # ─── Puan geçmişi ─────────────────────────────────────────────────────────
        db.add_all([
            PointTransaction(user_id=user1_id, points=30,  reason="profile_complete"),
            PointTransaction(user_id=user1_id, points=120, reason="event_complete", event_id=event_ids[0]),
            PointTransaction(user_id=user1_id, points=80,  reason="event_complete", event_id=event_ids[1]),
            PointTransaction(user_id=user2_id, points=30,  reason="profile_complete"),
            PointTransaction(user_id=user2_id, points=150, reason="event_complete"),
        ])

        await db.commit()

    print("\n[OK] Ornek veriler basariyla eklendi!")
    print("\n-----------------------------------------")
    print("  Demo hesaplari:")
    print("  demo@test.com          -> demo123")
    print("  student@metu.edu.tr    -> student123")
    print("  admin@gonulluai.com    -> admin123")
    print("-----------------------------------------\n")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_tables())
