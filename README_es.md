# Sistema de Control de Acceso IoT con RFID y ESP32

[![ESP32](https://img.shields.io/badge/ESP32-IoT-blue)](https://www.espressif.com/)
[![Arduino](https://img.shields.io/badge/Framework-Arduino-green)](https://www.arduino.cc/)
[![Wokwi](https://img.shields.io/badge/Simulado%20en-Wokwi-7B2FBE)](https://wokwi.com/)
[![Google Apps Script](https://img.shields.io/badge/Backend-Google%20Apps%20Script-4285F4)](https://developers.google.com/apps-script)
[![Google Sheets](https://img.shields.io/badge/Database-Google%20Sheets-34A853)](https://sheets.google.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## ¿Qué es este proyecto?

Sistema IoT de control de acceso basado en RFID simulado en **Wokwi** con un **ESP32**. El dispositivo actúa como una máquina de acceso: lee tarjetas RFID, valida su autorización y reporta cada evento al backend en la nube.

El backend es completamente **serverless**: un **Google Apps Script** expuesto como Web App que recibe eventos HTTP POST del ESP32 y los almacena en **Google Sheets**, que funciona como base de datos y panel de monitoreo en tiempo real.

---

## Arquitectura del sistema

```
[Wokwi / ESP32]
      │
      │  HTTP POST (JSON)
      ▼
[Google Apps Script Web App]
      │
      │  SpreadsheetApp API
      ▼
[Google Sheets]
 ├── Accesos    → eventos CARD_SCAN
 ├── Eventos    → HEARTBEAT y DIAGNOSTIC
 ├── Inventario → estado actual de cada dispositivo
 └── Logs       → errores del servidor
```

### Flujo de un evento RFID

1. El ESP32 detecta una tarjeta RFID con el módulo RC522
2. Lee el UID de la tarjeta y lo convierte a hexadecimal
3. Lo verifica contra la base de datos local de tarjetas autorizadas
4. Muestra el resultado en el LCD (`ACCESO OK` / `ACCESO DENEGADO`)
5. Emite un beep corto (autorizado) o largo (denegado)
6. Envía un evento `CARD_SCAN` al backend vía HTTP POST
7. Google Apps Script registra el evento y actualiza el inventario

### Heartbeat (señal de vida)

Cada 30 segundos el ESP32 envía automáticamente un evento `HEARTBEAT` al backend, indicando que el dispositivo sigue activo. Esto permite detectar desconexiones.

---

## Dashboard en vivo

**[→ Abrir dashboard en vivo](https://guillermosoftwareengineer.github.io/esp32-rfid-iot-telemetry/)**

![Dashboard in real time — Wokwi + GitHub Pages](diagrams/IotvDashB.gif)

Monitoreo en tiempo real de los dispositivos conectados. El dashboard lee los datos desde Google Sheets a través de `doGet` y se actualiza automáticamente cada 30 segundos.

---

## Tecnologías

| Capa            | Tecnología              | Rol                                    |
|-----------------|-------------------------|----------------------------------------|
| Simulación      | Wokwi                   | Simula el ESP32 y los periféricos      |
| Microcontrolador| ESP32 DevKit C v4       | Unidad central del dispositivo IoT     |
| Lector RFID     | MFRC522 (SPI)           | Lee tarjetas / tags RFID               |
| Pantalla        | LCD 16x2 I2C            | Muestra estado y feedback al usuario   |
| Comunicación    | HTTP REST sobre WiFi    | Envío de eventos al backend            |
| Backend         | Google Apps Script      | API serverless, procesa eventos POST   |
| Base de datos   | Google Sheets           | Almacena eventos, inventario y logs    |
| Framework FW    | Arduino (C++)           | Base del firmware del ESP32            |

---

## Estructura del repositorio

```
iot-rfid-esp32/
│
├── firmware/
│   └── esp32-rfid/
│       ├── esp32-rfid.ino       ← Firmware principal del ESP32
│       ├── secrets.example.h    ← Plantilla de credenciales (subir al repo)
│       └── secrets.h            ← Credenciales reales (en .gitignore, NO subir)
│
├── backend/
│   └── Código.js                ← Google Apps Script (doGet + doPost)
│
├── diagrams/
│   ├── diagram.json             ← Diagrama Wokwi del circuito
│   └── *.png / *.gif            ← Diagramas de arquitectura y demos
│
├── Dashboard HTMLJS/
│   └── index.html               ← Dashboard web que consume el doGet
│
├── docs/
│   ├── architecture_en.md
│   └── architecture_es.md
│
├── hardware/
│   ├── BOM.md                   ← Lista de componentes
│   └── wiring-diagram-v1.jpg    ← Diagrama de cableado físico
│
├── .gitignore                   ← Protege secrets.h y archivos de build
├── README.md                    ← Este archivo
├── README_en.md
└── README_es.md
```

---

## Gestión de credenciales (IMPORTANTE)

Este proyecto usa un sistema de **archivos de secretos** para evitar exponer credenciales en el repositorio. La URL del Google Apps Script y el ID del Sheet **nunca deben estar en el código fuente**.

### Cómo funciona

| Archivo              | ¿Se sube al repo? | Propósito                                  |
|----------------------|-------------------|--------------------------------------------|
| `secrets.example.h`  | Sí                | Plantilla con valores de ejemplo (seguros) |
| `secrets.h`          | No (gitignore)    | Credenciales reales del desarrollador      |

El firmware incluye `secrets.h` mediante `#include "secrets.h"`. Si ese archivo no existe, la compilación falla con un mensaje claro. Esto es intencional: obliga a cada colaborador a configurar sus propias credenciales.

### Configurar el proyecto por primera vez

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/iot-rfid-esp32.git
cd iot-rfid-esp32

# 2. Crear el archivo de secretos
cp firmware/esp32-rfid/secrets.example.h firmware/esp32-rfid/secrets.h

# 3. Editar secrets.h con tus valores reales
# Abre firmware/esp32-rfid/secrets.h y reemplaza los valores
```

### Contenido de `secrets.h`

```cpp
#ifndef SECRETS_H
#define SECRETS_H

// Red WiFi
// Para Wokwi: "Wokwi-GUEST" con password vacío
#define SECRET_WIFI_SSID     "Wokwi-GUEST"
#define SECRET_WIFI_PASSWORD ""

// URL del Google Apps Script publicado como Web App
#define SECRET_BACKEND_URL   "https://script.google.com/macros/s/TU_SCRIPT_ID/exec"

// ID del Google Sheet (visible en la URL del spreadsheet)
#define SECRET_SHEET_ID      "TU_SHEET_ID"

#endif
```

---

## Configurar el backend (Google Apps Script)

### Paso 1 — Crear el Google Sheet

1. Ir a [Google Sheets](https://sheets.google.com) y crear un nuevo spreadsheet
2. Copiar el ID de la URL: `docs.google.com/spreadsheets/d/`**`TU_SHEET_ID`**`/edit`
3. El script creará automáticamente las hojas: **Accesos**, **Eventos**, **Inventario**, **Logs**

### Paso 2 — Crear el Apps Script

1. En el spreadsheet: **Extensiones → Apps Script**
2. Borrar el contenido predeterminado
3. Pegar el contenido de `backend/Código.js`
4. Guardar con `Ctrl+S`

### Paso 3 — Publicar como Web App

1. **Implementar → Nueva implementación**
2. Tipo: **Aplicación web**
3. Ejecutar como: **Yo (tu cuenta de Google)**
4. Quién tiene acceso: **Cualquier persona**
5. Clic en **Implementar**
6. Copiar la URL generada (termina en `/exec`)
7. Pegarla en `secrets.h` como valor de `SECRET_BACKEND_URL`

> **Nota:** Cada vez que modifiques el script y reimplementes, se genera una nueva versión. Si cambias la URL, actualiza `secrets.h`.

---

## Simular en Wokwi

### Requisitos

- Cuenta en [wokwi.com](https://wokwi.com)
- El archivo `diagrams/diagram.json` con el circuito
- El firmware `firmware/esp32-rfid/esp32-rfid.ino`

### Pasos

1. Crear un nuevo proyecto ESP32 en Wokwi
2. Importar `diagram.json` o recrear el circuito manualmente
3. Copiar el contenido de `esp32-rfid.ino` al editor de Wokwi
4. En Wokwi **no se usa `secrets.h`** — los valores de WiFi están preconfigurados para `Wokwi-GUEST`
5. Actualizar la constante `BACKEND_URL` directamente en el editor de Wokwi con tu URL real

> **En Wokwi** la red WiFi `Wokwi-GUEST` es una red virtual sin contraseña que da acceso a internet. El ESP32 simulado puede hacer peticiones HTTP reales a Google Apps Script.

---

## Conexiones de hardware

| Componente     | Pin/Señal | GPIO ESP32 |
|----------------|-----------|------------|
| RFID RC522     | SDA (SS)  | GPIO 5     |
| RFID RC522     | SCK       | GPIO 18    |
| RFID RC522     | MOSI      | GPIO 23    |
| RFID RC522     | MISO      | GPIO 19    |
| RFID RC522     | RST       | GPIO 4     |
| RFID RC522     | VCC       | 3.3V       |
| LCD 16x2 I2C   | SDA       | GPIO 21    |
| LCD 16x2 I2C   | SCL       | GPIO 22    |
| LED Verde      | Ánodo     | GPIO 26    |
| LED Rojo       | Ánodo     | GPIO 27    |
| Buzzer         | Señal     | GPIO 25    |
| Botón          | Señal     | GPIO 14    |

---

## API del backend

### `POST /exec` — Recibir evento del ESP32

**Body JSON:**
```json
{
  "device_id": "GTech-ESP32-001",
  "event_type": "CARD_SCAN",
  "token": "YOUR_API_TOKEN",
  "firmware_version": "1.0.0",
  "payload": {
    "card_id": "01020304",
    "status": "success",
    "ip": "10.10.0.2",
    "rssi": -72,
    "uptime": 47
  }
}
```

**Tipos de evento (`event_type`):**
- `CARD_SCAN` → Lectura de tarjeta RFID (autorizada o no)
- `HEARTBEAT` → Señal de vida periódica (cada 30 s)
- `DIAGNOSTIC_RESPONSE` → Reporte de diagnóstico por botón

**Respuesta exitosa:**
```json
{ "status": "success" }
```

### `GET /exec` — Obtener inventario de dispositivos

Devuelve el estado actual de todos los dispositivos registrados:

```json
{
  "dispositivos": [
    {
      "device_id": "GTech-ESP32-001",
      "ultima_conexion": "2026-04-21T21:00:00.000Z",
      "ip": "10.10.0.2",
      "rssi": -72,
      "estado": "ONLINE"
    }
  ]
}
```

---

## Tarjetas autorizadas (base de datos local)

El firmware tiene una lista local de UIDs autorizados. Esto permite que el sistema funcione aunque no haya internet (modo offline):

```cpp
String tarjetasAutorizadas[] = {
  "A1B2C3D4",
  "E5F6G7H8",
  "12345678",
  "01020304"   // tarjeta de prueba en Wokwi
};
```

La tarjeta de prueba por defecto en Wokwi es `01020304`.

---

## Licencia

MIT License — Ver [LICENSE](LICENSE)

---

*Proyecto de portafolio técnico — Guillermo Vásquez*  
*Ingeniería IoT · Google Apps Script · ESP32 · RFID*
