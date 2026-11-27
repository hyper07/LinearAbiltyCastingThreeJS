/**
 * The browser's side of /api/releases (server/releases.js): game packages' production
 * versions for everyone; the admin's changes, diffs, deploys and rollbacks. Admin calls
 * use the browser's HTTP Basic login (the platform admin's id and password): the first one
 * that gets a 401 makes the browser ask, and it remembers for the session.
 */
const call = async (path, init = {}) => {
  const response = await fetch(`./api/releases${path}`, { cache: 'no-store', credentials: 'same-origin', ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error ?? `HTTP ${response.status}`), { status: response.status, conflict: body.conflict ?? null });
  return body;
};
const post = (path, data) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data ?? {}) });
const ref = (game) => encodeURIComponent(game);

let listing = null;

export const releases = {
  /** Every package with its production version, and whether this caller is (or may be) the admin. Cached for the page. */
  list({ fresh = false } = {}) {
    if (fresh || !listing) listing = call('').catch((error) => ((listing = null), Promise.reject(error)));
    return listing;
  },
  async isAdmin() {
    return Boolean((await this.list({ fresh: true })).admin);
  },
  /** Public: a package's releases (version, date, notes). */
  releases: (game) => call(`/${ref(game)}`),
  /** Admin: releases with their sources, the deploy log and the draft's pending changes. */
  history: (game) => call(`/${ref(game)}/history`),
  /** Admin: one change's diff under the package folder. */
  diff: (game, hash) => call(`/${ref(game)}/changes/${encodeURIComponent(hash)}`),
  /** Admin: { all: true } or { picks: [hash…] }, with { bump | version, notes }. */
  deploy: (game, body) => post(`/${ref(game)}/deploy`, body).finally(() => (listing = null)),
  rollback: (game, version) => post(`/${ref(game)}/rollback`, { version }).finally(() => (listing = null))
};
