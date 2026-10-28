# ESP-Home-Projekte

Meine [ESPHome](https://esphome.io)-Geräte für Home Assistant – jeweils mit YAML, Anleitung und Verdrahtung bzw. Display-Vorschau.

| Projekt | Hardware | Wofür |
|---|---|---|
| [Heizung Display](Heizung%20Display) | Waveshare ESP32-S3 Touch-LCD 3,5″ | Touch-Display für Ofen, Heizung, Wärmepumpe, Solar und Akkus (LVGL) |
| [Display Buderus](Display%20Buderus) | LILYGO T-Display S3 + 2 Relais | Schaltet Gasheizung und Warmwasser-Zuheizen lokal per Taste, zeigt Temperaturen, Gaskosten und Puffer |
| [Ofen Display Tisch](Ofen%20Display%20Tisch) | Waveshare ESP32-S3 Touch-LCD 1,28″ rund + 3D-Druck-Gehäuse | Zeigt Außen, Feuchte, Puffer, Kamin und Solar-Akku mit bunten Symbolen; antippen = Gasverbrauch und -kosten |
| [Pylontech Batterie System 2](Pylontech%20Batterie%20System%202) | D1 mini + MAX3232 | Liest 10 Pylontech-Module über die Konsole aus |
| [Lynx Monitor](Lynx%20Monitor) | D1 mini | Überwacht die MEGA-Sicherungen von 3 Victron Lynx Distributor (I²C) |
| [BWWP-Steuerung](BWWP-Steuerung) | D1 mini + Servo + BH1750 | Drückt die Taste der Brauchwasser-Wärmepumpe und liest ihre Status-LED |
| [Display Ofen](Display%20Ofen) | D1 mini + OLED SH1106 | Zeigt Außen, Feuchte, Puffer, Kamin und Solar-Akku am Ofen |
| [Test Lilygo 2](Test%20Lilygo%202) | LILYGO T-Display S3 | Farbdisplay mit Außentemperatur und Luftfeuchte |
| [Lichtsensor](Lichtsensor) | D1 mini + GY-302 (BH1750) | Helligkeit in Lux |

Das passende Dashboard für die Victron-Anlage liegt im Repository [HA-Dashboards](https://github.com/ossilampe/HA-Dashboards/tree/main/Solar%20Uebersicht).

**Hinweis:** WLAN-Daten, API-Schlüssel und Passwörter werden per `!secret` aus der eigenen `secrets.yaml` geholt. Wo eine Vorlage dafür nötig ist, liegt sie als `secrets.yaml.example` im Projektordner.
