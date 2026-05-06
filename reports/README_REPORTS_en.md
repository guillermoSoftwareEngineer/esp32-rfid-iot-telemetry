# 📄 Technical Report Generator

Automatic PDF report generation from live Google Sheets data via the same backend API used by the dashboard. No credentials required — reads directly from the public `doGet` endpoint.

---

## Overview

`generate_report.py` is a Python script that queries the Google Apps Script backend (`doGet`) of the IoT RFID system and generates a structured technical PDF report. It acts as an independent client of the same API consumed by the web dashboard, replicating the real-world task of generating automated maintenance and audit reports for IoT field devices.

**How it connects to data:**

```
generate_report.py  →  HTTP GET (doGet)  →  Apps Script  →  Google Sheets
```

No CSV export, no direct Sheet access, no credentials — the same public endpoint that powers the live dashboard.

**What the report includes:**

| Section | Content |
|---|---|
| Header | Logo · Device ID · Generation timestamp · Author contact |
| System Summary | Online devices · Offline devices · Total access events · Authorized vs. denied · Avg RSSI |
| Device Inventory | Device ID · IP · WiFi signal · Last connection · Status |
| Access History Chart | RFID access count per hour of day |
| RFID Event Log | Card reads with UID, result (authorized/denied), device and timestamp |
| Footer | Author name · GitHub · LinkedIn · Email |

---

## Requirements

Python 3.8 or higher. Install dependencies with:

```bash
pip install reportlab matplotlib requests
```

No API keys, no OAuth, no service accounts needed.

---

## Quickstart

```bash
# Navigate to the reports folder
cd reports

# Run with demo data (no internet required — simulated dataset)
python generate_report.py --demo

# Run with real live data from Google Sheets (via doGet)
python generate_report.py

# Custom output filename
python generate_report.py --output report_june_2025.pdf
```

The PDF is saved in the `reports/` folder. It is excluded from version control via `.gitignore`.

---

## How it works

The script makes two HTTP GET requests to the Apps Script backend — the same calls the web dashboard makes:

| Request | Response |
|---|---|
| `GET /exec` | Device inventory (ID, IP, RSSI, last connection, status) |
| `GET /exec?sheet=Accesos` | RFID access log (card ID, result, device, timestamp) |

It then analyzes the data, builds charts with `matplotlib`, and assembles the PDF with `reportlab`.

---

## Configuration

All settings are in the `CONFIG` dictionary at the top of `generate_report.py`. You only need to edit this block if something changes.

```python
CONFIG = {
    # Backend URL — same endpoint used by the web dashboard (doGet)
    "BACKEND_URL": "YOUR_GOOGLE_APPS_SCRIPT_URL",

    # Report branding
    "BRAND_NAME":     "Your Name",
    "BRAND_TITLE":    "IoT Systems Engineer",
    "BRAND_GITHUB":   "github.com/your-username",
    "BRAND_LINKEDIN": "linkedin.com/in/your-profile",
    "BRAND_EMAIL":    "your@email.com",

    # Logo — script tries each path in order, uses the first one found
    "LOGO_PATHS": [
        "../Dashboard HTMLJS/images/logo.png",   # relative to reports/ folder
        "logo.png",                               # fallback: logo next to script
    ],

    # A device is considered OFFLINE if it hasn't reported in more than this many minutes
    "OFFLINE_THRESHOLD_MIN": 2,
}
```

**To get the backend URL:** deploy your `backend/Código.js` in Google Apps Script as a Web App (see main README for setup instructions). The URL ends in `/exec`.

---

## Logo

The script searches for the logo in the paths listed under `LOGO_PATHS` in `CONFIG`, in order. It uses the first file that exists. If none is found, the report is generated without a logo and a warning is printed.

For this project, the logo is already available at:

```
Dashboard HTMLJS/images/logo.png
```

The relative path `../Dashboard HTMLJS/images/logo.png` (from `reports/`) resolves to it automatically. No additional setup needed.

---

## Output

The generated PDF is saved in `reports/` by default. PDFs are excluded from the repository via `.gitignore` — they are always generated locally on demand.

```
reports/
├── generate_report.py        ← this script
├── README_REPORTS_en.md      ← this file (English)
├── README_REPORTS_es.md      ← this file (Spanish)
└── informe_tecnico.pdf       ← generated output (gitignored)
```

---

## Cloning and Running

After cloning the repository:

```bash
git clone https://github.com/guillermoSoftwareEngineer/iot-rfid-esp32.git
cd iot-rfid-esp32/reports

pip install reportlab matplotlib requests

# Try with demo data first (no internet required)
python generate_report.py --demo

# Then with real live data
python generate_report.py
```

---

## Troubleshooting

**"Error connecting to backend"**
Check your internet connection. Verify the `BACKEND_URL` in `CONFIG` is the correct deployed URL (ends in `/exec`). You can test it by opening the URL in a browser — it should return a JSON response.

**PDF comes out with no data / empty sections**
Run with `--demo` first to confirm the script works. If `--demo` works but real data doesn't, the issue is the backend connection or an empty Google Sheet.

**Logo not appearing**
The script will print a warning. Check that `logo.png` exists at `Dashboard HTMLJS/images/logo.png` relative to the repository root. The path must be accessible from `reports/` via `../`.

**Chart shows no activity**
The RFID access chart requires at least one entry in the `Accesos` sheet. If the sheet is empty, the chart renders with a "no records" message.

---

## .gitignore

The root `.gitignore` already excludes generated PDFs:

```
*.pdf
reports/*.pdf
```

Never commit PDF reports to the repository — they may contain device or access data and should be generated on demand.