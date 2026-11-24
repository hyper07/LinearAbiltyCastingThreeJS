/** EE Lab I: every experiment's reference build validates and passes its own checks; pre-lab answers evaluate. */
import { describe, expect, it } from 'vitest'
import { EXPERIMENTS } from '../src/labs'
import { evalExpr, layoutVars, pctError, runChecks } from '../src/labs/checks'
import { validateLayout } from '../src/model/validate'
import { labCSV, labVars, summaryHTML, tableResults } from '../src/labs/report'

describe('EE Lab I experiments', () => {
  it('are numbered in order with unique ids', () => {
    expect(EXPERIMENTS.length).toBeGreaterThanOrEqual(6)
    EXPERIMENTS.forEach((e, i) => expect(e.number).toBe(i + 1))
    expect(new Set(EXPERIMENTS.map((e) => e.id)).size).toBe(EXPERIMENTS.length)
  })

  for (const exp of EXPERIMENTS) {
    it(`${exp.number}. ${exp.title}: reference build passes its checks`, () => {
      const v = validateLayout(exp.build)
      expect(v.errors, exp.id).toEqual([])
      const vars = { ...layoutVars(exp.build) }
      for (const p of exp.prelab) {
        const a = evalExpr(p.answer, vars)
        expect(Number.isFinite(a), `${exp.id} prelab ${p.key}`).toBe(true)
        vars[p.key] = a
      }
      for (const r of exp.table) expect(Number.isFinite(evalExpr(r.predict, vars)), `${exp.id} table ${r.key}`).toBe(true)
      const results = runChecks(exp, exp.build)
      for (const r of results) expect(r.pass, `${exp.id}: ${r.label} measured ${r.measured} expected ${r.expected} ${r.detail ?? ''}`).toBe(true)
    }, 60000)
  }

  it('builds the lab CSV and summary with % error', () => {
    const exp = EXPERIMENTS[0]
    const vars = labVars(exp)
    const r0 = exp.table[0]
    const predicted = evalExpr(r0.predict, vars)
    const rec = { prelab: Object.fromEntries(exp.prelab.map((p) => [p.key, String(vars[p.key])])), measured: { [r0.key]: String(predicted * 1.02) } }
    const rows = tableResults(exp, rec)
    expect(rows[0].error).toBeCloseTo(2, 5)
    expect(rows[0].good).toBe(true)
    const csv = labCSV(exp, rec)
    expect(csv).toContain('measurement,unit,predicted,measured,% error')
    expect(csv).toContain(r0.label.includes(',') ? `"${r0.label}"` : r0.label)
    expect(summaryHTML(exp, rec, [])).toContain('<table>')
  })

  it('evaluates expressions safely and computes % error', () => {
    expect(evalExpr('1/(2*PI*R1*C1)', { R1: 1000, C1: 1e-7 })).toBeCloseTo(1591.55, 1)
    expect(evalExpr('alert(1)', {})).toBeNaN()
    expect(evalExpr('R9', {})).toBeNaN()
    expect(pctError(105, 100)).toBeCloseTo(5)
  })
})
