import csv
import io
import os
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.models.event import Event


def _register_unicode_font() -> str:
    """Türkçe için mümkünse TTF kaydet."""
    candidates = []
    windir = os.environ.get("WINDIR", "C:\\Windows")
    candidates.append(Path(windir) / "Fonts" / "arial.ttf")
    candidates.append(Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
    candidates.append(Path("/usr/share/fonts/TTF/DejaVuSans.ttf"))
    for p in candidates:
        if p.is_file():
            try:
                pdfmetrics.registerFont(TTFont("ExportUnicode", str(p)))
                return "ExportUnicode"
            except Exception:
                continue
    return "Helvetica"


def participants_csv_bytes(rows: list[tuple]) -> bytes:
    """
    rows: (full_name, email, status, joined_at, verified_at) her satır için.
    """
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["ad_soyad", "e_posta", "durum", "katilim_tarihi", "dogrulanma_tarihi"])
    for r in rows:
        w.writerow(r)
    return ("\ufeff" + buf.getvalue()).encode("utf-8")


def impact_pdf_bytes(
    event: Event,
    confirmed_count: int,
    verified_count: int,
    comment_count: int,
    avg_rating: float | None,
) -> bytes:
    font = _register_unicode_font()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="TitleTr",
        parent=styles["Heading1"],
        fontName=font,
        fontSize=16,
        spaceAfter=12,
    )
    body_style = ParagraphStyle(
        name="BodyTr",
        parent=styles["Normal"],
        fontName=font,
        fontSize=10,
        spaceAfter=8,
    )
    story: list = []
    story.append(Paragraph("GönüllüAI — Basit etki özeti", title_style))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(f"<b>Etkinlik:</b> {event.title or '—'}", body_style))
    ed = event.event_date.isoformat() if event.event_date else "—"
    story.append(Paragraph(f"<b>Tarih:</b> {ed}", body_style))
    story.append(Paragraph(f"<b>Şehir / kategori:</b> {event.city or '—'} / {event.category or '—'}", body_style))
    story.append(Spacer(1, 0.5 * cm))

    avg_txt = f"{avg_rating:.2f}" if avg_rating is not None else "—"
    data = [
        ["Onaylı katılımcı", str(confirmed_count)],
        ["Doğrulanmış katılım", str(verified_count)],
        ["Yorum sayısı", str(comment_count)],
        ["Ortalama puan (yorum)", avg_txt],
    ]
    t = Table(data, colWidths=[8 * cm, 5 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f5e9")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, -1), font),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 0.8 * cm))
    story.append(
        Paragraph(
            "Bu rapor organizatör içindir; kişisel veriler CSV dışa aktarımda yer alır.",
            body_style,
        )
    )
    doc.build(story)
    return buffer.getvalue()
