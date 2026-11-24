/**
 * The modules a lab Python program can import: gpiozero (LED, PWMLED,
 * RGBLED, Button, Buzzer, TonalBuzzer, Servo, AngularServo, DistanceSensor,
 * MotionSensor, Motor and the generic devices), RPi.GPIO, Adafruit_BBIO
 * (BeagleBone), time, signal, random, math and sys. Devices drive the board's
 * pins through McuIO at the program's own simulated time; background work
 * (blink(), pulse(), callbacks, distance readings) runs as extra tasks in the
 * runtime's scheduler, like gpiozero's background threads.
 *
 * Behaviour follows the gpiozero and RPi.GPIO documentation (both
 * BSD-licensed); the code here is written for the lab.
 */
import type { BoardDef } from '../../model/boards'
import type { McuIO, PinMode } from '../types'
import type { Interp } from './interp'
import {
  Builtin, err, F, int, isNum, num, PyFunc, PyModule, PyObj, PyTuple, str, toList, truthy, type Gen, type Kw, type Value,
} from './values'

export interface Watcher {
  pin: string
  last: boolean
  /** called at the start of a solver step with the pin's level now */
  poll(level: boolean, t: number): void
}

/** what the modules need from the runtime */
export interface PyHost {
  readonly board: BoardDef
  readonly io: McuIO
  readonly interp: Interp
  now(): number
  /** start a background task (owner: cancel it with cancel(owner)) */
  spawn(gen: Gen, name: string, owner?: object): void
  cancel(owner: object): void
  /** run a Python callback as a background task */
  spawnCall(fn: Value, args: Value[], name: string): void
  /** set a pin's mode (pull-ups read as set from the moment they are switched on) */
  pinMode(pin: string, mode: PinMode, t: number): void
  /** a pin's digital level */
  read(pin: string): boolean
  watch(w: Watcher): void
  unwatch(w: Watcher): void
  /** header pin name for a pin argument; `who` names the caller for messages */
  pin(spec: Value, mode: 'bcm' | 'board', who: string): string
  claim(pin: string, owner: Device): void
  release(pin: string, owner: Device): void
  readonly devices: Set<Device>
  random(): number
  seed(n: number): void
  epoch: number
}

const FPS = 25

// --------------------------------------------------------------- helpers

function method(name: string, fn: (args: Value[], kw: Kw) => Value | Gen, gen = false): Builtin {
  return new Builtin(name, fn, gen)
}
function arg(args: Value[], kw: Kw, i: number, name: string, dflt: Value): Value {
  if (kw[name] !== undefined) return kw[name]
  return i < args.length ? args[i] : dflt
}
function seconds(v: Value, what: string): number {
  if (!isNum(v)) throw err('TypeError', `${what} must be a number of seconds, not ${v === null ? 'None' : typeof v}`)
  const s = num(v)
  if (s < 0) throw err('ValueError', `${what} must be 0 or more`)
  return s
}

function* sleepGen(h: PyHost, s: number): Gen {
  yield { k: 'd', line: h.interp.line, until: h.now() + s }
  return null
}

/** wait until test() is true or the timeout (s, null = forever) passes; true if it happened */
function* waitUntil(h: PyHost, test: () => boolean, timeout: number | null): Gen<boolean> {
  const deadline = timeout === null ? Infinity : h.now() + timeout
  for (;;) {
    if (test()) return true
    if (h.now() >= deadline) return false
    yield { k: 'w', line: h.interp.line }
  }
}

// ---------------------------------------------------------------- devices

export abstract class Device extends PyObj {
  closed = false
  readonly pins: string[] = []
  constructor(
    protected readonly h: PyHost,
    readonly type: string,
  ) {
    super()
    h.devices.add(this)
  }
  protected claim(pin: string): string {
    this.h.claim(pin, this)
    this.pins.push(pin)
    return pin
  }
  protected check(): void {
    if (this.closed) throw err('DeviceClosed', `${this.type} is closed or uninitialized`)
  }
  close(): void {
    if (this.closed) return
    this.closed = true
    this.h.cancel(this)
    for (const p of this.pins) {
      this.h.pinMode(p, 'input', this.h.now())
      this.h.release(p, this)
    }
    this.h.devices.delete(this)
  }
  protected common(name: string): Value | undefined {
    if (name === 'close') return method('close', () => (this.close(), null))
    if (name === 'closed') return this.closed
    if (name === 'pin') return this.pins[0] ?? null
    return undefined
  }
  repr(): string {
    if (this.closed) return `<gpiozero.${this.type} object closed>`
    return `<gpiozero.${this.type} object on pin ${this.pins.join(', ')}, is_active=${truthy(this.getAttr('is_active') ?? false) ? 'True' : 'False'}>`
  }
}

/** LED, Buzzer, DigitalOutputDevice, OutputDevice */
class DigitalOut extends Device {
  private active = false
  readonly pin: string
  readonly activeHigh: boolean
  constructor(h: PyHost, type: string, args: Value[], kw: Kw) {
    super(h, type)
    const spec = arg(args, kw, 0, 'pin', null)
    if (spec === null) throw err('GPIODeviceError', `No pin given — e.g. ${type}(17)`)
    this.pin = this.claim(h.pin(spec, 'bcm', type))
    this.activeHigh = truthy(arg(args, kw, 1, 'active_high', true))
    h.pinMode(this.pin, 'output', h.now())
    this.write(truthy(arg(args, kw, 2, 'initial_value', false)))
  }
  write(on: boolean): void {
    this.check()
    this.active = on
    this.h.io.digitalWrite(this.pin, on === this.activeHigh, this.h.now())
  }
  private blinkArgs(args: Value[], kw: Kw, onName: string): { on: number; off: number; n: number | null; bg: boolean } {
    const on = seconds(arg(args, kw, 0, onName === 'beep' ? 'on_time' : 'on_time', F(1)), 'on_time')
    const off = seconds(arg(args, kw, 1, 'off_time', F(1)), 'off_time')
    const n = arg(args, kw, 2, 'n', null)
    return { on, off, n: n === null ? null : int(n, 'n'), bg: truthy(arg(args, kw, 3, 'background', true)) }
  }
  private *blinkLoop(on: number, off: number, n: number | null): Gen {
    for (let i = 0; n === null || i < n; i++) {
      this.write(true)
      yield* sleepGen(this.h, on)
      this.write(false)
      yield* sleepGen(this.h, off)
    }
    return null
  }
  getAttr(name: string): Value | undefined {
    const c = this.common(name)
    if (c !== undefined) return c
    switch (name) {
      case 'on':
        return method(name, () => (this.h.cancel(this), this.write(true), null))
      case 'off':
        return method(name, () => (this.h.cancel(this), this.write(false), null))
      case 'toggle':
        return method(name, () => (this.h.cancel(this), this.write(!this.active), null))
      case 'blink':
      case 'beep': {
        if (name === 'blink' && this.type === 'Buzzer') return undefined
        if (name === 'beep' && this.type !== 'Buzzer') return undefined
        const self = this
        return method(name, function* (args: Value[], kw: Kw): Gen {
          self.check()
          const b = self.blinkArgs(args, kw, name)
          self.h.cancel(self)
          if (b.bg) {
            self.h.spawn(self.blinkLoop(b.on, b.off, b.n), `${self.type}.${name}`, self)
            return null
          }
          return yield* self.blinkLoop(b.on, b.off, b.n)
        }, true)
      }
      case 'value':
        return this.active ? 1 : 0
      case 'is_lit':
      case 'is_active':
        return this.active
      case 'active_high':
        return this.activeHigh
    }
    return undefined
  }
  setAttr(name: string, v: Value): boolean {
    if (name === 'value') {
      this.h.cancel(this)
      this.write(truthy(v))
      return true
    }
    return false
  }
}

/** PWMLED, PWMOutputDevice: value 0..1 as software PWM (100 Hz by default) */
class PwmOut extends Device {
  private v = 0
  readonly pin: string
  readonly activeHigh: boolean
  private hz: number
  constructor(h: PyHost, type: string, args: Value[], kw: Kw, pinArg?: string) {
    super(h, type)
    this.pin = pinArg ?? this.claim(h.pin(arg(args, kw, 0, 'pin', null), 'bcm', type))
    if (pinArg) this.claim(pinArg)
    this.activeHigh = truthy(arg(args, kw, 1, 'active_high', true))
    this.hz = num(arg(args, kw, 3, 'frequency', 100))
    h.pinMode(this.pin, 'output', h.now())
    this.set(num(arg(args, kw, 2, 'initial_value', 0)))
  }
  set(v: number): void {
    this.check()
    if (!(v >= 0 && v <= 1)) throw err('ValueError', `${this.type} value must be between 0 and 1 (got ${v})`)
    this.v = v
    const duty = this.activeHigh ? v : 1 - v
    this.h.io.pwm(this.pin, duty, this.hz, this.h.now())
  }
  private *fade(from: number, to: number, t: number): Gen {
    const steps = Math.max(1, Math.round(t * FPS))
    for (let i = 1; i <= steps; i++) {
      this.set(from + ((to - from) * i) / steps)
      yield* sleepGen(this.h, t / steps)
    }
    return null
  }
  private *blinkLoop(on: number, off: number, fin: number, fout: number, n: number | null): Gen {
    for (let i = 0; n === null || i < n; i++) {
      if (fin > 0) yield* this.fade(0, 1, fin)
      this.set(1)
      if (on > 0) yield* sleepGen(this.h, on)
      if (fout > 0) yield* this.fade(1, 0, fout)
      this.set(0)
      if (off > 0) yield* sleepGen(this.h, off)
    }
    return null
  }
  getAttr(name: string): Value | undefined {
    const c = this.common(name)
    if (c !== undefined) return c
    const self = this
    switch (name) {
      case 'on':
        return method(name, () => (this.h.cancel(this), this.set(1), null))
      case 'off':
        return method(name, () => (this.h.cancel(this), this.set(0), null))
      case 'toggle':
        return method(name, () => (this.h.cancel(this), this.set(1 - this.v), null))
      case 'blink':
      case 'pulse':
        return method(name, function* (args: Value[], kw: Kw): Gen {
          self.check()
          const pulse = name === 'pulse'
          const on = pulse ? 0 : seconds(arg(args, kw, 0, 'on_time', 1), 'on_time')
          const off = pulse ? 0 : seconds(arg(args, kw, 1, 'off_time', 1), 'off_time')
          const fin = seconds(arg(args, kw, pulse ? 0 : 2, 'fade_in_time', pulse ? 1 : 0), 'fade_in_time')
          const fout = seconds(arg(args, kw, pulse ? 1 : 3, 'fade_out_time', pulse ? 1 : 0), 'fade_out_time')
          const nv = arg(args, kw, pulse ? 2 : 4, 'n', null)
          const bg = truthy(arg(args, kw, pulse ? 3 : 5, 'background', true))
          self.h.cancel(self)
          const loop = self.blinkLoop(on, off, fin, fout, nv === null ? null : int(nv, 'n'))
          if (bg) {
            self.h.spawn(loop, `${self.type}.${name}`, self)
            return null
          }
          return yield* loop
        }, true)
      case 'value':
        return F(this.v)
      case 'is_lit':
      case 'is_active':
        return this.v > 0
      case 'frequency':
        return F(this.hz)
    }
    return undefined
  }
  setAttr(name: string, v: Value): boolean {
    if (name === 'value') {
      this.h.cancel(this)
      this.set(num(v))
      return true
    }
    if (name === 'frequency') {
      this.hz = Math.max(1, num(v))
      this.set(this.v)
      return true
    }
    return false
  }
}

class RGBLed extends Device {
  private c: [number, number, number] = [0, 0, 0]
  private readonly ch: string[]
  private readonly activeHigh: boolean
  constructor(h: PyHost, args: Value[], kw: Kw) {
    super(h, 'RGBLED')
    this.ch = ['red', 'green', 'blue'].map((n, i) => this.claim(h.pin(arg(args, kw, i, n, null), 'bcm', 'RGBLED')))
    this.activeHigh = truthy(arg(args, kw, 3, 'active_high', true))
    for (const p of this.ch) h.pinMode(p, 'output', h.now())
    const init = arg(args, kw, 4, 'initial_value', null)
    this.setColor(init === null ? [0, 0, 0] : toList(init).map(num))
  }
  setColor(c: number[]): void {
    this.check()
    if (c.length !== 3 || c.some((x) => !(x >= 0 && x <= 1))) throw err('ValueError', 'RGBLED color must be three values between 0 and 1, e.g. (1, 0, 0) for red')
    this.c = [c[0], c[1], c[2]]
    this.ch.forEach((p, i) => this.h.io.pwm(p, this.activeHigh ? c[i] : 1 - c[i], 100, this.h.now()))
  }
  getAttr(name: string): Value | undefined {
    const c = this.common(name)
    if (c !== undefined) return c
    switch (name) {
      case 'color':
      case 'value':
        return new PyTuple(this.c.map((x) => F(x)))
      case 'red':
        return F(this.c[0])
      case 'green':
        return F(this.c[1])
      case 'blue':
        return F(this.c[2])
      case 'on':
        return method(name, () => (this.setColor([1, 1, 1]), null))
      case 'off':
        return method(name, () => (this.setColor([0, 0, 0]), null))
      case 'toggle':
        return method(name, () => (this.setColor(this.c.map((x) => 1 - x)), null))
      case 'is_lit':
      case 'is_active':
        return this.c.some((x) => x > 0)
    }
    return undefined
  }
  setAttr(name: string, v: Value): boolean {
    if (name === 'color' || name === 'value') {
      this.setColor(toList(v).map(num))
      return true
    }
    const i = ['red', 'green', 'blue'].indexOf(name)
    if (i >= 0) {
      const c = [...this.c]
      c[i] = num(v)
      this.setColor(c)
      return true
    }
    return false
  }
}

/** Button, DigitalInputDevice, MotionSensor, LineSensor */
class DigitalIn extends Device {
  readonly pin: string
  private readonly pullUp: boolean | null
  private readonly activeState: boolean
  private cb: Record<string, Value> = {}
  private holdTime: number
  private holdRepeat: boolean
  private pressedAt: number | null = null
  private heldFired = 0
  private bounce: number
  private lastEvent = -Infinity
  private watcher: Watcher
  private readonly words: { on: string; off: string; is: string; waitOn: string; waitOff: string }
  constructor(h: PyHost, type: string, args: Value[], kw: Kw) {
    super(h, type)
    this.pin = this.claim(h.pin(arg(args, kw, 0, 'pin', null), 'bcm', type))
    const dfltPull = type === 'Button' ? true : type === 'LineSensor' ? false : false
    const pu = arg(args, kw, 1, 'pull_up', dfltPull)
    this.pullUp = pu === null ? null : truthy(pu)
    const as = arg(args, kw, 2, 'active_state', null)
    if (this.pullUp === null && as === null) throw err('PinInvalidState', 'pull_up is None: give active_state=True or False')
    this.activeState = as === null ? !this.pullUp : truthy(as)
    this.bounce = arg(args, kw, 3, 'bounce_time', null) === null ? 0 : num(kw.bounce_time ?? args[3])
    this.holdTime = num(arg(args, kw, 4, 'hold_time', 1))
    this.holdRepeat = truthy(arg(args, kw, 5, 'hold_repeat', false))
    h.pinMode(this.pin, this.pullUp === null ? 'input' : this.pullUp ? 'pullup' : 'pulldown', h.now())
    this.words =
      type === 'MotionSensor'
        ? { on: 'when_motion', off: 'when_no_motion', is: 'motion_detected', waitOn: 'wait_for_motion', waitOff: 'wait_for_no_motion' }
        : type === 'LineSensor'
          ? { on: 'when_line', off: 'when_no_line', is: 'line_detected', waitOn: 'wait_for_line', waitOff: 'wait_for_no_line' }
          : type === 'Button'
            ? { on: 'when_pressed', off: 'when_released', is: 'is_pressed', waitOn: 'wait_for_press', waitOff: 'wait_for_release' }
            : { on: 'when_activated', off: 'when_deactivated', is: 'is_active', waitOn: 'wait_for_active', waitOff: 'wait_for_inactive' }
    const self = this
    this.watcher = {
      pin: this.pin,
      last: false,
      poll(level: boolean, t: number) {
        const on = level === self.activeState
        if (on !== this.last) {
          this.last = on
          if (t - self.lastEvent >= self.bounce) {
            self.lastEvent = t
            self.pressedAt = on ? t : null
            self.heldFired = 0
            self.fire(on ? self.words.on : self.words.off)
          }
        }
        if (on && self.pressedAt !== null && self.cb.when_held) {
          const due = self.pressedAt + self.holdTime * (self.heldFired + 1)
          if (t >= due && (self.heldFired === 0 || self.holdRepeat)) {
            self.heldFired++
            self.fire('when_held')
          }
        }
      },
    }
    h.watch(this.watcher)
  }
  private active(): boolean {
    return this.h.read(this.pin) === this.activeState
  }
  private fire(which: string): void {
    const fn = this.cb[which]
    if (!fn) return
    // gpiozero passes the device when the callback takes one argument
    const wantsDevice = fn instanceof PyFunc && fn.required >= 1
    this.h.spawnCall(fn, wantsDevice ? [this] : [], `${this.type}.${which}`)
  }
  close(): void {
    this.h.unwatch(this.watcher)
    super.close()
  }
  getAttr(name: string): Value | undefined {
    const c = this.common(name)
    if (c !== undefined) return c
    const self = this
    if (name === this.words.is || name === 'is_active' || (this.type === 'Button' && name === 'is_pressed')) return this.active()
    if (name === 'value') return this.active() ? 1 : 0
    if (name === 'is_held') return this.active() && this.pressedAt !== null && this.h.now() - this.pressedAt >= this.holdTime
    if (name === 'held_time') return this.pressedAt === null ? null : F(this.h.now() - this.pressedAt)
    if (name === 'pull_up') return this.pullUp
    if (name === 'hold_time') return F(this.holdTime)
    if (name === this.words.on || name === this.words.off || name === 'when_held' || name === 'when_activated' || name === 'when_deactivated') {
      return this.cb[this.alias(name)] ?? null
    }
    if (name === this.words.waitOn || name === this.words.waitOff || name === 'wait_for_active' || name === 'wait_for_inactive') {
      const want = name === this.words.waitOn || name === 'wait_for_active'
      return method(name, function* (args: Value[], kw: Kw): Gen {
        self.check()
        const t = arg(args, kw, 0, 'timeout', null)
        return yield* waitUntil(self.h, () => self.active() === want, t === null ? null : num(t))
      }, true)
    }
    return undefined
  }
  private alias(name: string): string {
    if (name === 'when_activated') return this.words.on
    if (name === 'when_deactivated') return this.words.off
    return name
  }
  setAttr(name: string, v: Value): boolean {
    const key = this.alias(name)
    if (key === this.words.on || key === this.words.off || key === 'when_held') {
      if (v !== null && !(v instanceof PyFunc) && !(v instanceof Builtin)) {
        throw err('BadEventHandler', `${name} must be a function (no brackets: ${name} = my_function), not ${typeof v === 'object' ? 'that value' : String(v)}`)
      }
      this.cb[key] = v
      return true
    }
    if (name === 'hold_time') {
      this.holdTime = num(v)
      return true
    }
    return false
  }
}

class ServoDev extends Device {
  private v: number | null
  private readonly pin: string
  private readonly minPw: number
  private readonly maxPw: number
  readonly angular: { min: number; max: number } | null
  constructor(h: PyHost, type: 'Servo' | 'AngularServo', args: Value[], kw: Kw) {
    super(h, type)
    this.pin = this.claim(h.pin(arg(args, kw, 0, 'pin', null), 'bcm', type))
    this.angular = type === 'AngularServo' ? { min: num(kw.min_angle ?? -90), max: num(kw.max_angle ?? 90) } : null
    this.minPw = num(kw.min_pulse_width ?? F(1 / 1000))
    this.maxPw = num(kw.max_pulse_width ?? F(2 / 1000))
    h.pinMode(this.pin, 'output', h.now())
    this.v = null
    if (this.angular) {
      const a = arg(args, kw, 1, 'initial_angle', 0)
      this.setValue(a === null ? null : this.angleToValue(num(a)))
    } else {
      const iv = arg(args, kw, 1, 'initial_value', 0)
      this.setValue(iv === null ? null : num(iv))
    }
  }
  private angleToValue(a: number): number {
    const { min, max } = this.angular!
    return ((a - min) / (max - min)) * 2 - 1
  }
  setValue(v: number | null): void {
    this.check()
    if (v !== null && !(v >= -1 && v <= 1)) throw err('ValueError', `Servo value must be between -1 and 1 (or None), got ${v}`)
    this.v = v
    if (v === null) this.h.io.servo(this.pin, null, this.h.now())
    else this.h.io.servo(this.pin, (this.minPw + ((v + 1) / 2) * (this.maxPw - this.minPw)) * 1e6, this.h.now())
  }
  getAttr(name: string): Value | undefined {
    const c = this.common(name)
    if (c !== undefined) return c
    switch (name) {
      case 'value':
        return this.v === null ? null : F(this.v)
      case 'angle': {
        if (!this.angular || this.v === null) return this.angular ? null : undefined
        const { min, max } = this.angular
        return F(min + ((this.v + 1) / 2) * (max - min))
      }
      case 'min':
        return method(name, () => (this.setValue(-1), null))
      case 'mid':
        return method(name, () => (this.setValue(0), null))
      case 'max':
        return method(name, () => (this.setValue(1), null))
      case 'detach':
        return method(name, () => (this.setValue(null), null))
      case 'is_active':
        return this.v !== null
      case 'min_angle':
        return this.angular ? this.angular.min : undefined
      case 'max_angle':
        return this.angular ? this.angular.max : undefined
    }
    return undefined
  }
  setAttr(name: string, v: Value): boolean {
    if (name === 'value') {
      this.setValue(v === null ? null : num(v))
      return true
    }
    if (name === 'angle' && this.angular) {
      if (v === null) this.setValue(null)
      else {
        const a = num(v)
        const { min, max } = this.angular
        if (a < Math.min(min, max) || a > Math.max(min, max)) throw err('ValueError', `AngularServo angle must be between ${min} and ${max}, got ${a}`)
        this.setValue(this.angleToValue(a))
      }
      return true
    }
    return false
  }
}

const NOTE = /^([A-Ga-g])([#b♯♭]?)(-?\d)$/
function noteHz(v: Value): number {
  if (isNum(v)) return num(v)
  const m = NOTE.exec(str(v).trim())
  if (!m) throw err('ValueError', `invalid note ${str(v)} — use a name like "A4" or "C#5", or a frequency in Hz`)
  const semis: Record<string, number> = { c: -9, d: -7, e: -5, f: -4, g: -2, a: 0, b: 2 }
  let n = semis[m[1].toLowerCase()] + (Number(m[3]) - 4) * 12
  if (m[2] === '#' || m[2] === '♯') n++
  if (m[2] === 'b' || m[2] === '♭') n--
  return 440 * 2 ** (n / 12)
}

class TonalBuzzerDev extends Device {
  private hz: number | null = null
  private readonly pin: string
  constructor(h: PyHost, args: Value[], kw: Kw) {
    super(h, 'TonalBuzzer')
    this.pin = this.claim(h.pin(arg(args, kw, 0, 'pin', null), 'bcm', 'TonalBuzzer'))
    h.pinMode(this.pin, 'output', h.now())
  }
  getAttr(name: string): Value | undefined {
    const c = this.common(name)
    if (c !== undefined) return c
    switch (name) {
      case 'play':
        return method(name, (a, kw) => {
          this.check()
          const t = a[0] ?? kw.tone ?? null
          this.hz = t === null ? null : noteHz(t)
          this.h.io.tone(this.pin, this.hz, this.h.now())
          return null
        })
      case 'stop':
        return method(name, () => {
          this.hz = null
          this.h.io.tone(this.pin, null, this.h.now())
          return null
        })
      case 'is_active':
        return this.hz !== null
      case 'tone':
      case 'value':
        return this.hz === null ? null : F(this.hz)
    }
    return undefined
  }
}

class MotorDev extends Device {
  private v = 0
  private readonly fwd: string
  private readonly back: string
  constructor(h: PyHost, args: Value[], kw: Kw) {
    super(h, 'Motor')
    this.fwd = this.claim(h.pin(arg(args, kw, 0, 'forward', null), 'bcm', 'Motor'))
    this.back = this.claim(h.pin(arg(args, kw, 1, 'backward', null), 'bcm', 'Motor'))
    for (const p of [this.fwd, this.back]) h.pinMode(p, 'output', h.now())
    this.set(0)
  }
  set(v: number): void {
    this.check()
    if (!(v >= -1 && v <= 1)) throw err('ValueError', `Motor speed must be between -1 and 1, got ${v}`)
    this.v = v
    this.h.io.pwm(this.fwd, Math.max(0, v), 100, this.h.now())
    this.h.io.pwm(this.back, Math.max(0, -v), 100, this.h.now())
  }
  getAttr(name: string): Value | undefined {
    const c = this.common(name)
    if (c !== undefined) return c
    switch (name) {
      case 'forward':
        return method(name, (a, kw) => (this.set(num(a[0] ?? kw.speed ?? 1)), null))
      case 'backward':
        return method(name, (a, kw) => (this.set(-num(a[0] ?? kw.speed ?? 1)), null))
      case 'stop':
        return method(name, () => (this.set(0), null))
      case 'reverse':
        return method(name, () => (this.set(-this.v), null))
      case 'value':
        return F(this.v)
      case 'is_active':
        return this.v !== 0
    }
    return undefined
  }
  setAttr(name: string, v: Value): boolean {
    if (name !== 'value') return false
    this.set(num(v))
    return true
  }
}

/** HC-SR04 style ultrasonic sensor: a background task measures every 60 ms */
class DistanceDev extends Device {
  private last: number | null = null
  private readonly echo: string
  private readonly trig: string
  private readonly maxD: number
  constructor(h: PyHost, args: Value[], kw: Kw) {
    super(h, 'DistanceSensor')
    this.echo = this.claim(h.pin(arg(args, kw, 0, 'echo', null), 'bcm', 'DistanceSensor'))
    this.trig = this.claim(h.pin(arg(args, kw, 1, 'trigger', null), 'bcm', 'DistanceSensor'))
    this.maxD = num(arg(args, kw, 3, 'max_distance', 1))
    h.pinMode(this.echo, 'input', h.now())
    h.pinMode(this.trig, 'output', h.now())
    h.io.digitalWrite(this.trig, false, h.now())
    h.spawn(this.measure(), 'DistanceSensor', this)
  }
  private *measure(): Gen {
    const h = this.h
    for (;;) {
      h.io.digitalWrite(this.trig, true, h.now())
      yield { k: 'd', line: 0, until: h.now() + 10e-6 }
      h.io.digitalWrite(this.trig, false, h.now())
      const sent = h.now()
      let seen = sent - 1e-9
      const edge = function* (this: DistanceDev, high: boolean, deadline: number): Gen<number | null> {
        for (;;) {
          const e = h.io.edgesOn(this.echo).find((x) => x.t > seen && x.high === high)
          if (e) {
            seen = e.t
            return e.t
          }
          if (h.read(this.echo) === high && h.now() > sent + 50e-6) {
            seen = h.now()
            return h.now()
          }
          if (h.now() >= deadline) return null
          yield { k: 'w', line: 0 }
        }
      }.bind(this)
      const rise = yield* edge(true, sent + 0.03)
      const fall = rise === null ? null : yield* edge(false, rise + 0.04)
      this.last = rise !== null && fall !== null ? Math.min(this.maxD, ((fall - rise) * 343) / 2) : null
      yield { k: 'd', line: 0, until: sent + 0.06 }
    }
  }
  getAttr(name: string): Value | undefined {
    const c = this.common(name)
    if (c !== undefined) return c
    switch (name) {
      case 'distance':
      case 'value':
        return this.last === null ? F(this.maxD) : F(this.last)
      case 'max_distance':
        return F(this.maxD)
    }
    return undefined
  }
}

function gpiozero(h: PyHost): PyModule {
  const cls = (name: string, make: (args: Value[], kw: Kw) => Device) => new Builtin(name, (a, kw) => make(a, kw))
  const attrs: Record<string, Value> = {
    LED: cls('LED', (a, kw) => new DigitalOut(h, 'LED', a, kw)),
    Buzzer: cls('Buzzer', (a, kw) => new DigitalOut(h, 'Buzzer', a, kw)),
    DigitalOutputDevice: cls('DigitalOutputDevice', (a, kw) => new DigitalOut(h, 'DigitalOutputDevice', a, kw)),
    OutputDevice: cls('OutputDevice', (a, kw) => new DigitalOut(h, 'OutputDevice', a, kw)),
    PWMLED: cls('PWMLED', (a, kw) => new PwmOut(h, 'PWMLED', a, kw)),
    PWMOutputDevice: cls('PWMOutputDevice', (a, kw) => new PwmOut(h, 'PWMOutputDevice', a, kw)),
    RGBLED: cls('RGBLED', (a, kw) => new RGBLed(h, a, kw)),
    Button: cls('Button', (a, kw) => new DigitalIn(h, 'Button', a, kw)),
    DigitalInputDevice: cls('DigitalInputDevice', (a, kw) => new DigitalIn(h, 'DigitalInputDevice', a, kw)),
    InputDevice: cls('InputDevice', (a, kw) => new DigitalIn(h, 'DigitalInputDevice', a, kw)),
    MotionSensor: cls('MotionSensor', (a, kw) => new DigitalIn(h, 'MotionSensor', a, kw)),
    LineSensor: cls('LineSensor', (a, kw) => new DigitalIn(h, 'LineSensor', a, kw)),
    Servo: cls('Servo', (a, kw) => new ServoDev(h, 'Servo', a, kw)),
    AngularServo: cls('AngularServo', (a, kw) => new ServoDev(h, 'AngularServo', a, kw)),
    TonalBuzzer: cls('TonalBuzzer', (a, kw) => new TonalBuzzerDev(h, a, kw)),
    Motor: cls('Motor', (a, kw) => new MotorDev(h, a, kw)),
    DistanceSensor: cls('DistanceSensor', (a, kw) => new DistanceDev(h, a, kw)),
    Device: cls('Device', () => {
      throw err('TypeError', 'Device is a base class — use LED, Button, …')
    }),
  }
  return new PyModule('gpiozero', attrs)
}

function tones(): PyModule {
  return new PyModule('gpiozero.tones', { Tone: new Builtin('Tone', (a, kw) => F(kw.midi !== undefined ? 440 * 2 ** ((num(kw.midi) - 69) / 12) : noteHz(a[0] ?? kw.frequency ?? kw.note ?? 440))) })
}

// ------------------------------------------------------------- RPi.GPIO

class PwmObj extends PyObj {
  readonly type = 'PWM'
  private duty = 0
  private running = false
  constructor(
    private readonly h: PyHost,
    private readonly pin: string,
    private hz: number,
  ) {
    super()
  }
  private apply(): void {
    this.h.io.pwm(this.pin, this.running ? this.duty / 100 : 0, this.hz, this.h.now())
  }
  private dutyOf(v: Value): number {
    const d = num(v)
    if (!(d >= 0 && d <= 100)) throw err('ValueError', `dutycycle must have a value from 0.0 to 100.0 (got ${d})`)
    return d
  }
  stop(): void {
    this.running = false
    this.apply()
  }
  getAttr(name: string): Value | undefined {
    switch (name) {
      case 'start':
        return method(name, (a) => {
          this.duty = this.dutyOf(a[0] ?? 0)
          this.running = true
          this.apply()
          return null
        })
      case 'ChangeDutyCycle':
        return method(name, (a) => {
          this.duty = this.dutyOf(a[0])
          this.apply()
          return null
        })
      case 'ChangeFrequency':
        return method(name, (a) => {
          const f = num(a[0])
          if (!(f > 0)) throw err('ValueError', 'frequency must be greater than 0.0')
          this.hz = f
          this.apply()
          return null
        })
      case 'stop':
        return method(name, () => (this.stop(), null))
    }
    return undefined
  }
}

const RPI = { BOARD: 10, BCM: 11, OUT: 0, IN: 1, HIGH: 1, LOW: 0, PUD_OFF: 20, PUD_DOWN: 21, PUD_UP: 22, RISING: 31, FALLING: 32, BOTH: 33 }

/** RPi.GPIO (Raspberry Pi) or Adafruit_BBIO.GPIO (BeagleBone: header names like "P8_10") */
function gpioModule(h: PyHost, flavour: 'rpi' | 'bbio'): PyModule {
  let mode: 'bcm' | 'board' | null = flavour === 'bbio' ? 'bcm' : null
  const setup = new Map<string, 'out' | 'in'>()
  const pwms = new Map<string, PwmObj>()
  const events = new Map<string, { w: Watcher; detected: boolean; callbacks: Value[]; channel: Value }>()
  const need = (who: string) => {
    if (!mode) throw err('RuntimeError', `Please set pin numbering mode using GPIO.setmode(GPIO.BOARD) or GPIO.setmode(GPIO.BCM) before GPIO.${who}()`)
    return mode
  }
  const chan = (c: Value, who: string): string => {
    const m = need(who)
    if (flavour === 'bbio' && typeof c !== 'string') throw err('ValueError', `BeagleBone pins are named like "P8_10" (got ${str(c)})`)
    return h.pin(c, m, `GPIO.${who}`)
  }
  const list = (v: Value): Value[] => (Array.isArray(v) || v instanceof PyTuple ? toList(v) : [v])
  const edgeOk = (edge: number, level: boolean) => edge === RPI.BOTH || (edge === RPI.RISING ? level : !level)

  const attrs: Record<string, Value> = {
    ...RPI,
    VERSION: '0.7.1',
    RPI_INFO: null,
    setmode: method('setmode', (a) => {
      const m = a[0] === RPI.BCM ? 'bcm' : a[0] === RPI.BOARD ? 'board' : null
      if (!m) throw err('ValueError', 'An invalid mode was passed to setmode() — use GPIO.BCM or GPIO.BOARD')
      if (mode && mode !== m) throw err('ValueError', 'A different mode has already been set!')
      mode = m
      return null
    }),
    getmode: method('getmode', () => (mode === 'bcm' ? RPI.BCM : mode === 'board' ? RPI.BOARD : null)),
    setwarnings: method('setwarnings', () => null),
    setup: method('setup', (a, kw) => {
      const dir = int(arg(a, kw, 1, 'direction', null), 'direction')
      const pud = int(arg(a, kw, 2, 'pull_up_down', RPI.PUD_OFF), 'pull_up_down')
      const initial = arg(a, kw, 3, 'initial', -1)
      for (const c of list(a[0] ?? kw.channel ?? null)) {
        const p = chan(c, 'setup')
        if (dir === RPI.OUT) {
          h.pinMode(p, 'output', h.now())
          if (initial !== -1 && initial !== null) h.io.digitalWrite(p, truthy(initial), h.now())
          setup.set(p, 'out')
        } else if (dir === RPI.IN) {
          h.pinMode(p, pud === RPI.PUD_UP ? 'pullup' : pud === RPI.PUD_DOWN ? 'pulldown' : 'input', h.now())
          setup.set(p, 'in')
        } else throw err('ValueError', 'An invalid direction was passed to setup() — use GPIO.OUT or GPIO.IN')
      }
      return null
    }),
    output: method('output', (a) => {
      const chans = list(a[0])
      const vals = Array.isArray(a[1]) || a[1] instanceof PyTuple ? toList(a[1]) : chans.map(() => a[1])
      if (vals.length !== chans.length) throw err('RuntimeError', 'Number of channels != number of values')
      chans.forEach((c, i) => {
        const p = chan(c, 'output')
        if (setup.get(p) !== 'out') throw err('RuntimeError', `The GPIO channel has not been set up as an OUTPUT — call GPIO.setup(${str(c)}, GPIO.OUT) first`)
        h.io.digitalWrite(p, truthy(vals[i]), h.now())
      })
      return null
    }),
    input: method('input', (a) => {
      const p = chan(a[0], 'input')
      if (!setup.has(p)) throw err('RuntimeError', `You must setup() the GPIO channel first — GPIO.setup(${str(a[0])}, GPIO.IN)`)
      return h.read(p) ? 1 : 0
    }),
    cleanup: method('cleanup', (a) => {
      const only = a.length && a[0] !== null ? new Set(list(a[0]).map((c) => chan(c, 'cleanup'))) : null
      for (const p of [...setup.keys()]) {
        if (only && !only.has(p)) continue
        pwms.get(p)?.stop()
        pwms.delete(p)
        const ev = events.get(p)
        if (ev) h.unwatch(ev.w)
        events.delete(p)
        h.pinMode(p, 'input', h.now())
        setup.delete(p)
      }
      if (!only && flavour === 'rpi') mode = null
      return null
    }),
    PWM: new Builtin('PWM', (a, kw) => {
      const p = chan(a[0], 'PWM')
      if (setup.get(p) !== 'out') throw err('RuntimeError', `You must setup() the GPIO channel as an output first — GPIO.setup(${str(a[0])}, GPIO.OUT)`)
      if (pwms.has(p)) throw err('RuntimeError', 'A PWM object already exists for this GPIO channel')
      const hz = num(arg(a, kw, 1, 'frequency', null))
      if (!(hz > 0)) throw err('ValueError', 'frequency must be greater than 0.0')
      const o = new PwmObj(h, p, hz)
      pwms.set(p, o)
      return o
    }),
    add_event_detect: method('add_event_detect', (a, kw) => {
      const p = chan(a[0], 'add_event_detect')
      if (setup.get(p) !== 'in') throw err('RuntimeError', 'You must setup() the GPIO channel as an input first')
      if (events.has(p)) throw err('RuntimeError', 'Conflicting edge detection already enabled for this GPIO channel')
      const edge = int(arg(a, kw, 1, 'edge', null), 'edge')
      const cb = arg(a, kw, 2, 'callback', null)
      const bounce = (num(arg(a, kw, 3, 'bouncetime', 0) ?? 0) || 0) / 1000
      let lastAt = -Infinity
      const ev = {
        detected: false,
        callbacks: cb === null ? [] : [cb],
        channel: a[0],
        w: {
          pin: p,
          last: h.read(p),
          poll(level: boolean, t: number) {
            if (level === this.last) return
            this.last = level
            if (!edgeOk(edge, level) || t - lastAt < bounce) return
            lastAt = t
            ev.detected = true
            for (const f of ev.callbacks) h.spawnCall(f, [ev.channel], 'GPIO event callback')
          },
        } as Watcher,
      }
      events.set(p, ev)
      h.watch(ev.w)
      return null
    }),
    add_event_callback: method('add_event_callback', (a, kw) => {
      const p = chan(a[0], 'add_event_callback')
      const ev = events.get(p)
      if (!ev) throw err('RuntimeError', 'Add event detection using add_event_detect first before adding a callback')
      ev.callbacks.push(arg(a, kw, 1, 'callback', null))
      return null
    }),
    remove_event_detect: method('remove_event_detect', (a) => {
      const p = chan(a[0], 'remove_event_detect')
      const ev = events.get(p)
      if (ev) h.unwatch(ev.w)
      events.delete(p)
      return null
    }),
    event_detected: method('event_detected', (a) => {
      const ev = events.get(chan(a[0], 'event_detected'))
      if (!ev?.detected) return false
      ev.detected = false
      return true
    }),
    wait_for_edge: method('wait_for_edge', function* (a: Value[], kw: Kw): Gen {
      const p = chan(a[0], 'wait_for_edge')
      if (setup.get(p) !== 'in') throw err('RuntimeError', 'You must setup() the GPIO channel as an input first')
      const edge = int(arg(a, kw, 1, 'edge', null), 'edge')
      const timeout = arg(a, kw, 3, 'timeout', null)
      let last = h.read(p)
      const hit = yield* waitUntil(h, () => {
        const now = h.read(p)
        const changed = now !== last
        last = now
        return changed && edgeOk(edge, now)
      }, timeout === null ? null : num(timeout) / 1000)
      return hit ? a[0] : null
    }, true),
    gpio_function: method('gpio_function', (a) => {
      const s = setup.get(chan(a[0], 'gpio_function'))
      return s === 'out' ? RPI.OUT : RPI.IN
    }),
  }
  if (flavour === 'rpi') attrs.RPI_INFO = null
  return new PyModule(flavour === 'rpi' ? 'RPi.GPIO' : 'Adafruit_BBIO.GPIO', attrs)
}

/** Adafruit_BBIO.PWM: duty 0–100 %, default 2 kHz */
function bbioPwm(h: PyHost): PyModule {
  const state = new Map<string, { duty: number; hz: number; pol: number }>()
  const apply = (p: string) => {
    const s = state.get(p)!
    h.io.pwm(p, s.pol ? 1 - s.duty / 100 : s.duty / 100, s.hz, h.now())
  }
  const pin = (v: Value) => h.pin(v, 'bcm', 'PWM')
  return new PyModule('Adafruit_BBIO.PWM', {
    start: method('start', (a, kw) => {
      const p = pin(a[0])
      h.pinMode(p, 'output', h.now())
      state.set(p, { duty: num(arg(a, kw, 1, 'duty_cycle', 0)), hz: num(arg(a, kw, 2, 'frequency', 2000)), pol: int(arg(a, kw, 3, 'polarity', 0)) })
      apply(p)
      return null
    }),
    set_duty_cycle: method('set_duty_cycle', (a) => {
      const p = pin(a[0])
      const s = state.get(p)
      if (!s) throw err('RuntimeError', 'You must start() the PWM channel first')
      const d = num(a[1])
      if (!(d >= 0 && d <= 100)) throw err('ValueError', 'duty_cycle must have a value from 0.0 to 100.0')
      s.duty = d
      apply(p)
      return null
    }),
    set_frequency: method('set_frequency', (a) => {
      const p = pin(a[0])
      const s = state.get(p)
      if (!s) throw err('RuntimeError', 'You must start() the PWM channel first')
      s.hz = Math.max(1, num(a[1]))
      apply(p)
      return null
    }),
    stop: method('stop', (a) => {
      const p = pin(a[0])
      h.io.pwm(p, 0, 1000, h.now())
      state.delete(p)
      return null
    }),
    cleanup: method('cleanup', () => {
      for (const p of state.keys()) h.io.pwm(p, 0, 1000, h.now())
      state.clear()
      return null
    }),
  })
}

/** Adafruit_BBIO.ADC: AIN0–AIN6, 0–1.8 V → 0.0–1.0 (read) or 0–4095 (read_raw) */
function bbioAdc(h: PyHost): PyModule {
  let ready = false
  const read = (v: Value): number => {
    if (!ready) throw err('RuntimeError', 'ADC not set up — call ADC.setup() first')
    const s = str(v)
    const p = /^AIN\d$/.test(s) ? Object.keys(h.board.adc).find((k) => h.board.adc[k] === Number(s.slice(3))) : h.pin(v, 'bcm', 'ADC.read')
    if (!p || h.board.adc[p] === undefined) throw err('ValueError', `${s} is not an analog input — use P9_33 … P9_40 (AIN0–AIN6)`)
    const volts = h.io.voltage(p)
    const full = h.board.adcMaxV ?? h.board.logicV
    return Number.isNaN(volts) ? 0 : Math.max(0, Math.min(1, volts / full))
  }
  return new PyModule('Adafruit_BBIO.ADC', {
    setup: method('setup', () => ((ready = true), null)),
    read: method('read', (a) => F(Math.round(read(a[0]) * 4095) / 4095)),
    read_raw: method('read_raw', (a) => F(Math.round(read(a[0]) * 4095))),
  })
}

// ------------------------------------------------------------ std library

function timeModule(h: PyHost): PyModule {
  const sleep = new Builtin('sleep', function* (a: Value[]): Gen {
    if (!a.length) throw err('TypeError', 'sleep() takes exactly one argument (seconds)')
    return yield* sleepGen(h, seconds(a[0], 'sleep length'))
  }, true)
  const wall = () => h.epoch + h.now()
  const parts = (t: number) => {
    const d = new Date(t * 1000)
    return { Y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), H: d.getUTCHours(), M: d.getUTCMinutes(), S: d.getUTCSeconds(), w: d.getUTCDay() }
  }
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const p2 = (n: number) => String(n).padStart(2, '0')
  return new PyModule('time', {
    sleep,
    time: method('time', () => F(wall())),
    time_ns: method('time_ns', () => Math.round(wall() * 1e9)),
    monotonic: method('monotonic', () => F(h.now())),
    perf_counter: method('perf_counter', () => F(h.now())),
    process_time: method('process_time', () => F(h.now())),
    strftime: method('strftime', (a) => {
      const t = parts(wall())
      return str(a[0]).replace(/%([YmdHMSaAbBpIyj%])/g, (_m, c: string) => {
        switch (c) {
          case 'Y': return String(t.Y)
          case 'y': return p2(t.Y % 100)
          case 'm': return p2(t.m)
          case 'd': return p2(t.d)
          case 'H': return p2(t.H)
          case 'I': return p2(((t.H + 11) % 12) + 1)
          case 'p': return t.H < 12 ? 'AM' : 'PM'
          case 'M': return p2(t.M)
          case 'S': return p2(t.S)
          case 'a': return DAYS[t.w]
          case 'A': return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][t.w]
          case 'b': return MONTHS[t.m - 1]
          case 'B': return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][t.m - 1]
          case 'j': return String(Math.floor((Date.UTC(t.Y, t.m - 1, t.d) - Date.UTC(t.Y, 0, 0)) / 864e5)).padStart(3, '0')
          default: return '%'
        }
      })
    }),
    ctime: method('ctime', () => {
      const t = parts(wall())
      return `${DAYS[t.w]} ${MONTHS[t.m - 1]} ${String(t.d).padStart(2)} ${p2(t.H)}:${p2(t.M)}:${p2(t.S)} ${t.Y}`
    }),
  })
}

function randomModule(h: PyHost): PyModule {
  const randint = (a: number, b: number) => a + Math.floor(h.random() * (b - a + 1))
  return new PyModule('random', {
    random: method('random', () => F(h.random())),
    randint: method('randint', (a) => {
      const lo = int(a[0])
      const hi = int(a[1])
      if (hi < lo) throw err('ValueError', `empty range for randint(${lo}, ${hi})`)
      return randint(lo, hi)
    }),
    randrange: method('randrange', (a) => {
      const [lo, hi, step] = a.length === 1 ? [0, int(a[0]), 1] : [int(a[0]), int(a[1]), a[2] === undefined ? 1 : int(a[2])]
      const n = Math.ceil((hi - lo) / step)
      if (n <= 0) throw err('ValueError', 'empty range for randrange()')
      return lo + step * Math.floor(h.random() * n)
    }),
    uniform: method('uniform', (a) => F(num(a[0]) + h.random() * (num(a[1]) - num(a[0])))),
    choice: method('choice', (a) => {
      const xs = toList(a[0])
      if (!xs.length) throw err('IndexError', 'Cannot choose from an empty sequence')
      return xs[Math.floor(h.random() * xs.length)]
    }),
    shuffle: method('shuffle', (a) => {
      const xs = a[0]
      if (!Array.isArray(xs)) throw err('TypeError', 'shuffle() needs a list')
      for (let i = xs.length - 1; i > 0; i--) {
        const j = Math.floor(h.random() * (i + 1))
        ;[xs[i], xs[j]] = [xs[j], xs[i]]
      }
      return null
    }),
    seed: method('seed', (a) => (h.seed(a.length && a[0] !== null ? Math.trunc(num(isNum(a[0]) ? a[0] : str(a[0]).length)) : 1), null)),
  })
}

function mathModule(): PyModule {
  const f1 = (name: string, fn: (x: number) => number) =>
    method(name, (a) => {
      const r = fn(num(a[0]))
      if (Number.isNaN(r) && !Number.isNaN(num(a[0]))) throw err('ValueError', 'math domain error')
      return F(r)
    })
  return new PyModule('math', {
    pi: F(Math.PI),
    e: F(Math.E),
    tau: F(2 * Math.PI),
    inf: F(Infinity),
    nan: F(NaN),
    sqrt: f1('sqrt', Math.sqrt),
    sin: f1('sin', Math.sin),
    cos: f1('cos', Math.cos),
    tan: f1('tan', Math.tan),
    asin: f1('asin', Math.asin),
    acos: f1('acos', Math.acos),
    atan: f1('atan', Math.atan),
    exp: f1('exp', Math.exp),
    log10: f1('log10', Math.log10),
    log2: f1('log2', Math.log2),
    fabs: f1('fabs', Math.abs),
    radians: f1('radians', (x) => (x * Math.PI) / 180),
    degrees: f1('degrees', (x) => (x * 180) / Math.PI),
    log: method('log', (a) => {
      const x = num(a[0])
      if (x <= 0) throw err('ValueError', 'math domain error')
      return F(a.length > 1 ? Math.log(x) / Math.log(num(a[1])) : Math.log(x))
    }),
    atan2: method('atan2', (a) => F(Math.atan2(num(a[0]), num(a[1])))),
    hypot: method('hypot', (a) => F(Math.hypot(...a.map(num)))),
    pow: method('pow', (a) => F(num(a[0]) ** num(a[1]))),
    floor: method('floor', (a) => Math.floor(num(a[0]))),
    ceil: method('ceil', (a) => Math.ceil(num(a[0]))),
    trunc: method('trunc', (a) => Math.trunc(num(a[0]))),
    isnan: method('isnan', (a) => Number.isNaN(num(a[0]))),
    isinf: method('isinf', (a) => !Number.isFinite(num(a[0])) && !Number.isNaN(num(a[0]))),
    copysign: method('copysign', (a) => F(Math.sign(num(a[1]) || 1) * Math.abs(num(a[0])))),
    fmod: method('fmod', (a) => F(num(a[0]) % num(a[1]))),
    gcd: method('gcd', (a) => {
      let x = Math.abs(int(a[0]))
      let y = Math.abs(int(a[1]))
      while (y) [x, y] = [y, x % y]
      return x
    }),
    isclose: method('isclose', (a, kw) => {
      const x = num(a[0])
      const y = num(a[1])
      const rel = kw.rel_tol === undefined ? 1e-9 : num(kw.rel_tol)
      const abs = kw.abs_tol === undefined ? 0 : num(kw.abs_tol)
      return Math.abs(x - y) <= Math.max(rel * Math.max(Math.abs(x), Math.abs(y)), abs)
    }),
  })
}

/** the import table for a board: Raspberry Pi (gpiozero, RPi.GPIO) or BeagleBone (Adafruit_BBIO) */
export function makeModules(h: PyHost): (name: string) => PyModule | null {
  const cache = new Map<string, PyModule>()
  const pi = (h.board.python ?? 'pi') === 'pi'
  const makers: Record<string, () => PyModule> = {
    time: () => timeModule(h),
    random: () => randomModule(h),
    math: () => mathModule(),
    signal: () =>
      new PyModule('signal', {
        pause: new Builtin('pause', function* (): Gen {
          // sleep until the program is stopped; callbacks keep running
          yield { k: 'd', line: h.interp.line, until: Infinity }
          return null
        }, true),
        SIGINT: 2,
        SIGTERM: 15,
      }),
    sys: () =>
      new PyModule('sys', {
        exit: method('exit', () => {
          throw err('SystemExit', '')
        }),
        version: '3.11.2 (Circuit Lab)',
        platform: 'linux',
        argv: ['main.py'],
        maxsize: 2 ** 53 - 1,
      }),
  }
  if (pi) {
    makers.gpiozero = () => gpiozero(h)
    makers['gpiozero.tones'] = () => tones()
    makers.RPi = () => new PyModule('RPi', { GPIO: get('RPi.GPIO')! })
    makers['RPi.GPIO'] = () => gpioModule(h, 'rpi')
  } else {
    makers.Adafruit_BBIO = () => new PyModule('Adafruit_BBIO', { GPIO: get('Adafruit_BBIO.GPIO')!, PWM: get('Adafruit_BBIO.PWM')!, ADC: get('Adafruit_BBIO.ADC')! })
    makers['Adafruit_BBIO.GPIO'] = () => gpioModule(h, 'bbio')
    makers['Adafruit_BBIO.PWM'] = () => bbioPwm(h)
    makers['Adafruit_BBIO.ADC'] = () => bbioAdc(h)
  }
  function get(name: string): PyModule | null {
    const hit = cache.get(name)
    if (hit) return hit
    const make = makers[name]
    if (!make) {
      if (!pi && (name === 'gpiozero' || name.startsWith('RPi'))) {
        throw err('ModuleNotFoundError', `No module named '${name}' — ${name.split('.')[0]} is for the Raspberry Pi. On the ${h.board.short} use Adafruit_BBIO: import Adafruit_BBIO.GPIO as GPIO`)
      }
      if (pi && name.startsWith('Adafruit_BBIO')) {
        throw err('ModuleNotFoundError', `No module named '${name}' — Adafruit_BBIO is for the BeagleBone. On a Raspberry Pi use gpiozero or RPi.GPIO`)
      }
      return null
    }
    const m = make()
    cache.set(name, m)
    return m
  }
  return get
}

export { noteHz }
