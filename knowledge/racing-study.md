# Racing, RC cars and FPV drones: what the references teach

Studied 2026-11-24 from `images2/` (93 phone screenshots, never committed; records
`ref.img2-*` in `knowledge/visual-refs.json`). About 20 of them are vehicles:
supercar chase clips from an open-world racing game and real footage, an indie
rally game, a hover-pod racer's HUD, a cockpit view, FPV drone racing and a
simulator, and a real RC drift car driving round a house with a cat. The rest
are scene-mood references (§11 of `visual-study.md`).

The user wants racing games with **high-quality cars** and **RC-car games**.
Learn the camera, light, materials, effects and HUD from these; never rebuild a
specific game, its cars' brand marks, names or tracks. Real car brands are
trademarks: our cars are original designs or credited free models, with our own
badges and plates.

```bash
npm run kb -- racing chase camera            # records + this guide
npm run kb -- rc car house --kind visual-ref
npm run kb -- --show ref.img2-0353          # one screenshot's notes; `image` = local file
```

## Contents

1. What is in the collection
2. Why these cars look expensive: the ten ingredients
3. Car materials in three.js
4. Camera and the feeling of speed
5. Effects: smoke, dust, ruts, sparks, flames, water
6. Wet roads and night
7. Handling that feels good
8. Racing HUD, measured
9. RC cars: the miniature game
10. FPV drones
11. Game ideas for the user (original)
12. What the repo already has, and the gaps
13. Free models, physics and examples (verified)
14. Checklist before calling a car "high quality"

## 1. What is in the collection

| Group | Images | Best |
|---|---|---|
| Supercar chase (game + real) | 0267, 0275, 0278, 0283, 0286, 0302, 0348 | 0275 (detail), 0286 (flames), 0348 (wet, drift angle) |
| Cockpit / dashboard | 0284, 0270 | 0284 |
| Stylised indie rally | 0259 | the target for a kids' game |
| Hover racer HUD | 0312 | the HUD layout |
| FPV drones | 0330, 0355 | 0355 (stick overlay) |
| RC car at home | 0353, 0354 | both (concept) |
| Roads and streets | 0307, 0314, 0316, 0346 | 0307 (wet road) |
| Future vehicles | 0297, 0264, 0293 | 0297 |

Most supercar clips share one look: overcast or soft daylight, a camera at
bumper height, a razor-sharp car on a heavily blurred road, real-world places
(expressways, a port, mountain roads with a famous volcano behind).

## 2. Why these cars look expensive: the ten ingredients

In order of how much they matter on screen:

1. **The road blurs, the car does not.** The camera is locked to the car, so
   per-pixel motion blur smears only the world. That contrast is the strongest
   "fast and real" signal in every chase clip (0267, 0275, 0278, 0283).
2. **Reflections from a real environment.** Paint and chrome are mostly
   reflection. Dark cars show the sky gradient on the rear deck (0278); a chrome
   exhaust only reads as chrome because it reflects sky and road (0302). Use an
   HDRI at full strength, not a dim one.
3. **Clearcoat over the base paint.** A sharp white highlight line on the top
   edges over a softer coloured body (0283 red louvres, 0348 yellow).
4. **Soft, believable light.** Overcast (0267, 0283, 0302, 0348) is the most
   forgiving: no hard shadow edges to get wrong, even reflections. Second best:
   low golden sun with long shadows.
5. **Contact darkness.** A dark soft shadow and AO under the car glue it to the
   road; without it a car floats.
6. **Emissive light strips.** Thin LED bars and chevrons in the tail (0278, 0348)
   with a small bloom: modern, readable from far away, and they tell you the car
   is braking.
7. **Mechanical depth at the back.** Real geometry for intakes, mesh grilles,
   diffuser fins, exhaust tips, a wing on stalks (0275, 0286). The chase camera
   looks at the rear 90% of the time, so spend the polygons there.
8. **Small true details.** A number plate, a cloth bag, cable ties (0275); panel
   gaps; tyre sidewall lettering. These cost little and sell scale.
9. **Body motion.** The body rolls 2–4° in corners, squats on throttle, dives
   on braking; the camera sees yaw in a slide (0348). Even an arcade car needs it.
10. **A place worth driving.** A famous mountain on the horizon (0286), an
    industrial port (0302), autumn trees on a wet road (0348). Keep the location
    simple and grey so the car supplies the colour.

## 3. Car materials in three.js

Numbers for `MeshPhysicalMaterial` (WebGL2) and `MeshPhysicalNodeMaterial`
(WebGPU/TSL); they take the same parameters.

| Part | Settings |
|---|---|
| Metallic paint | `metalness 0.6–0.9`, `roughness 0.35–0.5`, `clearcoat 1`, `clearcoatRoughness 0.03–0.08`; flakes: a tiny tiled noise normal map on the **base** (`normalScale 0.05–0.15`, repeat ~200×), never on the clearcoat |
| Solid paint | `metalness 0`, `roughness 0.45–0.55`, `clearcoat 1`, `clearcoatRoughness 0.05` |
| Pearl / colour-shift | add `iridescence 0.3–1`, `iridescenceIOR 1.3`, `iridescenceThicknessRange [100, 400]` |
| Glass | no `transmission` (it renders the scene twice): dark tint, `transparent`, `opacity 0.35–0.55`, `roughness 0`, `envMapIntensity 1.5`; a dark interior behind it |
| Chrome | `metalness 1`, `roughness 0.04–0.1` |
| Brushed rims | `metalness 1`, `roughness 0.25–0.35`, `anisotropy 0.6–0.8` (rotation along the spokes) |
| Carbon fibre | twill normal map + `clearcoat 1`, `roughness 0.3`, slight `anisotropy` |
| Tyres | `#1c1c1e` never pure black, `roughness 0.85–0.95`, sidewall lettering in the normal map |
| Brake calipers / discs | bright caliper colour; disc `metalness 1, roughness 0.4`; optional orange emissive glow after hard braking |
| Lights | emissive strips `emissiveIntensity 2–6`, brake state ×2; only emissive goes to bloom (render-quality.md §3) |
| Plates, badges | canvas texture of our own design; never a real brand badge |

**Environment.** PMREM from an HDRI (road, car park or studio; CC0 from Poly Haven)
at `envMapIntensity 1.0–1.5`. For moving reflections, a `CubeCamera` at the car
(128–256 px, only sky + road + big buildings on its layer) updated every 3–4
frames, or blend two static probes along the course. A static HDRI is fine for a
showroom/garage.

**Shadow.** A soft baked AO plane under the car (a blurred dark rectangle
texture, multiply) plus the sun's shadow. The plane alone already makes a car sit.

**Wheels.** Spin with ground speed. Above ~15 m/s swap the spoke mesh for a
blurred-disc texture (or fade one in): spokes strobing backwards looks cheap.
Front wheels steer visibly.

**Budgets** (desktop, WebGPU high tier): hero car 60–150k triangles with real
rear geometry; rivals 20–40k with an LOD; traffic 5–15k or impostors past 150 m.
Mobile/low tier: one car at full detail, the rest LOD1.

## 4. Camera and the feeling of speed

Chase camera, measured from the clips (car ~4.5 m long):

| View | Height | Behind | Look at | FOV | Car on screen |
|---|---|---|---|---|---|
| Near chase (default) | 1.0–1.3 m | 5–6.5 m | 2–3 m ahead of the car, 0.8 m up | 55° → 70° at top speed | ~30% of width, lower-middle, horizon at ~40–45% |
| Close / showcase | 1.2 m | 2–3 m | rear deck | 60° | 80–90% of width (0275) |
| Rally / kids | 2.5 m | 6 m | 4 m ahead | 60° | ~25% of width, corner ahead visible (0259) |
| Cockpit | driver eye | — | road | 65–75° | wheel fills the bottom ~45% (0284) |
| Dashboard | above dash | — | road | 70° | dash silhouette across the bottom ~15% (0270) |

- **Lag, don't lock rigidly.** Position follows with a speed-dependent spring;
  yaw lags slightly so in a turn the camera swings to the outside and shows the
  car's side and its drift angle (0348).
- **FOV ramps** with speed (+10–15°) and kicks a further +5° for a boost, easing
  back over ~0.5 s.
- **Motion blur.** WebGPU: velocity in the MRT pass, blur scaled by shutter
  (~0.5 at 60 fps), 8–12 samples, clamped. WebGL2 fallback: a radial blur
  masked to pixels deeper than the car. Snowpuff's pipeline already has a speed
  blur (`src/snowpuff/render/pipeline.js`).
- **Near-edge speed cues** do more than raw speed: posts, poles, fences,
  roadside flags (0275), overhead wires (0267, 0316), traffic to pass (0278).
  Reuse the Snowpuff speed kit (`own.snowpuff.speedkit`).
- **Shake** stays small: 0.5–2 cm high-frequency at speed, scaled by road
  roughness; a real kick only on impact.

## 5. Effects: smoke, dust, ruts, sparks, flames, water

| Effect | Look | Numbers |
|---|---|---|
| Tyre smoke (tarmac drift) | grey-white, **lit** by the sun, not additive | 0.4 m puffs growing to 2.5 m, 1.5–3 s life, emitted from rear contacts by slip |
| Dust (gravel, 0259) | warm sand `#d9c7a4`/`#efe4cf`, big and soft | ~2 car-widths wide, ~1.5 s fade, rises and drifts back |
| Skid marks | dark strips on tarmac | opacity by slip, fade over 30–60 s, ring buffer |
| Ruts (gravel, 0259) | long darker strips that **stay** | persist all race; show the racing line |
| Sparks | orange-white streaks, additive, gravity | 20–40 per scrape, 0.2–0.5 s |
| Exhaust pops (0286) | white-yellow core, orange body, round halo | ≤0.3 m, 2–4 frames, + a short orange point light on the bumper; on throttle lift / gear shift |
| Water spray (wet) | rooster tail from the rear tyres + low mist sheet | scales with speed; hides the car behind |
| Brake glow | orange emissive on discs | after ≥1 s of hard braking, cools over 3 s |

`games/g_cv2yrhrpv2/racefx.js` already does skid marks, smoke, sparks and turbo flames in
three draws per car: start from it.

## 6. Wet roads and night

- **Reflections on wet asphalt are vertical streaks, not mirrors** (0307, 0346):
  each light becomes a smear 3–6× its size straight down the road towards the
  camera. Cheap and convincing on both pipelines: an additive vertical billboard
  under each bright light, faded by wetness and angle. WebGPU can add SSR on top.
- Wet asphalt: albedo ×0.6, roughness ~0.35, puddles roughness ~0.15 through a
  puddle mask; rain streaks only where they cross lights.
- Night city palette (0314): one dominant cool light (blue LEDs, sodium orange)
  + warm accents (tail-lights). Keep the car's lights the warmest thing on screen.
- Wet autumn mountain road (0348): dark glossy road, bright centre line, warm
  trees, the car as the brightest colour.

## 7. Handling that feels good

Arcade raycast vehicle, the model every good web racer uses:

- **Four rays** down from the wheel mounts. Spring `F = k·compression`, damper
  ~0.3–0.5 of critical (`2·sqrt(k·m/4)`); the body is one rigid body.
- **Tyre grip.** Longitudinal force from throttle/brake; lateral force against
  the wheel's sideways speed, through a curve peaking at ~6–8° slip and falling
  to ~70% beyond: that fall-off is what makes a slide.
- **Drift.** Handbrake/drift button cuts rear lateral grip (to ~40–60%) and adds
  a little yaw; an assist counter-steers and holds the angle so players feel
  skilful. Speed-sensitive steering: max steer angle shrinks with speed.
- **Downforce** ∝ v² keeps fast cars planted; **air control** gently levels the
  car mid-air.
- **Fixed step** at 120 Hz with an accumulator; render interpolated (Snowpuff
  board physics does this).
- **Keep it pure and tested**, like `games/g_cv2yrhrpv2/drive.js` (`stepCar`): a car in a
  plain object, no rendering, so tests can drive it into walls.

## 8. Racing HUD, measured

From 0312 (hover racer) and 0284 (cockpit):

| Element | Where | How |
|---|---|---|
| Race progress | top edge, full width | thin line, small markers for rivals, a triangle for you; a minimap-free sense of position |
| Lap | top-right | big numeral + small "/4" |
| Position | top-left (with the corner minimap below or beside it) | "2nd" big, "/4" small |
| Timer | bottom-centre | current lap over best lap (best in gold), monospace |
| Speed + gear | bottom-right (or in the car's own cluster) | gear as the big digit, speed beside it, a curved rev bar on top |
| Boost / stamina | bottom-left and bottom-right corners | angled stripe bars hugging the corners |
| Countdown | centre, then gone | 3-2-1-GO, the centre stays clear during the race |

One thin line style and one accent colour (0312 uses warm gold) for every
element makes the HUD feel designed. Repo rules still apply: corner minimap,
numbers for items, never Q/E for potions, H = How to play. Kids' version: big
picture items, a filling ring, no numbers except the place.

## 9. RC cars: the miniature game

The RC clips (0353, 0354) are the clearest new idea in the folder: a small
drift car with working headlights crossing a home, a cat leaping over it,
a robot vacuum and a snack bag standing about like buildings.

**What makes it read as miniature**
- Camera at floor level: 5–10 cm for a ground shot, chase at ~0.35 m high,
  ~1.2 m behind for a 1:10 car.
- Depth of field focused on the car (tilt-shift feel): background and the near
  floor soft.
- Oversized everyday objects with real textures: wood grain, tile grout, carpet
  fibre, a doorway sill as a kerb, a step as a drop.
- Glossy floors reflect the car and lamps (the miniature wet road): planar
  reflection or SSR on the floor only.
- Warm window light with dust motes in the beams.

**The toy car itself**: plastic shell `metalness 0`, `roughness 0.3`,
`clearcoat 0.5`; sticker decals; big soft tyres; long suspension travel so the
shell bounces; a wobbly whip antenna (spring); LED headlights that give the car
a face.

**Physics feel**: simulate at real scale and gravity (a 1:10 car is ~0.57 m and
~2 kg, a 1:16 ~0.33 m and ~1 kg, both ~13 m/s flat out; §13),
so it is quick and twitchy like a real RC car: huge power for its weight,
wheelies, flips, short airtime. Add auto-right after ~1.5 s upside down (or a
button), soft collisions with plush toys and cushions, slippery spills, grippy
rugs.

**Views**: chase (default), floor-cam replay, FPV onboard (fisheye), and the
real RC view: a camera standing at a person's eye height (1.6 m) that turns to
follow the car. In that view steering feels reversed when the car drives
towards you: a fun optional challenge.

**Controls**: keyboard/gamepad as usual; touch like a pistol-grip transmitter:
steering slider on the left, throttle/brake trigger on the right.

**House tracks and hazards (original)**: living room, kitchen (spills, chair
legs), kids' bedroom (plush toys, block towers, a toy-train crossing), garage
(oil, tools, ramps), garden (sandbox, hose puddles). Hazards: a cat that
patrols and pounces, a robot vacuum that slowly sweeps and pushes cars, a
rolling ball. Track pieces kids can place: bottle-cap cones, book ramps,
cardboard tunnels, toy-block walls. Battery as a resource: throttle drains it,
charge pads refill.

## 10. FPV drones

From 0330 and 0355 (controls, rates and lens figures in §13):
- **Gates**: emissive frames with bloom (cyan in a dusk stadium, 0330; thin pink
  outlines, 0355) readable from any angle and roll.
- **Camera**: very wide with barrel distortion and uptilt so fast forward flight
  looks level.
- **Stick overlay** (0355): two small squares (~8% of width) bottom-centre, a
  crosshair and a dot per stick. The best way to teach two-stick flying.
- **Modes**: angle (self-levelling) for kids and beginners, acro for experts;
  rates and expo in settings.
- **The drone**: carbon frame, coloured motor caps, antenna, props as blurred
  discs while spinning.

## 11. Game ideas for the user (original)

1. **Living-room RC rally (kids)**: little RC cars driven by plush animal
   friends race through a house; the cat and the robot vacuum are moving
   hazards; items like a battery boost, a bubble shield, a jam splat; bots or
   friends by room code. Kids plush look (render-quality.md §6) on a toy car.
2. **Backyard FPV gates**: fly a drone through glowing gates round a garden or
   a dusk stadium; learning mode with the stick overlay and angle mode;
   time trials and ghost races.
3. **Sandbox rally**: stylised rally at RC scale outdoors (sandpit, garden
   paths, puddles) with big dust clouds and ruts that stay (0259's lesson:
   effects and light carry a simple style).
4. **Photoreal road racer**: the chase-camera supercar look from §2–§6, on
   original cars with our own badges.

Per the repo's rules a new game goes on the build queue; ask the user before
starting one.

## 12. What the repo already has, and the gaps

- `games/g_cv2yrhrpv2/` (Seoul): Khronos Car Concept body in many paints, a garage of
  five handling specs, `drive.js` pure handling, `racefx.js` skid marks / smoke /
  sparks / flames, weather with wet roads. From 2026-11-24 its race is being
  turned into a bicycle race; the cars stay as traffic.
  Gaps against the references, for any future car game: `envMapIntensity 0.4`
  (§3 says 1.0–1.5), no paint flakes, no motion blur on WebGL2, no body roll,
  glass flat, no wet-road light streaks.
- `src/snowpuff/`: the WebGPU pipeline (GTAO, emissive bloom, TRAA, speed blur),
  120 Hz physics, the speed-feel kit, spline courses with berms and jumps, the
  plush material. A new racer should start from these.
- `vendor/3dviz` style profile `style-toy-miniature` (scale cues), and
  `ref.img-0008` (toy car in a foggy graveyard).

## 13. Free models, physics and examples (verified)

Checked 2026-11-24 against GitHub, npm and the official pages. npm `three` is at
0.187; the repo pins r0.185, and the example names below exist at the `r185` tag.

**Vehicle physics**

| Library | Licence | State | Use |
|---|---|---|---|
| Rapier `@dimforge/rapier3d(-compat)` 0.21 | Apache-2.0 | active (code now in `dimforge/rapier`, `bindings/typescript`; old `rapier.js` repo archived) | **first choice.** `world.createVehicleController(body)`, `addWheel(connection, direction, axle, restLength, radius)`, `updateVehicle(dt)`, per-wheel `setWheelEngineForce / Brake / Steering / SuspensionStiffness / FrictionSlip / SideFrictionStiffness…`, read `wheelIsInContact`, `wheelSuspensionLength`, `currentVehicleSpeed()` |
| Jolt `jolt-physics` 1.1 | MIT | active | `VehicleConstraint` + `WheeledVehicleController` / `MotorcycleController` (a real bike model) / tracked; ~3 MB wasm+js |
| PhysX `physx-js-webidl` 2.9 | MIT (PhysX BSD-3) | active | full PhysX vehicles; heavy |
| cannon-es `RaycastVehicle` | MIT | stale since 2022 | fine for small demos |
| Ammo.js `btRaycastVehicle` | zlib | old npm package unofficial | avoid for new work |

Rapier gotchas: forward axis defaults to **+X** (set with the property
`controller.setIndexForwardAxis = 2` for +Z); wheel defaults (stiffness 5.88,
friction slip 10.5, max travel 5, max force 6000) are full-size car values and
must be retuned for RC scale; the chassis is excluded from its own wheel rays.

**Code worth reading** (ideas, then write our own):
- three.js `examples/physics_rapier_vehicle_controller.html` (RapierPhysics addon).
- Bruno Simon `folio-2025` (MIT, three 0.187 WebGPU + Rapier vehicle):
  `sources/Game/Physics/PhysicsVehicle.js`; a playful small car tuned
  friction slip 0.9, side friction 3, suspension stiffness 25 — a good RC start.
- isaac-mason/sketches `rapier/dynamic-raycast-vehicle-controller` (MIT).
- pmndrs `racing-game` (MIT, R3F + cannon raycast vehicle, dormant since 2023).
- BKcore HexGL (MIT, hover racer, stale). TriggerRally is GPL-3 with
  non-redistributable content: read only.

**Car and toy models**

| Model | Licence | Notes |
|---|---|---|
| Khronos `ToyCar` | **CC0** (Guido Odendahl, Eric Chadwick) | toy car with transmission, clearcoat, sheen — a direct RC/toy reference |
| Khronos `ClearCoatCarPaint` | **CC0** (Eric Chadwick) | car-paint clearcoat reference |
| Khronos `CarConcept` | CC BY 4.0 (Eric Chadwick, Darmstadt Graphics Group) | contains Khronos and 3D Commerce logos (trademarks): strip them (Seoul hides the wheel emblem already) |
| Khronos `CarbonFibre` | CC BY 4.0 (Eric Chadwick, Wayfair) | anisotropic carbon |
| Kenney Toy Car Kit 1.2 | **CC0**, 100 files | toy/RC cars |
| Kenney Car Kit 3.1 / Racing Kit 1.0 | **CC0**, 45 / 110 files | cars, track pieces |
| Quaternius Cars Pack | **CC0**, 8 models | (no "Ultimate Vehicles" pack exists) |
| Sketchfab "RC Shvan – Low poly" (DanielZhabotinsky), "RC F1" (blakebella) | CC BY 4.0 | RC F1 is 769k faces: decimate |
| three.js `ferrari.glb` | **unverified**, source page gone, brand mark | **do not ship** |

**HDRIs for car reflections** (Poly Haven, CC0): `studio_small_09`,
`empty_warehouse_01`, `abandoned_parking`, `mall_parking_lot`, `parking_garage`,
`derelict_highway_midday`, `autoshop_01`, `dirt_bike_track_01` (RC outdoors).
Props: `old_tyre`, `concrete_road_barrier`, `rusted_wheel_rim_01`.

**three.js examples to open** (r185): `webgl_materials_car`,
`webgpu_postprocessing_motion_blur`, `webgpu_postprocessing_ssr` (renamed to
`_ssr_mirror` / `_ssr_stochastic` after r185), `webgpu_materials_envmaps_groundprojected`
(GroundedSkybox), `webgpu_clearcoat`, `webgl_tsl_clearcoat`,
`webgpu_loader_gltf_anisotropy`, `webgpu_textures_anisotropy`,
`webgpu_loader_gltf_iridescence`, `webgpu_postprocessing_traa`,
`webgpu_postprocessing_ao`.

Paint flakes: no three.js write-up found. Pattern (from other engines): flake
normal map on the base `normalNode`, smooth `clearcoatNormalNode`, clearcoat
roughness 0–0.1, a metallic mask on the flakes. Test it before relying on it.

**RC and FPV figures**
- Traxxas 1:10 Slash 2WD: 568 mm long, 335 mm wheelbase, 2.16 kg, 89 mm
  clearance, 30+ mph (~13 m/s). 1:16 E-Revo: 328 mm, 202 mm wheelbase, 1.09 kg,
  30+ mph. Suspension travel isn't published (guess ~25–40% of wheel diameter).
- FPV Mode 2: left stick throttle (up/down) + yaw (left/right); right stick
  pitch + roll. Acro: sticks set rotation rate, attitude holds when released.
  Angle: self-levels with a tilt limit (beginner/kids mode).
- Betaflight rates: expo `x' = x·|x|³·e + x·(1−e)`; rate `200·rcRate·x'` deg/s
  (+`14.54·(rcRate−2)` above 2); super rate multiplies by
  `1/clamp(1−|x|·superRate, 0.01, 1)`. Starting point: RC rate 1.0, super 0.7, expo 0.
- Camera uptilt 20–35° (freestyle), more for racing; lenses 145–160° diagonal.
  three.js `fov` is vertical: use a barrel-distortion pass, or a vertical FOV of
  ~90–110° as an approximation.

## 14. Checklist before calling a car "high quality"

- [ ] HDRI reflections at full strength; dark paint shows the sky
- [ ] clearcoat highlight line on the top edges; flakes on metallic paint
- [ ] soft contact shadow / AO under the car
- [ ] real rear geometry (intakes, diffuser, exhaust tips, wing)
- [ ] emissive light strips with bloom; brake lights brighten
- [ ] wheels spin, steer, and blur at speed
- [ ] body rolls, squats, dives
- [ ] chase camera at bumper height with lag and speed FOV
- [ ] road motion blur with a sharp car
- [ ] smoke / dust / ruts / sparks / flames from racefx-style pools
- [ ] wet roads: vertical light streaks, darker glossy asphalt
- [ ] screenshot side by side with 0275, 0283, 0348 (or 0259 for stylised, 0354 for RC)
