/**
 * Famous mountains, the pure part: each signature silhouette as a height
 * function on the unit disc (shared by the 3D backdrop, the select-screen
 * diorama and the map card), where the backdrop stands relative to the run,
 * and the scenery plan — every statue, animal, tree, wall and flag string
 * placed beside the course, deterministically, never on the run itself.
 *
 *   profile(shape)(x, z) → 0..1     x, z in −1..1 (the disc), 1 = the summit
 *   backdropPlace(course, m) → { x, y, z, height, radius, yaw }
 *   sceneryPlan(course, m) → [{ kind, s, lat, ry, scale, h? }]
 *
 * Cultural, religious and wildlife pieces are scenery only: they stand well
 * off the run (|lat| ≥ width + 6) and nothing can hit them. Flag strings hang
 * high over the run (h ≥ 4.5 m) and are never in the way.
 */
import { frameAt, rng, groundAt } from './course.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
const hash = (x, z, k = 1) => {
  const s = Math.sin(x * 127.1 * k + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const vnoise = (x, z) => {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const ridge = (x, z, f = 4) => vnoise(x * f, z * f) * 0.6 + vnoise(x * f * 2.3, z * f * 2.3) * 0.3;

/** Signature silhouettes. Each returns a height in 0..1 for a point on the unit disc. */
export const SHAPES = {
  // Mount Fuji: a near-perfect concave cone with a flat, notched crater top
  cone: (x, z) => {
    const r = Math.hypot(x, z);
    let h = Math.pow(clamp(1 - r, 0, 1), 1.75);
    const top = Math.pow(1 - 0.075, 1.75);
    if (h > top) h = top - (r < 0.045 ? (0.045 - r) * 0.6 : 0);
    return h * (1 + (ridge(x, z, 9) - 0.45) * 0.03 * (1 - h));
  },
  // a shield volcano: a broad gentle dome, a crater rim at the top (Hallasan)
  shield: (x, z) => {
    const r = Math.hypot(x, z);
    let h = Math.pow(clamp(1 - r * r, 0, 1), 1.2);
    if (r < 0.11) h -= (0.11 - r) * 1.4;
    return h * (1 + (ridge(x, z, 5) - 0.45) * 0.05);
  },
  // a big truncated volcano with a crater lake and a jagged rim (Baekdusan)
  caldera: (x, z) => {
    const r = Math.hypot(x, z);
    let h = Math.pow(clamp(1 - r, 0, 1), 1.1) * 1.05;
    const rim = 0.2;
    // the bowl: steep inner walls (with chutes) down to a flat lake floor 0.24 below the crest
    if (r < rim) {
      const crest = Math.pow(1 - rim, 1.1) * 1.05;
      const k = smooth(clamp((r - rim * 0.72) / (rim * 0.28), 0, 1));
      h = crest - 0.24 + 0.24 * Math.pow(k, 0.8) * (1 + (ridge(x * 3, z * 3, 9) - 0.45) * 0.25);
    }
    h += Math.exp(-Math.pow((r - rim) / 0.04, 2)) * (0.06 + ridge(x, z, 14) * 0.12);
    return clamp(h, 0, 1);
  },
  // a crooked, sharp pyramid (the Matterhorn)
  pyramid: (x, z) => {
    const c = Math.cos(0.5), s = Math.sin(0.5);
    let u = x * c - z * s, v = x * s + z * c;
    u -= 0.08;
    const d = Math.abs(u) * 1.05 + Math.abs(v) * 0.9 + Math.max(0, u) * 0.25;
    return clamp(1 - d, 0, 1) ** 1.05 * (1 + (ridge(x, z, 7) - 0.45) * 0.08);
  },
  // a sharp symmetrical pyramid with fluted ice faces (Artesonraju)
  fluted: (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(z, x);
    const faces = Math.abs(Math.cos(a * 2)) * 0.14 + 0.86;
    const flutes = (Math.abs(Math.sin(a * 22)) * 0.04) * r;
    return clamp(1 - r * faces * 1.08 - flutes, 0, 1) ** 1.15;
  },
  // a huge massif: the main summit, shoulders and ridges (Everest, Denali)
  massif: (x, z) => {
    const peak = (px, pz, w, hh) => hh * Math.pow(clamp(1 - Math.hypot(x - px, z - pz) / w, 0, 1), 1.4);
    let h = Math.max(peak(0.05, 0, 0.95, 1), peak(-0.45, 0.15, 0.55, 0.78), peak(0.5, -0.2, 0.5, 0.7), peak(-0.1, -0.5, 0.45, 0.6));
    return clamp(h * (0.92 + ridge(x, z, 6) * 0.16), 0, 1);
  },
  // layered, jagged limestone ranges (the Canadian Rockies)
  jagged: (x, z) => {
    const along = x, across = Math.abs(z);
    const saw = Math.abs(((along * 3.2 + 10) % 1) - 0.5) * 2;
    let h = (1 - saw * 0.55) * clamp(1 - across * 1.6, 0, 1) * clamp(1 - Math.abs(along) * 0.7, 0, 1);
    h *= 0.85 + vnoise(x * 7, 3) * 0.3;
    return clamp(h, 0, 1);
  },
  // a wide flat-topped volcano with a glacier cap (Kilimanjaro / Kibo)
  flattop: (x, z) => {
    const r = Math.hypot(x * 0.85, z);
    const h = Math.min(1, (1 - r) * 1.55) - (r < 0.22 ? (0.22 - r) * 0.15 : 0);
    return clamp(h * (1 + (ridge(x, z, 5) - 0.45) * 0.05), 0, 1);
  },
  // an arrowhead mountain with layered bands (Kirkjufell)
  arrow: (x, z) => {
    const u = x * 0.75, v = z;
    const d = Math.hypot(u * 1.3, v);
    let h = clamp(1 - d, 0, 1);
    h = Math.pow(h, 0.85) * (1 - Math.max(0, -u - 0.2) * 0.4);
    return clamp(h, 0, 1);
  },
  // a broad white dome and, beside it, a sharp granite needle (Mont Blanc, the Aiguille du Midi)
  domeNeedle: (x, z) => {
    const dome = Math.pow(clamp(1 - Math.hypot(x + 0.15, z) / 0.95, 0, 1), 0.9) * 0.95;
    const needle = 0.75 * Math.pow(clamp(1 - Math.hypot(x - 0.62, z + 0.1) / 0.13, 0, 1), 0.6);
    return clamp(Math.max(dome, needle), 0, 1);
  },
  // a wall of rounded granite spires (Seoraksan, Ulsanbawi)
  spires: (x, z) => {
    let h = 0;
    for (let i = 0; i < 7; i++) {
      const px = -0.7 + i * 0.23, hh = 0.65 + hash(i, 3) * 0.35;
      h = Math.max(h, hh * Math.pow(clamp(1 - Math.hypot((x - px) * 2.2, z * 1.4) / 0.32, 0, 1), 0.55));
    }
    return clamp(h + Math.pow(clamp(1 - Math.hypot(x, z), 0, 1), 1.5) * 0.35, 0, 1);
  },
  // Seoraksan's Ulsanbawi: a long crown of rime-coated granite towers and needles on a broad snowy
  // shoulder — 4–5× wider than tall, the tallest groups left and right of centre, deep clefts between.
  // Rough granite, not smooth columns: every tower is a jointed block with a slanted, broken top,
  // ledges stepping down its faces and vertical cracks (x along the crest, z across it; built on a grid
  // with flat shading so the facets show: see `grid` in scenery.js)
  ulsan: (x, z) => {
    const ax = Math.abs(x);
    const shoulder = Math.pow(clamp(1 - Math.hypot(x / 1.0, z / 0.42), 0, 1), 0.9) * 0.24 * (0.92 + vnoise(x * 26, z * 26) * 0.16);
    let crown = 0;
    for (let i = 0; i < 30; i++) {
      const px = -0.78 + i * 0.054 + (hash(i, 7) - 0.5) * 0.02;
      const group = Math.exp(-(((px + 0.34) / 0.2) ** 2)) * 0.95 + Math.exp(-(((px - 0.3) / 0.22) ** 2)) * 0.9 + 0.35;
      const hh = (0.55 + hash(i, 11) * 0.45) * group * clamp(1 - Math.abs(px) * 0.9, 0.2, 1);
      const w = 0.016 + hash(i, 5) * 0.014, d = 0.05 + hash(i, 9) * 0.035;
      const pz = (hash(i, 13) - 0.5) * 0.08;
      // a ragged, lumpy outline: joints and fallen slabs bite into the block
      const rag = 1 + (vnoise(x * 70 + i * 3.1, z * 22) - 0.5) * 0.5;
      const q = Math.hypot((x - px) / w, (z - pz) / d) * rag;
      // a blocky tower: steep walls, a broken top slanting one way, a ledge or two stepping down
      let col = clamp(1 - Math.pow(q / 3.2, 5), 0, 1);
      const tilt = 1 + ((x - px) / w) * (hash(i, 17) - 0.5) * 0.1;
      const step = Math.floor(q * 1.1 + vnoise(x * 40, z * 30 + i)) / 1.1;
      col *= clamp(1 - step * 0.09, 0.6, 1) * tilt;
      crown = Math.max(crown, hh * col);
    }
    // rime-crusted knobs: rounded lumps all over the tops and faces; deep vertical clefts between blocks
    const jf = ((((x * 31 + vnoise(z * 7, x * 3) * 0.7) % 1) + 1) % 1) - 0.5;
    const joint = 1 - 0.3 * Math.exp(-((jf / 0.09) ** 2));
    const knobs = vnoise(x * 55, z * 24) * 0.7 + vnoise(x * 130, z * 50) * 0.3;
    crown *= joint * (0.84 + knobs * 0.24);
    crown *= smooth(clamp((0.92 - ax) / 0.15, 0, 1)) * smooth(clamp((0.3 - Math.abs(z)) / 0.2, 0, 1));
    return clamp(Math.max(shoulder, 0.1 + crown * 0.92 * (z < 0.25 ? 1 : 0)) * (shoulder > 0.01 || crown > 0.02 ? 1 : 0) + (ridge(x, z, 18) - 0.45) * 0.02, 0, 1);
  },
  // a canyon rim landscape: flat-topped walls either side of a gorge (Yellowstone)
  canyon: (x, z) => {
    const gorge = Math.abs(z) < 0.12 ? 0 : 1;
    const plateau = clamp(1 - Math.abs(x) * 0.9, 0, 1) * clamp(1 - Math.abs(z) * 0.9, 0, 1);
    return clamp(gorge * (0.55 + vnoise(x * 6, z * 6) * 0.1) * smooth(plateau * 2.5), 0, 1);
  }
};

export const profile = (shape) => SHAPES[shape] ?? SHAPES.cone;

/**
 * Where the famous peak stands: far off beyond the finish, turned to sit in
 * view (within ±34° of where you're heading) for as much of the run as
 * possible, and set at a height where its summit sits about `elev` degrees
 * above the horizon from the middle of the run — high enough to rule the
 * skyline, low enough to stay on screen while the camera looks down the hill.
 */
const _places = new WeakMap();
export function backdropPlace(course, m) {
  if (_places.has(course)) return _places.get(course);
  const pk = m.peak;
  const L = course.length;
  const i1 = Math.min(course.n - 1, Math.round(L));
  const dx = course.px[i1] - course.px[0], dz = course.pz[i1] - course.pz[0];
  const d = Math.hypot(dx, dz) || 1;
  const ux = dx / d, uz = dz / d, rx = -uz, rz = ux;
  const dist = pk.dist ?? 1700;
  const ex = course.px[i1], ez = course.pz[i1];
  const at = (side) => [ex + ux * dist + rx * dist * side, ez + uz * dist + rz * dist * side];
  // how much of the run sees it ahead (within ~26° of the way you face), the middle of the run counting most
  const inView = (x, z) => {
    let k = 0, n = 0;
    for (let s = 0; s < L; s += 10) {
      const f = frameAt(course, s);
      const a = Math.atan2(x - f.x, -(z - f.z));
      const w = 0.6 + Math.sin((s / L) * Math.PI) * 0.6;
      if (Math.abs(Math.atan2(Math.sin(a - f.heading), Math.cos(a - f.heading))) < 0.45) k += w;
      n += w;
    }
    return k / n;
  };
  // is its footprint (about `r` across) clear of every part of the run?
  const clear = (x, z, r) => {
    for (let i = 0; i < course.n; i += 8) if (Math.hypot(course.px[i] - x, course.pz[i] - z) < r + 250) return false;
    return true;
  };
  let side = pk.side ?? 0, best = -1;
  let pick = null;
  if (pk.side == null) {
    // try every direction round the middle of the run, at the same distance, and keep the one most in view
    const m0 = frameAt(course, L / 2);
    const [x0, z0] = at(0);
    const D = Math.hypot(x0 - m0.x, z0 - m0.z);
    const r0 = Math.min(dist - 450, (pk.radius ?? 1100) * ((D * 0.41) / (pk.height ?? 900)));
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 36) {
      const x = m0.x + Math.sin(a) * D, z = m0.z - Math.cos(a) * D;
      if (!clear(x, z, r0)) continue;
      const v = inView(x, z);
      if (v > best) {
        best = v;
        pick = [x, z];
      }
    }
  }
  // the hero standard: seen from mid-run its summit stands ~19° up and its
  // foot sits just under the horizon, so it fills a third of the view ahead
  // (its footprint never reaches the finish: radius ≤ dist − 450)
  const [x, z] = pick ?? at(side);
  const mid = frameAt(course, L / 2);
  const elev = ((pk.elev ?? 19) * Math.PI) / 180;
  const foot = ((pk.foot ?? 4) * Math.PI) / 180;
  const dm = Math.hypot(x - mid.x, z - mid.z);
  const height = dm * (Math.tan(elev) + Math.tan(foot));
  const radius = Math.min(dist - 450, (pk.radius ?? 1100) * (height / (pk.height ?? 900)));
  const y = mid.y + Math.tan(elev) * dm - height;
  // it faces the middle of the run
  const out = { x, y, z, height, radius, side, yaw: Math.atan2(x - mid.x, -(z - mid.z)) + (pk.yaw ?? 0) };
  _places.set(course, out);
  return out;
}

/** The point the sun sits on for a "Diamond Fuji" sunrise: the summit seen from the start. */
export function summitDir(course, m) {
  const b = backdropPlace(course, m);
  const sx = course.px[0], sy = course.py[0], sz = course.pz[0];
  const vx = b.x - sx, vy = b.y + b.height * 0.97 - sy, vz = b.z - sz;
  const l = Math.hypot(vx, vy, vz) || 1;
  return [vx / l, vy / l, vz / l];
}

/* ---------------------------------------------------------------- scenery plans */

/**
 * The scenery beside the run, from the mountain's `scenery` list:
 *   { kind, every (m), zone: 'side'|'finish'|'start'|'far'|'over', from, to (0..1 of the run),
 *     off: [min, max] metres beyond the edge, scale: [a, b], group (how many together) }
 */
export function sceneryPlan(course, m) {
  const out = [];
  const r = rng((m.seed ?? 1) * 31 + 7);
  const L = course.length;
  for (const sc of m.scenery ?? []) {
    const from = (sc.from ?? 0) * L, to = Math.min(course.n - 2, (sc.to ?? 1) * L + (sc.zone === 'finish' ? 120 : 0));
    const every = sc.every ?? 60;
    const zone = sc.zone ?? 'side';
    for (let s = Math.max(4, from + r() * every * 0.5); s < to; s += every * (0.75 + r() * 0.5)) {
      const f = frameAt(course, s);
      if (zone === 'over') {
        out.push({ kind: sc.kind, s, lat: 0, ry: -f.heading, scale: 1, h: sc.h ?? 5, span: f.width + 3.4 });
        continue;
      }
      const group = sc.group ?? 1;
      const side = sc.side ?? (r() < 0.5 ? -1 : 1);
      const off = sc.off ?? [6, 14];
      for (let g = 0; g < group; g++) {
        const ss = s + (g - (group - 1) / 2) * (sc.gap ?? 3);
        const ff = frameAt(course, ss);
        const lat = side * (ff.width + Math.max(6, off[0] + r() * (off[1] - off[0])));
        const scale = (sc.scale?.[0] ?? 1) + r() * ((sc.scale?.[1] ?? 1) - (sc.scale?.[0] ?? 1));
        // face the run (animals and statues watch the race)
        const ry = -ff.heading + (side > 0 ? -Math.PI / 2 : Math.PI / 2) + (r() - 0.5) * (sc.turn ?? 0.6);
        out.push({ kind: sc.kind, s: ss, lat, ry, scale });
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------- geysers (Yellowstone) */

export const GEYSER_CYCLE = 9;

/** A geyser's phase at race time t: 'idle', 'warn' (bubbling, 1.6 s) or 'erupt' (2.2 s). */
export function geyserPhase(g, t) {
  const u = (((t + g.phase) % GEYSER_CYCLE) + GEYSER_CYCLE) % GEYSER_CYCLE;
  if (u > GEYSER_CYCLE - 2.2) return 'erupt';
  if (u > GEYSER_CYCLE - 3.8) return 'warn';
  return 'idle';
}

/** Geysers on the run (deterministic): beside the racing line on straight stretches. */
export function placeGeysers(course, m) {
  if (!m.geysers) return [];
  const r = rng(m.seed * 13 + 5);
  const out = [];
  const L = course.length;
  for (let s = 160; s < L - 120; s += 150 + r() * 80) {
    if (course.kickers.some((k) => Math.abs(k.s - s) < 40)) continue;
    const f = frameAt(course, s);
    const lat = clamp(f.line + (r() < 0.5 ? -1 : 1) * (2.5 + r() * 3), -f.width + 2, f.width - 2);
    out.push({ id: 9000 + out.length, s, lat, phase: r() * GEYSER_CYCLE, y: groundAt(course, s, lat, false) });
  }
  return out;
}
