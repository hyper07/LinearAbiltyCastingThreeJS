# apartment (reference code)

Source files from three MIT projects (see LICENSE and each subfolder's LICENSE),
kept as reference for the apartment kit. They are TypeScript or depend on the rest
of their app (Vue, React, Immutable), so nothing here is imported by our build.
Read them, then write our own plain three.js version in `src/shared/apartment/`.
The study that explains them: `knowledge/apartment-study.md`. Find them with
`npm run kb -- apartment`.

| Folder | From (commit) | What to read it for |
| --- | --- | --- |
| `my-home/` | [Jannchie/my-home](https://github.com/Jannchie/my-home) `31ea4a9` (2026-11-27) | Rooms-first floor-plan model in centimetres (`model.ts`); walls derived from room edges as exterior / partition / open (`walls.ts`); procedural apartment generators: Japanese nLDK (`generate.ts`), the three-band south-facing skeleton that Chinese and Western flats share (`generate-band.ts`, `generate-cn.ts`, `generate-west.ts`, `generate-region.ts`) with area targets and rule checks; carved / bumped outlines (`footprint.ts`); furniture candidates along walls, scoring and beam search (`place.ts`, `arrange.ts`, `occupancy.ts`); door swings (`doors.ts`); multi-floor plans and stairs (`floors.ts`, `stairs.ts`); a 10 cm walk grid with clearance and A* (`nav.ts`); dimension lines (`dimensions.ts`); in 3D: the floor stack with explode / fade (`three/floorStack.ts`, `three/building.ts`), room-masked lamps (`three/lightMask.ts`) and per-room irradiance probes (`three/gi.ts`, `three/giShader.ts`). Comments are in Chinese and Japanese. |
| `blueprint-js/` | [aalavandhaann/blueprint-js](https://github.com/aalavandhaann/blueprint-js) `f9ab104` (2026-11-11), an ES6 port of [furnishup/blueprint3d](https://github.com/furnishup/blueprint3d) | Walls-first model: corners joined by walls; each wall has two half-edges whose interior / exterior ends are mitred by intersecting the offset lines of neighbouring walls (`half_edge.js`); new walls split at crossings and rooms found as the faces of the corner graph (`floorplan.js` `findRooms`); room polygons and areas (`room.js`). |
| `react-planner/` | [cvdlab/react-planner](https://github.com/cvdlab/react-planner) `efa710e` (2019-11-03) | Plan JSON in layers of vertices, lines (walls), holes (doors, windows) and areas (`models.js`); rooms as the inner cycles of the wall graph after biconnected components (`graph-inner-cycles.js`, `graph-cycles.js`, `graph.js`); 2D geometry helpers (`geometry.js`); the 3D wall with holes cut by CSG and the area floor from its polygon (`wall-factory-3d.js`, `area-factory-3d.js`; they import files not kept here). |
