function doPost(e) { // Evento necesario desde el ESP32 para activar la funcion doPost
  try { // primera funcion de manejo del evento que intenta conectar wi fi la segunda es catch
    var data = JSON.parse(e.postData.contents); // recibe el contenido del evento y lo guarda parseado mediante metodo de convirtiendolo en JSON crudo
    var ss = SpreadsheetApp.getActiveSpreadsheet();// se crea la variable que trae el app script relacionado a la hoja de datos el app script se creo en este libro asi que por defecto trae ese

    if (!data.payload) data.payload = {}; //si el objeto no trae payload, entonces creala como un objeto vacio
    // se procesan datos asi vengan incompletos, si se usan en otro lugar no causa fallo
    var sheetNombre = (data.event_type === "CARD_SCAN") ? "Accesos" : "Eventos"; //operador ternario y
    // si el tipo de evento es un CARD SCAN se guarda en Accesos si no en Eventos 
    var sheet = ss.getSheetByName(sheetNombre); // pone el evento en la pestaña  correcta luego de la ejecucion de OPer Ternario
    //funciona coherentemente con la linea anterior

    if (!sheet) { //comprueba si la variable sheet es diferente de null o vacio
      sheet = ss.insertSheet(sheetNombre); // si esa funcion se cumple se insertaa en sheet el valor de la variable sheetNombre se crea la pestaña con ese nombre
      sheet.appendRow(["Fecha","Device ID","Tipo Evento","Card ID","Status","IP","RSSI","Uptime","Firmware"]);//como funciona como objeto el append añade al final la informacion, creando titulos
    }//separado por comas define cada colomna como cuando copiamos datos en excel

    sheet.appendRow([ //manejo de errores ocultos si no se encuentra el valor se reemplaza por otro valor con el operador or || para no dejar valores vacios
      // importante en el manejo de datos data scienst
      new Date(),       //llama la hora y fecha actual, si se ejecuta en el sitio de monitoreo, se ahorra sincronizacion de hora en cada dispositivo
      data.device_id        || "UNKNOWN",
      data.event_type       || "UNKNOWN",
      data.payload.card_id  || "N/A",
      data.payload.status   || "N/A",
      data.payload.ip       || "N/A",
      data.payload.rssi     || 0,
      data.payload.uptime   || 0,
      data.firmware_version || "N/A"
    ]);


    var invSheet = ss.getSheetByName("Inventario"); //busca la pestaña inventario
    if (!invSheet) { //si la pestaña inventario no existe
      invSheet = ss.insertSheet("Inventario"); //crea la pestaña
      invSheet.appendRow(["Device ID","Ultima Conexion","IP","RSSI","Estado"]); //escribe titulos de las columnas
    }

    var datos = invSheet.getDataRange().getValues(); //se guarda en esta variable el rango desde 0 hasta terminar y se obtienen los valores de ese rango
    // es decir es una matriz un array con arrays internos
    var encontrado = false; //esta variable se usa para poner en vacio la que guarda la descripcion del equipo en este caso un ESP32 pero serian las maquinas o dispositivos a monitorear

    for (var i = 1; i < datos.length; i++) { //se empieza en la fila 1 por que 0 es titulos en sheets de google, se revisa el largo del inventario, salta siguiente fila
      if (datos[i][0] == data.device_id) { //mira la Columna A indice 0 de la fila actual i ademas Compara ese texto con el ID que acaba de enviar el ESP32
        invSheet.getRange(i+1,2).setValue(new Date()); //por el titulo se debe poner en la siguiente fila por eso i+1 en todos, 2 equivale a columna b ultima conexion
        invSheet.getRange(i+1,3).setValue(data.payload.ip   || "N/A"); // 3 equivale a columna C IP
        invSheet.getRange(i+1,4).setValue(data.payload.rssi || 0); // 4 equivale a columna D RSSI estado de la conexion fuerte,debil, etc
        invSheet.getRange(i+1,5).setValue("ONLINE"); // 5 equivale a columna E estado del dispositivo o maquina ONLINE, OFFLINE, ALARM, etc
        encontrado = true; // cambia la variable a TRue para confirmar que la informacion se encontro
        break; //Rompe el CredentialsContainer, por que si ya se encontro el dispositivo o maquina es ineficiente seguir en la busqueda
      }
    }

    if (!encontrado) { //Si la variable al finalizar el for anterior no encontro el dispositivo, sigue en false y
      // si aqui es verdadero con la negacion se ejecuta, es decir solo se ejecuta si el dispositivo o maquina no se encontro
      invSheet.appendRow([ //se agrega a la fila en cada columna los datos del nuevo dispositivo
        data.device_id    || "UNKNOWN", //Se agrega a cada fila el valor del nuevo dispositivo o maquina si no se pone el valor por defecto para evitar errores ocultos
        new Date(),         //para la columna ultima conexion se ejecuta esta funcion siempre no necesita alternativa a null
        data.payload.ip   || "N/A",
        data.payload.rssi || 0,
        "ONLINE"            //Si se encontro obviamente esta en linea, si no estaria apagado
      ]);
    }

    return ContentService //funcion que devuelve respuesta a la maquina o dispositivo, para que sepa que el mensaje se recibio en el backend bien
      .createTextOutput(JSON.stringify({status:"success"})) // se envia un texto en formato JSON con la palabra SUCCESS, aunque
      // no se lee en el sketch.ino es util para la version 2 en escalabilidad
      .setMimeType(ContentService.MimeType.JSON); //Content-Type o MIME Type  Define el encabezado Header de la respuesta como JSON
      // Esto le indica al ESP32 que el contenido es un dato estructurado y no una pagina web.

      //los metodos .createTextOutput y .setMimeType son del objeto ContentService y este es propio de app Scripts

  } catch(error) { //segunda funcion de manejo actua con try esta se dispara si hay errores
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet(); // se direcciona al sheet de google esta app se creo desde esa hoja por defecto apunta a ella
      var logSheet = ss.getSheetByName("Logs") || ss.insertSheet("Logs"); // Busca la pestaña Logs, si no existe, la crea con insertSheet
      logSheet.appendRow([new Date(), "ERROR", error.toString()]); // Agrega el error a la variable logSheet y pone la hora y fecha el error en 
      // formato string y lo agrega a una nueva fila en la hoja de calculo
    } catch(e){} // Silent catch Si falla el registro en la hoja de Logs, se ignora el error
      // Esto evita un bucle infinito y asegura que el servidor siempre responda al ESP32

    return ContentService
      .createTextOutput(JSON.stringify({status:"error",message:error.toString()})) // Retorno de contingencia Informa al ESP32 que la operación fallo
      .setMimeType(ContentService.MimeType.JSON); // y envia el detalle tecnico del error en formato JSON, es decir envia una respuesta de error
  }
}
