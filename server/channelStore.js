import { randomBytes } from 'node:crypto';
import { RateLimiter, clientIp, json, pathOf, queryOf, readJson } from './api/http.js';

/**
 * Channels: every account's own space, laid out like a video channel.
 *
 *   a channel    a handle, a name, a few lines about it, a colour; public (on
 *                the list, anyone opens it) or private (only its owner, and
 *                whoever has its private link — a key the owner can change)
 *   its games    what the account published: public (`shared`) or private
 *                (`draft`: shown to the owner and to holders of the private link)
 *   playlists    ordered lists of games — the chapters of a course, a series to
 *                play through — holding the channel's own games or any public one
 *   progress     per player per game: time played, sessions, done or not
 *   mistakes     what a player found wrong in a generated game; the game's maker
 *                confirms or dismisses it; they count towards badges
 *
 *   GET    /api/channels                       public channels
 *   GET    /api/channels/me                    mine (made on first use), everything in it
 *   PUT    /api/channels/me                    { name?, handle?, about?, color?, visibility? }
 *   POST   /api/channels/me/key                a new private link (the old one stops working)
 *   GET    /api/channels/<handle>?key=         someone's channel, as you may see it
 *   POST   /api/channels/me/playlists          { title, summary?, visibility?, items[] }
 *   PUT    /api/channels/me/playlists/<id>     the same fields
 *   DELETE /api/channels/me/playlists/<id>
 *   POST   /api/channels/me/games/<id>         { visibility: 'public'|'private' }
 *   GET    /api/progress                       my time and done marks, by game
 *   POST   /api/progress                       { game, seconds, done? }
 *   GET    /api/reports                        mistakes reported in my games, and mine
 *   POST   /api/reports                        { game, note, place? }
 *   POST   /api/reports/<id>                   { status: 'confirmed'|'dismissed' } — the game's maker
 */

const HANDLE = /^[a-z0-9][a-z0-9-]{2,29}$/;
const GAME_ID = /^(official:[a-z0-9_-]{1,64}|g-[a-z0-9-]{1,60})$/;
const PLAYLIST_ID = /^pl-[a-z0-9]{12}$/;
export const COLORS = ['violet', 'ember', 'ice', 'grass', 'gold', 'blood', 'steel', 'poison'];
const RESERVED = new Set(['me', 'new', 'admin', 'gamory', 'official', 'api', 'help', 'settings']);
const MAX_PLAYLISTS = 40;
const MAX_ITEMS = 60;
/** A game counts as done once it is marked so, or played this long. */
export const DONE_SECONDS = 300;
const text = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const slug = (v) => String(v ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
const refuse = (message, status = 400) => Object.assign(new Error(message), { status });

/**
 * The badges, each from the numbers a channel shows. `at` is what it takes.
 * @type {{ id: string, name: string, icon: string, what: string, stat: string, at: number }[]}
 */
export const BADGES = [
  { id: 'first-play', name: 'First steps', icon: '👣', what: 'Play a game', stat: 'games', at: 1 },
  { id: 'explorer', name: 'Explorer', icon: '🧭', what: 'Play 5 different games', stat: 'games', at: 5 },
  { id: 'wanderer', name: 'Wanderer', icon: '🗺️', what: 'Play 15 different games', stat: 'games', at: 15 },
  { id: 'hour', name: 'One hour in', icon: '⏱️', what: 'Play for an hour in all', stat: 'seconds', at: 3600 },
  { id: 'ten-hours', name: 'Ten hours in', icon: '⌛', what: 'Play for ten hours in all', stat: 'seconds', at: 36000 },
  { id: 'finisher', name: 'Finisher', icon: '✅', what: 'Finish 3 games', stat: 'done', at: 3 },
  { id: 'graduate', name: 'Graduate', icon: '🎓', what: 'Finish every game of a playlist', stat: 'playlistsDone', at: 1 },
  { id: 'maker', name: 'Maker', icon: '🛠️', what: 'Publish a game', stat: 'published', at: 1 },
  { id: 'studio', name: 'Studio', icon: '🏭', what: 'Publish 5 games', stat: 'published', at: 5 },
  { id: 'crowd', name: 'Crowd-pleaser', icon: '🎉', what: 'Your games played 100 times', stat: 'playsReceived', at: 100 },
  { id: 'curator', name: 'Curator', icon: '📚', what: 'Make a playlist of 3 games or more', stat: 'playlistsMade', at: 1 },
  { id: 'sharp-eye', name: 'Sharp eye', icon: '🔎', what: 'Find a mistake in a generated game', stat: 'found', at: 1 },
  { id: 'fact-checker', name: 'Fact checker', icon: '🧪', what: 'Have 3 of your finds confirmed by the maker', stat: 'confirmed', at: 3 },
  { id: 'editor', name: 'Chief editor', icon: '🏅', what: 'Have 10 of your finds confirmed', stat: 'confirmed', at: 10 }
];

export class ChannelStore {
  /**
   * @param {import('./db/database.js').Database} db
   * @param {import('./gamesStore.js').GamesStore} games
   */
  constructor(db, games, { now = () => Date.now() } = {}) {
    this.db = db;
    this.games = games;
    this.now = now;
  }

  /* ---- channels ---- */

  async _freeHandle(base, accountId) {
    let handle = slug(base);
    if (handle.length < 3 || RESERVED.has(handle)) handle = `maker-${handle || accountId}`.slice(0, 24);
    for (let n = 0; n < 50; n++) {
      const tryIt = n ? `${handle.slice(0, 24)}-${n + 1}` : handle;
      const taken = await this.db.one('SELECT account_id FROM channels WHERE handle = ?', [tryIt]);
      if (!taken || taken.account_id === accountId) return tryIt;
    }
    return `${handle.slice(0, 16)}-${randomBytes(3).toString('hex')}`;
  }

  /** An account's channel, made the first time it is asked for. */
  async ensure(account) {
    let row = await this.db.one('SELECT * FROM channels WHERE account_id = ?', [account.id]);
    if (row) return row;
    const now = this.now();
    const handle = await this._freeHandle(account.name, account.id);
    await this.db.run('INSERT INTO channels (account_id, handle, name, about, color, visibility, share_key, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (account_id) DO NOTHING', [
      account.id, handle, text(account.name, 40) || 'My channel', '', COLORS[account.id % COLORS.length], 'public', randomBytes(9).toString('hex'), now, now
    ]);
    row = await this.db.one('SELECT * FROM channels WHERE account_id = ?', [account.id]);
    return row;
  }

  async update(account, input) {
    const row = await this.ensure(account);
    const next = { ...row };
    if (input.name != null) {
      next.name = text(input.name, 40);
      if (!next.name) throw refuse('A channel needs a name');
    }
    if (input.about != null) next.about = String(input.about).replace(/\r/g, '').trim().slice(0, 600);
    if (input.color != null) {
      if (!COLORS.includes(input.color)) throw refuse('No such colour');
      next.color = input.color;
    }
    if (input.visibility != null) {
      if (!['public', 'private'].includes(input.visibility)) throw refuse('A channel is public or private');
      next.visibility = input.visibility;
    }
    if (input.handle != null && input.handle !== row.handle) {
      const handle = String(input.handle).toLowerCase().replace(/^@/, '');
      if (!HANDLE.test(handle) || RESERVED.has(handle)) throw refuse('A handle is 3 to 30 small letters, numbers or dashes');
      if (await this.db.one('SELECT 1 AS x FROM channels WHERE handle = ? AND account_id != ?', [handle, account.id])) throw refuse('That handle is taken', 409);
      next.handle = handle;
    }
    await this.db.run('UPDATE channels SET handle = ?, name = ?, about = ?, color = ?, visibility = ?, updated = ? WHERE account_id = ?', [next.handle, next.name, next.about, next.color, next.visibility, this.now(), account.id]);
    return this.view(next.handle, { account });
  }

  /** A new private link: the old one stops working. */
  async newKey(account) {
    await this.ensure(account);
    await this.db.run('UPDATE channels SET share_key = ?, updated = ? WHERE account_id = ?', [randomBytes(9).toString('hex'), this.now(), account.id]);
    return this.view((await this.ensure(account)).handle, { account });
  }

  /** Public channels, the busiest first. */
  async list({ limit = 40 } = {}) {
    const rows = await this.db.many(
      `SELECT c.handle, c.name, c.about, c.color, c.updated,
              (SELECT COUNT(*) FROM games g WHERE g.owner_id = c.account_id AND g.status = 'shared') AS games,
              (SELECT COALESCE(SUM(g.plays), 0) FROM games g WHERE g.owner_id = c.account_id AND g.status = 'shared') AS plays,
              (SELECT COUNT(*) FROM playlists p WHERE p.account_id = c.account_id AND p.visibility = 'public') AS playlists
       FROM channels c WHERE c.visibility = 'public' ORDER BY plays DESC, c.updated DESC LIMIT ?`,
      [Math.max(1, Math.min(100, Number(limit) || 40))]
    );
    return rows.map((r) => ({ handle: r.handle, name: r.name, about: r.about, color: r.color, games: Number(r.games), plays: Number(r.plays), playlists: Number(r.playlists) })).filter((c) => c.games + c.playlists > 0);
  }

  /**
   * A channel as the asker may see it: the owner and holders of the private
   * link see everything; anyone else the public games and playlists of a
   * public channel. Null when there is nothing for them to see.
   */
  async view(handle, { account = null, key = null } = {}) {
    const row = await this.db.one('SELECT * FROM channels WHERE handle = ?', [String(handle).toLowerCase()]);
    if (!row) return null;
    const owner = Boolean(account && account.id === row.account_id);
    const invited = Boolean(key && key === row.share_key);
    const all = owner || invited;
    if (row.visibility === 'private' && !all) return null;
    const rows = await this.db.many("SELECT * FROM games WHERE owner_id = ? AND status != 'hidden' ORDER BY updated DESC", [row.account_id]);
    const games = rows.filter((g) => all || g.status === 'shared').map((g) => ({ ...this.games._row(g), visibility: g.status === 'shared' ? 'public' : 'private' }));
    const lists = await this.db.many('SELECT * FROM playlists WHERE account_id = ? ORDER BY ord, created', [row.account_id]);
    // What a playlist may hold for this asker: public games, and this channel's private ones if they may see them.
    const official = new Map((await this.games.official()).map((g) => [g.id, g]));
    const mine = new Map(games.map((g) => [g.id, g]));
    const wanted = [...new Set(lists.flatMap((p) => p.items ?? []))].filter((id) => !official.has(id) && !mine.has(id));
    const others = new Map();
    for (const id of wanted.slice(0, 200)) {
      const g = await this.db.one("SELECT * FROM games WHERE id = ? AND status = 'shared'", [id]);
      if (g) others.set(id, { ...this.games._row(g), visibility: 'public' });
    }
    const card = (id) => official.get(id) ?? mine.get(id) ?? others.get(id) ?? null;
    const playlists = lists
      .filter((p) => all || p.visibility === 'public')
      .map((p) => ({ id: p.id, title: p.title, summary: p.summary, visibility: p.visibility, updated: p.updated, games: (p.items ?? []).map(card).filter(Boolean) }));
    const stats = await this.stats(row.account_id);
    return {
      handle: row.handle,
      name: row.name,
      about: row.about,
      color: row.color,
      visibility: row.visibility,
      created: row.created,
      owner,
      invited: invited && !owner,
      ...(owner ? { key: row.share_key } : {}),
      games,
      playlists,
      stats,
      badges: badgesOf(stats)
    };
  }

  /* ---- playlists ---- */

  _items(raw) {
    const out = [];
    for (const id of Array.isArray(raw) ? raw : []) {
      const s = String(id);
      if (GAME_ID.test(s) && !out.includes(s)) out.push(s);
      if (out.length >= MAX_ITEMS) break;
    }
    return out;
  }

  async savePlaylist(account, input, id = null) {
    await this.ensure(account);
    const now = this.now();
    if (id) {
      const row = await this.db.one('SELECT * FROM playlists WHERE id = ? AND account_id = ?', [id, account.id]);
      if (!row) throw refuse('No such playlist', 404);
      const title = input.title != null ? text(input.title, 80) : row.title;
      if (!title) throw refuse('A playlist needs a title');
      const visibility = input.visibility ?? row.visibility;
      if (!['public', 'private'].includes(visibility)) throw refuse('A playlist is public or private');
      await this.db.run('UPDATE playlists SET title = ?, summary = ?, visibility = ?, items = ?, ord = ?, updated = ? WHERE id = ?', [
        title, input.summary != null ? text(input.summary, 400) : row.summary, visibility, JSON.stringify(input.items != null ? this._items(input.items) : row.items), Number.isFinite(Number(input.ord)) ? Math.trunc(Number(input.ord)) : row.ord, now, id
      ]);
      return id;
    }
    const count = Number((await this.db.one('SELECT COUNT(*) AS n FROM playlists WHERE account_id = ?', [account.id])).n);
    if (count >= MAX_PLAYLISTS) throw refuse(`At most ${MAX_PLAYLISTS} playlists`);
    const title = text(input.title, 80);
    if (!title) throw refuse('A playlist needs a title');
    const visibility = input.visibility === 'private' ? 'private' : 'public';
    const newId = `pl-${randomBytes(6).toString('hex')}`;
    await this.db.run('INSERT INTO playlists (id, account_id, title, summary, visibility, items, ord, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [newId, account.id, title, text(input.summary, 400), visibility, JSON.stringify(this._items(input.items)), count, now, now]);
    return newId;
  }

  async removePlaylist(account, id) {
    const r = await this.db.run('DELETE FROM playlists WHERE id = ? AND account_id = ?', [id, account.id]);
    return r.rowCount > 0;
  }

  /** A game of mine, public or private. */
  async setGameVisibility(account, gameId, visibility) {
    if (!['public', 'private'].includes(visibility)) throw refuse('A game is public or private');
    const r = await this.db.run("UPDATE games SET status = ?, updated = ? WHERE id = ? AND owner_id = ? AND status != 'hidden'", [visibility === 'public' ? 'shared' : 'draft', this.now(), gameId, account.id]);
    if (!r.rowCount) throw refuse('Only the player who published a game can change it', 403);
    return true;
  }

  /* ---- progress ---- */

  /**
   * Add play time. A call adds at most 90 s, and never more than the time
   * that has really gone by since the last one — so nobody counts hours in
   * a minute.
   */
  async addProgress(account, { game, seconds = 0, done = false, start = false }) {
    if (!GAME_ID.test(String(game))) throw refuse('No such game', 404);
    const now = this.now();
    const row = await this.db.one('SELECT * FROM play_progress WHERE account_id = ? AND game_id = ?', [account.id, game]);
    const asked = Math.max(0, Math.min(90, Math.round(Number(seconds) || 0)));
    const add = row ? Math.min(asked, Math.max(0, Math.round((now - row.last) / 1000) + 5)) : Math.min(asked, 5);
    if (!row) {
      await this.db.run('INSERT INTO play_progress (account_id, game_id, seconds, sessions, done, first, last) VALUES (?, ?, ?, 1, ?, ?, ?)', [account.id, game, add, Boolean(done), now, now]);
    } else {
      await this.db.run('UPDATE play_progress SET seconds = seconds + ?, sessions = sessions + ?, done = done OR ?, last = ? WHERE account_id = ? AND game_id = ?', [add, start ? 1 : 0, Boolean(done), now, account.id, game]);
    }
    return this.progress(account, game);
  }

  async setDone(account, game, done) {
    if (!GAME_ID.test(String(game))) throw refuse('No such game', 404);
    const now = this.now();
    await this.db.run('INSERT INTO play_progress (account_id, game_id, seconds, sessions, done, first, last) VALUES (?, ?, 0, 0, ?, ?, ?) ON CONFLICT (account_id, game_id) DO UPDATE SET done = EXCLUDED.done', [account.id, game, Boolean(done), now, now]);
    return this.progress(account, game);
  }

  /** My progress: one game's, or every game's as `{ id: { seconds, sessions, done, last } }`. */
  async progress(account, game = null) {
    const rows = await this.db.many(`SELECT * FROM play_progress WHERE account_id = ?${game ? ' AND game_id = ?' : ''}`, game ? [account.id, game] : [account.id]);
    const out = {};
    for (const r of rows) out[r.game_id] = { seconds: Number(r.seconds), sessions: r.sessions, done: r.done || Number(r.seconds) >= DONE_SECONDS, last: Number(r.last) };
    return game ? out[game] ?? null : out;
  }

  /* ---- mistakes found ---- */

  async report(account, { game, note, place = '' }) {
    if (!GAME_ID.test(String(game))) throw refuse('No such game', 404);
    const clean = String(note ?? '').replace(/\r/g, '').trim().slice(0, 600);
    if (clean.length < 8) throw refuse('Say what is wrong, in a sentence');
    const now = this.now();
    const today = Number((await this.db.one('SELECT COUNT(*) AS n FROM mistake_reports WHERE account_id = ? AND created > ?', [account.id, now - 86400000])).n);
    if (today >= 20) throw refuse('That is 20 today — more tomorrow', 429);
    if (await this.db.one('SELECT 1 AS x FROM mistake_reports WHERE account_id = ? AND game_id = ? AND note = ?', [account.id, game, clean])) throw refuse('You already reported that', 409);
    const owner = game.startsWith('official:') ? null : (await this.db.one('SELECT owner_id FROM games WHERE id = ?', [game]))?.owner_id ?? null;
    if (owner === account.id) throw refuse('This is your own game — just fix it');
    await this.db.run('INSERT INTO mistake_reports (account_id, game_id, place, note, status, created) VALUES (?, ?, ?, ?, ?, ?)', [account.id, game, text(place, 120), clean, 'open', now]);
    return true;
  }

  /** Reports I made, and reports on games I published. */
  async reports(account) {
    const shape = (r) => ({ id: Number(r.id), game: r.game_id, title: r.title ?? r.game_id, place: r.place, note: r.note, status: r.status, created: Number(r.created), by: r.by ?? null });
    const mine = await this.db.many('SELECT r.*, g.title FROM mistake_reports r LEFT JOIN games g ON g.id = r.game_id WHERE r.account_id = ? ORDER BY r.created DESC LIMIT 200', [account.id]);
    const inbox = await this.db.many('SELECT r.*, g.title, a.name AS by FROM mistake_reports r JOIN games g ON g.id = r.game_id JOIN accounts a ON a.id = r.account_id WHERE g.owner_id = ? ORDER BY r.created DESC LIMIT 200', [account.id]);
    return { mine: mine.map(shape), inbox: inbox.map(shape) };
  }

  /** The game's maker says whether a report is right. */
  async review(account, id, status) {
    if (!['confirmed', 'dismissed'].includes(status)) throw refuse('Confirm or dismiss');
    const row = await this.db.one('SELECT r.id FROM mistake_reports r JOIN games g ON g.id = r.game_id WHERE r.id = ? AND g.owner_id = ?', [id, account.id]);
    if (!row) throw refuse('Only the maker of the game can answer a report', 403);
    await this.db.run('UPDATE mistake_reports SET status = ?, reviewed = ? WHERE id = ?', [status, this.now(), id]);
    return true;
  }

  /* ---- what a channel shows of its owner ---- */

  async stats(accountId) {
    const play = await this.db.many('SELECT game_id, seconds, done FROM play_progress WHERE account_id = ?', [accountId]);
    const doneSet = new Set(play.filter((r) => r.done || Number(r.seconds) >= DONE_SECONDS).map((r) => r.game_id));
    const made = await this.db.one("SELECT COUNT(*) AS n, COALESCE(SUM(plays), 0) AS plays FROM games WHERE owner_id = ? AND status = 'shared'", [accountId]);
    const found = await this.db.one("SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0) AS ok FROM mistake_reports WHERE account_id = ? AND status != 'dismissed'", [accountId]);
    const lists = await this.db.many('SELECT items FROM playlists WHERE account_id = ?', [accountId]);
    return {
      seconds: play.reduce((s, r) => s + Number(r.seconds), 0),
      games: play.filter((r) => Number(r.seconds) > 0 || r.done).length,
      done: doneSet.size,
      published: Number(made.n),
      playsReceived: Number(made.plays),
      found: Number(found.n),
      confirmed: Number(found.ok),
      playlistsMade: lists.filter((p) => (p.items ?? []).length >= 3).length,
      playlistsDone: lists.filter((p) => (p.items ?? []).length >= 2 && p.items.every((id) => doneSet.has(id))).length
    };
  }
}

/** Every badge with how far along it is: `{ ...badge, have, earned }`. */
export function badgesOf(stats) {
  return BADGES.map((b) => ({ ...b, have: Math.min(b.at, stats[b.stat] ?? 0), earned: (stats[b.stat] ?? 0) >= b.at }));
}

/**
 * The /api/channels, /api/progress and /api/reports routes.
 * @param {() => Promise<ChannelStore>} getStore
 */
export function channelHandler(getStore, { authenticate = async () => null } = {}) {
  const writes = new RateLimiter(60, { burst: 20 });
  const beats = new RateLimiter(240, { burst: 30 });
  return async (req, res) => {
    const path = pathOf(req);
    const area = ['/api/channels', '/api/progress', '/api/reports'].find((p) => path === p || path.startsWith(`${p}/`));
    if (!area) return false;
    const parts = decodeURIComponent(path.slice(area.length).replace(/^\//, '')).split('/').filter(Boolean);
    try {
      const store = await getStore();
      const account = await authenticate(req);
      const need = () => {
        if (!account) throw refuse('Sign in first', 401);
        return account;
      };
      const body = async () => {
        if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) throw refuse('JSON only', 415);
        if (!(area === '/api/progress' ? beats : writes).take(account ? `a${account.id}` : clientIp(req))) throw refuse('Slow down', 429);
        return readJson(req, 64 * 1024);
      };
      const serial = (fn) => store.db.serial(fn);
      const m = req.method;

      if (area === '/api/progress') {
        if (m === 'GET') return json(res, 200, { progress: account ? await store.progress(account) : {} }), true;
        if (m === 'POST') {
          const b = await body();
          need();
          const progress = b.seconds == null && b.done != null && !b.start ? await serial(() => store.setDone(account, b.game, b.done)) : await serial(() => store.addProgress(account, b));
          return json(res, 200, { progress }), true;
        }
      }
      if (area === '/api/reports') {
        if (m === 'GET') return json(res, 200, await store.reports(need())), true;
        if (m === 'POST' && !parts.length) {
          const b = await body();
          return json(res, 200, { ok: await serial(() => store.report(need(), b)) }), true;
        }
        if (m === 'POST' && /^\d{1,12}$/.test(parts[0])) {
          const b = await body();
          return json(res, 200, { ok: await serial(() => store.review(need(), Number(parts[0]), b.status)) }), true;
        }
      }
      if (area === '/api/channels') {
        if (m === 'GET' && !parts.length) return json(res, 200, { channels: await store.list({ limit: queryOf(req).get('limit') }) }), true;
        if (parts[0] === 'me') {
          const me = need();
          if (m === 'GET' && parts.length === 1) {
            const row = await serial(() => store.ensure(me));
            return json(res, 200, { channel: await store.view(row.handle, { account: me }) }), true;
          }
          if (m === 'PUT' && parts.length === 1) {
            const b = await body();
            return json(res, 200, { channel: await serial(() => store.update(me, b)) }), true;
          }
          if (m === 'POST' && parts[1] === 'key') {
            await body();
            return json(res, 200, { channel: await serial(() => store.newKey(me)) }), true;
          }
          if (parts[1] === 'playlists') {
            const id = parts[2] ?? null;
            if (id && !PLAYLIST_ID.test(id)) throw refuse('No such playlist', 404);
            if ((m === 'POST' && !id) || (m === 'PUT' && id)) {
              const b = await body();
              return json(res, 200, { id: await serial(() => store.savePlaylist(me, b, id)) }), true;
            }
            if (m === 'DELETE' && id) return json(res, 200, { deleted: await serial(() => store.removePlaylist(me, id)) }), true;
          }
          if (m === 'POST' && parts[1] === 'games' && GAME_ID.test(parts[2] ?? '')) {
            const b = await body();
            return json(res, 200, { ok: await serial(() => store.setGameVisibility(me, parts[2], b.visibility)) }), true;
          }
        } else if (m === 'GET' && parts.length === 1 && HANDLE.test(parts[0])) {
          const channel = await store.view(parts[0], { account, key: queryOf(req).get('key')?.slice(0, 40) ?? null });
          if (channel) json(res, 200, { channel });
          else json(res, 404, { error: 'No such channel — or it is private' });
          return true;
        }
      }
      json(res, 404, { error: 'unknown route' });
    } catch (error) {
      const message = String(error?.message ?? error);
      json(res, error?.status ?? (/too large/.test(message) ? 413 : /bad JSON/i.test(message) ? 400 : 500), { error: error?.status ? message : /too large|bad JSON/i.test(message) ? message : 'Server error' });
      if (!error?.status) console.error('[channels]', error);
    }
    return true;
  };
}
