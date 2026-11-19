import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heightAt, groundAt, waterAt, surfaceAt, slopeAt, canyonAt, bridgeDeck, bridgeEnds, riverLevel, poolLevel, pathDistance, isClear, stoneTops } from '../../src/wyldhunt/heights.js';
import { EXTENT, CANYON, PATH, RIVER, FALLS, NODES, HERDS, NESTS, MONSTER_AREAS, DEN, CAMP, START, BRIDGE, FORD, AREAS, areaAt, sampleLine, nearestOnLine, pointAt, halfWidthAt } from '../../src/wyldhunt/map.js';
import { SETTINGS, TIERS, chooseTier, Governor, LIVE } from '../../src/wyldhunt/quality.js';
import * as R from '../../src/wyldhunt/rules.js';
import { MonsterBrain, Tracker, MountBrain, GAITS, TRACK_GOAL, MONSTER_SPEED, wrap } from '../../src/wyldhunt/brains.js';
import { LOOKS, COMPANIONS, BARKS, ARMS } from '../../src/wyldhunt/cast.js';
import { PACKS, POLYFORK_MODELS } from '../../src/wyldhunt/credits.js';

/** A seeded 0…1 stream. */
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/* ------------------------------------------------------------------ the land */

test('terrain: deterministic and finite over the whole map', () => {
  assert.equal(heightAt(12.3, -45.6), heightAt(12.3, -45.6));
  for (let x = EXTENT.x0; x <= EXTENT.x1; x += 19) for (let z = EXTENT.z0; z <= EXTENT.z1; z += 23) assert.ok(Number.isFinite(heightAt(x, z)), `height at ${x},${z}`);
});

test('terrain: the path climbs the floor gently, walls tower either side', () => {
  for (let s = 0; s < PATH.len; s += 6) {
    const p = pointAt(PATH, s);
    const c = canyonAt(p.x, p.z);
    assert.ok(c.e < 0, `path inside the floor at s=${s}`);
    if (Math.abs(p.z - BRIDGE.z) > 12) assert.ok(slopeAt(p.x, p.z) < 0.7, `path walkable (even for the mount) at s=${s} (${slopeAt(p.x, p.z).toFixed(2)})`);
  }
  // The falls' basin is higher than the camp: the path climbs.
  assert.ok(heightAt(0, -318) > heightAt(START.x, START.z) + 15);
  // Walls: well above the floor beside the path.
  for (const s of [100, 300, 500, 700]) {
    const p = pointAt(CANYON, s);
    const W = halfWidthAt(s);
    const nx = Math.cos(p.yaw);
    const nz = -Math.sin(p.yaw);
    const wall = Math.max(heightAt(p.x + nx * (W + 45), p.z + nz * (W + 45)), heightAt(p.x - nx * (W + 45), p.z - nz * (W + 45)));
    assert.ok(wall > heightAt(p.x, p.z) + 40, `walls at s=${s}`);
  }
});

test('terrain: the map is closed by cliffs at both ends', () => {
  assert.ok(heightAt(4, 450) > heightAt(CAMP.x, CAMP.z) + 25, 'behind the camp');
  assert.ok(heightAt(10, -460) > heightAt(10, -380) + 60, 'behind the Grand Fall');
  assert.ok(slopeAt(4, 432) > 1 || slopeAt(4, 440) > 1, 'too steep to climb out by the camp');
});

test('water: the river runs downhill in its bed, the pools hold water, the ford is shallow', () => {
  let prev = Infinity;
  for (let s = 0; s < RIVER.len; s += 10) {
    const lvl = riverLevel(s);
    assert.ok(lvl <= prev + 1e-6, `never flows uphill at s=${s}`);
    prev = lvl;
    const p = pointAt(RIVER, s);
    assert.ok(heightAt(p.x, p.z) < lvl, `bed below the surface at s=${s}`);
  }
  for (const f of FALLS) {
    assert.ok(waterAt(f.pool.x, f.pool.z) === poolLevel(f), `${f.id} pool holds water`);
    assert.ok(heightAt(f.pool.x, f.pool.z) < poolLevel(f) - 1, `${f.id} pool is deep`);
  }
  const depth = waterAt(FORD.x, FORD.z) - heightAt(FORD.x, FORD.z);
  assert.ok(depth > 0 && depth < 0.8, `ford is wadeable (${depth.toFixed(2)} m)`);
  assert.ok(['water', 'shallow'].includes(surfaceAt(FORD.x, FORD.z)));
  // Stepping stones stand out of the water.
  for (const [x, z, , top] of stoneTops()) assert.ok(groundAt(x, z) >= top - 1e-6 && top > waterAt(x, z), 'stone above water');
});

test('the rope bridge spans the gorge: its deck is walkable high over the water', () => {
  const ends = bridgeEnds();
  assert.ok(Math.abs(ends.a - ends.b) < 3, 'level-ish ends');
  const deck = bridgeDeck(BRIDGE.x, BRIDGE.z);
  assert.ok(Number.isFinite(deck));
  assert.ok(deck > heightAt(BRIDGE.x, BRIDGE.z) + 3, 'well above the gorge floor');
  assert.equal(groundAt(BRIDGE.x, BRIDGE.z), deck);
  assert.equal(surfaceAt(BRIDGE.x, BRIDGE.z), 'wood');
  assert.ok(!Number.isFinite(bridgeDeck(BRIDGE.x + 5, BRIDGE.z)), 'off the deck to the side');
});

test('places: gathering spots, herds, nests and the monster\'s haunts are on dry floor', () => {
  for (const p of [...NODES, ...HERDS, ...NESTS, DEN, CAMP]) {
    assert.ok(canyonAt(p.x, p.z).e < -1, `${p.id ?? `${p.x},${p.z}`} on the floor`);
    assert.ok(!(waterAt(p.x, p.z) > heightAt(p.x, p.z) + 0.3), `${p.id ?? `${p.x},${p.z}`} not under water`);
  }
  for (const a of MONSTER_AREAS) assert.ok(canyonAt(a.x, a.z).e < 0, `${a.id} reachable`);
  assert.equal(areaAt(CAMP.x, CAMP.z), 'camp');
  assert.equal(areaAt(DEN.x, DEN.z), 'hollow');
  assert.ok(new Set(NODES.map((n) => n.kind)).size === 4);
  assert.ok(!isClear(START.x, START.z), 'nothing grows on the path');
  assert.ok(pathDistance(START.x, START.z) < 4);
});

test('lines: sampling and the nearest point', () => {
  const l = sampleLine([[0, 0], [10, 0], [20, 0]], 1);
  assert.ok(Math.abs(l.len - 20) < 0.01);
  const n = nearestOnLine(l, 5, 3);
  assert.ok(Math.abs(n.d - 3) < 0.01 && Math.abs(n.s - 5) < 0.05);
  const p = pointAt(l, 12);
  assert.ok(Math.abs(p.x - 12) < 0.05 && Math.abs(p.yaw - Math.PI / 2) < 0.01);
  assert.ok(AREAS.every((a) => a.name && a.r > 0));
});

/* ------------------------------------------------------------------ quality */

test('quality: tiers grow, the guess and the governor', () => {
  for (let i = 1; i < TIERS.length; i++) {
    const a = SETTINGS[TIERS[i - 1]];
    const b = SETTINGS[TIERS[i]];
    for (const k of ['scale', 'shadow', 'furShells', 'rain', 'mist', 'plants']) assert.ok(b[k] >= a[k], `${k} grows ${TIERS[i]}`);
  }
  assert.ok(LIVE.includes('rain') && LIVE.includes('furShells'));
  assert.equal(chooseTier({ gpu: 'SwiftShader' }), 'low');
  assert.equal(chooseTier({ gpu: 'Apple M3 Max' }), 'ultra');
  const g = new Governor('high');
  let changed = null;
  for (let i = 0; i < 400 && !changed; i++) changed = g.frame(40);
  assert.equal(changed, 'medium');
});

/* ------------------------------------------------------------------ the fight's numbers */

test('rules: damage scales with motion value, charge, sharpness and hit zone', () => {
  const r = () => 0.5;
  const a = R.blowDamage({ attack: 60, mv: 0.5, zone: 0.5, rand: r }).amount;
  const b = R.blowDamage({ attack: 60, mv: 0.5, zone: 0.5, charge: 2, rand: r }).amount;
  const c = R.blowDamage({ attack: 60, mv: 0.5, zone: 0.8, rand: r }).amount;
  assert.ok(b > a * 1.8 && c > a);
  const W = R.WEAPONS.greatblade;
  assert.ok(W.chargeMult.every((m, i) => i === 0 || m > W.chargeMult[i - 1]));
  assert.equal(R.GNARLHORN.parts.head.cut > R.GNARLHORN.parts.body.cut, true, 'the head is the weak spot');
});

test('rules: sharpness dulls, bounces off hard hide when dull, and colours', () => {
  assert.equal(R.sharpnessLevel(R.SHARP_MAX).id, 'white');
  assert.equal(R.sharpnessLevel(0).id, 'red');
  let p = R.SHARP_MAX;
  const w = R.wearBlade(p, 1);
  assert.equal(w.points, p - 1);
  assert.equal(w.bounce, false);
  assert.equal(R.wearBlade(30, 2).bounce, true, 'dull blade bounces off plates');
  assert.equal(R.wearBlade(110, 2).bounce, false, 'a keen blade bites');
  p = 1;
  assert.equal(R.wearBlade(p, 2).points, 0);
});

test('rules: parts break once, at their threshold', () => {
  const st = {};
  assert.deepEqual(R.damagePart(st, 'head', 300), []);
  assert.deepEqual(R.damagePart(st, 'head', 300), ['head']);
  assert.deepEqual(R.damagePart(st, 'head', 900), [], 'only once');
  assert.deepEqual(R.damagePart(st, 'body', 9999), [], 'the body does not break');
  assert.deepEqual(R.damagePart(st, 'tail', R.GNARLHORN.parts.tail.breakAt), ['tail']);
  assert.deepEqual(st.broken.sort(), ['head', 'tail']);
  assert.equal(R.monsterMood(1), 'calm');
  assert.equal(R.monsterMood(0.5), 'enraged');
  assert.equal(R.monsterMood(0.2), 'weak');
});

test('rules: the hunter is hurt, harder when it rages; stamina drains and refills', () => {
  const a = R.hurtHunter(R.MONSTER_ATTACKS.bite);
  assert.ok(R.hurtHunter(R.MONSTER_ATTACKS.bite, { enraged: true }) > a);
  assert.ok(R.hurtHunter(R.MONSTER_ATTACKS.bite, { defence: 50 }) < a);
  assert.equal(R.MONSTER_ATTACKS.roar.damage, 0);
  assert.ok(R.staminaStep(100, 1, { sprinting: true }) < 100);
  assert.equal(R.staminaStep(149, 1), R.HUNTER.stamina);
  assert.ok(R.canPay(5, 25) && !R.canPay(0, 25));
});

test('bag: stacks fill first, new stacks after, no more than it holds; healing has no cooldown', () => {
  const bag = [];
  assert.equal(R.addItem(bag, 'sunleaf', 45), 45);
  assert.deepEqual(bag.map((s) => s.n), [30, 15], 'two stacks');
  assert.equal(R.addItem(bag, 'sunleaf', 3), 3);
  assert.equal(bag[1].n, 18);
  assert.equal(R.addItem(bag, 'nonsense', 3), 0);
  assert.equal(R.count(bag, 'sunleaf'), 48);
  assert.ok(R.takeItem(bag, 'sunleaf', 20));
  assert.equal(R.count(bag, 'sunleaf'), 28);
  assert.equal(R.takeItem(bag, 'sunleaf', 99), false, 'not enough: nothing taken');
  assert.equal(R.count(bag, 'sunleaf'), 28);
  // Full bag: only what fits.
  const full = Array.from({ length: R.BAG_SIZE }, () => ({ id: 'oldbone', n: 30 }));
  assert.equal(R.addItem(full, 'sunleaf', 5), 0);
  // Potions: drink one after another, as long as there are any.
  const kit = R.newKit().bag;
  let drunk = 0;
  while (R.takeItem(kit, 'potion', 1)) drunk++;
  assert.equal(drunk, 10);
  assert.equal(R.ITEMS.potion.use.heal > 0, true);
  // The whetstone never runs out; the supply box tops the kit back up.
  assert.ok(R.takeItem(kit, 'whetstone', 1) && R.takeItem(kit, 'whetstone', 1));
  const got = R.restock(kit);
  assert.ok(got.some(([id, n]) => id === 'potion' && n === 10));
  assert.equal(R.count(kit, 'potion'), 10);
});

test('gathering: a spot gives a few times, is spent, then grows back', () => {
  const spot = {};
  const r = seeded(4);
  const got = [];
  for (let i = 0; i < 5; i++) got.push(R.gather(spot, 'herb', r));
  assert.equal(got.filter(Boolean).length, R.GATHER.herb.uses);
  for (const g of got.filter(Boolean)) assert.ok(['sunleaf', 'dewcap'].includes(g.item) && g.n >= 1);
  assert.equal(R.regrow(spot, 'herb', 10), false);
  assert.equal(R.regrow(spot, 'herb', R.GATHER.herb.regrow), true);
  assert.ok(R.gather(spot, 'herb', r));
  for (const k of Object.keys(R.GATHER)) for (const [id] of R.GATHER[k].yields) assert.ok(R.ITEMS[id], `${id} is an item`);
});

test('carving: body and tail give the beast\'s materials', () => {
  const r = seeded(9);
  for (let i = 0; i < 20; i++) assert.ok(R.ITEMS[R.carve('body', r).item]);
  for (let i = 0; i < 10; i++) assert.ok(['gnarlClub', 'gnarlScale'].includes(R.carve('tail', r).item));
  assert.equal(R.CARVES, 3);
});

test('weather: a cycle with sun and a shower, always 0–1', () => {
  let max = 0;
  let min = 1;
  for (let t = 0; t < R.CYCLE_LEN * 2; t += 1) {
    const v = R.rainAt(t);
    assert.ok(v >= 0 && v <= 1);
    max = Math.max(max, v);
    min = Math.min(min, v);
  }
  assert.ok(max > 0.95 && min < 0.01);
  assert.equal(R.rainAt(10), R.rainAt(10 + R.CYCLE_LEN));
});

/* ------------------------------------------------------------------ minds */

const AREAS2 = [{ id: 'a', x: 0, z: 0, r: 10 }, { id: 'b', x: 80, z: 0, r: 10 }];
const run = (b, secs, hunter, extra = {}) => {
  const ev = [];
  for (let t = 0; t < secs; t += 0.05) ev.push(...b.update(0.05, { hunter, ...extra }));
  return ev;
};

test('monster: roams between its haunts leaving tracks when nothing is near', () => {
  const b = new MonsterBrain({ areas: AREAS2, den: { x: -60, z: 0 }, rand: seeded(1) });
  const ev = run(b, 70, null);
  assert.ok(ev.some((e) => e.type === 'track'), 'leaves tracks');
  assert.ok(ev.some((e) => e.type === 'arrive' && e.area === 'b'), 'walks to its other haunt');
  assert.ok(['roam', 'linger'].includes(b.state));
});

test('monster: notices the hunter, turns, roars, then fights with bites, tail sweeps and charges', () => {
  const b = new MonsterBrain({ areas: AREAS2, den: { x: -60, z: 0 }, rand: seeded(2) });
  let ev = run(b, 0.2, { x: 0, z: 15, alive: true });
  assert.ok(ev.some((e) => e.type === 'notice'));
  assert.equal(b.state, 'alert');
  ev = run(b, 1.5, { x: 0, z: 15, alive: true });
  assert.ok(ev.some((e) => e.type === 'windup' && e.attack === 'roar'), 'roars first');
  // Hunter close in front: bites; behind: tail; far: charges.
  const kinds = new Set();
  for (const [hx, hz] of [[0, 4], [0, -5], [0, 25], [3, 4], [-4, -4]]) {
    const e = run(b, 12, { x: b.x + hx, z: b.z + hz, alive: true });
    for (const x of e) if (x.type === 'windup') kinds.add(x.attack);
  }
  assert.ok(kinds.has('bite'), 'bites');
  assert.ok(kinds.has('charge') || kinds.has('tail'), 'sweeps or charges');
  // Every attack runs wind-up → strike → recover.
  const c = new MonsterBrain({ areas: AREAS2, den: { x: -60, z: 0 }, rand: seeded(3) });
  c.roared = true;
  c._set('engage');
  c.yaw = 0;
  const e2 = run(c, 3, { x: 0, z: 4, alive: true });
  const i = e2.findIndex((x) => x.type === 'windup');
  const j = e2.findIndex((x) => x.type === 'strike');
  assert.ok(i >= 0 && j > i, 'the blow comes after its tell');
});

test('monster: enraged at low health, limps to its den to sleep, wakes when hit, dies', () => {
  const b = new MonsterBrain({ areas: AREAS2, den: { x: -60, z: 0 }, rand: seeded(5) });
  run(b, 2, { x: 0, z: 10, alive: true });
  let ev = b.damage(b.maxHp * 0.45);
  assert.ok(ev.some((e) => e.type === 'enrage'));
  assert.ok(b.enraged);
  b.damage(b.maxHp * 0.3);
  assert.ok(b.limping);
  b.attack = null;
  b._set('engage');
  ev = run(b, 0.2, { x: b.x, z: b.z + 30, alive: true });
  assert.ok(ev.some((e) => e.type === 'flee'));
  ev = [];
  for (let t = 0; t < 150 && b.state !== 'rest'; t += 0.05) ev.push(...b.update(0.05, { hunter: { x: 200, z: 200, alive: true } }));
  assert.ok(ev.some((e) => e.type === 'sleep'), 'goes to ground at its den');
  assert.equal(b.state, 'rest');
  assert.ok(Math.hypot(b.x + 60, b.z) < 8);
  const before = b.hp;
  run(b, 5, null);
  assert.ok(b.hp > before, 'rests and recovers a little');
  ev = b.damage(10);
  assert.ok(ev.some((e) => e.type === 'wake'));
  assert.equal(b.state, 'attack', 'wakes roaring');
  ev = b.damage(b.maxHp);
  assert.ok(ev.some((e) => e.type === 'death'));
  assert.equal(b.alive, false);
  assert.deepEqual(b.update(1, { hunter: { x: 0, z: 0, alive: true } }), [], 'the dead do nothing');
});

test('monster: a burst of damage or a broken part staggers it', () => {
  const b = new MonsterBrain({ areas: AREAS2, den: { x: -60, z: 0 }, rand: seeded(6) });
  run(b, 2, { x: 0, z: 10, alive: true });
  let ev = b.damage(200);
  assert.ok(!ev.some((e) => e.type === 'stagger'));
  ev = b.damage(R.GNARLHORN.staggerAt);
  assert.ok(ev.some((e) => e.type === 'stagger'));
  assert.equal(b.state, 'stagger');
  run(b, 3, { x: 0, z: 10, alive: true });
  assert.notEqual(b.state, 'stagger');
  const c = new MonsterBrain({ areas: AREAS2, den: { x: -60, z: 0 }, rand: seeded(7) });
  run(c, 2, { x: 0, z: 10, alive: true });
  assert.ok(c.damage(5, { stagger: true }).some((e) => e.type === 'stagger'));
});

test('tracking: footprints found lead to the beast; the flies point the way', () => {
  const tr = new Tracker();
  const marks = [tr.add(10, 0), tr.add(20, 0), tr.add(30, 0), tr.add(40, 0)];
  assert.equal(tr.tracked, false);
  assert.equal(tr.lead(0, 0, { x: 99, z: 99 }).mark, marks[0], 'nearest unfound mark first');
  assert.equal(tr.nearest(10.5, 0.5, 2), marks[0]);
  assert.equal(tr.collect(marks[0]), false);
  assert.equal(tr.collect(marks[0]), false, 'once each');
  tr.collect(marks[1]);
  assert.equal(tr.collect(marks[2]), true, `${TRACK_GOAL} marks track it`);
  assert.ok(tr.tracked);
  assert.ok(tr.lead(0, 0, { x: 99, z: 99 }).monster);
  for (let i = 0; i < 60; i++) tr.add(i, i);
  assert.equal(tr.marks.length, 40, 'old marks fade');
});

test('mount: whistled, it comes and waits; ridden, it walks, trots and gallops, jumps, follows the path', () => {
  const m = new MountBrain();
  assert.equal(m.canMount(0, 0), false);
  m.call(0, 0, 0, seeded(1));
  assert.equal(m.state, 'coming');
  assert.ok(Math.hypot(m.x, m.z) > 20, 'comes from out of sight');
  const ev = [];
  for (let i = 0; i < 400 && m.state === 'coming'; i++) ev.push(...m.update(0.05, { h: { x: 0, z: 0 } }));
  assert.equal(m.state, 'waiting');
  assert.ok(ev.some((e) => e.type === 'arrive'));
  assert.ok(m.canMount(0, 0));
  m.mount();
  assert.equal(m.state, 'ridden');
  const go = (secs, input, extra = {}) => {
    for (let t = 0; t < secs; t += 0.05) m.update(0.05, { h: { x: 0, z: 0 }, input, ...extra });
  };
  go(2, { forward: 1, cruise: true });
  const trot = m.speed;
  assert.ok(trot > GAITS[1].v, 'trots');
  go(4, { forward: 1, gallop: true });
  assert.ok(m.speed > trot * 1.6, 'gallops');
  go(4, { forward: 0 });
  assert.ok(m.speed < 0.5, 'stops');
  // Steering is slower at a gallop.
  assert.ok(GAITS[3].v > GAITS[2].v);
  // Jump: up and back down.
  m.update(0.05, { h: { x: 0, z: 0 }, input: { jump: true } });
  assert.ok(m.air);
  go(2, {});
  assert.equal(m.air, false);
  // Auto: turns to follow the path's heading.
  m.yaw = 0;
  go(3, { auto: true }, { pathHeading: Math.PI / 2 });
  assert.ok(Math.abs(wrap(m.yaw - Math.PI / 2)) < 0.2, 'follows the path');
  assert.ok(m.speed > GAITS[2].v * 0.8);
  // It will not climb what it can't.
  const x0 = m.x;
  go(1, { forward: 1, cruise: true }, { walkable: () => false });
  assert.ok(Math.abs(m.x - x0) < 0.5);
  assert.ok(m.dismount());
  assert.equal(m.state, 'waiting');
});

/* ------------------------------------------------------------------ the cast and credits */

test('cast: three looks with armour, two weapons, two companions, lines for every moment', () => {
  assert.equal(LOOKS.length, 3);
  for (const l of LOOKS) assert.ok(l.model && l.equip.chest && l.equip.head && l.height > 1.5);
  assert.deepEqual(Object.keys(ARMS).sort(), ['bow', 'greatblade']);
  assert.equal(COMPANIONS.length, 2);
  for (const k of ['start', 'track', 'spotted', 'roar', 'tail', 'charge', 'rage', 'limp', 'win']) assert.ok(BARKS[k]?.length, k);
  for (const lines of Object.values(BARKS)) for (const [who] of lines) assert.ok(COMPANIONS.some((c) => c.id === who), who);
});

test('credits: every pack has its licence and site; every polyfork body is named', () => {
  for (const p of PACKS) assert.ok(p.name && p.licence && /^https:\/\//.test(p.site) && /^https:\/\//.test(p.licenceUrl), p.name);
  const credited = new Set(POLYFORK_MODELS.map(([id]) => id));
  for (const m of [...LOOKS.map((l) => l.model), ...COMPANIONS.map((c) => c.model), 'deer-base']) assert.ok(credited.has(m), `${m} credited`);
});
