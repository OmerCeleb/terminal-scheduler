from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

from app.schemas.schemas import ScheduleOut

PN_BLUE = colors.HexColor("#003087")
PN_YELLOW = colors.HexColor("#FFCC00")
INK = colors.HexColor("#0f172a")
INK_2 = colors.HexColor("#475569")
INK_3 = colors.HexColor("#94a3b8")
LINE = colors.HexColor("#e2e8f0")
SURFACE = colors.HexColor("#f4f5f8")

RESTED = (colors.HexColor("#16a34a"), colors.HexColor("#dcfce7"), "Utvilad")
NORMAL = (colors.HexColor("#d97706"), colors.HexColor("#fef3c7"), "Normal")
LOADED = (colors.HexColor("#dc2626"), colors.HexColor("#fee2e2"), "Belastad")


def _fatigue(score: float):
    if score < 50:
        return RESTED
    if score < 70:
        return NORMAL
    return LOADED


def _fairness(schedule: ScheduleOut) -> int:
    a = sorted(schedule.assignments, key=lambda x: x.band_packages, reverse=True)
    if len(a) < 2:
        return 100
    ok = pairs = 0
    for i in range(len(a)):
        for j in range(i + 1, len(a)):
            pairs += 1
            if a[i].fatigue_score <= a[j].fatigue_score:
                ok += 1
    return round(ok / pairs * 100)


def _num(n) -> str:
    return f"{n:,}".replace(",", " ")


def _styles():
    return {
        "title": ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=INK, alignment=TA_LEFT),
        "sub": ParagraphStyle("s", fontName="Helvetica", fontSize=10, leading=13, textColor=INK_2),
        "eyebrow": ParagraphStyle("e", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=PN_BLUE, spaceAfter=2),
        "h2": ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=INK, spaceBefore=12, spaceAfter=6),
        "footer": ParagraphStyle("f", fontName="Helvetica", fontSize=8, textColor=INK_3, alignment=TA_CENTER),
        "note": ParagraphStyle("n", fontName="Helvetica", fontSize=8, leading=11, textColor=INK_3),
        "big": ParagraphStyle("b", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=INK, alignment=TA_CENTER),
        "bigband": ParagraphStyle("bb", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=colors.white, alignment=TA_CENTER),
        "stod": ParagraphStyle("st", fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=INK),
    }


def _doc(buffer: BytesIO):
    return SimpleDocTemplate(buffer, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm)


def _header(el, st, eyebrow: str, title: str, schedule: ScheduleOut):
    el.append(Paragraph(eyebrow, st["eyebrow"]))
    el.append(Paragraph(title, st["title"]))
    el.append(Paragraph(f"{schedule.date.strftime('%Y-%m-%d')}  ·  genererat {schedule.generated_at.strftime('%H:%M')}", st["sub"]))
    el.append(Spacer(1, 6))
    el.append(HRFlowable(width="100%", thickness=2, color=PN_YELLOW, spaceAfter=12))


def _footer(el, st):
    el.append(Spacer(1, 16))
    el.append(HRFlowable(width="100%", thickness=0.5, color=LINE, spaceAfter=6))
    el.append(Paragraph("Terminalschema · automatisk fördelning baserad på belastning senaste 3 dagarna", st["footer"]))


def generate_band_sheet(schedule: ScheduleOut) -> bytes:
    """Wall sheet for the floor: band -> person only. No load data."""
    buffer = BytesIO()
    doc = _doc(buffer)
    st = _styles()
    el = []
    _header(el, st, "BANDLISTA", "Ikvällens fördelning", schedule)

    rows = [[Paragraph(a.band_name, st["bigband"]), Paragraph(a.worker_name, st["big"])]
            for a in sorted(schedule.assignments, key=lambda x: x.band_name)]
    if rows:
        t = Table(rows, colWidths=[38 * mm, 136 * mm], rowHeights=16 * mm)
        style = [
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (0, 0), (0, -1), PN_BLUE),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
            ("LEFTPADDING", (1, 0), (1, -1), 14),
        ]
        for i in range(len(rows)):
            if i % 2:
                style.append(("BACKGROUND", (1, i), (1, i), SURFACE))
        t.setStyle(TableStyle(style))
        el.append(t)

    if schedule.stod:
        el.append(Paragraph("Stöd", st["h2"]))
        el.append(Paragraph("  ·  ".join(w.name for w in schedule.stod), st["stod"]))

    if schedule.empty_bands:
        el.append(Paragraph("Band utan personal", st["h2"]))
        el.append(Paragraph(", ".join(b.name for b in schedule.empty_bands), st["sub"]))

    _footer(el, st)
    doc.build(el)
    return buffer.getvalue()


def _fatigue_table(rows, style, col_widths):
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle(style))
    return t


def generate_shift_report(schedule: ScheduleOut, recent_loads: dict) -> bytes:
    """Supervisor report: assignment plus the reasoning. recent_loads: worker_id -> [(date, packages, weight_kg)]."""
    buffer = BytesIO()
    doc = _doc(buffer)
    st = _styles()
    el = []
    _header(el, st, "SKIFTRAPPORT", "Fördelning och belastning", schedule)

    total = sum(a.band_packages for a in schedule.assignments) + sum(b.packages for b in schedule.empty_bands)
    summary = Table(
        [["Paket totalt", "Band", "Bandpersonal", "Stöd", "Rättviseindex"],
         [_num(total), str(len(schedule.assignments) + len(schedule.empty_bands)), str(len(schedule.assignments)), str(len(schedule.stod)), str(_fairness(schedule))]],
        colWidths=["20%"] * 5,
    )
    summary.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), SURFACE),
        ("TEXTCOLOR", (0, 0), (-1, 0), INK_2),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("TEXTCOLOR", (0, 1), (-1, 1), INK),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, 1), 15),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, LINE),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
    ]))
    el.append(summary)

    if schedule.empty_bands or schedule.unassigned:
        el.append(Paragraph("Att åtgärda", st["h2"]))
        for b in schedule.empty_bands:
            el.append(Paragraph(f"• Band {b.name} saknar personal ({_num(b.packages)} paket)", st["sub"]))
        for w in schedule.unassigned:
            el.append(Paragraph(f"• {w.name} har inget band", st["sub"]))

    def hist_txt(wid):
        h = recent_loads.get(wid, [])
        return "  ".join(f"{_num(p)}" + (f" ({hv} tunga)" if hv else "") for _, p, hv in h) if h else "–"

    el.append(Paragraph("Fördelning", st["h2"]))
    rows = [["Band", "Paket", "Medarbetare", "Belastning", "Senaste 3 dagar (paket, tunga >10 kg)"]]
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), PN_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("ALIGN", (3, 0), (4, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 1), (-1, -1), 0.5, LINE),
    ]
    for i, a in enumerate(sorted(schedule.assignments, key=lambda x: x.band_packages, reverse=True), start=1):
        fg, bg, label = _fatigue(a.fatigue_score)
        rows.append([a.band_name, _num(a.band_packages), a.worker_name, f"{label} · {round(a.fatigue_score)}", hist_txt(a.worker_id)])
        style += [("BACKGROUND", (3, i), (3, i), bg), ("TEXTCOLOR", (3, i), (3, i), fg), ("FONTNAME", (3, i), (3, i), "Helvetica-Bold")]
    el.append(_fatigue_table(rows, style, [22 * mm, 20 * mm, 52 * mm, 34 * mm, 46 * mm]))

    if schedule.stod:
        el.append(Paragraph("Stöd", st["h2"]))
        srows = [["Medarbetare", "Belastning", "Senaste 3 dagar (paket, tunga >10 kg)"]]
        sstyle = [
            ("BACKGROUND", (0, 0), (-1, 0), SURFACE),
            ("TEXTCOLOR", (0, 0), (-1, 0), INK_2),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ALIGN", (1, 0), (2, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 1), (-1, -1), 0.5, LINE),
        ]
        for i, w in enumerate(schedule.stod, start=1):
            fg, bg, label = _fatigue(w.fatigue_score)
            srows.append([w.name, f"{label} · {round(w.fatigue_score)}", hist_txt(w.id)])
            sstyle += [("BACKGROUND", (1, i), (1, i), bg), ("TEXTCOLOR", (1, i), (1, i), fg), ("FONTNAME", (1, i), (1, i), "Helvetica-Bold")]
        el.append(_fatigue_table(srows, sstyle, [74 * mm, 40 * mm, 60 * mm]))

    el.append(Spacer(1, 10))
    el.append(Paragraph("Belastning 50 = lagets snitt. Utvilad under 50, Belastad över 70. Tyngsta banden tilldelas de mest utvilade.", st["note"]))

    _footer(el, st)
    doc.build(el)
    return buffer.getvalue()
