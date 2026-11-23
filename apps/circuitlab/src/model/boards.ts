/**
 * Circuit Lab microcontroller boards: Arduino Uno, Nano and Mega, ESP32
 * DevKit V1 (30-pin) and Raspberry Pi Pico.
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
  doc: 'Raspberry Pi Pico: a 3.3 V board — its pins are damaged by 5 V. Straddles the breadboard channel (pins in rows i and c, 20 columns, USB end at the anchor). `at` = the GP0 hole in row i. VBUS is 5 V from USB; 3V3 is the 3.3 V output. Runs Arduino-style code in Instant mode.',
}

// --------------------------------------------------------------- registry

registerOffboardGeometry(UNO.type, { rect: unoGeo.rect, height: ARDUINO_HEADER_Y + 0.2, terminals: unoGeo.terminals })
registerOffboardGeometry(MEGA.type, { rect: megaGeo.rect, height: ARDUINO_HEADER_Y + 0.2, terminals: megaGeo.terminals })

export const BOARDS: BoardDef[] = [UNO, NANO, MEGA, ESP32, PICO]
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
