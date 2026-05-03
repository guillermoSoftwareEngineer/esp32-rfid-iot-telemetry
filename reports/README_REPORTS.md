# 📄 Technical Report Generator

Automatic PDF report generation from real Google Sheets data. No credentials required — reads directly from the public sheet URL.

---

## Overview

`generate_report.py` is a Python script that pulls live telemetry data from the Wokwi IoT RFID system's Google Sheet and produces a structured technical PDF report. It is designed to replicate the real-world task of generating automated maintenance and audit reports for IoT field devices.

**What the report includes:**

| Section | Content |
|---|---|
| Header | Logo · Device ID · Generation timestamp · Author contact |
| System Summary | Uptime % · Offline time · RFID events · Disconnections · Avg RSSI · Current status |
| Device Info | ID · IP · Location · Client · Firmware version |
| Connectivity Chart | Historical RSSI signal + ONLINE/OFFLINE state line + downtime bands |
| Disconnection Log | Timestamped fault history with cause notes |
| RFID Event Log | Card reads with UID, status and notes |
| Diagnostics | Remote diagnostic records (if available) |
| Footer | Author name · GitHub · LinkedIn · Email |

---

## Requirements

Python 3.8 or higher. Install dependencies with:

```bash
pip install reportlab matplotlib requests
```

No API keys, no OAuth, no service accounts needed. The script reads from the public CSV export URL of the Google Sheet.

---

## Quickstart

```bash
# Navigate to the reports folder
cd reports

# Run with demo data (no internet required — simulated dataset)
python generate_report.py --demo

# Run with real Sheets data, filter by device ID
python generate_report.py --device ESP32-BUK-001

# Custom output filename
python generate_report.py --device ESP32-BUK-001 --output report_june_2025.pdf

# Generate report for all devices in the sheet
python generate_report.py

# Inspect column names detected from the sheet (useful for troubleshooting)
python generate_report.py --show-cols
```

The PDF is saved in the `reports/` folder. It is excluded from version control via `.gitignore`.

---

## Google Sheet Structure

The script expects **row 1 to contain column headers**. The column names must match the values defined in the `CONFIG` block inside `generate_report.py`. Default expected names:

| Column | Expected name | Example value |
|---|---|---|
| Device identifier | `device_id` | `ESP32-BUK-001` |
| Event timestamp | `timestamp` | `2025-06-01 08:00:00` |
| Event type | `event_type` | `heartbeat` |
| RFID card UID | `card_uid` | `A3:F2:91:BC` |
| Device IP | `ip` | `192.168.1.47` |
| WiFi signal | `rssi` | `-62` |
| Uptime in seconds | `uptime` | `3600` |
| Physical location | `location` | `Main Office — Floor 3` |
| Client name | `client` | `GTech Solutions` |
| Connection status | `status` | `ONLINE` or `OFFLINE` |
| Firmware version | `firmware_version` | `v1.2.3` |
| Notes / cause | `notes` | `WiFi timeout — auto reconnect` |

**Valid `event_type` values recognized by the script:**

```
heartbeat    →  periodic device ping
rfid_scan    →  card read event
offline      →  device disconnected
online       →  device reconnected
diagnostic   →  remote diagnostic triggered
```

**Valid `status` values:** `ONLINE` · `OFFLINE` (uppercase)

> If your column names differ, run `python generate_report.py --show-cols` to see what the script detects, then update the `CONFIG` block accordingly.

---

## Configuration

All settings live in the `CONFIG` dictionary at the top of `generate_report.py`. You only need to edit this block.

```python
CONFIG = {
    # Google Sheet (must be publicly accessible via "Anyone with the link")
    "SHEET_ID":  "your_sheet_id_here",        # found in the sheet URL
    "SHEET_GID": "your_gid_here",             # found after #gid= in the URL

    # Column name mapping — must match your sheet's row 1 headers exactly
    "COL_DEVICE_ID":  "device_id",
    "COL_TIMESTAMP":  "timestamp",
    "COL_EVENT_TYPE": "event_type",
    "COL_CARD_UID":   "card_uid",
    "COL_IP":         "ip",
    "COL_RSSI":       "rssi",
    "COL_UPTIME":     "uptime",
    "COL_LOCATION":   "location",
    "COL_CLIENT":     "client",
    "COL_STATUS":     "status",
    "COL_FIRMWARE":   "firmware_version",
    "COL_NOTES":      "notes",

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
}
```

**To find your Sheet ID and GID:** open the sheet in the browser. The URL follows this pattern:

```
https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=GID
```

Make sure the sheet is set to **"Anyone with the link can view"** — otherwise the script cannot download the data.

---

## Logo

The script searches for the logo in the paths listed under `LOGO_PATHS` in `CONFIG`, in order. It uses the first file that exists. If none is found, the report is generated without a logo and the script prints a warning.

For this project the logo is already available at:

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
├── README_REPORTS.md         ← this file
└── informe_tecnico.pdf       ← generated output (gitignored)
```

---

## Cloning and Running

After cloning the repository:

```bash
git clone https://github.com/guillermoSoftwareEngineer/iot-rfid-esp32.git
cd iot-rfid-esp32/reports

pip install reportlab matplotlib requests

# Try with demo data first
python generate_report.py --demo

# Then with real data
python generate_report.py --device ESP32-BUK-001
```

No environment variables, no `.env` files, no credentials to configure. The sheet is public and the script reads it directly.

---

## Troubleshooting

**PDF comes out empty or with no data**
Run `python generate_report.py --show-cols` and compare the detected column names against the `COL_*` values in `CONFIG`. A single typo or extra space in a header will cause a mismatch.

**"Could not download sheet" error**
Verify the sheet sharing is set to "Anyone with the link — Viewer". If the sheet is private, the CSV export URL returns an HTML login page instead of data.

**Logo not appearing**
The script will print `Logo not found` with a warning. Check that `logo.png` exists at `Dashboard HTMLJS/images/logo.png` relative to the repository root. The path must be accessible from `reports/` via `../`.

**RSSI chart is empty**
The chart requires rows where `event_type` is `heartbeat` and the `rssi` column contains a numeric value. If heartbeat events are missing or the RSSI field is blank, the chart renders with a "no data" message.

---

## .gitignore

The root `.gitignore` already excludes generated PDFs:

```
*.pdf
```

Never commit PDF reports to the repository — they may contain client or device information and should be generated on demand.