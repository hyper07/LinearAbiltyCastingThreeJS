/**
 * The pixel-art kit: what makes pixel art look hand-made, as functions.
 * (The rules are the ones in "How to make Emberleaf": a strict grid, ramps
 * with hue shifting, one light from the top-left, selective outlines,
 * ordered dithering, text kept out of the pixel layer.)
 *
 *   const hero = shadeSprite(['..HH..', '.HFFH.', '.CCCC.'], { H: RAMPS.ember, F: RAMPS.skin, C: RAMPS.violet });
 *   const view = pixelCanvas(canvas, { units: 280 });     // low-res layer, whole-number zoom
 *   view.begin(); view.ctx.drawImage(hero.canvas, snap(x), snap(y)); view.end();
 *
 * No dependencies; works in a browser and (given a canvas factory) in Node.
 */

const hex = (c) => {
  const n = parseInt(c.slice(1), 16);
  return c.length === 4 ? [((n >> 8) & 15) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = ([r, g, b]) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
/** Two colours mixed: k = 0 the first, 1 the second. */
export const mix = (a, b, k) => {
  const [x, y] = [hex(a), hex(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * k));
};

const toHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const fromHsl = ([h, s, l]) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
};

/**
 * A five-shade ramp from one base colour, deep shadow to highlight — with
 * hue shifting: shadows lean to blue-violet and lose a little colour,
 * highlights lean to yellow. (Never just darker and lighter: that is mud.)
 */
export function ramp(base, { steps = 5, shift = 18, contrast = 0.2 } = {}) {
  const [h, s, l] = toHsl(hex(base));
  const mid = (steps - 1) / 2;
  return Array.from({ length: steps }, (_, i) => {
    const k = (i - mid) / mid; // −1 shadow … +1 highlight
    // Towards 250° (blue-violet) in shadow, towards 55° (yellow) in light, by the shorter way round.
    const target = k < 0 ? 250 : 55;
    const turn = ((target - h + 540) % 360) - 180;
    const hue = (h + (turn * Math.abs(k) * shift) / 90 + 360) % 360;
    return toHex(fromHsl([hue, Math.max(0, Math.min(1, s * (1 - 0.18 * Math.abs(k)) + (k < 0 ? 0.04 : -0.04))), Math.max(0.04, Math.min(0.96, l + k * contrast))]));
  });
}

/** Ready-made ramps (dark to bright), hand-picked. */
export const RAMPS = {
  ember: ['#6e2a1c', '#a8432a', '#d9653a', '#f08e52', '#ffbf80'],
  violet: ['#2a1a40', '#432a62', '#5f3f88', '#8466b4', '#b49ae0'],
  skin: ['#8a4a3a', '#b8705a', '#dc9a7a', '#f2c09c', '#ffe2c4'],
  grass: ['#1f3a2a', '#2f5a34', '#4a7d3c', '#74a84a', '#b0d86a'],
  stone: ['#2a2a38', '#454558', '#676878', '#92929e', '#c4c4cc'],
  steel: ['#1c2434', '#34435a', '#56708a', '#8aa6ba', '#cfe2ea'],
  gold: ['#5a3210', '#8c5a14', '#c48a1c', '#f0c040', '#fff0a0'],
  bone: ['#4a4038', '#7a6c5c', '#a89a84', '#d4c8ae', '#f4eeda'],
  blood: ['#3a0c18', '#6a1420', '#a42028', '#dc3c34', '#ff7a5a'],
  ice: ['#1c2c5a', '#2c5490', '#4a8cc4', '#86c8ea', '#d8f6ff'],
  wood: ['#2c1a14', '#4a2c1c', '#70462a', '#9c6a3c', '#c89858'],
  poison: ['#16301c', '#22542a', '#3c8a34', '#78c43c', '#c8f06a']
};
/** The deep ink outlines are mixed towards. */
export const INK = '#1a1026';

/** The 4×4 Bayer matrix as −0.5…0.5: add it before choosing a shade for clean, regular dither. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
/** Which shade of a ramp a value 0…1 lands on at pixel (x, y), dithered (`amount` 0 for hard steps). */
export const dither = (ramp_, value, x, y, amount = 1) => ramp_[Math.max(0, Math.min(ramp_.length - 1, Math.floor(value * ramp_.length + bayer(x, y) * amount)))];

/** Round to the pixel grid (always, before drawing — or sprites shimmer). */
export const snap = (v) => Math.round(v);

const makeCanvas = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));

/**
 * A sprite from a letter map, lit and outlined by the rules: each letter is a
 * material with a ramp; top and left edges catch light, bottom and right fall
 * into shadow, the lower part of a shape is a shade darker; empty pixels
 * touching the sprite become an outline in the darkest shade of what they
 * touch mixed towards ink — lighter along the top (a rim light).
 *
 * @param {string[]} rows the map, '.' or ' ' for empty
 * @param {Record<string, string[] | string>} ramps a ramp (or a base colour) for each letter
 * @param {{ scale?: number, outline?: boolean, flat?: Record<string, string>, canvas?: (w: number, h: number) => any }} [options]
 *   `scale` 2 draws at twice the detail with rounded stair-steps and a dithered second band;
 *   `scale` 4 (3 and up) at four times: round corners, light that falls off smoothly over nine shades;
 *   `flat` letters that take one colour as it is (eyes, glints).
 * @returns {{ canvas: any, white: any, width: number, height: number, pixels: (string | null)[][] }}
 *   `white` is the same shape in pure white, for a hit flash.
 */
export function shadeSprite(rows, ramps, { scale = 1, outline = true, flat = {}, canvas = makeCanvas } = {}) {
  const h0 = rows.length;
  const w0 = Math.max(...rows.map((r) => r.length));
  const cell = (x, y) => {
    const ch = rows[y]?.[x];
    return !ch || ch === '.' || ch === ' ' ? null : ch;
  };
  // At scale 2 each letter is four pixels; a lone outside corner is cut, so stair-steps round off.
  const at = (x, y) => {
    if (scale === 1) return cell(x, y);
    const [cx, cy] = [Math.floor(x / scale), Math.floor(y / scale)];
    const ch = cell(cx, cy);
    if (!ch) return null;
    const [ex, ey] = [x % scale === 0 ? -1 : x % scale === scale - 1 ? 1 : 0, y % scale === 0 ? -1 : y % scale === scale - 1 ? 1 : 0];
    if (ex && ey && !cell(cx + ex, cy) && !cell(cx, cy + ey)) {
      if (scale < 3) return null;
      // A quarter circle: keep what lies within the cell's width of the corner opposite.
      const [u, v] = [ex < 0 ? scale - 1 - (x % scale) : x % scale, ey < 0 ? scale - 1 - (y % scale) : y % scale];
      if ((u + 0.5) ** 2 + (v + 0.5) ** 2 > (scale - 0.25) ** 2) return null;
    }
    return ch;
  };
  // How near an edge of its own material a pixel is, looking one way: 1 at the edge, 0 a letter's width in.
  const near = (ch, x, y, dx, dy) => {
    for (let k = 1; k <= scale; k++) if (at(x + dx * k, y + dy * k) !== ch) return 1 - (k - 1) / scale;
    return 0;
  };
  /**
   * Shading at 3× detail and up: light falls off smoothly from the top and
   * left edges and shadow gathers at the bottom and right, on a ramp widened
   * to nine shades, the steps between shades ordered-dithered.
   */
  const wide = new Map();
  const fineShade = (r, ch, x, y) => {
    let w9 = wide.get(r);
    if (!w9) {
      w9 = [];
      for (let i = 0; i < r.length; i++) {
        w9.push(r[i]);
        if (i < r.length - 1) w9.push(mix(r[i], r[i + 1], 0.5));
      }
      wide.set(r, w9);
    }
    const [top, bottom] = span[ch];
    const ty = bottom > top ? (y - top) / (bottom - top) : 0;
    const [up, left, down, right] = [near(ch, x, y, 0, -1), near(ch, x, y, -1, 0), near(ch, x, y, 0, 1), near(ch, x, y, 1, 0)];
    const mid = (r.length - 1) / 2;
    let v = mid + 1.25 * up + 0.85 * left + 0.5 * up * left - 1.05 * down - 0.85 * right - 0.9 * Math.max(0, (ty - 0.5) / 0.5) ** 1.5;
    v = Math.max(0, Math.min(r.length - 1, v));
    return w9[Math.max(0, Math.min(w9.length - 1, Math.round(v * 2 + bayer(x, y) * 0.45)))];
  };
  const w = w0 * scale + 2;
  const h = h0 * scale + 2;
  const R = Object.fromEntries(Object.entries(ramps).map(([k, v]) => [k, Array.isArray(v) ? v : ramp(v)]));
  // The top and bottom of each material's shape, for the "lower part is darker" rule.
  const span = {};
  for (let y = 0; y < h0 * scale; y++) for (let x = 0; x < w0 * scale; x++) {
    const ch = at(x, y);
    if (!ch) continue;
    span[ch] ??= [y, y];
    span[ch][1] = y;
  }
  const pixels = Array.from({ length: h }, () => Array(w).fill(null));
  for (let y = 0; y < h0 * scale; y++) {
    for (let x = 0; x < w0 * scale; x++) {
      const ch = at(x, y);
      if (!ch) continue;
      if (flat[ch]) {
        pixels[y + 1][x + 1] = flat[ch];
        continue;
      }
      const r = R[ch] ?? RAMPS.stone;
      if (scale >= 3) {
        pixels[y + 1][x + 1] = fineShade(r, ch, x, y);
        continue;
      }
      const [up, left, down, right] = [at(x, y - 1), at(x - 1, y), at(x, y + 1), at(x + 1, y)];
      let l = 2;
      if (up !== ch) l++;
      if (up !== ch && left !== ch) l++;
      if (down !== ch) l--;
      if (right !== ch) l--;
      const [top, bottom] = span[ch];
      const ty = bottom > top ? (y - top) / (bottom - top) : 0;
      if (ty > 0.72) l--;
      // The second band at high detail: a dithered half-step of light near the top-left, shadow near the bottom-right.
      if (scale > 1 && l === 2) {
        if (at(x - 2, y - 2) !== ch && bayer(x, y) > 0) l++;
        else if (at(x + 2, y + 2) !== ch && bayer(x, y) < 0) l--;
      }
      pixels[y + 1][x + 1] = r[Math.max(0, Math.min(r.length - 1, l))];
    }
  }
  if (outline) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (at(x - 1, y - 1)) continue;
        const around = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dx, dz]) => at(x - 1 + dx, y - 1 + dz));
        const touch = around.find(Boolean);
        if (!touch) continue;
        const dark = flat[touch] ?? (R[touch] ?? RAMPS.stone)[0];
        // Only something below it: this is the top edge — a lighter line, as a rim of light.
        const onlyBelow = around[0] && !around[1] && !around[2] && !around[3];
        pixels[y][x] = mix(dark, INK, onlyBelow ? 0.15 : 0.55);
      }
    }
  }
  const out = canvas(w, h);
  const white = canvas(w, h);
  const [g, gw] = [out.getContext('2d'), white.getContext('2d')];
  gw.fillStyle = '#ffffff';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!pixels[y][x]) continue;
      g.fillStyle = pixels[y][x];
      g.fillRect(x, y, 1, 1);
      gw.fillRect(x, y, 1, 1);
    }
  }
  return { canvas: out, white, width: w, height: h, pixels };
}

/** A filled ellipse, row by row with fillRect (never arc: it is anti-aliased and blurs pixel edges). */
export function pixelEllipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  for (let y = -Math.round(ry); y <= Math.round(ry); y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry || 1))));
    if (half > 0 || y === 0) ctx.fillRect(Math.round(cx) - half, Math.round(cy) + y, half * 2 + 1, 1);
  }
}

/** Every pixel's alpha snapped to fully on or off: for line art drawn with the canvas's own (soft) strokes. */
export function hardAlpha(ctx, w, h, threshold = 110) {
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > threshold ? 255 : 0;
  ctx.putImageData(img, 0, 0);
}

/**
 * A pixel-perfect view: the world is painted on a small canvas (`K` detail
 * pixels a world unit) and copied to the screen at a whole-number zoom with
 * smoothing off — never 2.5×, which makes some pixels wider than others.
 *
 * @param {HTMLCanvasElement} screen
 * @param {{ units?: number, K?: number }} [options] `units`: about how many world units the short side shows
 */
export function pixelCanvas(screen, { units = 280, K = 2 } = {}) {
  const low = makeCanvas(1, 1);
  const lx = low.getContext('2d');
  const ctx = screen.getContext('2d');
  const view = { screen, low, ctx: lx, K, zoom: 1, S: K, width: 1, height: 1 };
  /** Size it for the screen canvas as it is now (call on resize). */
  view.fit = () => {
    view.zoom = Math.max(1, Math.round(Math.min(screen.width, screen.height) / (units * K)));
    view.S = view.zoom * K; // device pixels a world unit
    view.width = Math.ceil(screen.width / view.S); // the view in world units
    view.height = Math.ceil(screen.height / view.S);
    low.width = view.width * K;
    low.height = view.height * K;
    lx.imageSmoothingEnabled = false;
  };
  /** Where a world position lands on the low canvas, on the grid (camera in world units, rounded too). */
  view.at = (x, camera = 0) => Math.round(x * K) - Math.round(camera * K);
  view.begin = (fill = null) => {
    lx.setTransform(1, 0, 0, 1, 0, 0);
    if (fill) {
      lx.fillStyle = fill;
      lx.fillRect(0, 0, low.width, low.height);
    } else lx.clearRect(0, 0, low.width, low.height);
  };
  /** Copy the pixel layer to the screen; draw text and UI on `screen` after this, at full resolution. */
  view.end = () => {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, low.width * view.zoom, low.height * view.zoom);
  };
  view.fit();
  return view;
}

/**
 * Ground painted once: layered sine patches plus Bayer dither choose a shade
 * of the ramp for every pixel — clean, regular transitions instead of static.
 * Paint it into a big offscreen canvas at load and copy from it every frame.
 */
export function paintGround(ctx, w, h, ramp_ = RAMPS.grass, { scale = 1, seed = 0 } = {}) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [sx, sy] = [x * scale + seed * 37, y * scale + seed * 91];
      const n = Math.sin(sx * 0.018 + Math.sin(sy * 0.011) * 2) + Math.sin(sy * 0.024 + sx * 0.007) + bayer(x, y) * 0.9;
      ctx.fillStyle = ramp_[n < -1.5 ? 0 : n < -0.5 ? 1 : n < 0.5 ? 2 : n < 1.4 ? 3 : 4];
      ctx.fillRect(x, y, 1, 1);
    }
  }
}
