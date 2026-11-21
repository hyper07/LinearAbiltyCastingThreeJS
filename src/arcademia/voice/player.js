/**
 * The game's voice, played by line id: a real person's recording when there
 * is one (public/audio/voice), else the character's generated voice
 * (public/audio/voice-gen, pre-made with a local model, see generated.js),
 * else silence (the game shows its text, as always). Nothing is synthesized
 * in the browser: the browser's speech synthesis is never used.
 *
 *   import { speech } from '../sound.js';
 *   speech.say('t.lesson.hello.math', { char: 'hoot', face: teacher, bubble: el });
 *   speech.say(someText);           // fallback: finds the line by its exact text (current language)
 *   speech.available                // true when this language has recordings or generated voices
 *   speech.preloadFloor(2, 'buddy-fox'); speech.preloadLesson(lesson, 'buddy-fox');
 *
 * While a clip plays: the music ducks a little (shared/music.js), the
 * speaker's face moves with the voice's loudness (`face.lipSync(level)`, the
 * creature API in world/figures.js) and the speech bubble gets `is-speaking`.
 * Clips are fetched and decoded on first use and a few dozen are kept;
 * a floor's barks and the current lesson's lines are fetched ahead.
 */
import { music } from '../../shared/music.js';
import { locale } from '../i18n/index.js';
import { FORMATS, emptyManifest, languageHasRecordings, pickFile } from './manifest.js';
import { emptyGenManifest, mergeGenManifests, selectVoice } from './generated.js';
import { buildScript, isLineId } from './script.js';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
export const VOICE_ROOT = `${BASE}audio/voice/`;
export const VOICE_GEN_ROOT = `${BASE}audio/voice-gen/`;
/** How far the music ducks under a voice (its level is multiplied by this). */
export const VOICE_DUCK = 0.45;
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Line id from what a caller passed: an id as it is; text through the current language's script, or null. */
export function resolveLine(lineOrText, textIndex, char = null) {
  if (isLineId(lineOrText)) return { line: lineOrText, char };
  const hits = textIndex?.get(norm(lineOrText));
  if (!hits?.length) return null;
  const mine = char ? hits.find((h) => h.char === char) : hits[0];
  return mine ? { line: mine.id, char: mine.char } : null;
}

/** The text → lines index of a script (for callers that only have text). */
export function textIndexOf(lines) {
  const map = new Map();
  for (const l of lines) {
    const k = norm(l.text);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push({ id: l.id, char: l.char });
  }
  return map;
}

export class VoicePlayer {
  constructor({ root = VOICE_ROOT, genRoot = VOICE_GEN_ROOT, cacheSize = 48 } = {}) {
    this.root = root;
    this.genRoot = genRoot;
    this.cacheSize = cacheSize;
    this.manifest = null; // people's recordings
    this.generated = null; // generated voices (core manifest.json + local manifest.local.json)
    this.muted = false;
    this.volume = 1;
    this.ctx = null;
    this.buffers = new Map(); // url → Promise<AudioBuffer|null>, LRU order
    this.scripts = new Map(); // lang → { lines, text }
    this.current = null;
    this._gen = 0; // a new line (or stop) cancels everything before it
    this._tail = Promise.resolve(); // lines waiting their turn
    this._loading = null;
    /** For tests and the console. */
    this.state = { speaking: false, line: null, char: null, lang: null, source: null, played: 0, level: 0, peakLevel: 0, error: null };
  }

  /** Fetch the manifests (once). A missing or broken one is no voices from it. */
  load({ force = false } = {}) {
    if (force) this._loading = null;
    const get = (url, empty) =>
      fetch(url, { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() : empty()))
        .catch(() => empty())
        .then((m) => (m && typeof m.lines === 'object' ? m : empty()));
    this._loading ??= Promise.all([
      get(`${this.root}manifest.json`, emptyManifest),
      get(`${this.genRoot}manifest.json`, emptyGenManifest),
      get(`${this.genRoot}manifest.local.json`, emptyGenManifest)
    ]).then(([human, core, local]) => {
      this.manifest = human;
      this.generated = mergeGenManifests(core, local);
      return human;
    });
    return this._loading;
  }

  /** Whether a language has any voice: recordings or generated. */
  hasLanguage(lang = locale()) {
    return languageHasRecordings(this.manifest, lang) || languageHasRecordings(this.generated, lang);
  }

  /** True when the current language has recordings or generated voices ("Read to me" and "Voice on" show then). */
  get available() {
    return this.hasLanguage(locale());
  }

  /** Whether a line can be heard, recorded or generated (language defaults to the current one). */
  has(line, char = null, lang = locale()) {
    return Boolean(selectVoice(this.manifest, this.generated, { lang, char, line }));
  }

  _script(lang) {
    let s = this.scripts.get(lang);
    if (!s) {
      const lines = buildScript(lang);
      this.scripts.set(lang, (s = { lines, text: textIndexOf(lines) }));
    }
    return s;
  }

  /**
   * What would play for this call: { line, char, url, entry, source } or null
   * (silence). A person's recording of the line always wins over the
   * generated voice; another language's voice is never used.
   */
  pick(lineOrText, { char = null, lang = locale() } = {}) {
    if ((!this.manifest && !this.generated) || !this.hasLanguage(lang)) return null;
    const r = resolveLine(lineOrText, isLineId(lineOrText) ? null : this._script(lang).text, char);
    if (!r) return null;
    const sel = selectVoice(this.manifest, this.generated, { lang, char: r.char ?? char, line: r.line });
    if (!sel) return null;
    const file = pickFile(sel.entry, canPlay);
    if (!file) return null;
    const root = sel.source === 'human' ? this.root : this.genRoot;
    return { line: sel.line, char: sel.char, entry: sel.entry, source: sel.source, url: `${root}${file.split('/').map(encodeURIComponent).join('/')}?t=${encodeURIComponent(sel.entry.take)}` };
  }

  _context() {
    if (this.ctx) return this.ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.out = this.ctx.createGain();
    this.out.gain.value = this.muted ? 0 : this.volume;
    this.out.connect(this.ctx.destination);
    return this.ctx;
  }

  _buffer(url) {
    let p = this.buffers.get(url);
    if (p) {
      this.buffers.delete(url);
      this.buffers.set(url, p);
      return p;
    }
    const ctx = this._context();
    if (!ctx) return Promise.resolve(null);
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((b) => (b ? ctx.decodeAudioData(b) : null))
      .catch(() => null);
    this.buffers.set(url, p);
    while (this.buffers.size > this.cacheSize) this.buffers.delete(this.buffers.keys().next().value);
    return p;
  }

  /**
   * Play a line. `char` picks whose voice; `face` (a creature) moves with the
   * voice; `bubble` (an element) is highlighted while it plays. A line cuts
   * off what was playing (and anything waiting); with `queue` it waits its
   * turn instead. Resolves true when a recording played to the end, false
   * when there is none (or it was cut off) — and does nothing else then.
   */
  say(lineOrText, { char = null, lang = locale(), face = null, bubble = null, queue = false, onStart = null } = {}) {
    if (this.muted || !lineOrText) return Promise.resolve(false);
    // Nothing recorded for it: silence, and whatever is playing carries on.
    if ((this.manifest || this.generated) && !this.pick(lineOrText, { char, lang })) return Promise.resolve(false);
    if (!queue) {
      this._gen++;
      this._halt();
    }
    const gen = this._gen;
    const run = () => this._play(gen, lineOrText, { char, lang, face, bubble, onStart });
    const p = this._tail.then(run, run);
    this._tail = p.catch(() => false);
    return p;
  }

  async _play(gen, lineOrText, { char, lang, face, bubble, onStart }) {
    if (gen !== this._gen) return false;
    await this.load();
    const hit = this.pick(lineOrText, { char, lang });
    if (!hit || gen !== this._gen) return false;
    const ctx = this._context();
    if (!ctx) return false;
    if (ctx.state !== 'running') await ctx.resume().catch(() => {});
    const buffer = await this._buffer(hit.url);
    if (gen !== this._gen) return false;
    let el = null;
    if (!buffer) {
      // A format WebAudio can't decode here but the media element can.
      el = new Audio(hit.url);
      el.crossOrigin = 'anonymous';
    }
    return new Promise((resolve) => {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      const src = buffer ? ctx.createBufferSource() : ctx.createMediaElementSource(el);
      if (buffer) src.buffer = buffer;
      src.connect(analyser).connect(this.out);
      const data = new Float32Array(analyser.fftSize);
      let raf = 0, ended = false;
      const me = {};
      const finish = (played) => {
        if (ended) return;
        ended = true;
        cancelAnimationFrame(raf);
        try {
          src.disconnect();
          if (buffer) src.stop();
          else el.pause();
        } catch {
          /* already stopped */
        }
        bubble?.classList.remove('is-speaking');
        face?.lipSync?.(0, 0);
        if (played) this.state.played++;
        if (this.current === me) {
          this.current = null;
          this.state.speaking = false;
          this.state.level = 0;
          music.duckVoice?.(false);
        }
        resolve(played);
      };
      const tick = () => {
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const level = Math.max(0, Math.min(1, (10 * Math.log10(sum / data.length + 1e-12) + 48) / 36));
        this.state.level = level;
        this.state.peakLevel = Math.max(this.state.peakLevel, level);
        face?.lipSync?.(level);
        raf = requestAnimationFrame(tick);
      };
      me.stop = () => finish(false);
      this.current = me;
      this.state = { ...this.state, speaking: true, line: hit.line, char: hit.char, lang, source: hit.source, level: 0, peakLevel: 0, error: null };
      bubble?.classList.add('is-speaking');
      music.duckVoice?.(true, { level: VOICE_DUCK });
      onStart?.(hit);
      if (buffer) {
        src.onended = () => finish(true);
        src.start();
      } else {
        el.onended = () => finish(true);
        el.onerror = () => {
          this.state.error = 'decode';
          finish(false);
        };
        el.play().catch(() => finish(false));
      }
      raf = requestAnimationFrame(tick);
    });
  }

  /** Stop the line that is playing (if any), and any that is waiting or still loading. */
  stop() {
    this._gen++;
    this._halt();
  }
  _halt() {
    this.current?.stop();
  }

  setMuted(m) {
    this.muted = Boolean(m);
    if (this.muted) this.stop();
    if (this.out) this.out.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  /** Fetch and decode lines ahead: [{ line, char }] in the current language. A few at a time. */
  async preload(list, lang = locale()) {
    await this.load();
    if (!this.hasLanguage(lang) || !this._context()) return 0;
    const urls = [...new Set(list.map((x) => this.pick(x.line, { char: x.char, lang })?.url).filter(Boolean))].slice(0, this.cacheSize);
    let i = 0;
    const worker = async () => {
      while (i < urls.length) await this._buffer(urls[i++]);
    };
    await Promise.all([worker(), worker(), worker()]);
    return urls.length;
  }

  /** A floor's barks: the teachers', the buddy's, the townsfolk's and the floor's boss. */
  preloadFloor(floor, buddyChar = null, lang = locale()) {
    if (!this.hasLanguage(lang)) return Promise.resolve(0);
    const keep = new Set(['hoot', 'tock', 'gizmo', 'townsfolk', `boss-${floor}`, buddyChar]);
    const lines = this._script(lang).lines.filter((l) => keep.has(l.char) && l.kind === 'bark' && (!l.floor || l.floor === floor));
    return this.preload(lines.map((l) => ({ line: l.id, char: l.char })), lang);
  }

  /** The lines of one lesson (its story, cards, chat and questions), and the buddy's barks. */
  preloadLesson(lesson, buddyChar = null, lang = locale()) {
    if (!lesson || !this.hasLanguage(lang)) return Promise.resolve(0);
    const id = lesson.id;
    const lines = this._script(lang).lines.filter((l) => !l.char.startsWith('boss-') && (l.id.startsWith(`l.${id}.`) || l.id.endsWith(`~${id}`) || (l.char === buddyChar && l.kind === 'bark') || (l.kind === 'story' && l.floor === lesson.floor && l.id.startsWith('t.quest.math.') && lesson.subject === 'math')));
    return this.preload(lines.map((l) => ({ line: l.id, char: l.char })), lang);
  }
}

let probe = null;
/** Whether this browser can play a stored format. */
export function canPlay(ext) {
  if (typeof document === 'undefined') return true;
  probe ??= document.createElement('audio');
  return Boolean(FORMATS[ext] && probe.canPlayType(FORMATS[ext].type));
}

export const voicePlayer = new VoicePlayer();
