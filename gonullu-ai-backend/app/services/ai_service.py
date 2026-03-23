"""
GönüllüAI — AI Servisi
Gemini REST API; model listesi sırayla denenir. İsteğe bağlı Ollama (yerel/kendi model) desteği.
API yoksa veya hata olursa yerel (kural tabanlı) yanıtlar.
"""
from __future__ import annotations

import httpx
import json
import logging
import random
import re
from datetime import date, timedelta
from app.config import settings

log = logging.getLogger(__name__)

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/"
# Güncel / yedek model adları (biri 404 veya kota verirse diğeri devreye girer)
_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash-latest",
]

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

_CATEGORY_ACTIONS: dict[str, str] = {
    "Çevre":          "doğayı koruma ve yeşillendirme faaliyetlerinde",
    "Eğitim":         "eğitime destek ve bilgi paylaşımı çalışmalarında",
    "Sağlık":         "sağlık hizmetleri ve bilinçlendirme etkinliklerinde",
    "Hayvan Hakları": "hayvan refahı ve barınak destek faaliyetlerinde",
    "Yaşlı Bakımı":   "yaşlı bakımı ve sosyal destek hizmetlerinde",
    "Çocuk Gelişimi": "çocuk gelişimi ve eğitim destek programlarında",
    "Teknoloji":      "teknoloji ile sosyal fayda yaratan projelerde",
    "Sanat & Kültür": "sanat ve kültür etkinliklerinde",
}

_CATEGORY_DETAIL: dict[str, str] = {
    "Çevre":          "Ağaç dikme, park temizliği, doğa yürüyüşü gibi somut görevler üstleneceksin.",
    "Eğitim":         "Öğrencilere ders desteği verecek, eğitim materyalleri hazırlamaya yardımcı olacaksın.",
    "Sağlık":         "Sağlık taraması organizasyonunda görev alacak, bilinçlendirme materyalleri dağıtacaksın.",
    "Hayvan Hakları": "Barınak hayvanlarına bakacak, sahiplendirme organizasyonunda aktif rol üstleneceksin.",
    "Yaşlı Bakımı":   "Yaşlı bireylere sosyal destek verecek, aktivite organizasyonlarına katkı sağlayacaksın.",
    "Çocuk Gelişimi": "Çocuklarla oyun, sanat ve eğitim aktiviteleri düzenleyeceksin.",
    "Teknoloji":      "Kod yazacak, tasarım yapacak ya da teknik destek vereceksin.",
    "Sanat & Kültür": "Etkinlik organizasyonu, dekor veya performans süreçlerinde görev alacaksın.",
}


def _gemini_key() -> str:
    return (settings.GEMINI_API_KEY or "").strip()


def _ollama_base() -> str:
    return (settings.OLLAMA_BASE_URL or "").strip().rstrip("/")


def _ollama_model() -> str:
    return (settings.OLLAMA_MODEL or "llama3.2").strip()


async def _ollama_chat(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 700,
    temperature: float = 0.65,
) -> str:
    """Ollama /api/chat (stream kapalı). Kendi Modelfile veya ince ayarlı model adı OLLAMA_MODEL ile verilir."""
    base = _ollama_base()
    if not base:
        raise RuntimeError("OLLAMA_BASE_URL tanımlı değil")

    payload = {
        "model": _ollama_model(),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "options": {
            "num_predict": max_tokens,
            "temperature": temperature,
        },
    }
    url = f"{base}/api/chat"
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
    msg = data.get("message") or {}
    text = (msg.get("content") or "").strip()
    if not text:
        raise RuntimeError("Ollama boş yanıt döndü")
    return text


def _gemini_response_text(data: dict) -> str:
    pf = data.get("promptFeedback")
    if pf and pf.get("blockReason"):
        raise RuntimeError(f"prompt blocked: {pf.get('blockReason')}")
    err = data.get("error")
    if err:
        raise RuntimeError(err.get("message", str(err)))
    cands = data.get("candidates") or []
    if not cands:
        raise RuntimeError("no candidates in response")
    parts = (cands[0].get("content") or {}).get("parts") or []
    texts = [p.get("text", "") for p in parts if isinstance(p, dict) and p.get("text")]
    if not texts:
        fr = cands[0].get("finishReason")
        raise RuntimeError(f"no text parts (finish={fr})")
    return "".join(texts)


async def _gemini_call(
    user_prompt:   str,
    system_prompt: str = "",
    max_tokens:    int  = 1000,
    temperature:   float = 0.8,
) -> str:
    """Gemini API'ye istek at. Model listesini sırayla dener."""
    key = _gemini_key()
    if not key:
        raise RuntimeError("GEMINI_API_KEY tanımlı değil")

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
    async with httpx.AsyncClient(timeout=28) as client:
        for model in _MODELS:
            url = f"{GEMINI_BASE}{model}:generateContent"
            try:
                resp = await client.post(url, params={"key": key}, json=payload)
                resp.raise_for_status()
                data = resp.json()
                return _gemini_response_text(data).strip()
            except Exception as e:
                log.warning("Gemini model %s failed: %s", model, e)
                last_err = e

    raise last_err or RuntimeError("Tüm Gemini modelleri başarısız")


def _extract_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        inner = re.sub(r"^```[a-zA-Z0-9]*\n?", "", text)
        inner = re.sub(r"\n?```$", "", inner)
        return inner.strip()
    m = re.search(r"[\[{]", text)
    if m:
        return text[m.start():]
    return text


def _safe_list(value) -> list:
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        result = json.loads(value)
        return result if isinstance(result, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


# ─── Yerel (API’siz) mantık ────────────────────────────────────────────────────


def rank_events_heuristic(user, events: list) -> list:
    """Şehir, ilgi alanı ve aranan yeteneklere göre skorla sırala."""
    interests_lower = {str(i).strip().lower() for i in (user.interests or []) if i}
    skills_lower = {str(s).strip().lower() for s in (user.skills or []) if s}
    city_u = (user.city or "").strip().lower()

    def score_event(e) -> tuple[int, str]:
        sc = 5
        ec = (e.city or "").strip().lower()
        if city_u and ec == city_u:
            sc += 50
        elif city_u and city_u in ec:
            sc += 28
        cat_l = (e.category or "").strip().lower()
        if cat_l and cat_l in interests_lower:
            sc += 38
        req = _safe_list(getattr(e, "required_skills", None))
        req_lower = {str(x).strip().lower() for x in req if x}
        overlap = skills_lower & req_lower
        if overlap:
            sc += 42
        elif req_lower and not skills_lower:
            sc += 8
        tie = (e.event_date.isoformat() if getattr(e, "event_date", None) else "") + (e.title or "")
        return sc, tie

    return sorted(events, key=lambda e: score_event(e), reverse=True)


def welcome_message_local(user, top_event_title: str = "") -> str:
    first = (user.full_name or "Gönüllü").split()[0]
    city = (user.city or "").strip()
    interests = user.interests or []
    skills = user.skills or []
    badge = BADGE_LABEL.get(user.badge or "", "gönüllü")
    pts = int(getattr(user, "total_points", 0) or 0)

    if top_event_title:
        t = top_event_title[:70] + ("…" if len(top_event_title) > 70 else "")
        return (
            f"{first}, öneri motoru «{t}» çağrısını profilindeki şehir, ilgi alanı ve "
            f"yetenek sinyallerine göre öne aldı. Rozet düzeyin ({badge}) ve {pts} puanlık "
            f"geçmişin, benzer etkinliklerde önceliklendirme için referans olarak kullanılıyor. "
            f"Detayları inceleyip katılım koşullarını doğrulaman yeterli ✨"
        )
    if skills:
        return (
            f"{first}, {skills[0]} yeteneğin aranan görevlerle örtüşen etkinliklerde eşleşme "
            f"skorunu yükseltiyor; şu an {pts} puan ve {badge} profiliyle öneri listesi "
            f"buna göre sıralanıyor. Keşfet üzerinden zorunlu yetenek alanlarını filtreleyerek "
            f"operasyonel uyumu hızlıca kontrol edebilirsin 🛠️"
        )
    if interests:
        act = _CATEGORY_ACTIONS.get(interests[0], "gönüllülük çalışmalarında")
        geo = f" {city} için coğrafi uyum da skora eklenir." if city else " Şehir eklediğinde coğrafi uyum skora yansır."
        return (
            f"{first}, {interests[0]} kategorisi {act} öncelikli eşleştirme yapıyor.{geo} "
            f"İlk adım olarak ilgili çağrıların kısa açıklama ve tarih alanlarını "
            f"karşılaştırmanı öneririm 🌿"
        )
    if city:
        return (
            f"{first}, {city} için açık çağrılar takvim ve kontenjan durumuna göre listeleniyor; "
            f"katılım öncesi doğrulama yöntemi (kod/QR) etkinlik kartında belirtiliyor. "
            f"Rozet ve puan geçmişin ({badge}, {pts} p.) ileride öneri ağırlıklarına yansır 📍"
        )
    return (
        f"{first}, panelde ilgi alanı ve şehir eklemen öneri kalitesini ölçülebilir biçimde "
        f"artırır; şimdilik genel gönüllülük çağrılarını tarih sırasıyla inceleyebilirsin 🌟"
    )


def skill_match_reasons_local(skills: list, events: list) -> list:
    skills = [str(s).strip() for s in (skills or []) if s]
    out: list[dict] = []
    for i, e in enumerate(events):
        eid = str(e.get("id", ""))
        title = str(e.get("title", "Etkinlik"))
        cat = str(e.get("category", ""))
        needed = e.get("required_skills") or []
        if not isinstance(needed, list):
            needed = _safe_list(needed)
        matched = [s for s in skills if s in needed]
        if matched:
            sk = matched[0]
            need_s = ", ".join(needed[:4]) if needed else "genel görevler"
            reason = (
                f"Dolaylı eşleşme değil: {sk} yeteneğin etkinliğin zorunlu alanları ({need_s}) "
                f"içinde doğrudan talep ediliyor. «{title[:36]}» ({cat}) için operasyonel uyum yüksek."
            )
        elif skills:
            pool = [
                (
                    f"{skills[0]} profilin, «{title[:34]}» kapsamında transfer edilebilir beceri "
                    f"olarak değerlendirilebilir; kategori {cat or 'genel'} ile yan beceri eşlemesi."
                ),
                (
                    f"Çağrı başlığı «{title[:32]}»; {skills[0]} yeteneği saha koordinasyonu veya "
                    f"destek rollerinde ikame görev olarak öne çıkabilir."
                ),
                (
                    f"{skills[0]} + {cat or 'gönüllülük'}: zorunlu yetenek listesi boş veya geniş; "
                    f"profil eşlemesi öncelik skorunda kategori ve şehir ağırlıklarıyla güçlenir."
                ),
            ]
            reason = pool[i % len(pool)]
        else:
            reason = (
                f"«{title[:40]}» ({cat}) şu an öneri setinde; profil yeteneklerini doldurursan "
                f"eşleşme skoru ve gerekçe metni otomatik kişiselleşir."
            )
        out.append({"event_id": eid, "reason": reason[:280]})
    return out


def _event_description_local(
    title: str, category: str, city: str, extra_context: str = "",
) -> dict:
    action = _CATEGORY_ACTIONS.get(category, f"{category} alanında gönüllülük")
    detail = _CATEGORY_DETAIL.get(
        category,
        f"Gönüllüler «{title}» kapsamında organizasyonun ilettiği görevleri üstlenir.",
    )
    log_block = (
        f"Organizasyonun paylaştığı lojistik özet: {extra_context.strip()}. "
        f"Bu bilgiler katılımcı brifinginde teyit edilmelidir."
        if (extra_context or "").strip()
        else "Buluşma noktası, saat ve saha güvenliği etkinlik öncesinde duyurulacaktır."
    )
    short = f"{city}: «{title}» — {category} çağrısı, gönüllü operasyon ve saha koordinasyonu."
    if len(short) > 155:
        short = short[:152] + "…"
    return {
        "short_description": short,
        "description": (
            f"«{title}», {city} ölçeğinde {category} ekseninde planlanan bir gönüllü operasyonudur. "
            f"Amaç; yerel ihtiyaca yanıt veren, ölçülebilir çıktıları olan ve tekrarlanabilir "
            f"süreçlerle yürütülen bir saha çalışması oluşturmaktır. {action} bağlamında "
            f"etkinliğin toplumsal faydası şehir dinamikleriyle uyumludur.\n\n"
            f"{detail} Görev tanımları rol bazlı ayrılır: saha uygulama, lojistik destek, "
            f"iletişim/kayıt ve gerekiyorsa teknik uzmanlık hatları. Her hat için sorumlu "
            f"koordinatör etkinlik öncesi kısa brifing verir; görev süresi ve teslim "
            f"formatları (foto, imza listesi, rapor özeti) önceden bildirilir.\n\n"
            f"{log_block}\n\n"
            f"Katılımcılardan beklenen hazırlık: uygun kıyafet, kimlik ve varsa organizasyonun "
            f"ilettiği ekipman listesi. Kişisel veri ve görüntü kullanımı organizasyon politikasına "
            f"tabidir; hassas veri paylaşımı gönüllü onayı çerçevesinde yönetilir.\n\n"
            f"Çıktı olarak; tamamlanan görevler, kontenjan kullanımı ve saha notları değerlendirme "
            f"döngüsüne girer. Gönüllü puanı ve rozet ilerlemesi platform kurallarına göre "
            f"otomatik işlenir; geri bildirimler bir sonraki çağrının planlamasına veri sağlar."
        ),
    }


# ─── Etkinlik sıralama (Gemini + yerel) ──────────────────────────────────────

_RANK_SYSTEM = """Sen GönüllüAI platformunun çok kriterli etkinlik eşleştirme motorusun.
Her etkinlik için 0–100 arası TAMSAYI uyum skoru üret. Skor; açıklanabilir, tekrarlanabilir olmalı.

AĞIRLIKLAR (yaklaşık — toplamı 100'e normalize et):
- Şehir eşleşmesi (kullanıcı şehri == etkinlik şehri): 0–28
- İlgi alanı ↔ etkinlik kategorisi tam veya güçlü örtüşme: 0–32
- Kullanıcı yetenekleri ∩ etkinlik.required_skills dolaylı veya doğrudan örtüşme: 0–28
- Başlıkta/ kategoride kullanıcı ilgi alanlarından anahtar kelime: 0–12

KURALLAR:
- Tüm verilen etkinlikler için mutlaka bir satır üret (eksik event_id olmasın).
- Skorları ayırıcı yap: gerçekten uygun çağrılar 72+, orta 45–71, zayıf <45.
- Gerekçe yazma; SADECE JSON.

ÇIKTI ŞEKLİ (başka metin yok):
[{"event_id":"<uuid>","score":78}, ...]"""


async def rank_events(user, events: list) -> list:
    if not events:
        return events
    if not _gemini_key():
        return rank_events_heuristic(user, events)

    user_ctx = {"interests": user.interests or [], "skills": user.skills or [], "city": user.city or ""}
    events_ctx = [
        {
            "id": str(e.id),
            "title": e.title,
            "category": e.category,
            "city": e.city,
            "skills": _safe_list(e.required_skills),
        }
        for e in events
    ]
    try:
        text = await _gemini_call(
            f"Kullanıcı: {json.dumps(user_ctx, ensure_ascii=False)}\n"
            f"Etkinlikler: {json.dumps(events_ctx, ensure_ascii=False)}",
            _RANK_SYSTEM,
            max_tokens=1500,
            temperature=0.3,
        )
        scores = json.loads(_extract_json(text))
        if not isinstance(scores, list):
            raise ValueError("scores is not a list")
        score_map: dict[str, int] = {}
        for s in scores:
            if not isinstance(s, dict):
                continue
            eid = s.get("event_id")
            if eid is None:
                continue
            try:
                score_map[str(eid)] = int(s.get("score", 0))
            except (TypeError, ValueError):
                pass
        if score_map:
            return sorted(events, key=lambda e: score_map.get(str(e.id), 0), reverse=True)
        log.warning("rank_events: boş veya geçersiz skor haritası, heuristic kullanılıyor")
    except Exception as e:
        log.warning("rank_events failed: %s", e)
    return rank_events_heuristic(user, events)


# ─── Karşılama mesajı ────────────────────────────────────────────────────────

_WELCOME_SYSTEM = """Sen GönüllüAI gönüllülük platformunun ürün + operasyon iletişim uzmanısın.
Dashboard için Türkçe, teknik-ötesi netlikte (ölçülebilir verilere atıf) bir karşılama metni yazıyorsun.

TON: Profesyonel, sıcak ama abartısız; "öneri motoru", "profil sinyali", "eşleşme", "skor",
"doğrulama (kod/QR)", "kontenjan" gibi platform terimlerini doğal kullan.

ZORUNLU İÇERİK:
1. Kullanıcının gerçek adı (ilk isim)
2. Varsa: rozet düzeyi veya puan bandı (sayı verilmişse mutlaka an)
3. Varsa: şehir veya ilgi alanı / yetenekten en az biri
4. Varsa: önerilen etkinlik başlığına kısa atıf (tırnak içinde kısaltılmış olabilir)
5. Kullanıcıya 1 somut eylem: örn. keşfet filtreleri, etkinlik kartındaki doğrulama yöntemi, profil tamamlama

YASAK: "harika etkinlikler seni bekliyor", "fark yarat", "yolculuk" klişeleri.

FORMAT:
- 2–4 cümle, toplam en fazla 480 karakter (boşluk dahil)
- Sonda tam 1 emoji
- Başlık, madde işareti, markdown yok; düz paragraf

Sadece mesaj metnini döndür."""


async def generate_welcome(user, top_event_title: str = "") -> str:
    if not _gemini_key():
        return welcome_message_local(user, top_event_title)

    first_name = (user.full_name or "Gönüllü").split()[0]
    interests = user.interests or []
    skills = user.skills or []
    starter = random.choice(_WELCOME_STARTERS)

    facts = [f"Ad: {first_name}", f"Rozet: {BADGE_LABEL.get(user.badge or '', 'gönüllü')}"]
    if user.city:
        facts.append(f"Şehir: {user.city}")
    if interests:
        facts.append(f"İlgi alanları: {', '.join(interests)}")
    if skills:
        facts.append(f"Yetenekler: {', '.join(skills)}")
    if user.total_points:
        facts.append(f"Toplam puan: {user.total_points}")
    if getattr(user, "earned_points", None):
        facts.append(f"Kazanılmış puan: {user.earned_points}")
    if getattr(user, "streak_days", None):
        facts.append(f"Ardışık gün (streak): {user.streak_days}")
    if top_event_title:
        facts.append(f"Öneri motorunun 1. sıradaki etkinliği: '{top_event_title}'")

    prompt = (
        "Kullanıcı bilgileri:\n" + "\n".join(f"  - {f}" for f in facts) +
        "\n\nBu kullanıcıya yukarıdaki kurallara uygun karşılama metnini yaz. "
        f"İstersen girişte '{starter}' tonunu yakalayabilirsin. "
        "Metin; öneri algoritması ve profil verisine dayandığını hissettirmeli ama pazarlama dili kullanmamalı."
    )

    try:
        msg = await _gemini_call(prompt, _WELCOME_SYSTEM, max_tokens=420, temperature=0.78)
        line = msg.strip().strip('"').strip()
        if len(line) > 480:
            line = line[:477].rsplit(" ", 1)[0] + "…"
        if line:
            return line
    except Exception as e:
        log.warning("generate_welcome failed: %s", e)
    return welcome_message_local(user, top_event_title)


# ─── Yetenek–etkinlik gerekçesi ───────────────────────────────────────────────

_SKILL_SYSTEM = """Sen GönüllüAI platformunun yetenek–etkinlik eşleştirme analisti ve teknik yazarısın.
Her etkinlik için; gönüllü operasyon dilinde, ölçülebilir ve savunulabilir bir "eşleşme gerekçesi" üret.

HER reason METNİ ŞUNLARDAN EN AZ İKİSİNİ İÇERSİN:
- Kullanıcı yeteneklerinden biri ile etkinlik.required_skills kesişimi (doğrudan veya transfer)
- Etkinlik başlığı veya kategori ile rol ilişkisi (koordinasyon, saha, iletişim, teknik hat)
- Varsa zorunlu yetenek listesinin boş/geniş olmasının skor üzerindeki anlamı

KURALLAR:
- Türkçe; 1–2 cümle veya yoğun tek cümle; en fazla 260 karakter
- Tırnak işareti kullanma; klişe yok ("fark yarat", "değer kat" vb.)
- Her etkinlik için farklı sözdizimi / farklı vurgu
- SADECE JSON: [{"event_id":"...","reason":"..."}]

ÖRNEK (yetenekler: ["Yazılım","Tasarım"]):
[{"event_id":"1","reason":"Yazılım yeteneğin çağrının teknik hattında doğrudan talep edilen beceri kümesiyle örtüşüyor; uygulama veya altyapı görevlerinde atanabilirsin."},
 {"event_id":"2","reason":"Tasarım becerin kategori ve saha iletişimi arasında köprü rolü üstlenir; görsel materyal ve yönlendirme çıktılarında etki yoğunluğu yüksek."}]"""


async def generate_skill_reasons(skills: list, events: list) -> list:
    if not events:
        return []
    if not _gemini_key():
        return skill_match_reasons_local(skills, events)

    skills_str = ", ".join(skills) if skills else "genel gönüllülük"
    events_json = json.dumps(
        [
            {
                "id": str(e["id"]),
                "title": e["title"],
                "category": e["category"],
                "required_skills": e.get("required_skills") or [],
            }
            for e in events
        ],
        ensure_ascii=False,
    )
    try:
        text = await _gemini_call(
            f"Kullanıcı yetenekleri: [{skills_str}]\n\nEtkinlikler:\n{events_json}",
            _SKILL_SYSTEM,
            max_tokens=1400,
            temperature=0.72,
        )
        parsed = json.loads(_extract_json(text))
        if isinstance(parsed, list) and parsed:
            for item in parsed:
                if isinstance(item, dict) and item.get("reason"):
                    r = str(item["reason"]).strip()
                    if len(r) > 280:
                        item["reason"] = r[:277].rsplit(" ", 1)[0] + "…"
            return parsed
    except Exception as e:
        log.warning("generate_skill_reasons failed: %s", e)
    return []


# ─── Etkinlik açıklaması ─────────────────────────────────────────────────────

_DESC_SYSTEM = """Sen GönüllüAI için etkinlik çağrısı teknik editörüsün: Türkçe, operasyon odaklı,
ölçülebilir çıktıları olan metin üretirsin (saha organizasyonu, rol dağılımı, uyum).

1) short_description (kart önizlemesi):
   - Başlığı aynen veya çok hafif kısaltarak kullan; şehir zorunlu
   - Eylem + hedef kısa özet; en fazla 160 karakter
   - Örnek ton: "Ankara'da «X» kapsamında saha lojistiği ve gönüllü koordinasyonu"

2) description — tam 5 paragraf, düz metin (markdown/başlık/madde YASAK):
   P1 — Bağlam: şehir + kategori + toplumsal/iş hedefi; başarıyı nasıl ölçeceğiz (ör. temizlenen alan,
        ulaşılan kişi, teslim edilen materyal — somut örnekler uydurma ama mantıklı olsun).
   P2 — Hedef kitle ve ön koşullar: yaş, fiziksel yoğunluk, gerekli belge/ekipman (genel ifade).
   P3 — Rol ve görev akışı: saha, lojistik, iletişim/kayıt, teknik hat; koordinasyon nasıl işler.
   P4 — Lojistik ve güvenlik: verilen adres/saat/buluşma bilgisini burada doğal biçimde işle;
        KKD, iklim, ulaşım, acil durum için tek cümlelik profesyonel uyarı.
   P5 — Çıktı ve geri bildirim: teslim formatı (rapor, foto, imza), gönüllü puanı/rozet ile ilişki,
        bir sonraki çağrı için veri döngüsü (teknik cümle).

YASAKLAR:
- Boş laf, "fark yarat", "herkes katılabilir", "anlamlı katkı" gibi doldurma
- Markdown, listeler, ## veya ** 

SADECE JSON: {"short_description":"...","description":"..."}"""


async def generate_event_description(
    title: str, category: str, city: str, extra_context: str = "",
) -> dict:
    if not _gemini_key():
        return _event_description_local(title, category, city, extra_context)

    prompt = (
        f"Etkinlik başlığı: {title}\n"
        f"Kategori: {category}\n"
        f"Şehir: {city}\n"
        + (f"Lojistik detaylar: {extra_context}\n" if extra_context else "")
        + "\nBu etkinlik için short_description ve description üret. "
        "Lojistik detayları (adres, saat, buluşma noktası) dördüncü paragrafa doğal şekilde göm. "
        "İçerik tamamen Türkçe; teknik ve net ol."
    )

    try:
        text = await _gemini_call(prompt, _DESC_SYSTEM, max_tokens=2400, temperature=0.68)
        result = json.loads(_extract_json(text))
        if not isinstance(result, dict):
            raise ValueError("not an object")
        if "description" in result:
            desc = result["description"]
            desc = re.sub(r"^#{1,3}\s+.+\n?", "", desc, flags=re.MULTILINE)
            desc = re.sub(r"\*\*(.+?)\*\*", r"\1", desc)
            desc = re.sub(r"^\s*[-*]\s+", "", desc, flags=re.MULTILINE)
            result["description"] = desc.strip()
        sd = (result.get("short_description") or "").strip()
        bd = (result.get("description") or "").strip()
        if sd and bd and len(bd) >= 220:
            if len(sd) > 165:
                result["short_description"] = sd[:162].rsplit(" ", 1)[0] + "…"
            return result
        raise ValueError("description too short or missing fields")
    except Exception as e:
        log.warning("generate_event_description failed: %s", e)
    return _event_description_local(title, category, city, extra_context)


# ─── Mini koç (sohbet) ───────────────────────────────────────────────────────

_COACH_SYSTEM = """Sen GönüllüAI "mini koç" asistanısın. Türkçe konuşuyorsun.

Bağlamda kullanıcının profil özeti ve yaklaşan etkinlik listesi (JSON) verilir.
Kullanıcının sorusuna göre:
- Hangi etkinliklerin neden uygun olabileceğini somut gerekçelerle anlat
- Şehir, kategori, yetenek, tarih çakışması gibi operasyonel kriterlere değin
- Gerekirse "önce profilde X'i tamamla" gibi net öneriler ver
- Uydurma etkinlik veya tarih söyleme; sadece verilen listeden bahset
- Markdown kullanma; kısa paragraflar veya numaralı satırlar OK
- Maksimum ~900 karakter; abartılı motivasyon cümlelerinden kaçın

Yanıtta sadece kullanıcıya gösterilecek metin olsun (ön ek yok)."""


def _coach_user_prompt(user, msg: str, events_compact: list[dict]) -> str:
    interests = _safe_list(getattr(user, "interests", None))
    skills = _safe_list(getattr(user, "skills", None))
    profile = {
        "ad": (user.full_name or "").split()[0] if user.full_name else "Gönüllü",
        "şehir": user.city or "",
        "ilgi_alanları": interests,
        "yetenekler": skills,
        "rozet": getattr(user, "badge", "") or "",
        "toplam_puan": getattr(user, "total_points", 0) or 0,
    }
    return (
        f"Kullanıcı mesajı:\n{msg}\n\n"
        f"Profil özeti:\n{json.dumps(profile, ensure_ascii=False)}\n\n"
        f"Açık etkinlikler (en fazla {len(events_compact)} kayıt):\n"
        f"{json.dumps(events_compact, ensure_ascii=False)}"
    )


def _coach_trim(text: str) -> str:
    out = text.strip()
    if len(out) > 1200:
        out = out[:1197] + "…"
    return out


async def coach_reply(user, user_message: str, events_compact: list[dict]) -> str:
    msg = (user_message or "").strip()
    if len(msg) > 1200:
        msg = msg[:1200]
    if not msg:
        return "Bir soru veya cümle yazarsan, profiline ve açık etkinliklere göre yorumlayabilirim."

    prompt = _coach_user_prompt(user, msg, events_compact)

    if _ollama_base():
        try:
            text = await _ollama_chat(_COACH_SYSTEM, prompt, max_tokens=700, temperature=0.65)
            out = _coach_trim(text)
            if out:
                return out
        except Exception as e:
            log.warning("coach_reply Ollama failed: %s", e)

    if _gemini_key():
        try:
            text = await _gemini_call(prompt, _COACH_SYSTEM, max_tokens=700, temperature=0.65)
            out = _coach_trim(text)
            if out:
                return out
        except Exception as e:
            log.warning("coach_reply Gemini failed: %s", e)

    return _coach_reply_local(user, msg, events_compact)


def _coach_reply_local(user, user_message: str, events_compact: list[dict]) -> str:
    low = user_message.lower()
    skills = {str(s).lower() for s in _safe_list(getattr(user, "skills", None))}
    city = (user.city or "").lower()
    picks: list[str] = []
    for e in events_compact[:8]:
        title = e.get("title", "")
        cat = (e.get("category") or "").lower()
        ecity = (e.get("city") or "").lower()
        req = [str(x).lower() for x in (e.get("required_skills") or [])]
        reasons = []
        if city and ecity == city:
            reasons.append("şehir eşleşmesi")
        if skills and req and skills.intersection(set(req)):
            reasons.append("yetenek örtüşmesi")
        if "uygun" in low or "hangi" in low or "öner" in low:
            picks.append(f"• {title} ({e.get('city')}, {e.get('category')})" + (f" — {', '.join(reasons)}" if reasons else ""))
    if picks:
        return (
            "Bulut veya yerel model şu an yanıt vermedi; kısa kural tabanlı özet:\n"
            + "\n".join(picks[:5])
            + "\n\nDetay için etkinlik kartlarına gir veya profilinde şehir/yetenek alanlarını güncelle."
        )
    return (
        "Yapay zeka servisi kullanılamıyor (Ollama/Gemini kapalı veya hata). "
        "Keşfet üzerinden şehir ve kategori filtrelerini kullan; "
        "yerel model için OLLAMA_BASE_URL ve çalışan `ollama serve` gerekir. "
        "Profilinde ilgi alanı ve yetenekleri doldurduğunda öneriler güçlenir."
    )


# ─── Doğal dil → keşif parametreleri ─────────────────────────────────────────

_NL_CATEGORIES = [
    "Çevre", "Eğitim", "Sağlık", "Hayvan Hakları",
    "Yaşlı Bakımı", "Çocuk Gelişimi", "Teknoloji", "Sanat & Kültür",
]
_NL_CITIES = [
    "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana", "Konya",
    "Gaziantep", "Samsun", "Eskişehir", "Trabzon", "Kayseri", "Mersin", "Diyarbakır",
]

_NL_SEARCH_SYSTEM = """Kullanıcının Türkçe doğal dil sorgusunu GönüllüAI keşif filtrelerine çevir.
SADECE şu JSON şemasında yanıt ver (başka metin yok):
{
  "city": string | null,
  "category": string | null,
  "q": string | null,
  "date_from": string | null,
  "date_to": string | null,
  "interpretation": string
}

Kurallar:
- city: Türkiye şehir adı tam eşleşme (örn. İstanbul). Yoksa null.
- category: tam olarak şunlardan biri veya null: Çevre, Eğitim, Sağlık, Hayvan Hakları, Yaşlı Bakımı, Çocuk Gelişimi, Teknoloji, Sanat & Kültür
- q: başlık/anahtar kelime araması için kısa metin (şehir ve kategori kelimelerini tekrarlama). Yoksa null.
- date_from, date_to: ISO 8601 tarih (YYYY-MM-DD) veya null. "yarın" = yarının tarihi, "bugün" = bugün. "bu hafta" = pazartesi–pazar aralığı (Avrupa/İstanbul haftası).
- interpretation: tek cümle Türkçe özet (kullanıcıya gösterilebilir).

Bugünün tarihini kullanıcı sorgusunda verilen "referans tarih" ile birlikte değerlendir."""


def parse_natural_language_discover_rules(query: str) -> dict:
    """Kural tabanlı ayrıştırıcı (Gemini yedeği)."""
    raw = (query or "").strip()
    low = raw.lower()
    out: dict = {
        "city": None,
        "category": None,
        "q": None,
        "date_from": None,
        "date_to": None,
        "interpretation": "",
    }
    if not raw:
        return out

    for c in _NL_CITIES:
        if c.lower() in low:
            out["city"] = c
            break

    for cat in _NL_CATEGORIES:
        if cat.lower() in low:
            out["category"] = cat
            break

    today = date.today()
    if "yarın" in low or "yarin" in low:
        d1 = today + timedelta(days=1)
        out["date_from"] = d1.isoformat()
        out["date_to"] = d1.isoformat()
        out["interpretation"] = f"Tarih: {d1.isoformat()} (yarın)"
    elif "bugün" in low or "bugun" in low:
        out["date_from"] = today.isoformat()
        out["date_to"] = today.isoformat()
        out["interpretation"] = f"Tarih: {today.isoformat()} (bugün)"

    # Serbest metin: bilinen kelimeleri çıkararak q
    q_clean = raw
    for token in _NL_CITIES + _NL_CATEGORIES:
        q_clean = re.sub(re.escape(token), " ", q_clean, flags=re.IGNORECASE)
    for w in (
        "yarın", "yarin", "bugün", "bugun", "içinde", "icinde", "saat", "etkinlik",
        "gönüllü", "gonullu", "ara", "bul", "istiyorum", "da", "de", "ve",
    ):
        q_clean = re.sub(rf"\b{re.escape(w)}\b", " ", q_clean, flags=re.IGNORECASE)
    q_clean = re.sub(r"\s+", " ", q_clean).strip()
    if len(q_clean) >= 2:
        out["q"] = q_clean[:80]

    if not out["interpretation"]:
        parts = []
        if out["city"]:
            parts.append(out["city"])
        if out["category"]:
            parts.append(out["category"])
        out["interpretation"] = "Filtre: " + ", ".join(parts) if parts else "Genel arama"

    return out


async def parse_natural_language_discover(query: str, reference_date: date | None = None) -> dict:
    """Kurallar + (isteğe bağlı) Gemini ile birleşik keşif parametreleri."""
    ref = reference_date or date.today()
    base = parse_natural_language_discover_rules(query)

    if not _gemini_key():
        return base

    prompt = (
        f'Kullanıcı sorgusu: "{query.strip()[:500]}"\n'
        f"Referans tarih (YYYY-MM-DD): {ref.isoformat()}\n"
        "Yukarıdaki kurallara uygun JSON üret."
    )
    try:
        text = await _gemini_call(prompt, _NL_SEARCH_SYSTEM, max_tokens=400, temperature=0.2)
        data = json.loads(_extract_json(text))
        if not isinstance(data, dict):
            return base
        merged = {**base}
        for k in ("city", "category", "q", "date_from", "date_to", "interpretation"):
            v = data.get(k)
            if v is not None and str(v).strip():
                merged[k] = str(v).strip() if k != "interpretation" else str(v).strip()
        if merged.get("category") and merged["category"] not in _NL_CATEGORIES:
            merged["category"] = base.get("category")
        if merged.get("city") and merged["city"] not in _NL_CITIES:
            merged["city"] = base.get("city")
        return merged
    except Exception as e:
        log.warning("parse_natural_language_discover AI failed: %s", e)
        return base
