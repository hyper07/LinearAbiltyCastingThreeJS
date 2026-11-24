/**
 * The Great Tree in 3D: a giant ridged trunk on flaring roots, a ring of
 * wooden decks round it for every floor (on boughs, with railings, lanterns
 * and glowing vines hanging below), plank bridges and sagging rope bridges
 * from deck to deck all the way round, a spiral stair winding up the trunk
 * with a gate at the foot of every flight, a leafy crown on top, and a
 * meadow far below with a pond and other giant trees in the distance.
 *
 * What you walk on (decks, bridges, steps) is kept apart in `walk`, so
 * clicks can find it; each ring's parts are grouped so a locked ring can be
 * greyed. The glow (vines, bulbs, shelf fungus) brightens at night.
 */
import * as THREE from 'three';
import { add, batch, box, cone, cyl, ico, mat, seeded, sphere, toonRamp } from '../kit.js';
import { lampMat } from '../buildings.js';
import { buildGate } from '../structures.js';
import { TREE } from './plan.js';

const BARK = new THREE.Color('#7b5236');
const BARK_DARK = new THREE.Color('#5a3a26');
const MOSS = new THREE.Color('#6fae5c');

/** The glow of vines and fungus: soft by day, bright at night (setNight). */
const glowMat = new THREE.MeshToonMaterial({ color: '#8ff7e0', gradientMap: toonRamp(), emissive: new THREE.Color('#3fe6c8'), emissiveIntensity: 0.25 });
const glowPink = new THREE.MeshToonMaterial({ color: '#ffc2ec', gradientMap: toonRamp(), emissive: new THREE.Color('#ff7ad9'), emissiveIntensity: 0.25 });

const polar = (r, a) => [r * Math.sin(a), r * Math.cos(a)];

/** A tube along a curve that tapers from r0 to r1 (a branch, a root). */
function limb(points, r0, r1, { radial = 8, segs = 14 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points);
  const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = g.attributes.position;
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, c);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** The trunk's radius at a height (before the bark's ridges). */
function trunkRadius(y) {
  const base = TREE.trunkR;
  if (y < 0) return base + 15 * ((-y) / -TREE.ground) ** 2.2;
  if (y < 76) return base - y * 0.006;
  return Math.max(3.5, base - 0.45 - (y - 76) * 0.28);
}

/** The trunk: a tall ridged column, bark-coloured, mossy at the foot. */
function trunk() {
  const H = 128, y0 = TREE.ground - 1;
  const g = new THREE.CylinderGeometry(1, 1, H, 56, 64, true);
  g.translate(0, H / 2 + y0, 0);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(x, z);
    // Ridges wander a little as they climb.
    const wav = a * 13 + Math.sin(y * 0.05 + a * 2) * 1.4;
    const ridge = Math.pow(0.5 + 0.5 * Math.sin(wav), 3);
    const r = trunkRadius(y) + ridge * 0.45 - 0.2;
    pos.setXYZ(i, Math.sin(a) * r, y, Math.cos(a) * r);
    tmp.copy(BARK_DARK).lerp(BARK, ridge * 0.8 + 0.2);
    const moss = Math.max(0, 1 - (y - TREE.ground) / 10) * 0.8 + Math.max(0, Math.sin(a * 3 + y * 0.09) - 0.75) * 1.6 * (1 - ridge);
    tmp.lerp(MOSS, Math.min(0.85, moss));
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }));
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = 'trunk';
  return m;
}

/** The meadow below: grass, a pond, roots, other giant trees far off, hills. */
function meadow(group) {
  const r = seeded(91);
  const y = TREE.ground;
  const grass = new THREE.Mesh(new THREE.CircleGeometry(520, 64), mat('#8fd683', { rough: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = y;
  grass.receiveShadow = true;
  group.add(grass);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshToonMaterial({ color: '#6fc6e6', gradientMap: toonRamp(), transparent: true, opacity: 0.9 }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(52, y + 0.05, 30);
  pond.scale.set(1.4, 1, 1);
  group.add(pond);
  const still = new THREE.Group();
  const rock = mat('#a8a39a', { rough: 1 });
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2;
    add(still, ico(0.8 + r() * 1.2), rock, [52 + Math.cos(a) * 22, y + 0.2, 30 + Math.sin(a) * 16], [r(), r(), r()], [1.3, 0.7, 1]);
  }
  // Great roots, arching out of the trunk into the ground.
  const bark = mat('#704a30', { rough: 0.95 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + r() * 0.3;
    const far = 38 + r() * 14;
    const pts = [[TREE.trunkR + 4, -2 - r() * 2], [TREE.trunkR + 12, -4 - r() * 2], [far * 0.75, y + 2.5], [far, y - 1]].map(([d, h]) => new THREE.Vector3(Math.sin(a) * d, h, Math.cos(a) * d));
    add(still, limb(pts, 4.2, 0.9, { radial: 9, segs: 16 }), bark);
  }
  // Mushrooms and ferns round the roots.
  const cap = mat('#ff7a8a'), stem = mat('#fff1dc'), fern = mat('#4fae5a');
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2, d = 30 + r() * 40;
    const [x, z] = polar(d, a);
    if (r() < 0.5) {
      add(still, cyl(0.25, 0.3, 1.1, 6), stem, [x, y + 0.55, z]);
      add(still, new THREE.SphereGeometry(0.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cap, [x, y + 1.05, z], [0, 0, 0], [1, 0.6, 1]);
    } else for (let k = 0; k < 5; k++) add(still, cone(0.35, 2.2, 4), fern, [x, y + 0.9, z], [Math.cos(k * 1.3) * 0.7, 0, Math.sin(k * 1.3) * 0.7]);
  }
  group.add(batch(still));
  // Giant trees far away, and soft hills.
  const far = new THREE.Group();
  const leafFar = [mat('#5fae6a'), mat('#6cbf78'), mat('#4f9e62')];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r() * 0.2;
    const d = 240 + r() * 110;
    const [x, z] = polar(d, a);
    const s = 0.6 + r() * 0.7;
    add(far, cyl(4 * s, 7 * s, 90 * s, 8), bark, [x, y + 45 * s, z]);
    for (let k = 0; k < 4; k++) add(far, ico(22 * s, 1), leafFar[(i + k) % 3], [x + (r() - 0.5) * 30 * s, y + (82 + k * 9) * s, z + (r() - 0.5) * 30 * s], [0, 0, 0], [1, 0.65, 1]);
  }
  const hill = [mat('#86cc7c'), mat('#7cc274')];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2;
    const [x, z] = polar(400 + r() * 60, a);
    add(far, new THREE.SphereGeometry(90 + r() * 50, 16, 8), hill[i % 2], [x, y - 40, z], [0, 0, 0], [1.4, 0.55, 1]);
  }
  for (const m of far.children) m.castShadow = false;
  group.add(batch(far));
}

/** A ring's colours, from the floor's look. */
function palette(look) {
  return {
    deck: mat('#c08e5c', { rough: 0.9 }),
    deckDark: mat('#a7774a', { rough: 0.9 }),
    beam: mat('#7a5236', { rough: 0.9 }),
    post: mat('#6a4630', { rough: 0.9 }),
    rope: mat('#e2cc9c', { rough: 1 }),
    bark: mat('#74492f', { rough: 0.95 }),
    moss: mat(look.grass, { rough: 1 }),
    leaf: mat(look.leaf, { rough: 0.9 }),
    leafDark: mat(new THREE.Color(look.leaf).multiplyScalar(0.8).getStyle(), { rough: 0.9 }),
    banner: mat(look.banner, { rough: 0.9 }),
    flowers: look.flowers.map((c) => mat(c))
  };
}

/** The angles (radians, round a deck's centre) where bridges meet its rim. */
function mouths(f, id) {
  const p = f.pads[id];
  const out = [];
  for (const L of f.links) {
    if (L.from !== id && L.to !== id) continue;
    const s = L.from === id ? 1 : -1;
    out.push({ a: Math.atan2(L.dx * s, L.dz * s), half: Math.asin(Math.min(1, (L.width / 2 + 0.45) / p.pr)) });
  }
  return out;
}

/** A round deck: wedge planks, a rim beam, a bracket underneath, railings with gaps for the bridges. */
function deck(walk, deco, P, f, p) {
  const N = Math.max(14, Math.round(p.pr * 3.4));
  for (let i = 0; i < N; i++) {
    const g = new THREE.CylinderGeometry(p.pr, p.pr, 0.42, 2, 1, false, (i / N) * Math.PI * 2, (Math.PI * 2) / N);
    add(walk, g, i % 2 ? P.deck : P.deckDark, [p.x, f.y - 0.21, p.z]);
  }
  add(deco, new THREE.TorusGeometry(p.pr, 0.16, 5, Math.max(20, N * 2)), P.beam, [p.x, f.y - 0.24, p.z], [Math.PI / 2, 0, 0]);
  add(deco, cone(p.pr * 0.72, 2.6, 12), P.beam, [p.x, f.y - 1.7, p.z], [Math.PI, 0, 0]);
  // Moss and flowers peeking over the rim.
  const r = seeded(Math.round(p.x * 7 + p.z * 13 + f.n));
  const gaps = mouths(f, p.id);
  const inGap = (a) => gaps.some((m) => Math.abs(Math.atan2(Math.sin(a - m.a), Math.cos(a - m.a))) < m.half);
  // Railing: posts round the rim and a rope between them, broken where bridges land.
  const R = p.pr - 0.18;
  const n = Math.max(10, Math.round((Math.PI * 2 * R) / 1.8));
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (inGap(a)) {
      prev = null;
      continue;
    }
    const [x, z] = polar(R, a);
    if (i < n) {
      add(deco, cyl(0.09, 0.11, 1.05, 5), P.post, [p.x + x, f.y + 0.5, p.z + z]);
      add(deco, sphere(0.12, 6, 4), P.post, [p.x + x, f.y + 1.06, p.z + z]);
    }
    if (prev) {
      const mx = (prev[0] + x) / 2, mz = (prev[1] + z) / 2, len = Math.hypot(x - prev[0], z - prev[1]);
      const rope = add(deco, cyl(0.045, 0.045, len, 4), P.rope, [p.x + mx, f.y + 0.92, p.z + mz]);
      rope.rotation.set(0, Math.atan2(x - prev[0], z - prev[1]), 0);
      rope.rotateX(Math.PI / 2);
    }
    prev = [x, z];
    if (r() < 0.35 && !inGap(a + 0.1)) add(deco, ico(0.18 + r() * 0.1), r() < 0.5 ? P.leaf : P.flowers[Math.floor(r() * P.flowers.length)], [p.x + Math.sin(a + 0.1) * (R - 0.35), f.y + 0.12, p.z + Math.cos(a + 0.1) * (R - 0.35)]);
  }
  // Glowing vines and bulbs hanging below the rim.
  const vines = Math.round(p.pr * 0.9);
  for (let i = 0; i < vines; i++) {
    const a = r() * Math.PI * 2;
    const len = 2.5 + r() * 4.5;
    const [x, z] = polar(p.pr * (0.75 + r() * 0.2), a);
    add(deco, cyl(0.05, 0.05, len, 4), P.leafDark, [p.x + x, f.y - 0.4 - len / 2, p.z + z]);
    add(deco, sphere(0.22, 7, 5), i % 3 ? glowMat : glowPink, [p.x + x, f.y - 0.45 - len, p.z + z]);
  }
}

/** Two lanterns on posts at a deck's outer side. */
function lanterns(deco, P, f, p, spread = 0.55) {
  const out = Math.atan2(p.x, p.z);
  for (const s of [-1, 1]) {
    const a = out + s * spread;
    const [x, z] = polar(p.pr - 0.6, a);
    const g = new THREE.Group();
    g.position.set(p.x + x, f.y, p.z + z);
    add(g, cyl(0.07, 0.09, 1.9, 6), P.post, [0, 0.95, 0]);
    add(g, box(0.5, 0.06, 0.06), P.post, [0, 1.85, 0]);
    add(g, box(0.24, 0.3, 0.24), lampMat, [0, 1.58, 0]);
    add(g, cone(0.22, 0.2, 4), P.beam, [0, 1.84, 0], [0, Math.PI / 4, 0]);
    deco.add(g);
  }
}

/** A bridge between two decks: level planks with rails, or a sagging rope bridge. */
function bridge(walk, deco, P, f, L) {
  const yaw = Math.atan2(L.dx, L.dz);
  const span = L.a1 - L.a0;
  const at = (s, side = 0) => {
    const d = L.a0 + s * span;
    return [L.ax + L.dx * d + L.dz * side, L.az + L.dz * d - L.dx * side];
  };
  const sagAt = (s) => -L.sag * Math.sin(Math.PI * Math.max(0, Math.min(1, s)));
  const W = L.width;
  if (L.type === 'plank') {
    const n = Math.max(4, Math.round(span / 0.46));
    for (let i = 0; i < n; i++) {
      const [x, z] = at((i + 0.5) / n);
      add(walk, box(W, 0.16, (span / n) * 0.9), i % 2 ? P.deck : P.deckDark, [x, f.y - 0.08, z], [0, yaw, 0]);
    }
    for (const side of [-1, 1]) {
      const [x, z] = at(0.5, side * (W / 2 + 0.05));
      add(deco, box(0.22, 0.32, span + 0.8), P.beam, [x, f.y - 0.22, z], [0, yaw, 0]);
      add(deco, box(0.12, 0.12, span + 0.6), P.post, [x, f.y + 1.0, z], [0, yaw, 0]);
      const posts = Math.max(2, Math.round(span / 2.4));
      for (let i = 0; i <= posts; i++) {
        const [px, pz] = at(i / posts, side * (W / 2 + 0.05));
        add(deco, cyl(0.08, 0.1, 1.05, 5), P.post, [px, f.y + 0.5, pz]);
      }
    }
    // A brace underneath, down to the bough below.
    const [mx, mz] = at(0.5);
    add(deco, box(0.3, 0.3, span * 0.9), P.beam, [mx, f.y - 0.55, mz], [0, yaw, 0]);
    return;
  }
  // Rope bridge.
  const n = Math.max(6, Math.round(span / 0.42));
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) / n;
    const [x, z] = at(s);
    const g = add(walk, box(W - 0.15, 0.1, (span / n) * 0.78), i % 2 ? P.deck : P.deckDark, [x, f.y - 0.05 + sagAt(s), z], [0, yaw, 0]);
    g.rotateZ(((i * 7) % 5 - 2) * 0.015);
  }
  for (const side of [-1, 1]) {
    const pts = [], low = [];
    for (let i = 0; i <= 12; i++) {
      const s = -0.03 + (i / 12) * 1.06;
      const [x, z] = at(s, side * (W / 2 + 0.02));
      pts.push(new THREE.Vector3(x, f.y + 1.05 + sagAt(s) * 0.55, z));
      low.push(new THREE.Vector3(x, f.y - 0.02 + sagAt(s), z));
    }
    add(deco, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.05, 4), P.rope);
    add(deco, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(low), 24, 0.05, 4), P.rope);
    const ties = Math.max(4, Math.round(span / 1.1));
    for (let i = 1; i < ties; i++) {
      const s = i / ties;
      const [x, z] = at(s, side * (W / 2 + 0.02));
      const top = f.y + 1.05 + sagAt(s) * 0.55, bot = f.y + sagAt(s);
      add(deco, cyl(0.022, 0.022, top - bot, 3), P.rope, [x, (top + bot) / 2, z]);
    }
    // Thick posts at both ends.
    for (const s of [-0.02, 1.02]) {
      const [x, z] = at(s, side * (W / 2 + 0.1));
      add(deco, cyl(0.14, 0.17, 1.5, 6), P.post, [x, f.y + 0.6, z]);
    }
  }
}

/** A bough from the trunk out under a deck, then on past it, with leaves at its tip. */
function bough(deco, leaves, P, f, p, r) {
  const a = Math.atan2(p.x, p.z);
  const dist = Math.hypot(p.x, p.z);
  const base = new THREE.Vector3(...[Math.sin(a) * (TREE.trunkR - 1.5), f.y - 9, Math.cos(a) * (TREE.trunkR - 1.5)]);
  const mid = new THREE.Vector3(Math.sin(a) * (dist * 0.55), f.y - 5.2, Math.cos(a) * (dist * 0.55));
  const under = new THREE.Vector3(p.x, f.y - 2.6, p.z);
  const reach = dist + p.pr + 5 + r() * 4;
  const tip = new THREE.Vector3(Math.sin(a + 0.04) * reach, f.y - 1.5 + r() * 1.5, Math.cos(a + 0.04) * reach);
  add(deco, limb([base, mid, under, tip], 2.2, 0.35, { radial: 8, segs: 18 }), P.bark);
  // Leaves: a bunch at the tip, and puffs under the deck.
  leaves.push({ x: tip.x, y: tip.y + 0.4, z: tip.z, s: 2.6 + r() * 1.2 });
  leaves.push({ x: tip.x - Math.sin(a) * 2.5, y: tip.y - 1.8, z: tip.z - Math.cos(a) * 2.5, s: 1.8 + r() * 0.8 });
  for (let i = 0; i < 4; i++) {
    const b = a + (r() - 0.5) * 2.2;
    leaves.push({ x: p.x + Math.sin(b) * p.pr * 0.75, y: f.y - 2.0 - r() * 0.8, z: p.z + Math.cos(b) * p.pr * 0.75, s: 1.1 + r() * 0.8 });
  }
}

/** One flight of the spiral stair (and the landing at its foot is drawn with the ring). */
function stairFlight(walk, deco, P, s) {
  const { r: R, a0, a1, y0, y1 } = s.arc;
  const W = s.width;
  const len = (a1 - a0) * R;
  const n = Math.max(12, Math.round(len / 0.5));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const a = a0 + (a1 - a0) * t;
    const [x, z] = polar(R, a);
    const y = y0 + (y1 - y0) * t;
    add(walk, box(W, 0.2, (len / n) * 1.06), i % 2 ? P.deck : P.deckDark, [x, y - 0.1, z], [0, a + Math.PI / 2, 0]);
    // A riser under every step, down to the one below.
    add(deco, box(W - 0.1, (y1 - y0) / n + 0.1, 0.08), P.beam, [x, y - 0.2 - (y1 - y0) / n / 2, z], [0, a + Math.PI / 2, 0]);
    if (i % 5 === 0) {
      // A bracket from the trunk, and a rail post on the outer edge.
      const [bx, bz] = polar(R - W / 2 - 0.6, a), [ox, oz] = polar(R + W / 2 - 0.12, a);
      add(deco, box(W + 1.2, 0.3, 0.3), P.beam, [(bx + ox) / 2, y - 0.4, (bz + oz) / 2], [0, a, 0]);
      add(deco, cyl(0.09, 0.11, 1.1, 5), P.post, [ox, y + 0.5, oz]);
    }
  }
  const rail = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const [x, z] = polar(R + W / 2 - 0.12, a0 + (a1 - a0) * t);
    rail.push(new THREE.Vector3(x, y0 + (y1 - y0) * t + 1.0, z));
  }
  add(deco, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 48, 0.06, 4), P.rope);
}

/** The landing on the stair: a flat run of planks where a ring's bridge begins. */
function landing(walk, deco, P, f) {
  const { stairR: R, stairW: W, land } = TREE;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = f.phi - land + ((i + 0.5) / n) * land * 2;
    const [x, z] = polar(R, a);
    add(walk, box(W, 0.24, ((land * 2 * R) / n) * 1.05), i % 2 ? P.deck : P.deckDark, [x, f.y - 0.12, z], [0, a + Math.PI / 2, 0]);
  }
  const [bx, bz] = polar(R - W / 2 - 0.4, f.phi);
  add(deco, box(1.2, 1.6, 1.2), P.beam, [bx, f.y - 1.1, bz], [0, f.phi, 0]);
  // A big lantern where the bridge leaves the stair.
  for (const s of [-1, 1]) {
    const [x, z] = polar(R + W / 2 - 0.15, f.phi + s * land * 0.95);
    add(deco, cyl(0.1, 0.12, 2.1, 6), P.post, [x, f.y + 1.05, z]);
    add(deco, box(0.3, 0.36, 0.3), lampMat, [x, f.y + 2.0, z]);
  }
}

/** Instanced leaf puffs in a ring's colour. */
function leafPuffs(list, P) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const m = new THREE.InstancedMesh(geo, P.leaf, list.length);
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  const r = seeded(list.length * 17);
  list.forEach((l, i) => {
    e.set(r() * 3, r() * 3, r() * 3);
    q.setFromEuler(e);
    m.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(l.x, l.y, l.z), q, new THREE.Vector3(l.s, l.s * 0.72, l.s)));
  });
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Shelf fungus and glowing spots up the trunk. */
function trunkGlow(group) {
  const r = seeded(44);
  const g = new THREE.Group();
  const shelf = mat('#f2d7a8', { rough: 0.8 });
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, y = -6 + r() * 92;
    const rad = 13.6 - y * 0.006 + 0.2;
    const [x, z] = polar(rad, a);
    if (i % 3 === 0) add(g, new THREE.CylinderGeometry(1.1, 0.2, 0.35, 10, 1, false, 0, Math.PI), shelf, [x, y, z], [0, a + Math.PI / 2, 0]);
    else add(g, sphere(0.25 + r() * 0.2, 6, 5), i % 2 ? glowMat : glowPink, [x, y, z]);
  }
  group.add(batch(g));
}

/** The crown: big branches above the top ring, heaped with leaves. */
function crown(group, topY, leafColor) {
  const r = seeded(7);
  const bark = mat('#74492f', { rough: 0.95 });
  const g = new THREE.Group();
  const puffs = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r() * 0.3;
    const y0 = topY + 10 + r() * 14;
    const d = 26 + r() * 22;
    const end = new THREE.Vector3(Math.sin(a) * d, y0 + 10 + r() * 8, Math.cos(a) * d);
    add(g, limb([new THREE.Vector3(Math.sin(a) * 6, y0, Math.cos(a) * 6), new THREE.Vector3(Math.sin(a) * d * 0.5, y0 + 4, Math.cos(a) * d * 0.5), end], 2.6, 0.6), bark);
    for (let k = 0; k < 5; k++) puffs.push({ x: end.x + (r() - 0.5) * 16, y: end.y + (r() - 0.3) * 7, z: end.z + (r() - 0.5) * 16, s: 7 + r() * 5 });
  }
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = r() * 26;
    puffs.push({ x: Math.sin(a) * d, y: topY + 30 + r() * 16, z: Math.cos(a) * d, s: 9 + r() * 6 });
  }
  group.add(batch(g));
  const P = { leaf: mat(leafColor, { rough: 0.9 }) };
  group.add(leafPuffs(puffs, P));
}

/**
 * Build the tree for a plan and the floors' looks.
 * @returns {{ group, walk, tiers: THREE.Group[], gates: THREE.Group[], fireflySpots: object[], setNight(k) }}
 */
export function buildTreeWorld(plan, floors) {
  const group = new THREE.Group();
  group.name = 'great-tree';
  const walk = new THREE.Group();
  walk.name = 'walk';
  group.add(walk);
  group.add(trunk());
  meadow(group);
  trunkGlow(group);
  const tiers = [];
  const fireflySpots = [];
  for (const f of plan.floors) {
    const look = floors[f.k].look;
    const P = palette(look);
    const r = seeded(f.n * 131);
    const tier = new THREE.Group();
    tier.name = `ring-${f.n}`;
    const w = new THREE.Group(), deco = new THREE.Group();
    const leaves = [];
    for (const id in f.pads) {
      const p = f.pads[id];
      if (p.landing) continue;
      deck(w, deco, P, f, p);
      bough(deco, leaves, P, f, p, r);
      if (['hub', 'shop', 'museum', 'board', 'arcade', 'nook'].includes(id)) lanterns(deco, P, f, p, id === 'hub' ? 0.9 : 0.75);
      fireflySpots.push({ x: p.x, y: f.y - 1, z: p.z });
    }
    for (const L of f.links) bridge(w, deco, P, f, L);
    landing(w, deco, P, f);
    // A pennant on a pole at the hub, in the ring's colour.
    const hub = f.pads.hub;
    const [px, pz] = polar(hub.pr - 1.2, Math.atan2(hub.x, hub.z) + 2.3);
    add(deco, cyl(0.08, 0.1, 5, 6), P.post, [hub.x + px, f.y + 2.5, hub.z + pz]);
    add(deco, cone(0.6, 1.8, 3), P.banner, [hub.x + px + 0.1, f.y + 4.4, hub.z + pz], [0, 0, -Math.PI / 2], [1, 1, 0.2]);
    batch(w);
    batch(deco);
    w.userData.floor = f.n;
    walk.add(w);
    tier.add(deco, leafPuffs(leaves, P));
    group.add(tier);
    tiers.push({ walk: w, deco: tier });
  }
  // The spiral stair and its gates.
  const stairs = new THREE.Group();
  const stairWalk = new THREE.Group();
  const gates = [];
  for (const s of plan.stairs) {
    const P = palette(floors[s.from - 1].look);
    stairFlight(stairWalk, stairs, P, s);
    // The gate stands just above the landing, across the first steps.
    const a = s.arc.a0 + 0.02;
    const [ax, az] = polar(s.arc.r, a), [bx, bz] = polar(s.arc.r, a + 0.3);
    const gate = buildGate({ a: { x: ax, z: az, y: s.a.y }, b: { x: bx, z: bz, y: s.a.y }, width: s.width }, { ...floors[s.from - 1].look, stone: '#8a6242' });
    gate.userData.to = s.to;
    gates.push(gate);
    group.add(gate);
  }
  batch(stairs);
  batch(stairWalk);
  walk.add(stairWalk);
  group.add(stairs);
  crown(group, plan.floors.at(-1).y, floors.at(-1).look.leaf);
  return {
    group,
    walk,
    tiers,
    gates,
    fireflySpots,
    setNight(k) {
      glowMat.emissiveIntensity = 0.25 + k * 2.2;
      glowPink.emissiveIntensity = 0.25 + k * 2.0;
    }
  };
}
