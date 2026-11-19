/**
 * The Gloamwood's own buildings and lights: houses grown round the feet of
 * the great trees (a curved timber wall on a stone ring, carved stone
 * pillars, a sweeping roof of violet shingles that turns up at the rim,
 * round windows lit amber), the blue lamp posts along the path, glowing
 * mushrooms, and the moonwell in the glade at the path's end.
 */
import * as THREE from 'three';
import { tf } from './kit.js';
import { rng } from './noise.js';
import { ROOT_HOUSES, gloamLamps } from './map.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export async function gloamMaterials(bank) {
  const [shingle, planks] = await Promise.all([bank.ambient('RoofingTiles014B', { fallback: '#5a3a6a' }), bank.ambient('WoodFloor043', { fallback: '#3a2a3a' })]);
  const std = (set, extra = {}) => new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, roughnessMap: set.arm, aoMap: set.arm, vertexColors: true, roughness: 1, ...extra });
  return {
    shingleViolet: std(shingle, { color: 0xb090d8, normalScale: new THREE.Vector2(1.5, 1.5), side: THREE.DoubleSide }),
    darkWood: std(planks, { color: 0x9a7aa0, side: THREE.DoubleSide }),
    lampGlass: new THREE.MeshStandardMaterial({ color: 0x0a2030, emissive: 0x6ad8ff, emissiveIntensity: 4, roughness: 0.2, vertexColors: true }),
    amber: new THREE.MeshStandardMaterial({ color: 0x2a1408, emissive: 0xffa040, emissiveIntensity: 2.4, roughness: 0.3, vertexColors: true }),
    mushroom: new THREE.MeshStandardMaterial({ color: 0x2a90c0, emissive: 0x20c8f0, emissiveIntensity: 0.9, roughness: 0.4, vertexColors: true }),
    stem: new THREE.MeshStandardMaterial({ color: 0xd8d0e0, roughness: 0.7, vertexColors: true }),
    moonwater: new THREE.MeshStandardMaterial({ color: 0x0a2840, emissive: 0x58e0ff, emissiveIntensity: 1.8, roughness: 0.05, vertexColors: true })
  };
}

/** A lathe-built ring segment: profile [[r, y], …] swept from a0 through `len` radians. */
function lathe(profile, a0, len, seg = 40) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg, a0, len);
  return g;
}

function scaleUv(geo, ku, kv = ku) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ku, uv.getY(i) * kv);
  return geo;
}

/** One root house into `kit`. Returns its door, windows and lamps (world). */
export function addRootHouse(kit, h, y) {
  const r = rng(h.seed * 31);
  // Lathe angles start at +z and turn toward +x; centre the arc on the front.
  const M = tf(h.x, y, h.z, 0, h.face, 0);
  const L = (x, yy, z, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(x, yy, z, rx, ry, rz));
  const arc = Math.PI * 1.25;
  const a0 = -arc / 2;
  const R = 8.4;
  // Stone ring to stand on.
  kit.add('gateStone', scaleUv(lathe([[3.8, -0.6], [R + 0.9, -0.6], [R + 0.9, 0.55], [3.8, 0.55]], a0, arc), 6, 0.6), L(0, 0, 0), '#b8a8c8');
  // The curved wall.
  const wall = new THREE.CylinderGeometry(R, R, 3.6, 40, 1, true, a0, arc);
  wall.translate(0, 0.55 + 1.8, 0);
  kit.add('darkWood', scaleUv(wall, (R * arc) / 1.4, 3.6 / 1.4), L(0, 0, 0), '#d0b8d8');
  // Posts round the wall.
  const posts = 9;
  for (let i = 0; i <= posts; i++) {
    const a = a0 + (i / posts) * arc;
    kit.box('darkWood', 0.32, 3.7, 0.32, L(Math.sin(a) * (R + 0.08), 0.5, Math.cos(a) * (R + 0.08), 0, a, 0), '#806a88', 0.8);
  }
  kit.add('darkWood', scaleUv(lathe([[R - 0.1, 3.95], [R + 0.3, 3.95], [R + 0.3, 4.35], [R - 0.1, 4.35], [R - 0.1, 3.95]], a0, arc), 8, 1), L(0, 0, 0), '#6a5070');
  // The roof: concave, sweeping down and out, the rim turned up.
  const prof = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const rr = 3.2 + t * 8.6;
    const yy = 11.2 - Math.pow(t, 0.7) * 6.8 + Math.pow(Math.max(0, t - 0.82) / 0.18, 2) * 0.9;
    prof.push([rr, yy]);
  }
  const roof = lathe(prof, a0 - 0.12, arc + 0.24, 48);
  kit.add('shingleViolet', scaleUv(roof, 18, 6), L(0, 0, 0), '#ffffff');
  const under = lathe(prof.map(([a, b]) => [a, b - 0.22]).reverse(), a0 - 0.12, arc + 0.24, 48);
  kit.add('darkWood', scaleUv(under, 12, 4), L(0, 0, 0), '#806a88');
  // Ridge beams down the roof.
  for (let i = 0; i <= 6; i++) {
    const a = a0 - 0.05 + (i / 6) * (arc + 0.1);
    for (let k = 0; k < prof.length - 1; k += 2) {
      const [r0, y0] = prof[k];
      const [r1, y1] = prof[Math.min(prof.length - 1, k + 2)];
      kit.beam('darkWood', V(Math.sin(a) * r0, y0 + 0.12, Math.cos(a) * r0), V(Math.sin(a) * r1, y1 + 0.12, Math.cos(a) * r1), 0.26, '#705878', 0.8, M);
    }
  }
  // Stone pillars with carved rings, in front of the wall.
  const pillars = [];
  for (const a of [-0.95, -0.42, 0.42, 0.95]) {
    const px = Math.sin(a) * (R + 1.0);
    const pz = Math.cos(a) * (R + 1.0);
    kit.cyl('gateTrim', 0.5, 0.42, 4.1, L(px, 0.4, pz), '#c8b8d8', 14, 1.2);
    kit.cyl('gateTrim', 0.68, 0.68, 0.4, L(px, 0.4, pz), '#b0a0c0', 14, 1);
    kit.cyl('gateTrim', 0.62, 0.7, 0.45, L(px, 4.45, pz), '#b0a0c0', 14, 1);
    for (const yy of [1.6, 2.4, 3.2]) kit.add('rune', new THREE.TorusGeometry(0.47, 0.035, 5, 20), L(px, 0.4 + yy, pz, Math.PI / 2 + (yy - 2.4) * 0.15, 0, 0), '#9a8aff');
    pillars.push(V(px, 0, pz).applyMatrix4(M));
  }
  // The door, arched, with steps.
  kit.box('darkWood', 1.6, 2.6, 0.2, L(0, 0.55, R + 0.05), '#c0a0b0', 0.8);
  kit.add('darkWood', new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16, 1, false, -Math.PI / 2, Math.PI), L(0, 3.15, R + 0.05, -Math.PI / 2, 0, 0), '#c0a0b0');
  kit.add('darkWood', scaleUv(new THREE.TorusGeometry(0.95, 0.12, 6, 18, Math.PI), 2, 1), L(0, 3.15, R + 0.16), '#6a5070');
  for (const s of [-1, 1]) kit.box('darkWood', 0.24, 2.6, 0.3, L(s * 0.92, 0.55, R + 0.14), '#6a5070', 0.8);
  kit.box('gateStone', 2.6, 0.45, 1.0, L(0, 0.05, R + 1.4), '#b8a8c8', 1);
  kit.box('gateStone', 2.2, 0.25, 0.8, L(0, -0.1, R + 2.2), '#b8a8c8', 1);
  // Round windows.
  const windows = [];
  for (const a of [-1.25, -0.62, 0.62, 1.25]) {
    if (r() < 0.15) continue;
    const wx = Math.sin(a) * (R + 0.02);
    const wz = Math.cos(a) * (R + 0.02);
    kit.add('amber', new THREE.CircleGeometry(0.55, 20), L(wx, 2.5, wz, 0, a, 0), new THREE.Color().setScalar(0.7 + r() * 0.5));
    kit.add('darkWood', new THREE.TorusGeometry(0.6, 0.1, 6, 20), L(wx * 1.005, 2.5, wz * 1.005, 0, a, 0), '#5a4060');
    kit.box('darkWood', 1.2, 0.07, 0.07, L(wx * 1.01, 2.5, wz * 1.01, 0, a, 0), '#5a4060', 0.5);
    windows.push(V(wx * 1.1, 2.5, wz * 1.1).applyMatrix4(M));
  }
  // Two blue lanterns at the door.
  const lamps = [];
  for (const s of [-1, 1]) {
    const lx = s * 1.6;
    const lz = R + 0.9;
    kit.box('darkWood', 0.1, 0.1, 0.8, L(lx, 3.3, R + 0.5), '#5a4060', 0.5);
    kit.add('lampGlass', new THREE.IcosahedronGeometry(0.22, 1), L(lx, 2.95, lz), '#ffffff');
    lamps.push(V(lx, 2.95, lz).applyMatrix4(M));
  }
  return { door: V(0, 0, R + 2.8).applyMatrix4(M), windows, lamps, pillars, steps: V(0.8, 0.4, R + 1.4).applyMatrix4(M) };
}

/** Blue lamp posts along the path: a dark carved post, a crook, a hanging glass orb. */
export function addGloamLamps(kit, heightAt) {
  const out = [];
  for (const p of gloamLamps()) {
    const y = heightAt(p.x, p.z);
    const toward = Math.atan2(-p.x * 0.2, 1) + (p.x > 0 ? -Math.PI / 2 : Math.PI / 2);
    const M = tf(p.x, y, p.z, 0, toward, 0);
    const L = (x, yy, z, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(x, yy, z, rx, ry, rz));
    kit.cyl('gateTrim', 0.36, 0.3, 0.5, L(0, -0.1, 0), '#a898b8', 8, 0.8);
    kit.cyl('darkWood', 0.13, 0.1, 3.4, L(0, 0.35, 0), '#9a80a8', 7, 0.6);
    // The crook: a short arc out to one side.
    kit.add('darkWood', new THREE.TorusGeometry(0.42, 0.07, 6, 10, Math.PI * 0.9), L(0.42, 3.72, 0, 0, 0, 0), '#9a80a8');
    kit.box('iron', 0.03, 0.35, 0.03, L(0.84, 3.38, 0), '#ffffff');
    kit.add('lampGlass', new THREE.IcosahedronGeometry(0.2, 1), L(0.84, 3.2, 0), '#ffffff');
    kit.add('iron', new THREE.ConeGeometry(0.24, 0.16, 8, 1, true), L(0.84, 3.42, 0), '#ffffff');
    out.push(V(0.84, 3.2, 0).applyMatrix4(M));
  }
  return out;
}

/** Clumps of glowing mushrooms round the giants' feet and along the path. */
export function addMushrooms(kit, spots, heightAt, seed = 3) {
  const r = rng(seed);
  for (const [x, z, n] of spots) {
    for (let k = 0; k < n; k++) {
      const px = x + (r() - 0.5) * 2.4;
      const pz = z + (r() - 0.5) * 2.4;
      const y = heightAt(px, pz);
      const h = 0.15 + r() * 0.45;
      const cap = 0.12 + r() * 0.25;
      const lean = (r() - 0.5) * 0.4;
      kit.cyl('stem', cap * 0.25, cap * 0.18, h, tf(px, y - 0.02, pz, lean, 0, lean * 0.5), '#ffffff', 6, 0.3);
      const g = new THREE.SphereGeometry(cap, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      g.scale(1, 0.55, 1);
      const c = new THREE.Color(r() < 0.65 ? '#38e0ff' : '#ff50e8').multiplyScalar(0.7 + r() * 0.5);
      kit.add('mushroom', g, tf(px + Math.sin(lean) * h * 0.5, y + h * 0.95, pz, lean, 0, lean * 0.5), c);
    }
  }
}

/** The moonwell at the end of the path: a basin of glowing water, standing stones with runes. */
export function addMoonwell(kit, x, z, heightAt) {
  const y = heightAt(x, z);
  const M = tf(x, y, z);
  const L = (px, py, pz, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(px, py, pz, rx, ry, rz));
  kit.add('gateStone', scaleUv(lathe([[2.4, -0.3], [3.4, -0.3], [3.5, 0.65], [3.3, 0.8], [2.6, 0.8], [2.4, 0.6], [2.4, -0.3]], 0, Math.PI * 2, 40), 8, 0.8), L(0, 0, 0), '#c8b8d8');
  kit.add('moonwater', new THREE.CircleGeometry(2.5, 32), L(0, 0.5, 0, -Math.PI / 2), '#ffffff');
  const stones = [];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + 0.3;
    const sx = Math.cos(a) * 7.5;
    const sz = Math.sin(a) * 7.5;
    const h = 3.2 + (k % 3) * 0.8;
    kit.box('gateTrim', 1.1, h, 0.7, L(sx, -0.4, sz, (k % 2 ? 0.05 : -0.04), -a + Math.PI / 2, 0.03), '#b0a0c0', 1.2);
    kit.add('rune', new THREE.TorusGeometry(0.28, 0.04, 5, 16), L(sx * 0.955, h * 0.6, sz * 0.955, 0, -a - Math.PI / 2, 0), '#ffffff');
    stones.push(V(sx, h * 0.6, sz).applyMatrix4(M));
  }
  return { centre: V(x, y + 0.8, z), stones };
}

export { ROOT_HOUSES };
