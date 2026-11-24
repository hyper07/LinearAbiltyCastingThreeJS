/**
 * Python mode: runs a Raspberry Pi (or BeagleBone) Python program in
 * simulation time, like Instant mode does for Arduino sketches.
 *
 * The program is parsed once (parser.ts) and walked by generators
 * (interp.ts). The main program and every background task — gpiozero's
 * blink() / pulse(), button callbacks, RPi.GPIO event callbacks, distance
 * readings — has its own clock. Each solver step [t0, t1) the scheduler
 * resumes whichever task is due first until all of them are past t1:
 * time.sleep() moves a task's clock to its wake-up time, a loop back-edge
 * costs a little time (Python on a Pi is not instant), and waiting for an
 * input ends the task's turn for this step. So time.sleep(1) is exactly one
 * second of simulated time at any simulation speed.
 *
 * Inputs are polled at the start of each step to fire when_pressed and
 * add_event_detect callbacks. When the program ends, gpiozero devices close
 * and their pins float again — just like on a real Pi.
 */
import { boardDef, type BoardDef } from '../../model/boards'
import type { McuIO, McuRuntime, PinMode } from '../types'
import { Interp, type InterpHost } from './interp'
import { PyError } from './lexer'
import { Device, makeModules, type PyHost, type Watcher } from './modules'
import { parse, type Stmt } from './parser'
import { isInt, num, str, type Gen, type Value } from './values'

/** simulated time one pass round a Python loop costs (a Pi runs ~10⁵ simple loop passes a second) */
const LOOP_COST = 10e-6
const MAX_RESUMES_PER_STEP = 5000
/** wall clock at the start of the run (time.time(), strftime) — 1 Sep 2026, 09:00 UTC */
const EPOCH = Date.UTC(2026, 8, 1, 9, 0, 0) / 1000

interface Task {
  gen: Gen
  wake: number
  name: string
  main?: boolean
  owner?: object
  dead?: boolean
}

export interface PyCheck {
  ok: boolean
  line: number | null
  message: string
}

/** parse only: syntax errors with their line, for the code editor */
export function checkPython(source: string): PyCheck {
  try {
    parse(source)
    return { ok: true, line: null, message: '' }
  } catch (e) {
    if (e instanceof PyError) return { ok: false, line: e.line ?? null, message: `${e.type}: ${e.msg}` }
    return { ok: false, line: null, message: String(e) }
  }
}

const parsed = new Map<string, Stmt[] | PyError>()
function parseCached(src: string): Stmt[] | PyError {
  const hit = parsed.get(src)
  if (hit) return hit
  let r: Stmt[] | PyError
  try {
    r = parse(src)
  } catch (e) {
    r = e instanceof PyError ? e : new PyError('SyntaxError', String(e), 1)
  }
  if (parsed.size > 32) parsed.clear()
  parsed.set(src, r)
  return r
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

export class PythonRuntime implements McuRuntime, PyHost, InterpHost {
  readonly kind = 'python' as const
  state: McuRuntime['state'] = 'running'
  error?: string
  line?: number
  io!: McuIO
  readonly board: BoardDef
  readonly interp: Interp
  readonly devices = new Set<Device>()
  epoch = EPOCH
  private cpu = 0
  private t0 = 0
  private t1 = 0
  private tasks: Task[] = []
  private watchers: Watcher[] = []
  private owners = new Map<string, Device>()
  private settle = new Map<string, { until: number; level: boolean }>()
  private rx = ''
  private rand = mulberry(1)
  private started = false
  private readonly modules: (name: string) => ReturnType<ReturnType<typeof makeModules>>
  private readonly srcLines: string[]

  constructor(boardType: string, private readonly source: string) {
    this.board = boardDef(boardType) as BoardDef
    this.interp = new Interp(this)
    this.modules = makeModules(this)
    this.srcLines = source.split('\n')
  }

  // ------------------------------------------------------------ PyHost

  now(): number {
    return this.cpu
  }
  random(): number {
    return this.rand()
  }
  seed(n: number): void {
    this.rand = mulberry(n)
  }
  write(text: string): void {
    this.io.serialWrite(text)
  }
  warn(message: string): void {
    this.io.warn(message)
  }
  readLine(): string | null {
    const i = this.rx.indexOf('\n')
    if (i < 0) return null
    const line = this.rx.slice(0, i).replace(/\r$/, '')
    this.rx = this.rx.slice(i + 1)
    return line
  }
  importModule(name: string) {
    return this.modules(name)
  }

  spawn(gen: Gen, name: string, owner?: object): void {
    this.tasks.push({ gen, wake: this.cpu, name, owner })
  }
  cancel(owner: object): void {
    for (const t of this.tasks) if (t.owner === owner) t.dead = true
  }
  spawnCall(fn: Value, args: Value[], name: string): void {
    const interp = this.interp
    const gen = (function* (): Gen {
      return yield* interp.call(fn, args)
    })()
    this.tasks.push({ gen, wake: Math.max(this.cpu, this.t0), name })
  }
  pinMode(pin: string, mode: PinMode, t: number): void {
    this.io.pinMode(pin, mode, t)
    // the solver sees a new pull-up only from the next step on: until then read the pull level
    if (mode === 'pullup' || mode === 'pulldown') this.settle.set(pin, { until: this.t1, level: mode === 'pullup' })
    else this.settle.delete(pin)
  }
  read(pin: string): boolean {
    const s = this.settle.get(pin)
    if (s && this.cpu < s.until) return s.level
    return this.io.digitalRead(pin)
  }
  watch(w: Watcher): void {
    this.watchers.push(w)
  }
  unwatch(w: Watcher): void {
    this.watchers = this.watchers.filter((x) => x !== w)
  }

  /** header pin for a pin argument: BCM number / "GPIO17" / "BOARD11" / a header name like "P8_10" */
  pin(spec: Value, mode: 'bcm' | 'board', who: string): string {
    const b = this.board
    const byPhysical = (n: number): string => {
      const name = Object.entries(b.pinNumbers ?? {}).find(([, k]) => k === n)?.[0]
      if (!name) throw new PyError('PinInvalidPin', `${who}: there is no physical pin ${n} on the ${b.short}'s header (pins 1–${Object.keys(b.pinNumbers ?? {}).length})`)
      if (!Object.values(b.gpio).includes(name)) throw new PyError('ValueError', `${who}: physical pin ${n} is ${name} (power / ground), not a GPIO — the channel sent is invalid on a ${b.short}`)
      return name
    }
    const byGpio = (n: number): string => {
      const name = b.gpio[n]
      if (!name) {
        const nums = Object.keys(b.gpio).map(Number).filter((k) => b.pins.includes(b.gpio[k]))
        throw new PyError('PinInvalidPin', `${who}: GPIO${n} is not on the ${b.short}'s header — the header has GPIO ${Math.min(...nums)}–${Math.max(...nums)} (BCM numbers)`)
      }
      return name
    }
    if (spec === null) throw new PyError('GPIODeviceError', `${who}: no pin given`)
    if (isInt(spec)) {
      const n = num(spec)
      return mode === 'board' ? byPhysical(n) : byGpio(n)
    }
    if (typeof spec === 'string') {
      const s = spec.trim()
      let m = /^(?:GPIO|BCM)(\d+)$/i.exec(s)
      if (m) return byGpio(Number(m[1]))
      m = /^(?:BOARD|J8:|J8\.)(\d+)$/i.exec(s)
      if (m) return byPhysical(Number(m[1]))
      if (/^\d+$/.test(s)) return mode === 'board' ? byPhysical(Number(s)) : byGpio(Number(s))
      const up = s.toUpperCase()
      const direct = b.pins.find((p) => p.toUpperCase() === up) ?? (up === 'LED' || /^USR\d$/.test(up) ? Object.values(b.gpio).find((p) => p.toUpperCase() === up) : undefined)
      if (direct && Object.values(b.gpio).includes(direct)) return direct
      if (direct) throw new PyError('ValueError', `${who}: ${direct} is a power / ground pin, not a GPIO`)
    }
    throw new PyError('PinInvalidPin', `${who}: ${str(spec)} is not a pin on the ${b.short} — use a GPIO number like 17`)
  }

  claim(pin: string, owner: Device): void {
    const cur = this.owners.get(pin)
    if (cur && cur !== owner && !cur.closed) throw new PyError('GPIOPinInUse', `pin ${pin} is already in use by ${cur.repr()} — use one device per pin (or close() the old one)`)
    this.owners.set(pin, owner)
  }
  release(pin: string, owner: Device): void {
    if (this.owners.get(pin) === owner) this.owners.delete(pin)
  }

  // -------------------------------------------------------- McuRuntime

  serialIn(text: string): void {
    this.rx += text
  }

  private start(): boolean {
    this.started = true
    const prog = parseCached(this.source)
    if (prog instanceof PyError) {
      this.state = 'error'
      this.error = `Line ${prog.line ?? '?'}: ${prog.type}: ${prog.msg}`
      const src = this.srcLines[(prog.line ?? 1) - 1] ?? ''
      this.io.serialWrite(`  File "main.py", line ${prog.line ?? '?'}\n    ${src.trim()}\n${prog.type}: ${prog.msg}\n`)
      return false
    }
    const interp = this.interp
    const main = (function* (): Gen {
      return yield* interp.run(prog)
    })()
    this.tasks = [{ gen: main, wake: this.t0, name: 'main', main: true }]
    this.state = 'running'
    return true
  }

  run(t0: number, t1: number, io: McuIO): void {
    this.io = io
    this.t0 = t0
    this.t1 = t1
    if (this.state === 'error' || this.state === 'stopped') return
    if (!this.started) {
      this.cpu = t0
      if (!this.start()) return
    }
    // inputs: edges since the last step fire callbacks now
    this.cpu = t0
    for (const w of [...this.watchers]) {
      try {
        w.poll(this.read(w.pin), t0)
      } catch (e) {
        this.failed({ gen: (function* (): Gen { return null })(), wake: 0, name: 'callback' }, e)
      }
    }
    let resumes = 0
    while (resumes++ < MAX_RESUMES_PER_STEP) {
      let task: Task | null = null
      for (const t of this.tasks) if (!t.dead && (!task || t.wake < task.wake)) task = t
      if (!task || task.wake >= t1) break
      this.cpu = Math.max(task.wake, t0)
      let r: IteratorResult<unknown, Value>
      try {
        r = task.gen.next()
      } catch (e) {
        task.dead = true
        this.failed(task, e)
        if (this.state !== 'running') return
        continue
      }
      if (r.done) {
        task.dead = true
        if (task.main) {
          this.finish(null)
          return
        }
        continue
      }
      const y = r.value as { k: string; line: number; until?: number }
      if (task.main && y.line) this.line = y.line
      if (y.k === 'L') task.wake = this.cpu + LOOP_COST
      else if (y.k === 'd') task.wake = Math.max(this.cpu, y.until ?? this.cpu)
      else task.wake = t1
    }
    if (resumes >= MAX_RESUMES_PER_STEP) for (const t of this.tasks) t.wake = Math.max(t.wake, t1)
    this.tasks = this.tasks.filter((t) => !t.dead)
    this.cpu = t1
  }

  /** a task raised: the main program stops with a traceback; a callback prints one and the rest goes on */
  private failed(task: Task, e: unknown): void {
    const pe = this.interp.located(e, this.interp.line)
    if (pe.type === 'SystemExit') {
      if (task.main) this.finish(null)
      return
    }
    const src = this.srcLines[(pe.line ?? 1) - 1] ?? ''
    const where = task.main ? '<module>' : task.name
    const text = `Traceback (most recent call last):\n  File "main.py", line ${pe.line ?? '?'}, in ${where}\n    ${src.trim()}\n${pe.type}${pe.msg ? `: ${pe.msg}` : ''}\n`
    if (!task.main) {
      this.io.serialWrite(`Exception in thread ${task.name}:\n${text}`)
      return
    }
    this.io.serialWrite(text)
    this.finish(`Line ${pe.line ?? '?'}: ${pe.type}${pe.msg ? `: ${pe.msg}` : ''}`)
  }

  /** the program ended (error = why, or null): gpiozero devices close, background work stops */
  private finish(error: string | null): void {
    for (const d of [...this.devices]) d.close()
    for (const t of this.tasks) t.dead = true
    this.tasks = []
    this.watchers = []
    if (error) {
      this.state = 'error'
      this.error = error
    } else {
      this.state = 'stopped'
      this.io.serialWrite('[program finished]\n')
    }
  }
}
