"""
GTech IoT — Generador de Informe Técnico PDF v2
Guillermo Vásquez · github.com/guillermoSoftwareEngineer

Lee datos directamente desde el backend Google Apps Script (doGet),
igual que el dashboard. Sin credenciales. Sin CSV. Sin columnas que mapear.

Uso:
    python generate_report.py                        → informe_tecnico.pdf
    python generate_report.py --output junio.pdf     → nombre personalizado
    python generate_report.py --demo                 → datos simulados (sin internet)

Requisitos:
    pip install reportlab matplotlib requests
"""

import argparse, os, sys, datetime, io, random
import requests
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, HRFlowable, Image, KeepTogether
)

# ══════════════════════════════════════════════════════
#  CONFIG — edita solo esta sección si algo cambia
# ══════════════════════════════════════════════════════
CONFIG = {
    # URL del backend (mismo que usa el dashboard)
    "BACKEND_URL": "https://script.google.com/macros/s/AKfycbysF0JGfK8m6KkML1TJLBboY9u4tEyqlNRktfIDO-PT2PDQqfWaTqwWq7arMmpFaGU5/exec",

    # Branding del autor
    "BRAND_NAME":     "Guillermo Vasquez",
    "BRAND_TITLE":    "Software & IoT Engineer",
    "BRAND_GITHUB":   "github.com/guillermoSoftwareEngineer",
    "BRAND_LINKEDIN": "linkedin.com/in/guillermovasbendev",
    "BRAND_EMAIL":    "guillermovasbendev@gmail.com",

    # Logo: el script lo busca en orden, usa el primero que exista
    "LOGO_PATHS": [
        os.path.join("..", "Dashboard HTMLJS", "images", "logo.png"),
        r"C:\Users\guill\OneDrive\Documentos\MARCA_PERSONAL\portafolio2026\images\logo.png",
        "logo.png",
    ],

    # Un dispositivo offline si no reportó en más de estos minutos
    "OFFLINE_THRESHOLD_MIN": 2,
}

# ══════════════════════════════════════════════════════
#  COLORES (idénticos al dashboard)
# ══════════════════════════════════════════════════════
def hc(h):
    h = h.lstrip("#")
    return colors.Color(int(h[0:2],16)/255, int(h[2:4],16)/255, int(h[4:6],16)/255)

C_DARK   = hc("#1a1a2e")
C_INDIGO = hc("#6366f1")
C_GREEN  = hc("#10B981")
C_RED    = hc("#EF4444")
C_AMBER  = hc("#F97316")
C_BLUE   = hc("#93C5FD")
C_BG     = hc("#f8fafc")
C_BORDER = hc("#e2e8f0")
C_GRAY   = colors.Color(0.45, 0.47, 0.52)
C_WHITE  = colors.white

LOGO_CACHE = None

# ══════════════════════════════════════════════════════
#  LOGO
# ══════════════════════════════════════════════════════
def find_logo():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for p in CONFIG["LOGO_PATHS"]:
        full = p if os.path.isabs(p) else os.path.normpath(os.path.join(script_dir, p))
        if os.path.exists(full):
            print("   Logo: " + full)
            return full
    print("   Logo no encontrado, se omite.")
    return None

# ══════════════════════════════════════════════════════
#  OBTENER DATOS DEL BACKEND (igual que el dashboard)
# ══════════════════════════════════════════════════════
def fetch_inventario():
    """Dispositivos registrados — misma llamada que hace el dashboard."""
    r = requests.get(CONFIG["BACKEND_URL"], timeout=20)
    r.raise_for_status()
    return r.json().get("dispositivos", [])

def fetch_accesos():
    """Historial de accesos RFID."""
    r = requests.get(CONFIG["BACKEND_URL"] + "?sheet=Accesos", timeout=20)
    r.raise_for_status()
    return r.json().get("accesos", [])

def parse_fecha(s):
    if not s:
        return None
    if isinstance(s, datetime.datetime):
        return s
    for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%d %H:%M:%S", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.datetime.strptime(str(s).strip(), fmt)
        except ValueError:
            continue
    return None

def es_online(ultima_conexion):
    """Replica exacta de esDispositivoOnline() del dashboard."""
    dt = parse_fecha(ultima_conexion)
    if not dt:
        return False
    diff = (datetime.datetime.utcnow() - dt).total_seconds() / 60
    return diff < CONFIG["OFFLINE_THRESHOLD_MIN"]

# ══════════════════════════════════════════════════════
#  ANÁLISIS
# ══════════════════════════════════════════════════════
def analizar(inventario, accesos):
    online  = [d for d in inventario if es_online(d.get("ultima_conexion"))]
    offline = [d for d in inventario if not es_online(d.get("ultima_conexion"))]

    # Accesos con fecha parseada
    accesos_parsed = []
    for a in accesos:
        dt = parse_fecha(a.get("fecha"))
        accesos_parsed.append({
            "fecha":     dt,
            "fecha_str": dt.strftime("%d/%m/%Y %H:%M") if dt else str(a.get("fecha","?")),
            "device_id": str(a.get("device_id", "?")),
            "card_id":   str(a.get("card_id", "N/A")),
            "status":    str(a.get("status", "N/A")),
        })
    accesos_parsed.sort(key=lambda x: x["fecha"] or datetime.datetime.min, reverse=True)

    autorizados  = [a for a in accesos_parsed if a["status"].lower() == "success"]
    denegados    = [a for a in accesos_parsed if a["status"].lower() == "unauthorized"]

    # Señal RSSI del inventario
    rssi_vals = []
    for d in inventario:
        try:
            rssi_vals.append(int(float(d.get("rssi", 0))))
        except (ValueError, TypeError):
            pass
    avg_rssi = round(sum(rssi_vals)/len(rssi_vals)) if rssi_vals else None

    return {
        "inventario":   inventario,
        "online":       online,
        "offline":      offline,
        "accesos":      accesos_parsed,
        "autorizados":  autorizados,
        "denegados":    denegados,
        "avg_rssi":     avg_rssi,
        "n_total":      len(inventario),
        "n_online":     len(online),
        "n_offline":    len(offline),
        "n_accesos":    len(accesos_parsed),
        "n_autorizados":len(autorizados),
        "n_denegados":  len(denegados),
    }

# ══════════════════════════════════════════════════════
#  GRÁFICO DE ACCESOS POR HORA
# ══════════════════════════════════════════════════════
def build_chart(accesos):
    """Gráfico de barras: accesos por hora del día."""
    horas = [0] * 24
    for a in accesos:
        if a["fecha"]:
            horas[a["fecha"].hour] += 1

    fig, ax = plt.subplots(figsize=(7.2, 2.2))
    fig.patch.set_facecolor("#f8fafc")
    ax.set_facecolor("#f8fafc")

    x = list(range(24))
    bars = ax.bar(x, horas, color="#6366f1", alpha=0.75, width=0.7, zorder=2)

    # Resaltar horas con actividad
    for i, h in enumerate(horas):
        if h > 0:
            bars[i].set_color("#10B981")
            bars[i].set_alpha(0.85)

    ax.set_xticks(range(0, 24, 2))
    ax.set_xticklabels([f"{h:02d}h" for h in range(0, 24, 2)], fontsize=7)
    ax.set_ylabel("Accesos", fontsize=8, color="#6b7280")
    ax.tick_params(axis="y", labelsize=7)
    ax.grid(axis="y", color="#e2e8f0", lw=0.5, ls="--", zorder=0)
    for sp in ["top","right","left","bottom"]:
        ax.spines[sp].set_color("#e2e8f0")
    ax.set_xlim(-0.5, 23.5)

    if all(h == 0 for h in horas):
        ax.text(12, 0.5, "Sin accesos registrados en el período",
                ha="center", va="center", fontsize=9, color="#94a3b8",
                transform=ax.get_xaxis_transform())

    plt.tight_layout(pad=0.5)
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    buf.seek(0)
    return buf

# ══════════════════════════════════════════════════════
#  HEADER / FOOTER
# ══════════════════════════════════════════════════════
def page_hf(canvas_obj, doc_obj, report_dt):
    w, h = letter
    canvas_obj.saveState()

    # Header oscuro
    canvas_obj.setFillColor(C_DARK)
    canvas_obj.rect(0, h-90, w, 90, fill=1, stroke=0)
    canvas_obj.setFillColor(C_INDIGO)
    canvas_obj.rect(0, h-93, w, 3, fill=1, stroke=0)

    # Logo
    tx = 36
    if LOGO_CACHE and os.path.exists(LOGO_CACHE):
        try:
            canvas_obj.drawImage(LOGO_CACHE, 36, h-78, width=38, height=38,
                                 preserveAspectRatio=True, mask="auto")
            tx = 88
        except Exception:
            pass

    # Título
    canvas_obj.setFont("Helvetica-Bold", 15)
    canvas_obj.setFillColor(C_WHITE)
    canvas_obj.drawString(tx, h-36, "Informe Tecnico — Sistema IoT RFID")
    canvas_obj.setFont("Helvetica", 8.5)
    canvas_obj.setFillColor(hc("#8b9cc8"))
    canvas_obj.drawString(tx, h-52,
        "GTech-ESP32-001   |   Firmware v1.0.0   |   " +
        report_dt.strftime("%d/%m/%Y %H:%M"))

    # Branding derecha
    canvas_obj.setFont("Helvetica-Bold", 9)
    canvas_obj.setFillColor(C_WHITE)
    canvas_obj.drawRightString(w-36, h-28, CONFIG["BRAND_NAME"])
    canvas_obj.setFont("Helvetica", 7.5)
    canvas_obj.setFillColor(hc("#8b9cc8"))
    canvas_obj.drawRightString(w-36, h-40, CONFIG["BRAND_TITLE"])
    canvas_obj.drawRightString(w-36, h-51, CONFIG["BRAND_GITHUB"])
    canvas_obj.drawRightString(w-36, h-62, CONFIG["BRAND_LINKEDIN"])

    # Footer
    canvas_obj.setFillColor(C_BG)
    canvas_obj.rect(0, 0, w, 32, fill=1, stroke=0)
    canvas_obj.setStrokeColor(C_BORDER)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(36, 32, w-36, 32)
    canvas_obj.setFont("Helvetica", 7.5)
    canvas_obj.setFillColor(C_GRAY)
    canvas_obj.drawString(36, 10,
        "GTech IoT RFID System — " + CONFIG["BRAND_NAME"] + " — " + CONFIG["BRAND_EMAIL"])
    canvas_obj.drawRightString(w-36, 10, "Pagina " + str(doc_obj.page))
    canvas_obj.restoreState()

# ══════════════════════════════════════════════════════
#  HELPERS DE LAYOUT
# ══════════════════════════════════════════════════════
def section(title):
    return [
        Spacer(1, 18),
        HRFlowable(width="100%", thickness=0.5, color=C_BORDER),
        Spacer(1, 5),
        Paragraph(title.upper(), ParagraphStyle(
            "SH", fontName="Helvetica-Bold", fontSize=9,
            textColor=C_INDIGO, spaceAfter=10, letterSpacing=1.1)),
    ]

def nota(text):
    return Paragraph(text, ParagraphStyle(
        "NT", fontName="Helvetica", fontSize=8,
        textColor=C_GRAY, spaceBefore=4, leftIndent=4))

def metrics_cards(metrics):
    """
    metrics: lista de (valor_str, etiqueta, color_hex)
    Dos filas separadas (número arriba, etiqueta abajo) — sin superposición.
    """
    n  = len(metrics)
    cw = (letter[0] - 72) / n

    val_row = [Paragraph(str(v), ParagraphStyle(
        "MV", fontName="Helvetica-Bold", fontSize=18,
        textColor=hc(c), alignment=TA_CENTER)) for v, l, c in metrics]

    lbl_row = [Paragraph(l, ParagraphStyle(
        "ML", fontName="Helvetica", fontSize=8,
        textColor=C_GRAY, alignment=TA_CENTER)) for v, l, c in metrics]

    t = Table([val_row, lbl_row], colWidths=[cw]*n)
    t.setStyle(TableStyle([
        ("BOX",           (0,0),(-1,-1), 0.5, C_BORDER),
        ("INNERGRID",     (0,0),(-1,-1), 0.5, C_BORDER),
        ("BACKGROUND",    (0,0),(-1,-1), C_BG),
        ("ALIGN",         (0,0),(-1,-1), "CENTER"),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0),(-1,0), 14),
        ("BOTTOMPADDING", (0,0),(-1,0), 4),
        ("TOPPADDING",    (0,1),(-1,1), 2),
        ("BOTTOMPADDING", (0,1),(-1,1), 12),
    ]))
    return t

def kv_table(pairs):
    rows = [[
        Paragraph(k, ParagraphStyle("KK", fontName="Helvetica-Bold",
                                    fontSize=9, textColor=C_GRAY)),
        Paragraph(str(v), ParagraphStyle("KV", fontName="Helvetica",
                                         fontSize=10, textColor=C_DARK)),
    ] for k, v in pairs]
    t = Table(rows, colWidths=[2.1*inch, 4.4*inch])
    t.setStyle(TableStyle([
        ("LINEBELOW",     (0,0),(-1,-2), 0.3, C_BORDER),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ]))
    return t

def data_table(rows_data, col_defs, max_rows=30):
    """
    col_defs: [{"label": "Columna", "key": "campo", "w": 1.5, "align": "center"}, ...]
    rows_data: lista de dicts
    """
    hs = ParagraphStyle("EH", fontName="Helvetica-Bold", fontSize=8,
                        textColor=C_WHITE, alignment=TA_CENTER)
    cl = ParagraphStyle("EL", fontName="Helvetica", fontSize=8, textColor=C_DARK)
    cc = ParagraphStyle("EC", fontName="Helvetica", fontSize=8,
                        textColor=C_DARK, alignment=TA_CENTER)

    header = [Paragraph(c["label"], hs) for c in col_defs]
    data   = [header]

    for row in rows_data[:max_rows]:
        r = []
        for c in col_defs:
            v = row.get(c["key"], "—") or "—"
            r.append(Paragraph(str(v), cc if c.get("align")=="center" else cl))
        data.append(r)

    if len(data) == 1:  # solo header, sin filas
        data.append([Paragraph("Sin registros.", cl)] +
                    [Paragraph("", cl)] * (len(col_defs)-1))

    t = Table(data, colWidths=[c.get("w",1.3)*inch for c in col_defs], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,0), C_DARK),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_WHITE, C_BG]),
        ("GRID",          (0,0),(-1,-1), 0.3, C_BORDER),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
    ]))
    return t

# ══════════════════════════════════════════════════════
#  CONSTRUIR PDF
# ══════════════════════════════════════════════════════
def build_pdf(A, output_path, report_dt):
    global LOGO_CACHE
    LOGO_CACHE = find_logo()

    doc = SimpleDocTemplate(
        output_path, pagesize=letter,
        leftMargin=36, rightMargin=36,
        topMargin=104, bottomMargin=46,
        title="Informe Tecnico GTech IoT",
        author=CONFIG["BRAND_NAME"],
        subject="GTech IoT RFID System — Reporte Automatico",
    )
    cb    = lambda c, d: page_hf(c, d, report_dt)
    story = []

    # ── 1. MÉTRICAS RESUMEN ─────────────────────────────
    story += section("Resumen del sistema")

    st_color  = "#10B981" if A["n_online"] > 0 else "#EF4444"
    rssi_s    = str(A["avg_rssi"]) + " dBm" if A["avg_rssi"] else "N/A"

    story.append(metrics_cards([
        (str(A["n_online"]),      "Dispositivos Online",    "#10B981"),
        (str(A["n_offline"]),     "Dispositivos Offline",   "#F97316"),
        (str(A["n_accesos"]),     "Accesos totales",        "#6366f1"),
        (str(A["n_autorizados"]), "Accesos autorizados",    "#10B981"),
        (str(A["n_denegados"]),   "Accesos denegados",      "#EF4444"),
        (rssi_s,                  "Señal WiFi promedio",    "#93C5FD"),
    ]))

    story.append(Spacer(1, 8))
    story.append(nota(
        "Los datos reflejan el estado actual del sistema al momento de generar este informe. "
        "Un dispositivo se considera OFFLINE si no reporto actividad en los ultimos " +
        str(CONFIG["OFFLINE_THRESHOLD_MIN"]) + " minutos."
    ))

    # ── 2. INVENTARIO DE DISPOSITIVOS ──────────────────
    story += section("Inventario de dispositivos")

    inv_rows = []
    for d in A["inventario"]:
        dt = parse_fecha(d.get("ultima_conexion"))
        online = es_online(d.get("ultima_conexion"))
        inv_rows.append({
            "device_id":  d.get("device_id", "?"),
            "estado":     "ONLINE" if online else "OFFLINE",
            "ip":         str(d.get("ip", "N/A")),
            "rssi":       str(d.get("rssi", "N/A")) + " dBm",
            "ultima":     dt.strftime("%d/%m/%Y %H:%M:%S") if dt else "Sin datos",
        })

    story.append(data_table(inv_rows, [
        {"label":"Device ID",         "key":"device_id", "w":2.0},
        {"label":"Estado",            "key":"estado",    "w":1.1, "align":"center"},
        {"label":"IP",                "key":"ip",        "w":1.3, "align":"center"},
        {"label":"Señal WiFi",        "key":"rssi",      "w":1.1, "align":"center"},
        {"label":"Ultima conexion",   "key":"ultima",    "w":1.9, "align":"center"},
    ]))

    story.append(Spacer(1, 6))
    story.append(nota(
        "Estado ONLINE = el dispositivo reporto actividad en los ultimos " +
        str(CONFIG["OFFLINE_THRESHOLD_MIN"]) +
        " minutos. Estado OFFLINE = sin respuesta reciente (dispositivo apagado, sin WiFi o simulacion detenida)."
    ))

    # ── 3. GRÁFICO DE ACCESOS POR HORA ─────────────────
    story += section("Distribucion de accesos por hora del dia")
    story.append(Image(build_chart(A["accesos"]),
                       width=6.8*inch, height=2.2*inch))
    story.append(Spacer(1, 4))
    story.append(nota("Verde: horas con actividad registrada. Cada barra representa el total de lecturas RFID en esa hora."))

    # ── 4. ÚLTIMOS ACCESOS RFID ────────────────────────
    story += section("Historial de accesos RFID")

    accesos_rows = []
    for a in A["accesos"][:30]:
        resultado = "Autorizado" if a["status"].lower() == "success" else "Denegado"
        accesos_rows.append({
            "fecha":     a["fecha_str"],
            "card_id":   a["card_id"],
            "resultado": resultado,
            "device":    a["device_id"].replace("GTech-",""),
        })

    story.append(data_table(accesos_rows, [
        {"label":"Fecha y hora",  "key":"fecha",     "w":2.1, "align":"center"},
        {"label":"ID de tarjeta", "key":"card_id",   "w":1.8, "align":"center"},
        {"label":"Resultado",     "key":"resultado", "w":1.3, "align":"center"},
        {"label":"Dispositivo",   "key":"device",    "w":1.4, "align":"center"},
    ]))

    if A["n_accesos"] > 30:
        story.append(nota("* Se muestran los 30 accesos mas recientes de " +
                          str(A["n_accesos"]) + " registros totales."))

    story.append(Spacer(1, 8))
    story.append(nota(
        "Autorizado: la tarjeta RFID esta en la lista de tarjetas permitidas del firmware. "
        "Denegado: la tarjeta no esta en la lista o fue rechazada por el sistema."
    ))

    # ── 5. FIRMA ────────────────────────────────────────
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=0.5, color=C_BORDER))
    story.append(Spacer(1, 10))
    story.append(Table([
        [Paragraph("<b>" + CONFIG["BRAND_NAME"] + "</b> — " + CONFIG["BRAND_TITLE"],
                   ParagraphStyle("B1", fontName="Helvetica-Bold",
                                  fontSize=10, textColor=C_DARK))],
        [Paragraph(CONFIG["BRAND_GITHUB"] + "   |   " +
                   CONFIG["BRAND_LINKEDIN"] + "   |   " + CONFIG["BRAND_EMAIL"],
                   ParagraphStyle("B2", fontName="Helvetica",
                                  fontSize=9, textColor=C_INDIGO))],
        [Paragraph(
            "Generado automaticamente el " +
            report_dt.strftime("%d/%m/%Y a las %H:%M") +
            " — GTech IoT Report Generator — Python + ReportLab",
            ParagraphStyle("B3", fontName="Helvetica", fontSize=8,
                           textColor=C_GRAY, spaceBefore=3))],
    ], colWidths=[6.8*inch]))

    doc.build(story, onFirstPage=cb, onLaterPages=cb)
    print("PDF generado: " + output_path)

# ══════════════════════════════════════════════════════
#  DATOS DE DEMO (sin internet)
# ══════════════════════════════════════════════════════
def demo():
    now = datetime.datetime.utcnow()
    inventario = [
        {"device_id":"GTech-ESP32-001",
         "ultima_conexion":(now - datetime.timedelta(seconds=45)).strftime("%Y-%m-%dT%H:%M:%SZ"),
         "ip":"10.10.0.2","rssi":-62,"estado":"ONLINE"},
    ]
    cards = ["01020304","A1B2C3D4","E5F6G7H8","DEADBEEF"]
    statuses = ["success","success","success","unauthorized","success"]
    accesos = []
    for i in range(18):
        ts = now - datetime.timedelta(hours=i*1.3 + random.uniform(0,0.5))
        accesos.append({
            "fecha": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "device_id":"GTech-ESP32-001",
            "card_id": random.choice(cards),
            "status":  random.choice(statuses),
        })
    return inventario, accesos

# ══════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="GTech IoT — Informe Tecnico PDF")
    parser.add_argument("--output", default="informe_tecnico.pdf")
    parser.add_argument("--demo",   action="store_true",
                        help="Datos simulados — no requiere internet")
    args = parser.parse_args()

    report_dt = datetime.datetime.now()

    if args.demo:
        print("Modo demo — datos simulados")
        inventario, accesos = demo()
    else:
        print("Conectando con el backend...")
        try:
            inventario = fetch_inventario()
            accesos    = fetch_accesos()
        except Exception as e:
            print("Error al conectar con el backend: " + str(e))
            print("Comprueba tu conexion a internet o usa --demo.")
            sys.exit(1)

        print("   Dispositivos: " + str(len(inventario)) +
              " | Accesos: " + str(len(accesos)))

    print("Analizando datos...")
    A = analizar(inventario, accesos)
    print("   Online: " + str(A["n_online"]) +
          " | Offline: " + str(A["n_offline"]) +
          " | Accesos: " + str(A["n_accesos"]) +
          " (autorizados: " + str(A["n_autorizados"]) +
          ", denegados: " + str(A["n_denegados"]) + ")")

    print("Generando PDF...")
    build_pdf(A, args.output, report_dt)

if __name__ == "__main__":
    main()