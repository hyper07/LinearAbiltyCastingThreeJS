---
name: circuit-lab
description: Use when building or changing anything about electronics in this repo — 3D electronic components (resistors, LEDs, ICs, boards, sensors, motors, breadboards, wires), circuit simulation (voltages, currents, MNA solver, damage), microcontroller code running against simulated pins (ESP32, Arduino, Pico, MicroPython), instruments (multimeter, oscilloscope), a breadboard circuit builder for students, or electrical-engineering lessons with auto-checked goals.
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

## 3. Check your work

- Unit-test the solver against hand-solved circuits (divider, RC charge τ, LED with
  resistor, transistor switch, 555 frequency) and, where possible, against ngspice output.
- Screenshot the lab with Playwright and compare with the reference look (§1): clean
  parts, readable labels, callouts, nothing overlapping.
- `npm test`, `npm run build`, e2e with the dev server up.
