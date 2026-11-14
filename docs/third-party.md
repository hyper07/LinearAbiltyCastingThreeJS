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
| [Car Concept](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept) by Eric Chadwick (Darmstadt Graphics Group) for the Khronos Group | The cars of Gangnam Drift — racing, yours, parked and in traffic, in many paints | Free, CC BY 4.0 (credited on screen); the licence leaves out the Khronos logos, so the game hides the emblem and draws its own number plates | Downloaded automatically |
| Michelle (made with Mixamo) and a Ready Player Me avatar, from the [three.js examples](https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf) | Mina and Jun, the people you walk as in Seoul, and the people on its pavements | Free to use in a game; fetched into the library, never committed here | Downloaded automatically |
| Soldier from the [three.js examples](https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf) (made with [Mixamo](https://www.mixamo.com)) | Breachline's players: an animated soldier (idle, walk, run) | Free to use in a game under Mixamo's terms; fetched into the library at a fixed three.js release, never committed here | Downloaded automatically |
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
