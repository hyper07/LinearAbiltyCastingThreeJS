import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MobaSim } from '../../src/moba/sim.js';
import { makeSeats, LANES as SEAT_LANES } from '../../src/moba/seats.js';
import { Mirror, pack } from '../../src/moba/net.js';
import { CHAMPIONS, CHAMPION_ORDER, ITEMS, TICK, FIRST_WAVE, START_GOLD } from '../../src/moba/rules.js';
import { BASES, LANES, CAMP_SPOTS, WALLS, findPath, walkable, lanePoint, mirror } from '../../src/moba/map.js';

const KINDS = new Set(['shot', 'area', 'nova', 'dash', 'blink', 'target', 'self']);
const run = (sim, seconds) => {
  for (let i = 0; i < seconds / TICK && !sim.over; i++) sim.step();
};
/** A match of people only (no bots), so a test decides everything. */
const quiet = (champs = ['sela', 'brakka']) => new MobaSim({ seats: [{ champ: champs[0], team: 'blue', name: 'A' }, { champ: champs[1], team: 'red', name: 'B' }] });

test('eight champions, four abilities each, every kind known', () => {
  assert.equal(CHAMPION_ORDER.length, 8);
  for (const id of CHAMPION_ORDER) {
    const c = CHAMPIONS[id];
    assert.equal(c.abilities.length, 4, id);
    assert.deepEqual(c.abilities.map((a) => a.key), ['Q', 'W', 'E', 'R'], id);
    for (const a of c.abilities) assert.ok(KINDS.has(a.kind), `${id} ${a.name}: ${a.kind}`);
  }
  for (const it of Object.values(ITEMS)) assert.ok(it.cost > 0 && Object.keys(it.stats).length);
});

test('the map: lanes walkable, both bases reachable, the camps too, mirrored walls', () => {
  for (const [lane, path] of Object.entries(LANES)) {
    for (let t = 0; t <= 1; t += 0.02) assert.ok(walkable(...lanePoint(lane, t)), `${lane} at ${t.toFixed(2)}`);
    assert.ok(path.length >= 3);
  }
  const route = findPath(...BASES.blue.spawn, ...BASES.red.core);
  const end = route[route.length - 1];
  assert.ok(Math.hypot(end[0] - BASES.red.core[0], end[1] - BASES.red.core[1]) < 4, 'a path across the map');
  for (const c of CAMP_SPOTS) {
    const p = findPath(...BASES.blue.spawn, ...c.at);
    const last = p[p.length - 1];
    assert.ok(Math.hypot(last[0] - c.at[0], last[1] - c.at[1]) < 4, `camp at ${c.at}`);
  }
  assert.ok(WALLS.length > 40);
  const half = WALLS.length / 2;
  for (let i = 0; i < half; i++) {
    const [x, z] = mirror([WALLS[i].x, WALLS[i].z]);
    assert.ok(Math.abs(WALLS[i + half].x - x) < 1e-9 && Math.abs(WALLS[i + half].z - z) < 1e-9);
  }
});

test('seats: people on their side, bots fill the rest with no repeats on a side', () => {
  const seats = makeSeats([{ id: 'a', name: 'Ann', champ: 'kiro', team: 'blue' }, { id: 'b', name: 'Bo', champ: 'kiro', team: 'red' }, { id: 'c', name: 'Cy', champ: 'sela', team: 'blue' }], 'hard');
  assert.equal(seats.length, 10);
  assert.equal(seats.filter((s) => s.team === 'blue').length, 5);
  assert.equal(seats.find((s) => s.owner === 'a').lane, 'bot', 'Kiro goes bot');
  assert.equal(seats.find((s) => s.owner === 'c').lane, 'mid');
  assert.equal(seats.find((s) => s.owner === 'b').team, 'red');
  for (const team of ['blue', 'red']) {
    const champs = seats.filter((s) => s.team === team).map((s) => s.champ);
    assert.equal(new Set(champs).size, 5, `${team}: ${champs}`);
  }
  assert.ok(seats.filter((s) => !s.owner).every((s) => s.bot === 'hard'));
  assert.deepEqual(seats.slice(0, 5).map((s) => s.lane), SEAT_LANES);
});

test('minion waves come down every lane, meet, and fight', () => {
  const sim = quiet();
  run(sim, FIRST_WAVE + 0.1);
  const minions = () => [...sim.entities.values()].filter((e) => e.type === 'minion');
  assert.equal(minions().length, 2 * 3 * 6, 'six a lane a side');
  run(sim, 30);
  assert.ok(minions().length < 36 + 36, 'some have died fighting');
  const hurt = minions().some((m) => m.hp < m.maxHp);
  assert.ok(hurt || minions().length < 36, 'they fight');
});

test('abilities: points, a skillshot that hits, a stun that stops, R at 6', () => {
  const sim = quiet(['sela', 'brakka']);
  const [a, b] = sim.seats;
  // Stand them face to face in mid.
  Object.assign(a, { x: 100, z: 110 });
  Object.assign(b, { x: 100, z: 100 });
  sim.command(0, { type: 'rank', slot: 3 });
  sim.step();
  assert.equal(a.ranks[3], 0, 'no R before level 6');
  sim.command(0, { type: 'rank', slot: 0 });
  sim.step();
  assert.equal(a.ranks[0], 1);
  const hp = b.hp;
  sim.command(0, { type: 'cast', slot: 0, x: 100, z: 100 });
  run(sim, 1);
  assert.ok(b.hp < hp, `the lance hit: ${hp} → ${b.hp}`);
  assert.ok(a.cds[0] > 0 && a.mana < a.maxMana);
  // Brakka's Shield Bash stuns Sela: she can't walk for a second.
  sim.command(1, { type: 'rank', slot: 0 });
  sim.step();
  Object.assign(b, { x: 100, z: 107.5 });
  sim.command(1, { type: 'cast', slot: 0, x: a.x, z: a.z, target: a.id });
  sim.step();
  sim.step();
  assert.ok(a.fx.stunUntil > sim.time, 'stunned');
  const at = { x: a.x, z: a.z };
  sim.command(0, { type: 'move', x: 100, z: 140 });
  run(sim, 0.5);
  assert.ok(Math.hypot(a.x - at.x, a.z - at.z) < 0.6, 'stunned: no walking');
  run(sim, 1.5);
  assert.ok(Math.hypot(a.x - at.x, a.z - at.z) > 2, 'and walks after');
  // Levels: enough experience opens R.
  sim._xp(a, 3000);
  assert.ok(a.level >= 6 && a.points > 0);
  sim.command(0, { type: 'rank', slot: 3 });
  sim.step();
  assert.equal(a.ranks[3], 1);
});

test('the shop: only at home (or dead), gold spent, stats change', () => {
  const sim = quiet(['kiro', 'brakka']);
  const a = sim.seats[0];
  const ad = a.stats.ad;
  sim.command(0, { type: 'buy', item: 'blade' });
  sim.step();
  assert.deepEqual(a.items, ['blade']);
  assert.equal(a.gold, START_GOLD - ITEMS.blade.cost);
  assert.equal(a.stats.ad, ad + 12);
  Object.assign(a, { x: 100, z: 100 });
  sim.command(0, { type: 'buy', item: 'boots' });
  sim.step();
  assert.deepEqual(a.items, ['blade'], 'away from home: no shopping');
});

test('a tower shoots the champion who hurts a friend under it', () => {
  const sim = quiet(['kiro', 'brakka']);
  const [a, b] = sim.seats;
  const tower = [...sim.entities.values()].find((e) => e.type === 'tower' && e.team === 'red' && e.tier === 'outer' && e.lane === 'mid');
  Object.assign(b, { x: tower.x - 4, z: tower.z + 4 });
  Object.assign(a, { x: tower.x - 9, z: tower.z + 9 });
  sim.command(0, { type: 'attack', target: b.id });
  const hp = a.hp;
  run(sim, 4);
  assert.ok(a.hp < hp - 100, `the tower answered: ${hp} → ${a.hp}`);
});

test('ten bots play a whole match to a broken core', () => {
  const seats = makeSeats([], 'normal');
  const sim = new MobaSim({ seats, seed: 4 });
  run(sim, 45 * 60);
  assert.ok(sim.over, `over by ${Math.round(sim.time / 60)} min`);
  assert.ok(['blue', 'red'].includes(sim.over.winner));
  assert.ok(sim.seats.every((c) => c.level >= 6 && c.items.length >= 3), sim.seats.map((c) => `${c.champ}:${c.level}/${c.items.length}`).join(' '));
  const kills = sim.score.blue.kills + sim.score.red.kills;
  assert.ok(kills > 5, `${kills} kills`);
});

test('snapshots: packed small, and blended between two', () => {
  const sim = quiet();
  run(sim, FIRST_WAVE + 1);
  const a = pack(sim.snapshot());
  run(sim, 0.5);
  const b = pack(sim.snapshot());
  assert.ok(JSON.stringify(b).length < 40_000, `${JSON.stringify(b).length} bytes`);
  const m = new Mirror({ delay: 0 });
  m.push(a);
  m.push(b);
  const half = m.state(0, 0.5);
  const id = b.ents.find((e) => e.k === 'minion').i;
  const ea = a.ents.find((e) => e.i === id);
  const eb = b.ents.find((e) => e.i === id);
  const eh = half.ents.find((e) => e.i === id);
  assert.ok(Math.abs(eh.x - (ea.x + eb.x) / 2) < 0.02, 'halfway');
});
