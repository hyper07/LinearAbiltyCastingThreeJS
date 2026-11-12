import files from './files.js';
import { ARCHETYPES, EFFECTS, FEATURES } from './vocabulary.js';

/**
 * The inspiration catalog: well-known games and RPG / fantasy stories, each
 * mapped onto our own ids (vocabulary.js), so "make a game like X" costs no
 * tokens to understand:
 *
 *   findWorks(q, { genre, feature, kind })   search
 *   specFrom(id)                             the nearest game spec the builder makes today
 *   likeWork(id)                             a short hint for the AI (~150 tokens)
 *   matchWork(text)                          the work a sentence names ("…like Solo Leveling")
 *   featureGaps()                            what we lack, by how many works use it
 *
 * The catalog holds facts about other works, in our words, with links. What
 * we build from it is our own: specs never carry a work's title, and each
 * entry's `makeItOurs` names an original take.
 */

/** Every entry, games first. */
export const ENTRIES = Object.values(files).flat();
const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

export const getWork = (id) => BY_ID.get(id) ?? null;

const fold = (s) => String(s ?? '').toLowerCase().replace(/['’]/g, '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Number and edition words a sentence leaves off ("like StarCraft", "like Fortnite"). */
const EDITION = /( (i{1,3}|iv|v|vi{1,3}|ix|x{1,2}|[0-9]+|remake|reforged|resurrected|battle royale|battlegrounds|online|world))+$/;

/**
 * Titles a sentence may use: the full title, the part before a colon
 * ("Solo Leveling"), either without its number or edition ("StarCraft"), and
 * the entry's `aliases` (the names players use: "pokemon", "ff7").
 */
const TITLES = ENTRIES.flatMap((e) => {
  const full = fold(e.title);
  const short = fold(e.title.split(/[:(]/)[0]);
  const names = new Set([full, short, full.replace(EDITION, ''), short.replace(EDITION, '')].filter((t) => t.length >= 4));
  // The names players use ("pokemon", "ff7"): short ones are fine here, they were chosen by hand.
  for (const alias of e.aliases ?? []) names.add(fold(alias));
  return [...names].map((t) => ({ t, id: e.id, words: t.split(' ').length }));
}).sort((a, b) => b.t.length - a.t.length);

/** "like X", "inspired by X"…: a one-word title counts only after one of these ("a berserk warrior" is not Berserk). */
const LIKE = / (like|inspired by|similar to|such as|style of|based on|as in|kind of|version of|in the world of) $/;
/** …or right before one of these ("a fortnite game", "overwatch style"). */
const AFTER = /^ (game|games|style|clone|type|inspired|like)\b/;

/**
 * Works by words in their title, summary or creators, filtered by genre tag,
 * feature id or kind. Title matches first.
 */
export function findWorks(q = '', { genre = null, feature = null, kind = null, audience = null } = {}) {
  const needle = fold(q);
  const out = [];
  for (const e of ENTRIES) {
    if (genre && !e.genres.includes(genre)) continue;
    if (feature && !e.features.some((f) => f.id === feature)) continue;
    if (kind && e.kind !== kind) continue;
    if (audience && e.audience !== audience) continue;
    let score = 1;
    if (needle) {
      const title = fold(e.title);
      if (title === needle || (e.aliases ?? []).some((a) => fold(a) === needle)) score = 100;
      else if (title.startsWith(needle)) score = 50;
      else if (title.includes(needle)) score = 30;
      else if (fold(`${e.summary} ${e.creators?.join(' ')}`).includes(needle)) score = 5;
      else continue;
    }
    out.push({ e, score });
  }
  return out.sort((a, b) => b.score - a.score).map((r) => r.e);
}

/** The work a sentence names, if any: "a dungeon game like solo leveling" → solo-leveling. */
export function matchWork(text) {
  const t = ` ${fold(text)} `;
  const hit = TITLES.find(({ t: title, words }) => {
    const at = t.indexOf(` ${title} `);
    if (at < 0) return false;
    return words >= 2 || LIKE.test(t.slice(0, at + 1)) || AFTER.test(t.slice(at + title.length + 1));
  });
  return getWork(hit?.id);
}

/**
 * The nearest spec the builder makes today. No name: the game gets its own
 * (normalizeSpec names it from its world and genre), never the work's title.
 */
export function specFrom(id) {
  const e = getWork(id);
  if (!e) return null;
  const { genre, world, layout, hero, foes } = e.blueprint;
  return { genre, world, layout, hero, foes };
}

/**
 * A short hint for the AI building "a game like X": the nearest menu picks,
 * the systems that make it, and the original take — never its names.
 */
export function likeWork(id) {
  const e = getWork(id);
  if (!e) return null;
  const b = e.blueprint;
  const systems = e.features.slice(0, 8).map((f) => f.id.replace(/^new:/, '')).join(', ');
  const roles = [...new Set([...(e.classes ?? []), ...(e.characters ?? [])].map((c) => ARCHETYPES[c.archetype]?.hero).filter(Boolean))].slice(0, 4);
  const text =
    `Inspired by a ${e.genres.slice(0, 2).join('/')} work (use none of its names). ` +
    `Nearest picks: genre ${b.genre}, world ${b.world}, layout ${b.layout}, hero ${b.hero}, foes ${b.foes}. ` +
    `Its systems: ${systems}. ${roles.length ? `Fitting classes: ${roles.join(', ')}. ` : ''}` +
    `Original take: ${e.makeItOurs}`;
  return { id: e.id, spec: specFrom(id), text: text.slice(0, 880) };
}

/**
 * Features other works rely on that we do not have yet, most used first —
 * the backlog that makes "a game like X" possible for more X.
 * @returns {{ id: string, status: string, note?: string, works: number, examples: string[] }[]}
 */
export function featureGaps() {
  const counts = new Map();
  for (const e of ENTRIES) {
    for (const f of new Set(e.features.map((x) => x.id))) {
      const status = FEATURES[f]?.status ?? 'new';
      if (status === 'have') continue;
      const row = counts.get(f) ?? { id: f, status, note: FEATURES[f]?.note, works: 0, examples: [] };
      row.works++;
      if (row.examples.length < 4) row.examples.push(e.title);
      counts.set(f, row);
    }
  }
  return [...counts.values()].sort((a, b) => b.works - a.works || a.id.localeCompare(b.id));
}

/** Skill effects other works use most that have no ability base yet. */
export function effectGaps() {
  const counts = new Map();
  for (const e of ENTRIES) {
    for (const c of e.classes ?? []) {
      for (const s of c.skills ?? []) {
        if (EFFECTS[s.effect]?.base) continue;
        counts.set(s.effect, (counts.get(s.effect) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()].map(([id, uses]) => ({ id, uses })).sort((a, b) => b.uses - a.uses);
}
