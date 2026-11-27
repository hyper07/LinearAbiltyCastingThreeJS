# Kickrani (Seoul, for real)

[← Back to the README](../README.md)

Fly over the real Seoul, or walk its streets: every building in the city — 684,317 of them — at its
true place and height, on the real land: **Namsan with its tower, Bukhansan, the Han and its
bridges**, and the main roads. Visit all 25 districts, jump to the tallest towers, and slide the
clock to see the windows light up at night.

<p>
  <img src="screenshots/seoul-namsan.jpg" width="49%" alt="Namsan rising green out of the city with N Seoul Tower on its summit, roads winding round its foot" />
  <img src="screenshots/seoul-han.jpg" width="49%" alt="The Han river, blue, with bridges across it, seen over Yongsan toward Yeouido and the 63 building" />
</p>

<p>
  <img src="screenshots/seoul-fly.jpg" width="49%" alt="Flying over central Seoul in daylight: office towers with name and height labels over blocks of low buildings, the district 중구 named in the corner" />
  <img src="screenshots/seoul-night.jpg" width="49%" alt="Yeouido at night: the 63 building and its neighbours with lit windows, the dark river beside them" />
</p>
<p>
  <img src="screenshots/seoul-walk.jpg" width="49%" alt="Walking in Jongno: a traveller on the ground with buildings ahead" />
  <img src="screenshots/seoul-places.jpg" width="49%" alt="The places panel: the 25 districts as chips with the visited ones ticked, and the tallest named buildings with their heights" />
</p>

## The data, and what you may do with it

The buildings come from **국토교통부 GIS건물통합정보** (the Ministry of Land, Infrastructure and
Transport's national building register, [data.go.kr 15083092](https://www.data.go.kr/data/15083092/fileData.do)),
the file for 서울특별시 (`AL_D010_11_<date>`). Its licence is **공공누리 제1유형 (KOGL type 1)**: free to use,
including commercially, **with attribution** — the game credits it in its Credits panel (the small
**ⓒ Credits** button in the corner of the city and the race menu, and on the pause screen).

- **Nothing from the register is in this repository.** You download the file yourself and convert
  it; the tiles live in `data/geo/seoul/tiles/` (git-ignored).
- The register says its values are "for reference". Heights are missing for about half the
  buildings (then the number of floors is used, at 3.3 m each; with neither, 4 m), and a height far
  too tall for its floor count is treated as a typing slip.
- **The land** is from the **Copernicus DEM GLO-30** (© DLR e.V. 2010–2014 and © Airbus Defence and
  Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA; free to use with
  that credit). It is a model of the surface, so bumps narrower than a city block (buildings) are
  smoothed away and the hills kept. **Water is found from it**: where the model is low and
  perfectly level, it is the Han, a stream or a lake.
- **The main roads** (motorways down to tertiary roads; tunnels left out) are from **OpenStreetMap**
  (© OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright)). Roads over water
  are lifted onto a deck: the bridges. Roads are as wide as their lanes (OpenStreetMap's lane count, 3.25 m a lane), with
  Korean markings — a double yellow in the middle of a two-way road, on the median side of a one-way carriageway —
  worn wheel tracks, zebra crossings and stop lines at junctions, granite kerbs, the slab's edge, and on bridges a
  deep girder and a concrete parapet. Each bridge ramps down to the roads it meets on the banks (level
  across the road it meets and its pavements, then climbing), and
  where a bridge comes in several pieces (as Yanghwa and Dongjak do) they meet level, so every Han
  crossing drives straight through. Smaller streets are simply the gaps between buildings.
  Off the decks a road lies on the ground edge by edge (a point every 10 m, each edge and the middle
  line at the ground's height there), not level across at its middle's height: where roads cross on a
  hill they are one surface, not a ledge as tall as the crossing road's width times the slope (up to
  1.8 m on Haebangchon's). A pavement is cut where it meets another road, so it never lies across a
  crossing and a junction's corners aren't left as holes. The surface the riders stand on is
  `src/city/surface.js` (`surfaceOf`, tested in `tests/unit/city-surface.test.mjs`).
- **N Seoul Tower** is in the register as a single point, so the game draws its own plain tower
  there, to the real height. Two more landmarks are drawn by hand (`src/city/skyline.js`): the
  **Jamsil Sky Tower** (our name for the 555 m tower by Seokchon Lake, which the register leaves out — a
  square tapering and curving in to a split crown, silver-white glass) and the **63 Building** (in the
  register as one 250 m slab over its whole plot: drawn instead as its gold glass tower stepping in at
  both ends, on a low podium). No company name or logo. Both are always on the skyline: past the camera's
  far plane each is drawn as a smaller copy on the same line of sight, so they stand over the city from
  across the river and from the other courses; ordinary haze greys them to a pale silhouette (never
  gone), a fog bank hides them like everything else, and after dark their windows light and the tower's
  crown glows.
- Heights only shape the ground: **no elevation figure and no coordinate is ever shown.** Parks,
  subway lines and small streets are not in the map yet.
- All three credits, with every model, texture and the music, are in the Credits panel (kept off
  the screen during a live race), and the map's sources in full in the Places panel too.

## Setting it up

1. Download the 서울특별시 file from the page above (it is about 1.4 GB unzipped) and put its
   `.shp`, `.dbf` and `.prj` in `library/Seoul_Map.zip/`, `library/` or `data/geo/seoul/`.
2. `npm run geo:seoul` — under a minute the first time. It downloads the land (two elevation tiles,
   about 80 MB) and the roads (about 20 MB) into `data/geo/seoul/src/` once, then writes 2,285
   building tiles (23 MB), `terrain.bin` (7 MB), `roads.bin` (1 MB) and an index. `--offline` skips
   the downloads; without them the ground is flat and there are no roads.
3. Open **Kickrani** from the home page (it opens on the race menu; close it to explore the city). Without the tiles, the game says how to install them.

For a newer register file, repeat both steps. On a deployed server the tiles go in
`DATA_DIR/geo/seoul/tiles/`; they are served at `/geo/seoul/*`.

## How it plays

- **Fly** (the start): **W A S D** to move, **Space / C** up and down, **Shift** fast, drag to look,
  the wheel changes height. The higher you are, the farther you see and the faster you go. You
  stay above the ground, hills included.
- **Walk** (**F**, or the button): you on the street as a real person — **Mina** or **Jun**
  (**V** or the 🧍 button switches) — walking, or running with **Shift**; the wheel zooms.
  Buildings are solid, you climb the hills you walk up, and you stand on the roads — walk onto a
  bridge from its end and you cross the river on it; from the bank you pass underneath. Cars are
  parked at the roadside near you; **E** beside one gets in.
- **Drive** (the button, or **E** by a car): **W** to go, **S** to brake and then reverse, **A D**
  to steer, **Shift** (or **Space**) for the handbrake (it slides the back round), **H** for the horn, **E** to
  get out. The camera swings round behind the car unless you look about with the mouse; the speed
  is shown in km/h. Buildings and other cars stop you — nothing is damaged and nobody is hurt.
- **The street around you**: traffic on the real roads (OpenStreetMap), keeping to the right,
  at each road's own pace, slowing for what is ahead and sounding its horn if held up long;
  people walking the pavements, stepping aside from a car. A map in the corner turns with you:
  roads, cars, people, and north.
- **Places** (**M**): the 25 districts and the 400 tallest named buildings, with a search; a click
  takes you there. Names and heights float over the tall buildings in view.
- **Districts visited** are counted (out of 25) and kept on your device.
- **Time of day**: a slider from midnight to midnight moves the sun, colours the sky, and lights a
  share of every building's windows after dark.
- **View**: near, far or farthest — how many tiles are kept around you (800 m to 2 km, more when
  flying high).

## Kickrani: the scooter race

**🚲 Race** (the button; the game opens on it) is an electric-scooter race for four riders through
Seoul's real streets — and the streets stay open.

- **Before the race** (`src/city/lobby.js` over `src/city/stage.js`, the way Snowpuff Peaks' menus
  work — its files only read): a little 3D stage, a round plaza on a rooftop with the city behind
  it, and four steps, with **Back** at every one. **Rider**: the seven riders on their scooters on a
  turntable that turns the one you choose to the front, where it waves, wiggles its ears or hops;
  its name, Korean name, nickname and a big **READY**. **Scooter**: the six scooters on plinths behind
  your rider, the chosen one lifted and turning and your rider hopping onto it, with five animated
  bars. **Course**: a real map of Seoul (`src/city/coursemap.js`), drawn from the game's own data
  with nothing downloaded for it — the Han, streams and lakes and the wooded hills from the land
  (`terrain.bin`, with a hill shade), every road from `roads.bin` (motorways and trunk roads bold,
  tertiary roads thin, bridges dark-edged over the river), and close up the small streets
  (`alleys.bin`) and the buildings' footprints (the map tiles); the 25 districts, the hills, and
  landmarks (N Seoul Tower, Gyeongbokgung, the Jamsil Sky Tower, the 63 Building, City Hall, COEX…).
  Every course is drawn at its true size on its real streets in its own colour (Easy greens and
  blues, Medium ambers, Hard reds), with a pin at its start. Over the map, three **level tabs** —
  Easy, Medium, Hard, with one to three chillies (↑ ↓ too): picking one lists its courses below,
  leaves only its courses bright on the map (the others faint, their pins gone) and flies to fit
  them. Medium opens once an Easy race has been finished, Hard once a Medium one has (kept in this
  browser, `src/city/progress.js`); a course still shut says so on its card, and its **Try anyway**
  races it all the same. Each course's card and chip show its best time here and a medal (gold,
  silver, bronze) for its best place. A course picked or pointed at draws itself in along its streets
  and flows the way it is raced; pointing at a landmark says what it is. Drag to pan, the wheel or a pinch (or + −) to zoom, ⌂ for all of Seoul; pointing at a pin
  or a course's line previews it (the card: its shape and a dot riding round it, its length, lap
  time, sharp turns, share of wide roads, short cuts and the run to the first corner); a click
  picks it, and pointing at one in the list below flies there too. The map flies smoothly to the
  course picked and shows its route: a chequered start and finish, arrows the way it runs, its short
  cuts dotted, its sharp turns ringed, a rider running round it, and its length and turns beside it.
  What stands still is drawn once into 256-pixel tiles per zoom level and kept (the land per pixel,
  then buildings and roads); only the courses, pins and names are drawn each frame. Laps 1–3. **Time and weather**: cards for day, golden hour,
  dusk, night and Random × clear, rain, storm, snow, fog and Random, each a little animated sky —
  and the stage behind changes with them, live (the sky, the light, the lamps and windows, rain,
  snow, fog, a wet floor). Then **Race three bots**, or make or join a room. Keys: **← →** to choose
  (on the last step ← → the time, ↑ ↓ the weather), **Enter** for the next step, **Esc** or
  **Backspace** to go back; click (or tap) a rider or a scooter on the stage, swipe it to browse.
  The results' **Race again** starts the same race at once; **Courses** goes back to the map.
- **The finish and the podium** (`_finishCheck`, `_ceremony` in `src/city/race.js`, `src/city/podium.js`):
  once the first rider is over the line the race stays open **30 seconds** for the others
  (`FINISH_WINDOW`) — it ends when everyone is home or the window closes, never early because the
  people are done; whoever is still out is DNF, placed by how far they got. Home, your scooter cools
  down — steered along the course, braking to a stop (the downhill's run-out at once) — while the
  seconds left show small under your time ("⏱ 0:24"), with a small **Skip ⏎** (Enter too; in a room
  only the host's, sent to everyone). Then the **podium**: the first three home in time — nobody who
  didn't finish — stand on blocks a little short of the finish line, facing back down the course
  under the finish banner (a loop's one gantry reads START · 출발 on the grid and FINISH · 결승 from the green
  light on), in the city as it is (the time of day and the weather carry on; the
  traffic and the riders who aren't up there out of sight): 1st in the middle and highest, 2nd on its
  left, 3rd on its right as you look at it, a big 1, 2, 3 on the blocks in gold, silver and bronze,
  their scooters parked beside on their kickstands. They dance — each its own character's signature
  (see **Podium dances** below), all on the podium track's beat — ears and tails flopping after on
  springs. Confetti
  bursts from both ends and flutters down (one instanced draw), the victory fanfare plays and the
  podium's own track comes in; the camera swings slowly round and pushes in. Your own rider, up there,
  has a pulsing gold ring on its block, its top glowing with it (after dark a fill light over
  the podium). After 6.5 s — or on any key or click — the results come up, smaller and low, the
  podium still dancing above them; **Race again**, **Courses**, **Back to Seoul** and **Credits** as
  before, and each takes the podium down.
- **Podium dances** (`src/shared/motion/signatures.js`, played by `PlushRider.celebrate`; procedural,
  no clips): every rider has a signature dance of its own, original combos of the generic moves in
  `src/shared/motion/dance.js`. They are **slow and smooth, like real dancing**: in half time (the
  song is 143.6 BPM; the dances feel ~72, big gestures ~36), a pose lands on every other beat, holds,
  then flows to the next with a sine ease; the hips lead and the chest, arms and head follow 90–200 ms
  behind; the knees give in a soft groove, no hops. Every joint stays under 4 rad/s (tested):
  - **Mallow** (bunny, The Bounce): a gentle bounce-sway from foot to foot, the paws swinging in arcs,
    the ears flowing; the paws float up into a soft V and drift down; a cheer to finish.
  - **Peaches** (pig, Late Braker): a relaxed side-step with a clap on the half-time 2 and 4, a lazy
    sway with the belly circling, a shrug to finish — unbothered.
  - **Mochi** (cat, Corner Queen): a slow, sultry body wave and hip sway, a paw on the hip, the other
    sweeping out from the cheek in an arc; a pose to end.
  - **Pip** (fox, Straight-line Pip): slow chest pops, one every two beats, and a smooth arm wave
    rippling paw to paw; a point to end.
  - **Toffee** (bear, The Wall): a heavy, slow, proud two-step deep in the knees, big slow shoulder
    rolls, a flex to finish.
  - **Pickle** (frog, Kerb Hopper): a slow, wide squat-and-rise, the paws floating up as it rises, and
    a low splayed-leg wiggle that sinks and comes back.
  - **Pebble** (penguin, Rain Dancer): a smooth waddle-glide from foot to foot, flipper waves, and a
    slow full turn over two bars.

  Each runs eight bars — a hook, an answer, a variation, a phrase ending on its button — then again as
  one of four variants (other answers, mirrors, sizes), so it never loops two bars. All are locked to
  the podium track (Podium Party, 143.6 BPM measured; the song's position while it plays, counted from
  its top), each rider a hair off the beat. The place adds a flourish on top, once every two bars:
  the winner raises its arms slowly into a V (up over a beat and a half, held two beats, down over a
  beat and a half; out to the sides: a plush paw raised past ~50° vanishes behind the big head) with
  one soft hop as they arrive — the only hop in the dances; 2nd raises one paw the same way; 3rd a
  small V on the bars between. A finisher off the podium would just side-clap along (none is shown
  today). Ears and tails on soft springs driven by the body's motion, so they flow after it.
  The species, the place and the song's beat decide every pose (no randomness), so the browsers in a
  room dance alike with no animation traffic. All seven side by side: `/motion-lab.html?view=crew`
  (dev only, with a place picker). Tests: `tests/unit/motion-signatures.test.mjs`.
- **Courses, by level** (`LEVELS` in `src/city/course.js`; chillies on the map and the cards — one,
  two or three):
  - **Easy** — eight loops of 2–3 km (two to three minutes a lap) on Seoul's boulevards and avenues:
    Gwanghwamun Avenues, Dongdaemun Market, Namsan Hill Road, Hongdae Boulevards, Yeouido Riverside,
    Cheongnyangni Market, Teheran-ro Towers, Jamsil Tower Loop.
  - **Medium** — narrower avenues and a little of the residential lanes, 6–10 corners over 60°, a
    climb, a short cut or two, more traffic: Seochon Palace Lanes (under Inwangsan, two golmok short
    cuts), Seongsu Brick Works (the red-brick factory grid), and the **Jamsil Fairground** — round
    Seokchon Lake under the Jamsil Sky Tower, past the "Starlight Fun Fair · 별빛 놀이공원", a fair of our
    own (`src/city/fairground.js`, every ride our own design, no real park's castle, mascot or name):
    a wooden roller coaster on timber bents with a train of four cars (slow up the chain, fast down
    the drops), a 52 m drop tower whose ring of seats climbs, hangs and drops, a big wheel with sixteen
    gondolas kept level, a carousel with horses rising and falling, a pirate ship swinging higher and
    higher, bunting and strings of bulbs; the rides move when you are near, light up after dark, and
    you hear the fair as you pass (a band organ's waltz, the coaster's chain, screams on the drops).
    A fence along the course (solid) with an arch at the gate.
  - **Hard** — tight two-lane streets and residential lanes, square corners to drift, hills, golmok
    short cuts, parked cars, the busiest oncoming traffic, the sharpest bots: Euljiro Print Alleys,
    Mullae Ironworks, Haebangchon Hill Lanes (90 m up and down), and the **Namsan Tower Downhill** — a
    point-to-point run: a race gantry with start lights on the plaza under N Seoul Tower, then down
    Namsan's park road (two lanes, a double yellow line, steel guard rails either side — solid — and a
    wood of pines and November-coloured broadleaf trees, `src/city/hillwood.js`) and Sowol-ro to a
    finish gantry in the city below, about 145 m lower; speed builds downhill, so the braking points
    matter. One run, no laps; past the finish line a run-out to stop in.
  - **The zig-zags** (`zigzag` in `BIKE_COURSES`) — five more, round Seoul's best-known places, on the
    *local* streets: the secondary, tertiary and residential roads one lane each way or one-way, where a
    course turns left, right, left — at least 8 m between the buildings (`ZIG_MIN_WIDTH`; most lanes have
    no width on the map, so it is measured there, `measureRoom`; the Sky Tower's lanes 7 m, the Heritage
    Run's stone-wall road its own — `minRoad`), the big straight
    arterials (trunk and primary roads, two lanes or more each way) only to cross or for a short link,
    the golmok narrower than that only as short cuts. Medium: the **Gwanghwamun Heritage Run** (the user's own
    route round old Seoul, so on the big roads where it goes: down Sejong-daero's west side past the
    square, the Sejong Center and Cheonggye Plaza to Seoul Plaza, along Deoksugung's stone-wall road
    and up through Jeongdong, back by Saemunan-ro and up the east side, round in front of the
    Gwanghwamun gate; with the traffic, so the square's sides are swapped from a walker's map), **Banpo
    Riverside** (the Jamwon and Banpo side streets down to the Han and back) and **Yeouido 63 Lanes**
    (the island's back streets under the golden 63 Building). Hard: the **Bukak Skyway** (one way, the
    hairpins of the old ridge road over Bugaksan — Bukhansan's peaks to the north — between guard rails
    and pines, about 145 m down and 75 up) and the **Jamsil Sky Tower** (Songpa's lanes south of Seokchon
    Lake under the 555 m tower). Three more were planned and taken out again after the autopilot runs —
    Olympic Park (Bangi-dong's grid), the Itaewon side streets and Hongdae–Sinchon: their lanes are 5.5–
    8 m between the buildings, square corner after corner, hills, and the bots were put back on the course
    4–13 times a lap there, laps 3.5–4.8 minutes (the lesson of the first Hard loops again); they wait on
    better riding in one-car lanes. Each is planned through points of its own like the fairground's
    (`via`), with the zig-zag costs (`PROFILE.zigzag`: local streets cheap, arterials 3.5–8× dearer,
    turns cheap; a point snaps to the carriageway going its way); `links` join a side road to a divided
    road's far carriageway where the map leaves a gap, `startAt` puts the Heritage Run's grid opposite the
    National Museum of Korean Contemporary History. On their local streets the traffic is lighter than
    the level's (`LEVELS['medium-local']`, `LEVELS['hard-local']`: three or four cars sent the other way
    down the course and two or three going yours instead of 21–26 and 11–14, none parked at the kerb or
    standing at a stop, and the lanes one car wide on the line kept clear like a short cut's golmok —
    people at their doors and on the corners, not strolling down the racing line, no car driving them
    while the race is on, nothing stood on the ground at their edges — `golmok.js` `sparse`) so a corner
    is a corner, not a jam; and a bot takes a square corner between two
    lanes one car wide at about 25 km/h (`race.js`: no room there to drift or swing wide).

  The level sets more than the streets: the bots' skill, how many cars are about, coming the other
  way and going yours (Easy busier but fair, Medium busy, Hard packed), how many cars are parked at
  the kerb and buses at their stops, and the item odds (a little more of the back-markers'
  branches and police calls on the harder ones — still two attacks to one drink or helmet). Each course is planned on the spot from the
  real road network and between the real buildings (`src/city/course.js`, `src/city/walls.js`):
  three or four points round the place, each on the nearest road with two or more lanes each way,
  joined by the best way for a racer — a search over the streets' directed edges where wide roads
  are cheap, every turn at a junction costs (a straight run through a crossroads nothing, a 90°
  corner a long way round), never a motorway, never a residential lane or an alley (they are for
  the short cuts), one-way roads only with their traffic, never out along one carriageway and back
  down the other; of all the loops tried, the one that best keeps to the wide roads with the
  fewest sharp corners, the longest straights and a long run from the start. That is the Easy
  planner; Medium and Hard plan with costs of their own (`PROFILE`): the wide roads no longer
  cheaper, the turns cheaper (so the loop takes more of them), the residential lanes open (a little
  for Medium, freely for Hard), and loops scored on the corners and the narrow streets they want. A
  course with its own points (`via`: the fairground's lake loop, the downhill) is joined through them
  in order; `open` makes it point to point — its start line a grid's length in (`OPEN_LEAD`), its
  finish a run-out short of its end (`OPEN_RUNOUT`), its `length` the race from line to line.
  `node scripts/geo/jarani-courses.mjs` measures them (level, length, share on roads two lanes or
  more each way, on small streets, turns sharper than 60° and 80°, the longest straight, the first
  corner, short cuts, metres climbed and dropped and the steepest 30 m; `--level hard` for one level);
  `tests/unit/course.test.mjs` keeps each level so. Measured (Nov 2026):

  | level | course | km | wide | turns >60° / >80° | first corner | short cuts | climb | crashes a lap (you on the autopilot / a bot) |
  |---|---|---|---|---|---|---|---|---|
  | Easy | the eight boulevard loops | 1.95–2.58 | 76–100% (Namsan 14%) | 1–4 / 1–3 | 286–883 m | 0–1 | 7–73 m | 0–2 / 0–1.7 |
  | Medium | Seochon Palace Lanes | 2.74 | 64% | 7 / 5 | 210 m | 2 | 17 m | 1–5 / 1.7–3.3 |
  | Medium | Seongsu Brick Works | 2.74 | 36% | 9 / 7 | 215 m | 0 | 9 m | 1–3 / 1.6–2 |
  | Medium | Jamsil Fairground | 2.58 | 73% | 7 / 5 | 684 m | 1 | 15 m | 2–3 / 1.4–1.7 |
  | Hard | Euljiro Print Alleys | 1.78 | 10% | 17 / 10 | 191 m | 0 | 9 m | 1.3 / 0.9 |
  | Hard | Mullae Ironworks | 2.49 | 8% | 11 / 9 | 161 m | 1 | 8 m | 1.4 / 1.4 |
  | Hard | Haebangchon Hill Lanes | 2.78 | 17% | 9 / 7 | 512 m | 0 | 90 m | 0 / 1.7 |
  | Hard | Namsan Tower Downhill (A→B) | 2.12 | 37% | 1 / 1 (and the park road's bends) | 486 m | 0 | 145 m down | 2.2 / 0.7 |
  | Medium (zig-zag) | Gwanghwamun Heritage Run | 2.88 | 68% | 4 / 1 (4 left/right switches) | 1032 m | 0 | 24 m | 1 / 0 |
  | Medium (zig-zag) | Banpo Riverside | 1.94 | 23% | 7 / 6 (4) | 192 m | 0 | 9 m | 1 / 0.7 |
  | Medium (zig-zag) | Yeouido 63 Lanes | 2.24 | 20% | 12 / 10 (8) | 191 m | 0 | 12 m | 0 / 0.3 |
  | Hard (zig-zag) | Bukak Skyway (A→B) | 2.88 | 0% | 2 / 0 (8: the hairpins are 40–60°) | 60 m | 0 | 143 m down, 77 up | 1 / 1 |
  | Hard (zig-zag) | Jamsil Sky Tower | 2.32 | 32% | 10 / 4 (4) | 192 m | 0 | 12 m | 1 / 0.7 |

  (The zig-zags, one lap on the autopilot with three bots, day, clear, Nov 2026: the bots' laps 178–198 s
  on the Heritage Run, 139–141 s at Banpo, 184–199 s on the 63 Lanes, 201–224 s down the Bukak Skyway,
  156–181 s round the Sky Tower; put back on the course a lap (you on the autopilot / each bot) 6 / 0–1,
  2 / 1–4, 1 / 1–3, 3 / 2–3, 3 / 2–4 — more than the one aimed at: the corners between houses are still
  where a rider ends up against a wall.)

  (Crashes counted without the items' — branches, marbles. On the Hard loops the bots are often
  put back on the course after getting nowhere in a tight corner: they are slow there, not unfair.)
  **Short cuts**: the narrowest golmok that leave the
  loop and join it again further on, shorter than the road round (15–230 m saved) — tight walls and
  a tight turn in, so a bold rider gains and a careless one bounces. Each has a "SHORTCUT · 지름길"
  sign at its mouth, a cyan hint at the top of the screen as you come up to it, a dotted line on
  the map and cyan arrows down it; its metres count as the course's it cuts out, so the order stays
  fair; bots take them now and then (the better ones more); no one walks or drives down them.
  Dongdaemun, Hongdae, Teheran-ro and Jamsil have one; round the other boulevards no golmok rejoins
  the loop going its way, so none. The
  small streets (residential lanes, alleys, market lanes) come from OpenStreetMap round the courses
  (and the first courses' golmok neighbourhoods) only: `scripts/geo/seoul-alleys.mjs` writes
  `alleys.bin` beside `roads.bin` (`npm run geo:alleys`; `npm run geo:seoul` runs it too), a box at
  a time. Without it there are no short cuts.
- **Riders**: Snowpuff Peaks' plush animals on electric hire scooters — Mallow the bunny, Pip the
  fox, Mochi the cat, Toffee the bear, Peaches the pig, Pickle the frog and Pebble the penguin
  (girls and boys both; the bots always mix them). The same sculpted toys as Snowpuff's
  (`src/city/plushRider.js`: the recipes copied, Snowpuff's files never edited), dressed for
  WebGL2 (`src/city/plush.js`): sheen, fibre noise, a fresnel rim that dims at night, shell fur in
  one instanced draw with fewer shells further off. Knees bent on the deck, leaning into turns,
  crouching for a boost, ears and tails on springs, arms up at the finish, a tumble with dizzy stars
  and back up. Each has a nickname ("The Bounce", "Corner Queen"…) and a feel of their own that
  rides on any scooter. **Scooters**: six models of our own brand, "SSAENG 쌩쌩" (`src/city/scooter.js`,
  each its own shape, in the rider's colours; handling in `scoot.js` SCOOTERS): the **S1 Commuter**
  (the hire scooter: balanced), the **R7 Comet** (low and long, small hard wheels, a raked stem, a
  tail fin: the fastest, a handful in the corners and on rough ground), the **X4 Mudlark** (fat
  knobbly air tyres and coil springs: soaks up everything, slower), the **K2 Sparrow** (skinny and
  light: first off the line and the quickest to flick through traffic, short of top speed), the
  **G9 Grand** (wide, long, twin stem, chrome, a big lamp: fast on the boulevards, poor in corners)
  and the **Mini Bubblegum** (pastel retro with a leg shield, whitewall tyres and a basket: nimble,
  kind on bumps, a little quicker off the line than the S1). Bars for top speed, acceleration,
  cornering and shock absorption; more top speed always costs cornering and shock absorption. Top
  speeds sit within 5 km/h (67–72 km/h: Sparrow 67, Mudlark 67.5, Bubblegum 68.5, S1 70, Comet 71.5,
  Grand 72), so the fastest scooter can't simply ride away: corners, traffic, items and short cuts decide it. All of them: grip tape,
  folding stem, throttle and brake levers, a live display (the speed and a bar of it, lime and glowing through a drink's boost), LED head and brake
  lights, a kickstand. Bots ride a mix of them; in a room everyone's pick goes to the others. Riders bump and wobble off each other and never
  pass through (`src/city/pack.js`); bots keep their own lines on the road side of the street,
  overtake round the middle, and start from a staggered grid.
- **Riding** (`src/city/scoot.js`, pure and tested): **W** throttle — a racing motor, 70 km/h in
  about four and a half seconds — **S** brake (about 20 m from 70 on a dry road, longer in the wet,
  and braking hard in a lean on a wet road, or leaning hard fast, slides the back out), **A D** lean
  (quick to lean in — a left-right flick weaves through traffic — and steady at 70; turn radius at
  full lean about 4 m at 30 km/h, 11 m at 50, 25 m at 70, so most corners take no brakes and no
  drift), **Shift** drift (held while leaning: the back steps out, the
  scooter swings round faster than a lean turns it, an assist holds the slide, a little speed is
  scrubbed off — round a 90° junction at speed in about 12 m instead of 35; let go to straighten;
  tyre squeal, rubber scuffs on the road, the rider hanging out; bots drift the tight corners too),
  no boost key and no boost gauge — the energy drink is the only boost — **Space** the bell (a
  synthesised two-strike "ring-ring", `src/city/bell.js`; **B** too: people ahead step aside, slower
  riders and scooters give you room, and you hear the bots' bells where they are), **R** back on the
  course (and after a few seconds lost well off it, you are put back). Small wheels feel every
  paving joint, and the roads have steel road plates, manhole covers and, on the narrower ones,
  speed bumps in the racing line (never in a junction: a crossing rides flat, on asphalt, not
  paving, when you cut across it); a kerb met at an angle is a hop up, met glancing it scrapes and
  wobbles you. How much of it reaches you is the scooter's suspension: on the stiff R7 a plate
  shakes the camera and the rider, costs speed and knocks your line; on the X4 you hardly notice. Speed
  shows: the FOV opens (58° → ~71°, more on a boost), a fine buzz in the camera, wind lines in the air
  and at the screen's edge, the wind's roar (`src/city/speedfx.js`).
- **Traffic** (`src/city/traffic.js`, `src/city/fleet.js`): real models (Sketchfab, CC BY 4.0, from
  the Objaverse mirror) — everyday saloons, hatchbacks, people carriers, small SUVs, compacts and
  estates in Seoul's whites, silvers, greys and blacks, taxis with our own roof sign, one-tonne box
  trucks, city buses in route blue and green and the smaller green town buses (마을버스, the same model
  at about 9 m) — with glass, turning wheels, headlights at night and in the rain, brake lights and
  blinking indicators; delivery scooters too (polyfork's moped, a real person riding each one), also
  down the small streets. Every vehicle is a real model: they are all loaded before the lights (the race
  waits for them, `loadFleet`), a kind whose file failed is stood in for by another real one
  (`fleetKindFor`), and nothing is put down until its model is there — the old built stand-ins
  (`vehicles.js`, boxy extruded cars) are gone. Each model is merged by material once (a car is a
  handful of draws); past 60 m it is a reduced copy of itself — the same shape, wheels fixed, its
  textures' colours baked into its corners, two draws, no lamps (`LOD`, back to full inside 50 m). The
  delivery riders are posed once and baked into still meshes (`bakeFigure`: a few draws, no skinning —
  a skinned rider was dozens). They drive properly: pulling away at their own pace (a bus slowly),
  braking smoothly, following the road's bends in their lane with the lane offset mitred round each
  corner of the road's line (`laneAt`: no jump where two stretches meet), turning at a junction on a
  smooth arc from their lane to the new road's (`arc`: no teleport, the nose the way they move, never
  sliding sideways), blinking before the turn and through it, turning round at a dead end. Across a
  junction one gives way to the other — the later one, or about together the one with the other on
  its right; one already in the crossing never waits (`giveWay`) — and a last guard stops any from
  driving into another (`_bumps`). They keep their own side, cross at the junctions, honk when held up — and
  they don't get out of your way. Coming the other way or across, a vehicle holds its lane and its
  speed: no swerving, no braking, no waiting at a junction for the race (they still give way to one
  another); dodging it is yours to do. The only rider a driver brakes for is one going its way close
  in front in its lane (it follows you as it follows a car) or one standing still there — held by the
  police, stuck in a jam: nobody drives into something stopped (`brakesFor`). A bike's bell moves over only a delivery scooter going your way. Bots see a vehicle
  coming at them as near as it will be (met at both speeds together) and steer round it earlier, and
  look along their own line — round the corner ahead too — for a vehicle that will cross it in the next
  two seconds, coming the other way or across, and slow to let it by (`_pathConflict`). Measured on the
  autopilot after the change (Nov 2026, four riders, day, clear): Dongdaemun 120 s, one traffic crash
  in all (seven before the bots' line check); Euljiro 90 s, none (Euljiro's tight grid jams now and
  then, as it did before) — and no vehicle popped up in view in either.
  Nothing appears or goes in view, and nothing fades (`SIGHT`): a vehicle is put down only where the
  camera can't see it — round a corner, behind a building or a wall (a line to its middle and both its
  ends tested against the course's walls and every building's footprint), behind the camera, in the
  fog, or so far down a straight that it is smaller than 2.5 pixels on screen — and drives into view
  along its lane; a parked car's place stays empty while you can see it. One done with (far from
  everyone, or passed) goes only once it is out of sight; in view it drives on, solid, until it isn't.
  When there is nowhere hidden, the street waits rather than pop one up. There is no distance cut: in
  clear air a car 400 m down the road is still drawn. Cars and buses sent up the course start 60–600 m
  ahead (so on a long straight they come from its far end) and go at 700 m; never more than 115 at
  once. Measured on the autopilot (Nov 2026, day, clear, Dongdaemun and Euljiro; before 90 s each,
  after 120 s each): vehicles put down in view 110 and 18 before (fading in), 1 and 0 after (a delivery
  scooter 398 m off, about 3 px); vehicles drawn see-through in view 120 and 20 before, 0 after; boxy
  built cars seen 8 and 13 before (the models still loading as the race began), 0 after; on the High
  tier 59.9 and 57.6 fps on average (lowest 5 s 59.4 and 52.5), with the delivery riders baked (skinned
  they cost about 1,500 draws on Hard). The course's own roads are kept busy the other way: cars, taxis,
  buses and delivery scooters sent up the road ahead of you on the far side of a two-way road, or
  down the other carriageway of a divided one — fifteen of them on an Easy course, 21 on Medium,
  26 on Hard — in their own lane (and on a two-way residential lane wide enough for traffic the
  riders keep to their own side of it too, out over the middle only to pass). And your way: slower cars, taxis, trucks,
  buses and delivery scooters (55–90% of the road's speed) sent up the course 90–270 m ahead of you
  in the riders' own lanes, to weave past — up to 8 on Easy, 11 on Medium, 14 on Hard (`along` in
  `LEVELS`); on Hard (`dense`) they are sent anywhere 60–300 m up the course, cars as well as
  delivery scooters down the residential lanes wide enough for a car and a rider beside it (7 m and
  up: the narrower ones are people's), and they
  may stand closer on the two-lane streets (14 m apart in a lane) — but never two side by side, nor
  beside one coming the other way or a parked car: across the road there is always a gap. One that
  turns off the course is just traffic again and another is sent in its place. Bots and the autopilot see a vehicle along its
  whole length (a bus's tail, not just its middle). Measured on the autopilot (Nov 2026, 150 s a
  course, four riders): vehicles within 150 m ahead of you about 1.5× what they were (Dongdaemun
  7→11, Seongsu 8→13, Euljiro 6→9), close calls a lap up (8→12, 15→18, 8→12), traffic crashes a
  lap you / bots 0 / 0→1.2, 1.5 / 0.5→0 / 1.0, 0 / 0→0 / 0.
  None is ever put down within 40 m of a rider, nor (off Hard) within 22 m of another vehicle (never two
  abreast, or one beside a car coming the other way: no wall across the road). On a road with two
  lanes or more their way, cars change lane now and then — blinking first, sliding over, only into
  a clear lane and never with a rider within 30 m — and pull out round a car parked at the kerb or
  a bus at its stop rather than queue behind it. Cars stand parked at the kerb (two, seven and
  twelve a kilometre by level) on the two-way roads — on Hard the narrower ones too (6.5 m and up),
  with delivery scooters left at the kerb of the lanes wide enough (about ten a kilometre) — never in the 60 m
  before a corner nor just after it; buses stand at their stops on the wider roads (about one a kilometre; "BUS STOPPED" warns
  you — a warning comes up only once a thing has been in your line a quarter of a second, and stays at
  least a second and a half on the side it was first seen: never a box blinking on and off), blinking to pull out. At night
  every headlight and tail light glows, near and far (one draw for all of them). Everyone on the street is real (`src/city/folk.js`: Microsoft
  Rocketbox avatars, MIT) — walking, waiting in groups at the crossings, at shop doors, texting,
  looking about, cheering at the start — and nobody faceless is drawn: further off the pavement is
  simply quieter (`src/city/life.js`). In a race people gather ahead of the riders, and in the small
  streets they keep to the edges.
  **Narrow streets are people's only** (the user's ask: "in narrow alleys, only people"). Narrow is
  one rule, `isNarrow` in `src/city/alleys.js` (unit-tested in `tests/unit/jarani-narrow.test.mjs`):
  every golmok, alley, service lane, living street, market lane and footway (OSM class 6 and up,
  however wide); a residential or unclassified lane — no lane markings — under 7 m (the map's 6.2 m
  when it doesn't say: a car and a rider can't pass side by side); a main road with under 3 m a
  direction (a two-way road under 6 m). No car, taxi, truck, bus, town bus or delivery scooter drives
  down one, turns into one, is put down in one, parks or stands at a stop in one — the race's
  traffic (`src/city/traffic.js`: round the riders, coming down the course, sent up it, parked, at
  the stops, Hard's parked scooters, every respawn) and the city's own (`street.js`) alike, and the
  alleys' parked-scooter props (`golmok.js`) are left out there too. Where a course runs down a narrow
  street (Hard's Euljiro, Mullae and the others' 6 m lanes) it simply has no traffic: people, props
  and the bots are what is in the way. The people are kept there: in a race, until six are down the
  narrow streets the course takes near you, nearly half of those put down on foot go there, at the
  edges, to weave past. The narrowest golmok short cuts stay empty of people as before (`keepClear`). A delivery scooter near you has a real rider sat on it; far off,
  none is drawn. In the rain (`src/city/wetfx.js`) every light is smeared
  down the wet road, puddles mirror the sky, the rain glints where it crosses a light and wheels
  throw spray.
  Buildings and the alleys' garden walls are solid (`src/city/walls.js`): each rider is a circle
  swept against every wall near the course, in 1/120 s steps, so nothing is ridden through at any
  speed or frame rate; a rider somehow found inside one (a spawn, a friend's position over the
  network) is put out the nearest way, and the chase camera is swept out from the rider against the
  same walls (in close and up instead of through them). At junctions cars crossing the course
  don't wait for the riders: look out for them.
  Roll gently into a car (one stopped at the lights, one you drew level with) and it's a bump and a
  shove; hit any of it square and fast — a car, a wall head-on above ~38 km/h, a planter, a bin, a parked scooter —
  and you're off: a hit-stop, "BONK!", a tumble, dizzy stars, back on 1.5 s later. Met at a slant
  (a wall, a car's flank, the edge of a bin, a pole) it is only a scrape: turned along it, slowed,
  still riding. Pass close at speed for a "WHOOSH!".
- **Items** (`src/city/items.js`): ride through the bouncing "?" boxes (rows across the street every
  ~220 m) to fill three slots; use them with **1 2 3**. **Energy drink** — the only boost
  there is (no boost key, no gauge, no tailwind): a can crack and two gulps, your rider drinks, and
  four seconds of boost at once at the scooter's boost speed and pull (70 → 86 km/h on the S1, the FOV
  kicking out, speed lines, the wind, a green glow trail behind the scooter — about fifteen metres
  gained, worth having, not a win), "GULP! +BOOST" and DRINK BOOST under the speed. The commonest
  single item at every place (22 % of the boxes leading, 25 % last). **Call the police · 경찰 호출** (`src/city/police.js`,
  the air horn's place): a patrol officer of our own design — a white police scooter with a blue
  stripe and "POLICE 경찰" on its side, a red-and-blue light bar, a hi-vis vest and a peaked cap, no
  real force's crest — rides up beside the nearest rider ahead of you (if you lead, the one behind),
  lights flashing, a short synthesised siren whoop, a "PULL OVER!" pop, and pulls them over: hauled to
  a stop and held for five seconds with a wobble — the patrol stays right beside them the whole time,
  lights flashing and the officer waving them down — then let go as the patrol rides off ahead and is
  gone. (Held isn't stuck: a bot isn't put back on the course for it, nor is "Stuck?" shown.) The gold helmet
  doesn't help (it takes crashes, and this isn't one), and a rider down a short cut can still be
  caught. Bots call it on whoever is ahead — at a person only half the time, as with the branch.
  Commoner further back (7 % of boxes leading, 19 % last). **Gold helmet** (`src/city/helmet.js`): a shiny gold helmet on your rider's
  head, fitted to each species' head (the ears poke out) — a rounded cycling helmet,
  longer to the back, with vent slots, a darker band and rim, a foam liner, a short peak and a chin
  strap (just the helmet: no glow round the rider) — and a badge on the HUD; the next crash (a car, a
  wall, a branch, a fall on marbles)
  bounces off — "BLOCKED!" and "PING!", a ding, and the helmet flies off, spinning. Everyone's
  helmets show, bots' and friends' too.
  **Marbles** (`src/city/marbles.js`): poured out behind you, 48 glass marbles with coloured swirls
  bounce, scatter and roll, then lie in a patch for about 13 s — always inside the street they were
  poured in (never onto a pavement or through a wall; in a golmok narrower than 5.5 m only across
  the half you were riding, so a short cut is never shut). A rider whose wheels cross them slips:
  the grip goes, the scooter wobbles and slides and loses speed; faster than about 50 km/h, or
  steering hard above about 30, they fall (the tumble with dizzy stars, "WHOA!" "SLIP!", a glassy
  rattle). Slow down and ride straight and you get through with a wobble. The golden helmet takes
  the fall, not the slip; ridden through, marbles scatter. Commoner up front (17 % of boxes
  leading, 11 % last). Bots pour them when someone is right
  behind, and steer round the patches they see (the sharper ones see more) or brake to a crawl
  across them. In a room the pourer's browser sends the pour's seed and everyone rolls the same
  patch. **Smoke · 연막** (`src/city/smoke.js`): a little grey canister dropped 3 m behind you pops
  and hisses (synthesised) into a thick cloud — 30 soft puffs billowing out over about 1.3 s to some
  10 m across and 3.5 m tall, heaped in the middle, drifting with the weather's wind and kept inside
  the street it was dropped in; it thins away slowly and is gone after 7 s. The puffs are lit
  billboards (the sun and sky by day; after dark a little sky fill and the street lamps' warm light),
  each fading out where it meets the road and near the camera, so none shows an edge. Ride into it
  and you can't see: one full-screen veil drawn last in the scene (drifting billows of noise in the
  smoke's colour — grey-white by day, darker and lamp-warmed at night; no edge anywhere), the HUD
  and map over it; it clears about a second after you (and the camera) are out. A rider entering it
  coughs ("COUGH!"). Nobody falls because of it; bots inside lose their line — they come off the
  throttle and feather the brake (`SMOKE.ease`, down to about 36 km/h) and wander a little. Bots drop it when a rival is close behind.
  15 % of boxes leading, 7 % last (dropped behind you, it defends a lead). In a room the dropper's
  browser sends the plan (place, street, seed) and everyone draws the same cloud; each browser
  works out who of its own riders is in it. The map shows each cloud as a soft grey round.
  **Oil slick · 기름** (`src/city/oil.js`): a glossy black slick spilled on the road behind
  you — an irregular puddle about 3.6 m across and 4.5 m along with a few splashes round it (kept in
  the street as marbles are: in a narrow golmok only across your half), spreading out in half a
  second. It is one mesh laid on the road's surface (a grid following the ground, pulled forward
  against the road: no z-fighting, no floating) with a soft edge from its blobs' field, drawn wet
  and black with a hard gloss and a thin-film rainbow in marbled swirls and round its thin edge,
  brighter at a low angle; by night only the lamps' pools and the lights catch in it. It lies about
  13 s, or until three riders have crossed it (then it fades in a second). Riding into it spins you
  out: no grip for 1.2 s while the scooter turns a full circle sliding on the way it was going —
  "OIL!", a tyre squeal (synthesised) — then upright again with 30 % of the speed left. No fall,
  unless the slide meets a wall faster than 3 m/s (the usual crash). The gold helmet takes it (as a
  fall on marbles). The wheels leave dark, glossy oily tracks: round in circles while it spins, then
  for five metres, thinning. Bots spill it when a rival is close behind in their line (or after
  holding it a while) and steer round slicks they see; each rider is caught by a slick once. In a
  room the spiller's browser sends the plan (seed and street) and each crossing, so every browser
  lays the same slick and counts the same three riders. Commoner up front (18 % leading, 9 %
  last: spilled behind you, it defends a lead). The map shows each slick as a black round ringed in violet.
  And the branch (`src/city/branch.js`: a leafy
  plane-tree branch grown in code — thrown into the wheel of the rider right ahead of you, and only
  them: the nearest ahead round the course by race distance (a rider down a short cut alongside
  counts), up to 150 m on. After a wind-up it flies in an arc and homes in on their front wheel all
  the way down, so it doesn't miss: "CRACK!", a burst of leaves, over the bars, dizzy stars, back up
  1.5 s later, and three seconds no branch can catch you. The gold helmet takes it. If nobody's
  ahead in reach — you lead — it's wasted: it flies on up the road and bursts into leaves ("POOF").
  It never lies in the road and never touches anyone behind you. Bots throw it only with someone
  ahead in reach, and at a person only half the time.)
  **The odds** (`itemOdds`): two boxes in three are an attack (police, branch, marbles, smoke, oil),
  one in three helps you (the drink, the only boost, and the helmet) — at every place and on every
  level. Where you are decides which: leading, more helmets and more of what you drop behind you
  (marbles, smoke, oil); further back, more drinks and more of what you aim up the road (the police,
  the branch):

  | place  | drink | helmet | police | branch | marbles | smoke | oil  | attack : support |
  |--------|-------|--------|--------|--------|---------|-------|------|------------------|
  | leader | 22 %  | 11 %   | 7 %    | 10 %   | 17 %    | 15 %  | 18 % | 67 : 33          |
  | last   | 25 %  | 8 %    | 19 %   | 21 %   | 11 %    | 7 %   | 9 %  | 67 : 33          |

  Bots use them too — up to three held, an attack fired only every 3–5 s (never everything at once on
  whoever is near), the drink and the helmet whenever they help; in a room
  throws, pours and smoke are sent to everyone and whoever's browser rides the rider caught decides the catch.
- **The alleys** (`src/city/golmok.js`): along the course and down its short cuts, built as you come
  near: the small streets' concrete and asphalt at road level, joined to the road where they meet
  one — the road's pavement is a dropped kerb across the alley's mouth (flush with the road, ramping
  up either side), the alley's surface starts at the pavement's edge at its height, round a bend the
  corner is filled, and the ground the riders stand on (`surfaceAt`) knows the pavements (the race's
  `junctionReport()` samples every mouth for holes, steps and doubled surfaces);
  a narrow raised pavement down a residential lane,
  garden walls and gates, air-conditioner units and gas meters, concrete poles with wires
  overhead, convex mirrors at blind corners, vertical shop signs lit at night, awnings, styrofoam
  planters, pots, bins, parked scooters (never in a narrow street), steps, alley lamps with pools of light. What stands in the
  street is fair at 70 km/h: only in lanes 5 m or wider, tight to the wall, never in the 40 m before a
  corner or just after it, each with a reflective yellow-and-black band. Every sharp corner has a
  chevron board across the end of its approach, and anything in your line ahead gets a warning at
  the top of the screen ("⚠ BINS · ⬅ KEEP LEFT 60 m").
- **Buildings beside the course** (`src/city/facades.js` and the city shader): window frames and
  sills on the shader's own grid, balconies and rails on flats and villas, shopfronts and striped
  awnings, downpipes, roof tanks and units; close up the walls are brick, tile or render, glass has
  rooms behind it (interior mapping: ceilings, lights, partitions — lit or dark at night), and
  half the glass towers have white aluminium fins.
- **Fog** (`src/city/weather.js` `FOG_BANK`, `src/city/mist.js`): a real fog bank — the street, the
  buildings, the traffic and the people mostly gone by 10–20 m (the scene's fog from 2 m to 24 m,
  whatever the view distance; before, the haze factor only scaled the far plane, and 0.22 of 2.4 km
  left 500 m of clear air, so Fog looked like Clear), grey-white by day; after dark a dark blue-grey
  murk a shade lighter than the street, and nearer (from 0.5 m, gone by 15 m: the dark buildings and
  the dark murk are close in tone, so at the day's distances they still read 40–50 m off);
  the sky dome and the background fade into it. Headlights and tail lights glow through it as wide
  soft halos, on by day in fog too, so a car's lights show before its body does; after dark every
  street lamp near you is a halo in it (one draw each). Low mist sheets drift over the road round the
  camera (three thin discs, patchy noise, thinning by the camera). Fog is the street's weather, not
  the characters': the riders, their scooters and helmets opt out of it (`noFog` in
  `plushRider.js`), and the mist is cut out round them, so a rival 20–40 m ahead stays a crisp plush
  toy (in the rival panel too, and on the podium); the corners ahead are on the turn arrows and the
  map. Rain, snow and the storm are as they were.
- **Time and weather**: every race has its own — day, golden hour, dusk or night; clear, rain,
  storm, fog, or snow in the cold months — random by default, or picked (and previewed) in the menu. The city
  clock stops for the race. Rain darkens and shines the roads and makes braking longer; snow is
  slipperier still.
- **Alone**: you against three bots. **Together**: one player makes a room and gives the
  five-letter code; up to three others join and pick their riders and scooters (everyone sees the picks); the
  host picks the course, laps, time and weather and starts. Bots take any empty seats (the host's
  browser rides them). Each browser sends where its riders are fifteen times a second, and when
  an item is used.
- **Music** (`KICKRANI_COURSE_TRACKS` and `seoulTrack` in `src/shared/gameMusic.js`; docs/music.md):
  original, upbeat kart-racing-style tracks of our own, generated with ACE-Step 1.5 (MIT) on the Mac
  Studio from prompts that name only styles, instruments and moods — never a game, a composer or an
  artist. Each course family has its own: *Palace Gate Dash* (Gwanghwamun, Seochon — a plucked
  zither riff and hourglass-drum fills over a pop beat), *Night Market Rush* (Dongdaemun,
  Cheongnyangni — brassy funk-pop), *Neon Boulevard* (Hongdae, Teheran-ro, Jamsil — bright city-pop),
  *Riverside Breeze* (Yeouido — tropical synth-pop), *Hilltop Sprint* (Namsan, Haebangchon — pop-rock),
  *Tower Downhill* (the downhill — fast electro-rock), *Starlight Fair* (the fairground — a carnival
  band and band organ), *Ironworks Groove* (Seongsu, Euljiro, Mullae — gritty funk-rock). *Garage
  Showroom* loops on the race menus; the course's track plays from the grid through the race and
  crossfades into *Podium Party* at the ceremony (after the victory fanfare); a drive at night keeps
  *Neon Overpass*. The Music switch and volume in the Graphics panel control all of it.
- **On screen**: the map at the top left (`src/city/minimap.js`) — the real streets round you, every
  small street, the buildings faintly, the river where it is near, the course ahead bright, short
  cuts dotted, item boxes, marble patches, oil slicks, smoke clouds and branches in the road, the traffic, and every rider as
  a dot in their colour (ringed gold in a helmet) — turns smoothly with you, or keeps north up: click
  it (remembered). It is drawn once per race and laid out about twelve times a second. When a rival
  comes up behind you or draws level to pass, a small manga-style square slides in on the left
  (`src/city/rivalPanel.js`, Snowpuff's rival panel, `src/snowpuff/sideMirror.js`, only read): one
  still picture of them, snapped from just in front looking back at their face, in a tilted ink frame
  with speed lines and a halftone edge — no name, no distance, no text. One small render when the
  rider changes, at most once a second, read back to a 2D canvas; all its motion is CSS; it is
  rendered once while the lights count down so nothing hitches. Your place beside the map; the lap top right with the order under it; the time and the
  three item slots bottom centre; speed (and what you're doing: DRINK BOOST, DRIFT, SLIPSTREAM, SLIPPING!) bottom right — no boost gauge; the next turn named at
  the top ("SHARP RIGHT · ALLEY 30 m"), a warning under it for anything in your line; the keys while
  the lights count down; speed lines from about 55 km/h. Left-drag looks round.
- **The blinking box** (a square flicking in and out at the left of the middle of the screen): the
  rival panel's still was taken from wherever 3 m in front of the rival happened to be — often inside
  a bus, a wall or a tree — so it slid in as a flat green or grey square, in and out as the pack
  jostled (caught by recording a careless race frame by frame and measuring every still). Now the
  still is taken from a spot clear of walls, cars and street props (`_panelSpot`), with only the rider
  and the street drawn (`_panelIsolate`), a flat still is never shown (`stillIsGood`), and the panel
  only slides in with a good picture, stays at least 1.8 s, rests 2.5 s before coming back, and not
  in the first 4 s of a race. WRONG WAY, a box at the same place, is judged by the way you are going
  against the course a few points ahead, held 1.5 s, never while drifting, tumbling or just put back
  (`wrongWay` in `src/city/ride.js`), and shown steadily, not flashed frame by frame. A rival put back
  on the course right by the camera is faded from where the camera is that frame, so it never pops in
  whole for one frame. The end-to-end run watches the middle of the screen while riding.
- **The dark slab** (a black rectangle behind a slipping rider's dust, round a "WHOA!"): the race's
  comic sprites now never draw their clear texels at all (`alphaTest`), and the ambient occlusion
  pass (`src/city/aopass.js`) leaves sprites and see-through, depth-less meshes (puffs, glows, painted
  arrows) out of the normals it shades by, so none can shade the road as a solid card; the end-to-end
  run reads a frame back round a cloud of dust and a word burst with AO on and finds no dark card.
- `src/city/race.js` runs the race; `src/city/course.js` plans the courses (tested in
  `tests/unit/course.test.mjs`); `src/city/lobby.js` and `src/city/stage.js` are the menus and their
  stage (drawn instead of the city while they are up, so they stay smooth); the room goes over the
  party server (`/ws`).

## On the street: how it is built

- `src/city/street.js` — walking, getting in and out, driving, traffic, people walking, the map
  in the corner and the engine's sound; `SeoulGame` hands over walking and driving and asks it for
  the camera.
- `src/city/drive.js` — the car's handling (engine, brakes, steering that tightens at low speed,
  skids) and going along a road, as plain numbers; tested in `tests/unit/drive.test.mjs`.
- `src/city/cars.js` — the Car Concept model in many paints, its glass made plain, its logos left
  out, our own number plates, wheels that steer and roll, lights at night, far away the same car without its small parts (never boxes).
- `SeoulGame.js` — the city itself: asphalt roads with lane lines (dashed between lanes, double
  yellow down the middle), raised pavements of grey block paving with street trees (`trees.js`:
  ginkgos and plane trees grown in code — real branches, leaf cards, bark, cast-iron grates;
  gold and tan in autumn, green in summer) and street lamps that light the street after dark
  (`nightlights.js`); a light from each lit shop window across the pavement; buildings drawn by what they are — glass towers
  (each its own tint) for offices, white blocks with window bands and balcony rails for apartments,
  shopfronts at street level with a row of shop signs above (pharmacy, convenience store, café,
  hair salon…) that glow at night.
- `src/city/people.js` — Mina and Jun. Neither file has a walk, so they borrow the soldier's
  (idle, walk, run): each bone's turn from rest is copied across, in each skeleton's own frame.

The models come from the asset library (`extras`, fetched by `npm run dev` and `npm run build`);
see [third-party](third-party.md) for their licences.

## How it works

- **The converter** (`scripts/geo/seoul-build.mjs`) reads the shapefile and its table side by side,
  keeps each building's largest ring, thins its points (to within 0.4 m), works out a height and a
  broad use, and files it under the 500 m tile its centre is in. It also writes the districts'
  centres and the tallest named buildings.
- **A tile** (`src/city/tiles.js`) is a small binary file: per building a footprint in decimetres
  from the tile's corner, a height and a use, then the names. The same code writes and reads it.
- **The game** (`src/city/SeoulGame.js`) loads the tiles around you nearest first, builds one mesh
  per tile (walls, flat roofs, a colour by use), and drops tiles you leave behind. Windows are drawn
  by the shader from each wall's length and height, so no textures are downloaded.
- **The land** (`scripts/geo/seoul-extras.mjs`): the elevation tiles are read with a small reader of
  our own (`tiff.mjs`), sampled onto a 25 m grid in the register's projection (`tm.mjs`), cleaned
  of buildings and written with a water mask. The game draws the ground of every tile in view —
  town, wooded hillside, bare rock, water — stands each building on it, and lays the roads over it
  as ribbons.
- The world is the register's own grid in metres (EPSG:5186), moved so that City Hall is the origin.
- **Tests**: `tests/unit/city.test.mjs` (the tile format, point thinning, heights and uses, and the
  projection there and back).

## Next

- Parks, small streets and subway lines; water that looks like water; trees on the hills.
- Subway lines to ride between districts; quests ("find the three tallest towers in Gangnam").
- Other players in the same city.
