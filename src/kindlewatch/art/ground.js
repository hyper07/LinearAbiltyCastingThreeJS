/**
 * The ground's painted, tileable textures — flagstones, snow, ice and frozen
 * earth — each an albedo and a normal+height map, 512 px for four tiles.
 * Shapes that cross an edge are painted again on the far side, and the
 * height is measured on a 3×3 tiling, so every texture repeats seamlessly.
 */
import { makeCanvas, paintShape, shapes, crack, seeded, mix, INK } from '../paint.js';
import { RAMPS } from './props.js';
import { heightFromAlpha, normalsFromHeight } from '../normals.js';

export const SIZE = 512;
export const REPEAT = 4; // tiles per texture

const ctxOf = (c) => c.getContext('2d', { willReadFrequently: true });

/** Draw `fn(g, dx, dy)` at the nine wrap offsets. */
function wrapped(fn) {
  for (const dy of [-SIZE, 0, SIZE]) for (const dx of [-SIZE, 0, SIZE]) fn(dx, dy);
}

/** Periodic value noise (period p cells). */
function pnoise(x, y, p, seed) {
  const h = (i, j) => {
    i = ((i % p) + p) % p;
    j = ((j % p) + p) % p;
    let k = Math.imul(i, 374761393) + Math.imul(j, 668265263) + seed * 1013;
    k = Math.imul(k ^ (k >>> 13), 1274126177);
    return ((k ^ (k >>> 16)) >>> 0) / 4294967296;
  };
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = h(xi, yi);
  const b = h(xi + 1, yi);
  const c = h(xi, yi + 1);
  const d = h(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Normals from a tileable height field (wraps at the edges), packed with the height. */
function packTileable(height, strength) {
  const n = SIZE;
  const out = new Uint8Array(n * n * 4);
  const at = (x, y) => height[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 0.5;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 0.5;
      let nx = -dx * strength;
      let ny = dy * strength;
      const l = Math.hypot(nx, ny, 1);
      nx /= l;
      ny /= l;
      const i = (y * n + x) * 4;
      out[i] = Math.round((nx * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round(Math.max(0, Math.min(1, at(x, y))) * 255);
      out[i + 3] = 255;
    }
  }
  return out;
}

/** Height of painted shapes from a mask canvas, measured on a 3×3 tiling so edges wrap. */
function tileableShapeHeight(maskCanvas, radius, profile = 'bevel') {
  const n = SIZE;
  const big = makeCanvas(n * 3, n * 3);
  const bg = ctxOf(big);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) bg.drawImage(maskCanvas, i * n, j * n);
  const d = bg.getImageData(0, 0, n * 3, n * 3).data;
  const alpha = new Uint8ClampedArray(n * n * 9);
  for (let i = 0; i < n * n * 9; i++) alpha[i] = d[i * 4 + 3];
  const h = heightFromAlpha(alpha, n * 3, n * 3, { radius, profile, threshold: 100 });
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out[y * n + x] = h[(y + n) * n * 3 + x + n];
  return out;
}

function albedoBytes(c) {
  return new Uint8Array(ctxOf(c).getImageData(0, 0, SIZE, SIZE).data.buffer.slice(0));
}

/** Clip a convex polygon by the half-plane on the near side of the bisector between a and b. */
function clipHalf(poly, ax, ay, bx, by) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const nx = bx - ax;
  const ny = by - ay;
  const side = (p) => (p[0] - mx) * nx + (p[1] - my) * ny; // < 0 on a's side
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp <= 0) out.push(p);
    if ((sp < 0) !== (sq < 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/**
 * Flagstones: irregular cut slabs (a relaxed Voronoi of a jittered grid,
 * some cells merged into big slabs), cel-shaded and chipped, some cracked,
 * with inked gaps.
 */
export function flagstones(seed = 3) {
  const rand = seeded(seed);
  const c = makeCanvas(SIZE, SIZE);
  const g = ctxOf(c);
  const mask = makeCanvas(SIZE, SIZE);
  const mg = ctxOf(mask);
  g.fillStyle = '#3a3c46';
  g.fillRect(0, 0, SIZE, SIZE);
  const N = 4;
  const cell = SIZE / N;
  let pts = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (rand() < 0.12) continue; // a missing point makes a big slab
    pts.push([(i + 0.5 + (rand() - 0.5) * 0.7) * cell, (j + 0.5 + (rand() - 0.5) * 0.7) * cell]);
  }
  const cellsOf = (points) => points.map(([px, py], k) => {
    let poly = [[px - cell * 2.5, py - cell * 2.5], [px + cell * 2.5, py - cell * 2.5], [px + cell * 2.5, py + cell * 2.5], [px - cell * 2.5, py + cell * 2.5]];
    for (let m = 0; m < points.length; m++) {
      for (const dy of [-SIZE, 0, SIZE]) for (const dx of [-SIZE, 0, SIZE]) {
        if (m === k && !dx && !dy) continue;
        const qx = points[m][0] + dx;
        const qy = points[m][1] + dy;
        if (Math.abs(qx - px) > cell * 3 || Math.abs(qy - py) > cell * 3) continue;
        poly = clipHalf(poly, px, py, qx, qy);
      }
    }
    return poly;
  });
  // One Lloyd step for evener slabs.
  pts = cellsOf(pts).map((poly) => [poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length]);
  const cells = cellsOf(pts);
  const base = ['#36383e', '#4e5158', '#686c74', '#868a92', '#aeb0b6'];
  cells.forEach((poly, k) => {
    const [px, py] = pts[k];
    const tone = rand();
    const sd = Math.floor(rand() * 1e6);
    const cracked = rand() < 0.28;
    // Inset toward the centre for the gap, keep corners soft.
    const gap = 3 + rand() * 1.6;
    const inset = poly.map(([x, y]) => {
      const dx = x - px;
      const dy = y - py;
      const d = Math.hypot(dx, dy) || 1;
      return [x - (dx / d) * gap, y - (dy / d) * gap];
    });
    const ramp = base.map((col) => mix(col, tone < 0.3 ? '#6a6a7a' : tone < 0.6 ? '#5a6a7e' : tone < 0.85 ? '#707070' : '#7a6e68', 0.12));
    const xs = inset.map((p) => p[0]);
    const ys = inset.map((p) => p[1]);
    const bx = Math.min(...xs);
    const by = Math.min(...ys);
    const bw = Math.max(...xs) - bx;
    const bh = Math.max(...ys) - by;
    wrapped((dx, dy) => {
      if (bx + dx > SIZE + 4 || bx + bw + dx < -4 || by + dy > SIZE + 4 || by + bh + dy < -4) return;
      g.save();
      g.translate(dx, dy);
      const p = shapes.blob(inset, 0.22);
      paintShape(g, p, { ramp, box: [bx, by, bw, bh], tex: 'stone', shade: 0.08, core: 1.5, lit: 0.06, rim: 1.4, ink: 1.6, seed: sd, inkColor: mix(INK, '#4a4c5a', 0.55), texAmount: 1.0 });
      if (cracked) {
        const r = seeded(sd + 1);
        crack(g, bx + bw * (0.25 + r() * 0.5), by + 3, Math.PI / 2 + (r() - 0.5), bh * 0.75, r, 2.2);
      }
      g.restore();
      mg.save();
      mg.translate(dx, dy);
      mg.fillStyle = '#fff';
      mg.fill(shapes.blob(inset, 0.22));
      mg.restore();
    });
  });
  const hgt = tileableShapeHeight(mask, 9, 'bevel');
  return { albedo: albedoBytes(c), normal: packTileable(hgt, 2.4), canvas: c };
}

/** Snow: blue-white with soft dabs, wind ripples and sparkles; a gentle, rolling height. */
export function snowTexture(seed = 5) {
  const rand = seeded(seed);
  const c = makeCanvas(SIZE, SIZE);
  const g = ctxOf(c);
  g.fillStyle = '#d6dcf2';
  g.fillRect(0, 0, SIZE, SIZE);
  const hgt = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) hgt[y * SIZE + x] = pnoise(x / 64, y / 64, 8, seed) * 0.6 + pnoise(x / 32, y / 32, 16, seed + 1) * 0.3;
  // Shade the dabs by the height so the painting and the bumps agree.
  for (let i = 0; i < 1400; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const h = hgt[(y | 0) * SIZE + (x | 0)];
    const col = h > 0.5 ? (rand() < 0.5 ? '#f0f4fe' : '#e6ecfa') : rand() < 0.5 ? '#b8c2e4' : '#c6cfec';
    const rx = 6 + rand() * 18;
    const ry = 3 + rand() * 7;
    const a = -0.35 + (rand() - 0.5) * 0.4;
    wrapped((dx, dy) => {
      if (x + dx < -30 || x + dx > SIZE + 30 || y + dy < -30 || y + dy > SIZE + 30) return;
      g.globalAlpha = 0.25 + rand() * 0.2;
      g.fillStyle = col;
      g.beginPath();
      g.ellipse(x + dx, y + dy, rx, ry, a, 0, Math.PI * 2);
      g.fill();
    });
  }
  // Wind ripples: long faint strokes.
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const len = 30 + rand() * 60;
    wrapped((dx, dy) => {
      g.globalAlpha = 0.18;
      g.strokeStyle = '#9aa6d4';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x + dx, y + dy);
      g.quadraticCurveTo(x + dx + len * 0.5, y + dy - 6, x + dx + len, y + dy + 2);
      g.stroke();
    });
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 260; i++) {
    g.fillStyle = rand() < 0.7 ? '#ffffff' : '#cfe8ff';
    g.globalAlpha = 0.5 + rand() * 0.5;
    const s = 1.2 + rand() * 1.6;
    g.fillRect(rand() * SIZE, rand() * SIZE, s, s);
  }
  g.globalAlpha = 1;
  return { albedo: albedoBytes(c), normal: packTileable(hgt, 14), canvas: c };
}

/** Ice: deep blue glass, pale streaks, inked cracks. */
export function iceTexture(seed = 9) {
  const rand = seeded(seed);
  const c = makeCanvas(SIZE, SIZE);
  const g = ctxOf(c);
  const hgt = new Float32Array(SIZE * SIZE).fill(0.6);
  const img = g.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = pnoise(x / 64, y / 64, 8, seed) * 0.7 + pnoise(x / 32, y / 32, 16, seed + 4) * 0.3;
      const i = (y * SIZE + x) * 4;
      const col = n < 0.45 ? [96, 150, 208] : n < 0.6 ? [128, 182, 226] : [168, 214, 240];
      const k = (n * 40) | 0;
      img.data[i] = col[0] + k * 0.3;
      img.data[i + 1] = col[1] + k * 0.3;
      img.data[i + 2] = col[2] + k * 0.2;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  g.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const len = 30 + rand() * 90;
    const w = 2 + rand() * 7;
    wrapped((dx, dy) => {
      g.globalAlpha = 0.25 + rand() * 0.3;
      g.strokeStyle = '#eaf8ff';
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x + dx, y + dy);
      g.lineTo(x + dx + len, y + dy - len * 0.55);
      g.stroke();
    });
  }
  g.globalAlpha = 1;
  const mask = makeCanvas(SIZE, SIZE);
  const mg = ctxOf(mask);
  for (let i = 0; i < 14; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const a = rand() * Math.PI * 2;
    const r = seeded(i * 77 + seed);
    wrapped((dx, dy) => {
      g.save();
      g.translate(dx, dy);
      crack(g, x, y, a, 60 + r() * 80, seeded(i * 77 + seed), 2.2, '#1e3a74');
      g.restore();
    });
  }
  mg.fillStyle = '#fff';
  mg.fillRect(0, 0, SIZE, SIZE);
  return { albedo: albedoBytes(c), normal: packTileable(hgt, 1), canvas: c };
}

/** Frozen earth with pebbles. */
export function dirtTexture(seed = 13) {
  const rand = seeded(seed);
  const c = makeCanvas(SIZE, SIZE);
  const g = ctxOf(c);
  g.fillStyle = '#4a4246';
  g.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 900; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    g.globalAlpha = 0.2;
    g.fillStyle = rand() < 0.5 ? '#3c3438' : '#5c5254';
    g.beginPath();
    g.ellipse(x, y, 4 + rand() * 12, 3 + rand() * 6, rand() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const mask = makeCanvas(SIZE, SIZE);
  const mg = ctxOf(mask);
  for (let i = 0; i < 26; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    const r = 6 + rand() * 10;
    const sd = Math.floor(rand() * 1e5);
    wrapped((dx, dy) => {
      if (x + dx < -20 || x + dx > SIZE + 20 || y + dy < -20 || y + dy > SIZE + 20) return;
      const p = shapes.ellipse(x + dx, y + dy, r, r * 0.75, 0.3);
      paintShape(g, p, { ramp: RAMPS.top.map((cc) => mix(cc, '#6a6060', 0.45)), box: [x + dx - r, y + dy - r, r * 2, r * 2], tex: 'none', shade: 0.35, lit: 0.25, ink: 1.6, seed: sd, inkColor: '#2a2428' });
      mg.fillStyle = '#fff';
      mg.fill(p);
    });
  }
  for (let i = 0; i < 200; i++) {
    g.fillStyle = '#c8d0ec';
    g.globalAlpha = 0.5;
    g.fillRect(rand() * SIZE, rand() * SIZE, 2, 2);
  }
  g.globalAlpha = 1;
  const hgt = tileableShapeHeight(mask, 5, 'round');
  return { albedo: albedoBytes(c), normal: packTileable(hgt, 3), canvas: c };
}

/** Four channels of periodic value noise (256², period 8 / 16 / 32 / 4 cells): for the shaders. */
export function noiseBytes(n = 256) {
  const out = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      out[i] = pnoise(x / 32, y / 32, n / 32, 1) * 160 + pnoise(x / 8, y / 8, n / 8, 11) * 95;
      out[i + 1] = pnoise(x / 16, y / 16, n / 16, 2) * 255;
      out[i + 2] = pnoise(x / 64, y / 64, n / 64, 3) * 255;
      out[i + 3] = pnoise(x / 8, y / 8, n / 8, 4) * 255;
    }
  }
  return out;
}
