/**
 * EE Lab I write-up data: the student's record (pre-lab answers, measured
 * values, sweep points, check results) → predictions, % errors, a CSV and a
 * printable HTML summary.
 */
import { toCSV } from '../bench/measure'
import { evalExpr, layoutVars, pctError, type CheckResult } from './checks'
import type { Experiment } from './types'

export interface LabRecord {
  prelab: Record<string, string>
  measured: Record<string, string>
  sweep?: { x: number; y: number }[]
  checks?: CheckResult[]
}

export const emptyRecord = (): LabRecord => ({ prelab: {}, measured: {} })

/** expression variables: reference-build part values + correct pre-lab answers */
export function labVars(exp: Experiment): Record<string, number> {
  const vars = layoutVars(exp.build)
  for (const p of exp.prelab) vars[p.key] = evalExpr(p.answer, vars)
  return vars
}

export interface RowResult {
  key: string
  label: string
  unit: string
  predicted: number
  measured: number
  error: number
  good: boolean | null
}

export function tableResults(exp: Experiment, rec: LabRecord): RowResult[] {
  const vars = labVars(exp)
  return exp.table.map((r) => {
    const predicted = evalExpr(r.predict, vars)
    const raw = rec.measured[r.key]
    const measured = raw === undefined || raw === '' ? NaN : Number(raw)
    const error = pctError(measured, predicted)
    return { key: r.key, label: r.label, unit: r.unit ?? '', predicted, measured, error, good: Number.isFinite(error) ? error <= (r.tol ?? 5) : null }
  })
}

/** pre-lab feedback: the student's answer against the correct one (within 2 %) */
export function prelabResults(exp: Experiment, rec: LabRecord): { key: string; label: string; unit: string; given: number; answer: number; ok: boolean | null }[] {
  const vars = labVars(exp)
  return exp.prelab.map((p) => {
    const raw = rec.prelab[p.key]
    const given = raw === undefined || raw === '' ? NaN : Number(raw)
    const answer = vars[p.key]
    return { key: p.key, label: p.label, unit: p.unit ?? '', given, answer, ok: Number.isFinite(given) ? pctError(given, answer) <= 2 : null }
  })
}

const num = (v: number) => (Number.isFinite(v) ? +v.toPrecision(5) : '')

export function labCSV(exp: Experiment, rec: LabRecord): string {
  const parts: string[] = [`# ${exp.number}. ${exp.title}`]
  parts.push(toCSV(['pre-lab', 'unit', 'your answer'], prelabResults(exp, rec).map((p) => [p.label, p.unit, num(p.given)])))
  parts.push(toCSV(['measurement', 'unit', 'predicted', 'measured', '% error'], tableResults(exp, rec).map((r) => [r.label, r.unit, num(r.predicted), num(r.measured), num(r.error)])))
  if (rec.sweep?.length && exp.sweep) parts.push(toCSV([exp.sweep.xLabel, exp.sweep.yLabel], rec.sweep.map((p) => [num(p.x), num(p.y)])))
  if (rec.checks?.length) parts.push(toCSV(['simulator check', 'measured', 'expected', 'pass'], rec.checks.map((c) => [c.label, typeof c.measured === 'number' ? num(c.measured) : c.measured, typeof c.expected === 'number' ? num(c.expected) : c.expected, c.pass ? 'yes' : 'no'])))
  return parts.join('\n\n') + '\n'
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

/** a self-contained printable page: goal, tables, plots, checks */
export function summaryHTML(exp: Experiment, rec: LabRecord, images: { title: string; src: string }[]): string {
  const rows = tableResults(exp, rec)
  const pre = prelabResults(exp, rec)
  const cell = (v: number) => (Number.isFinite(v) ? String(+v.toPrecision(4)) : '—')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(`Lab ${exp.number} ${exp.title}`)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:820px;margin:24px auto;padding:0 16px;color:#111}h1{font-size:22px}table{border-collapse:collapse;width:100%;margin:8px 0 18px}td,th{border:1px solid #bbb;padding:4px 8px;text-align:left}th{background:#f1f1f1}.ok{color:#137333}.bad{color:#b3261e}img{max-width:100%;border:1px solid #ccc;margin:6px 0}</style></head><body>
<h1>EE Lab I · ${exp.number}. ${esc(exp.title)}</h1>
<p><b>Goal.</b> ${esc(exp.goal)}</p>
<h2>Pre-lab</h2><table><tr><th>Quantity</th><th>Your answer</th><th></th></tr>${pre.map((p) => `<tr><td>${esc(p.label)}</td><td>${cell(p.given)} ${esc(p.unit)}</td><td class="${p.ok ? 'ok' : 'bad'}">${p.ok === null ? '' : p.ok ? '✓' : '✗'}</td></tr>`).join('')}</table>
<h2>Measurements</h2><table><tr><th>Measurement</th><th>Predicted</th><th>Measured</th><th>% error</th></tr>${rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${cell(r.predicted)} ${esc(r.unit)}</td><td>${cell(r.measured)} ${esc(r.unit)}</td><td class="${r.good ? 'ok' : 'bad'}">${Number.isFinite(r.error) ? r.error.toFixed(1) + ' %' : '—'}</td></tr>`).join('')}</table>
${images.map((i) => `<h3>${esc(i.title)}</h3><img src="${i.src}" alt="${esc(i.title)}">`).join('')}
${rec.checks?.length ? `<h2>Simulator checks</h2><table><tr><th>Check</th><th>Result</th></tr>${rec.checks.map((c) => `<tr><td>${esc(c.label)}</td><td class="${c.pass ? 'ok' : 'bad'}">${c.pass ? 'pass' : 'fail'} (${esc(String(typeof c.measured === 'number' ? +c.measured.toPrecision(4) : c.measured))})</td></tr>`).join('')}</table>` : ''}
<p style="color:#666">Made with Circuit Lab — ${esc(new Date().toLocaleDateString())}</p></body></html>`
}
