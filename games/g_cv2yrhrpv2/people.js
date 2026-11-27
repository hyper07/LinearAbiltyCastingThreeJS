import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/**
 * People in Seoul: realistic men and women in everyday clothes from the
 * asset library (`extras` in scripts/library/sources.mjs) — Mina (the
 * Mixamo "Michelle") and Jun (a Ready Player Me avatar). Neither comes with
 * a walk, so they borrow the soldier's (idle, walk, run): the soldier's
 * skeleton plays the clip unseen, and each frame every bone's turn away
 * from its rest pose is copied onto the same bone of the person, in the
 * person's own frame. That works across skeletons with different rest
 * orientations and units, which naming alone would not.
 */

const LIB = './library/extras/';
export const PEOPLE = {
  mina: { name: 'Mina', file: 'people/Michelle.glb', prefix: 'mixamorig', height: 1.68, rest: 'TPose' },
  jun: { name: 'Jun', file: 'people/readyplayer.me.glb', prefix: '', height: 1.78, rest: null }
};
const SOURCE = { file: 'soldier/Soldier.glb', prefix: 'mixamorig', rest: 'TPose' };
/** Parents before children: each bone's new turn needs its parent's. */
const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];

const loader = new GLTFLoader();
const cache = new Map();
const load = (file) => {
  if (!cache.has(file)) cache.set(file, loader.loadAsync(`${LIB}${file}`).catch(() => null));
  return cache.get(file);
};

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const qc = new THREE.Quaternion();
const va = new THREE.Vector3();

/** A bone by its plain name, whether the file writes `mixamorig:Hips`, `mixamorigHips` or `Hips`. */
function boneOf(root, prefix, name) {
  return root.getObjectByName(`${prefix}${name}`) ?? root.getObjectByName(`${prefix}:${name}`) ?? root.getObjectByName(name);
}

/** Each bone's turn relative to the model's root, in rest (from a rest clip, if the file has one). */
function restOf(root, bones, gltf, restClip) {
  if (restClip) {
    const clip = gltf.animations.find((c) => c.name === restClip);
    if (clip) {
      const m = new THREE.AnimationMixer(root);
      m.clipAction(clip).play();
      m.update(0);
      m.stopAllAction();
    }
  }
  root.updateMatrixWorld(true);
  const inv = root.getWorldQuaternion(new THREE.Quaternion()).invert();
  return bones.map((b) => (b ? inv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())) : null));
}

/** Which way a skeleton faces in its root's frame (radians about y; 0 is +z). */
function facingOf(root, bones) {
  root.updateMatrixWorld(true);
  const l = bones[BONES.indexOf('LeftArm')].getWorldPosition(new THREE.Vector3());
  const r = bones[BONES.indexOf('RightArm')].getWorldPosition(new THREE.Vector3());
  root.worldToLocal(l);
  root.worldToLocal(r);
  const left = l.sub(r);
  const forward = left.cross(new THREE.Vector3(0, 1, 0)); // facing +z, the left hand is at +x
  return Math.atan2(forward.x, forward.z);
}

/** Turn `bone` so it points (towards `child`) along `dir` in the world, by `k` of the way. */
function bend(bone, child, dir, k) {
  if (!bone || !child) return;
  bone.updateWorldMatrix(true, false);
  child.updateWorldMatrix(false, false);
  const from = bone.getWorldPosition(new THREE.Vector3());
  const now = child.getWorldPosition(new THREE.Vector3()).sub(from).normalize();
  const turn = new THREE.Quaternion().setFromUnitVectors(now, dir);
  turn.slerp(new THREE.Quaternion(), 1 - k);
  const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(turn);
  const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  bone.quaternion.copy(parent.multiply(world));
  bone.updateWorldMatrix(false, true);
}

export function loadPerson(kind) {
  return Promise.all([load(PEOPLE[kind].file), load(SOURCE.file)]).then(([person, source]) => (person && source ? { person, source, kind } : null));
}

export class Person {
  /** @param {{ person: any, source: any, kind: string }} loaded */
  constructor({ person, source, kind }) {
    const def = PEOPLE[kind];
    this.kind = kind;
    this.group = new THREE.Group();
    // The soldier, never drawn: it only plays the walk.
    this.src = SkeletonUtils.clone(source.scene);
    this.srcBones = BONES.map((n) => boneOf(this.src, SOURCE.prefix, n));
    this.srcRest = restOf(this.src, this.srcBones, source, SOURCE.rest);
    this.mixer = new THREE.AnimationMixer(this.src);
    this.actions = {};
    for (const clip of source.animations) this.actions[clip.name] = this.mixer.clipAction(clip);
    // The person we see.
    this.model = SkeletonUtils.clone(person.scene);
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.frustumCulled = false;
    });
    this.bones = BONES.map((n) => boneOf(this.model, def.prefix, n));
    this.rest = restOf(this.model, this.bones, person, def.rest);
    // Turning a soldier's movement into this person's frame, if they face different ways in their files.
    const turn = facingOf(this.model, this.bones) - facingOf(this.src, this.srcBones);
    this.align = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn);
    this.alignInv = this.align.clone().invert();
    // A true height, feet on the ground, facing −z (the way the game's yaw 0 looks).
    const inner = new THREE.Group();
    inner.add(this.model);
    this.group.add(inner);
    const box = new THREE.Box3().setFromObject(this.model, true);
    this.model.scale.multiplyScalar(def.height / Math.max(0.1, box.max.y - box.min.y));
    inner.rotation.y = Math.PI - facingOf(this.model, this.bones);
    this.group.updateMatrixWorld(true);
    box.setFromObject(this.model, true);
    inner.position.y = -box.min.y;
    this.inner = inner;
    this.baseY = inner.position.y;
    // The soldier's hip height, to carry its up-and-down bob over in proportion.
    this.src.updateMatrixWorld(true);
    this.srcHipY = this.srcBones[0].getWorldPosition(va).y;
    this.srcHeight = new THREE.Box3().setFromObject(this.src, true).getSize(va).y || 1.8;
    this.state = null;
    this.play('Idle');
  }

  play(name, fade = 0.25) {
    if (this.state === name || !this.actions[name]) return;
    const next = this.actions[name];
    next.reset().play();
    if (this.state) this.actions[this.state].crossFadeTo(next, fade, false);
    this.state = name;
  }

  /**
   * One frame: `speed` in metres a second picks idle, walk or run, and paces
   * the steps; `cheer` (0–1) raises the arms and waves them, and bounces.
   */
  update(dt, speed = 0, cheer = 0) {
    const name = speed > 3.2 ? 'Run' : speed > 0.3 ? 'Walk' : 'Idle';
    this.play(name);
    if (this.actions.Walk) this.actions.Walk.timeScale = name === 'Walk' ? Math.max(0.6, speed / 1.5) : 1;
    if (this.actions.Run) this.actions.Run.timeScale = name === 'Run' ? Math.max(0.7, speed / 5.5) : 1;
    this.mixer.update(dt);
    this.src.updateMatrixWorld(true);
    this.model.updateMatrixWorld(true);
    const srcInv = this.src.getWorldQuaternion(qc).invert().clone();
    const tgtInv = this.model.getWorldQuaternion(qc).invert().clone();
    for (let i = 0; i < BONES.length; i++) {
      const s = this.srcBones[i];
      const t = this.bones[i];
      if (!s || !t || !this.srcRest[i] || !this.rest[i]) continue;
      // The soldier bone's turn away from its rest, in the soldier's frame…
      qa.copy(srcInv).multiply(s.getWorldQuaternion(qb)).multiply(qb.copy(this.srcRest[i]).invert());
      // …in the person's frame, applied to the person's rest…
      qa.premultiply(this.align).multiply(this.alignInv);
      qa.multiply(this.rest[i]);
      // …then back from the model's frame to the bone's parent's.
      const parent = tgtInv.clone().multiply(t.parent.getWorldQuaternion(qb));
      t.quaternion.copy(parent.invert().multiply(qa));
      t.updateWorldMatrix(false, false);
    }
    this.model.updateMatrixWorld(true);
    // The bob of the hips, scaled to this person.
    const bob = (this.srcBones[0].getWorldPosition(va).y - this.srcHipY) / this.srcHeight;
    this.inner.position.y = this.baseY + bob * PEOPLE[this.kind].height;
    this.cheering = (this.cheering ?? 0) + (cheer - (this.cheering ?? 0)) * Math.min(1, dt * 5);
    if (this.cheering > 0.02) this._cheer(this.cheering, dt);
  }

  /** Arms up and waving, a bounce on the toes: a crowd as a car goes by. */
  _cheer(k, dt) {
    this.t = (this.t ?? Math.random() * 10) + dt;
    const at = (name) => this.bones[BONES.indexOf(name)];
    const pos = (b) => b.getWorldPosition(new THREE.Vector3());
    const left = pos(at('LeftArm'));
    const right = pos(at('RightArm'));
    const out = left.clone().sub(right).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    for (const [side, s] of [['Left', 1], ['Right', -1]]) {
      const arm = at(`${side}Arm`);
      const fore = at(`${side}ForeArm`);
      const hand = at(`${side}Hand`);
      const wave = Math.sin(this.t * 9 + s) * 0.35;
      bend(arm, fore, up.clone().addScaledVector(out, s * 0.45).normalize(), k);
      bend(fore, hand, up.clone().addScaledVector(out, s * wave).normalize(), k);
    }
    this.inner.position.y += Math.abs(Math.sin(this.t * 7)) * 0.12 * k;
  }
}
