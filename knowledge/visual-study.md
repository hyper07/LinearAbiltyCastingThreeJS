# Visual study: 295 reference screenshots, and what to build from them

The user collected 295 phone screenshots in `images/` (never committed): game
HUDs, skill effects, skill bars, character-select and dress-up screens, maps,
scenes, AI-generated mood stills, a few real photos, and **concept images for
games they want to make**. Every image was viewed and catalogued. This file is
the distilled design knowledge. Each section ends with **Do** lines.

- **Catalogue:** [visual-refs.json](visual-refs.json) has one record per image
  (`ref.img-0252` ↔ `images/IMG_0252.PNG`): type, quality 1–5, lessons with
  measurements, every HUD element and its position, effect layers, palette
  (hex), lighting, camera, concept, tags, which game it serves, and the source
  game (for our attribution only).
- **Search:** `npm run kb -- skill wheel mobile`, `npm run kb -- violet forest`,
  `npm run kb -- plush --kind visual-ref`. Records rated 1 (blurry,
  duplicate, irrelevant) are kept in the catalogue but left out of search.
- **Rendering:** how to make these looks in three.js is in
  [render-quality.md](render-quality.md).
- **Second batch:** 93 more screenshots in `images2/` (`ref.img2-0258` ↔
  `images2/IMG_0258.PNG`), studied 2026-11-24: racing cars, RC cars and FPV
  drones in [racing-study.md](racing-study.md), scene moods in §11 below.
- **Rule:** learn the layout, measurement, colour and timing; build original
  games. Never rebuild a specific game's screens, characters or art.

## Contents

1. [What is in the collection](#1-what-is-in-the-collection)
2. [The games the user wants: concepts](#2-the-games-the-user-wants-concepts)
3. [HUD layouts, measured](#3-hud-layouts-measured)
4. [Aligning skills: bars, wheels and grids](#4-aligning-skills-bars-wheels-and-grids)
5. [Skill and hit effects](#5-skill-and-hit-effects)
6. [Character select, dress-up and menus](#6-character-select-dress-up-and-menus)
7. [Maps and route screens](#7-maps-and-route-screens)
8. [Scenes, light and palettes](#8-scenes-light-and-palettes)
9. [What each focus game should take](#9-what-each-focus-game-should-take)
10. [The best references](#10-the-best-references)
11. [Second batch (images2/): scene moods](#11-second-batch-images2-scene-moods)

---

## 1. What is in the collection

| Type | Count | | Type | Count |
| --- | --- | --- | --- | --- |
| Scene / environment | 97 | | Character art | 13 |
| HUD during play | 44 | | Character select / dress-up | 5 |
| Cinematic | 38 | | Map UI | 5 |
| Combat | 30 | | Menus, skill trees, dialogue, inventory | 9 |
| Real photo | 28 | | Other | 4 |
| Skill effect | 22 | | | |

Quality: 32 rated 5, 80 rated 4, 88 rated 3, 52 rated 2, 43 rated 1.

Styles seen: souls-likes, monster hunting, open-world action, ray-traced MMO
remasters, mobile MMOs and their ads, HD-2D turn-based RPGs and towns, a
tilt-shift voxel ARPG, stylised co-op kids' adventures, creature-riding
games, AI-generated anime and sci-fi stills, and photos of shrines, lantern
festivals, snow slopes and cities.

## 2. The games the user wants: concepts

35 images are concepts, not just references. The clear direction: **fun games
for kids starring cute doll / plush / toy characters**, in bright worlds.

| Concept | Images | What it implies |
| --- | --- | --- |
| **Plush bunny snowboarding** (the headline idea) | `ref.img-0252` | A kids' downhill snowboard game: carve, collect stars, easy tricks, soft bumps. The hero is a round, fuzzy, hot-pink bunny suit with long ears and chunky orange goggles: toddler proportions, reads from far away as pink on white with a crisp blue shadow. Palette `#f0f0f4 #ff5aa8 #ff9ac8 #2a6ad8 #f08a2a`. |
| **Plush animal friends** | `ref.img-0246` | A cast of four plush animals (pig, cat, bear, frog) in matching pyjamas: head ≈ 55 % of height, bead eyes, a stitched one-line mouth, pink blush ovals, fuzzy fibre surface, soft studio light, very soft contact shadows. Same outfit, one colour per species. A buddy cast for Arcademia or a party game. |
| Snowball roller on an icy river | `ref.img-0146` | Push a growing snowball, collect bells; plush-soft snow, lavender and ice blue. Pairs with the bunny idea as a second winter mode. |
| Skate runner through a seaside town | `ref.img-0178`, `0184`, `0239`, `9998` | A bright downhill skate runner for kids, sometimes with a giant cat buddy that copies tricks; cel-shaded, bold single-colour outfits. |
| Creature befriending and riding | `ref.img-9951`, `9952`, `9953`, `9959` | A kid explorer rides round fluffy animals and silly huge-beaked birds through lime and pastel biomes; funny cave brutes as enemies. |
| Chibi dress-up and mounts | `ref.img-0154`, `0155`, `0242` | Dress the buddy on an empty lit stage; locked items visible with a padlock; style score; a goggled duck mount. Arcademia's buddy. |
| Maths battles | `ref.img-9960` | The attack *is* the question: equation large, four answers in a 2 × 2 grid, cute slime enemies, a parent/teacher mastery dashboard. Arcademia. |
| Cute monster hordes | `ref.img-0133`, `0127`, `0130`, `9989` | Round vinyl baby dinos in three colour variants, fluffy sassy creatures, WANTED-poster bosses with star difficulty, friendly-scary orcs and skeletons. |
| Kids' co-op in a glowing forest | `ref.img-0137`, `0145`, `0062`, `0110`, `9950` | Chunky cartoon kids (≈ 1 : 4) exploring glowing-mushroom woods; a fern sprite on a mossy floor; drifting jellyfish spirits; a child whose lantern drives away smoke phantoms (Lanternwood). |
| Toy-like places | `ref.img-0165`, `0069`, `0084`, `0087`, `0107`, `0254` | Clay dome houses on giant mushrooms, a storybook treehouse hub, sky-ship travel over a sparkling sea, a saucer base with pods. |

**What "cute doll character" means across these images**
- Big head (1 : 1 for plush, 1 : 2–1 : 4 for chibi kids), stubby limbs, wide
  waddling stance, no neck.
- Faces minimal and low on the head: bead or big glossy eyes, a tiny or
  stitched mouth, blush ovals.
- A material you can almost touch: fur, felt, vinyl, clay. Soft studio light,
  no hard specular, AO that grounds them.
- One bold accent per character (goggles, a back accessory, a hat) and one
  dominant colour, so a cast reads at a glance.

**Do:** treat the plush bunny snowboarder as a candidate new game for the
build queue (it fits none of the three focus games). Render and character
recipes: render-quality.md §6 (plush, fur shells, vinyl) and §7 (snow
trails). Ready assets: the rigged Mesh2Motion bunny (234 clips) and the VRM
rabbit.

## 3. HUD layouts, measured

Percentages are of screen width unless marked.

**PC / console action RPG and MMO** (`ref.img-0044`, `0217`)
```
┌───────────────────────────────────────────────────────────────┐
│ party frames      [ BOSS NAME  lvl ]               ┌──────┐   │
│ ▭▭▭               ████████████░░░  ~25%           │ map  │   │
│                   debuff icons                     └──────┘   │
│                                                    quest list │
│                                                               │
│                         (play)                                │
│                                                               │
│ chat / log          buffs ▪▪▪▪▪▪                              │
│                ███████HP████ ◆lvl ████MP███████  ~18% each    │
│                [1][2][3][4][5][6][7][8][9][0]  hotbar ~25%    │
└───────────────────────────────────────────────────────────────┘
```

**Souls-like** (`ref.img-0161`): three thin stacked bars top-left (HP red, FP
blue, stamina green, 15–20 %), flask count under them; boss bar bottom-centre
about 42 % wide and very thin, name in small text above its left end; a
four-slot equipment cross bottom-left. The top of the screen stays clear.
Elsewhere the boss bar sits top-centre at 25–50 % width, about 1 % tall.

**Mobile action / MMO** (`ref.img-0201`, `0222`, `0135`, `0193`)
```
┌───────────────────────────────────────────────────────────────┐
│ (◉) name lv  ███HP      [target ███]          ⌂ ☰    ╭────╮  │
│     ███MP  ▪exp                                       │map │  │
│                                                       ╰────╯  │
│                       (play)                   < 1/6 >        │
│                                              (+)  (9)  (0)    │
│   ╭─────╮                                  (8)  (3)  (4)      │
│   │  ◯  │ joystick ~11%                 (2)          ⬤ ATTACK │
│   ╰─────╯ left 35% is the stick zone      (1)  (5)    ~7–10%  │
└───────────────────────────────────────────────────────────────┘
```
- Joystick ring about 11 % wide around 18 % from the left, 75 % down; or a
  floating stick that appears where the thumb lands anywhere in the left 35 %.
- Player frame top-left (round portrait with HP, MP, energy bars), target
  frame beside it, round minimap top-right at 8–13 %, currency above it.

**HD-2D** (`ref.img-0123`, `0089`, `0202`): three pixel hearts top-left
(about 2 % each), a round minimap top-right with a small day/night clock orb
overlapping it and the zone name beneath, weapon and potion slots bottom-left
with counts like `3/3`. Turn-based: a vertical rail of diamond turn-order
portraits on the left edge (about 5 %), slanted party cards top-right, and a
command menu that opens beside the acting hero (about 25 %) with a tooltip
stating cost and multiplier.

**Minimal / immersive**: a compass strip across the top with objective
distance instead of a minimap (`ref.img-0137`); hearts, crescent orbs with
3–4 charge pips, or blood-drop pips for health.

**Small touches that recur:** damage numbers in large white or yellow digits
with a dark outline, stacking upward with a random x jitter; words like
BLOCK or FRONT beside them to teach a mechanic; a gold serif line centre
screen for boss-phase changes; a top-centre pill toast for "2× speed"; red
"new" dots on tabs; a MM:SS timer with three star goals listed under it.

**Do:**
- Keep the screen centre and the space around the character clear; HUD lives
  in the four corners and the bottom edge.
- Every RPG keeps the corner minimap (house rule); a compass strip may be
  added, not substituted.
- On touch, reserve the left 35 % for movement and never put buttons there.

## 4. Aligning skills: bars, wheels and grids

Three layouts cover almost every reference:

| Layout | Where | Use when |
| --- | --- | --- |
| **Hotbar row** | Bottom-centre, 6–10 square slots, ≈ 25 % width, key numbers in a corner, stack counts in the other | Keyboard; many skills; PC-style Gloamreach |
| **Arc around a big attack button** | Bottom-right. Attack button 7–10 % wide; 4–9 round skills of ≈ 4 % on one or two arcs at its upper-left | Touch; action games; a thumb reaches every slot without moving the hand |
| **Grid with an evade pill** | Bottom-right, 3 rows of round buttons (≈ 9 % of height) and a wide dodge pill at the bottom | Touch with many skills |

Rules seen across all of them:
- **Cooldowns:** a radial dark sweep plus the remaining seconds as a big
  number in the middle (`2.0`, `5.3`); the whole icon greys while it can't be
  used; a short flash and pop when it comes back.
- **Pages:** a `< 1/6 >` pager swaps whole skill sets without more buttons.
- **Empty slots** show a `+` so players learn the bar is theirs to fill.
- **The selected skill** grows, gets a bright ring and its name in spaced caps
  below (`ref.img-9947`); keep the bar the same shape across every spell.
- **One element, one colour** on the icon frame too (fire orange, ice pale
  blue, nature green, void purple, holy gold).
- **Labels follow the input:** number keys on keyboard, button glyphs on a
  pad (`ref.img-0217`), none on touch.
- Buff icons sit in a row directly above the HP bar or hotbar, with minutes
  printed under each.

**Do:** use numbers for skills and items and **never Q/E for potions** (house
key rules; H opens How to Play). For kids (Arcademia, the bunny idea) use 2–4
big round buttons with pictures, no numbers and no cooldown maths: show
readiness by a filling ring and a bounce.

## 5. Skill and hit effects

Anatomy, from the clearest references (`ref.img-0217`, `0206`, `0193`,
`9947`):

1. A white-hot **core**, smallest and brightest.
2. A coloured **glow** about 3–6× wider than the core, feeding bloom.
3. **Streaks or sparks**: two thin cross streaks for a parry, radial streaks
   for an explosion, spark spray outward.
4. A **ground decal or ring**: scorch, frost or a thick neon ring.
5. A brief **full-screen colour wash** only for big casts.

Timings: a parry or clash flash lasts 0.15–0.25 s, a slash crescent covering
about a third of a circle lasts about 0.2 s, and an ultimate owns the screen
for about 1 s (a sky disc about 35 % wide, a funnel of streaks, a blinding
impact, embers).

Shapes that read well: a black hole is a black core, a thin bright ring and a
flattened violet disc; summons are stacked white rune circles turning in
opposite directions; shields are domes with a fresnel rim; area warnings are
red or gold ellipses or cyan arcs with a filling edge; strikes from the sky
are tall yellow-white pillars with ground rings, several at different depths.

Colour language: gold/white is holy and healing, green/yellow buffs and
shields, cyan ice and lightning, magenta/violet void, orange fire, red the
enemy. The strongest single rule: **contrast the effect against the scene**,
warm effects in cool scenes and cool effects on warm ground; a desaturated
grey world makes one orange flash the brightest thing on screen.

**Do:** build effects with the layer stack in render-quality.md §8 and our
modules (`RibbonGeometry`, `GroundDecals`, `ScreenFlash`, `CameraShake`,
`LightPool`, `BurstSphere`); pixel versions with `playFx()`.

## 6. Character select, dress-up and menus

- **Dress-up stage** (`ref.img-0154`, `0242`): the character centred at about
  55 % width on an empty, softly lit stage (starry sky or plain floor with
  sparkles); an item grid on the left (about 20 %, three columns of portrait
  cards) with a category rail at the far left; locked items show the real
  thumbnail under a padlock; equipped gets a gold border; a score badge
  top-right; new items sparkle.
- **Character sheet** (`ref.img-9972`, `9973`): the 3D model in the centre
  inside a ring of six sockets (locked ones padlocked), so progress reads as
  "fill the ring"; round tabs down the left with red "new" dots; party
  portraits top-right with the active one ringed; stats on a parchment card;
  unlearned skills stay visible but greyed with "Not Learned".
- **Skill board** (`ref.img-0014`): a radial cluster of hex nodes with cost
  tags; the portrait bleeds past the panel edge.
- **Versus screen**: mirrored fighters, a giant brush-stroke VS, vertical names.
- **Bounty card** (`ref.img-0130`): a WANTED poster with reward and five-star
  difficulty introduces a boss.
- **Title screen with classes** (`ref.img-0249`): each class reads by one
  dominant costume shape and one colour.

**Do:** character select and dress-up get depth of field, a turntable, a rim
light and a soft floor reflection (render-quality.md §3–4); show what can be
earned, never hide it.

## 7. Maps and route screens

- **Route map** (`ref.img-9982`): diamond nodes coloured by type (red fight,
  blue treasure, gold `?` event, green rest), climbing bottom to top; only the
  next 2–3 reachable nodes are linked by dotted lines from the player token;
  hovering a node previews what's there in the world view.
- **Fast travel** (`ref.img-0233`): a parchment map on the left, a list of
  places on the right, `???` for undiscovered ones.
- **Zone reveal**: a dark arch or tunnel opening onto a bright place, or a
  centred serif zone title between thin rules.

## 8. Scenes, light and palettes

| Mood | Recipe | Refs |
| --- | --- | --- |
| Golden-hour village | Low raking sun, long shadows, backlit grass rims, peach haze, layered silhouettes. `#e0b080 #c08a5a #5a6a8a #6a9a4a #f0d8b0` | `ref.img-0123` |
| Violet lamp forest | Purple fog far, green-cyan lit grass mid, blue-white lamp orbs on short posts every 4–6 m along the path, giant trunks 5–10× player height with homes at their base, pink flower specks. `#2a1a3a #6a3a8a #a05ac8 #3a8a3a #8ae8ff #e85a8a` | `ref.img-9924-2` |
| Violet forest at night | Deep maroon/indigo base; warm amber fireflies high and sparse, magenta motes low and clustered; the hero always beside the one warm light. `#2a0a2a #5a1a3a #ff6ad8 #ffb84a #3a2a8a` | `ref.img-0181` |
| Glowing-mushroom night | Emissive cyan caps in crimson grass (complementary), denser where the path goes, purple fog, warm candles. `#2a0a1a #8a1a20 #40c0ff #3a2a5a #e0a040` | `ref.img-0137` |
| Lava rift | Black basalt, lava as the light from below, only the player cool-coloured | (WoW-remaster frames, batch B) |
| HD-2D | Pixel sprites 4–8 % of screen height on painted 3D ground with soft real shadows; tilt-shift depth of field, bloom, vignette | `ref.img-0202`, `9933`, `0237` |
| Sunny snow | Near-white with blue shadow sides, sparkle, groomed grooves, carve trails | `ref.img-0252` |
| Plush studio | Off-white sweep, big diffuse key, gentle AO contact shadows, no hard highlights | `ref.img-0246` |

Rules that recur: night scenes are one cool base with 1–2 warm lights that
mark the path or safe spot; glow objects double as path markers; landmarks
(a pagoda, a tower, a light at the top of the stairs, a ring gate) pull the
player forward.

## 9. What each focus game should take

**Gloamreach** (fantasy action RPG; 146 references tagged)
- The violet-forest and lamp-post recipes above, and the hero-beside-the-warm-light rule.
- PC hotbar bottom-centre with HP/MP split by a level badge; boss bar top-centre; corner minimap kept.
- Parry/clash flash, crescent slashes, rune-circle summons, black-hole void spells.
- Character sheet with a socket ring; zone-reveal titles.

**Lanternwood** (HD-2D; 66 tagged)
- Hearts top-left, round minimap with a day/night orb, weapon/potion slots bottom-left.
- Tilt-shift + bloom + vignette already in `src/hd2d/post.js`; add the warm-light-on-cool-night path rule.
- A child-with-lantern-vs-shadows mood (`ref.img-9950`) fits its story.

**AI Arcademia** (kids 6–13; 87 tagged)
- The maths-battle panel (`ref.img-9960`): question big, four answers 2 × 2, cute slime foes, parent dashboard with mastery bars.
- Dress-up stage with visible locked items and a style score; plush buddy cast (`ref.img-0246`); goggled duck mount.
- Big round picture buttons, no cooldown numbers; three-star goals with a timer.

## 10. The best references

| Ref | Why |
| --- | --- |
| `ref.img-0252` | The plush bunny snowboard concept |
| `ref.img-0246` | Plush doll character design: proportions, faces, material, light |
| `ref.img-0044` | The complete MMO raid HUD, arc telegraph, positional damage text |
| `ref.img-0201`, `0222`, `0193`, `0135` | Mobile skill wheels and grids, joystick zones, cooldown numbers, pager, `+` slots |
| `ref.img-0161` | Souls layout: stacked bars, bottom boss bar, equipment cross |
| `ref.img-0217` | Ultimate effect anatomy with a pad-mapped skill row |
| `ref.img-0206` | Textbook parry flash |
| `ref.img-9947`, `9948` | Seven-element spell bar, black hole, rune circles |
| `ref.img-0089`, `0090`, `0121`, `0244`, `0250` | HD-2D turn battles: turn rail, command menu, tooltips, party cards |
| `ref.img-0123`, `0124` | HD-2D town HUD and golden hour |
| `ref.img-0154`, `0155`, `0242` | Dress-up stage, mounts, costume showcase |
| `ref.img-9972`, `9973` | Character sheet with socket ring, skills menu |
| `ref.img-9982` | Roguelite route map |
| `ref.img-9960` | Maths battle and parent dashboard |
| `ref.img-0181`, `9924-2`, `0137` | Violet forest, lamp-orb paths, glowing mushrooms |

## 11. Second batch (images2/): scene moods

Of the 93 screenshots in `images2/`, about 20 are vehicles (see
[racing-study.md](racing-study.md)); the rest are mostly AI-generated mood
stills, a few photos of Japan and Korea, and MMO / ARPG shots. Patterns:

| Mood | Refs | What to take |
|---|---|---|
| Cosy window: warm inside, cool outside | 0262, 0323, 0332, 0338, 0349 | ~60/40 cool/warm; few warm sources, dark materials, a big window onto blue night or rain |
| Snow at night | 0266, 0291, 0328, 0339 | everything in blue values (`#1b2a5a`→`#9fb3e8`), the path lightest, one amber lantern (`#ffb347`); a Korean palace in snow (0291) as a winter backdrop. Snowpuff night runs |
| Lanterns and festivals | 0276, 0319, 0339 | many small warm points, each with a soft halo in fog; instance thousands cheaply |
| Rain, wet paths | 0306, 0307, 0321, 0335, 0344, 0346 | wet = darker + glossy; lights smear into vertical streaks; mist planes for depth |
| Autumn | 0331, 0340, 0341, 0344, 0348 | red/orange canopy + green moss; leaves carpet the path and lead the eye; framing branches |
| Summer anime | 0300, 0306, 0322 | cobalt sky, huge white cumulus, turquoise water, saturated greens, soft shadows |
| Japanese shrines and terraces | 0281, 0282, 0309, 0317 | one red torii as the focal point; flooded terraces mirror the sky; sun aligned with a straight path |
| Korean night villages | 0291, 0324 | dark greens, a few warm windows, curving roads into the dark |
| Sci-fi megacities | 0289, 0294, 0296, 0297, 0305 | vertical clutter + warm windows in cool rain; layered traffic at heights |
| Scale vistas | 0265, 0274, 0288, 0295 | tiny figure, giant landform; warm aerial haze with distance |
| Kids' cute | 0304 (hamsters in knitted hats), 0303 (spiral flower maze) | small animals in soft knitted hats; a spiral of round bushes as a ready-made kids' course |
| Game HUD | 0263 (ARPG orbs + vortex spell), 0258 (rider on a beast) | health/mana orbs in the bottom corners, skills between; spiral spell = bright thin rings + floor glow decal |

0311 and 0320 show existing cartoon characters: take the mood only, never the
characters.

