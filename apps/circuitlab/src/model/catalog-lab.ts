/**
 * Circuit Lab additions to the ohmlet catalog: the microcontroller boards
 * and the parts that need a board (servo, LCD 16×2 I²C, OLED 128×64,
 * NeoPixel stick, HC-SR04, DHT22) plus a multimeter.
 *
 * Behaviour lives in src/mcu (boards) and src/sim/chips/peripherals.ts;
 * these entries are the static contract (pins, placement, params, docs).
 * The peripheral behaviour follows OpenCircuit 3D (MIT) — see NOTICE.
 */

import type { CatalogEntry } from './catalog'
import { BOARDS, type BoardDef } from './boards'
import { registerOffboardGeometry } from './breadboard'

const E = (e: CatalogEntry) => e

export const DEFAULT_SKETCH = (board: BoardDef): string => `// Blink: the on-board LED (pin ${board.ledBuiltin}) on for a second, off for a second.
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
  Serial.println("Hello from the ${board.short}!");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
`

function boardEntry(b: BoardDef): CatalogEntry {
  return E({
    type: b.type,
    label: b.label,
    category: 'board',
    placement: b.placement,
    pins: b.pins,
    footprintOffsets: b.footprint,
    internalBridges: b.bridges,
    bodyFootprint: b.footprint ? { dCols: b.bodyCols ?? [0, b.footprint.length / 2 - 1], rows: b.bodyRows ?? ['e', 'f'] } : undefined,
    groundPin: b.ground,
    params: [
      { key: 'code', label: 'Sketch', kind: 'text', default: DEFAULT_SKETCH(b), hidden: true },
      { key: 'runtime', label: 'Runs as', kind: 'select', default: 'fast', options: b.runtimes, hidden: true },
    ],
    sim: { kind: 'chip', model: 'mcu' },
    visual: { shape: 'board' },
    doc: b.doc,
  })
}

/** Register the bench geometry of an off-board module (anchor = top-left of its rect). */
function bench(type: string, rect: [number, number, number, number], height: number, terminals: [number, number, number, number, number][]): void {
  registerOffboardGeometry(type, {
    rect: { x0: rect[0], x1: rect[1], z0: rect[2], z1: rect[3] },
    height,
    terminals: terminals.map(([dx, dz, y, ex, ez]) => ({ dx, dz, y, exitDir: { x: ex, z: ez } })),
  })
}

// servo: body 9 × 4.8 (SG90, 23 × 12 mm; mounting tabs to 12.7). Its cable
// leaves the left side low down and ends in a 3-pin FEMALE connector lying on
// the bench to the left, facing away (−x) — towards the breadboard, which
// usually sits left of a module — so jumpers go straight in without crossing
// the servo. GND (brown) at the back, VCC (red), SIG (orange) at the front.
bench('servo', [-1.6, 11.1, 0, 4.8], 9.4, [
  [-4.6, 1.4, 0.48, -1, 0],
  [-4.6, 2.4, 0.48, -1, 0],
  [-4.6, 3.4, 0.48, -1, 0],
])
// LCD 16×2 with I²C backpack: 80 × 36 mm lying face up, header on the left edge
bench('lcd1602_i2c', [-1.6, 31.5, 0, 14.2], 3.4, [
  [-0.9, 5.6, 1.2, -1, 0],
  [-0.9, 6.6, 1.2, -1, 0],
  [-0.9, 7.6, 1.2, -1, 0],
  [-0.9, 8.6, 1.2, -1, 0],
])
// OLED 0.96" 128×64: 27 × 27 mm lying face up, 4-pin header along the top edge
bench('oled_ssd1306', [0, 10.8, -0.6, 10.9], 2.4, [
  [3.9, 0.9, 2.2, 0, -1],
  [4.9, 0.9, 2.2, 0, -1],
  [5.9, 0.9, 2.2, 0, -1],
  [6.9, 0.9, 2.2, 0, -1],
])
// NeoPixel stick ×8: 51 × 10 mm, 3 pins at the left end
bench('neopixel_strip', [-1.2, 20.1, 0, 4.0], 1.6, [
  [-0.6, 1.0, 0.9, -1, 0],
  [-0.6, 2.0, 0.9, -1, 0],
  [-0.6, 3.0, 0.9, -1, 0],
])

export const LAB_PARTS: Record<string, CatalogEntry> = {
  ...Object.fromEntries(BOARDS.map((b) => [b.type, boardEntry(b)])),

  servo: E({
    type: 'servo',
    label: 'Servo (SG90)',
    category: 'output',
    placement: 'offboard',
    pins: ['GND', 'VCC', 'SIG'],
    sim: { kind: 'chip', model: 'servo' },
    visual: { shape: 'servo' },
    doc: 'Hobby servo: brown GND, red VCC (5 V), orange SIG. The signal is a pulse every 20 ms; its width (0.54–2.4 ms) sets the horn angle 0–180°. Use the Servo library: myServo.attach(9); myServo.write(90);',
  }),
  lcd1602_i2c: E({
    type: 'lcd1602_i2c',
    label: 'LCD 16×2 (I²C)',
    category: 'display',
    placement: 'offboard',
    pins: ['GND', 'VCC', 'SDA', 'SCL'],
    params: [{ key: 'address', label: 'I²C address', kind: 'select', default: '0x27', options: ['0x27', '0x3F'] }],
    sim: { kind: 'chip', model: 'lcd1602_i2c' },
    visual: { shape: 'lcd1602' },
    doc: 'HD44780 character LCD with a PCF8574 I²C backpack (address 0x27). Wire SDA/SCL to the board\'s I²C pins (Uno: A4/A5). Use LiquidCrystal_I2C: lcd.init(); lcd.backlight(); lcd.print("Hi");',
  }),
  oled_ssd1306: E({
    type: 'oled_ssd1306',
    label: 'OLED 128×64 (I²C)',
    category: 'display',
    placement: 'offboard',
    pins: ['GND', 'VCC', 'SCL', 'SDA'],
    sim: { kind: 'chip', model: 'oled_ssd1306' },
    visual: { shape: 'oled' },
    doc: 'SSD1306 monochrome OLED, I²C address 0x3C. Use Adafruit_SSD1306: display.begin(SSD1306_SWITCHCAPVCC, 0x3C); display.println("Hi"); display.display();',
  }),
  neopixel_strip: E({
    type: 'neopixel_strip',
    label: 'NeoPixel stick ×8',
    category: 'display',
    placement: 'offboard',
    pins: ['GND', 'VCC', 'DIN'],
    params: [{ key: 'count', label: 'Pixels', kind: 'number', default: 8, min: 1, max: 8, step: 1 }],
    sim: { kind: 'chip', model: 'neopixel' },
    visual: { shape: 'neopixel' },
    doc: 'Eight WS2812B addressable RGB LEDs on one data line (DIN), 5 V. Use Adafruit_NeoPixel: strip.setPixelColor(0, strip.Color(255, 0, 0)); strip.show();',
  }),
  hcsr04: E({
    type: 'hcsr04',
    label: 'Ultrasonic sensor (HC-SR04)',
    category: 'sensor',
    placement: 'footprint',
    pins: ['GND', 'ECHO', 'TRIG', 'VCC'],
    footprintOffsets: [
      { dCol: 0, row: 'a' },
      { dCol: 1, row: 'a' },
      { dCol: 2, row: 'a' },
      { dCol: 3, row: 'a' },
    ],
    params: [
      { key: 'distance', label: 'Distance', kind: 'number', default: 25, min: 2, max: 400, step: 1, unit: 'cm', runtime: true },
    ],
    sim: { kind: 'chip', model: 'hcsr04' },
    visual: { shape: 'hcsr04' },
    doc: 'Ultrasonic distance sensor standing in row a, facing away from you. Pulse TRIG high for 10 µs; ECHO then goes high for 58 µs per cm of distance. Use pulseIn(echoPin, HIGH) / 58.0 for cm.',
  }),
  dht22: E({
    type: 'dht22',
    label: 'Temp + humidity (DHT22)',
    category: 'sensor',
    placement: 'footprint',
    pins: ['VCC', 'DATA', 'GND'],
    footprintOffsets: [
      { dCol: 0, row: 'a' },
      { dCol: 1, row: 'a' },
      { dCol: 2, row: 'a' },
    ],
    params: [
      { key: 'temperature', label: 'Temperature', kind: 'number', default: 22.5, min: -40, max: 80, step: 0.1, unit: '°C', runtime: true },
      { key: 'humidity', label: 'Humidity', kind: 'number', default: 45, min: 0, max: 100, step: 0.1, unit: '%', runtime: true },
    ],
    sim: { kind: 'chip', model: 'dht22' },
    visual: { shape: 'dht22' },
    doc: 'DHT22 temperature and humidity module (3 pins: VCC, DATA, GND), standing in row a. Use the DHT library: DHT dht(2, DHT22); dht.begin(); dht.readTemperature();',
  }),
  multimeter: E({
    type: 'multimeter',
    label: 'Multimeter',
    category: 'instrument',
    placement: 'leads',
    pins: ['V', 'COM'],
    params: [
      { key: 'mode', label: 'Measures', kind: 'select', default: 'V', options: ['V', 'V~', 'mA', 'Ω', 'continuity', 'diode'], runtime: true },
    ],
    sim: { kind: 'device', model: 'multimeter' },
    visual: { shape: 'multimeter' },
    doc: 'Digital multimeter with a red probe (V) and a black probe (COM); 10 MΩ input in the volt ranges (it loads high-resistance circuits). V / V~ (true RMS): touch both probes across a part. mA: the meter must be IN SERIES (it is nearly a short — across a supply it blows its fuse). Ω: measure a part with the power off.',
  }),
}
