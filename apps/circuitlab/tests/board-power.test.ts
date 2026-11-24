/**
 * A board needs power: its USB cable plugged in, or a supply on VIN / 5V /
 * 3V3. Unplugged and unfed, the program does not run and the pins float.
 */
import { describe, expect, it } from 'vitest'
import { SimEngine } from '../src/sim/engine'
import type { CircuitLayout } from '../src/model/types'
import { presetById } from '../src/lessons/presets'
import { preflight } from '../src/sim/preflight'

function unplugged(id = 'blink'): CircuitLayout {
  const l = structuredClone(presetById(id)!.layout)
  for (const c of l.components) if (c.type === 'arduino_uno' || c.type === 'rpi_pico') c.params = { ...c.params, usb: false }
  return l
}

describe('board power', () => {
  it('a lesson board is plugged in by default and runs', () => {
    const e = new SimEngine(presetById('blink')!.layout)
    e.advance(0.5)
    const t = e.telemetry().components
    expect(t.U1.mcu?.powered).toBe(true)
    expect(t.U1.mcu?.powerFrom).toBe('USB')
    expect(t.D1.ledBrightness ?? 0).toBeGreaterThan(0.8)
  })

  it('unplugged with nothing on VIN: the sketch does not run, the LED stays dark, and it says why', () => {
    const e = new SimEngine(unplugged())
    e.advance(0.5)
    const t = e.telemetry().components
    expect(t.U1.mcu?.powered).toBe(false)
    expect(t.D1.ledBrightness ?? 0).toBeLessThan(0.05)
    expect(e.issues.some((i) => /no power/.test(i.message) && /USB/.test(i.message))).toBe(true)
    expect(preflight(unplugged()).some((i) => /no power/.test(i.title))).toBe(true)
  })

  it('unplugged but 9 V on VIN from a bench supply: it runs from VIN', () => {
    const l = unplugged()
    l.components.push({ id: 'PS1', type: 'power_supply', params: { voltage: 9 } })
    l.wires.push({ id: 'wp1', from: 'PS1:+', to: 'U1:VIN', color: 'red' }, { id: 'wp2', from: 'PS1:-', to: 'U1:GND', color: 'black' })
    const e = new SimEngine(l)
    e.advance(0.5)
    const t = e.telemetry().components
    expect(t.U1.mcu?.powered).toBe(true)
    expect(t.U1.mcu?.powerFrom).toBe('VIN')
    expect(t.D1.ledBrightness ?? 0).toBeGreaterThan(0.8)
    expect(t.U1.mcu?.damage.length).toBe(0)
  })

  it('unplugged but 5 V on the 5V pin: it runs, and the board does not fight the supply', () => {
    const l = unplugged()
    l.components.push({ id: 'PS1', type: 'power_supply', params: { voltage: 5 } })
    l.wires.push({ id: 'wp1', from: 'PS1:+', to: 'U1:5V', color: 'red' }, { id: 'wp2', from: 'PS1:-', to: 'U1:GND', color: 'black' })
    const e = new SimEngine(l)
    e.advance(0.5)
    const t = e.telemetry().components
    expect(t.U1.mcu?.powerFrom).toBe('5V')
    expect(t.D1.ledBrightness ?? 0).toBeGreaterThan(0.8)
    expect(t.U1.mcu?.damage.length).toBe(0)
  })
})
