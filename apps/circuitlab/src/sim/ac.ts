/**
 * Circuit Lab: small-signal AC analysis on the MNA matrix.
 *
 * Around the present operating point, every device contributes a complex
 * admittance (capacitors jωC, inductors 1/jωL, op-amps a one-pole gain
 * A0/(1+jω/ωp)); resistive and nonlinear parts reuse their own Newton
 * linearisation (the conductances their stamp() writes at that point, which
 * IS the small-signal model: gd for a diode, gm/gπ/go for a BJT…). The
 * generator under test injects a 1 V phasor through its output resistance.
 * One dense complex solve per frequency — a 200-point Bode sweep of a class
 * circuit takes milliseconds, where a transient sweep would take minutes.
 */
import type { StampContext } from './mna'

export interface AcStamp {
  /** admittance re + j·im between nodes a and b */
  addY(a: number, b: number, re: number, im: number): void
  /** raw complex matrix element */
  addEl(row: number, col: number, re: number, im: number): void
  /** phasor current injected INTO a node */
  addI(node: number, re: number, im: number): void
}

export class AcSystem implements AcStamp {
  readonly re: Float64Array
  readonly im: Float64Array
  readonly bre: Float64Array
  readonly bim: Float64Array
  constructor(readonly n: number) {
    this.re = new Float64Array(n * n)
    this.im = new Float64Array(n * n)
    this.bre = new Float64Array(n)
    this.bim = new Float64Array(n)
  }
  clear(): void {
    this.re.fill(0)
    this.im.fill(0)
    this.bre.fill(0)
    this.bim.fill(0)
  }
  addEl(row: number, col: number, re: number, im: number): void {
    if (row < 0 || col < 0) return
    this.re[row * this.n + col] += re
    this.im[row * this.n + col] += im
  }
  addY(a: number, b: number, re: number, im: number): void {
    this.addEl(a, a, re, im)
    this.addEl(b, b, re, im)
    this.addEl(a, b, -re, -im)
    this.addEl(b, a, -re, -im)
  }
  addI(node: number, re: number, im: number): void {
    if (node < 0) return
    this.bre[node] += re
    this.bim[node] += im
  }

  /** a StampContext that records a device's real conductances (currents ignored) */
  recorder(): StampContext {
    const self = this
    return {
      nodeCount: this.n,
      addElement(row, col, v) {
        self.addEl(row, col, v, 0)
      },
      addConductance(a, b, g) {
        self.addY(a, b, g, 0)
      },
      addCurrent() {},
      addNorton(p, m, _v, rout) {
        const g = 1 / Math.max(rout, 1e-6)
        self.addY(p, m, g, 0)
      },
    }
  }

  /** Gaussian elimination with partial pivoting; returns [re, im] of the solution, null if singular */
  solve(): [Float64Array, Float64Array] | null {
    const n = this.n
    const ar = this.re.slice()
    const ai = this.im.slice()
    const br = this.bre.slice()
    const bi = this.bim.slice()
    for (let i = 0; i < n; i++) ar[i * n + i] += 1e-12 // gmin keeps floating nodes solvable
    for (let k = 0; k < n; k++) {
      let p = k
      let best = 0
      for (let r = k; r < n; r++) {
        const m = Math.hypot(ar[r * n + k], ai[r * n + k])
        if (m > best) {
          best = m
          p = r
        }
      }
      if (best < 1e-18) return null
      if (p !== k) {
        for (let c = 0; c < n; c++) {
          let t = ar[k * n + c]
          ar[k * n + c] = ar[p * n + c]
          ar[p * n + c] = t
          t = ai[k * n + c]
          ai[k * n + c] = ai[p * n + c]
          ai[p * n + c] = t
        }
        let t = br[k]
        br[k] = br[p]
        br[p] = t
        t = bi[k]
        bi[k] = bi[p]
        bi[p] = t
      }
      const pr = ar[k * n + k]
      const pi = ai[k * n + k]
      const pd = pr * pr + pi * pi
      for (let r = k + 1; r < n; r++) {
        const xr = ar[r * n + k]
        const xi = ai[r * n + k]
        if (xr === 0 && xi === 0) continue
        // f = x / pivot
        const fr = (xr * pr + xi * pi) / pd
        const fi = (xi * pr - xr * pi) / pd
        for (let c = k; c < n; c++) {
          const yr = ar[k * n + c]
          const yi = ai[k * n + c]
          ar[r * n + c] -= fr * yr - fi * yi
          ai[r * n + c] -= fr * yi + fi * yr
        }
        br[r] -= fr * br[k] - fi * bi[k]
        bi[r] -= fr * bi[k] + fi * br[k]
      }
    }
    const xr = new Float64Array(n)
    const xi = new Float64Array(n)
    for (let k = n - 1; k >= 0; k--) {
      let sr = br[k]
      let si = bi[k]
      for (let c = k + 1; c < n; c++) {
        const yr = ar[k * n + c]
        const yi = ai[k * n + c]
        sr -= yr * xr[c] - yi * xi[c]
        si -= yr * xi[c] + yi * xr[c]
      }
      const pr = ar[k * n + k]
      const pi = ai[k * n + k]
      const pd = pr * pr + pi * pi
      xr[k] = (sr * pr + si * pi) / pd
      xi[k] = (si * pr - sr * pi) / pd
    }
    return [xr, xi]
  }
}

export interface BodePoint {
  f: number
  /** |H| in dB */
  db: number
  /** phase in degrees */
  phase: number
  mag: number
}

/** log-spaced frequencies */
export function logSpace(f0: number, f1: number, n: number): number[] {
  const out: number[] = []
  const a = Math.log10(f0)
  const b = Math.log10(f1)
  for (let i = 0; i < n; i++) out.push(10 ** (a + ((b - a) * i) / (n - 1)))
  return out
}

/** −3 dB points relative to the peak (low and high side, null when not crossed) */
export function cutoffs(points: BodePoint[]): { peak: BodePoint; low: number | null; high: number | null } {
  let peak = points[0]
  for (const p of points) if (p.db > peak.db) peak = p
  const target = peak.db - 3.0103
  let low: number | null = null
  let high: number | null = null
  const i0 = points.indexOf(peak)
  for (let i = i0; i > 0; i--) {
    if (points[i - 1].db < target) {
      low = interpLog(points[i - 1], points[i], target)
      break
    }
  }
  for (let i = i0; i < points.length - 1; i++) {
    if (points[i + 1].db < target) {
      high = interpLog(points[i], points[i + 1], target)
      break
    }
  }
  return { peak, low, high }
}

function interpLog(a: BodePoint, b: BodePoint, db: number): number {
  const t = (db - a.db) / (b.db - a.db)
  return 10 ** (Math.log10(a.f) + t * (Math.log10(b.f) - Math.log10(a.f)))
}
