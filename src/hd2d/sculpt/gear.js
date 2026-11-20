/**
 * Gear for the sculpted figures, made for their chibi proportions in the
 * same soft vinyl-toy style (smooth shapes, sdf.js — no stepped blocks):
 *
 *   sculptedGear(kind, { shape, color, glow })  every weapon, shield, tome,
 *     quiver, hat and helmet gear3d.js knows, re-designed to fit: helmets sit
 *     snug on the round head (a rounded dome, a nose guard or visor, a plume
 *     like a teardrop), shields are hand-sized, weapons a touch oversized for
 *     charm, bevelled and smooth. Built in the joint's own frame, as gear3d.js
 *     (a fist at the origin with +Z where the weapon points; the head's neck
 *     at the origin, the face toward +Z; shields facing +X). Metal keeps a
 *     sheen, rare and better glow at their edges and gems — one material, one
 *     mesh a piece.
 *   smoothCapeGeometry()   the cape, as three soft curved strips (rig.js
 *     chains them on hinges, each swinging a little more), a rolled collar on
 *     the first and a hem on the last — rare and better capes glow at the hem.
 *     Same groups as gear3d.js: 0 plain, 1 glows on rare+ gear, 2 metal.
 */
import * as THREE from 'three';
import { mix } from '../../pixel/art.js';
import { compile, sculpt } from './sdf.js';

const cache = new Map();
const sculpted = new Map();

const S = (c, r, o = {}) => ({ s: 'sph', c, r, ...o });
const E = (c, r, o = {}) => ({ s: 'ell', c, r, ...o });
const C = (a, b, r, o = {}) => ({ s: 'cap', a, b, r, ...o });
const T = (a, b, ra, rb, o = {}) => ({ s: 'taper', a, b, r: [ra, rb], ...o });
const B = (c, r, round, o = {}) => ({ s: 'box', c, r, round, ...o });
const D = (c, r, th, o = {}) => ({ s: 'disc', c, r: [r, th], ...o });
const WOOD = '#7a5030', GRIP = '#4a2c1c', GOLD = '#e0b040', STEEL = '#c8d4dc', BONE = '#efe4cc', HOLE = '#2a1a22';
const light = (c, k = 0.35) => mix(c, '#ffffff', k);
const dark = (c, k = 0.35) => mix(c, '#140c18', k);
/** The head's dome, as people.js sculpts it (in the head joint's frame) — helmets are made round it. */
const HEAD = { c: [0, 0.43, -0.01], r: [0.5, 0.44, 0.44] };

/** A recipe for one piece: { parts, paint, cell }. `g` true: rare or better (edges and gems glow). */
function gearRecipe(kind, { shape, color = STEEL, glow = null }) {
  const g = Boolean(glow);
  const edge = glow ? light(glow, 0.25) : light(color, 0.5);
  const gem = glow ? light(glow, 0.1) : '#7ad8ff';
  const metal = { sheen: 0.9 };
  const shine = (o = {}) => ({ ...metal, glow: g ? 0.3 : 0, ...o });
  const P = [], Q = [];
  // A bevelled blade along +Z: a flattened rounded body, a lighter edge, a soft point.
  const blade = (z0, len, w, th = 0.022) => {
    P.push(B([0, 0, z0 + len * 0.42], [w, th, len * 0.42], th * 0.95, { k: 0.01, col: color, ...metal }));
    P.push(E([0, 0, z0 + len * 0.82], [w * 0.98, th, len * 0.2], { k: 0.03, col: color, ...metal }));
    Q.push(E([0, 0, z0 + len * 0.5], [w * 1.05, th * 0.55, len * 0.55], { col: edge, sheen: 1, glow: g ? 0.45 : 0, soft: 0.004 }));
    Q.push(E([0, 0, z0 + len * 0.35], [w * 0.22, th * 1.2, len * 0.3], { col: dark(color, 0.2), sheen: 0.9, soft: 0.004 }));
  };
  const hilt = (z, span, gripLen = 0.2) => {
    P.push(C([-span / 2, 0, z], [span / 2, 0, z], 0.034, { k: 0.02, col: GOLD, ...shine() }));
    P.push(...[-1, 1].map((sx) => S([sx * span / 2, 0, z + 0.01], 0.045, { k: 0.02, col: GOLD, ...shine() })));
    P.push(C([0, 0, z - gripLen], [0, 0, z - 0.02], 0.032, { k: 0.01, col: GRIP }));
    P.push(S([0, 0, z - gripLen - 0.03], 0.05, { k: 0.02, col: GOLD, ...shine() }));
    P.push(S([0, 0, z], 0.045, { k: 0.02, col: g ? gem : light(GOLD, 0.2), sheen: 1, glow: g ? 0.8 : 0 }));
  };
  if (kind === 'weapon') {
    switch (shape) {
      case 'longsword':
        blade(0.13, 1.15, 0.075, 0.026);
        hilt(0.12, 0.42, 0.34);
        return { parts: P, paint: Q, cell: 0.011 };
      case 'dagger':
        blade(0.08, 0.38, 0.055, 0.02);
        hilt(0.07, 0.2, 0.12);
        return { parts: P, paint: Q, cell: 0.009 };
      case 'axe':
        P.push(C([0, 0, -0.22], [0, 0, 0.82], 0.034, { k: 0.01, col: WOOD }));
        P.push(E([0, 0.13, 0.66], [0.028, 0.15, 0.13], { k: 0.04, col: color, ...metal }), E([0, 0.24, 0.66], [0.026, 0.07, 0.17], { k: 0.04, col: color, ...metal }));
        P.push(T([0, -0.03, 0.66], [0, -0.16, 0.66], 0.045, 0.015, { k: 0.02, col: color, ...metal }), S([0, 0, 0.66], 0.05, { k: 0.02, col: dark(color, 0.15), ...metal }));
        Q.push(E([0, 0.3, 0.66], [0.04, 0.05, 0.2], { col: edge, sheen: 1, glow: g ? 0.45 : 0, soft: 0.006 }));
        P.push(S([0, 0, -0.25], 0.045, { k: 0.02, col: dark(color, 0.1), ...metal }));
        return { parts: P, paint: Q, cell: 0.011 };
      case 'mace':
        P.push(C([0, 0, -0.18], [0, 0, 0.56], 0.034, { k: 0.01, col: WOOD }), S([0, 0, 0.66], 0.13, { k: 0.03, col: color, ...metal }));
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          P.push(E([Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.66], [0.05, 0.05, 0.1], { k: 0.03, col: i % 2 ? edge : color, ...shine() }));
        }
        P.push(S([0, 0, 0.8], 0.045, { k: 0.02, col: edge, ...shine() }), S([0, 0, -0.2], 0.045, { k: 0.02, col: GOLD, ...metal }));
        return { parts: P, paint: Q, cell: 0.011 };
      case 'hammer':
        P.push(C([0, 0, -0.2], [0, 0, 0.72], 0.036, { k: 0.01, col: WOOD }));
        P.push(B([0, 0, 0.78], [0.12, 0.21, 0.12], 0.07, { k: 0.02, col: color, ...metal }));
        P.push(...[-1, 1].map((sy) => B([0, sy * 0.22, 0.78], [0.13, 0.03, 0.13], 0.03, { k: 0.02, col: sy > 0 ? edge : dark(color, 0.2), ...shine() })));
        Q.push(...[-1, 1].map((sy) => E([0, sy * 0.1, 0.78], [0.14, 0.022, 0.14], { col: GOLD, sheen: 0.9, glow: g ? 0.4 : 0, soft: 0.005 })));
        P.push(S([0, 0, -0.22], 0.045, { k: 0.02, col: GOLD, ...metal }));
        return { parts: P, paint: Q, cell: 0.012 };
      case 'spear':
        P.push(C([0, 0, -0.68], [0, 0, 1.32], 0.028, { k: 0.01, col: WOOD }));
        P.push(E([0, 0, 1.5], [0.075, 0.022, 0.2], { k: 0.02, col: color, ...metal }), S([0, 0, 1.3], 0.045, { k: 0.02, col: GOLD, ...shine() }));
        Q.push(E([0, 0, 1.52], [0.08, 0.012, 0.21], { col: edge, sheen: 1, glow: g ? 0.45 : 0, soft: 0.004 }));
        P.push(T([0, -0.03, 1.26], [0, -0.12, 1.22], 0.03, 0.012, { k: 0.01, col: '#c03a2a' }), S([0, 0, -0.7], 0.04, { k: 0.02, col: GOLD, ...metal }));
        return { parts: P, paint: Q, cell: 0.011 };
      case 'staff': {
        const crystal = glow ? light(glow, 0.15) : '#9ad8ff';
        P.push(C([0, 0, -0.08], [0, 0, 1.2], 0.036, { k: 0.01, col: color }));
        P.push(S([0, 0, -0.1], 0.05, { k: 0.02, col: GOLD, ...metal }), D([0, 0, 1.2], 0.07, 0.025, { k: 0.02, col: GOLD, ...metal }));
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          P.push(T([Math.cos(a) * 0.06, Math.sin(a) * 0.06, 1.2], [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 1.42], 0.022, 0.012, { k: 0.015, col: GOLD, ...metal }));
        }
        P.push(E([0, 0, 1.36], [0.085, 0.085, 0.14], { k: 0.01, col: crystal, sheen: 1, glow: 0.9 }), S([0, 0, 1.56], 0.05, { k: 0.0, col: light(crystal, 0.4), sheen: 1, glow: 1 }));
        return { parts: P, paint: Q, cell: 0.011 };
      }
      case 'bow': {
        // Held upright: two limbs curving forward then back to their tips, a wrapped grip, the string behind.
        for (const sy of [1, -1]) {
          P.push(T([0, sy * 0.06, 0.13], [0, sy * 0.34, 0.1], 0.036, 0.028, { k: 0.03, col: color }));
          P.push(T([0, sy * 0.34, 0.1], [0, sy * 0.55, -0.02], 0.028, 0.016, { k: 0.03, col: color }));
          P.push(S([0, sy * 0.56, -0.025], 0.03, { k: 0.01, col: g ? gem : GOLD, sheen: 0.9, glow: g ? 0.6 : 0 }));
        }
        P.push(E([0, 0, 0.12], [0.045, 0.1, 0.045], { k: 0.03, col: GRIP }));
        P.push(C([0, 0.55, -0.03], [0, -0.55, -0.03], 0.009, { k: 0.0, col: '#efe6d4' }));
        return { parts: P, paint: Q, cell: 0.009 };
      }
      default: // the short sword
        blade(0.09, 0.82, 0.068, 0.024);
        hilt(0.08, 0.3, 0.2);
        return { parts: P, paint: Q, cell: 0.011 };
    }
  }
  if (kind === 'offhand') {
    const rim = glow ? light(glow, 0.1) : '#b8c2cc';
    switch (shape) {
      case 'buckler':
        P.push(D([0, 0, 0], 0.19, 0.03, { k: 0.02, col: color, rot: [0, Math.PI / 2, 0] }));
        P.push(S([0.035, 0, 0], 0.075, { k: 0.04, col: GOLD, ...shine() }));
        Q.push(D([0, 0, 0], 0.2, 0.06, { col: rim, sheen: 0.9, glow: g ? 0.4 : 0, rot: [0, Math.PI / 2, 0], soft: 0.004 }), D([0, 0, 0], 0.17, 0.08, { col: color, rot: [0, Math.PI / 2, 0], soft: 0.004 }));
        return { parts: P, paint: Q, cell: 0.012 };
      case 'kite':
        P.push(E([0, 0.07, 0], [0.035, 0.2, 0.2], { k: 0.04, col: color }), B([0, -0.12, 0], [0.032, 0.15, 0.15], 0.03, { k: 0.06, col: color, rot: [Math.PI / 4, 0, 0] }));
        P.push(S([0.035, 0.05, 0], 0.07, { k: 0.04, col: GOLD, ...shine() }));
        Q.push(E([0, 0, 0], [0.05, 0.03, 0.22], { col: light(color, 0.3), soft: 0.004 }), E([0, -0.02, 0], [0.05, 0.3, 0.03], { col: light(color, 0.3), soft: 0.004 }));
        return { parts: P, paint: Q, cell: 0.012 };
      case 'tower':
        P.push(B([0, 0.02, 0], [0.04, 0.3, 0.22], 0.05, { k: 0.02, col: color }));
        P.push(S([0.04, 0.04, 0], 0.075, { k: 0.04, col: GOLD, ...shine() }));
        Q.push(B([0, 0.02, 0], [0.06, 0.31, 0.23], 0.05, { col: rim, sheen: 0.9, glow: g ? 0.4 : 0, soft: 0.004 }), B([0, 0.02, 0], [0.08, 0.27, 0.19], 0.04, { col: color, soft: 0.004 }));
        return { parts: P, paint: Q, cell: 0.012 };
      case 'tome':
        P.push(B([0, 0, 0], [0.045, 0.14, 0.11], 0.03, { k: 0.01, col: color }), B([0.005, 0, 0.03], [0.04, 0.125, 0.09], 0.02, { k: 0.005, col: '#f4ecd8' }));
        P.push(S([0.05, 0.02, -0.02], 0.035, { k: 0.01, col: g ? gem : GOLD, sheen: 1, glow: g ? 0.7 : 0 }));
        return { parts: P, paint: Q, cell: 0.009 };
      default: // the quiver, on the back
        P.push(C([0, -0.2, 0], [0, 0.18, 0], 0.08, { k: 0.02, col: color }), D([0, 0.18, 0], 0.085, 0.02, { k: 0.01, col: GOLD, rot: [Math.PI / 2, 0, 0], ...shine() }));
        for (const [x, z, h, c] of [[0.035, 0.02, 0.36, '#efe6d4'], [-0.03, -0.02, 0.34, '#efe6d4'], [0, -0.04, 0.32, '#d06a4a']]) P.push(C([x, 0.15, z], [x, h, z], 0.012, { k: 0.005, col: '#c8a070' }), E([x, h + 0.03, z], [0.012, 0.045, 0.03], { k: 0.005, col: c }));
        return { parts: P, paint: Q, cell: 0.01 };
    }
  }
  // Head gear, made round the head.
  const [hx, hy, hz] = HEAD.c, [rx, ry, rz] = HEAD.r;
  const trim = glow ? light(glow, 0.2) : GOLD;
  const dome = (grow, lower, col, o = {}) => [E([hx, hy + 0.02, hz], [rx * grow, ry * grow, rz * grow], { k: 0.02, col, ...o }), B([0, lower - 0.5, 0], [1, 0.5, 1], 0.01, { sub: true, k: 0.02 })];
  switch (shape) {
    case 'full': {
      // A great helm: a round dome that closes over the face, a visor slit, a nose ridge, a teardrop plume.
      P.push(...dome(1.08, 0.04, color, metal));
      P.push(E([0, 0.5, 0.44], [0.035, 0.24, 0.05], { k: 0.03, col: light(color, 0.2), ...metal }));
      const plume = glow ? light(glow, 0.1) : '#d04a3a';
      P.push(T([0, 0.88, -0.02], [0, 0.98, -0.42], 0.12, 0.035, { k: 0.06, col: plume, glow: g ? 0.3 : 0 }), S([0, 0.9, -0.06], 0.07, { k: 0.04, col: trim, ...shine() }));
      Q.push(E([0, 0.4, 0.45], [0.34, 0.035, 0.1], { col: HOLE, soft: 0.005 }), E([0, 0.08, 0], [0.56, 0.04, 0.5], { col: trim, sheen: 0.9, glow: g ? 0.4 : 0, soft: 0.005 }));
      return { parts: P, paint: Q, cell: 0.016 };
    }
    case 'open':
    case 'horned': {
      P.push(...dome(1.07, 0.5, color, metal));
      P.push(C([0, 0.54, 0.47], [0, 0.4, 0.47], 0.032, { k: 0.02, col: light(color, 0.15), ...metal }));
      P.push(E([0, 0.86, -0.01], [0.045, 0.06, 0.36], { k: 0.04, col: light(color, 0.2), ...metal }));
      Q.push(E([0, 0.52, -0.01], [0.56, 0.035, 0.5], { col: trim, sheen: 0.9, glow: g ? 0.4 : 0, soft: 0.005 }));
      if (shape === 'horned') for (const sx of [1, -1]) P.push(T([sx * 0.42, 0.66, 0], [sx * 0.66, 0.84, 0.02], 0.1, 0.065, { k: 0.04, col: BONE }), T([sx * 0.66, 0.84, 0.02], [sx * 0.68, 1.08, -0.04], 0.065, 0.018, { k: 0.03, col: light(BONE, 0.3), glow: g ? 0.3 : 0 }));
      return { parts: P, paint: Q, cell: 0.018 };
    }
    case 'hood': {
      P.push(E([0, 0.45, -0.05], [0.56, 0.48, 0.5], { k: 0.03, col: color }), E([0, 0.34, 0.42], [0.38, 0.33, 0.3], { sub: true, k: 0.03 }), E([0, 0.4, 0.0], [0.5, 0.44, 0.44], { sub: true, k: 0.02 }));
      P.push(T([0, 0.78, -0.25], [0, 0.82, -0.6], 0.13, 0.025, { k: 0.06, col: color }), E([0, 0.06, -0.06], [0.38, 0.07, 0.3], { k: 0.06, col: dark(color, 0.12) }));
      Q.push(E([0, 0.34, 0.46], [0.42, 0.37, 0.08], { col: dark(color, 0.3), soft: 0.02 }), E([0, 0.05, 0.4], [0.5, 0.04, 0.1], { col: trim, glow: g ? 0.4 : 0, soft: 0.005 }));
      return { parts: P, paint: Q, cell: 0.022 };
    }
    case 'cap': {
      P.push(...dome(1.06, 0.62, color));
      P.push(E([0, 0.63, 0.34], [0.34, 0.035, 0.16], { k: 0.03, col: dark(color, 0.15) }));
      P.push(T([0.38, 0.74, -0.12], [0.5, 0.96, -0.3], 0.055, 0.03, { k: 0.02, col: glow ?? '#e05040', glow: g ? 0.4 : 0 }), T([0.5, 0.96, -0.3], [0.5, 1.12, -0.46], 0.03, 0.01, { k: 0.02, col: light(glow ?? '#e05040', 0.3), glow: g ? 0.4 : 0 }));
      Q.push(E([0, 0.66, -0.01], [0.56, 0.035, 0.5], { col: trim, glow: g ? 0.4 : 0, soft: 0.005 }));
      return { parts: P, paint: Q, cell: 0.016 };
    }
    case 'wizard': {
      P.push(D([0, 0.74, -0.01], 0.66, 0.03, { k: 0.03, col: color, rot: [Math.PI / 2, 0, 0] }));
      P.push(T([0, 0.74, -0.02], [0, 1.24, -0.12], 0.42, 0.11, { k: 0.06, col: color }), T([0, 1.24, -0.12], [0, 1.38, -0.36], 0.11, 0.03, { k: 0.05, col: color }));
      P.push(S([0.2, 1.0, 0.3], 0.05, { k: 0.01, col: g ? gem : GOLD, sheen: 1, glow: g ? 0.8 : 0.2 }));
      Q.push(E([0, 0.8, -0.02], [0.45, 0.05, 0.45], { col: trim, glow: g ? 0.4 : 0, soft: 0.006 }));
      return { parts: P, paint: Q, cell: 0.02 };
    }
    case 'circlet':
    default: {
      P.push(D([0, 0.6, -0.01], 0.49, 0.03, { k: 0.01, col: trim, rot: [Math.PI / 2, 0, 0], ...shine() }), D([0, 0.6, -0.01], 0.36, 0.1, { sub: true, k: 0.01, rot: [Math.PI / 2, 0, 0] }));
      P.push(E([0, 0.63, 0.47], [0.065, 0.075, 0.035], { k: 0.02, col: glow ?? '#7ad8ff', sheen: 1, glow: 0.8 }));
      return { parts: P, paint: Q, cell: 0.012 };
    }
  }
}

/** A piece of gear as a smooth sculpted geometry (cached): sculptedGear('weapon' | 'offhand' | 'head', { shape, color, glow }). */
export function sculptedGear(kind, args) {
  const key = `${kind}|${args.shape}|${args.color}|${args.glow ?? ''}`;
  if (sculpted.has(key)) return sculpted.get(key);
  const R = gearRecipe(kind, args);
  const model = compile({ slots: [], bones: [['root', null, 0, 0, 0]], parts: R.parts.map((p) => ({ ...p, bone: 'root' })), paint: R.paint, blend: 0.004 });
  const b = model.box;
  const longest = Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]);
  const geo = sculpt(model, { res: Math.min(140, Math.ceil(longest / R.cell)) });
  geo.deleteAttribute('skinIndex');
  geo.deleteAttribute('skinWeight');
  sculpted.set(key, geo);
  return geo;
}

/** Every piece's shape name, by kind (the tests sculpt them all). */
export const GEAR_SHAPES = {
  weapon: ['shortsword', 'longsword', 'dagger', 'axe', 'mace', 'hammer', 'spear', 'staff', 'bow'],
  offhand: ['buckler', 'kite', 'tower', 'tome', 'quiver'],
  head: ['open', 'horned', 'full', 'hood', 'cap', 'wizard', 'circlet']
};

/** One strip (row 0 at the shoulders … row 2 the hem) of a cape { color, hem }. */
export function smoothCapeGeometry({ color, hem = null }, row = 0) {
  const key = `${color}|${hem}|${row}`;
  if (cache.has(key)) return cache.get(key);
  // The cape widens from the shoulders to the hem (each strip a slice of that), wraps round the back,
  // and its last strip ends in a rounded hem.
  const top = 0.44 + row * 0.08, bottom = top + 0.08, h = 0.21, th = 0.028;
  const wrap = 1.3;
  const pieces = [];
  const cloth = new THREE.BoxGeometry(1, h, th, 12, 3, 1);
  const p = cloth.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 0.5 - y / h; // 0 at the top of the strip, 1 at its bottom
    const w = top + (bottom - top) * k;
    const x = u * w;
    const round = row === 2 && y < -h / 2 + 0.001 ? (Math.abs(u) * 2) ** 3 * 0.09 : 0;
    p.setXYZ(i, x, y - h / 2 + round, z + x * x * wrap - row * 0.01);
  }
  cloth.computeVertexNormals();
  pieces.push([cloth, color, 0]);
  if (row === 0) {
    const collar = new THREE.CapsuleGeometry(0.045, top * 0.9, 4, 10).rotateZ(Math.PI / 2);
    const cp = collar.attributes.position;
    for (let i = 0; i < cp.count; i++) cp.setZ(i, cp.getZ(i) + cp.getX(i) ** 2 * wrap + 0.01);
    collar.computeVertexNormals();
    pieces.push([collar, hem ?? mix(color, '#140c18', 0.25), hem ? 1 : 0]);
  }
  if (row === 2 && hem) {
    const band = new THREE.CapsuleGeometry(0.02, bottom * 0.8, 3, 10).rotateZ(Math.PI / 2);
    const bp = band.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setXYZ(i, bp.getX(i), bp.getY(i) - h + 0.03, bp.getZ(i) + bp.getX(i) ** 2 * wrap - 0.02);
    band.computeVertexNormals();
    pieces.push([band, hem, 1]);
  }
  // Into one geometry with vertex colours, grouped plain / glowing.
  const out = { 0: { pos: [], nor: [], col: [] }, 1: { pos: [], nor: [], col: [] } };
  const c = new THREE.Color();
  for (const [g0, hex, grp] of pieces) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    c.set(hex);
    const o = out[grp];
    o.pos.push(...g.attributes.position.array);
    o.nor.push(...g.attributes.normal.array);
    const n = g.attributes.normal.array;
    for (let i = 0; i < g.attributes.position.count; i++) {
      // The inside (facing the body) a little darker.
      const k = n[i * 3 + 2] > 0.5 ? 0.7 : 1;
      o.col.push(c.r * k, c.g * k, c.b * k);
    }
    if (g !== g0) g.dispose();
    g0.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([...out[0].pos, ...out[1].pos], 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute([...out[0].nor, ...out[1].nor], 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute([...out[0].col, ...out[1].col], 3));
  geo.addGroup(0, out[0].pos.length / 3, 0);
  geo.addGroup(out[0].pos.length / 3, out[1].pos.length / 3, 1);
  geo.computeBoundingSphere();
  cache.set(key, geo);
  return geo;
}

/** Free the cached gear (when the game closes). */
export function disposeSculptGear() {
  for (const g of cache.values()) g.dispose();
  for (const g of sculpted.values()) g.dispose();
  cache.clear();
  sculpted.clear();
}
