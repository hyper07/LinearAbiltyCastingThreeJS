/**
 * The pinout drawing on a part's detail page, the way a datasheet shows it:
 *  - DIP chips: the package from above, notch at the top, pins numbered
 *    counter-clockwise from pin 1, each name in its kind's colour;
 *  - simple parts (resistor, capacitor, diode, LED, transistors, pot,
 *    button…): the schematic symbol with each leg named;
 *  - boards, modules, instruments: a top-view map of where every pin sits.
 */
import { getEntry, type CatalogEntry } from '../../model/catalog'
import { boardDef } from '../../model/boards'
import { offboardGeometry } from '../../model/breadboard'
import { PIN_KIND_STYLE, pinKind, pinLabel } from '../../model/pin-labels'

const INK = '#dfe3ea'
const color = (name: string, type: string) => {
  const k = pinKind(name, boardDef(type))
  return k === 'digital' ? '#f4f6f2' : k === 'gnd' ? '#b9bec7' : k === 'ctrl' ? '#b7c0ca' : PIN_KIND_STYLE[k].fill
}

function Dip({ entry }: { entry: CatalogEntry }) {
  const n = entry.pins.length
  const half = n / 2
  const pitch = 22
  const H = half * pitch + 24
  const W = 360
  const bx = 130
  const bw = 100
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="lab-pinout-svg" role="img" aria-label={`${entry.label} pinout`}>
      <rect x={bx} y={8} width={bw} height={H - 16} rx={6} fill="#1d1f24" stroke={INK} strokeWidth={1.5} />
      <path d={`M ${bx + bw / 2 - 12} 8 A 12 12 0 0 0 ${bx + bw / 2 + 12} 8`} fill="#0f1013" stroke={INK} strokeWidth={1.5} />
      <circle cx={bx + 14} cy={24} r={4} fill={INK} opacity={0.6} />
      <text x={bx + bw / 2} y={H / 2} fill={INK} fontSize={12} textAnchor="middle" transform={`rotate(-90 ${bx + bw / 2} ${H / 2})`} className="lab-pinout-part">
        {entry.label.split(' ')[0]}
      </text>
      {entry.pins.map((name, i) => {
        const left = i < half
        const row = left ? i : n - 1 - i
        const y = 20 + row * pitch
        const px = left ? bx - 14 : bx + bw
        return (
          <g key={`${name}:${i}`}>
            <rect x={px} y={y - 4} width={14} height={8} fill="#c8ccd2" />
            <text x={left ? bx + 6 : bx + bw - 6} y={y + 4} fontSize={10} fill={INK} opacity={0.7} textAnchor={left ? 'start' : 'end'}>
              {i + 1}
            </text>
            <text x={left ? bx - 20 : bx + bw + 20} y={y + 4} fontSize={12.5} fontWeight={700} fill={color(name, entry.type)} textAnchor={left ? 'end' : 'start'}>
              {name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** schematic symbol, legs ending at the named pins (left → right) */
function Symbol({ entry }: { entry: CatalogEntry }) {
  const t = entry.type
  const W = 360
  const H = 150
  const y = 75
  const leg = (x1: number, x2: number) => <line x1={x1} y1={y} x2={x2} y2={y} stroke={INK} strokeWidth={2} />
  const label = (x: number, yy: number, s: string, anchor: 'start' | 'middle' | 'end' = 'middle') => (
    <text x={x} y={yy} fontSize={13} fontWeight={700} fill="#ffd29a" textAnchor={anchor}>
      {s}
    </text>
  )
  let body: JSX.Element | null = null
  const p = entry.pins
  if (['resistor', 'decade_resistor', 'photoresistor'].includes(t)) {
    body = (
      <>
        {leg(40, 120)}
        <polyline points="120,75 128,62 144,88 160,62 176,88 192,62 208,88 224,62 240,75" fill="none" stroke={INK} strokeWidth={2} />
        {leg(240, 320)}
        {t === 'photoresistor' && <path d="M 150 30 L 168 50 M 175 25 L 193 45 M 162 50 l 6 0 l 0 -6 M 187 45 l 6 0 l 0 -6" stroke="#ffd29a" strokeWidth={1.8} fill="none" />}
      </>
    )
  } else if (['capacitor', 'decade_capacitor'].includes(t)) {
    body = (
      <>
        {leg(40, 170)}
        <line x1={170} y1={45} x2={170} y2={105} stroke={INK} strokeWidth={3} />
        <path d="M 192 45 Q 182 75 192 105" fill="none" stroke={INK} strokeWidth={3} />
        {leg(186, 320)}
        <text x={150} y={48} fontSize={16} fill="#e5483d" fontWeight={700}>+</text>
        <text x={200} y={48} fontSize={11} fill={INK} opacity={0.7}>curved = − (electrolytic)</text>
      </>
    )
  } else if (t === 'inductor') {
    body = (
      <>
        {leg(40, 110)}
        <path d="M 110 75 a 17 17 0 0 1 34 0 a 17 17 0 0 1 34 0 a 17 17 0 0 1 34 0 a 17 17 0 0 1 34 0" fill="none" stroke={INK} strokeWidth={2} />
        {leg(246, 320)}
      </>
    )
  } else if (['diode', 'diode_1n4007', 'zener_1n4733', 'led'].includes(t)) {
    body = (
      <>
        {leg(40, 150)}
        <polygon points="150,50 150,100 200,75" fill="none" stroke={INK} strokeWidth={2} />
        <line x1={200} y1={48} x2={200} y2={102} stroke={INK} strokeWidth={3} />
        {t === 'zener_1n4733' && <path d="M 190 48 L 200 48 M 200 102 L 210 102" stroke={INK} strokeWidth={3} />}
        {leg(200, 320)}
        {t === 'led' && <path d="M 178 40 L 196 20 M 194 46 L 212 26 M 190 20 l 6 0 l 0 6 M 206 26 l 6 0 l 0 6" stroke="#ff5a4f" strokeWidth={1.8} fill="none" />}
        <text x={180} y={128} fontSize={10} fill={INK} opacity={0.75} textAnchor="middle">current flows → · the bar = the band (cathode)</text>
      </>
    )
  } else if (['npn', 'pnp', 'nmos'].includes(t)) {
    const mos = t === 'nmos'
    return (
      <svg viewBox={`0 0 ${W} 170`} className="lab-pinout-svg" role="img" aria-label={`${entry.label} symbol`}>
        <circle cx={190} cy={85} r={46} fill="none" stroke={INK} strokeWidth={1.5} opacity={0.6} />
        <line x1={70} y1={85} x2={mos ? 165 : 172} y2={85} stroke={INK} strokeWidth={2} />
        {mos ? (
          <>
            <line x1={165} y1={60} x2={165} y2={110} stroke={INK} strokeWidth={2} />
            <line x1={175} y1={60} x2={175} y2={110} stroke={INK} strokeWidth={3} strokeDasharray="12 6" />
            <path d="M 175 66 H 205 V 30 M 175 104 H 205 V 140 M 175 85 H 205 V 104" stroke={INK} strokeWidth={2} fill="none" />
            <polygon points="178,85 190,79 190,91" fill={INK} />
          </>
        ) : (
          <>
            <line x1={172} y1={60} x2={172} y2={110} stroke={INK} strokeWidth={3} />
            <path d="M 172 72 L 205 50 V 30 M 172 98 L 205 120 V 140" stroke={INK} strokeWidth={2} fill="none" />
            {t === 'npn' ? <polygon points="205,120 192,118 199,108" fill={INK} /> : <polygon points="176,96 189,98 182,108" fill={INK} />}
          </>
        )}
        {label(60, 80, mos ? 'gate' : 'base', 'end')}
        {label(215, 30, mos ? 'drain' : t === 'npn' ? 'collector' : 'emitter', 'start')}
        {label(215, 150, mos ? 'source' : t === 'npn' ? 'emitter' : 'collector', 'start')}
      </svg>
    )
  } else if (['potentiometer', 'trimmer'].includes(t)) {
    body = (
      <>
        {leg(40, 120)}
        <rect x={120} y={60} width={120} height={30} fill="none" stroke={INK} strokeWidth={2} />
        {leg(240, 320)}
        <path d="M 180 130 V 96 M 172 104 L 180 92 L 188 104" stroke="#ffd29a" strokeWidth={2} fill="none" />
        {label(180, 146, p[1])}
      </>
    )
  } else if (['pushbutton', 'slide_switch'].includes(t)) {
    body = (
      <>
        {leg(40, 140)}
        <circle cx={142} cy={75} r={4} fill={INK} />
        <circle cx={218} cy={75} r={4} fill={INK} />
        <line x1={140} y1={55} x2={220} y2={55} stroke={INK} strokeWidth={2.5} />
        <line x1={180} y1={55} x2={180} y2={35} stroke={INK} strokeWidth={2} />
        {leg(220, 320)}
        {t === 'pushbutton' && <text x={180} y={120} fontSize={11} fill={INK} opacity={0.7} textAnchor="middle">A1–A2 and B1–B2 are always joined; pressing joins A to B</text>}
      </>
    )
  } else if (t === 'buzzer') {
    body = (
      <>
        {leg(40, 150)}
        <path d="M 150 95 A 30 30 0 0 1 210 95 Z" fill="none" stroke={INK} strokeWidth={2} />
        {leg(210, 320)}
      </>
    )
  }
  if (!body) return null
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="lab-pinout-svg" role="img" aria-label={`${entry.label} symbol`}>
      {body}
      {label(36, 66, p[0], 'start')}
      {label(324, 66, p[p.length - 1], 'end')}
    </svg>
  )
}

/** where every pin sits, seen from above (boards, modules, instruments, footprint boards) */
function PinMap({ entry }: { entry: CatalogEntry }) {
  const geo = offboardGeometry(entry.type)
  const def = boardDef(entry.type)
  let pts: { x: number; z: number; name: string }[] = []
  let rect: { x0: number; x1: number; z0: number; z1: number } | null = null
  if (geo) {
    pts = geo.terminals.map((t, i) => ({ x: t.dx, z: t.dz, name: entry.pins[i] }))
    rect = geo.rect
  } else if (entry.footprintOffsets) {
    const rows = 'abcdefghij'
    pts = entry.footprintOffsets.map((o, i) => ({ x: o.dCol, z: rows.indexOf(o.row), name: entry.pins[i] }))
  } else {
    // instruments with no geometry: their terminals in a row
    pts = entry.pins.map((name, i) => ({ x: i * 2.5, z: 0, name }))
  }
  if (!pts.length) return null
  const xs = pts.map((p) => p.x).concat(rect ? [rect.x0, rect.x1] : [])
  const zs = pts.map((p) => p.z).concat(rect ? [rect.z0, rect.z1] : [])
  const minX = Math.min(...xs) - 1
  const maxX = Math.max(...xs) + 1
  const minZ = Math.min(...zs) - 1
  const maxZ = Math.max(...zs) + 1
  const W = 380
  const k = Math.min(W / (maxX - minX), 420 / (maxZ - minZ), 26)
  const dense = k < 16
  const pad = dense ? 46 : 26
  const H = (maxZ - minZ) * k + pad * 2
  const sx = (x: number) => (x - minX) * k + (W - (maxX - minX) * k) / 2
  const sz = (z: number) => (z - minZ) * k + pad
  // labels go away from the body's middle so rows don't collide
  const midZ = (minZ + maxZ) / 2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="lab-pinout-svg" role="img" aria-label={`${entry.label} pin map`}>
      {rect && <rect x={sx(rect.x0)} y={sz(rect.z0)} width={(rect.x1 - rect.x0) * k} height={(rect.z1 - rect.z0) * k} rx={6} fill="#1d2a2e" stroke={INK} strokeOpacity={0.5} />}
      {!rect && <rect x={sx(minX + 0.5)} y={sz(minZ + 0.5)} width={(maxX - minX - 1) * k} height={(maxZ - minZ - 1) * k} rx={6} fill="#1d2a2e" stroke={INK} strokeOpacity={0.5} />}
      {pts.map((p, i) => {
        const up = p.z <= midZ
        const tx = sx(p.x)
        const ty = sz(p.z) + (up ? -7 : 7)
        const txt = def ? pinLabel(p.name, def) : p.name
        return (
          <g key={i}>
            <circle cx={sx(p.x)} cy={sz(p.z)} r={Math.max(2.2, Math.min(5, k * 0.28))} fill={color(p.name, entry.type)} stroke="#000" strokeOpacity={0.4} />
            <text x={tx} y={dense ? ty : ty + (up ? 0 : 6)} fontSize={dense ? 10 : 11} fontWeight={700} fill={color(p.name, entry.type)} textAnchor={dense ? (up ? 'start' : 'end') : 'middle'} dominantBaseline={dense ? 'middle' : undefined} transform={dense ? `rotate(-90 ${tx} ${ty})` : undefined}>
              {txt}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function PinoutDiagram({ type }: { type: string }) {
  const entry = getEntry(type)
  if (!entry) return null
  if (entry.placement === 'dip') return <Dip entry={entry} />
  if (entry.placement === 'leads' || entry.placement === 'probe') {
    const sym = <Symbol entry={entry} />
    if (sym.type && Symbol({ entry })) return sym
  }
  return <PinMap entry={entry} />
}

export function KindLegend() {
  return (
    <div className="lab-kind-legend">
      {(['power', 'gnd', 'analog', 'pwm', 'bus', 'digital'] as const).map((k) => (
        <span key={k}>
          <i style={{ background: PIN_KIND_STYLE[k].fill }} />
          {PIN_KIND_STYLE[k].word}
        </span>
      ))}
    </div>
  )
}
