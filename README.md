# 🌿 GönüllüAI v4.0

**Yapay Zeka Destekli Gönüllülük Platformu**

**Stack:** TypeScript · React · Tailwind CSS · FastAPI · PostgreSQL · Supabase Storage · Claude AI · Gemini Vision

---

## Proje Yapısı

```
Gönüllük_web/
├── gonullu-ai-frontend/    # React + Vite + TypeScript + Tailwind CSS
└── gonullu-ai-backend/     # Python FastAPI
```

---

## Frontend Başlatma

```bash
cd gonullu-ai-frontend
npm install
npm run dev
# → http://localhost:5174
```

## Backend Başlatma

### 1. Python ortamı oluştur

```bash
cd gonullu-ai-backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

pip install -r requirements.txt
pip install pydantic-settings   # Gerekli ek paket
```

### 2. PostgreSQL kurulumu

PostgreSQL kur ve veritabanı oluştur:
```sql
CREATE DATABASE gonulluai;
CREATE USER gonulluai_user WITH PASSWORD 'sifre';
GRANT ALL PRIVILEGES ON DATABASE gonulluai TO gonulluai_user;
```

### 3. .env dosyasını düzenle

`gonullu-ai-backend/.env` dosyasını aç ve değerleri doldur:
- `DATABASE_URL` — PostgreSQL bağlantısı
- `ANTHROPIC_API_KEY` — Claude AI (isteğe bağlı, AI sıralama için)
- `GEMINI_API_KEY` — Gemini Vision (isteğe bağlı, fotoğraf doğrulama için)

### 4. Migration ve başlatma

```bash
# Tablolar oluştur (development için)
python -c "
import asyncio
from app.database import engine, Base
from app.models import *
async def create():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
asyncio.run(create())
"

# API'yi başlat
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000
# → http://localhost:8000/docs (Swagger UI)
```

---

## API Dokümantasyonu

Sunucu çalışırken: http://localhost:8000/docs

---

## MVP Özellikler

| Özellik | Durum |
|---|---|
| Kullanıcı kayıt / giriş | ✅ |
| .edu.tr öğrenci tespiti | ✅ |
| Etkinlik CRUD | ✅ |
| AI Discover (Claude) | ✅ |
| QR / Kod doğrulama | ✅ |
| Puan & Liderlik tablosu | ✅ |
| Fotoğraf doğrulama (Gemini) | ✅ |
| Dijital rozetler | ✅ |
| Dijital sertifika (PDF) | ✅ |
| Kulüp profili | ✅ |

---

*GönüllüAI v4.0 — Gönüllülük Çalışmaları Dersi Projesi*
