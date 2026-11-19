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

## Languages

The game speaks **English, 한국어 (Korean), Español, 日本語 (Japanese) and 简体中文 (Chinese)**. The
first time, the language follows the browser; the start screen and **Settings** (⚙️) change it, and
the choice is saved in the browser. Everything is translated: the HUD, places, quests, stickers, the
hat shop, the puzzle bosses' riddles, the townsfolk, all 51 lessons (stories, reading cards, the
chalkboard, history chats, timelines and treasures, the physics experiments, quizzes, hints and
worked answers), the parents' PIN and report, and the share page (which has its own picker; a share
link opens in the language the parent was using). Math questions are generated in the language,
with its own number formats (Spanish writes 0,3) and counting words (사과 3개, 3只鸭子). **Read to
me** uses a voice for the language when the device has one. Professor Hoot, the Plus tutor, answers
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
2. **Learn** — two to four reading cards, big text; **Read to me** (and an automatic voice on floors
   1–2) uses the browser's speech when it has one.
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
| The diorama (lazy per-floor detail, silhouettes far away), terrain, buildings, places, rooms | `src/arcademia/world/` |
| The creatures: sculpting, species recipes, faces, hats, materials; the creature API | `src/arcademia/world/creatures/`, `src/arcademia/world/figures.js` |
| Languages: the i18n core, string tables and lesson overlays | `src/arcademia/i18n/` |
| Start screen, settings, credits (and the credits list) | `src/arcademia/ui/settings.js`, `src/arcademia/credits.js` |
| Lessons, chalkboard, practice, sims, mini-games, puzzle boss | `src/arcademia/lesson/` |
| HUD, buddy wardrobe, quest book, tutor panel, parents, report charts | `src/arcademia/ui/` |
| Coins, XP, stickers, quests (browser) · learning record (browser or server) | `src/arcademia/gamestate.js` · `src/arcademia/progress.js` |
| Learning API and its caps | `server/learningStore.js` (wired in `server/server.js` and `vite.config.js`) |
| The tutor route | `server/api/ai.js` |
| The share page | `parent-report.html`, `src/arcademia/sharedReport.js` |
| Tests | `tests/unit/arcademia.test.mjs`, `arcademia-i18n.test.mjs`, `arcademia-math-i18n.test.mjs`, `arcademia-creatures.test.mjs` |

To add a floor, add an entry to `FLOORS`, a world to `WORLDS` and at least two lessons per subject:
the mountain, nav, minimap and unlock rules follow.

The creatures' proportions and walk started from the walker kits in `vendor/3dviz`, and the terrace
layout from its village kit and diorama recipe. The sculpting follows `knowledge/assets-guide.md`
§5.3. Credits (three.js, the 3dviz kits, the Nunito font) are listed in the game's Credits panel
from `src/arcademia/credits.js`.
