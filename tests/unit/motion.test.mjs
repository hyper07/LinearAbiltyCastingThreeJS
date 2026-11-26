import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  beatClock, fitBeatOffset, detectOnsets, pop, bounce, step, MOVES, DANCE_MOVES, EMOTES, movePose, routine, makeCombo,
  mirrorPose, restPose, clampPlushPose, clampAim, spring, squashScale, applyPlushPose, JOINTS
} from '../../src/shared/motion/dance.js';
import { reduceKeys, quantize, maskTracks, MASKS, splitRootMotion, scaleMotion, isConstant } from '../../src/shared/motion/clipTools.js';
import { aimRetarget, bakePoseClip, compressClip, maskClip } from '../../src/shared/motion/retarget.js';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} vs ${b}`);

test('the beat clock counts beats, bars and eights from a downbeat', () => {
  const c = beatClock(120, { offset: 0.25 });
  const s = c(0.25 + 0.5 * 9 + 0.1); // beat 9 and a bit
  assert.equal(s.index, 9);
  near(s.phase, 0.2);
  assert.equal(s.bar, 2);
  assert.equal(s.beatInBar, 1);
  assert.equal(s.count, 1);
  assert.equal(c(0).index, -1); // before the downbeat
  assert.equal(c(0).beatInBar, 3);
  assert.throws(() => beatClock(0));
});

test('the beat offset is found from onsets, even noisy ones', () => {
  const bpm = 100, spb = 0.6, off = 0.17;
  const onsets = Array.from({ length: 24 }, (_, i) => off + i * spb + (i % 3 - 1) * 0.01);
  near(fitBeatOffset(onsets, bpm), off, 0.01);
  // an envelope with a kick every half second → onsets every half second
  const hop = 0.01;
  const env = Array.from({ length: 400 }, (_, i) => ((i * hop) % 0.5 < 0.03 ? 1 : 0.05));
  const on = detectOnsets(env, hop);
  assert.ok(on.length >= 7, `${on.length} onsets`);
  for (let i = 1; i < on.length; i++) near(on[i] - on[i - 1], 0.5, 0.02);
});

test('a pop is 1 on the beat, rises only in the attack and is gone after the release', () => {
  const spb = 0.5;
  near(pop(0, spb), 1);
  assert.equal(pop((spb - 0.08) / spb, spb), 0); // before the 70 ms attack
  assert.ok(pop((spb - 0.035) / spb, spb) > 0.2 && pop((spb - 0.035) / spb, spb) < 0.3); // ease-in: (1/2)^2
  near(pop(0.05 / spb, spb), 1); // holding
  assert.equal(pop(0.42 / spb, spb), 0); // released (0.06 + 0.35)
  // sharp at any tempo: the attack is the same in seconds
  const fast = 0.35;
  near(pop((fast - 0.035) / fast, fast, { release: 0.1 }), 0.25, 0.01);
});

test('a bounce is lowest on the beat; a step arrives on the beat and dwells', () => {
  near(bounce(0), -1);
  near(bounce(0.5), 0);
  near(step(0), 1);
  near(step(0.3), 1); // still dwelling
  near(step(1), -1);
  near(step(0.999), -1, 0.01);
  near(step(2), 1);
});

test('every move and emote gives a full pose, finite, at any count', () => {
  const c = beatClock(126);
  for (const name of Object.keys(MOVES)) {
    for (const t of [0, 0.13, 0.47, 1.9, 3.3]) {
      const p = movePose(name, c(t));
      for (const j of JOINTS) assert.ok(p[j].every(Number.isFinite), `${name} ${j}`);
    }
  }
  assert.ok(DANCE_MOVES.includes('chestPop') && EMOTES.includes('hello'));
  // the chest pop: chest arched out on the beat, back to neutral half a beat later
  const onBeat = movePose('chestPop', c(60 / 126 * 4));
  const offBeat = movePose('chestPop', c(60 / 126 * 4.5));
  assert.ok(onBeat.chest[0] < -0.3 && Math.abs(offBeat.chest[0]) < 0.05);
  assert.ok(onBeat.stretch > 0.05); // popped up, though the knees give on the beat
});

test('mirroring swaps sides and twice is the same pose', () => {
  const p = movePose('point', beatClock(120)(0.1));
  const m = mirrorPose(p);
  assert.deepEqual(m.armL, [p.armR[0], -p.armR[1], -p.armR[2]]);
  const back = mirrorPose(m);
  for (const j of JOINTS) back[j].forEach((v, i) => near(v, p[j][i]));
  near(back.sway, p.sway);
});

test('plush limits keep a raised paw beside the head and stubby legs short', () => {
  const p = restPose();
  p.armL = [0, 1.4, -2.6]; // straight up (lost in the head) and swung across the face
  p.armR = [0, -1.4, 2.6];
  p.legL = [-2, 0, -1];
  const c = clampPlushPose(p);
  assert.ok(c.armL[1] <= 0.5 && c.armR[1] >= -0.5);
  near(c.armL[2], -1.7);
  assert.equal(c.legL[0], -0.95);
  assert.equal(c.legL[2], -0.55); // out, at most 0.55
  const a = clampAim([-0.2, 0.9, -0.9]); // across and behind
  assert.ok(a[0] > 0 && a[2] >= -0.46);
  near(Math.hypot(...a), 1);
  const v = clampAim([0, 1, 0]); // straight up → a V
  near(v[1], 0.75);
  near(v[0], Math.sqrt(1 - 0.75 ** 2));
});

test('routines loop, crossfade without jumps, and combos are original but repeatable', () => {
  const combo = makeCombo(7, { bars: 8 });
  assert.deepEqual(combo, makeCombo(7, { bars: 8 }));
  assert.notDeepEqual(combo, makeCombo(8, { bars: 8 }));
  const r = routine(combo);
  assert.equal(r.counts, 32);
  assert.equal(combo[0].move, 'bounce');
  assert.equal(combo.at(-1).move, 'hit');
  for (let i = 1; i < combo.length; i++) if (combo[i].move === combo[i - 1].move) assert.ok(combo[i].mirror, 'a repeat is only a mirror answer');
  // continuity: no joint jumps more than 0.35 rad between 120 fps frames
  const c = beatClock(120);
  let prev = r.sample(c(0));
  for (let f = 1; f < 120 * 16; f++) {
    const p = r.sample(c(f / 120));
    for (const j of JOINTS) for (let k = 0; k < 3; k++) assert.ok(Math.abs(p[j][k] - prev[j][k]) < 0.35, `${j}[${k}] jumps at ${f / 120}s (${r.at(c(f / 120).beat).step.move})`);
    prev = p;
  }
});

test('springs settle and squash keeps volume', () => {
  const s = { x: 0, v: 0 };
  for (let i = 0; i < 600; i++) spring(s, 1, 80, 12, 1 / 120);
  near(s.x, 1, 1e-3);
  const [x, y, z] = squashScale(0.2);
  near(x * y * z, 1);
});

test('keyframe reduction keeps the ends and the shape within tolerance', () => {
  const n = 61;
  const times = Float32Array.from({ length: n }, (_, i) => i / 30);
  const lin = Float32Array.from({ length: n * 3 }, (_, i) => (i % 3 === 1 ? Math.floor(i / 3) * 0.01 : 0));
  const r = reduceKeys(times, lin, 3, 1e-4);
  assert.deepEqual(r.kept, [0, n - 1]); // a straight line needs two keys
  const sine = Float32Array.from({ length: n }, (_, i) => Math.sin(i / 5));
  const rs = reduceKeys(times, sine, 1, 0.05);
  assert.ok(rs.times.length < n / 2 && rs.times.length > 4);
  // every dropped key is within tolerance of the line through the kept ones
  for (let i = 0; i < n; i++) {
    const t = times[i];
    let j = 0;
    while (rs.times[j + 1] < t) j++;
    const u = (t - rs.times[j]) / (rs.times[j + 1] - rs.times[j]);
    assert.ok(Math.abs(rs.values[j] * (1 - u) + rs.values[j + 1] * u - sine[i]) <= 0.0501);
  }
  // quaternions: a constant turn rate about one axis reduces to the ends
  const q = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.01).toArray(q, i * 4);
  assert.ok(reduceKeys(times, q, 4, 0.002, { quat: true }).times.length <= 3);
  assert.ok(isConstant(new Float32Array([1, 2, 1, 2]), 2) && !isConstant(new Float32Array([1, 2, 1, 3]), 2));
  near(quantize([0.123456], 2 / 65535)[0], 0.123456, 2 / 65535);
});

test('masks, root motion and scaling for chibi legs', () => {
  const names = ['mixamorig:LeftArm.quaternion', 'mixamorig:Hips.position', 'spine_03.quaternion', 'thigh_l.quaternion', 'armL.quaternion', 'legR.quaternion'];
  assert.deepEqual(maskTracks(names, MASKS.upperBody), ['mixamorig:LeftArm.quaternion', 'spine_03.quaternion', 'armL.quaternion']);
  assert.deepEqual(maskTracks(names, ['legR']), ['legR.quaternion']);
  const walk = new Float32Array([0, 1, 0, 0.5, 1.05, 1, 1, 1, 2]);
  const { inPlace, delta } = splitRootMotion(walk);
  [0, 1, 0, 0, 1.05, 0, 0, 1, 0].forEach((v, i) => near(inPlace[i], v, 1e-6));
  assert.deepEqual(delta, [1, 0, 2]);
  const s = scaleMotion(walk, 0.5, { clampY: [-0.01, 0.01] });
  near(s[3], 0.25);
  near(s[4], 1.01);
});

/* ---- three.js: retargeting onto a one-bone-limb plush rig, baking, compressing ---- */

function humanSkeleton() {
  // a T-posed humanoid facing +z, Unreal names, 1.8 m tall-ish
  const b = (name, parent, x, y, z) => {
    const o = new THREE.Bone();
    o.name = name;
    o.position.set(x, y, z);
    parent?.add(o);
    return o;
  };
  const pelvis = b('pelvis', null, 0, 1, 0);
  const spine = b('spine_03', pelvis, 0, 0.4, 0);
  b('head', spine, 0, 0.3, 0);
  for (const [s, x] of [['l', 1], ['r', -1]]) {
    const up = b(`upperarm_${s}`, spine, 0.2 * x, 0.2, 0);
    const lo = b(`lowerarm_${s}`, up, 0.3 * x, 0, 0);
    b(`hand_${s}`, lo, 0.25 * x, 0, 0);
    const th = b(`thigh_${s}`, pelvis, 0.1 * x, -0.05, 0);
    const ca = b(`calf_${s}`, th, 0, -0.45, 0);
    b(`foot_${s}`, ca, 0, -0.45, 0);
  }
  const root = new THREE.Group();
  root.add(pelvis);
  return root;
}

function plushRig() {
  const B = { root: [null, 0, 0, 0], hips: ['root', 0, 0.2, 0], chest: ['hips', 0, 0.33, 0], head: ['chest', 0, 0.46, 0], armL: ['chest', -0.17, 0.38, 0.02], armR: ['chest', 0.17, 0.38, 0.02], legL: ['hips', -0.1, 0.17, 0.02], legR: ['hips', 0.1, 0.17, 0.02] };
  const bones = new Map();
  const world = {};
  for (const [name, [p, x, y, z]] of Object.entries(B)) {
    const o = new THREE.Bone();
    o.name = name;
    world[name] = [x, y, z];
    const pw = p ? world[p] : [0, 0, 0];
    o.position.set(x - pw[0], y - pw[1], z - pw[2]);
    if (p) bones.get(p).add(o);
    bones.set(name, o);
  }
  const top = new THREE.Group();
  top.add(bones.get('root'));
  return { top, bones };
}

test('a one-bone plush arm aims where the human hand goes, on the same side of the body', async () => {
  const { PLUSH_FROM_UNREAL, PLUSH_TIPS } = await import('../../src/shared/motion/retarget.js');
  const human = humanSkeleton();
  // a clip: the left arm (character's left = +x when facing +z) goes from T-pose to straight up
  const up = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  const clip = new THREE.AnimationClip('raise', 1, [new THREE.QuaternionKeyframeTrack('upperarm_l.quaternion', [0, 1], [0, 0, 0, 1, ...up.toArray()])]);
  const { top, bones } = plushRig();
  // the plush sculpt faces +z, so its armL (at −x) is on the character's RIGHT: the side check must pair it with upperarm_r
  const out = aimRetarget(top, human, clip, PLUSH_FROM_UNREAL, { tips: PLUSH_TIPS, targetForward: new THREE.Vector3(0, 0, 1) });
  const mixer = new THREE.AnimationMixer(top);
  mixer.clipAction(out).play();
  mixer.setTime(0.999);
  top.updateMatrixWorld(true);
  const paw = (name) => bones.get(name).localToWorld(new THREE.Vector3(...PLUSH_TIPS[name])).sub(bones.get(name).getWorldPosition(new THREE.Vector3())).normalize();
  // the raised arm is the plush's armR (+x side, the character's left): up and out, a V beside the big head
  const r = paw('armR');
  assert.ok(r.y > 0.7 && r.y < 0.8, `armR up: ${r.toArray()}`);
  assert.ok(r.x > 0.6, 'kept out beside the head');
  // the other arm stays as the human's right arm: out to the side (T-pose)
  const l = paw('armL');
  assert.ok(l.x < -0.9 && Math.abs(l.y) < 0.2, `armL out: ${l.toArray()}`);
});

test('procedural poses bake into a clip that plays back the same, and compress', () => {
  const { top, bones } = plushRig();
  const squash = new THREE.Group();
  const rig = { bones, squash };
  const c = beatClock(120);
  const r = routine(makeCombo(3, { bars: 4 }));
  const clip = bakePoseClip(rig, (t) => r.sample(c(t)), { duration: 8, fps: 30, name: 'combo' });
  assert.ok(clip.tracks.some((t) => t.name === 'motion-squash.scale'));
  const holder = new THREE.Group();
  holder.add(top, squash);
  const mixer = new THREE.AnimationMixer(holder);
  mixer.clipAction(clip).play();
  mixer.setTime(2.5);
  const want = r.sample(c(2.5));
  const e = new THREE.Euler().setFromQuaternion(bones.get('chest').quaternion);
  near(e.x, want.chest[0], 0.03);
  const { clip: small, before, after } = compressClip(clip);
  assert.ok(after < before * 0.8, `${before} → ${after} keys`);
  assert.equal(maskClip(clip, ['armL', 'armR']).tracks.length, 4); // turn and reach (scale) per arm
  // applying a masked pose leaves the legs alone
  bones.get('legL').rotation.set(0.3, 0, 0);
  applyPlushPose(rig, movePose('hello', c(0)), { mask: ['armR', 'head'] });
  near(bones.get('legL').rotation.x, 0.3);
  assert.equal(small.tracks.length, clip.tracks.length);
});
