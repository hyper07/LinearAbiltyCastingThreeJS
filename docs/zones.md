# Zones, portals and hubs

[← Back to the README](../README.md)

The open worlds — [Gloamreach](gloamreach.md), [Wyldhunt](wyldhunt.md) and
[Kithvale](kithvale.md) — are made of **medium-sized zones** joined by portals
and gateways. Only one zone is built at a time: walking through a door swirls
the view shut in the destination's colours, a card names where you're going,
the game lets go of every trace of the old zone (geometry, materials, textures,
render targets, lights, people, monsters) and builds the new one, and the view
opens again — about 1.5–2 s on an Apple M-series Mac. Every zone has a **safe
hub**. The framework is shared: `src/shared/zones/`.

## The zones

| Game | Zone | Built (m) | Hub | Doors |
| --- | --- | --- | --- | --- |
| Gloamreach | **Brindlewick** — the village, fields, woods, the overlook | 298 × 300 | Brindlewick Square | The Warden's Gate → Gloamwood · the Cinder Stair → Cinder Rift |
| | **The Gloamwood** | 300 × 280 | Keepers' Grove | The Warden's Gate → Brindlewick |
| | **The Cinder Rift** — walkable now; Cindermaw on Emberfall Ledge | 226 × 260 | Ashward Outpost | The Cinder Stair → Brindlewick |
| Wyldhunt | **Lantern Camp** — the base camp | 220 × 200 | Lantern Camp | The Hunters' Gate → Veilfall Reach · the Southern Trail (coming soon) |
| | **Veilfall Reach** — the lower gorge: the cleft, the colonnade, the ford, Veilfall, the Root Gate | 275 × 300 | The forward camp | The Hunters' Gate → Lantern Camp · the Stair of Roots → the Hollow Heights |
| | **The Hollow Heights** — above the stair: the meadow, the rope bridge, Fernspill, the Gnarlhorn's den, the Grand Fall | 290 × 478 (a canyon: its floor is 30–130 m wide, about 43,000 m² of it) | Kestrel Lookout | The Stair of Roots → Veilfall Reach |
| | *The Emberwilds* — a stub for the next hunting ground | — | — | — |
| Kithvale | **Lanternrest** — inside the walls, the Kith Garden | 220 × 180 | Lanternrest (plaza, teahouse, shop) | The big gate → the vale |
| | **The vale** — meadows, the Hushwood, the pond, the shrine | 360 × 350 | Windbell Shrine | The big gate → Lanternrest |

"Built" is the zone's bounds: the land made and everything placed. The old single
maps were 360 × 570 (Gloamreach), 440 × 950 (Wyldhunt) and 400 × 480 (Kithvale); Wyldhunt's gorge
was one 340 × 752 zone until it was split at the Stair of Roots. The Hollow Heights is still longer
than 300 m (the canyon runs north for another 480 m above the stair, and the Grand Fall closes it),
but narrow: its walkable floor is about 43,000 m², under half a 300 × 300 map (the Reach's is
about 33,000 m²).

### Wyldhunt's gorge, split

The Stair of Roots, a step in the canyon's floor about a third of the way up, divides the gorge:
the roots of the giants on the step spill down it from wall to wall (`rootwall.js`; the line is
`rootLine(x)` in `zones.js`, and `zoneAt` puts everything below it in the Reach and above it in the
Heights), and the stair climbs through the Root Stair, an arch of two twisted roots with a veil of
mist. Each side builds a few metres past the roots and hides the rest behind a bank of mist, as the
palisade does at the Hunters' Gate.

The Gnarlhorn lives in one zone, the Heights, with its den: four of its five haunts were already
above the stair, and the fifth (the ford) became the shallows below its den. Letting it cross would
mean building its rig and fur in both zones and a fight that could straddle a door into a zone that
isn't built. Instead the zones that don't have it name the door toward it (`huntWay`): its old
prints lie up the path in the Reach, tracking carries through the gates, and once it's tracked the
scout flies (and the map) lead to that door. Its state carries too: its wounds, broken horns and a
severed club are kept while you're away (`WyldhuntGame._wakeHunt`).

A save from the single gorge (`mistfall-gorge`) is upgraded as it's read (`upgradeSave`, passed to
`loadZoneSave` as `upgrade`): gathered spots go to the zone that holds each, places by where they
are, hunts to the Heights, where you stood to the zone that holds it; the forward camp kept its id,
so waystones and the last hub rested at carry over unchanged.

## A hub

Every zone has one: a village, camp or sanctuary, with a soft visible edge
(lanterns and banners on posts round a faint line of light on the ground), a
**Safe** label on the HUD while you're inside, and:

| Service | What it does |
| --- | --- |
| **Map board** | Opens the full map on its **World** tab: every zone, the doors between them, unvisited zones as "?", hubs whose waystone you've woken marked ◆ |
| **Guide / notices** | What's in this zone, the found-so-far counters (chests, elites, bosses, gathering spots, friends, places), tips, and the zone's story hooks |
| **Stash** | Your bag on one side, the stash (the same chest in every hub) on the other: click to move, Sort, Store all, Take all; gear compares with what you wear. Kithvale stores treats and keepsakes |
| **Stats** | The hero screen (Gloamreach's character panel, Wyldhunt's hunter sheet, Kithvale's journal), and in Gloamreach and Wyldhunt a stand with your double in your gear |
| **Merchant** | Buy, sell, refill potions (gold in Gloamreach, coins in Wyldhunt, petals in Kithvale) |
| **Rest** | A full heal, and where you wake after falling |
| **Waystone** | Fast travel between the hubs you've reached |

Inside the ring no blow lands and you can't attack; monsters give up the chase
at the edge (they leash home) and can't step over it. Use a service with the
game's interact key (F in Gloamreach, E in Wyldhunt and Kithvale).

## Files

| Part | File |
| --- | --- |
| What a zone is, the checks, portals, the hub's ring, the World graph (pure) | `src/shared/zones/zone.js` |
| The per-zone save: records, waystones, last hub, stash, flags, the game's own data (pure, versioned) | `src/shared/zones/state.js` |
| Hub rules: safety, monsters kept out, waystones, where you wake (pure) | `src/shared/zones/hub.js` |
| The stash's moves (pure) | `src/shared/zones/stash.js` |
| Building only a zone's part of a scatter | `src/shared/zones/keep.js` |
| The manager: one zone at a time, doors, preloading, trips | `src/shared/zones/manager.js` |
| The trip's swirl and card | `src/shared/zones/transition.js` |
| Letting go of a whole scene | `src/shared/zones/dispose.js` |
| Hub and door props: veils, arches, edges, a carved rune waystone (it glows once reached), a framed map board painted from the zone's map, a notice board, an iron-banded chest whose lid opens, a stall under a striped awning, a gear stand, a bed by a fire — styled per game (`timber`, `bamboo`, `lacquer`), merged to about a dozen draws | `src/shared/zones/props.js` |
| Hub screens: Safe label, guide, waystone, stash, shop, stats | `src/shared/zones/hubUi.js` |
| The World tab | `src/shared/worldMap.js` (`world`, `openWorld()`) |
| Each game's zones (data, what belongs where, its migration) | `src/gloamreach/zones.js`, `src/wyldhunt/zones.js`, `src/kithvale/zones.js` |
| Wyldhunt's root wall and Root Stair · Kestrel Lookout | `src/wyldhunt/rootwall.js` · `src/wyldhunt/lookout.js` |
| The Cinder Rift's floor (pure) | `src/gloamreach/rift.js` |
| Wyldhunt's palisade and gate | `src/wyldhunt/palisade.js` |
| Tests | `tests/unit/zones.test.mjs`, `tests/e2e/zones.mjs` |

## How to add a zone

1. **A data entry** in the game's `zones.js` (`defineZone`):

   ```js
   {
     id: 'mossfen', name: 'The Mossfen', sub: 'wet ground, low light', theme: 'jungle',
     bounds: { x0: -150, x1: 150, z0: 400, z1: 700 },         // keep it ≤ about 300 × 300
     terrain: { source: 'wyldhunt' },                          // which height function builds the ground
     features: ['water', 'flora'],                             // which of the game's builders run
     world: [0.5, 0.85],                                       // where it sits on the World tab (0–1)
     spawns: { default: { x: 0, z: 420, yaw: 0 }, gate: { x: 0, z: 420, yaw: 0 } },
     portals: [{ id: 'fen-gate', name: 'The Fen Gate', x: 0, z: 405, shape: { type: 'box', hw: 3, hd: 1.4 }, to: 'base-camp', arrive: 'fen' }],
     pois: [{ id: 'sunken', name: 'The sunken hall', x: 40, z: 600, kind: 'place' }],
     hub: { id: 'fen-camp', name: 'Fen camp', x: 0, z: 430, r: 15, color: '#ffc46a',
            services: { waystone: {x: 6, z: 426}, map: {...}, info: {...}, stash: {...}, stats: {...}, merchant: {...}, rest: {...} } },
     story: { hooks: [] },
     tips: ['…']
   }
   ```

   `npm test` checks it: doors lead to zones that exist, arrivals lie inside the
   bounds and not inside the way back, the hub sits inside the zone with all
   seven services inside its ring, everything on the map belongs to one zone.
   A door to something not built yet is a stub zone (`{ id, name, stub: true }`)
   and a portal with `soon: true`.

2. **A builder, if it needs one.** Most zones are built by the game's own
   world builder, which builds the zone's `bounds` and runs only the
   `features` it lists; things placed from the game's lists (trees, rocks,
   people, monsters, nodes) are kept when `inZone(zone, x, z)` says they belong
   (`keepProps` filters a prop library the same way). A zone with ground of its
   own gives it a height function (the Cinder Rift: `rift.js` → `terrain:
   { source: 'rift' }`).

3. **A link from a portal.** Add a portal in the zone you come from (`to:` the
   new zone, `arrive:` one of its spawns) and one back. Give the door something
   to see: a `veil` (a swirling sheet in an opening) or an `arch` (a standing
   stone arch with one) — `props.js`.

4. **A story hook.** `story.hooks` is a list for quests and dialogue to come;
   nothing reads it yet except the hub's notice board, which shows each
   `{ id, title, text }`. A hook may set a flag in the save
   (`zoneSave.flags[...]`) when it's done, and a portal's `lock: { flag, text }`
   opens on that flag — the way to gate a zone behind a story.

The test that builds a toy world from data (`tests/unit/zones.test.mjs`, "a
toy world built from data") is the smallest example.

## Saving

Each game keeps its world in `localStorage['<game>.zones']` (version 1): the
zone you're in, zones visited, hubs reached (the waystone network), the last
hub rested at, per zone the chests opened, elites and bosses defeated, nodes
gathered, creatures befriended and places found, the stash, flags and the
game's own kept things. The first time, it is built from the game's older save:

- **Gloamreach** (`gloamreach.save` v1, still used for heroes): the chests each
  hero opened are counted in their zones; you start in Brindlewick, its square
  rested at.
- **Wyldhunt** kept only the hunter's look before (`wyldhunt.prefs`, unchanged):
  you start at Lantern Camp with the starting kit and 60 coins; the field bag
  and coins are kept from now on. A zone save from before the gorge was split
  is upgraded as it's read (above).
- **Kithvale** (`kithvale.save` v1, still used for friends and the satchel):
  befriended species, dug caches and broken boulders count in the vale's
  records, each dug cache's keepsake goes into your pouch, 20 petals to start.

## Measured

`game.bench(10)` in Playwright (Chromium, Apple M-series GPU, 1280×720, the
High tier, the sun's shadow redrawn every frame, clear weather), the hero at the
same spots on the old single maps and in the zones. GPU memory is three.js's
count of live geometries and textures; heap is the page's JS heap after a GC.

| Game · where | Draw calls | Triangles | Geometries | Textures | Heap (MB) |
| --- | --- | --- | --- | --- | --- |
| Gloamreach · Brindlewick square | 581 → 550 | 5.45 M → 4.31 M | 412 → 321 | 211 → 192 | 464 → 368 |
| Gloamreach · the overlook | 284 → 279 | 2.78 M → 2.79 M | 492 → 373 | 228 → 199 | 455 → 360 |
| Gloamreach · the Gloamwood | 337 → 327 | 4.55 M → 3.71 M | 437 → 180 | 221 → 119 | 458 → 400 |
| Gloamreach · Emberfall Ledge (old: up top; now in the rift) | 429 → 185 | 4.72 M → 0.96 M | 504 → 127 | 228 → 69 | 456 → 385 |
| Gloamreach · Ashward Outpost (new) | 264 | 1.00 M | 175 | 69 | 367 |
| Wyldhunt · Lantern Camp | 859 → 496 | 7.81 M → 2.81 M | 624 → 308 | 152 → 122 | 327 → 256 |
| Wyldhunt · the Colonnade | 750 → 721 | 7.54 M → 7.38 M | 635 → 608 | 152 → 123 | 322 → 316 |
| Wyldhunt · Velvet Meadow | 669 → 649 | 7.46 M → 7.15 M | 650 → 621 | 152 → 125 | 352 → 314 |
| Wyldhunt · the Grand Fall | 439 → 432 | 3.97 M → 4.07 M | 670 → 638 | 152 → 132 | 349 → 343 |
| Kithvale · Lanternrest | 267 → 146 | 1.95 M → 1.54 M | 225 → 115 | 95 → 70 | 288 → 256 |
| Kithvale · the bridge | 221 → 239 | 1.95 M → 1.96 M | 233 → 172 | 95 → 76 | 285 → 256 |
| Kithvale · Windbell Shrine | 350 → 345 | 2.71 M → 2.43 M | 281 → 237 | 98 → 87 | 288 → 259 |
| Kithvale · the Hushwood | 180 → 176 | 1.75 M → 1.73 M | 284 → 244 | 98 → 87 | 283 → 253 |

The camps and villages gain the most (only their own zone is built); the long
gorge and the open vale are most of their old maps, so they change least.
(Wyldhunt's gorge rows above are the gorge as one zone; it has since been split
at the Stair of Roots, below.)
Trips take 1.3–1.9 s (the first visit to the Gloamwood about 3.7 s, while its
trees' bark and leaves are painted, unless you walked up to the gate first:
the manager paints them in idle time as you approach).

### The gorge split, the new hub props

The same way (and the shadow forced to redraw on every frame of the bench), at
the same spots before and after: the gorge as one zone with the plain hub props
(commit `fca3e58`), then Veilfall Reach and the Hollow Heights with the dressed
props. Heap is `performance.memory.usedJSHeapSize` after a GC.

| Game · where | Zone now | Draw calls | Triangles | Geometries | Textures | Heap (MB) |
| --- | --- | --- | --- | --- | --- | --- |
| Wyldhunt · Lantern Camp | Lantern Camp | 536 → 542 | 3.13 M → 3.16 M | 308 → 311 | 123 → 127 | 268 → 271 |
| Wyldhunt · the forward camp | Veilfall Reach | 823 → 633 | 7.62 M → 6.79 M | 584 → 385 | 116 → 118 | 327 → 298 |
| Wyldhunt · the Colonnade | Veilfall Reach | 729 → 508 | 6.89 M → 5.70 M | 593 → 390 | 122 → 118 | 327 → 297 |
| Wyldhunt · below the Stair of Roots | Veilfall Reach | 672 → 360 | 6.46 M → 2.28 M | 603 → 390 | 125 → 118 | 328 → 298 |
| Wyldhunt · Kestrel Lookout (the stair's head) | Hollow Heights | 618 → 462 | 5.15 M → 2.25 M | 633 → 291 | 127 → 122 | 328 → 303 |
| Wyldhunt · Velvet Meadow | Hollow Heights | 646 → 692 | 7.26 M → 7.01 M | 640 → 455 | 131 → 126 | 328 → 303 |
| Wyldhunt · the Grand Fall | Hollow Heights | 398 → 359 | 2.88 M → 2.44 M | 653 → 469 | 134 → 129 | 328 → 304 |
| Gloamreach · Brindlewick Square | Brindlewick | 486 → 489 | 3.59 M → 3.61 M | 338 → 339 | 193 → 197 | 364 → 366 |
| Gloamreach · Keepers' Grove | The Gloamwood | 319 → 327 | 2.58 M → 2.61 M | 191 → 196 | 116 → 119 | 403 → 404 |
| Gloamreach · Ashward Outpost | The Cinder Rift | 216 → 225 | 0.58 M → 0.60 M | 153 → 160 | 71 → 72 | 373 → 374 |
| Kithvale · Lanternrest | Lanternrest | 146 → 152 | 1.54 M → 1.56 M | 115 → 118 | 70 → 72 | 256 → 259 |
| Kithvale · Windbell Shrine | The vale | 204 → 217 | 2.06 M → 2.09 M | 116 → 125 | 70 → 73 | 255 → 258 |

Each half of the gorge builds about two thirds of the geometry the whole did,
and the lower half's views up the gorge stop at the roots. Velvet Meadow looks
back at the lookout, the roots and the hub, so it draws a little more than
before. The dressed hub props cost 3–13 draws, 20–30 thousand triangles and
2–4 small textures a hub; the rift's new light adds a shadowless directional
light, a few pooled emitters and one instanced bed of coals.

### Memory over trips

Five round trips leave the heap, the geometry count and the texture count
where they started in every game (`tests/e2e/zones.mjs` checks it: Brindlewick ⇄
the Gloamwood, Veilfall Reach ⇄ the Hollow Heights, Lanternrest ⇄ the vale).
Two leaks were found and closed:

- **Gloamreach's 128 × 128 texture a zone load** was the flower-petal card
  (`foliage.js`'s `petalTexture`), made by every zone's grass and flowers and
  held only by the placement shaders' uniforms, which a material's dispose and
  the zone's walk can't see; `Foliage.dispose` now lets it go.
- **A texture a trip in Wyldhunt and Kithvale** came with the dressed props:
  three.js draws every shadow with one shared depth material and copies each
  caster's `map` onto it, and when a later caster has no map that uniform keeps
  pointing at the last one — so after a zone was let go, the next zone's
  shadow pass uploaded the old prop's texture again and nothing ever freed it.
  Textured props now cast through a plain depth material of their own
  (`props.js` `plainShadow`, also used by the root wall).
