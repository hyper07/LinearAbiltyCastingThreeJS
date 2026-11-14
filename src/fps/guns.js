import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Breachline's weapons, built from parts: receiver, rail, handguard,
 * barrel, magazine, grip, stock, sights. Each looks along −z with its butt
 * at the origin (where it meets the shoulder), and says where the hands go
 * (`userData.grip`, `userData.fore`) and where the muzzle is
 * (`userData.muzzle`). The same model is held in first person and by the
 * soldiers.
 */

const M = {
  polymer: new THREE.MeshStandardMaterial({ color: '#36383c', roughness: 0.6, metalness: 0.05 }),
  steel: new THREE.MeshStandardMaterial({ color: '#555a62', roughness: 0.38, metalness: 0.85 }),
  dark: new THREE.MeshStandardMaterial({ color: '#24262a', roughness: 0.45, metalness: 0.7 }),
  worn: new THREE.MeshStandardMaterial({ color: '#5d6168', roughness: 0.45, metalness: 0.85 }),
  tan: new THREE.MeshStandardMaterial({ color: '#8b7b5b', roughness: 0.7, metalness: 0.02 }),
  wood: new THREE.MeshStandardMaterial({ color: '#6a4127', roughness: 0.55, metalness: 0 }),
  glass: new THREE.MeshStandardMaterial({ color: '#2f5f7a', roughness: 0.05, metalness: 0.6, emissive: '#0d2633', emissiveIntensity: 0.5 }),
  dot: new THREE.MeshBasicMaterial({ color: '#ff3a2a' })
};

function parts(g) {
  const add = (mesh, x, y, z, rx = 0) => {
    mesh.position.set(x, y, z);
    mesh.rotation.x += rx;
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  return {
    box: (w, h, d, mat, x, y, z, rx = 0) => add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z, rx),
    /** A cylinder lying along z, from z0 to z1. */
    tube: (r, z0, z1, mat, x = 0, y = 0, sides = 12) => add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, Math.abs(z1 - z0), sides).rotateX(Math.PI / 2), mat), x, y, (z0 + z1) / 2)
  };
}

/** Rails with their ridges, along the top of a receiver. */
function rail(p, y, z0, z1) {
  p.box(0.024, 0.008, Math.abs(z1 - z0), M.dark, 0, y, (z0 + z1) / 2);
  for (let z = z0 - 0.01; z > z1 + 0.01; z -= 0.022) p.box(0.026, 0.006, 0.01, M.dark, 0, y + 0.006, z);
}

function rifle({ length = 1, furniture = M.polymer, scope = false, short = false } = {}) {
  const g = new THREE.Group();
  const p = parts(g);
  const k = length;
  // Stock and buffer tube.
  p.box(0.045, 0.11, 0.16, furniture, 0, -0.02, -0.08);
  p.box(0.04, 0.05, 0.1, furniture, 0, 0.035, -0.11);
  p.tube(0.017, -0.12, -0.3, M.steel, 0, 0.02);
  // Receiver, ejection port, charging handle.
  p.box(0.058, 0.07, 0.3, M.steel, 0, 0.015, -0.43);
  p.box(0.05, 0.05, 0.26, M.worn, 0, -0.04, -0.42);
  p.box(0.004, 0.022, 0.07, M.dark, 0.03, 0.02, -0.44);
  p.box(0.07, 0.012, 0.02, M.dark, 0, 0.045, -0.3);
  rail(p, 0.054, -0.3, -0.58);
  // Pistol grip and trigger guard.
  p.box(0.034, 0.11, 0.046, furniture, 0, -0.105, -0.33, -0.32);
  p.box(0.008, 0.006, 0.07, M.steel, 0, -0.08, -0.4);
  // Magazine, curved forward.
  p.box(0.032, 0.11, 0.07, M.dark, 0, -0.105, -0.47, 0.12);
  p.box(0.032, 0.09, 0.066, M.dark, 0, -0.19, -0.49, 0.32);
  // Handguard with vents, the barrel and its brake.
  const hz0 = -0.58;
  const hz1 = -0.58 - 0.32 * k * (short ? 0.7 : 1);
  p.box(0.064, 0.066, Math.abs(hz1 - hz0), furniture, 0, 0.005, (hz0 + hz1) / 2);
  for (let z = hz0 - 0.04; z > hz1 + 0.03; z -= 0.05) p.box(0.066, 0.016, 0.026, M.dark, 0, 0.005, z);
  rail(p, 0.042, hz0, hz1);
  const bz = hz1 - 0.16 * k;
  p.tube(0.011, hz1, bz, M.steel, 0, 0.005);
  p.tube(0.017, bz, bz - 0.05, M.dark, 0, 0.005, 8);
  // Sights: a red dot, or a scope.
  if (scope) {
    p.tube(0.03, -0.32, -0.62, M.dark, 0, 0.1, 16);
    p.tube(0.037, -0.6, -0.68, M.dark, 0, 0.1, 16);
    p.tube(0.034, -0.27, -0.33, M.dark, 0, 0.1, 16);
    p.tube(0.031, -0.679, -0.681, M.glass, 0, 0.1, 16);
    p.box(0.02, 0.04, 0.02, M.dark, 0, 0.07, -0.38);
    p.box(0.02, 0.04, 0.02, M.dark, 0, 0.07, -0.56);
  } else {
    p.box(0.04, 0.045, 0.07, M.dark, 0, 0.083, -0.43);
    p.box(0.003, 0.004, 0.003, M.dot, 0, 0.087, -0.47);
    p.box(0.008, 0.028, 0.01, M.dark, 0, 0.06, hz1 + 0.02);
  }
  g.userData = { grip: new THREE.Vector3(0, -0.085, -0.33), fore: new THREE.Vector3(0, -0.035, (hz0 + hz1) / 2 - 0.04), muzzle: new THREE.Vector3(0, 0.005, bz - 0.06) };
  return g;
}

function smg() {
  const g = new THREE.Group();
  const p = parts(g);
  p.box(0.02, 0.02, 0.2, M.steel, 0.018, 0, -0.1); // a folding wire stock
  p.box(0.02, 0.02, 0.2, M.steel, -0.018, 0, -0.1);
  p.box(0.05, 0.1, 0.02, M.steel, 0, -0.03, -0.005);
  p.box(0.056, 0.075, 0.28, M.polymer, 0, 0.005, -0.34);
  rail(p, 0.046, -0.22, -0.46);
  p.box(0.034, 0.1, 0.045, M.polymer, 0, -0.09, -0.27, -0.25);
  p.box(0.03, 0.2, 0.05, M.dark, 0, -0.12, -0.38);
  p.tube(0.012, -0.48, -0.58, M.steel, 0, 0.01);
  p.box(0.04, 0.04, 0.06, M.dark, 0, 0.075, -0.32);
  g.userData = { grip: new THREE.Vector3(0, -0.075, -0.27), fore: new THREE.Vector3(0, -0.06, -0.38), muzzle: new THREE.Vector3(0, 0.01, -0.6) };
  return g;
}

function shotgun() {
  const g = new THREE.Group();
  const p = parts(g);
  p.box(0.045, 0.12, 0.3, M.wood, 0, -0.03, -0.15);
  p.box(0.04, 0.05, 0.12, M.wood, 0, -0.07, -0.33, -0.4);
  p.box(0.055, 0.08, 0.24, M.steel, 0, 0.0, -0.42);
  p.tube(0.015, -0.54, -1.02, M.steel, 0, 0.02);
  p.tube(0.013, -0.54, -0.96, M.dark, 0, -0.022);
  p.box(0.058, 0.055, 0.2, M.wood, 0, -0.025, -0.72);
  for (let z = -0.64; z > -0.8; z -= 0.03) p.box(0.06, 0.006, 0.01, M.dark, 0, 0.003, z);
  p.box(0.006, 0.012, 0.006, M.worn, 0, 0.04, -1.0);
  g.userData = { grip: new THREE.Vector3(0, -0.07, -0.33), fore: new THREE.Vector3(0, -0.045, -0.72), muzzle: new THREE.Vector3(0, 0.02, -1.04) };
  return g;
}

/** A pistol, held out in both hands: it sits forward of the shoulder. */
function pistol({ big = false } = {}) {
  const g = new THREE.Group();
  const p = parts(g);
  const z = -0.42;
  const s = big ? 1.2 : 1;
  p.box(0.032 * s, 0.032 * s, 0.19 * s, M.steel, 0, 0.02, z - 0.04);
  for (let i = 0; i < 5; i++) p.box(0.034 * s, 0.022, 0.004, M.dark, 0, 0.02, z + 0.035 - i * 0.008);
  p.box(0.03 * s, 0.026, 0.15 * s, M.polymer, 0, -0.008, z - 0.02);
  p.box(0.03 * s, 0.11, 0.045, M.polymer, 0, -0.065, z + 0.03, -0.22);
  p.box(0.006, 0.01, 0.006, M.worn, 0, 0.04, z - 0.12 * s);
  p.tube(0.008, z - 0.13 * s, z - 0.15 * s, M.dark, 0, 0.02, 8);
  g.userData = { grip: new THREE.Vector3(0, -0.06, z + 0.03), fore: new THREE.Vector3(-0.012, -0.075, z + 0.01), muzzle: new THREE.Vector3(0, 0.02, z - 0.15 * s) };
  return g;
}

const MAKERS = {
  sidearm: () => pistol(),
  ram: () => pistol({ big: true }),
  wasp: smg,
  gavel: shotgun,
  vantage: () => rifle(),
  kestrel: () => rifle({ length: 0.85, furniture: M.tan, short: true }),
  longwatch: () => rifle({ length: 1.6, scope: true })
};

/** One mesh per material: a weapon of forty parts costs a handful of draws. */
function merged(g) {
  const byMat = new Map();
  for (const m of g.children) {
    m.updateMatrix();
    const geo = m.geometry.clone().applyMatrix4(m.matrix);
    // Every part the same shape of data, so they merge.
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    const flat = geo.index ? geo.toNonIndexed() : geo;
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push(flat);
  }
  const out = new THREE.Group();
  for (const [mat, list] of byMat) {
    const mesh = new THREE.Mesh(mergeGeometries(list), mat);
    mesh.castShadow = true;
    out.add(mesh);
  }
  out.userData = g.userData;
  return out;
}

/** A new model of a weapon (by its id in rules.js). */
export function gunModel(id) {
  return merged((MAKERS[id] ?? MAKERS.vantage)());
}
