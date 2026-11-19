# Kithvale

The first map and characters of a third-person creature-befriending
adventure, at the finish of Gloamreach and Wyldhunt but in a painted, warm
key. No story yet: explore, meet the wild creatures, befriend them, and let
them follow you.

Open it from the home page (the **Creatures** chip), or in code:

```js
const { KithvaleGame } = await import('./src/kithvale/KithvaleGame.js');
const game = new KithvaleGame(document.body, { onClose });
await game.open();
```

URL options: `?quality=low|medium|high|ultra` fixes the tier, `?debug` shows
frame time and draw calls, `?touch` forces the touch controls, `?fresh`
ignores the save, `?nosave` doesn't write one.

## The map

**Lanternrest**, a walled village on a flat terrace: timber-framed houses on
stone plinths with lime-plaster panels and lattice screens that glow at dusk,
curved roofs of real half-round tile rows (fired clay, blue slate or thatch)
with swept-up eaves, skirt roofs between storeys, paper lanterns under every
eave and in strings across the lane, a market lane with four stalls, a well,
banners, the Kettle Teahouse, a shop, the Elders' Hall, the walls with their
tiled caps, and the **gate** — two great posts, a slatted transom, a gold-tiled
roof, studded plank doors swung wide and two big lanterns. The **Kith Garden**
at the end of the cross street is where befriended creatures wait.

**The vale** beyond the gate: a winding dirt road over the **Pebblerun** on an
arched bridge, up to the **Windbell Shrine** on its hill (red posts, a gold
roof, a frame of wind bells, a lookout bench over the whole vale, six stone
lanterns up the last climb); **Hopgrass Meadow** of wildflowers; **the
Hushwood** of maples and pines; **Mirror Pond** with reeds and lily pads;
the warm **Cinder Crags**; the rolling **Puffcrown Downs**; Kemi's field of
sunheads outside the gate. Ridges climb steeply all round, planted with pines:
the land itself is the boundary.

The look is painted: a sky of gradient, flat cloud banks and perspective puffs
in three tones with sun-caught edges; ground laid in broad painted masses with
photographed detail only faint underneath and brush strokes across it;
brush-stroke grass that shades as one soft mass; trees whose crowns are clumps
of leaf cards with spherical normals (three or four values of light, like a
painter blocks them in); a soft terminator and a warm rim on every material;
and, in post, a Kuwahara brush pass that melts texture into strokes on the far
hills (none near the camera, so faces stay crisp), thin warm ink where the
depth jumps, and a violet-and-gold grade. Golden dusk is the default; a slow
day cycle (16 minutes a day) can be switched on in the menu, through blue
evening, a starry night, a pink dawn and a bright noon.

### Zones and hubs

Kithvale is played as **two zones** ([zones.md](zones.md)), one built at a time: **Lanternrest**,
inside the walls (the plaza, the teahouse, the shop, the Kith Garden), and **the vale**, through
the big gate (a warm veil fills it while the other side isn't built). Each has a hub: Lanternrest
itself (the teahouse to rest, Satchel & Seed to trade) and the **Windbell Shrine** up on its hill.
A hub has a map board (the World tab), a notice board, a stash for treats and **keepsakes** (each
buried cache holds one now), the journal on its stand, a merchant (petals for keepsakes; treats
and a satchel refill), a place to rest and a waystone. Friends who follow come through the gate
with you; the rest wait in the Kith Garden.

## The characters

**You**: a young adventurer in one of three looks — Sprout, Wren or Pip — with
walk, run, a sprint, a jump, a crouching creep, a throw, a kneel and a
pick-up retargeted from Mesh2Motion. A third-person follow camera (drag or
pointer-lock, wheel to zoom).

**Villagers** (12): the straw-hatted gatekeeper, the lantern keeper on her
round with a lantern on a pole, a sweeper, two friends talking by the well,
the fruit seller, a child racing round the plaza, the Kith Warden, the elder
on a bench, a grower in the sunhead field, the shrine keeper, a fisher by the
pond. Name plates, a greeting each, a second line once you have friends.

**Six wild species**, original, sculpted in code with AI Arcademia's SDF
sculptor (one smooth body auto-skinned to its bones), each with glossy
blinking eyes, expressions, and its own skin:

| Species | Where | Body | Loves / likes / won't eat | Lends you |
| --- | --- | --- | --- | --- |
| Tuftlet | Hopgrass Meadow | a round hopper with leaf ears and a crown of grass (fur) | seeds / berries / crystals | **Keen nose**: buried treat caches sparkle and show on the map |
| Pebbleroll | the Pebblerun | a stubby roller under a shell of glossy pebbles; tucks into a ball and rolls when scared | crystals / seeds / berries | **Rock roll**: breaks cracked boulders (crystals inside) |
| Lumoth | the shrine, at dusk | a fluffy moth with feathered antennae, painted wings and a paper-lantern belly that glows | berries / crystals / seeds | **Lantern glow**: lights the night and guides you to creatures you haven't met |
| Mistfawn | the Hushwood | a dappled fawn with leaf-bud antlers; very shy | berries / seeds / crystals | **Calm presence**: wild ones stay calmer, the trust moment is gentler |
| Puffwool | Puffcrown Downs | a cloud of wool (fur shells) with a lavender face and curled horns; floats when happy | seeds / berries / crystals | **Cloud hop**: a higher jump and a slow float down while jump is held |
| Emberkit | Cinder Crags | a salamander with feathery ember gills and a flame for a tail-tip | crystals / berries / seeds | **Ember light**: kindles the stone lanterns and lights the dark Hollow |

Each idles, wanders, plays (alone or chasing one of its kind), comes to look
at you when you are near and quiet (curious), freezes when it hears something
(wary), flees and hides when frightened, smells and eats treats, and waits for
you when it trusts you. Noise comes from your speed; **sneaking** (Ctrl, C to
toggle, or 🐾) is near silent.

## Befriending

1. Creep close. Pick a treat from the satchel (**1 2 3**: Sweetberries,
   Sunseeds, Glimmer crystals) and **toss** it (Q or right-click) — it aims at
   the creature you face.
2. It eats it: a loved treat earns a lot of trust, a liked one some, the
   wrong one makes it wary (and the journal learns what it thought).
3. When it trusts you it shows a heart: press **E** near it for the **trust
   moment** — a ring swells and shrinks with its breath; press (Space, E, a
   tap) as it fills the circle, four or five breaths. Perfect and good
   presses score; two misses and it isn't ready yet.
4. Hearts burst, you name it, and it joins you. Up to three follow (they keep
   up in a fan behind you, play with each other when you stop, look about);
   the rest wait in the Kith Garden. Swap them in the journal (**J**).

Treats grow back: berries on bushes, seeds on the tall sunheads, crystals in
the rock. Everything is saved on this device (`localStorage`, versioned,
repaired on load); the world — zones visited, hubs reached, the stash, the
pouch and petals — in `kithvale.zones` ([zones.md](zones.md)).

## HUD and controls

An always-on round minimap (it turns with the camera; friends, creatures
you've seen, caches, stone lanterns, the shrine, the pond, the garden), the
satchel bar, your friends' portraits (rendered from the creatures), a small
prompt, banners for places, and a pause menu (Esc) with the journal, the day
cycle, sound, and **Credits** (every free asset with its link and licence;
also on the start screen).

On touch screens: a virtual stick where your thumb lands, drag to look, pinch
to zoom, and round buttons — jump, act, toss, creep — plus menu and journal.
It works at phone width.

## Quality

Gloamreach's tier guess and governor. Phones start on **low** (no brush
filter, lighter grass, smaller shadows, no fur shells); touch tablets at most
**medium**. Measured with `game.bench(30)` (GPU waited for each frame) in
Playwright on an Apple M-series GPU at 1600×900: about 6.4 ms a frame at
ultra (≈300 draw calls, 5 M triangles in the valley view), 6.1 ms high,
6.0 ms medium (3.9 M triangles), 4.7 ms low (2.6 M); a phone-sized
390×844 view at 3× starts on low at about 4.4 ms (≈190 calls, 2.2 M
triangles). Lighter tiers thin the grass grid itself, not just its density.

## Files

`src/kithvale/`: `KithvaleGame.js` (the game), `zones.js` (the zones, keepsakes, petals, the save's migration), `map.js`, `heights.js`,
`rules.js`, `brains.js`, `quality.js`, `cast.js`, `credits.js` (pure, tested
in `tests/unit/kithvale.test.mjs`), `world.js`, `terrain.js`, `sky.js`,
`grass.js`, `trees.js`, `water.js`, `village.js`, `landmarks.js`,
`nature.js`, `painted.js`, `paint.js`, `post.js`, `player.js`,
`villagers.js`, `fauna.js`, `creatures/` (`recipes.js`, `body.js`,
`face.js`), `audio.js`, `ui.js`, `touch.js`, `kithvale.css`.

Shared, imported unchanged: Gloamreach's textures, kit, collision, follow
camera, quality governor, actors and retargeting, fighter actor, wind
materials, particle cards and combat vfx, sound base; AI Arcademia's SDF
sculptor and outline material. Copied and adapted: Wyldhunt's post chain,
terrain chunks, GPU grass and HUD patterns; Arcademia's face.
