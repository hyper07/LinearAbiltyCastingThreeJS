# AI Arcademia

[← Back to the README](../README.md)

A learning mountain for kids aged 6 to 13. Seven floors climb one terraced mountain, each a little
world with its own theme. Every floor has a **Math School**, a **History Hall** and a **Physics Lab**,
plus a hat shop, an arcade hall, a sticker museum, a quest board, a landmark to play with, a puzzle
boss, a hidden treasure chest, three hidden gems and a portal up. The player picks a buddy (a fox cub,
a little robot, a dragonling, a puffball or a bunny sprite), walks the terraces and goes into the
buildings for lessons told as quests. Stars from the lessons open the floor above. Grown-ups get a
weekly report behind a PIN, and a read-only link they can open on their own phone.

| Floor | World | Ages | Its history fits the theme |
| --- | --- | --- | --- |
| 1 | Meadow Village 🌼 (windmill, bunnies) | 6–7 | then and now, the Stone Age, castles |
| 2 | Desert Pyramids 🐫 (oasis, palms, a pyramid school) | 7–8 | the pyramids, the first writing, the Vikings |
| 3 | Mushroom Grove 🍄 (bouncy toadstools, glowing spores) | 8–9 | Ancient Greece, Roman engineers |
| 4 | Snowy Peaks ❄️ (igloos, penguins, snowfall) | 9–10 | the Silk Road, inventions of ancient China |
| 5 | Cloud Sky City ☁️ (rainbow arch, balloons) | 10–11 | the Mali Empire, the printing press |
| 6 | Seaside Harbor ⚓ (a seashell school, a lighthouse lab, a boat) | 11–12 | the age of exploration, the Industrial Revolution |
| 7 | Moon Base 🚀 (domes, a launch pad) | 12–13 | the first flight, Apollo 11 |

## Study worlds

There are seven study worlds, and each teaches **its own lessons with its own teachers**, so a child
who finishes one world has a new one to explore (a world still being written borrows the mountain's
lessons and teachers until its own exist: `content/index.js` `teachingRealm`). Each world has seven floors for ages 6–13 with its
own stories and puzzle bosses, and its own stars and unlocking. Coins, stickers, hats, gems and the
buddy are shared everywhere.

| World | Realm | Teachers (Math · History · Physics) | What it teaches |
| --- | --- | --- | --- |
| Learning Mountain ⛰️ | land | Professor Hoot 🦉 · Tock 🐢 · Gizmo 🦝 | the lessons above |
| The Great Tree 🌳 | forest | Nutmeg 🐿️ · Grandpa Bramble 🐻 · Dr. Ribbit 🐸 | Forest Math, Forest History, the Nature Lab: trees, plants, seasons and the people who studied and protected forests (`content/forest.js`) |
| The Lagoon 🏝️ | sea | Captain Pip 🐧 · Grandma Inka 🐙 · Dr. Splash 🦭 | Sea Math, Sea Explorers, the Ocean Lab: navigators, lighthouses, ocean science, floating, tides and the deep sea (`content/sea.js`) |
| The Desert of the Pyramids 🐪 | desert | Miss Lotus 🦛 · Uncle Reed (an ibis) · Dr. Sandy (a sand cat) | the Pyramid School, the Temple School and the Sun Observatory: 42 desert and Ancient Egypt lessons — hieroglyph numbers, cubits and the Nile's fields; farmers, scribes, Imhotep, Hatshepsut, Petra, the Rosetta Stone, Ibn Battuta, Alexandria, Timbuktu, Tutankhamun and Abu Simbel; shade, singing dunes, wet sand under sledges, the shadoof, mirages, hot-air balloons, sandstorms and Eratosthenes (`content/desert.js`) |
| Mars 🔴 | mars | Miss Ruby (an otter) 🦦 · Professor Woolly (an alpaca) 🦙 · Dr. Digby (a star-nosed mole) | the Red Dome School, the Mars Museum and the Weather Lab on Olympus Mons: 42 Mars and planet lessons — counting rover wheels, rock samples in tens, the six times table, fractions of a space pizza, feeling about 3/8 as heavy, sols about 40 minutes longer, greenhouse areas, a Mars year of about 1.9 Earth years, below-zero nights, Mars percentages, rover-route equations and square solar fields; the red wandering star, Phobos and Deimos and Angeline Stickney, Schiaparelli's canal mix-up, Mariner 4's hand-coloured first picture, Viking, Sojourner, Spirit and Opportunity, Mangalyaan, Curiosity's sky crane, the UAE's Hope, Perseverance's sample tubes, Tianwen-1 and Zhurong, Ingenuity and MOXIE; why Mars is red, sols and blue sunsets, quiet thin air, falling in gentler gravity, ice caps and long-ago water, keeping warm, greenhouses and mirrors, rovers in soft sand, solar power and dust, robot arms and levers, flying in thin air, radio delay, Olympus Mons and Valles Marineris, and launch windows (`content/mars.js`) |
| The Sky Castle 🏰 | castle | Miss Biscuit (a corgi) 🐶 · Professor Hartley (a stag) 🦌 · Dr. Sprocket (a beaver) 🦫 | the Clock Tower School, the Library Hall and the Inventor's Workshop: 42 castle, medieval and sky lessons — counting towers and flags, buns at the market, Roman numerals on the clock, bell chimes in 2s, 5s and 10s, floor-tile arrays and tessellations, half past and quarter past, feet, thumbs and yards, sharing the feast, walls and herb gardens, banners in tenths, colder up high, fair percentages, clockwork equations and Fibonacci's squares; market day, castle builders and the treadwheel crane, Himeji the White Heron Castle, King Sejong's Hangul, al-Jazari's Elephant Clock, Angkor Wat, the Forbidden City, Jikji, Great Zimbabwe, Hildegard of Bingen, Magna Carta, Fatima al-Fihri and the first universities, Leonardo's flying machines and the first balloon flights of 1783; could an island float, coloured light through stained glass, big and little bells, the blacksmith's magnet, melting and casting bells, carts and friction on the castle hill, the counterweight drawbridge, lightning rods, the pendulum clock, messenger pigeons and speed, rainbows by the waterfalls, parachutes and drag, air pressure and boiling up high, and water mills and energy (`content/castle.js`) |
| The Moon 🌙 | moon | Miss Mochi (a moon rabbit) 🐰 · Captain Ginger (a red panda) · Dr. Comet (a koala) 🐨 | the Dome School, the Moon Museum and the Star Observatory: 42 Moon and space lessons — counting craters, rocket countdowns, fractions of the Moon, a sixth of your weight, moon-month decimals, hot days and freezing nights, mission equations; moon-rabbit tales and full-moon festivals, Galileo, Sputnik, Gagarin, Tereshkova, Katherine Johnson, Apollo 11, Hubble, the ISS, Sally Ride, the Chang'e missions, Apollo 13 and today's explorers (Danuri, Chandrayaan-3, SLIM, Artemis); phases, moon boots, silent space, the hammer and the feather, craters, polar ice, earthshine, levers, rockets, the long lunar day, eclipses and tides, moonbase power, pendulums and orbits (`content/moon.js`) |

**The Great Tree** has a ring of treehouses all the way round a giant trunk for every floor: Root
Hollow, Fern Boughs, Lantern Branches, Blossom Canopy, Nest Heights, Sunflower Rings and Starlight
Crown. On each ring, nine round wooden decks hold the three schools, the shop, the arcade, the
museum, the quest board, a hub with the landmark, the portal up and the puzzle boss, and a nook where
the treasure chest hides. Sturdy plank bridges and sagging rope bridges join the decks all the way
round. Each ring is turned from the one below, so a school never sits right under the next ring's
school. A spiral stair winds up the trunk from each ring's landing to the next, with a gate that
stays shut until that floor opens. Glowing vines hang under the decks and light up at night, with
fireflies, and a leafy crown sits on top.

The tree grows its own buildings (`src/arcademia/world/grown.js`, original designs):
- **Seed Pod School:** a woven seed pod held by two living-wood ribs under a canopy of big leaves, with a round door and porthole windows.
- **Root Hall:** a woven dome wrapped in arching roots that meet in a crown of drooping leaves, with a root-arch doorway, banners and a carved spiral.
- **Nature Lab:** a little woven pod at the foot of three braided strands. The strands hold up a cup of petals and a glowing lens, with seeds orbiting it on tilted rings.

They stand on mossy discs of living wood, with roots over the rim and glow-bulb lamps. The shop, arcade, museum and quest board sit under canopies of roots and leaves. The weave is a painted basket-weave texture. The glowing dots, spirals, bulbs and seeds (`world/glow.js`) brighten at night, and the windows and seed lanterns glow warm.

**The Lagoon** is seven sandy islands round a turquoise lagoon: Shell Beach, Coral Cove, Turtle
Lagoon, Lighthouse Point, Pearl Reef, Whale Bay and Deep Blue Station. Every island has palms on its
sand (the landmark, the portal and the boss), a circular boardwalk on stilts, and overwater villas on
their own decks (`world/resort.js`):
- **Sea Math Villa:** a round thatched villa.
- **Explorers' Pavilion:** a two-storey pavilion.
- **Reef Lab:** a shingle-roofed lab with a glass dome, a telescope and a water slide.
- The shop and the other small places stand under thatched gazebos.

Long winding boardwalks with lanterns and a gate join each island to the next. Each island has its
own landmark: a sandcastle, a rainbow, a boat, a lighthouse, a giant clam, a whale fountain and a
little submarine. Sailboats and kayaks bob on the water. The townsfolk are crabs, sea turtles,
octopuses, seals and penguins.

**The Desert of the Pyramids** is seven oasis towns strung west to east along the Nile: Sphinx
Gate, Camel Market, Felucca Harbor, Obelisk Square, Balloon Field, Scroll Library and Starry Camp
(`world/desert/plan.js`, `scene.js`). Across the river from the first oasis stand the three Giza
pyramids, the queens' pyramids and the Great Sphinx, big enough to see from every oasis; arriving,
the camera looks north over the first oasis to them (`plan.arrival`). The camera always stands south
of the buddy and looks north. Every oasis is a palm garden with a paved plaza (a sun mosaic and the
landmark), a colonnade walk round it, a lotus pool, and raised stone paths out to platforms: the
schools on the river side facing the plaza, the small places under striped awnings on the south side,
the treasure nook due south. Raised stone causeways with a gate join each oasis to the next across
the dunes, lined with little sphinxes (the first and fourth), obelisks or palms. Feluccas sail the
river past reeds and papyrus; dunes with wind ripples roll out to mesas; the sky is late-afternoon
warm (`plan.sky`, `plan.sun`, `plan.fog`). The buildings are its own (`world/desert/buildings.js`):
- **Pyramid School:** a sloping-walled mastaba with a smooth pyramid on its roof, a gold capstone, a "123" medallion and an abacus by the door.
- **Temple School:** two pylon towers with painted friezes and pennants, a gateway under a winged sun, lotus columns, two little sphinxes on guard.
- **Sun Observatory:** a round drum with a sundial terrace on its roof, an obelisk for the pointer and a turning armillary sphere.

The landmarks are a sphinx fountain, a caravan well, a felucca harbour, a sun obelisk, a hot-air
balloon, a giant scroll and a star tent. The townsfolk are the desert's own: camels, fennec foxes,
meerkats, jerboas, geckos and scarab beetles, in sun hats and striped headscarves. The minimap
draws the Nile, the oases and the pyramids.

The desert's teachers are its own animals (`world/creatures/species.js`): **Miss Lotus**, a lilac
plush hippo with a lotus flower over one ear (the Pyramid School); **Uncle Reed**, a sacred ibis with
a turquoise-and-gold collar and a scroll under his wing (the Temple School); and **Dr. Sandy**, a sand
cat in lab goggles (the Sun Observatory). The history guides dress as Nile farmers, scribes (a black
bob wig), caravan guides and an archaeologist (a pith helmet). The oasis puzzle bosses are Pebble the
Little Sphinx, Grumpy Humphrey the camel, Sunny Lizzie the gecko, Rolly the Scarab, Huff the Hot-Air
Puff, Madam Whiskers the meerkat librarian and Dusk the Fennec.

**The Moon** is seven moonbases, each in its own round crater, on a ring round a grey plain:
Landing Crater, Rocket Ridge, Rover Tracks, Dish Valley, Greenhouse Crater, Crystal Caves and
Starlight Station (`world/moon/plan.js`, `scene.js`). Each crater is the same toy layout as a
Lagoon island: a landing pad in the middle (the landmark, the portal, the boss), a circular walk with
rails on the crater's inner terrace, and gangways out to landing pads for the schools and places.
Pressurised **glass-tube walkways** join each crater to the next through notches in the rims, with an
**airlock** (doors slide apart, a red or green light) that stays shut while the next moonbase is
locked. On the plain inside the ring stand giants you can see from everywhere: the **Big Rocket** on
its launch pad and tower, the **Moon Lander**, the **Radio Telescope**, and the **Moon Rover**
driving its loop round the rocket, with flagged rover roads out to every crater. The ground is
grey-white regolith with hundreds of craters, boulders, boot prints and rover tracks; the sky is black
and full of stars by day too, with the Sun, and the big blue-and-white **Earth** rising over the low
hills to the north: arriving, the camera looks over the first crater to the rocket and the Earth
(`plan.arrival`; the Moon lets the camera look a little flatter, `plan.maxPolar`). Night is
**Earth-light**: the bases go blue, the windows, cupolas and landing lights glow, and the Earth
shines brighter. The buildings are its own (`world/moon/buildings.js`, original designs):
- **Dome School:** a white habitat under a big dome with panel seams, a glass cupola, a "123" badge, a round airlock porch and solar wings.
- **Moon Museum:** three stacked cylinder modules with window bands, a round crest over the door (stars, a crescent and a rocket; no real insignia), a docking ring and a moon rock in a case.
- **Star Observatory:** a drum under a turning silver dome with a slit and a telescope, a lab pod and a radar dish.
- The shop and the other small places stand under white pod canopies.

The landmarks are a little lander, a little rocket by its tower, a rover garage, a radio dish, a
greenhouse dome, a crystal cave and a satellite. **Low gravity:** on the Moon the buddy and the
townsfolk hop higher and float down slower, lope when they walk, and kick up little puffs of moon dust
when they land (`plan.float`, `figures.js` `float`/`onLand`). The townsfolk are the Moon's own:
water bears (tardigrades), luna moths, axolotls, hamsters, robot pups and moon jellies, in space
suits (some with a comms headset under the helmet: see Space suits below). Moon dust sparkles in the air; the music is soft slow notes and far-off
radio blips (`space`). The minimap draws the craters round the plain, the tubes, the rocket and the
Earth.

The Moon's teachers are its own animals (`world/creatures/species.js`), each in their own space gear
(`hat.wear`, `creatures/hats.js`): **Miss Mochi**, the moon rabbit of the East Asian story — snowy
white, very long ears, a mortar of rice cakes in her arm, a pestle in her paw and a crescent-moon clip
(the Dome School; not the lilac bunny sprite); **Captain Ginger**, a grandpa red panda and retired space
captain in a star-badge captain's cap (the Moon Museum); and **Dr. Comet**, a koala astronaut-scientist
in a padded headband with her gold visor flipped up (the Star Observatory: a lab teacher with gear of
her own keeps it instead of lab goggles, `interiors.js`). The history guides dress as stargazers (a
starry cap), astronauts in flight suits and mission-control engineers in headsets; the museum shows a
mortar and pestle, a mooncake, Sputnik, a Vostok capsule, a cosmonaut's helmet, a slide rule, a moon
rock, Hubble, the ISS, the space shuttle, the Yutu-2 rover, the Apollo 13 air-filter fix and the
Danuri orbiter. The moonbase puzzle bosses are the Moon's own critters: Bumble the Water Bear, Captain
Nibbles the hamster, Rusty the Robot Pup, Lumi the Luna Moth, Pinky the Axolotl, Glimmer the Moon Jelly
and Twinkle the Star Puff.

**Mars** is Olympus Mons, the tallest volcano in the solar system, as a compact red-rock mountain
with a little Mars base wound round it (`world/mars/plan.js`, `scene.js`). One paved terrace spirals
up from the plain to the caldera's rim, about two and a half turns, and the seven floors lie along it
one after another — Landing Plains, Rover Ridge, Ice Ledge, Greenhouse Terrace, Weather Heights, Dust
Devil Ledge and the Caldera Rim, which wraps round the caldera's pit — so the floors face every side
of the mountain. Each floor is the same cosy base: its three schools side by side round a plaza
(joined by pressurised tubes, a ring in the floor's colour on the road in front), its landmark beside
them, the tents of the small places, the puzzle boss and the 🌀 portal by the ramp up and a chest at
the start; the buildings stand with their backs to the cliff, facing out, and in front of them runs
the road with a railing and lamps along its edge. Signposts with icons and numbers point the way (the
schools →, ⬆ the next floor →, ← ⬇ the floor below; going up is always to the right, seen from
outside), and each floor's start has a round badge with its icon and number. Wide gentle ramps, the
terrace's whole width, join the floors, with lit edges, yellow arrow chevrons, beacons at the foot
and a pressure door that stays shut while the floor above is locked. Nothing on a floor is more than
12 s' walk from its plaza (the schools 3 s), and plaza to plaza is about 23 s (a unit test measures
the walking paths). The turns never overlap, so the walking grid is one layer (`tree/nav.js`). The
camera always stands outside the mountain (`facing`), turns with the buddy as they go round
(`followRound`: A / D walk round the floor), and is lifted whenever the rock would be in the way
(`camLift`). The minimap shows the spiral from above: near you by default (turned so the way the
camera looks is up), or the whole volcano (the corner button); the schools are big coloured badges,
the places icons, the ramps arrows, locked floors grey, and you an arrow that turns with you; tap a
school or a place and the buddy walks there, tap a floor to go to it.
Round the foot, a steep escarpment drops to the red plain, where the giants stand: the shiny steel
**Big Rocket** by its launch tower, the **habitat village** of printed domes and greenhouse tunnels,
the six-wheeled **rover** on its loop and the **helicopter drone** circling over the village. Far out
are mesas, crater rims, a great layered canyon and the other Tharsis volcanoes; dust devils wander the
plain; the sky is butterscotch with a small bright **Sun** (low in the north-east, where the arrival
view sees it) and **Phobos** and **Deimos**; night is deep indigo with a blue glow low on the horizon.
The cliffs are painted in crisp layers of red, rust and ochre by height (a small shader on the rock).
Gravity is about 38 % of the Earth's: hops are a little floaty, with red dust puffs (`plan.float`).
The buildings are its own (`world/mars/buildings.js`, original designs, printed from red soil):
- **Red Dome School:** a tall dome 3D-printed in rings, a skylight, a printed arch porch with a "123" badge, and a printer gantry still printing a baby dome.
- **Mars Museum:** a round hab with a gallery of windows, a landing capsule on its roof, a porch on printed pillars under a red-planet badge, a meteorite under glass.
- **Weather Lab:** a rounded module with big solar wings, a weather mast with spinning cups and a wind vane, a radar dish.
- The small places stand under inflatable tents (teal arches, a striped top).

The floor landmarks are a landing site (a capsule under its parachute), a rover garage, an ice drill,
a greenhouse dome, a weather station, a dust-devil lookout and a caldera lookout. The townsfolk are
Mars's own: pikas, capybaras, sloths, armadillos, chinchillas and little rover-bots, with dust goggles
and beanies.

Mars's teachers are its own animals (`world/creatures/species.js`), each keeping a touch of their own
under the space helmet (`hat.wear`, `creatures/hats.js`, all in `HATS_IN_HELMET`): **Miss Ruby**, a
chocolate otter with a red Mars-pebble hair clip and a yellow pencil over her ear (the Red Dome School);
**Professor Woolly**, a grandpa alpaca with a fluffy topknot, round glasses and a little red-planet pin
(the Mars Museum); and **Dr. Digby**, a star-nosed mole — the pink star nose shows through the glass —
in round glasses and a miner's headlamp, which he keeps in the lab instead of goggles (the Weather Lab).
The history guides include a Babylonian sky-watcher, stargazers, mission engineers, scientists and
rover drivers in team caps (`roverteam`); the museum shows a sky-watcher's clay tablet, Asaph Hall's
telescope, an old Mars globe with its "canals", Mariner 4's hand-coloured picture, a Viking lander,
Pathfinder's airbags, a twin rover, Mangalyaan, Curiosity's Morse-code wheel, the Hope orbiter, a
sample tube, Zhurong, Ingenuity and MOXIE. The terrace puzzle bosses are Mars's own critters: Toffee the
Capybara, Bolt the Rover-Bot, Frosty the Chinchilla, Mossy the Sloth, Peep the Pika, Swirly the Dust
Devil (a dusty puff) and Sir Rollo the Armadillo.

**The Sky Castle** is a floating island high in a deep blue sky, crowned by a white-stone castle
town (`world/castle/plan.js`, `scene.js`, `buildings.js`). Like Mars, one street of terraces winds up
the castle hill (about two and a half turns, the same compact base and walking rules: every place within
12 s of its floor's plaza, the schools 3 s, plaza to plaza about 23 s, measured by a unit test), so the
floors face every side of the island: Gatehouse Market by the rim, Ribbon Lane, Dragon Court, Bell Tower
Walk, Sundial Garden, Balloon Bastion and the Crown Garden round the keep. Between the turns stand white
retaining walls of block masonry (a stone shader draws the courses), their tops planted with hedges,
flowers and little trees, ivy spilling down, windows, balconies and banners in their faces. In front of a
street's buildings the walls carry low round bastions the follow camera looks over; in front of the ramps
and street ends rise turrets with teal conical roofs and gold finials, and the keep crowns the summit (a
great round tower, slim tall towers, a ring of spires and halls round its courtyard). The ramps are wide
stone steps with a red carpet up the middle, between two gate towers whose portcullis is down while the
floor above is locked. Outside the town wall a ring of meadow and orchards with cottages runs to the rim,
where two streams pour off the edge as waterfalls into the clouds. Below the rim the underside is an
upside-down cone of layered blue-grey stone ledges, mossy near the top, hung with vines and roots. Big
soft cumulus clouds drift round and below it, little islets bob nearby (two tied to the rim with rope
bridges), and far below lie green hills, a river, forests, old stone ruins and blue mountains. Arriving,
the camera shows the whole island from beside it and holds that picture until you move (`plan.arrival`,
`hold`). Night brings stars, the moon, lanterns, glowing windows and stained glass. Blossom petals and
feathers drift over the streets; the music is a lute-like run of plucked notes with far-off bells
(`castle` mood).
The buildings are its own (`world/castle/buildings.js`, original designs):
- **Clock Tower School:** a little stone hall under a gabled roof, a square tower with a big clock face whose hands turn, an open belfry and a spire; a turret with a turning gold astrolabe.
- **Library Hall:** a steep-roofed hall, its gable to the street with a round stained-glass window, tall stained-glass windows by a double door, an open book, banners, a bell spire and a corner turret.
- **Inventor's Workshop:** a round stone tower with a half-timbered top storey and a conical roof, windmill sails turning on its front, a swinging timber crane and gold gears.
- The small places stand under round striped pavilion tents.

The landmarks are a wishing-well fountain, a ribbon maypole, a friendly stone dragon fountain, a bell
tower, a sundial garden, a balloon dock and the crown garden. The townsfolk are the castle's own, in
medieval outfits (`figures.js` `GARB`, painted on with `species.js` `garbPaint`, a hat each in
`creatures/hats.js`): badgers, kid goats, geese, ponies, ferrets, lambs and magpies as bakers, minstrels
with feathered caps, squires in tabards and soft padded helmets, ladies in gowns and hennins, jesters,
copyists in monk-like hoods, goodwives in linen coifs and wayfarers in red hoods. The minimap is Mars's
tap-to-walk spiral map in sky colours, with the keep and the waterfalls (`hud.js` `_spiralMap`).

The Sky Castle's teachers are its own animals, dressed for the castle (`world/creatures/species.js`, the
outfit painted on with `garbPaint`, a hat each in `creatures/hats.js`): **Miss Biscuit**, a ginger-and-white
corgi clockmaker in a teal tunic and a leather apron, a jeweller's loupe on her headband and a little gear on
the side (the Clock Tower School); **Professor Hartley**, a grandpa stag with small antlers, round glasses, a
long indigo scholar's robe with a gold collar and a velvet cap with a tassel (the Library Hall); and
**Dr. Sprocket**, a beaver inventor in a rust tunic and leather apron, with brass goggles pushed up on a leather
cap, which she keeps on in the workshop instead of lab goggles (the Inventor's Workshop). The history guides
wear medieval and world outfits (`figures.js` `GARB`): a baker, a stonemason, a Japanese plasterer in a
headband, a Joseon scholar in a gat, an engineer in a turban, a stone carver, a monk, a stone builder of Great
Zimbabwe, an abbess in a wimple, a scribe, a scholar of Fez, a Renaissance painter in a soft cap and a
balloon-maker of 1783 in a tricorn; the museum shows a trader's scales, a treadwheel crane, a golden
shachihoko, the Hunminjeongeum, the Elephant Clock, Angkor Wat, roof guardians, metal type, a soapstone bird,
a royal wax seal, a quill and ink pot, Leonardo's flapping-wing machine and a Montgolfier balloon. The street
puzzle bosses are the castle's own critters: Gertie the Goose, Lulu the Lamb, Glint the Magpie, Nibbles the
Goat, Fidget the Ferret, Clover the Pony and, keeping the Crown Garden, Sprout the Little Dragon.

**Space suits.** On the space maps (the Moon and Mars, `maps.js` `suit`) everyone wears a space suit:
the buddy, the townsfolk, the puzzle bosses, and the teachers and guides in the lesson rooms
(`figures.js` `suit`). The body is repainted as a soft suit with gloves, boots and a belt (the Moon's
white with teal and orange, Mars's warm white with dusty terracotta), a clear bubble helmet is sized
to each head (long ears fold down inside; a small hat stays on under the glass), with an oxygen pack
on the back and a chest light (`creatures/hats.js` `spaceHelmet`, `oxygenPack`, `chestLight`).

**Travelling.** A **World Portal** 🌍 stands on floor 1 of every world; walk into it, or press
**🌍 Worlds** at the top of the floor list, to choose a world. The choice is saved in the browser
(`arcademia.prefs`) and the next visit starts there.

**Adding a world** (`src/arcademia/maps.js`): give it a new realm and its own content.
1. **Lessons:** 2 per subject per floor, with `realm: '<realm>'`, in `content/<realm>.js`. Register them in `BY_REALM` in `content/index.js`.
2. **Teachers:** `figures.js` `teachersIn`, plus their voice ids in `voice/script.js` `REALM_TEACHER_OF` and their voices in `voice/generated.js`.
3. **Stories and puzzle bosses:** `quests.js` `worldsIn`, with keys `<realm>.world.<n>.*`.
4. **Text in every language:** `<realm>.teacher.*`, `<realm>.quest.*` and `<realm>.hello.*`, the floor names, and the lessons' translations in each language's `lessons-<realm>.js`. `tests/unit/arcademia-i18n.test.mjs` fails on anything missing.
5. **The map entry:** add it to `MAPS` with its floors' looks and a `kind` that `World.js` can build. A kind is a plan (pure numbers: floors with places, path and spots; stairs; `surfaces`, `height`, `floorAt`) plus its scenery. The tree's and the lagoon's plans and their layered walking grid (`world/tree/nav.js`) are the models.

The World Portal's picker then lists the new world by itself.

## Languages

The game speaks **English, 한국어 (Korean), Español, 日本語 (Japanese) and 简体中文 (Chinese)**. The
first time, the language follows the browser; the start screen and **Settings** (⚙️) change it, and
the choice is saved in the browser. Everything is translated: the HUD, places, quests, stickers, the
hat shop, the puzzle bosses' riddles, the townsfolk, all 51 lessons (stories, reading cards, the
chalkboard, history chats, timelines and treasures, the physics experiments, quizzes, hints and
worked answers), the parents' PIN and report, and the share page (which has its own picker; a share
link opens in the language the parent was using). Math questions are generated in the language,
with its own number formats (Spanish writes 0,3) and counting words (사과 3개, 3只鸭子). Every
character speaks every language (see [Voices](#voices)): a real person's recording where one exists,
else the character's pre-generated voice; **Read to me** and **Voice on** show in any language that
has voices, and the voice is on by default on floors 1–2. Professor Hoot, the Plus tutor, answers
in the chosen language: the page sends the locale and the server puts it into the tutor's
instructions.

Korean, Japanese and Chinese use the device's own fonts (Apple SD Gothic Neo, Hiragino, PingFang,
Noto CJK…) with their line-breaking rules.

**Adding a language** is a data change: copy `src/arcademia/i18n/locales/en/` (ui, lesson, parents,
chars, math), translate it, add `lessons-math.js`, `lessons-history.js` and `lessons-physics.js`
overlays (the lesson text only, shaped like the lesson), and add one line to `LOCALES` and `LOADERS`
in `src/arcademia/i18n/index.js`. `tests/unit/arcademia-i18n.test.mjs` fails on any missing key,
placeholder or lesson field, and `tests/unit/arcademia-math-i18n.test.mjs` checks every math
generator's answer in every language.

## Characters

Every creature is a soft-vinyl toy sculpted when the game loads: smooth signed-distance shapes
blended together, polygonised with surface nets and pulled onto the true surface, painted by region
(white muzzles, dark ear tips, bellies), toon-shaded with a fur rim or glossy paint, and outlined.
Each is auto-skinned to a small skeleton (hips, chest, head, ears, arms, legs, two tail bones,
wings) and animated in code: a squash-and-stretch walk, breathing, ear flicks, a wagging tail, a
happy hop, a cheer dance, a sad droop, a wave, thinking and surprise. Faces have glossy eyes with
highlights and real eyelids that blink, brows, blush, and mouths and eye shapes that change with
the expression. Meshes are built once per species (and costume) and level of detail; townsfolk use
a low-detail mesh. Hats are little 3D models seated on each head; in the shop they show as 3D
pictures, and the buddy picker is a live turntable (tap the buddy and it reacts). In lessons the
teacher's face is drawn live beside their speech bubble and reacts to right and wrong answers.
A soft see-through circle keeps the buddy visible behind trees and buildings.

## Playing

| Input | |
| --- | --- |
| Click or tap | Walk there; on a building or place, walk there and go in; on toys, critters and gems, play with them |
| **W A S D** / arrows (**Shift** to hurry) | Walk, relative to the camera |
| Drag · scroll or pinch | Turn the camera · zoom |
| **Enter** | Go in at a door |
| **H** · **N** · **M** · **+ / −** | Back to the buddy · day or night · sound · zoom |
| **Esc** | Close a panel, or leave a lesson |

A floor opens when two thirds of the lessons on the floor below have at least one star (the gate at
the foot of the stairs swings open, and the portal lights up). All floors are always visible; locked
ones are greyed behind their gate.

### A lesson

Every lesson is a quest from a teacher — Professor Hoot the owl (math), Tock the Time-Keeper the
tortoise (history) or Gizmo the raccoon inventor (physics) — and runs:

1. **Story** — who needs help, and why.
2. **Learn** — two to four reading cards, big text; **Read to me** plays the teacher's recorded
   reading of the card where one exists (real people only, no text-to-speech).
3. **The hands-on part**
   - Math: a worked example written in chalk on a real-looking chalkboard (grain, smudges, the
     chalk stick moving), mirrored onto the classroom's 3D board; then two practice problems with a
     manipulative — count, hop a number line, tens sticks, column sums with carrying and borrowing,
     arrays, pizza fractions, a balance scale, a shading grid.
   - History: a chat with a costumed guide (pick your questions, then they ask you one); a timeline
     to put back in order; a treasure to turn on a pedestal.
   - Physics: guess first, watch the experiment, then play with it yourself — falling with and
     without air, ramps and friction, pendulums, a seesaw, magnets, light and shadow, a circuit,
     floating and sinking, sound, ice-water-steam, orbits, a mirror, a race.
4. **Challenge** — three to five questions with a combo meter. A miss shows the hint; a second miss
   shows the answer and why. **Hint** and **Show me how** are always there (for generated math
   questions, "Show me how" draws the worked answer on a small chalkboard).
5. **Rewards** — one to three stars (all right on the first try: 3; 60 % or more: 2; finished: 1),
   coins, XP for the buddy's level, stickers.

Math questions are made from seeds by generators, so practice never runs out; history and physics
questions are written out. Every lesson is in `src/arcademia/content/`.

### The game around the lessons

Coins and XP from answers, lessons, arcade games, chests and gems; a buddy level; hats to buy in the
shop; 21 stickers in the museum; three daily quests on the quest board (claim 15 coins each); a streak
flame for days in a row; a puzzle boss on every floor (six riddles from that floor — cheer them up
with four right; no fighting); arcade games (Bubble Pop, Hungry Monster, Launch to the Basket, Who
Said It?). All of this lives in the browser per player (`arcademia.game.<player>`); the learning
record is the server's.

## Voices

Every character talks, in all five languages. A line plays, in this order:

1. **a real person's recording** of it, made in the **voice studio** (`public/audio/voice/`), which
   always wins;
2. else the character's **generated voice** (`public/audio/voice-gen/`), made ahead of time on a Mac
   with a free, local model, [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) (Apache-2.0) — see
   [Generated voices](#generated-voices);
3. else nothing: the line is just its text.

Nothing is synthesized in the browser: a unit test fails if the browser's speech synthesis API appears
in `src/`, `server/` or a page.

### The line script

Every spoken line has a **line id** taken from where its text lives, never from the text, so editing
a sentence or a translation keeps the id:

| Id | What | Example |
| --- | --- | --- |
| `t.<i18n key>` | a string-table line | `t.lesson.hello.math` |
| `t.<i18n key>~<variant>` | the same, filled in for one lesson or floor | `t.quest.history.intro~h1-long-ago`, `t.npc.6~3` |
| `l.<lesson id>.<path>` | a lesson's own text | `l.h1-long-ago.reading.2`, `l.p1-float-or-sink.quiz.0.hint` |

The characters are the teachers (`hoot`, `tock`, `gizmo`), one guide per history lesson
(`guide-<lesson id>`), the floor bosses (`boss-1` … `boss-7`), the `townsfolk`, and the buddies
(`buddy-fox`, `buddy-robot`, `buddy-dragon`, `buddy-puff`, `buddy-bunny`). Each line has a kind:
**barks** (greetings, "great job", "try again", the hint intro, lesson start and end, level up,
sticker found, the townsfolk's tips), then **story** lines, **reading** cards and **quiz** prompts. The
script puts barks first, then floor 1, 2 and so on, which is the order to record in. The buddies'
barks and the teachers' "try again" and hint intro are the `voice.*` keys in each language's `chars.js`.
Generated math questions and the chalkboard's worked examples change every time, so they have no line
and stay text only, as does the AI tutor's answer (see [Generated voices](#generated-voices) for why).

Each language has 3,050 lines (257 of them barks), about six hours of speech:

| Character | Barks / all lines (every language) |
| --- | --- |
| Professor Hoot · Tock · Gizmo (the mountain) | 16 / 92 · 15 / 263 · 17 / 271 |
| Nutmeg · Grandpa Bramble · Dr. Ribbit (the Great Tree) | 17 / 199 · 15 / 239 · 17 / 255 |
| Captain Pip · Grandma Inka · Dr. Splash (the Lagoon) | 17 / 199 · 15 / 239 · 17 / 255 |
| each history guide (16 + 14 + 14) | 0 / 8 |
| the bosses of each world (7 × 3) | 2 / about 20–33 |
| the townsfolk | 19 / 19 |
| each of the five buddies | 10 / 10 |

The new teachers and bosses have voice designs (`voice/generated.js`) but no generated takes yet; until
they are made on the Mac Studio, their lines show as text.

A printable script and a CSV per character and language, with each line's id, text, the
character's direction ("warm, encouraging, slow and clear for 6–8 year-olds"), where it is heard and
an estimated length:

```bash
npm run voice:script                       # everything → data/voice-script/<lang>/<char>.csv and .html
npm run voice:script -- --lang ko --char hoot
npm run voice:script -- --kind bark --missing   # barks nobody has recorded yet
npm run voice:script -- --stats            # the counts
```

### The voice studio

`voice-studio.html` — on the dev server `http://127.0.0.1:5173/voice-studio.html`, in production
`https://<site>/voice-studio.html`. It is for the site's admins: the production server asks for the
admin id and password (`ADMIN_ACCOUNTS`, `ADMIN_PASSWORD`, as for the other admin APIs) before it
serves the page, and every `/api/voice` call checks again. The dev server asks too when those are set
in `.env`; with neither set it lets the local machine in.

1. **Choose a voice actor.** A new actor gives the name they want in the credits, the characters and
   languages they voice, and ticks the **consent** box: their voice will be used in the game and
   credited by that name, and they can ask for removal. The server stores the consent text, its
   version, the date and which admin took it. **Remove all my recordings** deletes every file of
   theirs and their credit, and records the date of the removal.
2. **Pick a character and a language.** The teleprompter shows the line big, with its direction and
   where it is heard. **Space** (or the button) counts in 3-2-1 and records; **Space** stops. A level
   meter (with peak hold and a clip light) runs while the microphone is open.
3. **Takes.** Each line in the list shows whether it has a recording (a full dot), only a generated
   voice (a half dot, and a **🤖 Generated** row with **▶ Play** for reference) or nothing. Record as
   many takes as you like (**R** retakes), play them back (**P**), choose one and keep it (**Enter**);
   a kept take replaces the generated voice for that line. **←/→** move between lines. Filters show missing lines only, a kind or a floor, and
   the progress card counts done / total (and barks) per character and language.
4. **Processing,** in the browser with plain WebAudio maths (`src/arcademia/voice/dsp.js`): an 80 Hz
   high-pass, trimmed silence (80 ms kept before, 150 ms after), an optional gentle noise gate (−12 dB
   between words, never muted), loudness to **−18 LUFS** (ITU-R BS.1770 integrated loudness) with a
   look-ahead limiter keeping peaks at **−1 dBFS** or under, and short fades. A take warns about
   clipping, a very quiet or noisy recording, or peaks that kept it from reaching −18 LUFS.
5. **Saving.** The kept take is uploaded to `/api/voice` (`server/voiceStore.js`), which writes
   `public/audio/voice/<lang>/<char>/<line id>.<ext>` and `public/audio/voice/manifest.json` (line →
   files, duration, actor, take date, loudness and peak). Recorded under `npm run dev`, the files are
   the repo's own and ship with the next build. Production writes to `VOICE_DIR` (default
   `public/audio/voice`; point it at a persistent volume) and serves that folder at `/audio/voice/`
   ahead of the built copy.

The server checks everything: the language, character and line must be in the script, the actor must
have agreed and voice that character in that language, the type must be WebM, MP4 or Ogg audio and
start like one, a file is at most 2 MB and a line at most 60 s, and the path is built from checked
parts and checked again to be inside `VOICE_DIR`.

**The format.** Browsers record Opus in WebM (Chrome, Edge, Firefox) or AAC in MP4 (Safari), and there
is no encoder in the browser without a dependency other than MediaRecorder itself. So the studio
records at 256 kb/s, decodes to PCM, processes it, and plays the result silently into
MediaRecorder again: **Opus in WebM at 64 kb/s** (every current browser plays it, Safari since 18),
plus an **AAC in MP4** copy at 96 kb/s where the browser can record AAC (Safari), so older Safari has
something to play. The game picks the first format the browser says it can play. Re-encoding takes as
long as the line (it happens in the background while the next line is recorded); the high first
recording rate keeps the second generation clean.

### In the game

`speech` (`src/arcademia/sound.js`, the player in `src/arcademia/voice/player.js`) plays a line by id:
`speech.say('t.lesson.hello.math', { char: 'hoot', face, bubble })`. It plays only the recording for the
current language and that character — a person's recording first, else the generated take — and with
neither it does nothing (never another language's or another character's voice). Text from an older
call is looked up in the current language's script as a fallback. While a line plays, the music ducks a little
(`music.duckVoice`), the speaker's mouth follows the voice's loudness (`creature.lipSync`; Hoot,
whose face has a beak, nods instead) and the speech bubble glows. A floor's barks are fetched when
the floor opens and a lesson's lines when it starts; the rest load when first heard. The Credits panel's
**Voices** entry credits the generated voices ("Character voices generated with Qwen3-TTS
(Apache-2.0)", with its link) and lists the actors by their chosen name, with the characters they
recorded.

### Generated voices

Until a person records a line, the character speaks it in a **generated voice**, made ahead of time on
a Mac and shipped as audio files: nothing is generated in the browser or on the game server.

**The model.** [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) (Alibaba Qwen team, January 2026):
Apache-2.0 code and weights, not gated, no limits on using the output and no territory exclusions,
natural and expressive in all five of our languages (it covers ten), and it runs on Apple silicon.
Checked in November 2026 against the other free options: Chatterbox Multilingual (MIT, 23
languages, but it stamps every output with Resemble's Perth watermark and its voices come from
reference recordings), CosyVoice 2/3 (Apache-2.0; voices from reference recordings, which we would
need the rights to), MeloTTS (MIT, all five languages but flatter) and Kokoro (Apache-2.0, no Korean);
F5-TTS weights, XTTS-v2 (Coqui CPML) and Fish/OpenAudio are non-commercial. Two of its models are used:
**VoiceDesign** makes a voice from a written description, so no real person's voice is ever cloned,
and **Base** speaks any line in a voice from a short reference clip. Whisper large-v3-turbo (MIT)
listens to every take to check the words.

**Install** (once; idempotent, `-- --check` only reports):

```bash
npm run voice:setup     # library/tools/qwen3-tts: pinned source, a uv venv (Python 3.12), weights (~11 GB)
```

**The cast.** Each character's voice is a written description in `src/arcademia/voice/generated.js`
(`CAST`): Professor Hoot a warm, clear, gently enthusiastic teacher; Tock an old, slow, cosy
storyteller; Gizmo a quick, playful young inventor; the townsfolk a cheerful, chatty villager; the
five buddies real children's voices (never sped up or pitched); the bosses playful and theatrical,
never scary; the 16 history guides nine varied adult voices, one per guide. For each character,
VoiceDesign renders a short reference clip: first in English (the **anchor**), then in each other
language, where three candidates are made and the one whose speaker embedding is closest to the
anchor's is kept, so the accent is native and the character is recognisably the same person in all
five languages. Lessons on floors 1–2 (ages 6–7) use a second, slower and clearer reference of the
same voice. The reference clips stay in `library/tools/qwen3-tts/refs/`.

**Generating** (resumable: stop it any time; a line already made for the same text is skipped):

```bash
npm run voice:gen -- --tier core             # barks + floors 1–2, all languages (committed)
npm run voice:gen -- --tier extra            # floors 3–7 (git-ignored; regenerate on each machine)
npm run voice:gen -- --lang ko --char hoot   # one language / character; --kind bark; --floor 3-4
npm run voice:gen -- --force                 # make them again
npm run voice:gen -- --samples <dir>         # a listening page: one line per character per language
npm run voice:gen -- --encode-only --bitrate 20000   # re-encode from the kept masters
```

**On another Mac** (a Mac Studio, so a laptop stays cool): `npm run voice:remote` does the same over
SSH, with your own ssh config and key only (`BatchMode`: it never asks for or keeps a password).

```bash
H="--host <user>@<mac-studio> --identity ~/.ssh/id_ed25519"   # or VOICE_REMOTE_HOST / VOICE_REMOTE_IDENTITY
npm run voice:remote -- $H                 # sync, voice:setup there, start everything (detached, --missing)
npm run voice:remote -- $H --lang es,ja,zh # any voice:gen arguments; e.g. split languages between Macs
npm run voice:remote -- $H --status        # running or not, clips so far, the end of its log
npm run voice:remote -- $H --pull          # fetch finished clips and merge them in (newer takes win)
npm run voice:remote -- $H --stop          # stop after the current batch; run the first command to resume
npm run voice:remote -- $H --dry-run       # print the ssh / rsync commands, run nothing
```

It sends only what the generator needs (`scripts/voice/remote.mjs` walks the generator's imports: its
scripts, the voice modules, the lessons and string tables), a dependency-free `package.json`, the
voice manifests and clips, and the designed reference voices, so every Mac speaks with the same
voices — never `.env`, `data/` or the asset library. There it lives in `~/gamory-voice`, installs the
model into its own `library/tools/qwen3-tts`, and runs under `nohup caffeinate -i`, so it survives the
ssh session ending and the Mac idling. The remote needs Remote Login on (System Settings → General →
Sharing), your public key in its `~/.ssh/authorized_keys`, and Node 22+, git and uv (Homebrew; remote
commands run in a login shell so `/opt/homebrew/bin` is on PATH). Re-running only sends what the
remote lacks (`--ignore-existing`), so its finished lines are never overwritten, and `--pull` merges
back line by line (the newer take wins). Batches are 48 takes on a newer Mac with 96 GB or more and 24
on M1/M2 chips or smaller Macs; on M1/M2 Whisper checks one take at a time (in batches it took 87 GB
of GPU memory there). Measured: M5 Max 2.5–3.9× real time, M1 Ultra about 2.4×.

Per line: the text is normalised for speech (`src/arcademia/voice/normalize.js`: emoji out; sums,
fractions, decimals, percentages, money, degrees, units and years in words the way a teacher reads
them — "3 + 7 = ?" → "three plus seven equals what?", 1492 → "fourteen ninety-two", 사과 3개 → 사과
세 개, 3/4 → 四分の三, 1492年 → 一四九二年), two takes are generated, each runs through the studio's
own chain (`dsp.js`: high-pass, trim, fades, −18 LUFS, peaks ≤ −1 dBFS), Whisper transcribes it, and
the take with the fewest word errors (English, Spanish) or character errors (Korean, Japanese,
Chinese) wins, as long as it has no clipping, no long silence and a plausible length for its text.
Japanese is compared on its pronunciation in kana (fugashi with UniDic), since Whisper may write 座って
where the script has すわって. A line over the threshold (15 % WER; 12 % CER; 15 % for Japanese kana) is tried
again, twice; the best take is then kept and marked `rough` in the manifest, or the line stays
silent. The chosen take is encoded as **Opus in WebM at 22 kb/s mono** (PyAV; no system ffmpeg) and
its processed WAV is kept in `library/tools/qwen3-tts/masters/` for re-encoding. Lines with a
person's recording are skipped.

**Where they go.** `public/audio/voice-gen/<lang>/<char>/<line id>.webm`, listed in
`public/audio/voice-gen/manifest.json` (**core**: every bark and every floor 1–2 line, committed) and
`manifest.local.json` (**extra**: floors 3–7, git-ignored, as are their files). Both manifests say
`"generated": true` with the model, its licence and link; each line has its duration, take date, the
voice it was made from, its error rate and a hash of its text (so an edited line is made again).
`public/audio/voice-gen/.gitignore` is written by the generator: it ignores everything there except
the core files. `npm run build` checks the core (`scripts/voice/ensure.mjs`); with
`VOICE_AUTO_GEN=1` and the generator installed it also generates whatever is missing before
building. The game loads both manifests and plays whichever has the line.

**Not voiced.** Generated math questions and the chalkboard's worked examples change every time.
Splicing them from pre-made number words was tried on paper and rejected: Korean particles change
with the number before them (7은, 2는), Japanese and Korean counters change the reading of the number
(いっぽん, 한 개), and stitched words sound robotic next to the natural lines. They stay text, as does
the Plus tutor's answer: one line takes the model about 2.5 s per second of speech unbatched on an M5
Max (it needs batches to be fast), the production server has no Apple GPU, and an 11 GB model is no
fit for it.

## Progress and the parents' report

Signed in, **the server is the source of truth** (`server/learningStore.js`, migration
`010-learning`): readings, every answer, finished lessons and study time are events, and each
lesson keeps its best stars. Writes are checked, not trusted:

- stars are a lesson's best, 0–3, and never more than the right answers the server recorded for
  that lesson since it was last finished allow;
- study time is at most 90 s a heartbeat, never more than the time really gone by since the last one,
  and at most six hours a day; answers are capped per day; the same lesson finished twice within 20 s
  counts once.

Signed out, the same data stays in this browser (`arcademia.guest.v1`), and on signing in the game
offers to bring it into the account — once, capped harder (known lessons only, the last 60 days, at
most three hours of study a day).

**Parents** opens a PIN gate: a 4-digit PIN set on first use, stored as scrypt on the server
(guests: PBKDF2 in the browser). Five wrong tries lock it for 15 minutes; the account's password
clears a forgotten PIN. The report shows minutes a day by subject, lessons finished, quiz accuracy
by subject against last week, stars and the floor reached, the streak, the topics worth practising
and recent activity — each chart with hover tooltips and a table view, in light and dark. The subject
colours are fixed (Math blue, History orange, Physics green) and were checked for colour-blind
separation on both surfaces.

A signed-in parent can make a **read-only share link** — `parent-report.html#t=<random token>` —
that opens the report alone, with no sign-in; making a new link stops the old one, and it can be
turned off.

## Professor Hoot, the AI tutor (Plus)

`POST /api/ai/tutor` answers questions about the current lesson, hint first, in short kid-friendly
sentences. The server writes the tutor's instructions (the page cannot send its own), adds the
lesson's reading, caps what the child typed (300 characters, the last four turns) and takes out
anything that looks like an email address, phone number or link before it goes to the LM model. No
name, account or other personal data is sent.

It is **Plus only, decided on the server** (`tutor` in `src/platform/plans.js`: 0 tokens on Free,
350 on Plus): a free account gets 403 whether or not a model is running, and `task: 'tutor'` on
`/api/ai/command` is refused so the general route can't be used instead. Free players see the owl
button with a Plus badge and get the lesson's own hint and worked answer. With no model reachable,
Hoot is "resting" and shows the same prebuilt help — the whole game works with the model off.

## For developers

| Part | File |
| --- | --- |
| The game: world, HUD, lessons, places, settings | `src/arcademia/ArcademiaGame.js` |
| Floors (themes) and their stories and bosses | `src/arcademia/floors.js`, `src/arcademia/quests.js` |
| Lessons: format and checks; math generators and chalkboard scripts; history; physics | `src/arcademia/content/` |
| Stars, unlocks, caps, the weekly report (shared with the server) | `src/arcademia/rules.js` |
| The mountain plan: terraces, places, stairs, stream, heights, walking grid | `src/arcademia/world/layout.js` |
| Study worlds: the list, the Great Tree's, the Lagoon's, the Desert's, the Moon's, Mars's and the Sky Castle's floors | `src/arcademia/maps.js` |
| Mars: plan (the spiral terrace, its floors and ramps, the rock, the camera lift), 3D scene, printed habitats, landmarks, the rocket, rover and drone | `src/arcademia/world/mars/plan.js`, `scene.js`, `buildings.js` |
| The Sky Castle: plan (the winding street, its floors and ramps, the island, the camera lift), 3D scene (walls, turrets, keep, underside, clouds, islets, the land below), buildings, landmarks, pavilion tents, the portcullis | `src/arcademia/world/castle/plan.js`, `scene.js`, `buildings.js` |
| Each world's lessons, teachers and stories (realms) | `src/arcademia/content/forest.js`, `content/sea.js`, `content/desert.js`, `content/moon.js`, `content/mars.js`, `figures.js` `teachersIn`, `quests.js` `worldsIn` |
| The Lagoon: plan (islands, boardwalks, villas), 3D scene, resort buildings and landmarks | `src/arcademia/world/lagoon/plan.js`, `scene.js`, `src/arcademia/world/resort.js` |
| The Desert: plan (oases, causeways, the Nile, Giza), 3D scene, sandstone buildings, landmarks, sphinxes | `src/arcademia/world/desert/plan.js`, `scene.js`, `buildings.js` |
| The Great Tree: plan (rings, decks, bridges, spiral stair), layered walking grid, 3D scene | `src/arcademia/world/tree/plan.js`, `nav.js`, `scene.js` |
| Grown buildings (seed pod, root hall, star seed observatory, leaf canopies) and the night glow | `src/arcademia/world/grown.js`, `src/arcademia/world/glow.js` |
| The diorama (lazy per-floor detail, silhouettes far away), terrain, buildings, places, rooms | `src/arcademia/world/` |
| The creatures: sculpting, species recipes, faces, hats, materials; the creature API | `src/arcademia/world/creatures/`, `src/arcademia/world/figures.js` |
| Languages: the i18n core, string tables and lesson overlays | `src/arcademia/i18n/` |
| Start screen, settings, credits (and the credits list) | `src/arcademia/ui/settings.js`, `src/arcademia/credits.js` |
| Voices: the line script, take processing, the manifest, the player, the studio | `src/arcademia/voice/`, `voice-studio.html`, `server/voiceStore.js`, `scripts/voice-script.mjs` |
| Lessons, chalkboard, practice, sims, mini-games, puzzle boss | `src/arcademia/lesson/` |
| HUD, buddy wardrobe, quest book, tutor panel, parents, report charts | `src/arcademia/ui/` |
| Coins, XP, stickers, quests (browser) · learning record (browser or server) | `src/arcademia/gamestate.js` · `src/arcademia/progress.js` |
| Learning API and its caps | `server/learningStore.js` (wired in `server/server.js` and `vite.config.js`) |
| The tutor route | `server/api/ai.js` |
| The share page | `parent-report.html`, `src/arcademia/sharedReport.js` |
| Tests | `tests/unit/arcademia.test.mjs`, `arcademia-i18n.test.mjs`, `arcademia-math-i18n.test.mjs`, `arcademia-creatures.test.mjs`, `voice.test.mjs`; `tests/e2e/voice.mjs`, `tests/e2e/worlds.mjs` |

To add a floor, add an entry to `FLOORS`, a world to `WORLDS` and at least two lessons per subject:
the mountain, nav, minimap and unlock rules follow.

The creatures' proportions and walk started from the walker kits in `vendor/3dviz`, and the terrace
layout from its village kit and diorama recipe. The sculpting follows `knowledge/assets-guide.md`
§5.3. Credits (three.js, the 3dviz kits, the Nunito font) are listed in the game's Credits panel
from `src/arcademia/credits.js`.
