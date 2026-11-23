# Snowpuff Peaks

[← Back to the README](../README.md)

A cute, fast snowboard race for kids. Pick a plush rider and a mountain,
then race the others down it: carve, tuck, jump the kickers, spin and flip,
grab stars and bonk the rider ahead with snowballs. Bumping into things never
ends your run — you tumble, poof, and pop back up. Alone against computer
riders, or with up to three friends in a room.

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

Title → **choose your rider** on a turning snow stage → **choose a mountain**
from three little dioramas with difficulty stars → the race (3‑2‑1‑GO) →
the **podium** with times, stars, tricks and snowball hits → race again, the
next mountain, or back to the mountains. Best times are kept on this device.

## The riders

Original plush animals, each one dominant colour and one bold accent, so they
read at a glance — from behind, at speed (`src/snowpuff/riders.js`):

| Rider | Look | Accent |
| --- | --- | --- |
| **Pip** the fox (the hero) | Round fuzzy orange, cream muzzle, chest and tail tip, dark paws and ear tips, a huge springy tail | Teal goggles |
| **Toffee** the bear | Caramel brown, cream muzzle | Mint scarf |
| **Mochi** the cat | Blue-grey tabby | Sunny bobble hat |
| **Pickle** the frog | Lime green | Orange backpack |
| Peaches the pig, Pebble the penguin | Computer rivals only | Blue goggles, red bobble hat |

They are sculpted in code from soft shapes (the Arcademia sculptor,
`src/arcademia/world/creatures/sculpt.js`) into one smooth skinned body each,
then dressed in a TSL plush material with sheen and a fresnel rim, and
**shell fur** (12 shells on your rider on the high tier, 6 on the rivals),
bead eyes with a catchlight, a stitched mouth and blush. They squash on
landing, lean into carves, crouch to jump, breathe when idle; ears, tail,
scarf and pompom swing on springs.

## The mountains

Data in `src/snowpuff/mountains.js`; each builds its own course
(`src/snowpuff/course.js`, deterministic, so online players never send it).
Add a mountain by adding a record.

| Mountain | Mood | What's on it |
| --- | --- | --- |
| **Marshmallow Hill** ★ | Sunny noon | Wide gentle runs, little jumps, hay bales and snowmen, chairlifts crossing and beside the run, a resort village of chalets at the bottom with cheering fans |
| **Pinecone Ridge** ★★ | Golden hour | A slalom through dense pines, red and blue gates, chairlifts overhead, bigger jumps, a frozen creek with ice patches |
| **Aurora Peak** ★★★ | Night | Aurora curtains and stars, warm lanterns down the run (real lights near you), steep drops, big kickers, narrow gaps |

A course is a centre line sampled every metre (winding gently, steepness
varying by section), a cross-section (groomed dish, soft berms, rising
mountainside, rolls in the snow, banked turns), and everything placed along
it: kickers, barriers in rows that always leave a gap, slalom gates, star
lines (some up over the kickers), snowball piles and shields, ice, lifts and
arches. The snow is built in 50 m chunks in course space; props live in 100 m
sections shown only near you.

## Riding

`src/snowpuff/physics.js` — one pure step shared by you, the rivals and the tests.

- **Steer** (A/D, ←/→): hold to carve harder — a sharper turn, more spray, a bit slower.
  Let go and the board settles back down the fall line.
- **Tuck** (S, ↓ or Shift): less drag, more speed, wider turns.
- **Jump** (Space): hold to crouch, let go to pop; a longer hold jumps higher.
  Kickers launch you by their own lip.
- **Tricks**: in the air, ←/→ spin and ↑/↓ flip. Let go and the board eases
  toward a clean angle; land near one for a speed boost and a sparkle
  ("360", "Back Flip"…). Land crooked and you wobble — never fall.
- **Barriers** (snowmen, hay bales, fence sections, logs, rocks, gate poles):
  a soft bounce, a poof and a one-second tumble. Jump high enough and you clear them.
- **Ice** is slippery: turning is half as strong, and you keep your speed.
- **Stars**: three in a row in quick succession give a boost.

## Snowballs

Snowball piles (the little heaps with a blue flag) give two snowballs; you
carry up to three. **1** (or a click, or the big snowball button) throws one:
it aims itself at the nearest rider ahead in a cone and lobs over in an arc.
A hit spins them out for 1.2 s with a "BONK!". Blue bubbles give a **snow
shield** — **2** puts it up for five seconds and the next snowball bounces off.
Rivals throw at you too. Rules in `src/snowpuff/race.js`.

## Rivals

Three to five computer riders (`src/snowpuff/ai.js`) with personalities —
careful, reckless, thrower — follow wandering lines, steer round barriers,
hop logs, go for stars and piles, spin off kickers and throw. A gentle rubber
band (±7 % pull) keeps the race close.

## Racing with friends

**Race with friends** → **Make a room** shows a five-letter code; friends type
it and press **Join** (up to four). Everyone picks their own rider; the host
picks the mountain and starts. Computer riders fill the empty places.

It goes through the platform's relay (`server/realtime.js`, `src/net/Session.js`;
see [Playing together](multiplayer.md)). The host's browser is the race's
authority: it runs the rivals, decides every snowball hit, and sends the final
order. Each player sends their own rider about 15 times a second; the others
glide between those states about a tenth of a second behind
(`src/snowpuff/netproto.js`, `net.js`). Throws are drawn by everyone; the host
says whether they hit. Stars and piles are personal, so nothing about them is
sent. If the server can't be reached, racing alone still works; if the host
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
  only** (stars, lanterns, aurora, sun, snow sparkles), **TRAA** (high) /
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
  frames run long; shaders are compiled behind the loading card.

## Props

Trees, lift towers and chairs, chalets, huts, snowmen, hay bales, fence
sections, rocks and lanterns are polyfork models (CC BY 4.0, each named in the
Credits panel), listed in `src/snowpuff/assets.js` and fetched into `library/`
with the rest of the library extras. Everything else is made in code. If a
model is missing, a simple stand-in is drawn instead.

## Controls

One table, `src/snowpuff/controls.js`, read by the key handler, the hint line
and How to play (**H**). Gamepad: left stick, A jump, X throw, Y shield, RT
tuck, Start pause. Touch: the left 35 % of the screen steers (drag up/down in
the air to flip); big round Jump, Snowball and Tuck buttons on the right.

## Tests

- `tests/unit/snowpuff.test.mjs` — course determinism and layout, the rider
  (gravity, tuck, carve, jump height, kickers, tricks, barriers, ice), the race
  (standings, finish, pickups, snowballs, shields, rubber band), AI riders
  finishing every mountain, the network messages and interpolation, the cast,
  controls and credits.
- `tests/e2e/snowpuff.mjs` — the menus, a race, a snowball, the podium, and
  two browsers racing in one room. `tests/e2e/help.mjs` covers How to play.
