import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../../src/rts/sim.js';
import { generateMap, OPEN } from '../../src/rts/map.js';
import { FlowFields } from '../../src/rts/flow.js';
import { STATS, FACTION_ORDER, MAP_SIZES, CELL, START_SHARDS, TICK } from '../../src/rts/rules.js';

const two = (extra = {}) => new Sim({ seed: 42, size: 'large', players: [{ faction: 'league', ai: null }, { faction: 'thornkin', ai: null }], ...extra });
const run = (sim, seconds) => {
  for (let i = 0; i < seconds / TICK && !sim.over; i++) sim.step();
};

test('every faction has all five units and five buildings, with names of its own', () => {
  const names = new Set();
  for (const f of FACTION_ORDER) {
    for (const [type, s] of Object.entries(STATS[f])) {
      assert.ok(s.hp > 0 && s.cost > 0, `${f}/${type}`);
      assert.ok(!names.has(s.name), `${s.name} is used twice`);
      names.add(s.name);
    }
  }
  assert.equal(names.size, 30);
  assert.ok(STATS.prism.light.hp > STATS.league.light.hp, 'Prism: tougher');
  assert.ok(STATS.prism.light.cost > STATS.league.light.cost, 'Prism: dearer');
});

test('maps: every size and player count, every base reachable from every start', () => {
  for (const size of Object.keys(MAP_SIZES)) {
    for (const players of [2, 3, 4]) {
      const map = generateMap({ seed: `t-${size}-${players}`, size, players });
      assert.equal(map.n, MAP_SIZES[size].cells);
      assert.equal(map.starts.length, players);
      assert.ok(map.sites.length > players, `${size}/${players}: expansions too`);
      const occ = new Set(map.nodes.map((nd) => nd.cz * map.n + nd.cx));
      const flows = new FlowFields(map.n, (i) => map.block[i] === OPEN && !occ.has(i));
      const s0 = map.starts[0];
      const dist = flows.search([s0.cz * map.n + s0.cx]);
      for (const site of map.sites) assert.ok(Number.isFinite(dist[site.cz * map.n + site.cx]), `${size}/${players}: site ${site.cx},${site.cz} reachable`);
    }
  }
  const a = generateMap({ seed: 9, size: 'huge', players: 2 });
  const b = generateMap({ seed: 9, size: 'huge', players: 2 });
  assert.deepEqual(a.block, b.block, 'the same seed is the same map');
});

test('workers mine shards and bring them home', () => {
  const sim = two();
  const workers = sim.unitsOf(0);
  assert.equal(workers.length, 5);
  const node = sim.nodes().sort((p, q) => Math.hypot(p.x - workers[0].x, p.z - workers[0].z) - Math.hypot(q.x - workers[0].x, q.z - workers[0].z))[0];
  sim.command(0, { type: 'gather', ids: workers.map((w) => w.id), node: node.id });
  run(sim, 40);
  assert.ok(sim.players[0].shards > START_SHARDS + 50, `mined: ${sim.players[0].shards}`);
  assert.ok(sim.players[0].stats.gathered > 50);
});

test('training costs shards and supply, and the unit appears', () => {
  const sim = two();
  const core = sim.buildingsOf(0)[0];
  sim.command(0, { type: 'train', building: core.id, unit: 'worker' });
  sim.step();
  assert.equal(sim.players[0].shards, START_SHARDS - STATS.league.worker.cost);
  assert.equal(sim.players[0].used, 6);
  run(sim, STATS.league.worker.time + 1);
  assert.equal(sim.unitsOf(0).length, 6);
  // Locked: a barracks unit from a core does nothing.
  sim.command(0, { type: 'train', building: core.id, unit: 'light' });
  sim.step();
  assert.equal(core.queue.length, 0);
});

test('building: League needs a worker to stay; Thornkin seeds grow alone', () => {
  for (const faction of ['league', 'thornkin']) {
    const sim = new Sim({ seed: 5, size: 'large', players: [{ faction }, { faction: 'prism' }] });
    sim.players[0].shards = 1000;
    const core = sim.buildingsOf(0)[0];
    const w = sim.unitsOf(0)[0];
    // A spot the computer's placement would pick: a few cells beside the core.
    let spot = null;
    for (let r = 6; r < 14 && !spot; r++) {
      for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
        if (sim.canPlace(0, 'depot', core.x0 + dx, core.z0 + dz)) {
          spot = { cx: core.x0 + dx, cz: core.z0 + dz };
          break;
        }
      }
    }
    assert.ok(spot, 'room for a depot');
    sim.command(0, { type: 'build', ids: [w.id], building: 'depot', ...spot });
    run(sim, 45);
    const depot = sim.buildingsOf(0).find((b) => b.type === 'depot');
    assert.ok(depot?.built, `${faction}: the depot is up`);
    assert.equal(sim.players[0].cap, 18);
    assert.equal(sim.players[0].shards, 1000 - STATS[faction].depot.cost);
    if (faction === 'league') assert.notEqual(sim.get(w.id).order.type, 'construct', 'the worker is free again');
  }
});

test('fighting: an army destroys a base and the match ends', () => {
  const sim = two();
  // Give player 0 a handful of heavies next to player 1's base.
  const enemyCore = sim.buildingsOf(1)[0];
  const ids = [];
  for (let i = 0; i < 8; i++) ids.push(sim._unit(0, 'heavy', enemyCore.x + 14 + (i % 4) * 2.5, enemyCore.z + Math.floor(i / 4) * 2.5).id);
  sim.command(0, { type: 'attack', ids, target: enemyCore.id });
  run(sim, 180);
  assert.ok(!sim.get(enemyCore.id), 'the core fell');
  assert.ok(sim.over, 'the match is over');
  assert.deepEqual(sim.over.winners, [0]);
  assert.ok(sim.players[0].stats.killed >= 1);
});

test('two computers play a whole match to the end, the same way every time', () => {
  const play = () => {
    const sim = new Sim({ seed: 3, size: 'large', players: [{ faction: 'league', ai: 'hard' }, { faction: 'prism', ai: 'normal' }] });
    let marks = [];
    for (let i = 0; i < 20 * 60 * 30 && !sim.over; i++) {
      sim.step();
      if (sim.tick % 2400 === 0) marks.push(sim.fingerprint());
    }
    return { sim, marks };
  };
  const a = play();
  assert.ok(a.sim.over, `a winner after ${Math.round(a.sim.seconds)} s`);
  assert.equal(a.sim.over.winners.length, 1);
  for (const p of a.sim.players) assert.ok(p.stats.made > 10 && p.stats.gathered > 1000, `${p.faction} played: ${JSON.stringify(p.stats)}`);
  const b = play();
  assert.deepEqual(b.marks, a.marks, 'same seed, same match');
});

test('surrender and orders for things you do not own are ignored or end you', () => {
  const sim = two();
  const theirs = sim.unitsOf(1)[0];
  const before = { x: theirs.x, z: theirs.z };
  sim.command(0, { type: 'move', ids: [theirs.id], x: 10, z: 10 });
  run(sim, 2);
  assert.ok(Math.hypot(theirs.x - before.x, theirs.z - before.z) < 1, 'not mine: no move');
  sim.command(0, { type: 'surrender' });
  sim.step();
  assert.equal(sim.players[0].alive, false);
  assert.deepEqual(sim.over.winners, [1]);
  assert.equal(sim.unitsOf(0).length, 0);
  assert.ok(CELL > 0);
});
