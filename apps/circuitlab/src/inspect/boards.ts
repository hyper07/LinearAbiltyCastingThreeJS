/**
 * Board teardown data (knowledge/circuit-boards.json): types and the pure helpers
 * the Inspect view needs — resolving a part's teaching text from its kind, nets,
 * pin groups and the ladder-style schematic layout. No three.js or DOM here, so
 * tests/inspect-boards.test.ts can run it in node.
 */

export interface BoardKind {
  label: string
  kid: string
  deep: string
  facts: string[]
  misconceptions: string[]
}

export interface BoardPart {
  ref: string
  kind: string
  name: string
  marking?: string
  value?: string
  package: string
  x: number
  y: number
  rot: number
  side?: 'top' | 'bottom'
  w: number
  d: number
  h: number
  /** base height when the part sits on another (antenna on its module) */
  z?: number
  look: string
  role: string
  specs: Record<string, string>
  nets: Record<string, string>
  color?: string
  partOf?: string
  fitted?: boolean
  note?: string
  datasheet?: { title: string; url?: string }
  kid?: string
  deep?: string
  facts?: string[]
  misconceptions?: string[]
}

export interface BoardPin {
  id: string
  name: string
  x: number
  y: number
  net: string | null
  part: string
}

export interface PinGroup {
  id: string
  label: string
  color: string
  pins: string[]
  note: string
  warning?: string
}

export type NetKind = 'power' | 'ground' | 'signal' | 'local'

export interface BoardNet {
  name: string
  kind: NetKind
  parts: string[]
  about?: string
}

export interface BoardSource {
  title: string
  url?: string
  licence: string
  used: string
}

export interface BoardData {
  id: string
  labBoard: string | null
  name: string
  summary: string
  size: { w: number; h: number; t: number }
  pcb: { color: string; silk: string; copper: string }
  positions: 'design-file' | 'estimated'
  positionsNote: string
  pinRows: 'pins-up' | 'female' | 'castellated'
  callouts: string[]
  sources: BoardSource[]
  licence: string
  pins: BoardPin[]
  parts: BoardPart[]
  pinGroups: PinGroup[]
  nets: BoardNet[]
  facts?: string[]
}

export interface BoardsDoc {
  version: number
  about: string
  units: string
  rules: string[]
  kinds: Record<string, BoardKind>
  boards: BoardData[]
}

/** the JSON is big (≈ 280 KB): load it only when Inspect opens */
export async function loadBoards(): Promise<BoardsDoc> {
  const m = await import('../../../../knowledge/circuit-boards.json')
  return (m.default ?? m) as unknown as BoardsDoc
}

export interface ResolvedPart extends BoardPart {
  kindLabel: string
  kid: string
  deep: string
  facts: string[]
  misconceptions: string[]
}

/** a part with its kind's teaching text filled in (the part's own text wins, facts add up) */
export function resolvePart(doc: Pick<BoardsDoc, 'kinds'>, part: BoardPart): ResolvedPart {
  const k = doc.kinds[part.kind]
  return {
    ...part,
    kindLabel: k?.label ?? part.kind,
    kid: part.kid ?? k?.kid ?? '',
    deep: part.deep ?? k?.deep ?? '',
    facts: [...(part.facts ?? []), ...(k?.facts ?? [])],
    misconceptions: [...(part.misconceptions ?? []), ...(k?.misconceptions ?? [])],
  }
}

export function findBoard(doc: BoardsDoc, id: string | null | undefined): BoardData {
  return doc.boards.find((b) => b.id === id) ?? doc.boards.find((b) => b.labBoard === id) ?? doc.boards[0]
}

/** the Inspect board for a Circuit Lab board type, if we have its teardown */
export function boardIdForLab(doc: Pick<BoardsDoc, 'boards'>, labType: string): string | null {
  return doc.boards.find((b) => b.labBoard === labType)?.id ?? null
}

/** unique nets a part touches, in pad order */
export function netsOfPart(part: BoardPart): string[] {
  return [...new Set(Object.values(part.nets ?? {}))]
}

/** refs of the parts (and headers) on a net */
export function partsOnNet(board: BoardData, net: string): string[] {
  return board.nets.find((n) => n.name === net)?.parts ?? []
}

export function pinsOfGroup(board: BoardData, group: PinGroup): BoardPin[] {
  const names = new Set(group.pins)
  return board.pins.filter((p) => names.has(p.name))
}

/** board-mm centroid of a pin group (where its callout dot goes) */
export function groupAnchor(board: BoardData, group: PinGroup): { x: number; y: number } {
  const pins = pinsOfGroup(board, group)
  if (!pins.length) return { x: board.size.w / 2, y: board.size.h / 2 }
  // the group's pins on its most common row, so the dot sits on the header
  const rows = new Map<number, BoardPin[]>()
  for (const p of pins) {
    const k = Math.round(p.y)
    rows.set(k, [...(rows.get(k) ?? []), p])
  }
  const best = [...rows.values()].sort((a, b) => b.length - a.length)[0]
  return { x: best.reduce((s, p) => s + p.x, 0) / best.length, y: best[0].y }
}

/** visible parts (not-fitted footprints stay in the lists but not in 3D) */
export function fittedParts(board: BoardData): BoardPart[] {
  return board.parts.filter((p) => p.fitted !== false)
}

// ------------------------------------------------------------- schematic

export type SymbolKind = 'chip' | 'res' | 'cap' | 'led' | 'diode' | 'xtal' | 'switch' | 'coil' | 'fet' | 'conn' | 'other'

export function symbolOf(kind: string): SymbolKind {
  if (/^(mcu|usb-uart|rf-module|ldo|buck-boost|flash|opamp)$/.test(kind)) return 'chip'
  if (kind.startsWith('resistor')) return 'res'
  if (kind.startsWith('cap')) return 'cap'
  if (kind === 'led') return 'led'
  if (kind.startsWith('diode') || kind === 'tvs-esd') return 'diode'
  if (kind === 'crystal' || kind === 'resonator') return 'xtal'
  if (kind === 'button' || kind === 'solder-jumper') return 'switch'
  if (kind === 'inductor' || kind === 'ferrite' || kind === 'fuse-ptc') return 'coil'
  if (kind.startsWith('mosfet') || kind === 'bjt') return 'fet'
  if (kind.startsWith('header') || kind === 'usb-connector' || kind === 'dc-jack' || kind === 'pads') return 'conn'
  return 'other'
}

const KIND_ORDER = ['mcu', 'rf-module', 'usb-uart', 'flash', 'ldo', 'buck-boost', 'opamp', 'crystal', 'resonator', 'mosfet-p', 'mosfet-n', 'bjt']

export interface SchematicRail {
  net: string
  kind: NetKind
  y: number
}
export interface SchematicColumn {
  ref: string
  name: string
  symbol: SymbolKind
  x: number
  nets: string[]
}
export interface SchematicLayout {
  rails: SchematicRail[]
  columns: SchematicColumn[]
  width: number
  height: number
  top: number
  left: number
}

/**
 * A ladder schematic: one horizontal rail per net that joins two or more parts
 * (power first, then ground, signals, local links) and one column per part,
 * chips first. A dot marks where a part's column meets a rail it touches.
 */
export function schematicLayout(board: BoardData, opts: { railGap?: number; colGap?: number } = {}): SchematicLayout {
  const railGap = opts.railGap ?? 13
  const colGap = opts.colGap ?? 24
  const top = 34
  const left = 74
  const rank = (k: NetKind) => ['power', 'ground', 'signal', 'local'].indexOf(k)
  const railNets = board.nets.filter((n) => n.parts.length >= 2).sort((a, b) => rank(a.kind) - rank(b.kind))
  const rails = railNets.map((n, i) => ({ net: n.name, kind: n.kind, y: top + 8 + i * railGap }))
  const onRail = new Set(rails.map((r) => r.net))
  const cols = board.parts
    .filter((p) => p.fitted !== false && !p.partOf)
    .map((p) => ({ p, k: KIND_ORDER.indexOf(p.kind) }))
    .sort((a, b) => (a.k < 0 ? 99 : a.k) - (b.k < 0 ? 99 : b.k) || a.p.ref.localeCompare(b.p.ref, 'en', { numeric: true }))
  const columns = cols.map(({ p }, i) => ({
    ref: p.ref,
    name: p.name,
    symbol: symbolOf(p.kind),
    x: left + 12 + i * colGap,
    nets: netsOfPart(p).filter((n) => onRail.has(n)),
  }))
  // header parts reach their pins' nets too
  for (const c of columns) {
    for (const pin of board.pins) if (pin.part === c.ref && pin.net && onRail.has(pin.net) && !c.nets.includes(pin.net)) c.nets.push(pin.net)
  }
  return {
    rails,
    columns,
    width: left + 24 + columns.length * colGap,
    height: top + 16 + rails.length * railGap,
    top,
    left,
  }
}

/** stable signal colours for rails and net chips (red power, ink ground, a rainbow for signals) */
const SIGNAL_COLORS = ['#e0679a', '#8b5cd8', '#3b74d8', '#2fa58a', '#e8a33a', '#d8743b', '#4aa3c8', '#6aa84f']
export function netColor(net: string, kind: NetKind): string {
  if (kind === 'power') return '#d84a3b'
  if (kind === 'ground') return '#2b2433'
  if (kind === 'local') return '#9a8f80'
  let h = 0
  for (const ch of net) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return SIGNAL_COLORS[h % SIGNAL_COLORS.length]
}
