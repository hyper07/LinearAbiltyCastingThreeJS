import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase } from './db.mjs';
import { createMarket } from '../../server/market/index.js';
import { investorPattern } from '../../src/market/patterns.js';

/** A market on a fresh database, made-up prices, two players. */
async function world() {
  const db = await testDatabase();
  const add = async (name) => (await db.one('INSERT INTO accounts (name, name_key, pass_hash, created) VALUES (?, ?, ?, ?) RETURNING id, name', [name, name.toLowerCase(), 'x', 0]));
  const ada = await add('Ada');
  const bo = await add('Bo');
  const market = createMarket({ db, authenticate: async () => null, env: { MARKET_PROVIDER: 'fixture', ADMIN_ACCOUNTS: 'Ada' }, now: () => Date.parse('2026-11-12T20:00:00Z') });
  await market.ready;
  return { db, market, ada, bo };
}

test('a run: a million to start, trades at the day\'s close, a year to the end', async () => {
  const { db, market, ada } = await world();
  try {
    await db.serial(() => market.startRun(ada));
    let s = await market.state(ada);
    assert.equal(s.run.cash, 100_000_000, 'a million dollars, in cents');
    assert.equal(s.run.dayIndex, 0);
    assert.equal(s.run.days, 252, 'a year of trading days');
    assert.ok(s.quotes.length >= 51 && s.quotes.find((q) => q.symbol === 'SPY').benchmark);

    const aapl = s.quotes.find((q) => q.symbol === 'AAPL');
    const r = await db.serial(() => market.trade(ada, { symbol: 'AAPL', side: 'buy', qty: 100 }));
    assert.equal(r.price, aapl.price, 'priced at today\'s close, by the server');
    assert.equal(r.cash, 100_000_000 - 100 * aapl.price);
    await assert.rejects(db.serial(() => market.trade(ada, { symbol: 'AAPL', side: 'sell', qty: 101 })), /You have 100/);
    await assert.rejects(db.serial(() => market.trade(ada, { symbol: 'NVDA', side: 'buy', qty: 9_999_999 })), /Not enough cash/);
    await assert.rejects(db.serial(() => market.trade(ada, { symbol: 'NOPE', side: 'buy', qty: 1 })), /not in the game/);

    await db.serial(() => market.next(ada, { days: 5 }));
    s = await market.state(ada);
    assert.equal(s.run.dayIndex, 5);
    const later = s.quotes.find((q) => q.symbol === 'AAPL').price;
    assert.equal(s.run.value, s.run.cash + 100 * later, 'net worth = cash + shares at today\'s close');

    // To the end of the year: moving on from the last day finishes the run.
    let end = null;
    for (let i = 0; i < 40 && !end?.finished; i++) end = await db.serial(() => market.next(ada, { days: 20 }));
    assert.equal(end.finished, true);
    await assert.rejects(db.serial(() => market.next(ada, { days: 1 })), /Start a run first/);
    assert.equal((await market.state(ada)).run, null);
    const board = await market.leaderboard();
    assert.equal(board[0].name, 'Ada');
    assert.equal(board[0].status, 'finished');
  } finally {
    market.stop();
    await db.close();
  }
});

test('nobody sees tomorrow: bars stop at the player\'s own day', async () => {
  const { db, market, ada, bo } = await world();
  try {
    await db.serial(() => market.startRun(ada));
    await db.serial(() => market.startRun(bo));
    await db.serial(() => market.next(bo, { days: 20 }));
    const handler = market.handler;
    // Through the route, as the browser would ask.
    const ask = async (account, url) => {
      const m = createMarket({ db, authenticate: async () => account, env: { MARKET_PROVIDER: 'fixture' } });
      await m.ready;
      const out = await new Promise((resolve) => {
        const res = { statusCode: 0, headers: {}, setHeader() {}, writeHead(code) { this.statusCode = code; }, end(body) { resolve({ status: this.statusCode, body: JSON.parse(body) }); } };
        m.handler({ method: 'GET', url, headers: { host: 'x' } }, res);
      });
      m.stop();
      return out;
    };
    const a = await ask(ada, '/api/market/bars?symbol=MSFT');
    const b = await ask(bo, '/api/market/bars?symbol=MSFT');
    assert.equal(a.body.bars.length, 1, 'day 0: one bar');
    assert.equal(b.body.bars.length, 21, 'day 20: twenty-one bars');
    assert.equal(typeof handler, 'function');
    const admin = await ask(bo, '/api/market/admin');
    assert.equal(admin.status, 403, 'the dashboard is for admins only');
  } finally {
    market.stop();
    await db.close();
  }
});

test('the pattern: holding time, dips, concentration, the market', () => {
  const closes = { AAA: [10, 9, 9.5, 8, 12, 13, 14], SPY: [100, 100, 101, 102, 103, 104, 105] };
  const closeOf = (s, i) => closes[s]?.[Math.min(i, 6)] ?? null;
  const trades = [
    { day_index: 1, symbol: 'AAA', side: 'buy', qty: 100, price: 900 },
    { day_index: 3, symbol: 'AAA', side: 'buy', qty: 100, price: 800 },
    { day_index: 6, symbol: 'AAA', side: 'sell', qty: 50, price: 1400 }
  ];
  const snapshots = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ day_index: i, cash: 100000, value: 100000 + (i >= 1 ? 100 * closes.AAA[i] * 100 : 0), holdings: { AAA: i >= 3 ? 150 : 100 } }));
  const p = investorPattern({ trades, snapshots, closeOf, startCash: 100000, dayIndex: 6 });
  assert.equal(p.metrics.trades, 3);
  assert.equal(p.metrics.dipBuyShare, 1, 'both buys came on a down day');
  assert.equal(p.metrics.winRate, 1);
  assert.equal(p.metrics.topHoldingShare, 1);
  assert.ok(p.tags.some((t) => t.id === 'all-in'));
  assert.ok(p.metrics.marketReturn > 0);
});
