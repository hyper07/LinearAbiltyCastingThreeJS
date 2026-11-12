# Gamory

A skillshot VFX sandbox — and the game that grew around it — built with **Three.js**, **Vite** and
hand-written **GLSL**. Ten spells, six physical Barbarian skills, 108 weapons from swords to rocket
launchers, helmets, armor, shields and rings, eight classes with their own skill trees, a campaign that runs
from a storybook village to a dragon's dungeon, sunny daytime maps, monsters that walk in and try to
kill you, loot, NPCs, study games for kids, a level editor, **co-op for up to four players** in the
browser, and a chat box you can give orders to in plain English — backed by a local AI model in
[LM Studio](https://lmstudio.ai) or any OpenAI-compatible server. One Node process serves it all
for players: see [Production](docs/production.md).

<p>
  <img src="docs/screenshots/gameplay.gif" width="100%" alt="Gameplay: a Knight in plate armor with a tower shield casts Frost Lance through a pack of monsters in Thistledown, blocks their hits, cuts down a brute, blinks away and leaves loot glowing in rarity colours" />
</p>
<p>
  <img src="docs/screenshots/sunny-battle.jpg" width="49%" alt="Nova Beam blasting an Skeleton Warrior in a sunny pine clearing under a blue sky" />
  <img src="docs/screenshots/loadout.jpg" width="49%" alt="Main menu: the Barbarian holding a war axe in the character preview, its bonuses on the class card, and the Axes &amp; Blunt weapon tab" />
</p>

## Quick start

Requires **Node.js 22.13+** and Git.

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5173>: the platform's home page, every game as a card. The first `npm run dev` also downloads the free 3D asset library
(about 7 GB) in the background; the game is playable straight away. Windows, building, assets and
the AI setup are in **[Setup](docs/setup.md)**.

To run it for players — the game, the party server, the content library and the AI bridge in one
container, PostgreSQL in another — `docker compose up --build` and open <http://localhost:8787>. Details, settings, HTTPS
and what the server protects are in **[Production](docs/production.md)**.

Nothing paid is needed. Optional paid services — picture-to-3D with Tripo3D or Meshy, hosted AI
models — and more free and paid sources for 3D models, animation and effects are listed in
**[Third-party services](docs/third-party.md)**.

## The home page

Gamory opens on its games, like a video site: a card for every game you can play — the official ones
and everything people published — with a cover drawn from its world, who made it and how often it
was played. Search, filter by genre (or **For kids & study**), sort by popular or new, open a game's
page and press **Play** to open its **lobby**: choose your character from the classes that game offers
and customize its body and colours, then **Start** — or invite friends with a code and wait together:
everyone's chosen character stands on the lobby's stage, in the body and colours they picked (and
cheers when they press **Ready**), with a party chat beside it. The host starts once everyone is
ready (in a battle royale, after setting how many AI rivals fill the empty places).

**Every game keeps its own characters, one per class, per player.** What you earn in one game stays
in it; a class you have not played there starts at level 1 with nothing, and switching back brings
your earlier character back. The open arena in **Your hero** keeps its own character too.

<p>
  <img src="docs/screenshots/lobby.jpg" width="100%" alt="A game's lobby: the classes it offers, each new and starting at level 1, the Mage chosen with a skeleton-mage body, colour pickers, Invite friends and Start" />
  <img src="docs/screenshots/lobby-together.jpg" width="100%" alt="A party in the lobby: the host's Mage and the guest's skeleton-bodied Barbarian side by side on the stage, both marked Ready, the players list and the party chat" />
</p>

**＋ Create** makes a new game in the
[Game builder](docs/game-builder.md), and **Publish** puts it on the home page for everyone on the
server. **Your hero** opens the action RPG's own menu (class, weapon, skills, stash, account), and
**Play together** makes or joins a party — press Play in a party and everyone comes along.

<p>
  <img src="docs/screenshots/home.jpg" width="100%" alt="The home page: a search bar, Create, Your hero, Play together and Sign in; genre chips; a Create a game card and cards for Frost Hollow, Thistledown, Ember Ruins, The Wyrm's Graveyard, The Dragon's Keep and Study Grove, each with a drawn cover, a genre badge and a goal" />
</p>

## Battle royale

A mini battle royale, alone against AI rivals or with up to four players in a party: drop in,
grab loot, keep inside the closing storm, and be the last one standing. **Solo**: everyone against
everyone, rivals included. **Squad**: your party together against the rivals. Down is out, and you
see your place. Play **Stormbreak Ruins** or **Saltwind Squads** from the home page, or make your own
in the Game builder. See **[Battle royale](docs/battle-royale.md)**.

<p>
  <img src="docs/screenshots/battle-royale.jpg" width="100%" alt="A battle royale: the violet storm wall closing in, the dashed ring of the next circle, a rival's shot coming in, and the goal bar reading 8 left, Storm closing" />
</p>

## Playing

In **Your hero**, pick a class and press **Start Game** for the open arena, or play any game from the home page.
Spells cost **mana** (the blue bar; the Mana Potion on key 7 gives half back), and cooldowns and the pause
between casts shorten as you level up and rank up your skills —
[Mana, cooldowns and levels](docs/classes-and-skills.md#mana-cooldowns-and-levels). Move with **W A S D**, press **1–9** to arm
a spell or drink a potion, aim with the mouse and **right-click** to cast; **left-click** is your
class's close-range attack. **K** opens your skill tree, **Tab** (or the **Bag** button) the bag.
Full list: **[Controls](docs/controls.md)**.

The **action bar** is nine keys. Your skills start on 1–5 and your health and focus potions on 6 and 7,
each showing how many are left. Drag a key onto another to swap them, or right-click a key (click an
empty one) to choose any learned skill or potion for it. The health potion pulses when health is low,
and **Menu → Auto-drink** drinks one for you below 30%. Loot you walk over goes into the bag, never
onto your character: the **Bag** button counts what is new, and you open the bag to choose what to
wear. A full bag leaves loot on the ground.

The bag is a grid where every item takes its own size, and everything in it moves by drag and drop:
arrange the bag, drag gear onto your character to wear it or back into the bag to take it off, and
drag anything out of the bag to drop it on the ground. A full bag takes nothing more, so make room
first. See **[the bag](docs/items-npcs-portals.md#the-bag-grid-levels-and-the-stash)**.

## Playing together

Up to four people in one world, each from their own browser. In the main menu, **Play together**
makes a party with a five-letter code; friends type it in and join. The host starts (or picks a
campaign level) and the others **Join the host's fight** — straight away or dropping in later.
Everyone plays their own class, weapon and gear, keeps their own bag and levels up on every kill;
the monsters, the waves and the loot on the floor are shared, and **Enter** opens the party chat.
The host's browser runs the fight; the server only keeps the rooms and relays, so it stays small.
See **[Playing together](docs/multiplayer.md)**.

<p>
  <img src="docs/screenshots/coop.jpg" width="49%" alt="Two players in Thistledown: the host casts Frost Lance into a pack of monsters while a Barbarian guest fights beside them; the party list shows both players' health and the chat their messages" />
  <img src="docs/screenshots/party-lobby.jpg" width="49%" alt="The Play together panel: the join code, both members with their classes, and the Start for the party button" />
</p>

## Accounts and fair play

Sign in from the main menu (**Account**) and your character — level, gold, bag, stash, gear — lives
on the game server, with a history of everything that happens to it. Without an account the game
plays on the browser's own save, as before. See **[Accounts and fair play](docs/security.md)**.

<p>
  <img src="docs/screenshots/account.jpg" width="49%" alt="The Account tab: a verified player and their history — a game played, a warning for a broken rule, an item sold, items picked up and a level reached" />
</p>

**How items stay honest.** The browser never sends an item; it can only point at things the server
made.

- **One owner per item.** Every item gets a server-made ID and exactly one place: a character, a
  game's floor, sold, or used up. A pickup is one database update, so two players grabbing the same
  item can't both get it.
- **Every action is re-checked.** The server reruns each move, sale, purchase and reward with the
  same inventory code the browser uses, and refuses any change that adds, removes or pays more than
  that action allows. Every change to gold is written to a ledger.
- **Browser edits don't stick.** After each action the browser and the server compare a fingerprint
  of the character; on a mismatch the browser takes the server's copy.
- **Rewards come from the level file.** Gifts are given once, quest rewards only after the server has
  counted the kills itself, and shop prices are the server's.

**Cheating earns strikes.** Taking another game's loot, waves faster than the clock allows, monsters
the level doesn't have, or more kills than monsters can arrive each earn a strike. Three strikes in
a day block the account: for a day, then a week, then for good.

**Where the keys and hashes are used:**

| What | How |
| --- | --- |
| Passwords | Salted scrypt, checked in constant time; five wrong tries lock the account for 15 minutes |
| Sessions | A random 256-bit token in an HttpOnly, SameSite=Strict cookie; the database keeps only its hash |
| Characters | Encrypted and sealed to their account with AES-256-GCM; a row edited in the database won't open and locks the account for review |
| History | Every event is chained to the one before it with an HMAC, so editing or deleting one breaks the chain |
| IP addresses | Never stored in the clear: a keyed hash and an encrypted copy |
| Party names | Taken from the signed-in account, so nobody can play under someone else's name |

**Running it.** Set `SERVER_SECRET` and back up `data/` together with it: without the key no saved
character opens, so never change it on a server with players. `npm run admin -- audit` checks the
history chain, every character's seal, every item's owner and every gold balance; the same script
shows a player's history and strikes, and blocks or unblocks accounts and addresses
([for the people running the server](docs/security.md#for-the-people-running-the-server)).

**Not covered yet.** The fight itself still runs in the players' browsers, so the server checks that
each kill is possible, not that it was earned. There is no password reset, two-factor sign-in or key
rotation, and one game process holds the parties (the database is PostgreSQL, ready for more)
([the limits](docs/security.md#limits--what-this-does-not-stop-yet)).

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

**The Barbarian fights differently:** no spells, but six physical skills — split the ground, charge,
leap, roar, spin, quake — and a **Rage** bar that melee hits build and big skills spend. Playing
together, Battle Roar buffs every teammate in its circle, with a red aura everyone can see.
[More →](docs/classes-and-skills.md#the-barbarian-physical-skills-and-rage)

<p>
  <img src="docs/screenshots/barbarian-leap.jpg" width="49%" alt="Skybreaker Leap landing among Skeleton Warriors" />
  <img src="docs/screenshots/barbarian-tempest.jpg" width="49%" alt="Iron Tempest spinning through brutes" />
</p>

Each class starts with two skills. **Skill books** teach the rest and raise their ranks (up to 10),
following the class's tree of three branches and three tiers; you choose which learned spells sit
on keys 1–9, beside your potions. See **[Classes and skill trees](docs/classes-and-skills.md)**.

## A look around

**Dungeons and fairy tales** — *The Dragon's Keep*, a torch-lit dungeon hall where the Emberwyrm
sleeps on its gold, and *Thistledown*, a storybook village of cottages and red-spotted toadstools.
[More →](docs/level-editor.md#the-campaign)

<p>
  <img src="docs/screenshots/dragons-keep-boss.jpg" width="49%" alt="Nova Beam against the Emberwyrm in the torch-lit hall of the Dragon's Keep" />
  <img src="docs/screenshots/thistledown-fight.jpg" width="49%" alt="The Mage's Frost Lance erupting among monsters in the sunny village of Thistledown" />
</p>
<p>
  <img src="docs/screenshots/dragons-keep.jpg" width="49%" alt="The Dragon's Keep: carved pillars, banners and the hoard of gold" />
  <img src="docs/screenshots/thistledown.jpg" width="49%" alt="Thistledown: cottages, toadstools and colourful trees under a blue sky" />
</p>

**Sunny maps** — any map set to *Day* gets an open blue sky, clouds and bright sunlight; dawn and
dusk get their own coloured skies. [More →](docs/level-editor.md)

<p>
  <img src="docs/screenshots/study-grove.jpg" width="49%" alt="A sunny green clearing ringed by pine trees under a blue sky with clouds" />
  <img src="docs/screenshots/sunny-battle.jpg" width="49%" alt="Nova Beam in the sunny clearing" />
</p>

**Aiming** — line casts aim with an arrow, far casts with a circle.

<p>
  <img src="docs/screenshots/aim-arrow.jpg" width="49%" alt="The line-cast aim arrow on the ground" />
  <img src="docs/screenshots/aim-circle.jpg" width="49%" alt="The far-cast targeting circle and reach ring" />
</p>

**Classes and skill trees** — eight classes, nine bodies, a tree per class. Hover over a skill to see
what it does, its damage, cooldown and reach now and at the next rank, and what it needs.
[More →](docs/classes-and-skills.md)

<p>
  <img src="docs/screenshots/class-knight.jpg" width="49%" alt="Class picker: the Knight with its bonuses, longsword and plate" />
  <img src="docs/screenshots/class-mage.jpg" width="49%" alt="The Mage class with its staff and bonuses" />
</p>
<p>
  <img src="docs/screenshots/skill-tree.jpg" width="49%" alt="The K panel: the Mage's skill tree with skill symbols, rank rings and a detail panel" />
  <img src="docs/screenshots/skill-tree-menu.jpg" width="49%" alt="The main menu's Skill Tree tab for the Mage" />
</p>

**Monsters** — four kinds that walk in, and the Emberwyrm every fifth wave.
[More →](docs/combat.md)

<p>
  <img src="docs/screenshots/monsters-lineup.jpg" width="49%" alt="The four regular monsters side by side" />
  <img src="docs/screenshots/monster-emberwyrm.jpg" width="49%" alt="The Emberwyrm boss with its wings spread" />
</p>

**Loot, NPCs and portals** — drops by rarity, a bag grid where every item takes its own size, a
bag that grows with your level, a stash shared by every class, merchants, quests, stone portals.
[More →](docs/items-npcs-portals.md)

<p>
  <img src="docs/screenshots/loot.jpg" width="49%" alt="A Knight in plate beside a boss's loot: light beams in rarity colours and floating item names" />
  <img src="docs/screenshots/inventory.jpg" width="49%" alt="The bag grid: every item shown as a picture of its 3D model at its own size" />
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

**Level editor and campaign** — sculpt, scatter, set the rules, write the story. Portals, NPCs,
waiting monsters and spawn points are placed with a click and moved by dragging. Each spawn point can
be limited to certain monsters and waves (only the Emberwyrm through the north gate, a back door
that opens in wave 5). [More →](docs/level-editor.md#spawn-points-fixed-places-random-picks)

<p>
  <img src="docs/screenshots/editor-scatter.jpg" width="49%" alt="Level editor: the scatter tool painting pine trees" />
  <img src="docs/screenshots/story-intro.jpg" width="49%" alt="A level's intro scene: title, speaker, story and goal" />
</p>

**Your own models** — upload a 3D file, or make one from a picture, and wear it.
[More →](docs/custom-models.md)

<p>
  <img src="docs/screenshots/create-tab.jpg" width="49%" alt="The Create tab: the Class forge, uploading a 3D file, or making 3D from a picture" />
  <img src="docs/screenshots/create-wear.jpg" width="49%" alt="An uploaded rigged body worn by the Mage" />
</p>

## Weapons

108 weapons in twelve kinds — swords, axes, polearms, knives, exotic blades, pistols, rifles, bows,
heavy weapons, throwing weapons and more — and each fights like itself: guns fire bullets with
tracers (hold for automatics, X to reload), shotguns spread, snipers pierce, bows and crossbows loose
arrows, rockets and grenades explode, the flamethrower burns a cone, and boomerangs and chakrams come
back. Long-range weapons have a scope: hold **V** to zoom in. Press **I** for the armory. See
**[Weapons](docs/weapons.md)**.

<p>
  <img src="docs/screenshots/weapons-shotgun.jpg" width="49%" alt="A shotgun blast fanning seven pellets into imps" />
  <img src="docs/screenshots/weapons-armory-rifle.jpg" width="49%" alt="The armory's Rifles tab with each weapon's damage, fire rate, range and specials" />
</p>

## Armor and gear

Wear up to eleven pieces: helmet, body armor, gloves, belt, leg armor, boots, cloak, an off-hand
(shield, focus or quiver), an amulet and two rings. Every piece has an **item class** that decides
what it does: **cloth** speeds up spells, **leather** adds speed and critical hits, **mail** adds
armor, health and regeneration, and **plate** adds the most armor and health but slows you down.
Shields block hits but need a free hand. Three or five pieces of one armor class add a set bonus,
and each class is proficient in one armor class (+25%). Helmets, shields, foci, quivers and cloaks
show on your character. See **[Armor and gear](docs/gear.md)**.

<p>
  <img src="docs/screenshots/gear-lineup.jpg" width="100%" alt="The Knight in a great helm and kite shield, the Mage in a silk hood with a crystal focus, the Amazon with a leather cap and quiver, the Barbarian in a chain coif with a spiked shield" />
</p>

## Class forge: AI-designed classes

Describe a class in a sentence — *"a pirate captain who fights with cannon fire and the sea"* — and
the AI designs it: name, story, bonuses and six skills in three branches. Every skill is built on one
of the game's own hand-made effects and re-tinted to its own colour, so it looks and plays like the
rest of the game. Edit anything, save, and it is in the class list. Works offline from keywords
when the AI is not running. See **[Class forge](docs/class-forge.md)**.

<p>
  <img src="docs/screenshots/class-forge.jpg" width="49%" alt="The Class forge editing an AI-designed pirate class" />
  <img src="docs/screenshots/class-forge-cast-2.jpg" width="49%" alt="An AI-designed moon priestess casting a violet ring of ice blades" />
</p>

## Game builder: whole games from a sentence

Type an idea — *"a times-tables adventure for my 8 year old in an enchanted forest"* — and get a
whole game: a genre (wave survival, boss hunt, monster hunt, story quest, dungeon crawl, study
adventure, calm learning), a world (12, from a storybook village to a sci-fi outpost), a map layout,
a hero, monsters, helpers, a story, and chapters that end in a boss. **Quick build** reads your words
with no AI at all. **Build with AI** has the AI pick from the menus in about 120 output tokens, and
**Plus** accounts get a premium model that also writes its own map, stories, lines and questions.
Change any choice, then play at once or publish it to the home page. See **[Game builder](docs/game-builder.md)**
and how the platform grows to many genres in **[Platform architecture](docs/platform-architecture.md)**.
Write *"a dungeon game like Solo Leveling"* or *"something like Fortnite"*: the
**[Inspiration catalog](docs/inspiration.md)** — 75 well-known games, manhwa and manga mapped onto our own
genres, classes, skills and features — starts the game from that work's nearest picks at no token cost,
under our own names.

<p>
  <img src="docs/screenshots/game-builder.jpg" width="100%" alt="The Game builder: an idea, Quick build and Build with AI, and the menus for genre, world, layout, hero, monsters, chapters and a parent's study rewards" />
</p>

## The shared library

Every class, skill, piece of gear, weapon and level, both the game's own (**Official**) and what
players make (**Shared**, or **Draft** until shared), lives in one library with a status badge and a
count of how often it has been used. The Class forge checks it as it designs: under each new skill it
suggests the most similar existing ones, and **Use it** reuses that skill instead of making a
near-copy. Saving shares the class. Browse and search everything from the main menu (**Library**).
PostgreSQL on the game server behind an API (every player on a server shares one library). See
**[The shared library](docs/library.md)**.

<p>
  <img src="docs/screenshots/library.jpg" width="49%" alt="The Library window: skills with Shared and Official badges, one skill's details and its most similar skill" />
  <img src="docs/screenshots/forge-reuse.jpg" width="49%" alt="The Class forge suggesting existing similar skills, with one reused" />
</p>

## For parents: study games

Parents can turn the game into a study game. **Tutor** NPCs ask study questions — generated math
(adding, taking away, times tables) or the parent's own questions — and every right answer earns
gold and, every few answers, a skill book or potion. With the AI on, the tutor gives hints and
explains answers in simple, kid-safe words. **Calm mode** takes the monsters away. The sample
**Study Grove** level is always open in the Campaign. See **[Study games for kids](docs/for-parents.md)**.

<p>
  <img src="docs/screenshots/study-tutor.jpg" width="49%" alt="A tutor asking a question in the sunny Study Grove" />
  <img src="docs/screenshots/editor-tutor.jpg" width="49%" alt="Setting up a tutor's lessons in the level editor" />
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
| [Playing together](docs/multiplayer.md) | Co-op for up to four: parties and codes, what is shared, how the host runs the fight |
| [Production](docs/production.md) | Running it for players: Docker, settings, HTTPS and proxies, limits, scaling, checks |
| [Accounts and fair play](docs/security.md) | Accounts, the server-owned character, anti-duplication, cheat rules and blocks, keys and encryption, the audit |
| [Controls](docs/controls.md) | Every key and mouse action |
| [Spells](docs/spells.md) | The ten spells, with clips, and how the newer ones are built |
| [Classes and skill trees](docs/classes-and-skills.md) | The eight classes, their bonuses and bodies, skill trees and books |
| [Loot, NPCs and portals](docs/items-npcs-portals.md) | Drops, rarities, the bag, merchants, quests, portals |
| [The fight](docs/combat.md) | The arena, the monsters, the Emberwyrm, how damage is timed |
| [The AI commander](docs/ai-commander.md) | Chat that casts, wiring LM Studio or another model |
| [AI-built maps](docs/ai-maps.md) | Maps from a sentence and the 3D asset library |
| [Level editor and campaign](docs/level-editor.md) | Building levels, saving and sharing, the campaign |
| [Your own models](docs/custom-models.md) | Uploading 3D models or making one from a picture |
| [Movement](docs/movement.md) | How the character's gait, lean and arms are animated |
| [Tuning editor and presets](docs/tuning-editor.md) | The **G** editor: 900+ live sliders, presets |
| [Third-party services](docs/third-party.md) | What is free, what is paid, and options for 3D models, animation, AI and effects |
| [Weapons](docs/weapons.md) | All 108 weapons, how each kind fights, ammo and reloading, adding a weapon |
| [Armor and gear](docs/gear.md) | Helmets, armor, shields, boots, rings: item classes, set bonuses, proficiency, the bag |
| [Battle royale](docs/battle-royale.md) | The storm, rivals, solo and squads, players against players, making one, how it works |
| [Game builder](docs/game-builder.md) | Whole games from a sentence or a few picks: genres, worlds, layouts, casts; the spec, tokens, Free and Plus, the command line |
| [Inspiration catalog](docs/inspiration.md) | 75 games, manhwa and manga mapped onto our ids, with links; "a game like X" in the builder; the features we lack, ranked |
| [Platform architecture](docs/platform-architecture.md) | Many genres on one platform: engines and modules, saves per player per game, which database and why |
| [Class forge](docs/class-forge.md) | Describe a class, the AI designs its skills; editing, saving, how it stays balanced |
| [The shared library](docs/library.md) | Official, shared and draft content; reuse and similar-asset suggestions; the API and database |
| [Study games for kids](docs/for-parents.md) | Tutor NPCs, your own questions, the AI tutor, the Study Grove sample |
| [Adaptive monster AI](docs/adaptive-ai.md) | The planned AI LM mode: decision trees for each monster and the boss, and training |
| [Architecture](docs/architecture.md) | Project layout, how the systems fit together, performance, known rough edges |

## Licence

Code is provided as-is for the purposes of this project. The bundled HDR probe and the character
FBX retain their original licences.
