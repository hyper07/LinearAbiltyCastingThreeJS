/**
 * A downhill course, built from a mountain record (mountains.js): a centre
 * line sampled every metre, the ground's shape across it, and everything
 * placed along it — kickers, barriers, slalom gates, gift boxes, snowball piles,
 * ice, ski lifts and arches. Pure and deterministic: the same mountain makes
 * the same course on every machine, which is what lets online players race
 * on it without sending it (tests/unit/snowpuff.test.mjs checks this).
 *
 * Course space: `s` is metres along the run (0 at the start gate), `lat` is
 * metres to the right of the centre line. World space: x right, y up, the run
 * heads roughly toward −z.
 *
 *   const c = buildCourse(mountainById('marshmallow'));
 *   const f = frameAt(c, s);            // centre point, tangent, right, half-width
 *   const y = groundAt(c, s, lat);      // ground height (kickers included)
 *   const p = toWorld(c, s, lat);       // { x, y, z }
 */

export const RUNOUT = 150; // metres of gentle run-out past the finish (the village, the podium area)
const START_FLAT = 40;

/** mulberry32: a small seeded generator → () => [0, 1). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/* ------------------------------------------------------------------ value noise (deterministic) */

function hash2(ix, iy, seed) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [−1, 1]. */
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return (lerp(lerp(a, b, ux), lerp(c, d, ux), uy)) * 2 - 1;
}

/* ------------------------------------------------------------------ building */

/**
 * @param {object} m a mountain record
 * @returns {object} the course
 */
/** Race lengths: Quick (the mountain's own run), Long trail (new sections after it), 3 Laps (the run three times). */
export const RACE_MODES = ['quick', 'long', 'laps'];
export const cleanMode = (x) => (RACE_MODES.includes(x) ? x : 'quick');
export const LONG_K = 2.3;
export const LAPS = 3;

/**
 * The Long trail's sections, as fractions of the whole run: the mountain's own
 * top, then a forest, a wide open bowl, a jump park, a narrow gully and a final
 * sprint — each with its own width, slope and features.
 */
export const LONG_SECTIONS = [
  { kind: 'top', name: 'The top', at: 0, width: 1, slope: 0 },
  { kind: 'forest', name: 'Forest run', at: 0.3, width: 0.82, slope: 0 },
  { kind: 'bowl', name: 'Open bowl', at: 0.45, width: 1.55, slope: -2 },
  { kind: 'jumps', name: 'Jump park', at: 0.6, width: 1.1, slope: 1 },
  { kind: 'gully', name: 'The gully', at: 0.75, width: 0.6, slope: 1.5 },
  { kind: 'sprint', name: 'Final sprint', at: 0.88, width: 1, slope: 4 }
];

/** The section at s (Long trail), or null. */
export function sectionAt(c, s) {
  if (!c.sections) return null;
  let cur = c.sections[0];
  for (const x of c.sections) if (s >= x.s0) cur = x;
  return cur;
}

export function buildCourse(m, { mode = 'quick' } = {}) {
  mode = cleanMode(mode);
  const rand = rng(m.seed + (mode === 'long' ? 7001 : 0));
  const L = mode === 'long' ? Math.round(m.length * LONG_K) : m.length;
  const sections = mode === 'long' ? LONG_SECTIONS.map((x, i, a) => ({ ...x, s0: Math.round(x.at * L), s1: Math.round((a[i + 1]?.at ?? 1) * L) })) : null;
  const secAt = (s) => {
    if (!sections) return null;
    let cur = sections[0];
    for (const x of sections) if (s >= x.s0) cur = x;
    return cur;
  };
  // a section's value, eased across its first 40 m
  const secVal = (s, key, base) => {
    if (!sections) return base;
    const cur = secAt(s);
    const i = sections.indexOf(cur);
    const prev = sections[i - 1];
    const k = prev ? smooth(clamp((s - cur.s0) / 40, 0, 1)) : 1;
    return lerp(prev ? prev[key] : cur[key], cur[key], k);
  };
  const n = Math.ceil(L + RUNOUT) + 1;
  const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);
  const heading = new Float32Array(n), pitch = new Float32Array(n), width = new Float32Array(n), bank = new Float32Array(n);

  // Winding: a chain of straights and arcs — S-bends that alternate, a few banked berms
  // (boardercross style) — with the curvature eased in and out so every turn is a smooth sweep.
  const T = m.turns ?? { radius: [110, 160], angle: [0.4, 0.8], straight: [45, 80], berm: 0.2 };
  const curv = new Float32Array(n);
  const berm = new Float32Array(n);
  const turnsList = [];
  let s0 = START_FLAT + 25;
  let side = rand() < 0.5 ? -1 : 1;
  let h = 0;
  let switched = !m.switchback;
  while (s0 < L - 90) {
    // a switchback (Baekdusan): a banked hairpin that turns you to face back up at the crater,
    // a straight looking at it, and a hairpin back down the mountain
    if (!switched && s0 > m.switchback.at * L) {
      switched = true;
      const R = m.switchback.radius ?? 70, sd = m.switchback.side ?? 1;
      for (const [dir, gap] of [[sd, m.switchback.straight ?? 80], [-sd, 50]]) {
        const len = Math.PI * R;
        for (let i = Math.floor(s0); i < Math.min(n, s0 + len); i++) {
          curv[i] = dir / R;
          berm[i] = dir;
        }
        turnsList.push({ s0, s1: s0 + len, side: dir, R, berm: true, hairpin: true });
        s0 += len + gap;
      }
      continue;
    }
    const R = lerp(T.radius[0], T.radius[1], rand());
    let ang = lerp(T.angle[0], T.angle[1], rand());
    // keep the run heading downhill overall: turn back toward the fall line when far off it
    // (on a famous mountain, closer still, so its peak stays ahead as the curves swing it side to side)
    const lim = m.peak ? 0.5 : 0.9;
    if (Math.abs(h + side * ang) > lim) side = -Math.sign(h) || 1;
    if (m.peak) ang = Math.min(ang, Math.max(0.3, lim - side * h));
    const len = Math.min(ang * R, L - 90 - s0);
    ang = len / R;
    const isBerm = rand() < T.berm;
    for (let i = Math.floor(s0); i < Math.min(n, s0 + len); i++) {
      curv[i] = side / R;
      if (isBerm) berm[i] = side;
    }
    turnsList.push({ s0, s1: s0 + len, side, R, berm: isBerm });
    h += side * ang;
    side = -side;
    if (rand() < 0.2) side = -side; // now and then two the same way
    s0 += len + lerp(T.straight[0], T.straight[1], rand());
  }
  // smooth the curvature (eased entries and exits), and the berm mask
  const smoothArr = (a, w) => {
    const out = new Float32Array(a.length);
    let acc = 0;
    const q = [];
    for (let i = 0; i < a.length + w; i++) {
      const v = i < a.length ? a[i] : 0;
      q.push(v);
      acc += v;
      if (q.length > 2 * w + 1) acc -= q.shift();
      const j = i - w;
      if (j >= 0 && j < a.length) out[j] = acc / (2 * w + 1);
    }
    return out;
  };
  const k1 = smoothArr(smoothArr(curv, 9), 9);
  const b1 = smoothArr(smoothArr(berm, 8), 8);
  const sp = [rand() * 6.28, rand() * 6.28];
  const wp = [rand() * 6.28, rand() * 6.28];
  let x = 0, y = 0, z = 0;
  h = 0;
  for (let i = 0; i < n; i++) {
    const s = i;
    let deg = lerp(m.slope[0], m.slope[1], 0.5 + 0.35 * Math.sin(s / 140 + sp[0]) + 0.15 * Math.sin(s / 61 + sp[1])) + secVal(Math.min(s, L), 'slope', 0);
    // A gentle start ramp, a calmer last stretch, and a nearly flat run-out.
    if (s < START_FLAT) deg = lerp(7, deg, smooth(s / START_FLAT));
    if (s > L - 70) deg = lerp(deg, 9, smooth(clamp((s - L + 70) / 60, 0, 1)));
    if (s > L) deg = lerp(9, 2.5, smooth(clamp((s - L) / 60, 0, 1)));
    const pr = (deg * Math.PI) / 180;
    heading[i] = h;
    pitch[i] = pr;
    const wv = 0.5 + 0.5 * Math.sin(s / 97 + wp[0]) * Math.cos(s / 211 + wp[1]);
    const wk = secVal(Math.min(s, L), 'width', 1);
    width[i] = s > L - 30 ? lerp(lerp(m.width[0], m.width[1], wv) * wk, m.width[1] + 8, smooth(clamp((s - L + 30) / 60, 0, 1))) : lerp(m.width[0], m.width[1], wv) * wk;
    px[i] = x;
    py[i] = y;
    pz[i] = z;
    x += Math.sin(h);
    z -= Math.cos(h);
    y -= Math.tan(pr);
    h += k1[i];
  }
  // Bank into the turns (outside edge higher); berms bank hard, like a boardercross wall.
  for (let i = 0; i < n; i++) {
    const k = k1[i];
    const soft = clamp(-k * 7, -0.1, 0.1);
    const wall = -Math.sign(k || 1) * Math.abs(b1[i]) * 0.3;
    bank[i] = Math.abs(b1[i]) > 0.02 ? wall + soft * (1 - Math.abs(b1[i])) : soft;
  }
  const course = { mode, laps: mode === 'laps' ? LAPS : 1, sections, open: Boolean(m.peak), dynIce: [], burst: new Set(), id: m.id, mountain: m, length: L, finish: L, n, px, py, pz, heading, pitch, width, bank, curvature: k1, turns: turnsList, seed: m.seed, rollers: m.rollers ?? 0.2 };
  // The racing line: toward the inside of the turn coming up, smoothed.
  const line = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let k = 0;
    for (let j = 6; j <= 30; j += 4) k += k1[Math.min(n - 1, i + j)];
    k /= 7;
    line[i] = 0.5 * width[i] * Math.tanh(k * 95);
  }
  course.line = smoothArr(line, 10);
  course.roll = new Float32Array(n);
  placeFeatures(course, m, rand);
  // Rollers: gentle waves in the snow (the knees take them; fast riders get a little air),
  // calmed at the start, round the kickers and near the finish.
  const lam = 26 + rand() * 6, ph = rand() * 6.28;
  for (let i = 0; i < n; i++) {
    let fade = smooth(clamp((i - 70) / 40, 0, 1)) * (1 - smooth(clamp((i - L + 60) / 40, 0, 1)));
    for (const k of course.kickers) {
      const d = i < k.s ? k.s - i : i - (k.s + k.len);
      if (d < 32) fade *= smooth(clamp((d - 8) / 24, 0, 1));
    }
    course.roll[i] = course.rollers * fade * Math.sin((2 * Math.PI * i) / lam + ph) * (0.75 + 0.25 * Math.sin(i / 83 + ph));
  }
  return course;
}

/* ------------------------------------------------------------------ sampling */

/** The centre-line frame at `s` (clamped to the course). Reuses `out`. */
export function frameAt(c, s, out = {}) {
  const t = clamp(s, 0, c.n - 1.001);
  const i = Math.floor(t), f = t - i;
  const h = lerp(c.heading[i], c.heading[i + 1], f);
  out.x = lerp(c.px[i], c.px[i + 1], f);
  out.y = lerp(c.py[i], c.py[i + 1], f);
  out.z = lerp(c.pz[i], c.pz[i + 1], f);
  out.heading = h;
  out.tx = Math.sin(h);
  out.tz = -Math.cos(h);
  // right = forward rotated −90° about y
  out.rx = -out.tz;
  out.rz = out.tx;
  out.pitch = lerp(c.pitch[i], c.pitch[i + 1], f);
  out.width = lerp(c.width[i], c.width[i + 1], f);
  out.bank = lerp(c.bank[i], c.bank[i + 1], f);
  out.curv = c.curvature ? lerp(c.curvature[i], c.curvature[i + 1], f) : 0;
  out.line = c.line ? lerp(c.line[i], c.line[i + 1], f) : 0;
  out.roll = c.roll ? lerp(c.roll[i], c.roll[i + 1], f) : 0;
  return out;
}

const _f = {};

/**
 * The shape across the run at half-width W: a very slight dish on the
 * groomed run, a soft berm past its edge, then the mountainside rising.
 * Returns height above the centre line (before bank and bumps).
 */
export function profile(lat, W, open = false) {
  const a = Math.abs(lat);
  const dish = 0.012 * W * Math.min(1, (a / W) ** 2);
  if (a <= W) return dish;
  const t = Math.min(1, (a - W) / 7);
  const berm = 2.4 * t * t * (1.6 - 0.6 * t);
  if (a <= W + 7) return dish + berm;
  const d = a - W - 7;
  // an open ridge (the famous mountains): beyond the berm the hillside falls gently away, so
  // the view stays open to the skyline; otherwise the mountainside rises either side
  if (open) return dish + 2.4 + Math.min(d, 12) * 0.08 - Math.max(0, d - 12) * 0.22 - Math.max(0, d - 40) ** 2 * 0.002;
  return dish + 2.4 + d * 0.32 + (d ** 2) * 0.0035;
}

/** Ground height at (s, lat): centre line + profile + bank + bumps + kickers. */
export function groundAt(c, s, lat, kickers = true) {
  const f = frameAt(c, s, _f);
  const W = f.width;
  let y = f.y + profile(lat, W, c.open) + lat * f.bank;
  const a = Math.abs(lat);
  // Soft rolls in the snow: tiny on the groomed run, bigger outside it.
  const inside = a < W ? 0.12 : Math.min(1.6, 0.12 + (a - W) * 0.06);
  y += noise2(s * 0.045, lat * 0.07, c.seed) * inside + noise2(s * 0.13, lat * 0.2, c.seed + 7) * inside * 0.35;
  y += f.roll * (a < W + 4 ? 1 : Math.max(0, 1 - (a - W - 4) / 10));
  return kickers ? y + kickerHeight(c, s, lat) : y;
}

/** The kicker under (s, lat), or null. */
export function kickerAt(c, s, lat) {
  for (const k of c.kickers) {
    if (s < k.s - 0.5 || s > k.s + k.len + 0.5) continue;
    if (Math.abs(lat - k.lat) > k.w * 0.5 + 0.6) continue;
    return k;
  }
  return null;
}

/** A kicker's ramp: a curved rise to the lip, sides rounded off. */
export function kickerHeight(c, s, lat) {
  const k = kickerAt(c, s, lat);
  if (!k) return 0;
  return rampShape(k, s, lat);
}

export function rampShape(k, s, lat) {
  const u = (s - k.s) / k.len;
  if (u < 0 || u > 1) return 0;
  const side = Math.abs(lat - k.lat) / (k.w * 0.5);
  const edge = side < 0.7 ? 1 : side > 1.15 ? 0 : smooth(1 - (side - 0.7) / 0.45);
  // concave transition: height grows with u², steepening toward the lip
  return k.h * (u * u * 0.75 + u * 0.25) * edge;
}

/** World position of (s, lat), on the ground (or `h` above it). */
export function toWorld(c, s, lat, h = 0, out = {}) {
  const f = frameAt(c, s, _f);
  out.x = f.x + f.rx * lat;
  out.z = f.z + f.rz * lat;
  out.y = groundAt(c, s, lat) + h;
  return out;
}

/** Nearest (s, lat) for a world point, searching around `hint` (± `range` metres). */
export function project(c, x, z, hint = 0, range = 400) {
  let best = Infinity, bs = 0;
  const lo = Math.max(0, Math.floor(hint - range)), hi = Math.min(c.n - 1, Math.ceil(hint + range));
  for (let i = lo; i <= hi; i += 2) {
    const d = (c.px[i] - x) ** 2 + (c.pz[i] - z) ** 2;
    if (d < best) {
      best = d;
      bs = i;
    }
  }
  for (let i = Math.max(0, bs - 2); i <= Math.min(c.n - 1, bs + 2); i++) {
    const d = (c.px[i] - x) ** 2 + (c.pz[i] - z) ** 2;
    if (d <= best) {
      best = d;
      bs = i;
    }
  }
  const f = frameAt(c, bs, _f);
  const dx = x - f.x, dz = z - f.z;
  const along = dx * f.tx + dz * f.tz;
  const s = clamp(bs + along, 0, c.n - 1);
  const g = frameAt(c, s, _f);
  return { s, lat: (x - g.x) * g.rx + (z - g.z) * g.rz };
}

/** Items of a list sorted by `s` whose s is in [s0, s1] (binary search). */
export function between(list, s0, s1) {
  let lo = 0, hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].s < s0) lo = mid + 1;
    else hi = mid;
  }
  const out = [];
  for (let i = lo; i < list.length && list[i].s <= s1; i++) out.push(list[i]);
  return out;
}

/* ------------------------------------------------------------------ features */

/** Barrier sizes: `r` half-depth along the run, `w` half-width across it. */
export const BARRIERS = {
  hay: { r: 0.55, w: 0.95 },
  snowman: { r: 0.55, w: 0.6 },
  fence: { r: 0.35, w: 1.4 },
  log: { r: 0.45, w: 1.7 },
  rock: { r: 0.9, w: 1.0 },
  pole: { r: 0.18, w: 0.18 }
};

function pickWeighted(kinds, rand) {
  const entries = Object.entries(kinds);
  let total = 0;
  for (const [, w] of entries) total += w;
  let r = rand() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[0][0];
}

function placeFeatures(c, m, rand) {
  const L = c.length;
  const W = (s) => frameAt(c, s, _f).width;
  let uid = 0;
  const id = () => ++uid;

  // Kickers: spread down the run, each with a clear landing.
  c.kickers = [];
  const park = c.sections?.find((x) => x.kind === 'jumps');
  const inPark = (s) => park && s > park.s0 - 40 && s < park.s1 + 40;
  const kn = Math.round(m.kickers.count * (L / m.length) * (park ? 0.7 : 1));
  // the jump park: kickers one after another down the middle
  if (park) {
    for (let s = park.s0 + 30, i = 0; s < park.s1 - 40; s += 48, i++) {
      const size = lerp(m.kickers.size[0], m.kickers.size[1], 0.4 + 0.6 * ((i % 3) / 2));
      c.kickers.push({ id: id(), s, len: 5 + size * 2.2, h: size, w: 4.2 + size * 1.2, lat: (i % 2 ? 1 : -1) * 2, power: 0.85 + size * 0.18 });
    }
  }
  for (let i = 0; i < kn; i++) {
    let s = Math.round(lerp(110, L - 130, (i + 0.25 + rand() * 0.5) / kn));
    // the straightest spot nearby: a clear run-up and landing
    let best = s, bestK = Infinity;
    for (let t = s - 50; t <= s + 50; t += 5) {
      if (t < 100 || t > L - 120) continue;
      let k = 0;
      for (let j = t - 45; j <= t + 40; j += 5) k = Math.max(k, Math.abs(c.curvature[Math.max(0, Math.min(c.n - 1, j))]));
      if (k < bestK - 1e-5 && !inPark(t) && !c.kickers.some((kk) => Math.abs(kk.s - t) < 70)) {
        bestK = k;
        best = t;
      }
    }
    s = best;
    const size = lerp(m.kickers.size[0], m.kickers.size[1], rand());
    const w = W(s);
    const kw = 4.2 + size * 1.2;
    const room = Math.max(0, w - kw * 0.5 - 2.5);
    const lat = clamp(frameAt(c, s, _f).line + (rand() * 2 - 1) * 2.5, -room, room);
    c.kickers.push({ id: id(), s, len: 5 + size * 2.2, h: size, w: kw, lat, power: 0.85 + size * 0.18 });
  }
  c.kickers.sort((a, b) => a.s - b.s);
  const nearKicker = (s, pad0 = 18, pad1 = 34) => [...c.kickers, ...(c.bonusKicker ? [c.bonusKicker] : [])].some((k) => s > k.s - pad0 && s < k.s + k.len + pad1);

  // 3 Laps: a bonus kicker that opens from lap 2 (a straight spot with no kicker near)
  if (c.laps > 1) {
    let best = null, bestK = Infinity;
    for (let s = Math.round(L * 0.3); s < L - 150; s += 10) {
      if (c.kickers.some((kk) => Math.abs(kk.s - s) < 60)) continue;
      let k = 0;
      for (let j = s - 40; j <= s + 40; j += 5) k = Math.max(k, Math.abs(c.curvature[Math.max(0, Math.min(c.n - 1, j))]));
      if (k < bestK) {
        bestK = k;
        best = s;
      }
    }
    if (best != null) {
      const size = m.kickers.size[1];
      c.bonusKicker = { id: id(), s: best, len: 5 + size * 2.2, h: size, w: 4.2 + size * 1.2, lat: 0, power: 0.85 + size * 0.18, bonus: true };
    }
  }

  // Slalom gate runs: alternating sides.
  c.gates = [];
  const gateRuns = [];
  const nGates = Math.round(m.gates * (L / m.length));
  for (let g = 0; g < nGates; g++) {
    let s0 = Math.round(lerp(180, L - 260, (g + 0.5) / Math.max(1, nGates)) + (rand() - 0.5) * 60);
    for (let tries = 0; tries < 20 && nearKicker(s0, 30, 150); tries++) s0 += 23;
    if (s0 > L - 200) continue;
    const count = 6 + Math.floor(rand() * 3);
    gateRuns.push([s0, s0 + count * 22]);
    for (let i = 0; i < count; i++) {
      const s = s0 + i * 22;
      const side = i % 2 ? 1 : -1;
      c.gates.push({ id: id(), s, lat: side * W(s) * 0.32, gap: 1.6, colour: i % 2 ? 'blue' : 'red' });
    }
  }
  const inGates = (s) => gateRuns.some(([a, b]) => s > a - 15 && s < b + 15);

  // Barriers: rows across the run, always leaving a wide gap to ride through.
  c.obstacles = [];
  const rows = Math.floor(((L - 160) / 100) * m.obstacles.per100);
  for (let r = 0; r < rows; r++) {
    let s = Math.round(lerp(75, L - 70, (r + 0.2 + rand() * 0.6) / rows));
    if (nearKicker(s) || inGates(s)) continue;
    const w = W(s);
    const count = rand() < 0.45 ? 2 : 1;
    const gapCentre = rand() < 0.65 ? clamp(frameAt(c, s, _f).line, -w + 4, w - 4) : (rand() * 2 - 1) * (w - 4);
    for (let k = 0; k < count; k++) {
      const kind = pickWeighted(m.obstacles.kinds, rand);
      const b = BARRIERS[kind];
      let lat = 0;
      for (let tries = 0; tries < 8; tries++) {
        lat = (rand() * 2 - 1) * (w - b.w - 0.8);
        if (Math.abs(lat - gapCentre) > b.w + 3) break;
      }
      if (Math.abs(lat - gapCentre) <= b.w + 2.6) continue;
      if (c.obstacles.some((o) => Math.abs(o.s - s) < 3 && Math.abs(o.lat - lat) < o.w + b.w + 1.2)) continue;
      c.obstacles.push({ id: id(), kind, s: s + (k ? 1.5 : 0), lat, r: b.r, w: b.w, rot: rand() * Math.PI * 2 });
    }
  }
  for (const g of c.gates) for (const side of [-1, 1]) c.obstacles.push({ id: id(), kind: 'pole', s: g.s, lat: g.lat + side * g.gap, r: BARRIERS.pole.r, w: BARRIERS.pole.w, gate: g.id, colour: g.colour });
  c.obstacles.sort((a, b) => a.s - b.s);

  // Ice: patches across a stretch (the frozen creek), slippery and fast.
  c.ice = [];
  for (const ic of m.ice) {
    const s0 = Math.round(ic.at * L);
    const count = Math.max(2, Math.round(ic.span / 16));
    for (let i = 0; i < count; i++) {
      const s = s0 + (i / count) * ic.span + rand() * 6;
      const w = W(s);
      const len = 7 + rand() * 7, wide = 4 + rand() * 6;
      const lat = (rand() * 2 - 1) * Math.max(0, w - wide * 0.5 - 1);
      c.ice.push({ id: id(), s, len, lat, w: wide });
    }
    c.creek = { s: s0 + ic.span * 0.5 };
  }
  c.ice.sort((a, b) => a.s - b.s);

  // Gift boxes: in pairs and threes across the racing line every so often (pick one!), and a
  // high one floating over the landing of some kickers (the risky line).
  c.gifts = [];
  for (let s = 70; s < L - 50; s += 62 + Math.floor(rand() * 34)) {
    if (nearKicker(s, 8, 24)) s += 30;
    if (s > L - 50) break;
    const w = W(s);
    const line = frameAt(c, s, _f).line;
    const count = 2 + (rand() < 0.4 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const lat = clamp(line + (i - (count - 1) / 2) * 3.2, -w + 1.8, w - 1.8);
      if (c.obstacles.some((o) => Math.abs(o.s - s) < o.r + 1.5 && Math.abs(o.lat - lat) < o.w + 1.2)) continue;
      c.gifts.push({ id: id(), s, lat, h: 0.75 });
    }
  }
  c.kickers.forEach((k, i) => {
    if (i % 2) return;
    c.gifts.push({ id: id(), s: k.s + k.len + 7, lat: k.lat, h: k.h * 2 + 1.6, risky: true });
  });
  c.gifts.sort((a, b) => a.s - b.s);

  // Bell arches over some landings: jump through and the bell rings (a little boost).
  c.bells = c.kickers.filter((_, i) => i % 2 === 1 || c.kickers.length < 4).map((k) => ({ id: id(), s: k.s + k.len + 9, lat: k.lat, w: Math.max(5, k.w + 1.5), h: k.h * 1.4 + 2.2, kicker: k.id }));
  c.stars = []; // (no stars any more: gifts and the mountain itself are the fun)

  // Snowball piles (and, now and then, a shield).
  c.piles = [];
  let slot = 0;
  for (let s = 70; s < L - 60; s += 95 + Math.floor(rand() * 40)) {
    if (nearKicker(s, 8, 10)) s += 20;
    const w = W(s);
    const count = 1 + (rand() < 0.6 ? 1 : 0);
    for (let k = 0; k < count; k++) {
      const lat = clamp(frameAt(c, s + k * 3, _f).line + (k ? 1 : -1) * (1.6 + rand() * 1.6), -w + 2, w - 2);
      if (c.obstacles.some((o) => Math.abs(o.s - s) < 4 && Math.abs(o.lat - lat) < o.w + 1.5)) continue;
      c.piles.push({ id: id(), s: s + k * 3, lat, kind: 'snow' });
    }
    slot++;
  }
  c.piles.sort((a, b) => a.s - b.s);

  // Ski lifts: straight lines of towers crossing the run, or running beside it.
  c.lifts = [];
  for (const lf of m.lifts) {
    const s = lf.at * L;
    if (lf.kind === 'cross') {
      const f = frameAt(c, s, {});
      const ang = f.heading + Math.PI / 2 + (lf.angle ?? 0);
      const dx = Math.sin(ang), dz = -Math.cos(ang);
      const half = 260;
      const towers = [];
      for (let d = -half; d <= half; d += 44) {
        const tx = f.x + dx * d, tz = f.z + dz * d;
        const p = project(c, tx, tz, s, 120);
        if (Math.abs(p.lat) < frameAt(c, p.s, _f).width + 6) continue;
        towers.push({ x: tx, z: tz, s: p.s, lat: p.lat });
      }
      c.lifts.push({ id: id(), cabin: lf.cabin, kind: 'cross', s, ax: f.x - dx * half, az: f.z - dz * half, bx: f.x + dx * half, bz: f.z + dz * half, towers, dir: [dx, dz] });
    } else {
      const s1 = Math.min(L - 10, s + lf.span * L);
      const towers = [];
      for (let ss = s; ss <= s1; ss += 46) {
        const lat = lf.side * (frameAt(c, ss, _f).width + 13);
        const p = toWorld(c, ss, lat);
        towers.push({ x: p.x, z: p.z, s: ss, lat });
      }
      c.lifts.push({ id: id(), kind: 'along', s, s1, side: lf.side, towers, cabin: lf.cabin });
    }
  }

  // Arches over the run: the start, two checkpoints, the finish.
  c.arches = [
    { s: 3, kind: 'start' },
    { s: Math.round(L * 0.34), kind: 'check' },
    { s: Math.round(L * 0.67), kind: 'check' },
    { s: L, kind: 'finish' }
  ];
}

/**
 * 3 Laps: what changes on a lap — the slalom gates swap sides (every other lap) and the bonus
 * kicker opens from lap 2. Pure on the course data; returns true if anything changed.
 */
export function lapVariant(c, lap) {
  let changed = false;
  const flip = lap % 2 === 0;
  if ((c.gatesFlipped ?? false) !== flip) {
    c.gatesFlipped = flip;
    for (const g of c.gates) g.lat = -g.lat;
    for (const o of c.obstacles) if (o.gate != null) o.lat = -o.lat;
    changed = true;
  }
  if (c.bonusKicker && lap >= 2 && !c.kickers.includes(c.bonusKicker)) {
    c.kickers.push(c.bonusKicker);
    c.kickers.sort((a, b) => a.s - b.s);
    changed = true;
  }
  return changed;
}

