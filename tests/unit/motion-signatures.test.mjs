import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIGNATURES, SIGNATURE_IDS, signatureSteps, podiumDance, flourish, CYCLE, VARIANTS } from '../../src/shared/motion/signatures.js';
import { routine, beatAt, clampPlushPose, JOINTS, SCALARS, PLUSH_LIMITS, MOVES } from '../../src/shared/motion/dance.js';
import { CREW } from '../../src/city/crew.js';

const BPM = 143.6;
const beatsOf = (seconds, fps = 60) => Array.from({ length: Math.round(seconds * fps) }, (_, f) => ((f / fps) * BPM) / 60);
const flat = (p) => [...JOINTS.flatMap((j) => p[j]), ...SCALARS.map((s) => p[s])];

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
  // and their main moves read as them
  const has = (id, ...moves) => moves.every((m) => signatureSteps(id, 0).some((s) => s.move === m));
  assert.ok(has('bunny', 'bounceSway', 'reachUp'));
  assert.ok(has('pig', 'sideClap', 'lazySway'));
  assert.ok(has('cat', 'bodyWave', 'sultrySway', 'pawArc'));
  assert.ok(has('fox', 'slowPop', 'armFlow'));
  assert.ok(has('bear', 'heavyStep', 'rollShoulders'));
  assert.ok(has('frog', 'squatRise', 'wideWiggle'));
  assert.ok(has('penguin', 'waddleGlide', 'flipperWave', 'slowTurn'));
  // the fast, hit-on-every-beat moves stay out of the podium dances
  for (const id of SIGNATURE_IDS) for (let v = 0; v < VARIANTS; v++) for (const s of signatureSteps(id, v)) assert.ok(!['hop', 'popBurst', 'chestPop', 'armPump', 'shimmy', 'frogJump', 'flap', 'spin', 'stomp', 'hit'].includes(s.move), `${id} v${v}: ${s.move}`);
});

test('the dances look different from each other, not just named differently', () => {
  const beats = beatsOf(14, 30);
  const tracks = Object.fromEntries(SIGNATURE_IDS.map((id) => [id, beats.map((b) => flat(podiumDance(id).sample(b)))]));
  for (const a of SIGNATURE_IDS) {
    for (const b of SIGNATURE_IDS) {
      if (a >= b) continue;
      let d = 0;
      tracks[a].forEach((p, i) => (d += Math.hypot(...p.map((x, k) => x - tracks[b][i][k]))));
      assert.ok(d / beats.length > 0.25, `${a} vs ${b}: mean pose distance ${(d / beats.length).toFixed(3)}`);
    }
  }
});

test('a signature varies from cycle to cycle instead of looping two bars', () => {
  for (const id of SIGNATURE_IDS) {
    const variants = new Set(Array.from({ length: VARIANTS }, (_, v) => JSON.stringify(signatureSteps(id, v))));
    assert.ok(variants.size >= 3, `${id}: ${variants.size} variants`);
    // inside one cycle, no 8-count phrase is the same as the one before it
    const steps = signatureSteps(id, 0);
    const phrases = [];
    let at = 0, cur = [];
    for (const s of steps) {
      cur.push(`${s.move}${s.mirror ? "'" : ''}${s.big ? '!' : ''}${s.side ? '~' : ''}`);
      at += s.counts;
      if (at % 8 === 0) (phrases.push(cur.join()), (cur = []));
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
function motionOf(d, beats = 2 * CYCLE, fps = 60) {
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

test('smooth at 1.5× the half-time moves: no joint turns faster than 6 rad/s, no jerky hits', () => {
  for (const id of SIGNATURE_IDS) {
    for (const place of [0, 1, 2, 3, 5]) {
      const d = podiumDance(id, { place });
      const { max } = motionOf(d);
      for (const [j, m] of Object.entries(max)) {
        assert.ok(m.v < 6, `${id} p${place} ${j}: ${m.v.toFixed(2)} rad/s at beat ${m.at.toFixed(2)} (${d.at(m.at).step.move})`);
        assert.ok(m.jerk < 5000, `${id} p${place} ${j}: jerk ${m.jerk.toFixed(0)} rad/s³`);
      }
    }
  }
});

test('a soft knee groove, not hops: only the winner leaves the ground, once in two bars', () => {
  for (const id of SIGNATURE_IDS) {
    for (const place of [0, 2, 3, 5]) {
      const { hops, lowest } = motionOf(podiumDance(id, { place }), CYCLE, 30);
      assert.equal(hops, 0, `${id} p${place} hops`);
      assert.ok(lowest > -0.11, `${id} p${place} knees ${lowest}`);
    }
    const { hops } = motionOf(podiumDance(id, { place: 1 }), 2 * CYCLE, 30);
    assert.equal(hops, (2 * CYCLE) / 8, `${id} winner: one hop every two bars`);
  }
});

test('half time: the weight lands on every other beat and dwells there', () => {
  // the hips' side-to-side (twist) in the bear's two-step: at a side on beats 0, 2, 4…, held a moment, then across
  const r = routine(signatureSteps('bear', 0), { limits: null });
  const hipsY = (b) => r.sample(beatAt(b, BPM)).hips[1];
  for (const b of [2, 4, 6]) {
    assert.ok(Math.abs(hipsY(b)) > 0.1, `beat ${b}: at a side`);
    assert.ok(Math.abs(hipsY(b + 0.3) - hipsY(b)) < 0.01, `beat ${b}: dwelling`);
    assert.ok(Math.sign(hipsY(b)) !== Math.sign(hipsY(b + 2)), `beat ${b}: the other side two beats later`);
  }
  // the knees bottom out on the landing (the soft groove), never on the odd beats
  const knees = (b) => r.sample(beatAt(b, BPM)).hipsY;
  assert.ok(knees(2) < knees(1) - 0.03 && knees(4) < knees(3) - 0.03);
});

test('the winner raises a V on the downbeat and holds it a beat and a third, one soft hop; 2nd one paw, 3rd a small V on the other bars; off the podium a side-clap', () => {
  // two bars from the dance's start: the paws on their way up the beat before the downbeat, held through beats 0–1⅓, down by 2⅓
  const w = (b) => flourish(b, 1);
  assert.ok(w(-0.5).arms > 0.1 && w(-0.5).arms < 0.9, 'rising');
  assert.ok(!w(-1.1) || w(-1.1).arms === 0, 'not before the beat ahead');
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

test('the fox pops its chest slowly, one every two beats, then waves its arms smoothly', () => {
  const r = routine(signatureSteps('fox', 0), { limits: null });
  const c = (b) => beatAt(b, BPM);
  for (const b of [2, 4, 6]) {
    assert.ok(r.sample(c(b)).chest[0] < -0.2, `pop on ${b}`);
    assert.ok(r.sample(c(b + 1)).chest[0] > -0.05, `let go by ${b + 1}`);
  }
  // the head counters after the chest (follow-through), not with it
  assert.ok(r.sample(c(2)).head[0] < r.sample(c(2.5)).head[0]);
  // the arm wave: a ripple from one paw to the other over four beats
  const armL = (b) => -r.sample(c(b)).armL[2];
  const armR = (b) => r.sample(c(b)).armR[2];
  assert.ok(armL(9) > armL(11) + 0.5 && armR(9.8) > armR(11.8) + 0.5);
  assert.ok(SIGNATURES.fox.dance.includes('chest pops'));
});
