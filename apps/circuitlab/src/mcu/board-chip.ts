/**
 * A microcontroller board as a chip in ohmlet's mixed-signal bridge
 * (src/sim/chip-api.ts). Every solver step it:
 *
 *  1. reads its pins' node voltages from the previous solve (inputs, ADC),
 *     checks them for damage (5 V into a 3.3 V board, over-current),
 *  2. runs the program for exactly this step of simulated time
 *     (Instant mode or avr8js) against the PinBank,
 *  3. drives each pin as a Norton source {v, rout}: outputs at Vcc × the
 *     fraction of the step they were high through ~25 Ω, pull-ups through
 *     ~35 kΩ, USB-powered 5V / 3V3 header pins as stiff supplies.
 *
 * Board runtimes never see the solver; they only talk to McuIO.
 */
import { boardDef, type BoardDef } from '../model/boards'
import type { ComponentInstance, ComponentTelemetry, ParamValue } from '../model/types'
import { registerChip } from '../sim/chip-api'
import type { ChipInstance, ChipStepCtx, PinEdge } from '../sim/chip-api'
import { cachedHex } from './avr/compile'
import { AvrRuntime } from './avr/runtime'
import { FastRuntime } from './fast/runtime'
import { PinBank } from './pins'
import { serialBus } from './serial'
import type { McuIO, McuRuntime, PinMode } from './types'

const SUPPLY_ROUT = 0.05
/** power-on reset: the program starts once supplies have settled (an Uno waits ~65 ms) */
export const BOOT_TIME = 0.01
/** chips by component id, newest engine wins — the UI reads state and sends serial input here */
const live = new Map<string, BoardChip>()

export function liveBoard(id: string): BoardChip | undefined {
  return live.get(id)
}

export class BoardChip implements ChipInstance, McuIO {
  readonly board: BoardDef
  readonly bank: PinBank
  runtime: McuRuntime | null = null
  private ctx: ChipStepCtx | null = null
  private dead: string | null = null
  private warned = new Set<string>()
  private lastT = 0
  private supplyStress = 0

  constructor(readonly comp: ComponentInstance) {
    this.board = boardDef(comp.type) as BoardDef
    this.bank = new PinBank(this.board)
    const code = String(comp.params?.code ?? '')
    const want = String(comp.params?.runtime ?? 'fast')
    if (want === 'avr' && this.board.runtimes.includes('avr')) {
      const hex = cachedHex(comp.type, code)
      if (hex) this.runtime = new AvrRuntime(comp.type, hex)
      else {
        this.runtime = null
        this.dead = null
      }
    } else {
      this.runtime = new FastRuntime(comp.type, code)
    }
    live.set(comp.id, this)
  }

  /** program not ready (Compiled mode without a compiled program) */
  get needsCompile(): boolean {
    return this.runtime === null
  }

  // ------------------------------------------------------------ chip

  step(ctx: ChipStepCtx): void {
    this.ctx = ctx
    const t0 = ctx.time
    const t1 = ctx.time + ctx.dt
    this.lastT = t1
    this.bank.beginStep(t0, t1, (p) => ctx.readPin(p))

    // damage checks on the solved voltages of the last step
    for (const pin of this.bank.gpioPins()) {
      const why = this.bank.checkDamage(pin, ctx.dt)
      if (why) ctx.issue?.('error', `${this.comp.id}: ${why}`)
    }
    this.checkSupplies(ctx)

    if (t0 < BOOT_TIME) {
      // still in power-on reset: the pins float, nothing runs
    } else if (!this.dead && this.runtime) {
      try {
        this.runtime.run(t0, t1, this)
      } catch (err) {
        this.runtime.state = 'error'
        this.runtime.error = err instanceof Error ? err.message : String(err)
      }
      if (this.runtime.state === 'error' && this.runtime.error) this.warnOnce(`${this.comp.id}: ${this.runtime.error}`, 'error')
    } else if (!this.runtime && !this.dead) {
      this.warnOnce(`${this.comp.id}: Compiled mode needs the sketch compiled first — press Run in the Code panel.`, 'warning')
    }
    this.bank.endStep()

    // drives
    const b = this.board
    for (const pin of this.bank.gpioPins()) {
      if (pin === 'LED') continue
      ctx.drivePin(pin, this.dead ? null : this.bank.drive(pin))
    }
    for (const s of b.supplies) ctx.drivePin(s.pin, this.dead ? null : { v: s.v, rout: SUPPLY_ROUT })
    ctx.drivePin(b.ground, { v: 0, rout: 0.01 })
  }

  /** 5 V fed into a 3.3 V board's 3V3 pin, or a supply pin shorted to GND */
  private checkSupplies(ctx: ChipStepCtx): void {
    if (this.dead) return
    for (const s of this.board.supplies) {
      const v = ctx.readPin(s.pin)
      if (Number.isNaN(v)) continue
      const i = (s.v - v) / SUPPLY_ROUT
      if (Math.abs(i) > 1.5) {
        this.supplyStress += ctx.dt
        if (this.supplyStress > 2e-3) {
          this.dead =
            i < 0
              ? `${this.comp.id}: ${v.toFixed(1)} V was pushed into the ${s.pin} pin — the ${this.board.short}'s regulator is damaged. Never connect another supply to ${s.pin}.`
              : `${this.comp.id}: the ${s.pin} pin is shorted to ground (${Math.round(Math.abs(i))} A) — the board shut down. Check the wire from ${s.pin}.`
          ctx.issue?.('error', this.dead)
        }
        return
      }
    }
    this.supplyStress = 0
  }

  outputs(): Record<string, boolean> {
    const out: Record<string, boolean> = {}
    for (const pin of this.bank.gpioPins()) if (this.bank.isOutput(pin)) out[pin] = this.bank.fraction(pin) > 0.5
    return out
  }

  edges(pin: string): readonly PinEdge[] | null {
    return this.bank.edges(pin)
  }

  setRuntimeParam(_key: string, _value: ParamValue): void {}

  /** the on-board LED: lit while its pin is high, or low for an active-low LED (driven as an output) */
  private ledLit(): boolean {
    const pin = this.board.ledPin
    if (!this.board.ledActiveLow) return this.bank.fraction(pin) > 0.05
    return this.bank.state(pin)?.mode === 'output' && this.bank.fraction(pin) < 0.95
  }

  fillTelemetry(t: ComponentTelemetry): void {
    const rt = this.runtime
    const damage = this.bank.damage()
    if (this.dead) damage.unshift({ pin: 'board', reason: this.dead })
    t.mcu = {
      runtime: rt?.kind ?? 'avr',
      state: this.dead ? 'error' : rt ? rt.state : 'waiting',
      line: rt?.line,
      led: !this.dead && this.ledLit(),
      pins: this.bank.summary(),
      damage,
      error: this.dead ?? rt?.error,
      millis: Math.floor(this.lastT * 1000),
    }
    if (damage.length) t.damaged = damage[0].reason
  }

  // --------------------------------------------------------- McuIO

  pinMode(pin: string, mode: PinMode, t: number): void {
    this.bank.setMode(pin, mode, t)
  }

  digitalWrite(pin: string, high: boolean, t: number): void {
    const s = this.bank.state(pin)
    if (!s) return
    if (s.mode !== 'output' && this.runtime?.kind === 'fast') {
      // Arduino: writing an INPUT pin HIGH only turns on its pull-up
      if (this.board.mcu.startsWith('ATmega')) {
        this.bank.setMode(pin, high ? 'pullup' : 'input', t)
        if (high) this.warn(`${this.board.short}: ${pin} is written HIGH but was never set to OUTPUT — that only turns on its weak pull-up (an LED glows faintly). Add pinMode(${pin.replace(/^D/, '')}, OUTPUT) in setup().`)
        return
      }
      this.bank.setMode(pin, 'output', t)
    }
    this.bank.setLevel(pin, high, t)
  }

  pwm(pin: string, duty: number, hz: number, t: number): void {
    if (duty <= 0 || duty >= 1) {
      this.bank.setWave(pin, null, t)
      this.bank.setMode(pin, 'output', t)
      this.bank.setLevel(pin, duty >= 1, t)
      return
    }
    // hz 0 = a steady analog level (ESP32 DAC): a very fast wave without edges
    const period = hz > 0 ? 1 / hz : 1e-7
    this.bank.setWave(pin, { period, high: duty * period, kind: hz > 0 ? 'pwm' : 'tone' }, t)
  }

  servo(pin: string, us: number | null, t: number): void {
    this.bank.setWave(pin, us === null ? null : { period: 0.02, high: us / 1e6, kind: 'servo' }, t)
  }

  tone(pin: string, hz: number | null, t: number): void {
    this.bank.setWave(pin, hz === null ? null : { period: 1 / hz, high: 0.5 / hz, kind: 'tone' }, t)
  }

  digitalRead(pin: string): boolean {
    return this.bank.readDigital(pin)
  }

  voltage(pin: string): number {
    return this.bank.voltage(pin)
  }

  edgesOn(pin: string): PinEdge[] {
    if (this.bank.state(pin)?.damaged) return [] // a burnt input sees nothing
    return this.ctx?.pinEdges?.(pin) ?? []
  }

  /** I²C devices answering at `address` that are wired to BOTH SDA and SCL */
  private i2cDevice(address: number) {
    const ctx = this.ctx
    if (!ctx?.peers) return null
    const onScl = ctx.peers(this.board.i2c.scl)
    for (const p of ctx.peers(this.board.i2c.sda)) {
      if (p.i2c && p.i2c.address === address && onScl.includes(p) && p.i2c.ready()) return p.i2c
    }
    return null
  }

  i2cWrite(address: number, bytes: number[]): boolean {
    const dev = this.i2cDevice(address)
    if (!dev) return false
    if (bytes.length) dev.write(bytes)
    return true
  }

  i2cRead(address: number, n: number): number[] | null {
    const dev = this.i2cDevice(address)
    return dev?.read ? dev.read(n) : null
  }

  neopixel(pin: string, pixels: number[]): boolean {
    let ok = false
    for (const p of this.ctx?.peers?.(pin) ?? []) {
      if (p.neopixelShow) {
        p.neopixelShow(pixels)
        ok = true
      }
    }
    return ok
  }

  dht(pin: string): { temperature: number; humidity: number } | null {
    for (const p of this.ctx?.peers?.(pin) ?? []) {
      const r = p.dhtRead?.()
      if (r) return r
    }
    return null
  }

  serialWrite(text: string): void {
    serialBus.write(this.comp.id, text)
  }

  warn(message: string): void {
    this.warnOnce(message, 'warning')
  }

  private warnOnce(message: string, level: 'error' | 'warning'): void {
    if (this.warned.has(message)) return
    this.warned.add(message)
    this.ctx?.issue?.(level, message)
  }

  // -------------------------------------------------------------- UI

  serialIn(text: string): void {
    this.runtime?.serialIn(text)
  }
}

registerChip('mcu', (comp) => new BoardChip(comp))
