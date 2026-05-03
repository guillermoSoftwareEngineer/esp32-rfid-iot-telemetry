# Generador de Informes Técnicos en PDF

Generación automática de informes PDF a partir de datos reales de Google Sheets. No requiere credenciales: lee directamente desde la URL pública del sheet.

---

## Descripción general

`generate_report.py` es un script Python que descarga los datos de telemetría en vivo del Google Sheet del sistema IoT RFID con Wokwi y genera un informe técnico en PDF estructurado. Está diseñado para replicar la tarea real de generar informes automáticos de mantenimiento y auditoría para dispositivos IoT en campo.

**Contenido del informe:**

| Sección | Contenido |
|---|---|
| Encabezado | Logo · ID del dispositivo · Fecha de generación · Contacto del autor |
| Resumen del sistema | Uptime % · Tiempo offline · Eventos RFID · Desconexiones · RSSI promedio · Estado actual |
| Info del dispositivo | ID · IP · Ubicación · Cliente · Versión de firmware |
| Gráfico de conectividad | RSSI histórico + línea de estado ONLINE/OFFLINE + bandas de downtime |
| Registro de desconexiones | Historial de fallas con marca de tiempo y notas de causa |
| Registro de eventos RFID | Lecturas de tarjetas con UID, estado y notas |
| Diagnósticos | Registros de diagnóstico remoto (si están disponibles) |
| Pie de página | Nombre del autor · GitHub · LinkedIn · Email |

---

## Requisitos

Python 3.8 o superior. Instalar dependencias con:

```bash
pip install reportlab matplotlib requests
```

No se necesitan API keys, OAuth ni cuentas de servicio. El script lee desde la URL de exportación CSV pública del Google Sheet.

---

## Inicio rápido

```bash
# Navegar a la carpeta reports
cd reports

# Ejecutar con datos de demo (sin internet — dataset simulado)
python generate_report.py --demo

# Ejecutar con datos reales de Sheets, filtrado por ID de dispositivo
python generate_report.py --device ESP32-BUK-001

# Nombre de archivo de salida personalizado
python generate_report.py --device ESP32-BUK-001 --output informe_junio_2025.pdf

# Generar informe para todos los dispositivos en el sheet
python generate_report.py

# Ver los nombres de columna detectados en el sheet (útil para depurar)
python generate_report.py --show-cols
```

El PDF se guarda en la carpeta `reports/`. Está excluido del control de versiones mediante `.gitignore`.

---

## Estructura del Google Sheet

El script espera que la **fila 1 contenga los encabezados de columna**. Los nombres deben coincidir exactamente con los valores definidos en el bloque `CONFIG` dentro de `generate_report.py`. Nombres esperados por defecto:

| Columna | Nombre esperado | Ejemplo de valor |
|---|---|---|
| Identificador del dispositivo | `device_id` | `ESP32-BUK-001` |
| Marca de tiempo del evento | `timestamp` | `2025-06-01 08:00:00` |
| Tipo de evento | `event_type` | `heartbeat` |
| UID de la tarjeta RFID | `card_uid` | `A3:F2:91:BC` |
| IP del dispositivo | `ip` | `192.168.1.47` |
| Señal WiFi | `rssi` | `-62` |
| Uptime en segundos | `uptime` | `3600` |
| Ubicación física | `location` | `Oficina principal — Piso 3` |
| Nombre del cliente | `client` | `GTech Solutions` |
| Estado de conexión | `status` | `ONLINE` o `OFFLINE` |
| Versión de firmware | `firmware_version` | `v1.2.3` |
| Notas / causa | `notes` | `Timeout WiFi — reconexión automática` |

**Valores válidos de `event_type` reconocidos por el script:**

```
heartbeat    →  ping periódico del dispositivo
rfid_scan    →  evento de lectura de tarjeta
offline      →  dispositivo desconectado
online       →  dispositivo reconectado
diagnostic   →  diagnóstico remoto activado
```

**Valores válidos de `status`:** `ONLINE` · `OFFLINE` (en mayúsculas)

> Si los nombres de tus columnas son distintos, ejecuta `python generate_report.py --show-cols` para ver los que detecta el script, y luego actualiza el bloque `CONFIG` según corresponda.

---

## Configuración

Todos los ajustes se encuentran en el diccionario `CONFIG` al inicio de `generate_report.py`. Solo es necesario editar ese bloque.

```python
CONFIG = {
    # Google Sheet (debe ser accesible públicamente con "Cualquier persona con el enlace")
    "SHEET_ID":  "tu_sheet_id_aqui",        # visible en la URL del sheet
    "SHEET_GID": "tu_gid_aqui",             # visible después de #gid= en la URL

    # Mapeo de nombres de columna — deben coincidir exactamente con los encabezados de la fila 1
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

    # Marca del informe
    "BRAND_NAME":     "Tu Nombre",
    "BRAND_TITLE":    "Ingeniero de Sistemas IoT",
    "BRAND_GITHUB":   "github.com/tu-usuario",
    "BRAND_LINKEDIN": "linkedin.com/in/tu-perfil",
    "BRAND_EMAIL":    "tu@email.com",

    # Logo — el script prueba cada ruta en orden y usa la primera que encuentre
    "LOGO_PATHS": [
        "../Dashboard HTMLJS/images/logo.png",   # relativo a la carpeta reports/
        "logo.png",                               # alternativa: logo junto al script
    ],
}
```

**Para encontrar tu Sheet ID y GID:** abre el sheet en el navegador. La URL sigue este patrón:

```
https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=GID
```

Asegúrate de que el sheet esté configurado como **"Cualquier persona con el enlace puede ver"** — de lo contrario, el script no podrá descargar los datos.

---

## Logo

El script busca el logo en las rutas indicadas en `LOGO_PATHS` dentro de `CONFIG`, en orden. Usa el primer archivo que encuentre. Si no encuentra ninguno, genera el informe sin logo e imprime una advertencia.

En este proyecto el logo ya está disponible en:

```
Dashboard HTMLJS/images/logo.png
```

La ruta relativa `../Dashboard HTMLJS/images/logo.png` (desde `reports/`) lo resuelve automáticamente. No se necesita configuración adicional.

---

## Salida

El PDF generado se guarda en `reports/` por defecto. Los PDFs están excluidos del repositorio mediante `.gitignore` — siempre se generan localmente bajo demanda.

```
reports/
├── generate_report.py        ← este script
├── README_REPORTS.md         ← documentación (Inglés)
├── README_REPORTS_es.md      ← documentación (Español)
└── informe_tecnico.pdf       ← salida generada (excluida del repo)
```

---

## Clonar y ejecutar

Después de clonar el repositorio:

```bash
git clone https://github.com/guillermoSoftwareEngineer/iot-rfid-esp32.git
cd iot-rfid-esp32/reports

pip install reportlab matplotlib requests

# Probar primero con datos de demo
python generate_report.py --demo

# Luego con datos reales
python generate_report.py --device ESP32-BUK-001
```

No se necesitan variables de entorno, archivos `.env` ni credenciales. El sheet es público y el script lee desde él directamente.

---

## Solución de problemas

**El PDF sale vacío o sin datos**
Ejecuta `python generate_report.py --show-cols` y compara los nombres de columna detectados con los valores `COL_*` en `CONFIG`. Un simple error tipográfico o espacio extra en un encabezado causará un desajuste.

**Error "Could not download sheet"**
Verifica que el sheet esté compartido como "Cualquier persona con el enlace — Lector". Si el sheet es privado, la URL de exportación CSV devuelve una página HTML de inicio de sesión en lugar de datos.

**El logo no aparece**
El script imprimirá `Logo not found` con una advertencia. Verifica que `logo.png` exista en `Dashboard HTMLJS/images/logo.png` relativo a la raíz del repositorio. La ruta debe ser accesible desde `reports/` mediante `../`.

**El gráfico de RSSI está vacío**
El gráfico requiere filas donde `event_type` sea `heartbeat` y la columna `rssi` contenga un valor numérico. Si faltan eventos heartbeat o el campo RSSI está en blanco, el gráfico se muestra con un mensaje de "sin datos".

---

## .gitignore

El `.gitignore` de la raíz ya excluye los PDFs generados:

```
*.pdf
reports/*.pdf
```

Nunca subas informes PDF al repositorio — pueden contener información de clientes o dispositivos y deben generarse localmente bajo demanda.
