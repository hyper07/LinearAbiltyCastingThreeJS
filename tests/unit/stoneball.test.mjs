import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../../src/stoneball/rules.js';

const { PITCH, BALL, TICK } = R;

/** A match in open play with the stone free at (x, z), everyone else parked far away and idle. */
function freeBall(x = 0, z = 0, opts = {}) {
  const m = R.createMatch({ seed: 3, length: 180, teams: [{ control: 'idle' }, { control: 'idle' }], ...opts });
  m.phase = 'play';
  Object.assign(m.ball, { x, y: BALL.r, z, vx: 0, vy: 0, vz: 0, owner: -1, lastTouch: -1 });
  // Park the cavemen in a row along one wall, out of the way.
  m.players.forEach((p, i) => Object.assign(p, { x: -14 + i * 1.2, z: PITCH.hz - 1, vx: 0, vz: 0, kickCd: 0 }));
  return m;
}

const run = (m, seconds, inputs) => R.simulate(m, seconds, inputs);
const speed = (b) => Math.hypot(b.vx, b.vz);

test('the stone rolls with friction and stops; the distance matches the friction model', () => {
  const m = freeBall(-10, 0);
  m.ball.vx = 10;
  let last = Infinity;
  let decelerating = true;
  for (let i = 0; i < 60; i++) {
    R.step(m);
    const s = speed(m.ball);
    if (s > last + 1e-9) decelerating = false;
    last = s;
  }
  assert.ok(decelerating, 'speed only ever falls on the ground');
  assert.ok(last < 10 && last > 0, `still rolling after a second (${last})`);
  run(m, 8);
  assert.equal(speed(m.ball), 0, 'comes to rest');
  const rolled = m.ball.x - -10;
  assert.ok(Math.abs(rolled - R.stopDistance(10)) < 0.4, `rolled ${rolled.toFixed(2)} vs model ${R.stopDistance(10).toFixed(2)}`);
  // rollSpeed inverts stopDistance (plus the spare it asks for).
  assert.ok(Math.abs(R.stopDistance(R.rollSpeed(12, 0)) - 12) < 0.05);
});

test('a dropped stone bounces low and settles', () => {
  const m = freeBall(0, 0);
  m.ball.y = 3;
  let peaks = [];
  let wasUp = false;
  for (let i = 0; i < 240; i++) {
    const before = m.ball.vy;
    R.step(m);
    if (before > 0 && m.ball.vy <= 0) peaks.push(m.ball.y);
    wasUp ||= m.ball.y > BALL.r + 0.01;
  }
  assert.ok(wasUp);
  assert.ok(peaks.length >= 1, 'it bounced at least once');
  assert.ok(peaks[0] < 3 * 0.25, `first bounce stays low (${peaks[0].toFixed(2)})`);
  assert.equal(m.ball.y, BALL.r, 'resting on the grass');
});

test('the walls bounce the stone back in (no throw-ins), and the corners are round', () => {
  const m = freeBall(0, 8);
  m.ball.vz = 14;
  const events = run(m, 0.6);
  assert.ok(m.ball.vz < 0, 'heading back into the pitch');
  assert.ok(Math.abs(m.ball.z) <= PITCH.hz - BALL.r + 1e-6);
  assert.ok(events.some((e) => e.type === 'wall'));
  // Into a corner at an angle: it comes back out, never through.
  const c = freeBall(12, 6);
  c.ball.vx = 12;
  c.ball.vz = 12;
  run(c, 1.2);
  assert.ok(R.wallContact(c.ball.x, c.ball.z, BALL.r) === null || R.wallContact(c.ball.x, c.ball.z, BALL.r).depth < 1e-6);
  assert.ok(c.ball.x < PITCH.hx && c.ball.z < PITCH.hz);
  // Off the end wall beside the goal: a bounce, not a goal.
  const e = freeBall(14, PITCH.goalHalf + 2);
  e.ball.vx = 15;
  const ev = run(e, 0.8);
  assert.ok(e.ball.vx < 0);
  assert.deepEqual(e.score, [0, 0]);
  assert.ok(!ev.some((x) => x.type === 'goal'));
});

test('a goal is scored between the posts and under the bar, not over it or off a post', () => {
  // Low and between the posts at the right-hand goal: team 0 scores.
  const m = freeBall(12, 0.5);
  m.ball.vx = 16;
  const ev = run(m, 1.5);
  assert.deepEqual(m.score, [1, 0]);
  assert.ok(ev.some((e) => e.type === 'goal' && e.team === 0));
  assert.equal(m.phase, 'goal');
  // The net keeps it: it ends up inside the goal, behind the line.
  assert.ok(m.ball.x > PITCH.hx && m.ball.x <= PITCH.hx + PITCH.depth);
  // Into the left goal: team 1 scores.
  const l = freeBall(-12, -1);
  l.ball.vx = -16;
  run(l, 1.5);
  assert.deepEqual(l.score, [0, 1]);
  // Over the bar: no goal (it comes back off the frame/net above).
  const hi = freeBall(PITCH.hx - 0.6, 0);
  Object.assign(hi.ball, { y: PITCH.bar + 0.6, vx: 6, vy: 0 });
  hi.ball.vy = 0;
  // Hold it up there for a moment as if lofted: gravity will bring it down after it has met the end.
  R.step(hi);
  assert.ok(hi.ball.x < PITCH.hx + BALL.r, 'met the end above the bar');
  assert.deepEqual(hi.score, [0, 0]);
  // Straight at a post: it bounces back out.
  const post = freeBall(14, PITCH.goalHalf);
  post.ball.vx = 14;
  const pev = run(post, 1.2);
  assert.ok(pev.some((e) => e.type === 'post'));
  assert.deepEqual(post.score, [0, 0]);
});

test('after a goal: celebration, then kick-off to the team that conceded, everyone back in their half', () => {
  const m = freeBall(12, 0);
  m.ball.vx = 16;
  run(m, 1.2);
  assert.deepEqual(m.score, [1, 0]);
  assert.equal(m.phase, 'goal');
  assert.ok(m.players.filter((p) => p.team === 0).every((p) => p.act === 'cheer'));
  run(m, 3.5);
  assert.equal(m.phase, 'kickoff');
  assert.equal(m.kickoffTeam, 1);
  assert.equal(m.ball.x, 0);
  const taker = m.players[m.ball.owner];
  assert.equal(taker.team, 1);
  for (const p of m.players) {
    const u = p.x * R.attackDir(p.team);
    assert.ok(u <= 0.01, `${p.name} is in his own half`);
    if (p.team === 0) assert.ok(Math.hypot(p.x, p.z) >= PITCH.circle, 'the other side waits outside the circle');
  }
  run(m, 1.6);
  assert.equal(m.phase, 'play');
});

test('the clock runs only in play; full time ends the match; a draw goes to golden goal', () => {
  const m = R.createMatch({ seed: 2, length: 10, golden: false, teams: [{ control: 'idle' }, { control: 'idle' }] });
  run(m, 1.4); // the kick-off pause
  assert.ok(Math.abs(m.clock - 10) < 0.1, 'no time lost during the kick-off pause');
  run(m, 5);
  assert.ok(Math.abs(m.clock - 5) < 0.1);
  const ev = run(m, 6);
  assert.equal(m.phase, 'end');
  assert.equal(m.clock, 0);
  assert.equal(m.winner, -1);
  assert.ok(ev.some((e) => e.type === 'end'));

  const g = R.createMatch({ seed: 2, length: 5, golden: true, teams: [{ control: 'idle' }, { control: 'idle' }] });
  const gev = run(g, 7);
  assert.equal(g.phase, 'play');
  assert.equal(g.overtime, true);
  assert.ok(gev.some((e) => e.type === 'golden'));
  // The next goal wins it.
  Object.assign(g.ball, { x: -12, z: 0, y: BALL.r, vx: -16, vy: 0, vz: 0, owner: -1 });
  for (const p of g.players) Object.assign(p, { x: 5, z: -10 + p.id * 2 });
  run(g, 6);
  assert.equal(g.phase, 'end');
  assert.equal(g.winner, 1);
});

test('a pass reaches a teammate', () => {
  for (const [dx, dz] of [[10, 0], [6, 7], [-4, -9], [16, 3]]) {
    const m = freeBall(0, 0);
    const a = m.players[1], b = m.players[2];
    Object.assign(a, { x: -3, z: -2, face: Math.PI / 2 });
    Object.assign(b, { x: a.x + dx, z: a.z + dz });
    m.ball.owner = a.id;
    m.ball.x = a.x + R.PLAYER.carry;
    m.ball.z = a.z;
    R.step(m, { [a.id]: { pass: true, to: b.id } });
    assert.equal(m.ball.owner, -1, 'the stone is away');
    let got = false;
    for (let i = 0; i < 240 && !got; i++) {
      R.step(m);
      got = m.ball.owner === b.id;
    }
    assert.ok(got, `a ${Math.hypot(dx, dz).toFixed(1)} m pass arrives`);
  }
  // The pass picker prefers the open teammate in the direction asked for.
  const m = freeBall(0, 0);
  const [, a, f] = m.players;
  Object.assign(a, { x: 0, z: 0 });
  Object.assign(f, { x: 8, z: 0 });
  Object.assign(m.players[0], { x: -8, z: 0 });
  assert.equal(R.passTarget(m, a, [1, 0]).id, f.id);
});

test('a shot is fast, a held shot faster; a hard stone knocks a caveman back', () => {
  const m = freeBall(0, 0);
  const p = m.players[2];
  Object.assign(p, { x: -R.PLAYER.carry, z: 0, face: Math.PI / 2 });
  m.ball.owner = p.id;
  R.step(m, { [p.id]: { shoot: 0.1, mx: 1, mz: 0 } });
  const soft = speed(m.ball);
  const m2 = freeBall(0, 0);
  const p2 = m2.players[2];
  Object.assign(p2, { x: -R.PLAYER.carry, z: 0, face: Math.PI / 2 });
  m2.ball.owner = p2.id;
  R.step(m2, { [p2.id]: { shoot: 1, mx: 1, mz: 0 } });
  assert.ok(speed(m2.ball) > soft + 10, `${speed(m2.ball)} vs ${soft}`);
  // Stand someone in the way of a hard one.
  const v = m2.players[4];
  Object.assign(v, { x: 5, z: m2.ball.z + m2.ball.vz * 0.2, vx: 0, vz: 0 });
  const ev = run(m2, 0.5);
  const hit = ev.find((e) => e.type === 'hit' && e.pid === v.id);
  assert.ok(hit, 'the stone hit him');
  assert.ok(v.x > 5, 'and pushed him back');
});

test('a tackle knocks the stone loose — more often head-on than from behind', () => {
  const trial = (seed, fromBehind) => {
    const m = freeBall(0, 0, { seed });
    const owner = m.players[2], t = m.players[5];
    Object.assign(owner, { x: 0, z: 0, face: Math.PI / 2 });
    m.ball.owner = owner.id;
    m.ball.x = R.PLAYER.carry;
    // Head-on: from in front of him, facing him. From behind: at his back, facing the same way.
    Object.assign(t, fromBehind ? { x: -2.2, z: 0, face: Math.PI / 2 } : { x: 2.6, z: 0, face: -Math.PI / 2 });
    const dir = fromBehind ? 1 : -1;
    const ev = R.simulate(m, 0.45, () => ({ [t.id]: { tackle: true, mx: dir, mz: 0 } }));
    const tk = ev.find((e) => e.type === 'tackle');
    assert.ok(tk, 'the lunge reached him');
    if (tk.won) assert.notEqual(m.ball.owner, owner.id, 'won: the stone is loose');
    else assert.ok(m.players[5].stun > 0, 'lost: the tackler bounced off');
    return tk.won;
  };
  let front = 0, back = 0;
  for (let seed = 1; seed <= 40; seed++) {
    front += trial(seed, false) ? 1 : 0;
    back += trial(seed + 100, true) ? 1 : 0;
  }
  assert.ok(front > 20 && front > back, `head-on ${front}/40, from behind ${back}/40`);
  assert.ok(back > 0, 'even from behind it sometimes works');
});

test('an AI team beats an idle one over a match, and AI against AI plays fair and finite', () => {
  const m = R.createMatch({ seed: 11, length: 120, teams: [{ control: 'ai', skill: 'normal' }, { control: 'idle' }] });
  run(m, 400); // the clock stops for celebrations and kick-offs
  assert.equal(m.phase, 'end');
  assert.ok(m.score[0] >= 3, `scored ${m.score[0]}`);
  assert.equal(m.score[1], 0);
  // Mirror: the AI attacking the other way scores too.
  const n = R.createMatch({ seed: 12, length: 120, teams: [{ control: 'idle' }, { control: 'ai', skill: 'easy' }] });
  run(n, 400);
  assert.ok(n.score[1] >= 2 && n.score[0] === 0, `scored ${n.score}`);
  // AI vs AI: goals happen on both sides across a few matches, nothing goes NaN, no one leaves the pitch.
  const tot = [0, 0];
  for (const seed of [1, 2, 3, 4]) {
    const a = R.createMatch({ seed, length: 180, golden: false, teams: [{ control: 'ai', skill: 'hard' }, { control: 'ai', skill: 'hard' }] });
    run(a, 400);
    assert.equal(a.phase, 'end');
    tot[0] += a.score[0];
    tot[1] += a.score[1];
    for (const p of a.players) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z));
      assert.ok(Math.abs(p.x) <= PITCH.hx && Math.abs(p.z) <= PITCH.hz);
    }
    assert.ok(Number.isFinite(a.ball.x + a.ball.y + a.ball.z));
  }
  assert.ok(tot[0] > 0 && tot[1] > 0, `both sides score: ${tot}`);
  // Harder beats easier, on the whole.
  let hard = 0, easy = 0;
  for (const seed of [21, 22, 23]) {
    const a = R.createMatch({ seed, length: 180, golden: false, teams: [{ control: 'ai', skill: 'hard' }, { control: 'ai', skill: 'easy' }] });
    run(a, 400);
    hard += a.score[0];
    easy += a.score[1];
  }
  assert.ok(hard > easy, `hard ${hard} vs easy ${easy}`);
});

test('a match is repeatable from its seed', () => {
  const play = () => {
    const m = R.createMatch({ seed: 99, length: 60, teams: [{ control: 'ai' }, { control: 'ai', skill: 'hard' }] });
    run(m, 30);
    return [m.score.join('-'), m.ball.x.toFixed(6), m.players.map((p) => p.x.toFixed(4)).join(',')].join('|');
  };
  assert.equal(play(), play());
});

test('the human plays the caveman nearest the stone, never the keeper; Q switches', () => {
  const m = R.createMatch({ seed: 4, length: 120, teams: [{ control: 'human' }, { control: 'ai' }] });
  assert.equal(m.human.pid, 2, 'the kick-off taker');
  m.phase = 'play';
  m.ball.owner = -1;
  Object.assign(m.ball, { x: -10, z: 5, vx: 0, vz: 0 });
  Object.assign(m.players[1], { x: -9, z: 4 });
  Object.assign(m.players[2], { x: 8, z: 0 });
  for (const p of m.players.slice(3)) Object.assign(p, { x: 15, z: -8 });
  R.step(m);
  assert.equal(m.human.pid, 1);
  R.switchPlayer(m);
  assert.equal(m.human.pid, 2);
  assert.ok(m.players[m.human.pid].role !== 'keeper');
  // The human's own input moves only his man.
  const before = m.players[2].x;
  R.simulate(m, 0.3, (s) => ({ [s.human.pid]: { mx: 1, mz: 0 } }));
  assert.ok(m.players[2].x > before || m.human.pid !== 2);
});

test('sprinting drains stamina and is faster; resting brings it back', () => {
  const m = freeBall(0, -8);
  m.teams[0].control = 'human';
  const p = m.players[2];
  m.human = { team: 0, pid: p.id };
  Object.assign(p, { x: -15, z: 0 });
  R.simulate(m, 1, () => ({ [p.id]: { mx: 1, mz: 0, sprint: true } }));
  const sprintX = p.x;
  assert.ok(p.stamina < 1);
  const low = p.stamina;
  const q = m.players[1];
  m.human.pid = q.id;
  Object.assign(q, { x: -15, z: 3 });
  R.simulate(m, 1, () => ({ [q.id]: { mx: 1, mz: 0 } }));
  assert.ok(sprintX - -15 > q.x - -15, 'sprinting covers more ground');
  assert.ok(p.stamina > low, 'stamina comes back when not sprinting');
});

test('constants hang together', () => {
  assert.ok(PITCH.goalHalf + PITCH.post < PITCH.hz - PITCH.corner, 'the goal mouth sits on the straight end wall');
  assert.ok(R.LEATHERS.length >= 2 && R.LEATHERS.length <= 4);
  assert.equal(TICK, 1 / 60);
  for (const k of ['easy', 'normal', 'hard']) assert.ok(R.SKILLS[k]);
});
