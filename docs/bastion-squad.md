# Bastion Squad

Co-op against the risen dead, in two operations (the menu's tabs; Play opens Grave Purge):

- **Grave Purge** — the "raise your squad" style of co-op custom maps: each player commands their
  own soldiers, earns ore from every kill, and raises them up a ladder of ranks to take back a
  whole land. [Below](#grave-purge).
- **Hold the Outpost** — the "special forces" style: a small squad, a soldier each, holds a
  position against wave after wave.

Both are our own games: the setting, maps, soldiers, enemies, numbers and words are all original.

## Grave Purge

**The Gravefield**, 256 metres square. Four commanders start in a camp in its north-west corner
with four Recruits each. Four broken rings of ridges cut the land into bands that get harder the
further out they are (tier 1 to 4); each ring has gaps to pass. Everywhere are the dead's
buildings and camps of guards asleep until soldiers come near — 112 buildings and 344 guards.

- **Ore**: every kill pays its killer's commander; buildings pay more; a supply drop every minute
  pays everyone (more as the game goes on). Give ore to a teammate with **G**.
- **The barracks** sells Recruits (150 ore; **R**, **Shift+R** for five). 24 soldiers at most.
- **The Forge** — on the camp's left side, ringed with blue crystals and named on the ground — is
  where soldiers are raised, the way the classic maps' combining spot works: walk a soldier into its
  ring (select, **W**) and it is raised to the next rank by itself as soon as you have the ore and
  relics, one rank a visit (walk it out and back in for the next). The Forge panel (**F**) shows what
  each rank needs, raises by hand, and turns raising-by-itself off. A raised soldier keeps its place
  in your selection and groups.
  | Rank | From | Ore | Relics |
  | --- | --- | --- | --- |
  | Recruit | the barracks | 150 | |
  | Veteran | a Recruit | 1,200 | |
  | Vanguard (one each) | a Veteran | 3,500 | |
  | Phantom (one each) | a Vanguard + 2 Veterans | 9,000 | 4 |
  | Paragon (one each) | a Phantom | 22,000 | 10 |

- **Each rank looks its own**: Recruits in khaki, Veterans in green, Vanguards in steel blue,
  Phantoms in black with a violet glow — and the Paragon is a gold war robot with shoulder cannons
  (Robot Expressive, CC0). Your team's colour is the ring at their feet (and the arm bands).
- **Relics** come from breaking shrines, soul nodes and relic caches; every commander gets them.
- **The armoury** (**U**): Weapons (+8% damage a level, to 30) and Plating (+1 armour, to 20), for
  all your soldiers.
- **The dead's buildings**: Bone Spires shoot; Crypts and Ossuaries raise guards while soldiers are
  about; Barrows just stand; Relic Caches pay ore and a relic.
- **The wards**: six Shrines of Bones — each one broken makes every Veteran and above stronger
  (more reach, health, damage) — and six Soul Nodes, each guarded by a named guardian (the Marrow
  Knight, the Ash Witch, the Pale Hound, the Hollow Bishop, the Cinder Lich, the Rotfather).
- **The Heart of the Grave**, in its sanctum in the far south-east, is sealed until all twelve
  wards are broken. Break it and **the Grave King** rises from it; kill him to win.
- **Healing**: soldiers heal slowly anywhere in the camp and fast on the **healing pad** in its middle
  (green crosses rise while they heal); **E** sends the selected there.
- **Stragglers**: every half a minute a few of the weakest dead wander into the camp from its near
  edges (more and tougher as time goes on, a dozen at most) — easy kills, half as much ore again as
  usual, for whoever is home. The camp's guns leave them to the soldiers for twelve seconds.
- **Waves**: every few minutes a numbered wave comes for the camp from the crypt nearest it, bigger
  each time (and bigger the more you have broken); the camp's two guns help, and soldiers in the camp
  heal. And the dead answer: whenever a crypt, ossuary, shrine or soul node falls, the crypts nearest
  it send a wave to where it fell (then on to the camp) — the map shows where they come from.
- **The clock**: Casual 90 minutes, Hard 75, Hell 60 (the dead tougher too). **Heroes only** mode
  sells Veterans at the barracks instead of Recruits and gives 3,000 ore to start. The host can run
  the game at ×1, ×1.5, ×2 or ×3.
- **Bots** take the empty seats: they buy, raise at the Forge, upgrade, and take their armies out
  together to the nearest thing they can beat, home to heal when hurt. Four bots alone win Casual in
  about half an hour and Hard in about fifty minutes; Hell needs you.

**2D, the realistic way**: the 2D view is drawn like the classic 2D strategy games — its sprites are
our own 3D models (the soldier for each rank, each kind of the dead, the crypts, shrines, camp, graves
and trees) rendered once while the menu shows (about a second; `sprites.js`), from a three-quarter
view with the sun in the north-west, five ways round plus mirrors, with run, walk and strike frames.
The land is painted from photo textures (ambientCG) — grass near the camp, dirt, dark earth, ash —
with rock cliffs along the ridges, and a purple blight veins the ground round every building of the
dead. Bones, blood and rubble stay where things fell (`flatReal.js`).

**2D or 3D**: Grave Purge comes drawn two ways — the menu's tabs, or the **Grave Purge 2D** card.
Same game, same rooms (a 2D player and a 3D player can share one). 3D draws models and shadows and
builds them as the camera reaches them (a hitch the first time it sees a new place); 2D is a plain
canvas, light on older computers. Both show their frames a second at the bottom left.

**Controls**, the classic way: left-click or drag to select (double-click: that rank on screen;
Shift adds); right-click moves, or attacks what you click. **A** attack (then click: they fight on
the way) · **M** move · **P** patrol · **S** stop · **H** hold · **E** heal · **W** to the Forge ·
**Ctrl/Alt+0–9** save the selection as a group, **Shift+0–9** add to it, **0–9** pick it (twice
quickly: look at it) — the group bar shows them (right-click a slot to save there) · **Tab/F2** all
your soldiers · **Space** the last alert · **Backspace** the camp · **Shift+F5–F8** save a view,
**F5–F8** go back to it · **R** a Recruit (**Shift+R** five) · **F** Forge · **U** upgrades · **G**
give ore · **+/−** speed · **F1** all the keys. The command card at the bottom has the same, to click.
(On Windows, Ctrl+number may switch browser tabs: use Alt+number.)

| File | What it holds |
| --- | --- |
| `src/squad/purge/rules.js` | ranks, upgrades, the dead and their guardians, buildings, shrine gifts, difficulty, money |
| `src/squad/purge/map.js` | the Gravefield from a fixed seed (rings of ridges, buildings, camps), the walking grid and A* |
| `src/squad/purge/sim.js` | `Purge`: orders, the Forge, fighting, the dead waking and leashing, crypts, waves (timed, and answering each building that falls), the wards and the Heart, bots — no drawing |
| `src/squad/purge/view.js` | the land (rocks, KayKit Halloween pieces for the dead's buildings, Space Base pieces for the camp), soldiers, skeletons; built only near the camera |
| `src/squad/purge/PurgeGame.js` | menu, rooms, selection and orders, HUD, the Forge / armoury / give panels, minimap |
| `src/squad/purge/flat.js` | the 2D view: the same game drawn flat on a plain canvas (no WebGL) — the land painted once, shapes for everything that moves |
| `src/squad/purge/sprites.js` | the sprite baker: our 3D models rendered once into sheets of 2D pictures (then the 3D is let go) |
| `src/squad/purge/flatReal.js` | the realistic 2D: textured land, cliffs, blight, sprites back to front with shadows, remains |
| `src/squad/purge/overlay.js` | what both views draw and pick alike: health bars, names, ore popups, picking and box-selecting |

Tests: `tests/unit/purge.test.mjs` (the land and its ways, the Forge, pay and relics, shrines,
the Heart and the king, the clock, a whole game won by bots) and `tests/e2e/bastion.mjs`.

## Hold the Outpost

**Kestrel Outpost**, a mining station on a dead world. The dead climb out of rifts in the wastes
(north, east and west; from wave 8 the south-east too) and come for the walled compound's four
gates and the reactor inside. Fifteen waves; every fifth ends with a boss — the Bone Colossus, the
Pit Lich, the Grave King. Lose the reactor, or the whole squad with no lives left, and it's over.

## Playing

| Key | Does |
| --- | --- |
| Right-click | walk there, or attack the one you click |
| A, then left-click | walk there, fighting whatever comes into reach on the way |
| S / H | stop / hold position |
| Q W E | your soldier's three skills, aimed at the cursor (Mend: at the soldier under it) |
| F | a medkit (heals half your health) |
| B | the armoury |
| Space | the camera back on your soldier; arrows or the screen's edge look round; wheel zooms |

Soldiers shoot whatever is nearest in reach when they stand still — never while walking.

| Soldier | Skills |
| --- | --- |
| **Rifleman** — steady damage at range | Focus Fire (faster fire), Frag Grenade, Sprint |
| **Medic** — keeps the squad standing; heals the most hurt soldier nearby between shots | Mend (one soldier), Restoration Field (healing ground), Revive Pulse (lifts every downed soldier near) |
| **Gunner** — holds the line | Lockdown (armour and damage, no moving), Rocket, Taunt (the dead near come for you) |
| **Engineer** — turrets, mines, repairs | Sentry Turret (two at most), Mine Field, Repair (reactor, sentries, soldiers) |

**Healing and lifting.** The pad in the compound heals whoever stands on it. A soldier who falls is
*down*: stand beside them for 2.5 s to lift them, or a Medic's Revive Pulse lifts everyone near; with
nobody to help, the squad spends a life and they come back at the reactor. Each boss beaten is a life.

**Credits and the armoury.** Kills pay whoever made them (and a share to everyone); each wave held
pays everyone. The armoury sells weapon damage, rate of fire, armour, vitality, skill power and
quicker cooldowns, each level dearer than the last, and medkits. Experience raises a soldier's level
(more health and damage).

**Difficulty**: Recruit, Veteran, Elite, Nightmare — the dead's health and damage, and the squad's lives.

## Together

Up to four people: one makes a room in the menu and gives its five-letter code; the others join and
pick their soldiers; the host chooses the difficulty and deploys. Bot soldiers take the empty
places (a Medic first, if nobody took one), and take over for anyone who leaves. The host's browser
runs the game and sends it to the others ten times a second; their orders go to the host.

## How it is built

| File | What it holds |
| --- | --- |
| `src/squad/rules.js` | soldiers, the dead, the waves, the armoury, difficulty |
| `src/squad/map.js` | Kestrel Outpost: walls and gates, rocks, rifts and their roads, the way round walls and obstacles |
| `src/squad/sim.js` | `Game`: orders, shooting, skills, healing and lifting, the dead's minds, bosses, waves, bot soldiers — no drawing |
| `src/squad/view.js` | the outpost (KayKit Space Base pieces, ambientCG ground), soldiers, the dead (KayKit skeletons), effects |
| `src/squad/SquadGame.js` | menu, rooms, controls, HUD, armoury, minimap |

Tests: `tests/unit/squad.test.mjs` (the map's roads, ways round walls, orders, skills, lifting,
lives, the armoury, a whole game held by bots) and `tests/e2e/bastion.mjs`.
