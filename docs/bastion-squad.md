# Bastion Squad

A co-op squad game of our own, in the "special forces" style of custom strategy maps: a small
squad, each soldier controlled by one player, holds a position against wave after wave, growing
stronger as it goes. The setting, map, soldiers, enemies and waves are all original.

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
