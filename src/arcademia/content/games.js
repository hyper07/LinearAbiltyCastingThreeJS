/**
 * The six signature games' rules and data checks, as plain functions (no DOM): the browser plays
 * them with lesson/games/*.js, content/schema.js ACTIVITIES checks lessons with them, and the unit
 * tests call them directly.
 *
 *   sort       (biology)     put cards into labelled groups; with `rule`, guess the sorting rule first
 *   maphunt    (geography)   tap the right place on a simple map for each clue
 *   dig        (archaeology) brush a dig site; each find opens a question or a symbol code to decode
 *   countdown  (rockets)     answer and order things to fill the fuel bar, then count down and launch
 *   rover      (coding)      build a little program of moves, turns, repeats and pick-ups for a rover
 *   rhythm     (music)       echo a rhythm, finish a bar with the right note, match bells to colours
 *
 * Each kind's data shape is documented in docs/arcademia.md, "Activity kinds".
 */

/* ================================================================ shared */

const str = (s, min = 1) => typeof s === 'string' && s.trim().length >= min;
const int = (n, lo, hi) => Number.isInteger(n) && n >= lo && n <= hi;
const fold = (s) => String(s).trim().toLowerCase();
const uniq = (list) => new Set(list.map(fold)).size === list.length;

/** Problems with one multiple-choice question (the same rules as the quiz's; content/schema.js). */
export function choiceProblems(q, where) {
  const out = [];
  if (!q || typeof q !== 'object') return [`${where}: not an object`];
  if (!str(q.q, 3)) out.push(`${where}: no question text (q)`);
  if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 4) out.push(`${where}: 2–4 choices`);
  else {
    if (q.choices.some((c) => !str(c))) out.push(`${where}: a choice is empty`);
    else if (!uniq(q.choices)) out.push(`${where}: two choices are the same`);
    if (!int(q.answer, 0, q.choices.length - 1)) out.push(`${where}: answer is not the index of one of the choices`);
  }
  if (!str(q.hint, 3)) out.push(`${where}: no hint`);
  if (!str(q.explain, 3)) out.push(`${where}: no explanation (explain)`);
  return out;
}

/** A small seeded random (mulberry32): the same seed, the same shuffle. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A number from a string (a lesson id), for seeding. */
export const hashOf = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.codePointAt(0)) >>> 0, 7);
/** A shuffled copy that is never left in its original order (when it has two or more different items). */
export function shuffled(list, rand = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.length > 1 && out.every((x, i) => x === list[i])) out.push(out.shift());
  return out;
}

/* ================================================================ sort */

/** Is this the right group for the item? */
export const sortsInto = (item, groupId) => item.group === groupId;

export function sortProblems(l) {
  const at = `${l.id} sort`, s = l.sort, out = [];
  if (!s || typeof s !== 'object') return [`${at}: needs sort: { q, groups, items }`];
  if (!str(s.q, 3)) out.push(`${at}: no instruction (q)`);
  const groups = Array.isArray(s.groups) ? s.groups : [];
  if (groups.length < 2 || groups.length > 4) out.push(`${at}: 2–4 groups`);
  if (groups.some((g) => !/^[a-z0-9-]+$/.test(g?.id ?? '') || !str(g.label))) out.push(`${at}: each group needs an id (a-z, 0-9, -) and a label`);
  if (new Set(groups.map((g) => g?.id)).size !== groups.length) out.push(`${at}: group ids must differ`);
  if (groups.every((g) => str(g?.label)) && !uniq(groups.map((g) => g.label))) out.push(`${at}: group labels must differ`);
  const items = Array.isArray(s.items) ? s.items : [];
  if (items.length < 4 || items.length > 12) out.push(`${at}: 4–12 items`);
  const ids = new Set(groups.map((g) => g?.id));
  items.forEach((it, i) => {
    if (!str(it?.label) || !str(it?.emoji)) out.push(`${at}: item ${i + 1} needs a label and an emoji`);
    if (!ids.has(it?.group)) out.push(`${at}: item ${i + 1}'s group "${it?.group}" is not one of the groups`);
  });
  if (items.every((it) => str(it?.label)) && !uniq(items.map((it) => it.label))) out.push(`${at}: item labels must differ`);
  for (const g of groups) if (!items.some((it) => it?.group === g?.id)) out.push(`${at}: group "${g?.id}" has no items`);
  if (s.rule != null) {
    out.push(...choiceProblems(s.rule, `${at} rule`));
    for (const g of groups) if (!items.some((it) => it?.group === g?.id && it.given)) out.push(`${at}: with a rule question, group "${g?.id}" needs a given example (given: true)`);
    if (items.filter((it) => !it?.given).length < 2) out.push(`${at}: leave at least two items to sort after the rule`);
  } else if (items.some((it) => it?.given)) out.push(`${at}: given items need a rule question`);
  return out;
}

/* ================================================================ maphunt */

/**
 * The ready maps, in a 100 × 60 box (x right, y down; north is up). Each region: id, kind
 * ('land' or 'water'), polygons (one or more [[x, y], …]), and `at` where its name shows once found.
 * Their names are i18n strings: act.map.<id>. A lesson may draw its own map instead (custom regions).
 */
export const MAP_W = 100;
export const MAP_H = 60;
export const MAP_PRESETS = {
  world: [
    { id: 'pacific', kind: 'water', at: [12, 36], polys: [[[0, 6], [21, 6], [21, 16], [27, 24], [29, 31], [30, 53], [0, 53]], [[83, 6], [100, 6], [100, 53], [92, 53], [93, 44], [94, 35], [86, 29], [82, 21]]] },
    { id: 'atlantic', kind: 'water', at: [41, 22], polys: [[[30, 6], [47, 6], [47.5, 14], [45, 19], [44.5, 26], [47, 30], [52, 31], [55, 38], [57, 53], [30, 53], [37, 42], [39.5, 33], [33, 26], [28, 21], [31, 14]]] },
    { id: 'indian', kind: 'water', at: [71, 38], polys: [[[61, 27], [70, 25], [78, 28], [85, 31], [88, 34], [82, 37], [81, 53], [57, 53], [58, 42], [62, 36], [64, 28]]] },
    { id: 'arctic', kind: 'water', at: [55, 2.5], polys: [[[0, 0], [100, 0], [100, 5], [0, 5]]] },
    { id: 'southern', kind: 'water', at: [70, 51], polys: [[[0, 49], [100, 49], [100, 55], [0, 55]]] },
    { id: 'north-america', kind: 'land', at: [18, 12], polys: [[[3, 8], [9, 6], [17, 5.5], [25, 4.5], [32, 6.5], [33.5, 11.5], [31.5, 15], [28, 19], [27.5, 22], [28.5, 27], [25, 25.5], [22, 22], [19, 18], [15, 14], [10, 12], [5, 11]], [[35, 4], [38, 2.5], [44, 3.5], [43, 6.5], [39, 10], [36, 7]]] },
    { id: 'south-america', kind: 'land', at: [34, 35], polys: [[[28, 27], [33, 26], [40.5, 32], [39, 37.5], [35, 42], [31, 48.5], [29, 45], [30, 37], [27.5, 31.5]]] },
    { id: 'europe', kind: 'land', at: [54, 11.5], polys: [[[47.2, 18], [47.2, 15.3], [48.6, 14], [51.4, 10.7], [52.8, 9], [55.6, 6.7], [61.1, 7.3], [62.5, 11.7], [61, 15], [57.8, 16.3], [55.6, 17.3], [53.3, 17.3], [50.8, 15.7]], [[47.8, 13.5], [48.8, 10.5], [50.4, 12.8]]] },
    { id: 'africa', kind: 'land', at: [54, 28], polys: [[[45.3, 23], [47.2, 18.3], [52.8, 17.7], [58.9, 19.7], [61.9, 26], [64.2, 26.3], [61.1, 35], [58.9, 39.3], [55.6, 41.7], [53.3, 35.7], [52.5, 28.7], [47.8, 28.3], [45.3, 25.3]]] },
    { id: 'asia', kind: 'land', at: [78, 13], polys: [[[61, 15], [62.5, 11.7], [66.7, 6.7], [77.8, 4.3], [88.9, 6], [99, 7.3], [97, 10.5], [93, 12], [89, 13.5], [86, 16.5], [84, 20], [80.5, 23.5], [79, 27], [77.5, 29], [77, 25], [72, 27], [70, 23], [66, 22], [64.5, 25.5], [62, 25.7], [59.7, 20], [58, 17]], [[88, 18.5], [89.5, 15], [90.5, 15.5], [89, 19]], [[77, 29.5], [85, 30], [92, 31.5], [90, 33], [80, 32]]] },
    { id: 'australia', kind: 'land', at: [87, 38], polys: [[[81.7, 37.3], [86.1, 34], [89.4, 33.7], [92.5, 39], [90.6, 43], [87.5, 41.3], [81.9, 41.3]]] },
    { id: 'antarctica', kind: 'land', at: [40, 57.5], polys: [[[0, 55], [20, 54], [40, 55.5], [60, 54], [80, 54.5], [100, 55], [100, 60], [0, 60]]] }
  ],
  island: [
    { id: 'sea', kind: 'water', at: [88, 8], polys: [[[0, 0], [100, 0], [100, 60], [0, 60]]] },
    { id: 'reef', kind: 'water', at: [15, 51.5], polys: [[[6, 44], [14, 48], [22, 52], [27, 55], [22, 57.5], [12, 54], [4, 48]]] },
    { id: 'forest', kind: 'land', at: [32, 25], polys: [[[20, 30], [22, 20], [30, 13], [42, 11], [46, 22], [44, 34], [34, 40], [24, 38]]] },
    { id: 'volcano', kind: 'land', at: [57, 15], polys: [[[42, 11], [55, 7], [68, 11], [72, 20], [60, 26], [46, 22]]] },
    { id: 'village', kind: 'land', at: [70, 32], polys: [[[72, 20], [80, 27], [79, 37], [68, 42], [60, 36], [60, 26]]] },
    { id: 'beach', kind: 'land', at: [46, 46], polys: [[[24, 38], [34, 40], [44, 34], [50, 40], [60, 36], [68, 42], [60, 48], [45, 51], [30, 47]]] },
    { id: 'lagoon', kind: 'water', at: [52, 34], polys: [[[44, 34], [50, 29], [58, 30], [60, 36], [50, 40]]] }
  ]
};
/** Little pictures drawn on the ready maps (a legend a child can read). */
export const MAP_DECOR = {
  world: [['🐳', 10, 44], ['🐧', 70, 57.6], ['🐪', 52, 21.5], ['🦘', 84, 40], ['🐼', 81, 18], ['🦬', 24, 14], ['🦜', 32, 30]],
  island: [['🌴', 28, 22], ['🌲', 36, 30], ['🌋', 63, 19], ['🏠', 74, 27], ['⛵', 88, 48], ['🐠', 8, 52], ['🐚', 40, 46], ['🦆', 56, 35.5]]
};

/** A lesson's map as regions: a ready map's (names from i18n) or its own. */
export function mapRegions(map) {
  if (typeof map === 'string') return (MAP_PRESETS[map] ?? []).map((r) => ({ ...r, preset: true }));
  return (map?.regions ?? []).map((r) => ({ id: r.id, kind: r.kind === 'water' ? 'water' : 'land', label: r.label, polys: isPoly(r.points) ? [r.points] : r.points, at: r.at ?? null, emoji: r.emoji ?? null, preset: false }));
}
const isPt = (p) => Array.isArray(p) && p.length === 2 && p.every((n) => Number.isFinite(n));
const isPoly = (p) => Array.isArray(p) && p.length >= 3 && p.every(isPt);
/** The middle of a region's biggest polygon (for labels and the compass). */
export function centreOf(region) {
  if (region.at) return region.at;
  const poly = [...region.polys].sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)))[0];
  const n = poly.length;
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
}
const area = (poly) => poly.reduce((s, p, i) => s + p[0] * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * p[1], 0) / 2;
/** Which way to go from one point to another, as one of eight compass points (y grows southwards). */
export function compassFrom(from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  if (Math.hypot(dx, dy) < 4) return null;
  const a = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'][((Math.round(a / 45) % 8) + 8) % 8];
}
/** The angle (degrees, clockwise from north) a compass needle points from one point to another. */
export const bearing = (from, to) => (Math.atan2(to[0] - from[0], -(to[1] - from[1])) * 180) / Math.PI;
/** Is a point inside a polygon (even-odd rule)? */
export function inPoly([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** The region at a point: the last drawn (topmost) one that holds it, like a tap. */
export function regionAt(regions, pt) {
  for (let i = regions.length - 1; i >= 0; i--) if (regions[i].polys.some((p) => inPoly(pt, p))) return regions[i].id;
  return null;
}

export function maphuntProblems(l) {
  const at = `${l.id} maphunt`, m = l.maphunt, out = [];
  if (!m || typeof m !== 'object') return [`${at}: needs maphunt: { map, clues }`];
  if (!str(m.q, 3)) out.push(`${at}: no instruction (q)`);
  let ids = [];
  if (typeof m.map === 'string') {
    if (!MAP_PRESETS[m.map]) out.push(`${at}: map is one of ${Object.keys(MAP_PRESETS).join(', ')}, or { regions }`);
    ids = (MAP_PRESETS[m.map] ?? []).map((r) => r.id);
  } else {
    const rs = m.map?.regions;
    if (!Array.isArray(rs) || rs.length < 2 || rs.length > 12) out.push(`${at}: a custom map has 2–12 regions`);
    else {
      rs.forEach((r, i) => {
        if (!/^[a-z0-9-]+$/.test(r?.id ?? '') || !str(r.label)) out.push(`${at}: region ${i + 1} needs an id and a label`);
        const polys = isPoly(r?.points) ? [r.points] : Array.isArray(r?.points) && r.points.length && r.points.every(isPoly) ? r.points : null;
        if (!polys) out.push(`${at}: region ${i + 1} needs points: a polygon [[x, y], …] (3 or more) or a list of them`);
        else if (polys.flat().some(([x, y]) => x < 0 || x > MAP_W || y < 0 || y > MAP_H)) out.push(`${at}: region ${i + 1} must fit the ${MAP_W} × ${MAP_H} map`);
        if (r?.kind != null && !['land', 'water'].includes(r.kind)) out.push(`${at}: region ${i + 1} kind is land or water`);
      });
      ids = rs.map((r) => r?.id);
      if (new Set(ids).size !== ids.length) out.push(`${at}: region ids must differ`);
      if (rs.every((r) => str(r?.label)) && !uniq(rs.map((r) => r.label))) out.push(`${at}: region labels must differ`);
    }
  }
  const clues = Array.isArray(m.clues) ? m.clues : [];
  if (clues.length < 2 || clues.length > 6) out.push(`${at}: 2–6 clues`);
  clues.forEach((c, i) => {
    if (!str(c?.q, 3) || !str(c?.hint, 3)) out.push(`${at}: clue ${i + 1} needs q and hint`);
    if (!ids.includes(c?.region)) out.push(`${at}: clue ${i + 1}'s region "${c?.region}" is not on the map`);
  });
  if (new Set(clues.map((c) => c?.region)).size !== clues.length) out.push(`${at}: each clue looks for a different place`);
  return out;
}

/* ================================================================ dig */

/** The symbols a decode puzzle writes with (any language's letters or digits map onto them). */
export const GLYPHS = ['🦅', '🐍', '👁️', '🌙', '☀️', '🪶', '🐞', '🌾', '💧', '🔺', '⭐', '🌀', '🐟', '🦉', '🏺', '🐫', '🌿', '🪲', '🐊', '🦁', '🔑', '👑', '🌊', '🔥', '🍞', '🐸'];
const LATIN = 'ABCDEFGHIJKLMNOPRSTUVWY';
const DIGITS = '0123456789';
/** A message's characters (grapheme by grapheme, so 한글 and 漢字 work too). */
export const charsOf = (s) => [...String(s).normalize('NFC')];
/** The letters to decode: everything but spaces. */
const letters = (message) => charsOf(message).filter((c) => c.trim());

/**
 * A symbol code for a message: each different character gets a symbol, plus two decoys for Latin
 * letters and digits. → { key: [{ sym, ch }] (shuffled), code: [{ sym, ch } | { space: true }] }
 */
export function cipherFor(message, seed = 1) {
  const rand = rng(seed);
  const chars = [...new Set(letters(message).map((c) => c.toUpperCase()))];
  const pool = chars.every((c) => DIGITS.includes(c)) ? DIGITS : chars.every((c) => LATIN.includes(c) || DIGITS.includes(c)) ? LATIN : '';
  const decoys = shuffled([...pool].filter((c) => !chars.includes(c)), rand).slice(0, 2);
  const glyphs = shuffled(GLYPHS, rand);
  const key = [...chars, ...decoys].map((ch, i) => ({ sym: glyphs[i], ch }));
  const symOf = new Map(key.map((k) => [k.ch, k.sym]));
  const code = charsOf(message).map((c) => (c.trim() ? { sym: symOf.get(c.toUpperCase()), ch: c.toUpperCase() } : { space: true }));
  return { key: shuffled(key, rand), code };
}
/** Is `ch` the letter under the symbol at `pos`? */
export const decodes = (cipher, pos, ch) => cipher.code[pos]?.ch === String(ch).toUpperCase();

export function digProblems(l) {
  const at = `${l.id} dig`, d = l.dig, out = [];
  if (!d || typeof d !== 'object') return [`${at}: needs dig: { w, h, finds }`];
  if (!str(d.q, 3)) out.push(`${at}: no instruction (q)`);
  if (!int(d.w, 3, 7) || !int(d.h, 3, 6)) out.push(`${at}: the dig site is 3–7 squares wide (w) and 3–6 high (h)`);
  const finds = Array.isArray(d.finds) ? d.finds : [];
  if (finds.length < 1 || finds.length > 4) out.push(`${at}: 1–4 finds`);
  finds.forEach((f, i) => {
    const w = `${at} find ${i + 1}`;
    if (!isPt(f?.at) || !int(f.at[0], 0, (d.w ?? 1) - 1) || !int(f.at[1], 0, (d.h ?? 1) - 1)) out.push(`${w}: at [x, y] inside the site`);
    if (!str(f?.emoji) || !str(f?.label)) out.push(`${w}: needs an emoji and a label`);
    if (Boolean(f?.question) === Boolean(f?.decode)) out.push(`${w}: needs a question or a decode puzzle (one of them)`);
    if (f?.question) out.push(...choiceProblems(f.question, `${w} question`));
    if (f?.decode) {
      const c = f.decode, ls = letters(c.message ?? '');
      if (!str(c.q, 3)) out.push(`${w} decode: no question text (q)`);
      if (ls.length < 2 || ls.length > 12) out.push(`${w} decode: the message has 2–12 letters`);
      if (new Set(ls.map((x) => x.toUpperCase())).size > 10) out.push(`${w} decode: at most 10 different letters`);
      if (!str(c.explain, 3)) out.push(`${w} decode: no explanation (explain)`);
    }
  });
  if (new Set(finds.map((f) => String(f?.at))).size !== finds.length) out.push(`${at}: two finds in one square`);
  return out;
}

/* ================================================================ countdown */

export const COUNTDOWN_TARGETS = ['moon', 'mars', 'orbit', 'stars'];
/** The next item to tap in an order step is `order[done]`. */
export const orderNext = (order, done) => order[done];
/** How full the fuel tank is after `done` of `total` steps (0–1). */
export const fuelAfter = (done, total) => (total ? Math.min(1, Math.max(0, done / total)) : 1);

export function countdownProblems(l) {
  const at = `${l.id} countdown`, c = l.countdown, out = [];
  if (!c || typeof c !== 'object') return [`${at}: needs countdown: { target, steps }`];
  if (!str(c.q, 3)) out.push(`${at}: no instruction (q)`);
  if (c.target != null && !COUNTDOWN_TARGETS.includes(c.target)) out.push(`${at}: target is one of ${COUNTDOWN_TARGETS.join(', ')}`);
  if (c.from != null && !int(c.from, 3, 10)) out.push(`${at}: from (the last countdown) is 3–10`);
  const steps = Array.isArray(c.steps) ? c.steps : [];
  if (steps.length < 2 || steps.length > 6) out.push(`${at}: 2–6 steps`);
  steps.forEach((s, i) => {
    const w = `${at} step ${i + 1}`;
    if (Array.isArray(s?.order)) {
      if (!str(s.q, 3) || !str(s.hint, 3)) out.push(`${w}: an order step needs q and hint`);
      if (s.order.length < 3 || s.order.length > 6) out.push(`${w}: order 3–6 things`);
      if (s.order.some((x) => !(str(x) || Number.isFinite(x)))) out.push(`${w}: each thing to order is text or a number`);
      else if (!uniq(s.order.map(String))) out.push(`${w}: the things to order must differ`);
    } else out.push(...choiceProblems(s, w));
  });
  return out;
}

/* ================================================================ rover */

export const ROVER_BLOCKS = ['forward', 'left', 'right', 'repeat', 'pick'];
const DIRS = ['N', 'E', 'S', 'W'];
const STEP = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
/** How many blocks a program uses (a repeat counts as one, plus what is inside it). */
export const countBlocks = (program) => program.reduce((n, b) => n + (typeof b === 'object' && b ? 1 + countBlocks(b.do ?? []) : 1), 0);
/** Does a puzzle need the pick-up block (else driving over a sample collects it)? */
export const needsPick = (p) => (p.blocks ?? ROVER_BLOCKS).includes('pick');

/**
 * Run a rover program. → { ok, reason, failAt, trace, left }
 *   trace   one entry per block run: { x, y, dir, block, at (its place: [i] or [i, j] inside a repeat), ev, got? }
 *           ev: 'move', 'turn', 'pick' (got: a sample was picked up), 'bump' (a rock), 'edge' (off the map)
 *   reason  null when every sample is collected (and the rover ends on the goal, if there is one);
 *           'rock' or 'edge' (stopped at failAt), 'samples' (some left: `left`), 'goal' (not home)
 */
export function runRover(p, program, { maxSteps = 400 } = {}) {
  let [x, y] = p.start;
  let dir = p.start[2] ?? 'E';
  const pick = needsPick(p);
  const got = new Set();
  const trace = [];
  let fail = null;
  const sampleAt = (cx, cy) => p.samples.findIndex((s) => same(s, [cx, cy]));
  const run = (list, path) => {
    for (let i = 0; i < list.length && !fail; i++) {
      const b = list[i];
      if (b && typeof b === 'object') {
        for (let k = 0; k < (b.repeat ?? 0) && !fail; k++) run(b.do ?? [], [...path, i]);
        continue;
      }
      if (trace.length >= maxSteps) return;
      const at = [...path, i];
      if (b === 'left' || b === 'right') {
        dir = DIRS[(DIRS.indexOf(dir) + (b === 'left' ? 3 : 1)) % 4];
        trace.push({ x, y, dir, block: b, at, ev: 'turn' });
      } else if (b === 'forward') {
        const nx = x + STEP[dir][0], ny = y + STEP[dir][1];
        if (nx < 0 || ny < 0 || nx >= p.w || ny >= p.h) fail = { reason: 'edge', at };
        else if ((p.rocks ?? []).some((r) => same(r, [nx, ny]))) fail = { reason: 'rock', at };
        if (fail) {
          trace.push({ x, y, dir, block: b, at, ev: fail.reason === 'rock' ? 'bump' : 'edge' });
          return;
        }
        x = nx;
        y = ny;
        const s = sampleAt(x, y);
        const take = !pick && s >= 0 && !got.has(s);
        if (take) got.add(s);
        trace.push({ x, y, dir, block: b, at, ev: 'move', got: take });
      } else if (b === 'pick') {
        const s = sampleAt(x, y);
        const take = s >= 0 && !got.has(s);
        if (take) got.add(s);
        trace.push({ x, y, dir, block: b, at, ev: 'pick', got: take });
      }
    }
  };
  run(program, []);
  if (fail) return { ok: false, reason: fail.reason, failAt: fail.at, trace, left: p.samples.length - got.size };
  const left = p.samples.length - got.size;
  if (left) return { ok: false, reason: 'samples', failAt: null, trace, left };
  if (p.goal && !same(p.goal, [x, y])) return { ok: false, reason: 'goal', failAt: null, trace, left: 0 };
  return { ok: true, reason: null, failAt: null, trace, left: 0 };
}

/** The shortest program of single blocks (no repeats) that solves a puzzle, or null (breadth-first). */
export function solveRover(p) {
  const pick = needsPick(p);
  const n = p.samples.length;
  const key = (x, y, d, m) => `${x},${y},${d},${m}`;
  const start = [p.start[0], p.start[1], p.start[2] ?? 'E', 0];
  const seen = new Map([[key(...start), null]]);
  const queue = [start];
  const done = (x, y, m) => m === (1 << n) - 1 && (!p.goal || same(p.goal, [x, y]));
  const path = (k) => {
    const out = [];
    for (let e = seen.get(k); e; e = seen.get(e.from)) out.unshift(e.block);
    return out;
  };
  if (done(start[0], start[1], 0)) return [];
  while (queue.length) {
    const [x, y, d, m] = queue.shift();
    const from = key(x, y, d, m);
    const moves = [['left', x, y, DIRS[(DIRS.indexOf(d) + 3) % 4], m], ['right', x, y, DIRS[(DIRS.indexOf(d) + 1) % 4], m]];
    const nx = x + STEP[d][0], ny = y + STEP[d][1];
    if (nx >= 0 && ny >= 0 && nx < p.w && ny < p.h && !(p.rocks ?? []).some((r) => same(r, [nx, ny]))) {
      const s = p.samples.findIndex((q) => same(q, [nx, ny]));
      moves.push(['forward', nx, ny, d, !pick && s >= 0 ? m | (1 << s) : m]);
    }
    if (pick) {
      const s = p.samples.findIndex((q) => same(q, [x, y]));
      if (s >= 0) moves.push(['pick', x, y, d, m | (1 << s)]);
    }
    for (const [block, ...st] of moves) {
      const k = key(...st);
      if (seen.has(k)) continue;
      seen.set(k, { from, block });
      if (done(st[0], st[1], st[3])) return path(k);
      queue.push(st);
    }
  }
  return null;
}

const blockOk = (b, allowed, nested = false) => (typeof b === 'string' ? allowed.includes(b) && b !== 'repeat' : !nested && b && typeof b === 'object' && allowed.includes('repeat') && int(b.repeat, 2, 9) && Array.isArray(b.do) && b.do.length > 0 && b.do.every((x) => blockOk(x, allowed, true)));

export function roverProblems(l) {
  const at = `${l.id} rover`, r = l.rover, out = [];
  if (!r || typeof r !== 'object') return [`${at}: needs rover: { q, puzzles }`];
  if (!str(r.q, 3)) out.push(`${at}: no instruction (q)`);
  const ps = Array.isArray(r.puzzles) ? r.puzzles : [];
  if (ps.length < 1 || ps.length > 3) out.push(`${at}: 1–3 puzzles`);
  ps.forEach((p, i) => {
    const w = `${at} puzzle ${i + 1}`, before = out.length;
    if (!int(p?.w, 3, 8) || !int(p?.h, 3, 6)) return out.push(`${w}: the grid is 3–8 wide (w) and 3–6 high (h)`);
    const inGrid = (c) => isPt(c) && int(c[0], 0, p.w - 1) && int(c[1], 0, p.h - 1);
    if (!Array.isArray(p.start) || !inGrid(p.start.slice(0, 2)) || !DIRS.includes(p.start[2] ?? 'E')) out.push(`${w}: start is [x, y, 'N' | 'E' | 'S' | 'W'] inside the grid`);
    if (!Array.isArray(p.samples) || p.samples.length < 1 || p.samples.length > 4 || !p.samples.every(inGrid)) out.push(`${w}: 1–4 samples, each [x, y] inside the grid`);
    if (p.rocks != null && (!Array.isArray(p.rocks) || !p.rocks.every(inGrid))) out.push(`${w}: rocks are [x, y] squares inside the grid`);
    if (p.goal != null && !inGrid(p.goal)) out.push(`${w}: goal is [x, y] inside the grid`);
    const blocks = p.blocks ?? ROVER_BLOCKS;
    if (!Array.isArray(blocks) || !blocks.includes('forward') || blocks.some((b) => !ROVER_BLOCKS.includes(b))) out.push(`${w}: blocks are some of ${ROVER_BLOCKS.join(', ')} (forward always)`);
    if (!int(p.max, 2, 16)) out.push(`${w}: max (how many blocks fit) is 2–16`);
    if (!str(p.hint, 3)) out.push(`${w}: no hint`);
    if (out.length > before) return;
    const rocks = new Set((p.rocks ?? []).map(String));
    if ([p.start.slice(0, 2), ...p.samples, ...(p.goal ? [p.goal] : [])].some((c) => rocks.has(String(c)))) out.push(`${w}: a rock sits on the start, a sample or the goal`);
    if (new Set(p.samples.map(String)).size !== p.samples.length) out.push(`${w}: two samples in one square`);
    const best = solveRover(p);
    if (!best) out.push(`${w}: no program can solve it`);
    else if (!blocks.includes('repeat') && best.length > p.max) out.push(`${w}: it needs ${best.length} blocks but only ${p.max} fit`);
    if (p.program != null) {
      if (!Array.isArray(p.program) || !p.program.every((b) => blockOk(b, blocks))) out.push(`${w}: the starting program uses only its blocks (a repeat: { repeat: 2–9, do: [...] }, not nested)`);
      else if (countBlocks(p.program) > p.max) out.push(`${w}: the starting program is longer than max`);
      else if (runRover(p, p.program).ok) out.push(`${w}: the starting program already works (a fix-the-bug puzzle needs a bug)`);
    }
  });
  return out;
}

/* ================================================================ rhythm */

/** Note lengths in beats (a 4-beat bar): whole, half, quarter, eighth. Negative = a rest that long. */
export const NOTE_LENGTHS = [4, 2, 1, 0.5];
export const NOTE_NAMES = { 4: 'whole', 2: 'half', 1: 'quarter', 0.5: 'eighth' };
/** A length as a fraction of a whole note: 4 → '1', 2 → '1/2', 1 → '1/4', 0.5 → '1/8'. */
export const fractionOf = (beats) => (beats === 4 ? '1' : `1/${4 / beats}`);
export const RHYTHM_MODES = ['echo', 'notes', 'match'];
/** Which bell rings on each turn of a match round (seeded; never the same bell twice running). */
export function matchOrder(pairs, turns, seed) {
  const rand = rng(seed);
  const out = [];
  for (let k = 0; k < turns; k++) {
    let x = Math.floor(rand() * pairs);
    if (x === out.at(-1)) x = (x + 1) % pairs;
    out.push(x);
  }
  return out;
}
/** When each note starts, in beats from the first (rests make gaps; a leading rest is dropped). */
export function onsets(pattern) {
  const out = [];
  let t = 0;
  for (const v of pattern) {
    if (v > 0) out.push(t);
    t += Math.abs(v);
  }
  return out.map((x) => x - (out[0] ?? 0));
}
/**
 * Judge taps against a rhythm. `taps` are times in ms (any origin); the first tap is the first
 * note. Each note is hit by a tap within `tolerance` of a beat (0.35 = a third of a beat either side).
 * → { hits: [bool per note], extra (taps that hit nothing), ok (every note hit, at most one stray tap) }
 */
export function judgeEcho(pattern, tempo, taps, tolerance = 0.35) {
  const beat = 60000 / tempo;
  const want = onsets(pattern).map((b) => b * beat);
  const t0 = taps[0] ?? 0;
  const rel = taps.map((x) => x - t0);
  const used = new Set();
  const hits = want.map((w) => {
    let best = -1, bestD = Infinity;
    rel.forEach((r, i) => {
      const d = Math.abs(r - w);
      if (!used.has(i) && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    if (best >= 0 && bestD <= tolerance * beat) {
      used.add(best);
      return true;
    }
    return false;
  });
  const extra = rel.length - used.size;
  return { hits, extra, ok: taps.length > 0 && hits.every(Boolean) && extra <= 1 };
}
/** How many beats are missing from a bar with one gap (0): 4 − the rest. */
export const barGap = (pattern, beats = 4) => beats - pattern.reduce((s, v) => s + Math.abs(v || 0), 0);
/** A pitch name ('C5', 'F#4', 'Bb4') → Hz; null if it isn't one. */
export function noteFreq(name) {
  const m = /^([A-G])([#b]?)([2-7])$/.exec(String(name));
  if (!m) return null;
  const semis = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}

export function rhythmProblems(l) {
  const at = `${l.id} rhythm`, r = l.rhythm, out = [];
  if (!r || typeof r !== 'object') return [`${at}: needs rhythm: { tempo, rounds }`];
  if (!str(r.q, 3)) out.push(`${at}: no instruction (q)`);
  if (!int(r.tempo, 60, 160)) out.push(`${at}: tempo is 60–160 beats a minute`);
  const rounds = Array.isArray(r.rounds) ? r.rounds : [];
  if (rounds.length < 1 || rounds.length > 5) out.push(`${at}: 1–5 rounds`);
  const isLen = (v) => NOTE_LENGTHS.includes(Math.abs(v));
  rounds.forEach((x, i) => {
    const w = `${at} round ${i + 1}`;
    if (!RHYTHM_MODES.includes(x?.mode)) return out.push(`${w}: mode is one of ${RHYTHM_MODES.join(', ')}`);
    if (x.mode === 'echo') {
      const p = x.pattern;
      if (!Array.isArray(p) || p.length < 2 || p.length > 8 || !p.every(isLen)) out.push(`${w}: an echo pattern is 2–8 note lengths (4, 2, 1, 0.5; negative = a rest)`);
      else if (!(p[0] > 0) || p.filter((v) => v > 0).length < 2) out.push(`${w}: an echo pattern starts with a note and has two or more`);
      if (x.tolerance != null && !(x.tolerance >= 0.15 && x.tolerance <= 0.5)) out.push(`${w}: tolerance is 0.15–0.5 of a beat`);
      if (x.sound != null && !['bell', 'drum'].includes(x.sound)) out.push(`${w}: sound is bell or drum`);
    } else if (x.mode === 'notes') {
      const p = x.pattern;
      if (!str(x.q, 3) || !str(x.hint, 3) || !str(x.explain, 3)) out.push(`${w}: a notes round needs q, hint and explain`);
      if (!Array.isArray(p) || p.length < 2 || p.length > 6 || p.filter((v) => v === 0).length !== 1 || !p.every((v) => v === 0 || isLen(v))) out.push(`${w}: a notes pattern is 2–6 note lengths with one gap (0)`);
      else {
        const gap = barGap(p);
        if (!NOTE_LENGTHS.includes(gap)) out.push(`${w}: the gap must be one note long (the bar adds up to 4 beats)`);
        if (!Array.isArray(x.choices) || x.choices.length < 2 || x.choices.length > 4 || !x.choices.every((c) => NOTE_LENGTHS.includes(c)) || new Set(x.choices).size !== x.choices.length) out.push(`${w}: 2–4 different note lengths to choose from`);
        else if (!x.choices.includes(gap)) out.push(`${w}: the note that fills the gap (${gap}) is not a choice`);
      }
    } else {
      const ps = x.pairs;
      if (!str(x.q, 3)) out.push(`${w}: a match round needs q`);
      if (!Array.isArray(ps) || ps.length < 2 || ps.length > 4) out.push(`${w}: 2–4 pairs`);
      else {
        if (ps.some((p) => !str(p?.label) || !noteFreq(p.note))) out.push(`${w}: each pair needs a label and a note ('C5', 'E5', 'G5'…)`);
        if (new Set(ps.map((p) => p?.note)).size !== ps.length) out.push(`${w}: each pair rings a different note`);
        if (ps.every((p) => str(p?.label)) && !uniq(ps.map((p) => p.label))) out.push(`${w}: pair labels must differ`);
        if (ps.some((p) => p?.color != null && !/^#[0-9a-f]{6}$/i.test(p.color))) out.push(`${w}: a colour is #rrggbb`);
      }
      if (x.turns != null && !int(x.turns, 2, 6)) out.push(`${w}: turns is 2–6`);
    }
  });
  return out;
}
