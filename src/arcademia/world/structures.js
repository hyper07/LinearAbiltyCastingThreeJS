/**
 * What joins the floors: stone staircases with low walls and lanterns, rope
 * bridges over the stream, and the gate that stays shut at the foot of a
 * staircase until the floor above opens.
 */
import * as THREE from 'three';
import { add, batch, box, cone, cyl, mat, sphere } from './kit.js';
import { lampMat } from './buildings.js';

const lerp = (a, b, t) => a + (b - a) * t;
const lift = (t) => (t < 0.42 ? (t / 0.42) * 0.5 : t < 0.58 ? 0.5 : 0.5 + ((t - 0.58) / 0.42) * 0.5);

/** One staircase from s.a (lower floor) to s.b (upper floor). */
export function buildStairs(s, look) {
  const g = new THREE.Group();
  const stone = mat(look.stone, { rough: 0.95 });
  const stoneDark = mat(new THREE.Color(look.stone).multiplyScalar(0.8).getStyle(), { rough: 0.95 });
  const cap = mat('#e9e2d2', { rough: 0.9 });
  const iron = mat('#4c5560', { rough: 0.5, metal: 0.5 });
  const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  const N = 36;
  const W = s.width;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N;
    const y = lerp(s.a.y, s.b.y, lift(t1));
    const yLow = lerp(s.a.y, s.b.y, lift(t0)) - 2.2;
    const tm = (t0 + t1) / 2;
    const step = new THREE.Group();
    step.position.set(s.a.x + dx * tm, 0, s.a.z + dz * tm);
    step.rotation.y = yaw;
    add(step, box(W, y - yLow, (len / N) * 1.02), i % 2 ? stone : stoneDark, [0, (y + yLow) / 2, 0]);
    add(step, box(W + 0.02, 0.06, (len / N) * 0.95), cap, [0, y - 0.02, 0.02]);
    // Low walls on both sides.
    for (const side of [-1, 1]) add(step, box(0.32, 0.55, (len / N) * 1.02), stoneDark, [side * (W / 2 + 0.16), y + 0.2, 0]);
    g.add(step);
  }
  // Lantern posts at the foot, the landing and the top.
  for (const t of [0.02, 0.5, 0.98]) {
    for (const side of [-1, 1]) {
      const y = lerp(s.a.y, s.b.y, lift(t));
      const post = new THREE.Group();
      const px = s.a.x + dx * t + Math.cos(yaw) * side * (W / 2 + 0.16);
      const pz = s.a.z + dz * t - Math.sin(yaw) * side * (W / 2 + 0.16);
      post.position.set(px, y + 0.45, pz);
      add(post, box(0.4, 0.5, 0.4), stone, [0, 0.25, 0]);
      if (t !== 0.5 || side === 1) {
        add(post, cyl(0.04, 0.05, 0.9, 5), iron, [0, 0.95, 0]);
        add(post, box(0.18, 0.24, 0.18), lampMat, [0, 1.5, 0]);
        add(post, cone(0.16, 0.16, 4), iron, [0, 1.7, 0], [0, Math.PI / 4, 0]);
      }
      g.add(post);
    }
  }
  return batch(g);
}

/** A rope bridge along X across the stream, planks sagging a little. */
export function buildBridge({ x, z, y, length = 5.6, width = 1.9 }) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const plank = mat('#a87b52', { rough: 0.9 });
  const plankDark = mat('#8c6440', { rough: 0.9 });
  const post = mat('#6b4a32', { rough: 0.9 });
  const rope = mat('#d9c39a', { rough: 1 });
  const n = 13;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const px = -length / 2 + t * length;
    const sag = -Math.sin(Math.PI * t) * 0.22;
    add(g, box(length / n * 0.82, 0.08, width), i % 2 ? plank : plankDark, [px, 0.02 + sag, 0], [0, (i % 3 - 1) * 0.03, 0]);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add(g, cyl(0.08, 0.1, 1.3, 6), post, [sx * (length / 2 + 0.1), 0.45, sz * (width / 2 + 0.05)]);
    add(g, sphere(0.1, 6, 4), post, [sx * (length / 2 + 0.1), 1.12, sz * (width / 2 + 0.05)]);
  }
  // Hand ropes and the little vertical ties.
  for (const sz of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector3(-length / 2 - 0.1 + t * (length + 0.2), 1.0 - Math.sin(Math.PI * t) * 0.3, sz * (width / 2 + 0.05)));
    }
    add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.03, 4), rope);
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      add(g, cyl(0.015, 0.015, 0.8, 3), rope, [-length / 2 + t * length, 0.55 - Math.sin(Math.PI * t) * 0.25, sz * (width / 2 + 0.05)]);
    }
  }
  return batch(g);
}

/** The gate at the foot of a staircase: shut (with a padlock) until the floor above opens. */
export function buildGate(s, look) {
  const g = new THREE.Group();
  const stone = mat(look.stone, { rough: 0.95 });
  const wood = mat('#7a5638', { rough: 0.85 });
  const iron = mat('#3f464f', { rough: 0.5, metal: 0.5 });
  const gold = mat('#e2b84a', { rough: 0.3, metal: 0.7 });
  const W = s.width + 0.4;
  const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
  const yaw = Math.atan2(dx, dz);
  g.position.set(s.a.x + dx * 0.03, s.a.y, s.a.z + dz * 0.03);
  g.rotation.y = yaw;
  const frame = new THREE.Group();
  for (const side of [-1, 1]) add(frame, box(0.5, 2.6, 0.5), stone, [side * (W / 2 + 0.25), 1.3, 0]);
  add(frame, box(W + 1.2, 0.45, 0.6), stone, [0, 2.75, 0]);
  add(frame, cone(0.45, 0.6, 4), stone, [0, 3.25, 0], [0, Math.PI / 4, 0]);
  g.add(batch(frame));
  const doors = [-1, 1].map((side) => {
    const hinge = new THREE.Group();
    hinge.position.set(side * (W / 2), 0, 0);
    hinge.userData.live = true;
    const leaf = new THREE.Group();
    for (let i = 0; i < 4; i++) add(leaf, box(W / 8 - 0.02, 2.2, 0.08), wood, [-side * (W / 16 + (i * W) / 8), 1.15, 0]);
    add(leaf, box(W / 2, 0.12, 0.12), iron, [-side * W / 4, 0.6, 0.06]);
    add(leaf, box(W / 2, 0.12, 0.12), iron, [-side * W / 4, 1.8, 0.06]);
    hinge.add(leaf);
    g.add(hinge);
    return hinge;
  });
  const lock = new THREE.Group();
  lock.position.set(0, 1.2, 0.16);
  add(lock, box(0.34, 0.3, 0.12), gold);
  add(lock, new THREE.TorusGeometry(0.11, 0.035, 5, 10, Math.PI), gold, [0, 0.16, 0]);
  g.add(lock);
  let open = 0, target = 0;
  g.userData.setOpen = (on, instant = false) => {
    target = on ? 1 : 0;
    if (instant) open = target;
  };
  g.userData.update = (dt) => {
    open += Math.sign(target - open) * Math.min(Math.abs(target - open), dt * 0.8);
    doors[0].rotation.y = -open * 1.6;
    doors[1].rotation.y = open * 1.6;
    lock.visible = open < 0.05;
    lock.position.y = 1.2 - open * 2;
  };
  return g;
}

/** A treasure chest: a box with a curved lid that swings open. */
export function buildChest() {
  const g = new THREE.Group();
  const wood = mat('#c9824a', { rough: 0.8 });
  const band = mat('#ffd23f', { metal: 0.6 });
  add(g, box(1.1, 0.6, 0.7), wood, [0, 0.3, 0]);
  for (const x of [-0.42, 0.42]) add(g, box(0.1, 0.62, 0.72), band, [x, 0.3, 0]);
  const lid = new THREE.Group();
  lid.position.set(0, 0.6, -0.35);
  lid.userData.live = true;
  add(lid, new THREE.CylinderGeometry(0.35, 0.35, 1.1, 12, 1, false, 0, Math.PI), wood, [0, 0, 0.35], [0, 0, Math.PI / 2]);
  for (const x of [-0.42, 0.42]) add(lid, new THREE.CylinderGeometry(0.36, 0.36, 0.1, 12, 1, false, 0, Math.PI), band, [x, 0, 0.35], [0, 0, Math.PI / 2]);
  add(lid, box(0.18, 0.2, 0.08), band, [0, -0.02, 0.72]);
  g.add(lid);
  const glow = new THREE.PointLight('#ffd36b', 0, 4, 2);
  glow.position.set(0, 0.9, 0);
  g.add(glow);
  let open = 0, target = 0, t = 0;
  g.userData.setOpen = (on, instant = false) => {
    target = on ? 1 : 0;
    if (instant) open = target;
  };
  g.userData.update = (dt) => {
    t += dt;
    open += Math.sign(target - open) * Math.min(Math.abs(target - open), dt * 1.5);
    lid.rotation.x = -open * 1.9;
    glow.intensity = open * (3 + Math.sin(t * 4));
    if (!target) g.rotation.z = Math.sin(t * 3) * 0.03;
  };
  return g;
}
