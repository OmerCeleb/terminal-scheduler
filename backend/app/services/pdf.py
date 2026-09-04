from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from app.schemas.schemas import ScheduleOut

BRAND_DARK = colors.HexColor("#1a1a2e")
BRAND_BLUE = colors.HexColor("#378ADD")
GRAY_BG = colors.HexColor("#F8F8F8")
GRAY_LINE = colors.HexColor("#E0E0E0")
FATIGUE_LOW_TEXT = colors.HexColor("#3B6D11")
FATIGUE_MED_TEXT = colors.HexColor("#854F0B")
FATIGUE_HIGH_TEXT = colors.HexColor("#A32D2D")
FATIGUE_LOW_BG = colors.HexColor("#EAF3DE")
FATIGUE_MED_BG = colors.HexColor("#FAEEDA")
FATIGUE_HIGH_BG = colors.HexColor("#FCEBEB")


def fatigue_colors(score: float):
    if score < 50:
        return FATIGUE_LOW_TEXT, FATIGUE_LOW_BG, "Dusuk"
    if score < 80:
        return FATIGUE_MED_TEXT, FATIGUE_MED_BG, "Orta"
    return FATIGUE_HIGH_TEXT, FATIGUE_HIGH_BG, "Yuksek"


def generate_schedule_pdf(schedule: ScheduleOut) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=18*mm, bottomMargin=18*mm,
    )

    title_style = ParagraphStyle("title", fontSize=20, textColor=BRAND_DARK,
                                  alignment=TA_CENTER, fontName="Helvetica-Bold", spaceAfter=4)
    sub_style = ParagraphStyle("sub", fontSize=10, textColor=colors.HexColor("#888888"),
                                alignment=TA_CENTER, fontName="Helvetica", spaceAfter=16)
    band_style = ParagraphStyle("band", fontSize=12, fontName="Helvetica-Bold",
                                 textColor=BRAND_DARK, spaceBefore=12, spaceAfter=6)
    footer_style = ParagraphStyle("footer", fontSize=8, textColor=colors.HexColor("#BBBBBB"),
                                   alignment=TA_CENTER, fontName="Helvetica")

    elements = []

    elements.append(Paragraph("Terminal Vardiya Semasi", title_style))
    elements.append(Paragraph(
        f"Tarih: {schedule.date.strftime('%d.%m.%Y')}  |  Olusturma: {schedule.generated_at.strftime('%d.%m.%Y %H:%M')}",
        sub_style
    ))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_LINE, spaceAfter=12))

    unique_bands = len({a.band_id for a in schedule.assignments})
    unique_workers = len({a.worker_id for a in schedule.assignments})
    total_pkg = sum(
        a.band_packages for a in
        {a.band_id: a for a in schedule.assignments}.values()
    )

    summary = Table(
        [["Toplam Paket", "Bant Sayisi", "Calisan Sayisi"],
         [f"{total_pkg:,}", str(unique_bands), str(unique_workers)]],
        colWidths=["33%", "33%", "34%"]
    )
    summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GRAY_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#888888")),
        ("TEXTCOLOR", (0, 1), (-1, 1), BRAND_DARK),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica"),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, 1), 16),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, GRAY_LINE),
    ]))
    elements.append(summary)
    elements.append(Spacer(1, 16))

    bands_map: dict[int, list] = {}
    band_meta: dict[int, tuple] = {}
    for a in schedule.assignments:
        bands_map.setdefault(a.band_id, []).append(a)
        band_meta[a.band_id] = (a.band_name, a.band_packages)

    max_pkg = max((v[1] for v in band_meta.values()), default=1)

    for band_id, assignments in sorted(bands_map.items(), key=lambda x: band_meta[x[0]][1], reverse=True):
        band_name, band_pkg = band_meta[band_id]
        load_pct = round(band_pkg / max_pkg * 100)

        elements.append(Paragraph(f"{band_name}  —  {band_pkg:,} paket  (%{load_pct} yuk)", band_style))

        table_data = [["Calisan", "Yorgunluk Skoru", "Seviye", "Dun (paket)"]]
        for a in sorted(assignments, key=lambda x: x.fatigue_score):
            text_c, bg_c, label = fatigue_colors(a.fatigue_score)
            table_data.append([
                a.worker_name,
                str(a.fatigue_score),
                label,
                "—",
            ])

        col_widths = [80*mm, 40*mm, 30*mm, 30*mm]
        t = Table(table_data, colWidths=col_widths)

        style = [
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, GRAY_LINE),
        ]

        for i, a in enumerate(sorted(assignments, key=lambda x: x.fatigue_score), start=1):
            _, bg_c, _ = fatigue_colors(a.fatigue_score)
            style.append(("BACKGROUND", (2, i), (2, i), bg_c))

        t.setStyle(TableStyle(style))
        elements.append(t)
        elements.append(Spacer(1, 8))

    elements.append(Spacer(1, 16))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=GRAY_LINE, spaceAfter=6))
    elements.append(Paragraph(
        "Uretilen: Terminal Vardiya Planlayici  |  Otomatik atama — yorgunluk bazli algoritma",
        footer_style
    ))

    doc.build(elements)
    return buffer.getvalue()
