/**
 * The browser's side of channels (server/channelStore.js): a maker's page,
 * its playlists, play time and the mistakes players find.
 */
const call = async (path, init = {}) => {
  const response = await fetch(`./api${path}`, { cache: 'no-cache', ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error ?? `HTTP ${response.status}`), { status: response.status });
  return body;
};
const send = (method, path, data = {}) => call(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const channels = {
  list: async () => (await call('/channels')).channels,
  mine: async () => (await call('/channels/me')).channel,
  get: async (handle, key = null) => (await call(`/channels/${encodeURIComponent(handle)}${key ? `?key=${encodeURIComponent(key)}` : ''}`)).channel,
  update: async (fields) => (await send('PUT', '/channels/me', fields)).channel,
  newKey: async () => (await send('POST', '/channels/me/key')).channel,
  savePlaylist: async (fields, id = null) => (await send(id ? 'PUT' : 'POST', `/channels/me/playlists${id ? `/${id}` : ''}`, fields)).id,
  removePlaylist: async (id) => (await call(`/channels/me/playlists/${id}`, { method: 'DELETE' })).deleted,
  setGameVisibility: (id, visibility) => send('POST', `/channels/me/games/${encodeURIComponent(id)}`, { visibility }),
  progress: async () => (await call('/progress')).progress,
  beat: async (game, seconds, start = false) => (await send('POST', '/progress', { game, seconds, start })).progress,
  setDone: async (game, done) => (await send('POST', '/progress', { game, done })).progress,
  reports: () => call('/reports'),
  report: (game, note, place = '') => send('POST', '/reports', { game, note, place }),
  review: (id, status) => send('POST', `/reports/${id}`, { status })
};

/**
 * Counts the time a game is really on screen and sends it to the account:
 * `start(id)` when Play is pressed; it counts while `playing()` is true and
 * the tab is in front, sends once a minute, and ends itself when the player
 * is back at the menus.
 *
 * @param {{ playing: () => boolean, signedIn: () => boolean, onEnd?: () => void }} options
 */
export function createPlayTracker({ playing, signedIn, onEnd = () => {} }) {
  const state = { game: null, pending: 0, started: false, at: 0, seen: false };
  const flush = async () => {
    if (!state.game || !signedIn()) return;
    const seconds = Math.round(state.pending);
    if (seconds < 1 && state.started) return;
    state.pending = 0;
    const first = !state.started;
    state.started = true;
    await channels.beat(state.game, Math.min(90, seconds), first).catch(() => {});
  };
  const tick = () => {
    const now = performance.now();
    const dt = Math.min(20, (now - state.at) / 1000);
    state.at = now;
    if (!state.game) return;
    if (playing()) {
      state.seen = true;
      if (document.visibilityState === 'visible') state.pending += dt;
      if (state.pending >= 60) flush();
    } else if (state.seen) {
      // Back at the menus: the last of the time, and done.
      flush().then(() => {
        state.game = null;
        onEnd();
      });
      state.seen = false;
    }
  };
  setInterval(tick, 5000);
  addEventListener('pagehide', () => flush());
  return {
    start(game) {
      if (state.game && state.game !== game) flush();
      Object.assign(state, { game, pending: 0, started: false, at: performance.now(), seen: false });
      flush();
    },
    get game() {
      return state.game;
    },
    flush
  };
}
