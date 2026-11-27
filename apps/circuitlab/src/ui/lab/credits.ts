/** Everything Circuit Lab is built on, shown in the Credits panel (name, link, licence, what for). */
export interface Credit {
  name: string
  url: string
  licence: string
  what: string
}

export const CREDITS: Credit[] = [
  { name: 'ohmlet', url: 'https://github.com/JENW1N/ohmlet', licence: 'MIT', what: 'The base app: 3D breadboards and parts, wire routing, render modes, the MNA circuit solver and behavioural chips.' },
  { name: 'OpenCircuit 3D', url: 'https://github.com/gabrieleviolait/opencircuit', licence: 'MIT', what: 'The microcontroller boards, the fast Arduino runtime, the in-browser compile flow, the LCD / OLED / NeoPixel / servo / sensor helpers and the lesson presets, ported into ohmlet.' },
  { name: 'avr8js (Wokwi)', url: 'https://github.com/wokwi/avr8js', licence: 'MIT', what: 'The ATmega328P emulator that runs compiled sketches on the Uno and Nano.' },
  { name: 'AVR-GCC for WebAssembly (@horang-corp/avr-gcc-wasm)', url: 'https://github.com/horang-corp/avr-gcc-wasm', licence: 'GPL-3.0 toolchain + upstream Arduino / library licences (loaded from the jsDelivr CDN, not bundled)', what: 'Compiles C++ to Intel HEX in your browser.' },
  { name: 'ngspice / ngspice-wasm', url: 'https://ngspice.sourceforge.io', licence: 'BSD-3-Clause (ngspice); package terms apply', what: 'Planned optional SPICE check (OpenCircuit loads it from a CDN; not used by Circuit Lab yet).' },
  { name: 'Arduino Uno / Mega 2560 / Nano reference designs', url: 'https://www.arduino.cc/en/hardware', licence: 'CC BY-SA 2.5', what: 'Inspect board: where every part sits on these boards and what it connects to, read from the official Eagle files.' },
  { name: 'Raspberry Pi Pico design files and datasheet', url: 'https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf', licence: 'Raspberry Pi open design licence; datasheet facts', what: 'Inspect board: the Pico\'s parts, values and power circuit.' },
  { name: 'Espressif ESP32-DevKitC V4 schematic and ESP32 datasheets', url: 'https://dl.espressif.com/dl/schematics/esp32_devkitc_v4_sch.pdf', licence: 'Facts only', what: 'Inspect board: the ESP32 boards\' parts, values and pin functions.' },
  { name: 'three.js', url: 'https://threejs.org', licence: 'MIT', what: '3D rendering.' },
  { name: 'three-gpu-pathtracer', url: 'https://github.com/gkjohnson/three-gpu-pathtracer', licence: 'MIT', what: 'The path-traced Studio render mode.' },
  { name: 'three-mesh-bvh', url: 'https://github.com/gkjohnson/three-mesh-bvh', licence: 'MIT', what: 'Fast ray casting for the path tracer.' },
  { name: 'React, zustand', url: 'https://react.dev', licence: 'MIT', what: 'The interface.' },
  { name: 'Chakra Petch (Cadson Demak) via Fontsource', url: 'https://fontsource.org/fonts/chakra-petch', licence: 'SIL Open Font License 1.1', what: 'The interface type and the labels printed on parts and boards.' },
  { name: 'JetBrains Mono via Fontsource', url: 'https://fontsource.org/fonts/jetbrains-mono', licence: 'SIL Open Font License 1.1', what: 'Values, pin names, code and the scope grid.' },
  { name: 'DSEG7 Classic (keshikan)', url: 'https://github.com/keshikan/DSEG', licence: 'SIL Open Font License 1.1', what: 'The seven-segment LCD digits on the meters and the function generator.' },
  { name: 'Studio Small 03 HDRI (Poly Haven)', url: 'https://polyhaven.com/a/studio_small_03', licence: 'CC0', what: 'Studio lighting for the Enhanced and Studio modes.' },
  { name: 'Arduino AVR core, Servo, Wire, DHT, Adafruit GFX / SSD1306', url: 'https://github.com/arduino/ArduinoCore-avr', licence: 'LGPL-2.1 / MIT / BSD (inside the compiler package)', what: 'The libraries compiled sketches link against.' },
]
