/**
 * The second wave of boards: Pico 2 W, SparkFun RedBoard, Nano Every, Nano 33
 * BLE, Feather RP2040, D1 mini, MKR WiFi 1010, the TI MSP430 and Tiva C
 * LaunchPads, ST Nucleo-F401RE, micro:bit v2 (breakout) and the BeagleBone
 * Black (Python). Each reaches the catalog with a Specs sheet, fits the
 * bench or the breadboard, blinks its LED and drives a header pin; the
 * board-specific facts (Energia names, morpho twins, the Tiva's PD0–PB6 tie,
 * 5 V tolerance, the BeagleBone's 1.8 V ADC) are checked one by one.
 */
import { describe, expect, it } from 'vitest'
import { boardDef, type BoardDef } from '../src/model/boards'
import { getEntry } from '../src/model/catalog'
import { componentPinHoles, formatHole, offboardGeometry } from '../src/model/breadboard'
import { validateLayout } from '../src/model/validate'
import { specsFor } from '../src/model/specs'
import { pinChip, pinKind, pinLabel } from '../src/model/pin-labels'
import { presetById } from '../src/lessons/presets'
import { SimEngine } from '../src/sim/engine'
import { serialBus } from '../src/mcu/serial'
import type { CircuitLayout, ComponentInstance, Wire } from '../src/model/types'
import { wireEndStyle } from '../src/three/internal/wires'

const ARDUINO_STYLE = [
  'rpi_pico2_w', 'sparkfun_redboard', 'arduino_nano_every', 'arduino_nano_33_ble', 'feather_rp2040', 'wemos_d1_mini',
  'arduino_mkr_wifi1010', 'msp_exp430g2et', 'ek_tm4c123gxl', 'nucleo_f401re', 'microbit_v2',
]
const ALL_NEW = [...ARDUINO_STYLE, 'beaglebone_black']

function place(b: BoardDef): Partial<ComponentInstance> {
  if (b.placement === 'offboard') return { pos: { x: -(Math.ceil(offboardGeometry(b.type)!.rect.x1) + 4), z: -2 } }
  return { at: b.footprint![0].row + '5' }
}

function layoutWith(b: BoardDef, code: string, extra: { pin: string } | null = null, runtime = b.runtimes[0]): CircuitLayout {
  const comps: ComponentInstance[] = [{ id: 'B1', type: b.type, ...place(b), params: { code, runtime } } as ComponentInstance]
  const wires: Wire[] = []
  if (extra && b.placement === 'offboard') {
    comps.push({ id: 'R1', type: 'resistor', params: { resistance: 10000 }, holes: ['a50', 'a55'] } as ComponentInstance)
    wires.push({ id: 'w1', from: `B1:${extra.pin}`, to: 'b50' } as Wire, { id: 'w2', from: `B1:${b.ground}`, to: 'b55' } as Wire)
  }
  return { version: 1, board: 'standard', components: comps, wires } as CircuitLayout
}

function pinRef(b: BoardDef, pin: string): string {
  if (b.placement === 'offboard') return 'c50'
  const comp = { id: 'B1', type: b.type, ...place(b) } as ComponentInstance
  const holes = componentPinHoles(comp, getEntry(b.type)!)!
  return formatHole(holes[b.pins.indexOf(pin)]!)
}

function outputPin(b: BoardDef): { n: number; pin: string } {
  const supplies = new Set(b.supplies.map((s) => s.pin))
  for (const [n, pin] of Object.entries(b.gpio)) {
    if (!b.pins.includes(pin) || b.inputOnly.includes(pin) || supplies.has(pin) || pin === b.ledPin) continue
    if (pin === b.i2c.sda || pin === b.i2c.scl) continue
    // a pin tied to another on the board (Tiva PD0–PB6) would fight its twin
    if (b.bridges.some(([x, y]) => (x === pin || y === pin) && b.pins.includes(x === pin ? y : x) && Object.values(b.gpio).includes(x === pin ? y : x))) continue
    return { n: Number(n), pin }
  }
  throw new Error(`${b.type}: no output pin`)
}

describe('more boards II: static facts', () => {
  it('every new board is registered with a catalog entry and a Specs sheet', () => {
    for (const t of ALL_NEW) {
      const b = boardDef(t)
      expect(b, t).toBeTruthy()
      const e = getEntry(t)!
      expect(e.category, t).toBe('board')
      expect(e.pins).toEqual(b!.pins)
      expect(specsFor(t)!.groups.length, t).toBeGreaterThan(0)
      const v = validateLayout(layoutWith(b!, b!.runtimes[0] === 'python' ? 'pass\n' : 'void setup() {}\nvoid loop() {}\n'))
      expect(v.errors, t).toEqual([])
    }
  })

  it('header types: Nucleo sockets take male ends, its morpho pins female ends; BeagleBone sockets', () => {
    const n = boardDef('nucleo_f401re')!
    const l = layoutWith(n, '')
    expect(wireEndStyle(l, 'B1:D13').kind).toBe('socket')
    expect(wireEndStyle(l, 'B1:A0').kind).toBe('socket')
    expect(wireEndStyle(l, 'B1:PC10').kind).toBe('pin')
    expect(wireEndStyle(l, 'B1:PA5').kind).toBe('pin')
    expect(wireEndStyle(layoutWith(boardDef('beaglebone_black')!, ''), 'B1:P8_10').kind).toBe('socket')
    expect(wireEndStyle(layoutWith(boardDef('ek_tm4c123gxl')!, ''), 'B1:PF1').kind).toBe('pin')
  })

  it('pin names print as on the boards (P1.0, PF1, P8_10 → 10) and colour by kind', () => {
    const msp = boardDef('msp_exp430g2et')!
    expect(pinLabel('P1_0', msp)).toBe('P1.0')
    expect(pinKind('P1_0', msp)).toBe('digital')
    expect(pinKind('P1_2', msp)).toBe('pwm')
    const bbb = boardDef('beaglebone_black')!
    expect(pinLabel('P8_10', bbb)).toBe('10')
    expect(pinChip('P9_14', bbb)).toBe('P9_14 · EHRPWM1A · GPIO 50')
    expect(pinKind('P9_39', bbb)).toBe('analog')
    expect(pinKind('P9_20', bbb)).toBe('bus')
    expect(pinKind('VDD_ADC', bbb)).toBe('power')
    expect(pinKind('GNDA_ADC', bbb)).toBe('gnd')
    const mb = boardDef('microbit_v2')!
    expect(pinKind('3V', mb)).toBe('power')
    expect(pinLabel('P0', mb)).toBe('P0')
  })

  it('LaunchPads follow the BoosterPack numbering (J1 1–10, J2 11–20, J3 21–30, J4 31–40)', () => {
    const msp = boardDef('msp_exp430g2et')!
    expect([2, 6, 14, 15, 19].map((n) => msp.gpio[n])).toEqual(['P1_0', 'P1_4', 'P1_6', 'P1_7', 'P2_6'])
    const tiva = boardDef('ek_tm4c123gxl')!
    expect([30, 40, 39, 31, 17].map((n) => tiva.gpio[n])).toEqual(['PF1', 'PF2', 'PF3', 'PF4', 'PF0'])
    expect(tiva.pins.slice(0, 10)).toEqual(['3V3', 'PB5', 'PB0', 'PB1', 'PE4', 'PE5', 'PB4', 'PA5', 'PA6', 'PA7'])
    expect(tiva.pinAliases!.RED_LED).toBe(30)
    expect(tiva.adc.PE3).toBe(0)
    expect(tiva.gpio[tiva.analogAlias.A0]).toBe('PE3')
  })

  it('Nucleo-F401RE: every Arduino socket is bridged to its morpho twin', () => {
    const n = boardDef('nucleo_f401re')!
    expect(n.bridges).toContainEqual(['D13', 'PA5'])
    expect(n.bridges).toContainEqual(['A0', 'PA0'])
    expect(n.pins.filter((p) => /^P[A-H]\d+$/.test(p)).length).toBeGreaterThan(45)
    expect(n.pins.length).toBe(31 + 76)
  })
})

describe('more boards II: Instant mode', () => {
  for (const t of ARDUINO_STYLE) {
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

  it('Energia names on the LaunchPads: P1_4, RED_LED, PF_2', () => {
    const msp = boardDef('msp_exp430g2et')!
    const e1 = new SimEngine(layoutWith(msp, 'void setup() { pinMode(P1_4, OUTPUT); digitalWrite(P1_4, HIGH); pinMode(RED_LED, OUTPUT); digitalWrite(RED_LED, HIGH); }\nvoid loop() {}\n', { pin: 'P1_4' }))
    e1.advance(0.05)
    expect(e1.netVoltage('c50')).toBeGreaterThan(3.0)
    expect(e1.telemetry().components.B1.mcu!.pins.P1_6).toBe('H')
    const tiva = boardDef('ek_tm4c123gxl')!
    const e2 = new SimEngine(layoutWith(tiva, 'void setup() { pinMode(PF_2, OUTPUT); digitalWrite(PF_2, HIGH); pinMode(PB5, OUTPUT); digitalWrite(PB5, HIGH); }\nvoid loop() {}\n', { pin: 'PB5' }))
    e2.advance(0.05)
    expect(e2.netVoltage('c50')).toBeGreaterThan(3.0)
    expect(e2.telemetry().components.B1.mcu!.pins.PF2).toBe('H')
  })

  it('Tiva: PD0 is tied to PB6 on the board — driving PB6 shows up on PD0', () => {
    const tiva = boardDef('ek_tm4c123gxl')!
    const engine = new SimEngine(layoutWith(tiva, 'void setup() { pinMode(PB6, OUTPUT); digitalWrite(PB6, HIGH); }\nvoid loop() {}\n', { pin: 'PD0' }))
    engine.advance(0.05)
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
  })

  it('Tiva: a digital pin takes 5 V, PB0 (not 5 V tolerant) is damaged', () => {
    const tiva = boardDef('ek_tm4c123gxl')!
    const layout = layoutWith(tiva, 'void setup() { pinMode(PB0, INPUT); pinMode(PC4, INPUT); }\nvoid loop() {}\n')
    layout.wires.push({ id: 'p1', from: 'B1:5V', to: 'a40' } as Wire, { id: 'p2', from: 'b40', to: 'B1:PB0' } as Wire, { id: 'p3', from: 'c40', to: 'B1:PC4' } as Wire)
    const engine = new SimEngine(layout)
    engine.advance(0.05)
    const dmg = engine.telemetry().components.B1.mcu!.damage.map((d) => d.pin)
    expect(dmg).toContain('PB0')
    expect(dmg).not.toContain('PC4')
  })

  it('Nucleo: D13 (PA5) drives its morpho twin; port names work in sketches', () => {
    const n = boardDef('nucleo_f401re')!
    const engine = new SimEngine(layoutWith(n, 'void setup() { pinMode(PA5, OUTPUT); digitalWrite(PA5, HIGH); pinMode(PC10, OUTPUT); digitalWrite(PC10, HIGH); }\nvoid loop() {}\n', { pin: 'PA5' }))
    engine.advance(0.05)
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
    const mcu = engine.telemetry().components.B1.mcu!
    expect(mcu.led).toBe(true)
    expect(mcu.pins.PC10).toBe('H')
  })

  it('D1 mini knows D0…D8 as GPIO numbers', () => {
    const d1 = boardDef('wemos_d1_mini')!
    const engine = new SimEngine(layoutWith(d1, 'void setup() { pinMode(D5, OUTPUT); digitalWrite(D5, HIGH); }\nvoid loop() {}\n', { pin: 'D5' }))
    engine.advance(0.05)
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
  })
})

describe('BeagleBone Black: Python with Adafruit_BBIO', () => {
  const bbb = boardDef('beaglebone_black')!

  it('blinks P8_10 and prints to the serial monitor', () => {
    const code = 'import Adafruit_BBIO.GPIO as GPIO\nimport time\nGPIO.setup("P8_10", GPIO.OUT)\nprint("go")\nwhile True:\n    GPIO.output("P8_10", GPIO.HIGH)\n    time.sleep(0.5)\n    GPIO.output("P8_10", GPIO.LOW)\n    time.sleep(0.5)\n'
    serialBus.clear('B1')
    const engine = new SimEngine(layoutWith(bbb, code, { pin: 'P8_10' }))
    engine.advance(0.25)
    expect(engine.telemetry().components.B1.mcu!.runtime).toBe('python')
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
    engine.advance(0.5)
    expect(engine.netVoltage('c50')).toBeLessThan(0.2)
    expect(serialBus.read('B1')).toBe('go\n')
  })

  it('ADC.read on AIN0 (P9_39) is 0.0–1.0 over 0–1.8 V; gpiozero is not there', () => {
    // a 1:1 divider from VDD_ADC (1.8 V) → 0.9 V on AIN0
    const code = 'import Adafruit_BBIO.ADC as ADC\nimport time\nADC.setup()\ntime.sleep(0.05)\nprint(round(ADC.read("P9_39"), 2))\nwhile True:\n    time.sleep(1)\n'
    const layout = layoutWith(bbb, code)
    layout.components.push(
      { id: 'R1', type: 'resistor', params: { resistance: 10000 }, holes: ['a40', 'a45'] } as ComponentInstance,
      { id: 'R2', type: 'resistor', params: { resistance: 10000 }, holes: ['b45', 'b50'] } as ComponentInstance,
    )
    layout.wires.push(
      { id: 'w1', from: 'B1:VDD_ADC', to: 'c40' } as Wire,
      { id: 'w2', from: 'B1:P9_39', to: 'c45' } as Wire,
      { id: 'w3', from: 'B1:GNDA_ADC', to: 'c50' } as Wire,
    )
    serialBus.clear('B1')
    const engine = new SimEngine(layout)
    engine.advance(0.2)
    expect(engine.telemetry().components.B1.mcu!.damage).toEqual([])
    expect(serialBus.read('B1')).toBe('0.5\n')
    expect(new SimEngine(layoutWith(bbb, 'from gpiozero import LED\n')).telemetry).toBeTruthy()
  })

  it('3.3 V on an AIN pin damages it (1.8 V maximum)', () => {
    const layout = layoutWith(bbb, 'import time\nwhile True:\n    time.sleep(1)\n')
    layout.wires.push({ id: 'w1', from: 'B1:3V3', to: 'a40' } as Wire, { id: 'w2', from: 'B1:P9_40', to: 'b40' } as Wire)
    const engine = new SimEngine(layout)
    engine.advance(0.05)
    const dmg = engine.telemetry().components.B1.mcu!.damage
    expect(dmg.map((d) => d.pin)).toContain('P9_40')
    expect(dmg.find((d) => d.pin === 'P9_40')!.reason).toMatch(/at most 1.8 V/)
  })

  it('importing gpiozero on a BeagleBone says to use Adafruit_BBIO', () => {
    serialBus.clear('B1')
    const engine = new SimEngine(layoutWith(bbb, 'from gpiozero import LED\n'))
    engine.advance(0.05)
    expect(engine.telemetry().components.B1.mcu!.error).toMatch(/Adafruit_BBIO/)
  })
})

describe('more boards II: lessons', () => {
  it('launchpad-blink, microbit-blink and beaglebone-blink validate and run', () => {
    for (const [id, ref] of [['launchpad-blink', 'c12'], ['microbit-blink', 'c30'], ['beaglebone-blink', 'c12']] as const) {
      const p = presetById(id)!
      expect(p, id).toBeTruthy()
      expect(validateLayout(p.layout).errors, id).toEqual([])
      const engine = new SimEngine(p.layout)
      engine.advance(0.25)
      const board = p.layout.components.find((c) => boardDef(c.type))!
      const mcu = engine.telemetry().components[board.id].mcu!
      expect(mcu.state, `${id}: ${mcu.error}`).toBe('running')
      // the micro:bit's weak pin driver sags a little under the LED's current
      expect(engine.netVoltage(ref), id).toBeGreaterThan(2.7)
    }
  })
})
