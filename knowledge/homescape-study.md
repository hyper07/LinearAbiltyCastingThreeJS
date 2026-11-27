# Homescape study: a live 3D dollhouse, and what we can reuse

Homescape draws a whole home as a small pastel dollhouse you can orbit,
cut open and walk through. Lamps glow room by room, the sun comes in through
the windows at its real angle, rain stops at the roof, and little procedural
people and pets go about their day. Cars, dog walkers and children fill the
street outside.

It is a React Three Fiber + TypeScript app. These notes describe **how it
works, in our own words**, so we can rebuild the ideas in plain three.js
(r0.185, ES modules, no React). No code was copied. Where a formula is given,
it is the maths, not their code.

- **Source, for local reference only:** `library/homescape/` (never committed).
  Paths below are relative to that folder.
- **Units and axes:** metres, y up. A room is axis-aligned. An item's front faces +z.
- **Search:** `npm run kb -- dollhouse`, `npm run kb -- room lights` and so on.
  The technique records (`from: "homescape"`) point back to this file.

## Contents

1. [Rooms, walls and openings from a 2D plan](#1-rooms-walls-and-openings-from-a-2d-plan)
2. [The dollhouse cutaway: walls, roofs and floors](#2-the-dollhouse-cutaway-walls-roofs-and-floors)
3. [Stairs and several floors](#3-stairs-and-several-floors)
4. [Room lighting: many lamps for the price of none](#4-room-lighting-many-lamps-for-the-price-of-none)
5. [Day and night: the sun from its real position](#5-day-and-night-the-sun-from-its-real-position)
6. [Weather: rain, snow, hail, storm, fog, wind](#6-weather-rain-snow-hail-storm-fog-wind)
7. [Procedural humans: the body](#7-procedural-humans-the-body)
8. [Procedural humans: animation and daily life](#8-procedural-humans-animation-and-daily-life)
9. [Routing through rooms and doors](#9-routing-through-rooms-and-doors)
10. [Pets: a cat and a dog](#10-pets-a-cat-and-a-dog)
11. [Street life: cars, walkers, dogs and kids](#11-street-life-cars-walkers-dogs-and-kids)
12. [Camera: orbit rig, flight between homes, first-person walk](#12-camera-orbit-rig-flight-between-homes-first-person-walk)
13. [Hover, selection, screen labels and the placement ghost](#13-hover-selection-screen-labels-and-the-placement-ghost)
14. [The furniture catalog: 248 items from primitives](#14-the-furniture-catalog-248-items-from-primitives)
15. [Performance: zero frames when nothing moves](#15-performance-zero-frames-when-nothing-moves)
16. [Sound: a synthesized home](#16-sound-a-synthesized-home)
17. [Which of our games could use what](#17-which-of-our-games-could-use-what)

---

## 1. Rooms, walls and openings from a 2D plan

**Source:** `src/model/geometry.ts` (`wallRuns`, `apertureOf`, `runOpenings`,
`wallSnap`), `src/model/walls.ts`, `src/scene/RoomMesh.tsx` (`pieces`, `Wall`).

### How it works

- **A room is one or more rectangles ("parts").** An L, T or U room is a main
  rectangle plus extra parts. Walls follow the outline of the *union*, so there
  is no wall where two parts of the same room meet.
- **Wall runs come from cutting edges, not from a wall list.** For each edge of
  each part:
  1. Split the edge at every x (or z) coordinate where any rectangle of any
     room starts or ends.
  2. For each small segment, test a point 5 cm *outside* its midpoint.
     - The same room is there: no wall (this is where parts join).
     - Another room is there: an **interior** wall.
     - Nothing is there: an **exterior** wall.
  3. Merge neighbouring segments of the same kind on the same line.
  Each run knows its side (back/front/left/right), its line, its span
  `[a0, a1]`, and the neighbour room it faces.
- **Walls are centred on the room boundary.** An exterior wall is drawn at full
  thickness, half inside and half outside. A shared interior wall is drawn as
  two halves, one by each room, which add up to one wall. So the inner face is
  always `WALL_IN` (half the thickness) inside the boundary, and every room's
  inner faces line up. Wall ends are extended by `WALL_IN`, which closes outer
  corners and the inner corner of an L.
- **Open plan and half walls are per-wall flags.** A room lists the walls it
  leaves out (by neighbour id, or by side for an edge facing open space). The
  shared wall is open if *either* room lists the other, so it stays open when
  one room is moved. Half walls (a low divider, 1.05 m) work the same way.
  Open beats half.
- **Doors and windows are items that cut holes.** An aperture item stands at
  the wall's inner face, facing into the room. The wall line is
  `APERTURE_INSET` (0.21 m) behind it. Each aperture gives an opening
  `{a0, a1, y0, y1}` along that wall:

  | Kind | Half width | Bottom | Top |
  | --- | --- | --- | --- |
  | Door | 0.5 | 0 | 2.23 |
  | Window | 0.58 (or its own width) | 0.9 (+ its raise) | 2.1 |
  | Garage door | 1.2 | 0 | 2.25 |

  A door in the neighbour room cuts the shared wall too.
- **A wall with holes is a set of boxes.** Walk the openings along the run,
  sorted by start. Emit a full-height piece up to each opening, then a piece
  *below* it (if `y0 > 0`, a window sill) and a piece *above* it (if
  `y1 < WALL_H`, a lintel), and carry on after it. Every piece is the same unit
  box geometry, scaled and placed. No CSG and no custom geometry.

### Key numbers

`WALL_T` 0.10 m, `WALL_H` 2.6 m, half wall 1.05 m, low interior wall 0.38 m,
cut exterior wall 0.16 m, floor-to-floor 2.8 m. Rooms snap to each other
("magnet") and may not overlap. The smallest room is 1 m and the smallest
extra part 0.5 m.

### Pitfalls they solved

- **Double-thick shared walls.** Drawing the full wall from each room made
  shared walls twice as thick. Half per room fixes it.
- **Gaps at corners.** Fixed by extending ends by half the thickness. The
  overlap with a straight neighbouring run uses the same material, so it never
  shows.
- **Rebuilding walls while dragging.** Walls are keyed by a text signature of
  their runs and openings, so dragging a chair never rebuilds a wall.
- **Items left floating when a wall goes.** Removing a wall also removes the
  doors, windows and wall-hung items on it. Making it a half wall keeps only
  the wall items whose top is below 1.05 m, such as a socket.
- **A gap between storeys.** The lower wall ends at 2.6 m and the next floor
  starts at 2.8 m, so they draw a band under the exterior walls of upper
  floors.

### How to do it in our plain three.js

- **Plan data:** keep the plan as plain JSON:
  `rooms: [{ id, type, rects: [{x,z,w,d}], open: [], half: [] }]` and
  `items: [{ kind, x, z, rot, len }]`.
- **Wall runs:** write a pure `wallRuns(room, rooms)` that does the split /
  probe / merge above. It is about 60 lines and easy to unit test.
- **Wall pieces:** a pure `wallPieces(run, openings)` returns boxes.
- **Meshes:** one shared `BoxGeometry(1,1,1)` and one wall material. Each piece
  is a `Mesh` scaled to `[len, h, thick]`. With many rooms, put all pieces in
  one `InstancedMesh`; the cutaway in §2 then only writes instance matrices.
- **Floors:** one plane per part, raised 1 mm per overlapping part so they
  don't z-fight. A stairwell hole is cut out by splitting the rectangle into
  strips (`subtractRects`).

---

## 2. The dollhouse cutaway: walls, roofs and floors

**Source:** `src/scene/RoomMesh.tsx` (`Wall` frame loop), `src/scene/Roofs.tsx`,
`src/scene/roof.ts`, `src/scene/Scene.tsx` (`Levels`).

### How it works

- **Each wall picks a target height every frame:**
  1. Walk mode, or the roof is down: full height, 2.6 m.
  2. Plan view: 0.38 m.
  3. Interior wall: full height or 0.38 m (a user setting; full is the default).
  4. Exterior wall: take the vector from the room's centre to the camera, in
     xz, normalised. If its dot product with the wall's outward normal is
     more than **0.2**, the wall faces the camera and drops to **0.16 m**.
     Otherwise it stays full height.
  5. A half wall never rises above 1.05 m.
- **The height eases** with `h += (target − h) · min(1, dt·8)` and snaps when
  within 1 mm. Every wall piece is clamped to the current height. A piece
  whose clipped height is under 5 mm is hidden, so a lintel disappears before
  the sill. While a wall moves, it asks for frames and one shadow-map update.
  Once settled it costs nothing.
- **Result:** walls nearest the camera sink to a 16 cm "sketch" line, and the
  far walls stand tall behind the furniture. As you orbit, walls rise and sink
  smoothly. This one trick sells the whole dollhouse look.
- **Hip roof from a distance transform** (`roof.ts`):
  1. Lay a grid over the floor's indoor area. The grid step is the largest of
     25, 12.5, 10 or 5 cm that divides every room coordinate, so ridges, hips
     and valleys pass exactly through grid points with no saw teeth; 15 cm if
     none fits.
  2. Compute the chessboard (L∞) distance from each grid corner to the eaves
     with a two-pass chamfer.
  3. Height = pitch (0.62) × distance, capped at 3.2 m above the wall top.
  This gives correct hips at outer corners and valleys at inner corners of any
  L, T or U plan, with flat-shaded faces. The eaves overhang 0.4 m with a
  soffit and a fascia board. An edge leaning against a taller floor is not an
  eave, and the roof rises toward it. A fireplace adds a 0.6 m chimney box.
  The flat-roof option is a slab 20 cm above the walls with a 50 cm parapet.
- **The roof lifts like a dollhouse lid.**
  1. One "nearness" covers the whole home: the camera is near when its
     distance is less than `max(12, home diagonal)`.
  2. Hysteresis: once near, you must go past 1.15× that distance before the
     roof comes back, so it doesn't flicker.
  3. The roof's alpha moves at 2.5 per second. It rises by `(1 − ease(a)) ×
     2.5 m` while it fades.
  4. Editing, selecting or focusing a room also lifts it.
  5. While the roof is down, walls are not cut, so the house looks closed.
- **Snow on the roof** blends the roof colour toward white with the weather's
  snow-cover value.

### Pitfalls they solved

- **Roof sinking into the wall.** The 12 cm roof slab sank into the wall's
  outer half, and a grey strip of wall top showed above the eaves. Fix: raise
  the roof underside by `thick + pitch × WALL_T/2 + 1 cm`.
- **Clicks reaching through walls.** A wall with no pointer handler doesn't
  stop the ray, so clicks hit the item behind it. Every visible wall gets a
  handler that stops propagation.
- **Flicker at the roof threshold.** Fixed by the 15% hysteresis.

### How to do it in our plain three.js

- **Cutaway:** store each wall run's outward normal and room centre. In
  `update(dt, camera)`, compute the target height per run, ease it, then write
  `scale.y` and `position.y` of each piece (or its instance matrix). The test
  is two multiplies and a compare per wall.
- **Roof:** build it once per plan change as one `BufferGeometry`: grid
  corners, chamfer distance, then two triangles per cell, made non-indexed for
  flat shading. Fade it with `material.opacity` and lift it with
  `group.position.y`.
- **Cheaper still for indoor levels:** skip the roof and use only the wall
  cutaway. That fits a top-down classroom or shop view.

---

## 3. Stairs and several floors

**Source:** `src/model/stairs.ts`, `src/model/stairwell.ts`, `src/scene/fps.ts`
(`stairHeight`), `src/scene/FpsControls.tsx`, `src/scene/Scene.tsx` (`Levels`).

### How it works

- **Stairs are a height function, not geometry to collide with.**
  - **Straight stairs:** 1 × 3.2 m. Foot height is
    `clamp((l/2 − lz)/l, 0, 1) × 2.8`, a ramp from the +z end up to the floor
    above at the −z end. That is 14 steps of 0.2 m.
  - **U stairs:** 2.1 × 2.6 m. The first flight climbs to half height, a 1 m
    landing sits at the far end, and the second flight on the other side
    climbs back. Which side is second comes from the variant.
  - Side walls and the spine between U flights are wall segments for
    collision. Items can be placed against them.
- **A stairwell is a hole in the floor above.**
  - The stairs' footprint, 5 cm wider each side, is cut out of the upper
    floor's slab.
  - Every edge gets a 1 m railing except the arrival edge, and except an edge
    within 12 cm of the room boundary, where a wall already is. U stairs
    arrive on one half only.
  - On the lower floor, the ceiling (walk mode) is open over the stairs.
  - People and pets get the hole marked as blocked in their walking grid.
- **Changing floor while walking** (`FpsControls`):
  - Each frame, take the highest stair height under you on this floor. If
    there is none, check the floor below's stairs and subtract 2.8.
  - Past **2.8 − 0.35** you switch to the floor above and subtract 2.8 from
    your height. Below **−0.35** you switch down. The switch happens past the
    halfway point of the last step, so it is invisible.
  - Eye height eases toward the foot height with `min(1, dt·12)`.
- **All floors share the same components.** Floors are stacked groups at
  `(elevation − active) × 2.8`. Inactive floors get a `still` flag: no clicks,
  no ambient animation. Changing floor only moves groups and flips flags.
  Rebuilding hundreds of items on every switch used to freeze walk mode.
  - **View mode:** draws the active floor and, if asked, the floors below it.
  - **Walk mode:** draws every floor, so you see the upper floor through the
    stairwell and the whole house from outside.
  - On an upper floor the ground plane drops to ground level.

### How to do it in our plain three.js

- **Data:** each stair is `{x, z, rot, len, kind}`, with
  `heightAt(stair, x, z)` doing the local transform plus the ramp. The
  visible steps are any mesh. The player only reads the height function.
- **Floors:** each floor is a `THREE.Group`; keep them all built. On a floor
  change, set `group.position.y` and toggle `raycast` / animation on that
  floor. Never rebuild.
- **Several floors in our games:** a classroom building with a second storey,
  a Lanternwood tower or tavern, a shop with a mezzanine.

---

## 4. Room lighting: many lamps for the price of none

**Source:** `src/scene/roomLights.ts` (the main idea), `src/scene/AlarmFlash.tsx`,
and the night glows in `src/scene/kit/effects.tsx`.

This is the most valuable trick in the project.

### The problem

- Point lights don't know about walls, so an unshadowed lamp lights the room
  next door.
- Shadowed point lights are six shadow renders each.
- Changing the light count recompiles every shader.

### The solution

1. **Patch every `MeshStandardMaterial` once**, through `onBeforeCompile` on
   the prototype:
   - pass the world position as a varying;
   - add a fragment-shader loop over a fixed uniform array of up to
     **24 "room lights"**;
   - add the result to `reflectedLight.directDiffuse × BRDF_Lambert(diffuseColor)`
     right after `lights_fragment_end`.

   The arrays are shared uniform objects, so changing lamps only rewrites
   arrays: no recompiles, no extra draws, no shadow passes.
2. **Room mask, not shadows.** Each light carries up to **4 rectangles**, the
   parts of its own room. A fragment outside them gets nothing from that lamp.
   - Walls sit inside the room (their inner face is `WALL_IN` inside the
     boundary), so the outer face lies exactly on the boundary and stays dark.
   - Light never leaks through walls, at zero cost.
   - A y range keeps each light between its floor and ceiling, so it doesn't
     light the roof or the floor above.
3. **Corners of L-shaped rooms.** Intersect the segment from source to
   fragment with the room's rectangles and find how far it stays inside
   without a break. The length "behind the corner" darkens it smoothly down
   to a 20% bounce (`smoothstep(0, 0.6 m)`). So the far arm of an L is
   dimmer, as it should be.
4. **Light through an open door** ("portal" lights):
   - The same source is added a second time, masked to the neighbour room.
   - It counts only where the ray from source to fragment crosses the door
     plane *inside the opening*, with 6 cm soft edges and a top at 2.1–2.2 m.
   - A door-shaped patch of light falls into the hallway.
   - Several lamps spilling through the same door merge into one entry:
     power-weighted position, summed colour, longest range.
   - Closed or locked doors pass nothing.
5. **Falloff tuned to look good**, not physical. With
   `win = (clamp(1 − (d/range)^4))²` as a smooth range window:
   - **Point:** `win × (0.11 + facing × (0.62/(1+0.12d²) + 1.1/(1+3d²)))`,
     where `facing = 0.25 + 0.75·max(0, N·L)`. That is a bright pool about
     1 m round the bulb, a soft fill across the room, and a little ambient
     bounce.
   - **Recessed spot:** a downward cone between two cosines. The inner edge
     is 55% of the half-angle, and the default beam is 90°.
   - **Ceiling strip:** room-sized and top-down. Upper walls are brighter
     (`0.15 + 0.85·(y/2.5)²`) and the floor is even.
   - **Line (LED strip):** the source is the point on the strip nearest the
     fragment, so a long strip lights evenly along its length.
   - **Daylight through a window** (walk mode): the source is the nearest
     point of the window rectangle. It spreads along the window's inward
     normal, bright near the glass and fading deeper in. Blinds scale it. If
     the sun hits that wall, a warm bounce is added.
6. **Choosing which 24.** Lamps in their own room go in first, strongest
   first. Door spill only fills the slots that are left.
   - They found this the hard way: one list sorted by power let three hallway
     spots spilling through doors push a desk lamp off the list. The bulb
     looked lit, but no light fell on the desk.
   - When the alarm goes off, a red room-sized light in every room comes first
     and pulses with `0.2 + 0.8·|sin 3.2t|^1.4`.
7. **Day factor.** Lamps are scaled ×0.3 by day (×0.65 in walk mode, where
   indoors is dimmer) and ×1 at night. At night they are the main light.

### Per-lamp numbers

| Lamp | Height | Range | Power |
| --- | --- | --- | --- |
| Pendant | 1.85 m | the room's diagonal + 1 m (at least 5) | 3.6 |
| Floor lamp | 1.5 m | 8 m | 4.6 |
| Desk lamp | – | 2.6 m | 1.3 |
| Table lamp | – | 3 m | 1.6 |
| Wall light | 1.98 m | 8 m | 5 |
| Street lamp | 3.84 m, 1.02 m out on its arm | 11 m | 9 |
| Garden light | – | 6 m | 2.6 |
| Night light | – | 1.8 m | 0.7 |

### Night windows and glows

- **Windows:** the glass is opaque pale blue with a faint emissive
  (`#9fc8ff` at 0.25) in the bird's-eye view, so windows read as windows from
  above. In walk mode it turns almost clear (opacity 0.12), so the garden and
  sky show from inside, and lit rooms show from outside. A window on a
  cut-down wall is hidden, and a thin glass line on the low wall stands in
  for it, like a plan symbol (`src/scene/kit/devices.tsx`, the window
  builder).
- **For a "lit windows at night" street view** (not something Homescape
  does): give each window pane a material whose emissive follows its room's
  summed room-light power. The data is already there.
- Small additive sprites mark lamps, LEDs and fires, with opacity about 0.8 at
  night and 0.4 by day. They use `depthWrite` off, additive blending and
  `toneMapped` false.
- Their glow textures are computed per pixel as `DataTexture`s, for example
  `(1−r)^2.2·(0.55 + 0.45·e^(−18r²))`, never canvas gradients. Chrome dithers
  canvas gradients and they speckle when magnified.
- Big halo sprites bleed through walls, and a row of halos on a strip looks
  like dots, so they removed halos in front of lamps. The room light does
  that job.

### How to do it in our plain three.js

- **The patch:** write `src/…/roomLights.js` with:
  - a shared `uniforms` object (`count`, `pos[24]`, `col[24]`, `rect[96]`,
    `portal[24]`, `axis[24]`, `yRange[24]`);
  - `patchMaterial(mat)`, which chains any existing `onBeforeCompile`, merges
    the uniforms and injects the loop after `#include <lights_fragment_end>`;
  - `setRoomLights(list)`, which writes into the arrays.
- **Prefer patching per material**, not the prototype. Go through our
  `patchOnBeforeCompile` in `src/utils/shaderPatch.js`, which chains patches
  so the room-light patch doesn't clobber CSM or procedural-colour patches.
  Set `customProgramCacheKey` so patched and plain programs don't collide.
- **Choosing lights:** keep the selection on the CPU. Sort by "own room
  first, then power", cap at 24, and recompute only when a lamp or door
  changes, not every frame.
- **Where it fits with what we have:**
  - `src/effects/LightPool.js` (`tech.light-pool`) keeps a few real point
    lights for flashes;
  - `src/world/PropLights.js` gives torches a glow and a few nearest a real
    light.
  - Room lights would let *every* lamp light its room, masked by walls, with
    no real lights at all. Keep the pool for short bright events.

---

## 5. Day and night: the sun from its real position

**Source:** `src/scene/sun.ts`, `src/scene/useNight.ts`,
`src/scene/Scene.tsx` (`Lights`, `useRealSun`, `FogRange`).

### How it works

- **Sun position from the clock** (when no live sun is given):
  - latitude 40°, solar noon 12:30;
  - declination `23.44°·sin(2π/365·(day − 81))`;
  - hour angle `(hours − 12.5)·15°`;
  - elevation `asin(sin φ sin δ + cos φ cos δ cos h)`;
  - azimuth from `atan2(sin h, cos h sin φ − tan δ cos φ) + 180°`.
- **Into the scene:** the plan has an "up" compass bearing. The scene
  direction is `(sin b · cos el, sin el, −cos b · cos el)` with
  `b = azimuth − up`.
- **Three smooth curves from elevation** (smoothstep):

  | Value | From | To | Meaning |
  | --- | --- | --- | --- |
  | Daylight (sky level) | −6° | 14° | starts at civil twilight |
  | Direct sun strength | 0° | 7° | fades at the horizon through haze and trees |
  | Warmth | 2° | 32° | 0 is orange `#ffb26e`, 1 is white `#fff4e6` |

- **One light rig, blended.** One hemisphere light and one directional sun.
  - Day: sky `#fff`, ground `#c6cbea`, intensity 1.25; sun 2.2 at (9, 16, 11).
  - Night: sky `#6f7fe0`, ground `#141936`, 0.55; a blue moon `#a9b8ff` at
    0.6 from (−8, 18, 10).
  - Day, night, walk mode and "indoors" are each a 0–1 value eased with
    `min(1, dt·6)`. Colours, intensities, sun position, background and fog
    colour are all lerps of these.
  - They first had two rigs, and switching left the scene grey: the old rig
    was not removed cleanly. One rig avoids that.
- **Eye adaptation.** In walk mode the hemisphere light is 1.0 outdoors and
  0.6 indoors, × `(0.3 + 0.7 × daylight)`. Going inside eases toward the
  dimmer value.
- **Sun through windows in walk mode.**
  - Ceilings cast shadows, so sunlight only enters through windows and doors.
  - The sun is placed `max(45, radius + 10)` m from the home's centre, aimed
    at it. The shadow camera is fitted to the floor's radius.
  - If the light sat inside the plan, walls on its side were in front of the
    shadow camera and cast nothing, so light leaked into closed rooms.
- **Ceiling light leaks.**
  - The ceiling's shadow comes from an invisible 30 cm thick block that only
    casts shadows (no colour, no depth), not from the thin ceiling plane. A
    thin caster at the same depth as the wall top leaked a jagged line
    through the shadow bias.
  - Walls cast shadows with both faces, which closes the leak at corners.
- **Night switch:** the user's day/night/auto choice. Auto follows the sun
  being below the horizon.

### How to do it in our plain three.js

- **`sun.js`:** pure `approxSun(date, lat)`, `sunDirection(pos, up)` and the
  three smoothstep curves. Unit-testable, no three.js needed.
- **One `DayNight` object:** it owns the hemisphere light, the directional
  light, `scene.background` and `scene.fog.color`. Lerp them from eased
  scalars, and skip the update when a rounded signature of those scalars
  hasn't changed.
- **Shadows:** `light.shadow.camera` gets left/right/top/bottom = radius, and
  `far = dist + radius + 10`.

---

## 6. Weather: rain, snow, hail, storm, fog, wind

**Source:** `src/scene/Weather.tsx`, `src/scene/weatherState.ts`,
`src/scene/Scene.tsx` (`FogRange`, `Lights`), `src/audio/voices.ts` (rain and wind sounds).

### How it works

- **A sky maps to effect amounts.** Twelve skies each give rain, snow, hail,
  cloud, fog and wind (0–1) and a lightning flag. For example:

  | Sky | Rain | Snow | Hail | Cloud | Fog | Wind | Lightning |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Rain | 0.5 | | | 0.85 | 0.15 | 0.2 | |
  | Pour | 1 | | | 1 | 0.3 | 0.35 | |
  | Storm | 0.85 | | | 1 | 0.25 | 0.65 | yes |
  | Snow | | 0.75 | | 0.8 | 0.2 | 0.15 | |
  | Sleet | 0.35 | 0.45 | | 0.85 | 0.2 | 0.25 | |
  | Hail | 0.3 | | 0.8 | 0.9 | | 0.4 | |
  | Fog | | | | 0.55 | 1 | 0.05 | |

  - Wind is `max(base, windKmh/45)`.
  - Drift is `wind·5` m/s along the wind bearing. Snow takes 0.35× that.
- **One draw per kind, all motion on the GPU.**
  - An `InstancedBufferGeometry` of a single quad with a per-instance
    `vec4 seed` from a seeded LCG, so the same drops appear every load. Rain
    and hail quads hang from their top.
  - A `ShaderMaterial`: transparent, `depthWrite` false, `frustumCulled`
    false, render order 12, not raycastable.
  - **The CPU moves nothing per frame.** Only time, wind and density uniforms
    change.

  | Kind | Per m² | Cap | Fall speed | Length | Width |
  | --- | --- | --- | --- | --- | --- |
  | Rain | 4 | 16,000 | 9 m/s | 0.5 m | 0.012 m |
  | Snow | 2.2 | 10,000 | 1.1 m/s | – | 0.05 m |
  | Hail | 0.8 | 4,000 | 13 m/s | 0.07 m | 0.022 m |

- **Density without rebuilds.** An instance is culled in the vertex shader
  when `seed.w > density`.
- **The volume wraps.**
  - The box is the plot plus 8 m, 14 m tall. In walk mode the same-size
    window centres on the camera.
  - x and z are `R + mod(seed·W + drift + sway − R, W)`. Drops stay fixed in
    the world and only wrap at the edges as the window moves.
  - Fall is `y = top − mod(t·speed_i + seed·h, h)`, with each drop's speed
    jittered ±15%.
  - Wind drift is `wind × age`, where `age = (top − y)/speed`.
  - Snow also sways: `0.25·sin(1.7t + 40·seed)`.
- **Billboarding in view space.**
  - Rain streaks align with the *projected* fall direction.
  - Width is `max(w, dist·0.0011)` and length `max(len, dist·0.01)`, so far
    streaks stay about 1.5–2 px wide instead of vanishing.
  - Flakes are screen-aligned quads.
  - Some drivers leave `cameraPosition` empty, so they don't rely on it.
- **No rain indoors: a height texture.**
  - A float `RGFormat` `DataTexture` over the plot on a 0.5 m grid. R is the
    wall top + 5 cm and G is the roof surface. The roof height comes from the
    same chamfer distance as the roof mesh.
  - The vertex shader samples it and fades drops below it. A drop is also
    faded within 0.3 m of the floor, within 1.5 m of the top, and closer than
    2–6 m to the eye.
  - When the roof is lifted, drops over the house fade out.
  - The texture is rebuilt only when the rooms change, never while dragging.
- **Smoothed shared state.**
  - Cloud and fog ease at `min(1, dt·0.6)`.
  - Snow cover builds over 90 s and melts over 120 s. Wetness builds over
    20 s and dries over 60 s.
  - Readers: sun ×(1 − 0.7·cloud), hemisphere ×(1 − 0.15·cloud).
    Background and fog move toward an overcast grey by
    `min(1, 0.6·cloud + 0.4·fog)`. The ground darkens when wet and whitens
    under snow, and roofs whiten.
- **Fog.**
  - `THREE.Fog`, base range 45–130 m. In the orbit view it scales with
    `max(1, camDist/32)`, with far capped at 0.92 × the camera far plane.
  - Weather multiplies far by `1 − 0.7·fog` and near by `1 − 0.9·fog`.
  - **They never set `scene.fog = null`:** that recompiles every material.
    For the plan view they push the range past the far plane instead.
- **Lightning.**
  - The first strike comes 3–9 s after a storm starts. Then one every 6–20 s
    in a storm, or 10–28 s in "thunder".
  - Flash envelope, with `a` = seconds since the strike: three flickers,
    `max(1 − |a−0.03|/0.06, 0.7 − |a−0.18|/0.07, 0.85 − |a−0.4|/0.09)`.
  - It drives a pale ambient light `#e3e9ff` at 1.6 by day and 2.2 at night,
    plus the sky lerping toward white by `flash·0.55`.
  - Thunder plays 0.7–2.2 s later, from 25 m beyond a corner and 20 m up.

### How to do it in our plain three.js

- **Rain and snow:** Gangnam Jarani's `games/g_cv2yrhrpv2/weather.js` already has
  camera-following, shader-moved rain and snow. What to add from here:
  1. the **height-texture roof mask** (no rain under arcades, overpasses,
     bus shelters or inside a building);
  2. the **distance-scaled streak width**, so rain reads from far away;
  3. **density by uniform**, not by rebuild;
  4. the **three-flicker lightning envelope** plus delayed thunder;
  5. eased **wetness and snow cover** that other shaders read.
- **Fog:** keep `scene.fog` alive for the life of the scene. Change
  `near`/`far`, never remove it.

---

## 7. Procedural humans: the body

**Source:** `src/scene/humanModel.ts` (`build`, `bake`, `LOOKS`, `surf`),
`src/scene/Human.tsx` (joint tree).

### How it works

- **Primitives baked per bone.**
  - Each body segment is a list of primitives: sphere, low sphere, capsule,
    cylinder, arc torus, cone, rounded box, and a sphere cap for hair. Each
    has a colour, position, rotation and scale.
  - `bake()` clones each one, applies its transform, writes a flat
    vertex-colour attribute, and merges them with `mergeGeometries`.
  - The result is **one geometry per bone and one shared vertex-coloured
    material** (`MeshStandardMaterial`, roughness 0.74) for every person and
    every hand prop. About 20 draws per person.
  - Geometry is cached per "look".
- **The merge gotcha.** The rounded box is non-indexed and the others are
  indexed, so everything goes through `toNonIndexed()` and `uv` is deleted.
  Otherwise the attribute sets don't match and the merge fails.
- **Proportions** (about 5.5 heads tall):
  - hip joint 0.82 m, thigh 0.37, shin 0.37, sole 0.075;
  - shoulder about 1.19, head joint 1.33, top about 1.66 m;
  - the head group is scaled 1.1, which makes the figures cute.
- **Joint tree:** root (feet) → body (rotated for lying) → hips → each thigh
  (±0.095·build) → knee → foot. spine → chest → each arm (±0.2·build, +0.13)
  → elbow (−0.27) → hand (−0.235). neck → head → ponytail and eyelids.
  - Left and right limbs share geometry. Only the left hand is mirrored
    (scale x −1), because a fist with a thumb is asymmetric.
- **Faces on the surface.**
  - The head is two ellipsoids: a skull of radius (0.128, 0.14, 0.13) and a
    jaw of (0.112, 0.085, 0.11).
  - `surf(x, y)` solves for the front z of whichever ellipsoid sticks out
    more at that point. Eyes (white, iris, pupil, highlight, lash), nose,
    brows, blush and mouth sit exactly on the skin.
- **Hair.**
  - Spiky: 18 cones placed in spherical coordinates on the skull, biased up
    and back.
  - Tousled: tufts rotated with a "from +y toward this direction" quaternion.
  - Bun: spheres plus a torus band.
  - Ponytail: a separate part on its own joint so it can swing.
- **Variety comes from a few fixed looks, not a generator.**
  - Each look has skin, hair colour and style, top style (tee / sweater /
    hoodie, optional open overshirt), trousers (jeans get cuffs), shoes and a
    `build` of 0.92–1.06.
  - `build` scales *widths only*: pelvis, chest, and the hip and shoulder
    offsets. Height is shared.
  - Shades come from `tint(hex, k)`: ribbing ×0.86, darker trousers ×0.82,
    seams ×1.18.
- **Extras:**
  - a contact-shadow disc (r 0.3, opacity 0.2, `depthWrite` off), so people
    don't need the shadow map when still;
  - a blanket box for sleeping;
  - a "z" made from a `ShapeGeometry`, no font.
  - Every part has `raycast` turned off, so clicks go to the furniture.

### How to do it in our plain three.js

- **Builder:** write `buildFigure(look)`, which returns `{ root, joints }`.
  Each joint is a `THREE.Group`, and each carries one merged vertex-coloured
  mesh. Use `BufferGeometryUtils.mergeGeometries` and `RoundedBoxGeometry`
  from `three/addons`, with the `toNonIndexed` + delete-`uv` rule.
- **Combine with what we have:** `vendor/diorama` has procedural people too.
  Gangnam Jarani's `games/g_cv2yrhrpv2/life.js` already draws crowds with one
  `InstancedMesh` per body part. For **crowds** keep that. For **a few close
  characters** (a teacher, classmates, shopkeepers) use this richer per-bone
  merge.

---

## 8. Procedural humans: animation and daily life

**Source:** `src/scene/humanAnim.ts` (`animateHuman`, `stand`, `walk`, `sit`,
`lie`, `work`), `src/scene/People.tsx` (`step`), `src/model/people.ts`
(`planPeople`, `roamSpot`, `activityFor`, `tvSeats`).

### How it works

- **Pose = about 45 named angles in a flat record.** Each builder returns a
  full pose. The blend is:
  1. start from `stand`;
  2. lerp to `sit` by `smooth(sit)`, then to `lie`, then to `walk`, with
     `smooth(x) = x²(3−2x)`;
  3. apply the activity layer only when walk < 0.5;
  4. add gaze offsets scaled by (1 − walk).
  Then one `apply()` writes the joint rotations. The head uses Euler order
  `YXZ`.
- **Standing idle:**
  - weight shift `sin(0.33t + seed)` drives a small hip sway and roll and
    bends the unloaded knee;
  - breathing `0.018·sin(1.7t)`;
  - arms sway `0.03·sin(0.9t)`;
  - foot = −(thigh + knee) keeps the sole flat.
- **Walk cycle** (phase `a`, amplitude = pace):
  - thighs `∓0.52·sin a`;
  - knee `0.08 + 1.05·max(0, cos(a + 0.6))^1.4`;
  - foot pitch blends from flat to toe-up at heel strike to toe-down at
    push-off;
  - hip height bobs twice per cycle (`−0.03 + 0.032·|cos a|`), with hip yaw
    0.12 and roll 0.045;
  - the torso counter-rotates (−0.1), and the head counter-yaws (0.06) to
    stay steady;
  - arms `±0.48`, opposite to the legs; the forward elbow bends more;
  - stride is 1.3 m per full cycle, and a footstep sounds every half cycle;
  - pace is `clamp(speed/1.25, 0.45, 1.15)`, so slow walks still swing.
- **Sitting at any seat height** (two-link solve):
  - hip at seat + 0.075, knee at seat + 0.05;
  - if the knee is higher than shin + sole (0.445), tilt the thigh by
    `asin(min((knee − 0.445)/thigh, 0.6))`; otherwise reach with
    `acos(knee/0.445)`;
  - the foot cancels both, so soles stay on the floor;
  - a seat's lean (sofa 0.12) tilts the back, and the arms add the same
    amount so the hands stay on the thighs.
  - Seat heights must match the furniture models (armchair 0.44, chair 0.495,
    sofa 0.48). Wrong values made people sink into the sofa.
- **Lying:** rotate the body group −90° about x on the bed, with arms out and
  slow breathing at 1.1 Hz. The blanket scales with the breath, and the "zzz"
  shows when fully asleep.
- **Activities with no runtime IK.**
  - Arm targets `[x, y, z, elbow]` were solved offline and stored per
    activity: type, read, phone, TV with a mug, cook, stir, wash, brush, eat,
    fold, browse, gaze.
  - Periodic gestures use a **gated sine**,
    `smooth(max(0, sin(f·t + seed) − thr)/(1 − thr))`. A higher `thr` makes
    it rarer and shorter. Examples: a mug sip at f 0.32 and thr 0.75, a page
    turn at 0.7 / 0.92, a bite at 1.3 / 0.55.
  - Fast motions are plain sines: typing at 13 rad/s, chopping at 8, brushing
    at 9.
  - **Pressing a switch at any height:** a 5-row table maps hand height
    (0.5–1.5 m) to lean, crouch and arm, lerped between rows. Below about
    0.6 m the person crouches.
- **Transitions.**
  - Sit and lie ramp over 0.9 s, walk blends at 5/s, and the activity rises
    at 1.6/s and falls at 3–4/s. The old activity fades to 0 before the new
    one starts.
  - **Arriving at a seat:** walk to a point 0.42 m in front of it (0.75 m
    beside a bed), turn in place with a shuffle step, and once facing within
    0.15 rad, slide into the seat while the sit blend rises. Standing up
    plays the same thing backwards.
  - **Glances:** a new look target every 2–6 s. Yaw range 1.1 rad when idle
    or watching TV, a quarter of that when busy. Blinks last 0.13 s, every
    2.5–6 s.
- **What to do: a scored plan.**
  - Places are filled in order: desks with a computer on, rooms with fresh
    motion or a lamp switched on in the last 20 min, devices just switched on
    (walk over and press), TV seats, weighted roaming, then beds at night.
  - **TV seats** are within 6.5 m of the TV and face it within 60°.
  - Roam weights depend on the hour:

    | Place | Weight |
    | --- | --- |
    | Sofa | 4 with the TV on, else 2.5 |
    | Dining seats | 4 at mealtimes, else 0.5 |
    | Kitchen | 3 at prep hours, else 0.5 |
    | Washbasin | 2.5 in the morning and late evening, else 0.4 |
    | Toilet | 0.35 |

    Rooms whose light is on count ×3.
  - The spot decides the activity: counter → cook, basin → brush, sofa with
    the TV on → TV and snack alternating every 75 s.
  - People re-pick every 200 s, offset 73 s per person, and no two take the
    same spot.

### How to do it in our plain three.js

- **Animation:** one pure function `animate(state, t) → pose` and one
  `apply(pose, joints)`. Everything above is a handful of sines and lerps,
  with no AnimationMixer and no clips. It suits procedural figures in the
  classroom, the tavern or the office.
- **Daily life:** the "place → weight by hour → activity" table is the whole
  AI. Re-plan on a slow clock (15 s) or on events. A light switched on, a bell
  ringing or a lesson starting all fit naturally.

---

## 9. Routing through rooms and doors

**Source:** `src/model/pets.ts` (`buildPetGrid`, `findPath`), `src/model/people.ts`
(`route`, `doorRoute`), `src/scene/doorTraffic.ts` (`passDoors`).

### How it works

- **One walk grid per floor, per body size.**
  - 12 cm cells: 0 blocked, 1 indoor, 2 outdoor.
  - Walls are blocked within 0.05 m + the body's clearance, except where a
    door opening cuts them. Windows don't count as openings.
  - Furniture footprints are inflated by 0.7 × clearance. Clearance is 0.18
    for a person, 0.10 for a cat and 0.15 for a dog.
  - Pets may walk *under* tables and chairs; people may not. Everyone walks
    over rugs and doormats.
  - Stairwell holes are blocked. The grid is cached per floor and body kind.
- **A\* then string-pulling.**
  - 8-neighbour A\* with costs 1 and √2, the octile heuristic, and no corner
    cutting. It uses typed arrays and a binary heap, capped at 4N steps.
  - A start or goal inside a blocked cell snaps to the nearest free cell *in
    the same room*. Snapping freely put people on the other side of a wall.
  - The path is then shortened greedily by line of sight, sampled every half
    cell.
- **Fallback: door graph.** A BFS over rooms joined by doors. Passage points
  sit 0.3 m in front of each door and 0.66 m behind it. All outdoor areas
  count as one node, "out"; without that, a house with a porch had no way out.
- **Moving along it.**
  - Speed 1.25 m/s, acceleration 3, turning 6 rad/s.
  - Target speed is `min(1.25 × (0.45 if the heading error is over 0.9 rad,
    else 1), max(0.35, remaining × 1.6))`: slow in bends, ease into arrival.
- **Doors open by themselves.**
  - Movers within 1.4 m of a door open it for 1.6 s. The check runs at 5 Hz,
    not every frame.
  - The hold is extended only when less than half of it is left, so state
    doesn't change every frame.
  - One timeout sweeps expired doors 20 ms after the earliest expiry.
  - Doors driven by a real sensor or lock never open for walkers.
- **Not solved there:** two people can overlap in a doorway. Only target
  spots are de-duplicated.

### How to do it in our plain three.js

- **Grid:** we have `tech.flowfield` for crowds chasing one target. For a few
  agents with *different* goals inside buildings, use this: a `Uint8Array`
  grid from the plan, A\* with line-of-sight smoothing, and the door graph as
  a fallback.
- **Auto doors:** a door dictionary keyed by position, `openUntil[key]`, and a
  5 Hz check. The door mesh eases its hinge angle toward open or closed.

---

## 10. Pets: a cat and a dog

**Source:** `src/scene/petModel.ts`, `src/scene/petAnim.ts`, `src/scene/PetBody.tsx`,
`src/scene/Pets.tsx`, `src/model/pets.ts` (`chooseGoal`, `tickNeeds`, `chooseReaction`).

### How it works

- **Same bake as people, fewer segments.** Spheres are 14×10 and low
  spheres 8×6, with one shared material (roughness 0.82). The rump and chest
  are ellipsoids.

  | Proportion | Cat | Dog |
  | --- | --- | --- |
  | Hip height | 0.2 | 0.4 |
  | Body length | 0.22 | 0.42 |
  | Head radius | 0.082 | 0.12 |

  - Breeds are scaled (terrier 0.55, labrador 0.84).
  - **Patterns:** tabby stripes are partial tori sized to the ellipsoid's
    cross-section at that z (`k = sqrt(1 − ((z−c)/r)²)`). Spots are flattened
    spheres turned to the ellipsoid normal (∝ v/r²). Dalmatian spots are
    placed by a seeded random generator.
- **Skeleton:** root → body → pelvis. The pelvis holds the rump, hind legs
  and a 4-segment tail; the chest, forelegs, neck and head hang off it. So
  pitching the pelvis tilts the whole animal.
- **Gaits as phase tables**, legs in order hind-R, hind-L, fore-R, fore-L:

  | Gait | Phases | Swing | Knee lift |
  | --- | --- | --- | --- |
  | Walk | 0, 0.5, 0.25, 0.75 | 0.42 | 0.75 |
  | Trot | 0, 0.5, 0.5, 0 | 0.58 | 0.95 |
  | Run | 0, 0.12, 0.55, 0.67 | 0.9 | 1.25 |

  - A continuous gait value 0–2 lerps between rows.
  - Running adds a body rock (`0.13·sin(φ + 0.6)`) and the neck counters 80%
    of it.
  - Speeds, × √scale: cat 0.55 / 1.15 / 2.5 m/s, dog 0.85 / 1.6 / 3.2 m/s.
    Strides are scaled too, so feet don't slide.
- **Postures:**
  - **Sit:** the pelvis pitch is solved so the forelegs stand vertical.
  - **Lie:** a loaf for the cat, a sphinx for the dog.
  - **Overlays:** curl, groom, stretch / play-bow, eat, crouch with a hip
    wiggle, roll, jump.
  - **Tail wag:** a dog wags at 3.5–5.5 Hz depending on mood, a cat at 0.7 Hz.
  - **Breathing:** the body scales by `1 + 0.025·sin(2.2t)`, slower asleep.
- **Needs drive a weighted choice.**
  - Energy, food, fun and love run from 0 to 1. Food drains at 0.0025/s and
    eating fills it at 0.12/s. Love grows near people.
  - Goal weights include: eat 7 when hungry (14, running, when the feeder just
    fired); sleep 6 when tired (12 at night); stretch after a nap; play scaled
    by boredom; a dog follows a person (2.5 × 1.6); a cat naps near a seated
    person, perches, sits on a sunny sill or grooms.
  - Wandering sends a pet to *another room* 80% of the time.
  - Two pets never pick places within 0.45 m of each other.
- **Hops:** to a raised spot (sofa back at 0.93 m, cat tree, sill), an eased
  lerp with a sine arc, 0.5 s (×1.3 when rising more than 0.6 m). The arc
  height is `max(0.08, 0.35 × rise)`.
- **Being petted.**
  - An invisible box per pet takes the click: cat 0.24 × 0.34 × 0.62, dog
    0.36 × 0.62 × 1.05. In walk mode a ray from the screen centre (3.2 m) on
    E or a click does the same.
  - **Cat:** meow 40%, purr with hearts 32%, roll 28%. A sleeping cat yawns.
    Petted 4+ times in 10 s, it hisses and trots off.
  - **Dog:** bark 35%, spin 25%, jump 20%, sit pretty 20%.
  - The pet turns to the camera while it reacts.
  - **Speech bubble:** a sprite with `sizeAttenuation` off and depth test off,
    scaled `2·tan(fov/2)·0.08` so it is a fixed size on screen, popping in
    over 0.2 s.
- **Cheap rendering:** pets stay out of the shadow map and use a contact disc.
  They animate at 24 fps, half that when all are asleep, and full rate only
  during a reaction.

### How to do it in our plain three.js

- **Companion pet:** a pet in Lanternwood's camp or the Arcademia school is
  this recipe: the baked body, the gait phase table, a needs object, a weighted
  `chooseGoal`, and click → reaction.
- **Gait table for any animal:** it works for any four-legged creature. Our
  beasts in `src/hd2d/beasts.js` could use the walk/trot/run phase table for
  wolves and boars.

---

## 11. Street life: cars, walkers, dogs and kids

**Source:** `src/scene/StreetLife.tsx`, `src/scene/streetPlan.ts` (`carTrack`,
`walkTrack`, `pickRoute`, `streetNet`), `src/scene/kit/roads.ts`.

### How it works

- **The road network from hand-placed rectangles.**
  - Road, crosswalk and sidewalk pieces are welded when within 0.35 m.
  - Each piece's direction comes from the edge that is at least 80% joined to
    a neighbour. Both axes joined makes it a junction.
  - Centre lines become polylines. A route is a branch weighted by length,
    extended across T and L joins within 0.25 m, never turning back
    (`dot < −0.3`).
- **Markings by width:**

  | Road width | Markings |
  | --- | --- |
  | Under 2.5 m | plain |
  | Under 4.5 m | edge lines |
  | Under 9 m | dashed centre, 1.5 m on and 1.5 m off |
  | 9 m and wider | a double solid line |

  The canvas is 64 px/m, up to 2048 px, and the texture is offset per piece
  so the dashes line up across joins.
- **Car track** (drive on the right):
  1. Drop collinear points.
  2. Round corners with a radius of 5 m (quadratic Bézier, 11 samples).
  3. Resample every 0.5 m.
  4. The lane offset is `min(w/4, 2)` on roads 4 m and wider. It is
     box-averaged, and pulled toward the middle up to 55% in bends so cars
     don't climb the kerb.
  5. **Obstacles:** a 4.6 × 1.9 m footprint is tested on a 5×3 point grid,
     and the lane shifts sideways around a parked object, blended over 8 m.
     Still blocked: drop the route.
- **Speed from curvature, braking ahead.**
  - `limit_i = clamp(sqrt(3.2 × radius_i), 2.2, 7.5)`.
  - The speed allowed now is the minimum over the next 14 m of
    `sqrt(limit_j² + 2·3·Δs)`, so cars brake just in time for bends.
  - Accelerate at 2.8 m/s² and brake at 7.
- **Car pose from two axle points** at s ± 1.35 m. The position is their
  midpoint and the heading is the angle between them. The rear wheels then
  track inside the bend, and the car doesn't spin on the spot.
- **Traffic rules in three lines:**
  1. **Following:** if a car is ahead within 14 m and 1.6 m sideways, then
     `target ≤ v_ahead + sqrt(2·5·(gap − 5.2))`.
  2. **Crosswalk:** if a walker is on a crosswalk within 25 m ahead, stop
     2.8 m before it, with `target ≤ sqrt(2·4·room)`.
  3. **Walkers yield:** a walker within 1.2 m of the kerb waits while a car
     moving at least 1.2 m/s is within 14 m of the crossing.
- **Spawning by time of day.** A timer every 500 ms. Gaps in seconds:

  | Who | Day | Night | Late (before 5 am) |
  | --- | --- | --- | --- |
  | Car | 7–18 | 18–45 | 45–120 |
  | Walker | 9–22 | 30–70 | 100–260 |
  | Dog walker | 45–110 (25–60 at walk times) | 70–160 | none |

  - Rain doubles the walker gaps.
  - No car spawns within 8 m of another car at the entry point.
  - Fixed slots: 2 cars, 3 walkers (one with a dog), 3 kids plus a parent.
    Humans stay mounted and are only shown or hidden.
- **Walkers:**
  - 1.2–1.5 m/s with a 1.3 m stride. Pavement detours are blended over 1.4 m.
  - **Dog on a lead:** the dog walks 0.55 m ahead on its own offset line. It
    stops to sniff trees and hydrants within 1.3 m (60%, for 2–4.5 s) and
    barks 20% of the time.
  - **The lead:** 12 points from hand to neck, with sag
    `max(0, 0.35 − span·0.18)·4t(1−t)`.
- **Kids at the playground:** by day and dry weather only. 1–3 kids, capped
  per toy (swing 1). They stay 150–300 s. Trampoline bounces have a 0.78 s
  period and are `0.42·sin(πφ)` high. A parent sits on a bench with a phone.
  Rain or night sends them home.
- **Night cars, no lights.**
  - Headlights are an additive canvas "fan" on a 3.4 × 7.2 m plane, 5.8 m
    ahead (opacity 0.55, `depthWrite` off, `toneMapped` off).
  - Tail lights are a red additive 1.8 × 0.9 m plane.
  - There are no real light sources at all.
- **Fading in and out:** agents scale in and out at their route ends (cars
  over 2.5 m), so nothing pops.

### How to do it in our plain three.js

- **Gangnam Jarani** (`games/g_cv2yrhrpv2/life.js`, `cars.js`) already has crowds and
  traffic. The cheap upgrades:
  1. the curvature speed limit with braking look-ahead;
  2. the two-axle pose;
  3. the three traffic rules (following, crosswalk yield, walker yield);
  4. spawn gaps by hour and weather;
  5. a dog on a sagging lead;
  6. headlight fans as additive planes instead of SpotLights.
- **Any town square** (Arcademia's campus, a Lanternwood village): the whole
  street kit works there too.

---

## 12. Camera: orbit rig, flight between homes, first-person walk

**Source:** `src/scene/camera.ts` (`fit`, `framePose`, `pose`), `src/scene/CameraRig.tsx`,
`src/scene/HomeFlight.tsx`, `src/scene/fps.ts` (`buildColliders`, `resolve`,
`spawnPoint`), `src/scene/FpsControls.tsx`.

### How it works

- **Orbit camera** (they use the camera-controls library):
  - FOV **32°**, so it feels nearly isometric. The default view direction is
    (0.55, 0.72, 0.68).
  - **Framing a set of rooms:**
    - horizontal span `(w·0.78 + d·0.63)·1.08`;
    - vertical span `(w·0.45 + d·0.62)·0.75 + 2.4`;
    - distance `max(span / (2·tan(fov/2)·freeWidth/h), 1.25·vspan / (2·tan(fov/2)·freeHeight), 7)`.
  - "Free" means the screen area not covered by UI panels. A focal offset
    shifts the scene left when a side panel opens, without moving the
    framing.
  - Item close-up: distance 9 along the same direction.
  - Left drag rotates; right and middle drag pan in the ground plane, not by
    lifting the target. One finger rotates; two fingers zoom and pan.
  - A click is a press that moves less than **4 px**, or **14 px** for touch
    and pen. Finger taps slip a few pixels.
  - Q and E rotate, arrow keys pan.
- **Flight between homes** (about 2.6 s, no overlay):
  1. **Take-off, 1.1 s:** rise toward a near top-down tilt (polar 0.35 rad),
     turn to the home's heading, and glide sideways faster and faster.
  2. **Switch:** once the old home's box is fully out of the frustum, swap
     the scene. The ground is the same colour everywhere, so the camera is
     teleported to the new home's coordinates with the new home just outside
     the frame. Nothing jumps on screen.
  3. **Landing, 1.5 s:** slow down, glide in, descend into the usual framing.
  - The path is "just long enough" for the old home to leave the frame,
    found by stepping in 0.5 m increments with a frustum test, plus a 4 m
    gap. User input is off during the flight. A long frame after the switch
    continues the motion instead of jumping.
- **First-person walk.**
  - Eye height 1.62 m, radius 0.24 m, walk 2.1 m/s and run 4 m/s. Mouse look
    sensitivity 0.0022 and touch 0.006. Pitch is clamped to ±1.45. Euler
    order `YXZ`.
  - **Colliders:** wall segments with door gaps (only openings starting at
    the floor, not windows), railings, stair side walls, and floor-item boxes.
    Rugs, plants and pets are walkable, and anything thinner than 0.18 m is
    ignored.
  - **`resolve()`:** push a circle out of segments (closest point, then out
    along the normal by r + half thickness) and out of boxes (closest point;
    if inside, out the nearest edge). It runs 3 passes, because a corner
    touches two walls.
  - **Head bob:** `sin(stride·5.2)·0.025`, with a footstep at each low point
    sounding the floor under you.
  - **Aiming:** a ray from the screen centre, about 10 per second, at most
    7 m, only against the active floor's group. The first *visible* hit is
    the target, checked up the parent chain.
  - **Start point:** 0.81 m inside the front door, looking in.
  - **Indoors / outdoors:** whether you stand in an indoor room drives the
    eye adaptation of §5.
  - Frames are requested only while moving, looking or on stairs.

### How to do it in our plain three.js

- **Orbit:** we use `OrbitControls`. Port the `fit()` maths and the
  click-vs-drag thresholds; they are independent of the library.
- **Flight:** a three-stage tween of target and position with a
  frustum-exit test (`Frustum.intersectsBox`). Good for moving between
  Arcademia floors or rooms, or between Lanternwood realms without a loading
  fade.
- **Walk:** `resolve()` (circle against segments and boxes, 3 passes) and
  the stair height function are pure maths and drop into any interior walk
  or third-person controller.

---

## 13. Hover, selection, screen labels and the placement ghost

**Source:** `src/scene/Selection.tsx`, `src/scene/LabelProjector.tsx`,
`src/scene/labels.ts`, `src/scene/Ghost.tsx`, `src/model/placement.ts`,
`src/scene/EditLayer.tsx`, `src/scene/hoverTargets.ts`.

### How it works

- **Selection outline as an inverted hull with a constant pixel width.**
  - For each solid mesh of the selected item, add a back-face shell. Its
    geometry has creased normals (`toCreasedNormals(g, π)`, which smooths
    them so the shell doesn't split at hard corners), cached per source
    geometry.
  - **Vertex shader:** in view space, push each vertex along its normal by
    `k × depth`.
  - **Each frame:** `k = 3.5 px × 2·tan(fov/2) / canvasHeight`, which gives a
    3.5 px line at any distance.
  - `polygonOffset` (6, 6) pushes the shell behind the body, so only the
    silhouette shows.
  - An invalid move draws the outline in alarm red.
  - The drei `Outlines` helper drew a giant blob inside a portal, which is
    why they wrote their own.
- **More selection cues:**
  - the item's 3D bounding box in thick lines with no depth test;
  - its rule footprint as a translucent fill at the bottom;
  - on hover, only a faint footprint.
  - Bounds use only "solid" meshes: halos, light cones and very transparent
    effects carry a `selectionAid` flag and are left out.
- **Height handle for wall items:** an up/down arrow beside the item, at
  least about 28 px on screen. Its grab area grows *away* from the item, so a
  small item never ends up under its own handle.
- **Screen labels without per-label React roots.**
  - All labels are plain DOM elements in one layer.
  - Each frame, project each anchor with `vector.project(camera)`. Hide it
    when `z > 1` or more than 1.15 off-screen.
  - **Write `style.transform` only when the rounded string changed**, cached
    in `dataset`, and visibility only when it flips. Unneeded style writes
    were a measurable cost.
- **The placement ghost** (a "build mode"):
  1. Ray from the pointer to the floor plane.
  2. Snap to 5 cm.
  3. Wall items snap to the nearest real wall (`wallSnap`: on the inner face,
     out of the side walls, into a corner within 30 cm).
  4. Stackable items climb onto a surface under the pointer. A TV goes on a
     stand when there is one, else on the wall.
  5. Run the placement rules.
  - **Look:** materials are cloned to opacity 0.62 with `depthWrite` off and
    no shadows. A floor plate 12 cm larger than the footprint turns **green
    or red**. The ghost bobs `0.015·sin 5t`.
  - The result `{x, z, rot, y, ok, reason}` goes to a small store, and the
    drop uses it.
  - Room presets get their own ghost: floor plates plus low walls from the
    same wall-run code.
- **Room editing:**
  - Drag on the ground to draw a room. Edges snap to neighbours and rooms
    can't overlap.
  - An added part must overlap the room or share at least 0.5 m of edge, so
    the union stays one piece.
  - Edge handles resize, and items near that wall move with it.
  - Dragging a room only works once it is selected. Before that, a drag
    rotates the camera.

### How to do it in our plain three.js

- **Outline:** a `ShaderMaterial` with `side: BackSide` and the view-space
  push, plus one `uniform float k` updated in the render loop. Shells are
  added as children of the selected meshes. It works for hover in any game
  (a targeted foe in Lanternwood, a selected desk in Arcademia).
- **Labels:** we already move DOM labels each frame in
  `src/ui/WorldLabels.js`. Add the "round, compare with the last string,
  write only on change" step there to save style writes.
- **Ghost:** Arcademia's "build your classroom", a base builder, a garage.
  Clone the materials translucent, add a green/red plate, and keep the
  rules in pure functions.

---

## 14. The furniture catalog: 248 items from primitives

**Source:** `src/model/catalog.ts` (`CATALOG`, `OPTIONS`, `RESIZABLE`, `sizeOf`),
`src/scene/kit/registry.ts`, `src/scene/kit/primitives.tsx` (`Box`, `Cyl`, `Ball`,
`mat`), `src/scene/kit/palette.ts`, `src/scene/kit/textures.ts`,
`src/scene/kit/screens.ts`, `src/scene/kit/film.ts`, `src/scene/kit/effects.tsx`,
`src/scene/kit/{furniture,household,devices,smart,decor,appliances,outdoor,street,pets}.tsx`,
`src/scene/Thumbs.tsx`.

### How it works

- **A catalog entry is small:**
  - label, group (14 groups: light, climate, media, furniture, decor,
    outdoor…), footprint `[w, d]` in metres, label height, and a `wall` flag;
  - placement rules live elsewhere, as kind lists: stackable, desk-only,
    ceiling, wall-mounted, freestanding;
  - per-kind side tables hold colour choices, variants and length limits.
  - A registry maps kind → build function. 248 kinds, plus 19 presets
    (double bed, sectional sofa, U stairs…) that reuse kinds with settings.
- **Everything is three primitives:**
  - **Box:** optionally rounded, using `RoundedBoxGeometry` with **2
    segments**, under half the triangles of the usual helper.
  - **Cyl:** cylinder, cone or frustum, 24 segments.
  - **Ball:** an icosahedron, detail 2.
  - Origin at the centre of the footprint on the floor, front facing +z.
  - A seeded xorshift random generator keeps procedural details (books on a
    shelf, leaves) the same every load.
- **Parametric sizing:** one `sizeOf(kind, len, len2)` gives the footprint.
  Builders lay repeated parts out from the length:
  - **Sofa:** 3 cushions when 2 m or longer, else 2.
  - **TV unit:** `max(2, round(L/0.9))` doors.
  - **Rugs:** one unit-square shape, scaled.
  - Limits: desk 0.8–2.6 m, counter 0.6–4 m, rug 0.5–5 m.
- **Caches keep it cheap:**
  - **Geometry:** keyed by size in millimetres (`round(n·1000)`), so equal
    boxes share one geometry. Cached geometry is never disposed.
  - **Materials:** one `MeshStandardMaterial` per `JSON.stringify([colour,
    opts])`, with roughness 0.85 and metalness 0 by default.
  - **Emissive state:** quantised to one decimal, so the material cache stays
    bounded.
  - **Per-item materials:** those that change with state (a lit lampshade)
    are made per item and disposed on removal. Lit surfaces use
    `emissiveIntensity = 0.35 + level × 1.6`.
  - **Pulsing LEDs:** they write `emissiveIntensity` in the frame loop,
    never through app state.
- **Merged outdoor models:** trees, fences and street furniture are merged
  into **one vertex-coloured geometry per kind**. They are made non-indexed,
  stripped to position/normal/colour, baked, and merged. One draw per tree.
- **Instancing only for effects:** sprinkler drops, hot-tub bubbles and
  fountain spray, each one `InstancedMesh`. Selectable bodies avoid instancing
  because the outline and bounds are measured from mesh geometry.
- **Procedural textures:**
  - **Canvas floor textures:**
    - wood: 8 plank rows with staggered seams;
    - tile: a 2×2 grid;
    - carpet: hash noise;
    - grass: 1400 strokes;
    - gravel: 1500 ellipses drawn with wrap-around, so they tile;
    - water: a sum of integer-frequency sines, so it is seamless.
  - **Floor texture settings:** cached by kind, cloned per floor with
    `repeat = size/scale`. The scale is wood 1.6, tile 1.2, grass 2.5 and
    water 3.
  - **Rugs:** drawn at their own aspect ratio, so borders don't stretch.
  - **Light textures:** computed per pixel, as in §4.
  - **Changing text displays** (clock, thermostat): an LRU of 48 textures.
- **Screens:**
  - **Monitors:** one tiny `ShaderMaterial` showing a code editor or document
    with hashed line lengths scrolling. A shared clock uniform, and a
    per-position seed so screens differ.
  - **TV "film":** a 384×216 canvas at 24 fps with five 8 s scenes (sunset at
    sea, night city, hiker, subtitled dialogue, desert road). It adds a slow
    push-in, 7% film grain, a vignette and a 0.35 s fade. When paused it
    draws once with a pause icon. Each TV starts at a different time.
- **Effects:**
  - **Steam:** 7 spheres rising and fading on `(0.35t + phase) mod 1`.
  - **Flames:** 8 additive open cones, height `0.78 + 0.16·sin 7.3t +
    0.09·sin 13.1t`.
  - **Music notes:** a `ShapeGeometry` billboarded by multiplying the
    inverse parent quaternion with the camera quaternion.
  - **Spinning parts:** fans clamp `dt` to 0.1 so a slow frame doesn't jump.
  - Effect meshes are not raycastable and are left out of bounds.
- **Thumbnails** for the build bar:
  - An offscreen 160×160 canvas renders every kind once per session, in
    about 2 s.
  - Fit with `dist = radius / sin(fov/2) × 1.02` along a fixed direction.
  - Each kind is rendered on its 4th frame with `preserveDrawingBuffer`, read
    with `toDataURL`, then the context is freed. Room lights are switched off
    while rendering.

### How to do it in our plain three.js

- **Module:** a `kit.js` with `box(w,h,d,color,{r})`, `cyl(...)`, `ball(...)`
  backed by the mm-keyed geometry cache and the colour-keyed material cache,
  plus `bake(parts)` for static props (one vertex-coloured mesh each).
- **Catalog:** a catalog of `{ kind, size, group, build(opts) }` records. A
  classroom (desks, chairs, whiteboard, lockers, a projector with a "film"
  screen), a tavern or an office comes from a few dozen builders, with no
  model downloads. Our 3,422 polyfork models remain the choice for detailed
  hero props.
- **Thumbnails:** the thumbnail loop fits any in-game shop or build menu.

---

## 15. Performance: zero frames when nothing moves

**Source:** `src/scene/frame.ts`, `src/scene/perf.ts`, `src/scene/Scene.tsx`
(`ShadowManager`, `AmbientTicker`, `PerfProbe`), `src/scene/ItemNode.tsx`.

### How it works

- **Render on demand.** Nothing renders unless something asks for a frame.
  - An animation asks every frame until it settles: easing at
    `min(1, dt·6)`, then done when within 0.0005.
  - Camera input asks while it moves.
  - Reported result: **0 fps idle** (it used to be 60 fps with about 680 draw
    calls and a shadow pass every frame). Triangles went from 162k to about
    34k.
- **Shadows only when something changed.**
  - `shadowMap.autoUpdate = false`. A countdown `markShadows(n)` keeps the
    larger value, and the render loop sets `shadowMap.needsUpdate = true` only
    on marked frames.
  - Startup: 12 frames, so items settle. A plan change: 3. A device change: 2.
    Moving walls and walkers: 1 per frame while they move.
  - Orbiting the camera doesn't redraw shadows, because the sun is fixed.
- **Ambient animations on a 24 fps ticker.**
  - Fans, screens, fire and pets register while active. A ticker at
    1000/24 ms asks for frames, at 12 fps if only "slow" things are active
    (fish, network LEDs).
  - Skipped when `document.hidden`.
  - **Never request 60 fps forever.** A pulsing selection ring was removed
    for that reason.
- **Quality:**
  - Device pixel ratio is 1–1.5 normally and 1 in lite mode. Resolution
    drops while the camera moves (adaptive DPR, minimum 0.6, debounce 250 ms).
  - **Lite mode:** no shadows, no ambient animation, DPR 1. It remounts the
    renderer, because toggling shadows recompiles every material anyway.
- **Avoid recompiles:**
  - never remove fog;
  - keep a fixed light count (room lights are uniforms);
  - prefer a full remount when shadows are toggled.
- **Avoid rebuilds:**
  - walls and roads are keyed by text signatures;
  - items re-render only when their own data changes;
  - inactive floors are flagged, not rebuilt.
- **Throttle the rest:**
  - door checks at 5 Hz, the people plan every 15 s, pet follow re-paths
    every 1 s, aiming at 10 Hz;
  - at most 14 sound loops (§16).
- **Counters:** each frame, copy `renderer.info` (calls, triangles,
  geometries, textures, programs) plus shadow updates and active ambient
  animations into one plain object for tests and a debug overlay.

### How to do it in our plain three.js

- **Demand rendering:** our games run a continuous loop because they are
  action games. The demand pattern fits **menus, hubs, build modes and
  turn-based screens**: the Arcademia lobby, the Work Life office view, the
  Platform Home cover renders. Use a `needsFrame` counter and
  `requestAnimationFrame` only when it is above zero.
- **Shadow countdown:** this helps even with a continuous loop. Static
  scenes with a fixed sun can set `autoUpdate = false` and mark shadows only
  when something moves.

---

## 16. Sound: a synthesized home

**Source:** `src/audio/engine.ts`, `src/audio/dsp.ts`, `src/audio/voices.ts`,
`src/audio/shots.ts`, `src/audio/music.ts`, `src/audio/SoundScape.tsx`,
`src/audio/floor.ts`, `src/audio/samples.ts`.

### How it works

- **One graph:** master gain → compressor (threshold −14 dB, knee 10, ratio 4,
  attack 5 ms, release 250 ms) → analyser → output.
  - There are 8 buses: appliance, media, home, alert, people, pets, nature
    and UI. Nature sits at 0.8 and UI at 0.55.
  - Sliders are squared so they feel logarithmic. **Every** gain change is a
    `setTargetAtTime(..., 0.08)` ramp, which avoids clicks.
- **Unlock and save:**
  - The context is created and resumed on the first `pointerdown`, `keydown`
    or `touchend`.
  - It is suspended while the tab is hidden, and 400 ms after sound is
    switched off.
- **3D sound:**
  - one `PannerNode` per source (equal-power, inverse distance, ref 1.5,
    rolloff 1.15, max 120 m);
  - the listener is updated only when it has moved more than 5 mm or turned
    more than 0.002;
  - in the orbit view the listener sits `min(d, max(2.5, 0.32·d))` from the
    look-at point toward the camera, so zooming into a room brings its
    sounds forward.
- **Muffling through walls:**
  - Each source passes a lowpass at `18000·(450/18000)^m` Hz with gain
    `1 − 0.45m`. No reverb.

    | Between | m |
    | --- | --- |
    | Rooms joined by an open door | 0.3 |
    | Rooms behind a closed door | 0.6 |
    | Inside and outside | 0.72 |
    | Inside and outside through an open window | 0.45 |

- **Loop budget:**
  - Every 300 ms, list all wanted loops and score each by estimated loudness:
    `gain·ref/(ref + 1.15·max(0, d − ref))·muffle`.
  - Drop those under 0.006 and play the top **14**.
  - New loops fade in (time constant 0.3). Stopped ones fade out (0.15) and
    are disconnected after 900 ms.
- **One-shots:** dropped above 28 alive (18 for footsteps), beyond 45 m, or
  when a sample takes more than 800 ms to decode. The same variant never
  plays twice in a row.
- **DSP kit:**
  - **Noise buffers:** 3 s white, pink (Paul Kellet filter) and brown, with
    the last 20 ms crossfaded into the start so the loop has no click.
  - **Lookahead scheduler:** a 100 ms timer that schedules events 0.3 s
    ahead and skips events missed while the tab slept.
  - **Building blocks:** `burst` (filtered noise with an attack and
    exponential tail), `tone` (an oscillator with a pitch glide), `ring`
    (inharmonic partials for glass, metal and ceramic), and `wander` (a
    parameter random-walking on a slow timer).
- **Recipes:**
  - **Rain:** white noise high-passed at 500 Hz and low-passed at 7 kHz, plus
    pink noise low-passed at 800 Hz, plus 6 ms drop ticks at 2–6 kHz, every
    5–40 ms divided by (1 + intensity).
  - **Wind:** pink noise through a bandpass at about 400 Hz (Q 0.6) whose
    frequency wanders between 250 and 700 Hz every 3 s, plus brown noise
    low-passed at 150 Hz.
  - **Birds:** three species of chirp phrases. A sparrow chirps at 3.6–4.6
    kHz; a thrush runs 6–11 notes; a two-note "tee-cher" glides 5200→4300 Hz,
    then 3900→3700 Hz.
  - **Crickets:** two pulse trains at 4600 and 4300 Hz, 27 ms apart.
  - **City hum:** brown noise low-passed at 120 Hz.
  - **Thunder:** brown noise with a lowpass sweeping from 320 to 110 Hz over
    3–5 s, plus an optional 1.5 kHz crack.
  - **Footsteps by floor:** wood is a low tone (85–110 → 55 Hz) with a
    700 Hz knock; carpet is a soft lowpass thud; grass is a 2.2–3.2 kHz
    swish; gravel is 9 random grains; a hard floor is a heel click. The floor
    comes from the room's material, a rug under you, or grass outside.
  - **Cat purr:** brown noise low-passed at 170 Hz, amplitude-modulated by a
    26 Hz square wave.
  - **Snore:** pink "breath" plus a 48–62 Hz buzz.
  - **TV speech:** a sawtooth "voice" through two formant bandpasses driven
    by a vowel table, two speakers alternating (115 and 210 Hz), all
    band-limited to 170–3400 Hz.
  - **Music:** a seeded step sequencer at 84–117 bpm with four chord
    progressions. It has a kick (140→45 Hz), a snare, a hi-hat, a triangle
    bass, an arpeggio and a pad. Drums play only in bars 0–11 of every 16.
- **Ambience by time and weather:**
  - Two emitters sit 4 m outside opposite corners of the house.
  - Wind is always there (louder when windy). Then one of rain, birds by day,
    or crickets at night.
  - At night: a low floor, frogs, an owl every 28–75 s and distant dogs.
  - City hum near roads.
- **Recordings first, synthesis as fallback:** about 110 recorded ids exist.
  Synthesis is used for anything missing, and electronic beeps stay
  synthesized on purpose.

### How to do it in our plain three.js

- **Audio module:** our games each have a small synth (`src/stoneball/sound.js`,
  `src/arcademia/sound.js`, `src/squad/purge/audio.js`). A shared
  `soundscape.js` could hold the noise-buffer seam fix, the lookahead
  scheduler, the loop budget and the muffling table.
  `THREE.PositionalAudio` wraps a `PannerNode`, or we use WebAudio directly.
- **Where the recipes fit:** the rain, wind, birds, crickets and footstep
  recipes give every game weather and floor sounds with no files. TV speech
  and the step sequencer suit Arcademia's classroom and Work Life's office
  radio.

---

## 17. Which of our games could use what

| Game | Folder | What fits | Sections |
| --- | --- | --- | --- |
| **Gangnam Jarani** | `games/g_cv2yrhrpv2` | **Weather:** roof/arcade mask for rain, distance-scaled streaks, three-flicker lightning with delayed thunder, eased wetness and snow cover. **Traffic:** curvature speed limit, two-axle pose, following, crosswalk and walker yield, spawn gaps by hour and rain. **Street:** dog walkers with a sagging lead, headlight fans as additive planes. **Sound:** ambient rain, wind and city hum. | 6, 11, 16 |
| **Lanternwood** | `src/hd2d` | **Interiors** (tavern, shop, tower): wall runs with door and window cuts, the camera-facing wall cutaway, room lights so many lanterns and candles glow per room without real lights, door-shaped spill into the next room. **Stairs and floors:** a height function and stacked floor groups. **Night glows:** windows and fires. **Creatures:** a camp pet, and the gait table for beasts. **Sound:** synthesized fire, crickets and an owl at night. | 1–4, 10, 16 |
| **AI Arcademia** | `src/arcademia` (being built by another agent; not touched here) | **School:** classrooms and corridors from a 2D plan, a dollhouse cutaway for a top-down school, several floors with stairwells, room lights per classroom. **People:** procedural students and teachers with sit / type / read / raise-hand poses (gated sines), daily life by timetable (the weighted-spot table, keyed by lesson instead of hour), A\* plus door auto-open for walking between rooms. **Building:** furniture catalog from primitives (desks, chairs, whiteboard, projector "film"), placement ghost for building a classroom, catalog thumbnails. **Camera:** flight between rooms or floors. | 1–5, 7–9, 12–15 |
| **Work Life** | `src/work` | It is drawn in SVG, not 3D. The *logic* transfers: the activity planner (spot weights by hour, re-plan every few minutes), the gated-sine gestures for the drawn figures, and synthesized office sound (typing, TV speech, a radio sequencer). A 3D office view later would take the catalog and room lights. | 8, 16 |
| **Every game** | – | Render-on-demand and the shadow countdown for menus and hubs. Fog kept alive and a fixed light count, so nothing recompiles. Screen labels written only on change. Constant-pixel outline for hover. Click-vs-drag thresholds of 4 px, or 14 px for touch. | 13, 15 |

**Suggested first ports, in order of value:**

1. Room lights (§4)
2. The wall cutaway (§2)
3. Wall runs with openings (§1)
4. The weather roof mask and lightning envelope (§6)
5. The procedural figure and its pose blend (§7–8)
6. The street traffic rules (§11)
7. The primitive kit with its caches (§14)
8. The loop budget and noise recipes (§16)
