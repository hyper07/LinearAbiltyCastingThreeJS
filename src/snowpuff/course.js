/**
 * A downhill course, built from a mountain record (mountains.js): a centre
 * line sampled every metre, the ground's shape across it, and everything
 * placed along it — kickers, barriers, slalom gates, stars, snowball piles,
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
export function buildCourse(m) {
  const rand = rng(m.seed);
  const L = m.length;
  const n = Math.ceil(L + RUNOUT) + 1;
  const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);
  const heading = new Float32Array(n), pitch = new Float32Array(n), width = new Float32Array(n), bank = new Float32Array(n);

  // Winding: three slow sines, sized so the tightest turn stays wide (radius ≳ 90 m).
  const waves = [
    { l: 260 + rand() * 120, a: 0.34, p: rand() * 6.28 },
    { l: 150 + rand() * 60, a: 0.2, p: rand() * 6.28 },
    { l: 95 + rand() * 30, a: 0.1, p: rand() * 6.28 }
  ];
  let kmax = 0;
  for (const w of waves) kmax += (w.a * 2 * Math.PI) / w.l;
  const turn = Math.min(1, (0.0105 * m.curve) / kmax) * m.curve;
  // Steepness: sections that swing between the mountain's two slopes.
  const sp = [rand() * 6.28, rand() * 6.28];
  const wp = [rand() * 6.28, rand() * 6.28];
  const theta = (s) => {
    let t = 0;
    for (const w of waves) t += w.a * turn * Math.sin((2 * Math.PI * s) / w.l + w.p);
    return t;
  };
  const theta0 = theta(0);
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < n; i++) {
    const s = i;
    // Ease the turns in from a straight start, and out into the run-out.
    const ease = smooth(clamp(s / 120, 0, 1)) * (1 - smooth(clamp((s - L + 60) / 120, 0, 1)) * 0.7);
    const h = (theta(s) - theta0) * ease;
    let deg = lerp(m.slope[0], m.slope[1], 0.5 + 0.35 * Math.sin(s / 140 + sp[0]) + 0.15 * Math.sin(s / 61 + sp[1]));
    // A gentle start ramp, a calmer last stretch, and a nearly flat run-out.
    if (s < START_FLAT) deg = lerp(7, deg, smooth(s / START_FLAT));
    if (s > L - 70) deg = lerp(deg, 9, smooth(clamp((s - L + 70) / 60, 0, 1)));
    if (s > L) deg = lerp(9, 2.5, smooth(clamp((s - L) / 60, 0, 1)));
    const pr = (deg * Math.PI) / 180;
    heading[i] = h;
    pitch[i] = pr;
    const wv = 0.5 + 0.5 * Math.sin(s / 97 + wp[0]) * Math.cos(s / 211 + wp[1]);
    width[i] = s > L - 30 ? lerp(lerp(m.width[0], m.width[1], wv), m.width[1] + 8, smooth(clamp((s - L + 30) / 60, 0, 1))) : lerp(m.width[0], m.width[1], wv);
    px[i] = x;
    py[i] = y;
    pz[i] = z;
    x += Math.sin(h);
    z -= Math.cos(h);
    y -= Math.tan(pr);
  }
  // Bank into the turns a little (outside edge higher): from the heading's rate of change.
  for (let i = 0; i < n; i++) {
    const a = heading[Math.max(0, i - 4)], b = heading[Math.min(n - 1, i + 4)];
    const k = (b - a) / 8; // rad per metre (+ = turning right)
    bank[i] = clamp(-k * 6, -0.09, 0.09); // slope of the cross-section: lat → height
  }
  const course = { id: m.id, mountain: m, length: L, finish: L, n, px, py, pz, heading, pitch, width, bank, seed: m.seed };
  placeFeatures(course, m, rand);
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
  return out;
}

const _f = {};

/**
 * The shape across the run at half-width W: a very slight dish on the
 * groomed run, a soft berm past its edge, then the mountainside rising.
 * Returns height above the centre line (before bank and bumps).
 */
export function profile(lat, W) {
  const a = Math.abs(lat);
  const dish = 0.012 * W * Math.min(1, (a / W) ** 2);
  if (a <= W) return dish;
  const t = Math.min(1, (a - W) / 7);
  const berm = 2.4 * t * t * (1.6 - 0.6 * t);
  if (a <= W + 7) return dish + berm;
  return dish + 2.4 + (a - W - 7) * 0.32 + ((a - W - 7) ** 2) * 0.0035;
}

/** Ground height at (s, lat): centre line + profile + bank + bumps + kickers. */
export function groundAt(c, s, lat, kickers = true) {
  const f = frameAt(c, s, _f);
  const W = f.width;
  let y = f.y + profile(lat, W) + lat * f.bank;
  const a = Math.abs(lat);
  // Soft rolls in the snow: tiny on the groomed run, bigger outside it.
  const inside = a < W ? 0.12 : Math.min(1.6, 0.12 + (a - W) * 0.06);
  y += noise2(s * 0.045, lat * 0.07, c.seed) * inside + noise2(s * 0.13, lat * 0.2, c.seed + 7) * inside * 0.35;
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
  const kn = m.kickers.count;
  for (let i = 0; i < kn; i++) {
    const s = Math.round(lerp(110, L - 130, (i + 0.25 + rand() * 0.5) / kn));
    const size = lerp(m.kickers.size[0], m.kickers.size[1], rand());
    const w = W(s);
    const kw = 4.2 + size * 1.2;
    const lat = (rand() * 2 - 1) * Math.max(0, w - kw * 0.5 - 2.5) * 0.7;
    c.kickers.push({ id: id(), s, len: 5 + size * 2.2, h: size, w: kw, lat, power: 0.85 + size * 0.18 });
  }
  const nearKicker = (s, pad0 = 18, pad1 = 34) => c.kickers.some((k) => s > k.s - pad0 && s < k.s + k.len + pad1);

  // Slalom gate runs: alternating sides, a star between each pair of poles.
  c.gates = [];
  const gateRuns = [];
  for (let g = 0; g < m.gates; g++) {
    let s0 = Math.round(lerp(180, L - 260, (g + 0.5) / Math.max(1, m.gates)) + (rand() - 0.5) * 60);
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
    const gapCentre = (rand() * 2 - 1) * (w - 4);
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

  // Stars: short sinuous lines down the run, a few up over the kickers (the risky lines).
  c.stars = [];
  for (let s = 60; s < L - 40; s += 48 + Math.floor(rand() * 30)) {
    if (nearKicker(s, 6, 20) && rand() < 0.5) continue;
    const w = W(s);
    const lat0 = (rand() * 2 - 1) * (w - 3);
    const dl = (rand() * 2 - 1) * 1.2;
    for (let i = 0; i < 5; i++) {
      const ss = s + i * 4.5;
      const lat = clamp(lat0 + dl * i + Math.sin(i * 0.9) * 1.2, -w + 1.5, w - 1.5);
      if (c.obstacles.some((o) => Math.abs(o.s - ss) < o.r + 1.2 && Math.abs(o.lat - lat) < o.w + 1)) continue;
      c.stars.push({ id: id(), s: ss, lat, h: 0.9 });
    }
  }
  for (const k of c.kickers) {
    const air = k.h * 2.2 + 1.2;
    for (let i = 0; i < 3; i++) c.stars.push({ id: id(), s: k.s + k.len + 5 + i * 4, lat: k.lat, h: air * (1 - Math.abs(i - 1) * 0.12), risky: true });
  }
  for (const g of c.gates) c.stars.push({ id: id(), s: g.s, lat: g.lat, h: 0.9, gate: true });
  c.stars.sort((a, b) => a.s - b.s);

  // Snowball piles (and, now and then, a shield).
  c.piles = [];
  let slot = 0;
  for (let s = 70; s < L - 60; s += 95 + Math.floor(rand() * 40)) {
    if (nearKicker(s, 8, 10)) s += 20;
    const w = W(s);
    const count = 1 + (rand() < 0.6 ? 1 : 0);
    for (let k = 0; k < count; k++) {
      const lat = (rand() * 2 - 1) * (w - 2.5);
      if (c.obstacles.some((o) => Math.abs(o.s - s) < 4 && Math.abs(o.lat - lat) < o.w + 1.5)) continue;
      c.piles.push({ id: id(), s: s + k * 3, lat, kind: slot % 4 === 3 && k === 0 ? 'shield' : 'snow' });
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
      c.lifts.push({ id: id(), kind: 'cross', s, ax: f.x - dx * half, az: f.z - dz * half, bx: f.x + dx * half, bz: f.z + dz * half, towers, dir: [dx, dz] });
    } else {
      const s1 = Math.min(L - 10, s + lf.span * L);
      const towers = [];
      for (let ss = s; ss <= s1; ss += 46) {
        const lat = lf.side * (frameAt(c, ss, _f).width + 13);
        const p = toWorld(c, ss, lat);
        towers.push({ x: p.x, z: p.z, s: ss, lat });
      }
      c.lifts.push({ id: id(), kind: 'along', s, s1, side: lf.side, towers });
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
