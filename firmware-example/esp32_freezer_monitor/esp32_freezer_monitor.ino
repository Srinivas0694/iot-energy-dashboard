/*
 * ESP32 Freezer Power Monitor  ->  IoT Energy Dashboard
 * ---------------------------------------------------------------
 * Reads a PZEM-004T v3.0 energy meter, shows the values on an
 * ILI9341 TFT (unchanged from your working sketch), AND streams
 * every reading to the dashboard:  POST /api/device-data
 *
 * Wiring is identical to your existing setup. The only new part is
 * WiFi + an HTTP POST. Fill in the CONFIG block below and flash.
 *
 * Libraries (Library Manager):
 *   - Adafruit GFX Library
 *   - Adafruit ILI9341
 *   - PZEM004Tv30   (by Jakub Mandula)
 *   (WiFi / HTTPClient / WiFiClientSecure ship with the ESP32 core)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <PZEM004Tv30.h>

// ===================== CONFIG -- EDIT THESE =====================
const char* WIFI_SSID = "Awfis-Temp";
const char* WIFI_PASS = "Awfis#2025#";

// Where the dashboard is running:
//  - Local test:  "http://192.168.1.50:3000/api/device-data"  (your PC's LAN IP)
//  - Deployed:    "https://your-app.vercel.app/api/device-data"
const char* SERVER    = "http://192.168.1.22:3000/api/device-data";

// true if SERVER starts with https:// (Vercel). false for http:// (local PC).
#define USE_HTTPS false

// Must match DEVICE_API_KEY in the dashboard's .env. Leave "" if you left it blank.
const char* API_KEY   = "sentiantalprivatelimited";

// Shows up as the device on the dashboard. Any unique string.
const char* DEVICE_ID = "DEVICE001";
// ==============================================================

// TFT Pins
#define TFT_CS    5
#define TFT_DC    2
#define TFT_RST   4
#define TFT_LED   22

// PZEM UART pins (ESP32 hardware Serial2)
#define PZEM_RX   16   // ESP32 RX2 <- PZEM TX
#define PZEM_TX   17   // ESP32 TX2 -> PZEM RX

Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);
PZEM004Tv30 pzem(Serial2, PZEM_RX, PZEM_TX);

unsigned long lastRead = 0;
unsigned long lastPost = 0;
const unsigned long readInterval = 2000;   // update TFT every 2 s
const unsigned long postInterval = 5000;   // POST to dashboard every 5 s

// last good values (posted on the POST cadence)
float vNow = NAN, iNow = NAN, pNow = NAN, eNow = NAN;

void setup() {
  Serial.begin(115200);

  pinMode(TFT_LED, OUTPUT);
  digitalWrite(TFT_LED, HIGH);
  tft.begin();
  tft.setRotation(1);
  tft.fillScreen(ILI9341_BLACK);
  drawStaticLabels();

  connectWiFi();
}

void loop() {
  unsigned long now = millis();

  if (now - lastRead >= readInterval) {
    lastRead = now;
    readAndDisplay();
  }

  if (now - lastPost >= postInterval) {
    lastPost = now;
    if (!isnan(vNow)) {
      postReading(vNow, iNow, pNow, eNow);
    }
  }
}

// ---------- WiFi ----------
void connectWiFi() {
  tft.fillRect(10, 205, 310, 30, ILI9341_BLACK);
  tft.setTextSize(1);
  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor(10, 210);
  tft.print("WiFi: connecting...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(400);
    Serial.print(".");
  }

  tft.fillRect(10, 205, 310, 30, ILI9341_BLACK);
  tft.setCursor(10, 210);
  if (WiFi.status() == WL_CONNECTED) {
    tft.setTextColor(ILI9341_GREEN);
    tft.print("WiFi OK  ");
    tft.print(WiFi.localIP());
    Serial.print("\nWiFi connected: ");
    Serial.println(WiFi.localIP());
  } else {
    tft.setTextColor(ILI9341_RED);
    tft.print("WiFi FAILED - check credentials");
    Serial.println("\nWiFi connect failed");
  }
}

// ---------- Static labels (your original layout) ----------
void drawStaticLabels() {
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor(10, 10);
  tft.println("Freezer Power Monitor");

  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(10, 50);  tft.print("Voltage:");
  tft.setCursor(10, 90);  tft.print("Current:");
  tft.setCursor(10, 130); tft.print("Power  :");
  tft.setCursor(10, 170); tft.print("Energy :");
}

// ---------- Read PZEM + update TFT (your original logic) ----------
void readAndDisplay() {
  float voltage = pzem.voltage();
  float current = pzem.current();
  float power   = pzem.power();
  float energy  = pzem.energy();

  if (isnan(voltage)) {
    tft.fillRect(150, 50, 170, 140, ILI9341_BLACK);
    tft.setCursor(150, 50);
    tft.setTextColor(ILI9341_RED);
    tft.setTextSize(2);
    tft.print("No Reading");
    Serial.println("PZEM read error - check wiring");
    vNow = NAN;                 // don't POST stale/invalid data
    return;
  }

  // cache latest good values for the POST task
  vNow = voltage; iNow = current; pNow = power; eNow = energy;

  tft.fillRect(150, 50, 170, 140, ILI9341_BLACK);   // clear old numbers
  tft.setTextColor(ILI9341_YELLOW);
  tft.setTextSize(2);
  tft.setCursor(150, 50);  tft.print(voltage, 1); tft.print(" V");
  tft.setCursor(150, 90);  tft.print(current, 2); tft.print(" A");
  tft.setCursor(150, 130); tft.print(power, 1);   tft.print(" W");
  tft.setCursor(150, 170); tft.print(energy, 3);  tft.print(" kWh");

  Serial.printf("V=%.1f  I=%.2f  P=%.1f  E=%.3f\n", voltage, current, power, energy);
}

// ---------- POST one reading to the dashboard ----------
void postReading(float voltage, float current, float power, float energy) {
  if (WiFi.status() != WL_CONNECTED) {
    showPostStatus("WiFi lost", ILI9341_RED);
    connectWiFi();
    return;
  }

  HTTPClient http;

#if USE_HTTPS
  WiFiClientSecure client;
  client.setInsecure();               // skip cert validation (fine for this use)
  http.begin(client, SERVER);
#else
  WiFiClient client;
  http.begin(client, SERVER);
#endif

  http.addHeader("Content-Type", "application/json");
  if (strlen(API_KEY) > 0) http.addHeader("x-api-key", API_KEY);

  String body = "{";
  body += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  body += "\"voltage\":" + String(voltage, 2) + ",";
  body += "\"current\":" + String(current, 3) + ",";
  body += "\"power\":"   + String(power, 2)   + ",";
  body += "\"energy\":"  + String(energy, 3);
  body += "}";

  int code = http.POST(body);
  http.end();

  Serial.printf("POST -> %d\n", code);
  if (code == 200 || code == 201) {
    showPostStatus("Dashboard OK", ILI9341_GREEN);
  } else {
    showPostStatus("POST err " + String(code), ILI9341_ORANGE);
  }
}

// ---------- Small status line at the bottom of the TFT ----------
void showPostStatus(String msg, uint16_t color) {
  tft.fillRect(10, 205, 310, 30, ILI9341_BLACK);
  tft.setTextSize(1);
  tft.setTextColor(color);
  tft.setCursor(10, 210);
  tft.print("Net: ");
  tft.print(msg);
  if (WiFi.status() == WL_CONNECTED) {
    tft.print("  IP ");
    tft.print(WiFi.localIP());
  }
}
