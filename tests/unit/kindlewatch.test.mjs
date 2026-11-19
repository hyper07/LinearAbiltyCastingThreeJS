import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../../src/kindlewatch/rules.js';
import { makeBrain, SlimeBrain, SentinelBrain, ImpBrain, ArcherBrain, GorehornBrain, JarlBrain } from '../../src/kindlewatch/brains.js';
import { W, H, ROOMS, CORRIDORS, PROPS, PROP_KINDS, SPAWNS, START, BEACONS, buildGrid, buildProps, solidGrid, roomsReachable, roomAt, wallHeights, wallDepth, doorsOf, footprint, buildMasks, sampleMask, MASK_RES, WALL, FLOOR } from '../../src/kindlewatch/map.js';
import { distanceTransform, insideDistance, heightFromAlpha, normalsFromHeight, packNormals, unpackNormal, signedDistance, dilate, maxFilter, toHalf } from '../../src/kindlewatch/normals.js';
import { kf, RIGS, heroPose, foePose, ordered } from '../../src/kindlewatch/puppet.js';
import { PACKS, OWN } from '../../src/kindlewatch/credits.js';

const seq = (vals) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};
const run = (brain, ctx, secs, dt = 1 / 60) => {
  const outs = [];
  for (let t = 0; t < secs; t += dt) outs.push(brain.update(dt, typeof ctx === 'function' ? ctx() : ctx));
  return outs;
};

/* ------------------------------------------------------------------ combat formulas */

test('heroes: two heroes, each with a 3-hit combo, a heavy, a dash, a ranged skill with pips, a summon, potions', () => {
  assert.deepEqual(R.HERO_ORDER, ['warden', 'runner']);
  for (const id of R.HERO_ORDER) {
    const h = R.HEROES[id];
    assert.equal(h.combo.length, 3, `${id} combo`);
    for (const s of h.combo) {
      assert.ok(s.hit < s.dur && s.dmg > 0 && s.reach > 0, `${id} step timings`);
    }
    assert.ok(h.combo[2].dmg > h.combo[0].dmg, 'the finisher hits hardest');
    assert.ok(h.heavy.guardBreak && h.heavy.dmg[1] > h.heavy.dmg[0]);
    assert.ok(h.dash.iframes[1] > h.dash.iframes[0] && h.dash.iframes[1] <= h.dash.dur);
    assert.ok(h.ranged.pips >= 3 && h.ranged.recharge > 0);
    assert.ok(h.summon.cost > 0 && h.summon.cost <= h.energy && h.summon.dur > 0);
    assert.ok(h.hp > 0 && h.speed > 0 && h.potion.heal > 0);
  }
});

test('resolveHit: plain blows, blows from behind, a stunned target', () => {
  const open = R.resolveHit({ dmg: 10, angle: 0 }, { facing: Math.PI });
  assert.equal(open.damage, 10);
  assert.equal(open.blocked, false);
  // the blow travels +x, so it comes from -x: a target facing +x is struck in the back
  const back = R.resolveHit({ dmg: 10, angle: 0 }, { facing: 0 });
  assert.ok(back.back);
  assert.equal(back.damage, 13);
  const stunned = R.resolveHit({ dmg: 10, angle: 0 }, { facing: Math.PI, stunned: 1 });
  assert.equal(stunned.damage, 15);
});

test('resolveHit: a guard blocks from the front, soaks, and breaks under a heavy blow', () => {
  const target = { guarding: true, guard: 30, facing: Math.PI };
  const a = R.resolveHit({ dmg: 12, angle: 0 }, target);
  assert.ok(a.blocked && !a.broke);
  assert.equal(a.guard, 18);
  assert.ok(a.damage <= 2, 'only a chip gets through');
  // a guard-breaking blow soaks three times as much: 10 × 3 = 30 ≥ 18 left → breaks
  const b = R.resolveHit({ dmg: 10, angle: 0, guardBreak: true }, { ...target, guard: 18 });
  assert.ok(b.broke && !b.blocked);
  assert.equal(b.damage, 15, 'a breaking blow lands at half again');
  // from behind the shield does nothing
  const c = R.resolveHit({ dmg: 12, angle: 0 }, { guarding: true, guard: 30, facing: 0 });
  assert.ok(!c.blocked && c.back);
  // once broken, blows land at 1.5×
  const d = R.resolveHit({ dmg: 10, angle: 0 }, { guarding: true, guard: 0, facing: Math.PI, broken: 1.5 });
  assert.equal(d.damage, 15);
});

test('inArc: reach, opening and body size', () => {
  assert.ok(R.inArc(0, 0, 0, 2, 1, 1.5, 0));
  assert.ok(!R.inArc(0, 0, 0, 2, 1, -1.5, 0), 'behind');
  assert.ok(!R.inArc(0, 0, 0, 2, 1, 2.6, 0), 'too far');
  assert.ok(R.inArc(0, 0, 0, 2, 1, 2.3, 0, 0.4), 'a big body reaches into range');
  assert.ok(R.inArc(0, 0, 0, 2, Math.PI * 2, -1.5, 0), 'a whirl hits all round');
});

test('knockback, hit-stop and shake scale with weight; reduced motion stops the shake', () => {
  assert.ok(R.knockback(5, 0.5) > R.knockback(5, 4));
  assert.ok(R.hitStopFor('heavy') > R.hitStopFor('light'));
  assert.ok(R.hitStopFor('light', { kill: true }) >= R.HITSTOP.kill);
  assert.ok(R.shakeFor('heavy', false) > R.shakeFor('light', false));
  assert.equal(R.shakeFor('boss', true), 0);
});

test('heavyDamage: nothing before the minimum charge, full at the full charge', () => {
  const h = R.HEROES.warden.heavy;
  assert.equal(R.heavyDamage(h, 0.1), 0);
  assert.equal(R.heavyDamage(h, h.chargeMin), h.dmg[0]);
  assert.equal(R.heavyDamage(h, h.chargeFull), h.dmg[1]);
  assert.equal(R.heavyDamage(h, 5), h.dmg[1]);
  const mid = R.heavyDamage(h, (h.chargeMin + h.chargeFull) / 2);
  assert.ok(mid > h.dmg[0] && mid < h.dmg[1]);
});

/* ------------------------------------------------------------------ combo timing */

test('combo: idle press starts step 0; a press in the window chains; the last step resets', () => {
  const steps = R.HEROES.warden.combo;
  const c = new R.Combo(steps);
  assert.equal(c.press(0), 0);
  assert.equal(c.press(steps[0].chainOpen + 0.01), 1, 'pressed in the window');
  assert.equal(c.press(steps[1].chainOpen + 0.01), 2);
  assert.equal(c.press(0.05), -1, 'mid-finisher presses do nothing yet');
  // after the finisher a fresh chain starts
  assert.equal(c.tick(steps[2].dur + 0.01), -1);
  assert.equal(c.index, -1);
});

test('combo: an early press is buffered and fires when the window opens', () => {
  const steps = R.HEROES.runner.combo;
  const c = new R.Combo(steps);
  c.press(0);
  assert.equal(c.press(steps[0].chainOpen - 0.05), -1);
  assert.ok(c.buffered);
  assert.equal(c.tick(steps[0].chainOpen - 0.01), -1);
  assert.equal(c.tick(steps[0].chainOpen), 1, 'the buffered press goes off at the window');
});

test('combo: missing the window resets the chain', () => {
  const steps = R.HEROES.warden.combo;
  const c = new R.Combo(steps);
  c.press(0);
  c.tick(steps[0].chainClose + 0.05);
  assert.equal(c.index, -1);
  assert.equal(c.press(0), 0, 'starts over at the first blow');
});

test('attackPhase walks windup → active → recover → done', () => {
  const s = R.HEROES.warden.combo[2];
  assert.equal(R.attackPhase(s, 0), 'windup');
  assert.equal(R.attackPhase(s, s.hit + 0.01), 'active');
  assert.equal(R.attackPhase(s, s.dur - 0.01), 'recover');
  assert.equal(R.attackPhase(s, s.dur + 0.01), 'done');
});

/* ------------------------------------------------------------------ dash and the rest of the kit */

test('dash i-frames cover the dash, not after it', () => {
  for (const id of R.HERO_ORDER) {
    const d = R.HEROES[id].dash;
    assert.ok(R.dashInvulnerable(d, 0.01));
    assert.ok(R.dashInvulnerable(d, d.iframes[1] - 0.001));
    assert.ok(!R.dashInvulnerable(d, d.iframes[1] + 0.05));
  }
});

test('ammo pips recharge one at a time and stop at full', () => {
  const def = R.HEROES.warden.ranged;
  let s = { pips: 0, timer: 0 };
  s = R.rechargePips(s, def.recharge * 0.5, def);
  assert.equal(s.pips, 0);
  s = R.rechargePips(s, def.recharge * 0.6, def);
  assert.equal(s.pips, 1);
  s = R.rechargePips(s, def.recharge * 10, def);
  assert.equal(s.pips, def.pips);
  assert.equal(s.timer, 0);
});

test('potions have no cooldown: drink twice in the same instant', () => {
  let st = { hp: 20, potions: 3 };
  const a = R.drink(st, 30, 130);
  assert.ok(a.drank);
  const b = R.drink({ hp: a.hp, potions: a.potions }, 30, 130);
  assert.ok(b.drank, 'no cooldown between draughts');
  assert.equal(b.hp, 80);
  assert.equal(b.potions, 1);
  assert.equal(R.drink({ hp: 130, potions: 2 }, 30, 130).drank, false, 'not at full health');
  assert.equal(R.drink({ hp: 5, potions: 0 }, 30, 130).drank, false, 'none left');
  assert.equal(R.drink({ hp: 120, potions: 1 }, 30, 130).hp, 130, 'capped at max');
});

test('energy is clamped', () => {
  assert.equal(R.gainEnergy(95, 100, 20), 100);
  assert.equal(R.gainEnergy(5, 100, -20), 0);
});

/* ------------------------------------------------------------------ slimes */

test('slimes split: 3 → two 2s → four 1s, flung apart, each smaller and weaker', () => {
  const kids = R.splitSlime({ size: 3, x: 10, y: 10 }, 0, seq([0.5]));
  assert.equal(kids.length, 2);
  for (const k of kids) {
    assert.equal(k.size, 2);
    assert.equal(k.hp, R.SLIME[2].hp);
    assert.ok(Math.hypot(k.vx, k.vy) > 3, 'flung');
  }
  // flung to opposite sides of the blow
  assert.ok(Math.sign(kids[0].y - 10) !== Math.sign(kids[1].y - 10));
  assert.equal(R.splitSlime({ size: 2, x: 0, y: 0 }, 1, seq([0.3])).every((k) => k.size === 1), true);
  assert.deepEqual(R.splitSlime({ size: 1, x: 0, y: 0 }, 0), []);
  assert.equal(R.slimeCount(3), 7);
  assert.ok(R.SLIME[3].hp > R.SLIME[2].hp && R.SLIME[2].hp > R.SLIME[1].hp);
});

/* ------------------------------------------------------------------ enemy state machines and telegraphs */

const far = { self: { x: 0, y: 0, hp: 10, maxHp: 10 }, target: { x: 30, y: 0 }, sees: false };

test('every foe waits idle until it sees you', () => {
  for (const type of ['imp', 'slime', 'sentinel', 'archer', 'gorehorn', 'jarl']) {
    const b = makeBrain(type, seq([0.5]));
    run(b, { ...far, self: { ...far.self, hp: 900, maxHp: 900 } }, 1);
    assert.equal(b.state, 'idle', type);
  }
});

test('imp: darts, then crouches with a line telegraph that grows, then throws an ember', () => {
  const b = new ImpBrain(seq([0.4]));
  const ctx = { self: { x: 0, y: 0 }, target: { x: 5, y: 0 }, sees: true };
  let tele = null;
  let act = null;
  let teleBeforeAct = false;
  for (let i = 0; i < 600 && !act; i++) {
    const o = b.update(1 / 60, ctx);
    if (o.tele) {
      tele = o.tele;
      teleBeforeAct = true;
    }
    if (o.act) act = o.act;
  }
  assert.ok(teleBeforeAct, 'telegraphed first');
  assert.equal(tele.kind, 'line');
  assert.ok(tele.k > 0.9, 'the telegraph fills up before the throw');
  assert.equal(act.kind, 'ember');
  assert.ok(Math.abs(act.angle) < 0.2, 'thrown at you');
});

test('slime: squashes (a landing ring) before it leaps, contact only in the air', () => {
  const b = new SlimeBrain(seq([0.5]), 3);
  const ctx = { self: { x: 0, y: 0 }, target: { x: 2, y: 0 }, sees: true };
  const seen = [];
  let squashFrames = 0;
  let teleFrames = 0;
  for (let i = 0; i < 300; i++) {
    const was = b.state;
    const o = b.update(1 / 60, ctx);
    seen.push(b.state);
    if (was === 'squash' && b.state === 'squash') {
      squashFrames++;
      if (o.tele?.kind === 'circle') teleFrames++;
      assert.ok(!o.contact);
    }
    if (o.act) {
      assert.equal(o.act.kind, 'leap');
      assert.ok(seen.includes('squash'));
    }
    if (was === 'air' && b.state === 'air') assert.ok(o.contact);
  }
  assert.ok(seen.includes('air'));
  assert.ok(squashFrames > 10 && teleFrames === squashFrames, 'the ring shows through the whole squash');
});

test('sentinel: guards while walking, telegraphs a chop with an arc, is open while recovering, reels when its guard breaks', () => {
  const b = new SentinelBrain(seq([0.9]));
  const ctx = { self: { x: 0, y: 0 }, target: { x: 1.5, y: 0 }, sees: true };
  b.update(1 / 60, ctx);
  assert.equal(b.state, 'approach');
  assert.ok(b.guarding);
  let chopped = false;
  for (let i = 0; i < 200 && !chopped; i++) {
    const was = b.state;
    const o = b.update(1 / 60, ctx);
    if (was === 'windChop' && b.state === 'windChop') assert.equal(o.tele.kind, 'arc');
    if (o.act?.kind === 'melee') chopped = true;
  }
  assert.ok(chopped);
  assert.equal(b.state, 'recover');
  assert.ok(!b.guarding, 'open after a blow');
  b.breakGuard();
  assert.equal(b.state, 'broken');
  assert.ok(!b.guarding);
  run(b, ctx, 2.2);
  assert.notEqual(b.state, 'broken', 'it recovers');
});

test('archer: keeps its distance, draws (a line that locks on), looses a chilling arrow', () => {
  const b = new ArcherBrain(seq([0.3]));
  let act = null;
  let locked = false;
  const ctx = { self: { x: 0, y: 0 }, target: { x: 7, y: 0 }, sees: true };
  for (let i = 0; i < 400 && !act; i++) {
    const o = b.update(1 / 60, ctx);
    if (o.tele?.locked) locked = true;
    if (o.act) act = o.act;
  }
  assert.ok(locked, 'the aim locks before release');
  assert.equal(act.kind, 'arrow');
  assert.ok(act.chill > 0);
  // too close: it backs away
  const b2 = new ArcherBrain(seq([0.3]));
  b2.update(1 / 60, { self: { x: 0, y: 0 }, target: { x: 2, y: 0 }, sees: true });
  const o = b2.update(1 / 60, { self: { x: 0, y: 0 }, target: { x: 2, y: 0 }, sees: true });
  assert.ok(o.move.x < 0);
});

test('gorehorn: paws (a wide lane), charges, and a wall stuns it', () => {
  const b = new GorehornBrain(seq([0.2]));
  const ctx = { self: { x: 0, y: 0 }, target: { x: 5, y: 0 }, sees: true };
  let lane = null;
  for (let i = 0; i < 400 && b.state !== 'charge'; i++) {
    const o = b.update(1 / 60, ctx);
    if (o.tele) lane = o.tele;
  }
  assert.equal(b.state, 'charge');
  assert.ok(lane.width >= 1, 'a wide lane');
  const o = b.update(1 / 60, ctx);
  assert.ok(o.contact && o.charging);
  const hit = b.update(1 / 60, { ...ctx, self: { x: 1, y: 0, bumped: true } });
  assert.ok(hit.events.some((e) => e.kind === 'crash'));
  assert.equal(b.state, 'stunned');
});

test('rime jarl: wakes with a roar, then has three phases with new moves; phase 2 snuffs the fires', () => {
  const b = new JarlBrain(seq([0.1, 0.6, 0.9, 0.3]));
  const self = { x: 0, y: 0, hp: 900, maxHp: 900 };
  const ctx = { self, target: { x: 4, y: 0 }, sees: true };
  const events = [];
  const moves = new Set();
  for (let i = 0; i < 60 * 20; i++) {
    const o = b.update(1 / 60, ctx);
    events.push(...o.events);
    if (o.act) moves.add(o.act.kind);
  }
  assert.ok(events.some((e) => e.kind === 'wake'));
  assert.equal(b.phase, 1);
  assert.ok([...moves].every((m) => ['slam', 'melee'].includes(m)), `phase 1 only slams and sweeps: ${[...moves]}`);
  self.hp = 500;
  const ev2 = [];
  for (let i = 0; i < 60 * 3; i++) ev2.push(...b.update(1 / 60, ctx).events);
  assert.equal(b.phase, 2);
  assert.ok(ev2.some((e) => e.kind === 'phase' && e.phase === 2));
  assert.ok(ev2.some((e) => e.kind === 'snuff'));
  assert.ok(ev2.some((e) => e.kind === 'summon'));
  self.hp = 200;
  const ev3 = [];
  let leapTele = false;
  for (let i = 0; i < 60 * 25; i++) {
    const o = b.update(1 / 60, { ...ctx, target: { x: 6, y: 0 } });
    ev3.push(...o.events);
    if (b.state === 'leap' && o.tele?.kind === 'circle') leapTele = true;
  }
  assert.equal(b.phase, 3);
  assert.ok(ev3.some((e) => e.kind === 'enrage'));
  assert.ok(leapTele, 'the leap shows its landing');
  assert.equal(R.jarlPhase(900, 900), 1);
  assert.equal(R.jarlPhase(500, 900), 2);
  assert.equal(R.jarlPhase(100, 900), 3);
});

test('every telegraph shape is one the renderer draws', () => {
  const kinds = new Set();
  const types = ['imp', 'slime', 'sentinel', 'archer', 'gorehorn', 'jarl'];
  for (const type of types) {
    for (const dist of [1.5, 4, 7]) {
      const b = makeBrain(type, seq([0.15, 0.5, 0.85]), { size: 2 });
      const self = { x: 0, y: 0, hp: type === 'jarl' ? 250 : 10, maxHp: type === 'jarl' ? 900 : 10 };
      for (let i = 0; i < 60 * 12; i++) {
        const o = b.update(1 / 60, { self, target: { x: dist, y: 0.3 }, sees: true });
        if (o.tele) kinds.add(o.tele.kind);
      }
    }
  }
  for (const k of kinds) assert.ok(['circle', 'arc', 'line', 'fan'].includes(k), k);
  assert.ok(kinds.has('circle') && kinds.has('arc') && kinds.has('line'));
});

/* ------------------------------------------------------------------ the map */

test('map: six rooms, the start in the yard, every room reachable once the doors open', () => {
  assert.equal(ROOMS.length, 6);
  const grid = buildGrid();
  const props = buildProps();
  assert.equal(roomAt(START.x, START.y), 'yard');
  const closed = roomsReachable(grid, props);
  assert.ok(closed.has('yard') && closed.has('rampart'));
  assert.ok(!closed.has('throne'), 'the Rime Gate is shut');
  const doors = new Set(props.filter((p) => p.kind === 'barricade').map((p) => p.id));
  const noGate = roomsReachable(grid, props, doors);
  for (const r of ['yard', 'court', 'garden', 'cloister', 'rampart']) assert.ok(noGate.has(r), r);
  assert.ok(!noGate.has('throne'), 'only the gate leads to the throne');
  const all = new Set(props.filter((p) => p.kind === 'barricade' || p.kind === 'gate').map((p) => p.id));
  assert.equal(roomsReachable(grid, props, all).size, 6);
});

test('map: each corridor joins the rooms it says, through its doors', () => {
  const grid = buildGrid();
  const props = buildProps();
  for (const c of CORRIDORS) {
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) assert.equal(grid[y * W + x], FLOOR, `${c.from}-${c.to} at ${x},${y}`);
    if (c.door) assert.ok(doorsOf(props, c).length > 0, `${c.from}-${c.to} has its door`);
  }
});

test('map: props stand on floor, inside the map, without blocking a corridor mouth', () => {
  const grid = buildGrid();
  for (const p of buildProps()) {
    assert.ok(PROP_KINDS[p.kind], p.kind);
    for (const [x, y] of footprint(p)) {
      assert.ok(x >= 0 && y >= 0 && x < W && y < H);
      assert.equal(grid[y * W + x], FLOOR, `${p.kind} at ${x},${y} is on floor`);
    }
  }
  const beacons = PROPS.filter((p) => p.beacon).map((p) => p.beacon).sort();
  assert.deepEqual(beacons, [...BEACONS].sort());
});

test('map: every spawn stands on open floor in its own room', () => {
  const grid = buildGrid();
  const solid = solidGrid(grid, buildProps());
  for (const [room, list] of Object.entries(SPAWNS)) {
    for (const s of list) {
      assert.equal(solid[Math.floor(s.y) * W + Math.floor(s.x)], 0, `${s.type} in ${room}`);
      assert.equal(roomAt(s.x, s.y), room, `${s.type} at ${s.x},${s.y}`);
    }
  }
  const types = new Set(Object.values(SPAWNS).flat().map((s) => s.type));
  for (const t of ['imp', 'slime', 'sentinel', 'archer', 'gorehorn', 'jarl']) assert.ok(types.has(t), t);
});

test('walls step down south of a room so the floor shows; far walls fade', () => {
  const grid = buildGrid();
  const h = wallHeights(grid);
  const d = wallDepth(grid);
  // the yard's south wall (floor at y=4..): the wall just below is low
  assert.ok(h[3 * W + 44] < 1);
  // the court's north wall faces you at full height
  assert.ok(h[46 * W + 40] >= 1.6);
  assert.equal(d[7 * W + 44], 0);
  assert.ok(d[0] > 3);
});

test('masks: ice where it is painted, snow piled by walls and melted by fires', () => {
  const grid = buildGrid();
  const m = buildMasks(grid, buildProps());
  assert.equal(m.mw, W * MASK_RES);
  assert.ok(sampleMask(m.ice, m.mw, m.mh, 53.5, 36.5) > 0.8, 'the court ice');
  assert.ok(sampleMask(m.ice, m.mw, m.mh, 44.5, 30) < 0.1);
  assert.ok(sampleMask(m.snow, m.mw, m.mh, 39.6, 37.6) < 0.2, 'melted round the great brazier');
  assert.ok(sampleMask(m.snow, m.mw, m.mh, 33.2, 38) > 0.5, 'a drift against the wall');
});

/* ------------------------------------------------------------------ normals from painted shapes */

test('distance transform is exact on a single seed', () => {
  const w = 9;
  const h = 7;
  const seed = new Uint8Array(w * h);
  seed[3 * w + 4] = 1;
  const d = distanceTransform(seed, w, h);
  assert.equal(d[3 * w + 4], 0);
  assert.ok(Math.abs(d[0] - Math.hypot(4, 3)) < 1e-6);
  assert.ok(Math.abs(d[6 * w + 8] - Math.hypot(4, 3)) < 1e-6);
});

test('height from a painted disc is a dome; its normals face out from the middle', () => {
  const n = 41;
  const alpha = new Uint8ClampedArray(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (Math.hypot(x - 20, y - 20) <= 16) alpha[y * n + x] = 255;
  const hgt = heightFromAlpha(alpha, n, n, { radius: 10 });
  assert.equal(hgt[0], 0);
  assert.ok(hgt[20 * n + 20] > hgt[20 * n + 8], 'higher in the middle');
  const nrm = normalsFromHeight(hgt.map((v) => v * 10), n, n, 1);
  const at = (x, y) => [nrm[(y * n + x) * 3], nrm[(y * n + x) * 3 + 1], nrm[(y * n + x) * 3 + 2]];
  assert.ok(at(31, 20)[0] > 0.2, 'right edge faces east');
  assert.ok(at(9, 20)[0] < -0.2, 'left edge faces west');
  assert.ok(at(20, 31)[1] < -0.2, 'lower edge (canvas bottom) faces south');
  assert.ok(at(20, 9)[1] > 0.2, 'upper edge faces north');
  const [x, y, z] = at(20, 20);
  assert.ok(z > 0.95 && Math.abs(x) < 0.1 && Math.abs(y) < 0.1, 'the top faces up');
  for (let i = 0; i < n * n; i++) assert.ok(Math.abs(Math.hypot(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]) - 1) < 1e-5);
});

test('normals pack into bytes and back', () => {
  const nrm = new Float32Array([0.6, -0.48, 0.64]);
  const packed = packNormals(nrm, 1, 1, { extra: [255], alpha: [77] });
  const [x, y, z] = unpackNormal(packed[0], packed[1]);
  assert.ok(Math.abs(x - 0.6) < 0.01 && Math.abs(y + 0.48) < 0.01 && Math.abs(z - 0.64) < 0.02);
  assert.equal(packed[2], 255);
  assert.equal(packed[3], 77);
});

test('signed distance is negative inside, positive outside; dilate and max filter grow', () => {
  const w = 20;
  const h = 10;
  const solid = new Uint8Array(w * h);
  for (let y = 3; y < 7; y++) for (let x = 5; x < 9; x++) solid[y * w + x] = 1;
  const s = signedDistance(solid, w, h);
  assert.ok(s[5 * w + 6] < 0);
  assert.ok(s[5 * w + 15] > 5);
  const a = new Uint8ClampedArray(w * h);
  a[5 * w + 10] = 255;
  const g = dilate(a, w, h, 3);
  assert.equal(g[5 * w + 12], 255);
  assert.ok(g[5 * w + 13] > 0);
  assert.equal(g[5 * w + 15], 0);
  const m = maxFilter(Float32Array.from({ length: w * h }, (_, i) => (i === 5 * w + 10 ? 2 : 0)), w, h, 2);
  assert.equal(m[7 * w + 12], 2);
  assert.equal(m[8 * w + 10], 0);
  assert.equal(insideDistance(Uint8ClampedArray.from(solid, (v) => v * 255), w, h)[5 * w + 6], 2);
  assert.equal(toHalf(1), 0x3c00);
  assert.equal(toHalf(-2), 0xc000);
});

/* ------------------------------------------------------------------ puppets */

test('keyframes ease between keys and hold at the ends', () => {
  const keys = [[0, 0], [1, 10]];
  assert.equal(kf(-1, keys), 0);
  assert.equal(kf(2, keys), 10);
  assert.equal(kf(0.5, keys), 5);
});

test('rigs lay out parents before children; poses only name real parts', () => {
  for (const [name, rig] of Object.entries(RIGS)) {
    const seen = new Set(['root']);
    assert.equal(ordered(rig).length, rig.parts.length);
    for (const p of ordered(rig)) {
      assert.ok(seen.has(p.parent), `${name}.${p.id} after its parent`);
      seen.add(p.id);
    }
  }
  for (const kind of ['warden', 'runner']) {
    for (const anim of ['idle', 'attack', 'charge', 'heavy', 'dash', 'throw', 'cast', 'drink', 'hurt', 'dead']) {
      for (const step of [0, 1, 2]) {
        const p = heroPose(kind, { anim, t: 0.1, step, time: 1, run: 0.5, phase: 1, charge: 0.5, dur: 0.25 });
        for (const k of Object.keys(p)) assert.ok(k === 'root' || RIGS[kind].parts.some((q) => q.id === k) || ['lantern', 'shield', 'cape'].includes(k), `${kind}/${anim}: ${k}`);
        for (const v of Object.values(p)) for (const n of Object.values(v)) if (typeof n === 'number') assert.ok(Number.isFinite(n));
      }
    }
  }
  const e = { brain: { state: 'windChop', t: 0.3 }, run: 0, phase: 0, seed: 1 };
  assert.ok(foePose('sentinel', e, 1).armF.r > 1, 'the blade goes up in the wind-up');
});

/* ------------------------------------------------------------------ save and credits */

test('save: fresh, round-trips, migrates version 1, survives junk', () => {
  const s = R.newSave();
  assert.equal(s.v, R.SAVE_VERSION);
  assert.equal(R.SAVE_VERSION, 2);
  assert.deepEqual(R.migrateSave(JSON.stringify(s)), s);
  const old = R.migrateSave({ v: 1, pick: 'runner', gems: 12.7, beacons: { garden: true, cloister: false, nowhere: true } });
  assert.equal(old.v, 2);
  assert.equal(old.hero, 'runner');
  assert.equal(old.gems, 12);
  assert.deepEqual(old.beacons, ['garden']);
  for (const junk of [null, undefined, '{not json', 42, [], { hero: 'nobody', gems: -5, settings: { sound: 9 } }]) {
    const j = R.migrateSave(junk);
    assert.equal(j.v, R.SAVE_VERSION);
    assert.ok(R.HEROES[j.hero]);
    assert.ok(j.gems >= 0);
    assert.ok(j.settings.sound <= 1);
  }
});

test('credits name every outside piece with a link and licence', () => {
  for (const p of PACKS) assert.ok(p.name && p.site.startsWith('https://') && p.licence && p.licenceUrl.startsWith('https://'));
  assert.ok(PACKS.some((p) => /Nunito/.test(p.name)));
  assert.ok(OWN.length > 40);
});
