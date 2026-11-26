/**
 * Motion onto stylised bodies (three.js): retarget a humanoid clip onto a
 * big-head, short-limb rig whose limbs are single bones (the plush riders),
 * bake procedural poses into clips, compress clips, and mask them.
 * Humanoid → humanoid (another skeleton with the same joints): use
 * retargetClip() in src/library/characters.js instead.
 *
 *   const clip = aimRetarget(rider.root, sourceScene, danceClip, PLUSH_FROM_UNREAL, {
 *     targetForward: rider.body.getWorldDirection(new THREE.Vector3()), tips: PLUSH_TIPS });
 *   rider.mixer.clipAction(compressClip(clip)).play();
 *
 * How (knowledge/motion-study.md §4): a one-bone limb can't copy a two-bone
 * arm's elbow, so it **aims along the source chain** (shoulder → wrist, hip →
 * ankle): where the hand goes, the paw goes. The spine and head copy the
 * source's turn from rest. Both happen in a facing frame (left, up, forward)
 * built for each body, so A-pose vs T-pose, Z-up armatures and bodies that face
 * −z all line up, and a limb whose name says L but sits on the body's right is
 * paired by where it is, not by its name.
 */
import * as THREE from 'three';
import { clampAim, applyPlushPose } from './dance.js';
import { reduceKeys, isConstant } from './clipTools.js';

/**
 * Plush rig ← Unreal-mannequin names (Mesh2Motion humans, Quaternius' Universal
 * Animation Library). A string copies that bone's turn; an array aims the bone
 * along the chain from its first to its last bone.
 */
export const PLUSH_FROM_UNREAL = {
  hips: 'pelvis',
  chest: 'spine_03',
  head: 'head',
  armL: ['upperarm_l', 'hand_l'],
  armR: ['upperarm_r', 'hand_r'],
  legL: ['thigh_l', 'foot_l'],
  legR: ['thigh_r', 'foot_r']
};
/** Plush rig ← Mixamo names (Mixamo downloads, three.js X Bot, 100Avatars VRMs). */
export const PLUSH_FROM_MIXAMO = {
  hips: 'mixamorig:Hips',
  chest: 'mixamorig:Spine2',
  head: 'mixamorig:Head',
  armL: ['mixamorig:LeftArm', 'mixamorig:LeftHand'],
  armR: ['mixamorig:RightArm', 'mixamorig:RightHand'],
  legL: ['mixamorig:LeftUpLeg', 'mixamorig:LeftFoot'],
  legR: ['mixamorig:RightUpLeg', 'mixamorig:RightFoot']
};
/** Plush rig ← CMU BVH as converted for Daz (three.js's pirouette.bvh). */
export const PLUSH_FROM_CMU_DAZ = {
  hips: 'hip',
  chest: 'chest',
  head: 'head',
  armL: ['lShldr', 'lHand'],
  armR: ['rShldr', 'rHand'],
  legL: ['lThigh', 'lFoot'],
  legR: ['rThigh', 'rFoot']
};
/**
 * Where each plush limb ends at rest, from its bone (sculpt units): the mitten
 * paw and the round foot of plushBody() in src/city/plushRider.js.
 */
export const PLUSH_TIPS = { armL: [-0.13, -0.125, 0.04], armR: [0.13, -0.125, 0.04], legL: [-0.01, -0.12, 0.04], legR: [0.01, -0.12, 0.04] };

const boneFinder = (root) => {
  const map = new Map();
  root.traverse((o) => {
    if (!map.has(o.name)) map.set(o.name, o);
  });
  return (name) => map.get(name) ?? map.get(THREE.PropertyBinding.sanitizeNodeName(name));
};
const wq = (o) => o.getWorldQuaternion(new THREE.Quaternion());
const wp = (o) => o.getWorldPosition(new THREE.Vector3());

/** A body's facing frame as a matrix whose columns are (left, up, forward). */
export function facingFrame(forward, up = new THREE.Vector3(0, 1, 0)) {
  const f = forward.clone().projectOnPlane(up).normalize();
  const left = new THREE.Vector3().crossVectors(up, f).normalize();
  return new THREE.Matrix4().makeBasis(left, up.clone().normalize(), f);
}

/** Which way a skeleton faces at rest, from its named left and right shoulders (or hips): forward = left × up. */
export function facingFromSides(leftBone, rightBone) {
  const left = wp(leftBone).sub(wp(rightBone));
  left.y = 0;
  return new THREE.Vector3().crossVectors(left.normalize(), new THREE.Vector3(0, 1, 0)).normalize();
}

/**
 * Bake `clip` (playing on `source`) onto `target`'s bones by aiming (see the top
 * of the file). Both scenes in rest pose; returns a new clip with a quaternion
 * track per mapped bone and a position track for the hips.
 *
 * @param {THREE.Object3D} target  e.g. a PlushRider's root
 * @param {THREE.Object3D} source  the clip's skeleton (a clip GLB's scene is enough)
 * @param {THREE.AnimationClip} clip
 * @param {Record<string, string | [string, string]>} map  target bone → source bone or [chain start, chain end]
 * @param {object} o
 *   targetForward / sourceForward: world vectors (source: from its L/R arms when omitted; target: required
 *     unless its L/R limbs really are on its left/right); tips: limb ends at rest in bone space for
 *     bones without a child; fps; clamp ({ minOut, maxBack } for clampAim, false for none);
 *   root: 'inPlace' (default: keep the bob, drop the travel) or 'scaled'; drop/lift: limits on the
 *     hips' vertical motion as fractions of the target's hip height (short legs can't squat deep).
 */
export function aimRetarget(target, source, clip, map, o = {}) {
  const { fps = 30, tips = {}, clamp = {}, root = 'inPlace', drop = 0.25, lift = 0.6, name = clip.name } = o;
  const tB = boneFinder(target);
  const sB = boneFinder(source);
  target.updateMatrixWorld(true);
  source.updateMatrixWorld(true);

  const entries = Object.entries(map)
    .map(([t, s]) => ({ t: tB(t), chain: Array.isArray(s) ? s.map(sB) : null, s: Array.isArray(s) ? null : sB(s), key: t }))
    .filter((e) => e.t && (e.s || (e.chain && e.chain[0] && e.chain[1])));
  if (!entries.length) throw new Error('aimRetarget: no bone of the map is in both skeletons');
  const hipE = entries.find((e) => e.key === Object.keys(map)[0] && e.s);

  // facing frames
  let sF = o.sourceForward;
  if (!sF) {
    const l = entries.find((e) => /L$/.test(e.key) && e.chain), r = entries.find((e) => /R$/.test(e.key) && e.chain);
    sF = l && r ? facingFromSides(l.chain[0], r.chain[0]) : new THREE.Vector3(0, 0, 1);
  }
  const tF = o.targetForward ?? new THREE.Vector3(0, 0, 1);
  const S = facingFrame(sF);
  const T = facingFrame(tF);
  const Sinv = S.clone().invert();
  const toT = T.clone().multiply(Sinv); // source world → target world (a turn about up)
  const toTq = new THREE.Quaternion().setFromRotationMatrix(toT);
  const toTqInv = toTq.clone().invert();

  // pair limbs by side, not by name: swap chains when the target's "L" sits on the source "L"'s other side
  const lateral = (p, frame) => p.clone().applyMatrix4(frame.clone().invert()).x;
  const centreS = wp(hipE?.s ?? source), centreT = wp(hipE?.t ?? target);
  const limbs = entries.filter((e) => e.chain);
  const mismatched = limbs.filter((e) => Math.sign(lateral(wp(e.chain[0]).sub(centreS), S)) !== Math.sign(lateral(wp(e.t).sub(centreT), T)));
  if (mismatched.length > limbs.length / 2) {
    for (const e of limbs) {
      const other = limbs.find((x) => x !== e && x.key.replace(/[LR]$/, '') === e.key.replace(/[LR]$/, ''));
      if (other && !e._swapped) {
        [e.chain, other.chain] = [other.chain, e.chain];
        e._swapped = other._swapped = true;
      }
    }
  }

  // rest data
  const depth = (b) => {
    let d = 0;
    while ((b = b.parent)) d++;
    return d;
  };
  entries.sort((a, b) => depth(a.t) - depth(b.t));
  for (const e of entries) {
    e.tRestWorld = wq(e.t);
    e.restLocalQ = e.t.quaternion.clone();
    e.restLocalP = e.t.position.clone();
    if (e.chain) {
      const tip = tips[e.key] ? new THREE.Vector3(...tips[e.key]) : e.t.children.find((c) => c.isBone || c.type === 'Bone')?.position.clone();
      if (!tip) throw new Error(`aimRetarget: ${e.key} has no child bone; give its tip in o.tips`);
      e.tRestDir = tip.applyQuaternion(e.tRestWorld).normalize();
      e.side = Math.sign(lateral(wp(e.t).sub(centreT), T)) || 1;
    } else e.sRestInv = wq(e.s).invert();
  }
  // leg length for the hips' motion: hip height over the lowest leg tip, each body
  const legLen = (getHip, ends) => Math.max(1e-6, getHip.y - Math.min(...ends.map((p) => p.y)));
  const legsT = limbs.filter((e) => /^leg/i.test(e.key));
  const hipRestS = hipE ? wp(hipE.s) : new THREE.Vector3();
  const hipRestT = hipE ? wp(hipE.t) : new THREE.Vector3();
  const footS = legsT.map((e) => wp(e.chain[1]));
  const footT = legsT.map((e) => e.t.localToWorld(new THREE.Vector3(...(tips[e.key] ?? e.t.children[0]?.position.toArray() ?? [0, -0.1, 0]))));
  const hS = footS.length ? legLen(hipRestS, footS) : 1;
  const hT = footT.length ? legLen(hipRestT, footT) : 1;
  const k = hT / hS;

  const mixer = new THREE.AnimationMixer(source);
  mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1).play().clampWhenFinished = true;
  const frames = Math.max(2, Math.round(clip.duration * fps) + 1);
  const times = new Float32Array(frames);
  const quats = entries.map(() => new Float32Array(frames * 4));
  const hips = new Float32Array(frames * 3);
  const q = new THREE.Quaternion(), pq = new THREE.Quaternion(), d = new THREE.Vector3(), v = new THREE.Vector3();
  const local = new THREE.Vector3();
  for (let f = 0; f < frames; f++) {
    const t = Math.min(clip.duration, f / fps);
    times[f] = t;
    mixer.setTime(t);
    source.updateMatrixWorld(true);
    entries.forEach((e, i) => {
      if (e.chain) {
        d.copy(wp(e.chain[1])).sub(wp(e.chain[0])).normalize().applyMatrix4(new THREE.Matrix4().extractRotation(Sinv));
        if (clamp) {
          // to (out, up, forward) for this side, clamp, and back
          const [ox, oy, oz] = clampAim([d.x * e.side, d.y, d.z], clamp);
          d.set(ox * e.side, oy, oz);
        }
        d.applyMatrix4(new THREE.Matrix4().extractRotation(T));
        q.setFromUnitVectors(e.tRestDir, d.normalize()).multiply(e.tRestWorld);
      } else {
        // the source's turn from rest, carried into the target's facing frame
        q.copy(wq(e.s)).multiply(e.sRestInv).premultiply(toTq).multiply(toTqInv).multiply(e.tRestWorld);
      }
      e.t.parent.updateWorldMatrix(true, false);
      e.t.parent.getWorldQuaternion(pq);
      e.t.quaternion.copy(pq.invert().multiply(q));
      e.t.updateMatrixWorld(true);
      e.t.quaternion.toArray(quats[i], f * 4);
    });
    if (hipE) {
      v.copy(wp(hipE.s)).sub(hipRestS).applyMatrix4(new THREE.Matrix4().extractRotation(toT)).multiplyScalar(k);
      if (root === 'inPlace') v.x = v.z = 0;
      v.y = Math.min(lift * hT, Math.max(-drop * hT, v.y));
      local.copy(hipRestT).add(v);
      hipE.t.parent.worldToLocal(local);
      local.toArray(hips, f * 3);
    }
  }
  for (const e of entries) {
    e.t.quaternion.copy(e.restLocalQ);
    e.t.position.copy(e.restLocalP);
  }
  target.updateMatrixWorld(true);
  mixer.stopAllAction();
  mixer.uncacheRoot(source);
  const tracks = entries.map((e, i) => new THREE.QuaternionKeyframeTrack(`${e.t.name}.quaternion`, times, quats[i]));
  if (hipE) tracks.push(new THREE.VectorKeyframeTrack(`${hipE.t.name}.position`, times, hips));
  return new THREE.AnimationClip(name, clip.duration, tracks);
}

/**
 * Bake a procedural pose function into a clip (so it can be crossfaded, layered,
 * exported as GLB and played by any mixer): `poseAt(t)` → pose (dance.js),
 * sampled at `fps` over `duration`, applied to the rig and recorded. The rig's
 * squash/tilt/turn groups need names (they're set here when missing).
 */
export function bakePoseClip(rig, poseAt, { duration, fps = 30, name = 'baked' } = {}) {
  const frames = Math.max(2, Math.round(duration * fps) + 1);
  const get = (n) => (rig.bones.get ? rig.bones.get(n) : rig.bones[n]);
  const joints = ['hips', 'chest', 'head', 'armL', 'armR', 'legL', 'legR'].map(get).filter(Boolean);
  for (const [k, g] of [['squash', rig.squash], ['tilt', rig.tilt], ['turn', rig.turn]]) if (g && !g.name) g.name = `motion-${k}`;
  const hips = get('hips');
  const saved = joints.map((b) => [b.quaternion.clone(), b.position.clone()]);
  const times = new Float32Array(frames);
  const qs = joints.map(() => new Float32Array(frames * 4));
  const hipP = new Float32Array(frames * 3);
  const sq = rig.squash ? { s: new Float32Array(frames * 3), p: new Float32Array(frames * 3) } : null;
  const arms = joints.filter((b) => /^arm/.test(b.name));
  const armS = arms.map(() => new Float32Array(frames * 3));
  const tilt = rig.tilt ? new Float32Array(frames * 4) : null;
  const turn = rig.turn ? new Float32Array(frames * 4) : null;
  for (let f = 0; f < frames; f++) {
    const t = (f / (frames - 1)) * duration;
    times[f] = t;
    applyPlushPose(rig, poseAt(t));
    joints.forEach((b, i) => b.quaternion.toArray(qs[i], f * 4));
    hips?.position.toArray(hipP, f * 3);
    arms.forEach((b, i) => b.scale.toArray(armS[i], f * 3));
    if (sq) {
      rig.squash.scale.toArray(sq.s, f * 3);
      rig.squash.position.toArray(sq.p, f * 3);
    }
    tilt && rig.tilt.quaternion.toArray(tilt, f * 4);
    turn && rig.turn.quaternion.toArray(turn, f * 4);
  }
  joints.forEach((b, i) => {
    b.quaternion.copy(saved[i][0]);
    b.position.copy(saved[i][1]);
  });
  arms.forEach((b) => b.scale.setScalar(1));
  const tracks = joints.map((b, i) => new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`, times, qs[i]));
  if (hips) tracks.push(new THREE.VectorKeyframeTrack(`${hips.name}.position`, times, hipP));
  arms.forEach((b, i) => tracks.push(new THREE.VectorKeyframeTrack(`${b.name}.scale`, times, armS[i])));
  if (sq) tracks.push(new THREE.VectorKeyframeTrack(`${rig.squash.name}.scale`, times, sq.s), new THREE.VectorKeyframeTrack(`${rig.squash.name}.position`, times, sq.p));
  if (tilt) tracks.push(new THREE.QuaternionKeyframeTrack(`${rig.tilt.name}.quaternion`, times, tilt));
  if (turn) tracks.push(new THREE.QuaternionKeyframeTrack(`${rig.turn.name}.quaternion`, times, turn));
  return new THREE.AnimationClip(name, duration, tracks);
}

/**
 * Fewer keys: drop tracks that never move and keys that interpolation already
 * gives (angleTol radians for quaternions, posTol units for vectors).
 * Returns { clip, before, after } (key counts).
 */
export function compressClip(clip, { angleTol = 0.006, posTol = 0.0015, dropConstant = false } = {}) {
  let before = 0, after = 0;
  const tracks = [];
  for (const tr of clip.tracks) {
    const stride = tr.getValueSize();
    before += tr.times.length;
    if (dropConstant && isConstant(tr.values, stride)) continue;
    const quat = tr instanceof THREE.QuaternionKeyframeTrack;
    const r = reduceKeys(tr.times, tr.values, stride, quat ? angleTol : posTol, { quat });
    after += r.times.length;
    tracks.push(new tr.constructor(tr.name, r.times, r.values));
  }
  return { clip: new THREE.AnimationClip(clip.name, clip.duration, tracks), before, after };
}

/** Only the tracks whose bone passes `keep` (a RegExp or a list of names): an upper-body layer, say. */
export function maskClip(clip, keep, name = `${clip.name}-masked`) {
  const test = keep instanceof RegExp ? (b) => keep.test(b) : (b) => keep.includes(b);
  return new THREE.AnimationClip(name, clip.duration, clip.tracks.filter((t) => test(t.name.slice(0, t.name.lastIndexOf('.')))).map((t) => t.clone()));
}
