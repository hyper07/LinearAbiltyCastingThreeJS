/**
 * View chrome: the Photo / Illustrated / Schematic toggle with Fit and the
 * wire tools, the illustrated callout cards (dotted leaders that follow the
 * camera), and the schematic generated from the netlist.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../../state/store'
import { getEntry } from '../../model/catalog'
import { boardConfigOf, type CircuitLayout } from '../../model/types'
import { componentPinHoles, formatHole } from '../../model/breadboard'
import { buildNetlist } from '../../sim/netlist'
import { wireBundles } from '../../three/internal/wires'
import { PRESETS, type Callout } from '../../lessons/presets'
import { EXPERIMENTS } from '../../labs'
import './views.css'

export type ViewStyle = 'photo' | 'illustrated' | 'schematic'

// ------------------------------------------------------------ auto colour

const POWER_PIN = /^(\+|5V|3V3|3\.3V|VIN|VCC|VDD|V\+|\+5V|\+3V3|VBUS)$/i
const GND_PIN = /^(GND\d*|COM|AGND|DGND|GND5|VSS)$/i
const RAINBOW = ['orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'cyan', 'white']

/** red for +V, black for GND, a rainbow across each bundle for signals */
export function autoWireColors(layout: CircuitLayout): Record<string, string> {
  const nl = buildNetlist(layout)
  const gnd = new Set<string>()
  const pwr = new Set<string>()
  const neg = new Set<string>()
  if (nl.ground) gnd.add(nl.ground)
  for (const c of layout.components) {
    const e = getEntry(c.type)
    if (!e || e.placement !== 'offboard') continue
    for (const pin of e.pins) {
      const net = nl.netOf(`${c.id}:${pin}`)
      if (!net) continue
      if (GND_PIN.test(pin)) gnd.add(net)
      else if (POWER_PIN.test(pin) && (e.category === 'power' || e.category === 'board' || e.category === 'instrument')) pwr.add(net)
      else if (pin === '-' && (e.category === 'power' || e.category === 'instrument')) neg.add(net)
    }
  }
  const out: Record<string, string> = {}
  const netOfWire = (w: { from: string; to: string }) => nl.netOf(w.from) ?? nl.netOf(w.to)
  for (const w of layout.wires) {
    const n = netOfWire(w)
    if (n && gnd.has(n)) out[w.id] = 'black'
    else if (n && pwr.has(n)) out[w.id] = 'red'
    else if (n && neg.has(n)) out[w.id] = 'blue'
  }
  let k = 0
  for (const b of wireBundles(layout)) {
    let i = 0
    for (const id of b.wires) if (!out[id]) out[id] = RAINBOW[i++ % RAINBOW.length]
  }
  for (const w of layout.wires) if (!out[w.id]) out[w.id] = RAINBOW[k++ % RAINBOW.length]
  return out
}

// ----------------------------------------------------------------- toggle

export function ViewBar(props: { view: ViewStyle; setView: (v: ViewStyle) => void; onFit: () => void; onTidy: () => void; onAutoColor: () => void }) {
  const opts: [ViewStyle, string][] = [
    ['photo', 'Photo'],
    ['illustrated', 'Illustrated'],
    ['schematic', 'Schematic'],
  ]
  return (
    <div className="vw-bar" data-viewbar>
      <div className="vw-seg" role="tablist" aria-label="View">
        {opts.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={props.view === k} className={props.view === k ? 'is-on' : ''} onClick={() => props.setView(k)} data-view={k}>
            {l}
          </button>
        ))}
      </div>
      <button type="button" className="vw-btn" onClick={props.onFit} title="Fit everything in view (double-click empty space)" data-fit>
        ⤢ Fit
      </button>
      <button type="button" className="vw-btn" onClick={props.onTidy} title="Re-route every wire (ribbons between headers)" data-tidy>
        Tidy wires
      </button>
      <button type="button" className="vw-btn" onClick={props.onAutoColor} title="Red = +V, black = GND, rainbow for signal buses" data-autocolor>
        Auto colour
      </button>
    </div>
  )
}

// --------------------------------------------------------------- callouts

const ICONS: Record<string, JSX.Element> = {
  chip: <path d="M7 7h10v10H7zM9 3v4M12 3v4M15 3v4M9 17v4M12 17v4M15 17v4M3 9h4M3 12h4M3 15h4M17 9h4M17 12h4M17 15h4" />,
  board: <path d="M3 6h18v12H3zM6 9h4v4H6zM13 9h5M13 12h5M6 18v2M10 18v2M14 18v2M18 18v2" />,
  led: <path d="M8 13a4 4 0 1 1 8 0v4H8zM6 17h12M10 17v4M14 17v4M5 6l2 2M19 6l-2 2M12 3v2" />,
  resistor: <path d="M2 12h4l2-4 3 8 3-8 3 8 2-4h3" />,
  speaker: <path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 7a7 7 0 0 1 0 10" />,
  display: <path d="M3 6h18v12H3zM7 10h10M7 14h6" />,
  sensor: <path d="M12 3v3M12 18v3M3 12h3M18 12h3M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2M12 9a3 3 0 1 1 0 6a3 3 0 0 1 0-6z" />,
  power: <path d="M13 2 5 14h6l-1 8 8-12h-6z" />,
  wave: <path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0" />,
  switch: <path d="M3 16h4l9-6M16 16h5M7 16a1.5 1.5 0 1 1 0 .1" />,
  meter: <path d="M4 18a8 8 0 1 1 16 0M12 18l4-6M4 18h16" />,
  motor: <path d="M12 4a8 8 0 1 1 0 16a8 8 0 0 1 0-16zM12 9a3 3 0 1 1 0 6a3 3 0 0 1 0-6zM12 4v5" />,
}
const LEADER = ['#8e5bd8', '#e2a83b', '#3d7fd9', '#e66b3c', '#2fa87a', '#d4508f']

function iconFor(cat: string | undefined): string {
  return cat === 'board' ? 'board' : cat === 'display' ? 'display' : cat === 'sensor' ? 'sensor' : cat === 'instrument' ? 'meter' : cat === 'power' ? 'power' : cat === 'output' ? 'speaker' : 'chip'
}

/** the lesson's / experiment's callouts, else auto cards for boards and modules */
export function calloutsFor(layout: CircuitLayout): Callout[] {
  const ids = new Set(layout.components.map((c) => c.id))
  const fits = (cs?: Callout[]) => cs && cs.length > 0 && cs.every((c) => ids.has(c.part))
  const lesson = PRESETS.find((p) => p.layout.name === layout.name)
  if (lesson && fits(lesson.callouts)) return lesson.callouts!
  const exp = EXPERIMENTS.find((e) => e.build.name === layout.name)
  if (exp && fits(exp.callouts)) return exp.callouts!
  const auto: Callout[] = []
  for (const c of layout.components) {
    const e = getEntry(c.type)
    if (!e || e.placement !== 'offboard') continue
    const first = (e.doc.split(/(?<=\.)\s/)[0] ?? '').slice(0, 70)
    auto.push({ part: c.id, title: e.label.toUpperCase(), text: first, icon: iconFor(e.category) })
    if (auto.length >= 5) break
  }
  return auto
}

interface Projector {
  componentAnchor(id: string): { x: number; y: number; z: number } | null
  projectToScreen(p: { x: number; y: number; z: number }): { x: number; y: number } | null
}

export function Callouts({ scene, items }: { scene: () => Projector | null; items: Callout[] }) {
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const svg = useRef<SVGSVGElement>(null)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const s = scene()
      const g = svg.current
      if (!s || !g) return
      const W = window.innerWidth
      const H = window.innerHeight
      const desk = W >= 900
      const cw = Math.min(260, W * 0.42)
      const pts = items.map((c) => {
        const a = s.componentAnchor(c.part)
        return a ? s.projectToScreen(a) : null
      })
      const idx = items.map((_, i) => i).filter((i) => pts[i])
      const left: number[] = []
      const right: number[] = []
      for (const i of idx.sort((a, b) => pts[a]!.x - pts[b]!.x)) (pts[i]!.x < W / 2 ? left : right).push(i)
      while (left.length > right.length + 1) right.unshift(left.pop()!)
      while (right.length > left.length + 1) left.push(right.shift()!)
      let d = ''
      const dots: string[] = []
      const place = (side: number[], isLeft: boolean) => {
        side.sort((a, b) => pts[a]!.y - pts[b]!.y)
        const top = 64
        const bottom = H - 96
        const ys: number[] = []
        let y = top
        for (const i of side) {
          const h = cards.current[i]?.offsetHeight ?? 80
          y = Math.max(y, Math.min(bottom - h, pts[i]!.y - h / 2))
          ys.push(y)
          y += h + 14
        }
        // pushed past the bottom: slide the stack back up
        let over = y - 14 - bottom
        for (let k = side.length - 1; k >= 0 && over > 0; k--) {
          const room = k === 0 ? ys[0] - top : ys[k] - (ys[k - 1] + (cards.current[side[k - 1]]?.offsetHeight ?? 80) + 14)
          const mv = Math.min(over, Math.max(0, room))
          for (let j = k; j < side.length; j++) ys[j] -= mv
          over -= mv
        }
        side.forEach((i, k) => {
          const el = cards.current[i]
          if (!el) return
          const x = isLeft ? (desk ? 104 : 10) : W - cw - (desk ? 16 : 10)
          el.style.transform = `translate(${x}px, ${ys[k]}px)`
          el.style.width = `${cw}px`
          el.style.opacity = '1'
          const h = el.offsetHeight
          const sx = isLeft ? x + cw : x
          const sy = ys[k] + Math.min(28, h / 2)
          const p = pts[i]!
          const col = LEADER[i % LEADER.length]
          d += `<path d="M${sx},${sy} H${p.x} V${p.y}" stroke="${col}" />`
          dots.push(`<circle cx="${sx}" cy="${sy}" r="6" fill="${col}" stroke="#fff" stroke-width="2"/><circle cx="${p.x}" cy="${p.y}" r="6" fill="${col}" stroke="#fff" stroke-width="2"/>`)
        })
      }
      place(left, true)
      place(right, false)
      items.forEach((_, i) => {
        if (!pts[i] && cards.current[i]) cards.current[i]!.style.opacity = '0'
      })
      g.innerHTML = `<g class="vw-leaders">${d}</g>${dots.join('')}`
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [items, scene])
  return (
    <div className="vw-callouts" data-callouts={items.length}>
      <svg ref={svg} className="vw-leader-svg" aria-hidden="true" />
      {items.map((c, i) => (
        <div key={`${c.part}-${i}`} ref={(el) => (cards.current[i] = el)} className="vw-card" data-callout={c.part}>
          <svg className="vw-icon" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[c.icon ?? 'chip'] ?? ICONS.chip}
          </svg>
          <div>
            <div className="vw-card-title">{c.title}</div>
            <div className="vw-card-text">{c.text}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// -------------------------------------------------------------- schematic

interface SPin {
  name: string
  net: string | null
}
interface SPart {
  id: string
  label: string
  pins: SPin[]
}
export interface Schematic {
  anchor: SPart | null
  parts: SPart[]
  kind: Map<string, 'gnd' | 'pwr' | 'sig'>
  color: Map<string, string>
  label: Map<string, string>
}

const NET_COLORS = ['#e0533f', '#e89a2c', '#c9b02a', '#3fa45b', '#2f8fc7', '#6a5fd0', '#c45aa8', '#1fa59a']
const CSS_COLOR: Record<string, string> = { red: '#d6453a', black: '#33353a', blue: '#2e62d9', green: '#2fa84f', yellow: '#d4a72c', orange: '#e07b2f', purple: '#8e44ad', pink: '#d44f9e', white: '#9aa0a8', cyan: '#1fb1a9', brown: '#8a5a33', grey: '#9aa0a8', gray: '#9aa0a8' }

/** parts, their pins and nets from the layout (union-find netlist) */
export function buildSchematic(layout: CircuitLayout): Schematic {
  const nl = buildNetlist(layout)
  const board = boardConfigOf(layout)
  const parts: SPart[] = []
  for (const c of layout.components) {
    const e = getEntry(c.type)
    if (!e || e.placement === 'probe') continue
    let pins: SPin[]
    if (e.placement === 'offboard') pins = e.pins.map((p) => ({ name: p, net: nl.netOf(`${c.id}:${p}`) }))
    else {
      const holes = componentPinHoles(c, e, board)
      pins = e.pins.map((p, i) => ({ name: p, net: holes?.[i] ? nl.netOf(formatHole(holes[i]!)) : null }))
    }
    parts.push({ id: c.id, label: `${c.id} · ${e.label}`, pins })
  }
  // a net counts when it joins two different parts (a board's own bridged pins do not)
  const owners = new Map<string, Set<string>>()
  for (const p of parts) for (const q of p.pins) if (q.net) owners.set(q.net, (owners.get(q.net) ?? new Set()).add(p.id))
  const count = new Map<string, number>()
  for (const [n, o] of owners) count.set(n, o.size)
  const kind = new Map<string, 'gnd' | 'pwr' | 'sig'>()
  const label = new Map<string, string>()
  for (const c of layout.components) {
    const e = getEntry(c.type)
    if (!e || e.placement !== 'offboard') continue
    for (const pin of e.pins) {
      const n = nl.netOf(`${c.id}:${pin}`)
      if (!n) continue
      if (GND_PIN.test(pin) || n === nl.ground) kind.set(n, 'gnd')
      else if (!kind.has(n) && (POWER_PIN.test(pin) || ((e.category === 'power' || e.category === 'instrument') && pin === '-'))) {
        kind.set(n, 'pwr')
        label.set(n, pin === '-' ? '−V' : pin === '+' ? '+V' : pin)
      }
    }
  }
  if (nl.ground) kind.set(nl.ground, 'gnd')
  // colours from the wires on each net
  const color = new Map<string, string>()
  for (const w of layout.wires) {
    const n = nl.netOf(w.from) ?? nl.netOf(w.to)
    if (n && !color.has(n) && w.color) color.set(n, CSS_COLOR[w.color] ?? w.color)
  }
  let k = 0
  for (const n of count.keys()) if (!color.has(n)) color.set(n, NET_COLORS[k++ % NET_COLORS.length])
  // drop pins that go nowhere; keep parts with at least one connection
  for (const p of parts) {
    const seen = new Set<string>()
    // one row per net on each part (bridged twins like GND/GND2 collapse)
    p.pins = p.pins.filter((q) => q.net && (count.get(q.net) ?? 0) > 1 && !seen.has(q.net) && (seen.add(q.net), true))
  }
  const live = parts.filter((p) => p.pins.length > 0)
  const rank = (id: string) => {
    const t = getEntry(layout.components.find((c) => c.id === id)?.type ?? '')?.category
    return t === 'board' ? 0 : t === 'power' ? 1 : t === 'instrument' ? 2 : 3
  }
  const sorted = live.slice().sort((a, b) => rank(a.id) - rank(b.id))
  const anchor = sorted[0] ?? null
  return { anchor, parts: live.filter((p) => p !== anchor), kind, color, label }
}

const ROW = 18

function SchematicSvg({ sch, selection, onPick }: { sch: Schematic; selection: string[]; onPick: (id: string) => void }) {
  const { anchor, parts, kind, color, label } = sch
  const sig = (n: string | null) => n !== null && !kind.has(n)
  // lanes for signal nets, in the order they leave the anchor
  const lanes: string[] = []
  for (const q of anchor?.pins ?? []) if (sig(q.net) && !lanes.includes(q.net!)) lanes.push(q.net!)
  for (const p of parts) for (const q of p.pins) if (sig(q.net) && !lanes.includes(q.net!)) lanes.push(q.net!)
  const ax = 14
  const aw = 104
  const laneX = (i: number) => ax + aw + 26 + i * 10
  const px = laneX(lanes.length) + 34
  const pw = 150
  const els: JSX.Element[] = []
  const ys = new Map<string, number[]>()
  const addY = (n: string, y: number) => ys.set(n, [...(ys.get(n) ?? []), y])
  const term = (n: string, x: number, y: number, dir: 1 | -1, key: string) => {
    const c = color.get(n) ?? '#666'
    if (kind.get(n) === 'gnd') {
      const gx = x + dir * 22
      els.push(
        <g key={key} stroke="#5b5560" strokeWidth="1.4">
          <line x1={x} y1={y} x2={gx} y2={y} />
          <line x1={gx} y1={y - 6} x2={gx} y2={y + 6} />
          <line x1={gx + dir * 4} y1={y - 4} x2={gx + dir * 4} y2={y + 4} />
          <line x1={gx + dir * 8} y1={y - 2} x2={gx + dir * 8} y2={y + 2} />
        </g>,
      )
    } else if (kind.get(n) === 'pwr') {
      const gx = x + dir * 18
      els.push(
        <g key={key}>
          <line x1={x} y1={y} x2={gx} y2={y} stroke="#d6453a" strokeWidth="1.4" />
          <path d={`M${gx},${y - 5} L${gx + dir * 8},${y} L${gx},${y + 5} Z`} fill="#d6453a" />
          <text x={gx + dir * 11} y={y + 3.5} fontSize="9" fill="#b2352b" textAnchor={dir > 0 ? 'start' : 'end'}>
            {label.get(n) ?? '+V'}
          </text>
        </g>,
      )
    } else {
      els.push(<line key={key} x1={x} y1={y} x2={dir > 0 ? laneX(lanes.indexOf(n)) : laneX(lanes.indexOf(n))} y2={y} stroke={c} strokeWidth="1.6" />)
      addY(n, y)
    }
  }
  let bottom = 0
  const box = (p: SPart, x: number, y0: number, w: number, side: 1 | -1) => {
    const h = 20 + p.pins.length * ROW
    const sel = selection.includes(p.id)
    els.push(
      <g key={`b${p.id}`} className="vw-sch-part" onClick={() => onPick(p.id)} data-sch-part={p.id}>
        <rect x={x} y={y0} width={w} height={h} rx="5" fill={sel ? '#e6f0ff' : '#fffdf8'} stroke={sel ? '#0a84ff' : '#3a3440'} strokeWidth={sel ? 2.2 : 1.3} />
        <text x={x + 7} y={y0 + 13} fontSize="9.5" fontWeight="700" fill="#2b2433">
          {p.label.length > Math.floor(w / 5.8) ? p.label.slice(0, Math.floor(w / 5.8) - 1) + '…' : p.label}
        </text>
      </g>,
    )
    p.pins.forEach((q, i) => {
      const y = y0 + 20 + i * ROW + ROW / 2
      const ex = side > 0 ? x + w : x
      els.push(
        <g key={`p${p.id}${i}`}>
          <rect x={ex - 3} y={y - 3} width="6" height="6" fill="#c98a3a" />
          <text x={side > 0 ? ex - 7 : ex + 7} y={y + 3} fontSize="8.5" fill="#4a4450" textAnchor={side > 0 ? 'end' : 'start'}>
            {q.name}
          </text>
        </g>,
      )
      if (q.net) term(q.net, ex, y, side, `t${p.id}${i}`)
    })
    bottom = Math.max(bottom, y0 + h)
    return y0 + h
  }
  if (anchor) box(anchor, ax, 14, aw, 1)
  let y = 14
  for (const p of parts) y = box(p, px, y, pw, -1) + 12
  // lanes: one vertical trunk per signal net with junction dots
  lanes.forEach((n, i) => {
    const list = ys.get(n) ?? []
    if (list.length === 0) return
    const x = laneX(i)
    const c = color.get(n) ?? '#666'
    els.push(<line key={`l${n}`} x1={x} y1={Math.min(...list)} x2={x} y2={Math.max(...list)} stroke={c} strokeWidth="1.6" />)
    if (list.length > 2) for (const yy of list) els.push(<circle key={`j${n}${yy}`} cx={x} cy={yy} r="2.4" fill={c} />)
  })
  const W = px + pw + 40
  const H = bottom + 20
  return (
    <svg className="vw-sch-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} data-schematic>
      {els}
    </svg>
  )
}

export function SchematicPanel({ open, full, onClose, onToggleFull }: { open: boolean; full: boolean; onClose: () => void; onToggleFull: () => void }) {
  const layout = useStore((s) => s.layout)
  const selection = useStore((s) => s.selection)
  const sch = useMemo(() => buildSchematic(layout), [layout])
  const [, force] = useState(0)
  useEffect(() => force((x) => x + 1), [selection])
  if (!open) return null
  return (
    <div className={`vw-sch ${full ? 'is-full' : ''}`} data-schematic-panel={full ? 'full' : 'inset'}>
      <div className="vw-sch-head">
        <span>SCHEMATIC</span>
        <span className="vw-sch-sp" />
        <button type="button" onClick={onToggleFull} title={full ? 'Back to the inset' : 'Full screen'} aria-label="Expand schematic">
          {full ? '⤡' : '⤢'}
        </button>
        <button type="button" onClick={onClose} title="Close" aria-label="Close schematic">
          ×
        </button>
      </div>
      <div className="vw-sch-body">
        {sch.anchor ? (
          <SchematicSvg sch={sch} selection={selection} onPick={(id) => useStore.getState().select(id)} />
        ) : (
          <div className="vw-sch-empty">Wire some parts together to see the schematic.</div>
        )}
      </div>
    </div>
  )
}
