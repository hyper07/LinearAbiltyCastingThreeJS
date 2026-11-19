/**
 * The village's furniture: the well, market stalls with cloth awnings and
 * their goods, split-rail fences, the signpost, lantern posts, flower beds,
 * benches, the overlook's ruined balustrade — the kit's pieces — plus
 * photographed props from the library (Poly Haven, CC0) instanced: barrels,
 * crates, buckets, baskets, lanterns, benches, mossy rocks and cliff faces.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tf } from './kit.js';
import { rng } from './noise.js';
import { WELL, STALLS, SIGNPOST, FENCES, LANTERNS, FLOWER_BEDS, OVERLOOK, toWorld } from './map.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------ library props */

/**
 * Photographed props, each loaded once and drawn instanced: `place(id, matrices)`.
 * Missing files are skipped (the map still reads without them).
 */
export class PropLibrary {
  constructor(base = './library/polyhaven/') {
    this.base = base;
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.group = new THREE.Group();
    this.fields = [];
    this._frame = 0;
    this._frustum = new THREE.Frustum();
    this._pm = new THREE.Matrix4();
    this._sphere = new THREE.Sphere();
  }

  /**
   * A model as variants: `split` makes each mesh in the file its own variant
   * (a set of rocks, a bed of ferns), each sat on its own base; otherwise the
   * whole file is one variant. Each variant is a list of parts by material.
   */
  load(id, split = false) {
    const key = `${id}|${split}`;
    if (!this.cache.has(key)) {
      this.cache.set(
        key,
        this.loader
          .loadAsync(`${this.base}${id}/${id}_1k.gltf`)
          .then((g) => {
            g.scene.updateMatrixWorld(true);
            const groups = [];
            const one = [];
            g.scene.traverse((o) => {
              if (!o.isMesh) return;
              const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
              for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
              if (split) groups.push([{ geo, material: o.material }]);
              else one.push({ geo, material: o.material });
            });
            if (!split) groups.push(one);
            return groups.map((list) => {
              const byMat = new Map();
              for (const { geo, material } of list) {
                if (!byMat.has(material.uuid)) byMat.set(material.uuid, { material, geos: [] });
                byMat.get(material.uuid).geos.push(geo);
              }
              const parts = [...byMat.values()].map(({ material, geos }) => ({ geo: geos.length > 1 ? mergeGeometries(geos, false) : geos[0], material }));
              const box = new THREE.Box3();
              for (const pt of parts) {
                pt.geo.computeBoundingBox();
                box.union(pt.geo.boundingBox);
              }
              if (split) {
                // Sit each piece on its own origin.
                const c = box.getCenter(new THREE.Vector3());
                for (const pt of parts) pt.geo.translate(-c.x, -box.min.y, -c.z);
                box.translate(new THREE.Vector3(-c.x, -box.min.y, -c.z));
              }
              return { parts, box };
            });
          })
          .catch(() => null)
      );
    }
    return this.cache.get(key);
  }

  /** Draw `id` at each matrix, never culled (for a handful of things). */
  async place(id, matrices, opts = {}) {
    return this.scatter(id, matrices, { ...opts, dist: Infinity });
  }

  /**
   * Draw `id` at each matrix, instanced; only the instances within `dist`
   * (and in view, or close enough to cast a shadow into it) are drawn.
   */
  async scatter(id, matrices, { split = false, dist = 140, shadows = true, tint = null, onMaterial = null } = {}) {
    const variants = await this.load(id, split);
    if (!variants || !matrices.length) return null;
    const field = { dist, sets: [], always: !Number.isFinite(dist) };
    variants.forEach((v, vi) => {
      const mine = matrices.filter((_, i) => i % variants.length === vi);
      if (!mine.length) return;
      const radius = v.box.getBoundingSphere(new THREE.Sphere()).radius;
      const items = mine.map((m) => {
        const p = new THREE.Vector3().setFromMatrixPosition(m);
        const sc = Math.cbrt(Math.abs(m.determinant()));
        return { m, p, r: radius * sc };
      });
      const meshes = v.parts.map((pt) => {
        let material = pt.material;
        if (tint || onMaterial) {
          material = material.clone();
          if (tint) material.color.multiply(tint);
          onMaterial?.(material);
        }
        const inst = new THREE.InstancedMesh(pt.geo, material, items.length);
        inst.castShadow = shadows;
        inst.receiveShadow = true;
        inst.frustumCulled = false;
        if (field.always) {
          items.forEach((it, i) => inst.setMatrixAt(i, it.m));
          inst.count = items.length;
        } else inst.count = 0;
        this.group.add(inst);
        return inst;
      });
      field.sets.push({ items, meshes });
    });
    this.fields.push(field);
    return field;
  }

  /** Re-pick the drawn instances for this camera (every few frames). */
  update(camera, focus) {
    if (this._frame++ % 5) return;
    this._pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._pm);
    for (const f of this.fields) {
      if (f.always) continue;
      for (const set of f.sets) {
        let n = 0;
        for (const it of set.items) {
          const d = it.p.distanceTo(camera.position);
          if (d > f.dist + it.r) continue;
          this._sphere.center.copy(it.p);
          this._sphere.radius = it.r * 1.2;
          if (!this._frustum.intersectsSphere(this._sphere) && it.p.distanceTo(focus) > 30) continue;
          for (const m of set.meshes) m.setMatrixAt(n, it.m);
          n++;
        }
        for (const m of set.meshes) {
          m.count = n;
          m.instanceMatrix.needsUpdate = true;
        }
      }
    }
  }

  dispose() {
    for (const p of this.cache.values()) p.then((vs) => vs?.forEach((v) => v.parts.forEach((x) => x.geo.dispose())));
  }
}

/* ------------------------------------------------------------------ kit-built furniture */

export function addWell(kit, y) {
  const M = tf(WELL.x, y, WELL.z);
  const L = (x, yy, z, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(x, yy, z, rx, ry, rz));
  // A stone ring: a short thick tube of blocks.
  const ring = new THREE.LatheGeometry([V(1.15, -0.3, 0), V(1.55, -0.3, 0), V(1.55, 0.9, 0), V(1.62, 0.92, 0), V(1.62, 1.08, 0), V(1.08, 1.08, 0), V(1.08, 0.92, 0), V(1.15, 0.9, 0), V(1.15, -0.3, 0)], 28);
  const uv = ring.attributes.uv;
  const pos = ring.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9.6 / 0.9, (pos.getY(i) + 0.3) / 0.9);
  kit.add('wellStone', ring, L(0, 0, 0), '#ffffff');
  // Water inside, dark.
  kit.add('water', new THREE.CircleGeometry(1.12, 24), L(0, 0.35, 0, -Math.PI / 2), '#ffffff');
  // Two posts, a beam, a little roof, a crank and a rope.
  const t = '#5a3a22';
  for (const s of [-1, 1]) kit.box('timber', 0.22, 2.6, 0.22, L(s * 1.35, 0.9, 0), t, 0.7);
  kit.cyl('timber', 0.09, 0.09, 3.0, L(-1.5, 2.9, 0, 0, 0, -Math.PI / 2), t, 8, 0.6);
  kit.slab('roofShingle', 3.4, 1.35, 0.12, 0.7, L(0, 4.0, 0), '#ffffff', 1.2, { sag: 0.04, curl: 0.06, under: 'under' });
  kit.slab('roofShingle', 3.4, 1.35, 0.12, 0.7, L(0, 4.0, 0, 0, Math.PI, 0), '#ffffff', 1.2, { sag: 0.04, curl: 0.06, under: 'under' });
  for (const s of [-1, 1]) kit.gable('planks', 1.6, 0.68, 0.08, L(s * 1.38, 3.42, 0, 0, Math.PI / 2, 0), '#ffffff', 1);
  kit.box('iron', 0.06, 0.4, 0.06, L(1.62, 2.9, 0, 0, 0, 0), '#ffffff');
  kit.cyl('rope', 0.02, 0.02, 1.7, L(0, 1.2, 0), '#ffffff', 5, 0.3);
  return { bucket: V(WELL.x, y + 1.2, WELL.z), rim: y + 1.08 };
}

/** A market stall: posts, a counter, a sagging striped awning, goods. */
export function addStall(kit, st, y, r) {
  const M = tf(st.x, y, st.z, 0, st.face, 0);
  const L = (x, yy, z, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(x, yy, z, rx, ry, rz));
  const t = '#6a4a30';
  const W = 3.4;
  const D = 2.0;
  for (const [x, z, h] of [[-W / 2, D / 2, 2.4], [W / 2, D / 2, 2.4], [-W / 2, -D / 2, 2.9], [W / 2, -D / 2, 2.9]]) kit.box('timber', 0.14, h, 0.14, L(x, 0, z), t, 0.6);
  kit.box('planks', W, 0.12, 0.9, L(0, 0.95, D / 2 - 0.35), '#c0a890', 0.8);
  kit.box('planks', W, 0.95, 0.06, L(0, 0, D / 2 - 0.02), '#a08870', 0.8);
  kit.box('planks', W - 0.2, 0.06, D - 0.2, L(0, 0.3, 0), '#a08870', 0.8);
  // The awning: a sagging sheet with a scalloped front edge.
  const aw = new THREE.PlaneGeometry(W + 0.6, D + 0.8, 12, 6);
  const p = aw.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const v = p.getY(i) / (D + 0.8) + 0.5; // 0 front … 1 back
    const sag = Math.sin(((x / (W + 0.6)) + 0.5) * Math.PI) * 0.12 * Math.sin(v * Math.PI);
    p.setXYZ(i, x, 2.45 + v * 0.55 - sag, (0.5 - v) * (D + 0.8));
  }
  aw.computeVertexNormals();
  kit.add(`cloth_${st.cloth}`, aw, L(0, 0, 0), '#ffffff');
  // Scallops.
  for (let k = 0; k < 7; k++) {
    const sc = new THREE.CircleGeometry(0.28, 10, 0, Math.PI);
    sc.rotateZ(Math.PI);
    kit.add(`cloth_${st.cloth}`, sc, L(-W / 2 - 0.3 + 0.28 + k * ((W + 0.6 - 0.56) / 6), 2.45, (D + 0.8) / 2), '#ffffff');
  }
  // Goods on the counter.
  const goods = st.goods;
  for (let k = 0; k < 3; k++) kit.box('planks', 0.8, 0.22, 0.5, L(-1.1 + k * 1.1, 1.07, D / 2 - 0.35), '#8a6a4a', 0.6);
  for (let k = 0; k < 42; k++) {
    const bx = -1.1 + (k % 3) * 1.1 + (r() - 0.5) * 0.6;
    const bz = D / 2 - 0.35 + (r() - 0.5) * 0.35;
    if (goods === 'apples') {
      const c = new THREE.Color(r() < 0.75 ? '#b01818' : '#8aa020').multiplyScalar(0.8 + r() * 0.35);
      kit.add('fruit', new THREE.SphereGeometry(0.075, 8, 6), L(bx, 1.33 + r() * 0.08, bz), c);
    } else if (goods === 'pumpkins' && k < 14) {
      const g = new THREE.SphereGeometry(0.2 + r() * 0.08, 12, 8);
      g.scale(1, 0.7, 1);
      kit.add('fruit', g, L(bx, 1.35, bz), new THREE.Color('#d8701a').multiplyScalar(0.85 + r() * 0.3));
    } else if (goods === 'cloth' && k < 12) {
      const g = new THREE.CylinderGeometry(0.11, 0.11, 0.7, 10);
      kit.add('fruit', g, L(bx, 1.4, bz, 0, 0, Math.PI / 2), new THREE.Color(['#7a2a6a', '#2a5a7a', '#c8a040', '#3a6a3a'][k % 4]));
    }
  }
  return { keeper: V(0, 0, -0.3).applyMatrix4(M), front: V(0, 0, D / 2 + 1.2).applyMatrix4(M) };
}

/** Split-rail fences along the map's polylines, posts leaning a little. */
export function addFences(kit, heightAt, r) {
  const t = '#7a6248';
  for (const line of FENCES) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i];
      const [bx, bz] = line[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 2.6));
      let prev = null;
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n;
        const z = az + ((bz - az) * k) / n;
        const y = heightAt(x, z);
        const lean = (r() - 0.5) * 0.08;
        kit.box('fenceWood', 0.16, 1.25, 0.16, tf(x, y - 0.2, z, lean, r(), lean), t, 0.5);
        const top = V(x, y + 0.95, z);
        const mid = V(x, y + 0.5, z);
        if (prev) {
          kit.beam('fenceWood', prev[0], top.clone().add(V(0, (r() - 0.5) * 0.06, 0)), 0.1, t, 0.6);
          kit.beam('fenceWood', prev[1], mid, 0.09, t, 0.6);
        }
        prev = [top, mid];
      }
    }
  }
}

/** The signpost by the square's north edge. */
export function addSignpost(kit, bank, heightAt) {
  const y = heightAt(SIGNPOST.x, SIGNPOST.z);
  const M = tf(SIGNPOST.x, y, SIGNPOST.z, 0, SIGNPOST.face, 0);
  const L = (x, yy, z, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(x, yy, z, rx, ry, rz));
  kit.box('timber', 0.2, 3.3, 0.2, L(0, -0.2, 0), '#6a4a30', 0.6);
  kit.add('timber', new THREE.ConeGeometry(0.18, 0.3, 4), L(0, 3.25, 0, 0, Math.PI / 4, 0), '#5a3a22');
  const boards = [
    { text: 'The Gloamwood', sub: "by the Warden's Gate", ang: 0, y: 2.6 },
    { text: 'Cinder Rift', sub: 'overlook', ang: -Math.PI / 2 - 0.2, y: 2.15 },
    { text: 'Brindlewick', sub: 'the square', ang: Math.PI, y: 1.7 }
  ];
  const meshes = [];
  for (const b of boards) {
    const tex = bank.sign({ text: b.text, sub: b.sub, emblem: null, w: 512, h: 128, wood: '#6a4a2a', ink: '#f4e2b0' });
    const geo = new THREE.BoxGeometry(1.5, 0.36, 0.06);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
    const side = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, [side, side, side, side, mat, mat]);
    const m = L(0, b.y, 0, 0, b.ang - Math.PI / 2, 0).multiply(tf(0.78, 0, 0));
    mesh.applyMatrix4(m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    meshes.push(mesh);
  }
  return meshes;
}

/** Lantern posts: a post, an arm; the library's lantern hangs from it. Returns where each lantern hangs. */
export function addLanternPosts(kit, heightAt) {
  const out = [];
  for (const [x, z] of LANTERNS) {
    const y = heightAt(x, z);
    // Arm points toward the nearest road (roughly: toward the origin of the square).
    const ang = Math.atan2(-x, -z) + 0.4;
    const M = tf(x, y, z, 0, ang, 0);
    const L = (px, py, pz, rx = 0, ry = 0, rz = 0) => M.clone().multiply(tf(px, py, pz, rx, ry, rz));
    kit.box('timber', 0.22, 3.1, 0.22, L(0, -0.3, 0), '#5a3a22', 0.6);
    kit.box('timber', 0.14, 0.14, 0.9, L(0, 2.75, 0.38), '#5a3a22', 0.6);
    kit.beam('timber', V(0, 2.2, 0.08), V(0, 2.75, 0.6), 0.1, '#5a3a22', 0.6, M);
    kit.box('stone', 0.5, 0.35, 0.5, L(0, -0.2, 0), '#c8c0b0', 0.8);
    out.push({ pos: V(0, 2.4, 0.72).applyMatrix4(M), ang });
  }
  return out;
}

/** Benches (from the kit), round the square. */
export function addBenches(kit, heightAt) {
  const spots = [[-9, 11, 0.6], [9, -14, -2.4], [-14, -6, 1.9], [4, 15, 3.0]];
  const out = [];
  for (const [x, z, a] of spots) {
    const y = heightAt(x, z);
    const M = tf(x, y, z, 0, a, 0);
    const L = (px, py, pz) => M.clone().multiply(tf(px, py, pz));
    kit.box('planks', 1.9, 0.08, 0.45, L(0, 0.45, 0), '#a08060', 0.6);
    kit.box('planks', 1.9, 0.35, 0.06, L(0, 0.55, -0.22), '#a08060', 0.6);
    for (const s of [-0.8, 0.8]) kit.box('timber', 0.1, 0.45, 0.42, L(s, 0, 0), '#5a3a22', 0.5);
    out.push({ x, z, y, face: a, seat: V(0, 0.48, 0.05).applyMatrix4(M) });
  }
  return out;
}

/** The overlook: a ruined stone balustrade along the cliff, a broken column, a bench. */
export function addOverlook(kit, heightAt, r) {
  const out = [];
  for (let k = -7; k <= 7; k++) {
    if (Math.abs(k) === 2 || k === 5) continue; // gaps where it has fallen
    const z = k * 1.2;
    const x = OVERLOOK.x + 4.2 + Math.abs(k) * 0.08;
    const y = heightAt(x, z);
    kit.box('wellStone', 0.5, 0.95, 1.1, tf(x, y - 0.2, z, 0, (r() - 0.5) * 0.06, (r() - 0.5) * 0.05), '#ffffff', 1);
    kit.box('wellStone', 0.65, 0.18, 1.25, tf(x, y + 0.75, z), '#e8e0d8', 1);
    out.push([x, z]);
  }
  const [cx, cz] = toWorld(OVERLOOK, 3, 3.2);
  const y = heightAt(cx, cz);
  kit.cyl('wellStone', 0.45, 0.42, 2.6, tf(cx, y - 0.2, cz), '#ffffff', 14, 1);
  kit.box('wellStone', 1.1, 0.35, 1.1, tf(cx, y - 0.3, cz), '#ffffff', 1);
  kit.cyl('wellStone', 0.42, 0.4, 1.0, tf(cx + 1.2, y + 0.2, cz + 0.6, 0.2, 0, 1.45), '#ffffff', 14, 1);
  return out;
}

/** Flower beds: a ring of stones and soil (the flowers themselves are foliage). */
export function addFlowerBeds(kit, heightAt, r) {
  for (const [x, z, rad] of FLOWER_BEDS) {
    if (rad > 4) continue; // the meadow drifts have no border
    const n = Math.round(rad * 6);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const px = x + Math.cos(a) * rad;
      const pz = z + Math.sin(a) * rad;
      const g = new THREE.DodecahedronGeometry(0.22 + r() * 0.1, 0);
      g.scale(1.2, 0.6, 1);
      kit.add('wellStone', g, tf(px, heightAt(px, pz) + 0.02, pz, r(), r() * 3, 0), new THREE.Color().setScalar(0.75 + r() * 0.25));
    }
    const soil = new THREE.CircleGeometry(rad, 20);
    soil.rotateX(-Math.PI / 2);
    kit.add('soil', soil, tf(x, heightAt(x, z) + 0.04, z), '#ffffff');
  }
}

export { STALLS, rng };
