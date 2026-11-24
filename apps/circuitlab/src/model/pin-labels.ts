/**
 * What a board pin is called and what kind it is, for the printed labels on
 * the 3D boards and the name chip that pops up over a hovered pin. Colours
 * follow the usual wiring habit: red power, black/grey ground, green analog,
 * orange PWM, purple buses (I²C / serial), white plain digital.
 */
import type { BoardDef } from './boards'

export type PinKind = 'power' | 'gnd' | 'analog' | 'pwm' | 'bus' | 'digital' | 'ctrl'

/** tag fill and text colour per kind (printed tags and hover chips) */
export const PIN_KIND_STYLE: Record<PinKind, { fill: string; ink: string; word: string }> = {
  power: { fill: '#e5483d', ink: '#ffffff', word: 'power' },
  gnd: { fill: '#2b2d31', ink: '#ffffff', word: 'ground' },
  analog: { fill: '#2fae5f', ink: '#ffffff', word: 'analog in' },
  pwm: { fill: '#f19a1c', ink: '#1b1205', word: 'PWM' },
  bus: { fill: '#8e6cf0', ink: '#ffffff', word: 'bus' },
  digital: { fill: '#f4f6f2', ink: '#14161a', word: 'digital' },
  ctrl: { fill: '#9aa3ad', ink: '#14161a', word: 'control' },
}

/** the pin's own name without the duplicate suffix (GND2 → GND, 5V2 → 5V, SDA1 → SDA) */
export function baseName(name: string): string {
  if (/^GND\d+$/.test(name)) return 'GND'
  if (name === 'SDA1') return 'SDA'
  if (name === 'SCL1') return 'SCL'
  const dup = /^(5V|3V3|RESET|RST|RSV|NC|VIN)\d$/.exec(name)
  if (dup) return dup[1]
  return name
}

export function pinKind(name: string, def?: BoardDef): PinKind {
  const n = baseName(name)
  if (/^A?GND$/.test(n)) return 'gnd'
  if (/^(5V|3V3|VIN|VBUS|VSYS|IOREF|VB)$/.test(n)) return 'power'
  if (/^(RESET|RST|RUN|EN|AREF|ADC_VREF|3V3_EN|B0|B1|NC|RSV|CLK|CMD|SD\d)$/.test(n)) return 'ctrl'
  if (/^(SDA|SCL|TX\d?|RX\d?|MISO|MOSI|SCK|SS)$/.test(n)) return 'bus'
  if (/^A\d+$/.test(n) || n === 'VP' || n === 'VN') return 'analog'
  if (def?.adcLabels && def.adc[n] !== undefined) return 'analog'
  const alt = def?.altNames?.[n]
  if (alt && /^ID_S/.test(alt)) return 'ctrl'
  if (alt && /^(SDA|SCL|TXD?|RXD?|MOSI|MISO|SCLK?|CE\d|CS\d?)/.test(alt)) return 'bus'
  if (def && Array.isArray(def.pwm) && def.pwm.includes(n)) return 'pwm'
  return 'digital'
}

/**
 * the short label printed beside the pin, as on the real silkscreen: Arduino
 * digital pins as ~9 / 13, bare numbers (Teensy 13, ESP32-S3 IO4 → 4), STM32
 * port pins without the P (PA0 → A0)
 */
export function pinLabel(name: string, def?: BoardDef): string {
  const n = baseName(name)
  if (def?.silk === 'arduino' && /^D\d+$/.test(n)) {
    return `${pinKind(n, def) === 'pwm' ? '~' : ''}${n.slice(1)}`
  }
  if (def?.silk === 'bare' && /^(D|IO|GPIO)\d+$/.test(n)) return n.replace(/^(D|IO|GPIO)/, '')
  if (def?.silk === 'port' && /^P[A-K]\d+$/.test(n)) return n.slice(1)
  if (n === '3V3') return '3.3V'
  if (n === 'ADC_VREF') return 'VREF'
  if (n === '3V3_EN') return '3V3EN'
  return n
}

/** the hover chip: the full name and what it is, e.g. "D9 · PWM", "A0 · analog in", "GND" */
export function pinChip(name: string, def?: BoardDef): string {
  const phys = def?.pinNumbers?.[name]
  const alt = def?.altNames?.[baseName(name)]
  if (phys !== undefined || alt) {
    // Raspberry Pi style: "GPIO17 · pin 11", "GPIO2 · SDA1 · pin 3", "5V · pin 2"
    const n = baseName(name)
    const head = n === '3V3' ? '3.3V' : n
    return [head, alt, phys !== undefined ? `pin ${phys}` : null].filter(Boolean).join(' · ')
  }
  const n = baseName(name)
  const k = pinKind(name, def)
  if (k === 'gnd' || (k === 'power' && n !== 'IOREF')) return n === '3V3' ? '3.3V' : n
  if (k === 'digital' || k === 'ctrl') return n
  if (def?.adcLabels && k === 'analog' && def.adc[n] !== undefined) return `${n} · ADC${def.adc[n]}`
  return `${n} · ${PIN_KIND_STYLE[k].word}`
}
