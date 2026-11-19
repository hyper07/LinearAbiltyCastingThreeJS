/**
 * Gear on the jointed figures: weapons, shields, hats and helmets,
 * pauldrons and capes, built from blocks (to sit with the voxel people) in
 * each item's own colour, with a glint for rare and better. rig.js hangs
 * them on the joints that gearLook() (items.js) names.
 *
 * Every builder returns a BufferGeometry with vertex colours and three groups:
 * group 0 the plain blocks, group 1 the blocks that glow on rare+ gear,
 * group 2 bare metal (blades, rims, bosses, rivets: a metal sheen). Blades
 * are bevelled (a ridge, lighter edges, a fuller, a tapering tip), shields
 * have rims and bosses, grips are wrapped.
 * Units: metres, in the joint's own frame — for a hand: the fist at the
 * origin, +Z the way the blade points; for the head: the neck at the origin,
 * the crown about 0.85 m up, the face toward +Z.
 */
import * as THREE from 'three';
import { mix } from '../pixel/art.js';

const cache = new Map();
const tmp = new THREE.Color();

/**
 * Blocks into one geometry: each [w, h, d, x, y, z, colour, kind?, rotX?, rotZ?, rotY?] —
 * kind: true (glints on rare+ gear), 'metal' (bare metal), or nothing (plain).
 */
function blocks(list) {
  const out = [{ pos: [], nor: [], col: [] }, { pos: [], nor: [], col: [] }, { pos: [], nor: [], col: [] }];
  for (const [w, h, d, x, y, z, hex, kind = false, rx = 0, rz = 0, ry = 0] of list) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    if (rx) g.rotateX(rx);
    if (rz) g.rotateZ(rz);
    if (ry) g.rotateY(ry);
    g.translate(x, y, z);
    const o = out[kind === true ? 1 : kind === 'metal' ? 2 : 0];
    tmp.set(hex);
    o.pos.push(...g.attributes.position.array);
    o.nor.push(...g.attributes.normal.array);
    // A touch of shading: faces looking down are darker, up lighter (the blocks read as solid).
    const n = g.attributes.normal.array;
    for (let i = 0; i < g.attributes.position.count; i++) {
      const k = 1 + n[i * 3 + 1] * 0.12 - Math.max(0, -n[i * 3 + 2]) * 0.06;
      o.col.push(tmp.r * k, tmp.g * k, tmp.b * k);
    }
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out.flatMap((o) => o.pos), 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(out.flatMap((o) => o.nor), 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(out.flatMap((o) => o.col), 3));
  let at = 0;
  out.forEach((o, i) => {
    geo.addGroup(at, o.pos.length / 3, i);
    at += o.pos.length / 3;
  });
  geo.computeBoundingSphere();
  return geo;
}

/** A bevelled blade along +Z from z0: a ridge, lighter bevelled edges, a fuller, a tip tapering in steps. */
function blade(list, { len, width, thick, z0, color, edge, g, fuller = true, tip = 3 }) {
  const body = len * (1 - 0.06 * tip);
  list.push([width * 0.56, thick, body, 0, 0, z0 + body / 2, color, 'metal']);
  for (const s of [1, -1]) list.push([width * 0.24, thick * 0.55, body - 0.02, s * width * 0.38, 0, z0 + body / 2 - 0.01, edge, g || 'metal']);
  if (fuller) list.push([width * 0.14, thick * 1.08, body * 0.62, 0, 0, z0 + body * 0.36, dark(color, 0.35), 'metal']);
  for (let k = 0; k < tip; k++) {
    const w = width * (0.86 - (k + 1) * (0.7 / tip));
    const l = len * 0.06;
    list.push([Math.max(0.012, w), thick * (1 - k * 0.15), l + 0.004, 0, 0, z0 + body + l * (k + 0.5), k === tip - 1 ? light(edge, 0.3) : color, 'metal']);
  }
}

/** A wrapped grip from z0 to z1 (alternating bands), with a pommel at the end. */
function grip(list, z0, z1, { w = 0.05, pommel = GOLD, wrap = GRIP, g = false } = {}) {
  const n = Math.max(2, Math.round((z1 - z0) / 0.045));
  for (let i = 0; i < n; i++) {
    const z = z0 + ((z1 - z0) * (i + 0.5)) / n;
    list.push([i % 2 ? w : w * 1.15, i % 2 ? w : w * 1.15, (z1 - z0) / n + 0.002, 0, 0, z, i % 2 ? dark(wrap, 0.25) : wrap]);
  }
  list.push([w * 1.7, w * 1.7, 0.06, 0, 0, z0 - 0.03, pommel, g || 'metal'], [w * 1.1, w * 1.1, w * 1.1, 0, 0, z0 - 0.075, light(pommel, 0.2), g || 'metal', 0.785, 0.785]);
}

/** A crossguard at z: a bar, its ends turned up, a gem in the middle. */
function guard(list, z, span, { color = GOLD, gem = null, g = false } = {}) {
  list.push([span, 0.06, 0.06, 0, 0, z, color, g || 'metal']);
  for (const s of [1, -1]) list.push([0.05, 0.08, 0.07, s * span * 0.5, 0, z + 0.025, light(color, 0.15), g || 'metal', 0, s * 0.4]);
  list.push([0.07, 0.08, 0.08, 0, 0, z, light(color, 0.1), 'metal']);
  if (gem) list.push([0.045, 0.09, 0.045, 0, 0, z + 0.005, gem, true, 0, 0.785]);
}

const cached = (key, make) => {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
};

const WOOD = '#6a4428';
const GRIP = '#4a2c1c';
const GOLD = '#d8a83a';
const STEEL = '#c8d4dc';
const light = (c, k = 0.35) => mix(c, '#ffffff', k);
const dark = (c, k = 0.35) => mix(c, '#140c18', k);

/* ------------------------------------------------------------ weapons */

/** A weapon in the fist: { shape, color, glow }. +Z is where it points. */
export function weaponGeometry({ shape, color = STEEL, glow = null }) {
  const g = Boolean(glow);
  const edge = glow ? light(glow, 0.3) : light(color, 0.45);
  const gem = glow ? light(glow, 0.15) : null;
  return cached(`w|${shape}|${color}|${g}`, () => {
    const list = [];
    switch (shape) {
      case 'longsword':
        blade(list, { len: 1.16, width: 0.1, thick: 0.035, z0: 0.15, color, edge, g });
        guard(list, 0.12, 0.42, { gem, g });
        grip(list, -0.26, 0.09, { g });
        return blocks(list);
      case 'dagger':
        blade(list, { len: 0.42, width: 0.06, thick: 0.026, z0: 0.1, color, edge, g, fuller: false, tip: 2 });
        guard(list, 0.07, 0.17, { gem, g });
        grip(list, -0.06, 0.05, { w: 0.045, g });
        return blocks(list);
      case 'axe':
        list.push([0.055, 0.055, 0.96, 0, 0, 0.32, WOOD], [0.065, 0.065, 0.05, 0, 0, 0.62, dark(WOOD, 0.3)], [0.065, 0.065, 0.05, 0, 0, 0.78, dark(WOOD, 0.3)]);
        // The bit: a curved head in steps, thick at the haft, a bevelled bright edge, a spike behind.
        for (let k = 0; k < 5; k++) {
          const y = 0.05 + k * 0.065;
          const d = 0.16 + Math.sin((k / 4) * Math.PI) * 0.1;
          list.push([0.05 - k * 0.004, 0.07, d, 0, y, 0.7, k === 4 ? light(color, 0.15) : color, 'metal']);
        }
        list.push([0.028, 0.08, 0.3, 0, 0.36, 0.7, edge, g || 'metal'], [0.03, 0.34, 0.03, 0, 0.2, 0.83, edge, g || 'metal'], [0.03, 0.34, 0.03, 0, 0.2, 0.57, edge, g || 'metal']);
        list.push([0.045, 0.14, 0.07, 0, -0.08, 0.7, color, 'metal'], [0.03, 0.06, 0.05, 0, -0.17, 0.7, edge, 'metal'], [0.075, 0.075, 0.07, 0, 0, 0.7, dark(color, 0.2), 'metal']);
        grip(list, -0.18, -0.06, { w: 0.058, pommel: dark(color, 0.1) });
        return blocks(list);
      case 'mace':
        list.push([0.05, 0.05, 0.66, 0, 0, 0.22, WOOD]);
        list.push([0.2, 0.2, 0.22, 0, 0, 0.62, color, 'metal'], [0.16, 0.16, 0.06, 0, 0, 0.76, light(color, 0.1), 'metal']);
        // Six flanges round the head.
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          list.push([0.04, 0.09, 0.2, Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.62, i % 2 ? edge : light(color, 0.25), g || 'metal', 0, a]);
        }
        list.push([0.06, 0.06, 0.08, 0, 0, 0.8, edge, g || 'metal']);
        grip(list, -0.14, 0.06, { g });
        return blocks(list);
      case 'hammer':
        list.push([0.055, 0.055, 0.86, 0, 0, 0.3, WOOD], [0.07, 0.07, 0.04, 0, 0, 0.55, GOLD, 'metal']);
        list.push([0.2, 0.4, 0.22, 0, 0, 0.78, color, 'metal'], [0.22, 0.06, 0.24, 0, 0.23, 0.78, edge, g || 'metal'], [0.22, 0.06, 0.24, 0, -0.23, 0.78, dark(color, 0.2), 'metal']);
        list.push([0.23, 0.04, 0.23, 0, 0.1, 0.78, GOLD, g || 'metal'], [0.23, 0.04, 0.23, 0, -0.1, 0.78, GOLD, g || 'metal']);
        for (const sx of [1, -1]) for (const sy of [1, -1]) list.push([0.03, 0.03, 0.03, sx * 0.11, sy * 0.15, 0.89, light(color, 0.3), 'metal']);
        grip(list, -0.18, 0.04, { g });
        return blocks(list);
      case 'spear':
        list.push([0.05, 0.05, 2.0, 0, 0, 0.3, WOOD], [0.06, 0.06, 0.05, 0, 0, 0.0, dark(WOOD, 0.3)], [0.06, 0.06, 0.05, 0, 0, 0.12, dark(WOOD, 0.3)]);
        // A leaf blade.
        for (let k = 0; k < 6; k++) {
          const w = 0.06 + Math.sin(((k + 0.5) / 6) * Math.PI) * 0.07;
          list.push([w, 0.035, 0.065, 0, 0, 1.33 + k * 0.06, color, 'metal']);
        }
        list.push([0.025, 0.045, 0.34, 0, 0, 1.46, edge, g || 'metal'], [0.03, 0.03, 0.05, 0, 0, 1.69, light(edge, 0.3), 'metal']);
        list.push([0.08, 0.08, 0.08, 0, 0, 1.27, GOLD, g || 'metal'], [0.04, 0.12, 0.03, 0, -0.08, 1.24, '#c03a2a'], [0.06, 0.06, 0.06, 0, 0, -0.7, GOLD, 'metal']);
        return blocks(list);
      case 'staff': {
        const crystal = glow ? light(glow, 0.2) : '#9ad8ff';
        list.push([0.06, 0.06, 1.7, 0, 0, 0.36, color], [0.075, 0.075, 0.04, 0, 0, 0.0, GOLD, 'metal'], [0.075, 0.075, 0.04, 0, 0, 0.5, GOLD, 'metal']);
        list.push([0.08, 0.08, 0.06, 0, 0, 1.1, GOLD, 'metal'], [0.1, 0.1, 0.06, 0, 0, 1.2, GOLD, 'metal']);
        // A cage of four prongs round a crystal, a smaller one floating above.
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          list.push([0.035, 0.035, 0.24, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 1.33, GOLD, 'metal', 0, 0], [0.03, 0.03, 0.05, Math.cos(a) * 0.075, Math.sin(a) * 0.075, 1.46, light(GOLD, 0.2), 'metal']);
        }
        list.push([0.14, 0.14, 0.2, 0, 0, 1.34, crystal, true, 0, 0.785], [0.09, 0.09, 0.09, 0, 0, 1.53, glow ? light(glow, 0.5) : '#e0f8ff', true, 0.6, 0.785]);
        return blocks(list);
      }
      case 'bow': {
        // A recurve bow along Y (held upright), bowed toward +Z, tips curling back, the string behind.
        for (let i = -5; i <= 5; i++) {
          const y = i * 0.105;
          const t = i / 5.6;
          const z = 0.17 * Math.cos(t * (Math.PI / 2)) - 0.02 - (Math.abs(i) === 5 ? -0.05 : 0);
          list.push([0.05, 0.12, 0.05, 0, y, z, Math.abs(i) <= 1 ? GRIP : i % 2 ? color : dark(color, 0.15), Math.abs(i) === 5 && g, -t * 0.9]);
        }
        list.push([0.06, 0.05, 0.06, 0, 0.12, 0.16, GOLD, g || 'metal'], [0.06, 0.05, 0.06, 0, -0.12, 0.16, GOLD, g || 'metal']);
        list.push([0.012, 1.12, 0.012, 0, 0, -0.03, '#e8e0d0']);
        return blocks(list);
      }
      case 'arrow':
        return blocks([[0.02, 0.02, 0.8, 0, 0, 0, '#c8a070'], [0.05, 0.02, 0.1, 0, 0, 0.42, STEEL, 'metal'], [0.03, 0.03, 0.05, 0, 0, 0.48, light(STEEL, 0.3), 'metal'], [0.06, 0.005, 0.12, 0, 0, -0.36, '#e0e0e0'], [0.005, 0.06, 0.12, 0, 0, -0.36, '#d06a4a']]);
      default: // the short sword
        blade(list, { len: 0.8, width: 0.075, thick: 0.03, z0: 0.09, color, edge, g });
        guard(list, 0.06, 0.28, { gem, g });
        grip(list, -0.16, 0.035, { g });
        return blocks(list);
    }
  });
}

/* ---------------------------------------------------------- hands, feet */

/** A fist round a grip (or empty): a palm, four knuckled fingers across the front, a thumb on top. `hex` skin or glove. */
export function handGeometry(hex, size = 1) {
  return cached(`hand|${hex}|${size}`, () => {
    const k = size;
    const list = [[0.17 * k, 0.15 * k, 0.15 * k, 0, 0, -0.01 * k, hex]];
    for (let i = 0; i < 4; i++) list.push([0.17 * k, 0.03 * k, 0.04 * k, 0, (0.045 - i * 0.032) * k, 0.075 * k, i % 2 ? dark(hex, 0.12) : hex]);
    list.push([0.07 * k, 0.05 * k, 0.09 * k, 0, 0.085 * k, 0.03 * k, light(hex, 0.08)]);
    return blocks(list);
  });
}

/** A shoe: a sole, the upper and a toe cap, its heel at the origin's back, pointing +Z. */
export function footGeometry(hex, size = 1) {
  return cached(`foot|${hex}|${size}`, () => {
    const k = size;
    return blocks([
      [0.2 * k, 0.03 * k, 0.27 * k, 0, 0.015 * k, 0.07 * k, dark(hex, 0.45)],
      [0.18 * k, 0.08 * k, 0.24 * k, 0, 0.07 * k, 0.06 * k, hex],
      [0.16 * k, 0.05 * k, 0.07 * k, 0, 0.07 * k, 0.19 * k, light(hex, 0.12)]
    ]);
  });
}

/* ---------------------------------------------------------- off hands */

/** A shield, tome or quiver: { kind, shape, color, glow }. Shields face +X (out from the left arm). */
export function offhandGeometry({ shape, color = '#6a4a2a', glow = null }) {
  const g = Boolean(glow);
  const rim = glow ? light(glow, 0.1) : '#aab4bc';
  return cached(`o|${shape}|${color}|${g}`, () => {
    // Shields face +X; y up, z forward. A rim of metal studs, a domed boss, rivets.
    const ring = (list, r, n, size, x, cy = 0, cz = 0, col = rim, kind = g || 'metal') => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        list.push([size, size, size, x, cy + Math.sin(a) * r, cz + Math.cos(a) * r, col, kind]);
      }
    };
    if (shape === 'buckler') {
      const list = [];
      for (let i = 0; i < 8; i++) list.push([0.05, 0.5, 0.2, 0, 0, 0, i % 2 ? dark(color, 0.1) : color, false, (i / 8) * Math.PI]);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        list.push([0.07, 0.11, 0.06, 0.005, Math.sin(a) * 0.25, Math.cos(a) * 0.25, rim, g || 'metal', -a]);
      }
      list.push([0.08, 0.17, 0.17, 0.04, 0, 0, GOLD, g || 'metal', 0.785], [0.06, 0.1, 0.1, 0.09, 0, 0, light(GOLD, 0.25), g || 'metal', 0.785]);
      ring(list, 0.16, 6, 0.035, 0.035, 0, 0, light(rim, 0.2));
      return blocks(list);
    }
    if (shape === 'kite') {
      const list = [
        [0.05, 0.14, 0.58, 0, 0.3, 0, color], [0.05, 0.3, 0.56, 0, 0.08, 0, color], [0.05, 0.14, 0.42, 0, -0.14, 0, color], [0.05, 0.12, 0.26, 0, -0.27, 0, color], [0.05, 0.1, 0.1, 0, -0.37, 0, color],
        [0.06, 0.06, 0.62, 0.005, 0.38, 0, rim, g || 'metal'],
        [0.07, 0.62, 0.06, 0.012, 0.02, 0, light(color, 0.25)], [0.07, 0.06, 0.4, 0.012, 0.18, 0, light(color, 0.25)]
      ];
      // The rim down both sides to the point.
      for (const s of [1, -1]) for (const [y, z] of [[0.3, 0.29], [0.18, 0.285], [0.06, 0.27], [-0.08, 0.22], [-0.2, 0.15], [-0.3, 0.09], [-0.38, 0.04]]) list.push([0.06, 0.13, 0.04, 0.005, y, s * z, rim, g || 'metal', -s * 0.25]);
      list.push([0.09, 0.14, 0.14, 0.035, 0.12, 0, GOLD, g || 'metal', 0.785], [0.06, 0.07, 0.07, 0.075, 0.12, 0, light(GOLD, 0.3), g || 'metal']);
      for (const [y, z] of [[0.3, 0.2], [0.3, -0.2], [-0.1, 0.15], [-0.1, -0.15]]) list.push([0.03, 0.03, 0.03, 0.035, y, z, light(rim, 0.25), 'metal']);
      return blocks(list);
    }
    if (shape === 'tower') {
      const list = [
        [0.06, 0.82, 0.6, 0, 0.06, 0, color], [0.065, 0.06, 0.6, 0.004, 0.25, 0, dark(color, 0.2)], [0.065, 0.06, 0.6, 0.004, -0.13, 0, dark(color, 0.2)],
        [0.08, 0.06, 0.64, 0.01, 0.48, 0, rim, g || 'metal'], [0.08, 0.06, 0.64, 0.01, -0.36, 0, rim, g || 'metal'], [0.08, 0.86, 0.05, 0.01, 0.06, 0.3, rim, 'metal'], [0.08, 0.86, 0.05, 0.01, 0.06, -0.3, rim, 'metal'],
        [0.1, 0.18, 0.18, 0.04, 0.08, 0, GOLD, g || 'metal', 0.785], [0.07, 0.09, 0.09, 0.085, 0.08, 0, light(GOLD, 0.3), g || 'metal']
      ];
      for (const y of [0.44, 0.25, -0.13, -0.32]) for (const z of [-0.22, -0.08, 0.08, 0.22]) list.push([0.03, 0.03, 0.03, 0.04, y, z, light(rim, 0.25), 'metal']);
      return blocks(list);
    }
    if (shape === 'tome') return blocks([[0.1, 0.3, 0.24, 0, 0, 0, color], [0.08, 0.28, 0.02, 0.01, 0, 0.12, '#f0e8d0'], [0.11, 0.08, 0.08, 0, 0.02, 0, GOLD, g]]);
    // The quiver, on the back: arrows sticking out of the top.
    return blocks([[0.16, 0.5, 0.16, 0, 0, 0, color], [0.17, 0.05, 0.17, 0, 0.18, 0, GOLD, g], [0.03, 0.18, 0.03, 0.04, 0.32, 0.03, '#e8e0d0'], [0.03, 0.2, 0.03, -0.04, 0.33, -0.02, '#e8e0d0'], [0.03, 0.16, 0.03, 0, 0.31, -0.05, '#d06a4a']]);
  });
}

/* --------------------------------------------------------------- heads */

/** A hat or helmet on the head joint: { shape, color, glow }. */
export function headGeometry({ shape, color = '#5a5a6a', glow = null }) {
  const g = Boolean(glow);
  const trim = glow ? light(glow, 0.2) : GOLD;
  return cached(`h|${shape}|${color}|${g}`, () => {
    switch (shape) {
      case 'wizard': {
        const list = [[1.36, 0.06, 1.0, 0, 0.8, 0.02, color], [1.0, 0.1, 0.78, 0, 0.86, 0, trim, g]];
        const tiers = [[0.84, 0.16, 0.66, 0.94, 0], [0.64, 0.16, 0.5, 1.08, -0.05], [0.46, 0.14, 0.36, 1.21, -0.12], [0.3, 0.12, 0.24, 1.32, -0.21], [0.16, 0.1, 0.14, 1.41, -0.32]];
        for (const [w, h, d, y, z] of tiers) list.push([w, h, d, 0, y, z, color]);
        list.push([0.1, 0.1, 0.04, 0.2, 1.06, 0.3, trim, true]);
        return blocks(list);
      }
      case 'cap':
        return blocks([[0.98, 0.22, 0.7, 0, 0.88, -0.02, color], [1.08, 0.05, 0.86, 0, 0.78, 0.06, dark(color, 0.2)], [1.0, 0.06, 0.72, 0, 0.79, -0.02, trim, g],
          [0.04, 0.42, 0.06, 0.42, 1.08, -0.12, glow ?? '#e05040', g, -0.5, -0.3], [0.04, 0.3, 0.05, 0.47, 1.34, -0.3, light(glow ?? '#e05040', 0.3), g, -0.9, -0.3]]);
      case 'hood': {
        // A cowl rounded in steps round the head: sides and back curving in toward a peak, the face open,
        // a dark inner lining at the opening, a hem at the shoulders.
        const list = [];
        const inner = dark(color, 0.45);
        for (let k = 0; k < 7; k++) {
          const y = 0.12 + k * 0.13;
          const t = k / 6;
          const w = 0.6 - Math.max(0, t - 0.45) * 0.55;
          const d = 0.44 - Math.max(0, t - 0.5) * 0.35;
          const c = k % 2 ? color : dark(color, 0.08);
          list.push([0.09, 0.14, d * 2 - 0.06, w, y, -0.03, c], [0.09, 0.14, d * 2 - 0.06, -w, y, -0.03, c], [w * 2 + 0.09, 0.14, 0.09, 0, y, -d, c]);
          // The lining just inside the opening.
          list.push([0.03, 0.14, 0.08, w - 0.06, y, d - 0.08, inner], [0.03, 0.14, 0.08, -(w - 0.06), y, d - 0.08, inner]);
        }
        list.push([0.84, 0.1, 0.62, 0, 1.0, -0.04, color], [0.6, 0.08, 0.44, 0, 1.07, -0.08, light(color, 0.06)], [0.3, 0.12, 0.2, 0, 1.06, -0.36, color], [0.16, 0.12, 0.14, 0, 0.98, -0.5, dark(color, 0.1)]);
        list.push([1.1, 0.08, 0.06, 0, 0.94, 0.38, dark(color, 0.25)], [1.24, 0.08, 0.96, 0, 0.08, -0.03, dark(color, 0.15)], [1.2, 0.05, 0.06, 0, 0.12, 0.45, trim, g]);
        return blocks(list);
      }
      case 'circlet':
        return blocks([[1.04, 0.07, 0.05, 0, 0.6, 0.36, trim, g || 'metal'], [1.04, 0.07, 0.05, 0, 0.6, -0.36, trim, g || 'metal'], [0.05, 0.07, 0.76, 0.53, 0.6, 0, trim, g || 'metal'], [0.05, 0.07, 0.76, -0.53, 0.6, 0, trim, g || 'metal'],
          [0.14, 0.14, 0.06, 0, 0.66, 0.39, glow ?? '#7ad8ff', true, 0, 0.785], [0.06, 0.1, 0.05, 0.16, 0.66, 0.38, trim, g || 'metal'], [0.06, 0.1, 0.05, -0.16, 0.66, 0.38, trim, g || 'metal']]);
      case 'full': {
        // A great helm, rounded in steps: a deep bowl, a narrower crown, a domed top and a ridge
        // front to back; a visor slit, a nose guard, breathing holes on the cheeks, a rim with rivets, a plume.
        const hole = '#140c18';
        const list = [
          [1.04, 0.5, 0.82, 0, 0.36, 0, color, 'metal'],
          [0.98, 0.24, 0.78, 0, 0.73, 0, color, 'metal'],
          [0.86, 0.13, 0.68, 0, 0.91, 0, light(color, 0.06), 'metal'],
          [0.62, 0.08, 0.5, 0, 1.01, 0, light(color, 0.12), 'metal'],
          [0.12, 0.62, 0.9, 0, 0.66, 0, light(color, 0.22), g || 'metal'],
          [0.84, 0.07, 0.04, 0, 0.56, 0.42, hole],
          [0.09, 0.36, 0.05, 0, 0.4, 0.43, light(color, 0.18), 'metal'],
          [1.07, 0.06, 0.85, 0, 0.13, 0, trim, g || 'metal']
        ];
        for (const s of [1, -1]) {
          for (let k = 0; k < 3; k++) list.push([0.05, 0.05, 0.03, s * (0.2 + 0.08 * k), 0.32 - (k % 2) * 0.07, 0.42, hole]);
          list.push([0.06, 0.06, 0.03, s * 0.44, 0.13, 0.42, trim, g || 'metal'], [0.06, 0.06, 0.03, s * 0.52, 0.13, 0.1, trim, g || 'metal']);
        }
        const plume = glow ? light(glow, 0.1) : '#c03a2a';
        list.push([0.1, 0.24, 0.6, 0, 1.15, -0.06, plume, g], [0.1, 0.2, 0.34, 0, 1.08, -0.42, plume, g], [0.08, 0.14, 0.2, 0, 0.98, -0.58, dark(plume, 0.15), g]);
        return blocks(list);
      }
      case 'horned':
      case 'open':
      default: {
        const list = [[1.08, 0.38, 0.82, 0, 0.72, 0, color, 'metal'], [0.84, 0.12, 0.64, 0, 0.96, 0, color, 'metal'], [0.5, 0.06, 0.4, 0, 1.04, 0, light(color, 0.2), 'metal'],
          [1.12, 0.08, 0.86, 0, 0.52, 0, trim, g || 'metal'], [0.08, 0.32, 0.05, 0, 0.42, 0.43, light(color, 0.15), 'metal'], [0.1, 0.32, 0.64, 0.55, 0.38, -0.04, color, 'metal'], [0.1, 0.32, 0.64, -0.55, 0.38, -0.04, color, 'metal'],
          [0.08, 0.5, 0.08, 0, 0.86, 0.36, light(color, 0.25), 'metal']];
        for (const sx of [1, -1]) for (const z of [0.3, 0, -0.3]) list.push([0.04, 0.04, 0.04, sx * 0.56, 0.52, z, light(trim, 0.2), 'metal']);
        if (shape === 'horned') {
          for (const s of [1, -1]) list.push([0.14, 0.12, 0.14, s * 0.62, 0.78, 0, '#e8dcc0'], [0.12, 0.14, 0.12, s * 0.74, 0.88, 0, '#e8dcc0'], [0.1, 0.16, 0.1, s * 0.82, 1.02, 0, '#f4ecd8', g], [0.07, 0.12, 0.07, s * 0.84, 1.16, 0, '#fffaf0', g]);
        }
        return blocks(list);
      }
    }
  });
}

/* ------------------------------------------------------------ armour */

/** A pauldron on a shoulder (heavy armour): `side` 1 for the left (+X), −1 for the right. */
export function pauldronGeometry({ color, glow = null }, side = 1) {
  const g = Boolean(glow);
  return cached(`p|${color}|${g}|${side}`, () => blocks([
    [0.36, 0.12, 0.48, side * 0.04, 0.03, 0, color, 'metal'], [0.3, 0.1, 0.42, side * 0.07, -0.06, 0, dark(color, 0.12), 'metal', 0, side * -0.25],
    [0.26, 0.09, 0.38, side * 0.06, 0.11, 0, light(color, 0.18), 'metal'], [0.38, 0.035, 0.5, side * 0.04, -0.03, 0, glow ? light(glow, 0.1) : GOLD, g || 'metal'],
    [0.04, 0.04, 0.04, side * 0.2, 0.08, 0.17, light(GOLD, 0.2), 'metal'], [0.04, 0.04, 0.04, side * 0.2, 0.08, -0.17, light(GOLD, 0.2), 'metal']
  ]));
}

/** One strip of a cape (the rig chains three, each swinging a little more): folds in two shades, a hem on the last. */
export function capeGeometry({ color, hem = null }, row = 0) {
  return cached(`c|${color}|${hem}|${row}`, () => {
    const w = 0.8 - row * 0.04;
    const n = 7;
    const list = [];
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + (w / n) * (i + 0.5);
      const fold = i % 2 ? dark(color, 0.16) : color;
      list.push([w / n + 0.002, 0.24, 0.045, x, -0.12, (i % 2 ? -0.012 : 0.006) - row * 0.004, row === 2 ? dark(fold, 0.1) : fold]);
    }
    list.push([w, 0.24, 0.01, 0, -0.12, 0.03, dark(color, 0.45)]);
    if (row === 2) list.push([w + 0.01, 0.05, 0.055, 0, -0.22, 0, hem ?? light(color, 0.25), Boolean(hem)]);
    if (row === 0) list.push([w + 0.04, 0.06, 0.07, 0, -0.01, 0, hem ?? dark(color, 0.25), Boolean(hem)]);
    return blocks(list);
  });
}

/** Free every cached gear geometry (when the game closes). */
export function disposeGear() {
  for (const g of cache.values()) g.dispose();
  cache.clear();
}
