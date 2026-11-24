/**
 * EE Lab I experiment data format (one JSON file per experiment in
 * src/labs/ee-lab-1/). Adding or changing a lab is editing data: text,
 * pre-lab questions, the measurement table, an optional parameter sweep,
 * the checks the simulator verifies and a reference build.
 *
 * Expressions (`expect`, `predict`, `theory`, `transform`) are small math:
 * numbers, + − * / ( ), Math functions (sqrt, log10, exp, abs, pow, PI…),
 * pre-lab keys, part values by id (R1 = its resistance, C1 = capacitance,
 * L1 = inductance) and any numeric part param as ID_param (GEN_frequency,
 * PS_v1). Sweeps add `x` (the swept value) and `v` (the reading).
 */
import type { CircuitLayout } from '../model/types'

export interface PrelabField {
  key: string
  label: string
  unit?: string
  /** the correct value (expression) — used for feedback, never shown first */
  answer: string
}

export interface TableRow {
  key: string
  label: string
  unit?: string
  /** predicted value: an expression (often a pre-lab key) */
  predict: string
  /** where "Use reading" takes the value from (see labs/sources.ts) */
  source: string
  /** optional conversion of the reading, with `v` = the raw reading */
  transform?: string
  /** % error that counts as a good measurement (default 5) */
  tol?: number
}

export interface Sweep {
  part: string
  key: string
  values: number[]
  source: string
  /** y from the reading v and the swept value x */
  compute: string
  theory: string
  xLabel: string
  yLabel: string
  logX?: boolean
}

export type Check =
  | { kind: 'dc'; label: string; ref: string; ref2?: string; expect: string; tol?: number; abs?: number }
  | { kind: 'reading'; label: string; part: string; expect: string; tol?: number; abs?: number }
  | { kind: 'led'; label: string; part: string; on: boolean; set?: SetParam[] }
  | { kind: 'bode'; label: string; gen: string; in: string | null; out: string; metric: 'high' | 'low' | 'f0' | 'q' | 'gainAt'; f?: number; expect: string; tol?: number }
  | { kind: 'vpp' | 'freq' | 'vavg'; label: string; ref: string; ref2?: string; window: number; expect: string; tol?: number; abs?: number }
  /** final: the settled level (omit = the level at the end of the half period); dt: a finer solver step for fast responses */
  | { kind: 'step'; label: string; ref: string; gen: string; metric: 'tau' | 'overshoot' | 'ringFreq'; final?: number; dt?: number; expect: string; tol?: number; abs?: number }
  | { kind: 'curve'; label: string; tracer: string; mode: 'diode' | 'npn' | 'pnp' | 'nmos'; metric: 'vAtI' | 'beta'; at: number; expect: string; tol?: number }
  | { kind: 'truth'; label: string; inputs: string[]; outputs: string[]; rows: { in: number[]; out: number[] }[] }
  | { kind: 'segments'; label: string; set: SetParam[]; part: string; lit: string }

export interface SetParam {
  part: string
  key: string
  value: number | boolean | string
}

export interface Experiment {
  /** illustrated-view callouts (part, title, text, icon) */
  callouts?: { part: string; title: string; text: string; icon?: string }[]
  id: string
  number: number
  title: string
  topics: string[]
  goal: string
  theory: string[]
  prelab: PrelabField[]
  procedure: string[]
  table: TableRow[]
  sweep?: Sweep
  checks: Check[]
  /** seconds of simulation before the checks look */
  settle?: number
  build: CircuitLayout
}
