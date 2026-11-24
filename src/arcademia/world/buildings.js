/**
 * The three buildings of every floor, each with its own silhouette, varied
 * by the floor's look (floors.js):
 *
 *   Math     a schoolhouse: gabled roof, a bell cupola, a chalkboard by the
 *            door, a pennant; two storeys from floor 4 up
 *   History  a hall of columns: stepped base, pediment — a dome from floor 3 up,
 *            banners between the columns, an urn and an obelisk
 *   Physics  an observatory: a round tower under a dome with a slit and a
 *            telescope, a lab wing with big windows, an orrery that turns
 *
 * Every building stands on a round stone plinth with steps and lanterns.
 * Origin: the plinth's centre at ground level; the door faces +Z.
 * Parts that move are marked `userData.live` and keep out of the batch.
 */
import * as THREE from 'three';
import { t as tr } from '../i18n/index.js';
import { PLINTH_H, PLINTH_R } from './layout.js';
import { add, batch, box, cone, cyl, gable, ico, mat, seeded, signTexture, sphere } from './kit.js';
import { rootPlinth, seedPod, rootHall, starSpire } from './grown.js';

/** Window glass: dark blue by day, warm and glowing at night (World sets emissiveIntensity). */
export const windowMat = new THREE.MeshStandardMaterial({ color: '#5c7f99', roughness: 0.25, metalness: 0.1, emissive: new THREE.Color('#ffc46b'), emissiveIntensity: 0, flatShading: true });
/** Lantern glass. */
export const lampMat = new THREE.MeshStandardMaterial({ color: '#ffe7a8', roughness: 0.4, emissive: new THREE.Color('#ffb648'), emissiveIntensity: 0.25, flatShading: true });

function palette(look, subject) {
  return {
    wall: mat(look.wall, { rough: 0.9 }),
    trim: mat(look.trim, { rough: 0.8 }),
    roof: mat(look.roof[subject], { rough: 0.75 }),
    roofDark: mat(new THREE.Color(look.roof[subject]).multiplyScalar(0.78).getStyle(), { rough: 0.75 }),
    stone: mat(look.stone, { rough: 0.95 }),
    stoneDark: mat(new THREE.Color(look.stone).multiplyScalar(0.82).getStyle(), { rough: 0.95 }),
    wood: mat('#9a6b47', { rough: 0.85 }),
    darkWood: mat('#5d3f2c', { rough: 0.85 }),
    metal: mat('#d7b45a', { rough: 0.35, metal: 0.6 }),
    iron: mat('#4c5560', { rough: 0.5, metal: 0.5 }),
    banner: mat(look.banner, { rough: 0.9 }),
    white: mat('#fbf7ee', { rough: 0.85 }),
    board: mat('#2f5d4a', { rough: 0.9 }),
    leaf: mat(look.leaf, { rough: 0.9 }),
    flower: look.flowers.map((c) => mat(c, { rough: 0.8 }))
  };
}

/** A window: frame, glass and a cross bar, set into a wall facing +Z (or rotated). */
function window(parent, P, [x, y, z], ry = 0, w = 0.75, h = 0.95, { arch = false, box: flowerBox = false, flowers = null } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  add(g, box(w + 0.18, h + 0.18, 0.1), P.trim, [0, 0, 0]);
  add(g, box(w, h, 0.06), windowMat, [0, 0, 0.04]);
  add(g, box(w, 0.06, 0.08), P.trim, [0, 0, 0.07]);
  add(g, box(0.06, h, 0.08), P.trim, [0, 0, 0.07]);
  add(g, box(w + 0.3, 0.08, 0.2), P.trim, [0, -h / 2 - 0.08, 0.08]);
  if (arch) add(g, new THREE.CylinderGeometry(w / 2 + 0.09, w / 2 + 0.09, 0.1, 10, 1, false, -Math.PI / 2, Math.PI), P.trim, [0, h / 2, 0], [Math.PI / 2, 0, 0]);
  if (flowerBox) {
    add(g, box(w + 0.2, 0.2, 0.25), P.wood, [0, -h / 2 - 0.25, 0.16]);
    for (let i = 0; i < 4; i++) add(g, ico(0.09), flowers[i % flowers.length], [-w / 2 + 0.1 + i * (w / 3.4), -h / 2 - 0.1, 0.2]);
  }
  parent.add(g);
  return g;
}

/** A door with a frame and two steps in front, facing +Z. */
function door(parent, P, [x, y, z], w = 1.0, h = 1.7, { arch = true, color = null } = {}) {
  add(parent, box(w + 0.3, h + 0.2, 0.14), P.trim, [x, y + h / 2 + 0.05, z]);
  add(parent, box(w, h, 0.1), color ?? P.darkWood, [x, y + h / 2, z + 0.06]);
  if (arch) add(parent, new THREE.CylinderGeometry(w / 2 + 0.15, w / 2 + 0.15, 0.14, 12, 1, false, -Math.PI / 2, Math.PI), P.trim, [x, y + h + 0.05, z], [Math.PI / 2, 0, 0]);
  add(parent, sphere(0.05, 6, 4), P.metal, [x + w * 0.32, y + h * 0.5, z + 0.14]);
  add(parent, box(w + 0.7, 0.14, 0.5), P.stone, [x, y + 0.07 - 0.14, z + 0.35]);
}

/** A lantern on a post (glass glows at night). */
export function lanternPost(parent, P, [x, y, z], h = 1.7) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  add(g, cyl(0.06, 0.08, h, 6), P.iron, [0, h / 2, 0]);
  add(g, box(0.28, 0.06, 0.28), P.iron, [0, h + 0.02, 0]);
  add(g, box(0.2, 0.28, 0.2), lampMat, [0, h + 0.2, 0]);
  add(g, cone(0.2, 0.18, 4), P.iron, [0, h + 0.43, 0], [0, Math.PI / 4, 0]);
  parent.add(g);
  return g;
}

/** The round stone plinth every building stands on, with steps to the path and two lanterns. */
function plinth(P, look) {
  const g = new THREE.Group();
  const seg = 22;
  // Courses of stone: alternating shades round the drum.
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const blockGeo = new THREE.CylinderGeometry(PLINTH_R, PLINTH_R + 0.08, PLINTH_H + 0.6, 2, 1, false, a0, (Math.PI * 2) / seg);
    add(g, blockGeo, i % 2 ? P.stone : P.stoneDark, [0, (PLINTH_H - 0.6) / 2, 0]);
  }
  add(g, cyl(PLINTH_R + 0.12, PLINTH_R + 0.12, 0.12, seg), P.stoneDark, [0, PLINTH_H - 0.02, 0]);
  add(g, cyl(PLINTH_R - 0.15, PLINTH_R - 0.15, 0.06, seg), mat(look.grass, { rough: 1 }), [0, PLINTH_H + 0.06, 0]);
  // Paving ring round the building.
  add(g, cyl(PLINTH_R - 0.6, PLINTH_R - 0.6, 0.07, seg), mat('#e9e0cc', { rough: 0.95 }), [0, PLINTH_H + 0.08, 0]);
  // Steps down to the path.
  for (let s = 0; s < 3; s++) add(g, box(2.4 - s * 0.1, 0.18, 0.5), P.stone, [0, PLINTH_H - 0.09 - s * 0.18, PLINTH_R + 0.15 + s * 0.45]);
  lanternPost(g, P, [-1.6, PLINTH_H, PLINTH_R - 0.35]);
  lanternPost(g, P, [1.6, PLINTH_H, PLINTH_R - 0.35]);
  // Flower beds at the rim.
  const r = seeded(look.grass.length * 31 + look.roof.math.charCodeAt(2));
  for (let i = 0; i < 18; i++) {
    const a = Math.PI * 0.25 + (i / 18) * Math.PI * 1.5 + (r() - 0.5) * 0.1;
    const rr = PLINTH_R - 0.4;
    if (Math.abs(Math.sin(a)) > 0.95 && Math.cos(a) > 0) continue;
    add(g, ico(0.14 + r() * 0.06), r() > 0.4 ? P.leaf : P.flower[i % P.flower.length], [Math.sin(a) * rr, PLINTH_H + 0.18, Math.cos(a) * rr]);
  }
  return g;
}

/* ---------------------------------------------------------------- math: the schoolhouse */

function schoolhouse(g, P, floor) {
  const tall = floor.n >= 4;
  const W = 6.2, D = 4.4, H = tall ? 4.6 : 3.1, y0 = PLINTH_H + 0.1;
  add(g, box(W + 0.3, 0.45, D + 0.3), P.stoneDark, [0, y0 + 0.22, -0.4]);
  add(g, box(W, H, D), P.wall, [0, y0 + 0.45 + H / 2, -0.4]);
  // Corner posts and a band between storeys.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, box(0.28, H, 0.28), P.trim, [sx * (W / 2 - 0.05), y0 + 0.45 + H / 2, -0.4 + sz * (D / 2 - 0.05)]);
  if (tall) add(g, box(W + 0.12, 0.16, D + 0.12), P.trim, [0, y0 + 0.45 + H / 2, -0.4]);
  const top = y0 + 0.45 + H;
  // Roof: a gable with thick eaves and a ridge.
  const rise = 2.0;
  add(g, gable(W + 0.02, D + 0.02, rise), P.wall, [0, top, -0.4]);
  const half = D / 2 + 0.45;
  const slope = Math.atan2(rise, D / 2);
  const len = half / Math.cos(slope);
  for (const s of [1, -1]) add(g, box(W + 0.7, 0.2, len), P.roof, [0, top + (rise * 0.5) - 0.02, -0.4 + s * (len * Math.cos(slope)) / 2 - s * 0.05], [s * slope, 0, 0]);
  add(g, box(W + 0.75, 0.22, 0.26), P.roofDark, [0, top + rise + 0.05, -0.4]);
  // The bell cupola on the ridge.
  const cy = top + rise - 0.1;
  add(g, box(1.1, 0.7, 1.1), P.wall, [0, cy + 0.35, -0.4]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, box(0.14, 0.9, 0.14), P.trim, [sx * 0.45, cy + 1.1, -0.4 + sz * 0.45]);
  add(g, box(1.25, 0.12, 1.25), P.trim, [0, cy + 1.6, -0.4]);
  add(g, cone(0.95, 1.1, 4), P.roof, [0, cy + 2.2, -0.4], [0, Math.PI / 4, 0]);
  add(g, sphere(0.1, 6, 4), P.metal, [0, cy + 2.8, -0.4]);
  const bell = new THREE.Group();
  bell.position.set(0, cy + 1.5, -0.4);
  bell.userData.live = true;
  add(bell, new THREE.CylinderGeometry(0.12, 0.3, 0.42, 10, 1, true), P.metal, [0, -0.24, 0]);
  add(bell, sphere(0.06, 6, 4), P.metal, [0, -0.48, 0]);
  g.add(bell);
  g.userData.bell = bell;
  // Chimney.
  add(g, box(0.55, 1.6, 0.55), P.stoneDark, [W / 2 - 1.1, top + 1.2, -1.4]);
  add(g, box(0.7, 0.14, 0.7), P.stone, [W / 2 - 1.1, top + 2.0, -1.4]);
  // Front: door, windows with flower boxes, a sign.
  const fz = -0.4 + D / 2 + 0.02;
  door(g, P, [0, y0 + 0.45, fz], 1.05, 1.8);
  for (const sx of [-1, 1]) {
    window(g, P, [sx * 1.9, y0 + 1.75, fz], 0, 0.9, 1.05, { box: true, flowers: P.flower });
    if (tall) window(g, P, [sx * 1.9, y0 + 3.75, fz], 0, 0.8, 0.9);
    window(g, P, [sx * (W / 2 + 0.02), y0 + 1.75, -0.4], (sx * Math.PI) / 2, 0.8, 1.0);
  }
  if (tall) window(g, P, [0, y0 + 3.75, fz], 0, 0.8, 0.9, { arch: true });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.55), new THREE.MeshStandardMaterial({ map: signTexture('1 + 2 = 3', { bg: '#2f5d4a', fg: '#fdfbf2', border: '#9a6b47', font: 'bold 46px "Comic Sans MS", "Nunito Variable", system-ui' }), roughness: 0.9 }));
  sign.position.set(0, y0 + 0.45 + 2.35, fz + 0.09);
  g.add(sign);
  // A chalkboard easel by the door, and a pennant on a pole.
  const easel = new THREE.Group();
  easel.position.set(2.65, PLINTH_H + 0.1, 2.6);
  easel.rotation.y = -0.5;
  add(easel, box(0.08, 1.4, 0.08), P.wood, [-0.45, 0.7, 0.1], [0.12, 0, 0]);
  add(easel, box(0.08, 1.4, 0.08), P.wood, [0.45, 0.7, 0.1], [0.12, 0, 0]);
  add(easel, box(0.08, 1.4, 0.08), P.wood, [0, 0.65, -0.25], [-0.3, 0, 0]);
  add(easel, box(1.1, 0.8, 0.06), P.board, [0, 1.0, 0.16], [0.12, 0, 0]);
  const chalk = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.7), new THREE.MeshBasicMaterial({ map: signTexture('2 × 3 = 6', { w: 256, h: 180, bg: '#2f5d4a', fg: '#f4f1e6', border: '#2f5d4a', font: '52px "Comic Sans MS", system-ui' }) }));
  chalk.position.set(0, 1.0, 0.2);
  chalk.rotation.x = 0.12;
  easel.add(chalk);
  g.add(easel);
  const pole = new THREE.Group();
  pole.position.set(-W / 2 - 0.4, PLINTH_H, 1.6);
  add(pole, cyl(0.05, 0.07, 4.2, 6), P.iron, [0, 2.1, 0]);
  add(pole, sphere(0.09, 6, 4), P.metal, [0, 4.25, 0]);
  const flag = new THREE.Group();
  flag.position.set(0, 3.8, 0);
  flag.userData.live = true;
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.35, 0, 0, -0.35, 0, 1.3, 0, 0], 3));
  fg.computeVertexNormals();
  add(flag, fg, mat(floor.look.banner, { rough: 0.9, side: THREE.DoubleSide }));
  pole.add(flag);
  g.add(pole);
  g.userData.flag = flag;
  // A bench and a little stack of books.
  bench(g, P, [-2.4, PLINTH_H + 0.1, 2.9], 0.3);
  return top + rise + 3;
}

function bench(g, P, [x, y, z], ry = 0) {
  const b = new THREE.Group();
  b.position.set(x, y, z);
  b.rotation.y = ry;
  add(b, box(1.4, 0.08, 0.4), P.wood, [0, 0.42, 0]);
  add(b, box(1.4, 0.3, 0.06), P.wood, [0, 0.7, -0.18]);
  for (const sx of [-0.6, 0.6]) add(b, box(0.08, 0.42, 0.36), P.iron, [sx, 0.21, 0]);
  g.add(b);
}

/* ---------------------------------------------------------------- history: the hall */

function hall(g, P, floor) {
  const dome = floor.n >= 3;
  const W = 6.6, D = 4.6, y0 = PLINTH_H + 0.1;
  // Stepped base.
  add(g, box(W + 0.8, 0.25, D + 0.8), P.stoneDark, [0, y0 + 0.12, -0.3]);
  add(g, box(W + 0.4, 0.25, D + 0.4), P.stone, [0, y0 + 0.37, -0.3]);
  const fy = y0 + 0.5;
  const H = dome ? 3.4 : 3.0;
  // The cella: a solid hall behind the columns.
  add(g, box(W - 1.0, H, D - 1.4), P.wall, [0, fy + H / 2, -0.9]);
  // Columns along the front and down the sides.
  const cols = floor.n >= 5 ? 6 : 4;
  const colGeo = cyl(0.2, 0.24, H - 0.3, 10);
  for (let i = 0; i < cols; i++) {
    const x = -W / 2 + 0.45 + (i * (W - 0.9)) / (cols - 1);
    add(g, colGeo, P.white, [x, fy + (H - 0.3) / 2 + 0.15, D / 2 - 0.55]);
    add(g, box(0.56, 0.16, 0.56), P.trim, [x, fy + 0.08, D / 2 - 0.55]);
    add(g, box(0.6, 0.18, 0.6), P.trim, [x, fy + H - 0.09, D / 2 - 0.55]);
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) {
    const z = D / 2 - 1.8 - i * 1.5;
    add(g, colGeo, P.white, [sx * (W / 2 - 0.45), fy + (H - 0.3) / 2 + 0.15, z]);
  }
  // Entablature and pediment.
  add(g, box(W + 0.2, 0.42, D + 0.2), P.trim, [0, fy + H + 0.21, -0.3]);
  add(g, box(W + 0.35, 0.12, D + 0.35), P.stone, [0, fy + H + 0.48, -0.3]);
  const ped = gable(D + 0.3, W + 0.3, 1.25);
  ped.rotateY(Math.PI / 2);
  add(g, ped, P.trim, [0, fy + H + 0.54, -0.3]);
  // Roof slabs over the pediment.
  const slope = Math.atan2(1.25, (W + 0.3) / 2);
  const len = (W + 0.9) / 2 / Math.cos(slope);
  for (const s of [1, -1]) add(g, box(len, 0.16, D + 0.6), P.roof, [s * (len * Math.cos(slope)) / 2, fy + H + 0.54 + 0.62, -0.3], [0, 0, -s * slope]);
  // A medallion in the pediment.
  add(g, cyl(0.35, 0.35, 0.08, 14), P.metal, [0, fy + H + 0.95, D / 2 - 0.12], [Math.PI / 2, 0, 0]);
  let top = fy + H + 1.8;
  if (dome) {
    add(g, cyl(1.5, 1.6, 0.6, 16), P.wall, [0, fy + H + 1.5, -0.6]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      window(g, P, [Math.sin(a) * 1.56, fy + H + 1.5, -0.6 + Math.cos(a) * 1.56], a, 0.28, 0.32);
    }
    add(g, new THREE.SphereGeometry(1.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), P.roof, [0, fy + H + 1.8, -0.6]);
    add(g, cyl(0.25, 0.3, 0.5, 8), P.trim, [0, fy + H + 3.55, -0.6]);
    add(g, cone(0.3, 0.5, 8), P.metal, [0, fy + H + 4.05, -0.6]);
    top = fy + H + 4.4;
  }
  // The great door, bronze, and windows on the cella.
  door(g, P, [0, fy, -0.9 + (D - 1.4) / 2 + 0.02], 1.25, 2.1, { color: mat('#8a6a3c', { rough: 0.5, metal: 0.4 }) });
  for (const sx of [-1, 1]) window(g, P, [sx * 1.65, fy + 1.6, -0.9 + (D - 1.4) / 2 + 0.03], 0, 0.6, 1.2, { arch: true });
  // Banners between the outer columns.
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 0.45 - (W - 0.9) / (cols - 1) / 2);
    add(g, box(0.62, 1.5, 0.04), P.banner, [x, fy + H - 1.1, D / 2 - 0.4]);
    add(g, cone(0.31, 0.3, 3), P.banner, [x, fy + H - 1.95, D / 2 - 0.4], [0, 0, Math.PI], [1, 1, 0.12]);
    add(g, box(0.08, 0.08, 0.08), P.metal, [x, fy + H - 1.0, D / 2 - 0.36]);
  }
  // An urn on a pedestal and a small obelisk.
  add(g, box(0.6, 0.8, 0.6), P.stone, [-W / 2 - 0.2, PLINTH_H + 0.4, 2.4]);
  const urn = new THREE.LatheGeometry([[0, 0], [0.22, 0.04], [0.32, 0.25], [0.26, 0.5], [0.14, 0.62], [0.2, 0.72], [0, 0.72]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
  add(g, urn, mat('#c8794a', { rough: 0.7 }), [-W / 2 - 0.2, PLINTH_H + 0.8, 2.4]);
  add(g, box(0.5, 0.25, 0.5), P.stoneDark, [W / 2 + 0.1, PLINTH_H + 0.12, 2.5]);
  add(g, cyl(0.12, 0.26, 1.9, 4), P.stone, [W / 2 + 0.1, PLINTH_H + 1.2, 2.5], [0, Math.PI / 4, 0]);
  add(g, cone(0.13, 0.3, 4), P.metal, [W / 2 + 0.1, PLINTH_H + 2.3, 2.5], [0, Math.PI / 4, 0]);
  return top + 1.2;
}

/* ---------------------------------------------------------------- physics: the observatory */

function observatory(g, P, floor) {
  const R = 2.0, H = 3.6 + Math.min(3, (floor.n - 1) * 0.5), y0 = PLINTH_H + 0.1;
  const tx = 1.2, tz = -0.7;
  add(g, cyl(R + 0.2, R + 0.3, 0.45, 14), P.stoneDark, [tx, y0 + 0.22, tz]);
  add(g, cyl(R, R + 0.08, H, 14), P.wall, [tx, y0 + 0.45 + H / 2, tz]);
  for (let b = 1; b <= Math.floor(H / 1.8); b++) add(g, cyl(R + 0.06, R + 0.06, 0.14, 14), P.trim, [tx, y0 + 0.45 + b * 1.8, tz]);
  // Round windows up the tower.
  for (let i = 0; i < Math.floor(H / 1.6); i++) {
    const a = 0.5 + i * 1.1;
    const w = window(g, P, [tx + Math.sin(a) * (R + 0.02), y0 + 1.6 + i * 1.5, tz + Math.cos(a) * (R + 0.02)], a, 0.5, 0.6, { arch: true });
    w.name = 'tower-window';
  }
  const top = y0 + 0.45 + H;
  add(g, cyl(R + 0.35, R + 0.25, 0.3, 16), P.trim, [tx, top + 0.15, tz]);
  // The dome turns slowly, its slit and telescope with it.
  const dome = new THREE.Group();
  dome.position.set(tx, top + 0.3, tz);
  dome.userData.live = true;
  add(dome, new THREE.SphereGeometry(R + 0.12, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), P.roof);
  add(dome, box(0.55, R + 0.4, 0.3), mat('#25304a', { rough: 0.6 }), [0, (R + 0.2) / 2 + 0.25, R * 0.62], [-0.75, 0, 0]);
  const scope = new THREE.Group();
  scope.position.set(0, R * 0.55, 0.4);
  scope.rotation.x = -0.8;
  add(scope, cyl(0.2, 0.26, 2.6, 10), P.metal, [0, 1.0, 0]);
  add(scope, cyl(0.28, 0.28, 0.14, 10), P.iron, [0, 2.3, 0]);
  dome.add(scope);
  for (const a of [0, 1, 2, 3]) add(dome, box(0.1, 0.06, R * 2.1), P.roofDark, [0, R * 0.55, 0], [0, a * Math.PI / 4, 0]);
  g.add(dome);
  g.userData.dome = dome;
  // The lab wing with tall windows and a glass roof light.
  const lw = 3.6, ld = 3.2, lh = 2.6;
  const lx = -1.6, lz = 0.2;
  add(g, box(lw, lh, ld), P.wall, [lx, y0 + 0.45 + lh / 2, lz]);
  add(g, box(lw + 0.35, 0.22, ld + 0.35), P.roof, [lx, y0 + 0.45 + lh + 0.11, lz]);
  add(g, new THREE.CylinderGeometry(0.01, 1.1, 0.8, 4), mat('#bfe6ef', { rough: 0.1, metal: 0.2, opacity: 0.55, key: 'glass' }), [lx, y0 + 0.45 + lh + 0.62, lz], [0, Math.PI / 4, 0]);
  door(g, P, [lx + 0.6, y0 + 0.45, lz + ld / 2 + 0.02], 0.95, 1.75, { arch: false, color: mat('#3f6f8f', { rough: 0.6 }) });
  window(g, P, [lx - 0.9, y0 + 1.75, lz + ld / 2 + 0.02], 0, 0.9, 1.4);
  window(g, P, [lx - lw / 2 - 0.02, y0 + 1.75, lz], -Math.PI / 2, 1.2, 1.2);
  // A weather vane with spinning cups on the lab roof.
  const vane = new THREE.Group();
  vane.position.set(lx - 1.1, y0 + 0.45 + lh + 0.2, lz - 0.8);
  add(vane, cyl(0.04, 0.04, 1.3, 5), P.iron, [0, 0.65, 0]);
  const cups = new THREE.Group();
  cups.position.y = 1.3;
  cups.userData.live = true;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    add(cups, box(0.5, 0.03, 0.03), P.iron, [Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25], [0, -a, 0]);
    add(cups, sphere(0.09, 6, 4), P.metal, [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5]);
  }
  vane.add(cups);
  g.add(vane);
  g.userData.cups = cups;
  // An orrery by the steps: a golden sun and planets on rings.
  const orrery = new THREE.Group();
  orrery.position.set(2.9, PLINTH_H + 0.1, 2.5);
  add(orrery, cyl(0.25, 0.35, 0.9, 8), P.stone, [0, 0.45, 0]);
  const spin = new THREE.Group();
  spin.position.y = 1.25;
  spin.userData.live = true;
  add(spin, sphere(0.28, 12, 8), mat('#ffcf4d', { rough: 0.4, emissive: '#ffb020', ei: 0.4 }));
  const planets = [['#6fb3ff', 0.55, 0.09], ['#ff8a5b', 0.85, 0.11], ['#b6e388', 1.15, 0.08]];
  planets.forEach(([c, rr, s], i) => {
    const arm = new THREE.Group();
    arm.rotation.y = i * 2.1;
    add(arm, box(rr, 0.02, 0.02), P.metal, [rr / 2, 0, 0]);
    add(arm, sphere(s, 8, 6), mat(c, { rough: 0.6 }), [rr, 0, 0]);
    arm.userData.speed = 1.2 / (i + 1);
    spin.add(arm);
  });
  orrery.add(spin);
  g.add(orrery);
  g.userData.orrery = spin;
  if (floor.look.crystals) crystals(g, [[-3.3, 2.4], [3.6, -1.8]]);
  return top + R + 2.2;
}

/** A cluster of glowing crystals (the Crystal Ledge floor). */
export function crystals(g, spots, color = '#b48cff') {
  const m = mat(color, { rough: 0.25, metal: 0.1, emissive: '#8f5cff', ei: 0.35, key: 'crystal' });
  const r = seeded(spots.length * 13);
  for (const [x, z] of spots) {
    for (let i = 0; i < 4; i++) {
      const h = 0.6 + r() * 1.1;
      add(g, cone(0.14 + r() * 0.1, h, 5), m, [x + (r() - 0.5) * 0.6, PLINTH_H + h / 2, z + (r() - 0.5) * 0.6], [(r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5]);
    }
  }
}

/* ---------------------------------------------------------------- themed shapes */

/** A stepped pyramid with a shady porch (the desert's math school). */
function pyramid(g, P) {
  const y0 = PLINTH_H + 0.1;
  for (let i = 0; i < 6; i++) {
    const w = 7.4 - i * 1.15;
    add(g, box(w, 0.75, w), i % 2 ? P.wall : P.stone, [0, y0 + 0.37 + i * 0.75, -0.6]);
  }
  add(g, cone(0.65, 1.0, 4), mat('#ffd23f', { metal: 0.6 }), [0, y0 + 5.0, -0.6], [0, Math.PI / 4, 0]);
  // Porch with two columns and the door.
  add(g, box(3.2, 0.25, 1.6), P.roof, [0, y0 + 2.5, 2.9]);
  for (const sx of [-1.3, 1.3]) add(g, cyl(0.18, 0.2, 2.3, 8), P.trim, [sx, y0 + 1.2, 3.4]);
  door(g, P, [0, y0, 3.05], 1.1, 1.9, { arch: false, color: mat('#3f6fa8') });
  for (const sx of [-1, 1]) add(g, box(0.9, 0.9, 0.08), mat('#3f6fa8'), [sx * 2.4, y0 + 1.5, 3.12]);
  for (const sx of [-1, 1]) window(g, P, [sx * 2.4, y0 + 1.5, 3.17], 0, 0.45, 0.5);
  return y0 + 7;
}

/** A house in a giant mushroom: a fat stem with a door, a spotted cap. */
function mushroomHouse(g, P, floor, subject) {
  const y0 = PLINTH_H + 0.1;
  const big = subject === 'history';
  const R = big ? 2.6 : 2.2, H = big ? 4.2 : 3.4;
  add(g, cyl(R * 0.92, R, H, 16), P.wall, [0, y0 + H / 2, -0.3]);
  const cap = new THREE.SphereGeometry(R * 1.75, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.scale(1, 0.75, 1);
  add(g, cap, P.roof, [0, y0 + H - 0.3, -0.3]);
  add(g, cyl(R * 1.75, R * 1.6, 0.25, 20), P.roofDark, [0, y0 + H - 0.35, -0.3]);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, rr = (i % 3) * 0.9 + 0.6;
    add(g, sphere(0.32 + (i % 2) * 0.12, 8, 6), P.white, [Math.cos(a) * rr * (R / 2.2), y0 + H - 0.3 + R * 1.75 * 0.75 * Math.sqrt(Math.max(0, 1 - (rr / (R * 1.75)) ** 2)), -0.3 + Math.sin(a) * rr * (R / 2.2)], [0, 0, 0], [1, 0.45, 1]);
  }
  door(g, P, [0, y0, -0.3 + R * 0.95], 1.0, 1.75, { color: mat('#8a5e3c') });
  for (const a of [-0.9, 0.9]) window(g, P, [Math.sin(a) * R * 0.96, y0 + 2.0, -0.3 + Math.cos(a) * R * 0.96], a, 0.6, 0.6, { arch: true });
  return y0 + H + R * 1.4;
}

/** A dome of snow blocks with a tunnel door and a little chimney. */
function igloo(g, P, floor, subject) {
  const y0 = PLINTH_H + 0.1;
  const R = subject === 'history' ? 3.3 : 2.8;
  const ice = mat('#ffffff'), iceBlue = mat('#dcefff');
  for (let row = 0; row < 6; row++) {
    const a0 = (row / 6) * (Math.PI / 2), a1 = ((row + 1) / 6) * (Math.PI / 2);
    add(g, new THREE.SphereGeometry(R, 18, 1, 0, Math.PI * 2, Math.PI / 2 - a1, a1 - a0), row % 2 ? ice : iceBlue, [0, y0, -0.4]);
  }
  add(g, new THREE.CylinderGeometry(1.0, 1.0, 1.8, 12, 1, false, -Math.PI / 2, Math.PI), ice, [0, y0, R * 0.85], [Math.PI / 2, 0, 0]);
  add(g, box(1.9, 1.0, 1.8), ice, [0, y0 + 0.5, R * 0.85]);
  door(g, P, [0, y0, R * 0.85 + 0.92], 0.9, 1.4, { color: mat('#7cc6ff') });
  add(g, cyl(0.25, 0.3, 1.0, 8), P.roof, [R * 0.4, y0 + R * 0.85, -0.8]);
  window(g, P, [-R * 0.62, y0 + 1.4, -0.4 + R * 0.62], -0.8, 0.5, 0.5, { arch: true });
  return y0 + R + 1.5;
}

/** A house made of clouds, with a rainbow door and puff towers. */
function cloudHouse(g, P) {
  const y0 = PLINTH_H + 0.1;
  const puff = mat('#ffffff'), pink = mat('#ffe3f4');
  add(g, box(5.4, 2.8, 3.8), puff, [0, y0 + 1.4, -0.5]);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(g, sphere(1.2 + (i % 3) * 0.2, 14, 10), i % 2 ? puff : pink, [Math.cos(a) * 2.6, y0 + 2.8 + (i % 2) * 0.4, -0.5 + Math.sin(a) * 1.7]);
  }
  add(g, sphere(1.8, 16, 12), puff, [0, y0 + 3.8, -0.5]);
  for (const sx of [-2.4, 2.4]) {
    add(g, cyl(0.7, 0.8, 3.4, 12), pink, [sx, y0 + 1.7, 1.2]);
    add(g, cone(0.9, 1.3, 12), P.roof, [sx, y0 + 4.0, 1.2]);
  }
  const bands = ['#ff6f6f', '#ffb347', '#ffe066', '#7ee08a', '#7cc6ff', '#9b7be0'];
  bands.forEach((c, i) => add(g, new THREE.TorusGeometry(0.95 - i * 0.07, 0.06, 6, 18, Math.PI), mat(c), [0, y0 + 1.9, 1.42]));
  door(g, P, [0, y0, 1.42], 1.0, 1.8, { arch: false, color: mat('#ffd23f') });
  for (const sx of [-1.5, 1.5]) window(g, P, [sx, y0 + 1.6, 1.43], 0, 0.6, 0.7, { arch: true });
  return y0 + 6;
}

/** A spiral seashell house (the harbor's math school). */
function shell(g, P) {
  const y0 = PLINTH_H + 0.1;
  const shellM = mat('#ffd6c9'), stripe = mat('#ff9a8a');
  for (let i = 0; i < 9; i++) {
    const r = 2.9 - i * 0.3;
    add(g, new THREE.TorusGeometry(r, 0.55 - i * 0.04, 8, 20), i % 2 ? shellM : stripe, [0, y0 + 0.5 + i * 0.55, -0.6], [Math.PI / 2, 0, i * 0.4]);
  }
  add(g, cyl(2.6, 2.9, 1.2, 20), shellM, [0, y0 + 0.6, -0.6]);
  add(g, cone(0.5, 1.5, 12), stripe, [0, y0 + 5.6, -0.6]);
  door(g, P, [0, y0, 2.25], 1.0, 1.7, { color: mat('#3f7fd6') });
  for (const sx of [-1.4, 1.4]) window(g, P, [sx, y0 + 1.6, 2.1], sx * -0.3, 0.5, 0.55, { arch: true });
  add(g, sphere(0.35, 10, 8), mat('#fff6f0', { metal: 0.3 }), [2.2, y0 + 0.4, 2.6]);
  return y0 + 7;
}

/** A striped lighthouse with a turning lamp (the harbor's physics lab). */
function lighthouse(g, P) {
  const y0 = PLINTH_H + 0.1;
  const red = mat('#ff5f5f'), white = mat('#ffffff');
  for (let i = 0; i < 5; i++) add(g, cyl(1.7 - i * 0.18, 1.88 - i * 0.18, 1.4, 16), i % 2 ? red : white, [0, y0 + 0.7 + i * 1.4, -0.6]);
  const top = y0 + 7;
  add(g, cyl(1.4, 1.4, 0.2, 16), mat('#4c5560'), [0, top + 0.1, -0.6]);
  add(g, cyl(0.95, 0.95, 1.3, 12), mat('#fff3b0', { emissive: '#ffd36b', ei: 0.6 }), [0, top + 0.85, -0.6]);
  add(g, cone(1.2, 1.1, 12), red, [0, top + 2.0, -0.6]);
  const beam = new THREE.Group();
  beam.position.set(0, top + 0.85, -0.6);
  beam.userData.live = true;
  add(beam, new THREE.ConeGeometry(1.4, 7, 12, 1, true), mat('#fff6c8', { opacity: 0.25, key: 'beam', emissive: '#fff1a0', ei: 1 }), [4, 0, 0], [0, 0, Math.PI / 2]);
  g.add(beam);
  g.userData.beam = beam;
  door(g, P, [0, y0, 1.25], 0.95, 1.7, { color: mat('#3f7fd6') });
  for (let i = 1; i < 4; i++) window(g, P, [0, y0 + 1.6 + i * 1.3, -0.6 + 1.8 - i * 0.17], 0, 0.42, 0.5, { arch: true });
  // A little lab shed beside it.
  add(g, box(2.6, 2.2, 2.4), P.wall, [-2.6, y0 + 1.1, 0.2]);
  add(g, box(3.0, 0.2, 2.8), P.roof, [-2.6, y0 + 2.3, 0.2]);
  window(g, P, [-2.6, y0 + 1.3, 1.42], 0, 0.9, 0.8);
  return top + 3;
}

/** A moon-base module: a white drum, a glass dome, an airlock and an antenna. */
function moonDome(g, P, floor, subject) {
  const y0 = PLINTH_H + 0.1;
  const R = subject === 'history' ? 3.2 : 2.7;
  const shellM = mat('#f4f6fb'), panel = mat(P.roof.color.getStyle());
  add(g, cyl(R, R + 0.2, 1.6, 20), shellM, [0, y0 + 0.8, -0.5]);
  add(g, cyl(R + 0.05, R + 0.05, 0.25, 20), panel, [0, y0 + 1.5, -0.5]);
  add(g, new THREE.SphereGeometry(R, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#bfe9ff', { opacity: 0.55, key: 'moonglass', emissive: '#7cc6ff', ei: 0.2 }), [0, y0 + 1.6, -0.5]);
  add(g, sphere(R * 0.45, 12, 8), mat(subject === 'math' ? '#ffd23f' : '#7ee08a'), [0, y0 + 2.0, -0.5]);
  add(g, box(1.6, 1.8, 1.6), shellM, [0, y0 + 0.9, R - 0.1]);
  door(g, P, [0, y0, R + 0.72], 0.95, 1.5, { arch: false, color: panel });
  for (let i = 0; i < 6; i++) add(g, box(0.5, 0.06, 0.06), mat('#7ff7ff', { emissive: '#3fe0ff', ei: 0.8 }), [Math.cos(i) * R * 0.9, y0 + 1.2, -0.5 + Math.sin(i) * R * 0.9]);
  add(g, cyl(0.05, 0.05, 2.2, 6), mat('#9aa3b5'), [R * 0.7, y0 + 2.6, -1.4]);
  add(g, new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#ffffff'), [R * 0.7, y0 + 3.8, -1.4], [-0.8, 0, 0]);
  return y0 + R + 3;
}

/** A round log treehouse: a drum of logs, a shaggy three-tier leaf roof, a crooked chimney, leaf tufts at the eaves. */
function treehouse(g, P, floor, subject) {
  const y0 = PLINTH_H + 0.1;
  const big = subject === 'history';
  const R = big ? 2.9 : 2.5, H = big ? 3.6 : 3.1, z0 = -0.3;
  add(g, cyl(R - 0.08, R - 0.08, H, 18), P.wall, [0, y0 + H / 2, z0]);
  const logs = 22;
  for (let i = 0; i < logs; i++) {
    const a = (i / logs) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) > 0) continue; // leave the doorway open
    add(g, cyl(0.24, 0.27, H + (i % 3) * 0.12, 6), i % 2 ? P.wood : P.darkWood, [Math.sin(a) * R, y0 + H / 2, z0 + Math.cos(a) * R]);
  }
  add(g, cyl(R + 0.4, R + 0.4, 0.26, 20), P.darkWood, [0, y0 + H + 0.05, z0]);
  add(g, cone(R + 1.4, 2.3, 14), P.roof, [0, y0 + H + 1.25, z0]);
  add(g, cone(R + 0.6, 2.0, 14), P.roofDark, [0, y0 + H + 2.6, z0], [0, 0.2, 0]);
  add(g, cone(R * 0.5, 1.5, 10), P.roof, [0, y0 + H + 3.9, z0], [0, 0, 0.12]);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    add(g, ico(0.42 + (i % 3) * 0.08), P.leaf, [Math.sin(a) * (R + 1.25), y0 + H + 0.15, z0 + Math.cos(a) * (R + 1.25)]);
  }
  add(g, box(0.55, 1.8, 0.55), P.stoneDark, [R * 0.55, y0 + H + 2.4, z0 - 0.7], [0, 0.3, 0.14]);
  add(g, box(0.7, 0.18, 0.7), P.stone, [R * 0.55 + 0.12, y0 + H + 3.32, z0 - 0.7], [0, 0.3, 0.14]);
  door(g, P, [0, y0, z0 + R + 0.06], 1.0, 1.8, { color: mat('#8a5e3c') });
  for (const a of [-0.95, 0.95]) window(g, P, [Math.sin(a) * (R + 0.12), y0 + 1.9, z0 + Math.cos(a) * (R + 0.12)], a, 0.6, 0.7, { arch: true, box: true, flowers: P.flower });
  // A little sign-board with the floor's colour over the door.
  add(g, box(1.6, 0.4, 0.12), P.banner, [0, y0 + 2.35, z0 + R + 0.32]);
  return y0 + H + 4.8;
}

const SHAPES = { seedpod: seedPod, roothall: rootHall, starspire: starSpire, treehouse, house: schoolhouse, hall, tower: observatory, pyramid, mushroom: mushroomHouse, igloo, cloudhouse: cloudHouse, shell, lighthouse, dome: moonDome };
const BUILDERS = { math: schoolhouse, history: hall, physics: observatory };
export { door, window, lanternPost as lantern, palette, bench };
/** The schools' names in the current language (ui.js building.*). */
export const BUILDING_NAMES = {
  get math() {
    return tr('building.math');
  },
  get history() {
    return tr('building.history');
  },
  get physics() {
    return tr('building.physics');
  }
};
export const SUBJECT_ICONS = { math: '🔢', history: '🏛️', physics: '🔭' };

/**
 * One building on its plinth, batched.
 * @returns {THREE.Group} with userData: { subject, floor, top, update(dt, t) }
 */
export function buildBuilding(subject, floor, at) {
  const P = palette(floor.look, subject);
  const g = new THREE.Group();
  g.position.set(at.x, at.y - 0.55 + 0.0, at.z);
  // The Great Tree grows its own: a mossy disc of living wood instead of the stone drum.
  g.add(floor.look.grown ? rootPlinth(P, floor.look) : plinth(P, floor.look));
  const shape = floor.look.shapes?.[subject];
  const top = (SHAPES[shape] ?? BUILDERS[subject])(g, P, floor, subject);
  batch(g);
  g.userData.subject = subject;
  g.userData.floor = floor.n;
  g.userData.top = top;
  const { bell, flag, dome, cups, orrery, beam } = g.userData;
  g.userData.update = (dt, t) => {
    if (bell) bell.rotation.z = Math.sin(t * 1.3 + floor.n) * 0.05;
    if (flag) flag.rotation.y = Math.sin(t * 2.2 + floor.n) * 0.35;
    if (dome) dome.rotation.y = Math.sin(t * 0.08 + floor.n) * 0.6;
    if (cups) cups.rotation.y += dt * 3;
    if (orrery) for (const arm of orrery.children) if (arm.userData.speed) arm.rotation.y += dt * arm.userData.speed;
    if (beam) beam.rotation.y += dt * 0.8;
  };
  return g;
}
