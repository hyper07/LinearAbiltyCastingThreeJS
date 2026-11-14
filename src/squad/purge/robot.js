import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/**
 * The Paragon, Grave Purge's top rank: a war robot. The body is "Robot
 * Expressive" (CC0, Tomás Laulhé / Quaternius, from the three.js examples,
 * fetched into the asset library — see scripts/library/sources.mjs
 * `extras`), repainted, with twin shoulder cannons and a band in the
 * team's colour. It runs and stands like the soldiers; faces −z like them.
 */

const URL = './library/extras/robot/RobotExpressive.glb';
let loading = null;

export function loadRobot() {
  return (loading ??= new GLTFLoader().loadAsync(URL).catch(() => null));
}

export class Robot {
  /**
   * @param {any} gltf the loaded robot
   * @param {{ paint?: string, team?: string, height?: number }} look
   */
  constructor(gltf, { paint = '#d8b048', team = '#ffffff', height = 2.1 } = {}) {
    this.group = new THREE.Group();
    const model = SkeletonUtils.clone(gltf.scene);
    const plates = new THREE.Color(paint);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.frustumCulled = false;
      o.material = o.material.clone();
      if (o.material.name === 'Main') {
        o.material.color.copy(plates);
        o.material.metalness = 0.6;
        o.material.roughness = 0.35;
      } else if (o.material.name === 'Grey') {
        o.material.color.set('#6a7078');
        o.material.metalness = 0.7;
        o.material.roughness = 0.4;
      }
    });
    model.updateMatrixWorld(true);
    // Measure the posed mesh (precise: through the skin), not the bones' units.
    const box = new THREE.Box3().setFromObject(model, true);
    model.scale.multiplyScalar(height / Math.max(1e-3, box.max.y - box.min.y));
    model.rotation.y = Math.PI; // the robot faces +z; turn it to −z, as the soldiers stand
    this.group.add(model);
    model.updateMatrixWorld(true);
    box.setFromObject(model, true);
    model.position.y -= box.min.y;
    model.updateMatrixWorld(true);
    // Twin cannons on the shoulders and a team band across the chest, riding the torso.
    const torso = model.getObjectByName('Torso_1') ?? model.getObjectByName('Abdomen') ?? model;
    // Parts hung on a bone are sized in that bone's units: undo its scale (in the world, against the group).
    const s = 1 / torso.getWorldScale(new THREE.Vector3()).x;
    const metal = new THREE.MeshStandardMaterial({ color: '#2c3036', metalness: 0.8, roughness: 0.35 });
    const glow = new THREE.MeshStandardMaterial({ color: '#ffd070', emissive: '#ff9020', emissiveIntensity: 1.5 });
    for (const side of [-1, 1]) {
      const pod = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.22 * s, 0.5 * s), metal);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.06 * s, 0.55 * s, 10).rotateX(Math.PI / 2), metal);
      barrel.position.z = 0.42 * s;
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.02 * s, 10).rotateX(Math.PI / 2), glow);
      tip.position.z = 0.7 * s;
      pod.add(body, barrel, tip);
      pod.position.set(side * 0.36 * s, 0.42 * s, 0.05 * s);
      torso.add(pod);
    }
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.08 * s, 0.05 * s), new THREE.MeshStandardMaterial({ color: team, emissive: team, emissiveIntensity: 0.7 }));
    band.position.set(0, 0.25 * s, 0.24 * s);
    torso.add(band);
    this.model = model;
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    for (const clip of gltf.animations) this.actions[clip.name] = this.mixer.clipAction(clip);
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

  update(dt, { moving }) {
    this.play(moving ? 'Running' : 'Idle');
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
  }
}
