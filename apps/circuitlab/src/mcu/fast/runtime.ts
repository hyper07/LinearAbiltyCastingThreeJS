/**
 * Instant mode: runs a transpiled sketch (transpile.ts) in simulation time.
 *
 * The program has its own clock (`cpu`). Every yield hands control back:
 * delay() moves the clock to the wake-up time, each loop iteration costs a
 * microsecond, and a wait for an input ends the current solver step. The
 * scheduler runs the program only up to the end of the step it is given, so
 * the sketch and the circuit advance together — a 1 s delay is 1 s of
 * simulated time, at any simulation speed.
 *
 * Arduino core API here; library shims in libs.ts. Started from OpenCircuit
 * 3D's fast runtime (MIT, see NOTICE), rebuilt for simulation time.
 */
import { boardDef, hasPwm, resolveBoardPin, type BoardDef } from '../../model/boards'
import type { McuIO, McuRuntime, PinMode } from '../types'
import { makeLibraries } from './libs'
import { KNOWN_CLASSES, transpile } from './transpile'

/** what the library shims may use */
export interface FastHost {
  io: McuIO
  now(): number
  pin(p: unknown): string | null
  format(v: unknown, fmt?: unknown): string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Gen = Generator<Yielded, any, unknown>
interface Yielded {
  k: 'L' | 'd' | 'w'
  line: number
  until?: number
}

const LOOP_COST = 1e-6
const LOOP_CALL_COST = 4e-6
const MAX_RESUMES_PER_STEP = 20000

/** A char value: prints as a character, compares and calculates as its code. */
class Char extends Number {
  toString(): string {
    return String.fromCharCode(this.valueOf())
  }
}
const charCache = new Map<number, Char>()
function charOf(v: unknown): Char {
  const n = (typeof v === 'string' ? v.charCodeAt(0) : Number(v)) & 0xff
  let c = charCache.get(n)
  if (!c) {
    c = new Char(n)
    charCache.set(n, c)
  }
  return c
}
class FloatBox {
  constructor(readonly v: number) {}
}

// Arduino String helpers (instance methods C++ sketches call)
const SP = String.prototype as unknown as Record<string, unknown>
if (!SP.toInt) {
  Object.defineProperty(SP, 'toInt', { value(this: string) { return parseInt(this, 10) || 0 } })
  Object.defineProperty(SP, 'toFloat', { value(this: string) { return parseFloat(this) || 0 } })
  Object.defineProperty(SP, 'equals', { value(this: string, o: unknown) { return this === String(o) } })
  Object.defineProperty(SP, 'equalsIgnoreCase', { value(this: string, o: unknown) { return this.toLowerCase() === String(o).toLowerCase() } })
  Object.defineProperty(SP, 'c_str', { value(this: string) { return this } })
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface CompiledSketch {
  ok: boolean
  error?: string
  /** (api) => program */
  factory?: (...args: unknown[]) => { setup: (() => Gen) | null; loop: (() => Gen) | null }
  names?: string[]
}

const API_NAMES = [
  'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'INPUT_PULLDOWN', 'LED_BUILTIN', 'CHANGE', 'RISING', 'FALLING',
  'HEX', 'DEC', 'BIN', 'OCT', 'PI', 'HALF_PI', 'TWO_PI', 'DEG_TO_RAD', 'RAD_TO_DEG', 'NEO_GRB', 'NEO_RGB', 'NEO_KHZ800',
  'DHT11', 'DHT22', 'SSD1306_SWITCHCAPVCC', 'SSD1306_WHITE', 'SSD1306_BLACK', 'SSD1306_INVERSE', 'WHITE', 'BLACK',
  'INVERSE', 'OLED_RESET',
  'pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'analogReadResolution', 'analogWriteResolution',
  'analogWriteFreq', 'analogWriteRange', 'analogReference', 'millis', 'micros', 'map', 'constrain', 'min', 'max', 'abs',
  'pow', 'sqrt', 'sq', 'sin', 'cos', 'tan', 'atan', 'atan2', 'floor', 'ceil', 'round', 'fabs', 'log', 'log10', 'exp',
  'random', 'randomSeed', 'bitRead', 'bitWrite', 'bitSet', 'bitClear', 'bit', 'lowByte', 'highByte', 'tone', 'noTone',
  'attachInterrupt', 'detachInterrupt', 'digitalPinToInterrupt', 'interrupts', 'noInterrupts', 'isnan', 'isinf',
  'ledcSetup', 'ledcAttachPin', 'ledcAttach', 'ledcWrite', 'ledcWriteTone', 'dacWrite', 'touchRead', 'F', 'String',
  'Serial', 'Serial1', 'Serial2', 'Wire', ...KNOWN_CLASSES,
  '__int', '__byte', '__c', '__cat', '__F', '__arr', '__arr2', '__sizeof', '__L', '__rt',
]

/** Transpile + build the sketch factory (cached by source). */
const compiled = new Map<string, CompiledSketch>()
export function compileSketch(source: string, board: BoardDef): CompiledSketch {
  const key = `${board.type}\u0000${source}`
  const hit = compiled.get(key)
  if (hit) return hit
  let result: CompiledSketch
  try {
    const { js } = transpile(source)
    const analog = Object.keys(board.analogAlias)
    const names = [...API_NAMES, ...analog, ...Object.keys(board.pinAliases ?? {})]
    const body = `"use strict";\n{\n${js}\n;return { setup: typeof setup === "function" ? setup : null, loop: typeof loop === "function" ? loop : null };\n}`
    // eslint-disable-next-line no-new-func
    const factory = new Function(...names, body) as CompiledSketch['factory']
    result = { ok: true, factory, names }
  } catch (err) {
    result = { ok: false, error: friendlySyntax(err) }
  }
  if (compiled.size > 64) compiled.clear()
  compiled.set(key, result)
  return result
}

function friendlySyntax(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  return `Instant mode could not read this sketch: ${msg}. Instant mode understands the usual Arduino C++ (variables, arrays, functions, if/for/while/switch and the lab's libraries); try Compiled mode on an Uno or Nano for full C++.`
}

export class FastRuntime implements McuRuntime, FastHost {
  readonly kind = 'fast' as const
  state: McuRuntime['state'] = 'running'
  error?: string
  line?: number
  io!: McuIO
  private cpu = 0
  private t1 = 0
  private program: { setup: (() => Gen) | null; loop: (() => Gen) | null } | null = null
  private gen: Gen | null = null
  private phase: 'setup' | 'loop' = 'setup'
  private rx: number[] = []
  private rand = mulberry(1)
  private adcBits: number
  private pwmBits: number
  private pwmHz: number
  private ledc = new Map<number, { hz: number; bits: number; pin: string | null }>()
  private ledcPins = new Map<string, { hz: number; bits: number }>()
  private isrs: { pin: string; mode: number; fn: () => Gen; last: boolean }[] = []
  private timers: { at: number; fn: () => void }[] = []
  private readonly board: BoardDef

  constructor(boardType: string, private readonly source: string) {
    this.board = boardDef(boardType) as BoardDef
    this.adcBits = this.board.adcBits
    this.pwmBits = this.board.pwmBits
    this.pwmHz = this.board.pwmHz
  }

  // ----------------------------------------------------------- FastHost

  now(): number {
    return this.cpu
  }

  pin(p: unknown): string | null {
    return resolveBoardPin(this.board, typeof p === 'object' && p !== null ? Number(p) : p)
  }

  format(v: unknown, fmt?: unknown): string {
    if (v instanceof Char) return v.toString()
    if (v instanceof FloatBox) return fmt !== undefined ? v.v.toFixed(Number(fmt)) : v.v.toFixed(2)
    if (typeof v === 'number') {
      if (fmt === 16) return Math.trunc(v).toString(16).toUpperCase()
      if (fmt === 2) return Math.trunc(v).toString(2)
      if (fmt === 8) return Math.trunc(v).toString(8)
      if (fmt === 10) return String(Math.trunc(v))
      if (typeof fmt === 'number') return v.toFixed(fmt)
      if (!Number.isFinite(v)) return Number.isNaN(v) ? 'nan' : 'inf'
      return Number.isInteger(v) ? String(v) : v.toFixed(2)
    }
    if (typeof v === 'boolean') return v ? '1' : '0'
    if (v === null || v === undefined) return ''
    return String(v)
  }

  // -------------------------------------------------------- McuRuntime

  serialIn(text: string): void {
    for (const ch of text) this.rx.push(ch.charCodeAt(0) & 0xff)
  }

  run(t0: number, t1: number, io: McuIO): void {
    this.io = io
    this.t1 = t1
    if (this.state === 'error' || this.state === 'stopped') return
    if (!this.program && !this.start()) return
    if (this.cpu < t0) this.cpu = t0
    this.serviceInterrupts()
    let resumes = 0
    while (this.cpu < t1 && resumes++ < MAX_RESUMES_PER_STEP) {
      this.runTimers()
      if (!this.gen) {
        if (this.phase === 'setup') {
          this.gen = this.program!.setup ? this.program!.setup() : null
          if (!this.gen) this.phase = 'loop'
          continue
        }
        if (!this.program!.loop) {
          this.state = 'waiting'
          this.cpu = t1
          return
        }
        this.gen = this.program!.loop()
      }
      let r: IteratorResult<Yielded, unknown>
      try {
        r = this.gen.next()
      } catch (err) {
        this.fail(err)
        return
      }
      if (r.done) {
        this.gen = null
        if (this.phase === 'setup') this.phase = 'loop'
        else this.cpu += LOOP_CALL_COST
        continue
      }
      const y = r.value
      if (y.line) this.line = y.line
      if (y.k === 'L') this.cpu += LOOP_COST
      else if (y.k === 'd') this.cpu = Math.max(this.cpu, y.until ?? this.cpu)
      else if (y.k === 'w') {
        this.cpu = Math.max(this.cpu, t1)
        return
      }
    }
    if (resumes >= MAX_RESUMES_PER_STEP) this.cpu = Math.max(this.cpu, t1)
  }

  private fail(err: unknown): void {
    this.state = 'error'
    const msg = err instanceof Error ? err.message : String(err)
    this.error = `Line ${this.line ?? '?'}: ${msg}`
    this.io.serialWrite(`\n[sketch stopped] ${this.error}\n`)
  }

  private start(): boolean {
    const c = compileSketch(this.source, this.board)
    if (!c.ok || !c.factory || !c.names) {
      this.state = 'error'
      this.error = c.error
      return false
    }
    const api = this.api()
    try {
      this.program = c.factory(...c.names.map((n) => api[n]))
    } catch (err) {
      this.fail(err)
      return false
    }
    this.state = 'running'
    return true
  }

  private runTimers(): void {
    if (!this.timers.length) return
    const due = this.timers.filter((t) => t.at <= this.cpu)
    if (!due.length) return
    this.timers = this.timers.filter((t) => t.at > this.cpu)
    for (const t of due) t.fn()
  }

  private serviceInterrupts(): void {
    for (const isr of this.isrs) {
      const level = this.io.digitalRead(isr.pin)
      const edge =
        level !== isr.last &&
        (isr.mode === 1 || (isr.mode === 3 && level) || (isr.mode === 2 && !level))
      isr.last = level
      if (!edge) continue
      try {
        const g = isr.fn()
        for (let i = 0; i < 10000 && !g.next().done; i++);
      } catch (err) {
        this.fail(err)
        return
      }
    }
  }

  // -------------------------------------------------------------- API

  private need(p: unknown, what: string): string | null {
    const name = this.pin(p)
    if (!name) this.io.warn(`${this.board.short}: ${what}(${String(p)}) — there is no pin ${String(p)} on this board.`)
    return name
  }

  private api(): Record<string, unknown> {
    const rt = this
    const b = this.board
    const io = () => rt.io
    const libs = makeLibraries(this)
    const toInt = (v: unknown) => {
      const n = Number(v)
      return Number.isFinite(n) ? Math.trunc(n) : 0
    }
    const analogAliases: Record<string, unknown> = {}
    for (const [a, n] of Object.entries(b.analogAlias)) analogAliases[a] = n
    // board pin constants (NodeMCU D0…D8, STM32 PA0…PC15)
    for (const [a, n] of Object.entries(b.pinAliases ?? {})) analogAliases[a] = n

    const serial = {
      baud: 0,
      begin(baud: number) {
        serial.baud = baud
      },
      end() {},
      print(v: unknown, fmt?: unknown) {
        const s = rt.format(v, fmt)
        io().serialWrite(s)
        return s.length
      },
      println(v: unknown = '', fmt?: unknown) {
        const s = rt.format(v, fmt) + '\n'
        io().serialWrite(s)
        return s.length
      },
      printf(f: string, ...args: unknown[]) {
        let k = 0
        const s = String(f).replace(/%(-?\d*)(?:\.(\d+))?([dfsicxlu%])/g, (_m, _w, prec, t) => {
          if (t === '%') return '%'
          const a = args[k++]
          if (t === 'f') return Number(a).toFixed(prec ? Number(prec) : 6)
          if (t === 'x') return toInt(a).toString(16)
          if (t === 'c') return rt.format(charOf(a))
          if (t === 'd' || t === 'i' || t === 'l' || t === 'u') return String(toInt(a))
          return rt.format(a)
        })
        io().serialWrite(s)
        return s.length
      },
      write(v: unknown) {
        io().serialWrite(typeof v === 'string' ? v : String.fromCharCode(toInt(v) & 0xff))
        return 1
      },
      available: () => rt.rx.length,
      read: () => (rt.rx.length ? (rt.rx.shift() as number) : -1),
      peek: () => (rt.rx.length ? rt.rx[0] : -1),
      flush() {},
      setTimeout() {},
      readString() {
        const s = String.fromCharCode(...rt.rx)
        rt.rx = []
        return s
      },
      readStringUntil(c: unknown) {
        const code = typeof c === 'string' ? c.charCodeAt(0) : Number(c)
        const i = rt.rx.indexOf(code)
        const take = i >= 0 ? rt.rx.splice(0, i + 1).slice(0, -1) : rt.rx.splice(0)
        return String.fromCharCode(...take)
      },
      parseInt() {
        let s = ''
        while (rt.rx.length && !/[-\d]/.test(String.fromCharCode(rt.rx[0]))) rt.rx.shift()
        while (rt.rx.length && /[-\d]/.test(String.fromCharCode(rt.rx[0]))) s += String.fromCharCode(rt.rx.shift() as number)
        return parseInt(s, 10) || 0
      },
      parseFloat() {
        let s = ''
        while (rt.rx.length && !/[-\d.]/.test(String.fromCharCode(rt.rx[0]))) rt.rx.shift()
        while (rt.rx.length && /[-\d.]/.test(String.fromCharCode(rt.rx[0]))) s += String.fromCharCode(rt.rx.shift() as number)
        return parseFloat(s) || 0
      },
    }

    const pinMode = (p: unknown, mode: unknown) => {
      const name = rt.need(p, 'pinMode')
      if (!name) return
      const m = Number(mode)
      const pm: PinMode = m === 1 ? 'output' : m === 2 ? 'pullup' : m === 3 ? 'pulldown' : 'input'
      if (pm === 'output' && b.inputOnly.includes(name)) {
        io().warn(`${b.short}: ${name} is input-only — it cannot be an OUTPUT. Pick another GPIO.`)
        return
      }
      if (pm === 'pulldown' && b.type.startsWith('arduino')) {
        io().warn(`${b.short}: AVR boards have no INPUT_PULLDOWN — use a 10 kΩ resistor to GND instead.`)
        io().pinMode(name, 'input', rt.cpu)
        return
      }
      io().pinMode(name, pm, rt.cpu)
    }

    const analogWrite = (p: unknown, value: unknown) => {
      const name = rt.need(p, 'analogWrite')
      if (!name) return
      const full = 2 ** rt.pwmBits - 1
      const v = Math.max(0, Math.min(full, Number(value) || 0))
      if (!hasPwm(b, name)) {
        io().warn(`${b.short}: ${name} has no PWM — analogWrite only switches it fully on or off. PWM pins: ${Array.isArray(b.pwm) ? b.pwm.join(', ') : 'any output GPIO'}.`)
        io().digitalWrite(name, v >= full / 2, rt.cpu)
        return
      }
      io().pwm(name, v / full, rt.pwmHz, rt.cpu)
    }

    const ledcWrite = (chOrPin: unknown, duty: unknown) => {
      const n = Number(chOrPin)
      const ch = rt.ledc.get(n)
      if (ch?.pin) {
        io().pwm(ch.pin, Math.max(0, Math.min(1, Number(duty) / (2 ** ch.bits - 1))), ch.hz, rt.cpu)
        return
      }
      const name = rt.pin(chOrPin)
      const cfg = name ? rt.ledcPins.get(name) : undefined
      if (name && cfg) io().pwm(name, Math.max(0, Math.min(1, Number(duty) / (2 ** cfg.bits - 1))), cfg.hz, rt.cpu)
      else io().warn(`${b.short}: ledcWrite(${String(chOrPin)}) before ledcAttach/ledcAttachPin.`)
    }

    const api: Record<string, unknown> = {
      HIGH: 1,
      LOW: 0,
      INPUT: 0,
      OUTPUT: 1,
      INPUT_PULLUP: 2,
      INPUT_PULLDOWN: 3,
      LED_BUILTIN: b.ledBuiltin,
      CHANGE: 1,
      FALLING: 2,
      RISING: 3,
      HEX: 16,
      DEC: 10,
      BIN: 2,
      OCT: 8,
      PI: Math.PI,
      HALF_PI: Math.PI / 2,
      TWO_PI: Math.PI * 2,
      DEG_TO_RAD: Math.PI / 180,
      RAD_TO_DEG: 180 / Math.PI,
      NEO_GRB: 0x52,
      NEO_RGB: 0x06,
      NEO_KHZ800: 0,
      DHT11: 11,
      DHT22: 22,
      SSD1306_SWITCHCAPVCC: 2,
      SSD1306_WHITE: 1,
      SSD1306_BLACK: 0,
      SSD1306_INVERSE: 2,
      WHITE: 1,
      BLACK: 0,
      INVERSE: 2,
      OLED_RESET: -1,
      pinMode,
      digitalWrite(p: unknown, v: unknown) {
        const name = rt.need(p, 'digitalWrite')
        if (!name) return
        const high = !!Number(v)
        const st = io()
        if (b.inputOnly.includes(name)) {
          st.warn(`${b.short}: ${name} is input-only — digitalWrite does nothing there.`)
          return
        }
        st.digitalWrite(name, high, rt.cpu)
      },
      digitalRead(p: unknown) {
        const name = rt.need(p, 'digitalRead')
        return name && io().digitalRead(name) ? 1 : 0
      },
      analogRead(p: unknown) {
        // analogRead(0) on an Arduino means A0
        let name: string | null = null
        if (typeof p === 'number' && p >= 0 && p < 16 && b.analogAlias[`A${p}`] !== undefined) name = rt.pin(b.analogAlias[`A${p}`])
        else name = rt.pin(p)
        if (!name || b.adc[name] === undefined) {
          io().warn(`${b.short}: analogRead(${String(p)}) — that pin has no ADC. Use ${Object.keys(b.analogAlias).length ? Object.keys(b.analogAlias).join(', ') : 'an ADC-capable GPIO'}.`)
          return 0
        }
        const v = io().voltage(name)
        if (Number.isNaN(v)) return 0
        const full = 2 ** rt.adcBits - 1
        return Math.round(Math.max(0, Math.min(1, v / b.logicV)) * full)
      },
      analogWrite,
      analogReadResolution(bits: number) {
        rt.adcBits = Math.max(1, Math.min(16, toInt(bits)))
      },
      analogWriteResolution(bits: number) {
        rt.pwmBits = Math.max(1, Math.min(16, toInt(bits)))
      },
      analogWriteFreq(hz: number) {
        rt.pwmHz = Math.max(1, Number(hz))
      },
      analogWriteRange(range: number) {
        rt.pwmBits = Math.log2(Math.max(2, Number(range) + 1))
      },
      analogReference() {},
      millis: () => Math.floor(rt.cpu * 1000),
      micros: () => Math.floor(rt.cpu * 1e6),
      map(x: number, a: number, b2: number, c: number, d: number) {
        if (b2 === a) return c
        const allInt = [x, a, b2, c, d].every(Number.isInteger)
        const v = ((x - a) * (d - c)) / (b2 - a) + c
        return allInt ? Math.trunc(v) : v
      },
      constrain: (x: number, a: number, b2: number) => Math.max(a, Math.min(b2, x)),
      min: (a: number, b2: number) => Math.min(a, b2),
      max: (a: number, b2: number) => Math.max(a, b2),
      abs: (a: number) => Math.abs(a),
      pow: Math.pow,
      sqrt: Math.sqrt,
      sq: (a: number) => a * a,
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      atan: Math.atan,
      atan2: Math.atan2,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      fabs: Math.abs,
      log: Math.log,
      log10: Math.log10,
      exp: Math.exp,
      random(a: number, b2?: number) {
        const lo = b2 === undefined ? 0 : a
        const hi = b2 === undefined ? a : b2
        return Math.floor(lo + rt.rand() * (hi - lo))
      },
      randomSeed(s: number) {
        rt.rand = mulberry(toInt(s))
      },
      bitRead: (v: number, n: number) => (toInt(v) >> n) & 1,
      bitWrite: (v: number, n: number, x: number) => (x ? toInt(v) | (1 << n) : toInt(v) & ~(1 << n)),
      bitSet: (v: number, n: number) => toInt(v) | (1 << n),
      bitClear: (v: number, n: number) => toInt(v) & ~(1 << n),
      bit: (n: number) => 1 << n,
      lowByte: (v: number) => toInt(v) & 0xff,
      highByte: (v: number) => (toInt(v) >> 8) & 0xff,
      tone(p: unknown, hz: number, duration?: number) {
        const name = rt.need(p, 'tone')
        if (!name) return
        io().tone(name, Math.max(1, Number(hz)), rt.cpu)
        if (duration && duration > 0) rt.timers.push({ at: rt.cpu + duration / 1000, fn: () => rt.io.tone(name, null, rt.cpu) })
      },
      noTone(p: unknown) {
        const name = rt.need(p, 'noTone')
        if (name) io().tone(name, null, rt.cpu)
      },
      attachInterrupt(n: number, fn: () => Gen, mode: number) {
        let p = Number(n)
        if (b.type.startsWith('arduino') && (p === 0 || p === 1)) p = p === 0 ? 2 : 3
        const name = rt.pin(p)
        if (!name || typeof fn !== 'function') return
        rt.isrs = rt.isrs.filter((i) => i.pin !== name)
        rt.isrs.push({ pin: name, mode: Number(mode), fn, last: rt.io.digitalRead(name) })
      },
      detachInterrupt(n: number) {
        const name = rt.pin(n)
        rt.isrs = rt.isrs.filter((i) => i.pin !== name)
      },
      digitalPinToInterrupt: (p: number) => p,
      interrupts() {},
      noInterrupts() {},
      isnan: (v: number) => Number.isNaN(Number(v)),
      isinf: (v: number) => !Number.isFinite(Number(v)) && !Number.isNaN(Number(v)),
      ledcSetup(ch: number, hz: number, bits: number) {
        rt.ledc.set(Number(ch), { hz: Number(hz), bits: Number(bits), pin: null })
        return hz
      },
      ledcAttachPin(p: unknown, ch: number) {
        const c = rt.ledc.get(Number(ch))
        const name = rt.pin(p)
        if (c && name) c.pin = name
      },
      ledcAttach(p: unknown, hz: number, bits: number) {
        const name = rt.pin(p)
        if (name) rt.ledcPins.set(name, { hz: Number(hz), bits: Number(bits) })
        return true
      },
      ledcWrite,
      ledcWriteTone(ch: number, hz: number) {
        const c = rt.ledc.get(Number(ch))
        const name = c?.pin ?? rt.pin(ch)
        if (name) io().tone(name, Number(hz) > 0 ? Number(hz) : null, rt.cpu)
      },
      dacWrite(p: unknown, v: number) {
        const name = rt.pin(p)
        if (!name || (name !== 'D25' && name !== 'D26')) {
          io().warn(`${b.short}: dacWrite works on GPIO 25 and 26 only.`)
          return
        }
        io().pwm(name, Math.max(0, Math.min(255, Number(v))) / 255, 0, rt.cpu)
      },
      touchRead: () => 60,
      F: (s: string) => s,
      String(v: unknown = '', fmt?: unknown) {
        return rt.format(v, fmt)
      },
      Serial: serial,
      Serial1: serial,
      Serial2: serial,
      Wire: libs.Wire,
      Servo: libs.Servo,
      LiquidCrystal_I2C: libs.LiquidCrystal_I2C,
      Adafruit_SSD1306: libs.Adafruit_SSD1306,
      Adafruit_NeoPixel: libs.Adafruit_NeoPixel,
      DHT: libs.DHT,
      __int: toInt,
      __byte: (v: unknown) => toInt(v) & 0xff,
      __c: charOf,
      __cat: (s: unknown, v: unknown) => String(s ?? '') + rt.format(v),
      __F: (v: number) => new FloatBox(Number(v)),
      __arr: (n: number) => new Array(Math.max(0, toInt(n))).fill(0),
      __arr2: (n: number, m: number) => Array.from({ length: Math.max(0, toInt(n)) }, () => new Array(Math.max(0, toInt(m))).fill(0)),
      __sizeof: (v: unknown) => (Array.isArray(v) ? v.length * 2 : typeof v === 'string' ? v.length + 1 : 4),
      __L: (() => {
        const y: Yielded = { k: 'L', line: 0 }
        return (line: number) => {
          y.line = line
          return y
        }
      })(),
      __rt: {
        *delay(line: number, ms: number): Gen {
          yield { k: 'd', line, until: rt.cpu + Math.max(0, Number(ms) || 0) / 1000 }
        },
        *delayMicroseconds(line: number, us: number): Gen {
          yield { k: 'd', line, until: rt.cpu + Math.max(0, Number(us) || 0) / 1e6 }
        },
        *yield(line: number): Gen {
          yield { k: 'L', line }
        },
        *pulseIn(line: number, p: unknown, level: unknown, timeout = 1e6): Gen {
          return yield* rt.pulseIn(line, p, !!Number(level), Number(timeout))
        },
        *pulseInLong(line: number, p: unknown, level: unknown, timeout = 1e6): Gen {
          return yield* rt.pulseIn(line, p, !!Number(level), Number(timeout))
        },
      },
      ...analogAliases,
    }
    return api
  }

  /** pulseIn: exact edge times from the parts (HC-SR04 echo) when available */
  private *pulseIn(line: number, p: unknown, level: boolean, timeoutUs: number): Gen {
    const name = this.pin(p)
    if (!name) return 0
    const deadline = this.cpu + timeoutUs / 1e6
    let seenFrom = this.cpu - 1
    const waitFor = function* (this: FastRuntime, target: boolean): Generator<Yielded, number | null, unknown> {
      for (;;) {
        const e = this.io.edgesOn(name).find((x) => x.t > seenFrom && x.high === target)
        if (e) {
          seenFrom = e.t
          return e.t
        }
        if (this.io.digitalRead(name) === target) {
          seenFrom = this.cpu
          return this.cpu
        }
        if (this.cpu >= deadline) return null
        yield { k: 'w', line }
      }
    }.bind(this)
    // if the pin is already at `level`, wait for it to leave first
    if (this.io.digitalRead(name) === level) {
      const left = yield* waitFor(!level)
      if (left === null) return 0
    }
    const start = yield* waitFor(level)
    if (start === null) return 0
    const end = yield* waitFor(!level)
    if (end === null) return 0
    return Math.round((end - start) * 1e6)
  }
}
