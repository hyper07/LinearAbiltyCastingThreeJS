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
    title: 'Kickrani',
    summary: 'Plush animals race electric scooters through the real streets and alleys of Seoul: dodge traffic, drift the corners, find the shortcuts, throw a branch in a rival\'s wheel — against bots or with up to four friends. Day or night, rain or shine. Between races, walk or fly through the whole city, every building at its true place and height.',
    engine: 'city',
    genre: 'racing',
    card: { genre: 'racing', genreName: 'Racing', cover: 'drift', badge: 'NEW' }
  },
  {
    id: 'official:bastion',
    title: 'Bastion Squad',
    summary: 'Co-op against the risen dead, two operations. Grave Purge: four commanders raise squads from Recruits to Paragons, clear a land of crypts, spires and shrines, then break the Heart of the Grave and its king before time runs out. Hold the Outpost: four soldiers keep a reactor alive through fifteen waves. Grave Purge is players only — alone, or with up to three friends.',
    engine: 'squad',
    genre: 'coop',
    card: { genre: 'coop', genreName: 'Co-op', cover: 'squad', badge: 'NEW' }
  },
  {
    id: 'official:gravepurge2d',
    title: 'Grave Purge 2D',
    summary: 'Bastion Squad\'s Grave Purge drawn flat, from straight above, with no 3D at all — the same game, the same rooms: raise squads from Recruits to Paragons at the Forge, clear the Gravefield, break the Heart and its king before time runs out. Light on older computers.',
    engine: 'squad',
    genre: 'coop',
    card: { genre: 'coop', genreName: 'Co-op', cover: 'squad', badge: 'NEW' }
  },
  {
    id: 'official:stoneball',
    title: 'Stoneball',
    summary: 'Three cavemen a side and a ball of stone. Pick your tribe\'s leather, charge your shots, pass, shove and dive — the stone is heavy, the boulders bounce it back, and golden goal settles a draw. Against the computer: easy, normal or hard.',
    engine: 'stoneball',
    genre: 'sports',
    card: { genre: 'sports', genreName: 'Sports', cover: 'stoneball', badge: 'NEW' }
  },
  {
    id: 'official:arcademia',
    title: 'AI Arcademia',
    summary: 'A learning mountain for kids aged 6 to 13: seven floors, each with a Math school, a History hall and a Physics lab. Watch worked examples written in chalk, talk with history guides, play with physics experiments, earn stars to open the next floor — and parents get a weekly report.',
    engine: 'arcademia',
    genre: 'learning',
    card: { genre: 'learning', genreName: 'Learning', cover: 'arcademia', badge: 'NEW', study: true, calm: true }
  },
  {
    id: 'official:circuitlab',
    title: 'Circuit Lab',
    summary: 'An electronics lab for the electrical-engineering class: put real-looking parts on a 3D breadboard, wire them and press Run — every voltage and current comes from a real circuit simulation. Program an Arduino Uno, Nano or Mega, an ESP32 or a Raspberry Pi Pico in Arduino C++ (the Uno and Nano can compile it for a real ATmega328P right in the browser), and drive servos, an LCD, an OLED, NeoPixels, an ultrasonic and a temperature sensor. Lessons from Blink to a distance meter; mistakes like 5 V on a 3.3 V pin break things safely and say why.',
    engine: 'circuitlab',
    genre: 'learning',
    card: { genre: 'learning', genreName: 'Learning · Electronics', cover: 'circuitlab', badge: 'NEW', study: true, calm: true }
  },
  {
    id: 'official:gloamreach',
    title: 'Gloamreach',
    summary: 'The opening of a fantasy RPG, drawn as finely as a browser allows: Brindlewick, a timber-framed village held at the golden hour under hundred-foot oaks; a carved stone gate through the ridge; the violet Gloamwood beyond, lit by blue lamps and fireflies; and from the cliffs, a rift of lava where a drake circles. Choose a knight, a ranger or a mage, and wander — meet the smith, the sellers, the storyteller and the forest\'s keepers, the village bear and the Pale Stag.',
    engine: 'gloamreach',
    genre: 'rpg',
    card: { genre: 'rpg', genreName: 'Fantasy RPG', cover: 'gloamreach', badge: 'NEW' }
  },
  {
    id: 'official:wyldhunt',
    title: 'Wyldhunt',
    summary: 'The first hunting ground of a monster hunt: Mistfall Gorge, a jungle canyon of mossy cliffs, three great waterfalls and their mist, a river with a ford and a rope bridge, and ruins older than the river. Ride your shaggy Shagmane up the path, gather what grows, follow the scout flies to the Gnarlhorn\'s tracks — then fight it with a greatblade or a bow, break its horns, sever its tail, and carve it.',
    engine: 'wyldhunt',
    genre: 'monster-hunt',
    card: { genre: 'monster-hunt', genreName: 'Monster hunt', cover: 'wyldhunt', badge: 'NEW' }
  },
  {
    id: 'official:kithvale',
    title: 'Kithvale',
    summary: 'The first map of a creature-befriending adventure: Lanternrest, a walled village of tile roofs and paper lanterns, and the vale beyond its gate at golden dusk — rolling hills, a wildflower meadow, a stream under a little bridge, a quiet wood, a pond, warm crags and a hilltop shrine. Six wild species live there. Creep up softly, toss a treat it loves, breathe with it in time — and it follows you home, lending you a gift of its own.',
    engine: 'kithvale',
    genre: 'creatures',
    card: { genre: 'creatures', genreName: 'Creatures', cover: 'kithvale', badge: 'NEW' }
  },
  {
    id: 'official:kindlewatch',
    title: 'Kindlewatch',
    summary: 'The opening map of a hand-painted top-down action game: Kindlewatch Keep, a fortress snowed in and gone cold. Fight through its courtyards — a gatehouse yard, the Brazier Court, a frozen garden, a cloister of bones, a fallen rampart — relighting braziers whose warm light pushes back the blue dark, and climb to the frost giant on the Rime Throne. Two heroes, five kinds of foe, combos, charged blows, dashes, summons.',
    engine: 'kindlewatch',
    genre: 'action',
    card: { genre: 'action', genreName: 'Action', cover: 'kindlewatch', badge: 'NEW' }
  },
  {
    id: 'official:snowpuff',
    title: 'Snowpuff Peaks',
    summary: 'A cute, fast snowboard race for kids. Pick a plush rider — Pip the fox, Mallow the bunny, Toffee the bear, Mochi the cat or Pickle the frog — give yourself a nickname, and choose a mountain: sunny Marshmallow Hill, Pinecone Ridge at sunset, or Aurora Peak at night. Carve the bends, jump the kickers and ring the bells, burst the snowmen, open gift boxes for snowballs, giant snowballs, shields and rocket sleds, shove and draft the other riders. Alone against computer riders, or with up to three friends.',
    engine: 'snowpuff',
    genre: 'racing',
    card: { genre: 'racing', genreName: 'Racing', cover: 'snowpuff', badge: 'NEW' }
  },
  {
    id: 'official:lanternwood',
    title: 'Lanternwood',
    summary: 'Pixel heroes made solid in a lit 3D world, the camera behind you. Four classes, four realms — a night forest, sunlit hills, frozen peaks, a burning caldera — hero monsters and bosses, loot you can see on your hero, and co-op for up to four.',
    engine: 'hd2d',
    genre: 'quest',
    card: { genre: 'quest', genreName: 'Adventure RPG', cover: 'hd2d', badge: 'NEW' }
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
  constructor(db, levelStore, { packages = () => [] } = {}) {
    this.db = db;
    this.levels = levelStore;
    /** Game packages (games/<code>/, server/gamePackages.js packageGames()): manifests with their production version. */
    this.packages = packages;
    /** level id → card, for the official games (files change only with a build). */
    this._officialCards = new Map();
  }

  /**
   * The official games: the built-in levels, as cards, the engine games, and the game packages
   * (games/<code>/). A package with no production release yet is a draft: listed only with
   * `drafts` (the platform admin, or the dev server), and still found by get() for them.
   */
  async official({ drafts = false } = {}) {
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
    let pkgs = [];
    try {
      pkgs = this.packages() ?? [];
    } catch (error) {
      console.warn(`[games] game packages: ${error.message}`);
    }
    const pkgOf = new Map(pkgs.map((p) => [p.id, p]));
    const pkgFields = (p) => ({ package: p.code, slug: p.slug, entry: p.entry, version: p.production ?? null, draft: !p.production });
    for (const g of ENGINE_GAMES) {
      const p = pkgOf.get(g.id);
      out.push({ ...g, ...(p ? pkgFields(p) : {}), author: 'Gamory', official: true, plays: plays.get(g.id) ?? 0, updated: 0, levels: [], roster: [] });
    }
    for (const p of pkgs) {
      if (ENGINE_GAMES.some((g) => g.id === p.id)) continue;
      if (!p.production && !drafts) continue;
      const genre = p.genre ?? 'arcade';
      out.push({
        id: p.id,
        title: p.title,
        summary: p.description ?? '',
        engine: 'package',
        genre,
        card: { genre, genreName: p.genreName ?? 'Arcade', cover: p.cover ?? 'arena', badge: p.production ? 'NEW' : 'DRAFT', ...(p.card ?? {}) },
        ...pkgFields(p),
        author: 'Gamory',
        official: true,
        plays: plays.get(p.id) ?? 0,
        updated: 0,
        levels: [],
        roster: []
      });
    }
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
  async list({ q = null, genre = null, sort = 'popular', limit = 60, drafts = false } = {}) {
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
    const official = (await this.official({ drafts })).filter((g) => (!genre || g.genre === genre) && (!needle || `${g.title} ${g.summary}`.toLowerCase().includes(needle)));
    games = [...games, ...official];
    games.sort(sort === 'new' ? (a, b) => b.updated - a.updated || b.plays - a.plays : (a, b) => b.plays - a.plays || b.updated - a.updated);
    return games.slice(0, Math.max(1, Math.min(200, Number(limit) || 60)));
  }

  /** One game with its levels: the full levels for a published game, ids for an official one. */
  async get(id) {
    if (id.startsWith('official:')) return (await this.official({ drafts: true })).find((g) => g.id === id) ?? null;
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
 * @param {{ authenticate?: (req) => Promise<object|null>, canSeeDrafts?: (req) => Promise<boolean> }} [options]
 *   who is asking (server/game); whether they may see draft-only game packages (the platform admin)
 */
export function gamesHandler(getStore, { authenticate = async () => null, canSeeDrafts = async () => false } = {}) {
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
        json(res, 200, { games: await store.list({ q: params.get('q')?.slice(0, 80), genre: params.get('genre'), sort: params.get('sort') ?? 'popular', limit: params.get('limit'), drafts: params.get('drafts') === '1' && (await canSeeDrafts(req).catch(() => false)) }) });
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
