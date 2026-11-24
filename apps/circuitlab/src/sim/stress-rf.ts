/**
 * Over-limit checks for the measurement, filter and wireless parts — the
 * same StressReading as stress.ts (ratio 1 = at the limit on its Specs page):
 * RF input power into an SDR / analyzer / power sensor / VNA, supply voltage
 * on the radio modules (5 V on an nRF24L01+ is the classic), filter inductor
 * saturation and capacitor voltage, bead and choke current.
 * Returns undefined for parts this file does not cover.
 */
import type { ComponentInstance, ComponentTelemetry } from '../model/types'
import { paramOf, type CatalogEntry } from '../model/catalog'
import { B210, PWR_SENSOR, RADIOS, SA } from '../model/rf-data'
import type { StressReading } from './stress'

const fmtV = (v: number) => `${Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)} V`
const fmtA = (a: number) => (Math.abs(a) >= 1 ? `${Math.abs(a).toFixed(2)} A` : `${Math.round(Math.abs(a) * 1000)} mA`)
const dbm = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)} dBm`
const ex = (t: ComponentTelemetry, k: string) => {
  const v = t.extra?.[k]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
const v = (t: ComponentTelemetry, pin: string) => t.pinVoltages[pin] ?? 0
/** power ratio of a level against a limit, both in dBm */
const pr = (level: number, limit: number) => 10 ** ((level - limit) / 10)

export function rfStressOf(comp: ComponentInstance, entry: CatalogEntry, t: ComponentTelemetry): StressReading | null | undefined {
  const id = comp.id
  const type = comp.type
  const radio = RADIOS[type]
  if (radio) {
    const vcc = v(t, radio.vcc) - v(t, radio.gnd)
    if (vcc <= 0) return null
    const name = entry.label.split(' (')[0]
    const fix =
      type === 'nrf24l01' || type === 'rfm95'
        ? `Power ${id} from the 3.3 V pin (not 5 V); its data pins can stay on 5 V logic${type === 'rfm95' ? ' only through a level shifter' : ''}.`
        : `Feed ${id} ${radio.vccMin}–${radio.vccMax} V.`
    // inside its working range it is fine; between the working max and the abs max it runs hot
    const ratio = vcc <= radio.vccMax ? Math.min(0.75, vcc / radio.vccAbs) : radio.vccAbs > radio.vccMax ? 0.8 + (0.2 * (vcc - radio.vccMax)) / (radio.vccAbs - radio.vccMax) : vcc / radio.vccAbs
    return { ratio, reason: `${fmtV(vcc)} on ${id}'s ${radio.vcc} — the ${name} takes at most ${radio.vccAbs} V.`, fix }
  }
  switch (type) {
    case 'usrp_b210': {
      const p = ex(t, 'rxMaxDbm')
      if (p === null) return null
      return {
        ratio: pr(p, B210.rxDamageDbm),
        reason: `${dbm(p)} is reaching ${id}'s RF input — it takes at most ${B210.rxMaxDbm} dBm (0 dBm can destroy the receiver).`,
        fix: 'Put a 30 dB (or bigger) attenuator in the cable, move the antennas apart, or turn the transmitter down. Never cable TX straight into RX.',
      }
    }
    case 'spectrum_analyzer': {
      const p = ex(t, 'inputDbm')
      const vdc = Math.abs(ex(t, 'vdc') ?? 0)
      const rp = p === null ? 0 : pr(p, SA.damageDbm)
      const rv = vdc / SA.maxDc
      if (rv > rp) return { ratio: rv, reason: `${fmtV(vdc)} DC on ${id}'s input — it takes at most ${SA.maxDc} V.`, fix: 'Use a DC block (a series capacitor) or AC coupling in front of the analyzer.' }
      if (p === null) return null
      return { ratio: rp, reason: `${dbm(p)} into ${id} — it is rated +${SA.maxDbm} dBm continuous (+${SA.damageDbm} dBm damages it).`, fix: 'Add an attenuator in front of the analyzer (and set its value as a reference offset).' }
    }
    case 'rf_power_meter': {
      const p = ex(t, 'sensorDbm')
      if (p === null) return null
      return { ratio: pr(p, PWR_SENSOR.safeDbm), reason: `${dbm(p)} on ${id}'s sensor — it is rated +${PWR_SENSOR.safeDbm} dBm.`, fix: 'Put an attenuator in front of the sensor and enter its value as the offset.' }
    }
    case 'vna': {
      const p = ex(t, 'inputDbm')
      if (p === null) return null
      return { ratio: pr(p, 10), reason: `${dbm(p)} on ${id}'s ports — a VNA takes at most +10 dBm.`, fix: 'Never connect a VNA to a powered circuit or a transmitter; measure with the power off.' }
    }
    case 'freq_counter': {
      const vin = Math.abs(v(t, 'IN') - v(t, 'GND'))
      return { ratio: vin / 350, reason: `${fmtV(vin)} on ${id}'s input — it is rated 350 V peak.`, fix: 'Use a ×10 probe or a divider.' }
    }
    case 'ferrite_bead':
    case 'cm_choke': {
      const i = Math.abs(t.current ?? 0)
      const rated = Number(paramOf(comp.params, entry, 'rated') ?? 1)
      return { ratio: i / rated, reason: `${fmtA(i)} through ${id} — it is rated ${rated} A (past that its core saturates and heats).`, fix: `Use a bead or choke rated for more current, or draw less.` }
    }
    case 'pi_filter':
    case 'lc_lowpass': {
      const i = Math.abs(ex(t, 'iL') ?? t.current ?? 0)
      const isat = Number(paramOf(comp.params, entry, 'isat') ?? 1)
      const vr = Number(paramOf(comp.params, entry, 'vrated') ?? 25)
      const vc = Math.max(Math.abs(ex(t, 'vc1') ?? 0), Math.abs(ex(t, 'vc2') ?? 0))
      const ri = i / isat
      const rv = vc / vr
      return ri >= rv
        ? { ratio: ri, reason: `${fmtA(i)} through ${id}'s inductor — it saturates at ${isat} A.`, fix: 'Use a filter with a bigger inductor current rating (or a lower load current).' }
        : { ratio: rv, reason: `${fmtV(vc)} across ${id}'s capacitors — they are rated ${vr} V.`, fix: 'Use capacitors with a higher voltage rating (≥ 1.5 × the supply).' }
    }
  }
  return undefined
}
