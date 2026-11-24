/**
 * Starter lessons: each one loads a ready circuit and (for a board) its
 * sketch. Patterned on OpenCircuit 3D's presets (Blink, Pot → Servo,
 * Sensor → LCD …, MIT) and the reference lab's lesson cards.
 */
import type { CircuitLayout, ComponentInstance, Wire } from '../model/types'
import blinky555 from '../../examples/blinky-555.json'

export interface LessonControl {
  /** component id and runtime param the slider / button drives */
  part: string
  key: string
  label: string
  kind: 'range' | 'button'
  min?: number
  max?: number
  step?: number
  unit?: string
}

/** an illustrated-view callout card: a key part, a bold title and one plain line */
export interface Callout {
  part: string
  title: string
  text: string
  /** chip | led | resistor | speaker | display | sensor | power | wave | switch | meter | board | motor */
  icon?: string
}

export interface Preset {
  /** illustrated-view callouts for the lesson's key parts */
  callouts?: Callout[]
  id: string
  title: string
  board: string | null
  /** one-line pitch on the card */
  summary: string
  /** what the student should notice, 2–4 short points */
  learn: string[]
  controls: LessonControl[]
  layout: CircuitLayout
}

const UNO_POS = { x: -31, z: -1.5 }

function uno(code: string, runtime: 'fast' | 'avr' = 'fast'): ComponentInstance {
  return { id: 'U1', type: 'arduino_uno', pos: UNO_POS, params: { code, runtime } }
}

let wireN = 0
function w(from: string, to: string, color: string): Wire {
  wireN++
  return { id: `w${wireN}`, from, to, color }
}
function layout(name: string, description: string, components: ComponentInstance[], wires: Wire[], board: 'half' | 'standard' = 'half'): CircuitLayout {
  wireN = 0
  return { version: 1, name, description, board, components, wires }
}

/** LED + 220 Ω on the breadboard, driven from column 12 (a12) */
function ledParts(color = 'red'): ComponentInstance[] {
  return [
    { id: 'R1', type: 'resistor', params: { resistance: 220 }, holes: ['c12', 'c16'] },
    { id: 'D1', type: 'led', params: { color }, holes: ['b16', 'b17'] },
  ]
}

// ------------------------------------------------------------- sketches

export const BLINK_CODE = `// Blink: switch the LED on pin 13 on and off every second.
const int LED = 13;

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
  Serial.println("Blink started");
}

void loop() {
  digitalWrite(LED, HIGH);   // 5 V on pin 13: current flows, the LED lights
  delay(1000);
  digitalWrite(LED, LOW);    // 0 V: no current, the LED goes dark
  delay(1000);
}
`

const BUTTON_CODE = `// Button -> LED: the LED is on while the button is pressed.
const int BUTTON = 2;
const int LED = 13;

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);  // the internal pull-up holds pin 2 HIGH
  pinMode(LED, OUTPUT);
}

void loop() {
  // pressing connects pin 2 to GND, so a press reads LOW
  if (digitalRead(BUTTON) == LOW) {
    digitalWrite(LED, HIGH);
  } else {
    digitalWrite(LED, LOW);
  }
}
`

const FADE_CODE = `// Fade: PWM switches pin 9 very fast; the share of time it is on sets the brightness.
const int LED = 9;   // a PWM pin (marked ~ on the board)
int brightness = 0;
int step = 5;

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  analogWrite(LED, brightness);   // 0 = off ... 255 = fully on
  brightness = brightness + step;
  if (brightness <= 0 || brightness >= 255) {
    step = -step;                 // turn around at the ends
  }
  delay(30);
}
`

const SERVO_CODE = `// Pot -> Servo: turn the knob, the servo follows.
#include <Servo.h>

Servo arm;

void setup() {
  arm.attach(9);
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(A0);              // 0 ... 1023 from the potentiometer
  int angle = map(raw, 0, 1023, 0, 180); // scale to 0 ... 180 degrees
  arm.write(angle);
  delay(15);
}
`

const LCD_CODE = `// Weather station: read the DHT22 and show it on the I2C LCD.
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(2, DHT22);

void setup() {
  lcd.init();
  lcd.backlight();
  dht.begin();
  lcd.print("Weather station");
  delay(1000);
}

void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Temp: ");
  lcd.print(t, 1);
  lcd.write(223);   // the degree sign
  lcd.print("C");
  lcd.setCursor(0, 1);
  lcd.print("Humidity: ");
  lcd.print(h, 0);
  lcd.print("%");
  delay(1000);
}
`

const DISTANCE_CODE = `// Distance meter: an HC-SR04 echo, timed and printed in cm.
const int TRIG = 9;
const int ECHO = 10;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
}

void loop() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);       // a 10 us pulse starts a measurement
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long duration = pulseIn(ECHO, HIGH);  // how long the echo took (us)
  float cm = duration / 58.0;           // sound: 58 us per cm, there and back
  Serial.print("Distance: ");
  Serial.print(cm);
  Serial.println(" cm");
  delay(250);
}
`

const ESP32_TRAP_CODE = `// ESP32 + HC-SR04: the sensor runs on 5 V, the ESP32 on 3.3 V.
const int TRIG = 5;
const int ECHO = 18;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
}

void loop() {
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duration = pulseIn(ECHO, HIGH);
  Serial.print("Echo: ");
  Serial.print(duration);
  Serial.println(" us");
  delay(500);
}
`

const PICO_CODE = `// Pico blink: GP15 drives the LED, GP25 is the on-board LED.
void setup() {
  pinMode(15, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(15, HIGH);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
  digitalWrite(15, LOW);
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
}
`

const R4_CODE = `// Uno R4 blink: same pins as the Uno, a 32-bit chip — and only 8 mA per pin.
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
`

const NODEMCU_CODE = `// NodeMCU blink: D5 (GPIO14) drives the LED; the blue LED on D4 (GPIO2) lights on LOW.
void setup() {
  pinMode(D5, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(D5, HIGH);
  digitalWrite(LED_BUILTIN, HIGH);  // HIGH = blue LED off
  delay(500);
  digitalWrite(D5, LOW);
  digitalWrite(LED_BUILTIN, LOW);   // LOW = blue LED on
  delay(500);
}
`

const BLUEPILL_CODE = `// Blue Pill blink: PA8 drives the LED; the green LED on PC13 lights on LOW.
void setup() {
  pinMode(PA8, OUTPUT);
  pinMode(PC13, OUTPUT);
}

void loop() {
  digitalWrite(PA8, HIGH);
  digitalWrite(PC13, HIGH);  // off
  delay(500);
  digitalWrite(PA8, LOW);
  digitalWrite(PC13, LOW);   // on
  delay(500);
}
`

const XIAO_CODE = `// XIAO fade: analogWrite on D8 ramps the LED up and down.
int level = 0;
int step = 5;

void setup() {
  pinMode(8, OUTPUT);
}

void loop() {
  analogWrite(8, level);
  level = level + step;
  if (level <= 0 || level >= 255) step = -step;
  delay(10);
}
`

// ------------------------------------------------------------- presets

export const PRESETS: Preset[] = [
  {
    id: 'blink',
    title: 'Blink',
    board: 'Arduino Uno',
    summary: 'Pin 13 switches an LED on and off once a second.',
    learn: [
      'A digital pin is either 5 V (HIGH) or 0 V (LOW).',
      'The 220 Ω resistor limits the LED current to about 14 mA.',
      'delay(1000) waits one second of simulated time.',
    ],
    controls: [],
    layout: layout(
      'Blink',
      'Arduino Uno pin 13 → 220 Ω → red LED → GND.',
      [uno(BLINK_CODE), ...ledParts('red')],
      [w('U1:D13', 'a12', 'yellow'), w('a17', 'top-12', 'black'), w('U1:GND2', 'top-0', 'black')],
    ),
  },
  {
    id: 'button',
    title: 'Button → LED',
    board: 'Arduino Uno',
    summary: 'Read a button with the internal pull-up and light the LED.',
    learn: [
      'INPUT_PULLUP keeps pin 2 HIGH until the button connects it to GND.',
      'So a press reads LOW — "active low".',
      'Hold the button (click it, or the control below) and watch pin 2.',
    ],
    controls: [{ part: 'SW1', key: 'pressed', label: 'Button', kind: 'button' }],
    layout: layout(
      'Button → LED',
      'Pushbutton between pin 2 and GND (internal pull-up); LED on pin 13.',
      [uno(BUTTON_CODE), { id: 'SW1', type: 'pushbutton', at: 'f20' }, ...ledParts('green')],
      [
        w('U1:D13', 'a12', 'yellow'),
        w('a17', 'top-12', 'black'),
        w('U1:GND2', 'top-0', 'black'),
        w('U1:D2', 'a20', 'green'),
        w('j22', 'bot-16', 'black'),
        w('U1:GND', 'bot-0', 'black'),
      ],
    ),
  },
  {
    id: 'fade',
    title: 'Fade (PWM)',
    board: 'Arduino Uno',
    summary: 'analogWrite dims an LED by switching it very fast.',
    learn: [
      'Pin 9 is a PWM pin: it switches 490 times a second.',
      'The fraction of time it is on (the duty cycle) sets the brightness.',
      'Put a scope probe on the LED to see the pulses.',
    ],
    controls: [],
    layout: layout(
      'Fade',
      'Pin 9 (PWM) → 220 Ω → blue LED → GND.',
      [uno(FADE_CODE), ...ledParts('blue'), { id: 'PR1', type: 'scope_probe', params: { channel: 1 }, holes: ['e12'] }],
      [w('U1:D9', 'a12', 'orange'), w('a17', 'top-12', 'black'), w('U1:GND2', 'top-0', 'black')],
    ),
  },
  {
    id: 'servo',
    title: 'Pot → Servo',
    board: 'Arduino Uno',
    summary: 'A potentiometer on A0 sets the angle of a servo on pin 9.',
    learn: [
      'The pot is a voltage divider: its wiper gives 0–5 V.',
      'analogRead turns that into 0–1023; map() scales it to 0–180°.',
      'The servo reads the WIDTH of a pulse every 20 ms.',
    ],
    controls: [{ part: 'P1', key: 'position', label: 'Knob', kind: 'range', min: 0, max: 1, step: 0.01 }],
    layout: layout(
      'Pot → Servo',
      '10 kΩ pot between 5 V and GND, wiper on A0; SG90 servo signal on pin 9.',
      [
        uno(SERVO_CODE),
        { id: 'P1', type: 'potentiometer', params: { resistance: 10000, position: 0.3 }, holes: ['e10', 'e11', 'e12'] },
        { id: 'S1', type: 'servo', pos: { x: 47, z: 4 } },
      ],
      [
        w('U1:5V', 'top+0', 'red'),
        w('U1:GND2', 'top-0', 'black'),
        w('a10', 'top-7', 'black'),
        w('a12', 'top+9', 'red'),
        w('a11', 'U1:A0', 'orange'),
        w('U1:D9', 'a28', 'yellow'),
        w('S1:SIG', 'e28', 'yellow'),
        w('S1:VCC', 'top+24', 'red'),
        w('S1:GND', 'top-23', 'black'),
      ],
    ),
  },
  {
    id: 'lcd',
    title: 'Sensor → LCD',
    board: 'Arduino Uno',
    summary: 'A DHT22 measures temperature and humidity; an I²C LCD shows them.',
    learn: [
      'I²C needs only two signal wires: SDA (A4) and SCL (A5).',
      'Each I²C part has an address — this LCD answers at 0x27.',
      'Change the temperature below and watch the screen.',
    ],
    controls: [
      { part: 'DHT1', key: 'temperature', label: 'Temperature', kind: 'range', min: -10, max: 45, step: 0.5, unit: '°C' },
      { part: 'DHT1', key: 'humidity', label: 'Humidity', kind: 'range', min: 0, max: 100, step: 1, unit: '%' },
    ],
    layout: layout(
      'Sensor → LCD',
      'DHT22 data on pin 2; LCD 16×2 I²C backpack on A4 (SDA) / A5 (SCL).',
      [
        uno(LCD_CODE),
        { id: 'DHT1', type: 'dht22', at: 'a20', params: { temperature: 22.5, humidity: 45 } },
        { id: 'LCD1', type: 'lcd1602_i2c', pos: { x: 0, z: 21.5 } },
      ],
      [
        w('U1:5V', 'top+0', 'red'),
        w('U1:GND2', 'top-0', 'black'),
        w('c20', 'top+15', 'red'),
        w('c21', 'U1:D2', 'green'),
        w('c22', 'top-17', 'black'),
        w('top+24', 'bot+24', 'red'),
        w('top-23', 'bot-23', 'black'),
        w('LCD1:VCC', 'bot+0', 'red'),
        w('LCD1:GND', 'bot-0', 'black'),
        w('LCD1:SDA', 'U1:A4', 'blue'),
        w('LCD1:SCL', 'U1:A5', 'yellow'),
      ],
    ),
  },
  {
    id: 'blinker555',
    title: '555 blinker',
    board: null,
    summary: 'No microcontroller: an NE555 timer blinks an LED at about 1.5 Hz.',
    learn: [
      'The capacitor charges through R1 + R2 and discharges through R2.',
      'f = 1.44 / ((R1 + 2·R2) · C) ≈ 1.5 Hz.',
      'Open the scope to see the square wave on OUT.',
    ],
    controls: [],
    layout: { ...(blinky555 as CircuitLayout), name: '555 blinker', board: 'half' },
  },
  {
    id: 'distance',
    title: 'Distance meter',
    board: 'Arduino Uno',
    summary: 'An HC-SR04 echo, timed with pulseIn and printed to Serial.',
    learn: [
      'TRIG starts a ping; ECHO stays HIGH while the sound travels.',
      'Sound needs about 58 µs per cm, there and back.',
      'Move the target with the slider and read the Serial monitor.',
    ],
    controls: [{ part: 'US1', key: 'distance', label: 'Target distance', kind: 'range', min: 2, max: 200, step: 1, unit: 'cm' }],
    layout: layout(
      'Distance meter',
      'HC-SR04: TRIG on pin 9, ECHO on pin 10, 5 V and GND from the rails.',
      [uno(DISTANCE_CODE), { id: 'US1', type: 'hcsr04', at: 'a18', params: { distance: 25 } }],
      [
        w('U1:5V', 'top+0', 'red'),
        w('U1:GND2', 'top-0', 'black'),
        w('c18', 'top-14', 'black'),
        w('c19', 'U1:D10', 'blue'),
        w('c20', 'U1:D9', 'yellow'),
        w('c21', 'top+15', 'red'),
      ],
    ),
  },
  {
    id: 'esp32-trap',
    title: 'ESP32: the 5 V trap',
    board: 'ESP32 DevKit',
    summary: 'A 5 V sensor wired straight into a 3.3 V board. Run it and see what happens.',
    learn: [
      'The HC-SR04 needs 5 V — and its ECHO pin answers with 5 V.',
      'ESP32 pins take at most 3.6 V: GPIO 18 is damaged.',
      'The fix: a divider (1 kΩ / 2 kΩ) turns 5 V into 3.3 V.',
    ],
    controls: [{ part: 'US1', key: 'distance', label: 'Target distance', kind: 'range', min: 2, max: 200, step: 1, unit: 'cm' }],
    layout: layout(
      'ESP32: the 5 V trap',
      'HC-SR04 on 5 V with ECHO wired straight to GPIO 18 — no level shifting.',
      [
        { id: 'E1', type: 'esp32_devkit', pos: { x: -25, z: 2 }, params: { code: ESP32_TRAP_CODE, runtime: 'fast' } },
        { id: 'US1', type: 'hcsr04', at: 'a18', params: { distance: 25 } },
      ],
      [
        w('E1:VIN', 'top+0', 'red'),
        w('E1:GND2', 'top-0', 'black'),
        w('c18', 'top-14', 'black'),
        w('c19', 'E1:D18', 'blue'),
        w('c20', 'E1:D5', 'yellow'),
        w('c21', 'top+15', 'red'),
      ],
    ),
  },
  {
    id: 'pico-blink',
    title: 'Pico blink',
    board: 'Raspberry Pi Pico',
    summary: 'A Pico straddles the breadboard and blinks an LED on GP15.',
    learn: [
      'The Pico is a 3.3 V board: HIGH is 3.3 V, not 5 V.',
      'Each pin\'s column strip is where you connect to it.',
      'GP25 is the small LED on the board itself.',
    ],
    controls: [],
    layout: layout(
      'Pico blink',
      'Pico GP15 → 100 Ω → green LED → GND.',
      [
        { id: 'P1', type: 'rpi_pico', at: 'i5', params: { code: PICO_CODE, runtime: 'fast' } },
        { id: 'R1', type: 'resistor', params: { resistance: 100 }, holes: ['j24', 'j28'] },
        { id: 'D1', type: 'led', params: { color: 'green' }, holes: ['h28', 'h29'] },
      ],
      [w('j29', 'bot-23', 'black'), w('j22', 'bot-17', 'black')],
    ),
  },
  {
    id: 'uno-r4-blink',
    title: 'Uno R4 blink',
    board: 'Arduino Uno R4 Minima',
    summary: 'The Uno layout with a 32-bit chip: same pins, same sketch — but only 8 mA per pin.',
    learn: [
      'The Uno R4 keeps the Uno\'s pins and 5 V logic.',
      'Each R4 pin may give only 8 mA, so the LED gets 330 Ω, not 220 Ω.',
      'Too much current marks the pin damaged — try 100 Ω and see.',
    ],
    controls: [],
    layout: layout(
      'Uno R4 blink',
      'Uno R4 Minima pin 13 → 330 Ω → red LED → GND.',
      [
        { id: 'U1', type: 'arduino_uno_r4_minima', pos: UNO_POS, params: { code: R4_CODE, runtime: 'fast' } },
        { id: 'R1', type: 'resistor', params: { resistance: 330 }, holes: ['c12', 'c16'] },
        { id: 'D1', type: 'led', params: { color: 'red' }, holes: ['b16', 'b17'] },
      ],
      [w('U1:D13', 'a12', 'yellow'), w('a17', 'top-12', 'black'), w('U1:GND2', 'top-0', 'black')],
    ),
  },
  {
    id: 'nodemcu-blink',
    title: 'NodeMCU blink',
    board: 'ESP8266 NodeMCU',
    summary: 'A Wi-Fi board on the bench blinks an LED on D5 — and its own blue LED the other way round.',
    learn: [
      'NodeMCU pins are 3.3 V: HIGH is 3.3 V.',
      'D5 is GPIO 14 — the D-names are just labels for GPIO numbers.',
      'The blue LED on D4 is wired to 3.3 V, so it lights when the pin is LOW.',
    ],
    controls: [],
    layout: layout(
      'NodeMCU blink',
      'NodeMCU D5 → 220 Ω → green LED → GND.',
      [
        { id: 'N1', type: 'esp8266_nodemcu', pos: { x: -23, z: 2 }, params: { code: NODEMCU_CODE, runtime: 'fast' } },
        { id: 'R1', type: 'resistor', params: { resistance: 220 }, holes: ['c12', 'c16'] },
        { id: 'D1', type: 'led', params: { color: 'green' }, holes: ['b16', 'b17'] },
      ],
      [w('N1:D5', 'a12', 'yellow'), w('a17', 'top-12', 'black'), w('N1:GND3', 'top-0', 'black')],
    ),
  },
  {
    id: 'bluepill-blink',
    title: 'Blue Pill blink',
    board: 'STM32 Blue Pill',
    summary: 'A 72 MHz STM32 straddles the breadboard and blinks an LED on PA8.',
    learn: [
      'STM32 pins are named by port and bit: PA8 is port A, pin 8.',
      'The green LED on PC13 is wired to 3.3 V, so LOW turns it on.',
      'PA8 is 5 V tolerant; the analog pins PA0–PA7 are not.',
    ],
    controls: [],
    layout: layout(
      'Blue Pill blink',
      'Blue Pill PA8 → 220 Ω → yellow LED → GND.',
      [
        { id: 'S1', type: 'stm32_bluepill', at: 'c5', params: { code: BLUEPILL_CODE, runtime: 'fast' } },
        { id: 'R1', type: 'resistor', params: { resistance: 220 }, holes: ['c30', 'c34'] },
        { id: 'D1', type: 'led', params: { color: 'yellow' }, holes: ['b34', 'b35'] },
      ],
      [w('j9', 'a30', 'yellow'), w('a35', 'top-30', 'black'), w('a5', 'top-4', 'black')],
      'standard',
    ),
  },
  {
    id: 'xiao-fade',
    title: 'XIAO fade',
    board: 'Seeed XIAO SAMD21',
    summary: 'A thumbnail-sized board fades an LED with PWM on D8.',
    learn: [
      'analogWrite switches the pin on and off fast; the share of ON time sets the brightness.',
      'XIAO pins give only about 7 mA, so the LED gets 330 Ω.',
      'Every XIAO pin is also an analog input (D0 = A0 … D10 = A10).',
    ],
    controls: [],
    layout: layout(
      'XIAO fade',
      'XIAO D8 → 330 Ω → blue LED → GND.',
      [
        { id: 'X1', type: 'xiao_samd21', at: 'c5', params: { code: XIAO_CODE, runtime: 'fast' } },
        { id: 'R1', type: 'resistor', params: { resistance: 330 }, holes: ['a10', 'a14'] },
        { id: 'D1', type: 'led', params: { color: 'blue' }, holes: ['b14', 'b15'] },
      ],
      [w('a15', 'top-14', 'black'), w('b6', 'top-5', 'black')],
    ),
  },
]

const CALLOUTS: Record<string, Callout[]> = {
  blink: [
    { part: 'U1', title: 'ARDUINO UNO', text: 'Pin 13 goes HIGH and LOW once a second.', icon: 'board' },
    { part: 'R1', title: '220 Ω RESISTOR', text: 'Limits the LED current to about 14 mA.', icon: 'resistor' },
    { part: 'D1', title: 'RED LED', text: 'Lights when current flows anode → cathode.', icon: 'led' },
  ],
  button: [
    { part: 'U1', title: 'ARDUINO UNO', text: 'Pin 2 reads the button with a pull-up.', icon: 'board' },
    { part: 'SW1', title: 'PUSHBUTTON', text: 'Pressed, it pulls pin 2 to GND (reads LOW).', icon: 'switch' },
    { part: 'D1', title: 'GREEN LED', text: 'On while the button is held.', icon: 'led' },
  ],
  fade: [
    { part: 'U1', title: 'PWM PIN', text: 'analogWrite() switches fast; the average sets brightness.', icon: 'board' },
    { part: 'D1', title: 'BLUE LED', text: 'Your eye averages the pulses into a glow.', icon: 'led' },
    { part: 'PR1', title: 'SCOPE PROBE', text: 'Open Scope to see the duty cycle change.', icon: 'wave' },
  ],
  servo: [
    { part: 'P1', title: 'POTENTIOMETER', text: 'A divider: the wiper gives 0–5 V to A0.', icon: 'meter' },
    { part: 'S1', title: 'SERVO', text: 'The pulse width (1–2 ms) sets the angle.', icon: 'motor' },
    { part: 'U1', title: 'ARDUINO UNO', text: 'map() turns 0–1023 into 0–180°.', icon: 'board' },
  ],
  lcd: [
    { part: 'DHT1', title: 'DHT22 SENSOR', text: 'Temperature and humidity on one data wire.', icon: 'sensor' },
    { part: 'LCD1', title: 'LCD 16×2 (I²C)', text: 'Two wires — SDA and SCL — carry every character.', icon: 'display' },
    { part: 'U1', title: 'ARDUINO UNO', text: 'Reads the sensor, prints to the display.', icon: 'board' },
  ],
  blinker555: [
    { part: 'U1', title: '555 TIMER', text: 'Charges and discharges C1: an astable clock.', icon: 'chip' },
    { part: 'C1', title: 'TIMING CAPACITOR', text: 'Bigger C, slower blink: f = 1.44/((R1+2R2)C).', icon: 'resistor' },
    { part: 'D1', title: 'LED', text: 'Follows the 555 output.', icon: 'led' },
  ],
  distance: [
    { part: 'US1', title: 'HC-SR04', text: 'Echo time ÷ 58 = distance in cm.', icon: 'sensor' },
    { part: 'U1', title: 'ARDUINO UNO', text: 'pulseIn() times the echo.', icon: 'board' },
  ],
  'esp32-trap': [
    { part: 'E1', title: 'ESP32 (3.3 V)', text: 'Its pins are not 5 V tolerant.', icon: 'board' },
    { part: 'US1', title: 'HC-SR04 (5 V)', text: 'Its echo is 5 V — divide it down first.', icon: 'sensor' },
  ],
  'pico-blink': [
    { part: 'P1', title: 'RASPBERRY PI PICO', text: 'GP15 drives the LED at 3.3 V.', icon: 'board' },
    { part: 'D1', title: 'GREEN LED', text: 'A 100 Ω resistor is enough at 3.3 V.', icon: 'led' },
  ],
  'uno-r4-blink': [
    { part: 'U1', title: 'ARDUINO UNO R4', text: '5 V pins, but only 8 mA each.', icon: 'board' },
    { part: 'R1', title: '330 Ω RESISTOR', text: 'Keeps the LED under 8 mA.', icon: 'resistor' },
  ],
  'nodemcu-blink': [
    { part: 'N1', title: 'NODEMCU (ESP8266)', text: 'D5 is GPIO 14, at 3.3 V.', icon: 'board' },
    { part: 'D1', title: 'GREEN LED', text: 'Blinks opposite the blue on-board LED.', icon: 'led' },
  ],
  'bluepill-blink': [
    { part: 'S1', title: 'STM32 BLUE PILL', text: 'PA8 drives the LED at 3.3 V.', icon: 'board' },
    { part: 'D1', title: 'YELLOW LED', text: 'Lights while PA8 is HIGH.', icon: 'led' },
  ],
  'xiao-fade': [
    { part: 'X1', title: 'SEEED XIAO', text: 'PWM on D8 sets the brightness.', icon: 'board' },
    { part: 'D1', title: 'BLUE LED', text: 'Fades up and down, 2.5 s a cycle.', icon: 'led' },
  ],
}
for (const p of PRESETS) p.callouts = CALLOUTS[p.id]

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id)
}
