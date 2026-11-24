/**
 * Wire + leaded-component visuals: color resolution, unified collision-aware
 * route planning, and tube geometry.
 *
 * Routing is delegated to the PURE planner in wire-router.ts. The scene calls
 * planRoutes() once per setLayout — ONE routeAll() pass routes the axial
 * leaded components (resistor / diode / inductor, as first-class fat bodies)
 * AND every wire of the layout together, so wires dodge component bodies and
 * each other, short leaded parts become vertical mounts, and long ones fly
 * level spans. Off-board instruments join the pass as obstacle boxes with
 * terminal exits (instrumentsForLayout — explicit `comp.pos` honored), so
 * committed wires AND previews clear instrument bodies and exit their own
 * unit's posts cleanly. Results are cached by an endpoint+obstacle+instrument
 * signature; nothing is recomputed when the layout signature is unchanged.
 *
 * Consumers:
 *  - wireGeometry() renders a wire's cached route as a CatmullRom tube
 *    (legacy raised arc when un-routed).
 *  - routedComponentPose() / routedComponentSignature() feed the planned body
 *    pose into component-meshes' buildComponentObject (and the scene's
 *    rebuild diff).
 *  - previewWireGeometry() / previewComponentPose() run routeOne() against
 *    the cached world for live previews (wire drag, holographic ghost).
 *    routeOne simulates the candidate's true routeAll sort position (a
 *    component ghost ignores wires, exactly as the commit pass does; a wire
 *    only sees components and longer wires), so the preview IS the
 *    candidate's final committed path — already-placed wires may still
 *    re-route around it after commit, and an exact span-length tie can
 *    break differently (routeAll ties by id, unknowable at preview time).
 */

import * as THREE from 'three'
import type { CircuitLayout, ComponentInstance, Wire } from '../../model/types'
import { boardConfigOf } from '../../model/types'
import {
  componentPinHoles,
  holePosition,
  offboardBodyHeight,
  offboardBodyRect,
  offboardTerminalExit,
  offboardTerminalY,
  offboardTerminalPosition,
  parseHole,
  parseTerminalRef,
} from '../../model/breadboard'
import { getEntry, paramOf, type CatalogEntry } from '../../model/catalog'
import { boardDef } from '../../model/boards'
import {
  routeAll,
  routeOne,
  toRoutedPose,
  type InstrumentObstacle,
  type RouteItemInput,
  type RouteObstacle,
  type RoutePoint,
  type RoutedComponent,
  type RoutedComponentPath,
  type RoutedWire,
  type RoutedWorld,
} from './wire-router'

/** y of the top of an off-board terminal post (wire attachment point). */
export const TERMINAL_TOP_Y = 0.7

/** Jumper-wire palette used when a wire has no (valid) explicit color. */
const PALETTE = [
  '#d6453a', // red
  '#2e62d9', // blue
  '#2fa84f', // green
  '#e8b73a', // yellow
  '#8e44ad', // purple
  '#e07b2f', // orange
  '#1fb1a9', // teal
  '#33353a', // black
  '#9aa0a8', // grey
  '#d44f9e', // pink
]

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/

/**
 * Real PVC insulation tones for the common DSL color NAMES. Passing names
 * straight to THREE.Color gives maximally-saturated CSS primaries ('red' =
 * #ff0000, 'blue' = #0000ff) that read as neon licorice under the ACES
 * pipeline — actual jumper PVC is pigmented, desaturated plastic. Aligned
 * with the hashed-id PALETTE above so named and palette wires look like one
 * kit. Explicit hex strings still pass through untouched.
 */
const PVC_NAMES: Record<string, string> = {
  red: '#c23b32',
  blue: '#2e62d9',
  green: '#2fa84f',
  yellow: '#e8b73a',
  orange: '#e07b2f',
  purple: '#8e44ad',
  violet: '#8e44ad',
  teal: '#1fb1a9',
  cyan: '#1fb1a9',
  black: '#33353a',
  white: '#e6e3da',
  gray: '#9aa0a8',
  grey: '#9aa0a8',
  brown: '#8a5a33',
  pink: '#d44f9e',
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Wire color: wire.color if it is a valid css name / hex (common jumper
 *  names mapped to PVC tones), else a palette hash by id. */
export function wireColorFor(wire: Wire): THREE.Color {
  const c = wire.color?.trim().toLowerCase()
  if (c) {
    if (HEX_RE.test(c)) return new THREE.Color(c)
    const pvc = PVC_NAMES[c]
    if (pvc) return new THREE.Color(pvc)
    if (c in THREE.Color.NAMES) return new THREE.Color(c)
  }
  return new THREE.Color(PALETTE[hashString(wire.id) % PALETTE.length])
}

// ---------------------------------------------------------------------------
// Routed component bodies (axial leaded parts the router owns)
// ---------------------------------------------------------------------------

/**
 * Rigid-body dimensions (plan units) fed to the router per AXIAL leaded type.
 * The router reserves a straight body segment of `length` on span routes /
 * stands it upright for short spans, and collision-samples it as a fat
 * cylinder of `diameter`. The mesh builders infer the rendered body length
 * from the routed lead exits, so these must sit inside their clamp ranges
 * (resistor 0.9..2.4, diode 0.7..1.3, inductor 1.2..2.6 — meshes/passives.ts).
 *
 * Most standing/radial parts (LDR, TO-92, pot, switches) keep their classic
 * pins-derived placement and stay obstacle BOXES instead.
 *
 * LEDs and capacitors are the exception (`standing`): the user-reported
 * packed-part noclip (two of them in neighboring columns share volume —
 * DESIGN.md §4b) needs the router's lift-tier + lateral ladder, so they
 * route as standing span bodies (rendered upright at the routed center;
 * meshes/semis.ts + passives.ts consume the pose and lead runs). `standing`
 * = the body's full vertical extent measured from 0.45 below the routed
 * center (LED: flange ≈ center−0.40 through dome top ≈ center+0.98;
 * electrolytic can ≈ center±0.7). diameter 0.8 is deliberately under the
 * physical girth: the router's clearance demand (0.45 + rA + rB = 1.45)
 * then lands right at the no-touch band of the ladder's reachable plan
 * separations, so packed parts NEST (one column over, half a tier up)
 * instead of scattering skyward. Standing types also KEEP their obstacle
 * box below — the router endpoint-skips a box for any item plugged inside
 * it, so the box never fights the part's own route but still walls wires
 * off the body.
 */
const ROUTED_BODY: Record<string, { length: number; diameter: number; standing?: number }> = {
  resistor: { length: 2.2, diameter: 0.8 },
  diode: { length: 1.1, diameter: 0.55 },
  inductor: { length: 2.0, diameter: 0.8 },
  led: { length: 1.5, diameter: 0.8, standing: 1.45 },
  capacitor: { length: 1.2, diameter: 0.8, standing: 1.2 },
}

/** Router body dims for a type routed as a first-class component, else null. */
export function routedBodyFor(type: string): { length: number; diameter: number } | null {
  return ROUTED_BODY[type] ?? null
}

// ---------------------------------------------------------------------------
// Obstacle derivation (component bodies wires must fly over)
// ---------------------------------------------------------------------------

/** plan margin added around a component's hole bbox */
const OBSTACLE_MARGIN = 0.4
/** body heights by package: DIP/displays, leaded parts, buttons (footprint) */
const DIP_HEIGHT = 1.7
const LEADS_HEIGHT = 1.2
const BUTTON_HEIGHT = 1.1
/**
 * Leaded parts taller than the generic 1.2 envelope. The router only keeps
 * wires above height + 0.35, so each entry must be ≥ the actual mesh top
 * (src/three/meshes/*): LED dome 1.83 (semis.ts), TO-92 body ~1.8 (semis.ts),
 * slide-switch lever 1.88 (switches.ts), pot knob slot ~1.83 (passives.ts).
 */
const TALL_LEADS_HEIGHTS: Record<string, number> = {
  led: 1.9,
  npn: 1.85,
  pnp: 1.85,
  nmos: 1.85,
  slide_switch: 1.9,
  potentiometer: 1.9,
  multimeter: 5.6,
}
/** Circuit Lab: footprint parts taller than a pushbutton (boards, standing sensor modules) */
const FOOTPRINT_HEIGHTS: Record<string, number> = { hcsr04: 9.4, dht22: 12.4 }
/** electrolytic can top = 1.55 (passives.ts) — the flat 1.2 left zero margin */
const ELECTROLYTIC_HEIGHT = 1.6
/** vertical hole-entry rise — must match wire-router's ENTRY_RISE */
const ENTRY_RISE = 0.5

/** Obstacle height of a 'leads' part, matched to its actual mesh top. */
function leadsHeightFor(comp: ComponentInstance, entry: CatalogEntry): number {
  if (comp.type === 'capacitor' && paramOf(comp.params, entry, 'polarized') === true) {
    return ELECTROLYTIC_HEIGHT // matches buildCapacitor's electrolytic branch
  }
  return TALL_LEADS_HEIGHTS[comp.type] ?? LEADS_HEIGHT
}

/**
 * Obstacle boxes for every on-board component body in the layout (probes and
 * off-board instruments are skipped — they never obstruct board wiring; the
 * axial ROUTED_BODY types are skipped too: the router collision-samples their
 * planned bodies directly, which replaces the box).
 */
export function obstaclesForLayout(layout: CircuitLayout): RouteObstacle[] {
  const out: RouteObstacle[] = []
  // resolve pin holes against the layout's ACTUAL rig: with the default
  // ('standard' × 1) config, parts beyond column 63 on a Lab XL (or second
  // module) would read as malformed and produce no collision obstacles
  const board = boardConfigOf(layout)
  for (const comp of layout.components) {
    const entry = getEntry(comp.type)
    if (!entry || entry.placement === 'offboard' || entry.placement === 'probe') continue
    // axial routed bodies replace their box outright; STANDING routed bodies
    // (LED) keep the box as well — it walls wires off the dome (the router
    // endpoint-skips it for the LED's own route and for parts plugged
    // alongside, which then dodge the sampled body column instead)
    const routedBody = ROUTED_BODY[comp.type]
    if (routedBody && !routedBody.standing) continue
    const holes = componentPinHoles(comp, entry, board)
    if (!holes) continue
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const h of holes) {
      if (!h) continue
      const p = holePosition(h)
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.z < minZ) minZ = p.z
      if (p.z > maxZ) maxZ = p.z
    }
    if (minX > maxX) continue
    const height =
      entry.placement === 'dip'
        ? DIP_HEIGHT
        : entry.placement === 'footprint'
          ? FOOTPRINT_HEIGHTS[comp.type] ?? boardDef(comp.type)?.bodyHeight ?? BUTTON_HEIGHT
          : leadsHeightFor(comp, entry)
    out.push({
      minX: minX - OBSTACLE_MARGIN,
      maxX: maxX + OBSTACLE_MARGIN,
      minZ: minZ - OBSTACLE_MARGIN,
      maxZ: maxZ + OBSTACLE_MARGIN,
      height,
    })
  }
  return out
}

/**
 * Off-board instruments (PSU, function generator) as router obstacle boxes
 * with terminal exits, slot-ordered exactly like the endpoint resolver and
 * the scene's record builder (explicit `comp.pos` honored everywhere). The
 * boxes keep wires from noclipping through an enclosure; each terminal's
 * exitDir points +z (off the front face, where the posts sit) so a wire
 * plugged into a post first runs AWAY from the box before arcing onward.
 */
export function instrumentsForLayout(layout: CircuitLayout): InstrumentObstacle[] {
  const out: InstrumentObstacle[] = []
  let slot = 0
  for (const comp of layout.components) {
    const entry = getEntry(comp.type)
    if (entry?.placement !== 'offboard') continue
    const mySlot = slot++
    const rot = comp.rotation ?? 0
    const rect = offboardBodyRect(mySlot, comp.pos, comp.type, rot)
    out.push({
      id: comp.id,
      ...rect,
      height: offboardBodyHeight(comp.type),
      terminals: entry.pins.map((_pin, i) => {
        const p = offboardTerminalPosition(mySlot, i, comp.pos, comp.type, rot)
        return { x: p.x, z: p.z, exitDir: offboardTerminalExit(comp.type, i, rot) }
      }),
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Route planning cache (one unified routing pass per layout change)
// ---------------------------------------------------------------------------

interface CachedWireRoute {
  route: RoutedWire
  /** endpoint signature the route was computed for (stale-lookup guard) */
  key: string
  /** endpoint heights (terminal posts attach above the board plane) */
  ya: number
  yb: number
}

interface CachedComponentRoute {
  pose: RoutedComponent
  /** stable pose hash — folds into the scene's component rebuild signature */
  sig: string
}

let wireRouteCache = new Map<string, CachedWireRoute>()
let compRouteCache = new Map<string, CachedComponentRoute>()
let plannedWorld: RoutedWorld | null = null
let planSignature = ''
let planVersionCounter = 0

function endpointKey(a: THREE.Vector3, b: THREE.Vector3): string {
  return (
    `${a.x.toFixed(3)},${a.y.toFixed(3)},${a.z.toFixed(3)}|` +
    `${b.x.toFixed(3)},${b.y.toFixed(3)},${b.z.toFixed(3)}`
  )
}

/** Stable little hash of a routed item's waypoints (rebuild-diff signatures). */
function waypointHash(pts: readonly RoutePoint[]): string {
  let h = 0
  for (const p of pts) {
    h = (h * 31 + Math.round(p.x * 100)) | 0
    h = (h * 31 + Math.round(p.y * 100)) | 0
    h = (h * 31 + Math.round(p.z * 100)) | 0
  }
  return (h >>> 0).toString(36)
}

/**
 * Pure endpoint resolution for planning (no scene records needed): board
 * holes at y = 0; off-board terminals at their post tops, positioned by the
 * component's slot among the layout's off-board components — identical to the
 * scene's attach points, so plan inputs and rendered wires always agree.
 */
function makeEndpointResolver(
  layout: CircuitLayout,
): (ref: string) => { x: number; y: number; z: number } | null {
  const offboard = new Map<
    string,
    { slot: number; entry: CatalogEntry; pos?: { x: number; z: number }; rot: number }
  >()
  let slot = 0
  for (const comp of layout.components) {
    const entry = getEntry(comp.type)
    if (entry?.placement === 'offboard') {
      offboard.set(comp.id, { slot: slot++, entry, pos: comp.pos, rot: comp.rotation ?? 0 })
    }
  }
  return (ref) => {
    const hole = parseHole(ref)
    if (hole) {
      const p = holePosition(hole)
      return { x: p.x, y: 0, z: p.z }
    }
    const term = parseTerminalRef(ref)
    if (!term) return null
    const rec = offboard.get(term.componentId)
    if (!rec) return null
    const pinIdx = rec.entry.pins.indexOf(term.pin)
    if (pinIdx < 0) return null
    // explicit instrument pos (movable instruments) overrides the slot shelf
    const p = offboardTerminalPosition(rec.slot, pinIdx, rec.pos, rec.entry.type, rec.rot)
    return { x: p.x, y: offboardTerminalY(rec.entry.type, pinIdx) ?? TERMINAL_TOP_Y, z: p.z }
  }
}

const tmpA = new THREE.Vector3()
const tmpB = new THREE.Vector3()

/**
 * Route the whole layout — axial leaded components AND wires — in one
 * collision-aware routeAll() pass, and cache the result. Idempotent: when
 * endpoints, bodies and obstacles are unchanged the cached routes are kept
 * as-is. The scene calls this at the top of every setLayout sync (it needs
 * no scene state: terminal positions resolve from the layout alone).
 */
export function planRoutes(layout: CircuitLayout): void {
  const resolve = makeEndpointResolver(layout)
  const board = boardConfigOf(layout)

  const items: RouteItemInput[] = []
  const compIds: string[] = []
  const wireMetas: { id: string; key: string; ya: number; yb: number }[] = []
  const sigParts: string[] = []

  for (const comp of layout.components) {
    const body = ROUTED_BODY[comp.type]
    if (!body) continue
    const entry = getEntry(comp.type)
    if (!entry || entry.pins.length < 2) continue
    const holes = componentPinHoles(comp, entry, board)
    if (!holes || !holes[0] || !holes[1]) continue
    const a = holePosition(holes[0])
    const b = holePosition(holes[1])
    items.push({
      id: comp.id,
      kind: 'component',
      ax: a.x,
      az: a.z,
      bx: b.x,
      bz: b.z,
      body,
    })
    compIds.push(comp.id)
    sigParts.push(
      `c${comp.id}@${a.x.toFixed(3)},${a.z.toFixed(3)}|${b.x.toFixed(3)},${b.z.toFixed(3)}` +
        `#${body.length},${body.diameter},${body.standing ?? 0}`,
    )
  }

  for (const wire of layout.wires) {
    const a = resolve(wire.from)
    const b = resolve(wire.to)
    if (!a || !b) continue // unresolvable endpoint → no visual → no route
    items.push({ id: wire.id, ax: a.x, az: a.z, bx: b.x, bz: b.z })
    tmpA.set(a.x, a.y, a.z)
    tmpB.set(b.x, b.y, b.z)
    wireMetas.push({ id: wire.id, key: endpointKey(tmpA, tmpB), ya: a.y, yb: b.y })
    sigParts.push(`w${wire.id}@${endpointKey(tmpA, tmpB)}`)
  }

  const obstacles = obstaclesForLayout(layout)
  for (const o of obstacles) {
    sigParts.push(
      `o${o.minX.toFixed(2)},${o.maxX.toFixed(2)},${o.minZ.toFixed(2)},${o.maxZ.toFixed(2)},${o.height}`,
    )
  }
  // instrument boxes + terminal exits fold into the plan signature too: a
  // dragged PSU (comp.pos change) must replan every wire around its new box
  const instruments = instrumentsForLayout(layout)
  for (const inst of instruments) {
    sigParts.push(
      `i${inst.id}@${inst.minX.toFixed(2)},${inst.maxX.toFixed(2)},` +
        `${inst.minZ.toFixed(2)},${inst.maxZ.toFixed(2)}` +
        `#${inst.terminals.map((t) => `${t.x.toFixed(2)},${t.z.toFixed(2)}`).join('|')}`,
    )
  }
  const signature = sigParts.join(';')
  if (signature === planSignature && plannedWorld) return
  planSignature = signature
  planVersionCounter++

  const world = routeAll(items, obstacles, instruments)
  plannedWorld = world

  compRouteCache = new Map()
  for (const id of compIds) {
    const item = world.get(id)
    if (!item || !('bodyCenter' in item)) continue
    const path = item as RoutedComponentPath
    const pose = toRoutedPose(path)
    const sig =
      `${path.style}${waypointHash(path.waypoints)}` +
      `${Math.round(path.bodyCenter.y * 100)},${Math.round(path.bodyDir.y * 100)}`
    compRouteCache.set(id, { pose, sig })
  }

  wireRouteCache = new Map()
  for (const meta of wireMetas) {
    const item = world.get(meta.id)
    if (!item || 'bodyCenter' in item) continue
    wireRouteCache.set(meta.id, {
      route: item as RoutedWire,
      key: meta.key,
      ya: meta.ya,
      yb: meta.yb,
    })
  }
  applyRibbons(layout, resolve, obstacles, instruments)
}

// ---------------------------------------------------------------------------
// Ribbons: wires between a board/module header and another part
// ---------------------------------------------------------------------------

export interface WireBundle {
  key: string
  /** wire ids in ribbon order (left → right across the header) */
  wires: string[]
}

const RIBBON_SKIP: ReadonlySet<string> = new Set(['instrument', 'power'])
/** straight vertical run above a header before the wire bends (plan units: 1 = 2.54 mm) */
export const RIBBON_RISE = 2.4
const RIBBON_PATHS = new WeakSet<readonly RoutePoint[]>()

/**
 * DuPont jumper ends (plan units, 1 = 2.54 mm): a black housing one pitch
 * square, with a collar in the wire's colour at the top where the wire exits.
 * The right end for each header, like real jumper cables:
 *  - a female header (Arduino Uno / Mega top) takes a MALE end: the housing
 *    stands `gap` above the socket and its bare metal pin runs down into it;
 *  - a male pin (ESP32, Pico, module headers) takes a FEMALE end: the housing
 *    slides down over the pin;
 *  - the breadboard end of a cable from a header is a male plug too (a
 *    male-male or female-male jumper); breadboard-to-breadboard wires stay
 *    plain solid-core jumpers with a stripped tip.
 */
export const DUPONT = { w: 0.9, h: 4.2, collar: 0.55, overPin: 2.0, pinDepth: 1.2, gap: 0.8 }
/** how a jumper end is drawn: a male plug into a breadboard hole is 'plug' */
export type WireEndKind = 'socket' | 'pin' | 'side' | 'sideSocket' | 'hole' | 'post' | 'plug'
/** the tube starts this far above a male end's anchor (inside the housing, above the bare pin) */
export function maleTubeStart(kind: WireEndKind): number {
  return kind === 'socket' || kind === 'plug' || kind === 'sideSocket' ? DUPONT.gap + 0.5 : 0
}
/** how far the wire runs straight out of the housing top before it bends */
const EXIT_RUN = 1.3
/** riser height above the anchor for each end kind */
export function dupontRise(kind: WireEndKind): number {
  if (kind === 'socket' || kind === 'plug' || kind === 'sideSocket') return DUPONT.gap + DUPONT.h + EXIT_RUN
  if (kind === 'pin' || kind === 'side') return DUPONT.h - DUPONT.overPin + EXIT_RUN
  return RIBBON_RISE
}

/** the planned path of a wire (tests, tools): waypoints with header ends at y = 0, plus the end heights */
export function plannedWireRoute(id: string): { waypoints: readonly RoutePoint[]; ya: number; yb: number } | null {
  const r = wireRouteCache.get(id)
  return r ? { waypoints: r.route.waypoints, ya: r.ya, yb: r.yb } : null
}

/**
 * Group the wires that leave the same board / module header for the same
 * destination (another module's header, or the breadboard). Instruments keep
 * the router's post-exit paths. Each group is ordered across its header so
 * the ribbon never twists at the source.
 */
export function wireBundles(layout: CircuitLayout): WireBundle[] {
  const resolve = makeEndpointResolver(layout)
  const groups = new Map<string, { id: string; a: { x: number; z: number }; b: { x: number; z: number } }[]>()
  for (const w of layout.wires) {
    let ta = parseTerminalRef(w.from)
    let tb = parseTerminalRef(w.to)
    let from = w.from
    let to = w.to
    if (!ta && !tb) continue
    if (!ta || (tb && tb.componentId < ta.componentId)) {
      ;[ta, tb] = [tb, ta]
      ;[from, to] = [to, from]
    }
    const ca = layout.components.find((c) => c.id === ta!.componentId)
    const cb = tb ? layout.components.find((c) => c.id === tb!.componentId) : undefined
    const ea = ca ? getEntry(ca.type) : undefined
    const eb = cb ? getEntry(cb.type) : undefined
    if (!ea || RIBBON_SKIP.has(ea.category) || (eb && RIBBON_SKIP.has(eb.category))) continue
    const a = resolve(from)
    const b = resolve(to)
    if (!a || !b) continue
    const key = `${ta!.componentId}>${tb ? tb.componentId : 'board'}`
    const g = groups.get(key) ?? []
    g.push({ id: w.id, a, b })
    groups.set(key, g)
  }
  const out: WireBundle[] = []
  for (const [key, g] of groups) {
    const ca = g.reduce((s, x) => ({ x: s.x + x.a.x / g.length, z: s.z + x.a.z / g.length }), { x: 0, z: 0 })
    const cb = g.reduce((s, x) => ({ x: s.x + x.b.x / g.length, z: s.z + x.b.z / g.length }), { x: 0, z: 0 })
    const dx = cb.x - ca.x
    const dz = cb.z - ca.z
    const len = Math.hypot(dx, dz) || 1
    const nx = -dz / len
    const nz = dx / len
    g.sort((p, q) => p.a.x * nx + p.a.z * nz - (q.a.x * nx + q.a.z * nz) || p.b.x * nx + p.b.z * nz - (q.b.x * nx + q.b.z * nz))
    out.push({ key, wires: g.map((x) => x.id) })
  }
  return out
}

function applyRibbons(
  layout: CircuitLayout,
  resolve: (ref: string) => { x: number; y: number; z: number } | null,
  obstacles: RouteObstacle[],
  instruments: InstrumentObstacle[],
): void {
  const boxes: RouteObstacle[] = [...obstacles, ...instruments]
  const byId = new Map(layout.wires.map((w) => [w.id, w]))
  for (const bundle of wireBundles(layout)) {
    const ends = bundle.wires.map((id) => {
      const w = byId.get(id)!
      const ta = parseTerminalRef(w.from)
      const tb = parseTerminalRef(w.to)
      // A = the header end (same normalisation as wireBundles)
      const flip = !ta || (tb !== null && tb.componentId < ta.componentId)
      const a = resolve(flip ? w.to : w.from)!
      const b = resolve(flip ? w.from : w.to)!
      const ra = flip ? w.to : w.from
      const rb = flip ? w.from : w.to
      return { id, a, b, flip, ea: leadDir(layout, ra), eb: leadDir(layout, rb), ...endKinds(layout, ra, rb) }
    })
    const k = ends.length
    const ca = ends.reduce((s, e) => ({ x: s.x + e.a.x / k, y: Math.max(s.y, e.a.y), z: s.z + e.a.z / k }), { x: 0, y: 0, z: 0 })
    const cb = ends.reduce((s, e) => ({ x: s.x + e.b.x / k, y: Math.max(s.y, e.b.y), z: s.z + e.b.z / k }), { x: 0, y: 0, z: 0 })
    const dx = cb.x - ca.x
    const dz = cb.z - ca.z
    const len = Math.hypot(dx, dz)
    const nx = len > 1e-6 ? -dz / len : 1
    const nz = len > 1e-6 ? dx / len : 0
    // ribbon pitch: the header pitch, kept between snug and airy
    const proj = ends.map((e) => e.a.x * nx + e.a.z * nz)
    let pitch = 0.62
    if (k > 1) pitch = Math.min(0.9, Math.max(0.5, Math.abs(proj[k - 1] - proj[0]) / (k - 1)))
    // apex: clear every body under the straight run, then a gentle arch
    let top = Math.max(ca.y, cb.y)
    for (let i = 0; i <= 24; i++) {
      const u = i / 24
      const x = ca.x + dx * u
      const z = ca.z + dz * u
      for (const o of boxes) {
        const m = 0.6 + (pitch * k) / 2
        if (x > o.minX - m && x < o.maxX + m && z > o.minZ - m && z < o.maxZ + m) top = Math.max(top, o.height)
      }
    }
    const apex = top + Math.max(1.4, Math.min(6, 0.16 * len))
    ends.forEach((e, rank) => {
      const off = (rank - (k - 1) / 2) * pitch
      const A = e.a
      const B = e.b
      // a DuPont end goes straight into (or over) the header from above and
      // leaves vertically for ~6 mm before it bends into the ribbon
      // lead-in: vertical above a board header / breadboard hole, level along
      // the pin for a sideways module header (both perpendicular to the header)
      const leadIn = (P: { x: number; y: number; z: number }, d: { x: number; z: number } | null, kind: Parameters<typeof dupontRise>[0]): RoutePoint => {
        const r = dupontRise(kind)
        return d ? { x: P.x + d.x * r, y: P.y, z: P.z + d.z * r } : { x: P.x, y: P.y > 0 || kind === 'plug' ? P.y + r : 1.0, z: P.z }
      }
      const LA = leadIn(A, e.ea, e.ka)
      const LB = leadIn(B, e.eb, e.kb)
      const start = (P: { x: number; z: number }, d: { x: number; z: number } | null, k: WireEndKind): RoutePoint => {
        const t = maleTubeStart(k)
        return d ? { x: P.x + d.x * t, y: 0, z: P.z + d.z * t } : { x: P.x, y: t, z: P.z }
      }
      const pts: RoutePoint[] = [start(A, e.ea, e.ka), LA]
      const N = 9
      const lift = apex - Math.max(LA.y, LB.y) + 0.6
      for (let i = 1; i < N; i++) {
        const u = i / N
        const w = Math.pow(Math.sin(Math.PI * u), 0.7) // 0 at the pins, 1 mid-run: the ribbon lane
        const lx = ca.x + dx * u + nx * off
        const lz = ca.z + dz * u + nz * off
        const px = LA.x + (LB.x - LA.x) * u
        const pz = LA.z + (LB.z - LA.z) * u
        const base = LA.y + (LB.y - LA.y) * u
        pts.push({ x: px + (lx - px) * w, y: base + lift * Math.sin(Math.PI * u), z: pz + (lz - pz) * w })
      }
      pts.push(LB, start(B, e.eb, e.kb))
      if (e.flip) pts.reverse()
      const rec = wireRouteCache.get(e.id)
      RIBBON_PATHS.add(pts)
      if (rec) rec.route = { waypoints: pts, style: 'arc' }
    })
  }
}

/** modules whose cable ends in a FEMALE connector lying on the bench (a male jumper goes in sideways) */
const FEMALE_MODULES: ReadonlySet<string> = new Set(['servo'])

/**
 * How a wire end meets its terminal: a breadboard hole, an instrument post,
 * a female board socket (male DuPont pin pushed in from the top), a male
 * board pin pointing up (female DuPont housing slid over it), or a sideways
 * module pin (housing slid on along `dir`).
 */
export function wireEndStyle(layout: CircuitLayout, ref: string): { kind: 'hole' | 'post' | 'socket' | 'pin' | 'side' | 'sideSocket'; dir?: { x: number; z: number } } {
  const t = parseTerminalRef(ref)
  if (!t) return { kind: 'hole' }
  const c = layout.components.find((x) => x.id === t.componentId)
  const e = c ? getEntry(c.type) : undefined
  if (!c || !e || RIBBON_SKIP.has(e.category)) return { kind: 'post' }
  if (e.category === 'board') return { kind: boardDef(c.type)?.header === 'female' ? 'socket' : 'pin' }
  const d = leadDir(layout, ref)
  return d ? { kind: FEMALE_MODULES.has(c.type) ? 'sideSocket' : 'side', dir: d } : { kind: 'pin' }
}

/**
 * Both ends of a wire: a breadboard hole whose other end is a header becomes a
 * male DuPont plug (the cable is a male-male or female-male jumper).
 */
export function endKinds(layout: CircuitLayout, from: string, to: string): { ka: WireEndKind; kb: WireEndKind } {
  const header = (k: WireEndKind) => k === 'socket' || k === 'pin' || k === 'side' || k === 'sideSocket'
  let ka: WireEndKind = wireEndStyle(layout, from).kind
  let kb: WireEndKind = wireEndStyle(layout, to).kind
  if (ka === 'hole' && header(kb)) ka = 'plug'
  if (kb === 'hole' && header(ka)) kb = 'plug'
  return { ka, kb }
}

/** plan direction a sideways module pin points (null = the wire leaves vertically) */
function leadDir(layout: CircuitLayout, ref: string): { x: number; z: number } | null {
  const t = parseTerminalRef(ref)
  if (!t) return null
  const c = layout.components.find((x) => x.id === t.componentId)
  const e = c ? getEntry(c.type) : undefined
  if (!c || !e || e.category === 'board') return null
  const d = offboardTerminalExit(c.type, e.pins.indexOf(t.pin), c.rotation ?? 0)
  const L = Math.hypot(d.x, d.z)
  return L > 1e-6 ? { x: d.x / L, z: d.z / L } : null
}

/** "Tidy wires": forget the cached plan so the next layout sync re-routes everything */
export function forceReplan(): void {
  planSignature = ''
  plannedWorld = null
}

/**
 * Monotonic plan generation — changes whenever planRoutes() recomputed the
 * routed world. Previews (ghost holograms) fold it into their dedupe
 * signatures so they re-route when the world changes under them.
 */
export function planVersion(): number {
  return planVersionCounter
}

/**
 * Stable signature of a wire's routed path (changes when re-planning moved
 * the wire because of OTHER wires/obstacles). The scene folds this into its
 * wire diff signature so stale tubes rebuild. '' when no route is cached.
 */
export function routedWireSignature(wireId: string, a: THREE.Vector3, b: THREE.Vector3): string {
  const rec = wireRouteCache.get(wireId)
  if (!rec || rec.key !== endpointKey(a, b)) return ''
  return `${rec.route.style}${waypointHash(rec.route.waypoints)}`
}

/**
 * Router-planned pose for an axial leaded component (null when the part is
 * not routed — wrong type, malformed holes, or planRoutes not run yet). The
 * scene passes this straight into buildComponentObject's `routed` parameter.
 */
export function routedComponentPose(componentId: string): RoutedComponent | null {
  return compRouteCache.get(componentId)?.pose ?? null
}

/**
 * Stable signature of a component's routed pose ('' when un-routed). The
 * scene folds this into its component rebuild signature so a part whose body
 * pose moved (because OTHER parts/wires forced a re-route) rebuilds its mesh.
 */
export function routedComponentSignature(componentId: string): string {
  return compRouteCache.get(componentId)?.sig ?? ''
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Exposed tinned tip at board-hole entries: the colored insulation tube STOPS
 * this far above the hole and a bare metal pin (scene-built) continues down
 * into the recessed socket — real jumpers always show ~5mm of stripped wire
 * at the hole. Terminal-post endpoints keep their insulated ends.
 */
export const WIRE_TIP_LEN = 0.42
/** how far the bare pin sinks below the board face, into the socket bore */
export const WIRE_TIP_SINK = 0.18

/** Arc apex height above the endpoints: min 0.8, 0.10× the horizontal run,
 *  capped at 2.2 (mirrors wire-router's board-hugging arc spec). */
export function arcHeight(a: THREE.Vector3, b: THREE.Vector3): number {
  const run = Math.hypot(b.x - a.x, b.z - a.z)
  return Math.min(2.2, Math.max(0.8, run * 0.1))
}

/** Raised quadratic arc between two endpoints (unrouted fallback). */
export function wireCurve(a: THREE.Vector3, b: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const h = arcHeight(a, b)
  // Quadratic bezier apex at t=0.5 is (a + 2c + b) / 4 → lift the control point
  // by 2h so the wire crests ~h above the higher endpoint.
  const ctrl = new THREE.Vector3(
    (a.x + b.x) / 2,
    Math.max(a.y, b.y) + 2 * h,
    (a.z + b.z) / 2,
  )
  return new THREE.QuadraticBezierCurve3(a.clone(), ctrl, b.clone())
}

/**
 * CatmullRom through routed waypoints, ends lifted to terminal posts.
 * Board-hole ends (y = 0) are TRIMMED to WIRE_TIP_LEN: the insulation tube
 * stops above the hole and the scene's bare tip pin carries on into the
 * socket — exactly like a real jumper's stripped end.
 */
function routedCurve(
  waypoints: readonly RoutePoint[],
  ya: number,
  yb: number,
): THREE.CatmullRomCurve3 {
  const pts = waypoints.map((p) => new THREE.Vector3(p.x, p.y, p.z))
  // ribbon paths carry their own perpendicular lead-ins (level for sideways pins)
  const ribbon = RIBBON_PATHS.has(waypoints)
  if (pts.length >= 2) {
    if (ya !== 0) {
      pts[0].y += ya
      if (!ribbon || Math.hypot(pts[1].x - pts[0].x, pts[1].z - pts[0].z) < 0.05) pts[1].y = Math.max(pts[1].y, ya + ENTRY_RISE)
    } else if (pts[0].y === 0) {
      pts[0].y = WIRE_TIP_LEN // stripped tip below the insulation (a male plug keeps its start)
    }
    if (yb !== 0) {
      pts[pts.length - 1].y += yb
      const q = pts[pts.length - 1]
      const r = pts[pts.length - 2]
      if (!ribbon || Math.hypot(r.x - q.x, r.z - q.z) < 0.05) r.y = Math.max(r.y, yb + ENTRY_RISE)
    } else if (pts[pts.length - 1].y === 0) {
      pts[pts.length - 1].y = WIRE_TIP_LEN
    }
  }
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal')
}

function routedTube(
  waypoints: readonly RoutePoint[],
  ya: number,
  yb: number,
  run: number,
  radius: number,
): THREE.TubeGeometry {
  const segments = Math.max(16, Math.min(96, Math.round((run + 6) * 2)))
  return new THREE.TubeGeometry(routedCurve(waypoints, ya, yb), segments, radius, 8, false)
}

/**
 * Tube geometry along the wire's routed path (when `wireId` has a cached
 * route for these endpoints) or the legacy raised arc. Caller owns disposal.
 */
export function wireGeometry(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
  wireId?: string,
): THREE.TubeGeometry {
  const run = Math.hypot(b.x - a.x, b.z - a.z)
  const rec = wireId !== undefined ? wireRouteCache.get(wireId) : undefined
  if (rec && rec.key === endpointKey(a, b)) {
    return routedTube(rec.route.waypoints, rec.ya, rec.yb, run, radius)
  }
  const segments = Math.max(12, Math.min(64, Math.round((run + 4) * 1.5)))
  return new THREE.TubeGeometry(wireCurve(a, b), segments, radius, 8, false)
}

// ---------------------------------------------------------------------------
// Previews (routeOne at the candidate's true commit sort position against the
// cached world — the preview IS the candidate's final path)
// ---------------------------------------------------------------------------

/**
 * Wire-drawing preview geometry: the dragged wire candidate is routed with
 * routeOne() against the planned world at its true commit sort position, so
 * the preview shows the exact collision-aware path the committed wire will
 * take (existing wires may still re-route around it on commit). Falls back to
 * the legacy raised arc when no world is planned yet. Caller owns disposal.
 */
export function previewWireGeometry(
  a: THREE.Vector3,
  b: THREE.Vector3,
  radius: number,
): THREE.TubeGeometry {
  const run = Math.hypot(b.x - a.x, b.z - a.z)
  if (plannedWorld && run > 1e-6) {
    const item = routeOne(plannedWorld, {
      id: ' preview', // placeholder (NUL prefix) — never collides with a user id
      ax: a.x,
      az: a.z,
      bx: b.x,
      bz: b.z,
    })
    if (!('bodyCenter' in item)) {
      return routedTube((item as RoutedWire).waypoints, a.y, b.y, run, radius)
    }
  }
  const segments = Math.max(12, Math.min(64, Math.round((run + 4) * 1.5)))
  return new THREE.TubeGeometry(wireCurve(a, b), segments, radius, 8, false)
}

/**
 * Ghost-placement preview pose for an axial leaded part stretching plan point
 * a → b: routeOne() against the planned world returns the FINAL routed pose
 * (vertical mount for short spans included) — wires are invisible to a
 * component candidate, exactly as in the commit pass where components route
 * before all wires, so the ghost lands in the same pose the committed part
 * will. Null when the type is not routed, the span is degenerate, or no
 * world is planned yet.
 */
export function previewComponentPose(
  type: string,
  a: { x: number; z: number },
  b: { x: number; z: number },
): RoutedComponent | null {
  const body = ROUTED_BODY[type]
  if (!body || !plannedWorld) return null
  if (Math.hypot(b.x - a.x, b.z - a.z) < 1e-6) return null
  const item = routeOne(plannedWorld, {
    id: ' ghost',
    kind: 'component',
    ax: a.x,
    az: a.z,
    bx: b.x,
    bz: b.z,
    body,
  })
  if (!('bodyCenter' in item)) return null
  return toRoutedPose(item as RoutedComponentPath)
}
