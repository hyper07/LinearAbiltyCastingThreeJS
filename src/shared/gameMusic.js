/**
 * The shared soundtrack, wired into each game (docs/music.md): which track
 * each game plays where, the fight moods with hysteresis, the stingers, the
 * Music section for a pause or settings menu, and the Credits entry.
 *
 *   this.music = new GameMusic('gloamreach', { moods: { battle: 'battle', boss: 'boss' }, muted: () => !this.sound.enabled });
 *   this.music.jump('title');                                   // at once (a menu, a new place)
 *   this.music.update(dt, { area: 'village', fight, boss });    // each frame: moods held, areas settled
 *   this.music.cue('victory');                                  // a stinger
 *   this.music.dispose();                                       // when the game closes
 *
 * The pure parts — the titles, each game's tracks, the area → track rules,
 * MoodHold and Settle — are tested in tests/unit/gameMusic.test.mjs.
 */
import { music, musicCredits, MUSIC_CREDIT } from './music.js';
import { powerStyles } from './graphicsMenu.js';

/** Every track's title (tests check these against public/audio/bgm/manifest.json). */
export const TRACK_TITLES = Object.freeze({
  battle: 'Steel Rain',
  boss: 'Crown of Cinders',
  meadow: 'Sunlit Meadow',
  'night-forest': 'Violet Hollow',
  village: 'The Warm Hearth',
  'lantern-valley': 'Lantern Valley',
  jungle: 'Over the Falls',
  'jungle-hunt': 'The Gorge Hunt',
  'frozen-fortress': 'Rime Keep',
  playful: 'Paper Kites',
  'city-night': 'Neon Overpass',
  title: 'First Light',
  victory: 'Victory',
  defeat: 'Retreat',
  'level-up': 'Level Up',
  discovery: 'Treasure Found'
});

/** The tracks (beds, then stingers) each game plays: its Credits panel lists these. */
export const GAME_TRACKS = Object.freeze({
  gloamreach: ['title', 'village', 'meadow', 'night-forest', 'frozen-fortress', 'battle', 'boss', 'victory', 'defeat', 'level-up', 'discovery'],
  wyldhunt: ['jungle', 'jungle-hunt', 'village', 'boss', 'victory', 'defeat', 'discovery'],
  kithvale: ['lantern-valley', 'meadow', 'discovery'],
  kindlewatch: ['frozen-fortress', 'battle', 'boss', 'victory', 'defeat', 'level-up'],
  snowpuff: ['playful', 'meadow', 'lantern-valley', 'night-forest', 'victory', 'level-up'],
  arcademia: ['playful', 'level-up', 'discovery'],
  seoul: ['city-night', 'victory'],
  lanternwood: ['title', 'village', 'night-forest', 'meadow', 'frozen-fortress', 'battle', 'boss', 'victory', 'defeat', 'level-up', 'discovery'],
  stoneball: ['battle', 'victory', 'defeat'],
  home: ['title']
});

/** Credits from the static titles (no fetch needed), shaped like the games' PACKS entries. */
export function musicPack(ids) {
  const manifest = { tracks: ids.filter((id) => TRACK_TITLES[id]).map((id) => ({ id, title: TRACK_TITLES[id], credit: MUSIC_CREDIT })) };
  const [entry] = musicCredits(ids, manifest);
  const { items, ...rest } = entry;
  return { ...rest, what: `Background music, generated with this model: ${items.map((i) => i.name).join(', ')}`, titles: items.map((i) => i.name) };
}

/** A game's credit entry (by game id). */
export const gameMusicPack = (game) => musicPack(GAME_TRACKS[game] ?? []);

/* ------------------------------------------------------------------ moods and places */

const RANK = { calm: 0, tense: 1, battle: 2, boss: 3 };

/**
 * The fight mood with hysteresis: up at once (a fight starts, the boss
 * rises), down only after `hold` seconds of wanting less, so the music
 * doesn't flap when a wolf breaks off for a moment.
 */
export class MoodHold {
  constructor({ hold = 5 } = {}) {
    this.hold = hold;
    this.mood = 'calm';
    this.low = 0;
  }

  /** `fight` / `boss` now → the mood to play. */
  update(dt, { fight = false, boss = false } = {}) {
    const want = boss ? 'boss' : fight ? 'battle' : 'calm';
    if (RANK[want] >= RANK[this.mood]) {
      this.mood = want;
      this.low = 0;
    } else if ((this.low += dt) >= this.hold) {
      this.mood = want;
      this.low = 0;
    }
    return this.mood;
  }

  /** Straight to a mood (a death, a new place). */
  force(mood = 'calm') {
    this.mood = mood;
    this.low = 0;
    return mood;
  }
}

/**
 * A value that must hold for `delay` seconds before it counts (walking along
 * the edge between two places shouldn't swap tracks back and forth).
 */
export class Settle {
  constructor(value = null, { delay = 2 } = {}) {
    this.value = value;
    this.delay = delay;
    this.next = value;
    this.t = 0;
  }

  update(dt, value) {
    if (value === this.value) {
      this.next = value;
      this.t = 0;
    } else if (value !== this.next) {
      this.next = value;
      this.t = dt;
    } else this.t += dt;
    if (this.next !== this.value && this.t >= this.delay) {
      this.value = this.next;
      this.t = 0;
    }
    return this.value;
  }

  set(value) {
    this.value = this.next = value;
    this.t = 0;
    return value;
  }
}

/** A threshold with a dead band: on above `on`, off below `off`, else as it was. */
export const band = (v, was, on, off) => (v >= on ? true : v <= off ? false : Boolean(was));

/**
 * Gloamreach: the Warm Hearth among Brindlewick's houses and at Ashward
 * Outpost's fire, Sunlit Meadow in the fields and on the overlook, Violet
 * Hollow under the Gloamwood's dusk, Rime Keep down in the Cinder Rift and on
 * the drake's ledge (it pairs with Crown of Cinders).
 */
export function gloamreachTrack({ area, x = 0, z = 0, gloam = 0 }) {
  if (area === 'gloamwood' || gloam > 0.6) return 'night-forest';
  if (area === 'ledge' || area === 'rift') return 'frozen-fortress';
  if (area === 'outpost') return 'village';
  // The houses stand within ~75 m of the square (map.js PLAZA at 1, 2); past them, the fields.
  if (area === 'village' && Math.hypot(x - 1, z - 2) < 80) return 'village';
  return 'meadow';
}

/**
 * Wyldhunt, zone by zone: the Warm Hearth at Lantern Camp, Over the Falls
 * down Veilfall Reach and up in the Hollow Heights — until the Gnarlhorn is
 * tracked there and near (`hunting`), when the Gorge Hunt takes over the bed
 * (the pair crossfades in step). Zones without a rule of their own play the
 * gorge's. The fights' moods (the Gorge Hunt, Crown of Cinders) ride on top.
 */
export function wyldhuntTrack({ zone, hunting = false }) {
  if (zone === 'base-camp') return 'village';
  if (zone === 'hollow-heights' && hunting) return 'jungle-hunt';
  return 'jungle';
}

/**
 * Kithvale's dusk for the music: more than 5½ hours from noon (the vale's own
 * golden hour, 17.8, counts), day again within 5 — a dead band between.
 */
export const duskAt = (hour, was = null) => band(Math.abs((((hour % 24) + 24) % 24) - 12), was ?? Math.abs((((hour % 24) + 24) % 24) - 12) >= 5.25, 5.5, 5);

/** Kithvale: Lantern Valley in Lanternrest and at dusk, Sunlit Meadow out in the valley by day. */
export function kithvaleTrack({ village = false, dusk = false }) {
  return village || dusk ? 'lantern-valley' : 'meadow';
}

/**
 * Lanternwood, by realm: the camp's hearth, the night forest, the sunlit
 * hills, and Rime Keep in the snow and on the ash plains (Crown of Cinders
 * for their bosses).
 */
export function lanternwoodTrack({ realm = 'lanternwood', area = null }) {
  if (realm === 'sunmeadow') return 'meadow';
  if (realm === 'frostpeak' || realm === 'emberfall') return 'frozen-fortress';
  return area === 'camp' ? 'village' : 'night-forest';
}

/** Kickrani: Neon Overpass while racing, and while driving at night; quiet otherwise (the engine and the city). */
export function seoulTrack({ mode, racing = false, night = false }) {
  if (racing || mode === 'race') return 'city-night';
  if (mode === 'drive' && night) return 'city-night';
  return null;
}

/* ------------------------------------------------------------------ the player, per game */

export class GameMusic {
  /**
   * @param {string} id  the game
   * @param {object} o
   * @param {object} [o.moods]   the tracks for battle / boss here ({ battle: 'battle', boss: 'boss' })
   * @param {() => boolean} [o.muted]  the game's own sound switch (true: silent)
   * @param {number} [o.hold]    seconds a fight's music lingers after it ends
   * @param {number} [o.settle]  seconds a new place must hold before its track plays
   * @param {number} [o.level]   this game's level under the player's volume (0–1)
   */
  constructor(id, { moods = {}, muted = null, hold = 5, settle = 2, level = 1 } = {}) {
    this.id = id;
    this.moods = { ...moods };
    this.hold = new MoodHold({ hold });
    this.area = new Settle(null, { delay: settle });
    this.level = level;
    this.playing = { area: null, mood: 'calm' };
    this.unlink = muted ? music.linkMute(muted) : null;
    music.setTrim(level, { fade: 0.3 });
    this.closed = false;
  }

  /** What is meant to play and what is (for tests and ?debug). */
  get state() {
    return { game: this.id, area: this.area.value, mood: this.hold.mood, track: music.current?.id ?? null, pending: music.pending?.track.id ?? null, ...music.debug() };
  }

  /** Whether the music can be heard now (playing, not muted). */
  get audible() {
    return music.audible;
  }

  /** Play `area`'s track now (a menu, a new place, a realm), or fall silent (null). */
  jump(area, { fade = 1.5, mood = 'calm' } = {}) {
    this.area.set(area);
    this.hold.force(mood);
    this._apply(fade);
  }

  /** Each frame (game time: a paused loop holds the music where it is). */
  update(dt, { area, fight = false, boss = false } = {}) {
    if (this.closed) return;
    if (area !== undefined) this.area.update(dt, area);
    this.hold.update(dt, { fight, boss });
    if (this.area.value !== this.playing.area || this.hold.mood !== this.playing.mood) this._apply();
  }

  _apply(fade) {
    const area = this.area.value;
    const mood = this.hold.mood;
    const was = this.playing;
    this.playing = { area, mood };
    if (mood === 'calm' && !area) {
      if (music.current) music.stop({ fade: fade ?? 2.5 });
      return;
    }
    music.configure({ moods: { ...this.moods, calm: area ?? this.moods.calm } });
    const run = (p) => p?.catch?.(() => {});
    if (mood !== 'calm' && this.moods[mood]) {
      run(music.setMood(mood, fade != null ? { fade } : {}));
    } else if (mood !== was.mood && was.area) {
      run(music.setMood('calm', fade != null ? { fade } : {}));
    } else {
      run(music.play(area, { fade: fade ?? 3 }));
    }
  }

  /** A stinger (victory, defeat, level-up, discovery) over the bed. */
  cue(id, opts) {
    if (this.closed) return null;
    return music.stinger(id, opts)?.catch?.(() => null);
  }

  /** This game's level under the volume, e.g. ducked under a lesson. */
  setLevel(k, { fade = 0.8 } = {}) {
    this.level = k;
    music.setTrim(k, { fade });
  }

  /** Straight back to calm (a death, a restart). */
  calm() {
    this.hold.force('calm');
    if (this.playing.mood !== 'calm') this._apply();
  }

  dispose({ fade = 1 } = {}) {
    if (this.closed) return;
    this.closed = true;
    this.unlink?.();
    music.stop({ fade });
    music.setTrim(1, { fade: 0.1 });
  }
}

/* ------------------------------------------------------------------ the menu section */

export const MUSIC_TEXT = {
  title: 'Music',
  on: 'On',
  off: 'Off',
  volume: 'Music volume',
  names: 'Show track names',
  credit: `${MUSIC_CREDIT.model} (${MUSIC_CREDIT.licence})`
};

const MENU_CSS = `
.pw-music input[type=range]{width:100%;accent-color:#ffd678}
.pw-music label{display:block;font-size:.9em;opacity:.85;margin-bottom:.15em}
.pw-music__credit{margin:0;font-size:.85em;opacity:.7}
.pw-music__credit a{color:inherit}
`;
let menuStyled = false;

/**
 * The Music section for a pause or settings menu (beside Graphics): on/off,
 * the music volume, the track-name toast, what's playing and the credit.
 * Saved by music.js for every game (localStorage 'gamory.music').
 */
export function musicMenu({ text = {} } = {}) {
  powerStyles();
  if (!menuStyled && typeof document !== 'undefined') {
    menuStyled = true;
    const s = document.createElement('style');
    s.dataset.musicMenu = '';
    s.textContent = MENU_CSS;
    document.head.append(s);
  }
  const T = { ...MUSIC_TEXT, ...text };
  const root = document.createElement('section');
  root.className = 'pw-gfx pw-music';
  root.dataset.musicMenu = '';
  root.setAttribute('aria-label', T.title);
  root.innerHTML = `<div class="pw-gfx__head"><span></span><b data-music-now></b></div>
    <div class="pw-gfx__row" role="group"><button type="button" data-music-on></button><button type="button" data-music-off></button></div>
    <div><label></label><input type="range" min="0" max="100" step="5" data-music-volume></div>
    <div class="pw-gfx__row"><button type="button" data-music-toast></button></div>
    <p class="pw-music__credit"><a target="_blank" rel="noopener" data-music-credit></a></p>`;
  const $ = (s) => root.querySelector(s);
  $('.pw-gfx__head span').textContent = T.title;
  $('[data-music-on]').textContent = T.on;
  $('[data-music-off]').textContent = T.off;
  $('.pw-gfx__row').setAttribute('aria-label', T.title);
  const vol = $('[data-music-volume]');
  const id = `pw-music-vol-${Math.random().toString(36).slice(2, 7)}`;
  vol.id = id;
  $('label').htmlFor = id;
  $('label').textContent = T.volume;
  $('[data-music-toast]').textContent = T.names;
  const a = $('[data-music-credit]');
  a.href = MUSIC_CREDIT.url;
  a.textContent = T.credit;
  a.title = MUSIC_CREDIT.text;
  const sync = () => {
    const m = music.muted;
    $('[data-music-on]').setAttribute('aria-pressed', String(!m));
    $('[data-music-off]').setAttribute('aria-pressed', String(m));
    vol.value = String(Math.round(music.volume * 100));
    vol.disabled = m;
    $('[data-music-toast]').setAttribute('aria-pressed', String(music.settings.toast !== 'off'));
    const cur = music.current;
    $('[data-music-now]').textContent = cur && !m ? `♪ ${cur.title}` : '';
  };
  const click = (sel, fn) => $(sel).addEventListener('click', (e) => {
    e.stopPropagation();
    fn();
    sync();
  });
  click('[data-music-on]', () => music.setMuted(false));
  click('[data-music-off]', () => music.setMuted(true));
  click('[data-music-toast]', () => music.setToast(music.settings.toast === 'off' ? 'first' : 'off'));
  vol.addEventListener('input', () => music.setVolume(Number(vol.value) / 100));
  // Arrow keys on the slider are for the slider, not the game behind it.
  vol.addEventListener('keydown', (e) => e.stopPropagation());
  sync();
  root.refresh = sync;
  return root;
}

/** The credit as a plain HTML list item for a game's own Credits panel (`esc` its escaper). */
export function musicCreditHtml(game, esc) {
  const p = gameMusicPack(game);
  return `<b>${esc(p.name)}</b> — ${esc(p.what)}.<br><a href="${esc(p.site)}" target="_blank" rel="noopener">${esc(p.site)}</a> · <a href="${esc(p.licenceUrl)}" target="_blank" rel="noopener">${esc(p.licence)}</a>`;
}
