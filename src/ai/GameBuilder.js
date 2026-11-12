import { keywordPicks, keywordSpec, menuPrompt, normalizeSpec, specSchema } from '../blueprints/index.js';

const ENDPOINT = './api/ai';

/** The inspiration catalog, loaded the first time a build needs it (not in the first page load). */
let catalog = null;
const loadCatalog = () => (catalog ??= import('../catalog/inspiration/index.js').catch(() => null));

/**
 * "…like Solo Leveling": the work the idea names, from the catalog, or null.
 * @returns {Promise<{ id: string, spec: object, text: string }|null>}
 */
async function inspirationOf(description) {
  const c = await loadCatalog();
  const work = c?.matchWork(description);
  return work ? c.likeWork(work.id) : null;
}

/**
 * A sentence → a game spec (src/blueprints/spec.js).
 *
 * Three ways, cheapest first:
 *   quick(text)              the keyword builder: no AI, no tokens, instant
 *   build(text)              the AI picks ids from the menus: ~650 prompt tokens
 *                            (the same every time, so cacheable) and ~120 out
 *   build(text, {custom})    Plus: the premium model also writes the map, the
 *                            chapter stories, the helpers' lines and questions
 *
 * "A game like <a known game or story>" (the inspiration catalog,
 * src/catalog/inspiration) starts from that work's nearest menu picks, and the
 * AI gets a short note of its systems and an original take: still no names
 * from the work.
 *
 * `heroes`: the characters players made ({ id, name, blurb }, describeHero), so
 * "a quest with my Stormbound Corsair" plays as that class — in the keywords,
 * in the AI's menu (after the fixed part of the prompt) and in its schema.
 *
 * The server picks the model from the account's plan (server/api/ai.js); this
 * only says which task it is. Whatever comes back goes through normalizeSpec,
 * and any failure falls back to the keyword builder, so the button always works.
 */
export class GameBuilder {
  /** What this account may do: `{ ok, plan: { id, name, features, buildsLeft, buildsPerDay, premium } }`. */
  async status() {
    try {
      const response = await fetch(`${ENDPOINT}/status`);
      const body = await response.json();
      return { ok: Boolean(body?.ok), plan: body?.plan ?? null, error: body?.error };
    } catch (error) {
      return { ok: false, plan: null, error: error.message };
    }
  }

  async quick(description, { heroes = [] } = {}) {
    const like = await inspirationOf(description);
    if (!like) return { spec: keywordSpec(description, { heroes }), source: 'keywords' };
    // The work's picks first; what the player wrote ("in the frozen north", "with my mage") wins.
    const spec = normalizeSpec({ ...like.spec, ...keywordPicks(description, { heroes }) }, { heroes: heroes.map((h) => h.id) });
    return { spec, source: 'keywords', inspiredBy: like.id };
  }

  /**
   * @param {string} description
   * @param {{ custom?: boolean, heroes?: { id: string, name: string, blurb?: string }[] }} [options]
   * @returns {Promise<{ spec: object, source: 'ai'|'ai-custom'|'keywords', note?: string, upgrade?: boolean }>}
   */
  async build(description, { custom = false, heroes = [] } = {}) {
    const text = String(description ?? '').trim() || 'Surprise me: a fun adventure for a child.';
    try {
      const like = await inspirationOf(text);
      const raw = await this._ask(like ? `${text}\n(${like.text})` : text, custom, heroes);
      const spec = normalizeSpec(custom ? { ...raw, custom: { plan: raw.map, chapters: raw.chapterStories, npcs: raw.npcs } } : raw, { heroes: heroes.map((h) => h.id) });
      return { spec, source: custom ? 'ai-custom' : 'ai', ...(like ? { inspiredBy: like.id } : {}) };
    } catch (error) {
      return { ...(await this.quick(text, { heroes })), note: error.message, upgrade: Boolean(error.upgrade) };
    }
  }

  async _ask(description, custom, heroes = []) {
    const response = await fetch(`${ENDPOINT}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: custom ? 'game-custom' : 'game',
        messages: [
          // The menus first and unchanged: a hosted model caches this prefix.
          { role: 'system', content: menuPrompt({ custom, heroes }) },
          { role: 'user', content: `Game idea: ${description} /no_think` }
        ],
        schema: specSchema({ custom, heroes }),
        temperature: 0.6,
        maxTokens: custom ? 3000 : 350,
        timeoutMs: custom ? 170_000 : 90_000
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body?.error ?? `HTTP ${response.status}`);
      error.upgrade = Boolean(body?.upgrade);
      throw error;
    }
    const content = String(body?.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '');
    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('the model did not return JSON');
      return JSON.parse(match[0]);
    }
  }
}
