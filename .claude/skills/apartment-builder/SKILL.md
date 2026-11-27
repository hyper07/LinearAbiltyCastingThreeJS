---
name: apartment-builder
description: Use when building apartments, flats, houses or any multi-unit building with real room layouts in this repo — floor plans as data (walls, doors, windows, rooms, units, levels, stairs and lift cores), plan → 3D walls with openings, cut-away / dollhouse / x-ray views of a floor, level switchers and explode views, unit pins and unit cards, areas in m² / 평 / ft² (Korean 전용·공급·서비스 면적), Korean apartment types (판상형, 타워형, 3-bay/4-bay, 59㎡/84㎡, 오피스텔 corridors), furniture auto-placement, photo-like interior renders, importing real layouts (Swiss Dwellings, IFC, building-register data) or a user's floor-plan picture, and the legal rules for real layouts. Draws on knowledge/apartment-study.md and src/shared/apartment/.
---

# Apartments and units with real layouts

The user wants buildings you can open floor by floor — walls, doors, furniture,
numbered unit pins, a card per flat with its area, facing and pictures — built
from **actual layouts**. Reference: a night cut-away of one floor of a city block
(`images/16.png`, never committed): walls cut at ≈ 1.2 m, warm rooms on a navy
night, pins, a level switcher, Rooftop/Street views, an area-unit toggle, a unit
card with rendered photos. Learn the technique; never copy its branding or UI.

## 1. Find the knowledge (cheap)

```bash
npm run kb -- apartment floor plan          # techniques → apartment-study sections
npm run kb -- 평 전용 공급                    # Korean areas
npm run kb -- cutaway section clipping
npm run kb -- --show own.shared.apartment   # the proof module's API
npm run kb -- sofa --models                 # furniture to fetch (polyfork Open Plan kit)
```

Then read only the section you need of `knowledge/apartment-study.md`:
§1 the reference read closely · §2 open source, datasets, models and licences ·
§3 the plan data model · §4 Korean apartments (평, 전용/공급, 판상형/타워형, bays,
typical sizes, 45,000 real plans measured) · §5 plan → 3D (wall pieces, mitres,
wall polygons, clipping caps, the cut) · §6 levels, shells, explode/peel · §7 the
night look · §8 real layouts and generators · §9 furniture placement · §10 pins,
card, areas, facing · §11 cameras · §12 interior pictures · §13 plan picture →
vector · §14 budgets · §15 game ideas · §16 legal · §17 phase-2 kit · §19 checklist.
The single-house dollhouse (camera-facing wall cutaway, room lights, stairs,
first-person walk, people and pets): `knowledge/homescape-study.md`.

## 2. Start from what exists

- `src/shared/apartment/plan.js` (pure): the plan JSON, `formatArea` (m² / 평 /
  ft²), `unitAreas` (전용, 공급, 서비스), `unitFacing` / `facingName` (en/ko),
  `wallPieces` (wall boxes with door and window holes, cut at any height),
  `corridorBuilding` (a generated test block).
- `src/shared/apartment/build.js`: `createApartmentView(plan, { cut })` — levels
  built once (interior / shell / ceiling), `setLevel(id, 'floor'|'rooftop'|'street')`,
  `setCut`, `highlight`, `unitAnchor`, `unitBounds`, `interiorShots`,
  `withFullHeight`, `update`.
- `/apartment-lab.html` + `src/shared/apartment/lab.js` (dev only): the whole
  technique running — pins, card, snapshots, level switcher, step inside.
- `vendor/apartment/` (MIT reference, not imported): **my-home** (apartment
  generators incl. the band skeleton that fits Korean 판상형, auto-furnish, walk
  grid, floor stack, room-masked lamps, probes), **blueprint-js** (mitred wall
  half-edges, rooms as faces), **react-planner** (plan JSON, rooms as wall-graph
  cycles). `vendor/apartment/NOTICE.md` says what each file teaches.
- Data and assets in `library/` (never committed): Swiss Dwellings real layouts
  (`npm run library:fetch -- --sources dwellings`, CC BY 4.0), polyfork Open Plan
  furniture (CC BY 4.0), Poly Haven furniture (CC0), ambientCG floors, tiles,
  plaster (CC0).

## 3. Build a unit or a building

1. **Get the layout** (§8): generate one (corridor block, or the band skeleton for
   a Korean 3-/4-bay), import one (Swiss Dwellings rows, IFC via `web-ifc`, a
   user's picture through §13), or build to public numbers (건축물대장 전유공용면적
   per 호 + the GIS footprint).
2. **Write it as §3 JSON**: metres on wall centre lines; walls with openings
   (`at`, `width`, `sill`, `head`); rooms with kinds and en/ko names; units owning
   rooms; corridor, stairs and lifts owned by the level. Validate (§3).
3. **Areas** (§4.2): 전용 to the inner wall faces, 공급 = 전용 + common share,
   balconies as service; show official numbers when you have them.
4. **3D** (§5–6): wall pieces into one InstancedMesh per level, floors per room,
   furniture instanced, shells with lit windows below, the cut at 1.0–1.2 m.
5. **Furnish** (§9): fixtures from the plan, then big pieces by wall runs +
   scoring, then small things.
6. **Look** (§7): navy night, warm key from above, light pools, AO, bloom.
7. **UI** (§10–11): pins on the active level, card with the area toggle and
   facing, fly-to, level switcher, rooftop/street presets, step inside.

## 4. Rules

- **Real layouts only from** public numbers (our own drawing to them), a licensed
  dataset with its credit shown (Swiss Dwellings, MSD: CC BY 4.0), or the user's
  own upload kept private. Never trace a developer's brochure or a listing site's
  plan image, never scrape listing sites. Label generated plans "typical layout"
  and renders as renders.
- **No brands:** no apartment brand names or logos (래미안, 자이, …), no real
  developer's colours; made-up or descriptive building names.
- **Units and areas correct:** metres in data; 1평 = 3.3058 m², 1 m² = 10.7639
  ft²; say which area (전용 vs 공급) every time; Korean names next to English.
- **Licences** (§2): MIT/BSD/Apache/MPL code adapted with its licence kept and
  credited in `docs/third-party.md`; GPL/AGPL (DeepFloorplan, FloorplanToBlender3d,
  xeokit, Sweet Home 3D) and NC/research data or weights (CubiCasa5k, RPLAN,
  LIFULL, Structured3D, 3D-FRONT) for study or evaluation only.
- **Repo rules:** left-drag orbits (click vs drag 5 px), number keys for levels,
  H = How to play in a game, a corner minimap in an RPG; zones not big maps (one
  building open at a time); a new game goes on the build queue and the user picks
  it (Snowpuff Peaks is the focus); free assets with visible credits; heavy
  rendering (Cycles, training a recogniser) runs on the Mac Studio.

## 5. Check the result

Open the page (dev server), take screenshots of a floor from the default view, a
picked unit with its card, the street view and a step-inside view, and compare
side by side with the reference (§1) and with a real plan of the same type for
proportions (§4.5). Go through apartment-study §19. Check the areas by hand for
one unit (outline minus half walls; ÷ 3.3058 for 평). Then `npm test` and
`npm run build` when the work lands in a game.
