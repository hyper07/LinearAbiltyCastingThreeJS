/**
 * "Check before you run": a short silent run of the circuit (a fraction of a
 * second, on a scratch engine) that looks for what a teacher would point at
 * before switching on — parts that would go over their limits (they would
 * burn), parts connected the wrong way round, power fed backwards, and wiring
 * problems the solver reports. Each finding says what is wrong, the rule for
 * that part's direction, the spec it breaks, a hint to work it out, and the
 * fix (shown only when the student asks for it).
 */
import '../sim/chips/all' // the behavioural chip models
import type { CircuitLayout, ComponentInstance, ComponentTelemetry } from '../model/types'
import { getEntry } from '../model/catalog'
import { boardDef } from '../model/boards'
import { SimEngine } from './engine'
import { stressOf } from './stress'

export interface PreflightItem {
  id: string
  label: string
  /** burn = would go over a limit; near = close to one; direction = wrong way round; wiring = solver problems */
  kind: 'burn' | 'near' | 'direction' | 'wiring'
  /** one line: what is wrong */
  title: string
  /** the measured numbers */
  detail: string
  /** how this part must face / be connected (the rule to learn) */
  rule?: string
  /** the limit it breaks, from its specs */
  spec?: string
  /** a nudge toward the answer */
  hint: string
  /** the answer (hidden until asked) */
  fix?: string
}

/** how each part must face — shown with every direction or limit finding */
export const DIRECTION_RULES: Record<string, string> = {
  led: 'An LED only lets current flow one way: the long leg (anode, +) toward the higher voltage, the short leg on the flat side (cathode, −) toward ground — and always with a resistor in series.',
  diode: 'Current flows from anode to cathode. The painted band marks the cathode (−).',
  diode_1n4007: 'Current flows from anode to cathode. The silver band marks the cathode (−).',
  zener_1n4733: 'As a regulator a Zener goes in BACKWARDS: band (cathode) to the higher voltage, through a series resistor.',
  capacitor: 'An electrolytic capacitor has a + leg (longer) and a − stripe: + to the higher voltage. Ceramic ones have no direction.',
  npn: 'NPN (2N3904, flat face toward you: E B C): emitter to ground, collector to the load, base through a resistor to the signal.',
  pnp: 'PNP (2N3906, flat face toward you: E B C): emitter to the + supply, collector to the load, base pulled LOW through a resistor to switch on.',
  nmos: 'N-MOSFET (2N7000, flat face toward you: S G D): source to ground, drain to the load, gate to the signal.',
  servo: 'Servo cable: brown = GND, red = +5 V, orange = signal.',
}

const fmt = (x: number, unit: string) => `${Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2)} ${unit}`
const v = (t: ComponentTelemetry, p: string) => t.pinVoltages[p] ?? 0

/** the spec line a stress reading breaks, kept short for the card */
function specLine(type: string, reason: string): string | undefined {
  const m = /(?:rated|takes|takes at most|blocks at most|runs on|is for) ([^—.]+)/.exec(reason)
  return m ? `Limit: ${m[1].trim()}` : undefined
}

/** wrong-way-round checks on the settled voltages */
function directionOf(c: ComponentInstance, t: ComponentTelemetry, label: string): PreflightItem | null {
  const rule = DIRECTION_RULES[c.type]
  switch (c.type) {
    case 'led': {
      const rev = v(t, 'cathode') - v(t, 'anode')
      if (rev > 1) {
        return { id: c.id, label, kind: 'direction', title: `${c.id} is facing the wrong way — it will stay dark`, detail: `Its cathode (−) is ${fmt(rev, 'V')} above its anode (+).`, rule, hint: 'Which leg of an LED goes toward + ? Look at the long leg and the flat side.', fix: `Turn ${c.id} round: swap its two legs.` }
      }
      return null
    }
    case 'diode':
    case 'diode_1n4007': {
      const rev = v(t, 'cathode') - v(t, 'anode')
      if (rev > 1.5) {
        return { id: c.id, label, kind: 'direction', title: `${c.id} is blocking (reverse-biased)`, detail: `Its band side (cathode) is ${fmt(rev, 'V')} above its anode, so no current flows through it. That is right for a protection (flyback) diode — wrong if current should pass.`, rule, hint: 'Should current flow through this diode? Follow the arrow in its symbol: anode → cathode.', fix: `If current should flow, turn ${c.id} round (band toward ground).` }
      }
      return null
    }
    case 'zener_1n4733': {
      const fwd = v(t, 'anode') - v(t, 'cathode')
      if (fwd > 0.5) return { id: c.id, label, kind: 'direction', title: `${c.id} is forward-biased — it acts like a plain diode (≈ 0.7 V), not a 5.1 V regulator`, detail: `Anode is ${fmt(fwd, 'V')} above the cathode.`, rule, hint: 'A Zener regulates in its reverse direction. Where should its band go?', fix: `Turn ${c.id} round: band (cathode) to the higher voltage.` }
      return null
    }
    case 'npn': {
      if (v(t, 'emitter') - v(t, 'collector') > 0.5 && v(t, 'base') > Math.min(v(t, 'emitter'), v(t, 'collector')) + 0.5) {
        return { id: c.id, label, kind: 'direction', title: `${c.id}: collector and emitter look swapped`, detail: `The emitter is ${fmt(v(t, 'emitter') - v(t, 'collector'), 'V')} above the collector.`, rule, hint: 'For an NPN, which leg goes to ground — emitter or collector?', fix: `Turn ${c.id} round so its emitter goes to ground and the collector to the load.` }
      }
      return null
    }
    case 'pnp': {
      if (v(t, 'collector') - v(t, 'emitter') > 0.5) {
        return { id: c.id, label, kind: 'direction', title: `${c.id}: collector and emitter look swapped`, detail: `The collector is ${fmt(v(t, 'collector') - v(t, 'emitter'), 'V')} above the emitter.`, rule, hint: 'For a PNP, the emitter goes to the + supply.', fix: `Turn ${c.id} round so its emitter goes to +.` }
      }
      return null
    }
  }
  // chips and modules: power fed backwards
  const entry = getEntry(c.type)
  if (!entry || boardDef(c.type)) return null
  const hi = entry.pins.find((p) => /^(VCC|VDD|V\+)$/.test(p))
  const lo = entry.pins.find((p) => /^(GND|VSS|V-)$/.test(p))
  if (hi && lo && v(t, lo) - v(t, hi) > 1) {
    return { id: c.id, label, kind: 'direction', title: `${c.id} has its power the wrong way round`, detail: `${lo} is ${fmt(v(t, lo) - v(t, hi), 'V')} above ${hi}.`, rule: rule ?? `${hi} goes to +, ${lo} to ground. On a chip, find pin 1 by the notch or dot.`, hint: `Which pin of ${c.id} is ${hi}? Check pin 1 (notch/dot) and count round.`, fix: `Swap the wires on ${hi} and ${lo} (or turn the chip round).` }
  }
  return null
}

/**
 * Run the circuit silently for `seconds` (≤ `budgetMs` of real time) and
 * return what a teacher would flag before switching on. Empty = looks fine.
 */
export function preflight(layout: CircuitLayout, seconds = 0.3, budgetMs = 250): PreflightItem[] {
  let engine: SimEngine
  try {
    engine = new SimEngine(layout)
  } catch (err) {
    return [{ id: '', label: 'Circuit', kind: 'wiring', title: 'The circuit can’t be simulated', detail: String(err), hint: 'Look for a part with a missing or doubled connection.' }]
  }
  const worst = new Map<string, { ratio: number; reason: string; fix: string }>()
  const latched = new Map<string, string>()
  const deadline = performance.now() + budgetMs
  const frame = 1 / 120
  for (let t = 0; t < seconds && performance.now() < deadline; t += frame) {
    try {
      engine.advance(frame)
    } catch {
      break
    }
    const tele = engine.telemetry().components
    for (const c of layout.components) {
      const tc = tele[c.id]
      const entry = getEntry(c.type)
      if (!tc || !entry) continue
      if (tc.burned && !latched.has(c.id)) latched.set(c.id, 'it would burn out within milliseconds')
      if (tc.mcu?.damage?.length && !latched.has(c.id)) latched.set(c.id, tc.mcu.damage[0].reason)
      if (tc.damaged && c.type === 'multimeter' && !latched.has(c.id)) latched.set(c.id, tc.damaged)
      const r = stressOf(c, entry, tc)
      if (r && r.ratio > (worst.get(c.id)?.ratio ?? 0)) worst.set(c.id, r)
    }
  }
  const items: PreflightItem[] = []
  const tele = engine.telemetry().components
  for (const c of layout.components) {
    const entry = getEntry(c.type)
    if (!entry) continue
    const label = entry.label
    const r = worst.get(c.id)
    const rule = DIRECTION_RULES[c.type]
    const dir = tele[c.id] ? directionOf(c, tele[c.id], label) : null
    if (r && r.ratio >= 1) {
      items.push({ id: c.id, label, kind: 'burn', title: `${c.id} would go over its limit and burn out (${r.ratio >= 10 ? 'more than 10× its rating' : `${Math.round(r.ratio * 100)} % of its rating`})`, detail: r.reason, rule, spec: specLine(c.type, r.reason), hint: 'Open its Specs to see what it can take, then work out the voltage across it and the current through it (Ohm’s law: I = V / R).', fix: r.fix })
    } else if (latched.has(c.id)) {
      items.push({ id: c.id, label, kind: 'burn', title: `${c.id} would be damaged`, detail: latched.get(c.id)!.replace(new RegExp(`^${c.id}: `), ''), rule, hint: 'Check what is wired to its power pins, and the voltage each pin can take (Specs).', fix: r?.fix })
    } else if (dir) {
      items.push(dir)
    } else if (r && r.ratio >= 0.8) {
      items.push({ id: c.id, label, kind: 'near', title: `${c.id} is close to its limit (${Math.round(r.ratio * 100)} %)`, detail: r.reason, rule, spec: specLine(c.type, r.reason), hint: 'It will run hot. Is there a value with more margin?', fix: r.fix })
    }
  }
  const order = { burn: 0, direction: 1, wiring: 2, near: 3 }
  for (const issue of engine.issues) {
    if (issue.level !== 'error' && !/short|floating|unpowered|not connected|no power/i.test(issue.message)) continue
    if (items.some((i) => i.id && issue.message.includes(i.id))) continue
    items.push({ id: '', label: 'Wiring', kind: 'wiring', title: issue.message, detail: '', hint: 'Follow the wires from the supply + through each part back to ground.' })
  }
  return items.sort((a, b) => order[a.kind] - order[b.kind]).slice(0, 12)
}
