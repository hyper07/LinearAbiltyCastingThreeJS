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
import { PythonRuntime } from './python/runtime'
import { DEFAULT_PYTHON } from '../model/catalog-lab'
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
  /** the USB cable is plugged in (the board's own 5 V) — `usb: false` = unplugged */
  private readonly usb: boolean
  /** unplugged: the pin an outside supply feeds the board through (VIN, VSYS, 5V, 3V3 …) */
  private fed: string | null = null
  private fedMin = 0
  private powered = true
  /** when power last arrived (power-on reset counts from here) */
  private poweredAt = 0

  constructor(readonly comp: ComponentInstance) {
    this.board = boardDef(comp.type) as BoardDef
    this.usb = comp.params?.usb !== false
    this.bank = new PinBank(this.board)
    // a Raspberry Pi without a program of its own runs the panel's default (Blink on GPIO17)
    const code = comp.params?.code !== undefined ? String(comp.params.code) : this.board.runtimes[0] === 'python' ? DEFAULT_PYTHON(this.board) : ''
    const want = String(comp.params?.runtime ?? 'fast')
    if (want === 'avr' && this.board.runtimes.includes('avr')) {
      const hex = cachedHex(comp.type, code)
      if (hex) this.runtime = new AvrRuntime(comp.type, hex)
      else {
        this.runtime = null
        this.dead = null
      }
    } else if (this.board.runtimes.includes('python') && (want === 'python' || !this.board.runtimes.includes(want as 'fast'))) {
      // Raspberry Pi / BeagleBone: the program is Python
      this.runtime = new PythonRuntime(comp.type, code)
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
    const was = this.powered
    this.powered = this.hasPower(ctx)
    if (this.powered && !was) this.poweredAt = t0
    if (!this.powered) this.warnOnce(`${this.comp.id}: no power — its USB cable is unplugged and nothing feeds ${this.powerInputs().join(' / ')}. Plug the USB cable in, or wire a supply to one of those pins (and GND).`, 'warning')

    if (!this.powered) {
      // unpowered: the program does not run and every pin floats
    } else if (t0 - this.poweredAt < BOOT_TIME) {
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
    const off = !!this.dead || !this.powered
    for (const pin of this.bank.gpioPins()) {
      if (pin === 'LED') continue
      ctx.drivePin(pin, off ? null : this.bank.drive(pin))
    }
    // the pin an outside supply feeds is an input now — the board does not fight it
    for (const s of b.supplies) ctx.drivePin(s.pin, off || !this.drives(s.pin, s.v) ? null : { v: s.v, rout: SUPPLY_ROUT })
    ctx.drivePin(b.ground, { v: 0, rout: 0.01 })
  }

  /** pins an outside supply can power the board through, with the least voltage each needs */
  private powerInputs(): string[] {
    return this.inputs().map((i) => i.pin)
  }

  private inputs(): { pin: string; min: number }[] {
    const b = this.board
    const out: { pin: string; min: number }[] = []
    const own = new Set(b.supplies.map((s) => s.pin))
    // VIN through the on-board regulator (an Uno's wants 7–12 V; it still starts at ~6 V)
    if (b.pins.includes('VIN') && !own.has('VIN')) out.push({ pin: 'VIN', min: b.logicV >= 5 ? 6 : 4.2 })
    if (b.pins.includes('VSYS') && !own.has('VSYS')) out.push({ pin: 'VSYS', min: 1.8 })
    for (const s of [...b.supplies].sort((a, c) => c.v - a.v)) out.push({ pin: s.pin, min: s.v * 0.9 })
    return out
  }

  /** powered: USB plugged in, or an outside supply on a power input (the pin that powers it is remembered) */
  private hasPower(ctx: ChipStepCtx): boolean {
    if (this.usb) {
      this.fed = null
      return true
    }
    const g = ctx.readPin(this.board.ground)
    const gnd = Number.isNaN(g) ? 0 : g
    const ok = (pin: string, min: number) => {
      const v = ctx.readPin(pin)
      return !Number.isNaN(v) && v - gnd >= min
    }
    if (this.fed && ok(this.fed, this.fedMin)) return true
    this.fed = null
    for (const i of this.inputs()) {
      if (ok(i.pin, i.min)) {
        this.fed = i.pin
        this.fedMin = i.min
        return true
      }
    }
    return false
  }

  /** a supply pin the board drives: with USB all of them; fed from outside, only the rails below the input */
  private drives(pin: string, v: number): boolean {
    if (!this.fed) return true
    if (pin === this.fed) return false
    const fedSupply = this.board.supplies.find((s) => s.pin === this.fed)
    return !fedSupply || v < fedSupply.v
  }

  /** 5 V fed into a 3.3 V board's 3V3 pin, or a supply pin shorted to GND */
  private checkSupplies(ctx: ChipStepCtx): void {
    if (this.dead || !this.powered) return
    for (const s of this.board.supplies) {
      if (!this.drives(s.pin, s.v)) continue
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
      state: this.dead ? 'error' : !this.powered ? 'stopped' : rt ? rt.state : 'waiting',
      line: rt?.line,
      led: !this.dead && this.powered && this.ledLit(),
      powered: this.powered,
      powerFrom: !this.powered ? undefined : this.usb ? 'USB' : (this.fed ?? undefined),
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
