import httpx
import json
from app.config import settings

SYSTEM_PROMPT = """
Sen GönüllüAI platformunun etkinlik eşleştirme motorusun.
Sana bir kullanıcı profili ve etkinlik listesi verilecek.
Her etkinlik için 0-100 arası uyum skoru hesapla.

Puanlama:
  - İlgi alanı eşleşmesi: +40 puan
  - Şehir eşleşmesi: +25 puan
  - Yetenek eşleşmesi: +20 puan
  - Geçmişte aynı kategoriye katılım: +15 puan

SADECE JSON döndür, başka hiçbir şey yazma.
Format: [{"event_id": "...", "score": 85, "reason": "Çevre ilgin ve İstanbul etkinliği"}]
"""


async def rank_events(user, events: list) -> list:
    if not settings.ANTHROPIC_API_KEY or not events:
        return events

    user_context = {
        "interests":   user.interests or [],
        "skills":      user.skills or [],
        "city":        user.city,
    }
    events_context = [
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
        f"Kullanıcı: {json.dumps(user_context, ensure_ascii=False)}\n"
        f"Etkinlikler: {json.dumps(events_context, ensure_ascii=False)}"
    )

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key":          settings.ANTHROPIC_API_KEY,
                    "anthropic-version":  "2023-06-01",
                    "content-type":       "application/json",
                },
                json={
                    "model":      "claude-haiku-4-5-20251001",
                    "max_tokens": 1000,
                    "system":     SYSTEM_PROMPT,
                    "messages":   [{"role": "user", "content": prompt}],
                },
            )
        scores = json.loads(resp.json()["content"][0]["text"])
        score_map = {s["event_id"]: s for s in scores}
        return sorted(
            events,
            key=lambda e: score_map.get(str(e.id), {}).get("score", 0),
            reverse=True,
        )
    except Exception:
        return events


async def generate_welcome_message(user, top_event) -> str:
    if not settings.ANTHROPIC_API_KEY or not top_event:
        return f"Merhaba {user.full_name}! Bugün harika etkinlikler seni bekliyor. 🌿"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key":         settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type":      "application/json",
                },
                json={
                    "model":      "claude-haiku-4-5-20251001",
                    "max_tokens": 150,
                    "messages": [{
                        "role":    "user",
                        "content": (
                            f"GönüllüAI platformunda '{user.full_name}' adlı kullanıcıya "
                            f"kısa, samimi ve Türkçe bir karşılama mesajı yaz. "
                            f"İlgi alanları: {', '.join(user.interests or [])}. "
                            f"En iyi eşleşen etkinlik: '{top_event.title}'. "
                            f"Max 2 cümle, teşvik edici, emoji kullan."
                        ),
                    }],
                },
            )
        return resp.json()["content"][0]["text"]
    except Exception:
        return f"Merhaba {user.full_name}! Bugün harika etkinlikler seni bekliyor. 🌿"
