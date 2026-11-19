/**
 * Painted effects and small things: glow dots, sparks, snowflakes, smoke,
 * shock rings, sword smears, flame frames, embers, pickups (embershards,
 * heart-orbs, draughts), projectiles (ember bolts, frost arrows, brand-axes,
 * sun-lances, ice shards), the two summons (the Hearth Hound and the Lantern
 * Moth) and the soft shadow every body casts.
 */
import { Sprite, paintShape, shapes, inkLine, seeded, mix, INK } from '../paint.js';
import { RAMPS } from './props.js';

const U = 96;

function sprite(name, w, h, ox, oy, paint, { glow = false, ink = 0, radius, ppu = U } = {}) {
  const s = new Sprite(name, Math.round(w * ppu), Math.round(h * ppu), { ox: ox * ppu, oy: oy * ppu, ppu, glow });
  s.g.save();
  s.g.translate(ox * ppu, oy * ppu);
  paint(s.g, s, ppu);
  s.g.restore();
  if (radius) s.height.radius = radius;
  if (ink) s.ink(ink);
  return s.bake();
}

function radial(g, r, stops) {
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, r);
  for (const [k, c] of stops) grad.addColorStop(k, c);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
}

export function fxJobs() {
  const jobs = [];
  const add = (f) => jobs.push(f);
  add(() => sprite('fx/dot', 0.5, 0.5, 0.25, 0.25, (g) => radial(g, 0.24 * U, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']])));
  add(() => sprite('fx/glow', 1, 1, 0.5, 0.5, (g) => radial(g, 0.49 * U, [[0, 'rgba(255,255,255,0.9)'], [0.4, 'rgba(255,255,255,0.3)'], [1, 'rgba(255,255,255,0)']])));
  add(() => sprite('fx/spark', 0.6, 0.12, 0.3, 0.06, (g) => {
    const grad = g.createLinearGradient(-0.3 * U, 0, 0.3 * U, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, 0, 0.29 * U, 0.04 * U, 0, 0, Math.PI * 2);
    g.fill();
  }));
  add(() => sprite('fx/flake', 0.2, 0.2, 0.1, 0.1, (g) => {
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2;
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      g.beginPath();
      g.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
      g.lineTo(-Math.cos(a) * 7, -Math.sin(a) * 7);
      g.stroke();
    }
    radial(g, 5, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
  }));
  add(() => sprite('fx/smoke', 0.8, 0.8, 0.4, 0.4, (g) => {
    const r = seeded(3);
    for (let i = 0; i < 6; i++) {
      g.save();
      g.translate((r() - 0.5) * 0.3 * U, (r() - 0.5) * 0.3 * U);
      radial(g, (0.15 + r() * 0.12) * U, [[0, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
      g.restore();
    }
  }));
  add(() => sprite('fx/ring', 1.2, 1.2, 0.6, 0.6, (g) => {
    g.strokeStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      g.globalAlpha = [0.15, 0.35, 1, 0.35][i];
      g.lineWidth = [14, 9, 4, 2][i];
      g.beginPath();
      g.arc(0, 0, 0.5 * U, 0, Math.PI * 2);
      g.stroke();
    }
  }));
  add(() => sprite('fx/star', 0.5, 0.5, 0.25, 0.25, (g) => {
    g.fillStyle = '#fff';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? 0.04 * U : 0.23 * U;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.fill();
    radial(g, 0.08 * U, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
  }));
  // Smears: a crescent sweeping round the pivot, thick in the middle, white core, soft trailing edge.
  for (const [k, thick, arc] of [[0, 0.32, 2.4], [1, 0.42, 2.8], [2, 0.5, 6.0], [3, 0.2, 1.0]]) {
    add(() => sprite(`fx/smear-${k}`, 1.2, 2.3, 0.05, 1.15, (g) => {
      const R = 1.0 * U;
      const n = 40;
      const a0 = -arc / 2;
      for (let pass = 0; pass < 3; pass++) {
        g.beginPath();
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const a = a0 + arc * t;
          const w = Math.sin(t * Math.PI) ** 0.7 * thick * U * [1, 0.7, 0.35][pass];
          g.lineTo(Math.cos(a) * R, Math.sin(a) * R);
          if (i === n) for (let j = n; j >= 0; j--) {
            const tt = j / n;
            const aa = a0 + arc * tt;
            const ww = Math.sin(tt * Math.PI) ** 0.7 * thick * U * [1, 0.7, 0.35][pass] * (0.5 + tt * 0.5);
            g.lineTo(Math.cos(aa) * (R - ww), Math.sin(aa) * (R - ww));
          }
        }
        g.closePath();
        g.fillStyle = ['rgba(255,255,255,0.35)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,1)'][pass];
        g.fill();
      }
      // brush streaks along it
      const r = seeded(k + 5);
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 14; i++) {
        const rad = R - r() * thick * U * 0.8;
        const s = a0 + r() * arc * 0.6;
        g.lineWidth = 1 + r() * 2;
        g.beginPath();
        g.arc(0, 0, rad, s, s + arc * (0.2 + r() * 0.3));
        g.stroke();
      }
    }));
  }
  // Flames: eight frames of a licking tongue (outer orange, inner gold, white heart).
  for (let f = 0; f < 8; f++) {
    add(() => sprite(`fx/flame-${f}`, 0.7, 1.1, 0.35, 1.0, (g) => {
      const r = seeded(f * 13 + 1);
      const layer = (scale, color, sway) => {
        const h = (0.85 + r() * 0.15) * U * scale;
        const w = 0.26 * U * scale;
        const tip = Math.sin(f * 0.8 + sway) * 0.1 * U;
        const p = new Path2D();
        p.moveTo(-w, 0);
        p.bezierCurveTo(-w * 1.2, -h * 0.35, -w * 0.3 + tip * 0.5, -h * 0.55, tip, -h);
        p.bezierCurveTo(w * 0.4 + tip * 0.5, -h * 0.6, w * 1.25, -h * 0.35, w, 0);
        p.quadraticCurveTo(0, w * 0.7, -w, 0);
        g.fillStyle = color;
        g.fill(p);
      };
      g.translate(0, -0.06 * U);
      layer(1, 'rgba(255,120,40,0.85)', 0);
      // licks torn off the side
      for (let i = 0; i < 2; i++) {
        const x = (r() - 0.5) * 0.3 * U;
        const y = -(0.4 + r() * 0.4) * U;
        g.fillStyle = 'rgba(255,140,50,0.7)';
        g.beginPath();
        g.ellipse(x, y, 0.04 * U, 0.08 * U, (r() - 0.5) * 0.6, 0, Math.PI * 2);
        g.fill();
      }
      layer(0.7, 'rgba(255,200,80,0.95)', 1.3);
      layer(0.42, 'rgba(255,250,220,1)', 2.1);
    }));
  }
  // Pickups (world sprites, lit, with glow).
  add(() => sprite('pickup/gem', 0.34, 0.42, 0.17, 0.38, (g, s) => {
    const p = shapes.poly([[0, -0.36 * U], [0.13 * U, -0.2 * U], [0.08 * U, 0], [-0.08 * U, 0], [-0.13 * U, -0.2 * U]]);
    paintShape(g, p, { ramp: ['#5a1a0a', '#a83a12', '#ef7a1c', '#ffc05a', '#fff4c0'], box: [-0.13 * U, -0.36 * U, 0.26 * U, 0.36 * U], tex: 'none', shade: 0.35, lit: 0.3, rim: 2, ink: 2, seed: 1, gloss: 1 });
    inkLine(g, [[0, -0.36 * U], [0, 0]], 1.6, '#5a1a0a', 0.6);
    inkLine(g, [[-0.13 * U, -0.2 * U], [0.13 * U, -0.2 * U]], 1.4, '#5a1a0a', 0.5);
    s.glow(p, 0.55, 2);
  }, { glow: true, ink: 3, radius: 6 }));
  add(() => sprite('pickup/orb', 0.36, 0.36, 0.18, 0.34, (g, s) => {
    const p = shapes.ellipse(0, -0.15 * U, 0.12 * U, 0.12 * U);
    paintShape(g, p, { ramp: ['#4a0a1a', '#8e1a32', '#d83a4a', '#ff8a8a', '#ffe0e0'], box: [-0.12 * U, -0.27 * U, 0.24 * U, 0.24 * U], tex: 'none', shade: 0.35, lit: 0.3, rim: 2, ink: 2, seed: 2, gloss: 1.3 });
    s.glow(p, 0.6, 3);
  }, { glow: true, ink: 3, radius: 8 }));
  add(() => sprite('pickup/potion', 0.36, 0.5, 0.18, 0.46, (g, s) => {
    const b = shapes.blob([[-0.06 * U, -0.3 * U], [0.06 * U, -0.3 * U], [0.06 * U, -0.22 * U], [0.13 * U, -0.12 * U], [0.12 * U, -0.02 * U], [-0.12 * U, -0.02 * U], [-0.13 * U, -0.12 * U], [-0.06 * U, -0.22 * U]], 0.5);
    paintShape(g, b, { ramp: ['#4a0a1a', '#8e1a32', '#d83a4a', '#ff8a8a', '#ffe0e0'], box: [-0.13 * U, -0.3 * U, 0.26 * U, 0.3 * U], tex: 'none', shade: 0.3, lit: 0.3, rim: 2, ink: 2, seed: 3, gloss: 1 });
    const cork = shapes.rrect(-0.05 * U, -0.38 * U, 0.1 * U, 0.08 * U, 2);
    paintShape(g, cork, { ramp: RAMPS.wood, box: [-0.05 * U, -0.38 * U, 0.1 * U, 0.08 * U], tex: 'none', ink: 1.6, seed: 4 });
    s.glow(b, 0.4, 2);
  }, { glow: true, ink: 3, radius: 8 }));
  add(() => sprite('shadow', 1, 0.5, 0.5, 0.25, (g) => {
    g.scale(1, 0.5);
    radial(g, 0.48 * U, [[0, 'rgba(10,8,24,0.75)'], [0.55, 'rgba(10,8,24,0.45)'], [1, 'rgba(10,8,24,0)']]);
  }));
  // Projectiles.
  add(() => sprite('proj/arrow', 0.9, 0.2, 0.45, 0.1, (g, s) => {
    const shaft = shapes.rrect(-0.38 * U, -0.012 * U, 0.66 * U, 0.024 * U, 2);
    paintShape(g, shaft, { ramp: ['#2a3a5a', '#4a6a90', '#8ab4d8', '#cce8f8', '#ffffff'], box: [-0.38 * U, -0.02 * U, 0.66 * U, 0.04 * U], tex: 'none', ink: 1.4, seed: 5 });
    const head = shapes.poly([[0.28 * U, -0.06 * U], [0.44 * U, 0], [0.28 * U, 0.06 * U]]);
    paintShape(g, head, { ramp: RAMPS.ice, box: [0.28 * U, -0.06 * U, 0.16 * U, 0.12 * U], tex: 'none', ink: 1.6, seed: 6 });
    for (const k of [-1, 1]) {
      const f = shapes.poly([[-0.38 * U, 0], [-0.26 * U, 0], [-0.4 * U, k * 0.07 * U]]);
      paintShape(g, f, { ramp: RAMPS.frost, box: [-0.4 * U, -0.07 * U, 0.14 * U, 0.14 * U], tex: 'none', ink: 1.4, seed: 7 });
    }
    s.glow(head, 0.8, 2);
  }, { glow: true, ink: 2.5 }));
  add(() => sprite('proj/axe', 0.6, 0.6, 0.3, 0.3, (g, s) => {
    const haft = shapes.rrect(-0.025 * U, -0.22 * U, 0.05 * U, 0.44 * U, 3);
    paintShape(g, haft, { ramp: RAMPS.wood, box: [-0.025 * U, -0.22 * U, 0.05 * U, 0.44 * U], tex: 'wood', ink: 1.8, seed: 8 });
    const blade = new Path2D();
    blade.moveTo(0.02 * U, -0.2 * U);
    blade.quadraticCurveTo(0.24 * U, -0.24 * U, 0.24 * U, -0.02 * U);
    blade.quadraticCurveTo(0.16 * U, -0.06 * U, 0.02 * U, -0.06 * U);
    blade.closePath();
    paintShape(g, blade, { ramp: ['#5a1a08', '#a8400e', '#f08a2a', '#ffd070', '#fff6d0'], box: [0.02 * U, -0.24 * U, 0.22 * U, 0.22 * U], tex: 'metal', ink: 2, seed: 9 });
    s.glow(blade, 0.9, 2);
  }, { glow: true, ink: 2.5 }));
  add(() => sprite('proj/lance', 1.3, 0.3, 0.65, 0.15, (g) => {
    const grad = g.createLinearGradient(-0.6 * U, 0, 0.6 * U, 0);
    grad.addColorStop(0, 'rgba(255,200,90,0)');
    grad.addColorStop(0.6, 'rgba(255,220,130,0.8)');
    grad.addColorStop(1, 'rgba(255,255,240,1)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(-0.6 * U, 0);
    g.lineTo(0.42 * U, -0.05 * U);
    g.lineTo(0.62 * U, 0);
    g.lineTo(0.42 * U, 0.05 * U);
    g.closePath();
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.ellipse(0.4 * U, 0, 0.18 * U, 0.025 * U, 0, 0, Math.PI * 2);
    g.fill();
  }));
  add(() => sprite('proj/shard', 0.8, 0.3, 0.4, 0.15, (g, s) => {
    const p = shapes.poly([[-0.34 * U, -0.05 * U], [0.18 * U, -0.1 * U], [0.38 * U, 0], [0.18 * U, 0.1 * U], [-0.34 * U, 0.05 * U]]);
    paintShape(g, p, { ramp: RAMPS.ice, box: [-0.34 * U, -0.1 * U, 0.72 * U, 0.2 * U], tex: 'ice', shade: 0.35, lit: 0.3, rim: 2, ink: 2, seed: 10 });
    s.glow(p, 0.5, 3);
  }, { glow: true, ink: 2.5 }));
  // The Hearth Hound: a hound of living coals (drawn glowing, unlit), facing right.
  add(() => sprite('summon/hound', 1.4, 1.1, 0.7, 1.02, (g) => {
    const fire = ['#7a1e06', '#c84a10', '#ff8a2a', '#ffd070', '#fffbe0'];
    const o = { ramp: fire, tex: 'fur', shade: 0.3, lit: 0.25, rim: 3, ink: 2.6, inkColor: '#4a1004', furAngle: 1.3 };
    // far legs (darker)
    for (const [x, a] of [[-0.3, 0.25], [0.24, -0.2]]) {
      const l = shapes.limb(x * U, -0.3 * U, 0.06 * U, (x + a * 0.3) * U, -0.02 * U, 0.045 * U);
      paintShape(g, l, { ...o, ramp: fire.map((c) => mix(c, '#2a0a04', 0.35)), box: [(x - 0.1) * U, -0.32 * U, 0.3 * U, 0.32 * U], seed: 20 });
    }
    // a flame tail, flicked up
    const tail = new Path2D();
    tail.moveTo(-0.38 * U, -0.42 * U);
    tail.quadraticCurveTo(-0.62 * U, -0.5 * U, -0.6 * U, -0.86 * U);
    tail.quadraticCurveTo(-0.5 * U, -0.6 * U, -0.34 * U, -0.34 * U);
    tail.closePath();
    paintShape(g, tail, { ...o, box: [-0.62 * U, -0.86 * U, 0.3 * U, 0.52 * U], seed: 21 });
    // the body: a deep chest, a tucked waist
    const body = shapes.blob([[-0.42 * U, -0.42 * U], [-0.2 * U, -0.52 * U], [0.12 * U, -0.54 * U], [0.32 * U, -0.48 * U], [0.36 * U, -0.3 * U], [0.18 * U, -0.22 * U], [-0.12 * U, -0.3 * U], [-0.36 * U, -0.26 * U]], 0.55);
    paintShape(g, body, { ...o, box: [-0.42 * U, -0.54 * U, 0.78 * U, 0.32 * U], seed: 22 });
    // near legs
    for (const [x, a] of [[-0.26, -0.3], [0.28, 0.25]]) {
      const l = shapes.limb(x * U, -0.32 * U, 0.07 * U, (x + a * 0.3) * U, -0.02 * U, 0.05 * U);
      paintShape(g, l, { ...o, box: [(x - 0.1) * U, -0.34 * U, 0.3 * U, 0.34 * U], seed: 23 });
      const paw = shapes.ellipse((x + a * 0.3 + 0.03) * U, -0.02 * U, 0.07 * U, 0.035 * U);
      paintShape(g, paw, { ...o, box: [(x - 0.1) * U, -0.06 * U, 0.3 * U, 0.08 * U], seed: 24, tex: 'none' });
    }
    // head: a long snout, pointed ears, a bright eye
    const head = shapes.blob([[0.24 * U, -0.62 * U], [0.38 * U, -0.72 * U], [0.5 * U, -0.66 * U], [0.64 * U, -0.6 * U], [0.66 * U, -0.54 * U], [0.48 * U, -0.48 * U], [0.3 * U, -0.46 * U]], 0.5);
    paintShape(g, head, { ...o, box: [0.24 * U, -0.72 * U, 0.42 * U, 0.26 * U], seed: 25 });
    for (const [x, h] of [[0.32, 0.22], [0.4, 0.2]]) {
      const ear = shapes.poly([[(x - 0.05) * U, -0.66 * U], [(x + 0.05) * U, -0.68 * U], [(x - 0.02) * U, -(0.68 + h) * U]]);
      paintShape(g, ear, { ...o, box: [(x - 0.06) * U, -(0.7 + h) * U, 0.12 * U, h * U], seed: 26, tex: 'none' });
    }
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(0.47 * U, -0.62 * U, 0.03 * U, 0.02 * U, -0.2, 0, Math.PI * 2);
    g.fill();
    // a mane of licking flame along the back
    const r = seeded(27);
    for (let i = 0; i < 6; i++) {
      const x = (-0.3 + i * 0.11) * U;
      const y = (-0.5 - Math.sin(i * 0.7) * 0.04) * U;
      const lick = new Path2D();
      lick.moveTo(x - 0.05 * U, y + 0.04 * U);
      lick.quadraticCurveTo(x - 0.02 * U, y - 0.1 * U, x - 0.08 * U + r() * 0.04 * U, y - (0.16 + r() * 0.1) * U);
      lick.quadraticCurveTo(x + 0.06 * U, y - 0.06 * U, x + 0.05 * U, y + 0.04 * U);
      lick.closePath();
      paintShape(g, lick, { ramp: ['#c84a10', '#ff8a2a', '#ffc04a', '#fff0a0', '#ffffff'], box: [x - 0.08 * U, y - 0.26 * U, 0.16 * U, 0.3 * U], tex: 'none', shade: 0.25, ink: 1.8, inkColor: '#7a2006', seed: 30 + i });
    }
  }, { ink: 3.2 }));
  // The Lantern Moth: two wing poses.
  for (const k of [0, 1]) {
    add(() => sprite(`summon/moth-${k}`, 1.0, 0.8, 0.5, 0.4, (g) => {
      const spread = k ? 0.55 : 1;
      for (const side of [-1, 1]) {
        const w = shapes.blob([[0, 0], [side * 0.42 * U * spread, -0.3 * U], [side * 0.46 * U * spread, -0.06 * U], [side * 0.3 * U * spread, 0.2 * U], [side * 0.06 * U, 0.08 * U]], 0.5);
        paintShape(g, w, { ramp: ['#7a4a10', '#c8801e', '#ffc04a', '#ffe8a0', '#fffcf0'], box: [Math.min(0, side * 0.46 * U), -0.3 * U, 0.46 * U, 0.5 * U], tex: 'brush', shade: 0.25, lit: 0.25, rim: 2, ink: 2, seed: 13 + side, inkColor: '#6a3a08' });
        g.fillStyle = 'rgba(255,255,255,0.8)';
        g.beginPath();
        g.ellipse(side * 0.24 * U * spread, -0.08 * U, 0.06 * U, 0.05 * U, 0, 0, Math.PI * 2);
        g.fill();
      }
      const body = shapes.ellipse(0, 0, 0.06 * U, 0.16 * U);
      paintShape(g, body, { ramp: ['#7a4a10', '#c8801e', '#ffc04a', '#ffe8a0', '#fffcf0'], box: [-0.06 * U, -0.16 * U, 0.12 * U, 0.32 * U], tex: 'none', ink: 2, seed: 15, inkColor: '#6a3a08' });
    }));
  }
  // An ember bolt (the imps'): a churning head of flame.
  add(() => sprite('proj/ember', 0.5, 0.5, 0.25, 0.25, (g) => {
    radial(g, 0.24 * U, [[0, 'rgba(255,255,230,1)'], [0.3, 'rgba(255,200,90,1)'], [0.6, 'rgba(255,110,30,0.7)'], [1, 'rgba(255,60,10,0)']]);
  }));
  return jobs;
}
