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
| Hold left mouse and drag, **Q E** | Turn the camera (a left press that moves only turns the view; a click still attacks); right or middle drag too; a one-finger drag on a touch screen; the wheel zooms |
| **Space** / left click | Your weapon's attack — press again in time to chain its combo |
| Mouse pointer | Aim. Bolts, arrows, lances and fireballs fly at the pointer; Blizzard and Arrow Rain land on it (within reach); Blink goes toward it. A pointer within 1.5 m of a monster locks onto it. Walking one way and aiming another, your legs keep walking and your body turns to shoot (past about 100° you turn round and backpedal). With no mouse, attacks aim at the nearest foe ahead as before |
| **1 2 3 4** | Your class's four skills (they cost mana or energy and have cooldowns) |
| **5** · **6** · **7** | Health potion · mana potion · eat — potions have **no cooldown**: every press drinks one |
| **Shift** | Dodge roll (nothing hits you mid-roll) |
| **F** / click a chest | Talk, gather, light, open a chest, touch a waystone to travel |
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
(Frenzied, Shielded, Splitting, Burning, Chilling, Vampiric). Bosses have three phases and call for
help. A hero monster or a boss drops a **treasure chest** where it falls — one for each player in a
party, rolled for your class when you open it (a boss's is bigger and richer). It gives its loot once,
then sinks away; left unopened it stays until you leave the realm, or five minutes. The chests placed
around the realms open once per journey and are gone for good afterwards.

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
| Sprites made solid (rounded per part, smooth-shaded, baked occlusion); jointed people on springs (walk, combos, skills, idles, blinks, look-at, aim twist); gear with metal sheen, hands and shoes | `src/hd2d/voxel.js`, `rig.js`, `gear3d.js` |
| Monsters cut into jointed parts (legs, wings, heads, tails, arms) and animated by kind | `src/hd2d/beasts.js` |
| Combat effects: pooled particles, voxel debris, rings, pillars, a flash light | `src/hd2d/vfx.js` |
| Aiming at the pointer; reward and placed chests (pure rules) | `src/hd2d/aim.js`, `chests.js` |
| The Lanternwood forest; the other three realms; waystones, chests, chunked instancing | `src/hd2d/world.js`, `realmWorld.js`, `props.js` |
| The figure material (rim light, glow, hit flash, metal), billboards, post-processing, HUD and minimap, windows | `src/hd2d/gfx.js`, `post.js`, `ui.js`, `panels.js`, `hd2d.css` |
| Tests | `tests/unit/hd2d.test.mjs` |

**Figures and effects.** People and monsters are their pixel drawings made solid: near the camera
every pixel is a block (`detail` 1), further away four pixels a block (`detail` 2); the fine versions are
built in the background when a realm loads. Each body part is rounded on its own (a domed head with a
nose, cheeks and hair standing proud of it), lit through smooth normals so the steps do not stripe, with
ambient occlusion baked into the colours and a soft rim light. Joints are damped springs, so strikes
follow through and heads lag a step. Monsters break into their own blocks when they die. Every combat
effect draws from shared pools — one instanced draw for glowing particles, one for smoke and dust, one
for debris — with a budget, and dims in the daylight realms so bloom never washes them out. Crits pulse
the screen briefly (colour fringe, a lift of light); with *reduce motion* set, the pulse is off and
shake is small.

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
