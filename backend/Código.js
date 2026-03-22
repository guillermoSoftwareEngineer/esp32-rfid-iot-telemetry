/**
 * GTech IoT Backend - Google Apps Script
 * Version 1.0.0
 *
 * Recibe eventos HTTP POST desde dispositivos ESP32
 * y los almacena en Google Sheets para monitoreo y auditoria.
 *
 * Hojas gestionadas:
 *   - Accesos   → eventos de lectura RFID (CARD_SCAN)
 *   - Eventos   → heartbeats y diagnosticos
 *   - Inventario → estado actual de cada dispositivo
 *   - Logs      → errores del servidor
 */


/**
 * doPost - punto de entrada para eventos enviados por el ESP32
 *
 * Recibe un JSON con la siguiente estructura:
 * {
 *   device_id:        "GTech-ESP32-001",
 *   event_type:       "CARD_SCAN" | "HEARTBEAT" | "DIAGNOSTIC_RESPONSE",
 *   firmware_version: "1.0.0",
 *   payload: {
 *     card_id: "01020304",
 *     status:  "success" | "unauthorized",
 *     ip:      "10.10.0.2",
 *     rssi:    -85,
 *     uptime:  47
 *   }
 * }
 *
 * @param {Object} e - objeto de evento HTTP proporcionado por Apps Script
 * @returns {TextOutput} respuesta JSON con status success o error
 */
function doPost(e) {
  try {

    // parsear el cuerpo del request enviado por el ESP32
    var data = JSON.parse(e.postData.contents);
    var ss   = SpreadsheetApp.getActiveSpreadsheet();

    // proteccion: garantizar que payload exista aunque venga vacio
    if (!data.payload) data.payload = {};


    // --- REGISTRO DE EVENTO EN HOJA CORRESPONDIENTE ---

    // los CARD_SCAN van a Accesos, el resto (HEARTBEAT, DIAGNOSTIC) a Eventos
    var sheetNombre = (data.event_type === "CARD_SCAN") ? "Accesos" : "Eventos";
    var sheet       = ss.getSheetByName(sheetNombre);

    // crear hoja con encabezados si no existe
    if (!sheet) {
      sheet = ss.insertSheet(sheetNombre);
      sheet.appendRow([
        "Fecha", "Device ID", "Tipo Evento",
        "Card ID", "Status", "IP", "RSSI", "Uptime", "Firmware"
      ]);
    }

    // registrar el evento con todos sus campos
    // el operador || garantiza un valor por defecto si el campo viene vacio
    sheet.appendRow([
      new Date(),
      data.device_id        || "UNKNOWN",
      data.event_type       || "UNKNOWN",
      data.payload.card_id  || "N/A",
      data.payload.status   || "N/A",
      data.payload.ip       || "N/A",
      data.payload.rssi     || 0,
      data.payload.uptime   || 0,
      data.firmware_version || "N/A"
    ]);


    // --- ACTUALIZACION DE INVENTARIO ---

    // el inventario mantiene el estado actual de cada dispositivo
    // no es un historico sino una vista en tiempo real: un registro por dispositivo
    var invSheet = ss.getSheetByName("Inventario");

    // crear hoja con encabezados si no existe
    if (!invSheet) {
      invSheet = ss.insertSheet("Inventario");
      invSheet.appendRow([
        "Device ID", "Ultima Conexion", "IP", "RSSI", "Estado"
      ]);
    }

    var datos      = invSheet.getDataRange().getValues();
    var encontrado = false;

    // buscar si el dispositivo ya tiene un registro en inventario
    for (var i = 1; i < datos.length; i++) {

      if (datos[i][0] == data.device_id) {

        // dispositivo existente: actualizar su estado con los datos mas recientes
        invSheet.getRange(i + 1, 2).setValue(new Date());
        invSheet.getRange(i + 1, 3).setValue(data.payload.ip   || "N/A");
        invSheet.getRange(i + 1, 4).setValue(data.payload.rssi || 0);
        invSheet.getRange(i + 1, 5).setValue("ONLINE");

        encontrado = true;
        break;
      }
    }

    // dispositivo nuevo: agregar primera entrada en inventario
    if (!encontrado) {
      invSheet.appendRow([
        data.device_id    || "UNKNOWN",
        new Date(),
        data.payload.ip   || "N/A",
        data.payload.rssi || 0,
        "ONLINE"
      ]);
    }


    // --- RESPUESTA AL DISPOSITIVO ---

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);


  } catch(error) {

    // --- REGISTRO DE ERROR ---

    // cualquier excepcion se guarda en la hoja Logs para auditoria
    try {
      var ss       = SpreadsheetApp.getActiveSpreadsheet();
      var logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
      logSheet.appendRow([ new Date(), "ERROR", error.toString() ]);
    } catch(e) {}

    return ContentService
      .createTextOutput(JSON.stringify({
        status:  "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}