/**
 * Circuit Lab microcontroller boards: Arduino Uno (R3, R4 Minima / WiFi), Nano,
 * Mega, Leonardo, Micro and Nano ESP32; ESP32 DevKit V1, ESP32-S3-DevKitC-1,
 * ESP32-C3 SuperMini and ESP8266 NodeMCU; Raspberry Pi Pico, Pico W and Pico 2;
 * STM32 Blue Pill, Seeed XIAO SAMD21 and Teensy 4.0.
 *
 * Each board is a catalog part whose pins are its header pins, and a "chip"
 * in the simulator (src/mcu/board-chip.ts): GPIO outputs drive their pins as
 * Norton sources, inputs read node voltages. This file holds the static
 * facts — pin names, header positions, logic level, which pins do PWM/ADC,
 * the Arduino pin numbering and (for the ATmega328P boards) the AVR port map.
 *
 * Plan units: 1 unit = 0.1" (one breadboard pitch). Uno, Mega and ESP32 sit
 * on the bench beside the breadboard (off-board, wired from their headers);
 * Nano and Pico plug into the breadboard and straddle the channel.
 *
 * Header coordinates come from the boards' published drawings (Arduino Uno
 * R3 / Mega 2560 R3 reference designs, DOIT ESP32 DevKit V1, Raspberry Pi
 * Pico datasheet), rounded to the 0.1" grid the headers are built on.
 */

import type { StripRow } from './types'
import { registerOffboardGeometry, type OffboardTerminalGeometry } from './breadboard'

export type BoardRuntime = 'fast' | 'avr'

export interface BoardDef {
  /** catalog type */
  type: string
  label: string
  short: string
  mcu: string
  /** GPIO logic level (V) */
  logicV: number
  /** absolute maximum voltage on a GPIO pin */
  absMaxV: number
  /** absolute maximum current per GPIO pin (mA) */
  maxPinMa: number
  /** header pins in catalog order */
  pins: string[]
  /** pins joined inside the board (duplicate GND / 5V / SDA headers) */
  bridges: [string, string][]
  /** Arduino pin number → header pin name (or an internal pin like 'LED') */
  gpio: Record<number, string>
  /** analog-capable pin name → ADC channel */
  adc: Record<string, number>
  /** analogRead aliases: A0 → pin number */
  analogAlias: Record<string, number>
  adcBits: number
  /** PWM-capable pin names ('all' = every output-capable GPIO) */
  pwm: string[] | 'all'
  /** default analogWrite frequency (Hz) */
  pwmHz: number
  /** analogWrite resolution in bits (Arduino default 8) */
  pwmBits: number
  /** pins that can only be inputs */
  inputOnly: string[]
  /** pins the board drives as supplies (powered from USB) */
  supplies: { pin: string; v: number }[]
  ground: string
  /** LED_BUILTIN pin number */
  ledBuiltin: number
  /** where the on-board LED is wired (a header pin or 'LED' = internal only) */
  ledPin: string
  i2c: { sda: string; scl: string }
  runtimes: BoardRuntime[]
  /** ATmega328P port bit → pin name (avr8js) */
  avrPorts?: { B: (string | null)[]; C: (string | null)[]; D: (string | null)[] }
  placement: 'offboard' | 'footprint'
  /** footprint boards: pin hole offsets relative to pin 1 */
  footprint?: { dCol: number; row: StripRow }[]
  /** footprint boards: rows and anchor-relative columns the PCB covers (occlusion) */
  bodyRows?: StripRow[]
  bodyCols?: [number, number]
  /**
   * datasheet facts for the Specs page beyond the fields above: memory,
   * supply input range, totals, radios… as [label, value] rows
   */
  extraSpecs?: [string, string][]
  /** header type on top: 'female' sockets (Uno-style, male jumper ends) or 'male' pins (default) */
  header?: 'female' | 'male'
  /** footprint boards: top of the board above the breadboard (wire obstacle height) */
  bodyHeight?: number
  /** extra sketch constants naming pins (NodeMCU D0…D8, STM32 PA0…PC15) → pin number */
  pinAliases?: Record<string, number>
  /** the on-board LED lights when its pin is driven LOW */
  ledActiveLow?: boolean
  /** pins that take 5 V (5.5 V absolute maximum) on an otherwise 3.3 V board */
  fiveVoltTolerant?: string[]
  /** how pin names are printed: 'arduino' (~9, 13), 'bare' (D13 → 13, IO4 → 4), 'port' (PA0 → A0) */
  silk?: 'arduino' | 'bare' | 'port'
  /** print ADC-capable pins as analog (green) even when they are named as GPIOs */
  adcLabels?: boolean
  /** GPIO driver output resistance (Ω) and internal pull-up (Ω) */
  rout?: number
  rpull?: number
  doc: string
}

// ---------------------------------------------------------------- helpers

const range = (prefix: string, from: number, to: number): string[] => {
  const out: string[] = []
  for (let i = from; i <= to; i++) out.push(`${prefix}${i}`)
  return out
}

/** Off-board header terminal: inches from the board's lower-left corner → plan offsets. */
function headerPin(xIn: number, yIn: number, boardDepthIn: number, y: number, exit: { x: number; z: number }): OffboardTerminalGeometry {
  return { dx: xIn * 10, dz: (boardDepthIn - yIn) * 10, y, exitDir: exit }
}

/** Female header top height on the Arduino boards (PCB on standoffs + 8.5 mm header). */
export const ARDUINO_HEADER_Y = 4.6
/** ESP32 DevKit: header pins soldered pin-up for jumper wires, pin tips at this height. */
export const ESP32_PIN_Y = 3.4

// ------------------------------------------------------------------ Uno

const UNO_TOP: [string, number][] = [
  ['SCL', 0.84], ['SDA', 0.94], ['AREF', 1.04], ['GND2', 1.14], ['D13', 1.24], ['D12', 1.34], ['D11', 1.44],
  ['D10', 1.54], ['D9', 1.64], ['D8', 1.74], ['D7', 1.9], ['D6', 2.0], ['D5', 2.1], ['D4', 2.2], ['D3', 2.3],
  ['D2', 2.4], ['D1', 2.5], ['D0', 2.6],
]
const UNO_BOTTOM: [string, number][] = [
  ['IOREF', 1.2], ['RESET', 1.3], ['3V3', 1.4], ['5V', 1.5], ['GND', 1.6], ['GND3', 1.7], ['VIN', 1.8],
  ['A0', 2.0], ['A1', 2.1], ['A2', 2.2], ['A3', 2.3], ['A4', 2.4], ['A5', 2.5],
]

function arduinoGeometry(
  top: [string, number][],
  bottom: [string, number][],
  extra: [string, number, number][],
  widthIn: number,
): { pins: string[]; terminals: OffboardTerminalGeometry[]; rect: { x0: number; x1: number; z0: number; z1: number } } {
  const depth = 2.1
  const pins: string[] = []
  const terminals: OffboardTerminalGeometry[] = []
  for (const [p, x] of top) {
    pins.push(p)
    terminals.push(headerPin(x, 2.0, depth, ARDUINO_HEADER_Y, { x: 0, z: -1 }))
  }
  for (const [p, x] of bottom) {
    pins.push(p)
    terminals.push(headerPin(x, 0.1, depth, ARDUINO_HEADER_Y, { x: 0, z: 1 }))
  }
  for (const [p, x, y] of extra) {
    pins.push(p)
    terminals.push(headerPin(x, y, depth, ARDUINO_HEADER_Y, { x: 1, z: 0 }))
  }
  return { pins, terminals, rect: { x0: 0, x1: widthIn * 10, z0: 0, z1: depth * 10 } }
}

const unoGeo = arduinoGeometry(UNO_TOP, UNO_BOTTOM, [], 2.7)

const ATMEGA328_PORTS = {
  D: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'],
  B: ['D8', 'D9', 'D10', 'D11', 'D12', 'D13', null, null],
  C: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', null, null],
}

function arduinoGpio(digital: number, analog: number, analogBase: number): Record<number, string> {
  const g: Record<number, string> = {}
  for (let i = 0; i < digital; i++) g[i] = `D${i}`
  for (let i = 0; i < analog; i++) g[analogBase + i] = `A${i}`
  return g
}
function analogMap(n: number, base: number): { adc: Record<string, number>; alias: Record<string, number> } {
  const adc: Record<string, number> = {}
  const alias: Record<string, number> = {}
  for (let i = 0; i < n; i++) {
    adc[`A${i}`] = i
    alias[`A${i}`] = base + i
  }
  return { adc, alias }
}

const unoAnalog = analogMap(6, 14)

export const UNO: BoardDef = {
  type: 'arduino_uno',
  label: 'Arduino Uno R3',
  short: 'Uno',
  mcu: 'ATmega328P · 16 MHz',
  extraSpecs: [['Flash / SRAM / EEPROM', '32 KB / 2 KB / 1 KB'], ['Input (barrel / VIN)', '7–12 V recommended, 6–20 V limit'], ['USB', '5 V'], ['Total current, all pins', '200 mA'], ['3.3 V pin', '50 mA'], ['Digital / analog / PWM pins', '14 / 6 / 6']],
  logicV: 5,
  absMaxV: 5.5,
  maxPinMa: 40,
  pins: unoGeo.pins,
  bridges: [['GND', 'GND2'], ['GND', 'GND3'], ['SDA', 'A4'], ['SCL', 'A5']],
  gpio: arduinoGpio(14, 6, 14),
  adc: unoAnalog.adc,
  analogAlias: unoAnalog.alias,
  adcBits: 10,
  pwm: ['D3', 'D5', 'D6', 'D9', 'D10', 'D11'],
  pwmHz: 490,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '5V', v: 5 }, { pin: '3V3', v: 3.3 }, { pin: 'IOREF', v: 5 }],
  ground: 'GND',
  ledBuiltin: 13,
  ledPin: 'D13',
  i2c: { sda: 'A4', scl: 'A5' },
  runtimes: ['fast', 'avr'],
  avrPorts: ATMEGA328_PORTS,
  placement: 'offboard',
  header: 'female',
  silk: 'arduino',
  doc: 'Arduino Uno: the classic 5 V board. Sits on the bench beside the breadboard; wire its header pins (e.g. "U1:D13", "U1:GND", "U1:5V") to the breadboard. Runs your sketch in Instant mode or compiled on a real ATmega328P (avr8js).',
}

// ------------------------------------------------------------------ Mega

const MEGA_TOP: [string, number][] = [
  ...UNO_TOP.map(([p, x]): [string, number] => [p === 'SCL' ? 'SCL1' : p === 'SDA' ? 'SDA1' : p, x]),
  ['D14', 2.8], ['D15', 2.9], ['D16', 3.0], ['D17', 3.1], ['D18', 3.2], ['D19', 3.3], ['D20', 3.4], ['D21', 3.5],
]
const MEGA_BOTTOM: [string, number][] = [
  ...UNO_BOTTOM.filter(([p]) => !p.startsWith('A')),
  ...range('A', 0, 7).map((p, i): [string, number] => [p, 2.0 + i * 0.1]),
  ...range('A', 8, 15).map((p, i): [string, number] => [p, 2.9 + i * 0.1]),
]
const MEGA_DOUBLE: [string, number, number][] = (() => {
  const out: [string, number, number][] = [['5V2', 3.75, 1.95], ['5V3', 3.85, 1.95]]
  for (let r = 0; r < 16; r++) {
    out.push([`D${22 + r * 2}`, 3.75, 1.85 - r * 0.1])
    out.push([`D${23 + r * 2}`, 3.85, 1.85 - r * 0.1])
  }
  out.push(['GND4', 3.75, 0.25], ['GND5', 3.85, 0.25])
  return out
})()
const megaGeo = arduinoGeometry(MEGA_TOP, MEGA_BOTTOM, MEGA_DOUBLE, 4.0)
const megaAnalog = analogMap(16, 54)

export const MEGA: BoardDef = {
  type: 'arduino_mega',
  label: 'Arduino Mega 2560',
  short: 'Mega',
  mcu: 'ATmega2560 · 16 MHz',
  extraSpecs: [['Flash / SRAM / EEPROM', '256 KB / 8 KB / 4 KB'], ['Input (barrel / VIN)', '7–12 V recommended, 6–20 V limit'], ['USB', '5 V'], ['Total current, all pins', '200 mA'], ['3.3 V pin', '50 mA'], ['Digital / analog / PWM pins', '54 / 16 / 15'], ['UARTs', '4']],
  logicV: 5,
  absMaxV: 5.5,
  maxPinMa: 40,
  pins: megaGeo.pins,
  bridges: [
    ['GND', 'GND2'], ['GND', 'GND3'], ['GND', 'GND4'], ['GND', 'GND5'],
    ['5V', '5V2'], ['5V', '5V3'], ['SDA1', 'D20'], ['SCL1', 'D21'],
  ],
  gpio: arduinoGpio(54, 16, 54),
  adc: megaAnalog.adc,
  analogAlias: megaAnalog.alias,
  adcBits: 10,
  pwm: [...range('D', 2, 13), 'D44', 'D45', 'D46'],
  pwmHz: 490,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '5V', v: 5 }, { pin: '3V3', v: 3.3 }, { pin: 'IOREF', v: 5 }],
  ground: 'GND',
  ledBuiltin: 13,
  ledPin: 'D13',
  i2c: { sda: 'D20', scl: 'D21' },
  runtimes: ['fast'],
  placement: 'offboard',
  header: 'female',
  silk: 'arduino',
  doc: 'Arduino Mega 2560: 54 digital pins, 16 analog inputs, 5 V logic. Sits on the bench; wire its headers to the breadboard. Runs your sketch in Instant mode.',
}

// ------------------------------------------------------------------ Nano

/** Nano header, USB end on the left: [row c pin, row h pin] per column. */
const NANO_COLS: [string, string][] = [
  ['D12', 'D13'], ['D11', '3V3'], ['D10', 'AREF'], ['D9', 'A0'], ['D8', 'A1'], ['D7', 'A2'], ['D6', 'A3'],
  ['D5', 'A4'], ['D4', 'A5'], ['D3', 'A6'], ['D2', 'A7'], ['GND2', '5V'], ['RESET2', 'RESET'], ['D0', 'GND'],
  ['D1', 'VIN'],
]
// pin order: pin 1 = D1/TX (row h, right end) … like the real board's numbering
// is irrelevant here; we just need a deterministic order with pin 1 first.
const nanoPins: string[] = []
const nanoFoot: { dCol: number; row: StripRow }[] = []
NANO_COLS.forEach(([c], i) => {
  nanoPins.push(c)
  nanoFoot.push({ dCol: i, row: 'c' })
})
NANO_COLS.forEach(([, h], i) => {
  nanoPins.push(h)
  nanoFoot.push({ dCol: i, row: 'h' })
})
const nanoAnalog = analogMap(8, 14)

export const NANO: BoardDef = {
  type: 'arduino_nano',
  label: 'Arduino Nano',
  short: 'Nano',
  mcu: 'ATmega328P · 16 MHz',
  extraSpecs: [['Flash / SRAM / EEPROM', '32 KB / 2 KB / 1 KB'], ['Input (VIN)', '7–12 V recommended, 6–20 V limit'], ['USB', '5 V (mini-USB)'], ['Total current, all pins', '200 mA'], ['Digital / analog / PWM pins', '14 / 8 / 6']],
  logicV: 5,
  absMaxV: 5.5,
  maxPinMa: 40,
  pins: nanoPins,
  bridges: [['GND', 'GND2'], ['RESET', 'RESET2']],
  gpio: { ...arduinoGpio(14, 8, 14) },
  adc: nanoAnalog.adc,
  analogAlias: nanoAnalog.alias,
  adcBits: 10,
  pwm: ['D3', 'D5', 'D6', 'D9', 'D10', 'D11'],
  pwmHz: 490,
  pwmBits: 8,
  inputOnly: ['A6', 'A7'],
  supplies: [{ pin: '5V', v: 5 }, { pin: '3V3', v: 3.3 }],
  ground: 'GND',
  ledBuiltin: 13,
  ledPin: 'D13',
  i2c: { sda: 'A4', scl: 'A5' },
  runtimes: ['fast', 'avr'],
  avrPorts: ATMEGA328_PORTS,
  placement: 'footprint',
  footprint: nanoFoot,
  bodyRows: ['c', 'd', 'e', 'f', 'g', 'h'],
  bodyCols: [-1, 15],
  bodyHeight: 3.4,
  silk: 'arduino',
  doc: 'Arduino Nano: the Uno chip on a small board that straddles the breadboard channel (pins in rows c and h, 15 columns, USB end at the anchor column). `at` = the D12 hole in row c. Each pin\'s column strip is its connection point.',
}

// ----------------------------------------------------------------- ESP32

const ESP32_BACK = ['VIN', 'GND', 'D13', 'D12', 'D14', 'D27', 'D26', 'D25', 'D33', 'D32', 'D35', 'D34', 'VN', 'VP', 'EN']
const ESP32_FRONT = ['3V3', 'GND2', 'D15', 'D2', 'D4', 'RX2', 'TX2', 'D5', 'D18', 'D19', 'D21', 'RX0', 'TX0', 'D22', 'D23']
const esp32Pins = [...ESP32_BACK, ...ESP32_FRONT]
const esp32Terminals: OffboardTerminalGeometry[] = [
  ...ESP32_BACK.map((_, i) => ({ dx: 3 + i, dz: 1, y: ESP32_PIN_Y, exitDir: { x: 0, z: -1 } })),
  ...ESP32_FRONT.map((_, i) => ({ dx: 3 + i, dz: 10, y: ESP32_PIN_Y, exitDir: { x: 0, z: 1 } })),
]
const esp32Gpio: Record<number, string> = { 1: 'TX0', 3: 'RX0', 16: 'RX2', 17: 'TX2', 36: 'VP', 39: 'VN' }
for (const p of esp32Pins) {
  const m = /^D(\d+)$/.exec(p)
  if (m) esp32Gpio[Number(m[1])] = p
}
const esp32Adc: Record<string, number> = {
  VP: 0, VN: 3, D32: 4, D33: 5, D34: 6, D35: 7, D4: 10, D2: 12, D15: 13, D13: 14, D12: 15, D14: 16, D27: 17, D25: 18, D26: 19,
}

export const ESP32: BoardDef = {
  type: 'esp32_devkit',
  label: 'ESP32 DevKit V1',
  short: 'ESP32',
  mcu: 'ESP32-WROOM-32 · 240 MHz',
  extraSpecs: [['Cores', '2 × Xtensa LX6'], ['Flash / SRAM', '4 MB / 520 KB'], ['Input (VIN / USB)', '5 V (VIN 4.5–12 V via regulator)'], ['3.3 V regulator', '≈600 mA (AMS1117)'], ['ADC', '12-bit, 0–3.3 V (≈0.1–3.1 V usable)'], ['DAC', '2 × 8-bit (GPIO 25, 26)'], ['Radio', 'Wi-Fi 802.11 b/g/n 2.4 GHz, Bluetooth 4.2 + BLE'], ['Touch pins', '10']],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 40,
  pins: esp32Pins,
  bridges: [['GND', 'GND2']],
  gpio: esp32Gpio,
  adc: esp32Adc,
  analogAlias: {},
  adcBits: 12,
  pwm: 'all',
  pwmHz: 1000,
  pwmBits: 8,
  inputOnly: ['D34', 'D35', 'VP', 'VN'],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: 'VIN', v: 5 }],
  ground: 'GND',
  ledBuiltin: 2,
  ledPin: 'D2',
  i2c: { sda: 'D21', scl: 'D22' },
  runtimes: ['fast'],
  placement: 'offboard',
  rout: 30,
  rpull: 45000,
  doc: 'ESP32 DevKit V1 (30 pins): a 3.3 V board — its pins are damaged by 5 V. Sits on the bench; wire its pins (e.g. "E1:D2", "E1:GND", "E1:3V3") to the breadboard. GPIO 34, 35, 36 (VP) and 39 (VN) are input-only. Runs Arduino-style code in Instant mode.',
}
registerOffboardGeometry(ESP32.type, {
  rect: { x0: 0, x1: 20, z0: -0.5, z1: 11.5 },
  height: ESP32_PIN_Y + 0.3,
  terminals: esp32Terminals,
})

// ------------------------------------------------------------------ Pico

const PICO_LEFT = [
  'GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND2', 'GP6', 'GP7', 'GP8', 'GP9', 'GND3', 'GP10', 'GP11',
  'GP12', 'GP13', 'GND4', 'GP14', 'GP15',
]
// pins 21..40 (pin 21 = GP16 opposite pin 20, pin 40 = VBUS opposite pin 1)
const PICO_RIGHT = [
  'GP16', 'GP17', 'GND5', 'GP18', 'GP19', 'GP20', 'GP21', 'GND6', 'GP22', 'RUN', 'GP26', 'GP27', 'AGND', 'GP28',
  'ADC_VREF', '3V3', '3V3_EN', 'GND7', 'VSYS', 'VBUS',
]
const picoPins = [...PICO_LEFT, ...PICO_RIGHT]
const picoFoot: { dCol: number; row: StripRow }[] = [
  ...PICO_LEFT.map((_, i) => ({ dCol: i, row: 'i' as StripRow })),
  ...PICO_RIGHT.map((_, i) => ({ dCol: 19 - i, row: 'c' as StripRow })),
]
const picoGpio: Record<number, string> = { 25: 'LED' }
for (const p of picoPins) {
  const m = /^GP(\d+)$/.exec(p)
  if (m) picoGpio[Number(m[1])] = p
}

export const PICO: BoardDef = {
  type: 'rpi_pico',
  label: 'Raspberry Pi Pico',
  short: 'Pico',
  mcu: 'RP2040 · 133 MHz',
  extraSpecs: [['Cores', '2 × Arm Cortex-M0+'], ['Flash / SRAM', '2 MB / 264 KB'], ['Input (VSYS)', '1.8–5.5 V'], ['3V3 out', '300 mA max'], ['ADC', '12-bit, 3 inputs + temperature, 500 kS/s'], ['PIO', '2 blocks × 4 state machines'], ['PWM', '16 channels']],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 12,
  pins: picoPins,
  bridges: [
    ['GND', 'GND2'], ['GND', 'GND3'], ['GND', 'GND4'], ['GND', 'GND5'], ['GND', 'GND6'], ['GND', 'GND7'],
    ['GND', 'AGND'], ['VBUS', 'VSYS'],
  ],
  gpio: picoGpio,
  adc: { GP26: 0, GP27: 1, GP28: 2 },
  analogAlias: { A0: 26, A1: 27, A2: 28 },
  adcBits: 10,
  pwm: 'all',
  pwmHz: 1000,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: 'VBUS', v: 5 }],
  ground: 'GND',
  ledBuiltin: 25,
  ledPin: 'LED',
  i2c: { sda: 'GP4', scl: 'GP5' },
  runtimes: ['fast'],
  placement: 'footprint',
  footprint: picoFoot,
  bodyRows: ['c', 'd', 'e', 'f', 'g', 'h', 'i'],
  bodyCols: [0, 19],
  bodyHeight: 2.8,
  adcLabels: true,
  rout: 40,
  rpull: 50000,
  doc: 'Raspberry Pi Pico: a 3.3 V board — its pins are damaged by 5 V. Straddles the breadboard channel (pins in rows i and c, 20 columns, USB end at the anchor). `at` = the GP0 hole in row i. VBUS is 5 V from USB; 3V3 is the 3.3 V output. Runs Arduino-style code in Instant mode.',
}

// ===================================================== more boards (2026-11)
//
// Pinouts from the makers' pinout cards and datasheets (Arduino A000053 /
// ABX00080 / ABX00083, Espressif ESP32-S3-DevKitC-1 user guide, PJRC Teensy
// 4.0 card, Seeed XIAO wiki, stm32-base Blue Pill, the esp8266 / esp32
// Arduino core variants, Raspberry Pi Pico W / Pico 2 datasheets). All run
// Arduino-style sketches in Instant mode through the gpio / adc / pwm maps.

/**
 * A breadboard board with two 0.6" header rows, USB end at the anchor column:
 * row c takes the board's RIGHT header and row h its LEFT header (read with
 * USB up, parts side facing you), each listed from the USB end.
 */
function dipBoard(rowC: string[], rowH: string[]): { pins: string[]; footprint: { dCol: number; row: StripRow }[] } {
  return {
    pins: [...rowC, ...rowH],
    footprint: [...rowC.map((_, i) => ({ dCol: i, row: 'c' as StripRow })), ...rowH.map((_, i) => ({ dCol: i, row: 'h' as StripRow }))],
  }
}

/**
 * A bench dev board with male pins pointing up (like the ESP32 DevKit): `back`
 * and `front` rows listed from the USB end (x = 0), first pin at `x0`.
 */
function pinsUpBoard(type: string, back: string[], front: string[], size: { w: number; d: number }, rowZ: [number, number], x0: number): string[] {
  registerOffboardGeometry(type, {
    rect: { x0: 0, x1: size.w, z0: -0.5, z1: size.d + 0.5 },
    height: ESP32_PIN_Y + 0.3,
    terminals: [
      ...back.map((_, i) => ({ dx: x0 + i, dz: rowZ[0], y: ESP32_PIN_Y, exitDir: { x: 0, z: -1 } })),
      ...front.map((_, i) => ({ dx: x0 + i, dz: rowZ[1], y: ESP32_PIN_Y, exitDir: { x: 0, z: 1 } })),
    ],
  })
  return [...back, ...front]
}

/** number → pin for names like IO4 (prefix + GPIO number), plus extras */
function numbered(pins: string[], prefix: string, extra: Record<number, string> = {}): Record<number, string> {
  const g: Record<number, string> = {}
  const re = new RegExp(`^${prefix}(\\d+)$`)
  for (const p of pins) {
    const m = re.exec(p)
    if (m) g[Number(m[1])] = p
  }
  return { ...g, ...extra }
}

const UNO_PWM = ['D3', 'D5', 'D6', 'D9', 'D10', 'D11']

// --------------------------------------------------------- Uno R4 (RA4M1)

const UNO_R4_SHARED = {
  short: 'Uno R4',
  mcu: 'Renesas RA4M1 · 48 MHz',
  logicV: 5,
  absMaxV: 5.3,
  maxPinMa: 8,
  pins: unoGeo.pins,
  bridges: [['GND', 'GND2'], ['GND', 'GND3'], ['SDA', 'A4'], ['SCL', 'A5']] as [string, string][],
  gpio: arduinoGpio(14, 6, 14),
  adc: unoAnalog.adc,
  analogAlias: unoAnalog.alias,
  adcBits: 10,
  pwm: UNO_PWM,
  pwmHz: 490,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '5V', v: 5 }, { pin: '3V3', v: 3.3 }, { pin: 'IOREF', v: 5 }],
  ground: 'GND',
  ledBuiltin: 13,
  ledPin: 'D13',
  i2c: { sda: 'A4', scl: 'A5' },
  runtimes: ['fast'] as BoardRuntime[],
  placement: 'offboard' as const,
  header: 'female' as const,
  silk: 'arduino' as const,
  rout: 50,
}
const R4_SPECS: [string, string][] = [
  ['Core', 'Arm Cortex-M4F'],
  ['Flash / SRAM / EEPROM', '256 KB / 32 KB / 8 KB data flash'],
  ['Input (barrel / VIN)', '6–24 V'],
  ['USB', '5 V (USB-C)'],
  ['ADC', '10-bit by default, up to 14-bit (analogReadResolution)'],
  ['DAC', '12-bit on A0'],
  ['Extras', 'CAN bus, op-amp, real-time clock, native USB (keyboard / mouse)'],
  ['Digital / analog / PWM pins', '14 / 6 / 6'],
]

export const UNO_R4_MINIMA: BoardDef = {
  ...UNO_R4_SHARED,
  type: 'arduino_uno_r4_minima',
  label: 'Arduino Uno R4 Minima',
  extraSpecs: R4_SPECS,
  doc: 'Arduino Uno R4 Minima: the Uno shape and pinout with a 32-bit Renesas RA4M1 (48 MHz), still 5 V logic. Each pin gives only 8 mA — use 330 Ω or more for an LED. Sits on the bench; wire its female headers ("R1:D13", "R1:GND") to the breadboard. Runs Arduino-style code in Instant mode.',
}
export const UNO_R4_WIFI: BoardDef = {
  ...UNO_R4_SHARED,
  type: 'arduino_uno_r4_wifi',
  label: 'Arduino Uno R4 WiFi',
  short: 'Uno R4 WiFi',
  extraSpecs: [...R4_SPECS, ['Radio', 'Wi-Fi 4 + Bluetooth LE 5 (ESP32-S3-MINI-1 co-processor)'], ['Display', '12 × 8 red LED matrix'], ['Qwiic', 'I²C connector (Wire1, 3.3 V)']],
  doc: 'Arduino Uno R4 WiFi: the Uno R4 (RA4M1, 5 V logic, 8 mA per pin) plus an ESP32-S3 for Wi-Fi / Bluetooth, a 12 × 8 LED matrix and a Qwiic socket. Sits on the bench; wire its female headers to the breadboard. Runs Arduino-style code in Instant mode (no Wi-Fi in the lab).',
}

// ------------------------------------------------- Leonardo / Micro (32u4)

/** ATmega32u4: A6–A11 share D4, D6, D8, D9, D10, D12 (Arduino numbers 24–29) */
const U4_SHARED_ANALOG: [string, string][] = [['A6', 'D4'], ['A7', 'D6'], ['A8', 'D8'], ['A9', 'D9'], ['A10', 'D10'], ['A11', 'D12']]
function u4Analog(): { gpio: Record<number, string>; adc: Record<string, number>; alias: Record<string, number> } {
  const gpio: Record<number, string> = {}
  const adc: Record<string, number> = {}
  const alias: Record<string, number> = {}
  for (let i = 0; i < 6; i++) {
    gpio[18 + i] = `A${i}`
    adc[`A${i}`] = i
    alias[`A${i}`] = 18 + i
  }
  U4_SHARED_ANALOG.forEach(([a, d], i) => {
    gpio[24 + i] = d
    adc[d] = 6 + i
    alias[a] = 24 + i
  })
  return { gpio, adc, alias }
}
const u4 = u4Analog()
const U4_PWM = ['D3', 'D5', 'D6', 'D9', 'D10', 'D11', 'D13']

export const LEONARDO: BoardDef = {
  type: 'arduino_leonardo',
  label: 'Arduino Leonardo',
  short: 'Leonardo',
  mcu: 'ATmega32u4 · 16 MHz',
  extraSpecs: [['Flash / SRAM / EEPROM', '32 KB (4 KB bootloader) / 2.5 KB / 1 KB'], ['Input (barrel / VIN)', '7–12 V recommended, 6–20 V limit'], ['USB', '5 V (micro-USB), native USB: can act as a keyboard or mouse'], ['3.3 V pin', '50 mA'], ['Digital / analog / PWM pins', '20 / 12 / 7'], ['Serial', 'Serial = USB, Serial1 = pins 0 / 1']],
  logicV: 5,
  absMaxV: 5.5,
  maxPinMa: 40,
  pins: unoGeo.pins,
  bridges: [['GND', 'GND2'], ['GND', 'GND3'], ['SDA', 'D2'], ['SCL', 'D3']],
  gpio: { ...arduinoGpio(14, 0, 0), ...u4.gpio },
  adc: u4.adc,
  analogAlias: u4.alias,
  adcBits: 10,
  pwm: U4_PWM,
  pwmHz: 490,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '5V', v: 5 }, { pin: '3V3', v: 3.3 }, { pin: 'IOREF', v: 5 }],
  ground: 'GND',
  ledBuiltin: 13,
  ledPin: 'D13',
  i2c: { sda: 'D2', scl: 'D3' },
  runtimes: ['fast'],
  placement: 'offboard',
  header: 'female',
  silk: 'arduino',
  doc: 'Arduino Leonardo: the Uno shape with an ATmega32u4 that speaks USB itself (it can be a keyboard or mouse). 5 V logic, 12 analog inputs (A6–A11 are on D4, D6, D8, D9, D10, D12) and I²C on D2 (SDA) / D3 (SCL), not A4/A5. Sits on the bench. Runs your sketch in Instant mode.',
}

const microPins = dipBoard(
  ['D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'GND2', 'RESET2', 'D0', 'D1', 'SS', 'MOSI'],
  ['D13', '3V3', 'AREF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'NC', 'NC2', '5V', 'RESET', 'GND', 'VIN', 'MISO', 'SCK'],
)
export const MICRO: BoardDef = {
  type: 'arduino_micro',
  label: 'Arduino Micro',
  short: 'Micro',
  mcu: 'ATmega32u4 · 16 MHz',
  extraSpecs: [['Flash / SRAM / EEPROM', '32 KB (4 KB bootloader) / 2.5 KB / 1 KB'], ['Input (VIN)', '6–9 V'], ['USB', '5 V (micro-USB), native USB: can act as a keyboard or mouse'], ['Digital / analog / PWM pins', '20 / 12 / 7'], ['SPI pins', 'MISO 14, SCK 15, MOSI 16, SS 17'], ['Size', '48 × 18 mm']],
  logicV: 5,
  absMaxV: 5.5,
  maxPinMa: 40,
  pins: microPins.pins,
  bridges: [['GND', 'GND2'], ['RESET', 'RESET2']],
  gpio: { ...arduinoGpio(14, 0, 0), 14: 'MISO', 15: 'SCK', 16: 'MOSI', 17: 'SS', ...u4.gpio },
  adc: u4.adc,
  analogAlias: u4.alias,
  adcBits: 10,
  pwm: U4_PWM,
  pwmHz: 490,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '5V', v: 5 }, { pin: '3V3', v: 3.3 }],
  ground: 'GND',
  ledBuiltin: 13,
  ledPin: 'D13',
  i2c: { sda: 'D2', scl: 'D3' },
  runtimes: ['fast'],
  placement: 'footprint',
  footprint: microPins.footprint,
  bodyRows: ['c', 'd', 'e', 'f', 'g', 'h'],
  bodyCols: [-1, 17],
  bodyHeight: 3.4,
  silk: 'arduino',
  doc: 'Arduino Micro: the Leonardo\'s ATmega32u4 on a 17-pin-a-side stick that straddles the breadboard channel (rows c and h, USB end at the anchor). `at` = the D12 hole in row c. 5 V logic; I²C on D2 / D3; A6–A11 share D4, D6, D8, D9, D10, D12. Runs your sketch in Instant mode.',
}

// ------------------------------------------------------------ Nano ESP32

const nanoEspPins = dipBoard(
  ['D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'GND2', 'RST', 'D0', 'D1'],
  ['D13', '3V3', 'B0', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'VBUS', 'B1', 'GND', 'VIN'],
)
const nanoEspAnalog = analogMap(8, 17)
export const NANO_ESP32: BoardDef = {
  type: 'arduino_nano_esp32',
  label: 'Arduino Nano ESP32',
  short: 'Nano ESP32',
  mcu: 'ESP32-S3 · 240 MHz',
  extraSpecs: [['Module', 'u-blox NORA-W106 (ESP32-S3)'], ['Cores', '2 × Xtensa LX7'], ['Flash / SRAM / PSRAM', '16 MB / 512 KB / 8 MB'], ['Input (VIN)', '6–21 V'], ['USB', '5 V (USB-C) — VBUS has 5 V only on USB power'], ['Radio', 'Wi-Fi 4 + Bluetooth LE 5'], ['ADC', '12-bit; A4–A7 (ADC2) stop while Wi-Fi is on'], ['Pin current', '40 mA source / 28 mA sink'], ['RGB LED', 'red B0 (GPIO46), green B1 (GPIO0), blue GPIO45 — active low']],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 40,
  pins: nanoEspPins.pins,
  bridges: [['GND', 'GND2']],
  gpio: arduinoGpio(14, 8, 17),
  adc: nanoEspAnalog.adc,
  analogAlias: nanoEspAnalog.alias,
  adcBits: 12,
  pwm: 'all',
  pwmHz: 1000,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: 'VBUS', v: 5 }],
  ground: 'GND',
  ledBuiltin: 13,
  ledPin: 'D13',
  i2c: { sda: 'A4', scl: 'A5' },
  runtimes: ['fast'],
  placement: 'footprint',
  footprint: nanoEspPins.footprint,
  bodyRows: ['c', 'd', 'e', 'f', 'g', 'h'],
  bodyCols: [-1, 15],
  bodyHeight: 3.4,
  silk: 'arduino',
  rout: 30,
  rpull: 45000,
  doc: 'Arduino Nano ESP32: the Nano shape with an ESP32-S3 (Wi-Fi + Bluetooth). A 3.3 V board — 5 V damages its pins. Straddles the channel like a Nano (`at` = the D12 hole in row c). Pins use Arduino numbers (D13 = 13, A0 = 17). B0 / B1 are the boot pins; VBUS is 5 V from USB. Runs Arduino-style code in Instant mode.',
}

// ----------------------------------------------------------- ESP8266

const NODEMCU_GPIO: Record<string, number> = { D0: 16, D1: 5, D2: 4, D3: 0, D4: 2, D5: 14, D6: 12, D7: 13, D8: 15, RX: 3, TX: 1 }
const nodemcuPins = pinsUpBoard(
  'esp8266_nodemcu',
  ['VIN', 'GND', 'RST', 'EN', '3V3', 'GND2', 'CLK', 'SD0', 'CMD', 'SD1', 'SD2', 'SD3', 'RSV', 'RSV2', 'A0'],
  ['3V32', 'GND3', 'TX', 'RX', 'D8', 'D7', 'D6', 'D5', 'GND4', '3V33', 'D4', 'D3', 'D2', 'D1', 'D0'],
  { w: 19.3, d: 10.2 },
  [0.6, 9.6],
  2.6,
)
export const NODEMCU: BoardDef = {
  type: 'esp8266_nodemcu',
  label: 'ESP8266 NodeMCU v1.0',
  short: 'NodeMCU',
  mcu: 'ESP8266EX · 80 MHz',
  extraSpecs: [['Module', 'ESP-12E (Tensilica L106, 80 / 160 MHz)'], ['Flash / RAM', '4 MB / ≈80 KB for sketches'], ['Input', '5 V micro-USB (CP2102); VIN 4.5–9 V'], ['ADC', '1 × 10-bit on A0 — the chip reads 0–1 V, the board\'s divider makes A0 0–3.3 V'], ['Radio', 'Wi-Fi 802.11 b/g/n 2.4 GHz (no Bluetooth)'], ['PWM', 'software PWM on D1–D8, 1 kHz, 0–255'], ['Boot pins', 'D3 (GPIO0) and D4 (GPIO2) HIGH, D8 (GPIO15) LOW at reset'], ['Flash pins', 'CLK, SD0–SD3, CMD: do not use']],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 12,
  pins: nodemcuPins,
  bridges: [['GND', 'GND2'], ['GND', 'GND3'], ['GND', 'GND4'], ['3V3', '3V32'], ['3V3', '3V33']],
  gpio: { ...Object.fromEntries(Object.entries(NODEMCU_GPIO).map(([p, n]) => [n, p])), 17: 'A0' },
  adc: { A0: 0 },
  analogAlias: { A0: 17 },
  adcBits: 10,
  pwm: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'],
  pwmHz: 1000,
  pwmBits: 8,
  inputOnly: ['A0'],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: 'VIN', v: 5 }],
  ground: 'GND',
  ledBuiltin: 2,
  ledPin: 'D4',
  ledActiveLow: true,
  i2c: { sda: 'D2', scl: 'D1' },
  runtimes: ['fast'],
  placement: 'offboard',
  pinAliases: Object.fromEntries(Object.entries(NODEMCU_GPIO).filter(([p]) => p.startsWith('D'))),
  rout: 40,
  rpull: 40000,
  doc: 'ESP8266 NodeMCU v1.0 (Amica): the Wi-Fi board that started it all. A 3.3 V board — 5 V damages its pins. Sits on the bench, pins up; wire them (e.g. "N1:D1", "N1:GND") to the breadboard. Pin numbers are GPIO numbers: use D0…D8 (D4 = GPIO2 = the blue LED, lit when LOW). A0 is the only analog input (0–3.3 V). Runs Arduino-style code in Instant mode.',
}

// ----------------------------------------------------------- ESP32-S3 / C3

const S3_BACK = ['GND', '5V', 'IO14', 'IO13', 'IO12', 'IO11', 'IO10', 'IO9', 'IO46', 'IO3', 'IO8', 'IO18', 'IO17', 'IO16', 'IO15', 'IO7', 'IO6', 'IO5', 'IO4', 'RST', '3V3', '3V32']
const S3_FRONT = ['GND2', 'GND3', 'IO19', 'IO20', 'IO21', 'IO47', 'IO48', 'IO45', 'IO0', 'IO35', 'IO36', 'IO37', 'IO38', 'IO39', 'IO40', 'IO41', 'IO42', 'IO2', 'IO1', 'RX', 'TX', 'GND4']
const s3Pins = pinsUpBoard('esp32s3_devkitc', S3_BACK, S3_FRONT, { w: 24.7, d: 10 }, [0.5, 9.5], 3.1)
const s3Adc: Record<string, number> = {}
for (let n = 1; n <= 20; n++) if (s3Pins.includes(`IO${n}`)) s3Adc[`IO${n}`] = n <= 10 ? n - 1 : n - 11
export const ESP32_S3: BoardDef = {
  type: 'esp32s3_devkitc',
  label: 'ESP32-S3-DevKitC-1',
  short: 'ESP32-S3',
  mcu: 'ESP32-S3 · 240 MHz',
  extraSpecs: [['Module', 'ESP32-S3-WROOM-1 (N8R8 is common)'], ['Cores', '2 × Xtensa LX7'], ['Flash / SRAM / PSRAM', '8 MB / 512 KB / up to 8 MB'], ['Input', '5 V (two USB-C: UART bridge and native USB)'], ['ADC', '12-bit, 20 inputs: ADC1 = GPIO1–10, ADC2 = GPIO11–20 (not with Wi-Fi)'], ['Radio', 'Wi-Fi 4 2.4 GHz + Bluetooth LE 5'], ['RGB LED', 'WS2812 on GPIO48 (v1.0) / GPIO38 (v1.1)'], ['Touch pins', '14 (GPIO1–14)'], ['Reserved', 'GPIO35–37 belong to octal PSRAM on R8 modules'], ['Size', '62.7 × 25.4 mm']],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 40,
  pins: s3Pins,
  bridges: [['GND', 'GND2'], ['GND', 'GND3'], ['GND', 'GND4'], ['3V3', '3V32']],
  gpio: numbered(s3Pins, 'IO', { 43: 'TX', 44: 'RX', 97: 'LED' }),
  adc: s3Adc,
  analogAlias: {},
  adcBits: 12,
  pwm: 'all',
  pwmHz: 1000,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: '5V', v: 5 }],
  ground: 'GND',
  ledBuiltin: 97,
  ledPin: 'LED',
  i2c: { sda: 'IO8', scl: 'IO9' },
  runtimes: ['fast'],
  placement: 'offboard',
  silk: 'bare',
  rout: 30,
  rpull: 45000,
  doc: 'Espressif ESP32-S3-DevKitC-1: dual-core ESP32-S3 with Wi-Fi + Bluetooth LE, 22 pins a side. A 3.3 V board — 5 V damages its pins. Sits on the bench, pins up; wire them ("S1:IO4", "S1:GND"). Pin numbers are GPIO numbers; LED_BUILTIN lights the RGB LED white. Avoid GPIO35–37 on PSRAM modules. Runs Arduino-style code in Instant mode.',
}

const c3Pins = dipBoard(['5V', 'GND', '3V3', 'IO4', 'IO3', 'IO2', 'IO1', 'IO0'], ['IO5', 'IO6', 'IO7', 'IO8', 'IO9', 'IO10', 'RX', 'TX'])
export const ESP32_C3: BoardDef = {
  type: 'esp32c3_supermini',
  label: 'ESP32-C3 SuperMini',
  short: 'ESP32-C3',
  mcu: 'ESP32-C3 · 160 MHz',
  extraSpecs: [['Core', 'RISC-V, single core'], ['Flash / SRAM', '4 MB (in package) / 400 KB'], ['Input', '5 V (USB-C or 5V pin) → 3.3 V regulator'], ['ADC', '12-bit; GPIO0–4 (ADC1), GPIO5 (ADC2, not with Wi-Fi)'], ['Radio', 'Wi-Fi 4 2.4 GHz + Bluetooth LE 5'], ['Strapping pins', 'GPIO2, 8 and 9 — keep them free at reset'], ['USB', 'native USB serial (no USB-UART chip)'], ['Size', '22.5 × 18 mm (clones vary)']],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 40,
  pins: c3Pins.pins,
  bridges: [],
  gpio: numbered(c3Pins.pins, 'IO', { 20: 'RX', 21: 'TX' }),
  adc: { IO0: 0, IO1: 1, IO2: 2, IO3: 3, IO4: 4, IO5: 0 },
  analogAlias: {},
  adcBits: 12,
  pwm: 'all',
  pwmHz: 1000,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: '5V', v: 5 }],
  ground: 'GND',
  ledBuiltin: 8,
  ledPin: 'IO8',
  ledActiveLow: true,
  i2c: { sda: 'IO8', scl: 'IO9' },
  runtimes: ['fast'],
  placement: 'footprint',
  footprint: c3Pins.footprint,
  bodyRows: ['c', 'd', 'e', 'f', 'g', 'h'],
  bodyCols: [-1, 8],
  bodyHeight: 2.8,
  silk: 'bare',
  rout: 30,
  rpull: 45000,
  doc: 'ESP32-C3 SuperMini: a thumb-sized RISC-V ESP32 with Wi-Fi + Bluetooth LE. A 3.3 V board — 5 V damages its pins. Straddles the channel (rows c and h, USB-C at the anchor; `at` = the 5V hole in row c). Pin numbers are GPIO numbers; the blue LED on GPIO8 lights when LOW. Runs Arduino-style code in Instant mode.',
}

// ----------------------------------------------------- STM32 Blue Pill

const BLUEPILL_C = ['GND', 'GND2', '3V3', 'RESET', 'PB11', 'PB10', 'PB1', 'PB0', 'PA7', 'PA6', 'PA5', 'PA4', 'PA3', 'PA2', 'PA1', 'PA0', 'PC15', 'PC14', 'PC13', 'VB']
const BLUEPILL_H = ['PB12', 'PB13', 'PB14', 'PB15', 'PA8', 'PA9', 'PA10', 'PA11', 'PA12', 'PA15', 'PB3', 'PB4', 'PB5', 'PB6', 'PB7', 'PB8', 'PB9', '5V', 'GND3', '3V32']
const bluePins = dipBoard(BLUEPILL_C, BLUEPILL_H)
/** STM32 pin numbers in the lab: port × 16 + bit (PA0 = 0, PB0 = 16, PC13 = 45) */
const stmNumber = (p: string) => 'ABC'.indexOf(p[1]) * 16 + Number(p.slice(2))
const stmPins = bluePins.pins.filter((p) => /^P[ABC]\d+$/.test(p))
export const BLUE_PILL: BoardDef = {
  type: 'stm32_bluepill',
  label: 'STM32 Blue Pill (F103C8)',
  short: 'Blue Pill',
  mcu: 'STM32F103C8T6 · 72 MHz',
  extraSpecs: [['Core', 'Arm Cortex-M3'], ['Flash / SRAM', '64 KB / 20 KB (many chips hold 128 KB)'], ['Input', '5 V (micro-USB or 5V pin) → 3.3 V regulator'], ['ADC', '2 × 12-bit, 10 inputs (PA0–PA7, PB0, PB1)'], ['5 V-tolerant pins', 'PA8–PA15, PB3, PB4, PB6–PB15 (never the analog pins)'], ['Weak pins', 'PC13–PC15 sink only ≈3 mA'], ['Buses', '3 × USART, 2 × I²C, 2 × SPI, USB, CAN'], ['Size', '53 × 23 mm']],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 25,
  pins: bluePins.pins,
  bridges: [['GND', 'GND2'], ['GND', 'GND3'], ['3V3', '3V32']],
  gpio: Object.fromEntries(stmPins.map((p) => [stmNumber(p), p])),
  adc: { PA0: 0, PA1: 1, PA2: 2, PA3: 3, PA4: 4, PA5: 5, PA6: 6, PA7: 7, PB0: 8, PB1: 9 },
  analogAlias: {},
  adcBits: 10,
  pwm: ['PA0', 'PA1', 'PA2', 'PA3', 'PA6', 'PA7', 'PB0', 'PB1', 'PA8', 'PA9', 'PA10', 'PA11', 'PB6', 'PB7', 'PB8', 'PB9'],
  pwmHz: 1000,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: '5V', v: 5 }],
  ground: 'GND',
  ledBuiltin: stmNumber('PC13'),
  ledPin: 'PC13',
  ledActiveLow: true,
  i2c: { sda: 'PB7', scl: 'PB6' },
  runtimes: ['fast'],
  placement: 'footprint',
  footprint: bluePins.footprint,
  bodyRows: ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
  bodyCols: [-1, 20],
  bodyHeight: 2.8,
  fiveVoltTolerant: ['PA8', 'PA9', 'PA10', 'PA11', 'PA12', 'PA15', 'PB3', 'PB4', 'PB6', 'PB7', 'PB8', 'PB9', 'PB10', 'PB11', 'PB12', 'PB13', 'PB14', 'PB15'],
  pinAliases: Object.fromEntries(stmPins.map((p) => [p, stmNumber(p)])),
  silk: 'port',
  adcLabels: true,
  rout: 40,
  rpull: 40000,
  doc: 'STM32 "Blue Pill" (STM32F103C8): a 72 MHz Arm board for a couple of dollars. 3.3 V logic; the 5 V-tolerant pins (PA8–PA15, PB3, PB4, PB6–PB15) take 5 V, the analog pins (PA0–PA7, PB0, PB1) do not. Straddles the channel (rows c and h, USB at the anchor; `at` = the GND hole in row c). Name pins as in STM32duino: PC13 (the green LED, lit when LOW), PA0… Runs Arduino-style code in Instant mode.',
}

// ---------------------------------------------------- XIAO / Teensy

const xiaoPins = dipBoard(['5V', 'GND', '3V3', 'D10', 'D9', 'D8', 'D7'], ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'])
const xiaoAnalog = analogMap(11, 0)
export const XIAO_SAMD21: BoardDef = {
  type: 'xiao_samd21',
  label: 'Seeed XIAO SAMD21',
  short: 'XIAO',
  mcu: 'ATSAMD21G18 · 48 MHz',
  extraSpecs: [['Core', 'Arm Cortex-M0+'], ['Flash / SRAM', '256 KB / 32 KB'], ['Input', '5 V (USB-C or 5V pin) → 3.3 V regulator'], ['ADC', '12-bit capable, 11 inputs (10-bit by default)'], ['DAC', '10-bit on A0 (D0)'], ['Buses', 'I²C D4/D5, UART D6/D7, SPI D8–D10'], ['Size', '21 × 17.8 mm']],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 7,
  pins: xiaoPins.pins,
  bridges: [],
  gpio: { ...arduinoGpio(11, 0, 0), 13: 'LED' },
  adc: Object.fromEntries(Object.entries(xiaoAnalog.adc).map(([a, ch]) => [`D${a.slice(1)}`, ch])),
  analogAlias: xiaoAnalog.alias,
  adcBits: 10,
  pwm: range('D', 1, 10),
  pwmHz: 732,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: '5V', v: 5 }],
  ground: 'GND',
  ledBuiltin: 13,
  ledPin: 'LED',
  ledActiveLow: true,
  i2c: { sda: 'D4', scl: 'D5' },
  runtimes: ['fast'],
  placement: 'footprint',
  footprint: xiaoPins.footprint,
  bodyRows: ['c', 'd', 'e', 'f', 'g', 'h'],
  bodyCols: [-1, 7],
  bodyHeight: 2.8,
  rout: 60,
  rpull: 40000,
  doc: 'Seeed Studio XIAO SAMD21: a thumbnail-sized Arm board, 7 pins a side. A 3.3 V board — 5 V damages its pins, and each pin gives only about 7 mA (use 330 Ω or more for an LED). Straddles the channel (rows c and h, USB-C at the anchor; `at` = the 5V hole in row c). Every pin D0–D10 is also A0–A10. LED_BUILTIN is the yellow L LED (lit when LOW). Runs Arduino-style code in Instant mode.',
}

const teensyPins = dipBoard(
  ['VIN', 'GND2', '3V3', 'D23', 'D22', 'D21', 'D20', 'D19', 'D18', 'D17', 'D16', 'D15', 'D14', 'D13'],
  ['GND', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12'],
)
const teensyAnalog = analogMap(10, 14)
export const TEENSY40: BoardDef = {
  type: 'teensy40',
  label: 'Teensy 4.0',
  short: 'Teensy 4.0',
  mcu: 'NXP i.MX RT1062 · 600 MHz',
  extraSpecs: [['Core', 'Arm Cortex-M7'], ['Flash / RAM', '2 MB / 1 MB (512 KB tightly coupled)'], ['Input (VIN)', '3.6–5.5 V (USB 5 V)'], ['3.3 V pin', '250 mA max'], ['Recommended pin current', '4 mA'], ['ADC', '10-bit by default (12-bit capable); A0–A9 on pins 14–23'], ['Buses', '7 × serial, 3 × I²C, 3 × SPI, 3 × CAN, USB high speed'], ['Size', '35.6 × 17.8 mm']],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 10,
  pins: teensyPins.pins,
  bridges: [['GND', 'GND2']],
  gpio: arduinoGpio(24, 0, 0),
  adc: Object.fromEntries(Object.values(teensyAnalog.adc).map((ch) => [`D${14 + ch}`, ch])),
  analogAlias: teensyAnalog.alias,
  adcBits: 10,
  pwm: [...range('D', 0, 15), 'D18', 'D19', 'D22', 'D23'],
  pwmHz: 4482,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: 'VIN', v: 5 }],
  ground: 'GND',
  ledBuiltin: 13,
  ledPin: 'D13',
  i2c: { sda: 'D18', scl: 'D19' },
  runtimes: ['fast'],
  placement: 'footprint',
  footprint: teensyPins.footprint,
  bodyRows: ['c', 'd', 'e', 'f', 'g', 'h'],
  bodyCols: [-1, 13],
  bodyHeight: 2.8,
  silk: 'bare',
  rout: 40,
  rpull: 47000,
  doc: 'PJRC Teensy 4.0: a 600 MHz Arm Cortex-M7 on a 14-pin-a-side stick. A 3.3 V board — its pins are NOT 5 V tolerant. Straddles the channel (rows c and h, USB at the anchor; `at` = the VIN hole in row c). Pin 13 is the orange LED; A0–A9 are pins 14–23. Runs Arduino-style code in Instant mode.',
}

// ---------------------------------------------------- Pico W / Pico 2

const picoWGpio: Record<number, string> = { ...picoGpio, 64: 'LED' }
delete picoWGpio[25]
export const PICO_W: BoardDef = {
  ...PICO,
  type: 'rpi_pico_w',
  label: 'Raspberry Pi Pico W',
  short: 'Pico W',
  extraSpecs: [...(PICO.extraSpecs ?? []), ['Radio', 'Wi-Fi 4 2.4 GHz + Bluetooth 5.2 (Infineon CYW43439)'], ['LED', 'on the radio chip (LED_BUILTIN = 64), not GP25']],
  gpio: picoWGpio,
  ledBuiltin: 64,
  doc: 'Raspberry Pi Pico W: the Pico with Wi-Fi and Bluetooth (CYW43439). Same 40-pin layout, a 3.3 V board — its pins are damaged by 5 V. Straddles the channel (rows i and c, `at` = the GP0 hole in row i). Its LED hangs off the radio chip: use LED_BUILTIN, not 25. Runs Arduino-style code in Instant mode.',
}
export const PICO2: BoardDef = {
  ...PICO,
  type: 'rpi_pico2',
  label: 'Raspberry Pi Pico 2',
  short: 'Pico 2',
  mcu: 'RP2350 · 150 MHz',
  extraSpecs: [['Cores', '2 × Arm Cortex-M33 or 2 × Hazard3 RISC-V'], ['Flash / SRAM', '4 MB / 520 KB'], ['Input (VSYS)', '1.8–5.5 V'], ['3V3 out', '300 mA max'], ['ADC', '12-bit, 3 inputs + temperature, 500 kS/s'], ['PIO', '3 blocks × 4 state machines'], ['PWM', '24 channels'], ['5 V-tolerant GPIO', 'yes while powered — except the ADC pins GP26–GP28'], ['Security', 'Arm TrustZone, signed boot']],
  fiveVoltTolerant: picoPins.filter((p) => /^GP\d+$/.test(p) && !['GP26', 'GP27', 'GP28'].includes(p)),
  doc: 'Raspberry Pi Pico 2: the Pico layout with the faster RP2350 (Arm or RISC-V cores). 3.3 V logic; its GPIOs take 5 V while the board is powered — except the ADC pins GP26–GP28. Straddles the channel (rows i and c, `at` = the GP0 hole in row i); GP25 is the LED. Runs Arduino-style code in Instant mode.',
}

for (const t of [UNO_R4_MINIMA.type, UNO_R4_WIFI.type, LEONARDO.type]) {
  registerOffboardGeometry(t, { rect: unoGeo.rect, height: ARDUINO_HEADER_Y + 0.2, terminals: unoGeo.terminals })
}

const MORE_BOARDS: BoardDef[] = [
  UNO_R4_MINIMA, UNO_R4_WIFI, LEONARDO, MICRO, NANO_ESP32,
  NODEMCU, ESP32_S3, ESP32_C3,
  PICO_W, PICO2,
  BLUE_PILL, XIAO_SAMD21, TEENSY40,
]

// --------------------------------------------------------------- registry

registerOffboardGeometry(UNO.type, { rect: unoGeo.rect, height: ARDUINO_HEADER_Y + 0.2, terminals: unoGeo.terminals })
registerOffboardGeometry(MEGA.type, { rect: megaGeo.rect, height: ARDUINO_HEADER_Y + 0.2, terminals: megaGeo.terminals })

export const BOARDS: BoardDef[] = [
  UNO, NANO, MEGA, ESP32, PICO,
  ...MORE_BOARDS,
]
const BY_TYPE = new Map(BOARDS.map((b) => [b.type, b]))

export function boardDef(type: string): BoardDef | undefined {
  return BY_TYPE.get(type)
}
export function isBoardType(type: string): boolean {
  return BY_TYPE.has(type)
}

/** Pin name for an Arduino pin argument (number, 'A0', 'D13', 'GP2', 'LED_BUILTIN'). */
export function resolveBoardPin(board: BoardDef, pin: unknown): string | null {
  if (typeof pin === 'number' && Number.isFinite(pin)) return board.gpio[Math.trunc(pin)] ?? null
  if (typeof pin === 'string') {
    const s = pin.trim()
    if (/^\d+$/.test(s)) return board.gpio[Number(s)] ?? null
    if (board.analogAlias[s] !== undefined) return board.gpio[board.analogAlias[s]] ?? null
    if (board.pins.includes(s) || s === 'LED') return s
  }
  return null
}

/** Is a pin PWM-capable on this board? */
export function hasPwm(board: BoardDef, pin: string): boolean {
  if (board.pwm === 'all') return !board.inputOnly.includes(pin) && pin !== 'LED' ? true : pin === 'LED'
  return board.pwm.includes(pin)
}
