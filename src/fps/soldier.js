import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/**
 * The people of Breachline: an animated soldier (the Mixamo soldier from the
 * three.js examples, fetched into the asset library — see
 * scripts/library/sources.mjs `extras`), tinted and banded in team colours,
 * walking, running and standing by the match, holding a rifle at the
 * shoulder. Its arms are posed onto the rifle every frame by a small
 * two-bone reach (`reach` below), whatever the legs are doing.
 */

const URL = './library/extras/soldier/Soldier.glb';
const HEIGHT = 1.8;
let loading = null;

export function loadSoldier() {
  return (loading ??= new GLTFLoader().loadAsync(URL).catch(() => null));
}

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const q1 = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

/** Turn `bone` (in the world) so that the way it points (to `child`) is towards `to`. */
function aim(bone, child, to) {
  bone.updateWorldMatrix(true, false);
  child.updateWorldMatrix(false, false);
  const from = bone.getWorldPosition(v1);
  const now = child.getWorldPosition(v2).sub(from).normalize();
  const want = v3.copy(to).sub(from).normalize();
  q1.setFromUnitVectors(now, want); // the world turn needed
  bone.getWorldQuaternion(q2);
  q2.premultiply(q1); // the bone's new world turn
  const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(parent.invert().multiply(q2));
  bone.updateWorldMatrix(false, true);
}

/** A two-bone reach: the shoulder stays, the elbow bends towards `pole`, the hand gets to `target` (or as near as the arm allows). */
function reach(upper, lower, hand, target, pole) {
  const s = upper.getWorldPosition(new THREE.Vector3());
  const l1 = lower.getWorldPosition(new THREE.Vector3()).distanceTo(s);
  const l2 = hand.getWorldPosition(new THREE.Vector3()).distanceTo(lower.getWorldPosition(new THREE.Vector3()));
  const toT = target.clone().sub(s);
  const d = Math.min(toT.length(), (l1 + l2) * 0.999);
  const dir = toT.normalize();
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const side = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const elbow = s.clone().add(dir.clone().multiplyScalar(a)).add(side.multiplyScalar(h));
  aim(upper, lower, elbow);
  aim(lower, hand, s.clone().add(dir.multiplyScalar(d)));
}

export class Soldier {
  /**
   * @param {any} gltf the loaded soldier
   * @param {string} color the team's colour
   * @param {string} tint a wash over the uniform, for the team
   * @param {THREE.Object3D} gun the weapon in their hands (made by guns.js)
   */
  constructor(gltf, color, tint, gun) {
    this.group = new THREE.Group();
    const model = SkeletonUtils.clone(gltf.scene);
    const wash = new THREE.Color(tint);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      o.material = o.material.clone();
      o.material.color.multiply(wash);
    });
    this.group.add(model);
    model.updateMatrixWorld(true);
    const bone = (name) => model.getObjectByName(`mixamorig${name}`) ?? model.getObjectByName(`mixamorig:${name}`);
    this.b = Object.fromEntries(['Hips', 'Spine', 'Spine1', 'Spine2', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'].map((n) => [n, bone(n)]));
    // Stand it a true height, on the ground, facing the way a player looks (−z).
    const box = new THREE.Box3().setFromObject(model, true);
    const k = HEIGHT / Math.max(0.1, box.max.y - box.min.y);
    model.scale.multiplyScalar(k);
    model.updateMatrixWorld(true);
    const left = this.b.LeftArm.getWorldPosition(new THREE.Vector3()).sub(this.b.RightArm.getWorldPosition(new THREE.Vector3()));
    const forward = left.clone().cross(UP).setY(0).normalize();
    model.rotation.y += Math.atan2(forward.x, forward.z) - Math.PI; // turn `forward` to −z
    model.updateMatrixWorld(true);
    box.setFromObject(model, true);
    model.position.y -= box.min.y;
    model.updateMatrixWorld(true);
    // Team bands on both upper arms, so a friend is never mistaken at a distance.
    const band = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.6 });
    for (const [arm, fore] of [[this.b.LeftArm, this.b.LeftForeArm], [this.b.RightArm, this.b.RightForeArm]]) {
      const s = arm.getWorldScale(new THREE.Vector3()).x;
      const len = fore.position.length();
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.09 / s, 0.09 / s, 0.1 / s, 16, 1, true), band);
      ring.position.y = len * 0.5;
      ring.material.side = THREE.DoubleSide;
      arm.add(ring);
    }
    // The rifle sits at the right shoulder and turns with the look up or down.
    this.shoulder = this.group.worldToLocal(this.b.RightArm.getWorldPosition(new THREE.Vector3()));
    this.mount = new THREE.Group();
    this.mount.position.set(this.shoulder.x - 0.06, this.shoulder.y - 0.06, this.shoulder.z - 0.02);
    this.group.add(this.mount);
    this.gun = gun;
    this.mount.add(gun);
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    for (const clip of gltf.animations) this.actions[clip.name] = this.mixer.clipAction(clip);
    this.state = null;
    this.play('Idle');
    this.model = model;
  }

  play(name, fade = 0.25) {
    if (this.state === name || !this.actions[name]) return;
    const next = this.actions[name];
    next.reset().play();
    if (this.state) this.actions[this.state].crossFadeTo(next, fade, false);
    this.state = name;
  }

  /** Swap the weapon in their hands. */
  hold(gun) {
    this.mount.remove(this.gun);
    this.gun = gun;
    this.mount.add(gun);
  }

  /**
   * One frame: legs by the animation (`moving`: run, `slow`: walk), the
   * rifle by where they look, arms onto the rifle.
   */
  update(dt, { moving, slow, pitch, alive }) {
    this.play(!alive ? 'Idle' : moving ? (slow ? 'Walk' : 'Run') : 'Idle');
    this.mixer.update(dt);
    if (!alive) return;
    this.mount.rotation.x = pitch;
    this.model.updateMatrixWorld(true);
    // Lean the chest a little into the look.
    q1.setFromAxisAngle(v1.set(1, 0, 0), pitch * 0.35);
    this.b.Spine2.quaternion.multiply(q1);
    this.b.Spine2.updateWorldMatrix(false, true);
    const grip = this.gun.userData.grip;
    const fore = this.gun.userData.fore;
    if (!grip || !fore) return;
    this.group.updateWorldMatrix(true, true);
    const toWorld = (p) => this.gun.localToWorld(p.clone());
    const turn = new THREE.Quaternion();
    this.group.getWorldQuaternion(turn);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(turn);
    reach(this.b.RightArm, this.b.RightForeArm, this.b.RightHand, toWorld(grip), right.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, -1, 0)));
    reach(this.b.LeftArm, this.b.LeftForeArm, this.b.LeftHand, toWorld(fore), right.clone().multiplyScalar(-0.3).add(new THREE.Vector3(0, -1, 0)));
  }

  dispose() {
    this.mixer.stopAllAction();
    this.group.traverse((o) => {
      if (o.isMesh) o.material.dispose?.();
    });
  }
}
