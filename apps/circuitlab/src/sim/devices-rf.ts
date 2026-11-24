/**
 * Circuit Lab: device models for the measurement, filter and wireless parts
 * (catalog-rf.ts), in the same MNA style as devices.ts / devices-lab.ts.
 *
 *  - instruments: the frequency counter and true-RMS voltmeter time the
 *    solved waveform every step (reciprocal counting with interpolated
 *    crossings); the spectrum analyzer, power meter and SDR are 50 Ω (or
 *    high-Z) loads that also read the radio world; the LCR meter and VNA
 *    are AC test sources (their measurements are small-signal AC solves in
 *    src/bench/rf-measure.ts); the noise source is a voltage-controlled
 *    voltage source OUT = IN + interference behind 50 Ω.
 *  - filters: real R/L/C companions (backward Euler) with ESR / DCR, the
 *    ferrite bead as Rdc + (R ∥ L) (∥ C in AC), the common-mode choke as two
 *    coupled inductors (inverse-inductance matrix).
 *  - antennas: open at DC, a series RLC impedance around resonance in AC.
 *  - radios: link-level models on the shared RfWorld (rf-world.ts).
 */
import type { ComponentInstance, ComponentTelemetry, ParamValue } from '../model/types'
import type { CatalogEntry } from '../model/catalog'
import type { StampContext } from './mna'
import type { AcStamp } from './ac'
import { BaseDevice, asBool, asNumber, asString, vAt, type AnalogDevice } from './devices'
import { RfWorld } from './rf-world'
import { antennaZ, wToDbm, type AntennaModel } from './rf-link'
import { B210, PWR_SENSOR, RADIOS, SA, antennaModel, type ParamGet } from '../model/rf-data'
import { paramOf } from '../model/catalog'
import type { CircuitLayout } from '../model/types'

const TAU = Math.PI * 2

/** small deterministic PRNG (mulberry32) seeded from a string */
export function prng(seed: string): () => number {
  let a = 0x9e3779b9
  for (let i = 0; i < seed.length; i++) a = Math.imul(a ^ seed.charCodeAt(i), 0x85ebca6b) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function fmtSI(v: number, unit: string, digits = 4): string {
  if (!Number.isFinite(v)) return `---- ${unit}`
  const a = Math.abs(v)
  const [k, s] = a >= 1e9 ? [1e-9, 'G'] : a >= 1e6 ? [1e-6, 'M'] : a >= 1e3 ? [1e-3, 'k'] : a >= 1 || a === 0 ? [1, ''] : a >= 1e-3 ? [1e3, 'm'] : a >= 1e-6 ? [1e6, 'µ'] : a >= 1e-9 ? [1e9, 'n'] : [1e12, 'p']
  return `${(v * k).toPrecision(digits)} ${s}${unit}`
}

// ------------------------------------------------------------ gate stats

export interface GateResult {
  freq: number | null
  period: number | null
  count: number
  mean: number
  rms: number
  acrms: number
  vpp: number
  duty: number | null
}

/**
 * What a counter / true-RMS meter measures over one gate: time-weighted mean
 * and RMS, peak-to-peak, and reciprocal frequency from linearly interpolated
 * rising crossings of the trigger level (with hysteresis). In auto the level
 * is the middle of the previous gate's swing.
 */
export class GateStats {
  gate: number
  level: number | null
  private t0 = 0
  private sum = 0
  private sq = 0
  private total = 0
  private high = 0
  private min = Infinity
  private max = -Infinity
  private first = NaN
  private last = NaN
  private count = 0
  private armed = false
  private prevV = NaN
  private prevT = 0
  private autoLevel: number | null = null
  private hyst = 0.005
  result: GateResult | null = null
  constructor(gate: number, level: number | null) {
    this.gate = gate
    this.level = level
  }
  private lv(): number | null {
    return this.level ?? this.autoLevel
  }
  push(t: number, dt: number, v: number): void {
    if (!Number.isFinite(v)) return
    this.sum += v * dt
    this.sq += v * v * dt
    this.total += dt
    if (v < this.min) this.min = v
    if (v > this.max) this.max = v
    const L = this.lv()
    if (L !== null) {
      if (v > L) this.high += dt
      if (v < L - this.hyst) this.armed = true
      if (this.armed && Number.isFinite(this.prevV) && this.prevV < L && v >= L) {
        const f = (L - this.prevV) / (v - this.prevV || 1)
        const tc = this.prevT + f * (t - this.prevT)
        if (!this.count) this.first = tc
        this.last = tc
        this.count++
        this.armed = false
      }
    }
    this.prevV = v
    this.prevT = t
    if (t - this.t0 >= this.gate) this.close(t)
  }
  private close(t: number): void {
    const T = Math.max(this.total, 1e-12)
    const mean = this.sum / T
    const rms = Math.sqrt(Math.max(0, this.sq / T))
    const vpp = this.max - this.min
    const counted = this.lv() !== null
    const freq = this.count >= 2 && this.last > this.first ? (this.count - 1) / (this.last - this.first) : null
    this.result = {
      freq,
      period: freq ? 1 / freq : null,
      count: this.count,
      mean,
      rms,
      acrms: Math.sqrt(Math.max(0, rms * rms - mean * mean)),
      vpp,
      duty: counted && freq ? this.high / T : null,
    }
    this.autoLevel = vpp > 1e-3 ? (this.max + this.min) / 2 : null
    this.hyst = Math.max(1e-3, vpp * 0.05)
    this.t0 = t
    this.sum = this.sq = this.total = this.high = 0
    this.min = Infinity
    this.max = -Infinity
    this.count = 0
    this.first = this.last = NaN
  }
}

const GATES: Record<string, number> = { '10 ms': 0.01, '0.1 s': 0.1, '1 s': 1 }
const LEVELS: Record<string, number | null> = { auto: null, '0 V': 0, '1.4 V (TTL)': 1.4, '2.5 V': 2.5 }

// --------------------------------------------------------- the radio world

/** parts that live in the radio world get it once all devices exist */
interface RfAware {
  attachRf(world: RfWorld): void
}
const isRfAware = (d: AnalogDevice): d is AnalogDevice & RfAware => typeof (d as unknown as RfAware).attachRf === 'function'

/** Build one radio world for an engine's devices (no-op when there are no radio parts). */
export function connectRf(layout: CircuitLayout, devices: AnalogDevice[]): RfWorld | null {
  const aware = devices.filter(isRfAware)
  if (!aware.length) return null
  const world = new RfWorld(layout)
  for (const d of aware) d.attachRf(world)
  return world
}

const RF_KEYS = new Set(['tilt', 'distance', 'environment', 'mode', 'channel', 'power', 'dataRate', 'sf', 'band', 'role', 'frequency', 'bandwidth', 'txOn', 'txGain', 'toneOffset', 'length', 'elements'])

abstract class RfDevice extends BaseDevice implements RfAware {
  protected world: RfWorld | null = null
  protected t = 0
  protected dt = 5e-5
  attachRf(world: RfWorld): void {
    this.world = world
  }
  beginStep(time: number, dt: number): void {
    this.t = time + dt
    this.dt = dt
  }
  /** live settings (runtime overrides on top of the catalog params) */
  protected live = new Map<string, ParamValue>()
  protected p: ParamGet = (k) => (this.live.has(k) ? this.live.get(k) : paramOf(this.comp.params, this.entry, k)) as number | string | boolean | undefined
  setRuntimeParam(key: string, value: ParamValue): void {
    this.live.set(key, value)
    if (RF_KEYS.has(key)) this.world?.setParam(this.comp.id, key, value)
  }
}

/** a 50 Ω (or high-Z) input that keeps the average power it absorbs */
class PowerTracker {
  private avgW = 0
  private avgV = 0
  push(v: number, r: number, dt: number): void {
    const a = Math.min(1, dt / 0.02)
    this.avgW += ((v * v) / r - this.avgW) * a
    this.avgV += (v - this.avgV) * a
  }
  get dbm(): number {
    return wToDbm(this.avgW)
  }
  get vdc(): number {
    return this.avgV
  }
}

const addDbm = (...dbm: number[]) => {
  let w = 0
  for (const d of dbm) if (Number.isFinite(d)) w += 10 ** (d / 10)
  return w > 0 ? 10 * Math.log10(w) : -Infinity
}

// ------------------------------------------------------- frequency counter

export class FrequencyCounterDevice extends RfDevice {
  private stats: GateStats
  private display: string
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.stats = new GateStats(GATES[this.str('gate', '0.1 s')] ?? 0.1, LEVELS[this.str('level', 'auto')] ?? null)
    this.display = this.str('display', 'frequency')
  }
  stamp(ctx: StampContext): void {
    ctx.addConductance(this.nodes[0], this.nodes[1], 1e-6)
  }
  endStep(x: Float64Array): void {
    this.stats.push(this.t, this.dt, vAt(x, this.nodes[0]) - vAt(x, this.nodes[1]))
  }
  maxDt(): number {
    return 5e-5
  }
  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === 'gate') this.stats.gate = GATES[asString(value, '0.1 s')] ?? 0.1
    else if (key === 'level') this.stats.level = LEVELS[asString(value, 'auto')] ?? null
    else if (key === 'display') this.display = asString(value, 'frequency')
  }
  fillTelemetry(t: ComponentTelemetry): void {
    const r = this.stats.result
    t.reading = !r || r.freq === null ? '---- Hz' : this.display === 'period' ? fmtSI(r.period!, 's', 7) : this.display === 'count' ? `${r.count}` : fmtSI(r.freq, 'Hz', 7)
    t.extra = { freq: r?.freq ?? NaN, period: r?.period ?? NaN, count: r?.count ?? 0, gate: this.stats.gate, duty: r?.duty ?? NaN, vpp: r?.vpp ?? NaN }
  }
}

// ------------------------------------------------------ true-RMS voltmeter

export class RmsVoltmeterDevice extends RfDevice {
  private stats = new GateStats(0.2, null)
  private mode: string
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.mode = this.str('mode', 'AC+DC rms')
  }
  stamp(ctx: StampContext): void {
    ctx.addConductance(this.nodes[0], this.nodes[1], 1e-7)
  }
  endStep(x: Float64Array): void {
    this.stats.push(this.t, this.dt, vAt(x, this.nodes[0]) - vAt(x, this.nodes[1]))
  }
  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === 'mode') this.mode = asString(value, this.mode)
  }
  /** the value and its readout for the present mode */
  value(): [number, string] {
    const r = this.stats.result
    if (!r) return [NaN, '---- V']
    switch (this.mode) {
      case 'AC rms':
        return [r.acrms, fmtSI(r.acrms, 'V')]
      case 'DC':
        return [r.mean, fmtSI(r.mean, 'V')]
      case 'dBV': {
        const d = 20 * Math.log10(Math.max(r.acrms, 1e-9))
        return [d, `${d.toFixed(2)} dBV`]
      }
      case 'dBm (600 Ω)': {
        const d = 10 * Math.log10(Math.max((r.acrms * r.acrms) / 600 / 1e-3, 1e-15))
        return [d, `${d.toFixed(2)} dBm`]
      }
      case 'Hz':
        return [r.freq ?? NaN, r.freq ? fmtSI(r.freq, 'Hz', 6) : '---- Hz']
      case 'duty':
        return [r.duty ?? NaN, r.duty !== null ? `${(r.duty * 100).toFixed(2)} %` : '---- %']
      default:
        return [r.rms, fmtSI(r.rms, 'V')]
    }
  }
  fillTelemetry(t: ComponentTelemetry): void {
    const [v, s] = this.value()
    const r = this.stats.result
    t.value = v
    t.reading = s
    t.extra = { mode: this.mode, rms: r?.rms ?? NaN, acrms: r?.acrms ?? NaN, dc: r?.mean ?? NaN, freq: r?.freq ?? NaN, duty: r?.duty ?? NaN }
  }
}

// ------------------------------------------------------- spectrum analyzer

export class SpectrumAnalyzerDevice extends RfDevice {
  private pw = new PowerTracker()
  private rfDbm = -Infinity
  stamp(ctx: StampContext): void {
    ctx.addConductance(this.nodes[0], this.nodes[1], this.r() === 50 ? 1 / 50 : 1e-6)
  }
  private r(): number {
    return String(this.p('input')) === '50 Ω' ? 50 : 1e6
  }
  endStep(x: Float64Array): void {
    this.pw.push(vAt(x, this.nodes[0]) - vAt(x, this.nodes[1]), 50, this.dt)
    const rx = this.world?.receiver(`${this.comp.id}:IN`)
    this.rfDbm = rx && this.world ? this.world.inBandDbm(rx) : -Infinity
  }
  fillTelemetry(t: ComponentTelemetry): void {
    const total = addDbm(this.r() === 50 ? this.pw.dbm : -Infinity, this.rfDbm)
    t.reading = Number.isFinite(total) ? `${total.toFixed(1)} dBm` : '— dBm'
    t.extra = { inputDbm: total, rfDbm: this.rfDbm, vdc: this.pw.vdc, maxDbm: SA.maxDbm, input: String(this.p('input')) }
  }
}

// ------------------------------------------------------------ power meter

export class PowerMeterDevice extends RfDevice {
  private pw = new PowerTracker()
  private rfDbm = -Infinity
  stamp(ctx: StampContext): void {
    ctx.addConductance(this.nodes[0], this.nodes[1], 1 / 50)
  }
  endStep(x: Float64Array): void {
    this.pw.push(vAt(x, this.nodes[0]) - vAt(x, this.nodes[1]), 50, this.dt)
    const rx = this.world?.receiver(`${this.comp.id}:RF`)
    this.rfDbm = rx && this.world ? this.world.inBandDbm(rx) : -Infinity
  }
  fillTelemetry(t: ComponentTelemetry): void {
    const atSensor = addDbm(this.pw.dbm, this.rfDbm)
    const offset = asNumber(this.p('offset'), 0)
    const shown = atSensor + offset
    t.value = shown
    t.reading = !Number.isFinite(atSensor) || atSensor < PWR_SENSOR.minDbm ? 'UNDER RANGE' : atSensor > PWR_SENSOR.maxDbm ? 'OVER RANGE' : `${shown.toFixed(2)} dBm`
    t.extra = { sensorDbm: atSensor, shownDbm: shown, mw: 10 ** (shown / 10) }
  }
}

// ------------------------------------------------------------- LCR meter

/** LCR meter: open in the transient run; in AC it is a 1 V source behind 100 Ω across HI–LO */
export class LcrMeterDevice extends RfDevice {
  static readonly RS = 100
  readonly isAcSource = true
  private shown = ''
  stamp(ctx: StampContext): void {
    ctx.addConductance(this.nodes[0], this.nodes[1], 1e-9)
  }
  stampAC(ac: AcStamp, _omega: number, _x: Float64Array, drive = false): void {
    const [hi, lo] = this.nodes
    if (!drive) {
      ac.addY(hi, lo, 1e-9, 0)
      return
    }
    const g = 1 / LcrMeterDevice.RS
    ac.addY(hi, lo, g, 0)
    ac.addI(hi, g, 0)
    ac.addI(lo, -g, 0)
  }
  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === '__display') this.shown = asString(value, '')
    else super.setRuntimeParam(key, value)
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.reading = this.shown || `${String(this.p('testFreq'))} · ready`
  }
}

// ------------------------------------------------------------------- VNA

/** VNA: both ports are 50 Ω loads (port 2 optionally high-Z); in AC port 1 is a 1 V EMF behind 50 Ω */
export class VnaDevice extends RfDevice {
  readonly isAcSource = true
  private shown = ''
  private pw = new PowerTracker()
  private g2(): number {
    return String(this.p('port2')).startsWith('high') ? 1e-6 : 1 / 50
  }
  stamp(ctx: StampContext): void {
    const [p1, p2, gnd] = this.nodes
    ctx.addConductance(p1, gnd, 1 / 50)
    ctx.addConductance(p2, gnd, this.g2())
  }
  endStep(x: Float64Array): void {
    const v1 = vAt(x, this.nodes[0]) - vAt(x, this.nodes[2])
    const v2 = vAt(x, this.nodes[1]) - vAt(x, this.nodes[2])
    this.pw.push(Math.max(Math.abs(v1), Math.abs(v2)), 50, this.dt)
  }
  stampAC(ac: AcStamp, _omega: number, _x: Float64Array, drive = false): void {
    const [p1, p2, gnd] = this.nodes
    const g = 1 / 50
    ac.addY(p1, gnd, g, 0)
    ac.addY(p2, gnd, this.g2(), 0)
    if (drive) {
      ac.addI(p1, g, 0)
      ac.addI(gnd, -g, 0)
    }
  }
  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === '__display') this.shown = asString(value, '')
    else super.setRuntimeParam(key, value)
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.reading = this.shown || 'S11 · S21'
    t.extra = { inputDbm: this.pw.dbm }
  }
}

// ----------------------------------------------------------- noise source

const HUM_NORM = 1 / 1.25

/** OUT = IN + interference, behind 50 Ω (a VCVS from IN, plus a noise EMF) */
export class NoiseSourceDevice extends RfDevice {
  static readonly ROUT = 50
  private n = 0
  private hold = 0
  private white = 0
  private rnd: () => number
  private acOnly = false
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.rnd = prng(comp.id)
  }
  private gauss(): number {
    const u = Math.max(1e-12, this.rnd())
    const v = this.rnd()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v)
  }
  private mode(): string {
    return String(this.p('mode') ?? 'hum 60 Hz')
  }
  beginStep(time: number, dt: number): void {
    super.beginStep(time, dt)
    const t = this.t
    const lvl = asNumber(this.p('level'), 0.5)
    const on = asBool(this.p('on'), true)
    if (!on || this.acOnly) {
      this.n = 0
      return
    }
    const bw = Math.max(1e3, asNumber(this.p('bandwidth'), 1e5))
    if (t >= this.hold) {
      this.white = this.gauss()
      this.hold = t + 1 / (2 * bw)
    }
    const hum = (f: number) => (lvl / 2) * HUM_NORM * (Math.sin(TAU * f * t) + 0.3 * Math.sin(3 * TAU * f * t) + 0.15 * Math.sin(5 * TAU * f * t))
    switch (this.mode()) {
      case 'white noise':
        this.n = (lvl / 6.6) * this.white
        break
      case 'hum 50 Hz':
        this.n = hum(50)
        break
      case 'switching ripple': {
        const f = Math.max(1e3, asNumber(this.p('frequency'), 1e5))
        const ph = (t * f) % 1
        const tri = ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph
        const tau = 1 / (f * 60)
        const since = Math.min(ph, Math.abs(ph - 0.5)) / f
        const spike = (ph < 0.5 ? 1 : -1) * Math.exp(-since / tau)
        this.n = (lvl / 2) * (0.7 * tri + 0.6 * spike)
        break
      }
      case 'hum + noise':
        this.n = hum(60) + (lvl / 26) * this.white
        break
      default:
        this.n = hum(60)
    }
  }
  stamp(ctx: StampContext): void {
    const [inp, out, gnd] = this.nodes
    const g = 1 / NoiseSourceDevice.ROUT
    ctx.addConductance(inp, gnd, 1e-6)
    ctx.addConductance(out, gnd, g)
    ctx.addElement(out, inp, -g)
    ctx.addElement(out, gnd, g)
    ctx.addElement(gnd, inp, g)
    ctx.addElement(gnd, gnd, -g)
    ctx.addCurrent(out, g * this.n)
    ctx.addCurrent(gnd, -g * this.n)
  }
  stampAC(ac: AcStamp): void {
    const [inp, out, gnd] = this.nodes
    const g = 1 / NoiseSourceDevice.ROUT
    ac.addY(inp, gnd, 1e-6, 0)
    ac.addY(out, gnd, g, 0)
    ac.addEl(out, inp, -g, 0)
    ac.addEl(out, gnd, g, 0)
    ac.addEl(gnd, inp, g, 0)
    ac.addEl(gnd, gnd, -g, 0)
  }
  maxDt(): number {
    if (!asBool(this.p('on'), true)) return 5e-5
    const m = this.mode()
    if (m === 'switching ripple') return 1 / (Math.max(1e3, asNumber(this.p('frequency'), 1e5)) * 40)
    if (m === 'white noise' || m === 'hum + noise') return 1 / (2 * Math.max(1e3, asNumber(this.p('bandwidth'), 1e5)))
    return 5e-5
  }
  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === '__acOnly') this.acOnly = asBool(value, false)
    else super.setRuntimeParam(key, value)
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.reading = `${this.mode()} · ${asNumber(this.p('level'), 0.5).toFixed(2)} Vpp`
    t.extra = { mode: this.mode(), level: asNumber(this.p('level'), 0.5), on: asBool(this.p('on'), true), n: this.n }
  }
}

// ----------------------------------------------------------- filter parts

/** series R–C branch companion (backward Euler); state = capacitor voltage */
class RcBranch {
  vc = 0
  i = 0
  private geq = 0
  constructor(
    public c: number,
    public r: number,
  ) {}
  begin(dt: number): void {
    this.geq = 1 / (this.r + dt / this.c)
  }
  stamp(ctx: StampContext, a: number, b: number): void {
    ctx.addConductance(a, b, this.geq)
    ctx.addCurrent(a, this.geq * this.vc)
    ctx.addCurrent(b, -this.geq * this.vc)
  }
  end(v: number, dt: number): void {
    this.i = this.geq * (v - this.vc)
    this.vc += (this.i * dt) / this.c
  }
  y(w: number): [number, number] {
    // 1 / (R + 1/(jωC)) = 1 / (R − j/(ωC))
    const xr = this.r
    const xi = -1 / (w * this.c)
    const d = xr * xr + xi * xi
    return [xr / d, -xi / d]
  }
}

/** series R–L branch companion (backward Euler); state = branch current */
class RlBranch {
  i = 0
  private geq = 0
  private k = 0
  constructor(
    public l: number,
    public r: number,
  ) {}
  begin(dt: number): void {
    this.k = this.l / dt
    this.geq = 1 / (this.r + this.k)
  }
  stamp(ctx: StampContext, a: number, b: number): void {
    const ic = this.geq * this.k * this.i
    ctx.addConductance(a, b, this.geq)
    ctx.addCurrent(a, -ic)
    ctx.addCurrent(b, ic)
  }
  end(v: number): void {
    this.i = this.geq * (v + this.k * this.i)
  }
  y(w: number): [number, number] {
    const xr = this.r
    const xi = w * this.l
    const d = xr * xr + xi * xi
    return [xr / d, -xi / d]
  }
}

/** π (C-L-C) and LC (L-C) filter modules: pins IN, GND, OUT */
export class LcFilterDevice extends BaseDevice {
  private c1: RcBranch | null
  private l: RlBranch
  private c2: RcBranch
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    const esr = Math.max(1e-4, this.num('esr', 0.01))
    const hasC1 = entry.params?.some((p) => p.key === 'c1')
    this.c1 = hasC1 ? new RcBranch(Math.max(1e-12, this.num('c1', 1e-5)), esr) : null
    this.l = new RlBranch(Math.max(1e-9, this.num('inductance', 1e-5)), Math.max(1e-4, this.num('dcr', 0.05)))
    this.c2 = new RcBranch(Math.max(1e-12, this.num('c2', 1e-5)), esr)
  }
  private dt = 5e-5
  beginStep(_t: number, dt: number): void {
    this.dt = dt
    this.c1?.begin(dt)
    this.l.begin(dt)
    this.c2.begin(dt)
  }
  stamp(ctx: StampContext): void {
    const [inp, gnd, out] = this.nodes
    this.c1?.stamp(ctx, inp, gnd)
    this.l.stamp(ctx, inp, out)
    this.c2.stamp(ctx, out, gnd)
  }
  endStep(x: Float64Array): void {
    const [inp, gnd, out] = this.nodes
    this.c1?.end(vAt(x, inp) - vAt(x, gnd), this.dt)
    this.l.end(vAt(x, inp) - vAt(x, out))
    this.c2.end(vAt(x, out) - vAt(x, gnd), this.dt)
  }
  stampAC(ac: AcStamp, w: number): void {
    const [inp, gnd, out] = this.nodes
    const ww = Math.max(w, 1e-6)
    if (this.c1) {
      const [r, i] = this.c1.y(ww)
      ac.addY(inp, gnd, r, i)
    }
    const [lr, li] = this.l.y(ww)
    ac.addY(inp, out, lr, li)
    const [cr, ci] = this.c2.y(ww)
    ac.addY(out, gnd, cr, ci)
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.current = this.l.i
    t.extra = { iL: this.l.i, vc1: this.c1?.vc ?? NaN, vc2: this.c2.vc }
  }
}

/** ferrite bead: Rdc + (Rp ∥ L) in the transient run, ∥ a parasitic C in AC */
export class FerriteBeadDevice extends BaseDevice {
  readonly rp: number
  readonly l: number
  readonly cp: number
  readonly rdc: number
  private branch: RlBranch
  private v = 0
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    const fv = ferriteValues(Math.max(10, this.num('z100', 600)))
    this.rp = fv.rp
    this.l = fv.l
    this.cp = fv.cp
    this.rdc = fv.rdc
    this.branch = new RlBranch(this.l, this.rdc)
  }
  beginStep(_t: number, dt: number): void {
    this.branch.begin(dt)
  }
  stamp(ctx: StampContext): void {
    const [a, b] = this.nodes
    ctx.addConductance(a, b, 1 / this.rp)
    this.branch.stamp(ctx, a, b)
  }
  endStep(x: Float64Array): void {
    this.v = vAt(x, this.nodes[0]) - vAt(x, this.nodes[1])
    this.branch.end(this.v)
  }
  stampAC(ac: AcStamp, w: number): void {
    const [re, im] = ferriteZ(this, Math.max(w, 1e-6))
    const d = re * re + im * im
    ac.addY(this.nodes[0], this.nodes[1], re / d, -im / d)
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.current = this.branch.i + this.v / this.rp
  }
}

/** the bead's model values from its rated impedance at 100 MHz */
export function ferriteValues(z100: number): { rp: number; l: number; cp: number; rdc: number } {
  return { rp: z100, l: z100 / (TAU * 30e6), cp: 1 / (TAU * 6e8 * z100), rdc: 0.05 + z100 / 6000 }
}
/** Z(ω) = Rdc + 1 / (1/Rp + 1/(jωL) + jωC) */
export function ferriteZ(v: { rp: number; l: number; cp: number; rdc: number }, w: number): [number, number] {
  const gr = 1 / v.rp
  const bi = w * v.cp - 1 / (w * v.l)
  const d = gr * gr + bi * bi
  return [v.rdc + gr / d, -bi / d]
}

/** common-mode choke: two coupled windings, i = i₀ + dt·L⁻¹·v */
export class CmChokeDevice extends BaseDevice {
  private gamma: [number, number, number, number]
  private i = [0, 0]
  private g = [0, 0, 0, 0]
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    const L = Math.max(1e-9, this.num('inductance', 0.01))
    const k = Math.min(0.99999, Math.max(0, this.num('coupling', 0.995)))
    const M = k * L
    const det = L * L - M * M
    this.gamma = [L / det, -M / det, -M / det, L / det]
  }
  private br(p: number): [number, number] {
    return p === 0 ? [this.nodes[0], this.nodes[1]] : [this.nodes[2], this.nodes[3]]
  }
  beginStep(_t: number, dt: number): void {
    this.g = this.gamma.map((x) => x * dt)
  }
  stamp(ctx: StampContext): void {
    for (let p = 0; p < 2; p++) {
      const [ap, bp] = this.br(p)
      for (let q = 0; q < 2; q++) {
        const [aq, bq] = this.br(q)
        const G = this.g[p * 2 + q]
        ctx.addElement(ap, aq, G)
        ctx.addElement(ap, bq, -G)
        ctx.addElement(bp, aq, -G)
        ctx.addElement(bp, bq, G)
      }
      ctx.addCurrent(ap, -this.i[p])
      ctx.addCurrent(bp, this.i[p])
      // a whisker of conductance keeps a floating winding solvable
      ctx.addConductance(ap, bp, 1e-9)
    }
  }
  endStep(x: Float64Array): void {
    const v = [0, 1].map((p) => {
      const [a, b] = this.br(p)
      return vAt(x, a) - vAt(x, b)
    })
    const i0 = this.i[0] + this.g[0] * v[0] + this.g[1] * v[1]
    const i1 = this.i[1] + this.g[2] * v[0] + this.g[3] * v[1]
    this.i = [i0, i1]
  }
  stampAC(ac: AcStamp, w: number): void {
    const ww = Math.max(w, 1e-6)
    for (let p = 0; p < 2; p++) {
      const [ap, bp] = this.br(p)
      for (let q = 0; q < 2; q++) {
        const [aq, bq] = this.br(q)
        const Bi = -this.gamma[p * 2 + q] / ww // Γ/(jω) = −jΓ/ω
        ac.addEl(ap, aq, 0, Bi)
        ac.addEl(ap, bq, 0, -Bi)
        ac.addEl(bp, aq, 0, -Bi)
        ac.addEl(bp, bq, 0, Bi)
      }
      ac.addY(ap, bp, 1e-9, 0)
    }
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.current = Math.max(Math.abs(this.i[0]), Math.abs(this.i[1]))
    t.extra = { i1: this.i[0], i2: this.i[1], icm: (this.i[0] + this.i[1]) / 2 }
  }
}

// ---------------------------------------------------------------- antennas

export class AntennaDevice extends RfDevice {
  model(): AntennaModel | null {
    return antennaModel(this.comp.type, this.p)
  }
  stamp(ctx: StampContext): void {
    ctx.addConductance(this.nodes[0], this.nodes[1], 1e-9)
  }
  stampAC(ac: AcStamp, w: number): void {
    const m = this.model()
    if (!m) return
    const [r, x] = antennaZ(m, Math.max(w, 1e-3) / TAU)
    const d = r * r + x * x
    ac.addY(this.nodes[0], this.nodes[1], r / d, -x / d)
  }
  fillTelemetry(t: ComponentTelemetry): void {
    const m = this.model()
    t.reading = m ? `f₀ ${fmtSI(m.f0, 'Hz', 4)} · ${m.gainDbi.toFixed(1)} dBi` : ''
    t.extra = { f0: m?.f0 ?? NaN, gainDbi: m?.gainDbi ?? NaN, tilt: asNumber(this.p('tilt'), 0) }
  }
}

// ------------------------------------------------------------------ radios

/**
 * A radio module at link level: its supply current, its carrier (on while it
 * transmits — for the 433 MHz transmitter, while DATA is high) and what its
 * receiver hears from the radio world. The 433 MHz receiver and the HC-05
 * pass a logic signal across the link when the budget closes.
 */
export class RadioDevice extends RfDevice {
  private readonly def = RADIOS[this.comp.type]
  private pin = (name: string) => {
    const i = this.entry.pins.indexOf(name)
    return i >= 0 ? this.nodes[i] : -2
  }
  private vcc = 0
  private g = 0
  private out = false
  private state = false
  private rssi = -Infinity
  private margin: number | null = null
  private partner: string | null = null
  private lastCarrier = -1
  private nextFlip = 0
  private chatter = false
  private rnd = prng(this.comp.id)
  private note = ''
  private powered(): boolean {
    return this.vcc >= this.def.vccMin * 0.9
  }
  private txKey = `${this.comp.id}:tx`
  private rxKey = `${this.comp.id}:rx`
  beginStep(time: number, dt: number): void {
    super.beginStep(time, dt)
    const w = this.world
    const on = this.powered()
    const tx = w?.emitter(this.txKey)
    const type = this.comp.type
    if (tx) {
      tx.dbm = this.def.txDbm(this.p, this.vcc)
      if (type === 'tx433') tx.on = on && this.dataIn('DATA', 1.2)
      else if (type === 'hc05') {
        tx.on = on
        tx.data = this.dataIn('RXD', 1.6)
      } else tx.on = on
    }
    const rx = w?.receiver(this.rxKey)
    if (!w || !rx || !on) {
      this.rssi = -Infinity
      this.margin = null
      this.out = type === 'hc05'
      this.state = false
      return
    }
    const inc = w.incoming(rx)
    const best = inc[0]
    this.rssi = w.inBandDbm(rx)
    this.margin = best ? best.dbm - rx.sensDbm : null
    this.partner = best?.from.compId ?? null
    if (type === 'rx433') this.rx433(best?.dbm ?? -Infinity, rx.sensDbm)
    else if (type === 'hc05') {
      // also look for a partner that is silent right now (it still keeps the link)
      const all = w.incoming(rx, undefined, undefined, true).filter((i) => i.from.compId !== this.comp.id)
      const mate = all.find((i) => this.isMate(i.from.compId)) ?? null
      const ok = !!mate && mate.from.on && mate.dbm >= rx.sensDbm
      this.margin = mate ? mate.dbm - rx.sensDbm : null
      this.partner = mate?.from.compId ?? null
      this.state = ok
      this.out = ok ? mate!.from.data : true
      this.note = !mate && all.length ? 'two modules with the same role never pair — make one the master' : ''
    } else {
      this.state = this.margin !== null && this.margin >= 0
    }
  }
  private isMate(id: string): boolean {
    const other = this.world?.layout.components.find((c) => c.id === id)
    if (!other || other.type !== 'hc05') return false
    const mine = String(this.p('role') ?? 'slave')
    const theirs = String(other.params?.role ?? 'slave')
    return mine !== theirs
  }
  private dataIn(pin: string, threshold: number): boolean {
    return this.vin(pin) > threshold
  }
  private x: Float64Array | null = null
  private vin(pin: string): number {
    if (!this.x) return 0
    return vAt(this.x, this.pin(pin)) - vAt(this.x, this.pin(this.def.gnd))
  }
  /** super-regenerative receiver: follows the carrier, chatters with no signal */
  private rx433(dbm: number, sens: number): void {
    const t = this.t
    const margin = dbm - sens
    const carrier = Number.isFinite(dbm) && margin > -3
    if (carrier) this.lastCarrier = t
    const recent = this.lastCarrier >= 0 && t - this.lastCarrier < 0.02
    if (carrier) {
      // near the sensitivity bits get flipped now and then
      const pErr = margin >= 3 ? 0 : 0.5 * (1 - (margin + 3) / 6)
      if (t >= this.nextFlip) {
        this.chatter = this.rnd() < pErr
        this.nextFlip = t + 5e-5 + this.rnd() * 2e-4
      }
      this.out = this.chatter ? !this.out : true
      this.state = true
    } else if (recent) {
      this.out = false
      this.state = true
    } else {
      if (t >= this.nextFlip) {
        this.out = this.rnd() < 0.5
        this.nextFlip = t + 5e-5 + this.rnd() * 5e-4
      }
      this.state = false
    }
  }
  stamp(ctx: StampContext): void {
    const vccN = this.pin(this.def.vcc)
    const gndN = this.pin(this.def.gnd)
    ctx.addConductance(vccN, gndN, this.g)
    const type = this.comp.type
    const lvl = (type === 'hc05' ? 3.3 : Math.max(0, this.vcc)) * (this.powered() ? 1 : 0)
    if (type === 'rx433') {
      ctx.addNorton(this.pin('DATA'), gndN, this.out ? lvl : 0, 200)
    } else if (type === 'hc05') {
      ctx.addNorton(this.pin('TXD'), gndN, this.out ? lvl : 0, 150)
      ctx.addNorton(this.pin('STATE'), gndN, this.state ? lvl : 0, 150)
      ctx.addConductance(this.pin('RXD'), gndN, 1e-6)
    } else if (type === 'tx433') {
      ctx.addConductance(this.pin('DATA'), gndN, 1e-5)
    }
  }
  endStep(x: Float64Array): void {
    this.x = x
    this.vcc = vAt(x, this.pin(this.def.vcc)) - vAt(x, this.pin(this.def.gnd))
    const tx = this.world?.emitter(this.txKey)
    const [idle, txI, rxI] = this.def.current
    const i = !this.powered() ? 0 : tx?.on ? txI : this.world?.receiver(this.rxKey) ? rxI : idle
    // a conductance sized from the last supply voltage: the matrix only changes when the state does
    const g = this.vcc > 0.5 ? Math.round((i / Math.max(this.vcc, 0.5)) * 1e6) / 1e6 : 0
    this.g = g
  }
  maxDt(): number {
    return this.comp.type === 'rx433' || this.comp.type === 'hc05' ? 2.5e-5 : 5e-5
  }
  fillTelemetry(t: ComponentTelemetry): void {
    const tx = this.world?.emitter(this.txKey)
    t.current = this.g * this.vcc
    t.reading = !this.powered() ? 'no power' : this.rssi > -Infinity ? `RSSI ${this.rssi.toFixed(1)} dBm` : tx ? (tx.on ? `TX ${tx.dbm.toFixed(1)} dBm` : 'TX idle') : 'listening'
    t.extra = {
      vcc: this.vcc,
      powered: this.powered(),
      txOn: !!tx?.on,
      txDbm: tx?.dbm ?? NaN,
      rssi: Number.isFinite(this.rssi) ? this.rssi : NaN,
      margin: this.margin ?? NaN,
      link: this.state,
      partner: this.partner ?? '',
      out: this.out,
      note: this.note,
      vccMax: this.def.vccAbs,
    }
  }
}

// --------------------------------------------------------------------- SDR

/** USRP B210: four 50 Ω SMA ports; a tone on TX/RX A; RX2 A / RX2 B listen */
export class SdrDevice extends RfDevice {
  private pw = [new PowerTracker(), new PowerTracker(), new PowerTracker(), new PowerTracker()]
  private rx: number[] = [-Infinity, -Infinity]
  private wide: number[] = [-Infinity, -Infinity]
  stamp(ctx: StampContext): void {
    const gnd = this.nodes[4]
    for (let i = 0; i < 4; i++) ctx.addConductance(this.nodes[i], gnd, 1 / 50)
  }
  endStep(x: Float64Array): void {
    const gnd = vAt(x, this.nodes[4])
    for (let i = 0; i < 4; i++) this.pw[i].push(vAt(x, this.nodes[i]) - gnd, 50, this.dt)
    const w = this.world
    const tx = w?.emitter(`${this.comp.id}:txa`)
    if (tx) tx.on = asBool(this.p('txOn'), false)
    ;['RX2 A', 'RX2 B'].forEach((port, k) => {
      const r = w?.receiver(`${this.comp.id}:${port}`)
      if (!w || !r) return
      this.rx[k] = w.inBandDbm(r)
      let tot = 0
      for (const i of w.incoming(r, B210.fMin, B210.fMax)) tot += 10 ** (i.dbm / 10)
      this.wide[k] = tot > 0 ? 10 * Math.log10(tot) : -Infinity
    })
  }
  fillTelemetry(t: ComponentTelemetry): void {
    // the strongest power arriving at any RF input (radio carriers, or a circuit's waveform on the cable)
    const inputs = [addDbm(this.wide[0], this.pw[1].dbm), addDbm(this.wide[1], this.pw[3].dbm), asBool(this.p('txOn'), false) ? -Infinity : this.pw[0].dbm, this.pw[2].dbm]
    const rxMax = Math.max(...inputs)
    const gain = asNumber(this.p('rxGain'), 40)
    const fullScale = -5 - gain
    t.reading = `${asNumber(this.p('frequency'), 433.92).toFixed(2)} MHz`
    t.extra = {
      rxaDbm: Number.isFinite(this.rx[0]) ? this.rx[0] : NaN,
      rxbDbm: Number.isFinite(this.rx[1]) ? this.rx[1] : NaN,
      rxMaxDbm: Number.isFinite(rxMax) ? rxMax : NaN,
      overload: Math.max(this.rx[0], this.rx[1]) > fullScale,
      txOn: asBool(this.p('txOn'), false),
      txDbm: B210.txDbm(asNumber(this.p('txGain'), 70)),
    }
  }
}

export function createRfDevice(model: string, comp: ComponentInstance, entry: CatalogEntry, nodes: number[]): AnalogDevice | null {
  switch (model) {
    case 'freq_counter':
      return new FrequencyCounterDevice(comp, entry, nodes)
    case 'rms_voltmeter':
      return new RmsVoltmeterDevice(comp, entry, nodes)
    case 'spectrum_analyzer':
      return new SpectrumAnalyzerDevice(comp, entry, nodes)
    case 'rf_power_meter':
      return new PowerMeterDevice(comp, entry, nodes)
    case 'lcr_meter':
      return new LcrMeterDevice(comp, entry, nodes)
    case 'vna':
      return new VnaDevice(comp, entry, nodes)
    case 'noise_source':
      return new NoiseSourceDevice(comp, entry, nodes)
    case 'lc_filter':
      return new LcFilterDevice(comp, entry, nodes)
    case 'ferrite_bead':
      return new FerriteBeadDevice(comp, entry, nodes)
    case 'cm_choke':
      return new CmChokeDevice(comp, entry, nodes)
    case 'antenna':
      return new AntennaDevice(comp, entry, nodes)
    case 'radio':
      return RADIOS[comp.type] ? new RadioDevice(comp, entry, nodes) : null
    case 'usrp_b210':
      return new SdrDevice(comp, entry, nodes)
  }
  return null
}
