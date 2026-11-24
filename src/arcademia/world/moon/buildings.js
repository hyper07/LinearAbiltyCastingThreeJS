/**
 * Moonbase architecture for the Moon (original designs, a toy look: white
 * and silver shells, orange and teal trim, glowing portholes).
 *
 *   Math     the Dome School: a round habitat under a big white dome with
 *            panel seams, a glass cupola, a "123" badge on the dome, a round
 *            airlock porch for its door, solar wings and an antenna
 *   History  the Moon Museum: a stack of three cylinder modules with window
 *            bands and a little dome on top, a round mission-patch-like badge
 *            (stars, a crescent, a rocket; no real insignia) over the door, a
 *            docking ring and a display case with a moon rock
 *   Physics  the Star Observatory: a drum under a turning silver dome with a
 *            slit and a telescope, a little lab pod and a radar dish
 *
 * The smaller places stand under white pod canopies. Each moonbase's middle
 * pad has a landmark: a little lander, a little rocket, a rover garage, a
 * radio dish, a greenhouse dome, a crystal cave and a satellite. The models of
 * the rocket, the lander, the rover and the dish are shared with the giant
 * ones on the plain (moon/scene.js), scaled. The airlock (with the same API as
 * structures.js buildGate) shuts the glass tube to a locked moonbase.
 *
 * Same contract as buildings.js shapes: origin at the plinth's centre at
 * walking level, the door faces +Z, the function returns the top's height.
 */
import * as THREE from 'three';
import { add, batch, box, cone, cyl, ico, mat, paint, seeded, sphere, vcMat } from '../kit.js';
import { windowMat, lampMat } from '../buildings.js';

const PLINTH_R = 4.6, PLINTH_H = 0.55;
const TAU = Math.PI * 2;

/** The Moon's colours. */
export const LUNA = {
  white: '#f5f7fb', shell: '#e9edf4', silver: '#c3cad6', grey: '#8f97a6', dark: '#3a4150', ink: '#272c38',
  orange: '#ff8a3d', teal: '#2fb8c4', gold: '#f2c14e', red: '#ff5f5f', solar: '#2b3f8c'
};
const white = () => mat(LUNA.white, { rough: 0.6 });
const shell = () => mat(LUNA.shell, { rough: 0.6 });
const silver = () => mat(LUNA.silver, { rough: 0.35, metal: 0.6 });
const steel = () => mat(LUNA.grey, { rough: 0.45, metal: 0.5 });
const dark = () => mat(LUNA.dark, { rough: 0.6 });
const gold = () => mat(LUNA.gold, { rough: 0.3, metal: 0.8 });
const foil = () => mat('#e0a93a', { rough: 0.25, metal: 0.9 });
const glow = (c = '#7ff7ff') => mat(c, { emissive: c, ei: 0.8, key: 'moonglow' });

/* ---------------------------------------------------------------- painted textures */

const textures = new Map();
/** A painted texture, made once: deck plates, hazard stripes, solar cells, the regolith, a badge. */
export function painted(kind, a = '#dfe3ea', b = '#2b2f3a') {
  const key = `${kind}|${a}|${b}`;
  if (textures.has(key)) return textures.get(key);
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const col = new THREE.Color(a);
  const shade = (k, base = col) => `#${base.clone().multiplyScalar(k).getHexString()}`;
  const r = seeded(kind.length * 977 + a.charCodeAt(2) * 7 + b.charCodeAt(3));
  g.fillStyle = shade(1);
  g.fillRect(0, 0, N, N);
  if (kind === 'plates') {
    // Square deck plates, each its own shade, a seam and a rivet at each corner.
    const n = 4, s = N / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      g.fillStyle = shade(0.93 + r() * 0.1);
      g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      g.fillStyle = shade(1.05);
      g.fillRect(i * s + 2, j * s + 2, s - 4, 3);
      g.fillStyle = shade(0.72);
      for (const [x, y] of [[8, 8], [s - 10, 8], [8, s - 10], [s - 10, s - 10]]) g.fillRect(i * s + x, j * s + y, 3, 3);
      if (r() < 0.25) {
        // A grate: little slots.
        g.fillStyle = shade(0.66);
        for (let k = 0; k < 5; k++) g.fillRect(i * s + 14, j * s + 14 + k * 8, s - 28, 3);
      }
    }
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = shade(0.62);
    g.fillRect(0, 0, N, N);
  } else if (kind === 'hazard') {
    const cb = new THREE.Color(b);
    for (let i = -2; i < 10; i++) {
      g.fillStyle = shade(1, cb);
      g.beginPath();
      g.moveTo(i * 32, 0);
      g.lineTo(i * 32 + 16, 0);
      g.lineTo(i * 32 + 16 + N, N);
      g.lineTo(i * 32 + N, N);
      g.fill();
    }
  } else if (kind === 'solar') {
    // Solar cells: a deep blue grid with silver lines and a sheen.
    const n = 6, s = N / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      g.fillStyle = shade(0.85 + r() * 0.25);
      g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
    }
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.beginPath();
    g.moveTo(0, N * 0.3);
    g.lineTo(N * 0.3, 0);
    g.lineTo(N * 0.55, 0);
    g.lineTo(0, N * 0.55);
    g.fill();
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = '#c9d0dc';
    g.fillRect(0, 0, N, N);
  } else if (kind === 'regolith') {
    // Moon dust: fine speckles, little pebbles with a lit edge, soft blotches.
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, N, N);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(120,120,135,${0.05 + r() * 0.06})`;
      g.beginPath();
      g.arc(r() * N, r() * N, 6 + r() * 22, 0, TAU);
      g.fill();
    }
    for (let i = 0; i < 2600; i++) {
      const v = r();
      g.fillStyle = v < 0.5 ? `rgba(70,70,85,${0.12 + r() * 0.18})` : `rgba(255,255,255,${0.2 + r() * 0.3})`;
      g.fillRect(r() * N, r() * N, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    for (let i = 0; i < 60; i++) {
      const x = r() * N, y = r() * N, s = 1.5 + r() * 2.5;
      g.fillStyle = 'rgba(60,60,75,0.35)';
      g.beginPath();
      g.arc(x + 0.8, y + 0.8, s, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.arc(x, y, s, 0, TAU);
      g.fill();
    }
  } else if (kind === 'track') {
    // A rover track: a band of chevron treads, see-through between them.
    g.clearRect(0, 0, N, N);
    g.fillStyle = 'rgba(40,42,52,0.55)';
    for (let i = 0; i < 8; i++) {
      const y = i * 32;
      g.beginPath();
      g.moveTo(20, y + 4);
      g.lineTo(N / 2, y + 16);
      g.lineTo(N - 20, y + 4);
      g.lineTo(N - 20, y + 16);
      g.lineTo(N / 2, y + 28);
      g.lineTo(20, y + 16);
      g.fill();
    }
  } else if (kind === 'boot') {
    // One boot print: a rounded sole with tread bars (see-through round it).
    g.clearRect(0, 0, N, N);
    g.fillStyle = 'rgba(45,47,58,0.6)';
    g.beginPath();
    g.ellipse(N / 2, N * 0.34, N * 0.22, N * 0.26, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(N / 2, N * 0.76, N * 0.17, N * 0.18, 0, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 6; i++) g.fillRect(N * 0.3, N * 0.14 + i * 22, N * 0.4, 6);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  textures.set(key, tex);
  return tex;
}
const mats = new Map();
/** A textured cartoon material, cached. */
export function tmat(kind, a, b, { side = THREE.FrontSide, transparent = false } = {}) {
  const key = `${kind}|${a}|${b}|${side}|${transparent}`;
  if (!mats.has(key)) {
    const m = new THREE.MeshToonMaterial({ map: painted(kind, a, b), side, transparent, depthWrite: !transparent });
    if (transparent) {
      m.polygonOffset = true;
      m.polygonOffsetFactor = -2;
      m.polygonOffsetUnits = -4;
    }
    mats.set(key, m);
  }
  return mats.get(key);
}
/** Scale a geometry's UVs (the texture then tiles su × sv times). */
export function tile(geo, su, sv = su) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}

/** A round badge with a picture: 'numbers' (123), 'patch' (a mission-patch-like crest), 'star'. Faces +Z. */
const badges = new Map();
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
  g.fillStyle = '#16203f';
  g.beginPath();
  g.arc(m, m, m - 22, 0, TAU);
  g.fill();
  if (kind === 'numbers') {
    g.fillStyle = '#fff8e8';
    g.font = '900 92px "Nunito Variable", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('123', m, m + 6);
  } else {
    // Stars, a crescent, a little rocket on an orbit ring: an original crest.
    g.fillStyle = '#fff8e8';
    for (const [x, y, s] of [[70, 70, 5], [190, 80, 4], [176, 176, 6], [84, 188, 3], [128, 52, 3]]) {
      g.beginPath();
      g.arc(x, y, s, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#d9dde6';
    g.beginPath();
    g.arc(100, 140, 46, 0, TAU);
    g.fill();
    g.fillStyle = '#16203f';
    g.beginPath();
    g.arc(118, 128, 42, 0, TAU);
    g.fill();
    g.strokeStyle = color;
    g.lineWidth = 7;
    g.beginPath();
    g.ellipse(m, m + 4, 92, 34, -0.45, 0, TAU);
    g.stroke();
    g.save();
    g.translate(160, 108);
    g.rotate(0.6);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(0, 0, 12, 34, 0, 0, TAU);
    g.fill();
    g.fillStyle = LUNA.orange;
    g.beginPath();
    g.moveTo(-12, 18);
    g.lineTo(-22, 34);
    g.lineTo(-6, 28);
    g.fill();
    g.beginPath();
    g.moveTo(12, 18);
    g.lineTo(22, 34);
    g.lineTo(6, 28);
    g.fill();
    g.fillStyle = '#7fd8ff';
    g.beginPath();
    g.arc(0, -8, 6, 0, TAU);
    g.fill();
    g.fillStyle = '#ffb347';
    g.beginPath();
    g.moveTo(-7, 34);
    g.lineTo(0, 52);
    g.lineTo(7, 34);
    g.fill();
    g.restore();
  }
  g.strokeStyle = '#ffffff';
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

/* ---------------------------------------------------------------- small parts */

/** A round porthole facing +Z (rotate with ry): a white ring round glowing glass. */
function porthole(g, [x, y, z], ry = 0, r = 0.32) {
  const q = new THREE.Group();
  q.position.set(x, y, z);
  q.rotation.y = ry;
  add(q, new THREE.TorusGeometry(r, 0.07, 6, 18), white());
  add(q, new THREE.CircleGeometry(r, 18), windowMat, [0, 0, -0.01]);
  g.add(q);
}
/** An antenna mast with a glowing tip. */
function antenna(g, [x, y, z], h = 1.6) {
  add(g, cyl(0.04, 0.06, h, 6), silver(), [x, y + h / 2, z]);
  add(g, sphere(0.1, 10, 8), lampMat, [x, y + h + 0.06, z]);
  add(g, cyl(0.2, 0.2, 0.04, 10), white(), [x, y + h * 0.6, z]);
}
/** A solar panel wing on a post, its cells facing up and out. */
function solarWing(g, [x, y, z], yaw = 0, w = 2.2, d = 1.1) {
  const q = new THREE.Group();
  q.position.set(x, y, z);
  q.rotation.y = yaw;
  add(q, cyl(0.06, 0.06, 1.0, 6), steel(), [0, 0.5, 0]);
  add(q, box(w + 0.1, 0.06, d + 0.1), silver(), [0, 1.0, 0], [0.5, 0, 0]);
  add(q, tile(new THREE.PlaneGeometry(w, d), 2, 1), tmat('solar', LUNA.solar), [0, 1.04, 0.02], [-Math.PI / 2 + 0.5, 0, 0]);
  g.add(q);
}
/** A round airlock door facing +Z: an orange collar, a teal hatch with a porthole. */
function hatch(g, [x, y, z], r = 0.95, color = LUNA.orange) {
  add(g, new THREE.TorusGeometry(r + 0.06, 0.14, 8, 28), mat(color), [x, y + r, z]);
  add(g, new THREE.CircleGeometry(r, 28), mat(LUNA.teal), [x, y + r, z - 0.02]);
  add(g, new THREE.TorusGeometry(0.26, 0.05, 6, 16), white(), [x, y + r + 0.32, z + 0.02]);
  add(g, new THREE.CircleGeometry(0.26, 16), windowMat, [x, y + r + 0.32, z + 0.01]);
  add(g, box(0.5, 0.08, 0.08), white(), [x, y + r - 0.25, z + 0.04]);
}

/* ---------------------------------------------------------------- the base */

/** A landing-pad plinth: a metal disc, a hazard-striped rim, landing lights, a ramp to the door. */
export function lunarPlinth(P, look) {
  const g = new THREE.Group();
  const R = PLINTH_R;
  add(g, new THREE.CylinderGeometry(R, R + 0.12, PLINTH_H, 48), mat('#b9c0cc', { rough: 0.5, metal: 0.4 }), [0, PLINTH_H / 2, 0]);
  add(g, new THREE.CylinderGeometry(R + 0.05, R + 0.05, 0.14, 48, 1, true), tmat('hazard', '#ffcf3f', '#2b2f3a'), [0, PLINTH_H - 0.12, 0]);
  add(g, cyl(R - 0.1, R - 0.1, 0.05, 48), mat('#eef1f6', { rough: 0.7 }), [0, PLINTH_H + 0.02, 0]);
  add(g, new THREE.TorusGeometry(R - 0.55, 0.05, 4, 48), mat(look.banner), [0, PLINTH_H + 0.05, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.31;
    if (Math.cos(a) > 0.9) continue;
    add(g, cyl(0.09, 0.11, 0.12, 8), lampMat, [Math.sin(a) * (R - 0.25), PLINTH_H + 0.08, Math.cos(a) * (R - 0.25)]);
  }
  // The ramp down to the deck, with rails.
  add(g, box(2.4, 0.1, 1.3), mat('#d3d8e1', { rough: 0.6 }), [0, PLINTH_H / 2 - 0.02, R + 0.55], [0.4, 0, 0]);
  for (const sx of [-1.25, 1.25]) add(g, box(0.08, 0.08, 1.3), mat(look.banner), [sx, PLINTH_H / 2 + 0.25, R + 0.55], [0.4, 0, 0]);
  return g;
}

/* ---------------------------------------------------------------- math: the dome school */

export function domeSchool(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.04, z0 = -0.5, R = 3.0, H = 1.5;
  add(g, cyl(R, R + 0.12, H, 48), shell(), [0, y0 + H / 2, z0]);
  add(g, cyl(R + 0.08, R + 0.08, 0.24, 48), mat(look.roof.math), [0, y0 + H - 0.05, z0]);
  // The dome: white gores with silver seams.
  const dome = new THREE.SphereGeometry(R, 48, 20, 0, TAU, 0, Math.PI / 2);
  const A = new THREE.Color('#f7f9fc'), B = new THREE.Color('#e3e8f0');
  paint(dome, (x, y, z) => (Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * 12) % 2 ? A : B));
  add(g, dome, vcMat({ key: 'domegore' }), [0, y0 + H, z0]);
  for (const lat of [0.35, 0.8]) add(g, new THREE.TorusGeometry(R * Math.cos(lat) + 0.01, 0.045, 4, 64), silver(), [0, y0 + H + R * Math.sin(lat), z0], [Math.PI / 2, 0, 0]);
  // A glass cupola on top, glowing at night.
  add(g, new THREE.SphereGeometry(0.85, 24, 10, 0, TAU, 0, Math.PI / 2), windowMat, [0, y0 + H + R - 0.12, z0]);
  add(g, new THREE.TorusGeometry(0.86, 0.08, 6, 28), mat(look.roof.math), [0, y0 + H + R - 0.1, z0], [Math.PI / 2, 0, 0]);
  antenna(g, [0.5, y0 + H + R + 0.5, z0 - 0.3], 1.3);
  // Portholes round the drum (not at the porch).
  for (const a of [-0.95, 0.95, -1.75, 1.75, -2.55, 2.55, Math.PI]) porthole(g, [Math.sin(a) * (R + 0.02), y0 + 0.82, z0 + Math.cos(a) * (R + 0.02)], a, 0.3);
  // The "123" badge on the dome's front.
  const lat = 0.62;
  badge(g, 'numbers', [0, y0 + H + R * Math.sin(lat) + 0.02, z0 + R * Math.cos(lat) + 0.05], 0.72, look.roof.math, lat);
  // The airlock porch: a short round tunnel out to the door.
  const pz = z0 + R + 0.5;
  add(g, cyl(1.12, 1.12, 1.3, 28), white(), [0, y0 + 1.12, pz], [Math.PI / 2, 0, 0]);
  add(g, box(2.24, 1.12, 1.3), white(), [0, y0 + 0.56, pz]);
  add(g, new THREE.TorusGeometry(1.12, 0.08, 6, 28), mat(look.roof.math), [0, y0 + 1.12, pz - 0.2]);
  hatch(g, [0, y0 + 0.17, pz + 0.72], 0.95, look.roof.math);
  // Solar wings either side, counting blocks by the door.
  for (const sx of [-1, 1]) solarWing(g, [sx * 3.55, y0, z0 - 0.6], sx * 0.5, 1.6, 1.0);
  ['#ff6b6b', '#ffd23f', '#4fc3f7'].forEach((c, i) => add(g, box(0.5, 0.5, 0.5), mat(c), [2.4 + (i % 2) * 0.55, y0 + 0.25 + (i === 2 ? 0.5 : 0), 2.3 + (i === 2 ? 0 : 0)], [0, 0.3 * i, 0]));
  return y0 + H + R + 2.0;
}

/* ---------------------------------------------------------------- history: the moon museum */

export function museumModule(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.04, z0 = -0.5;
  const tiers = [[3.0, 2.3, look.roof.history], [2.3, 1.7, LUNA.teal], [1.55, 1.3, look.roof.history]];
  let y = y0;
  tiers.forEach(([R, h, band], i) => {
    add(g, cyl(R, R, h, 44), shell(), [0, y + h / 2, z0 - i * 0.12]);
    add(g, cyl(R + 0.05, R + 0.05, 0.2, 44), mat(band), [0, y + h - 0.14, z0 - i * 0.12]);
    add(g, cyl(R + 0.08, R + 0.08, 0.1, 44), silver(), [0, y + 0.05, z0 - i * 0.12]);
    // A band of windows: a museum's long glass, round the back.
    const n = Math.round(R * 4);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      if (i === 0 && Math.cos(a) > 0.55) continue;
      add(g, box(0.42, h * 0.32, 0.06), windowMat, [Math.sin(a) * (R + 0.02), y + h * 0.52, z0 - i * 0.12 + Math.cos(a) * (R + 0.02)], [0, a, 0]);
    }
    // Ribs between the modules.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + 0.2;
      add(g, box(0.1, h - 0.3, 0.1), silver(), [Math.sin(a) * (R + 0.04), y + h / 2, z0 - i * 0.12 + Math.cos(a) * (R + 0.04)], [0, a, 0]);
    }
    y += h;
  });
  add(g, new THREE.SphereGeometry(1.55, 28, 10, 0, TAU, 0, Math.PI / 2), white(), [0, y, z0 - 0.24]);
  add(g, cyl(0.03, 0.03, 1.6, 5), silver(), [0, y + 2.2, z0 - 0.24]);
  const pennant = new THREE.Shape();
  pennant.moveTo(0, 0);
  pennant.lineTo(0.9, -0.22);
  pennant.lineTo(0, -0.44);
  add(g, new THREE.ShapeGeometry(pennant), mat(look.banner, { side: THREE.DoubleSide }), [0.03, y + 2.95, z0 - 0.24]);
  add(g, sphere(0.09, 8, 6), gold(), [0, y + 3.02, z0 - 0.24]);
  // The door with its porch, the crest over it.
  const fz = z0 + 3.0;
  add(g, box(2.0, 2.2, 0.6), white(), [0, y0 + 1.1, fz]);
  add(g, box(2.1, 0.18, 0.7), mat(look.roof.history), [0, y0 + 2.25, fz]);
  add(g, box(1.2, 1.75, 0.08), mat(LUNA.teal), [0, y0 + 0.9, fz + 0.31]);
  add(g, box(0.06, 1.7, 0.1), white(), [0, y0 + 0.9, fz + 0.34]);
  for (const sx of [-0.3, 0.3]) add(g, box(0.36, 0.5, 0.06), windowMat, [sx, y0 + 1.3, fz + 0.36]);
  badge(g, 'patch', [0, y0 + 2.3 + 0.62, z0 + 3.03], 0.62, look.roof.history);
  // A docking ring on the side.
  add(g, cyl(0.9, 0.9, 1.0, 24), silver(), [-3.3, y0 + 1.25, z0], [0, 0, Math.PI / 2]);
  add(g, new THREE.TorusGeometry(0.9, 0.12, 6, 24), mat(LUNA.orange), [-3.8, y0 + 1.25, z0], [0, Math.PI / 2, 0]);
  // A display case by the door: a moon rock under glass.
  add(g, box(0.8, 0.8, 0.8), white(), [2.6, y0 + 0.4, 2.4]);
  add(g, ico(0.25, 1), mat('#8f8f9c'), [2.6, y0 + 1.03, 2.4], [0.4, 0.3, 0], [1, 0.75, 1.1]);
  add(g, box(0.7, 0.6, 0.7), mat('#bfe9ff', { opacity: 0.35, key: 'moonglass' }), [2.6, y0 + 1.1, 2.4]);
  return y + 4;
}

/* ---------------------------------------------------------------- physics: the star observatory */

export function moonObservatory(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.04, z0 = -0.6, R = 2.8, H = 2.2;
  add(g, cyl(R, R + 0.1, H, 44), shell(), [0, y0 + H / 2, z0]);
  add(g, cyl(R + 0.06, R + 0.06, 0.24, 44), mat(look.roof.physics), [0, y0 + H - 0.1, z0]);
  add(g, cyl(R + 0.18, R + 0.18, 0.12, 44), silver(), [0, y0 + H + 0.06, z0]);
  for (const a of [-1.1, 1.1, -2.1, 2.1, Math.PI]) porthole(g, [Math.sin(a) * (R + 0.02), y0 + 1.15, z0 + Math.cos(a) * (R + 0.02)], a, 0.3);
  // The dome turns (buildings.js swings `dome`): silver, a dark slit, the telescope looking out of it.
  const dome = new THREE.Group();
  dome.position.set(0, y0 + H + 0.1, z0);
  dome.userData.live = true;
  add(dome, new THREE.SphereGeometry(R - 0.05, 40, 16, 0, TAU, 0, Math.PI / 2), mat('#dfe5ee', { rough: 0.25, metal: 0.55 }));
  add(dome, new THREE.SphereGeometry(R + 0.01, 8, 16, Math.PI / 2 - 0.17, 0.34, 0.05, Math.PI / 2 - 0.05), dark());
  // The telescope leans out of the slit: its axis (0, cos 0.75, sin 0.75).
  const ax = (t) => [0, 1.7 + t * Math.cos(0.75), 1.2 + t * Math.sin(0.75)];
  add(dome, cyl(0.42, 0.52, 3.0, 16), white(), ax(0), [0.75, 0, 0]);
  add(dome, cyl(0.5, 0.5, 0.25, 16), mat(look.roof.physics), ax(1.3), [0.75, 0, 0]);
  add(dome, new THREE.CircleGeometry(0.42, 16), windowMat, ax(1.51), [0.75 - Math.PI / 2, 0, 0]);
  add(dome, new THREE.TorusGeometry(R - 0.04, 0.06, 4, 48), mat(look.roof.physics), [0, 0.08, 0], [Math.PI / 2, 0, 0]);
  g.add(dome);
  g.userData.dome = dome;
  // The door.
  add(g, box(1.8, 2.0, 0.7), white(), [0, y0 + 1.0, z0 + R + 0.1]);
  hatch(g, [0, y0 + 0.05, z0 + R + 0.46], 0.82, look.roof.physics);
  // A little lab pod on the side, a radar dish on a post.
  add(g, new THREE.SphereGeometry(1.25, 24, 10, 0, TAU, 0, Math.PI / 2), white(), [-3.3, y0, z0 + 0.6]);
  add(g, new THREE.TorusGeometry(1.25, 0.08, 6, 24), mat(LUNA.teal), [-3.3, y0 + 0.05, z0 + 0.6], [Math.PI / 2, 0, 0]);
  porthole(g, [-3.3 + Math.sin(0.6) * 1.0, y0 + 0.7, z0 + 0.6 + Math.cos(0.6) * 1.0], 0.6, 0.24);
  add(g, cyl(0.07, 0.09, 2.2, 6), steel(), [3.2, y0 + 1.1, z0 - 0.6]);
  const dish = new THREE.LatheGeometry([0, 0.2, 0.4, 0.6, 0.75].map((r) => new THREE.Vector2(r, r * r * 0.55)), 20);
  add(g, dish, mat(LUNA.white, { side: THREE.DoubleSide }), [3.2, y0 + 2.3, z0 - 0.6], [0.7, 0.6, 0]);
  add(g, cyl(0.02, 0.02, 0.6, 4), silver(), [3.2, y0 + 2.55, z0 - 0.35], [0.7, 0.6, 0]);
  return y0 + H + R + 2.2;
}

/* ---------------------------------------------------------------- the smaller places */

/** A white pod canopy over a small place: slim legs, a shallow dome, a coloured band with lights. */
export function podCanopy(look, r, seed = 1) {
  const g = new THREE.Group();
  const R = r + 0.55, H = 3.5;
  const rnd = seeded(seed);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + TAU / 10;
    add(g, cyl(0.07, 0.1, H, 6), silver(), [Math.sin(a) * R, H / 2, Math.cos(a) * R]);
    add(g, cyl(0.18, 0.22, 0.12, 8), steel(), [Math.sin(a) * R, 0.06, Math.cos(a) * R]);
  }
  const capR = R + 0.7, span = 0.95;
  add(g, new THREE.SphereGeometry(capR, 32, 8, 0, TAU, 0, span), mat(LUNA.white, { side: THREE.DoubleSide }), [0, H - capR * Math.cos(span), 0]);
  const rimR = capR * Math.sin(span);
  add(g, new THREE.TorusGeometry(rimR, 0.16, 6, 40), mat(look.banner), [0, H, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + rnd() * 0.02;
    add(g, sphere(0.07, 6, 4), lampMat, [Math.sin(a) * (rimR + 0.15), H - 0.02, Math.cos(a) * (rimR + 0.15)]);
  }
  antenna(g, [0, H + capR * (1 - Math.cos(span)) - 0.05, 0], 0.8);
  return batch(g);
}

/* ---------------------------------------------------------------- the shared models */

/** A toy rocket about 10 m tall at scale 1, standing on its fins: white, an orange nose, a porthole. */
export function rocketModel(look = null) {
  const g = new THREE.Group();
  const accent = look?.banner ?? LUNA.orange;
  const prof = [[0.0, 1.2], [0.9, 1.2], [1.15, 2.0], [1.2, 5.2], [1.1, 6.6], [0.78, 8.0], [0.32, 9.2], [0.0, 9.6]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.LatheGeometry(prof, 32);
  paint(body, (x, y) => new THREE.Color(y > 6.6 ? accent : y > 4.9 && y < 5.3 ? LUNA.teal : y < 1.5 ? '#c3cad6' : '#f7f9fc'));
  add(g, body, vcMat({ key: 'rocket' }));
  add(g, new THREE.TorusGeometry(0.42, 0.09, 8, 20), white(), [0, 5.9, 1.11], [0, 0, 0]);
  add(g, new THREE.CircleGeometry(0.42, 20), windowMat, [0, 5.9, 1.1]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const fin = new THREE.Shape();
    fin.moveTo(0, 0);
    fin.lineTo(1.3, -0.4);
    fin.lineTo(1.35, 1.1);
    fin.lineTo(0, 3.2);
    const geo = new THREE.ExtrudeGeometry(fin, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
    geo.translate(0, 0, -0.08);
    add(g, geo, mat(i % 2 ? accent : LUNA.teal), [Math.sin(a) * 1.05, 1.4, Math.cos(a) * 1.05], [0, a - Math.PI / 2, 0]);
  }
  add(g, cyl(0.6, 0.85, 0.7, 20), steel(), [0, 0.95, 0]);
  return g;
}

/** A toy lunar lander about 4.6 m tall at scale 1: a gold-foil stage on four legs, a white cabin with windows. */
export function landerModel() {
  const g = new THREE.Group();
  add(g, cyl(1.35, 1.35, 1.1, 8), foil(), [0, 1.65, 0], [0, Math.PI / 8, 0]);
  add(g, cyl(1.4, 1.4, 0.12, 8), silver(), [0, 2.24, 0], [0, Math.PI / 8, 0]);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const [sx, sz] = [Math.sin(a), Math.cos(a)];
    const top = new THREE.Vector3(sx * 1.2, 1.9, sz * 1.2), foot = new THREE.Vector3(sx * 2.4, 0.15, sz * 2.4);
    const mid = top.clone().add(foot).multiplyScalar(0.5);
    const len = top.distanceTo(foot);
    const leg = add(g, cyl(0.08, 0.1, len, 8), silver(), [mid.x, mid.y, mid.z]);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(foot).normalize());
    add(g, cyl(0.42, 0.48, 0.12, 14), silver(), [foot.x, 0.08, foot.z]);
    // A side strut back to the stage.
    const s2 = new THREE.Vector3(sx * 1.25, 1.25, sz * 1.25);
    const m2 = s2.clone().add(foot).multiplyScalar(0.5);
    const strut = add(g, cyl(0.04, 0.04, s2.distanceTo(foot), 6), steel(), [m2.x, m2.y, m2.z]);
    strut.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), s2.clone().sub(foot).normalize());
  }
  // The cabin: a white faceted box with two windows, a hatch, a dish and an antenna.
  add(g, cyl(1.0, 1.1, 1.3, 6), white(), [0, 2.95, -0.1], [0, Math.PI / 6, 0]);
  add(g, cyl(0.7, 1.0, 0.45, 6), shell(), [0, 3.82, -0.1], [0, Math.PI / 6, 0]);
  for (const sx of [-1, 1]) porthole(g, [sx * 0.34, 3.15, 0.8], 0, 0.2);
  add(g, box(0.6, 0.6, 0.1), mat(LUNA.teal), [0, 2.62, 0.86]);
  add(g, box(0.5, 0.06, 1.0), silver(), [0, 2.25, 1.45]);
  for (let i = 0; i < 4; i++) add(g, box(0.5, 0.04, 0.06), silver(), [0, 0.5 + i * 0.4, 1.9 - i * 0.12]);
  add(g, cyl(0.03, 0.03, 0.8, 5), silver(), [0.55, 4.3, -0.5]);
  add(g, new THREE.LatheGeometry([0, 0.15, 0.3, 0.4].map((r) => new THREE.Vector2(r, r * r * 0.9)), 14), mat(LUNA.white, { side: THREE.DoubleSide }), [0.55, 4.7, -0.5], [0.6, 0, 0.3]);
  add(g, cyl(0.02, 0.02, 1.0, 4), silver(), [-0.5, 4.4, -0.4]);
  add(g, sphere(0.08, 8, 6), lampMat, [-0.5, 4.92, -0.4]);
  add(g, cone(0.55, 0.6, 12, 1), steel(), [0, 0.95, 0], [Math.PI, 0, 0]);
  return g;
}

/**
 * A cute toy moon rover about 4.4 m long at scale 1 (looking along +Z): six chunky wheels on
 * rockers, a white body, a solar deck, a camera head with two big lens eyes on a mast.
 * Returns the group; `userData.wheels` turn, `userData.head` looks about.
 */
export function roverModel(look = null) {
  const g = new THREE.Group();
  const accent = look?.banner ?? LUNA.orange;
  add(g, box(2.2, 0.8, 3.4), white(), [0, 1.45, 0]);
  add(g, box(2.3, 0.18, 3.5), mat(accent), [0, 1.1, 0]);
  add(g, tile(new THREE.PlaneGeometry(2.4, 3.2), 2, 3), tmat('solar', LUNA.solar), [0, 1.87, -0.1], [-Math.PI / 2, 0, 0]);
  add(g, box(2.5, 0.06, 3.3), silver(), [0, 1.85, -0.1]);
  const wheels = [];
  for (const sx of [-1, 1]) {
    add(g, box(0.16, 0.16, 3.4), steel(), [sx * 1.25, 1.05, 0]);
    for (const z of [-1.3, 0, 1.3]) {
      const w = new THREE.Group();
      w.position.set(sx * 1.45, 0.52, z);
      w.userData.live = true;
      add(w, cyl(0.52, 0.52, 0.42, 16), mat('#4a5060', { rough: 0.9 }), [0, 0, 0], [0, 0, Math.PI / 2]);
      for (let k = 0; k < 8; k++) add(w, box(0.44, 0.1, 0.16), dark(), [0, Math.sin((k / 8) * TAU) * 0.52, Math.cos((k / 8) * TAU) * 0.52], [(k / 8) * TAU, 0, 0]);
      add(w, cyl(0.24, 0.24, 0.46, 12), silver(), [0, 0, 0], [0, 0, Math.PI / 2]);
      g.add(w);
      wheels.push(w);
    }
  }
  // The mast and the head: two big lens eyes, a little antenna.
  add(g, cyl(0.08, 0.1, 1.2, 8), silver(), [0, 2.4, 1.2]);
  const head = new THREE.Group();
  head.position.set(0, 3.1, 1.2);
  head.userData.live = true;
  add(head, box(1.1, 0.55, 0.55), white(), [0, 0, 0]);
  add(head, box(1.14, 0.1, 0.58), mat(accent), [0, -0.2, 0]);
  for (const sx of [-0.27, 0.27]) {
    add(head, cyl(0.2, 0.22, 0.14, 16), dark(), [sx, 0.04, 0.3], [Math.PI / 2, 0, 0]);
    add(head, new THREE.CircleGeometry(0.15, 16), mat('#7fd8ff', { emissive: '#3fa6ff', ei: 0.6, key: 'lens' }), [sx, 0.04, 0.38]);
    add(head, sphere(0.04, 6, 4), mat('#ffffff', { emissive: '#ffffff', ei: 1 }), [sx + 0.05, 0.1, 0.4]);
  }
  add(head, cyl(0.02, 0.02, 0.5, 4), silver(), [0.4, 0.5, -0.1]);
  add(head, sphere(0.06, 8, 6), lampMat, [0.4, 0.78, -0.1]);
  g.add(head);
  // A dish antenna at the back.
  add(g, cyl(0.04, 0.04, 0.7, 5), silver(), [-0.7, 2.25, -1.3]);
  add(g, new THREE.LatheGeometry([0, 0.25, 0.45, 0.6].map((r) => new THREE.Vector2(r, r * r * 0.7)), 16), mat(LUNA.white, { side: THREE.DoubleSide }), [-0.7, 2.6, -1.3], [-0.5, 0, 0]);
  g.userData.wheels = wheels;
  g.userData.head = head;
  return g;
}

/** A radio telescope about 7 m tall at scale 1: a drum, a tower, a yoke and a big white dish (`userData.dish` turns). */
export function dishModel(look = null) {
  const g = new THREE.Group();
  add(g, cyl(1.8, 2.0, 0.8, 24), white(), [0, 0.4, 0]);
  add(g, cyl(1.85, 1.85, 0.16, 24), mat(look?.banner ?? LUNA.teal), [0, 0.75, 0]);
  add(g, cyl(0.7, 1.1, 2.6, 12), shell(), [0, 2.1, 0]);
  const turn = new THREE.Group();
  turn.position.set(0, 3.4, 0);
  turn.userData.live = true;
  add(turn, box(2.2, 0.3, 0.7), silver(), [0, 0.1, 0]);
  for (const sx of [-1, 1]) add(turn, box(0.25, 1.6, 0.5), silver(), [sx * 1.0, 0.85, 0]);
  const tilt = new THREE.Group();
  tilt.position.set(0, 1.5, 0);
  tilt.rotation.x = -0.75;
  const prof = [];
  for (let i = 0; i <= 10; i++) {
    const r = (i / 10) * 3.0;
    prof.push(new THREE.Vector2(r, (r * r) / 9));
  }
  add(tilt, new THREE.LatheGeometry(prof, 36), mat(LUNA.white, { side: THREE.DoubleSide, rough: 0.5 }), [0, 0, 0]);
  add(tilt, new THREE.TorusGeometry(3.0, 0.08, 6, 48), mat(look?.banner ?? LUNA.orange), [0, 1.0, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const foot = new THREE.Vector3(Math.sin(a) * 2.4, 0.64, Math.cos(a) * 2.4), tip = new THREE.Vector3(0, 2.6, 0);
    const m = add(tilt, cyl(0.04, 0.04, foot.distanceTo(tip), 4), silver(), [(foot.x + tip.x) / 2, (foot.y + tip.y) / 2, (foot.z + tip.z) / 2]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(foot).normalize());
  }
  add(tilt, cyl(0.22, 0.14, 0.5, 10), silver(), [0, 2.75, 0]);
  add(tilt, sphere(0.12, 8, 6), lampMat, [0, 3.05, 0]);
  add(tilt, cyl(0.5, 0.5, 0.3, 14), steel(), [0, -0.05, 0]);
  turn.add(tilt);
  g.add(turn);
  g.userData.dish = turn;
  g.userData.tilt = tilt;
  return g;
}

/* ---------------------------------------------------------------- the landmarks */

/** The round pad a landmark stands on: a metal drum, a white top, a teal ring, dashed lights. */
function moonPad(g, r, look) {
  add(g, new THREE.CylinderGeometry(r, r + 0.15, 0.36, 40), mat('#b9c0cc', { rough: 0.5, metal: 0.4 }), [0, 0.18, 0]);
  add(g, cyl(r, r, 0.05, 40), mat('#eef1f6'), [0, 0.36, 0]);
  add(g, new THREE.TorusGeometry(r - 0.3, 0.06, 4, 48), mat(look?.banner ?? LUNA.teal), [0, 0.39, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    add(g, cyl(0.08, 0.08, 0.06, 8), lampMat, [Math.sin(a) * (r - 0.65), 0.4, Math.cos(a) * (r - 0.65)]);
  }
}
/** A short puff of flame/exhaust under something (a cone that glows), hidden until used. */
function flame(parent, [x, y, z], s = 1) {
  const f = add(parent, cone(0.5 * s, 1.5 * s, 12), new THREE.MeshStandardMaterial({ color: '#ffd28a', emissive: '#ff8a2a', emissiveIntensity: 1.6 }), [x, y, z], [Math.PI, 0, 0]);
  f.visible = false;
  return f;
}

export const MOON_LANDMARKS = {
  /** Landing Crater: a little lunar lander; tap it and it hops up on a puff of flame and settles again. */
  lander(look) {
    const g = new THREE.Group();
    moonPad(g, 4.0, look);
    batch(g);
    const ship = new THREE.Group();
    ship.position.y = 0.4;
    ship.userData.live = true;
    ship.add(landerModel());
    const f = flame(ship, [0, 0.4, 0], 0.9);
    ship.scale.setScalar(0.95);
    batch(ship);
    g.add(ship);
    let t = 9;
    g.userData = { top: 6, poke: () => (t = 0), update(dt) { t += dt; const k = t < 2.6 ? Math.sin((t / 2.6) * Math.PI) : 0; ship.position.y = 0.4 + k * 1.8; f.visible = t < 2.6; f.scale.y = 0.7 + Math.random() * 0.5; } };
    return g;
  },
  /** Rocket Ridge: a little rocket by its launch tower; tap it for a countdown hop. */
  minirocket(look) {
    const g = new THREE.Group();
    moonPad(g, 4.0, look);
    // The launch tower: a lattice of white bars with an orange arm.
    const tx = -2.3;
    for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) add(g, box(0.12, 8.2, 0.12), white(), [tx + x, 4.5, z]);
    for (let i = 0; i < 8; i++) {
      add(g, box(1.1, 0.08, 0.08), mat(i % 2 ? LUNA.orange : LUNA.white), [tx, 1.0 + i, 0.5]);
      add(g, box(1.1, 0.08, 0.08), mat(LUNA.white), [tx, 1.0 + i, -0.5]);
      add(g, box(0.08, 0.08, 1.1), mat(LUNA.white), [tx + 0.5, 1.0 + i, 0]);
    }
    add(g, box(1.6, 0.16, 0.24), mat(LUNA.orange), [tx + 1.2, 6.2, 0]);
    add(g, sphere(0.14, 8, 6), lampMat, [tx, 8.7, 0]);
    batch(g);
    const ship = new THREE.Group();
    ship.position.set(0.6, 0.4, 0);
    ship.userData.live = true;
    ship.add(rocketModel(look));
    ship.scale.setScalar(0.72);
    const f = flame(ship, [0, 0.9, 0], 1.1);
    batch(ship);
    g.add(ship);
    let t = 9;
    g.userData = { top: 8.5, poke: () => (t = 0), update(dt) { t += dt; const up = t < 2.4 ? Math.sin((t / 2.4) * Math.PI) * 2.6 : 0; ship.position.y = 0.4 + up; f.visible = t < 2.4; f.scale.y = 0.8 + Math.random() * 0.5; } };
    return g;
  },
  /** Rover Tracks: a round garage with a little rover parked out front; tap it and the rover drives a lap. */
  rovergarage(look) {
    const g = new THREE.Group();
    moonPad(g, 4.1, look);
    const hz = -1.8;
    add(g, new THREE.CylinderGeometry(2.0, 2.0, 3.4, 24, 1, false, -Math.PI / 2, Math.PI), white(), [0, 0.4, hz], [0, 0, Math.PI / 2]);
    for (const sx of [-1.7, 1.7]) add(g, new THREE.TorusGeometry(2.02, 0.09, 6, 24, Math.PI), mat(look.banner), [sx, 0.4, hz], [0, Math.PI / 2, 0]);
    add(g, new THREE.CircleGeometry(2.0, 24, 0, Math.PI), white(), [0, 0.4, hz - 1.7], [0, Math.PI, 0]);
    add(g, new THREE.CircleGeometry(1.4, 20, 0, Math.PI), dark(), [0, 0.4, hz + 1.71]);
    add(g, new THREE.RingGeometry(1.4, 2.0, 24, 1, 0, Math.PI), white(), [0, 0.4, hz + 1.7]);
    add(g, sphere(0.12, 8, 6), lampMat, [0, 2.55, hz + 1.5]);
    antenna(g, [1.0, 2.1, hz - 0.6], 1.0);
    batch(g);
    const rover = roverModel(look);
    rover.scale.setScalar(0.48);
    const hold = new THREE.Group();
    hold.position.set(0, 0.4, 1.4);
    hold.userData.live = true;
    hold.add(rover);
    g.add(hold);
    let t = 9, clock = 0;
    g.userData = {
      top: 5,
      poke: () => (t = 0),
      update(dt) {
        t += dt;
        clock += dt;
        const lap = t < 4 ? (t / 4) * TAU : 0;
        hold.position.set(Math.sin(lap) * 2.2, 0.4, 1.4 + (1 - Math.cos(lap)) * -0.6);
        hold.rotation.y = t < 4 ? Math.atan2(2.2 * Math.cos(lap), -0.6 * Math.sin(lap)) : 0;
        for (const w of rover.userData.wheels) w.rotation.x += dt * (t < 4 ? 8 : 0);
        rover.userData.head.rotation.y = Math.sin(clock * 0.7) * 0.6;
      }
    };
    return g;
  },
  /** Dish Valley: a radio dish that turns slowly to listen to the stars; tap it and it spins and sends rings of signal. */
  dish(look) {
    const g = new THREE.Group();
    moonPad(g, 4.0, look);
    batch(g);
    const d = dishModel(look);
    d.position.y = 0.4;
    d.scale.setScalar(0.85);
    g.add(d);
    const rings = [0, 1, 2].map(() => {
      const m = add(g, new THREE.TorusGeometry(1, 0.05, 6, 32), new THREE.MeshBasicMaterial({ color: '#7ff7ff', transparent: true, opacity: 0, depthWrite: false }), [0, 6.6, 0], [Math.PI / 2, 0, 0]);
      m.userData.live = true;
      return m;
    });
    batch(d);
    let t = 9, clock = 0;
    g.userData = {
      top: 8,
      poke: () => (t = 0),
      update(dt) {
        t += dt;
        clock += dt;
        d.userData.dish.rotation.y += dt * (t < 2.5 ? 2.5 : 0.12);
        rings.forEach((m, i) => {
          const k = t < 3 ? ((t * 0.9 + i * 0.33) % 1) : 0;
          m.scale.setScalar(0.5 + k * 3.5);
          m.material.opacity = t < 3 ? (1 - k) * 0.8 : 0;
          m.position.y = 6.6 + k * 2;
        });
        void clock;
      }
    };
    return g;
  },
  /** Greenhouse Crater: a glass dome full of moon-grown plants under glowing lamps; tap it and the plants dance. */
  greenhouse(look) {
    const g = new THREE.Group();
    moonPad(g, 4.0, look);
    add(g, cyl(3.3, 3.3, 0.5, 40), white(), [0, 0.6, 0]);
    add(g, cyl(3.0, 3.0, 0.1, 40), mat('#6b4a3a'), [0, 0.86, 0]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      add(g, new THREE.TorusGeometry(3.32, 0.06, 4, 32, Math.PI / 2), silver(), [0, 0.85, 0], [0, a, Math.PI / 2]);
    }
    add(g, new THREE.TorusGeometry(3.32, 0.12, 6, 40), mat(look.banner), [0, 0.85, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 5; i++) add(g, cyl(0.12, 0.12, 0.06, 8), mat('#ff9ef0', { emissive: '#ff7ae0', ei: 0.9, key: 'growlamp' }), [Math.sin(i * 1.26) * 1.6, 3.6, Math.cos(i * 1.26) * 1.6]);
    batch(g);
    const plants = new THREE.Group();
    plants.userData.live = true;
    const r = seeded(31);
    const leaf = [mat('#5fbf6a'), mat('#7fd88a'), mat('#4fae5a')];
    const fruit = [mat('#ff6b6b'), mat('#ffd23f'), mat('#ff9ed2')];
    const items = [];
    for (let i = 0; i < 16; i++) {
      const a = r() * TAU, d = 0.4 + r() * 2.2;
      const p = new THREE.Group();
      p.position.set(Math.sin(a) * d, 0.9, Math.cos(a) * d);
      const h = 0.5 + r() * 0.9;
      add(p, cyl(0.04, 0.05, h, 5), leaf[2], [0, h / 2, 0]);
      add(p, ico(0.28 + r() * 0.2, 1), leaf[i % 2], [0, h, 0], [0, 0, 0], [1, 0.8, 1]);
      if (i % 2) add(p, sphere(0.11, 8, 6), fruit[i % 3], [0.18, h + 0.05, 0.12]);
      if (i % 5 === 0) {
        add(p, cyl(0.03, 0.03, 1.2, 5), leaf[2], [0, 0.6, 0]);
        add(p, cyl(0.3, 0.3, 0.06, 12), mat('#ffd23f'), [0, 1.25, 0.04], [Math.PI / 2, 0, 0]);
        add(p, cyl(0.14, 0.14, 0.08, 10), mat('#8a5a2c'), [0, 1.25, 0.08], [Math.PI / 2, 0, 0]);
      }
      plants.add(p);
      items.push(p);
    }
    g.add(plants);
    const glass = add(g, new THREE.SphereGeometry(3.3, 40, 16, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#d9f6ff', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }), [0, 0.85, 0]);
    glass.userData.live = true;
    glass.castShadow = false;
    glass.renderOrder = 2;
    let t = 9, clock = 0;
    g.userData = { top: 5.2, poke: () => (t = 0), update(dt) { t += dt; clock += dt; items.forEach((p, i) => { const k = t < 2 ? Math.sin(t * 12 + i) * Math.exp(-t * 1.5) * 0.25 : 0; p.scale.set(1 - k * 0.5, 1 + k + Math.sin(clock * 1.5 + i) * 0.03, 1 - k * 0.5); }); } };
    return g;
  },
  /** Crystal Caves: a rocky mound with a cave mouth and glowing crystals; tap it and they light up. */
  crystals(look) {
    const g = new THREE.Group();
    moonPad(g, 4.0, look);
    const rock = [mat('#9a9ca8'), mat('#868896'), mat('#b0b2bd')];
    const r = seeded(9);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.55 + (i / 8) * Math.PI * 0.9 + (r() - 0.5) * 0.2;
      const d = 1.6 + r() * 1.0, s = 1.0 + r() * 0.8;
      add(g, ico(s, 1), rock[i % 3], [Math.sin(a) * d, 0.4 + s * 0.5, Math.cos(a) * d], [r(), r(), r()], [1, 0.8, 1]);
    }
    add(g, ico(1.9, 1), rock[0], [0, 1.6, -1.2], [0.3, 0.2, 0], [1.3, 1.0, 1]);
    add(g, new THREE.CircleGeometry(0.9, 16, 0, Math.PI), mat('#1d1f2b'), [0, 0.42, 0.62], [-0.15, 0, 0]);
    batch(g);
    const gems = new THREE.Group();
    gems.userData.live = true;
    const glows = ['#7ff7ff', '#c39bff', '#ff9ed2'].map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7, roughness: 0.2, flatShading: true }));
    for (let i = 0; i < 11; i++) {
      const a = r() * TAU, d = 1.2 + r() * 2.2;
      const s = 0.3 + r() * 0.5;
      const m = add(gems, new THREE.OctahedronGeometry(s, 0), glows[i % 3], [Math.sin(a) * d, 0.5 + s * 1.1 + (d < 2 ? 1.6 : 0.2), Math.cos(a) * d - 0.4], [r() * 0.5, r() * TAU, r() * 0.5], [0.6, 1.8, 0.6]);
      m.castShadow = false;
    }
    g.add(gems);
    let t = 9, clock = 0;
    g.userData = { top: 5.5, poke: () => (t = 0), update(dt) { t += dt; clock += dt; const k = t < 2.5 ? (1 - t / 2.5) * 1.6 : 0; glows.forEach((m, i) => (m.emissiveIntensity = 0.55 + Math.sin(clock * 1.6 + i * 2) * 0.2 + k)); gems.rotation.y = t < 2.5 ? Math.sin(t * 9) * 0.05 : 0; } };
    return g;
  },
  /** Starlight Station: a satellite on a tall mast with solar wings, turning; tap it and it spins and blinks. */
  satellite(look) {
    const g = new THREE.Group();
    moonPad(g, 4.0, look);
    add(g, cyl(0.25, 0.4, 4.6, 10), white(), [0, 2.7, 0]);
    add(g, cyl(0.45, 0.45, 0.2, 12), mat(look.banner), [0, 1.0, 0]);
    batch(g);
    const sat = new THREE.Group();
    sat.position.y = 5.6;
    sat.userData.live = true;
    add(sat, box(1.3, 1.3, 1.3), foil());
    add(sat, box(1.35, 0.12, 1.35), silver(), [0, 0.6, 0]);
    for (const sx of [-1, 1]) {
      add(sat, cyl(0.05, 0.05, 0.8, 5), silver(), [sx * 1.0, 0, 0], [0, 0, Math.PI / 2]);
      add(sat, box(2.4, 0.06, 1.1), silver(), [sx * 2.6, 0, 0]);
      add(sat, tile(new THREE.PlaneGeometry(2.3, 1.0), 3, 1), tmat('solar', LUNA.solar, '#2b2f3a', { side: THREE.DoubleSide }), [sx * 2.6, 0.04, 0], [-Math.PI / 2, 0, 0]);
    }
    add(sat, new THREE.LatheGeometry([0, 0.3, 0.55, 0.75].map((r) => new THREE.Vector2(r, r * r * 0.6)), 18), mat(LUNA.white, { side: THREE.DoubleSide }), [0, 0.85, 0.3], [-0.4, 0, 0]);
    add(sat, cyl(0.02, 0.02, 0.6, 4), silver(), [0, 1.1, 0.45], [-0.4, 0, 0]);
    const blink = add(sat, sphere(0.12, 8, 6), mat('#ff6f6f', { emissive: '#ff4d4d', ei: 1.2, key: 'blink' }), [0, -0.75, 0]);
    g.add(sat);
    let t = 9, clock = 0;
    g.userData = { top: 8, poke: () => (t = 0), update(dt) { t += dt; clock += dt; sat.rotation.y += dt * (t < 2.5 ? 4 : 0.25); sat.rotation.z = Math.sin(clock * 0.6) * 0.08; blink.visible = Math.sin(clock * (t < 2.5 ? 18 : 4)) > -0.2; } };
    return g;
  }
};
export const MOON_LANDMARK_ICONS = { lander: '🛬', minirocket: '🚀', rovergarage: '🚙', dish: '📡', greenhouse: '🌱', crystals: '💎', satellite: '🛰️' };

/* ---------------------------------------------------------------- the airlock */

/**
 * An airlock at the start of a glass tube: a round white collar round the tube with a hazard band,
 * two half-round doors that slide apart into side pockets, a light (red shut, green open).
 * Same API as structures.js buildGate: setOpen(on, instant), update(dt).
 */
export function airlockGate(s, look, tubeR = 2.4) {
  const g = new THREE.Group();
  const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
  g.position.set(s.a.x, s.a.y, s.a.z);
  g.rotation.y = Math.atan2(dx, dz);
  // The tube's middle is 1.2 m over the floor (moon/scene.js), so the floor fits inside the glass.
  const cy = 1.2;
  const frame = new THREE.Group();
  add(frame, new THREE.TorusGeometry(tubeR + 0.25, 0.42, 12, 48), white(), [0, cy, 0]);
  add(frame, new THREE.TorusGeometry(tubeR + 0.25, 0.44, 4, 48, Math.PI * 0.9), tmat('hazard', '#ffcf3f', '#2b2f3a'), [0, cy, 0], [0, 0, Math.PI * 0.05]);
  for (const sx of [-1, 1]) {
    add(frame, box(2.9, tubeR * 2 + 0.6, 0.9), white(), [sx * (tubeR + 1.45), cy - 0.1, 0]);
    add(frame, box(2.92, 0.18, 0.92), mat(look.banner), [sx * (tubeR + 1.45), cy + tubeR + 0.1, 0]);
  }
  add(frame, box(tubeR * 2 + 5.8, 0.4, 1.2), steel(), [0, -1.3, 0]);
  g.add(batch(frame));
  const doorMat = mat('#dfe4ec', { side: THREE.DoubleSide });
  const doors = [-1, 1].map((side) => {
    const d = new THREE.Group();
    d.userData.live = true;
    add(d, new THREE.CircleGeometry(tubeR + 0.05, 32, side < 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI), doorMat, [0, cy, 0]);
    add(d, box(0.14, (tubeR + 0.05) * 2, 0.14), mat(LUNA.teal), [side * 0.05, cy, 0.04]);
    add(d, box(tubeR * 0.9, 0.22, 0.06), mat(LUNA.orange), [side * tubeR * 0.5, cy, 0.05]);
    g.add(d);
    return d;
  });
  const red = mat('#ff5f5f', { emissive: '#ff3030', ei: 1.2, key: 'airlock' }), green = mat('#7ee08a', { emissive: '#3fe06a', ei: 1.2, key: 'airlock' });
  const light = add(g, sphere(0.26, 12, 8), red, [0, cy + tubeR + 0.85, 0.1]);
  light.userData.live = true;
  let open = 0, target = 0;
  g.userData.setOpen = (on, instant = false) => {
    target = on ? 1 : 0;
    if (instant) open = target;
  };
  g.userData.update = (dt) => {
    open += Math.sign(target - open) * Math.min(Math.abs(target - open), dt * 0.9);
    doors[0].position.x = -open * (tubeR + 0.35);
    doors[1].position.x = open * (tubeR + 0.35);
    light.material = open > 0.5 ? green : red;
  };
  return g;
}
