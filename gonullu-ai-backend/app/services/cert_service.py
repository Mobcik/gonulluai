from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from io import BytesIO
from datetime import datetime


async def generate_certificate(user) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Krem arka plan
    c.setFillColorRGB(0.97, 0.96, 0.94)
    c.rect(0, 0, width, height, fill=1)

    # Dekoratif border
    c.setStrokeColorRGB(0.18, 0.49, 0.32)
    c.setLineWidth(3)
    c.rect(20, 20, width - 40, height - 40, fill=0)
    c.setLineWidth(1)
    c.rect(28, 28, width - 56, height - 56, fill=0)

    # Üst yeşil şerit
    c.setFillColorRGB(0.18, 0.49, 0.32)
    c.rect(0, height - 100, width, 100, fill=1)

    # Logo / başlık
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2, height - 55, "GonulluAI")
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 78, "Yapay Zeka Destekli Gonulluauk Platformu")

    # Sertifika başlığı
    c.setFillColorRGB(0.11, 0.07, 0.01)
    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(width / 2, height - 160, "Gonullauk Sertifikasi")

    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0.42, 0.31, 0.17)
    c.drawCentredString(width / 2, height - 195, "Bu sertifika, asagidaki kisiye takdim edilmistir:")

    # Dekoratif çizgi
    c.setStrokeColorRGB(0.18, 0.49, 0.32)
    c.setLineWidth(1.5)
    c.line(80, height - 210, width - 80, height - 210)

    # İsim
    c.setFillColorRGB(0.18, 0.49, 0.32)
    c.setFont("Helvetica-Bold", 38)
    c.drawCentredString(width / 2, height - 275, user.full_name)

    c.setStrokeColorRGB(0.18, 0.49, 0.32)
    c.line(80, height - 288, width - 80, height - 288)

    # Açıklama
    c.setFillColorRGB(0.11, 0.07, 0.01)
    c.setFont("Helvetica", 14)
    c.drawCentredString(
        width / 2, height - 330,
        f"Toplam {user.earned_points} puan ile Gonullu rozeti kazandigi icin"
    )
    c.drawCentredString(
        width / 2, height - 352,
        "bu sertifika ile taniklik edilmektedir."
    )

    # Tarih
    c.setFont("Helvetica", 12)
    c.setFillColorRGB(0.42, 0.31, 0.17)
    c.drawCentredString(
        width / 2, height - 420,
        f"Duzenlenme Tarihi: {datetime.now().strftime('%d.%m.%Y')}"
    )

    # Alt imza çizgisi
    c.setStrokeColorRGB(0.42, 0.31, 0.17)
    c.setLineWidth(0.5)
    c.line(120, 140, 240, 140)
    c.line(width - 240, 140, width - 120, 140)

    c.setFont("Helvetica", 10)
    c.setFillColorRGB(0.42, 0.31, 0.17)
    c.drawCentredString(180, 125, "GonulluAI Platformu")
    c.drawCentredString(width - 180, 125, "Gonullauk Toplulugu")

    # Dekoratif köşe süsler
    c.setStrokeColorRGB(0.18, 0.49, 0.32)
    c.setFillColorRGB(0.18, 0.49, 0.32)
    for x, y in [(40, 40), (width - 40, 40), (40, height - 120), (width - 40, height - 120)]:
        c.circle(x, y, 4, fill=1)

    c.save()
    return buffer.getvalue()
