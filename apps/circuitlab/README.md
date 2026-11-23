# Circuit Lab

A 3D electronics lab for an electrical-engineering class, on the platform as
the **Circuit Lab** card (Learning · Electronics). Students put real-looking
parts on a breadboard, wire them, press Run — every voltage and current comes
from a circuit solver — and program microcontroller boards.

It is [ohmlet](https://github.com/JENW1N/ohmlet) (MIT) with the boards and
board-driven parts of [OpenCircuit 3D](https://github.com/gabrieleviolait/opencircuit)
(MIT) ported into ohmlet's chip bridge. See [NOTICE](NOTICE),
[ARCHITECTURE.md](ARCHITECTURE.md) (ohmlet's solver, DSL and scene) and
[DESIGN.md](DESIGN.md) (its Liquid Glass UI), and the plan in
`knowledge/circuit-lab.md` at the repo root.

## Running it

From the repo root: `npm run dev` serves it at `/circuitlab/`, `npm run build`
writes it to `dist/circuitlab/`, `npm test` runs its vitest suite after the
platform's tests. `node scripts/circuitlab.mjs ensure` installs this folder's
own dependencies (React, three 0.170 for the path tracer, avr8js, vitest).

Inside this folder: `npm test`, `npm run typecheck`, `npm run dev` (standalone).

## Boards

| Board | Runs as | Notes |
| --- | --- | --- |
| Arduino Uno | Instant mode, or **Compiled**: C++ → HEX in the browser, run on avr8js (a real ATmega328P) | Off-board on the bench, female headers |
| Arduino Nano | Instant, or Compiled (ATmega328P) | Straddles the channel, pins in rows c and h |
| Arduino Mega 2560 | Instant | Off-board; avr-gcc-wasm only targets the ATmega328P |
| ESP32 DevKit V1 | Instant (behavioural) | 3.3 V: 5 V on a pin damages it, with the reason |
| Raspberry Pi Pico | Instant (behavioural) | 3.3 V, straddles the channel |

Every board is one chip in the solver (`src/mcu/board-chip.ts`): each step it
reads its pins' node voltages, runs the program for exactly that step of
simulated time, and drives each output as a Norton source (Vcc × the fraction
of the step it was high, through ~25 Ω). Inputs use Schmitt thresholds and
optional pull-ups; the ADC reads node voltages; PWM, servo pulses and tones
are real waveforms with exact edges for the parts that time them.

- `src/mcu/fast/` — Instant mode: Arduino C++ → generator JS (current-line
  highlight, `delay()` in sim time) and the library shims (Servo,
  LiquidCrystal_I2C, Adafruit_SSD1306, Adafruit_NeoPixel, DHT, Wire, ESP32 LEDC).
- `src/mcu/avr/` — Compiled mode: avr8js runner (ports, timers, ADC, USART,
  TWI → the I²C parts) and the lazy CDN compiler (`@horang-corp/avr-gcc-wasm`).
- `src/sim/chips/peripherals.ts` — servo, LCD 16×2 (PCF8574 + HD44780),
  OLED (SSD1306), NeoPixels, HC-SR04, DHT22. The multimeter is an analog device.
- `src/lessons/presets.ts` — Blink, Button → LED, Fade, Pot → Servo,
  Sensor → LCD, 555 blinker, Distance meter, the ESP32 5 V trap, Pico blink.
- `tests/fixtures/*.hex` — the Uno lessons compiled by the same compiler
  (`scripts/compile-fixtures.ts` regenerates them).

The AI circuit designer from ohmlet is switched off: it called a model
provider from the browser with a user key. TODO: route it through the
platform server (`src/llm/client.ts`).
