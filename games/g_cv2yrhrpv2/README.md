# Kickrani (킥라니) — game package `g_cv2yrhrpv2`

Plush animals race electric scooters through the real streets of Seoul. A game package
(docs/platform-architecture.md, "Game packages, draft and production"): this folder is the
**draft**; players get the **production** release in `releases/g_cv2yrhrpv2/`. The folder
name is a shortcode and never changes; `game.json` holds the slug (`kickrani`) and the
platform id (`official:seoul`, kept so saves and links still work). Design notes:
docs/seoul.md; the city data: `npm run geo:seoul` (data/geo, never committed).

## Fast loop

    npm run game:dev -- kickrani                          # the platform, straight into the draft
    npm run game:dev -- kickrani --race 1 --autopilot 1 --laps 1 --time night --weather rain
    npm run game:test -- kickrani                         # its unit tests only (tests/unit files importing this folder + tests/)
    npm run game:smoke -- kickrani                        # one short headless load (dev server up)
    npm run game:changes -- kickrani                      # what production does not have yet
    npm run game:deploy -- kickrani --pick <hash,…>       # or --all

Scene params (`platform.params`, read by `devScene.js` once the city is open): `race=1` starts a
solo race at once, `course=<id>` (course.js), `laps=<n>`, `time=day|dusk|night|…` and
`weather=clear|rain|storm|snow|fog` (weather.js), `autopilot=1` (the bot rides for you), `hour=<0-24>`,
`mode=fly|walk|drive` (the free camera is `fly`).

## Where to look

The two big files are the hubs: **SeoulGame.js** (the city: loading tiles, the renderer and its
passes, modes, the frame loop — ~2.3k lines) and **race.js** (everything in a race — ~4.7k lines).
Most rules are in small pure modules with unit tests; **tuning numbers live at the top of each
module** as one exported constant (`SCOOT`, `CAR`, `BIKE`, `ITEMS`, `OIL`, `SMOKE`, `MARBLE`,
`THROW`, `POLICE`, `CHASE`…).

| File | What it does |
|---|---|
| `index.js` | the package entry: `mount(container, platform)` → `{ root, dispose }` |
| `game.json` | the manifest (code, id, slug, title, version, entry) |
| `SeoulGame.js` | the city screen: tiles, ground, renderer + bloom/AO/grade, fly/walk/drive, the loop, menus |
| `devScene.js` | scene params from the address (`race`, `course`, `laps`, `time`, `weather`, `autopilot`, `hour`, `mode`) |
| `controls.js` | the ONE controls table (keys, hint line, How to play) |
| `credits.js` | every third-party source with site and licence (Credits panel) |
| **Race** | |
| `race.js` | the race: lobby → grid → countdown → laps → finish; riders, bots, items, collisions, camera (`CHASE`) |
| `lobby.js` | the pre-race steps: rider → scooter → course → time/weather → go |
| `stage.js` | the 3D rooftop stage behind the lobby |
| `course.js` | the courses on real roads (`BIKE_COURSES`, `LEVELS`, costs) |
| `coursemap.js` | the course-picker map of Seoul |
| `minimap.js` | the in-race corner map |
| `pack.js` | lanes, the start grid, bike-to-bike contact (pure) |
| `progress.js` | best times, medals, unlocked levels (localStorage) |
| `podium.js` | the podium ceremony and its dance |
| `rivalPanel.js` | the manga panel when a rival closes in |
| `comic.js` | BONK!/WHOOSH! word bursts |
| `speedfx.js` | wind lines and speed feel |
| `trail.js` | the boost's light ribbon |
| `racefx.js` | skid marks, tyre smoke, sparks |
| `wetfx.js` | wet-road light streaks in rain |
| `bell.js` | the synthesised bike bell |
| **Riders and scooters** | |
| `crew.js` | the plush riders (names, colours, feel) — species from `src/shared/plushKit.js` |
| `plushRider.js` | the sculpted plush body on a scooter, poses, podium dance |
| `plush.js` | plush material and shell fur (WebGL2) |
| `helmet.js` | the golden helmet |
| `scoot.js` | scooter handling as numbers (`SCOOT`, `SCOOTERS`) |
| `scooter.js` | the scooter models (SSAENG brand) |
| `ride.js` | bicycle handling as numbers (`BIKE`) |
| **Items** | |
| `items.js` | item boxes, odds, the item list (`ITEMS`) |
| `branch.js` | the thrown branch (`THROW`) |
| `oil.js` | the oil slick (`OIL`) |
| `smoke.js` | the smoke cloud (`SMOKE`) |
| `marbles.js` | the marbles (`MARBLE`) |
| `police.js` | the police stop (`POLICE`) |
| **The city** | |
| `tiles.js` | the building tile format (shared with scripts/geo/seoul-build.mjs) |
| `alleys.js` | small streets (alleys.bin) and narrow-road rules |
| `bridges.js` | bridges joined to their roads |
| `roadLevel.js` | every street level from side to side (`levelNetwork`) |
| `surface.js` | what a rider stands on (road/pavement/alley heights) |
| `markings.js` | where road paint goes |
| `walls.js` | what a racer cannot ride through (footprints, garden walls) |
| `golmok.js` | the near alleys built as you come to them |
| `facades.js` | real building facades beside a course |
| `buildtypes.js` | what a building is and who rents it (pure) |
| `signs.js` | shop-sign atlases |
| `skyline.js` | hand-made skyline landmarks (Namsan Tower, 63 Building…) |
| `admiral.js` | Admiral Yi in bronze (far/near) |
| `yiStatue.js` | the supplied Admiral Yi sculpture (packed .bin) |
| `fountain.js` | the Gwanghwamun fountain and its show (day and night) |
| `square.js` | Gwanghwamun Square's one tuning block (`SQUARE`): the monuments' scale and places, the fountain's size and jets |
| `plaza.js` | squares the courses ride through (Gwanghwamun Square, Cheong Wa Dae's drive): paving, lane, solids |
| `fairground.js` | the Jamsil fun fair beside its course |
| `hillwood.js` | woods beside hill roads |
| `trees.js` | procedural ginkgos and plane trees |
| `sky.js` | sky dome, sun, colour grade |
| `aopass.js` | ambient occlusion that skips see-through quads |
| `weather.js` | clear/rain/storm/snow/fog, time picks (`WEATHERS`) |
| `mist.js` | ground mist in fog |
| `nightlights.js` | street lamps and headlights after dark |
| **Streets and people** | |
| `street.js` | walking, driving, traffic and pavements when not racing |
| `drive.js` | car handling as numbers (`CAR`) |
| `cars.js` | the car models and paints |
| `traffic.js` | race traffic on real roads (cars, buses, mopeds) |
| `junctions.js` | where traffic's roads meet: the box, lights, who goes in (`SIGNAL`) |
| `fleet.js` | traffic vehicle models |
| `life.js` | people on the pavements |
| `folk.js` | the Rocketbox walkers |
| `people.js` | you on foot (Mina, Jun) |
| `streetAssets.js` | what the library fetches for people/vehicles (data) |
| `tests/` | package tests (manifest, entry, import rules, this map) |

Imports: this folder, `three`, npm packages, and the stable shared libraries
(`src/shared/…`, `src/net/Session.js`, `src/ui/pop.js`'s confetti). Never `src/snowpuff` or
`src/arcademia` directly — `src/shared/plushKit.js` is the contract for what Kickrani borrows.
