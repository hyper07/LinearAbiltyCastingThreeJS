import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { GENERATORS, makeProblem, makeQuiz, MATH_LESSONS } from '../../src/arcademia/content/math.js';
import { LESSONS, lessonById, quizFor, quizLength } from '../../src/arcademia/content/index.js';
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
  const f1 = LESSONS.filter((l) => l.floor === 1);
  const need = neededOn(1);
  assert.equal(need, Math.ceil(f1.length * (2 / 3)));
  const some = Object.fromEntries(f1.slice(0, need - 1).map((l) => [l.id, 3]));
  assert.deepEqual([...openFloors(some)], [1], 'one short');
  some[f1[need - 1].id] = 1;
  assert.deepEqual([...openFloors(some)], [1, 2], 'one star is enough for a lesson to count');
  // Floor 3 needs floor 2's lessons, and floor 2 open.
  const f2 = Object.fromEntries(LESSONS.filter((l) => l.floor === 2).map((l) => [l.id, 2]));
  assert.deepEqual([...openFloors(f2)], [1], 'floor 2 done but floor 1 not: still only floor 1');
  const all = Object.fromEntries(LESSONS.map((l) => [l.id, 3]));
  assert.equal(openFloors(all).size, FLOORS.length);
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
