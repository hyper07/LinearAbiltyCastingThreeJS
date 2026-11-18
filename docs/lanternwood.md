# Lanternwood

[← Back to the README](../README.md)

<p><img src="../public/covers/lanternwood.jpg" width="70%" alt="Lanternwood: the pixel hero seen from behind at the camp's bonfire, tents and the camp's people around it in the night forest" /></p>

An adventure RPG in the "HD-2D" style: chibi pixel-art characters standing in lit 3D worlds, the
camera behind and above the hero. The characters are solid — every pixel of their drawing a little
block, the body rounded in depth — and move on joints: they walk, swing, thrust, draw a bow, raise
a shield, cast, roll and fall. Whatever the hero wears shows on the figure. A round minimap in the
corner turns with the camera in every realm.

It starts in a night camp in the woods that is losing its lanterns one by one. An old waystone south
of the camp opens on three more realms as you help the world.

## Playing

| Key | |
| --- | --- |
| **W A S D** / arrows | Move (relative to the camera, which swings round behind you) |
| Mouse drag, **Q E** | Turn the camera; the wheel zooms |
| **Space** / left click | Your weapon's attack — press again in time to chain its combo |
| **1 2 3 4** | Your class's four skills (they cost mana or energy and have cooldowns) |
| **5** · **6** · **7** | Health potion · mana potion · eat — potions have **no cooldown**: every press drinks one |
| **Shift** | Dodge roll (nothing hits you mid-roll) |
| **F** | Talk, gather, light, open a chest, touch a waystone to travel |
| **I** or **B** · **C** · **J** | Bag and equipment · your hero · journal |
| **M** · **P** · **Esc** | Realms map · play together · pause |

### Classes

Pick a class and one of four looks (women and men, different faces, hair, skin and builds).

| Class | Plays as | Skills (keys 1–4) | Wears |
| --- | --- | --- | --- |
| **Blade** | Melee: three-strike sword combos | Lunge (a gap-closing dash), Whirl, Flame Cleave (a burning arc), Fireball | Swords, long swords, daggers, axes, spears; light and medium armour; a buckler |
| **Warden** | Tank and support: heavy, slow blows | Shield Bash (stuns), Guard (60 % less damage, foes turn on you), Regrowth Totem (heals the party), Earthshaker | Maces, hammers, axes; any armour; every shield |
| **Seer** | Ranged caster: a staff that fires bolts | Frost Nova (slows), Blink, Ice Lance (pierces), Blizzard | Staves and daggers; robes and light armour; a tome |
| **Ranger** | Ranged, agile, energy instead of mana | Volley, Snare Trap, Roll Shot, Arrow Rain | Bows and daggers; light and medium armour; a quiver |

The weapon changes the basic attack: a dagger jabs quickly, an axe or long sword swings in big,
slow arcs, a spear thrusts far, a staff fires bolts (the third splits in three), a bow shoots
(the third is a piercing power shot).

### The realms

| Realm | Looks like | Monsters | Boss |
| --- | --- | --- | --- |
| **Lanternwood** (camp, levels 1–7) | A night forest round a bonfire | Gloomslimes, ashwolves, lampwisps, thornlings (swarms), mossbacks (shield tanks) | The Lampwight |
| **Sunmeadow Hills** (7–12) | Sunlit fields, a windmill hamlet, fairy rings | Burrowmoles (dig under you), honeyhornets (swarms), thornboars (charge), shroomkin menders (heal the others) | Old Gnarlroot |
| **Frostpeak Hollows** (12–17) | Snow under an aurora, a frozen lake, ice caverns | Shardlings (fans of ice), rimeguards (shields that block from the front), icefangs (packs that flank), frostbats (dive) | The Rime Matron |
| **Emberfall Caldera** (17–22) | Black basalt, lava pools, ash and embers | Cinderlings (run in and burst), magma golems (ground rings), pyre acolytes (call fire down on you), lava salamanders | The Cinder Tyrant |

Each realm is much bigger than the old map (about four times the area), with a hub town, four wild
places, a boss arena, chests and things to gather. Sunmeadow opens when the Howling Hollow is
quiet; each later realm when the one before has lost its boss. Travel by touching a waystone (F).

Every monster shows what it is about to do on the ground — a circle, a line or a cone — before it
strikes. **Hero monsters** are rarer, bigger and glow; they carry a name and one or two affixes
(Frenzied, Shielded, Splitting, Burning, Chilling, Vampiric) and drop better loot. Bosses have three
phases and call for help.

### Items

A bag of 40 slots (potions, food and scrolls stack), and eight equipment slots: weapon, off hand,
head, chest, hands, feet, ring and amulet. Items come in five rarities — common (white), uncommon
(green), rare (blue), epic (purple), legendary (orange) — with more stats and affixes the rarer they
are. Good drops stand in a beam of their colour. Hover an item to compare it with what you wear;
double-click to wear or use it. Traders sell potions, food, scrolls and charms; smiths sell weapons and
armour; both buy what you no longer need. What you wear changes your figure: the weapon in your hand,
a shield on your arm, a hat or helmet, the colours of your clothes, pauldrons and a cape.

### Playing together

Press **P**, make a party and give friends the five-letter code (up to four players). You play in
the host's world: the host's monsters and realm — the party follows the host through the waystones.
Everyone keeps their own hero, gear and quests. Every kill counts for everyone in the realm, and each
player gets their own loot. You see each other's figures, classes, gear, attacks and effects.

The journey is saved on this device. A save from before the classes keeps its progress: Ember becomes
a Blade, Moss a Warden, Frost a Seer, the potions move into the bag.

## For developers

| Part | File |
| --- | --- |
| The screen: title and class select, realm building and travel, input, camera, the loop, HUD hookup | `src/hd2d/LanternwoodGame.js` |
| The hero's fight: weapon combos, skills, missiles, zones, taking hits, kills and loot drops | `src/hd2d/combat.js` |
| The monsters: spawning, every behaviour's AI, hero monsters, bosses and phases, telegraphs | `src/hd2d/foes.js` |
| Co-op: rooms over the platform's party relay, the host-run world, other players' figures | `src/hd2d/coop.js` |
| Rules (no three.js, no DOM): stats, damage, enemies, elites, quests, people, dialogue, save and migration | `src/hd2d/rules.js` |
| Classes, skills, weapon combos, the looks | `src/hd2d/classes.js` |
| Items: bases, rarities, affixes, loot tables, the bag, equipment, prices, gear → look | `src/hd2d/items.js` |
| The realms' layouts, unlocks, flora layout, collision | `src/hd2d/realms.js` |
| Co-op messages, packed and checked | `src/hd2d/netcode.js` |
| People as letter maps (hair, face, build, outfit) | `src/hd2d/people.js` |
| Pixel sprites (shaded by `src/pixel/art.js`), item and skill icons | `src/hd2d/sprites.js` |
| Sprites made solid; jointed figures, poses, gear on the joints | `src/hd2d/voxel.js`, `rig.js`, `gear3d.js` |
| The Lanternwood forest; the other three realms; waystones, chests, chunked instancing | `src/hd2d/world.js`, `realmWorld.js`, `props.js` |
| Billboards, post-processing, HUD and minimap, windows (bag, hero, journal, realms, shops, party) | `src/hd2d/gfx.js`, `post.js`, `ui.js`, `panels.js`, `hd2d.css` |
| Tests | `tests/unit/hd2d.test.mjs` |

**Performance.** Each realm's trees, rocks, grass and props are instanced in spatial chunks: whole
chunks are culled by the camera, far chunks switch to a cheaper model or hide beyond the fog, and only
chunks near the hero cast shadows. Monsters far from every player sleep (no AI, not drawn).

**Co-op.** No server change: the game uses the existing room relay at `/ws` (`server/realtime.js`,
already mounted by `vite.config.js` and `server/server.js`). Two messages: `ld-me` from every player
(hero, pose, gear, the hits they landed) and `ld-tick` from the host (the realm, the monsters near the
players, events such as hits on heroes, deaths, missiles, warnings). Each is sent about 12 times a
second, well inside the relay's per-connection budget.

**Save.** `localStorage['gamory.lanternwood.save']`, version 2. A version 1 save is migrated
(`migrateV1` in `rules.js`) rather than wiped.

Pixel effects (fire, hits, frost, arcane, nature) are from the vendored pixelfx collection; the camp's
3D props from the vendored kits (see [The knowledge base](knowledge-base.md)).
