/**
 * Gear on the jointed figures: weapons, shields, hats and helmets,
 * pauldrons and capes, built from blocks (to sit with the voxel people) in
 * each item's own colour, with a glint for rare and better. rig.js hangs
 * them on the joints that gearLook() (items.js) names.
 *
 * Every builder returns a BufferGeometry with vertex colours and two groups:
 * group 0 the plain blocks, group 1 the blocks that glow on rare+ gear.
 * Units: metres, in the joint's own frame — for a hand: the fist at the
 * origin, +Z the way the blade points; for the head: the neck at the origin,
 * the crown about 0.85 m up, the face toward +Z.
 */
import * as THREE from 'three';
import { mix } from '../pixel/art.js';

const cache = new Map();
const tmp = new THREE.Color();

/**
 * Blocks into one geometry: each [w, h, d, x, y, z, colour, glint?, rotX?, rotZ?].
 * Glint blocks are in group 1.
 */
function blocks(list) {
  const plain = { pos: [], nor: [], col: [] };
  const glint = { pos: [], nor: [], col: [] };
  for (const [w, h, d, x, y, z, hex, shine = false, rx = 0, rz = 0] of list) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    if (rx) g.rotateX(rx);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z);
    const out = shine ? glint : plain;
    tmp.set(hex);
    out.pos.push(...g.attributes.position.array);
    out.nor.push(...g.attributes.normal.array);
    // A touch of shading: faces looking down are darker, up lighter (the blocks read as solid).
    const n = g.attributes.normal.array;
    for (let i = 0; i < g.attributes.position.count; i++) {
      const k = 1 + n[i * 3 + 1] * 0.12 - Math.max(0, -n[i * 3 + 2]) * 0.06;
      out.col.push(tmp.r * k, tmp.g * k, tmp.b * k);
    }
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([...plain.pos, ...glint.pos], 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute([...plain.nor, ...glint.nor], 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute([...plain.col, ...glint.col], 3));
  geo.addGroup(0, plain.pos.length / 3, 0);
  geo.addGroup(plain.pos.length / 3, glint.pos.length / 3, 1);
  geo.computeBoundingSphere();
  return geo;
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
  return cached(`w|${shape}|${color}|${g}`, () => {
    switch (shape) {
      case 'longsword':
        return blocks([
          [0.09, 0.035, 1.12, 0, 0, 0.7, color], [0.025, 0.04, 1.04, 0, 0, 0.72, edge, g], [0.07, 0.04, 0.1, 0, 0, 1.3, color],
          [0.4, 0.07, 0.07, 0, 0, 0.12, GOLD, g], [0.05, 0.05, 0.36, 0, 0, -0.08, GRIP], [0.09, 0.09, 0.07, 0, 0, -0.3, GOLD, g]
        ]);
      case 'dagger':
        return blocks([[0.05, 0.025, 0.42, 0, 0, 0.3, color], [0.018, 0.03, 0.38, 0, 0, 0.31, edge, g], [0.16, 0.05, 0.05, 0, 0, 0.07, GOLD], [0.045, 0.045, 0.14, 0, 0, -0.03, GRIP]]);
      case 'axe':
        return blocks([
          [0.055, 0.055, 0.96, 0, 0, 0.32, WOOD], [0.05, 0.34, 0.2, 0, 0.13, 0.7, color], [0.05, 0.08, 0.26, 0, 0.3, 0.7, edge, g], [0.05, 0.12, 0.08, 0, -0.06, 0.7, color],
          [0.07, 0.07, 0.06, 0, 0, -0.14, GRIP]
        ]);
      case 'mace':
        return blocks([
          [0.05, 0.05, 0.66, 0, 0, 0.22, WOOD], [0.22, 0.22, 0.22, 0, 0, 0.62, color], [0.08, 0.08, 0.08, 0.15, 0, 0.62, edge, g], [0.08, 0.08, 0.08, -0.15, 0, 0.62, edge, g],
          [0.08, 0.08, 0.08, 0, 0.15, 0.62, edge, g], [0.08, 0.08, 0.08, 0, -0.15, 0.62, edge, g], [0.08, 0.08, 0.08, 0, 0, 0.77, edge, g], [0.07, 0.07, 0.06, 0, 0, -0.12, GOLD]
        ]);
      case 'hammer':
        return blocks([
          [0.055, 0.055, 0.86, 0, 0, 0.3, WOOD], [0.2, 0.44, 0.22, 0, 0, 0.78, color], [0.22, 0.1, 0.24, 0, 0.22, 0.78, edge, g], [0.22, 0.1, 0.24, 0, -0.22, 0.78, dark(color, 0.2)],
          [0.08, 0.08, 0.06, 0, 0, -0.14, GOLD, g]
        ]);
      case 'spear':
        return blocks([
          [0.05, 0.05, 2.0, 0, 0, 0.3, WOOD], [0.11, 0.035, 0.32, 0, 0, 1.44, color], [0.03, 0.04, 0.3, 0, 0, 1.45, edge, g], [0.07, 0.07, 0.08, 0, 0, 1.26, GOLD, g],
          [0.06, 0.06, 0.06, 0, 0, -0.7, GOLD]
        ]);
      case 'staff':
        return blocks([
          [0.06, 0.06, 1.7, 0, 0, 0.36, color], [0.08, 0.08, 0.06, 0, 0, 1.1, GOLD], [0.1, 0.1, 0.06, 0, 0, 1.2, GOLD],
          [0.16, 0.16, 0.2, 0, 0, 1.34, glow ? light(glow, 0.2) : '#9ad8ff', true], [0.08, 0.08, 0.08, 0, 0, 1.48, glow ? light(glow, 0.5) : '#e0f8ff', true],
          [0.04, 0.12, 0.04, 0.09, 0.02, 1.22, GOLD], [0.04, 0.12, 0.04, -0.09, 0.02, 1.22, GOLD]
        ]);
      case 'bow': {
        // A bow along Y (held upright), bowed toward +Z, the string behind.
        const list = [];
        for (let i = -4; i <= 4; i++) {
          const y = i * 0.13;
          const z = 0.16 * Math.cos((i / 4.6) * (Math.PI / 2)) - 0.02;
          list.push([0.05, 0.14, 0.05, 0, y, z, i === 0 ? GRIP : color, Math.abs(i) === 4 && g]);
        }
        list.push([0.012, 1.06, 0.012, 0, 0, -0.03, '#e8e0d0']);
        list.push([0.06, 0.05, 0.06, 0, 0.6, 0.0, GOLD, g], [0.06, 0.05, 0.06, 0, -0.6, 0.0, GOLD, g]);
        return blocks(list);
      }
      case 'arrow':
        return blocks([[0.02, 0.02, 0.8, 0, 0, 0, '#c8a070'], [0.05, 0.02, 0.1, 0, 0, 0.42, STEEL], [0.06, 0.06, 0.12, 0, 0, -0.36, '#e0e0e0']]);
      default: // the short sword
        return blocks([
          [0.065, 0.03, 0.78, 0, 0, 0.47, color], [0.02, 0.035, 0.7, 0, 0, 0.47, edge, g], [0.26, 0.06, 0.06, 0, 0, 0.06, GOLD, g], [0.05, 0.05, 0.2, 0, 0, -0.06, GRIP],
          [0.08, 0.08, 0.06, 0, 0, -0.18, GOLD]
        ]);
    }
  });
}

/* ---------------------------------------------------------- off hands */

/** A shield, tome or quiver: { kind, shape, color, glow }. Shields face +X (out from the left arm). */
export function offhandGeometry({ shape, color = '#6a4a2a', glow = null }) {
  const g = Boolean(glow);
  const rim = glow ? light(glow, 0.1) : '#9aa4ac';
  return cached(`o|${shape}|${color}|${g}`, () => {
    if (shape === 'buckler') {
      const list = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI;
        list.push([0.05, 0.52, 0.17, 0, 0, 0, color, false, a]);
      }
      list.push([0.06, 0.56, 0.08, 0, 0, 0, rim, g], [0.06, 0.08, 0.56, 0, 0, 0, rim, g], [0.1, 0.14, 0.14, 0.04, 0, 0, GOLD, g]);
      return blocks(list);
    }
    if (shape === 'kite') {
      return blocks([
        [0.05, 0.14, 0.58, 0, 0.3, 0, color], [0.05, 0.3, 0.56, 0, 0.08, 0, color], [0.05, 0.14, 0.42, 0, -0.14, 0, color], [0.05, 0.12, 0.26, 0, -0.27, 0, color], [0.05, 0.1, 0.1, 0, -0.37, 0, color],
        [0.07, 0.62, 0.06, 0.01, 0.02, 0, rim, g], [0.07, 0.06, 0.4, 0.01, 0.18, 0, rim, g], [0.06, 0.04, 0.62, 0, 0.38, 0, rim]
      ]);
    }
    if (shape === 'tower') {
      return blocks([
        [0.06, 0.82, 0.6, 0, 0.06, 0, color], [0.08, 0.06, 0.64, 0.01, 0.48, 0, rim, g], [0.08, 0.06, 0.64, 0.01, -0.36, 0, rim, g], [0.08, 0.86, 0.05, 0.01, 0.06, 0.3, rim], [0.08, 0.86, 0.05, 0.01, 0.06, -0.3, rim],
        [0.1, 0.16, 0.16, 0.04, 0.08, 0, GOLD, g]
      ]);
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
      case 'hood':
        return blocks([[1.1, 0.14, 0.76, 0, 0.88, -0.02, color], [1.1, 0.82, 0.1, 0, 0.48, -0.36, color], [0.1, 0.78, 0.72, 0.55, 0.48, -0.02, color], [0.1, 0.78, 0.72, -0.55, 0.48, -0.02, color],
          [1.12, 0.1, 0.1, 0, 0.84, 0.35, dark(color, 0.25)], [0.36, 0.3, 0.18, 0, 0.62, -0.46, color], [0.18, 0.16, 0.14, 0, 0.42, -0.56, dark(color, 0.2)], [1.1, 0.06, 0.06, 0, 0.12, 0.33, trim, g]]);
      case 'circlet':
        return blocks([[1.04, 0.07, 0.05, 0, 0.6, 0.33, trim, g], [1.04, 0.07, 0.05, 0, 0.6, -0.33, trim, g], [0.05, 0.07, 0.7, 0.53, 0.6, 0, trim, g], [0.05, 0.07, 0.7, -0.53, 0.6, 0, trim, g],
          [0.14, 0.14, 0.06, 0, 0.66, 0.36, glow ?? '#7ad8ff', true], [0.06, 0.1, 0.05, 0.16, 0.66, 0.35, trim, g], [0.06, 0.1, 0.05, -0.16, 0.66, 0.35, trim, g]]);
      case 'full': {
        // A great helm, rounded in steps: a deep bowl, a narrower crown, a domed top and a ridge
        // front to back; a visor slit, a nose guard, breathing holes on the cheeks, a rim with rivets, a plume.
        const hole = '#140c18';
        const list = [
          [1.04, 0.5, 0.78, 0, 0.36, 0, color],
          [0.98, 0.24, 0.74, 0, 0.73, 0, color],
          [0.86, 0.13, 0.64, 0, 0.91, 0, light(color, 0.06)],
          [0.62, 0.08, 0.46, 0, 1.01, 0, light(color, 0.12)],
          [0.12, 0.62, 0.86, 0, 0.66, 0, light(color, 0.22), g],
          [0.84, 0.07, 0.04, 0, 0.56, 0.4, hole],
          [0.09, 0.36, 0.05, 0, 0.4, 0.41, light(color, 0.18)],
          [1.07, 0.06, 0.81, 0, 0.13, 0, trim, g]
        ];
        for (const s of [1, -1]) {
          for (let k = 0; k < 3; k++) list.push([0.05, 0.05, 0.03, s * (0.2 + 0.08 * k), 0.32 - (k % 2) * 0.07, 0.4, hole]);
          list.push([0.06, 0.06, 0.03, s * 0.44, 0.13, 0.4, trim, g], [0.06, 0.06, 0.03, s * 0.52, 0.13, 0.1, trim, g]);
        }
        const plume = glow ? light(glow, 0.1) : '#c03a2a';
        list.push([0.1, 0.24, 0.6, 0, 1.15, -0.06, plume, g], [0.1, 0.2, 0.34, 0, 1.08, -0.42, plume, g], [0.08, 0.14, 0.2, 0, 0.98, -0.58, dark(plume, 0.15), g]);
        return blocks(list);
      }
      case 'horned':
      case 'open':
      default: {
        const list = [[1.08, 0.38, 0.76, 0, 0.72, 0, color], [0.84, 0.12, 0.6, 0, 0.96, 0, color], [0.5, 0.06, 0.36, 0, 1.04, 0, light(color, 0.2)],
          [1.12, 0.08, 0.8, 0, 0.52, 0, trim, g], [0.08, 0.3, 0.05, 0, 0.42, 0.4, color], [0.1, 0.32, 0.6, 0.55, 0.38, -0.04, color], [0.1, 0.32, 0.6, -0.55, 0.38, -0.04, color]];
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
  return cached(`p|${color}|${Boolean(glow)}|${side}`, () => blocks([[0.34, 0.14, 0.46, side * 0.04, 0.02, 0, color], [0.26, 0.1, 0.38, side * 0.06, 0.1, 0, light(color, 0.15)], [0.36, 0.04, 0.48, side * 0.04, -0.06, 0, glow ? light(glow, 0.1) : GOLD, Boolean(glow)]]));
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
