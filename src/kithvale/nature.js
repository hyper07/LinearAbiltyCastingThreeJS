/**
 * The vale's wild dressing: where its trees grow (the Hushwood thick with
 * maples and pines, maples scattered over the slopes, pines climbing the
 * ridges that close it in, blossom in the village and by the shrine,
 * shrubs), rocks and outcrops (lumpy, lavender-grey, grass on their tops),
 * reeds and lily pads round the water, and the things you can gather or
 * open — berries on bushes, sunheads heavy with seeds, crystals in the
 * rock, treat caches only a Tuftlet can smell, cracked boulders only a
 * Pebbleroll can break, and the dark Hollow an Emberkit can light.
 */
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, simplex2 } from '../gloamreach/noise.js';
import { EXTENT, FOREST, MEADOW, POND, STREAM, OUTCROPS, FORAGE, CACHES, BOULDERS, HOLLOW, HABITATS, VILLAGE, SHRINE, GARDEN, pointAt } from './map.js';
import { heightAt, groundAt, slopeAt, isClear, rimAt, streamHalf, streamLevel, pondLevel } from './heights.js';
import { painterly } from './paint.js';
import { addWind } from '../gloamreach/materials.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------ where trees grow */

/** Every tree in the vale: { kind, x, z, s, seed }. `share` thins them (quality). */
export function treeList(share = 1) {
  const r = rng(4242);
  const out = [];
  const near = (x, z, d) => out.some((t) => Math.hypot(t.x - x, t.z - z) < d);
  const homes = Object.values(HABITATS).flatMap((h) => h.homes);
  const clearing = (x, z, d = 7) => homes.some(([hx, hz]) => Math.hypot(hx - x, hz - z) < d);
  let seed = 1;
  const add = (kind, x, z, s) => out.push({ kind, x, z, s, seed: seed++ });
  // The Hushwood.
  for (let z = FOREST.z - FOREST.rz * 1.2; z < FOREST.z + FOREST.rz * 1.2; z += 6.5) {
    for (let x = FOREST.x - FOREST.rx * 1.2; x < FOREST.x + FOREST.rx * 1.2; x += 6.5) {
      const px = x + (r() - 0.5) * 5;
      const pz = z + (r() - 0.5) * 5;
      const k = Math.hypot((px - FOREST.x) / FOREST.rx, (pz - FOREST.z) / FOREST.rz);
      if (k > 1.15 || r() > (1.2 - k) * 0.95 * share) continue;
      if (!isClear(px, pz, 1) || slopeAt(px, pz) > 0.8 || clearing(px, pz)) continue;
      add(r() < 0.38 ? 'pine' : 'maple', px, pz, 0.85 + r() * 0.45);
    }
  }
  // The ridges: a band of pines all round, thickest where it climbs.
  for (let z = EXTENT.z0; z < EXTENT.z1; z += 8) {
    for (let x = EXTENT.x0; x < EXTENT.x1; x += 8) {
      const px = x + (r() - 0.5) * 6;
      const pz = z + (r() - 0.5) * 6;
      const rim = rimAt(px, pz);
      if (rim < 0.12 || rim > 0.97) continue;
      if (r() > Math.min(0.85, rim * 1.5) * share) continue;
      if (!isClear(px, pz, 0) || slopeAt(px, pz) > 1.6) continue;
      add(r() < 0.8 ? 'pine' : 'maple', px, pz, 0.9 + r() * 0.5);
    }
  }
  // Maples about the vale, in loose groups (never on the meadow's heart, the road or the water).
  for (let i = 0; i < 160 * share; i++) {
    const cx = EXTENT.x0 + 20 + r() * (EXTENT.x1 - EXTENT.x0 - 40);
    const cz = EXTENT.z0 + 30 + r() * (EXTENT.z1 - EXTENT.z0 - 60);
    if (rimAt(cx, cz) > 0.1) continue;
    if (Math.hypot(cx - MEADOW.x, cz - MEADOW.z) < MEADOW.r * 0.55) continue;
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const px = cx + (r() - 0.5) * 12;
      const pz = cz + (r() - 0.5) * 12;
      if (!isClear(px, pz, 2) || slopeAt(px, pz) > 0.7 || near(px, pz, 6) || clearing(px, pz, 5)) continue;
      // Keep the view from the gate open: no trees right on the road's first stretch, nor on Gate Hill's grassy dome.
      if (Math.abs(px) < 16 && pz > -86 && pz < -40) continue;
      if (Math.hypot(px + 46, pz + 46) < 24) continue;
      add('maple', px, pz, 0.75 + r() * 0.5);
    }
  }
  // Blossom: in the village, by the shrine, by the pond.
  for (const [x, z, s] of [[-20, -96, 0.9], [21, -97, 0.85], [-22, -128, 0.95], [-40, -100, 1], [40, -98, 1], [-41, -150, 0.9], [42, -150, 1], [-19, -170, 0.85], [19, -171, 0.9], [GARDEN.x + 6, GARDEN.z - 5, 0.8], [SHRINE.x - 8, SHRINE.z + 4, 1.1], [SHRINE.x + 9, SHRINE.z + 6, 1], [SHRINE.x - 10, SHRINE.z - 6, 0.9], [POND.x - 24, POND.z + 8, 1], [POND.x + 22, POND.z - 12, 0.9], [-14, -64, 0.9]]) add('blossom', x, z, s);
  // Shrubs.
  for (let i = 0; i < 260 * share; i++) {
    const px = EXTENT.x0 + r() * (EXTENT.x1 - EXTENT.x0);
    const pz = EXTENT.z0 + r() * (EXTENT.z1 - EXTENT.z0);
    if (rimAt(px, pz) > 0.3 || !isClear(px, pz, 0.5) || slopeAt(px, pz) > 0.8) continue;
    add('bush', px, pz, 0.7 + r() * 0.7);
  }
  for (const f of FORAGE) if (f.kind === 'berry') add('bush', f.x, f.z, 1.15);
  return out;
}

/* ------------------------------------------------------------------ rocks */

/** A lumpy rock: a noise-displaced, flattened sphere, base at y = 0. Grass on top, lavender-grey sides (vertex colours). */
export function rockGeometry(seed, { flat = 0.62, rough = 0.32 } = {}) {
  const r = rng(seed);
  const n = simplex2(seed * 13 + 1);
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  const sx = 0.8 + r() * 0.5;
  const sz = 0.8 + r() * 0.5;
  for (let i = 0; i < p.count; i++) {
    const v = V(p.getX(i), p.getY(i), p.getZ(i));
    const k = 1 + n(v.x * 1.3 + 5, v.z * 1.3 + v.y) * rough + n(v.x * 3.1, v.y * 3.1 + v.z) * rough * 0.35;
    v.multiplyScalar(k);
    v.y = v.y > 0 ? v.y * flat : v.y * 0.4;
    // Facets: flatten a few planes (a painter's rock has planes, not noise).
    p.setXYZ(i, v.x * sx, v.y + 0.2, v.z * sz);
  }
  // A painter's rock: broad planes with softened edges (normals creased at about 35°).
  const ng = toCreasedNormals(g.toNonIndexed(), 0.6);
  const nn = ng.attributes.normal;
  const pp = ng.attributes.position;
  const col = new Float32Array(pp.count * 3);
  const lav = new THREE.Color('#9c96a0');
  const warm = new THREE.Color('#b8ac9c');
  const grass = new THREE.Color('#6a8a3a');
  const c = new THREE.Color();
  for (let i = 0; i < pp.count; i++) {
    const up = nn.getY(i);
    c.copy(lav).lerp(warm, Math.max(0, Math.min(1, 0.5 + n(pp.getX(i) * 2, pp.getZ(i) * 2) * 0.5)));
    c.lerp(grass, THREE.MathUtils.smoothstep(up, 0.72, 0.9) * 0.85);
    col.set([c.r, c.g, c.b], i * 3);
  }
  ng.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return ng;
}

export function rockMaterial() {
  return painterly(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), { wrap: 0.55, rim: 0.25 });
}

/** Outcrops and lone rocks, instanced from a few shapes. Returns the group. */
export function buildRocks(colliders) {
  const r = rng(91);
  const shapes = [1, 2, 3, 4, 5].map((s) => rockGeometry(s));
  const mat = rockMaterial();
  const items = [];
  for (const o of OUTCROPS) {
    for (let k = 0; k < o.n; k++) {
      const a = r() * Math.PI * 2;
      const d = k === 0 ? 0 : o.s * (0.8 + r() * 1.4);
      const x = o.x + Math.cos(a) * d;
      const z = o.z + Math.sin(a) * d;
      const s = o.s * (k === 0 ? 1 : 0.4 + r() * 0.5);
      items.push({ x, z, s, sy: 0.7 + r() * 0.8, yaw: r() * 6, shape: Math.floor(r() * shapes.length) });
    }
  }
  // Stones scattered about, and along the banks.
  for (let i = 0; i < 120; i++) {
    const x = EXTENT.x0 + r() * (EXTENT.x1 - EXTENT.x0);
    const z = EXTENT.z0 + r() * (EXTENT.z1 - EXTENT.z0);
    if (!isClear(x, z, 0) || rimAt(x, z) > 0.5) continue;
    items.push({ x, z, s: 0.3 + r() * 0.7, sy: 0.6 + r() * 0.6, yaw: r() * 6, shape: Math.floor(r() * shapes.length) });
  }
  for (let s = 6; s < STREAM.len - 6; s += 7) {
    const p = pointAt(STREAM, s);
    const side = r() < 0.5 ? -1 : 1;
    const off = streamHalf(s) + 0.6 + r() * 1.2;
    items.push({ x: p.x + Math.cos(p.yaw) * off * side, z: p.z - Math.sin(p.yaw) * off * side, s: 0.25 + r() * 0.45, sy: 0.6, yaw: r() * 6, shape: Math.floor(r() * 5) });
  }
  const group = new THREE.Group();
  shapes.forEach((geo, si) => {
    const mine = items.filter((it) => it.shape === si);
    const m = new THREE.InstancedMesh(geo, mat, mine.length);
    mine.forEach((it, i) => {
      m.setMatrixAt(i, new THREE.Matrix4().compose(V(it.x, heightAt(it.x, it.z) - 0.25 * it.s, it.z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), it.yaw), V(it.s, it.s * it.sy, it.s)));
      if (it.s > 0.7) colliders?.circle(it.x, it.z, it.s * 0.85, -1, heightAt(it.x, it.z) + it.s * it.sy * 0.9);
    });
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  });
  return { group, items };
}

/* ------------------------------------------------------------------ by the water */

/** Reeds and cattails round the pond and along the stream; lily pads on the pond. */
export function buildWaterside() {
  const r = rng(55);
  const group = new THREE.Group();
  // A reed clump: a few tall blades and two cattails.
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const h = 0.9 + r() * 0.7;
    const g = new THREE.PlaneGeometry(0.05, h, 1, 3);
    g.translate(0, h / 2, 0);
    const p = g.attributes.position;
    const lean = (r() - 0.5) * 0.5;
    for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) + lean * (p.getY(k) / h) ** 2);
    g.rotateY(r() * Math.PI);
    g.translate((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4);
    g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: p.count }, (_, k) => [0.35, 0.5, 0.22]).flat(), 3));
    parts.push(g);
  }
  for (let i = 0; i < 2; i++) {
    const g = new THREE.CylinderGeometry(0.035, 0.035, 0.24, 6);
    g.translate((r() - 0.5) * 0.3, 1.3 + r() * 0.3, (r() - 0.5) * 0.3);
    g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: g.attributes.position.count }, () => [0.42, 0.26, 0.16]).flat(), 3));
    parts.push(g);
  }
  const reed = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => {
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    return g;
  }));
  reed.setAttribute('aWind', new THREE.Float32BufferAttribute(Array.from({ length: reed.attributes.position.count }, (_, i) => [0, Math.max(0, reed.attributes.position.getY(i)) * 0.25]).flat(), 2));
  const reedMat = addWind(painterly(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 }), { wrap: 0.7, trans: 0.4 }), { flutter: 0.02 });
  const spots = [];
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const d = POND.r * (0.98 + r() * 0.3);
    spots.push([POND.x + Math.cos(a) * d, POND.z + Math.sin(a) * d]);
  }
  for (let s = 4; s < STREAM.len; s += 5) {
    if (r() < 0.45) continue;
    const p = pointAt(STREAM, s);
    const side = r() < 0.5 ? -1 : 1;
    const off = streamHalf(s) + r() * 0.8;
    spots.push([p.x + Math.cos(p.yaw) * off * side, p.z - Math.sin(p.yaw) * off * side]);
  }
  const reeds = new THREE.InstancedMesh(reed, reedMat, spots.length);
  spots.forEach(([x, z], i) => reeds.setMatrixAt(i, new THREE.Matrix4().compose(V(x, heightAt(x, z) - 0.05, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), r() * 6), V(1, 0.8 + r() * 0.5, 1).multiplyScalar(0.9 + r() * 0.4))));
  reeds.castShadow = true;
  group.add(reeds);
  // Lily pads, a notch cut from each; a few pink flowers.
  const pad = new THREE.CircleGeometry(0.38, 14, 0.25, Math.PI * 2 - 0.5);
  pad.rotateX(-Math.PI / 2);
  const padMat = painterly(new THREE.MeshStandardMaterial({ color: 0x5a8a3a, roughness: 0.5, side: THREE.DoubleSide }), { wrap: 0.5 });
  const pads = new THREE.InstancedMesh(pad, padMat, 46);
  const flowers = [];
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const d = POND.r * (0.35 + r() * 0.55);
    const x = POND.x + Math.cos(a) * d;
    const z = POND.z + Math.sin(a) * d;
    pads.setMatrixAt(i, new THREE.Matrix4().compose(V(x, pondLevel() + 0.02, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), r() * 6), V(1, 1, 1).multiplyScalar(0.7 + r() * 0.8)));
    if (r() < 0.25) flowers.push([x, z]);
  }
  pads.receiveShadow = true;
  group.add(pads);
  const fl = new THREE.ConeGeometry(0.12, 0.12, 7, 1, true);
  fl.translate(0, 0.06, 0);
  const flowerM = new THREE.InstancedMesh(fl, painterly(new THREE.MeshStandardMaterial({ color: 0xf4a8c0, emissive: 0x3a1020, roughness: 0.6, side: THREE.DoubleSide })), flowers.length);
  flowers.forEach(([x, z], i) => flowerM.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, pondLevel() + 0.03, z)));
  group.add(flowerM);
  void streamLevel;
  return group;
}

/* ------------------------------------------------------------------ what you can gather or open */

/**
 * The forage: each spot's object (berries on a bush, a sunhead's seeds, a
 * crystal cluster), instanced; `setReady(i, on)` shows or hides what can be
 * taken. Spots: { kind, x, z, y, ready, regrow }.
 */
export class Forage {
  constructor() {
    this.group = new THREE.Group();
    this.spots = FORAGE.map((f, i) => ({ ...f, i, y: groundAt(f.x, f.z), ready: true, regrow: 0 }));
    const berry = new THREE.SphereGeometry(0.07, 8, 6);
    const stem = new THREE.CylinderGeometry(0.035, 0.05, 1, 6);
    stem.translate(0, 0.5, 0);
    const head = new THREE.CylinderGeometry(0.34, 0.3, 0.1, 16);
    const seeds = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12);
    const crystal = new THREE.OctahedronGeometry(0.22, 0);
    crystal.scale(0.6, 1.6, 0.6);
    const mat = (c, o = {}) => painterly(new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o }), { rim: 0.4 });
    this.berryMesh = new THREE.InstancedMesh(berry, mat(0xd8345a, { emissive: 0x401020 }), this.count('berry') * 8);
    this.stemMesh = new THREE.InstancedMesh(stem, mat(0x5a7a30), this.count('seed'));
    this.headMesh = new THREE.InstancedMesh(head, mat(0xf2b830), this.count('seed'));
    this.seedMesh = new THREE.InstancedMesh(seeds, mat(0x5a3a1e), this.count('seed'));
    this.crystalMesh = new THREE.InstancedMesh(crystal, mat(0x8ae0f4, { emissive: 0x2a8aa8, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 }), this.count('crystal') * 5);
    for (const m of [this.berryMesh, this.stemMesh, this.headMesh, this.seedMesh, this.crystalMesh]) {
      m.castShadow = m !== this.crystalMesh;
      this.group.add(m);
    }
    const r = rng(17);
    this.slots = new Map();
    const idx = { berry: 0, seed: 0, crystal: 0 };
    for (const s of this.spots) {
      const list = [];
      if (s.kind === 'berry') {
        for (let k = 0; k < 8; k++) {
          const a = r() * Math.PI * 2;
          const d = 0.5 + r() * 0.45;
          list.push({ mesh: this.berryMesh, i: idx.berry++, m: new THREE.Matrix4().makeTranslation(s.x + Math.cos(a) * d, s.y + 0.55 + r() * 0.75, s.z + Math.sin(a) * d) });
        }
        s.top = s.y + 1.2;
      } else if (s.kind === 'seed') {
        const h = 2.2 + r() * 0.5;
        const i = idx.seed++;
        const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.0, r() * 6, 0, 'YXZ'));
        this.stemMesh.setMatrixAt(i, new THREE.Matrix4().compose(V(s.x, s.y, s.z), new THREE.Quaternion(), V(1, h, 1)));
        const hp = V(s.x, s.y + h, s.z);
        this.headMesh.setMatrixAt(i, new THREE.Matrix4().compose(hp, tilt, V(1, 1, 1)));
        list.push({ mesh: this.seedMesh, i, m: new THREE.Matrix4().compose(hp.clone().add(V(0, 0.05, 0).applyQuaternion(tilt)), tilt, V(1, 1, 1)) });
        s.top = s.y + h;
      } else {
        for (let k = 0; k < 5; k++) {
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.9, r() * 6, (r() - 0.5) * 0.9));
          const sc = 0.6 + r() * 0.8;
          list.push({ mesh: this.crystalMesh, i: idx.crystal++, m: new THREE.Matrix4().compose(V(s.x + (r() - 0.5) * 0.6, s.y + 0.15 * sc, s.z + (r() - 0.5) * 0.6), q, V(sc, sc, sc)) });
        }
        s.top = s.y + 0.6;
      }
      this.slots.set(s, list);
      this.setReady(s, true);
    }
  }

  count(kind) {
    return this.spots.filter((s) => s.kind === kind).length;
  }

  setReady(s, on) {
    s.ready = on;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const sl of this.slots.get(s)) {
      sl.mesh.setMatrixAt(sl.i, on ? sl.m : zero);
      sl.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  nearest(x, z, max = 2.6) {
    let best = null;
    let bd = max;
    for (const s of this.spots) {
      if (!s.ready) continue;
      const d = Math.hypot(s.x - x, s.z - z);
      if (d < bd) {
        best = s;
        bd = d;
      }
    }
    return best;
  }

  /** Taken spots grow back after a while. Returns the spots that did. */
  update(dt) {
    const back = [];
    for (const s of this.spots) {
      if (s.ready) continue;
      s.regrow -= dt;
      if (s.regrow <= 0) {
        this.setReady(s, true);
        back.push(s);
      }
    }
    return back;
  }

  dispose() {
    this.group.traverse((o) => o.geometry?.dispose());
  }
}

/** Cracked boulders (a Pebbleroll can break them). Each its own mesh: { id, mesh, x, z, n }. */
export function buildBoulders(colliders, done = []) {
  const group = new THREE.Group();
  const mat = rockMaterial();
  const crackMat = new THREE.MeshBasicMaterial({ color: 0x2a2228 });
  const list = BOULDERS.map((b, i) => {
    const geo = rockGeometry(40 + i, { flat: 0.85, rough: 0.22 });
    const mesh = new THREE.Mesh(geo, mat);
    const y = heightAt(b.x, b.z) - 0.2;
    mesh.position.set(b.x, y, b.z);
    mesh.scale.setScalar(1.25);
    mesh.castShadow = mesh.receiveShadow = true;
    // A jagged crack down its face, glinting crystal inside.
    const pts = [];
    let cx = 0;
    for (let k = 0; k <= 6; k++) {
      cx += (k % 2 ? 1 : -1) * 0.12;
      pts.push(V(cx, 1.15 - k * 0.17, 0.98 - Math.abs(k - 3) * 0.04));
    }
    for (let k = 0; k < 6; k++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.06, pts[k].distanceTo(pts[k + 1]) + 0.04, 0.05), crackMat);
      seg.position.copy(pts[k]).add(pts[k + 1]).multiplyScalar(0.5);
      seg.lookAt(seg.position.clone().add(V(0, 0, 1)));
      seg.rotation.z = Math.atan2(pts[k + 1].x - pts[k].x, pts[k].y - pts[k + 1].y);
      mesh.add(seg);
    }
    const glint = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshBasicMaterial({ color: 0x9af0ff }));
    glint.position.set(0, 0.7, 0.97);
    mesh.add(glint);
    group.add(mesh);
    const col = colliders?.circle(b.x, b.z, 1.2, -1, y + 2.2);
    const it = { ...b, mesh, collider: col, broken: done.includes(b.id) };
    if (it.broken) mesh.visible = false;
    return it;
  });
  return { group, list };
}

/** The Hollow: a root-arched cave mouth in the ridge, black inside until an Emberkit lights it. */
export function buildHollow() {
  const group = new THREE.Group();
  const y = heightAt(HOLLOW.x, HOLLOW.z);
  group.position.set(HOLLOW.x, y, HOLLOW.z);
  // Face it toward the vale's middle.
  group.rotation.y = Math.atan2(0 - HOLLOW.x, 60 - HOLLOW.z);
  const rockM = rockMaterial();
  const arch = rockGeometry(77, { flat: 1.1, rough: 0.25 });
  const shell = new THREE.Mesh(arch, rockM);
  shell.scale.set(4.2, 3.4, 3.6);
  shell.position.set(0, -0.4, -1.4);
  shell.castShadow = shell.receiveShadow = true;
  group.add(shell);
  const dark = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20), new THREE.MeshBasicMaterial({ color: 0x07060a }));
  dark.scale.set(1, 1.15, 1);
  dark.position.set(0, 1.35, 2.15);
  group.add(dark);
  // Roots arching over the mouth.
  const rootM = painterly(new THREE.MeshStandardMaterial({ color: 0x5a4434, roughness: 0.9 }));
  for (let k = 0; k < 4; k++) {
    const c = new THREE.CatmullRomCurve3([V(-1.8 + k * 0.2, 0, 2.3), V(-1.2 + k * 0.4, 2.9 + k * 0.1, 2.4), V(1.2 - k * 0.3, 2.8, 2.35), V(1.9 - k * 0.15, 0, 2.2)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(c, 16, 0.08 - k * 0.01, 5), rootM));
  }
  // Inside: crystals that only show when it is lit.
  const inside = new THREE.Group();
  const cm = new THREE.MeshStandardMaterial({ color: 0x9ae8ff, emissive: 0x3ab0d8, emissiveIntensity: 1.4, roughness: 0.2 });
  for (let k = 0; k < 6; k++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), cm);
    c.scale.set(0.6, 1.6, 0.6);
    c.position.set(-0.8 + k * 0.32, 0.3 + (k % 2) * 0.2, 1.6);
    c.rotation.z = (k - 2.5) * 0.15;
    inside.add(c);
  }
  inside.visible = false;
  group.add(inside);
  const light = new THREE.PointLight(0xff9a50, 0, 9, 1.8);
  light.position.set(0, 1.4, 2.4);
  group.add(light);
  return { group, dark, inside, light, mouth: V(0, 0, 3).applyMatrix4(new THREE.Matrix4().makeRotationY(group.rotation.y)).add(group.position) };
}

/** A cache's dig spot: a low mound of turned earth, shown only once a Tuftlet has sniffed it out. */
export function buildCaches(done = []) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  geo.scale(1, 0.35, 1);
  const mat = painterly(new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 1 }));
  const list = CACHES.map((c) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(c.x, heightAt(c.x, c.z) - 0.02, c.z);
    m.visible = false;
    m.receiveShadow = true;
    group.add(m);
    return { ...c, mesh: m, found: false, dug: done.includes(c.id) };
  });
  return { group, list };
}

export { VILLAGE };
