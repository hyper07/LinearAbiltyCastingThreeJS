/**
 * Grown architecture for the Great Tree: schools that look as if the tree
 * grew them — woven living-fibre pods, halls wrapped in arching roots,
 * a braided trunk holding up a glowing lens — with big drooping leaves for
 * roofs, round doors, porthole windows that glow warm at night, seed
 * lanterns, and bioluminescent patterns (glow.js) that brighten after dark.
 *
 * Original designs in a "living forest village" spirit; built from code.
 * Same contract as buildings.js shapes: origin at the plinth's centre at
 * deck level, the door faces +Z, the function returns the top's height.
 * The stone plinth becomes a mossy disc of living wood with roots spilling
 * over its rim and glow-bulb lamps on curled stalks.
 */
import * as THREE from 'three';
import { add, batch, cone, cyl, ico, leafGeo, limb, mat, seeded, sphere, toonRamp, vcMat } from './kit.js';
import { glowMat, glowPink, glowGold, glowBlue } from './glow.js';
import { windowMat, lampMat } from './buildings.js';

const PLINTH_R = 4.6, PLINTH_H = 0.55;
const TAU = Math.PI * 2;
const leafMat = () => vcMat({ side: THREE.DoubleSide, key: 'leaf' });
const bark = () => mat('#6e4a30', { rough: 0.95 });
const barkLight = () => mat('#8d6442', { rough: 0.95 });

/** Place a leaf (or anything along +Z) by its stalk: turned `yaw` round Y, tipped `pitch` down (negative: up). */
function aim(mesh, yaw, pitch, roll = 0) {
  mesh.rotation.order = 'YXZ';
  mesh.rotation.set(pitch, yaw, roll);
  return mesh;
}
function leaf(parent, at, yaw, pitch, len, width, color, opts = {}) {
  return aim(add(parent, leafGeo(len, width, { color, ...opts }), leafMat(), at), yaw, pitch, opts.roll ?? 0);
}

/** A smooth outline (radius, height pairs), resampled, for a lathe. */
function outline(pairs, n = 28) {
  const curve = new THREE.SplineCurve(pairs.map(([r, y]) => new THREE.Vector2(r, y)));
  return curve.getPoints(n).map((p) => new THREE.Vector2(Math.max(0.001, p.x), p.y));
}
/** The radius of an outline at a height. */
function radiusAt(pairs, h) {
  for (let i = 1; i < pairs.length; i++) {
    const [r0, y0] = pairs[i - 1], [r1, y1] = pairs[i];
    if (h <= y1) return r0 + (r1 - r0) * Math.max(0, Math.min(1, (h - y0) / (y1 - y0 || 1)));
  }
  return pairs.at(-1)[0];
}

/**
 * A basket-weave texture: strips of living fibre going over and under, each
 * strip shaded round (dark at its edges, light along its middle), dark gaps
 * between. Painted once per pair of colours, tiled over a shell.
 */
const weaves = new Map();
function weaveTexture(light, dark) {
  const key = `${light}|${dark}`;
  if (weaves.has(key)) return weaves.get(key);
  const N = 256, cells = 4, cell = N / cells, strips = 3, sw = cell / strips;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  g.fillStyle = '#3a2716';
  g.fillRect(0, 0, N, N);
  for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
    const across = (i + j) % 2 === 0;
    for (let k = 0; k < strips; k++) {
      const x = i * cell + (across ? 0 : k * sw), y = j * cell + (across ? k * sw : 0);
      const w = across ? cell : sw, h = across ? sw : cell;
      const grad = across ? g.createLinearGradient(0, y, 0, y + h) : g.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, dark);
      grad.addColorStop(0.45, light);
      grad.addColorStop(0.6, light);
      grad.addColorStop(1, dark);
      g.fillStyle = grad;
      // Each strip a little inset, so the gaps show; the ends darken where they dive under.
      g.fillRect(x + (across ? 1 : 1.5), y + (across ? 1.5 : 1), w - (across ? 2 : 3), h - (across ? 3 : 2));
      g.fillStyle = 'rgba(40, 24, 10, 0.28)';
      if (across) {
        g.fillRect(x, y, 6, h);
        g.fillRect(x + w - 6, y, 6, h);
      } else {
        g.fillRect(x, y, w, 6);
        g.fillRect(x, y + h - 6, w, 6);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  weaves.set(key, tex);
  return tex;
}
const weaveMats = new Map();
/** A woven material, the weave tiled `rx` times round and `ry` times up. */
function weaveMat(light, dark, rx, ry) {
  const key = `${light}|${dark}|${rx}|${ry}`;
  if (!weaveMats.has(key)) {
    const map = weaveTexture(light, dark).clone();
    map.needsUpdate = true;
    map.repeat.set(rx, ry);
    weaveMats.set(key, new THREE.MeshToonMaterial({ map, gradientMap: toonRamp() }));
  }
  return weaveMats.get(key);
}

/** A woven shell: a lathe of the outline with a basket weave, and rings of the accent colour round it. */
function wovenShell(parent, pairs, at, { light, dark, accent = null, rings = [], tile = 1.25 }) {
  const pts = outline(pairs, 32);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
  const maxR = Math.max(...pairs.map((p) => p[0]));
  const rx = Math.max(4, Math.round((TAU * maxR) / tile)), ry = Math.max(2, Math.round(len / tile));
  add(parent, new THREE.LatheGeometry(pts, 64), weaveMat(light, dark, rx, ry), at);
  for (const h of rings) add(parent, new THREE.TorusGeometry(radiusAt(pairs, h) + 0.03, 0.1, 6, 48), accent ? mat(accent) : bark(), [at[0], at[1] + h, at[2]], [Math.PI / 2, 0, 0]);
}

/** A round door with a thick frame of living wood (an oval, taller than wide), facing +Z. */
function roundDoor(parent, [x, y, z], w = 0.75, color = '#6b4a2e') {
  const frame = add(parent, new THREE.TorusGeometry(w, 0.14, 8, 24), bark(), [x, y, z]);
  frame.scale.set(1, 1.3, 1);
  const d = add(parent, cyl(w - 0.05, w - 0.05, 0.12, 24), mat(color, { rough: 0.8 }), [x, y, z - 0.03], [Math.PI / 2, 0, 0]);
  d.scale.set(1, 1, 1.3);
  add(parent, sphere(0.09, 8, 6), glowGold, [x + w * 0.45, y, z + 0.1]);
  // Planks on the door.
  for (const dx of [-0.25, 0.25]) add(parent, cyl(0.03, 0.03, w * 2.2, 4), bark(), [x + dx, y, z + 0.05]);
}
/** A porthole window on a curved wall at angle `a` (round Y), glowing warm at night. */
function porthole(parent, [x, y, z], a, r = 0.42) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = a;
  add(g, new THREE.TorusGeometry(r, 0.09, 6, 18), bark(), [0, 0, 0.04]);
  add(g, new THREE.CircleGeometry(r - 0.04, 18), windowMat, [0, 0, 0.02]);
  add(g, cyl(0.025, 0.025, r * 2, 4), bark(), [0, 0, 0.06]);
  parent.add(g);
}
/** A seed lantern hanging on a cord from a point. */
function seedLantern(parent, [x, y, z], drop = 0.9) {
  add(parent, cyl(0.02, 0.02, drop, 3), mat('#e2cc9c'), [x, y - drop / 2, z]);
  add(parent, sphere(0.2, 10, 8), lampMat, [x, y - drop - 0.2, z], [0, 0, 0], [1, 1.35, 1]);
  add(parent, cone(0.16, 0.22, 6), bark(), [x, y - drop + 0.02, z]);
  add(parent, sphere(0.05, 6, 4), bark(), [x, y - drop - 0.5, z]);
}
/** Glowing dots in a spiral up a shell. */
function glowSpiral(parent, pairs, origin, { turns = 1.6, count = 16, strands = 3, h0 = 0.5, h1 = 4.5, skip = null, mats = [glowMat, glowBlue, glowPink] } = {}) {
  for (let k = 0; k < strands; k++) for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const h = h0 + (h1 - h0) * t;
    const a = (k / strands) * TAU + t * turns * TAU * 0.5;
    if (skip?.(a, h)) continue;
    const r = radiusAt(pairs, h) * 1.03 + 0.04;
    add(parent, sphere(0.075 + (i % 3 === 0 ? 0.03 : 0), 6, 4), mats[k % mats.length], [origin[0] + Math.sin(a) * r, origin[1] + h, origin[2] + Math.cos(a) * r]);
  }
}

/* ---------------------------------------------------------------- the base */

/** The plinth, grown: a mossy disc of living wood, roots over the rim, log steps, glow-bulb lamps. */
export function rootPlinth(P, look) {
  const g = new THREE.Group();
  const R = PLINTH_R;
  const r = seeded(look.grass.length * 17 + look.leaf.charCodeAt(3));
  add(g, cyl(R, R + 0.3, PLINTH_H + 0.6, 30), barkLight(), [0, (PLINTH_H - 0.6) / 2, 0]);
  add(g, cyl(R - 0.12, R - 0.12, 0.08, 30), mat(look.grass, { rough: 1 }), [0, PLINTH_H + 0.0, 0]);
  add(g, cyl(R - 0.75, R - 0.75, 0.06, 30), mat('#e8d3a8', { rough: 0.95 }), [0, PLINTH_H + 0.05, 0]);
  // Roots spilling over the rim (not across the steps).
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * TAU + r() * 0.2 + 0.25;
    if (Math.cos(a) > 0.9) continue;
    const s = Math.sin(a), c = Math.cos(a);
    add(g, limb([[s * (R - 1.1), PLINTH_H + 0.04, c * (R - 1.1)], [s * (R - 0.1), PLINTH_H + 0.2, c * (R - 0.1)], [s * (R + 0.5), PLINTH_H - 0.4, c * (R + 0.5)], [s * (R + 0.7), -0.5, c * (R + 0.7)]], 0.3 + r() * 0.08, 0.1, { radial: 6, segs: 10 }), bark());
  }
  // Half-log steps down to the deck.
  for (let s = 0; s < 2; s++) add(g, cyl(0.24, 0.24, 2.5 - s * 0.3, 10), bark(), [0, PLINTH_H - 0.14 - s * 0.24, R + 0.18 + s * 0.44], [0, 0, Math.PI / 2]);
  // Glow-bulb lamps on curled stalks, where the lantern posts were.
  for (const sx of [-1.6, 1.6]) {
    const tip = [sx * 1.3, PLINTH_H + 2.05, R - 0.05];
    add(g, limb([[sx, PLINTH_H, R - 0.4], [sx * 1.04, PLINTH_H + 1.3, R - 0.45], [sx * 1.12, PLINTH_H + 2.05, R - 0.3], tip], 0.09, 0.04, { radial: 5, segs: 10 }), bark());
    add(g, sphere(0.22, 10, 8), glowGold, [tip[0], tip[1] - 0.3, tip[2]], [0, 0, 0], [1, 1.25, 1]);
    leaf(g, tip, sx > 0 ? 1.2 : -1.2, -0.2, 0.7, 0.35, look.leaf, { droop: 0.4 });
  }
  // Moss tufts, ferns and flowers at the rim.
  const fl = look.flowers.map((c) => mat(c));
  for (let i = 0; i < 20; i++) {
    const a = Math.PI * 0.2 + (i / 20) * Math.PI * 1.6 + (r() - 0.5) * 0.1;
    const rr = R - 0.45;
    add(g, ico(0.13 + r() * 0.08), r() > 0.45 ? mat(look.leaf) : fl[i % fl.length], [Math.sin(a) * rr, PLINTH_H + 0.15, Math.cos(a) * rr]);
  }
  return g;
}

/* ---------------------------------------------------------------- math: the seed pod */

/** A woven teardrop pod held by two living-wood ribs, a curling stem and a canopy of leaves. */
export function seedPod(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.05, z0 = -0.25;
  const prof = [[0.05, 0], [1.55, 0.12], [2.5, 0.8], [2.9, 1.9], [2.8, 3.1], [2.25, 4.2], [1.4, 5.0], [0.6, 5.5], [0.02, 5.65]];
  wovenShell(g, prof, [0, y0, z0], { light: '#f0d49c', dark: '#9c6d3c', accent: look.roof.math, rings: [1.75, 3.55] });
  add(g, new THREE.TorusGeometry(radiusAt(prof, 0.3) + 0.04, 0.16, 8, 32), bark(), [0, y0 + 0.3, z0], [Math.PI / 2, 0, 0]);
  // Two ribs hold the pod, meeting above it; a stem curls from the top.
  for (const s of [-1, 1]) add(g, limb([[s * 3.3, y0 - 0.3, z0 + 0.7], [s * 3.3, y0 + 1.8, z0 + 0.35], [s * 2.85, y0 + 3.9, z0], [s * 1.7, y0 + 5.6, z0 - 0.2], [0, y0 + 6.25, z0 - 0.3]], 0.36, 0.16, { segs: 22 }), bark());
  add(g, limb([[0, y0 + 5.5, z0], [0, y0 + 6.5, z0 - 0.3], [0.5, y0 + 7.4, z0 - 0.5], [1.25, y0 + 7.8, z0 - 0.2], [1.55, y0 + 7.35, z0 + 0.3]], 0.3, 0.05, { segs: 18 }), bark());
  // The canopy: big leaves drooping all round, the longest over the door.
  for (let i = 0; i < 6; i++) leaf(g, [0, y0 + 6.05, z0 - 0.2], (i / 6) * TAU, 0.3 + (i % 2) * 0.12, i === 0 ? 4.6 : 3.9, 1.75, look.leaf, { droop: 0.95 });
  leaf(g, [1.4, y0 + 7.5, z0], 0.6, -0.5, 1.8, 0.8, look.leaf, { droop: 0.2 });
  // Door, portholes, an upper window.
  roundDoor(g, [0, y0 + 1.15, z0 + radiusAt(prof, 1.15) + 0.06], 0.72);
  for (const a of [-1.0, 1.0]) {
    const h = 2.5, r = radiusAt(prof, h) + 0.04;
    porthole(g, [Math.sin(a) * r, y0 + h, z0 + Math.cos(a) * r], a);
  }
  porthole(g, [0, y0 + 3.85, z0 + radiusAt(prof, 3.85) + 0.03], 0, 0.34);
  // Glowing spirals; seed lanterns hanging from the ribs.
  glowSpiral(g, prof, [0, y0, z0], { skip: (a, h) => Math.cos(a) > 0.8 && h < 2.2 });
  for (const s of [-1, 1]) seedLantern(g, [s * 2.95, y0 + 3.7, z0 + 0.15], 0.8);
  return y0 + 8.0;
}

/* ---------------------------------------------------------------- history: the root hall */

/** A woven dome wrapped in arching roots that meet in a crown of great leaves; a root-arch door. */
export function rootHall(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.05, z0 = -0.35;
  const prof = [[3.7, 0], [3.8, 1.1], [3.55, 2.4], [2.9, 3.4], [1.85, 4.1], [0.65, 4.42], [0.02, 4.48]];
  wovenShell(g, prof, [0, y0, z0], { light: '#f6e4bc', dark: '#b58a55', accent: look.roof.history, rings: [0.55, 2.6] });
  // The porch: a woven tunnel with a dark doorway and a curtain in the floor's colour.
  add(g, new THREE.CylinderGeometry(1.3, 1.3, 1.6, 16, 1, false, -Math.PI / 2, Math.PI), mat('#d9b98a'), [0, y0, z0 + 3.95], [Math.PI / 2, 0, 0]);
  add(g, new THREE.CylinderGeometry(1.02, 1.02, 0.1, 16, 1, false, -Math.PI / 2, Math.PI), mat('#2b1d14'), [0, y0, z0 + 4.72], [Math.PI / 2, 0, 0]);
  for (const s of [-1, 1]) add(g, new THREE.CylinderGeometry(0.55, 0.55, 0.06, 10, 1, false, s > 0 ? 0 : -Math.PI / 2, Math.PI / 2), mat(look.banner), [s * 0.02, y0, z0 + 4.76], [Math.PI / 2, 0, 0]);
  // Roots arch up the dome and meet at the crown.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + 0.31;
    if (Math.cos(a) > 0.9) continue;
    const s = Math.sin(a), c = Math.cos(a);
    add(g, limb([[s * 4.5, y0 - 0.35, z0 + c * 4.5], [s * 4.15, y0 + 1.4, z0 + c * 4.15], [s * 3.55, y0 + 3.0, z0 + c * 3.55], [s * 2.25, y0 + 4.35, z0 + c * 2.25], [s * 0.55, y0 + 4.95, z0 + c * 0.55]], 0.38, 0.14, { segs: 18, radial: 7 }), bark());
  }
  // The doorway's arch: two roots curling up and over.
  for (const s of [-1, 1]) add(g, limb([[s * 1.95, y0 - 0.25, z0 + 4.95], [s * 1.6, y0 + 1.6, z0 + 4.75], [s * 1.05, y0 + 2.85, z0 + 4.5], [s * 0.2, y0 + 3.35, z0 + 4.25], [-s * 0.35, y0 + 3.7, z0 + 3.9]], 0.34, 0.12, { segs: 16 }), bark());
  // Crown: a knot, a thatch of great drooping leaves, and a tuft standing up.
  add(g, sphere(0.75, 12, 8), bark(), [0, y0 + 4.95, z0]);
  for (let i = 0; i < 12; i++) {
    const yaw = (i / 12) * TAU + 0.2;
    // Shorter over the doorway, so the root arch and the banners show.
    const front = Math.cos(yaw) > 0.7;
    leaf(g, [0, y0 + 5.0, z0], yaw, front ? 0.55 : 0.3 + (i % 2) * 0.1, front ? 3.2 : 5.4 - (i % 2) * 0.6, front ? 1.8 : 2.4, look.leaf, { droop: front ? 0.5 : 0.85, cup: 0.22 });
  }
  for (let i = 0; i < 3; i++) leaf(g, [0, y0 + 5.15, z0], i * 2.1, -0.85, 1.5, 0.6, look.leaf, { droop: -0.2 });
  // A glowing carved spiral above the door.
  const sp = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, ang = t * 4 * Math.PI, rr = 0.1 + t * 0.55;
    sp.push(new THREE.Vector3(Math.cos(ang) * rr, Math.sin(ang) * rr, 0));
  }
  const spiral = add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 80, 0.055, 5), glowBlue, [0, y0 + 3.05, z0 + radiusAt(prof, 3.05) + 0.08]);
  spiral.rotation.x = -0.45;
  // Woven banners between the front roots, round windows, lanterns.
  for (const a of [-0.78, 0.78]) {
    const r = radiusAt(prof, 2.2) + 0.08;
    const b = add(g, new THREE.BoxGeometry(0.85, 2.3, 0.06), mat(look.banner), [Math.sin(a) * r, y0 + 2.2, z0 + Math.cos(a) * r], [0, a, 0]);
    b.rotation.x = -0.12;
    add(g, sphere(0.12, 8, 6), glowGold, [Math.sin(a) * (r + 0.08), y0 + 2.7, z0 + Math.cos(a) * (r + 0.08)]);
  }
  for (const a of [-1.45, 1.45, -2.35, 2.35]) {
    const h = 1.7, r = radiusAt(prof, h) + 0.03;
    porthole(g, [Math.sin(a) * r, y0 + h, z0 + Math.cos(a) * r], a, 0.4);
  }
  glowSpiral(g, prof, [0, y0, z0], { strands: 5, count: 10, turns: 0.6, h0: 0.4, h1: 3.9, skip: (a, h) => Math.cos(a) > 0.55 });
  for (const a of [-1.9, 1.9]) seedLantern(g, [Math.sin(a) * 4.1, y0 + 2.9, z0 + Math.cos(a) * 4.1], 0.7);
  return y0 + 7.4;
}

/* ---------------------------------------------------------------- physics: the star seed observatory */

/** A small woven pod at the foot; three living strands braid up to a cup of petals holding a glowing lens, seeds orbiting it. */
export function starSpire(g, P, floor) {
  const look = floor.look;
  const y0 = PLINTH_H + 0.05, z0 = -0.4;
  const prof = [[0.05, 0], [1.65, 0.1], [2.3, 0.8], [2.4, 1.7], [2.05, 2.6], [1.35, 3.1], [0.3, 3.35]];
  wovenShell(g, prof, [0, y0, z0], { light: '#e6efd2', dark: '#8fa77e', accent: look.roof.physics, rings: [0.5, 2.2] });
  roundDoor(g, [0, y0 + 1.05, z0 + radiusAt(prof, 1.05) + 0.05], 0.66);
  for (const a of [-1.1, 1.1]) porthole(g, [Math.sin(a) * (radiusAt(prof, 1.9) + 0.03), y0 + 1.9, z0 + Math.cos(a) * (radiusAt(prof, 1.9) + 0.03)], a, 0.34);
  // The braided trunk.
  const top = y0 + 7.7;
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const ang = (k / 3) * TAU + t * TAU * 1.15;
      const rr = 1.35 - t * 0.75 + Math.sin(t * Math.PI) * 0.25;
      pts.push([Math.sin(ang) * rr, y0 + 2.4 + t * (top - y0 - 2.4), z0 + Math.cos(ang) * rr]);
    }
    add(g, limb(pts, 0.3, 0.19, { segs: 40, radial: 8 }), k === 1 ? mat('#b08657', { rough: 0.9 }) : barkLight());
    // Glow dots down one side of each strand.
    for (let i = 1; i < 10; i += 2) add(g, sphere(0.08, 6, 4), k === 0 ? glowMat : k === 1 ? glowBlue : glowPink, [pts[i][0] * 1.32, pts[i][1], z0 + (pts[i][2] - z0) * 1.32]);
  }
  // The cup of petals, in the floor's colour.
  for (let i = 0; i < 8; i++) leaf(g, [0, top - 0.1, z0], (i / 8) * TAU, -0.7, 3.0, 1.6, look.roof.physics, { droop: -0.6, cup: 0.4 });
  for (let i = 0; i < 7; i++) leaf(g, [0, top - 0.3, z0], (i / 7) * TAU + 0.45, 0.2, 2.2, 1.0, look.leaf, { droop: 0.8 });
  // The lens: a glowing orb with a warm core.
  const lens = new THREE.Group();
  lens.position.set(0, top + 1.15, z0);
  lens.userData.live = true;
  lens.add(new THREE.Mesh(new THREE.SphereGeometry(1.3, 28, 18), new THREE.MeshStandardMaterial({ color: '#c8fbff', emissive: '#3fd8ff', emissiveIntensity: 0.9, roughness: 0.15, transparent: true, opacity: 0.78 })));
  lens.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), glowGold));
  g.add(lens);
  // Seeds orbiting the lens, each on its own tilted ring (buildings.js turns the arms).
  const orrery = new THREE.Group();
  orrery.position.copy(lens.position);
  orrery.userData.live = true;
  [glowGold, glowPink, glowMat, glowBlue].forEach((m, j) => {
    const arm = new THREE.Group();
    arm.rotation.x = 0.35 + j * 0.42;
    arm.rotation.z = j * 0.5;
    arm.userData.speed = 0.5 + j * 0.3;
    const R = 1.9 + j * 0.34;
    arm.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 4, 48), mat('#f0e2b8')).rotateX(Math.PI / 2));
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), m);
    seed.position.set(R, 0, 0);
    arm.add(seed);
    orrery.add(arm);
  });
  g.add(orrery);
  g.userData.orrery = orrery;
  // A horn-shaped spyglass grown from the cup.
  add(g, limb([[0.4, top + 0.1, z0 + 0.4], [0.95, top + 0.75, z0 + 1.3], [1.25, top + 1.55, z0 + 2.0]], 0.16, 0.42, { segs: 12 }), barkLight());
  add(g, new THREE.TorusGeometry(0.42, 0.06, 6, 18), glowBlue, [1.25, top + 1.55, z0 + 2.0], [-0.9, 0, -0.35]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    seedLantern(g, [Math.sin(a) * 1.7, top - 0.2, z0 + Math.cos(a) * 1.7], 0.6 + (i % 2) * 0.4);
  }
  return top + 2.8;
}

/* ---------------------------------------------------------------- the smaller places */

/** A grown canopy over a small place (shop, arcade, museum, board): three roots arching to a knot, a roof of leaves. */
export function leafCanopy(look, r, seed = 1) {
  const g = new THREE.Group();
  const rnd = seeded(seed);
  const R = r + 0.45, H = 4.9 + r * 0.15;
  for (const a of [2.2, -2.2, Math.PI]) {
    const s = Math.sin(a), c = Math.cos(a);
    const pts = [[s * R, 0.1, c * R], [s * (R + 0.25), 1.8, c * (R + 0.25)], [s * R * 0.72, H - 1.0, c * R * 0.72], [s * 0.35, H - 0.1, c * 0.35]];
    add(g, limb(pts, 0.28, 0.12, { segs: 14, radial: 6 }), bark());
    for (let i = 0; i < 5; i++) {
      const t = 0.15 + i * 0.17;
      const p = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))).getPointAt(t);
      add(g, sphere(0.07, 6, 4), i % 2 ? glowMat : glowBlue, [p.x * 1.08, p.y, p.z * 1.08]);
    }
  }
  add(g, sphere(0.45, 10, 8), bark(), [0, H, 0]);
  const n = 7;
  for (let i = 0; i < n; i++) leaf(g, [0, H + 0.1, 0], (i / n) * TAU + rnd() * 0.3, 0.42 + rnd() * 0.15, 2.6 + r * 0.35, 1.35, look.leaf, { droop: 1.0 });
  leaf(g, [0, H + 0.2, 0], 0.4, -1.0, 1.4, 0.6, look.leaf, { droop: -0.2 });
  seedLantern(g, [0, H - 0.2, R * 0.55], 1.0);
  return batch(g);
}
