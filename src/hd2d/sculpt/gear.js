/**
 * Gear for the sculpted figures, made for their chibi proportions in the
 * same soft vinyl-toy style (smooth shapes, sdf.js — no stepped blocks):
 *
 *   sculptedGear(kind, { shape, color, glow }, lod)  every weapon, shield,
 *     tome, quiver, hat and helmet gear3d.js knows, re-designed to fit and
 *     detailed like a toy: blades with a fuller and a bright edge, curled
 *     crossguards, wrapped grips and pommel gems; shields with rims, bosses and
 *     rivets; helms with brow bands, rivets, visors, cheek plates and feathered
 *     plumes; staves with a wound strap and prongs round the orb; bows with a
 *     wrapped grip and a string. Built in the joint's own frame, as gear3d.js
 *     (a fist at the origin with +Z where the weapon points; the head's neck at
 *     the origin, the face toward +Z; shields facing +X). Metal keeps a sheen,
 *     leather and wood a grain; rare and better glow at their edges and gems.
 *     Two details: 'near' and a coarse 'far' (also every outline and shadow).
 *   gearReady(kind, args, lod)  the same, or null while the worker sculpts it
 *     (build.js) — rig.js shows the piece when it arrives.
 *   smoothCapeGeometry({ color, hem })  the cape: one soft sheet skinned to
 *     three hinges (rig.js swings each a little more), a rolled collar and a
 *     stitched hem; rare and better capes glow at the hem.
 */
import * as THREE from 'three';
import { mix } from '../../pixel/art.js';
import { compile, sculpt, hexToLinear } from './sdf.js';
import { enqueue } from './build.js';

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
  const wood = { col: WOOD, fab: 'grain' };
  const leather = { col: GRIP, fab: 'grain' };
  const P = [], Q = [];
  // A wrapped grip from z0 to z1 (radius r): leather with ridges where the strap winds round.
  const wrap = (z0, z1, r, n = 5) => {
    P.push(C([0, 0, z0], [0, 0, z1], r, { k: 0.01, ...leather }));
    for (let i = 0; i < n; i++) {
      const z = z0 + ((i + 0.5) / n) * (z1 - z0);
      P.push(D([0, 0, z], r * 1.02, r * 0.32, { k: 0.008, ...leather, tone: 0.85, rot: [0.35, 0, 0] }));
    }
  };
  // Little round rivets round a ring (in the XY plane at depth z), or along a list of points.
  const rivetsAt = (pts, r = 0.014, col = GOLD) => P.push(...pts.map((c) => S(c, r, { k: 0.004, col, ...shine() })));
  // A bevelled blade along +Z: a flattened rounded body, a lighter edge, a soft point, a fuller down each face.
  const blade = (z0, len, w, th = 0.022) => {
    P.push(B([0, 0, z0 + len * 0.42], [w, th, len * 0.42], th * 0.95, { k: 0.01, col: color, ...metal }));
    P.push(E([0, 0, z0 + len * 0.82], [w * 0.98, th, len * 0.2], { k: 0.03, col: color, ...metal }));
    for (const sy of [1, -1]) P.push(B([0, sy * th * 1.25, z0 + len * 0.4], [w * 0.2, th * 0.55, len * 0.32], th * 0.4, { sub: true, k: 0.006 }));
    Q.push(E([0, 0, z0 + len * 0.5], [w * 1.05, th * 0.55, len * 0.55], { col: edge, sheen: 1, glow: g ? 0.45 : 0, soft: 0.004 }));
    Q.push(E([0, 0, z0 + len * 0.4], [w * 0.24, th * 1.4, len * 0.33], { col: dark(color, 0.25), sheen: 1, soft: 0.004 }));
  };
  // A crossguard that curls at its ends, a wrapped grip, a pommel with a gem (rare: it glows).
  const hilt = (z, span, gripLen = 0.2) => {
    for (const sx of [1, -1]) {
      P.push(T([0, 0, z], [sx * span * 0.42, 0, z + 0.01], 0.036, 0.026, { k: 0.02, col: GOLD, ...shine() }));
      P.push(T([sx * span * 0.42, 0, z + 0.01], [sx * span * 0.52, 0, z + 0.07], 0.026, 0.02, { k: 0.015, col: GOLD, ...shine() }));
      P.push(S([sx * span * 0.53, 0, z + 0.075], 0.026, { k: 0.01, col: GOLD, ...shine() }));
    }
    P.push(E([0, 0, z + 0.015], [0.05, 0.04, 0.045], { k: 0.02, col: GOLD, ...shine() }));
    wrap(z - gripLen, z - 0.02, 0.031, Math.max(3, Math.round(gripLen / 0.045)));
    P.push(S([0, 0, z - gripLen - 0.035], 0.05, { k: 0.02, col: GOLD, ...shine() }));
    P.push(S([0, 0, z - gripLen - 0.07], 0.024, { k: 0.008, col: g ? gem : light(GOLD, 0.2), sheen: 1, glow: g ? 0.8 : 0 }));
    P.push(...[1, -1].map((sy) => S([0, sy * 0.04, z + 0.015], 0.022, { k: 0.006, col: g ? gem : '#c84a3a', sheen: 1, glow: g ? 0.8 : 0 })));
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
      case 'axe': {
        P.push(C([0, 0, -0.22], [0, 0, 0.82], 0.034, { k: 0.01, ...wood }));
        wrap(-0.2, 0.08, 0.037, 5);
        // The head: a bearded blade on a riveted socket, a spike behind.
        P.push(E([0, 0.13, 0.66], [0.028, 0.15, 0.13], { k: 0.04, col: color, ...metal }), E([0, 0.25, 0.64], [0.026, 0.075, 0.19], { k: 0.04, col: color, ...metal }));
        P.push(E([0, 0.12, 0.66], [0.04, 0.05, 0.05], { sub: true, k: 0.02 }));
        P.push(T([0, -0.03, 0.66], [0, -0.17, 0.66], 0.045, 0.012, { k: 0.02, col: color, ...metal }));
        P.push(C([0, 0, 0.56], [0, 0, 0.76], 0.048, { k: 0.015, col: dark(color, 0.15), ...metal }));
        rivetsAt([[0.045, 0.02, 0.6], [-0.045, 0.02, 0.6], [0.045, 0.02, 0.72], [-0.045, 0.02, 0.72]], 0.012);
        Q.push(E([0, 0.31, 0.64], [0.04, 0.05, 0.22], { col: edge, sheen: 1, glow: g ? 0.45 : 0, soft: 0.006 }));
        P.push(S([0, 0, -0.25], 0.045, { k: 0.02, col: dark(color, 0.1), ...metal }));
        return { parts: P, paint: Q, cell: 0.011 };
      }
      case 'mace':
        P.push(C([0, 0, -0.18], [0, 0, 0.56], 0.034, { k: 0.01, ...wood }));
        wrap(-0.16, 0.12, 0.037, 6);
        P.push(S([0, 0, 0.66], 0.11, { k: 0.03, col: color, ...metal }), D([0, 0, 0.55], 0.06, 0.018, { k: 0.01, col: GOLD, ...shine() }));
        // Six flanges, each a bevelled fin.
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          P.push(B([Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.66], [0.06, 0.014, 0.1], 0.012, { k: 0.02, col: i % 2 ? edge : color, rot: [0, 0, a], ...shine() }));
        }
        P.push(S([0, 0, 0.8], 0.04, { k: 0.02, col: edge, ...shine() }), S([0, 0, -0.2], 0.045, { k: 0.02, col: GOLD, ...metal }));
        return { parts: P, paint: Q, cell: 0.011 };
      case 'hammer':
        P.push(C([0, 0, -0.2], [0, 0, 0.72], 0.036, { k: 0.01, ...wood }));
        wrap(-0.18, 0.12, 0.039, 6);
        P.push(B([0, 0, 0.78], [0.12, 0.21, 0.12], 0.07, { k: 0.02, col: color, ...metal }));
        // Striking faces with a rim, bands round the head, rivets in the bands, a cap on top.
        P.push(...[-1, 1].map((sy) => B([0, sy * 0.22, 0.78], [0.13, 0.03, 0.13], 0.03, { k: 0.02, col: sy > 0 ? edge : dark(color, 0.2), ...shine() })));
        P.push(...[-1, 1].map((sy) => B([0, sy * 0.26, 0.78], [0.08, 0.02, 0.08], 0.02, { sub: true, k: 0.015 })));
        P.push(...[-1, 1].map((sy) => B([0, sy * 0.1, 0.78], [0.135, 0.022, 0.135], 0.02, { k: 0.008, col: GOLD, ...shine() })));
        rivetsAt([-1, 1].flatMap((sy) => [[0.14, sy * 0.1, 0.72], [0.14, sy * 0.1, 0.84], [-0.14, sy * 0.1, 0.72], [-0.14, sy * 0.1, 0.84]]), 0.013, light(GOLD, 0.2));
        P.push(S([0, 0, 0.92], 0.035, { k: 0.015, col: GOLD, ...shine() }), S([0, 0, -0.22], 0.045, { k: 0.02, col: GOLD, ...metal }));
        return { parts: P, paint: Q, cell: 0.012 };
      case 'spear':
        P.push(C([0, 0, -0.68], [0, 0, 1.32], 0.028, { k: 0.01, ...wood }));
        wrap(-0.1, 0.25, 0.031, 6);
        // A leaf blade with a ridge, on a ringed socket; a red tassel.
        P.push(E([0, 0, 1.5], [0.075, 0.022, 0.2], { k: 0.02, col: color, ...metal }), E([0, 0, 1.5], [0.012, 0.03, 0.18], { k: 0.01, col: light(color, 0.15), ...metal }));
        P.push(T([0, 0, 1.24], [0, 0, 1.34], 0.036, 0.03, { k: 0.01, col: GOLD, ...shine() }), D([0, 0, 1.26], 0.04, 0.01, { k: 0.005, col: GOLD, ...shine() }));
        Q.push(E([0, 0, 1.52], [0.08, 0.012, 0.21], { col: edge, sheen: 1, glow: g ? 0.45 : 0, soft: 0.004 }));
        for (const [x, z] of [[0, 0], [0.02, 0.02], [-0.02, 0.01]]) P.push(T([x, -0.03, 1.24], [x * 2, -0.15, 1.2 + z], 0.022, 0.01, { k: 0.008, col: '#c03a2a', fab: 'strands' }));
        P.push(S([0, 0, -0.7], 0.04, { k: 0.02, col: GOLD, ...metal }));
        return { parts: P, paint: Q, cell: 0.011 };
      case 'staff': {
        const crystal = glow ? light(glow, 0.15) : '#9ad8ff';
        P.push(C([0, 0, -0.08], [0, 0, 1.2], 0.036, { k: 0.01, col: color, fab: 'grain' }));
        // A strap wound up the shaft, a knot of wood under the head.
        for (let i = 0; i < 7; i++) P.push(D([0, 0, 0.1 + i * 0.05], 0.038, 0.011, { k: 0.008, ...leather, rot: [0.45, 0, 0] }));
        P.push(E([0, 0, 1.12], [0.05, 0.05, 0.07], { k: 0.03, col: color, fab: 'grain' }));
        P.push(S([0, 0, -0.1], 0.05, { k: 0.02, col: GOLD, ...metal }), D([0, 0, 1.2], 0.07, 0.025, { k: 0.02, col: GOLD, ...metal }));
        // Three curled prongs cradling the orb, a gem at the top.
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          P.push(T([Math.cos(a) * 0.06, Math.sin(a) * 0.06, 1.2], [Math.cos(a) * 0.115, Math.sin(a) * 0.115, 1.38], 0.022, 0.014, { k: 0.015, col: GOLD, ...metal }));
          P.push(T([Math.cos(a) * 0.115, Math.sin(a) * 0.115, 1.38], [Math.cos(a) * 0.07, Math.sin(a) * 0.07, 1.47], 0.014, 0.01, { k: 0.01, col: GOLD, ...metal }));
          P.push(S([Math.cos(a) * 0.07, Math.sin(a) * 0.07, 1.475], 0.016, { k: 0.006, col: GOLD, ...shine() }));
        }
        P.push(S([0, 0, 1.36], 0.088, { k: 0.0, col: crystal, sheen: 1, glow: 0.9 }), S([0.03, 0.03, 1.39], 0.03, { k: 0.0, col: light(crystal, 0.6), sheen: 1, glow: 1 }));
        P.push(E([0, 0, 1.56], [0.03, 0.03, 0.05], { k: 0.0, col: light(crystal, 0.4), sheen: 1, glow: 1 }));
        return { parts: P, paint: Q, cell: 0.011 };
      }
      case 'bow': {
        // Held upright: two limbs curving forward then back to their tips (nocks at the ends), a wrapped
        // grip with an arrow rest, the string behind.
        for (const sy of [1, -1]) {
          P.push(T([0, sy * 0.06, 0.13], [0, sy * 0.34, 0.1], 0.036, 0.028, { k: 0.03, col: color, fab: 'grain' }));
          P.push(T([0, sy * 0.34, 0.1], [0, sy * 0.55, -0.02], 0.028, 0.016, { k: 0.03, col: color, fab: 'grain' }));
          P.push(S([0, sy * 0.56, -0.025], 0.028, { k: 0.01, col: g ? gem : GOLD, sheen: 0.9, glow: g ? 0.6 : 0 }));
          P.push(D([0, sy * 0.2, 0.13], 0.037, 0.008, { k: 0.005, col: GOLD, rot: [Math.PI / 2, 0, 0], ...shine() }));
        }
        P.push(E([0, 0, 0.12], [0.045, 0.1, 0.045], { k: 0.03, ...leather }));
        for (let i = 0; i < 5; i++) P.push(D([0, -0.08 + i * 0.04, 0.12], 0.047, 0.01, { k: 0.006, ...leather, tone: 0.8, rot: [Math.PI / 2 + 0.3, 0, 0] }));
        P.push(S([0.03, 0.09, 0.15], 0.015, { k: 0.006, col: GOLD, ...shine() }));
        P.push(C([0, 0.55, -0.03], [0, -0.55, -0.03], 0.0095, { k: 0.0, col: '#efe6d4', fab: null }));
        return { parts: P, paint: Q, cell: 0.008 };
      }
      default: // the short sword
        blade(0.09, 0.82, 0.068, 0.024);
        hilt(0.08, 0.3, 0.2);
        return { parts: P, paint: Q, cell: 0.011 };
    }
  }
  if (kind === 'offhand') {
    const rim = glow ? light(glow, 0.1) : '#b8c2cc';
    // Rivets round a shield's face (facing +X) at radius r.
    const ring = (n, r, x, scale = [1, 1]) => Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [x, Math.sin(a) * r * scale[0], Math.cos(a) * r * scale[1]];
    });
    switch (shape) {
      case 'buckler':
        P.push(D([0, 0, 0], 0.19, 0.03, { k: 0.02, col: color, rot: [0, Math.PI / 2, 0], fab: 'grain' }));
        P.push(D([0.012, 0, 0], 0.2, 0.018, { k: 0.01, col: rim, rot: [0, Math.PI / 2, 0], ...shine() }), D([0.02, 0, 0], 0.175, 0.03, { sub: true, k: 0.01, rot: [0, Math.PI / 2, 0] }));
        P.push(S([0.035, 0, 0], 0.075, { k: 0.04, col: GOLD, ...shine() }), S([0.1, 0, 0], 0.022, { k: 0.01, col: g ? gem : light(GOLD, 0.3), sheen: 1, glow: g ? 0.7 : 0 }));
        rivetsAt(ring(8, 0.15, 0.03), 0.014);
        return { parts: P, paint: Q, cell: 0.01 };
      case 'kite':
        P.push(E([0, 0.07, 0], [0.035, 0.2, 0.2], { k: 0.04, col: color }), B([0, -0.12, 0], [0.032, 0.15, 0.15], 0.03, { k: 0.06, col: color, rot: [Math.PI / 4, 0, 0] }));
        // A raised rim round the edge (the shield again, a little bigger, its middle carved away), a cross, a boss.
        P.push(E([-0.005, 0.07, 0], [0.04, 0.215, 0.215], { k: 0.01, col: rim, ...shine() }), E([0.03, 0.07, 0], [0.04, 0.185, 0.185], { sub: true, k: 0.01 }));
        P.push(B([0.03, -0.02, 0], [0.012, 0.26, 0.025], 0.01, { k: 0.01, col: light(color, 0.35) }), B([0.03, 0.06, 0], [0.012, 0.025, 0.17], 0.01, { k: 0.01, col: light(color, 0.35) }));
        P.push(S([0.04, 0.05, 0], 0.06, { k: 0.03, col: GOLD, ...shine() }));
        rivetsAt([[0.02, 0.24, 0], [0.02, 0.15, 0.17], [0.02, 0.15, -0.17], [0.02, -0.1, 0.12], [0.02, -0.1, -0.12]], 0.014);
        return { parts: P, paint: Q, cell: 0.011 };
      case 'tower':
        P.push(B([0, 0.02, 0], [0.04, 0.3, 0.22], 0.05, { k: 0.02, col: color, fab: 'grain' }));
        // Planks, a riveted rim, iron bands across, a boss.
        P.push(...[-0.11, 0, 0.11].map((z) => B([0.045, 0.02, z + 0.055], [0.01, 0.29, 0.004], 0.003, { sub: true, k: 0.004 })));
        P.push(B([-0.004, 0.02, 0], [0.048, 0.315, 0.235], 0.05, { k: 0.01, col: rim, ...shine() }), B([0.03, 0.02, 0], [0.05, 0.28, 0.2], 0.04, { sub: true, k: 0.008 }));
        P.push(...[-0.16, 0.2].map((y) => B([0.042, y, 0], [0.012, 0.025, 0.22], 0.01, { k: 0.008, col: rim, ...shine() })));
        rivetsAt([-0.16, 0.2].flatMap((y) => [-0.16, -0.05, 0.05, 0.16].map((z) => [0.055, y, z])), 0.013);
        P.push(S([0.05, 0.04, 0], 0.07, { k: 0.04, col: GOLD, ...shine() }), S([0.11, 0.04, 0], 0.02, { k: 0.01, col: g ? gem : light(GOLD, 0.3), sheen: 1, glow: g ? 0.7 : 0 }));
        return { parts: P, paint: Q, cell: 0.012 };
      case 'tome':
        P.push(B([0, 0, 0], [0.045, 0.14, 0.11], 0.03, { k: 0.01, col: color, fab: 'grain' }), B([0.005, 0, 0.03], [0.04, 0.125, 0.09], 0.02, { k: 0.005, col: '#f4ecd8' }));
        // Page edges, metal corners, a clasp, a gem on the cover.
        P.push(...[-0.02, 0, 0.02].map((x) => B([x, 0, 0.122], [0.003, 0.12, 0.006], 0.002, { sub: true, k: 0.002 })));
        for (const sy of [1, -1]) for (const sz of [1, -1]) P.push(E([0, sy * 0.13, sz * 0.1], [0.05, 0.025, 0.025], { k: 0.008, col: GOLD, ...shine() }));
        P.push(B([0, 0, -0.115], [0.035, 0.03, 0.012], 0.008, { k: 0.006, col: GOLD, ...shine() }));
        P.push(S([0.05, 0.02, -0.02], 0.035, { k: 0.01, col: g ? gem : GOLD, sheen: 1, glow: g ? 0.7 : 0 }), D([0.048, 0.02, -0.02], 0.045, 0.008, { k: 0.004, col: GOLD, rot: [0, Math.PI / 2, 0], ...shine() }));
        return { parts: P, paint: Q, cell: 0.008 };
      default: // the quiver, on the back
        P.push(C([0, -0.2, 0], [0, 0.18, 0], 0.08, { k: 0.02, col: color, fab: { grain: 1, stitch: 0.3 } }), D([0, 0.18, 0], 0.085, 0.02, { k: 0.01, col: GOLD, rot: [Math.PI / 2, 0, 0], ...shine() }));
        P.push(...[-0.1, 0.05].map((y) => D([0, y, 0], 0.085, 0.014, { k: 0.008, ...leather, rot: [Math.PI / 2, 0, 0] })));
        // Arrows with fletching.
        for (const [x, z, h, c] of [[0.035, 0.02, 0.36, '#efe6d4'], [-0.03, -0.02, 0.34, '#efe6d4'], [0, -0.04, 0.32, '#d06a4a']]) {
          P.push(C([x, 0.15, z], [x, h, z], 0.012, { k: 0.005, col: '#c8a070' }));
          for (let i = 0; i < 3; i++) {
            const a = (i / 3) * Math.PI * 2;
            P.push(E([x + Math.cos(a) * 0.014, h - 0.02, z + Math.sin(a) * 0.014], [0.006, 0.05, 0.02], { k: 0.004, col: c, rot: [0, -a, 0], fab: 'strands' }));
          }
        }
        return { parts: P, paint: Q, cell: 0.01 };
    }
  }
  // Head gear, made round the head.
  const [hx, hy, hz] = HEAD.c, [rx, ry, rz] = HEAD.r;
  const trim = glow ? light(glow, 0.2) : GOLD;
  const dome = (grow, lower, col, o = {}) => [E([hx, hy + 0.02, hz], [rx * grow, ry * grow, rz * grow], { k: 0.02, col, ...o }), B([0, lower - 0.5, 0], [1, 0.5, 1], 0.01, { sub: true, k: 0.02 })];
  // A band round the helm at height y (a ring a touch proud of the dome), with rivets.
  const band = (y, grow, n = 10, rivet = true, col = trim) => {
    const k = Math.sqrt(Math.max(0, 1 - ((y - hy - 0.02) / (ry * grow)) ** 2));
    P.push(E([0, y, hz], [rx * grow * k + 0.012, 0.035, rz * grow * k + 0.012], { k: 0.01, col, ...shine() }));
    if (rivet) rivetsAt(Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.3;
      return [Math.sin(a) * (rx * grow * k + 0.03), y, hz + Math.cos(a) * (rz * grow * k + 0.03)];
    }), 0.016, light(trim, 0.2));
  };
  // A plume of feathers (a fan of tapered locks) from the top of the helm toward the back.
  const plume = (col, at = [0, 0.9, -0.04]) => {
    for (let i = 0; i < 5; i++) {
      const u = i / 4 - 0.5;
      P.push(T(at, [u * 0.26, at[1] + 0.18 - Math.abs(u) * 0.16, at[2] - 0.42 - (0.25 - Math.abs(u)) * 0.25], 0.085, 0.025, { k: 0.03, col, glow: g ? 0.3 : 0, fab: 'strands' }));
    }
    P.push(S(at, 0.06, { k: 0.03, col: trim, ...shine() }));
  };
  switch (shape) {
    case 'full': {
      // A great helm: a dome that closes over the face, a brow ridge and a band of rivets, a visor with a
      // slit and breathing holes, cheek plates, a crest down the middle and a plume of feathers.
      P.push(...dome(1.08, 0.04, color, metal));
      P.push(E([0, 0.52, 0.42], [0.42, 0.06, 0.1], { k: 0.02, col: light(color, 0.15), ...metal }));
      // The slit and the breathing holes are shallow dents painted dark (the helm stays closed).
      P.push(E([0, 0.4, 0.52], [0.3, 0.024, 0.05], { sub: true, k: 0.01 }));
      P.push(...[0.25, 0.19].flatMap((y, r) => [-0.12, -0.04, 0.04, 0.12].map((x) => S([x + r * 0.04, y, 0.5 - r * 0.02], 0.016, { sub: true, k: 0.006 }))));
      Q.push(...[0.25, 0.19].flatMap((y, r) => [-0.12, -0.04, 0.04, 0.12].map((x) => S([x + r * 0.04, y, 0.48 - r * 0.02], 0.022, { col: HOLE, soft: 0.004 }))));
      P.push(E([0, 0.38, 0.46], [0.035, 0.26, 0.05], { k: 0.03, col: light(color, 0.2), ...metal }));
      P.push(...[1, -1].map((sx) => E([sx * 0.36, 0.2, 0.28], [0.12, 0.17, 0.14], { k: 0.03, col: color, ...metal, rot: [0, sx * 0.6, 0] })));
      P.push(E([0, 0.72, -0.01], [0.04, 0.3, 0.42], { k: 0.03, col: light(color, 0.2), ...metal }));
      band(0.08, 1.08, 12);
      rivetsAt([[0.3, 0.52, 0.42], [-0.3, 0.52, 0.42], [0.16, 0.55, 0.47], [-0.16, 0.55, 0.47]], 0.015, light(trim, 0.2));
      Q.push(E([0, 0.4, 0.49], [0.3, 0.032, 0.08], { col: HOLE, soft: 0.005 }));
      plume(glow ? light(glow, 0.1) : '#d04a3a', [0, 0.92, -0.02]);
      return { parts: P, paint: Q, cell: 0.02 };
    }
    case 'open':
    case 'horned': {
      P.push(...dome(1.07, 0.5, color, metal));
      // A nasal, cheek guards, a ridge over the top, a riveted band.
      P.push(T([0, 0.6, 0.47], [0, 0.36, 0.49], 0.034, 0.022, { k: 0.02, col: light(color, 0.15), ...metal }));
      P.push(...[1, -1].map((sx) => E([sx * 0.4, 0.42, 0.18], [0.07, 0.15, 0.13], { k: 0.025, col: color, ...metal, rot: [0, sx * 0.5, 0] })));
      P.push(E([0, 0.86, -0.01], [0.045, 0.06, 0.36], { k: 0.04, col: light(color, 0.2), ...metal }));
      band(0.53, 1.07, 10);
      if (shape === 'horned') for (const sx of [1, -1]) {
        P.push(T([sx * 0.42, 0.66, 0], [sx * 0.66, 0.84, 0.02], 0.1, 0.065, { k: 0.04, col: BONE }), T([sx * 0.66, 0.84, 0.02], [sx * 0.68, 1.08, -0.04], 0.065, 0.018, { k: 0.03, col: light(BONE, 0.3), glow: g ? 0.3 : 0 }));
        // Ridges round the horn, and a metal cuff where it meets the helm.
        P.push(...[0.3, 0.55].map((t) => D([sx * (0.42 + 0.24 * t), 0.66 + 0.18 * t, 0.01], 0.09 - t * 0.03, 0.012, { k: 0.008, col: dark(BONE, 0.15), rot: [0, Math.PI / 2, sx * 0.65] })));
        P.push(D([sx * 0.44, 0.67, 0], 0.1, 0.022, { k: 0.01, col: trim, rot: [0, Math.PI / 2, sx * 0.65], ...shine() }));
      }
      return { parts: P, paint: Q, cell: 0.02 };
    }
    case 'hood': {
      P.push(E([0, 0.45, -0.05], [0.56, 0.48, 0.5], { k: 0.03, col: color, fab: 'weave' }), E([0, 0.34, 0.42], [0.38, 0.33, 0.3], { sub: true, k: 0.03 }));
      // A turned-back rim round the face, a point down the back, a drawstring with toggles.
      P.push(E([0, 0.36, 0.4], [0.44, 0.39, 0.1], { k: 0.02, col: color, tone: 1.1, fab: { weave: 0.6, stitch: 0.8 } }), E([0, 0.34, 0.45], [0.37, 0.32, 0.16], { sub: true, k: 0.02 }));
      P.push(T([0, 0.78, -0.25], [0, 0.82, -0.6], 0.13, 0.025, { k: 0.06, col: color, fab: 'weave' }), E([0, 0.06, -0.06], [0.38, 0.07, 0.3], { k: 0.06, col: dark(color, 0.12), fab: 'weave' }));
      P.push(...[1, -1].map((sx) => T([sx * 0.12, 0.05, 0.36], [sx * 0.14, -0.1, 0.4], 0.012, 0.01, { k: 0.004, col: '#e8dcc0' })), ...[1, -1].map((sx) => E([sx * 0.14, -0.12, 0.4], [0.02, 0.032, 0.02], { k: 0.004, col: trim, sheen: 0.6 })));
      Q.push(E([0, 0.34, 0.46], [0.42, 0.37, 0.08], { col: dark(color, 0.3), soft: 0.02 }), E([0, 0.05, 0.4], [0.5, 0.04, 0.1], { col: trim, glow: g ? 0.4 : 0, soft: 0.005 }));
      Q.push(E([0, 0.6, -0.1], [0.02, 0.45, 0.6], { fab: 'stitch', soft: 0.01 }));
      return { parts: P, paint: Q, cell: 0.026 };
    }
    case 'cap': {
      P.push(...dome(1.06, 0.62, color, { fab: 'weave' }));
      P.push(E([0, 0.63, 0.34], [0.34, 0.035, 0.16], { k: 0.03, col: dark(color, 0.15), fab: 'weave' }));
      band(0.66, 1.06, 0, false);
      // A feather: a quill and two rows of barbs.
      const fc = glow ?? '#e05040';
      P.push(T([0.38, 0.74, -0.12], [0.5, 0.96, -0.3], 0.05, 0.03, { k: 0.02, col: fc, glow: g ? 0.4 : 0, fab: 'strands' }), T([0.5, 0.96, -0.3], [0.5, 1.12, -0.46], 0.03, 0.01, { k: 0.02, col: light(fc, 0.3), glow: g ? 0.4 : 0, fab: 'strands' }));
      P.push(C([0.37, 0.72, -0.1], [0.5, 1.1, -0.44], 0.008, { k: 0.002, col: light(fc, 0.6) }));
      return { parts: P, paint: Q, cell: 0.019 };
    }
    case 'wizard': {
      P.push(D([0, 0.74, -0.01], 0.66, 0.03, { k: 0.03, col: color, rot: [Math.PI / 2, 0, 0], fab: 'weave' }));
      P.push(D([0, 0.705, -0.01], 0.6, 0.012, { k: 0.005, col: dark(color, 0.2), rot: [Math.PI / 2, 0, 0] }));
      // A crumpled cone: three segments, each bent a little more, a band with a buckle, stars.
      P.push(T([0, 0.74, -0.02], [0, 1.08, -0.06], 0.42, 0.2, { k: 0.06, col: color, fab: 'weave' }), T([0, 1.08, -0.06], [0.04, 1.28, -0.2], 0.2, 0.1, { k: 0.05, col: color, fab: 'weave' }), T([0.04, 1.28, -0.2], [0.02, 1.36, -0.42], 0.1, 0.03, { k: 0.04, col: color, fab: 'weave' }));
      P.push(E([0, 0.8, -0.02], [0.44, 0.05, 0.44], { k: 0.01, col: trim, glow: g ? 0.4 : 0 }), B([0, 0.8, 0.43], [0.06, 0.05, 0.02], 0.012, { k: 0.006, col: GOLD, ...shine() }), B([0, 0.8, 0.46], [0.032, 0.026, 0.03], 0.006, { sub: true, k: 0.004 }));
      P.push(S([0.2, 1.0, 0.3], 0.045, { k: 0.01, col: g ? gem : GOLD, sheen: 1, glow: g ? 0.8 : 0.2 }), S([-0.16, 1.12, 0.18], 0.03, { k: 0.01, col: g ? gem : GOLD, sheen: 1, glow: g ? 0.8 : 0.2 }), S([0.03, 1.38, -0.44], 0.035, { k: 0.01, col: g ? gem : GOLD, sheen: 1, glow: g ? 0.8 : 0.2 }));
      return { parts: P, paint: Q, cell: 0.023 };
    }
    case 'circlet':
    default: {
      P.push(D([0, 0.6, -0.01], 0.49, 0.03, { k: 0.01, col: trim, rot: [Math.PI / 2, 0, 0], ...shine() }), D([0, 0.6, -0.01], 0.36, 0.1, { sub: true, k: 0.01, rot: [Math.PI / 2, 0, 0] }));
      // Filigree: little leaves round the band; a big gem at the front, two small at the temples.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        P.push(E([Math.sin(a) * 0.5, 0.64, Math.cos(a) * 0.49 - 0.01], [0.03, 0.04, 0.012], { k: 0.006, col: trim, rot: [0, a, 0], ...shine() }));
      }
      P.push(E([0, 0.65, 0.48], [0.065, 0.08, 0.035], { k: 0.02, col: glow ?? '#7ad8ff', sheen: 1, glow: 0.8 }), D([0, 0.65, 0.47], 0.08, 0.012, { k: 0.006, col: trim, ...shine() }));
      P.push(...[1, -1].map((sx) => S([sx * 0.4, 0.62, 0.3], 0.028, { k: 0.008, col: glow ?? '#7ad8ff', sheen: 1, glow: 0.7 })));
      return { parts: P, paint: Q, cell: 0.013 };
    }
  }
}

/** The sculpting recipe of a piece (sdf.js), and the grid it is built on per detail. */
function gearModel(kind, args) {
  const R = gearRecipe(kind, args);
  const recipe = { slots: [], bones: [['root', null, 0, 0, 0]], parts: R.parts.map((p) => ({ ...p, bone: 'root' })), paint: R.paint, blend: 0.004, ao: 0.8, fabSlots: {} };
  const model = compile(recipe);
  const b = model.box;
  const longest = Math.max(b[3] - b[0], b[4] - b[1], b[5] - b[2]);
  // Near: the piece's own fine cell; far (and every outline and shadow): about a fifth of the triangles.
  return { recipe, model, res: { near: Math.min(150, Math.ceil(longest / R.cell)), far: Math.max(18, Math.min(64, Math.ceil(longest / (R.cell * 2.2)))) } };
}
const gearKey = (kind, args, lod) => `${kind}|${args.shape}|${args.color}|${args.glow ?? ''}|${lod}`;

/** A piece of gear as a smooth sculpted geometry, built now (cached): sculptedGear('weapon' | 'offhand' | 'head', { shape, color, glow }, lod). */
export function sculptedGear(kind, args, lod = 'near') {
  const key = gearKey(kind, args, lod);
  if (sculpted.has(key)) return sculpted.get(key);
  const { model, res } = gearModel(kind, args);
  const geo = sculpt(model, { res: res[lod] ?? res.near, rigid: true });
  sculpted.set(key, geo);
  return geo;
}

/**
 * A piece of gear if it is built, else null — and it is asked for in the
 * background (build.js: the worker), so equipping never stalls a frame.
 * `urgent`: someone is wearing it now (else it is pre-warming).
 */
export function gearReady(kind, args, lod = 'near', { urgent = true } = {}) {
  const key = gearKey(kind, args, lod);
  const g = sculpted.get(key);
  if (g) return g;
  enqueue(key, () => {
    const { recipe, res } = gearModel(kind, args);
    return { recipe, res: res[lod] ?? res.near };
  }, (geo) => (sculpted.has(key) ? geo.dispose() : sculpted.set(key, geo)), { urgent, rigid: true });
  return null;
}

/** Every piece's shape name, by kind (the tests sculpt them all). */
export const GEAR_SHAPES = {
  weapon: ['shortsword', 'longsword', 'dagger', 'axe', 'mace', 'hammer', 'spear', 'staff', 'bow'],
  offhand: ['buckler', 'kite', 'tower', 'tome', 'quiver'],
  head: ['open', 'horned', 'full', 'hood', 'cap', 'wizard', 'circlet']
};

/** How far apart the cape's three hinges are (rig.js swings each a little more than the one above). */
export const CAPE_STEP = 0.2;

/**
 * The cape { color, hem } as one soft sheet in the vinyl material, skinned to
 * its three hinges (rig.js): it widens from the shoulders to a rounded hem
 * and wraps round the back, with a rolled collar; the seams between hinges
 * blend, so it bends rather than breaking into strips. A rare-or-better cape's
 * hem and collar glow. Its frame: the top hinge at the origin, hanging to −Y,
 * the inside toward +Z.
 */
export function smoothCapeGeometry({ color, hem = null }) {
  const key = `${color}|${hem}`;
  if (cache.has(key)) return cache.get(key);
  const L = CAPE_STEP * 3 + 0.02, th = 0.03, wrap = 1.3;
  const width = (v) => 0.44 + 0.24 * v;
  const pos = [], nor = [], col = [], tone = [], glw = [], fab = [], si = [], sw = [], idx = [];
  const cloth = hexToLinear(color), inner = cloth.map((c) => c * 0.62);
  const band = hexToLinear(hem ?? mix(color, '#140c18', 0.25));
  // Bone weights by height: rigid within a strip, blended across each seam.
  const weights = (y) => {
    const t = -y / CAPE_STEP;
    const seam = Math.round(t);
    if (seam >= 1 && seam <= 2 && Math.abs(t - seam) < 0.22) {
      const k = (t - seam + 0.22) / 0.44;
      return [[seam - 1, 1 - k], [seam, k]];
    }
    return [[Math.max(0, Math.min(2, Math.floor(t))), 1]];
  };
  const push = (g, rgb, inside, { toneK = 1, sheen = 0.05, glow = 0, f = [1, 0, 0, 0] } = {}) => {
    const base = pos.length / 3;
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      pos.push(x, y, z);
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      const c = inside && n.getZ(i) > 0.5 ? inner : rgb;
      col.push(...c);
      tone.push(toneK, sheen);
      glw.push(glow);
      fab.push(...f);
      const w = weights(y);
      si.push(w[0][0], w[1]?.[0] ?? 0, 0, 0);
      sw.push(w[0][1], w[1]?.[1] ?? 0, 0, 0);
    }
    const ix = g.index;
    for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + base);
    g.dispose();
  };
  // The sheet: a thin slab, bent into shape.
  const sheet = new THREE.BoxGeometry(1, 1, th, 14, 18, 1);
  const sp = sheet.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const u = sp.getX(i), v = 0.5 - sp.getY(i), z = sp.getZ(i);
    const x = u * width(v);
    // The hem is rounded at its corners and scalloped a little in the middle.
    const hemLift = v > 0.999 ? (Math.abs(u) * 2) ** 3 * 0.09 - Math.cos(u * Math.PI * 6) * 0.012 : 0;
    sp.setXYZ(i, x, -v * L + hemLift, z + x * x * wrap - v * 0.03);
  }
  sheet.computeVertexNormals();
  push(sheet, cloth, true, { f: [1, 0, 0, 0] });
  // The collar, rolled along the top.
  const collar = new THREE.CapsuleGeometry(0.048, width(0) * 0.9, 4, 12).rotateZ(Math.PI / 2);
  const cp = collar.attributes.position;
  for (let i = 0; i < cp.count; i++) cp.setXYZ(i, cp.getX(i), cp.getY(i) + 0.005, cp.getZ(i) + cp.getX(i) ** 2 * wrap + 0.012);
  collar.computeVertexNormals();
  push(collar, band, false, { toneK: 1.05, sheen: 0.2, glow: hem ? 0.35 : 0, f: [0.6, 0, 0, 0.8] });
  // A hem band, stitched on.
  const hb = new THREE.CapsuleGeometry(0.02, width(1) * 0.86, 3, 14).rotateZ(Math.PI / 2);
  const hp = hb.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i);
    hp.setXYZ(i, x, hp.getY(i) - L + 0.035 + (Math.abs(x / width(1)) * 2) ** 3 * 0.09, hp.getZ(i) + x * x * wrap - 0.03 - 0.005);
  }
  hb.computeVertexNormals();
  push(hb, band, false, { sheen: 0.2, glow: hem ? 0.35 : 0, f: [0, 0, 0, 1] });
  const geo = new THREE.BufferGeometry();
  const n = pos.length / 3;
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('aSlotA', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  geo.setAttribute('aSlotB', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  geo.setAttribute('aTone', new THREE.Float32BufferAttribute(tone, 2));
  geo.setAttribute('aGlow', new THREE.Float32BufferAttribute(glw, 1));
  geo.setAttribute('aFab', new THREE.Float32BufferAttribute(fab, 4));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  geo.boundingSphere.radius += 0.3; // it swings
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
