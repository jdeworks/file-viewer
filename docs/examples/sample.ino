// Arduino Sketch: Temperature Monitor with LED Alert
// Reads temperature from DHT11, displays on Serial, blinks LED if too hot

#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define DHT_PIN 2
#define LED_PIN 13
#define ALERT_TEMP 30
#define SAMPLE_INTERVAL 2000

const int lcdAddr = 0x27;
const int lcdCols = 16;
const int lcdRows = 2;

int readCount = 0;
float lastTemp = 0.0;
bool alertActive = false;

DHT dht(DHT_PIN, DHT11);
LiquidCrystal_I2C lcd(lcdAddr, lcdCols, lcdRows);

void setup() {
    Serial.begin(9600);
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
    dht.begin();
    lcd.init();
    lcd.backlight();
    lcd.print("Temp Monitor");
    delay(1000);
    lcd.clear();
    Serial.println("Temperature Monitor started");
}

void loop() {
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
        Serial.println("Failed to read from DHT sensor");
        delay(SAMPLE_INTERVAL);
        return;
    }

    readCount++;
    lastTemp = temperature;
    displayReading(temperature, humidity);
    checkAlert(temperature);

    Serial.print("Temp: ");
    Serial.print(temperature);
    Serial.print(" C  Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");

    delay(SAMPLE_INTERVAL);
}

void displayReading(float temp, float hum) {
    lcd.setCursor(0, 0);
    lcd.print("Temp: ");
    lcd.print(temp, 1);
    lcd.print(" C  ");
    lcd.setCursor(0, 1);
    lcd.print("Hum:  ");
    lcd.print(hum, 1);
    lcd.print(" %  ");
}

void checkAlert(float temp) {
    if (temp >= ALERT_TEMP) {
        alertActive = true;
        blinkLed(3);
    } else {
        alertActive = false;
        digitalWrite(LED_PIN, LOW);
    }
}

void blinkLed(int times) {
    for (int i = 0; i < times; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(200);
        digitalWrite(LED_PIN, LOW);
        delay(200);
    }
}

float celsiusToFahrenheit(float c) {
    return c * 9.0 / 5.0 + 32.0;
}
