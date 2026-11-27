# Apartment study: real layouts, cut-away buildings and units in three.js

The user wants to **build apartments and the units inside them with their actual
layout**: a building you can open floor by floor, rooms with walls, doors and
furniture, unit pins and a card for each flat, and photo-like pictures of the
rooms. This study collects how to do it on our stack (three.js r0.185, plain ES
modules, no React), which open-source code, data and models we may use, the Korean
apartment rules (전용/공급 면적, 평, bays), and what is legal for real layouts.

- **Reference:** a night cut-away of one floor of a city apartment building
  (`images/16.png` from the user's batch, never committed): roof off, walls cut at
  about 1.2 m, furnished rooms either side of a corridor, numbered unit pins, a
  level switcher L1–L5, Rooftop/Street views, an ft²/m² toggle and a unit card with
  rendered interior photos, area, facing and levels. We learn from it; its
  branding, copy and UI are not copied.
- **Proof:** `/apartment-lab.html` (dev only) with `src/shared/apartment/`
  (`plan.js` pure, `build.js` three.js, `lab.js` the page). §18 says what it shows.
- **Reference code:** `vendor/apartment/` (my-home, blueprint-js, react-planner;
  MIT). **Real layouts:** `library/datasets/swiss-dwellings/` (CC BY 4.0, opt-in
  fetch). **Furniture:** polyfork's Open Plan kit and Poly Haven furniture in
  `library/`.
- **Earlier study to reuse:** `knowledge/homescape-study.md` — a single-house
  dollhouse (wall runs from rectangles §1, the camera-facing wall cutaway §2,
  stairs and floors §3, room lights §4, camera §12, hover and labels §13,
  furniture from primitives §14, render-on-demand §15). This study does not repeat
  it; it adds buildings of many units, real data, Korean rules, recognition and
  rendering.
- **Search:** `npm run kb -- apartment`, `npm run kb -- floor plan`, `npm run kb -- 평`.
  The technique records (`from: "apartment-study"`) point back here.

## Contents

1. [The reference, read closely](#1-the-reference-read-closely)
2. [Open source and data: what we may use](#2-open-source-and-data-what-we-may-use)
3. [The plan data model](#3-the-plan-data-model)
4. [Korean apartments: types, areas, numbers](#4-korean-apartments-types-areas-numbers)
5. [Plan → 3D: walls, openings, floors, the section cut](#5-plan--3d-walls-openings-floors-the-section-cut)
6. [Buildings: levels, shells, explode and peel, the level switcher](#6-buildings-levels-shells-explode-and-peel-the-level-switcher)
7. [The cut-away night look](#7-the-cut-away-night-look)
8. [Where real layouts come from, and generating our own](#8-where-real-layouts-come-from-and-generating-our-own)
9. [Furniture: models and automatic placement](#9-furniture-models-and-automatic-placement)
10. [Unit pins, the unit card, areas and facing](#10-unit-pins-the-unit-card-areas-and-facing)
11. [Camera rigs](#11-camera-rigs)
12. [Photo-like interior pictures](#12-photo-like-interior-pictures)
13. [Floor-plan picture → vector plan](#13-floor-plan-picture--vector-plan)
14. [Performance budgets](#14-performance-budgets)
15. [What the platform could make with it](#15-what-the-platform-could-make-with-it)
16. [Legal notes on real layouts](#16-legal-notes-on-real-layouts)
17. [Phase 2: the apartment kit](#17-phase-2-the-apartment-kit)
18. [The proof in this repo](#18-the-proof-in-this-repo)
19. [Checklist](#19-checklist)

---

## 1. The reference, read closely

What makes the screenshot read as "a real building I can shop in", in order of
importance:

1. **One floor open, the rest closed.** The active level is a furnished plan seen
   from above at roughly 50–60° pitch; the floors below are a dark shell whose
   windows glow; nothing above. The street, parked cars and lamps sit far below.
2. **Walls cut low and white.** Every wall (outer, party, partition) stops at about
   1.0–1.2 m with a white top, so each room reads like a box with furniture in it.
   Tall pieces (wardrobes, fridges) are not cut. Door gaps show as breaks in the
   white lines.
3. **Warm interior against a navy night.** Floors are warm oak; rugs, sofas and
   beds are light; the corridor is a cool grey band; outside is deep blue-black.
   The contrast is the whole mood. Light pools under lamps, no visible ceiling.
4. **A long lens.** Perspective but narrow (≈ 25–35° vertical FOV), so the plan
   barely converges — almost isometric, still with depth.
5. **Pins, not labels.** Dark round badges with the unit number and a small tail
   pointing down to the unit; the picked one turns white. Constant screen size.
6. **The unit card.** A large rendered interior photo, three thumbnails, the unit
   and level, a name ("studio + balcony"), area with a unit toggle, where it
   faces ("River"), how many levels it spans, one call to action.
7. **Navigation chrome.** A vertical level switcher on the right (L5 … L1), two
   preset views (rooftop, street), an area-unit toggle. Everything else is the
   scene.

For our versions: keep 1–5 (the technique), make our own card and chrome, name
things in plain words, and show m² / 평 / ft² (Korean viewers think in 평 and
전용 ㎡; §4).

---

## 2. Open source and data: what we may use

Licences were checked on the repository or record page on 2026-11-27. **Adapt**
means we may copy and change the code with the licence kept; **study** means read
for ideas and write our own; **avoid** means do not ship anything derived from it.

### 2.1 Floor-plan editors and 3D generators

| Project | Licence | Verdict | What it gives us |
| --- | --- | --- | --- |
| [Jannchie/my-home](https://github.com/Jannchie/my-home) (Vue + three.js, active 2026) | MIT | **Adapt** — vendored in `vendor/apartment/my-home/` | The closest thing to our goal: procedural apartment generators (Japanese 1K–3LDK; a three-band south-facing skeleton shared by Chinese and Western flats — close to a Korean 판상형), area targets and rule checks, rooms-first model in cm, walls derived from room edges, auto-furnishing by candidates + scoring + beam search, an occupancy table, multi-floor plans and stairs, floor-stack explode/fade, room-masked lamps, per-room irradiance probes |
| [furnishup/blueprint3d](https://github.com/furnishup/blueprint3d) and its ES6 port [aalavandhaann/blueprint-js](https://github.com/aalavandhaann/blueprint-js) | MIT | **Adapt** — model files vendored in `vendor/apartment/blueprint-js/` | Walls-first model: corners and walls, two half-edges per wall with mitred interior/exterior ends, crossings split, rooms found as faces of the corner graph |
| [cvdlab/react-planner](https://github.com/cvdlab/react-planner) | MIT | **Adapt** — model and graph files vendored in `vendor/apartment/react-planner/` | Plan JSON (layers → vertices, lines, holes, areas, items); rooms as inner cycles of the wall graph; 3D wall with holes by CSG |
| [amitukind/architect3d](https://github.com/amitukind/architect3d) | MIT | Study | blueprint3d descendant with a 2D planner; nothing beyond the above |
| [Sweet Home 3D](https://www.sweethome3d.com) (Java, and its JS viewer) | GPL-2.0+ | **Study only** | The reference desktop home planner; furniture catalogue format, wall arcs, room ceilings. Do not copy code |
| [grebtsew/FloorplanToBlender3d](https://github.com/grebtsew/FloorplanToBlender3d) | GPL-3.0 | **Study only** | Classic OpenCV plan-image → walls/rooms → Blender mesh pipeline (thresholds, contours); write our own (§13) |
| `library/homescape/` (studied before) | see its repo | Study (done) | `knowledge/homescape-study.md` |

### 2.2 BIM / IFC on the web

| Project | Licence | Verdict | Use |
| --- | --- | --- | --- |
| [ThatOpen/engine_web-ifc](https://github.com/ThatOpen/engine_web-ifc) (`web-ifc`, WASM) | MPL-2.0 | **Use as an npm dependency** (file-level copyleft: our code stays ours; changes to its files must stay open) | Read and write IFC in the browser: `IfcBuildingStorey`, `IfcSpace`, `IfcWall`, `IfcOpeningElement`, `IfcDoor`, `IfcWindow` with geometry. An "import an IFC model" path for architects' files, and an "export our plan as IFC" lesson |
| [ThatOpen/engine_components](https://github.com/ThatOpen/engine_components), [engine_fragment](https://github.com/ThatOpen/engine_fragment) | MIT | Adapt | A three.js BIM viewer toolkit (fragments = instanced, streamed IFC geometry; clipping, plans, measurements). Heavy; borrow the ideas (fragments, section planes with fills) rather than the whole stack |
| [ThatOpen/web-ifc-three](https://github.com/ThatOpen/web-ifc-three) | MIT | Study (deprecated) | The old IFCLoader for three.js |
| [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) | LGPL-3.0 | Tool only | Python/C++ IFC geometry; fine as an offline converter on the Mac Studio, not shipped |
| [xeokit/xeokit-sdk](https://github.com/xeokit/xeokit-sdk) | AGPL-3.0 (or paid) | **Avoid** | Its section planes and storey views are good ideas; AGPL would bind our server |

### 2.3 Indoor map formats (for import/export, not for drawing)

- **OSM Simple Indoor Tagging** (`indoor=room|area|corridor|wall|door`, `level=*`,
  `repeat_on=*`): wiki CC BY-SA, data ODbL. Good for public buildings (stations,
  malls); almost no private flats are mapped. ODbL data used in a game needs
  attribution and share-alike of the derived *database*. A tiny MIT parser exists
  ([IndoorToolkit/indoor-osm-parser](https://github.com/IndoorToolkit/indoor-osm-parser)).
- **IMDF** (Apple's Indoor Mapping Data Format, an OGC Community Standard): GeoJSON
  features `venue → building → footprint → level → unit (category: room, walkway,
  elevator, stairs, restroom …) → opening → fixture → anchor`. Its *shape* is a
  good export format for our plan (§3 maps onto it 1:1); coordinates are WGS84, so
  keep a site origin and bearing.
- **IndoorGML** (OGC, XML, cells and their connectivity graph) — only if a
  partner asks.
- **Swiss Dwellings CSV** (§2.4) — the format we will actually import.

### 2.4 Real-layout datasets

| Dataset | Licence | Verdict | Notes |
| --- | --- | --- | --- |
| [Swiss Dwellings v3.0.0](https://zenodo.org/records/7788422) (Archilyse AG) | **CC BY 4.0** | **Use** — fetched by `npm run library:fetch -- --sources dwellings` into `library/datasets/swiss-dwellings/` (0.9 GB zip, 2.7 GB unpacked) | 45,176 apartments in 3,100+ buildings. `geometries.csv` (3.26 M rows): `apartment_id, site_id, building_id, plan_id, floor_id, unit_id, area_id, unit_usage, entity_type, entity_subtype, geometry (WKT, metres), elevation, height`. Types: `area` (ROOM, BEDROOM, LIVING_ROOM, LIVING_DINING, KITCHEN, BATHROOM, CORRIDOR, BALCONY, LOGGIA, STOREROOM, STAIRCASE, ELEVATOR, SHAFT …), `separator` (WALL, RAILING, COLUMN — as polygons), `opening` (DOOR, ENTRANCE_DOOR, WINDOW), `feature` (KITCHEN, SINK, TOILET, BATHTUB, SHOWER, STAIRS). Plus daylight, view, noise simulations. Credit "Swiss Dwellings (Archilyse AG), CC BY 4.0" wherever a layout is shown. Numbers from it in §4.5 |
| [Modified Swiss Dwellings (MSD)](https://data.4tu.nl/datasets/e1d89cb5-6872-48fc-be63-aadd687ee6f9) | CC BY 4.0 | Use if training | 5,372 whole-floor plans as graphs + rasters (5.5 GB), made for floor-plan auto-completion |
| [ResPlan](https://github.com/m-agour/ResPlan) | data CC BY 4.0, code MIT | Use with care | 17,000 vector residential plans with room graphs; scraped from public listings (South Asia) with a takedown file — provenance is weaker; fine for training a recogniser, not for showing a "real" home |
| [MLSTRUCT-FP](https://github.com/MLSTRUCT/MLStructFP) | code MIT; check the dataset's own Zenodo licence | Study | 954 large multi-unit plan images with wall polygons — good for wall-segmentation training if its data licence allows |
| [CubiCasa5k](https://github.com/CubiCasa/CubiCasa5k) | **CC BY-NC 4.0** (dataset and repo) | **Study / evaluate only** | 5,000 annotated Finnish plan images (SVG labels: walls, rooms, icons). The standard benchmark; models trained on it inherit NC |
| RPLAN, LIFULL HOME'S, Structured3D, 3D-FRONT/3D-FUTURE, FloorPlanCAD | research-only / NC | **Avoid** for anything shipped | Most published recognition and layout models are trained on these |
| [AI Hub](https://aihub.or.kr) 건축 도면 데이터 (Korean apartment, villa and house plans, ≈ 48,000 images) | AI Hub terms (Korean users, application, no redistribution) | Study / train in-house only after reading the terms | The only large Korean plan set; check whether trained weights may ship |

### 2.5 Floor-plan recognition models (§13)

| Model | Code licence | Weights trained on | Verdict |
| --- | --- | --- | --- |
| CubiCasa5k multi-task model | CC BY-NC | CubiCasa5k | Evaluate only |
| [DeepFloorplan](https://github.com/zlzeng/DeepFloorplan) / [TF2DeepFloorplan](https://github.com/zcemycl/TF2DeepFloorplan) | GPL-3.0 | R2V + R3D (research) | Study only |
| [PyTorch-DeepFloorplan](https://github.com/zcemycl/PyTorch-DeepFloorplan) | MIT | R3D | Code adaptable; retrain on CC BY data |
| [Raster-to-Vector](https://github.com/art-programmer/FloorplanTransformation) | MIT | LIFULL (research) | Junction + integer-programming idea worth copying; retrain |
| [Raster-to-Graph](https://github.com/SizheHu/Raster-to-Graph) | GPL-3.0 | LIFULL | Study only |
| [RoomFormer](https://github.com/ywyue/RoomFormer) | MIT | Structured3D, SceneCAD (research) | For *scans* (density maps), not photos; retrain to ship |
| [HEAT](https://github.com/woodfrog/heat) | research-only + GPL | — | Avoid |
| House-GAN++, HouseDiffusion, Graph2Plan (generation) | research-only / none | RPLAN | Avoid; ideas only (bubble graph → plan) |

### 2.6 Layout and furniture generation

| Project | Licence | Verdict | Use |
| --- | --- | --- | --- |
| my-home `arrange.ts`, `place.ts`, `occupancy.ts` | MIT | Adapt (vendored) | Candidates along walls → scored → beam search; door-swing and passage clearances |
| [allenai/procthor](https://github.com/allenai/procthor) | Apache-2.0 | Adapt ideas | Room spec tree → floor plan by recursive rectangle splitting → doors by connectivity → objects by per-room-type rules and "anchor + children" groups |
| [allenai/Holodeck](https://github.com/allenai/Holodeck) | Apache-2.0 | Study | Language → floor plan + object list (via an LM) → spatial constraints (near, against wall, facing, aligned) solved by DFS; the constraint vocabulary is the useful part |
| [princeton-vl/infinigen](https://github.com/princeton-vl/infinigen) (Indoors) | BSD-3-Clause | Study | Constraint language + simulated annealing for whole rooms; Blender-based, too heavy to run, good rules |
| [nv-tlabs/ATISS](https://github.com/nv-tlabs/ATISS), DiffuScene, LayoutGPT | NVIDIA NC / research | Avoid | Learned on 3D-FRONT |

### 2.7 Rendering helpers

| Project | Licence | Use |
| --- | --- | --- |
| [gkjohnson/three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer) + [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | MIT | Photo-like interior shots in the browser (§12). Already used by Circuit Lab |
| [gkjohnson/three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg), [elalish/manifold](https://github.com/elalish/manifold) (`manifold-3d`) | MIT / Apache-2.0 | Boolean cuts when walls are arbitrary meshes (curved walls, imported models). Not needed for straight walls (§5) |
| [N8python/n8ao](https://github.com/N8python/n8ao) | CC0 | Ambient occlusion pass for WebGL: contact shadows under furniture — the biggest single realism win in a top view |
| [mapbox/earcut](https://github.com/mapbox/earcut), [polygon-clipping](https://github.com/mfogel/polygon-clipping) | ISC / MIT | Triangulate floors with holes (three's `ShapeUtils` already wraps earcut); union / difference of room and wall polygons (Swiss Dwellings walls minus openings, §5.3) |
| three.js examples `webgl_clipping_stencil`, `webgl_clipping_advanced` | MIT | Clipping planes with stencil caps for cutting *imported* meshes (§5.4) |

### 2.8 Furniture models and materials

| Source | Licence | In the library | Notes |
| --- | --- | --- | --- |
| polyfork **Open Plan** kit (63 parts: sofa, beds, wardrobe, kitchen runs, hob, sink, fridge, bath, shower, toilet, vanity, rugs, lamps, curtains, interior door, stair flight, skirting) | CC BY 4.0 | `library/polyfork/` (auto-fetched with the extras since this study) | Low-poly, one style, all the pieces a flat needs. `npm run kb -- sofa --models`. Credit each model shown |
| polyfork Hospital, Office, University, Modern Restaurant Cafe kits | CC BY 4.0 | `library/polyfork/` | For non-home buildings (a school, a clinic) |
| Poly Haven models (sofas, armchairs, coffee and dining tables, cabinets, lamps, plants, ≈ 60 furniture pieces) | CC0 | `library/polyhaven/` | Photoscanned, heavy (1k textures); for the hero shots in §12 |
| ambientCG WoodFloor070 / 051 / 034 (herringbone), Tiles141, Marble012, Carpet016, PaintedPlaster017 (+ WoodFloor041/043, Plaster001, Tiles133A already there) | CC0 | `library/ambientcg/` (auto-fetched) | Floors, bathroom, kitchen, rugs, walls |
| [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit) (140 pieces) | CC0 | by hand into `library/inbox/` (Kenney blocks scripts) | Cute, clean, toy-like — the kids' dollhouse look |
| Quaternius furniture / house packs | CC0 | by hand into `library/inbox/` | Same |
| Poly Haven HDRIs | CC0 | `library/rigged/hdri/` | Window light and reflections for §12 |

---

## 3. The plan data model

One JSON per building, metres everywhere, ids stable. Two ways to store walls are
in use in the wild, and we want both:

- **Rooms first** (my-home, homescape): rooms are polygons on wall centre lines;
  walls are *derived* from room edges (edge shared by two indoor rooms → partition;
  edge with nothing outside → exterior; a pair marked open → no wall). Easiest to
  generate and to edit by dragging rooms; areas fall out directly.
- **Walls first** (blueprint3d, react-planner, IFC, Swiss Dwellings, plan
  recognition): walls are lines or polygons with thickness; rooms are the faces
  between them. What real data and recognisers give us.

So the schema stores rooms *and* walls; a generator writes rooms and derives
walls, an importer writes walls and derives rooms (faces of the wall graph,
react-planner `graph-inner-cycles.js`; or Swiss Dwellings' own area polygons).

```jsonc
{
  "schema": "gamory.apartment/1",
  "lengthUnit": "m",
  "north": 0,                       // degrees clockwise from plan up (−y, three −z) to true north
  "site": { "lat": 37.56, "lon": 126.97, "bearing": 0, "address": null },
  "source": { "kind": "generated | public-register | user-upload | swiss-dwellings | ifc",
              "ref": "…", "licence": "…", "credit": "…" },
  "levels": [{ "id": "L4", "index": 3, "name": "4F", "elevation": 9.0, "height": 2.8, "slab": 0.2 }],
  "walls": [{
    "id": "L4-ext-s", "level": "L4",
    "a": [0, 18.6], "b": [46, 18.6],          // or "path": [[x,y], …] for a polyline (split into segments)
    "polygon": null,                          // or the exact outline (Swiss Dwellings / IFC); wins over a/b
    "thickness": 0.25, "kind": "exterior | party | corridor | partition | core | railing | curtain",
    "height": null,                           // null = the level's height; railing ≈ 1.1
    "openings": [{ "id": "…", "type": "door | entry-door | sliding | window | balcony-door | opening",
                   "at": 12.3, "width": 0.9, "sill": 0, "head": 2.1,
                   "hinge": "start | end", "swing": "in | out" }]
  }],
  "rooms": [{ "id": "L4-406-living", "level": "L4", "unit": "L4-u406",
              "kind": "living | bedroom | kitchen | dining | bath | toilet | entry | dress | utility | pantry | alpha | balcony | corridor | lobby | stair | elevator | shaft | storage",
              "name": { "en": "Living room", "ko": "거실" },
              "polygon": [[x, y], …], "floor": "WoodFloor070", "ceiling": 2.3 }],
  "units": [{ "id": "L4-u406", "level": "L4", "levels": ["L4"], "number": "406",
              "type": "studio | 1bed | 2bed | 59A | 84B …", "name": { "en": "…", "ko": "…" },
              "rooms": ["…"], "outline": [[x, y], …],
              "sideT": { "left": 0.2, "right": 0.2, "front": 0.25, "back": 0.2 },
              "areas": { "exclusive": 59.97, "residentialCommon": 21.4, "otherCommon": 38.2, "service": 14.1 },
              "facing": "S", "bays": 3, "balcony": true }],
  "cores": [{ "id": "…", "level": "L4", "kind": "stair | elevator | shaft", "polygon": [[x, y], …] }],
  "furniture": [{ "id": "…", "level": "L4", "unit": "…", "room": "…", "kind": "sofa",
                  "model": "polyfork/sofa-9c0e7e", "x": 3.1, "y": 14.2, "w": 2.1, "d": 0.9, "h": 0.8,
                  "rot": 0, "face": [0, -1], "y0": 0 }],
  "footprint": [[x, y], …]
}
```

Rules that keep it honest:

- **Metres, centre lines.** Wall `a`/`b` and room polygons sit on wall centre
  lines; thickness is split half each side. (my-home stores centimetres; homescape
  metres; Swiss Dwellings metres with walls as polygons.)
- **Plan axes.** `[x, y]` in plan maps to three `(x, elevation, y)`, so plan "up"
  is −z. Never mix in latitude/longitude; keep `site` for that.
- **Openings belong to walls** with `at` = distance of the centre from `a`. A door
  in a shared wall is one opening (not one per room). Window `sill` 0.9, `head`
  2.1–2.2; doors 0 / 2.1; Korean balcony doors 0 / 2.2–2.3.
- **Units own rooms; common parts belong to the level** (corridor, lobby, stairs,
  lifts, shafts). That split is what the area rules need (§4.2).
- **Areas are stored and recomputed.** Store the official numbers you were given
  (register, developer sheet, user) in `units[].areas`; compute your own from the
  geometry; show the official ones and warn when they differ by more than 3 %.
- **Validation** (a pure `checkPlan(plan)`): rooms don't overlap; every room is
  reachable from the unit's entry door through doors/open edges (BFS over the room
  graph); every opening fits inside its wall and is ≥ 0.1 m from its ends; doors
  don't swing into each other; minimum sizes per kind (§4.4); unit areas inside
  their type's band.
- **Export**: rooms → IMDF `unit` features, walls → IFC `IfcWall` with
  `IfcOpeningElement`s, levels → `IfcBuildingStorey`. Import is the reverse.

Pure helpers already written in `src/shared/apartment/plan.js`: `polygonArea`,
`signedArea`, `perimeter`, `centroid`, `bbox`, `innerAreaOrthogonal`,
`unitAreas`, `formatArea`, `compassOf`, `unitFacing`, `outwardNormal`,
`pointAlong`, `pointInPolygon`, `wallPieces`.

---

## 4. Korean apartments: types, areas, numbers

### 4.1 Units of area

- **1 평 = 400/121 m² = 3.3058 m²** (exactly; the old 6 × 6 자 square). `m² ÷ 3.3058`.
- **1 m² = 10.7639 ft²** (1 ft² = 0.09290304 m², exact).
- Official documents have used ㎡ only since 2007 (계량법), but people still say
  평형 ("a 34평") — and they mean **supply** area in 평, not exclusive. Always
  label which area a number is.

### 4.2 Which area is which (공동주택)

| Term | What it covers | Notes |
| --- | --- | --- |
| **전용면적** (exclusive) | Inside the unit, measured to the **inner face** of its outer and party walls (안목치수, since 1998); partitions inside count | The legal size: "59㎡", "84㎡". 국민주택규모 = 85㎡ 이하 |
| **주거공용면적** (residential common) | Your share of stairs, corridors, lift halls, lifts, entrance lobby | Typically 25–35 % of exclusive in 계단실형 towers |
| **공급면적** (supply) | 전용 + 주거공용 | What "평형" quotes: 59㎡ ≈ 79–85㎡ supply (24–25평형), 84㎡ ≈ 108–115㎡ (33–35평형) |
| **기타공용면적** (other common) | Share of underground parking, management office, community facilities | |
| **계약면적** (contract) | 공급 + 기타공용 | On sale contracts |
| **서비스면적** (service) | Balconies (발코니): not floor area as long as the depth from the outer wall is ≤ 1.5 m | Since 2006 balconies may legally be **확장** (enclosed into rooms); almost every new flat is sold "발코니 확장", so the real living space is bigger than 전용 |

In the proof, `unitAreas(plan, unitId)` returns `{ exclusive, service,
residentialCommon, supply }`: exclusive from the unit outline minus half of each
side's wall thickness (exact for rectangles; `innerAreaOrthogonal` = A − P·t/2 + t²
for orthogonal outlines), residential common as the level's corridor + core area
shared in proportion to exclusive area.

### 4.3 Building and plan types

- **판상형 (slab block):** units side by side along a straight, south-facing slab;
  every unit has front (south) and back (north) façades → **맞통풍** (through
  ventilation), all main rooms south. The Korean default for decades.
- **타워형 (tower):** units round a central core (Y, ㅁ or + shapes); two façades at
  an angle, better views, weaker ventilation, some units face east/west.
- **혼합형:** a slab with tower units at the ends.
- **Bays (베이):** the number of rooms (including the living room) lined up on the
  front façade between bearing walls. 59㎡ → typically **3-bay** (bedroom · living ·
  main bedroom); 84㎡ → **4-bay** (bedroom · bedroom · living · main bedroom), with
  kitchen, bathrooms, dress room and utility at the back. More bays = more light,
  shallower plan, wider frontage.
- **Access:** **계단실형** (stair-hall type): 2 units per landing round a core with
  stairs + 1–2 lifts — the modern norm, private and quiet. **복도형**
  (corridor type): a long open-air or enclosed corridor serving many units — older
  1980s–90s blocks, and today's **오피스텔**, **도시형생활주택** and small public
  rental (행복주택) use a **double-loaded central corridor** exactly like the
  reference screenshot.
- **Unit numbering:** `동` (building) / `호` (unit) where 호 = floor + line:
  `101동 1203호` is building 101, 12th floor, line 03. Lines are vertical stacks of
  identical units; the same line on every floor shares the plan. Our plan keeps
  `number` = floor × 100 + line.

### 4.4 Typical numbers (for generating and checking plans)

Rough figures for recent (2010s–2020s) Korean plans, centre lines unless noted.
Use them as generator ranges and validation bands, never as a copy of a real plan.

| | 59㎡ 3-bay 판상형 | 84㎡ 4-bay 판상형 | Corridor studio (오피스텔) |
| --- | --- | --- | --- |
| Frontage (south façade) | ≈ 9–10.5 m | ≈ 11.5–13.5 m | ≈ 3.6–5 m |
| Depth (front to back outer wall, without balconies) | ≈ 7–8 m | ≈ 7.5–9 m | ≈ 7–9 m |
| Balcony depth (or the expanded strip) | 1.2–1.5 m front and back | 1.2–1.5 m | rarely |
| Living room (거실) clear width | 3.4–3.9 m | 4.0–4.8 m | — |
| Main bedroom (안방) | ≈ 3.3 × 3.6 m + dress room | ≈ 3.6 × 4.0 m + dress room + ensuite | — |
| Other bedrooms | ≈ 2.7 × 3.0 m | ≈ 2.8 × 3.0–3.3 m | — |
| Bathrooms | 1–2 (≈ 1.6 × 2.3 m) | 2 (공용 + 부부욕실) | 1 (≈ 1.5 × 2.2 m) |
| Kitchen | ㄱ/ㄷ counter, 600 deep, fridge niche ≈ 0.9 × 0.9 m, 김치냉장고 | + pantry (팬트리) | a 1.8–2.4 m run |

Also: 현관 with a step down (≈ 0.1–0.15 m) and a 중문; shoe storage; 다용도실
(utility) and 실외기실 (AC outdoor unit room) at the back; sometimes an 알파룸
(flex room). Floor-to-floor **2.8–3.0 m**, ceiling **2.3–2.4 m**, bearing-wall
(벽식) structure with **210 mm** slabs (the standard floor for impact noise since
2014), exterior walls ≈ 0.2 m concrete + insulation, party walls ≥ 0.2 m,
non-bearing partitions 0.1–0.15 m. Floors are 온돌 (underfloor heating) with wood
or vinyl finish; no shoes indoors — so no rugs at the door, slippers at the step.

### 4.5 What 45,000 real apartments say (Swiss Dwellings, measured here)

Measured from `geometries.csv` (all 3.26 M rows) with a script in our scratch
space; medians with 10th / 90th percentiles. Swiss plans, not Korean — but these
are real, CC BY, and the best calibration we have for room proportions:

| Room | Area m² (p10 / p50 / p90) | Short × long side (median) |
| --- | --- | --- |
| Bedroom / room | 10.5 / 14.4 / 19.9 | 3.3 × 4.4 m |
| Living room | 16.1 / 20.7 / 29.8 | 4.0 × 5.5 m |
| Living + dining | 19.3 / 28.5 / 39.4 | 4.7 × 6.8 m |
| Kitchen (closed) | 5.5 / 8.1 / 12.5 | 2.4 × 3.5 m |
| Bathroom | 1.8 / 3.8 / 5.6 | 1.7 × 2.3 m |
| Corridor (in unit) | 3.0 / 8.1 / 16.6 | 2.2 × 4.3 m |
| Balcony | 2.9 / 7.2 / 16.0 | 1.7 × 4.1 m |
| Stair hall | 6.0 / 12.4 / 22.9 | 2.6 × 4.8 m |
| Lift car | 1.6 / 2.6 / 3.7 | 1.5 × 1.7 m |

Walls: thickness quartiles **0.12 / 0.18 / 0.28 m** (p10 0.08, p90 0.38 —
partitions, then bearing and party walls, then outer walls). Doors: median
**0.84 m** (p10 0.70, p90 1.22 for double doors); entrance doors **0.95 m**;
windows median **1.40 m** (p10 0.69, p90 2.44). Storey height in the data 2.6 m.
Net unit area (rooms, no balconies) by bedroom count: studio 28 / 41 / 64,
1 room 28 / 55 / 72, 2 rooms 53 / 77 / 94, 3 rooms 63 / 92 / 115, 4 rooms
77 / 97 / 136 m².

---

## 5. Plan → 3D: walls, openings, floors, the section cut

### 5.1 Straight walls with holes: boxes, no CSG

The cheapest correct method (homescape §1, `wallPieces` in our `plan.js`): walk the
openings along the wall sorted by start; emit a full-height piece up to each
opening, a sill piece under it (windows), a lintel over it, carry on after it.
Every piece is the same unit box scaled and placed, so a whole level is **one
InstancedMesh** with a matrix and a colour per piece (our `build.js`). Stretch each
piece's ends by half the thickness so outer corners close; overlaps at T-junctions
use the same material and never show.

Rotation: a plan direction `(cos r, sin r)` is three `(cos r, 0, sin r)`, which is a
rotation of **−r about +y** (`q.setFromAxisAngle(up, -r)`).

### 5.2 Mitred polylines (clean corners, thick walls, odd angles)

For walls meeting at angles other than 90°, or when wall tops are visible and
overlaps would show, use blueprint3d's half-edge mitre (`vendor/apartment/
blueprint-js/half_edge.js`): offset each wall's centre line by ±t/2; at each
corner intersect the offset line of this wall with the offset line of the next
wall round that corner (line–line intersection); those points are the
interior/exterior start and end. The wall's footprint is then a quad (or a
polygon with the opening slots cut, §5.3), extruded with `ExtrudeGeometry` or
built by hand. Cap very sharp angles (< 20°) with a bevel to stop spikes.

### 5.3 Wall polygons (Swiss Dwellings, IFC, recognition output)

Real data often gives walls as **polygons**, not lines. Then:

1. `wallsMinusOpenings = difference(union(wallPolygons), openingPolygons)`
   (polygon-clipping) — the full-height parts.
2. Extrude that to the level height (or the cut height, §5.5).
3. For each opening polygon: a window → extrude a **sill block** 0 → sill and a
   **lintel block** head → height; a door → lintel only; plus a thin glass or
   frame mesh inside it.
4. Opening heights rarely come with 2D data: use sill 0.9 / head 2.1 for windows,
   0 / 2.1 for doors, 0 / 2.2 for balcony doors (§4.5 widths are realistic).

Swiss Dwellings rows → our JSON: group by `building_id` and `floor_id` (a level;
`elevation` gives its height), `unit_id` (a unit), `area_id` (a room); `area`
rows become rooms (map subtypes to our kinds), `separator` rows walls (polygon
form, `kind` from WALL/RAILING/COLUMN), `opening` rows openings (attach each to
the wall polygon it overlaps most), `feature` rows fixtures (kitchen run, sink,
toilet, bath, shower, stairs) — these anchor the furniture of §9. Coordinates are
local metres per site; recentre on the floor's bounding box.

### 5.4 Cutting imported meshes (clipping planes and caps)

When the walls or furniture are meshes we did not build (an IFC model, a GLB
apartment), cut them with a **clipping plane** instead:

- `renderer.localClippingEnabled = true`; for each material of the active level,
  `material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, -1, 0), elevation + cut)]`.
- The cut leaves walls hollow. **Caps** (the solid "poché" top): the three.js
  `webgl_clipping_stencil` method — render back faces with stencil increment and
  front faces with decrement, then draw one big plane at the cut height where the
  stencil is non-zero, in the cap colour. One cap plane per clipping plane.
- Keep tall furniture uncut (the reference does): only walls get the clipping
  plane; furniture above `cut` stays whole.
- With WebGPU/TSL, the same with `clippingGroups`, or simply discard in the
  material when `positionWorld.y > cutY`.

### 5.5 The cut itself

- **Built geometry:** just build the walls to the cut height (the `cut` argument
  of `wallPieces`; the lintels disappear before the sills). Changing it is a
  rewrite of instance matrices — cheap enough to animate.
- **Height:** 1.0–1.2 m reads as an architect's plan cut (through the windows,
  above sills and furniture). 0.16–0.4 m reads as a "sketch" footprint (homescape's
  camera-facing walls). Full height for interior shots and first person.
- **Camera-facing walls only** (homescape §2): drop only exterior walls whose
  outward normal faces the camera (`dot > 0.2`) — the dollhouse look for one
  house. For a building floor seen from above, cut everything (the reference).
- **Cap colour:** white or light warm grey on a light plan (the reference); dark
  charcoal "poché" for an architectural look; tinted per unit when one is picked.

### 5.6 Floors, ceilings, skirting

- Floor per room: `ShapeGeometry` from the polygon (y flipped), rotated −90° about
  x; 5 mm above the slab; materials by kind (oak for rooms, tile for baths, grey
  for the corridor, concrete for balconies). Holes (stairwells): pass them as
  `Shape.holes`.
- UVs: world-space planar (u = x / tileSize, v = y / tileSize) so planks line up
  across rooms; rotate the plank direction along the room's long side.
- Ceilings only for interior shots and first person (our `withFullHeight`).
- Skirting (a 6 cm dark strip at the wall foot) and door frames are what make a
  top view look "built", cheaply — an extra InstancedMesh.

---

## 6. Buildings: levels, shells, explode and peel, the level switcher

- **Build every level once and keep it** (homescape §3, my-home
  `three/floorStack.ts`). A level group holds three children: `interior` (slab,
  floors, cut walls, furniture, light pools), `shell` (closed box with lit
  windows and balcony slabs), `ceiling` (off). Switching level only flips
  visibility and moves groups.
- **Active level** n: levels < n show `shell`, level n shows `interior`, levels > n
  are hidden (or slide up and fade, my-home's `HIDE_LIFT` ≈ 3.2 m in 0.45 s).
  Ease the opened level down from +1.6 m in 0.35 s so the change reads.
- **Explode view** (all levels open, pulled apart by a gap of ≈ 2.3 m, my-home
  `EXPLODE_GAP`): good for a two-storey unit (복층) or a "how is the building
  stacked" lesson.
- **Peel view:** open the active level and show the levels below as translucent
  ghosts (opacity 0.15, depthWrite off) instead of shells — for seeing which
  units stack (lines).
- **Rooftop and street presets:** close every level (shells), show the roof slab,
  parapet and rooftop kit (lift overrun, plant units, a terrace), and fly the
  camera high (rooftop) or down to eye level across the street (street).
- **Level switcher UI:** a vertical column, top floor at the top, active one
  filled; numbers keys 1–9 jump to a level (the repo's numbers convention).
- **Many identical floors:** build each distinct floor plan once and share its
  geometry across levels (same InstancedMesh data, different group y). Shells of
  30 floors are 30 boxes + one window InstancedMesh.

---

## 7. The cut-away night look

The proof's recipe (`build.js`), and why each piece is there:

| Piece | Setting | Why |
| --- | --- | --- |
| Background + fog | `#0d1424`, fog 90–220 m | Navy night; far ground fades |
| Hemisphere light | sky `#33466e`, ground `#0a0d14`, 0.9 | Cool fill so shadows are blue, not black |
| Warm key from above | `#ffd6a0`, 2.2, slightly south of overhead, 2048² shadow map fitted to the footprint | Stands in for all the room lamps; furniture casts soft shadows into the rooms; one light for any number of units |
| Cool moon | `#8aa2d6`, 0.35 from the north-west | Rim on the shells |
| Light pools | additive radial-gradient planes, `#ffb46a`, opacity 0.5, one per lived-in room and under each street lamp | Warm pools on floors for nearly nothing |
| Lamps | unlit emissive boxes (`MeshBasicMaterial`) | They read as glowing with tone mapping and (later) bloom |
| Shell windows | instanced quads 1.5 cm proud of the façade, 68 % lit in 2700–3200 K tints, the rest `#1a2131` | The "lived-in tower at night" read |
| Tone mapping | ACES filmic, exposure ≈ 1.05, sRGB output | Bright warm interiors without clipping |

Next steps for quality (render-quality guide, `knowledge/render-quality.md`):
N8AO (CC0) for contact shadows under furniture and in corners — the biggest win
in a top view; a bloom pass threshold ≈ 0.9 on the lamps and windows; real room
lights with **my-home's room mask** (`three/lightMask.ts`: a top-down room-id
texture per level so a point light only lights its own room and the rooms open to
it — 16 lights, no shadow maps, no light leaking through walls); per-room
irradiance probes (`three/gi.ts`: cube-capture → 9 SH coefficients per probe,
blended inside the room only) for "bright by the window, darker inside". On the
WebGPU pipeline (Snowpuff's): GTAO + bloom + TRAA nodes do the same.

Daytime variant: sky HDRI, the sun from the real position (homescape §5) entering
through windows; white walls; no pools.

---

## 8. Where real layouts come from, and generating our own

**Real layouts, legally (§16):**

1. **Public numbers, our geometry (Korea).** The building register API
   (건축HUB 건축물대장정보 서비스, [data.go.kr 15134735](https://www.data.go.kr/data/15134735/openapi.do),
   국토교통부, 이용허락범위 제한 없음) gives, per building and unit: 표제부 (floors,
   height, structure, use), 층별개요 (per-floor area and use), **전유공용면적**
   (each 호's exclusive and common areas), 전유부. With the building outline from the
   GIS building data we already use for Seoul (KOGL type 1, `docs/seoul.md`), we
   know: how many floors, how many units per floor and line, each unit's exact
   전용/공용 area, the footprint. We then **generate** a plan of the right type
   (판상형 3- or 4-bay, 타워형) that matches those areas — real numbers, our own
   drawing. That is a "real building" without copying anyone's plan.
2. **Real plans with a licence.** Swiss Dwellings (CC BY 4.0) — 45,000 real
   apartments with walls, doors, windows and fixtures, imported per §5.3. The best
   source of "actual layouts" we may show, with credit.
3. **The user's own plan.** An upload of their home's floor-plan picture (§13) or
   an IFC/DXF from their architect. It is their document; we process it for them,
   keep it private by default, and never put it in the repo or a shared gallery.
4. **Hand-measured or described.** A teacher or player draws their flat in an
   editor (react-planner-style: draw walls, rooms close themselves).

**Generating our own** (for games, tests and "a typical 84㎡"):

- **Band skeleton** (my-home `generate-band.ts` + `generate-cn.ts`): the plan is
  three columns — L block | C column | R block — mirrored at random. The C column
  is living room on the south (balcony beyond) and dining/entry on the north; the
  L and R blocks are a south row of rooms and a north row of rooms with a corridor
  between. Room widths come from ranges, the narrower row spreads the slack, then
  a search over seeds keeps only plans inside the target area band and the rule
  checks. Map it to Korea: C column = 거실 + 주방/식당 (or 주방 at the back in the
  R block), south row = bays (bedrooms + 안방 + 거실), north row = 욕실 ×2, 드레스룸,
  다용도실, 현관 with 중문. A 3-bay is L(1) + C + R(1); a 4-bay is L(2) + C + R(1).
- **Rectangle splitting** (ProcTHOR, squarified treemaps): split the unit
  rectangle recursively by area weights from a room list; then add doors by a
  spanning tree of the adjacency graph (public rooms first). Fast, varied, a
  little boxy.
- **Outline variation** (my-home `footprint.ts`): carve a notch or bump out a
  bay window after the rooms are placed, re-hang the openings on the new edges.
- **Rule checks** (my-home `planViolations`; our §3 validation): minimum living
  area per bedroom count, the kitchen and fridge fit, every room reachable, each
  bedroom has a window, wet rooms stacked over each other in a line.
- **Corridor buildings** (the proof's `corridorBuilding`): two rows of units
  between party walls either side of a 1.8 m corridor, a core of stair + lifts in
  one row, units mirrored in pairs so bathrooms share a wall, numbered floor × 100
  + line.

---

## 9. Furniture: models and automatic placement

**Models.** Primitive boxes first (the proof; homescape §14 builds 248 items from
primitives), then the polyfork Open Plan kit (CC BY 4.0, one consistent low-poly
style, already in `library/polyfork/`), Poly Haven pieces for close-ups (CC0),
Kenney/Quaternius for a toy look (CC0, by hand). Normalise each model once:
measure its box, put its origin at the floor centre, front facing +x local, and
store `{ w, d, h }` so placement can scale or pick by size.

**Placement, rule-based** (my-home `arrange.ts`, ProcTHOR, Holodeck's vocabulary):

1. **Free wall runs.** For each room, take each wall's inner face, subtract the
   door openings plus their swing quarter-circles, window spans (for tall pieces),
   and anything already placed. What remains are runs where furniture can stand
   (my-home `occupancy.ts` `wallSpans`).
2. **Candidates.** For each big piece (bed, wardrobe, sofa, TV unit, desk, dining
   table), generate ≈ 10 spread-out candidates against those runs, facing into the
   room (`placeCandidates`).
3. **Score** with plain rules:
   - **Bed:** head against a solid wall (not under a window, not the door wall),
     not facing the door, foot not blocking it, room on both sides for a double,
     a nightstand fits at the head. 안방 gets the biggest bed and the dress room
     door clear.
   - **Sofa ↔ TV:** sofa back to a wall, facing the TV unit across the room at
     2–3 m, nothing big between. Korean living rooms: the TV on the long "아트월"
     wall, the sofa opposite, the balcony window to the side.
   - **Desk:** under or beside a window, the chair can pull out, back not to the
     door.
   - **Wardrobe:** the longest unbroken wall run, not next to a window.
   - **Everyone:** keep a 0.6 m path door-to-door and door-to-balcony; keep door
     swings and the fridge door clear.
4. **Search:** beam search (width ≈ 6) over the combination of candidates, total
   score highest wins; the seed decides ties, so a plan always furnishes the same.
5. **Small things after:** rugs under the sofa group, lamps at bed heads and
   sofa ends, plants in free corners, a dining table near the kitchen, chairs
   around tables, curtains on bedroom windows.
6. **Fixtures first:** kitchens, sinks, toilets, baths and showers come from the
   plan (Swiss Dwellings `feature` rows; our generator's wet-room templates) —
   furniture never moves them.

**Constraint or learned solvers.** Simulated annealing on a cost (overlap +
clearance + rule terms, Merrell et al. 2011 "interior design guidelines") gives
nicer but slower results; Holodeck-style DFS over discrete constraints is good
when an LM proposes the object list ("a cosy studio for a student"); learned
models (ATISS, DiffuScene) are trained on research-only data — avoid.

---

## 10. Unit pins, the unit card, areas and facing

- **Anchor:** the unit's centroid, at `elevation + cut + 0.9 m` (above the cut
  walls). Project to the screen each frame (`vector.project(camera)`), place an
  HTML badge with `transform: translate(x, y) translate(-50%, -100%)`; hide when
  behind the camera or off screen. One DOM element per unit of the *active* level
  only (≈ 10–30) — cheap. For hundreds, use one canvas overlay or a sprite
  InstancedMesh with a number atlas.
- **Pick:** the badge's click, or a click on the unit's floor (raycast the active
  level's floor meshes; their `userData.unit`). A click is a press and release
  within 5 px — anything more is an orbit drag (the repo's left-drag-orbit rule).
- **Highlight:** raise the picked unit's floor emissive (warm, 0.35), or outline
  its polygon; dim the others slightly.
- **Card contents:** unit number and level, a name ("Studio + balcony", "84A
  4베이"), **전용** and **공급** area with the m² / 평 / ft² toggle (`formatArea`),
  balcony (service) area, bedrooms and bathrooms, **facing**, levels it spans,
  interior pictures (§12), one action ("Step inside" in the proof). For a real
  listing also floor, line, and the data source credit.
- **Facing:** the outward normal of the exterior wall with the widest glazing of
  the living room, as a compass point after applying `plan.north`
  (`unitFacing`, `compassOf`): 남향 / South etc. "Faces the river / park" is a
  view label: cast a few rays from the living-room window into the site layer
  (water, park, road polygons from the city data) and name what most rays hit
  first.
- **Area toggle state** is a per-viewer preference; store it in localStorage.

---

## 11. Camera rigs

- **Plan orbit (default):** perspective, **FOV 25–35°**, distance so the floor
  fills the screen, pitch 50–60°; OrbitControls with left-drag rotate (repo
  rule), right-drag pan, wheel zoom, `maxPolarAngle` ≈ 1.45 so it never goes
  under the floor; damping 0.08.
- **Fly to a unit:** keep the current view direction, move the target to the
  unit's centre and the distance to `max(w, d) × 1.9 / tan(fov/2)`; ease in-out
  cubic over 0.9 s (lerp target and position together). homescape §12 flies
  between homes the same way.
- **Level change:** move the target's height to the new level's floor; same ease.
- **Presets:** rooftop (high, roof visible), street (eye height across the road,
  `maxPolarAngle` relaxed to ≈ 0.56 π so it can look up).
- **Step inside / walkthrough:** walls to full height, ceiling on, FOV 60–65°,
  eye 1.45–1.6 m; orbit about a point 0.6 m ahead of the eye to "look around"
  (the proof), or homescape's first-person walk (§12 there: radius 0.24 m,
  2.1 m/s walk, push out of wall segments, door gaps open) and my-home's walk grid
  (`nav.ts`: 10 cm cells with clearance, 8-neighbour A*, string-pulling).
- **Orthographic option:** a true isometric camera (`OrthographicCamera`, 35.264°
  pitch, 45° yaw) for a board-game or blueprint look; zoom with `camera.zoom`.

---

## 12. Photo-like interior pictures

Ranked from cheapest to best:

1. **Rasterised snapshots (the proof).** Turn the level's walls to full height
   and its ceiling on, render the scene from an eye-height camera in a room
   corner looking at the far window corner (FOV ≈ 64°), and copy the canvas into
   a 2D canvas *in the same task* (no `preserveDrawingBuffer` needed); then render
   the normal view again so nothing flashes. Three shots per unit (living,
   bedroom, kitchen), 600 × 400 JPEG data URLs. Fast, honest, game-looking.
2. **Better raster:** the same shots with N8AO, the room-masked lamps, an HDRI
   through the windows (environment only outside), 4× supersampling
   (render at 2× size and downscale), a light vignette. Good enough for most cards.
3. **Path-traced in the browser:** `three-gpu-pathtracer` (MIT) on the same scene
   (it takes a three.js scene; area lights and emissive lamps work), 300–1000
   samples per shot with its denoiser, progressively while the card is open, then
   cached. 2–20 s per shot on an M-series GPU. Simplify the scene first (only the
   unit's level, merged static geometry).
4. **Offline on the Mac Studio (best):** export the unit (GLTFExporter) with the
   Poly Haven furniture and ambientCG materials, render in Blender Cycles headless
   (`blender -b -P render.py`), 1–3 HDRI/sun + lamp setups, denoised; write WebP
   into `library/` or the game's own asset folder. Blender is GPL but our renders
   are ours. Per the house rule, heavy rendering runs on the Mac Studio over SSH.
5. **Picture generation (later):** a depth/edge-conditioned image model can "dress"
   a raster snapshot into a photo look; only with a model whose licence allows
   commercial output, and label the result as an illustration.

Always label generated pictures as renders, never as photos of a real flat.

---

## 13. Floor-plan picture → vector plan

Goal: the user uploads a floor-plan image (a scan, a developer brochure, a
listing screenshot of their own home) and gets rooms, walls, doors and windows to
correct and then build. No licensed model does all of it well, so a **hybrid**:

1. **Normalise.** Grayscale, deskew (Hough on long lines), crop to the drawing,
   resize so the longest side is ≈ 2000 px, binarise (adaptive threshold).
2. **Scale.** Ask for one known length or the unit's total area (전용 from the
   register, §8!). With the area: scale = √(area / pixel area of the interior
   mask). Dimension strings can be read by OCR (PaddleOCR or Tesseract with the
   Korean model, both Apache-2.0) to cross-check.
3. **Walls (classic CV, no training):** walls are the thickest dark strokes —
   morphological opening with a kernel of ≈ the wall thickness keeps them and
   drops text, furniture and dimension lines. Distance transform gives the
   thickness; skeletonise → line segments (LSD / probabilistic Hough); snap angles
   to 0°/90° (Manhattan) where within 5°; merge collinear segments; close gaps
   < a door width. opencv.js (Apache-2.0) runs this in the browser.
4. **Rooms:** flood-fill the free space inside the wall mask (after temporarily
   closing door gaps with lines); each region is a room polygon (simplify with
   Douglas–Peucker, then orthogonalise). Or build the wall graph and take its
   inner cycles (react-planner `graph-inner-cycles.js`).
5. **Openings:** gaps in walls with an arc nearby → doors (the swing arc gives
   hinge and direction); thin triple lines in outer walls → windows. A small
   detector does this better (step 7).
6. **Labels and types:** OCR room names (거실, 침실, 욕실, 주방, 현관, 발코니, 드레스룸,
   다용도실, 실외기실…) and map them to kinds; unlabeled rooms by size and
   fixtures (a toilet symbol → bath).
7. **Learned helpers, licensed cleanly:**
   - A **vision-language model** run locally on the Mac Studio (an
     Apache-licensed VL model) to read labels and the rough room list and check
     the CV result ("is there a room called 드레스룸 inside 안방?"). It cannot give
     precise geometry; CV does.
   - A **wall/room segmentation network** (U-Net size) **trained by us** on
     synthetic data: rasterise Swiss Dwellings, MSD and our own generated plans in
     many drawing styles (line weights, hatches, Korean labels, furniture icons,
     dimension lines, JPEG noise, rotation) — CC BY data and our own renders,
     so the weights are ours to ship. This is the "train the skill" path; CubiCasa5k
     (NC) only as a held-out test of accuracy.
   - For phone **scans** (LiDAR room capture) rather than pictures: RoomFormer's
     approach (density image → room polygons), retrained on CC BY data.
8. **Correct by hand:** the editor shows the result over the picture at 50 %
   opacity; drag corners, click to add doors. Recognition is a head start, not the
   answer.

Output: our §3 JSON with `source.kind = "user-upload"`, private to the user.

---

## 14. Performance budgets

For one building on a mid laptop at 60 fps (WebGL2):

| Thing | Budget | How |
| --- | --- | --- |
| Draw calls | < 150 for the active level, + 2 per closed level | Walls one InstancedMesh per level; furniture one per level (instanced boxes) or one per model type (InstancedMesh shared across units); floors merged per material when not picking; shells one box + one window InstancedMesh per level |
| Triangles | < 1.5 M visible | Low-poly kit for the overview; Poly Haven pieces only in snapshots / close-ups |
| Textures | 1K, ≤ 12 materials per scene, KTX2 later | One atlas for small props |
| Lights | 1 shadowed directional + hemisphere + pools | Real point lights only for the picked unit, or my-home's room mask for 16 lights without shadows |
| Shadow map | 2048², fitted to the active level's footprint | Refit on level change; `shadowMap.autoUpdate = false` when nothing moves |
| Pins | DOM for ≤ 50, canvas/sprites above | Only the active level |
| Frames | render on demand (homescape §15) | Render only while the camera moves, a tween runs, or the cut animates |
| Memory | build every distinct floor once | Identical floors share geometry and instance data |
| LOD | interior only on the active level; shells elsewhere; far buildings as extruded footprints (the Seoul pipeline) | |

---

## 15. What the platform could make with it

Ideas, not commitments — a new game goes on the build queue and the user decides
(focus rule: Snowpuff Peaks first).

- **A unit viewer (real-estate style):** pick a building, open a floor, compare
  units by 전용/공급 area, facing and bays, step inside, see pictures. With
  register numbers (§8) for real Korean buildings drawn as our generated plans,
  clearly labelled "typical layout".
- **A home-design game:** furnish a flat for a client (a family of plush animals,
  `game-visuals` skill: the kids' plush look), with a budget, needs ("a desk by a
  window for the student", "no TV in the bedroom") scored by the §9 rules;
  rooms get happier as they're furnished. Kenney/Quaternius toy furniture fits.
- **Dollhouse for kids:** a cut-away building of plush families at night; tap a
  window to open that flat; tiny stories per unit. homescape's people and pets
  bring it to life.
- **A class simulator:** maths and social studies — measure rooms, compute area in
  m² and 평, compare 전용 vs 공급, scale drawings, compass and sunlight (남향 and
  winter sun angles), why a 4-bay is brighter; build a plan to an area target. An
  Arcademia-style lesson set (every string in en/ko/es/ja/zh).
- **A Seoul layer:** Kickrani's city already has real building footprints; open
  any apartment block there as a cut-away with a generated plan matching its
  register (careful with load: one building at a time, zones not big maps).
- **Escape-room / mystery maps:** generated corridor buildings as game levels,
  with real door and room logic.

---

## 16. Legal notes on real layouts

- **Developers' plans are documents with an author.** In Korea, architectural
  drawings can be protected works (저작권법 §4①5: 건축저작물, including 설계도서).
  But the Supreme Court held that ordinary apartment plans that only re-draw the
  builder's design, where any drafter would draw much the same thing, **lack the
  creativity to be protected** (대법원 2009. 1. 30. 선고 2008도29: copying
  apartment plans and site plans from a handbook was not infringement); later
  cases (2017다261981, 2021) keep the test — a plan with real creative choices *is*
  protected. So: never copy plan *images* or trace a specific developer's
  brochure; generic typologies (a 3-bay 판상형 59㎡) and facts (areas, counts,
  dimensions) are free.
- **Facts are free; drawings and photos are not.** Areas, floor counts, unit
  counts and dimensions from public registers are facts and government open
  data (the building register API: no use restriction; Seoul GIS: KOGL type 1 with
  attribution). Listing sites' plan images, renders and photos (Naver, Hogangnono,
  developers' sites) are someone's work and their terms forbid scraping — don't.
- **Brands and names.** Apartment brand names and logos (래미안, 자이, 힐스테이트…)
  are trademarks; do not use them, even on generated buildings. Call a building by
  a made-up or descriptive name. No real developer's colours or signage.
- **User uploads** are the user's (or their copy for private use): process them
  on their behalf, store them in their space, never in the repo, never shown to
  others without consent, delete on request.
- **Datasets:** Swiss Dwellings, MSD (CC BY 4.0) — show the credit wherever a
  layout from them appears. ResPlan (CC BY 4.0) — honour its takedown process.
  CubiCasa5k, RPLAN, LIFULL, Structured3D, 3D-FRONT — non-commercial or
  research-only: evaluation only, never shipped or used to train shipped weights.
- **Privacy.** A real address + unit number + layout of a lived-in home is
  personal data. Real-building views show unit *types* by line, not who lives
  where; never combine with names.
- **Code.** MIT/BSD/Apache/MPL code is adapted with its licence kept
  (`vendor/apartment/LICENSE`, `docs/third-party.md`); GPL/AGPL code
  (FloorplanToBlender3d, DeepFloorplan, Raster-to-Graph, xeokit, Sweet Home 3D)
  is read for ideas only.

---

## 17. Phase 2: the apartment kit

A reusable module set in `src/shared/apartment/`, growing from the proof:

| Module | Pure? | What |
| --- | --- | --- |
| `plan.js` | yes | Schema helpers, areas (전용/공급/서비스, 평, ft²), facing, `wallPieces`, validation `checkPlan`, room graph + reachability |
| `walls.js` | yes | Derive walls from rooms (my-home `walls.ts` logic), mitred polylines (blueprint3d half-edges), polygon walls minus openings (polygon-clipping) |
| `generate/` | yes | `corridor.js` (the proof's), `slab.js` (Korean 판상형 3/4-bay from the band skeleton), `tower.js` (타워형 round a core), area-band search, rule checks |
| `furnish.js` | yes | Wall runs, candidates, scoring, beam search (my-home `arrange.ts`), small-item pass; model choice by size |
| `import/` | mostly | `swissDwellings.js` (CSV rows → plan), `ifc.js` (web-ifc → plan), `imdf.js` (both ways), `register.js` (건축물대장 → unit list and areas, server side with the API key in `.env`) |
| `build.js` | three | Levels, shells, cut, caps, floors, furniture instancing (box or GLB), light pools, roof, street |
| `look.js` | three | Night / day presets, N8AO, bloom, room-masked lamps (my-home `lightMask.ts`), probes |
| `ui.js` | DOM | Level switcher, pins, card, area toggle — styled per game |
| `shots.js` | three | Raster snapshots, path-traced shots (three-gpu-pathtracer), cache |
| `recognise/` | worker | §13 pipeline: opencv.js steps, OCR hook, model hook, editor overlay |

Tests (when a game uses it): areas and conversions against hand numbers,
`wallPieces` counts and heights, reachability, the generator's area bands, Swiss
Dwellings import on a fixture slice.

---

## 18. The proof in this repo

`npm run dev`, then **`/apartment-lab.html`** (dev only, not in the build):

- `corridorBuilding()` (`plan.js`) generates a 5-storey double-loaded corridor
  block: 14 units per floor (studios, one-beds, two-bed corners; south units with
  balconies), a core of stairs and two lifts, numbered floor × 100 + line, mirrored
  in pairs. Every unit has rooms, walls with doors and windows, and furniture as
  boxes with facings.
- `createApartmentView()` (`build.js`) builds it: per level one InstancedMesh of
  wall pieces cut at 1.2 m, one of furniture, one of lamps; floors per room;
  closed shells with lit windows below the active level; roof and street; the
  night light set of §7.
- `lab.js`: level switcher L1–L5 (right), Floor / Rooftop / Street views (top),
  m² / 평 / ft² toggle, unit pins, click a pin or a floor to fly there and open
  the card (전용, 공급, balcony, facing in English and Korean, bedrooms, level),
  three interior snapshots rendered on the spot, "Step inside" (full-height walls,
  eye level, drag to look), Esc to go back.

It is a technique proof, not a game: generated layout, primitive furniture.

---

## 19. Checklist

Before calling an apartment feature done:

- [ ] Plan validates: no overlaps, every room reachable from the entry, openings
      inside walls, minimum sizes (§4.4), areas in band.
- [ ] Areas: 전용 by inner wall faces, 공급 with the common share, balcony as
      service; 평 = m² ÷ 3.3058; ft² = m² × 10.7639; labels say which area.
- [ ] Facing computed with `plan.north`, in English and Korean.
- [ ] Walls cut at a deliberate height; tall furniture uncut; caps clean (no
      z-fighting at T-junctions, no gaps at corners).
- [ ] Levels: only the active one open; below as shells; switching eases; no
      rebuild on switch.
- [ ] Night look: navy outside, warm inside, lit windows varied, no pure black.
- [ ] Pins: active level only, constant size, hidden off screen; click vs drag
      threshold; left-drag orbits.
- [ ] Card: unit, level, areas with the unit toggle, facing, rooms, pictures
      labelled as renders, data credit when real data is used.
- [ ] Budgets of §14 met; render on demand.
- [ ] Legal: layout from public numbers, a licensed dataset (credited) or the
      user's own upload; no brand names, no copied plan images; vendored code
      keeps its licence; credits in `docs/third-party.md` and the game's panel.
- [ ] Compared side by side with the reference look (§1), and against a real plan
      of the same type for proportions (§4.5).
