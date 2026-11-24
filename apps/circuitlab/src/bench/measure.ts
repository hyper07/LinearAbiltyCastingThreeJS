/**
 * Circuit Lab bench: what the instruments measure, as plain functions on
 * the solver (no UI) so they are testable — scope capture with triggering
 * and automatic measurements, DAQ acquisition, the Bode analyser (small-
 * signal AC sweep), the curve tracer (DC sweeps) and CSV export.
 */
import { SimEngine } from '../sim/engine'
import type { CircuitLayout, EndpointRef } from '../model/types'
import { cutoffs, logSpace, type BodePoint } from '../sim/ac'

// ------------------------------------------------------------ waveforms

export interface Trace {
  t: number[]
  v: number[]
}

export interface Measurements {
  vmax: number
  vmin: number
  vpp: number
  vavg: number
  vrms: number
  /** AC rms (DC removed) */
  vacrms: number
  freq: number | null
  period: number | null
  /** 10 %–90 % of the first full rising edge */
  rise: number | null
}

/** times of mean-crossings (rising) with hysteresis */
function risingCrossings(tr: Trace, level: number, hyst: number): number[] {
  const out: number[] = []
  let armed = false
  for (let i = 1; i < tr.v.length; i++) {
    if (tr.v[i] < level - hyst) armed = true
    if (armed && tr.v[i - 1] < level && tr.v[i] >= level) {
      const f = (level - tr.v[i - 1]) / (tr.v[i] - tr.v[i - 1] || 1)
      out.push(tr.t[i - 1] + f * (tr.t[i] - tr.t[i - 1]))
      armed = false
    }
  }
  return out
}

export function measure(tr: Trace): Measurements {
  const n = tr.v.length
  if (!n) return { vmax: NaN, vmin: NaN, vpp: NaN, vavg: NaN, vrms: NaN, vacrms: NaN, freq: null, period: null, rise: null }
  let max = -Infinity
  let min = Infinity
  let sum = 0
  let sq = 0
  for (const v of tr.v) {
    if (v > max) max = v
    if (v < min) min = v
    sum += v
    sq += v * v
  }
  const avg = sum / n
  const rms = Math.sqrt(sq / n)
  const vpp = max - min
  const mid = (max + min) / 2
  const xs = vpp > 1e-6 ? risingCrossings(tr, mid, vpp * 0.1) : []
  let period: number | null = null
  if (xs.length >= 2) period = (xs[xs.length - 1] - xs[0]) / (xs.length - 1)
  // rise time on the first rising edge that crosses 10 % … 90 %
  let rise: number | null = null
  const lo = min + 0.1 * vpp
  const hi = min + 0.9 * vpp
  for (let i = 1; i < n && vpp > 1e-6; i++) {
    if (tr.v[i - 1] <= lo && tr.v[i] > lo) {
      const t10 = tr.t[i]
      for (let j = i; j < n; j++) {
        if (tr.v[j] >= hi) {
          rise = tr.t[j] - t10
          break
        }
        if (tr.v[j] < lo) break
      }
      if (rise !== null) break
    }
  }
  return {
    vmax: max,
    vmin: min,
    vpp,
    vavg: avg,
    vrms: rms,
    vacrms: Math.sqrt(Math.max(0, rms * rms - avg * avg)),
    freq: period ? 1 / period : null,
    period,
    rise,
  }
}

/** phase of b relative to a in degrees (positive = b leads), from rising mean-crossings */
export function phaseBetween(a: Trace, b: Trace): number | null {
  const ma = measure(a)
  const mb = measure(b)
  if (!ma.period || !mb.vpp) return null
  const xa = risingCrossings(a, (ma.vmax + ma.vmin) / 2, ma.vpp * 0.1)
  const xb = risingCrossings(b, (mb.vmax + mb.vmin) / 2, mb.vpp * 0.1)
  if (!xa.length || !xb.length) return null
  const t0 = xa[0]
  const tb = xb.find((t) => t >= t0 - ma.period! / 2) ?? xb[0]
  let ph = (-(tb - t0) / ma.period) * 360
  while (ph > 180) ph -= 360
  while (ph < -180) ph += 360
  return ph
}

// ---------------------------------------------------------------- scope

export interface ScopeSettings {
  timeDiv: number
  ch: { ref: EndpointRef | null; coupling: 'DC' | 'AC' | 'GND'; on: boolean }[]
  gnd: EndpointRef | null
  trigger: { source: 0 | 1; level: number; slope: 'rise' | 'fall'; mode: 'auto' | 'normal' | 'single' }
  /** horizontal position: trigger point as a fraction of the screen (0.1 = 10 % from the left) */
  pre?: number
}

export interface ScopeCapture {
  t: number[]
  ch: (number[] | null)[]
  triggered: boolean
}

/**
 * Run the LIVE engine forward and capture 10 divisions of both channels,
 * aligned on the trigger (like a digital scope's acquisition). Auto mode
 * free-runs when no trigger arrives within two screens.
 */
export function captureScope(engine: SimEngine, s: ScopeSettings, dt: number): ScopeCapture {
  const window = s.timeDiv * 10
  const pre = s.pre ?? 0.1
  const h = Math.min(dt, window / 400)
  const read = (k: number) => {
    const c = s.ch[k]
    if (!c?.on || !c.ref) return NaN
    const v = engine.netVoltage(c.ref) - (s.gnd ? engine.netVoltage(s.gnd) : 0)
    return c.coupling === 'GND' ? 0 : Number.isFinite(v) ? v : NaN
  }
  // look for a trigger for up to two screens (at least ~0.1 s, like a bench
  // scope's auto timeout) in auto, eight screens in normal/single
  const maxSearch = s.trigger.mode === 'auto' ? Math.max(window * 2, Math.min(0.12, window * 40)) : Math.max(window * 8, Math.min(0.25, window * 80))
  const preSamples: { t: number; a: number; b: number }[] = []
  const nPre = Math.max(2, Math.round((window * pre) / h))
  let triggered = false
  let prev = NaN
  let searched = 0
  while (searched < maxSearch) {
    engine.step(h)
    searched += h
    const a = read(0)
    const b = read(1)
    preSamples.push({ t: engine.time, a, b })
    if (preSamples.length > nPre) preSamples.shift()
    const src = s.trigger.source === 0 ? a : b
    if (!Number.isNaN(prev) && preSamples.length >= nPre) {
      const L = s.trigger.level
      if ((s.trigger.slope === 'rise' && prev < L && src >= L) || (s.trigger.slope === 'fall' && prev > L && src <= L)) {
        triggered = true
        break
      }
    }
    prev = src
  }
  if (!triggered && s.trigger.mode !== 'auto') return { t: [], ch: [null, null], triggered: false }
  const t0 = triggered ? preSamples[preSamples.length - 1].t : engine.time
  const rows = triggered ? preSamples.slice() : []
  const need = Math.round((window * (triggered ? 1 - pre : 1)) / h)
  for (let i = 0; i < need; i++) {
    engine.step(h)
    rows.push({ t: engine.time, a: read(0), b: read(1) })
  }
  const t = rows.map((r) => r.t - t0)
  const coupled = (k: number, xs: number[]) => {
    if (!s.ch[k]?.on) return null
    if (s.ch[k].coupling !== 'AC') return xs
    const m = xs.reduce((p, q) => p + q, 0) / Math.max(1, xs.length)
    return xs.map((v) => v - m)
  }
  return { t, ch: [coupled(0, rows.map((r) => r.a)), coupled(1, rows.map((r) => r.b))], triggered }
}

// ------------------------------------------------------------------ DAQ

export interface Acquisition {
  headers: string[]
  rows: number[][]
}

/** sample endpoint refs at `rate` Hz for `duration` s on an engine (advancing it) */
export function acquire(engine: SimEngine, refs: { name: string; ref: EndpointRef; minus?: EndpointRef }[], rate: number, duration: number, dt: number): Acquisition {
  const period = 1 / rate
  const h = Math.min(dt, period)
  const rows: number[][] = []
  const n = Math.max(1, Math.round(duration * rate))
  const t0 = engine.time
  for (let i = 0; i < n; i++) {
    const target = t0 + (i + 1) * period
    while (engine.time < target - h * 0.5) engine.step(Math.min(h, target - engine.time))
    rows.push([engine.time - t0, ...refs.map((r) => engine.netVoltage(r.ref) - (r.minus ? engine.netVoltage(r.minus) : 0))])
  }
  return { headers: ['t (s)', ...refs.map((r) => `${r.name} (V)`)], rows }
}

/** CSV text with a header row; numbers in plain decimal/exponent form */
export function toCSV(headers: string[], rows: (number | string | null | undefined)[][]): string {
  const cell = (v: number | string | null | undefined) => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'number') return Number.isFinite(v) ? String(+v.toPrecision(8)) : ''
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  }
  return [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n') + '\n'
}

// ------------------------------------------------------------------ Bode

export interface BodeResult {
  points: BodePoint[]
  peak: BodePoint
  /** −3 dB frequencies (relative to the peak) */
  low: number | null
  high: number | null
  /** resonance (peak) frequency and Q = f0 / bandwidth when both edges exist */
  f0: number
  q: number | null
}

/**
 * Sweep the function generator from f0 to f1 (log) and measure V(out)/V(in)
 * with small-signal AC analysis around the circuit's DC operating point.
 */
export function bode(layout: CircuitLayout, genId: string, inRef: EndpointRef | null, outRef: EndpointRef, f0 = 10, f1 = 1e5, n = 121): BodeResult | null {
  const engine = new SimEngine(layout)
  engine.setRuntimeParam(genId, '__acOnly', true)
  // DC operating point: huge steps make capacitors open and inductors short
  for (let k = 0; k < 30; k++) engine.step(0.5)
  const points = engine.acSweep(genId, outRef, inRef, logSpace(f0, f1, n))
  if (!points.length) return null
  const { peak, low, high } = cutoffs(points)
  return { points, peak, low, high, f0: peak.f, q: low && high ? peak.f / (high - low) : null }
}

// -------------------------------------------------------- curve tracer

export interface Curve {
  label: string
  points: { v: number; i: number }[]
}

/**
 * Trace I–V curves of the part wired to a curve tracer, on a copy of the
 * circuit: diodes −vMax…+1 V; BJTs 0…vMax at base-current steps; MOSFETs
 * 0…vMax at gate-voltage steps. Each point is a settled DC solve.
 */
export function traceCurves(layout: CircuitLayout, tracerId: string, mode: 'diode' | 'npn' | 'pnp' | 'nmos', opts: { vMax?: number; steps?: number[]; points?: number } = {}): Curve[] {
  const engine = new SimEngine(layout)
  engine.setRuntimeParam(tracerId, 'mode', mode)
  const N = opts.points ?? 41
  const run = (vFrom: number, vTo: number, step: number, label: string): Curve => {
    engine.setRuntimeParam(tracerId, 'step', step)
    const pts: { v: number; i: number }[] = []
    for (let k = 0; k < N; k++) {
      const vs = vFrom + ((vTo - vFrom) * k) / (N - 1)
      engine.setRuntimeParam(tracerId, 'vc', vs)
      engine.advance(5e-4, 5e-5)
      const tele = engine.componentTelemetry(tracerId)
      const i = tele?.current ?? 0
      const rs = Number(tele?.extra?.rs ?? 1)
      const vdut = vs - i * rs
      pts.push({ v: vdut, i })
    }
    return { label, points: pts }
  }
  if (mode === 'diode') return [run(-(opts.vMax ?? 6), 1, 0, 'I–V')]
  const vMax = opts.vMax ?? 10
  const sign = mode === 'pnp' ? -1 : 1
  const steps = opts.steps ?? (mode === 'nmos' ? [2, 2.5, 3, 3.5, 4] : [10e-6, 20e-6, 30e-6, 40e-6, 50e-6])
  return steps.map((s) =>
    run(0, sign * vMax, sign * s, mode === 'nmos' ? `V_GS = ${s} V` : `I_B = ${Math.round(s * 1e6)} µA`),
  )
}
