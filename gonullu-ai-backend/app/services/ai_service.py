"""
GönüllüAI — AI Servisi
Önce gemini-2.0-flash dener; erişilemezse gemini-1.5-flash'a geçer.
"""
import httpx
import json
import logging
import random
import re
from app.config import settings

log = logging.getLogger(__name__)

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/"
_MODELS     = ["gemini-2.0-flash", "gemini-1.5-flash"]   # öncelik sırası

BADGE_LABEL = {
    "filiz":     "yeni başlayan gönüllü",
    "genc":      "genç gönüllü",
    "aktif":     "aktif gönüllü",
    "deneyimli": "deneyimli gönüllü",
    "lider":     "lider gönüllü",
    "efsane":    "efsane gönüllü",
}

_WELCOME_STARTERS = [
    "Tekrar hoş geldin",
    "Seni görmek harika",
    "Merhaba",
    "Bugün de buradayken",
    "Güne başlamak için iyi zaman",
]

# Kategori → somut faaliyet açıklaması (fallback şablon için)
_CATEGORY_ACTIONS: dict[str, str] = {
    "Çevre":         "doğayı koruma ve yeşillendirme faaliyetlerinde",
    "Eğitim":        "eğitime destek ve bilgi paylaşımı çalışmalarında",
    "Sağlık":        "sağlık hizmetleri ve bilinçlendirme etkinliklerinde",
    "Hayvan Hakları":"hayvan refahı ve barınak destek faaliyetlerinde",
    "Yaşlı Bakımı":  "yaşlı bakımı ve sosyal destek hizmetlerinde",
    "Çocuk Gelişimi":"çocuk gelişimi ve eğitim destek programlarında",
    "Teknoloji":     "teknoloji ile sosyal fayda yaratan projelerde",
    "Sanat & Kültür":"sanat ve kültür etkinliklerinde",
}

_CATEGORY_DETAIL: dict[str, str] = {
    "Çevre":         "Ağaç dikme, park temizliği, doğa yürüyüşü gibi somut görevler üstleneceksin.",
    "Eğitim":        "Öğrencilere ders desteği verecek, eğitim materyalleri hazırlamaya yardımcı olacaksın.",
    "Sağlık":        "Sağlık taraması organizasyonunda görev alacak, bilinçlendirme materyalleri dağıtacaksın.",
    "Hayvan Hakları":"Barınak hayvanlarına bakacak, sahiplendirme organizasyonunda aktif rol üstleneceksin.",
    "Yaşlı Bakımı":  "Yaşlı bireylere sosyal destek verecek, aktivite organizasyonlarına katkı sağlayacaksın.",
    "Çocuk Gelişimi":"Çocuklarla oyun, sanat ve eğitim aktiviteleri düzenleyeceksin.",
    "Teknoloji":     "Kod yazacak, tasarım yapacak ya da teknik destek vereceksin.",
    "Sanat & Kültür":"Etkinlik organizasyonu, dekor veya performans süreçlerinde görev alacaksın.",
}


# ─── Düşük seviyeli API çağrısı ───────────────────────────────────────────────

async def _gemini_call(
    user_prompt:   str,
    system_prompt: str  = "",
    max_tokens:    int  = 1000,
    temperature:   float = 0.8,
) -> str:
    """Gemini API'ye istek at. Model listesini sırayla dener."""
    payload: dict = {
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature":     temperature,
            "topP":            0.95,
            "topK":            40,
        },
    }
    if system_prompt:
        payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

    last_err: Exception | None = None
    async with httpx.AsyncClient(timeout=25) as client:
        for model in _MODELS:
            url = f"{GEMINI_BASE}{model}:generateContent"
            try:
                resp = await client.post(
                    url, params={"key": settings.GEMINI_API_KEY}, json=payload
                )
                resp.raise_for_status()
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            except Exception as e:
                log.warning("Gemini model %s failed: %s", model, e)
                last_err = e

    raise last_err or RuntimeError("Tüm Gemini modelleri başarısız")


def _extract_json(text: str) -> str:
    """Metin içinden JSON bloğunu çıkar — kod çiti veya düz metin olabilir."""
    text = text.strip()
    # ```json ... ``` veya ``` ... ``` bloğu
    if text.startswith("```"):
        inner = re.sub(r"^```[a-z]*\n?", "", text)
        inner = re.sub(r"\n?```$", "", inner)
        return inner.strip()
    # İlk { veya [ karakterinden başlayan bloğu al
    m = re.search(r"[\[{]", text)
    if m:
        return text[m.start():]
    return text


# ─── Etkinlik Sıralama ────────────────────────────────────────────────────────

_RANK_SYSTEM = """Sen GönüllüAI platformunun etkinlik eşleştirme motorusun.
Kullanıcı profili ve etkinlik listesi verildiğinde her etkinlik için 0-100 uyum skoru üret.
Puanlama: ilgi alanı +40, şehir +25, yetenek +20, kategori geçmişi +15.
SADECE JSON döndür: [{"event_id":"...","score":85}]"""


async def rank_events(user, events: list) -> list:
    if not settings.GEMINI_API_KEY or not events:
        return events

    user_ctx   = {"interests": user.interests or [], "skills": user.skills or [], "city": user.city or ""}
    events_ctx = [{"id": str(e.id), "title": e.title, "category": e.category,
                   "city": e.city, "skills": _safe_list(e.required_skills)} for e in events]
    try:
        text   = await _gemini_call(
            f"Kullanıcı: {json.dumps(user_ctx, ensure_ascii=False)}\n"
            f"Etkinlikler: {json.dumps(events_ctx, ensure_ascii=False)}",
            _RANK_SYSTEM, max_tokens=1500, temperature=0.3,
        )
        scores    = json.loads(_extract_json(text))
        score_map = {s["event_id"]: s.get("score", 0) for s in scores}
        return sorted(events, key=lambda e: score_map.get(str(e.id), 0), reverse=True)
    except Exception as e:
        log.warning("rank_events failed: %s", e)
        return events


# ─── Dashboard Karşılama Mesajı ───────────────────────────────────────────────

_WELCOME_SYSTEM = """Sen GönüllüAI gönüllülük platformunun yazarısın.
Kullanıcıya ÇOK KİŞİSEL, samimi, motive edici bir Türkçe karşılama mesajı yazıyorsun.

KESİN KURALLAR:
1. Kullanıcının GERÇEK ADINI kullan
2. Verilen ilgi alanı veya yeteneği açıkça belirt
3. Önerilen etkinlik varsa başlığını veya konusunu mutlaka anmak
4. Klişe ifadelerden KAÇIN: "harika etkinlikler", "seni bekliyor", "fark yarat"
5. Maksimum 1 cümle, maksimum 120 karakter
6. Tam olarak 1 emoji kullan (sona koy)
7. Sadece mesaj metnini döndür — başka hiçbir şey yazma

İYİ ÖRNEKLER:
- "Ayşe, çevre projelerin bu hafta Kadıköy parkında can buluyor 🌱"
- "Mehmet, yazılım yeteneğin bugün engelli çocuklara dokunacak 💻"
- "Zeynep, 3. etkinliğine gidiyorsun — İzmir'in en aktif gönüllüsü sensin 🔥"

KÖTÜ ÖRNEKLER (yazma):
- "Merhaba! Bugün harika etkinlikler seni bekliyor 🌿"
- "Gönüllülük yolculuğunda fark yarat!" """


async def generate_welcome(user, top_event_title: str = "") -> str:
    if not settings.GEMINI_API_KEY:
        return ""

    first_name = (user.full_name or "Gönüllü").split()[0]
    interests  = user.interests or []
    skills     = user.skills or []
    starter    = random.choice(_WELCOME_STARTERS)

    facts = [f"Ad: {first_name}", f"Rozet: {BADGE_LABEL.get(user.badge or '', 'gönüllü')}"]
    if user.city:          facts.append(f"Şehir: {user.city}")
    if interests:          facts.append(f"İlgi alanları: {', '.join(interests)}")
    if skills:             facts.append(f"Yetenekler: {', '.join(skills)}")
    if user.total_points:  facts.append(f"Toplam puan: {user.total_points}")
    if top_event_title:    facts.append(f"Bugünün önerilen etkinliği: '{top_event_title}'")

    prompt = (
        "Kullanıcı bilgileri:\n" + "\n".join(f"  - {f}" for f in facts) +
        f"\n\nBu kullanıcıya kişisel bir karşılama mesajı yaz. "
        f"Mesaj '{starter}' veya farklı bir ifadeyle başlayabilir. "
        f"İlgi alanlarından/yeteneklerden birini ve "
        f"{'önerilen etkinliği ' if top_event_title else 'gönüllülük faaliyetini '}mutlaka anmak."
    )

    try:
        msg = await _gemini_call(prompt, _WELCOME_SYSTEM, max_tokens=130, temperature=0.9)
        return msg.strip().strip('"').split("\n")[0]
    except Exception as e:
        log.warning("generate_welcome failed: %s", e)
        interest = interests[0] if interests else "gönüllülük"
        return f"{first_name}, {interest} alanında bugün yeni bir adım atma zamanı 🌿"


# ─── Yetenek-Etkinlik Eşleşme Nedeni ─────────────────────────────────────────

_SKILL_SYSTEM = """Sen GönüllüAI platformunun kişiselleştirme motorusun.
Kullanıcının yeteneklerini belirli etkinliklerle eşleştiren ÖZGÜN cümleler yazıyorsun.

KESİN KURALLAR:
1. Her cümlede verilen YETENEKLERDEN EN AZ BİRİNİN ADINI açıkça kullan
2. ETKİNLİĞİN BAŞLIĞINA veya kategorisine doğrudan atıf yap
3. Klişelerden kaçın: "fark yarat", "katkı sağla", "değer katmak"
4. Her etkinlik için FARKLI bir cümle yapısı kullan
5. Maksimum 130 karakter
6. Tırnak işareti kullanma
7. SADECE JSON döndür: [{"event_id":"...","reason":"..."}]

ÖRNEK (yetenekler: ["Yazılım","Tasarım"]):
[{"event_id":"1","reason":"Yazılım yeteneğin engelli çocuklar için geliştirilecek bu uygulamada kritik rol oynayacak"},
 {"event_id":"2","reason":"Tasarım becerinle park tabelaları çok daha dikkat çekici olacak"}]"""


async def generate_skill_reasons(skills: list, events: list) -> list:
    if not settings.GEMINI_API_KEY or not events:
        return []

    skills_str  = ", ".join(skills) if skills else "genel gönüllülük"
    events_json = json.dumps(
        [{"id": str(e["id"]), "title": e["title"], "category": e["category"],
          "required_skills": e.get("required_skills") or []} for e in events],
        ensure_ascii=False,
    )
    try:
        text = await _gemini_call(
            f"Kullanıcı yetenekleri: [{skills_str}]\n\nEtkinlikler:\n{events_json}",
            _SKILL_SYSTEM, max_tokens=600, temperature=0.85,
        )
        return json.loads(_extract_json(text))
    except Exception as e:
        log.warning("generate_skill_reasons failed: %s", e)
        return []


# ─── Etkinlik Açıklaması Üretimi ──────────────────────────────────────────────

_DESC_SYSTEM = """Sen GönüllüAI platformu için Türkçe etkinlik içeriği yazan bir yazarsın.

GÖREV:
1. short_description: ETKİNLİK BAŞLIĞINI içeren, eylem odaklı, max 100 karakter
   - Başlığı olduğu gibi KULLAN, şehri belirt
   - Örnek: "Kadıköy'de ağaç dikerek şehrin yeşil dokusunu güçlendiriyoruz"
   - Örnek: "İzmir sokaklarındaki başıboş kedilere mama ve klinik desteği sağlıyoruz"

2. description: 3 ayrı paragraf, düz metin (markdown, başlık, madde işareti YOK)
   Paragraf 1 — Etkinliğin amacı ve neden bu şehirde/kategoride önemli
   Paragraf 2 — Gönüllüler etkinlikte SOMUT olarak ne yapacak (spesifik görevler)
               Lojistik detaylar (adres, buluşma noktası, saat) verilmişse bu paragrafa DOĞAL biçimde ekle
   Paragraf 3 — Katılımın katkısı ve kazanımlar (klişe değil, somut)

YASAKLAR:
- "gerçek bir fark yarat", "anlamlı katkı", "herkes katılabilir" gibi klişeler
- ## başlıklar, ** kalın, - maddeler gibi markdown
- Genel "gönüllülük" lafazanlığı

SADECE JSON döndür (başka hiçbir şey yazma):
{"short_description":"...","description":"..."}"""


async def generate_event_description(
    title: str, category: str, city: str, extra_context: str = "",
) -> dict:
    if not settings.GEMINI_API_KEY:
        return {}

    # extra_context: adres, buluşma noktası, saat gibi lojistik bilgileri içerir
    prompt = (
        f"Etkinlik başlığı: {title}\n"
        f"Kategori: {category}\n"
        f"Şehir: {city}\n"
        + (f"Lojistik detaylar: {extra_context}\n" if extra_context else "")
        + "\nBu etkinlik için short_description ve description üret. "
          "Lojistik detayları (adres, saat, buluşma noktası) açıklamaya doğal şekilde yansıt. "
          "Tüm içerik Türkçe olmalı."
    )

    try:
        text   = await _gemini_call(prompt, _DESC_SYSTEM, max_tokens=900, temperature=0.8)
        result = json.loads(_extract_json(text))
        # Gelen description'da markdown varsa temizle
        if "description" in result:
            desc = result["description"]
            desc = re.sub(r"^#{1,3}\s+.+\n?", "", desc, flags=re.MULTILINE)  # başlıklar
            desc = re.sub(r"\*\*(.+?)\*\*", r"\1", desc)                      # kalın
            desc = re.sub(r"^\s*[-*]\s+", "", desc, flags=re.MULTILINE)        # maddeler
            result["description"] = desc.strip()
        return result
    except Exception as e:
        log.warning("generate_event_description failed: %s", e)
        return {}


# ─── Yardımcı ─────────────────────────────────────────────────────────────────

def _safe_list(value) -> list:
    """JSON string veya None → Python list. Hata durumunda [] döner."""
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        result = json.loads(value)
        return result if isinstance(result, list) else []
    except (json.JSONDecodeError, TypeError):
        return []
