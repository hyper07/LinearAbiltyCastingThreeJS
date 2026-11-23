# Engine-grade rendering in three.js

What makes a Unity or Unreal game *look* expensive, and how to get the same
result in our plain three.js (r0.185, ES modules). Read this before starting a
new game or a visual upgrade. Each section ends with **Do** lines.

- **Search:** `npm run kb -- render quality`, `npm run kb -- plush`, `npm run kb -- snow trail`.
- **Companion:** [visual-study.md](visual-study.md) — what the reference
  screenshots in `images/` teach about HUDs, skill bars, effects and menus.

## Contents

1. [Two pipelines, and which game uses which](#1-two-pipelines-and-which-game-uses-which)
2. [The ten things that make a frame look engine-grade](#2-the-ten-things-that-make-a-frame-look-engine-grade)
3. [WebGPU pipeline recipe (new games)](#3-webgpu-pipeline-recipe-new-games)
4. [WebGL2 pipeline recipe (Gloamreach, Lanternwood, Arcademia)](#4-webgl2-pipeline-recipe-gloamreach-lanternwood-arcademia)
5. [Quality tiers and budgets](#5-quality-tiers-and-budgets)
6. [Cute doll and toy characters for kids](#6-cute-doll-and-toy-characters-for-kids)
7. [Snow, powder and board trails](#7-snow-powder-and-board-trails)
8. [Skill effects that read like a AAA game](#8-skill-effects-that-read-like-a-aaa-game)
9. [Open-source pieces worth using](#9-open-source-pieces-worth-using)
10. [Mistakes that make it look cheap](#10-mistakes-that-make-it-look-cheap)

---

## 1. Two pipelines, and which game uses which

three r0.185 ships two renderers:

| | `WebGLRenderer` (WebGL2) | `WebGPURenderer` (`three/webgpu`) |
| --- | --- | --- |
| Materials | GLSL `ShaderMaterial`, `onBeforeCompile` | TSL node materials (`MeshStandardNodeMaterial`…); GLSL does **not** run |
| Post | `EffectComposer` + passes in `three/addons/postprocessing/` | `RenderPipeline` + nodes in `three/addons/tsl/display/` |
| Effects available | GTAO, SAO, SSAO, SSR, Bokeh, UnrealBloom, SMAA, TAA, LUT, Outline | **all of those plus** SSGI (screen-space global illumination), TRAA, TAAU, FSR1 upscaling, godrays, contact shadows (`sss`), denoise, motion blur, chromatic aberration, lens flare |
| Fallback | — | Falls back to a WebGL2 backend by itself when WebGPU is missing |

Our games have 82 source files of GLSL (13 in Gloamreach, 6 in Lanternwood,
6 in Arcademia), so switching them is a port, not a flag.

**Do:**
- Gloamreach, Lanternwood, AI Arcademia: stay on WebGL2 and use §4.
- A **new** game (for example the bunny snowboard idea): start on
  `WebGPURenderer` + TSL from the first line and use §3. Write effects as TSL
  node materials, never `ShaderMaterial`.
- Pin `three` to an exact version in a new game; the TSL API still moves
  (`PostProcessing` was renamed `RenderPipeline` in r183, and both exist in r0.185).

## 2. The ten things that make a frame look engine-grade

In order of value for effort. Most "Unreal look" comes from 1–5, not from
fancy shaders.

1. **Image-based light plus one shadowed sun.** An HDRI through
   `PMREMGenerator` as `scene.environment` (17 CC0 HDRIs are already in the
   library: `npm run kb -- hdri`) gives every material believable ambient
   light and reflections. One `DirectionalLight` casts the shadows.
   Ambient-only or hemisphere-only light is what makes a scene look flat.
2. **Filmic tone mapping and exposure.** `AgXToneMapping` (soft, film-like,
   keeps saturated colours from going neon) or `NeutralToneMapping` (keeps
   brand and UI colours true, best for kids' games). Set it once, tune
   `toneMappingExposure`, and never author colours above 1.0 except emissive.
3. **Ambient occlusion.** Contact darkness under feet, in corners, under chins.
   This is the single biggest step from "web demo" to "game". GTAO (WebGL2 and
   WebGPU) or SSGI (WebGPU, AO and bounce light together).
4. **Soft, stable shadows.** Fit the shadow camera tightly around the player
   (or use `three/addons/csm/CSM.js` for big views), `shadow.radius` with
   `PCFSoftShadowMap` or VSM, `normalBias` ≈ 0.02 so there's no acne. Add
   contact shadows (`sss` node) on WebGPU for grounded characters.
5. **Real anti-aliasing.** TRAA (WebGPU) or SMAA/TAA (WebGL2). Shimmering
   edges on foliage and thin swords look cheap at once.
6. **Bloom only on what glows.** Feed bloom the emissive buffer (MRT
   `emissive` on WebGPU, or a selective bloom layer on WebGL2) instead of the
   whole frame. Whole-frame bloom washes faces and snow out to grey.
7. **Atmosphere and depth.** Height fog that tints toward the sky colour,
   godrays from the sun through trees, a slightly bluer, lower-contrast
   background. Depth makes a small zone feel large.
8. **Colour grade per zone.** A LUT (`lut3D` node / `LUTPass`) or our
   `GradeShader`: warm highlights and cool shadows is the default "cinematic"
   split. Golden-hour village, violet forest and lava rift each get their own.
9. **Materials with variation.** Roughness and colour that vary across a
   surface (texture or vertex noise), never one flat value. Use sheen for
   cloth and plush, clearcoat for vinyl, lacquer and eyes, and anisotropy for
   brushed metal.
10. **Motion quality.** Animation crossfades (0.15–0.25 s), spring-bone
    secondary motion (ears, hair, capes), a camera on a damped spring, hit-stop
    of 50–90 ms on heavy hits, and a steady 60 fps. A frame-time hitch reads
    as low quality more than any missing effect.

## 3. WebGPU pipeline recipe (new games)

The shape every TSL effect in r0.185 follows: render the scene once into
several targets (MRT), then feed those textures to effect nodes and compose
them in `renderPipeline.outputNode`.

```js
import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, velocity, emissive, directionToColor, colorToDirection, sample, vec4 } from 'three/tsl';
import { ssgi } from 'three/addons/tsl/display/SSGINode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

const renderer = new THREE.WebGPURenderer({ antialias: false });
await renderer.init();
renderer.toneMapping = THREE.NeutralToneMapping; // or AgXToneMapping

const scenePass = pass(scene, camera);
scenePass.setMRT(mrt({ output, normal: directionToColor(normalView), velocity, emissive }));
const color = scenePass.getTextureNode('output');
const depth = scenePass.getTextureNode('depth');
const normal = sample((uv) => colorToDirection(scenePass.getTextureNode('normal').sample(uv)));

const gi = ssgi(color, depth, normal, camera);            // .rgb bounce light, .a AO
const lit = vec4(color.rgb.mul(gi.a).add(gi.rgb), color.a);
const glow = bloom(scenePass.getTextureNode('emissive')); // glow only from emissive
const aa = traa(lit.add(glow), depth, scenePass.getTextureNode('velocity'), camera);

const pipeline = new THREE.RenderPipeline(renderer);
pipeline.outputNode = aa;
renderer.setAnimationLoop(() => pipeline.render());
```

Treat this as the starting shape, not tested code. Check it against the
official examples `webgpu_postprocessing_ssgi`, `webgpu_postprocessing_traa`
and `webgpu_postprocessing_ao` for the pinned version before relying on it.

Other nodes in `three/addons/tsl/display/`:

| Node | Use |
| --- | --- |
| `ao` (GTAONode) | Cheaper than SSGI; AO only. Low tier. |
| `ssr` (SSRNode) | Wet stone, ice, polished floors. Needs metalness/roughness in MRT. |
| `sss` (SSSNode) | **Screen-space shadows** (contact shadows), *not* subsurface scattering. |
| `godrays` + `bilateralBlur` + `depthAwareBlend` | Sun shafts through trees, temple windows. |
| `dof` (DepthOfFieldNode) | Character select, dialogue close-ups, photo mode. |
| `lut3D` | Per-zone colour grade. |
| `outline` | Selection and hover outlines; toon ink lines. |
| `fsr1` / `taau` | Render at 0.67–0.75 scale and upscale on weak GPUs. |
| `motionBlur`, `chromaticAberration`, `lensflare`, `film` | Use sparingly: speed boosts, big hits, menus. |

## 4. WebGL2 pipeline recipe (Gloamreach, Lanternwood, Arcademia)

What the three focus games have today: `EffectComposer` → `RenderPass` →
`UnrealBloomPass` → our `GradeShader` → `OutputPass`, ACES tone mapping, PCF
shadows with throttled updates. What to add, in order:

1. **`GTAOPass`** after `RenderPass`, at half resolution, blend ≈ 0.8–1.0.
   Skip it on the low tier.
2. **Tone mapping:** try `AgXToneMapping` against the current ACES on each
   zone. ACES shifts saturated oranges and violets toward yellow and pink,
   which is visible on the lava rift and the violet forest.
3. **Selective bloom:** render emissive objects on a bloom layer, run bloom on
   that alone, and add it back. Raise the threshold to ≥ 0.9 if a full-frame
   bloom stays.
4. **`SMAAPass`** before `OutputPass` (or `TAARenderPass` when the camera is
   still, for menus and character select).
5. **`BokehPass`** only on character-select and dialogue screens.
6. Keep the throttled shadow updates (`power.shadowDue`); they are why these
   games hold their frame rate.

## 5. Quality tiers and budgets

| Tier | Who | Settings |
| --- | --- | --- |
| High | Desktop GPU | DPR ≤ 2, SSGI or GTAO full, TRAA, bloom, godrays, 2048 shadows, SSR where wet |
| Medium | Laptops, iPad | DPR ≤ 1.5, GTAO half-res, SMAA, bloom half-res, 1024 shadows |
| Low | School Chromebooks, phones (most AI Arcademia players) | DPR 1, no AO (bake it into vertex colours or a lightmap instead), FXAA, bloom quarter-res, 512 shadows or a blob shadow under characters |

Pick the tier from a 2-second frame-time probe at start-up, not from the user agent.

**Budgets per frame at 60 fps:** fewer than 300 draw calls (use
`InstancedMesh`/`BatchedMesh` for grass, trees, crowds), fewer than 1.5 M
triangles visible, textures as KTX2, meshes compressed with meshopt, and no
shader compiles during play (warm up with `renderer.compileAsync(scene, camera)`
behind the loading screen).

## 6. Cute doll and toy characters for kids

The user's concept images include a pink bunny on a snowboard: a fun game for
kids with cute doll/toy characters. What makes that look read as "premium
toy", not "cheap cartoon":

**Shape**
- Head as big as the body or bigger (head : body ≈ 1 : 1 to 1 : 1.5), short
  limbs, no visible neck, round hands or mitten paws.
- Eyes large, set **low** on the face and wide apart; one or two bright
  catchlights. The mouth is small, close under the eyes.
- Every silhouette is soft: no sharp corners; bevel everything.

**Materials** (all `MeshPhysicalMaterial`, or the node versions on WebGPU)

| Look | Settings |
| --- | --- |
| Plush / fur | `roughness` 0.9, `sheen` 1, `sheenRoughness` 0.5–0.8, `sheenColor` a lighter tint of the base; add 8–16 fur shells for a fuzzy rim (below) |
| Felt / wool | `roughness` 1, `sheen` 0.6, fibre-noise normal map at low strength (see `knowledge.style-felt-wool`) |
| Vinyl / plastic toy | `roughness` 0.3–0.4, `clearcoat` 0.6–1, `clearcoatRoughness` 0.1 |
| Clay | `roughness` 0.75, a little warm emissive in the shadow side to fake light passing through |
| Eyes | Dark base, `clearcoat` 1, a small emissive white catchlight decal |

**Fur shells:** draw the body mesh N times (8–16), each pushed out along the
normal by `i/N × furLength`, with a noise texture as alpha that thins toward
the tips. Depth test on, depth write off, alpha discarded on the face and paw
pads. Shells are cheap enough for one or two hero characters; use
sheen alone for crowds.

**Light**
- A big soft key light, warm; a cool fill; a **rim light** (or a fresnel
  emissive term in the material) so pastel characters separate from pastel
  backgrounds. Strong AO under the chin, arms and feet sells the "small
  object" scale.
- Pastels need saturation kept up after tone mapping: Neutral tone mapping and
  a grade that lifts saturation 5–10 %.

**Motion**
- Squash on landing (scale y 0.85, xz 1.08 for 80 ms), stretch on jumps,
  wobble on ears and tails through spring bones, idle "breathing" scale 1–2 %.
- Happy reactions everywhere: sparkle bursts, star pickups, a little hop when
  idle too long.

**Ready pieces:** `model.lib.rigged/mesh2motion/human/bunny` (rigged bunny,
234 shared clips), `model.lib.rigged/vrm/rabbit` (CC0 VRM), style profiles
`knowledge.style-toy-miniature`, `knowledge.style-felt-wool`,
`knowledge.style-tilt-shift-diorama`; pixel effects `fx.ice/snowflake-burst`,
`fx.weather/snow`.

## 7. Snow, powder and board trails

- **Slope:** heightfield chunks (e.g. 64 × 64 m, 128² vertices) streamed ahead
  of the player and dropped behind; the course is a spline, and the terrain is
  the spline's cross-section plus noise.
- **Trails that stay:** a top-down orthographic camera follows the player and
  stamps the board's footprint into a float render target. Two targets
  ping-pong so marks persist, and each frame they fill back by a tiny amount.
  The snow material samples it in the vertex shader (displacement) and fragment
  shader (normal and a slightly darker, smoother groove). Shift the target's
  UV origin as the player moves.
- **Snow look:** base near-white, but shadows tinted blue (`#9db8e8`-ish) and
  sun-side faintly warm; high-frequency sparkle as a glint term (a noise
  threshold × specular); fresh powder rougher than packed groove.
- **Powder spray:** particles from the board's edge, count and speed tied to
  carve angle × speed, soft particles (fade near depth) so they don't cut into
  the ground, and a short-lived trailing mist.
- **Physics:** Rapier (see §9) or a simple custom rider: velocity along the
  slope tangent, carving turns friction into steering, air time when the
  ground drops away faster than the rider falls.

## 8. Skill effects that read like a AAA game

The layer stack every polished spell or hit uses (the reference images show it
again and again; see [visual-study.md](visual-study.md)):

1. **Anticipation**: 100–250 ms wind-up glow or gather at the hand/weapon.
2. **Core**: the brightest, smallest shape (white-hot centre, colour at the edges).
3. **Glow**: emissive halo feeding bloom.
4. **Body**: the readable shape (beam, arc, nova, projectile) in the element colour.
5. **Particles**: sparks, embers or shards that outlive the body by 0.3–1 s.
6. **Trail**: a ribbon behind moving parts (`src/effects/RibbonGeometry.js`).
7. **Ground decal**: scorch, frost or crack that fades over 1–3 s
   (`src/effects/GroundDecals.js`, `GroundFissures.js`).
8. **Impact frame**: screen flash (`ScreenFlash.js`) for 1–2 frames, camera
   shake (`CameraShake.js`), 50–90 ms hit-stop, damage numbers.
9. **Light**: a short-lived point light so the effect lights the ground and
   characters (`LightPool.js` keeps their number fixed).

Colour language: one element = one hue family, with a white core. Keep enemy
attacks a different family from player attacks (e.g. enemies red/orange,
player gold/cyan), and give telegraphs (ground circles) a filling edge so
timing is readable.

## 9. Open-source pieces worth using

Already in the repo: three r0.185 with every pass and node above, `lil-gui`.
Add the others only when a game needs them; keep the licence and add a row to
`docs/third-party.md`.

| What | For | Note |
| --- | --- | --- |
| three.js addons (`three/addons/…`) | All the post effects, CSM, GLTF/KTX2/meshopt loaders, `SkeletonUtils` | Installed |
| [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | Fast raycasts, character-vs-level collision, mouse picking on big meshes | MIT |
| [Rapier](https://rapier.rs) (`@dimforge/rapier3d-compat`) | Physics: board riding, ragdolls, props, vehicles | Apache-2.0, WASM |
| [three.quarks](https://github.com/Alchemist0823/three.quarks) | Particle system with an editor, for skill VFX | MIT; WebGL materials (not WebGPU) |
| [glTF-Transform](https://gltf-transform.dev) + meshoptimizer + KTX2 | Shrink and optimise models and textures at build time | MIT |
| [troika-three-text](https://github.com/protectwise/troika) | Crisp SDF text in 3D: damage numbers, name plates | MIT; WebGL |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | WebGL2 alternative to `EffectComposer` that merges effects into fewer passes | zlib |
| [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer) | Path-traced stills for a character-select backdrop, store art, posters | MIT |
| [fur-threejs](https://github.com/piellardj/fur-threejs) | Reference for shell fur | Read and adapt |

## 10. Mistakes that make it look cheap

- Bloom on the whole frame, so faces, snow and UI go grey and soft.
- Pure black shadows: no environment light, no fill.
- One roughness value for a whole model; everything looks like plastic.
- Shimmering edges (no AA) and shadow acne.
- Fog that's grey instead of the sky's colour.
- Too many effects at once: when every hit flashes the screen, none of them read.
- Hitches: shader compiles mid-play, textures uploading on first sight,
  garbage-collection spikes from allocating vectors every frame.
