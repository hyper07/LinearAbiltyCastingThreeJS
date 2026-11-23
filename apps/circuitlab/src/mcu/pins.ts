/**
 * PinBank: a board's GPIO pins between the program and the circuit.
 *
 * Within one solver step [t0, t1) the program may change a pin several times
 * (Instant mode at exact times, avr8js at exact CPU cycles). The bank keeps
 * every change with its time, so for the coming solve each output drives
 * the AVERAGE level of the step (v = Vcc · fraction high, through the pin's
 * ~25 Ω), and the exact edges are published for fast parts (HC-SR04 trigger,
 * servo pulse width, tone frequency) that read them through the chip bridge.
 * PWM, servo pulses and tones are waves integrated analytically.
 *
 * Inputs read the node voltage of the previous solve with Schmitt
 * thresholds (low below 0.3·Vcc, high above 0.6·Vcc) and optional pull-ups.
 * Over-voltage (5 V into a 3.3 V board) and over-current damage a pin.
 */
import type { BoardDef } from '../model/boards'
import type { PinDrive, PinEdge } from '../sim/chip-api'
import type { PinMode } from './types'

interface Wave {
  start: number
  period: number
  high: number
  kind: 'pwm' | 'servo' | 'tone'
}

interface PinState {
  name: string
  mode: PinMode | null
  level: boolean
  wave: Wave | null
  /** accumulated high time in the current step */
  acc: number
  cursor: number
  edges: PinEdge[]
  /** last digital reading (Schmitt memory) */
  read: boolean
  damaged: string | null
  overV: number
  overI: number
  /** drive fraction used for the last solve */
  frac: number
}

/** Output resistance of a GPIO driver (Ω) by board family. */
function driverOhms(board: BoardDef): number {
  if (board.type === 'rpi_pico') return 40
  if (board.type === 'esp32_devkit') return 30
  return 25
}
function pullOhms(board: BoardDef): number {
  return board.type === 'esp32_devkit' ? 45000 : board.type === 'rpi_pico' ? 50000 : 35000
}

const MAX_EDGES = 64

export class PinBank {
  readonly states = new Map<string, PinState>()
  private t0 = 0
  private t1 = 0
  private volts = new Map<string, number>()
  readonly rout: number
  readonly rpull: number
  /** 'LED' and other internal pins exist even when not on a header */
  constructor(readonly board: BoardDef) {
    this.rout = driverOhms(board)
    this.rpull = pullOhms(board)
    for (const p of this.gpioPins()) this.states.set(p, this.fresh(p))
  }

  /** every program-controllable pin (header GPIO + internal LED) */
  gpioPins(): string[] {
    const set = new Set<string>(Object.values(this.board.gpio))
    return [...set]
  }

  private fresh(name: string): PinState {
    return {
      name,
      mode: null,
      level: false,
      wave: null,
      acc: 0,
      cursor: 0,
      edges: [],
      read: false,
      damaged: null,
      overV: 0,
      overI: 0,
      frac: 0,
    }
  }

  state(pin: string): PinState | undefined {
    return this.states.get(pin)
  }

  // ------------------------------------------------------------ step window

  beginStep(t0: number, t1: number, readPin: (pin: string) => number): void {
    this.t0 = t0
    this.t1 = t1
    this.volts.clear()
    for (const s of this.states.values()) {
      s.acc = 0
      s.cursor = t0
      s.edges.length = 0
      if (s.name !== 'LED') this.volts.set(s.name, readPin(s.name))
    }
  }

  voltage(pin: string): number {
    const v = this.volts.get(pin)
    return v === undefined ? NaN : v
  }

  /** level of a wave at time t */
  private waveLevel(w: Wave, t: number): boolean {
    const r = (((t - w.start) % w.period) + w.period) % w.period
    return r < w.high
  }

  /** integrate the pin's output from its cursor up to t (and record edges) */
  private advance(s: PinState, t: number): void {
    const a = Math.max(s.cursor, this.t0)
    const b = Math.min(Math.max(t, this.t0), this.t1)
    if (b <= a) {
      s.cursor = Math.max(s.cursor, b)
      return
    }
    if (s.wave) {
      const w = s.wave
      const H = (x: number) => {
        const d = x - w.start
        const n = Math.floor(d / w.period)
        return n * w.high + Math.min(d - n * w.period, w.high)
      }
      s.acc += H(b) - H(a)
      // edges in (a, b]
      let k = Math.floor((a - w.start) / w.period)
      // very fast waves (a DAC level) have no edges worth publishing
      for (let guard = 0; w.period >= 2e-6 && guard < 4 * MAX_EDGES && s.edges.length < MAX_EDGES; guard++, k++) {
        const rise = w.start + k * w.period
        if (rise > b) break
        if (rise > a) s.edges.push({ t: rise, high: true })
        const fall = rise + w.high
        if (fall > a && fall <= b && w.high > 0 && w.high < w.period) s.edges.push({ t: fall, high: false })
      }
      s.level = this.waveLevel(w, b - 1e-12)
    } else if (s.level) {
      s.acc += b - a
    }
    s.cursor = b
  }

  isOutput(pin: string): boolean {
    return this.states.get(pin)?.mode === 'output'
  }

  setMode(pin: string, mode: PinMode, t: number): void {
    const s = this.states.get(pin)
    if (!s) return
    this.advance(s, t)
    s.mode = mode
    if (mode !== 'output') s.wave = null
  }

  setLevel(pin: string, high: boolean, t: number): void {
    const s = this.states.get(pin)
    if (!s) return
    if (s.mode === null) s.mode = 'output' // Arduino: digitalWrite on an un-configured pin still drives the latch
    this.advance(s, t)
    if (s.wave) {
      s.wave = null
    }
    if (s.level !== high && s.edges.length < MAX_EDGES) s.edges.push({ t: Math.min(Math.max(t, this.t0), this.t1), high })
    s.level = high
  }

  setWave(pin: string, wave: Omit<Wave, 'start'> | null, t: number): void {
    const s = this.states.get(pin)
    if (!s) return
    this.advance(s, t)
    if (!wave) {
      if (s.wave) {
        s.wave = null
        if (s.level && s.edges.length < MAX_EDGES) s.edges.push({ t, high: false })
        s.level = false
      }
      return
    }
    s.mode = 'output'
    // keep the phase when only the duty/period changes (PWM ramps stay smooth)
    const start = s.wave && s.wave.kind === wave.kind ? s.wave.start : Math.max(t, this.t0)
    if (!s.wave && !s.level && s.edges.length < MAX_EDGES && wave.high > 0) s.edges.push({ t: Math.max(t, this.t0), high: true })
    s.wave = { ...wave, start }
  }

  /** Schmitt-trigger digital read (own outputs read back their latch) */
  readDigital(pin: string): boolean {
    const s = this.states.get(pin)
    if (!s) return false
    if (s.damaged) return false
    if (s.mode === 'output') return s.wave ? this.waveLevel(s.wave, this.t0) : s.level
    const v = this.voltage(pin)
    const vcc = this.board.logicV
    if (Number.isNaN(v)) {
      s.read = s.mode === 'pullup'
      return s.read
    }
    if (v > 0.6 * vcc) s.read = true
    else if (v < 0.3 * vcc) s.read = false
    return s.read
  }

  // --------------------------------------------------------------- outputs

  /** finish the step: the drive of every pin for the coming solve */
  endStep(): void {
    const dt = this.t1 - this.t0
    for (const s of this.states.values()) {
      this.advance(s, this.t1)
      s.frac = dt > 0 ? Math.min(1, Math.max(0, s.acc / dt)) : s.level ? 1 : 0
    }
  }

  drive(pin: string): PinDrive | null {
    const s = this.states.get(pin)
    if (!s || s.damaged) return null
    const vcc = this.board.logicV
    switch (s.mode) {
      case 'output':
        return { v: vcc * s.frac, rout: this.rout }
      case 'pullup':
        return { v: vcc, rout: this.rpull }
      case 'pulldown':
        return { v: 0, rout: this.rpull }
      default:
        // input leakage (~5 MΩ): an unconnected / floating input settles LOW
        return { v: 0, rout: 5e6 }
    }
  }

  edges(pin: string): readonly PinEdge[] | null {
    const s = this.states.get(pin)
    return s && s.edges.length ? s.edges : null
  }

  /** on-board LED and other internal pins: lit fraction this step */
  fraction(pin: string): number {
    return this.states.get(pin)?.frac ?? 0
  }

  /**
   * Damage checks for one pin after reading the solved voltage: over-voltage
   * (a 3.3 V board's pin above 3.6 V, any pin below −0.5 V) and over-current
   * of an output. Returns a reason the first time the pin breaks.
   */
  checkDamage(pin: string, dt: number): string | null {
    const s = this.states.get(pin)
    if (!s || s.damaged || pin === 'LED') return null
    const v = this.voltage(pin)
    if (Number.isNaN(v)) return null
    const b = this.board
    if (v > b.absMaxV + 0.15 || v < -0.6) {
      s.overV += dt
      if (s.overV > 1e-3) {
        s.damaged =
          v > 0
            ? `${pin} saw ${v.toFixed(1)} V — the ${b.short} is a ${b.logicV} V board and its pins take at most ${b.absMaxV} V. The pin is damaged; use a voltage divider or a level shifter.`
            : `${pin} was pulled to ${v.toFixed(1)} V, below ground — the pin is damaged.`
        return s.damaged
      }
    } else {
      s.overV = 0
    }
    if (s.mode === 'output') {
      const i = Math.abs((b.logicV * s.frac - v) / this.rout)
      if (i * 1000 > b.maxPinMa * 1.5) {
        s.overI += dt
        if (s.overI > 20e-3) {
          s.damaged = `${pin} had to ${b.logicV * s.frac > v ? 'source' : 'sink'} ${Math.round(i * 1000)} mA — over the ${b.maxPinMa} mA a ${b.short} pin can take. The pin is damaged; put a resistor (220 Ω or more) in series.`
          return s.damaged
        }
      } else {
        s.overI = 0
      }
    }
    return null
  }

  /** a compact per-pin state for the UI */
  summary(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const s of this.states.values()) {
      if (s.damaged) out[s.name] = 'X'
      else if (s.mode === 'output') out[s.name] = s.wave ? 'PWM' : s.level ? 'H' : 'L'
      else if (s.mode) out[s.name] = 'IN'
    }
    return out
  }

  damage(): { pin: string; reason: string }[] {
    const out: { pin: string; reason: string }[] = []
    for (const s of this.states.values()) if (s.damaged) out.push({ pin: s.name, reason: s.damaged })
    return out
  }
}
