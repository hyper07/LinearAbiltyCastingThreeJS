import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIGNATURES, SIGNATURE_IDS, signatureSteps, podiumDance, flourish, CYCLE, VARIANTS, RATE } from '../../src/shared/motion/signatures.js';
import { routine, beatAt, clampPlushPose, JOINTS, SCALARS, PLUSH_LIMITS, MOVES } from '../../src/shared/motion/dance.js';
import { CREW } from '../../src/city/crew.js';

const BPM = 143.6;
const beatsOf = (seconds, fps = 60) => Array.from({ length: Math.round(seconds * fps) }, (_, f) => ((f / fps) * BPM) / 60);
const flat = (p) => [...JOINTS.flatMap((j) => p[j]), ...SCALARS.map((s) => p[s])];
/** A dance's pose at a beat of the song (place 0: the signature alone, no flourish). */
const at = (id, beat, place = 0) => podiumDance(id, { place, limits: null }).sample(beat);

test('every Kickrani character has its own signature, a distinct routine of real moves, 8 bars long', () => {
  assert.deepEqual([...SIGNATURE_IDS].sort(), Object.keys(CREW).sort());
  const seqs = new Set();
  for (const id of SIGNATURE_IDS) {
    for (let v = 0; v < VARIANTS; v++) {
      const steps = signatureSteps(id, v);
      assert.equal(steps.reduce((n, s) => n + s.counts, 0), CYCLE, `${id} v${v}`);
      for (const s of steps) assert.ok(MOVES[s.move], `${id}: ${s.move}`);
    }
    seqs.add(signatureSteps(id, 0).map((s) => s.move).join(' '));
  }
  assert.equal(seqs.size, SIGNATURE_IDS.length, 'no two characters share a routine');
  // and their main moves read as them: each its own style, sharing no dance move with another
  const has = (id, ...moves) => moves.every((m) => signatureSteps(id, 0).some((s) => s.move === m));
  assert.ok(has('bunny', 'bunnyHop'));
  assert.ok(has('pig', 'pendulum'));
  assert.ok(has('cat', 'catWave', 'catClaw', 'catSpin'));
  assert.ok(has('fox', 'robot', 'foxPop'));
  assert.ok(has('bear', 'bearStomp', 'bearRock'));
  assert.ok(has('frog', 'frogSwim'));
  assert.ok(has('penguin', 'penguinWaddle', 'penguinGlide'));
  const owner = new Map();
  for (const id of SIGNATURE_IDS)
    for (let v = 0; v < VARIANTS; v++)
      for (const s of signatureSteps(id, v)) {
        if (s.move === 'strike') continue;
        assert.ok(!owner.has(s.move) || owner.get(s.move) === id, `${s.move}: ${owner.get(s.move)} and ${id}`);
        owner.set(s.move, id);
      }
  // every character ends on its own button
  assert.equal(new Set(SIGNATURE_IDS.map((id) => signatureSteps(id, 0).at(-1).look)).size, SIGNATURE_IDS.length);
  // the fast, hit-on-every-beat moves stay out of the podium dances
  for (const id of SIGNATURE_IDS) for (let v = 0; v < VARIANTS; v++) for (const s of signatureSteps(id, v)) assert.ok(!['hop', 'popBurst', 'chestPop', 'armPump', 'shimmy', 'frogJump', 'flap', 'spin', 'stomp', 'hit'].includes(s.move), `${id} v${v}: ${s.move}`);
});

/**
 * How far apart two dances are: the joint angles' distance (the norm of the Euler difference, rad),
 * averaged over the seven joints and over time, sampled at 30 fps over the song's 8 bars (a whole
 * cycle) — and bar by bar. The old signatures, all built from the same slow sway, were 0.15–0.36 apart
 * (bunny–bear 0.146, one bar 0.10): on screen, one dance seven times.
 */
function apart(a, b, beats = 32, fps = 30) {
  const da = podiumDance(a), db = podiumDance(b);
  const bars = [];
  let all = 0, n = 0;
  for (let f = 0; f < (beats * fps * 60) / BPM; f++) {
    const t = (f / fps) * (BPM / 60);
    const p = da.sample(t), q = db.sample(t);
    let d = 0;
    for (const j of JOINTS) d += Math.hypot(...p[j].map((x, i) => x - q[j][i]));
    d /= JOINTS.length;
    const bar = Math.floor(t / 4);
    bars[bar] ??= [0, 0];
    bars[bar][0] += d;
    bars[bar][1]++;
    all += d;
    n++;
  }
  return { mean: all / n, worstBar: Math.min(...bars.map(([s, k]) => s / k)) };
}

test('the dances look different from each other: every pair clearly apart, over the song and in every bar', () => {
  for (const a of SIGNATURE_IDS) {
    for (const b of SIGNATURE_IDS) {
      if (a >= b) continue;
      const { mean, worstBar } = apart(a, b);
      assert.ok(mean > 0.28, `${a} vs ${b}: mean joint distance ${mean.toFixed(3)} rad`);
      assert.ok(worstBar > 0.18, `${a} vs ${b}: closest bar ${worstBar.toFixed(3)} rad`);
    }
  }
});

test('distinct silhouettes: paws by the cheeks, low and wide, a paw up framing the face, straight arms, a deep squat, flippers swept back', () => {
  const mean = (id, f, beats = 24) => {
    let s = 0, n = 0;
    for (let t = 0; t < beats; t += 0.05) (s += f(at(id, t))), n++;
    return s / n;
  };
  const raise = (p) => (p.armR[2] - p.armL[2]) / 2, fwd = (p) => (p.armL[1] - p.armR[1]) / 2, wide = (p) => (p.legR[2] - p.legL[2]) / 2;
  // the bunny's paws up in front, by the cheeks; the penguin's swept back
  assert.ok(mean('bunny', fwd) > 0.9 && mean('bunny', raise) > 0.85);
  assert.ok(mean('penguin', fwd) < -0.3, `penguin ${mean('penguin', fwd)}`);
  // the pig and the frog wide; the cat, the bunny and the penguin narrow
  assert.ok(mean('pig', wide) > 0.3 && mean('frog', wide) > 0.4);
  for (const id of ['cat', 'bunny', 'penguin']) assert.ok(mean(id, wide) < 0.15, id);
  // the frog low, the bunny bouncing up and down, the pig swinging side to side, the penguin and the cat turning
  assert.ok(mean('frog', (p) => p.hipsY) < -0.06);
  assert.ok(mean('pig', (p) => Math.abs(p.sway)) > 0.08 && mean('bunny', (p) => Math.abs(p.sway)) < 0.05);
  const turns = (id) => {
    let max = 0;
    for (let t = 0; t < 32; t += 0.05) max = Math.max(max, Math.abs(at(id, t).yaw));
    return max;
  };
  assert.ok(turns('penguin') > 3 && turns('cat') > 3, 'whole spins');
  for (const id of ['bunny', 'pig', 'frog']) assert.ok(turns(id) < 0.5, `${id} faces front`);
  // the cat's paw framing its face: one paw high most of the time, the other low
  assert.ok(mean('cat', (p) => p.armR[2]) > 1.1 && mean('cat', (p) => -p.armL[2]) < 0.85);
});

test('a signature varies from cycle to cycle instead of looping two bars', () => {
  for (const id of SIGNATURE_IDS) {
    const variants = new Set(Array.from({ length: VARIANTS }, (_, v) => JSON.stringify(signatureSteps(id, v))));
    assert.ok(variants.size >= 3, `${id}: ${variants.size} variants`);
    // inside one cycle, no 12-count phrase (two bars of the song) is the same as the one before it
    const steps = signatureSteps(id, 0);
    const phrases = [];
    let n = 0, cur = [];
    for (const s of steps) {
      const { counts, ...rest } = s;
      cur.push(JSON.stringify(rest));
      n += counts;
      if (n % 12 === 0) (phrases.push(cur.join()), (cur = []));
    }
    assert.equal(phrases.length, 4);
    for (let i = 1; i < 4; i++) assert.notEqual(phrases[i], phrases[i - 1], `${id}: phrase ${i + 1} repeats`);
  }
});

test('signatures and flourishes stay inside the plush limits', () => {
  for (const id of SIGNATURE_IDS) {
    for (const place of [1, 2, 3, 0]) {
      const d = podiumDance(id, { place, limits: null });
      for (const b of beatsOf(30, 120)) {
        const p = d.sample(b);
        const c = clampPlushPose(p);
        // designed inside the envelope: the clamp barely touches them (paws in a V, never into the head)
        for (const j of JOINTS) for (let i = 0; i < 3; i++) assert.ok(Math.abs(c[j][i] - p[j][i]) < 0.03, `${id} p${place} ${j}[${i}] clamped at beat ${b.toFixed(2)}`);
        for (const arm of ['armL', 'armR']) assert.ok(Math.abs(p[arm][2]) <= PLUSH_LIMITS.armRaise[1] + 0.01, `${id} ${arm} raised ${p[arm][2]}`);
        assert.ok(p.lift <= 0.15 && p.lift >= 0, `${id} lift ${p.lift}`);
        assert.ok(p.stretch > -0.2 && p.stretch < 0.2);
      }
    }
  }
});

/**
 * Speed, acceleration and jerk of every joint (and the body's sway and turn) over two cycles at
 * 60 fps: rad/s, rad/s², rad/s³ (the norm of the three Euler rates). The old hit-on-every-beat
 * dances peaked at 20–28 rad/s with a jerk of 30 000–130 000; these flow.
 */
function motionOf(d, beats = (2 * CYCLE) / RATE, fps = 60) {
  const dt = 1 / fps;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const chans = [...JOINTS, 'sway', 'yaw'];
  const val = (p, j) => (Array.isArray(p[j]) ? p[j] : [p[j], 0, 0]);
  const max = {};
  for (const j of chans) max[j] = { v: 0, a: 0, jerk: 0, at: 0 };
  let p0 = null, v0 = null, a0 = null;
  let hops = 0, air = false, lowest = 0;
  for (let f = 0; f <= (beats * 60 * fps) / BPM; f++) {
    const b = (f * dt * BPM) / 60;
    const p = d.sample(b);
    if (p.lift > 0.01 && !air) hops++;
    air = p.lift > 0.01;
    lowest = Math.min(lowest, p.hipsY);
    const v = {}, a = {};
    for (const j of chans) {
      if (!p0) continue;
      v[j] = val(p, j).map((x, i) => (j === 'yaw' ? wrap(x - val(p0, j)[i]) : x - val(p0, j)[i]) / dt);
      const n = Math.hypot(...v[j]);
      if (n > max[j].v) (max[j].v = n), (max[j].at = b);
      if (!v0) continue;
      a[j] = v[j].map((x, i) => (x - v0[j][i]) / dt);
      max[j].a = Math.max(max[j].a, Math.hypot(...a[j]));
      if (a0) max[j].jerk = Math.max(max[j].jerk, Math.hypot(...a[j].map((x, i) => (x - a0[j][i]) / dt)));
    }
    p0 = p;
    if (Object.keys(v).length) v0 = v;
    if (Object.keys(a).length) a0 = a;
  }
  return { max, hops, lowest };
}

/** Pip's robot hits snap (a held pose, then over to the next in half a beat): faster, still eased. */
const FAST = { fox: { v: 8.5, jerk: 6000 } };

test('smooth at the 1.5× pace: no joint turns faster than 6 rad/s, no jerky hits (the fox\'s robot hits a little sharper)', () => {
  for (const id of SIGNATURE_IDS) {
    const lim = FAST[id] ?? { v: 6, jerk: 5000 };
    for (const place of [0, 1, 2, 3, 5]) {
      const d = podiumDance(id, { place });
      const { max } = motionOf(d);
      for (const [j, m] of Object.entries(max)) {
        assert.ok(m.v < lim.v, `${id} p${place} ${j}: ${m.v.toFixed(2)} rad/s at beat ${m.at.toFixed(2)} (${d.at(m.at).step.move})`);
        assert.ok(m.jerk < lim.jerk, `${id} p${place} ${j}: jerk ${m.jerk.toFixed(0)} rad/s³`);
      }
    }
  }
});

test('off the ground only where it is the dance: the bunny hops on every beat, the frog leaps every two bars, the winner hops once in two bars', () => {
  const air = (id, place = 0, beats = CYCLE / RATE) => {
    const d = podiumDance(id, { place });
    let hops = 0, up = false, top = 0, lowest = 0;
    for (let t = 0; t < beats; t += 1 / 60) {
      const p = d.sample(t);
      if (p.lift > 0.01 && !up) hops++;
      up = p.lift > 0.01;
      top = Math.max(top, p.lift);
      lowest = Math.min(lowest, p.hipsY);
    }
    return { hops, top, lowest };
  };
  for (const id of ['pig', 'cat', 'fox', 'bear', 'penguin']) {
    for (const place of [0, 2, 3, 5]) assert.equal(air(id, place).hops, 0, `${id} p${place}`);
    assert.equal(air(id, 1, (2 * CYCLE) / RATE).hops, (2 * CYCLE) / RATE / 8, `${id} winner: one hop every two bars`);
  }
  const bunny = air('bunny');
  assert.ok(bunny.hops >= 26 && bunny.top < 0.07, `bunny: ${bunny.hops} little hops, ${bunny.top.toFixed(3)} m`); // every beat but the button's bar
  const frog = air('frog');
  assert.ok(frog.hops === 3 && frog.top > 0.1 && frog.top <= 0.14, `frog: ${frog.hops} leaps, ${frog.top.toFixed(3)} m`);
  for (const id of SIGNATURE_IDS) assert.ok(air(id).lowest > -0.13, id);
  assert.ok(air('frog').lowest < -0.08, 'the frog squats deep');
});

test('each style keeps its own rhythm on the song\'s beat', () => {
  // the bunny: down on every beat, up between, a foot kicking in turn
  assert.ok(at('bunny', 2).hipsY < at('bunny', 2.5).hipsY - 0.02 && at('bunny', 2).lift === 0 && at('bunny', 2.5).lift > 0.03);
  assert.ok(at('bunny', 2.5).legR[0] < -0.4 && at('bunny', 2.5).legL[0] > -0.15);
  assert.ok(at('bunny', 3.5).legL[0] < -0.4 && at('bunny', 3.5).legR[0] > -0.15);
  // the pig: out to a side on every beat, the other side on the next; the knees dip on the beat and again, lighter, on the swung "a"
  assert.ok(at('pig', 2.3).sway > 0.12 && at('pig', 3.3).sway < -0.12);
  const k = (t) => at('pig', t).hipsY;
  assert.ok(k(2) < k(2 + 2 / 3) - 0.005 && k(2 + 2 / 3) < k(2.4) - 0.008);
  // …claps in front on 2 and 4, then up in a V
  assert.ok(-at('pig', 9.4).armR[1] > 1 && at('pig', 14).armR[2] > 1.5 && -at('pig', 14).armL[2] > 1.5);
  // the cat: the hips pop on the "and" of 2 and the "and" of 4 (syncopated), and hold
  assert.ok(at('cat', 1.05).hips[2] < -0.2 && at('cat', 1.55).hips[2] > 0.2 && at('cat', 3).hips[2] > 0.2 && at('cat', 3.55).hips[2] < -0.2);
  // …one slow spin on one foot in the third phrase
  let spun = 0;
  for (let t = 16; t < 24; t += 0.05) spun = Math.max(spun, Math.abs(at('cat', t).yaw));
  assert.ok(spun > 3 && Math.abs(at('cat', 16).yaw) < 0.05 && Math.abs(at('cat', 24).yaw) < 0.05 && at('cat', 19.75).legL[0] < -0.4);
  // the fox: a held robot pose on every beat (staccato), straight lines and right angles
  let moved = 0;
  for (let b = 1; b < 7; b++) {
    const p = at('fox', b + 0.25), q = at('fox', b + 0.6), next = at('fox', b + 1.25);
    for (const arm of ['armL', 'armR']) assert.ok(Math.hypot(...p[arm].map((x, i) => x - q[arm][i])) < 0.03, `fox beat ${b}: ${arm} holds`);
    if (Math.hypot(...['armL', 'armR'].flatMap((arm) => p[arm].map((x, i) => x - next[arm][i]))) > 0.5) moved++;
  }
  assert.ok(moved >= 5, `the fox hits ${moved} of 6 beats`);
  const ra = at('fox', 4.4); // one arm out flat, the other straight forward: a right angle
  assert.ok(Math.abs(ra.armR[1]) < 0.05 && Math.abs(ra.armR[2] - 0.8) < 0.05 && Math.abs(ra.armL[1] - 1.2) < 0.05);
  const t = at('fox', 1.4); // a T
  assert.ok(Math.abs(t.armR[2] - 0.8) < 0.05 && Math.abs(t.armL[2] + 0.8) < 0.05);
  // the bear: the left knee up and stomped down on 1, the right on 2, the body dropping into it; then the flex
  assert.ok(at('bear', 3.6).legL[0] < -0.4 && at('bear', 4.05).legL[0] > -0.05 && at('bear', 4.6).legR[0] < -0.4);
  assert.ok(at('bear', 4.2).hipsY < at('bear', 3.6).hipsY - 0.03);
  assert.ok(at('bear', 2.3).armR[2] > 1.1, 'double biceps');
  assert.ok(at('bear', 6.3).chest[0] > 0.2 && at('bear', 6.3).armR[2] < 0.3, 'crab');
  // the frog: a leap every two bars, landing by the next downbeat
  for (const t of [7, 15, 23]) assert.ok(at('frog', t).lift > 0.1 && at('frog', t + 1).lift === 0, `frog leap at ${t}`);
  // the penguin: from foot to foot on every beat, flapping on the off-beat, a whole spin every two bars
  assert.ok(at('penguin', 0.05).sway > 0.1 && at('penguin', 1.05).sway < -0.1);
  assert.ok(at('penguin', 2.6).armR[2] > at('penguin', 3.1).armR[2] + 0.2);
  for (const t of [6, 14, 22]) assert.ok(Math.abs(at('penguin', t).yaw) > 2.8, `penguin spin round ${t}`);
  assert.ok(at('penguin', 9).legL[2] < -0.3, 'a skating glide, the other leg out');
});

test('the winner raises a V on the downbeat and holds it a beat and a third, one soft hop; 2nd one paw, 3rd a small V on the other bars; off the podium a side-clap', () => {
  // two bars from the dance's start: the paws on their way up the beat before the downbeat, held through beats 0–1⅓, down by 2⅓
  const w = (b) => flourish(b, 1);
  assert.ok(w(-0.5).arms > 0.1 && w(-0.5).arms < 0.9, 'rising');
  assert.ok(!w(-1.4) || w(-1.4).arms === 0, 'not before a beat and a third ahead');
  for (const b of [8, 8.4, 9, 9.3]) {
    const f = w(b);
    assert.ok(f && f.arms === 1 && f.both, `held at ${b}`);
    assert.ok(f.pose.armL[2] <= -1.6 && f.pose.armR[2] >= 1.6 && f.pose.armR[2] <= 1.7);
  }
  assert.ok(w(8.3).pose.lift > 0.1 && w(9).pose.lift === 0, 'one hop, off the downbeat');
  assert.ok(w(9.6).arms < 1 && w(9.6).arms > 0, 'on the way down');
  assert.equal(w(12.5), null); // the rest of the two bars: the signature alone
  assert.equal(w(5), null);
  // 2nd: one paw, no hop, on the same bars; 3rd: a smaller V on the bars between
  assert.ok(!flourish(8.5, 2).both && flourish(8.5, 2).pose.lift === 0 && flourish(12.5, 2) === null);
  assert.ok(flourish(4.5, 3).both && flourish(4.5, 3).arms < flourish(8.5, 2).arms && flourish(0.5, 3) === null);
  const winner = podiumDance('bear', { place: 1 }).sample(8.3);
  const plain = podiumDance('bear', { place: 0 }).sample(8.3);
  assert.ok(winner.lift > plain.lift + 0.1 && winner.armR[2] > plain.armR[2] + 0.5);
  // off the podium: a small side-step clap, whatever the species
  const off = podiumDance('frog', { place: 5 });
  assert.equal(off.at(5).step.move, 'sideClap');
  assert.ok(off.sample(2).armL[1] > 0.7 && off.sample(1).lift === 0);
});

test('deterministic: species + place + start decide every pose, in any browser (no randomness)', () => {
  const real = Math.random;
  Math.random = () => {
    throw new Error('Math.random used');
  };
  try {
    for (const id of SIGNATURE_IDS) {
      const a = podiumDance(id, { place: 2, start: 0 });
      const b = podiumDance(id, { place: 2, start: 0 });
      // sampled in a different order, from a fresh instance: the same poses
      const beats = beatsOf(40, 10);
      const pa = beats.map((x) => flat(a.sample(x)));
      const pb = [...beats].reverse().map((x) => flat(b.sample(x))).reverse();
      assert.deepEqual(pa, pb, id);
    }
  } finally {
    Math.random = real;
  }
  // the start beat counts from a bar line: starting a bar later shifts the dance by exactly a bar
  const d0 = podiumDance('cat', { place: 1, start: 0 });
  const d4 = podiumDance('cat', { place: 1, start: 5 }); // → 4
  assert.equal(d4.start, 4);
  assert.deepEqual(flat(d4.sample(13.3)), flat(d0.sample(9.3)));
});
