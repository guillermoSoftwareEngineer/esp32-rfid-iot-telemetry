function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (!data.payload) data.payload = {};

    var sheetNombre = (data.event_type === "CARD_SCAN") ? "Accesos" : "Eventos";
    var sheet = ss.getSheetByName(sheetNombre);

    if (!sheet) {
      sheet = ss.insertSheet(sheetNombre);
      sheet.appendRow(["Fecha","Device ID","Tipo Evento","Card ID","Status","IP","RSSI","Uptime","Firmware"]);
    }

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

    var invSheet = ss.getSheetByName("Inventario");
    if (!invSheet) {
      invSheet = ss.insertSheet("Inventario");
      invSheet.appendRow(["Device ID","Ultima Conexion","IP","RSSI","Estado"]);
    }

    var datos = invSheet.getDataRange().getValues();
    var encontrado = false;

    for (var i = 1; i < datos.length; i++) {
      if (datos[i][0] == data.device_id) {
        invSheet.getRange(i+1,2).setValue(new Date());
        invSheet.getRange(i+1,3).setValue(data.payload.ip   || "N/A");
        invSheet.getRange(i+1,4).setValue(data.payload.rssi || 0);
        invSheet.getRange(i+1,5).setValue("ONLINE");
        encontrado = true;
        break;
      }
    }

    if (!encontrado) {
      invSheet.appendRow([
        data.device_id    || "UNKNOWN",
        new Date(),
        data.payload.ip   || "N/A",
        data.payload.rssi || 0,
        "ONLINE"
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({status:"success"}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs");
      logSheet.appendRow([new Date(), "ERROR", error.toString()]);
    } catch(e){}

    return ContentService
      .createTextOutput(JSON.stringify({status:"error",message:error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
