/**
 * The Bench: front panels for the EE Lab I instruments — function generator,
 * oscilloscope, DMM, triple supply, DAQ with a virtual-instrument panel, Bode
 * analyser and curve tracer. Knobs turn by drag or wheel; "Compact" shows
 * just the readouts. Measurements are published for the lab table.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { liveEngine, useStore } from '../../state/store'
import { getEntry } from '../../model/catalog'
import type { ComponentInstance } from '../../model/types'
import { Sheet, showToast } from '../kit'
import { acquire, bode, captureScope, measure, phaseBetween, toCSV, traceCurves, type BodeResult, type Curve, type ScopeSettings } from '../../bench/measure'
import { benchReadings } from '../../labs/sources'
import { download, drawPlot, fmt } from './plot'
import './lab.css'
import './bench.css'
import { mono } from '../fonts'
import { CounterPanel, LcrPanel, LinkPanel, NoisePanel, PowerPanel, RmsPanel, SdrPanel, SpectrumPanel, VnaPanel } from './RfBench'

const SNAP = [0.6, 0.94] as const
type Tab = 'gen' | 'scope' | 'dmm' | 'supply' | 'daq' | 'bode' | 'tracer' | 'counter' | 'spectrum' | 'rms' | 'lcr' | 'vna' | 'power' | 'noise' | 'link' | 'sdr'
const TABS: { key: Tab; label: string; type: string }[] = [
  { key: 'gen', label: 'Generator', type: 'signal_generator' },
  { key: 'scope', label: 'Scope', type: 'oscilloscope' },
  { key: 'dmm', label: 'DMM', type: 'multimeter' },
  { key: 'supply', label: 'Supply', type: 'bench_supply' },
  { key: 'daq', label: 'DAQ / VI', type: 'daq' },
  { key: 'bode', label: 'Bode', type: 'signal_generator' },
  { key: 'tracer', label: 'Curve tracer', type: 'curve_tracer' },
  // measurement and wireless (RfBench.tsx)
  { key: 'counter', label: 'Counter', type: 'freq_counter' },
  { key: 'spectrum', label: 'Spectrum', type: 'spectrum_analyzer' },
  { key: 'rms', label: 'RMS volts', type: 'rms_voltmeter' },
  { key: 'lcr', label: 'LCR', type: 'lcr_meter' },
  { key: 'vna', label: 'VNA', type: 'vna' },
  { key: 'power', label: 'RF power', type: 'rf_power_meter' },
  { key: 'noise', label: 'Noise', type: 'noise_source' },
  { key: 'link', label: 'RF link', type: 'usrp_b210' },
  { key: 'sdr', label: 'B210 SDR', type: 'usrp_b210' },
]

function useFirst(type: string): ComponentInstance | undefined {
  return useStore((s) => s.layout.components.find((c) => c.type === type))
}
function param(c: ComponentInstance | undefined, key: string): number | string | boolean | undefined {
  if (!c) return undefined
  return c.params?.[key] ?? getEntry(c.type)?.params?.find((p) => p.key === key)?.default
}
const setP = (id: string, key: string, v: number | string | boolean) => useStore.getState().setParam(id, key, v)

// ------------------------------------------------------------------ knob

export function Knob(props: { label: string; value: number; min: number; max: number; log?: boolean; step?: number; unit?: string; choices?: number[]; onChange: (v: number) => void; format?: (v: number) => string }) {
  const { value, min, max, log, onChange, choices } = props
  const nearest = (v: number) => choices!.reduce((a, b, i) => (Math.abs(Math.log(b / v)) < Math.abs(Math.log(choices![a] / v)) ? i : a), 0)
  const toT = (v: number) => (choices ? nearest(v) / (choices.length - 1) : log ? Math.log(v / min) / Math.log(max / min) : (v - min) / (max - min))
  const fromT = (t: number) => {
    const c = Math.min(1, Math.max(0, t))
    if (choices) return choices[Math.round(c * (choices.length - 1))]
    let v = log ? min * (max / min) ** c : min + c * (max - min)
    if (props.step) v = Math.round(v / props.step) * props.step
    return +v.toPrecision(4)
  }
  const drag = useRef<{ y: number; t: number } | null>(null)
  const t = toT(value)
  const ang = -135 + 270 * Math.min(1, Math.max(0, t))
  // a wheel turns the knob without scrolling the panel (needs a non-passive listener)
  const el = useRef<HTMLDivElement>(null)
  const wheel = useRef<(e: WheelEvent) => void>(() => {})
  wheel.current = (e) => {
    e.preventDefault()
    onChange(fromT(t - Math.sign(e.deltaY) * (choices ? 1 / (choices.length - 1) : 0.02)))
  }
  useEffect(() => {
    const node = el.current
    if (!node) return
    const h = (e: WheelEvent) => wheel.current(e)
    node.addEventListener('wheel', h, { passive: false })
    return () => node.removeEventListener('wheel', h)
  }, [])
  return (
    <div
      ref={el}
      className="bn-knob"
      onPointerDown={(e) => {
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        drag.current = { y: e.clientY, t }
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        onChange(fromT(drag.current.t + (drag.current.y - e.clientY) / 160))
      }}
      onPointerUp={() => (drag.current = null)}
      title="Drag up/down or scroll"
    >
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden="true">
        <circle cx="27" cy="27" r="22" fill="#24272c" stroke="#4b5059" strokeWidth="2" />
        <line x1="27" y1="27" x2={27 + 17 * Math.sin((ang * Math.PI) / 180)} y2={27 - 17 * Math.cos((ang * Math.PI) / 180)} stroke="#f2f2f7" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="bn-knob-label">{props.label}</span>
      <span className="bn-knob-val">{props.format ? props.format(value) : `${fmt(value)}${props.unit ?? ''}`}</span>
    </div>
  )
}

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
      No {what} on the bench. <button type="button" className="lab-btn" onClick={() => useStore.getState().addComponent(type, {})}>Add one</button>
    </div>
  )
}

// ------------------------------------------------------------- generator

function GeneratorPanel({ compact }: { compact: boolean }) {
  const g = useFirst('signal_generator')
  if (!g) return <Missing what="function generator" type="signal_generator" />
  const n = (k: string) => Number(param(g, k))
  return (
    <div className="bn-panel bn-gen" data-instrument="generator">
      <div className="bn-display">
        <b>{String(param(g, 'waveform'))}</b> {fmt(n('frequency'))}Hz · {n('vpp').toFixed(2)} Vpp · offset {n('offset').toFixed(2)} V {param(g, 'waveform') === 'pulse' ? `· duty ${n('duty')} %` : ''}
        <span className={param(g, 'output') ? 'bn-led is-on' : 'bn-led'}>OUT</span>
      </div>
      {!compact && (
        <>
          <Seg value={String(param(g, 'waveform'))} options={['sine', 'square', 'triangle', 'pulse', 'dc']} onChange={(v) => setP(g.id, 'waveform', v)} />
          <div className="bn-knobs">
            <Knob label="Frequency" value={n('frequency')} min={0.1} max={1e6} log unit="Hz" onChange={(v) => setP(g.id, 'frequency', v)} />
            <Knob label="Amplitude" value={n('vpp')} min={0} max={20} step={0.01} unit="Vpp" onChange={(v) => setP(g.id, 'vpp', v)} />
            <Knob label="Offset" value={n('offset')} min={-10} max={10} step={0.01} unit="V" onChange={(v) => setP(g.id, 'offset', v)} />
            <Knob label="Duty" value={n('duty')} min={1} max={99} step={1} unit="%" onChange={(v) => setP(g.id, 'duty', v)} />
          </div>
          <div className="bn-row">
            <span>Display set for</span>
            <Seg value={String(param(g, 'load'))} options={['High-Z', '50Ω']} onChange={(v) => setP(g.id, 'load', v)} />
            <button type="button" className={`lab-btn ${param(g, 'output') ? 'is-primary' : ''}`} onClick={() => setP(g.id, 'output', !param(g, 'output'))}>
              Output {param(g, 'output') ? 'ON' : 'OFF'}
            </button>
          </div>
          <p className="lab-dim">50 Ω output. With "50Ω" selected the display assumes a matched load — a high-impedance circuit then sees twice the displayed amplitude.</p>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- scope

const TDIV = [1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2, 0.5]
const VDIV = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10]
interface ChUi {
  on: boolean
  vdiv: number
  pos: number
  coupling: 'DC' | 'AC' | 'GND'
}

function ScopePanel({ compact }: { compact: boolean }) {
  const sc = useFirst('oscilloscope')
  const running = useStore((s) => s.running)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [tdiv, setTdiv] = useState(1e-3)
  const [ch, setCh] = useState<ChUi[]>([
    { on: true, vdiv: 1, pos: 0, coupling: 'DC' },
    { on: true, vdiv: 1, pos: 0, coupling: 'DC' },
  ])
  const [trig, setTrig] = useState<ScopeSettings['trigger']>({ source: 0, level: 0.5, slope: 'rise', mode: 'auto' })
  const [stopped, setStopped] = useState(false)
  const [xy, setXy] = useState(false)
  const [cur, setCur] = useState<[number, number]>([0.3, 0.6])
  const [meas, setMeas] = useState<string[]>([])
  const last = useRef<{ t: number[]; ch: (number[] | null)[] } | null>(null)
  const state = useRef({ tdiv, ch, trig, stopped, xy, cur })
  state.current = { tdiv, ch, trig, stopped, xy, cur }

  useEffect(() => {
    if (!sc) return
    let raf = 0
    let frame = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const e = liveEngine()
      const s = state.current
      const cv = canvas.current
      if (!cv) return
      if (e && useStore.getState().running && !s.stopped && frame++ % 2 === 0) {
        const cap = captureScope(
          e,
          { timeDiv: s.tdiv, ch: s.ch.map((c, i) => ({ ref: `${sc.id}:CH${i + 1}`, coupling: c.coupling, on: c.on })), gnd: `${sc.id}:GND`, trigger: s.trig },
          e.preferredDt(),
        )
        if (cap.t.length) {
          last.current = cap
          if (s.trig.mode === 'single' && cap.triggered) setStopped(true)
          publish(cap, s)
        }
      }
      draw(cv, last.current, s)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [sc?.id])

  const publish = (cap: { t: number[]; ch: (number[] | null)[] }, s: typeof state.current) => {
    const lines: string[] = []
    const traces = cap.ch.map((v) => (v ? { t: cap.t, v } : null))
    traces.forEach((tr, i) => {
      if (!tr) return
      const m = measure(tr)
      const k = `scope.ch${i + 1}`
      benchReadings.set(`${k}.vpp`, m.vpp)
      benchReadings.set(`${k}.vrms`, m.vacrms)
      benchReadings.set(`${k}.vavg`, m.vavg)
      benchReadings.set(`${k}.vmax`, m.vmax)
      benchReadings.set(`${k}.freq`, m.freq)
      benchReadings.set(`${k}.period`, m.period)
      benchReadings.set(`${k}.rise`, m.rise)
      const v = tr.v
      const final = v[v.length - 1]
      const start = v[Math.max(0, cap.t.findIndex((x) => x >= 0))]
      benchReadings.set(`${k}.overshoot`, final !== start ? ((m.vmax - final) / (final - start)) * 100 : null)
      lines.push(`CH${i + 1}  Vpp ${fmt(m.vpp)}V  Vrms ${fmt(m.vacrms)}V  Vavg ${fmt(m.vavg)}V  f ${m.freq ? fmt(m.freq) + 'Hz' : '—'}  rise ${m.rise ? fmt(m.rise) + 's' : '—'}`)
    })
    if (traces[0] && traces[1]) {
      const ph = phaseBetween(traces[0], traces[1])
      benchReadings.set('scope.phase', ph)
      lines.push(`Phase CH2−CH1 ${ph === null ? '—' : ph.toFixed(1) + '°'}`)
    }
    const W = s.tdiv * 10
    const t0 = cap.t[0]
    const ta = t0 + s.cur[0] * W
    const tb = t0 + s.cur[1] * W
    benchReadings.set('scope.cursor.dt', tb - ta)
    const at = (arr: number[] | null, tt: number) => (arr ? arr[cap.t.findIndex((x) => x >= tt)] : NaN)
    benchReadings.set('scope.cursor.dv', at(cap.ch[1] ?? cap.ch[0], tb) - at(cap.ch[1] ?? cap.ch[0], ta))
    lines.push(`Cursors Δt ${fmt(tb - ta)}s  ΔV ${fmt(benchReadings.get('scope.cursor.dv') ?? NaN)}V`)
    setMeas(lines)
  }

  if (!sc) return <Missing what="oscilloscope" type="oscilloscope" />
  const updCh = (i: number, patch: Partial<ChUi>) => setCh((c) => c.map((x, k) => (k === i ? { ...x, ...patch } : x)))
  return (
    <div className="bn-panel bn-scope" data-instrument="scope">
      <canvas
        ref={canvas}
        width={640}
        height={400}
        className="bn-screen"
        onClick={(e) => {
          const r = (e.target as HTMLCanvasElement).getBoundingClientRect()
          const f = (e.clientX - r.left) / r.width
          setCur((c) => (e.shiftKey ? [c[0], f] : Math.abs(f - c[0]) < Math.abs(f - c[1]) ? [f, c[1]] : [c[0], f]))
        }}
      />
      <div className="bn-meas" data-scope-meas>
        {meas.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        {!running && <div className="lab-dim">Press Run to acquire.</div>}
      </div>
      {!compact && (
        <>
          <div className="bn-knobs">
            <Knob label="Time/div" value={tdiv} min={1e-6} max={0.5} choices={TDIV} onChange={setTdiv} format={(v) => `${fmt(v)}s`} />
            {ch.map((c, i) => (
              <Knob key={i} label={`CH${i + 1} V/div`} value={c.vdiv} min={0.01} max={10} choices={VDIV} onChange={(v) => updCh(i, { vdiv: v })} format={(v) => `${fmt(v)}V`} />
            ))}
            {ch.map((c, i) => (
              <Knob key={`p${i}`} label={`CH${i + 1} pos`} value={c.pos} min={-4} max={4} step={0.1} onChange={(v) => updCh(i, { pos: v })} format={(v) => `${v.toFixed(1)} div`} />
            ))}
            <Knob label="Trig level" value={trig.level} min={-10} max={10} step={0.05} unit="V" onChange={(v) => setTrig({ ...trig, level: v })} />
          </div>
          <div className="bn-row">
            {ch.map((c, i) => (
              <span key={i} className="bn-chgroup">
                <button type="button" className={`lab-btn ${c.on ? 'is-ch' + (i + 1) : ''}`} onClick={() => updCh(i, { on: !c.on })}>
                  CH{i + 1}
                </button>
                <Seg value={c.coupling} options={['DC', 'AC', 'GND']} onChange={(v) => updCh(i, { coupling: v })} />
                <Seg value={String(param(sc, `probe${i + 1}`))} options={['1x', '10x']} onChange={(v) => setP(sc.id, `probe${i + 1}`, v)} />
              </span>
            ))}
          </div>
          <div className="bn-row">
            <span>Trigger</span>
            <Seg value={trig.source === 0 ? 'CH1' : 'CH2'} options={['CH1', 'CH2']} onChange={(v) => setTrig({ ...trig, source: v === 'CH1' ? 0 : 1 })} />
            <Seg value={trig.slope} options={['rise', 'fall']} onChange={(v) => setTrig({ ...trig, slope: v })} />
            <Seg value={trig.mode} options={['auto', 'normal', 'single']} onChange={(v) => setTrig({ ...trig, mode: v })} />
            <button type="button" className="lab-btn" onClick={() => setStopped(!stopped)}>
              {stopped ? 'Run' : 'Stop'}
            </button>
            <button type="button" className={`lab-btn ${xy ? 'is-primary' : ''}`} onClick={() => setXy(!xy)}>
              X-Y
            </button>
            <button type="button" className="lab-btn" onClick={() => canvas.current && (benchReadings.setImage('scope', canvas.current.toDataURL()), download('scope.png', canvas.current.toDataURL()))}>
              PNG
            </button>
          </div>
          <p className="lab-dim">Click the screen to move the nearer cursor (Shift: cursor B). Inputs: 1 MΩ with a ×1 probe, 10 MΩ with ×10.</p>
        </>
      )}
    </div>
  )
}

function draw(cv: HTMLCanvasElement, cap: { t: number[]; ch: (number[] | null)[] } | null, s: { tdiv: number; ch: ChUi[]; xy: boolean; cur: [number, number]; trig: ScopeSettings['trigger'] }): void {
  const ctx = cv.getContext('2d')
  if (!ctx) return
  const W = cv.width
  const H = cv.height
  ctx.fillStyle = '#07120c'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#1b3526'
  ctx.lineWidth = 1
  for (let i = 0; i <= 10; i++) {
    ctx.beginPath()
    ctx.moveTo((W * i) / 10, 0)
    ctx.lineTo((W * i) / 10, H)
    ctx.stroke()
  }
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath()
    ctx.moveTo(0, (H * i) / 8)
    ctx.lineTo(W, (H * i) / 8)
    ctx.stroke()
  }
  ctx.strokeStyle = '#2d5a40'
  ctx.beginPath()
  ctx.moveTo(W / 2, 0)
  ctx.lineTo(W / 2, H)
  ctx.moveTo(0, H / 2)
  ctx.lineTo(W, H / 2)
  ctx.stroke()
  const colors = ['#ffd84a', '#43d9f6']
  const yOf = (v: number, k: number) => H / 2 - ((v / s.ch[k].vdiv + s.ch[k].pos) * H) / 8
  if (cap && cap.t.length) {
    const t0 = cap.t[0]
    const span = s.tdiv * 10
    if (s.xy && cap.ch[0] && cap.ch[1]) {
      ctx.strokeStyle = '#7dff9a'
      ctx.beginPath()
      cap.ch[0].forEach((x, i) => {
        const px = W / 2 + ((x / s.ch[0].vdiv) * W) / 10
        const py = yOf(cap.ch[1]![i], 1)
        if (i) ctx.lineTo(px, py)
        else ctx.moveTo(px, py)
      })
      ctx.stroke()
    } else {
      cap.ch.forEach((arr, k) => {
        if (!arr || !s.ch[k].on) return
        ctx.strokeStyle = colors[k]
        ctx.lineWidth = 2
        ctx.beginPath()
        arr.forEach((v, i) => {
          const x = ((cap.t[i] - t0) / span) * W
          if (i) ctx.lineTo(x, yOf(v, k))
          else ctx.moveTo(x, yOf(v, k))
        })
        ctx.stroke()
      })
      // trigger marker and cursors
      ctx.fillStyle = '#ff9f0a'
      ctx.fillText('T', 4, yOf(s.trig.level, s.trig.source) + 4)
      ctx.strokeStyle = '#ff453a'
      ctx.setLineDash([4, 4])
      for (const c of s.cur) {
        ctx.beginPath()
        ctx.moveTo(c * W, 0)
        ctx.lineTo(c * W, H)
        ctx.stroke()
      }
      ctx.setLineDash([])
    }
  }
  ctx.fillStyle = '#9ad7ab'
  ctx.font = mono(400, 12)
  ctx.fillText(`${fmt(s.tdiv)}s/div   CH1 ${fmt(s.ch[0].vdiv)}V/div ${s.ch[0].coupling}   CH2 ${fmt(s.ch[1].vdiv)}V/div ${s.ch[1].coupling}   trig ${s.trig.mode}`, 8, H - 8)
}

// ------------------------------------------------------------------ DMM

function DmmPanel() {
  const m = useFirst('multimeter')
  const tele = useStore((s) => (m ? s.telemetry?.components[m.id] : undefined))
  if (!m) return <Missing what="multimeter" type="multimeter" />
  const modes = ['V', 'V~', 'mA', 'Ω', 'continuity', 'diode']
  return (
    <div className="bn-panel bn-dmm" data-instrument="dmm">
      <div className="bn-lcd">{tele?.reading ?? '----'}</div>
      {tele?.sounding && <div className="bn-beep">♪ beep</div>}
      <Seg value={String(param(m, 'mode'))} options={modes} onChange={(v) => setP(m.id, 'mode', v)} />
      <p className="lab-dim">{m.id}: red probe = V, black = COM. 10 MΩ input in the volt ranges. mA: the meter must be in series.</p>
    </div>
  )
}

// --------------------------------------------------------------- supply

function SupplyPanel({ compact }: { compact: boolean }) {
  const ps = useFirst('bench_supply')
  const tele = useStore((s) => (ps ? s.telemetry?.components[ps.id]?.extra : undefined))
  if (!ps) return <Missing what="bench supply" type="bench_supply" />
  const n = (k: string) => Number(param(ps, k))
  const ch = (k: 1 | 2 | 3) => (
    <div className="bn-supch">
      <div className="bn-lcd bn-lcd-sm">
        {Number(tele?.[`v${k}`] ?? 0).toFixed(2)} V<br />
        {(Number(tele?.[`i${k}`] ?? 0) * 1000).toFixed(1)} mA <span className={tele?.[`cc${k}`] ? 'bn-cc is-on' : 'bn-cc'}>{tele?.[`cc${k}`] ? 'CC' : 'CV'}</span>
      </div>
      <span className="lab-dim">{k === 1 ? 'CH1 (+ to COM)' : k === 2 ? 'CH2 (COM to −)' : 'CH3 5 V fixed'}</span>
    </div>
  )
  return (
    <div className="bn-panel" data-instrument="supply">
      <div className="bn-row">
        {ch(1)}
        {ch(2)}
        {ch(3)}
      </div>
      {!compact && (
        <div className="bn-knobs">
          <Knob label="CH1 V" value={n('v1')} min={0} max={30} step={0.1} unit="V" onChange={(v) => setP(ps.id, 'v1', v)} />
          <Knob label="CH1 limit" value={n('i1')} min={0.001} max={3} log unit="A" onChange={(v) => setP(ps.id, 'i1', v)} />
          <Knob label="CH2 V" value={n('v2')} min={0} max={30} step={0.1} unit="V" onChange={(v) => setP(ps.id, 'v2', v)} />
          <Knob label="CH2 limit" value={n('i2')} min={0.001} max={3} log unit="A" onChange={(v) => setP(ps.id, 'i2', v)} />
          <button type="button" className={`lab-btn ${param(ps, 'output') ? 'is-primary' : ''}`} onClick={() => setP(ps.id, 'output', !param(ps, 'output'))}>
            Output {param(ps, 'output') ? 'ON' : 'OFF'}
          </button>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------- DAQ / VI

function DaqPanel() {
  const dq = useFirst('daq')
  const canvas = useRef<HTMLCanvasElement>(null)
  const [chans, setChans] = useState([true, false])
  const [rate, setRate] = useState(1000)
  const [dur, setDur] = useState(0.1)
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState<{ headers: string[]; rows: number[][] } | null>(null)
  useEffect(() => {
    if (!canvas.current) return
    const cols = ['#ffd84a', '#43d9f6']
    drawPlot(
      canvas.current,
      (data?.headers.slice(1) ?? []).map((h, k) => ({ label: h, color: cols[k], points: data!.rows.map((r) => ({ x: r[0], y: r[k + 1] })) })),
      { xLabel: 't (s)', yLabel: 'V' },
    )
  }, [data])
  if (!dq) return <Missing what="DAQ device" type="daq" />
  const run = async () => {
    const e = liveEngine()
    if (!e) {
      showToast('Press Run first — the DAQ samples the running circuit')
      return
    }
    setBusy(true)
    const refs = chans.flatMap((on, k) => (on ? [{ name: `AI${k}`, ref: `${dq.id}:AI${k}+`, minus: `${dq.id}:AI${k}-` }] : []))
    const all = { headers: ['t (s)', ...refs.map((r) => `${r.name} (V)`)], rows: [] as number[][] }
    const chunk = Math.max(1, Math.round(rate / 20))
    const n = Math.round(dur * rate)
    let offset = 0
    for (let i = 0; i < n; i += chunk) {
      const part = acquire(e, refs, rate, Math.min(chunk, n - i) / rate, e.preferredDt())
      all.rows.push(...part.rows.map((r) => [r[0] + offset, ...r.slice(1)]))
      offset += part.rows.length / rate
      setData({ ...all, rows: all.rows.slice() })
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    }
    setBusy(false)
    if (canvas.current) benchReadings.setImage('daq', canvas.current.toDataURL())
  }
  return (
    <div className="bn-panel" data-instrument="daq">
      <div className="bn-row">
        {[0, 1].map((k) => (
          <label key={k} className="bn-check">
            <input type="checkbox" checked={chans[k]} onChange={(e) => setChans(chans.map((c, i) => (i === k ? e.target.checked : c)))} /> AI{k}
          </label>
        ))}
        <label className="bn-field">
          Rate (S/s) <input type="number" value={rate} min={1} max={200000} onChange={(e) => setRate(Number(e.target.value) || 1000)} />
        </label>
        <label className="bn-field">
          Duration (s) <input type="number" value={dur} step={0.01} min={0.001} max={10} onChange={(e) => setDur(Number(e.target.value) || 0.1)} />
        </label>
        <button type="button" className="lab-btn is-primary" disabled={busy} onClick={() => void run()} data-daq-start>
          {busy ? 'Acquiring…' : 'Start'}
        </button>
        <button type="button" className="lab-btn" disabled={!data} onClick={() => data && download('daq.csv', toCSV(data.headers, data.rows))} data-daq-csv>
          Export CSV
        </button>
      </div>
      <canvas ref={canvas} width={620} height={220} className="bn-plot" />
      <div className="bn-row">
        <Knob label="AO0" value={Number(param(dq, 'ao0'))} min={-10} max={10} step={0.01} unit="V" onChange={(v) => setP(dq.id, 'ao0', v)} />
        <Knob label="AO1" value={Number(param(dq, 'ao1'))} min={-10} max={10} step={0.01} unit="V" onChange={(v) => setP(dq.id, 'ao1', v)} />
        <label className="bn-field">
          DIO (0/1/z) <input value={String(param(dq, 'dio'))} maxLength={4} onChange={(e) => setP(dq.id, 'dio', e.target.value.replace(/[^01z]/g, 'z'))} />
        </label>
      </div>
      {data && (
        <table className="bn-table">
          <thead>
            <tr>{data.headers.map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.rows.slice(-6).map((r, i) => (
              <tr key={i}>{r.map((v, k) => <td key={k}>{fmt(v)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ----------------------------------------------------------------- Bode

function BodePanel() {
  const gen = useFirst('signal_generator')
  const sc = useFirst('oscilloscope')
  const canvas = useRef<HTMLCanvasElement>(null)
  const [inRef, setIn] = useState('')
  const [outRef, setOut] = useState('')
  const [range, setRange] = useState<[number, number]>([10, 100000])
  const [res, setRes] = useState<BodeResult | null>(null)
  useEffect(() => {
    if (sc) {
      setIn((v) => v || `${sc.id}:CH1`)
      setOut((v) => v || `${sc.id}:CH2`)
    }
  }, [sc?.id])
  useEffect(() => {
    if (!canvas.current || !res) return
    const c = canvas.current
    const ctx = c.getContext('2d')!
    const h = c.height / 2
    const top = document.createElement('canvas')
    top.width = c.width
    top.height = h
    const bot = document.createElement('canvas')
    bot.width = c.width
    bot.height = h
    const markers = [
      ...(res.high ? [{ x: res.high, label: `−3 dB ${fmt(res.high)}Hz` }] : []),
      ...(res.low ? [{ x: res.low, label: `−3 dB ${fmt(res.low)}Hz`, color: '#ff9f0a' }] : []),
      ...(res.q ? [{ x: res.f0, label: `f₀ ${fmt(res.f0)}Hz`, color: '#30d158' }] : []),
    ]
    drawPlot(top, [{ label: '|H| (dB)', color: '#ffd84a', points: res.points.map((p) => ({ x: p.f, y: p.db })) }], { logX: true, yLabel: 'dB', markers, hLines: [{ y: res.peak.db - 3, label: '−3 dB' }] })
    drawPlot(bot, [{ label: 'phase (°)', color: '#43d9f6', points: res.points.map((p) => ({ x: p.f, y: p.phase })) }], { logX: true, xLabel: 'f (Hz)', yLabel: '°', markers })
    ctx.drawImage(top, 0, 0)
    ctx.drawImage(bot, 0, h)
    benchReadings.setImage('bode', c.toDataURL())
  }, [res])
  if (!gen) return <Missing what="function generator" type="signal_generator" />
  const run = () => {
    const r = bode(useStore.getState().layout, gen.id, inRef || null, outRef, range[0], range[1], 201)
    if (!r) {
      showToast('No response — check that the input and output nodes are wired')
      return
    }
    setRes(r)
    benchReadings.set('bode.high', r.high)
    benchReadings.set('bode.low', r.low)
    benchReadings.set('bode.f0', r.f0)
    benchReadings.set('bode.q', r.q)
    benchReadings.set('bode.peak', r.peak.db)
  }
  return (
    <div className="bn-panel" data-instrument="bode">
      <div className="bn-row">
        <label className="bn-field">
          Input node <input value={inRef} onChange={(e) => setIn(e.target.value)} placeholder="SC:CH1 or d10" />
        </label>
        <label className="bn-field">
          Output node <input value={outRef} onChange={(e) => setOut(e.target.value)} placeholder="SC:CH2 or d16" />
        </label>
        <label className="bn-field">
          From <input type="number" value={range[0]} onChange={(e) => setRange([Number(e.target.value) || 1, range[1]])} />
        </label>
        <label className="bn-field">
          To <input type="number" value={range[1]} onChange={(e) => setRange([range[0], Number(e.target.value) || 1e5])} />
        </label>
        <button type="button" className="lab-btn is-primary" onClick={run} data-bode-run>
          Sweep
        </button>
        <button type="button" className="lab-btn" disabled={!res} onClick={() => res && download('bode.csv', toCSV(['f (Hz)', '|H| (dB)', 'phase (deg)'], res.points.map((p) => [p.f, p.db, p.phase])))}>
          CSV
        </button>
      </div>
      <canvas ref={canvas} width={640} height={380} className="bn-plot" data-bode-plot />
      {res && (
        <div className="bn-meas">
          Peak {res.peak.db.toFixed(2)} dB at {fmt(res.peak.f)}Hz · −3 dB {res.low ? fmt(res.low) + 'Hz' : '—'} / {res.high ? fmt(res.high) + 'Hz' : '—'} {res.q ? `· Q ${res.q.toFixed(2)}` : ''}
        </div>
      )}
      <p className="lab-dim">Small-signal AC analysis around the circuit's operating point: the generator becomes a 1 V test source swept on a log scale.</p>
    </div>
  )
}

// --------------------------------------------------------------- tracer

function TracerPanel() {
  const ct = useFirst('curve_tracer')
  const canvas = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<'diode' | 'npn' | 'pnp' | 'nmos'>('diode')
  const [curves, setCurves] = useState<Curve[]>([])
  useEffect(() => {
    if (!canvas.current) return
    const cols = ['#ffd84a', '#43d9f6', '#ff5dd8', '#62e979', '#ff9f0a']
    drawPlot(
      canvas.current,
      curves.map((c, k) => ({ label: c.label, color: cols[k % 5], points: c.points.map((p) => ({ x: p.v, y: p.i * 1000 })) })),
      { xLabel: mode === 'diode' ? 'V_AK (V)' : mode === 'nmos' ? 'V_DS (V)' : 'V_CE (V)', yLabel: 'mA' },
    )
    if (curves.length) benchReadings.setImage('tracer', canvas.current.toDataURL())
  }, [curves, mode])
  if (!ct) return <Missing what="curve tracer" type="curve_tracer" />
  const run = () => {
    const cs = traceCurves(useStore.getState().layout, ct.id, mode, { vMax: mode === 'diode' ? 6 : 10, points: 61 })
    setCurves(cs)
    if (mode === 'diode') benchReadings.set('tracer.vf', cs[0].points.find((p) => p.i >= 1e-3)?.v)
  }
  return (
    <div className="bn-panel" data-instrument="tracer">
      <div className="bn-row">
        <Seg value={mode} options={['diode', 'npn', 'pnp', 'nmos']} onChange={(v) => setMode(v)} />
        <button type="button" className="lab-btn is-primary" onClick={run} data-tracer-run>
          Trace
        </button>
        <button type="button" className="lab-btn" disabled={!curves.length} onClick={() => download('iv.csv', toCSV(['curve', 'V', 'I (A)'], curves.flatMap((c) => c.points.map((p) => [c.label, p.v, p.i]))))}>
          CSV
        </button>
      </div>
      <canvas ref={canvas} width={640} height={300} className="bn-plot" data-tracer-plot />
      <p className="lab-dim">Diode: anode → C, cathode → E (sweeps −6…+1 V through 100 Ω). BJT: C, B, E (base-current steps). MOSFET: D → C, G → B, S → E (gate steps).</p>
    </div>
  )
}

// ---------------------------------------------------------------- sheet

export function BenchSheet({ open, onDismiss, desktop = false, tab, setTab }: { open: boolean; onDismiss: () => void; desktop?: boolean; tab: Tab; setTab: (t: Tab) => void }) {
  const [snap, setSnap] = useState(0)
  const [compact, setCompact] = useState(false)
  const types = useStore((s) => s.layout.components.map((c) => c.type).join(','))
  const present = useMemo(() => new Set(types.split(',')), [types])
  useEffect(() => {
    if (open) setSnap(0)
  }, [open])
  return (
    <Sheet open={open} onDismiss={onDismiss} snapPoints={SNAP} activeSnap={snap} onSnapChange={setSnap} desktop={desktop} anchor="right" ariaLabel="Bench" className="lab-wide bn-sheet asm-sheet">
      <div className="lab-code" data-bench>
        <div className="lab-head">
          <span className="lg-title">Bench</span>
          <button type="button" className="lab-link" onClick={() => setCompact(!compact)}>
            {compact ? 'Full panels' : 'Compact'}
          </button>
        </div>
        <div className="bn-tabs">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={`${t.key === tab ? 'is-on' : ''} ${present.has(t.type) ? '' : 'is-absent'}`} onClick={() => setTab(t.key)} data-bench-tab={t.key}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'gen' && <GeneratorPanel compact={compact} />}
        {tab === 'scope' && <ScopePanel compact={compact} />}
        {tab === 'dmm' && <DmmPanel />}
        {tab === 'supply' && <SupplyPanel compact={compact} />}
        {tab === 'daq' && <DaqPanel />}
        {tab === 'bode' && <BodePanel />}
        {tab === 'tracer' && <TracerPanel />}
        {tab === 'counter' && <CounterPanel />}
        {tab === 'spectrum' && <SpectrumPanel />}
        {tab === 'rms' && <RmsPanel />}
        {tab === 'lcr' && <LcrPanel />}
        {tab === 'vna' && <VnaPanel />}
        {tab === 'power' && <PowerPanel />}
        {tab === 'noise' && <NoisePanel />}
        {tab === 'link' && <LinkPanel />}
        {tab === 'sdr' && <SdrPanel />}
      </div>
    </Sheet>
  )
}

export type BenchTab = Tab
