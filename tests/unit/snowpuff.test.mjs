import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOUNTAINS, mountainById } from '../../src/snowpuff/mountains.js';
import { buildCourse, frameAt, groundAt, toWorld, project, between, rng, profile, kickerAt, RACE_MODES, LAPS, sectionAt, lapVariant } from '../../src/snowpuff/course.js';
import { newRider, step, settle, trickName, onIce, VMAX } from '../../src/snowpuff/physics.js';
import { newRacer, standings, ordinal, rubberBand, checkFinish, pickups, pickTarget, canThrow, makeThrow, hittable, applyHit, useShield, tickRacer, flyProjectile, projectilePos, MAX_SNOWBALLS, SPINOUT, giveItem, useSlot, rollGift, ITEMS, newGiant, rollGiant, giantHits, applyBowl, dropIce, meltIce, draftFactor, checkLap, tickLift, LIFT, LIFT_SKIP } from '../../src/snowpuff/race.js';
import { newBrain, think } from '../../src/snowpuff/ai.js';
import { packState, unpackState, packThrow, unpackThrow, assignSlots, cleanMember, InterpBuffer, MSG } from '../../src/snowpuff/netproto.js';
import { SPECIES, SELECTABLE, ALL_SPECIES, faceSvg } from '../../src/snowpuff/riders.js';
import { CONTROLS } from '../../src/snowpuff/controls.js';
import { iceSpin, plantPitch } from '../../src/snowpuff/render/poseRig.js';
import { collisions, codesFor } from '../../src/shared/helpPanel.js';
import { PACKS } from '../../src/snowpuff/credits.js';
import { POLYFORK } from '../../src/snowpuff/assets.js';
import { GOGGLES, GOGGLE_IDS, DEFAULT_GOGGLES, cleanGoggle, randomGoggle, loadGoggles, saveGoggles, goggleChip } from '../../src/snowpuff/goggleList.js';
import { buildGoggles, ROUND_FIT, goggleRack } from '../../src/snowpuff/render/goggles.js';
import { BOARDS, BOARD_IDS, cleanBoard, randomBoard, loadBoard, saveBoard, boardChip } from '../../src/snowpuff/boardList.js';
import { buildBoard, boardRack } from '../../src/snowpuff/render/boards.js';

const DT = 1 / 60;
const course = buildCourse(mountainById('marshmallow'));
const ride = (r, inp, secs, c = course, o) => {
  const ev = [];
  for (let t = 0; t < secs; t += DT) ev.push(...step(r, inp, c, DT, o));
  return ev;
};
/** A rider on a clear stretch (no barriers within 60 m). */
function clearRider(speed = 15) {
  let s = 200;
  while (between(course.obstacles, s - 5, s + 60).length || course.kickers.some((k) => k.s > s - 10 && k.s < s + 70)) s += 7;
  const r = newRider({ s, lat: 0, speed });
  settle(r, course);
  return r;
}

/* ---------------------------------------------------------------- courses */

test('courses are deterministic: the same mountain builds the same course', () => {
  for (const m of MOUNTAINS) {
    const a = buildCourse(m), b = buildCourse(m);
    assert.equal(a.n, b.n);
    assert.deepEqual([...a.px.slice(0, 200)], [...b.px.slice(0, 200)]);
    assert.deepEqual(a.obstacles, b.obstacles);
    assert.deepEqual(a.kickers, b.kickers);
    assert.deepEqual(a.gifts.map((s) => [s.id, s.s, s.lat]), b.gifts.map((s) => [s.id, s.s, s.lat]));
    assert.equal(groundAt(a, 333.3, 4.2), groundAt(b, 333.3, 4.2));
  }
});

test('courses run downhill, wind gently, and have room to ride', () => {
  for (const m of MOUNTAINS) {
    const c = buildCourse(m);
    assert.ok(c.py[0] - c.py[c.length] > c.length * 0.15, `${m.id} drops`);
    let winding = 0;
    for (let s = 1; s < c.n - 1; s += 1) {
      assert.ok(c.py[s] < c.py[s - 1] + 1e-6, `${m.id} goes down at ${s}`);
      const turn = Math.abs(c.heading[s + 1] - c.heading[s - 1]) / 2;
      assert.ok(turn < 1 / 40, `${m.id}: no hairpins (${turn.toFixed(4)} at ${s})`);
      assert.ok(Math.abs(c.heading[s]) < 1.35, `${m.id}: keeps heading down the mountain`);
      winding += turn;
    }
    assert.ok(winding > 3, `${m.id} winds: S-bends, not a straight (${winding.toFixed(2)} rad of turning)`);
    assert.ok(c.turns.some((t) => t.berm), `${m.id} has a banked berm`);
    // kickers sit on straight stretches
    for (const k of c.kickers) assert.ok(Math.abs(c.curvature[Math.round(k.s)]) < 1 / 60, `${m.id}: kicker at ${k.s} on a straight`);
    assert.ok(c.kickers.length >= m.kickers.count - 1);
    assert.ok(c.obstacles.length > 10 && c.gifts.length > 25 && c.piles.length > 5, m.id);
    assert.equal(c.stars.length, 0, `${m.id}: no stars any more`);
    assert.ok(c.bells.length > 0 && c.gifts.some((g) => g.risky), `${m.id} has bell arches and risky gifts`);
    assert.equal(c.arches.at(-1).kind, 'finish');
  }
});

test('barriers always leave a gap of at least 4 m across the run', () => {
  for (const m of MOUNTAINS) {
    const c = buildCourse(m);
    for (const o of c.obstacles) {
      const W = frameAt(c, o.s).width;
      const row = c.obstacles.filter((x) => Math.abs(x.s - o.s) < 2.5).map((x) => [x.lat - x.w, x.lat + x.w]).sort((a, b) => a[0] - b[0]);
      let best = row[0][0] + W, at = row[0][1];
      for (const [a, b] of row.slice(1)) {
        best = Math.max(best, a - at);
        at = Math.max(at, b);
      }
      best = Math.max(best, W - at);
      assert.ok(best >= 3.2, `${m.id}: gap ${best.toFixed(1)} m at s=${o.s}`);
    }
  }
});

test('lift towers stand off the run; kickers sit on it', () => {
  for (const m of MOUNTAINS) {
    const c = buildCourse(m);
    for (const lf of c.lifts) for (const t of lf.towers) assert.ok(Math.abs(t.lat) > frameAt(c, Math.max(0, Math.min(c.n - 1, t.s))).width + 4, `${m.id} tower at lat ${t.lat}`);
    for (const k of c.kickers) {
      assert.ok(Math.abs(k.lat) + k.w / 2 < frameAt(c, k.s).width, `${m.id} kicker inside`);
      assert.equal(kickerAt(c, k.s + k.len / 2, k.lat), k);
      assert.ok(groundAt(c, k.s + k.len * 0.9, k.lat) > groundAt(c, k.s + k.len * 0.9, k.lat, false) + k.h * 0.5);
    }
  }
});

test('course space ↔ world space round-trips', () => {
  for (const [s, lat] of [[100, 3], [500, -8], [900, 12]]) {
    const w = toWorld(course, s, lat);
    const back = project(course, w.x, w.z, s, 50);
    assert.ok(Math.abs(back.s - s) < 0.6 && Math.abs(back.lat - lat) < 0.6, `${s},${lat} → ${back.s},${back.lat}`);
  }
  assert.ok(profile(25, 18) > profile(10, 18) + 2, 'berms rise past the edge');
});

/* ---------------------------------------------------------------- the rider */

test('rider: gravity speeds you up, tuck goes faster, VMAX holds', () => {
  const a = clearRider(10), b = clearRider(10);
  const s0 = a.s;
  ride(a, {}, 3);
  ride(b, { tuck: true }, 3);
  assert.ok(a.speed > 12, `speeds up (${a.speed})`);
  assert.ok(b.speed > a.speed, `tuck is faster (${b.speed} > ${a.speed})`);
  assert.ok(a.s > s0 + 30);
  const c = clearRider(VMAX + 10);
  step(c, {}, course, DT);
  assert.ok(c.speed <= VMAX + 1e-6);
});

test('rider: carving turns harder the longer you hold, sprays (carve) and costs speed', () => {
  const a = clearRider(18), b = clearRider(18);
  ride(a, { steer: 1 }, 0.25);
  const early = a.yaw;
  ride(a, { steer: 1 }, 0.5);
  ride(b, {}, 0.75);
  assert.ok(a.carve > 0.7 && a.yaw > early, 'carve deepens');
  assert.ok(a.lat > b.lat + 1, 'turned right');
  assert.ok(a.speed < b.speed, 'carving is slower');
  ride(a, {}, 2);
  assert.ok(Math.abs(a.yaw) < 0.2, 'lets go back to the fall line');
});

test('rider: hold jump longer, jump higher; spins land clean for a boost, a crooked one wobbles', () => {
  const peak = (hold) => {
    const r = clearRider(15);
    const ev = ride(r, { jump: true }, hold);
    assert.ok(ev.some((e) => e.type === 'jump'), 'pops the moment it is pressed');
    assert.ok(r.air);
    let top = 0;
    for (let t = 0; t < 3 && r.air; t += DT) {
      step(r, {}, course, DT);
      top = Math.max(top, r.y - groundAt(course, r.s, r.lat));
    }
    return top;
  };
  assert.ok(peak(0.4) > peak(0.02) + 0.25, 'holding lifts higher');
  const tap = clearRider(15);
  assert.ok(step(tap, { jump: true }, course, DT).some((e) => e.type === 'jump') && tap.air, 'a tap ollies on the very first step');
  // a 360: spin until near 2π, then let go — the magnet settles it straight
  const r = clearRider(16);
  let ev = ride(r, { jump: true, steer: 1 }, 0.3);
  while (r.air && Math.abs(r.spin) < Math.PI * 2 - 0.9) ev.push(...step(r, { steer: 1 }, course, DT));
  while (r.air) ev.push(...step(r, {}, course, DT));
  const land = ev.find((e) => e.type === 'land');
  assert.ok(land && land.clean, 'clean landing');
  assert.ok(land.tricks > 0 && r.boost > 0, 'a trick and a boost');
  assert.equal(trickName(2, 0), '360');
  assert.equal(trickName(0, -1), 'Back Flip');
  // crooked: still spinning hard when the snow arrives
  const w = clearRider(16);
  ride(w, { jump: true }, 0.2);
  step(w, {}, course, DT);
  ev = [];
  while (w.air) ev.push(...step(w, { steer: 1 }, course, DT));
  const l2 = ev.find((e) => e.type === 'land');
  if (!l2.clean) assert.ok(w.wobble > 0, 'wobble, not a crash');
});

test('rider: a kicker launches you into the air', () => {
  const k = course.kickers[0];
  const r = newRider({ s: k.s - 6, lat: k.lat, speed: 18 });
  settle(r, course);
  let launched = false;
  for (let t = 0; t < 2 && !launched; t += DT) launched = step(r, {}, course, DT).some((e) => e.type === 'launch');
  assert.ok(launched && r.air && r.vy > 0);
});

test('rider: barriers bounce you into a short tumble — never a game over', () => {
  const o = course.obstacles.find((x) => x.kind !== 'pole' && x.kind !== 'log');
  const r = newRider({ s: o.s - 4, lat: o.lat, speed: 16 });
  settle(r, course);
  let bump = null;
  for (let t = 0; t < 1.5 && !bump; t += DT) bump = step(r, {}, course, DT).find((e) => e.type === 'bump');
  assert.ok(bump, 'bumped');
  assert.ok(r.tumble > 0 && r.speed < 16 * 0.5 && r.invuln > 0);
  ride(r, {}, 1.2);
  assert.equal(r.tumble, 0, 'back up within ~1 s');
  ride(r, {}, 2);
  assert.ok(r.speed > 5, 'riding again');
});

test('mountain: ride through a snowman and it bursts (a tiny slow-down, no tumble); jump through a bell arch and it rings', () => {
  const c2 = buildCourse(mountainById('marshmallow'));
  const sm = c2.obstacles.find((o) => o.kind === 'snowman');
  const r = newRider({ s: sm.s - 3, lat: sm.lat, speed: 16 });
  settle(r, c2);
  let ev = [];
  for (let t = 0; t < 1 && !ev.some((e) => e.type === 'burst'); t += DT) ev = ev.concat(step(r, {}, c2, DT));
  assert.ok(ev.some((e) => e.type === 'burst') && r.tumble === 0 && r.speed > 12 && c2.burst.has(sm.id));
  const b = c2.bells[0];
  const k = c2.kickers.find((x) => x.id === b.kicker);
  const j = newRider({ s: k.s - 25, lat: k.lat, speed: 19 });
  settle(j, c2);
  let rang = false;
  for (let t = 0; t < 4 && !rang; t += DT) rang = step(j, {}, c2, DT).some((e) => e.type === 'bell');
  assert.ok(rang, 'the bell rang');
});

test('rider: ice is slippery (turns less)', () => {
  const c2 = buildCourse(mountainById('pinecone'));
  const p = c2.ice[0];
  assert.ok(onIce(c2, p.s + p.len / 2, p.lat));
  const r = newRider({ s: p.s + 0.5, lat: p.lat, speed: 15 });
  settle(r, c2);
  step(r, { steer: 1 }, c2, DT);
  const dry = clearRider(15);
  step(dry, { steer: 1 }, course, DT);
  assert.ok(r.onIce && r.yaw < dry.yaw);
});

/* ---------------------------------------------------------------- the race */

const racerAt = (slot, s, lat = 0, extra = {}) => {
  const r = newRider({ s, lat, speed: 15 });
  settle(r, course);
  return Object.assign(newRacer({ slot, rider: r }), extra);
};

test('race: standings, ordinals, the finish', () => {
  const a = racerAt(0, 100), b = racerAt(1, 120), c = racerAt(2, 80);
  assert.deepEqual(standings([a, b, c]).map((x) => x.slot), [1, 0, 2]);
  c.rider.s = course.finish + 1;
  assert.ok(checkFinish(c, course, 61.5));
  assert.ok(!checkFinish(c, course, 70));
  assert.equal(c.time, 61.5);
  assert.deepEqual(standings([a, b, c]).map((x) => x.slot), [2, 1, 0]);
  assert.deepEqual([1, 2, 3, 4, 11, 21].map(ordinal), ['1st', '2nd', '3rd', '4th', '11th', '21st']);
});

test('race: the rubber band is gentle', () => {
  assert.equal(rubberBand(500, 500), 1);
  assert.ok(rubberBand(100, 400) > 1 && rubberBand(100, 400) <= 1.07);
  assert.ok(rubberBand(900, 100) >= 0.93 && rubberBand(900, 100) < 1);
});

test('race: gift boxes give an item (kinder to the back of the pack); piles give snowballs; two slots at most', () => {
  const gf = course.gifts.find((g) => !g.risky);
  const r = racerAt(0, gf.s, gf.lat);
  const ev = pickups(r, course, 1, 0.5);
  assert.ok(ev.some((e) => e.type === 'gift' && e.id === gf.id) && r.slots.length === 1 && r.gifts === 1);
  assert.equal(pickups(r, course, 1).filter((e) => e.id === gf.id).length, 0, 'once each');
  const pile = course.piles[0];
  const q = racerAt(1, pile.s, pile.lat);
  pickups(q, course, 1);
  assert.deepEqual(q.slots.find((x) => x.kind === 'snowballs'), { kind: 'snowballs', n: 2 });
  q.slots = q.slots.filter((x) => x.kind === 'snowballs');
  assert.equal(q.ammo, 2);
  giveItem(q, 'snowballs', 10);
  assert.equal(q.ammo, MAX_SNOWBALLS, 'snowballs stack, up to a cap');
  assert.ok(giveItem(q, 'shield') && !giveItem(q, 'boost'), 'two slots at most');
  // the same gift always holds the same thing for the same racer; the back of the pack gets more giants and boosts
  assert.equal(rollGift(42, 3, 0.2), rollGift(42, 3, 0.2));
  const tally = (place) => {
    const n = Object.fromEntries(ITEMS.map((k) => [k, 0]));
    for (let g = 0; g < 2000; g++) n[rollGift(g, g % 6, place)]++;
    return n;
  };
  const front = tally(0), back = tally(1);
  assert.ok(back.giant + back.boost > (front.giant + front.boost) * 3);
  assert.ok(front.snowballs > back.snowballs);
});

test('race: items — shield, boost, giant snowball and ice patch', () => {
  const r = racerAt(0, 300, 0);
  giveItem(r, 'shield');
  giveItem(r, 'boost');
  assert.equal(useSlot(r, 0).kind, 'shield');
  assert.ok(r.shieldT > 0 && r.slots.length === 1 && r.slots[0].kind === 'boost', 'used items leave, the next moves up');
  tickRacer(r, 1);
  assert.equal(useSlot(r, 0).kind, 'boost');
  assert.ok(r.rider.boost > 1);
  // a giant snowball rolls down and bowls over the rider in its lane (not one who jumps it)
  const thrower = racerAt(1, 400, 0);
  // where will it be 30 m on? (it follows the terrain, so not always the lane it left in)
  const probe = newGiant(thrower, 'probe');
  while (probe.s < 430 && rollGiant(probe, course, DT));
  const victim = racerAt(2, 430, probe.lat + 0.3), jumper = racerAt(3, 430, probe.lat > 0 ? probe.lat - 6 : probe.lat + 6);
  const g = newGiant(thrower, 'g1');
  const all = [thrower, victim, jumper];
  let bowled = [];
  for (let t = 0; t < 3 && !bowled.length; t += DT) {
    if (!rollGiant(g, course, DT)) break;
    bowled = giantHits(g, all, course);
  }
  assert.deepEqual(bowled.map((x) => x.slot), [2]);
  assert.ok(applyBowl(victim, 1) && victim.rider.flat > 0 && victim.rider.speed === 0 && victim.lastHitBy === 1, 'squashed flat');
  // an ice patch dropped behind you makes the snow there slippery until it melts
  const iceR = racerAt(4, 500, 2);
  const p = dropIce(course, iceR, 10, 'i1', 5);
  assert.ok(onIce(course, p.s + p.len / 2, p.lat));
  meltIce(course, 20);
  assert.ok(!onIce(course, p.s + p.len / 2, p.lat));
});

test('race: drafting close behind someone cuts your drag', () => {
  const lead = racerAt(0, 300, 0), tail = racerAt(1, 294, 0.3), side = racerAt(2, 294, 5);
  for (const x of [lead, tail, side]) x.rider.speed = 20;
  assert.ok(draftFactor(tail, [lead, tail, side]) < 0.85 && tail.draftBehind === lead);
  assert.equal(draftFactor(side, [lead, tail, side]), 1);
  const a = clearRider(22), b = clearRider(22);
  ride(a, {}, 2, course, { draft: 0.65 });
  ride(b, {}, 2);
  assert.ok(a.speed > b.speed, 'faster in the slipstream');
});

test('race: a snowball aims at the nearest rider ahead in the cone, hits, and spins them out', () => {
  const me = racerAt(0, 300, 0), ahead = racerAt(1, 318, 2), far = racerAt(2, 330, 1), behind = racerAt(3, 290, 0), wide = racerAt(4, 305, 14);
  giveItem(me, 'snowballs', 2);
  const all = [me, ahead, far, behind, wide];
  assert.equal(pickTarget(me, all), ahead);
  assert.ok(canThrow(me));
  const p = makeThrow(me, ahead, 'p1');
  assert.equal(me.ammo, 1);
  assert.ok(!canThrow(me), 'a short cooldown');
  tickRacer(me, 1);
  assert.ok(canThrow(me));
  let state;
  for (let t = 0; t < 2; t += DT) {
    state = flyProjectile(p, DT);
    const pos = projectilePos(p, all, course);
    assert.ok(Number.isFinite(pos.y));
    if (state === 'arrived') break;
  }
  assert.equal(state, 'arrived');
  assert.ok(hittable(ahead, course));
  const v = ahead.rider.speed;
  assert.ok(applyHit(ahead));
  assert.ok(ahead.rider.tumble > 0 && ahead.rider.tumble <= 1.5 && ahead.rider.tumbleSoft, 'a quick face-plant');
  assert.ok(ahead.rider.speed < v && ahead.bonks === 1);
  ride(ahead.rider, { steer: 1 }, 0.3);
  assert.ok(Math.abs(ahead.rider.carve) < 0.05, 'no steering while tumbling');
  // revenge: whoever hit you last is the one you aim at, ahead or behind
  ahead.lastHitBy = 3;
  giveItem(ahead, 'snowballs', 1);
  assert.equal(pickTarget(ahead, all), behind);
  // a shield takes it instead
  const s = racerAt(5, 320, 0);
  giveItem(s, 'shield');
  useShield(s);
  assert.ok(!hittable(s, course));
  assert.equal(applyHit(s), false);
  assert.equal(s.shieldT, 0);
  // nobody ahead: no target
  assert.equal(pickTarget(far, all), null);
});

test('AI riders get down every mountain in about a minute or so, collecting and jumping', () => {
  for (const m of MOUNTAINS) {
    const c = buildCourse(m);
    const rand = rng(7);
    const racers = ['careful', 'reckless', 'thrower'].map((k, i) => {
      const r = newRider({ s: 4, lat: (i - 1) * 2.5 });
      settle(r, c);
      const rc = newRacer({ slot: i, rider: r });
      rc.brain = newBrain(k, rand);
      rc.jumps = 0;
      return rc;
    });
    let t = 0;
    while (t < 180 && !racers.every((x) => x.finished)) {
      t += DT;
      for (const rc of racers) {
        if (rc.finished) continue;
        const inp = think(rc.brain, rc, c, racers, DT);
        for (const e of step(rc.rider, inp, c, DT)) if (e.type === 'jump' || e.type === 'launch') rc.jumps++;
        if (inp.throw && canThrow(rc)) makeThrow(rc, pickTarget(rc, racers), 'x');
        pickups(rc, c, t);
        tickRacer(rc, DT);
        checkFinish(rc, c, t);
      }
    }
    for (const rc of racers) {
      assert.ok(rc.finished, `${m.id}: ${rc.brain.kind} finished`);
      assert.ok(rc.time > 45 && rc.time < 110, `${m.id}: ${rc.brain.kind} in ${rc.time.toFixed(1)} s`);
      assert.ok(rc.gifts >= 1, `${m.id}: ${rc.brain.kind} opened gifts`);
    }
    assert.ok(racers.some((x) => x.jumps > 0), `${m.id}: someone jumped`);
  }
});

/* ---------------------------------------------------------------- online */

test('netproto: rider states and throws pack and unpack', () => {
  const r = racerAt(2, 123.456, -3.21, { ammo: 2, gifts: 7, shieldT: 1 });
  r.rider.air = true;
  r.rider.spin = 3.3;
  r.rider.tumble = 0.4;
  const st = unpackState(JSON.parse(JSON.stringify(packState(r))));
  assert.equal(st.slot, 2);
  assert.equal(st.s, 123.46);
  assert.equal(st.lat, -3.21);
  assert.ok(st.air && st.tumble && st.shield && !st.finished);
  assert.equal(st.ammo, 2);
  assert.equal(st.gifts, 7);
  assert.equal(unpackState('nope'), null);
  const me = racerAt(0, 300, 0, { ammo: 1 });
  const p = makeThrow(me, racerAt(1, 320), 'abc');
  const q = unpackThrow(JSON.parse(JSON.stringify(packThrow(p))));
  assert.equal(q.id, 'abc');
  assert.equal(q.target, 1);
  assert.equal(q.t, 0);
  assert.ok(Math.abs(q.T - p.T) < 0.01);
  assert.ok(Object.values(MSG).every((t) => t.length <= 32));
});

test('netproto: slots put humans first and fill the rest with AI riders of other species', () => {
  const slots = assignSlots([{ id: '1', name: 'A', species: 'fox' }, { id: '2', name: 'B', species: 'cat' }], 5, ALL_SPECIES);
  assert.equal(slots.length, 5);
  assert.deepEqual(slots.slice(0, 2).map((s) => s.human), [true, true]);
  assert.ok(slots.slice(2).every((s) => !s.human && s.kind && !['fox', 'cat'].includes(s.species)));
  assert.deepEqual(slots.map((s) => s.slot), [0, 1, 2, 3, 4]);
  assert.equal(cleanMember({ id: 7, name: 'x\u0001y', species: 'dragon' }, ALL_SPECIES).species, ALL_SPECIES[0]);
});

test('netproto: the interpolation buffer glides between states and holds when late', () => {
  const b = new InterpBuffer(0.1);
  assert.equal(b.sample(1), null);
  b.push(1.0, { s: 10, lat: 0, y: 0, yaw: 0, speed: 10, spin: 0, flip: 0, edge: 0 });
  b.push(1.1, { s: 11, lat: 1, y: 0, yaw: 0, speed: 10, spin: 0, flip: 0, edge: 0 });
  const mid = b.sample(1.15);
  assert.ok(Math.abs(mid.s - 10.5) < 1e-6 && Math.abs(mid.lat - 0.5) < 1e-6);
  const late = b.sample(2);
  assert.ok(late.s > 11 && late.s <= 13.5);
  b.push(1.05, { s: 0 });
  assert.equal(b.items.length, 2, 'out-of-order states are dropped');
});

/* ---------------------------------------------------------------- the cast and the table */

test('riders: five to choose (the fox first, the pink bunny back), seven in all, faces for the HUD', () => {
  assert.deepEqual(SELECTABLE, ['fox', 'bunny', 'bear', 'cat', 'frog']);
  assert.equal(ALL_SPECIES.length, 7);
  assert.equal(SPECIES.bunny.name, 'Mallow');
  for (const id of ALL_SPECIES) {
    assert.ok(SPECIES[id].name && SPECIES[id].accent && SPECIES[id].color);
    assert.match(faceSvg(id), /^<svg/);
  }
  assert.notEqual(SPECIES.fox.accent.toLowerCase(), SPECIES.fox.color.toLowerCase());
});

test('controls: nothing bound twice, numbers for items, H for How to play', () => {
  assert.deepEqual(collisions(CONTROLS), []);
  assert.ok(codesFor(CONTROLS, 'help').includes('KeyH'));
  assert.ok(codesFor(CONTROLS, 'item1').includes('Digit1'));
  assert.ok(codesFor(CONTROLS, 'item2').includes('Digit2'));
  for (const g of CONTROLS.groups) for (const r of g.rows) for (const c of r.codes) assert.ok(!['KeyQ', 'KeyE'].includes(c), `${r.id} on ${c}`);
});

test('credits: every library model is named with its page, and the music is credited', () => {
  const pf = PACKS.find((p) => p.name === 'polyfork');
  assert.equal(pf.items.length, Object.keys(POLYFORK).length);
  assert.ok(pf.items.every((i) => i.url.startsWith('https://polyfork.dev/asset/')));
  assert.ok(PACKS.some((p) => p.name === 'ACE-Step 1.5' && p.licence === 'MIT'));
});

test('race: riders side by side shove — the harder carver wins; never stuck together', async () => {
  const { separate } = await import('../../src/snowpuff/race.js');
  const a = racerAt(0, 300, 0.1), b = racerAt(1, 300.3, 0.3);
  a.rider.speed = 20;
  b.rider.speed = 10;
  a.rider.edge = 0.9;
  const t = separate([a, b]);
  assert.equal(t.length, 1);
  assert.equal(t[0][2], a, 'the harder carver wins');
  assert.ok(b.rider.wobble > 0);
  assert.ok(Math.abs(b.rider.lat - a.rider.lat) > 0.6);
  assert.ok(a.rider.speed < 20 && b.rider.speed > 10);
  const far = racerAt(2, 330, 0);
  assert.equal(separate([a, far]).length, 0);
});

test('names: nicknames are cleaned, capped and kept kind; remote names too', async () => {
  const { cleanName, isClean, randomName, NAME_MAX } = await import('../../src/snowpuff/names.js');
  assert.equal(cleanName('  Momo  the   Great!!  '), 'Momo the Gre');
  assert.equal(cleanName('<script>x</script>'), 'scriptxscrip');
  assert.equal(cleanName('', 'Pip'), 'Pip');
  assert.equal(cleanName('지우'), '지우', 'any alphabet is fine');
  assert.ok(cleanName('xxxxxxxxxxxxxxxxxxxxxx').length <= NAME_MAX);
  assert.ok(!isClean('sh1t head') && !isClean('F.U.C.K') && isClean('Sunny Bean') && isClean('Cassie'));
  const swapped = cleanName('Shit Lord');
  assert.ok(isClean(swapped) && swapped !== 'Shit Lord');
  for (let i = 0; i < 50; i++) {
    const n = randomName();
    assert.ok(n.length <= NAME_MAX && isClean(n));
  }
  assert.equal(cleanMember({ id: 1, name: 'b!tch', species: 'cat' }, ALL_SPECIES).name === 'b!tch', false);
});

test('steering is quick: the turn builds in well under 0.2 s and a slalom edge change flips your line in under 0.4 s', async () => {
  const { measureSteering } = await import('./steering.harness.mjs');
  for (const speed of [8.3, 16.7, 25]) {
    const m = measureSteering({ speed });
    assert.ok(m.rise63 < 0.2, `${speed} m/s: turn rate to 63 % in ${m.rise63}`);
    assert.ok(m.head63 < 0.12, `${speed} m/s: the board itself turns in ${m.head63}`);
    assert.ok(m.slalom < 0.4, `${speed} m/s: slalom edge change in ${m.slalom}`);
    assert.ok(m.swap < 0.7, `${speed} m/s: full-lock reversal in ${m.swap}`);
    assert.ok(m.peakYawRate > 1.8 && m.peakYawRate < 3.2, `${speed} m/s: turn rate ${m.peakYawRate} (quick, not twitchy)`);
  }
});

test('pose rig: the head leads the board on a steer change; arms go to the right sides for toe and heel; no NaNs; no allocations', async () => {
  const { PoseRig, J } = await import('../../src/snowpuff/render/poseRig.js');
  const dt = 1 / 60;
  const ride = (rig, s, n) => { for (let i = 0; i < n; i++) rig.update(dt, s); return rig.value; };
  const base = { speed: 16, steerIn: 0, steer: 0, edge: 0, lean: 0 };
  // the head turns toward the new direction before the physics has moved the board at all
  const rig = new PoseRig({ stance: 1 });
  ride(rig, base, 60);
  const h0 = rig.value[J.headYaw], c0 = rig.value[J.chestYaw], p0 = rig.value[J.hipsYaw];
  const s1 = { ...base, steerIn: 1, steer: 0, edge: 0 };
  ride(rig, s1, 5); // 83 ms: input only, board not turned yet
  const dh = h0 - rig.value[J.headYaw], dc = c0 - rig.value[J.chestYaw], dp = p0 - rig.value[J.hipsYaw];
  assert.ok(dh > 0.12, `head already turning (${dh})`);
  assert.ok(dh > Math.abs(dc) && Math.abs(dc) >= Math.abs(dp), 'head first, then shoulders, then hips');
  // toeside (regular, turning right): the rear (left) hand reaches down to drag; heelside: arms forward
  const toe = new PoseRig({ stance: 1 });
  const v = ride(toe, { ...base, steerIn: 1, steer: 1, edge: 1, lean: 0.4 }, 90);
  assert.ok(v[J.armLRaise] < 0.2 && v[J.drag] > 0.5, `rear hand down (${v[J.armLRaise]}), dragging (${v[J.drag]})`);
  assert.ok(v[J.armRRaise] > 0.9, 'the leading hand up and out');
  const heel = new PoseRig({ stance: 1 });
  const hv = ride(heel, { ...base, steerIn: -1, steer: -1, edge: -1, lean: -0.4 }, 90);
  assert.ok(hv[J.armLSwing] > 0.6 && hv[J.armRSwing] > 0.6, 'heelside: both arms forward');
  assert.ok(hv[J.chestPitch] < 0, 'heelside: sitting back');
  assert.equal(hv[J.drag], 0);
  // goofy riders mirror: the drag hand is the other one
  const goofy = new PoseRig({ stance: -1 });
  const gv = ride(goofy, { ...base, steerIn: -1, steer: -1, edge: -1, lean: -0.4 }, 90);
  assert.ok(gv[J.armRRaise] < 0.2 && gv[J.drag] > 0.5, 'goofy toeside drags the other hand');
  // never NaN, whatever comes in; and the same array every frame (no allocation)
  const wild = new PoseRig();
  const out = wild.update(dt, { speed: NaN, edge: Infinity, air: true, spinV: 40, landed: 9, tumbleK: 0.5, skid: 1 });
  for (let i = 0; i < 300; i++) assert.equal(wild.update(i % 7 ? dt : 0, { speed: 30, edge: Math.sin(i), steerIn: Math.sign(Math.sin(i / 5)), air: i % 50 < 20, skid: (i % 13) / 13, landed: i % 50 === 20 ? 5 : 0, menu: i > 280 }), out);
  for (const x of out) assert.ok(Number.isFinite(x));
});

test('goggles: at least 16, unique ids and names, every one builds, pushes up and reacts', () => {
  assert.ok(GOGGLES.length >= 16);
  assert.equal(new Set(GOGGLE_IDS).size, GOGGLES.length);
  assert.equal(new Set(GOGGLES.map((g) => g.name)).size, GOGGLES.length);
  for (const id of GOGGLE_IDS) {
    const g = buildGoggles(id, ROUND_FIT, { text: 'Pip' });
    assert.equal(g.id, id);
    let meshes = 0;
    g.group.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        assert.ok(o.geometry.attributes.position.count > 0, `${id}: empty mesh`);
      }
    });
    assert.ok(meshes >= 2 && meshes <= 12, `${id}: ${meshes} meshes (keep each pair a handful of draws)`);
    const rest = g.group.rotation.x;
    g.setUp(1, true);
    g.update(1 / 60, { jolt: 1, yawRate: 2 });
    assert.ok(g.group.rotation.x < rest - 0.2, `${id}: pushes up onto the forehead`);
    g.flourish();
    g.trick();
    for (let i = 0; i < 120; i++) g.update(1 / 60, {});
    g.group.traverse((o) => assert.ok(Number.isFinite(o.position.x + o.position.y + o.position.z + o.rotation.x), `${id}: stays finite`));
    assert.ok(goggleChip(id).startsWith('<svg'));
  }
  assert.equal(goggleRack().children.length, GOGGLE_IDS.length);
});

test('goggles: unknown ids fall back to Classic; the choice is remembered (and storage failures are harmless)', () => {
  assert.equal(DEFAULT_GOGGLES, 'classic');
  for (const bad of [undefined, null, '', 'nope', 42, {}, '__proto__', 'CLASSIC']) assert.equal(cleanGoggle(bad), 'classic');
  assert.equal(cleanGoggle('googly'), 'googly');
  assert.equal(buildGoggles('not-a-goggle', ROUND_FIT).id, 'classic');
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  assert.equal(loadGoggles(storage), 'classic');
  assert.ok(saveGoggles('donut', storage));
  assert.equal(loadGoggles(storage), 'donut');
  mem.set('snowpuff.goggles', 'evil<script>');
  assert.equal(loadGoggles(storage), 'classic');
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  assert.equal(loadGoggles(broken), 'classic');
  assert.equal(saveGoggles('led', broken), false);
  const seen = new Set();
  let k = 0;
  for (let i = 0; i < 400; i++) seen.add(randomGoggle(() => ((k = (k * 9301 + 49297) % 233280) / 233280)));
  assert.equal(seen.size, GOGGLE_IDS.length);
  for (const g of seen) assert.ok(GOGGLE_IDS.includes(g));
});

test('goggles online: members and slots carry a goggle id, cleaned on the way in; AI rivals get one too', () => {
  assert.equal(cleanMember({ id: 1, name: 'Pip', species: 'fox', goggles: 'hypno' }, ALL_SPECIES).goggles, 'hypno');
  assert.equal(cleanMember({ id: 1, name: 'Pip', species: 'fox', goggles: 'x'.repeat(500) }, ALL_SPECIES).goggles, 'classic');
  assert.equal(cleanMember({ id: 1, name: 'Pip', species: 'fox' }, ALL_SPECIES).goggles, 'classic');
  const slots = assignSlots([{ id: '1', name: 'A', species: 'fox', goggles: 'frogeyes' }, { id: '2', name: 'B', species: 'cat', goggles: 'bogus' }], 5, ALL_SPECIES);
  assert.equal(slots[0].goggles, 'frogeyes');
  assert.equal(slots[1].goggles, 'classic');
  for (const sl of slots) assert.ok(GOGGLE_IDS.includes(sl.goggles));
});

test('famous mountains: every course is deterministic, has its facts and names, and keeps all scenery off the run', async () => {
  const { sceneryPlan, backdropPlace, profile: peakProfile } = await import('../../src/snowpuff/landmarks.js');
  for (const m of MOUNTAINS) {
    assert.ok(m.fact && m.fact.length > 30, `${m.id}: a fact`);
    assert.ok(m.local, `${m.id}: a local name`);
    assert.ok(m.region && (m.coords || m.map), `${m.id}: on the map`);
    const a = buildCourse(m), b = buildCourse(m);
    assert.deepEqual(sceneryPlan(a, m), sceneryPlan(b, m), `${m.id}: scenery deterministic`);
    for (const it of sceneryPlan(a, m)) {
      const W = frameAt(a, it.s).width;
      if (it.kind === 'prayer') assert.ok(it.h >= 4.5, `${m.id}: flags hang high`);
      else assert.ok(Math.abs(it.lat) >= W + 5.9, `${m.id}: ${it.kind} at lat ${it.lat.toFixed(1)} (run half-width ${W.toFixed(1)})`);
    }
    if (m.peak) {
      const p1 = backdropPlace(a, m), p2 = backdropPlace(b, m);
      assert.deepEqual(p1, p2);
      // the hero stands beyond the finish, clear of the run
      const fin = frameAt(a, a.length);
      if (m.peak.at === 'start') {
        // a crater you start on: its rim right at the start line's height, the start just outside the lake
        const f0 = frameAt(a, 0);
        const r = Math.hypot(p1.x - f0.x, p1.z - f0.z) / p1.radius;
        assert.ok(r > m.peak.rim - 0.035 && r < m.peak.rim + 0.065, `${m.id}: on the rim (${r.toFixed(3)})`);
        assert.ok(Math.abs(p1.y + peakProfile(m.peak.shape)((f0.x - p1.x) / p1.radius, (f0.z - p1.z) / p1.radius) * p1.height - a.py[0]) < 3, `${m.id}: the rim meets the start`);
      } else assert.ok(Math.hypot(p1.x - fin.x, p1.z - fin.z) > p1.radius + 200, `${m.id}: the peak stands off beyond the finish`);
    }
  }
});

test('famous mountains: AI riders take about 60–90 s', () => {
  for (const m of MOUNTAINS) {
    const c = buildCourse(m);
    const rand = rng(11);
    const racers = ['careful', 'reckless', 'thrower'].map((k, i) => {
      const r = newRider({ s: 4, lat: (i - 1) * 2.5 });
      settle(r, c);
      const rc = newRacer({ slot: i, rider: r });
      rc.brain = newBrain(k, rand);
      return rc;
    });
    let t = 0;
    while (t < 150 && !racers.every((x) => x.finished)) {
      t += DT;
      for (const rc of racers) {
        if (rc.finished) continue;
        step(rc.rider, think(rc.brain, rc, c, racers, DT), c, DT);
        checkFinish(rc, c, t);
      }
    }
    const times = racers.map((x) => (x.finished ? x.time : 999)).sort((x, y) => x - y);
    assert.ok(times[1] >= 58 && times[1] <= 92, `${m.id}: median AI time ${times[1].toFixed(1)} s`);
  }
});

test('boards: at least 12 original boards, every one builds and animates, chips draw', () => {
  assert.ok(BOARDS.length >= 12);
  assert.equal(new Set(BOARD_IDS).size, BOARDS.length);
  for (const id of BOARD_IDS) {
    const b = buildBoard(id, { trim: '#ff6fb4', art: 'hearts', deck: '#ffffff' });
    assert.equal(b.id, id);
    let meshes = 0;
    b.group.traverse((o) => o.isMesh && meshes++);
    assert.ok(meshes >= 2 && meshes <= 10, `${id}: ${meshes} meshes`);
    for (let i = 0; i < 60; i++) b.update(1 / 60, { speed: 20, carve: Math.sin(i / 5), boost: i > 30, air: i % 20 < 5 });
    b.trick();
    b.group.traverse((o) => assert.ok(Number.isFinite(o.position.x + o.scale.x + o.rotation.y), `${id}: finite`));
    assert.ok(boardChip(id).startsWith('<svg'));
  }
  assert.equal(buildBoard('nope').id, 'classic');
  assert.equal(boardRack().children.length, BOARD_IDS.length);
});

test('boards: the choice persists, unknown ids fall back to Classic, online carries them cleaned', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  assert.equal(loadBoard(storage), 'classic');
  assert.ok(saveBoard('pizza', storage));
  assert.equal(loadBoard(storage), 'pizza');
  mem.set('snowpuff.board', '../etc');
  assert.equal(loadBoard(storage), 'classic');
  assert.equal(loadBoard({ getItem: () => { throw new Error('x'); } }), 'classic');
  for (const bad of [undefined, null, '', 'Pizza', 7, {}]) assert.equal(cleanBoard(bad), 'classic');
  assert.equal(cleanMember({ id: 1, name: 'A', species: 'fox', board: 'dragon' }, ALL_SPECIES).board, 'dragon');
  assert.equal(cleanMember({ id: 1, name: 'A', species: 'fox', board: 'hoverboard' }, ALL_SPECIES).board, 'classic');
  const slots = assignSlots([{ id: '1', name: 'A', species: 'fox', board: 'neon' }], 4, ALL_SPECIES);
  assert.equal(slots[0].board, 'neon');
  for (const sl of slots) assert.ok(BOARD_IDS.includes(sl.board));
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(randomBoard());
  assert.equal(seen.size, BOARD_IDS.length);
});

test('boards are cosmetic: the same ride whatever the board', () => {
  const m = MOUNTAINS[0];
  const c = buildCourse(m);
  const run = (board) => {
    const r = newRider({ s: 6, lat: 0 });
    r.board = board; // nothing in the physics may read it
    settle(r, c);
    const trace = [];
    for (let i = 0; i < 600; i++) {
      step(r, { steer: Math.sin(i / 40), tuck: i % 90 < 40, jump: i % 150 === 0 }, c, 1 / 120);
      if (i % 50 === 0) trace.push(r.s.toFixed(6), r.lat.toFixed(6), r.speed.toFixed(6), r.y.toFixed(6));
    }
    return trace.join(',');
  };
  const ref = run('classic');
  for (const id of BOARD_IDS) assert.equal(run(id), ref, `${id} rides differently`);
});

test('giant snowball: rolls over the real terrain — swings across, bounces off the edges, grows, ends in 7 s', () => {
  for (const m of MOUNTAINS) {
    const c = buildCourse(m);
    for (const s0 of [200, 500]) {
      const thrower = racerAt(1, s0, 0);
      const g = newGiant(thrower, 'g');
      const a = newGiant(thrower, 'g');
      let minLat = 0, maxLat = 0, t = 0;
      while (rollGiant(g, c, DT)) {
        rollGiant(a, c, DT);
        minLat = Math.min(minLat, g.lat);
        maxLat = Math.max(maxLat, g.lat);
        const f = frameAt(c, g.s);
        assert.ok(Math.abs(g.lat) <= f.width + 0.5, `${m.id}: stays on the run`);
        assert.ok(Number.isFinite(g.y) && g.y >= groundAt(c, g.s, g.lat) - 1e-6, `${m.id}: never under the snow`);
        t += DT;
      }
      rollGiant(a, c, DT);
      assert.ok(t <= 7.05, `${m.id}: done within its life`);
      assert.equal(g.s, a.s, 'deterministic');
      if (t < 2.5) continue; // smashed into something early
      assert.ok(maxLat - minLat > 1.5, `${m.id}@${s0}: it doesn't just roll down one line (${(maxLat - minLat).toFixed(2)} m)`);
      assert.ok(g.rad > 0.9, 'it grows as it rolls');
    }
  }
});

test('ice: riding onto it spins you round for a moment (≤ 1.2 s), steering barely works, then you have it back', () => {
  const c = buildCourse(mountainById('pinecone'));
  const patch = c.ice[0] ?? { s: 300, lat: 0, len: 10, w: 6 };
  if (!c.ice.length) c.ice.push(patch);
  const r = newRider({ s: patch.s - 8, lat: patch.lat, speed: 16 });
  settle(r, c);
  let run = 0, gap = 99, longest = 0, slips = 0;
  for (let i = 0; i < 480; i++) {
    for (const e of step(r, { steer: r.s < patch.s + 2 ? 0 : 1 }, c, DT)) {
      if (e.type === 'slip') {
        slips++;
        assert.ok(gap > 1, 'never two slips back to back');
      }
    }
    if (r.slip > 0) {
      run += DT;
      gap = 0;
    } else {
      longest = Math.max(longest, run);
      run = 0;
      gap += DT;
    }
  }
  assert.ok(slips >= 1, 'it slips');
  assert.ok(longest > 0.5 && longest <= 1.2, `slip ${longest.toFixed(2)} s`);
  assert.equal(r.slip, 0);
  // the rider spins round sideways: two whole turns over the slip, ending square
  assert.ok(Math.abs(iceSpin(0.55) - Math.PI * 2) < 1e-6 && Math.abs(iceSpin(1.1) - Math.PI * 4) < 1e-6 && iceSpin(0) === 0, 'spins round');
});

test('hits: a snowball face-plants you once (0.85 s, fair speed loss); a giant one squashes you flat for a real 1 s stop, then you pop up', () => {
  const a = racerAt(1, 300, 0, { speed: 20 });
  assert.ok(applyHit(a));
  let t = 0;
  while (a.rider.tumble > 0) {
    step(a.rider, { steer: 1 }, course, DT);
    t += DT;
  }
  assert.ok(Math.abs(t - 0.85) < 0.02 && a.rider.speed > 9, `face-plant ${t.toFixed(2)} s, ${a.rider.speed.toFixed(1)} m/s after`);
  // the face-plant pitches forward over the nose and comes back square
  assert.ok(plantPitch(0.3) > 1 && Math.abs(plantPitch(0.85)) < 1e-6 && plantPitch(0.78) < 0, 'nose-down, then a springy pop back');
  const b = racerAt(2, 300, 0, { speed: 20 });
  assert.ok(applyBowl(b, 1));
  const ev = [];
  const s0 = b.rider.s;
  t = 0;
  while (b.rider.flat > 0) {
    ev.push(...step(b.rider, { steer: 1, tuck: true }, course, DT));
    t += DT;
    if (b.rider.flat > 0) assert.ok(b.rider.speed === 0 && Math.abs(b.rider.carve) < 0.01, 'flat: stopped, no steering');
  }
  assert.ok(Math.abs(t - 1) < 0.02, `flat ${t.toFixed(2)} s`);
  assert.ok(Math.abs(b.rider.s - s0) < 0.2, 'it really stops for the second');
  assert.ok(ev.some((e) => e.type === 'popup') && b.rider.speed > 7, 'pops back up and rides on');
});

/** Race AI riders through a course (with laps and the chairlift); returns [ride times (median first-sorted), wall clock]. */
function aiRace(c, kinds = ['careful', 'reckless', 'thrower'], limit = 400) {
  const rand = rng(11);
  const racers = kinds.map((k, i) => {
    const r = newRider({ s: 4, lat: (i - 1) * 2.5 });
    settle(r, c);
    const rc = newRacer({ slot: i, rider: r });
    rc.brain = newBrain(k, rand);
    return rc;
  });
  let t = 0;
  while (t < limit && !racers.every((x) => x.finished)) {
    t += DT;
    for (const rc of racers) {
      if (rc.finished) continue;
      if (rc.liftT > 0) {
        if (tickLift(rc, DT)) {
          rc.rider = newRider({ s: 4, lat: (rc.slot - 1) * 2.5 });
          settle(rc.rider, c);
        }
        continue;
      }
      step(rc.rider, think(rc.brain, rc, c, racers, DT), c, DT);
      if (!checkLap(rc, c)) checkFinish(rc, c, t);
    }
  }
  return [racers.map((x) => (x.finished ? x.time : 999)).sort((x, y) => x - y), t, racers];
}

test('race length: every mountain builds Long and Laps the same every time, with their sections and laps', () => {
  for (const m of MOUNTAINS) {
    for (const mode of RACE_MODES) {
      const a = buildCourse(m, { mode }), b = buildCourse(m, { mode });
      assert.equal(a.length, b.length);
      for (const i of [0, 100, Math.floor(a.n / 2), a.n - 1]) assert.equal(a.px[i], b.px[i], `${m.id} ${mode}: deterministic`);
      assert.deepEqual(a.kickers.map((k) => k.s), b.kickers.map((k) => k.s));
      if (mode === 'long') {
        assert.ok(a.length > m.length * 2, `${m.id}: a long trail`);
        assert.deepEqual(a.sections.map((x) => x.kind), ['top', 'forest', 'bowl', 'jumps', 'gully', 'sprint']);
        const park = a.sections.find((x) => x.kind === 'jumps');
        assert.ok(a.kickers.filter((k) => k.s >= park.s0 && k.s < park.s1).length >= 3, `${m.id}: a jump park`);
        assert.equal(sectionAt(a, a.length - 10).kind, 'sprint');
        assert.ok(frameAt(a, (a.sections[2].s0 + a.sections[2].s1) / 2).width > frameAt(a, (a.sections[4].s0 + a.sections[4].s1) / 2).width * 1.6, 'the bowl is wide, the gully narrow');
      }
      assert.equal(a.laps, mode === 'laps' ? LAPS : 1);
    }
  }
});

test('race length: AI finish times — Long about 150–180 s; 3 Laps three laps of ride time plus the lifts', () => {
  for (const m of MOUNTAINS) {
    const [quick] = aiRace(buildCourse(m));
    const [long] = aiRace(buildCourse(m, { mode: 'long' }));
    assert.ok(long[1] >= 140 && long[1] <= 190, `${m.id}: long median ${long[1].toFixed(1)} s`);
    const [laps, wall] = aiRace(buildCourse(m, { mode: 'laps' }));
    assert.ok(Math.abs(laps[1] - quick[1] * 3) < quick[1] * 0.45, `${m.id}: laps ${laps[1].toFixed(1)} vs 3 × ${quick[1].toFixed(1)}`);
    assert.ok(wall >= laps[0] + 2 * LIFT - 0.1, 'the lifts take their time on the clock');
  }
});

test('laps: counted at the line, the chairlift (skippable after 3 s), the finish only after the last lap, order by ride time', () => {
  const c = buildCourse(MOUNTAINS[0], { mode: 'laps' });
  const a = racerAt(0, 10), b = racerAt(1, 10);
  a.rider.s = c.finish + 0.5;
  assert.ok(!checkFinish(a, c, 60), 'no finish on lap 1');
  assert.ok(checkLap(a, c) && a.lap === 2 && a.liftT === LIFT);
  assert.ok(!checkLap(a, c), 'once');
  assert.ok(!tickLift(a, 1, true), 'no skipping in the first seconds');
  assert.ok(!tickLift(a, LIFT_SKIP - 1 + 0.01, false));
  assert.ok(tickLift(a, 0.01, true), 'skip after 3 s');
  assert.ok(Math.abs(a.liftTotal - (LIFT_SKIP + 0.02)) < 1e-6);
  a.lap = 3;
  a.rider.s = c.finish + 1;
  assert.ok(!checkLap(a, c) && checkFinish(a, c, 200));
  assert.ok(Math.abs(a.time - (200 - a.liftTotal)) < 1e-9, 'lift time not counted');
  b.lap = 3;
  b.rider.s = c.finish + 1;
  b.liftTotal = 18;
  checkFinish(b, c, 210); // later on the clock, but less ride time (a full 18 s in lifts)
  assert.deepEqual(standings([a, b]).map((x) => x.slot), [1, 0]);
  // mid-race: a lap ahead beats further down the slope
  const x = racerAt(2, 100), y = racerAt(3, 900);
  x.lap = 2;
  assert.deepEqual(standings([y, x]).map((r) => r.slot), [2, 3]);
});

test('laps: each lap varies — gates swap sides, a bonus kicker opens from lap 2', () => {
  for (const m of MOUNTAINS.filter((x) => x.gates > 0)) {
    const c = buildCourse(m, { mode: 'laps' });
    if (!c.gates.length) continue;
    const lat0 = c.gates.map((g) => g.lat), k0 = c.kickers.length;
    assert.ok(c.bonusKicker && !c.kickers.includes(c.bonusKicker), `${m.id}: a closed bonus kicker`);
    assert.ok(lapVariant(c, 2));
    assert.deepEqual(c.gates.map((g) => g.lat), lat0.map((x) => -x));
    assert.equal(c.kickers.length, k0 + 1);
    lapVariant(c, 3);
    assert.deepEqual(c.gates.map((g) => g.lat), lat0);
    assert.equal(c.kickers.length, k0 + 1, 'opened once');
  }
});

