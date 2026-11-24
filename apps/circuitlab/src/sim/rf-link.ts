/**
 * Circuit Lab: the RF link-budget model. This is NOT a full-wave EM solver —
 * it is the engineer's link budget, done honestly:
 *
 *   P_rx = P_tx − mismatch_tx + G_tx(direction) − path loss + G_rx(direction)
 *          − mismatch_rx + polarization loss − extra loss
 *
 *  - path loss: Friis free space, FSPL = 20·log10(4π·d·f / c), or the
 *    log-distance model FSPL(1 m) + 10·n·log10(d) for an environment with
 *    a path-loss exponent n (2 = free space, ≈ 2.7 outdoors near the
 *    ground, ≈ 3.3 indoors). Below the far-field distance (≈ λ/2π) Friis
 *    does not hold; the distance is clamped there and the link is flagged.
 *  - antenna gain toward the other antenna from a pattern: the exact
 *    half-wave dipole pattern, sin²θ for short dipoles / monopoles / small
 *    loops, a parabolic main beam (−12·(ψ/HPBW)² dB) with a back-lobe
 *    floor for directional antennas (patch, Yagi, helix, horn).
 *  - polarization loss factor |ê_t·ê_r|² from each antenna's E-field
 *    direction seen along the line of sight (linear: cos² of the angle;
 *    circular vs linear: −3 dB; opposite circular: the cross-pol floor).
 *  - feed mismatch from the antenna's input impedance (a series RLC around
 *    its resonance): Γ = (Z − 50)/(Z + 50), loss = −10·log10(1 − |Γ|²).
 *  - receiver noise floor kT·B·F: −174 dBm/Hz + 10·log10(B) + NF → SNR.
 * Multipath, ground reflections, near-field coupling and body effects are
 * not modelled.
 */

export const C0 = 299_792_458
/** thermal noise density at 290 K, dBm/Hz */
export const KT_DBM_HZ = -174
/** best polarization isolation a real pair of antennas gives (dB) */
export const XPOL_FLOOR_DB = -25

export type Vec3 = [number, number, number]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
const unit = (a: Vec3): Vec3 => {
  const l = len(a)
  return l > 1e-12 ? scale(a, 1 / l) : [0, 0, 0]
}

export type PatternKind = 'halfwave' | 'short_dipole' | 'loop' | 'beam' | 'quasi_omni'
export type Polarization = 'linear' | 'rhcp' | 'lhcp' | 'mixed'

/** what the link model needs to know about one antenna */
export interface AntennaModel {
  kind: string
  label: string
  /** peak gain (dBi), efficiency included */
  gainDbi: number
  pattern: PatternKind
  /** half-power beamwidth of the main beam (beam patterns), degrees */
  hpbw: number
  /** front-to-back / side-lobe floor below the peak (beam patterns), dB */
  fbDb: number
  pol: Polarization
  /** resonant (centre) frequency, Hz */
  f0: number
  /** feed resistance at resonance, Ω */
  r: number
  /** feed Q (series RLC): bandwidth (VSWR < 2 into a matched line) ≈ 0.7·f0/Q */
  q: number
}

/** where an antenna is and which way it points (metres; y up) */
export interface Pose {
  pos: Vec3
  /** boresight (beam antennas) / the front of the part (unit vector) */
  fwd: Vec3
  /** element axis (dipoles, whips) or E-field direction at boresight (beams) */
  axis: Vec3
}

/** a pose on the bench: yaw from a quarter-turn rotation, tilt of the element about the front axis */
export function benchPose(posM: Vec3, rotationDeg: number, tiltDeg: number): Pose {
  // rotation turns CLOCKWISE in plan view (+x → +z at 90°), like turnOffset()
  const a = (rotationDeg * Math.PI) / 180
  const fwd: Vec3 = [Math.cos(a), 0, Math.sin(a)]
  const t = (tiltDeg * Math.PI) / 180
  const side = cross(fwd, [0, 1, 0]) // horizontal, perpendicular to fwd
  const axis = unit([side[0] * -Math.sin(t), Math.cos(t), side[2] * -Math.sin(t)])
  return { pos: posM, fwd, axis }
}

/** free-space path loss, dB (Friis) */
export function fsplDb(dM: number, fHz: number): number {
  return 20 * Math.log10((4 * Math.PI * Math.max(dM, 1e-6) * fHz) / C0)
}

/** path-loss exponents of the environments the lab offers */
export const ENVIRONMENTS: Record<string, number> = {
  'free space (n = 2)': 2,
  'outdoors, near ground (n ≈ 2.7)': 2.7,
  'indoors, through walls (n ≈ 3.3)': 3.3,
}

/** log-distance path loss: Friis to 1 m, then 10·n·log10(d) */
export function pathLossDb(dM: number, fHz: number, n = 2): number {
  if (n === 2 || dM <= 1) return fsplDb(dM, fHz)
  return fsplDb(1, fHz) + 10 * n * Math.log10(dM)
}

/** the far-field boundary used to clamp Friis (the reactive near field ends ≈ λ/2π) */
export function farFieldM(fHz: number): number {
  return C0 / fHz / (2 * Math.PI)
}

/** the antenna's input impedance at f: a series RLC through its resonance */
export function antennaZ(m: AntennaModel, fHz: number): [number, number] {
  const u = fHz / m.f0 - m.f0 / fHz
  return [m.r, m.q * m.r * u]
}

export interface Mismatch {
  gamma: number
  vswr: number
  /** return loss, dB (positive) */
  rlDb: number
  /** mismatch loss, dB (positive) */
  mlDb: number
}

export function mismatch(z: [number, number], z0 = 50): Mismatch {
  const [r, x] = z
  const nr = r - z0
  const dr = r + z0
  const g = Math.sqrt((nr * nr + x * x) / (dr * dr + x * x))
  const gc = Math.min(g, 0.999999)
  return { gamma: g, vswr: (1 + gc) / (1 - gc), rlDb: -20 * Math.log10(Math.max(g, 1e-9)), mlDb: -10 * Math.log10(1 - gc * gc) }
}

/** linear power gain (relative to isotropic) toward the unit direction `dir` */
export function gainToward(m: AntennaModel, p: Pose, dir: Vec3): number {
  const g = 10 ** (m.gainDbi / 10)
  switch (m.pattern) {
    case 'halfwave': {
      const c = Math.max(-1, Math.min(1, dot(p.axis, dir)))
      const s = Math.sqrt(Math.max(1e-12, 1 - c * c))
      const f = Math.cos((Math.PI / 2) * c) / s
      return g * f * f
    }
    case 'short_dipole': {
      const c = dot(p.axis, dir)
      return g * Math.max(0, 1 - c * c)
    }
    case 'loop': {
      // a small loop is a magnetic dipole along its normal (fwd × axis)
      const n = unit(cross(p.fwd, p.axis))
      const c = dot(n, dir)
      return g * Math.max(0, 1 - c * c)
    }
    case 'quasi_omni':
      // PCB antennas: within a few dB of omni, a shallow dip along the element
      return g * (0.55 + 0.45 * Math.max(0, 1 - dot(p.axis, dir) ** 2))
    case 'beam': {
      const psi = (Math.acos(Math.max(-1, Math.min(1, dot(p.fwd, dir)))) * 180) / Math.PI
      const db = Math.max(-12 * (psi / m.hpbw) ** 2, -m.fbDb)
      return g * 10 ** (db / 10)
    }
  }
}

/** E-field direction (unit, ⟂ dir) a linear antenna radiates toward dir; null when it has no field there */
export function eField(m: AntennaModel, p: Pose, dir: Vec3): Vec3 | null {
  let e: Vec3
  if (m.pattern === 'loop') e = cross(unit(cross(p.fwd, p.axis)), dir)
  else e = sub(p.axis, scale(dir, dot(p.axis, dir)))
  return len(e) < 1e-6 ? null : unit(e)
}

/** polarization loss factor (linear, ≤ 1) between a transmit and a receive antenna on the line tx→rx */
export function polarizationFactor(mt: AntennaModel, pt: Pose, mr: AntennaModel, pr: Pose, dir: Vec3): number {
  const floor = 10 ** (XPOL_FLOOR_DB / 10)
  const circ = (q: Polarization) => q === 'rhcp' || q === 'lhcp'
  if (mt.pol === 'mixed' || mr.pol === 'mixed') return 0.5
  if (circ(mt.pol) && circ(mr.pol)) return mt.pol === mr.pol ? 1 : floor
  if (circ(mt.pol) || circ(mr.pol)) return 0.5
  const et = eField(mt, pt, dir)
  const er = eField(mr, pr, scale(dir, -1))
  if (!et || !er) return floor
  return Math.max(floor, dot(et, er) ** 2)
}

export interface LinkEnds {
  tx: { model: AntennaModel; pose: Pose }
  rx: { model: AntennaModel; pose: Pose }
}

export interface LinkResult {
  fHz: number
  /** distance used (m) and whether it was the bench geometry or an override */
  distanceM: number
  fromBench: boolean
  nearField: boolean
  pathLossDb: number
  gtDbi: number
  grDbi: number
  polDb: number
  mmTxDb: number
  mmRxDb: number
  extraDb: number
  /** everything between the transmitter's port and the receiver's port, dB (negative = loss) */
  couplingDb: number
}

/**
 * The port-to-port coupling between two antennas at f. `distanceM` > 0
 * replaces the bench distance (the direction stays the bench direction).
 */
export function linkCoupling(ends: LinkEnds, fHz: number, opts: { distanceM?: number; n?: number; extraDb?: number } = {}): LinkResult {
  const { tx, rx } = ends
  const d0 = sub(rx.pose.pos, tx.pose.pos)
  const benchD = len(d0)
  const dir: Vec3 = benchD > 1e-9 ? unit(d0) : [1, 0, 0]
  const override = (opts.distanceM ?? 0) > 0
  let d = override ? opts.distanceM! : benchD
  const ff = farFieldM(fHz)
  const nearField = d < ff
  d = Math.max(d, ff)
  const pl = pathLossDb(d, fHz, opts.n ?? 2)
  const gt = gainToward(tx.model, tx.pose, dir)
  const gr = gainToward(rx.model, rx.pose, scale(dir, -1))
  const plf = polarizationFactor(tx.model, tx.pose, rx.model, rx.pose, dir)
  const mmT = mismatch(antennaZ(tx.model, fHz)).mlDb
  const mmR = mismatch(antennaZ(rx.model, fHz)).mlDb
  const db = (x: number) => 10 * Math.log10(Math.max(x, 1e-30))
  const extra = opts.extraDb ?? 0
  const couplingDb = -mmT + db(gt) - pl + db(gr) - mmR + db(plf) - extra
  return { fHz, distanceM: d, fromBench: !override, nearField, pathLossDb: pl, gtDbi: db(gt), grDbi: db(gr), polDb: db(plf), mmTxDb: mmT, mmRxDb: mmR, extraDb: extra, couplingDb }
}

/** receiver noise floor in a bandwidth, dBm */
export function noiseFloorDbm(bwHz: number, nfDb: number): number {
  return KT_DBM_HZ + 10 * Math.log10(Math.max(bwHz, 1)) + nfDb
}

export const dbmToW = (dbm: number) => 10 ** ((dbm - 30) / 10)
export const wToDbm = (w: number) => 10 * Math.log10(Math.max(w, 1e-30)) + 30
