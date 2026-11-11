import { describeGoal } from '../levels/Level.js';
import { GENRES } from '../blueprints/genres.js';
import { WORLDS } from '../blueprints/worlds.js';
import { THEMES } from '../library/categories.js';

/**
 * A game's card: what the home page shows about it, worked out from its
 * levels (and its builder spec, when it has one). The server stores it with
 * the game, so listing hundreds of games never opens a level.
 *
 *   { genre, genreName, world, chapters, goal, badge, study, calm, hero,
 *     look: { ground, timeOfDay, edge, fog, theme } }   // `look` draws the cover
 */

const COVER_THEMES = Object.keys(THEMES).filter((t) => t !== 'gallery' && t !== 'interior');

/**
 * The look of a level made by hand: the theme most of its scenery belongs to
 * (a village of medieval houses, a forest of pines, a graveyard), or null.
 */
function themeOfObjects(objects = []) {
  if (!objects.length) return null;
  const counts = new Map();
  let trees = 0;
  for (const o of objects) {
    if (o.category === 'tree') trees++;
    const words = String(o.model).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    for (const t of COVER_THEMES) if (THEMES[t].test(words)) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const [best, n] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
  // A village among trees is still a village: a strong theme wins over the trees.
  if (n >= 8) return best;
  if (trees > objects.length * 0.35) return 'forest';
  return n >= Math.min(3, objects.length) ? best : null;
}

/** The short label in a cover's corner: "3 chapters", "5 waves", "Boss fight". */
function badgeOf(levels) {
  if (levels.length > 1) return `${levels.length} chapters`;
  const r = levels[0]?.rules ?? {};
  if (r.goal === 'boss') return 'Boss fight';
  if (r.goal === 'study') return `${r.count} questions`;
  if (r.goal === 'kills') return `${r.count} monsters`;
  return r.count ? `${r.count} waves` : '';
}

/** The genre of a level the builder did not make, from its rules. */
function genreOfLevel(level) {
  if (level?.blueprint?.genre && GENRES[level.blueprint.genre]) return level.blueprint.genre;
  const r = level?.rules ?? {};
  if (r.goal === 'study') return r.calm ? 'calm-study' : 'study';
  if (r.goal === 'boss') return 'boss-hunt';
  if (r.goal === 'kills') return level?.npcs?.some((n) => n.quest) ? 'quest' : 'monster-hunt';
  return 'survival';
}

/**
 * @param {object[]} levels the game's levels, in order (normalised)
 * @param {object|null} [spec] the builder spec, when the game came from the Game builder
 */
export function gameCard(levels, spec = null) {
  const first = levels[0] ?? {};
  const genre = spec?.genre && GENRES[spec.genre] ? spec.genre : levels.length > 1 && levels.some((l) => l.rules?.goal === 'boss') && !spec ? 'quest' : genreOfLevel(first);
  const world = spec?.world ?? first.blueprint?.world ?? null;
  const w = first.world ?? {};
  return {
    genre,
    genreName: GENRES[genre]?.name ?? 'Adventure',
    world,
    worldName: world ? WORLDS[world]?.name ?? null : null,
    chapters: levels.length,
    goal: first.rules ? describeGoal(first.rules) : '',
    badge: badgeOf(levels),
    study: levels.some((l) => l.npcs?.some((n) => n.role === 'tutor')),
    calm: levels.every((l) => l.rules?.calm),
    hero: first.character ?? null,
    look: {
      ground: w.ground ?? 'grass',
      timeOfDay: w.timeOfDay ?? 'day',
      edge: w.edge ?? 'open',
      fog: Number.isFinite(w.fog) ? w.fog : 0.3,
      theme: world ? WORLDS[world]?.theme ?? null : first.plan?.theme ?? themeOfObjects(first.objects)
    }
  };
}

/** A short line about a game for its card: "Story quest · 3 chapters". */
export function cardLine(card) {
  return [card.genreName, card.chapters > 1 ? `${card.chapters} chapters` : card.goal].filter(Boolean).join(' · ');
}
