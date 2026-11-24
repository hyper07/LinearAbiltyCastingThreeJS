/**
 * Over-limit damage: a part pushed past its rating heats up, burns out, leaves
 * the circuit (open) and is listed with a reason and a fix; Replace puts a new
 * one in; a board fed 10 V on its 5V pin dies; an LED without a resistor burns.
 */
import { describe, expect, it } from 'vitest'
import type { CircuitLayout } from '../src/model/types'
import { SimEngine } from '../src/sim/engine'
import { StressMonitor, withoutBurned } from '../src/sim/stress'
import { layout, wire } from './helpers'

/** run `layout` like the app does: frames of 1/60 s, monitor after each, rebuild on burn-out */
function run(l: CircuitLayout, seconds: number) {
  const mon = new StressMonitor()
  let engine = new SimEngine(l)
  const frame = 1 / 60
  const burns: string[] = []
  for (let t = 0; t < seconds; t += frame) {
    const before = engine.time
    engine.advance(frame)
    const fresh = mon.update(l, engine.telemetry().components, engine.time - before, engine.time)
    if (fresh.length) {
      burns.push(...fresh.map((b) => b.id))
      const time = engine.time
      engine = new SimEngine(withoutBurned(l, mon.burnedIds()))
      engine.time = time
    }
  }
  return { mon, engine, burns }
}

const supply = (v: number) => ({ id: 'PS1', type: 'power_supply', params: { voltage: v } })

describe('over-limit damage', () => {
  it('a 10 Ω resistor across 12 V burns out, with the reason and a bigger resistor to use', () => {
    const l = layout([supply(12), { id: 'R1', type: 'resistor', params: { resistance: 10 }, holes: ['a5', 'a12'] }], [wire('PS1:+', 'b5'), wire('PS1:-', 'b12')])
    const { mon, engine, burns } = run(l, 1)
    expect(burns).toEqual(['R1'])
    const b = mon.broken.get('R1')!
    expect(b.reason).toMatch(/W into heat/)
    expect(b.fix).toMatch(/Use .*Ω or more/)
    // out of the circuit: no telemetry for R1 any more
    expect(engine.telemetry().components.R1).toBeUndefined()
    mon.replace('R1')
    expect(mon.broken.size).toBe(0)
  })

  it('a 1 kΩ resistor on 5 V stays cool', () => {
    const l = layout([supply(5), { id: 'R1', type: 'resistor', params: { resistance: 1000 }, holes: ['a5', 'a12'] }], [wire('PS1:+', 'b5'), wire('PS1:-', 'b12')])
    const { mon, burns } = run(l, 1)
    expect(burns).toEqual([])
    expect(mon.hot()).toEqual([])
  })

  it('an LED straight on 5 V burns, and the fix names a series resistor', () => {
    const l = layout([supply(5), { id: 'D1', type: 'led', params: { color: 'red' }, holes: ['a5', 'a6'] }], [wire('PS1:+', 'b5'), wire('PS1:-', 'b6')])
    const { mon, burns } = run(l, 0.5)
    expect(burns).toContain('D1')
    expect(mon.broken.get('D1')!.fix).toMatch(/resistor/)
  })

  it('10 V pushed into an Uno 5V pin kills the board, and the fix says use VIN', () => {
    const l: CircuitLayout = {
      version: 1,
      board: 'standard',
      components: [supply(10), { id: 'U1', type: 'arduino_uno' }],
      wires: [wire('PS1:+', 'U1:5V'), wire('PS1:-', 'U1:GND')],
    } as CircuitLayout
    const { mon, burns } = run(l, 0.6)
    expect(burns).toContain('U1')
    const b = mon.broken.get('U1')!
    expect(b.kind).toBe('burned')
    expect(b.fix).toMatch(/VIN/)
  })

  it('a backwards electrolytic capacitor fails', () => {
    const l = layout(
      [supply(9), { id: 'C1', type: 'capacitor', params: { capacitance: 1e-4, polarized: true }, holes: ['a5', 'a12'] }],
      [wire('PS1:-', 'b5'), wire('PS1:+', 'b12')],
    )
    const { mon, burns } = run(l, 1)
    expect(burns).toEqual(['C1'])
    expect(mon.broken.get('C1')!.fix).toMatch(/Turn it round/)
  })
})
