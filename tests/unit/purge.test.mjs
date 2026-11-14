import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Purge, forgeCheck } from '../../src/squad/purge/sim.js';
import { RANKS, BUILDINGS, TICK, SHRINE_GIFTS } from '../../src/squad/purge/rules.js';
import { STRUCTURES, GUARDS, KEYS, Grid, FORGE, SPAWN, HEART, BASE, tierAt } from '../../src/squad/purge/map.js';

const seats = (n = 4, people = 1) => Array.from({ length: n }, (_, i) => ({ name: `P${i}`, bot: i >= people }));

test('the Gravefield: the same land every time, harder further out, every building reachable from the camp', () => {
  assert.equal(KEYS.length, 12, 'six shrines and six soul nodes');
  assert.equal(STRUCTURES.filter((s) => s.type === 'heart').length, 1);
  const tiers = new Set(GUARDS.map((g) => g.tier));
  for (const t of [1, 2, 3, 4]) assert.ok(tiers.has(t), `guards in tier ${t}`);
  assert.equal(tierAt(SPAWN.x, SPAWN.z), 1);
  assert.equal(tierAt(HEART.x, HEART.z), 4);
  const grid = new Grid();
  for (const s of STRUCTURES) {
    const [x, z] = grid.open(s.x + BUILDINGS[s.type].r + 2, s.z);
    assert.ok(grid.path(SPAWN.x, SPAWN.z, x, z), `a way to the ${s.type} at ${s.x},${s.z}`);
  }
  for (const s of STRUCTURES) assert.ok(!(s.x < BASE.x1 && s.z < BASE.z1), 'nothing of the dead inside the camp');
});

test('a way round a ridge: the path never steps on a blocked cell', () => {
  const grid = new Grid();
  const path = grid.path(SPAWN.x, SPAWN.z, HEART.x - 14, HEART.z - 14);
  assert.ok(path && path.length > 2, 'more than a straight line');
  let [x, z] = [SPAWN.x, SPAWN.z];
  for (const [nx, nz] of path) {
    assert.ok(grid.line(x, z, nx, nz), `the leg to ${nx.toFixed(1)},${nz.toFixed(1)} is open`);
    [x, z] = [nx, nz];
  }
});

test('the camp: four Recruits each, Recruits for ore, the supply cap, the Forge', () => {
  const g = new Purge({ seats: seats(4, 4), seed: 1 });
  assert.equal(g.troops.filter((t) => t.o === 0).length, 4);
  const p = g.players[0];
  const ore = p.ore;
  g.order(0, { t: 'buy', n: 2 });
  assert.equal(g.troops.filter((t) => t.o === 0).length, 6);
  assert.equal(p.ore, ore - 2 * RANKS.recruit.cost);
  // A Veteran: a Recruit in the ring and the ore.
  p.ore = 5000;
  assert.equal(g.canForge(0, 'veteran').ok, false, 'nobody at the Forge yet');
  const r = g.troops.find((t) => t.o === 0 && t.rank === 'recruit');
  [r.x, r.z] = [FORGE.x + 2, FORGE.z];
  const vet = g.forge(0, 'veteran');
  assert.ok(vet && vet.rank === 'veteran');
  assert.equal(p.ore, 5000 - RANKS.veteran.ore);
  assert.ok(!g.ents.has(r.i), 'the Recruit became the Veteran');
  // A Vanguard is one at a time.
  p.ore = 20000;
  [vet.x, vet.z] = [FORGE.x, FORGE.z + 2];
  assert.ok(g.forge(0, 'vanguard'));
  const v2 = g._troop(0, 'veteran', FORGE);
  [v2.x, v2.z] = [FORGE.x, FORGE.z];
  assert.match(forgeCheck(g.troops, 0, p.ore, p.relics, 'vanguard').why, /One Vanguard/);
  // A Phantom needs relics.
  const v3 = g._troop(0, 'veteran', FORGE);
  [v3.x, v3.z] = [FORGE.x + 1, FORGE.z];
  for (const t of g.troops) if (t.o === 0 && t.rank === 'vanguard') [t.x, t.z] = [FORGE.x - 1, FORGE.z];
  assert.match(g.canForge(0, 'phantom').why, /relics/);
  p.relics = 4;
  assert.ok(g.forge(0, 'phantom'));
  // The supply cap.
  p.ore = 1e6;
  g.order(0, { t: 'buy', n: 10 });
  g.order(0, { t: 'buy', n: 10 });
  g.order(0, { t: 'buy', n: 10 });
  assert.equal(g.troops.filter((t) => t.o === 0).length, 24);
});

test('a kill pays the killer; a building pays more, and its relics go to everyone', () => {
  const g = new Purge({ seats: seats(2, 2), seed: 2 });
  const t = g.troops.find((x) => x.o === 1);
  const foe = g.foes.find((f) => f.tier === 1 && !f.boss);
  const ore = g.players[1].ore;
  g._hurt(foe, 1e6, t);
  assert.equal(g.players[1].ore, ore + foe.bounty);
  assert.ok(g.down.has(foe.i));
  const cache = g.buildings.find((b) => b.type === 'cache');
  const before = g.players.map((p) => p.relics);
  g._hurt(cache, 1e6, t);
  assert.deepEqual(g.players.map((p) => p.relics), before.map((n) => n + 1));
  assert.ok(!g.grid.blocked(cache.x, cache.z), 'its ground is open');
});

test('shrines make Veterans stronger; the Heart is sealed until every ward is broken; the king ends it', () => {
  const g = new Purge({ seats: seats(1, 1), seed: 3 });
  const vet = g._troop(0, 'veteran');
  const reach = g.troopStat(vet).range;
  const recruit = g.troops.find((t) => t.rank === 'recruit');
  const shrine = g.buildings.find((b) => b.type === 'shrine');
  g._hurt(shrine, 1e7, vet);
  assert.equal(g.shrines, 1);
  assert.equal(g.troopStat(vet).range, reach + SHRINE_GIFTS[0].range);
  assert.equal(g.troopStat(recruit).range, RANKS.recruit.gun.range, 'Recruits get nothing');
  const heart = g.buildings.find((b) => b.type === 'heart');
  g._hurt(heart, 1e7, vet);
  assert.ok(heart.alive, 'sealed: no harm');
  for (const b of g.buildings) if (BUILDINGS[b.type].key && b.alive) g._hurt(b, 1e7, vet);
  assert.equal(g.keysLeft, 0);
  g.step(TICK);
  assert.ok(!heart.sealed, 'open');
  g._hurt(heart, 1e7, vet);
  const king = g.foes.find((f) => f.kind === 'king');
  assert.ok(king, 'the king rises');
  g._hurt(king, 1e9, vet);
  assert.deepEqual(g.over, { won: true, why: 'king' });
});

test('time runs out: the game is lost', () => {
  const g = new Purge({ seats: seats(1, 1), difficulty: 'hell', seed: 4 });
  g.left = 0.04;
  g.step(TICK);
  assert.deepEqual(g.over, { won: false, why: 'time' });
});

test('soldiers left alone fight what comes; sleeping guards wake when soldiers come near', () => {
  const g = new Purge({ seats: seats(1, 1), seed: 5 });
  const foe = g.foes.find((f) => f.tier === 1 && !f.boss);
  assert.equal(foe.awake, false);
  const squad = g.troops.filter((t) => t.o === 0).map((t) => t.i);
  g.order(0, { t: 'amove', ids: squad, x: foe.x, z: foe.z });
  for (let i = 0; i < 20 * 90 && foe.hp > 0; i++) g.step(TICK);
  assert.ok(foe.awake || foe.hp <= 0, 'it woke');
  assert.ok(g.players[0].kills > 0, 'the squad killed something');
});

test('four bots alone clear the Gravefield on Casual, inside the time', () => {
  const g = new Purge({ seats: seats(4, 0), difficulty: 'casual', seed: 11 });
  while (!g.over && g.t < 90 * 60) g.step(TICK);
  assert.equal(g.over?.won, true, `bots stalled: ${JSON.stringify(g.over)} with ${g.keysLeft} wards left at ${(g.t / 60).toFixed(1)} min`);
});

test('a snapshot carries soldiers, the awake dead, hurt buildings and what has fallen', () => {
  const g = new Purge({ seats: seats(2, 1), seed: 6 });
  const s = g.snapshot();
  assert.equal(s.players.length, 2);
  assert.ok(s.ents.some((e) => e.k === 'troop'));
  assert.ok(!s.ents.some((e) => e.k === 'foe'), 'sleeping guards far off are left to the map');
  assert.deepEqual(s.down, []);
  assert.ok(JSON.stringify(s).length < 20000, 'small enough to send ten times a second');
});

test('waves: a crypt that falls is answered by the crypts near it; the camp gets numbered waves', () => {
  const g = new Purge({ seats: seats(1, 1), seed: 8 });
  const t = g.troops[0];
  const crypt = g.buildings.find((b) => b.type === 'crypt' && g.buildings.some((o) => o !== b && o.alive && BUILDINGS[o.type].spawns && Math.hypot(o.x - b.x, o.z - b.z) < 110));
  const before = g.foes.length;
  g._hurt(crypt, 1e7, t);
  const wave = g.foes.slice(before);
  assert.ok(wave.length >= 4, `a wave of ${wave.length}`);
  assert.ok(wave.every((f) => f.raid && f.goal && Math.hypot(f.goal.x - crypt.x, f.goal.z - crypt.z) < 5), 'sent to where it fell');
  assert.ok(g.events.some((e) => e.t === 'wrath'));
  // The camp's waves come numbered, and grow.
  g.raidT = 0;
  g.step(TICK);
  const first = g.events.find((e) => e.t === 'raid');
  g.raidT = 0;
  g.step(TICK);
  const second = g.events.find((e) => e.t === 'raid');
  assert.equal(first.wave, 1);
  assert.equal(second.wave, 2);
  assert.ok(second.n >= first.n);
});
