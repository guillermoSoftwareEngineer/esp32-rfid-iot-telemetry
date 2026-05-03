# RFID IoT System Architecture

## Overview

The system implements a lightweight IoT architecture using:

* **ESP32** as the IoT device (simulated in Wokwi)
* **Google Apps Script** as a serverless backend
* **Google Sheets** as the data storage layer
* **Web Dashboard** (`index.html`) as the real-time monitoring frontend
* **PDF Report Generator** (`generate_report.py`) as an offline analysis tool

This architecture allows building functional IoT systems without requiring dedicated servers or complex infrastructure. The backend acts as a central API serving both the web dashboard and the report generator.

---

# System Architecture

![System Architecture](../diagrams/system-architecture-en.png)

The system is organized into five main layers:

1. **IoT Device** (Wokwi / ESP32)
2. **Serverless Backend** (Google Apps Script)
3. **Data Storage** (Google Sheets)
4. **Web Dashboard** (GitHub Pages — `index.html`)
5. **Report Generator** (`reports/generate_report.py`)

The device sends telemetry to the backend via HTTP POST. Both the web dashboard and the report script independently consume data from the backend via HTTP GET (`doGet`).

---

# IoT Architecture

![IoT Architecture](../diagrams/iot-architecture-v1-en.png)

The overall architecture follows this data flow:

```
                         WRITE
Wokwi (ESP32) ──POST + token──► Apps Script (doPost) ──► Google Sheets
                                                                │
                         READ                                   │
                    ◄──── Apps Script (doGet) ◄────────────────┘
                                    │
              ┌─────────────────────┴─────────────────────┐
              ▼                                           ▼
  GitHub Pages (index.html)                 generate_report.py
    Real-time web dashboard                  Local Python script
    Auto-refresh every 30 s                 Generates PDF reports
```

* **Data Acquisition (Write):** RFID → ESP32 → WiFi → HTTP POST (+ token) → Google Apps Script → Google Sheets
* **Real-time Monitoring (Read):** GitHub Pages Dashboard → HTTP GET (`doGet`) → Google Apps Script → Google Sheets
* **Report Generation (Read):** `generate_report.py` → HTTP GET (`doGet`) → Google Apps Script → Google Sheets → PDF

This approach allows IoT devices to communicate directly with cloud services using a **serverless architecture**, with multiple clients consuming the same read endpoint independently.

---

# Device Firmware Architecture

![ESP32 Firmware Architecture](../diagrams/device-firmware-architecture-v1-en.png)

The ESP32 firmware is structured into modules responsible for:

* RFID card reading
* WiFi connectivity management
* JSON message construction
* HTTP request transmission
* Device health and status monitoring

This modular design improves maintainability and scalability.

---

# Data Flow

The system data flow occurs in the following steps:

**Data Acquisition & Storage:**
1. The ESP32 detects an RFID card and verifies its UID against the local authorized list.

2. The device generates a **JSON payload** containing the access result and system telemetry:

   * RSSI (WiFi signal strength)
   * available memory (`free_heap`)
   * device uptime (`uptime`)
   * IP address

3. The ESP32 sends the data through an **HTTP POST request** to the backend, including an **authentication token**.

4. **Google Apps Script** validates the token and rejects the write request if it does not match.

5. The data is stored in **Google Sheets** across four sheets: `Accesos`, `Eventos`, `Inventario`, and `Logs`.

**Real-time Monitoring (Web Dashboard):**

6. The **Web Dashboard** (`index.html` on GitHub Pages) periodically sends an **HTTP GET request** (`doGet`) to the backend.
7. Google Apps Script reads the latest device inventory and access logs from Google Sheets.
8. The backend returns a JSON response which the dashboard renders in real-time (auto-refresh every 30 s).

**PDF Report Generation (generate_report.py):**

9. The local script `generate_report.py` performs the same `doGet` call to the backend as the dashboard.
10. It retrieves the device inventory and the RFID access history.
11. It generates a **technical PDF report** with metrics, tables, and activity charts.
12. The PDF is saved locally (excluded from the repository via `.gitignore`).

This pipeline enables centralized IoT monitoring with multiple visualization tools sharing the same backend.

---

# System Components

## IoT Device

Hardware components used:

* ESP32
* RFID RC522
* LCD display
* Status LEDs
* Buzzer

Device responsibilities:

* Read RFID cards
* Display information on the LCD
* Collect system diagnostics
* Send telemetry to the backend

---

## Backend

The backend is implemented using **Google Apps Script**, acting as a serverless HTTP API.

Main responsibilities:

* receive HTTP requests
* validate incoming data
* store records in Google Sheets

---

## Database

**Google Sheets** functions as a lightweight database.

It allows:

* storing device telemetry
* visualizing system logs
* monitoring device activity

---

## Web Dashboard (Frontend)

A static single-page application (`index.html`) deployed on **GitHub Pages** that serves as the monitoring interface.

Main responsibilities:

* fetch real-time data from the backend via HTTP GET (`doGet`)
* visualize device inventory and connection status
* display the latest RFID access logs
* auto-refresh every 30 seconds

---

## PDF Report Generator

A local Python script (`reports/generate_report.py`) that acts as an independent client of the same backend.

Main responsibilities:

* query the same backend `doGet` endpoint used by the dashboard
* analyze the device inventory and access history
* generate a **technical PDF report** with metrics, charts, and tables
* operate in `--demo` mode without internet access

Generated PDFs are excluded from the repository via `.gitignore`.
