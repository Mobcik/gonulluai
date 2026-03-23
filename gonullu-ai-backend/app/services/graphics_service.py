"""QR poster ve etki rozeti PNG üretimi."""
from __future__ import annotations

import io
import os
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

import qrcode
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps


def _load_font(size: int):
    candidates = [
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / "arial.ttf",
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]
    for p in candidates:
        if p.is_file():
            try:
                return ImageFont.truetype(str(p), size)
            except OSError:
                continue
    return ImageFont.load_default()


def _accent_rgb(category: str | None) -> tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]:
    """Koyu, orta, açık ton (RGB) — kategori adına göre."""
    c = (category or "").strip().lower()
    presets: dict[str, tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int]]] = {
        "çevre": ((20, 60, 35), (46, 125, 50), (129, 199, 132)),
        "eğitim": ((15, 45, 95), (37, 99, 235), (147, 197, 253)),
        "sağlık": ((90, 20, 30), (198, 40, 40), (255, 183, 178)),
        "hayvan hakları": ((100, 50, 15), (217, 119, 6), (254, 215, 170)),
        "yaşlı bakımı": ((60, 30, 80), (126, 87, 194), (221, 214, 243)),
        "çocuk gelişimi": ((0, 85, 100), (0, 150, 167), (179, 236, 255)),
        "teknoloji": ((20, 40, 75), (59, 130, 200), (186, 218, 255)),
        "sanat & kültür": ((80, 25, 60), (180, 50, 120), (251, 207, 232)),
    }
    return presets.get(c, ((35, 52, 40), (61, 122, 79), (165, 214, 167)))


def _safe_uploads_relative(rel: str) -> str | None:
    """Path traversal yok; sadece uploads/ altı."""
    rel = rel.replace("\\", "/").strip()
    if not rel.startswith("uploads/"):
        return None
    parts = [p for p in rel.split("/") if p]
    if not parts or parts[0] != "uploads" or ".." in parts:
        return None
    return "/".join(parts)


def _extract_uploads_relative_from_cover_url(raw: str) -> str | None:
    """
    Kapak URL'sinden yerel 'uploads/...' göreli yol üret.
    DB'de çoğunlukla BACKEND_URL + '/uploads/event_photos/...' tutuluyor;
    sunucunun kendine HTTP isteği atması sık başarısız olur — diskten okumak gerekir.
    """
    from urllib.parse import unquote, urlparse

    s = raw.strip()
    if not s:
        return None
    path_only = s
    if s.startswith("http://") or s.startswith("https://"):
        path_only = unquote(urlparse(s).path or "")
    path_only = path_only.replace("\\", "/")
    if path_only.startswith("/uploads/"):
        tail = path_only.lstrip("/")
        return _safe_uploads_relative(tail)
    if path_only.startswith("uploads/"):
        return _safe_uploads_relative(path_only)
    idx = path_only.find("/uploads/")
    if idx >= 0:
        tail = path_only[idx + 1 :]
        return _safe_uploads_relative(tail)
    return None


def _candidate_paths_for_uploads_relative(relative_uploads: str) -> list[Path]:
    """cwd ve paket kökü (uvicorn başka klasörden çalışırsa diye)."""
    roots: list[Path] = [Path(os.getcwd())]
    try:
        backend_root = Path(__file__).resolve().parents[2]
        if backend_root.resolve() not in {r.resolve() for r in roots}:
            roots.append(backend_root)
    except (OSError, IndexError):
        pass
    out: list[Path] = []
    for r in roots:
        c = r / relative_uploads
        if c not in out:
            out.append(c)
    return out


def _load_cover_rgb(cover_photo_url: str | None) -> Image.Image | None:
    if not cover_photo_url or not str(cover_photo_url).strip():
        return None
    raw = str(cover_photo_url).strip()
    try:
        img = None
        rel_uploads = _extract_uploads_relative_from_cover_url(raw)
        if rel_uploads:
            for path in _candidate_paths_for_uploads_relative(rel_uploads):
                if path.is_file():
                    img = Image.open(path)
                    break

        if img is None and (raw.startswith("http://") or raw.startswith("https://")):
            req = Request(raw, headers={"User-Agent": "GonulluAI-Poster/1"})
            with urlopen(req, timeout=15) as resp:
                data = resp.read()
            if len(data) > 12_000_000:
                return None
            img = Image.open(io.BytesIO(data))

        if img is None and not (raw.startswith("http://") or raw.startswith("https://")):
            path = Path(os.getcwd()) / raw.lstrip("/").replace("\\", "/")
            if path.is_file():
                img = Image.open(path)

        if img is None:
            return None

        img = img.convert("RGB")
        img = ImageEnhance.Color(img).enhance(1.12)
        img = ImageEnhance.Contrast(img).enhance(1.06)
        return img
    except (OSError, URLError, ValueError, TypeError):
        return None


def _hero_placeholder(w: int, h: int, dark: tuple[int, int, int], light: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(dark[0] * (1 - t) + light[0] * t)
        g = int(dark[1] * (1 - t) + light[1] * t)
        b = int(dark[2] * (1 - t) + light[2] * t)
        for x in range(w):
            # hafif yatay vignette
            vx = abs(x - w / 2) / (w / 2)
            r2 = int(r * (1 - 0.12 * vx))
            g2 = int(g * (1 - 0.12 * vx))
            b2 = int(b * (1 - 0.12 * vx))
            px[x, y] = (max(0, min(255, r2)), max(0, min(255, g2)), max(0, min(255, b2)))
    return img


def _composite_bottom_vignette(hero_rgb: Image.Image, strength: int = 210) -> Image.Image:
    """Alt kısımda metin okunaklılığı için koyulaştırma."""
    w, h = hero_rgb.size
    grad = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    band = int(h * 0.55)
    y0 = h - band
    for y in range(y0, h):
        t = (y - y0) / max(band - 1, 1)
        a = int(strength * (t**1.2))
        gd.line([(0, y), (w, y)], fill=(12, 18, 14, min(255, a)))
    base = hero_rgb.convert("RGBA")
    return Image.alpha_composite(base, grad).convert("RGB")


def build_event_poster_png(
    event_url: str,
    title: str,
    when_line: str,
    verify_code: str,
    *,
    cover_photo_url: str | None = None,
    category: str | None = None,
    short_description: str | None = None,
) -> bytes:
    dark, mid, light = _accent_rgb(category)
    qr_hex = "#%02x%02x%02x" % dark

    qr = qrcode.QRCode(version=1, box_size=5, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(event_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color=qr_hex, back_color="#ffffff").convert("RGB")

    w, h = 720, 1240
    hero_h = 640
    body_y = hero_h - 28

    cover = _load_cover_rgb(cover_photo_url)
    if cover:
        hero = ImageOps.fit(cover, (w, hero_h), method=Image.Resampling.LANCZOS, centering=(0.5, 0.45))
        hero = _composite_bottom_vignette(hero)
    else:
        ph = _hero_placeholder(w, hero_h, dark, light)
        hero = _composite_bottom_vignette(ph, strength=160)

    bg = Image.new("RGB", (w, h), "#f4efe8")
    bg.paste(hero, (0, 0))

    draw = ImageDraw.Draw(bg)
    draw.rectangle([0, hero_h - 6, w, hero_h + 6], fill=mid)

    font_t = _load_font(32)
    font_sub = _load_font(20)
    font_body = _load_font(22)
    font_small = _load_font(17)
    font_chip = _load_font(18)

    cat_label = (category or "Etkinlik").strip()[:28]
    chip_pad_x, chip_pad_y = 14, 8
    cb_chip = draw.textbbox((0, 0), cat_label, font=font_chip)
    tw, th = cb_chip[2] - cb_chip[0], cb_chip[3] - cb_chip[1]
    cx, cy = 28, 28
    chip_rect = [cx - chip_pad_x, cy - chip_pad_y, cx + tw + chip_pad_x, cy + th + chip_pad_y]
    draw.rounded_rectangle(chip_rect, radius=14, fill=mid)
    draw.text((cx, cy), cat_label, fill=(255, 255, 255), font=font_chip)

    tx = 28
    sub_raw = (short_description or "").strip()[:140]
    sub_lines = _wrap_text(sub_raw, 38)[:2] if sub_raw else []
    title_lines = _wrap_text(title or "Etkinlik", 22)[:3]
    line_h_title, line_h_sub = 40, 24
    sub_h = len(sub_lines) * line_h_sub
    title_h = len(title_lines) * line_h_title
    gap = 10 if sub_lines else 0
    bottom_pad = 28
    ty = hero_h - bottom_pad - sub_h - gap - title_h
    for line in title_lines:
        draw.text(
            (tx, ty),
            line,
            fill=(255, 255, 255),
            font=font_t,
            stroke_width=2,
            stroke_fill=(18, 22, 16),
        )
        ty += line_h_title
    if sub_lines:
        ty += gap
        for sline in sub_lines:
            draw.text(
                (tx, ty),
                sline,
                fill=(245, 240, 235),
                font=font_sub,
                stroke_width=1,
                stroke_fill=(20, 24, 18),
            )
            ty += line_h_sub

    # Alt panel — yuvarlatılmış kart
    panel_top = body_y
    panel = Image.new("RGB", (w, h - panel_top), "#faf7f2")
    pd = ImageDraw.Draw(panel)
    pd.rectangle([0, 0, 16, h - panel_top], fill=light)
    bg.paste(panel, (0, panel_top))

    draw = ImageDraw.Draw(bg)
    py = panel_top + 36
    px = 36

    draw.text((px, py), when_line[:90], fill=(45, 40, 32), font=font_body)
    py += 44
    draw.text(
        (px, py),
        "Katılım doğrulama kodu",
        fill=(95, 88, 76),
        font=font_small,
    )
    py += 32
    code = verify_code or "------"
    f_code = _load_font(36)
    cb_code = draw.textbbox((0, 0), code, font=f_code)
    code_w = cb_code[2] - cb_code[0]
    pill = [px, py - 6, px + code_w + 36, py + 52]
    draw.rounded_rectangle(pill, radius=16, fill=light)
    draw.rounded_rectangle([pill[0] + 3, pill[1] + 3, pill[2] - 3, pill[3] - 3], radius=13, outline=mid, width=2)
    draw.text((px + 18, py), code, fill=dark, font=f_code)
    py += 72

    # QR — beyaz kart + hafif gölge
    box = 256
    qr_inner = 220
    qr_img = qr_img.resize((qr_inner, qr_inner), Image.Resampling.LANCZOS)
    qx = (w - box) // 2
    qy = py
    shadow = [qx + 6, qy + 6, qx + box + 6, qy + box + 6]
    draw.rounded_rectangle(shadow, radius=22, fill=(200, 188, 175))
    draw.rounded_rectangle([qx, qy, qx + box, qy + box], radius=22, fill=(255, 255, 255), outline=mid, width=3)
    inset = (box - qr_inner) // 2
    bg.paste(qr_img, (qx + inset, qy + inset))

    foot = qy + box + 20
    hint = "QR kodu okutarak etkinlik sayfasına git"
    hb = draw.textbbox((0, 0), hint, font=font_small)
    hw = hb[2] - hb[0]
    draw.text(((w - hw) // 2, foot), hint, fill=(110, 100, 88), font=font_small)
    brand = "GönüllüAI"
    bb = draw.textbbox((0, 0), brand, font=font_small)
    bw = bb[2] - bb[0]
    draw.text(((w - bw) // 2, foot + 28), brand, fill=mid, font=font_small)

    buf = io.BytesIO()
    bg.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _wrap_text(text: str, max_chars: int) -> list[str]:
    words = (text or "").split()
    if not words:
        return ["Gönüllük etkinliği"]
    lines: list[str] = []
    cur: list[str] = []
    n = 0
    for w in words:
        if n + len(w) + 1 > max_chars and cur:
            lines.append(" ".join(cur))
            cur = [w]
            n = len(w)
        else:
            cur.append(w)
            n += len(w) + 1
    if cur:
        lines.append(" ".join(cur))
    return lines[:3]


def build_impact_badge_png(
    full_name: str,
    total_points: int,
    joined_count: int,
    badge_label: str,
) -> bytes:
    w, h = 900, 500
    img = Image.new("RGB", (w, h), "#2d2416")
    draw = ImageDraw.Draw(img)
    font_l = _load_font(42)
    font_m = _load_font(28)
    font_s = _load_font(20)

    draw.text((48, 48), "GönüllüAI", fill="#c8e6c9", font=font_s)
    draw.text((48, 100), "Etki rozeti", fill="#f7f3ee", font=font_l)
    name = (full_name or "Gönüllü")[:40]
    draw.text((48, 180), name, fill="#e8dfd0", font=font_m)
    draw.text((48, 240), f"Puan: {total_points}", fill="#a5d6a7", font=font_m)
    draw.text((48, 290), f"Katıldığım etkinlik: {joined_count}", fill="#e8dfd0", font=font_s)
    draw.text((48, 330), f"Rozet: {badge_label}", fill="#ffcc80", font=font_s)
    draw.text((48, 420), "gonulluai.app", fill="#8d7a5c", font=font_s)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
