#pragma once
// Hilfsfunktionen fuer das "Heizungs Display Uebersicht Touch"
// Farben und Darstellung wie beim Display Buderus
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <string>

namespace hz {

static const uint32_t GRUEN = 0x00FF00;
static const uint32_t ROT = 0xFF0000;
static const uint32_t GRAU = 0x8C8C8C;
static const uint32_t WEISS = 0xFFFFFF;
static const uint32_t ORANGE = 0xFF8C00;
static const uint32_t GELB = 0xFFFF00;

// Zahl mit Format in ein Label schreiben, "--" wenn HA keinen Wert liefert
inline void num(lv_obj_t *l, float v, const char *fmt) {
  char b[40];
  if (std::isnan(v)) {
    snprintf(b, sizeof(b), "--");
  } else {
    snprintf(b, sizeof(b), fmt, v);
  }
  lv_label_set_text(l, b);
}

// Text und Farbe setzen
inline void txt(lv_obj_t *l, const char *t, uint32_t farbe) {
  lv_label_set_text(l, t);
  lv_obj_set_style_text_color(l, lv_color_hex(farbe), 0);
}

// Zustand eines HA-Schalters: 1 = an, 0 = aus, -1 = unbekannt / nicht verfuegbar
inline int zustand(const std::string &s) {
  if (s == "on") return 1;
  if (s == "off") return 0;
  return -1;
}

// EIN gruen / AUS rot / -- grau
inline void ein_aus(lv_obj_t *l, int z, const char *an = "EIN", const char *aus = "AUS") {
  if (z == 1) {
    txt(l, an, GRUEN);
  } else if (z == 0) {
    txt(l, aus, ROT);
  } else {
    txt(l, "--", GRAU);
  }
}

// Schaltknopf: Rahmen und Zustandstext in derselben Farbe
inline void knopf(lv_obj_t *b, lv_obj_t *l, int z) {
  uint32_t c = z == 1 ? GRUEN : (z == 0 ? ROT : GRAU);
  lv_obj_set_style_border_color(b, lv_color_hex(c), 0);
  ein_aus(l, z);
}

// Temperatur -> Farbe wie beim Puffer am Display Buderus: bis 30 Grad blau, ab 70 Grad rot
inline lv_color_t temp_farbe(float t) {
  float f = std::isnan(t) ? 0.0f : std::max(0.0f, std::min(1.0f, (t - 30.0f) / 40.0f));
  return lv_color_make((uint8_t) (40 + 215 * f), (uint8_t) (70 * (1 - f) + 30 * f), (uint8_t) (255 * (1 - f)));
}

}  // namespace hz
