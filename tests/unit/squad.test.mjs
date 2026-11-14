import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../../src/squad/sim.js';
import { CLASSES, CLASS_ORDER, FOES, WAVES, UPGRADES, upgradeCost, MEDKIT } from '../../src/squad/rules.js';
import { way, clear, crossesWall, inside, GATES, RIFTS, SPAWN, REACTOR_AT } from '../../src/squad/map.js';

const squad = (overrides = {}) => new Game({ seed: 4, seats: CLASS_ORDER.map((cls, i) => ({ cls, name: `S${i}`, bot: false, ...overrides })) });
const run = (g, seconds, orders) => {
  const all = [];
  for (let i = 0; i < seconds * 20 && !g.over; i++) all.push(...g.step(1 / 20, typeof orders === 'function' ? orders() : orders));
  return all;
};

test('the outpost: everyone starts clear, the dead have a clear road from each rift to a gate', () => {
  for (const [x, z] of SPAWN) assert.ok(clear(x, z), `a start at ${x},${z} is blocked`);
  for (const r of RIFTS) {
    for (let k = 1; k < r.path.length; k++) assert.equal(crossesWall(r.path[k - 1][0], r.path[k - 1][1], r.path[k][0], r.path[k][1]), false, `${r.id}'s road crosses a wall`);
    const [lx, lz] = r.path.at(-1);
    assert.ok(GATES.some((g) => Math.hypot(g.x - lx, g.z - lz) < 5), `${r.id}'s road ends at a gate`);
  }
  assert.ok(!clear(REACTOR_AT.x, REACTOR_AT.z), 'the reactor is solid');
});

test('a way out of the compound goes through a gate, and round the reactor', () => {
  // Due north, out of the north gate, round the reactor in between.
  const north = way(70, 76, 70, 20);
  assert.ok(north.length >= 2 && north.every(([x, z]) => Math.hypot(x - REACTOR_AT.x, z - REACTOR_AT.z) > REACTOR_AT.r), 'round the reactor');
  // To the north-west wastes: the wall is in the way, so by a gate.
  const out = way(70, 76, 30, 20);
  assert.ok(out.length >= 2, 'not straight through the wall');
  assert.ok(out.some(([x, z]) => GATES.some((g) => Math.hypot(g.x - x, g.z - z) < 4)), 'by a gate');
  let [x, z] = [70, 76];
  for (const [px, pz] of out) {
    for (let k = 0; k <= 30; k++) assert.ok(clear(x + ((px - x) * k) / 30, z + ((pz - z) * k) / 30, 0.45), 'every step of the way is clear');
    [x, z] = [px, pz];
  }
  assert.ok(inside(70, 70) && !inside(70, 20));
});

test('orders: a right-click walks a soldier there; one of the dead in reach is shot and killed, for credits and experience', () => {
  const g = squad();
  const h = g.heroes[0];
  // The others well away, so the kill is this soldier's.
  g.heroes.slice(1).forEach((o, k) => Object.assign(o, { x: 100 + k * 4, z: 120 }));
  g.order(0, { t: 'move', x: 62, z: 76 });
  run(g, 3);
  assert.ok(Math.hypot(h.x - 62, h.z - 76) < 0.6, 'arrived');
  const f = g._spawn('husk', null, [h.x, h.z - 8]);
  f.rise = 0;
  const credits = h.credits;
  const ev = run(g, 4);
  assert.ok(ev.some((e) => e.t === 'shot' && e.id === h.i), 'it fired');
  assert.ok(ev.some((e) => e.t === 'kill' && e.by === h.i));
  assert.ok(h.credits > credits && h.xp > 0);
});

test('skills: a frag hurts a crowd, Mend heals, a sentry is built and shoots, a revive pulse lifts the fallen', () => {
  const g = squad();
  const [rifle, medic, , engineer] = g.heroes;
  g.phase = 'wave';
  g.queue = [];
  const crowd = [0, 1, 2].map((k) => Object.assign(g._spawn('brute', null, [60 + k, 40]), { rise: 0 }));
  rifle.x = 61;
  rifle.z = 48;
  g.order(0, { t: 'skill', n: 1, x: 61, z: 40 });
  assert.ok(crowd.every((f) => f.hp < f.max), 'every brute in the blast was hurt');
  assert.ok(rifle.cd[1] > g.t, 'and the skill is cooling down');
  rifle.hp = 50;
  medic.x = rifle.x + 3;
  medic.z = rifle.z;
  g.order(1, { t: 'skill', n: 0, id: rifle.i });
  assert.ok(rifle.hp >= 50 + CLASSES.medic.skills[0].power - 1);
  g.order(3, { t: 'skill', n: 0, x: engineer.x + 3, z: engineer.z });
  assert.equal(g.sentries.length, 1, 'a sentry');
  // Down two soldiers by the Medic, and pulse.
  for (const h of [rifle, engineer]) {
    Object.assign(h, { x: medic.x + 1, z: medic.z + 1 });
    g._harm(h, 9999, null);
    assert.ok(h.down);
  }
  g.order(1, { t: 'skill', n: 2 });
  assert.ok(!rifle.down && !engineer.down, 'both lifted');
  assert.ok(Math.abs(rifle.hp - rifle.max / 2) < 2, 'at half health');
});

test('down: a teammate standing beside lifts you; with no one, a life brings you back at the reactor', () => {
  const g = squad();
  const [a, b] = g.heroes;
  g._harm(a, 9999, null);
  assert.ok(a.down);
  Object.assign(b, { x: a.x + 1, z: a.z });
  run(g, 3);
  assert.equal(a.down, false, 'lifted');
  const lives = g.lives;
  const [, , c] = g.heroes;
  g._harm(c, 9999, null);
  for (const h of g.heroes) if (h !== c) Object.assign(h, { x: 120, z: 20 });
  run(g, 15);
  assert.equal(c.down, false, 'back on a life');
  assert.equal(g.lives, lives - 1);
});

test('the armoury: upgrades cost more each level, stop at their top, and do what they say; medkits heal half', () => {
  const g = squad();
  const h = g.heroes[0];
  h.credits = 100000;
  const dmg = g.heroStat(h).dmg;
  for (let k = 0; k < 3; k++) g.order(0, { t: 'buy', key: 'damage' });
  assert.equal(h.upg.damage, 3);
  assert.ok(Math.abs(g.heroStat(h).dmg - dmg * 1.36) < 0.01);
  assert.equal(h.credits, 100000 - upgradeCost('damage', 0) - upgradeCost('damage', 1) - upgradeCost('damage', 2));
  for (let k = 0; k < 40; k++) g.order(0, { t: 'buy', key: 'armor' });
  assert.equal(h.upg.armor, UPGRADES.armor.max);
  g.order(0, { t: 'buy', key: 'medkit' });
  h.hp = 10;
  g.order(0, { t: 'medkit' });
  assert.ok(h.hp >= 10 + h.max * MEDKIT.heal - 1);
});

test('the waves: the dead come from the open rifts, a boss ends every fifth, bots alone hold the outpost on Recruit', () => {
  assert.equal(WAVES.length, 15);
  for (const w of [4, 9, 14]) assert.ok(Object.keys(WAVES[w]).some((k) => FOES[k].boss), `wave ${w + 1} has a boss`);
  const g = new Game({ difficulty: 'recruit', seed: 9, seats: CLASS_ORDER.map((cls, i) => ({ cls, name: `B${i}`, bot: true })) });
  let bosses = 0;
  let steps = 0;
  while (!g.over && steps++ < 20 * 60 * 30) for (const e of g.step(1 / 20)) if (e.t === 'boss') bosses++;
  assert.ok(g.over?.won, `the squad held (${JSON.stringify(g.over)}, wave ${g.wave})`);
  assert.equal(bosses, 3);
});

test('a snapshot carries what a screen needs, and only numbers and words', () => {
  const g = squad();
  run(g, 1);
  const s = g.snapshot();
  assert.equal(s.heroes.length, 4);
  assert.ok(s.ents.some((e) => e.k === 'hero'));
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});
