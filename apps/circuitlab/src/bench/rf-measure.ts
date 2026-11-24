/**
 * Circuit Lab bench, RF and measurement side — plain functions on the solver
 * (no UI) so they are testable:
 *  - spectrum: Hann-windowed FFT of the simulated voltage (DC … 1 MHz), in
 *    dBm into 50 Ω and dBV, with RBW = 1.5·fs/N (the Hann window's ENBW);
 *  - rfSpectrum: the carriers the radio world delivers to a receiver, drawn
 *    through a Gaussian RBW filter over the instrument's noise floor;
 *  - lcrMeasure: the complex impedance between an LCR meter's clips from a
 *    small-signal AC solve at the test frequency → L, C, R, ESR, D, Q;
 *  - vnaSweep: S11 / S21 of what hangs on a VNA's ports (AC solves).
 */
import { SimEngine } from '../sim/engine'
import type { CircuitLayout, EndpointRef } from '../model/types'
import { logSpace } from '../sim/ac'
import { getEntry } from '../model/catalog'
import { RfWorld } from '../sim/rf-world'
import { noiseFloorDbm } from '../sim/rf-link'
import { SA } from '../model/rf-data'

// ------------------------------------------------------------------ FFT

/** in-place radix-2 complex FFT (length a power of two) */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci
        const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr
        re[i + k + len / 2] = re[i + k] - ar
        im[i + k + len / 2] = im[i + k] - ai
        re[i + k] += ar
        im[i + k] += ai
        const t = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = t
      }
    }
  }
}

export interface SpectrumPoint {
  f: number
  /** dBm into 50 Ω */
  dbm: number
  /** dBV (rms) */
  dbv: number
}
export interface Spectrum {
  points: SpectrumPoint[]
  rbw: number
  /** strongest peaks, strongest first */
  peaks: SpectrumPoint[]
  /** 'fft' (simulated waveform) or 'rf' (radio world) */
  source: 'fft' | 'rf'
}

const vToDbm = (vrms: number) => 10 * Math.log10(Math.max((vrms * vrms) / 50 / 1e-3, 1e-20))
const dbmToDbv = (dbm: number) => dbm - 13.0103 // 1 mW into 50 Ω is 0.2236 Vrms = −13.01 dBV

/** spectrum of a sampled record (Hann window); amplitudes as rms per bin */
export function spectrumOf(samples: number[], fs: number, stopHz = fs / 2): Spectrum {
  let n = 1
  while (n < samples.length) n <<= 1
  const re = new Float64Array(n)
  const im = new Float64Array(n)
  const m = samples.length
  const mean = samples.reduce((a, b) => a + b, 0) / Math.max(1, m)
  for (let i = 0; i < m; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (m - 1))
    re[i] = (samples[i] - mean) * w
  }
  fft(re, im)
  const points: SpectrumPoint[] = []
  // a sine of amplitude A gives |X| = A·m/4 under a Hann window; rms = A/√2
  const kmax = Math.min(n / 2, Math.floor((stopHz * n) / fs))
  for (let k = 0; k <= kmax; k++) {
    const amp = k === 0 ? Math.abs(mean) * Math.SQRT2 : (4 * Math.hypot(re[k], im[k])) / m
    const vrms = amp / Math.SQRT2
    const dbm = vToDbm(Math.max(vrms, 1e-9))
    points.push({ f: (k * fs) / n, dbm, dbv: dbmToDbv(dbm) })
  }
  return { points, rbw: (1.5 * fs) / m, peaks: findPeaks(points), source: 'fft' }
}

export function findPeaks(points: SpectrumPoint[], count = 6): SpectrumPoint[] {
  const floor = median(points.map((p) => p.dbm))
  const out: SpectrumPoint[] = []
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    if (p.dbm >= points[i - 1].dbm && p.dbm > points[i + 1].dbm && p.dbm > floor + 10) out.push(p)
  }
  return out.sort((a, b) => b.dbm - a.dbm).slice(0, count)
}
function median(xs: number[]): number {
  if (!xs.length) return -200
  const s = xs.slice().sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

/**
 * Run the LIVE engine forward and take the spectrum of (in − gnd): sample
 * rate 2.56 × stop, record length 1.5 / RBW (at most 32 768 samples).
 */
export function captureSpectrum(engine: SimEngine, inRef: EndpointRef, gndRef: EndpointRef | null, stopHz: number, rbwHz: number, dt: number): Spectrum {
  const fs = 2.56 * stopHz
  const n = Math.max(256, Math.min(32768, Math.round((1.5 * fs) / Math.max(rbwHz, 1e-3))))
  const period = 1 / fs
  const h = Math.min(dt, period)
  const xs: number[] = []
  const t0 = engine.time
  for (let i = 0; i < n; i++) {
    const target = t0 + (i + 1) * period
    while (engine.time < target - h * 0.5) engine.step(Math.min(h, target - engine.time))
    const v = engine.netVoltage(inRef) - (gndRef ? engine.netVoltage(gndRef) : 0)
    xs.push(Number.isFinite(v) ? v : 0)
  }
  return spectrumOf(xs, fs, stopHz)
}

/**
 * The RF view: what the radio world delivers to a receiver between fLo and
 * fHi, each carrier through a Gaussian RBW filter, over a noise floor.
 * `noiseDbm` is the floor at this RBW (defaults to the analyzer's DANL).
 */
export function rfSpectrum(world: RfWorld, receiverKey: string, fLo: number, fHi: number, rbw: number, opts: { points?: number; noiseDbm?: number } = {}): Spectrum {
  const rx = world.receiver(receiverKey)
  const floor = opts.noiseDbm ?? SA.danl100 + 10 * Math.log10(Math.max(rbw, 1) / 100)
  const carriers = rx ? world.incoming(rx, fLo, fHi, true) : []
  const n = opts.points ?? 601
  const fs = new Set<number>()
  for (let i = 0; i < n; i++) fs.add(fLo + ((fHi - fLo) * i) / (n - 1))
  for (const c of carriers) fs.add(c.from.fHz)
  const freqs = [...fs].sort((a, b) => a - b)
  const points = freqs.map((f) => {
    let w = 10 ** (floor / 10)
    for (const c of carriers) {
      const bw = Math.max(c.from.bwHz, rbw)
      const share = Math.min(1, rbw / bw)
      const d = Math.max(0, Math.abs(f - c.from.fHz) - (bw - rbw) / 2)
      const shape = 10 ** ((-3 * (2 * d / rbw) ** 2) / 10)
      w += 10 ** (c.dbm / 10) * share * shape
    }
    const dbm = 10 * Math.log10(w)
    return { f, dbm, dbv: dbmToDbv(dbm) }
  })
  const peaks = carriers.map((c) => ({ f: c.from.fHz, dbm: 10 * Math.log10(10 ** (c.dbm / 10) * Math.min(1, rbw / Math.max(c.from.bwHz, rbw)) + 10 ** (floor / 10)), dbv: 0 }))
  for (const p of peaks) p.dbv = dbmToDbv(p.dbm)
  return { points, rbw, peaks: peaks.sort((a, b) => b.dbm - a.dbm), source: 'rf' }
}

/** the SDR's view around its centre frequency (noise floor kTB·NF per bin) */
export function sdrSpectrum(world: RfWorld, sdrId: string, port: 'RX2 A' | 'RX2 B', fc: number, bw: number, bins = 512): Spectrum {
  const rbw = bw / bins
  return rfSpectrum(world, `${sdrId}:${port}`, fc - bw / 2, fc + bw / 2, rbw, { points: bins, noiseDbm: noiseFloorDbm(rbw, 8) })
}

// ------------------------------------------------------------- AC helpers

/** a copy of the circuit at its DC operating point, sources quiet (like the Bode analyser) */
function acEngine(layout: CircuitLayout): SimEngine {
  const engine = new SimEngine(layout)
  for (const c of layout.components) {
    if (c.type === 'signal_generator' || c.type === 'noise_source') engine.setRuntimeParam(c.id, '__acOnly', true)
  }
  for (let k = 0; k < 30; k++) engine.step(0.5)
  return engine
}

/** complex node voltage per frequency with `srcId` as the 1 V test source */
function phasors(engine: SimEngine, srcId: string, ref: EndpointRef, freqs: number[]): Map<number, [number, number]> {
  const out = new Map<number, [number, number]>()
  for (const p of engine.acSweep(srcId, ref, null, freqs)) {
    const ph = (p.phase * Math.PI) / 180
    out.set(p.f, [p.mag * Math.cos(ph), p.mag * Math.sin(ph)])
  }
  return out
}
const cdiv = (a: [number, number], b: [number, number]): [number, number] => {
  const d = b[0] * b[0] + b[1] * b[1] || 1e-30
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]
}

// -------------------------------------------------------------- LCR meter

export interface LcrReading {
  f: number
  /** |Z| (Ω) and phase (deg) */
  z: number
  theta: number
  rs: number
  xs: number
  ls: number | null
  cs: number | null
  rp: number
  lp: number | null
  cp: number | null
  /** dissipation factor and quality factor */
  d: number
  q: number
  /** what the meter decides it is */
  kind: 'L' | 'C' | 'R'
  /** series or parallel model chosen */
  model: 'series' | 'parallel'
  /** the main readout, e.g. "10.00 µH" */
  primary: string
  secondary: string
}

export const LCR_FREQS: Record<string, number> = { '100 Hz': 100, '120 Hz': 120, '1 kHz': 1000, '10 kHz': 1e4, '100 kHz': 1e5 }

const si = (v: number, unit: string) => {
  const a = Math.abs(v)
  const [k, s] = a >= 1e6 ? [1e-6, 'M'] : a >= 1e3 ? [1e-3, 'k'] : a >= 1 || a === 0 ? [1, ''] : a >= 1e-3 ? [1e3, 'm'] : a >= 1e-6 ? [1e6, 'µ'] : a >= 1e-9 ? [1e9, 'n'] : [1e12, 'p']
  return `${(v * k).toFixed(Math.abs(v * k) >= 100 ? 1 : Math.abs(v * k) >= 10 ? 2 : 3)} ${s}${unit}`
}

/** measure the impedance between an LCR meter's HI and LO at its test frequency */
export function lcrMeasure(layout: CircuitLayout, lcrId: string, f?: number, circuit: 'auto' | 'series' | 'parallel' = 'auto'): LcrReading | null {
  const comp = layout.components.find((c) => c.id === lcrId)
  if (!comp) return null
  const fTest = f ?? LCR_FREQS[String(comp.params?.testFreq ?? '1 kHz')] ?? 1000
  const engine = acEngine(layout)
  const vh = phasors(engine, lcrId, `${lcrId}:HI`, [fTest]).get(fTest)
  const vl = phasors(engine, lcrId, `${lcrId}:LO`, [fTest]).get(fTest) ?? [0, 0]
  if (!vh) return null
  const vd: [number, number] = [vh[0] - vl[0], vh[1] - vl[1]]
  // the source: 1 V behind 100 Ω, so I = (1 − Vd) / 100
  const i: [number, number] = [(1 - vd[0]) / 100, -vd[1] / 100]
  const [rs, xs] = cdiv(vd, i)
  const w = 2 * Math.PI * fTest
  const z = Math.hypot(rs, xs)
  const theta = (Math.atan2(xs, rs) * 180) / Math.PI
  const [gp, bp] = cdiv([1, 0], [rs, xs])
  const rp = gp > 1e-15 ? 1 / gp : Infinity
  const kind: LcrReading['kind'] = Math.abs(xs) < 0.02 * Math.abs(rs) ? 'R' : xs > 0 ? 'L' : 'C'
  const model = circuit !== 'auto' ? circuit : z < 100 ? 'series' : 'parallel'
  const ls = xs > 0 ? xs / w : null
  const cs = xs < 0 ? -1 / (w * xs) : null
  const lp = bp < 0 ? -1 / (w * bp) : null
  const cp = bp > 0 ? bp / w : null
  const d = Math.abs(xs) > 1e-15 ? Math.abs(rs / xs) : Infinity
  const q = Math.abs(rs) > 1e-15 ? Math.abs(xs / rs) : Infinity
  let primary: string
  let secondary: string
  if (kind === 'R') {
    primary = si(rs, 'Ω')
    secondary = `X ${si(xs, 'Ω')}`
  } else if (kind === 'L') {
    primary = si(model === 'series' ? ls! : (lp ?? ls!), 'H')
    secondary = model === 'series' ? `ESR ${si(rs, 'Ω')} · Q ${q.toFixed(1)}` : `Rp ${si(rp, 'Ω')} · Q ${q.toFixed(1)}`
  } else {
    primary = si(model === 'series' ? cs! : (cp ?? cs!), 'F')
    secondary = model === 'series' ? `ESR ${si(rs, 'Ω')} · D ${d.toFixed(4)}` : `Rp ${si(rp, 'Ω')} · D ${d.toFixed(4)}`
  }
  return { f: fTest, z, theta, rs, xs, ls, cs, rp, lp, cp, d, q, kind, model, primary, secondary }
}

// ---------------------------------------------------------------------- VNA

export interface VnaPoint {
  f: number
  s11: [number, number]
  s21: [number, number]
  /** |S11| in dB (negative), return loss (positive), VSWR, input impedance */
  s11db: number
  rl: number
  vswr: number
  zin: [number, number]
  s21db: number
  s21deg: number
}
export interface VnaResult {
  points: VnaPoint[]
  /** the deepest S11 (an antenna's resonance) */
  best: VnaPoint
  /** −3 dB edges of S21 relative to its peak (filters) */
  s21peak: VnaPoint
  s21low: number | null
  s21high: number | null
  /** whether S21 is a voltage gain (high-Z port 2) or a 50 Ω S-parameter */
  gainMode: boolean
}

/** sweep a VNA from f0 to f1 (log or linear) and compute S11 and S21 */
export function vnaSweep(layout: CircuitLayout, vnaId: string, f0: number, f1: number, n = 201, log = true): VnaResult | null {
  const comp = layout.components.find((c) => c.id === vnaId)
  if (!comp || getEntry(comp.type)?.type !== 'vna') return null
  const gainMode = String(comp.params?.port2 ?? '50 Ω').startsWith('high')
  const freqs = log ? logSpace(f0, f1, n) : Array.from({ length: n }, (_, i) => f0 + ((f1 - f0) * i) / (n - 1))
  const engine = acEngine(layout)
  const v1 = phasors(engine, vnaId, `${vnaId}:PORT1`, freqs)
  const v2 = phasors(engine, vnaId, `${vnaId}:PORT2`, freqs)
  const vg = phasors(engine, vnaId, `${vnaId}:GND`, freqs)
  const points: VnaPoint[] = []
  for (const f of freqs) {
    const a = v1.get(f)
    if (!a) continue
    const g = vg.get(f) ?? [0, 0]
    const b = v2.get(f) ?? [0, 0]
    const p1: [number, number] = [a[0] - g[0], a[1] - g[1]]
    const p2: [number, number] = [b[0] - g[0], b[1] - g[1]]
    // incident wave from a 1 V EMF behind 50 Ω is 0.5 V: S11 = (V1 − 0.5)/0.5, S21 = V2/0.5
    const s11: [number, number] = [2 * p1[0] - 1, 2 * p1[1]]
    const s21: [number, number] = gainMode ? cdiv(p2, p1) : [2 * p2[0], 2 * p2[1]]
    const m11 = Math.min(Math.hypot(s11[0], s11[1]), 0.999999)
    const zin = cdiv([50 * (1 + s11[0]), 50 * s11[1]], [1 - s11[0], -s11[1]])
    const m21 = Math.hypot(s21[0], s21[1])
    points.push({ f, s11, s21, s11db: 20 * Math.log10(Math.max(m11, 1e-9)), rl: -20 * Math.log10(Math.max(m11, 1e-9)), vswr: (1 + m11) / (1 - m11), zin, s21db: 20 * Math.log10(Math.max(m21, 1e-12)), s21deg: (Math.atan2(s21[1], s21[0]) * 180) / Math.PI })
  }
  if (!points.length) return null
  const best = points.reduce((a, b) => (b.s11db < a.s11db ? b : a))
  const s21peak = points.reduce((a, b) => (b.s21db > a.s21db ? b : a))
  const target = s21peak.s21db - 3.0103
  let s21low: number | null = null
  let s21high: number | null = null
  const i0 = points.indexOf(s21peak)
  for (let i = i0; i > 0; i--) if (points[i - 1].s21db < target) {
    s21low = interp(points[i - 1], points[i], target)
    break
  }
  for (let i = i0; i < points.length - 1; i++) if (points[i + 1].s21db < target) {
    s21high = interp(points[i], points[i + 1], target)
    break
  }
  return { points, best, s21peak, s21low, s21high, gainMode }
}
function interp(a: VnaPoint, b: VnaPoint, db: number): number {
  const t = (db - a.s21db) / (b.s21db - a.s21db || 1e-12)
  return 10 ** (Math.log10(a.f) + t * (Math.log10(b.f) - Math.log10(a.f)))
}
