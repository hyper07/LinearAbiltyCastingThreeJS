---
name: racing-rc
description: Use when designing or building anything with vehicles in this repo — racing games, high-quality realistic cars (paint, clearcoat, chrome, glass, wheels, lights), chase/cockpit cameras and speed feel, drift and handling physics, tyre smoke/dust/skid marks/exhaust flames, wet roads, racing HUDs, RC toy cars racing round a house, FPV drone gate racing, bicycles and other ridden vehicles. Draws on the racing/RC screenshots in images2/ and knowledge/racing-study.md.
---

# Racing, RC cars and FPV drones

The user collected racing references (`images2/`, never committed): supercar
chase clips, an indie rally game, a hover-racer HUD, a cockpit view, FPV drone
racing and a simulator, and a real RC drift car driving round a house with a cat.
They want **racing games with high-quality cars** and **RC-car games** (kids
friendly, like the plush direction in the `game-visuals` skill).

## 1. Find the knowledge (cheap)

```bash
npm run kb -- car paint clearcoat           # techniques → racing-study.md sections
npm run kb -- rc car house --kind visual-ref
npm run kb -- --show ref.img2-0353          # one screenshot's notes; `image` = local file
npm run kb -- toy car --models              # models to fetch
```

Then read only the section you need of `knowledge/racing-study.md`:
§2 the ten ingredients of an expensive-looking car · §3 materials with numbers ·
§4 cameras and speed feel · §5 effects · §6 wet roads and night · §7 handling ·
§8 racing HUD · §9 RC miniature game · §10 FPV drones · §11 game ideas ·
§12 what the repo already has · §13 verified free models, HDRIs, physics libs and
examples · §14 checklist.
City streets and buildings (Seoul): `knowledge/seoul-buildings.md` — building types,
proportions, where Korean signs really go, materials, order of work.

## 2. Look at the real image when the look matters

Phone screenshots, 1206×2622. Shrink before reading:

```bash
sips -s format jpeg -Z 1280 "images2/IMG_0348.PNG" --out "$SCRATCH/ref-0348.jpg"
```

Best: 0275 (rear detail), 0283 (paint/overcast), 0286 (exhaust flames), 0348
(wet road, drift angle), 0259 (stylised rally: dust, ruts), 0312 (race HUD),
0355 (FPV stick overlay), 0353/0354 (RC at home). If `images2/` is missing, work
from the notes.

## 3. Rules

- **Original cars and tracks.** Learn camera, light, materials, timing. No real
  brand badges, names or liveries; our own plates and badges. Never rebuild a
  specific game.
- **Free assets, credited** (CC0 first; CC BY with visible credit and
  `docs/third-party.md`). Don't ship three.js `ferrari.glb`. Strip the logos from
  Khronos CarConcept.
- **Start from what exists:** `src/city/drive.js` (pure handling), `racefx.js`
  (skid/smoke/sparks/flames), `weather.js`; `src/snowpuff/render/pipeline.js`
  (WebGPU: GTAO, emissive bloom, TRAA, speed blur), its 120 Hz physics and speed
  kit. New games: WebGPURenderer + TSL, three pinned at r0.185.
- **Physics:** pure, tested handling module first; Rapier's vehicle controller
  when a rigid-body world is needed (forward axis defaults to +X).
- **Focus and queue:** a new game goes on the build queue; ask the user before
  starting one. Keys: numbers for items, never Q/E for potions, H = How to play;
  every game keeps a corner minimap; left-drag orbits the camera.

## 4. Check the result

Run the game, take Playwright screenshots (chase at speed, a slide, night/wet),
and compare side by side with the 1–3 references used, going through
racing-study §14. Then `npm test` and `npm run build`.
