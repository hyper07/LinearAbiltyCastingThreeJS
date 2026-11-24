/**
 * Header wire ends: every board pin's wire anchor sits at the header's top
 * face (the socket hole / pin top) and the wire leaves straight UP from it,
 * never dipping below the header top while it is still over the board.
 * Sideways module pins leave level along the pin. Ribbons keep their order.
 */
import { describe, expect, it } from 'vitest'
import { getEntry } from '../src/model/catalog'
import { offboardBodyRect, offboardGeometry, offboardTerminalPosition } from '../src/model/breadboard'
import { ARDUINO_HEADER_Y, ESP32_PIN_Y } from '../src/model/boards'
import type { CircuitLayout, ComponentInstance, Wire } from '../src/model/types'
import { DUPONT, dupontRise, planRoutes, plannedWireRoute, wireBundles, wireEndStyle } from '../src/three/internal/wires'

const BOARDS: { type: string; pos: { x: number; z: number }; top: number; kind: 'socket' | 'pin' }[] = [
  { type: 'arduino_uno', pos: { x: -31, z: -1.5 }, top: ARDUINO_HEADER_Y, kind: 'socket' },
  { type: 'arduino_mega', pos: { x: -60, z: -3 }, top: ARDUINO_HEADER_Y, kind: 'socket' },
  { type: 'esp32_devkit', pos: { x: -25, z: 2 }, top: ESP32_PIN_Y, kind: 'pin' },
]

function boardLayout(type: string, pos: { x: number; z: number }, pins: string[]): CircuitLayout {
  const comps: ComponentInstance[] = [{ id: 'B1', type, pos }]
  const wires: Wire[] = pins.map((p, i) => ({ id: `w${i}`, from: `B1:${p}`, to: `a${5 + i}`, color: 'red' }))
  return { version: 1, board: 'standard', components: comps, wires } as CircuitLayout
}

describe('wires on board headers', () => {
  for (const b of BOARDS) {
    it(`${b.type}: every pin's wire starts at the header top and rises straight up`, () => {
      const entry = getEntry(b.type)!
      const geo = offboardGeometry(b.type)!
      expect(geo, b.type).toBeTruthy()
      const rect = offboardBodyRect(0, b.pos, b.type)
      // all pins, in chunks of 20 wires (the breadboard has the holes)
      for (let start = 0; start < entry.pins.length; start += 20) {
        const pins = entry.pins.slice(start, start + 20)
        const layout = boardLayout(b.type, b.pos, pins)
        planRoutes(layout)
        pins.forEach((pin, i) => {
          const idx = entry.pins.indexOf(pin)
          expect(geo.terminals[idx].y, `${pin} anchor = header top`).toBeCloseTo(b.top, 6)
          expect(wireEndStyle(layout, `B1:${pin}`).kind).toBe(b.kind)
          const r = plannedWireRoute(`w${i}`)!
          expect(r, pin).toBeTruthy()
          expect(r.ya).toBeCloseTo(b.top, 6)
          const [p0, p1] = r.waypoints
          const t = offboardTerminalPosition(0, idx, b.pos, b.type)
          expect(p0.x).toBeCloseTo(t.x, 6)
          expect(p0.z).toBeCloseTo(t.z, 6)
          // first segment: straight up from the socket / pin top
          expect(Math.hypot(p1.x - p0.x, p1.z - p0.z), `${pin} riser is vertical`).toBeLessThan(1e-6)
          // straight up past the DuPont housing top before any bend
          const housingTop = b.kind === 'socket' ? DUPONT.h : DUPONT.h - DUPONT.overPin
          expect(p1.y - b.top, `${pin} rises`).toBeCloseTo(dupontRise(b.kind), 6)
          expect(p1.y - b.top).toBeGreaterThan(housingTop + 0.5)
          // never below the header top while over the board (no PCB / header-body contact)
          for (const q of r.waypoints.slice(1)) {
            const over = q.x > rect.minX && q.x < rect.maxX && q.z > rect.minZ && q.z < rect.maxZ
            if (over) expect(q.y, `${pin} stays above the header`).toBeGreaterThan(b.top)
          }
        })
      }
    })
  }

  it('a sideways module header (LCD I²C) leaves level along its pins', () => {
    const layout: CircuitLayout = {
      version: 1,
      components: [
        { id: 'U1', type: 'arduino_uno', pos: { x: -31, z: -1.5 } },
        { id: 'LCD1', type: 'lcd1602_i2c', pos: { x: 0, z: 21.5 } },
      ],
      wires: ['GND', 'VCC', 'SDA', 'SCL'].map((p, i) => ({ id: `l${i}`, from: `U1:${['GND', '5V', 'A4', 'A5'][i]}`, to: `LCD1:${p}`, color: 'red' })),
    } as CircuitLayout
    planRoutes(layout)
    expect(wireBundles(layout)).toHaveLength(1)
    for (let i = 0; i < 4; i++) {
      const r = plannedWireRoute(`l${i}`)!
      const n = r.waypoints.length
      const end = r.waypoints[n - 1]
      const lead = r.waypoints[n - 2]
      expect(wireEndStyle(layout, `LCD1:${['GND', 'VCC', 'SDA', 'SCL'][i]}`).kind).toBe('side')
      expect(Math.abs(lead.y - r.yb), 'level lead-in').toBeLessThan(1e-6)
      expect(Math.hypot(lead.x - end.x, lead.z - end.z)).toBeCloseTo(dupontRise('side'), 6)
    }
  })
})
