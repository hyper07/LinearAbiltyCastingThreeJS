import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { retargetClip, segmentClips, BONE_MAPS } from '../../src/library/characters.js';

/** A tiny leg rig: hips → spine, hips → thigh → calf → foot, with given names and rest turns. */
function leg(names, { thighRest = new THREE.Quaternion(), rootTurn = 0 } = {}) {
  const root = new THREE.Group();
  root.rotation.y = rootTurn;
  const bone = (name, parent, y = 0, x = 0) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, 0);
    parent.add(b);
    return b;
  };
  const hips = bone(names.hips, root, 1);
  bone(names.spine, hips, 0.3);
  const thigh = bone(names.thigh, hips, 0, 0.1);
  thigh.quaternion.copy(thighRest);
  // The calf hangs straight down in world space whatever the thigh's rest turn.
  const calf = bone(names.calf, thigh, 0, 0);
  calf.position.set(0, -0.5, 0).applyQuaternion(thighRest.clone().invert());
  const foot = bone(names.foot, calf, 0, 0);
  foot.position.copy(calf.position);
  root.updateMatrixWorld(true);
  return { root, hips, thigh, calf };
}
const dirOf = (a, b) => b.getWorldPosition(new THREE.Vector3()).sub(a.getWorldPosition(new THREE.Vector3())).normalize();

test('retargetClip: a source thigh swing comes out pointing the same way on a rig with other names and rest turns', () => {
  const src = leg({ hips: 'pelvis', spine: 'spine_01', thigh: 'thigh_l', calf: 'calf_l', foot: 'foot_l' });
  // The target's thigh bone is rolled 90° about its length at rest: a naive local copy would swing it sideways.
  const tgt = leg(
    // Named as GLTFLoader leaves Mixamo bones (it drops the colon).
    { hips: 'mixamorigHips', spine: 'mixamorigSpine', thigh: 'mixamorigLeftUpLeg', calf: 'mixamorigLeftLeg', foot: 'mixamorigLeftFoot' },
    { thighRest: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2) }
  );
  // Source clip: the thigh swings forward 60° about X over one second.
  const swing = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 3);
  const clip = new THREE.AnimationClip('swing', 1, [
    new THREE.QuaternionKeyframeTrack('thigh_l.quaternion', [0, 1], [0, 0, 0, 1, ...swing.toArray()])
  ]);
  const baked = retargetClip(tgt.root, src.root, clip, BONE_MAPS.mixamo, { fps: 10 });
  assert.equal(baked.duration, 1);
  assert.ok(baked.tracks.some((t) => t.name === 'mixamorigLeftUpLeg.quaternion'));

  // Play both at the end of the clip and compare where the knee points.
  const ms = new THREE.AnimationMixer(src.root);
  ms.clipAction(clip).play();
  ms.setTime(0.9);
  const mt = new THREE.AnimationMixer(tgt.root);
  mt.clipAction(baked).play();
  mt.setTime(0.9);
  src.root.updateMatrixWorld(true);
  tgt.root.updateMatrixWorld(true);
  const want = dirOf(src.thigh, src.calf);
  const got = dirOf(tgt.thigh, tgt.calf);
  assert.ok(want.z > 0.5, 'the source leg swung forward');
  assert.ok(got.distanceTo(want) < 1e-3, `target leg ${got.toArray()} vs source ${want.toArray()}`);
  // The target is left in its rest pose after baking.
  mt.stopAllAction();
});

test('segmentClips: one baked track becomes named clips by frame range', () => {
  const track = new THREE.NumberKeyframeTrack('.morphTargetInfluences[0]', Array.from({ length: 120 }, (_, i) => i / 24), Array.from({ length: 120 }, (_, i) => i));
  const clips = segmentClips(new THREE.AnimationClip('all', 119 / 24, [track]), { idle: [0, 29], walk: [90, 119] });
  assert.deepEqual(Object.keys(clips), ['idle', 'walk']);
  assert.ok(Math.abs(clips.walk.duration - 29 / 24) < 1e-6);
  assert.equal(clips.idle.tracks[0].values[0], 0);
  assert.equal(clips.walk.tracks[0].values.length, 30);
});
