---
name: circuit-lab
description: Use when building or changing anything about electronics in this repo — 3D electronic components (resistors, LEDs, ICs, boards, sensors, motors, breadboards, wires), circuit simulation (voltages, currents, MNA solver, damage), microcontroller code running against simulated pins (ESP32, Arduino, Pico, MicroPython), instruments (multimeter, oscilloscope), a breadboard circuit builder for students, electrical-engineering lessons with auto-checked goals, or a board teardown / inspect view (every on-board part of an ESP32, Arduino or Pico with its name, role, specs and nets; pull-out, x-ray layers, pin-group callouts, synced schematic).
---

# Circuit lab: 3D parts, real simulation, student-built circuits

The user wants an electrical-engineering class lab: every common component as a 3D
model, simulations students can watch, and a breadboard where they build and test
their own circuits. Reference look: learn-esp32.vercel.app (studied in the guide §1).

## 1. Read first

- `knowledge/circuit-lab.md` — the plan. §1 the reference studied, §3 architecture,
  §4 solver (MNA, companion models, Newton–Raphson, damage, friendly errors), §5 mixed
  signal and buses, §6 code runtimes (Instant / avr8js / MicroPython), §7 3D look,
  §8 making current and voltage visible, §9 builder UX, §10 lessons and goals,
  §11 open-source picks and licences, §12 build order.
- `knowledge/circuit-components.json` — 125 parts: pins, `sim` model, 3D `look`,
  `teach`, level 1–3. Search: `npm run kb -- relay --kind circuit-part`.
- For general look and rendering: the `game-visuals` skill and `knowledge/render-quality.md`.

## 2. Rules

- **Never fake the electricity.** Values shown to students come from the solver.
  Scripted animation is fine only for things outside the circuit (a ball rolling into a bin).
- **Write the solver from the maths.** CircuitJS (GPL) and Velxio (AGPL) are for ideas
  only; never copy their code. MIT pieces (avr8js, rp2040js, wokwi-elements, the
  MicroPython WASM port) can be vendored with their licence (CLAUDE.md `vendor/` rules).
- **1 unit = 1 mm**, breadboard pitch 2.54 mm, so real footprints fit.
- **Mistakes are safe and teach:** over-rating parts smoke/pop/bulge with a one-line reason;
  a reset repairs all. Solver failures become friendly messages, never NaN.
- **Make the invisible visible:** current dots, voltage colours, LED glow ∝ current, hover
  readouts, live readout tags, a schematic view synced with the 3D build.
- **House rules:** H opens How to play; left-drag on empty space orbits with a
  click-vs-drag threshold; Q / E rotate the view; visible credits for every third-party asset.

## 3. Board teardown / inspect

Showing what is *on* a board — the user's ask: "pull the components from those
controllers, so it shows the name of the component on the board and its specs".

- **Read** `knowledge/board-teardown.md` (data model, where the numbers come from,
  picking, outline + dim, pull-out / explode, x-ray layers, synced schematic, pin-group
  callouts, the toon look, crisp text, performance, open-source references, adding a board).
- **Data** `knowledge/circuit-boards.json`: ESP32 DevKit V1 (30 pins), ESP32-DevKitC V4,
  Arduino Uno R3, Mega 2560, Nano 3.0, Raspberry Pi Pico — 228 parts with designator,
  position (mm), package, marking, role on this board, specs, nets; 43 `kinds` carry the
  kid line, the deeper EE text, facts and mix-ups; `pinGroups` carry warnings.
  Search: `npm run kb -- regulator --kind circuit-board`.
- **Built** in Circuit Lab: `apps/circuitlab/src/inspect/` (Inspect board button, key I,
  `?inspect=esp32_devkit_v1`). Reuse it; add boards as data.
- **Rules**
  - Specs come from real datasheets or the maker's BOM, each part linking its datasheet;
    cite the design files per board with their licence (Arduino's are CC BY-SA, so their
    board entries are too). Never present an estimate as measured: `positions:
    "estimated"` with a `positionsNote`, and a `note` on any inferred net or role.
  - **No company logos.** Show only the part markings that teach (`ESP32-WROOM-32`,
    `AMS1117 3.3`, `RP2-B2`) and the board's name as plain text.
  - Every part gets a kid line *and* a deeper explanation (via its kind) — one sentence a
    child understands, then the real EE.
  - Copper drawn from nets is "connections", not real traces: say so in the UI.
  - Credit new sources in `docs/third-party.md` and `apps/circuitlab/NOTICE`.

## 4. Check your work

- Unit-test the solver against hand-solved circuits (divider, RC charge τ, LED with
  resistor, transistor switch, 555 frequency) and, where possible, against ngspice output.
- Screenshot the lab with Playwright and compare with the reference look (§1): clean
  parts, readable labels, callouts, nothing overlapping.
- `npm test`, `npm run build`, e2e with the dev server up.
