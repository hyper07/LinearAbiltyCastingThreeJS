/**
 * Python mode (src/mcu/python): the teaching subset of Python, gpiozero and
 * RPi.GPIO on a Raspberry Pi, all in simulated time — Blink toggles GPIO17's
 * net at the right times, a Button reads a pushbutton, PWM duty shows as the
 * net's average, print() reaches the serial monitor, errors name their line.
 */
import { describe, expect, it } from 'vitest'
import { boardDef } from '../src/model/boards'
import { offboardGeometry } from '../src/model/breadboard'
import { PythonRuntime, checkPython } from '../src/mcu/python/runtime'
import type { McuIO, PinMode } from '../src/mcu/types'
import { SimEngine } from '../src/sim/engine'
import { serialBus } from '../src/mcu/serial'
import { BOOT_TIME } from '../src/mcu/board-chip'
import { PYTHON_EXAMPLES } from '../src/mcu/python/examples'
import { presetById } from '../src/lessons/presets'
import { validateLayout } from '../src/model/validate'
import { specsFor } from '../src/model/specs'
import { pinChip, pinLabel } from '../src/model/pin-labels'
import { getEntry } from '../src/model/catalog'
import { PI_HEADER } from '../src/model/boards'
import type { CircuitLayout, ComponentInstance, Wire } from '../src/model/types'

// ------------------------------------------------- the language, no circuit

class FakeIO implements McuIO {
  readonly board = boardDef('rpi4')!
  out = ''
  warnings: string[] = []
  levels = new Map<string, boolean>()
  modes = new Map<string, PinMode>()
  inputs = new Map<string, boolean>()
  pwms = new Map<string, number>()
  pinMode(pin: string, mode: PinMode): void {
    this.modes.set(pin, mode)
  }
  digitalWrite(pin: string, high: boolean): void {
    this.levels.set(pin, high)
  }
  pwm(pin: string, duty: number): void {
    this.pwms.set(pin, duty)
  }
  servo(): void {}
  tone(): void {}
  digitalRead(pin: string): boolean {
    return this.inputs.get(pin) ?? (this.modes.get(pin) === 'pullup')
  }
  voltage(): number {
    return NaN
  }
  edgesOn() {
    return []
  }
  i2cWrite(): boolean {
    return false
  }
  i2cRead(): null {
    return null
  }
  neopixel(): boolean {
    return false
  }
  dht(): null {
    return null
  }
  serialWrite(text: string): void {
    this.out += text
  }
  warn(m: string): void {
    this.warnings.push(m)
  }
}

function runPy(code: string, seconds = 0.01, io = new FakeIO()): { rt: PythonRuntime; io: FakeIO } {
  const rt = new PythonRuntime('rpi4', code)
  const dt = 5e-5
  for (let t = 0; t < seconds - 1e-12; t += dt) rt.run(t, t + dt, io)
  return { rt, io }
}
const out = (code: string, seconds = 0.01) => runPy(code, seconds).io.out.replace('[program finished]\n', '')

describe('Python language subset', () => {
  it('arithmetic, ints and floats print like Python', () => {
    expect(out('print(7 // 2, 7 / 2, 7 % 3, -7 // 2, 2 ** 10, 10 / 2, 0.1 + 0.2)')).toBe('3 3.5 1 -4 1024 5.0 0.30000000000000004\n')
    expect(out('print(True + 1, round(2.5), round(3.5), round(3.14159, 2), abs(-3), int("42") + 1, float("2.5"))')).toBe('2 2 4 3.14 3 43 2.5\n')
  })

  it('strings: f-strings, %, format, methods, slicing', () => {
    expect(out('v = 3.14159\nn = 7\nprint(f"{n} items at {v:.2f} V, {n:03d}|{\'hi\':>4}|{n=}")')).toBe('7 items at 3.14 V, 007|  hi|n=7\n')
    expect(out('print("%d LEDs, %.1f%%" % (3, 99.5), "{} and {:.1f}".format("a", 2))')).toBe('3 LEDs, 99.5% a and 2.0\n')
    expect(out('s = "Hello Pi"\nprint(s.upper(), s[0], s[-2:], s[::-1], s.split(), ",".join(["a", "b"]), len(s))')).toBe("HELLO PI H Pi iP olleH ['Hello', 'Pi'] a,b 8\n")
  })

  it('lists, dicts, tuples, comprehensions, loops', () => {
    const code = [
      'xs = [3, 1, 2]',
      'xs.append(5)',
      'xs.sort()',
      'd = {"red": 17, "green": 27}',
      'd["blue"] = 22',
      'total = 0',
      'for i in range(1, 4):',
      '    total += i',
      'a, b = 1, 2',
      'a, b = b, a',
      'sq = [x * x for x in xs if x > 1]',
      'for name, pin in d.items():',
      '    print(name, pin, end="; ")',
      'print()',
      'print(xs, total, a, b, sq, list(enumerate("ab")), max(xs), sum(xs), 2 in xs, (1, 2))',
    ].join('\n')
    expect(out(code)).toBe("red 17; green 27; blue 22; \n[1, 2, 3, 5] 6 2 1 [4, 9, 25] [(0, 'a'), (1, 'b')] 5 11 True (1, 2)\n")
  })

  it('def, defaults, keywords, recursion, global, while / break / continue, try / except', () => {
    const code = [
      'count = 0',
      'def bump(step=1):',
      '    global count',
      '    count += step',
      '    return count',
      'def fact(n):',
      '    return 1 if n <= 1 else n * fact(n - 1)',
      'bump()',
      'bump(step=5)',
      'i = 0',
      'while True:',
      '    i += 1',
      '    if i % 2 == 0:',
      '        continue',
      '    if i > 6:',
      '        break',
      'try:',
      '    x = 1 / 0',
      'except ZeroDivisionError as e:',
      '    print("caught:", e)',
      'finally:',
      '    print("finally")',
      'print(count, fact(5), i)',
    ].join('\n')
    expect(out(code)).toBe('caught: division by zero\nfinally\n6 120 7\n')
  })

  it('syntax errors name the line and say what is wrong', () => {
    expect(checkPython('x = 1\nif x = 1:\n    print(x)\n')).toMatchObject({ ok: false, line: 2 })
    expect(checkPython('x = 1\nif x == 1\n    print(x)\n').message).toMatch(/expected ':'/)
    expect(checkPython('def f():\nprint(1)\n')).toMatchObject({ ok: false, line: 2 })
    expect(checkPython('class Foo:\n    pass\n').message).toMatch(/classes .* not supported/)
    expect(checkPython('print("hi)\n')).toMatchObject({ ok: false, line: 1 })
    expect(checkPython('from gpiozero import LED\nled = LED(17)\nled.on()\n').ok).toBe(true)
  })

  it('runtime errors stop the program with a traceback and the line', () => {
    const { rt, io } = runPy('x = 1\nprint("before")\nprint("count: " + x)\n')
    expect(rt.state).toBe('error')
    expect(rt.error).toMatch(/^Line 3: TypeError: can only concatenate str/)
    expect(io.out).toContain('Traceback (most recent call last):')
    expect(io.out).toContain('line 3')
    const n = runPy('print(valeu)\n')
    expect(n.rt.error).toMatch(/Line 1: NameError: name 'valeu' is not defined/)
    expect(runPy('from time import sleep\nsleep(1)\nimport numpy\n', 2).rt.error).toMatch(/Line 3: ModuleNotFoundError: No module named 'numpy'/)
    expect(runPy('led.on()\n').rt.error).toMatch(/NameError/)
  })

  it('a missing () is a teaching warning, not a silent no-op', () => {
    const { io } = runPy('from gpiozero import LED\nled = LED(17)\nled.on\n')
    expect(io.warnings.some((w) => /led\.on.*led\.on\(\)/.test(w))).toBe(true)
  })

  it('time.sleep advances simulated time exactly; time.time / monotonic follow it', () => {
    const { io } = runPy('import time\nt0 = time.monotonic()\ntime.sleep(0.25)\nprint(round(time.monotonic() - t0, 4))\n', 0.3)
    expect(io.out).toBe('0.25\n[program finished]\n')
  })

  it('input() waits for a line from the serial monitor', () => {
    const io = new FakeIO()
    const rt = new PythonRuntime('rpi4', 'name = input("Name? ")\nprint("Hi", name)\n')
    for (let t = 0; t < 0.01; t += 5e-5) rt.run(t, t + 5e-5, io)
    expect(io.out).toBe('Name? ')
    rt.serialIn('Ada\n')
    for (let t = 0.01; t < 0.02; t += 5e-5) rt.run(t, t + 5e-5, io)
    expect(io.out).toBe('Name? Ada\nHi Ada\n[program finished]\n')
  })

  it('RPi.GPIO: setmode first, output needs setup, BOARD numbers map to BCM pins', () => {
    expect(runPy('import RPi.GPIO as GPIO\nGPIO.setup(17, GPIO.OUT)\n').rt.error).toMatch(/Line 2: RuntimeError: Please set pin numbering mode/)
    expect(runPy('import RPi.GPIO as GPIO\nGPIO.setmode(GPIO.BCM)\nGPIO.output(17, 1)\n').rt.error).toMatch(/not been set up as an OUTPUT/)
    const { io } = runPy('import RPi.GPIO as GPIO\nGPIO.setmode(GPIO.BOARD)\nGPIO.setup(11, GPIO.OUT)\nGPIO.output(11, GPIO.HIGH)\nwhile True:\n    pass\n')
    expect(io.levels.get('GPIO17')).toBe(true)
    expect(runPy('import RPi.GPIO as GPIO\nGPIO.setmode(GPIO.BOARD)\nGPIO.setup(2, GPIO.OUT)\n').rt.error).toMatch(/physical pin 2 is 5V/)
  })

  it('gpiozero: one device per pin, closed at the end of the program', () => {
    expect(runPy('from gpiozero import LED\na = LED(17)\nb = LED(17)\n').rt.error).toMatch(/GPIOPinInUse/)
    const { rt, io } = runPy('from gpiozero import LED\nled = LED(17)\nled.on()\n')
    expect(rt.state).toBe('stopped')
    expect(io.modes.get('GPIO17')).toBe('input') // the script ended: the pin floats again
    expect(io.out).toContain('[program finished]')
  })
})

// ------------------------------------------------- on the bench, in the circuit

function piLayout(code: string, extra: { comps?: ComponentInstance[]; wires?: Wire[] } = {}): CircuitLayout {
  const geo = offboardGeometry('rpi4')!
  const comps: ComponentInstance[] = [
    { id: 'P1', type: 'rpi4', pos: { x: -(Math.ceil(geo.rect.x1) + 4), z: -4 }, params: { code, runtime: 'python' } } as ComponentInstance,
    { id: 'R1', type: 'resistor', params: { resistance: 10000 }, holes: ['a50', 'a55'] } as ComponentInstance,
    ...(extra.comps ?? []),
  ]
  const wires: Wire[] = [
    { id: 'w1', from: 'P1:GPIO17', to: 'b50' },
    { id: 'w2', from: 'P1:GND', to: 'b55' },
    ...(extra.wires ?? []),
  ] as Wire[]
  return { version: 1, board: 'standard', components: comps, wires } as CircuitLayout
}

describe('Python on a Raspberry Pi in the circuit', () => {
  it('gpiozero Blink toggles GPIO17 once a second', () => {
    const code = 'from gpiozero import LED\nfrom time import sleep\nled = LED(17)\nwhile True:\n    led.on()\n    sleep(1)\n    led.off()\n    sleep(1)\n'
    const engine = new SimEngine(piLayout(code))
    const v: number[] = []
    for (const at of [0.5, 1.5, 2.5, 3.5]) {
      engine.advance(at - engine.time)
      const mcu = engine.telemetry().components.P1.mcu!
      expect(mcu.state, mcu.error).toBe('running')
      expect(mcu.runtime).toBe('python')
      v.push(engine.netVoltage('c50'))
    }
    expect(v[0]).toBeGreaterThan(3.0)
    expect(v[1]).toBeLessThan(0.2)
    expect(v[2]).toBeGreaterThan(3.0)
    expect(v[3]).toBeLessThan(0.2)
  })

  it('the edge lands at the right simulated time (±1 ms)', () => {
    const code = 'from gpiozero import LED\nfrom time import sleep\nled = LED(17)\nsleep(0.2)\nled.on()\nsleep(0.3)\nled.off()\nsleep(10)\n'
    const engine = new SimEngine(piLayout(code))
    // the program starts after the power-on reset (BOOT_TIME)
    engine.advance(BOOT_TIME + 0.198)
    expect(engine.netVoltage('c50')).toBeLessThan(0.2)
    engine.advance(0.004)
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
    engine.advance(0.296)
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
    engine.advance(0.004)
    expect(engine.netVoltage('c50')).toBeLessThan(0.2)
  })

  it('RPi.GPIO blink in BOARD numbering drives the same pin', () => {
    const code = 'import RPi.GPIO as GPIO\nimport time\nGPIO.setmode(GPIO.BOARD)\nGPIO.setup(11, GPIO.OUT)\ntry:\n    while True:\n        GPIO.output(11, GPIO.HIGH)\n        time.sleep(0.5)\n        GPIO.output(11, GPIO.LOW)\n        time.sleep(0.5)\nexcept KeyboardInterrupt:\n    GPIO.cleanup()\n'
    const engine = new SimEngine(piLayout(code))
    engine.advance(0.25)
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
    engine.advance(0.5)
    expect(engine.netVoltage('c50')).toBeLessThan(0.2)
  })

  it('a gpiozero Button reads a pushbutton (pressed = LOW with the pull-up) and fires when_pressed', () => {
    const code = [
      'from gpiozero import LED, Button',
      'from signal import pause',
      'led = LED(17)',
      'button = Button(27)',
      'presses = 0',
      'def pressed():',
      '    global presses',
      '    presses += 1',
      '    print("pressed", presses)',
      'button.when_pressed = pressed',
      'button.when_released = led.off',
      'while True:',
      '    if button.is_pressed:',
      '        led.on()',
      '    else:',
      '        led.off()',
    ].join('\n')
    const layout = piLayout(code, {
      comps: [{ id: 'S1', type: 'pushbutton', at: 'f20' } as ComponentInstance],
      wires: [
        { id: 'w3', from: 'P1:GPIO27', to: 'j20' },
        { id: 'w4', from: 'P1:GND2', to: 'j22' },
      ] as Wire[],
    })
    serialBus.clear('P1')
    const engine = new SimEngine(layout)
    engine.advance(0.1)
    expect(engine.telemetry().components.P1.mcu!.state).toBe('running')
    expect(engine.netVoltage('c50')).toBeLessThan(0.2)
    engine.setRuntimeParam('S1', 'pressed', true)
    engine.advance(0.1)
    expect(engine.netVoltage('j20')).toBeLessThan(0.3)
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
    engine.setRuntimeParam('S1', 'pressed', false)
    engine.advance(0.1)
    expect(engine.netVoltage('c50')).toBeLessThan(0.2)
    engine.setRuntimeParam('S1', 'pressed', true)
    engine.advance(0.1)
    expect(serialBus.read('P1')).toBe('pressed 1\npressed 2\n')
  })

  it('wait_for_press blocks until the button goes down', () => {
    const code = 'from gpiozero import Button, LED\nbutton = Button(27)\nled = LED(17)\nprint("waiting")\nbutton.wait_for_press()\nled.on()\nprint("go")\nwhile True:\n    pass\n'
    const layout = piLayout(code, {
      comps: [{ id: 'S1', type: 'pushbutton', at: 'f20' } as ComponentInstance],
      wires: [{ id: 'w3', from: 'P1:GPIO27', to: 'j20' }, { id: 'w4', from: 'P1:GND2', to: 'j22' }] as Wire[],
    })
    serialBus.clear('P1')
    const engine = new SimEngine(layout)
    engine.advance(0.3)
    expect(engine.netVoltage('c50')).toBeLessThan(0.2)
    expect(serialBus.read('P1')).toBe('waiting\n')
    engine.setRuntimeParam('S1', 'pressed', true)
    engine.advance(0.05)
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
    expect(serialBus.read('P1')).toBe('waiting\ngo\n')
  })

  it('PWM duty shows as the net average: PWMLED.value and RPi.GPIO ChangeDutyCycle', () => {
    for (const code of [
      'from gpiozero import PWMLED\nfrom signal import pause\nled = PWMLED(17)\nled.value = 0.25\npause()\n',
      'import RPi.GPIO as GPIO\nimport time\nGPIO.setmode(GPIO.BCM)\nGPIO.setup(17, GPIO.OUT)\np = GPIO.PWM(17, 100)\np.start(0)\np.ChangeDutyCycle(25)\nwhile True:\n    time.sleep(1)\n',
    ]) {
      const engine = new SimEngine(piLayout(code))
      engine.advance(0.1)
      let sum = 0
      const n = 400 // 20 ms = two 100 Hz periods
      for (let i = 0; i < n; i++) {
        engine.advance(5e-5)
        sum += engine.netVoltage('c50')
      }
      const avg = sum / n
      expect(avg, code).toBeGreaterThan(3.3 * 0.25 - 0.15)
      expect(avg, code).toBeLessThan(3.3 * 0.25 + 0.15)
    }
  })

  it('blink() runs in the background while the program goes on', () => {
    const code = 'from gpiozero import LED\nfrom signal import pause\nled = LED(17)\nled.blink(on_time=0.1, off_time=0.1)\nprint("blinking")\npause()\n'
    serialBus.clear('P1')
    const engine = new SimEngine(piLayout(code))
    engine.advance(0.05)
    expect(serialBus.read('P1')).toBe('blinking\n')
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
    engine.advance(0.1)
    expect(engine.netVoltage('c50')).toBeLessThan(0.2)
    engine.advance(0.1)
    expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
  })

  it('print() reaches the serial monitor; a crash shows the traceback there too', () => {
    serialBus.clear('P1')
    const engine = new SimEngine(piLayout('for i in range(3):\n    print("tick", i)\nprint(1 / 0)\n'))
    engine.advance(0.05)
    expect(serialBus.read('P1')).toMatch(/^tick 0\ntick 1\ntick 2\nTraceback \(most recent call last\):\n {2}File "main.py", line 3, in <module>\n {4}print\(1 \/ 0\)\nZeroDivisionError: division by zero\n$/)
    const mcu = engine.telemetry().components.P1.mcu!
    expect(mcu.state).toBe('error')
    expect(mcu.error).toBe('Line 3: ZeroDivisionError: division by zero')
  })

  it('5 V on a GPIO damages the pin (the Pi is not 5 V tolerant)', () => {
    const code = 'from gpiozero import Button\nfrom signal import pause\nb = Button(27, pull_up=False)\npause()\n'
    const layout = piLayout(code, { wires: [{ id: 'w5', from: 'P1:5V', to: 'j30' }, { id: 'w6', from: 'P1:GPIO27', to: 'i30' }] as Wire[] })
    const engine = new SimEngine(layout)
    engine.advance(0.05)
    const dmg = engine.telemetry().components.P1.mcu!.damage.map((d) => d.pin)
    expect(dmg).toContain('GPIO27')
  })
})

describe('Raspberry Pi boards', () => {
  const PIS = ['rpi5', 'rpi4', 'rpi3bplus', 'rpi_zero2w']

  it('the 40-pin header: physical numbers, BCM names, power pins, 3.3 V, no ADC', () => {
    for (const t of PIS) {
      const b = boardDef(t)!
      expect(b.pins).toEqual(PI_HEADER)
      expect(b.runtimes).toEqual(['python'])
      expect(b.logicV).toBe(3.3)
      expect(b.fiveVoltTolerant ?? []).toEqual([])
      expect(Object.keys(b.adc)).toEqual([])
      expect(b.header).toBe('male')
      expect([1, 2, 6, 11, 12, 17, 39, 40].map((n) => b.pins[n - 1])).toEqual(['3V3', '5V', 'GND', 'GPIO17', 'GPIO18', '3V32', 'GND8', 'GPIO21'])
      expect(b.pins.filter((p) => /^GPIO\d+$/.test(p)).length).toBe(28)
      expect(b.pinNumbers!.GPIO17).toBe(11)
      expect(pinChip('GPIO17', b)).toBe('GPIO17 · pin 11')
      expect(pinChip('GPIO2', b)).toBe('GPIO2 · SDA1 · pin 3')
      expect(pinChip('5V2', b)).toBe('5V · pin 4')
      expect(pinLabel('GPIO17', b)).toBe('17')
      // pin 1 on the inner row, pin 2 on the board edge, 0.1" apart
      const g = offboardGeometry(t)!
      expect(g.terminals[1].dz).toBeLessThan(g.terminals[0].dz)
      expect(g.terminals[2].dx - g.terminals[0].dx).toBeCloseTo(1, 6)
      expect(g.terminals[0].dx).toBeCloseTo(8.37 / 2.54, 3)
      expect(getEntry(t)!.params!.find((p) => p.key === 'runtime')!.default).toBe('python')
      expect(String(getEntry(t)!.params!.find((p) => p.key === 'code')!.default)).toMatch(/from gpiozero import LED/)
      const rows = specsFor(t)!.groups.flatMap((gr) => gr.rows)
      expect(rows.some(([k, v]) => /Analog/.test(k) && /none/.test(v))).toBe(true)
    }
  })

  for (const t of PIS) {
    it(`${t}: the default program blinks GPIO17`, () => {
      const geo = offboardGeometry(t)!
      const layout = {
        version: 1,
        board: 'standard',
        components: [
          { id: 'P1', type: t, pos: { x: -(Math.ceil(geo.rect.x1) + 4), z: -4 } },
          { id: 'R1', type: 'resistor', params: { resistance: 10000 }, holes: ['a50', 'a55'] },
        ],
        wires: [{ id: 'w1', from: 'P1:GPIO17', to: 'b50' }, { id: 'w2', from: 'P1:GND', to: 'b55' }],
      } as CircuitLayout
      expect(validateLayout(layout).errors).toEqual([])
      const engine = new SimEngine(layout)
      engine.advance(0.5)
      expect(engine.telemetry().components.P1.mcu!.state).toBe('running')
      expect(engine.netVoltage('c50')).toBeGreaterThan(3.0)
      engine.advance(1)
      expect(engine.netVoltage('c50')).toBeLessThan(0.2)
    })
  }

  it('every example program parses, and the Pi ones run without an error', () => {
    for (const ex of PYTHON_EXAMPLES) {
      const board = (ex.family === 'pi' ? boardDef('rpi4') : boardDef('beaglebone_black')) ?? boardDef('rpi4')!
      expect(checkPython(ex.code(board)), ex.id).toMatchObject({ ok: true })
      if (ex.family !== 'pi') continue
      const { rt } = runPy(ex.code(board), 0.3)
      expect(rt.error, ex.id).toBeUndefined()
    }
  })

  it('the Pi lessons validate; pi-button lights the LED while the button is held', () => {
    for (const id of ['pi-blink', 'pi-button']) {
      const p = presetById(id)!
      expect(validateLayout(p.layout).errors, id).toEqual([])
    }
    serialBus.clear('P1')
    const engine = new SimEngine(presetById('pi-button')!.layout)
    engine.advance(0.2)
    expect(engine.telemetry().components.P1.mcu!.state).toBe('running')
    expect(engine.netVoltage('c12')).toBeLessThan(0.2)
    engine.setRuntimeParam('SW1', 'pressed', true)
    engine.advance(0.1)
    expect(engine.netVoltage('c12')).toBeGreaterThan(3.0)
    expect(serialBus.read('P1')).toBe('pressed 1 time(s)\n')
    engine.setRuntimeParam('SW1', 'pressed', false)
    engine.advance(0.1)
    expect(engine.netVoltage('c12')).toBeLessThan(0.2)
    const blink = new SimEngine(presetById('pi-blink')!.layout)
    blink.advance(0.5)
    expect(blink.netVoltage('c12')).toBeGreaterThan(3.0)
  })
})
