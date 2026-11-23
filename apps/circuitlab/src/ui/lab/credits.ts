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
  { name: 'three.js', url: 'https://threejs.org', licence: 'MIT', what: '3D rendering.' },
  { name: 'three-gpu-pathtracer', url: 'https://github.com/gkjohnson/three-gpu-pathtracer', licence: 'MIT', what: 'The path-traced Studio render mode.' },
  { name: 'three-mesh-bvh', url: 'https://github.com/gkjohnson/three-mesh-bvh', licence: 'MIT', what: 'Fast ray casting for the path tracer.' },
  { name: 'React, zustand', url: 'https://react.dev', licence: 'MIT', what: 'The interface.' },
  { name: 'Studio Small 03 HDRI (Poly Haven)', url: 'https://polyhaven.com/a/studio_small_03', licence: 'CC0', what: 'Studio lighting for the Enhanced and Studio modes.' },
  { name: 'Arduino AVR core, Servo, Wire, DHT, Adafruit GFX / SSD1306', url: 'https://github.com/arduino/ArduinoCore-avr', licence: 'LGPL-2.1 / MIT / BSD (inside the compiler package)', what: 'The libraries compiled sketches link against.' },
]
