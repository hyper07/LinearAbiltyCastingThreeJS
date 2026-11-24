/**
 * Bench panels for the measurement and wireless instruments: frequency
 * counter, spectrum analyzer, true-RMS voltmeter, LCR meter, VNA (S11 / S21 /
 * Smith chart), RF power meter, noise source, the RF link budget and the
 * USRP B210's spectrum view. Same look as BenchSheet's panels.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { liveEngine, useStore } from '../../state/store'
import { getEntry } from '../../model/catalog'
import type { ComponentInstance } from '../../model/types'
import { showToast } from '../kit'
import { benchReadings } from '../../labs/sources'
import { captureSpectrum, lcrMeasure, rfSpectrum, sdrSpectrum, vnaSweep, LCR_FREQS, type LcrReading, type Spectrum, type VnaResult } from '../../bench/rf-measure'
import { toCSV } from '../../bench/measure'
import { RfWorld, linkTable, type LinkRow } from '../../sim/rf-world'
import { B210 } from '../../model/rf-data'
import { download, drawPlot, fmt } from './plot'
import { Knob } from './BenchSheet'
import { mono } from '../fonts'
import './rf-bench.css'

function useFirst(type: string): ComponentInstance | undefined {
  return useStore((s) => s.layout.components.find((c) => c.type === type))
}
function param(c: ComponentInstance | undefined, key: string): number | string | boolean | undefined {
  if (!c) return undefined
  return c.params?.[key] ?? getEntry(c.type)?.params?.find((p) => p.key === key)?.default
}
const setP = (id: string, key: string, v: number | string | boolean) => useStore.getState().setParam(id, key, v)
const show = (id: string, text: string) => liveEngine()?.setRuntimeParam(id, '__display', text)

function Seg<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div className="bn-seg">
      {options.map((o) => (
        <button key={o} type="button" className={o === value ? 'is-on' : ''} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}
function Missing({ what, type }: { what: string; type: string }) {
  return (
    <div className="bn-missing">
      No {what} on the bench.{' '}
      <button type="button" className="lab-btn" onClick={() => useStore.getState().addComponent(type, {})}>
        Add one
      </button>
    </div>
  )
}
const hz = (f: number) => `${fmt(f)}Hz`
const db = (x: number | null | undefined, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x.toFixed(d)}`)

// ------------------------------------------------------------- counter

export function CounterPanel() {
  const c = useFirst('freq_counter')
  const tele = useStore((s) => (c ? s.telemetry?.components[c.id] : undefined))
  if (!c) return <Missing what="frequency counter" type="freq_counter" />
  const x = tele?.extra ?? {}
  const f = Number(x.freq)
  if (Number.isFinite(f)) benchReadings.set('counter.freq', f)
  return (
    <div className="bn-panel" data-instrument="counter">
      <div className="bn-lcd" data-counter-reading>{tele?.reading ?? '---- Hz'}</div>
      <div className="bn-row">
        <span>Gate</span>
        <Seg value={String(param(c, 'gate'))} options={['10 ms', '0.1 s', '1 s']} onChange={(v) => setP(c.id, 'gate', v)} />
        <span>Shows</span>
        <Seg value={String(param(c, 'display'))} options={['frequency', 'period', 'count']} onChange={(v) => setP(c.id, 'display', v)} />
      </div>
      <div className="bn-row">
        <span>Trigger</span>
        <Seg value={String(param(c, 'level'))} options={['auto', '0 V', '1.4 V (TTL)', '2.5 V']} onChange={(v) => setP(c.id, 'level', v)} />
      </div>
      <div className="bn-meas">
        period {Number.isFinite(Number(x.period)) ? `${fmt(Number(x.period))}s` : '—'} · {String(x.count ?? 0)} crossings per gate · duty {Number.isFinite(Number(x.duty)) ? `${(Number(x.duty) * 100).toFixed(1)} %` : '—'} · {Number.isFinite(Number(x.vpp)) ? `${fmt(Number(x.vpp))}Vpp` : ''}
      </div>
      <p className="lab-dim">Reciprocal counting: it times the first and last rising crossing in each gate, so even a short gate reads to many digits. A longer gate averages more periods.</p>
    </div>
  )
}

// --------------------------------------------------------- spectrum

const STOPS = [100, 200, 500, 1e3, 2e3, 5e3, 1e4, 2e4, 5e4, 1e5, 2e5, 5e5, 1e6]
const RBWS = [1, 3, 10, 30, 100, 300, 1e3, 3e3, 1e4, 3e4, 1e5, 3e5, 1e6]

export function SpectrumPanel() {
  const sa = useFirst('spectrum_analyzer')
  const layout = useStore((s) => s.layout)
  const running = useStore((s) => s.running)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<'FFT (DC–1 MHz)' | 'RF'>('FFT (DC–1 MHz)')
  // a sensible first span from what is on the bench: ripple → 500 kHz, hum → 500 Hz
  const firstMode = useStore((st) => String(st.layout.components.find((c) => c.type === 'noise_source')?.params?.mode ?? ''))
  const [stop, setStop] = useState(firstMode === 'switching ripple' ? 5e5 : firstMode.startsWith('hum') ? 500 : 1000)
  const [rbw, setRbw] = useState(firstMode === 'switching ripple' ? 1000 : firstMode.startsWith('hum') ? 1 : 10)
  const [center, setCenter] = useState(433.92)
  const [span, setSpan] = useState(10)
  const [rfRbw, setRfRbw] = useState(1e5)
  const [unit, setUnit] = useState<'dBm' | 'dBV'>('dBm')
  const [live, setLive] = useState(true)
  const [spec, setSpec] = useState<Spectrum | null>(null)
  const state = useRef({ stop, rbw, live })
  state.current = { stop, rbw, live }
  const world = useMemo(() => (mode === 'RF' ? new RfWorld(layout) : null), [layout, mode])

  // RF view: straight from the link model
  useEffect(() => {
    if (!sa || mode !== 'RF' || !world) return
    const f0 = (center - span / 2) * 1e6
    const f1 = (center + span / 2) * 1e6
    setSpec(rfSpectrum(world, `${sa.id}:IN`, Math.max(9e3, f0), f1, rfRbw))
  }, [sa?.id, mode, world, center, span, rfRbw])

  // FFT view: capture from the running circuit, again and again while live
  useEffect(() => {
    if (!sa || mode === 'RF') return
    let stopFlag = false
    let raf = 0
    const tick = () => {
      if (stopFlag) return
      const e = liveEngine()
      const s = state.current
      if (e && useStore.getState().running && s.live) {
        const sp = captureSpectrum(e, `${sa.id}:IN`, `${sa.id}:GND`, s.stop, Math.max(s.rbw, (1.5 * 2.56 * s.stop) / 32768), e.preferredDt())
        setSpec(sp)
      }
      raf = window.setTimeout(() => requestAnimationFrame(tick), 120) as unknown as number
    }
    tick()
    return () => {
      stopFlag = true
      clearTimeout(raf)
    }
  }, [sa?.id, mode])

  useEffect(() => {
    if (!canvas.current || !spec) return
    const key = unit === 'dBm' ? 'dbm' : 'dbv'
    const top = spec.peaks[0]
    const markers = spec.peaks.slice(0, 3).map((p, i) => ({ x: p.f, label: `M${i + 1}`, color: ['#ff453a', '#ff9f0a', '#30d158'][i] }))
    const lo = Math.min(...spec.points.map((p) => p[key]))
    drawPlot(canvas.current, [{ label: unit, color: '#ffd84a', points: spec.points.map((p) => ({ x: p.f, y: p[key] })) }], {
      xLabel: 'f (Hz)',
      yLabel: unit,
      markers,
      yRange: [Math.max(lo - 5, (top ? (unit === 'dBm' ? top.dbm : top.dbv) : 0) - 110), (top ? (unit === 'dBm' ? top.dbm : top.dbv) : -40) + 10],
    })
    if (top) {
      benchReadings.set('spectrum.peak.f', top.f)
      benchReadings.set('spectrum.peak.dbm', top.dbm)
    }
  }, [spec, unit])

  if (!sa) return <Missing what="spectrum analyzer" type="spectrum_analyzer" />
  return (
    <div className="bn-panel" data-instrument="spectrum">
      <div className="bn-row">
        <Seg value={mode} options={['FFT (DC–1 MHz)', 'RF']} onChange={setMode} />
        <Seg value={unit} options={['dBm', 'dBV']} onChange={setUnit} />
        {mode !== 'RF' && (
          <button type="button" className={`lab-btn ${live ? 'is-primary' : ''}`} onClick={() => setLive(!live)}>
            {live ? 'Live' : 'Held'}
          </button>
        )}
        <button type="button" className="lab-btn" disabled={!spec} onClick={() => spec && download('spectrum.csv', toCSV(['f (Hz)', 'dBm', 'dBV'], spec.points.map((p) => [p.f, p.dbm, p.dbv])))}>
          CSV
        </button>
      </div>
      <canvas ref={canvas} width={640} height={300} className="bn-plot" data-spectrum-plot />
      <div className="bn-meas" data-spectrum-meas>
        {spec
          ? spec.peaks.slice(0, 4).map((p, i) => (
              <div key={i}>
                M{i + 1} {hz(p.f)} {unit === 'dBm' ? `${p.dbm.toFixed(1)} dBm` : `${p.dbv.toFixed(1)} dBV`}
              </div>
            ))
          : null}
        <div>
          RBW {hz(spec?.rbw ?? (mode === 'RF' ? rfRbw : rbw))} · {mode === 'RF' ? `centre ${center} MHz, span ${span} MHz` : `0 – ${hz(stop)}`}
        </div>
        {mode !== 'RF' && !running && <div className="lab-dim">Press Run — the FFT takes the running circuit's waveform.</div>}
      </div>
      {mode === 'RF' ? (
        <div className="bn-knobs">
          <Knob label="Centre" value={center} min={1} max={3200} log unit="MHz" onChange={setCenter} format={(v) => `${v.toFixed(2)} MHz`} />
          <Knob label="Span" value={span} min={0.01} max={1000} log unit="MHz" onChange={setSpan} format={(v) => `${fmt(v)} MHz`} />
          <Knob label="RBW" value={rfRbw} min={10} max={1e6} choices={RBWS.filter((r) => r >= 10)} onChange={setRfRbw} format={(v) => hz(v)} />
        </div>
      ) : (
        <div className="bn-knobs">
          <Knob label="Stop" value={stop} min={100} max={1e6} choices={STOPS} onChange={setStop} format={(v) => hz(v)} />
          <Knob label="RBW" value={rbw} min={1} max={1e6} choices={RBWS} onChange={setRbw} format={(v) => hz(v)} />
          <span className="bn-field">
            Input <Seg value={String(param(sa, 'input'))} options={['high-Z probe', '50 Ω']} onChange={(v) => setP(sa.id, 'input', v)} />
          </span>
        </div>
      )}
      <p className="lab-dim">
        {mode === 'RF'
          ? 'RF: the carriers reaching IN through a cable or an antenna, from the link-budget model, over the analyzer’s noise floor (−135 dBm at 100 Hz RBW). Narrow the RBW: the floor drops, carriers stay.'
          : 'FFT: Hann-windowed spectrum of the simulated voltage on IN (dBm into 50 Ω). Halving the RBW doubles the record length.'}
      </p>
    </div>
  )
}

// ------------------------------------------------------------- RMS meter

export function RmsPanel() {
  const m = useFirst('rms_voltmeter')
  const tele = useStore((s) => (m ? s.telemetry?.components[m.id] : undefined))
  if (!m) return <Missing what="true-RMS voltmeter" type="rms_voltmeter" />
  const x = tele?.extra ?? {}
  return (
    <div className="bn-panel" data-instrument="rms">
      <div className="bn-lcd" data-rms-reading>{tele?.reading ?? '---- V'}</div>
      <Seg value={String(param(m, 'mode'))} options={['AC+DC rms', 'AC rms', 'DC', 'dBV', 'dBm (600 Ω)', 'Hz', 'duty']} onChange={(v) => setP(m.id, 'mode', v)} />
      <div className="bn-meas">
        AC+DC {Number.isFinite(Number(x.rms)) ? `${fmt(Number(x.rms))}V` : '—'} · AC {Number.isFinite(Number(x.acrms)) ? `${fmt(Number(x.acrms))}V` : '—'} · DC {Number.isFinite(Number(x.dc)) ? `${fmt(Number(x.dc))}V` : '—'} · crest factor{' '}
        {Number.isFinite(Number(x.rms)) && Number(x.rms) > 0 ? '(see the scope)' : '—'}
      </div>
      <p className="lab-dim">True RMS: √(mean of v²) over a 0.2 s gate — right for square, triangle and noisy waves, not just sines.</p>
    </div>
  )
}

// ------------------------------------------------------------------- LCR

export function LcrPanel() {
  const lcr = useFirst('lcr_meter')
  const layout = useStore((s) => s.layout)
  const [r, setR] = useState<LcrReading | null>(null)
  const freq = String(param(lcr, 'testFreq') ?? '1 kHz')
  const circuit = String(param(lcr, 'circuit') ?? 'auto') as 'auto' | 'series' | 'parallel'
  useEffect(() => {
    if (!lcr) return
    const res = lcrMeasure(layout, lcr.id, LCR_FREQS[freq], circuit)
    setR(res)
    if (res) {
      show(lcr.id, res.primary)
      benchReadings.set('lcr.z', res.z)
      benchReadings.set('lcr.l', res.ls)
      benchReadings.set('lcr.c', res.cs)
      benchReadings.set('lcr.esr', res.rs)
    }
  }, [layout, lcr?.id, freq, circuit])
  if (!lcr) return <Missing what="LCR meter" type="lcr_meter" />
  return (
    <div className="bn-panel" data-instrument="lcr">
      <div className="bn-lcd" data-lcr-reading>{r ? `${r.kind} ${r.primary}` : '----'}</div>
      <div className="bn-display">{r ? `${r.secondary} · |Z| ${fmt(r.z)}Ω ∠${r.theta.toFixed(1)}° · ${r.model}` : 'connect HI and LO across a part'}</div>
      <div className="bn-row">
        <span>Test</span>
        <Seg value={freq} options={Object.keys(LCR_FREQS)} onChange={(v) => setP(lcr.id, 'testFreq', v)} />
      </div>
      <div className="bn-row">
        <span>Model</span>
        <Seg value={circuit} options={['auto', 'series', 'parallel']} onChange={(v) => setP(lcr.id, 'circuit', v)} />
      </div>
      {r && (
        <table className="bn-table">
          <tbody>
            <tr><th>Rs / Xs</th><td>{fmt(r.rs)}Ω / {fmt(r.xs)}Ω</td><th>D / Q</th><td>{Number.isFinite(r.d) ? r.d.toFixed(4) : '∞'} / {Number.isFinite(r.q) ? r.q.toFixed(2) : '∞'}</td></tr>
            <tr><th>Ls / Cs</th><td>{r.ls ? `${fmt(r.ls)}H` : '—'} / {r.cs ? `${fmt(r.cs)}F` : '—'}</td><th>Lp / Cp / Rp</th><td>{r.lp ? `${fmt(r.lp)}H` : '—'} / {r.cp ? `${fmt(r.cp)}F` : '—'} / {Number.isFinite(r.rp) ? `${fmt(r.rp)}Ω` : '∞'}</td></tr>
          </tbody>
        </table>
      )}
      <p className="lab-dim">1 Vrms at the test frequency through 100 Ω; the complex impedance comes from an AC solve of the circuit between the clips. Measure parts with the power off.</p>
    </div>
  )
}

// ------------------------------------------------------------------- VNA

const VNA_PRESETS: { label: string; f0: number; f1: number; log: boolean }[] = [
  { label: '433 MHz antenna', f0: 300e6, f1: 600e6, log: false },
  { label: '915 MHz', f0: 700e6, f1: 1100e6, log: false },
  { label: '2.4 GHz', f0: 2e9, f1: 3e9, log: false },
  { label: 'Audio filter', f0: 10, f1: 1e5, log: true },
  { label: 'Power filter', f0: 100, f1: 1e7, log: true },
]

function drawSmith(cv: HTMLCanvasElement, res: VnaResult): void {
  const g = cv.getContext('2d')
  if (!g) return
  const W = cv.width
  const H = cv.height
  g.fillStyle = '#0b0e13'
  g.fillRect(0, 0, W, H)
  const R = Math.min(W, H) / 2 - 14
  const cx = W / 2
  const cy = H / 2
  g.strokeStyle = '#2a3442'
  g.lineWidth = 1
  const circle = (x: number, y: number, r: number) => {
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.stroke()
  }
  circle(cx, cy, R)
  for (const r of [0.2, 0.5, 1, 2, 5]) circle(cx + (R * r) / (1 + r), cy, R / (1 + r))
  g.save()
  g.beginPath()
  g.arc(cx, cy, R, 0, Math.PI * 2)
  g.clip()
  for (const x of [0.2, 0.5, 1, 2, 5]) {
    circle(cx + R, cy - R / x, R / x)
    circle(cx + R, cy + R / x, R / x)
  }
  g.restore()
  g.beginPath()
  g.moveTo(cx - R, cy)
  g.lineTo(cx + R, cy)
  g.stroke()
  g.strokeStyle = '#ffd84a'
  g.lineWidth = 2
  g.beginPath()
  res.points.forEach((p, i) => {
    const x = cx + p.s11[0] * R
    const y = cy - p.s11[1] * R
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  })
  g.stroke()
  const b = res.best
  g.fillStyle = '#ff453a'
  g.beginPath()
  g.arc(cx + b.s11[0] * R, cy - b.s11[1] * R, 5, 0, Math.PI * 2)
  g.fill()
  g.font = mono(500, 12)
  g.fillText(`${fmt(b.f)}Hz  ${b.zin[0].toFixed(1)}${b.zin[1] >= 0 ? '+' : '−'}j${Math.abs(b.zin[1]).toFixed(1)} Ω`, 8, H - 8)
  g.fillStyle = '#8b94a3'
  g.fillText('S11 Smith chart (50 Ω)', 8, 16)
}

export function VnaPanel() {
  const vna = useFirst('vna')
  const [f0, setF0] = useState(300e6)
  const [f1, setF1] = useState(600e6)
  const [log, setLog] = useState(false)
  const [res, setRes] = useState<VnaResult | null>(null)
  const [view, setView] = useState<'S11' | 'S21' | 'Smith'>('S11')
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvas.current
    if (!c || !res) return
    if (view === 'Smith') {
      drawSmith(c, res)
      return
    }
    const top = document.createElement('canvas')
    top.width = c.width
    top.height = c.height / 2
    const bot = document.createElement('canvas')
    bot.width = c.width
    bot.height = c.height / 2
    if (view === 'S11') {
      drawPlot(top, [{ label: '|S11| (dB)', color: '#ffd84a', points: res.points.map((p) => ({ x: p.f, y: p.s11db })) }], { logX: log, yLabel: 'dB', markers: [{ x: res.best.f, label: `${fmt(res.best.f)}Hz ${res.best.s11db.toFixed(1)} dB` }], hLines: [{ y: -10, label: 'VSWR 2' }] })
      drawPlot(bot, [{ label: 'VSWR', color: '#43d9f6', points: res.points.map((p) => ({ x: p.f, y: Math.min(p.vswr, 10) })) }], { logX: log, xLabel: 'f (Hz)', yLabel: 'VSWR', markers: [{ x: res.best.f, label: `VSWR ${res.best.vswr.toFixed(2)}` }] })
    } else {
      const markers = [...(res.s21low ? [{ x: res.s21low, label: `−3 dB ${fmt(res.s21low)}Hz`, color: '#ff9f0a' }] : []), ...(res.s21high ? [{ x: res.s21high, label: `−3 dB ${fmt(res.s21high)}Hz` }] : [])]
      drawPlot(top, [{ label: res.gainMode ? 'gain V2/V1 (dB)' : '|S21| (dB)', color: '#ffd84a', points: res.points.map((p) => ({ x: p.f, y: p.s21db })) }], { logX: log, yLabel: 'dB', markers })
      drawPlot(bot, [{ label: 'phase (°)', color: '#43d9f6', points: res.points.map((p) => ({ x: p.f, y: p.s21deg })) }], { logX: log, xLabel: 'f (Hz)', yLabel: '°', markers })
    }
    const g = c.getContext('2d')!
    g.drawImage(top, 0, 0)
    g.drawImage(bot, 0, c.height / 2)
    benchReadings.setImage('vna', c.toDataURL())
  }, [res, view, log])
  if (!vna) return <Missing what="network analyzer" type="vna" />
  const sweep = () => {
    const r = vnaSweep(useStore.getState().layout, vna.id, Math.min(f0, f1), Math.max(f0, f1), 301, log)
    if (!r) {
      showToast('No response — wire PORT1 (and GND) to what you want to measure')
      return
    }
    setRes(r)
    show(vna.id, `${fmt(r.best.f)}Hz ${r.best.s11db.toFixed(1)}dB`)
    benchReadings.set('vna.f0', r.best.f)
    benchReadings.set('vna.s11', r.best.s11db)
    benchReadings.set('vna.vswr', r.best.vswr)
    benchReadings.set('vna.s21.high', r.s21high)
  }
  return (
    <div className="bn-panel" data-instrument="vna">
      <div className="bn-row">
        {VNA_PRESETS.map((p) => (
          <button key={p.label} type="button" className="lab-btn" onClick={() => (setF0(p.f0), setF1(p.f1), setLog(p.log))}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="bn-row">
        <label className="bn-field">
          Start (Hz) <input type="number" value={f0} onChange={(e) => setF0(Number(e.target.value) || 10)} />
        </label>
        <label className="bn-field">
          Stop (Hz) <input type="number" value={f1} onChange={(e) => setF1(Number(e.target.value) || 1e6)} />
        </label>
        <Seg value={log ? 'log' : 'linear'} options={['linear', 'log']} onChange={(v) => setLog(v === 'log')} />
        <button type="button" className="lab-btn is-primary" onClick={sweep} data-vna-run>
          Sweep
        </button>
        <button type="button" className="lab-btn" disabled={!res} onClick={() => res && download('vna.csv', toCSV(['f (Hz)', 'S11 re', 'S11 im', '|S11| dB', 'VSWR', 'S21 dB', 'S21 deg'], res.points.map((p) => [p.f, p.s11[0], p.s11[1], p.s11db, p.vswr, p.s21db, p.s21deg])))}>
          CSV
        </button>
      </div>
      <div className="bn-row">
        <Seg value={view} options={['S11', 'S21', 'Smith']} onChange={setView} />
        <span className="bn-field">
          Port 2 <Seg value={String(param(vna, 'port2'))} options={['50 Ω', 'high-Z (1 MΩ)']} onChange={(v) => setP(vna.id, 'port2', v)} />
        </span>
      </div>
      <canvas ref={canvas} width={640} height={380} className="bn-plot" data-vna-plot />
      {res && (
        <div className="bn-meas" data-vna-meas>
          Best match {hz(res.best.f)} · |S11| {res.best.s11db.toFixed(1)} dB · return loss {res.best.rl.toFixed(1)} dB · VSWR {res.best.vswr.toFixed(2)} · Z {res.best.zin[0].toFixed(1)} {res.best.zin[1] >= 0 ? '+' : '−'} j{Math.abs(res.best.zin[1]).toFixed(1)} Ω
          <br />
          {res.s21peak.s21db < -150 ? 'S21: nothing reaches port 2' : <>{res.gainMode ? 'Gain' : 'S21'} peak {res.s21peak.s21db.toFixed(1)} dB at {hz(res.s21peak.f)} · −3 dB {res.s21low ? hz(res.s21low) : '—'} / {res.s21high ? hz(res.s21high) : '—'}</>}
        </div>
      )}
      <p className="lab-dim">Port 1 is a 50 Ω source; S11 = (V₁ − ½)/½ is what bounces back, S21 = V₂/½ what gets through into 50 Ω (with a high-Z port 2: the voltage gain V₂/V₁). Each point is an AC solve of the circuit.</p>
    </div>
  )
}

// ----------------------------------------------------------- power meter

export function PowerPanel() {
  const pm = useFirst('rf_power_meter')
  const tele = useStore((s) => (pm ? s.telemetry?.components[pm.id] : undefined))
  const layout = useStore((s) => s.layout)
  const staticDbm = useMemo(() => (pm ? linkTable(layout).find((r) => r.rx.compId === pm.id)?.best?.dbm ?? null : null), [layout, pm?.id])
  if (!pm) return <Missing what="RF power meter" type="rf_power_meter" />
  const x = tele?.extra ?? {}
  const shown = tele ? Number(x.shownDbm) : staticDbm !== null ? staticDbm + Number(param(pm, 'offset') ?? 0) : NaN
  return (
    <div className="bn-panel" data-instrument="power">
      <div className="bn-lcd" data-power-reading>{tele?.reading ?? (Number.isFinite(shown) ? `${shown.toFixed(2)} dBm` : 'UNDER RANGE')}</div>
      <div className="bn-meas">{Number.isFinite(shown) ? `${fmt(10 ** (shown / 10) * 1e-3)}W · ${shown.toFixed(2)} dBm${tele ? '' : ' (link budget — press Run for the live reading)'}` : 'no RF arriving at the sensor'}</div>
      <div className="bn-knobs">
        <Knob label="Offset" value={Number(param(pm, 'offset') ?? 0)} min={0} max={60} step={1} unit=" dB" onChange={(v) => setP(pm.id, 'offset', v)} />
      </div>
      <p className="lab-dim">Diode sensor, 50 Ω, −30 … +20 dBm (damaged above +23 dBm). 0 dBm = 1 mW; every 10 dB is ×10.</p>
    </div>
  )
}

// ------------------------------------------------------------ noise source

export function NoisePanel() {
  const ns = useFirst('noise_source')
  if (!ns) return <Missing what="noise source" type="noise_source" />
  const n = (k: string) => Number(param(ns, k))
  return (
    <div className="bn-panel" data-instrument="noise">
      <div className="bn-display">
        <b>{String(param(ns, 'mode'))}</b> · {n('level').toFixed(2)} Vpp {param(ns, 'mode') === 'switching ripple' ? `· ${fmt(n('frequency'))}Hz` : ''}
        <span className={param(ns, 'on') ? 'bn-led is-on' : 'bn-led'}>OUT</span>
      </div>
      <Seg value={String(param(ns, 'mode'))} options={['white noise', 'hum 60 Hz', 'hum 50 Hz', 'switching ripple', 'hum + noise']} onChange={(v) => setP(ns.id, 'mode', v)} />
      <div className="bn-knobs">
        <Knob label="Level" value={n('level')} min={0} max={10} step={0.01} unit="Vpp" onChange={(v) => setP(ns.id, 'level', v)} />
        <Knob label="Ripple f" value={n('frequency')} min={1e3} max={1e6} log unit="Hz" onChange={(v) => setP(ns.id, 'frequency', v)} />
        <button type="button" className={`lab-btn ${param(ns, 'on') ? 'is-primary' : ''}`} onClick={() => setP(ns.id, 'on', !param(ns, 'on'))}>
          Output {param(ns, 'on') ? 'ON' : 'OFF'}
        </button>
      </div>
      <p className="lab-dim">OUT = IN + interference behind 50 Ω. Put it between a supply or a sensor and your filter, then compare before and after on the scope and the spectrum analyzer.</p>
    </div>
  )
}

// ----------------------------------------------------------------- RF link

function marginClass(m: number | null): string {
  return m === null ? '' : m >= 10 ? 'rf-good' : m >= 0 ? 'rf-ok' : 'rf-bad'
}

export function LinkPanel() {
  const layout = useStore((s) => s.layout)
  const tele = useStore((s) => s.telemetry)
  const rows: LinkRow[] = useMemo(() => linkTable(layout), [layout])
  const ends = layout.components.filter((c) => getEntry(c.type)?.params?.some((p) => p.key === 'distance'))
  if (!rows.length) return <div className="bn-missing">No radio receivers on the bench — add a radio module, the B210, a power meter or a spectrum analyzer and wire an antenna to it.</div>
  return (
    <div className="bn-panel" data-instrument="link">
      <table className="bn-table rf-table" data-link-table>
        <thead>
          <tr>
            <th>Receiver</th>
            <th>From</th>
            <th>f</th>
            <th>P rx</th>
            <th>Noise</th>
            <th>SNR</th>
            <th>Margin</th>
            <th>Live</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const live = tele?.components[r.rx.compId]?.extra
            return (
              <tr key={r.rx.key}>
                <td>{r.rx.compId} <span className="lab-dim">{r.rx.port !== 'ANT' ? r.rx.port : ''}</span></td>
                <td>{r.best ? `${r.best.from.compId}${r.best.coupling.conducted ? ' (cable)' : ''}` : '—'}</td>
                <td>{r.best ? hz(r.best.from.fHz) : hz(r.rx.fHz)}</td>
                <td>{db(r.best?.dbm)} dBm</td>
                <td>{r.rx.what === 'power sensor' ? '—' : `${db(r.noiseDbm)} dBm`}</td>
                <td>{r.rx.what === 'power sensor' ? '—' : `${db(r.snrDb)} dB`}</td>
                <td className={marginClass(r.marginDb)}>{r.rx.what.startsWith('B210') || r.rx.what === 'spectrum analyzer' || r.rx.what === 'power sensor' ? '—' : `${db(r.marginDb)} dB`}</td>
                <td>{live ? (live.link ? 'link ✓' : live.rssi !== undefined && Number.isFinite(Number(live.rssi)) ? `${Number(live.rssi).toFixed(0)} dBm` : String(live.note || '')) : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows
        .filter((r) => r.best && !r.best.coupling.conducted && r.best.coupling.link)
        .slice(0, 3)
        .map((r) => {
          const l = r.best!.coupling.link!
          return (
            <div key={r.rx.key} className="bn-meas rf-budget">
              <b>{r.best!.from.compId} → {r.rx.compId}</b>: P tx {r.best!.from.dbm.toFixed(1)} dBm − mismatch {l.mmTxDb.toFixed(2)} + G tx {l.gtDbi.toFixed(1)} dBi − path {l.pathLossDb.toFixed(1)} dB ({l.distanceM < 1 ? `${(l.distanceM * 100).toFixed(1)} cm` : `${fmt(l.distanceM)}m`}{l.fromBench ? ' on the bench' : ''}) + G rx {l.grDbi.toFixed(1)} dBi + polarization {l.polDb.toFixed(1)} dB − mismatch {l.mmRxDb.toFixed(2)} = <b>{r.best!.dbm.toFixed(1)} dBm</b>
              {l.nearField && <span className="rf-warn"> · near field: closer than λ/2π, Friis is only a rough guide here</span>}
            </div>
          )
        })}
      {ends.length > 0 && (
        <div className="rf-ends">
          {ends.map((c) => (
            <div key={c.id} className="bn-row">
              <b>{c.id}</b>
              {getEntry(c.type)?.params?.some((p) => p.key === 'tilt') && (
                <label className="bn-field">
                  tilt <input type="range" min={0} max={90} step={1} value={Number(param(c, 'tilt') ?? 0)} onChange={(e) => setP(c.id, 'tilt', Number(e.target.value))} /> {Number(param(c, 'tilt') ?? 0)}°
                </label>
              )}
              <label className="bn-field">
                distance (m, 0 = bench) <input type="number" min={0} value={Number(param(c, 'distance') ?? 0)} onChange={(e) => setP(c.id, 'distance', Math.max(0, Number(e.target.value) || 0))} />
              </label>
            </div>
          ))}
        </div>
      )}
      <p className="lab-dim">A link budget, not a field solver: Friis (or log-distance with the path-loss exponent you pick), antenna patterns toward each other from where they stand and which way they face, polarization (cos² of the tilt between them, −3 dB linear↔circular), feed mismatch, and the kT·B·NF noise floor. Margin = received power − sensitivity.</p>
    </div>
  )
}

// --------------------------------------------------------------------- SDR

export function SdrPanel() {
  const sdr = useFirst('usrp_b210')
  const layout = useStore((s) => s.layout)
  const tele = useStore((s) => (sdr ? s.telemetry?.components[sdr.id] : undefined))
  const [port, setPort] = useState<'RX2 A' | 'RX2 B'>('RX2 A')
  const canvas = useRef<HTMLCanvasElement>(null)
  const water = useRef<HTMLCanvasElement>(null)
  const fc = Number(param(sdr, 'frequency') ?? 433.92) * 1e6
  const bw = Math.min(Number(param(sdr, 'bandwidth') ?? 10), 56) * 1e6
  const spec = useMemo(() => (sdr ? sdrSpectrum(new RfWorld(layout), sdr.id, port, fc, bw) : null), [layout, sdr?.id, port, fc, bw])
  useEffect(() => {
    if (!canvas.current || !spec) return
    const top = spec.peaks[0]
    drawPlot(canvas.current, [{ label: `${port} (dBm)`, color: '#43d9f6', points: spec.points.map((p) => ({ x: (p.f - fc) / 1e3, y: p.dbm })) }], {
      xLabel: `offset from ${(fc / 1e6).toFixed(3)} MHz (kHz)`,
      yLabel: 'dBm',
      yRange: [spec.points[0] ? Math.min(...spec.points.map((p) => p.dbm)) - 10 : -140, Math.max(-20, (top?.dbm ?? -60) + 10)],
      markers: spec.peaks.slice(0, 2).map((p) => ({ x: (p.f - fc) / 1e3, label: `${(p.f / 1e6).toFixed(4)} MHz ${p.dbm.toFixed(1)} dBm` })),
    })
  }, [spec])
  // a waterfall that scrolls while the simulation runs
  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const cv = water.current
      if (!cv || !spec || !useStore.getState().running) return
      const g = cv.getContext('2d')
      if (!g) return
      g.drawImage(cv, 0, 1)
      const n = spec.points.length
      const lo = Math.min(...spec.points.map((p) => p.dbm))
      for (let i = 0; i < cv.width; i++) {
        const p = spec.points[Math.floor((i / cv.width) * n)]
        const k = Math.max(0, Math.min(1, (p.dbm - lo) / 60 + (Math.random() - 0.5) * 0.06))
        g.fillStyle = `hsl(${240 - 240 * k}, 90%, ${18 + 45 * k}%)`
        g.fillRect(i, 0, 1, 1)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [spec])
  if (!sdr) return <Missing what="USRP B210" type="usrp_b210" />
  const x = tele?.extra ?? {}
  const n = (k: string) => Number(param(sdr, k))
  return (
    <div className="bn-panel" data-instrument="sdr">
      <div className="bn-display">
        <b>USRP B210</b> {(fc / 1e6).toFixed(3)} MHz · {fmt(bw)}Hz · RX gain {n('rxGain')} dB
        <span className={x.txOn ? 'bn-led is-on' : 'bn-led'}>TX {x.txOn ? `${Number(x.txDbm).toFixed(1)} dBm` : 'off'}</span>
        {x.overload ? <span className="bn-cc is-on">ADC OVERLOAD</span> : null}
        {Number(x.rxMaxDbm) > B210.rxMaxDbm ? <span className="bn-cc is-on">INPUT &gt; −15 dBm</span> : null}
      </div>
      <div className="bn-row">
        <Seg value={port} options={['RX2 A', 'RX2 B']} onChange={setPort} />
        <button type="button" className={`lab-btn ${param(sdr, 'txOn') ? 'is-primary' : ''}`} onClick={() => setP(sdr.id, 'txOn', !param(sdr, 'txOn'))}>
          TX tone {param(sdr, 'txOn') ? 'ON' : 'OFF'}
        </button>
        <button type="button" className="lab-btn" onClick={() => spec && download('b210.csv', toCSV(['f (Hz)', 'dBm'], spec.points.map((p) => [p.f, p.dbm])))}>
          CSV
        </button>
      </div>
      <canvas ref={canvas} width={640} height={240} className="bn-plot" data-sdr-plot />
      <canvas ref={water} width={640} height={90} className="bn-plot" />
      <div className="bn-knobs">
        <Knob label="Centre" value={n('frequency')} min={70} max={6000} log unit="MHz" onChange={(v) => setP(sdr.id, 'frequency', +v.toFixed(3))} format={(v) => `${v.toFixed(2)} MHz`} />
        <Knob label="Bandwidth" value={n('bandwidth')} min={0.2} max={56} log unit="MHz" onChange={(v) => setP(sdr.id, 'bandwidth', v)} format={(v) => `${fmt(v)} MHz`} />
        <Knob label="RX gain" value={n('rxGain')} min={0} max={76} step={1} unit=" dB" onChange={(v) => setP(sdr.id, 'rxGain', v)} />
        <Knob label="TX gain" value={n('txGain')} min={0} max={89.75} step={0.25} unit=" dB" onChange={(v) => setP(sdr.id, 'txGain', v)} />
        <Knob label="Tone" value={n('toneOffset')} min={-20000} max={20000} step={1} unit=" kHz" onChange={(v) => setP(sdr.id, 'toneOffset', v)} />
      </div>
      <p className="lab-dim">What reaches the RX port through its antenna (or a cable), from the link model, over the B210's noise floor (kT·B·NF, NF ≈ 8 dB, per FFT bin). Keep every RF input under −15 dBm.</p>
    </div>
  )
}
