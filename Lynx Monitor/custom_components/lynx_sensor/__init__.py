import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components import i2c, binary_sensor
from esphome.const import CONF_ID

DEPENDENCIES = ["i2c"]
AUTO_LOAD = ["binary_sensor"]

lynx_sensor_ns = cg.esphome_ns.namespace("lynx_sensor")
LynxSensor = lynx_sensor_ns.class_("LynxSensor", cg.PollingComponent, i2c.I2CDevice)

CONFIG_SCHEMA = cv.Schema({
    cv.GenerateID(): cv.declare_id(LynxSensor),
}).extend(cv.polling_component_schema("5s")).extend(i2c.i2c_device_schema(0x08))  # 👈 wichtig!

async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    await i2c.register_i2c_device(var, config)
