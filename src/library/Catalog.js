import { CATEGORIES, OPT_IN_THEMES, THEMES, normalizeWords } from './categories.js';

/**
 * The downloaded asset library as the game sees it: `library/catalog.json`,
 * built by `npm run library:fetch` / `library:index`.
 *
 * Everything that places a model — the map composer, the AI planner — goes
 * through `query` / `pick`, so swapping in more packs never touches them.
 * Before the first fetch there is no catalog; `ready` resolves anyway and
 * every query comes back empty, which the composer answers with procedural
 * stand-ins.
 */
export class Catalog {
  constructor(baseUrl = './library/') {
    this.baseUrl = baseUrl;
    this.models = [];
    this.materials = [];
    this.counts = {};
    this.themes = {};
    this.loaded = false;
    this.ready = this._load();
  }

  async _load() {
    try {
      const response = await fetch(`${this.baseUrl}catalog.json`, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.models = data.models ?? [];
      this.materials = data.materials ?? [];
      this.counts = data.counts ?? {};
      this.themes = data.themes ?? {};
      for (const model of this.models) {
        model._words = normalizeWords([model.name, model.pack, ...(model.tags ?? []), ...(model.themes ?? [])].join(' '));
      }
      this.loaded = true;
    } catch (error) {
      console.info(`[Catalog] no asset library yet (${error.message}) — run \`npm run library:fetch\``);
    }
    return this;
  }

  /** Re-read the catalog — the downloader rewrites it after every source. */
  async refresh() {
    this.ready = this._load();
    return this.ready;
  }

  /** The downloader's progress (`library/status.json`), or null before the first run. */
  async status() {
    try {
      const response = await fetch(`${this.baseUrl}status.json`, { cache: 'no-cache' });
      return response.ok ? await response.json() : null;
    } catch {
      return null;
    }
  }

  url(file) {
    return this.baseUrl + file.split('/').map(encodeURIComponent).join('/');
  }

  get size() {
    return this.models.length;
  }

  /**
   * @param {{
   *   category?: string|string[],
   *   themes?: string[],        // preferred settings: matching models rank first
   *   keywords?: string[],      // free words matched against name/tags ("pine", "tavern")
   *   rigged?: boolean,
   *   maxTriangles?: number,
   *   source?: string,
   *   exclude?: Set<string>,
   *   preferPacks?: Map<string, number> // packs already on the map: same style ranks first
   * }} filter
   * @returns {object[]} matching models, best first
   */
  query(filter = {}) {
    const categories = filter.category ? [].concat(filter.category) : null;
    const themes = filter.themes?.filter(Boolean) ?? [];
    const keywords = (filter.keywords ?? []).map((k) => normalizeWords(k).trim()).filter(Boolean);
    const maxTriangles = filter.maxTriangles ?? 150_000;

    const scored = [];
    for (const model of this.models) {
      if (categories && !categories.includes(model.category)) continue;
      if (filter.rigged !== undefined && model.rigged !== filter.rigged) continue;
      if (filter.source && model.source !== filter.source) continue;
      if (model.triangles > maxTriangles) continue;
      if (filter.exclude?.has(model.id)) continue;
      if (model.themes.some((t) => OPT_IN_THEMES.has(t) && !themes.includes(t))) continue;
      let score = 0;
      let themeHits = 0;
      for (const theme of themes) if (model.themes.includes(theme)) themeHits++;
      score += themeHits * 3;
      if (themes.length && !themeHits) {
        // Clearly belongs somewhere else (a Halloween prop in a pine forest),
        // or says nothing about where it belongs.
        score -= model.themes.length ? 2 : 1;
      }
      for (const word of keywords) if (model._words.includes(word)) score += 3;
      // One map, one look: once a pack is on the map, its siblings rank first.
      if (filter.preferPacks?.has(model.pack)) score += Math.min(2, 1 + filter.preferPacks.get(model.pack) * 0.2);
      // Keywords are a request, not a filter — but a model that matches none of
      // several asked-for words should rank below one that matches the theme.
      if (keywords.length && score === 0 && themes.length) score -= 1;
      scored.push([score, model]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    // Keep only the best-scoring tier when anything scored at all, so "snow
    // pine" does not quietly fill a forest with palm trees.
    const top = scored[0]?.[0] ?? 0;
    const floor = top > 0 ? Math.max(1, top - 2) : -Infinity;
    return scored.filter(([score]) => score >= floor).map(([, model]) => model);
  }

  /** A few varied picks from a query, so a forest is not one tree copied. */
  pick(filter, count, rng = Math.random) {
    const pool = this.query(filter);
    if (pool.length <= count) return pool;
    const head = pool.slice(0, Math.max(count * 3, 12));
    const chosen = [];
    const taken = new Set();
    while (chosen.length < count && taken.size < head.length) {
      const index = Math.floor(rng() * head.length);
      if (taken.has(index)) continue;
      taken.add(index);
      chosen.push(head[index]);
    }
    return chosen;
  }

  material(surface, rng = Math.random) {
    const options = this.materials.filter((m) => m.surface === surface);
    return options.length ? options[Math.floor(rng() * options.length)] : null;
  }

  get(id) {
    return this.models.find((m) => m.id === id) ?? null;
  }

  /**
   * What the AI planner is told it can build with: categories with counts,
   * the themes present, and a sample of distinctive names per category.
   */
  describe({ samplesPerCategory = 10 } = {}) {
    const lines = [];
    const categories = Object.keys(CATEGORIES);
    for (const category of categories) {
      const count = this.counts[category] ?? 0;
      // Characters and creatures are units, not scenery; empty categories are noise.
      if (category === 'character' || category === 'creature' || category === 'tile') continue;
      if (!count && this.models.length) continue;
      const sample = this.models
        .filter((m) => m.category === category)
        .map((m) => m.name.replace(/[_-]+/g, ' ').replace(/\s+[a-z]$/i, '').toLowerCase())
        .filter((name, i, all) => all.indexOf(name) === i)
        .slice(0, samplesPerCategory);
      lines.push(`- ${category} (${count}): ${CATEGORIES[category].label}${sample.length ? ` — e.g. ${sample.join(', ')}` : ''}`);
    }
    const themes = Object.keys(THEMES)
      .filter((t) => !OPT_IN_THEMES.has(t))
      .map((t) => `${t} (${this.themes[t] ?? 0})`)
      .join(', ');
    const surfaces = [...new Set(this.materials.map((m) => m.surface))].join(', ') || 'none downloaded — vertex colours only';
    return { categories: lines.join('\n'), themes, surfaces };
  }
}
