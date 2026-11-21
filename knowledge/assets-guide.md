# Assets guide: characters, creatures, and how to get better ones

What ready-made 3D bodies the library holds, which to pick for each kind of game,
how to load and animate them with our three.js (r0.185), and how to make new
ones. Find a model with `npm run kb -- <words> --models`; it shows each model's
clips and licence. The loading code is in `src/library/characters.js`.

## 1. What we have

Everything below is downloaded into `library/` by `npm run dev` / `npm run build`
on a fresh clone (or `npm run library:fetch -- --sources rigged`). The `rigged`
source is pinned to fixed commits, so every clone gets the same files. It holds
111 assets and is about 79 MB. Each folder keeps its upstream licence file, and
`library/CREDITS.md` lists every pack.

| Set | Where | What | Clips | Licence |
| --- | --- | --- | --- | --- |
| **KayKit Adventurers 1.0** (Barbarian, Knight, Mage, Rogue, Rogue Hooded) | `library/kaykit/KayKit-Character-Pack-Adventures-1.0/…/Characters/gltf/` | Chibi fantasy heroes, about 6k triangles | 76 each (sword, bow, spells, block, hit, die, sit, cheer…) | CC0 |
| **KayKit Skeletons 1.0** (Mage, Minion, Rogue, Warrior) | `library/kaykit/KayKit-Character-Pack-Skeletons-1.0/…` | Matching chibi enemies | 70+ | CC0 |
| **Mesh2Motion human rig** | `library/rigged/mesh2motion/human/` | 29 bodies on one Unreal-mannequin skeleton: base male (Quaternius), Sophia (anime girl), Sintel, Jay, Bunny, mannequin, zombie (Kenney), 22 PSX low-poly people and monsters | **234 shared clips**: walks, runs, idles, talk, greet, clap, sit-write, farm, mine, sword, bow, spell, swim, climb, die… | CC0, except Sophia (CC BY-SA 4.0) and Jay, Sintel and Bunny (CC BY 4.0, Blender Studio) |
| **Mesh2Motion animals and beasts** | `library/rigged/mesh2motion/{fox,horse,bird,dragon,kaiju,shark,snake,spider}/` | Fox, dog, panda, cat (CC BY, David Revoy), horse, eagle, seagull, dragon, lizard kaiju, T-Rex, shark, whale, snake, spider | Fox rig 21 (sit, sleep, fetch, play-bow, howl, bite, swim…), horse 14 (trot, run, rear, kick, eat), dragon 12 (fly, fire breath, roar), kaiju 10, spider 11, snake 8, bird 9, shark 7 | CC0 |
| **Mesh2Motion props** | `library/rigged/mesh2motion/props/` | 21 swords, axes, bows, shields, staffs, wand, spear, shovel, sickle | — | CC0 |
| **Gobkit animals** | `library/rigged/gobkit/` | Chunky, big-eyed corgi, duck, red panda, hippo, rhino, platypus, bat, jellyfish, anglerfish, shark, 300–500 triangles each | idle, attack, dead, walk (one baked track; `model.segments` gives the frame ranges) | CC0 |
| **Gobkit minions** | `library/rigged/gobkit/minion-*.glb` | 8 one-eyed blob enemies | idle, attack, dead | CC0 |
| **100Avatars VRM** (Teddy, Astronaut, DinoKid, Polybot, Witch, Muscary, Mushy, Froggy, Cappy, Carrot, Snowy, Rabbit, Avocado, Robert) | `library/rigged/vrm/*.vrm` | Hand-painted avatars by Polygonal Mind, 2–5k triangles; **Mixamo bone names**; blink and A/E/I/O/U mouth shapes | none in the file; retarget any (see §3.5) | CC0 |
| **three.js examples** | `library/extras/` and `library/rigged/threejs/` | RobotExpressive (cute robot with face morphs), Soldier, Michelle, Ready Player Me man, X Bot; morph-animated Parrot, Flamingo, Stork, Horse | Robot 14, X Bot 7 (with additive poses), Soldier 4, birds and horse 1 each | Robot: CC0. Soldier, Michelle, X Bot: Mixamo (use in games, don't redistribute standalone). Birds and horse: Apache-2.0 (ro.me) |
| **Kenney** | `library/rigged/kenney/` | Mini-arena soldier (32 clips), platformer character, flying drone; blocky and cute | 32 / 4 / 0 | CC0 |
| **Khronos Fox** | `library/rigged/khronos/Fox.glb` | Low-poly fox | Survey, Walk, Run | CC0 model, CC BY 4.0 rig and animation (credit tomkranis) |
| **HDRIs** | `library/rigged/hdri/*.hdr` | Studio (studio small 08, brown photostudio 02), sky, meadow, sunrise, night, at 1k | — | CC0, Poly Haven |

The library already had 2,400 other models (Poly Haven, KayKit kits, Polygonal
Mind, polyfork). Polygonal Mind's MomusPark deer, pig, mountain lion and owl, and
the 54 `xyz` creatures, are rigged but have no clips.

## 2. Best pick for each use

These picks come from contact sheets rendered under studio light. To make them
again, run `node sheet/run.mjs` from the session scratchpad; the sheets show each
body with a clip playing.

| Use | Pick now | Why | Upgrade (inbox, §4) |
| --- | --- | --- | --- |
| **Arcademia buddies** | Mesh2Motion **panda, fox, dog** (sit, sleep, fetch, play-bow, jump, howl), Gobkit **corgi, red panda, duck** (big eyes, tiny file), **RobotExpressive** (waves, thumbs up, face morphs) | Real animals that sit, fetch and sleep read as friends; Gobkit's eyes are the cutest in the set | Quaternius *Cute Animated Monsters*; an SDF-sculpted house style (§5.3) |
| **Arcademia teachers** | 100Avatars **Teddy, Astronaut, Witch, DinoKid, Polybot** with Mesh2Motion clips retargeted on (Greeting, Idle_Talking, Sitting Writing, Clapping, Head Nod) plus VRM blink and mouth shapes for speech | Hand-painted, friendly, already on Mixamo bones; retarget tested (sheet `retarget.png`) | Quaternius *Universal Base Characters* + *UAL* |
| **RPG heroes** | **KayKit Adventurers** (76 clips each, swappable weapons); more motions through `retargetClip(…, BONE_MAPS.kaykit)` | Best-looking stylised humans in the library | KayKit *Adventurers 2.0* (8 heroes) |
| **RPG villagers** | Mesh2Motion **base male, Sophia, mannequin** with 234 clips (farm-harvest, chop-wood, hammering, sitting-talking, walk-carry). For the KayKit look, KayKit bodies with retargeted clips | The clip list covers village life | Quaternius *Ultimate Modular Men/Women* + *Modular Outfits – Fantasy* |
| **RPG animals** | Mesh2Motion **horse, fox, dog**, **eagle, seagull**; three.js **Parrot, Flamingo, Stork** for birds overhead | Clean, textured, many clips | Quaternius *Ultimate Animated Animals* (deer, stag, wolf, bull, cow, alpaca, husky…). There is no good animated **bear or deer** yet: MomusPark Deer is rigged but has no clips |
| **RPG drake** | Mesh2Motion **dragon** (fly flap/glide, fire breath, roar, attack, land) | The only animated dragon | Quaternius *Ultimate Monsters* (dragon, demon…) |
| **Monster-hunt beasts** | Mesh2Motion **T-Rex, lizard kaiju, spider, snake, shark**; **PSX monsters** for human-sized foes | Attack, roar, tail-attack, hit and death clips | Quaternius *Ultimate Monsters*, *Animated Dinosaurs* |
| **Monster-hunt mount** | Mesh2Motion **horse** (idle, walk, trot, run, rear, kick, turn); seat the rider at the spine with the human `Mount_Idle` clip | Its rig has turn clips for steering | — |
| **Befriendable creatures** | **Gobkit animals**, Mesh2Motion **panda and cat**, **Gobkit minions** as wild ones to tame | Cute and cheap (300–500 triangles), so dozens fit on screen | Quaternius *Cute Animated Monsters*; SDF chibis (§5.3) |
| **Top-down cartoon heroes** | **Kenney mini-arena soldier** (32 clips), **Kenney platformer character**, KayKit adventurers | Big readable heads and silhouettes from above | Kenney *Mini Characters* |

The VRM avatars, Gobkit animals and KayKit chibis can sit in one game. The PSX
people and Sintel or Jay are a different, realistic style, so keep each game to
one style.

## 3. Loading and animating (three r0.185)

### 3.1 Load

```js
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { characterLoader, rigClips, segmentClips, retargetClip, BONE_MAPS, vrmExpressions, setExpression } from '../library/characters.js';

const loader = characterLoader();            // GLTFLoader + MeshoptDecoder
const gltf = await loader.loadAsync(catalog.url(model.file));
```

- **Mesh2Motion files are meshopt-compressed.** A plain `new GLTFLoader()`
  throws "setMeshoptDecoder must be called". Use `characterLoader()`, or call
  `loader.setMeshoptDecoder(MeshoptDecoder)` from
  `three/addons/libs/meshopt_decoder.module.js`. The catalog marks such models
  with `requires: ['EXT_meshopt_compression']`.
- **Many units from one file:** load once, then `SkeletonUtils.clone(gltf.scene)`
  for each unit. A plain `.clone()` shares one skeleton between all the copies.
- **Facing:** most bodies face +Z. VRM 0.x avatars face −Z, so turn them
  (`holder.rotation.y = Math.PI`).
- **Scale:** sizes differ (Gobkit animals are about 400 units tall, Khronos Fox
  about 80, the rest about 1–2 m). Scale to the height you want from `model.size`
  or `new THREE.Box3().setFromObject(body)`.
- Skinned meshes need `frustumCulled = false`, or a bounding box computed in a
  wide pose, so they don't vanish at the screen edge in an animated pose.

### 3.2 Clips in the file (KayKit, three.js, Kenney, Khronos)

```js
const mixer = new THREE.AnimationMixer(body);
const idle = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'Idle')).play();
// each frame: mixer.update(dt)
// switch smoothly: walk.reset().play(); idle.crossFadeTo(walk, 0.25, true);
```

### 3.3 Clips as separate files (Mesh2Motion)

Every body on a rig shares the clips listed in `catalog.rigs[model.rig].clips`.
Each clip is a small GLB holding only the skeleton and the animation.

```js
const clips = await rigClips(loader, catalog, model, ['Idle_A', 'Walk', 'Run']);
mixer.clipAction(clips.Walk).play();   // binds by bone name, so it works on every body of that rig
```

Clip names: `npm run kb -- --show model.lib.rigged/mesh2motion/human/base`, or
read `catalog.rigs['mesh2motion-human']`. Clips whose names end in `RM` move the
root; the others play in place.

### 3.4 One baked track (Gobkit)

```js
const named = segmentClips(gltf.animations[0], model.segments);   // { idle, attack, dead, walk } at 24 fps
mixer.clipAction(named.walk).play();
const dead = mixer.clipAction(named.dead); dead.setLoop(THREE.LoopOnce); dead.clampWhenFinished = true;
```

### 3.5 Retargeting: any of the 234 human clips onto any humanoid

`three/addons/utils/SkeletonUtils.retargetClip` expects the two rest poses to
match. Ours don't: Mesh2Motion stands in an A-pose and the VRMs in a T-pose, and
KayKit has chibi proportions. `retargetClip` in `src/library/characters.js` first
turns each target bone to point where the source bone points at rest, then copies
the source's motion from rest in world space. The hips' movement is scaled by leg
length. Bake each clip once and reuse it:

```js
const src = (await loader.loadAsync(catalog.url('rigged/mesh2motion/human/variations/base.glb'))).scene;
const greet = (await rigClips(loader, catalog, { rig: 'mesh2motion-human' }, ['Greeting'])).Greeting;
const holder = new THREE.Group(); holder.rotation.y = Math.PI; holder.add(teddy);   // VRM 0.x faces −Z
const clip = retargetClip(teddy, src, greet, BONE_MAPS.mixamo);
new THREE.AnimationMixer(teddy).clipAction(clip).play();
```

- `BONE_MAPS.mixamo` covers X Bot, Soldier, Michelle, the 100Avatars VRMs, and
  Tripo or Meshy humanoids. `BONE_MAPS.kaykit` covers KayKit. Write a new map for
  another skeleton: target bone name → Mesh2Motion name, hips first.
- Quaternius' Universal Animation Library uses the same Unreal-mannequin names as
  Mesh2Motion, so its clips need no extra mapping.
- **Tested:** retargeting onto the VRMs and X Bot looks right. On KayKit chibis it
  works but is rougher, because of their short arms and the weapons in their hands;
  their own 76 clips come first. See `retarget.png` and the unit test
  `tests/unit/rigged-characters.test.mjs`.

### 3.6 VRM faces without three-vrm

```js
const faces = vrmExpressions(gltf);              // { blink, a, i, u, e, o, joy, … }
setExpression(faces, 'blink', 1);                // blink: 0 → 1 → 0 over 0.15 s every few seconds
setExpression(faces, 'a', 0.5 + 0.5 * Math.sin(t * 18));   // talking
```

The VRMs render as plain glTF. Their MToon materials fall back to standard
ones, which look good. For MToon shading, spring-bone hair and look-at,
[pixiv/three-vrm](https://github.com/pixiv/three-vrm) (MIT) adds them. It is not
vendored; vendor its `lib/three-vrm.module.js` with the LICENSE beside it if a
game needs it.

### 3.7 Light characters well

```js
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';      // RGBELoader is deprecated in r0.185
const hdr = await new HDRLoader().loadAsync('library/rigged/hdri/studio_small_08_1k.hdr');
scene.environment = new THREE.PMREMGenerator(renderer).fromEquirectangular(hdr).texture;
scene.environmentIntensity = 0.55;
renderer.toneMapping = THREE.AgXToneMapping;
```

Then add a warm key light with soft shadows (`PCFSoftShadowMap`, `shadow.radius
≈ 4`), a cool rim light from behind, and a `ShadowMaterial` disc under each
character. The contact sheets use exactly this.

## 4. Packs to drop in by hand (`library/inbox/`)

These sites block scripts, so download each pack in a browser and drop the zip
into `library/inbox/`. `npm run library:fetch -- --sources inbox` unzips and
indexes it. Pick the **glTF** download, and keep `quaternius`, `kaykit` or
`kenney` in the zip name so the CC0 licence is recorded.

| Pack | Page | Why |
| --- | --- | --- |
| Quaternius Universal Animation Library (120+ clips) | https://quaternius.com/packs/universalanimationlibrary.html | Same bone names as Mesh2Motion |
| Quaternius Universal Animation Library 2 | https://quaternius.com/packs/universalanimationlibrary2.html | More clips |
| Quaternius Universal Base Characters | https://quaternius.com/packs/universalbasecharacters.html | Villagers and teachers on the UAL rig |
| Quaternius Ultimate Animated Animals | https://quaternius.com/packs/ultimateanimatedanimals.html | Deer, stag, wolf, horse, bull and more, animated |
| Quaternius Cute Animated Monsters | https://quaternius.com/packs/cutemonsters.html | Befriendable creatures, buddies |
| Quaternius Ultimate Monsters | https://quaternius.com/packs/ultimatemonsters.html | Monster-hunt beasts, dragon |
| Quaternius Animated Dinosaurs | https://quaternius.com/packs/animateddinosaurs.html | Big beasts and mounts |
| Quaternius Farm Animals | https://quaternius.com/packs/farmanimal.html | Village animals |
| Quaternius Modular Men, Women, Outfits – Fantasy | https://quaternius.com/packs/ultimatemodularcharacters.html, https://quaternius.com/packs/ultimatemodularwomen.html, https://quaternius.com/packs/modularcharacteroutfitsfantasy.html | Varied villagers |
| KayKit Adventurers 2.0 (free tier) | https://kaylousberg.itch.io/kaykit-adventurers | 8 heroes; we have 1.0 (5) from GitHub |
| Kenney Mini Characters | https://kenney.nl/assets/mini-characters | Top-down cartoon heroes and townsfolk |

## 5. Making new models

### 5.1 Cloud image- or text-to-3D (rigged)

Our server already calls Tripo and Meshy (`server/modelgen.mjs`); it needs
`TRIPO_API_KEY` or `MESHY_API_KEY`. Prices checked in Nov 2026:

| Service | To start | Per rigged, animated character | Rigs | Output licence |
| --- | --- | --- | --- | --- |
| **Meshy** | API needs a paid plan: Pro $20/mo for 1,000 credits (Premium $40/3,000, Ultra $100/8,000) | Textured image-to-3D 30 credits, auto-rig 5 (includes walk and run), each extra clip 3: **about $0.90 on Pro** | Textured humanoids and four-legged animals | Paid plans: you own it. Free plan: CC BY 4.0 and no API |
| **Tripo** | Pay as you go, $0.01 per credit | Image-to-3D 20–30, rig 25, each retargeted clip 10; Tripo's "game-ready character" comes to **about $1.65** | Biped, **quadruped, avian, serpentine, aquatic, hexapod, octopod** | Paid: commercial use. Free-tier terms are unclear |
| Hyper3D Rodin | API on Business, $120/mo; or about $0.40 per model through fal.ai | — | No rigging | Paid plans |
| Stability SF3D / SPAR3D API | $0.10 / $0.04 per model | — | No rigging | Fast, low-detail props |
| Mixamo | Free (Adobe ID) | $0 | **Humanoids only**; FBX, which needs converting to GLB | Use in games, don't resell the raw assets |

Today `modelgen.mjs` asks Tripo only for a `biped` rig. For creatures, run Tripo's
`rig-check` and use the `rig_type` it suggests (for example `quadruped`). That
makes it the best paid route for beasts and mounts. Meshy is the cheapest for
humanoids and four-legged animals.

### 5.2 Open-source models on this Mac (M5 Max, 128 GB)

| Model | Runs on Apple silicon? | Licence | Verdict |
| --- | --- | --- | --- |
| **TRELLIS.2** (Microsoft, 4B) | Yes, through the community port [trellis-mac](https://github.com/shivampkumar/trellis-mac) (MPS; Metal rasteriser in place of nvdiffrast). **Installed here, see §5.2.1** | Code and weights MIT. Needs Meta's **DINOv3** (DINOv3 License: commercial use allowed, show "Built with DINOv3"; gated on Hugging Face). The port's default remover RMBG-2.0 is CC BY-NC, so we use **BiRefNet (MIT)** instead | **Best local option**: textured PBR GLBs, free per model |
| Stable Fast 3D / SPAR3D (Stability) | Official experimental MPS (`PYTORCH_ENABLE_MPS_FALLBACK=1`). About 6–10 GB, seconds per model | Stability Community License: free only under $1M a year in revenue, "Powered by Stability AI" credit; weights gated (click-through) | Not installed: lower detail, and the revenue cap |
| TRELLIS.2 on MLX ([mlx-spatial](https://github.com/appautomaton/mlx-spatial), MIT) | Yes, no torch; about 2.5 min and 3.5 GB at 8-bit | Its ready bundle re-hosts DINOv3 and RMBG-2.0 (non-commercial) outside their official repos | Watch it; not used |
| Hunyuan3D-2 / 2.1 (Tencent) | Shape on MPS; texturing through a Mac port at low settings | **Its licence does not cover South Korea, the EU or the UK.** Don't use it here | Avoid |
| TripoSR, TripoSG, InstantMesh, Step1X-3D, Direct3D-S2, Hi3DGen, PartCrafter | CUDA only, or no Mac path | MIT / Apache | Not practical on this Mac |
| Auto-rigging (UniRig, Puppeteer, Make-It-Animatable) | CUDA only | MIT / Apache | Rig in the cloud, Mixamo, or **Mesh2Motion** instead |

**Free rigging:** [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app)
(MIT app, CC0 rigs and clips) rigs a static mesh in the browser. Fit its
skeleton to the mesh and it paints the skin weights. It has human, fox, bird,
dragon, horse, kaiju, spider, snake and shark rigs, and the result plays all of
that rig's clips. A free local pipeline is TRELLIS.2 for the mesh, then Mesh2Motion
for the rig and clips, then `characters.js` in the game.

### 5.2.1 The local generator here: TRELLIS.2 with `npm run modelgen:setup`

One command installs it (idempotent, re-run it to repair), about 18 GB, all under
`library/tools/trellis-mac/` (git-ignored): pinned checkouts of trellis-mac,
TRELLIS.2 and the Metal backends, a Python 3.11 venv (uv) with torch 2.11 (2.12+
needs C++20 and breaks the Metal extensions; versions in
`scripts/modelgen/constraints.txt`), and the weights in `hf-cache/`. Dev and
build never run it.

```bash
hf auth login                      # once
# once, in a browser: accept the DINOv3 licence (Meta reviews it)
#   https://huggingface.co/facebook/dinov3-vitl16-pretrain-lvd1689m
npm run modelgen:setup             # install / repair; prints what's missing
npm run modelgen:setup -- --check  # report only
npm run modelgen:local -- picture.png --name "Treasure chest"            # → library/my-models
npm run modelgen:local -- hero.png --name Witch --kind character --json  # JSON for scripts / agents
```

- **In the game:** Model Studio uses it automatically when no `TRIPO_API_KEY` /
  `MESHY_API_KEY` is set (or force it with `MODELGEN_PROVIDER=local`; opt out with
  `MODELGEN_PROVIDER=none`). Jobs run one at a time (`state: 'queued'` while
  waiting, and a lock file stops the dev server and the CLI running two at once).
  Each child process has a 30-minute timeout.
- **Pictures:** a PNG with a transparent background is used as is; anything else
  is cut out with BiRefNet. One object, front or three-quarter view, centred, with
  limbs apart from the body. T- or A-pose for characters you'll rig.
- **Knobs** (env): `MODELGEN_LOCAL_PIPELINE` `512` (default) | `1024` |
  `1024_cascade`; `MODELGEN_LOCAL_TEXTURE` `512` | `1024` | `2048`;
  `MODELGEN_LOCAL_FACES` (default 100000); `MODELGEN_LOCAL_TIMEOUT_MIN` (30);
  `MODELGEN_LOCAL_KEEP_LOADED` (`1` by default with 64 GB of RAM or more: faster,
  more memory).
- **Credits:** every model it makes gets `generator` and `credit` in
  `my-models/index.json` ("Generated with TRELLIS.2 (MIT, …) … Built with
  DINOv3 …"); show `credit` in the game's credits. Install credits are in
  `library/CREDITS.md`.
- **Output:** one static mesh with baked PBR textures (base colour, metallic,
  roughness), centred in a unit cube, Y up. No skeleton, so `kind: 'character'`
  still saves it as a map object until it's rigged.
- **Rigging it for free:** open https://app.mesh2motion.org, load the GLB, pick
  the Human rig (or fox, bird, dragon, horse, spider, snake, shark, kaiju), fit the
  skeleton, let it paint the weights, and export a GLB with the clips you want.
  Upload that in Model Studio as a character. Its skeleton is the Mesh2Motion one
  our 234 human clips are made for, so `rigClips(..., { rig: 'mesh2motion-human' })`
  plays them without retargeting (§3.5). Works best on T/A-pose bodies with clear
  gaps between arms and torso; chunky chibis rig fine with the fox or human rig.
- **Measured on the M5 Max (Nov 2026):** loading the pipeline takes about 100 s
  per job (each job is a fresh process). A stress run with a random stand-in for
  DINOv3, which fills the whole voxel grid (20M raw triangles, the worst case),
  took 14 min and peaked at 84 GB; the Metal bake down to 100k triangles took
  17 s. Real objects fill far less of the grid, and trellis-mac reports about
  18 GB and 3–5 min on an M4 Pro. Fill in real numbers once DINOv3 is in.
- **Runner:** `scripts/modelgen/trellis_run.py` (spawned by
  `server/modelgen-local.mjs`) reports JSON progress lines and runs offline
  (`HF_HUB_OFFLINE=1`): setup does all the downloading.

**What it is good at (first real runs, Nov 2026, M5 Max):**

| Input | Result | Time |
|---|---|---|
| A shaded 3D render of a prop (treasure chest) | Clean, solid model with the right shape and colours | 4–4½ min |
| A shaded 3D render of a figure in T-pose | Right shape and pose; colours partly lost on thin limbs | 2 min |
| A flat cartoon drawing with a bold ink outline (chibi fox) | **Fails**: a flat card with the picture on it, even with a clean cut-out | 2–3½ min |

- Feed it pictures with real shading and depth (3D renders, photos, painted concept art with form). Flat cartoon art with outlines reads as a 2D picture and comes back as a card.
- Cut the background out first when it is not plain white (a transparent PNG skips background removal).
- Base colour is baked in linear light; `trellis_run.py` encodes it to sRGB before export (without that, models came out dark with skewed hues).
- For cute toon creatures, sculpt them with SDFs (5.3) instead.

### 5.3 Sculpting cute creatures in the browser with SDFs

A proof is in the session scratchpad (`sheet/fox.html`, render `assets/sdf-fox.png`).
It builds a chibi fox from 14 signed-distance shapes, joined with a smooth union
(`smin`, blend radius 0.06–0.14). It samples them on a 110³ grid and polygonises
the grid with `three/addons/objects/MarchingCubes.js`, writing `mc.field[]` =
−distance, `isolation = 0`, then `mergeVertices` + `computeVertexNormals`. That
takes 0.5 s in the browser and gives 29k triangles. On top:

- **Colour by region:** each vertex takes the colour of the nearest part. Small
  "paint-only" shapes (ear tips, paws, nose) win near their surface.
- **Toon shading:** `MeshToonMaterial` with a 3-step `gradientMap`, plus a
  Fresnel rim added in `onBeforeCompile`.
- **Inverted-hull outline:** the same geometry with a `BackSide` `ShaderMaterial`
  that pushes vertices out along the normal (0.012).
- **Eyes:** separate glossy spheres (`MeshPhysicalMaterial` with clearcoat),
  flattened, with two white highlights parented to each eye, and a blush decal.

To make it a game asset:

1. Decimate to about 3–5k triangles, or sample at 64³.
2. Give it a 6–10 bone skeleton.
3. **Auto-skin.** Each vertex's weights are the inverse distances to the bone
   capsules (the same capsules the SDF used), keeping the two nearest bones.
   Because the shapes are known, the weights come out clean.
4. **Expressions.** Make blink and smile morph targets by re-polygonising with the
   eyelid and mouth shapes moved. The vertex counts differ, so instead deform the
   one mesh by an SDF difference, or animate the eye meshes' scale for blinks.
5. Every species is a recipe (a list of parts), so a creature-befriending game
   can mix ears, tails and colours into hundreds of variants with one consistent
   house style.

### 5.4 Recommendation

1. **Now, free:** use the bodies in §2. For the stylised games, KayKit, the VRM
   avatars, Gobkit and the Mesh2Motion animals cover most needs. Retarget the 234
   Mesh2Motion clips onto humanoids.
2. **Next, free:** drop the Quaternius packs (§4) into the inbox. That fills in the
   missing deer, wolf, bear-like monsters and cute monsters.
3. **Unique heroes and bosses:** add a Meshy key (Pro, $20/mo, about $0.90 per
   rigged humanoid) for humans and four-legged animals. Use Tripo pay-as-you-go
   for winged, serpentine and many-legged creatures. Both are wired into
   `modelgen.mjs` already. Allow quadruped rigs there.
4. **Local and free per model:** TRELLIS.2 through trellis-mac on the M5 Max,
   with BiRefNet in place of RMBG-2.0 (`npm run modelgen:setup`, §5.2.1), then
   Mesh2Motion for the rig.
5. **A house style for cute creatures:** the SDF sculpting route above, built
   into a small creature maker.

### 5.5 Voices on this Mac: Qwen3-TTS with `npm run voice:setup`

Not models, but installed the same way: `npm run voice:setup` puts
[Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) (Apache-2.0 code and weights,
not gated, pinned commit and revisions) and Whisper large-v3-turbo (MIT, to
check each take) under `library/tools/qwen3-tts/` (git-ignored, about 11 GB) in
their own Python 3.12 venv (uv; no gradio, no system ffmpeg: PyAV encodes
WebM/Opus). `npm run voice:gen` makes AI Arcademia's character voices; see
`docs/arcademia.md` → Generated voices. Run it in float32 on MPS: bfloat16 and
float16 make the model miss its end of speech. Voices are designed from written
descriptions (VoiceDesign), never cloned from a real, identifiable person.

## 6. Credits owed

CC0 needs no credit, but list the packs in the game's credits anyway. These need
a credit line where they are shown:

- Khronos **Fox**: rig and animation by tomkranis (CC BY 4.0).
- Mesh2Motion **Sophia**: Tysan Tan (CC BY-SA 4.0; changes to the model must
  stay CC BY-SA).
- **Jay, Sintel, Bunny**: Blender Studio (CC BY 4.0).
- **Carrot the cat**: David Revoy (CC BY 4.0).
- **Parrot, Flamingo, Stork, Horse**: mirada / ro.me (Apache-2.0).
- **Soldier, Michelle, X Bot**: Mixamo terms; ship them inside the game only.
- **Generated voices** (§5.5): "Character voices generated with Qwen3-TTS
  (Apache-2.0, https://github.com/QwenLM/Qwen3-TTS)", in the game's Credits panel.
- **Models from the local generator** (§5.2.1): show each one's `credit` from
  `my-models/index.json`. It names TRELLIS.2 (MIT) and must keep
  "Built with DINOv3" (the DINOv3 License asks for it). Tripo and Meshy models get
  a `credit` line with the service's website too.
