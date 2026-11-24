/**
 * Island-resort architecture for the Lagoon: overwater villas under
 * thatched roofs, on wooden decks with tiki torches.
 *
 *   Math     a round villa: slatted walls, glass doors, a wraparound
 *            veranda, a tall shaggy thatched cone
 *   History  a two-storey pavilion: open posts below, a balcony all the way
 *            round, two tiers of thatch
 *   Physics  a reef lab: a curvy shingled roof with a dormer window, a
 *            glass bubble on top with a telescope, and a water slide
 *            spiralling down to the lagoon
 *
 * The smaller places (shop, arcade, museum, quest board) stand under thatched
 * gazebos; the islands' landmarks are a sandcastle, a lighthouse, a giant clam,
 * a whale fountain and a little yellow submarine.
 *
 * Same contract as buildings.js shapes: origin at the plinth's centre at deck
 * level, the door faces +Z, the function returns the top's height.
 */
import * as THREE from 'three';
import { add, batch, box, cone, cyl, ico, mat, seeded, sphere, toonRamp } from './kit.js';
import { windowMat, lampMat } from './buildings.js';

const PLINTH_R = 4.6, PLINTH_H = 0.55;
const TAU = Math.PI * 2;

/* ---------------------------------------------------------------- thatch and slats */

const textures = new Map();
/** A painted texture, made once: straw thatch, shingles or wall slats. */
function painted(kind, base) {
  const key = `${kind}|${base}`;
  if (textures.has(key)) return textures.get(key);
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const col = new THREE.Color(base);
  const shade = (k) => `#${col.clone().multiplyScalar(k).getHexString()}`;
  const r = seeded(kind.length * 97 + base.length);
  g.fillStyle = shade(1);
  g.fillRect(0, 0, N, N);
  if (kind === 'thatch') {
    // Bundles of straw: thousands of short strokes, lighter on top, a dark shadow line between courses.
    for (let row = 0; row < 4; row++) {
      const y0 = row * 64;
      for (let i = 0; i < 520; i++) {
        const x = r() * N, y = y0 + r() * 58, len = 18 + r() * 26;
        g.strokeStyle = shade(0.72 + r() * 0.5);
        g.lineWidth = 1 + r() * 1.6;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (r() - 0.5) * 6, y + len);
        g.stroke();
      }
      const grad = g.createLinearGradient(0, y0 + 46, 0, y0 + 64);
      grad.addColorStop(0, 'rgba(40, 26, 12, 0)');
      grad.addColorStop(1, 'rgba(40, 26, 12, 0.5)');
      g.fillStyle = grad;
      g.fillRect(0, y0 + 46, N, 18);
    }
  } else if (kind === 'shingle') {
    for (let row = 0; row < 8; row++) for (let i = 0; i < 9; i++) {
      const x = (i + (row % 2) * 0.5) * 32 - 16, y = row * 32;
      g.fillStyle = shade(0.8 + r() * 0.35);
      g.beginPath();
      g.moveTo(x + 1, y);
      g.lineTo(x + 31, y);
      g.lineTo(x + 31, y + 22);
      g.quadraticCurveTo(x + 16, y + 34, x + 1, y + 22);
      g.closePath();
      g.fill();
      g.strokeStyle = shade(0.55);
      g.lineWidth = 2;
      g.stroke();
    }
  } else {
    // Slats: vertical boards with dark gaps and a little grain.
    for (let i = 0; i < 16; i++) {
      g.fillStyle = shade(0.82 + r() * 0.3);
      g.fillRect(i * 16 + 1, 0, 14, N);
      g.fillStyle = shade(0.5);
      g.fillRect(i * 16, 0, 1.5, N);
      for (let k = 0; k < 6; k++) {
        g.fillStyle = shade(0.7);
        g.fillRect(i * 16 + 3 + r() * 9, r() * N, 1, 20 + r() * 40);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textures.set(key, tex);
  return tex;
}
const mats = new Map();
/** A textured cartoon material, the texture tiled rx × ry. */
function tmat(kind, base, rx = 1, ry = 1, side = THREE.FrontSide) {
  const key = `${kind}|${base}|${rx}|${ry}|${side}`;
  if (!mats.has(key)) {
    const map = painted(kind, base).clone();
    map.needsUpdate = true;
    map.repeat.set(rx, ry);
    mats.set(key, new THREE.MeshToonMaterial({ map, gradientMap: toonRamp(), side }));
  }
  return mats.get(key);
}
const STRAW = '#b38c5a';
const thatch = (rx = 6, ry = 1.5) => tmat('thatch', STRAW, rx, ry, THREE.DoubleSide);
const slats = (base = '#9a6b45', rx = 6) => tmat('slats', base, rx, 1);
const teak = () => mat('#9a6b45', { rough: 0.85 });
const teakDark = () => mat('#6b4a30', { rough: 0.85 });
const white = () => mat('#fbf6ec', { rough: 0.8 });

/** A thatched cone: a shaggy roof with a ragged fringe and a dark eave under it. */
function thatchCone(parent, [x, y, z], r, h, { rx = 7, ry = 1.6, fringe = true } = {}) {
  add(parent, new THREE.ConeGeometry(r, h, 28, 4, true), thatch(rx, ry), [x, y + h / 2, z]);
  add(parent, new THREE.CylinderGeometry(r * 0.96, r * 0.96, 0.08, 28), mat('#3e2a1a'), [x, y + 0.02, z]);
  if (fringe) for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    add(parent, cone(0.22, 0.5, 4), mat(i % 2 ? '#a07a4a' : '#8e6a3e'), [x + Math.sin(a) * r * 0.99, y - 0.12, z + Math.cos(a) * r * 0.99], [Math.PI, a, 0]);
  }
}
/** A tiki torch: a pole, a basket and a flame that glows at night. */
function torch(parent, [x, y, z], h = 1.9) {
  add(parent, cyl(0.05, 0.07, h, 6), teakDark(), [x, y + h / 2, z]);
  add(parent, cyl(0.16, 0.1, 0.28, 8), mat('#8a6a3e'), [x, y + h + 0.1, z]);
  add(parent, cone(0.13, 0.36, 7), lampMat, [x, y + h + 0.4, z]);
}
/** A sun lounger. */
function lounger(parent, [x, y, z], yaw = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  add(g, box(0.62, 0.1, 1.55), white(), [0, 0.32, 0]);
  add(g, box(0.62, 0.1, 0.7), white(), [0, 0.55, -0.82], [-0.6, 0, 0]);
  for (const sx of [-0.26, 0.26]) for (const sz of [-0.6, 0.6]) add(g, cyl(0.03, 0.03, 0.3, 4), teak(), [sx, 0.15, sz]);
  add(g, box(0.5, 0.06, 0.4), mat('#5fb8c8'), [0, 0.4, 0.4]);
  parent.add(g);
}

/* ---------------------------------------------------------------- the base */

/** The plinth, resort style: a round deck of teak planks, steps, tiki torches, loungers. */
export function deckPlinth(P, look) {
  const g = new THREE.Group();
  const R = PLINTH_R, N = 28;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU;
    add(g, new THREE.CylinderGeometry(R, R, PLINTH_H, 2, 1, false, a0, TAU / N), i % 2 ? teak() : mat('#a97a50', { rough: 0.85 }), [0, PLINTH_H / 2, 0]);
  }
  add(g, new THREE.TorusGeometry(R, 0.1, 5, 40), teakDark(), [0, PLINTH_H, 0], [Math.PI / 2, 0, 0]);
  add(g, cyl(R - 1.0, R - 1.0, 0.04, 32), mat('#c9a77a', { rough: 0.9 }), [0, PLINTH_H + 0.02, 0]);
  for (let s = 0; s < 3; s++) add(g, box(2.4 - s * 0.1, 0.16, 0.45), teak(), [0, PLINTH_H - 0.08 - s * 0.16, R + 0.15 + s * 0.42]);
  for (const sx of [-1.6, 1.6]) torch(g, [sx, PLINTH_H, R - 0.35]);
  // Potted palms and a lounger by the door.
  const pot = mat('#e8dcc4'), leaf = mat(look.leaf);
  for (const [x, z] of [[-3.4, 2.6], [3.4, 2.6]]) {
    add(g, cyl(0.28, 0.22, 0.45, 10), pot, [x, PLINTH_H + 0.22, z]);
    for (let i = 0; i < 6; i++) add(g, cone(0.1, 0.9, 4), leaf, [x, PLINTH_H + 0.8, z], [Math.cos(i) * 0.7, i, Math.sin(i) * 0.7]);
  }
  return g;
}

/* ---------------------------------------------------------------- math: the villa */

export function villa(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.02, z0 = -0.3, R = 2.9, H = 3.0;
  // Slatted wall, cream inside, a glass front.
  add(g, cyl(R, R, H, 36, 1, true), slats('#a2734a', 10), [0, y0 + H / 2, z0]);
  add(g, cyl(R - 0.05, R - 0.05, H, 36), white(), [0, y0 + H / 2, z0]);
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.28;
    const p = add(g, box(0.72, 2.3, 0.06), windowMat, [Math.sin(a) * (R + 0.03), y0 + 1.25, z0 + Math.cos(a) * (R + 0.03)], [0, a, 0]);
    p.userData.glass = true;
    add(g, box(0.07, 2.4, 0.09), teakDark(), [Math.sin(a + 0.14) * (R + 0.05), y0 + 1.25, z0 + Math.cos(a + 0.14) * (R + 0.05)], [0, a, 0]);
  }
  // The veranda: posts and a rail all round.
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    if (Math.cos(a) > 0.93) continue;
    add(g, cyl(0.06, 0.06, 0.9, 5), teakDark(), [Math.sin(a) * (R + 0.9), y0 + 0.45, z0 + Math.cos(a) * (R + 0.9)]);
  }
  add(g, new THREE.TorusGeometry(R + 0.9, 0.05, 4, 40, TAU * 0.92), teak(), [0, y0 + 0.92, z0], [Math.PI / 2, 0, Math.PI / 2 + TAU * 0.04]);
  // Roof: a tall shaggy cone, a smaller one on top, a carved finial.
  thatchCone(g, [0, y0 + H - 0.1, z0], R + 1.6, 3.4, { rx: 9, ry: 1.8 });
  thatchCone(g, [0, y0 + H + 2.4, z0], 1.2, 1.6, { rx: 4, ry: 0.8, fringe: false });
  add(g, cyl(0.07, 0.1, 0.9, 6), teakDark(), [0, y0 + H + 4.2, z0]);
  add(g, sphere(0.14, 8, 6), mat(look.roof.math), [0, y0 + H + 4.7, z0]);
  // A sign in the floor's colour over the doors.
  add(g, box(1.8, 0.36, 0.08), mat(look.roof.math), [0, y0 + H - 0.35, z0 + R + 0.06]);
  lounger(g, [2.6, y0, 2.7], 0.5);
  return y0 + H + 5;
}

/* ---------------------------------------------------------------- history: the pavilion */

export function pavilion(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.02, z0 = -0.3;
  const R1 = 3.4, H1 = 2.8, R2 = 2.6, H2 = 2.2;
  // Ground floor: dark-wood drum with glass, open posts round it.
  add(g, cyl(R1 - 0.5, R1 - 0.5, H1, 32), slats('#7a5236', 12), [0, y0 + H1 / 2, z0]);
  for (let i = -2; i <= 2; i++) {
    const a = i * 0.32;
    add(g, box(0.78, 2.0, 0.06), windowMat, [Math.sin(a) * (R1 - 0.46), y0 + 1.1, z0 + Math.cos(a) * (R1 - 0.46)], [0, a, 0]);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + 0.26;
    add(g, cyl(0.12, 0.14, H1, 6), teakDark(), [Math.sin(a) * R1, y0 + H1 / 2, z0 + Math.cos(a) * R1]);
  }
  // The first roof, a wide ring of thatch, with the balcony above it.
  add(g, new THREE.CylinderGeometry(R2 + 0.2, R1 + 1.4, 1.3, 32, 2, true), thatch(12, 1), [0, y0 + H1 + 0.55, z0]);
  add(g, new THREE.TorusGeometry(R1 + 1.35, 0.09, 4, 48), mat('#3e2a1a'), [0, y0 + H1 - 0.12, z0], [Math.PI / 2, 0, 0]);
  const by = y0 + H1 + 1.2;
  add(g, cyl(R2 + 0.75, R2 + 0.75, 0.16, 32), teak(), [0, by, z0]);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU;
    add(g, cyl(0.04, 0.04, 0.8, 4), teakDark(), [Math.sin(a) * (R2 + 0.65), by + 0.4, z0 + Math.cos(a) * (R2 + 0.65)]);
  }
  add(g, new THREE.TorusGeometry(R2 + 0.65, 0.05, 4, 48), teak(), [0, by + 0.82, z0], [Math.PI / 2, 0, 0]);
  // Upper floor, and the top roof.
  add(g, cyl(R2, R2, H2, 32, 1, true), slats('#a2734a', 10), [0, by + H2 / 2, z0]);
  add(g, cyl(R2 - 0.04, R2 - 0.04, H2, 32), white(), [0, by + H2 / 2, z0]);
  for (const a of [-0.9, -0.3, 0.3, 0.9, 2.2, -2.2]) add(g, box(0.6, 1.3, 0.06), windowMat, [Math.sin(a) * (R2 + 0.03), by + 1.0, z0 + Math.cos(a) * (R2 + 0.03)], [0, a, 0]);
  thatchCone(g, [0, by + H2 - 0.1, z0], R2 + 1.5, 3.2, { rx: 8, ry: 1.6 });
  add(g, cyl(0.07, 0.1, 1.0, 6), teakDark(), [0, by + H2 + 3.4, z0]);
  // Banners in the floor's colour between the front posts.
  for (const a of [-0.55, 0.55]) add(g, box(0.5, 1.6, 0.04), mat(look.banner), [Math.sin(a) * (R1 + 0.05), y0 + 1.6, z0 + Math.cos(a) * (R1 + 0.05)], [0, a, 0]);
  return by + H2 + 4.0;
}

/* ---------------------------------------------------------------- physics: the reef lab */

export function reefLab(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.02, z0 = -0.3, R = 3.0, H = 2.6;
  add(g, cyl(R, R + 0.1, H, 36, 1, true), slats('#b0814f', 10), [0, y0 + H / 2, z0]);
  add(g, cyl(R - 0.05, R - 0.05, H, 36), white(), [0, y0 + H / 2, z0]);
  for (let i = -1; i <= 1; i++) add(g, box(0.9, 1.9, 0.06), windowMat, [Math.sin(i * 0.36) * (R + 0.04), y0 + 1.1, z0 + Math.cos(i * 0.36) * (R + 0.04)], [0, i * 0.36, 0]);
  // The curvy shingled roof, a dormer window, a glass bubble with a telescope.
  const roof = add(g, new THREE.SphereGeometry(R + 1.5, 36, 14, 0, TAU, 0, Math.PI / 2), tmat('shingle', '#c98a68', 7, 2, THREE.DoubleSide), [0, y0 + H - 0.2, z0]);
  roof.scale.set(1, 0.55, 1);
  add(g, new THREE.TorusGeometry(R + 1.45, 0.12, 6, 48), mat('#8a5a3e'), [0, y0 + H - 0.18, z0], [Math.PI / 2, 0, 0]);
  const dz = z0 + R * 0.75;
  add(g, box(1.3, 0.9, 1.2), slats('#b0814f', 2), [0, y0 + H + 1.0, dz]);
  add(g, box(0.9, 0.55, 0.06), windowMat, [0, y0 + H + 1.0, dz + 0.62]);
  add(g, new THREE.ConeGeometry(1.0, 0.6, 4), tmat('shingle', '#c98a68', 1, 1), [0, y0 + H + 1.7, dz], [0, Math.PI / 4, 0], [1, 1, 0.9]);
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 14, 0, TAU, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#c8f2ff', emissive: '#3fc8ff', emissiveIntensity: 0.35, roughness: 0.1, transparent: true, opacity: 0.55 }));
  bubble.position.set(0, y0 + H + 1.9, z0 - 0.6);
  bubble.userData.live = true;
  g.add(bubble);
  add(g, cyl(1.02, 1.02, 0.15, 24), mat(look.roof.physics), [0, y0 + H + 1.88, z0 - 0.6]);
  const scope = new THREE.Group();
  scope.position.set(0, y0 + H + 2.1, z0 - 0.6);
  scope.userData.live = true;
  add(scope, cyl(0.12, 0.18, 1.3, 10), mat('#e8e2d2', { metal: 0.4 }), [0, 0.35, 0.2], [-0.7, 0, 0]);
  g.add(scope);
  g.userData.dome = scope;
  // The water slide: a blue trough spiralling round the lab and off the deck.
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = 2.3 + t * TAU * 0.95;
    const r = R + 1.2 + t * 1.4;
    pts.push(new THREE.Vector3(Math.sin(a) * r, y0 + H + 0.9 - t * (H + 1.3), z0 + Math.cos(a) * r));
  }
  const last = pts.at(-1);
  pts.push(new THREE.Vector3(last.x * 1.4, -0.6, last.z * 1.4));
  const curve = new THREE.CatmullRomCurve3(pts);
  add(g, new THREE.TubeGeometry(curve, 90, 0.42, 10, false), mat('#5fc4ea', { side: THREE.DoubleSide }));
  for (let i = 4; i < 40; i += 6) {
    const p = pts[i];
    add(g, cyl(0.06, 0.06, Math.max(0.2, p.y - y0), 5), white(), [p.x, y0 + (p.y - y0) / 2, p.z]);
  }
  add(g, new THREE.TorusGeometry(0.5, 0.08, 6, 18), mat(look.roof.physics), [pts[0].x, pts[0].y + 0.1, pts[0].z], [Math.PI / 2, 0, 0]);
  return y0 + H + 3.6;
}

/* ---------------------------------------------------------------- the smaller places */

/** A thatched gazebo over a small place: four posts and a shaggy roof. */
export function thatchGazebo(look, r, seed = 1) {
  const g = new THREE.Group();
  const R = r + 0.4, H = 3.9;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + TAU / 8;
    add(g, cyl(0.1, 0.12, H, 6), teakDark(), [Math.sin(a) * R, H / 2, Math.cos(a) * R]);
  }
  thatchCone(g, [0, H - 0.1, 0], R + 1.0, 2.4 + r * 0.15, { rx: 6, ry: 1.3 });
  add(g, sphere(0.16, 8, 6), mat(look.banner), [0, H + 2.4 + r * 0.15, 0]);
  const rnd = seeded(seed);
  for (const sx of [-1, 1]) add(g, cone(0.12, 0.3, 6), lampMat, [sx * R * 0.7, H - 0.45, R * 0.7 + rnd() * 0.1]);
  return batch(g);
}

/* ---------------------------------------------------------------- the landmarks */

function sandPad(g, look, r) {
  add(g, cyl(r, r + 0.2, 0.3, 24), mat('#f2dfb0', { rough: 1 }), [0, 0.15, 0]);
}

export const SEA_LANDMARKS = {
  /** Shell Beach: a sandcastle with towers, flags and shells; tap it and the flags flutter. */
  sandcastle(look) {
    const g = new THREE.Group();
    sandPad(g, look, 4);
    const sand = mat('#e8c98a', { rough: 1 }), wet = mat('#d4b06a', { rough: 1 });
    add(g, box(3.4, 1.3, 3.4), sand, [0, 0.95, 0]);
    for (let i = 0; i < 12; i++) add(g, box(0.45, 0.35, 0.45), wet, [-1.5 + (i % 4) * 1.0, 1.75, i < 4 ? 1.5 : i < 8 ? -1.5 : 0], [0, 0, 0]);
    const flags = [];
    for (const [x, z, h] of [[-1.7, -1.7, 2.6], [1.7, -1.7, 2.6], [-1.7, 1.7, 2.2], [1.7, 1.7, 2.2], [0, 0, 3.6]]) {
      add(g, cyl(0.55, 0.7, h, 12), sand, [x, h / 2 + 0.3, z]);
      add(g, cone(0.7, 0.9, 12), wet, [x, h + 0.75, z]);
      add(g, cyl(0.02, 0.02, 0.9, 4), teakDark(), [x, h + 1.6, z]);
      const f = new THREE.Group();
      f.position.set(x, h + 1.9, z);
      f.userData.live = true;
      add(f, box(0.5, 0.3, 0.02), mat(look.banner), [0.25, 0, 0]);
      g.add(f);
      flags.push(f);
    }
    add(g, new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12, 1, false, -Math.PI / 2, Math.PI), mat('#7a5a3a'), [0, 0.3, 1.71], [Math.PI / 2, 0, 0]);
    const shells = [mat('#ffb3b8'), mat('#fff1dc'), mat('#ffd6a5')];
    for (let i = 0; i < 10; i++) add(g, sphere(0.12, 6, 4), shells[i % 3], [Math.sin(i * 0.63) * 3.2, 0.35, Math.cos(i * 0.63) * 3.2], [0, 0, 0], [1, 0.5, 1]);
    batch(g);
    let t = 9, clock = 0;
    g.userData = { top: 6.5, poke: () => (t = 0), update(dt) { t += dt; clock += dt; const k = t < 1.5 ? 4 : 1; flags.forEach((f, i) => (f.rotation.y = Math.sin(clock * 3 * k + i) * 0.4)); } };
    return g;
  },
  /** Lighthouse Point: a striped lighthouse whose lamp turns; tap it for a flash. */
  beacon(look) {
    const g = new THREE.Group();
    sandPad(g, look, 4);
    add(g, cyl(2.0, 2.4, 0.8, 16), mat('#9aa3ad'), [0, 0.7, 0]);
    for (let i = 0; i < 5; i++) add(g, cyl(1.3 - i * 0.12, 1.42 - i * 0.12, 1.4, 20), mat(i % 2 ? '#ffffff' : '#e0453a'), [0, 1.8 + i * 1.4, 0]);
    add(g, cyl(1.2, 1.2, 0.2, 20), mat('#3f464f'), [0, 8.5, 0]);
    add(g, cyl(0.75, 0.75, 1.1, 16), windowMat, [0, 9.2, 0]);
    add(g, cone(0.95, 0.9, 16), mat('#e0453a'), [0, 10.2, 0]);
    add(g, new THREE.CylinderGeometry(0.45, 0.45, 0.06, 10, 1, false, -Math.PI / 2, Math.PI), mat('#5a3a26'), [0, 1.1, 1.38], [Math.PI / 2, 0, 0]);
    batch(g);
    const beam = new THREE.Group();
    beam.position.set(0, 9.2, 0);
    beam.userData.live = true;
    const ray = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4c2', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    ray.rotation.z = Math.PI / 2;
    ray.position.x = 4.5;
    beam.add(ray, new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), lampMat));
    g.add(beam);
    let t = 9;
    g.userData = { top: 11, poke: () => (t = 0), update(dt) { t += dt; beam.rotation.y += dt * (t < 1.5 ? 6 : 0.8); ray.material.opacity = t < 1.5 ? 0.4 : 0.18; } };
    return g;
  },
  /** Pearl Reef: a giant clam that opens to show its pearl. */
  clam(look) {
    const g = new THREE.Group();
    sandPad(g, look, 4);
    const shell = mat('#b9a7d6', { rough: 0.5 }), inner = mat('#ffd6e6', { rough: 0.4 });
    const lower = add(g, new THREE.SphereGeometry(2.4, 24, 10, 0, TAU, Math.PI / 2, Math.PI / 2), shell, [0, 1.2, 0]);
    lower.scale.set(1, 0.45, 0.9);
    add(g, cyl(2.3, 2.3, 0.05, 24), inner, [0, 1.2, 0], [0, 0, 0], [1, 1, 0.9]);
    const pearl = add(g, sphere(0.6, 20, 14), new THREE.MeshStandardMaterial({ color: '#fffaf2', roughness: 0.12, metalness: 0.2, emissive: '#fff1d6', emissiveIntensity: 0.25 }), [0, 1.75, 0.2]);
    pearl.userData.live = true;
    batch(g);
    const lid = new THREE.Group();
    lid.position.set(0, 1.22, -2.1);
    lid.userData.live = true;
    const top = add(lid, new THREE.SphereGeometry(2.4, 24, 10, 0, TAU, 0, Math.PI / 2), shell, [0, 0, 2.1]);
    top.scale.set(1, 0.45, 0.9);
    for (let i = -3; i <= 3; i++) add(lid, box(0.08, 0.6, 4.2), mat('#a28fc4'), [i * 0.6, 0.6, 2.1], [0, 0, 0], [1, 1, 1]);
    g.add(lid);
    let t = 9, clock = 0;
    g.userData = { top: 5, poke: () => (t = 0), update(dt) { t += dt; clock += dt; const open = 0.55 + Math.sin(clock * 0.8) * 0.08 + (t < 2 ? Math.sin(Math.min(1, t) * Math.PI) * 0.35 : 0); lid.rotation.x = -open; } };
    return g;
  },
  /** Whale Bay: a friendly whale statue that spouts water. */
  whale(look) {
    const g = new THREE.Group();
    sandPad(g, look, 4.2);
    add(g, cyl(3.2, 3.4, 0.5, 24), mat('#7fd0e6', { rough: 0.2 }), [0, 0.5, 0]);
    const blue = mat('#4f7fc8', { rough: 0.5 }), belly = mat('#e8f2ff');
    const body = add(g, sphere(1.8, 20, 14), blue, [0, 1.9, 0]);
    body.scale.set(1, 0.8, 1.5);
    const b2 = add(g, sphere(1.5, 16, 10), belly, [0, 1.55, 0.6]);
    b2.scale.set(0.95, 0.55, 1.2);
    add(g, cone(0.6, 1.8, 10), blue, [0, 2.3, -2.9], [-Math.PI / 2.4, 0, 0]);
    for (const s of [-1, 1]) add(g, box(1.2, 0.12, 0.6), blue, [s * 0.75, 2.75, -3.6], [0, 0, s * 0.3]);
    for (const s of [-1, 1]) add(g, box(1.0, 0.1, 0.5), blue, [s * 1.8, 1.4, 0.5], [0, s * 0.4, s * -0.4]);
    for (const s of [-1, 1]) add(g, sphere(0.16, 8, 6), mat('#1f2a3a'), [s * 1.25, 2.15, 1.8]);
    batch(g);
    const spout = new THREE.Group();
    spout.position.set(0, 3.2, 0.4);
    spout.userData.live = true;
    const water = mat('#bfefff', { opacity: 0.75 });
    const jets = [];
    for (let i = 0; i < 7; i++) {
      const m = add(spout, sphere(0.22 + (i % 3) * 0.06, 8, 6), water, [0, i * 0.35, 0]);
      jets.push(m);
    }
    g.add(spout);
    let t = 9, clock = 0;
    g.userData = { top: 7, poke: () => (t = 0), update(dt) { t += dt; clock += dt; const k = t < 1.6 ? 1.8 : 1; jets.forEach((m, i) => { const ph = (clock * 1.5 + i / 7) % 1; m.position.set(Math.sin(i * 2.1) * ph * 0.9 * k, ph * 2.6 * k, Math.cos(i * 2.1) * ph * 0.9 * k); m.scale.setScalar(1 - ph * 0.6); }); } };
    return g;
  },
  /** Deep Blue Station: a little yellow submarine with portholes and a turning propeller. */
  submarine(look) {
    const g = new THREE.Group();
    sandPad(g, look, 4);
    add(g, box(2.6, 0.6, 0.6), mat('#8a6a4e'), [0, 0.6, 0]);
    const yellow = mat('#ffd23f', { rough: 0.4 });
    const hull = add(g, sphere(1.3, 22, 14), yellow, [0, 2.0, 0]);
    hull.scale.set(1, 1, 1.9);
    add(g, cyl(0.55, 0.65, 0.9, 14), yellow, [0, 3.2, 0.3]);
    add(g, cyl(0.08, 0.08, 1.0, 6), mat('#3f464f'), [0.2, 4.0, 0.3]);
    add(g, box(0.3, 0.08, 0.08), mat('#3f464f'), [0.35, 4.48, 0.3]);
    for (const z of [-1.0, 0, 1.0]) for (const s of [-1, 1]) {
      add(g, new THREE.TorusGeometry(0.28, 0.07, 6, 16), mat('#c9a04a', { metal: 0.6 }), [s * 1.22, 2.1, z], [0, Math.PI / 2, 0]);
      add(g, new THREE.CircleGeometry(0.24, 14), windowMat, [s * 1.27, 2.1, z], [0, s * Math.PI / 2, 0]);
    }
    for (const s of [-1, 1]) add(g, box(0.1, 0.9, 0.6), yellow, [0, 2.0 + s * 0.9, -2.3]);
    batch(g);
    const prop = new THREE.Group();
    prop.position.set(0, 2.0, -2.6);
    prop.userData.live = true;
    for (let i = 0; i < 3; i++) add(prop, box(0.12, 0.8, 0.05), mat('#c9a04a', { metal: 0.6 }), [0, 0, 0], [0, 0, (i / 3) * TAU]);
    g.add(prop);
    let t = 9;
    g.userData = { top: 5, poke: () => (t = 0), update(dt) { t += dt; prop.rotation.z += dt * (t < 2 ? 14 : 2); } };
    return g;
  }
};
export const SEA_LANDMARK_ICONS = { sandcastle: '🏰', beacon: '🗼', clam: '🦪', whale: '🐋', submarine: '🚢' };
