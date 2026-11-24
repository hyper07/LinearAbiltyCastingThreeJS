/**
 * Circuit Lab: device models for the EE Lab I bench — the bench function
 * generator, the triple bench supply (CV/CC), the oscilloscope's inputs, the
 * LM741 op-amp, the Zener and 1N4007 diodes, the curve tracer, the DAQ,
 * logic switches and probes and the common-anode display. Written from the
 * device physics / data-sheet behaviour, in the same MNA style as ohmlet's
 * devices.ts.
 */
import type { ComponentInstance, ComponentTelemetry, ParamValue } from '../model/types'
import type { CatalogEntry } from '../model/catalog'
import type { StampContext } from './mna'
import { pnLimit } from './mna'
import type { AcStamp } from './ac'
import { BaseDevice, DiodeDevice, G_OFF, G_ON, LED_FULL_CURRENT, VT, asBool, asNumber, asString, expSafe, expSafeDeriv, vAt, type AnalogDevice } from './devices'

const TAU = Math.PI * 2

// ------------------------------------------------------------ generator

/** waveform value in −1…1 (pulse/square 0…1 high fraction aware) */
function wave(kind: string, phase: number, duty: number): number {
  const p = phase - Math.floor(phase)
  switch (kind) {
    case 'sine':
      return Math.sin(TAU * p)
    case 'triangle':
      return p < 0.25 ? 4 * p : p < 0.75 ? 2 - 4 * p : 4 * p - 4
    case 'pulse':
      return p < duty ? 1 : -1
    case 'dc':
      return 0
    default:
      return p < 0.5 ? 1 : -1
  }
}

/**
 * Bench function generator: 50 Ω output. The amplitude knob is in Vpp as
 * DISPLAYED; with the "50 Ω load" setting the display assumes a matched
 * 50 Ω load, so into a high-impedance circuit the real voltage is TWICE the
 * display — the classic surprise on the scope.
 */
export class SignalGeneratorDevice extends BaseDevice {
  static readonly ROUT = 50
  readonly isAcSource = true
  private kind: string
  private f: number
  private vpp: number
  private offset: number
  private duty: number
  private load: string
  private on: boolean
  private acOnly = false
  vNow = 0
  private i = 0

  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.kind = this.str('waveform', 'sine')
    this.f = Math.max(this.num('frequency', 1000), 0.001)
    this.vpp = this.num('vpp', 2)
    this.offset = this.num('offset', 0)
    this.duty = Math.min(0.99, Math.max(0.01, this.num('duty', 50) / 100))
    this.load = this.str('load', 'High-Z')
    this.on = this.bool('output', true)
  }

  /** open-circuit EMF scale for the display setting */
  private emfScale(): number {
    return this.load === '50Ω' ? 2 : 1
  }

  beginStep(time: number, dt: number): void {
    const t = time + dt
    const k = this.emfScale()
    if (!this.on) this.vNow = 0
    else if (this.acOnly) this.vNow = this.offset * k
    else this.vNow = k * (this.offset + (this.vpp / 2) * wave(this.kind, this.f * t, this.duty))
  }

  stamp(ctx: StampContext): void {
    ctx.addNorton(this.nodes[0], this.nodes[1], this.vNow, this.on ? SignalGeneratorDevice.ROUT : 1e6)
  }

  endStep(x: Float64Array): void {
    const v = vAt(x, this.nodes[0]) - vAt(x, this.nodes[1])
    this.i = (this.vNow - v) / SignalGeneratorDevice.ROUT
  }

  maxDt(): number {
    if (!this.on || this.kind === 'dc') return 5e-5
    return Math.min(5e-5, Math.max(1e-7, 1 / (this.f * 200)))
  }

  /** the AC test source: a 1 V EMF phasor behind 50 Ω */
  stampAC(ac: AcStamp, _omega: number, _x: Float64Array, drive = false): void {
    const g = 1 / SignalGeneratorDevice.ROUT
    ac.addY(this.nodes[0], this.nodes[1], g, 0)
    if (drive) {
      ac.addI(this.nodes[0], g, 0)
      ac.addI(this.nodes[1], -g, 0)
    }
  }

  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === 'waveform') this.kind = asString(value, this.kind)
    else if (key === 'frequency') this.f = Math.max(asNumber(value, this.f), 0.001)
    else if (key === 'vpp') this.vpp = asNumber(value, this.vpp)
    else if (key === 'offset') this.offset = asNumber(value, this.offset)
    else if (key === 'duty') this.duty = Math.min(0.99, Math.max(0.01, asNumber(value, this.duty * 100) / 100))
    else if (key === 'load') this.load = asString(value, this.load)
    else if (key === 'output') this.on = asBool(value, this.on)
    else if (key === '__acOnly') this.acOnly = asBool(value, false)
  }

  fillTelemetry(t: ComponentTelemetry): void {
    t.current = this.i
    t.reading = `${this.kind} ${fmtHz(this.f)} ${this.vpp.toFixed(2)} Vpp`
    t.extra = { frequency: this.f, vpp: this.vpp, offset: this.offset, load: this.load, on: this.on, emf: this.vNow }
  }
}

export function fmtHz(f: number): string {
  if (f >= 1e6) return `${(f / 1e6).toFixed(3)} MHz`
  if (f >= 1e3) return `${(f / 1e3).toFixed(3)} kHz`
  return `${f.toFixed(f < 10 ? 3 : 1)} Hz`
}

// ---------------------------------------------------------- bench supply

/**
 * Triple bench supply: CH1 (+ to COM) and CH2 (COM to −), 0–30 V each with
 * their own current limits — set ±12 V for op-amps — and a fixed 5 V / 3 A
 * output referenced to COM. Each channel is constant-voltage until the load
 * asks for more than the limit, then constant-current (the CC light).
 * COM is the circuit's ground reference.
 */
export class BenchSupplyDevice extends BaseDevice {
  readonly nonlinear = true
  private v1: number
  private v2: number
  private i1: number
  private i2: number
  private on: boolean
  private readonly r = 0.02
  private cc = [false, false, false]
  private amps = [0, 0, 0]
  private volts = [0, 0, 0]

  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.v1 = this.num('v1', 12)
    this.v2 = this.num('v2', 12)
    this.i1 = this.num('i1', 0.5)
    this.i2 = this.num('i2', 0.5)
    this.on = this.bool('output', true)
  }

  /** pins: + COM − 5V GND5 (GND5 bridged to COM) */
  private channels(): [number, number, number, number][] {
    const [p, com, m, v5] = this.nodes
    return [
      [p, com, this.on ? this.v1 : 0, this.i1],
      [com, m, this.on ? this.v2 : 0, this.i2],
      [v5, com, this.on ? 5 : 0, 3],
    ]
  }

  stamp(ctx: StampContext, x: Float64Array): void {
    this.channels().forEach(([a, b, v, lim], k) => {
      const vout = vAt(x, a) - vAt(x, b)
      const want = (v - vout) / this.r
      if (want > lim) {
        // constant current: inject the limit (a little conductance keeps it well posed)
        this.cc[k] = true
        ctx.addConductance(a, b, 1e-6)
        ctx.addCurrent(a, lim)
        ctx.addCurrent(b, -lim)
      } else {
        this.cc[k] = false
        ctx.addNorton(a, b, v, this.r)
      }
    })
  }

  endStep(x: Float64Array): void {
    this.channels().forEach(([a, b, v, lim], k) => {
      const vout = vAt(x, a) - vAt(x, b)
      this.volts[k] = vout
      this.amps[k] = this.cc[k] ? lim : Math.max(-lim, (v - vout) / this.r)
    })
  }

  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === 'v1') this.v1 = Math.max(0, Math.min(30, asNumber(value, this.v1)))
    else if (key === 'v2') this.v2 = Math.max(0, Math.min(30, asNumber(value, this.v2)))
    else if (key === 'i1') this.i1 = Math.max(0.001, Math.min(3, asNumber(value, this.i1)))
    else if (key === 'i2') this.i2 = Math.max(0.001, Math.min(3, asNumber(value, this.i2)))
    else if (key === 'output') this.on = asBool(value, this.on)
  }

  fillTelemetry(t: ComponentTelemetry): void {
    t.current = this.amps[0]
    t.extra = {
      v1: this.volts[0], i1: this.amps[0], cc1: this.cc[0],
      v2: this.volts[1], i2: this.amps[1], cc2: this.cc[1],
      v3: this.volts[2], i3: this.amps[2], cc3: this.cc[2],
      on: this.on,
    }
    t.reading = `${this.volts[0].toFixed(2)} V ${(this.amps[0] * 1000).toFixed(1)} mA`
  }
}

// ----------------------------------------------------------- oscilloscope

/** The scope's two inputs: 1 MΩ to the probe ground (×1 probe) or 10 MΩ (×10). */
export class ScopeInputDevice extends BaseDevice {
  private p1: string
  private p2: string
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.p1 = this.str('probe1', '10x')
    this.p2 = this.str('probe2', '10x')
  }
  private g(p: string): number {
    return p === '1x' ? 1e-6 : 1e-7
  }
  stamp(ctx: StampContext): void {
    const [c1, c2, gnd] = this.nodes
    ctx.addConductance(c1, gnd, this.g(this.p1))
    ctx.addConductance(c2, gnd, this.g(this.p2))
  }
  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === 'probe1') this.p1 = asString(value, this.p1)
    if (key === 'probe2') this.p2 = asString(value, this.p2)
  }
}

// -------------------------------------------------------------- LM741

/**
 * LM741 general-purpose op-amp macro-model (dual supply): open-loop gain
 * 200 000 with one pole at GBW / A0 (≈ 5 Hz for 1 MHz GBW), 0.5 V/µs slew,
 * 75 Ω output, 2 MΩ input resistance, outputs that saturate ~1.5 V inside
 * the rails, ~1.7 mA quiescent current. The pole is integrated implicitly
 * with the circuit (backward Euler) so feedback loops solve in the same step.
 * Pins (DIP-8): 1 NULL, 2 IN−, 3 IN+, 4 V−, 5 NULL, 6 OUT, 7 V+, 8 NC.
 */
export class OpAmp741Device extends BaseDevice {
  readonly nonlinear = true
  private readonly A0: number
  private readonly gbw: number
  private readonly slew: number
  private readonly rout = 75
  private readonly rin = 2e6
  private readonly headroom: number
  private vint = 0
  private k = 0
  private c = 0
  private dt = 5e-5
  private slewing = false
  private satur = false
  private y0 = 0

  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.A0 = this.num('gain', 2e5)
    this.gbw = this.num('gbw', 1e6)
    this.slew = this.num('slew', 0.5) * 1e6
    this.headroom = this.num('headroom', 1.5)
  }

  private get pins() {
    const n = this.nodes
    return { inm: n[1], inp: n[2], vm: n[3], out: n[5], vp: n[6] }
  }

  beginStep(_time: number, dt: number): void {
    this.dt = dt
    const wp = (TAU * this.gbw) / this.A0
    const a = dt * wp
    this.k = (a * this.A0) / (1 + a)
    this.c = this.vint / (1 + a)
  }

  /** soft clamp: identity inside [lo, hi] with 30 mV rounded corners; returns [y, dy/du] */
  private clamp(u: number, lo: number, hi: number): [number, number] {
    const w = 0.03
    const sp = (z: number) => (z > 30 * w ? z : w * Math.log1p(Math.exp(z / w)))
    const sg = (z: number) => (z > 30 * w ? 1 : 1 / (1 + Math.exp(-z / w)))
    // y1 = hi − sp(hi − u); y = lo + sp(y1 − lo)
    const z1 = hi - u
    const y1 = hi - sp(z1)
    const d1 = sg(z1)
    const z2 = y1 - lo
    return [lo + sp(z2), sg(z2) * d1]
  }

  private rails(x: Float64Array): [number, number, boolean] {
    const { vp, vm } = this.pins
    const hi = vAt(x, vp) - this.headroom
    const lo = vAt(x, vm) + this.headroom
    return [lo, hi, vAt(x, vp) - vAt(x, vm) > 2 * this.headroom + 0.5]
  }

  stamp(ctx: StampContext, x: Float64Array): void {
    const { inm, inp, out, vp, vm } = this.pins
    ctx.addConductance(inp, inm, 1 / this.rin)
    ctx.addConductance(vp, vm, 1 / 17000)
    const [lo, hi, powered] = this.rails(x)
    const g = 1 / this.rout
    if (!powered) {
      ctx.addConductance(out, -1, 1e-9)
      return
    }
    const vd = vAt(x, inp) - vAt(x, inm)
    let u = this.k * vd + this.c
    let du = this.k
    const maxMove = this.slew * this.dt
    this.slewing = Math.abs(u - this.vint) > maxMove
    if (this.slewing) {
      u = this.vint + Math.sign(u - this.vint) * maxMove
      du = 0
    }
    const [y, dy] = this.clamp(u, lo, hi)
    this.y0 = y
    const kk = dy * du
    ctx.addElement(out, out, g)
    ctx.addElement(out, inp, -g * kk)
    ctx.addElement(out, inm, g * kk)
    ctx.addCurrent(out, g * (y - kk * vd))
  }

  endStep(x: Float64Array): void {
    const [lo, hi] = this.rails(x)
    const vd = vAt(x, this.pins.inp) - vAt(x, this.pins.inm)
    let u = this.k * vd + this.c
    const maxMove = this.slew * this.dt
    if (Math.abs(u - this.vint) > maxMove) u = this.vint + Math.sign(u - this.vint) * maxMove
    // no wind-up past the rails
    this.vint = Math.min(hi + 0.2, Math.max(lo - 0.2, u))
    this.satur = u > hi - 0.05 || u < lo + 0.05
  }

  stampAC(ac: AcStamp, omega: number, x: Float64Array): void {
    const { inm, inp, out, vp, vm } = this.pins
    ac.addY(inp, inm, 1 / this.rin, 0)
    ac.addY(vp, vm, 1 / 17000, 0)
    const [lo, hi, powered] = this.rails(x)
    const g = 1 / this.rout
    if (!powered) return
    const [, dy] = this.clamp(this.vint, lo, hi)
    // A(jω) = A0 / (1 + jω/ωp)
    const wp = (TAU * this.gbw) / this.A0
    const r = omega / wp
    const d = 1 + r * r
    const ar = (this.A0 * dy) / d
    const ai = (-this.A0 * dy * r) / d
    ac.addEl(out, out, g, 0)
    ac.addEl(out, inp, -g * ar, -g * ai)
    ac.addEl(out, inm, g * ar, g * ai)
  }

  fillTelemetry(t: ComponentTelemetry): void {
    t.extra = { saturated: this.satur, slewing: this.slewing, out: this.y0 }
  }
}

// ---------------------------------------------------------------- diodes

/** 1N4007 rectifier: larger, slower junction — ~0.7 V at 10 mA, ~0.9 V at 1 A */
export class RectifierDiodeDevice extends DiodeDevice {
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.isat = 7e-9
    this.nVt = 1.9 * VT
  }
}

/**
 * Zener (1N4733A, 5.1 V): a forward silicon junction plus a reverse
 * breakdown branch that conducts sharply past Vz (zener resistance ~7 Ω).
 */
export class ZenerDevice extends BaseDevice {
  readonly nonlinear = true
  private readonly vz: number
  private readonly isat = 1e-12
  private readonly nVt = 1.2 * VT
  /** reverse branch: 49 mA at Vz (data-sheet test point), a sharp knee just below it */
  private readonly iz = 0.049
  private readonly nZ = 0.1
  private vLast = 0
  private i = 0
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.vz = this.num('vz', 5.1)
  }
  private iv(v: number): [number, number] {
    const uf = v / this.nVt
    const ur = -(v + this.vz) / this.nZ
    const er = expSafe(ur)
    const i = this.isat * (expSafe(uf) - 1) - this.iz * er
    const g = (this.isat * expSafeDeriv(uf)) / this.nVt + (this.iz * expSafeDeriv(ur)) / this.nZ
    return [i, g + 1e-12]
  }
  stamp(ctx: StampContext, x: Float64Array): void {
    const a = this.nodes[0]
    const c = this.nodes[1]
    let v = vAt(x, a) - vAt(x, c)
    if (v > 0) v = pnLimit(v, this.vLast)
    else {
      const ex = -v - this.vz
      const lastEx = Math.max(0, -this.vLast - this.vz)
      if (ex > lastEx + 0.3) v = -(this.vz + lastEx + 0.3)
    }
    this.vLast = v
    const [i, g] = this.iv(v)
    ctx.addConductance(a, c, g)
    const ieq = i - g * v
    ctx.addCurrent(a, -ieq)
    ctx.addCurrent(c, ieq)
  }
  endStep(x: Float64Array): void {
    this.i = this.iv(vAt(x, this.nodes[0]) - vAt(x, this.nodes[1]))[0]
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.current = this.i
  }
}

// ---------------------------------------------------------- curve tracer

/**
 * Curve tracer: drives the device under test between C and E with a swept
 * voltage (through 1 Ω, so the sweep sees the device, not the source) and
 * steps the third terminal B with a base current (BJT) or a gate voltage
 * (MOSFET). The tracer panel sets vc / step and reads the C current.
 */
export class CurveTracerDevice extends BaseDevice {
  private mode: string
  private vc = 0
  private stepV = 0
  private i = 0
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.mode = this.str('mode', 'diode')
  }
  /** series resistance of the sweep: 100 Ω limits diode current, 1 Ω for transistors */
  rs(): number {
    return this.mode === 'diode' ? 100 : 1
  }
  stamp(ctx: StampContext): void {
    const [c, b, e] = this.nodes
    if (this.mode === 'off') {
      ctx.addConductance(c, e, 1e-9)
      return
    }
    ctx.addNorton(c, e, this.vc, this.rs())
    if (this.mode === 'npn' || this.mode === 'pnp') {
      ctx.addConductance(b, e, 1e-9)
      ctx.addCurrent(b, this.stepV)
      ctx.addCurrent(e, -this.stepV)
    } else if (this.mode === 'nmos') {
      ctx.addNorton(b, e, this.stepV, 1)
    } else {
      ctx.addConductance(b, e, 1e-9)
    }
  }
  endStep(x: Float64Array): void {
    const v = vAt(x, this.nodes[0]) - vAt(x, this.nodes[2])
    this.i = this.mode === 'off' ? 0 : (this.vc - v) / this.rs()
  }
  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === 'vc') this.vc = asNumber(value, 0)
    else if (key === 'step') this.stepV = asNumber(value, 0)
    else if (key === 'mode') this.mode = asString(value, this.mode)
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.current = this.i
    t.value = this.i
    t.extra = { rs: this.rs() }
  }
}

// ------------------------------------------------------------------- DAQ

/**
 * DAQ device (our own design, in the spirit of a student USB DAQ): two
 * differential analog inputs (high impedance), two analog outputs (±10 V,
 * DC plus an optional sine), four digital lines (output 0/5 V or input).
 * AGND/DGND are the computer's ground (the circuit's reference).
 * Pins: AI0+ AI0− AI1+ AI1− AO0 AO1 AGND DIO0 DIO1 DIO2 DIO3 DGND
 */
export class DaqDevice extends BaseDevice {
  private ao = [0, 0]
  private aoAmp = [0, 0]
  private aoFreq = [100, 100]
  private dio = 'zzzz'
  private t = 0
  private vout = [0, 0]
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.ao = [this.num('ao0', 0), this.num('ao1', 0)]
    this.dio = this.str('dio', 'zzzz')
  }
  beginStep(time: number, dt: number): void {
    this.t = time + dt
    for (let k = 0; k < 2; k++) {
      const v = this.ao[k] + this.aoAmp[k] * Math.sin(TAU * this.aoFreq[k] * this.t)
      this.vout[k] = Math.max(-10, Math.min(10, v))
    }
  }
  stamp(ctx: StampContext): void {
    const n = this.nodes
    const agnd = n[6]
    ctx.addConductance(n[0], n[1], 1e-10)
    ctx.addConductance(n[2], n[3], 1e-10)
    ctx.addNorton(n[4], agnd, this.vout[0], 1)
    ctx.addNorton(n[5], agnd, this.vout[1], 1)
    for (let k = 0; k < 4; k++) {
      const c = this.dio[k]
      if (c === '0' || c === '1') ctx.addNorton(n[7 + k], n[11], c === '1' ? 5 : 0, 100)
      else ctx.addConductance(n[7 + k], n[11], 1e-7)
    }
  }
  maxDt(): number {
    const f = Math.max(this.aoAmp[0] ? this.aoFreq[0] : 0, this.aoAmp[1] ? this.aoFreq[1] : 0)
    return f > 0 ? Math.min(5e-5, 1 / (f * 100)) : 5e-5
  }
  setRuntimeParam(key: string, value: ParamValue): void {
    const m = /^ao([01])(Amp|Freq)?$/.exec(key)
    if (m) {
      const k = Number(m[1])
      if (!m[2]) this.ao[k] = asNumber(value, 0)
      else if (m[2] === 'Amp') this.aoAmp[k] = asNumber(value, 0)
      else this.aoFreq[k] = Math.max(0.01, asNumber(value, 100))
    } else if (key === 'dio') this.dio = (asString(value, 'zzzz') + 'zzzz').slice(0, 4)
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.extra = { ao0: this.vout[0], ao1: this.vout[1], dio: this.dio }
  }
}

// ----------------------------------------------------------------- logic

/** Logic switch: OUT to VCC (on) or to GND (off) — a clean SPDT level source. */
export class LogicSwitchDevice extends BaseDevice {
  private on: boolean
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.on = this.bool('on', false)
  }
  stamp(ctx: StampContext): void {
    const [vcc, out, gnd] = this.nodes
    ctx.addConductance(out, vcc, this.on ? G_ON : G_OFF)
    ctx.addConductance(out, gnd, this.on ? G_OFF : G_ON)
  }
  setRuntimeParam(key: string, value: ParamValue): void {
    if (key === 'on') this.on = asBool(value, this.on)
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.pressed = this.on
  }
}

/** Logic probe: HIGH above 2.0 V, LOW below 0.8 V (TTL), nothing in between; a pulse light for edges. */
export class LogicProbeDevice extends BaseDevice {
  private level = '—'
  private last = '—'
  private t = 0
  private pulseUntil = -1
  stamp(ctx: StampContext): void {
    ctx.addConductance(this.nodes[0], -1, 1e-6)
  }
  beginStep(time: number): void {
    this.t = time
  }
  endStep(x: Float64Array): void {
    const v = vAt(x, this.nodes[0])
    this.level = v > 2.0 ? 'HIGH' : v < 0.8 ? 'LOW' : '—'
    if (this.level !== this.last && this.last !== '—' && this.level !== '—') this.pulseUntil = this.t + 0.1
    this.last = this.level
  }
  fillTelemetry(t: ComponentTelemetry): void {
    t.reading = this.level
    t.extra = { pulse: this.t < this.pulseUntil }
  }
}

/** Common-anode 7-segment display: COM to +5 V, a segment lights when its pin is pulled LOW. */
export class SevenSegCADevice extends BaseDevice {
  readonly nonlinear = true
  private readonly isat: number
  private readonly nVt = 2 * VT
  private readonly segNodes: number[] = []
  private readonly comNode: number
  private readonly vLast = new Float64Array(8)
  private readonly segI = new Float64Array(8)
  static readonly SEG = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp']
  constructor(comp: ComponentInstance, entry: CatalogEntry, nodes: number[]) {
    super(comp, entry, nodes)
    this.isat = LED_FULL_CURRENT / (expSafe(2.0 / this.nVt) - 1)
    for (const s of SevenSegCADevice.SEG) {
      const i = entry.pins.indexOf(s === 'dp' ? 'DP' : s.toUpperCase())
      this.segNodes.push(i >= 0 ? nodes[i] : -1)
    }
    const c = entry.pins.indexOf('COM1')
    this.comNode = c >= 0 ? nodes[c] : -1
  }
  stamp(ctx: StampContext, x: Float64Array): void {
    const com = this.comNode
    for (let i = 0; i < 8; i++) {
      const k = this.segNodes[i]
      const vd = pnLimit(vAt(x, com) - vAt(x, k), this.vLast[i])
      this.vLast[i] = vd
      const u = vd / this.nVt
      const id = this.isat * (expSafe(u) - 1)
      const gd = (this.isat * expSafeDeriv(u)) / this.nVt + 1e-12
      ctx.addConductance(com, k, gd)
      const ieq = id - gd * vd
      ctx.addCurrent(com, -ieq)
      ctx.addCurrent(k, ieq)
    }
  }
  endStep(x: Float64Array): void {
    for (let i = 0; i < 8; i++) this.segI[i] = this.isat * (expSafe((vAt(x, this.comNode) - vAt(x, this.segNodes[i])) / this.nVt) - 1)
  }
  fillTelemetry(t: ComponentTelemetry): void {
    const segments: Record<string, boolean> = {}
    SevenSegCADevice.SEG.forEach((s, i) => (segments[s] = this.segI[i] > 1e-3))
    t.segments = segments
  }
}

export function createLabDevice(model: string, comp: ComponentInstance, entry: CatalogEntry, nodes: number[]): AnalogDevice | null {
  switch (model) {
    case 'signal_generator':
      return new SignalGeneratorDevice(comp, entry, nodes)
    case 'bench_supply':
      return new BenchSupplyDevice(comp, entry, nodes)
    case 'scope_inputs':
      return new ScopeInputDevice(comp, entry, nodes)
    case 'opamp741':
      return new OpAmp741Device(comp, entry, nodes)
    case 'diode_1n4007':
      return new RectifierDiodeDevice(comp, entry, nodes)
    case 'zener':
      return new ZenerDevice(comp, entry, nodes)
    case 'curve_tracer':
      return new CurveTracerDevice(comp, entry, nodes)
    case 'daq':
      return new DaqDevice(comp, entry, nodes)
    case 'logic_switch':
      return new LogicSwitchDevice(comp, entry, nodes)
    case 'logic_probe':
      return new LogicProbeDevice(comp, entry, nodes)
    case 'seven_segment_ca':
      return new SevenSegCADevice(comp, entry, nodes)
  }
  return null
}
