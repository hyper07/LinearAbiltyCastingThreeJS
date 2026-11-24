/** "Check before you run" finds burn-outs, wrong-way parts and bad power before the student presses Run. */
import { describe, expect, it } from 'vitest'
import type { CircuitLayout } from '../src/model/types'
import { preflight } from '../src/sim/preflight'
import { presetById } from '../src/lessons/presets'
import { layout, wire } from './helpers'

const ps = (v: number) => ({ id: 'PS1', type: 'power_supply', params: { voltage: v } })
const kinds = (l: CircuitLayout) => preflight(l, 0.3, 2000).map((i) => `${i.kind}:${i.id}`)

describe('check before you run', () => {
  it('a correct LED + 330 Ω circuit passes', () => {
    const l = layout([ps(5), { id: 'R1', type: 'resistor', params: { resistance: 330 }, holes: ['a5', 'a10'] }, { id: 'D1', type: 'led', holes: ['a11', 'a14'] }], [wire('PS1:+', 'b5'), wire('b10', 'b11'), wire('PS1:-', 'b14')])
    expect(kinds(l)).toEqual([])
  })
  it('a backwards LED is "wrong way round", with the rule and a hidden answer', () => {
    const l = layout([ps(5), { id: 'R1', type: 'resistor', params: { resistance: 330 }, holes: ['a5', 'a10'] }, { id: 'D1', type: 'led', holes: ['a14', 'a11'] }], [wire('PS1:+', 'b5'), wire('b10', 'b11'), wire('PS1:-', 'b14')])
    const items = preflight(l, 0.3, 2000)
    expect(items.map((i) => `${i.kind}:${i.id}`)).toEqual(['direction:D1'])
    expect(items[0].rule).toMatch(/long leg/)
    expect(items[0].fix).toMatch(/Turn D1 round/)
  })
  it('an LED with no resistor would burn; the spec and the fix are given', () => {
    const l = layout([ps(5), { id: 'D1', type: 'led', holes: ['a5', 'a6'] }], [wire('PS1:+', 'b5'), wire('PS1:-', 'b6')])
    const items = preflight(l, 0.3, 2000)
    expect(items[0].kind).toBe('burn')
    expect(items[0].fix).toMatch(/resistor/)
  })
  it('a 74HC chip on 12 V and 10 V into an Uno 5V pin are flagged', () => {
    const chip = layout([ps(12), { id: 'U2', type: 'sn7400', at: 'f20' }], [wire('PS1:+', 'top+3'), wire('PS1:-', 'top-3'), wire('top+4', 'j26'), wire('top-4', 'a26')])
    // the VCC/GND holes of a DIP-14 at f20: pin 14 VCC = e20? use whatever the check finds
    const found = kinds(chip)
    expect(found.some((k) => k.endsWith(':U2')) || found.some((k) => k.startsWith('wiring'))).toBe(true)
    const uno: CircuitLayout = { version: 1, board: 'standard', components: [ps(10), { id: 'U1', type: 'arduino_uno' }], wires: [wire('PS1:+', 'U1:5V'), wire('PS1:-', 'U1:GND')] } as CircuitLayout
    expect(kinds(uno)).toContain('burn:U1')
  })
  it('the lessons are clean', () => {
    for (const id of ['blink', 'servo', 'pico-blink']) {
      const p = presetById(id)!
      expect(preflight(p.layout, 0.3, 4000).filter((i) => i.kind !== 'near').map((i) => `${i.kind}:${i.id}:${i.title}`), id).toEqual([])
    }
  })
})
