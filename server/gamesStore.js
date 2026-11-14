import { randomBytes } from 'node:crypto';
import { normalizeLevel, slugify } from '../src/levels/Level.js';
import { normalizeSpec } from '../src/blueprints/spec.js';
import { gameCard } from '../src/platform/gameCards.js';
import { RateLimiter, clientIp, json, pathOf, queryOf, readJson } from './api/http.js';

/**
 * Games: what the platform's home page lists and plays.
 *
 * Two kinds, one list:
 *   official   the levels that ship with the game (the level store's built-in
 *              files), each a game of its own; id `official:<level id>`
 *   published  games people made (the Game builder, or levels from the editor)
 *              and published: a row in `games` and its levels in `game_levels`
 *
 *   GET    /api/games?q=&genre=&sort=popular|new&limit=   cards, best first
 *   GET    /api/games/<id>                                 one game, with its levels
 *   POST   /api/games                                      publish { title, summary, levels[], spec?, roster?, author? }
 *   POST   /api/games/<id>/play                            count a play
 *   DELETE /api/games/<id>                                 its owner only
 *
 * Publishing re-numbers the levels `<game id>-<n>`, so no game can overwrite
 * another's level or a built-in one, and the server's rules can load each
 * level by id (server/game/index.js) to check tutor and quest rewards.
 */

const GAME_ID = /^(official:[a-z0-9_-]{1,64}|g-[a-z0-9-]{1,60})$/;

/**
 * Official games on engines other than the action RPG: not level files, but
 * listed (and counted) with the official games all the same.
 */
export const ENGINE_GAMES = [
  {
    id: 'official:stock-market',
    title: 'Stock Market Challenge',
    summary: 'A million in game money and a year of real stock prices, one trading day at a time. Buy, sell, beat the market and climb the leaderboard — then see what kind of investor you are.',
    engine: 'market',
    genre: 'market-sim',
    card: { genre: 'market-sim', genreName: 'Stock market', cover: 'market', badge: 'NEW' }
  },
  {
    id: 'official:work-life',
    title: 'Work Life',
    summary: 'Apply for a job at one of 500 real companies. Every day, real news about your company becomes your work: decisions, mini-games and notes to write. Get paid, earn bonuses, face your yearly review — and survive the layoffs.',
    engine: 'work',
    genre: 'work-sim',
    card: { genre: 'work-sim', genreName: 'Work life', cover: 'work', badge: 'NEW' }
  },
  {
    id: 'official:shardfront',
    title: 'Shardfront',
    summary: 'Real-time strategy on big maps. Pick one of three factions, mine shards, build a base, raise an army and wipe out up to three computer rivals.',
    engine: 'rts',
    genre: 'strategy',
    card: { genre: 'strategy', genreName: 'Strategy', cover: 'rts', badge: 'NEW' }
  },
  {
    id: 'official:lanebreak',
    title: 'Lanebreak',
    summary: 'Five against five down three lanes. Pick a champion, last-hit minions, take towers and break the enemy core — with bots, or with friends in a party.',
    engine: 'moba',
    genre: 'arena',
    card: { genre: 'arena', genreName: 'Battle arena', cover: 'moba', badge: 'NEW' }
  },
  {
    id: 'official:hearthvale',
    title: 'Hearthvale',
    summary: 'An online adventure in small groups: eight classes with skill trees, quests from the people of Hearthvale, a dungeon for five and a raid for eight, guilds, trading, gathering and crafting. Your character is kept on your account.',
    engine: 'mmo',
    genre: 'mmorpg',
    card: { genre: 'mmorpg', genreName: 'Online RPG', cover: 'mmo', badge: 'NEW' }
  },
  {
    id: 'official:seoul',
    title: 'Seoul, for real',
    summary: 'Walk and fly through the real Seoul: every building in the city, from the national building register, at its true place and height. Visit all 25 districts, find the tallest towers, watch the windows light up at night.',
    engine: 'city',
    genre: 'travel',
    card: { genre: 'travel', genreName: 'Travel', cover: 'city', badge: 'NEW' }
  },
  {
    id: 'official:breachline',
    title: 'Breachline',
    summary: 'A tactical first-person shooter: five against five over short rounds. Raiders carry a charge to site A or B; Wardens hold the sites or disarm it. Buy before each round, change ends at the half — alone with bots, or with up to four friends in a room.',
    engine: 'fps',
    genre: 'shooter',
    card: { genre: 'shooter', genreName: 'Shooter', cover: 'fps', badge: 'NEW' }
  }
];
const MAX_LEVELS = 12;
const CLASS_ID = /^[a-z][a-z0-9-]{1,63}$/;

/**
 * A game's character list: `[{ id, design? }]`, at most 16. A built-in class
 * is an id; a class made in the forge carries its design, copied into the
 * game, so the game keeps it as it was and nothing is shared by accident.
 */
export function normalizeRoster(raw) {
  const out = [];
  for (const entry of Array.isArray(raw) ? raw.slice(0, 16) : []) {
    const id = String(entry?.id ?? entry ?? '');
    if (!CLASS_ID.test(id) || out.some((e) => e.id === id)) continue;
    const design = entry?.design && typeof entry.design === 'object' ? entry.design : null;
    if (design && JSON.stringify(design).length > 64 * 1024) continue;
    out.push(design ? { id, design: { ...design, id } } : { id });
  }
  return out;
}
const text = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export class GamesStore {
  /**
   * @param {import('./db/database.js').Database} db
   * @param {{ index: () => Promise<object>, readText: (id: string) => Promise<string|null>, sameDir?: boolean }} levelStore the level files
   */
  constructor(db, levelStore) {
    this.db = db;
    this.levels = levelStore;
    /** level id → card, for the official games (files change only with a build). */
    this._officialCards = new Map();
  }

  /** The official games: the built-in levels, as cards. */
  async official() {
    const index = await this.levels.index();
    const entries = (index.campaign ?? []).filter((e) => e.official || this.levels.sameDir);
    const plays = new Map((await this.db.many('SELECT game_id, plays FROM game_plays')).map((r) => [r.game_id, r.plays]));
    const out = [];
    for (const entry of entries) {
      let card = this._officialCards.get(entry.id);
      if (!card) {
        const raw = await this.levels.readText(entry.id);
        if (!raw) continue;
        const level = normalizeLevel(JSON.parse(raw));
        card = { title: level.name, summary: level.story.intro.text.slice(0, 280), card: gameCard([level]) };
        this._officialCards.set(entry.id, card);
      }
      const id = `official:${entry.id}`;
      out.push({ id, engine: 'action-rpg', title: card.title, summary: card.summary, author: 'Gamory', official: true, genre: card.card.genre, card: card.card, plays: plays.get(id) ?? 0, updated: 0, levels: [entry.id], roster: [] });
    }
    for (const g of ENGINE_GAMES) out.push({ ...g, author: 'Gamory', official: true, plays: plays.get(g.id) ?? 0, updated: 0, levels: [], roster: [] });
    return out;
  }

  _row(row, { levels = null, full = false } = {}) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      summary: row.summary,
      author: row.author,
      official: false,
      genre: row.genre,
      card: row.card,
      plays: row.plays,
      status: row.status,
      owner: row.owner_id ?? null,
      engine: row.engine ?? 'action-rpg',
      created: row.created,
      updated: row.updated,
      roster: row.roster ?? [],
      ...(full ? { spec: row.spec ?? null, levels } : {})
    };
  }

  /** Cards for the home page: official and shared games, filtered and sorted. */
  async list({ q = null, genre = null, sort = 'popular', limit = 60 } = {}) {
    const where = ["status = 'shared'"];
    const args = [];
    if (genre) {
      where.push('genre = ?');
      args.push(genre);
    }
    if (q) {
      where.push('(title ILIKE ? OR summary ILIKE ? OR author ILIKE ?)');
      const like = `%${String(q).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      args.push(like, like, like);
    }
    const rows = await this.db.many(`SELECT * FROM games WHERE ${where.join(' AND ')} ORDER BY updated DESC LIMIT 500`, args);
    let games = rows.map((r) => this._row(r));
    const needle = q ? String(q).toLowerCase() : null;
    const official = (await this.official()).filter((g) => (!genre || g.genre === genre) && (!needle || `${g.title} ${g.summary}`.toLowerCase().includes(needle)));
    games = [...games, ...official];
    games.sort(sort === 'new' ? (a, b) => b.updated - a.updated || b.plays - a.plays : (a, b) => b.plays - a.plays || b.updated - a.updated);
    return games.slice(0, Math.max(1, Math.min(200, Number(limit) || 60)));
  }

  /** One game with its levels: the full levels for a published game, ids for an official one. */
  async get(id) {
    if (id.startsWith('official:')) return (await this.official()).find((g) => g.id === id) ?? null;
    const row = await this.db.one('SELECT * FROM games WHERE id = ?', [id]);
    if (!row || row.status === 'hidden') return null;
    const levels = (await this.db.many('SELECT data FROM game_levels WHERE game_id = ? ORDER BY ord', [id])).map((r) => r.data);
    return this._row(row, { levels, full: true });
  }

  /** A published game's level, for the server's rules. */
  async level(levelId) {
    return (await this.db.one('SELECT data FROM game_levels WHERE level_id = ?', [levelId]))?.data ?? null;
  }

  /**
   * Publish a game.
   * @param {{ title, summary?, levels: object[], spec?: object, author?: string, status?: 'shared'|'draft' }} input
   * @param {{ id: number, name: string }|null} account who is publishing (signed in), or nobody
   */
  async publish(input, account = null) {
    const raw = Array.isArray(input?.levels) ? input.levels.slice(0, MAX_LEVELS + 1) : [];
    if (!raw.length) throw new Error('a game needs at least one level');
    if (raw.length > MAX_LEVELS) throw new Error(`at most ${MAX_LEVELS} levels`);
    const title = text(input.title || raw[0]?.name, 80) || 'Untitled game';
    const id = `g-${slugify(title).slice(0, 40)}-${randomBytes(4).toString('hex')}`;
    // Fresh level ids: this game's own, never another's.
    const levels = raw.map((level, i) => normalizeLevel({ ...level, id: `${id}-${i + 1}` }));
    const spec = input.spec && typeof input.spec === 'object' ? normalizeSpec(input.spec) : null;
    const card = gameCard(levels, spec);
    const summary = text(input.summary || levels[0].story.intro.text, 400);
    const author = account?.name ?? (text(input.author, 40) || 'A player');
    const status = input.status === 'draft' && account ? 'draft' : 'shared';
    // A game with a set hero offers only that one.
    const roster = levels[0].character ? normalizeRoster([{ id: levels[0].character, design: input.roster?.find?.((e) => e?.id === levels[0].character)?.design }]) : normalizeRoster(input.roster);
    const now = Date.now();
    await this.db.tx(async () => {
      await this.db.run(
        'INSERT INTO games (id, title, summary, author, owner_id, engine, genre, card, spec, status, roster, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, title, summary, author, account?.id ?? null, 'action-rpg', card.genre, card, spec, status, JSON.stringify(roster), now, now]
      );
      for (const [i, level] of levels.entries()) await this.db.run('INSERT INTO game_levels (level_id, game_id, ord, data) VALUES (?, ?, ?, ?)', [level.id, id, i, level]);
    });
    return this.get(id);
  }

  async play(id) {
    if (id.startsWith('official:')) {
      await this.db.run('INSERT INTO game_plays (game_id, plays) VALUES (?, 1) ON CONFLICT (game_id) DO UPDATE SET plays = game_plays.plays + 1', [id]);
    } else {
      const r = await this.db.run("UPDATE games SET plays = plays + 1 WHERE id = ? AND status != 'hidden'", [id]);
      if (!r.rowCount) return null;
    }
    return { ok: true };
  }

  /** Only the account that published it may remove a game. */
  async remove(id, account) {
    const row = await this.db.one('SELECT owner_id FROM games WHERE id = ?', [id]);
    if (!row) return false;
    if (!account || row.owner_id !== account.id) throw Object.assign(new Error('only the player who published this game can remove it'), { status: 403 });
    await this.db.run('DELETE FROM games WHERE id = ?', [id]);
    return true;
  }
}

/**
 * The /api/games routes.
 * @param {() => Promise<GamesStore>} getStore
 * @param {{ authenticate?: (req) => Promise<object|null> }} [options] who is asking (server/game)
 */
export function gamesHandler(getStore, { authenticate = async () => null } = {}) {
  const writes = new RateLimiter(30, { burst: 10 });
  const plays = new RateLimiter(120, { burst: 30 });
  return async (req, res) => {
    const path = pathOf(req);
    if (!path.startsWith('/api/games')) return false;
    const rest = decodeURIComponent(path.slice('/api/games'.length).replace(/^\//, ''));
    const [id, action] = rest.split('/');
    try {
      const store = await getStore();
      if (req.method === 'GET' && !id) {
        const params = queryOf(req);
        json(res, 200, { games: await store.list({ q: params.get('q')?.slice(0, 80), genre: params.get('genre'), sort: params.get('sort') ?? 'popular', limit: params.get('limit') }) });
        return true;
      }
      if (id && !GAME_ID.test(id)) return json(res, 404, { error: 'no such game' }), true;
      if (req.method === 'GET' && id && !action) {
        const game = await store.get(id);
        if (game) json(res, 200, { game });
        else json(res, 404, { error: 'no such game' });
        return true;
      }
      if (req.method === 'POST' && id && action === 'play') {
        if (!plays.take(clientIp(req))) return json(res, 429, { error: 'Slow down' }), true;
        const ok = await store.play(id);
        json(res, ok ? 200 : 404, ok ?? { error: 'no such game' });
        return true;
      }
      if (req.method === 'POST' && !id) {
        if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) return json(res, 415, { error: 'JSON only' }), true;
        if (!writes.take(clientIp(req))) return json(res, 429, { error: 'Too many games published at once — wait a moment.' }), true;
        const body = await readJson(req, 2 * 1024 * 1024);
        const account = await authenticate(req);
        json(res, 200, { game: await store.db.serial(() => store.publish(body, account)) });
        return true;
      }
      if (req.method === 'DELETE' && id) {
        const account = await authenticate(req);
        json(res, 200, { deleted: await store.remove(id, account) });
        return true;
      }
      json(res, 404, { error: 'unknown games route' });
    } catch (error) {
      const message = String(error?.message ?? error);
      json(res, error?.status ?? (/too large/.test(message) ? 413 : 400), { error: message });
    }
    return true;
  };
}
