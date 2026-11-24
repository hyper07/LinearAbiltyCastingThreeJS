/**
 * Over-limit damage for every part. Each frame the solved voltages and
 * currents are checked against the part's ratings (the numbers on its Specs
 * page): how far over the limit it runs (`ratio`), why, and what to change.
 * Running over the limit heats the part up; when the heat reaches 1 it burns
 * out — it smokes, looks scorched and stops working (open circuit) until the
 * student replaces it or resets. Parts that latch their own failure (an LED's
 * burn-out, a board's dead regulator, a meter's blown fuse) are read too, so
 * the Diagnose panel lists every broken part in one place.
 */
import type { CircuitLayout, ComponentInstance, ComponentTelemetry } from '../model/types'
import { getEntry, paramOf, type CatalogEntry } from '../model/catalog'
import { boardDef } from '../model/boards'

export interface StressReading {
  /** worst value / its limit (1 = right at the limit) */
  ratio: number
  /** what is over, with the numbers */
  reason: string
  /** what to change */
  fix: string
}

export interface Breakdown {
  id: string
  label: string
  reason: string
  fix: string
  /** sim time it failed (s) */
  at: number
  /** 'burned' parts are out of the circuit until replaced; 'pin' = one board pin damaged */
  kind: 'burned' | 'pin'
}

const fmtV = (v: number) => `${Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)} V`
const fmtA = (a: number) => (Math.abs(a) >= 1 ? `${a.toFixed(2)} A` : `${Math.round(Math.abs(a) * 1000)} mA`)
const fmtW = (w: number) => (w >= 1 ? `${w.toFixed(2)} W` : `${Math.round(w * 1000)} mW`)
const ohms = (r: number) => (r >= 1e6 ? `${(r / 1e6).toPrecision(2)} MΩ` : r >= 1000 ? `${(r / 1000).toPrecision(2)} kΩ` : `${Math.ceil(r)} Ω`)
/** the next standard E12 value at or above r */
function e12Up(r: number): number {
  const base = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2]
  const dec = Math.pow(10, Math.floor(Math.log10(Math.max(r, 1e-3))))
  for (const b of base) if (b * dec >= r * 0.999) return b * dec
  return 10 * dec
}

const v = (t: ComponentTelemetry, pin: string) => t.pinVoltages[pin] ?? 0
const span = (t: ComponentTelemetry, a: string, b: string) => v(t, a) - v(t, b)

/** the supply across a chip or module: highest power pin minus lowest ground pin */
function supplyAcross(t: ComponentTelemetry, entry: CatalogEntry): number | null {
  const hi = entry.pins.filter((p) => /^(VCC|VDD|V\+)$/.test(p)).map((p) => v(t, p))
  const lo = entry.pins.filter((p) => /^(GND|VSS|V-)$/.test(p)).map((p) => v(t, p))
  if (!hi.length || !lo.length) return null
  return Math.max(...hi) - Math.min(...lo)
}

const CHIP_MAX: [RegExp, number, string][] = [
  [/^sn74/, 7, 'a 74HC chip takes at most 7 V (5 V is normal)'],
  [/^sn7447$|^sn7490$/, 7, 'a 74LS chip takes at most 7 V (5 V is normal)'],
  [/^cd40/, 20, 'a CD4000 chip takes at most 20 V (3–18 V is normal)'],
  [/^ne555$/, 18, 'the 555 takes at most 18 V'],
  [/^lm358$/, 32, 'the LM358 takes at most 32 V'],
  [/^lm741$/, 36, 'the LM741 takes at most ±18 V (36 V across)'],
]
const MODULE_MAX: Record<string, [number, string]> = {
  servo: [7.2, 'an SG90 servo runs on 4.8–6 V'],
  hcsr04: [5.5, 'the HC-SR04 runs on 5 V'],
  dht22: [6, 'the DHT22 runs on 3.3–6 V'],
  lcd1602_i2c: [6, 'the LCD runs on 5 V'],
  oled_ssd1306: [6, 'the OLED module runs on 3.3–5 V'],
  neopixel_strip: [6, 'NeoPixels run on 5 V'],
}
/** ¼ W parts and their power rating (W) */
const POWER_W: Record<string, number> = { resistor: 0.25, potentiometer: 0.25, trimmer: 0.5, photoresistor: 0.1, decade_resistor: 0.5 }

/** how hard a part is being pushed right now (null = fine / nothing to check) */
export function stressOf(comp: ComponentInstance, entry: CatalogEntry, t: ComponentTelemetry): StressReading | null {
  const id = comp.id
  const type = comp.type
  // power-rated resistive parts
  const rating = POWER_W[type]
  if (rating !== undefined) {
    const i = t.current ?? 0
    const pins = entry.pins
    const vAcross = Math.abs(span(t, pins[0], pins[pins.length - 1]))
    const p = t.power !== undefined ? Math.abs(t.power) : Math.abs(i * vAcross)
    if (p <= 0) return null
    const rNow = Number(paramOf(comp.params, entry, 'resistance') ?? 0)
    const safeR = e12Up((vAcross * vAcross) / (rating / 2))
    const fix =
      type === 'resistor' || type === 'decade_resistor'
        ? `Use ${ohms(safeR)} or more (keeps it under half its rating at ${fmtV(vAcross)}), a 1 W resistor, or a lower supply voltage.${rNow > 0 && rNow < 100 && vAcross > 3 ? ' A very small resistor straight across a supply is nearly a short circuit.' : ''}`
        : `Lower the voltage across it, or add a resistor in series so less current flows through it.`
    return { ratio: p / rating, reason: `${id} is turning ${fmtW(p)} into heat (${fmtA(i)} at ${fmtV(vAcross)}) — it is rated ${fmtW(rating)}.`, fix }
  }
  switch (type) {
    case 'led': {
      const i = t.current ?? 0
      const vs = Math.max(v(t, 'anode'), 0)
      return {
        ratio: i / 0.03,
        reason: `${fmtA(i)} is flowing through ${id} — an LED takes about 20–30 mA.`,
        fix: `Put a resistor in series: R = (supply − LED voltage) / 0.01 A ≈ ${ohms(e12Up(Math.max(vs - 2, 1) / 0.01))} for this supply (330 Ω on 5 V).`,
      }
    }
    case 'diode':
    case 'diode_1n4007': {
      const [iMax, vMax, name] = type === 'diode' ? [0.3, 100, '1N4148'] : [1, 1000, '1N4007']
      const i = t.current ?? 0
      const vr = span(t, 'cathode', 'anode')
      const ri = Math.abs(i) / iMax
      const rv = vr / vMax
      return ri >= rv
        ? { ratio: ri, reason: `${fmtA(i)} is flowing through ${id} — a ${name} takes ${fmtA(iMax)}.`, fix: `Add a resistor in series to limit the current${type === 'diode' ? ', or use a 1N4007 rectifier (1 A)' : ', or use a bigger diode (e.g. 1N5408, 3 A)'}. A diode straight across a supply is a short.` }
        : { ratio: rv, reason: `${fmtV(vr)} is reverse-biasing ${id} — a ${name} blocks at most ${vMax} V.`, fix: `Check the diode's direction (the band is the cathode) or use one with a higher voltage rating.` }
    }
    case 'zener_1n4733': {
      const i = Math.abs(t.current ?? 0)
      const vz = Math.abs(span(t, 'cathode', 'anode'))
      const p = i * vz
      return { ratio: p / 1, reason: `${id} is turning ${fmtW(p)} into heat (${fmtA(i)} at ${fmtV(vz)}) — it is rated 1 W.`, fix: `Add (or enlarge) its series resistor: R ≥ (Vin − 5.1 V) / 0.1 A.` }
    }
    case 'npn':
    case 'pnp': {
      const ic = Math.abs(t.current ?? 0)
      const vce = Math.abs(span(t, 'collector', 'emitter'))
      const p = ic * vce
      const parts: [number, string, string][] = [
        [ic / 0.2, `${fmtA(ic)} through its collector — the ${type === 'npn' ? '2N3904' : '2N3906'} takes 200 mA`, 'Drive a big load (motor, many LEDs) with a MOSFET or a relay, or add a resistor in the collector.'],
        [vce / 40, `${fmtV(vce)} across collector–emitter — it takes 40 V`, 'Lower the supply to the load.'],
        [p / 0.625, `${fmtW(p)} of heat (${fmtA(ic)} at ${fmtV(vce)}) — it is rated 625 mW`, 'Switch it fully on (more base current, e.g. a 1 kΩ base resistor) so it is not half-on, or use a bigger transistor.'],
      ]
      const [ratio, why, fix] = parts.sort((a, b) => b[0] - a[0])[0]
      return { ratio, reason: `${id}: ${why}.`, fix }
    }
    case 'nmos': {
      const id_ = Math.abs(t.current ?? 0)
      const vds = Math.abs(span(t, 'drain', 'source'))
      const vgs = Math.abs(span(t, 'gate', 'source'))
      const parts: [number, string, string][] = [
        [id_ / 0.5, `${fmtA(id_)} through its drain — the 2N7000 takes 200 mA (500 mA in short pulses)`, 'Use a power MOSFET (e.g. IRLZ44N) for motors and strips.'],
        [vgs / 20, `${fmtV(vgs)} between gate and source — the gate breaks above 20 V`, 'Keep the gate at the logic level (5 V); add a 10 V Zener from gate to source if the drive can go higher.'],
        [vds / 60, `${fmtV(vds)} across drain–source — it takes 60 V`, 'Lower the load supply.'],
        [(id_ * vds) / 0.4, `${fmtW(id_ * vds)} of heat — it is rated 400 mW`, 'Drive the gate fully on (≥ 4.5 V) so it is not half-on.'],
      ]
      const [ratio, why, fix] = parts.sort((a, b) => b[0] - a[0])[0]
      return { ratio, reason: `${id}: ${why}.`, fix }
    }
    case 'capacitor': {
      const vc = span(t, 'p1', 'p2')
      const polar = !!paramOf(comp.params, entry, 'polarized')
      if (polar && vc < -1) return { ratio: -vc / 1, reason: `${id} is an electrolytic capacitor connected backwards (${fmtV(vc)}) — reverse voltage makes it bulge and leak.`, fix: 'Turn it round: the + leg goes to the higher voltage, the stripe (−) to ground.' }
      const vMax = polar ? 25 : 50
      return { ratio: Math.abs(vc) / vMax, reason: `${fmtV(Math.abs(vc))} across ${id} — it is rated ${vMax} V.`, fix: 'Use a capacitor with a higher voltage rating, or lower the voltage.' }
    }
    case 'buzzer': {
      const vb = Math.abs(span(t, 'p1', 'p2'))
      return { ratio: vb / 9, reason: `${fmtV(vb)} across ${id} — this buzzer is for 3–6 V.`, fix: 'Power it from 5 V, or add a series resistor.' }
    }
  }
  // chips: supply across VCC/VDD and GND/VSS
  const chip = CHIP_MAX.find(([re]) => re.test(type))
  if (chip) {
    const s = supplyAcross(t, entry)
    if (s === null) return null
    return { ratio: s / chip[1], reason: `${fmtV(s)} across ${id}'s supply pins — ${chip[2]}.`, fix: `Power ${id} from 5 V (the board's 5V pin or the bench supply set to 5 V).` }
  }
  const mod = MODULE_MAX[type]
  if (mod) {
    const s = supplyAcross(t, entry)
    if (s === null) return null
    return { ratio: s / mod[0], reason: `${fmtV(s)} on ${id}'s VCC — ${mod[1]}.`, fix: `Feed ${id} from the board's 5V pin, not from a higher supply.` }
  }
  // boards: VIN takes 7–12 V (20 V max)
  const b = boardDef(type)
  if (b && entry.pins.includes('VIN')) {
    const gnd = b.ground
    const vin = v(t, 'VIN') - v(t, gnd)
    const lim = b.logicV >= 5 ? 20 : 12
    if (vin > 0) return { ratio: vin / lim, reason: `${fmtV(vin)} on ${id}'s VIN pin — it takes at most ${lim} V.`, fix: `Feed VIN 7–12 V${b.logicV >= 5 ? '' : ' (5 V is best on this board)'}, or power the board over USB.` }
  }
  return null
}

/** a board's own latched failure → a breakdown with a fix */
function boardBreakdown(comp: ComponentInstance, label: string, t: ComponentTelemetry, at: number): Breakdown[] {
  const out: Breakdown[] = []
  for (const d of t.mcu?.damage ?? []) {
    const supplyIn = /pushed into the (\S+) pin/.exec(d.reason)
    out.push({
      id: comp.id,
      label,
      reason: d.reason.replace(new RegExp(`^${comp.id}: `), ''),
      fix:
        d.pin === 'board'
          ? supplyIn
            ? `Never wire another supply to the ${supplyIn[1]} pin — that pin is an OUTPUT. Feed 7–12 V into VIN (or use USB), and connect only grounds together.`
            : 'Find the wire from that supply pin to ground and remove it.'
          : /below ground|saw/.test(d.reason)
            ? 'Bring the signal down to the board\'s logic level with a voltage divider (e.g. 10 kΩ + 20 kΩ) or a level shifter.'
            : 'Add a resistor (≥ 220 Ω) between the pin and its load, and drive motors or many LEDs through a transistor.',
      at,
      kind: d.pin === 'board' ? 'burned' : 'pin',
    })
  }
  return out
}

/**
 * seconds of running at 2× the limit before a part burns out — long enough to
 * watch it glow; further over is faster, but never under ≈ 0.4 s (a dead short)
 */
const BURN_TIME = 1.2
const MAX_OVER = 3
/** heat lost per second once it is back under the limit */
const COOL_RATE = 0.4

/**
 * Keeps each part's heat (0 … 1 = burns) and the list of broken parts across
 * frames. `update` returns the parts that broke this frame.
 */
export class StressMonitor {
  heat = new Map<string, number>()
  /** latest ratio per part (for the glow before it is over the limit) */
  ratio = new Map<string, number>()
  readings = new Map<string, StressReading>()
  broken = new Map<string, Breakdown>()

  update(layout: CircuitLayout, tele: Record<string, ComponentTelemetry>, dt: number, now: number): Breakdown[] {
    const fresh: Breakdown[] = []
    for (const comp of layout.components) {
      if (this.broken.has(comp.id)) continue
      const entry = getEntry(comp.type)
      const t = tele[comp.id]
      if (!entry || !t) continue
      const label = entry.label
      // latched failures the device models already decide
      if (t.burned) {
        const r = stressOf(comp, entry, t)
        fresh.push({ id: comp.id, label, reason: `${comp.id} burned out: too much current flowed through it.`, fix: r?.fix ?? 'Put a resistor (≈ 330 Ω on 5 V) in series with the LED.', at: now, kind: 'burned' })
        continue
      }
      if (t.mcu?.damage?.length) {
        for (const b of boardBreakdown(comp, label, t, now)) {
          const key = b.kind === 'pin' ? `${comp.id}:${b.reason.split(' ')[0]}` : comp.id
          if (!this.broken.has(key)) {
            if (b.kind === 'burned') fresh.push(b)
            else this.broken.set(key, b)
          }
        }
        if (t.mcu.damage.some((d) => d.pin === 'board')) continue
      } else if (t.damaged && comp.type === 'multimeter') {
        fresh.push({ id: comp.id, label, reason: t.damaged, fix: 'Replace the fuse, then measure current with the meter IN SERIES (break the circuit and put the meter in the gap). For volts, switch to V first.', at: now, kind: 'burned' })
        continue
      }
      const r = stressOf(comp, entry, t)
      if (!r) {
        this.ratio.delete(comp.id)
        this.readings.delete(comp.id)
        continue
      }
      this.ratio.set(comp.id, r.ratio)
      this.readings.set(comp.id, r)
      let h = this.heat.get(comp.id) ?? 0
      if (r.ratio > 1) h += (dt * Math.min(MAX_OVER, r.ratio - 1)) / BURN_TIME
      else h = Math.max(0, h - dt * COOL_RATE)
      if (h <= 0) this.heat.delete(comp.id)
      else this.heat.set(comp.id, h)
      if (h >= 1) fresh.push({ id: comp.id, label, reason: r.reason, fix: r.fix, at: now, kind: 'burned' })
    }
    for (const b of fresh) {
      this.broken.set(b.id, b)
      this.heat.set(b.id, 1)
    }
    return fresh
  }

  /** a part replaced: forget its damage and heat (and its board pin damage) */
  replace(id: string): void {
    for (const k of [...this.broken.keys()]) if (k === id || k.startsWith(`${id}:`)) this.broken.delete(k)
    this.heat.delete(id)
    this.ratio.delete(id)
    this.readings.delete(id)
  }

  clear(): void {
    this.heat.clear()
    this.ratio.clear()
    this.readings.clear()
    this.broken.clear()
  }

  /** ids out of the circuit (burned) */
  burnedIds(): Set<string> {
    return new Set([...this.broken.values()].filter((b) => b.kind === 'burned').map((b) => b.id))
  }

  /** parts running over (or close to) their limit but not broken yet: for Diagnose */
  hot(): { id: string; reading: StressReading; heat: number }[] {
    const out: { id: string; reading: StressReading; heat: number }[] = []
    for (const [id, r] of this.readings) {
      if (this.broken.has(id) || r.ratio < 0.8) continue
      out.push({ id, reading: r, heat: this.heat.get(id) ?? 0 })
    }
    return out.sort((a, b) => b.reading.ratio - a.reading.ratio)
  }
}

/** the layout the engine runs: burned parts are taken out (an open circuit), with the wires to their terminals */
export function withoutBurned(layout: CircuitLayout, burned: Set<string>): CircuitLayout {
  if (burned.size === 0) return layout
  const term = (ref: string) => burned.has(ref.split(':')[0]) && ref.includes(':') && !/^\d+:/.test(ref)
  return {
    ...layout,
    components: layout.components.filter((c) => !burned.has(c.id)),
    wires: layout.wires.filter((w) => !term(w.from) && !term(w.to)),
  }
}
