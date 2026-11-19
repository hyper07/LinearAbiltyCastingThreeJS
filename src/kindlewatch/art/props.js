/**
 * The keep's painted props: wall blocks (snow-capped tops, brick fronts,
 * icicles), free-standing blocks and pillars, braziers, torches, banners,
 * barricades, the Rime Gate, the frozen fountain, hedges, frost-blossom
 * trees, statues, benches, low walls, sarcophagi, fences, crates, pots, the
 * ice throne, rubble, bones and grass tufts. Each returns a baked sprite
 * (paint.js); blocks carry painted face normals so the lamps light their
 * fronts and tops differently.
 */
import { Sprite, paintShape, paintNormal, paintDome, shapes, inkLine, crack, seeded, mix, INK, PPU } from '../paint.js';

const U = PPU;
export const RAMPS = {
  snow: ['#5a6194', '#8b96c8', '#cdd5ee', '#eaf0fc', '#ffffff'],
  front: ['#23263e', '#363b5c', '#4c527a', '#6a7198', '#9097bc'],
  top: ['#34364f', '#525474', '#74769a', '#989abb', '#c0c2da'],
  deep: ['#121324', '#1d1f34', '#2b2e48', '#40435f', '#5a5d7a'],
  wood: ['#2a160e', '#4a2818', '#6e3e22', '#955a32', '#c08050'],
  iron: ['#14141e', '#25263a', '#3a3c54', '#5a5e7a', '#8a90aa'],
  bronze: ['#2e1a0e', '#5a3418', '#8a5426', '#b87a3a', '#e8b066'],
  ice: ['#1e3a74', '#3466a8', '#5c9ad0', '#94cdef', '#e0f6ff'],
  hedge: ['#0e1c22', '#183038', '#25484e', '#3b6a68', '#6a9a8e'],
  frost: ['#5a7aa8', '#86a8d0', '#b4d0ec', '#dcecfa', '#ffffff'],
  clay: ['#3a1a14', '#64301e', '#8e4a2a', '#b86c3e', '#e09a62'],
  cloth: ['#2a0e1a', '#4e1628', '#7a2238', '#a43a48', '#d26a62'],
  gold: ['#4a2a0a', '#7a4a12', '#b07a1e', '#e0b040', '#fff0a0'],
  bone: ['#3a3430', '#6a6058', '#a09484', '#d0c6b0', '#f6f0de'],
  grass: ['#2a2a12', '#4e4a1a', '#7a7224', '#a8a038', '#d8d070']
};

/* ------------------------------------------------------------ blocks and walls */

function snowCap(s, rand, x0, y0, w, h, { amount = 1, overhang = 0.08, drips = 2 } = {}) {
  const pts = [];
  const n = 16;
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const rx = (w / 2) * (0.82 + amount * 0.2);
  const ry = (h / 2) * (0.78 + amount * 0.22);
  const offx = (rand() - 0.5) * w * (1 - amount) * 0.5;
  const offy = (rand() - 0.5) * h * (1 - amount) * 0.4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    // a rounded square, squarer when it's a full cap
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const k = 1 / Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(sn), 4), 0.25);
    const sq = amount > 0.8 ? k : 1 + (k - 1) * 0.4;
    let px = cx + offx + c * rx * sq * (0.84 + rand() * 0.22);
    let py = cy + offy + sn * ry * sq * (0.8 + rand() * 0.26);
    // Overhang the front edge (bottom on screen), with drips.
    if (sn > 0.35) py += overhang * U * (0.6 + rand() * 0.8);
    pts.push([px, py]);
  }
  const cap = shapes.blob(pts, 0.6);
  paintShape(s.g, cap, { ramp: RAMPS.snow, box: [cx - rx - 4, cy - ry - 4, rx * 2 + 8, ry * 2 + overhang * U * 2 + 8], tex: 'snow', shade: 0.1, core: 1.5, lit: 0.08, rim: 2.5, ink: 2.2, seed: Math.floor(rand() * 1e6) });
  paintDome(s, cap, { radius: Math.min(w, h) * 0.08, top: 1, strength: 1.2, profile: 'pillow' });
  for (let i = 0; i < drips; i++) {
    const dx = x0 + w * (0.2 + rand() * 0.6);
    const dy = y0 + h + overhang * U * 0.6;
    const drip = shapes.ellipse(dx, dy, 5 + rand() * 6, 7 + rand() * 9);
    paintShape(s.g, drip, { ramp: RAMPS.snow, box: [dx - 10, dy - 12, 20, 24], tex: 'none', shade: 0.25, rim: 1.5, ink: 2, seed: i });
    paintDome(s, drip, { radius: 6, top: 1 });
  }
  return cap;
}

function icicles(s, rand, x0, y, w, count) {
  for (let i = 0; i < count; i++) {
    const x = x0 + 8 + rand() * (w - 16);
    const len = 10 + rand() * 26;
    const wd = 4 + rand() * 5;
    const p = shapes.poly([[x - wd, y], [x + wd, y], [x + wd * 0.2, y + len], [x - wd * 0.1, y + len * 0.95]]);
    paintShape(s.g, p, { ramp: RAMPS.ice, box: [x - wd, y, wd * 2, len], tex: 'none', shade: 0.35, lit: 0.25, rim: 1.5, ink: 1.8, seed: i });
    paintNormal(s, p, [0.1, -0.7], 0);
  }
}

/** Bricks across a front face: courses of cel-shaded stones, staggered. */
function bricks(s, rand, x0, y0, w, h, ramp, { course = 0.34, style = 'brick' } = {}) {
  const g = s.g;
  const rows = Math.max(1, Math.round(h / (course * U)));
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    let x = x0 - (r % 2 ? rand() * 0.3 * U : 0);
    while (x < x0 + w - 4) {
      const bw = (style === 'rough' ? 0.3 + rand() * 0.35 : 0.42 + rand() * 0.34) * U;
      const bx = Math.max(x0 + 2, x + 2.5);
      const ex = Math.min(x0 + w - 2, x + bw - 2.5);
      if (ex - bx > 6) {
        const by = y0 + r * rh + 2.5;
        const bh = rh - 5;
        const tone = rand();
        const rr = tone < 0.25 ? ramp.map((c) => mix(c, '#000000', 0.12)) : tone > 0.85 ? ramp.map((c) => mix(c, '#6a7aa8', 0.12)) : ramp;
        const p = shapes.rrect(bx, by, ex - bx, bh, style === 'rough' ? 7 : 4);
        paintShape(g, p, { ramp: rr, box: [bx, by, ex - bx, bh], tex: 'stone', shade: 0.22, lit: 0.18, rim: 1.6, ink: 2.2, seed: Math.floor(rand() * 1e6), bounce: false });
        if (rand() < 0.18) crack(g, bx + (ex - bx) * rand(), by + 2, 1.4 + rand(), bh * 0.8, rand, 1.6);
      }
      x += bw;
    }
  }
}

/**
 * One block: a front face `frontH` tiles tall (none if 0) and a top face a
 * tile deep, `w` tiles wide, with a snow cap. The foot line is the bottom of
 * the front face.
 */
export function block(name, { frontH = 1, w = 1, seed = 1, cap = 1, style = 'brick', ice = 0.4, front = RAMPS.front, top = RAMPS.top, inset = 0 } = {}) {
  const m = 0.16;
  const Wpx = Math.round((w + m * 2) * U);
  const Hpx = Math.round((frontH + 1 + m * 2 + 0.2) * U);
  const foot = Hpx - Math.round(m * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: foot, painted: true });
  const rand = seeded(seed * 7919 + 13);
  const x0 = m * U + inset * U;
  const bw = (w - inset * 2) * U;
  const fy = foot - frontH * U;
  const ty = fy - U + inset * U;
  const tH = U - inset * U * 2;
  if (frontH > 0.04) {
    const face = shapes.rrect(x0, fy - 4, bw, frontH * U + 4, 5);
    paintShape(s.g, face, { ramp: front, box: [x0, fy, bw, frontH * U], tex: 'stone', shade: 0.12, lit: 0.06, rim: 0, ink: 2.5, seed });
    s.g.save();
    s.g.clip(face);
    if (style !== 'plain') bricks(s, rand, x0, fy, bw, frontH * U, front, { style, course: style === 'rough' ? 0.3 : 0.34 });
    // Darker toward the ground, where the snow's light doesn't reach.
    const grad = s.g.createLinearGradient(0, fy, 0, foot);
    grad.addColorStop(0, 'rgba(20,16,40,0)');
    grad.addColorStop(1, 'rgba(14,10,30,0.45)');
    s.g.fillStyle = grad;
    s.g.fillRect(x0, fy, bw, frontH * U);
    s.g.restore();
    paintNormal(s, face, [0, -0.9], 0);
    // A lit lip along the top edge (a bevel facing the sky a little).
    const lip = shapes.rrect(x0 + 2, fy - 3, bw - 4, 9, 4);
    paintShape(s.g, lip, { ramp: front.map((c) => mix(c, '#b0b8e0', 0.25)), box: [x0, fy - 3, bw, 9], tex: 'none', shade: 0.4, ink: 1.6, seed });
    paintNormal(s, lip, [0, -0.45], 0);
  }
  // The top face.
  const topFace = shapes.rrect(x0 + 1, ty, bw - 2, tH + 4, 9);
  paintShape(s.g, topFace, { ramp: top, box: [x0, ty, bw, tH], tex: 'stone', shade: 0.24, lit: 0.16, rim: 2, ink: 2.4, seed: seed + 3 });
  if (rand() < 0.6) crack(s.g, x0 + bw * (0.2 + rand() * 0.6), ty + tH * (0.2 + rand() * 0.5), rand() * 6, U * 0.35, rand, 2);
  paintNormal(s, topFace, [0, 0], 1);
  if (cap > 0) snowCap(s, rand, x0 + 3, ty + 2, bw - 6, tH - 2, { amount: cap, drips: cap > 0.7 ? 1 + Math.floor(rand() * 3) : 0 });
  if (frontH > 0.3 && rand() < ice) icicles(s, rand, x0, fy + 4, bw, 2 + Math.floor(rand() * 4));
  s.ink(4.5);
  return s.bake();
}

/** A tall square column with drums, a capital and a cap of snow. */
export function pillar(name, { frontH = 2.4, seed = 1, broken = false } = {}) {
  const m = 0.2;
  const Wpx = Math.round((1 + m * 2) * U);
  const Hpx = Math.round((frontH + 1 + m * 2 + 0.2) * U);
  const foot = Hpx - Math.round(m * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: foot, painted: true });
  const rand = seeded(seed * 31 + 7);
  const cx = Wpx / 2;
  const sw = 0.74 * U;
  const fy = foot - frontH * U;
  // base plinth
  const plinth = shapes.rrect(cx - 0.45 * U, foot - 0.32 * U, 0.9 * U, 0.32 * U, 5);
  paintShape(s.g, plinth, { ramp: RAMPS.front, box: [cx - 0.45 * U, foot - 0.32 * U, 0.9 * U, 0.32 * U], tex: 'stone', shade: 0.2, ink: 2.4, seed });
  paintNormal(s, plinth, [0, -0.85], 0);
  // shaft drums
  const drums = Math.max(3, Math.round(frontH / 0.5));
  const top = fy + 0.18 * U;
  const shaftH = foot - 0.32 * U - top;
  for (let i = 0; i < drums; i++) {
    const y0 = top + (shaftH / drums) * i;
    const d = shapes.rrect(cx - sw / 2 + (rand() - 0.5) * 3, y0 + 1.5, sw, shaftH / drums - 3, 4);
    paintShape(s.g, d, { ramp: RAMPS.front.map((c) => mix(c, '#7a86b8', 0.08)), box: [cx - sw / 2, y0, sw, shaftH / drums], tex: 'stone', shade: 0.3, lit: 0.18, rim: 2, ink: 2.2, seed: seed + i, light: [-0.95, -0.3] });
    paintNormal(s, d, [0, -0.88], 0);
    if (rand() < 0.3) crack(s.g, cx - sw / 2 + sw * rand(), y0 + 4, 1.5, 14, rand, 1.5);
  }
  // Rounded shading across the shaft (it's round-ish): a dark band on the right.
  s.g.save();
  s.g.globalAlpha = 0.25;
  s.g.fillStyle = '#0c0a1e';
  s.g.fillRect(cx + sw * 0.18, top, sw * 0.32, shaftH);
  s.g.restore();
  // capital
  const capY = fy - 0.02 * U;
  const capital = shapes.rrect(cx - 0.47 * U, capY, 0.94 * U, 0.24 * U, 5);
  paintShape(s.g, capital, { ramp: RAMPS.front, box: [cx - 0.47 * U, capY, 0.94 * U, 0.24 * U], tex: 'stone', shade: 0.25, ink: 2.4, seed: seed + 9 });
  paintNormal(s, capital, [0, -0.8], 0);
  // the top
  if (!broken) {
    const ty = fy - 0.9 * U;
    const topFace = shapes.rrect(cx - 0.47 * U, ty, 0.94 * U, 0.92 * U, 9);
    paintShape(s.g, topFace, { ramp: RAMPS.top, box: [cx - 0.47 * U, ty, 0.94 * U, 0.92 * U], tex: 'stone', shade: 0.2, ink: 2.4, seed: seed + 11 });
    paintNormal(s, topFace, [0, 0], 1);
    snowCap(s, rand, cx - 0.44 * U, ty + 2, 0.88 * U, 0.86 * U, { amount: 0.95, drips: 2 });
  }
  icicles(s, rand, cx - 0.45 * U, capY + 0.22 * U, 0.9 * U, 3);
  s.ink(4.5);
  return s.bake();
}

/** A deep wall's top, far from any room: dark broken rock with drifts. */
export function deepTop(name, { seed = 1 } = {}) {
  const m = 0.16;
  const Wpx = Math.round((1 + m * 2) * U);
  const Hpx = Math.round((1.7 + 1 + m * 2 + 0.2) * U);
  const foot = Hpx - Math.round(m * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: foot, painted: true });
  const rand = seeded(seed * 97 + 5);
  const fy = foot - 1.7 * U;
  const ty = fy - U;
  // Just the top (its front is always hidden by the wall in front of it).
  const base = shapes.rrect(m * U, ty, U, U + 6, 8);
  paintShape(s.g, base, { ramp: RAMPS.deep, box: [m * U, ty, U, U], tex: 'stone', shade: 0.25, ink: 2.2, seed });
  paintNormal(s, base, [0, 0], 1);
  const n = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const rx = (0.18 + rand() * 0.16) * U;
    const ry = rx * (0.7 + rand() * 0.3);
    const bx = m * U + rx + rand() * (U - rx * 2);
    const by = ty + ry + rand() * (U - ry * 2);
    const rock = shapes.blob(Array.from({ length: 9 }, (_, k) => {
      const a = (k / 9) * Math.PI * 2;
      return [bx + Math.cos(a) * rx * (0.8 + rand() * 0.3), by + Math.sin(a) * ry * (0.8 + rand() * 0.3)];
    }));
    paintShape(s.g, rock, { ramp: RAMPS.deep.map((c) => mix(c, '#4a4e78', 0.15)), box: [bx - rx, by - ry, rx * 2, ry * 2], tex: 'stone', shade: 0.3, lit: 0.2, rim: 2, ink: 2.4, seed: seed + i });
    paintDome(s, rock, { radius: rx * 0.5, top: 1 });
  }
  if (rand() < 0.65) snowCap(s, rand, m * U + U * 0.15, ty + U * 0.1, U * 0.7, U * 0.6, { amount: 0.35 + rand() * 0.3, drips: 0, overhang: 0 });
  s.ink(4);
  return s.bake();
}

/* ------------------------------------------------------------ fire holders */

/** A carved stone pedestal with an iron bowl of coals; `lit` coals glow. `great`: taller, wider, a rune cut in its face. */
export function brazier(name, { lit = false, great = false, seed = 1 } = {}) {
  const Hh = great ? 1.75 : 1.45;
  const Wt = great ? 1.25 : 1.05;
  const Wpx = Math.round((Wt + 0.4) * U);
  const Hpx = Math.round((Hh + 0.75) * U);
  const foot = Hpx - Math.round(0.14 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: foot, painted: true, glow: true });
  const rand = seeded(seed);
  const cx = Wpx / 2;
  const pw = (great ? 0.82 : 0.6) * U;
  const pTop = foot - (Hh - 0.3) * U;
  // foot
  const footP = shapes.rrect(cx - pw / 2 - 10, foot - 0.26 * U, pw + 20, 0.26 * U, 6);
  paintShape(s.g, footP, { ramp: RAMPS.front, box: [cx - pw / 2 - 10, foot - 0.26 * U, pw + 20, 0.26 * U], tex: 'stone', shade: 0.25, ink: 2.4, seed });
  paintNormal(s, footP, [0, -0.85], 0);
  // the column, carved
  const col = shapes.rrect(cx - pw / 2, pTop, pw, foot - 0.24 * U - pTop, 6);
  paintShape(s.g, col, { ramp: RAMPS.front.map((c) => mix(c, '#8a90c0', 0.1)), box: [cx - pw / 2, pTop, pw, foot - pTop], tex: 'stone', shade: 0.3, lit: 0.16, rim: 2, ink: 2.6, seed: seed + 1, light: [-0.9, -0.4] });
  paintNormal(s, col, [0, -0.88], 0);
  // A carved flame sigil on the face (it glows faintly when lit).
  const sy = pTop + (foot - pTop) * 0.42;
  const sig = new Path2D();
  sig.moveTo(cx, sy - 22);
  sig.quadraticCurveTo(cx + 16, sy - 2, cx + 6, sy + 16);
  sig.quadraticCurveTo(cx + 2, sy + 4, cx - 2, sy + 16);
  sig.quadraticCurveTo(cx - 18, sy, cx, sy - 22);
  s.g.save();
  s.g.fillStyle = lit ? '#7a3a20' : '#22223a';
  s.g.fill(sig);
  s.g.strokeStyle = INK;
  s.g.lineWidth = 2.5;
  s.g.stroke(sig);
  s.g.restore();
  if (great) {
    for (const k of [-1, 1]) inkLine(s.g, [[cx + k * pw * 0.36, pTop + 12], [cx + k * pw * 0.36, foot - 0.3 * U]], 2.2, INK, 0.7);
  }
  if (lit) s.glow(sig, 0.35, 2);
  // capital ring
  const ring = shapes.rrect(cx - pw / 2 - 6, pTop - 6, pw + 12, 16, 6);
  paintShape(s.g, ring, { ramp: RAMPS.front, box: [cx - pw / 2 - 6, pTop - 6, pw + 12, 16], tex: 'stone', shade: 0.3, ink: 2.2, seed: seed + 2 });
  paintNormal(s, ring, [0, -0.6], 0);
  // the bowl: an iron dish seen from above-front
  const bw = (great ? 1.15 : 0.95) * U;
  const by = pTop - 0.3 * U;
  const bowl = new Path2D();
  bowl.moveTo(cx - bw / 2, by);
  bowl.quadraticCurveTo(cx - bw * 0.42, by + 0.34 * U, cx, by + 0.36 * U);
  bowl.quadraticCurveTo(cx + bw * 0.42, by + 0.34 * U, cx + bw / 2, by);
  bowl.closePath();
  paintShape(s.g, bowl, { ramp: RAMPS.bronze, box: [cx - bw / 2, by, bw, 0.36 * U], tex: 'metal', shade: 0.35, lit: 0.2, rim: 2, ink: 2.6, seed: seed + 3 });
  paintNormal(s, bowl, [0, -0.7], 0);
  const rim = shapes.ellipse(cx, by, bw / 2, 0.16 * U);
  paintShape(s.g, rim, { ramp: RAMPS.bronze, box: [cx - bw / 2, by - 0.16 * U, bw, 0.32 * U], tex: 'metal', shade: 0.2, ink: 2.6, seed: seed + 4 });
  paintNormal(s, rim, [0, 0], 1);
  const coals = shapes.ellipse(cx, by, bw / 2 - 8, 0.16 * U - 6);
  paintShape(s.g, coals, { ramp: lit ? ['#5a1608', '#a8320c', '#ef6a1c', '#ffb040', '#fff0b0'] : ['#0e0c14', '#1c1820', '#2e2a32', '#4a444c', '#6a6266'], box: [cx - bw / 2, by - 0.16 * U, bw, 0.32 * U], tex: 'stone', shade: 0.3, ink: 1.6, seed: seed + 5 });
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2;
    const r = rand();
    const px = cx + Math.cos(a) * (bw / 2 - 16) * r;
    const py = by + Math.sin(a) * (0.16 * U - 9) * r;
    const lump = shapes.ellipse(px, py, 7 + rand() * 6, 4 + rand() * 4);
    paintShape(s.g, lump, { ramp: lit ? ['#3a0e06', '#7a2208', '#d24a12', '#ff9a30', '#ffe090'] : ['#08060c', '#141018', '#26222a', '#3a3640', '#5a5460'], box: [px - 12, py - 8, 24, 16], tex: 'none', shade: 0.4, ink: 1.4, seed: seed + 10 + i });
  }
  paintNormal(s, coals, [0, 0], 1);
  if (lit) s.glow(coals, 1, 3);
  // Snow on the foot.
  snowCap(s, rand, cx - pw / 2 - 12, foot - 0.32 * U, pw + 24, 0.16 * U, { amount: 0.6, drips: 0, overhang: 0.02 });
  s.ink(4.5);
  return s.bake();
}

/** An iron wall torch: a bracket and a pitch-wrapped head (glowing when lit). */
export function torch(name, { lit = false } = {}) {
  const Wpx = Math.round(0.5 * U);
  const Hpx = Math.round(0.75 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx - 6, glow: true });
  const cx = Wpx / 2;
  const plate = shapes.rrect(cx - 9, Hpx - 30, 18, 24, 4);
  paintShape(s.g, plate, { ramp: RAMPS.iron, box: [cx - 9, Hpx - 30, 18, 24], tex: 'metal', ink: 2, seed: 2 });
  const arm = shapes.limb(cx, Hpx - 18, 4, cx, Hpx - 46, 5);
  paintShape(s.g, arm, { ramp: RAMPS.wood, box: [cx - 6, Hpx - 50, 12, 36], tex: 'wood', ink: 2, seed: 3 });
  const head = shapes.ellipse(cx, Hpx - 50, 9, 11);
  paintShape(s.g, head, { ramp: lit ? ['#4a1206', '#8a2a0a', '#d85a14', '#ffa040', '#ffe8a0'] : ['#120e10', '#241c1c', '#3a2e2a', '#58483e', '#7a6656'], box: [cx - 9, Hpx - 61, 18, 22], tex: 'fur', ink: 2.2, seed: 4 });
  if (lit) s.glow(head, 0.9, 2);
  s.height.radius = 6;
  s.ink(3.5);
  return s.bake();
}

/** A long banner with a flame sigil, frayed at the foot, frost on its folds. */
export function banner(name, { seed = 1, color = RAMPS.cloth } = {}) {
  const Wpx = Math.round(0.72 * U);
  const Hpx = Math.round(1.45 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx, glow: false });
  const rand = seeded(seed);
  const x0 = 10;
  const x1 = Wpx - 10;
  const pts = [[x0, 14], [x1, 14], [x1 + 1, Hpx - 30]];
  const teeth = 4;
  for (let i = teeth; i >= 0; i--) {
    const x = x0 + ((x1 - x0) * i) / teeth;
    pts.push([x, Hpx - (i % 2 ? 30 : 8) - rand() * 8]);
  }
  pts.push([x0 - 1, Hpx - 30]);
  const cloth = shapes.poly(pts);
  paintShape(s.g, cloth, { ramp: color, box: [x0, 14, x1 - x0, Hpx - 14], tex: 'cloth', shade: 0.24, lit: 0.12, rim: 2, ink: 2.4, seed });
  // folds
  for (let i = 1; i < 3; i++) inkLine(s.g, [[x0 + ((x1 - x0) * i) / 3, 24], [x0 + ((x1 - x0) * i) / 3 + (rand() - 0.5) * 6, Hpx - 40]], 2, mix(INK, color[0], 0.4), 0.5);
  // the sigil: a gold flame in a ring
  const cy = Hpx * 0.42;
  const cx = Wpx / 2;
  const ring = shapes.ellipse(cx, cy, 17, 17);
  s.g.save();
  s.g.strokeStyle = RAMPS.gold[3];
  s.g.lineWidth = 4;
  s.g.stroke(ring);
  s.g.restore();
  const f = new Path2D();
  f.moveTo(cx, cy - 13);
  f.quadraticCurveTo(cx + 11, cy + 2, cx + 3, cy + 11);
  f.quadraticCurveTo(cx, cy + 3, cx - 3, cy + 11);
  f.quadraticCurveTo(cx - 11, cy + 2, cx, cy - 13);
  paintShape(s.g, f, { ramp: RAMPS.gold, box: [cx - 11, cy - 13, 22, 24], tex: 'none', ink: 1.6, seed: 5 });
  // the rod
  const rod = shapes.rrect(2, 6, Wpx - 4, 10, 4);
  paintShape(s.g, rod, { ramp: RAMPS.wood, box: [2, 6, Wpx - 4, 10], tex: 'wood', ink: 2, seed: 6 });
  // frost along the top
  const frost = shapes.blob([[x0, 16], [x1, 16], [x1 - 4, 30], [cx, 26], [x0 + 6, 32]]);
  paintShape(s.g, frost, { ramp: RAMPS.snow, box: [x0, 16, x1 - x0, 16], tex: 'snow', ink: 1.5, seed: 7 });
  s.height.radius = 8;
  s.ink(3.5);
  return s.bake();
}

/* ------------------------------------------------------------ wood */

function plank(s, x, y, w, h, rot, seed, ramp = RAMPS.wood) {
  const g = s.g;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const p = shapes.rrect(-w / 2, -h / 2, w, h, 4);
  paintShape(g, p, { ramp, box: [-w / 2, -h / 2, w, h], tex: 'wood', shade: 0.28, lit: 0.18, rim: 1.5, ink: 2.4, seed });
  const r = seeded(seed);
  for (let i = 0; i < 2; i++) {
    const nx = -w / 2 + 8 + r() * (w - 16);
    g.fillStyle = RAMPS.iron[1];
    g.beginPath();
    g.arc(nx, (r() - 0.5) * h * 0.4, 3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** A spiked barricade of lashed planks, snow along the top. */
export function barricade(name, { seed = 1, broken = false } = {}) {
  const Wpx = Math.round(1.3 * U);
  const Hpx = Math.round(1.35 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx - 10 });
  const rand = seeded(seed);
  const cx = Wpx / 2;
  const foot = Hpx - 10;
  if (!broken) {
    for (const k of [-1, 1]) plank(s, cx + k * 0.3 * U, foot - 0.45 * U, 0.16 * U, 0.95 * U, k * 0.05, seed + k + 3);
    plank(s, cx, foot - 0.55 * U, 1.12 * U, 0.2 * U, -0.06 + rand() * 0.04, seed + 5);
    plank(s, cx, foot - 0.25 * U, 1.08 * U, 0.2 * U, 0.08, seed + 6);
    plank(s, cx, foot - 0.4 * U, 1.0 * U, 0.14 * U, 0.55, seed + 7);
    for (let i = 0; i < 3; i++) {
      const sx = cx + (i - 1) * 0.36 * U;
      const spike = shapes.poly([[sx - 6, foot - 0.62 * U], [sx + 6, foot - 0.62 * U], [sx + 1, foot - 1.12 * U]]);
      paintShape(s.g, spike, { ramp: RAMPS.wood, box: [sx - 6, foot - 1.12 * U, 12, 0.5 * U], tex: 'wood', ink: 2, seed: seed + 10 + i });
    }
    const snow = shapes.blob([[cx - 0.55 * U, foot - 0.62 * U], [cx, foot - 0.7 * U], [cx + 0.55 * U, foot - 0.64 * U], [cx + 0.5 * U, foot - 0.56 * U], [cx - 0.5 * U, foot - 0.55 * U]]);
    paintShape(s.g, snow, { ramp: RAMPS.snow, box: [cx - 0.55 * U, foot - 0.7 * U, 1.1 * U, 0.15 * U], tex: 'snow', ink: 2, seed: seed + 20 });
  } else {
    for (let i = 0; i < 4; i++) plank(s, cx + (rand() - 0.5) * 0.8 * U, foot - 0.1 * U - rand() * 0.15 * U, (0.3 + rand() * 0.4) * U, 0.14 * U, (rand() - 0.5) * 2, seed + i);
  }
  s.height.radius = 10;
  s.ink(4);
  return s.bake();
}

export function crate(name, { seed = 1 } = {}) {
  const Wpx = Math.round(1.05 * U);
  const Hpx = Math.round(1.65 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx - 8, painted: true });
  const rand = seeded(seed);
  const x0 = 0.1 * U;
  const w = 0.85 * U;
  const foot = Hpx - 8;
  const fh = 0.72 * U;
  const front = shapes.rrect(x0, foot - fh, w, fh, 5);
  paintShape(s.g, front, { ramp: RAMPS.wood, box: [x0, foot - fh, w, fh], tex: 'wood', shade: 0.2, ink: 2.5, seed });
  paintNormal(s, front, [0, -0.9], 0);
  for (let i = 1; i < 3; i++) inkLine(s.g, [[x0 + 4, foot - fh + (fh * i) / 3], [x0 + w - 4, foot - fh + (fh * i) / 3]], 2, INK, 0.7);
  inkLine(s.g, [[x0 + 6, foot - 6], [x0 + w - 6, foot - fh + 6]], 3, INK, 0.6);
  const top = shapes.rrect(x0, foot - fh - 0.8 * U, w, 0.82 * U, 6);
  paintShape(s.g, top, { ramp: RAMPS.wood.map((c) => mix(c, '#c09070', 0.1)), box: [x0, foot - fh - 0.8 * U, w, 0.8 * U], tex: 'wood', shade: 0.25, ink: 2.5, seed: seed + 1 });
  paintNormal(s, top, [0, 0], 1);
  for (const [cx, cy] of [[x0 + 6, foot - fh + 6], [x0 + w - 6, foot - fh + 6], [x0 + 6, foot - 6], [x0 + w - 6, foot - 6]]) {
    const b = shapes.rrect(cx - 6, cy - 6, 12, 12, 2);
    paintShape(s.g, b, { ramp: RAMPS.iron, box: [cx - 6, cy - 6, 12, 12], tex: 'metal', ink: 1.6, seed: 3 });
  }
  snowCap(s, rand, x0 + 4, foot - fh - 0.78 * U, w - 8, 0.74 * U, { amount: 0.7, drips: 1 });
  s.ink(4);
  return s.bake();
}

export function pot(name, { seed = 1 } = {}) {
  const Wpx = Math.round(0.8 * U);
  const Hpx = Math.round(0.85 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx - 6 });
  const rand = seeded(seed);
  const cx = Wpx / 2;
  const foot = Hpx - 6;
  const body = shapes.blob([[cx - 10, foot], [cx + 10, foot], [cx + 26, foot - 26], [cx + 18, foot - 52], [cx + 12, foot - 60], [cx - 12, foot - 60], [cx - 18, foot - 52], [cx - 26, foot - 26]], 0.7);
  paintShape(s.g, body, { ramp: RAMPS.clay, box: [cx - 26, foot - 60, 52, 60], tex: 'brush', shade: 0.3, lit: 0.22, rim: 2.5, ink: 2.4, seed, gloss: 0.6 });
  inkLine(s.g, [[cx - 20, foot - 34], [cx + 20, foot - 34]], 2, INK, 0.5);
  const lip = shapes.ellipse(cx, foot - 60, 14, 5);
  paintShape(s.g, lip, { ramp: RAMPS.clay, box: [cx - 14, foot - 65, 28, 10], tex: 'none', ink: 2, seed: seed + 1 });
  const snow = shapes.ellipse(cx - 4 + rand() * 8, foot - 56, 14, 6);
  paintShape(s.g, snow, { ramp: RAMPS.snow, box: [cx - 18, foot - 62, 36, 12], tex: 'snow', ink: 1.8, seed: 3 });
  s.height.radius = 12;
  s.ink(4);
  return s.bake();
}

export function fence(name, { seed = 1 } = {}) {
  const Wpx = Math.round(1.25 * U);
  const Hpx = Math.round(1.0 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx - 8 });
  const cx = Wpx / 2;
  const foot = Hpx - 8;
  plank(s, cx, foot - 0.32 * U, 1.12 * U, 0.13 * U, 0.02, seed + 1);
  plank(s, cx, foot - 0.58 * U, 1.12 * U, 0.13 * U, -0.03, seed + 2);
  for (const k of [-1, 1]) plank(s, cx + k * 0.45 * U, foot - 0.38 * U, 0.14 * U, 0.78 * U, 0, seed + 3 + k);
  const snow = shapes.ellipse(cx, foot - 0.64 * U, 0.5 * U, 0.06 * U);
  paintShape(s.g, snow, { ramp: RAMPS.snow, box: [cx - 0.5 * U, foot - 0.7 * U, U, 0.12 * U], tex: 'snow', ink: 1.6, seed });
  s.height.radius = 7;
  s.ink(3.5);
  return s.bake();
}

/* ------------------------------------------------------------ the garden */

export function fountain(name, { seed = 1 } = {}) {
  const Wpx = Math.round(3.4 * U);
  const Hpx = Math.round(4.4 * U);
  const foot = Hpx - Math.round(0.2 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: foot, painted: true, glow: true });
  const rand = seeded(seed);
  const cx = Wpx / 2;
  // Seen from above-front: a round basin 3 tiles across, its front wall 0.8 tall.
  const ry = 1.5 * U;
  const rx = 1.5 * U;
  const cy = foot - 0.8 * U - ry; // centre of the rim ellipse
  const wall = new Path2D();
  wall.moveTo(cx - rx, cy);
  wall.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  wall.lineTo(cx + rx, cy + 0.8 * U);
  wall.ellipse(cx, cy + 0.8 * U, rx, ry, 0, 0, Math.PI, false);
  wall.closePath();
  paintShape(s.g, wall, { ramp: RAMPS.front, box: [cx - rx, cy, rx * 2, ry + 0.8 * U], tex: 'stone', shade: 0.3, lit: 0.12, ink: 2.6, seed, light: [-0.9, -0.3] });
  paintNormal(s, wall, [0, -0.85], 0);
  s.g.save();
  s.g.clip(wall);
  bricks(s, rand, cx - rx, cy + ry * 0.4, rx * 2, 0.8 * U + ry * 0.6, RAMPS.front, { course: 0.4 });
  s.g.restore();
  const rim = shapes.ellipse(cx, cy, rx, ry);
  paintShape(s.g, rim, { ramp: RAMPS.top, box: [cx - rx, cy - ry, rx * 2, ry * 2], tex: 'stone', shade: 0.2, ink: 2.6, seed: seed + 1 });
  paintNormal(s, rim, [0, 0], 1);
  const ice = shapes.ellipse(cx, cy + 4, rx - 18, ry - 16);
  paintShape(s.g, ice, { ramp: RAMPS.ice, box: [cx - rx + 18, cy - ry + 20, rx * 2 - 36, ry * 2 - 32], tex: 'ice', shade: 0.22, lit: 0.3, rim: 3, ink: 2.4, seed: seed + 2 });
  paintNormal(s, ice, [0, 0], 1);
  for (let i = 0; i < 5; i++) crack(s.g, cx + (rand() - 0.5) * rx, cy + (rand() - 0.5) * ry, rand() * 6, 40, rand, 1.8, '#1e3a74');
  s.glow(ice, 0.12, 6);
  // snow drifts on the rim
  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2;
    const px = cx + Math.cos(a) * (rx - 8);
    const py = cy + Math.sin(a) * (ry - 8);
    const d = shapes.ellipse(px, py, 22 + rand() * 18, 10 + rand() * 8, a + Math.PI / 2);
    paintShape(s.g, d, { ramp: RAMPS.snow, box: [px - 40, py - 18, 80, 36], tex: 'snow', ink: 2, seed: seed + 5 + i });
    paintDome(s, d, { radius: 8 });
  }
  // The centre: a column whose spray froze into a cascade of ice.
  const colW = 0.42 * U;
  const colH = 1.3 * U;
  const col = shapes.rrect(cx - colW / 2, cy - colH + 10, colW, colH, 8);
  paintShape(s.g, col, { ramp: RAMPS.front, box: [cx - colW / 2, cy - colH, colW, colH], tex: 'stone', shade: 0.35, ink: 2.4, seed: seed + 9, light: [-0.95, -0.3] });
  paintNormal(s, col, [0, -0.85], 0);
  const bowlY = cy - colH + 8;
  const bowl = shapes.ellipse(cx, bowlY, 0.55 * U, 0.2 * U);
  paintShape(s.g, bowl, { ramp: RAMPS.top, box: [cx - 0.55 * U, bowlY - 0.2 * U, 1.1 * U, 0.4 * U], tex: 'stone', ink: 2.4, seed: seed + 10 });
  paintNormal(s, bowl, [0, 0], 1);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.05 + (i / 8) * 0.9);
    const x = cx + Math.cos(a) * 0.5 * U * (i % 2 ? 0.9 : 1);
    const len = (0.5 + rand() * 0.6) * U;
    const p = shapes.poly([[x - 8, bowlY + 4], [x + 8, bowlY + 4], [x + 1, bowlY + len]]);
    paintShape(s.g, p, { ramp: RAMPS.ice, box: [x - 8, bowlY, 16, len], tex: 'none', shade: 0.35, lit: 0.3, rim: 2, ink: 2, seed: i });
    paintNormal(s, p, [0.1, -0.6], 0);
    s.glow(p, 0.1, 2);
  }
  // frozen jet on top
  const jet = shapes.spiky(cx, bowlY - 0.35 * U, 0.3 * U, 6, 0.5, -Math.PI / 2, rand);
  paintShape(s.g, jet, { ramp: RAMPS.ice, box: [cx - 0.3 * U, bowlY - 0.65 * U, 0.6 * U, 0.6 * U], tex: 'ice', shade: 0.3, lit: 0.3, rim: 3, ink: 2.4, seed: seed + 12 });
  paintDome(s, jet, { radius: 10, top: 0 });
  s.glow(jet, 0.15, 4);
  s.ink(5);
  return s.bake();
}

export function hedge(name, { seed = 1 } = {}) {
  const Wpx = Math.round(1.35 * U);
  const Hpx = Math.round(2.0 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx - 10 });
  const rand = seeded(seed);
  const cx = Wpx / 2;
  const foot = Hpx - 10;
  const lumps = [];
  for (let i = 0; i < 7; i++) lumps.push([cx + (rand() - 0.5) * 0.7 * U, foot - 0.4 * U - rand() * 0.9 * U, (0.24 + rand() * 0.14) * U]);
  lumps.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r] of lumps.reverse()) {
    const p = shapes.spiky(x, y, r, 9, 0.18, rand() * 3, rand);
    paintShape(s.g, p, { ramp: RAMPS.hedge, box: [x - r, y - r, r * 2, r * 2], tex: 'fur', shade: 0.35, lit: 0.18, rim: 2, ink: 2.2, seed: Math.floor(rand() * 1e5), furAngle: -Math.PI / 2 });
    // frost tips
    s.g.save();
    s.g.clip(p);
    for (let k = 0; k < 14; k++) {
      s.g.fillStyle = rand() < 0.5 ? RAMPS.frost[3] : RAMPS.frost[2];
      s.g.globalAlpha = 0.7;
      s.g.beginPath();
      s.g.ellipse(x + (rand() - 0.6) * r * 1.4, y - r * 0.4 + (rand() - 0.7) * r, 3 + rand() * 3, 2 + rand() * 2, 0, 0, Math.PI * 2);
      s.g.fill();
    }
    s.g.restore();
  }
  const cap = shapes.blob([[cx - 0.4 * U, foot - 1.15 * U], [cx, foot - 1.42 * U], [cx + 0.42 * U, foot - 1.2 * U], [cx + 0.3 * U, foot - 1.05 * U], [cx - 0.2 * U, foot - 1.0 * U]]);
  paintShape(s.g, cap, { ramp: RAMPS.snow, box: [cx - 0.4 * U, foot - 1.42 * U, 0.82 * U, 0.42 * U], tex: 'snow', ink: 2, seed });
  s.height.radius = 18;
  s.ink(4.5);
  return s.bake();
}

/** A frost-blossom tree: a crooked dark trunk under a crown of pale blue bloom and snow. */
export function tree(name, { seed = 1 } = {}) {
  const Wpx = Math.round(3.2 * U);
  const Hpx = Math.round(4.4 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx - 12, glow: true });
  const rand = seeded(seed);
  const cx = Wpx / 2;
  const foot = Hpx - 12;
  const trunk = new Path2D();
  trunk.moveTo(cx - 0.22 * U, foot);
  trunk.quadraticCurveTo(cx - 0.1 * U, foot - 1.0 * U, cx - 0.32 * U, foot - 1.9 * U);
  trunk.lineTo(cx - 0.12 * U, foot - 1.95 * U);
  trunk.quadraticCurveTo(cx + 0.05 * U, foot - 1.3 * U, cx + 0.3 * U, foot - 2.0 * U);
  trunk.lineTo(cx + 0.42 * U, foot - 1.9 * U);
  trunk.quadraticCurveTo(cx + 0.12 * U, foot - 0.9 * U, cx + 0.26 * U, foot);
  trunk.closePath();
  paintShape(s.g, trunk, { ramp: ['#120c14', '#22161e', '#3a2630', '#5a3c44', '#7a5a60'], box: [cx - 0.4 * U, foot - 2 * U, 0.8 * U, 2 * U], tex: 'wood', shade: 0.35, ink: 2.6, seed });
  // roots
  for (const k of [-1, 1]) {
    const r = shapes.limb(cx + k * 0.15 * U, foot - 8, 9, cx + k * 0.45 * U, foot, 4);
    paintShape(s.g, r, { ramp: ['#120c14', '#22161e', '#3a2630', '#5a3c44', '#7a5a60'], box: [cx - 0.5 * U, foot - 20, U, 20], tex: 'wood', ink: 2.2, seed: seed + k });
  }
  // crown: big clumps, back to front
  const clumps = [];
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    clumps.push([cx + Math.cos(a) * r * 1.1 * U, foot - 2.75 * U + Math.sin(a) * r * 0.7 * U, (0.42 + rand() * 0.3) * U]);
  }
  clumps.sort((a, b) => a[1] - b[1]);
  const bloom = ['#3a3a78', '#5a62a8', '#8a9ad4', '#c4d2f2', '#f2f6ff'];
  for (const [x, y, r] of clumps) {
    const p = shapes.blob(Array.from({ length: 11 }, (_, k) => {
      const a = (k / 11) * Math.PI * 2;
      return [x + Math.cos(a) * r * (0.82 + rand() * 0.3), y + Math.sin(a) * r * 0.85 * (0.82 + rand() * 0.3)];
    }), 0.7);
    paintShape(s.g, p, { ramp: bloom, box: [x - r, y - r, r * 2, r * 2], tex: 'fur', shade: 0.34, lit: 0.2, rim: 3, ink: 2.4, seed: Math.floor(rand() * 1e5), furAngle: -0.4 });
    // blossoms
    s.g.save();
    s.g.clip(p);
    for (let k = 0; k < 10; k++) {
      const bx = x + (rand() - 0.5) * r * 1.6;
      const by = y + (rand() - 0.6) * r * 1.4;
      s.g.fillStyle = rand() < 0.5 ? '#ffffff' : '#dce8ff';
      s.g.globalAlpha = 0.9;
      for (let pe = 0; pe < 5; pe++) {
        const a = (pe / 5) * Math.PI * 2;
        s.g.beginPath();
        s.g.ellipse(bx + Math.cos(a) * 3.5, by + Math.sin(a) * 3.5, 3, 2.2, a, 0, Math.PI * 2);
        s.g.fill();
      }
      s.glow(shapes.ellipse(bx, by, 3, 3), 0.25, 1);
    }
    s.g.restore();
    // snow on the crown's top
    if (rand() < 0.7) {
      const sn = shapes.ellipse(x - r * 0.15, y - r * 0.55, r * 0.55, r * 0.25, -0.2);
      paintShape(s.g, sn, { ramp: RAMPS.snow, box: [x - r * 0.7, y - r * 0.8, r * 1.1, r * 0.5], tex: 'snow', ink: 1.8, seed: 3 });
    }
  }
  s.height = { radius: 26, profile: 'round', detail: 0.4, strength: 2.2 };
  s.ink(5);
  return s.bake();
}

export function statue(name, { seed = 1 } = {}) {
  const Wpx = Math.round(1.3 * U);
  const Hpx = Math.round(3.3 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx - 10 });
  const rand = seeded(seed);
  const cx = Wpx / 2;
  const foot = Hpx - 10;
  const st = RAMPS.front.map((c) => mix(c, '#8890b8', 0.18));
  const plinth = shapes.rrect(cx - 0.48 * U, foot - 0.6 * U, 0.96 * U, 0.6 * U, 6);
  paintShape(s.g, plinth, { ramp: RAMPS.front, box: [cx - 0.48 * U, foot - 0.6 * U, 0.96 * U, 0.6 * U], tex: 'stone', ink: 2.5, seed });
  const top = shapes.rrect(cx - 0.5 * U, foot - 0.78 * U, U, 0.24 * U, 6);
  paintShape(s.g, top, { ramp: RAMPS.top, box: [cx - 0.5 * U, foot - 0.78 * U, U, 0.24 * U], tex: 'stone', ink: 2.4, seed: seed + 1 });
  // a hooded watcher leaning on a greatsword
  const robe = shapes.blob([[cx - 0.36 * U, foot - 0.7 * U], [cx + 0.36 * U, foot - 0.7 * U], [cx + 0.26 * U, foot - 1.6 * U], [cx + 0.22 * U, foot - 2.15 * U], [cx, foot - 2.45 * U], [cx - 0.22 * U, foot - 2.15 * U], [cx - 0.28 * U, foot - 1.6 * U]], 0.4);
  paintShape(s.g, robe, { ramp: st, box: [cx - 0.36 * U, foot - 2.45 * U, 0.72 * U, 1.75 * U], tex: 'cloth', shade: 0.34, lit: 0.18, rim: 2, ink: 2.6, seed: seed + 2 });
  const hood = shapes.ellipse(cx, foot - 2.3 * U, 0.2 * U, 0.24 * U);
  paintShape(s.g, hood, { ramp: st, box: [cx - 0.2 * U, foot - 2.54 * U, 0.4 * U, 0.48 * U], tex: 'stone', shade: 0.35, ink: 2.4, seed: seed + 3 });
  const face = shapes.ellipse(cx + 2, foot - 2.24 * U, 0.1 * U, 0.12 * U);
  s.g.fillStyle = '#16142a';
  s.g.fill(face);
  const blade = shapes.poly([[cx - 5, foot - 0.75 * U], [cx + 5, foot - 0.75 * U], [cx + 6, foot - 1.75 * U], [cx - 6, foot - 1.75 * U]]);
  paintShape(s.g, blade, { ramp: st, box: [cx - 6, foot - 1.75 * U, 12, U], tex: 'metal', ink: 2, seed: seed + 4 });
  const guard = shapes.rrect(cx - 0.22 * U, foot - 1.8 * U, 0.44 * U, 10, 4);
  paintShape(s.g, guard, { ramp: st, box: [cx - 0.22 * U, foot - 1.8 * U, 0.44 * U, 10], tex: 'stone', ink: 2, seed: seed + 5 });
  for (const [x, y, w] of [[cx - 0.18 * U, foot - 2.06 * U, 0.2], [cx + 0.14 * U, foot - 2.04 * U, 0.18], [cx, foot - 2.5 * U, 0.16]]) {
    const sn = shapes.ellipse(x, y, w * U, 0.06 * U);
    paintShape(s.g, sn, { ramp: RAMPS.snow, box: [x - w * U, y - 6, w * U * 2, 12], tex: 'snow', ink: 1.6, seed: 9 });
  }
  if (rand() < 2) icicles(s, rand, cx - 0.4 * U, foot - 0.56 * U, 0.8 * U, 3);
  s.height.radius = 14;
  s.ink(4.5);
  return s.bake();
}

export function bench(name, { seed = 1 } = {}) {
  return block(name, { frontH: 0.42, w: 2, seed, cap: 0.55, style: 'plain', ice: 0, inset: 0.12 });
}

export function sarcophagus(name, { seed = 1 } = {}) {
  const Wpx = Math.round(2.35 * U);
  const Hpx = Math.round(2.2 * U);
  const foot = Hpx - Math.round(0.16 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: foot, painted: true });
  const rand = seeded(seed);
  const x0 = 0.18 * U;
  const w = 2 * U - 6;
  const fh = 0.7 * U;
  const front = shapes.rrect(x0, foot - fh, w, fh, 6);
  paintShape(s.g, front, { ramp: RAMPS.front, box: [x0, foot - fh, w, fh], tex: 'stone', shade: 0.15, ink: 2.6, seed });
  paintNormal(s, front, [0, -0.9], 0);
  for (let i = 1; i < 4; i++) inkLine(s.g, [[x0 + (w * i) / 4, foot - fh + 10], [x0 + (w * i) / 4, foot - 10]], 2, INK, 0.5);
  const lid = shapes.rrect(x0 - 6, foot - fh - 0.95 * U, w + 12, 0.98 * U, 12);
  paintShape(s.g, lid, { ramp: RAMPS.top, box: [x0, foot - fh - 0.95 * U, w, 0.95 * U], tex: 'stone', shade: 0.2, ink: 2.6, seed: seed + 1 });
  paintNormal(s, lid, [0, 0], 1);
  // a carved knight lying on the lid
  const cy = foot - fh - 0.48 * U;
  const body = shapes.rrect(x0 + 0.42 * U, cy - 0.18 * U, w - 0.7 * U, 0.36 * U, 14);
  paintShape(s.g, body, { ramp: RAMPS.top.map((c) => mix(c, '#b0b4d0', 0.12)), box: [x0 + 0.42 * U, cy - 0.18 * U, w - 0.7 * U, 0.36 * U], tex: 'stone', shade: 0.3, lit: 0.2, ink: 2.2, seed: seed + 2 });
  paintDome(s, body, { radius: 10 });
  const head = shapes.ellipse(x0 + 0.3 * U, cy, 0.16 * U, 0.15 * U);
  paintShape(s.g, head, { ramp: RAMPS.top.map((c) => mix(c, '#b0b4d0', 0.12)), box: [x0 + 0.14 * U, cy - 0.15 * U, 0.32 * U, 0.3 * U], tex: 'stone', ink: 2.2, seed: seed + 3 });
  paintDome(s, head, { radius: 8 });
  inkLine(s.g, [[x0 + 0.55 * U, cy], [x0 + w - 0.35 * U, cy]], 2, INK, 0.5);
  snowCap(s, rand, x0 + w * 0.55, foot - fh - 0.9 * U, w * 0.4, 0.5 * U, { amount: 0.4, drips: 1 });
  s.ink(4.5);
  return s.bake();
}

/** The throne of ice at the far end of the arena: a slab seat under a fan of icicle spires. */
export function throne(name, { seed = 1 } = {}) {
  const Wpx = Math.round(3.6 * U);
  const Hpx = Math.round(5.6 * U);
  const foot = Hpx - Math.round(0.2 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: foot, painted: true, glow: true });
  const rand = seeded(seed);
  const cx = Wpx / 2;
  // dais steps
  for (let i = 0; i < 2; i++) {
    const w = (3.2 - i * 0.5) * U;
    const y = foot - (i + 1) * 0.3 * U;
    const st = shapes.rrect(cx - w / 2, y, w, 0.32 * U, 6);
    paintShape(s.g, st, { ramp: RAMPS.front, box: [cx - w / 2, y, w, 0.32 * U], tex: 'stone', shade: 0.2, ink: 2.4, seed: seed + i });
    paintNormal(s, st, [0, -0.8], 0);
    const tp = shapes.rrect(cx - w / 2, y - 0.3 * U, w, 0.32 * U, 6);
    paintShape(s.g, tp, { ramp: RAMPS.top, box: [cx - w / 2, y - 0.3 * U, w, 0.3 * U], tex: 'stone', ink: 2.2, seed: seed + 5 + i });
    paintNormal(s, tp, [0, 0], 1);
  }
  // spires behind
  const sp = [];
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = cx + (t - 0.5) * 2.6 * U;
    const hgt = (1.6 + Math.sin(t * Math.PI) * 2.2 + rand() * 0.4) * U;
    sp.push([x, hgt, (0.18 + rand() * 0.08) * U]);
  }
  sp.sort((a, b) => a[1] - b[1]);
  const base = foot - 1.1 * U;
  for (const [x, hgt, w] of sp) {
    const p = shapes.poly([[x - w, base], [x + w, base], [x + w * 0.25, base - hgt], [x - w * 0.15, base - hgt * 0.96]]);
    paintShape(s.g, p, { ramp: RAMPS.ice, box: [x - w, base - hgt, w * 2, hgt], tex: 'ice', shade: 0.38, lit: 0.3, rim: 3, ink: 2.6, seed: Math.floor(x) });
    paintNormal(s, p, [0.15, -0.6], 0);
    s.glow(p, 0.18, 4);
  }
  // seat
  const back = shapes.rrect(cx - 0.6 * U, base - 1.5 * U, 1.2 * U, 1.5 * U, 14);
  paintShape(s.g, back, { ramp: RAMPS.ice.map((c) => mix(c, '#203060', 0.25)), box: [cx - 0.6 * U, base - 1.5 * U, 1.2 * U, 1.5 * U], tex: 'ice', shade: 0.3, lit: 0.25, rim: 3, ink: 2.6, seed: seed + 20 });
  paintNormal(s, back, [0, -0.7], 0);
  const seat = shapes.rrect(cx - 0.75 * U, base - 0.2 * U, 1.5 * U, 0.55 * U, 10);
  paintShape(s.g, seat, { ramp: RAMPS.ice, box: [cx - 0.75 * U, base - 0.2 * U, 1.5 * U, 0.55 * U], tex: 'ice', shade: 0.25, ink: 2.6, seed: seed + 21 });
  paintNormal(s, seat, [0, -0.3], 0);
  // a blue rune over the seat
  const rune = shapes.spiky(cx, base - 1.0 * U, 0.2 * U, 4, 0.55, 0, rand);
  s.g.save();
  s.g.fillStyle = '#c8f0ff';
  s.g.fill(rune);
  s.g.restore();
  s.glow(rune, 1, 2);
  s.ink(5);
  return s.bake();
}

/** The Rime Gate: an iron portcullis in a stone frame with three beacon lamps over it (lit = how many). */
export function gate(name, { lit = 0, open = false } = {}) {
  const Wpx = Math.round(4.6 * U);
  const Hpx = Math.round(3.9 * U);
  const foot = Hpx - Math.round(0.16 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: foot, painted: true, glow: true });
  const rand = seeded(5);
  const cx = Wpx / 2;
  const w = 4 * U;
  const x0 = cx - w / 2;
  const hTop = foot - 2.6 * U;
  if (!open) {
    // bars
    for (let i = 0; i < 9; i++) {
      const x = x0 + 0.2 * U + (i / 8) * (w - 0.4 * U);
      const bar = shapes.rrect(x - 7, hTop + 0.3 * U, 14, foot - hTop - 0.3 * U, 5);
      paintShape(s.g, bar, { ramp: RAMPS.iron, box: [x - 7, hTop, 14, foot - hTop], tex: 'metal', shade: 0.35, ink: 2.2, seed: i });
      paintNormal(s, bar, [0, -0.9], 0);
      const tip = shapes.poly([[x - 9, foot], [x + 9, foot], [x, foot + 12]]);
      paintShape(s.g, tip, { ramp: RAMPS.iron, box: [x - 9, foot, 18, 12], tex: 'none', ink: 2, seed: i });
    }
    for (let j = 0; j < 3; j++) {
      const y = hTop + 0.6 * U + j * 0.65 * U;
      const cross = shapes.rrect(x0 + 0.1 * U, y, w - 0.2 * U, 12, 5);
      paintShape(s.g, cross, { ramp: RAMPS.iron, box: [x0, y, w, 12], tex: 'metal', shade: 0.3, ink: 2.2, seed: j + 20 });
      paintNormal(s, cross, [0, -0.85], 0);
    }
    // frost on the bars
    for (let i = 0; i < 6; i++) {
      const fx = x0 + rand() * w;
      const fy = hTop + 0.5 * U + rand() * 1.6 * U;
      const f = shapes.ellipse(fx, fy, 10 + rand() * 12, 5 + rand() * 4);
      paintShape(s.g, f, { ramp: RAMPS.frost, box: [fx - 22, fy - 9, 44, 18], tex: 'snow', ink: 1.4, seed: i + 40 });
    }
  }
  // lintel
  const lintel = shapes.rrect(x0 - 0.2 * U, hTop - 0.3 * U, w + 0.4 * U, 0.55 * U, 8);
  paintShape(s.g, lintel, { ramp: RAMPS.front, box: [x0 - 0.2 * U, hTop - 0.3 * U, w + 0.4 * U, 0.55 * U], tex: 'stone', shade: 0.25, ink: 2.6, seed: 3 });
  paintNormal(s, lintel, [0, -0.85], 0);
  s.g.save();
  s.g.clip(lintel);
  bricks(s, rand, x0 - 0.2 * U, hTop - 0.3 * U, w + 0.4 * U, 0.55 * U, RAMPS.front, { course: 0.55 });
  s.g.restore();
  const ltop = shapes.rrect(x0 - 0.2 * U, hTop - 1.25 * U, w + 0.4 * U, 0.98 * U, 10);
  paintShape(s.g, ltop, { ramp: RAMPS.top, box: [x0 - 0.2 * U, hTop - 1.25 * U, w + 0.4 * U, U], tex: 'stone', ink: 2.6, seed: 4 });
  paintNormal(s, ltop, [0, 0], 1);
  snowCap(s, rand, x0, hTop - 1.2 * U, w, 0.86 * U, { amount: 0.8, drips: 3 });
  // three beacon lamps: dark glass, or bright with flame
  for (let i = 0; i < 3; i++) {
    const lx = cx + (i - 1) * 1.15 * U;
    const ly = hTop - 0.05 * U;
    const frame = shapes.rrect(lx - 0.17 * U, ly - 0.17 * U, 0.34 * U, 0.34 * U, 6);
    paintShape(s.g, frame, { ramp: RAMPS.bronze, box: [lx - 0.17 * U, ly - 0.17 * U, 0.34 * U, 0.34 * U], tex: 'metal', ink: 2.2, seed: 30 + i });
    const glass = shapes.ellipse(lx, ly, 0.11 * U, 0.11 * U);
    const on = i < lit;
    paintShape(s.g, glass, { ramp: on ? ['#7a2a08', '#d0601a', '#ffa040', '#ffd890', '#ffffff'] : ['#0c0e1e', '#16203a', '#22305a', '#34487a', '#5a74a8'], box: [lx - 0.11 * U, ly - 0.11 * U, 0.22 * U, 0.22 * U], tex: 'none', ink: 1.8, seed: 40 + i, gloss: 1 });
    if (on) s.glow(glass, 1, 3);
  }
  s.ink(5);
  return s.bake();
}

/* ------------------------------------------------------------ small things on the ground */

export function rubble(name, { seed = 1 } = {}) {
  const Wpx = Math.round(1.2 * U);
  const Hpx = Math.round(0.8 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx - 10 });
  const rand = seeded(seed);
  const stones = [];
  for (let i = 0; i < 6; i++) stones.push([Wpx / 2 + (rand() - 0.5) * 0.8 * U, Hpx - 18 - rand() * 0.35 * U, (0.07 + rand() * 0.1) * U]);
  stones.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r] of stones) {
    const p = shapes.blob(Array.from({ length: 7 }, (_, k) => {
      const a = (k / 7) * Math.PI * 2;
      return [x + Math.cos(a) * r * (0.8 + rand() * 0.4), y + Math.sin(a) * r * 0.75 * (0.8 + rand() * 0.4)];
    }));
    paintShape(s.g, p, { ramp: RAMPS.top, box: [x - r, y - r, r * 2, r * 2], tex: 'stone', shade: 0.35, lit: 0.2, ink: 2, seed: Math.floor(rand() * 1e4) });
  }
  s.height.radius = 7;
  s.ink(3.5);
  return s.bake();
}

export function bones(name, { seed = 1 } = {}) {
  const Wpx = Math.round(1.0 * U);
  const Hpx = Math.round(0.7 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx / 2 });
  const rand = seeded(seed);
  for (let i = 0; i < 3; i++) {
    const x = Wpx / 2 + (rand() - 0.5) * 0.5 * U;
    const y = Hpx / 2 + (rand() - 0.5) * 0.3 * U;
    const a = rand() * Math.PI;
    const l = (0.16 + rand() * 0.12) * U;
    const b = shapes.limb(x - Math.cos(a) * l, y - Math.sin(a) * l, 4, x + Math.cos(a) * l, y + Math.sin(a) * l, 4);
    paintShape(s.g, b, { ramp: RAMPS.bone, box: [x - l, y - l, l * 2, l * 2], tex: 'none', ink: 1.8, seed: i });
    for (const k of [-1, 1]) {
      const e = shapes.ellipse(x + Math.cos(a) * l * k, y + Math.sin(a) * l * k, 6, 5);
      paintShape(s.g, e, { ramp: RAMPS.bone, box: [x - 6, y - 6, 12, 12], tex: 'none', ink: 1.6, seed: i + 5 });
    }
  }
  const sx = Wpx / 2 + 0.22 * U;
  const sy = Hpx / 2 - 0.05 * U;
  const skull = shapes.ellipse(sx, sy, 0.13 * U, 0.11 * U);
  paintShape(s.g, skull, { ramp: RAMPS.bone, box: [sx - 0.13 * U, sy - 0.11 * U, 0.26 * U, 0.22 * U], tex: 'brush', ink: 2, seed: 9 });
  s.g.fillStyle = INK;
  for (const k of [-1, 1]) {
    s.g.beginPath();
    s.g.ellipse(sx + k * 5, sy + 2, 3.5, 4, 0, 0, Math.PI * 2);
    s.g.fill();
  }
  s.height.radius = 5;
  s.ink(3);
  return s.bake();
}

/** A tuft of dry winter grass, blades in yellow-olive with dark ink. */
export function grass(name, { seed = 1 } = {}) {
  const Wpx = Math.round(0.8 * U);
  const Hpx = Math.round(0.62 * U);
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx - 6 });
  const rand = seeded(seed);
  const n = 7 + Math.floor(rand() * 5);
  const blades = [];
  for (let i = 0; i < n; i++) blades.push([(rand() - 0.5) * 0.36 * U, (rand() - 0.5) * 2.2, (0.28 + rand() * 0.24) * U]);
  blades.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  for (const [x0, lean, len] of blades) {
    const bx = Wpx / 2 + x0;
    const by = Hpx - 8;
    const tipx = bx + lean * len * 0.45;
    const tipy = by - len;
    const p = new Path2D();
    p.moveTo(bx - 4, by);
    p.quadraticCurveTo(bx + lean * len * 0.1 - 2, by - len * 0.6, tipx, tipy);
    p.quadraticCurveTo(bx + lean * len * 0.15 + 3, by - len * 0.5, bx + 4, by);
    p.closePath();
    const r = rand() < 0.35 ? RAMPS.grass.map((c) => mix(c, '#4a6a3a', 0.4)) : RAMPS.grass;
    paintShape(s.g, p, { ramp: r, box: [Math.min(bx, tipx) - 4, tipy, Math.abs(tipx - bx) + 8, len], tex: 'none', shade: 0.4, lit: 0.25, ink: 1.6, seed: Math.floor(rand() * 1e4), light: [-0.95, -0.3] });
  }
  const sn = shapes.ellipse(Wpx / 2, Hpx - 9, 0.22 * U, 0.05 * U);
  paintShape(s.g, sn, { ramp: RAMPS.snow, box: [Wpx / 2 - 0.22 * U, Hpx - 14, 0.44 * U, 10], tex: 'none', ink: 1.4, seed: 2 });
  s.height = { radius: 4, profile: 'round', detail: 0.4, strength: 2 };
  s.ink(3);
  return s.bake();
}

/** A footprint pair-mark in snow (drawn as a decal). */
export function footprint(name) {
  const Wpx = 34;
  const Hpx = 44;
  const s = new Sprite(name, Wpx, Hpx, { ox: Wpx / 2, oy: Hpx / 2 });
  const p = shapes.ellipse(Wpx / 2, Hpx / 2, 10, 17);
  s.g.fillStyle = '#7a84b8';
  s.g.fill(p);
  s.g.fillStyle = '#5a6496';
  s.g.fill(shapes.ellipse(Wpx / 2 + 2, Hpx / 2 + 3, 7, 12));
  s.height.radius = 6;
  return s.bake();
}
