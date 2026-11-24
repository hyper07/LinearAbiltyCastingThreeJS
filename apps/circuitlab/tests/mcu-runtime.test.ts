/**
 * Instant mode: the Arduino C++ subset, and the parts the libraries drive
 * (OLED over I²C, NeoPixels, the multimeter reading the circuit).
 */
import { describe, expect, it } from 'vitest'
import { SimEngine } from '../src/sim/engine'
import type { CircuitLayout, ComponentInstance, Wire } from '../src/model/types'
import { transpile } from '../src/mcu/fast/transpile'
import { serialBus } from '../src/mcu/serial'
import { prepareSketch } from '../src/mcu/avr/compile'
import { liveBoard } from '../src/mcu/board-chip'

function run(code: string, seconds = 0.2, parts: ComponentInstance[] = [], wires: Wire[] = [], board = 'arduino_uno'): { out: string; engine: SimEngine } {
  serialBus.clear('U1')
  const layout: CircuitLayout = {
    version: 1,
    board: 'half',
    components: [{ id: 'U1', type: board, pos: board === 'esp32_devkit' ? { x: -25, z: 2 } : { x: -31, z: -1.5 }, params: { code, runtime: 'fast' } }, ...parts],
    wires,
  }
  const engine = new SimEngine(layout)
  engine.advance(seconds)
  return { out: serialBus.read('U1'), engine }
}

describe('Instant mode: the C++ subset', () => {
  it('integer division, casts, arrays, functions and loops behave like C', () => {
    const { out } = run(`
int digits[4];
int sumTo(int n) {
  int s = 0;
  for (int i = 1; i <= n; i++) s += i;
  return s;
}
float half(float x) { return x / 2; }
void setup() {
  Serial.begin(9600);
  int n = 1234;
  for (int i = 3; i >= 0; i--) { digits[i] = n % 10; n = n / 10; }
  Serial.println(digits[0]);
  Serial.println(7 / 2 == 3.5 ? "js" : "c");
  int q = 7 / 2;
  Serial.println(q);
  Serial.println(sumTo(10));
  Serial.println((int)3.9);
  float v = half(5);
  Serial.println(v);
  byte b = 300;
  Serial.println(b);
  Serial.println(sizeof(digits) / sizeof(digits[0]));
  Serial.println(map(512, 0, 1023, 0, 180));
  Serial.println(constrain(200, 0, 180));
}
void loop() {}
`)
    expect(out.trim().split('\n')).toEqual(['1', 'js', '3', '55', '3', '2.50', '44', '4', '90', '180'])
  })

  it('chars, Strings and switch work for serial commands', () => {
    serialBus.clear('U1')
    const { engine } = run(
      `
String cmd = "";
void setup() { Serial.begin(9600); }
void loop() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\\n') {
      Serial.print("got ");
      Serial.println(cmd);
      cmd = "";
    } else {
      cmd += c;
    }
    switch (c) {
      case 'a': Serial.println("A!"); break;
      default: break;
    }
  }
}
`,
      0.05,
    )
    liveBoard('U1')!.serialIn('ab\n')
    engine.advance(0.05)
    expect(serialBus.read('U1').trim().split('\n')).toEqual(['A!', 'got ab'])
  })

  it('#define, millis() and a non-blocking blink', () => {
    const { out } = run(
      `
#define INTERVAL 100
unsigned long last = 0;
int count = 0;
void setup() { Serial.begin(9600); }
void loop() {
  if (millis() - last >= INTERVAL) {
    last = millis();
    count++;
    Serial.println(count);
  }
}
`,
      0.555,
    )
    const lines = out.trim().split('\n')
    expect(Number(lines[lines.length - 1])).toBe(5) // t = 0.01 (boot) … 0.555 s
  })

  it('a busy loop still lets time pass (it yields every iteration)', () => {
    const { out } = run(`
void setup() {
  Serial.begin(9600);
  unsigned long t0 = millis();
  long n = 0;
  while (millis() - t0 < 20) { n++; }
  Serial.println(n > 1000 ? "ok" : "slow");
}
void loop() {}
`)
    expect(out.trim()).toBe('ok')
  })

  it('a syntax the subset cannot read is a friendly error, not a crash', () => {
    const { engine } = run('void setup() { if (x > ) { } }\nvoid loop() {}\n')
    const mcu = engine.telemetry().components.U1.mcu!
    expect(mcu.state).toBe('error')
    expect(mcu.error).toMatch(/Instant mode could not read this sketch/)
  })

  it('the transpiler keeps one output line per source line (line highlighting)', () => {
    const src = 'void setup() {\n  pinMode(13, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n}\n'
    const js = transpile(src).js
    expect(js.split('\n').length).toBe(src.split('\n').length)
    expect(js).toContain('__rt.delay(6, 500)')
  })

  it('compiled mode gets Arduino.h, prototypes and #line like the IDE', () => {
    const prep = prepareSketch('#include <Servo.h>\nvoid setup() { blink(3); }\nvoid loop() {}\nvoid blink(int n) { }\n')
    expect(prep.code.startsWith('#include <Arduino.h>\n#include <Servo.h>\n')).toBe(true)
    expect(prep.code).toContain('void blink(int n);')
    expect(prep.code).toContain('#line 1 "sketch.ino"')
  })
})

describe('Instant mode: libraries on real parts', () => {
  it('Adafruit_SSD1306 draws text into the OLED over I²C', () => {
    const { engine } = run(
      `
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 display(128, 64, &Wire, -1);
void setup() {
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(2);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Hi");
  display.fillRect(100, 40, 10, 10, SSD1306_WHITE);
  display.display();
}
void loop() {}
`,
      0.05,
      [{ id: 'O1', type: 'oled_ssd1306', pos: { x: 36, z: 2 } }],
      [
        { id: 'w1', from: 'U1:5V', to: 'O1:VCC' },
        { id: 'w2', from: 'U1:GND', to: 'O1:GND' },
        { id: 'w3', from: 'U1:A4', to: 'O1:SDA' },
        { id: 'w4', from: 'U1:A5', to: 'O1:SCL' },
      ],
    )
    const t = engine.telemetry().components.O1
    expect(t.backlight).toBe(true)
    const frame = t.frame!
    const lit = (x: number, y: number) => ((frame[(y >> 3) * 128 + x] >> (y & 7)) & 1) === 1
    expect(lit(105, 45)).toBe(true) // the filled square
    expect(lit(105, 20)).toBe(false)
    // the 'H' at size 2: its left stem spans the first rows of column 0..1
    expect(lit(0, 2) && lit(1, 2)).toBe(true)
  })

  it('Adafruit_NeoPixel colours reach the strip on its data pin', () => {
    const { engine } = run(
      `
#include <Adafruit_NeoPixel.h>
Adafruit_NeoPixel strip(8, 6, NEO_GRB + NEO_KHZ800);
void setup() {
  strip.begin();
  strip.setPixelColor(0, strip.Color(255, 0, 0));
  strip.setPixelColor(7, 0, 0, 255);
  strip.show();
}
void loop() {}
`,
      0.05,
      [{ id: 'N1', type: 'neopixel_strip', pos: { x: 36, z: 2 } }],
      [
        { id: 'w1', from: 'U1:5V', to: 'N1:VCC' },
        { id: 'w2', from: 'U1:GND', to: 'N1:GND' },
        { id: 'w3', from: 'U1:D6', to: 'N1:DIN' },
      ],
    )
    const px = engine.telemetry().components.N1.pixels!
    expect(px[0]).toBe(0xff0000)
    expect(px[7]).toBe(0x0000ff)
    expect(px[3]).toBe(0)
  })

  it('the multimeter reads a divider in volts, and its mA range blows a fuse across a supply', () => {
    const parts: ComponentInstance[] = [
      { id: 'R1', type: 'resistor', params: { resistance: 1000 }, holes: ['a10', 'top+8'] },
      { id: 'R2', type: 'resistor', params: { resistance: 1000 }, holes: ['b10', 'top-8'] },
      { id: 'M1', type: 'multimeter', params: { mode: 'V' }, holes: ['c10', 'top-12'] },
    ]
    const wires: Wire[] = [
      { id: 'w1', from: 'U1:5V', to: 'top+0' },
      { id: 'w2', from: 'U1:GND2', to: 'top-0' },
    ]
    const { engine } = run('void setup() {}\nvoid loop() {}\n', 0.6, parts, wires)
    expect(engine.telemetry().components.M1.value!).toBeCloseTo(2.5, 2)
    const short: ComponentInstance[] = [{ id: 'M1', type: 'multimeter', params: { mode: 'mA' }, holes: ['top+12', 'top-12'] }]
    const s = run('void setup() {}\nvoid loop() {}\n', 0.05, short, wires)
    expect(s.engine.telemetry().components.M1.reading).toBe('FUSE')
  })

  it('ESP32 LEDC PWM and 12-bit analogRead', () => {
    const { out } = run(
      `
void setup() {
  Serial.begin(115200);
  ledcAttach(2, 5000, 8);
  ledcWrite(2, 128);
  Serial.println(analogRead(34));
}
void loop() {}
`,
      0.05,
      [
        { id: 'R1', type: 'resistor', params: { resistance: 1000 }, holes: ['a10', 'top+8'] },
        { id: 'R2', type: 'resistor', params: { resistance: 1000 }, holes: ['b10', 'top-8'] },
      ],
      [
        { id: 'w1', from: 'U1:3V3', to: 'top+0' },
        { id: 'w2', from: 'U1:GND', to: 'top-0' },
        { id: 'w3', from: 'U1:D34', to: 'c10' },
      ],
      'esp32_devkit',
    )
    expect(Number(out.trim())).toBeGreaterThan(2030)
    expect(Number(out.trim())).toBeLessThan(2070)
  })
})
