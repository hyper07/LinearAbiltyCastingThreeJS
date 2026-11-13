import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testDatabase } from './db.mjs';
import { createWork } from '../../server/work/index.js';
import { createMarket } from '../../server/market/index.js';
import { classify, isAbout, isSafe, shortName } from '../../src/work/news.js';
import { make, score } from '../../src/work/minigames.js';
import { evaluate, outcome, layoffRisk, salaryFor } from '../../src/work/roles.js';

const DAY = 86_400_000;

async function world() {
  const db = await testDatabase();
  const clock = { t: Date.parse('2026-11-12T15:00:00Z') };
  const now = () => clock.t;
  const ada = await db.one('INSERT INTO accounts (name, name_key, pass_hash, created) VALUES (?, ?, ?, ?) RETURNING id, name, plan', ['Ada', 'ada', 'x', 0]);
  const env = { WORK_NEWS_PROVIDER: 'fixture', WORK_AI: 'off', MARKET_PROVIDER: 'fixture', ADMIN_ACCOUNTS: 'siteadmin', ADMIN_PASSWORD: 'pw' };
  const work = createWork({ db, authenticate: async () => ada, env, now });
  return { db, clock, ada, work, env, now };
}

/** The best answer to an open mission, read from the server's own record (what a perfect player would do). */
async function bestAnswer(db, id) {
  const m = await db.one('SELECT kind, secret, public FROM work_missions WHERE id = ?', [id]);
  if (m.kind === 'choice') return { option: m.secret.qualities.indexOf(3) };
  if (m.secret.game === 'triage') return { order: m.secret.order };
  if (m.secret.game === 'spot-error') return { rows: m.secret.wrong };
  return { value: m.secret.answer };
}

test('reading the news: kind, family-safe, about the company', () => {
  assert.equal(classify('Acme to cut 1,200 jobs in restructuring'), 'layoffs');
  assert.equal(classify('Acme beats estimates as record revenue lifts shares'), 'earnings-beat');
  assert.equal(classify('Acme unveils a new phone'), 'product');
  assert.equal(isSafe('Senator criticizes Acme'), false);
  assert.equal(isSafe('Acme opens new office in Austin'), true);
  assert.equal(shortName('Apple Inc.'), 'Apple');
  const apple = { symbol: 'AAPL', name: 'Apple Inc.' };
  assert.equal(isAbout({ symbols: ['AAPL'], headline: 'x' }, apple), true);
  assert.equal(isAbout({ symbols: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOG'], headline: 'Big tech rallies' }, apple), false, 'one of many tags is not about it');
  assert.equal(isAbout({ symbols: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOG'], headline: 'Apple shows a new laptop' }, apple), true);
});

test('mini-games are scored on the server: right answers 100, wrong ones less', () => {
  for (const kind of ['triage', 'spot-error', 'estimate']) {
    const g = make(kind, 'seed-1', 'support');
    const right = kind === 'triage' ? { order: g.secret.order } : kind === 'spot-error' ? { rows: g.secret.wrong } : { value: g.secret.answer };
    assert.equal(score(kind, g.secret, right), 100, kind);
    assert.ok(score(kind, g.secret, {}) < 50, kind);
    assert.ok(!JSON.stringify(g.public).includes('"order"') && !JSON.stringify(g.public).includes('"wrong"') && !JSON.stringify(g.public).includes('"answer"'), `${kind}: no answer in what the browser gets`);
  }
});

test('the year: evaluation, raise, promotion, warnings', () => {
  assert.equal(evaluate([{ status: 'done', score: 100 }, { status: 'done', score: 90 }]).rating, 'exceeds');
  assert.equal(evaluate([{ status: 'done', score: 100 }, { status: 'missed', score: 0 }]).rating, 'below');
  assert.deepEqual(outcome({ rating: 'exceeds', performance: 90, previous: 'exceeds', warnings: 0, level: 1 }).promote, true);
  assert.equal(outcome({ rating: 'below', performance: 50, previous: 'below', warnings: 1, level: 1 }).letGo, true);
  assert.ok(layoffRisk({ performance: 95, years: 2 }) < layoffRisk({ performance: 40, years: 0 }));
});

test('a career: apply, hired, a day of missions, pay, a year\'s review, a layoff', async () => {
  const { db, clock, ada, work, env, now } = await world();
  try {
    const list = await work.companies();
    assert.equal(list.companies.length, 500, 'the S&P 500 list, one entry per company');

    // A layoff story stops hiring for a week: find a company that is hiring.
    let app = null;
    for (const symbol of ['AAPL', 'MSFT', 'KO', 'NKE', 'COST', 'PEP', 'DIS', 'HD']) {
      try {
        app = await work.apply(ada, { symbol, role: 'engineer' });
        break;
      } catch (error) {
        assert.match(error.message, /not hiring/);
      }
    }
    assert.ok(app, 'some company is hiring');
    assert.equal(app.questions.length, 3);
    const stored = await db.one('SELECT questions FROM work_applications WHERE id = ?', [app.application]);
    const hire = await work.interview(ada, { application: app.application, answers: stored.questions.map((q) => q.qualities.indexOf(3)) });
    assert.equal(hire.hired, true);
    assert.equal(hire.title, 'Associate Software engineer', 'a perfect interview: Associate');
    await assert.rejects(work.apply(ada, { symbol: 'MSFT', role: 'sales' }), /already have a job/);

    let view = await work.today(ada);
    assert.ok(view.missions.length >= 2 && view.missions.length <= 3, `${view.missions.length} missions`);
    assert.ok(view.missions.some((m) => m.kind === 'minigame'));
    assert.ok(view.missions.every((m) => !('secret' in m)), 'the browser never gets the answers');

    // Do the day's work perfectly: paid once for the day.
    let paid = 0;
    for (const m of view.missions) {
      const r = await work.mission(ada, { id: m.id, answer: await bestAnswer(db, m.id) });
      assert.equal(r.score, 100, m.kind);
      paid += r.paid;
    }
    assert.equal(paid, Math.round(salaryFor('engineer', 2) / 28), 'a day\'s pay, once');
    assert.equal((await work.wallet.balance(ada.id)) > 0, true);

    // Four weeks of perfect days → the year's review: exceeds, a raise, a bonus.
    for (let d = 1; d <= 28; d++) {
      clock.t += DAY;
      view = await work.today(ada);
      if (!view.job) break;
      for (const m of view.missions.filter((x) => x.status === 'open')) await work.mission(ada, { id: m.id, answer: await bestAnswer(db, m.id) });
    }
    const review = await db.one("SELECT data FROM work_events WHERE account_id = ? AND kind = 'review' ORDER BY id LIMIT 1", [ada.id]);
    const laidOff = await db.one("SELECT data FROM work_events WHERE account_id = ? AND kind = 'laid-off'", [ada.id]);
    assert.ok(review || laidOff, 'a review came, unless a layoff came first');
    if (review) {
      assert.equal(review.data.rating, 'exceeds');
      assert.ok(review.data.salary > salaryFor('engineer', 2), 'a raise');
    }
    const kept = await db.many("SELECT kind FROM work_events WHERE account_id = ? AND kind IN ('kept-job', 'laid-off')", [ada.id]);
    assert.ok(kept.length >= 1, 'the made-up news brought a layoff story, and its outcome was recorded');

    // The wallet into the stock game: it counts as money put in.
    const market = createMarket({ db, authenticate: async () => ada, env, now });
    await market.ready;
    await db.serial(() => market.startRun(ada));
    const before = await market.state(ada);
    const balance = await work.wallet.balance(ada.id);
    const moved = Math.min(balance, 500_000);
    const handler = market.handler;
    const res = await new Promise((resolve) => {
      const r = { statusCode: 0, setHeader() {}, writeHead(c) { this.statusCode = c; }, end(b) { resolve({ status: this.statusCode, body: JSON.parse(b) }); } };
      const req = Object.assign(require_stream(JSON.stringify({ amount: moved })), { method: 'POST', url: '/api/market/deposit', headers: { host: 'x', 'content-type': 'application/json' }, socket: {} });
      handler(req, r);
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.state.run.cash, before.run.cash + moved);
    assert.equal(res.body.state.run.deposits, moved);
    assert.equal(await work.wallet.balance(ada.id), balance - moved);
    market.stop();
  } finally {
    work.stop();
    await db.close();
  }
});

/** A request body as a readable stream, as node's http gives it. */
import { Readable } from 'node:stream';
function require_stream(text) {
  return Readable.from([Buffer.from(text)]);
}
