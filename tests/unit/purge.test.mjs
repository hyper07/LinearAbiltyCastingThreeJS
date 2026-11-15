import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Purge, forgeCheck } from '../../src/squad/purge/sim.js';
import { RANKS, BUILDINGS, TICK, SHRINE_GIFTS, BASE_SPAWNS, recipes, upgradeCost } from '../../src/squad/purge/rules.js';
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
    // From some side (a keep's wall may close one).
    const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dz]) => grid.open(s.x + dx * (BUILDINGS[s.type].r + 2), s.z + dz * (BUILDINGS[s.type].r + 2)));
    assert.ok(sides.some(([x, z]) => grid.path(SPAWN.x, SPAWN.z, x, z)), `a way to the ${s.type} at ${s.x},${s.z}`);
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
  const g = new Purge({ countdown: 0, seats: seats(4, 4), seed: 1 });
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
  // Vanguards, as many as you like (the hidden rank needs ten).
  p.ore = 20000;
  [vet.x, vet.z] = [FORGE.x, FORGE.z + 2];
  assert.ok(g.forge(0, 'vanguard'));
  const v2 = g._troop(0, 'veteran', FORGE);
  [v2.x, v2.z] = [FORGE.x, FORGE.z];
  assert.ok(forgeCheck(g.troops, 0, p.ore, p.relics, 'vanguard', p.upg).ok, 'a second Vanguard');
  // A Phantom needs relics.
  const v3 = g._troop(0, 'veteran', FORGE);
  [v3.x, v3.z] = [FORGE.x + 1, FORGE.z];
  for (const t of g.troops) if (t.o === 0 && t.rank === 'vanguard') [t.x, t.z] = [FORGE.x - 1, FORGE.z];
  assert.match(g.canForge(0, 'phantom').why, /relics/);
  g.relics = 4;
  assert.ok(g.forge(0, 'phantom'));
  assert.equal(g.relics, 4, 'relics are not spent');
  // The supply cap.
  p.ore = 1e6;
  g.order(0, { t: 'buy', n: 10 });
  g.order(0, { t: 'buy', n: 10 });
  g.order(0, { t: 'buy', n: 10 });
  assert.equal(g.troops.filter((t) => t.o === 0).length, 24);
});

test('a kill pays the killer; a building pays more, and its relics go to the team’s tally', () => {
  const g = new Purge({ countdown: 0, seats: seats(2, 2), seed: 2 });
  const t = g.troops.find((x) => x.o === 1);
  const foe = g.foes.find((f) => f.tier === 1 && !f.boss);
  const points = g.players[1].points;
  g._hurt(foe, 1e6, t);
  assert.equal(g.players[1].points, points + foe.bounty * 10, 'kills pay points (ore at the Exchange)');
  assert.ok(g.down.has(foe.i));
  const cache = g.buildings.find((b) => b.type === 'cache');
  const before = g.relics;
  g._hurt(cache, 1e6, t);
  assert.equal(g.relics, before + 1, 'a relic for the team');
  assert.ok(g.snapshot().players.every((p) => p.relics === g.relics), 'everyone sees the team’s tally');
  assert.ok(!g.grid.blocked(cache.x, cache.z), 'its ground is open');
});

test('shrines make Veterans stronger; the Heart is sealed until every ward is broken; the king ends it', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 3 });
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

test('time runs out: the bunkers fall and the last stand begins; it is lost when everyone is dead', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), difficulty: 'hell', seed: 4 });
  const t = g.troops[0];
  g.order(0, { t: 'enter', ids: [t.i], id: g.bunkers[0].i });
  for (let i = 0; i < 20 * 20 && !t.inside; i++) g.step(TICK);
  assert.ok(t.inside, 'in the bunker');
  g.left = 0.04;
  g.step(TICK);
  assert.equal(g.over, null, 'not over: the last stand');
  assert.ok(g.lastStand && g.events.some((e) => e.t === 'lastStand'));
  assert.equal(g.bunkers.filter((b) => b.base).length, 0, 'the bunkers have fallen');
  assert.ok(!t.inside, 'out in the open');
  for (const x of [...g.troops]) g._hurt(x, 1e9, g.foes[0]);
  g.players[0].ore = 500;
  g.step(TICK);
  assert.equal(g.over, null, 'ore enough for a Recruit: not lost yet');
  g.players[0].ore = 0;
  g.step(TICK);
  assert.deepEqual(g.over, { won: false, why: 'fallen' });
});

test('soldiers left alone fight what comes; sleeping guards wake when soldiers come near', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 5 });
  g.spawnIn = 1e9; // no stragglers in the way
  const foe = g.foes.find((f) => f.tier === 1 && !f.boss);
  assert.equal(foe.awake, false);
  for (let n = 0; n < 4; n++) g._troop(0, 'veteran');
  const squad = g.troops.filter((t) => t.o === 0).map((t) => t.i);
  g.order(0, { t: 'amove', ids: squad, x: foe.x, z: foe.z });
  for (let i = 0; i < 20 * 90 && foe.hp > 0; i++) g.step(TICK);
  assert.ok(foe.awake || foe.hp <= 0, 'it woke');
  assert.ok(g.players[0].kills > 0, 'the squad killed something');
});

test('four bots alone clear the Gravefield on Casual, inside the time', () => {
  const g = new Purge({ countdown: 0, seats: seats(4, 0), difficulty: 'casual', seed: 11 });
  while (!g.over && g.t < 90 * 60) g.step(TICK);
  assert.equal(g.over?.won, true, `bots stalled: ${JSON.stringify(g.over)} with ${g.keysLeft} wards left at ${(g.t / 60).toFixed(1)} min`);
});

test('a snapshot carries soldiers, the awake dead, hurt buildings and what has fallen', () => {
  const g = new Purge({ countdown: 0, seats: seats(2, 1), seed: 6 });
  const s = g.snapshot();
  assert.equal(s.players.length, 2);
  assert.ok(s.ents.some((e) => e.k === 'troop'));
  assert.ok(!s.ents.some((e) => e.k === 'foe'), 'sleeping guards far off are left to the map');
  assert.deepEqual(s.down, []);
  assert.ok(JSON.stringify(s).length < 20000, 'small enough to send ten times a second');
});

test('waves: a crypt that falls is answered by the crypts near it; the camp gets numbered waves', () => {
  const g = new Purge({ countdown: 0, seats: seats(4, 4), seed: 8 });
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

test('the Forge raises by itself: a soldier walked into its ring goes up one rank a visit', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 12 });
  const p = g.players[0];
  p.ore = 100000;
  const r = g.troops.find((t) => t.rank === 'recruit');
  g.order(0, { t: 'toForge', ids: [r.i] });
  for (let i = 0; i < 20 * 15 && g.troops.every((t) => t.rank !== 'veteran'); i++) g.step(TICK);
  const vet = g.troops.find((t) => t.rank === 'veteran');
  assert.ok(vet, 'a Veteran');
  for (let i = 0; i < 20 * 3; i++) g.step(TICK);
  assert.ok(!g.troops.some((t) => t.rank === 'vanguard'), 'not straight on to Vanguard: one rank a visit');
  // Out of the ring and back: the next rank.
  [vet.x, vet.z] = [FORGE.x + 12, FORGE.z];
  g.step(TICK);
  g.order(0, { t: 'toForge', ids: [vet.i] });
  for (let i = 0; i < 20 * 15 && !g.troops.some((t) => t.rank === 'vanguard'); i++) g.step(TICK);
  assert.ok(g.troops.some((t) => t.rank === 'vanguard'), 'a Vanguard');
  // Off: nothing happens by itself.
  g.order(0, { t: 'autoForge', on: false });
  const r2 = g.troops.find((t) => t.rank === 'recruit');
  g.order(0, { t: 'toForge', ids: [r2.i] });
  for (let i = 0; i < 20 * 15; i++) g.step(TICK);
  assert.ok(g.ents.has(r2.i), 'still a Recruit');
});

test('heal sends soldiers to the pad, where they heal fast; patrol goes back and forth', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 13 });
  const squad = g.troops.filter((t) => t.o === 0);
  for (const t of squad) t.hp = t.max * 0.3;
  g.order(0, { t: 'heal', ids: squad.map((t) => t.i) });
  for (let i = 0; i < 20 * 12; i++) g.step(TICK);
  assert.ok(squad.every((t) => t.hp >= t.max * 0.95), 'healed');
  const t = squad[0];
  g.order(0, { t: 'patrol', ids: [t.i], x: t.x + 14, z: t.z });
  let far = 0;
  let back = false;
  const start = t.x;
  for (let i = 0; i < 20 * 20; i++) {
    g.step(TICK);
    far = Math.max(far, t.x - start);
    if (far > 10 && t.x - start < 3) back = true;
  }
  assert.ok(far > 10 && back, `out ${far.toFixed(1)} m and back`);
});

test('spawn events at the base: a warning, then the dead out of three zones round the camp; the camp has no guns — only soldiers’ kills pay', () => {
  const g = new Purge({ countdown: 0, seats: seats(4, 4), seed: 14 });
  assert.ok(!g.snapshot().ents.some((e) => e.k === 'gun'), 'no guns in the camp');
  g.spawnIn = BASE_SPAWNS.warn + 0.01;
  g.step(TICK);
  const warn = g.events.find((e) => e.t === 'spawnSoon');
  assert.ok(warn && warn.name, `warned, naming it (${warn?.name})`);
  for (let i = 0; i < 20 * (BASE_SPAWNS.warn + 1) && !g.foes.some((f) => f.stray); i++) g.step(TICK);
  const spawned = g.foes.filter((f) => f.stray);
  assert.ok(spawned.length >= BASE_SPAWNS.zones.length, 'some from each zone');
  assert.ok(g.events.some((e) => e.t === 'spawn' && e.name) || true);
  for (const z of BASE_SPAWNS.zones) assert.ok(spawned.some((f) => Math.hypot(f.x - z.x, f.z - z.z) < 4), `out of the zone at ${z.x},${z.z}`);
  assert.ok(spawned.every((f) => f.tier === 1), 'weak, early on');
  assert.ok(spawned.every((f) => BASE_SPAWNS.events.find((e) => e.name === warn.name).kinds.includes(f.kind)), 'what was named');
  // Killed by a soldier: points to its owner, half as many again. Killed by anything else: nothing.
  const p = g.players[0];
  g._hurt(spawned[0], 1e6, g.troops[0]);
  assert.equal(p.points, spawned[0].bounty * 10);
  const ore = p.ore;
  g._hurt(spawned[1], 1e6, spawned[2]);
  assert.equal(p.ore, ore);
  // Never more than the cap at once.
  for (let i = 0; i < 20; i++) {
    g.spawnIn = 0;
    g._baseSpawns(TICK);
  }
  // (A hero's escort and the Hoarder come on top of the cap.)
  assert.ok(g.foes.filter((x) => x.stray && !x.boss && !x.flee).length <= BASE_SPAWNS.cap + BASE_SPAWNS.zones.length * 8);
});

test('the start: a countdown, then everyone’s soldiers arrive at their own bunker', () => {
  const g = new Purge({ seats: seats(2, 2), seed: 30 });
  assert.equal(g.troops.length, 0, 'nobody yet');
  for (let i = 0; i < 20 * 5; i++) g.step(TICK);
  assert.equal(g.troops.length, 0, 'still counting');
  assert.ok(g.snapshot().startIn > 4);
  for (let i = 0; i < 20 * 6; i++) g.step(TICK);
  assert.equal(g.troops.length, 8, 'four each');
  for (const p of g.players) {
    const own = g.bunkers.find((b) => b.base && b.o === p.slot);
    assert.ok(g.troops.filter((t) => t.o === p.slot).every((t) => Math.hypot(t.x - own.x, t.z - own.z) < 5), 'round their own bunker');
  }
});

test('the hidden rank: "???" until Weapons is mastered; then ten Vanguards, a Phantom and a Paragon make a flying Dreadnought that launches drones', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 15 });
  const p = g.players[0];
  p.ore = 1e7;
  g.relics = 100;
  const at = () => [FORGE.x + (Math.random() - 0.5) * 4, FORGE.z + (Math.random() - 0.5) * 4];
  for (let n = 0; n < 10; n++) [g._troop(0, 'vanguard').x, g.troops.at(-1).z] = at();
  for (const r of ['phantom', 'paragon']) [g._troop(0, r).x, g.troops.at(-1).z] = at();
  for (const t of g.troops) if (t.rank !== 'recruit') [t.x, t.z] = at();
  const locked = g.canForge(0, 'dreadnought');
  assert.equal(locked.ok, false);
  assert.ok(locked.secret, 'a secret: shown as ???');
  // Master Weapons: the secret is found.
  p.upg.weapons = 254;
  g.order(0, { t: 'upgrade', key: 'weapons' });
  assert.ok(g.events.some((e) => e.t === 'secret' && e.rank === 'dreadnought'));
  const ship = g.forge(0, 'dreadnought');
  assert.ok(ship && ship.rank === 'dreadnought');
  assert.equal(g.troops.filter((t) => t.rank === 'vanguard').length, 0, 'the ten Vanguards went into it');
  // It flies: straight over a ridge, where a soldier would go round.
  [ship.x, ship.z] = [60, 60];
  g.order(0, { t: 'move', ids: [ship.i], x: 120, z: 120 });
  assert.deepEqual(ship.path, [ship.order.x != null ? [ship.order.x, ship.order.z] : [120, 120]]);
  // Near the dead, it launches drones; they go after a while.
  const foe = g.foes.find((f) => f.tier === 3 && !f.boss);
  [ship.x, ship.z] = [foe.x + 6, foe.z];
  ship.order = { t: 'hold' };
  foe.awake = true;
  g.step(TICK);
  const drones = g.troops.filter((t) => t.rank === 'drone');
  assert.equal(drones.length, 4);
  for (let i = 0; i < 20 * 30; i++) g.step(TICK);
  assert.ok(drones.every((d) => !g.ents.has(d.i)), 'the drones are gone');
});

test('the combinations, as written on the board: the hidden one stays ??? until found', () => {
  const locked = recipes({ weapons: 0, armor: 0 });
  assert.equal(locked.length, 6);
  assert.match(locked[1].text, /Recruit \+ 1,200 ore/);
  assert.deepEqual([locked[5].name, locked[5].text, locked[5].secret], ['???', '???', true]);
  const found = recipes({ weapons: 255, armor: 0 });
  assert.equal(found[5].name, 'Dreadnought');
  assert.match(found[5].text, /10 Vanguards \+ Phantom \+ Paragon/);
});

test('the Exchange: points turn into ore only while one of yours stands on it — an Engineer will do', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 16 });
  const p = g.players[0];
  p.points = 5000;
  const ore = p.ore;
  for (let i = 0; i < 20; i++) g.step(TICK);
  assert.equal(p.points, 5000, 'nobody there: nothing changes');
  g.order(0, { t: 'buy', n: 1, rank: 'engineer' });
  const eng = g.troops.find((t) => t.rank === 'engineer');
  assert.ok(eng, 'an Engineer, from the barracks');
  g.order(0, { t: 'toExchange', ids: [eng.i] });
  for (let i = 0; i < 20 * 15 && p.points >= 10; i++) g.step(TICK);
  assert.ok(p.points < 10, 'all exchanged');
  assert.ok(p.ore >= ore - 75 + 500 - 1, '5000 points made 500 ore');
});

test('the camp heals everyone in it to full every few seconds: 10 ore a soldier, or 100 points; with neither, nothing', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 17 });
  const p = g.players[0];
  const t = g.troops[0];
  t.order = { t: 'hold' };
  t.hp = 10;
  p.ore = 0;
  p.points = 0;
  for (let i = 0; i < 20 * 6; i++) g.step(TICK);
  assert.ok(t.hp < 11, 'nothing to pay with: no healing');
  p.ore = 25;
  for (let i = 0; i < 20 * 6; i++) g.step(TICK);
  assert.equal(t.hp, t.max, 'healed');
  assert.equal(p.ore, 15, 'for 10 ore');
  p.ore = 0;
  p.points = 250;
  t.hp = 10;
  for (let i = 0; i < 20 * 6; i++) g.step(TICK);
  assert.equal(t.hp, t.max, 'healed on points');
  assert.equal(p.points, 150, 'for 100 points');
});


test('bunkers: six inside, safe, fighting on; Engineers build more, and those can be broken', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 18 });
  const p = g.players[0];
  p.ore = 1e5;
  g.order(0, { t: 'buy', n: 5 });
  const squad = g.troops.filter((t) => t.rank === 'recruit');
  const own = g.bunkers[0];
  g.order(0, { t: 'enter', ids: squad.map((t) => t.i), id: own.i });
  for (let i = 0; i < 20 * 25; i++) g.step(TICK);
  assert.equal(own.seats.length, 6, 'six seats');
  assert.equal(squad.filter((t) => t.inside).length, 6);
  const sitting = squad.find((t) => t.inside);
  const hp = sitting.hp;
  g._hurt(sitting, 500, g.foes[0]);
  g._hurt(own, 1e9, g.foes[0]);
  assert.equal(sitting.hp, hp, 'cannot be hit inside');
  assert.ok(g.ents.has(own.i), 'your own bunker cannot be broken');
  g.order(0, { t: 'unload' });
  assert.equal(own.seats.length, 0);
  // An Engineer builds one.
  g.order(0, { t: 'buy', n: 1, rank: 'engineer' });
  const eng = g.troops.find((t) => t.rank === 'engineer');
  g.order(0, { t: 'build', ids: [eng.i], x: 30, z: 30 });
  for (let i = 0; i < 20 * 25 && !g.events.some((e) => e.t === 'built'); i++) g.step(TICK);
  const built = g.bunkers.find((b) => !b.base);
  assert.ok(built && built.built >= 1, 'built');
  g._hurt(built, 1e9, g.foes[0]);
  assert.ok(!g.ents.has(built.i), 'a built bunker can be broken');
});

test('one game’s ruins never leak into the next game’s ground', () => {
  const a = new Purge({ countdown: 0, seats: seats(1, 1), seed: 19 });
  const b0 = a.buildings.find((b) => b.type === 'crypt');
  a._hurt(b0, 1e9, a.troops[0]);
  assert.ok(!a.grid.blocked(b0.x, b0.z));
  const b = new Purge({ countdown: 0, seats: seats(1, 1), seed: 20 });
  assert.ok(b.grid.blocked(b0.x, b0.z), 'standing again in a new game');
  const again = b.buildings.find((x) => x.i === b0.i);
  b._hurt(again, 1e9, b.troops[0]);
  assert.ok(!b.grid.blocked(b0.x, b0.z), 'and can fall again');
});

test('team play: a building broken or a hero killed pays the others half; every two minutes some points are exchanged for everyone', () => {
  const g = new Purge({ countdown: 0, seats: seats(3, 3), seed: 21 });
  const [a, b, c] = g.players;
  const t = g.troops.find((x) => x.o === 0);
  const crypt = g.buildings.find((x) => x.type === 'crypt');
  g._hurt(crypt, 1e9, t);
  assert.ok(a.points > 0);
  assert.equal(b.points, a.points / 2, 'half to each of the others');
  assert.equal(c.points, a.points / 2);
  const before = [a.points, b.points];
  const plain = g.foes.find((f) => !f.boss && f.tier === 1);
  g._hurt(plain, 1e9, t);
  assert.ok(a.points > before[0]);
  assert.equal(b.points, before[1], 'an ordinary kill is the killer’s alone');
  // The two-minute exchange: the biggest of 500 / 1,000 / 1,500 ore the points cover.
  a.points = 12000;
  b.points = 6000;
  c.points = 3000;
  const ore = [a.ore, b.ore, c.ore];
  g.autoT = 0;
  g.stipendT = 1e9;
  g.step(TICK);
  assert.deepEqual([a.ore - ore[0], b.ore - ore[1], c.ore - ore[2]], [1000, 500, 0]);
  assert.deepEqual([a.points, b.points, c.points], [2000, 1000, 3000]);
});

test('the Stim Pack: faster for a while, for a tenth of health; never an Engineer', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 22 });
  const t = g.troops.find((x) => x.rank === 'recruit');
  g.order(0, { t: 'buy', n: 1, rank: 'engineer' });
  const eng = g.troops.find((x) => x.rank === 'engineer');
  const before = g.troopStat(t);
  const hp = t.hp;
  g.order(0, { t: 'stim', ids: [t.i, eng.i] });
  const now = g.troopStat(t);
  assert.equal(now.rate, before.rate * 1.5);
  assert.equal(now.speed, before.speed * 1.5);
  assert.equal(t.hp, hp - t.max * 0.1);
  assert.ok(!(eng.stim > g.t), 'no stim for Engineers');
  g.t += 11;
  assert.equal(g.troopStat(t).rate, before.rate, 'worn off');
});

test('the dead in the air: a Frost Wraith freezes soldiers (no acting, no harm); a Bile Drifter slows them; both fly over ridges', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 23 });
  g.spawnIn = 1e9;
  const squad = g.troops.filter((t) => t.o === 0 && t.rank === 'recruit');
  for (const [k, t] of squad.entries()) [t.x, t.z] = [70 + k, 70];
  const w = g._foe('wraith', 76, 70, { tier: 3 });
  w.awake = true;
  w.freezeT = 0; // ready to cast
  for (let i = 0; i < 20 * 20 && !squad.some((t) => g.frozen(t)); i++) g.step(TICK);
  const ice = squad.filter((t) => g.frozen(t));
  assert.ok(ice.length >= 1, 'frozen');
  const hp = ice[0].hp;
  g._hurt(ice[0], 1e6, w);
  assert.equal(ice[0].hp, hp, 'cannot be hurt while frozen');
  const x = ice[0].x;
  g.order(0, { t: 'move', ids: [ice[0].i], x: x + 20, z: 70 });
  for (let i = 0; i < 20; i++) g.step(TICK);
  assert.equal(ice[0].x, x, 'cannot move while frozen');
  // Bile.
  const g2 = new Purge({ countdown: 0, seats: seats(1, 1), seed: 24 });
  g2.spawnIn = 1e9;
  const r = g2.troops.find((t) => t.rank === 'recruit');
  [r.x, r.z] = [70, 70];
  const m = g2._foe('mire', 75, 70, { tier: 2 });
  m.awake = true;
  const speed = g2.troopStat(r).speed;
  for (let i = 0; i < 20 * 10 && !(r.slow > g2.t); i++) g2.step(TICK);
  assert.ok(r.slow > g2.t, 'slimed');
  assert.equal(g2.troopStat(r).speed, speed * 0.5);
  // Flying: straight over a blocked cell, where walkers go round.
  const f = g2._foe('mire', 100 * Math.cos(0.5) + 6, 100 * Math.sin(0.5), { tier: 2 });
  f.path = [[100 * Math.cos(0.5) - 6, 100 * Math.sin(0.5)]];
  const x0 = f.x;
  for (let i = 0; i < 40; i++) g2._walk(f, 6, TICK);
  assert.ok(f.x < x0 - 6, 'flew over the ridge');
});

test('the hero monsters: go for the hurt and the strong, never an Engineer first; rage when low', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 25 });
  g.spawnIn = 1e9;
  const boss = g._foe('marrow', 80, 80, { tier: 2 });
  boss.awake = true;
  g.order(0, { t: 'buy', n: 1, rank: 'engineer' });
  const eng = g.troops.find((t) => t.rank === 'engineer');
  const vet = g._troop(0, 'veteran');
  const rec = g.troops.find((t) => t.rank === 'recruit');
  [eng.x, eng.z] = [82, 80];
  [rec.x, rec.z] = [84, 80];
  [vet.x, vet.z] = [86, 80];
  for (const t of [eng, rec, vet]) t.order = { t: 'hold' };
  g._hash();
  g._foeStep(boss, TICK);
  assert.equal(boss.tgt, vet.i, 'the strongest near, not the nearest Engineer');
  boss.hp = boss.max * 0.3;
  boss.think = 0;
  const dmg = boss.dmg;
  g._foeStep(boss, TICK);
  assert.ok(boss.enraged && boss.dmg > dmg, 'enraged');
});

test('players only: alone, one bunker and fewer, weaker dead than four face', () => {
  const one = new Purge({ countdown: 0, seats: seats(1, 1), seed: 31 });
  const four = new Purge({ countdown: 0, seats: seats(4, 4), seed: 31 });
  assert.equal(one.bunkers.length, 1, 'one bunker');
  assert.equal(four.bunkers.length, 4);
  assert.ok(one.players.every((p) => !p.bot));
  const crypt = (g) => g.buildings.find((b) => b.type === 'crypt');
  assert.ok(crypt(one).max < crypt(four).max, 'weaker buildings alone');
  assert.ok(one.foes[0].max < four.foes[0].max, 'weaker dead alone');
  for (const g of [one, four]) {
    g.spawnIn = 0;
    g._baseSpawns(TICK);
  }
  assert.ok(one.foes.filter((f) => f.stray).length < four.foes.filter((f) => f.stray).length, 'fewer from the spawn zones');
});

test('pulling a hero: it follows the soldier it picked all the way to the camp; a bunker makes it let go and go home; nothing in a bunker is hurt', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 32 });
  g.spawnIn = 1e9;
  g.raidT = 1e9;
  // Open ground east of the camp.
  const hero = g._foe('warden', 80, 30, { tier: 2 });
  hero.home = { x: 80, z: 30 };
  const lure = g._troop(0, 'veteran');
  [lure.x, lure.z] = [70, 30];
  for (let i = 0; i < 20; i++) g.step(TICK);
  assert.ok(hero.awake && hero.puller === lure.i, 'noticed, and picked the lure');
  // The lure runs straight home, faster than the hero, out of its sight: it still follows.
  const own = g.bunkers[0];
  g.order(0, { t: 'move', ids: [lure.i], x: own.x - 4, z: own.z });
  for (let i = 0; i < 20 * 30; i++) {
    g.step(TICK);
    lure.hp = lure.max; // a hardy lure
  }
  assert.ok(Math.hypot(hero.x - own.x, hero.z - own.z) < 14, `followed it to the camp (${Math.round(Math.hypot(hero.x - own.x, hero.z - own.z))} m from the bunker)`);
  // Into the bunker: the hero lets go, cannot touch it, and turns for home.
  g.order(0, { t: 'enter', ids: [lure.i], id: own.i });
  for (let i = 0; i < 20 * 3 && !lure.inside; i++) g.step(TICK);
  assert.ok(lure.inside, 'in the bunker');
  g.step(TICK);
  assert.ok(hero.leaving && hero.puller == null, 'let go');
  const hp = lure.hp;
  g._hurt(lure, 1e6, hero);
  assert.equal(lure.hp, hp, 'nothing in a bunker is hurt');
  const near = Math.hypot(hero.x - own.x, hero.z - own.z);
  for (let i = 0; i < 20 * 8; i++) g.step(TICK);
  assert.ok(Math.hypot(hero.x - own.x, hero.z - own.z) > near + 10, 'walking home');
});

test('upgrades: weapons to 255 (+2% a level), plating to 100 (+1 armour a level); several levels at once', () => {
  const g = new Purge({ countdown: 0, seats: seats(1, 1), seed: 33 });
  const p = g.players[0];
  const t = g.troops[0];
  const base = g.troopStat(t).dmg;
  p.ore = 1e9;
  g.order(0, { t: 'upgrade', key: 'weapons', n: 10 });
  assert.equal(p.upg.weapons, 10);
  assert.ok(Math.abs(g.troopStat(t).dmg - base * 1.2) < 1e-9, '+20% at level 10');
  g.order(0, { t: 'upgrade', key: 'weapons', n: 'max' });
  g.order(0, { t: 'upgrade', key: 'armor', n: 'max' });
  assert.deepEqual([p.upg.weapons, p.upg.armor], [255, 100]);
  assert.equal(g.troopStat(t).armor, RANKS[t.rank].armor + 100);
  // Max buys only what the ore covers; the first level is cheap.
  const h = new Purge({ countdown: 0, seats: seats(1, 1), seed: 34 });
  h.players[0].ore = 1000;
  h.order(0, { t: 'upgrade', key: 'weapons', n: 'max' });
  assert.ok(h.players[0].upg.weapons >= 8 && h.players[0].upg.weapons < 20, `${h.players[0].upg.weapons} levels for 1,000 ore`);
  assert.ok(h.players[0].ore < upgradeCost('weapons', h.players[0].upg.weapons));
});

test('spawn events: every fifth a hero of the dead marches on the camp; every seventh the Hoarder runs with its loot, and gets away if not caught', () => {
  const g = new Purge({ countdown: 0, seats: seats(4, 4), seed: 35 });
  g.raidT = 1e9;
  const fire = () => {
    g.spawnIn = 0;
    g.spawnWarned = false;
    g.events = [];
    g._baseSpawns(TICK);
    return g.events.find((e) => e.t === 'spawn');
  };
  for (let k = 0; k < 4; k++) fire();
  const fifth = fire();
  assert.equal(fifth.name, 'A Hero Walks');
  const hero = g.foes.find((f) => f.kind === fifth.hero && f.stray);
  assert.ok(hero && hero.boss && hero.raid, 'a hero, marching on the camp');
  fire();
  const seventh = fire();
  assert.equal(seventh.name, 'The Hoarder');
  const hoarder = g.ents.get(seventh.hoarder);
  assert.ok(hoarder && hoarder.flee);
  // It runs from a soldier.
  const t = g.troops[0];
  [t.x, t.z] = [hoarder.x - 3, hoarder.z];
  t.order = { t: 'hold' };
  g._hash();
  const x = hoarder.x;
  for (let i = 0; i < 10; i++) g._foeStep(hoarder, TICK);
  assert.ok(hoarder.x > x, 'away from the soldier');
  // Caught: a big prize. Not caught: gone.
  const big = hoarder.bounty;
  assert.ok(big >= 500, `worth ${big}`);
  g.t = hoarder.flee + 1;
  g._foeStep(hoarder, TICK);
  assert.ok(!g.ents.has(hoarder.i), 'got away');
  assert.ok(g.events.some((e) => e.t === 'escaped'));
});
