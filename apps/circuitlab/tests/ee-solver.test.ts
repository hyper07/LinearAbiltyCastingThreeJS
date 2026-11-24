/**
 * EE Lab I: solver accuracy against hand calculations, and the bench
 * instruments' measurement functions.
 */
import { describe, expect, it } from 'vitest'
import { SimEngine } from '../src/sim/engine'
import type { CircuitLayout, ComponentInstance, Wire } from '../src/model/types'
import { acquire, bode, captureScope, measure, phaseBetween, toCSV, traceCurves, type Trace } from '../src/bench/measure'
import blinky555 from '../examples/blinky-555.json'

let wid = 0
const w = (from: string, to: string): Wire => ({ id: `w${++wid}`, from, to })
const PS = (v1 = 12, v2 = 12): ComponentInstance => ({ id: 'PS', type: 'bench_supply', pos: { x: -20, z: 22 }, params: { v1, v2, i1: 0.5, i2: 0.5 } })
const GEN = (p: Record<string, number | string>): ComponentInstance => ({ id: 'GEN', type: 'signal_generator', pos: { x: -18, z: 0 }, params: { load: 'High-Z', ...p } })
function lay(components: ComponentInstance[], wires: Wire[]): CircuitLayout {
  return { version: 1, components, wires }
}
/** rails: top+ = +V1, top- = COM = bot-, bot+ = −V2 */
const rails = (): Wire[] => [w('PS:+', 'top+0'), w('PS:COM', 'top-0'), w('top-24', 'bot-24'), w('PS:-', 'bot+0')]

/** sample a node every step for `seconds` */
function trace(e: SimEngine, ref: string, seconds: number, h: number): Trace {
  const t: number[] = []
  const v: number[] = []
  const n = Math.round(seconds / h)
  for (let i = 0; i < n; i++) {
    e.step(h)
    t.push(e.time)
    v.push(e.netVoltage(ref))
  }
  return { t, v }
}

describe('DC: dividers and Thévenin', () => {
  it('a voltage divider matches R2/(R1+R2)·Vs', () => {
    const e = new SimEngine(lay([PS(10), { id: 'R1', type: 'resistor', params: { resistance: 4700 }, holes: ['a10', 'top+8'] }, { id: 'R2', type: 'resistor', params: { resistance: 2200 }, holes: ['b10', 'top-8'] }], rails()))
    e.advance(0.01)
    expect(e.netVoltage('c10')).toBeCloseTo((10 * 2200) / 6900, 3)
  })

  it('Thévenin: open-circuit 8 V, half of it into R_L = R_th', () => {
    const base = [PS(12), { id: 'R1', type: 'resistor', params: { resistance: 1000 }, holes: ['a10', 'top+8'] }, { id: 'R2', type: 'resistor', params: { resistance: 2000 }, holes: ['b10', 'top-8'] }, { id: 'R3', type: 'resistor', params: { resistance: 1000 }, holes: ['c10', 'c16'] }] as ComponentInstance[]
    const open = new SimEngine(lay(base, rails()))
    open.advance(0.01)
    expect(open.netVoltage('d16')).toBeCloseTo(8, 3)
    const rth = (1000 * 2000) / 3000 + 1000
    const loaded = new SimEngine(lay([...base, { id: 'RL', type: 'decade_resistor', params: { resistance: Math.round(rth) }, holes: ['e16', 'top-14'] }], rails()))
    loaded.advance(0.01)
    expect(loaded.netVoltage('d16')).toBeCloseTo(4, 2)
  })

  it('the DMM loads a high-resistance divider (10 MΩ input)', () => {
    const parts = [PS(10), { id: 'R1', type: 'resistor', params: { resistance: 1e6 }, holes: ['a10', 'top+8'] }, { id: 'R2', type: 'resistor', params: { resistance: 1e6 }, holes: ['b10', 'top-8'] }] as ComponentInstance[]
    const e = new SimEngine(lay([...parts, { id: 'M1', type: 'multimeter', params: { mode: 'V' }, holes: ['c10', 'top-12'] }], rails()))
    e.advance(1)
    // 1 MΩ ∥ 10 MΩ = 909 kΩ → 10·0.909/1.909 = 4.76 V, not 5 V
    expect(e.telemetry().components.M1.value!).toBeCloseTo(4.762, 2)
  })
})

describe('transients', () => {
  it('RC: τ = RC from the 63 % point of a square-wave edge', () => {
    // 0→5 V square at 10 Hz into 10 kΩ / 1 µF → τ = 10 ms
    const e = new SimEngine(
      lay([PS(), GEN({ waveform: 'square', frequency: 10, vpp: 5, offset: 2.5 }), { id: 'R1', type: 'resistor', params: { resistance: 10000 }, holes: ['a10', 'a16'] }, { id: 'C1', type: 'capacitor', params: { capacitance: 1e-6 }, holes: ['b16', 'top-14'] }], [...rails(), w('GEN:out', 'c10'), w('GEN:gnd', 'top-2')]),
    )
    e.advance(0.1, 1e-5) // one full period: the cap is discharged at t = 0.1 s
    const tr = trace(e, 'c16', 0.05, 1e-5)
    const t0 = tr.t[0]
    const i63 = tr.v.findIndex((v) => v >= 5 * (1 - Math.exp(-1)))
    expect(tr.t[i63] - t0).toBeCloseTo(0.01, 3)
  })

  it('RLC series step: under-damped ringing at ω_d with the predicted overshoot', () => {
    // L = 10 mH, C = 0.1 µF, R = 100 Ω (+50 Ω generator): ζ = R_tot/2·√(C/L)
    const R = 100 + 50
    const L = 0.01
    const C = 1e-7
    const zeta = (R / 2) * Math.sqrt(C / L)
    const w0 = 1 / Math.sqrt(L * C)
    const fd = (w0 * Math.sqrt(1 - zeta * zeta)) / (2 * Math.PI)
    const e = new SimEngine(
      lay([PS(), GEN({ waveform: 'square', frequency: 50, vpp: 2, offset: 1 }), { id: 'R1', type: 'resistor', params: { resistance: 100 }, holes: ['a10', 'a14'] }, { id: 'L1', type: 'inductor', params: { inductance: L }, holes: ['b14', 'b18'] }, { id: 'C1', type: 'capacitor', params: { capacitance: C }, holes: ['c18', 'top-16'] }], [...rails(), w('GEN:out', 'c10'), w('GEN:gnd', 'top-2')]),
    )
    e.advance(0.02, 1e-6) // to the start of a rising edge
    const tr = trace(e, 'd18', 0.004, 5e-7)
    const peaks: number[] = []
    for (let i = 1; i < tr.v.length - 1; i++) if (tr.v[i] > tr.v[i - 1] && tr.v[i] >= tr.v[i + 1] && tr.v[i] > 2) peaks.push(tr.t[i])
    const m = { freq: peaks.length >= 2 ? 1 / (peaks[1] - peaks[0]) : null }
    const peak = Math.max(...tr.v)
    const overshoot = (peak - 2) / 2
    expect(overshoot).toBeCloseTo(Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta)), 1)
    expect(m.freq!).toBeGreaterThan(fd * 0.95)
    expect(m.freq!).toBeLessThan(fd * 1.05)
  })

  it('555 astable runs at 1.44 / ((R1 + 2·R2)·C)', () => {
    const e = new SimEngine(blinky555 as CircuitLayout)
    const tr = trace(e, 'g11', 4, 5e-4)
    const m = measure({ t: tr.t.slice(1000), v: tr.v.slice(1000) })
    const f = 1.44 / ((10000 + 2 * 43000) * 1e-5)
    expect(m.freq!).toBeGreaterThan(f * 0.9)
    expect(m.freq!).toBeLessThan(f * 1.1)
  })
})

describe('frequency response (AC analysis)', () => {
  it('RC low-pass: −3 dB at 1/(2πRC) and −45°', () => {
    const lp = lay([PS(), GEN({ waveform: 'sine', frequency: 1000, vpp: 1 }), { id: 'R1', type: 'resistor', params: { resistance: 1000 }, holes: ['a10', 'a16'] }, { id: 'C1', type: 'capacitor', params: { capacitance: 1e-7 }, holes: ['b16', 'top-14'] }], [...rails(), w('GEN:out', 'c10'), w('GEN:gnd', 'top-2')])
    const r = bode(lp, 'GEN', 'd10', 'd16', 10, 1e5, 161)!
    const fc = 1 / (2 * Math.PI * 1000 * 1e-7)
    expect(r.high!).toBeGreaterThan(fc * 0.97)
    expect(r.high!).toBeLessThan(fc * 1.03)
    const at = r.points.reduce((a, b) => (Math.abs(b.f - fc) < Math.abs(a.f - fc) ? b : a))
    expect(at.phase).toBeCloseTo(-45, -0.5)
  })

  it('series RLC band-pass: resonance at 1/(2π√LC) and Q = (1/R)√(L/C)', () => {
    const L = 0.01
    const C = 1e-7
    const Rl = 200
    const bp = lay(
      [PS(), GEN({ waveform: 'sine', frequency: 5000, vpp: 1 }), { id: 'L1', type: 'inductor', params: { inductance: L }, holes: ['a10', 'a14'] }, { id: 'C1', type: 'capacitor', params: { capacitance: C }, holes: ['b14', 'b18'] }, { id: 'R1', type: 'resistor', params: { resistance: Rl }, holes: ['c18', 'top-16'] }],
      [...rails(), w('GEN:out', 'c10'), w('GEN:gnd', 'top-2')],
    )
    const r = bode(bp, 'GEN', 'd10', 'd18', 500, 50000, 241)!
    const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C))
    expect(r.f0).toBeGreaterThan(f0 * 0.98)
    expect(r.f0).toBeLessThan(f0 * 1.02)
    const q = (1 / Rl) * Math.sqrt(L / C)
    expect(r.q!).toBeGreaterThan(q * 0.9)
    expect(r.q!).toBeLessThan(q * 1.1)
  })
})

/** LM741 at f20: IN− col 21 (bottom), IN+ col 22 (bottom), V− col 23 (bottom), OUT col 22 (top), V+ col 21 (top) */
function opampLayout(rin: number, rf: number, inverting: boolean, gen: Record<string, number | string>): CircuitLayout {
  const parts: ComponentInstance[] = [PS(12, 12), GEN(gen), { id: 'U1', type: 'lm741', at: 'f20' }, { id: 'RF', type: 'resistor', params: { resistance: rf }, holes: ['h21', 'b22'] }]
  const wires = [...rails(), w('a21', 'top+16'), w('j23', 'bot+18'), w('GEN:gnd', 'top-2')]
  if (inverting) {
    parts.push({ id: 'RIN', type: 'resistor', params: { resistance: rin }, holes: ['g15', 'g21'] })
    wires.push(w('j22', 'bot-17'), w('GEN:out', 'j15'))
  } else {
    parts.push({ id: 'RIN', type: 'resistor', params: { resistance: rin }, holes: ['g21', 'bot-14'] })
    wires.push(w('GEN:out', 'i22'))
  }
  return lay(parts, wires)
}

describe('op-amps (LM741)', () => {
  it('inverting amplifier: gain −Rf/Rin in the time domain', () => {
    const e = new SimEngine(opampLayout(10000, 100000, true, { waveform: 'sine', frequency: 1000, vpp: 0.5 }))
    e.advance(0.005, 5e-6)
    const out = trace(e, 'c22', 0.004, 5e-6)
    const inn = trace(new SimEngine(opampLayout(10000, 100000, true, { waveform: 'sine', frequency: 1000, vpp: 0.5 })), 'i15', 0.009, 5e-6)
    expect(measure(out).vpp).toBeGreaterThan(4.8)
    expect(measure(out).vpp).toBeLessThan(5.1)
    expect(measure(inn).vpp).toBeCloseTo(0.5, 2)
  })

  it('inverting amplifier: 20 dB and 180° at 1 kHz; GBW limits the bandwidth', () => {
    const r = bode(opampLayout(10000, 100000, true, { waveform: 'sine', frequency: 1000, vpp: 0.5 }), 'GEN', 'i15', 'c22', 100, 1e6, 121)!
    const at1k = r.points.reduce((a, b) => (Math.abs(b.f - 1000) < Math.abs(a.f - 1000) ? b : a))
    expect(at1k.db).toBeCloseTo(20, 0)
    expect(Math.abs(at1k.phase)).toBeGreaterThan(175)
    // closed-loop bandwidth ≈ GBW / (1 + Rf/Rin) = 1 MHz / 11 ≈ 91 kHz
    expect(r.high!).toBeGreaterThan(70e3)
    expect(r.high!).toBeLessThan(110e3)
  })

  it('non-inverting amplifier: gain 1 + Rf/Rin', () => {
    const r = bode(opampLayout(10000, 100000, false, { waveform: 'sine', frequency: 1000, vpp: 0.5 }), 'GEN', 'i22', 'c22', 100, 10000, 21)!
    expect(r.points[10].mag).toBeCloseTo(11, 1)
  })

  it('saturates ~1.5 V inside the rails and slews at 0.5 V/µs', () => {
    const e = new SimEngine(opampLayout(1000, 100000, true, { waveform: 'square', frequency: 1000, vpp: 2 }))
    e.advance(0.003, 1e-6)
    const out = trace(e, 'c22', 0.002, 2e-7)
    const m = measure(out)
    expect(m.vmax).toBeCloseTo(10.5, 0)
    expect(m.vmin).toBeCloseTo(-10.5, 0)
    // 80 % of a 21 V swing at 0.5 V/µs ≈ 34 µs
    expect(m.rise!).toBeGreaterThan(28e-6)
    expect(m.rise!).toBeLessThan(40e-6)
  })
})

describe('BJT common-emitter amplifier', () => {
  it('mid-band gain ≈ −R_C / R_E (unbypassed emitter)', () => {
    const parts: ComponentInstance[] = [
      PS(12),
      GEN({ waveform: 'sine', frequency: 1000, vpp: 0.1 }),
      { id: 'R1', type: 'resistor', params: { resistance: 47000 }, holes: ['a15', 'top+12'] },
      { id: 'R2', type: 'resistor', params: { resistance: 10000 }, holes: ['g15', 'bot-12'] },
      { id: 'RC', type: 'resistor', params: { resistance: 4700 }, holes: ['a17', 'top+15'] },
      { id: 'RE', type: 'resistor', params: { resistance: 1000 }, holes: ['g19', 'bot-17'] },
      { id: 'Q1', type: 'npn', holes: ['h19', 'h15', 'b17'] }, // emitter, base, collector
      { id: 'CIN', type: 'capacitor', params: { capacitance: 1e-5 }, holes: ['i10', 'i15'] },
    ]
    const r = bode(lay(parts, [...rails(), w('a15', 'f15'), w('GEN:out', 'j10'), w('GEN:gnd', 'top-2')]), 'GEN', 'j10', 'c17', 100, 10000, 21)!
    const mid = r.points[10]
    expect(mid.mag).toBeGreaterThan(4.0)
    expect(mid.mag).toBeLessThan(4.7)
    expect(Math.abs(mid.phase)).toBeGreaterThan(170)
  })
})

describe('diodes and the curve tracer', () => {
  it('traces a 1N4148 (≈0.65 V at 1 mA) and a 5.1 V Zener breakdown', () => {
    const d = lay([{ id: 'CT', type: 'curve_tracer', pos: { x: -16, z: 2 } }, { id: 'D1', type: 'diode', holes: ['a10', 'a14'] }], [w('CT:C', 'b10'), w('CT:E', 'b14')])
    const [c] = traceCurves(d, 'CT', 'diode', { vMax: 2, points: 61 })
    const at1mA = c.points.find((p) => p.i > 1e-3)!
    expect(at1mA.v).toBeGreaterThan(0.6)
    expect(at1mA.v).toBeLessThan(0.75)
    const z = lay([{ id: 'CT', type: 'curve_tracer', pos: { x: -16, z: 2 } }, { id: 'Z1', type: 'zener_1n4733', holes: ['a10', 'a14'] }], [w('CT:C', 'b10'), w('CT:E', 'b14')])
    const [zc] = traceCurves(z, 'CT', 'diode', { vMax: 7, points: 81 })
    const rev = zc.points.reduce((a, b) => (Math.abs(b.i + 10e-3) < Math.abs(a.i + 10e-3) ? b : a))
    expect(rev.v).toBeLessThan(-4.6)
    expect(rev.v).toBeGreaterThan(-5.4)
  })

  it('traces NPN output curves: I_C ≈ β·I_B in the active region', () => {
    const l = lay([{ id: 'CT', type: 'curve_tracer', pos: { x: -16, z: 2 } }, { id: 'Q1', type: 'npn', holes: ['a12', 'a11', 'a10'] }], [w('CT:C', 'b10'), w('CT:B', 'b11'), w('CT:E', 'b12')])
    const curves = traceCurves(l, 'CT', 'npn', { vMax: 5, steps: [20e-6], points: 21 })
    const active = curves[0].points[15]
    expect(active.i / 20e-6).toBeGreaterThan(120)
    expect(active.i / 20e-6).toBeLessThan(200)
  })
})

describe('instruments', () => {
  it('measure(): Vpp, Vrms, frequency, rise time of a known sine and square', () => {
    const t = Array.from({ length: 2000 }, (_, i) => i * 1e-5)
    const sine = { t, v: t.map((x) => 1 + 2 * Math.sin(2 * Math.PI * 500 * x)) }
    const m = measure(sine)
    expect(m.vpp).toBeCloseTo(4, 2)
    expect(m.vavg).toBeCloseTo(1, 2)
    expect(m.vacrms).toBeCloseTo(2 / Math.SQRT2, 2)
    expect(m.freq!).toBeCloseTo(500, 0)
    const shifted = { t, v: t.map((x) => Math.sin(2 * Math.PI * 500 * x + Math.PI / 4)) }
    expect(phaseBetween(sine, shifted)!).toBeCloseTo(45, 0)
  })

  it('the scope triggers on a rising edge and measures the generator', () => {
    const l = lay([PS(), GEN({ waveform: 'square', frequency: 1000, vpp: 4, offset: 0 }), { id: 'SC', type: 'oscilloscope', pos: { x: 40, z: 2 } }], [...rails(), w('GEN:out', 'a10'), w('GEN:gnd', 'top-2'), w('SC:CH1', 'b10'), w('SC:GND', 'top-5')])
    const e = new SimEngine(l)
    const cap = captureScope(e, { timeDiv: 0.5e-3, ch: [{ ref: 'SC:CH1', coupling: 'DC', on: true }, { ref: null, coupling: 'DC', on: false }], gnd: 'SC:GND', trigger: { source: 0, level: 0, slope: 'rise', mode: 'normal' } }, e.preferredDt())
    expect(cap.triggered).toBe(true)
    const m = measure({ t: cap.t, v: cap.ch[0]! })
    expect(m.vpp).toBeCloseTo(4, 1)
    expect(m.freq!).toBeCloseTo(1000, -1)
    // the trigger point sits 10 % into the screen, at the rising edge
    const k = cap.t.findIndex((x) => x >= 0)
    expect(cap.ch[0]![k + 2]).toBeGreaterThan(1)
  })

  it('50 Ω display setting: a high-impedance load sees twice the displayed amplitude', () => {
    const l = (load: string) => lay([PS(), GEN({ waveform: 'sine', frequency: 1000, vpp: 2, load })], [...rails(), w('GEN:out', 'a10'), w('GEN:gnd', 'top-2')])
    const hiZ = new SimEngine(l('High-Z'))
    const t50 = new SimEngine(l('50Ω'))
    expect(measure(trace(hiZ, 'b10', 0.002, 5e-6)).vpp).toBeCloseTo(2, 1)
    expect(measure(trace(t50, 'b10', 0.002, 5e-6)).vpp).toBeCloseTo(4, 1)
  })

  it('the bench supply current-limits (CC) into a short', () => {
    const e = new SimEngine(lay([{ id: 'PS', type: 'bench_supply', pos: { x: -20, z: 22 }, params: { v1: 10, i1: 0.1 } }, { id: 'R1', type: 'resistor', params: { resistance: 10 }, holes: ['a10', 'top+8'] }, { id: 'R2', type: 'resistor', params: { resistance: 0.5 }, holes: ['b10', 'top-8'] }], rails()))
    e.advance(0.01)
    const x = e.telemetry().components.PS.extra!
    expect(x.cc1).toBe(true)
    expect(x.i1).toBeCloseTo(0.1, 3)
  })

  it('DAQ acquisition and CSV export', () => {
    const l = lay([{ id: 'DQ', type: 'daq', pos: { x: -18, z: 22 }, params: { ao0: 2.5 } }, { id: 'R1', type: 'resistor', params: { resistance: 1000 }, holes: ['a10', 'a14'] }, { id: 'R2', type: 'resistor', params: { resistance: 1000 }, holes: ['b14', 'top-12'] }], [w('DQ:AO0', 'c10'), w('DQ:AGND', 'top-0'), w('DQ:AI0+', 'c14'), w('DQ:AI0-', 'top-3')])
    const e = new SimEngine(l)
    const acq = acquire(e, [{ name: 'AI0', ref: 'DQ:AI0+', minus: 'DQ:AI0-' }], 1000, 0.01, e.preferredDt())
    expect(acq.rows.length).toBe(10)
    expect(acq.rows[9][1]).toBeCloseTo(1.25, 2)
    const csv = toCSV(acq.headers, acq.rows)
    expect(csv.split('\n')[0]).toBe('t (s),AI0 (V)')
    expect(csv.split('\n').length).toBe(12)
    expect(toCSV(['a'], [['x,"y"']])).toBe('a\n"x,""y"""\n')
  })
})
