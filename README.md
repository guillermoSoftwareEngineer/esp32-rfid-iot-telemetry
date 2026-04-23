# IoT RFID Access Control System (ESP32)

[![ESP32](https://img.shields.io/badge/ESP32-IoT-blue)](https://www.espressif.com/)
[![Arduino](https://img.shields.io/badge/Framework-Arduino-green)](https://www.arduino.cc/)
[![Wokwi](https://img.shields.io/badge/Simulated%20on-Wokwi-7B2FBE)](https://wokwi.com/)
[![Google Apps Script](https://img.shields.io/badge/Backend-Google%20Apps%20Script-4285F4)](https://developers.google.com/apps-script)
[![Google Sheets](https://img.shields.io/badge/Database-Google%20Sheets-34A853)](https://sheets.google.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

ESP32-based IoT access control system using RFID cards, simulated in **Wokwi**, with a serverless backend powered by **Google Apps Script** and **Google Sheets** for real-time event logging and device telemetry.

---

## Documentation

| Language | README | Architecture |
|----------|--------|--------------|
| 🇺🇸 English | [README_en.md](README_en.md) | [docs/architecture_en.md](docs/architecture_en.md) |
| 🇪🇸 Español | [README_es.md](README_es.md) | [docs/architecture_es.md](docs/architecture_es.md) |

---

## System Demo

![System Demo](diagrams/demo.gif)

Complete workflow: RFID card scan → HTTP POST → Google Apps Script → Google Sheets

![System Demo](diagrams/demo_1.gif)

---

## System Architecture

```
[Wokwi / ESP32]  →  HTTP POST  →  [Google Apps Script]  →  [Google Sheets]
```

![System Architecture](diagrams/system-architecture-en.png)

---

## Credentials Setup (IMPORTANT)

This project uses a **secrets file** pattern to keep credentials out of version control.

```bash
# 1. Clone the repository
git clone https://github.com/tu-usuario/iot-rfid-esp32.git

# 2. Create your secrets file from the template
cp firmware/esp32-rfid/secrets.example.h firmware/esp32-rfid/secrets.h

# 3. Edit secrets.h with your real values
```

`secrets.h` is listed in `.gitignore` and will **never** be committed. The repository only contains `secrets.example.h` as a safe template.

See [README_es.md](README_es.md) for full setup instructions (Google Apps Script deployment, Wokwi simulation, etc.).

---

## Technology Stack

| Layer           | Technology              |
|-----------------|-------------------------|
| Simulation      | Wokwi                   |
| Microcontroller | ESP32 DevKit C v4       |
| RFID Reader     | MFRC522 (SPI)           |
| Display         | LCD 16x2 I2C            |
| Communication   | HTTP REST over WiFi     |
| Backend         | Google Apps Script      |
| Database        | Google Sheets           |
| Firmware        | Arduino Framework (C++) |

---

## Repository Structure

```
iot-rfid-esp32/
├── firmware/
│   └── esp32-rfid/
│       ├── esp32-rfid.ino       ← Main firmware
│       ├── secrets.example.h    ← Credentials template (safe to commit)
│       └── secrets.h            ← Real credentials (gitignored, never commit)
├── backend/
│   └── Código.js                ← Google Apps Script (doGet + doPost)
├── diagrams/                    ← Wokwi diagram + architecture images
├── Dashboard HTMLJS/            ← Web dashboard (HTML/JS)
├── docs/                        ← Extended documentation
├── hardware/                    ← BOM and wiring diagrams
└── .gitignore
```
---

## Live Dashboard

**[→ Open live dashboard](https://guillermosoftwareengineer.github.io/esp32-rfid-iot-telemetry/)**

![Dashboard in real time — Wokwi + GitHub Pages](diagrams/IotvDashB.gif)

---

---

## License

MIT License — See [LICENSE](LICENSE)

---

*Portfolio project — Guillermo Vásquez*  
*IoT Engineering · Google Apps Script · ESP32 · RFID*
