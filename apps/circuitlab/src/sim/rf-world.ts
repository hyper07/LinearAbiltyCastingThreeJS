/**
 * Circuit Lab: the radio side of the bench. Every antenna, transmitter and
 * receiver on the layout becomes an entity here, placed where its part sits
 * on the bench (its `pos` and quarter-turn `rotation`) with its antenna's
 * tilt. Antennas belong to the RF net their feed is wired to — an SMA cable
 * (a wire) from a radio's ANT pin or an SDR port to an antenna's RF pin —
 * and radio modules with a built-in antenna carry their own.
 *
 * A receiver hears an emitter either CONDUCTED (both on the same RF net: a
 * cable, no path loss) or RADIATED through the best antenna pair (the link
 * budget in rf-link.ts). The world is built from the layout alone, so the
 * panels can show a link budget without running; the running engine shares
 * one world between its radio devices, which switch their carriers on and
 * off (433 MHz ASK data, a test carrier) and read what arrives.
 */
import type { CircuitLayout, ComponentInstance, ParamValue } from '../model/types'
import { getEntry, paramOf } from '../model/catalog'
import { offboardBodyPosition, offboardGeometry, turnOffset } from '../model/breadboard'
import { ANTENNAS, B210, RADIOS, antennaModel, type ParamGet } from '../model/rf-data'
import { buildNetlist } from './netlist'
import { ENVIRONMENTS, benchPose, linkCoupling, noiseFloorDbm, type AntennaModel, type LinkResult, type Pose } from './rf-link'

/** one plan unit (a 0.1" hole pitch) in metres */
export const UNIT_M = 0.00254

export interface RfAntenna {
  key: string
  compId: string
  net: string
  model: AntennaModel
  pose: Pose
  /** link-distance override (m, 0 = bench) and path-loss exponent from this end's settings */
  distanceM: number
  n: number
}
export interface RfEmitter {
  key: string
  compId: string
  port: string
  net: string
  fHz: number
  bwHz: number
  dbm: number
  /** carrier on now (runtime; the static view assumes on) */
  on: boolean
  /** data bit it carries now (HC-05 UART bridge) */
  data: boolean
}
export interface RfReceiver {
  key: string
  compId: string
  port: string
  net: string
  fHz: number
  bwHz: number
  nfDb: number
  sensDbm: number
  /** what it is (for the views) */
  what: string
}
export interface Coupling {
  db: number
  conducted: boolean
  link: LinkResult | null
  txAnt: string | null
  rxAnt: string | null
}
export interface Incoming {
  from: RfEmitter
  dbm: number
  coupling: Coupling
}

const RF_TYPES = new Set([...Object.keys(ANTENNAS), ...Object.keys(RADIOS), 'usrp_b210', 'spectrum_analyzer', 'rf_power_meter'])

/** is this part part of the radio world (antenna, radio, SDR, RF receiver)? */
export function isRfType(type: string): boolean {
  return RF_TYPES.has(type)
}

/** the plan centre of an off-board part, in plan units */
export function planCenterOf(comp: ComponentInstance, slot: number): { x: number; z: number } {
  const a = offboardBodyPosition(slot, comp.pos, comp.type)
  const geo = offboardGeometry(comp.type)
  const r = geo ? geo.rect : { x0: 0, x1: 6.5, z0: -2, z1: 2.5 }
  const c = turnOffset((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, comp.rotation ?? 0)
  return { x: a.x + c.x, z: a.z + c.z }
}

const n = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)

export class RfWorld {
  antennas: RfAntenna[] = []
  emitters: RfEmitter[] = []
  receivers: RfReceiver[] = []
  private cache = new Map<string, Coupling | null>()
  private overrides = new Map<string, Record<string, ParamValue>>()
  private netOf: (ref: string) => string | null
  /** supply volts per radio (runtime; the static view assumes nominal) */
  vcc = new Map<string, number>()

  constructor(readonly layout: CircuitLayout) {
    const nl = buildNetlist(layout)
    this.netOf = (ref) => nl.netOf(ref)
    this.rebuild()
  }

  /** a runtime setting changed (tilt, distance, power, channel…): rebuild the entities */
  setParam(compId: string, key: string, value: ParamValue): void {
    const o = this.overrides.get(compId) ?? {}
    o[key] = value
    this.overrides.set(compId, o)
    const keep = new Map(this.emitters.map((e) => [e.key, { on: e.on, data: e.data }]))
    this.rebuild()
    for (const e of this.emitters) {
      const k = keep.get(e.key)
      if (k) {
        e.on = k.on
        e.data = k.data
      }
    }
  }

  private rebuild(): void {
    this.cache.clear()
    this.antennas = []
    this.emitters = []
    this.receivers = []
    let slot = 0
    for (const comp of this.layout.components ?? []) {
      const entry = comp && typeof comp.type === 'string' ? getEntry(comp.type) : undefined
      if (!entry) continue
      const mySlot = entry.placement === 'offboard' ? slot++ : -1
      if (!RF_TYPES.has(comp.type) || mySlot < 0) continue
      const o = this.overrides.get(comp.id)
      const p: ParamGet = (k) => (o && k in o ? o[k] : paramOf(comp.params, entry, k)) as number | string | boolean | undefined
      const c = planCenterOf(comp, mySlot)
      const pose = benchPose([c.x * UNIT_M, 0.03, c.z * UNIT_M], comp.rotation ?? 0, n(p('tilt'), 0))
      const distanceM = Math.max(0, n(p('distance'), 0))
      const env = ENVIRONMENTS[String(p('environment') ?? '')] ?? 2
      const net = (pin: string) => this.netOf(`${comp.id}:${pin}`) ?? `${comp.id}:${pin}`
      const am = antennaModel(comp.type, p)
      if (am) {
        this.antennas.push({ key: comp.id, compId: comp.id, net: net('RF'), model: am, pose, distanceM, n: env })
        continue
      }
      const radio = RADIOS[comp.type]
      if (radio) {
        const built = radio.builtin(p)
        const rfNet = built ? `${comp.id}#rf` : net('ANT')
        if (built) this.antennas.push({ key: `${comp.id}#ant`, compId: comp.id, net: rfNet, model: built, pose, distanceM, n: env })
        const vcc = this.vcc.get(comp.id) ?? (radio.vccMin + radio.vccMax) / 2
        const mode = String(p('mode') ?? '')
        const f = radio.fHz(p)
        if (radio.role === 'tx' || (radio.role === 'trx' && (comp.type === 'hc05' || mode.startsWith('transmit'))))
          this.emitters.push({ key: `${comp.id}:tx`, compId: comp.id, port: 'ANT', net: rfNet, fHz: f, bwHz: radio.bwHz(p), dbm: radio.txDbm(p, vcc), on: true, data: true })
        if (radio.role === 'rx' || (radio.role === 'trx' && (comp.type === 'hc05' || mode.startsWith('receive'))))
          this.receivers.push({ key: `${comp.id}:rx`, compId: comp.id, port: 'ANT', net: rfNet, fHz: f, bwHz: radio.bwHz(p), nfDb: radio.nfDb, sensDbm: radio.sensDbm(p), what: entry.label })
        continue
      }
      if (comp.type === 'usrp_b210') {
        const fc = n(p('frequency'), 433.92) * 1e6
        const bw = Math.min(n(p('bandwidth'), 10), 56) * 1e6
        if (p('txOn'))
          this.emitters.push({ key: `${comp.id}:txa`, compId: comp.id, port: 'TX/RX A', net: net('TX/RX A'), fHz: fc + n(p('toneOffset'), 100) * 1e3, bwHz: 10e3, dbm: B210.txDbm(n(p('txGain'), 70)), on: true, data: true })
        for (const port of ['RX2 A', 'RX2 B'])
          this.receivers.push({ key: `${comp.id}:${port}`, compId: comp.id, port, net: net(port), fHz: fc, bwHz: bw, nfDb: B210.nfDb, sensDbm: noiseFloorDbm(bw, B210.nfDb), what: `B210 ${port}` })
      } else if (comp.type === 'spectrum_analyzer') {
        this.receivers.push({ key: `${comp.id}:IN`, compId: comp.id, port: 'IN', net: net('IN'), fHz: 1.6e9, bwHz: 3.2e9, nfDb: 19, sensDbm: -135, what: 'spectrum analyzer' })
      } else if (comp.type === 'rf_power_meter') {
        this.receivers.push({ key: `${comp.id}:RF`, compId: comp.id, port: 'RF', net: net('RF'), fHz: 3e9, bwHz: 6e9, nfDb: 30, sensDbm: -30, what: 'power sensor' })
      }
    }
  }

  /** the port-to-port coupling from an emitter to a receiver (null: no path) */
  coupling(e: RfEmitter, r: RfReceiver): Coupling | null {
    const key = `${e.key}|${r.key}|${e.fHz}`
    if (this.cache.has(key)) return this.cache.get(key)!
    let best: Coupling | null = null
    // a radio module does not hear its own carrier
    if (e.compId === r.compId && RADIOS[this.typeOf(e.compId)]) {
      this.cache.set(key, null)
      return null
    }
    if (e.net === r.net) best = { db: 0, conducted: true, link: null, txAnt: null, rxAnt: null }
    else {
      for (const at of this.antennas) {
        if (at.net !== e.net) continue
        for (const ar of this.antennas) {
          if (ar.net !== r.net || ar === at) continue
          const link = linkCoupling({ tx: at, rx: ar }, e.fHz, { distanceM: Math.max(at.distanceM, ar.distanceM), n: Math.max(at.n, ar.n) })
          if (!best || link.couplingDb > best.db) best = { db: link.couplingDb, conducted: false, link, txAnt: at.key, rxAnt: ar.key }
        }
      }
    }
    this.cache.set(key, best)
    return best
  }

  private typeOf(id: string): string {
    return this.layout.components.find((c) => c.id === id)?.type ?? ''
  }

  /** every carrier arriving at a receiver between fLo and fHi (on emitters only unless `all`) */
  incoming(r: RfReceiver, fLo = r.fHz - r.bwHz / 2, fHi = r.fHz + r.bwHz / 2, all = false): Incoming[] {
    const out: Incoming[] = []
    for (const e of this.emitters) {
      if (!all && !e.on) continue
      if (e.fHz + e.bwHz / 2 < fLo || e.fHz - e.bwHz / 2 > fHi) continue
      const c = this.coupling(e, r)
      if (!c) continue
      out.push({ from: e, dbm: e.dbm + c.db, coupling: c })
    }
    return out.sort((a, b) => b.dbm - a.dbm)
  }

  /** total power arriving in a receiver's own band (dBm, −Infinity when nothing) */
  inBandDbm(r: RfReceiver, all = false): number {
    let w = 0
    for (const i of this.incoming(r, undefined, undefined, all)) w += 10 ** (i.dbm / 10)
    return w > 0 ? 10 * Math.log10(w) : -Infinity
  }

  receiver(key: string): RfReceiver | undefined {
    return this.receivers.find((r) => r.key === key)
  }
  emitter(key: string): RfEmitter | undefined {
    return this.emitters.find((e) => e.key === key)
  }
}

export interface LinkRow {
  rx: RfReceiver
  best: Incoming | null
  noiseDbm: number
  snrDb: number | null
  marginDb: number | null
}

/** the link budget of every receiver on the layout, transmitters assumed on (for the RF link panel) */
export function linkTable(layout: CircuitLayout, world = new RfWorld(layout)): LinkRow[] {
  return world.receivers.map((rx) => {
    const inc = world.incoming(rx, undefined, undefined, true)
    const best = inc[0] ?? null
    const noiseDbm = noiseFloorDbm(rx.what === 'spectrum analyzer' ? 100 : rx.bwHz, rx.nfDb)
    return { rx, best, noiseDbm, snrDb: best ? best.dbm - noiseDbm : null, marginDb: best ? best.dbm - rx.sensDbm : null }
  })
}
