/**
 * The ruins: the Drowned Colonnade's avenue of square pillars (stacked,
 * weathered blocks, carved bands, stepped plinths and capitals; some broken
 * off, their blocks tumbled in the ferns), the Root Gate and the colonnade's
 * arch, the stair of old stone up the Stair of Roots, and the colossi —
 * stepped towers sixty metres tall standing in the Grand Fall's mist. Roots
 * coil down the stones and vines hang from every top. Stone is projected in
 * world space (no seams), bare on the faces and mossy where water sits.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../gloamreach/noise.js';
import { RUINS, PATH, pointAt } from './map.js';
import { heightAt, groundAt } from './heights.js';
import { triplanarRock } from './flora.js';
import { tubeAlong } from './plants.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** A weathered stone block (rounded edges, a little lumpy), w × h × d, its base at y = 0. */
function block(w, h, d, seed) {
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.12);
  const r = rng(seed);
  const p = g.attributes.position;
  const a = r() * 10;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n = Math.sin(x * 3.1 + a) * Math.sin(y * 2.3 + a * 0.7) * Math.sin(z * 2.9 + a * 1.3);
    const k = 1 + n * 0.03;
    p.setXYZ(i, x * k, y + h / 2, z * k);
  }
  g.computeVertexNormals();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  return g.index ? g.toNonIndexed() : g;
}

/** One pillar: plinth, shaft of blocks with a carved band, a capital — or a broken stump. */
function pillar(spec, out, roots) {
  const r = rng(spec.seed);
  const W = spec.w;
  const base = new THREE.Matrix4().compose(V(spec.x, groundAt(spec.x, spec.z) - 0.4, spec.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(spec.tilt, spec.face ?? r() * 6, spec.tilt * 0.6, 'YXZ')), V(1, 1, 1));
  let y = 0;
  const put = (g, x, yy, z, ry = 0) => {
    g.applyMatrix4(new THREE.Matrix4().compose(V(x, yy, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V(1, 1, 1)));
    g.applyMatrix4(base);
    out.push(g);
  };
  // Plinth: two steps.
  put(block(W * 1.7, 0.6, W * 1.7, spec.seed + 1), 0, y, 0);
  y += 0.6;
  put(block(W * 1.35, 0.5, W * 1.35, spec.seed + 2), 0, y, 0);
  y += 0.5;
  const top = spec.h * (spec.broken ? 1 : 0.86);
  let k = 0;
  while (y < top - 0.3) {
    const bh = Math.min(1.1 + r() * 0.5, top - y);
    const band = k === 3;
    const ww = band ? W * 1.12 : W * (0.98 + r() * 0.04);
    put(block(ww, bh - 0.04, ww, spec.seed + 10 + k), (r() - 0.5) * 0.06, y, (r() - 0.5) * 0.06, (r() - 0.5) * 0.06);
    if (band) {
      // A carved band: a ring of small proud blocks.
      for (let q = 0; q < 4; q++) {
        const a = (q / 4) * Math.PI * 2;
        put(block(W * 0.5, bh * 0.6, 0.18, spec.seed + 40 + q), Math.sin(a) * W * 0.6, y + bh * 0.2, Math.cos(a) * W * 0.6, a);
      }
    }
    y += bh;
    k++;
  }
  if (!spec.broken) {
    put(block(W * 1.3, 0.45, W * 1.3, spec.seed + 3), 0, y, 0);
    y += 0.45;
    put(block(W * 1.55, 0.6, W * 1.55, spec.seed + 4), 0, y, 0);
    y += 0.6;
  } else {
    // A jagged break and its fallen blocks.
    put(block(W * 0.7, 0.5, W * 0.5, spec.seed + 5), W * 0.15, y, 0, 0.4);
    for (let q = 0; q < 3; q++) {
      const a = r() * 6.28;
      const d = W * 1.5 + r() * 3;
      const fx = spec.x + Math.sin(a) * d;
      const fz = spec.z + Math.cos(a) * d;
      const g = block(W, 1 + r() * 0.4, W, spec.seed + 60 + q);
      g.applyMatrix4(new THREE.Matrix4().compose(V(fx, groundAt(fx, fz) - 0.35, fz), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6)), V(1, 1, 1)));
      out.push(g);
    }
  }
  // Roots coiling down from the top, into the ground.
  if (roots && r() < 0.75) {
    const n = 1 + Math.floor(r() * 3);
    for (let q = 0; q < n; q++) {
      const pts = [];
      const rad = [];
      const turns = 0.6 + r() * 0.9;
      const a0 = r() * 6.28;
      const steps = 22;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = a0 + t * turns * Math.PI * 2;
        const R = W * 0.72 + (t > 0.85 ? (t - 0.85) * 6 : 0);
        const p = V(Math.sin(a) * R, y * (1 - t) - (t > 0.9 ? (t - 0.9) * 4 : 0), Math.cos(a) * R).applyMatrix4(base);
        pts.push(p);
        rad.push(0.07 + 0.12 * t + r() * 0.02);
      }
      roots.push(tubeAlong(pts, rad, 6, { vWorld: 1.2 }));
    }
  }
  return { top: V(0, y, 0).applyMatrix4(base) };
}

/** A colossus: a stepped tower of huge blocks, tiers setting back as it rises, broken or crowned. */
function colossus(spec, out) {
  const r = rng(spec.seed * 31 + 5);
  const base = new THREE.Matrix4().compose(V(spec.x, heightAt(spec.x, spec.z) - 3, spec.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(spec.tilt, r() * 6, -spec.tilt * 0.5, 'YXZ')), V(1, 1, 1));
  let y = 0;
  let W = spec.w * 1.5;
  const H = spec.h + 3;
  const put = (g, x, yy, z, ry = 0) => {
    g.applyMatrix4(new THREE.Matrix4().compose(V(x, yy, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V(1, 1, 1)));
    g.applyMatrix4(base);
    out.push(g);
  };
  let tier = 0;
  while (y < H) {
    const th = Math.min(H - y, 5 + r() * 4);
    // Each tier: a core and corner buttresses; a cornice between tiers.
    put(block(W, th, W, spec.seed * 100 + tier), 0, y, 0, (r() - 0.5) * 0.04);
    for (let q = 0; q < 4; q++) {
      const a = (q / 4) * Math.PI * 2 + Math.PI / 4;
      if (spec.broken && y > H * 0.7 && r() < 0.5) continue;
      put(block(W * 0.28, th * 0.92, W * 0.28, spec.seed * 100 + tier * 7 + q), Math.sin(a) * W * 0.52, y, Math.cos(a) * W * 0.52, a);
    }
    y += th;
    put(block(W * 1.08, 0.7, W * 1.08, spec.seed * 100 + tier * 13), 0, y, 0);
    y += 0.7;
    W *= 0.9;
    tier++;
  }
  if (spec.broken) {
    for (let q = 0; q < 4; q++) put(block(W * (0.3 + r() * 0.3), 2 + r() * 4, W * 0.4, spec.seed * 7 + q), (r() - 0.5) * W * 0.7, y, (r() - 0.5) * W * 0.7, r() * 3);
  } else {
    put(block(W * 0.6, 3, W * 0.6, spec.seed * 9), 0, y, 0);
  }
}

/** An arch: two piers and a ring of wedge stones, its keystone proud. */
function arch(spec, out, roots) {
  const r = rng(Math.round(spec.x * 13 + spec.z));
  const y0 = Math.min(groundAt(spec.x + Math.cos(spec.face) * spec.span / 2, spec.z - Math.sin(spec.face) * spec.span / 2), groundAt(spec.x - Math.cos(spec.face) * spec.span / 2, spec.z + Math.sin(spec.face) * spec.span / 2)) - 0.5;
  const base = new THREE.Matrix4().compose(V(spec.x, y0, spec.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, spec.face, 0)), V(1, 1, 1));
  const put = (g, m) => {
    g.applyMatrix4(m);
    g.applyMatrix4(base);
    out.push(g);
  };
  const half = spec.span / 2;
  const pierH = spec.h - half;
  const D = 2.2;
  for (const s of [-1, 1]) {
    let y = 0;
    let k = 0;
    while (y < pierH) {
      const bh = Math.min(1.2, pierH - y);
      put(block(1.8, bh - 0.03, D, k * 17 + (s + 2)), new THREE.Matrix4().makeTranslation(s * (half + 0.9), y, 0));
      y += bh;
      k++;
    }
  }
  // The ring.
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI;
    const a1 = ((i + 1) / n) * Math.PI;
    const am = (a0 + a1) / 2;
    const R = half + 0.9;
    const len = R * (a1 - a0) * 0.97;
    const key = i === (n >> 1);
    const g = block(len, key ? 2.4 : 1.8, D * (key ? 1.15 : 1), 300 + i);
    g.translate(0, -0.9, 0);
    const m = new THREE.Matrix4().compose(V(-Math.cos(am) * R, pierH + Math.sin(am) * R, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, am - Math.PI / 2)), V(1, 1, 1));
    put(g, m);
  }
  // Roots draped over the top.
  for (let q = 0; q < 3; q++) {
    const pts = [];
    const rad = [];
    const z = (r() - 0.5) * D;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const a = t * Math.PI;
      const R = half + 2.0;
      const p = V(-Math.cos(a) * R * (1 + (t < 0.1 || t > 0.9 ? 0.2 : 0)), pierH + Math.sin(a) * R + 0.2, z + Math.sin(t * 9 + q) * 0.3).applyMatrix4(base);
      if (t < 0.12) p.y -= (0.12 - t) * pierH * 6;
      if (t > 0.88) p.y -= (t - 0.88) * pierH * 6;
      pts.push(p);
      rad.push(0.12 + r() * 0.1);
    }
    roots.push(tubeAlong(pts, rad, 6, { vWorld: 1.2 }));
  }
  return { base, half, pierH };
}

export async function buildRuins(world, { bank }) {
  const scene = world.scene;
  const sets = await Promise.all([bank.ambient('Rock051', { fallback: '#7a7468' }), bank.ambient('Rock063', { fallback: '#5a6a3a' })]);
  const stone = triplanarRock(sets, { splatB: world.splat.b, rain: (world.rainU ??= { value: 0 }) });
  const geos = [];
  const roots = [];
  const keep = world.keep ?? (() => true);
  world.spots.pillarTops = [];
  for (const p of RUINS.pillars) {
    if (!keep(p.x, p.z)) continue;
    const { top } = pillar(p, geos, roots);
    world.spots.pillarTops.push(top);
    world.colliders.circle(p.x, p.z, p.w * 0.85, -50, top.y + 1);
  }
  for (const c of RUINS.colossi) {
    if (!keep(c.x, c.z)) continue;
    colossus(c, geos);
    world.colliders.circle(c.x, c.z, c.w * 0.95, -50, 200);
  }
  for (const a of RUINS.arches) {
    if (!keep(a.x, a.z)) continue;
    const { half } = arch(a, geos, roots);
    for (const s of [-1, 1]) world.colliders.box(a.x + Math.cos(a.face) * s * (half + 0.9), a.z - Math.sin(a.face) * s * (half + 0.9), 0.95, 1.15, a.face, -50, 40);
  }
  // The stair: slabs of old stone up the steep stretch of the path.
  for (let s = 300; s < 392; s += 1.3) {
    const p = pointAt(PATH, s);
    const q = pointAt(PATH, s + 1.3);
    const h0 = heightAt(p.x, p.z);
    const h1 = heightAt(q.x, q.z);
    if (h1 - h0 < 0.12 || !keep(p.x, p.z)) continue;
    const g = block(4.2, 0.45, 1.5, Math.round(s * 7));
    g.applyMatrix4(new THREE.Matrix4().compose(V(p.x, h0 - 0.3, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.yaw, 0)), V(1, 1, 1)));
    geos.push(g);
  }
  if (!geos.length) {
    stone.dispose();
    return;
  }
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  const mesh = new THREE.Mesh(merged, stone);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  let rootMesh = null;
  if (roots.length) {
    const bark = bank.bark(41, ['#1a1810', '#4a4838', '#7e7a62', '#3a5a22'], { mossy: 0.7, twist: 0.04 });
    rootMesh = new THREE.Mesh(mergeGeometries(roots, false), new THREE.MeshStandardMaterial({ map: bark.map, normalMap: bark.normalMap, roughness: 0.9, color: 0xa89880 }));
    for (const g of roots) g.dispose();
    rootMesh.castShadow = true;
    rootMesh.receiveShadow = true;
    scene.add(rootMesh);
  }
  world.disposers.push(() => {
    merged.dispose();
    rootMesh?.geometry.dispose();
    stone.dispose();
  });
}
