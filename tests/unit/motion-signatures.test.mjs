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
  assert.ok(has('bunny', 'hop'));
  assert.ok(has('pig', 'shimmy', 'stepClap'));
  assert.ok(has('cat', 'bodyRoll', 'pawFlick', 'hipSway'));
  assert.ok(has('fox', 'popBurst', 'chestPop', 'armPump'));
  assert.ok(has('bear', 'proudStep', 'shoulderRoll', 'stomp'));
  assert.ok(has('frog', 'frogJump', 'splitWiggle'));
  assert.ok(has('penguin', 'waddle', 'flap', 'spin'));
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

test('signatures and flourishes stay inside the plush limits, and move smoothly', () => {
  for (const id of SIGNATURE_IDS) {
    for (const place of [1, 2, 3, 0]) {
      const d = podiumDance(id, { place, limits: null });
      let prev = null;
      for (const b of beatsOf(30, 120)) {
        const p = d.sample(b);
        const c = clampPlushPose(p);
        // designed inside the envelope: the clamp barely touches them (paws in a V, never into the head)
        for (const j of JOINTS) for (let i = 0; i < 3; i++) assert.ok(Math.abs(c[j][i] - p[j][i]) < 0.03, `${id} p${place} ${j}[${i}] clamped at beat ${b.toFixed(2)}`);
        for (const arm of ['armL', 'armR']) assert.ok(Math.abs(p[arm][2]) <= PLUSH_LIMITS.armRaise[1] + 0.01, `${id} ${arm} raised ${p[arm][2]}`);
        assert.ok(p.lift <= 0.32 && p.lift >= 0, `${id} lift ${p.lift}`);
        assert.ok(p.stretch > -0.45 && p.stretch < 0.3);
        if (prev) for (const j of JOINTS) for (let i = 0; i < 3; i++) assert.ok(Math.abs(p[j][i] - prev[j][i]) < 0.35, `${id} ${j}[${i}] jumps at beat ${b.toFixed(2)} (${d.at(b).step.move})`);
        prev = p;
      }
    }
  }
});

test('the winner cheers in a V and jumps at every bar; 2nd and 3rd smaller, on alternate bars; off the podium a little clap', () => {
  // on each downbeat + half a beat: in the air
  const at = (place, bar) => flourish(bar * 4 + 0.45, place);
  for (let bar = 0; bar < 4; bar++) {
    const w = at(1, bar);
    assert.ok(w && w.pose.lift > 0.25 && w.arms === 1 && w.both, `winner bar ${bar}`);
    assert.ok(w.pose.armL[2] <= -1.6 && w.pose.armR[2] >= 1.6 && w.pose.armR[2] <= 1.7);
  }
  assert.ok(at(2, 0).pose.lift < at(1, 0).pose.lift && !at(2, 0).both && at(2, 1) === null && at(2, 2));
  assert.ok(at(3, 1).pose.lift < at(2, 0).pose.lift && at(3, 0) === null && at(3, 1).arms < at(2, 0).arms);
  assert.equal(flourish(2.5, 1), null); // mid-bar: the signature alone
  const winner = podiumDance('bear', { place: 1 }).sample(4.45);
  const plain = podiumDance('bear', { place: 0 }).sample(4.45);
  assert.ok(winner.lift > plain.lift + 0.2 && winner.armR[2] > plain.armR[2]);
  // off the podium: claps on 2 and 4, whatever the species
  const off = podiumDance('frog', { place: 5 });
  assert.equal(off.at(5).step.move, 'clap');
  assert.ok(off.sample(1).armL[1] > 0.7 && off.sample(1).lift === 0);
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

test('the fox keeps the chest-pop routine: four pops in two beats, then a sway and a clap', () => {
  const r = routine(signatureSteps('fox', 0), { limits: null });
  const c = (b) => beatAt(b, BPM);
  for (const b of [0.5, 1, 1.5, 4, 4.5, 5, 5.5]) assert.ok(r.sample(c(b)).chest[0] < -0.3, `pop at ${b}`);
  assert.ok(r.sample(c(4.37)).chest[0] > -0.1); // let go between pops
  const groove = r.sample(c(2.5));
  assert.ok(groove.armL[1] > 1 && Math.abs(groove.sway) > 0.05); // paws forward for the clap, swaying
  assert.ok(SIGNATURES.fox.dance.includes('chest-pop'));
});
