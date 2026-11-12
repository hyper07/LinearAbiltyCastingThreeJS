import files from './characters/files.js';
import { getWork } from './index.js';

/**
 * The catalog's characters: classes, heroes, story characters, bosses, units,
 * companions and townspeople of the catalogued works — their element, weapon,
 * stats (1–5 within their work), look, signature skills mapped onto our
 * effects, and an ORIGINAL class for the Class forge inspired by how they play.
 *
 *   CHARACTERS                       every record
 *   charactersOf(workId)             a work's cast
 *   findCharacters(q, { kind, element, archetype, role, work })
 *   matchCharacter(text)             the character a sentence names ("a class like Sung Jin-woo")
 *   forgeDesignOf(id, prompt)        their original class, ready for the forge (no AI, no tokens)
 *
 * Facts about other works in our words; the forge class is ours: its name,
 * branches and skills use no word of the character's name or the work's title
 * (validate.js checks this).
 */

export const CHARACTERS = Object.values(files).flat();
const BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

export const getCharacter = (id) => BY_ID.get(id) ?? null;
export const getWorkTitle = (workId) => getWork(workId)?.title ?? null;
export const charactersOf = (workId) => CHARACTERS.filter((c) => c.work === workId);

const fold = (s) => String(s ?? '').toLowerCase().replace(/['’]/g, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function findCharacters(q = '', { kind = null, element = null, archetype = null, role = null, work = null } = {}) {
  const needle = fold(q);
  const out = [];
  for (const c of CHARACTERS) {
    if ((kind && c.kind !== kind) || (element && c.element !== element) || (archetype && c.archetype !== archetype) || (role && c.role !== role) || (work && c.work !== work)) continue;
    let score = 1;
    if (needle) {
      const names = [c.name, ...(c.aliases ?? [])].map(fold);
      if (names.includes(needle)) score = 100;
      else if (names.some((n) => n.startsWith(needle) || n.split(' ').includes(needle))) score = 50;
      else if (names.some((n) => n.includes(needle))) score = 30;
      else if (fold(`${c.story} ${c.personality ?? ''}`).includes(needle)) score = 5;
      else continue;
    }
    out.push({ c, score });
  }
  return out.sort((a, b) => b.score - a.score).map((r) => r.c);
}

/**
 * Names a sentence may use for a character: the full name and aliases, and a
 * single given or family name only when it is distinctive (≥ 5 letters and not
 * shared with another character).
 */
const NAMES = (() => {
  const count = new Map();
  const parts = (c) => fold(c.name).split(' ').filter((w) => w.length >= 5);
  for (const c of CHARACTERS) for (const w of new Set(parts(c))) count.set(w, (count.get(w) ?? 0) + 1);
  const out = [];
  for (const c of CHARACTERS) {
    const names = new Set([fold(c.name), ...(c.aliases ?? []).map(fold)].filter((n) => n.length >= 3));
    for (const w of parts(c)) if (count.get(w) === 1) names.add(w);
    for (const n of names) out.push({ n, id: c.id, words: n.split(' ').length });
  }
  return out.sort((a, b) => b.n.length - a.n.length);
})();

const LIKE = / (like|inspired by|similar to|such as|style of|based on|as|plays like|version of) $/;

/** "a class like Sung Jin-woo" → that record. A one-word name counts only after "like", "as"… */
export function matchCharacter(text) {
  const t = ` ${fold(text)} `;
  const hit = NAMES.find(({ n, words }) => {
    const at = t.indexOf(` ${n} `);
    if (at < 0) return false;
    return words >= 2 || LIKE.test(t.slice(0, at + 1));
  });
  return getCharacter(hit?.id);
}

/**
 * A character's original class, as a forge design (still to pass the forge's
 * own normalizeDesign — the caller does that).
 */
export function forgeDesignOf(id, prompt = '') {
  const c = getCharacter(id);
  if (!c) return null;
  const f = c.forge;
  return {
    ...f,
    prompt: prompt || `${f.tagline}`,
    inspiredBy: { character: c.id, work: c.work, workTitle: getWork(c.work)?.title ?? null }
  };
}
