/**
 * Riding as a pack: where on the road a racer rides (its lane), the start
 * grid, and what happens when two bikes touch. Pure functions (no three.js),
 * so the unit tests can check them.
 *
 * Lateral positions are metres to the right of the course's line (the
 * road's middle), the way race.js aims its bots: right = (cos h, −sin h)
 * for a heading h (0 faces −z).
 */

/** A bike as a capsule: the segment between its wheel hubs, and how wide it is either side. */
export const BIKE_HALF_LENGTH = 0.55;
export const BIKE_RADIUS = 0.32;

/**
 * The band of the street a racer keeps to: on a big road the right-hand half
 * (clear of the double yellow and of the kerb), in a small street — or on one
 * carriageway of a one-way road, all of which goes your way — all of it bar
 * a margin at each side. `pass` widens it towards the middle, for going
 * round someone.
 */
export function laneBand(width, small, pass = false, oneway = false) {
  const w = Math.max(2.4, width || 6);
  if (small) return { lo: -w / 2 + 0.75, hi: w / 2 - 0.75 };
  if (oneway) return { lo: -w / 2 + 0.95, hi: w / 2 - 0.95 };
  const hi = Math.max(1.4, w / 2 - 0.85);
  const lo = pass ? Math.max(-0.3, Math.min(0.9, hi - 4.5)) : Math.min(hi - 0.4, 1.0);
  return { lo, hi };
}

/** Each racer its own line in the band (0 the middle side, 1 the kerb side), spread evenly. */
export function laneShares(n) {
  if (n <= 1) return [0.6];
  return Array.from({ length: n }, (_, i) => 0.12 + (0.76 * i) / (n - 1));
}

/**
 * A staggered grid: two across, each rider half a row behind the one beside
 * it, rows 3.2 m apart. Returns for each slot how far behind the line (m)
 * and which column (0 the middle side, 1 the kerb side).
 */
export function gridSlots(n, { row = 3.2, first = 2.5 } = {}) {
  return Array.from({ length: n }, (_, i) => ({ back: first + i * (row / 2), col: i % 2 }));
}

/**
 * A point `back` metres behind the start line, and its heading: index 0 of a looped course of points
 * [x, z, …] (with distances `s`, total `length`); on a point-to-point course (`open`) its `startI`,
 * on the road behind it (never round past its first point).
 */
export function behindStart(course, back) {
  const pts = course.points;
  if (course.open) {
    const S = course.s;
    const want = Math.max(0, S[course.startI ?? 0] - back);
    let i = 0;
    while (i < pts.length - 2 && S[i + 1] <= want) i++;
    const p = pts[i];
    const q = pts[i + 1];
    const t = Math.max(0, Math.min(1, (want - S[i]) / (S[i + 1] - S[i] || 1)));
    return { x: p[0] + (q[0] - p[0]) * t, z: p[1] + (q[1] - p[1]) * t, heading: Math.atan2(-(q[0] - p[0]), -(q[1] - p[1])), i, width: p[2] ?? 6, cls: p[3] ?? 4, oneway: Boolean(p[4]) };
  }
  const n = pts.length;
  let left = back;
  let i = n - 1;
  let q = pts[0];
  for (let guard = 0; guard < n; guard++, i = (i - 1 + n) % n) {
    const p = pts[i];
    const seg = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (seg >= left || guard === n - 1) {
      const t = seg > 1e-6 ? left / seg : 0;
      const x = q[0] + (p[0] - q[0]) * t;
      const z = q[1] + (p[1] - q[1]) * t;
      return { x, z, heading: Math.atan2(-(q[0] - p[0]), -(q[1] - p[1])), i, width: p[2] ?? 6, cls: p[3] ?? 4, oneway: Boolean(p[4]) };
    }
    left -= seg;
    q = p;
  }
  return { x: pts[0][0], z: pts[0][1], heading: 0, i: 0, width: pts[0][2] ?? 6, cls: pts[0][3] ?? 4 };
}

/** Signed metres to the right of the line from p to q (the point's side of the course). */
export function lateralOf(x, z, p, q) {
  const h = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
  return (x - p[0]) * Math.cos(h) - (z - p[1]) * Math.sin(h);
}

const clamp01 = (t) => Math.max(0, Math.min(1, t));

/** The closest points of two segments (a0→a1, b0→b1) in the plane: [s, t] along each. */
function closest(a0x, a0z, a1x, a1z, b0x, b0z, b1x, b1z) {
  const dax = a1x - a0x;
  const daz = a1z - a0z;
  const dbx = b1x - b0x;
  const dbz = b1z - b0z;
  const rx = a0x - b0x;
  const rz = a0z - b0z;
  const a = dax * dax + daz * daz;
  const e = dbx * dbx + dbz * dbz;
  const f = dbx * rx + dbz * rz;
  const c = dax * rx + daz * rz;
  const b = dax * dbx + daz * dbz;
  const den = a * e - b * b;
  let s = den > 1e-9 ? clamp01((b * f - c * e) / den) : 0;
  let t = (b * s + f) / e;
  if (t < 0) {
    t = 0;
    s = clamp01(-c / a);
  } else if (t > 1) {
    t = 1;
    s = clamp01((b - c) / a);
  }
  return [s, t];
}

/**
 * Do two bikes ({ x, z, heading }) touch? Returns null, or { nx, nz, depth }:
 * the direction from a to b where they meet, and how far they overlap.
 */
export function bikeContact(a, b, half = BIKE_HALF_LENGTH, radius = BIKE_RADIUS) {
  if (Math.abs(a.x - b.x) > 2 * (half + radius) || Math.abs(a.z - b.z) > 2 * (half + radius)) return null;
  const ax = -Math.sin(a.heading) * half;
  const az = -Math.cos(a.heading) * half;
  const bx = -Math.sin(b.heading) * half;
  const bz = -Math.cos(b.heading) * half;
  const [s, t] = closest(a.x - ax, a.z - az, a.x + ax, a.z + az, b.x - bx, b.z - bz, b.x + bx, b.z + bz);
  const pax = a.x - ax + 2 * ax * s;
  const paz = a.z - az + 2 * az * s;
  const pbx = b.x - bx + 2 * bx * t;
  const pbz = b.z - bz + 2 * bz * t;
  let dx = pbx - pax;
  let dz = pbz - paz;
  let d = Math.hypot(dx, dz);
  if (d >= radius * 2) return null;
  if (d < 1e-4) {
    // The wheel lines cross or run in line (nose to tail): apart along the line between them.
    const cx = b.x - a.x;
    const cz = b.z - a.z;
    const cd = Math.hypot(cx, cz);
    if (cd > 1e-4) return { nx: cx / cd, nz: cz / cd, depth: Math.max(0.01, 2 * (half + radius) - cd) };
    // Right on top of each other: apart sideways (a's right).
    return { nx: Math.cos(a.heading), nz: -Math.sin(a.heading), depth: radius * 2 };
  }
  return { nx: dx / d, nz: dz / d, depth: radius * 2 - d };
}

/**
 * Two bikes that touch: pushed apart (`movable` says which of them this
 * browser may move), the speed they had into each other taken out, a little
 * speed lost, and a wobble for each that grows with the knock. Mutates the
 * bikes ({ x, z, heading, v, travel }); returns how hard they met (m/s).
 */
export function resolveBump(a, b, contact, movable = [true, true]) {
  const { nx, nz, depth } = contact;
  const [ma, mb] = movable;
  const share = ma && mb ? 0.5 : 1;
  if (ma) {
    a.x -= nx * depth * share;
    a.z -= nz * depth * share;
  }
  if (mb) {
    b.x += nx * depth * share;
    b.z += nz * depth * share;
  }
  // How fast they were closing along the normal.
  const va = { x: -Math.sin(a.travel ?? a.heading) * a.v, z: -Math.cos(a.travel ?? a.heading) * a.v };
  const vb = { x: -Math.sin(b.travel ?? b.heading) * b.v, z: -Math.cos(b.travel ?? b.heading) * b.v };
  const closing = (va.x - vb.x) * nx + (va.z - vb.z) * nz;
  const hit = Math.max(0, closing);
  if (hit > 0) {
    // The one behind loses what it ran into; the one ahead is nudged on a little.
    const fa = (a.x - b.x) * -Math.sin(a.heading) + (a.z - b.z) * -Math.cos(a.heading) < 0; // a is behind b
    if (ma) a.v = Math.max(0, a.v - hit * (fa ? 0.55 : 0.2));
    if (mb) b.v = Math.max(0, b.v + hit * (fa ? 0.15 : -0.35));
    // Side by side: each turned a touch away from the other.
    const side = Math.min(0.12, hit * 0.03);
    const turnAway = (bike, sx, sz) => {
      const right = sx * Math.cos(bike.heading) - sz * Math.sin(bike.heading);
      bike.heading += right > 0 ? side : -side;
    };
    if (ma) turnAway(a, nx, nz);
    if (mb) turnAway(b, -nx, -nz);
  }
  if (ma) a.v *= 0.995;
  if (mb) b.v *= 0.995;
  return hit;
}
