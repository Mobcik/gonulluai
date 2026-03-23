import base64
import json
import httpx

from app.services.ai_service import (
    GEMINI_BASE,
    _MODELS,
    _extract_json,
    _gemini_key,
    _gemini_response_text,
)

VALIDATION_PROMPT = """
Bu fotoğraf bir gönüllülük etkinliğine uygun mu?

Uygun: açık hava aktivitesi, insan grubu, doğa çalışması, hayvan bakımı,
       eğitim ortamı, temizlik, sosyal etkinlik, seminer/atölye.
Uygunsuz: pornografi, şiddet, reklam, ekran görüntüsü, boş/anlamsız görüntü.

SADECE JSON döndür: {"valid": true/false, "confidence": 0-100, "reason": "..."}
"""


async def validate_event_photo(image_bytes: bytes) -> dict:
    key = _gemini_key()
    if not key:
        return {"valid": True, "confidence": 100, "reason": "API anahtarı yok, doğrulama atlandı"}

    b64 = base64.b64encode(image_bytes).decode()
    mime = (
        "image/png"
        if len(image_bytes) >= 8 and image_bytes[:8] == b"\x89PNG\r\n\x1a\n"
        else "image/jpeg"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"inlineData": {"mimeType": mime, "data": b64}},
                    {"text": VALIDATION_PROMPT},
                ]
            }
        ]
    }

    last_err: Exception | None = None
    async with httpx.AsyncClient(timeout=22) as client:
        for model in _MODELS:
            url = f"{GEMINI_BASE}{model}:generateContent"
            try:
                resp = await client.post(url, params={"key": key}, json=payload)
                resp.raise_for_status()
                text = _gemini_response_text(resp.json())
                parsed = json.loads(_extract_json(text))
                if isinstance(parsed, dict) and "valid" in parsed:
                    return parsed
                last_err = ValueError("Geçersiz JSON şekli")
            except Exception as e:
                last_err = e
                continue

    return {
        "valid": True,
        "confidence": 60,
        "reason": f"Görsel doğrulama servisi yanıt vermedi; yükleme kabul edildi ({last_err!s})",
    }
