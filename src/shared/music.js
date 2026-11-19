/**
 * Music: the shared background-music player for every game.
 *
 *   import { music } from '../shared/music.js';
 *   music.configure({ moods: { calm: 'meadow', battle: 'battle', boss: 'boss' } });
 *   music.play('meadow');            // or a tag: music.play('nature')
 *   music.setMood('battle');         // crossfades (into its calm/tense pair when there is one)
 *   music.stinger('victory');        // a short jingle over the bed, which ducks under it
 *   music.linkMute(() => sound.muted); // follow the game's own sound toggle
 *
 * The tracks are in public/audio/bgm (Ogg Vorbis) and described by its
 * manifest.json: loop points (seconds), mood, tags, BPM, key, the calm/tense
 * pair and the credit. They were generated with ACE-Step 1.5 (MIT), see
 * docs/music.md, and the credit is shown: a small "♪ title · Music: …" toast
 * the first time each track plays (settings: toast 'first' | 'always' | 'off'),
 * `music.credit()` for the current track, and `musicCredits(ids)` for a
 * game's Credits panel.
 *
 * WebAudio, sample-accurate: the intro plays once, then [loopStart, loopEnd)
 * loops forever. Files are fetched and decoded lazily and a few are kept
 * (LRU); if a browser can't decode one in WebAudio it streams through an
 * <audio> element instead. It waits for the first user gesture when the
 * browser blocks autoplay, and suspends while the tab is hidden. Volume and
 * mute are saved in localStorage ('gamory.music').
 *
 * The pure parts (choosing tracks, curves, loop maths, manifest checks,
 * credits, settings) are exported and tested in tests/unit/music.test.mjs.
 */

export const MOODS = ['calm', 'tense', 'battle', 'boss'];
export const SETTINGS_KEY = 'gamory.music';
export const DEFAULT_SETTINGS = Object.freeze({ volume: 0.6, muted: false, toast: 'first', seen: [] });
const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
export const DEFAULT_ROOT = `${BASE}audio/bgm/`;

/** The generator's credit, also in every manifest entry. */
export const MUSIC_CREDIT = Object.freeze({
  model: 'ACE-Step 1.5',
  url: 'https://github.com/ace-step/ACE-Step-1.5',
  licence: 'MIT',
  licenceUrl: 'https://github.com/ace-step/ACE-Step-1.5/blob/main/LICENSE',
  attribution: 'Music generated with ACE-Step 1.5 (MIT licence, https://github.com/ace-step/ACE-Step-1.5).',
  text: 'Music generated with ACE-Step 1.5 (MIT, https://github.com/ace-step/ACE-Step-1.5)'
});

/* ------------------------------------------------------------------ pure helpers */

/** Equal-power crossfade gains at t in [0, 1]: out² + in² = 1 throughout. */
export function equalPower(t) {
  const x = Math.min(1, Math.max(0, t));
  return { out: Math.cos((x * Math.PI) / 2), in: Math.sin((x * Math.PI) / 2) };
}

/** A gain curve for AudioParam.setValueCurveAtTime: `dir` 'in' or 'out', scaled by `level`. */
export function fadeCurve(dir, level = 1, n = 64) {
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const g = equalPower(i / (n - 1));
    curve[i] = (dir === 'in' ? g.in : g.out) * level;
  }
  return curve;
}

const INTENSITY = { calm: 0, tense: 1, battle: 2, boss: 3, victory: 0, defeat: 0 };
/**
 * Crossfade length in seconds between moods: quick into a fight (1.5 s),
 * slow coming out of one (3 s), 2.2 s otherwise.
 */
export function crossfadeSeconds(from, to) {
  const a = INTENSITY[from] ?? 0;
  const b = INTENSITY[to] ?? 0;
  if (b > a && b >= 2) return 1.5;
  if (b < a && a >= 2) return 3;
  return 2.2;
}

/** Where a looping track is `elapsed` seconds after starting at `offset`. */
export function loopPosition(elapsed, offset, loopStart, loopEnd) {
  const p = offset + elapsed;
  if (!(loopEnd > loopStart) || p < loopEnd) return p;
  const len = loopEnd - loopStart;
  return loopStart + ((p - loopStart) % len);
}

/**
 * Where to start `to` so its bars line up with `from` at position `pos`: both
 * loop starts sit on a downbeat, so keep the phase within the shorter bar.
 * Only for a calm/tense pair (same key and pulse); others start at 0.
 */
export function pairOffset(from, to, pos) {
  if (!from || !to || from.pair !== to.id || to.pair !== from.id) return 0;
  const bar = 240 / Math.max(from.bpm || 120, to.bpm || 120);
  const phase = (((pos - (from.loopStart ?? 0)) % bar) + bar) % bar;
  return (to.loopStart ?? 0) + phase;
}

/** Problems with one track's loop points ([] when fine). */
export function validateLoop(track) {
  const out = [];
  if (track.kind === 'stinger') {
    if (!(track.duration > 0)) out.push(`${track.id}: no duration`);
    return out;
  }
  const { loopStart: s, loopEnd: e, duration: d } = track;
  if (!Number.isFinite(s) || !Number.isFinite(e)) out.push(`${track.id}: loop points missing`);
  else {
    if (s < 0) out.push(`${track.id}: loopStart < 0`);
    if (e <= s) out.push(`${track.id}: loopEnd must be after loopStart`);
    if (e - s < 4) out.push(`${track.id}: loop shorter than 4 s`);
    if (Number.isFinite(d) && e > d + 1e-3) out.push(`${track.id}: loopEnd past the end of the file`);
  }
  return out;
}

/**
 * Problems with a whole manifest ([] when fine): ids unique, files named,
 * loop points sane, pairs mutual, and every track credited with its model,
 * link and licence. `exists(file)` (optional) checks the file is really there.
 */
export function validateManifest(manifest, exists) {
  const out = [];
  if (!manifest || !Array.isArray(manifest.tracks) || !manifest.tracks.length) return ['manifest has no tracks'];
  const ids = new Set();
  for (const t of manifest.tracks) {
    if (!t.id) out.push('a track has no id');
    if (ids.has(t.id)) out.push(`${t.id}: duplicate id`);
    ids.add(t.id);
    if (!t.file) out.push(`${t.id}: no file`);
    else if (exists && !exists(t.file)) out.push(`${t.id}: ${t.file} is missing`);
    if (!t.title) out.push(`${t.id}: no title`);
    if (!Array.isArray(t.tags) || !t.tags.length) out.push(`${t.id}: no tags`);
    const c = t.credit;
    if (!c || !c.model || !c.url || !c.licence || !c.licenceUrl || !c.text) out.push(`${t.id}: incomplete credit`);
    out.push(...validateLoop(t));
  }
  for (const t of manifest.tracks) {
    if (!t.pair) continue;
    const p = manifest.tracks.find((x) => x.id === t.pair);
    if (!p) out.push(`${t.id}: pair ${t.pair} not found`);
    else if (p.pair !== t.id) out.push(`${t.id}: pair ${t.pair} does not pair back`);
  }
  return out;
}

const loops = (m) => (m?.tracks ?? []).filter((t) => t.kind !== 'stinger');

/**
 * A track by id, else one carrying the tag (a different one from `current`
 * when there is a choice; `rnd` picks among them).
 */
export function selectTrack(manifest, idOrTag, { current = null, rnd = Math.random } = {}) {
  const all = manifest?.tracks ?? [];
  const byId = all.find((t) => t.id === idOrTag);
  if (byId) return byId;
  const tagged = loops(manifest).filter((t) => t.tags?.includes(idOrTag) || t.mood === idOrTag);
  if (!tagged.length) return null;
  const fresh = tagged.filter((t) => t.id !== current);
  const pool = fresh.length ? fresh : tagged;
  return pool[Math.floor(rnd() * pool.length) % pool.length];
}

/**
 * The track for a mood: the game's own choice (`moods[mood]`, an id or tag)
 * first; else the current track's calm/tense pair when it has that mood;
 * else any track with that mood (tense also takes dungeon tracks, boss falls
 * back to battle).
 */
export function trackForMood(manifest, mood, { current = null, moods = {}, rnd = Math.random } = {}) {
  const all = loops(manifest);
  const cur = all.find((t) => t.id === current) ?? null;
  if (moods[mood]) {
    const pick = selectTrack(manifest, moods[mood], { current, rnd });
    if (pick) return pick;
  }
  if (cur?.mood === mood) return cur;
  if (cur?.pair) {
    const pair = all.find((t) => t.id === cur.pair);
    if (pair?.mood === mood) return pair;
  }
  const chain = { calm: ['calm'], tense: ['tense', 'dungeon'], battle: ['battle'], boss: ['boss', 'battle'] }[mood] ?? [mood];
  for (const want of chain) {
    const pool = all.filter((t) => t.mood === want || (want !== 'calm' && t.tags?.includes(want)));
    if (pool.length) return pool[Math.floor(rnd() * pool.length) % pool.length];
  }
  return null;
}

/** "♪ Steel Rain · Music: ACE-Step 1.5 (MIT)" */
export function toastText(track) {
  const c = track?.credit ?? MUSIC_CREDIT;
  return `♪ ${track?.title ?? 'Music'} · Music: ${c.model} (${c.licence})`;
}

/**
 * Credits for a game's Credits panel: one entry per generator (de-duplicated),
 * shaped like the games' PACKS entries ({ name, what, site, licence,
 * licenceUrl, items }) plus the attribution text. `ids` limits it to the
 * tracks the game uses (default: all).
 */
export function musicCredits(ids = null, manifest = defaultManifest) {
  const tracks = (manifest?.tracks ?? []).filter((t) => !ids || ids.includes(t.id));
  const byModel = new Map();
  for (const t of tracks) {
    const c = t.credit ?? MUSIC_CREDIT;
    const key = `${c.model}|${c.licence}`;
    if (!byModel.has(key)) {
      byModel.set(key, { name: c.model, what: 'Background music', site: c.url, licence: c.licence, licenceUrl: c.licenceUrl, attribution: c.attribution ?? c.text, text: c.text, items: [] });
    }
    byModel.get(key).items.push({ name: t.title, id: t.id });
  }
  if (!byModel.size) {
    const c = MUSIC_CREDIT;
    return [{ name: c.model, what: 'Background music', site: c.url, licence: c.licence, licenceUrl: c.licenceUrl, attribution: c.attribution, text: c.text, items: [] }];
  }
  for (const e of byModel.values()) e.what = `Background music: ${e.items.map((i) => i.name).join(', ')}`;
  return [...byModel.values()];
}

/** Saved settings, never throwing (private windows, blocked storage). */
export function loadSettings(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    const s = raw ? JSON.parse(raw) : {};
    return {
      volume: Number.isFinite(s.volume) ? Math.min(1, Math.max(0, s.volume)) : DEFAULT_SETTINGS.volume,
      muted: Boolean(s.muted),
      toast: ['first', 'always', 'off'].includes(s.toast) ? s.toast : DEFAULT_SETTINGS.toast,
      seen: Array.isArray(s.seen) ? s.seen.slice(-64) : []
    };
  } catch {
    return { ...DEFAULT_SETTINGS, seen: [] };
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

/** Whether the credit toast shows for this track now. */
export function shouldToast(settings, id) {
  if (settings.toast === 'off') return false;
  if (settings.toast === 'always') return true;
  return !settings.seen.includes(id);
}

/* ------------------------------------------------------------------ the player */

/** Run a fade curve on an AudioParam, cutting short whatever it was doing. */
function applyCurve(param, curve, at, dur) {
  if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(at);
  else {
    param.cancelScheduledValues(at);
    param.setValueAtTime(param.value, at);
  }
  try {
    param.setValueCurveAtTime(curve, at + 0.005, dur);
  } catch {
    // Some engines refuse a curve that touches another event: a plain ramp then.
    param.linearRampToValueAtTime(curve[curve.length - 1], at + 0.005 + dur);
  }
}

let defaultManifest = null;

export class Music {
  constructor({ root = DEFAULT_ROOT, cacheSize = 3, storage } = {}) {
    this.root = root;
    this.cacheSize = cacheSize;
    this.storage = storage;
    this.settings = loadSettings(storage);
    this.manifest = null;
    this.moods = {};
    this.mood = null;
    this.ctx = null;
    this.voice = null; // { track, src, gain, startedAt, offset, el? }
    this.buffers = new Map(); // id -> Promise<AudioBuffer|null>, LRU order
    this.pending = null; // a play request waiting for the first gesture
    this.muteLinks = [];
    this.linkedMute = false;
    this.toastEl = null;
    this._ready = null;
  }

  /** Per game: { moods: { calm: 'meadow', battle: 'battle', … }, root, toast }. */
  configure({ moods, root, toast } = {}) {
    if (moods) this.moods = { ...moods };
    if (root) this.root = root;
    if (toast) this.setToast(toast);
    return this;
  }

  /** Fetch the manifest (once). */
  load() {
    if (!this._ready) {
      this._ready = fetch(`${this.root}manifest.json`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`manifest ${r.status}`))))
        .then((m) => {
          this.manifest = m;
          defaultManifest = m;
          return m;
        })
        .catch((e) => {
          this._ready = null;
          throw e;
        });
    }
    return this._ready;
  }

  get volume() {
    return this.settings.volume;
  }
  get muted() {
    return this.settings.muted;
  }
  get current() {
    return this.voice?.track ?? null;
  }
  /** The current track's credit ({ model, url, licence, licenceUrl, text, title }), or null. */
  credit() {
    const t = this.current;
    return t ? { ...(t.credit ?? MUSIC_CREDIT), title: t.title } : null;
  }

  setVolume(v) {
    this.settings.volume = Math.min(1, Math.max(0, Number(v) || 0));
    saveSettings(this.settings, this.storage);
    this._applyMaster();
  }
  setMuted(m) {
    this.settings.muted = Boolean(m);
    saveSettings(this.settings, this.storage);
    this._applyMaster();
  }
  toggleMute() {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }
  /** 'first' (default): toast the first time each track plays; 'always'; 'off'. */
  setToast(mode) {
    if (['first', 'always', 'off'].includes(mode)) {
      this.settings.toast = mode;
      saveSettings(this.settings, this.storage);
    }
  }
  /** Follow a game's own sound toggle: music is silent while any getter returns true. */
  linkMute(getter) {
    this.muteLinks.push(getter);
    if (!this._muteTimer) this._muteTimer = setInterval(() => this._pollMute(), 300);
    this._pollMute();
    return () => {
      this.muteLinks = this.muteLinks.filter((g) => g !== getter);
    };
  }

  /** Play a track by id or tag; `fade` seconds (default 2). Resolves when it starts. */
  async play(idOrTag, { fade = 2, offset = null } = {}) {
    await this.load();
    const track = selectTrack(this.manifest, idOrTag, { current: this.current?.id });
    if (!track) throw new Error(`no music for "${idOrTag}"`);
    if (this.current?.id === track.id) return track;
    if (track.mood && MOODS.includes(track.mood)) this.mood = track.mood;
    return this._start(track, fade, offset);
  }

  /** Change mood: calm | tense | battle | boss. Crossfades, quicker into battle. */
  async setMood(mood, { fade } = {}) {
    await this.load();
    const from = this.mood;
    this.mood = mood;
    const track = trackForMood(this.manifest, mood, { current: this.current?.id, moods: this.moods });
    if (!track || track.id === this.current?.id) return this.current;
    const offset = this.voice ? pairOffset(this.voice.track, track, this._position()) : 0;
    return this._start(track, fade ?? crossfadeSeconds(from, mood), offset);
  }

  /** A short jingle over the bed; the bed ducks to `duck` while it plays. */
  async stinger(id, { duck = 0.3, gain = 1 } = {}) {
    await this.load();
    const track = selectTrack(this.manifest, id);
    if (!track || !this._context()) return null;
    const buffer = await this._buffer(track);
    if (!buffer || this.ctx.state !== 'running') return null;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = gain;
    src.buffer = buffer;
    src.connect(g).connect(this.master);
    const now = ctx.currentTime;
    const d = this.duck.gain;
    d.cancelScheduledValues(now);
    d.setValueAtTime(d.value, now);
    d.linearRampToValueAtTime(duck, now + 0.15);
    d.setValueAtTime(duck, now + Math.max(0.2, buffer.duration - 0.6));
    d.linearRampToValueAtTime(1, now + buffer.duration + 0.6);
    src.start(now + 0.05);
    return track;
  }

  /** Fade out and stop. */
  stop({ fade = 1.5 } = {}) {
    this.pending = null;
    if (this.voice) this._release(this.voice, fade);
    this.voice = null;
  }

  /* ---------------------------------------------------------------- internals */

  _context() {
    if (this.ctx) return this.ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.duck = this.ctx.createGain();
    this.duck.connect(this.master);
    this.master.connect(this.ctx.destination);
    this._applyMaster(true);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend().catch(() => {});
        else if (this.ctx.state === 'suspended' && this._gestured) this.ctx.resume().catch(() => {});
        if (this.voice?.el) document.hidden ? this.voice.el.pause() : this.voice.el.play().catch(() => {});
      });
      const unlock = () => {
        this._gestured = true;
        this.ctx.resume().then(() => {
          for (const ev of ['pointerdown', 'keydown', 'touchend']) removeEventListener(ev, unlock, true);
          if (this.pending) {
            const p = this.pending;
            this.pending = null;
            this._start(p.track, p.fade, p.offset);
          }
        }).catch(() => {});
      };
      if (this.ctx.state !== 'running') for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, unlock, true);
      else this._gestured = true;
    }
    return this.ctx;
  }

  _level() {
    return this.settings.muted || this.linkedMute ? 0 : this.settings.volume;
  }

  _applyMaster(now = false) {
    if (!this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    if (now) this.master.gain.value = this._level();
    else this.master.gain.setTargetAtTime(this._level(), t, 0.08);
  }

  _pollMute() {
    let m = false;
    for (const g of this.muteLinks) {
      try {
        m = m || Boolean(g());
      } catch {
        /* a broken getter never stops the music */
      }
    }
    if (m !== this.linkedMute) {
      this.linkedMute = m;
      this._applyMaster();
    }
  }

  /** Decoded buffer for a track (lazy, LRU-cached); null if WebAudio can't decode it. */
  _buffer(track) {
    let p = this.buffers.get(track.id);
    if (p) {
      this.buffers.delete(track.id);
      this.buffers.set(track.id, p);
      return p;
    }
    p = fetch(`${this.root}${track.file}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${track.file} ${r.status}`))))
      .then((data) => this.ctx.decodeAudioData(data))
      .catch(() => null);
    this.buffers.set(track.id, p);
    // Stingers are small; long beds are ~50 MB decoded, so keep only a few.
    const beds = [...this.buffers.keys()].filter((id) => selectTrack(this.manifest, id)?.kind !== 'stinger');
    while (beds.length > this.cacheSize) {
      const old = beds.shift();
      if (old !== this.current?.id) this.buffers.delete(old);
    }
    return p;
  }

  _position() {
    const v = this.voice;
    if (!v) return 0;
    if (v.el) return v.el.currentTime;
    return loopPosition(this.ctx.currentTime - v.startedAt, v.offset, v.track.loopStart, v.track.loopEnd);
  }

  async _start(track, fade, offset) {
    const ctx = this._context();
    if (!ctx) return null;
    if (ctx.state !== 'running' && !this._gestured) {
      this.pending = { track, fade, offset }; // starts on the first click or key
      return track;
    }
    const token = (this._token = (this._token ?? 0) + 1);
    const buffer = await this._buffer(track);
    if (token !== this._token) return track; // a newer request won
    const old = this.voice;
    const level = 1;
    const gain = ctx.createGain();
    gain.connect(this.duck);
    const now = ctx.currentTime + 0.02;
    const start = Math.max(0, Math.min(offset ?? 0, (track.loopEnd ?? track.duration ?? 1) - 0.05));
    let voice;
    if (buffer) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      if (track.kind !== 'stinger' && track.loopEnd > track.loopStart) {
        src.loop = true;
        src.loopStart = track.loopStart;
        src.loopEnd = track.loopEnd;
      }
      src.connect(gain);
      src.start(now, start);
      voice = { track, src, gain, startedAt: now, offset: start };
    } else {
      // WebAudio couldn't decode it: stream through <audio>, looping by hand.
      const el = new Audio(`${this.root}${track.file}`);
      el.crossOrigin = 'anonymous';
      el.currentTime = start;
      const node = ctx.createMediaElementSource(el);
      node.connect(gain);
      el.addEventListener('timeupdate', () => {
        if (track.loopEnd && el.currentTime >= track.loopEnd - 0.03) el.currentTime -= track.loopEnd - track.loopStart;
      });
      el.addEventListener('ended', () => {
        el.currentTime = track.loopStart ?? 0;
        el.play().catch(() => {});
      });
      el.play().catch(() => {});
      voice = { track, el, gain, startedAt: now, offset: start };
    }
    const f = Math.max(0.05, old ? fade : Math.min(fade, 1.2));
    gain.gain.value = 0;
    applyCurve(gain.gain, fadeCurve('in', level), now, f);
    if (old) this._release(old, f);
    this.voice = voice;
    this._showToast(track);
    return track;
  }

  _release(voice, fade) {
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.02;
    const g = voice.gain.gain;
    applyCurve(g, fadeCurve('out', g.value), now, Math.max(0.05, fade));
    setTimeout(() => {
      try {
        voice.src?.stop();
        voice.el?.pause();
        voice.gain.disconnect();
      } catch {
        /* already stopped */
      }
    }, (fade + 0.2) * 1000);
  }

  _showToast(track) {
    if (typeof document === 'undefined' || !shouldToast(this.settings, track.id)) return;
    if (!this.settings.seen.includes(track.id)) {
      this.settings.seen.push(track.id);
      saveSettings(this.settings, this.storage);
    }
    if (!this.toastEl) {
      const el = document.createElement('div');
      el.className = 'gamory-music-toast';
      el.setAttribute('role', 'status');
      el.style.cssText =
        'position:fixed;left:16px;bottom:16px;z-index:9999;max-width:calc(100vw - 32px);padding:6px 12px;border-radius:8px;' +
        'background:rgba(12,14,22,.72);color:#f2efe6;font:500 12px/1.4 system-ui,sans-serif;letter-spacing:.01em;' +
        'pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .4s,transform .4s;';
      document.body.appendChild(el);
      this.toastEl = el;
    }
    const el = this.toastEl;
    el.textContent = toastText(track);
    el.title = (track.credit ?? MUSIC_CREDIT).text;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
    }, 4500);
  }
}

/** The one player every game shares. */
export const music = new Music();
