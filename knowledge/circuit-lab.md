# Circuit lab: 3D electronics parts, real simulation, students build their own circuits

How to build an electronics / electrical-engineering class lab in three.js:
every common part as a clean 3D model, circuits that are actually solved (not
scripted), instruments, code running on a microcontroller, and a breadboard
where students build and test their own circuits.

- **Parts:** [circuit-components.json](circuit-components.json) — 125 parts
  (power, passives, switches, semiconductors, ICs, boards, sensors, outputs,
  instruments, modules) with pins, simulation model, 3D look, what each one
  teaches, and course level 1–3. Search: `npm run kb -- led --kind circuit-part`.
- **Skill:** `.claude/skills/circuit-lab/SKILL.md` loads this guide.

## Start here: adopt two MIT projects instead of building from zero

Found and checked on 2026-11-23 (both MIT, both run in the browser with
three.js). Together they already cover most of §4–§9; build on them.

| | [ohmlet](https://github.com/JENW1N/ohmlet) | [OpenCircuit 3D](https://github.com/gabrieleviolait/opencircuit) ([live](https://opencircuit.pages.dev/)) |
| --- | --- | --- |
| Strength | **The look and the circuit core.** Photo-real breadboards (400 to 1660 points, ganged benches), parts reworked against product photos, collision-free wire and lead routing, three render modes (raster, HDRI + post, path-traced studio via three-gpu-pathtracer), bench supply, scope. Custom MNA solver (Norton stamps, LU with pivoting, Newton–Raphson, backward-Euler reactives), behavioural 74xx / CD4xxx / NE555 / LM358, layout validator, tests | **The boards and features.** Arduino Uno/Nano/Mega on avr8js with **C++ → HEX compiled in the browser** (avr-gcc WASM from a CDN), a fast Arduino runtime, ESP32 and Pico as behavioural boards, multimeter, scope, logic analyser, LCD 16×2, OLED, NeoPixels, DHT22, HC-SR04, servo, buzzer, optional ngspice WASM, presets, share links, embeddable iframes |
| Gap | **No microcontrollers** by design; React 18 + TypeScript + zustand; three 0.170; its AI panel calls the Anthropic API from the browser with the user's key | Plain boxy 3D, cluttered UI, debug gizmos; one big `app.bundle.js` plus `src/` |
| Use | **The base app** | **Source of the board runtimes, displays and instruments**, ported into ohmlet's chip bridge |

**Why they fit together:** ohmlet's chip bridge (`src/sim/chip-api.ts`)
steps behavioural chips before each solve and lets them drive pins as
`{v, rout}` Norton stamps — exactly the pin interface a microcontroller needs
(§6). So an Arduino on avr8js becomes "a chip" whose GPIO port writes become
pin drives and whose input pins read node voltages.

**How to bring it onto the platform**
1. Put ohmlet in `apps/circuitlab/` (own `package.json`, React + TS kept;
   keep its LICENSE; credit both projects in `docs/third-party.md` and a
   visible in-app credits panel). Build it to static files the platform
   serves; open it from a platform card like the games, with our help panel
   (H) and back-to-home.
2. Move it to our three version (0.185) or keep its own pinned three inside
   its own bundle — whichever keeps the path tracer working.
3. Replace the browser-side Anthropic key with a call through our server, or
   hide the AI panel until that exists. Never ship an API key to the browser.
4. Port from OpenCircuit: avr8js boards + in-browser compile, the fast
   Arduino runtime and its ESP32 / Pico boards, LCD / OLED / NeoPixel / servo /
   buzzer / sensor helpers, the multimeter and logic analyser, presets. Keep
   OpenCircuit's MIT notice beside the ported code. The avr-gcc WASM and
   ngspice packages stay loaded from their CDN (their own licences), as
   OpenCircuit does.
5. Then continue with this guide: more of the 142 catalogue parts, boards
   by tier (rp2040js for a real Pico, the micro:bit simulator, Pyodide +
   gpiozero for Raspberry Pi), lessons with auto-checked goals (§10), the
   server tier last.

### Status (2026-11-23): phase 1 + boards built

The app lives in `apps/circuitlab/` (see its README and NOTICE) and opens from
the **Circuit Lab** card. Built so far:

- ohmlet on the platform (its own React + TS + three 0.170 bundle, served at
  `/circuitlab/`, built into `dist/circuitlab/`); the AI panel is hidden
  until it goes through our server (TODO in `src/llm/client.ts`).
- **The board bridge** (`src/mcu/board-chip.ts`): each board is one chip;
  outputs drive `{v: Vcc·fraction, rout ≈ 25 Ω}`, inputs read node voltages
  with Schmitt thresholds and pull-ups, ADC, PWM / servo / tone waves with
  exact edges published to fast parts (`ChipStepCtx.pinEdges`, `peers`),
  5 V-on-3.3 V and over-current damage with reasons, USB-powered 5V/3V3 pins.
- **Runtimes**: Instant mode (Arduino C++ → generator JS in sim time, line
  highlight, library shims) for every board; Compiled mode for Uno / Nano
  (AVR-GCC WASM from the CDN → HEX → avr8js with timers, ADC, USART, TWI).
- **Parts**: servo, buzzer pitch, LCD 16×2 I²C, OLED 128×64, NeoPixel ×8,
  HC-SR04, DHT22, multimeter (V / mA with a fuse / Ω); the scope gets the
  probes as before.
- **Lessons**: Blink, Button → LED, Fade, Pot → Servo, Sensor → LCD,
  555 blinker, Distance meter, ESP32 5 V trap, Pico blink.

**Next steps** (not built yet):

1. rp2040js for a real Pico (MicroPython firmware / `.uf2`), the micro:bit
   simulator, Pyodide + gpiozero / RPi.GPIO for the Raspberry Pi Linux boards.
2. The server tier: QEMU (ESP32, Raspberry Pi OS) and Renode (STM32, nRF52)
   on the Mac Studio, pins bridged over the WebSocket.
3. Lessons with auto-checked goals (§10), a logic-analyser view with I²C
   decoding, DHT22 timing in Compiled mode, NeoPixels in Compiled mode, an
   in-app SPICE check (ngspice WASM), and the remaining catalogue parts.

Not usable: *Circuit Sim 3D Mobile Lab* (no licence = all rights reserved);
Velxio (AGPL) and CircuitJS (GPL) stay idea-only.

### EE Lab I track (CCNY EE 22100 topics)

Thirteen **original** experiments covering the topics of the catalog
description of CCNY EE 22100 (test and measurement instruments, virtual and
computer instrumentation, electric and electronic circuits, transient and
frequency response, logic circuits, discrete circuits, operational
amplifiers). No university lab-manual text is used; a course's own manual
can be added later as more data files.

- **Experiments are data**: `apps/circuitlab/src/labs/ee-lab-1/NN-*.json`
  (goal, theory, pre-lab with answers as expressions, procedure, measurement
  table with a `source` per row, optional sweep, simulator `checks`, and a
  reference `build`). Expressions see part values by id (`R1`, `PS_v1`,
  `GEN_frequency`) and the pre-lab keys; `labs/checks.ts` evaluates them with
  a whitelist. Check kinds: dc, reading, led, vpp/freq/vavg, step
  (τ, overshoot, ringing), bode (−3 dB, f₀, Q, gain at f), curve (V at I,
  I/step), truth table, 7-segment.
- **The list**: 1 instruments and loading · 2 Ohm and Kirchhoff · 3 Thévenin,
  max power, superposition · 4 RC/RL transients · 5 RLC step · 6 RC/RLC
  frequency response · 7 diodes, rectifier, Zener · 8 BJT bias and CE gain ·
  9 MOSFET switch and square law · 10 op-amp amplifiers and GBW · 11 active
  low-pass / integrator · 12 gates and a half adder · 13 555 → 7490 → 7447 →
  display.
- **Bench** (dock → Bench): function generator (50 Ω out, High-Z vs 50 Ω
  display), 2-channel scope (triggered capture on the live engine, coupling,
  ×1/×10 probe loading, cursors, Vpp/Vrms/Vavg/f/rise/overshoot/phase, X-Y),
  DMM (V, V~, mA, Ω, continuity, diode; 10 MΩ input), triple supply CV/CC,
  decade boxes, DAQ with a VI panel (rate, duration, plot, table, CSV), Bode
  analyser and curve tracer. Panels publish readings to `labs/sources.ts`;
  the lab table's **Use** button takes them.
- **Solver additions**: small-signal AC analysis (`sim/ac.ts`, complex MNA
  linearised at the DC operating point, op-amp one-pole), adaptive time step
  from the generator frequency, LM741 macro-model (GBW, slew, rail clamp),
  rectifier and Zener diodes, 74-series lab chips (7402, 74112, 7490, 74161,
  74164, 74595, 74138, 74151, 7447). Accuracy tests: `tests/ee-solver.test.ts`;
  every experiment's own checks pass on its reference build
  (`tests/ee-labs.test.ts`).
- **Export**: CSV (pre-lab, table with % error, sweep, checks), PNG plots and
  a printable HTML summary; progress per experiment kept in localStorage.

## Contents

1. [The reference, studied](#1-the-reference-studied)
2. [What we build, and how it differs](#2-what-we-build-and-how-it-differs)
3. [Architecture](#3-architecture)
4. [The circuit solver](#4-the-circuit-solver)
5. [Digital parts and mixed signal](#5-digital-parts-and-mixed-signal)
6. [Running student code on a microcontroller](#6-running-student-code-on-a-microcontroller)
7. [3D parts and the look](#7-3d-parts-and-the-look)
8. [Showing what the circuit is doing](#8-showing-what-the-circuit-is-doing)
9. [The builder: breadboard, wires, probes](#9-the-builder-breadboard-wires-probes)
10. [Lessons and auto-checked goals](#10-lessons-and-auto-checked-goals)
11. [Open-source pieces](#11-open-source-pieces)
12. [Build order](#12-build-order)

---

## 1. The reference, studied

The reference (learn-esp32.vercel.app, three.js r186, viewed 2026-11-23) shows
20 ESP32 lessons, each a finished machine on a breadboard (Flash two LEDs,
Fridge alarm, Mini piano, Mood lamp, Distance meter, Water pump, Keypad lock,
Solar tracker, Radar, Pick and place…). What makes it feel good:

- **One isometric 3D scene** on a warm cream background with a faint
  grid-paper pattern; orthographic-looking camera; clean, slightly toy-like
  parts (ESP32, breadboard, NEMA 17 on a lead screw, A4988, buttons,
  electromagnet) and colourful jumper wires with real bends.
- **Callout cards with leader lines**: a white card per key part ("STEPPER ·
  A4988 — STEP on GPIO 19, DIR on 18: 25 steps a millimetre") joined by a
  dotted coloured line to a dot on the part. They collapse into small pill
  labels when the components list is open.
- **A live readout tag on the moving part** while running
  (`61.4 mm · step 1535`).
- **Schematic inset** in the corner of the 3D view, matching the build.
- **Right column:** tabs Overview / Pinout / Example / Specifications; a lesson
  write-up with "what you'll learn" rows; a code panel ("Try it yourself") with
  run/stop, copy and full screen; **the line being executed is highlighted**
  while it runs; a serial monitor under it (`Home`, `Ball into bin 1`).
- **Components panel** ("18 in view"): each part with a one-paragraph plain
  explanation; clicking focuses the camera on it; a guided toggle "Press the
  buttons in turn while running".
- **Lessons carousel** along the bottom with 3D thumbnails and a check mark
  when done; a progress pill "BASICS 1/20".
- Controls hint: drag / WASD pan, Q / E rotate, scroll zoom; view buttons
  (reset, undo, zoom ±, schematic, info).
- Its "Compiling… Writing 100 %" is theatre: the sketch runs as a scripted
  JS mirror of the C++ shown. Nothing is solved electrically, and students
  can't change the wiring.

## 2. What we build, and how it differs

Keep the reference's clarity and look, and add the three things a class needs:

1. **A real solver**: every voltage and current comes from solving the
   circuit, so a wrong resistor really makes the LED dim or burn, and a
   missing ground really breaks the circuit.
2. **A builder**: students place parts on a breadboard, wire them, and press
   run. Mistakes are safe and visible (smoke, a popped LED, a blown fuse,
   friendly messages).
3. **Instruments and code**: a multimeter, oscilloscope, function generator
   and logic analyser; student code that really drives the pins.

Name suggestion: **Circuit Lab** (a platform app, like the games; it can also
be opened from AI Arcademia's physics floor for younger students later).

## 3. Architecture

```
src/circuitlab/
  parts/        catalogue → part definitions (pins, footprint, sim model, 3D builder)
  board/        breadboard grid, placement, wires → netlist (union-find over holes)
  sim/          MNA solver, device models, transient stepping, damage
  digital/      logic-level parts, edge events, protocol devices (I²C, SPI, UART, 1-Wire)
  mcu/          board runtimes: instant (sketch → JS), avr8js (Uno), rp2040js (Pico)
  instruments/  multimeter, scope, generator, logic analyser
  view/         three.js scene, part meshes, wires, glow, current dots, callouts, schematic
  ui/           parts bin, code editor, serial monitor, lesson panel, help (H)
  lessons/      lesson data + goal checks
```

Data flow each frame: builder edits → netlist (only when it changes) → solver
steps N times (sim time per frame = real dt × time scale) → device states
(LED brightness, motor speed, servo angle, display buffers) → view and
instruments. Student code runs in its own loop against the same pin model.

## 4. The circuit solver

Modified nodal analysis (MNA), the textbook method every SPICE uses. Ours is
written from the maths, not copied from any GPL simulator.

- **Unknowns:** node voltages + currents through voltage sources (and
  inductors in the voltage form). Ground is node 0.
- **Stamps:** resistor (conductance), current source, voltage source (extra
  row), switch (tiny R closed / huge R open), VCVS/VCCS for behavioural parts.
- **Time:** capacitors and inductors become companion models (a conductance in
  parallel with a current source) using trapezoidal integration, backward
  Euler for the first step and after a switch event (kills ringing).
  Default step 5–20 µs; the time-scale slider lets slow things (555 blink,
  RC charge) run in real time and fast things (PWM) run in slow motion.
- **Nonlinear parts** (diodes, LEDs, BJTs, MOSFETs): Newton–Raphson each step,
  with junction-voltage limiting (as SPICE does), at most ~30 iterations,
  then a gmin step-down / source-stepping fallback. Models: Shockley diode
  with per-colour LED Vf; Ebers–Moll BJT (β, Is); square-law MOSFET (Vth, k,
  λ); op-amps and comparators as behavioural macro-models with rail limits
  and slew.
- **Size:** a class circuit is < 200 nodes, so a dense LU with partial
  pivoting is fine; reuse the factorisation while only sources change. Move
  the solver to a Web Worker once circuits get big.
- **Friendly errors**, never a silent NaN: a floating part ("this LED isn't
  connected to anything on one side"), a loop of voltage sources or a short
  across a supply ("the 9 V battery is shorted — it would get hot fast"), a
  missing ground reference.
- **Damage, for teaching:** each part has ratings (resistor W, LED mA,
  capacitor V and polarity, regulator heat, fuse I·t). Over the rating, it
  smokes, pops or bulges in 3D, becomes an open circuit, and the panel says
  why. A reset button repairs everything.
- **Accuracy check:** export the netlist as SPICE and compare with ngspice
  (WASM) in tests, for a set of reference circuits.

## 5. Digital parts and mixed signal

- Logic ICs and protocol devices run as event-driven models at logic level.
- **The boundary:** a digital output is a voltage source with an output
  resistance (≈ 25 Ω for MCU pins, ≈ 50 Ω for 74HC) into the analog net; a
  digital input reads its node voltage with thresholds (low < 30 % Vcc,
  high > 70 %, in between = undefined, shown as a warning), plus an internal
  pull-up when enabled. This is what makes "forgot the pull-up" and "button
  floating" behave like real life.
- **Buses as device models:** I²C (address + registers), SPI, UART, 1-Wire,
  NeoPixel and HD44780 are modelled at transaction level, not per edge, and
  shown on the logic analyser as decoded frames.

## 6. Every open-hardware board: how each one runs

The user wants one simulator for all the open hardware a class uses:
Arduino, ESP, Raspberry Pi (Pico and the Linux computers), micro:bit, STM32,
nRF52 and the small XIAO / Feather / Teensy boards. 21 boards are in the
catalogue (`category: microcontroller`), each with a `runtime` saying how it
runs. Every runtime talks to the circuit through **one pin interface**
(levels with drive strength, pull-ups, ADC, PWM, I²C/SPI/UART transactions),
so a board can switch runtime without the circuit noticing.

**Three tiers of faithfulness**

| Tier | What runs | Boards | Cost |
| --- | --- | --- | --- |
| **Chip** (in the browser) | The real chip is emulated instruction by instruction, running the real compiled program | Arduino Uno, Nano, Mega (`avr8js`, MIT; ATmega2560 partly supported but runs most programs); Raspberry Pi Pico and Pico W (`rp2040js`, MIT; runs the official MicroPython firmware or a compiled `.uf2`); micro:bit v2 (the micro:bit Foundation's MicroPython simulator, WASM, MIT; needs a bridge from its pins to our circuit) | Free per student; works offline after load |
| **Server** (real firmware, remote emulator) | The real firmware runs in an emulator process on our server; pin changes stream over the existing WebSocket to the browser circuit and back | ESP32 / S3 / C3 / C6 (QEMU: Espressif's fork, or a fork with full GPIO such as the one Velxio uses); Raspberry Pi 3/4 running real Raspberry Pi OS (QEMU raspi3b, GPIO through qtest or a serial shim); STM32 and nRF52 (Renode, MIT) | One emulator process per running student: run on the Mac Studio, cap sessions, stop when idle. GPL QEMU runs as a separate unmodified tool, never bundled into our code |
| **Code** (in the browser, the default where no chip tier exists) | The student's code runs in the browser against a faithful model of the board's pins and libraries | ESP32 family and ESP8266 (Arduino transpiler, or MicroPython WASM with a JS `machine` module); Raspberry Pi 4/5/Zero (Python in Pyodide with `gpiozero` and `RPi.GPIO` built on our pin model, plus a small shell-like panel); Uno R4, Leonardo, Pico 2, XIAO SAMD21, Teensy, STM32 when no server is available | Free, instant, scales to a whole class |

So every board works in the browser for a class, and some can switch to
"exact mode" (chip or server) for advanced students. The UI shows which
tier a board is in with a small badge.

**The code tier, in detail**
- **Arduino C++ (all Arduino-style boards, ESP32, ESP8266):** transpile an
  Arduino-C++ subset (types, functions, arrays, structs, `for/while/if/switch`,
  `#define`, simple classes) to JS generator code that yields at every
  statement and at `delay()`. This gives the reference's current-line
  highlight, pause and step. Library shims: Serial, Wire, SPI, Servo,
  AccelStepper, Adafruit_NeoPixel, LiquidCrystal_I2C, the ESP32 LEDC and
  `WiFi`/`WebServer` (mocked, with a pretend phone/browser panel), `tone`.
- **MicroPython (ESP32, Pico in code mode):** the MicroPython WebAssembly
  port with a JS-backed `machine` module (`Pin`, `PWM`, `ADC`, `I2C`, `SPI`,
  `UART`, `time`). Check the port's JS bridge before relying on it.
- **Raspberry Pi Linux boards:** Pyodide (CPython in WASM) with our own
  `gpiozero` pin factory and an `RPi.GPIO` module that call the pin model;
  `time.sleep` yields. Show a terminal-like panel with `python3 app.py`.

**Compiling for the chip and server tiers:** `arduino-cli` on our server
with the AVR, RP2040 and ESP32 cores, cached by source hash, time and size
limits. MicroPython needs no compile.

**Board pages:** each board gets the reference's tabs (Overview, Pinout,
Example, Specifications): a pinout diagram generated from its pin list,
voltage level (3.3 V boards are damaged by 5 V on a pin — the simulator
shows it), current limits per pin, and an example per runtime.

Serial monitor: Serial output streams to the panel; an input box sends
lines back. A plotter tab graphs `Serial.println` numbers.

## 7. 3D parts and the look

- **Units:** 1 unit = 1 mm; the breadboard grid is exactly 2.54 mm, so real
  part footprints fit.
- **Parametric, procedural models** from the catalogue's `look`: resistor
  colour bands generated from the value; electrolytic with a − stripe and a
  longer + leg; LEDs with a domed lens, a flat on the cathode side and a
  longer anode; TO-92 / TO-220 / DIP packages with pin-1 notch and printed
  part numbers (canvas texture); boards with headers, chips, USB ports and
  silkscreen labels. One builder per package family covers most of the 125.
  Bigger modules (motors, sensors, displays) are modelled once, procedurally,
  or come from CC0/CC-BY models (credited).
- **Look (matching the reference):** warm cream background with a faint grid,
  soft key light + ambient from an HDRI, ambient occlusion, very soft shadows,
  slightly saturated clean materials, thin dark outlines on selection, glow
  only from emissive parts. WebGL2 + EffectComposer (GTAO, SMAA, selective
  bloom) is enough; see render-quality.md §4. Render on demand when nothing
  moves.
- **Wires:** tube geometry along a smooth curve that rises from each hole,
  sags slightly, and avoids parts; DuPont ends; colour picked by the student
  (convention: red = +, black = GND, others for signals).
- **Camera:** orthographic-style isometric by default, with orbit
  (left-drag on empty space; a click-vs-drag threshold so clicks still select),
  Q / E rotate, scroll zoom, double-click a part to focus.

## 8. Showing what the circuit is doing

The teaching value is in making invisible things visible:

- **Current dots** flowing along wires and through parts, speed ∝ current,
  direction = conventional current (toggle to electron flow).
- **Voltage colouring:** wires and pins tinted on a scale from GND (blue)
  through mid (grey/green) to supply (red); toggle on and off.
- **LEDs** glow with brightness ∝ current (emissive + bloom), lamps warm up,
  motors spin at the simulated speed, servos turn to the simulated angle,
  buzzers play the real drive frequency through WebAudio, displays show the
  real buffer, relays click.
- **Hover any pin or wire:** voltage, current, and the net name.
- **Callouts** like the reference (cards + leader lines, CSS2D) for lesson
  parts; **live readout tags** on moving parts.
- **Schematic view** generated from the netlist (2D SVG, auto-layout), shown
  as an inset like the reference or full screen; click a symbol to highlight
  the 3D part.
- **Damage effects:** smoke puff, LED pop with a dark lens, capacitor bulge,
  blown-fuse wire — each with a one-line reason.

## 9. The builder: breadboard, wires, probes

- **Parts bin** on the left: search, categories, course level filter, a
  thumbnail and one-line "what it does" per part; drag into the scene.
- **Placing:** legs snap into breadboard holes (pitch-checked); parts can
  straddle the centre channel (DIP ICs); rotate with R; delete with Delete;
  undo/redo with Ctrl+Z / Ctrl+Y.
- **Wiring:** drag from a hole or pin to another; the wire follows the cursor;
  colour from a small palette.
- **Netlist** from union-find over breadboard strips (5-hole half-columns,
  full-length rails) + wires + part pins; it rebuilds only on edits, and the
  solver restarts from the last operating point.
- **Probes:** drag the multimeter's red/black probes onto any two points; the
  ammeter must be put in series (and using it in parallel blows its fuse, the
  classic mistake); scope probes on any node.
- **Save and share** circuits to the platform database (PostgreSQL, already in
  place); a link opens the same build; export SPICE netlist and an image.
- **Help (H)** lists every key and mouse action.

## 10. Lessons and auto-checked goals

Each lesson = a starting build (maybe empty), an explanation (Overview,
Pinout, Example, Specifications tabs like the reference), and **goals the
simulator checks**: "LED current between 5 and 20 mA", "output toggles at
1 Hz ± 10 %", "the motor reverses when the button is pressed", "the divider
gives 2.5 V ± 0.1". A goal turns green live as the student builds.

Suggested course (levels match the catalogue):

1. Level 1 — circuits: what a circuit is (battery, switch, lamp/LED); Ohm's
   law with the multimeter; series and parallel; the LED and its resistor;
   the voltage divider and the potentiometer; the LDR night light; buttons
   with pull-up and pull-down; capacitors charging (RC); the breadboard.
2. Level 2 — electronics: the diode and rectifier; the transistor as a
   switch; the MOSFET driving a motor; relays and flyback diodes; the 555
   blinker and the 555 one-shot; op-amp follower, inverting and non-inverting
   amplifiers; comparators and thresholds; logic gates and a half adder; the
   counter and shift register; first microcontroller: blink, button, PWM fade,
   analog read, servo, buzzer melody, serial plotter.
3. Level 3 — systems: RC and LC filters with the function generator and the
   scope (Bode-style sweep); H-bridge and PWM speed control; steppers and
   microstepping; I²C and SPI sensors with the logic analyser; power
   (regulators, heat, efficiency, batteries); projects like the reference's
   (alarm, piano, radar, solar tracker, pick-and-place).

## 11. Open-source pieces

| What | For | Licence / note |
| --- | --- | --- |
| Our own MNA solver | All analog simulation | Ours |
| [ngspice](https://ngspice.sourceforge.io) via [EEcircuit-engine](https://github.com/eelab-dev/EEcircuit) (WASM) | Accuracy checks in tests, optional "SPICE mode" for advanced students | ngspice BSD-3; EEcircuit MIT (check the npm package's licence field) |
| [avr8js](https://github.com/wokwi/avr8js) | Real ATmega328P (Uno/Nano) running compiled code | MIT |
| [rp2040js](https://github.com/wokwi/rp2040js) | Raspberry Pi Pico; runs MicroPython firmware | MIT |
| [wokwi-elements](https://github.com/wokwi/wokwi-elements) | 2D part graphics for the parts bin thumbnails or schematic look | MIT |
| [MicroPython WebAssembly port](https://www.npmjs.com/package/@micropython/micropython-webassembly-pyscript) | Python in the browser with a JS-backed `machine` module | MIT |
| arduino-cli | Server-side compile for the chip and server tiers | Run as a tool on our server |
| [micro:bit MicroPython simulator](https://github.com/microbit-foundation/micropython-microbit-v2-simulator) | micro:bit v2 in the browser | MIT (WASM build of MicroPython's codal port) |
| [Pyodide](https://pyodide.org) | Python for the Raspberry Pi Linux boards in the browser | MPL-2.0 |
| [QEMU](https://www.qemu.org) (+ [Espressif fork](https://github.com/espressif/qemu)) | ESP32 family and Raspberry Pi OS on the server; a WASM build of QEMU can boot a Pi image in the browser but loads slowly | GPL-2: run as a separate unmodified process, never bundled |
| [Renode](https://github.com/renode/renode) | STM32 and nRF52 real firmware on the server, GPIO driven from outside | MIT |
| CircuitJS1 (Falstad) | Ideas for interaction and visual language | GPL-2: read only, never copy code |
| Velxio | How others bridge emulators and parts | AGPL-3: read only |
| KiCad symbol / 3D libraries, Fritzing parts | Pinouts and reference shapes | CC-BY-SA: reference for shapes and pinouts; we model our own |

## 12. Build order

1. **Core:** catalogue → part definitions for ~25 level-1 parts; breadboard,
   placing, wiring, netlist; MNA solver (R, sources, switches, C, diode/LED);
   LED glow, current dots, voltage colours; multimeter; damage; help panel.
   Unit tests against hand-solved circuits and ngspice.
2. **Boards, code tier:** the one pin interface; the Arduino transpiler for
   every Arduino-style board, ESP32 and ESP8266; Pyodide + gpiozero/RPi.GPIO
   for the Raspberry Pi Linux boards; code panel with line highlight; serial
   monitor and plotter; servo, buzzer, potentiometer, button, PWM. All 21
   boards placeable, with pinouts and 3.3 V / 5 V damage.
3. **Boards, chip tier:** avr8js for Uno/Nano/Mega and rp2040js for Pico/Pico W
   with server compile (arduino-cli) and MicroPython firmware; the micro:bit
   simulator bridged to our pins.
4. **Level 2 parts:** BJT, MOSFET, relay, 555, op-amps, logic ICs, motors,
   steppers and drivers; scope and function generator; schematic view.
5. **Lessons:** the level 1 and 2 course with auto-checked goals; progress;
   save/share.
6. **Level 3:** I²C/SPI/UART devices, logic analyser, displays, NeoPixels.
7. **Boards, server tier:** an emulator service on the Mac Studio — QEMU for
   the ESP32 family and Raspberry Pi OS, Renode for STM32 and nRF52 — with
   pins bridged over the WebSocket, session caps and idle shutdown.
