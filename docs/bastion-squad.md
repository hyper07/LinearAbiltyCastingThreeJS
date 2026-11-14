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
- **The Forge** (the blue ring on the camp's west side, **F**) raises soldiers standing in it:

  | Rank | From | Ore | Relics |
  | --- | --- | --- | --- |
  | Recruit | the barracks | 150 | |
  | Veteran | a Recruit | 1,200 | |
  | Vanguard (one each) | a Veteran | 3,500 | |
  | Phantom (one each) | a Vanguard + 2 Veterans | 9,000 | 4 |
  | Paragon (one each) | a Phantom | 22,000 | 10 |

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
- **Raids**: every few minutes the dead come for the camp from the nearest crypt; the camp's two
  guns help. Soldiers in the camp heal.
- **The clock**: Casual 90 minutes, Hard 75, Hell 60 (the dead tougher too). **Heroes only** mode
  sells Veterans at the barracks instead of Recruits and gives 3,000 ore to start. The host can run
  the game at ×1, ×1.5, ×2 or ×3.
- **Bots** take the empty seats: they buy, raise at the Forge, upgrade, and take their armies out
  together to the nearest thing they can beat, home to heal when hurt. Four bots alone win Casual in
  about half an hour and Hard in about fifty minutes; Hell needs you.

**Controls**: drag or click to select (double-click: all of that rank on screen; Shift adds);
right-click to move or attack; **A** then click to attack-move; **S** stop; **H** hold; **Tab** all
your soldiers; **Ctrl+1–5** make a group, **1–5** pick it; **Space** to your selection; the map:
click to look, right-click to send; wheel to zoom; arrows or the screen's edge to look round.

| File | What it holds |
| --- | --- |
| `src/squad/purge/rules.js` | ranks, upgrades, the dead and their guardians, buildings, shrine gifts, difficulty, money |
| `src/squad/purge/map.js` | the Gravefield from a fixed seed (rings of ridges, buildings, camps), the walking grid and A* |
| `src/squad/purge/sim.js` | `Purge`: orders, the Forge, fighting, the dead waking and leashing, crypts, raids, the wards and the Heart, bots — no drawing |
| `src/squad/purge/view.js` | the land (rocks, KayKit Halloween pieces for the dead's buildings, Space Base pieces for the camp), soldiers, skeletons; built only near the camera |
| `src/squad/purge/PurgeGame.js` | menu, rooms, selection and orders, HUD, the Forge / armoury / give panels, minimap |

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
