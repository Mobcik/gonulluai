import httpx
import json
from app.config import settings

GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-1.5-flash:generateContent"
)

RANK_SYSTEM = """
Sen GönüllüAI platformunun etkinlik eşleştirme motorusun.
Sana bir kullanıcı profili ve etkinlik listesi verilecek.
Her etkinlik için 0-100 arası uyum skoru hesapla.

Puanlama kriterleri:
  - İlgi alanı eşleşmesi: +40 puan
  - Şehir eşleşmesi: +25 puan
  - Yetenek eşleşmesi: +20 puan
  - Geçmişte aynı kategoriye katılım: +15 puan

SADECE JSON döndür, markdown veya açıklama ekleme.
Format: [{"event_id": "...", "score": 85, "reason": "Çevre ilgin ve İstanbul etkinliği"}]
"""


async def _gemini_call(prompt: str, max_tokens: int = 1000) -> str:
    """Gemini 1.5 Flash API'ye istek at, ham metin döndür."""
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            GEMINI_URL,
            params={"key": settings.GEMINI_API_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "maxOutputTokens": max_tokens,
                    "temperature": 0.3,
                },
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


async def rank_events(user, events: list) -> list:
    """Kullanıcı profiline göre etkinlikleri AI ile sırala."""
    if not settings.GEMINI_API_KEY or not events:
        return events

    user_ctx = {
        "interests": user.interests or [],
        "skills":    user.skills or [],
        "city":      user.city,
    }
    events_ctx = [
        {
            "id":              str(e.id),
            "title":           e.title,
            "category":        e.category,
            "city":            e.city,
            "required_skills": e.required_skills or [],
        }
        for e in events
    ]

    prompt = (
        f"{RANK_SYSTEM}\n\n"
        f"Kullanıcı: {json.dumps(user_ctx, ensure_ascii=False)}\n"
        f"Etkinlikler: {json.dumps(events_ctx, ensure_ascii=False)}"
    )

    try:
        text = await _gemini_call(prompt, max_tokens=1500)
        # JSON bloğunu temizle (```json ... ``` sarmalı olabilir)
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        scores = json.loads(text.strip())
        score_map = {s["event_id"]: s for s in scores}
        return sorted(
            events,
            key=lambda e: score_map.get(str(e.id), {}).get("score", 0),
            reverse=True,
        )
    except Exception:
        return events


async def generate_welcome_message(user, top_event) -> str:
    """Kullanıcıya kişiselleştirilmiş karşılama mesajı üret."""
    if not settings.GEMINI_API_KEY or not top_event:
        return f"Merhaba {user.full_name}! Bugün harika etkinlikler seni bekliyor. 🌿"

    prompt = (
        f"GönüllüAI platformunda '{user.full_name}' adlı kullanıcıya "
        f"kısa, samimi ve Türkçe bir karşılama mesajı yaz. "
        f"İlgi alanları: {', '.join(user.interests or [])}. "
        f"En iyi eşleşen etkinlik: '{top_event.title}'. "
        f"Maksimum 2 cümle, teşvik edici, 1-2 emoji kullan. "
        f"Sadece mesaj metnini yaz, başka hiçbir şey ekleme."
    )

    try:
        return await _gemini_call(prompt, max_tokens=150)
    except Exception:
        return f"Merhaba {user.full_name}! Bugün harika etkinlikler seni bekliyor. 🌿"


async def generate_skill_reasons(skills: list, events: list) -> list:
    """
    Kullanıcı yeteneklerine göre her etkinlik için kısa Türkçe eşleşme nedeni üret.
    events: [{"id": "...", "title": "...", "category": "...", "required_skills": [...]}]
    Döndürür: [{"event_id": "...", "reason": "..."}]
    """
    if not settings.GEMINI_API_KEY or not events:
        return []

    prompt = (
        f"Bir gönüllülük platformu kullanıcısının yetenekleri: {', '.join(skills) if skills else 'belirtilmemiş'}.\n\n"
        f"Aşağıdaki etkinlikler için neden bu kullanıcıya uygun olduklarını anlatan "
        f"kısa, kişisel, teşvik edici ve Türkçe bir cümle yaz (max 130 karakter, tırnak içinde değil).\n\n"
        f"Etkinlikler: {json.dumps([{'id': str(e['id']), 'title': e['title'], 'category': e['category'], 'required_skills': e.get('required_skills') or []} for e in events], ensure_ascii=False)}\n\n"
        f"SADECE JSON döndür:\n"
        f'[{{"event_id": "...", "reason": "..."}}]'
    )

    try:
        text = await _gemini_call(prompt, max_tokens=600)
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        return []


async def generate_welcome(user, top_event_title: str = "") -> str:
    """Dashboard için kişiselleştirilmiş Türkçe karşılama mesajı üret."""
    if not settings.GEMINI_API_KEY:
        return ""

    interests_str = ", ".join(user.interests or []) if user.interests else "gönüllülük"
    prompt = (
        f"GönüllüAI platformunda '{user.full_name}' adlı kullanıcıya "
        f"kısa, samimi, motive edici bir Türkçe karşılama mesajı yaz. "
        f"İlgi alanları: {interests_str}. "
        f"{'En iyi önerilen etkinlik: ' + top_event_title + '.' if top_event_title else ''} "
        f"Maksimum 1 cümle (max 120 karakter). 1 emoji kullan. "
        f"Sadece mesaj metnini yaz, başka hiçbir şey ekleme."
    )

    try:
        msg = await _gemini_call(prompt, max_tokens=100)
        return msg.strip().strip('"')
    except Exception:
        return ""


async def generate_event_description(
    title: str,
    category: str,
    city: str,
    short_desc: str = "",
) -> dict:
    """
    Etkinlik başlığı ve kategorisine göre açıklama + kısa tanım üret.
    Döndürür: {"short_description": "...", "description": "..."}
    """
    if not settings.GEMINI_API_KEY:
        return {}

    prompt = (
        f"Bir gönüllülük platformu için etkinlik içeriği yaz.\n\n"
        f"Etkinlik Başlığı: {title}\n"
        f"Kategori: {category}\n"
        f"Şehir: {city}\n"
        f"{'Kısa Not: ' + short_desc if short_desc else ''}\n\n"
        f"Türkçe olarak şunları yaz:\n"
        f"1. short_description: Etkinliği tek cümlede özetleyen çekici bir tanım (max 120 karakter)\n"
        f"2. description: Markdown formatında 3-4 paragraf detaylı açıklama. "
        f"   Gönüllülerin neden katılması gerektiğini, ne yapacaklarını ve nasıl katkı sağlayacaklarını anlat.\n\n"
        f"SADECE JSON döndür:\n"
        f'{{\"short_description\": \"...\", \"description\": \"...\"}}'
    )

    try:
        text = await _gemini_call(prompt, max_tokens=800)
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        return {}
