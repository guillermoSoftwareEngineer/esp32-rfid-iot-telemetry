# Arquitectura del sistema IoT RFID

## Visión general

El sistema implementa una arquitectura IoT ligera utilizando:

* **ESP32** como dispositivo IoT
* **Google Apps Script** como backend serverless
* **Google Sheets** como almacenamiento de datos

Esta arquitectura permite construir sistemas IoT funcionales sin necesidad de servidores dedicados ni infraestructura compleja.

---

# Arquitectura del sistema

![Arquitectura del sistema](diagrams/system-architecture-es.png)

El sistema se organiza en tres capas principales:

1. **Dispositivo IoT**
2. **Backend serverless**
3. **Almacenamiento de datos**

El dispositivo recopila información del sistema y la envía al backend mediante solicitudes HTTP.

---

# Arquitectura IoT

![Arquitectura IoT](diagrams/iot-architecture-v1-es.png)

La arquitectura general del sistema sigue el siguiente flujo:

RFID → ESP32 → WiFi → HTTP API → Google Apps Script → Google Sheets

Este enfoque permite implementar soluciones IoT utilizando únicamente servicios cloud serverless.

---

# Arquitectura del Firmware del Dispositivo

![Arquitectura Firmware ESP32](diagrams/device-firmware-architecture-v1-es.png)

El firmware del ESP32 está estructurado en módulos que gestionan:

* lectura de tarjetas RFID
* conectividad WiFi
* construcción de mensajes JSON
* envío de datos mediante HTTP
* monitoreo del estado del dispositivo

Esta organización facilita la modularidad y el mantenimiento del código.

---

# Flujo de datos

El flujo de datos del sistema ocurre en los siguientes pasos:

1. El ESP32 obtiene información diagnóstica del sistema:

   * RSSI (intensidad de señal WiFi)
   * memoria libre (`free_heap`)
   * tiempo de actividad (`uptime`)
   * dirección IP

2. El dispositivo genera un **payload JSON** con la información recopilada.

3. El ESP32 envía los datos mediante una solicitud **HTTP POST** al backend.

4. **Google Apps Script** recibe la solicitud.

5. Los datos se registran en **Google Sheets**.

Este flujo permite monitorear dispositivos IoT de forma centralizada.

---

# Componentes del sistema

## Dispositivo IoT

Hardware utilizado:

* ESP32
* RFID RC522
* LCD
* LEDs
* Buzzer

Responsabilidades del dispositivo:

* Leer tarjetas RFID
* Mostrar información en la pantalla LCD
* Recopilar datos del sistema
* Enviar telemetría al backend

---

## Backend

El backend está implementado utilizando **Google Apps Script**, funcionando como una API HTTP serverless.

Funciones principales:

* recibir solicitudes HTTP
* validar datos enviados por el dispositivo
* registrar información en Google Sheets

---

## Base de datos

**Google Sheets** funciona como una base de datos ligera.

Permite:

* almacenar telemetría del dispositivo
* visualizar registros de actividad
* monitorear el estado de los dispositivos

---
