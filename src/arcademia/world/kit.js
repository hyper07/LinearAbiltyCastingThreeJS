/**
 * Small building blocks for the diorama: a material cache, a seeded random,
 * shape helpers that add parts to a group, and the batcher that merges a
 * finished group's still parts into one mesh per material (so a whole
 * floor draws in a handful of calls).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cache = new Map();

/** The cel look: four flat bands of light instead of a smooth falloff. */
let ramp = null;
export function toonRamp() {
  if (ramp) return ramp;
  const data = new Uint8Array([120, 120, 120, 255, 175, 175, 175, 255, 225, 225, 225, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

/** A cartoon material: flat colour bands, an optional glow. Cached per look. */
export function toon(color, { emissive = null, ei = 0, opacity = 1, side = THREE.FrontSide, metal = 0, key = '' } = {}) {
  const id = JSON.stringify(['toon', color, emissive, ei, opacity, side, metal, key]);
  if (cache.has(id)) return cache.get(id);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), side });
  if (emissive) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = ei;
  }
  if (metal && !emissive) {
    m.emissive = new THREE.Color(color).multiplyScalar(0.18 * metal);
    m.emissiveIntensity = 1;
  }
  if (opacity < 1) {
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
  }
  m.userData.base = new THREE.Color(color);
  cache.set(id, m);
  return m;
}

/** The diorama's material: cartoon bands too (rough and metal only nudge it). Cached per look. */
export function mat(color, { rough = 0.85, metal = 0, flat = true, emissive = null, ei = 0, opacity = 1, side = THREE.FrontSide, key = '' } = {}) {
  const id = JSON.stringify([color, rough, metal, flat, emissive, ei, opacity, side, key]);
  if (cache.has(id)) return cache.get(id);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), side });
  if (metal > 0.3 && !emissive) {
    m.emissive = new THREE.Color(color).multiplyScalar(0.22);
    m.emissiveIntensity = 1;
  }
  if (emissive) {
    m.emissive = new THREE.Color(emissive);
    m.emissiveIntensity = ei;
  }
  if (opacity < 1) {
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
  }
  m.userData.base = new THREE.Color(color);
  cache.set(id, m);
  return m;
}

export function seeded(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Add a mesh to `parent` at a position/rotation/scale; returns it. */
export function add(parent, geometry, material, [x = 0, y = 0, z = 0] = [], [rx = 0, ry = 0, rz = 0] = [], scale = null) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (scale) Array.isArray(scale) ? m.scale.set(...scale) : m.scale.setScalar(scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const cone = (r, h, seg = 8) => new THREE.ConeGeometry(r, h, seg);
export const sphere = (r, w = 10, h = 7) => new THREE.SphereGeometry(r, w, h);
export const ico = (r, detail = 0) => new THREE.IcosahedronGeometry(r, detail);

/** A gable roof: a triangular prism along X, with overhang. */
export function gable(w, d, h) {
  const shape = new THREE.Shape();
  shape.moveTo(-d / 2, 0);
  shape.lineTo(0, h);
  shape.lineTo(d / 2, 0);
  shape.lineTo(-d / 2, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  g.translate(0, 0, -w / 2);
  g.rotateY(Math.PI / 2);
  return g;
}
/** Two roof slabs (thick, with eaves) for a gable of width w (along X), depth d, rise h. */
export function roofSlabs(parent, material, w, d, h, y, t = 0.18) {
  const half = d / 2 + 0.35;
  const slope = Math.atan2(h, d / 2);
  const len = Math.hypot(half, h * (half / (d / 2)));
  for (const s of [1, -1]) {
    add(parent, box(w + 0.6, t, len), material, [0, y + h / 2 + 0.05, (s * len * Math.cos(slope)) / 2], [s * slope, 0, 0]);
  }
}

/**
 * Merge the still meshes under `group` into one mesh per material, in the
 * group's own space. Meshes marked `userData.live` (they move or glow on
 * their own) and their children are left alone.
 */
export function batch(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map();
  const remove = [];
  group.traverse((o) => {
    if (o === group) return;
    let p = o;
    while (p && p !== group) {
      if (p.userData.live) return;
      p = p.parent;
    }
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const list = byMat.get(o.material) ?? [];
    list.push(g);
    byMat.set(o.material, list);
    remove.push(o);
  });
  for (const o of remove) o.parent?.remove(o);
  // Empty groups left behind are fine; live ones keep their place.
  for (const [material, list] of byMat) {
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = material.transparent !== true;
    mesh.receiveShadow = true;
    mesh.userData.batched = true;
    group.add(mesh);
    for (const g of list) g.dispose();
  }
  return group;
}

/** A canvas texture with text, for signs. */
export function signTexture(text, { w = 256, h = 80, bg = '#3b2b1f', fg = '#fff3d6', font = 'bold 44px "Nunito Variable", system-ui, sans-serif', border = '#c9a26b' } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = border;
  g.lineWidth = 6;
  g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = fg;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
