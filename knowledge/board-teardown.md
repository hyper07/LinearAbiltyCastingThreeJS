# Board teardown: inspect every part on a microcontroller board

How to show a student *what is on the board*: hover a chip and read its name, click it
and learn its job on this board, its specs and what it connects to, pull it out of the
board, peel the layers, light up the touch pins, and follow a net in the schematic.
Reference look: the illustrated ESP32 DevKit V1 screenshot the user shared (bold ink
outlines, flat colours, isometric, cream grid paper, "YOUR LOGIC" / "TOUCH PINS"
callouts, a hover card "CAPACITOR — A surface-mount decoupling capacitor.", a
SCHEMATIC panel listing GPIOs with coloured wires).

- **Data:** [circuit-boards.json](circuit-boards.json) — 6 boards, 228 parts.
- **Built:** Circuit Lab's **Inspect board** mode (`apps/circuitlab/src/inspect/`;
  corner button, key **I**, or `?inspect=<board>` in the URL).
- **Skill:** `.claude/skills/circuit-lab/SKILL.md` § Board teardown.

## Contents

1. [What is in the data](#1-what-is-in-the-data)
2. [Where the numbers come from](#2-where-the-numbers-come-from)
3. [Picking parts](#3-picking-parts)
4. [Highlight: outline, dim the rest](#4-highlight-outline-dim-the-rest)
5. [Hover card and pinned detail panel](#5-hover-card-and-pinned-detail-panel)
6. [Pull out and explode](#6-pull-out-and-explode)
7. [X-ray: peeling the layers](#7-x-ray-peeling-the-layers)
8. [Schematic synced with the 3D board](#8-schematic-synced-with-the-3d-board)
9. [Pin-group callouts and warnings](#9-pin-group-callouts-and-warnings)
10. [The toon look](#10-the-toon-look)
11. [Crisp text](#11-crisp-text)
12. [Performance](#12-performance)
13. [Open source to learn from](#13-open-source-to-learn-from)
14. [Adding a board](#14-adding-a-board)
15. [Next steps](#15-next-steps)

---

## 1. What is in the data

| Board | Parts | Pins | Positions | Circuit / values from |
| --- | --- | --- | --- | --- |
| ESP32 DevKit V1 (DOIT, 30 pins) | 25 | 30 | estimated | Espressif DevKitC V4 reference schematic (same circuit) |
| ESP32-DevKitC V4 (38 pins) | 33 | 38 | estimated | Espressif DevKitC V4 schematic (official designators) |
| Arduino Uno R3 (through-hole) | 48 | 32 | **design file** | Arduino Eagle `.brd` (CC BY-SA 2.5) |
| Arduino Mega 2560 Rev3 | 57 | 86 | **design file** | Arduino Eagle `.brd` (CC BY-SA 2.5) |
| Arduino Nano 3.0 | 23 | 30 | **design file** | Arduino Eagle `.brd` (CC BY-SA 2.5) |
| Raspberry Pi Pico (Rev3) | 42 | 40 | estimated | Raspberry Pi R3 BOM + schematic (open design files) |

Each **board** has its size (mm), PCB colours, a `positions` flag with a note, its
sources with licences, `pins` (name, x, y, net, header), `pinGroups` (touch, ADC1/ADC2,
PWM, UART, strapping… with a note and an optional warning), `nets` (kind power / ground /
signal / local, members, a sentence for the named ones) and `parts`.

Each **part**: `ref` (designator), `kind`, `name`, `marking` (the real top marking where it
teaches, e.g. `ESP32-WROOM-32`, `AMS1117 3.3`, `RP2-B2`), `value`, `package`, position
`x, y` (mm from the lower-left corner seen from the top), `rot` (° CCW), `side`,
footprint `w × d`, height `h`, `look` (which mesh builder), `role` *on this board*
("Linear regulator: 5 V (USB or VIN) → 3.3 V for the ESP32 module and the 3V3 pin"),
`specs` (from datasheets), `nets` (pad → net), optional `facts`, `misconceptions`,
`datasheet`, `note` (when a net or role is inferred) and `fitted: false` for empty
footprints (the DevKitC's spare WROVER pads).

Each **kind** (`kinds` at the top: 43 of them — decoupling capacitor, LDO, buck-boost,
crystal, ESD protector, P-MOSFET power switch, auto-reset capacitor…) carries the
**kid line** (one sentence a child understands), the **deep** EE explanation, facts and
common mix-ups, so 60 identical 100 nF capacitors share one well-written text while each
keeps its own role ("Decoupling capacitor at one of the RP2040's IOVDD power pins").

## 2. Where the numbers come from

- **Arduino Uno / Mega / Nano — exact.** The official Eagle files are XML. Parse
  `drawing/board/elements/element` (`name`, `value`, `package`, `x`, `y`, `rot`; a
  rotation starting with `M` means mirrored = bottom side), the package outline from
  `libraries/library/packages/package` (`smd`/`pad` extents plus `tPlace`/`tDocu` wires),
  pad positions for the header pins (rotate the package's pad coordinates by the
  element's rotation), and nets from `signals/signal/contactref` (`element`, `pad`).
  The board outline is layer 20 (Dimension). Small SMD bodies use nominal JEDEC/EIA
  sizes (0603 = 1.6 × 0.8 mm) instead of the pad extents. Fiducials, logos and
  not-mounted jumpers are dropped. (The extraction script was a 60-line Python
  `xml.etree` pass; the JSON is the source of truth now.)
- **Raspberry Pi Pico — values exact, positions estimated.** The R3 design-file zip has
  the BOM (`.xlsx`: designator, value, voltage, tolerance, package, part number), the
  schematic PDF and an Allegro board file (binary, not parsed). The datasheet gives the
  51 × 21 × 1 mm outline, pin positions, the power chain (D1 VBUS→VSYS, RT6150 buck-boost,
  R5/R6/C3 VSYS÷3 on ADC3, R10/R1 VBUS sense on GPIO24, R2 3V3_EN pull-up, GPIO23 PS pin).
- **ESP32-DevKitC V4 — designators and values exact, positions estimated.** From
  Espressif's schematic PDF (`pdftotext -raw` lists every designator with its value).
  Nets of the small passives are inferred from the schematic block and flagged `note`.
- **ESP32 DevKit V1 (DOIT) — estimated.** DOIT never published open files; the circuit
  is Espressif's DevKitC reference (AMS1117, CP210x, the two-transistor auto-program,
  EN RC, Schottky from USB to VIN). Designators are our labels; clones differ (CH340C,
  CH9102X). Positions follow the 51 × 28 mm outline and Circuit Lab's existing 3D model.
- **Specs** come from the part datasheets (linked per part). Facts are free to use;
  design files are credited (Arduino CC BY-SA → those board entries are CC BY-SA too).

## 3. Picking parts

- Every part is its own `THREE.Group`; every mesh in it carries `userData.ref`. A
  raycast against the flat list of part meshes returns the first hit's ref — the
  antenna has its own ref (`U1-ANT`, `partOf: U1`) so it is pickable on top of its module.
- **Hover** is picked once per frame from the last pointer position (not on every
  pointermove event), and only while no button is down.
- **Click vs drag**: left-drag orbits (house rule), so a pick fires on pointer-up only
  if the pointer moved less than 5 px since pointer-down.
- At this scale (≤ 60 parts, a few thousand triangles) a plain raycast is instant. For
  dense boards (hundreds of parts) use three-mesh-bvh (already a dependency) or GPU
  ID picking (render part ids into a 1×1 target under the cursor).

## 4. Highlight: outline, dim the rest

- **Outline**: OutlineEffect (inverted hull) reads `material.userData.outlineParameters`
  every frame, so each part's materials get their own `{thickness, color}`: ink 0.0045
  normally, amber 0.007 on hover, blue 0.009 when selected, light 0.003 when dimmed.
  (Alternative: OutlinePass, a post-process on a selection list — nicer glow, one extra
  full-screen pass, and it does not give the ink look elsewhere.)
- **Dim the rest**: lerp every other part's toon colour 62 % toward the paper colour
  and fade its labels; the selected part keeps its colours and gets a slight emissive
  tint. Each part owns its materials (cheap at this size), and stores its base colour in
  `userData.base` so tints are always recomputed from the original.
- A **highlighted net** dims everything not on it and tints the parts on it.

## 5. Hover card and pinned detail panel

- **Hover card** (HTML, follows the pointer, flips inside the viewport): the part name in
  bold caps and its kid line — exactly the reference's "CAPACITOR / A surface-mount
  decoupling capacitor."
- **Click → detail panel** (pinned on the right): ref · kind label · side, the name,
  the real marking in a dark chip, the kid line, **On this board** (the role), **Specs**
  table, **Connected to** (net chips; click one to light that net in 3D and in the
  schematic), **How it works**, **Did you know?**, **Common mix-ups**, the datasheet link
  and a **Pull it out** button. A parts list on the left reaches everything, including
  not-fitted footprints and underside parts.
- Esc steps back: put back → deselect → close.

## 6. Pull out and explode

- Hierarchy per part: `root` (footprint position; bottom parts rotated π about x) →
  `spin` (yaw = rot) → `lift` (animated). Lifting `lift.position.y` moves the part
  along *its own* normal, so an underside part comes out of the underside.
- **Pull out**: target height `10 + 1.5 h` mm with a small tilt; a damped lerp (16 % per
  frame) gives the ease-out and the snap back. While up: a dashed leader from the
  footprint, a footprint outline in the accent colour, and a soft shadow on the board
  that fades as the part rises (opacity `0.75 − lift/40`). A pill label (HTML) rides
  above the part.
- **Explode**: every part lifts by tier — microcontroller/module highest, regulators and
  bridges next, passives, connectors lowest — plus a bit for its height, so it reads as
  layers. Stagger by distance from the centre would add drama (not done yet).
- **Flip** turns the whole rig π about the long axis: the Nano's FT232RL, regulator and
  diode are on the underside.

## 7. X-ray: peeling the layers

- **Silkscreen**: the PCB's top face is a canvas texture (18 texels/mm): solder-mask
  colour, gold pads, pin names rotated beside each pin, part outlines with designators,
  the board's name as plain text (no logos). A second canvas without the white
  printing is swapped in when silkscreen is off.
- **Copper**: a transparent overlay canvas draws each net as a chain of L-shaped links
  between the parts and pins on it (nearest-neighbour order, power and ground thicker).
  It is labelled honestly in the UI: connections, not the real traces. Real copper
  would come from Gerbers (tracespace) or a KiCad/Eagle board's `wire`/`segment`s.
- **Parts**: solid → x-ray (28 % opacity, outlines faded, depth-write off) → hidden.

## 8. Schematic synced with the 3D board

- A **ladder schematic** generated from the nets (`schematicLayout`): one horizontal rail
  per net that joins two or more parts — power first (red), ground (ink), signals (a
  stable rainbow by name, like the reference's coloured wires), local links — and one
  column per part, chips first, with a small symbol (zig-zag resistor, plates, diode
  triangle, crystal, switch, coil, transistor, connector, box). A dot marks each
  part-to-net connection.
- **3D → schematic**: selecting a part highlights its column and its rails.
- **Schematic → 3D**: clicking a column selects the part; clicking a rail lights the net
  (copper layer shows, parts on it tint, the rest dims).
- A drawn schematic (real symbols from the KiCad symbol library, auto-placed with ELK)
  would look more like a textbook; the ladder is honest, generated, and always in sync.

## 9. Pin-group callouts and warnings

- Groups are data (`pinGroups`): id, label, colour, pins, a note and an optional
  warning. Each board names which ones are on by default (`callouts`: the ESP32 V1 shows
  **Your logic** and **Touch pins**, like the reference).
- The dot sits at the centroid of the group's pins on its busiest header row; the pill
  is pushed 64 px away from the board's screen centre with a dashed leader, so labels
  stay off the board as on a technical drawing. Positions update every rendered frame
  (direct DOM transforms, no React re-render).
- Clicking a pill rings its pins on the 3D board (coloured rings drawn on top) and shows
  the note and warning. ESP32 groups and the facts behind them: safe GPIO; touch T0,
  T2–T9; ADC1 (works with Wi-Fi) vs ADC2 (**not while Wi-Fi runs**); DAC 25/26;
  input-only 34–39 (no pull-ups); strapping 0/2/5/12/15 (**GPIO12 high at boot selects
  1.8 V flash — no boot**); UART0 = USB serial; flash pins 6–11 (**never use**).

## 10. The toon look

- `MeshToonMaterial` with a three-step nearest-filtered ramp (150/210/255), a warm
  hemisphere light and one key light; no real shadows.
- Ink outlines by **OutlineEffect** (inverted hull, ink `#2b2433`) — the same as the
  lab's Illustrated view; screen-space post-process edges (depth + normal Sobel) would
  give crisper, uniform lines on tiny parts if needed.
- Cream paper `#f6efe1` with a 32 px grid, a soft radial contact shadow under the board
  (canvas gradient on a plane), a long lens (16° FOV) for the near-isometric feel while
  keeping perspective picking simple.
- Parts are simple boxes and cylinders with the right proportions: metal end caps on
  chip passives, gull-wing legs on QFP/SOIC, pads around QFNs, a pin-1 dot, a shield can
  with its marking, the printed meander antenna, gold header pins, a socketed DIP.

## 11. Crisp text

- **HTML overlays** for everything you read (hover card, callouts, detail, schematic):
  always sharp, selectable, translatable, accessible.
- **Canvas textures** for text that belongs to the board (silkscreen 18 texels/mm,
  markings 48 texels/mm) with anisotropic filtering, redrawn once web fonts are ready.
- For 3D labels that must turn with the board and stay sharp at any zoom, use SDF text
  (troika-three-text, MIT) instead of canvases.

## 12. Performance

- Render on demand: a dirty flag set by controls, animation and state changes; the
  overlays are positioned in the same frame callback.
- The 285 KB JSON and the inspect code load lazily (dynamic import) when Inspect opens;
  everything is disposed on close (geometries, materials, canvas textures, renderer).
- Biggest board: the Mega (57 parts, the TQFP-100's 100 legs). If boards grow, merge
  each part's static meshes, or draw legs/pins with `InstancedMesh`.

## 13. Open source to learn from

| Project | What to learn | Licence |
| --- | --- | --- |
| [InteractiveHtmlBom](https://github.com/openscopeproject/InteractiveHtmlBom) | The best "click a BOM row, the footprint lights up" UX for real boards | MIT |
| [KiCanvas](https://github.com/theacodes/kicanvas) | Rendering KiCad boards and schematics in the browser, layer toggles | MIT |
| [tracespace](https://github.com/tracespace/tracespace) | Gerber → SVG layers (real copper, mask, silkscreen) | MIT |
| [wokwi-elements](https://github.com/wokwi/wokwi-elements) | 2D SVG boards with pin positions (ESP32 DevKit V1, Uno, Mega, Nano, Pico) | MIT |
| KiCad [footprints](https://gitlab.com/kicad/libraries/kicad-footprints) / [3D models](https://gitlab.com/kicad/libraries/kicad-packages3D) | Real package dimensions and 3D shapes | CC BY-SA 4.0 with a design exception |
| three.js examples: OutlineEffect, OutlinePass, raycasting | The outline and picking code used here | MIT |
| [troika-three-text](https://github.com/protectwise/troika) | SDF text in 3D | MIT |
| Arduino reference designs, Raspberry Pi Pico design files | The data source | CC BY-SA 2.5; Raspberry Pi open licence |

Nothing was vendored: the Inspect code is our own and uses only three.js (already a
dependency). If wokwi-elements SVGs or troika are added later, vendor them with their
LICENSE files and credit them in `docs/third-party.md` and the app's NOTICE.

## 14. Adding a board

1. **Find open design files**: Eagle `.brd` (XML) or KiCad `.kicad_pcb` (S-expressions:
   `(footprint "…" (at x y rot) (layer "F.Cu"|"B.Cu") … (pad "1" … (net 3 "+3V3")))`).
   Parse refs, positions, sides, packages and nets as in §2. No files → take values from
   the published schematic/BOM and estimate positions; set `positions: "estimated"` and
   say how in `positionsNote`.
2. Give each part a `kind` (reuse the 43; add a kind only for a new type of part), a
   board-specific `role`, `specs` from the datasheet, and a `note` for anything inferred.
3. Add `pins` with silkscreen names and nets, `pinGroups` with warnings, and `callouts`.
4. Add sources with licences; credit design files in `docs/third-party.md` and
   `apps/circuitlab/NOTICE`. Set `labBoard` if Circuit Lab has the board.
5. Extend `tests/unit/circuit-boards.test.mjs` with the board's key facts.

## 15. Next steps

- ESP32-S3-DevKitC-1 and ESP32-C3-DevKitM-1 (Espressif publishes their schematics),
  Pico W / Pico 2, Uno R4.
- Live values: when the inspected board is in the lab and running, show the solver's
  voltages on nets and currents through the regulator (never faked).
- Quests for kids: "find the part that makes 3.3 V", "which chip talks to your computer?".
- Real copper from Gerbers; a drawn schematic; Korean and other languages for the text.
