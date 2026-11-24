# Third-party services and assets

[← Back to the README](../README.md)

The game runs with **nothing paid**. Everything here is optional: some services are already wired
in and only need a key in `.env`, and the rest are options that could be added later.

Keys always stay on the dev server (or the Docker bridge) and are never sent to the browser.
Prices and plans change often, so check each provider's site before you buy.

## What the game uses today

| Service | Used for | Cost | How to turn it on |
| --- | --- | --- | --- |
| [LM Studio](https://lmstudio.ai) (or any OpenAI-compatible server) | The chat commander, NPC conversations, AI-built maps | Free, runs on your own computer | `LLM_PLATFORM_BASE_URL`, `LLM_MODEL1` — see [The AI commander](ai-commander.md#wiring-the-model) |
| [Tripo3D](https://developers.tripo3d.ai) | Picture → 3D model, auto-rigging and animation for characters | **Paid** per model: about $0.30 for an object, about $0.85 for a rigged character with three animations | `TRIPO_API_KEY` — see [Your own models](custom-models.md) |
| [Meshy](https://docs.meshy.ai) | Picture → 3D model, rigging | **Paid**, prepaid API credits: about 30 credits for an object, 45 for a character | `MESHY_API_KEY` |
| [KayKit](https://github.com/KayKit-Game-Assets) | The class characters and their animations; about 900 map models | Free (CC0) | Downloaded automatically |
| [Polygonal Mind](https://opensource3dassets.com) | About 1,000 map models, including 60 rigged creatures | Free (CC0) | Downloaded automatically |
| [Poly Haven](https://polyhaven.com/models) | About 520 photoscanned rocks, trees, plants and buildings; Breachline's barrels, gas bottles, cement sacks, roller doors, pipes and lamps | Free (CC0) | Downloaded automatically |
| [ambientCG](https://ambientcg.com) | Ground materials for terrain; Breachline's brick, concrete, asphalt, planks and corrugated steel | Free (CC0) | Downloaded automatically |
| [Car Concept](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept) by Eric Chadwick (Darmstadt Graphics Group) for the Khronos Group | The cars of Gangnam Jarani — racing, yours, parked and in traffic, in many paints | Free, CC BY 4.0 (credited on screen); the licence leaves out the Khronos logos, so the game hides the emblem and draws its own number plates | Downloaded automatically |
| [Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html) and [Ultimate Modular Women](https://quaternius.com/packs/ultimatemodularwomen.html) by Quaternius | The six riders of Gangnam Jarani's bike race: posed on our own bikes and painted over in the game (`src/city/riderbake.js`), from `library/inbox/` (never committed) | CC0 |
| [Delivery Moped](https://polyfork.dev/asset/delivery-moped-1aa2ce) from [polyfork](https://polyfork.dev) | Gangnam Jarani's delivery scooters in traffic (`src/city/traffic.js`), fetched into `library/polyfork/` | CC BY 4.0 (credited on screen) |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) small streets | Gangnam Jarani's alleys and lanes round the bike courses (`scripts/geo/seoul-alleys.mjs` → `alleys.bin`, never committed) | ODbL, © OpenStreetMap contributors (credited on screen) |
| ambientCG [Bricks105](https://ambientcg.com/view?id=Bricks105), [Concrete034](https://ambientcg.com/view?id=Concrete034) | Gangnam Jarani's near walls: brick, tile and render | CC0 |
| Michelle (made with Mixamo) and a Ready Player Me avatar, from the [three.js examples](https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf) | Mina and Jun, the people you walk as in Seoul, and the people on its pavements | Free to use in a game; fetched into the library, never committed here | Downloaded automatically |
| Soldier from the [three.js examples](https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf) (made with [Mixamo](https://www.mixamo.com)) | Breachline's players: an animated soldier (idle, walk, run) | Free to use in a game under Mixamo's terms; fetched into the library at a fixed three.js release, never committed here | Downloaded automatically |
| Robot Expressive from the [three.js examples](https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf/RobotExpressive), by Tomás Laulhé (Quaternius), modified by Don McCurdy | Grave Purge's Paragon: a war robot (repainted, with our own shoulder cannons and team band) | CC0 1.0 | Downloaded automatically |
| [Kenney](https://kenney.nl), [Quaternius](https://quaternius.com) | More stylised packs | Free (CC0) | Download by hand into `library/inbox/` — they block automated downloads |
| [Mixamo](https://www.mixamo.com) | Rigging any humanoid mesh so the game's animations drive it | Free (Adobe account) | Rig on the site, download FBX, upload in **Create** |

## Options for 3D objects and characters

These are not wired in yet. A new picture-to-3D provider slots in beside Tripo and Meshy on the
dev server (the same `MODELGEN_PROVIDER` switch); a marketplace pack goes through
`library/inbox/` like Kenney.

| Option | What it gives | Cost |
| --- | --- | --- |
| [Hyper3D Rodin](https://hyper3d.ai) | High-detail image/text → 3D generation through an API | Paid, per generation |
| [Stability AI — Stable Fast 3D](https://stability.ai) | Fast single-image → 3D, through an API or open weights | Paid API; free to run the open model yourself (check its licence) |
| [Hunyuan3D](https://github.com/Tencent-Hunyuan) (Tencent), [TRELLIS](https://github.com/microsoft/TRELLIS) (Microsoft) | Open-source image → 3D you run on your own GPU | Free, needs a strong GPU |
| Meshy **text → 3D** | Describe an object in words instead of uploading a picture (Meshy is already wired for pictures) | Paid credits |
| [Synty Studios](https://syntystore.com) | Large, consistent low-poly packs (fantasy, dungeon, town) | Paid packs, game-use licence |
| [Fab](https://www.fab.com) (Epic, includes the old Sketchfab store), [CGTrader](https://www.cgtrader.com), [TurboSquid](https://www.turbosquid.com) | Marketplaces with free and paid models | Per model; read each model's licence |
| [itch.io](https://itch.io/game-assets) | Indie asset packs, many CC0 | Free to cheap |

## Options for animation and rigging

| Option | What it gives | Cost |
| --- | --- | --- |
| [AccuRIG](https://actorcore.reallusion.com/accurig) (Reallusion) | Auto-rigging that also handles fingers and odd proportions | Free |
| [Rokoko Video](https://www.rokoko.com), [DeepMotion](https://www.deepmotion.com) | Animation from an ordinary video of a person (new cast and attack moves) | Free tiers, paid for more |
| [Cascadeur](https://cascadeur.com) | Physics-assisted keyframe animation | Free tier, paid for commercial use |

## Options for AI (language models)

The commander, NPCs and map designer talk to **any OpenAI-compatible server**, so a hosted model
can replace LM Studio by changing `LLM_PLATFORM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL1`. Only
LM Studio has been tested; a hosted provider may need small changes if it handles JSON-only
answers differently.

| Option | Why | Cost |
| --- | --- | --- |
| [OpenRouter](https://openrouter.ai) | One key for many models — a larger model writes better class names in the [Class forge](class-forge.md) | Paid per token |
| [Groq](https://groq.com) | Very fast answers, good for orders in a fight | Paid per token, free tier |
| [Anthropic Claude](https://docs.anthropic.com) | Strong NPC dialogue and map planning (OpenAI-compatible endpoint) | Paid per token |
| [ElevenLabs](https://elevenlabs.io) | Spoken NPC voices from their text | Paid, free tier |
| LM model (planned) | Monster decisions for the planned hard mode — see [Adaptive monster AI](adaptive-ai.md) | Our own fine-tuned model |

## Options for spell effects

| Option | What it gives | Cost |
| --- | --- | --- |
| [three.quarks](https://github.com/Alchemist0823/three.quarks) | A full particle-system library for Three.js, with an online editor | Free (MIT) |
| [Kenney Particle Pack](https://kenney.nl/assets/particle-pack) | Sprite textures for smoke, sparks, flames and magic | Free (CC0) |

The ten spells use the game's own particles and shaders (see [Spells](spells.md)); these would
add more textures and an editor for new spells.

## Collected code and assets (the knowledge base)

Kept in `vendor/` with each licence beside it, and searched with `npm run kb` — see
[The knowledge base](knowledge-base.md).

| From | What we keep | Licence |
| --- | --- | --- |
| [pixelfx](https://github.com/patch-gg/pixelfx) | 244 pixel-art effects and their drawing core (not its font) | MIT |
| [3dviz-pro-max](https://github.com/viettranx/3dviz-pro-max) | 223 scene recipes, 440 knowledge records, 22 3D kits, rigs. AI Arcademia's creatures (and, through Arcademia's SDF sculptor, Kithvale's six species) start from its biped and quadruped walker kits, its terrace layout from the village layout kit and the fantasy-village-diorama recipe | MIT |
| [diorama](https://github.com/sloemo01/diorama) | Pixel-art and toon shader passes, procedural people, guides | MIT |
| [last-stand](https://github.com/VictorZakharov/last-stand) | Reference code: flow-field navigation, cloth, crowds, light pool, trails, sound guide | MIT |
| [polyfork](https://polyfork.dev) | 3,422 low-poly models, fetched on demand into `library/polyfork/` (never committed); credits written to `library/polyfork/CREDITS.md`. Gloamreach's heroes, villagers, animals, armsmonger and monsters (40 models, fetched with the library's extras: among them Wolf, Thorn-Backed Boar, Tarantula, Star-Barked Tree Golem, Pit-Eyed Fungus Host, Root colossus, Ember-Cracked Troll, Red fire dragon and Dwarf knight) are named one by one, with links, in its Credits panel (`src/gloamreach/credits.js`). Its weapons, armour, shields and their textures are modelled in code (`src/gloamreach/gearModels.js`, `gearMaterials.js`), not taken from anyone. Wyldhunt's hunters and companions (Human warrior, Silver-Crested Order Knight, Dryad hunter, Orc hunter, Dwarf knight) and its velvetbucks (Deer) are named in its Credits panel (`src/wyldhunt/credits.js`). Kithvale's three looks (Kite kid, Halfling hunter, Village child) and the people of Lanternrest (Ashigaru Foot Soldier, Crossing Keeper, Porter, Townswoman, Merchant, Shopkeeper, Waving Child, Village gardener, Daimyo Lord, Farmer, Buddhist Monk, Male Villager) are named in its Credits panel (`src/kithvale/credits.js`) | CC BY 4.0 — credit the authors where the models are shown |
| [Quaternius](https://quaternius.com): [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html), [Modular Character Outfits – Fantasy](https://quaternius.com/packs/modularcharacteroutfitsfantasy.html) (both the free Standard editions), [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html), Ultimate Modular Men and Women | Downloaded by hand into `library/inbox/` and indexed by `npm run library:fetch -- --sources inbox` (never committed). Gloamreach's heroes and all its villagers are put together from them (`src/gloamreach/folk.js`, `folkModels.js`): a base body's head, a hairstyle, an outfit and the animation library's walks, runs, idles, talking and sitting; without the packs they are polyfork's. Credited in Gloamreach's Credits panel | CC0 1.0 |
| [Homescape](https://github.com/muratozturkdev/homescape) | Rendering and simulation ideas for interiors, weather, people, pets and street life, studied, not copied — written in our own words in `knowledge/homescape-study.md` | — |
| [red-horizon](https://github.com/islamdiaa/red-horizon), [three.ws](https://github.com/nirholas/three.ws), [estella](https://github.com/esengine/estella) | Techniques only, written in our own words — no code copied | GPL-3.0 / Apache-2.0 / Apache-2.0 |
| [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app), [Gobkit](https://github.com/Ariescar/gobkit-free-assets), [Kenney starter kits](https://github.com/KenneyNL), [Khronos Fox](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox), [three.js example models](https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf), [100Avatars](https://opensourceavatars.com), [Poly Haven HDRIs](https://polyhaven.com/hdris) | Rigged, animated characters and creatures (234 shared human clips), VRM avatars and HDRIs, fetched into `library/rigged/` (never committed), each with its licence file; see `knowledge/assets-guide.md`. Gloamreach retargets the human clips onto its heroes and humanoid monsters for every fight (sword combos, shield bash and block, bow draws, spells, rolls, hits, deaths, ground pounds). Kithvale borrows the human clips for its adventurer's jump, sprint, creep, throw, kneel and pick-up and its villagers' work. Wyldhunt rebuilds the horse as its Shagmane mount (fur shells, tack), the T-Rex as the Gnarlhorn (horns, plates, ruff, tail club) and the spider as its thornskitters, and borrows the human clips for greatblade swings, bow draws, riding, gathering, carving and drinking | CC0, except as noted per model in `library/CREDITS.md`: Khronos Fox rig, Jay, Sintel, Bunny and Carrot the cat (CC BY 4.0), Sophia (CC BY-SA 4.0), ro.me birds and horse (Apache-2.0), X Bot (Mixamo) |
| [TRELLIS.2](https://github.com/microsoft/TRELLIS.2) via [trellis-mac](https://github.com/shivampkumar/trellis-mac), with [DINOv3](https://huggingface.co/facebook/dinov3-vitl16-pretrain-lvd1689m) and [BiRefNet](https://github.com/ZhengPeng7/BiRefNet) | Free local picture-to-3D on Apple silicon (`npm run modelgen:setup`, `npm run modelgen:local`), installed into `library/tools/trellis-mac/` (never committed); each generated model stores a `credit` line in `my-models/index.json`; parts listed in `library/CREDITS.md` | MIT (TRELLIS.2 code and weights, trellis-mac, BiRefNet, Metal backends); DINOv3 License — show "Built with DINOv3" |

### Kindlewatch

| What | Used for | Licence |
| --- | --- | --- |
| [three.js](https://threejs.org) | The WebGL renderer and the bloom pass under Kindlewatch's lit, painted 2D picture | MIT |
| [Nunito](https://fonts.google.com/specimen/Nunito) via [Fontsource](https://fontsource.org/fonts/nunito) (`@fontsource-variable/nunito`) | The menus, HUD and painted damage numbers | SIL Open Font License 1.1 (font), MIT (package) |

Every sprite, texture, effect and sound in Kindlewatch is made in code for it (`src/kindlewatch/art/`,
`paint.js`, `audio.js`); its colour ramps come from the platform's own pixel-art kit (`src/pixel/art.js`).
No pixelfx effects or library models are used. Its Credits panel reads `src/kindlewatch/credits.js`.

### Snowpuff Peaks

| What | Used for | Licence |
| --- | --- | --- |
| [three.js](https://threejs.org) | WebGPURenderer, TSL node materials, the render pipeline and its GTAO, TRAA, SMAA, FXAA and bloom nodes, the glTF and HDR loaders, RoomEnvironment | MIT |
| [polyfork](https://polyfork.dev) | The props on the mountains, each named with its page in the Credits panel: Snow-Laden Spruce, Young Pine, Front-Yard Fir Tree, Lift Pylon, Chairlift Chair, Gondola Cabin, Ski Lift Base Station, Lift Top Station, Alpine Chalet, Alpine Hay Barn, Mountain Refuge Hut, Race Start Hut, Snowman, Hay Bale, Snow Fence Run, Boulder Field Cluster, Rock Outcrop, Snow-Capped Log Pile, Dock Lantern Post, Snow Cannon, Bunting Run, Big Wrapped Present, and on the famous mountains Stone Lantern, Tiered Pagoda, Basalt Field Wall Run, Giraffe and Elephant (`src/snowpuff/assets.js`; fetched into `library/polyfork/`, never committed) | CC BY 4.0 |
| [Poly Haven HDRIs](https://polyhaven.com/hdris) | Image-based light: Kloofendal 48d Partly Cloudy (Pure Sky) at noon, Spruit Sunrise at sunset (from `library/rigged/hdri/`) | CC0 1.0 |
| [Nunito](https://fonts.google.com/specimen/Nunito) via [Fontsource](https://fontsource.org/fonts/nunito) | The menus and HUD | SIL Open Font License 1.1 (font), MIT (package) |
| ACE-Step 1.5 (see the soundtrack above) | The music: Paper Kites, Sunlit Meadow, Lantern Valley, Violet Hollow and the stingers | MIT |

The plush riders are original characters sculpted in code with the platform's own sculptor
(`src/arcademia/world/creatures/sculpt.js`); the snow, trails, kickers, fences, flags, poles, gates,
arches, sky, aurora, effects and every sound are made in code for the game (`src/snowpuff/`). Its
Credits panel reads `src/snowpuff/credits.js`.

### AI Arcademia

| What | Used for | Licence |
| --- | --- | --- |
| [Nunito](https://fonts.google.com/specimen/Nunito) via [Fontsource](https://fontsource.org/fonts/nunito) (`@fontsource-variable/nunito`) | AI Arcademia's round, friendly type (Korean, Japanese and Chinese fall back to the device's own fonts) | SIL Open Font License 1.1 (font), MIT (package) |
| [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) (Alibaba Qwen team): [Qwen3-TTS-12Hz-1.7B-VoiceDesign](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign) and [Qwen3-TTS-12Hz-1.7B-Base](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base), run on this Mac (`npm run voice:setup`, installed into `library/tools/qwen3-tts/`, never committed) | Generated the characters' voices in `public/audio/voice-gen/` (`npm run voice:gen`), each designed from a written description (no real person's voice cloned), in English, Korean, Spanish, Japanese and Chinese. Each line's credit is in `public/audio/voice-gen/manifest.json`; players see "Character voices generated with Qwen3-TTS (Apache-2.0)" with the link under **Voices** in the Credits panel. A person's recording always replaces a generated line | Apache-2.0 (code and weights); not gated, no restriction on the use of the output or by territory |
| [Whisper large-v3-turbo](https://huggingface.co/openai/whisper-large-v3-turbo) (OpenAI), local, in the same venv | Listens to every generated take to check its words against the script (it is not shipped) | MIT |
| [fugashi](https://github.com/polm/fugashi) with [unidic-lite](https://github.com/polm/unidic-lite) (UniDic 2.1.2), local, in the same venv | Reads Japanese into kana so a take is checked on pronunciation, not kana-or-kanji spelling (not shipped) | MIT; UniDic under its BSD licence |

AI Arcademia shows its credits (three.js, the 3dviz kits, Nunito, the music and the voices) in its
Credits panel, from `src/arcademia/credits.js`.

### Circuit Lab

Circuit Lab is its own app in `apps/circuitlab/` (licence and `NOTICE` beside it).

| What | Used for | Licence |
| --- | --- | --- |
| [ohmlet](https://github.com/JENW1N/ohmlet) | The base app: 3D breadboards and parts, wire routing, the three render modes, the MNA circuit solver, behavioural chips, the validator and its tests | MIT |
| [OpenCircuit 3D](https://github.com/gabrieleviolait/opencircuit) | Ported into ohmlet's chip bridge: the avr8js board runner, the fast Arduino runtime, the in-browser compile flow, the LCD / OLED / NeoPixel / servo / sensor helpers, the lesson presets | MIT |
| [avr8js](https://github.com/wokwi/avr8js) (Wokwi) | The ATmega328P emulator for the Uno and Nano in Compiled mode (bundled from npm) | MIT |
| [@horang-corp/avr-gcc-wasm](https://github.com/horang-corp/avr-gcc-wasm) 0.2.0 | AVR-GCC + binutils as WebAssembly with the Arduino core, Servo, Wire, DHT and Adafruit SSD1306 objects: compiles a sketch to HEX in the student's browser. Loaded from the jsDelivr CDN only when someone compiles, never copied into the repo | GPL-3.0 toolchain; the Arduino core and libraries under their own licences (LGPL-2.1 / MIT / BSD) — see the package's `THIRD_PARTY_NOTICES.md` |
| [three-gpu-pathtracer](https://github.com/gkjohnson/three-gpu-pathtracer), [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | The path-traced Studio render mode (with its own pinned three 0.170 inside the lab's bundle) | MIT |
| [React](https://react.dev), [zustand](https://github.com/pmndrs/zustand) | The lab's interface | MIT |
| [Studio Small 03](https://polyhaven.com/a/studio_small_03) (Poly Haven) | Studio lighting for the Enhanced and Studio modes | CC0 |
| [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch) via [Fontsource](https://fontsource.org/fonts/chakra-petch) (`@fontsource/chakra-petch`) | The lab's interface type and the labels printed on parts and boards | SIL Open Font License 1.1 (font), MIT (package) |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) via [Fontsource](https://fontsource.org/fonts/jetbrains-mono) (`@fontsource/jetbrains-mono`) | Values, pin names, code and the scope grid | SIL Open Font License 1.1 (font), MIT (package) |
| [DSEG7 Classic](https://github.com/keshikan/DSEG) (`dseg` on npm) | Seven-segment LCD digits on the multimeters and the function generator | SIL Open Font License 1.1 |
| [ngspice](https://ngspice.sourceforge.io) / `@o.z/ngspice-wasm` | Not used yet: OpenCircuit loads it from a CDN for an optional SPICE check; planned the same way | BSD-3-Clause (ngspice); package terms apply |

The boards and parts are modelled in code (`apps/circuitlab/src/three/meshes/boards.ts`, `modules.ts`);
the 5×7 display font is the classic public-domain dot-matrix table. Players see all of this in the lab's
Credits panel (`apps/circuitlab/src/ui/lab/credits.ts`).

### Shared music

| What | Used for | Licence |
| --- | --- | --- |
| [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) (ACE Studio and StepFun), with its [XL SFT](https://huggingface.co/ACE-Step/acestep-v15-xl-sft) model, run on this Mac (`npm run music:setup`, installed into `library/tools/ace-step/`, never committed) | Generated every track in `public/audio/bgm/` (battle, boss, meadow, night forest, village, lantern valley, jungle explore and hunt, frozen fortress, playful, city night, title, and four stingers), played by `src/shared/music.js`; see `docs/music.md`. Each track's credit is in `public/audio/bgm/manifest.json`; players see it in a "♪ title · Music: ACE-Step 1.5 (MIT)" toast and in each game's Credits panel (`musicCredits()`): "Music generated with ACE-Step 1.5 (MIT, https://github.com/ace-step/ACE-Step-1.5)" | MIT (code and weights); its model card says the output may be used commercially |
