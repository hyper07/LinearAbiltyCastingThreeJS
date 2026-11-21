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

Each language has 991 lines (131 of them barks), about two hours of speech:

| Character | Barks / all lines (every language) |
| --- | --- |
| Professor Hoot | 16 / 92 |
| Tock | 15 / 263 |
| Gizmo | 17 / 271 |
| each of the 16 history guides | 0 / 8 |
| bosses 1–7 | 2 / 33, 33, 19, 20, 20, 22, 21 |
| the townsfolk | 19 / 19 |
| each of the five buddies | 10 / 10 |

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
| Tests | `tests/unit/arcademia.test.mjs`, `arcademia-i18n.test.mjs`, `arcademia-math-i18n.test.mjs`, `arcademia-creatures.test.mjs`, `voice.test.mjs`; `tests/e2e/voice.mjs` |

To add a floor, add an entry to `FLOORS`, a world to `WORLDS` and at least two lessons per subject:
the mountain, nav, minimap and unlock rules follow.

The creatures' proportions and walk started from the walker kits in `vendor/3dviz`, and the terrace
layout from its village kit and diorama recipe. The sculpting follows `knowledge/assets-guide.md`
§5.3. Credits (three.js, the 3dviz kits, the Nunito font) are listed in the game's Credits panel
from `src/arcademia/credits.js`.
