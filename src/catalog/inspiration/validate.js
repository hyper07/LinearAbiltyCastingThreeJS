import {
  BUILDS, CHARACTER_KINDS, ELEMENTS, FORGE_BASES, FORGE_STYLES, LOOK_IDS, RESOURCES, SKILL_KINDS, WEAPONS,
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

/**
 * One character record (characters/*.json):
 *
 *   {
 *     id: '<work id>/<kebab name>', work: '<work id>', name, aliases?: [..],
 *     kind: CHARACTER_KINDS, archetype: ARCHETYPES id, role: ROLES,
 *     element: ELEMENTS, weapon: WEAPONS, resource: RESOURCES,
 *     stats: { health, attack, defense, speed, magic, range },     // 1–5, relative within the work
 *     appearance: { build: BUILDS, look: LOOK_IDS (our nearest body), palette: ['#rrggbb' ×2–4], outfit: '≤ 100 chars' },
 *     skills: [{ name, kind: SKILL_KINDS, effect: EFFECTS id, element?: ELEMENTS, does: 'one sentence' }],   // 2–8
 *     personality: '≤ 120 chars', story: '1–2 sentences, our words',
 *     relations: [{ to: 'a name', how: '≤ 60 chars' }],             // ≤ 5
 *     image: { url, page?, license: 'free'|'non-free' } | null,
 *     sources: [urls actually read],
 *     forge: {                                                       // an ORIGINAL class for the Class forge
 *       name, icon, tagline, look: LOOK_IDS, style: FORGE_STYLES, color: '#rrggbb',
 *       resource: 'none'|'rage', bonuses: { health, armor, speed, damage, cooldown, crit },
 *       branches: [{ name, skills: [{ name, base: FORGE_BASES, color, description }, ×2] } ×3]   // 6 different bases
 *     }
 *   }
 */

const HEX = /^#[0-9a-f]{6}$/i;
const BONUS_RANGE = { health: [-30, 80], armor: [0, 25], speed: [-10, 15], damage: [-10, 20], cooldown: [0, 15], crit: [0, 15] };
const words = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
const COMMON = new Set(['the', 'shadow', 'dark', 'light', 'king', 'queen', 'lord', 'hunter', 'blade', 'knight', 'mage', 'storm', 'fire', 'frost', 'iron', 'dragon', 'demon', 'hero', 'warrior', 'master', 'world', 'game', 'online', 'class', 'with', 'from', 'that', 'this']);

/**
 * Check character records; returns the problems found.
 * @param {object[]} chars
 * @param {object[]} works the catalog's entries (a character belongs to one)
 */
export function validateCharacters(chars, works) {
  const problems = [];
  if (!Array.isArray(chars)) return ['the file must hold an array of characters'];
  const byWork = new Map(works.map((w) => [w.id, w]));
  const seen = new Set();
  for (const [i, c] of chars.entries()) {
    const at = c?.id ?? `#${i}`;
    const bad = (msg) => problems.push(`${at}: ${msg}`);
    if (!c || typeof c !== 'object') {
      bad('not an object');
      continue;
    }
    const work = byWork.get(c.work);
    if (!work) bad(`unknown work "${c.work}"`);
    if (!new RegExp(`^${c.work}/[a-z0-9]+(-[a-z0-9]+)*$`).test(c.id ?? '')) bad('id must be "<work id>/<kebab name>"');
    if (seen.has(c.id)) bad('duplicate id');
    seen.add(c.id);
    if (!c.name) bad('name missing');
    if (!CHARACTER_KINDS.includes(c.kind)) bad(`kind must be one of ${CHARACTER_KINDS.join('|')}`);
    if (!ARCHETYPE_IDS.includes(c.archetype)) bad(`unknown archetype "${c.archetype}"`);
    if (!ROLES.includes(c.role)) bad(`unknown role "${c.role}"`);
    if (!ELEMENTS.includes(c.element)) bad(`unknown element "${c.element}"`);
    if (!WEAPONS.includes(c.weapon)) bad(`unknown weapon "${c.weapon}"`);
    if (!RESOURCES.includes(c.resource)) bad(`unknown resource "${c.resource}"`);
    for (const k of ['health', 'attack', 'defense', 'speed', 'magic', 'range']) {
      const v = c.stats?.[k];
      if (!Number.isInteger(v) || v < 1 || v > 5) bad(`stats.${k} must be 1–5`);
    }
    const a = c.appearance ?? {};
    if (!BUILDS.includes(a.build)) bad(`appearance.build "${a.build}" unknown`);
    if (!LOOK_IDS.includes(a.look)) bad(`appearance.look "${a.look}" unknown`);
    if (!Array.isArray(a.palette) || a.palette.length < 2 || a.palette.length > 4 || a.palette.some((h) => !HEX.test(h))) bad('appearance.palette: 2–4 #rrggbb colours');
    if (!a.outfit || a.outfit.length > 100) bad('appearance.outfit missing or over 100 characters');
    if (!Array.isArray(c.skills) || c.skills.length < 2 || c.skills.length > 8) bad('2–8 skills');
    for (const s of c.skills ?? []) {
      if (!s.name || !s.does) bad(`skill "${s.name}": name and does`);
      if (!SKILL_KINDS.includes(s.kind)) bad(`skill "${s.name}": kind "${s.kind}" unknown`);
      if (!EFFECT_IDS.includes(s.effect)) bad(`skill "${s.name}": effect "${s.effect}" unknown`);
      if (s.element && !ELEMENTS.includes(s.element)) bad(`skill "${s.name}": element "${s.element}" unknown`);
    }
    if (!c.story || c.story.length > 400) bad('story missing or over 400 characters');
    if (c.personality && c.personality.length > 120) bad('personality over 120 characters');
    if ((c.relations ?? []).length > 5) bad('at most 5 relations');
    for (const url of [...(c.sources ?? []), c.image?.url, c.image?.page].filter(Boolean)) if (!URL_RE.test(url)) bad(`not an https link: ${url}`);
    if (!(c.sources ?? []).length) bad('at least one source');
    if (c.image && !['free', 'non-free'].includes(c.image.license)) bad('image.license must be free|non-free');
    // The forge class: playable as it is, and our own.
    const f = c.forge;
    if (!f) {
      bad('forge missing');
      continue;
    }
    if (!f.name || f.name.length > 28) bad('forge.name missing or over 28 characters');
    const taken = new Set([...words(c.name), ...(c.aliases ?? []).flatMap(words), ...words(work?.title)].filter((w) => !COMMON.has(w)));
    const reused = [...words(f.name), ...(f.branches ?? []).flatMap((b) => [...words(b.name), ...(b.skills ?? []).flatMap((s) => words(s.name))])].filter((w) => taken.has(w));
    if (reused.length) bad(`forge names must be our own: "${[...new Set(reused)].join('", "')}" comes from the work`);
    if (!f.icon || !f.tagline || f.tagline.length > 160) bad('forge.icon and forge.tagline (≤ 160)');
    if (!LOOK_IDS.includes(f.look)) bad(`forge.look "${f.look}" unknown`);
    if (!FORGE_STYLES.includes(f.style)) bad(`forge.style "${f.style}" unknown`);
    if (!HEX.test(f.color ?? '')) bad('forge.color must be #rrggbb');
    if (!['none', 'rage'].includes(f.resource)) bad('forge.resource must be none|rage');
    for (const [k, [lo, hi]] of Object.entries(BONUS_RANGE)) {
      const v = f.bonuses?.[k] ?? 0;
      if (!Number.isInteger(v) || v < lo || v > hi) bad(`forge.bonuses.${k} must be ${lo}..${hi}`);
    }
    const cost = Object.entries(f.bonuses ?? {}).reduce((sum, [k, v]) => sum + (k === 'health' ? v / 3 : v), 0);
    if (cost > 60) bad(`forge.bonuses cost ${Math.round(cost)} > 60 (health counts a third)`);
    const bases = (f.branches ?? []).flatMap((b) => (b.skills ?? []).map((s) => s.base));
    if ((f.branches ?? []).length !== 3 || (f.branches ?? []).some((b) => (b.skills ?? []).length !== 2)) bad('forge: 3 branches of 2 skills');
    if (bases.some((b) => !FORGE_BASES.includes(b)) || new Set(bases).size !== 6) bad('forge: 6 different bases from FORGE_BASES');
    for (const s of (f.branches ?? []).flatMap((b) => b.skills ?? [])) {
      if (!s.name || s.name.length > 26 || !s.description || s.description.length > 140 || !HEX.test(s.color ?? '')) bad(`forge skill "${s.name}": name ≤ 26, description ≤ 140, #rrggbb color`);
    }
  }
  return problems;
}
