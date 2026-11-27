import * as THREE from 'three';

/**
 * The woods either side of a road over a hill (the Namsan downhill's park
 * road): pines and broadleaf trees in their November colours, on the land's
 * own slope, from just past the guard rails to twenty-odd metres back —
 * never on the road, never inside a building. Placed by a seeded random from
 * the course, so everyone in a room rides through the same wood. Four
 * instanced draws however many trees.
 *
 *   const wood = new HillWood(game, course, course.wild);   // wild: a flag per course point
 *   wood.dispose();
 */

/** A small seeded random. */
function rng(seed) {
  let h = (seed * 2654435761) >>> 0 || 1;
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

/**
 * Where the trees stand along a course's wild points: [{ x, z, h (height), pine, tone }]. Pure (the
 * tests call it): `clear(x, z)` says whether a spot is free (not road, not a building).
 */
export function woodSpots(points, wild, clear = () => true, { seed = 7, every = 2, per = 3 } = {}) {
  const r = rng(seed);
  const n = points.length;
  const out = [];
  // the course's points by 10 m square, to keep every tree off its line
  const cell = 10;
  const grid = new Map();
  points.forEach((p, i) => {
    const k = `${Math.floor(p[0] / cell)}|${Math.floor(p[1] / cell)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  });
  const offLine = (x, z) => {
    const ci = Math.floor(x / cell);
    const cj = Math.floor(z / cell);
    for (let a = ci - 1; a <= ci + 1; a++) {
      for (let b = cj - 1; b <= cj + 1; b++) {
        for (const i of grid.get(`${a}|${b}`) ?? []) if (Math.hypot(points[i][0] - x, points[i][1] - z) < (points[i][2] ?? 6) / 2 + 1.8) return false;
      }
    }
    return true;
  };
  for (let i = 0; i < n - 1; i += every) {
    if (!wild[i]) continue;
    const a = points[i];
    const b = points[i + 1];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const rx = -(b[1] - a[1]) / L;
    const rz = (b[0] - a[0]) / L;
    for (const side of [-1, 1]) {
      for (let k = 0; k < per; k++) {
        const pine = r() < 0.55;
        const h = (pine ? 8 : 6.5) + r() * 6;
        const tone = r();
        // (its crown clear of the road: past the rail by the crown's own reach and a little)
        const crown = h * (pine ? 0.24 : 0.3);
        const d = (a[2] ?? 6) / 2 + 1.6 + crown + r() * r() * 24;
        const t = (r() - 0.5) * 10;
        const x = a[0] + rx * side * d + ((b[0] - a[0]) / L) * t;
        const z = a[1] + rz * side * d + ((b[1] - a[1]) / L) * t;
        if (!offLine(x, z) || !clear(x, z)) continue;
        out.push({ x, z, h, pine, tone });
      }
    }
  }
  return out;
}

const PINE = ['#2f5a33', '#3b6a3a', '#28492c', '#466f3e'];
const BROAD = ['#b8642a', '#c98a2f', '#8a5a2a', '#a33f22', '#7e7a33', '#d1a23c'];

export class HillWood {
  constructor(game, course, wild) {
    this.g = game;
    const g = game;
    const spots = woodSpots(course.points, wild, (x, z) => !g.onRoad?.(x, z, 1.2) && !course.walls?.inside(x, z) && !g.buildingAt?.(x, z), { seed: Math.round(Math.abs(course.points[0][0])) + 7 });
    this.count = spots.length;
    this.group = new THREE.Group();
    if (!spots.length) return;
    const pines = spots.filter((s) => s.pine);
    const broad = spots.filter((s) => !s.pine);
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 1, 6).translate(0, 0.5, 0);
    const pineGeo = (() => {
      // two cones stacked: a spruce-ish pine
      const a = new THREE.ConeGeometry(0.92, 1, 12).translate(0, 0.5, 0);
      const b = new THREE.ConeGeometry(0.66, 0.8, 12).translate(0, 0.95, 0);
      const pos = [...a.toNonIndexed().attributes.position.array, ...b.toNonIndexed().attributes.position.array];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      return geo;
    })();
    const broadGeo = (() => {
      // a lumpy crown: a sphere pushed in and out by a few slow waves (no facets)
      const geo = new THREE.IcosahedronGeometry(1, 3);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const k = 0.88 + 0.1 * Math.sin(x * 4.1 + y * 2.3) * Math.cos(z * 3.7 - y * 1.9) + 0.06 * Math.sin(z * 7 + x * 5);
        p.setXYZ(i, x * k, y * k * 0.82, z * k);
      }
      geo.computeVertexNormals();
      return geo;
    })();
    const bark = new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: 0.95 });
    const leaf = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 });
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    const place = (list, geo, mat, fn, colours) => {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((s, k) => {
        const y = g.groundAt(s.x, s.z) - 0.2;
        const [pos, scale] = fn(s, y);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.tone * 6.28);
        m4.compose(pos, q, scale);
        im.setMatrixAt(k, m4);
        if (colours) im.setColorAt(k, col.set(colours[Math.floor(s.tone * colours.length) % colours.length]).multiplyScalar(0.85 + s.tone * 0.3));
      });
      im.castShadow = true;
      im.receiveShadow = true;
      this.group.add(im);
      return im;
    };
    place(spots, trunkGeo, bark, (s, y) => [new THREE.Vector3(s.x, y, s.z), new THREE.Vector3(1 + s.h / 20, s.h * (s.pine ? 0.35 : 0.45), 1 + s.h / 20)]);
    if (pines.length) place(pines, pineGeo, leaf, (s, y) => [new THREE.Vector3(s.x, y + s.h * 0.22, s.z), new THREE.Vector3(s.h * 0.24, s.h * 0.82, s.h * 0.24)], PINE);
    if (broad.length) place(broad, broadGeo, leaf.clone(), (s, y) => [new THREE.Vector3(s.x, y + s.h * 0.62, s.z), new THREE.Vector3(s.h * 0.3, s.h * 0.34, s.h * 0.3)], BROAD);
    game.scene.add(this.group);
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    this.group.removeFromParent();
  }
}
