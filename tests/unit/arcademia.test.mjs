import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { GENERATORS, makeProblem, makeQuiz, MATH_LESSONS } from '../../src/arcademia/content/math.js';
import { LESSONS, LAND_LESSONS, lessonById, lessonsIn, quizFor, quizLength } from '../../src/arcademia/content/index.js';
import { lessonProblems, SUBJECTS, MAGNET_ITEMS, CIRCUIT_ITEMS, FLOAT_ITEMS } from '../../src/arcademia/content/schema.js';
import { FLOORS } from '../../src/arcademia/floors.js';
import { BEAT_MAX_SECONDS, buildReport, cleanEvent, dayOf, neededOn, openFloors, starsFor, weekStart } from '../../src/arcademia/rules.js';
import { LearningStore } from '../../server/learningStore.js';
import { aiBridge, scrub, tutorMessages } from '../../server/api/ai.js';
import { hashPassword } from '../../server/game/keys.js';
import { testDatabase } from './db.mjs';

/* ---------------------------------------------------------------- math */

const fmtNeg = (n) => (n < 0 ? `−${-n}` : String(n));
/** Each generator's answer, worked out again here from its numbers alone. */
const SOLVE = {
  count: (d) => String(d.n),
  add10: (d) => String(d.a + d.b),
  sub10: (d) => String(d.a - d.b),
  'tens-ones': (d) => String(d.ask === 'number' ? Number(`${d.tens}${d.ones}`) : Math.floor(d.n / 10)),
  'add-carry': (d) => String(d.a + d.b),
  'skip-count': (d) => String(d.start + 4 * d.by),
  times: (d) => String(d.a * d.b),
  'sub-borrow': (d) => String(d.a - d.b),
  fractions: (d) => `${d.shaded}/${d.parts}`,
  'mult-2x1': (d) => String(d.a * d.b),
  division: (d) => String(d.a / d.b),
  'fraction-of': (d) => String((d.whole * d.n) / d.d),
  balance: (d) => String(d.b - d.a),
  decimals: (d) => ((Math.round(d.a * 10) + Math.round(d.b * 10)) / 10).toFixed(1),
  area: (d) => (d.ask === 'area' ? `${d.w * d.h} cm²` : `${2 * d.w + 2 * d.h} cm`),
  negatives: (d) => `${fmtNeg(d.up ? d.a + d.b : d.a - d.b)} °C`,
  percent: (d) => String((d.p / 100) * d.whole),
  'two-step': (d) => String((d.c - d.b) / d.a),
  squares: (d) => String(d.ask === 'square' ? d.n * d.n : Math.sqrt(d.n * d.n))
};

test('math: every generator\'s marked answer is right, over many seeds', () => {
  assert.deepEqual(Object.keys(SOLVE).sort(), Object.keys(GENERATORS).sort(), 'a solver for every generator');
  for (const gen of Object.keys(GENERATORS)) {
    for (let seed = 1; seed <= 400; seed++) {
      const p = makeProblem(gen, seed * 7 + 3);
      assert.equal(p.choices.length, 4, `${gen} #${seed}: four choices`);
      assert.equal(new Set(p.choices).size, 4, `${gen} #${seed}: all different (${p.choices})`);
      assert.equal(p.choices[p.answer], SOLVE[gen](p.data), `${gen} #${seed}: ${p.q}`);
      // No other choice is also right (e.g. an equal fraction).
      assert.equal(p.choices.filter((c) => c === SOLVE[gen](p.data)).length, 1);
      assert.ok(p.hint.length > 5 && p.explain.length > 5, `${gen}: hint and explanation`);
      assert.ok(p.board.length > 3, `${gen}: a worked example on the board`);
    }
  }
});

test('math: generator problems are sane for the age', () => {
  for (let s = 1; s < 300; s++) {
    const add = makeProblem('add10', s).data;
    assert.ok(add.a + add.b <= 10 && add.b >= 1);
    const sub = makeProblem('sub10', s).data;
    assert.ok(sub.a - sub.b >= 1);
    const carry = makeProblem('add-carry', s).data;
    assert.ok((carry.a % 10) + (carry.b % 10) >= 10 && carry.a + carry.b <= 99, 'a carry, under 100');
    const borrow = makeProblem('sub-borrow', s).data;
    assert.ok(borrow.a % 10 < borrow.b % 10 && borrow.a > borrow.b, 'a borrow, positive');
    const div = makeProblem('division', s).data;
    assert.ok(Number.isInteger(div.a / div.b), 'division comes out even');
    const of = makeProblem('fraction-of', s).data;
    assert.ok(Number.isInteger(of.whole / of.d));
    const two = makeProblem('two-step', s).data;
    assert.ok(Number.isInteger((two.c - two.b) / two.a));
    const fr = makeProblem('fractions', s);
    // No choice equal in value to the right one ("2/4" next to "1/2").
    const val = (f) => f.split('/').reduce((a, b) => a / b);
    const right = val(fr.choices[fr.answer]);
    assert.equal(fr.choices.filter((c) => Math.abs(val(c) - right) < 1e-9).length, 1, `${fr.choices}`);
  }
  assert.deepEqual(makeProblem('times', 42), makeProblem('times', 42), 'the same seed, the same question');
  const quiz = makeQuiz('times', 9, 5);
  assert.equal(new Set(quiz.map((q) => q.q)).size, 5, 'a quiz never repeats a question');
});

/* ---------------------------------------------------------------- lessons */

test('lessons: every one is well-formed, every floor × subject has at least two', () => {
  const problems = LESSONS.flatMap((l) => lessonProblems(l, { gens: GENERATORS }));
  assert.deepEqual(problems, []);
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length, 'ids are unique');
  assert.ok(LESSONS.length >= 42);
  for (const f of FLOORS) for (const s of SUBJECTS) assert.ok(LESSONS.filter((l) => l.floor === f.n && l.subject === s).length >= 2, `floor ${f.n} ${s}`);
  for (const lesson of LESSONS) {
    const quiz = quizFor(lesson, 77);
    assert.equal(quiz.length, quizLength(lesson));
    for (const q of quiz) {
      assert.ok(q.hint && q.explain, `${lesson.id}: every question has a hint and an explanation`);
      assert.ok(q.choices[q.answer] !== undefined, `${lesson.id}: every question has a right answer`);
    }
  }
});

test('lessons: physics answers agree with what the sims show', () => {
  const tables = { magnet: MAGNET_ITEMS, circuit: CIRCUIT_ITEMS, float: FLOAT_ITEMS };
  for (const l of LESSONS.filter((x) => x.subject === 'physics')) {
    const table = tables[l.sim.id];
    if (!table) continue;
    for (const item of l.sim.setup.items) assert.ok(item in table, `${l.id}: ${item}`);
  }
  // A few facts the sims are built on.
  assert.equal(MAGNET_ITEMS['aluminium-can'], false, 'aluminium is not magnetic');
  assert.equal(CIRCUIT_ITEMS['aluminium-foil'], true, 'but it conducts');
  assert.equal(FLOAT_ITEMS['ice-cube'], true);
  assert.equal(FLOAT_ITEMS.coin, false);
});

test('lessons: history timelines can be sorted one way only', () => {
  for (const l of LESSONS.filter((x) => x.subject === 'history')) {
    const years = l.timeline.events.map((e) => e.year);
    assert.equal(new Set(years).size, years.length, l.id);
    for (const e of l.timeline.events) {
      if (e.year < 0) assert.match(e.when, /BCE|years ago/, `${l.id}: "${e.when}" reads as before year 1`);
      else assert.doesNotMatch(e.when, /BCE/, `${l.id}: "${e.when}" is not BCE`);
    }
  }
});

/* ---------------------------------------------------------------- floors and stars */

test('floors: floor 1 is open; the next opens at two thirds of the floor below', () => {
  assert.deepEqual([...openFloors({})], [1]);
  const f1 = LAND_LESSONS.filter((l) => l.floor === 1);
  const need = neededOn(1);
  assert.equal(need, Math.ceil(f1.length * (2 / 3)));
  const some = Object.fromEntries(f1.slice(0, need - 1).map((l) => [l.id, 3]));
  assert.deepEqual([...openFloors(some)], [1], 'one short');
  some[f1[need - 1].id] = 1;
  assert.deepEqual([...openFloors(some)], [1, 2], 'one star is enough for a lesson to count');
  // Floor 3 needs floor 2's lessons, and floor 2 open.
  const f2 = Object.fromEntries(LAND_LESSONS.filter((l) => l.floor === 2).map((l) => [l.id, 2]));
  assert.deepEqual([...openFloors(f2)], [1], 'floor 2 done but floor 1 not: still only floor 1');
  const all = Object.fromEntries(LAND_LESSONS.map((l) => [l.id, 3]));
  assert.equal(openFloors(all).size, FLOORS.length);
  // Each realm opens its own floors: every forest, sea, desert, Moon or Mars star opens nothing on the mountain, and the other way round.
  for (const realm of ['forest', 'sea', 'desert', 'moon', 'mars']) {
    const mine = lessonsIn(realm);
    const theirs = Object.fromEntries(mine.map((l) => [l.id, 3]));
    assert.deepEqual([...openFloors(theirs)], [1], `${realm} stars do not open the mountain`);
    if (mine.length) assert.equal(openFloors(all, { lessons: mine }).size, 1, `mountain stars do not open the ${realm}`);
    assert.ok(mine.every((l) => l.realm === realm), `${realm} lessons say so`);
  }
  assert.equal(starsFor(5, 5), 3);
  assert.equal(starsFor(3, 5), 2);
  assert.equal(starsFor(0, 4), 1, 'finishing earns a star');
  assert.equal(starsFor(99, 4), 3, 'never more than three');
});

test('report: minutes by day and subject, accuracy against last week, streak, most-missed topics', () => {
  const tz = 0;
  const now = Date.parse('2026-11-18T15:00:00Z'); // a Wednesday
  assert.equal(weekStart(dayOf(now, tz)), '2026-11-16');
  const at = (d, h = 10) => Date.parse(`2026-11-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00Z`);
  const events = [
    { kind: 'time', subject: 'math', seconds: 600, at: at(16) },
    { kind: 'time', subject: 'history', seconds: 300, at: at(17) },
    { kind: 'time', subject: 'math', seconds: 120, at: at(18) },
    { kind: 'answer', lesson: 'm1-adding', subject: 'math', topic: 'add10', correct: true, at: at(18) },
    { kind: 'answer', lesson: 'm1-adding', subject: 'math', topic: 'add10', correct: false, at: at(18) },
    { kind: 'answer', lesson: 'm1-adding', subject: 'math', topic: 'add10', correct: false, at: at(18) },
    { kind: 'answer', lesson: 'm1-counting', subject: 'math', topic: 'count', correct: true, at: at(10) },
    { kind: 'lesson', lesson: 'm1-adding', subject: 'math', stars: 1, score: 1, total: 5, at: at(18, 11) },
    { kind: 'reading', lesson: 'h1-long-ago', subject: 'history', at: at(15) }
  ];
  const r = buildReport({ events, stars: { 'm1-adding': 1 }, now, tzOffset: tz });
  assert.equal(r.days.length, 7);
  assert.equal(r.days[0].math, 10);
  assert.equal(r.days[1].history, 5);
  assert.equal(r.minutes, 17);
  const math = r.accuracy.find((a) => a.subject === 'math');
  assert.equal(math.this, 33);
  assert.equal(math.last, 100);
  assert.equal(r.lessonsThisWeek, 1);
  assert.equal(r.streak, 4, '15th to 18th');
  assert.equal(r.practice[0].topic, 'add10');
  assert.equal(r.recent[0].lesson, 'm1-adding');
  assert.equal(r.stars, 1);
});

/* ---------------------------------------------------------------- the server's caps */

async function store() {
  const db = await testDatabase();
  const clock = { t: Date.parse('2026-11-18T09:00:00Z') };
  const s = new LearningStore(db, { now: () => clock.t });
  await db.run('INSERT INTO accounts (name, name_key, pass_hash, created) VALUES (?, ?, ?, ?)', ['Kid', 'kid', await hashPassword('secret-pass-1'), clock.t]);
  const account = { id: (await db.one("SELECT id FROM accounts WHERE name_key = 'kid'")).id, name: 'Kid' };
  return { db, clock, s, account };
}

test('progress: stars only as far as recorded right answers allow; best kept; never above 3', async () => {
  const { db, clock, s, account } = await store();
  try {
    // Claiming a perfect lesson with no answers recorded earns one star (finished), not three.
    let r = await s.record(account, { events: [{ kind: 'lesson', lesson: 'm1-adding', score: 5 }] });
    assert.equal(r.stars['m1-adding'], 1);
    clock.t += 60_000;
    const answers = Array.from({ length: 5 }, () => ({ kind: 'answer', lesson: 'm1-adding', correct: true }));
    r = await s.record(account, { events: [...answers, { kind: 'lesson', lesson: 'm1-adding', score: 99, stars: 50 }] });
    assert.equal(r.stars['m1-adding'], 3, 'five right of five');
    // Finishing again at once doesn't count; a worse run later keeps the best.
    r = await s.record(account, { events: [{ kind: 'lesson', lesson: 'm1-adding', score: 0 }] });
    assert.equal(r.accepted, 0, 'twice inside the gap counts once');
    clock.t += 60_000;
    r = await s.record(account, { events: [{ kind: 'lesson', lesson: 'm1-adding', score: 1 }] });
    assert.equal(r.stars['m1-adding'], 3, 'the best is kept');
    // Unknown lessons and junk are dropped.
    r = await s.record(account, { events: [{ kind: 'lesson', lesson: 'nope' }, { kind: 'hack' }, null] });
    assert.equal(r.accepted, 0);
    const row = await db.one('SELECT stars FROM learning_lessons WHERE account_id = ? AND lesson_id = ?', [account.id, 'm1-adding']);
    assert.equal(row.stars, 3);
    await assert.rejects(s.record(account, { events: Array.from({ length: 101 }, () => ({})) }), /100/);
  } finally {
    await db.close();
  }
});

test('progress: study time is capped per heartbeat, by the clock, and per day', async () => {
  const { db, clock, s, account } = await store();
  try {
    let r = await s.record(account, { start: true, events: [{ kind: 'time', subject: 'math', seconds: 90 }] });
    assert.equal(r.seconds, 5, 'the first beat: a few seconds, not ninety');
    clock.t += 30_000;
    r = await s.record(account, { events: [{ kind: 'time', subject: 'math', seconds: 90 }] });
    assert.equal(r.seconds, 35, 'no more than the time gone by');
    clock.t += 3_600_000;
    r = await s.record(account, { events: [{ kind: 'time', subject: 'math', seconds: 5000 }, { kind: 'time', subject: 'physics', seconds: 80 }] });
    assert.equal(r.seconds, BEAT_MAX_SECONDS, 'ninety seconds a beat at most, shared by the batch');
    // A day's cap.
    await db.run("INSERT INTO learning_events (account_id, kind, subject, data, at) VALUES (?, 'time', 'math', ?, ?)", [account.id, JSON.stringify({ seconds: 6 * 3600 }), clock.t]);
    clock.t += 60_000;
    r = await s.record(account, { events: [{ kind: 'time', subject: 'math', seconds: 60 }] });
    assert.equal(r.seconds, 0, 'six hours a day at most');
    assert.equal(cleanEvent({ kind: 'time', subject: 'cooking', seconds: 10 }, 1), null);
  } finally {
    await db.close();
  }
});

test('progress: a guest\'s progress comes in once, capped', async () => {
  const { db, clock, s, account } = await store();
  try {
    const old = clock.t - 90 * 86400000;
    const r = await s.importGuest(account, {
      stars: { 'm1-counting': 3, 'm1-adding': 12, 'zz-fake': 3 },
      events: [
        { kind: 'time', subject: 'math', seconds: 90, at: clock.t - 3600_000 },
        { kind: 'time', subject: 'math', seconds: 90, at: old },
        { kind: 'time', subject: 'math', seconds: 90, at: clock.t + 86400000 },
        { kind: 'reading', lesson: 'm1-counting', at: clock.t - 7200_000 }
      ]
    });
    assert.equal(r.accepted, 2, 'too old and in the future are dropped');
    assert.deepEqual(r.stars, { 'm1-counting': 3, 'm1-adding': 3 });
    await assert.rejects(s.importGuest(account, { stars: { 'm1-taking-away': 3 } }), /already/);
  } finally {
    await db.close();
  }
});

test('parents: a 4-digit PIN, hashed; five wrong tries lock it; share links can be revoked', async () => {
  const { db, clock, s, account } = await store();
  try {
    await assert.rejects(s.unlock(account, '12a4'), /4 digits/);
    const first = await s.unlock(account, '2468');
    assert.equal(first.created, true);
    const row = await db.one('SELECT pin_hash FROM learning_profile WHERE account_id = ?', [account.id]);
    assert.match(row.pin_hash, /^scrypt\$/, 'stored hashed');
    assert.ok(!row.pin_hash.includes('2468'));
    assert.ok(s.parentOf(account, first.parentKey));
    assert.throws(() => s.parentOf(account, 'made-up'), /PIN/);
    for (let i = 0; i < 5; i++) await assert.rejects(s.unlock(account, '0000'), /not right/);
    await assert.rejects(s.unlock(account, '2468'), /wait/, 'locked even with the right PIN');
    clock.t += 16 * 60000;
    assert.ok((await s.unlock(account, '2468')).parentKey, 'open again after 15 minutes');
    // A forgotten PIN: the account password clears it.
    await assert.rejects(s.resetPin(account, 'wrong'), /password/);
    await s.resetPin(account, 'secret-pass-1');
    assert.equal(await s.hasPin(account), false);
    // Share links.
    const token = await s.share(account, true);
    assert.ok((await s.shared(token)).days);
    const next = await s.share(account, true);
    assert.equal(await s.shared(token), null, 'a new link replaces the old');
    assert.ok(await s.shared(next));
    await s.share(account, false);
    assert.equal(await s.shared(next), null, 'revoked');
    assert.equal(await s.shared('../../etc'), null);
  } finally {
    await db.close();
  }
});

/* ---------------------------------------------------------------- the tutor: Plus only */

async function fakeModel() {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      calls.push(JSON.parse(body || '{}'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'Try counting on from the bigger number!' } }] }));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/v1`, calls, close: () => new Promise((r) => server.close(r)) };
}
async function bridge(env) {
  const handler = aiBridge(env, { identify: async (req) => (req.headers['x-plan'] ? { id: 7, plan: req.headers['x-plan'] } : null) });
  const server = http.createServer((req, res) => handler(req, res).then((done) => done || (res.writeHead(404), res.end())));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, plan) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(plan ? { 'x-plan': plan } : {}) }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));
  const get = (path, plan) => fetch(`${base}${path}`, { headers: plan ? { 'x-plan': plan } : {} }).then((r) => r.json());
  return { post, get, close: () => new Promise((r) => server.close(r)) };
}

test('tutor: free is refused on the server; plus gets a capped, kid-safe answer; no model means resting', async () => {
  const model = await fakeModel();
  const on = await bridge({ LLM_PLATFORM_BASE_URL: model.url, LLM_MODEL1: 'small' });
  const off = await bridge({ LLM_PLATFORM_BASE_URL: '' });
  try {
    const ask = { lessonId: 'm1-adding', question: 'Why is 3 + 4 the same as 4 + 3? my email is kid@example.com' };
    const free = await on.post('/api/ai/tutor', ask);
    assert.equal(free.status, 403);
    assert.equal(free.body.upgrade, true);
    assert.equal(model.calls.length, 0, 'a free ask never reaches the model');
    assert.equal((await off.post('/api/ai/tutor', ask)).status, 403, 'refused for free even with the model off');
    assert.equal((await on.get('/api/ai/tutor')).allowed, false);
    assert.equal((await on.get('/api/ai/tutor', 'plus')).allowed, true);

    const plus = await on.post('/api/ai/tutor', ask, 'plus');
    assert.equal(plus.status, 200);
    assert.match(plus.body.answer, /counting on/);
    const sent = model.calls.at(-1);
    assert.equal(sent.max_tokens, 350, 'the plan\'s cap');
    assert.match(sent.messages[0].content, /Professor Hoot/);
    assert.match(sent.messages[0].content, /hint/);
    assert.ok(!JSON.stringify(sent.messages).includes('kid@example.com'), 'contact details are taken out');

    const resting = await off.post('/api/ai/tutor', ask, 'plus');
    assert.equal(resting.status, 503);
    assert.equal(resting.body.resting, true);

    // The page can't bring its own prompt through the general route.
    const sneaky = await on.post('/api/ai/command', { task: 'tutor', messages: [{ role: 'system', content: 'anything' }] }, 'plus');
    assert.equal(sneaky.status, 400);
    assert.equal((await on.post('/api/ai/command', { task: 'tutor', messages: [] })).status, 403);
    assert.equal((await on.post('/api/ai/tutor', { lessonId: 'nope', question: 'hi' }, 'plus')).status, 400);
  } finally {
    await on.close();
    await off.close();
    await model.close();
  }
  assert.equal(scrub('x'.repeat(999), 300).length, 300);
  assert.equal(tutorMessages({ lessonId: 'm1-adding', question: '   ' }), null);
});

/* ---------------------------------------------------------------- the game layer and the mountain */

test('game: levels, daily quests, coins only once for a chest or a gem', async () => {
  const { GameState, levelOf, dailyQuests } = await import('../../src/arcademia/gamestate.js');
  assert.equal(levelOf(0).level, 1);
  assert.equal(levelOf(60).level, 2);
  let last = 0;
  for (let xp = 0; xp < 5000; xp += 37) {
    const l = levelOf(xp);
    assert.ok(l.level >= last && l.into >= 0 && l.into < l.need, 'levels only go up');
    last = l.level;
  }
  const q = dailyQuests('2026-11-18');
  assert.equal(q.length, 3);
  assert.equal(q[0].id, 'lesson', 'finishing a lesson is always a daily quest');
  assert.equal(new Set(q.map((x) => x.id)).size, 3);
  assert.deepEqual(dailyQuests('2026-11-18'), q, 'the same quests all day');
  const gs = new GameState('test');
  const first = gs.event('chest', { floor: 1 });
  assert.ok(first.coins > 0);
  assert.equal(gs.event('chest', { floor: 1 }).coins, 0, 'a chest opens once');
  assert.equal(gs.event('gem', { id: '1-0' }).coins, 10);
  assert.equal(gs.event('gem', { id: '1-0' }).coins, 0, 'a gem is found once');
  const r = gs.event('right', { combo: 5 });
  assert.ok(r.stickers.some((s) => s.id === 'combo-5'));
  assert.equal(gs.buyHat('crown'), false, 'not enough coins for a crown yet');
});

test('mountain: every place on every floor can be walked to; a locked floor cannot', async () => {
  const { planMountain, buildNavGrid } = await import('../../src/arcademia/world/layout.js');
  const plan = planMountain(FLOORS.length);
  const blockers = plan.floors.flatMap((f) => f.places.map((p) => ({ x: p.x, z: p.z, r: SUBJECTS.includes(p.kind) ? 3.25 : p.r * 0.85 })));
  const start = plan.floors[0].plinths[1];
  const from = [start.door.x, start.door.z + 2];
  const target = (p) => (SUBJECTS.includes(p.kind) ? [p.x, p.z + p.r + 1.2] : [p.x, p.z - p.r - 1.2]);
  const open = buildNavGrid(plan, { blockers });
  for (const f of plan.floors) {
    assert.equal(f.places.length, 8, `floor ${f.n}: three schools and five places`);
    for (const p of f.places) assert.ok(open.findPath(from, target(p)), `floor ${f.n} ${p.kind} reachable`);
  }
  const shut = buildNavGrid(plan, { blockers, locked: (n) => n >= 2 });
  assert.equal(shut.findPath(from, target(plan.floors[1].places[0])), null, 'floor 2 is shut while locked');
  assert.ok(shut.findPath(from, target(plan.floors[0].places[2])), 'floor 1 still open');
});

test('great tree: rings all round the trunk, every place reachable, a locked ring shut, decks apart', async () => {
  const { planTree } = await import('../../src/arcademia/world/tree/plan.js');
  const { buildLayerNav } = await import('../../src/arcademia/world/tree/nav.js');
  const { MAPS, TREE_FLOORS, mapById } = await import('../../src/arcademia/maps.js');
  assert.deepEqual(MAPS.map((m) => m.id), ['mountain', 'tree', 'lagoon', 'desert', 'moon', 'mars']);
  assert.equal(mapById('nope').id, 'mountain', 'an unknown map falls back to the mountain');
  assert.equal(TREE_FLOORS.length, FLOORS.length, 'the same floors (and lessons) in every world');
  const plan = planTree(TREE_FLOORS.length);
  const blockers = plan.floors.flatMap((f) => f.places.map((p) => ({ x: p.x, z: p.z, y: f.y, r: SUBJECTS.includes(p.kind) ? 3.25 : p.r * 0.85 })));
  const nav = buildLayerNav(plan, { blockers });
  const s = plan.start;
  for (const f of plan.floors) {
    assert.equal(f.places.length, 8, `ring ${f.n}: three schools and five places`);
    // Buildings all the way round the trunk, not on one side.
    const angles = f.places.map((p) => Math.atan2(p.x, p.z));
    const quadrants = new Set(angles.map((a) => Math.floor(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2))));
    assert.equal(quadrants.size, 4, `ring ${f.n} has buildings on every side of the tree`);
    const decks = Object.values(f.pads).filter((p) => !p.landing);
    for (let i = 0; i < decks.length; i++) for (let j = i + 1; j < decks.length; j++) {
      const a = decks[i], b = decks[j];
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > a.pr + b.pr + 4, `ring ${f.n}: ${a.id} and ${b.id} have a bridge between them`);
    }
    for (const p of [...f.places.map((q) => q.at), f.portal.at, f.boss.at, f.chest.at]) {
      const path = nav.findPath([s.x, s.z, s.y], [p.x, p.z, f.y]);
      assert.ok(path, `ring ${f.n}: reachable`);
      assert.ok(Math.abs(path.at(-1)[2] - f.y) < 1, `ring ${f.n}: the path ends on that ring`);
    }
    assert.ok(Math.abs(plan.height(f.spawn.x, f.spawn.z, f.y) - f.y) < 0.01);
  }
  assert.ok(plan.floors[0].worldGate, 'the World Portal is on the first ring');
  // A ring above another: the height you are at picks the surface.
  const top = plan.floors[2].places[0];
  assert.equal(plan.floorAt(top.x, top.z, plan.floors[2].y), 3);
  const shut = buildLayerNav(plan, { blockers, locked: (n) => n >= 2 });
  const t2 = plan.floors[1].places[0].at;
  assert.equal(shut.findPath([s.x, s.z, s.y], [t2.x, t2.z, t2.y]), null, 'ring 2 is shut while locked');
  const t1 = plan.floors[0].places[2].at;
  assert.ok(shut.findPath([s.x, s.z, s.y], [t1.x, t1.z, t1.y]), 'ring 1 still open');
});

test('great tree: a step never lands on another ring (no jumping up to the bridge above)', async () => {
  const { planTree } = await import('../../src/arcademia/world/tree/plan.js');
  const { buildLayerNav } = await import('../../src/arcademia/world/tree/nav.js');
  const plan = planTree(FLOORS.length);
  const blockers = plan.floors.flatMap((f) => f.places.map((p) => ({ x: p.x, z: p.z, y: f.y, r: SUBJECTS.includes(p.kind) ? 3.25 : p.r * 0.85 })));
  // Ring 1 open, the rest locked: the case where a buddy who slipped up a storey was stuck.
  const nav = buildLayerNav(plan, { blockers, locked: (n) => n >= 2 });
  const { w, d, cell, x0, z0, h } = nav;
  const N = w * d;
  let jumps = 0;
  for (let l = 0; l < 2; l++) for (let j = 1; j < d - 1; j++) for (let i = 1; i < w - 1; i++) {
    const y = h[l * N + j * w + i];
    if (y < -1e3) continue;
    const ax = x0 + (i + 0.5) * cell, az = z0 + (j + 0.5) * cell;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const bx = ax + di * cell, bz = az + dj * cell;
      if (nav.canStep(ax, az, bx, bz, y) && Math.abs(plan.height(bx, bz, y) - y) > 2) jumps++;
    }
  }
  assert.equal(jumps, 0, 'steps that change ring');
  // Standing under a bridge of the ring above with nothing below: no surface of yours, not the bridge.
  const L = plan.floors[1].links.find((q) => q.type === 'rope');
  const mx = L.ax + L.dx * (L.a0 + L.a1) / 2, mz = L.az + L.dz * (L.a0 + L.a1) / 2;
  const here = plan.locate(mx, mz, 0);
  assert.ok(!here || Math.abs(here.y) < 4, 'not the bridge a storey up');
  assert.ok(Math.abs(plan.height(mx, mz, 0)) < 4, 'a walker on ring 1 stays at ring 1');
});

test('desert: seven oases along the Nile, every place reachable along the causeways, a locked oasis shut', async () => {
  const { planDesert, riverLine, DESERT, GIZA } = await import('../../src/arcademia/world/desert/plan.js');
  const { buildLayerNav } = await import('../../src/arcademia/world/tree/nav.js');
  const { DESERT_FLOORS, mapById } = await import('../../src/arcademia/maps.js');
  const desert = mapById('desert');
  assert.equal(desert.kind, 'desert');
  assert.equal(desert.realm, 'desert');
  assert.equal(DESERT_FLOORS.length, FLOORS.length, 'one oasis per floor');
  // Its townsfolk are its own desert animals (in sun hats and headscarves), none borrowed from another world.
  const { SPECIES } = await import('../../src/arcademia/world/creatures/species.js');
  const { makeHat } = await import('../../src/arcademia/world/creatures/hats.js');
  const { MAPS } = await import('../../src/arcademia/maps.js');
  const elsewhere = new Set(MAPS.filter((m) => m.id !== 'desert').flatMap((m) => m.floors.flatMap((f) => f.look.critters ?? [])));
  const locals = new Set(DESERT_FLOORS.flatMap((f) => f.look.critters));
  assert.ok(locals.size >= 5, `${locals.size} kinds of desert townsfolk`);
  for (const k of locals) {
    assert.ok(SPECIES[k], `${k} has a recipe`);
    assert.ok(!elsewhere.has(k), `${k} is new to the desert`);
  }
  for (const h of new Set(DESERT_FLOORS.flatMap((f) => f.look.hats ?? []))) if (h !== 'none') assert.ok(makeHat(h), `the ${h} hat exists`);
  const plan = planDesert(DESERT_FLOORS.length);
  assert.equal(plan.stairs.length, plan.floors.length - 1, 'a causeway from each oasis to the next');
  // Strung along a line (west to east), not round a ring.
  for (let i = 1; i < plan.floors.length; i++) assert.ok(plan.floors[i].centre.x > plan.floors[i - 1].centre.x + 80, `oasis ${i + 1} east of oasis ${i}`);
  const blockers = plan.floors.flatMap((f) => f.places.map((p) => ({ x: p.x, z: p.z, y: f.y, r: SUBJECTS.includes(p.kind) ? 3.25 : p.r * 0.85 })));
  const nav = buildLayerNav(plan, { blockers });
  const s = plan.start;
  for (const f of plan.floors) {
    assert.equal(f.places.length, 8, `oasis ${f.n}: three schools and five places`);
    const pads = Object.values(f.pads);
    for (let i = 0; i < pads.length; i++) for (let j = i + 1; j < pads.length; j++) {
      const a = pads[i], b = pads[j];
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > a.pr + b.pr + 4, `oasis ${f.n}: ${a.id} and ${b.id} apart`);
    }
    // The schools stand on the river side and face the plaza (and the camera, south of it).
    for (const p of f.plinths) {
      assert.ok(p.z < f.centre.z - 15, `oasis ${f.n}: the ${p.subject} school is on the river side`);
      assert.ok(Math.cos(p.yaw) > 0.5, `oasis ${f.n}: the ${p.subject} school's door faces south`);
    }
    for (const p of [...f.places.map((q) => q.at), f.portal.at, f.boss.at, f.chest.at, f.spawn, ...(f.worldGate ? [f.worldGate.at] : [])]) {
      const path = nav.findPath([s.x, s.z, s.y], [p.x, p.z, f.y]);
      assert.ok(path, `oasis ${f.n}: (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) reachable`);
      assert.ok(Math.abs(path.at(-1)[2] - f.y) < 0.6, `oasis ${f.n}: the path ends at walking height`);
    }
    for (const [x, z] of [...f.gemSpots, ...f.toySpots]) assert.equal(plan.floorAt(x, z), f.n, `oasis ${f.n}: gem or toy spot on its own stone`);
  }
  assert.ok(plan.floors[0].worldGate, 'the World Portal is in the first oasis');
  assert.ok(!plan.floors.slice(1).some((f) => f.worldGate), 'and only there');
  // Nothing to stand on in the river; the river runs north of every garden.
  const river = riverLine(3);
  for (const [x, z] of river) if (Math.abs(x) < 420) assert.equal(plan.surfaces(x, z).length, 0, `the Nile at x ${x.toFixed(0)}`);
  for (const f of plan.floors) {
    const near = Math.min(...river.map(([x, z]) => Math.hypot(x - f.centre.x, z - f.centre.z)));
    assert.ok(near > DESERT.gardenR + DESERT.river.half, `oasis ${f.n}'s garden stays dry`);
  }
  // The pyramids and the Sphinx stand across the river from the first oasis, clear of each other.
  const g = plan.floors[0].centre;
  for (const p of GIZA.pyramids) assert.ok(p.z < g.z - 150 && Math.abs(p.x - g.x) < 220, `pyramid ${p.id} by the first oasis`);
  for (let i = 0; i < GIZA.pyramids.length; i++) for (let j = i + 1; j < GIZA.pyramids.length; j++) {
    const a = GIZA.pyramids[i], b = GIZA.pyramids[j];
    const apart = Math.abs(a.x - b.x) > (a.base + b.base) / 2 || Math.abs(a.z - b.z) > (a.base + b.base) / 2;
    assert.ok(apart, `pyramids ${i} and ${j} do not overlap`);
  }
  // Locked oases are shut, the open one still walkable; the causeway's gate shuts with it.
  const shut = buildLayerNav(plan, { blockers, locked: (n) => n >= 2 });
  const t2 = plan.floors[1].places[0].at;
  assert.equal(shut.findPath([s.x, s.z, s.y], [t2.x, t2.z, t2.y]), null, 'oasis 2 is shut while locked');
  const t1 = plan.floors[0].places[2].at;
  assert.ok(shut.findPath([s.x, s.z, s.y], [t1.x, t1.z, t1.y]), 'oasis 1 still open');
});

test('desert: a step never changes height or lands off the stone, and the causeways carry you from oasis to oasis', async () => {
  const { planDesert } = await import('../../src/arcademia/world/desert/plan.js');
  const { buildLayerNav } = await import('../../src/arcademia/world/tree/nav.js');
  const plan = planDesert(FLOORS.length);
  const blockers = plan.floors.flatMap((f) => f.places.map((p) => ({ x: p.x, z: p.z, y: f.y, r: SUBJECTS.includes(p.kind) ? 3.25 : p.r * 0.85 })));
  const nav = buildLayerNav(plan, { blockers });
  const { w, d, cell, x0, z0, h } = nav;
  let jumps = 0;
  for (let j = 1; j < d - 1; j++) for (let i = 1; i < w - 1; i++) {
    const y = h[j * w + i];
    if (y < -1e3) continue;
    const ax = x0 + (i + 0.5) * cell, az = z0 + (j + 0.5) * cell;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const bx = ax + di * cell, bz = az + dj * cell;
      if (nav.canStep(ax, az, bx, bz, y) && (!plan.locate(bx, bz, y) || Math.abs(plan.height(bx, bz, y) - y) > 0.7)) jumps++;
    }
  }
  assert.equal(jumps, 0, 'steps off the stone or up and down');
  for (const st of plan.stairs) {
    const a = plan.floors[st.from - 1], b = plan.floors[st.to - 1];
    const path = nav.findPath([a.spawn.x, a.spawn.z, a.y], [b.spawn.x, b.spawn.z, b.y]);
    assert.ok(path, `oasis ${st.from} to ${st.to}`);
    const mid = st.segs[1];
    const mx = mid.ax + mid.dx * mid.len / 2, mz = mid.az + mid.dz * mid.len / 2;
    const near = Math.min(...path.slice(1).map(([x, z], i) => {
      const [px, pz] = path[i];
      const dx = x - px, dz = z - pz, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((mx - px) * dx + (mz - pz) * dz) / L2));
      return Math.hypot(px + dx * t - mx, pz + dz * t - mz);
    }));
    assert.ok(near < 2, `the way from ${st.from} to ${st.to} crosses its causeway (${near.toFixed(1)} m off)`);
    assert.equal(plan.floorAt(mx, mz), 0, 'a causeway belongs to no oasis');
  }
});

test('moon: seven moonbases in craters round a ring, every place reachable through the tubes, a locked base shut', async () => {
  const { planMoon, MOON, CRATERS, LANDMARKS, PADS } = await import('../../src/arcademia/world/moon/plan.js');
  const { buildLayerNav } = await import('../../src/arcademia/world/tree/nav.js');
  const { MOON_FLOORS, MAPS, mapById } = await import('../../src/arcademia/maps.js');
  const { SPECIES } = await import('../../src/arcademia/world/creatures/species.js');
  const { makeHat } = await import('../../src/arcademia/world/creatures/hats.js');
  const { teachingRealm, lessonsIn, MOON_LESSONS } = await import('../../src/arcademia/content/index.js');
  const moon = mapById('moon');
  assert.equal(moon.kind, 'moon');
  assert.equal(moon.realm, 'moon');
  assert.equal(moon.icon, '🌙');
  assert.equal(moon.floors, MOON_FLOORS);
  assert.deepEqual(moon.back, ['lesson.back.moon', 'lesson.backAria.moon']);
  assert.equal(MOON_FLOORS.length, FLOORS.length, 'one moonbase per floor');
  // The Moon teaches its own lessons now (the moon realm), not the land's.
  assert.equal(teachingRealm('moon'), 'moon');
  assert.equal(lessonsIn('moon'), MOON_LESSONS);
  // Its townsfolk are its own (in space suits, some with headsets under the helmet); none on any other map, no rabbits (kept for a teacher).
  const elsewhere = new Set(MAPS.filter((m) => m.id !== 'moon').flatMap((m) => m.floors.flatMap((f) => f.look.critters ?? [])));
  const locals = new Set(MOON_FLOORS.flatMap((f) => f.look.critters));
  assert.ok(locals.size >= 5, `${locals.size} kinds of moon townsfolk`);
  for (const k of locals) {
    assert.ok(SPECIES[k], `${k} has a recipe`);
    assert.ok(!elsewhere.has(k), `${k} is new to the Moon`);
    assert.ok(!/bunny|rabbit|hare/.test(k), `${k} is not a rabbit`);
  }
  const hats = new Set(MOON_FLOORS.flatMap((f) => f.look.hats ?? []));
  assert.ok(hats.has('headset') && !hats.has('bubble'), 'headsets under the space suits\' helmets (the suit has the bubble now)');
  assert.equal(moon.suit, 'moon', 'everyone on the Moon wears a space suit');
  for (const h of hats) if (h !== 'none') assert.ok(makeHat(h), `the ${h} hat exists`);
  const plan = planMoon(MOON_FLOORS.length);
  assert.equal(plan.kind, 'moon');
  assert.ok(plan.space && plan.float > 0 && plan.arrival, 'space sky, low gravity, an arrival view');
  assert.equal(plan.stairs.length, plan.floors.length - 1, 'a glass tube from each moonbase to the next');
  // Round a ring: every crater the same distance from the plain's middle, apart from each other.
  plan.floors.forEach((f, i) => {
    assert.ok(Math.abs(Math.hypot(f.centre.x, f.centre.z) - MOON.ring) < 0.01);
    assert.deepEqual([f.centre.x, f.centre.z].map((v) => Math.round(v)), CRATERS[i].map((v) => Math.round(v)));
  });
  for (let i = 0; i < plan.floors.length; i++) for (let j = i + 1; j < plan.floors.length; j++) {
    const a = plan.floors[i].centre, b = plan.floors[j].centre;
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > MOON.floorR * 2 + 20, `craters ${i + 1} and ${j + 1} apart`);
  }
  // The giant landmarks stand on the plain inside the ring, clear of every crater.
  for (const [id, L] of Object.entries(LANDMARKS)) for (const f of plan.floors) assert.ok(Math.hypot(L.x - f.centre.x, L.z - f.centre.z) > MOON.outR + (L.loop ?? 0) + L.r, `${id} clear of crater ${f.n}`);
  const blockers = plan.floors.flatMap((f) => f.places.map((p) => ({ x: p.x, z: p.z, y: f.y, r: SUBJECTS.includes(p.kind) ? 3.25 : p.r * 0.85 })));
  const nav = buildLayerNav(plan, { blockers });
  const s = plan.start;
  for (const f of plan.floors) {
    assert.equal(f.places.length, 8, `moonbase ${f.n}: three schools and five places`);
    const pads = Object.values(f.pads);
    assert.equal(pads.length, PADS.length);
    for (let i = 0; i < pads.length; i++) for (let j = i + 1; j < pads.length; j++) {
      const a = pads[i], b = pads[j];
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > a.pr + b.pr + 4, `moonbase ${f.n}: ${a.id} and ${b.id} apart`);
    }
    // Every deck stays on the crater's flat floor, inside the rim.
    for (const p of pads) assert.ok(Math.hypot(p.x - f.centre.x, p.z - f.centre.z) + p.pr < MOON.floorR, `moonbase ${f.n}: ${p.id} inside the crater`);
    for (const p of [...f.places.map((q) => q.at), f.portal.at, f.boss.at, f.chest.at, f.spawn, ...(f.worldGate ? [f.worldGate.at] : [])]) {
      const path = nav.findPath([s.x, s.z, s.y], [p.x, p.z, f.y]);
      assert.ok(path, `moonbase ${f.n}: (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) reachable`);
      assert.ok(Math.abs(path.at(-1)[2] - f.y) < 0.6, `moonbase ${f.n}: the path ends at walking height`);
    }
    for (const [x, z] of [...f.gemSpots, ...f.toySpots]) assert.equal(plan.floorAt(x, z), f.n, `moonbase ${f.n}: gem or toy spot on its own deck`);
    assert.ok(Math.abs(plan.height(f.spawn.x, f.spawn.z, f.y) - f.y) < 0.01);
  }
  assert.ok(plan.floors[0].worldGate, 'the World Portal is on the first moonbase');
  assert.ok(!plan.floors.slice(1).some((f) => f.worldGate), 'and only there');
  // Nothing to walk on out on the plain, in the craters' bowls between the decks, or on the giant landmarks.
  for (const [x, z] of [[0, 0], [LANDMARKS.lander.x, LANDMARKS.lander.z], [LANDMARKS.dish.x, LANDMARKS.dish.z], [0, 60], [300, 300]]) assert.equal(plan.surfaces(x, z).length, 0, `nothing walkable at (${x}, ${z})`);
  for (const f of plan.floors) {
    // Between the walk and the rim, away from the gangways and pads: bare crater floor.
    const a = f.theta + 270 * Math.PI / 180 + 0.5;
    assert.equal(plan.surfaces(f.centre.x + Math.sin(a) * 44, f.centre.z + Math.cos(a) * 44).length, 0, `moonbase ${f.n}: the crater floor is not a deck`);
    assert.equal(plan.surfaces(f.centre.x + f.out[0] * 60, f.centre.z + f.out[1] * 60).length, 0, `moonbase ${f.n}: nothing up on the rim`);
  }
  // Locked moonbases are shut (the airlock with them), the open one still walkable.
  const shut = buildLayerNav(plan, { blockers, locked: (n) => n >= 2 });
  const t2 = plan.floors[1].places[0].at;
  assert.equal(shut.findPath([s.x, s.z, s.y], [t2.x, t2.z, t2.y]), null, 'moonbase 2 is shut while locked');
  const t1 = plan.floors[0].places[2].at;
  assert.ok(shut.findPath([s.x, s.z, s.y], [t1.x, t1.z, t1.y]), 'moonbase 1 still open');
  const half = buildLayerNav(plan, { blockers, locked: (n) => n >= 5 });
  const t4 = plan.floors[3].places[1].at, t5 = plan.floors[4].places[1].at;
  assert.ok(half.findPath([s.x, s.z, s.y], [t4.x, t4.z, t4.y]), 'moonbase 4 open through three tubes');
  assert.equal(half.findPath([s.x, s.z, s.y], [t5.x, t5.z, t5.y]), null, 'moonbase 5 shut');
});

test('moon: a step never changes height or lands off the decks, and the glass tubes carry you from base to base', async () => {
  const { planMoon } = await import('../../src/arcademia/world/moon/plan.js');
  const { buildLayerNav } = await import('../../src/arcademia/world/tree/nav.js');
  const plan = planMoon(FLOORS.length);
  const blockers = plan.floors.flatMap((f) => f.places.map((p) => ({ x: p.x, z: p.z, y: f.y, r: SUBJECTS.includes(p.kind) ? 3.25 : p.r * 0.85 })));
  const nav = buildLayerNav(plan, { blockers });
  const { w, d, cell, x0, z0, h } = nav;
  let jumps = 0, cross = 0;
  for (let j = 1; j < d - 1; j++) for (let i = 1; i < w - 1; i++) {
    const y = h[j * w + i];
    if (y < -1e3) continue;
    const ax = x0 + (i + 0.5) * cell, az = z0 + (j + 0.5) * cell;
    const fa = plan.floorAt(ax, az, y);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const bx = ax + di * cell, bz = az + dj * cell;
      if (!nav.canStep(ax, az, bx, bz, y)) continue;
      if (!plan.locate(bx, bz, y) || Math.abs(plan.height(bx, bz, y) - y) > 0.7) jumps++;
      // From one moonbase straight onto another (not through a tube): never.
      const fb = plan.floorAt(bx, bz, y);
      if (fa && fb && fa !== fb) cross++;
    }
  }
  assert.equal(jumps, 0, 'steps off the decks or up and down');
  assert.equal(cross, 0, 'steps from one moonbase straight onto another');
  for (const st of plan.stairs) {
    const a = plan.floors[st.from - 1], b = plan.floors[st.to - 1];
    const path = nav.findPath([a.spawn.x, a.spawn.z, a.y], [b.spawn.x, b.spawn.z, b.y]);
    assert.ok(path, `moonbase ${st.from} to ${st.to}`);
    const mid = st.segs[1];
    const mx = mid.ax + mid.dx * mid.len / 2, mz = mid.az + mid.dz * mid.len / 2;
    const near = Math.min(...path.slice(1).map(([x, z], i) => {
      const [px, pz] = path[i];
      const dx = x - px, dz = z - pz, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((mx - px) * dx + (mz - pz) * dz) / L2));
      return Math.hypot(px + dx * t - mx, pz + dz * t - mz);
    }));
    assert.ok(near < 2, `the way from ${st.from} to ${st.to} goes through its tube (${near.toFixed(1)} m off)`);
    assert.equal(plan.floorAt(mx, mz), 0, 'a tube belongs to no moonbase');
    // The tube passes the rims between the craters (through a notch), not through another crater.
    for (const f of plan.floors) if (f.n !== st.from && f.n !== st.to) assert.ok(Math.hypot(mx - f.centre.x, mz - f.centre.z) > 80);
  }
});

test('mars: Olympus Mons — seven ring terraces all the way round a red volcano, every place reachable, a locked ring shut', async () => {
  const { planMars, MARS, SIGHTS } = await import('../../src/arcademia/world/mars/plan.js');
  const { buildLayerNav } = await import('../../src/arcademia/world/tree/nav.js');
  const { MARS_FLOORS, MAPS, mapById } = await import('../../src/arcademia/maps.js');
  const { SPECIES } = await import('../../src/arcademia/world/creatures/species.js');
  const { makeHat } = await import('../../src/arcademia/world/creatures/hats.js');
  const { teachersIn } = await import('../../src/arcademia/world/figures.js');
  const { worldsIn } = await import('../../src/arcademia/quests.js');
  const { teachingRealm } = await import('../../src/arcademia/content/index.js');
  const { planMoon } = await import('../../src/arcademia/world/moon/plan.js');
  assert.deepEqual(MAPS.map((m) => m.id), ['mountain', 'tree', 'lagoon', 'desert', 'moon', 'mars']);
  const mars = mapById('mars');
  assert.equal(mars.kind, 'mars');
  assert.equal(mars.realm, 'mars');
  assert.equal(mars.icon, '🔴');
  assert.equal(mars.floors, MARS_FLOORS);
  assert.equal(mars.whole, 'map.mars.whole');
  assert.equal(mars.wholeHint, 'map.mars.wholeHint');
  assert.deepEqual(mars.back, ['lesson.back.mars', 'lesson.backAria.mars']);
  assert.equal(MARS_FLOORS.length, FLOORS.length, 'one ring per floor');
  // Mars teaches its own lessons (the mars realm), not the land's.
  assert.equal(teachingRealm('mars'), 'mars');
  assert.ok(MARS_FLOORS.every((f, i) => f.n === i + 1 && f.ages === FLOORS[i].ages && f.look.martian && f.look.landmark));
  assert.equal(new Set(MARS_FLOORS.map((f) => f.look.landmark)).size, 7, 'every ring has its own landmark');

  // Its townsfolk are its own: no other map's critters, and no teacher's or puzzle boss's species anywhere.
  const locals = new Set(MARS_FLOORS.flatMap((f) => f.look.critters));
  const elsewhere = new Set(MAPS.filter((m) => m.id !== 'mars').flatMap((m) => m.floors.flatMap((f) => f.look.critters ?? [])));
  const cast = new Set(['land', 'forest', 'sea', 'desert', 'moon'].flatMap((r) => [...Object.values(teachersIn(r)).map((t) => t.species), ...Object.values(worldsIn(r)).map((w) => w.boss.species)]));
  assert.ok(locals.size >= 5, `${locals.size} kinds of Mars townsfolk`);
  for (const k of locals) {
    assert.ok(SPECIES[k], `${k} has a recipe`);
    assert.ok(!elsewhere.has(k), `${k} is new to Mars`);
    assert.ok(!cast.has(k), `${k} is not a teacher or a boss anywhere else`);
  }
  for (const h of new Set(MARS_FLOORS.flatMap((f) => f.look.hats).filter((h) => h !== 'none'))) assert.ok(makeHat(h), `the ${h} hat exists`);

  const plan = planMars(MARS_FLOORS.length);
  assert.equal(plan.kind, 'mars');
  assert.equal(plan.layers, 1, 'rings never lie over one another');
  assert.ok(plan.float > 0 && plan.float < planMoon(7).float, 'floatier than the Earth, less than the Moon');
  assert.equal(plan.stairs.length, plan.floors.length - 1, 'stairs from each ring to the next');
  plan.floors.forEach((f, k) => {
    assert.equal(f.y, k * MARS.floorH, `ring ${f.n} stands a storey above the last`);
    if (k) assert.ok(f.ro < plan.floors[k - 1].ri, `ring ${f.n} is inside the ring below, a cliff between`);
  });
  // The caldera's pit is inside the top ring and lower; the giants stand on the plain round the foot.
  const top = plan.floors.at(-1);
  assert.ok(plan.rock(0, 0) < top.y - 6, 'the caldera pit is below the top ring');
  assert.equal(plan.floorAt(0, 0), 0, 'nobody walks into the pit');
  for (const s of [SIGHTS.rocket, SIGHTS.village, SIGHTS.rover]) assert.ok(Math.hypot(s.x, s.z) > plan.floors[0].ro + MARS.esc + s.r, 'the giants stand on the plain');

  const blockers = plan.floors.flatMap((f) => [...f.places.map((p) => ({ x: p.x, z: p.z, y: f.y, r: SUBJECTS.includes(p.kind) ? 3.25 : p.r * 0.85 })), { x: f.boss.x, z: f.boss.z, y: f.y, r: 1.1 }, { x: f.chest.x, z: f.chest.z, y: f.y, r: 0.9 }, { x: f.chest.rock.x, z: f.chest.rock.z, y: f.y, r: 1.6 }]);
  const nav = buildLayerNav(plan, { blockers });
  const s = plan.start;
  for (const f of plan.floors) {
    assert.equal(f.places.length, 8, `ring ${f.n}: three schools and five places`);
    // All the way round the mountain: buildings in every quarter.
    const quadrants = new Set(f.places.map((p) => Math.floor(((Math.atan2(p.x, p.z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2))));
    assert.equal(quadrants.size, 4, `ring ${f.n} has buildings on every side of the volcano`);
    for (const p of [...f.places.map((q) => q.at), f.portal.at, f.boss.at, f.chest.at]) {
      const path = nav.findPath([s.x, s.z, s.y], [p.x, p.z, f.y]);
      assert.ok(path, `ring ${f.n}: (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) reachable`);
      assert.ok(Math.abs(path.at(-1)[2] - f.y) < 0.6, `ring ${f.n}: the path ends on that ring`);
    }
    for (const p of f.plinths) assert.ok(Math.abs(plan.height(p.x, p.z, f.y) - (f.y + 0.55)) < 0.05, `ring ${f.n}: the ${p.subject} school stands on its plinth`);
    for (const [x, z] of [...f.gemSpots, ...f.toySpots]) assert.equal(plan.floorAt(x, z), f.n, `ring ${f.n}: gem or toy spot on its own ring`);
    // Places face out, away from the volcano's middle, towards the camera.
    for (const p of f.places) assert.ok(Math.hypot(p.at.x, p.at.z) > Math.hypot(p.x, p.z), `ring ${f.n}: the ${p.kind} faces out`);
  }
  const gate = plan.floors[0].worldGate;
  assert.ok(gate && nav.findPath([s.x, s.z, s.y], [gate.at.x, gate.at.z, 0]), 'the World Portal is on the first ring, and reachable');
  assert.ok(Math.abs(plan.facing(0, 50) - 0) < 1e-9 && Math.abs(plan.facing(50, 0) - Math.PI / 2) < 1e-9, 'the camera looks from outside the mountain');
  const shut = buildLayerNav(plan, { blockers, locked: (n) => n >= 2 });
  const t2 = plan.floors[1].places[0].at, t1 = plan.floors[0].places[2].at;
  // (A path to a shut ring may still lead to the nearest open spot below it, never onto it.)
  const reaches = (n, from, to) => {
    const p = n.findPath(from, to);
    return Boolean(p && Math.abs(p.at(-1)[2] - to[2]) < 0.6 && Math.hypot(p.at(-1)[0] - to[0], p.at(-1)[1] - to[1]) < 3);
  };
  assert.ok(!reaches(shut, [s.x, s.z, s.y], [t2.x, t2.z, t2.y]), 'ring 2 is shut while locked');
  assert.ok(reaches(shut, [s.x, s.z, s.y], [t1.x, t1.z, t1.y]), 'ring 1 still open');
  const half = buildLayerNav(plan, { blockers, locked: (n) => n >= 5 });
  const t4 = plan.floors[3].places[0].at, t5 = plan.floors[4].places[0].at;
  assert.ok(reaches(half, [s.x, s.z, s.y], [t4.x, t4.z, t4.y]), 'ring 4 open up three flights of stairs');
  assert.ok(!reaches(half, [s.x, s.z, s.y], [t5.x, t5.z, t5.y]), 'ring 5 shut');
});

test('mars: a step never jumps from one ring to another (only the stairs go up), and the stairs cut through the rock', async () => {
  const { planMars } = await import('../../src/arcademia/world/mars/plan.js');
  const { buildLayerNav } = await import('../../src/arcademia/world/tree/nav.js');
  const plan = planMars(FLOORS.length);
  const nav = buildLayerNav(plan, {});
  const { w, d, cell, x0, z0, open, floorOf, h } = nav;
  let jumps = 0, cliffs = 0, onStairs = 0;
  for (let j = 1; j < d - 1; j++) for (let i = 1; i < w - 1; i++) {
    const a = j * w + i;
    if (!open[a]) continue;
    if (!floorOf[a]) onStairs++;
    const ax = x0 + (i + 0.5) * cell, az = z0 + (j + 0.5) * cell;
    for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const b = (j + dj) * w + i + di;
      if (!open[b]) continue;
      if (!nav.canStep(ax, az, ax + di * cell, az + dj * cell, h[a])) continue;
      if (floorOf[a] && floorOf[b] && floorOf[a] !== floorOf[b]) jumps++;
      if (Math.abs(h[a] - h[b]) > 1.2) cliffs++;
    }
  }
  assert.equal(jumps, 0, 'steps straight from one ring onto another');
  assert.equal(cliffs, 0, 'steps up or down a cliff');
  assert.ok(onStairs > 50, 'the stairs are walkable');
  for (const st of plan.stairs) {
    const path = nav.findPath([st.a.x, st.a.z, st.a.y], [st.b.x, st.b.z, st.b.y]);
    assert.ok(path && Math.abs(path.at(-1)[2] - st.b.y) < 0.6, `stairs ${st.from} to ${st.to} climb a storey`);
    // Half-way up, the rock is carved down under the steps.
    const mx = (st.a.x + st.b.x) / 2, mz = (st.a.z + st.b.z) / 2;
    assert.ok(plan.rock(mx, mz) < plan.height(mx, mz, (st.a.y + st.b.y) / 2), `stairs ${st.from}: the rock is cut away under the steps`);
  }
});

test('mars: the Learning Mountain keeps exactly its plan and ground', async () => {
  const { createHash } = await import('node:crypto');
  const { planMountain } = await import('../../src/arcademia/world/layout.js');
  const { buildTerrain } = await import('../../src/arcademia/world/terrain.js');
  const plan = planMountain(FLOORS.length);
  const h = createHash('sha256');
  for (let z = -260; z <= 110; z += 1.7) for (let x = -150; x <= 150; x += 1.9) h.update(`${plan.ground(x, z).toFixed(4)},${plan.height(x, z).toFixed(4)},${plan.floorAt(x, z)};`);
  assert.equal(h.digest('hex').slice(0, 16), '22cc5d1a84d6ee9e', 'the mountain\'s ground');
  const layout = JSON.stringify({ floors: plan.floors.map((f) => ({ ...f, frontZ: undefined, backZ: undefined })), stairs: plan.stairs, river: { ...plan.river, distToBrook: undefined } });
  assert.equal(createHash('sha256').update(layout).digest('hex').slice(0, 16), '81f5387ef335c4a2', 'the mountain\'s terraces, places, stairs and stream');
  const m = buildTerrain(plan, FLOORS);
  const t = createHash('sha256');
  const p = m.geometry.attributes.position.array, c = m.geometry.attributes.color.array;
  for (let i = 0; i < p.length; i += 7) t.update(p[i].toFixed(3) + c[i].toFixed(3));
  assert.equal(t.digest('hex').slice(0, 16), '0d0979a03bff04e4', 'the mountain\'s terrain mesh and colours');
});

test('desert realm: its own 42 lessons, teachers, stories, puzzle bosses and voices', async () => {
  const { DESERT_LESSONS, teachingRealm } = await import('../../src/arcademia/content/index.js');
  const { teachersIn } = await import('../../src/arcademia/world/figures.js');
  const { worldsIn, questFor } = await import('../../src/arcademia/quests.js');
  const { SPECIES } = await import('../../src/arcademia/world/creatures/species.js');
  const { makeHat } = await import('../../src/arcademia/world/creatures/hats.js');
  const { REALM_TEACHER_OF, characterIds } = await import('../../src/arcademia/voice/script.js');
  const { CAST, CAST_BY_LANG } = await import('../../src/arcademia/voice/generated.js');
  const { DESERT_FLOORS } = await import('../../src/arcademia/maps.js');
  const { tIn } = await import('../../src/arcademia/i18n/index.js');
  // 42 well-formed lessons, two per subject on every oasis, all its own.
  assert.equal(DESERT_LESSONS.length, 42);
  assert.deepEqual(DESERT_LESSONS.flatMap((l) => lessonProblems(l, { gens: GENERATORS })), []);
  assert.ok(DESERT_LESSONS.every((l) => l.realm === 'desert' && /-desert-/.test(l.id)));
  assert.equal(lessonsIn('desert'), DESERT_LESSONS);
  assert.equal(teachingRealm('desert'), 'desert', 'the desert teaches its own lessons now, not the land\'s');
  for (const f of FLOORS) for (const s of SUBJECTS) assert.equal(DESERT_LESSONS.filter((l) => l.floor === f.n && l.subject === s).length, 2, `oasis ${f.n} ${s}`);
  // Its teachers are new animals: no other world's teachers, none of its own townsfolk.
  const mine = teachersIn('desert');
  const others = ['land', 'forest', 'sea'].flatMap((r) => Object.values(teachersIn(r)).map((t) => t.species));
  const townsfolk = new Set(DESERT_FLOORS.flatMap((f) => f.look.critters));
  for (const s of SUBJECTS) {
    const t = mine[s];
    assert.ok(SPECIES[t.species], `${t.species} has a recipe`);
    assert.ok(!others.includes(t.species) && !townsfolk.has(t.species), `${t.species} is new to the desert's teachers`);
    assert.ok(t.name && t.name !== `desert.teacher.${s}`, `the ${s} teacher has a name`);
    for (const lang of ['ko', 'es', 'ja', 'zh']) assert.notEqual(tIn(lang, `desert.teacher.${s}`), `desert.teacher.${s}`);
  }
  assert.equal(SPECIES.hippo().hat.wear, 'lotus');
  for (const h of ['lotus', 'wig', 'pith']) assert.ok(makeHat(h), `the ${h} hat exists`);
  // Its quests are told by its own teachers; each oasis has its own story and puzzle boss.
  const h1 = DESERT_LESSONS.find((l) => l.subject === 'history');
  assert.equal(questFor(h1).teacher.species, mine.history.species);
  const w = worldsIn('desert');
  for (const f of FLOORS) {
    assert.ok(SPECIES[w[f.n].boss.species], `oasis ${f.n}'s boss has a recipe`);
    assert.ok(w[f.n].story && !w[f.n].story.startsWith('desert.world'), `oasis ${f.n} has a story`);
    assert.notEqual(w[f.n].story, worldsIn('land')[f.n].story, `oasis ${f.n}'s story is its own, not the land's`);
    assert.ok(w[f.n].boss.name && w[f.n].boss.line, `oasis ${f.n} has a boss name and line`);
  }
  // Voices: its teachers and bosses are in the script, each with a designed voice (bosses never scary).
  const ids = characterIds();
  for (const id of [...Object.values(REALM_TEACHER_OF.desert), ...FLOORS.map((f) => `desert-boss-${f.n}`)]) {
    assert.ok(ids.includes(id), `${id} in the voice script`);
    assert.ok(CAST[id]?.design, `${id} has a voice design`);
    if (id.startsWith('desert-boss-')) assert.match(CAST[id].design, /never (scary|menacing)|more cuddly than scary/, `${id} must not be scary`);
  }
  for (const id of Object.values(REALM_TEACHER_OF.desert)) assert.ok(CAST_BY_LANG.ko[id], `${id} has a Korean voice`);
});

test('moon realm: its own 42 lessons, teachers, stories, puzzle bosses, museum objects and voices', async () => {
  const { MOON_LESSONS, teachingRealm } = await import('../../src/arcademia/content/index.js');
  const { ARTIFACTS, LOOKS } = await import('../../src/arcademia/content/schema.js');
  const { ARTIFACT_MODELS } = await import('../../src/arcademia/world/artifacts.js');
  const { teachersIn } = await import('../../src/arcademia/world/figures.js');
  const { worldsIn, questFor } = await import('../../src/arcademia/quests.js');
  const { SPECIES } = await import('../../src/arcademia/world/creatures/species.js');
  const { makeHat } = await import('../../src/arcademia/world/creatures/hats.js');
  const { REALM_TEACHER_OF, characterIds, buildScript } = await import('../../src/arcademia/voice/script.js');
  const { CAST, CAST_BY_LANG } = await import('../../src/arcademia/voice/generated.js');
  const { MOON_FLOORS } = await import('../../src/arcademia/maps.js');
  const { tIn } = await import('../../src/arcademia/i18n/index.js');
  // 42 well-formed lessons, two per subject on every moonbase, all its own.
  assert.equal(MOON_LESSONS.length, 42);
  assert.deepEqual(MOON_LESSONS.flatMap((l) => lessonProblems(l, { gens: GENERATORS })), []);
  assert.ok(MOON_LESSONS.every((l) => l.realm === 'moon' && /-moon-/.test(l.id)));
  assert.equal(lessonsIn('moon'), MOON_LESSONS);
  assert.equal(teachingRealm('moon'), 'moon', 'the Moon teaches its own lessons now, not the land\'s');
  for (const f of FLOORS) for (const s of SUBJECTS) assert.equal(MOON_LESSONS.filter((l) => l.floor === f.n && l.subject === s).length, 2, `moonbase ${f.n} ${s}`);
  // Its lessons' guides and museum objects exist: every costume is drawn, every object modelled.
  for (const l of MOON_LESSONS.filter((x) => x.subject === 'history')) {
    assert.ok(LOOKS.includes(l.dialogue.npc.look), `${l.id}: look ${l.dialogue.npc.look}`);
    assert.ok(ARTIFACT_MODELS.includes(l.artifact.model), `${l.id}: a model for ${l.artifact.model}`);
  }
  for (const a of ARTIFACTS) assert.ok(ARTIFACT_MODELS.includes(a), `the museum can show ${a}`);
  for (const h of ['starcap', 'crescent', 'spacecap', 'visor']) assert.ok(makeHat(h), `the ${h} hat exists`);
  // Its teachers are new animals: no other world's teachers, none of its own townsfolk, and not the bunny sprite.
  const mine = teachersIn('moon');
  const others = ['land', 'forest', 'sea', 'desert'].flatMap((r) => Object.values(teachersIn(r)).map((t) => t.species));
  const townsfolk = new Set(MOON_FLOORS.flatMap((f) => f.look.critters));
  assert.equal(new Set(Object.values(mine).map((t) => t.species)).size, 3, 'three different teachers');
  for (const s of SUBJECTS) {
    const t = mine[s];
    assert.ok(SPECIES[t.species], `${t.species} has a recipe`);
    assert.ok(!others.includes(t.species) && !townsfolk.has(t.species) && t.species !== 'bunny', `${t.species} is new to the Moon's teachers`);
    assert.ok(t.name && t.name !== `moon.teacher.${s}`, `the ${s} teacher has a name`);
    for (const lang of ['ko', 'es', 'ja', 'zh']) assert.notEqual(tIn(lang, `moon.teacher.${s}`), `moon.teacher.${s}`);
    // Each wears its own space gear.
    const wear = SPECIES[t.species]().hat.wear;
    assert.ok(wear && makeHat(wear), `the ${s} teacher wears a ${wear}`);
  }
  assert.equal(mine.math.species, 'moonrabbit', 'the moon rabbit of the old story teaches math');
  // Its quests are told by its own teachers; each moonbase has its own story and puzzle boss, a Moon critter.
  const h1 = MOON_LESSONS.find((l) => l.subject === 'history');
  assert.equal(questFor(h1).teacher.species, mine.history.species);
  assert.match(questFor(MOON_LESSONS[0]).intro, /astronaut/);
  const w = worldsIn('moon');
  for (const f of FLOORS) {
    assert.ok(SPECIES[w[f.n].boss.species], `moonbase ${f.n}'s boss has a recipe`);
    assert.ok(w[f.n].story && !w[f.n].story.startsWith('moon.world'), `moonbase ${f.n} has a story`);
    assert.notEqual(w[f.n].story, worldsIn('land')[f.n].story, `moonbase ${f.n}'s story is its own, not the land's`);
    assert.ok(w[f.n].boss.name && w[f.n].boss.line, `moonbase ${f.n} has a boss name and line`);
    for (const lang of ['ko', 'es', 'ja', 'zh']) for (const k of ['story', 'boss', 'line']) assert.notEqual(tIn(lang, `moon.world.${f.n}.${k}`), `moon.world.${f.n}.${k}`);
  }
  assert.match(w[1].story, /Landing Crater/, 'the arrival toast is the first moonbase\'s own story');
  for (const lang of ['en', 'ko', 'es', 'ja', 'zh']) for (const s of SUBJECTS) assert.notEqual(tIn(lang, `moon.hello.${s}`), `moon.hello.${s}`);
  // Voices: its teachers and bosses are in the script, each with a designed voice (bosses never scary).
  const ids = characterIds();
  for (const id of [...Object.values(REALM_TEACHER_OF.moon), ...FLOORS.map((f) => `moon-boss-${f.n}`)]) {
    assert.ok(ids.includes(id), `${id} in the voice script`);
    assert.ok(CAST[id]?.design, `${id} has a voice design`);
    if (id.startsWith('moon-boss-')) assert.match(CAST[id].design, /never (scary|menacing)/, `${id} must not be scary`);
  }
  for (const id of Object.values(REALM_TEACHER_OF.moon)) assert.ok(CAST_BY_LANG.ko[id], `${id} has a Korean voice`);
  const lines = buildScript('en');
  assert.ok(lines.some((l) => l.char === 'mochi' && l.id === 't.moon.hello.math'), 'Miss Mochi greets in her own words');
  assert.ok(lines.some((l) => l.char === 'comet' && l.id.startsWith('l.p1-moon-')), 'Dr. Comet reads the Moon\'s physics');
});

test('mars realm: its own 42 lessons, teachers, stories, puzzle bosses, museum objects and voices', async () => {
  const { MARS_LESSONS, teachingRealm } = await import('../../src/arcademia/content/index.js');
  const { ARTIFACTS, LOOKS } = await import('../../src/arcademia/content/schema.js');
  const { ARTIFACT_MODELS } = await import('../../src/arcademia/world/artifacts.js');
  const { teachersIn, makeCreature } = await import('../../src/arcademia/world/figures.js');
  const { worldsIn, questFor } = await import('../../src/arcademia/quests.js');
  const { SPECIES } = await import('../../src/arcademia/world/creatures/species.js');
  const { makeHat, HATS_IN_HELMET } = await import('../../src/arcademia/world/creatures/hats.js');
  const { REALM_TEACHER_OF, characterIds, buildScript } = await import('../../src/arcademia/voice/script.js');
  const { CAST, CAST_BY_LANG } = await import('../../src/arcademia/voice/generated.js');
  const { MAPS, MARS_FLOORS } = await import('../../src/arcademia/maps.js');
  const { tIn, loadLocale } = await import('../../src/arcademia/i18n/index.js');
  for (const lang of ['ko', 'es', 'ja', 'zh']) await loadLocale(lang);
  // 42 well-formed lessons, two per subject on every terrace, all its own.
  assert.equal(MARS_LESSONS.length, 42);
  assert.deepEqual(MARS_LESSONS.flatMap((l) => lessonProblems(l, { gens: GENERATORS })), []);
  assert.ok(MARS_LESSONS.every((l) => l.realm === 'mars' && /-mars-/.test(l.id)));
  assert.equal(lessonsIn('mars'), MARS_LESSONS);
  assert.equal(teachingRealm('mars'), 'mars', 'Mars teaches its own lessons now, not the land\'s');
  for (const f of FLOORS) for (const s of SUBJECTS) assert.equal(MARS_LESSONS.filter((l) => l.floor === f.n && l.subject === s).length, 2, `terrace ${f.n} ${s}`);
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length, 'lesson ids are unique across every realm');
  // Its lessons' guides and museum objects exist: every costume is drawn, every object modelled.
  for (const l of MARS_LESSONS.filter((x) => x.subject === 'history')) {
    assert.ok(LOOKS.includes(l.dialogue.npc.look), `${l.id}: look ${l.dialogue.npc.look}`);
    assert.ok(ARTIFACT_MODELS.includes(l.artifact.model), `${l.id}: a model for ${l.artifact.model}`);
  }
  for (const a of ARTIFACTS) assert.ok(ARTIFACT_MODELS.includes(a), `the museum can show ${a}`);
  // Its teachers are new animals: no other world's teachers or puzzle bosses, and nobody's townsfolk on any map.
  const mine = teachersIn('mars');
  const others = ['land', 'forest', 'sea', 'desert', 'moon'].flatMap((r) => [...Object.values(teachersIn(r)).map((t) => t.species), ...Object.values(worldsIn(r)).map((w) => w.boss.species)]);
  const townsfolk = new Set(MAPS.flatMap((m) => m.floors.flatMap((f) => f.look.critters ?? [])));
  assert.equal(new Set(Object.values(mine).map((t) => t.species)).size, 3, 'three different teachers');
  for (const s of SUBJECTS) {
    const t = mine[s];
    assert.ok(SPECIES[t.species], `${t.species} has a recipe`);
    assert.ok(!others.includes(t.species) && !townsfolk.has(t.species), `${t.species} is new to Mars's teachers`);
    assert.ok(t.name && t.name !== `mars.teacher.${s}`, `the ${s} teacher has a name`);
    for (const lang of ['ko', 'es', 'ja', 'zh']) assert.notEqual(tIn(lang, `mars.teacher.${s}`), `mars.teacher.${s}`);
    // Each keeps a touch of their own on under the space helmet.
    const wear = SPECIES[t.species]().hat.wear;
    assert.ok(wear && makeHat(wear) && HATS_IN_HELMET.has(wear), `the ${s} teacher wears a ${wear} under the helmet`);
    const suited = makeCreature({ species: t.species, lod: 'low', suit: 'mars' });
    assert.equal(suited.suit, 'mars');
    assert.ok(suited.bones.head.children.some((o) => !o.isBone && !o.userData.helmet && o.children.length === 1), `${t.species} keeps its ${wear} inside the helmet`);
  }
  assert.deepEqual(Object.values(mine).map((t) => t.species), ['otter', 'alpaca', 'mole']);
  // Its quests are told by its own teachers; each terrace has its own story and puzzle boss, a Mars critter.
  const h1 = MARS_LESSONS.find((l) => l.subject === 'history');
  assert.equal(questFor(h1).teacher.species, mine.history.species);
  assert.match(questFor(MARS_LESSONS[0]).intro, /Mars/);
  const w = worldsIn('mars');
  const locals = new Set(MARS_FLOORS.flatMap((f) => f.look.critters));
  for (const f of FLOORS) {
    assert.ok(SPECIES[w[f.n].boss.species], `terrace ${f.n}'s boss has a recipe`);
    assert.ok(locals.has(w[f.n].boss.species) || w[f.n].boss.species === 'puff', `terrace ${f.n}'s boss is a Mars critter`);
    assert.ok(w[f.n].story && !w[f.n].story.startsWith('mars.world'), `terrace ${f.n} has a story`);
    assert.notEqual(w[f.n].story, worldsIn('land')[f.n].story, `terrace ${f.n}'s story is its own, not the land's`);
    assert.ok(w[f.n].boss.name && w[f.n].boss.line, `terrace ${f.n} has a boss name and line`);
    for (const lang of ['ko', 'es', 'ja', 'zh']) for (const k of ['story', 'boss', 'line']) assert.notEqual(tIn(lang, `mars.world.${f.n}.${k}`), `mars.world.${f.n}.${k}`);
  }
  assert.match(w[1].story, /Landing Plains/, 'the arrival toast is the first terrace\'s own story');
  for (const lang of ['en', 'ko', 'es', 'ja', 'zh']) for (const s of SUBJECTS) {
    assert.notEqual(tIn(lang, `mars.hello.${s}`), `mars.hello.${s}`);
    assert.notEqual(tIn(lang, `mars.quest.${s}`), `mars.quest.${s}`);
  }
  // Voices: its teachers and bosses are in the script, each with a designed voice (bosses never scary).
  const ids = characterIds();
  for (const id of [...Object.values(REALM_TEACHER_OF.mars), ...FLOORS.map((f) => `mars-boss-${f.n}`)]) {
    assert.ok(ids.includes(id), `${id} in the voice script`);
    assert.ok(CAST[id]?.design, `${id} has a voice design`);
    if (id.startsWith('mars-boss-')) assert.match(CAST[id].design, /never (scary|menacing)/, `${id} must not be scary`);
  }
  for (const id of Object.values(REALM_TEACHER_OF.mars)) assert.ok(CAST_BY_LANG.ko[id], `${id} has a Korean voice`);
  const lines = buildScript('en');
  assert.ok(lines.some((l) => l.char === 'ruby' && l.id === 't.mars.hello.math'), 'Miss Ruby greets in her own words');
  assert.ok(lines.some((l) => l.char === 'woolly' && l.id.startsWith('t.mars.quest.history~h1-mars-')), 'Professor Woolly tells the Mars Museum quests');
  assert.ok(lines.some((l) => l.char === 'digby' && l.id.startsWith('l.p1-mars-')), 'Dr. Digby reads Mars\'s physics');
  assert.ok(lines.some((l) => l.char === 'mars-boss-1' && l.id === 't.mars.world.1.line'), 'the first terrace\'s boss has its line');
});
