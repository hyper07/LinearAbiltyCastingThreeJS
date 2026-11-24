/**
 * EE Lab I: the simulator verifies a student's build. Each check runs on a
 * fresh copy of the circuit (so it never disturbs the live bench) and
 * compares a solver measurement with the expected value.
 */
import { SimEngine } from '../sim/engine'
import { getEntry } from '../model/catalog'
import type { CircuitLayout } from '../model/types'
import { bode, measure, traceCurves, type Trace } from '../bench/measure'
import type { Check, Experiment, SetParam } from './types'

// ------------------------------------------------------------ expressions

const MAIN: Record<string, string> = { resistance: '', capacitance: '', inductance: '', vz: '' }

/** variables for expressions: part values by id, ID_param for numeric params */
export function layoutVars(layout: CircuitLayout): Record<string, number> {
  const out: Record<string, number> = {}
  for (const c of layout.components) {
    const entry = getEntry(c.type)
    for (const p of entry?.params ?? []) {
      const v = c.params?.[p.key] ?? p.default
      if (typeof v !== 'number') continue
      out[`${c.id}_${p.key}`] = v
      if (p.key in MAIN && out[c.id] === undefined) out[c.id] = v
    }
  }
  return out
}

const SAFE = /^[\s\d.eE+\-*/(),A-Za-z_]*$/
const MATH = ['sqrt', 'log10', 'log', 'exp', 'abs', 'pow', 'PI', 'atan', 'sin', 'cos', 'tan', 'min', 'max', 'round', 'E']

/** evaluate a lab expression; NaN when it cannot be evaluated */
export function evalExpr(expr: string | number, vars: Record<string, number>): number {
  if (typeof expr === 'number') return expr
  if (!SAFE.test(expr)) return NaN
  const ids = (expr.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []).filter((n, i, a) => a.indexOf(n) === i && !/^\d/.test(n))
  for (const id of ids) if (!(id in vars) && !MATH.includes(id) && !/^e\d*$/i.test(id)) return NaN
  try {
    const names = Object.keys(vars).filter((k) => /^[A-Za-z_]\w*$/.test(k))
    // eslint-disable-next-line no-new-func
    const f = new Function(...MATH, ...names, `"use strict"; return (${expr});`)
    const v = f(...MATH.map((m) => (Math as unknown as Record<string, unknown>)[m]), ...names.map((n) => vars[n]))
    return typeof v === 'number' ? v : NaN
  } catch {
    return NaN
  }
}

export function pctError(measured: number, predicted: number): number {
  if (!Number.isFinite(measured) || !Number.isFinite(predicted)) return NaN
  if (predicted === 0) return Math.abs(measured) * 100
  return (Math.abs(measured - predicted) / Math.abs(predicted)) * 100
}

// ---------------------------------------------------------------- checks

export interface CheckResult {
  label: string
  pass: boolean
  measured: number | string
  expected: number | string
  detail?: string
}

function settled(layout: CircuitLayout, settle: number, set: SetParam[] = []): SimEngine {
  const e = new SimEngine(layout)
  for (const s of set) e.setRuntimeParam(s.part, s.key, s.value)
  e.advance(settle, e.preferredDt())
  return e
}

function sample(e: SimEngine, ref: string, ref2: string | undefined, seconds: number, dt?: number): Trace {
  const h = Math.min(dt ?? Infinity, e.preferredDt())
  const n = Math.max(2, Math.round(seconds / h))
  const t: number[] = []
  const v: number[] = []
  for (let i = 0; i < n; i++) {
    e.step(h)
    t.push(e.time)
    v.push(e.netVoltage(ref) - (ref2 ? e.netVoltage(ref2) : 0))
  }
  return { t, v }
}

function near(measured: number, expected: number, tol = 0.05, abs?: number): boolean {
  if (!Number.isFinite(measured) || !Number.isFinite(expected)) return false
  if (abs !== undefined) return Math.abs(measured - expected) <= abs
  return Math.abs(measured - expected) <= Math.abs(expected) * tol + 1e-9
}

const logic = (v: number) => (v > 2.0 ? 1 : v < 0.8 ? 0 : -1)

export function runCheck(check: Check, layout: CircuitLayout, settle: number): CheckResult {
  const vars = layoutVars(layout)
  const want = 'expect' in check ? evalExpr(check.expect, vars) : NaN
  const res = (measured: number, pass: boolean, detail?: string): CheckResult => ({ label: check.label, pass, measured, expected: want, detail })
  try {
    switch (check.kind) {
      case 'dc': {
        const e = settled(layout, settle)
        const v = e.netVoltage(check.ref) - (check.ref2 ? e.netVoltage(check.ref2) : 0)
        return res(v, near(v, want, check.tol, check.abs))
      }
      case 'reading': {
        const e = settled(layout, Math.max(settle, 0.5))
        const v = e.componentTelemetry(check.part)?.value ?? NaN
        return res(v, near(v, want, check.tol, check.abs))
      }
      case 'led': {
        const e = settled(layout, settle, check.set)
        const b = e.componentTelemetry(check.part)?.ledBrightness ?? 0
        return { label: check.label, pass: b > 0.2 === check.on, measured: b > 0.2 ? 'on' : 'off', expected: check.on ? 'on' : 'off' }
      }
      case 'vpp':
      case 'freq':
      case 'vavg': {
        const e = settled(layout, settle)
        const m = measure(sample(e, check.ref, check.ref2, check.window))
        const v = check.kind === 'vpp' ? m.vpp : check.kind === 'vavg' ? m.vavg : m.freq ?? NaN
        return res(v, near(v, want, check.tol, check.abs))
      }
      case 'bode': {
        const r = bode(layout, check.gen, check.in, check.out, 10, 1e6, 241)
        if (!r) return res(NaN, false, 'no response')
        let v = NaN
        if (check.metric === 'high') v = r.high ?? NaN
        else if (check.metric === 'low') v = r.low ?? NaN
        else if (check.metric === 'f0') v = r.f0
        else if (check.metric === 'q') v = r.q ?? NaN
        else {
          const f = check.f ?? 1000
          v = r.points.reduce((a, b) => (Math.abs(Math.log(b.f / f)) < Math.abs(Math.log(a.f / f)) ? b : a)).mag
        }
        return res(v, near(v, want, check.tol))
      }
      case 'step': {
        // align on a rising edge of the square-wave generator (k / f)
        const e = new SimEngine(layout)
        const f = Number(layout.components.find((c) => c.id === check.gen)?.params?.frequency ?? 1)
        const periods = Math.max(1, Math.ceil(settle * f))
        const h = Math.min(check.dt ?? Infinity, e.preferredDt())
        e.advance(periods / f, h)
        const tr = sample(e, check.ref, undefined, 0.5 / f, h)
        const v0 = tr.v[0]
        const final = check.final ?? tr.v[tr.v.length - 1]
        const span = final - v0
        let v = NaN
        if (check.metric === 'tau') {
          const i = tr.v.findIndex((x) => (x - v0) / span >= 1 - Math.exp(-1))
          v = i >= 0 ? tr.t[i] - tr.t[0] : NaN
        } else if (check.metric === 'overshoot') {
          v = ((Math.max(...tr.v) - final) / span) * 100
        } else {
          const peaks: number[] = []
          for (let i = 1; i < tr.v.length - 1; i++) if (tr.v[i] > tr.v[i - 1] && tr.v[i] >= tr.v[i + 1] && tr.v[i] > final) peaks.push(tr.t[i])
          v = peaks.length >= 2 ? 1 / (peaks[1] - peaks[0]) : NaN
        }
        return res(v, near(v, want, check.tol, check.abs))
      }
      case 'curve': {
        const curves = traceCurves(layout, check.tracer, check.mode, { points: 81, vMax: check.mode === 'diode' ? 2 : 8, steps: check.metric === 'beta' ? [check.at] : undefined })
        let v = NaN
        if (check.metric === 'vAtI') {
          const p = curves[0].points.find((q) => q.i >= check.at)
          v = p?.v ?? NaN
        } else {
          const pts = curves[0].points
          v = pts[Math.floor(pts.length * 0.75)].i / check.at
        }
        return res(v, near(v, want, check.tol))
      }
      case 'truth': {
        const bad: string[] = []
        for (const row of check.rows) {
          const e = settled(layout, settle, check.inputs.map((p, i) => ({ part: p, key: 'on', value: row.in[i] === 1 })))
          const got = check.outputs.map((r) => logic(e.netVoltage(r)))
          if (got.join() !== row.out.join()) bad.push(`${row.in.join('')}→${got.join('')}`)
        }
        return { label: check.label, pass: bad.length === 0, measured: bad.length ? bad.join(' ') : 'all rows', expected: `${check.rows.length} rows` }
      }
      case 'segments': {
        const e = settled(layout, settle, check.set)
        const segs = e.componentTelemetry(check.part)?.segments ?? {}
        const lit = Object.keys(segs).filter((k) => segs[k] && k !== 'dp').sort().join('')
        return { label: check.label, pass: lit === check.lit.split('').sort().join(''), measured: lit || '(none)', expected: check.lit }
      }
    }
  } catch (err) {
    return { label: check.label, pass: false, measured: NaN, expected: want, detail: String(err) }
  }
  return res(NaN, false)
}

export function runChecks(exp: Experiment, layout: CircuitLayout): CheckResult[] {
  return exp.checks.map((c) => runCheck(c, layout, exp.settle ?? 0.05))
}
