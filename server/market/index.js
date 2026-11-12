import { RateLimiter, clientIp, json, pathOf, queryOf, readJson } from '../api/http.js';
import { BENCHMARK, START_CASH, STARTER_TICKERS, SYMBOL } from '../../src/market/tickers.js';
import { investorPattern } from '../../src/market/patterns.js';
import { marketProvider } from './providers.js';

/**
 * The stock market game: a year of real daily prices, replayed one trading
 * day at a time — each player at their own pace, from 1,000,000 in game money.
 *
 *   GET  /api/market/state           your run (or none), today's quotes, admin flag
 *   POST /api/market/run             start a run ({ restart: true } abandons the current one)
 *   POST /api/market/next            move on { days: 1–20 }; past the last day the run finishes
 *   POST /api/market/trade           { symbol, side: buy|sell, qty } at today's close
 *   GET  /api/market/bars?symbol=    a stock's bars up to YOUR day — never later
 *   GET  /api/market/history         your run's net worth by day, and your trades
 *   GET  /api/market/profile         your investing pattern (src/market/patterns.js)
 *   GET  /api/market/leaderboard     players by net worth (each one's latest run)
 *
 *   The admin dashboard (accounts named in ADMIN_ACCOUNTS):
 *   GET    /api/market/admin                   tickers and their data, the provider, every player
 *   GET    /api/market/admin/player?account=   one player's portfolio, pattern and trades
 *   POST   /api/market/admin/tickers           add { symbol, name?, sector? } and fetch its year
 *   POST   /api/market/admin/ticker            { symbol, enabled }
 *   DELETE /api/market/admin/ticker?symbol=    remove a ticker and its prices
 *   POST   /api/market/admin/refresh           fetch every ticker's year again
 *
 * The server holds the prices and every run: a trade is priced from its own
 * bars at the run's day, and a browser can only ask for bars up to that day.
 * Writes go one at a time (db.serial). Money is integer cents.
 *
 * @param {{ db, authenticate: (req) => Promise<object|null>, env?: object, log?: (line: string) => void, now?: () => number }} options
 */
export function createMarket({ db, authenticate, env = process.env, log = () => {}, now = () => Date.now() }) {
  const provider = marketProvider(env);
  const admins = new Set(String(env.ADMIN_ACCOUNTS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  const isAdmin = (account) => Boolean(account && admins.has(String(account.name).toLowerCase()));
  const limits = { read: new RateLimiter(600, { burst: 120 }), write: new RateLimiter(300, { burst: 60 }), admin: new RateLimiter(60, { burst: 20 }) };
  const YEAR_DAYS = 252;
  const START_CENTS = START_CASH * 100;

  /* ---- prices, cached in memory: a year of daily bars is small ---- */

  let series = null; // symbol → { days: string[], closes: number[] }
  async function load() {
    if (series) return series;
    const rows = await db.many('SELECT symbol, day, close FROM market_bars ORDER BY symbol, day');
    const map = new Map();
    for (const r of rows) {
      let s = map.get(r.symbol);
      if (!s) map.set(r.symbol, (s = { days: [], closes: [] }));
      s.days.push(r.day);
      s.closes.push(r.close);
    }
    series = map;
    return map;
  }
  /** The close on `day` or the last trading day before it (dollars), or null. */
  const closeOn = (s, day) => {
    if (!s || !s.days.length || s.days[0] > day) return null;
    let lo = 0;
    let hi = s.days.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s.days[mid] <= day) lo = mid;
      else hi = mid - 1;
    }
    return s.closes[lo];
  };
  const tradedOn = (s, day) => Boolean(s && s.days.includes(day));
  const cents = (dollars) => Math.round(dollars * 100);

  async function tickers({ enabledOnly = true } = {}) {
    return db.many(`SELECT symbol, name, sector, enabled, benchmark, fetched, fetch_error FROM market_tickers ${enabledOnly ? 'WHERE enabled' : ''} ORDER BY benchmark DESC, symbol`);
  }

  /** The year to replay: the benchmark's last YEAR_DAYS trading days (or every stock's, without one). */
  async function calendar() {
    const map = await load();
    let days = map.get(BENCHMARK.symbol)?.days;
    if (!days?.length) days = [...new Set([...map.values()].flatMap((s) => s.days))].sort();
    return days.slice(-YEAR_DAYS);
  }

  /* ---- fetching ---- */

  async function seed() {
    const count = await db.one('SELECT COUNT(*)::int AS n FROM market_tickers');
    if (count.n) return;
    const at = now();
    await db.tx(async () => {
      await db.run('INSERT INTO market_tickers (symbol, name, sector, benchmark, added) VALUES (?, ?, ?, TRUE, ?)', [BENCHMARK.symbol, BENCHMARK.name, BENCHMARK.sector, at]);
      for (const t of STARTER_TICKERS) await db.run('INSERT INTO market_tickers (symbol, name, sector, added) VALUES (?, ?, ?, ?)', [t.symbol, t.name, t.sector, at]);
    });
    log(`[market] seeded ${STARTER_TICKERS.length + 1} tickers`);
  }

  /** Fetch a year (and a little) of bars for these symbols (default: all) and store them. */
  async function refresh(symbols = null) {
    if (!provider.ready) throw Object.assign(new Error(provider.why), { status: 503 });
    const list = symbols ?? (await tickers({ enabledOnly: false })).map((t) => t.symbol);
    const to = new Date(now()).toISOString().slice(0, 10);
    const from = new Date(now() - 380 * 86400_000).toISOString().slice(0, 10);
    const got = { symbols: 0, bars: 0, errors: [] };
    for (let i = 0; i < list.length; i += 50) {
      const chunk = list.slice(i, i + 50);
      let bars;
      try {
        bars = await provider.bars(chunk, from, to);
      } catch (error) {
        got.errors.push(`${chunk.join(',')}: ${error.message}`);
        await db.serial(() => db.run(`UPDATE market_tickers SET fetch_error = ? WHERE symbol IN (${chunk.map(() => '?').join(',')})`, [error.message.slice(0, 200), ...chunk]));
        continue;
      }
      await db.serial(() =>
        db.tx(async () => {
          for (const symbol of chunk) {
            const rows = bars.get(symbol) ?? [];
            for (let j = 0; j < rows.length; j += 200) {
              const part = rows.slice(j, j + 200);
              await db.run(
                `INSERT INTO market_bars (symbol, day, open, high, low, close, volume) VALUES ${part.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}
                 ON CONFLICT (symbol, day) DO UPDATE SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close, volume = EXCLUDED.volume`,
                part.flatMap((b) => [symbol, b.day, b.open, b.high, b.low, b.close, b.volume])
              );
            }
            await db.run('UPDATE market_tickers SET fetched = ?, fetch_error = ? WHERE symbol = ?', [now(), rows.length ? null : 'no prices returned', symbol]);
            got.symbols += rows.length ? 1 : 0;
            got.bars += rows.length;
          }
        })
      );
    }
    series = null;
    log(`[market] fetched ${got.bars} bars for ${got.symbols} symbols${got.errors.length ? `; ${got.errors.length} failed` : ''}`);
    return got;
  }

  /** On start and every few hours: seed the list, and fetch when prices are missing or a day old. */
  let refreshing = null;
  async function keepFresh() {
    await db.serial(() => seed());
    if (!provider.ready || refreshing) return;
    const stale = await db.one('SELECT COUNT(*)::int AS n FROM market_tickers WHERE fetched IS NULL OR fetched < ?', [now() - 20 * 3600_000]);
    if (!stale.n) return;
    refreshing = refresh().catch((error) => log(`[market] refresh failed: ${error.message}`)).finally(() => (refreshing = null));
    await refreshing;
  }
  const ready = keepFresh().catch((error) => log(`[market] ${error.message}`));
  const timer = setInterval(() => keepFresh().catch(() => {}), 6 * 3600_000);
  timer.unref?.();

  /* ---- runs ---- */

  const activeRun = (accountId) => db.one("SELECT * FROM market_runs WHERE account_id = ? AND status = 'active'", [accountId]);
  const latestRun = (accountId) => db.one('SELECT * FROM market_runs WHERE account_id = ? ORDER BY started DESC LIMIT 1', [accountId]);
  const holdingsOf = (runId) => db.many('SELECT symbol, qty, cost, opened_index FROM market_holdings WHERE run_id = ? ORDER BY symbol', [runId]);

  async function valueAt(run, holdings, index) {
    const map = await load();
    const day = run.days[index];
    let value = Number(run.cash);
    for (const h of holdings) value += Number(h.qty) * cents(closeOn(map.get(h.symbol), day) ?? 0);
    return value;
  }

  async function snapshot(run, index) {
    const holdings = await holdingsOf(run.id);
    const value = await valueAt(run, holdings, index);
    await db.run(
      `INSERT INTO market_snapshots (run_id, day_index, cash, value, holdings) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (run_id, day_index) DO UPDATE SET cash = EXCLUDED.cash, value = EXCLUDED.value, holdings = EXCLUDED.holdings`,
      [run.id, index, run.cash, value, JSON.stringify(Object.fromEntries(holdings.map((h) => [h.symbol, Number(h.qty)])))]
    );
    return value;
  }

  async function startRun(account, { restart = false } = {}) {
    const current = await activeRun(account.id);
    if (current && !restart) return current;
    const days = await calendar();
    if (days.length < 20) throw refusal(provider.ready ? 'The market data is still loading — try again in a minute.' : 'No market data yet: the admin needs to add the data keys.', 503);
    const at = now();
    return db.tx(async () => {
      if (current) await db.run("UPDATE market_runs SET status = 'abandoned', updated = ? WHERE id = ?", [at, current.id]);
      const run = await db.one(
        "INSERT INTO market_runs (account_id, days, day_index, start_cash, cash, status, started, updated) VALUES (?, ?, 0, ?, ?, 'active', ?, ?) RETURNING *",
        [account.id, JSON.stringify(days), START_CENTS, START_CENTS, at, at]
      );
      await snapshot(run, 0);
      return run;
    });
  }

  async function next(account, { days = 1 } = {}) {
    let run = await activeRun(account.id);
    if (!run) throw refusal('Start a run first', 409);
    const steps = Math.max(1, Math.min(20, Math.floor(Number(days) || 1)));
    return db.tx(async () => {
      const last = run.days.length - 1;
      let index = run.day_index;
      for (let i = 0; i < steps && index < last; i++) {
        index++;
        await snapshot({ ...run, day_index: index }, index);
      }
      if (index === run.day_index && index === last) {
        // Already on the last day: moving on ends the year.
        const value = await valueAt(run, await holdingsOf(run.id), last);
        await db.run("UPDATE market_runs SET status = 'finished', final_value = ?, updated = ? WHERE id = ?", [value, now(), run.id]);
        return { finished: true, value };
      }
      await db.run('UPDATE market_runs SET day_index = ?, updated = ? WHERE id = ?', [index, now(), run.id]);
      return { finished: false, dayIndex: index };
    });
  }

  async function trade(account, body) {
    const run = await activeRun(account.id);
    if (!run) throw refusal('Start a run first', 409);
    const symbol = String(body?.symbol ?? '').toUpperCase();
    const side = body?.side === 'sell' ? 'sell' : body?.side === 'buy' ? 'buy' : null;
    const qty = Math.floor(Number(body?.qty));
    if (!SYMBOL.test(symbol) || !side) throw refusal('Say which stock, and buy or sell', 400);
    if (!(qty >= 1 && qty <= 10_000_000)) throw refusal('Trade a whole number of shares', 400);
    const ticker = await db.one('SELECT symbol FROM market_tickers WHERE symbol = ? AND enabled', [symbol]);
    if (!ticker) throw refusal(`${symbol} is not in the game`, 404);
    const map = await load();
    const day = run.days[run.day_index];
    if (!tradedOn(map.get(symbol), day)) throw refusal(`${symbol} did not trade on ${day}`, 409);
    const price = cents(closeOn(map.get(symbol), day));
    return db.tx(async () => {
      const held = await db.one('SELECT qty, cost FROM market_holdings WHERE run_id = ? AND symbol = ?', [run.id, symbol]);
      let cash = Number(run.cash);
      if (side === 'buy') {
        const cost = qty * price;
        if (cost > cash) throw refusal(`Not enough cash: ${qty} × ${money(price)} is ${money(cost)}, and you have ${money(cash)}`, 409);
        cash -= cost;
        if (held) await db.run('UPDATE market_holdings SET qty = qty + ?, cost = cost + ? WHERE run_id = ? AND symbol = ?', [qty, cost, run.id, symbol]);
        else await db.run('INSERT INTO market_holdings (run_id, symbol, qty, cost, opened_index) VALUES (?, ?, ?, ?, ?)', [run.id, symbol, qty, cost, run.day_index]);
      } else {
        const have = Number(held?.qty ?? 0);
        if (qty > have) throw refusal(`You have ${have} ${symbol}`, 409);
        cash += qty * price;
        if (qty === have) await db.run('DELETE FROM market_holdings WHERE run_id = ? AND symbol = ?', [run.id, symbol]);
        else await db.run('UPDATE market_holdings SET qty = qty - ?, cost = cost - ? WHERE run_id = ? AND symbol = ?', [qty, Math.round((Number(held.cost) * qty) / have), run.id, symbol]);
      }
      await db.run('UPDATE market_runs SET cash = ?, updated = ? WHERE id = ?', [cash, now(), run.id]);
      await db.run(
        'INSERT INTO market_trades (run_id, account_id, day_index, day, symbol, side, qty, price, cash_after, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [run.id, account.id, run.day_index, day, symbol, side, qty, price, cash, now()]
      );
      await snapshot({ ...run, cash }, run.day_index);
      return { ok: true, symbol, side, qty, price, cash };
    });
  }

  /* ---- what a player sees ---- */

  async function state(account) {
    const run = account ? await activeRun(account.id) : null;
    const list = await tickers();
    const map = await load();
    const base = { provider: { id: provider.id, ready: provider.ready }, startCash: START_CENTS, admin: isAdmin(account), tickers: list.length };
    if (!run) {
      const last = account ? await latestRun(account.id) : null;
      return { ...base, run: null, last: last && last.status === 'finished' ? { finalValue: Number(last.final_value), startCash: Number(last.start_cash) } : null };
    }
    const day = run.days[run.day_index];
    const prevDay = run.day_index > 0 ? run.days[run.day_index - 1] : null;
    const holdings = new Map((await holdingsOf(run.id)).map((h) => [h.symbol, h]));
    const quotes = list.map((t) => {
      const s = map.get(t.symbol);
      const close = closeOn(s, day);
      const prev = prevDay ? closeOn(s, prevDay) : null;
      const h = holdings.get(t.symbol);
      return {
        symbol: t.symbol,
        name: t.name,
        sector: t.sector,
        benchmark: t.benchmark,
        price: close == null ? null : cents(close),
        change: close != null && prev ? close / prev - 1 : null,
        tradable: tradedOn(s, day),
        qty: h ? Number(h.qty) : 0,
        cost: h ? Number(h.cost) : 0
      };
    });
    const value = await valueAt(run, [...holdings.values()], run.day_index);
    return {
      ...base,
      run: { id: Number(run.id), dayIndex: run.day_index, days: run.days.length, day, first: run.days[0], last: run.days.at(-1), cash: Number(run.cash), value, startCash: Number(run.start_cash) },
      quotes
    };
  }

  async function bars(account, symbol) {
    const run = await activeRun(account.id);
    if (!run) throw refusal('Start a run first', 409);
    const s = (await load()).get(String(symbol ?? '').toUpperCase());
    if (!s) throw refusal('No prices for that stock', 404);
    const until = run.days[run.day_index];
    const from = run.days[0];
    const rows = await db.many('SELECT day, open, high, low, close, volume FROM market_bars WHERE symbol = ? AND day >= ? AND day <= ? ORDER BY day', [String(symbol).toUpperCase(), from, until]);
    return { symbol: String(symbol).toUpperCase(), bars: rows };
  }

  async function history(runId) {
    const snaps = await db.many('SELECT day_index, cash, value, holdings FROM market_snapshots WHERE run_id = ? ORDER BY day_index', [runId]);
    const trades = await db.many('SELECT day_index, day, symbol, side, qty, price, cash_after, at FROM market_trades WHERE run_id = ? ORDER BY id', [runId]);
    return {
      snapshots: snaps.map((s) => ({ dayIndex: s.day_index, cash: Number(s.cash), value: Number(s.value), holdings: s.holdings })),
      trades: trades.map((t) => ({ ...t, qty: Number(t.qty), price: Number(t.price), cash_after: Number(t.cash_after), at: Number(t.at) }))
    };
  }

  async function patternOf(run) {
    if (!run) return null;
    const map = await load();
    const sectors = new Map((await tickers({ enabledOnly: false })).map((t) => [t.symbol, t.sector || 'Other']));
    const h = await history(run.id);
    const index = run.status === 'active' ? run.day_index : run.days.length - 1;
    const pattern = investorPattern({
      trades: h.trades.map((t) => ({ day_index: t.day_index, symbol: t.symbol, side: t.side, qty: t.qty, price: t.price })),
      snapshots: h.snapshots.map((s) => ({ day_index: s.dayIndex, cash: s.cash, value: s.value, holdings: s.holdings })),
      closeOf: (symbol, i) => closeOn(map.get(symbol), run.days[Math.max(0, Math.min(run.days.length - 1, i))]),
      sectorOf: (symbol) => sectors.get(symbol) ?? 'Other',
      startCash: Number(run.start_cash),
      dayIndex: index,
      benchmark: BENCHMARK.symbol
    });
    return { run: { id: Number(run.id), status: run.status, dayIndex: index, days: run.days.length }, ...pattern, ...h };
  }

  /** Each player's latest run (active or finished), by net worth. */
  async function leaderboard(limit = 100) {
    const rows = await db.many(
      `SELECT DISTINCT ON (r.account_id) r.id, r.account_id, a.name, r.status, r.day_index, jsonb_array_length(r.days) AS days, r.start_cash, r.final_value,
              (SELECT s.value FROM market_snapshots s WHERE s.run_id = r.id ORDER BY s.day_index DESC LIMIT 1) AS value,
              (SELECT COUNT(*) FROM market_trades t WHERE t.run_id = r.id)::int AS trades
         FROM market_runs r JOIN accounts a ON a.id = r.account_id
        WHERE r.status IN ('active', 'finished')
        ORDER BY r.account_id, r.started DESC`
    );
    return rows
      .map((r) => {
        const value = Number(r.status === 'finished' ? r.final_value : r.value ?? r.start_cash);
        return { accountId: Number(r.account_id), name: r.name, status: r.status, dayIndex: r.day_index, days: r.days, value, return: value / Number(r.start_cash) - 1, trades: r.trades };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, ...r }));
  }

  /* ---- the admin dashboard ---- */

  async function adminView() {
    const list = await db.many(
      `SELECT t.symbol, t.name, t.sector, t.enabled, t.benchmark, t.added, t.fetched, t.fetch_error,
              COUNT(b.day)::int AS bars, MIN(b.day) AS first_day, MAX(b.day) AS last_day
         FROM market_tickers t LEFT JOIN market_bars b ON b.symbol = t.symbol
        GROUP BY t.symbol ORDER BY t.benchmark DESC, t.symbol`
    );
    const players = await leaderboard(500);
    const withTags = [];
    for (const p of players) {
      const run = await db.one('SELECT * FROM market_runs WHERE id = (SELECT id FROM market_runs WHERE account_id = ? ORDER BY started DESC LIMIT 1)', [p.accountId]);
      const pattern = await patternOf(run);
      withTags.push({ ...p, tags: pattern?.tags ?? [], metrics: pattern?.metrics ?? null });
    }
    return {
      provider: { id: provider.id, ready: provider.ready, why: provider.why ?? null, refreshing: Boolean(refreshing) },
      tickers: list.map((t) => ({ ...t, added: Number(t.added), fetched: t.fetched == null ? null : Number(t.fetched) })),
      players: withTags,
      calendar: await calendar().then((d) => ({ days: d.length, first: d[0] ?? null, last: d.at(-1) ?? null }))
    };
  }

  async function addTicker({ symbol, name, sector }) {
    const s = String(symbol ?? '').trim().toUpperCase();
    if (!SYMBOL.test(s)) throw refusal('That does not look like a ticker symbol', 400);
    const asset = await provider.asset?.(s).catch(() => null);
    await db.serial(() =>
      db.run(
        `INSERT INTO market_tickers (symbol, name, sector, added) VALUES (?, ?, ?, ?)
         ON CONFLICT (symbol) DO UPDATE SET enabled = TRUE, name = COALESCE(NULLIF(EXCLUDED.name, ''), market_tickers.name), sector = COALESCE(NULLIF(EXCLUDED.sector, ''), market_tickers.sector)`,
        [s, String(name ?? '').slice(0, 80) || asset?.name || '', String(sector ?? '').slice(0, 40), now()]
      )
    );
    const got = provider.ready ? await refresh([s]) : { symbols: 0, bars: 0, errors: [provider.why] };
    return { symbol: s, fetched: got };
  }

  /* ---- HTTP ---- */

  const routes = {
    'GET /api/market/state': ({ account }) => state(account),
    'POST /api/market/run': ({ account, body }) => db.serial(() => startRun(account, body)).then(() => state(account)),
    'POST /api/market/next': ({ account, body }) => db.serial(() => next(account, body)).then(async (r) => ({ ...r, state: await state(account) })),
    'POST /api/market/trade': ({ account, body }) => db.serial(() => trade(account, body)).then(async (r) => ({ ...r, state: await state(account) })),
    'GET /api/market/bars': ({ account, query }) => bars(account, query.get('symbol')),
    'GET /api/market/history': async ({ account }) => {
      const run = (await activeRun(account.id)) ?? (await latestRun(account.id));
      return run ? history(run.id) : { snapshots: [], trades: [] };
    },
    'GET /api/market/profile': async ({ account }) => ({ pattern: await patternOf((await activeRun(account.id)) ?? (await latestRun(account.id))) }),
    'GET /api/market/leaderboard': async () => ({ players: await leaderboard(100) }),
    'GET /api/market/admin': () => adminView(),
    'GET /api/market/admin/player': async ({ query }) => {
      const id = Number(query.get('account'));
      const run = await latestRun(id);
      const who = await db.one('SELECT id, name FROM accounts WHERE id = ?', [id]);
      if (!who) throw refusal('No such player', 404);
      return { player: { id: Number(who.id), name: who.name }, pattern: await patternOf(run), holdings: run ? await holdingsOf(run.id) : [] };
    },
    'POST /api/market/admin/tickers': ({ body }) => addTicker(body ?? {}),
    'POST /api/market/admin/ticker': async ({ body }) => {
      const s = String(body?.symbol ?? '').toUpperCase();
      const r = await db.serial(() => db.run('UPDATE market_tickers SET enabled = ? WHERE symbol = ?', [Boolean(body?.enabled), s]));
      if (!r.rowCount) throw refusal('No such ticker', 404);
      return { ok: true };
    },
    'DELETE /api/market/admin/ticker': async ({ query }) => {
      const s = String(query.get('symbol') ?? '').toUpperCase();
      const r = await db.serial(() => db.run('DELETE FROM market_tickers WHERE symbol = ? AND NOT benchmark', [s]));
      if (!r.rowCount) throw refusal('No such ticker (the benchmark stays)', 404);
      series = null;
      return { ok: true };
    },
    'POST /api/market/admin/refresh': () => refresh()
  };

  async function handler(req, res) {
    const path = pathOf(req);
    if (!path.startsWith('/api/market/')) return false;
    const send = (status, body) => json(res, status, body);
    try {
      const route = routes[`${req.method} ${path}`];
      if (!route) return send(404, { error: 'unknown route' }), true;
      if (req.method !== 'GET') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return send(403, { error: 'Cross-site request refused' }), true;
        if (req.method === 'POST' && !String(req.headers['content-type'] ?? '').startsWith('application/json')) return send(415, { error: 'JSON only' }), true;
      }
      const account = await authenticate(req);
      const open = path === '/api/market/state' || path === '/api/market/leaderboard';
      if (!account && !open) return send(401, { error: 'Sign in to play the stock game' }), true;
      if (account?.blockedUntil > now()) return send(403, { error: `Blocked: ${account.blockReason ?? ''}` }), true;
      const adminRoute = path.startsWith('/api/market/admin');
      if (adminRoute && !isAdmin(account)) return send(403, { error: 'Admins only (ADMIN_ACCOUNTS)' }), true;
      const limiter = adminRoute ? limits.admin : req.method === 'GET' ? limits.read : limits.write;
      if (!limiter.take(account ? `a${account.id}` : clientIp(req))) return send(429, { error: 'Slow down' }), true;
      await ready;
      const body = req.method === 'POST' ? await readJson(req, 16 * 1024) : {};
      return send(200, await route({ account, body, query: queryOf(req) })), true;
    } catch (error) {
      if (error.status) return send(error.status, { error: error.message }), true;
      if (/bad JSON/.test(error.message)) return send(400, { error: 'Bad JSON' }), true;
      log(`[market] ${req.method} ${path}: ${error.stack ?? error}`);
      return send(500, { error: 'Server error' }), true;
    }
  }

  return { handler, refresh, ready, provider, stop: () => clearInterval(timer), leaderboard, state, startRun, next, trade, patternOf };
}

const refusal = (message, status) => Object.assign(new Error(message), { status });
const money = (c) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
