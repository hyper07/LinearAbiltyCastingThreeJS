/**
 * AI Arcademia in five languages (and more by adding data).
 *
 *   import { t, setLocale, loadLocale, num } from './i18n/index.js';
 *   await loadLocale('ko'); setLocale('ko');
 *   t('hud.floor', { n: 3 })          → '3층'
 *   t('quest.gems', { count: 2 })     → picks quest.gems_one / quest.gems_other by Intl.PluralRules
 *   num(1234.5)                       → '1,234.5' · '1.234,5' (es) …
 *
 * Each language is a folder in ./locales/<id>/ with:
 *
 *   index.js    gathers the files below
 *   ui.js       flat keys → strings for the world, HUD, settings, start screen ('{name}' fills in vars)
 *   lesson.js   the lesson screens, sims, arcade games and puzzle boss (same flat format)
 *   parents.js  the parents' PIN, report and share page, and the tutor panel
 *   chars.js    buddies, hats, teachers, the picker
 *   math.js     the math question and chalkboard templates
 *   lessons.js  (not for English) an overlay per lesson id holding only its text fields,
 *               shaped like the lesson itself: arrays by position, numbers left out
 *
 * English is the source and the fallback for any key a language is missing (the
 * unit tests fail on a missing key, so that should never ship). To add a
 * language: copy locales/en, translate, write lessons.js, and add a line to
 * LOCALES and LOADERS below.
 */
import en from './locales/en/index.js';

/** Every language the game speaks. `speech` is the BCP 47 tag for read-aloud; `cjk` turns on CJK line breaking. */
export const LOCALES = [
  { id: 'en', name: 'English', speech: 'en-US', intl: 'en-US' },
  { id: 'ko', name: '한국어', speech: 'ko-KR', intl: 'ko-KR', cjk: true },
  { id: 'es', name: 'Español', speech: 'es-ES', intl: 'es-ES' },
  { id: 'ja', name: '日本語', speech: 'ja-JP', intl: 'ja-JP', cjk: true },
  { id: 'zh', name: '简体中文', speech: 'zh-CN', intl: 'zh-CN', cjk: true }
];
const LOADERS = {
  ko: () => import('./locales/ko/index.js'),
  es: () => import('./locales/es/index.js'),
  ja: () => import('./locales/ja/index.js'),
  zh: () => import('./locales/zh/index.js')
};
export const LOCALE_IDS = LOCALES.map((l) => l.id);

/** Loaded languages: id → { strings (ui + chars + math, flat), lessons }. */
/** A language's flat string table: every namespace file merged (all but `lessons`). */
const flatten = (d) => Object.assign({}, ...Object.entries(d).filter(([k]) => k !== 'lessons').map(([, v]) => v));
const loaded = new Map([['en', { strings: flatten(en), lessons: {} }]]);
let current = 'en';
const listeners = new Set();

/** The best supported language for a browser language list (navigator.languages). */
export function pickLocale(wanted = []) {
  for (const tag of [].concat(wanted).filter(Boolean)) {
    const base = String(tag).toLowerCase().split(/[-_]/)[0];
    if (LOCALE_IDS.includes(base)) return base;
  }
  return 'en';
}
export const isLocale = (id) => LOCALE_IDS.includes(id);
export const localeInfo = (id = current) => LOCALES.find((l) => l.id === id) ?? LOCALES[0];
export const locale = () => current;

/** Fetch a language's data (English is built in). */
export async function loadLocale(id) {
  if (!isLocale(id)) id = 'en';
  if (!loaded.has(id)) {
    const mod = await LOADERS[id]();
    const d = mod.default ?? mod;
    loaded.set(id, { strings: flatten(d), lessons: { ...(d.lessons ?? {}), ...(extraOverlays[id] ?? {}) } });
  }
  return loaded.get(id);
}
/** Lesson overlays for lessons no world ships (previews, the dev demos): { ko: { '<lesson id>': overlay }, … }. */
const extraOverlays = {};
export function addLessonOverlays(byLocale) {
  for (const [lc, more] of Object.entries(byLocale)) {
    extraOverlays[lc] = { ...extraOverlays[lc], ...more };
    const d = loaded.get(lc);
    if (d) d.lessons = { ...d.lessons, ...more };
  }
  cache.clear();
}
/** Register a language's data directly (tests and the server use this, no dynamic import). */
export function registerLocale(id, d) {
  loaded.set(id, { strings: flatten(d), lessons: d.lessons ?? {} });
}
export const isLoaded = (id) => loaded.has(id);

/** Switch language (load it first). Calls every onLocaleChange listener. */
export function setLocale(id) {
  if (!isLocale(id) || !loaded.has(id)) id = 'en';
  if (id === current) return current;
  current = id;
  for (const fn of listeners) {
    try {
      fn(id);
    } catch (error) {
      console.error(error);
    }
  }
  return current;
}
export function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const fill = (s, vars) => (vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? fmtVar(vars[k], vars.__lc) : m)) : String(s));
const fmtVar = (v, lc) => (typeof v === 'number' ? num(v, {}, lc) : v == null ? '' : String(v));
const plurals = new Map();
function pluralKey(lc, key, count, dict) {
  let pr = plurals.get(lc);
  if (!pr) plurals.set(lc, (pr = new Intl.PluralRules(localeInfo(lc).intl)));
  const k = `${key}_${pr.select(count)}`;
  if (k in dict) return k;
  return `${key}_other` in dict ? `${key}_other` : key;
}

/** A string in a given language; English when it is missing there; the key when missing everywhere. */
export function tIn(lc, key, vars = null) {
  const own = loaded.get(lc)?.strings ?? {};
  const en = loaded.get('en').strings;
  let k = key;
  if (vars && typeof vars.count === 'number') k = pluralKey(lc, key, vars.count, key in own || `${key}_other` in own ? own : en);
  const s = k in own ? own[k] : k in en ? en[k] : key in en ? en[key] : key;
  return fill(s, vars ? { ...vars, __lc: lc } : null);
}
/** A string in the current language. */
export const t = (key, vars = null) => tIn(current, key, vars);
/** True when a key exists (in the current language or English). */
export const has = (key) => key in (loaded.get(current)?.strings ?? {}) || key in loaded.get('en').strings;

/* ---------------------------------------------------------------- Intl formats */

const nf = new Map();
/** A number in the language's own format (1,234.5 · 1.234,5 · …). */
export function num(n, opts = {}, lc = current) {
  const key = `${lc}|${JSON.stringify(opts)}`;
  let f = nf.get(key);
  if (!f) nf.set(key, (f = new Intl.NumberFormat(localeInfo(lc).intl, { useGrouping: 'min2', ...opts })));
  return f.format(n);
}
/** A date (default: day and month). */
export const date = (d, opts = { day: 'numeric', month: 'short' }, lc = current) => new Intl.DateTimeFormat(localeInfo(lc).intl, opts).format(d instanceof Date ? d : new Date(d));
/** A time of day. */
export const time = (d, opts = { hour: 'numeric', minute: '2-digit' }, lc = current) => new Intl.DateTimeFormat(localeInfo(lc).intl, opts).format(d instanceof Date ? d : new Date(d));
/** 'a, b and c' in the language's own way. */
export const list = (items, lc = current) => new Intl.ListFormat(localeInfo(lc).intl, { type: 'conjunction' }).format(items.map(String));
/** Minutes as '1 h 5 min' style text. */
export const minutes = (m, lc = current) => {
  const h = Math.floor(m / 60), mm = Math.round(m % 60);
  const unit = (v, u) => new Intl.NumberFormat(localeInfo(lc).intl, { style: 'unit', unit: u, unitDisplay: 'short' }).format(v);
  return h ? (mm ? `${unit(h, 'hour')} ${unit(mm, 'minute')}` : unit(h, 'hour')) : unit(mm, 'minute');
};

/* ---------------------------------------------------------------- lessons */

/**
 * Text fields a lesson overlay may (and must) carry. Everything else (ids, numbers, emoji, models) stays English.
 * The signature games add `message` (a dig's code to decode) and `order` (a countdown's things to put in order).
 */
export const LESSON_TEXT_KEYS = new Set(['title', 'topicName', 'blurb', 'text', 'name', 'role', 'intro', 'ask', 'answer', 'q', 'choices', 'hint', 'explain', 'farewell', 'label', 'when', 'message']);
/** Lists whose text items are translated one by one (numbers in them stay: a countdown's 10, 9, 8 or a rhythm's note lengths). */
const TEXT_LISTS = new Set(['choices', 'order']);
const SKIP = new Set([
  'id', 'subject', 'activities', 'floor', 'topic', 'emoji', 'look', 'portrayal', 'model', 'gen', 'kind', 'setup', 'year', 'count', 'board', 'practice',
  // the signature games' ids, places and numbers (content/games.js)
  'group', 'given', 'region', 'points', 'at', 'w', 'h', 'start', 'samples', 'rocks', 'goal', 'blocks', 'program', 'max',
  'target', 'from', 'tempo', 'mode', 'pattern', 'note', 'color', 'sound', 'tolerance', 'turns'
]);

function overlay(base, over) {
  if (over == null) return base;
  if (Array.isArray(base)) return base.map((v, i) => overlay(v, over[i]));
  if (base && typeof base === 'object') {
    const out = { ...base };
    for (const k of Object.keys(base)) if (!SKIP.has(k) && k in over) out[k] = overlay(base[k], over[k]);
    return out;
  }
  return typeof base === typeof over ? over : base;
}
/** A lesson with an overlay laid over it (the same rules as localizeLesson; tests use it for overlays not registered). */
export const applyOverlay = (lesson, over) => overlay(lesson, over);
const cache = new Map();
/** A lesson in a language (the English lesson when that language has no overlay for it). */
export function localizeLesson(lesson, lc = current) {
  if (!lesson || lc === 'en') return lesson;
  const over = loaded.get(lc)?.lessons?.[lesson.id];
  if (!over) return lesson;
  const key = `${lc}|${lesson.id}`;
  let out = cache.get(key);
  if (!out || out.__src !== lesson) {
    out = overlay(lesson, over);
    Object.defineProperty(out, '__src', { value: lesson, enumerable: false });
    cache.set(key, out);
  }
  return out;
}
/** Every translatable text path in a lesson: [['reading', 0, 'title'], …] (tests use it to check overlays are complete). */
export function lessonTextPaths(node, path = [], out = []) {
  if (Array.isArray(node)) node.forEach((v, i) => lessonTextPaths(v, [...path, i], out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (SKIP.has(k)) continue;
      if (typeof v === 'string' && LESSON_TEXT_KEYS.has(k)) out.push([...path, k]);
      else if (TEXT_LISTS.has(k) && Array.isArray(v)) v.forEach((x, i) => typeof x === 'string' && out.push([...path, k, i]));
      else if (typeof v === 'object') lessonTextPaths(v, [...path, k], out);
    }
  }
  return out;
}
export const atPath = (obj, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), obj);
