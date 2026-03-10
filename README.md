# GönüllüAI

Yapay zeka destekli gönüllülük platformu. Kullanıcılar etkinlik oluşturabilir, katılabilir ve yeteneklerine göre AI tarafından kişiselleştirilmiş etkinlik önerileri alabilir.

---

## Mimari

```
Gönüllük_web/
├── gonullu-ai-frontend/   # React + TypeScript + Tailwind CSS
└── gonullu-ai-backend/    # FastAPI + SQLAlchemy + SQLite
```

### Frontend Katman Yapısı

```
src/
├── api/                   # HTTP istemcisi ve API fonksiyonları
│   ├── client.ts          # Axios örneği; token yönetimi, mock fallback
│   ├── auth.ts            # Kimlik doğrulama endpoint'leri
│   ├── events.ts          # Etkinlik endpoint'leri
│   ├── clubs.ts           # Kulüp endpoint'leri
│   ├── rewards.ts         # Ödül endpoint'leri
│   ├── mockHandlers.ts    # Backend yokken devreye giren mock sistemi
│   └── mockData.ts        # Mock veri (kullanıcı, etkinlik, kulüp vb.)
│
├── components/
│   ├── common/            # Yeniden kullanılabilir UI bileşenleri
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   └── Chip.tsx
│   ├── events/
│   │   └── EventCard.tsx  # Etkinlik kart bileşeni
│   ├── routing/
│   │   └── ProtectedRoute.tsx  # Kimlik doğrulama koruyucusu
│   ├── Navbar.tsx
│   ├── NotificationPanel.tsx
│   └── ErrorBoundary.tsx  # React hata sınırı
│
├── contexts/
│   └── AuthContext.tsx    # JWT tabanlı kimlik doğrulama bağlamı
│
├── hooks/                 # Özel React hook'ları
│   ├── useDiscoverEvents.ts  # Etkinlik keşfi state + side-effect mantığı
│   └── useSkillMatch.ts      # Yetenek-etkinlik eşleştirme + Gemini AI
│
├── pages/                 # Route bileşenleri (1 sayfa = 1 dosya)
│   ├── Home.tsx
│   ├── Dashboard.tsx
│   ├── Discover.tsx
│   ├── EventDetail.tsx
│   ├── EventCreate.tsx    # Gemini ile AI açıklama yardımcısı
│   ├── Skills.tsx         # Yetenek bazlı AI eşleştirme
│   ├── ClubsList.tsx
│   ├── ClubDetail.tsx
│   └── ...
│
├── types/
│   └── index.ts           # Tüm TypeScript arayüzleri ve tipler
│
└── utils/
    ├── cn.ts              # Tailwind sınıf birleştirici
    ├── formatDate.ts      # Tarih biçimlendirme
    ├── formatPoints.ts    # Puan ve rozet yardımcıları
    └── resolveMediaUrl.ts # Backend medya URL çözümleyici
```

### Backend Katman Yapısı

```
app/
├── main.py                # FastAPI uygulama başlangıcı, CORS, router kaydı
├── config.py              # Pydantic Settings (.env okuma)
├── database.py            # SQLAlchemy async engine ve oturum
├── dependencies.py        # Ortak Depends: get_db, get_current_user
├── utils.py               # Ortak yardımcı: new_uuid()
│
├── models/                # SQLAlchemy ORM modelleri
│   ├── user.py
│   ├── event.py           # Event, EventParticipant, EventPhoto, EventComment
│   ├── club.py
│   ├── reward.py          # DigitalReward, PointTransaction, Notification
│   └── journal.py
│
├── schemas/               # Pydantic request/response şemaları
│   ├── user.py
│   └── event.py
│
├── routers/               # API endpoint'leri (prefix: /api/*)
│   ├── auth.py            # /api/auth  — kayıt, giriş, token yenileme
│   ├── events.py          # /api/events — CRUD, katılım, doğrulama, AI
│   ├── users.py           # /api/users — profil, avatar, istatistikler
│   ├── clubs.py           # /api/clubs — üniversite kulüpleri
│   ├── rewards.py         # /api/rewards — ödüller, sertifika
│   ├── leaderboard.py     # /api/leaderboard
│   ├── notifications.py   # /api/notifications
│   ├── journal.py         # /api/journal — gönüllülük günlüğü
│   └── analytics.py       # /api/analytics — etkinlik istatistikleri
│
└── services/              # İş mantığı servisleri
    ├── ai_service.py      # Google Gemini 1.5 Flash entegrasyonu
    ├── point_service.py   # Puan verme, rozet yükseltme, ödül kilidi açma
    ├── auth_service.py    # Parola hashleme, JWT üretimi
    ├── cert_service.py    # PDF sertifika üretimi (ReportLab)
    └── photo_validator.py # Yüklenen görsel doğrulama
```

---

## AI Entegrasyonu

Platform [Google Gemini 1.5 Flash](https://ai.google.dev/) modelini üç farklı özellik için kullanır:

| Özellik | Endpoint | Açıklama |
|---|---|---|
| Etkinlik sıralama | `GET /api/events/discover` | Kullanıcı profili ve etkinlik listesi Gemini'ye gönderilir; her etkinliğe 0–100 uyum skoru atanır |
| Yetenek eşleşme nedeni | `POST /api/events/ai-skill-reasons` | Seçili yeteneklere göre her etkinlik için kişisel eşleşme cümlesi üretilir |
| Karşılama mesajı | `GET /api/events/ai-welcome` | Kullanıcının ilgi alanlarına göre dashboard için kişiselleştirilmiş mesaj |
| Etkinlik açıklaması | `POST /api/events/ai-generate-description` | Başlık ve kategoriye göre otomatik açıklama taslağı |

Gemini API anahtarı `.env` dosyasındaki `GEMINI_API_KEY` değişkeniyle yapılandırılır.

---

## Puan Sistemi

| Eylem | Puan |
|---|---|
| Hesap oluşturma | +30 |
| Etkinlik oluşturma | +50 |
| Katılım doğrulama (QR / kod) | **+35** |
| Etkinlik tamamlama bonusu | +25 |
| Fotoğraf yükleme | +10 |
| Yorum yapma | +5 |
| Geç iptal (24 saatten az) | -5 |

Etkinliğe kayıt olmak puan **vermez** — fiziksel varlık doğrulanınca puan kazanılır.

### Rozet Sistemi

| Rozet | Gerekli Kazanılan Puan |
|---|---|
| 🌱 Filiz | 0 |
| 🌿 Genç | 100 |
| ⭐ Aktif | 300 |
| 🏆 Deneyimli | 700 |
| 👑 Lider | 1 500 |
| 🔥 Efsane | 3 000 |

---

## Mock Modu

Backend erişilemez olduğunda uygulama otomatik olarak **mock moda** geçer. `src/api/client.ts` içindeki Axios response interceptor, ağ hatası alındığında `src/api/mockHandlers.ts`'deki 30+ pattern tabanlı handler'a yönlendirir.

Mock mod ayrı bir yapılandırma gerektirmez. Backend tekrar çalışır duruma geldiğinde 30 saniye içinde otomatik olarak gerçek API'ye geçiş yapılır.

---

## Kurulum

### Gereksinimler

- Node.js 18+
- Python 3.11+

### Backend

```bash
cd gonullu-ai-backend

# Sanal ortam oluştur ve bağımlılıkları yükle
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS/Linux
pip install -r requirements.txt

# Ortam değişkenlerini yapılandır (.env.example'ı kopyala)
cp .env.example .env           # GEMINI_API_KEY'i doldur

# Sunucuyu başlat (veritabanı tabloları otomatik oluşur)
uvicorn app.main:app --reload --port 8000
```

API belgelerine `http://localhost:8000/docs` adresinden ulaşılabilir.

### Frontend

```bash
cd gonullu-ai-frontend

npm install
npm run dev
```

Uygulama `http://localhost:5175` adresinde açılır.

---

## Ortam Değişkenleri

### Backend (`gonullu-ai-backend/.env`)

| Değişken | Açıklama | Örnek |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy bağlantı dizesi | `sqlite+aiosqlite:///./gonulluai.db` |
| `SECRET_KEY` | JWT imzalama anahtarı (güçlü, rastgele) | — |
| `GEMINI_API_KEY` | Google AI Studio API anahtarı | `AIzaSy...` |
| `FRONTEND_URL` | CORS izin verilen origin | `http://localhost:5175` |
| `SMTP_USER` / `SMTP_PASS` | E-posta bildirimi (opsiyonel) | — |

### Frontend (`gonullu-ai-frontend/.env`)

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `VITE_API_URL` | Backend API temel URL'si | `http://localhost:8000/api` |

---

## Teknoloji Yığını

### Frontend
- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 7](https://vitejs.dev/) — geliştirme sunucusu ve derleme
- [React Router 7](https://reactrouter.com/) — istemci tarafı yönlendirme
- [Tailwind CSS 3](https://tailwindcss.com/) — utility-first stil
- [Axios](https://axios-http.com/) — HTTP istemcisi
- [Lucide React](https://lucide.dev/) — ikon kütüphanesi

### Backend
- [FastAPI](https://fastapi.tiangolo.com/) — Python async web çerçevesi
- [SQLAlchemy 2](https://www.sqlalchemy.org/) — async ORM
- [SQLite](https://www.sqlite.org/) — yerel veritabanı
- [Google Gemini 1.5 Flash](https://ai.google.dev/) — AI dil modeli
- [python-jose](https://python-jose.readthedocs.io/) — JWT
- [ReportLab](https://www.reportlab.com/) — PDF sertifika üretimi
- [slowapi](https://slowapi.readthedocs.io/) — rate limiting
