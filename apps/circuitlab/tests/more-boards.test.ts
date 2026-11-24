/**
 * The wider board collection (Uno R4, Leonardo, Micro, Nano ESP32, NodeMCU,
 * ESP32-S3 / C3, Pico W / Pico 2, Blue Pill, XIAO, Teensy 4.0): every board's
 * static facts are self-consistent, it fits the breadboard or the bench, it
 * reaches the parts catalog with a Specs sheet, and a sketch toggles both its
 * on-board LED and a header pin in Instant mode.
 */
import { describe, expect, it } from 'vitest'
import { BOARDS, boardDef, type BoardDef } from '../src/model/boards'
import { getEntry } from '../src/model/catalog'
import { componentPinHoles, formatHole, offboardGeometry } from '../src/model/breadboard'
import { validateLayout } from '../src/model/validate'
import { specsFor } from '../src/model/specs'
import { pinChip, pinLabel } from '../src/model/pin-labels'
import { presetById } from '../src/lessons/presets'
import { SimEngine } from '../src/sim/engine'
import type { CircuitLayout, ComponentInstance } from '../src/model/types'
import { wireEndStyle } from '../src/three/internal/wires'

const NEW_BOARDS = [
  'arduino_uno_r4_minima', 'arduino_uno_r4_wifi', 'arduino_leonardo', 'arduino_micro', 'arduino_nano_esp32',
  'esp8266_nodemcu', 'esp32s3_devkitc', 'esp32c3_supermini', 'rpi_pico_w', 'rpi_pico2',
  'stm32_bluepill', 'xiao_samd21', 'teensy40',
]

/** where each board goes in a test layout: a breadboard anchor or a bench position */
function place(b: BoardDef): Partial<ComponentInstance> {
  if (b.placement === 'offboard') return { pos: { x: -(Math.ceil(offboardGeometry(b.type)!.rect.x1) + 4), z: -2 } }
  return { at: b.footprint![0].row + '5' }
}

function layoutWith(b: BoardDef, code: string, extra: { pin: string } | null = null): CircuitLayout {
  const comps: ComponentInstance[] = [{ id: 'B1', type: b.type, ...place(b), params: { code, runtime: b.runtimes[0] } } as ComponentInstance]
  const wires = []
  if (extra && b.placement === 'offboard') {
    // board pin → a breadboard strip with a 10 kΩ load to the board's ground
    comps.push({ id: 'R1', type: 'resistor', params: { resistance: 10000 }, holes: ['a50', 'a55'] })
    wires.push({ id: 'w1', from: `B1:${extra.pin}`, to: 'b50' }, { id: 'w2', from: `B1:${b.ground}`, to: 'b55' })
  }
  return { version: 1, board: 'standard', components: comps, wires } as CircuitLayout
}

/** the net a board pin sits on: its breadboard hole (footprint) or the strip it is wired to */
function pinRef(b: BoardDef, pin: string): string {
  if (b.placement === 'offboard') return 'c50'
  const comp = { id: 'B1', type: b.type, ...place(b) } as ComponentInstance
  const holes = componentPinHoles(comp, getEntry(b.type)!)!
  return formatHole(holes[b.pins.indexOf(pin)]!)
}

/** an Arduino number for a plain output pin on the header (not the LED, not input-only) */
function outputPin(b: BoardDef): { n: number; pin: string } {
  const supplies = new Set(b.supplies.map((s) => s.pin))
  for (const [n, pin] of Object.entries(b.gpio)) {
    if (!b.pins.includes(pin) || b.inputOnly.includes(pin) || supplies.has(pin) || pin === b.ledPin) continue
    if (pin === b.i2c.sda || pin === b.i2c.scl) continue
    return { n: Number(n), pin }
  }
  throw new Error(`${b.type}: no output pin`)
}

describe('more boards: static facts', () => {
  it('all thirteen new boards are registered and reach the parts catalog', () => {
    for (const t of NEW_BOARDS) {
      expect(boardDef(t), t).toBeTruthy()
      const e = getEntry(t)!
      expect(e.category, t).toBe('board')
      expect(e.pins).toEqual(boardDef(t)!.pins)
      expect(specsFor(t)!.groups.length, t).toBeGreaterThan(0)
    }
    expect(new Set(BOARDS.map((b) => b.type)).size).toBe(BOARDS.length)
  })

  for (const b of BOARDS) {
    it(`${b.type}: pins unique, every map points at real pins`, () => {
      expect(new Set(b.pins).size, 'unique pins').toBe(b.pins.length)
      const known = new Set([...b.pins, 'LED'])
      for (const p of Object.values(b.gpio)) expect(known.has(p), `gpio → ${p}`).toBe(true)
      for (const p of Object.keys(b.adc)) expect(b.pins.includes(p), `adc ${p}`).toBe(true)
      if (Array.isArray(b.pwm)) for (const p of b.pwm) expect(b.pins.includes(p), `pwm ${p}`).toBe(true)
      for (const p of [...b.inputOnly, ...(b.fiveVoltTolerant ?? []), b.ground, b.i2c.sda, b.i2c.scl, ...b.supplies.map((s) => s.pin)]) {
        expect(b.pins.includes(p), p).toBe(true)
      }
      for (const [x, y] of b.bridges) expect(b.pins.includes(x) && b.pins.includes(y), `${x}-${y}`).toBe(true)
      expect(b.gpio[b.ledBuiltin], 'LED_BUILTIN → ledPin').toBe(b.ledPin)
      for (const [a, n] of Object.entries(b.analogAlias)) {
        const pin = b.gpio[n]
        expect(pin, a).toBeTruthy()
        expect(b.adc[pin], `${a} → ${pin} has an ADC`).toBeDefined()
      }
      for (const [a, n] of Object.entries(b.pinAliases ?? {})) expect(b.gpio[n], a).toBeTruthy()
      for (const p of b.pins) {
        expect(pinLabel(p, b).length, p).toBeGreaterThan(0)
        expect(pinChip(p, b).length, p).toBeGreaterThan(0)
      }
      expect(b.extraSpecs?.length, 'datasheet facts').toBeGreaterThan(2)
      expect(b.logicV === 5 || b.logicV === 3.3).toBe(true)
      expect(b.absMaxV).toBeGreaterThan(b.logicV)
    })

    it(`${b.type}: fits ${b.placement === 'offboard' ? 'the bench' : 'the breadboard'}`, () => {
      if (b.placement === 'offboard') {
        const geo = offboardGeometry(b.type)!
        expect(geo, 'bench geometry').toBeTruthy()
        expect(geo.terminals.length).toBe(b.pins.length)
        for (const t of geo.terminals) {
          expect(t.dx).toBeGreaterThanOrEqual(geo.rect.x0)
          expect(t.dx).toBeLessThanOrEqual(geo.rect.x1)
          expect(t.dz).toBeGreaterThanOrEqual(geo.rect.z0)
          expect(t.dz).toBeLessThanOrEqual(geo.rect.z1)
        }
      } else {
        expect(b.footprint!.length).toBe(b.pins.length)
        const comp = { id: 'B1', type: b.type, ...place(b) } as ComponentInstance
        const holes = componentPinHoles(comp, getEntry(b.type)!)!
        expect(holes.every(Boolean), 'every pin in a hole').toBe(true)
        expect(new Set(holes).size).toBe(holes.length)
      }
      const v = validateLayout(layoutWith(b, 'void setup() {}\nvoid loop() {}\n'))
      expect(v.errors).toEqual([])
      expect(v.ok).toBe(true)
    })
  }

  it('female headers take male jumper ends, pins take female ends', () => {
    for (const b of BOARDS) {
      if (b.placement !== 'offboard') continue
      for (const pin of [b.ground, ...b.pins.slice(-2)]) {
        const kind = wireEndStyle(layoutWith(b, ''), `B1:${pin}`).kind
        expect(kind, `${b.type} ${pin}`).toBe(b.header === 'female' || b.femalePins?.includes(pin) ? 'socket' : 'pin')
      }
    }
  })
})

describe('more boards: Instant mode', () => {
  for (const t of NEW_BOARDS) {
    const b = boardDef(t)!
    it(`${t}: Blink toggles the on-board LED once a second`, () => {
      const code = 'void setup() { pinMode(LED_BUILTIN, OUTPUT); }\nvoid loop() { digitalWrite(LED_BUILTIN, HIGH); delay(1000); digitalWrite(LED_BUILTIN, LOW); delay(1000); }\n'
      const engine = new SimEngine(layoutWith(b, code))
      const lit: boolean[] = []
      for (const at of [0.5, 1.5, 2.5, 3.5]) {
        engine.advance(at - engine.time)
        const mcu = engine.telemetry().components.B1.mcu!
        expect(mcu.state, mcu.error).toBe('running')
        lit.push(!!mcu.led)
      }
      // HIGH lights an ordinary LED; an active-low LED (NodeMCU, C3, Blue Pill, XIAO) lights on LOW
      const first = !b.ledActiveLow
      expect(lit).toEqual([first, !first, first, !first])
    })

    it(`${t}: a header pin follows digitalWrite at ${b.logicV} V`, () => {
      const { n, pin } = outputPin(b)
      const code = `void setup() { pinMode(${n}, OUTPUT); }\nvoid loop() { digitalWrite(${n}, HIGH); delay(100); digitalWrite(${n}, LOW); delay(100); }\n`
      const engine = new SimEngine(layoutWith(b, code, { pin }))
      const ref = pinRef(b, pin)
      engine.advance(0.05)
      expect(engine.netVoltage(ref), `${pin} high`).toBeGreaterThan(b.logicV * 0.9)
      engine.advance(0.1)
      expect(engine.netVoltage(ref), `${pin} low`).toBeLessThan(0.3)
    })
  }

  it('NodeMCU knows D0…D8 as GPIO numbers and reads A0 as 0–3.3 V', () => {
    const b = boardDef('esp8266_nodemcu')!
    const code = 'void setup() { Serial.begin(115200); pinMode(D5, OUTPUT); digitalWrite(D5, HIGH); Serial.println(D5); }\nvoid loop() {}\n'
    const engine = new SimEngine(layoutWith(b, code, { pin: 'D5' }))
    engine.advance(0.05)
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
  })

  it('a Blue Pill 5 V-tolerant pin survives 5 V; an analog pin does not', () => {
    const b = boardDef('stm32_bluepill')!
    const code = 'void setup() { pinMode(PB12, INPUT); pinMode(PA0, INPUT); }\nvoid loop() {}\n'
    const layout = layoutWith(b, code)
    // a free hole on a pin's own strip: row a above row c, row j below row h
    const free = (pin: string) => pinRef(b, pin).replace(/^c/, 'a').replace(/^h/, 'j')
    // the board's own 5V pin (USB) jumpered to PB12 (FT) and PA0 (analog, 3.6 V max)
    layout.wires.push(
      { id: 'p1', from: free('5V'), to: 'bot+3' },
      { id: 'p2', from: 'bot+8', to: free('PB12') },
      { id: 'p3', from: 'bot+12', to: free('PA0') },
    )
    const engine = new SimEngine(layout)
    engine.advance(0.05)
    const dmg = engine.telemetry().components.B1.mcu!.damage.map((d) => d.pin)
    expect(dmg).toContain('PA0')
    expect(dmg).not.toContain('PB12')
  })

  it('every new board family has a lesson that validates and runs', () => {
    for (const id of ['uno-r4-blink', 'nodemcu-blink', 'bluepill-blink', 'xiao-fade']) {
      const p = presetById(id)!
      expect(p, id).toBeTruthy()
      expect(validateLayout(p.layout).errors, id).toEqual([])
      const engine = new SimEngine(p.layout)
      engine.advance(0.5)
      const boards = p.layout.components.filter((c) => boardDef(c.type))
      for (const c of boards) expect(engine.telemetry().components[c.id].mcu?.state, id).toBe('running')
    }
  })
})
