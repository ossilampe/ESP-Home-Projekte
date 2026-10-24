#include "esphome.h"
#include <Wire.h>

namespace esphome {
namespace lynx_sensor {

class LynxSensor : public PollingComponent, public i2c::I2CDevice {
 public:
  // Fuse-Sensoren (je vier pro Distributor)
  binary_sensor::BinarySensor *fuse_a1 = new binary_sensor::BinarySensor();
  binary_sensor::BinarySensor *fuse_a2 = new binary_sensor::BinarySensor();
  binary_sensor::BinarySensor *fuse_a3 = new binary_sensor::BinarySensor();
  binary_sensor::BinarySensor *fuse_a4 = new binary_sensor::BinarySensor();

  binary_sensor::BinarySensor *fuse_b1 = new binary_sensor::BinarySensor();
  binary_sensor::BinarySensor *fuse_b2 = new binary_sensor::BinarySensor();
  binary_sensor::BinarySensor *fuse_b3 = new binary_sensor::BinarySensor();
  binary_sensor::BinarySensor *fuse_b4 = new binary_sensor::BinarySensor();

  binary_sensor::BinarySensor *fuse_c1 = new binary_sensor::BinarySensor();
  binary_sensor::BinarySensor *fuse_c2 = new binary_sensor::BinarySensor();
  binary_sensor::BinarySensor *fuse_c3 = new binary_sensor::BinarySensor();
  binary_sensor::BinarySensor *fuse_c4 = new binary_sensor::BinarySensor();

  LynxSensor() : PollingComponent(5000) {}

  void setup() override {
    Wire.begin();
    ESP_LOGI("lynx", "LynxSensor setup OK");
  }

  void update() override {
    const uint8_t addresses[] = {0x08, 0x09, 0x0A};
    binary_sensor::BinarySensor *targets[3][4] = {
        {fuse_a1, fuse_a2, fuse_a3, fuse_a4},
        {fuse_b1, fuse_b2, fuse_b3, fuse_b4},
        {fuse_c1, fuse_c2, fuse_c3, fuse_c4},
    };

    for (uint8_t idx = 0; idx < 3; idx++) {
      uint8_t addr = addresses[idx];
      uint8_t bytes = Wire.requestFrom((int)addr, 1);
      if (bytes == 1) {
        uint8_t data = Wire.read();
        ESP_LOGI("lynx", "0x%02X -> 0x%02X (bin %c%c%c%c %c%c%c%c)",
                 addr, data,
                 (data & 0x80 ? '1' : '0'), (data & 0x40 ? '1' : '0'),
                 (data & 0x20 ? '1' : '0'), (data & 0x10 ? '1' : '0'),
                 (data & 0x08 ? '1' : '0'), (data & 0x04 ? '1' : '0'),
                 (data & 0x02 ? '1' : '0'), (data & 0x01 ? '1' : '0'));

        // Bits 0x10..0x80 → Sicherungsstatus (1 = defekt, 0 = OK)
        for (int i = 0; i < 4; i++) {
          bool broken = (data & (0x10 << i));
          targets[idx][i]->publish_state(broken);
        }
      } else {
        ESP_LOGW("lynx", "Keine Antwort von 0x%02X", addr);
      }
    }
  }
};

}  // namespace lynx_sensor
}  // namespace esphome
