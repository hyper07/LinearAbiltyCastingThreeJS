/**
 * The recorded voices' manifest: public/audio/voice/manifest.json (served at
 * audio/voice/manifest.json). Pure helpers shared by the game's player, the
 * voice studio, the server (server/voiceStore.js) and the tests.
 *
 *   {
 *     "version": 1,
 *     "updated": "2026-11-19T10:00:00.000Z",
 *     "actors": { "a-1f2e3d4c": { "name": "Sam Lee", "characters": ["hoot"], "languages": ["en"] } },
 *     "lines": {
 *       "en": { "hoot": { "t.lesson.hello.math": {
 *         "files": { "webm": "en/hoot/t.lesson.hello.math.webm", "m4a": "en/hoot/t.lesson.hello.math.m4a" },
 *         "duration": 2.41, "actor": "a-1f2e3d4c", "take": "2026-11-19T10:00:00.000Z", "lufs": -18, "peak": -1.2
 *       } } }
 *     }
 *   }
 *
 * `files` paths are relative to the manifest. Only an actor's chosen display
 * name is public (for the Credits panel); their consent record stays in the
 * server's database.
 */
import { isCharId, isLineId } from './script.js';

export const MANIFEST_VERSION = 1;
/** The formats a recording may be stored in, and how a browser is asked about each. */
export const FORMATS = {
  webm: { mime: 'audio/webm', type: 'audio/webm; codecs="opus"', magic: 'webm' },
  m4a: { mime: 'audio/mp4', type: 'audio/mp4; codecs="mp4a.40.2"', magic: 'mp4' },
  ogg: { mime: 'audio/ogg', type: 'audio/ogg; codecs="opus"', magic: 'ogg' }
};
/** Which format to prefer when a browser can play several. */
export const FORMAT_ORDER = ['webm', 'm4a', 'ogg'];
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MIN_FILE_BYTES = 200;
export const MAX_SECONDS = 60;
export const ACTOR_ID = /^a-[0-9a-f]{8,16}$/;
const LANG_RE = /^[a-z]{2}$/;

/** What a new voice actor agrees to before recording (the server stores it, with the date). */
export const CONSENT_VERSION = 1;
export const CONSENT_TEXT = 'I agree that the recordings of my voice made here will be used in AI Arcademia, a learning game for children on the Gamory platform, and that I will be credited by the name I choose. I can ask for my recordings to be removed at any time.';

export const emptyManifest = () => ({ version: MANIFEST_VERSION, updated: null, actors: {}, lines: {} });

/** Problems with a manifest ([] when it is fine). `exists(path)` checks that a file is there (optional). */
export function validateManifest(m, { exists = null } = {}) {
  const out = [];
  if (!m || typeof m !== 'object') return ['not an object'];
  if (m.version !== MANIFEST_VERSION) out.push(`version must be ${MANIFEST_VERSION}`);
  if (!m.actors || typeof m.actors !== 'object') out.push('no actors');
  if (!m.lines || typeof m.lines !== 'object') return [...out, 'no lines'];
  for (const [id, a] of Object.entries(m.actors ?? {})) {
    if (!ACTOR_ID.test(id)) out.push(`actor id ${id}`);
    if (typeof a?.name !== 'string' || !a.name.trim() || a.name.length > 80) out.push(`actor ${id}: name`);
    if (!Array.isArray(a?.characters) || !a.characters.every(isCharId)) out.push(`actor ${id}: characters`);
    if (!Array.isArray(a?.languages) || !a.languages.every((l) => LANG_RE.test(l))) out.push(`actor ${id}: languages`);
  }
  for (const [lang, chars] of Object.entries(m.lines)) {
    if (!LANG_RE.test(lang)) out.push(`language ${lang}`);
    for (const [char, lines] of Object.entries(chars ?? {})) {
      if (!isCharId(char)) out.push(`${lang}: character ${char}`);
      for (const [line, e] of Object.entries(lines ?? {})) {
        const at = `${lang}/${char}/${line}`;
        if (!isLineId(line)) out.push(`${at}: line id`);
        const files = Object.entries(e?.files ?? {});
        if (!files.length) out.push(`${at}: no files`);
        for (const [ext, path] of files) {
          if (!FORMATS[ext]) out.push(`${at}: format ${ext}`);
          if (path !== `${lang}/${char}/${line}.${ext}`) out.push(`${at}: file path ${path}`);
          else if (exists && !exists(path)) out.push(`${at}: missing file ${path}`);
        }
        if (!(e?.duration > 0 && e.duration <= MAX_SECONDS)) out.push(`${at}: duration`);
        if (!m.actors?.[e?.actor]) out.push(`${at}: unknown actor ${e?.actor}`);
        if (!Number.isFinite(Date.parse(e?.take))) out.push(`${at}: take date`);
      }
    }
  }
  return out;
}

/** The recording of a line, or null. Never another language's: a missing language is silence. */
export function recordingFor(m, lang, char, line) {
  return m?.lines?.[lang]?.[char]?.[line] ?? null;
}

/**
 * Which recording to play: the exact language, character and line. With no
 * character (a caller that only had text), any character who recorded that
 * line in this language. Otherwise null — silence, never another language's
 * voice, another character's voice or a synthesized one.
 */
export function selectRecording(m, { lang, char = null, line }) {
  if (!m || !lang || !isLineId(line)) return null;
  if (char) {
    const e = recordingFor(m, lang, char, line);
    return e ? { char, line, entry: e } : null;
  }
  for (const [c, lines] of Object.entries(m.lines?.[lang] ?? {})) if (lines?.[line]) return { char: c, line, entry: lines[line] };
  return null;
}

/** The file to fetch for an entry: the first format the browser can play (`canPlay(ext)`), or null. */
export function pickFile(entry, canPlay = () => true) {
  for (const ext of FORMAT_ORDER) if (entry?.files?.[ext] && canPlay(ext)) return entry.files[ext];
  return null;
}

/** True when a language has at least one recording (the game shows "Read to me" and "Voice on" only then). */
export function languageHasRecordings(m, lang) {
  return Object.values(m?.lines?.[lang] ?? {}).some((lines) => lines && Object.keys(lines).length > 0);
}

/** Done / total for a character in a language, against the script's lines. */
export function progressOf(m, lines, lang, char) {
  const mine = lines.filter((l) => l.char === char);
  const done = mine.filter((l) => recordingFor(m, lang, char, l.id)).length;
  return { done, total: mine.length, barks: { done: mine.filter((l) => l.kind === 'bark' && recordingFor(m, lang, char, l.id)).length, total: mine.filter((l) => l.kind === 'bark').length } };
}

/**
 * The Credits panel's voices: each actor (by their chosen name) and the
 * characters they actually recorded, in any language.
 * @returns {{ actor: string, name: string, characters: string[], languages: string[] }[]}
 */
export function voiceCredits(m) {
  const by = new Map();
  for (const [lang, chars] of Object.entries(m?.lines ?? {})) {
    for (const [char, lines] of Object.entries(chars ?? {})) {
      for (const e of Object.values(lines ?? {})) {
        const a = m.actors?.[e.actor];
        if (!a) continue;
        let c = by.get(e.actor);
        if (!c) by.set(e.actor, (c = { actor: e.actor, name: a.name, characters: new Set(), languages: new Set() }));
        c.characters.add(char);
        c.languages.add(lang);
      }
    }
  }
  return [...by.values()].map((c) => ({ ...c, characters: [...c.characters].sort(), languages: [...c.languages].sort() })).sort((a, b) => a.name.localeCompare(b.name));
}

/* ---- changes (the server makes them; pure so the tests can too) ---- */

/** Put a recording in; returns the files of an older take that are no longer used. */
export function setRecording(m, lang, char, line, entry) {
  const lines = ((m.lines[lang] ??= {})[char] ??= {});
  const was = lines[line];
  let stale = [];
  if (was && was.take === entry.take) entry = { ...was, ...entry, files: { ...was.files, ...entry.files } };
  else if (was) stale = Object.entries(was.files ?? {}).filter(([ext, p]) => entry.files?.[ext] !== p).map(([, p]) => p);
  lines[line] = entry;
  return stale;
}

/** Take a recording out; returns its files. */
export function removeRecording(m, lang, char, line) {
  const lines = m.lines?.[lang]?.[char];
  const e = lines?.[line];
  if (!e) return [];
  delete lines[line];
  if (!Object.keys(lines).length) delete m.lines[lang][char];
  if (!Object.keys(m.lines[lang]).length) delete m.lines[lang];
  return Object.values(e.files ?? {});
}

/** Take out every recording by an actor, and the actor; returns the files. */
export function removeActor(m, actorId) {
  const files = [];
  for (const [lang, chars] of Object.entries(m.lines ?? {})) {
    for (const [char, lines] of Object.entries(chars ?? {})) {
      for (const [line, e] of Object.entries(lines ?? {})) if (e.actor === actorId) files.push(...removeRecording(m, lang, char, line));
    }
  }
  delete m.actors?.[actorId];
  return files;
}
