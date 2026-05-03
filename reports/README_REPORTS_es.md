# Generador de Informes Técnicos en PDF

Generación automática de informes PDF a partir de datos en vivo de Google Sheets a través del mismo backend API que usa el dashboard. No requiere credenciales — lee directamente desde el endpoint público `doGet`.

---

## Descripción general

`generate_report.py` es un script Python que consulta el backend de Google Apps Script (`doGet`) del sistema IoT RFID y genera un informe técnico en PDF estructurado. Actúa como cliente independiente de la misma API que consume el dashboard web, replicando la tarea real de generar informes automáticos de mantenimiento y auditoría para dispositivos IoT en campo.

**Cómo se conecta a los datos:**

```
generate_report.py  →  HTTP GET (doGet)  →  Apps Script  →  Google Sheets
```

Sin exportación CSV, sin acceso directo al Sheet, sin credenciales — el mismo endpoint público que impulsa el dashboard en vivo.

**Contenido del informe:**

| Sección | Contenido |
|---|---|
| Encabezado | Logo · ID del dispositivo · Fecha de generación · Contacto del autor |
| Resumen del sistema | Dispositivos online · Offline · Total de accesos · Autorizados vs. denegados · RSSI promedio |
| Inventario de dispositivos | ID · IP · Señal WiFi · Última conexión · Estado |
| Gráfico de accesos por hora | Cantidad de lecturas RFID por hora del día |
| Registro de eventos RFID | Lecturas con UID, resultado (autorizado/denegado), dispositivo y marca de tiempo |
| Pie de página | Nombre del autor · GitHub · LinkedIn · Email |

---

## Requisitos

Python 3.8 o superior. Instalar dependencias con:

```bash
pip install reportlab matplotlib requests
```

No se necesitan API keys, OAuth ni cuentas de servicio.

---

## Inicio rápido

```bash
# Navegar a la carpeta reports
cd reports

# Ejecutar con datos de demo (sin internet — dataset simulado)
python generate_report.py --demo

# Ejecutar con datos reales en vivo desde Google Sheets (vía doGet)
python generate_report.py

# Nombre de archivo de salida personalizado
python generate_report.py --output informe_junio_2025.pdf
```

El PDF se guarda en la carpeta `reports/`. Está excluido del control de versiones mediante `.gitignore`.

---

## Cómo funciona

El script realiza dos peticiones HTTP GET al backend de Apps Script — las mismas que hace el dashboard web:

| Petición | Respuesta |
|---|---|
| `GET /exec` | Inventario de dispositivos (ID, IP, RSSI, última conexión, estado) |
| `GET /exec?sheet=Accesos` | Registro de accesos RFID (ID tarjeta, resultado, dispositivo, timestamp) |

Luego analiza los datos, construye gráficos con `matplotlib` y ensambla el PDF con `reportlab`.

---

## Configuración

Todos los ajustes se encuentran en el diccionario `CONFIG` al inicio de `generate_report.py`. Solo es necesario editar ese bloque si algo cambia.

```python
CONFIG = {
    # URL del backend — mismo endpoint que usa el dashboard web (doGet)
    "BACKEND_URL": "YOUR_GOOGLE_APPS_SCRIPT_URL",

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

    # Un dispositivo se considera OFFLINE si no reportó en más de estos minutos
    "OFFLINE_THRESHOLD_MIN": 2,
}
```

**Para obtener la URL del backend:** despliega `backend/Código.js` en Google Apps Script como Web App (ver instrucciones completas en el README principal). La URL termina en `/exec`.

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
├── README_REPORTS_es.md      ← este archivo (Español)
└── informe_tecnico.pdf       ← salida generada (excluida del repo)
```

---

## Clonar y ejecutar

Después de clonar el repositorio:

```bash
git clone https://github.com/guillermoSoftwareEngineer/iot-rfid-esp32.git
cd iot-rfid-esp32/reports

pip install reportlab matplotlib requests

# Probar primero con datos de demo (sin internet)
python generate_report.py --demo

# Luego con datos reales en vivo
python generate_report.py
```

---

## Solución de problemas

**"Error al conectar con el backend"**
Verifica tu conexión a internet. Comprueba que la `BACKEND_URL` en `CONFIG` sea la URL correcta del despliegue (termina en `/exec`). Puedes probarla abriendo la URL en el navegador — debería devolver una respuesta JSON.

**El PDF sale vacío o sin datos**
Ejecuta primero con `--demo` para confirmar que el script funciona. Si `--demo` funciona pero los datos reales no, el problema es la conexión al backend o un Google Sheet vacío.

**El logo no aparece**
El script imprimirá una advertencia. Verifica que `logo.png` exista en `Dashboard HTMLJS/images/logo.png` relativo a la raíz del repositorio. La ruta debe ser accesible desde `reports/` mediante `../`.

**El gráfico no muestra actividad**
El gráfico de accesos por hora requiere al menos un registro en la hoja `Accesos`. Si el sheet está vacío, el gráfico se muestra con un mensaje de "sin registros".

---

## .gitignore

El `.gitignore` de la raíz ya excluye los PDFs generados:

```
*.pdf
reports/*.pdf
```

Nunca subas informes PDF al repositorio — pueden contener datos de dispositivos o accesos y deben generarse localmente bajo demanda.
