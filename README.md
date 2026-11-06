# Elemental Arena

A skillshot VFX sandbox — and the game that grew around it — built with **Three.js**, **Vite** and
hand-written **GLSL**. Ten spells, eight classes with their own skill trees, a procedurally generated
ruined keep, monsters that walk in and try to kill you, loot, NPCs, a level editor, and a chat box
you can give orders to in plain English — backed by a local AI model in [LM Studio](https://lmstudio.ai)
or any OpenAI-compatible server.

<p>
  <img src="docs/screenshots/hud.jpg" width="49%" alt="Nova Beam mid-burn, with the HUD's ability bar, live stats and contact card" />
  <img src="docs/screenshots/loadout.jpg" width="49%" alt="Main menu with character preview and weapon list" />
</p>

## Quick start

Requires **Node.js 22.12+** (or 20.19+) and Git.

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5173>. The first `npm run dev` also downloads the free 3D asset library
(about 7 GB) in the background; the game is playable straight away. Windows, building, assets and
the AI setup are in **[Setup](docs/setup.md)**.

Nothing paid is needed. Optional paid services — picture-to-3D with Tripo3D or Meshy, hosted AI
models — and more free and paid sources for 3D models, animation and effects are listed in
**[Third-party services](docs/third-party.md)**.

## Playing

Pick a class in the main menu and press **Start Game**. Move with **W A S D**, press **1–5** to arm
a spell, aim with the mouse and **right-click** to cast; **left-click** is your class's close-range
attack. **K** opens your skill tree, **Tab** the bag. Full list: **[Controls](docs/controls.md)**.

## Spells

<p>
  <img src="docs/spells/ice.gif" width="49%" alt="Frost Lance: ice crystals erupting along the cast line" />
  <img src="docs/spells/thunder.gif" width="49%" alt="Storm Lance: lightning striking down the line" />
</p>
<p><b>Frost Lance</b> &nbsp;·&nbsp; <b>Storm Lance</b></p>

<p>
  <img src="docs/spells/meteor.gif" width="49%" alt="Cinder Fall: the burning rock arcs in and detonates" />
  <img src="docs/spells/beam.gif" width="49%" alt="Nova Beam: the charge in the hands, then the column of light" />
</p>
<p><b>Cinder Fall</b> &nbsp;·&nbsp; <b>Nova Beam</b></p>

<p>
  <img src="docs/spells/snare.gif" width="49%" alt="Voltaic Snare: the violet ring roots everything inside" />
  <img src="docs/spells/glacier.gif" width="49%" alt="Glacial Crown: a ring of ice blades around the frozen disc" />
</p>
<p><b>Voltaic Snare</b> &nbsp;·&nbsp; <b>Glacial Crown</b></p>

<p>
  <img src="docs/spells/chain.gif" width="49%" alt="Arc Chain: a gold bolt leaping from monster to monster" />
  <img src="docs/spells/orb.gif" width="49%" alt="Void Orb: the orb drifting through monsters, zapping them" />
</p>
<p><b>Arc Chain</b> &nbsp;·&nbsp; <b>Void Orb</b></p>

<p>
  <img src="docs/spells/hail.gif" width="49%" alt="Hailstorm: a cloud dropping hail on the circle" />
  <img src="docs/spells/blink.gif" width="49%" alt="Blink Strike: the caster jumps through a group of monsters" />
</p>
<p><b>Hailstorm</b> &nbsp;·&nbsp; <b>Blink Strike</b></p>

| Spell | Kind | In one line |
| --- | --- | --- |
| Frost Lance | Line | A field of ice crystals tears up along the line and chills what it hits |
| Storm Lance | Line | A bundle of lightning strikes down the line and stuns |
| Cinder Fall | Line | A burning rock arcs in, detonates and cracks the floor open |
| Nova Beam | Line | A charged column of light that holds and burns |
| Voltaic Snare | Far cast | A violet ring that roots everything inside it |
| Glacial Crown | Far cast | A ring of ice blades that freezes the circle |
| Arc Chain | Line | Lightning that leaps from monster to monster |
| Void Orb | Line | A slow orb that zaps what it passes, then bursts |
| Hailstorm | Far cast | Four seconds of hail over the circle |
| Blink Strike | Line | Teleport down the line, cutting through everything on the way |

Every spell has a clip and a full description in **[Spells](docs/spells.md)**.

Each class starts with two spells. **Skill books** teach the rest and raise their ranks (up to 10),
following the class's tree of three branches and three tiers; you choose which five learned spells
sit on keys 1–5. See **[Classes and skill trees](docs/classes-and-skills.md)**.

## A look around

**Aiming** — line casts aim with an arrow, far casts with a circle.

<p>
  <img src="docs/screenshots/aim-arrow.jpg" width="49%" alt="The line-cast aim arrow on the ground" />
  <img src="docs/screenshots/aim-circle.jpg" width="49%" alt="The far-cast targeting circle and reach ring" />
</p>

**Classes and skill trees** — eight classes, nine bodies, a tree per class.
[More →](docs/classes-and-skills.md)

<p>
  <img src="docs/screenshots/class-knight.jpg" width="49%" alt="Class picker: the Knight with its bonuses, longsword and plate" />
  <img src="docs/screenshots/class-mage.jpg" width="49%" alt="The Mage class with its staff and bonuses" />
</p>
<p>
  <img src="docs/screenshots/skill-tree.jpg" width="49%" alt="The K panel in a run: the Knight's five keys and three branches" />
  <img src="docs/screenshots/skill-tree-menu.jpg" width="49%" alt="The main menu's Skill Tree tab for the Mage" />
</p>

**Monsters** — four kinds that walk in, and the Emberwyrm every fifth wave.
[More →](docs/combat.md)

<p>
  <img src="docs/screenshots/monsters-lineup.jpg" width="49%" alt="The four regular monsters side by side" />
  <img src="docs/screenshots/monster-emberwyrm.jpg" width="49%" alt="The Emberwyrm boss with its wings spread" />
</p>

**Loot, NPCs and portals** — drops by rarity, merchants, quests, stone portals.
[More →](docs/items-npcs-portals.md)

<p>
  <img src="docs/screenshots/loot.jpg" width="49%" alt="Loot from a boss: light beams in rarity colours and floating item names" />
  <img src="docs/screenshots/inventory.jpg" width="49%" alt="The bag: weapon in hand, bonuses, spell ranks and 24 slots" />
</p>
<p>
  <img src="docs/screenshots/npc-dialogue.jpg" width="49%" alt="Talking to the Old Warden: a gift, an AI-written answer and a quest" />
  <img src="docs/screenshots/portal-gateway.jpg" width="49%" alt="A stone-gateway portal with violet runes" />
</p>

**AI-built maps** — type a sentence, get a map from the free asset library.
[More →](docs/ai-maps.md)

<p>
  <img src="docs/screenshots/ai-map-graveyard.jpg" width="49%" alt="Haunted graveyard in fog, with monsters closing in" />
  <img src="docs/screenshots/ai-map-forest.jpg" width="49%" alt="Pine forest at dawn: Nova Beam firing between the trees" />
</p>

**Level editor and campaign** — sculpt, scatter, set the rules, write the story.
[More →](docs/level-editor.md)

<p>
  <img src="docs/screenshots/editor-scatter.jpg" width="49%" alt="Level editor: the scatter tool painting pine trees" />
  <img src="docs/screenshots/story-intro.jpg" width="49%" alt="A level's intro scene: title, speaker, story and goal" />
</p>

**Your own models** — upload a 3D file, or make one from a picture, and wear it.
[More →](docs/custom-models.md)

<p>
  <img src="docs/screenshots/create-tab.jpg" width="49%" alt="The Create tab: upload a 3D file or make 3D from a picture" />
  <img src="docs/screenshots/create-wear.jpg" width="49%" alt="An uploaded rigged body worn by the Mage" />
</p>

## Coming next: AI LM mode

A hard mode where the monsters learn how you play — your dodges, your cooldowns, how you aim — and
pick the attack most likely to land. A small **LM model**, trained on games played in this arena,
walks a decision tree for each monster and for the Emberwyrm boss; the game turns its answers into
movement. Planned, not built yet: the decision trees are in **[Adaptive monster AI](docs/adaptive-ai.md)**.

```mermaid
flowchart LR
  A["Game describes the moment"] --> B["LM model walks the<br/>monster's decision tree"]
  B --> C["Tactic: rush, flank,<br/>lead the shot, cut off…"]
  C --> D["Game code moves<br/>and attacks"]
  D --> A
```

## Documentation

| Page | What is in it |
| --- | --- |
| [Setup](docs/setup.md) | Install, Windows, build, Docker, assets and character models |
| [Controls](docs/controls.md) | Every key and mouse action |
| [Spells](docs/spells.md) | The ten spells, with clips, and how the newer ones are built |
| [Classes and skill trees](docs/classes-and-skills.md) | The eight classes, their bonuses and bodies, skill trees and books |
| [Loot, NPCs and portals](docs/items-npcs-portals.md) | Drops, rarities, the bag, merchants, quests, portals |
| [The fight](docs/combat.md) | The arena, the monsters, the Emberwyrm, how damage is timed |
| [The AI commander](docs/ai-commander.md) | Chat that casts, wiring LM Studio or another model, Docker |
| [AI-built maps](docs/ai-maps.md) | Maps from a sentence and the 3D asset library |
| [Level editor and campaign](docs/level-editor.md) | Building levels, saving and sharing, the campaign |
| [Your own models](docs/custom-models.md) | Uploading 3D models or making one from a picture |
| [Movement](docs/movement.md) | How the character's gait, lean and arms are animated |
| [Tuning editor and presets](docs/tuning-editor.md) | The **G** editor: 900+ live sliders, presets |
| [Third-party services](docs/third-party.md) | What is free, what is paid, and options for 3D models, animation, AI and effects |
| [Adaptive monster AI](docs/adaptive-ai.md) | The planned AI LM mode: decision trees for each monster and the boss, and training |
| [Architecture](docs/architecture.md) | Project layout, how the systems fit together, performance, known rough edges |

## Licence

Code is provided as-is for the purposes of this project. The bundled HDR probe and the character
FBX retain their original licences.
