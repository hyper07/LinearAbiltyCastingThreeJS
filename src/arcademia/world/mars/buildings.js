/**
 * Habitats for Mars (original designs, a toy look: white and terracotta
 * shells printed in layers from Martian soil, teal and sunny-yellow trim,
 * inflatable pods, glowing portholes).
 *
 *   Math     the Dome Lab: a tall dome 3D-printed in rings of red soil, a
 *            glass skylight, round windows, a printed arch porch with a teal
 *            hatch and a "123" badge, and a little printer arm on a gantry
 *            still printing a baby dome beside it
 *   History  the Mars Museum: a round hab with a band of windows, a landing
 *            capsule on its roof (heat shield, portholes, a striped
 *            parachute pack), a porch on two printed pillars under a round
 *            red-planet badge, and a meteorite in a glass case by the door
 *   Physics  the Weather Lab: a rounded white module with a teal band, big
 *            solar wings, a weather mast with spinning anemometer cups and a
 *            wind vane, and a radar dish
 *
 * The smaller places stand under inflatable pressurised tents (teal arches,
 * a striped top). Each terrace's middle has a landmark: a landing site, a
 * rover garage, an ice drill, a greenhouse dome, a weather station, a
 * dust-devil viewpoint and a caldera lookout. The shared models — the steel
 * Big Rocket, the six-wheeled rover, the helicopter drone — are scaled for
 * the giants on the plain (mars/scene.js). `marsGate` (the same API as
 * structures.js buildGate) shuts the stairs to a locked terrace.
 *
 * Same contract as buildings.js shapes: origin at the plinth's centre at
 * walking level, the door faces +Z, the function returns the top's height.
 */
import * as THREE from 'three';
import { add, batch, box, cone, cyl, ico, mat, paint, seeded, sphere, vcMat } from '../kit.js';
import { windowMat, lampMat } from '../buildings.js';
import { tmat, tile } from '../moon/buildings.js';

const PLINTH_R = 4.6, PLINTH_H = 0.55;
const TAU = Math.PI * 2;

/** Mars's colours: printed red soil, chalk-white shells, teal and yellow for the friendly bits. */
export const MARS = {
  white: '#fbf6f0', shell: '#f1e6da', terra: '#d9744a', terraLight: '#e89466', terraDark: '#b65a39', soil: '#c8673f',
  teal: '#2fb5ad', tealDark: '#1f8f89', yellow: '#ffc83d', steel: '#c9cfd8', dark: '#3b3340', solar: '#2b3f8c', red: '#ff5f5f'
};
const white = () => mat(MARS.white, { rough: 0.6 });
const shell = () => mat(MARS.shell, { rough: 0.7 });
const teal = () => mat(MARS.teal, { rough: 0.55 });
const yellow = () => mat(MARS.yellow, { rough: 0.5 });
const steel = () => mat(MARS.steel, { rough: 0.35, metal: 0.6 });
const dark = () => mat(MARS.dark, { rough: 0.6 });
const glass = () => mat('#bfe9ff', { opacity: 0.32, key: 'marsglass' });

/** Printed layers: a geometry painted in thin horizontal rings of two soil shades. */
function printed(geo, a = MARS.terraLight, b = MARS.terra, step = 0.16) {
  const A = new THREE.Color(a), B = new THREE.Color(b);
  return paint(geo, (x, y) => (Math.floor(y / step) % 2 ? A : B));
}

/* ---------------------------------------------------------------- badges and small parts */

const badges = new Map();
/** A round badge texture: '123', 'planet' (a red planet with two little moons), 'drop' (a weather drop and sun). */
function badgeTexture(kind, color) {
  const key = `${kind}|${color}`;
  if (badges.has(key)) return badges.get(key);
  const N = 256, m = N / 2;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.beginPath();
  g.arc(m, m, m, 0, TAU);
  g.fill();
  g.fillStyle = '#fff8ee';
  g.beginPath();
  g.arc(m, m, m - 20, 0, TAU);
  g.fill();
  if (kind === 'numbers') {
    g.fillStyle = MARS.terraDark;
    g.font = '900 92px "Nunito Variable", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('123', m, m + 6);
  } else if (kind === 'planet') {
    g.fillStyle = MARS.terra;
    g.beginPath();
    g.arc(m - 6, m + 6, 62, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(140,60,35,0.6)';
    for (const [x, y, r] of [[100, 120, 12], [150, 150, 9], [110, 170, 7], [140, 100, 6]]) {
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(m - 6, m - 50, 22, 8, 0, 0, TAU);
    g.fill();
    g.fillStyle = '#9a8f88';
    g.beginPath();
    g.arc(200, 70, 12, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(214, 120, 7, 0, TAU);
    g.fill();
  } else {
    // A sun, a cloud and a little wind swirl: the weather.
    g.fillStyle = MARS.yellow;
    g.beginPath();
    g.arc(100, 100, 34, 0, TAU);
    g.fill();
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#9ccfe0';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(130, 150, 30, 0, TAU);
    g.arc(170, 140, 36, 0, TAU);
    g.arc(200, 160, 24, 0, TAU);
    g.fill();
    g.strokeStyle = MARS.teal;
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(60, 190);
    g.quadraticCurveTo(120, 170, 160, 200);
    g.stroke();
  }
  g.strokeStyle = color;
  g.lineWidth = 6;
  g.beginPath();
  g.arc(m, m, m - 24, 0, TAU);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  badges.set(key, tex);
  return tex;
}
function badge(g, kind, [x, y, z], r, color, tilt = 0) {
  const q = new THREE.Group();
  q.position.set(x, y, z);
  q.rotation.x = -tilt;
  add(q, new THREE.CylinderGeometry(r + 0.1, r + 0.1, 0.1, 32), white(), [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(q, new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ map: badgeTexture(kind, color) }), [0, 0, 0.056]);
  g.add(q);
}
/** A round porthole facing +Z (rotate with ry): a white ring round glowing glass. */
function porthole(g, [x, y, z], ry = 0, r = 0.32, ring = white()) {
  const q = new THREE.Group();
  q.position.set(x, y, z);
  q.rotation.y = ry;
  add(q, new THREE.TorusGeometry(r, 0.07, 6, 18), ring);
  add(q, new THREE.CircleGeometry(r, 18), windowMat, [0, 0, -0.01]);
  g.add(q);
}
/** An antenna mast with a glowing tip. */
function antenna(g, [x, y, z], h = 1.6) {
  add(g, cyl(0.04, 0.06, h, 6), steel(), [x, y + h / 2, z]);
  add(g, sphere(0.1, 10, 8), lampMat, [x, y + h + 0.06, z]);
}
/** A solar panel wing on a post, tilted up. */
function solarWing(g, [x, y, z], yaw = 0, w = 2.2, d = 1.1, h = 1.0) {
  const q = new THREE.Group();
  q.position.set(x, y, z);
  q.rotation.y = yaw;
  add(q, cyl(0.06, 0.06, h, 6), steel(), [0, h / 2, 0]);
  add(q, box(w + 0.1, 0.06, d + 0.1), white(), [0, h, 0], [0.5, 0, 0]);
  add(q, tile(new THREE.PlaneGeometry(w, d), 2, 1), tmat('solar', MARS.solar), [0, h + 0.04, 0.02], [-Math.PI / 2 + 0.5, 0, 0]);
  g.add(q);
}
/** A round hatch facing +Z: a coloured collar, a teal door with a porthole, a yellow handle. */
function hatch(g, [x, y, z], r = 0.95, color = MARS.terra) {
  add(g, new THREE.TorusGeometry(r + 0.06, 0.14, 8, 28), mat(color), [x, y + r, z]);
  add(g, new THREE.CircleGeometry(r, 28), teal(), [x, y + r, z - 0.02]);
  add(g, new THREE.TorusGeometry(0.26, 0.05, 6, 16), white(), [x, y + r + 0.32, z + 0.02]);
  add(g, new THREE.CircleGeometry(0.26, 16), windowMat, [x, y + r + 0.32, z + 0.01]);
  add(g, box(0.5, 0.08, 0.08), yellow(), [x, y + r - 0.25, z + 0.04]);
}
/** A little pennant on a pole: two colours and a star, no real flags. */
function pennant(g, [x, y, z], color, h = 2.2) {
  add(g, cyl(0.035, 0.04, h, 6), steel(), [x, y + h / 2, z]);
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(1.0, -0.25);
  s.lineTo(0, -0.5);
  const flag = add(g, new THREE.ShapeGeometry(s), mat(color, { side: THREE.DoubleSide }), [x + 0.03, y + h - 0.05, z]);
  add(g, sphere(0.08, 8, 6), yellow(), [x, y + h + 0.04, z]);
  return flag;
}

/* ---------------------------------------------------------------- the plinth */

/** A printed pad: a drum of red-soil layers, a cream top with a coloured ring, yellow lights, a ramp to the door. */
export function marsPlinth(P, look) {
  const g = new THREE.Group();
  const R = PLINTH_R;
  add(g, printed(new THREE.CylinderGeometry(R, R + 0.14, PLINTH_H, 48, 4), MARS.terraLight, MARS.terra, 0.14), vcMat({ key: 'marsprint' }), [0, PLINTH_H / 2, 0]);
  add(g, cyl(R - 0.06, R - 0.06, 0.05, 48), mat('#f6eadc', { rough: 0.8 }), [0, PLINTH_H + 0.02, 0]);
  add(g, new THREE.TorusGeometry(R - 0.5, 0.06, 4, 48), mat(look.banner), [0, PLINTH_H + 0.05, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.31;
    if (Math.cos(a) > 0.9) continue;
    add(g, cyl(0.09, 0.11, 0.12, 8), lampMat, [Math.sin(a) * (R - 0.22), PLINTH_H + 0.08, Math.cos(a) * (R - 0.22)]);
  }
  add(g, box(2.4, 0.1, 1.3), mat('#f2dcc6', { rough: 0.8 }), [0, PLINTH_H / 2 - 0.02, R + 0.55], [0.4, 0, 0]);
  for (const sx of [-1.25, 1.25]) add(g, box(0.08, 0.08, 1.3), yellow(), [sx, PLINTH_H / 2 + 0.25, R + 0.55], [0.4, 0, 0]);
  return g;
}

/* ---------------------------------------------------------------- math: the printed dome */

export function printDome(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.04, z0 = -0.5, R = 3.1;
  // A tall dome, printed ring by ring (a slightly pointed egg: the shape a printer can build without props).
  const prof = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    prof.push(new THREE.Vector2(Math.max(0.001, R * Math.cos(t * Math.PI / 2) ** 0.85), 4.6 * Math.sin(t * Math.PI / 2)));
  }
  const dome = printed(new THREE.LatheGeometry(prof, 40), MARS.terraLight, MARS.terra, 0.2);
  add(g, dome, vcMat({ key: 'marsprint' }), [0, y0, z0]);
  add(g, new THREE.TorusGeometry(R + 0.02, 0.16, 8, 48), mat(look.roof.math), [0, y0 + 0.12, z0], [Math.PI / 2, 0, 0]);
  // A glass skylight on top, an antenna.
  add(g, new THREE.SphereGeometry(0.72, 20, 10, 0, TAU, 0, Math.PI / 2), windowMat, [0, y0 + 4.42, z0]);
  add(g, new THREE.TorusGeometry(0.74, 0.08, 6, 24), white(), [0, y0 + 4.44, z0], [Math.PI / 2, 0, 0]);
  antenna(g, [0.9, y0 + 3.9, z0 - 0.4], 1.4);
  // Round windows round the dome.
  for (const a of [-1.0, 1.0, -1.9, 1.9, Math.PI]) {
    const r = R * Math.cos(0.42) ** 0.85;
    porthole(g, [Math.sin(a) * (r + 0.02), y0 + 1.95, z0 + Math.cos(a) * (r + 0.02)], a, 0.32);
  }
  // The printed arch porch with its hatch, the "123" badge above.
  const pz = z0 + R - 0.1;
  const arch = new THREE.CylinderGeometry(1.15, 1.15, 1.6, 28, 6, false, -Math.PI / 2, Math.PI);
  arch.rotateX(Math.PI / 2);
  arch.rotateZ(Math.PI / 2);
  add(g, printed(arch, MARS.shell, '#e9d8c6', 0.16), vcMat({ key: 'marsprint' }), [0, y0 + 0.95, pz + 0.5], [0, 0, 0]);
  add(g, box(2.3, 0.95, 1.6), shell(), [0, y0 + 0.47, pz + 0.5]);
  hatch(g, [0, y0 + 0.05, pz + 1.32], 0.85, look.roof.math);
  badge(g, 'numbers', [0, y0 + 3.0, z0 + R * 0.83], 0.62, look.roof.math, 0.5);
  // The printer: a gantry over a baby dome, half printed, its nozzle at work.
  const gx = 3.4, gz = z0 - 0.4;
  for (const sz of [-1, 1]) add(g, box(0.14, 2.6, 0.14), yellow(), [gx, y0 + 1.3, gz + sz * 1.1]);
  add(g, box(0.18, 0.18, 2.5), yellow(), [gx, y0 + 2.6, gz]);
  add(g, box(0.4, 0.5, 0.4), white(), [gx, y0 + 2.3, gz + 0.2]);
  add(g, cone(0.1, 0.35, 8), dark(), [gx, y0 + 1.95, gz + 0.2], [Math.PI, 0, 0]);
  add(g, printed(new THREE.SphereGeometry(0.95, 24, 8, 0, TAU, Math.PI / 2 - 0.9, 0.9).translate(0, -0.85, 0), MARS.terraLight, MARS.terra, 0.12), vcMat({ key: 'marsprint' }), [gx, y0 + 0.9, gz + 0.2]);
  // Counting blocks by the porch.
  ['#ff6b6b', '#ffd23f', '#4fc3f7'].forEach((c, i) => add(g, box(0.45, 0.45, 0.45), mat(c), [-2.3 - (i % 2) * 0.5, y0 + 0.22 + (i === 2 ? 0.45 : 0), 2.4], [0, 0.3 * i, 0]));
  return y0 + 6.4;
}

/* ---------------------------------------------------------------- history: the Mars museum */

export function marsMuseum(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.04, z0 = -0.6, R = 3.0, H = 2.5;
  // The round hab: printed below, a white shell above, a long window band (the gallery).
  add(g, printed(new THREE.CylinderGeometry(R + 0.05, R + 0.15, 0.9, 44, 4), MARS.terraLight, MARS.terra, 0.15), vcMat({ key: 'marsprint' }), [0, y0 + 0.45, z0]);
  add(g, cyl(R, R, H - 0.9, 44), shell(), [0, y0 + 0.9 + (H - 0.9) / 2, z0]);
  add(g, cyl(R + 0.06, R + 0.06, 0.22, 44), mat(look.roof.history), [0, y0 + H - 0.1, z0]);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU;
    if (Math.cos(a) > 0.6) continue;
    add(g, box(0.5, 0.75, 0.06), windowMat, [Math.sin(a) * (R + 0.02), y0 + 1.6, z0 + Math.cos(a) * (R + 0.02)], [0, a, 0]);
  }
  add(g, new THREE.SphereGeometry(R, 40, 8, 0, TAU, 0, 0.5), white(), [0, y0 + H - R * Math.cos(0.5) + 0.02, z0]);
  // The landing capsule on the roof: a heat shield, a cone with portholes, a parachute pack.
  const cy = y0 + H + R * (1 - Math.cos(0.5)) - 0.05;
  add(g, cyl(1.75, 1.75, 0.32, 36), mat('#7a4a3a', { rough: 0.9 }), [0, cy + 0.16, z0]);
  const cap = new THREE.LatheGeometry([[1.7, 0], [1.6, 0.25], [0.95, 2.1], [0.7, 2.35], [0.001, 2.4]].map(([r, y]) => new THREE.Vector2(r, y)), 36);
  paint(cap, (x, y) => new THREE.Color(y > 1.95 ? look.roof.history : y > 0.9 && y < 1.1 ? MARS.teal : MARS.white));
  add(g, cap, vcMat({ key: 'marscap' }), [0, cy + 0.32, z0]);
  for (const a of [-0.7, 0.7]) porthole(g, [Math.sin(a) * 1.3, cy + 1.45, z0 + Math.cos(a) * 1.3], a, 0.24);
  const chute = new THREE.SphereGeometry(0.55, 16, 8, 0, TAU, 0, Math.PI / 2);
  paint(chute, (x, y, z) => new THREE.Color(Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * 8) % 2 ? MARS.red : MARS.white));
  add(g, chute, vcMat({ key: 'marschute' }), [0, cy + 2.68, z0], [0, 0, 0], [1, 0.7, 1]);
  pennant(g, [0.9, cy + 1.9, z0 - 0.6], look.banner, 1.6);
  // The porch on two printed pillars, the red-planet badge over it, a teal door.
  const fz = z0 + R + 0.35;
  for (const sx of [-1.15, 1.15]) add(g, printed(cyl(0.26, 0.3, 2.3, 14), MARS.terraLight, MARS.terra, 0.14), vcMat({ key: 'marsprint' }), [sx, y0 + 1.15, fz + 0.5]);
  add(g, box(3.0, 0.32, 1.5), mat(look.roof.history), [0, y0 + 2.46, fz + 0.25]);
  add(g, box(3.1, 0.12, 1.6), white(), [0, y0 + 2.66, fz + 0.25]);
  add(g, box(1.7, 2.0, 0.4), white(), [0, y0 + 1.0, fz - 0.15]);
  add(g, box(1.1, 1.7, 0.08), teal(), [0, y0 + 0.88, fz + 0.07]);
  add(g, box(0.06, 1.66, 0.1), white(), [0, y0 + 0.88, fz + 0.1]);
  for (const sx of [-0.28, 0.28]) add(g, box(0.34, 0.46, 0.06), windowMat, [sx, y0 + 1.25, fz + 0.12]);
  badge(g, 'planet', [0, y0 + 3.35, fz - 0.25], 0.62, look.roof.history);
  // A meteorite on a stand under glass, by the door.
  add(g, cyl(0.42, 0.5, 0.8, 12), white(), [2.65, y0 + 0.4, 2.35]);
  add(g, ico(0.26, 1), mat('#5a4a48'), [2.65, y0 + 1.02, 2.35], [0.4, 0.3, 0], [1.1, 0.8, 1]);
  add(g, cyl(0.38, 0.38, 0.6, 14), glass(), [2.65, y0 + 1.1, 2.35]);
  return y0 + H + 5.3;
}

/* ---------------------------------------------------------------- physics: the weather lab */

export function weatherLab(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.04, z0 = -0.6, W = 4.6, H = 2.6, D = 3.6;
  // A rounded white module: a box with half-cylinder ends.
  add(g, box(W - 1.6, H, D), white(), [0, y0 + H / 2, z0]);
  for (const sx of [-1, 1]) add(g, new THREE.CylinderGeometry(D / 2, D / 2, H, 28, 1, false, sx > 0 ? 0 : Math.PI, Math.PI), white(), [sx * (W / 2 - 0.8), y0 + H / 2, z0]);
  add(g, box(W - 1.6, 0.26, D + 0.04), mat(look.roof.physics), [0, y0 + H - 0.4, z0]);
  for (const sx of [-1, 1]) add(g, new THREE.CylinderGeometry(D / 2 + 0.02, D / 2 + 0.02, 0.26, 28, 1, false, sx > 0 ? 0 : Math.PI, Math.PI), mat(look.roof.physics), [sx * (W / 2 - 0.8), y0 + H - 0.4, z0]);
  // A rounded roof cap.
  add(g, box(W - 1.6, 0.3, D - 0.3), shell(), [0, y0 + H + 0.15, z0]);
  for (const sx of [-1, 1]) add(g, new THREE.CylinderGeometry(D / 2 - 0.15, D / 2 - 0.15, 0.3, 28, 1, false, sx > 0 ? 0 : Math.PI, Math.PI), shell(), [sx * (W / 2 - 0.8), y0 + H + 0.15, z0]);
  add(g, printed(new THREE.CylinderGeometry(D / 2 + 0.1, D / 2 + 0.2, 0.5, 28, 3), MARS.terraLight, MARS.terra, 0.14), vcMat({ key: 'marsprint' }), [-(W / 2 - 0.8), y0 + 0.25, z0]);
  // Windows along the front, a door with a yellow frame.
  for (const sx of [-1.95, 1.95]) porthole(g, [sx, y0 + 1.5, z0 + D / 2 + 0.02], 0, 0.36);
  add(g, box(1.5, 2.1, 0.12), yellow(), [0, y0 + 1.05, z0 + D / 2 + 0.03]);
  add(g, box(1.15, 1.85, 0.08), teal(), [0, y0 + 0.95, z0 + D / 2 + 0.08]);
  add(g, new THREE.CircleGeometry(0.24, 16), windowMat, [0, y0 + 1.4, z0 + D / 2 + 0.13]);
  badge(g, 'weather', [0, y0 + H + 0.45, z0 + D / 2 - 0.05], 0.55, look.roof.physics, 0.0);
  // Big solar wings either side.
  for (const sx of [-1, 1]) solarWing(g, [sx * 4.0, y0, z0 - 0.4], sx * 0.35, 2.0, 1.4, 1.5);
  // The weather mast: a lattice, the anemometer cups (they spin: buildings.js `cups`), a wind vane, a light.
  const mx = 1.3, mz = z0 - 0.6, top = y0 + H + 3.6;
  add(g, cyl(0.08, 0.1, 3.6, 6), steel(), [mx, y0 + H + 1.8, mz]);
  for (let i = 0; i < 4; i++) add(g, box(0.5, 0.05, 0.05), white(), [mx, y0 + H + 0.6 + i * 0.75, mz], [0, i * 0.8, 0]);
  const cups = new THREE.Group();
  cups.position.set(mx, top, mz);
  cups.userData.live = true;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    add(cups, box(0.75, 0.04, 0.04), steel(), [Math.sin(a) * 0.37, 0, Math.cos(a) * 0.37], [0, a + Math.PI / 2, 0]);
    add(cups, new THREE.SphereGeometry(0.16, 12, 8, 0, TAU, 0, Math.PI / 2), mat(i ? MARS.white : look.roof.physics, { side: THREE.DoubleSide }), [Math.sin(a) * 0.74, 0, Math.cos(a) * 0.74], [0, a, Math.PI / 2]);
  }
  g.add(cups);
  g.userData.cups = cups;
  add(g, box(0.06, 0.06, 0.9), dark(), [mx, top - 0.45, mz]);
  add(g, cone(0.12, 0.3, 4), yellow(), [mx, top - 0.45, mz + 0.5], [Math.PI / 2, 0, 0]);
  add(g, sphere(0.1, 10, 8), lampMat, [mx, top + 0.2, mz]);
  // A radar dish on the roof.
  const dish = new THREE.LatheGeometry([0, 0.2, 0.4, 0.6, 0.72].map((r) => new THREE.Vector2(r, r * r * 0.55)), 20);
  add(g, cyl(0.07, 0.09, 1.0, 6), steel(), [-1.4, y0 + H + 0.8, z0 - 0.3]);
  add(g, dish, mat(MARS.white, { side: THREE.DoubleSide }), [-1.4, y0 + H + 1.35, z0 - 0.3], [0.7, -0.6, 0]);
  return top + 1.2;
}

/* ---------------------------------------------------------------- the smaller places */

/** An inflatable pressurised tent over a small place: four puffy teal arches, a striped top, sandbag feet. */
export function podTent(look, r, seed = 1) {
  const g = new THREE.Group();
  const R = r + 0.6, H = 3.6;
  const rnd = seeded(seed);
  const archMat = mat(look.banner ?? MARS.teal, { rough: 0.45 });
  for (let i = 0; i < 2; i++) {
    const arch = new THREE.TorusGeometry(1, 0.2 / R * 1.0, 10, 36, Math.PI);
    arch.scale(R, H, R);
    add(g, arch, archMat, [0, 0, 0], [0, i * Math.PI / 2 + Math.PI / 4, 0]);
  }
  // The top: a puffy striped cap where the arches cross.
  const cap = new THREE.SphereGeometry(R * 0.74, 32, 10, 0, TAU, 0, 0.75);
  const A = new THREE.Color(MARS.white), B = new THREE.Color(MARS.terraLight);
  paint(cap, (x, y, z) => (Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * 12) % 2 ? A : B));
  add(g, cap, vcMat({ key: 'tentcap', side: THREE.DoubleSide }), [0, H - R * 0.74 + 0.12, 0]);
  add(g, new THREE.TorusGeometry(R * 0.74 * Math.sin(0.75), 0.13, 8, 36), yellow(), [0, H - R * 0.74 + 0.12 + R * 0.74 * Math.cos(0.75), 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    for (let k = 0; k < 2; k++) add(g, sphere(0.3, 10, 6), mat('#d9a27a', { rough: 1 }), [Math.sin(a) * R + Math.cos(a) * (k - 0.5) * 0.5, 0.16, Math.cos(a) * R - Math.sin(a) * (k - 0.5) * 0.5], [0, a, 0], [1.2, 0.55, 0.8]);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + rnd() * 0.05;
    add(g, sphere(0.07, 6, 4), lampMat, [Math.sin(a) * R * 0.5, H - 0.05, Math.cos(a) * R * 0.5]);
  }
  antenna(g, [0, H + 0.3, 0], 0.7);
  return batch(g);
}

/* ---------------------------------------------------------------- the shared models */

const matcaps = new Map();
/** A painted chrome look (a matcap): a warm sky above, the red ground below, a bright streak — steel that shines without an environment map. */
export function steelMaterial(tint = '#ffffff') {
  if (matcaps.has(tint)) return matcaps.get(tint);
  const N = 256, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, N);
  grad.addColorStop(0, '#fff4ea');
  grad.addColorStop(0.35, '#e9e4e4');
  grad.addColorStop(0.55, '#a9a7ad');
  grad.addColorStop(0.75, '#c88a6c');
  grad.addColorStop(1, '#8e5a46');
  g.fillStyle = grad;
  g.fillRect(0, 0, N, N);
  const spot = g.createRadialGradient(N * 0.36, N * 0.3, 2, N * 0.36, N * 0.3, N * 0.32);
  spot.addColorStop(0, 'rgba(255,255,255,0.95)');
  spot.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = spot;
  g.fillRect(0, 0, N, N);
  // Clip to a disc (a matcap is a sphere's picture).
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(N / 2, N / 2, N / 2, 0, TAU);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshMatcapMaterial({ matcap: tex, color: tint });
  m.userData.base = new THREE.Color(tint);
  matcaps.set(tint, m);
  return m;
}

/**
 * The Big Rocket, about 34 m tall at scale 1: a shiny steel body with a rounded nose, two
 * little forward flaps and two big aft flaps, a ring of portholes, a teal and yellow band,
 * standing on six short legs. Original design.
 */
export function bigRocketModel() {
  const g = new THREE.Group();
  const steelM = steelMaterial();
  const R = 2.6;
  const prof = [[0.001, 0], [R * 0.75, 0], [R, 0.9], [R, 24.5], [R * 0.97, 26.5], [R * 0.86, 28.8], [R * 0.64, 31], [R * 0.34, 32.8], [0.001, 33.6]].map(([r, y]) => new THREE.Vector2(r, y));
  add(g, new THREE.LatheGeometry(prof, 40), steelM, [0, 2, 0]);
  // Panel seams: thin darker rings.
  for (let i = 1; i < 12; i++) add(g, new THREE.TorusGeometry(R + 0.01, 0.035, 4, 48), mat('#9ea4ad', { rough: 0.4 }), [0, 2 + i * 2.05, 0], [Math.PI / 2, 0, 0]);
  add(g, cyl(R + 0.03, R + 0.03, 0.9, 40), teal(), [0, 2 + 19.5, 0]);
  add(g, cyl(R + 0.03, R + 0.03, 0.35, 40), yellow(), [0, 2 + 20.3, 0]);
  // A ring of portholes near the nose, glowing at night.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    porthole(g, [Math.sin(a) * (R * 0.98), 2 + 25.4, Math.cos(a) * (R * 0.98)], a, 0.34, mat('#e6e9ee', { rough: 0.3 }));
  }
  // Flaps: two small up front, two big at the back (flat fins, steel).
  const flap = (w, h, y, a) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(w, 0.6);
    s.lineTo(w, h - 0.4);
    s.lineTo(0, h);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1 });
    geo.translate(0, 0, -0.11);
    add(g, geo, steelM, [Math.sin(a) * R * 0.9, y, Math.cos(a) * R * 0.9], [0, a - Math.PI / 2, 0]);
  };
  flap(2.4, 6.5, 3.2, Math.PI / 2);
  flap(2.4, 6.5, 3.2, -Math.PI / 2);
  flap(1.4, 3.2, 26.8, Math.PI / 2);
  flap(1.4, 3.2, 26.8, -Math.PI / 2);
  // Six short landing legs and engine bells.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    const leg = add(g, cyl(0.16, 0.22, 3.0, 8), mat('#5b5f68', { rough: 0.5 }), [Math.sin(a) * (R + 0.4), 1.3, Math.cos(a) * (R + 0.4)], [Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35]);
    leg.rotation.order = 'YXZ';
    add(g, cyl(0.5, 0.55, 0.2, 12), mat('#5b5f68', { rough: 0.5 }), [Math.sin(a) * (R + 0.9), 0.1, Math.cos(a) * (R + 0.9)]);
  }
  for (const [x, z] of [[0, 0], [1.1, 0.6], [-1.1, 0.6], [0, -1.2]]) add(g, cyl(0.35, 0.6, 1.0, 14), dark(), [x, 1.6, z]);
  return g;
}

/**
 * A six-wheeled Mars rover about 3.4 m long at scale 1 (looking along +Z): a white body with
 * terracotta trim, a teal solar deck, rocker arms, chunky wheels, a mast with a camera head
 * (two big lens eyes), a robot arm folded at the front and a little dish. Original design.
 * `userData.wheels` turn, `userData.head` looks about.
 */
export function marsRoverModel(look = null) {
  const g = new THREE.Group();
  const accent = look?.banner ?? MARS.terra;
  add(g, box(1.9, 0.75, 2.6), white(), [0, 1.35, 0]);
  add(g, box(2.0, 0.16, 2.7), mat(accent), [0, 1.02, 0]);
  add(g, box(2.3, 0.1, 2.4), tmat('solar', MARS.solar), [0, 1.8, -0.2]);
  add(g, box(2.4, 0.06, 2.5), white(), [0, 1.74, -0.2]);
  // Rocker arms and six wheels.
  const wheels = [];
  for (const sx of [-1, 1]) {
    add(g, box(0.12, 0.12, 3.0), steel(), [sx * 1.2, 0.95, 0], [0.12, 0, 0]);
    for (const z of [-1.25, 0, 1.25]) {
      add(g, box(0.1, 0.55, 0.1), steel(), [sx * 1.3, 0.7, z]);
      const w = new THREE.Group();
      w.position.set(sx * 1.4, 0.42, z);
      w.userData.live = true;
      add(w, cyl(0.42, 0.42, 0.38, 18), dark(), [0, 0, 0], [0, 0, Math.PI / 2]);
      add(w, cyl(0.22, 0.22, 0.4, 12), mat(accent), [0, 0, 0], [0, 0, Math.PI / 2]);
      for (let k = 0; k < 6; k++) add(w, box(0.4, 0.08, 0.16), mat('#55505a'), [0, Math.sin((k / 6) * TAU) * 0.42, Math.cos((k / 6) * TAU) * 0.42], [(k / 6) * TAU, 0, 0]);
      g.add(w);
      wheels.push(w);
    }
  }
  // The mast and camera head: a friendly face of two lens eyes.
  add(g, cyl(0.08, 0.1, 1.5, 8), steel(), [0.55, 2.5, 0.85]);
  const head = new THREE.Group();
  head.position.set(0.55, 3.35, 0.85);
  head.userData.live = true;
  add(head, box(0.95, 0.42, 0.45), white(), [0, 0, 0]);
  add(head, box(0.97, 0.1, 0.47), mat(accent), [0, 0.2, 0]);
  for (const sx of [-0.22, 0.22]) {
    add(head, cyl(0.15, 0.15, 0.14, 16), dark(), [sx, 0, 0.26], [Math.PI / 2, 0, 0]);
    add(head, new THREE.CircleGeometry(0.1, 16), mat('#7fd8ff', { emissive: '#3fb0ff', ei: 0.6 }), [sx, 0, 0.335]);
  }
  g.add(head);
  // The arm folded at the front, a dish and an antenna.
  add(g, box(0.12, 0.12, 0.9), steel(), [-0.5, 1.25, 1.6], [0.6, 0, 0]);
  add(g, box(0.12, 0.6, 0.12), steel(), [-0.5, 1.05, 1.95]);
  add(g, box(0.32, 0.25, 0.32), yellow(), [-0.5, 0.75, 1.95]);
  const dish = new THREE.LatheGeometry([0, 0.15, 0.3, 0.42].map((r) => new THREE.Vector2(r, r * r * 0.8)), 14);
  add(g, cyl(0.04, 0.04, 0.5, 5), steel(), [-0.6, 2.05, -0.9]);
  add(g, dish, mat(MARS.white, { side: THREE.DoubleSide }), [-0.6, 2.35, -0.9], [0.5, 0, 0.3]);
  antenna(g, [0.75, 1.8, -1.1], 0.9);
  g.userData.wheels = wheels;
  g.userData.head = head;
  return g;
}

/**
 * A little helicopter drone about 1.6 m tall at scale 1: a round body on four springy legs,
 * a mast with two long rotors that spin opposite ways, a solar panel on top. Original design.
 * `userData.rotors` = [lower, upper].
 */
export function droneModel() {
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(0.42, 18, 12), white(), [0, 0.75, 0], [0, 0, 0], [1, 0.8, 1]);
  add(g, new THREE.TorusGeometry(0.42, 0.06, 6, 20), mat(MARS.terra), [0, 0.75, 0], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CircleGeometry(0.12, 14), mat('#7fd8ff', { emissive: '#3fb0ff', ei: 0.6 }), [0, 0.72, 0.4]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    add(g, cyl(0.03, 0.03, 0.8, 5), steel(), [Math.sin(a) * 0.4, 0.35, Math.cos(a) * 0.4], [Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45]);
    add(g, sphere(0.07, 8, 6), yellow(), [Math.sin(a) * 0.58, 0.02, Math.cos(a) * 0.58]);
  }
  add(g, cyl(0.04, 0.04, 0.9, 6), steel(), [0, 1.4, 0]);
  const rotors = [1.25, 1.55].map((y, i) => {
    const r = new THREE.Group();
    r.position.y = y;
    r.userData.live = true;
    add(r, box(2.6, 0.03, 0.18), mat(i ? MARS.teal : MARS.white, { rough: 0.5 }));
    add(r, cyl(0.08, 0.08, 0.08, 10), dark());
    g.add(r);
    return r;
  });
  add(g, box(0.5, 0.04, 0.5), tmat('solar', MARS.solar), [0, 1.9, 0]);
  add(g, box(0.56, 0.03, 0.56), white(), [0, 1.875, 0]);
  g.userData.rotors = rotors;
  return g;
}

/** A glass greenhouse tunnel (along X): white ribs, see-through glass, green plants and red tomatoes inside. */
export function greenhouseTunnel(len = 6, r = 1.6, seed = 1) {
  const g = new THREE.Group();
  const rnd = seeded(seed);
  add(g, new THREE.CylinderGeometry(r, r, len, 24, 1, true, -Math.PI / 2, Math.PI), glass(), [0, 0, 0], [0, 0, Math.PI / 2]);
  for (let i = 0; i <= Math.round(len / 1.2); i++) add(g, new THREE.TorusGeometry(r, 0.06, 4, 20, Math.PI), white(), [-len / 2 + (i * len) / Math.round(len / 1.2), 0, 0], [0, Math.PI / 2, 0]);
  for (const sx of [-1, 1]) add(g, new THREE.CircleGeometry(r, 20, 0, Math.PI), glass(), [sx * len / 2, 0, 0], [0, sx * Math.PI / 2, 0]);
  add(g, box(len, 0.3, r * 1.7), mat('#8a5a3c'), [0, 0.15, 0]);
  for (let i = 0; i < len * 3; i++) {
    const x = -len / 2 + 0.3 + rnd() * (len - 0.6), z = (rnd() - 0.5) * r * 1.3;
    add(g, ico(0.22 + rnd() * 0.16, 0), mat(rnd() < 0.5 ? '#5fbf5a' : '#7fd46a'), [x, 0.45 + rnd() * 0.2, z]);
    if (rnd() < 0.35) add(g, sphere(0.08, 6, 4), mat('#ff5a4a'), [x + 0.1, 0.6, z + 0.1]);
  }
  return g;
}

/* ---------------------------------------------------------------- the landmarks */

/** A round pad: printed layers, a cream top, a coloured ring and little lights. */
function marsPad(g, r, look) {
  add(g, printed(new THREE.CylinderGeometry(r, r + 0.15, 0.36, 40, 3), MARS.terraLight, MARS.terra, 0.12), vcMat({ key: 'marsprint' }), [0, 0.18, 0]);
  add(g, cyl(r - 0.05, r - 0.05, 0.05, 40), mat('#f6eadc'), [0, 0.36, 0]);
  add(g, new THREE.TorusGeometry(r - 0.3, 0.06, 4, 48), mat(look?.banner ?? MARS.teal), [0, 0.39, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    add(g, cyl(0.08, 0.08, 0.06, 8), lampMat, [Math.sin(a) * (r - 0.65), 0.4, Math.cos(a) * (r - 0.65)]);
  }
}
/** A little dust devil: a twisting see-through funnel of red dust (mars/scene.js has the big ones). */
export function devilMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#e7a27a') }, uA: { value: 0.55 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uA; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = vec2(vUv.x * 6.0 + vUv.y * 3.0 - uTime * 1.6, vUv.y * 5.0 - uTime * 0.6);
        float s = n(p) * 0.6 + n(p * 2.3 + 4.0) * 0.4;
        float edge = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
        float a = smoothstep(0.35, 0.8, s) * edge * uA;
        gl_FragColor = vec4(uColor * (0.85 + s * 0.3), a);
        #include <colorspace_fragment>
      }`
  });
}
/** A dust-devil funnel geometry, `h` tall: narrow at the foot, wide at the top. */
export function devilGeometry(h = 8, r0 = 0.3, r1 = 2.4) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(r0 + (r1 - r0) * t ** 1.6, t * h));
  }
  return new THREE.LatheGeometry(pts, 28);
}

export const MARS_LANDMARKS = {
  /** Landing Site: a little landing capsule under a big striped parachute; tap it and the chute puffs up. */
  landingsite(look) {
    const g = new THREE.Group();
    marsPad(g, 4.0, look);
    const capsule = new THREE.Group();
    capsule.position.set(0.6, 0.4, 0.6);
    capsule.rotation.set(0.12, 0.5, 0.08);
    add(capsule, cyl(1.25, 1.25, 0.24, 28), mat('#7a4a3a'), [0, 0.12, 0]);
    const body = new THREE.LatheGeometry([[1.22, 0], [1.12, 0.2], [0.65, 1.55], [0.001, 1.6]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
    paint(body, (x, y) => new THREE.Color(y > 1.2 ? look.banner : y > 0.6 && y < 0.75 ? MARS.teal : MARS.white));
    add(capsule, body, vcMat({ key: 'marscap' }), [0, 0.24, 0]);
    porthole(capsule, [0, 0.9, 0.86], 0, 0.2);
    g.add(capsule);
    batch(g);
    // The parachute lies behind, its lines to the capsule; it puffs up when poked.
    const chute = new THREE.Group();
    chute.position.set(-1.6, 0.42, -1.6);
    chute.userData.live = true;
    const canopy = new THREE.SphereGeometry(2.0, 24, 8, 0, TAU, 0, Math.PI / 2);
    paint(canopy, (x, y, z) => new THREE.Color(Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * 10) % 2 ? MARS.red : MARS.white));
    const c = add(chute, canopy, vcMat({ key: 'marschute', side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], [1, 0.22, 1]);
    g.add(chute);
    let t = 9;
    g.userData = { top: 5, poke: () => (t = 0), update(dt, time) { t += dt; const k = t < 2.4 ? Math.sin((t / 2.4) * Math.PI) : 0; c.scale.y = 0.22 + k * 0.9 + Math.sin(time * 1.3) * 0.02; chute.position.y = 0.42 + k * 0.8; } };
    return g;
  },
  /** Rover Garage: a printed hangar with a little six-wheeled rover; tap it and the rover rolls out and back. */
  marsgarage(look) {
    const g = new THREE.Group();
    marsPad(g, 4.0, look);
    const hangar = new THREE.CylinderGeometry(2.4, 2.4, 3.6, 28, 6, true, -Math.PI / 2, Math.PI);
    hangar.rotateX(Math.PI / 2);
    hangar.rotateZ(Math.PI / 2);
    hangar.rotateY(Math.PI / 2);
    add(g, printed(hangar, MARS.terraLight, MARS.terra, 0.18), vcMat({ key: 'marsprint', side: THREE.DoubleSide }), [0, 0.4, -1.4]);
    add(g, new THREE.CircleGeometry(2.4, 24, 0, Math.PI), shell(), [0, 0.4, -3.2]);
    add(g, new THREE.TorusGeometry(2.4, 0.14, 6, 28, Math.PI), mat(look.banner), [0, 0.4, 0.4]);
    add(g, box(5.2, 0.06, 0.4), tmat('hazard', MARS.yellow, '#2b2f3a'), [0, 0.42, 0.7]);
    batch(g);
    const rover = new THREE.Group();
    rover.userData.live = true;
    const m = marsRoverModel(look);
    m.scale.setScalar(0.62);
    rover.add(m);
    rover.position.set(0, 0.4, -1.4);
    g.add(rover);
    let t = 9;
    g.userData = {
      top: 5.4,
      poke: () => (t = 0),
      update(dt, time) {
        t += dt;
        const k = t < 4 ? Math.sin((t / 4) * Math.PI) : 0;
        rover.position.z = -1.4 + k * 3.2;
        for (const w of m.userData.wheels) w.rotation.x = rover.position.z * 2.4;
        m.userData.head.rotation.y = Math.sin(time * 0.6) * 0.6;
      }
    };
    return g;
  },
  /** Ice Drill: a drill rig over a hole, a tank of blue ice cubes; tap it and the bit spins fast and the cubes hop. */
  icedrill(look) {
    const g = new THREE.Group();
    marsPad(g, 4.0, look);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      const leg = add(g, cyl(0.1, 0.12, 6.0, 8), yellow(), [Math.sin(a) * 1.0, 3.2, Math.cos(a) * 1.0]);
      leg.rotation.set(Math.cos(a) * 0.17, 0, -Math.sin(a) * 0.17);
    }
    add(g, box(1.0, 0.8, 1.0), white(), [0, 5.9, 0]);
    add(g, box(1.04, 0.16, 1.04), mat(look.banner), [0, 5.6, 0]);
    add(g, sphere(0.12, 8, 6), lampMat, [0, 6.42, 0]);
    add(g, cyl(0.55, 0.65, 0.3, 18), dark(), [0, 0.5, 0]);
    // A tank of ice samples, a frosty puddle.
    add(g, cyl(0.7, 0.7, 1.0, 18), glass(), [2.2, 0.9, 1.0]);
    add(g, cyl(0.74, 0.74, 0.14, 18), white(), [2.2, 0.45, 1.0]);
    add(g, new THREE.CircleGeometry(1.1, 20), mat('#e6f6ff', { rough: 0.2 }), [-2.0, 0.39, 1.2], [-Math.PI / 2, 0, 0]);
    batch(g);
    const bit = new THREE.Group();
    bit.position.set(0, 0.6, 0);
    bit.userData.live = true;
    add(bit, cyl(0.12, 0.12, 4.8, 8), steel(), [0, 2.6, 0]);
    for (let i = 0; i < 8; i++) add(bit, box(0.5, 0.06, 0.12), steel(), [0, 0.3 + i * 0.28, 0], [0, i * 0.7, 0.3]);
    add(bit, cone(0.16, 0.4, 8), dark(), [0, 0.05, 0], [Math.PI, 0, 0]);
    g.add(bit);
    const cubes = [];
    for (let i = 0; i < 5; i++) {
      const c = add(g, box(0.28, 0.28, 0.28), mat('#9fe3ff', { emissive: '#5fc8ff', ei: 0.3 }), [2.2 + (i % 3 - 1) * 0.3, 0.68 + Math.floor(i / 3) * 0.3, 1.0 + (i % 2) * 0.2], [0.3 * i, 0.5 * i, 0]);
      c.userData.live = true;
      c.userData.y = c.position.y;
      cubes.push(c);
    }
    let t = 9, spin = 1;
    g.userData = {
      top: 7,
      poke: () => { t = 0; spin = 16; },
      update(dt) {
        t += dt;
        spin = Math.max(1, spin - dt * 5);
        bit.rotation.y += dt * spin;
        bit.position.y = 0.6 + (t < 2 ? Math.sin(t * 20) * 0.04 : 0);
        cubes.forEach((c, i) => (c.position.y = c.userData.y + (t < 1.5 ? Math.abs(Math.sin(t * 8 + i)) * 0.35 * (1.5 - t) : 0)));
      }
    };
    return g;
  },
  /** Greenhouse Dome: a glass geodesic dome full of plants, tomatoes and a sunflower; tap it and the plants wiggle. */
  greendome(look) {
    const g = new THREE.Group();
    marsPad(g, 4.0, look);
    const geo = new THREE.IcosahedronGeometry(3.0, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, 0);
    geo.computeVertexNormals();
    add(g, geo, glass(), [0, 0.4, 0]);
    // Struts: thin white bars along the dome's edges.
    const edges = new THREE.EdgesGeometry(geo);
    const lines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#ffffff' }));
    lines.position.y = 0.4;
    g.add(lines);
    add(g, cyl(3.05, 3.1, 0.3, 30), white(), [0, 0.5, 0]);
    add(g, box(1.2, 1.6, 0.6), white(), [0, 1.2, 2.9]);
    add(g, box(0.8, 1.3, 0.08), teal(), [0, 1.1, 3.2]);
    batch(g);
    const plants = new THREE.Group();
    plants.userData.live = true;
    const rnd = seeded(17);
    add(plants, cyl(2.4, 2.4, 0.3, 24), mat('#8a5a3c'), [0, 0.7, 0]);
    for (let i = 0; i < 22; i++) {
      const a = rnd() * TAU, d = 0.4 + rnd() * 1.8;
      add(plants, ico(0.3 + rnd() * 0.25, 0), mat(rnd() < 0.5 ? '#4fb85a' : '#7fd46a'), [Math.sin(a) * d, 1.1 + rnd() * 0.4, Math.cos(a) * d]);
      if (rnd() < 0.4) add(plants, sphere(0.11, 6, 4), mat('#ff5a4a'), [Math.sin(a) * d + 0.15, 1.35, Math.cos(a) * d + 0.1]);
    }
    add(plants, cyl(0.05, 0.06, 1.8, 5), mat('#4fb85a'), [0.4, 1.7, -0.6]);
    for (let i = 0; i < 8; i++) add(plants, sphere(0.16, 8, 6), yellow(), [0.4 + Math.sin((i / 8) * TAU) * 0.3, 2.65 + Math.cos((i / 8) * TAU) * 0.3, -0.45], [0, 0, 0], [1, 1, 0.4]);
    add(plants, sphere(0.18, 8, 6), mat('#8a5a3c'), [0.4, 2.65, -0.4], [0, 0, 0], [1, 1, 0.5]);
    g.add(plants);
    let t = 9;
    g.userData = { top: 5.5, poke: () => (t = 0), update(dt) { t += dt; const k = t < 1.6 ? Math.sin(t * 14) * 0.06 * (1.6 - t) : 0; plants.scale.set(1 - k, 1 + k * 2, 1 - k); } };
    return g;
  },
  /** Weather Station: a tall mast with spinning cups, a wind vane, a sensor box and a solar panel; tap it for a gust. */
  weatherstation(look) {
    const g = new THREE.Group();
    marsPad(g, 4.0, look);
    add(g, cyl(0.12, 0.16, 7.2, 8), white(), [0, 4.0, 0]);
    for (let i = 0; i < 6; i++) add(g, box(0.9, 0.06, 0.06), mat(i % 2 ? look.banner : MARS.white), [0, 1.2 + i * 1.0, 0], [0, i * 0.6, 0]);
    add(g, box(1.1, 0.8, 0.6), white(), [0.9, 1.4, 0.2]);
    add(g, box(0.7, 0.4, 0.04), mat('#1d2a40'), [0.9, 1.5, 0.52]);
    add(g, box(0.6, 0.06, 0.04), mat('#7fe0a0', { emissive: '#3fd07a', ei: 0.6 }), [0.9, 1.5, 0.55]);
    solarWing(g, [-1.8, 0.4, 1.2], 0.4, 1.8, 1.1, 1.2);
    add(g, sphere(0.14, 8, 6), lampMat, [0, 7.75, 0]);
    batch(g);
    const cups = new THREE.Group();
    cups.position.set(0, 7.4, 0);
    cups.userData.live = true;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      add(cups, box(1.2, 0.05, 0.05), steel(), [Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6], [0, a + Math.PI / 2, 0]);
      add(cups, new THREE.SphereGeometry(0.28, 12, 8, 0, TAU, 0, Math.PI / 2), mat(i ? MARS.white : look.banner, { side: THREE.DoubleSide }), [Math.sin(a) * 1.2, 0, Math.cos(a) * 1.2], [0, a, Math.PI / 2]);
    }
    g.add(cups);
    const vane = new THREE.Group();
    vane.position.set(0, 6.4, 0);
    vane.userData.live = true;
    add(vane, box(0.08, 0.08, 1.6), dark(), [0, 0, 0]);
    add(vane, cone(0.2, 0.45, 4), yellow(), [0, 0, 0.9], [Math.PI / 2, 0, 0]);
    add(vane, box(0.04, 0.5, 0.5), mat(look.banner), [0, 0, -0.75]);
    g.add(vane);
    let gust = 0;
    g.userData = { top: 9, poke: () => (gust = 1), update(dt, time) { gust = Math.max(0, gust - dt * 0.4); cups.rotation.y += dt * (2 + gust * 14); vane.rotation.y = Math.sin(time * 0.5) * 0.8 + gust * Math.sin(time * 9); } };
    return g;
  },
  /** Dust-Devil Viewpoint: a railed platform with coin binoculars, a little dust devil twirling beside it; tap it and the devil whirls up. */
  dustview(look) {
    const g = new THREE.Group();
    marsPad(g, 4.0, look);
    add(g, printed(new THREE.CylinderGeometry(1.8, 2.0, 1.4, 24, 3), MARS.terraLight, MARS.terra, 0.16), vcMat({ key: 'marsprint' }), [-1.0, 1.1, -0.6]);
    add(g, cyl(1.9, 1.9, 0.12, 24), white(), [-1.0, 1.86, -0.6]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      add(g, cyl(0.04, 0.04, 0.8, 5), white(), [-1.0 + Math.sin(a) * 1.8, 2.3, -0.6 + Math.cos(a) * 1.8]);
    }
    add(g, new THREE.TorusGeometry(1.8, 0.06, 6, 32), mat(look.banner), [-1.0, 2.7, -0.6], [Math.PI / 2, 0, 0]);
    add(g, box(1.4, 0.16, 1.2), shell(), [-1.0, 1.0, 1.6], [0.45, 0, 0]);
    // The binoculars on a post.
    add(g, cyl(0.07, 0.09, 1.1, 6), steel(), [-1.0, 2.45, -1.2]);
    add(g, box(0.7, 0.35, 0.5), mat(look.banner), [-1.0, 3.1, -1.2]);
    for (const sx of [-0.18, 0.18]) add(g, cyl(0.12, 0.12, 0.4, 12), dark(), [-1.0 + sx, 3.12, -0.85], [Math.PI / 2, 0, 0]);
    batch(g);
    const devil = new THREE.Group();
    devil.position.set(2.3, 0.4, 0.6);
    devil.userData.live = true;
    const dm = devilMaterial();
    const f = new THREE.Mesh(devilGeometry(5.5, 0.2, 1.4), dm);
    f.renderOrder = 3;
    devil.add(f);
    g.add(devil);
    let t = 9;
    g.userData = {
      top: 6.6,
      poke: () => (t = 0),
      update(dt, time) {
        t += dt;
        const k = t < 3 ? Math.sin((t / 3) * Math.PI) : 0;
        dm.uniforms.uTime.value = time * (1 + k * 2);
        devil.scale.set(1 + k * 0.4, 1 + k * 0.9, 1 + k * 0.4);
        devil.rotation.y = time * 2;
        devil.position.x = 2.3 + Math.sin(time * 0.7) * 0.4;
      }
    };
    return g;
  },
  /** Caldera Lookout: a tall lookout tower with a sunny roof, a telescope and a pennant at the volcano's top; tap it to peek round. */
  calderalookout(look) {
    const g = new THREE.Group();
    marsPad(g, 4.0, look);
    for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) add(g, cyl(0.12, 0.14, 5.2, 8), white(), [x, 3.0, z]);
    for (let i = 0; i < 3; i++) for (const r of [0, 1, 2, 3]) add(g, box(1.9, 0.07, 0.07), mat(i % 2 ? look.banner : MARS.white), [Math.sin((r * Math.PI) / 2) * 0.92, 1.3 + i * 1.4, Math.cos((r * Math.PI) / 2) * 0.92], [0, (r * Math.PI) / 2, 0]);
    add(g, cyl(1.6, 1.6, 0.2, 8), shell(), [0, 5.6, 0], [0, Math.PI / 8, 0]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      add(g, box(0.06, 0.7, 0.06), white(), [Math.sin(a) * 1.5, 6.0, Math.cos(a) * 1.5]);
    }
    add(g, new THREE.TorusGeometry(1.5, 0.06, 6, 8), mat(look.banner), [0, 6.35, 0], [Math.PI / 2, 0, Math.PI / 8]);
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) add(g, cyl(0.05, 0.05, 1.6, 5), white(), [x * 0.95, 6.5, z * 0.95]);
    add(g, cone(2.1, 1.2, 8), yellow(), [0, 7.9, 0], [0, Math.PI / 8, 0]);
    add(g, sphere(0.14, 8, 6), lampMat, [0, 8.6, 0]);
    // A ladder up the front.
    for (const sx of [-0.35, 0.35]) add(g, box(0.07, 5.4, 0.07), steel(), [sx, 2.9, 1.25]);
    for (let i = 0; i < 12; i++) add(g, box(0.7, 0.05, 0.05), steel(), [0, 0.7 + i * 0.42, 1.25]);
    batch(g);
    const scope = new THREE.Group();
    scope.position.set(0, 6.2, 0);
    scope.userData.live = true;
    add(scope, cyl(0.06, 0.06, 0.6, 6), dark(), [0, 0.0, 0]);
    add(scope, cyl(0.16, 0.22, 1.2, 12), white(), [0, 0.35, 0.3], [-1.2, 0, 0]);
    add(scope, cyl(0.24, 0.24, 0.12, 12), mat(look.banner), [0, 0.55, 0.85], [-1.2, 0, 0]);
    g.add(scope);
    const flag = new THREE.Group();
    flag.userData.live = true;
    flag.position.set(1.0, 8.4, 0);
    pennant(flag, [0, -1.2, 0], look.banner, 1.6);
    g.add(flag);
    let t = 9;
    g.userData = { top: 10, poke: () => (t = 0), update(dt, time) { t += dt; scope.rotation.y = t < 3 ? Math.sin((t / 3) * TAU) * 2.4 : Math.sin(time * 0.2) * 0.5; flag.rotation.y = Math.sin(time * 2.2) * 0.3; } };
    return g;
  }
};
export const MARS_LANDMARK_ICONS = { landingsite: '🪂', marsgarage: '🚙', icedrill: '🧊', greendome: '🌱', weatherstation: '🌡️', dustview: '🌪️', calderalookout: '🌋' };

/* ---------------------------------------------------------------- the pressure door */

/**
 * The pressure door at the foot of a staircase: two white posts with terracotta stripes, a teal
 * panel each side that slides away into its post, a light (red shut, green open).
 * Same API as structures.js buildGate: setOpen(on, instant), update(dt).
 */
export function marsGate(s, look) {
  const g = new THREE.Group();
  const W = s.width + 0.4;
  const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
  g.position.set(s.a.x + dx * 0.03, s.a.y, s.a.z + dz * 0.03);
  g.rotation.y = Math.atan2(dx, dz);
  const frame = new THREE.Group();
  for (const side of [-1, 1]) {
    add(frame, printed(box(0.7, 2.9, 0.7), MARS.white, MARS.terraLight, 0.3), vcMat({ key: 'marsprint' }), [side * (W / 2 + 0.35), 1.45, 0]);
    add(frame, box(0.74, 0.2, 0.74), mat(look.banner), [side * (W / 2 + 0.35), 2.95, 0]);
  }
  add(frame, box(W + 1.4, 0.4, 0.6), white(), [0, 3.1, 0]);
  add(frame, box(W + 1.42, 0.12, 0.62), tmat('hazard', MARS.yellow, '#2b2f3a'), [0, 2.88, 0]);
  g.add(batch(frame));
  const doors = [-1, 1].map((side) => {
    const d = new THREE.Group();
    d.userData.live = true;
    add(d, box(W / 2, 2.6, 0.12), teal(), [side * W / 4, 1.35, 0]);
    add(d, box(W / 2 - 0.3, 0.16, 0.16), yellow(), [side * W / 4, 1.35, 0.08]);
    add(d, new THREE.CircleGeometry(0.18, 14), windowMat, [side * W / 4, 2.0, 0.07]);
    g.add(d);
    return d;
  });
  const red = mat('#ff5f5f', { emissive: '#ff3030', ei: 1.2, key: 'marsgate' }), green = mat('#7ee08a', { emissive: '#3fe06a', ei: 1.2, key: 'marsgate' });
  const light = add(g, sphere(0.22, 12, 8), red, [0, 3.5, 0.1]);
  light.userData.live = true;
  let open = 0, target = 0;
  g.userData.setOpen = (on, instant = false) => {
    target = on ? 1 : 0;
    if (instant) open = target;
  };
  g.userData.update = (dt) => {
    open += Math.sign(target - open) * Math.min(Math.abs(target - open), dt * 0.9);
    doors[0].position.x = -open * (W / 2);
    doors[1].position.x = open * (W / 2);
    doors[0].scale.x = doors[1].scale.x = 1 - open * 0.85;
    light.material = open > 0.5 ? green : red;
  };
  return g;
}
