/**
 * The painting kit: every sprite in Kindlewatch is painted here in code, at
 * high resolution, the way a cel-shaded illustration is inked and coloured —
 *
 *   1. a flat base from a hue-shifted ramp (src/pixel/art.js `ramp`),
 *   2. a hard-edged shadow crescent on the side away from the light (top-left)
 *      and a deeper core inside it, a lit crescent and a rim on the near side,
 *   3. brush texture (strokes, dabs, speckle, fur or metal streaks) clipped to
 *      the shape,
 *   4. thin inner ink lines, and at the end a thick ink silhouette round the
 *      whole sprite, heavier on the shadow side.
 *
 * A Sprite also carries a glow layer (what shines in the dark: flames, eyes,
 * runes) and, for blocks, a hand-painted normal layer (faces); everything
 * else gets normals from its own shape (normals.js).
 */
import { ramp as makeRamp, mix } from '../pixel/art.js';
import { dilate, heightFromAlpha, normalsFromHeight } from './normals.js';

export { mix };
export const INK = '#1a1222';
export const LIGHT = [-0.55, -0.83]; // toward the light, canvas coordinates (up-left)

/** Scaled sprite resolution: pixels per tile. */
export const PPU = 96;

export const makeCanvas = (w, h) => {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.max(1, w), Math.max(1, h)) : Object.assign(document.createElement('canvas'), { width: Math.max(1, w), height: Math.max(1, h) });
  return c;
};
const ctx2d = (c) => c.getContext('2d', { willReadFrequently: true });

/** Ramps, deep shadow → highlight, cached by base colour. */
const ramps = new Map();
export function rampOf(base, opts) {
  const key = base + JSON.stringify(opts ?? {});
  if (!ramps.has(key)) ramps.set(key, makeRamp(base, { shift: 22, contrast: 0.2, ...opts }));
  return ramps.get(key);
}

/** A seeded random. */
export function seeded(seed = 1) {
  let h = seed >>> 0 || 1;
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------ shapes */

/** Path helpers in sprite pixels. */
export const shapes = {
  ellipse(cx, cy, rx, ry, rot = 0) {
    const p = new Path2D();
    p.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2);
    return p;
  },
  rrect(x, y, w, h, r) {
    const p = new Path2D();
    p.roundRect(x, y, w, h, r);
    return p;
  },
  /** A closed smooth blob through points (Catmull-Rom → Bézier). */
  blob(pts, tension = 0.5) {
    const p = new Path2D();
    const n = pts.length;
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      const t = tension / 3;
      p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t, p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t, p2[0], p2[1]);
    }
    p.closePath();
    return p;
  },
  poly(pts) {
    const p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    p.closePath();
    return p;
  },
  /** A tapering limb from (x0,y0) radius r0 to (x1,y1) radius r1. */
  limb(x0, y0, r0, x1, y1, r1) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    const n = a + Math.PI / 2;
    const p = new Path2D();
    p.moveTo(x0 + Math.cos(n) * r0, y0 + Math.sin(n) * r0);
    p.lineTo(x1 + Math.cos(n) * r1, y1 + Math.sin(n) * r1);
    p.arc(x1, y1, r1, n, n + Math.PI, true);
    p.lineTo(x0 - Math.cos(n) * r0, y0 - Math.sin(n) * r0);
    p.arc(x0, y0, r0, n + Math.PI, n, true);
    p.closePath();
    return p;
  },
  /** A star-ish spiky blob (flames, crystals, bursts). */
  spiky(cx, cy, r, spikes, depth, rot = 0, rand = Math.random) {
    const pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const a = rot + (i / (spikes * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * (1 - depth) * (0.85 + rand() * 0.3) : r * (0.85 + rand() * 0.3);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return shapes.poly(pts);
  }
};

/* ------------------------------------------------------------ the scratch layer */

let scratch = null;
function layer(w, h) {
  if (!scratch || scratch.width < w || scratch.height < h) scratch = makeCanvas(Math.max(w, scratch?.width ?? 0), Math.max(h, scratch?.height ?? 0));
  const g = ctx2d(scratch);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.filter = 'none';
  g.clearRect(0, 0, scratch.width, scratch.height);
  return g;
}

/* ------------------------------------------------------------ painting a shape */

/**
 * Paint one shape, cel-shaded and textured.
 * @param {CanvasRenderingContext2D} g
 * @param {Path2D} path
 * @param {object} o
 *   base (colour) or ramp ([5]), box [x, y, w, h] (the shape's rough bounds),
 *   shade (0…1 how far the shadow reaches, default .32), core (.5 of shade),
 *   lit (.2), rim (px, 0 for none), tex ('brush' | 'stone' | 'fur' | 'metal' |
 *   'cloth' | 'snow' | 'ice' | 'wood' | 'skin' | 'none'), ink (px; inner line),
 *   gloss (a specular spot), seed, light ([x, y] toward the light).
 */
export function paintShape(g, path, o) {
  const r = o.ramp ?? rampOf(o.base ?? '#8890a0');
  const [bx, by, bw, bh] = o.box;
  const size = Math.max(bw, bh);
  const L = o.light ?? LIGHT;
  const rand = seeded(o.seed ?? Math.round(bx * 13 + by * 7 + bw));
  const W = Math.ceil(g.canvas.width);
  const H = Math.ceil(g.canvas.height);
  const m = g.getTransform();
  g.save();
  g.clip(path);
  // 1. base
  g.fillStyle = o.flat ?? r[2];
  g.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  if (!o.flat) {
    const crescent = (color, shift, soft = 0) => {
      // colour the shape, then cut away the same shape shifted toward the light: what's left is the far side.
      const s = layer(W, H);
      s.setTransform(m);
      s.fillStyle = color;
      s.fill(path);
      s.globalCompositeOperation = 'destination-out';
      if (soft) s.filter = `blur(${soft}px)`;
      s.translate(L[0] * shift, L[1] * shift);
      s.fill(path);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(scratch, 0, 0);
      g.restore();
    };
    const litCrescent = (color, shift, alpha = 1, soft = 0) => {
      const s = layer(W, H);
      s.setTransform(m);
      s.globalAlpha = alpha;
      s.fillStyle = color;
      s.fill(path);
      s.globalAlpha = 1;
      s.globalCompositeOperation = 'destination-out';
      if (soft) s.filter = `blur(${soft}px)`;
      s.translate(-L[0] * shift, -L[1] * shift);
      s.fill(path);
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(scratch, 0, 0);
      g.restore();
    };
    const shade = (o.shade ?? 0.32) * size;
    crescent(r[1], shade, o.softShade ?? 0.6);
    crescent(r[0], shade * (o.core ?? 1.6), o.softShade ?? 0.6);
    // A lighter band in the middle of the shadow side: bounced light from the snow.
    if (o.bounce !== false) {
      g.save();
      g.globalAlpha = 0.18;
      g.strokeStyle = r[3];
      g.lineWidth = Math.max(1.5, size * 0.04);
      g.translate(-L[0] * size * 0.02, -L[1] * size * 0.02);
      g.stroke(path);
      g.restore();
    }
    litCrescent(r[3], (o.lit ?? 0.2) * size, 0.9);
    if (o.rim !== 0) litCrescent(r[4], Math.max(1.6, o.rim ?? size * 0.06), 0.9);
  }
  // 3. texture
  texture(g, o.tex ?? 'brush', r, o.box, rand, o);
  if (o.gloss) {
    g.fillStyle = r[4];
    g.globalAlpha = 0.9;
    const gx = bx + bw * (0.3 + L[0] * 0.05);
    const gy = by + bh * 0.28;
    g.beginPath();
    g.ellipse(gx, gy, bw * 0.09 * o.gloss, bh * 0.06 * o.gloss, -0.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(gx - bw * 0.03, gy - bh * 0.015, bw * 0.03 * o.gloss, bh * 0.022 * o.gloss, -0.6, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }
  g.restore();
  // 4. inner ink
  if (o.ink !== 0) {
    g.save();
    g.strokeStyle = o.inkColor ?? mix(INK, r[0], 0.25);
    g.lineWidth = o.ink ?? Math.max(1.6, size * 0.035);
    g.lineJoin = 'round';
    g.stroke(path);
    g.restore();
  }
}

/** Brush texture clipped to the current clip. */
export function texture(g, kind, r, box, rand, o = {}) {
  const [bx, by, bw, bh] = box;
  const area = bw * bh;
  const k = o.texAmount ?? 1;
  g.save();
  g.lineCap = 'round';
  if (kind === 'brush' || kind === 'cloth' || kind === 'skin' || kind === 'wood') {
    const n = Math.min(900, (area / 70) * k);
    const ang = kind === 'wood' ? Math.PI / 2 + 0.05 : kind === 'cloth' ? 1.3 : -0.6;
    for (let i = 0; i < n; i++) {
      const x = bx + rand() * bw;
      const y = by + rand() * bh;
      const len = (kind === 'wood' ? 10 + rand() * 26 : 4 + rand() * 12) * (o.strokeScale ?? 1);
      const a = ang + (rand() - 0.5) * 0.5;
      g.strokeStyle = rand() < 0.5 ? r[1] : r[3];
      g.globalAlpha = (kind === 'skin' ? 0.06 : 0.12) + rand() * 0.12;
      g.lineWidth = 1 + rand() * 2.2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
  } else if (kind === 'stone') {
    const n = Math.min(1400, (area / 30) * k);
    for (let i = 0; i < n; i++) {
      const x = bx + rand() * bw;
      const y = by + rand() * bh;
      g.fillStyle = rand() < 0.55 ? r[1] : r[3];
      g.globalAlpha = 0.1 + rand() * 0.18;
      const s = 1 + rand() * 3.2;
      g.beginPath();
      g.ellipse(x, y, s * (1 + rand()), s, rand() * 3, 0, Math.PI * 2);
      g.fill();
    }
    // Chips and pits.
    for (let i = 0; i < area / 2600; i++) {
      const x = bx + rand() * bw;
      const y = by + rand() * bh;
      g.globalAlpha = 0.5;
      g.strokeStyle = r[0];
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rand() - 0.5) * 9, y + rand() * 6);
      g.stroke();
    }
  } else if (kind === 'fur') {
    const n = Math.min(1200, (area / 22) * k);
    for (let i = 0; i < n; i++) {
      const x = bx + rand() * bw;
      const y = by + rand() * bh;
      const len = 5 + rand() * 9;
      const a = Math.PI / 2 + (rand() - 0.5) * 0.9 + (o.furAngle ?? 0);
      g.strokeStyle = rand() < 0.45 ? r[1] : rand() < 0.5 ? r[3] : r[4];
      g.globalAlpha = 0.25 + rand() * 0.25;
      g.lineWidth = 1 + rand() * 1.4;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 2, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
  } else if (kind === 'metal') {
    for (let i = 0; i < Math.min(80, bh / 2); i++) {
      const y = by + rand() * bh;
      g.strokeStyle = rand() < 0.5 ? r[4] : r[1];
      g.globalAlpha = 0.08 + rand() * 0.12;
      g.lineWidth = 1 + rand() * 3;
      g.beginPath();
      g.moveTo(bx, y);
      g.lineTo(bx + bw, y + (rand() - 0.5) * 8);
      g.stroke();
    }
    // A bright streak where the light catches.
    g.globalAlpha = 0.55;
    g.strokeStyle = r[4];
    g.lineWidth = Math.max(2, bw * 0.05);
    g.beginPath();
    g.moveTo(bx + bw * 0.25, by + bh * 0.12);
    g.quadraticCurveTo(bx + bw * 0.18, by + bh * 0.45, bx + bw * 0.28, by + bh * 0.82);
    g.stroke();
  } else if (kind === 'snow') {
    const n = Math.min(900, (area / 40) * k);
    for (let i = 0; i < n; i++) {
      const x = bx + rand() * bw;
      const y = by + rand() * bh;
      g.fillStyle = rand() < 0.6 ? r[3] : r[1];
      g.globalAlpha = 0.12 + rand() * 0.14;
      g.beginPath();
      g.ellipse(x, y, 2 + rand() * 6, 1.5 + rand() * 3, -0.3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < area / 400; i++) {
      g.fillStyle = '#ffffff';
      g.globalAlpha = 0.5 + rand() * 0.5;
      g.fillRect(bx + rand() * bw, by + rand() * bh, 1.6, 1.6);
    }
  } else if (kind === 'ice') {
    for (let i = 0; i < Math.min(60, area / 300); i++) {
      const x = bx + rand() * bw;
      const y = by + rand() * bh;
      g.strokeStyle = rand() < 0.6 ? '#ffffff' : r[1];
      g.globalAlpha = 0.2 + rand() * 0.3;
      g.lineWidth = 1 + rand() * 2.5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 6 + rand() * 18, y - 4 - rand() * 12);
      g.stroke();
    }
  }
  g.restore();
}

/** A tapered ink stroke along points (crack, crease, rib). */
export function inkLine(g, pts, w = 2.5, color = INK, alpha = 1) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.globalAlpha = alpha;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let i = 1; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    g.lineWidth = w * (0.45 + Math.sin(t * Math.PI) * 0.75);
    g.beginPath();
    g.moveTo(pts[i - 1][0], pts[i - 1][1]);
    g.lineTo(pts[i][0], pts[i][1]);
    g.stroke();
  }
  g.restore();
}

/** A jagged crack from (x, y) heading `a`. */
export function crack(g, x, y, a, len, rand, w = 2.2, color = INK, depth = 0) {
  const pts = [[x, y]];
  let cx = x;
  let cy = y;
  const steps = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < steps; i++) {
    a += (rand() - 0.5) * 1.1;
    cx += Math.cos(a) * (len / steps);
    cy += Math.sin(a) * (len / steps);
    pts.push([cx, cy]);
    if (depth < 2 && rand() < 0.3) crack(g, cx, cy, a + (rand() < 0.5 ? 0.9 : -0.9), len * 0.35, rand, w * 0.6, color, depth + 1);
  }
  inkLine(g, pts, w, color, 0.85);
}

/* ------------------------------------------------------------ a sprite */

/**
 * A sprite being painted: an albedo canvas, a glow canvas, optionally a
 * painted-normal canvas; `ox, oy` its pivot in pixels (the feet for
 * standing things), `w, h` in pixels. Finish with `ink()` then `bake()`.
 */
export class Sprite {
  constructor(name, w, h, { ox = w / 2, oy = h, ppu = PPU, painted = false, glow = false } = {}) {
    this.name = name;
    this.w = Math.ceil(w);
    this.h = Math.ceil(h);
    this.ox = ox;
    this.oy = oy;
    this.ppu = ppu;
    this.canvas = makeCanvas(this.w, this.h);
    this.g = ctx2d(this.canvas);
    this.g.lineJoin = 'round';
    this.g.lineCap = 'round';
    this.glowCanvas = glow ? makeCanvas(this.w, this.h) : null;
    this.gg = glow ? ctx2d(this.glowCanvas) : null;
    this.nrmCanvas = painted ? makeCanvas(this.w, this.h) : null;
    this.ng = painted ? ctx2d(this.nrmCanvas) : null;
    this.height = { radius: Math.max(6, Math.min(this.w, this.h) * 0.16), profile: 'round', detail: 0.25, strength: 2.2 };
  }

  /** Paint glow (0…1 white) on the glow layer. */
  glow(path, alpha = 1, blur = 0) {
    if (!this.gg) {
      this.glowCanvas = makeCanvas(this.w, this.h);
      this.gg = ctx2d(this.glowCanvas);
    }
    this.gg.save();
    this.gg.setTransform(this.g.getTransform());
    if (blur) this.gg.filter = `blur(${blur}px)`;
    this.gg.globalAlpha = alpha;
    this.gg.fillStyle = '#fff';
    this.gg.fill(path);
    this.gg.restore();
  }

  /**
   * The ink silhouette: the sprite's shape grown by `w` px in ink, nudged
   * toward the shadow side so the line is heavier at the bottom right.
   */
  ink(w = 4, color = INK) {
    const { w: W, h: H } = this;
    const img = this.g.getImageData(0, 0, W, H);
    const alpha = new Uint8ClampedArray(W * H);
    for (let i = 0; i < W * H; i++) alpha[i] = img.data[i * 4 + 3];
    const grown = dilate(alpha, W, H, w);
    const out = this.g.createImageData(W, H);
    const [ir, ig, ib] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
    const sh = Math.max(1, Math.round(w * 0.35));
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        // Heavier down-right: take the grown mask at this pixel or shifted up-left.
        const j = Math.max(0, y - sh) * W + Math.max(0, x - sh);
        const a = Math.max(grown[i], grown[j] * 0.95);
        out.data[i * 4] = ir;
        out.data[i * 4 + 1] = ig;
        out.data[i * 4 + 2] = ib;
        out.data[i * 4 + 3] = a;
      }
    }
    const c = makeCanvas(W, H);
    ctx2d(c).putImageData(out, 0, 0);
    this.g.save();
    this.g.setTransform(1, 0, 0, 1, 0, 0);
    this.g.globalCompositeOperation = 'destination-over';
    this.g.drawImage(c, 0, 0);
    this.g.restore();
    return this;
  }

  /**
   * Bake to RGBA bytes: `albedo` (the painting), `normal` (x, y, topness,
   * glow). Painted normals come from the normal layer (blue = top face);
   * the rest from the shape's own height plus a little of the painting's
   * light and dark, so brush texture catches the lamps.
   */
  bake() {
    const { w: W, h: H } = this;
    const albedo = this.g.getImageData(0, 0, W, H).data;
    const n = W * H;
    const alpha = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++) alpha[i] = albedo[i * 4 + 3];
    const glow = this.gg ? this.gg.getImageData(0, 0, W, H).data : null;
    const normal = new Uint8ClampedArray(n * 4);
    if (this.ng) {
      const nd = this.ng.getImageData(0, 0, W, H).data;
      // Add brush detail on top of the painted faces.
      const lum = new Float32Array(n);
      for (let i = 0; i < n; i++) lum[i] = ((albedo[i * 4] * 0.3 + albedo[i * 4 + 1] * 0.55 + albedo[i * 4 + 2] * 0.15) / 255) * this.height.detail;
      const dn = normalsFromHeight(lum, W, H, 6);
      for (let i = 0; i < n; i++) {
        const painted = nd[i * 4 + 3] >= 128;
        let nx = (painted ? (nd[i * 4] / 255) * 2 - 1 : 0) + dn[i * 3] * 0.6;
        let ny = (painted ? (nd[i * 4 + 1] / 255) * 2 - 1 : -0.3) + dn[i * 3 + 1] * 0.6;
        const l = Math.hypot(nx, ny);
        if (l > 0.98) {
          nx *= 0.98 / l;
          ny *= 0.98 / l;
        }
        normal[i * 4] = Math.round((nx * 0.5 + 0.5) * 255);
        normal[i * 4 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        normal[i * 4 + 2] = painted ? nd[i * 4 + 2] : 0;
        normal[i * 4 + 3] = glow ? glow[i * 4 + 3] : 0;
      }
    } else {
      const hgt = heightFromAlpha(alpha, W, H, { radius: this.height.radius, profile: this.height.profile, threshold: 100 });
      const k = this.height.detail;
      for (let i = 0; i < n; i++) hgt[i] = hgt[i] * this.height.radius * 0.12 + ((albedo[i * 4] * 0.3 + albedo[i * 4 + 1] * 0.55 + albedo[i * 4 + 2] * 0.15) / 255) * k * (alpha[i] / 255);
      const nn = normalsFromHeight(hgt, W, H, this.height.strength);
      for (let i = 0; i < n; i++) {
        normal[i * 4] = Math.round((nn[i * 3] * 0.5 + 0.5) * 255);
        normal[i * 4 + 1] = Math.round((nn[i * 3 + 1] * 0.5 + 0.5) * 255);
        normal[i * 4 + 2] = this.flatTop ? 255 : 0;
        normal[i * 4 + 3] = glow ? glow[i * 4 + 3] : 0;
      }
    }
    return { name: this.name, w: W, h: H, ox: this.ox, oy: this.oy, ppu: this.ppu, albedo: this.canvas, normal };
  }
}

/**
 * Dome normals for one shape on a painted-normal sprite (a snow cap, a
 * round boulder): its own height from its edge, written into the normal
 * layer where the shape is. `top` marks it as lying on a top face.
 */
export function paintDome(sprite, path, { radius = 10, top = 1, strength = 2.4, tilt = [0, 0], profile = 'round' } = {}) {
  if (!sprite.ng) return;
  const { w: W, h: H } = sprite;
  const mask = makeCanvas(W, H);
  const mg = ctx2d(mask);
  mg.setTransform(sprite.g.getTransform());
  mg.fillStyle = '#fff';
  mg.fill(path);
  const md = mg.getImageData(0, 0, W, H).data;
  const alpha = new Uint8ClampedArray(W * H);
  for (let i = 0; i < W * H; i++) alpha[i] = md[i * 4 + 3];
  const hgt = heightFromAlpha(alpha, W, H, { radius, profile, threshold: 60 });
  for (let i = 0; i < W * H; i++) hgt[i] *= radius * 0.1;
  const nn = normalsFromHeight(hgt, W, H, strength);
  const img = sprite.ng.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < W * H; i++) {
    const a = alpha[i] / 255;
    if (a <= 0) continue;
    const nx = nn[i * 3] + tilt[0];
    const ny = nn[i * 3 + 1] + tilt[1];
    d[i * 4] = Math.round(d[i * 4] * (1 - a) + (nx * 0.5 + 0.5) * 255 * a);
    d[i * 4 + 1] = Math.round(d[i * 4 + 1] * (1 - a) + (ny * 0.5 + 0.5) * 255 * a);
    d[i * 4 + 2] = Math.round(d[i * 4 + 2] * (1 - a) + (top ? 255 : 0) * a);
    d[i * 4 + 3] = Math.max(d[i * 4 + 3], Math.round(a * 255));
  }
  sprite.ng.putImageData(img, 0, 0);
}

/** Paint a face's normal (for blocks): fill `path` on the normal layer with a world normal and topness. */
export function paintNormal(sprite, path, [nx, ny], top = 0, transform = null) {
  const g = sprite.ng;
  if (!g) return;
  g.save();
  if (transform) g.setTransform(transform);
  g.fillStyle = `rgb(${Math.round((nx * 0.5 + 0.5) * 255)},${Math.round((ny * 0.5 + 0.5) * 255)},${top ? 255 : 0})`;
  g.fill(path);
  g.restore();
}
