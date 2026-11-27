/**
 * The Sky Castle's buildings (original designs, a toy look: white and cream
 * stone, teal and turquoise conical roofs with gold finials, arched windows,
 * banners, ivy and flower boxes).
 *
 *   Math     the Clock Tower School: a little stone hall with a gabled roof and
 *            a tall square tower above it, a big clock face whose hands turn,
 *            an open belfry and a spire; a round turret beside it with a
 *            turning astrolabe of gold rings, and counting blocks by the door
 *   History  the Library Hall: a steep-roofed hall whose gable faces you, a
 *            round stained-glass window over a double arched door, tall
 *            stained-glass windows either side, an open book over the door, a
 *            long banner, a little bell spire on the ridge and a corner turret
 *   Physics  the Inventor's Workshop: a round stone tower with a half-timbered
 *            top storey under a conical roof, windmill sails that turn on its
 *            front, a timber crane with a rope and a crate that swings, and gold
 *            gears on the wall
 *
 * The small places stand under round pavilion tents (striped roofs, scalloped
 * edges, a pennant on top). Each street's plaza has a landmark: a wishing-well
 * fountain, a ribbon maypole, a friendly stone dragon, a bell tower, a sundial
 * garden, a balloon dock and the crown garden. `castleGate` (the same API as
 * structures.js buildGate) is a portcullis between two gate towers at the foot
 * of a ramp, raised while the floor above is open. The stained glass glows at
 * night (`glassMat`, castle/scene.js sets it).
 *
 * Same contract as buildings.js shapes: origin at the plinth's centre at
 * walking level, the door faces +Z, the function returns the top's height.
 */
import * as THREE from 'three';
import { add, batch, box, cone, cyl, ico, mat, paint, seeded, sphere, vcMat, gable } from '../kit.js';
import { windowMat, lampMat } from '../buildings.js';

const PLINTH_R = 4.6, PLINTH_H = 0.55;
const TAU = Math.PI * 2;

/** The castle's colours: white and cream stone, teal roofs, gold. */
export const STONE = {
  white: '#f6f1e6', cream: '#ece3d2', shade: '#d9cfbd', dark: '#b9ad99', blue: '#a9b6c4', mortar: '#cbbfa9',
  teal: '#2fb3a6', tealDark: '#1f8a82', turq: '#3cc4c0', gold: '#f2c14e', wood: '#9a6b47', darkWood: '#6b4a33',
  plaster: '#fbf3e0', ivy: '#5aa84f', ivyDark: '#3f8a45', red: '#e0574f', blueCloth: '#3a6fd0', rose: '#ff8fb0'
};
const M = {
  white: () => mat(STONE.white, { rough: 0.9 }),
  cream: () => mat(STONE.cream, { rough: 0.9 }),
  shade: () => mat(STONE.shade, { rough: 0.9 }),
  dark: () => mat(STONE.dark, { rough: 0.9 }),
  gold: () => mat(STONE.gold, { rough: 0.35, metal: 0.6 }),
  wood: () => mat(STONE.wood),
  darkWood: () => mat(STONE.darkWood),
  plaster: () => mat(STONE.plaster),
  ivy: () => mat(STONE.ivy),
  ivyDark: () => mat(STONE.ivyDark)
};

/** Stained glass: a canvas of coloured panes that glows warm at night (castle/scene.js turns it up). */
let glass = null;
export function glassMat() {
  if (glass) return glass;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const cols = ['#4f8fe0', '#e0574f', '#ffd23f', '#5fc46a', '#9b7be0', '#3cc4c0', '#ff9f4a'];
  const r = seeded(77);
  for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) {
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.fillRect(x, y, 16, 16);
  }
  g.strokeStyle = '#2b2430';
  g.lineWidth = 3;
  for (let i = 0; i <= 128; i += 16) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 128);
    g.moveTo(0, i);
    g.lineTo(128, i);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  glass = new THREE.MeshStandardMaterial({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.18, roughness: 0.3, flatShading: true });
  return glass;
}

/* ---------------------------------------------------------------- small parts (the scene uses them too) */

/** A conical roof (a little bell-shaped, a ring of eaves), a gold ball and spike on top. Returns the top's height. */
export function spire(g, [x, y, z], r, h, color, { seg = 20, finial = true } = {}) {
  const prof = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    prof.push(new THREE.Vector2(Math.max(0.001, r * (1 - t) ** 1.25 * (1 + 0.08 * Math.sin(t * Math.PI))), t * h));
  }
  add(g, new THREE.LatheGeometry(prof, seg), mat(color, { rough: 0.6 }), [x, y, z]);
  add(g, new THREE.CylinderGeometry(r * 1.02, r * 1.08, 0.18, seg), mat(new THREE.Color(color).multiplyScalar(0.8).getStyle()), [x, y + 0.05, z]);
  if (finial) {
    add(g, sphere(Math.max(0.09, r * 0.12), 10, 8), M.gold(), [x, y + h + 0.05, z]);
    add(g, cone(Math.max(0.035, r * 0.04), Math.max(0.4, r * 0.45), 6), M.gold(), [x, y + h + Math.max(0.3, r * 0.3), z]);
  }
  return y + h + Math.max(0.5, r * 0.5);
}

/** An arched window (glows at night): glass, a stone frame with a round top, set in a wall facing +Z (or turned by ry). */
export function archWindow(g, [x, y, z], ry = 0, w = 0.55, h = 0.9, { frame = STONE.cream, glassM = windowMat, sill = true } = {}) {
  const k = new THREE.Group();
  k.position.set(x, y, z);
  k.rotation.y = ry;
  add(k, box(w, h, 0.06), glassM, [0, 0, 0.02]);
  add(k, new THREE.CircleGeometry(w / 2, 14, 0, Math.PI), glassM, [0, h / 2, 0.052]);
  const fm = mat(frame, { rough: 0.9 });
  for (const s of [-1, 1]) add(k, box(0.1, h, 0.12), fm, [s * (w / 2 + 0.05), 0, 0.04]);
  add(k, new THREE.TorusGeometry(w / 2 + 0.05, 0.06, 4, 14, Math.PI), fm, [0, h / 2, 0.05]);
  if (sill) add(k, box(w + 0.28, 0.08, 0.2), fm, [0, -h / 2 - 0.04, 0.08]);
  g.add(k);
  return k;
}

/** A flower box under a window: a little wooden trough of bright blooms. */
export function flowerBox(g, [x, y, z], ry, w, flowers) {
  const k = new THREE.Group();
  k.position.set(x, y, z);
  k.rotation.y = ry;
  add(k, box(w, 0.18, 0.22), M.wood(), [0, 0, 0.14]);
  add(k, box(w - 0.06, 0.08, 0.16), M.ivy(), [0, 0.1, 0.14]);
  for (let i = 0; i < Math.round(w / 0.16); i++) add(k, ico(0.075), mat(flowers[i % flowers.length]), [-w / 2 + 0.1 + i * 0.16, 0.16, 0.16 + (i % 2) * 0.05]);
  g.add(k);
}

/** A hanging banner with a swallowtail, on a gold rod, facing +Z (or turned by ry). */
export function banner(g, [x, y, z], ry, color, w = 0.7, h = 1.6, emblem = STONE.gold) {
  const k = new THREE.Group();
  k.position.set(x, y, z);
  k.rotation.y = ry;
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, -h);
  s.lineTo(0, -h + w * 0.4);
  s.lineTo(-w / 2, -h);
  s.lineTo(-w / 2, 0);
  add(k, new THREE.ShapeGeometry(s), mat(color, { side: THREE.DoubleSide }), [0, 0, 0.03]);
  add(k, cyl(0.035, 0.035, w + 0.3, 6), M.gold(), [0, 0.02, 0.03], [0, 0, Math.PI / 2]);
  // A little gold diamond on the cloth.
  add(k, new THREE.CircleGeometry(w * 0.2, 4), mat(emblem, { side: THREE.DoubleSide }), [0, -h * 0.42, 0.045]);
  add(k, box(w, 0.06, 0.01), mat(emblem), [0, -0.12, 0.04]);
  g.add(k);
  return k;
}

/** A lumpy clump of ivy against a wall (centre at p, spread along the wall facing ry). */
export function ivy(g, [x, y, z], ry, w = 1.2, h = 1.6, seed = 1) {
  const r = seeded(seed);
  const n = Math.round(w * h * 4);
  const cs = Math.cos(ry), sn = Math.sin(ry);
  for (let i = 0; i < n; i++) {
    const u = (r() - 0.5) * w, v = (r() - 0.5) * h;
    // Thinner towards the top: ivy climbs.
    if (r() > 1 - (v / h + 0.5) * 0.6) continue;
    add(g, ico(0.16 + r() * 0.14), r() < 0.5 ? M.ivy() : M.ivyDark(), [x + cs * u + sn * 0.08, y + v, z - sn * u + cs * 0.08], [r(), r(), r()], [1, 1, 0.55]);
  }
}

/** A round stone tower with arched windows, a ring of corbels and a conical roof. Returns its top. */
export function roundTower(g, [x, y, z], r, h, roof, { windows = 2, crown = true, facing = 0, roofH = null } = {}) {
  add(g, cyl(r, r * 1.04, h, 18), M.white(), [x, y + h / 2, z]);
  add(g, cyl(r * 1.06, r * 1.06, 0.2, 18), M.shade(), [x, y + 0.1, z]);
  if (crown) {
    add(g, cyl(r * 1.16, r * 1.02, 0.34, 18), M.cream(), [x, y + h - 0.17, z]);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      add(g, box(0.16, 0.2, 0.16), M.shade(), [x + Math.sin(a) * r * 1.06, y + h - 0.42, z + Math.cos(a) * r * 1.06], [0, a, 0]);
    }
  }
  for (let i = 0; i < windows; i++) {
    const a = facing + (i - (windows - 1) / 2) * 0.9, wy = y + h * (0.45 + 0.3 * (i % 2));
    archWindow(g, [x + Math.sin(a) * (r + 0.01), wy, z + Math.cos(a) * (r + 0.01)], a, r * 0.32, r * 0.55, { sill: false });
  }
  if (!roof) return y + h;
  return spire(g, [x, y + h, z], r * (crown ? 1.3 : 1.15), roofH ?? r * 2.6, roof);
}

/* ---------------------------------------------------------------- the plinth */

/** A round paved terrace of white stone: block courses on its side, flagstones and a coloured ring on top, low lanterns, steps to the door. */
export function castlePlinth(P, look) {
  const g = new THREE.Group();
  const R = PLINTH_R;
  const side = new THREE.CylinderGeometry(R, R + 0.12, PLINTH_H, 48, 3);
  const A = new THREE.Color(STONE.white), B = new THREE.Color(STONE.shade);
  paint(side, (x, y, z) => {
    const row = Math.floor((y + 1) / 0.18);
    const a = Math.atan2(x, z) * R;
    return Math.abs((((a + row * 0.45) % 0.9) + 0.9) % 0.9) < 0.05 ? B : A;
  });
  add(g, side, vcMat({ key: 'castlestone' }), [0, PLINTH_H / 2, 0]);
  const top = new THREE.CircleGeometry(R - 0.04, 48, 0, TAU).rotateX(-Math.PI / 2);
  const C1 = new THREE.Color('#f3ead8'), C2 = new THREE.Color('#e6dbc6');
  paint(top, (x, y, z) => ((Math.floor(x / 0.9) + Math.floor(z / 0.9)) & 1 ? C1 : C2));
  add(g, top, vcMat({ key: 'castlestone' }), [0, PLINTH_H + 0.015, 0]);
  add(g, new THREE.TorusGeometry(R - 0.45, 0.06, 4, 48), mat(look.banner), [0, PLINTH_H + 0.04, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.39;
    if (Math.cos(a) > 0.8) continue;
    add(g, box(0.22, 0.3, 0.22), M.cream(), [Math.sin(a) * (R - 0.25), PLINTH_H + 0.15, Math.cos(a) * (R - 0.25)]);
    add(g, box(0.16, 0.16, 0.16), lampMat, [Math.sin(a) * (R - 0.25), PLINTH_H + 0.36, Math.cos(a) * (R - 0.25)]);
  }
  // Two broad steps down to the street at the front.
  add(g, box(2.8, 0.18, 0.7), M.cream(), [0, PLINTH_H * 0.66 - 0.09, R + 0.32]);
  add(g, box(3.2, 0.18, 0.7), M.shade(), [0, PLINTH_H * 0.33 - 0.09, R + 0.75]);
  return g;
}

/* ---------------------------------------------------------------- math: the clock tower school */

/** A clock face texture: a cream disc, twelve marks, a gold rim (the hands are their own meshes). */
let clockTex = null;
function clockFace() {
  if (clockTex) return clockTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d9a83a';
  g.beginPath();
  g.arc(128, 128, 126, 0, TAU);
  g.fill();
  g.fillStyle = '#fff8e8';
  g.beginPath();
  g.arc(128, 128, 110, 0, TAU);
  g.fill();
  g.fillStyle = '#3b3340';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 34px "Nunito Variable", system-ui, sans-serif';
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * TAU;
    if (i % 3 === 0) g.fillText(String(i), 128 + Math.sin(a) * 84, 128 - Math.cos(a) * 84);
    else {
      g.beginPath();
      g.arc(128 + Math.sin(a) * 88, 128 - Math.cos(a) * 88, 6, 0, TAU);
      g.fill();
    }
  }
  clockTex = new THREE.CanvasTexture(c);
  clockTex.colorSpace = THREE.SRGBColorSpace;
  return clockTex;
}
/** A shield with a picture on it ('123', a book, a gear), for over a door. */
const shields = new Map();
function shieldTex(text, color) {
  const key = `${text}|${color}`;
  if (shields.has(key)) return shields.get(key);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 150;
  const g = c.getContext('2d');
  const path = () => {
    g.beginPath();
    g.moveTo(8, 8);
    g.lineTo(120, 8);
    g.lineTo(120, 70);
    g.quadraticCurveTo(118, 120, 64, 144);
    g.quadraticCurveTo(10, 120, 8, 70);
    g.closePath();
  };
  g.fillStyle = '#f2c14e';
  path();
  g.fill();
  g.save();
  g.translate(64, 76);
  g.scale(0.84, 0.84);
  g.translate(-64, -76);
  g.fillStyle = color;
  path();
  g.fill();
  g.restore();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = text.length > 2 ? 'bold 40px "Nunito Variable", system-ui, sans-serif' : '58px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  g.fillText(text, 64, 66);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  shields.set(key, t);
  return t;
}
function shield(g, [x, y, z], ry, s, text, color) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 1.17), new THREE.MeshBasicMaterial({ map: shieldTex(text, color), transparent: true, toneMapped: false }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.userData.live = true;
  g.add(m);
}

/** An arched door: dark wood planks under a round top, a stone frame, a gold ring. */
function archDoor(g, [x, y, z], w = 1.1, h = 1.7, frame = STONE.cream) {
  add(g, box(w, h - w / 2, 0.08), M.darkWood(), [x, y + (h - w / 2) / 2, z + 0.02]);
  add(g, new THREE.CircleGeometry(w / 2, 16, 0, Math.PI), M.darkWood(), [x, y + h - w / 2, z + 0.065]);
  for (let i = 1; i < 4; i++) add(g, box(0.03, h - w / 2, 0.02), M.wood(), [x - w / 2 + (i * w) / 4, y + (h - w / 2) / 2, z + 0.07]);
  const fm = mat(frame, { rough: 0.9 });
  for (const s of [-1, 1]) add(g, box(0.16, h - w / 2, 0.16), fm, [x + s * (w / 2 + 0.08), y + (h - w / 2) / 2, z + 0.04]);
  add(g, new THREE.TorusGeometry(w / 2 + 0.08, 0.08, 4, 16, Math.PI), fm, [x, y + h - w / 2, z + 0.06]);
  add(g, new THREE.TorusGeometry(0.07, 0.02, 4, 10), M.gold(), [x + w * 0.25, y + h * 0.45, z + 0.1]);
}

export function clockTower(g, P, floor) {
  const look = floor.look;
  const roof = look.roof.math;
  const y0 = PLINTH_H + 0.04;
  // The hall: stone walls, a gabled roof, an arched door, windows with flower boxes.
  const hw = 5.4, hh = 2.7, hd = 3.4, hz = 0.6;
  add(g, box(hw, hh, hd), M.white(), [0, y0 + hh / 2, hz]);
  add(g, box(hw + 0.12, 0.22, hd + 0.12), M.shade(), [0, y0 + 0.11, hz]);
  add(g, box(hw + 0.1, 0.16, hd + 0.1), M.cream(), [0, y0 + hh - 0.08, hz]);
  add(g, gable(hw + 0.5, hd + 0.6, 1.5), mat(roof, { rough: 0.6 }), [0, y0 + hh, hz]);
  add(g, gable(hw - 0.2, hd - 0.4, 1.25), M.white(), [0, y0 + hh - 0.01, hz]);
  archDoor(g, [-1.3, y0, hz + hd / 2], 1.05, 1.75);
  for (const sx of [0.6, 1.9]) {
    archWindow(g, [sx, y0 + 1.45, hz + hd / 2 + 0.01], 0, 0.5, 0.8);
    flowerBox(g, [sx, y0 + 0.92, hz + hd / 2], 0, 0.7, look.flowers);
  }
  shield(g, [-1.3, y0 + 2.25, hz + hd / 2 + 0.06], 0, 0.6, '123', roof);
  // The tower: square, rising from the back of the hall, a big clock face on its front.
  const tw = 2.5, tz = -1.0, th = 8.2;
  add(g, box(tw, th, tw), M.white(), [0.6, y0 + th / 2, tz]);
  for (const yy of [3.0, 5.6]) add(g, box(tw + 0.12, 0.14, tw + 0.12), M.shade(), [0.6, y0 + yy, tz]);
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.0, 36), new THREE.MeshToonMaterial({ map: clockFace() }));
  face.position.set(0.6, y0 + 6.7, tz + tw / 2 + 0.03);
  g.add(face);
  add(g, new THREE.TorusGeometry(1.02, 0.08, 6, 36), M.gold(), [0.6, y0 + 6.7, tz + tw / 2 + 0.04]);
  // The hands turn (buildings.js spins `orrery` children about its y, here turned to face out).
  const hands = new THREE.Group();
  hands.position.set(0.6, y0 + 6.7, tz + tw / 2 + 0.1);
  hands.rotation.x = Math.PI / 2;
  hands.userData.live = true;
  const hand = (len, w, speed) => {
    const pivot = new THREE.Group();
    add(pivot, box(w, 0.03, len), M.darkWood(), [0, 0, -len / 2 + 0.08]);
    pivot.userData.speed = speed;
    hands.add(pivot);
    return pivot;
  };
  hand(0.55, 0.09, -0.12).rotation.y = 1.2;
  hand(0.82, 0.06, -1.1);
  add(hands, cyl(0.08, 0.08, 0.06, 12), M.gold(), [0, 0.02, 0]);
  g.add(hands);
  g.userData.orrery = hands;
  // An open belfry with a little bell, then the spire.
  const by = y0 + th;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(g, box(0.36, 1.3, 0.36), M.white(), [0.6 + dx * (tw / 2 - 0.18), by + 0.65, tz + dz * (tw / 2 - 0.18)]);
  add(g, box(tw + 0.2, 0.2, tw + 0.2), M.cream(), [0.6, by + 1.4, tz]);
  add(g, new THREE.SphereGeometry(0.38, 14, 8, 0, TAU, 0, Math.PI * 0.6), M.gold(), [0.6, by + 0.95, tz]);
  const top = spire(g, [0.6, by + 1.5, tz], 1.85, 3.6, roof, { seg: 4 });
  // Turn the square spire to sit on the square tower.
  g.children.at(-4).rotation.y = Math.PI / 4;
  g.children.at(-3).rotation.y = Math.PI / 4;
  // The astrolabe turret: a slim round tower with gold rings turning on top.
  const ax = -2.3, az = -1.2;
  roundTower(g, [ax, y0, az], 0.75, 4.6, null, { windows: 1 });
  const rings = new THREE.Group();
  rings.position.set(ax, y0 + 5.6, az);
  rings.userData.live = true;
  for (const [rx, rz, r] of [[0, 0, 0.62], [Math.PI / 2, 0, 0.55], [0.6, 0.9, 0.48]]) add(rings, new THREE.TorusGeometry(r, 0.04, 6, 32), M.gold(), [0, 0, 0], [rx, 0, rz]);
  add(rings, sphere(0.16, 12, 8), mat('#4f8fe0'), [0, 0, 0]);
  add(g, cyl(0.06, 0.06, 0.8, 6), M.gold(), [ax, y0 + 4.95, az]);
  g.add(rings);
  g.userData.dome = rings;
  // Counting blocks by the door.
  ['#ff6b6b', '#ffd23f', '#4fc3f7'].forEach((c, i) => add(g, box(0.42, 0.42, 0.42), mat(c), [-2.9 + (i % 2) * 0.48, y0 + 0.21 + (i === 2 ? 0.42 : 0), 2.9], [0, 0.3 * i, 0]));
  ivy(g, [2.55, y0 + 1.2, hz + hd / 2 - 0.2], Math.PI / 2, 1.2, 2.0, 11);
  return top;
}

/* ---------------------------------------------------------------- history: the library hall */

export function libraryHall(g, P, floor) {
  const look = floor.look;
  const roof = look.roof.history;
  const y0 = PLINTH_H + 0.04;
  const w = 4.8, h = 3.6, d = 5.2, z0 = -0.5;
  add(g, box(w, h, d), M.white(), [0, y0 + h / 2, z0]);
  add(g, box(w + 0.14, 0.24, d + 0.14), M.shade(), [0, y0 + 0.12, z0]);
  // A steep roof whose gable faces the street, and the stone gable under it.
  add(g, gable(d + 0.5, w + 0.7, 2.9), mat(roof, { rough: 0.6 }), [0, y0 + h, z0], [0, Math.PI / 2, 0]);
  add(g, gable(0.3, w, 2.55), M.white(), [0, y0 + h - 0.01, z0 + d / 2 - 0.15], [0, Math.PI / 2, 0]);
  // Buttresses.
  for (const sx of [-1, 1]) for (const k of [-0.3, 0.3]) add(g, box(0.4, h * 0.8, 0.5), M.cream(), [sx * (w / 2 + 0.12), y0 + h * 0.4, z0 + k * d], [0, 0, -sx * 0.06]);
  const fz = z0 + d / 2 + 0.01;
  // The round stained-glass window in the gable, a stone ring and spokes.
  const rose = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), glassMat());
  rose.position.set(0, y0 + h + 0.75, fz + 0.03);
  g.add(rose);
  add(g, new THREE.TorusGeometry(0.76, 0.1, 6, 28), M.cream(), [0, y0 + h + 0.75, fz + 0.05]);
  for (let i = 0; i < 6; i++) add(g, box(0.05, 1.4, 0.03), M.cream(), [0, y0 + h + 0.75, fz + 0.06], [0, 0, (i / 6) * Math.PI]);
  // The double door under a pointed arch, an open book above it.
  add(g, box(1.5, 2.0, 0.1), M.darkWood(), [0, y0 + 1.0, fz + 0.02]);
  add(g, new THREE.CircleGeometry(0.75, 16, 0, Math.PI), M.darkWood(), [0, y0 + 2.0, fz + 0.07]);
  add(g, box(0.04, 2.6, 0.04), M.wood(), [0, y0 + 1.3, fz + 0.1]);
  add(g, new THREE.TorusGeometry(0.85, 0.11, 4, 16, Math.PI), M.cream(), [0, y0 + 2.0, fz + 0.06]);
  for (const s of [-1, 1]) add(g, box(0.2, 2.0, 0.2), M.cream(), [s * 0.85, y0 + 1.0, fz + 0.05]);
  const book = new THREE.Group();
  book.position.set(0, y0 + 3.15, fz + 0.18);
  for (const s of [-1, 1]) add(book, box(0.5, 0.36, 0.05), M.plaster(), [s * 0.25, 0, 0], [0, s * 0.35, 0]);
  add(book, box(1.1, 0.42, 0.04), mat(STONE.red), [0, 0, -0.06]);
  g.add(book);
  // Tall stained-glass windows either side of the door.
  for (const sx of [-1.65, 1.65]) archWindow(g, [sx, y0 + 1.85, fz], 0, 0.55, 1.7, { glassM: glassMat() });
  // Side windows.
  for (const sz of [-1.5, 0.6]) for (const sx of [-1, 1]) archWindow(g, [sx * (w / 2 + 0.01), y0 + 2.0, z0 + sz], sx * Math.PI / 2, 0.5, 1.3, { glassM: glassMat(), sill: false });
  // A long banner on the front, a little bell spire on the ridge, a corner turret.
  banner(g, [-1.65 - 0.6, y0 + h - 0.15, fz + 0.05], 0, look.banner, 0.55, 1.5);
  banner(g, [1.65 + 0.6, y0 + h - 0.15, fz + 0.05], 0, look.banner, 0.55, 1.5);
  add(g, box(0.6, 0.9, 0.6), M.white(), [0, y0 + h + 2.55, z0 - 0.6]);
  spire(g, [0, y0 + h + 3.0, z0 - 0.6], 0.55, 1.8, roof);
  const top = roundTower(g, [-w / 2 - 0.1, y0, z0 - d / 2 + 0.4], 0.95, 6.0, roof, { windows: 2, facing: -0.6 });
  shield(g, [0, y0 + 2.62, fz + 0.12], 0, 0.5, '📖', look.banner);
  ivy(g, [w / 2 + 0.05, y0 + 1.0, z0 + 1.6], Math.PI / 2, 1.4, 1.8, 23);
  // A little pile of books and a reading bench by the door.
  ['#e0574f', '#3a6fd0', '#5fc46a', '#ffd23f'].forEach((c, i) => add(g, box(0.5, 0.12, 0.36), mat(c), [2.6, y0 + 0.06 + i * 0.12, 2.8], [0, i * 0.3, 0]));
  return Math.max(top, y0 + h + 4.9);
}

/* ---------------------------------------------------------------- physics: the inventor's workshop */

export function inventorWorkshop(g, P, floor) {
  const look = floor.look;
  const roof = look.roof.physics;
  const y0 = PLINTH_H + 0.04;
  const R = 2.0, x0 = 0.4, z0 = -0.8;
  // A round stone tower, a half-timbered top storey (cream plaster, brown beams), a conical roof.
  add(g, cyl(R, R * 1.05, 4.2, 22), M.white(), [x0, y0 + 2.1, z0]);
  add(g, cyl(R * 1.08, R * 1.08, 0.22, 22), M.shade(), [x0, y0 + 0.11, z0]);
  add(g, cyl(R * 1.14, R * 1.02, 0.3, 22), M.wood(), [x0, y0 + 4.3, z0]);
  add(g, cyl(R * 1.12, R * 1.12, 2.1, 22), M.plaster(), [x0, y0 + 5.45, z0]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    add(g, box(0.12, 2.1, 0.06), M.darkWood(), [x0 + Math.sin(a) * R * 1.13, y0 + 5.45, z0 + Math.cos(a) * R * 1.13], [0, a, 0]);
    if (i % 2) add(g, box(0.1, 1.5, 0.05), M.darkWood(), [x0 + Math.sin(a + 0.26) * R * 1.13, y0 + 5.45, z0 + Math.cos(a + 0.26) * R * 1.13], [0, a + 0.26, 0.6]);
  }
  for (const a of [-0.7, 0.9, 2.4]) archWindow(g, [x0 + Math.sin(a) * (R * 1.13 + 0.01), y0 + 5.45, z0 + Math.cos(a) * (R * 1.13 + 0.01)], a, 0.45, 0.6, { frame: STONE.darkWood, sill: false });
  const top = spire(g, [x0, y0 + 6.5, z0], R * 1.42, 4.2, roof);
  // The door, a window, a gear sign.
  archDoor(g, [x0, y0, z0 + R + 0.01], 1.0, 1.8);
  archWindow(g, [x0 - 1.1, y0 + 2.9, z0 + R * 0.86], -0.55, 0.45, 0.7);
  shield(g, [x0, y0 + 2.55, z0 + R + 0.08], 0, 0.55, '⚙️', look.banner);
  // The windmill: a cap on the top storey's front, four sails (they turn: buildings.js `orrery`).
  const hubZ = z0 + R * 1.13 + 0.5, hubY = y0 + 5.35;
  add(g, box(0.9, 0.9, 0.7), M.wood(), [x0, hubY, hubZ - 0.3]);
  const sails = new THREE.Group();
  sails.position.set(x0, hubY, hubZ + 0.1);
  sails.rotation.x = Math.PI / 2;
  sails.userData.live = true;
  const arm = new THREE.Group();
  arm.userData.speed = 0.9;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const s = new THREE.Group();
    s.rotation.y = a;
    add(s, box(0.12, 0.08, 2.5), M.darkWood(), [0, 0, 1.3]);
    add(s, box(0.62, 0.05, 1.8), mat(i % 2 ? STONE.plaster : look.banner), [0.36, 0, 1.55]);
    for (let k = 0; k < 4; k++) add(s, box(0.66, 0.06, 0.05), M.darkWood(), [0.36, 0.02, 0.75 + k * 0.52]);
    arm.add(s);
  }
  add(arm, cyl(0.2, 0.2, 0.3, 12), M.gold(), [0, 0.1, 0]);
  sails.add(arm);
  g.add(sails);
  g.userData.orrery = sails;
  // The workshop lean-to and its crane: a timber arm with a rope and a crate (it swings: buildings.js `flag`).
  add(g, box(2.2, 2.0, 2.4), M.cream(), [-2.4, y0 + 1.0, -0.6]);
  add(g, box(2.5, 0.16, 2.7), mat(roof, { rough: 0.6 }), [-2.4, y0 + 2.15, -0.6], [0, 0, 0.22]);
  add(g, box(0.9, 1.3, 0.06), M.darkWood(), [-2.4, y0 + 0.65, 0.62]);
  const crane = new THREE.Group();
  crane.position.set(2.7, y0, 0.8);
  crane.userData.live = true;
  add(crane, box(0.22, 4.2, 0.22), M.wood(), [0, 2.1, 0]);
  const jib = new THREE.Group();
  jib.position.y = 4.0;
  add(jib, box(0.18, 0.18, 2.2), M.wood(), [0, 0, 0.9]);
  add(jib, box(0.1, 0.1, 1.4), M.wood(), [0, -0.5, 0.45], [0.7, 0, 0]);
  add(jib, cyl(0.16, 0.16, 0.12, 12), M.gold(), [0, -0.12, 1.85], [0, 0, Math.PI / 2]);
  add(jib, cyl(0.02, 0.02, 1.8, 4), mat('#d9c49a'), [0, -1.0, 1.85]);
  add(jib, box(0.55, 0.45, 0.55), M.wood(), [0, -2.05, 1.85]);
  add(jib, box(0.58, 0.06, 0.58), M.darkWood(), [0, -1.86, 1.85]);
  crane.add(jib);
  g.add(crane);
  g.userData.flag = crane;
  // Gold gears on the tower wall.
  for (const [a, yy, r] of [[-1.25, 1.6, 0.42], [-0.95, 2.4, 0.3], [1.2, 1.9, 0.36]]) {
    const gear = new THREE.Group();
    gear.position.set(x0 + Math.sin(a) * (R + 0.04), y0 + yy, z0 + Math.cos(a) * (R + 0.04));
    gear.rotation.y = a;
    add(gear, cyl(r, r, 0.08, 16), M.gold(), [0, 0, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) add(gear, box(0.12, 0.14, 0.08), M.gold(), [Math.cos((i / 8) * TAU) * r, Math.sin((i / 8) * TAU) * r, 0], [0, 0, (i / 8) * TAU]);
    add(gear, cyl(r * 0.3, r * 0.3, 0.1, 10), M.darkWood(), [0, 0, 0.02], [Math.PI / 2, 0, 0]);
    g.add(gear);
  }
  ivy(g, [x0 - 1.4, y0 + 1.2, z0 + 1.4], -0.8, 1.1, 2.0, 37);
  return top;
}

/* ---------------------------------------------------------------- the small places */

/** A round pavilion tent over a small place: a striped conical roof with a scalloped edge, posts, a pennant on top. */
export function pavilionTent(look, r, seed = 1) {
  const g = new THREE.Group();
  const R = r + 0.7, H = 3.0, RH = 2.0;
  const rnd = seeded(seed);
  const A = new THREE.Color('#fffaf0'), B = new THREE.Color(look.banner);
  const roofGeo = new THREE.ConeGeometry(R, RH, 24, 3, true);
  paint(roofGeo, (x, y, z) => (Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * 12) % 2 ? A : B));
  add(g, roofGeo, vcMat({ key: 'tent', side: THREE.DoubleSide }), [0, H + RH / 2, 0]);
  // The scalloped valance round the rim.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU + Math.PI / 24;
    add(g, new THREE.CircleGeometry(0.34, 10, Math.PI, Math.PI), mat(i % 2 ? '#fffaf0' : look.banner, { side: THREE.DoubleSide }), [Math.sin(a) * R * 0.995, H + 0.02, Math.cos(a) * R * 0.995], [0, a, 0]);
  }
  add(g, new THREE.TorusGeometry(R, 0.06, 4, 32), M.gold(), [0, H, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    add(g, cyl(0.07, 0.08, H, 6), M.wood(), [Math.sin(a) * (R - 0.2), H / 2, Math.cos(a) * (R - 0.2)]);
  }
  add(g, cyl(0.04, 0.04, 1.1, 6), M.gold(), [0, H + RH + 0.45, 0]);
  add(g, sphere(0.12, 10, 8), M.gold(), [0, H + RH + 1.0, 0]);
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.75, -0.16 - rnd() * 0.05);
  s.lineTo(0, -0.36);
  add(g, new THREE.ShapeGeometry(s), mat(look.banner, { side: THREE.DoubleSide }), [0.03, H + RH + 0.95, 0]);
  return batch(g);
}

/* ---------------------------------------------------------------- the landmarks */

/** A round paved pad for a landmark: white stone, a coloured ring, little lanterns. */
function pad(g, r, look) {
  add(g, cyl(r, r + 0.1, 0.3, 40), M.white(), [0, 0.15, 0]);
  add(g, cyl(r - 0.06, r - 0.06, 0.04, 40), mat('#efe6d4'), [0, 0.31, 0]);
  add(g, new THREE.TorusGeometry(r - 0.35, 0.06, 4, 48), mat(look.banner), [0, 0.34, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    add(g, box(0.14, 0.14, 0.14), lampMat, [Math.sin(a) * (r - 0.15), 0.38, Math.cos(a) * (r - 0.15)]);
  }
}
const waterMat = () => mat('#7fd6f2', { rough: 0.2, emissive: '#3fb7e0', ei: 0.25, key: 'castlewater' });

export const CASTLE_LANDMARKS = {
  /** The Wishing Well: a round stone well under a little roof in the middle of a fountain basin; tap it and the fountain leaps. */
  wishingwell(look) {
    const g = new THREE.Group();
    pad(g, 4.0, look);
    add(g, cyl(3.2, 3.3, 0.6, 40), M.cream(), [0, 0.6, 0]);
    add(g, cyl(2.95, 2.95, 0.04, 40), waterMat(), [0, 0.82, 0]);
    add(g, new THREE.TorusGeometry(3.25, 0.14, 6, 40), M.white(), [0, 0.92, 0], [Math.PI / 2, 0, 0]);
    add(g, cyl(1.0, 1.05, 1.0, 20), M.white(), [0, 1.2, 0]);
    add(g, new THREE.TorusGeometry(1.02, 0.1, 6, 24), M.shade(), [0, 1.7, 0], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) add(g, box(0.16, 1.8, 0.16), M.wood(), [s * 0.9, 2.4, 0]);
    add(g, box(2.1, 0.12, 0.12), M.wood(), [0, 2.75, 0]);
    add(g, gable(2.4, 1.8, 0.9), mat(look.roof?.math ?? STONE.teal), [0, 3.25, 0]);
    add(g, cyl(0.2, 0.16, 0.3, 10), M.wood(), [0.2, 2.2, 0]);
    flowerBox(g, [0, 0.95, 3.0], 0, 1.4, look.flowers);
    batch(g);
    // Jets round the well: they leap when poked.
    const jets = new THREE.Group();
    jets.userData.live = true;
    const jm = mat('#bfefff', { opacity: 0.75, key: 'castlejet' });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const j = add(jets, new THREE.CylinderGeometry(0.03, 0.09, 1, 8), jm, [Math.sin(a) * 2.2, 0.85, Math.cos(a) * 2.2]);
      j.userData.a = a;
    }
    g.add(jets);
    let t = 9;
    g.userData = { top: 4.2, poke: () => (t = 0), update(dt, time) { t += dt; const k = t < 2 ? Math.sin((t / 2) * Math.PI) : 0; for (const j of jets.children) { const h = 0.5 + 0.12 * Math.sin(time * 4 + j.userData.a * 3) + k * 2.2; j.scale.y = h; j.position.y = 0.85 + h / 2; } } };
    return g;
  },
  /** The Ribbon Maypole: a tall pole with a flower crown and eight bright ribbons; tap it and the ribbons whirl. */
  maypole(look) {
    const g = new THREE.Group();
    pad(g, 4.0, look);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      add(g, ico(0.22), mat(look.flowers[i % look.flowers.length]), [Math.sin(a) * 3.3, 0.45, Math.cos(a) * 3.3]);
    }
    add(g, cyl(0.12, 0.16, 6.2, 10), M.white(), [0, 3.4, 0]);
    add(g, cyl(0.4, 0.5, 0.5, 12), M.cream(), [0, 0.55, 0]);
    batch(g);
    const top = new THREE.Group();
    top.position.y = 6.4;
    top.userData.live = true;
    add(top, new THREE.TorusGeometry(0.42, 0.12, 6, 16), M.ivy(), [0, 0, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) add(top, ico(0.11), mat(look.flowers[i % look.flowers.length]), [Math.sin((i / 8) * TAU) * 0.42, 0.08, Math.cos((i / 8) * TAU) * 0.42]);
    add(top, sphere(0.2, 12, 8), M.gold(), [0, 0.3, 0]);
    const cols = ['#e0574f', '#ffd23f', '#3a6fd0', '#5fc46a', '#ff8fb0', '#9b7be0', '#3cc4c0', '#ff9f4a'];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const end = new THREE.Vector3(Math.sin(a) * 2.9, -5.4, Math.cos(a) * 2.9);
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, end.length()), mat(cols[i], { side: THREE.DoubleSide }));
      rib.position.copy(end).multiplyScalar(0.5);
      rib.lookAt(end);
      top.add(rib);
    }
    g.add(top);
    let spin = 0.4;
    g.userData = { top: 7.2, poke: () => (spin = 6), update(dt) { spin = Math.max(0.4, spin - dt * 2.5); top.rotation.y += dt * spin; } };
    return g;
  },
  /** The Stone Dragon: a friendly little dragon carved in stone, sitting on a fountain; tap it and it blows bubbles. */
  stonedragon(look) {
    const g = new THREE.Group();
    pad(g, 4.0, look);
    add(g, cyl(3.0, 3.1, 0.55, 36), M.cream(), [0, 0.58, 0]);
    add(g, cyl(2.75, 2.75, 0.04, 36), waterMat(), [0, 0.8, 0]);
    add(g, box(1.8, 1.1, 1.6), M.white(), [0, 1.3, -0.4]);
    const S = mat('#dcd6cb'), Sd = mat('#c4bcae'), moss = M.ivy();
    // Body, belly, head with a round snout, little horns, wings and a curled tail.
    add(g, sphere(0.85, 18, 12), S, [0, 2.6, -0.4], [0, 0, 0], [1, 1.05, 0.95]);
    add(g, sphere(0.6, 16, 10), mat('#ece6da'), [0, 2.45, 0.05], [0, 0, 0], [1, 1.1, 0.6]);
    add(g, sphere(0.62, 18, 12), S, [0, 3.75, 0.05]);
    add(g, sphere(0.36, 14, 10), mat('#ece6da'), [0, 3.55, 0.55], [0, 0, 0], [1.1, 0.8, 0.9]);
    for (const s of [-1, 1]) {
      add(g, sphere(0.15, 10, 8), mat('#3b3340'), [s * 0.25, 3.92, 0.5]);
      add(g, sphere(0.05, 8, 6), mat('#ffffff'), [s * 0.22, 3.97, 0.62]);
      add(g, cone(0.1, 0.4, 8), Sd, [s * 0.3, 4.35, -0.1], [-0.3, 0, s * 0.3]);
      const wing = new THREE.Shape();
      wing.moveTo(0, 0);
      wing.quadraticCurveTo(0.5, 0.9, 1.1, 0.8);
      wing.quadraticCurveTo(0.8, 0.4, 0.95, 0.1);
      wing.quadraticCurveTo(0.5, 0.15, 0, 0);
      add(g, new THREE.ExtrudeGeometry(wing, { depth: 0.08, bevelEnabled: false }), Sd, [s * 0.55, 2.9, -0.9], [0, s > 0 ? -0.5 : Math.PI + 0.5, 0]);
      add(g, sphere(0.24, 10, 8), S, [s * 0.5, 1.95, 0.15], [0, 0, 0], [1, 0.7, 1.3]);
    }
    for (let i = 0; i < 6; i++) add(g, sphere(0.3 - i * 0.03, 10, 8), S, [0.8 + Math.sin(i * 0.8) * 0.4, 1.95 + i * 0.12, -1.0 - i * 0.22]);
    // Moss on its back and its stand.
    for (let i = 0; i < 9; i++) add(g, ico(0.14), moss, [Math.sin(i) * 0.55, 3.2 + (i % 3) * 0.1, -0.85 + Math.cos(i) * 0.2], [i, i, 0], [1, 0.5, 1]);
    batch(g);
    const bubbles = new THREE.Group();
    bubbles.userData.live = true;
    const bm = mat('#dff6ff', { opacity: 0.6, key: 'castlebubble' });
    for (let i = 0; i < 8; i++) {
      const b = add(bubbles, sphere(0.14 + (i % 3) * 0.06, 12, 8), bm, [0, 0, 0]);
      b.visible = false;
    }
    g.add(bubbles);
    let t = 9;
    g.userData = {
      top: 5.2, poke: () => (t = 0),
      update(dt) {
        t += dt;
        bubbles.children.forEach((b, i) => {
          const k = t - i * 0.18;
          b.visible = k > 0 && k < 2.4;
          if (b.visible) b.position.set(Math.sin(i * 2.1) * k * 0.4, 3.6 + k * 1.1, 0.9 + k * 0.9);
        });
      }
    };
    return g;
  },
  /** The Bell Tower: an open stone tower with a gold bell under a teal spire; tap it and the bell swings. */
  belltower(look) {
    const g = new THREE.Group();
    pad(g, 4.0, look);
    add(g, box(2.6, 0.5, 2.6), M.cream(), [0, 0.55, 0]);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      add(g, box(0.5, 5.2, 0.5), M.white(), [dx * 0.95, 3.4, dz * 0.95]);
      ivy(g, [dx * 0.95, 1.8, dz * 0.95 + dz * 0.25], dz > 0 ? 0 : Math.PI, 0.5, 1.4, 50 + dx * 3 + dz);
    }
    add(g, box(2.7, 0.5, 2.7), M.cream(), [0, 6.2, 0]);
    for (let i = 0; i < 4; i++) banner(g, [Math.sin((i / 4) * TAU) * 1.36, 5.9, Math.cos((i / 4) * TAU) * 1.36], (i / 4) * TAU, look.banner, 0.5, 1.0);
    const sp = new THREE.Group();
    spire(sp, [0, 6.45, 0], 2.0, 3.2, look.roof?.history ?? STONE.teal, { seg: 4 });
    sp.rotation.y = Math.PI / 4;
    g.add(sp);
    batch(g);
    const bell = new THREE.Group();
    bell.position.set(0, 5.9, 0);
    bell.userData.live = true;
    const prof = [[0.001, 0], [0.3, -0.05], [0.4, -0.4], [0.5, -0.95], [0.66, -1.15], [0.6, -1.2]].map(([x, y]) => new THREE.Vector2(x, y + 1.2));
    add(bell, new THREE.LatheGeometry(prof.reverse(), 24), mat(STONE.gold, { rough: 0.35, metal: 0.6, side: THREE.DoubleSide }), [0, -1.2, 0]);
    add(bell, sphere(0.14, 10, 8), mat('#8a6a3a'), [0, -1.25, 0]);
    g.add(bell);
    let t = 9;
    g.userData = { sound: 'bell', top: 10.4, poke: () => (t = 0), update(dt, time) { t += dt; const k = t < 3 ? Math.sin(t * 7) * 0.5 * (1 - t / 3) : 0; bell.rotation.z = k + Math.sin(time * 0.8) * 0.03; } };
    return g;
  },
  /** The Sundial Garden: a big white sundial among clipped hedges and flowers; tap it and its shadow sweeps round the hours. */
  sundial(look) {
    const g = new THREE.Group();
    pad(g, 4.0, look);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      if (Math.cos(a) > 0.85) continue;
      add(g, box(1.4, 0.6, 0.6), M.ivyDark(), [Math.sin(a) * 3.2, 0.6, Math.cos(a) * 3.2], [0, a, 0]);
      for (let k = 0; k < 3; k++) add(g, ico(0.12), mat(look.flowers[(i + k) % look.flowers.length]), [Math.sin(a + (k - 1) * 0.12) * 3.2, 0.98, Math.cos(a + (k - 1) * 0.12) * 3.2]);
    }
    add(g, cyl(0.6, 0.75, 1.1, 16), M.white(), [0, 0.85, 0]);
    add(g, cyl(1.9, 1.9, 0.2, 40), M.white(), [0, 1.5, 0]);
    const face = new THREE.CircleGeometry(1.8, 40).rotateX(-Math.PI / 2);
    const C = new THREE.Color('#fff8e8'), D = new THREE.Color('#d9a83a');
    paint(face, (x, y, z) => {
      const a = Math.atan2(x, z), r = Math.hypot(x, z);
      return r > 1.35 && Math.abs(((a / TAU) * 12 + 120) % 1 - 0.5) > 0.44 ? D : C;
    });
    add(g, face, vcMat({ key: 'sundial' }), [0, 1.61, 0]);
    add(g, new THREE.TorusGeometry(1.86, 0.06, 4, 40), M.gold(), [0, 1.6, 0], [Math.PI / 2, 0, 0]);
    const gn = new THREE.Shape();
    gn.moveTo(-0.9, 0);
    gn.lineTo(0.9, 0);
    gn.lineTo(-0.9, 1.1);
    gn.lineTo(-0.9, 0);
    add(g, new THREE.ExtrudeGeometry(gn, { depth: 0.06, bevelEnabled: false }), M.gold(), [0, 1.62, -0.03], [0, Math.PI / 2, 0]);
    batch(g);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1.5), new THREE.MeshBasicMaterial({ color: '#7a6a5a', transparent: true, opacity: 0.45, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0, 0.75);
    const hand = new THREE.Group();
    hand.position.y = 1.63;
    hand.userData.live = true;
    hand.add(shadow);
    g.add(hand);
    let t = 9;
    g.userData = { top: 4.0, poke: () => (t = 0), update(dt, time) { t += dt; hand.rotation.y = 0.6 + Math.sin(time * 0.05) * 0.4 + (t < 3 ? (t / 3) * TAU : 0); } };
    return g;
  },
  /** The Balloon Dock: a little wooden dock with a striped hot-air balloon tied to it; tap it and the balloon rises and comes back. */
  kitedock(look) {
    const g = new THREE.Group();
    pad(g, 4.0, look);
    add(g, box(3.6, 0.3, 3.0), M.wood(), [0, 0.5, 0]);
    for (let i = 0; i < 6; i++) add(g, box(0.06, 0.02, 3.0), M.darkWood(), [-1.5 + i * 0.6, 0.66, 0]);
    for (const [dx, dz] of [[-1.7, -1.4], [1.7, -1.4], [-1.7, 1.4], [1.7, 1.4]]) add(g, cyl(0.12, 0.14, 1.3, 8), M.darkWood(), [dx, 1.0, dz]);
    batch(g);
    const bal = new THREE.Group();
    bal.userData.live = true;
    const env = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, a = t * Math.PI;
      env.push(new THREE.Vector2(Math.max(0.001, Math.sin(a) * 1.7 * (t < 0.5 ? 0.55 + t * 0.9 : 1)), -Math.cos(a) * 1.9));
    }
    const eg = new THREE.LatheGeometry(env, 24);
    const A = new THREE.Color(look.banner), B = new THREE.Color('#fffaf0');
    paint(eg, (x, y, z) => (Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * 12) % 2 ? A : B));
    add(bal, eg, vcMat({ key: 'balloon' }), [0, 4.6, 0]);
    add(bal, new THREE.TorusGeometry(0.62, 0.05, 4, 18), M.gold(), [0, 2.75, 0], [Math.PI / 2, 0, 0]);
    add(bal, cyl(0.5, 0.42, 0.55, 12), M.wood(), [0, 1.45, 0]);
    for (let i = 0; i < 4; i++) add(bal, cyl(0.015, 0.015, 1.1, 4), M.darkWood(), [Math.sin(i * 1.57 + 0.78) * 0.45, 2.15, Math.cos(i * 1.57 + 0.78) * 0.45], [Math.cos(i * 1.57 + 0.78) * 0.12, 0, -Math.sin(i * 1.57 + 0.78) * 0.12]);
    bal.position.y = 0.2;
    g.add(bal);
    let t = 9;
    g.userData = { top: 7.6, poke: () => (t = 0), update(dt, time) { t += dt; const k = t < 5 ? Math.sin((t / 5) * Math.PI) : 0; bal.position.y = 0.2 + Math.sin(time * 1.1) * 0.12 + k * 3.5; bal.rotation.y = time * 0.15; } };
    return g;
  },
  /** The Crown Garden: a hedge clipped into a crown round a gold crown on a pedestal; tap it and the crown spins and sparkles. */
  crowngarden(look) {
    const g = new THREE.Group();
    pad(g, 4.0, look);
    add(g, new THREE.TorusGeometry(2.7, 0.45, 8, 40), M.ivyDark(), [0, 0.85, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      add(g, cone(0.42, 1.3, 10), M.ivy(), [Math.sin(a) * 2.7, 1.8, Math.cos(a) * 2.7]);
      add(g, sphere(0.2, 10, 8), mat(look.flowers[i % look.flowers.length]), [Math.sin(a) * 2.7, 2.55, Math.cos(a) * 2.7]);
    }
    add(g, cyl(0.55, 0.7, 1.4, 16), M.white(), [0, 1.0, 0]);
    add(g, cyl(0.8, 0.8, 0.16, 16), M.cream(), [0, 1.75, 0]);
    batch(g);
    const crown = new THREE.Group();
    crown.position.y = 2.3;
    crown.userData.live = true;
    add(crown, new THREE.CylinderGeometry(0.62, 0.55, 0.45, 20, 1, true), mat(STONE.gold, { rough: 0.35, metal: 0.6, side: THREE.DoubleSide }), [0, 0, 0]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      add(crown, cone(0.14, 0.42, 6), M.gold(), [Math.sin(a) * 0.6, 0.42, Math.cos(a) * 0.6]);
      add(crown, sphere(0.07, 8, 6), mat(['#e0574f', '#3a6fd0', '#5fc46a'][i % 3], { emissive: '#ffffff', ei: 0.2 }), [Math.sin(a) * 0.6, 0.66, Math.cos(a) * 0.6]);
      add(crown, sphere(0.08, 8, 6), mat(['#3cc4c0', '#ff8fb0'][i % 2]), [Math.sin(a + 0.5) * 0.6, 0.02, Math.cos(a + 0.5) * 0.6]);
    }
    g.add(crown);
    let t = 9;
    g.userData = { top: 5.0, poke: () => (t = 0), update(dt, time) { t += dt; const k = t < 2 ? Math.sin((t / 2) * Math.PI) : 0; crown.rotation.y = time * 0.3 + (t < 2 ? t * 6 : 0); crown.position.y = 2.3 + Math.sin(time * 1.5) * 0.06 + k * 0.9; } };
    return g;
  }
};
export const CASTLE_LANDMARK_ICONS = { wishingwell: '⛲', maypole: '🎀', stonedragon: '🐉', belltower: '🔔', sundial: '☀️', kitedock: '🎈', crowngarden: '👑' };

/* ---------------------------------------------------------------- the portcullis */

/**
 * The gate at the foot of a ramp: two square stone gate towers with teal spires, an arch of
 * crenellated stone over the ramp, and a wooden portcullis that rises when the floor above opens.
 * Same API as structures.js buildGate: setOpen(on, instant), update(dt).
 */
export function castleGate(s, look) {
  const g = new THREE.Group();
  const W = s.width + 0.4;
  const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
  g.position.set(s.a.x + dx * 0.03, s.a.y, s.a.z + dz * 0.03);
  g.rotation.y = Math.atan2(dx, dz);
  const frame = new THREE.Group();
  for (const side of [-1, 1]) {
    const x = side * (W / 2 + 0.9);
    add(frame, box(1.8, 5.6, 1.8), M.white(), [x, 2.8, 0]);
    add(frame, box(2.0, 0.3, 2.0), M.cream(), [x, 5.6, 0]);
    for (const [ux, uz] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) add(frame, box(0.4, 0.45, 0.4), M.white(), [x + ux, 5.95, uz]);
    const sp = new THREE.Group();
    spire(sp, [0, 0, 0], 1.25, 2.6, look.roof?.history ?? STONE.teal, { seg: 4 });
    sp.position.set(x, 6.1, 0);
    sp.rotation.y = Math.PI / 4;
    frame.add(sp);
    archWindow(frame, [x, 3.6, 0.91], 0, 0.45, 0.75);
    banner(frame, [x, 4.9, 0.95], 0, look.banner, 0.8, 2.2);
  }
  add(frame, box(W + 0.4, 1.2, 1.2), M.white(), [0, 5.0, 0]);
  for (let i = 0; i < 9; i++) add(frame, box(0.7, 0.5, 1.2), M.white(), [-W / 2 + 0.6 + (i * (W - 1.2)) / 8, 5.85, 0]);
  add(frame, box(W + 0.42, 0.16, 1.22), M.cream(), [0, 4.45, 0]);
  g.add(batch(frame));
  const grate = new THREE.Group();
  grate.userData.live = true;
  const bars = Math.round(W / 0.8);
  for (let i = 0; i <= bars; i++) add(grate, box(0.14, 4.3, 0.14), M.darkWood(), [-W / 2 + (i * W) / bars, 2.15, 0]);
  for (let k = 0; k < 5; k++) add(grate, box(W, 0.14, 0.16), M.darkWood(), [0, 0.5 + k * 0.85, 0]);
  for (let i = 0; i <= bars; i++) add(grate, cone(0.1, 0.3, 4), mat('#8a8f99', { metal: 0.6 }), [-W / 2 + (i * W) / bars, -0.12, 0], [Math.PI, 0, 0]);
  batch(grate);
  g.add(grate);
  let open = 0, target = 0;
  g.userData.setOpen = (on, instant = false) => {
    target = on ? 1 : 0;
    if (instant) open = target;
  };
  g.userData.update = (dt) => {
    open += Math.sign(target - open) * Math.min(Math.abs(target - open), dt * 0.8);
    // Raised up into the arch, squeezed so it tucks away.
    grate.position.y = open * 3.9;
    grate.scale.y = 1 - open * 0.85;
  };
  return g;
}
