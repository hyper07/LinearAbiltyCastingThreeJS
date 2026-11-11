/**
 * The browser's side of /api/games (server/gamesStore.js): the games on the
 * home page, one game with its levels, publishing, and counting plays.
 */
const call = async (path, init = {}) => {
  const response = await fetch(`./api/games${path}`, { cache: 'no-cache', ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body;
};

export const games = {
  /** @param {{ q?: string, genre?: string, sort?: 'popular'|'new', limit?: number }} [params] */
  async list(params = {}) {
    const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ''));
    return (await call(`?${query}`)).games;
  },
  async get(id) {
    return (await call(`/${encodeURIComponent(id)}`)).game;
  },
  /** @param {{ title: string, summary?: string, levels: object[], spec?: object, author?: string }} game */
  async publish(game) {
    return (await call('', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(game) })).game;
  },
  play(id) {
    return call(`/${encodeURIComponent(id)}/play`, { method: 'POST' }).catch(() => null);
  },
  async remove(id) {
    return (await call(`/${encodeURIComponent(id)}`, { method: 'DELETE' })).deleted;
  }
};
