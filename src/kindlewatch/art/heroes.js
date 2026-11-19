/**
 * The two heroes, painted as cut-out puppets: each limb its own inked,
 * cel-shaded piece with its pivot at the joint (paint.js), rigged and
 * animated in puppet.js. Two views each — facing the camera and facing away
 * — mirrored for left and right.
 *
 * The Hornwarden: steel plate under a grey fur mantle, a great helm with
 * curling ivory horns and ember-lit eye slits, a crimson cloak, a kite
 * shield with a gold flame, a broad longsword.
 * The Veilrunner: a deep-teal hood over a shadowed face with two pale
 * lights for eyes, a rust scarf that trails behind, a leather coat, wrapped
 * shins, an ash spear with a bronze leaf blade, a lantern on the hip.
 */
import { Sprite, paintShape, shapes, inkLine, seeded, mix, INK } from '../paint.js';
import { RAMPS } from './props.js';

export const CPU = 128; // character sprites: pixels per tile
const U = CPU;

const R = {
  steel: ['#202638', '#3a4660', '#5c6c8c', '#8c9ebc', '#d4e0f0'],
  steelDark: ['#161a28', '#262e44', '#3c4864', '#5c6c8c', '#90a0bc'],
  fur: ['#2a2220', '#4a3c34', '#6e5c4e', '#98846e', '#c8b498'],
  crimson: ['#2a0a14', '#4e1222', '#7c1c30', '#a83440', '#d8645a'],
  ivory: ['#5a4a38', '#8c7a60', '#bcaa88', '#e2d6b4', '#fff8e4'],
  gold: RAMPS.gold,
  leather: ['#24140e', '#40261a', '#62402a', '#8a6040', '#b88a5c'],
  teal: ['#0c1e24', '#16343e', '#24525c', '#3a7a80', '#6aaaa8'],
  rust: ['#3a1208', '#6a2410', '#a03c18', '#d0642a', '#f49a52'],
  wrap: ['#3a3430', '#5e544a', '#857868', '#ad9e88', '#d8cab0'],
  ash: ['#3a2814', '#62482a', '#8c6c44', '#b89466', '#e0c494'],
  bronze: RAMPS.bronze,
  skinShadow: ['#120c16', '#1e1624', '#2c2234', '#3e3248', '#584a62'],
  blueField: ['#0c1430', '#18264e', '#26407a', '#3a5ea8', '#6a8ed0']
};

/** A part: w × h tiles, pivot (px, py) in tiles from its top-left. `paint(g)` draws with the origin at the pivot. */
function part(name, w, h, px, py, paint, { glow = false, ink = 3.2, radius } = {}) {
  const s = new Sprite(name, Math.round(w * U), Math.round(h * U), { ox: px * U, oy: py * U, ppu: U, glow });
  s.g.save();
  s.g.translate(px * U, py * U);
  paint(s.g, s);
  s.g.restore();
  if (radius) s.height.radius = radius;
  s.ink(ink);
  return s.bake();
}

const P = (g, path, ramp, box, o = {}) => paintShape(g, path, { ramp, box, ...o });
const bx = (x, y, w, h) => [x * U, y * U, w * U, h * U];

/* ============================================================ the Hornwarden */

function wardenHorn(g, side, back) {
  // A thick horn sweeping out and curling up, ivory with dark ridges.
  const s = side;
  const p = new Path2D();
  p.moveTo(s * 0.1 * U, -0.3 * U);
  p.bezierCurveTo(s * 0.32 * U, -0.36 * U, s * 0.42 * U, -0.5 * U, s * 0.36 * U, -0.66 * U);
  p.bezierCurveTo(s * 0.33 * U, -0.72 * U, s * 0.28 * U, -0.7 * U, s * 0.3 * U, -0.64 * U);
  p.bezierCurveTo(s * 0.33 * U, -0.52 * U, s * 0.24 * U, -0.44 * U, s * 0.1 * U, -0.42 * U);
  p.closePath();
  P(g, p, R.ivory, bx(Math.min(0, s * 0.44), -0.74, 0.44, 0.46), { tex: 'brush', shade: 0.28, lit: 0.18, rim: 2.5, ink: 2.4, seed: back ? 7 : 3 });
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    const x = s * (0.16 + t * 0.2) * U;
    const y = (-0.37 - t * 0.2) * U;
    inkLine(g, [[x, y - 5], [x + s * 6, y + 5]], 2, R.ivory[0], 0.7);
  }
}

export function wardenParts() {
  const out = [];
  // ---- head, facing the camera: a rounded great helm, T-slit, horns.
  out.push(part('warden/head-f', 1.0, 0.9, 0.5, 0.82, (g, s) => {
    wardenHorn(g, -1, false);
    wardenHorn(g, 1, false);
    const helm = shapes.blob([[-0.2 * U, 0], [0.2 * U, 0], [0.24 * U, -0.18 * U], [0.22 * U, -0.38 * U], [0.1 * U, -0.5 * U], [-0.1 * U, -0.5 * U], [-0.22 * U, -0.38 * U], [-0.24 * U, -0.18 * U]], 0.55);
    P(g, helm, R.steel, bx(-0.24, -0.5, 0.48, 0.5), { tex: 'metal', shade: 0.3, lit: 0.22, rim: 3, ink: 2.8, seed: 11, gloss: 0.7 });
    // crest ridge
    inkLine(g, [[0.02 * U, -0.48 * U], [0.03 * U, -0.3 * U]], 3, R.steel[0], 0.6);
    // the eye slit: dark, with two ember eyes
    const slit = shapes.rrect(-0.15 * U, -0.27 * U, 0.3 * U, 0.06 * U, 4);
    g.fillStyle = '#0a0812';
    g.fill(slit);
    const nose = shapes.rrect(-0.025 * U, -0.27 * U, 0.05 * U, 0.2 * U, 3);
    g.fill(nose);
    for (const x of [-0.08, 0.08]) {
      const e = shapes.ellipse(x * U, -0.24 * U, 0.032 * U, 0.018 * U);
      g.fillStyle = '#ffb04a';
      g.fill(e);
      s.glow(e, 1, 1.5);
    }
    // rivets
    g.fillStyle = R.steel[4];
    for (const x of [-0.17, 0.17]) {
      g.beginPath();
      g.arc(x * U, -0.12 * U, 3, 0, Math.PI * 2);
      g.fill();
    }
  }, { glow: true }));
  // ---- head from behind
  out.push(part('warden/head-b', 1.0, 0.9, 0.5, 0.82, (g) => {
    wardenHorn(g, -1, true);
    wardenHorn(g, 1, true);
    const helm = shapes.blob([[-0.2 * U, 0], [0.2 * U, 0], [0.24 * U, -0.18 * U], [0.22 * U, -0.38 * U], [0.1 * U, -0.5 * U], [-0.1 * U, -0.5 * U], [-0.22 * U, -0.38 * U], [-0.24 * U, -0.18 * U]], 0.55);
    P(g, helm, R.steel, bx(-0.24, -0.5, 0.48, 0.5), { tex: 'metal', shade: 0.3, lit: 0.22, rim: 3, ink: 2.8, seed: 12, gloss: 0.5 });
    inkLine(g, [[0, -0.48 * U], [0, -0.04 * U]], 3, R.steel[0], 0.7);
    // a crimson plume falling down the back
    const plume = shapes.blob([[-0.04 * U, -0.46 * U], [0.06 * U, -0.44 * U], [0.08 * U, -0.2 * U], [0.03 * U, 0.02 * U], [-0.05 * U, -0.18 * U]]);
    P(g, plume, R.crimson, bx(-0.05, -0.46, 0.13, 0.48), { tex: 'fur', ink: 2.2, seed: 13 });
  }));
  // ---- torso, front: breastplate, fur mantle across the shoulders, a belt with a gold buckle.
  const torso = (back) => (g) => {
    const plate = shapes.blob([[-0.2 * U, 0], [0.2 * U, 0], [0.24 * U, -0.2 * U], [0.27 * U, -0.42 * U], [0.12 * U, -0.5 * U], [-0.12 * U, -0.5 * U], [-0.27 * U, -0.42 * U], [-0.24 * U, -0.2 * U]], 0.4);
    P(g, plate, back ? R.steelDark : R.steel, bx(-0.27, -0.5, 0.54, 0.5), { tex: 'metal', shade: 0.32, lit: 0.2, rim: 3, ink: 3, seed: back ? 21 : 20, gloss: back ? 0 : 0.6 });
    if (!back) {
      inkLine(g, [[0, -0.42 * U], [0, -0.12 * U]], 2.4, R.steel[0], 0.6);
      // a gold flame on the breast
      const f = new Path2D();
      f.moveTo(0, -0.38 * U);
      f.quadraticCurveTo(0.07 * U, -0.28 * U, 0.02 * U, -0.2 * U);
      f.quadraticCurveTo(0, -0.26 * U, -0.02 * U, -0.2 * U);
      f.quadraticCurveTo(-0.07 * U, -0.28 * U, 0, -0.38 * U);
      P(g, f, R.gold, bx(-0.07, -0.38, 0.14, 0.18), { tex: 'none', ink: 1.8, seed: 22 });
    }
    // belt
    const belt = shapes.rrect(-0.22 * U, -0.11 * U, 0.44 * U, 0.08 * U, 4);
    P(g, belt, R.leather, bx(-0.22, -0.11, 0.44, 0.08), { tex: 'brush', ink: 2, seed: 23 });
    if (!back) {
      const buckle = shapes.rrect(-0.04 * U, -0.115 * U, 0.08 * U, 0.09 * U, 2);
      P(g, buckle, R.gold, bx(-0.04, -0.12, 0.08, 0.09), { tex: 'none', ink: 1.6, seed: 24 });
    }
    // tassets (plates over the hips)
    for (const k of [-1, 1]) {
      const t = shapes.rrect((k < 0 ? -0.21 : 0.03) * U, -0.04 * U, 0.18 * U, 0.12 * U, 5);
      P(g, t, R.steelDark, bx(k < 0 ? -0.21 : 0.03, -0.04, 0.18, 0.12), { tex: 'metal', ink: 2, seed: 25 + k });
    }
    // fur mantle
    const mantle = shapes.blob([[-0.34 * U, -0.36 * U], [-0.2 * U, -0.54 * U], [0, -0.58 * U], [0.2 * U, -0.54 * U], [0.34 * U, -0.36 * U], [0.22 * U, -0.32 * U], [0.1 * U, -0.38 * U], [-0.1 * U, -0.38 * U], [-0.22 * U, -0.32 * U]], 0.6);
    P(g, mantle, R.fur, bx(-0.34, -0.58, 0.68, 0.26), { tex: 'fur', shade: 0.3, lit: 0.2, rim: 2.5, ink: 2.6, seed: back ? 27 : 26 });
  };
  out.push(part('warden/torso-f', 0.8, 0.7, 0.4, 0.66, torso(false)));
  out.push(part('warden/torso-b', 0.8, 0.7, 0.4, 0.66, torso(true)));
  // ---- cloak: hangs from the shoulders (pivot at the top)
  out.push(part('warden/cape', 0.7, 0.8, 0.35, 0.06, (g) => {
    const c = shapes.blob([[-0.22 * U, 0], [0.22 * U, 0], [0.28 * U, 0.4 * U], [0.3 * U, 0.66 * U], [0.12 * U, 0.6 * U], [0, 0.7 * U], [-0.14 * U, 0.6 * U], [-0.3 * U, 0.66 * U], [-0.27 * U, 0.38 * U]], 0.45);
    P(g, c, R.crimson, bx(-0.3, 0, 0.6, 0.7), { tex: 'cloth', shade: 0.3, lit: 0.16, rim: 2, ink: 2.8, seed: 30 });
    for (const x of [-0.12, 0.02, 0.15]) inkLine(g, [[x * U, 0.1 * U], [x * U + 4, 0.56 * U]], 2.2, R.crimson[0], 0.55);
  }));
  // ---- arms: pivot at the shoulder, hanging down; a pauldron, a gauntlet.
  const arm = (dark) => (g) => {
    const r = dark ? R.steelDark : R.steel;
    const a = shapes.limb(0, 0.02 * U, 0.075 * U, 0, 0.36 * U, 0.06 * U);
    P(g, a, r, bx(-0.08, 0, 0.16, 0.42), { tex: 'metal', shade: 0.32, lit: 0.2, rim: 2, ink: 2.4, seed: dark ? 41 : 40 });
    inkLine(g, [[-0.06 * U, 0.2 * U], [0.06 * U, 0.2 * U]], 2, r[0], 0.6);
    const glove = shapes.ellipse(0, 0.39 * U, 0.075 * U, 0.07 * U);
    P(g, glove, R.leather, bx(-0.075, 0.32, 0.15, 0.14), { tex: 'brush', ink: 2.2, seed: 42 });
    const pauld = shapes.blob([[-0.12 * U, 0.02 * U], [-0.06 * U, -0.08 * U], [0.08 * U, -0.08 * U], [0.13 * U, 0.03 * U], [0.08 * U, 0.12 * U], [-0.08 * U, 0.12 * U]], 0.6);
    P(g, pauld, r, bx(-0.13, -0.08, 0.26, 0.2), { tex: 'metal', shade: 0.3, lit: 0.22, rim: 2.5, ink: 2.6, seed: dark ? 44 : 43, gloss: dark ? 0 : 0.5 });
  };
  out.push(part('warden/arm', 0.4, 0.62, 0.2, 0.14, arm(false)));
  out.push(part('warden/arm-far', 0.4, 0.62, 0.2, 0.14, arm(true)));
  // ---- legs: pivot at the hip; greave and a fur-topped boot.
  out.push(part('warden/leg', 0.36, 0.6, 0.18, 0.06, (g) => {
    const thigh = shapes.limb(0, 0, 0.085 * U, 0, 0.3 * U, 0.075 * U);
    P(g, thigh, R.leather, bx(-0.09, 0, 0.18, 0.32), { tex: 'brush', ink: 2.2, seed: 50 });
    const greave = shapes.rrect(-0.08 * U, 0.2 * U, 0.16 * U, 0.2 * U, 6);
    P(g, greave, R.steel, bx(-0.08, 0.2, 0.16, 0.2), { tex: 'metal', shade: 0.3, rim: 2, ink: 2.4, seed: 51 });
    const boot = shapes.blob([[-0.08 * U, 0.38 * U], [0.08 * U, 0.38 * U], [0.13 * U, 0.48 * U], [0.1 * U, 0.53 * U], [-0.09 * U, 0.53 * U]], 0.4);
    P(g, boot, R.leather, bx(-0.09, 0.38, 0.22, 0.15), { tex: 'brush', ink: 2.4, seed: 52 });
    const cuff = shapes.ellipse(0, 0.38 * U, 0.1 * U, 0.04 * U);
    P(g, cuff, R.fur, bx(-0.1, 0.34, 0.2, 0.08), { tex: 'fur', ink: 2, seed: 53 });
  }));
  // ---- sword: pivot at the grip; blade points down (along the arm).
  out.push(part('warden/sword', 0.34, 1.12, 0.17, 0.2, (g) => {
    const pommel = shapes.ellipse(0, -0.14 * U, 0.04 * U, 0.04 * U);
    P(g, pommel, R.gold, bx(-0.04, -0.18, 0.08, 0.08), { tex: 'none', ink: 2, seed: 60 });
    const grip = shapes.rrect(-0.025 * U, -0.12 * U, 0.05 * U, 0.16 * U, 3);
    P(g, grip, R.leather, bx(-0.025, -0.12, 0.05, 0.16), { tex: 'none', ink: 2, seed: 61 });
    const guard = shapes.blob([[-0.14 * U, 0.04 * U], [0, 0.02 * U], [0.14 * U, 0.04 * U], [0.15 * U, 0.08 * U], [0, 0.08 * U], [-0.15 * U, 0.08 * U]], 0.4);
    P(g, guard, R.gold, bx(-0.15, 0.02, 0.3, 0.06), { tex: 'metal', ink: 2.2, seed: 62 });
    const blade = shapes.poly([[-0.05 * U, 0.08 * U], [0.05 * U, 0.08 * U], [0.045 * U, 0.78 * U], [0, 0.88 * U], [-0.045 * U, 0.78 * U]]);
    P(g, blade, ['#3a4860', '#6a7c98', '#a8b8cc', '#dce6f0', '#ffffff'], bx(-0.05, 0.08, 0.1, 0.8), { tex: 'metal', shade: 0.35, lit: 0.3, rim: 2, ink: 2.4, seed: 63, light: [-1, 0] });
    inkLine(g, [[0, 0.12 * U], [0, 0.72 * U]], 1.8, '#3a4860', 0.7);
  }));
  // ---- kite shield: pivot at its centre; deep blue field, gold rim and flame.
  out.push(part('warden/shield', 0.62, 0.78, 0.31, 0.34, (g) => {
    const sh = new Path2D();
    sh.moveTo(-0.25 * U, -0.28 * U);
    sh.quadraticCurveTo(0, -0.36 * U, 0.25 * U, -0.28 * U);
    sh.quadraticCurveTo(0.26 * U, 0.12 * U, 0, 0.4 * U);
    sh.quadraticCurveTo(-0.26 * U, 0.12 * U, -0.25 * U, -0.28 * U);
    sh.closePath();
    P(g, sh, R.gold, bx(-0.26, -0.36, 0.52, 0.76), { tex: 'metal', shade: 0.3, rim: 2, ink: 3, seed: 70 });
    const inner = new Path2D();
    inner.moveTo(-0.2 * U, -0.24 * U);
    inner.quadraticCurveTo(0, -0.31 * U, 0.2 * U, -0.24 * U);
    inner.quadraticCurveTo(0.2 * U, 0.1 * U, 0, 0.33 * U);
    inner.quadraticCurveTo(-0.2 * U, 0.1 * U, -0.2 * U, -0.24 * U);
    inner.closePath();
    P(g, inner, R.blueField, bx(-0.2, -0.31, 0.4, 0.64), { tex: 'cloth', shade: 0.3, lit: 0.2, ink: 2, seed: 71 });
    const f = new Path2D();
    f.moveTo(0, -0.2 * U);
    f.quadraticCurveTo(0.12 * U, -0.02 * U, 0.03 * U, 0.14 * U);
    f.quadraticCurveTo(0, 0.04 * U, -0.03 * U, 0.14 * U);
    f.quadraticCurveTo(-0.12 * U, -0.02 * U, 0, -0.2 * U);
    P(g, f, R.gold, bx(-0.12, -0.2, 0.24, 0.34), { tex: 'none', shade: 0.25, ink: 2, seed: 72 });
  }));
  return out;
}

/* ============================================================ the Veilrunner */

export function runnerParts() {
  const out = [];
  const hood = (back) => (g, s) => {
    // the scarf tail behind the hood
    const h = shapes.blob([[-0.2 * U, 0], [0.2 * U, 0], [0.24 * U, -0.2 * U], [0.18 * U, -0.4 * U], [0.04 * U, -0.52 * U], [-0.02 * U, -0.5 * U], [-0.16 * U, -0.42 * U], [-0.24 * U, -0.2 * U]], 0.55);
    P(g, h, R.teal, bx(-0.24, -0.52, 0.48, 0.52), { tex: 'cloth', shade: 0.32, lit: 0.2, rim: 3, ink: 2.8, seed: back ? 101 : 100 });
    // the hood's peak flops forward
    const peak = shapes.blob([[0.02 * U, -0.5 * U], [0.14 * U, -0.46 * U], [0.22 * U, -0.36 * U], [0.12 * U, -0.4 * U]]);
    P(g, peak, R.teal, bx(0.02, -0.5, 0.2, 0.14), { tex: 'cloth', ink: 2.2, seed: 102 });
    // ochre trim
    if (!back) {
      const face = shapes.ellipse(0.02 * U, -0.2 * U, 0.14 * U, 0.13 * U);
      P(g, face, R.skinShadow, bx(-0.12, -0.33, 0.28, 0.26), { tex: 'none', shade: 0.3, ink: 2.4, seed: 103, inkColor: R.leather[2] });
      for (const x of [-0.04, 0.07]) {
        const e = shapes.ellipse(x * U, -0.21 * U, 0.024 * U, 0.03 * U);
        g.fillStyle = '#d8f4ff';
        g.fill(e);
        s.glow(e, 1, 1.5);
      }
      // scarf over the mouth
      const scarf = shapes.blob([[-0.16 * U, -0.12 * U], [0.18 * U, -0.13 * U], [0.2 * U, -0.02 * U], [0, 0.03 * U], [-0.18 * U, -0.02 * U]], 0.5);
      P(g, scarf, R.rust, bx(-0.18, -0.13, 0.38, 0.16), { tex: 'cloth', shade: 0.3, rim: 2, ink: 2.4, seed: 104 });
    } else {
      inkLine(g, [[0, -0.46 * U], [-0.02 * U, -0.06 * U]], 2.4, R.teal[0], 0.6);
      const scarf = shapes.blob([[-0.18 * U, -0.1 * U], [0.18 * U, -0.1 * U], [0.18 * U, 0.02 * U], [-0.18 * U, 0.02 * U]], 0.5);
      P(g, scarf, R.rust, bx(-0.18, -0.1, 0.36, 0.12), { tex: 'cloth', ink: 2.4, seed: 105 });
    }
  };
  out.push(part('runner/head-f', 0.7, 0.7, 0.35, 0.62, hood(false), { glow: true }));
  out.push(part('runner/head-b', 0.7, 0.7, 0.35, 0.62, hood(true)));
  const torso = (back) => (g) => {
    const coat = shapes.blob([[-0.17 * U, 0.02 * U], [0.17 * U, 0.02 * U], [0.2 * U, -0.2 * U], [0.22 * U, -0.4 * U], [0.1 * U, -0.47 * U], [-0.1 * U, -0.47 * U], [-0.22 * U, -0.4 * U], [-0.2 * U, -0.2 * U]], 0.45);
    P(g, coat, R.leather, bx(-0.22, -0.47, 0.44, 0.5), { tex: 'brush', shade: 0.32, lit: 0.2, rim: 2.5, ink: 2.8, seed: back ? 111 : 110 });
    // a teal tabard down the front, a sash
    if (!back) {
      const tab = shapes.rrect(-0.07 * U, -0.42 * U, 0.14 * U, 0.44 * U, 6);
      P(g, tab, R.teal, bx(-0.07, -0.42, 0.14, 0.44), { tex: 'cloth', ink: 2, seed: 112 });
    }
    const sash = shapes.poly([[-0.2 * U, -0.16 * U], [0.2 * U, -0.22 * U], [0.21 * U, -0.13 * U], [-0.19 * U, -0.07 * U]]);
    P(g, sash, R.rust, bx(-0.2, -0.22, 0.41, 0.15), { tex: 'cloth', ink: 2.2, seed: 113 });
    const collar = shapes.blob([[-0.2 * U, -0.38 * U], [0, -0.5 * U], [0.2 * U, -0.38 * U], [0.12 * U, -0.33 * U], [-0.12 * U, -0.33 * U]]);
    P(g, collar, R.teal, bx(-0.2, -0.5, 0.4, 0.17), { tex: 'cloth', ink: 2.2, seed: 114 });
  };
  out.push(part('runner/torso-f', 0.62, 0.62, 0.31, 0.58, torso(false)));
  out.push(part('runner/torso-b', 0.62, 0.62, 0.31, 0.58, torso(true)));
  // a long rust scarf, trailing (pivot at the neck)
  out.push(part('runner/cape', 0.42, 0.9, 0.21, 0.06, (g) => {
    const c = shapes.blob([[-0.08 * U, 0], [0.08 * U, 0], [0.1 * U, 0.3 * U], [0.12 * U, 0.6 * U], [0.06 * U, 0.78 * U], [0.02 * U, 0.66 * U], [-0.04 * U, 0.8 * U], [-0.1 * U, 0.6 * U], [-0.09 * U, 0.3 * U]], 0.5);
    P(g, c, R.rust, bx(-0.12, 0, 0.24, 0.8), { tex: 'cloth', shade: 0.3, lit: 0.2, rim: 2, ink: 2.4, seed: 120 });
  }));
  const arm = (dark) => (g) => {
    const r = dark ? R.leather.map((c) => mix(c, '#000000', 0.25)) : R.leather;
    const a = shapes.limb(0, 0, 0.06 * U, 0, 0.34 * U, 0.05 * U);
    P(g, a, r, bx(-0.06, 0, 0.12, 0.38), { tex: 'brush', shade: 0.3, rim: 2, ink: 2.2, seed: dark ? 131 : 130 });
    const wrap = shapes.rrect(-0.055 * U, 0.2 * U, 0.11 * U, 0.12 * U, 4);
    P(g, wrap, R.wrap, bx(-0.055, 0.2, 0.11, 0.12), { tex: 'cloth', ink: 2, seed: 132 });
    for (let i = 0; i < 3; i++) inkLine(g, [[-0.05 * U, (0.22 + i * 0.035) * U], [0.05 * U, (0.24 + i * 0.035) * U]], 1.4, R.wrap[0], 0.6);
    const hand = shapes.ellipse(0, 0.36 * U, 0.055 * U, 0.05 * U);
    P(g, hand, R.skinShadow.map((c) => mix(c, '#8a6a5a', 0.6)), bx(-0.055, 0.31, 0.11, 0.1), { tex: 'none', ink: 2, seed: 133 });
  };
  out.push(part('runner/arm', 0.3, 0.56, 0.15, 0.1, arm(false)));
  out.push(part('runner/arm-far', 0.3, 0.56, 0.15, 0.1, arm(true)));
  out.push(part('runner/leg', 0.32, 0.6, 0.16, 0.06, (g) => {
    const thigh = shapes.limb(0, 0, 0.07 * U, 0, 0.32 * U, 0.06 * U);
    P(g, thigh, R.leather.map((c) => mix(c, '#2a2030', 0.3)), bx(-0.07, 0, 0.14, 0.34), { tex: 'brush', ink: 2.2, seed: 140 });
    const shin = shapes.rrect(-0.06 * U, 0.22 * U, 0.12 * U, 0.2 * U, 5);
    P(g, shin, R.wrap, bx(-0.06, 0.22, 0.12, 0.2), { tex: 'cloth', ink: 2.2, seed: 141 });
    for (let i = 0; i < 4; i++) inkLine(g, [[-0.055 * U, (0.25 + i * 0.045) * U], [0.055 * U, (0.27 + i * 0.045) * U]], 1.4, R.wrap[0], 0.6);
    const boot = shapes.blob([[-0.07 * U, 0.4 * U], [0.07 * U, 0.4 * U], [0.12 * U, 0.48 * U], [0.09 * U, 0.52 * U], [-0.08 * U, 0.52 * U]], 0.4);
    P(g, boot, R.leather, bx(-0.08, 0.4, 0.2, 0.12), { tex: 'brush', ink: 2.2, seed: 142 });
  }));
  // the spear: pivot at the grip, a third of the way down the shaft; the blade points down.
  out.push(part('runner/spear', 0.3, 2.0, 0.15, 0.62, (g) => {
    const shaft = shapes.rrect(-0.022 * U, -0.6 * U, 0.044 * U, 1.7 * U, 4);
    P(g, shaft, R.ash, bx(-0.022, -0.6, 0.044, 1.7), { tex: 'wood', shade: 0.3, lit: 0.3, ink: 2, seed: 150, light: [-1, 0] });
    const butt = shapes.ellipse(0, -0.6 * U, 0.03 * U, 0.03 * U);
    P(g, butt, R.bronze, bx(-0.03, -0.63, 0.06, 0.06), { tex: 'none', ink: 1.6, seed: 151 });
    const collar = shapes.rrect(-0.035 * U, 1.04 * U, 0.07 * U, 0.08 * U, 3);
    P(g, collar, R.bronze, bx(-0.035, 1.04, 0.07, 0.08), { tex: 'metal', ink: 1.8, seed: 152 });
    const blade = shapes.blob([[0, 1.1 * U], [0.07 * U, 1.18 * U], [0.06 * U, 1.3 * U], [0, 1.38 * U], [-0.06 * U, 1.3 * U], [-0.07 * U, 1.18 * U]], 0.5);
    P(g, blade, ['#3a2410', '#6a4418', '#a8762c', '#e0b05a', '#fff0b0'], bx(-0.07, 1.1, 0.14, 0.28), { tex: 'metal', shade: 0.35, lit: 0.3, rim: 2, ink: 2.4, seed: 153, light: [-1, 0] });
    inkLine(g, [[0, 1.13 * U], [0, 1.33 * U]], 1.6, '#3a2410', 0.7);
    const tassel = shapes.blob([[0.02 * U, 1.05 * U], [0.08 * U, 1.0 * U], [0.1 * U, 0.92 * U], [0.04 * U, 0.98 * U]]);
    P(g, tassel, R.crimson, bx(0.02, 0.92, 0.08, 0.13), { tex: 'fur', ink: 1.6, seed: 154 });
  }));
  // the hip lantern
  out.push(part('runner/lantern', 0.24, 0.32, 0.12, 0.04, (g, s) => {
    inkLine(g, [[0, 0], [0, 0.05 * U]], 2.4, INK, 1);
    const cage = shapes.rrect(-0.07 * U, 0.05 * U, 0.14 * U, 0.17 * U, 5);
    P(g, cage, R.bronze, bx(-0.07, 0.05, 0.14, 0.17), { tex: 'metal', ink: 2.2, seed: 160 });
    const glass = shapes.rrect(-0.045 * U, 0.08 * U, 0.09 * U, 0.11 * U, 4);
    g.fillStyle = '#ffd27a';
    g.fill(glass);
    s.glow(glass, 1, 2);
    inkLine(g, [[0, 0.08 * U], [0, 0.19 * U]], 1.4, R.bronze[0], 0.8);
  }, { glow: true }));
  return out;
}
