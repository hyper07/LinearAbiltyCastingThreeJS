import { normalizeLevel } from '../../src/levels/Level.js';
import { platform, classArmor, classBonuses } from '../../src/platform/index.js';
import { RateLimiter, clientIp, json, pathOf, queryOf, readJson } from '../api/http.js';
import { Accounts } from './accounts.js';
import { GAME_SCOPE, GameAuthority, gameOfScope } from './authority.js';
import { History } from './db.js';
import { openDatabase } from '../db/database.js';
import { Keys, loadSecret } from './keys.js';
import { Refusal, Violation } from './rules.js';

const COOKIE = 'gamory_session';

/**
 * Accounts, characters and the rules, as one service with its HTTP routes:
 *
 *   POST /api/account/register | login | logout     GET /api/account/me | history
 *   GET  /api/game/state
 *   POST /api/game/run/start | run/join | run/end
 *   POST /api/game/kill | party-kill | take | drop | ops | npc | shop | buy
 *
 * Every POST must be same-origin JSON (a form on another site cannot send
 * one), carries the session cookie, and is rate-limited per account and per
 * address. A refused action answers `{ error, resync: true }`: the browser
 * then takes the server's copy of the character.
 *
 * The database is PostgreSQL (server/db/database.js): `db` if given, else the
 * one for DATABASE_URL, else PGlite in `dataDir`. Every request that reads or
 * changes a character runs through `db.serial`: one at a time, like the
 * rules expect.
 *
 * @param {{ dataDir: string, db?: import('../db/database.js').Database, readLevel?: (id: string) => Promise<string|null>, log?: (line: string) => void, env?: object }} options
 */
export async function createGameServices({ dataDir, db = null, readLevel = async () => null, log = () => {}, env = process.env } = {}) {
  const { secret, source, created } = loadSecret(dataDir, env);
  if (created) log(`[game] made a new server key in ${source} — keep it (and back it up): without it the saved characters cannot be opened`);
  const keys = new Keys(secret);
  db ??= await openDatabase({ url: env.DATABASE_URL, dataDir, log });
  const history = new History(db, keys);
  let sameParty = () => false;
  const authority = new GameAuthority({
    db,
    keys,
    history,
    log,
    sameParty: (a, b) => sameParty(a, b),
    loadLevel: async (id) => {
      const text = await readLevel(id);
      if (text) return normalizeLevel(JSON.parse(text));
      // A published game's level (server/gamesStore.js): its rewards are checked here too.
      const row = await db.one('SELECT data FROM game_levels WHERE level_id = ?', [String(id)]);
      return row ? normalizeLevel(row.data) : null;
    }
  });
  const accounts = new Accounts({ db, keys, history, authority, accountsPerAddressPerDay: Number(env.ACCOUNTS_PER_ADDRESS_PER_DAY) || 5 });
  const allowedOrigins = String(env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const trustProxy = env.TRUST_PROXY === '1';

  const limits = {
    auth: new RateLimiter(10, { burst: 10 }), // per address
    game: new RateLimiter(900, { burst: 300 }), // per account: kills in a big wave come in bursts
    read: new RateLimiter(240, { burst: 60 })
  };

  const cookieOf = (req) => {
    const header = String(req.headers.cookie ?? '');
    for (const part of header.split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === COOKIE) return decodeURIComponent(v.join('='));
    }
    return null;
  };
  const secure = (req) => Boolean(req.socket?.encrypted) || (trustProxy && req.headers['x-forwarded-proto'] === 'https');
  const setCookie = (req, res, token, maxAge) => {
    res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure(req) ? '; Secure' : ''}`);
  };
  const sameOrigin = (req) => {
    const origin = req.headers.origin;
    if (!origin) return true; // same-origin fetches in some browsers, and tools
    try {
      return new URL(origin).host === req.headers.host || allowedOrigins.includes(origin);
    } catch {
      return false;
    }
  };

  /** The signed-in account for a request (or an upgrade), or null. */
  const authenticate = (req) => accounts.fromToken(cookieOf(req));

  /**
   * Which game a request's character belongs to. A fight action's is its
   * run's (the server's record, whatever the browser says); anything else
   * names one, which must exist: the arena, a builder draft, an official level
   * or a published game. Unknown names are refused, so nobody mints characters.
   */
  const known = new Set(['arena', 'draft']);
  const gameOf = async (body, query) => {
    const run = body?.runId ? authority.runs.get(String(body.runId)) : null;
    if (run) return run.game;
    const asked = String(body?.game ?? query?.get?.('game') ?? 'arena');
    if (known.has(asked)) return asked;
    if (!GAME_SCOPE.test(asked)) throw new Refusal('No such game', 404);
    const base = gameOfScope(asked);
    const exists = known.has(base) ||
      (base.startsWith('official:')
        ? Boolean(await readLevel(base.slice('official:'.length)))
        : Boolean(await db.one('SELECT 1 FROM games WHERE id = ?', [base])));
    if (!exists) throw new Refusal('No such game', 404);
    if (known.size < 10000) known.add(asked).add(base);
    return asked;
  };

  /** The class the browser is playing, so both sides count the same spells. */
  const useClass = async (accountId, classId) => {
    const id = typeof classId === 'string' && platform.characters.get(classId) ? classId : null;
    if (!id) return;
    const profile = await authority.character(accountId);
    if (profile.classId !== id) profile.setClass(id, classBonuses(id), classArmor(id));
  };

  const routes = {
    'GET /api/account/me': async ({ account }) => {
      if (!account) return { account: null };
      return { account: await accounts.public(account.id), character: await authority.view(account.id) };
    },
    'GET /api/account/history': async ({ account, query }) => {
      if (!account) throw new Refusal('Sign in first', 401);
      return { events: await history.of(account.id, Math.min(100, Number(query.get('limit')) || 50), Number(query.get('before')) || null) };
    },
    'GET /api/game/state': async ({ account, query }) => {
      if (!account) throw new Refusal('Sign in first', 401);
      await useClass(account.id, query.get('classId'));
      return authority.view(account.id);
    },
    // The lobby: your characters in a game, one per class (level, gold).
    'GET /api/game/characters': ({ account }) => authority.charactersIn(account.id, gameOfScope(authority.game)).then((characters) => ({ characters })),
    // "My heroes": every character you have, in every game.
    'GET /api/game/heroes': async ({ account }) => {
      if (!account) throw new Refusal('Sign in first', 401);
      return { heroes: await authority.allCharacters(account.id) };
    },
    'POST /api/game/run/start': ({ account, body }) => authority.startRun(account.id, body),
    'POST /api/game/run/join': ({ account, body }) => authority.joinRun(account.id, body),
    'POST /api/game/run/end': ({ account, body }) => authority.endRun(account.id, body),
    'POST /api/game/kill': ({ account, body }) => authority.kill(account.id, body),
    'POST /api/game/party-kill': ({ account, body }) => authority.partyKill(account.id, body),
    'POST /api/game/take': ({ account, body }) => authority.take(account.id, body),
    'POST /api/game/drop': ({ account, body }) => authority.drop(account.id, body),
    'POST /api/game/ops': ({ account, body }) => authority.ops(account.id, body),
    'POST /api/game/npc': ({ account, body }) => authority.npc(account.id, body),
    'POST /api/game/shop': ({ account, body }) => authority.shop(account.id, body),
    'POST /api/game/buy': ({ account, body }) => authority.buy(account.id, body)
  };

  async function handler(req, res) {
    const path = pathOf(req);
    if (!path.startsWith('/api/account') && !path.startsWith('/api/game/')) return false;
    const ip = clientIp(req, trustProxy);
    const send = (status, body) => json(res, status, body);
    try {
      if (req.method !== 'GET') {
        if (!sameOrigin(req)) return send(403, { error: 'Cross-site request refused' }), true;
        if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) return send(415, { error: 'JSON only' }), true;
      }
      // Signing in and out.
      if (path === '/api/account/register' || path === '/api/account/login') {
        if (req.method !== 'POST') return send(405, { error: 'POST only' }), true;
        if (!limits.auth.take(ip)) return send(429, { error: 'Too many attempts — wait a minute' }), true;
        const body = await readJson(req, 4096);
        const agent = req.headers['user-agent'] ?? '';
        const result = path.endsWith('register') ? await accounts.register({ ...body, ip, agent }) : await accounts.login({ ...body, ip, agent });
        setCookie(req, res, result.token, result.maxAge);
        return send(200, { account: result.account, character: await db.serial(() => authority.view(result.account.id)) }), true;
      }
      if (path === '/api/account/logout') {
        await accounts.logout(cookieOf(req));
        setCookie(req, res, '', 0);
        return send(200, { ok: true }), true;
      }

      const route = routes[`${req.method} ${path}`];
      if (!route) return send(404, { error: 'unknown route' }), true;
      const account = await authenticate(req);
      if (path !== '/api/account/me' && !account) return send(401, { error: 'Sign in first' }), true;
      if (account && !(req.method === 'GET' ? limits.read : limits.game).take(`a${account.id}`)) return send(429, { error: 'Slow down' }), true;
      const body = req.method === 'POST' ? await readJson(req, 64 * 1024) : {};
      // One request at a time from here: the rules read a character, check it and write it back —
      // the character of this request's game.
      const query = queryOf(req);
      const result = await db.serial(async () => {
        const game = path.startsWith('/api/game/') ? await gameOf(body, query) : 'arena';
        return authority.inGame(game, async () => {
          if (account && req.method === 'POST' && path.startsWith('/api/game/')) {
            await authority.assertActive(account.id);
            await useClass(account.id, body.classId);
          }
          return route({ account, body, query, ip });
        });
      });
      return send(200, result), true;
    } catch (error) {
      if (error instanceof Violation) {
        const account = await authenticate(req);
        const blocked = account ? await db.serial(() => authority.strike(account.id, error.rule, error.detail)) : null;
        return send(blocked ? 403 : 409, { error: blocked ? `Blocked until ${new Date(blocked.until).toISOString().slice(0, 16).replace('T', ' ')} UTC: ${blocked.reason}` : 'Refused: ' + error.message, rule: error.rule, blocked, resync: true }), true;
      }
      if (error instanceof Refusal) return send(error.status, { error: error.message, blocked: error.blocked ?? null, resync: true }), true;
      if (/payload too large/.test(error.message)) return send(413, { error: 'Too large' }), true;
      if (/bad JSON/.test(error.message)) return send(400, { error: 'Bad JSON' }), true;
      log(`[game] ${req.method} ${path}: ${error.stack ?? error}`);
      return send(500, { error: 'Server error' }), true;
    }
  }

  return {
    keys,
    db,
    history,
    authority,
    accounts,
    handler,
    authenticate,
    /** The party server tells the rules who is in a party with whom. */
    setPartyCheck(fn) {
      sameParty = fn;
    },
    close() {
      return db.close();
    }
  };
}
