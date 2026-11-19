# Music

One shared soundtrack for every game: real, produced-sounding background music
(orchestral, acoustic, folk, ambient and synthwave), generated free on this Mac
with **ACE-Step 1.5** (MIT), each track looped seamlessly, mastered to the same
loudness, and played by one small module, `src/shared/music.js`.

Listen to all of it: `npm run music:preview`, then open
<http://127.0.0.1:5200/music-preview.html>.

## The tracks

All in `public/audio/bgm/` as Ogg Vorbis (about 100 kbps, 48 kHz stereo),
described by `public/audio/bgm/manifest.json` (loop points, mood, tags, BPM,
key, pair, credit). Loudness is about −16 LUFS integrated for the beds and −14
for the stingers, with peaks under −1 dBFS.

<!-- tracks:start -->
| id | Title | Tags | Mood | BPM asked (measured) | Key asked (measured) | Length | Loop | Size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `battle` | Steel Rain | battle | battle | 150 (152) | D minor (D minor) | 2:37 | 57.24–156.53 s | 2.07 MB |
| `boss` | Crown of Cinders | battle, boss | boss | 140 (143.6) | C minor (C major) | 2:21 | 15.49–140.64 s | 1.73 MB |
| `meadow` | Sunlit Meadow | calm, nature | calm | 75 (76) | D major (D major) | 2:19 | 36.04–138.44 s | 1.56 MB |
| `night-forest` | Violet Hollow | calm, nature, night | calm | 66 (66.3) | A minor (A minor) | 2:37 | 7.34–156.39 s | 1.95 MB |
| `village` | The Warm Hearth | town, calm | calm | 104 (103.4) | G major (D major) | 2:00 | 39.78–119.77 s | 1.53 MB |
| `lantern-valley` | Lantern Valley | calm, nature, town | calm | 72 (71.8) | A minor (A major) | 2:30 | 39.24–149.23 s | 1.74 MB |
| `jungle` | Over the Falls | nature, calm | calm | 110 (73.8) | E minor (E minor) | 2:22 | 37.78–141.01 s | 1.84 MB |
| `jungle-hunt` | The Gorge Hunt | battle, nature | battle | 110 (112.3) | E minor (E minor) | 2:24 | 58.12–143.85 s | 1.98 MB |
| `frozen-fortress` | Rime Keep | dungeon, night | tense | 70 (69.8) | C minor (C minor) | 2:39 | 59.35–158.78 s | 1.95 MB |
| `playful` | Paper Kites | kids, calm | calm | 116 (117.5) | C major (C major) | 2:20 | 39.03–139.20 s | 1.81 MB |
| `city-night` | Neon Overpass | city, night | calm | 120 (117.5) | A minor (A minor) | 2:14 | 29.56–133.56 s | 1.59 MB |
| `title` | First Light | menu | calm | 96 (95.7) | D major (F# minor) | 2:21 | 28.72–140.99 s | 1.70 MB |
| `victory` | Victory | stinger | victory | 120 (161.5) | C major (C major) | 0:09 | stinger | 0.11 MB |
| `defeat` | Retreat | stinger | defeat | 70 (103.4) | D minor (D minor) | 0:07 | stinger | 0.08 MB |
| `level-up` | Level Up | stinger | levelup | 120 (117.5) | F major (C major) | 0:07 | stinger | 0.09 MB |
| `discovery` | Treasure Found | stinger | discovery | 90 (44.6) | E major (E major) | 0:08 | stinger | 0.10 MB |

16 files, 21.8 MB in all. "Measured" is what librosa hears in the chosen take: tempo from its beat tracker, key from chroma profiles (it can confuse a key with its relative or parallel key, or with the dominant, especially in modal or pentatonic writing).
<!-- tracks:end -->

**Pairs.** Three calm/tense pairs share a key and a pulse, so a game can
crossfade between them mid-phrase (`setMood` starts the other side in step with
the bar): *Sunlit Meadow* ⇄ *Steel Rain* (D major / D minor, 75 / 150 BPM),
*Over the Falls* ⇄ *The Gorge Hunt* (E minor, 110 BPM), *Rime Keep* ⇄ *Crown of
Cinders* (C minor, 70 / 140 BPM). The model takes a key and a tempo as inputs and
mostly holds them; the measured key and tempo of every take are in the
manifest (`measured`), so check them before relying on a pair. As built: the
jungle pair both measure E minor (the explore side moves in a broad 3-against-2
feel, so the tracker hears 73.8 BPM against the hunt's 112); the meadow/battle
pair measure D major and D minor at 76 and 152; *Crown of Cinders* reads as C
major against *Rime Keep*'s C minor (same tonic, so the crossfade still sits
well).

## Which game uses what

As wired (`src/shared/gameMusic.js`: `GAME_TRACKS`, the area → track rules,
and each game's `music` — a `GameMusic`):

| Game | Where (calm) | Fight | Boss | Stingers | Mute |
| --- | --- | --- | --- | --- | --- |
| Gloamreach | `title` on the start screen; `village` among Brindlewick's houses, `meadow` in the fields and at the overlook, `night-forest` in the Gloamwood (and where its dusk is thick), `frozen-fortress` on the drake's ledge | `battle` | `boss` (Cindermaw) | `victory` (boss or elite down), `defeat`, `level-up`, `discovery` (a chest, a legendary drop) | Sound |
| Wyldhunt | by zone (`wyldhuntTrack`): `village` at Lantern Camp, `jungle` down Veilfall Reach and in the Hollow Heights, `jungle-hunt` as the bed up in the Heights once the Gnarlhorn is tracked and within 140 m; it carries on through a gate when the next zone's rule gives the same track | `jungle-hunt` (the pair, in step) | `boss` while the Gnarlhorn rages | `victory` (slain), `discovery` (a part breaks), `defeat` (you faint) | Sound |
| Kithvale | `lantern-valley` in Lanternrest and at dusk, `meadow` out in the vale by day (softer under the trust moment) | — | — | `discovery` when a creature joins | Sound |
| Kindlewatch | `frozen-fortress` | `battle` | `boss` (Hrimgar, in the throne room) | `victory`, `defeat`, `level-up` (a beacon lit) | the pause menu's Sound |
| AI Arcademia | `playful`, at 40 % under a lesson | — | — | `level-up` (stars, a level, a floor, a puzzle boss), `discovery` (a chest, a sticker); the old fanfare when the music is off | Sound |
| Gangnam Drift | `city-night` while racing, and driving at night; otherwise quiet (the engine and the city) | — | — | `victory` (first past the line) | the Graphics panel's Music |
| Lanternwood | `title` on the title; by realm: `village` round the camp fire, `night-forest` in the Lanternwood, `meadow` in Sunmeadow, `frozen-fortress` in Frostpeak and Emberfall | `battle` | `boss` | `victory` (boss or hero monster), `defeat`, `level-up`, `discovery` (chests) | the pause menu's Music |
| Stoneball | quiet on the start screen; `battle` at 45 % in a match | — | — | `victory` or `defeat` at full time | M |
| Home page | `title` at 35 %, from the first click or key | — | — | — | ♪ in the bar |

**Moods** come from game state with hysteresis (`MoodHold`): into the fight at
once (a monster alert, chasing or striking near you), out of it only after 5–6
s without one; a boss raises it at once and steps down through `battle`. **Places**
must hold for 2–2.5 s (`Settle`) before their track crossfades in (3 s), so
walking along an edge doesn't flap; a new screen or realm (`music.jump`) changes
at once. The fight's state is read in the game's own frame, so a paused game
(a menu, the map) holds the music where it is; music.js keeps it playing, and
suspends it in a hidden tab.

**Settings.** Every game's pause or settings menu has a Music section beside
Graphics (`musicMenu()`): on/off, the music volume, and the track-name toast
— one setting for all games (`gamory.music`). The home page's ♪ button (a
crossed ♪ when off) is that same switch, with the volume under its ▾: music
off there starts every game with its music off, and On in any game's Music
menu turns it back on everywhere. A game's own Sound switch is separate and
only adds to it: it silences the music while that game's sound is off
(`linkMute`), without changing the saved music setting.

## Wiring it into a game

```js
import { music, musicCredits } from '../shared/music.js';

// Once, when the game opens: which track each mood means here.
music.configure({ moods: { calm: 'night-forest', tense: 'frozen-fortress', battle: 'battle', boss: 'boss' } });
music.linkMute(() => this.sound.muted);   // the game's own sound toggle silences the music too
music.play('night-forest');               // waits for the first click/key if the browser blocks autoplay

// During play:
music.setMood('battle');                  // 1.5 s equal-power crossfade in…
music.setMood('calm');                    // …3 s back out
music.stinger('victory');                 // jingle over the bed, which ducks under it

// Settings panel:
music.setVolume(0.5); music.setMuted(true); music.toggleMute();
music.setToast('off');                    // the "♪ title · Music: …" credit toast ('first' | 'always' | 'off')

// When the game closes:
music.stop({ fade: 1 });

// Credits panel: one entry per generator, with the titles this game uses.
const rows = musicCredits(['night-forest', 'battle', 'boss', 'victory']);
// → [{ name: 'ACE-Step 1.5', what: 'Background music: Violet Hollow, Steel Rain, …',
//      site, licence: 'MIT', licenceUrl, attribution, text, items }]
```

`music.play(tag)` also takes a tag (`'nature'`, `'town'`, `'night'`…), picking a
track other than the current one. `music.credit()` gives the current track's
credit. Volume, mute and the toast setting are saved in localStorage
(`gamory.music`) and shared across games.

How it plays: each file's intro plays once, then `[loopStart, loopEnd)` loops
sample-accurately (an `AudioBufferSourceNode` with `loopStart`/`loopEnd`). Files
are fetched and decoded the first time they're needed; the last three beds stay
decoded (a 2½-minute bed is about 55 MB as PCM), stingers always. If a browser
can't decode Ogg Vorbis in WebAudio it streams through an `<audio>` element and
loops by hand (close, not sample-exact). The context suspends while the tab is
hidden. Ogg Vorbis plays in Chrome, Edge, Firefox and Safari 18.4+ (macOS 15.4+,
iOS 18.4+).

## Credits (shown to players)

Every track's manifest entry carries a `credit` object (model, link, licence,
licence link, attribution text). Players see it three ways:

- the **music toast**: "♪ Steel Rain · Music: ACE-Step 1.5 (MIT)", bottom left
  for a few seconds, the first time each track plays (can be turned off);
- the game's **Credits panel**, from `musicCredits(ids)`;
- the preview page.

The credit line for Credits panels:

> Music generated with ACE-Step 1.5 (MIT, https://github.com/ace-step/ACE-Step-1.5)

ACE-Step 1.5's code and weights are MIT-licensed. MIT asks for its notice to
travel with copies of the *software*; it claims nothing over what the model
makes, so the music is ours to use in the games. We credit the model anyway.

## Making more

```bash
npm run music:setup        # once: ~29 GB in library/tools/ace-step (git-ignored); idempotent
npm run music:setup -- --check

# one piece: several takes, the best one looped and mastered
npm run music:gen -- --prompt "calm harp, bamboo flute and soft strings, peaceful river at dawn, instrumental" \
  --seconds 150 --bpm 72 --key "D major" --takes 3 --out library/music-masters/river.ogg
npm run music:gen -- --prompt "short bright fanfare, trumpets, held major chord" --seconds 12 --stinger --out library/music-masters/fanfare.ogg

# the shared soundtrack, from scripts/music/soundtrack.json
npm run music:soundtrack                     # whatever is missing
npm run music:soundtrack -- --only battle --takes 5
npm run music:soundtrack -- --master-only    # re-judge and re-master existing takes
```

Write prompts as styles, instruments, mood and place ("fast staccato strings,
taiko, brass stabs, urgent"), and end with "instrumental". Never name a
composer, an artist or a game. To add a track to the soundtrack, add an entry to
`scripts/music/soundtrack.json` (id, title, kind `loop` or `stinger`, tags,
mood, bpm, key, seconds, prompt, optional `pair`), run `npm run
music:soundtrack -- --only <id>`, listen, and pin the take you like with
`"pick": <seed>`.

### What the pipeline does

1. **Generate** (`scripts/music/gen.py`): ACE-Step 1.5 with the 4B XL SFT
   diffusion model (50 steps, guidance 7) and its 1.7B planner LM (MLX), on the
   GPU through MLX and PyTorch MPS. Instrumental only. Several seeds per track.
2. **Judge** (`scripts/music/master.py analyze`): we can't listen in a script, so
   every take is measured: clipping and flat tops, drop-outs and silences in the
   short-term loudness curve, loudness spread, tempo (librosa beat tracker) and
   key (Krumhansl–Kessler profiles on CQT chroma) against what the prompt asked
   for. The best score wins unless a seed is pinned.
3. **Loop**: a beat and bar grid, then every bar-aligned (start, end) pair in
   range is scored on how alike the music is just before and just after both
   points (chroma, MFCC timbre, loudness), preferring whole 4-bar phrases; the
   end is fine-aligned to the start by onset cross-correlation (±60 ms). The
   last beat before the loop end is rendered as an equal-power crossfade into
   the audio just before the loop start, so the jump is inaudible, and half a
   second of the loop start is kept after the loop end so the decoder never
   stops on it.
4. **Master**: 28 Hz high-pass, loudness-normalise to −16 LUFS (ITU-R BS.1770
   via pyloudnorm), a gentle look-ahead peak limiter at −1 dBFS; then Ogg Vorbis
   through libsndfile (no ffmpeg needed), read back to check the length.
5. **Check the seam**: spectral flux across the jump compared with the track's
   own frame-to-frame flux, the sample step at the seam, and the loudness step.

Raw takes, 24-bit WAV masters, spectrograms with loop markers and the full
report (`report/report.json`) stay in `library/music-masters/` (git-ignored).

### Speed

On the M5 Max (128 GB), the 4B XL SFT model makes a 170-second take in 130–180 seconds, about real time (the model loads in ~22 s, uses ~18 GB, and stays loaded for a whole batch), and a 10–12-second stinger in 8–13 seconds. The whole soundtrack, 63 takes, took about two hours; judging and mastering a track takes 10–20 seconds. The 2B turbo model (`--model acestep-v15-turbo`)
makes a 30-second sketch in about 15 seconds, for trying prompts.
