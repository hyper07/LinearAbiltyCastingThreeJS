/**
 * EE Lab I: the experiment runner — goal and theory, pre-lab with feedback,
 * procedure, the measurement table (click "Use" to take the instrument's
 * present reading), % error, an optional sweep plotted against theory,
 * simulator checks of the student's own build, and the lab-data export.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useStore } from '../../state/store'
import { SimEngine } from '../../sim/engine'
import { Sheet, showToast } from '../kit'
import { EXPERIMENTS, TRACK, experimentById } from '../../labs'
import { evalExpr, layoutVars, runChecks, type CheckResult } from '../../labs/checks'
import { benchReadings, readSource, sourceName } from '../../labs/sources'
import { emptyRecord, labCSV, labVars, prelabResults, summaryHTML, tableResults, type LabRecord } from '../../labs/report'
import type { Experiment } from '../../labs/types'
import { download, drawPlot, fmt } from './plot'
import './lab.css'
import './bench.css'

const SNAP = [0.6, 0.94] as const
const KEY = 'circuitlab.eelab1.'

function loadRecord(id: string): LabRecord {
  try {
    const raw = localStorage.getItem(KEY + id)
    if (raw) return { ...emptyRecord(), ...JSON.parse(raw) }
  } catch {
    /* storage unavailable */
  }
  return emptyRecord()
}
function saveRecord(id: string, r: LabRecord): void {
  try {
    localStorage.setItem(KEY + id, JSON.stringify({ ...r, checks: undefined }))
  } catch {
    /* storage unavailable */
  }
}

/** load an experiment's reference build and run it */
export function loadExperiment(id: string): boolean {
  const exp = experimentById(id)
  if (!exp) return false
  const st = useStore.getState()
  st.resetSim()
  const res = st.loadLayout(structuredClone(exp.build))
  if (!res.ok) return false
  useStore.getState().startSim()
  return true
}

/** one sweep point on a fresh copy of the circuit with the swept part changed */
function sweepPoint(exp: Experiment, x: number): number {
  const sw = exp.sweep!
  const layout = structuredClone(useStore.getState().layout)
  const part = layout.components.find((c) => c.id === sw.part)
  if (!part) return NaN
  part.params = { ...part.params, [sw.key]: x }
  const e = new SimEngine(layout)
  e.advance(0.5, e.preferredDt())
  const src = sw.source
  const v = src.startsWith('dmm:') ? e.componentTelemetry(src.slice(4))?.value : e.netVoltage(src)
  return evalExpr(sw.compute, { v: v ?? NaN, x })
}

export function LabSheet({ open, onDismiss, desktop = false, expId, setExpId, onBench }: { open: boolean; onDismiss: () => void; desktop?: boolean; expId: string; setExpId: (id: string) => void; onBench: () => void }) {
  const [snap, setSnap] = useState(0)
  const exp = experimentById(expId) ?? EXPERIMENTS[0]
  const [rec, setRec] = useState<LabRecord>(() => loadRecord(exp.id))
  const [busy, setBusy] = useState(false)
  const sweepCanvas = useRef<HTMLCanvasElement>(null)
  // re-render when an instrument publishes a reading so "Use" enables
  useSyncExternalStore(benchReadings.subscribe, () => benchReadings.get('scope.ch1.vpp') ?? 0)
  useStore((s) => s.telemetry)

  useEffect(() => {
    if (open) setSnap(0)
  }, [open])
  useEffect(() => setRec(loadRecord(exp.id)), [exp.id])
  const update = (fn: (r: LabRecord) => LabRecord) =>
    setRec((r) => {
      const n = fn(r)
      saveRecord(exp.id, n)
      return n
    })

  useEffect(() => {
    if (!exp.sweep || !sweepCanvas.current) return
    const sw = exp.sweep
    const vars = { ...layoutVars(exp.build), ...layoutVars(useStore.getState().layout) }
    const xs = sw.logX ? Array.from({ length: 60 }, (_, i) => sw.values[0] * (sw.values[sw.values.length - 1] / sw.values[0]) ** (i / 59)) : sw.values
    drawPlot(
      sweepCanvas.current,
      [
        { label: 'theory', color: '#8b94a3', dashed: true, points: xs.map((x) => ({ x, y: evalExpr(sw.theory, { ...vars, x }) })) },
        { label: 'measured', color: '#ffd84a', dots: true, points: rec.sweep ?? [] },
      ],
      { logX: sw.logX, xLabel: sw.xLabel, yLabel: sw.yLabel },
    )
  }, [exp, rec.sweep])

  const pre = prelabResults(exp, rec)
  const rows = tableResults(exp, rec)
  const vars = labVars(exp)
  const prelabDone = pre.every((p) => p.ok !== null)

  const runSweep = async () => {
    setBusy(true)
    const pts: { x: number; y: number }[] = []
    for (const x of exp.sweep!.values) {
      pts.push({ x, y: sweepPoint(exp, x) })
      update((r) => ({ ...r, sweep: pts.slice() }))
      await new Promise((r) => setTimeout(r, 0))
    }
    setBusy(false)
  }
  const check = () => {
    setBusy(true)
    setTimeout(() => {
      const res: CheckResult[] = runChecks(exp, useStore.getState().layout)
      setRec((r) => ({ ...r, checks: res }))
      setBusy(false)
      showToast(res.every((c) => c.pass) ? 'All checks pass' : `${res.filter((c) => !c.pass).length} check(s) to look at`)
    }, 20)
  }
  const images = () => {
    const out: { title: string; src: string }[] = []
    if (exp.sweep && sweepCanvas.current && rec.sweep?.length) out.push({ title: `${exp.sweep.yLabel} vs ${exp.sweep.xLabel}`, src: sweepCanvas.current.toDataURL() })
    const names: Record<string, string> = { scope: 'Oscilloscope', bode: 'Bode plot', tracer: 'I–V curves', daq: 'DAQ acquisition' }
    for (const [k, src] of benchReadings.images()) out.push({ title: names[k] ?? k, src })
    return out
  }
  const base = `lab${String(exp.number).padStart(2, '0')}`

  return (
    <Sheet open={open} onDismiss={onDismiss} snapPoints={SNAP} activeSnap={snap} onSnapChange={setSnap} desktop={desktop} anchor="right" ariaLabel="EE Lab" className="lab-wide bn-sheet asm-sheet">
      <div className="lab-code ee-lab" data-ee-lab={exp.id}>
        <div className="lab-head">
          <span className="lg-title">EE Lab I</span>
          <span className="lab-badge">{TRACK.title}</span>
        </div>
        <select className="ee-select" value={exp.id} onChange={(e) => setExpId(e.target.value)} aria-label="Experiment">
          {EXPERIMENTS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.number}. {e.title}
            </option>
          ))}
        </select>
        <div className="ee-topics">{exp.topics.join(' · ')}</div>
        <p className="ee-goal">
          <b>Goal.</b> {exp.goal}
        </p>
        <details className="ee-sec" open>
          <summary>Theory</summary>
          {exp.theory.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </details>

        <div className="ee-box">
          <div className="ee-box-title">Pre-lab</div>
          {pre.map((p) => (
            <label key={p.key} className="ee-pre">
              <span>{p.label}</span>
              <input inputMode="decimal" value={rec.prelab[p.key] ?? ''} placeholder={p.unit} onChange={(e) => update((r) => ({ ...r, prelab: { ...r.prelab, [p.key]: e.target.value } }))} />
              <span className="ee-unit">{p.unit}</span>
              <span className={p.ok === null ? 'ee-mark' : p.ok ? 'ee-mark is-ok' : 'ee-mark is-bad'}>{p.ok === null ? '' : p.ok ? '✓' : '✗'}</span>
            </label>
          ))}
          {prelabDone && pre.some((p) => !p.ok) && <p className="lab-dim">Not quite — recheck the formula in the theory. A tick means within 2 %.</p>}
        </div>

        <details className="ee-sec" open>
          <summary>Procedure</summary>
          <ol>
            {exp.procedure.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div className="bn-row">
            <button type="button" className="lab-btn is-primary" onClick={() => (loadExperiment(exp.id) ? showToast(`Lab ${exp.number} loaded`) : showToast('Could not load the build'))} data-ee-load>
              Load reference build
            </button>
            <button type="button" className="lab-btn" onClick={onBench}>
              Open the bench
            </button>
          </div>
        </details>

        <div className="ee-box">
          <div className="ee-box-title">Measurements</div>
          <table className="bn-table ee-table">
            <thead>
              <tr>
                <th>Quantity</th>
                <th>Predicted</th>
                <th>Measured</th>
                <th>% err</th>
              </tr>
            </thead>
            <tbody>
              {exp.table.map((r, i) => {
                const res = rows[i]
                const raw = readSource(r.source)
                const reading = raw === undefined ? undefined : r.transform ? evalExpr(r.transform, { ...vars, v: raw }) : raw
                return (
                  <tr key={r.key}>
                    <td>{r.label}</td>
                    <td>
                      {prelabDone ? fmt(res.predicted) : '—'}
                      {r.unit}
                    </td>
                    <td className="ee-meas">
                      <input inputMode="decimal" value={rec.measured[r.key] ?? ''} onChange={(e) => update((x) => ({ ...x, measured: { ...x.measured, [r.key]: e.target.value } }))} aria-label={r.label} />
                      <button
                        type="button"
                        className="lab-btn ee-use"
                        disabled={reading === undefined}
                        title={`Take the ${sourceName(r.source)} reading${reading !== undefined ? ` (${fmt(reading)}${r.unit ?? ''})` : ''}`}
                        onClick={() => reading !== undefined && update((x) => ({ ...x, measured: { ...x.measured, [r.key]: String(+reading.toPrecision(5)) } }))}
                        data-ee-use={r.key}
                      >
                        Use
                      </button>
                    </td>
                    <td className={res.good === null ? '' : res.good ? 'ee-ok' : 'ee-bad'}>{Number.isFinite(res.error) ? res.error.toFixed(1) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="lab-dim">"Use" takes the instrument's present reading ({[...new Set(exp.table.map((r) => sourceName(r.source)))].join(', ')}). Predictions appear once the pre-lab is filled in.</p>
        </div>

        {exp.sweep && (
          <div className="ee-box">
            <div className="ee-box-title">
              Sweep {exp.sweep.part} {exp.sweep.key}
            </div>
            <canvas ref={sweepCanvas} width={600} height={240} className="bn-plot" data-ee-sweep />
            <button type="button" className="lab-btn" disabled={busy} onClick={() => void runSweep()}>
              Measure all {exp.sweep.values.length} points
            </button>
          </div>
        )}

        <div className="ee-box">
          <div className="ee-box-title">Check my build</div>
          <button type="button" className="lab-btn is-primary" disabled={busy} onClick={check} data-ee-check>
            {busy ? 'Simulating…' : 'Run simulator checks'}
          </button>
          {rec.checks && (
            <ul className="ee-checks" data-ee-checks>
              {rec.checks.map((c, i) => (
                <li key={i} className={c.pass ? 'ee-ok' : 'ee-bad'}>
                  {c.pass ? '✓' : '✗'} {c.label} — {typeof c.measured === 'number' ? fmt(c.measured) : c.measured}
                  {typeof c.expected === 'number' && Number.isFinite(c.expected) ? ` (expected ${fmt(c.expected)})` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bn-row ee-export">
          <span>Export lab data</span>
          <button type="button" className="lab-btn" onClick={() => download(`${base}.csv`, labCSV(exp, rec))} data-ee-csv>
            CSV
          </button>
          <button
            type="button"
            className="lab-btn"
            onClick={() => {
              const imgs = images()
              if (!imgs.length) showToast('No plots yet — run a sweep, the scope, Bode or the tracer first')
              imgs.forEach((im, i) => download(`${base}-${i + 1}.png`, im.src))
            }}
          >
            PNG plots
          </button>
          <button
            type="button"
            className="lab-btn"
            onClick={() => {
              const html = summaryHTML(exp, rec, images())
              const w = window.open('', '_blank')
              if (w) {
                w.document.write(html)
                w.document.close()
              } else download(`${base}-summary.html`, html, 'text/html')
            }}
            data-ee-summary
          >
            Printable summary
          </button>
        </div>
      </div>
    </Sheet>
  )
}
