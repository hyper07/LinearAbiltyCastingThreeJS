/**
 * Circuit Lab board bridge: microcontroller boards as chips in the solver.
 * Instant mode (transpiled sketches) and compiled mode (real HEX on avr8js).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SimEngine } from '../src/sim/engine'
import type { CircuitLayout, ComponentInstance, Wire } from '../src/model/types'
import { validateLayout } from '../src/model/validate'
import { PRESETS, presetById } from '../src/lessons/presets'
import { serialBus } from '../src/mcu/serial'
import { storeHex } from '../src/mcu/avr/compile'
import { liveBoard } from '../src/mcu/board-chip'

const UNO = { x: -31, z: -1.5 }

function unoLayout(code: string, parts: ComponentInstance[], wires: Wire[], runtime = 'fast'): CircuitLayout {
  return {
    version: 1,
    board: 'half',
    components: [{ id: 'U1', type: 'arduino_uno', pos: UNO, params: { code, runtime } }, ...parts],
    wires,
  }
}

/** sample a net every `every` seconds for `seconds` */
function sample(engine: SimEngine, ref: string, seconds: number, every = 1e-3): { t: number; v: number }[] {
  const out: { t: number; v: number }[] = []
  const steps = Math.round(seconds / every)
  for (let i = 0; i < steps; i++) {
    engine.advance(every)
    out.push({ t: engine.time, v: engine.netVoltage(ref) })
  }
  return out
}

function transitions(samples: { t: number; v: number }[], threshold: number): number[] {
  const out: number[] = []
  for (let i = 1; i < samples.length; i++) {
    if (samples[i - 1].v < threshold !== samples[i].v < threshold) out.push(samples[i].t)
  }
  return out
}

describe('board bridge — Instant mode', () => {
  it('a GPIO write drives the node through the pin resistance', () => {
    const code = 'void setup() { pinMode(7, OUTPUT); digitalWrite(7, HIGH); }\nvoid loop() {}\n'
    const engine = new SimEngine(
      unoLayout(code, [{ id: 'R1', type: 'resistor', params: { resistance: 1000 }, holes: ['a10', 'top-8'] }], [
        { id: 'w1', from: 'U1:D7', to: 'c10' },
        { id: 'w2', from: 'U1:GND2', to: 'top-0' },
      ]),
    )
    engine.advance(0.02)
    // 5 V behind ~25 Ω into 1 kΩ
    expect(engine.netVoltage('c10')).toBeCloseTo((5 * 1000) / 1025, 2)
  })

  it('an input reads a voltage divider (analogRead and digitalRead)', () => {
    const code = `void setup() { Serial.begin(9600); }
void loop() { Serial.print(analogRead(A0)); Serial.print(" "); Serial.println(digitalRead(A0)); delay(10); }
`
    serialBus.clear('U1')
    const engine = new SimEngine(
      unoLayout(
        code,
        [
          { id: 'R1', type: 'resistor', params: { resistance: 10000 }, holes: ['a10', 'top+8'] },
          { id: 'R2', type: 'resistor', params: { resistance: 20000 }, holes: ['b10', 'top-8'] },
        ],
        [
          { id: 'w1', from: 'U1:5V', to: 'top+0' },
          { id: 'w2', from: 'U1:GND2', to: 'top-0' },
          { id: 'w3', from: 'U1:A0', to: 'c10' },
        ],
      ),
    )
    engine.advance(0.05)
    const lines = serialBus.read('U1').trim().split('\n')
    const [raw, dig] = lines[lines.length - 1].split(' ').map(Number)
    // 5 V · 20k / 30k = 3.33 V → 682 counts, above 0.6·Vcc → HIGH
    expect(raw).toBeGreaterThanOrEqual(679)
    expect(raw).toBeLessThanOrEqual(684)
    expect(dig).toBe(1)
  })

  it('PWM drives the average: analogWrite(9, 64) ≈ 1.25 V on average', () => {
    const code = 'void setup() { analogWrite(9, 64); }\nvoid loop() {}\n'
    const engine = new SimEngine(
      unoLayout(code, [{ id: 'R1', type: 'resistor', params: { resistance: 1000 }, holes: ['a10', 'top-8'] }], [
        { id: 'w1', from: 'U1:D9', to: 'c10' },
        { id: 'w2', from: 'U1:GND2', to: 'top-0' },
      ]),
    )
    engine.advance(0.01)
    const s = sample(engine, 'c10', 0.02, 5e-5)
    const avg = s.reduce((a, b) => a + b.v, 0) / s.length
    expect(avg).toBeGreaterThan(1.15)
    expect(avg).toBeLessThan(1.3)
    // and it really switches (a switched drive, not a steady level)
    expect(Math.max(...s.map((x) => x.v))).toBeGreaterThan(4.5)
    expect(Math.min(...s.map((x) => x.v))).toBeLessThan(0.2)
  })

  it('the Blink preset toggles the LED net once a second (sim time)', () => {
    const preset = presetById('blink')!
    expect(validateLayout(preset.layout).ok).toBe(true)
    const engine = new SimEngine(preset.layout)
    const s = sample(engine, 'a12', 3.2, 5e-3)
    const t = transitions(s, 2.5)
    // on from the start (after the 10 ms power-on reset), off at 1 s, on at 2 s, off at 3 s
    expect(t.length).toBe(4)
    expect(t[0]).toBeCloseTo(0.01, 2)
    expect(t[1] - t[0]).toBeCloseTo(1, 2)
    expect(t[2] - t[1]).toBeCloseTo(1, 2)
    expect(engine.telemetry().components.U1.mcu?.state).toBe('running')
  })

  it('the LED lights in the Blink preset (brightness from the solver)', () => {
    const engine = new SimEngine(presetById('blink')!.layout)
    engine.advance(0.5)
    expect(engine.telemetry().components.D1.ledBrightness ?? 0).toBeGreaterThan(0.8)
    engine.advance(1.0) // t = 1.5 s: off
    expect(engine.telemetry().components.D1.ledBrightness ?? 1).toBeLessThan(0.05)
  })

  it('5 V on a 3.3 V pin damages it, with a reason', () => {
    const engine = new SimEngine(presetById('esp32-trap')!.layout)
    engine.advance(0.3)
    const mcu = engine.telemetry().components.E1.mcu!
    expect(mcu.damage.some((d) => d.pin === 'D18')).toBe(true)
    expect(mcu.pins.D18).toBe('X')
    const issue = engine.issues.find((i) => i.componentId === 'E1' && i.message.includes('D18'))
    expect(issue?.message).toMatch(/3\.3 V board/)
  })

  it('a 3.3 V pin with a divider survives', () => {
    const preset = presetById('esp32-trap')!
    const layout: CircuitLayout = JSON.parse(JSON.stringify(preset.layout))
    // ECHO → 1 kΩ → D18 node, 2 kΩ to GND: 5 V · 2/3 = 3.3 V
    layout.wires = layout.wires.filter((w) => w.to !== 'E1:D18')
    layout.components.push(
      { id: 'R1', type: 'resistor', params: { resistance: 1000 }, holes: ['d19', 'd24'] },
      { id: 'R2', type: 'resistor', params: { resistance: 2000 }, holes: ['b24', 'top-20'] },
    )
    layout.wires.push({ id: 'wx', from: 'e24', to: 'E1:D18' })
    const engine = new SimEngine(layout)
    engine.advance(0.3)
    expect(engine.telemetry().components.E1.mcu!.damage).toEqual([])
  })

  it('the distance meter times the HC-SR04 echo to the cm', () => {
    serialBus.clear('U1')
    const engine = new SimEngine(presetById('distance')!.layout)
    engine.advance(0.6)
    const lines = serialBus.read('U1').trim().split('\n')
    expect(lines[0]).toMatch(/Distance: 25\.\d\d cm/)
    engine.setRuntimeParam('US1', 'distance', 120)
    engine.advance(0.6)
    const last = serialBus.read('U1').trim().split('\n').pop()!
    const cm = Number(/Distance: ([\d.]+)/.exec(last)?.[1])
    expect(cm).toBeGreaterThan(119)
    expect(cm).toBeLessThan(121)
  })

  it('the servo follows the potentiometer', () => {
    const engine = new SimEngine(presetById('servo')!.layout)
    engine.advance(0.6)
    const a1 = engine.telemetry().components.S1.angle!
    expect(a1).toBeGreaterThan(50) // knob at 0.3 → ~54°
    expect(a1).toBeLessThan(58)
    engine.setRuntimeParam('P1', 'position', 0.9)
    engine.advance(0.6)
    expect(engine.telemetry().components.S1.angle!).toBeGreaterThan(155)
  })

  it('the LCD shows the DHT22 reading over I²C', () => {
    const engine = new SimEngine(presetById('lcd')!.layout)
    engine.advance(2.2)
    const lines = engine.telemetry().components.LCD1.lines!
    expect(lines[0]).toBe('Temp: 22.5°C    ')
    expect(lines[1]).toBe('Humidity: 45%   ')
  })

  it('a miswired LCD (SDA missing) stays blank', () => {
    const layout: CircuitLayout = JSON.parse(JSON.stringify(presetById('lcd')!.layout))
    layout.wires = layout.wires.filter((w) => w.from !== 'LCD1:SDA')
    const engine = new SimEngine(layout)
    engine.advance(2.2)
    expect(engine.telemetry().components.LCD1.lines!.join('').trim()).toBe('')
  })

  it('forgetting pinMode(OUTPUT) only turns on the weak pull-up', () => {
    const code = 'void setup() { digitalWrite(13, HIGH); }\nvoid loop() {}\n'
    const engine = new SimEngine(
      unoLayout(code, [{ id: 'R1', type: 'resistor', params: { resistance: 1000 }, holes: ['a10', 'top-8'] }], [
        { id: 'w1', from: 'U1:D13', to: 'c10' },
        { id: 'w2', from: 'U1:GND2', to: 'top-0' },
      ]),
    )
    engine.advance(0.02)
    expect(engine.netVoltage('c10')).toBeLessThan(0.2) // ~35 kΩ pull-up into 1 kΩ
    expect(engine.issues.some((i) => /never set to OUTPUT/.test(i.message))).toBe(true)
  })

  it('every lesson preset validates and runs without solver trouble', () => {
    for (const p of PRESETS) {
      const res = validateLayout(p.layout)
      expect(res.errors, p.id).toEqual([])
      const engine = new SimEngine(p.layout)
      engine.advance(0.2)
      const bad = engine.issues.filter((i) => /singular|converge|numerical|failed|error:/i.test(i.message))
      expect(bad, p.id).toEqual([])
      if (p.id !== 'esp32-trap') expect(engine.issues.filter((i) => i.level === 'error'), p.id).toEqual([])
    }
  })
})

describe('board bridge — compiled mode (avr8js)', () => {
  const hex = (name: string) => readFileSync(resolve(__dirname, 'fixtures', `${name}.hex`), 'utf8')

  it('the compiled Blink toggles the LED net at 1 Hz and prints over the USART', () => {
    const preset = presetById('blink')!
    const layout: CircuitLayout = JSON.parse(JSON.stringify(preset.layout))
    const u1 = layout.components.find((c) => c.id === 'U1')!
    u1.params = { ...u1.params, runtime: 'avr' }
    storeHex('arduino_uno', String(u1.params.code), hex('blink-uno'))
    serialBus.clear('U1')
    const engine = new SimEngine(layout)
    expect(liveBoard('U1')?.runtime?.kind).toBe('avr')
    const s = sample(engine, 'a12', 2.6, 5e-3)
    const t = transitions(s, 2.5)
    expect(t.length).toBe(3)
    expect(t[1] - t[0]).toBeCloseTo(1, 2)
    expect(t[2] - t[1]).toBeCloseTo(1, 2)
    expect(serialBus.read('U1')).toContain('Blink started')
  }, 60000)

  it('the compiled sketch reads the ADC, a pull-up, and drives hardware PWM', () => {
    const code = 'inputs'
    storeHex('arduino_uno', code, hex('inputs-uno'))
    serialBus.clear('U1')
    const engine = new SimEngine(
      unoLayout(
        code,
        [
          { id: 'R1', type: 'resistor', params: { resistance: 10000 }, holes: ['a10', 'top+8'] },
          { id: 'R2', type: 'resistor', params: { resistance: 10000 }, holes: ['b10', 'top-8'] },
          { id: 'R3', type: 'resistor', params: { resistance: 1000 }, holes: ['a20', 'top-18'] },
        ],
        [
          { id: 'w1', from: 'U1:5V', to: 'top+0' },
          { id: 'w2', from: 'U1:GND2', to: 'top-0' },
          { id: 'w3', from: 'U1:A0', to: 'c10' },
          { id: 'w4', from: 'U1:D9', to: 'c20' },
        ],
        'avr',
      ),
    )
    engine.advance(0.25)
    const s = sample(engine, 'c20', 0.02, 5e-5)
    const avg = s.reduce((a, b) => a + b.v, 0) / s.length
    expect(avg).toBeGreaterThan(1.1) // 64/255 of 5 V ≈ 1.25 V
    expect(avg).toBeLessThan(1.4)
    const line = serialBus.read('U1').trim().split('\n').pop()!
    const m = /A0=(\d+) D2=(\d)/.exec(line)!
    expect(Number(m[1])).toBeGreaterThanOrEqual(509)
    expect(Number(m[1])).toBeLessThanOrEqual(514)
    expect(m[2]).toBe('1') // unconnected pin with INPUT_PULLUP reads HIGH
  }, 60000)

  it('the compiled LCD lesson drives the I²C LCD through the TWI peripheral', () => {
    const preset = presetById('lcd')!
    const layout: CircuitLayout = JSON.parse(JSON.stringify(preset.layout))
    const u1 = layout.components.find((c) => c.id === 'U1')!
    u1.params = { ...u1.params, runtime: 'avr' }
    storeHex('arduino_uno', String(u1.params.code), hex('lcd-uno'))
    const engine = new SimEngine(layout)
    engine.advance(0.6)
    expect(engine.telemetry().components.LCD1.lines![0]).toBe('Weather station ')
  }, 60000)
})
