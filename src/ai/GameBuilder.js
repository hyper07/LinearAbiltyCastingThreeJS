import { keywordSpec, menuPrompt, normalizeSpec, specSchema } from '../blueprints/index.js';

const ENDPOINT = './api/ai';

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

  quick(description, { heroes = [] } = {}) {
    return { spec: keywordSpec(description, { heroes }), source: 'keywords' };
  }

  /**
   * @param {string} description
   * @param {{ custom?: boolean, heroes?: { id: string, name: string, blurb?: string }[] }} [options]
   * @returns {Promise<{ spec: object, source: 'ai'|'ai-custom'|'keywords', note?: string, upgrade?: boolean }>}
   */
  async build(description, { custom = false, heroes = [] } = {}) {
    const text = String(description ?? '').trim() || 'Surprise me: a fun adventure for a child.';
    try {
      const raw = await this._ask(text, custom, heroes);
      const spec = normalizeSpec(custom ? { ...raw, custom: { plan: raw.map, chapters: raw.chapterStories, npcs: raw.npcs } } : raw, { heroes: heroes.map((h) => h.id) });
      return { spec, source: custom ? 'ai-custom' : 'ai' };
    } catch (error) {
      return { ...this.quick(text, { heroes }), note: error.message, upgrade: Boolean(error.upgrade) };
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
