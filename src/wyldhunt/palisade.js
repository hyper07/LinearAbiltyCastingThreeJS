/**
 * The hunters' palisade across the gorge north of Lantern Camp: a wall of
 * sharpened stakes from wall to wall (over the river too), and the Hunters'
 * Gate on the path — two great posts, a beam, the guild's lanterns — where
 * Mistfall Gorge begins. Built in both zones it divides (zones.js).
 */
import * as THREE from 'three';
import { PALISADE } from './zones.js';

export function buildPalisade(world, { heightAt }) {
  const P = PALISADE;
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a5238, roughness: 0.95 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3e2e20, roughness: 0.9 });
  const glow = new THREE.MeshStandardMaterial({ color: 0xffc46a, emissive: 0xffa040, emissiveIntensity: 2.6 });
  const stake = new THREE.CylinderGeometry(0.17, 0.2, 4.2, 6);
  stake.translate(0, 2.1, 0);
  const tip = new THREE.ConeGeometry(0.19, 0.6, 6);
  tip.translate(0, 4.5, 0);
  const xs = [];
  for (let x = P.x0; x <= P.x1; x += 0.42) if (Math.abs(x - P.gate.x) > P.gate.half + 0.6) xs.push(x);
  const body = new THREE.InstancedMesh(stake, wood, xs.length);
  const tips = new THREE.InstancedMesh(tip, dark, xs.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  xs.forEach((x, i) => {
    const z = P.z + Math.sin(x * 1.7) * 0.12;
    const h = 0.85 + ((Math.sin(x * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.3;
    q.setFromEuler(new THREE.Euler(Math.sin(x * 3.1) * 0.05, x, Math.cos(x * 2.3) * 0.05));
    m.compose(new THREE.Vector3(x, heightAt(x, z) - 0.6, z), q, new THREE.Vector3(1, h, 1));
    body.setMatrixAt(i, m);
    tips.setMatrixAt(i, m);
  });
  for (const o of [body, tips]) {
    o.castShadow = o.receiveShadow = true;
    group.add(o);
  }
  // Rails tying the stakes.
  for (const y of [1.2, 3.1]) {
    for (const [a, b] of [[P.x0, P.gate.x - P.gate.half - 0.6], [P.gate.x + P.gate.half + 0.6, P.x1]]) {
      const len = b - a;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.16, 0.16), dark);
      const cx = (a + b) / 2;
      rail.position.set(cx, heightAt(cx, P.z) + y - 0.4, P.z + 0.25);
      group.add(rail);
    }
  }
  // The gate: two posts, a beam, lanterns.
  const gx = P.gate.x;
  const gy = heightAt(gx, P.z);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 7.2, 8), wood);
    post.position.set(gx + s * (P.gate.half + 0.3), gy + 3.4, P.z);
    post.castShadow = true;
    group.add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), glow);
    lamp.position.set(gx + s * (P.gate.half + 0.3), gy + 4.6, P.z + 0.55);
    group.add(lamp);
    world.lights?.add?.(lamp.position.clone(), { color: '#ffb050', intensity: 6, distance: 12 });
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(P.gate.half * 2 + 2.2, 0.5, 0.6), dark);
  beam.position.set(gx, gy + 6.6, P.z);
  beam.castShadow = true;
  group.add(beam);
  // Beyond the gate the other zone isn't built: a bank of the gorge's mist hides where this one ends.
  const side = world.zone?.id === 'base-camp' ? -1 : 1;
  const c2 = document.createElement('canvas');
  c2.width = 4;
  c2.height = 128;
  const g2 = c2.getContext('2d');
  const grad = g2.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(214,224,218,0)');
  grad.addColorStop(0.35, 'rgba(214,224,218,0.85)');
  grad.addColorStop(1, 'rgba(214,224,218,1)');
  g2.fillStyle = grad;
  g2.fillRect(0, 0, 4, 128);
  const tex = new THREE.CanvasTexture(c2);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mist = new THREE.Mesh(new THREE.PlaneGeometry(220, 90), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, color: 0xdfe8e2 }));
  mist.position.set(P.gate.x, heightAt(P.gate.x, P.z) + 38, P.z + side * 26);
  mist.renderOrder = 2;
  group.add(mist);
  world.mistBank = mist;
  world.scene.add(group);
  // Colliders: the wall either side of the gate.
  const c = world.colliders;
  for (const [a, b] of [[P.x0 - 30, gx - P.gate.half - 0.3], [gx + P.gate.half + 0.3, P.x1 + 30]]) c.box((a + b) / 2, P.z, (b - a) / 2, 0.45, 0, -100, 40);
  world.disposers.push(() => group.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose?.();
  }));
  return group;
}
