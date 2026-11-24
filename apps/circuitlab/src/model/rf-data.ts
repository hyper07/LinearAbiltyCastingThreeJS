/**
 * Circuit Lab: the RF facts the catalog, the link model, the specs and the
 * meshes share — each antenna's gain, pattern, polarization, feed impedance
 * and band, and each radio's frequency, power and sensitivity. Figures are
 * textbook (Balanis, Kraus) or from the parts' datasheets; see specs-rf.ts.
 */
import type { AntennaModel } from '../sim/rf-link'
import { C0 } from '../sim/rf-link'

export type ParamGet = (key: string) => number | string | boolean | undefined
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && Number.isFinite(parseFloat(v)) ? parseFloat(v) : d)

/** velocity factor of a thin wire element (end effect): a resonant λ/2 dipole is ≈ 0.95·λ/2 long */
export const WIRE_VF = 0.95

export interface AntennaDef {
  type: string
  label: string
  /** the model with f0 left to `f0Of` */
  base: Omit<AntennaModel, 'f0' | 'kind' | 'label'>
  /** resonant / centre frequency from the part's settings, Hz */
  f0Of: (p: ParamGet) => number
  /** band it is built for (text) */
  band: string
  polText: string
}

const lengthToF0 = (lengthCm: number, fraction: 2 | 4) => (WIRE_VF * C0) / (fraction * Math.max(lengthCm, 0.5) / 100)
export const f0ToLength = (fHz: number, fraction: 2 | 4) => ((WIRE_VF * C0) / (fraction * fHz)) * 100

export const ANTENNAS: Record<string, AntennaDef> = {
  ant_dipole: {
    type: 'ant_dipole',
    label: 'Half-wave dipole',
    base: { gainDbi: 2.15, pattern: 'halfwave', hpbw: 78, fbDb: 0, pol: 'linear', r: 73, q: 10 },
    f0Of: (p) => lengthToF0(num(p('length'), 32.8), 2),
    band: 'set by its length: f₀ ≈ 0.95·c / (2·L)',
    polText: 'linear, along the arms',
  },
  ant_monopole: {
    type: 'ant_monopole',
    label: 'Quarter-wave monopole / whip',
    base: { gainDbi: 3, pattern: 'halfwave', hpbw: 78, fbDb: 0, pol: 'linear', r: 36.5, q: 10 },
    f0Of: (p) => lengthToF0(num(p('length'), 16.4), 4),
    band: 'set by its length: f₀ ≈ 0.95·c / (4·L)',
    polText: 'linear, along the whip',
  },
  ant_rubber_duck: {
    type: 'ant_rubber_duck',
    label: 'Rubber-duck (SMA)',
    base: { gainDbi: 2, pattern: 'halfwave', hpbw: 80, fbDb: 0, pol: 'linear', r: 50, q: 6 },
    f0Of: (p) => num(p('frequency'), 2440) * 1e6,
    band: '≈ ±8 % around its marked band',
    polText: 'linear, along the whip',
  },
  ant_patch: {
    type: 'ant_patch',
    label: 'Microstrip patch',
    base: { gainDbi: 7, pattern: 'beam', hpbw: 70, fbDb: 18, pol: 'linear', r: 50, q: 30 },
    f0Of: (p) => num(p('frequency'), 2440) * 1e6,
    band: 'narrow: ≈ 2–3 % (VSWR < 2)',
    polText: 'linear, along the fed edge',
  },
  ant_yagi: {
    type: 'ant_yagi',
    label: 'Yagi-Uda',
    base: { gainDbi: 7.5, pattern: 'beam', hpbw: 66, fbDb: 15, pol: 'linear', r: 50, q: 15 },
    f0Of: (p) => num(p('frequency'), 433.92) * 1e6,
    band: '≈ ±5 % around its design frequency',
    polText: 'linear, along the elements',
  },
  ant_helical: {
    type: 'ant_helical',
    label: 'Axial-mode helix',
    base: { gainDbi: 11, pattern: 'beam', hpbw: 40, fbDb: 15, pol: 'rhcp', r: 50, q: 2.5 },
    f0Of: (p) => num(p('frequency'), 2440) * 1e6,
    band: 'wide: ≈ 0.75–1.33 × f₀ (circumference 0.75–1.33 λ)',
    polText: 'right-hand circular (RHCP)',
  },
  ant_loop: {
    type: 'ant_loop',
    label: 'Small tuned loop',
    base: { gainDbi: -8, pattern: 'loop', hpbw: 90, fbDb: 0, pol: 'linear', r: 50, q: 60 },
    f0Of: (p) => num(p('frequency'), 433.92) * 1e6,
    band: 'very narrow: ≈ 1 % (tuned by its capacitor)',
    polText: 'linear, in the plane of the loop',
  },
  ant_horn: {
    type: 'ant_horn',
    label: 'Standard-gain horn',
    base: { gainDbi: 15, pattern: 'beam', hpbw: 30, fbDb: 25, pol: 'linear', r: 50, q: 1.8 },
    f0Of: (p) => num(p('frequency'), 4900) * 1e6,
    band: 'its waveguide band (≈ 3.95–5.85 GHz for WR-187)',
    polText: 'linear, across the narrow wall',
  },
  ant_pcb_ifa: {
    type: 'ant_pcb_ifa',
    label: 'PCB inverted-F',
    base: { gainDbi: 2, pattern: 'quasi_omni', hpbw: 120, fbDb: 0, pol: 'mixed', r: 50, q: 10 },
    f0Of: (p) => num(p('frequency'), 2440) * 1e6,
    band: '≈ ±4 % (2.4 GHz ISM)',
    polText: 'mixed (both — the board radiates too)',
  },
}

/** the full link-model antenna of a part with its settings */
export function antennaModel(type: string, p: ParamGet): AntennaModel | null {
  const d = ANTENNAS[type]
  if (!d) return null
  const base = { ...d.base }
  if (type === 'ant_yagi') {
    const n = Math.max(3, Math.min(12, Math.round(num(p('elements'), 3))))
    base.gainDbi = 7.5 + 10 * Math.log10(n / 3)
    base.hpbw = 66 / Math.sqrt(n / 3)
    base.fbDb = Math.min(22, 15 + (n - 3))
  }
  return { ...base, kind: type, label: d.label, f0: d.f0Of(p) }
}

/** built-in antennas of the radio modules (and the λ/4 wire whips people solder on) */
export const BUILTIN_ANTENNAS = {
  pcb24: { kind: 'pcb_trace', label: 'PCB trace antenna', gainDbi: 0, pattern: 'quasi_omni', hpbw: 120, fbDb: 0, pol: 'mixed', r: 50, q: 8, f0: 2.44e9 } as AntennaModel,
  whip433: { kind: 'wire_whip', label: 'λ/4 wire whip (17.3 cm)', gainDbi: 0, pattern: 'halfwave', hpbw: 78, fbDb: 0, pol: 'linear', r: 40, q: 10, f0: 433.92e6 } as AntennaModel,
  bare433: { kind: 'bare_pad', label: 'no antenna (bare pad)', gainDbi: -25, pattern: 'short_dipole', hpbw: 90, fbDb: 0, pol: 'linear', r: 50, q: 1, f0: 433.92e6 } as AntennaModel,
}

export interface RadioDef {
  type: string
  /** carrier frequency, Hz */
  fHz: (p: ParamGet) => number
  /** occupied / receive bandwidth, Hz */
  bwHz: (p: ParamGet) => number
  /** transmit power at the antenna port, dBm (vcc = its supply now) */
  txDbm: (p: ParamGet, vcc: number) => number
  /** receiver sensitivity, dBm */
  sensDbm: (p: ParamGet) => number
  nfDb: number
  /** supply range it works in, V */
  vccMin: number
  vccMax: number
  /** abs max on VCC, V */
  vccAbs: number
  /** the power pin pair */
  vcc: string
  gnd: string
  /** the antenna it has without anything on its ANT pin */
  builtin: (p: ParamGet) => AntennaModel | null
  /** transmitter / receiver / both */
  role: 'tx' | 'rx' | 'trx'
  /** supply current: [idle, transmitting, receiving] (A) */
  current: [number, number, number]
}

const LORA_SENS: Record<number, number> = { 7: -123, 8: -126, 9: -129, 10: -132, 11: -134.5, 12: -136 }
/** SNR a LoRa demodulator still decodes at (dB), per spreading factor */
export const LORA_SNR: Record<number, number> = { 7: -7.5, 8: -10, 9: -12.5, 10: -15, 11: -17.5, 12: -20 }

export const RADIOS: Record<string, RadioDef> = {
  tx433: {
    type: 'tx433',
    fHz: () => 433.92e6,
    bwHz: () => 200e3,
    // ≈ 10 mW at 12 V, falling with the square of the supply
    txDbm: (_p, vcc) => 10 + 20 * Math.log10(Math.max(vcc, 0.1) / 12),
    sensDbm: () => -200,
    nfDb: 0,
    vccMin: 3,
    vccMax: 12,
    vccAbs: 13,
    vcc: 'VCC',
    gnd: 'GND',
    builtin: (p) => (String(p('antenna') ?? '').startsWith('λ/4') ? BUILTIN_ANTENNAS.whip433 : String(p('antenna') ?? '').startsWith('none') ? BUILTIN_ANTENNAS.bare433 : null),
    role: 'tx',
    current: [0.0005, 0.02, 0],
  },
  rx433: {
    type: 'rx433',
    fHz: () => 433.92e6,
    // a super-regenerative receiver listens over a couple of MHz
    bwHz: () => 2e6,
    txDbm: () => -200,
    sensDbm: () => -105,
    nfDb: 10,
    vccMin: 4.5,
    vccMax: 5.5,
    vccAbs: 6,
    vcc: 'VCC',
    gnd: 'GND',
    builtin: (p) => (String(p('antenna') ?? '').startsWith('λ/4') ? BUILTIN_ANTENNAS.whip433 : String(p('antenna') ?? '').startsWith('none') ? BUILTIN_ANTENNAS.bare433 : null),
    role: 'rx',
    current: [0.004, 0, 0.004],
  },
  hc05: {
    type: 'hc05',
    fHz: () => 2.441e9,
    bwHz: () => 1e6,
    txDbm: () => 4,
    sensDbm: () => -80,
    nfDb: 10,
    vccMin: 3.6,
    vccMax: 6,
    vccAbs: 6.5,
    vcc: 'VCC',
    gnd: 'GND',
    builtin: () => BUILTIN_ANTENNAS.pcb24,
    role: 'trx',
    current: [0.008, 0.04, 0.04],
  },
  nrf24l01: {
    type: 'nrf24l01',
    fHz: (p) => (2400 + Math.max(0, Math.min(125, Math.round(num(p('channel'), 76))))) * 1e6,
    bwHz: (p) => (String(p('dataRate')) === '2 Mbps' ? 2e6 : 1e6),
    txDbm: (p) => num(p('power'), 0),
    sensDbm: (p) => ({ '250 kbps': -94, '1 Mbps': -85, '2 Mbps': -82 })[String(p('dataRate') ?? '1 Mbps')] ?? -85,
    nfDb: 10,
    vccMin: 1.9,
    vccMax: 3.6,
    vccAbs: 3.6,
    vcc: 'VCC',
    gnd: 'GND',
    builtin: () => BUILTIN_ANTENNAS.pcb24,
    role: 'trx',
    current: [0.000026, 0.0113, 0.0135],
  },
  rfm95: {
    type: 'rfm95',
    fHz: (p) => (String(p('band')) === '868 MHz' ? 868.1e6 : 915e6),
    bwHz: () => 125e3,
    txDbm: (p) => Math.max(2, Math.min(20, num(p('power'), 17))),
    sensDbm: (p) => LORA_SENS[Math.max(7, Math.min(12, Math.round(num(p('sf'), 7))))] ?? -123,
    nfDb: 6,
    vccMin: 1.8,
    vccMax: 3.7,
    vccAbs: 3.9,
    vcc: '3.3V',
    gnd: 'GND',
    builtin: (p) => {
      if (!String(p('antenna') ?? '').startsWith('λ/4')) return null
      const f = String(p('band')) === '868 MHz' ? 868.1e6 : 915e6
      return { ...BUILTIN_ANTENNAS.whip433, label: `λ/4 wire whip (${f0ToLength(f, 4).toFixed(1)} cm)`, f0: f }
    },
    role: 'trx',
    current: [0.0016, 0.087, 0.0115],
  },
}

/** USRP B210 receive/transmit facts used by the device and the views */
export const B210 = {
  fMin: 70e6,
  fMax: 6e9,
  bwMaxSiso: 56e6,
  bwMaxMimo: 30.72e6,
  nfDb: 8,
  /** UHD: never apply more than −15 dBm to an RF input */
  rxMaxDbm: -15,
  /** the level treated as damaging here (0 dBm peak, AD9361 abs max +2.5 dBm) */
  rxDamageDbm: 0,
  txMaxDbm: 10,
  /** TX power: up to ≈ +10 dBm at full gain (89.75 dB) */
  txDbm: (gain: number) => Math.min(10, gain - 79.75),
}

/** the spectrum analyzer's RF facts (DSA800-class) */
export const SA = {
  fMin: 9e3,
  fMax: 3.2e9,
  /** displayed average noise level at 100 Hz RBW, preamp on (dBm) */
  danl100: -135,
  maxDbm: 20,
  damageDbm: 30,
  maxDc: 50,
}

/** the RF power sensor's facts (diode sensor, 1 MHz – 6 GHz) */
export const PWR_SENSOR = { fMin: 1e6, fMax: 6e9, minDbm: -30, maxDbm: 20, safeDbm: 23, absDbm: 27 }
