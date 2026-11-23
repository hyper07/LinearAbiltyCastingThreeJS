/**
 * The one pin interface every board runtime talks to (knowledge/circuit-lab.md §6):
 * levels with drive strength, pull-ups, ADC, PWM, servo pulses, tones and
 * bus transactions. The board chip (board-chip.ts) implements it on top of
 * the circuit solver; runtimes (Instant mode, avr8js) only see this.
 */
import type { BoardDef } from '../model/boards'
import type { PinEdge } from '../sim/chip-api'

export type PinMode = 'input' | 'pullup' | 'pulldown' | 'output'

export interface McuIO {
  readonly board: BoardDef
  pinMode(pin: string, mode: PinMode, t: number): void
  digitalWrite(pin: string, high: boolean, t: number): void
  /** duty 0..1 at the given frequency (Hz); duty 0/1 become plain levels */
  pwm(pin: string, duty: number, hz: number, t: number): void
  /** servo pulses (µs, every 20 ms); null stops them */
  servo(pin: string, us: number | null, t: number): void
  /** square wave for tone(); null stops it */
  tone(pin: string, hz: number | null, t: number): void
  digitalRead(pin: string): boolean
  /** node voltage of a pin (NaN when unconnected) */
  voltage(pin: string): number
  /** exact-time edges other parts drove on this pin's net in the previous step */
  edgesOn(pin: string): PinEdge[]
  /** I²C write to a 7-bit address on the board's SDA/SCL; true = acknowledged */
  i2cWrite(address: number, bytes: number[]): boolean
  i2cRead(address: number, n: number): number[] | null
  /** WS2812 data on a pin; true when a strip received it */
  neopixel(pin: string, pixels: number[]): boolean
  /** DHT sensor on a pin */
  dht(pin: string): { temperature: number; humidity: number } | null
  serialWrite(text: string): void
  /** a one-line teaching message for the issues list (deduplicated) */
  warn(message: string): void
}

export interface McuRuntime {
  readonly kind: 'fast' | 'avr'
  state: 'running' | 'stopped' | 'error' | 'waiting'
  error?: string
  /** current source line (1-based) when the runtime can tell */
  line?: number
  /** run the program over the sim-time window [t0, t1) */
  run(t0: number, t1: number, io: McuIO): void
  /** bytes typed into the serial monitor */
  serialIn(text: string): void
}

export type { PinEdge }
