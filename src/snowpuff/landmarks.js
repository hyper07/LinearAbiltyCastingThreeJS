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
    if (r < rim) h = Math.pow(1 - rim, 1.1) * 1.05 - (rim - r) * 1.2;
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
  const inView = (x, z) => {
    let k = 0, n = 0;
    for (let s = 0; s < L; s += 10) {
      const f = frameAt(course, s);
      const a = Math.atan2(x - f.x, -(z - f.z));
      if (Math.abs(Math.atan2(Math.sin(a - f.heading), Math.cos(a - f.heading))) < 0.6) k++;
      n++;
    }
    return k / n;
  };
  let side = pk.side ?? 0, best = -1;
  if (pk.side == null) {
    for (let sd = -0.45; sd <= 0.451; sd += 0.05) {
      const [x, z] = at(sd);
      const v = inView(x, z) - Math.abs(sd) * 0.05;
      if (v > best) {
        best = v;
        side = sd;
      }
    }
  }
  // the hero standard: seen from mid-run its summit stands ~19° up and its
  // foot sits just under the horizon, so it fills a third of the view ahead
  // (its footprint never reaches the finish: radius ≤ dist − 450)
  const [x, z] = at(side);
  const mid = frameAt(course, L / 2);
  const elev = ((pk.elev ?? 19) * Math.PI) / 180;
  const foot = ((pk.foot ?? 4) * Math.PI) / 180;
  const dm = Math.hypot(x - mid.x, z - mid.z);
  const height = dm * (Math.tan(elev) + Math.tan(foot));
  const radius = Math.min(dist - 450, (pk.radius ?? 1100) * (height / (pk.height ?? 900)));
  const y = mid.y + Math.tan(elev) * dm - height;
  const out = { x, y, z, height, radius, side, yaw: Math.atan2(ux, -uz) + (pk.yaw ?? 0) };
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
