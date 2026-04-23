/**
 * secrets.example.h — Plantilla de configuracion privada
 *
 * INSTRUCCIONES:
 *   1. Copia este archivo:  cp secrets.example.h secrets.h
 *   2. Edita secrets.h con tus valores reales.
 *   3. secrets.h esta en .gitignore — nunca lo subas al repositorio.
 *
 * IMPORTANTE: No escribas tus credenciales reales en ESTE archivo.
 */

#ifndef SECRETS_H
#define SECRETS_H

// --- Red WiFi ---
// Para Wokwi (simulador): SSID = "Wokwi-GUEST", PASSWORD = ""
// Para hardware real: usa tu red WiFi local
#define SECRET_WIFI_SSID     "YOUR_WIFI_SSID"
#define SECRET_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// --- Google Apps Script ---
// URL generada al publicar el script como Web App (ejecutar como "yo",
// acceso permitido a "cualquier persona")
// Ejemplo: https://script.google.com/macros/s/AKfy.../exec
#define SECRET_BACKEND_URL   "YOUR_GOOGLE_APPS_SCRIPT_URL"

// Token de seguridad para escribir datos (doPost) en Google Sheets
// Debe coincidir con la variable API_TOKEN en backend/Código.js
#define SECRET_API_TOKEN     "YOUR_API_TOKEN"

// --- Google Sheets ---
// ID del spreadsheet que actua como base de datos
// Se encuentra en la URL: docs.google.com/spreadsheets/d/TU_SHEET_ID/edit
#define SECRET_SHEET_ID      "YOUR_GOOGLE_SHEET_ID"

#endif