import { CATEGORIES } from '../library/categories.js';
import {
  DIRECTION_OPTIONS,
  EDGE_OPTIONS,
  MAP_PLAN_SCHEMA,
  RELIEF_OPTIONS,
  SURFACE_OPTIONS,
  TIME_OPTIONS,
  ZONE_OPTIONS,
  keywordPlan,
  normalizePlan
} from '../world/MapPlan.js';

const ENDPOINT = './api/ai';

/**
 * Turns "a snowy mountain pass with a ruined watchtower" into a `MapPlan`.
 *
 * The model is told what the asset library actually holds (categories, counts,
 * sample names, themes), so it asks for things that exist, and answers in a
 * strict JSON schema. Whatever comes back is run through `normalizePlan`.
 * No model reachable → the keyword planner, so the button always works.
 */
export class MapPlanner {
  /** @param {import('../library/Catalog.js').Catalog} catalog */
  constructor(catalog) {
    this.catalog = catalog;
  }

  /**
   * @param {string} description what the player typed
   * @returns {Promise<{ plan: object, source: 'ai'|'keywords', note?: string }>}
   */
  async plan(description) {
    const text = String(description ?? '').trim();
    try {
      const raw = await this._ask(text || 'Surprise me: an interesting, varied battlefield.');
      return { plan: normalizePlan(raw), source: 'ai' };
    } catch (error) {
      return { plan: keywordPlan(text), source: 'keywords', note: error.message };
    }
  }

  _systemPrompt() {
    const library = this.catalog.describe({ samplesPerCategory: 5 });
    return [
      'You design battle maps for a top-down fantasy arena game by choosing 3D models from an asset library.',
      'The player fights in a flat circular arena of radius 25 m in the middle; monsters walk in from 20 m out.',
      'Zones: "arena" = cover inside the fight (keep it sparse), "edge" = the boundary ring around it,',
      '"outskirts" = surroundings out to 75 m, "far" = the skyline out to 150 m.',
      '',
      'Asset library (category (count): description — e.g. sample names):',
      library.categories,
      `Themes in the library: ${library.themes}`,
      `Ground textures available: ${library.surfaces}`,
      '',
      'Rules:',
      '- Only use categories with a count above 0 when you can; others render as plain placeholders.',
      '- keywords are 1–4 short words matched against model names, e.g. ["pine"], ["tavern","house"], ["column"].',
      '- density 0–1: 0.2 sparse, 0.5 normal, 0.9 dense. Use 3–7 layers. Keep "arena" layers at density ≤ 0.5.',
      '- landmarks: up to 4 big set pieces at a compass direction.',
      `- ground: ${SURFACE_OPTIONS.join('|')}; relief: ${RELIEF_OPTIONS.join('|')}; edge: ${EDGE_OPTIONS.join('|')};`,
      `  timeOfDay: ${TIME_OPTIONS.join('|')}; zones: ${ZONE_OPTIONS.join('|')}; directions: ${DIRECTION_OPTIONS.join('|')}.`,
      '- fog 0–1. name: a short evocative map name.',
      'Answer with the JSON object only.'
    ].join('\n');
  }

  async _ask(description) {
    const status = await fetch(`${ENDPOINT}/status`).then((r) => r.json()).catch(() => null);
    if (!status?.ok) throw new Error(status?.error ?? 'AI model offline');

    const response = await fetch(`${ENDPOINT}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: this._systemPrompt() },
          { role: 'user', content: `Design this map: ${description}` }
        ],
        schema: MAP_PLAN_SCHEMA,
        temperature: 0.7,
        maxTokens: 800,
        // Designing a map is a one-off wait in the menu, not a combat order:
        // give a busy local model time rather than falling back to keywords.
        timeoutMs: 150_000
      })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
    const content = body?.choices?.[0]?.message?.content ?? '';
    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('the model did not return JSON');
      return JSON.parse(match[0]);
    }
  }
}

/** Category list for UI hints. */
export const MAP_CATEGORIES = Object.keys(CATEGORIES);
