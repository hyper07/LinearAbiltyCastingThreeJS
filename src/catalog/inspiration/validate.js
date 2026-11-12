import {
  ARCHETYPE_IDS, BUILDER_FOES, BUILDER_GENRES, BUILDER_LAYOUTS, BUILDER_WORLDS, EFFECT_IDS, FEATURE_IDS, GENRE_TAGS, ROLES
} from './vocabulary.js';

/**
 * One catalog entry (a game, or a manga / manhwa / novel / anime):
 *
 *   {
 *     id: 'kebab-case', title, aliases?: [names players use], kind: 'game'|'manga'|'manhwa'|'light-novel'|'web-novel'|'anime',
 *     year, creators: [studio or author], platforms?: [..],
 *     genres: [GENRE_TAGS],
 *     summary: 'one or two sentences, our own words',
 *     audience: 'all'|'teen'|'mature',          // mature works: mechanics only, never for kids' games
 *     features: [{ id: FEATURE id | 'new:<kebab>', how: 'how this work does it, one sentence' }],
 *     classes: [{ name, archetype: ARCHETYPE id, role: ROLE, skills: [{ name, effect: EFFECT id, does }] }],
 *     characters: [{ name, archetype, role, signature: 'what they are known for' }],   // stories, hero games
 *     monsters: [{ name, kind: 'minion'|'elite'|'boss', foes: BUILDER_FOES id }],
 *     maps: [{ name, world: BUILDER_WORLDS id, layout?: BUILDER_LAYOUTS id }],
 *     blueprint: { genre: BUILDER_GENRES id, world, layout, hero: built-in class id, foes },   // nearest build today
 *     makeItOurs: 'an original take we could build, with our own names (no names from the work)',
 *     links: { wikipedia?, official?, fandom? },
 *     image: { url, page?, license: 'free'|'non-free' } | null,   // a link only: never copied into the game
 *     sources: [urls actually read]
 *   }
 */

const HEROES = ['any', 'knight', 'mage', 'barbarian', 'amazon', 'shadowblade', 'templar', 'bonecaller', 'wildwarden'];
const KINDS = ['game', 'manga', 'manhwa', 'light-novel', 'web-novel', 'anime', 'comic'];
const AUDIENCES = ['all', 'teen', 'mature'];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const URL_RE = /^https:\/\/\S+$/;

const featureOk = (id) => FEATURE_IDS.includes(id) || /^new:[a-z0-9]+(-[a-z0-9]+)*$/.test(id);

/**
 * Check entries; returns the problems found (empty when all is well).
 * @param {object[]} entries
 * @returns {string[]}
 */
export function validateEntries(entries) {
  const problems = [];
  const seen = new Set();
  if (!Array.isArray(entries)) return ['the file must hold an array of entries'];
  for (const [i, e] of entries.entries()) {
    const at = `${e?.id ?? `#${i}`}`;
    const bad = (msg) => problems.push(`${at}: ${msg}`);
    if (!e || typeof e !== 'object') {
      bad('not an object');
      continue;
    }
    if (!ID.test(e.id ?? '')) bad('id must be kebab-case');
    if (seen.has(e.id)) bad('duplicate id');
    seen.add(e.id);
    if (!e.title) bad('title missing');
    if (e.aliases && (!Array.isArray(e.aliases) || e.aliases.some((a) => typeof a !== 'string' || a.length < 2 || a.length > 40))) bad('aliases must be short strings');
    if (!KINDS.includes(e.kind)) bad(`kind must be one of ${KINDS.join('|')}`);
    if (!AUDIENCES.includes(e.audience)) bad(`audience must be one of ${AUDIENCES.join('|')}`);
    if (!Array.isArray(e.genres) || !e.genres.length) bad('genres missing');
    for (const g of e.genres ?? []) if (!GENRE_TAGS.includes(g)) bad(`unknown genre "${g}"`);
    if (!e.summary || e.summary.length > 400) bad('summary missing or over 400 characters');
    if (!Array.isArray(e.features) || e.features.length < 3) bad('at least 3 features');
    for (const f of e.features ?? []) if (!featureOk(f?.id)) bad(`unknown feature "${f?.id}" (use a FEATURES id or new:<kebab>)`);
    for (const c of [...(e.classes ?? []), ...(e.characters ?? [])]) {
      if (!ARCHETYPE_IDS.includes(c.archetype)) bad(`"${c.name}": unknown archetype "${c.archetype}"`);
      if (c.role && !ROLES.includes(c.role)) bad(`"${c.name}": unknown role "${c.role}"`);
      for (const s of c.skills ?? []) if (!EFFECT_IDS.includes(s.effect)) bad(`"${c.name}" skill "${s.name}": unknown effect "${s.effect}"`);
    }
    for (const m of e.monsters ?? []) if (m.foes && !BUILDER_FOES.includes(m.foes)) bad(`monster "${m.name}": unknown foes "${m.foes}"`);
    for (const m of e.maps ?? []) {
      if (!BUILDER_WORLDS.includes(m.world)) bad(`map "${m.name}": unknown world "${m.world}"`);
      if (m.layout && !BUILDER_LAYOUTS.includes(m.layout)) bad(`map "${m.name}": unknown layout "${m.layout}"`);
    }
    const b = e.blueprint ?? {};
    if (!BUILDER_GENRES.includes(b.genre)) bad(`blueprint.genre "${b.genre}" unknown`);
    if (!BUILDER_WORLDS.includes(b.world)) bad(`blueprint.world "${b.world}" unknown`);
    if (!BUILDER_LAYOUTS.includes(b.layout)) bad(`blueprint.layout "${b.layout}" unknown`);
    if (!HEROES.includes(b.hero)) bad(`blueprint.hero "${b.hero}" unknown`);
    if (!BUILDER_FOES.includes(b.foes)) bad(`blueprint.foes "${b.foes}" unknown`);
    if (!e.makeItOurs) bad('makeItOurs missing');
    const links = Object.values(e.links ?? {});
    if (!links.length) bad('at least one link');
    for (const url of [...links, ...(e.sources ?? []), e.image?.url, e.image?.page].filter(Boolean)) if (!URL_RE.test(url)) bad(`not an https link: ${url}`);
    if (e.image && !['free', 'non-free'].includes(e.image.license)) bad('image.license must be free|non-free');
  }
  return problems;
}
