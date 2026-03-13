# RFID IoT System Architecture

## Overview

The system implements a lightweight IoT architecture using:

* **ESP32** as the IoT device
* **Google Apps Script** as a serverless backend
* **Google Sheets** as the data storage layer

This architecture allows building functional IoT systems without requiring dedicated servers or complex infrastructure.

---

# System Architecture

![System Architecture](../diagrams/system-architecture-en.png)

The system is organized into three main layers:

1. **IoT Device**
2. **Serverless Backend**
3. **Data Storage**

The device collects system information and sends it to the backend using HTTP requests.

---

# IoT Architecture

![IoT Architecture](../diagrams/iot-architecture-v1-en.png)

The overall architecture follows this data flow:

RFID → ESP32 → WiFi → HTTP API → Google Apps Script → Google Sheets

This approach allows IoT devices to communicate directly with cloud services using a **serverless architecture**.

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

1. The ESP32 gathers diagnostic information from the device:

   * RSSI (WiFi signal strength)
   * available memory (`free_heap`)
   * device uptime (`uptime`)
   * IP address

2. The device generates a **JSON payload** containing the collected information.

3. The ESP32 sends the data through an **HTTP POST request** to the backend.

4. **Google Apps Script** receives the request.

5. The data is stored in **Google Sheets**.

This pipeline enables centralized monitoring of IoT devices.

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
