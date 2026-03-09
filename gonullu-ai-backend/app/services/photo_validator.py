import httpx
import base64
import json
from app.config import settings

VALIDATION_PROMPT = """
Bu fotoğraf bir gönüllülük etkinliğine uygun mu?

Uygun: açık hava aktivitesi, insan grubu, doğa çalışması, hayvan bakımı,
       eğitim ortamı, temizlik, sosyal etkinlik, seminer/atölye.
Uygunsuz: pornografi, şiddet, reklam, ekran görüntüsü, boş/anlamsız görüntü.

SADECE JSON döndür: {"valid": true/false, "confidence": 0-100, "reason": "..."}
"""


async def validate_event_photo(image_bytes: bytes) -> dict:
    if not settings.GEMINI_API_KEY:
        return {"valid": True, "confidence": 100, "reason": "API anahtarı yok, doğrulama atlandı"}

    b64 = base64.b64encode(image_bytes).decode()

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}",
                json={
                    "contents": [{
                        "parts": [
                            {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                            {"text": VALIDATION_PROMPT},
                        ]
                    }]
                },
            )

        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        text = text.strip().strip("```json").strip("```").strip()
        return json.loads(text)
    except Exception as e:
        return {"valid": True, "confidence": 70, "reason": f"Doğrulama servisi geçici olarak kullanılamıyor: {str(e)}"}
