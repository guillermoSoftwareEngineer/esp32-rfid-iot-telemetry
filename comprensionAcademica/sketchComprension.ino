//VERSION COMPRENSION COMPLETA

//Librerias de funcionamiento general

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>

  
// CONFIGURACIÓN
  
#define FIRMWARE_VERSION "1.0.0" //para cambio de firware en actualizaciones nivel profesional

const char* WIFI_SSID     = "Wokwi-GUEST"; //nombre publico de la red wifi en wokwi la red simulada se llama "Wokwi-GUEST"
const char* WIFI_PASSWORD = ""; // "Wokwi-GUEST" no tiene una clave, una red real si la tendria
const char* DEVICE_ID     = "GTech-ESP32-001"; // numero de serie de el equipo a monitorear o que se le da nombre ID
const char* BACKEND_URL = "https://script.google.com/macros/s/AKfycbzEMIsm5Rp30PZVPamPe43E4wfETraQNPLswf8ahRPsL-L7RTjkw0FA-mMwkluCq3Ch/exec";
//url del servidor backen creado en Google Apps Script (guarda datos en google sheets a futuro en DB)

  
// PINES

#define PIN_LED_VERDE  26
#define PIN_LED_ROJO   27
#define PIN_BUZZER     25
#define PIN_BOTON      13
#define PIN_RFID_SS     5
#define PIN_RFID_RST    4

  
// OBJETOS

// creacion de objetos con protocolos diferentes I2C y SPI

LiquidCrystal_I2C lcd(0x27, 16, 2); // direccion de componente I2C, filas y columnas)
MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST); // SS chip select Cuando el ESP32 pone el pin SS de un dispositivo en LOW:
// dispositivo se activa y Los demás ignoran la comunicación.

  
// VARIABLES

//en IoT existen los hertbeat periodos de tiempo que reportan conexion cada cierto tiempo
//pueden haber desconexiones accidentales

unsigned long ultimoHeartbeat = 0; //lleva el tiempo de encendido no negativo y bastante largo long
const unsigned long INTERVALO_HEARTBEAT = 30000; // aqui se configura el tiempo de intervalo de señal de envio de el ultimo heartbeat

  
// TARJETAS AUTORIZADAS
// Aqui en este objeto se guardan lo sUID autorizados (UID) unique identificator
String tarjetasAutorizadas[] = { //pequeña base de datos, migrar a DB profesional en version 2
  "A1B2C3D4",
  "E5F6G7H8",
  "12345678"
};
const int totalTarjetas = sizeof(tarjetasAutorizadas) / sizeof(tarjetasAutorizadas[0]); //Total de tarjetas de UID en el sistema que
// se actualizan la cantidad de tarjetas de forma automatica 

// En este punto es importante Implementan arquitectura híbrida. ya que si se cae 
// internet él sistema se bloquea pero si además usamos él objeto en él firmware, 
// este acceso no seria problema en ausencia de internet.  implementar een version 2

    
// SETUP
    

void setup() {
  Serial.begin(115200); //velocidad de comunicacion
  randomSeed(analogRead(0)); //generacion numeros aleatorios (pin al aire garantiza aleatoridad real)

  pinMode(PIN_LED_VERDE, OUTPUT); // configuracion entrada y salida d epines 
  pinMode(PIN_LED_ROJO,  OUTPUT);
  pinMode(PIN_BUZZER,    OUTPUT);
  pinMode(PIN_BOTON,     INPUT_PULLUP); //pull up para evitar rebotes

  // Inicilizacion pantall a LCD

  Wire.begin(21, 22); //inicializacion protocolo I2C indica a esp32 cual pin va a SDA y SCL del LCD (funcion definida dentro de la biblioteca Wire.h)
  // begin(SDA, SCL)
  lcd.init(); // inicializacion del LCD
  lcd.backlight(); //Inicializacion de la luz de backlight

  SPI.begin(); //funcion de reinicio del chip de cerebro del MFRC522
  // SPI.begin(); en esta version de ESP32 se activan por defecto estos pines asi:
  // MOSI	23
  // MISO	19
  // SCK	18
  // SS no es fijo se debe programar un pin (aunque es posible reasignarlos)
  rfid.PCD_Init(); //comando de inicio incluido en la libreria #include <MFRC522.h>

  mostrarMensaje("GTech Access", "Starting...");//cambio de nombre por que quiero que sea aplicable a mi portafolio y no solo a buk
  delay(1500);

  conectarWiFi(); //ejecuta la funcion que dispara eventos visuales en el circuito, 
  // para que se vea que la conexion se realizó  
}

    
// LOOP
    

void loop() {

  //condicional de revision si hay o no wifi
  if (WiFi.status() != WL_CONNECTED) {
    manejarSinWiFi(); //si no hay wi fi se dispara la funcion
    return;
  }

  // Si si hay conexion de wifi, se continua

  digitalWrite(PIN_LED_VERDE, HIGH); //Se enciende LED verde 
  digitalWrite(PIN_LED_ROJO, LOW); //Se apaga el LED rojo

  if (millis() - ultimoHeartbeat > INTERVALO_HEARTBEAT) { //Aqui se usan las variables del heartbeat
    enviarHeartbeat();
    ultimoHeartbeat = millis(); // Actualiza la variable ultimoHeartbeat al tiempo actual si no el algoritmo no seria finito
  }

  //Se lee el pin de conexion del boton

  if (digitalRead(PIN_BOTON) == LOW) {
    modoDiagnostico(); //se ejecuta la funcion de diagnostico
    delay(300);
  }

  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {// funciones de la libreria #include <MFRC522.h> que revisan si la tarjeta
  // que revisan si Si hay una tarjeta nueva y si tambien se pudo leer correctamente su serial
    procesarTarjeta(); //ejecuta la funcion que es la mas compleja tal ves  del codigo
    rfid.PICC_HaltA();//funcion propia de la libreria que indica terminar la comunicacion actual
  }

  lcd.setCursor(0, 0);
  lcd.print("GTech-READY       "); //se usan esos espacios por que la LCD no borra lo anterior escrito
  // asi que es posible que sse sobreescriba la palabra
  lcd.setCursor(0, 1);
  lcd.print("Acerque tarjeta ");
}

    
// WIFI
    

void conectarWiFi() {
  mostrarMensaje("Conectando WiFi", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    digitalWrite(PIN_LED_ROJO, !digitalRead(PIN_LED_ROJO)); //invierte usando NOT como en electronica 
  }

  digitalWrite(PIN_LED_VERDE, HIGH);
  digitalWrite(PIN_LED_ROJO, LOW);

  mostrarMensaje("WiFi OK!", WiFi.localIP().toString());
  delay(1500);
}

void manejarSinWiFi() { //cuando no hay conexion wifi  se ejecuta esta funcion
  mostrarMensaje("SIN CONEXION", "Reconectando...");
  digitalWrite(PIN_LED_VERDE, LOW);
  digitalWrite(PIN_LED_ROJO, !digitalRead(PIN_LED_ROJO));
  delay(500);
  WiFi.reconnect(); //Intenta reconectarse y viene de la libreria #include <WiFi.h>
}

    
// RFID
    

void procesarTarjeta() {

// Lectura UID identificaddor unico de tarjeta 

  String idTarjeta = "";  //crea variable vacia
  for (byte i = 0; i < rfid.uid.size; i++) { // se recorren los UIDs
    if (rfid.uid.uidByte[i] < 0x10) idTarjeta += "0";
    // aqui se leen numeros hexadecimales, pero como algunos solo tienen 1 digito se debe poner el 0 asi
    // 0x0A es decir antes eso se garantiza en la siguiente linea
    idTarjeta += String(rfid.uid.uidByte[i], HEX); //se hace un casting no exactamentepero si similar, para convertir a hexadecimal
  }
  idTarjeta.toUpperCase(); //pone todo el codigo en mayusculas 

  bool autorizada = verificarTarjeta(idTarjeta); //Se crea una variable booleana que se evalua en la funcion  verificarTarjeta(idTarjeta)

  if (autorizada) { //Se evalua si la variable autorizada es True o false
    beepCorto();
    mostrarMensaje("ACCESO OK", idTarjeta);
    enviarEvento("CARD_SCAN", // Nombre del evento tarjeta leida
                 "\"card_id\":\"" + idTarjeta + "\",\"status\":\"success\""); //envio de mensaje a servidor creacion de json nuevo
  } else {
    beepLargo();
    mostrarMensaje("ACCESO DENEGADO", idTarjeta);
    enviarEvento("CARD_SCAN",  // Nombre del evento intento de entrada fallido
                 "\"card_id\":\"" + idTarjeta + "\",\"status\":\"unauthorized\"");//envio de mensaje a servidor creacion de json nuevo
  }

  delay(1500);
}

// funcion que se carga en la variable booleana creada nateriormente

bool verificarTarjeta(String id) { //se crea una funcion que retorna un valor booleano
  for (int i = 0; i < totalTarjetas; i++) {// se evaluan todas sin llegar al total de tarjetas recordar la variable int totalTarjetas se ajusto en 3 anteriormente
    if (tarjetasAutorizadas[i] == id) return true; //si el id es igual al de la base de datos en tarjetasAutorizadas 
    // entonces retorna true
  }
  return false;//si no retorna false
}

    
// EVENTOS 
    
//genera IDs  de eventos con numeros diferentes partiendo de la secuencia random definida anteriormente
// con randomSeed(analogRead(0)); hace que se inicie en un numero aleatorio seed (semilla) en la funcion random()

String generarEventID() {
  return String(random(100000, 999999)) + "-" + String(millis()); //luego se concatena con el numero con los ms que lleva encendido el ESP32
}

void enviarEvento(String tipoEvento, String payloadExtra) { //Void = no retorna nada String tipoEvento y String payloadExtra se crean al llamarse esta funcion

  //COMPROBACION DE WIFI CORRECTO ANTES DE ENVIAR JSON
  if (WiFi.status() != WL_CONNECTED) return; //pregunta por el estado de la conexion wifi WL_CONNECTED retorna un tipo de dato dependiendo 
  // del estado del wifi hace parte de la libreria #include <WiFi.h>

  HTTPClient http; //se crea el objeto de comunicacion HTTP
  http.begin(BACKEND_URL); //Se indica la URL de conexion del servidor ubicacion del servidor
  http.addHeader("Content-Type", "application/json"); //indicacion de encabezado de mensaje etiqueta el envio de JSON

  //En cada evento de envio se crean todas las claves a continuacion si se ejecutan esas funciones
  //proximas versiones mejor usar arduino JSON

  String json = "{"; //de aqui en adelante se ejecuta la funcion mensionada y se concatena para el envio en el objeto    JSON
  json += "\"event_id\":\"" + generarEventID() + "\","; // ID unico del evento generado por el dispositivo.
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";// ID unico del evento generado por el dispositivo.
  json += "\"event_type\":\"" + tipoEvento + "\","; // Tipo de evento que ocurrio HEARTBEAT, CARD_SCAN, DIAGNOSTIC_RESPONSE
  json += "\"timestamp\":" + String(millis()/1000) + ","; //Marca de tiempo del evento.
  json += "\"firmware_version\":\"" FIRMWARE_VERSION "\","; //Versión del firmware instalado en el dispositivo.
  json += "\"payload\":{";
  json += payloadExtra + ","; // Informacion especifica del evento como status o card_id
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\","; // Dirección IP local del dispositivo dentro de la red.
  json += "\"rssi\":" + String(WiFi.RSSI()) + ","; //RSSI (Received Signal Strength Indicator) o intensidad de wifi mientras mas cerca a 0 mejor como el factor de potencia a 1
  json += "\"uptime\":" + String(millis()/1000); // Tiempo total que el dispositivo lleva encendido en IoT se le llama uptime
  json += "}";
  json += "}";

  // ENVIO DE POST ATRAVES DE HTTP 

  int codigo = http.POST(json);
  Serial.println("Evento enviado. Codigo: " + String(codigo)); // EVENTO 404 400 o 202 segun protocolo htttp
  http.end();
}

void enviarHeartbeat() {
  enviarEvento("HEARTBEAT", "\"status\":\"alive\""); // la funcion enviarEvento construye el mensaje 
  // en json donde donde se informe de que status es alive vivo  para enviar por http
}

    
// DIAGNOSTICO
    

void modoDiagnostico() { //funcion de ejecucion del modo diagnostico

  mostrarMensaje("DIAGNOSTICO", WiFi.localIP().toString()); // WiFi.localIP() obtiene la IP del ESP32 dentro de la red WiFi
  delay(2000);

  enviarEvento("DIAGNOSTIC_RESPONSE",
               "\"free_heap\":" + String(ESP.getFreeHeap())); //ESP.getFreeHeap() Esto pregunta cuanta memoria RAM libre tiene el ESP32.

  beepCorto();
}

    
// UTILIDADES
    
// creacion de la funcion para inicio del cursor y escritura en el LCD

void mostrarMensaje(String l1, String l2) {
  lcd.clear();
  lcd.setCursor(0, 0); //Limpia pantalla
  lcd.print(l1.substring(0, 16)); // escribe linea 1
  lcd.setCursor(0, 1); //salto de linea
  lcd.print(l2.substring(0, 16)); // escribe linea 2
}

void beepCorto() { //
  tone(PIN_BUZZER, 1000, 150); //tone(pin, frecuencia, duracion) FUNCION DEL CORE DE esp32
  delay(200);
}

void beepLargo() {
  tone(PIN_BUZZER, 400, 800); //tone(pin, frecuencia, duracion) FUNCION DEL CORE DE esp32
  delay(900);
}