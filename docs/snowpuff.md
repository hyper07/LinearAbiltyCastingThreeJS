# Snowpuff Peaks

[← Back to the README](../README.md)

A cute, fast snowboard race for kids. Pick a plush rider, give yourself a
nickname, choose a mountain, then race the others down it: carve the bends,
tuck, jump the kickers and ring the bells, spin and flip, burst the snowmen,
open gift boxes for snowballs, giant snowballs, shields, rocket sleds and ice
patches, shove the rider beside you and draft the one ahead. Bumping into
things never ends your run — you tumble, poof, and pop back up. Alone against
computer riders, or with up to three friends in a room.

Open it from the home page (the **Racing** chip), or in code:

```js
const { SnowpuffGame } = await import('./src/snowpuff/SnowpuffGame.js');
const game = new SnowpuffGame(document.body, { onClose });
await game.open();
```

URL options: `?quality=high|medium|low` (default: auto from a frame-time
probe), `?webgl` forces the WebGL2 backend, `?touch` forces the touch
controls, `?notrails` turns the snow trails off (for comparing).

## The flow

Title → **choose your rider** on a turning snow stage and type **your name**
(or roll a 🎲 cute one) → **choose a mountain** from three little dioramas with
difficulty stars → the race (3‑2‑1‑GO) → the **podium** with names, times,
tricks, hits and gifts → race again, the next mountain, or back to the
mountains. Your name and best times are kept on this device.

**Nicknames** (`src/snowpuff/names.js`): up to 12 characters of letters (any
alphabet), digits, spaces and `- ' .`; anything on a small kid-safety block
list (checked on the letters only, so `sh1t` doesn't slip through) becomes a
random cute name instead. Your name shows on the course strip, the minimap tooltip, the
results and over you on the podium (while you ride, only the other riders carry
name tags; tags that would overlap are lifted and faded); in a room it
is the name your friends see, and every remote name is cleaned again on arrival.
Computer riders keep their character names.

## The riders

Original plush animals, each one dominant colour and one bold accent, so they
read at a glance — from behind, at speed (`src/snowpuff/riders.js`):

| Rider | Look | Accent |
| --- | --- | --- |
| **Pip** the fox (the hero) | Round fuzzy orange, cream muzzle, chest and tail tip, dark paws and ear tips, a huge springy tail | Teal-framed goggles, stars on the board |
| **Mallow** the bunny | Round fuzzy hot pink, a lighter-pink belly panel with a little front pocket, long floppy springy ears | White goggles with an amber lens, hearts on the board |
| **Toffee** the bear | Caramel brown, cream muzzle | Mint scarf |
| **Mochi** the cat | Blue-grey tabby | Sunny bobble hat |
| **Pickle** the frog | Lime green | Orange backpack |
| Peaches the pig, Pebble the penguin | Computer rivals only | Red bobble hat (penguin) |

They are sculpted in code from soft shapes (the Arcademia sculptor,
`src/arcademia/world/creatures/sculpt.js`) into one smooth skinned body each,
then dressed in a TSL plush material with sheen and a fresnel rim, and
**shell fur** (12 shells on your rider on the high tier, 6 on the rivals),
bead eyes with a catchlight, a stitched mouth and blush. They squash on
landing, lean into carves, crouch to jump, breathe when idle; ears, tail,
scarf and pompom swing on springs.

Everyone rides with **goggles down over the eyes**, chunky dark boots in the
bindings, a truly sideways stance (feet across the board) and a playful
topsheet picture on the board (stars, hearts, paws, fish, dots, flakes).

### Goggles

On the rider screen a **Goggles** row sits under your name: a scrollable strip
of round chips and a 🎲. A pick goes straight onto the turntable rider (a head
shake and a little bounce, a strap-snap sound), is remembered on this device
(`snowpuff.goggles` in localStorage, wrapped in try/catch) and is worn
everywhere you appear — the race, the rival panel, the podium and your
friends' screens online (the id travels with your rider and is checked on
arrival; anything unknown becomes Classic). Computer rivals wear a random pair.
All are unlocked.

18 original pairs (`src/snowpuff/goggleList.js` is the list, `render/goggles.js`
builds them to fit each head, measured from its sculpted shape at eye height):
Classic (your rider's frame colour, amber mirror lens), Sky mirror, Rainbow,
Hearts, Stars, Googly eyes (the pupils wobble on bumps and landings), Cat-eye
(little ears), Aviator (brass, leather strap), Snorkel mask (the tube bobs),
Swim goggles, 3D glasses (red/blue film), Pixel shades (drop in when you land a
trick), Hypno spiral (turning), Donuts (frosting and sprinkles), Frog eyes,
Cyclops visor, LED visor (scrolls your name and WHEE!), Sunflowers.

Ski goggles have a thick rounded frame with a nose notch, a dark foam gasket,
a curved mirror lens whose warm gradient carries a bright sky streak that
slides as the head turns, and a black strap round the back of the hood; glasses
have arms instead. Materials are shared and each pair is a handful of draws.
The podium winner pushes theirs up onto the forehead (eyes showing) and silly
ones do their trick. Every pair is drawn once behind the loading card (menu and
race) so trying them on or a rival's random pick never builds a pipeline
mid-play.

### Boards

Beside Goggles is a **Board** tab: the same chips and 🎲, an instant swap on
the turntable (the rider hops and the new board slides in, with a whoosh and
a clack), remembered on this device (`snowpuff.board`), synced online and
checked on arrival (unknown → Classic), random for the computer rivals, and
shown on the podium, in the results and on the mountain card. **Boards are
cosmetic only — every board rides with exactly the same physics** (a unit test
rides the same inputs on each and compares).

14 original boards (`src/snowpuff/boardList.js`, built in `render/boards.js`):
Classic (a doodle print in your rider's colours), Rainbow (a faint rainbow
trail), Pizza slice (cheese drips; cheese strings on jumps), Surfboard (a fin;
surf spray), Banana (just a banana-shaped board), Fish (its tail wiggles as you
carve), Rocket (a flame and smoke on boosts), Cardboard box ("THIS SIDE UP"),
Gingerbread (sprinkles fall off on landings), Cloud (little cloud puffs), Neon
(edges glowing with speed, flashing on a clean landing), Dragon (a head at the
nose that blinks), Watermelon (seeds pop out on tricks) and a Wooden sled. Each
has its shape, a printed topsheet (painted once to a canvas, one print material
per design), a coloured base and edges and matching bindings; all are drawn
once behind the loading card.

Snow cannons (snowmaking guns) stand beside every run, blowing soft particle
plumes away over the slope.

## The mountains

Data in `src/snowpuff/mountains.js`; each builds its own course
(`src/snowpuff/course.js`, deterministic, so online players never send it).
Add a mountain by adding a record.

| Mountain | Mood | What's on it |
| --- | --- | --- |
| **Marshmallow Hill** ❄ | Sunny noon | Wide gentle runs, little jumps, hay bales and snowmen, chairlifts crossing and beside the run, a resort village of chalets at the bottom with cheering fans |
| **Pinecone Ridge** ❄❄ | Golden hour | A slalom through dense pines, red and blue gates, chairlifts overhead, bigger jumps, a frozen creek with ice patches |
| **Aurora Peak** ❄❄❄ | Night | Aurora curtains and stars, warm lanterns down the run (real lights near you), steep drops, big kickers, narrow gaps |

These three are the fictional **Snowpuff Islands**. The rest are **famous
mountains of the world**: you ride a nearby slope while the famous peak stands
far off as the hero of the skyline — big (seen from mid-run its summit stands
about 19° up with its foot just under the horizon, a third of the view), crisp
snow catching the sun, almost no haze on the peak itself and a thick haze and
cloud bank round its foot; the run's curves swing it from side to side and it
is ahead for most of the race. One mountain is loaded at a time; each race is
about 60–90 s for the computer riders.

### Race length

Picked on the mountain card (remembered on this device; online the host picks
in the room, and every peer builds the same course from it):

- **Quick** — the mountain's own run: about 60–90 s for the computer riders.
- **Long trail** — about 2½–3 min (150–180 s): the mountain's top, then new
  sections with their own character — a **forest run** (trees close by), a
  wide **open bowl**, a **jump park** (kickers one after another), a narrow
  **gully** and a steeper **final sprint**. The section's name shows under the
  course strip; the famous peak stays ahead as the run swings toward it.
- **3 Laps** — the run three times. At the line you ride a **chairlift** back
  up (9 s, Space or a tap skips it after 3 s): your rider on the chair with
  the mountain view ahead and the order chair by chair; gifts are restocked
  for the next lap, the slalom gates swap sides and from lap 2 a bonus
  kicker opens. The lift's time doesn't count toward your race time, so
  skipping it is fair. The strip shows "Lap 2/3".

Best times are kept per mountain and race length.

| Mountain | Where | Mood | Around the run |
| --- | --- | --- | --- |
| **Hallasan** 한라산 ❄ | Jeju, Korea | Morning | A broad shield volcano with its crater lake, the sea, basalt field walls, stone grandfather statues, tangerine trees, canola flowers by the finish |
| **Seoraksan** 설악산 ❄❄ | Korea | Deep winter, lavender light | Ulsanbawi's long crown of rough, rime-crusted granite towers — jointed blocks with broken, slanting tops, ledges and clefts, flat-shaded facets, bare grey rock showing on the sheerest faces (built on a grid so every block and cleft shows) with a snowy dome behind in cloud, frosted forest ridges in hazy layers, rime "snow flower" trees, a cable car and small temple roofs down in the valley |
| **Baekdusan** 백두산 ❄❄❄ | — | Clear high day | From a high neighbouring ridge: the great, broad snowy volcano with its jagged, dark, banded crater rim along the top (Cheonji's deep-blue lake is shown on its map card); birch and larch woods by the run in their own groves — white-trunked birch clumps with bare purple twigs, and larches gold-orange under their snow. Only nature — no flags, signs or buildings |
| **Mount Fuji** 富士山 ❄❄ | Japan | Sunrise beside the summit | The snow-capped cone, a lake, torii gates over the run, stone lanterns, a pagoda, a red bridge, cedars |
| **Matterhorn** ❄❄❄ | Switzerland / Italy | Clear day | The pyramid, cowbells to ring, a red mountain train on a viaduct, gondolas, a village |
| **Mount Everest** ❄❄❄ | Nepal / China | High and blue | The summit plume, prayer flags, a stupa, yaks, cairns |
| **Banff** ❄❄ | Canada | Crisp day | Layered jagged peaks, a turquoise lake, moose, a lodge, gondolas |
| **Kilimanjaro** ❄❄ | Tanzania | Sunset | The flat-topped giant with its snow cap, savanna beyond the run, acacias, giraffes, elephants, a sandy finish |

The pick is a **world map** (`src/snowpuff/worldMap.js`): pins on a stylised
map, region tabs (World, Asia, Europe, the Americas, Africa, Snowpuff Islands)
that zoom in, difficulty filters, and a card with the name in English and its
local name under it, the difficulty and a short checked fact for kids. Cultural,
religious and wildlife things are only scenery. The pure parts are
`src/snowpuff/landmarks.js` (peak shapes, where the hero stands, the scenery
plan, always off the run) and `render/scenery.js` builds them.

**Next mountains** (wave 2, in progress): Artesonraju (Peru), Yellowstone
(geysers you can ride), Mont Blanc, Denali, Kirkjufell. Later candidates: Aconcagua,
Kangchenjunga, Aoraki / Mount Cook, a table mountain or desert dunes.

A course is a winding centre line sampled every metre — straights and eased
arcs: S-bends, a few **banked berms** (boardercross style), wide sweeping curves
on Marshmallow Hill, tighter ones on Aurora Peak — with a cross-section
(groomed dish, soft berms, rising mountainside, gentle **rollers**, banking into
turns) and everything placed along it: kickers on straight run-ups, barrier rows
that always leave a gap, slalom gates, **gift boxes** on the racing line (and
risky ones floating over kicker landings, marked with glowing chevrons),
snowball piles, **bell arches** over landings, ice, lifts and arches. Terrain,
fences, poles, gates, lift lines and trees all follow the curve; a world-space
ground fills the inside of tight turns. The snow is built in 50 m chunks in
course space; props live in 100 m sections shown only near you.

## Riding

`src/snowpuff/physics.js` — one pure step shared by you, the rivals and the
tests, run at a fixed **120 Hz** whatever the frame rate, with drawing
interpolated between steps (and the camera placed after, from the same
interpolated state), so motion is smooth at any frame rate.

- **A real board**: it has a heading and a velocity. Steering ramps in and out,
  turns the board and tips it onto its **edge**; a tipped edge grips, so the
  velocity follows the board in a clean **carve**; a flat or crossed board
  **skids** sideways — scrubbing speed and throwing spray from the tail.
  Gravity pulls along the real slope under the board (pitch, rollers, banks,
  kickers), so berms carry you round and rollers lift you.
- **Quick, not twitchy**: a steer key ramps in over about 65 ms (a stick or a
  touch drag stays proportional), the board turns fastest at low and mid speed,
  and switching from one edge to the other (heelside ↔ toeside) does a tiny
  unweight hop so a reversed turn bites at once. A carving edge grips hard, so
  the motion follows the board instead of drifting; skids come from very hard
  turns at high speed — or on purpose, from a hard turn just as you come out of
  a tuck. Measured by `node tests/unit/steering.harness.mjs` (and held to limits
  by a unit test): at 60 km/h the turn builds to 63 % in about 140 ms, the board
  itself in about 85 ms, and a slalom edge change flips your line in about
  0.3 s. The rider's lean, the board's tilt and the camera follow at once, and
  the camera looks a little toward where you steer while keeping you framed in
  the bottom-centre third, even through berms.
- **The whole body rides** (`src/snowpuff/render/poseRig.js`): layered poses
  driven by the physics — a 3/4 side-on stance (regular or goofy per rider:
  the fox, bear, frog and penguin regular; the bunny, cat and pig goofy), knees
  bent, arms out. A turn starts at the head (straight from your input, before
  the board has moved), then the shoulders, then the hips; the rider leans into
  it (capped near 27°) and the knees flex with the edge. Toeside, the body tips
  forward and the rear glove drags in the snow with a little spray; heelside,
  it sits back with both arms forward. An edge change crosses over with a small
  up-and-over; quick slaloms counter-rotate the shoulders. Tuck: compact, arms
  in. Skid: leaning back, arms flailing, eyes wide. Air: arms out, knees up,
  spins led by the head and shoulders; landings compress and the arms flap.
  The head glances at a rider alongside or a gift ahead; ears and tails whip on
  direction changes. Every joint runs through its own spring (arms a little
  under-damped, so they overshoot and settle); nothing allocates per frame.
- **Steer** (A/D, ←/→), **tuck** (S, ↓ or Shift).
- **Jump** (Space): it pops the moment you press it; holding it adds a little
  height. Pressed on a kicker, you crouch and get an extra kick at the lip;
  kickers launch with the ramp's own upward speed (no snap).
- **Tricks**: in the air, ←/→ spin and ↑/↓ flip. Let go and the board eases
  toward a clean angle; land near one for a speed boost and a sparkle. Little
  airs off rollers aren't tricks — steering just nudges your line. Land crooked
  and you wobble — never fall.
- **Barriers** (hay bales, fence sections, logs, rocks, gate poles): a soft
  bounce, a poof and a one-second tumble. **Snowmen** burst into snow when you
  ride through them (a tiny slow-down, a big poof).
- **Ice** (the frozen creek, and the patches riders drop) is the only
  slippery thing: riding onto it takes the edge's grip away for a moment —
  you slide sideways, skate slowly round with windmilling arms, goggles
  jiggling, a scrape and a glint of ice; steering barely works. It lasts at
  most 1.1 s, never twice back to back, and then you have it back.
- The rider leans into turns from the turn's sideways pull, the knees soak up
  rollers and landings, the arms balance, ears and tail swing with momentum.

## The rival panel

When a rider comes up close behind you or draws level to pass, a manga-style
panel slides in on the left (`src/snowpuff/sideMirror.js`): one still picture
of them, snapped from just in front, in a tilted ink frame with radiating
speed lines and a halftone edge, with their name and how far back they are.
It takes a new still only when the rider changes (at most about once a
second); the still is read back to a plain 2D canvas, and the slide, wiggle
and speed lines are CSS — so it costs no frame time. (An earlier live rear
view drew the scene a second time at 20 Hz and built new GPU pipelines the
first time it opened: frames of 150–300 ms just as someone came past. The
snapshot's pipelines are now built behind the loading card.)

## Items and rider play

**Gift boxes** (bright wrapped presents with a beam of light and a ring on the
snow; dots on the course strip) give a random item — kinder to the back of the
pack, and the same gift always holds the same thing for the same rider:

| Item | What it does |
| --- | --- |
| **Snowballs ×3** | Thrown at the nearest rider ahead (or at whoever bonked you last); a hit rolls them over sideways once, snow puffing off, and they pop back up (0.85 s, a fair speed loss) |
| **Giant snowball** | Leaves your hands in your lane and rolls over the real terrain: faster on steeps, slower on flats, swinging up the banks and to the outside of turns, bouncing off the fences, hopping off rollers, growing and picking up chunks as it goes (spinning exactly as far as it rolls), a groove and spray behind it, a rumble and a little shake when it's near. It ends in a big poof on a barrier or snowman, or breaks apart after 7 s. A rider it catches is rolled up inside it for a moment — ears, paws and board poking out — then bursts free (jump it!) |
| **Snow shield** | Snowballs and giant snowballs bounce off for five seconds |
| **Rocket sled** | A short boost |
| **Ice patch** | Dropped behind you: slippery for whoever follows |

You hold **two** at once — **1** uses the first, **2** the second (a click uses
the first; touch has two buttons). Snowball piles add snowballs.

- **Shoves**: side by side, the rider carving harder shoves the other out (a
  wobble, a puff, "Hey!").
- **Drafting**: ride close behind someone at speed for less drag — wind lines
  stream past and "Drafting!" pops up.
- **Bells**: jump through a bell arch and it rings — a little boost.
- **Fans** along the fences cheer when you pass or land a trick near them; land
  one near other riders and you wave.
- **Reactions**: every rider shakes off a hit or a bump, laughs when they land
  one, says so in a word bubble — and rivals throw back at whoever hit them last.
- **Aurora Peak**: chairlift chairs drop clumps of snow onto the run — a soft
  splat that slows you if you ride into it.

## Rivals

Three to five computer riders (`src/snowpuff/ai.js`) with personalities —
careful, reckless, thrower — follow the racing line, steer round barriers,
hop logs, burst snowmen, go for gift boxes and piles, tuck in to draft, spin
off kickers, and use every item: snowballs, giant snowballs at riders in their
lane, ice when someone is right behind, shields after a hit, boosts on
straights. A gentle rubber band (±7 % pull) keeps the race close.

## Racing with friends

**Race with friends** → **Make a room** shows a five-letter code; friends type
it and press **Join** (up to four). Everyone picks their own rider; the host
picks the mountain and starts. Computer riders fill the empty places.

It goes through the platform's relay (`server/realtime.js`, `src/net/Session.js`;
see [Playing together](multiplayer.md)). The host's browser is the race's
authority: it runs the rivals, decides every snowball and giant-snowball hit,
and sends the final order. Each player sends their own rider about 15 times a second; the others
glide between those states about a tenth of a second behind
(`src/snowpuff/netproto.js`, `net.js`). Throws, giant snowballs, ice patches
and boosts are relayed and drawn by everyone; the host says what they hit. Gift
boxes and piles are personal and what a gift holds comes from a hash of the gift
and the rider, so nothing about them is sent. If the server can't be reached, racing alone still works; if the host
leaves mid-race, you finish the run on your own.

## The feeling of speed

Fence panels and posts close along both edges, orange-and-white piste poles
every 10 m, tall feather flags every ~40 m, slalom gates, inflatable arches
over the run, ski lifts whose cables and moving chairs cross overhead and run
beside you, trees right at the fence, lanterns at night. On top: board spray
scaled by carve × speed, snowflakes rushing past the camera, speed lines at the
screen edges, a soft radial blur only near top speed, a field of view that
widens from 60° to 78°, a low camera on a damped spring with a hum of shake at
speed, wind that rises with speed and a whoosh for each pole, gate, arch and
lift you pass.

## Rendering

Snowpuff is the platform's first game on **WebGPURenderer** (`three/webgpu`)
with TSL node materials throughout — no GLSL. Where WebGPU is missing, three
falls back to its WebGL2 backend by itself (tested with `?webgl`).

- **One scene pass with MRT** (colour, view normals, velocity, emissive), then
  **GTAO** (half resolution, faded out with distance), **bloom from emissive
  only** (gift boxes and their beams, lanterns, aurora, sun, snow sparkles), **TRAA** (high) /
  **SMAA** (medium) / **FXAA** (low), the speed blur, **Neutral** tone mapping
  and a per-mountain grade (saturation, warm highlights, cool shadows,
  vignette) — `src/snowpuff/render/pipeline.js`. See-through things (snow
  puffs, bubbles) write alpha 0 to the normal and velocity targets, which are
  blended, so AO and TRAA don't smear round them.
- **Light**: an HDRI from the library as image-based light (Poly Haven, CC0;
  the sky dome itself through PMREM at night or if the file is missing), one
  shadowed sun fitted tightly round you and snapped to its texels, height fog
  tinted to the horizon — `render/sky.js`.
- **Snow** (`render/snow.js`): near-white with cool shadows, groomed corduroy
  that fades before it can alias, macro variation, sparkle glints fed to
  bloom, and **persistent board trails**: two render targets ping-pong over a
  window of the run in course space; each frame the old picture is scrolled
  in and every rider on the snow stamps its board's sweep (wider and deeper
  when carving hard).
- **Plush and fur** (`render/plush.js`): see the riders above.
- **Particles** (`fx.js`): camera-facing quads from instanced buffers, one draw per kind.
- **Quality tiers**: high (TRAA, GTAO, 2048 shadows, fur on everyone, trails),
  medium (SMAA, 1024 shadows, fur on you), low (FXAA, no AO, no fur, no
  trails, DPR 1). Auto picks from the first seconds of riding and steps down if
  frames run long. Behind the loading card every pipeline is built ahead of
  play: the whole course is drawn once with culling off and a wide shadow box,
  across real frames, with every effect pool, a giant snowball, an ice patch
  and a falling clump shown once — so nothing is compiled mid-race (a hitch of
  50–115 ms before a jump came from exactly that).

## Props

Trees, lift towers and chairs, chalets, huts, snowmen, hay bales, fence
sections, rocks and lanterns are polyfork models (CC BY 4.0, each named in the
Credits panel), listed in `src/snowpuff/assets.js` and fetched into `library/`
with the rest of the library extras. Everything else is made in code. If a
model is missing, a simple stand-in is drawn instead.

## Controls

One table, `src/snowpuff/controls.js`, read by the key handler, the hint line
and How to play (**H**). Gamepad: left stick, A jump, X item 1, Y item 2, RT
tuck, Start pause. Touch: the left 35 % of the screen steers (drag up/down in
the air to flip); big round Jump, Tuck and two item buttons on the right.

## Tests

- `tests/unit/snowpuff.test.mjs` — course determinism, curves, berms and
  layout; the rider (slope gravity, tuck, carve vs skid, instant ollie and held
  lift, kickers, tricks, barriers, snowman bursts, bells, ice); the race
  (standings, finish, gifts and their odds, items, giant snowball, dropped ice,
  drafting, shoves, snowballs, revenge, shields, rubber band); AI riders
  finishing every mountain in about 65–90 s; the network messages and
  interpolation; the cast; nicknames; controls and credits.
- `tests/e2e/snowpuff.mjs` — the menus (five riders, the nickname), a race with
  your name tag, a giant snowball and a snowball, the podium, and two browsers
  racing in one room. `tests/e2e/help.mjs` covers How to play.
