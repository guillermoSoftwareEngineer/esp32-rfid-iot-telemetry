// librerias de red protocolo y dispositivos

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include "secrets.h"


// Version del firmware del dispositivo

#define FIRMWARE_VERSION "1.0.0"


// configuracion de red del dispositivo en wokwi por defecto tiene esos valores
//para una red real se usan las claves reales y se deben guardar como variables 
// en el git ignore por seguridad

const char* WIFI_SSID     = "Wokwi-GUEST"; //por defecto
const char* WIFI_PASSWORD = ""; //por defecto

// identificador unico del dispositivo dentro del sistema o serie maquina

const char* DEVICE_ID     = "GTech-ESP32-001"; 

// endpoint donde el dispositivo reporta eventos al backend URL del servidor

#include "secrets.h"

const char* BACKEND_URL = BACKEND_URL_SECRET; // aqui se usa el id del app script
//Aqui se usa una variable, para no revelar la conexion con el backend

// asignacion de pines usados por el hardware

#define PIN_LED_VERDE  26
#define PIN_LED_ROJO   27
#define PIN_BUZZER     25
#define PIN_BOTON      13
#define PIN_RFID_SS     5
#define PIN_RFID_RST    4


// objetos hardware creados a partir de sus respectivas librerias

// LCD conectado por bus I2C

LiquidCrystal_I2C lcd(0x27, 16, 2);

// lector RFID conectado por bus SPI

MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);


// variables de estado del sistema

// en IoT es comun enviar señales periodicas llamadas heartbeat
// estas indican al servidor que el dispositivo sigue vivo

unsigned long ultimoHeartbeat = 0;

// intervalo en milisegundos para envio de heartbeat

const unsigned long INTERVALO_HEARTBEAT = 30000;


// pequeña base de datos local de tarjetas autorizadas

// permite que el sistema siga funcionando aun si se pierde internet

String tarjetasAutorizadas[] = { 
  "A1B2C3D4",
  "E5F6G7H8",
  "12345678",
  "01020304" // probar acceso autorizado y denegado
};


// calculo automatico de cantidad de tarjetas almacenadas

const int totalTarjetas = sizeof(tarjetasAutorizadas) / sizeof(tarjetasAutorizadas[0]);


// inicializacion general del dispositivo

void setup() {

  Serial.begin(115200);

  // se usa un pin analogico flotante para generar entropia
  // esto mejora la aleatoriedad usada al crear IDs de evento

  randomSeed(analogRead(0));

  // configuracion de pines

  pinMode(PIN_LED_VERDE, OUTPUT);
  pinMode(PIN_LED_ROJO,  OUTPUT);
  pinMode(PIN_BUZZER,    OUTPUT);
  pinMode(PIN_BOTON,     INPUT_PULLUP);

  // inicializacion bus I2C usado por el LCD

  Wire.begin(21, 22);

  lcd.init();
  lcd.backlight();

  // inicializacion bus SPI usado por lector RFID

  SPI.begin();
  rfid.PCD_Init();

  mostrarMensaje("GTech Access", "Starting...");
  delay(1500);

  // intento inicial de conexion a red

  conectarWiFi();
}


// loop principal del firmware

void loop() {

  // si no hay conexion WiFi se ejecuta rutina de reconexion

  if (WiFi.status() != WL_CONNECTED) {
    manejarSinWiFi();
    return;
  }

  // estado visual normal del sistema

  digitalWrite(PIN_LED_VERDE, HIGH);
  digitalWrite(PIN_LED_ROJO, LOW);

  // envio periodico de heartbeat al backend

  if (millis() - ultimoHeartbeat > INTERVALO_HEARTBEAT) {
    enviarHeartbeat();
    ultimoHeartbeat = millis();
  }

  // lectura de boton para modo diagnostico

  if (digitalRead(PIN_BOTON) == LOW) {
    modoDiagnostico();
    delay(300);
  }

  // deteccion de nueva tarjeta RFID y lectura de su UID

  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {

    procesarTarjeta();

    // termina comunicacion actual con la tarjeta

    rfid.PICC_HaltA();
  }

  // mensaje de espera en pantalla

  lcd.setCursor(0, 0);
  lcd.print("GTech-READY       ");

  lcd.setCursor(0, 1);
  lcd.print("Acerque tarjeta ");
}


// intenta conectar el dispositivo a la red WiFi configurada

void conectarWiFi() {

  mostrarMensaje("Conectando WiFi", WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // mientras no haya conexion se hace parpadear LED rojo

  while (WiFi.status() != WL_CONNECTED) {

    delay(500);

    digitalWrite(PIN_LED_ROJO, !digitalRead(PIN_LED_ROJO));
  }

  digitalWrite(PIN_LED_VERDE, HIGH);
  digitalWrite(PIN_LED_ROJO, LOW);

  mostrarMensaje("WiFi OK!", WiFi.localIP().toString());

  delay(1500);
}


// rutina ejecutada cuando el dispositivo pierde conexion

void manejarSinWiFi() {

  mostrarMensaje("SIN CONEXION", "Reconectando...");

  digitalWrite(PIN_LED_VERDE, LOW);

  digitalWrite(PIN_LED_ROJO, !digitalRead(PIN_LED_ROJO));

  delay(500);

  // intento de reconexion usando API de la libreria WiFi

  WiFi.reconnect();
}


// procesa una tarjeta RFID detectada por el lector

void procesarTarjeta() {

  // conversion del UID de bytes a string hexadecimal

  String idTarjeta = "";

  for (byte i = 0; i < rfid.uid.size; i++) {

    if (rfid.uid.uidByte[i] < 0x10) idTarjeta += "0";

    idTarjeta += String(rfid.uid.uidByte[i], HEX);
  }

  idTarjeta.toUpperCase();

  // verificacion contra base de datos local

  bool autorizada = verificarTarjeta(idTarjeta);

  if (autorizada) {

    beepCorto();

    mostrarMensaje("ACCESO OK", idTarjeta);

    enviarEvento(
      "CARD_SCAN",
      "\"card_id\":\"" + idTarjeta + "\",\"status\":\"success\""
    );

  } 
  else {

    beepLargo();

    mostrarMensaje("ACCESO DENEGADO", idTarjeta);

    enviarEvento(
      "CARD_SCAN",
      "\"card_id\":\"" + idTarjeta + "\",\"status\":\"unauthorized\""
    );
  }

  delay(1500);
}


// busca el UID de la tarjeta dentro del arreglo de autorizadas

bool verificarTarjeta(String id) {

  for (int i = 0; i < totalTarjetas; i++) {

    if (tarjetasAutorizadas[i] == id) return true;
  }

  return false;
}


// generacion de ID unico para cada evento enviado al backend

String generarEventID() {

  // combinacion de numero aleatorio con tiempo de encendido

  return String(random(100000, 999999)) + "-" + String(millis());
}


// funcion central encargada de enviar eventos al backend

void enviarEvento(String tipoEvento, String payloadExtra) {

  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;

  http.begin(BACKEND_URL);

  http.addHeader("Content-Type", "application/json");

  // construccion manual del JSON enviado al servidor

  String json = "{";

  json += "\"event_id\":\"" + generarEventID() + "\",";

  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";

  json += "\"event_type\":\"" + tipoEvento + "\",";

  json += "\"timestamp\":" + String(millis()/1000) + ",";

  json += "\"firmware_version\":\"" FIRMWARE_VERSION "\",";

  json += "\"payload\":{";

  json += payloadExtra + ",";

  // informacion de diagnostico util para monitoreo remoto

  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";

  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";

  json += "\"uptime\":" + String(millis()/1000);

  json += "}";

  json += "}";

  int codigo = http.POST(json);

  Serial.println("Evento enviado. Codigo: " + String(codigo));

  http.end();
}


// envio periodico de señal de vida del dispositivo

void enviarHeartbeat() {

  enviarEvento("HEARTBEAT", "\"status\":\"alive\"");
}


// modo de diagnostico activado mediante boton

void modoDiagnostico() {

  mostrarMensaje("DIAGNOSTICO", WiFi.localIP().toString());

  delay(2000);

  // reporte de memoria libre del sistema

  enviarEvento(
    "DIAGNOSTIC_RESPONSE",
    "\"free_heap\":" + String(ESP.getFreeHeap())
  );

  beepCorto();
}


// funcion utilitaria para mostrar texto en el LCD

void mostrarMensaje(String l1, String l2) {

  lcd.clear();

  lcd.setCursor(0, 0);

  lcd.print(l1.substring(0, 16));

  lcd.setCursor(0, 1);

  lcd.print(l2.substring(0, 16));
}


// sonido corto usado como feedback positivo

void beepCorto() {

  tone(PIN_BUZZER, 1000, 150);

  delay(200);
}


// sonido largo usado como alerta o acceso denegado

void beepLargo() {

  tone(PIN_BUZZER, 400, 800);

  delay(900);
}