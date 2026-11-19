# Kindlewatch

The opening map and characters of a top-down action game in a hand-painted
2D style: thick ink outlines, cel shading and brush texture on every sprite,
lit in real time — warm fire against the blue of a snowed-in fortress. No
story yet: fight through six rooms, relight the braziers, open the Rime Gate
and face the frost giant on his throne.

Open it from the home page (the **Action** chip), or in code:

```js
const { KindlewatchGame } = await import('./src/kindlewatch/KindlewatchGame.js');
const game = new KindlewatchGame(document.body, { onClose });
await game.open();
```

URL options: `?debug` (or `?perf`) shows frame time, draw calls, lights and
sprites; `?touch` forces the touch controls; `?fresh` ignores the save;
`?scale=0.75` renders smaller and scales up.

## The map: Kindlewatch Keep

Six rooms joined by corridors cut through thick snow-capped walls
(`src/kindlewatch/map.js`, all of it data):

| Room | What's there |
| --- | --- |
| **Gatehouse Yard** (start) | Two lit braziers by the north door, a lit and an unlit wall torch, pillars, crates and pots to break, a barricade to hack through |
| **Brazier Court** | The great carved brazier and its pool of firelight, a big ice patch to slide on, pillars, broken brick walls, banners, the **Rime Gate** to the north with three beacon lamps |
| **Frozen Garden** | A frozen fountain in a ring of ice, frost-blossom trees, frosted hedges, statues, benches, and a cold beacon |
| **Bone Cloister** | Two colonnades of pillars, sarcophagi, banners and torches on the north wall, bones, a cold beacon |
| **Fallen Rampart** | Rubble, a broken wall, the Gorehorn pens behind wooden fences, an ice sheet, a cold beacon |
| **The Rime Throne** | A round arena of four braziers, pillars and ice, an ice throne — the boss arena |

Light the three beacons (E beside one, or hit it with a thrown brand-axe or
sun-lance) and the Rime Gate rises. Torches and braziers can be lit and
doused anywhere; fire you throw lights them, frost arrows and the giant's
breath put them out. The last fire you lit is where you rise if you fall.

## The heroes

| | The Hornwarden | The Veilrunner |
| --- | --- | --- |
| Look | Horned great helm with ember eyes, plate under a fur mantle, crimson cloak, kite shield with a gold flame | Teal hood over a shadowed face with pale eyes, rust scarf, leather coat, wrapped shins, a lantern on the hip (it lights the way) |
| Combo (tap ×3) | Forehand, backhand, overhead slam with a shockwave | Thrust, wide sweep, vaulting downward thrust |
| Hold to charge | **Hearthwhirl** — a spin that breaks any guard | **Comet lunge** — a dash through a line of foes |
| Dash (i-frames) | Shoulder roll | Veil step (longer) |
| Ranged (ammo pips) | Brand-axes, 3 pips, thrown burning | Sun-lances, 4 pips, pierce |
| Summon (costs spark) | **Hearth Hound**: a hound of living coals that runs down foes for 9 s | **Lantern Moth**: circles you for 11 s, lights the dark, stings what comes near |

Health, spark (energy for the summon, earned by landing blows), ammo pips
that refill one at a time, and hearth draughts — **potions have no cooldown**.

## The foes (every attack telegraphed)

| Foe | What it does | Its telegraph |
| --- | --- | --- |
| **Cinder imp** | Darts round you at a few tiles, throws embers, scratches up close; embers relight torches | A glowing crouch and a dashed line toward you |
| **Rime slime** | Hops at you; splits when it dies — big into two medium, medium into two small | A squash and a ring where it will land |
| **Hollow sentinel** | Walks behind a tower shield, chops and shoves; blocks frontal blows until its guard breaks (heavy blows break it three times faster; blows from behind skip it) | Raised blade and an arc on the floor; a short lane for the shove |
| **Rimefletch archer** | Keeps six to nine tiles off, backs away, looses chilling frost arrows that also snuff torches | A frost line that tracks you, then locks |
| **Gorehorn** | Stalks, paws the snow, charges; a charge into a wall stuns it | A wide lane, locked for the last third of a second |
| **Hrimgar, the Rime Jarl** (boss) | Phase 1: maul slams and sweeps. Phase 2: a roar snuffs the arena's braziers, calls slimes, adds ice-shard volleys and a freezing breath. Phase 3: rages, faster, leaps onto you | Circles, cones, five lines, a shadow that follows you |

Pickups: embershards (the gem counter), heart-orbs (health) and the odd
draught, from foes, pots and crates.

## How it's drawn

- **Painted in code** (`art/`, `paint.js`): every sprite is a set of shapes,
  each filled from a hue-shifted ramp (`src/pixel/art.js`), given a hard
  shadow crescent and core away from the light, a lit crescent and rim,
  brush texture (strokes, stone speckle, fur, metal streaks, snow dabs), thin
  inner ink lines, and finally a thick ink silhouette heavier on the shadow
  side. Characters are **cut-out puppets**: separate inked limbs rigged in
  `puppet.js` and animated by pose functions (idle, run, three combo blows,
  charge, release, dash, throw, cast, drink, hurt, death; each foe's
  wind-ups, blows, staggers and falls), with squash and stretch.
- **Normal maps from the paint** (`normals.js`): height from an exact
  distance transform of each shape's alpha (a dome), plus a little of the
  painting's own light and dark, then normals by central differences. Blocks
  paint their face normals by hand (front faces, top faces, domed snow caps).
- **One atlas** (`atlas.js`): every sprite in a 4096×2048 painting and a
  matching normal+glow map, so the keep draws in about twenty calls.
- **Deferred 2D lighting** (`render.js`): the G-buffer holds albedo, normal
  plus elevation, glow and gloss. The ground is a shader over tileable
  painted flagstones, snow, ice and frozen earth, mixed by masks, with inked
  edges where snow and ice end. The light pass adds a cold sky and moon
  (with soft shadows) and up to 20 warm point lights — braziers, torches,
  thrown fire, summons, hit flashes — each with soft shadows marched through
  a signed distance field of the blocks (with their heights, so a flame
  clears its own bowl). Then embers, sparks, smears and flames, bloom, a
  filmic tone curve, a cold-shadows/warm-highlights grade, a vignette and
  grain.
- **Feel**: hit-stop, screen shake (none with reduced motion), hit flash,
  knockback, smear frames on every swing, painted damage numbers,
  footprints in deep snow, scratches and shavings when you slide on ice,
  ember particles, snowfall.

## Controls

Keyboard and mouse: WASD to move, aim with the mouse; left click strikes
(hold to charge), right click throws, Space dashes, Q summons, R drinks, E
lights or douses, Esc pauses. Gamepad: left stick moves, right stick aims, X
strikes (hold), RT throws, A dashes, Y summons, LB drinks, B lights, Start
pauses. Touch (phones): a stick under the left thumb and buttons on the
right; blows aim at the nearest foe.

## HUD

An ember-heart medallion (its flame fills with spark and glows when the
summon is ready), brush-stroke health and spark ribbons, ammo pips that
refill, draughts, the embershard counter, skill tags with their charge, an
always-on minimap of the rooms you've seen (fires, beacons, doors, foes in
your room), a boss bar in the arena, a pause menu with controls and credits
(also on the start screen).

## Files

`src/kindlewatch/`: `KindlewatchGame.js` (the game), `map.js` (the keep),
`rules.js` (combat numbers and formulas, combo windows, i-frames, potions,
slime splitting, save), `brains.js` (foe state machines), `actors.js`
(hero, foes, projectiles, summons, pickups), `puppet.js` (rigs and poses),
`render.js` (the lit 2D renderer), `world.js` (ground textures, masks,
shadow field, level drawing), `normals.js` (distance transform, normals),
`paint.js` (the painting kit), `atlas.js`, `fx.js` (particles, smears,
footprints, numbers), `hud.js`, `input.js`, `audio.js` (all sound made in
Web Audio), `credits.js`, `kindlewatch.css`, and `art/` (props, ground,
heroes, foes, effects). Tests: `tests/unit/kindlewatch.test.mjs`.

## Credits

three.js (MIT) and Nunito (SIL OFL 1.1, via Fontsource). Everything else is
made in code for this game; see the Credits panel and
[third-party.md](third-party.md).
