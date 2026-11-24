/**
 * Sandstone architecture for the Desert of the Pyramids (original designs,
 * a soft toy look: warm sandstone, turquoise and lapis paint, gold tips).
 *
 *   Math     the Pyramid School: a sloping-walled mastaba hall with a
 *            smooth little pyramid on its roof, a big gold capstone, a
 *            round number medallion over the door and an abacus by it
 *   History  the Temple School: two pylon towers with painted friezes and
 *            pennants on tall poles, a gateway under a winged sun, a hall
 *            of painted lotus columns behind
 *   Physics  the Sun Observatory: a round drum with a sundial terrace on
 *            the roof, an obelisk for its pointer and a turning gold
 *            armillary sphere
 *
 * The smaller places stand under striped market awnings. Each oasis has a
 * landmark in its plaza: a sphinx fountain, a caravan well, a felucca
 * harbour, a sun obelisk, a hot-air balloon, a scroll library and a
 * star-gazing camp. `sphinx()` and `obelisk()` are shared with the scenery
 * (the avenue of sphinxes and the Great Sphinx are the same toy, scaled).
 *
 * Same contract as buildings.js shapes: origin at the plinth's centre at
 * walking level, the door faces +Z, the function returns the top's height.
 */
import * as THREE from 'three';
import { add, batch, box, cone, cyl, ico, mat, seeded, signTexture, sphere, toonRamp } from '../kit.js';
import { windowMat, lampMat } from '../buildings.js';

const PLINTH_R = 4.6, PLINTH_H = 0.55;
const TAU = Math.PI * 2;

/** The desert's colours. */
export const SAND = {
  light: '#f3dcae', stone: '#e6c08a', mid: '#d9a96e', dark: '#b8834f',
  turquoise: '#36bfc4', lapis: '#3460c0', gold: '#f2c14e', red: '#d9603b', green: '#5fb85a', cream: '#fff4e0', ink: '#3a2a24'
};

/* ---------------------------------------------------------------- painted textures */

const textures = new Map();
/** A painted texture, made once: flagstones, wall courses, stripes, a painted frieze, sand ripples, a mosaic. */
export function painted(kind, a = SAND.stone, b = SAND.cream) {
  const key = `${kind}|${a}|${b}`;
  if (textures.has(key)) return textures.get(key);
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const col = new THREE.Color(a);
  const shade = (k, base = col) => `#${base.clone().multiplyScalar(k).getHexString()}`;
  const r = seeded(kind.length * 131 + a.charCodeAt(2) + b.charCodeAt(3));
  g.fillStyle = shade(1);
  g.fillRect(0, 0, N, N);
  if (kind === 'flag') {
    // Big flagstones in staggered rows, each its own shade, soft seams.
    const rows = [0, 46, 88, 136, 178, 222, 256];
    for (let i = 0; i < rows.length - 1; i++) {
      let x = -r() * 60;
      while (x < N) {
        const w = 48 + r() * 46;
        g.fillStyle = shade(0.93 + r() * 0.12);
        g.fillRect(x + 2, rows[i] + 2, w - 4, rows[i + 1] - rows[i] - 4);
        for (let k = 0; k < 6; k++) {
          g.fillStyle = shade(0.86 + r() * 0.08);
          g.fillRect(x + 4 + r() * (w - 10), rows[i] + 4 + r() * (rows[i + 1] - rows[i] - 10), 2 + r() * 3, 2);
        }
        x += w;
      }
    }
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = shade(0.72);
    g.fillRect(0, 0, N, N);
  } else if (kind === 'blocks') {
    // Courses of cut blocks with mortar lines.
    for (let row = 0; row < 8; row++) {
      let x = row % 2 ? -32 : 0;
      while (x < N) {
        const w = 56 + Math.round(r() * 20);
        g.fillStyle = shade(0.9 + r() * 0.14);
        g.fillRect(x + 1.5, row * 32 + 1.5, w - 3, 29);
        g.fillStyle = shade(1.06);
        g.fillRect(x + 1.5, row * 32 + 1.5, w - 3, 3);
        x += w;
      }
    }
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = shade(0.68);
    g.fillRect(0, 0, N, N);
  } else if (kind === 'stripes') {
    // Awning cloth: wide bands of two colours with a stitched line.
    const cb = new THREE.Color(b);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? shade(1, cb) : shade(1);
      g.fillRect(i * 32, 0, 32, N);
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.fillRect(i * 32 + 29, 0, 3, N);
    }
  } else if (kind === 'nemes') {
    // A sphinx's headcloth: even bands round the head.
    const cb = new THREE.Color(b);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? shade(1, cb) : shade(1);
      g.fillRect(0, i * 16, N, 16);
    }
  } else if (kind === 'frieze') {
    // A painted band: gold borders, little original signs (sun, water, lotus, bird, star) in a row.
    const cb = new THREE.Color(b);
    g.fillStyle = shade(1, cb);
    g.fillRect(0, 0, N, 26);
    g.fillRect(0, N - 26, N, 26);
    g.fillStyle = '#f7e6c2';
    g.fillRect(0, 26, N, 6);
    g.fillRect(0, N - 32, N, 6);
    const ink = '#fff4e0', red = SAND.red, gold = SAND.gold;
    const cell = N / 4;
    for (let i = 0; i < 4; i++) {
      const x = i * cell + cell / 2, y = N / 2;
      g.fillStyle = [gold, ink, red, ink][i];
      g.strokeStyle = g.fillStyle;
      g.lineWidth = 7;
      if (i === 0) {
        g.beginPath();
        g.arc(x, y, 22, 0, TAU);
        g.fill();
        g.fillStyle = shade(1);
        g.beginPath();
        g.arc(x, y, 8, 0, TAU);
        g.fill();
      } else if (i === 1) {
        for (let k = -1; k <= 1; k++) {
          g.beginPath();
          for (let s = -26; s <= 26; s += 2) g.lineTo(x + s, y + k * 18 + Math.sin(s * 0.35) * 6);
          g.stroke();
        }
      } else if (i === 2) {
        for (const ang of [-0.5, 0, 0.5]) {
          g.save();
          g.translate(x, y + 26);
          g.rotate(ang);
          g.beginPath();
          g.ellipse(0, -28, 9, 26, 0, 0, TAU);
          g.fill();
          g.restore();
        }
      } else {
        g.beginPath();
        g.ellipse(x, y + 4, 20, 13, 0, 0, TAU);
        g.fill();
        g.beginPath();
        g.arc(x + 16, y - 14, 9, 0, TAU);
        g.fill();
        g.beginPath();
        g.moveTo(x + 23, y - 15);
        g.lineTo(x + 40, y - 6);
        g.lineTo(x + 24, y - 9);
        g.fill();
      }
    }
  } else if (kind === 'ripples') {
    // Wind ripples in the sand: soft wavy bands, light on the crest, a thin shadow behind.
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, N, N);
    for (let i = 0; i < 16; i++) {
      const y0 = i * 16;
      g.beginPath();
      for (let x = 0; x <= N; x += 4) g.lineTo(x, y0 + Math.sin((x / N) * TAU * 2 + i * 0.7) * 3 + Math.sin((x / N) * TAU * 5) * 1.2);
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(160,110,60,0.16)';
      g.stroke();
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.translate(0, -3);
      g.stroke();
      g.translate(0, 3);
    }
  } else if (kind === 'mosaic') {
    // The plaza's sun mosaic: rays of two colours round a gold disc, a ring of tiles.
    const cb = new THREE.Color(b);
    const m = N / 2;
    g.fillStyle = shade(1.05);
    g.fillRect(0, 0, N, N);
    for (let i = 0; i < 24; i++) {
      g.fillStyle = i % 2 ? shade(1, cb) : shade(0.98);
      g.beginPath();
      g.moveTo(m, m);
      g.arc(m, m, 118, (i / 24) * TAU, ((i + 1) / 24) * TAU);
      g.fill();
    }
    g.lineWidth = 10;
    g.strokeStyle = SAND.lapis;
    g.beginPath();
    g.arc(m, m, 112, 0, TAU);
    g.stroke();
    g.fillStyle = SAND.gold;
    g.beginPath();
    g.arc(m, m, 44, 0, TAU);
    g.fill();
    g.fillStyle = '#ffe08a';
    g.beginPath();
    g.arc(m - 8, m - 8, 20, 0, TAU);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  textures.set(key, tex);
  return tex;
}
const mats = new Map();
/** A textured cartoon material (UVs carry the tiling). */
export function tmat(kind, a, b, { side = THREE.FrontSide } = {}) {
  const key = `${kind}|${a}|${b}|${side}`;
  if (!mats.has(key)) mats.set(key, new THREE.MeshToonMaterial({ map: painted(kind, a, b), gradientMap: toonRamp(), side }));
  return mats.get(key);
}
/** Scale a geometry's UVs (the texture then tiles su × sv times). */
export function tile(geo, su, sv = su) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}
export const blocks = () => tmat('blocks', SAND.stone);
export const blocksDark = () => tmat('blocks', SAND.mid);
const gold = () => mat(SAND.gold, { rough: 0.3, metal: 0.7 });
const brass = () => mat('#c9963f', { rough: 0.35, metal: 0.6 });
const wood = () => mat('#8a5e3c', { rough: 0.85 });

/* ---------------------------------------------------------------- shapes */

/** A box whose top is smaller than its bottom (sloping walls), origin at the bottom's middle. */
export function frustum(w0, d0, w1, d1, h) {
  const g = new THREE.BoxGeometry(1, 1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const top = p.getY(i) > 0;
    p.setXYZ(i, p.getX(i) * (top ? w1 : w0), (p.getY(i) + 0.5) * h, p.getZ(i) * (top ? d1 : d0));
  }
  g.computeVertexNormals();
  return g;
}
/** A four-sided pyramid with its base on y = 0. */
export const pyramidGeo = (w, h) => {
  const g = new THREE.ConeGeometry(w / Math.SQRT2, h, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(0, h / 2, 0);
  return g;
};

/** A brass lantern on a post (glows at night). */
export function lantern(parent, [x, y, z], h = 1.8) {
  add(parent, cyl(0.06, 0.08, h, 6), mat('#5a4030'), [x, y + h / 2, z]);
  add(parent, cyl(0.2, 0.16, 0.08, 8), brass(), [x, y + h, z]);
  add(parent, cyl(0.15, 0.15, 0.36, 8), lampMat, [x, y + h + 0.22, z]);
  add(parent, cone(0.22, 0.26, 8), brass(), [x, y + h + 0.52, z]);
}

/** An obelisk: a tapering shaft on a pedestal with a gold tip. */
export function obelisk(parent, [x, y, z], h, { yaw = 0, color = SAND.light, band = true } = {}) {
  const w0 = h * 0.11, w1 = h * 0.075;
  add(parent, box(w0 * 2.2, h * 0.08, w0 * 2.2), blocksDark(), [x, y + h * 0.04, z], [0, yaw, 0]);
  add(parent, frustum(w0, w0, w1, w1, h * 0.86), mat(color, { rough: 0.9 }), [x, y + h * 0.08, z], [0, yaw, 0]);
  if (band) {
    // A turquoise stripe down the front face (leaning back with it).
    const off = (w0 + w1) / 4 + 0.012, lean = Math.atan2((w0 - w1) / 2, h * 0.86);
    const q = new THREE.Group();
    q.position.set(x + Math.sin(yaw) * off, y + h * 0.08 + h * 0.43, z + Math.cos(yaw) * off);
    q.rotation.set(0, yaw, 0);
    add(q, box(w0 * 0.34, h * 0.6, 0.02), mat(SAND.turquoise), [0, 0, 0], [-lean, 0, 0]);
    parent.add(q);
  }
  add(parent, pyramidGeo(w1 * 1.02, h * 0.1), gold(), [x, y + h * 0.94 - 0.001, z], [0, yaw, 0]);
}

/**
 * A sphinx, toy-sized (about 2.2 m long and 1.4 m tall at scale 1): a chubby lion lying
 * down, paws forward, a striped headcloth, a friendly face. Looks along +Z.
 */
export function sphinx(parent, [x, y, z], s = 1, { yaw = 0, body = '#e8bf86', cloth = [SAND.lapis, SAND.gold], face = true, base = true } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  g.scale.setScalar(s);
  const skin = mat(body, { rough: 0.9 });
  const skinDark = mat(new THREE.Color(body).multiplyScalar(0.86).getStyle(), { rough: 0.9 });
  const head = tmat('nemes', cloth[0], cloth[1]);
  if (base) add(g, box(1.3, 0.22, 2.5), blocksDark(), [0, 0.11, -0.1]);
  const by = base ? 0.22 : 0;
  // Body, haunches and chest.
  add(g, sphere(1, 20, 14), skin, [0, by + 0.42, -0.35], [0, 0, 0], [0.44, 0.38, 0.8]);
  for (const sx of [-1, 1]) add(g, sphere(1, 14, 10), skin, [sx * 0.27, by + 0.34, -0.72], [0, 0, 0], [0.24, 0.3, 0.34]);
  add(g, sphere(1, 16, 12), skin, [0, by + 0.55, 0.15], [0, 0, 0], [0.4, 0.45, 0.4]);
  // Front legs stretched forward, round paws.
  for (const sx of [-1, 1]) {
    add(g, new THREE.CapsuleGeometry(0.13, 0.62, 4, 10), skin, [sx * 0.22, by + 0.14, 0.5], [Math.PI / 2, 0, 0]);
    add(g, sphere(1, 12, 8), skinDark, [sx * 0.22, by + 0.12, 0.92], [0, 0, 0], [0.16, 0.12, 0.17]);
  }
  // The tail curled along the right side.
  const tail = new THREE.CatmullRomCurve3([[0.36, 0.1, -1.0], [0.48, 0.07, -0.6], [0.47, 0.07, -0.2], [0.36, 0.12, 0.0]].map((p) => new THREE.Vector3(p[0], by + p[1], p[2])));
  add(g, new THREE.TubeGeometry(tail, 12, 0.055, 6), skin);
  add(g, sphere(0.09, 8, 6), mat(SAND.dark), [0.36, by + 0.14, 0.02]);
  // Head under its headcloth: the cloth puffs out behind, two striped flaps fall in front of the shoulders.
  const hy = by + 1.0, hz = 0.32;
  add(g, sphere(1, 18, 14), head, [0, hy + 0.06, hz - 0.08], [0, 0, 0], [0.37, 0.34, 0.34]);
  add(g, frustum(0.62, 0.2, 0.44, 0.3, 0.5), head, [0, hy - 0.5, hz - 0.12]);
  for (const sx of [-1, 1]) add(g, box(0.17, 0.5, 0.08), head, [sx * 0.27, hy - 0.3, hz + 0.08], [0.1, 0, sx * 0.08]);
  add(g, sphere(1, 18, 14), skin, [0, hy - 0.02, hz + 0.06], [0, 0, 0], [0.27, 0.29, 0.25]);
  add(g, box(0.62, 0.08, 0.3), mat(cloth[1], { rough: 0.6 }), [0, hy + 0.2, hz + 0.02], [0.25, 0, 0]);
  add(g, cone(0.04, 0.12, 6), gold(), [0, hy + 0.3, hz + 0.2], [0.3, 0, 0]);
  if (face) {
    const ink = mat(SAND.ink, { rough: 0.4 });
    for (const sx of [-1, 1]) {
      add(g, sphere(1, 10, 8), ink, [sx * 0.1, hy + 0.0, hz + 0.29], [0, 0, 0], [0.045, 0.055, 0.03]);
      add(g, sphere(0.016, 6, 4), mat('#ffffff'), [sx * 0.1 + 0.015, hy + 0.025, hz + 0.315]);
      add(g, sphere(1, 8, 6), mat('#ffab9a', { rough: 0.9 }), [sx * 0.17, hy - 0.08, hz + 0.25], [0, 0, 0], [0.05, 0.03, 0.02]);
      add(g, box(0.09, 0.018, 0.02), ink, [sx * 0.11, hy + 0.08, hz + 0.29], [0, 0, sx * -0.15]);
    }
    add(g, new THREE.TorusGeometry(0.05, 0.012, 4, 10, Math.PI), ink, [0, hy - 0.1, hz + 0.29], [0, 0, Math.PI]);
    add(g, cyl(0.035, 0.05, 0.18, 8), tmat('nemes', cloth[1], cloth[0]), [0, hy - 0.3, hz + 0.24], [0.2, 0, 0]);
  }
  parent.add(g);
  return g;
}

/* ---------------------------------------------------------------- the base */

/** A round sandstone plinth: block courses, a turquoise tile ring, steps to the plaza side, brass lanterns, potted palms. */
export function stonePlinth(P, look) {
  const g = new THREE.Group();
  const R = PLINTH_R;
  add(g, tile(new THREE.CylinderGeometry(R, R + 0.1, PLINTH_H + 0.5, 40, 1, true), 9, 0.6), blocks(), [0, (PLINTH_H - 0.5) / 2, 0]);
  add(g, cyl(R + 0.14, R + 0.14, 0.12, 40), mat(SAND.mid), [0, PLINTH_H - 0.04, 0]);
  add(g, cyl(R, R, 0.04, 40), mat(SAND.turquoise), [0, PLINTH_H + 0.03, 0]);
  add(g, cyl(R - 0.35, R - 0.35, 0.06, 40), mat(SAND.light, { rough: 0.95 }), [0, PLINTH_H + 0.05, 0]);
  for (let s = 0; s < 3; s++) add(g, box(2.4 - s * 0.1, 0.18, 0.45), mat(SAND.stone), [0, PLINTH_H - 0.09 - s * 0.18, R + 0.12 + s * 0.4]);
  for (const sx of [-1.6, 1.6]) lantern(g, [sx, PLINTH_H, R - 0.35], 1.5);
  const pot = mat(SAND.red), leaf = mat(look.leaf);
  for (const [x, z] of [[-3.3, 2.7], [3.3, 2.7]]) {
    add(g, cyl(0.3, 0.22, 0.5, 10), pot, [x, PLINTH_H + 0.25, z]);
    add(g, cyl(0.31, 0.31, 0.06, 10), mat(SAND.turquoise), [x, PLINTH_H + 0.42, z]);
    for (let i = 0; i < 7; i++) add(g, cone(0.09, 1.0, 4), leaf, [x + Math.cos(i * 0.9) * 0.25, PLINTH_H + 0.9, z + Math.sin(i * 0.9) * 0.25], [Math.cos(i * 0.9) * 0.75, 0, -Math.sin(i * 0.9) * 0.75]);
  }
  return g;
}

/** A doorway set into a wall facing +Z: turquoise frame, a gold lintel, a wooden door. */
function doorway(g, [x, y, z], w = 1.1, h = 1.9, look = null) {
  add(g, box(w + 0.4, h + 0.3, 0.16), mat(SAND.turquoise), [x, y + (h + 0.3) / 2, z]);
  add(g, box(w, h, 0.12), mat('#6b4a32'), [x, y + h / 2, z + 0.04]);
  for (let i = 0; i < 3; i++) add(g, box(0.06, h - 0.2, 0.04), mat('#8a6040'), [x - w / 3 + (i * w) / 3, y + h / 2, z + 0.11]);
  add(g, box(w + 0.7, 0.24, 0.32), gold(), [x, y + h + 0.36, z + 0.04]);
  add(g, sphere(0.05, 6, 4), gold(), [x + w * 0.3, y + h * 0.5, z + 0.14]);
  add(g, box(w + 0.8, 0.12, 0.5), mat(SAND.mid), [x, y + 0.01, z + 0.3]);
  if (look) add(g, box(w + 0.8, 0.06, 0.5), mat(look.banner), [x, y + 0.06, z + 0.3]);
}
/** A small square window with a turquoise frame, facing +Z (rotate with ry). */
function smallWindow(g, [x, y, z], ry = 0, w = 0.55, h = 0.6) {
  const q = new THREE.Group();
  q.position.set(x, y, z);
  q.rotation.y = ry;
  add(q, box(w + 0.16, h + 0.16, 0.08), mat(SAND.turquoise), [0, 0, 0]);
  add(q, box(w, h, 0.06), windowMat, [0, 0, 0.03]);
  add(q, box(w + 0.24, 0.07, 0.14), mat(SAND.cream), [0, -h / 2 - 0.08, 0.05]);
  g.add(q);
}
/** Number plates: a round medallion with digits (a canvas sign). */
function medallion(g, text, [x, y, z], r, color, tilt = 0) {
  const q = new THREE.Group();
  q.position.set(x, y, z);
  q.rotation.x = -tilt;
  add(q, new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.12, 28), gold(), [0, 0, 0], [Math.PI / 2, 0, 0]);
  const tex = signTexture(text, { w: 256, h: 256, bg: color, fg: '#fff8e8', border: color, font: '900 96px "Nunito Variable", system-ui, sans-serif' });
  add(q, new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ map: tex }), [0, 0, 0.065]);
  g.add(q);
}

/* ---------------------------------------------------------------- math: the pyramid school */

export function pyramidSchool(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.04, z0 = -0.5;
  const W = 6.2, D = 5.0, H = 2.7;
  // The hall: sloping walls of sandstone blocks, a painted band near the top.
  add(g, tile(frustum(W, D, W - 0.7, D - 0.7, H), 3, 1.5), blocks(), [0, y0, z0]);
  add(g, frustum(W - 0.62, D - 0.62, W - 0.5, D - 0.5, 0.26), mat(look.roof.math), [0, y0 + H - 0.42, z0]);
  add(g, box(W - 0.4, 0.22, D - 0.4), mat(SAND.light), [0, y0 + H + 0.06, z0]);
  // A smooth pyramid on the roof with a big gold capstone, its front painted.
  const PW = 4.4, PH = 3.4;
  add(g, pyramidGeo(PW, PH * 0.78), mat(SAND.light, { rough: 0.9 }), [0, y0 + H + 0.17, z0]);
  add(g, pyramidGeo(PW * 0.22 + 0.02, PH * 0.22 + 0.02), gold(), [0, y0 + H + 0.17 + PH * 0.78 - 0.02, z0]);
  // Little stepped corner turrets on the roof.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const px = sx * (W / 2 - 0.65), pz = z0 + sz * (D / 2 - 0.65);
    add(g, box(0.7, 0.4, 0.7), mat(SAND.stone), [px, y0 + H + 0.37, pz]);
    add(g, box(0.45, 0.3, 0.45), mat(look.roof.math), [px, y0 + H + 0.72, pz]);
    add(g, pyramidGeo(0.45, 0.35), gold(), [px, y0 + H + 0.86, pz]);
  }
  // The door, a number medallion above it, windows either side.
  const fz = z0 + D / 2 - 0.15;
  doorway(g, [0, y0, fz + 0.05], 1.1, 1.75, look);
  // On the pyramid's sloping front: (base y0 + H + 0.17, half-width 2.2, rise PH * 0.78).
  const rise = PH * 0.78, slope = Math.atan2(PW / 2, rise), hc = 1.0;
  medallion(g, '123', [0, y0 + H + 0.17 + hc + Math.sin(slope) * 0.07, z0 + (PW / 2) * (1 - hc / rise) + Math.cos(slope) * 0.07], 0.6, look.roof.math, slope);
  for (const sx of [-1, 1]) smallWindow(g, [sx * 2.0, y0 + 1.35, fz + 0.03], 0, 0.6, 0.7);
  for (const sx of [-1, 1]) for (const zz of [-0.9, 0.9]) smallWindow(g, [sx * (W / 2 - 0.12), y0 + 1.35, z0 + zz], sx * Math.PI / 2, 0.5, 0.6);
  // An abacus by the door: a frame with rows of bright beads.
  const ax = 3.0, az = fz + 0.7;
  for (const sx of [-0.6, 0.6]) add(g, box(0.1, 1.3, 0.1), wood(), [ax + sx, y0 + 0.65, az]);
  for (let row = 0; row < 4; row++) {
    const yy = y0 + 0.35 + row * 0.28;
    add(g, cyl(0.025, 0.025, 1.2, 4), brass(), [ax, yy, az], [0, 0, Math.PI / 2]);
    for (let b = 0; b < 4; b++) add(g, sphere(0.085, 8, 6), mat(['#ff6b6b', '#ffd23f', '#4fc3f7', '#7ee08a'][row]), [ax - 0.4 + b * 0.16 + (row % 2) * 0.25, yy, az], [0, 0, 0], [1, 0.8, 1]);
  }
  add(g, box(1.4, 0.1, 0.16), wood(), [ax, y0 + 1.3, az]);
  return y0 + H + PH + 0.3;
}

/* ---------------------------------------------------------------- history: the temple school */

export function templeSchool(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.04;
  const fz = 1.3;
  // The hall behind: a block with a flat roof, painted lotus columns along its front.
  add(g, tile(box(5.6, 3.0, 3.6), 3, 1.5), blocks(), [0, y0 + 1.5, -1.2]);
  add(g, box(6.0, 0.3, 4.0), mat(SAND.light), [0, y0 + 3.15, -1.2]);
  add(g, box(6.1, 0.14, 4.1), mat(look.roof.history), [0, y0 + 3.36, -1.2]);
  for (const sx of [-2.4, -1.2, 1.2, 2.4]) {
    add(g, cyl(0.26, 0.3, 2.7, 12), mat(SAND.cream), [sx, y0 + 1.35, 0.85]);
    for (const [hh, c] of [[0.5, SAND.red], [0.8, SAND.turquoise], [2.2, SAND.lapis]]) add(g, cyl(0.31, 0.31, 0.14, 12), mat(c), [sx, y0 + hh, 0.85]);
    add(g, cyl(0.42, 0.26, 0.42, 12), mat(SAND.green), [sx, y0 + 2.85, 0.85]);
    add(g, box(0.7, 0.14, 0.7), mat(SAND.light), [sx, y0 + 3.1, 0.85]);
  }
  add(g, box(6.0, 0.3, 0.8), mat(SAND.light), [0, y0 + 3.15, 0.8]);
  // The pylon: two sloping towers either side of a tall gateway.
  for (const sx of [-1, 1]) {
    const px = sx * 1.9;
    add(g, tile(frustum(2.3, 1.5, 1.85, 1.15, 5.0), 1.5, 2.5), blocks(), [px, y0, fz]);
    add(g, box(2.05, 0.32, 1.35), mat(SAND.light), [px, y0 + 5.12, fz]);
    add(g, box(2.15, 0.12, 1.45), mat(look.roof.history), [px, y0 + 5.34, fz]);
    // The painted frieze on its face, the recess and pole for a pennant.
    add(g, new THREE.PlaneGeometry(1.86, 0.9), tmat('frieze', SAND.turquoise, SAND.lapis), [px, y0 + 3.7, fz + 0.64], [-0.045, 0, 0]);
    add(g, box(0.1, 6.6, 0.1), wood(), [px + sx * 0.5, y0 + 3.3, fz + 0.86]);
    add(g, sphere(0.1, 8, 6), gold(), [px + sx * 0.5, y0 + 6.65, fz + 0.86]);
  }
  const flag = new THREE.Group();
  flag.userData.live = true;
  flag.position.set(0, y0 + 6.1, fz + 0.86);
  for (const sx of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(sx * 1.0, -0.2);
    shape.lineTo(0, -0.45);
    add(flag, new THREE.ShapeGeometry(shape), mat(look.banner, { side: THREE.DoubleSide }), [sx * 2.4, 0, 0]);
  }
  g.add(flag);
  g.userData.flag = flag;
  // The gateway between the towers: a lintel with a winged sun.
  add(g, box(1.6, 3.9, 1.0), mat(SAND.mid), [0, y0 + 1.95, fz - 0.15]);
  doorway(g, [0, y0, fz + 0.38], 1.1, 2.1, look);
  add(g, box(2.0, 0.8, 1.2), mat(SAND.light), [0, y0 + 3.6, fz + 0.05]);
  add(g, cyl(0.3, 0.3, 0.12, 20), gold(), [0, y0 + 3.62, fz + 0.68], [Math.PI / 2, 0, 0]);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) add(g, box(0.62 - i * 0.12, 0.09, 0.05), mat(i % 2 ? SAND.lapis : SAND.turquoise), [sx * (0.62 - i * 0.06), y0 + 3.72 - i * 0.11, fz + 0.68]);
  }
  // Two little sphinxes guard the steps.
  for (const sx of [-1, 1]) sphinx(g, [sx * 2.3, PLINTH_H + 0.04, 3.0], 0.42, { yaw: 0 });
  return y0 + 7.0;
}

/* ---------------------------------------------------------------- physics: the sun observatory */

export function sunObservatory(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.04, z0 = -0.4, R = 2.9, H = 2.8;
  add(g, tile(new THREE.CylinderGeometry(R - 0.12, R, H, 36, 1, true), 6, 1.4), blocks(), [0, y0 + H / 2, z0]);
  add(g, cyl(R - 0.2, R - 0.2, H, 36), mat(SAND.cream), [0, y0 + H / 2, z0]);
  add(g, cyl(R + 0.15, R + 0.15, 0.3, 36), mat(look.roof.physics), [0, y0 + H + 0.1, z0]);
  // The sundial terrace: a pale disc with hour marks, a parapet, the obelisk pointer in the middle.
  add(g, cyl(R, R, 0.12, 36), mat(SAND.light), [0, y0 + H + 0.3, z0]);
  add(g, new THREE.TorusGeometry(R - 0.5, 0.05, 4, 40), gold(), [0, y0 + H + 0.37, z0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    add(g, box(0.1, 0.05, 0.42), mat(i % 3 ? SAND.lapis : SAND.red), [Math.sin(a) * (R - 0.85), y0 + H + 0.38, z0 + Math.cos(a) * (R - 0.85)], [0, a, 0]);
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    add(g, box(0.42, 0.36, 0.18), mat(i % 2 ? SAND.stone : SAND.light), [Math.sin(a) * (R - 0.05), y0 + H + 0.52, z0 + Math.cos(a) * (R - 0.05)], [0, a, 0]);
  }
  obelisk(g, [0, y0 + H + 0.36, z0], 4.6, { band: true });
  // Door and windows.
  doorway(g, [0, y0, z0 + R - 0.02], 1.05, 1.8, look);
  for (const a of [-0.9, 0.9, 2.2, -2.2]) smallWindow(g, [Math.sin(a) * (R - 0.06), y0 + 1.5, z0 + Math.cos(a) * (R - 0.06)], a, 0.5, 0.7);
  // A brass telescope on the terrace's front edge.
  add(g, cyl(0.12, 0.17, 1.3, 10), brass(), [1.3, y0 + H + 1.05, z0 + 1.6], [-0.75, 0, -0.3]);
  add(g, cyl(0.04, 0.04, 0.6, 5), mat('#4c5560'), [1.3, y0 + H + 0.65, z0 + 1.45]);
  // The armillary sphere on a pedestal beside the door: gold rings that turn (buildings.js turns `orrery` arms).
  const px = -3.0, pz = 1.8;
  add(g, cyl(0.28, 0.36, 1.1, 10), mat(SAND.stone), [px, y0 + 0.55, pz]);
  add(g, cyl(0.42, 0.42, 0.1, 12), mat(look.roof.physics), [px, y0 + 1.12, pz]);
  const orrery = new THREE.Group();
  orrery.position.set(px, y0 + 1.75, pz);
  orrery.userData.live = true;
  add(orrery, sphere(0.16, 12, 8), mat(SAND.turquoise, { rough: 0.4 }));
  for (const [tilt, speed, r] of [[0, 0.6, 0.55], [1.1, -0.9, 0.5], [0.45, 1.3, 0.45]]) {
    const arm = new THREE.Group();
    arm.userData.speed = speed;
    add(arm, new THREE.TorusGeometry(r, 0.03, 6, 32), gold(), [0, 0, 0], [Math.PI / 2 + tilt, 0, 0]);
    orrery.add(arm);
  }
  g.add(orrery);
  g.userData.orrery = orrery;
  return y0 + H + 5.4;
}

/* ---------------------------------------------------------------- the smaller places */

/** A striped market awning over a small place: four poles, a peaked striped canopy, a scalloped edge. */
export function stripedAwning(look, r, seed = 1) {
  const g = new THREE.Group();
  const R = r + 0.45, H = 3.6;
  const rnd = seeded(seed);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + TAU / 8;
    add(g, cyl(0.08, 0.1, H, 6), wood(), [Math.sin(a) * R, H / 2, Math.cos(a) * R]);
    add(g, sphere(0.12, 8, 6), brass(), [Math.sin(a) * R, H + 0.05, Math.cos(a) * R]);
  }
  const cloth = tmat('stripes', look.banner, SAND.cream, { side: THREE.DoubleSide });
  const top = tile(new THREE.ConeGeometry((R + 0.9) * Math.SQRT2, 1.6 + r * 0.12, 4, 1, true), 2, 1);
  top.rotateY(Math.PI / 4);
  add(g, top, cloth, [0, H + (1.6 + r * 0.12) / 2, 0]);
  // The valance: a band of cloth all round with little scallops.
  const S = (R + 0.9) * 2;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const q = new THREE.Group();
    q.rotation.y = a;
    add(q, tile(new THREE.PlaneGeometry(S, 0.42), 2, 0.25), cloth, [0, H - 0.18, S / 2]);
    for (let k = 0; k < 7; k++) add(q, new THREE.CircleGeometry(0.22, 8, Math.PI, Math.PI), mat(k % 2 ? look.banner : SAND.cream, { side: THREE.DoubleSide }), [-S / 2 + (k + 0.5) * (S / 7), H - 0.39, S / 2 + 0.005]);
    g.add(q);
  }
  add(g, sphere(0.2, 10, 8), gold(), [0, H + 1.7 + r * 0.12, 0]);
  for (const sx of [-1, 1]) add(g, cyl(0.12, 0.12, 0.28, 8), lampMat, [sx * R * 0.6, H - 0.5, R * 0.75 + rnd() * 0.05]);
  return batch(g);
}

/* ---------------------------------------------------------------- the landmarks */

function stonePad(g, r) {
  add(g, tile(new THREE.CylinderGeometry(r, r + 0.2, 0.36, 32, 1, true), 6, 0.3), blocks(), [0, 0.18, 0]);
  add(g, cyl(r, r, 0.05, 32), mat(SAND.light), [0, 0.36, 0]);
  add(g, new THREE.TorusGeometry(r - 0.25, 0.06, 4, 40), mat(SAND.turquoise), [0, 0.39, 0], [Math.PI / 2, 0, 0]);
}
/** A round basin of water (a stone rim, a turquoise surface). */
function basin(g, r, y = 0.36, h = 0.7) {
  add(g, tile(new THREE.CylinderGeometry(r, r + 0.1, h, 32, 1, true), 6, 0.4), blocksDark(), [0, y + h / 2, 0]);
  add(g, new THREE.TorusGeometry(r, 0.16, 6, 40), mat(SAND.light), [0, y + h, 0], [Math.PI / 2, 0, 0]);
  add(g, cyl(r - 0.05, r - 0.05, 0.05, 32), mat('#46c9cf', { rough: 0.2 }), [0, y + h - 0.12, 0]);
}

export const DESERT_LANDMARKS = {
  /** Sphinx Gate: a little sphinx in a pool, spouting water; tap it for a big splash. */
  sphinxfountain() {
    const g = new THREE.Group();
    stonePad(g, 4.0);
    basin(g, 3.2);
    add(g, box(1.4, 0.8, 2.6), blocks(), [0, 0.8, -0.2]);
    sphinx(g, [0, 1.2, -0.4], 1.15, { base: false });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      add(g, sphere(0.16, 8, 6), mat(i % 2 ? SAND.lapis : SAND.gold), [Math.sin(a) * 3.2, 1.12, Math.cos(a) * 3.2]);
    }
    batch(g);
    const jet = new THREE.Group();
    jet.position.set(0, 2.15, 0.75);
    jet.userData.live = true;
    const water = mat('#bff4ff', { opacity: 0.8 });
    const drops = Array.from({ length: 8 }, (_, i) => add(jet, sphere(0.12 + (i % 3) * 0.03, 8, 6), water));
    g.add(jet);
    let t = 9, clock = 0;
    g.userData = { top: 4.2, poke: () => (t = 0), update(dt) { t += dt; clock += dt; const k = t < 1.6 ? 1.7 : 1; drops.forEach((m, i) => { const ph = (clock * 1.2 + i / 8) % 1; m.position.set(0, ph * 1.2 * k - ph * ph * 1.9 * k, ph * 1.6 * k); m.scale.setScalar(1 - ph * 0.5); }); } };
    return g;
  },
  /** Caravan Well: a roofed well with a bucket on a rope, saddle bags and a camel statue; tap it and the bucket goes down and up. */
  caravan(look) {
    const g = new THREE.Group();
    stonePad(g, 4.0);
    add(g, tile(new THREE.CylinderGeometry(1.2, 1.3, 1.0, 24, 1, true), 4, 0.5), blocks(), [0, 0.86, 0]);
    add(g, new THREE.TorusGeometry(1.2, 0.14, 6, 28), mat(SAND.light), [0, 1.36, 0], [Math.PI / 2, 0, 0]);
    add(g, cyl(1.12, 1.12, 0.05, 24), mat('#2f6f86'), [0, 1.1, 0]);
    for (const sx of [-1, 1]) add(g, box(0.18, 2.4, 0.18), wood(), [sx * 1.25, 2.3, 0]);
    add(g, cyl(0.08, 0.08, 2.8, 6), wood(), [0, 3.3, 0], [0, 0, Math.PI / 2]);
    const roof = tile(new THREE.ConeGeometry(2.0, 1.1, 4, 1, true), 2, 1);
    roof.rotateY(Math.PI / 4);
    add(g, roof, tmat('stripes', look.banner, SAND.cream, { side: THREE.DoubleSide }), [0, 4.0, 0]);
    // Baskets and saddle bags, and a camel statue resting by the well.
    for (const [x, z, c] of [[-2.6, 1.6, SAND.red], [-2.2, 2.3, SAND.gold], [2.7, -1.6, SAND.turquoise]]) add(g, cyl(0.35, 0.28, 0.55, 10), mat(c), [x, 0.66, z]);
    const camel = new THREE.Group();
    const tan = mat('#d9a066', { rough: 0.9 });
    add(camel, sphere(1, 16, 12), tan, [0, 0.55, 0], [0, 0, 0], [0.5, 0.36, 0.85]);
    add(camel, sphere(1, 12, 10), tan, [0, 0.95, -0.05], [0, 0, 0], [0.32, 0.32, 0.4]);
    add(camel, new THREE.CapsuleGeometry(0.13, 0.7, 4, 8), tan, [0, 1.05, 0.75], [0.5, 0, 0]);
    add(camel, sphere(1, 12, 10), tan, [0, 1.45, 1.05], [0, 0, 0], [0.18, 0.17, 0.28]);
    for (const sx of [-1, 1]) add(camel, sphere(0.035, 6, 4), mat(SAND.ink), [sx * 0.11, 1.52, 1.22]);
    add(camel, box(0.7, 0.08, 0.8), tmat('stripes', SAND.red, SAND.gold), [0, 0.88, -0.05]);
    camel.position.set(2.3, 0.38, 1.5);
    camel.rotation.y = -0.9;
    g.add(camel);
    batch(g);
    const bucket = new THREE.Group();
    bucket.position.set(0, 3.3, 0);
    bucket.userData.live = true;
    const rope = add(bucket, cyl(0.02, 0.02, 1, 4), mat('#e9d8b0'), [0, -0.5, 0]);
    const pail = add(bucket, cyl(0.22, 0.17, 0.32, 10), wood(), [0, -1.0, 0]);
    g.add(bucket);
    let t = 9;
    g.userData = { top: 5.2, poke: () => (t = 0), update(dt) { t += dt; const d = t < 3 ? Math.sin((t / 3) * Math.PI) * 1.6 : 0; const len = 1.0 + d; rope.scale.y = len; rope.position.y = -len / 2; pail.position.y = -len - 0.05; } };
    return g;
  },
  /** Felucca Harbour: a round harbour with a felucca bobbing in it; tap it and the sail swings round. */
  felucca(look) {
    const g = new THREE.Group();
    stonePad(g, 4.1);
    basin(g, 3.5, 0.36, 0.5);
    for (const [x, z] of [[-3.5, 0], [3.5, 0]]) {
      add(g, cyl(0.16, 0.18, 1.6, 8), wood(), [x, 1.2, z]);
      add(g, new THREE.TorusGeometry(0.2, 0.05, 5, 10), mat('#e9d8b0'), [x, 1.5, z], [Math.PI / 2, 0, 0]);
    }
    batch(g);
    const boat = feluccaBoat(look.banner, 0.62);
    boat.position.set(0, 0.84, 0);
    boat.rotation.y = 0.5;
    boat.userData.live = true;
    g.add(boat);
    let t = 9, clock = 0;
    g.userData = { top: 5.6, poke: () => (t = 0), update(dt) { t += dt; clock += dt; boat.position.y = 0.84 + Math.sin(clock * 1.4) * 0.05; boat.rotation.z = Math.sin(clock * 1.1) * 0.05; boat.userData.sail.rotation.y = t < 2.5 ? Math.sin((t / 2.5) * Math.PI) * 1.2 : 0; } };
    return g;
  },
  /** Sun Obelisk: a tall obelisk in a ring of sun rays; tap it and the rays spin and shine. */
  obelisk() {
    const g = new THREE.Group();
    stonePad(g, 4.0);
    add(g, box(2.6, 0.5, 2.6), blocks(), [0, 0.61, 0]);
    obelisk(g, [0, 0.86, 0], 8.4);
    for (const sx of [-1, 1]) lantern(g, [sx * 1.9, 0.38, 2.6], 1.4);
    batch(g);
    const rays = new THREE.Group();
    rays.position.set(0, 0.42, 0);
    rays.userData.live = true;
    for (let i = 0; i < 12; i++) add(rays, box(0.32, 0.04, 1.2), mat(i % 2 ? SAND.gold : SAND.turquoise, { emissive: i % 2 ? '#ffb648' : null, ei: 0.2 }), [Math.sin((i / 12) * TAU) * 2.9, 0, Math.cos((i / 12) * TAU) * 2.9], [0, (i / 12) * TAU, 0]);
    g.add(rays);
    let t = 9;
    g.userData = { top: 10, poke: () => (t = 0), update(dt) { t += dt; rays.rotation.y += dt * (t < 2 ? 3 : 0.15); } };
    return g;
  },
  /** Balloon Field: a striped hot-air balloon tied down by its basket, bobbing; tap it and it hops up. */
  balloon(look) {
    const g = new THREE.Group();
    stonePad(g, 4.0);
    for (const [x, z] of [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]]) add(g, cyl(0.12, 0.16, 0.6, 6), wood(), [x, 0.66, z]);
    batch(g);
    const b = new THREE.Group();
    b.userData.live = true;
    add(b, box(1.3, 0.9, 1.3), tmat('blocks', '#c9945a'), [0, 1.0, 0]);
    add(b, box(1.4, 0.12, 1.4), wood(), [0, 1.5, 0]);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) add(b, cyl(0.02, 0.02, 2.4, 4), mat('#6b4a30'), [x, 2.7, z], [z * 0.25, 0, -x * 0.25]);
    const prof = [];
    for (let i = 0; i <= 16; i++) {
      const v = i / 16;
      const a = v * Math.PI;
      prof.push(new THREE.Vector2(Math.max(0.35, Math.sin(a) * 2.4 * (0.75 + 0.25 * v)), 3.8 + (1 - Math.cos(a)) * 2.2));
    }
    add(b, tile(new THREE.LatheGeometry(prof, 24), 3, 1), tmat('stripes', look.roof.physics, look.banner, { side: THREE.DoubleSide }));
    add(b, cyl(0.5, 0.5, 0.2, 16), mat(SAND.gold), [0, 8.2, 0]);
    g.add(b);
    let t = 9, clock = 0;
    g.userData = { top: 9.5, poke: () => (t = 0), update(dt) { t += dt; clock += dt; b.position.y = Math.sin(clock * 0.9) * 0.15 + (t < 2.4 ? Math.sin((t / 2.4) * Math.PI) * 1.4 : 0); b.rotation.y += dt * 0.08; } };
    return g;
  },
  /** Scroll Library: a giant papyrus scroll on a stand, with shelves of scrolls; tap it and it rolls open. */
  scrolls(look) {
    const g = new THREE.Group();
    stonePad(g, 4.0);
    // Shelves of scrolls behind, under a little roof.
    add(g, box(5.0, 2.6, 1.0), blocks(), [0, 1.66, -2.4]);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) add(g, cyl(0.16, 0.16, 0.8, 8), mat(i % 3 ? '#f2e2b8' : SAND.cream), [-2.0 + i * 0.5, 1.0 + row * 0.7, -1.86], [Math.PI / 2, 0, 0]);
    add(g, box(5.4, 0.25, 1.4), mat(look.roof.history), [0, 3.1, -2.3]);
    add(g, new THREE.PlaneGeometry(5.0, 0.5), tmat('frieze', SAND.turquoise, SAND.lapis), [0, 2.75, -1.89]);
    for (const sx of [-1.2, 1.2]) add(g, box(0.16, 1.4, 0.16), wood(), [sx, 1.06, 0.6]);
    batch(g);
    const scroll = new THREE.Group();
    scroll.position.set(0, 1.8, 0.62);
    scroll.userData.live = true;
    const paper = add(scroll, new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshToonMaterial({ map: scrollTexture(), gradientMap: toonRamp(), side: THREE.DoubleSide }), [0, 0, 0.02]);
    const rolls = [-1, 1].map((s) => add(scroll, cyl(0.12, 0.12, 1.2, 10), mat('#e8d4a6'), [s * 1.12, 0, 0.05]));
    for (const r of rolls) add(r, cyl(0.06, 0.06, 1.5, 6), wood());
    g.add(scroll);
    let t = 9;
    g.userData = { top: 5, poke: () => (t = 0), update(dt) { t += dt; const open = t < 3 ? 1 - Math.sin((t / 3) * Math.PI) * 0.75 : 1; paper.scale.x = open; rolls[0].position.x = -1.12 * open; rolls[1].position.x = 1.12 * open; } };
    return g;
  },
  /** Starry Camp: a striped tent, a glowing campfire and a telescope on a tripod; tap it and the telescope sweeps the sky. */
  startent(look) {
    const g = new THREE.Group();
    stonePad(g, 4.1);
    const cloth = tmat('stripes', look.banner, SAND.cream, { side: THREE.DoubleSide });
    const tent = tile(new THREE.ConeGeometry(2.4, 3.6, 8, 1, true), 4, 1);
    add(g, tent, cloth, [-1.0, 0.38 + 1.8, -1.2]);
    add(g, cyl(0.05, 0.05, 4.4, 5), wood(), [-1.0, 2.6, -1.2]);
    add(g, sphere(0.14, 8, 6), gold(), [-1.0, 4.8, -1.2]);
    add(g, new THREE.CircleGeometry(0.9, 12, -0.6, 1.2), mat('#3a2a3a', { side: THREE.DoubleSide }), [-1.0, 1.0, 0.95], [0.55, 0, 0]);
    // The campfire: stones in a ring, logs, glowing embers.
    for (let i = 0; i < 8; i++) add(g, ico(0.2), mat(SAND.dark), [1.6 + Math.sin(i * 0.8) * 0.6, 0.48, 1.3 + Math.cos(i * 0.8) * 0.6]);
    for (const a of [0.3, 1.9]) add(g, cyl(0.08, 0.08, 0.9, 6), wood(), [1.6, 0.5, 1.3], [Math.PI / 2, a, 0]);
    add(g, cone(0.3, 0.6, 7), lampMat, [1.6, 0.78, 1.3]);
    // Star lanterns on a string.
    for (let i = 0; i < 5; i++) add(g, ico(0.14), lampMat, [-3.2 + i * 1.5, 2.8 - Math.sin((i / 4) * Math.PI) * 0.5, 2.8]);
    for (const x of [-3.3, 3.0]) add(g, cyl(0.05, 0.05, 2.6, 5), wood(), [x, 1.68, 2.8]);
    batch(g);
    const scope = new THREE.Group();
    scope.position.set(2.2, 2.0, -1.4);
    scope.userData.live = true;
    for (let i = 0; i < 3; i++) add(scope, cyl(0.03, 0.03, 1.7, 4), wood(), [Math.sin(i * 2.1) * 0.3, -0.8, Math.cos(i * 2.1) * 0.3], [Math.cos(i * 2.1) * 0.2, 0, -Math.sin(i * 2.1) * 0.2]);
    const tube = new THREE.Group();
    add(tube, cyl(0.12, 0.18, 1.4, 10), brass(), [0, 0.3, 0.2], [-0.9, 0, 0]);
    scope.add(tube);
    g.add(scope);
    let t = 9, clock = 0;
    g.userData = { top: 5.4, poke: () => (t = 0), update(dt) { t += dt; clock += dt; tube.rotation.y = Math.sin(clock * 0.3) * 0.6 + (t < 2.5 ? t * 2.5 : 0); } };
    return g;
  }
};
export const DESERT_LANDMARK_ICONS = { sphinxfountain: '⛲', caravan: '🐪', felucca: '⛵', obelisk: '☀️', balloon: '🎈', scrolls: '📜', startent: '⛺' };

/** The scroll's writing: lines of little signs in two inks. */
let scrollTex = null;
function scrollTexture() {
  if (scrollTex) return scrollTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f4e4bb';
  g.fillRect(0, 0, 256, 128);
  const r = seeded(17);
  for (let row = 0; row < 4; row++) for (let i = 0; i < 12; i++) {
    g.fillStyle = r() > 0.75 ? SAND.red : '#3a2a24';
    const x = 18 + i * 19, y = 20 + row * 27;
    const k = Math.floor(r() * 4);
    if (k === 0) g.fillRect(x, y, 10, 10);
    else if (k === 1) {
      g.beginPath();
      g.arc(x + 5, y + 5, 5, 0, TAU);
      g.fill();
    } else if (k === 2) g.fillRect(x + 3, y - 2, 4, 14);
    else {
      g.beginPath();
      g.moveTo(x, y + 10);
      g.lineTo(x + 5, y);
      g.lineTo(x + 10, y + 10);
      g.fill();
    }
  }
  scrollTex = new THREE.CanvasTexture(c);
  scrollTex.colorSpace = THREE.SRGBColorSpace;
  return scrollTex;
}

/** A felucca: a slim hull with turned-up ends, a short mast and a big slanting sail. Looks along +Z. */
export function feluccaBoat(stripe = SAND.red, s = 1) {
  const g = new THREE.Group();
  g.scale.setScalar(s);
  const hullM = mat('#8a5a36', { rough: 0.8 }), trim = mat(stripe);
  add(g, new THREE.SphereGeometry(1, 18, 8, 0, TAU, Math.PI / 2, Math.PI / 2), hullM, [0, 0.45, 0], [0, 0, 0], [1.0, 0.6, 3.0]);
  add(g, new THREE.CylinderGeometry(1, 1, 0.1, 24), mat('#c39a6b'), [0, 0.42, 0], [0, 0, 0], [0.96, 1, 2.9]);
  add(g, new THREE.TorusGeometry(1, 0.07, 5, 32), trim, [0, 0.47, 0], [Math.PI / 2, 0, 0], [1.0, 3.0, 1]);
  for (const sz of [-1, 1]) add(g, cone(0.22, 0.9, 8), hullM, [0, 0.75, sz * 2.85], [sz * 1.1, 0, 0]);
  add(g, cyl(0.06, 0.08, 3.4, 6), wood(), [0, 2.1, 0.6]);
  // The lateen sail: a long yard slanting up to the stern, the sheet under it.
  const sail = new THREE.Group();
  sail.position.set(0, 0.9, 0.6);
  const shape = new THREE.Shape();
  shape.moveTo(2.4, 0.4);
  shape.lineTo(-2.6, 5.2);
  shape.lineTo(-1.7, 0.35);
  shape.lineTo(2.4, 0.4);
  const sheet = new THREE.ShapeGeometry(shape);
  sheet.rotateY(-Math.PI / 2);
  add(sail, sheet, mat('#fff8ea', { side: THREE.DoubleSide }), [0.06, 0, 0]);
  const dz = -5.0, dy = 4.8;
  add(sail, cyl(0.04, 0.05, Math.hypot(dz, dy) + 0.3, 5), wood(), [0.08, 2.8, -0.1], [Math.atan2(dz, dy), 0, 0]);
  add(sail, cyl(0.03, 0.03, 4.1, 5), wood(), [0.08, 0.37, 0.35], [Math.PI / 2, 0, 0]);
  g.add(sail);
  g.userData.sail = sail;
  return g;
}
