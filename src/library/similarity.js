/**
 * How alike two library assets are, 0..1 — the same code on the server (to
 * search the database) and in the game (to explain a match).
 *
 * Every asset carries a *fingerprint* (see library/fingerprints.js):
 *
 *   { cat:  { base: 'ice', cast: 'line', status: 'chill', … },   what kind of thing
 *     num:  { damage: 30, cooldown: 0.4, range: 15, … },          its numbers
 *     text: ['frost', 'lance', 'crystal', …] }                    its words
 *
 * The score blends the three: matching categories weigh most (two skills
 * built on the same effect, aimed the same way, with the same status are the
 * same idea whatever they are called), then how close the numbers are, then
 * how many words they share. Pure JavaScript, no imports.
 */

/** How much each category counts when it matches. */
const CAT_WEIGHT = {
  base: 3, cast: 2, status: 1.5, physical: 1, rage: 1,
  style: 2.5, resource: 1, armorClass: 1.5,
  kind: 3, group: 2.5,
  category: 3, mode: 2,
  goal: 1.5, time: 1, theme: 2
};

/** The size of a "big" difference for each number (|a − b| / scale → 0..1). */
const NUM_SCALE = {
  damage: 60, cooldown: 4, range: 20, area: 5, duration: 3, rage: 40,
  health: 60, armor: 20, speed: 15, crit: 12, attack: 20, block: 20, regen: 2, thorns: 20, gold: 30,
  rate: 8, mag: 30, pierce: 3, explode: 3,
  waves: 5, monsters: 20
};

const STOP = new Set('a an and are as at be by for from has in into is it its of on or that the their them then this to was with you your all each every one more'.split(' '));

/** Words of a text, lower case, without filler words, plurals folded. */
export function tokens(...texts) {
  const out = new Set();
  for (const text of texts) {
    for (let w of String(text ?? '').toLowerCase().split(/[^a-z0-9]+/)) {
      if (w.length < 3 || STOP.has(w)) continue;
      if (w.length > 4 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
      out.add(w);
    }
  }
  return [...out];
}

function catScore(a = {}, b = {}) {
  let total = 0;
  let same = 0;
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const w = CAT_WEIGHT[key] ?? 1;
    total += w;
    if (a[key] != null && a[key] === b[key]) same += w;
  }
  return total ? same / total : null;
}

function numScore(a = {}, b = {}) {
  const keys = Object.keys(a).filter((k) => typeof b[k] === 'number' && typeof a[k] === 'number');
  if (!keys.length) return null;
  let sum = 0;
  for (const k of keys) sum += 1 - Math.min(1, Math.abs(a[k] - b[k]) / (NUM_SCALE[k] ?? Math.max(1, Math.abs(a[k]), Math.abs(b[k]))));
  return sum / keys.length;
}

function textScore(a = [], b = []) {
  if (!a.length || !b.length) return null;
  const sa = new Set(a);
  let both = 0;
  for (const w of new Set(b)) if (sa.has(w)) both += 1;
  return both / (sa.size + new Set(b).size - both);
}

/**
 * @returns {{ score: number, parts: { cat: number|null, num: number|null, text: number|null } }}
 */
export function similarity(fa, fb) {
  const parts = { cat: catScore(fa?.cat, fb?.cat), num: numScore(fa?.num, fb?.num), text: textScore(fa?.text, fb?.text) };
  const weights = { cat: 0.45, num: 0.25, text: 0.3 };
  let sum = 0;
  let wsum = 0;
  for (const [k, v] of Object.entries(parts)) {
    if (v == null) continue;
    sum += v * weights[k];
    wsum += weights[k];
  }
  return { score: wsum ? sum / wsum : 0, parts };
}

/** Rank candidates (`{ fingerprint }`) by how alike they are to `fp`, best first. */
export function rankSimilar(fp, candidates, { min = 0.35, limit = 5 } = {}) {
  return candidates
    .map((c) => ({ ...c, ...similarity(fp, c.fingerprint) }))
    .filter((c) => c.score >= min)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
