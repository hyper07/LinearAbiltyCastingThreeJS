/**
 * The keep's foes, painted as cut-out puppets (or, for the slime, one
 * squashy blob): Cinder imps, Rime slimes, Hollow sentinels, Rimefletch
 * archers, the Gorehorn, and Hrimgar the Rime Jarl. Original designs.
 */
import { Sprite, paintShape, shapes, inkLine, seeded, mix, INK } from '../paint.js';
import { RAMPS } from './props.js';
import { CPU } from './heroes.js';

const U = CPU;
const P = (g, path, ramp, box, o = {}) => paintShape(g, path, { ramp, box, ...o });
const bx = (x, y, w, h) => [x * U, y * U, w * U, h * U];

function part(name, w, h, px, py, paint, { glow = false, ink = 3.2, radius, scale = 1 } = {}) {
  const u = U * scale;
  const s = new Sprite(name, Math.round(w * u), Math.round(h * u), { ox: px * u, oy: py * u, ppu: u, glow });
  s.g.save();
  s.g.translate(px * u, py * u);
  s.g.scale(scale, scale);
  paint(s.g, s);
  s.g.restore();
  if (radius) s.height.radius = radius;
  s.ink(ink);
  return s.bake();
}

const R = {
  imp: ['#3a0a06', '#6e1a0c', '#a8321a', '#e05a2a', '#ff9a5a'],
  impBelly: ['#6a2a0a', '#a85014', '#e08a28', '#ffc05a', '#fff0a0'],
  flame: ['#a8320c', '#ef6a1c', '#ffa83a', '#ffe08a', '#ffffff'],
  horn: ['#1a1014', '#2e2024', '#4a3436', '#6e5250', '#9a7a74'],
  slime: ['#1c3a78', '#3466b0', '#5a9ad8', '#9ad0f2', '#e8faff'],
  bone: RAMPS.bone,
  rust: ['#1e1418', '#3a2a28', '#5a4438', '#7e6450', '#a88a6e'],
  armour: ['#141824', '#232a3c', '#36405a', '#525e7e', '#7e8aa8'],
  frostCloth: ['#0e1830', '#1a2c50', '#2a4678', '#4268a4', '#78a0d4'],
  frostSkin: ['#2a3a5a', '#46628a', '#6a8eb8', '#9cc0e0', '#d4ecfa'],
  ice: RAMPS.ice,
  hide: ['#1e1410', '#3a261c', '#5e3e2a', '#86603e', '#b48a5c'],
  shag: ['#2a2420', '#4a4038', '#706458', '#9a8c7c', '#cabcaa'],
  giant: ['#1e2a40', '#34486a', '#4e6c96', '#7a9cc4', '#b8d4ee'],
  fur: ['#2a2420', '#4a3e36', '#6e6052', '#988a78', '#c8bca8'],
  plate: ['#1a2236', '#2c3a58', '#44587e', '#6a82a8', '#a4bcd8']
};

/* ------------------------------------------------------------ cinder imp */

export function impParts() {
  const out = [];
  out.push(part('imp/body', 0.5, 0.5, 0.25, 0.44, (g) => {
    const b = shapes.blob([[-0.14 * U, 0], [0.14 * U, 0], [0.18 * U, -0.14 * U], [0.13 * U, -0.3 * U], [0, -0.35 * U], [-0.13 * U, -0.3 * U], [-0.18 * U, -0.14 * U]], 0.6);
    P(g, b, R.imp, bx(-0.18, -0.35, 0.36, 0.35), { tex: 'skin', shade: 0.3, lit: 0.22, rim: 2.5, ink: 2.4, seed: 1 });
    const belly = shapes.ellipse(0.02 * U, -0.13 * U, 0.09 * U, 0.1 * U);
    P(g, belly, R.impBelly, bx(-0.07, -0.23, 0.18, 0.2), { tex: 'none', shade: 0.25, ink: 1.8, seed: 2 });
  }));
  out.push(part('imp/head', 0.64, 0.6, 0.32, 0.5, (g, s) => {
    // a flaming tuft (glowing) behind the head
    const tuft = shapes.spiky(0, -0.3 * U, 0.17 * U, 5, 0.45, -Math.PI / 2, seeded(3));
    P(g, tuft, R.flame, bx(-0.17, -0.47, 0.34, 0.34), { tex: 'none', shade: 0.3, lit: 0.3, ink: 2, seed: 3 });
    s.glow(tuft, 1, 2);
    for (const k of [-1, 1]) {
      const horn = shapes.poly([[k * 0.08 * U, -0.3 * U], [k * 0.15 * U, -0.27 * U], [k * 0.22 * U, -0.46 * U]]);
      P(g, horn, R.horn, bx(-0.22, -0.46, 0.44, 0.2), { tex: 'none', ink: 2, seed: 4 });
      const ear = shapes.poly([[k * 0.15 * U, -0.16 * U], [k * 0.15 * U, -0.24 * U], [k * 0.3 * U, -0.26 * U]]);
      P(g, ear, R.imp, bx(-0.3, -0.26, 0.6, 0.1), { tex: 'none', ink: 2, seed: 5 });
    }
    const head = shapes.ellipse(0, -0.17 * U, 0.17 * U, 0.15 * U);
    P(g, head, R.imp, bx(-0.17, -0.32, 0.34, 0.3), { tex: 'skin', shade: 0.32, lit: 0.22, rim: 2.5, ink: 2.6, seed: 6 });
    // big glowing eyes and a grin
    for (const k of [-1, 1]) {
      const e = shapes.ellipse(k * 0.065 * U + 0.02 * U, -0.19 * U, 0.045 * U, 0.05 * U);
      g.fillStyle = '#fff3a0';
      g.fill(e);
      s.glow(e, 1, 1.5);
      g.fillStyle = INK;
      g.beginPath();
      g.ellipse(k * 0.065 * U + 0.03 * U, -0.185 * U, 0.016 * U, 0.03 * U, 0, 0, Math.PI * 2);
      g.fill();
    }
    inkLine(g, [[-0.07 * U, -0.09 * U], [0.02 * U, -0.065 * U], [0.1 * U, -0.1 * U]], 2.4, INK, 1);
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(-0.02 * U, -0.075 * U);
    g.lineTo(0.0, -0.05 * U);
    g.lineTo(0.015 * U, -0.072 * U);
    g.fill();
  }, { glow: true }));
  out.push(part('imp/wing', 0.5, 0.36, 0.04, 0.3, (g) => {
    const w = new Path2D();
    w.moveTo(0, 0);
    w.lineTo(0.12 * U, -0.24 * U);
    w.lineTo(0.42 * U, -0.2 * U);
    w.quadraticCurveTo(0.34 * U, -0.12 * U, 0.38 * U, -0.04 * U);
    w.quadraticCurveTo(0.26 * U, -0.08 * U, 0.24 * U, 0.0);
    w.quadraticCurveTo(0.14 * U, -0.04 * U, 0, 0);
    w.closePath();
    P(g, w, ['#1e0808', '#3a1010', '#5a1a16', '#7e2a1e', '#a8442a'], bx(0, -0.24, 0.42, 0.26), { tex: 'brush', shade: 0.25, ink: 2.2, seed: 7 });
    inkLine(g, [[0, 0], [0.12 * U, -0.24 * U], [0.42 * U, -0.2 * U]], 2.4, INK, 0.8);
    inkLine(g, [[0.12 * U, -0.24 * U], [0.3 * U, -0.06 * U]], 1.6, INK, 0.6);
  }, { ink: 2.5 }));
  out.push(part('imp/limb', 0.16, 0.26, 0.08, 0.04, (g) => {
    const l = shapes.limb(0, 0, 0.035 * U, 0, 0.16 * U, 0.03 * U);
    P(g, l, R.imp, bx(-0.04, 0, 0.08, 0.2), { tex: 'none', ink: 2, seed: 8 });
    const claw = shapes.ellipse(0, 0.18 * U, 0.04 * U, 0.03 * U);
    P(g, claw, R.horn, bx(-0.04, 0.15, 0.08, 0.06), { tex: 'none', ink: 1.6, seed: 9 });
  }, { ink: 2.5 }));
  out.push(part('imp/tail', 0.4, 0.3, 0.04, 0.2, (g, s) => {
    const t = new Path2D();
    t.moveTo(0, -0.02 * U);
    t.quadraticCurveTo(0.2 * U, 0.04 * U, 0.3 * U, -0.12 * U);
    t.lineTo(0.31 * U, -0.1 * U);
    t.quadraticCurveTo(0.2 * U, 0.08 * U, 0, 0.02 * U);
    t.closePath();
    P(g, t, R.imp, bx(0, -0.12, 0.31, 0.16), { tex: 'none', ink: 2, seed: 10 });
    const tip = shapes.spiky(0.32 * U, -0.13 * U, 0.06 * U, 4, 0.4, 0, seeded(11));
    P(g, tip, R.flame, bx(0.26, -0.19, 0.12, 0.12), { tex: 'none', ink: 1.6, seed: 11 });
    s.glow(tip, 1, 1.5);
  }, { glow: true, ink: 2.5 }));
  return out;
}

/* ------------------------------------------------------------ rime slime */

export function slimeParts() {
  const out = [];
  out.push(part('slime/body', 1.0, 0.9, 0.5, 0.84, (g, s) => {
    const b = shapes.blob([[-0.36 * U, 0], [0.36 * U, 0], [0.42 * U, -0.14 * U], [0.32 * U, -0.38 * U], [0.12 * U, -0.52 * U], [-0.08 * U, -0.54 * U], [-0.3 * U, -0.42 * U], [-0.42 * U, -0.16 * U]], 0.6);
    P(g, b, R.slime, bx(-0.42, -0.54, 0.84, 0.54), { tex: 'ice', shade: 0.28, core: 1.4, lit: 0.18, rim: 4, ink: 3, seed: 20, gloss: 1.2 });
    // a dark core and drifting bubbles inside
    const core = shapes.ellipse(0.04 * U, -0.2 * U, 0.16 * U, 0.12 * U);
    g.save();
    g.globalAlpha = 0.35;
    g.fillStyle = R.slime[0];
    g.fill(core);
    g.restore();
    const r = seeded(21);
    for (let i = 0; i < 5; i++) {
      g.save();
      g.globalAlpha = 0.6;
      g.strokeStyle = R.slime[4];
      g.lineWidth = 2;
      g.beginPath();
      g.arc((r() - 0.5) * 0.5 * U, -r() * 0.4 * U, 3 + r() * 5, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
    // ice crystals on its back
    for (const [x, y, h, a] of [[-0.14, -0.46, 0.22, -0.3], [0.05, -0.52, 0.3, 0.05], [0.2, -0.42, 0.2, 0.4]]) {
      g.save();
      g.translate(x * U, y * U);
      g.rotate(a);
      const c = shapes.poly([[-0.05 * U, 0.03 * U], [0.05 * U, 0.03 * U], [0.035 * U, -h * U * 0.7], [0, -h * U], [-0.035 * U, -h * U * 0.7]]);
      P(g, c, ['#4a7ab8', '#8ac0ea', '#c8ecfa', '#f0fcff', '#ffffff'], bx(-0.05, -h, 0.1, h + 0.03), { tex: 'none', shade: 0.4, lit: 0.3, rim: 2, ink: 2.2, seed: 22, light: [-1, -0.2] });
      s.glow(c, 0.35, 2);
      g.restore();
    }
    s.glow(b, 0.12, 6);
  }, { glow: true, ink: 3.5, radius: 26 }));
  out.push(part('slime/eyes', 0.4, 0.2, 0.2, 0.1, (g) => {
    for (const k of [-1, 1]) {
      const e = shapes.ellipse(k * 0.075 * U, 0, 0.045 * U, 0.055 * U);
      g.fillStyle = '#ffffff';
      g.fill(e);
      g.strokeStyle = INK;
      g.lineWidth = 2.4;
      g.stroke(e);
      g.fillStyle = INK;
      g.beginPath();
      g.ellipse(k * 0.075 * U + 0.012 * U, 0.008 * U, 0.022 * U, 0.032 * U, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(k * 0.075 * U + 0.004 * U, -0.012 * U, 2.4, 0, Math.PI * 2);
      g.fill();
    }
  }, { ink: 0.5 }));
  return out;
}

/* ------------------------------------------------------------ hollow sentinel */

export function sentinelParts() {
  const out = [];
  out.push(part('sentinel/head', 0.56, 0.6, 0.28, 0.54, (g, s) => {
    // a skull inside an open bascinet with a torn blue plume
    const plume = shapes.blob([[0.02 * U, -0.38 * U], [0.12 * U, -0.48 * U], [0.24 * U, -0.42 * U], [0.18 * U, -0.3 * U]]);
    P(g, plume, R.frostCloth, bx(0.02, -0.48, 0.22, 0.18), { tex: 'fur', ink: 2, seed: 30 });
    const helm = shapes.blob([[-0.16 * U, -0.02 * U], [0.16 * U, -0.02 * U], [0.19 * U, -0.24 * U], [0.1 * U, -0.4 * U], [-0.1 * U, -0.4 * U], [-0.19 * U, -0.24 * U]], 0.6);
    P(g, helm, R.armour, bx(-0.19, -0.4, 0.38, 0.38), { tex: 'metal', shade: 0.3, lit: 0.2, rim: 2.5, ink: 2.6, seed: 31 });
    const face = shapes.blob([[-0.1 * U, -0.06 * U], [0.1 * U, -0.06 * U], [0.12 * U, -0.2 * U], [0, -0.28 * U], [-0.12 * U, -0.2 * U]], 0.6);
    P(g, face, R.bone, bx(-0.12, -0.28, 0.24, 0.22), { tex: 'brush', shade: 0.3, ink: 2.2, seed: 32 });
    for (const k of [-1, 1]) {
      const e = shapes.ellipse(k * 0.05 * U, -0.18 * U, 0.035 * U, 0.03 * U);
      g.fillStyle = '#0a0a14';
      g.fill(e);
      const gl = shapes.ellipse(k * 0.05 * U, -0.18 * U, 0.015 * U, 0.015 * U);
      g.fillStyle = '#9ae0ff';
      g.fill(gl);
      s.glow(gl, 1, 2);
    }
    for (let i = -2; i <= 2; i++) inkLine(g, [[i * 0.022 * U, -0.1 * U], [i * 0.022 * U, -0.065 * U]], 1.6, INK, 0.8);
  }, { glow: true }));
  out.push(part('sentinel/torso', 0.62, 0.62, 0.31, 0.58, (g) => {
    const ribs = shapes.blob([[-0.16 * U, 0], [0.16 * U, 0], [0.22 * U, -0.3 * U], [0.12 * U, -0.48 * U], [-0.12 * U, -0.48 * U], [-0.22 * U, -0.3 * U]], 0.5);
    P(g, ribs, R.armour, bx(-0.22, -0.48, 0.44, 0.48), { tex: 'metal', shade: 0.3, lit: 0.2, rim: 2.5, ink: 2.8, seed: 40 });
    // a broken breastplate showing ribs
    g.save();
    g.clip(ribs);
    for (let i = 0; i < 4; i++) {
      const y = (-0.16 - i * 0.07) * U;
      const rib = shapes.ellipse(0.06 * U, y, 0.14 * U, 0.025 * U, 0.1);
      P(g, rib, R.bone, bx(-0.08, y / U - 0.03, 0.28, 0.06), { tex: 'none', ink: 1.8, seed: 41 + i });
    }
    g.restore();
    const tabard = shapes.poly([[-0.12 * U, -0.02 * U], [0.12 * U, -0.02 * U], [0.14 * U, 0.06 * U], [0.04 * U, 0.03 * U], [-0.02 * U, 0.08 * U], [-0.14 * U, 0.05 * U]]);
    P(g, tabard, R.frostCloth, bx(-0.14, -0.02, 0.28, 0.1), { tex: 'cloth', ink: 2, seed: 45 });
    for (const k of [-1, 1]) {
      const pl = shapes.ellipse(k * 0.2 * U, -0.42 * U, 0.1 * U, 0.07 * U);
      P(g, pl, R.armour, bx(-0.3, -0.49, 0.6, 0.14), { tex: 'metal', ink: 2.2, seed: 46 + k });
    }
  }));
  out.push(part('sentinel/limb', 0.2, 0.48, 0.1, 0.06, (g) => {
    const b = shapes.limb(0, 0, 0.032 * U, 0, 0.34 * U, 0.028 * U);
    P(g, b, R.bone, bx(-0.04, 0, 0.08, 0.36), { tex: 'none', ink: 2, seed: 50 });
    const j = shapes.ellipse(0, 0.17 * U, 0.04 * U, 0.035 * U);
    P(g, j, R.bone, bx(-0.04, 0.13, 0.08, 0.08), { tex: 'none', ink: 1.8, seed: 51 });
    const end = shapes.ellipse(0, 0.36 * U, 0.05 * U, 0.04 * U);
    P(g, end, R.armour, bx(-0.05, 0.32, 0.1, 0.08), { tex: 'metal', ink: 2, seed: 52 });
  }));
  out.push(part('sentinel/shield', 0.6, 0.86, 0.3, 0.4, (g) => {
    const sh = shapes.rrect(-0.24 * U, -0.36 * U, 0.48 * U, 0.76 * U, 14);
    P(g, sh, R.rust, bx(-0.24, -0.36, 0.48, 0.76), { tex: 'wood', shade: 0.3, lit: 0.16, rim: 2, ink: 3, seed: 60 });
    const boss = shapes.ellipse(0, 0, 0.09 * U, 0.09 * U);
    P(g, boss, R.armour, bx(-0.09, -0.09, 0.18, 0.18), { tex: 'metal', ink: 2.2, seed: 61, gloss: 0.6 });
    for (const y of [-0.24, 0.24]) {
      const band = shapes.rrect(-0.24 * U, y * U - 6, 0.48 * U, 12, 3);
      P(g, band, R.armour, bx(-0.24, y - 0.05, 0.48, 0.1), { tex: 'metal', ink: 2, seed: 62 });
    }
    // a pale skull painted on it, chipped
    inkLine(g, [[-0.14 * U, -0.14 * U], [0.12 * U, 0.16 * U]], 3, R.rust[0], 0.5);
  }));
  out.push(part('sentinel/sword', 0.26, 0.98, 0.13, 0.16, (g) => {
    const grip = shapes.rrect(-0.022 * U, -0.1 * U, 0.044 * U, 0.14 * U, 3);
    P(g, grip, R.hide, bx(-0.022, -0.1, 0.044, 0.14), { tex: 'none', ink: 1.8, seed: 70 });
    const guard = shapes.rrect(-0.1 * U, 0.03 * U, 0.2 * U, 0.04 * U, 3);
    P(g, guard, R.armour, bx(-0.1, 0.03, 0.2, 0.04), { tex: 'metal', ink: 2, seed: 71 });
    const blade = shapes.poly([[-0.045 * U, 0.07 * U], [0.045 * U, 0.07 * U], [0.05 * U, 0.6 * U], [0.02 * U, 0.7 * U], [-0.04 * U, 0.66 * U]]);
    P(g, blade, R.rust.map((c) => mix(c, '#6a7a90', 0.4)), bx(-0.05, 0.07, 0.1, 0.63), { tex: 'metal', shade: 0.35, ink: 2.2, seed: 72, light: [-1, 0] });
    inkLine(g, [[0.03 * U, 0.3 * U], [0.05 * U, 0.33 * U], [0.03 * U, 0.36 * U]], 2, INK, 0.9);
  }));
  return out;
}

/* ------------------------------------------------------------ rimefletch archer */

export function archerParts() {
  const out = [];
  out.push(part('archer/head', 0.6, 0.6, 0.3, 0.54, (g, s) => {
    // a hooded frost-goblin with a mask of ice
    const hood = shapes.blob([[-0.17 * U, 0], [0.17 * U, 0], [0.2 * U, -0.2 * U], [0.1 * U, -0.38 * U], [0.22 * U, -0.46 * U], [0.0, -0.4 * U], [-0.16 * U, -0.32 * U], [-0.21 * U, -0.18 * U]], 0.55);
    P(g, hood, R.frostCloth, bx(-0.21, -0.46, 0.43, 0.46), { tex: 'cloth', shade: 0.3, lit: 0.2, rim: 2.5, ink: 2.6, seed: 80 });
    const mask = shapes.blob([[-0.1 * U, -0.08 * U], [0.13 * U, -0.08 * U], [0.15 * U, -0.2 * U], [0.04 * U, -0.28 * U], [-0.1 * U, -0.22 * U]], 0.5);
    P(g, mask, R.frostSkin, bx(-0.1, -0.28, 0.25, 0.2), { tex: 'ice', shade: 0.3, lit: 0.25, rim: 2, ink: 2.2, seed: 81, gloss: 0.6 });
    for (const x of [-0.02, 0.08]) {
      const e = shapes.ellipse(x * U, -0.18 * U, 0.025 * U, 0.016 * U);
      g.fillStyle = '#c8f6ff';
      g.fill(e);
      s.glow(e, 1, 2);
    }
    const nose = shapes.poly([[0.12 * U, -0.15 * U], [0.26 * U, -0.12 * U], [0.12 * U, -0.1 * U]]);
    P(g, nose, R.frostSkin, bx(0.12, -0.15, 0.14, 0.05), { tex: 'none', ink: 1.8, seed: 82 });
  }, { glow: true }));
  out.push(part('archer/torso', 0.56, 0.56, 0.28, 0.52, (g) => {
    const t = shapes.blob([[-0.16 * U, 0.02 * U], [0.16 * U, 0.02 * U], [0.18 * U, -0.22 * U], [0.1 * U, -0.38 * U], [-0.1 * U, -0.38 * U], [-0.18 * U, -0.22 * U]], 0.5);
    P(g, t, R.frostCloth, bx(-0.18, -0.38, 0.36, 0.4), { tex: 'cloth', shade: 0.3, lit: 0.2, rim: 2, ink: 2.6, seed: 90 });
    const quiver = shapes.rrect(-0.2 * U, -0.42 * U, 0.08 * U, 0.3 * U, 4);
    P(g, quiver, R.hide, bx(-0.2, -0.42, 0.08, 0.3), { tex: 'brush', ink: 2, seed: 91 });
    for (let i = 0; i < 3; i++) inkLine(g, [[(-0.18 + i * 0.02) * U, -0.42 * U], [(-0.2 + i * 0.025) * U, -0.5 * U]], 2, '#c8ecfa', 1);
    const belt = shapes.rrect(-0.16 * U, -0.1 * U, 0.32 * U, 0.06 * U, 3);
    P(g, belt, R.hide, bx(-0.16, -0.1, 0.32, 0.06), { tex: 'none', ink: 1.8, seed: 92 });
  }));
  out.push(part('archer/limb', 0.18, 0.4, 0.09, 0.05, (g) => {
    const l = shapes.limb(0, 0, 0.045 * U, 0, 0.28 * U, 0.035 * U);
    P(g, l, R.frostSkin, bx(-0.05, 0, 0.1, 0.32), { tex: 'brush', ink: 2, seed: 100 });
    const wrap = shapes.rrect(-0.045 * U, 0.12 * U, 0.09 * U, 0.1 * U, 3);
    P(g, wrap, R.hide, bx(-0.045, 0.12, 0.09, 0.1), { tex: 'none', ink: 1.8, seed: 101 });
  }));
  out.push(part('archer/bow', 0.4, 1.0, 0.1, 0.5, (g, s) => {
    // a bow of blue ice, string to the left; pivot at the grip
    const bow = new Path2D();
    bow.moveTo(0, -0.42 * U);
    bow.quadraticCurveTo(0.3 * U, 0, 0, 0.42 * U);
    bow.lineTo(0.03 * U, 0.38 * U);
    bow.quadraticCurveTo(0.24 * U, 0, 0.03 * U, -0.38 * U);
    bow.closePath();
    P(g, bow, R.ice, bx(0, -0.42, 0.2, 0.84), { tex: 'none', shade: 0.35, lit: 0.3, rim: 2, ink: 2.4, seed: 110 });
    s.glow(bow, 0.3, 3);
    inkLine(g, [[0.01 * U, -0.4 * U], [0.01 * U, 0.4 * U]], 1.4, '#dff6ff', 1);
    const grip = shapes.rrect(0.08 * U, -0.06 * U, 0.06 * U, 0.12 * U, 3);
    P(g, grip, R.hide, bx(0.08, -0.06, 0.06, 0.12), { tex: 'none', ink: 1.6, seed: 111 });
  }, { glow: true }));
  out.push(part('archer/cloak', 0.5, 0.6, 0.25, 0.05, (g) => {
    const c = shapes.blob([[-0.16 * U, 0], [0.16 * U, 0], [0.2 * U, 0.3 * U], [0.12 * U, 0.48 * U], [0, 0.42 * U], [-0.12 * U, 0.5 * U], [-0.2 * U, 0.3 * U]], 0.5);
    P(g, c, R.frostCloth.map((c2) => mix(c2, '#000000', 0.2)), bx(-0.2, 0, 0.4, 0.5), { tex: 'cloth', ink: 2.4, seed: 120 });
  }));
  return out;
}

/* ------------------------------------------------------------ gorehorn (side view) */

export function gorehornParts() {
  const out = [];
  out.push(part('gorehorn/body', 1.5, 1.1, 0.75, 0.86, (g) => {
    // a humped, shaggy ox-boar, facing right
    const b = shapes.blob([[-0.6 * U, -0.2 * U], [-0.5 * U, -0.48 * U], [-0.1 * U, -0.66 * U], [0.3 * U, -0.74 * U], [0.56 * U, -0.56 * U], [0.6 * U, -0.3 * U], [0.4 * U, -0.1 * U], [-0.4 * U, -0.08 * U]], 0.55);
    P(g, b, R.shag, bx(-0.6, -0.74, 1.2, 0.66), { tex: 'fur', shade: 0.3, lit: 0.2, rim: 3, ink: 3, seed: 130, furAngle: 0.4 });
    const belly = shapes.ellipse(0, -0.2 * U, 0.38 * U, 0.12 * U);
    P(g, belly, R.hide, bx(-0.38, -0.32, 0.76, 0.24), { tex: 'fur', ink: 2, seed: 131 });
    // frost on the hump
    const frost = shapes.blob([[-0.3 * U, -0.56 * U], [0.1 * U, -0.72 * U], [0.4 * U, -0.66 * U], [0.1 * U, -0.6 * U]]);
    P(g, frost, RAMPS.snow, bx(-0.3, -0.72, 0.7, 0.16), { tex: 'snow', ink: 2, seed: 132 });
  }, { radius: 30 }));
  out.push(part('gorehorn/head', 0.9, 0.8, 0.2, 0.5, (g, s) => {
    const head = shapes.blob([[-0.12 * U, -0.3 * U], [0.18 * U, -0.36 * U], [0.38 * U, -0.22 * U], [0.44 * U, -0.06 * U], [0.36 * U, 0.04 * U], [0.1 * U, 0.06 * U], [-0.1 * U, -0.06 * U]], 0.5);
    P(g, head, R.hide, bx(-0.12, -0.36, 0.56, 0.42), { tex: 'brush', shade: 0.3, lit: 0.2, rim: 2.5, ink: 2.8, seed: 140 });
    const snout = shapes.ellipse(0.38 * U, -0.04 * U, 0.09 * U, 0.08 * U);
    P(g, snout, ['#3a2420', '#5a3a32', '#7e5448', '#a87a6a', '#d0a48e'], bx(0.29, -0.12, 0.18, 0.16), { tex: 'none', ink: 2.2, seed: 141 });
    // tusk
    const tusk = new Path2D();
    tusk.moveTo(0.3 * U, 0.02 * U);
    tusk.quadraticCurveTo(0.42 * U, 0.08 * U, 0.46 * U, -0.1 * U);
    tusk.lineTo(0.42 * U, -0.06 * U);
    tusk.quadraticCurveTo(0.38 * U, 0.03 * U, 0.3 * U, -0.02 * U);
    tusk.closePath();
    P(g, tusk, RAMPS.bone, bx(0.3, -0.1, 0.16, 0.18), { tex: 'none', ink: 2, seed: 142 });
    // the great horns, sweeping forward
    const horn = new Path2D();
    horn.moveTo(0.04 * U, -0.3 * U);
    horn.bezierCurveTo(-0.1 * U, -0.6 * U, 0.3 * U, -0.72 * U, 0.52 * U, -0.5 * U);
    horn.lineTo(0.46 * U, -0.46 * U);
    horn.bezierCurveTo(0.28 * U, -0.6 * U, 0.04 * U, -0.5 * U, 0.16 * U, -0.3 * U);
    horn.closePath();
    P(g, horn, ['#3a3028', '#6a5a48', '#a08c70', '#d0c0a0', '#f6ecd4'], bx(-0.06, -0.68, 0.58, 0.38), { tex: 'brush', shade: 0.3, lit: 0.2, rim: 2.5, ink: 2.6, seed: 143 });
    for (let i = 0; i < 4; i++) inkLine(g, [[(0.0 + i * 0.1) * U, (-0.5 - Math.sin(i) * 0.05) * U], [(0.04 + i * 0.1) * U, (-0.58 - Math.sin(i) * 0.05) * U]], 1.8, '#3a3028', 0.6);
    const eye = shapes.ellipse(0.22 * U, -0.18 * U, 0.035 * U, 0.03 * U);
    g.fillStyle = '#ff6a3a';
    g.fill(eye);
    s.glow(eye, 1, 2);
    // shaggy mane
    const mane = shapes.blob([[-0.14 * U, -0.36 * U], [0.06 * U, -0.36 * U], [0.08 * U, -0.1 * U], [-0.02 * U, 0.06 * U], [-0.16 * U, -0.1 * U]]);
    P(g, mane, R.shag, bx(-0.16, -0.36, 0.24, 0.42), { tex: 'fur', ink: 2.4, seed: 144 });
  }, { glow: true }));
  out.push(part('gorehorn/leg', 0.3, 0.5, 0.15, 0.06, (g) => {
    const l = shapes.limb(0, 0, 0.09 * U, 0.01 * U, 0.32 * U, 0.06 * U);
    P(g, l, R.shag, bx(-0.09, 0, 0.18, 0.36), { tex: 'fur', ink: 2.4, seed: 150 });
    const hoof = shapes.rrect(-0.07 * U, 0.3 * U, 0.15 * U, 0.08 * U, 4);
    P(g, hoof, R.horn, bx(-0.07, 0.3, 0.15, 0.08), { tex: 'none', ink: 2, seed: 151 });
  }));
  out.push(part('gorehorn/tail', 0.4, 0.4, 0.04, 0.06, (g) => {
    const t = shapes.blob([[0, 0], [0.06 * U, 0.02 * U], [0.12 * U, 0.2 * U], [0.1 * U, 0.3 * U], [0.04 * U, 0.22 * U]]);
    P(g, t, R.shag, bx(0, 0, 0.12, 0.3), { tex: 'fur', ink: 2.2, seed: 160 });
  }));
  return out;
}

/* ------------------------------------------------------------ hrimgar, the rime jarl */

export function jarlParts() {
  const out = [];
  const S = 1; // drawn at full detail; scaled up in the rig
  out.push(part('jarl/torso', 1.7, 1.5, 0.85, 1.36, (g) => {
    const t = shapes.blob([[-0.48 * U, 0], [0.48 * U, 0], [0.62 * U, -0.5 * U], [0.7 * U, -0.98 * U], [0.36 * U, -1.2 * U], [-0.36 * U, -1.2 * U], [-0.7 * U, -0.98 * U], [-0.62 * U, -0.5 * U]], 0.5);
    P(g, t, R.giant, bx(-0.7, -1.2, 1.4, 1.2), { tex: 'skin', shade: 0.3, lit: 0.18, rim: 3, ink: 3.4, seed: 170 });
    // ice plates on the chest and belly
    for (const [x, y, w, h] of [[-0.3, -0.95, 0.28, 0.3], [0.04, -0.95, 0.28, 0.3], [-0.2, -0.6, 0.4, 0.22]]) {
      const pl = shapes.rrect(x * U, y * U, w * U, h * U, 10);
      P(g, pl, R.plate, bx(x, y, w, h), { tex: 'ice', shade: 0.3, lit: 0.25, rim: 2.5, ink: 2.4, seed: 171 + x * 10, gloss: 0.5 });
    }
    const belt = shapes.rrect(-0.5 * U, -0.32 * U, U, 0.16 * U, 8);
    P(g, belt, R.hide, bx(-0.5, -0.32, 1, 0.16), { tex: 'brush', ink: 2.6, seed: 175 });
    const buckle = shapes.ellipse(0, -0.24 * U, 0.12 * U, 0.1 * U);
    P(g, buckle, RAMPS.gold, bx(-0.12, -0.34, 0.24, 0.2), { tex: 'metal', ink: 2.4, seed: 176, gloss: 0.5 });
    // a loincloth of furs
    const furs = shapes.blob([[-0.44 * U, -0.18 * U], [0.44 * U, -0.18 * U], [0.36 * U, 0.06 * U], [0.1 * U, 0.02 * U], [0, 0.1 * U], [-0.12 * U, 0.02 * U], [-0.38 * U, 0.06 * U]]);
    P(g, furs, R.fur, bx(-0.44, -0.18, 0.88, 0.28), { tex: 'fur', ink: 2.6, seed: 177 });
    // a mantle of shaggy white fur over the shoulders
    const mantle = shapes.blob([[-0.82 * U, -0.9 * U], [-0.5 * U, -1.28 * U], [0, -1.34 * U], [0.5 * U, -1.28 * U], [0.82 * U, -0.9 * U], [0.5 * U, -0.94 * U], [0, -1.04 * U], [-0.5 * U, -0.94 * U]], 0.6);
    P(g, mantle, R.fur.map((c) => mix(c, '#e8ecf4', 0.55)), bx(-0.82, -1.34, 1.64, 0.44), { tex: 'fur', shade: 0.3, lit: 0.2, rim: 3, ink: 3, seed: 178 });
  }, { radius: 40, scale: S }));
  out.push(part('jarl/head', 1.0, 1.1, 0.5, 0.92, (g, s) => {
    // a crown of icicles
    for (let i = -3; i <= 3; i++) {
      const x = i * 0.08 * U;
      const h = (0.22 + (3 - Math.abs(i)) * 0.05) * U;
      const sp = shapes.poly([[x - 0.04 * U, -0.6 * U], [x + 0.04 * U, -0.6 * U], [x, -0.6 * U - h]]);
      P(g, sp, R.ice, bx(-0.3, -1.0, 0.6, 0.4), { tex: 'none', shade: 0.35, lit: 0.3, rim: 2, ink: 2.2, seed: 180 + i });
      s.glow(sp, 0.35, 2);
    }
    const head = shapes.blob([[-0.26 * U, -0.1 * U], [0.26 * U, -0.1 * U], [0.3 * U, -0.4 * U], [0.2 * U, -0.64 * U], [-0.2 * U, -0.64 * U], [-0.3 * U, -0.4 * U]], 0.6);
    P(g, head, R.giant, bx(-0.3, -0.64, 0.6, 0.54), { tex: 'skin', shade: 0.32, lit: 0.2, rim: 3, ink: 3, seed: 190 });
    // brow and glowing eyes
    inkLine(g, [[-0.2 * U, -0.42 * U], [-0.04 * U, -0.36 * U]], 5, INK, 1);
    inkLine(g, [[0.2 * U, -0.42 * U], [0.04 * U, -0.36 * U]], 5, INK, 1);
    for (const k of [-1, 1]) {
      const e = shapes.ellipse(k * 0.11 * U, -0.33 * U, 0.05 * U, 0.025 * U);
      g.fillStyle = '#d8faff';
      g.fill(e);
      s.glow(e, 1, 3);
    }
    // a beard of ice, long and jagged
    const beard = new Path2D();
    beard.moveTo(-0.28 * U, -0.26 * U);
    const pts = [[-0.24, 0.1], [-0.16, -0.02], [-0.1, 0.22], [-0.03, 0.04], [0.03, 0.3], [0.09, 0.04], [0.14, 0.2], [0.2, -0.02], [0.26, 0.08], [0.28, -0.26]];
    for (const [x, y] of pts) beard.lineTo(x * U, y * U);
    beard.quadraticCurveTo(0, -0.12 * U, -0.28 * U, -0.26 * U);
    beard.closePath();
    P(g, beard, ['#4a7ab0', '#86b6e0', '#c4e4f6', '#ecfaff', '#ffffff'], bx(-0.28, -0.3, 0.56, 0.6), { tex: 'ice', shade: 0.3, lit: 0.25, rim: 2.5, ink: 2.6, seed: 191 });
    s.glow(beard, 0.15, 4);
    const mouth = shapes.ellipse(0, -0.2 * U, 0.08 * U, 0.03 * U);
    g.fillStyle = '#0a1020';
    g.fill(mouth);
  }, { glow: true, radius: 24 }));
  out.push(part('jarl/arm', 0.62, 1.2, 0.31, 0.2, (g) => {
    const up = shapes.limb(0, 0, 0.2 * U, 0, 0.5 * U, 0.16 * U);
    P(g, up, R.giant, bx(-0.2, -0.2, 0.4, 0.7), { tex: 'skin', shade: 0.32, lit: 0.2, rim: 2.5, ink: 3, seed: 200 });
    const fore = shapes.limb(0, 0.5 * U, 0.17 * U, 0, 0.86 * U, 0.15 * U);
    P(g, fore, R.plate, bx(-0.17, 0.36, 0.34, 0.66), { tex: 'ice', shade: 0.3, lit: 0.25, rim: 2.5, ink: 3, seed: 201, gloss: 0.4 });
    const fist = shapes.ellipse(0, 0.92 * U, 0.17 * U, 0.15 * U);
    P(g, fist, R.giant, bx(-0.17, 0.77, 0.34, 0.3), { tex: 'skin', ink: 2.6, seed: 202 });
    const pauld = shapes.blob([[-0.26 * U, 0.04 * U], [-0.16 * U, -0.16 * U], [0.16 * U, -0.18 * U], [0.27 * U, 0.04 * U], [0.18 * U, 0.16 * U], [-0.18 * U, 0.16 * U]], 0.6);
    P(g, pauld, R.plate, bx(-0.27, -0.18, 0.54, 0.34), { tex: 'ice', shade: 0.3, lit: 0.25, rim: 3, ink: 3, seed: 203 });
  }, { radius: 20 }));
  out.push(part('jarl/leg', 0.6, 0.9, 0.3, 0.08, (g) => {
    const l = shapes.limb(0, 0, 0.2 * U, 0, 0.56 * U, 0.17 * U);
    P(g, l, R.giant, bx(-0.2, 0, 0.4, 0.72), { tex: 'skin', shade: 0.3, ink: 3, seed: 210 });
    const boot = shapes.blob([[-0.2 * U, 0.48 * U], [0.18 * U, 0.48 * U], [0.28 * U, 0.68 * U], [0.24 * U, 0.76 * U], [-0.22 * U, 0.76 * U]], 0.5);
    P(g, boot, R.fur, bx(-0.22, 0.48, 0.5, 0.28), { tex: 'fur', ink: 2.8, seed: 211 });
  }, { radius: 18 }));
  out.push(part('jarl/maul', 0.9, 2.0, 0.45, 0.3, (g, s) => {
    const haft = shapes.rrect(-0.05 * U, -0.25 * U, 0.1 * U, 1.3 * U, 5);
    P(g, haft, R.hide, bx(-0.05, -0.25, 0.1, 1.3), { tex: 'wood', ink: 2.4, seed: 220 });
    const head = shapes.blob([[-0.36 * U, 1.0 * U], [0.36 * U, 1.0 * U], [0.4 * U, 1.3 * U], [0.32 * U, 1.6 * U], [-0.32 * U, 1.6 * U], [-0.4 * U, 1.3 * U]], 0.35);
    P(g, head, ['#2a4a80', '#4a7ab8', '#86b8e4', '#c4e6fa', '#f4fdff'], bx(-0.4, 1.0, 0.8, 0.6), { tex: 'ice', shade: 0.3, lit: 0.25, rim: 3, ink: 3, seed: 221, gloss: 0.8 });
    s.glow(head, 0.25, 6);
    for (let i = 0; i < 3; i++) {
      const x = (-0.24 + i * 0.24) * U;
      const sp = shapes.poly([[x - 0.06 * U, 1.6 * U], [x + 0.06 * U, 1.6 * U], [x, 1.78 * U]]);
      P(g, sp, R.ice, bx(-0.3, 1.6, 0.6, 0.18), { tex: 'none', ink: 2, seed: 222 + i });
    }
  }, { glow: true, radius: 16 }));
  return out;
}
