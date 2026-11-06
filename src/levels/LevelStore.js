import { normalizeLevel, slugify } from './Level.js';

/**
 * Reading and writing level files.
 *
 * Reading uses the static files (`./levels/index.json`, `./levels/<id>.json`),
 * so the campaign works in a built game too. Writing goes through the dev
 * server's `/api/levels` (see `levelStore()` in vite.config.js); in a built
 * game it is refused, and Export/Import move levels around as files instead.
 */
export class LevelStore {
  /** @returns {Promise<{ id: string, name: string }[]>} campaign order */
  async list() {
    try {
      const response = await fetch('./levels/index.json', { cache: 'no-cache' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.campaign) ? data.campaign : [];
    } catch {
      return [];
    }
  }

  async load(id) {
    const response = await fetch(`./levels/${encodeURIComponent(id)}.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`level "${id}" not found`);
    return normalizeLevel(await response.json());
  }

  /** @returns {Promise<{ id: string, name: string }[]>} the campaign after saving */
  async save(level) {
    const clean = normalizeLevel(level);
    const response = await fetch(`./api/levels/${encodeURIComponent(clean.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        response.status === 404 || response.status === 405
          ? 'Saving only works while running `npm run dev`. Use Export to download the level instead.'
          : body.error ?? `HTTP ${response.status}`
      );
    }
    return body.campaign ?? [];
  }

  async remove(id) {
    const response = await fetch(`./api/levels/${encodeURIComponent(id)}`, { method: 'DELETE' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
    return body.campaign ?? [];
  }

  async reorder(ids) {
    const response = await fetch('./api/levels-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: ids })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
    return body.campaign ?? [];
  }

  /** Download a level as `<id>.json`. */
  exportFile(level) {
    const clean = normalizeLevel(level);
    const blob = new Blob([JSON.stringify(clean, null, 1)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${clean.id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  /** Ask for a `.json` file and read it as a level. */
  importFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return reject(new Error('no file chosen'));
        try {
          const raw = JSON.parse(await file.text());
          resolve(normalizeLevel({ ...raw, id: raw.id || slugify(file.name.replace(/\.json$/i, '')) }));
        } catch (error) {
          reject(new Error(`not a level file: ${error.message}`));
        }
      });
      input.click();
    });
  }
}

/** Per-player campaign progress — a browser convenience, not shared state. */
export const progress = {
  // Keeps the game's first name (Elemental Arena) so existing progress still loads.
  key: 'elemental-arena.campaign',
  read() {
    try {
      return JSON.parse(localStorage.getItem(this.key) ?? '{}')?.completed ?? [];
    } catch {
      return [];
    }
  },
  complete(id) {
    try {
      const done = new Set(this.read());
      done.add(id);
      localStorage.setItem(this.key, JSON.stringify({ completed: [...done] }));
    } catch {
      /* private mode: progress just is not remembered */
    }
  },
  reset() {
    try {
      localStorage.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }
};
