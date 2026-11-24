/**
 * Circuit Lab microcontroller boards: Arduino Uno (R3, R4 Minima / WiFi), Nano,
 * Nano Every, Nano 33 BLE, Mega, Leonardo, Micro, Nano ESP32 and MKR WiFi 1010;
 * SparkFun RedBoard; ESP32 DevKit V1, ESP32-S3-DevKitC-1, ESP32-C3 SuperMini,
 * ESP8266 NodeMCU and D1 mini; Raspberry Pi Pico, Pico W, Pico 2 and Pico 2 W;
 * Adafruit Feather RP2040; STM32 Blue Pill and Nucleo-F401RE; TI MSP430 and
 * Tiva C LaunchPads; BBC micro:bit v2; Seeed XIAO SAMD21 and Teensy 4.0 —
 * and the Linux boards that run Python: Raspberry Pi 5, 4 Model B, 3 Model
 * B+, Zero 2 W and the BeagleBone Black.
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

export type BoardRuntime = 'fast' | 'avr' | 'python'

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
  /** physical header pin numbers (Raspberry Pi 1–40: GPIO.BOARD numbering, hover chips) */
  pinNumbers?: Record<string, number>
  /** second names printed in the hover chip (GPIO2 → SDA1, P9_14 → EHRPWM1A) */
  altNames?: Record<string, string>
  /** pins on FEMALE sockets on a board whose `header` is otherwise male (Nucleo: Arduino sockets + morpho pins) */
  femalePins?: string[]
  /** Python mode: which hardware modules exist — 'pi' (gpiozero, RPi.GPIO) or 'beagle' (Adafruit_BBIO) */
  python?: 'pi' | 'beagle'
  /** ADC full scale when it differs from the logic level (BeagleBone AIN: 1.8 V) */
  adcMaxV?: number
  /** highest voltage the VIN / RAW pin takes (default 20 V on 5 V boards, 12 V on 3.3 V boards) */
  vinMax?: number
  /** pins with a lower absolute maximum than absMaxV (BeagleBone AIN pins: 1.8 V) */
  lowVoltagePins?: { pins: string[]; maxV: number }
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

// ======================================================= Raspberry Pi (Linux)
//
// The 40-pin header from the Raspberry Pi documentation (raspberrypi.com
// "GPIO and the 40-pin header", pinout.xyz) and the boards' mechanical
// drawings: header centre line 3.5 mm from the top edge, centred on
// x = 32.5 mm (pin 1 at 8.37 mm, odd pins on the inner row). These boards
// run Python (src/mcu/python) — gpiozero and RPi.GPIO — not Arduino sketches.

/** physical pin 1 … 40 → lab pin name (BCM GPIO names, numbered duplicates for power) */
export const PI_HEADER: string[] = [
  '3V3', '5V', 'GPIO2', '5V2', 'GPIO3', 'GND', 'GPIO4', 'GPIO14', 'GND2', 'GPIO15',
  'GPIO17', 'GPIO18', 'GPIO27', 'GND3', 'GPIO22', 'GPIO23', '3V32', 'GPIO24', 'GPIO10', 'GND4',
  'GPIO9', 'GPIO25', 'GPIO11', 'GPIO8', 'GND5', 'GPIO7', 'GPIO0', 'GPIO1', 'GPIO5', 'GND6',
  'GPIO6', 'GPIO12', 'GPIO13', 'GND7', 'GPIO19', 'GPIO16', 'GPIO26', 'GPIO20', 'GND8', 'GPIO21',
]
/** male header pin tips above the bench: PCB on its feet + 8.5 mm header */
export const PI_PIN_Y = 4.3
/** millimetres → plan units (0.1") */
export const MM = 1 / 2.54
const PI_ALT: Record<string, string> = {
  GPIO2: 'SDA1', GPIO3: 'SCL1', GPIO4: 'GPCLK0', GPIO14: 'TXD', GPIO15: 'RXD', GPIO18: 'PWM0', GPIO10: 'MOSI', GPIO9: 'MISO',
  GPIO11: 'SCLK', GPIO8: 'CE0', GPIO7: 'CE1', GPIO0: 'ID_SD', GPIO1: 'ID_SC', GPIO12: 'PWM0', GPIO13: 'PWM1', GPIO19: 'PWM1',
  GPIO20: 'PCM_DIN', GPIO21: 'PCM_DOUT',
}
/** header terminals: pin 1 at (8.37, 4.77) mm from the top-left corner, odd pins on the inner row */
function piTerminals(): OffboardTerminalGeometry[] {
  return PI_HEADER.map((_, i) => {
    const inner = i % 2 === 0
    return { dx: 8.37 * MM + (i >> 1), dz: (inner ? 4.77 : 2.23) * MM, y: PI_PIN_Y, exitDir: { x: 0, z: inner ? 1 : -1 } }
  })
}
function piGpio(led: number): Record<number, string> {
  const g: Record<number, string> = { [led]: 'LED' }
  for (let n = 0; n <= 27; n++) g[n] = `GPIO${n}`
  return g
}
const PI_SHARED = {
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 16,
  pins: PI_HEADER,
  bridges: [
    ['GND', 'GND2'], ['GND', 'GND3'], ['GND', 'GND4'], ['GND', 'GND5'], ['GND', 'GND6'], ['GND', 'GND7'], ['GND', 'GND8'],
    ['5V', '5V2'], ['3V3', '3V32'],
  ] as [string, string][],
  adc: {},
  analogAlias: {},
  adcBits: 0,
  pwm: ['GPIO12', 'GPIO13', 'GPIO18', 'GPIO19'],
  pwmHz: 100,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '5V', v: 5 }, { pin: '3V3', v: 3.3 }],
  ground: 'GND',
  ledPin: 'LED',
  i2c: { sda: 'GPIO2', scl: 'GPIO3' },
  runtimes: ['python'] as BoardRuntime[],
  python: 'pi' as const,
  placement: 'offboard' as const,
  header: 'male' as const,
  silk: 'bare' as const,
  pinNumbers: Object.fromEntries(PI_HEADER.map((p, i) => [p, i + 1])),
  altNames: PI_ALT,
  rout: 50,
  rpull: 50000,
}
const PI_GPIO_FACTS: [string, string][] = [
  ['GPIO header', '40 pins (2 × 20, 0.1"): 26 GPIO, 5V × 2, 3V3 × 2, GND × 8'],
  ['GPIO current', 'all GPIO together ≤ 50 mA; keep each pin to a few mA (LED + 330 Ω)'],
  ['ADC', 'none — read analog sensors through an ADC chip such as the MCP3008 (SPI)'],
  ['Hardware PWM', 'GPIO12, 13, 18, 19 — software PWM (gpiozero PWMLED) on any GPIO'],
  ['Internal pull-ups', '≈ 50 kΩ on every GPIO; GPIO2 / GPIO3 have 1.8 kΩ pull-ups for I²C'],
  ['Programming', 'Python 3 with gpiozero or RPi.GPIO (the lab runs both in simulated time)'],
]
const piDoc = (name: string, extra: string) =>
  `${name}: a small Linux computer with the 40-pin GPIO header. 3.3 V logic — its pins are NOT 5 V tolerant (5 V into a GPIO damages it) and all GPIO together should stay under 50 mA. Sits on the bench, pins up; wire the header ("P1:GPIO17", "P1:GND", "P1:3V3") to the breadboard. gpiozero uses BCM numbers (LED(17) = GPIO17 = physical pin 11); GPIO.setmode(GPIO.BOARD) uses the physical pin numbers 1–40. No analog inputs. ${extra}Runs Python (gpiozero, RPi.GPIO) in simulated time.`

export const PI5: BoardDef = {
  ...PI_SHARED,
  type: 'rpi5',
  label: 'Raspberry Pi 5',
  short: 'Pi 5',
  mcu: 'BCM2712 · 2.4 GHz',
  extraSpecs: [
    ['SoC', 'Broadcom BCM2712, 4 × Arm Cortex-A76, VideoCore VII GPU'], ['RAM', '1 / 2 / 4 / 8 / 16 GB LPDDR4X'],
    ['Power in', '5 V 5 A over USB-C (USB Power Delivery)'], ['GPIO controller', 'RP1 I/O chip; drive strength 2 / 4 / 8 / 12 mA'],
    ['Radio', 'dual-band Wi-Fi 802.11ac, Bluetooth 5.0 / BLE'], ['USB / network', '2 × USB 3.0, 2 × USB 2.0, Gigabit Ethernet (PoE+ with a HAT)'],
    ['Video', '2 × micro-HDMI (4Kp60), 2 × 4-lane MIPI camera / display'], ['Also', 'PCIe 2.0 ×1, real-time clock, power button'],
    ...PI_GPIO_FACTS, ['Size', '85 × 56 mm'],
  ],
  // the ACT LED sits on the SoC's always-on GPIO block, not on RP1: the lab numbers it 100
  gpio: piGpio(100),
  ledBuiltin: 100,
  doc: piDoc('Raspberry Pi 5', 'Its GPIO come from the RP1 chip — gpiozero and RPi.GPIO programs work the same. '),
}
export const PI4: BoardDef = {
  ...PI_SHARED,
  type: 'rpi4',
  label: 'Raspberry Pi 4 Model B',
  short: 'Pi 4',
  mcu: 'BCM2711 · 1.8 GHz',
  extraSpecs: [
    ['SoC', 'Broadcom BCM2711, 4 × Arm Cortex-A72 (1.5 GHz on early boards)'], ['RAM', '1 / 2 / 4 / 8 GB LPDDR4'],
    ['Power in', '5 V 3 A over USB-C (or 5 V on the GPIO 5V pins)'], ['GPIO drive strength', '1–8 mA, set in 1 mA steps'],
    ['Radio', 'dual-band Wi-Fi 802.11ac, Bluetooth 5.0 / BLE'], ['USB / network', '2 × USB 3.0, 2 × USB 2.0, Gigabit Ethernet'],
    ['Video', '2 × micro-HDMI (4Kp60), MIPI camera + display'], ['ACT LED', 'GPIO42 (green, not on the header)'],
    ...PI_GPIO_FACTS, ['Size', '85 × 56 mm'],
  ],
  gpio: piGpio(42),
  ledBuiltin: 42,
  doc: piDoc('Raspberry Pi 4 Model B', ''),
}
export const PI3BPLUS: BoardDef = {
  ...PI_SHARED,
  type: 'rpi3bplus',
  label: 'Raspberry Pi 3 Model B+',
  short: 'Pi 3B+',
  mcu: 'BCM2837B0 · 1.4 GHz',
  extraSpecs: [
    ['SoC', 'Broadcom BCM2837B0, 4 × Arm Cortex-A53'], ['RAM', '1 GB LPDDR2'],
    ['Power in', '5 V 2.5 A over micro-USB'], ['GPIO drive strength', '2–16 mA (16 mA max per pin)'],
    ['Radio', 'dual-band Wi-Fi 802.11ac, Bluetooth 4.2 / BLE'], ['USB / network', '4 × USB 2.0, Gigabit Ethernet over USB 2.0 (≈ 300 Mbit/s)'],
    ['Video', 'full-size HDMI, MIPI camera + display'], ['ACT LED', 'GPIO29 (green, not on the header)'],
    ...PI_GPIO_FACTS, ['Size', '85 × 56 mm'],
  ],
  gpio: piGpio(29),
  ledBuiltin: 29,
  doc: piDoc('Raspberry Pi 3 Model B+', ''),
}
export const PI_ZERO2W: BoardDef = {
  ...PI_SHARED,
  type: 'rpi_zero2w',
  label: 'Raspberry Pi Zero 2 W',
  short: 'Zero 2 W',
  mcu: 'RP3A0 · 1 GHz',
  extraSpecs: [
    ['SoC', 'RP3A0 system-in-package (BCM2710A1, 4 × Arm Cortex-A53)'], ['RAM', '512 MB LPDDR2'],
    ['Power in', '5 V 2.5 A over micro-USB (PWR IN)'], ['GPIO drive strength', '2–16 mA (16 mA max per pin)'],
    ['Radio', 'Wi-Fi 802.11 b/g/n 2.4 GHz, Bluetooth 4.2 / BLE'], ['USB / video', '1 × micro-USB OTG, mini-HDMI, CSI-2 camera'],
    ['Header', 'unpopulated on the real board — the lab shows a soldered male header'], ['ACT LED', 'GPIO29 (green, lit when LOW)'],
    ...PI_GPIO_FACTS, ['Size', '65 × 30 mm'],
  ],
  gpio: piGpio(29),
  ledBuiltin: 29,
  ledActiveLow: true,
  doc: piDoc('Raspberry Pi Zero 2 W', 'The same 40-pin layout as the big Pis on a 65 × 30 mm board. '),
}
for (const [t, w, d] of [[PI5.type, 85, 56], [PI4.type, 85, 56], [PI3BPLUS.type, 85, 56], [PI_ZERO2W.type, 65, 30]] as [string, number, number][]) {
  // the USB / Ethernet jacks overhang the right edge a little on the big boards
  registerOffboardGeometry(t, { rect: { x0: 0, x1: (w + (w > 70 ? 2.5 : 0)) * MM, z0: 0, z1: (d + 1.5) * MM }, height: PI_PIN_Y + 0.3, terminals: piTerminals() })
}
const PI_BOARDS: BoardDef[] = [PI5, PI4, PI3BPLUS, PI_ZERO2W]

// ================================================ more boards (2026-11, II)
//
// From the makers' documents: Arduino datasheets / pinout cards (ABX00028
// Nano Every, ABX00030 Nano 33 BLE, ABX00023 MKR WiFi 1010), SparkFun RedBoard
// Qwiic, LOLIN D1 mini, Adafruit Feather RP2040 (board file + pinout guide),
// Raspberry Pi Pico 2 W datasheet, TI SLAU772 (MSP-EXP430G2ET) and SPMU296
// (EK-TM4C123GXL), ST's stm32duino Nucleo-F401RE variant, the micro:bit
// edge-connector page and the BeagleBone Black System Reference Manual.

/**
 * A bench board's headers from the maker's drawing: each block is a line of
 * pins at 0.1" pitch starting at (x, z) mm from the board's top-left corner,
 * running along +x / +z (or −x / −z). Wires leave away from the board centre.
 */
interface HeaderBlock {
  names: string[]
  x: number
  z: number
  dir: 'x' | 'z' | '-x' | '-z'
}
function benchHeaders(type: string, wMm: number, dMm: number, pinY: number, blocks: HeaderBlock[]): string[] {
  const pins: string[] = []
  const terminals: OffboardTerminalGeometry[] = []
  for (const b of blocks) {
    b.names.forEach((n, i) => {
      const s = i * 2.54
      const x = b.x + (b.dir === 'x' ? s : b.dir === '-x' ? -s : 0)
      const z = b.z + (b.dir === 'z' ? s : b.dir === '-z' ? -s : 0)
      const alongZ = b.dir === 'z' || b.dir === '-z'
      pins.push(n)
      terminals.push({
        dx: x * MM,
        dz: z * MM,
        y: pinY,
        exitDir: alongZ ? { x: x < wMm / 2 ? -1 : 1, z: 0 } : { x: 0, z: z < dMm / 2 ? -1 : 1 },
      })
    })
  }
  registerOffboardGeometry(type, { rect: { x0: 0, x1: wMm * MM, z0: 0, z1: dMm * MM }, height: pinY + 0.3, terminals })
  return pins
}

// ------------------------------------------------- Pico 2 W / RedBoard

export const PICO2_W: BoardDef = {
  ...PICO2,
  type: 'rpi_pico2_w',
  label: 'Raspberry Pi Pico 2 W',
  short: 'Pico 2 W',
  extraSpecs: [...(PICO2.extraSpecs ?? []), ['Radio', 'Wi-Fi 4 2.4 GHz + Bluetooth 5.2 (Infineon CYW43439)'], ['LED', 'on the radio chip (LED_BUILTIN = 64), not GP25']],
  gpio: picoWGpio,
  ledBuiltin: 64,
  doc: 'Raspberry Pi Pico 2 W: the Pico 2 (RP2350) with Wi-Fi and Bluetooth (CYW43439). Same 40-pin layout; 3.3 V logic, its GPIOs take 5 V while powered except the ADC pins GP26–GP28. Straddles the channel (rows i and c, `at` = the GP0 hole in row i). The LED hangs off the radio chip: use LED_BUILTIN. Runs Arduino-style code in Instant mode.',
}

export const REDBOARD: BoardDef = {
  ...UNO,
  type: 'sparkfun_redboard',
  label: 'SparkFun RedBoard Qwiic',
  short: 'RedBoard',
  extraSpecs: [
    ['Flash / SRAM / EEPROM', '32 KB / 2 KB / 1 KB'], ['USB', 'micro-B, CH340C USB-serial (pick "Arduino Uno" in the IDE)'],
    ['Input (barrel / VIN)', '7–15 V'], ['3.3 V regulator', 'AP2112, 600 mA'], ['Qwiic', '4-pin I²C connector (A4 / A5 through a level shifter)'],
    ['I/O voltage', '5 V (a solder jumper selects 3.3 V)'], ['Digital / analog / PWM pins', '14 / 6 / 6'],
  ],
  vinMax: 15,
  doc: 'SparkFun RedBoard Qwiic: an Uno-compatible ATmega328P board (red PCB, all-SMD, CH340 USB chip, Qwiic I²C socket). Same headers and pin numbers as the Uno; 5 V logic. Sits on the bench; wire its female headers ("R1:D13", "R1:GND"). Runs your sketch in Instant mode or compiled on a real ATmega328P (avr8js).',
}
registerOffboardGeometry(REDBOARD.type, { rect: unoGeo.rect, height: ARDUINO_HEADER_Y + 0.2, terminals: unoGeo.terminals })

// ------------------------------------------------- Nano Every / Nano 33 BLE

export const NANO_EVERY: BoardDef = {
  ...NANO,
  type: 'arduino_nano_every',
  label: 'Arduino Nano Every',
  short: 'Nano Every',
  mcu: 'ATmega4809 · 20 MHz',
  extraSpecs: [
    ['Flash / SRAM / EEPROM', '48 KB / 6 KB / 256 B'], ['Input (VIN)', 'up to 21 V (buck converter)'], ['USB', '5 V (micro-USB, SAMD11 bridge)'],
    ['3.3 V pin', '550 mA max, 200 mA recommended'], ['Digital / analog / PWM pins', '14 / 8 / 5'], ['A6 / A7', 'digital I/O too (unlike the classic Nano)'],
  ],
  maxPinMa: 20,
  inputOnly: [],
  pwm: ['D3', 'D5', 'D6', 'D9', 'D10'],
  runtimes: ['fast'],
  avrPorts: undefined,
  vinMax: 21,
  doc: 'Arduino Nano Every: the Nano shape with the newer ATmega4809 (48 KB flash, 6 KB RAM), still 5 V logic. Straddles the breadboard channel like a Nano (rows c and h; `at` = the D12 hole in row c). PWM on D3, D5, D6, D9, D10; A0–A7 are analog inputs and digital pins. Runs Arduino-style code in Instant mode.',
}

const NANO33_PINS = nanoPins.map((p) => (p === '5V' ? 'VUSB' : p))
export const NANO_33_BLE: BoardDef = {
  ...NANO,
  type: 'arduino_nano_33_ble',
  label: 'Arduino Nano 33 BLE',
  short: 'Nano 33 BLE',
  mcu: 'nRF52840 · 64 MHz',
  extraSpecs: [
    ['Module', 'u-blox NINA-B306 (Nordic nRF52840, Arm Cortex-M4F)'], ['Flash / RAM', '1 MB / 256 KB'], ['Input (VIN)', '5–21 V'],
    ['USB', 'micro-USB; VUSB pin has 5 V only after closing its solder jumper'], ['Pin current', '15 mA out, 25 mA for all GPIO together'],
    ['Radio', 'Bluetooth 5 (BLE)'], ['IMU', 'LSM9DS1 9-axis on the internal I²C bus'], ['ADC', '12-bit SAADC (analogRead 10-bit by default); A4 / A5 carry I²C pull-ups'],
  ],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 15,
  pins: NANO33_PINS,
  inputOnly: [],
  pwm: range('D', 2, 12),
  pwmHz: 500,
  supplies: [{ pin: '3V3', v: 3.3 }],
  runtimes: ['fast'],
  avrPorts: undefined,
  vinMax: 21,
  rout: 50,
  rpull: 13000,
  doc: 'Arduino Nano 33 BLE: the Nano shape with a Bluetooth nRF52840. A 3.3 V board — its pins are NOT 5 V tolerant and give 15 mA (25 mA all together). Straddles the channel like a Nano (`at` = the D12 hole in row c). The 5V position is VUSB, unconnected unless you close its jumper. Runs Arduino-style code in Instant mode.',
}

// -------------------------------------------------- Feather RP2040

/** row j (front): the 16-pin header from the USB-C end; row c (back): the 12-pin header, starting 4 columns in */
const FEATHER_J = ['RST', '3V', '3V2', 'GND', 'A0', 'A1', 'A2', 'A3', 'D24', 'D25', 'SCK', 'MO', 'MI', 'RX', 'TX', 'D4']
const FEATHER_C = ['BAT', 'EN', 'USB', 'D13', 'D12', 'D11', 'D10', 'D9', 'D6', 'D5', 'SCL', 'SDA']
export const FEATHER_RP2040: BoardDef = {
  type: 'feather_rp2040',
  label: 'Adafruit Feather RP2040',
  short: 'Feather RP2040',
  mcu: 'RP2040 · 133 MHz',
  extraSpecs: [
    ['Cores', '2 × Arm Cortex-M0+'], ['Flash / SRAM', '8 MB / 264 KB'], ['Power', 'USB-C 5 V or a LiPo on BAT (JST PH, charger on board)'],
    ['3V regulator', '500 mA peak; EN to GND switches it off'], ['ADC', '12-bit, A0–A3 (GP26–GP29)'], ['Extras', 'NeoPixel on GP16, STEMMA QT I²C, BOOT button on GP4'],
    ['Pin numbers', 'GPIO numbers (D13 = GP13, A0 = 26; D4 / D5 / D6 are GP6 / GP7 / GP8)'], ['Size', '50.8 × 22.9 mm'],
  ],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 12,
  pins: [...FEATHER_J, ...FEATHER_C],
  bridges: [['3V', '3V2']],
  gpio: { 26: 'A0', 27: 'A1', 28: 'A2', 29: 'A3', 24: 'D24', 25: 'D25', 18: 'SCK', 19: 'MO', 20: 'MI', 1: 'RX', 0: 'TX', 6: 'D4', 13: 'D13', 12: 'D12', 11: 'D11', 10: 'D10', 9: 'D9', 8: 'D6', 7: 'D5', 3: 'SCL', 2: 'SDA' },
  adc: { A0: 0, A1: 1, A2: 2, A3: 3 },
  analogAlias: { A0: 26, A1: 27, A2: 28, A3: 29 },
  adcBits: 10,
  pwm: 'all',
  pwmHz: 1000,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V', v: 3.3 }, { pin: 'USB', v: 5 }],
  ground: 'GND',
  ledBuiltin: 13,
  ledPin: 'D13',
  i2c: { sda: 'SDA', scl: 'SCL' },
  runtimes: ['fast'],
  placement: 'footprint',
  footprint: [...FEATHER_J.map((_, i) => ({ dCol: i, row: 'j' as StripRow })), ...FEATHER_C.map((_, i) => ({ dCol: 4 + i, row: 'c' as StripRow }))],
  bodyRows: ['c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
  bodyCols: [-3, 17],
  bodyHeight: 2.8,
  pinAliases: { D4: 6, D5: 7, D6: 8, D9: 9, D10: 10, D11: 11, D12: 12, D13: 13, D24: 24, D25: 25 },
  rout: 40,
  rpull: 50000,
  doc: 'Adafruit Feather RP2040: an RP2040 in the Feather shape (16 pins on one side, 12 on the other, 0.8" apart). A 3.3 V board — 5 V damages its pins. Straddles the channel with the 16-pin row in row j and the 12-pin row in row c (`at` = the RST hole in row j, USB-C toward the anchor). Pin numbers are GPIO numbers; D13 is the red LED. Runs Arduino-style code in Instant mode.',
}

// -------------------------------------------------- D1 mini / MKR WiFi 1010

const D1_GPIO: Record<string, number> = { D0: 16, D1: 5, D2: 4, D3: 0, D4: 2, D5: 14, D6: 12, D7: 13, D8: 15, RX: 3, TX: 1 }
const d1Pins = pinsUpBoard('wemos_d1_mini', ['3V3', 'D8', 'D7', 'D6', 'D5', 'D0', 'A0', 'RST'], ['5V', 'GND', 'D4', 'D3', 'D2', 'D1', 'RX', 'TX'], { w: 13.5, d: 10.1 }, [0.55, 9.55], 2.6)
export const D1_MINI: BoardDef = {
  type: 'wemos_d1_mini',
  label: 'LOLIN (WeMos) D1 mini',
  short: 'D1 mini',
  mcu: 'ESP8266EX · 80 MHz',
  extraSpecs: [
    ['Module', 'ESP-12F (Tensilica L106, 80 / 160 MHz)'], ['Flash', '4 MB'], ['Input', '5 V over USB (CH340) or the 5V pin'],
    ['ADC', '1 × 10-bit on A0 — the board\'s divider makes it 0–3.2 V'], ['Radio', 'Wi-Fi 802.11 b/g/n 2.4 GHz'],
    ['Boot pins', 'D3 (GPIO0) and D4 (GPIO2) pulled up, D8 (GPIO15) pulled down'], ['Size', '34.2 × 25.6 mm'],
  ],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 12,
  pins: d1Pins,
  bridges: [],
  gpio: { ...Object.fromEntries(Object.entries(D1_GPIO).map(([p, n]) => [n, p])), 17: 'A0' },
  adc: { A0: 0 },
  analogAlias: { A0: 17 },
  adcBits: 10,
  pwm: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'],
  pwmHz: 1000,
  pwmBits: 8,
  inputOnly: ['A0'],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: '5V', v: 5 }],
  ground: 'GND',
  ledBuiltin: 2,
  ledPin: 'D4',
  ledActiveLow: true,
  i2c: { sda: 'D2', scl: 'D1' },
  runtimes: ['fast'],
  placement: 'offboard',
  pinAliases: Object.fromEntries(Object.entries(D1_GPIO).filter(([p]) => p.startsWith('D'))),
  rout: 40,
  rpull: 40000,
  doc: 'LOLIN (WeMos) D1 mini: a small ESP8266 Wi-Fi board, 8 pins a side. A 3.3 V board — 5 V damages its pins. Sits on the bench, pins up; wire them ("W1:D5", "W1:GND"). Use D0…D8 (they are GPIO numbers underneath: D4 = GPIO2 = the blue LED, lit when LOW). A0 reads 0–3.2 V. Runs Arduino-style code in Instant mode.',
}

const mkrPins = pinsUpBoard(
  'arduino_mkr_wifi1010',
  ['AREF', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'D0', 'D1', 'D2', 'D3', 'D4', 'D5'],
  ['5V', 'VIN', '3V3', 'GND', 'RESET', 'D14', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8', 'D7', 'D6'],
  { w: 24.2, d: 9.85 },
  [0.45, 9.45],
  2.4,
)
const mkrAnalog = analogMap(7, 15)
export const MKR_WIFI_1010: BoardDef = {
  type: 'arduino_mkr_wifi1010',
  label: 'Arduino MKR WiFi 1010',
  short: 'MKR WiFi 1010',
  mcu: 'SAMD21 · 48 MHz',
  extraSpecs: [
    ['Core', 'Arm Cortex-M0+ (SAMD21G18A)'], ['Flash / SRAM', '256 KB / 32 KB'], ['Radio', 'u-blox NINA-W102 (ESP32): Wi-Fi + Bluetooth / BLE'],
    ['Input', 'USB 5 V or VIN 5 V (5.5 V max); LiPo charger on board'], ['Pin current', '7 mA per pin'], ['ADC / DAC', '12-bit capable ADC (10-bit default), 10-bit DAC on A0'],
    ['Crypto', 'ECC508 secure element'], ['Size', '61.5 × 25 mm'],
  ],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 7,
  pins: mkrPins,
  bridges: [],
  gpio: arduinoGpio(15, 7, 15),
  adc: mkrAnalog.adc,
  analogAlias: mkrAnalog.alias,
  adcBits: 10,
  pwm: [...range('D', 0, 8), 'D10', 'D12', 'A3', 'A4'],
  pwmHz: 732,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: '5V', v: 5 }],
  ground: 'GND',
  ledBuiltin: 6,
  ledPin: 'D6',
  i2c: { sda: 'D11', scl: 'D12' },
  runtimes: ['fast'],
  placement: 'offboard',
  silk: 'arduino',
  vinMax: 5.5,
  rout: 60,
  rpull: 40000,
  doc: 'Arduino MKR WiFi 1010: a SAMD21 board with an ESP32 (NINA-W102) for Wi-Fi and Bluetooth. A 3.3 V board — 5 V damages its pins, and each pin gives only 7 mA. Sits on the bench, pins up; wire them ("K1:D6", "K1:GND"). LED_BUILTIN is D6; A0 = 15 … A6 = 21; I²C on D11 (SDA) / D12 (SCL). VIN takes at most 5.5 V. Runs Arduino-style code in Instant mode.',
}

// -------------------------------------------------- TI LaunchPads

/** LaunchPad header pins on top (male) sit this high */
export const LP_PIN_Y = 4.0

// MSP-EXP430G2ET: J1 (left, pins 1–10 top → bottom), J2 (right, pin 20 at the top → 11)
const MSP_J1 = ['3V3', 'P1_0', 'P1_1', 'P1_2', 'P1_3', 'P1_4', 'P1_5', 'P2_0', 'P2_1', 'P2_2']
const MSP_J2_TOP_DOWN = ['GND', 'P2_6', 'P2_7', 'TEST', 'RST', 'P1_7', 'P1_6', 'P2_5', 'P2_4', 'P2_3']
const mspPins = benchHeaders('msp_exp430g2et', 53.3, 66, LP_PIN_Y, [
  { names: MSP_J1, x: 3.81, z: 24, dir: 'z' },
  { names: [...MSP_J2_TOP_DOWN].reverse(), x: 49.53, z: 24 + 9 * 2.54, dir: '-z' },
  { names: ['5V', 'GND2'], x: 6.35, z: 24, dir: 'z' },
])
/** BoosterPack / Energia pin numbers (J1 1–10, J2 11–20) */
const MSP_NUM: Record<string, number> = Object.fromEntries([
  ...MSP_J1.map((p, i) => [p, i + 1]),
  ...[...MSP_J2_TOP_DOWN].reverse().map((p, i) => [p, 11 + i]),
]) as Record<string, number>
const mspGpio: Record<number, string> = {}
for (const [p, n] of Object.entries(MSP_NUM)) if (/^P\d_\d$/.test(p)) mspGpio[n] = p
export const MSP430_LAUNCHPAD: BoardDef = {
  type: 'msp_exp430g2et',
  label: 'TI MSP430 LaunchPad (MSP-EXP430G2ET)',
  short: 'MSP430 LaunchPad',
  mcu: 'MSP430G2553 · 16 MHz',
  extraSpecs: [
    ['Core', 'TI MSP430, 16-bit, ultra-low-power'], ['Flash / RAM', '16 KB / 512 B'], ['Supply', '3.3 V from the on-board eZ-FET (USB); the chip runs at 1.8–3.6 V'],
    ['Pin current', 'specified at 6 mA per pin, 48 mA for all outputs'], ['ADC', 'ADC10: 10-bit, A0–A7 on P1.0–P1.7'],
    ['Timers / PWM', 'Timer_A0 (P1.2, P1.6, P2.6), Timer_A1 (P2.1, P2.2, P2.4, P2.5)'], ['On-board', 'green LED P1.0, red LED P1.6, button S1 on P1.3, RGB LED on P2.1 / P2.3 / P2.5'],
    ['Programming', 'Energia (Arduino-style): pin numbers = header numbers (P1.0 = 2); also P1_0 names'],
    ['Debug', 'eZ-FET with EnergyTrace; backchannel UART 9600 baud'],
  ],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 6,
  pins: mspPins,
  bridges: [['GND', 'GND2']],
  gpio: mspGpio,
  adc: { P1_0: 0, P1_1: 1, P1_2: 2, P1_3: 3, P1_4: 4, P1_5: 5, P1_6: 6, P1_7: 7 },
  analogAlias: { A0: 2, A1: 3, A2: 4, A3: 5, A4: 6, A5: 7, A6: 14, A7: 15 },
  adcBits: 10,
  pwm: ['P1_2', 'P1_6', 'P2_1', 'P2_2', 'P2_4', 'P2_5', 'P2_6'],
  pwmHz: 490,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: '5V', v: 5 }],
  ground: 'GND',
  ledBuiltin: 2,
  ledPin: 'P1_0',
  i2c: { sda: 'P1_7', scl: 'P1_6' },
  runtimes: ['fast'],
  placement: 'offboard',
  header: 'male',
  pinAliases: { ...Object.fromEntries(Object.entries(MSP_NUM).filter(([p]) => /^P\d_\d$/.test(p))), GREEN_LED: 2, RED_LED: 14, PUSH2: 5 },
  rout: 60,
  rpull: 35000,
  doc: 'TI MSP430 LaunchPad (MSP-EXP430G2ET, MSP430G2553): the low-power 16-bit board from many EE courses. 3.3 V logic — never 5 V on its pins, and only about 6 mA per pin (use 470 Ω or more for an LED). Sits on the bench, pins up: J1 on the left (pins 1–10), J2 on the right (20 at the top → 11). Write Energia-style code: pin numbers are header numbers (2 = P1.0, the green LED; 14 = P1.6, the red LED), or the names P1_0 … P2_7. Runs in Instant mode.',
}

// EK-TM4C123GXL: J1 outer-left, J3 inside it, J4 inside the right edge, J2 outer-right (each listed top → bottom)
const TIVA_J1 = ['3V3', 'PB5', 'PB0', 'PB1', 'PE4', 'PE5', 'PB4', 'PA5', 'PA6', 'PA7']
const TIVA_J3 = ['5V', 'GND', 'PD0', 'PD1', 'PD2', 'PD3', 'PE1', 'PE2', 'PE3', 'PF1']
const TIVA_J4 = ['PF2', 'PF3', 'PB3', 'PC4', 'PC5', 'PC6', 'PC7', 'PD6', 'PD7', 'PF4']
const TIVA_J2 = ['GND2', 'PB2', 'PE0', 'PF0', 'RESET', 'PB7', 'PB6', 'PA4', 'PA3', 'PA2']
const TIVA_TOP = 24.8
const tivaPins = benchHeaders('ek_tm4c123gxl', 50.8, 57.15, LP_PIN_Y, [
  { names: TIVA_J1, x: 2.54, z: TIVA_TOP, dir: 'z' },
  { names: [...TIVA_J2].reverse(), x: 48.26, z: TIVA_TOP + 9 * 2.54, dir: '-z' },
  { names: TIVA_J3, x: 5.08, z: TIVA_TOP, dir: 'z' },
  { names: [...TIVA_J4].reverse(), x: 45.72, z: TIVA_TOP + 9 * 2.54, dir: '-z' },
])
/** BoosterPack / Energia numbers: J1 1–10, J2 11–20 (bottom → top), J3 21–30, J4 31–40 (bottom → top) */
const TIVA_NUM: Record<string, number> = Object.fromEntries(tivaPins.map((p, i) => [p, i + 1]))
const tivaGpio: Record<number, string> = {}
for (const [p, n] of Object.entries(TIVA_NUM)) if (/^P[A-F]\d$/.test(p)) tivaGpio[n] = p
const TIVA_AIN: Record<string, number> = { PE3: 0, PE2: 1, PE1: 2, PE0: 3, PD3: 4, PD2: 5, PD1: 6, PD0: 7, PE5: 8, PE4: 9, PB4: 10, PB5: 11 }
export const TIVA_LAUNCHPAD: BoardDef = {
  type: 'ek_tm4c123gxl',
  label: 'TI Tiva C LaunchPad (EK-TM4C123GXL)',
  short: 'Tiva C LaunchPad',
  mcu: 'TM4C123GH6PM · 80 MHz',
  extraSpecs: [
    ['Core', 'Arm Cortex-M4F'], ['Flash / SRAM / EEPROM', '256 KB / 32 KB / 2 KB'], ['Power', '5 V over either USB (4.75–5.25 V)'],
    ['3.3 V out', '300 mA max'], ['Pin drive', '2 / 4 / 8 mA selectable'], ['ADC', '2 × 12-bit, 12 inputs AIN0–AIN11, 0–3.3 V'],
    ['5 V tolerance', 'GPIO inputs take 5 V except PB0, PB1 (and pins used as analog inputs)'], ['On-board', 'RGB LED PF1 red / PF2 blue / PF3 green; SW1 = PF4, SW2 = PF0'],
    ['Gotcha', 'PD0 is tied to PB6 and PD1 to PB7 by 0 Ω resistors R9 / R10'], ['Programming', 'Energia: header numbers (RED_LED = 30) or PF_1 names'],
  ],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 8,
  pins: tivaPins,
  bridges: [['GND', 'GND2'], ['PD0', 'PB6'], ['PD1', 'PB7']],
  gpio: tivaGpio,
  adc: TIVA_AIN,
  analogAlias: Object.fromEntries(Object.entries(TIVA_AIN).map(([p, ch]) => [`A${ch}`, TIVA_NUM[p]])),
  adcBits: 12,
  pwm: ['PB6', 'PB7', 'PB4', 'PB5', 'PE4', 'PE5', 'PC4', 'PC5', 'PD0', 'PD1', 'PA6', 'PA7', 'PF0', 'PF1', 'PF2', 'PF3'],
  pwmHz: 490,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: '5V', v: 5 }],
  ground: 'GND',
  ledBuiltin: 30,
  ledPin: 'PF1',
  i2c: { sda: 'PB3', scl: 'PB2' },
  runtimes: ['fast'],
  placement: 'offboard',
  header: 'male',
  fiveVoltTolerant: tivaPins.filter((p) => /^P[A-F]\d$/.test(p) && !['PB0', 'PB1'].includes(p) && TIVA_AIN[p] === undefined),
  pinAliases: {
    ...Object.fromEntries(Object.entries(TIVA_NUM).filter(([p]) => /^P[A-F]\d$/.test(p)).flatMap(([p, n]) => [[`${p.slice(0, 2)}_${p.slice(2)}`, n], [p, n]])),
    RED_LED: 30, BLUE_LED: 40, GREEN_LED: 39, PUSH1: 31, PUSH2: 17,
  },
  silk: 'port',
  adcLabels: true,
  rout: 50,
  rpull: 20000,
  doc: 'TI Tiva C Series LaunchPad (EK-TM4C123GXL): an 80 MHz Arm Cortex-M4F board used in many embedded-systems courses. 3.3 V logic; pins give 8 mA at most. Sits on the bench, pins up, in four BoosterPack columns: J1 / J3 on the left, J4 / J2 on the right. Write Energia-style code: RED_LED (PF1), BLUE_LED (PF2), GREEN_LED (PF3), or header numbers / PF_1 names. Watch out: PD0–PB6 and PD1–PB7 are tied together on the board. Runs in Instant mode.',
}

// -------------------------------------------------- ST Nucleo-F401RE

/** Arduino-shaped sockets (female) along the long axis, Uno x positions (inches) → z mm */
const NUC_Z = (xIn: number) => 3.7 + xIn * 25.4
const NUC_DIGITAL: [string, number][] = [
  ['D15', 0.84], ['D14', 0.94], ['AREF', 1.04], ['GND', 1.14], ['D13', 1.24], ['D12', 1.34], ['D11', 1.44], ['D10', 1.54], ['D9', 1.64], ['D8', 1.74],
  ['D7', 1.9], ['D6', 2.0], ['D5', 2.1], ['D4', 2.2], ['D3', 2.3], ['D2', 2.4], ['D1', 2.5], ['D0', 2.6],
]
const NUC_POWER: [string, number][] = [
  ['IOREF', 1.2], ['RESET', 1.3], ['3V3', 1.4], ['5V', 1.5], ['GND2', 1.6], ['GND3', 1.7], ['VIN', 1.8],
  ['A0', 2.0], ['A1', 2.1], ['A2', 2.2], ['A3', 2.3], ['A4', 2.4], ['A5', 2.5],
]
// ST morpho headers, pin 1 at the top: [odd column, even column] per row
const CN7: [string, string][] = [
  ['PC10', 'PC11'], ['PC12', 'PD2'], ['VDD', 'E5V'], ['BOOT0', 'GND4'], ['NC', 'NC2'], ['NC3', 'IOREF2'], ['PA13', 'RESET2'], ['PA14', '3V32'],
  ['PA15', '5V2'], ['GND5', 'GND6'], ['PB7', 'GND7'], ['PC13', 'VIN2'], ['PC14', 'NC4'], ['PC15', 'PA0'], ['PH0', 'PA1'], ['PH1', 'PA4'],
  ['VBAT', 'PB0'], ['PC2', 'PC1'], ['PC3', 'PC0'],
]
const CN10: [string, string][] = [
  ['PC9', 'PC8'], ['PB8', 'PC6'], ['PB9', 'PC5'], ['AVDD', 'U5V'], ['GND8', 'NC5'], ['PA5', 'PA12'], ['PA6', 'PA11'], ['PA7', 'PB12'],
  ['PB6', 'PB11'], ['PC7', 'GND9'], ['PA9', 'PB2'], ['PA8', 'PB1'], ['PB10', 'PB15'], ['PB4', 'PB14'], ['PB5', 'PB13'], ['PB3', 'AGND'],
  ['PA10', 'PC4'], ['PA2', 'NC6'], ['PA3', 'NC7'],
]
/** Arduino socket → the STM32 pin behind it (ST's variant), joined to its morpho pin */
const NUC_TWIN: Record<string, string> = {
  D0: 'PA3', D1: 'PA2', D2: 'PA10', D3: 'PB3', D4: 'PB5', D5: 'PB4', D6: 'PB10', D7: 'PA8', D8: 'PA9', D9: 'PC7', D10: 'PB6', D11: 'PA7',
  D12: 'PA6', D13: 'PA5', D14: 'PB9', D15: 'PB8', A0: 'PA0', A1: 'PA1', A2: 'PA4', A3: 'PB0', A4: 'PC1', A5: 'PC0',
}
const MORPHO_Z = 22.5
const nucleoPins = benchHeaders('nucleo_f401re', 70, 82.5, 4.4, [
  ...NUC_DIGITAL.map(([n, x]): HeaderBlock => ({ names: [n], x: 59.13, z: NUC_Z(x), dir: 'z' })),
  ...NUC_POWER.map(([n, x]): HeaderBlock => ({ names: [n], x: 10.87, z: NUC_Z(x), dir: 'z' })),
  { names: CN7.map(([o]) => o), x: 3.81, z: MORPHO_Z, dir: 'z' },
  { names: CN7.map(([, e]) => e), x: 6.35, z: MORPHO_Z, dir: 'z' },
  { names: CN10.map(([o]) => o), x: 63.65, z: MORPHO_Z, dir: 'z' },
  { names: CN10.map(([, e]) => e), x: 66.19, z: MORPHO_Z, dir: 'z' },
])
/** lab pin numbers: Arduino D0–D15 = 0–15, A0–A5 = 16–21; morpho-only port pins 100 + port × 16 + bit */
const nucPortNum = (p: string) => 100 + 'ABCDH'.indexOf(p[1]) * 16 + Number(p.slice(2))
const nucTwinOf = Object.fromEntries(Object.entries(NUC_TWIN).map(([a, p]) => [p, a]))
const nucGpio: Record<number, string> = { ...arduinoGpio(16, 6, 16) }
const nucAliases: Record<string, number> = {}
for (const p of nucleoPins) {
  if (!/^P[A-H]\d+$/.test(p) || ['PA13', 'PA14'].includes(p)) continue
  const twin = nucTwinOf[p]
  if (twin) nucAliases[p] = twin.startsWith('A') ? 16 + Number(twin.slice(1)) : Number(twin.slice(1))
  else {
    nucGpio[nucPortNum(p)] = p
    nucAliases[p] = nucPortNum(p)
  }
}
const nucAnalog = analogMap(6, 16)
export const NUCLEO_F401RE: BoardDef = {
  type: 'nucleo_f401re',
  label: 'ST Nucleo-F401RE',
  short: 'Nucleo-F401RE',
  mcu: 'STM32F401RE · 84 MHz',
  extraSpecs: [
    ['Core', 'Arm Cortex-M4F'], ['Flash / SRAM', '512 KB / 96 KB'], ['Power', 'USB (ST-LINK) 5 V, or E5V, VIN 7–12 V, 3.3 V'],
    ['Pin current', '±25 mA per pin, ±120 mA for the chip'], ['ADC', '12-bit, 16 channels (A0–A5 on the Arduino sockets)'],
    ['Headers', 'Arduino Uno R3 sockets + ST morpho 2 × 19 pins each side (all STM32 pins)'], ['On-board', 'LD2 green LED on D13 (PA5), user button B1 on PC13, ST-LINK/V2-1 debugger'],
    ['Serial', 'Serial = USART2 on D0 / D1 (PA3 / PA2) → the ST-LINK virtual COM port'],
    ['5 V tolerance', 'many STM32 pins are 5 V tolerant (FT); the lab treats every pin as 3.3 V only'],
  ],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 25,
  pins: nucleoPins,
  bridges: [
    ...Object.entries(NUC_TWIN).map(([a, p]): [string, string] => [a, p]),
    ...['GND2', 'GND3', 'GND4', 'GND5', 'GND6', 'GND7', 'GND8', 'GND9', 'AGND'].map((g): [string, string] => ['GND', g]),
    ['3V3', '3V32'], ['3V3', 'VDD'], ['3V3', 'AVDD'], ['3V3', 'AREF'], ['3V3', 'IOREF'], ['3V3', 'IOREF2'],
    ['5V', '5V2'], ['5V', 'U5V'], ['VIN', 'VIN2'], ['RESET', 'RESET2'],
  ],
  gpio: nucGpio,
  adc: { ...nucAnalog.adc, PC2: 12, PC3: 13, PC4: 14, PC5: 15, PB1: 9 },
  analogAlias: nucAnalog.alias,
  adcBits: 10,
  pwm: ['D3', 'D5', 'D6', 'D9', 'D10', 'D11'],
  pwmHz: 1000,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: '5V', v: 5 }],
  ground: 'GND',
  ledBuiltin: 13,
  ledPin: 'D13',
  i2c: { sda: 'D14', scl: 'D15' },
  runtimes: ['fast'],
  placement: 'offboard',
  header: 'male',
  femalePins: [...NUC_DIGITAL, ...NUC_POWER].map(([n]) => n),
  pinAliases: nucAliases,
  silk: 'arduino',
  rout: 40,
  rpull: 40000,
  doc: 'ST Nucleo-F401RE: an 84 MHz STM32 (Cortex-M4F) board with Arduino Uno sockets in the middle and ST morpho pin headers along both edges. 3.3 V logic. Sits on the bench: the Arduino sockets take male jumper ends ("N1:D13"), the morpho pins female ones ("N1:PC10"). Each Arduino socket is the same STM32 pin as its morpho twin (D13 = PA5, the green LED LD2). Write STM32duino-style code with D13 / A0 or port names (PA5, PC10). Runs in Instant mode.',
}

// -------------------------------------------------- BBC micro:bit v2

/** the edge connector on a breadboard breakout: the 19 signal pins in edge order in row c, power in row h */
const MB_C = ['P3', 'P0', 'P4', 'P5', 'P6', 'P7', 'P1', 'P8', 'P9', 'P10', 'P11', 'P12', 'P2', 'P13', 'P14', 'P15', 'P16', 'P19', 'P20']
const MB_H: [string, number][] = [['3V', 0], ['3V2', 1], ['GND', 17], ['GND2', 18]]
const mbGpio: Record<number, string> = { 100: 'LED' }
for (const p of MB_C) mbGpio[Number(p.slice(1))] = p
export const MICROBIT_V2: BoardDef = {
  type: 'microbit_v2',
  label: 'BBC micro:bit v2 (on a breakout)',
  short: 'micro:bit',
  mcu: 'nRF52833 · 64 MHz',
  extraSpecs: [
    ['Core', 'Nordic nRF52833, Arm Cortex-M4F'], ['Flash / RAM', '512 KB / 128 KB'], ['Power', '5 V USB (micro-B) → 3.3 V, or 3 V from a battery pack'],
    ['Pin current', 'standard drive ≈ 5 mA; high drive up to 15 mA (3 pins at a time)'], ['ADC', '10-bit on P0, P1, P2, P3, P4, P10'],
    ['On-board', '5 × 5 red LED matrix, buttons A (P5) and B (P11), touch logo, speaker, microphone, accelerometer / compass (I²C P19 / P20)'],
    ['Shared pins', 'P3, P4, P6, P7, P10 drive the LED matrix columns — turn the display off to use them'],
    ['Edge connector', 'big rings 0, 1, 2, 3V, GND; the breakout brings every strip to 0.1" pins'], ['Size', '51.6 × 42 mm'],
  ],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 10,
  pins: [...MB_C, ...MB_H.map(([n]) => n)],
  bridges: [['3V', '3V2'], ['GND', 'GND2']],
  gpio: mbGpio,
  adc: { P0: 0, P1: 1, P2: 2, P3: 7, P4: 4, P10: 6 },
  analogAlias: { A0: 0, A1: 1, A2: 2, A3: 3, A4: 4, A5: 10 },
  adcBits: 10,
  pwm: 'all',
  pwmHz: 500,
  pwmBits: 8,
  inputOnly: [],
  supplies: [{ pin: '3V', v: 3.3 }],
  ground: 'GND',
  ledBuiltin: 100,
  ledPin: 'LED',
  i2c: { sda: 'P20', scl: 'P19' },
  runtimes: ['fast'],
  placement: 'footprint',
  footprint: [...MB_C.map((_, i) => ({ dCol: i, row: 'c' as StripRow })), ...MB_H.map(([, c]) => ({ dCol: c, row: 'h' as StripRow }))],
  bodyRows: ['c', 'd', 'e', 'f', 'g', 'h'],
  bodyCols: [-1, 19],
  bodyHeight: 17.5,
  silk: 'bare',
  rout: 100,
  rpull: 13000,
  doc: 'BBC micro:bit v2 standing in an edge-connector breakout that straddles the channel: the 19 signal strips in edge order in row c (P3, P0, P4 … P19, P20), 3V and GND in row h (`at` = the P3 hole in row c). 3.3 V logic, about 5 mA per pin. Pin numbers are the edge numbers (P0 = 0 … P20 = 20); LED_BUILTIN lights the 5 × 5 display. Buttons A and B are P5 and P11. Runs Arduino-style code in Instant mode.',
}

// -------------------------------------------------- BeagleBone Black

/** header pin → Linux GPIO number (32 × bank + bit) */
const BBB_GPIO: Record<string, number> = {
  P8_3: 38, P8_4: 39, P8_5: 34, P8_6: 35, P8_7: 66, P8_8: 67, P8_9: 69, P8_10: 68, P8_11: 45, P8_12: 44, P8_13: 23, P8_14: 26,
  P8_15: 47, P8_16: 46, P8_17: 27, P8_18: 65, P8_19: 22, P8_20: 63, P8_21: 62, P8_22: 37, P8_23: 36, P8_24: 33, P8_25: 32, P8_26: 61,
  P8_27: 86, P8_28: 88, P8_29: 87, P8_30: 89, P8_31: 10, P8_32: 11, P8_33: 9, P8_34: 81, P8_35: 8, P8_36: 80, P8_37: 78, P8_38: 79,
  P8_39: 76, P8_40: 77, P8_41: 74, P8_42: 75, P8_43: 72, P8_44: 73, P8_45: 70, P8_46: 71,
  P9_11: 30, P9_12: 60, P9_13: 31, P9_14: 50, P9_15: 48, P9_16: 51, P9_17: 5, P9_18: 4, P9_19: 13, P9_20: 12, P9_21: 3, P9_22: 2,
  P9_23: 49, P9_24: 15, P9_25: 117, P9_26: 14, P9_27: 115, P9_28: 113, P9_29: 111, P9_30: 112, P9_31: 110, P9_41: 20, P9_42: 7,
}
const BBB_FUNC: Record<string, string> = {
  P8_13: 'EHRPWM2B', P8_19: 'EHRPWM2A', P8_34: 'EHRPWM1B', P8_36: 'EHRPWM1A', P8_45: 'EHRPWM2A', P8_46: 'EHRPWM2B',
  P9_11: 'UART4_RXD', P9_13: 'UART4_TXD', P9_14: 'EHRPWM1A', P9_16: 'EHRPWM1B', P9_17: 'I2C1_SCL', P9_18: 'I2C1_SDA', P9_19: 'I2C2_SCL',
  P9_20: 'I2C2_SDA', P9_21: 'UART2_TXD', P9_22: 'UART2_RXD', P9_24: 'UART1_TXD', P9_26: 'UART1_RXD', P9_28: 'SPI1_CS0', P9_29: 'SPI1_D0',
  P9_30: 'SPI1_D1', P9_31: 'SPI1_SCLK', P9_42: 'ECAP0', P9_39: 'AIN0', P9_40: 'AIN1', P9_37: 'AIN2', P9_38: 'AIN3', P9_33: 'AIN4',
  P9_36: 'AIN5', P9_35: 'AIN6',
}
const BBB_AIN: Record<string, number> = { P9_39: 0, P9_40: 1, P9_37: 2, P9_38: 3, P9_33: 4, P9_36: 5, P9_35: 6 }
const P9_NAMES: Record<number, string> = {
  1: 'GND', 2: 'GND2', 3: '3V3', 4: '3V32', 5: 'VDD_5V', 6: 'VDD_5V2', 7: 'SYS_5V', 8: 'SYS_5V2', 9: 'PWR_BUT', 10: 'SYS_RESET',
  32: 'VDD_ADC', 34: 'GNDA_ADC', 43: 'GND3', 44: 'GND4', 45: 'GND5', 46: 'GND6',
}
const P8_NAMES: Record<number, string> = { 1: 'GND7', 2: 'GND8' }
const bbbName = (hdr: 8 | 9, n: number) => (hdr === 9 ? P9_NAMES[n] : P8_NAMES[n]) ?? `P${hdr}_${n}`
/** P8 along the top edge (odd pins on the inner row), P9 along the bottom (odd pins on the outer row), pin 1 at the Ethernet end */
const BBB_X0 = 22.9
const bbbBlock = (hdr: 8 | 9, odd: boolean, z: number): HeaderBlock => ({
  names: Array.from({ length: 23 }, (_, k) => bbbName(hdr, 2 * k + (odd ? 1 : 2))),
  x: BBB_X0,
  z,
  dir: 'x',
})
export const BBB_PIN_Y = 3.9
const bbbPins = benchHeaders('beaglebone_black', 86.36, 53.34, BBB_PIN_Y, [
  bbbBlock(8, true, 5.14), bbbBlock(8, false, 2.6),
  bbbBlock(9, true, 50.74), bbbBlock(9, false, 48.2),
])
export const BEAGLEBONE_BLACK: BoardDef = {
  type: 'beaglebone_black',
  label: 'BeagleBone Black',
  short: 'BeagleBone',
  mcu: 'AM3358 · 1 GHz',
  extraSpecs: [
    ['Processor', 'TI Sitara AM3358, Arm Cortex-A8 + 2 PRU real-time cores'], ['RAM / storage', '512 MB DDR3L, 4 GB eMMC, microSD'],
    ['Power', '5 V ± 0.25 V, 1 A on the barrel jack, or USB (500 mA)'], ['Headers', 'P8 and P9, 2 × 23 female sockets each (65 possible GPIO)'],
    ['ADC', '7 inputs AIN0–AIN6, 12-bit, 1.8 V MAX (VDD_ADC = 1.8 V on P9_32)'], ['PWM', 'EHRPWM0/1/2 A/B and eCAP: P9_14, P9_16, P9_21, P9_22, P8_13, P8_19 …'],
    ['Busy pins', 'P8_3–P8_6 and P8_20–P8_25 belong to the eMMC; P8_27–P8_46 to HDMI'], ['Network / video', '10/100 Ethernet, micro-HDMI'],
    ['Programming', 'Linux + Python with Adafruit_BBIO (GPIO, PWM, ADC) — the lab runs it in simulated time'], ['Size', '86.4 × 53.3 mm'],
  ],
  logicV: 3.3,
  absMaxV: 3.6,
  maxPinMa: 6,
  pins: bbbPins,
  bridges: [
    ...['GND2', 'GND3', 'GND4', 'GND5', 'GND6', 'GND7', 'GND8', 'GNDA_ADC'].map((g): [string, string] => ['GND', g]),
    ['3V3', '3V32'], ['SYS_5V', 'SYS_5V2'], ['VDD_5V', 'VDD_5V2'],
  ],
  gpio: {
    ...Object.fromEntries(Object.entries(BBB_GPIO).map(([p, n]) => [n, p])),
    ...Object.fromEntries(Object.entries(BBB_AIN).map(([p, ch]) => [1000 + ch, p])),
    53: 'LED',
  },
  adc: BBB_AIN,
  analogAlias: {},
  adcBits: 12,
  adcMaxV: 1.8,
  adcLabels: true,
  lowVoltagePins: { pins: Object.keys(BBB_AIN), maxV: 1.8 },
  pwm: ['P9_14', 'P9_16', 'P9_21', 'P9_22', 'P9_28', 'P9_29', 'P9_31', 'P9_42', 'P8_13', 'P8_19', 'P8_34', 'P8_36', 'P8_45', 'P8_46'],
  pwmHz: 2000,
  pwmBits: 8,
  inputOnly: Object.keys(BBB_AIN),
  supplies: [{ pin: '3V3', v: 3.3 }, { pin: 'SYS_5V', v: 5 }, { pin: 'VDD_ADC', v: 1.8 }],
  ground: 'GND',
  ledBuiltin: 53,
  ledPin: 'LED',
  i2c: { sda: 'P9_20', scl: 'P9_19' },
  runtimes: ['python'],
  python: 'beagle',
  placement: 'offboard',
  header: 'female',
  altNames: Object.fromEntries(Object.keys(BBB_GPIO).map((p) => [p, BBB_FUNC[p] ? `${BBB_FUNC[p]} · GPIO ${BBB_GPIO[p]}` : `GPIO ${BBB_GPIO[p]}`]).concat(Object.keys(BBB_AIN).map((p) => [p, BBB_FUNC[p]]))),
  rout: 60,
  rpull: 30000,
  doc: 'BeagleBone Black: a Linux board (TI AM3358) with two 46-pin socket headers, P8 (top) and P9 (bottom), pin 1 at the Ethernet end. 3.3 V logic and only a few mA per pin — never 5 V on a GPIO. The analog inputs AIN0–AIN6 (P9_33 … P9_40) take at most 1.8 V: use VDD_ADC (P9_32) and GNDA_ADC (P9_34) for a pot. Sits on the bench; its sockets take male jumper ends ("B1:P8_10", "B1:GND"). Runs Python with Adafruit_BBIO (GPIO.setup("P8_10", GPIO.OUT)) in simulated time.',
}

const MORE_BOARDS_2: BoardDef[] = [
  PICO2_W, REDBOARD, NANO_EVERY, NANO_33_BLE, FEATHER_RP2040, D1_MINI, MKR_WIFI_1010,
  MSP430_LAUNCHPAD, TIVA_LAUNCHPAD, NUCLEO_F401RE, MICROBIT_V2,
]

// --------------------------------------------------------------- registry

registerOffboardGeometry(UNO.type, { rect: unoGeo.rect, height: ARDUINO_HEADER_Y + 0.2, terminals: unoGeo.terminals })
registerOffboardGeometry(MEGA.type, { rect: megaGeo.rect, height: ARDUINO_HEADER_Y + 0.2, terminals: megaGeo.terminals })

export const BOARDS: BoardDef[] = [
  UNO, NANO, MEGA, ESP32, PICO,
  ...MORE_BOARDS,
  ...PI_BOARDS,
  ...MORE_BOARDS_2,
  BEAGLEBONE_BLACK,
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
