// VERSION COMPRENSION COMPLETA DEL BACKEND - GTech IoT
// Este archivo explica paso a paso como funciona el backend Serverless en Google Apps Script

// Token de seguridad para escritura (POST).
// IMPORTANTE: En el código de GitHub déjalo como "TU_TOKEN_SECRETO".
// Cuando lo pegues en Google Apps Script, cámbialo por una clave segura real.
var API_TOKEN = "TU_TOKEN_SECRETO"; // esta variable protege nuestra base de datos de inyecciones falsas


function doGet(e) { // Evento necesario para que el Dashboard web pueda consultar datos por HTTP GET
  var ss = SpreadsheetApp.getActiveSpreadsheet(); // se direcciona al sheet de google esta app se creo desde esa hoja por defecto apunta a ella
  var tipo = e && e.parameter && e.parameter.sheet; // lee los parametros de la URL, si la URL dice ?sheet=Accesos, se guarda esa palabra en la variable tipo
  // el uso de e && e.parameter evita que el codigo falle si no se envian parametros manejo de errores ocultos

  // --- SI EL DASHBOARD PIDE ACCESOS ---

  if (tipo === "Accesos") { // si la variable tipo es exactamente igual a "Accesos"

    var accSheet = ss.getSheetByName("Accesos"); // busca la pestaña Accesos

    if (!accSheet) { // comprueba si la variable accSheet es diferente de null o vacio, es decir si la pestaña no existe
      return ContentService // funcion que devuelve respuesta a la maquina o dispositivo
        .createTextOutput(JSON.stringify({ accesos: [] })) // envia un array vacio en formato JSON crudo
        .setMimeType(ContentService.MimeType.JSON); // Content-Type o MIME Type Define el encabezado Header de la respuesta como JSON
    }

    var filas = accSheet.getDataRange().getValues(); // se guarda en esta variable el rango desde 0 hasta terminar y se obtienen los valores de ese rango (matriz de datos)
    var accesos = []; // crea un array vacio para ir guardando los datos estructurados

    // recorrer desde fila 1 saltando encabezados (la fila 0 son los titulos)
    // columnas en excel: Fecha(0), Device ID(1), Tipo Evento(2), Card ID(3), Status(4)
    for (var i = 1; i < filas.length; i++) { // bucle for para recorrer toda la matriz de datos
      accesos.push({ // como funciona como objeto el push añade al final la informacion al array
        fecha: filas[i][0], // extrae la fecha de la primera columna
        device_id: filas[i][1], // extrae el ID del dispositivo de la segunda columna
        card_id: filas[i][3], // extrae el ID de la tarjeta leida
        status: filas[i][4] // extrae si el acceso fue success o unauthorized
      });
    }

    return ContentService // envia la respuesta al Dashboard
      .createTextOutput(JSON.stringify({ accesos: accesos })) // convierte el array de objetos a texto JSON
      .setMimeType(ContentService.MimeType.JSON); // le indica al navegador que el contenido es un dato estructurado y no una pagina web
  }

  // --- POR DEFECTO DEVUELVE INVENTARIO ---
  // si no se pidio la hoja de accesos, por defecto se devuelve el inventario de maquinas

  var invSheet = ss.getSheetByName("Inventario"); // busca la pestaña Inventario

  if (!invSheet) { // si no existe inventario devolver array vacio
    return ContentService
      .createTextOutput(JSON.stringify({ dispositivos: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var datos = invSheet.getDataRange().getValues(); // lee todos los datos de la pestaña inventario
  var dispositivos = []; // crea array vacio

  for (var i = 1; i < datos.length; i++) { // salta la fila 0 de titulos
    dispositivos.push({ // llena el array con objetos
      device_id: datos[i][0],
      ultima_conexion: datos[i][1],
      ip: datos[i][2],
      rssi: datos[i][3],
      estado: datos[i][4]
    });
  }

  return ContentService // devuelve la lista de dispositivos al frontend (nuestro dashboard)
    .createTextOutput(JSON.stringify({ dispositivos: dispositivos }))
    .setMimeType(ContentService.MimeType.JSON);
}


function doPost(e) { // Evento necesario desde el ESP32 para activar la funcion doPost de escritura
  try { // primera funcion de manejo del evento, intenta ejecutar el bloque, la segunda es catch si hay errores
    
    var data = JSON.parse(e.postData.contents); // recibe el contenido del evento y lo guarda parseado mediante metodo convirtiendolo en JSON crudo
    
    // --- VERIFICACION DE SEGURIDAD ---
    // Solo permitimos la escritura si el dispositivo envía el token correcto en el JSON
    if (data.token !== API_TOKEN) { // si el token que viene de la placa no es igual al de la variable secreta
      return ContentService // rechaza la conexion
        .createTextOutput(JSON.stringify({ status: "error", message: "Unauthorized access" })) // devuelve mensaje de no autorizado
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet(); // se crea la variable que trae el app script relacionado a la hoja de datos

    if (!data.payload) data.payload = {}; // si el objeto no trae payload, entonces creala como un objeto vacio
    // se procesan datos asi vengan incompletos, si se usan en otro lugar no causa fallo
    
    var sheetNombre = (data.event_type === "CARD_SCAN") ? "Accesos" : "Eventos"; // operador ternario
    // si el tipo de evento es un CARD SCAN se guarda en Accesos si no en Eventos 
    
    var sheet = ss.getSheetByName(sheetNombre); // pone el evento en la pestaña correcta luego de la ejecucion del Oper Ternario
    // funciona coherentemente con la linea anterior

    if (!sheet) { // comprueba si la variable sheet es diferente de null o vacio
      sheet = ss.insertSheet(sheetNombre); // si esa funcion se cumple se inserta en sheet el valor de la variable sheetNombre se crea la pestaña con ese nombre
      sheet.appendRow(["Fecha","Device ID","Tipo Evento","Card ID","Status","IP","RSSI","Uptime","Firmware"]); // como funciona como objeto el append añade al final la informacion, creando titulos
    } // separado por comas define cada colomna como cuando copiamos datos en excel

    sheet.appendRow([ // manejo de errores ocultos si no se encuentra el valor se reemplaza por otro valor con el operador or || para no dejar valores vacios
      // importante en el manejo de datos data scienst
      new Date(),           // llama la hora y fecha actual, si se ejecuta en el sitio de monitoreo, se ahorra sincronizacion de hora en cada dispositivo
      data.device_id        || "UNKNOWN",
      data.event_type       || "UNKNOWN",
      data.payload.card_id  || "N/A",
      data.payload.status   || "N/A",
      data.payload.ip       || "N/A",
      data.payload.rssi     || 0,
      data.payload.uptime   || 0,
      data.firmware_version || "N/A"
    ]);


    var invSheet = ss.getSheetByName("Inventario"); // busca la pestaña inventario
    if (!invSheet) { // si la pestaña inventario no existe
      invSheet = ss.insertSheet("Inventario"); // crea la pestaña
      invSheet.appendRow(["Device ID","Ultima Conexion","IP","RSSI","Estado"]); // escribe titulos de las columnas
    }

    var datos = invSheet.getDataRange().getValues(); // se guarda en esta variable el rango desde 0 hasta terminar y se obtienen los valores de ese rango
    // es decir es una matriz un array con arrays internos
    var encontrado = false; // esta variable se usa para poner en vacio la que guarda la descripcion del equipo en este caso un ESP32 pero serian las maquinas o dispositivos a monitorear

    for (var i = 1; i < datos.length; i++) { // se empieza en la fila 1 por que 0 es titulos en sheets de google, se revisa el largo del inventario, salta siguiente fila
      if (datos[i][0] == data.device_id) { // mira la Columna A indice 0 de la fila actual i ademas Compara ese texto con el ID que acaba de enviar el ESP32
        invSheet.getRange(i+1,2).setValue(new Date()); // por el titulo se debe poner en la siguiente fila por eso i+1 en todos, 2 equivale a columna b ultima conexion
        invSheet.getRange(i+1,3).setValue(data.payload.ip   || "N/A"); // 3 equivale a columna C IP
        invSheet.getRange(i+1,4).setValue(data.payload.rssi || 0); // 4 equivale a columna D RSSI estado de la conexion fuerte,debil, etc
        invSheet.getRange(i+1,5).setValue("ONLINE"); // 5 equivale a columna E estado del dispositivo o maquina ONLINE, OFFLINE, ALARM, etc
        encontrado = true; // cambia la variable a TRue para confirmar que la informacion se encontro
        break; // Rompe el iterador de busqueda, por que si ya se encontro el dispositivo o maquina es ineficiente seguir buscando
      }
    }

    if (!encontrado) { // Si la variable al finalizar el for anterior no encontro el dispositivo, sigue en false y
      // si aqui es verdadero con la negacion se ejecuta, es decir solo se ejecuta si el dispositivo o maquina no se encontro
      invSheet.appendRow([ // se agrega a la fila en cada columna los datos del nuevo dispositivo
        data.device_id    || "UNKNOWN", // Se agrega a cada fila el valor del nuevo dispositivo o maquina si no se pone el valor por defecto para evitar errores ocultos
        new Date(),         // para la columna ultima conexion se ejecuta esta funcion siempre no necesita alternativa a null
        data.payload.ip   || "N/A",
        data.payload.rssi || 0,
        "ONLINE"            // Si se encontro obviamente esta en linea, si no estaria apagado
      ]);
    }

    return ContentService // funcion que devuelve respuesta a la maquina o dispositivo, para que sepa que el mensaje se recibio en el backend bien
      .createTextOutput(JSON.stringify({status:"success"})) // se envia un texto en formato JSON con la palabra SUCCESS
      .setMimeType(ContentService.MimeType.JSON); // Content-Type o MIME Type Define el encabezado Header de la respuesta como JSON
      // Esto le indica al ESP32 que el contenido es un dato estructurado y no una pagina web.

  } catch(error) { // segunda funcion de manejo actua con try esta se dispara si hay errores de ejecucion en javascript
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet(); // se direcciona al sheet de google esta app se creo desde esa hoja por defecto apunta a ella
      var logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs"); // Busca la pestaña Logs, si no existe, la crea con insertSheet
      logSheet.appendRow([new Date(), "ERROR", error.toString()]); // Agrega el error a la variable logSheet y pone la hora y fecha el error en formato string y lo agrega a una nueva fila
    } catch(e){} // Silent catch Si falla el registro en la hoja de Logs, se ignora el error para evitar un bucle infinito
      // y asegura que el servidor siempre responda al ESP32

    return ContentService
      .createTextOutput(JSON.stringify({status:"error",message:error.toString()})) // Retorno de contingencia Informa al ESP32 que la operación fallo
      .setMimeType(ContentService.MimeType.JSON); // y envia el detalle tecnico del error en formato JSON
  }
}
