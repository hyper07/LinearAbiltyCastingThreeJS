import { CATEGORIES, THEMES } from '../library/categories.js';

/**
 * A map plan: what the AI (or the keyword fallback) asks the composer to build.
 *
 * Deliberately small and closed — enums everywhere, a handful of layers — so a
 * 4B model on a laptop can fill it in reliably in one JSON turn, and anything
 * it gets wrong is clamped here rather than crashing the composer.
 *
 *   {
 *     name, theme, themes[], ground, relief, edge, timeOfDay, fog,
 *     layers:    [{ category, keywords[], zone, density, cluster, size }],
 *     landmarks: [{ category, keywords[], direction, distance }]
 *   }
 */

export const SURFACE_OPTIONS = ['grass', 'snow', 'sand', 'rock', 'dirt', 'mud', 'gravel', 'moss', 'ice', 'lava', 'paving', 'asphalt'];
export const RELIEF_OPTIONS = ['flat', 'hills', 'mountains', 'canyon', 'valley'];
export const EDGE_OPTIONS = ['mountains', 'cliffs', 'forest', 'buildings', 'walls', 'rocks', 'ruins', 'open'];
export const TIME_OPTIONS = ['dawn', 'day', 'dusk', 'night'];
export const ZONE_OPTIONS = ['arena', 'edge', 'outskirts', 'far'];
export const DIRECTION_OPTIONS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
export const DISTANCE_OPTIONS = ['arena', 'edge', 'far'];
export const THEME_OPTIONS = Object.keys(THEMES);
/**
 * What a map may scatter. Rigged characters and creatures are units, not
 * scenery; tiles are pieces of a board (hex grids, road kits) that only look
 * right laid edge to edge, so they are never strewn about; loose weapons and
 * the uncategorised remainder read as clutter at map scale.
 */
const NOT_SCENERY = new Set(['character', 'creature', 'tile', 'weapon', 'misc']);
/** Indoor furniture only belongs in indoor-ish settings; elsewhere it becomes props. */
const INDOOR_THEMES = new Set(['interior', 'dungeon']);
export const SCENERY_CATEGORIES = Object.keys(CATEGORIES).filter((c) => !NOT_SCENERY.has(c));

/** JSON schema for the LLM's structured output (LM Studio / any OpenAI-compatible server). */
export const MAP_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'theme', 'ground', 'relief', 'edge', 'timeOfDay', 'fog', 'layers', 'landmarks'],
  properties: {
    name: { type: 'string', maxLength: 48 },
    theme: { type: 'string', enum: THEME_OPTIONS },
    themes: { type: 'array', maxItems: 3, items: { type: 'string', enum: THEME_OPTIONS } },
    ground: { type: 'string', enum: SURFACE_OPTIONS },
    relief: { type: 'string', enum: RELIEF_OPTIONS },
    edge: { type: 'string', enum: EDGE_OPTIONS },
    timeOfDay: { type: 'string', enum: TIME_OPTIONS },
    fog: { type: 'number', minimum: 0, maximum: 1 },
    layers: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'keywords', 'zone', 'density'],
        properties: {
          category: { type: 'string', enum: SCENERY_CATEGORIES },
          keywords: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 24 } },
          zone: { type: 'string', enum: ZONE_OPTIONS },
          density: { type: 'number', minimum: 0, maximum: 1 },
          cluster: { type: 'boolean' },
          size: { type: 'number', minimum: 0.5, maximum: 2 }
        }
      }
    },
    landmarks: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'keywords', 'direction', 'distance'],
        properties: {
          category: { type: 'string', enum: SCENERY_CATEGORIES },
          keywords: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 24 } },
          direction: { type: 'string', enum: DIRECTION_OPTIONS },
          distance: { type: 'string', enum: DISTANCE_OPTIONS }
        }
      }
    }
  }
};

const pickEnum = (value, options, fallback) => (options.includes(value) ? value : fallback);
const clamp = (v, lo, hi, fallback) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : fallback);
const words = (list) =>
  (Array.isArray(list) ? list : typeof list === 'string' ? list.split(/[,\s]+/) : [])
    .map((w) => String(w).toLowerCase().trim())
    .filter((w) => w && w.length < 25)
    .slice(0, 4);

/** Repair anything an LLM (or a person editing JSON) hands us into a valid plan. */
export function normalizePlan(raw = {}) {
  const theme = pickEnum(raw.theme, THEME_OPTIONS, 'ruins');
  const plan = {
    name: String(raw.name ?? 'Untitled battlefield').slice(0, 48),
    theme,
    themes: [...new Set([theme, ...(raw.themes ?? []).filter((t) => THEME_OPTIONS.includes(t))])].slice(0, 3),
    ground: pickEnum(raw.ground, SURFACE_OPTIONS, 'dirt'),
    relief: pickEnum(raw.relief, RELIEF_OPTIONS, 'hills'),
    edge: pickEnum(raw.edge, EDGE_OPTIONS, 'rocks'),
    timeOfDay: pickEnum(raw.timeOfDay, TIME_OPTIONS, 'night'),
    fog: clamp(raw.fog, 0, 1, 0.4),
    layers: [],
    landmarks: []
  };
  const indoor = plan.themes.some((t) => INDOOR_THEMES.has(t));
  const fix = (category) => (category === 'furniture' && !indoor ? 'prop' : category);
  for (const layer of (raw.layers ?? []).slice(0, 8)) {
    if (!SCENERY_CATEGORIES.includes(layer?.category)) continue;
    plan.layers.push({
      category: fix(layer.category),
      keywords: words(layer.keywords),
      zone: pickEnum(layer.zone, ZONE_OPTIONS, 'outskirts'),
      density: clamp(layer.density, 0, 1, 0.5),
      cluster: Boolean(layer.cluster),
      size: clamp(layer.size, 0.5, 2, 1)
    });
  }
  for (const mark of (raw.landmarks ?? []).slice(0, 4)) {
    if (!SCENERY_CATEGORIES.includes(mark?.category)) continue;
    plan.landmarks.push({
      category: fix(mark.category),
      keywords: words(mark.keywords),
      direction: pickEnum(mark.direction, DIRECTION_OPTIONS, 'north'),
      distance: pickEnum(mark.distance, DISTANCE_OPTIONS, 'far')
    });
  }
  if (!plan.layers.length) plan.layers = keywordPlan(plan.theme).layers;
  return plan;
}

/* ---------------------------------------------------------------------- */
/* Offline planner — no model needed                                       */
/* ---------------------------------------------------------------------- */

const PRESETS = {
  forest: {
    ground: 'grass', relief: 'hills', edge: 'forest', timeOfDay: 'day', fog: 0.35,
    layers: [
      ['tree', ['pine', 'oak'], 'outskirts', 0.9, true], ['tree', [], 'edge', 0.8], ['bush', ['fern'], 'outskirts', 0.7, true],
      ['rock', ['moss'], 'arena', 0.4], ['plant', ['grass', 'flower'], 'arena', 0.6, true], ['tree', ['pine'], 'far', 0.7]
    ],
    landmarks: [['ruin', ['tower', 'column'], 'north', 'edge']]
  },
  snow: {
    ground: 'snow', relief: 'mountains', edge: 'mountains', timeOfDay: 'dawn', fog: 0.55,
    layers: [
      ['tree', ['pine', 'snow'], 'outskirts', 0.8, true], ['rock', ['snow', 'ice'], 'arena', 0.45], ['cliff', [], 'edge', 0.7],
      ['rock', [], 'outskirts', 0.6, true], ['tree', ['pine'], 'far', 0.6]
    ],
    landmarks: [['building', ['tower', 'castle'], 'north', 'far']]
  },
  desert: {
    ground: 'sand', relief: 'canyon', edge: 'cliffs', timeOfDay: 'day', fog: 0.2,
    layers: [
      ['rock', ['sand', 'desert'], 'arena', 0.4], ['cliff', [], 'edge', 0.8], ['plant', ['cactus'], 'outskirts', 0.5, true],
      ['ruin', ['column', 'pillar'], 'arena', 0.35], ['rock', [], 'outskirts', 0.6, true]
    ],
    landmarks: [['building', ['pyramid', 'temple'], 'north', 'far']]
  },
  city: {
    ground: 'asphalt', relief: 'flat', edge: 'buildings', timeOfDay: 'dusk', fog: 0.45,
    layers: [
      ['building', ['building', 'skyscraper'], 'edge', 0.9], ['building', [], 'outskirts', 0.9], ['vehicle', ['car', 'truck'], 'arena', 0.3],
      ['prop', ['dumpster', 'hydrant', 'bench'], 'arena', 0.5], ['light', ['lamp', 'street'], 'arena', 0.4], ['tree', [], 'outskirts', 0.3]
    ],
    landmarks: [['building', ['tower', 'skyscraper'], 'north', 'far']]
  },
  medieval: {
    ground: 'grass', relief: 'hills', edge: 'walls', timeOfDay: 'day', fog: 0.3,
    layers: [
      ['building', ['house', 'tavern', 'blacksmith'], 'outskirts', 0.7, true], ['wall', ['wall', 'fence'], 'edge', 0.8],
      ['prop', ['barrel', 'crate', 'cart'], 'arena', 0.5], ['tree', [], 'outskirts', 0.5, true], ['light', ['torch', 'lantern'], 'arena', 0.4]
    ],
    landmarks: [['building', ['castle'], 'north', 'far'], ['building', ['windmill', 'mill'], 'east', 'far']]
  },
  dungeon: {
    ground: 'paving', relief: 'canyon', edge: 'walls', timeOfDay: 'night', fog: 0.7,
    layers: [
      ['wall', ['wall'], 'edge', 0.9], ['ruin', ['column', 'pillar'], 'arena', 0.5], ['prop', ['barrel', 'chest', 'crate'], 'arena', 0.5],
      ['light', ['torch'], 'arena', 0.6], ['structure', ['coffin', 'tomb'], 'outskirts', 0.4]
    ],
    landmarks: []
  },
  halloween: {
    ground: 'dirt', relief: 'hills', edge: 'forest', timeOfDay: 'night', fog: 0.75,
    layers: [
      ['structure', ['grave', 'gravestone', 'coffin'], 'arena', 0.6, true], ['tree', ['dead'], 'outskirts', 0.7, true],
      ['prop', ['pumpkin'], 'arena', 0.5], ['wall', ['fence'], 'edge', 0.7], ['light', ['lantern', 'candle'], 'arena', 0.4]
    ],
    landmarks: [['building', ['crypt', 'church'], 'north', 'edge']]
  },
  scifi: {
    ground: 'asphalt', relief: 'flat', edge: 'buildings', timeOfDay: 'night', fog: 0.5,
    layers: [
      ['building', ['base', 'module', 'station'], 'edge', 0.8], ['structure', [], 'outskirts', 0.6], ['prop', ['container', 'crate'], 'arena', 0.5],
      ['vehicle', ['rover', 'ship'], 'outskirts', 0.3], ['light', [], 'arena', 0.4]
    ],
    landmarks: []
  },
  coast: {
    ground: 'sand', relief: 'valley', edge: 'rocks', timeOfDay: 'dusk', fog: 0.3,
    layers: [
      ['tree', ['palm'], 'outskirts', 0.6, true], ['rock', [], 'edge', 0.7], ['structure', ['dock', 'pier'], 'outskirts', 0.4],
      ['prop', ['barrel', 'crate', 'boat'], 'arena', 0.4], ['vehicle', ['boat', 'ship'], 'far', 0.3]
    ],
    landmarks: [['building', ['lighthouse'], 'north', 'far']]
  },
  ruins: {
    ground: 'dirt', relief: 'hills', edge: 'ruins', timeOfDay: 'night', fog: 0.45,
    layers: [
      ['ruin', ['column', 'pillar', 'broken'], 'arena', 0.5], ['ruin', [], 'edge', 0.8], ['rock', [], 'outskirts', 0.6, true],
      ['tree', ['dead'], 'outskirts', 0.4, true], ['plant', ['grass'], 'arena', 0.4, true]
    ],
    landmarks: [['building', ['tower', 'temple'], 'north', 'far']]
  },
  farm: {
    ground: 'grass', relief: 'hills', edge: 'forest', timeOfDay: 'day', fog: 0.25,
    layers: [
      ['building', ['barn', 'farm', 'windmill'], 'outskirts', 0.5], ['wall', ['fence'], 'edge', 0.7], ['plant', ['wheat', 'crop'], 'outskirts', 0.8, true],
      ['prop', ['hay', 'cart', 'barrel'], 'arena', 0.4], ['tree', [], 'far', 0.6]
    ],
    landmarks: []
  },
  industrial: {
    ground: 'asphalt', relief: 'flat', edge: 'buildings', timeOfDay: 'dusk', fog: 0.5,
    layers: [
      ['building', ['factory', 'warehouse'], 'edge', 0.8], ['prop', ['container', 'barrel', 'pallet'], 'arena', 0.6, true],
      ['vehicle', ['truck'], 'outskirts', 0.4], ['structure', [], 'outskirts', 0.5], ['light', [], 'arena', 0.3]
    ],
    landmarks: []
  },
  interior: { ground: 'paving', relief: 'flat', edge: 'walls', timeOfDay: 'night', fog: 0.6, layers: [['furniture', [], 'arena', 0.6], ['wall', [], 'edge', 0.9], ['light', [], 'arena', 0.5]], landmarks: [] }
};

const THEME_WORDS = [
  ['snow', /snow|ice|winter|frozen|arctic|glacier/],
  ['desert', /desert|sand|dune|egypt|pyramid|canyon|mesa/],
  ['city', /city|urban|street|downtown|town square|skyscraper|metro/],
  ['scifi', /sci-?fi|space|futur|cyber|neon|station|alien base/],
  ['halloween', /halloween|graveyard|cemetery|haunted|spooky|ghost/],
  ['dungeon', /dungeon|crypt|cave|underground|catacomb/],
  ['medieval', /medieval|castle|village|kingdom|knight|keep/],
  ['coast', /coast|beach|island|harbou?r|port|sea|ocean|pirate/],
  ['farm', /farm|field|barn|countryside|meadow/],
  ['industrial', /factory|industrial|warehouse|docks yard|refinery/],
  ['forest', /forest|wood|jungle|grove|pine|oak|tree/],
  ['ruins', /ruin|ancient|temple|abandoned|ravaged/]
];

/** A plausible plan from plain words, used when no model is reachable. */
export function keywordPlan(text = '', rng = Math.random) {
  const lower = String(text).toLowerCase();
  const matched = THEME_WORDS.filter(([, re]) => re.test(lower)).map(([t]) => t);
  const theme = matched[0] ?? (lower.trim() ? 'ruins' : THEME_OPTIONS[Math.floor(rng() * 8)] ?? 'ruins');
  const preset = PRESETS[theme] ?? PRESETS.ruins;
  const plan = {
    name: lower.trim() ? text.trim().slice(0, 48) : `${theme[0].toUpperCase()}${theme.slice(1)} battlefield`,
    theme,
    themes: matched.slice(0, 3),
    ground: preset.ground,
    relief: /mountain|peak|alp/.test(lower) ? 'mountains' : /hill/.test(lower) ? 'hills' : /canyon|gorge/.test(lower) ? 'canyon' : /flat|plain/.test(lower) ? 'flat' : preset.relief,
    edge: preset.edge,
    timeOfDay: /night|midnight|dark/.test(lower) ? 'night' : /dawn|sunrise|morning/.test(lower) ? 'dawn' : /dusk|sunset|evening/.test(lower) ? 'dusk' : /day|noon|sunny/.test(lower) ? 'day' : preset.timeOfDay,
    fog: /fog|mist|storm|haze/.test(lower) ? 0.8 : preset.fog,
    layers: preset.layers.map(([category, keywords, zone, density, cluster]) => ({ category, keywords, zone, density, cluster: !!cluster })),
    landmarks: preset.landmarks.map(([category, keywords, direction, distance]) => ({ category, keywords, direction, distance }))
  };
  // A second theme word adds its signature layer: "snowy city", "forest ruins".
  for (const extra of matched.slice(1, 3)) {
    const layer = PRESETS[extra]?.layers?.[0];
    if (layer) plan.layers.push({ category: layer[0], keywords: layer[1], zone: 'outskirts', density: 0.5, cluster: true });
  }
  return normalizePlan(plan);
}
