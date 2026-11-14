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
  const env = { WORK_SPEED: '1', WORK_NEWS_PROVIDER: 'fixture', WORK_AI: 'off', MARKET_PROVIDER: 'fixture', ADMIN_ACCOUNTS: 'siteadmin', ADMIN_PASSWORD: 'pw' };
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

test('the game clock runs ten times faster by default; odd jobs pay anyone; offers arrive and can be taken', async () => {
  const db = await testDatabase();
  const clock = { t: Date.parse('2026-11-12T15:00:00Z') };
  const now = () => clock.t;
  const ada = await db.one('INSERT INTO accounts (name, name_key, pass_hash, created) VALUES (?, ?, ?, ?) RETURNING id, name, plan', ['Ada', 'ada', 'x', 0]);
  // "Luck" we can steer: every roll comes from this list (then 0.99: nothing happens).
  const rolls = [];
  const rand = () => (rolls.length ? rolls.shift() : 0.99);
  const work = createWork({ db, authenticate: async () => ada, env: { WORK_NEWS_PROVIDER: 'fixture', WORK_AI: 'off', MARKET_PROVIDER: 'fixture' }, now, rand });
  try {
    assert.equal(work.speed, 10);
    const first = await work.today(ada);
    assert.equal(first.speed, 10);
    assert.ok(first.nextDay > clock.t && first.nextDay - clock.t <= 8_640_000, 'a game day is 2 h 24 min');
    assert.equal(first.job, null);
    assert.deepEqual({ left: first.gigs.left, perDay: first.gigs.perDay }, { left: 5, perDay: 5 });
    // An odd job: a puzzle with no answer in it, paid by the score.
    const g = await work.gig(ada);
    assert.ok(g.game?.public && g.game.title && !JSON.stringify(g.game).includes('"answer"'));
    const wrong = await work.gigDone(ada, { answer: {} });
    assert.ok(wrong.score < 50 && wrong.paid === Math.round((g.pay * wrong.score) / 100) && wrong.offer === null);
    assert.equal(wrong.left, 4);
    // Do the next one properly (the server can make the same puzzle again, so we can work out its answer here).
    const { make } = await import('../../src/work/minigames.js');
    const solve = async () => {
      const next = await work.gig(ada);
      const day = (await work.today(ada)).day;
      const made = make(next.game.kind, `gig:${ada.id}:${day}:${next.n}`, ['engineer', 'analyst', 'marketing', 'sales', 'support', 'operations', 'finance', 'people'][next.n % 8]);
      const s = made.secret;
      return next.game.kind === 'triage' ? { order: s.order } : next.game.kind === 'spot-error' ? { rows: s.wrong } : { value: s.answer };
    };
    rolls.push(0.01, 0.5, 0.5);
    const good = await work.gigDone(ada, { answer: await solve() });
    assert.ok(good.score >= 90, `solved: ${good.score}`);
    assert.equal(good.paid, Math.round((g.pay * good.score) / 100));
    assert.equal(good.wallet, wrong.paid + good.paid);
    assert.ok(good.offer?.company && good.offer.salary > 0 && good.offer.title, 'good work brought an offer');
    const { salaryFor } = await import('../../src/work/roles.js');
    assert.equal(good.offer.salary, salaryFor(good.offer.role, good.offer.level), 'at the pay that company gives for the role');
    assert.equal((await work.today(ada)).offer.id, good.offer.id);
    // Only so many a day; the next game day (2 h 24 min later) brings more.
    for (let i = 0; i < 3; i++) await work.gigDone(ada, { answer: {} });
    await assert.rejects(() => work.gigDone(ada, { answer: {} }), /No more odd jobs today/);
    assert.equal((await work.gig(ada)).game, null);
    clock.t += 8_640_000;
    assert.equal((await work.gig(ada)).left, 5);
    // Take the offer: hired without an interview, at that pay.
    await assert.rejects(() => work.offerAnswer(ada, { id: good.offer.id + 99, accept: true }), /gone/);
    const taken = await work.offerAnswer(ada, { id: good.offer.id, accept: true });
    assert.deepEqual({ accepted: taken.accepted, company: taken.company, salary: taken.salary }, { accepted: true, company: good.offer.company, salary: good.offer.salary });
    const after = await work.today(ada);
    assert.equal(after.job.company, good.offer.company);
    assert.equal(after.offer, null);
    await assert.rejects(() => work.offerAnswer(ada, { id: good.offer.id, accept: true }), /gone/);
    // With a job, another company may write: the same level, about the same pay. Declining keeps the job.
    rolls.push(0.0, 0.3, 0.5);
    const poach = await work.maybeOffer(ada, { job: { symbol: after.job.symbol, role: after.job.role, level: after.job.level, salary: after.job.salary }, chance: 1 });
    assert.ok(poach && poach.symbol !== after.job.symbol && Math.abs(poach.salary - after.job.salary) <= after.job.salary * 0.13);
    assert.equal((await work.offerAnswer(ada, { id: poach.id, accept: false })).accepted, false);
    assert.equal((await work.today(ada)).job.company, good.offer.company);
    // An offer lapses after two game days.
    rolls.push(0.0, 0.3, 0.5);
    const late = await work.maybeOffer(ada, { chance: 1 });
    clock.t += 3 * 8_640_000;
    await assert.rejects(() => work.offerAnswer(ada, { id: late.id, accept: true }), /gone/);
  } finally {
    work.stop();
    await db.close();
  }
});

test('Life keeps the game\'s time: one thing a part of the day, nights that come on their own, hard choices settled by a task', async () => {
  const L = await import('../../src/work/life.js');
  const { SCENES, ACTIVITIES, PEOPLE } = await import('../../src/work/lifeStory.js');
  const { make } = await import('../../src/work/minigames.js');
  // The story is well formed: every person and stat it names exists; a choice that asks something has both outcomes.
  const stats = new Set(Object.keys(L.newLife().stats));
  const fxOk = (fx = {}) => Object.keys(fx).every((k) => k === 'people' || k === 'flag' || stats.has(k)) && Object.keys(fx.people ?? {}).every((id) => PEOPLE[id]);
  for (const a of ACTIVITIES) assert.ok(fxOk(a.fx), a.id);
  for (const sc of SCENES) {
    assert.ok(sc.lines.length && sc.choices.length >= 2 && sc.cast.every((id) => PEOPLE[id]), sc.id);
    for (const c of sc.choices) assert.ok(c.ok.lines.length && fxOk(c.ok.fx) && (!c.need || (c.no?.lines.length && fxOk(c.no.fx))), `${sc.id}: ${c.t}`);
  }
  // Day 500 of the game's clock is this life's Monday morning.
  const s = L.newLife(5);
  L.tick(s, 500, 0);
  const me = { company: 'Acme Corp', role: 'data analyst', title: 'Junior', name: 'Ada' };
  let v = L.viewOf(s, me);
  assert.deepEqual([v.weekday, v.partName, v.weekend, v.spent], ['Monday', 'Morning', false, false]);
  // A life opens on its first scene; the morning's work waits behind it.
  assert.equal(s.scene, 'first-day');
  assert.equal(v.activities.length, 0);
  assert.match(v.scene.lines[0].text, /Welcome to Acme Corp, Ada\. You're our new Junior data analyst/);
  assert.match(L.act(s, 'steady'), /answer it first/);
  const before = s.people.mina;
  assert.equal(L.choose(s, 0), null);
  assert.ok(s.people.mina > before && s.scene === null && s.last.kind === 'scene' && s.last.lines.length);
  v = L.viewOf(s, me);
  assert.ok(v.activities.some((a) => a.id === 'focus') && !v.activities.some((a) => a.id === 'rest'), 'a weekday morning is for work');
  assert.equal(L.act(s, 'steady'), null);
  // The morning is spent: nothing more until the clock says afternoon. Nothing can be hurried.
  assert.equal(L.viewOf(s).spent, true);
  assert.equal(L.activitiesFor(s).length, 0);
  assert.match(L.act(s, 'focus'), /spent this morning/);
  assert.equal(L.tick(s, 500, 0), false, 'the same moment changes nothing');
  assert.equal(L.tick(s, 500, 1), true);
  assert.ok(L.activitiesFor(s).some((a) => a.id === 'learn'), 'the afternoon has come round');
  L.act(s, 'learn');
  L.tick(s, 500, 2);
  if (s.scene) L.choose(s, 0);
  assert.ok(L.viewOf(s).activities.some((a) => a.id === 'rest') || L.viewOf(s).spent, 'the evening is yours');
  // The night comes on its own; a part left empty was rest.
  const energy = s.stats.energy;
  L.tick(s, 501, 0);
  assert.equal(s.day, 2);
  assert.ok(s.stats.energy > energy);
  assert.equal(L.viewOf(s).weekday, 'Tuesday');
  // A hard choice is a task to do: do it well and it goes well; badly, and it doesn't (unless you had plenty in you).
  const lives = [L.newLife(1), L.newLife(1), L.newLife(1)];
  for (const x of lives) Object.assign(x, { scene: 'mina-deadline', day: 3, part: 1 });
  lives[2].stats.energy = 100; // asked for 30: the most what you are can add is 20
  for (const x of lives) {
    assert.equal(L.choose(x, 0), null);
    assert.ok(x.scene === 'mina-deadline' && x.pending, 'not settled yet: there is a task');
    assert.match(L.choose(x, 1), /Finish what you started/);
  }
  const c = L.challengeOf(lives[0]);
  assert.ok(c.public && c.title && c.pass === 60 && !JSON.stringify(c).includes('"secret"'));
  const secret = make(lives[0].pending.kind, lives[0].pending.seed, 'support').secret;
  const right = lives[0].pending.kind === 'triage' ? { order: secret.order } : lives[0].pending.kind === 'spot-error' ? { rows: secret.wrong } : { value: secret.answer };
  assert.equal(L.task(lives[0], right), null);
  assert.equal(L.task(lives[1], {}), null);
  assert.ok(lives[0].last.ok && lives[0].last.score >= 90 && lives[0].flags['mina-owes'] && lives[0].scene === null);
  assert.ok(!lives[1].last.ok && !lives[1].flags['mina-owes']);
  assert.notEqual(lives[0].last.lines[0].text, lives[1].last.lines[0].text);
  assert.equal(L.challengeOf(lives[2]).edge, 20);
  // Where it turns on money or closeness there is no task: it is simply so or not.
  const poor = L.newLife(2);
  Object.assign(poor, { scene: 'team-win', day: 26, part: 2 });
  poor.stats.money = 5;
  L.choose(poor, 0);
  assert.ok(!poor.pending && poor.scene === null && !poor.last.ok);
  // What happened decides what can happen: the lunch comes only to the one who stayed.
  assert.equal(SCENES.find((x) => x.id === 'mina-lunch').when.flag, 'mina-owes');
  // Work done elsewhere can set a scene going.
  const busy = L.newLife(4);
  L.tick(busy, 10, 0);
  L.choose(busy, 0);
  L.tick(busy, 11, 2); // Tuesday evening: the sink is waiting
  if (busy.scene) L.choose(busy, 0);
  L.tick(busy, 12, 1); // Wednesday afternoon: one scene has had its turn today already…
  const was = busy.scene;
  if (was) L.choose(busy, 1);
  busy.day = 9;
  busy.t0 = 12 - 8;
  busy.sceneToday = 1;
  assert.equal(busy.scene, null);
  assert.equal(L.nudge(busy), true, '…but a task done can bring another');
  assert.ok(busy.scene);
  assert.equal(L.nudge(busy), false, 'one at a time');
  // Worn out, you get less from the same hours.
  const fresh = L.newLife(2);
  const worn = L.newLife(2);
  for (const x of [fresh, worn]) {
    L.tick(x, 0, 0);
    L.choose(x, 2); // the first scene, answered the same way by both
  }
  worn.stats.energy = 20;
  L.act(fresh, 'learn');
  L.act(worn, 'learn');
  assert.ok(fresh.last.done.stats.skill > worn.last.done.stats.skill && worn.last.tired);
  // A whole season, lived two ways by the clock, is remembered two ways.
  const live = (pick, answer) => {
    const x = L.newLife(9);
    for (let step = 0; step < 28 * 3 + 1 && !x.review; step++) {
      L.tick(x, 1000 + Math.floor(step / 3), step % 3);
      for (let g = 0; g < 6 && x.scene; g++) x.pending ? L.task(x, {}) : L.choose(x, answer(x));
      const open = L.activitiesFor(x).filter((a) => !a.locked);
      if (open.length) L.act(x, pick(open).id);
      for (let g = 0; g < 6 && x.scene; g++) x.pending ? L.task(x, {}) : L.choose(x, answer(x));
    }
    return x;
  };
  const grind = live((a) => a.find((x) => x.id === 'focus') ?? a.find((x) => x.id === 'overtime') ?? a.find((x) => x.id === 'study') ?? a[0], () => 0);
  const idle = live((a) => a.find((x) => x.id === 'coast') ?? a.find((x) => x.id === 'rest') ?? a[0], (x) => L.viewOf(x).scene.choices.length - 1);
  assert.equal(grind.day, 29);
  assert.ok(grind.review.title && idle.review.title && grind.review.id !== idle.review.id, `${grind.review.title} / ${idle.review.title}`);
  assert.equal(L.activitiesFor(grind).length, 0, 'the season\'s review comes first');
  assert.equal(L.nextSeason(grind), null);
  assert.equal(grind.review, null);
  assert.equal(grind.seasons.length, 1);
  // A long absence is lived through a night at a time, up to two weeks; the rest is just a long time ago.
  const away = L.newLife(3);
  L.tick(away, 0, 0);
  L.tick(away, 400, 1);
  assert.ok(away.day <= 15 && away.part === 1);
  L.tick(away, 401, 0);
  assert.equal(away.day <= 16, true);
  // A saved life comes back as it was; nonsense comes back as a new one.
  const back = L.cleanLife(JSON.parse(JSON.stringify(grind)));
  assert.deepEqual(back.stats, grind.stats);
  assert.equal(L.cleanLife({ nonsense: true }).day, 1);
  assert.equal(L.cleanLife({ ...grind, stats: { ...grind.stats, skill: 9999 } }).stats.skill, 100);
});

test('Life on the server: it follows the game clock, and a task done at work can start a scene', async () => {
  const db = await testDatabase();
  const clock = { t: 8_640_000 * 9000 + 1000 }; // the very start of a game day (WORK_SPEED 10)
  const now = () => clock.t;
  const ada = await db.one('INSERT INTO accounts (name, name_key, pass_hash, created) VALUES (?, ?, ?, ?) RETURNING id, name, plan', ['Ada', 'ada', 'x', 0]);
  const work = createWork({ db, authenticate: async () => ada, env: { WORK_NEWS_PROVIDER: 'fixture', WORK_AI: 'off', MARKET_PROVIDER: 'fixture' }, now, rand: () => 0.99 });
  try {
    let l = (await work.life(ada)).life;
    assert.deepEqual([l.day, l.partName, l.spent], [1, 'Morning', false]);
    assert.ok(l.nextPart > clock.t && l.nextPart - clock.t <= 2_880_000, 'a part of the day is 48 minutes');
    assert.equal(l.scene.id, 'first-day', 'a life opens on its first scene');
    l = (await work.lifeStep(ada, { do: 'choose', choice: 1 })).life;
    assert.ok(!l.spent && l.activities.length > 0 && l.last.kind === 'scene');
    l = (await work.lifeStep(ada, { do: 'act', id: 'steady' })).life;
    if (l.scene) l = (await work.lifeStep(ada, { do: 'choose', choice: 0 })).life;
    assert.ok(l.spent && l.activities.length === 0);
    await assert.rejects(() => work.lifeStep(ada, { do: 'act', id: 'focus' }), /spent this morning/);
    await assert.rejects(() => work.lifeStep(ada, { do: 'sleep' }), /Unknown step/);
    // 48 minutes later it is the afternoon; a whole game day later, Tuesday.
    clock.t += 2_880_000;
    l = (await work.life(ada)).life;
    assert.deepEqual([l.partName, l.spent, l.activities.length > 0], ['Afternoon', false, true]);
    clock.t += 8_640_000;
    l = (await work.life(ada)).life;
    assert.deepEqual([l.day, l.weekday, l.partName], [2, 'Tuesday', 'Afternoon']);
    // An odd job done can set the next scene going (the story moves by tasks).
    if (l.scene) l = (await work.lifeStep(ada, { do: 'choose', choice: 0 })).life;
    clock.t += 8_640_000 * 2;
    const done = await work.gigDone(ada, { answer: {} });
    assert.ok('scene' in done);
    l = (await work.life(ada)).life;
    assert.ok(l.scene || l.last, 'life went on');
  } finally {
    work.stop();
    await db.close();
  }
});

test('Life has a part-time job and a go at managing, each with its own scenes', async () => {
  const L = await import('../../src/work/life.js');
  const { SCENES, PEOPLE } = await import('../../src/work/lifeStory.js');
  for (const id of ['lang', 'hale', 'becker', 'ana', 'leo', 'kai', 'okoye']) assert.ok(PEOPLE[id]?.role, id);
  assert.ok(SCENES.filter((x) => x.when.after === 'shift').length >= 5 && SCENES.filter((x) => x.when.after === 'train').length >= 3);
  // An evening shift at the corner shop pays, tires, and brings the shop's first scene straight after it.
  const s = L.newLife(8);
  L.tick(s, 0, 2);
  L.choose(s, 0);
  const shift = L.activitiesFor(s).find((a) => a.id === 'shift');
  assert.ok(shift && shift.fx.money > 0 && shift.fx.energy < 0);
  assert.ok(!L.activitiesFor(s).some((a) => a.id === 'train'), 'coaching is for work hours, and not in the first days');
  const money = s.stats.money;
  assert.equal(L.act(s, 'shift'), null);
  assert.ok(s.stats.money > money);
  assert.equal(s.scene, 'shop-first');
  const v = L.viewOf(s);
  assert.deepEqual(v.scene.cast.map((c) => c.id), ['okoye', 'kai']);
  L.choose(s, 0);
  assert.ok(s.flags['shop-crew'] && s.people.kai > 0);
  assert.ok(L.viewOf(s).people.find((p) => p.id === 'kai').met, 'someone you have met is someone you know');
  // The shop's scenes do not turn up at the office.
  const office = L.newLife(8);
  L.tick(office, 0, 0);
  L.choose(office, 0);
  L.act(office, 'steady');
  assert.ok(!String(office.scene ?? '').startsWith('shop-'));
  // From the fifth day, an hour coaching the interns is a thing to do at work — and has scenes of its own once you know them.
  const m = L.newLife(8);
  L.tick(m, 0, 0);
  L.choose(m, 0);
  Object.assign(m, { day: 5, t0: -4, part: 0, spent: null, sceneToday: 0 });
  m.flags['interns-friend'] = 4;
  m.seen['interns-arrive'] = 4;
  assert.ok(L.activitiesFor(m).some((a) => a.id === 'train'));
  assert.equal(L.act(m, 'train'), null);
  assert.ok(['train-feedback', 'train-delegate', 'train-voice'].includes(m.scene), String(m.scene));
});
