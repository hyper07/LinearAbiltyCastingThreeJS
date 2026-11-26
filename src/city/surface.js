/**
 * What a rider or a walker stands on: the road stretches and pavement strips SeoulGame lays
 * (`_roadMesh`) and the golmok's alleys (golmok.js), as plain records, so the rule can be checked
 * without a city.
 *
 *   road stretch: { ax, ay, az, bx, by, bz, half, alley?, w?, aL?, aR?, bL?, bR? }
 *     — its line's ends with the middle's heights, how far out it reaches (`half`); a main road also
 *       its half-width `w` and its edges' heights at each end (left/right of the way it runs), as drawn
 *   pavement strip: { ax, az, bx, bz, ya, yb, oa?, ob?, inner, outer, side }
 *     — along its road's line; its kerb-side heights (ya, yb) and outer edge's (oa, ob), from `inner`
 *       to `outer` metres off the line on `side` (−1 left, 1 right)
 *
 *   surfaceOf(ground, roads, walks, x, z, from)   // the height underfoot at x, z
 */

/** A road stretch's height at a point `k` (0–1) along it: between its edges where it has them, else its middle's. */
export function segY(s, x, z, k) {
  if (s.aL == null) return s.ay + (s.by - s.ay) * k;
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const L = Math.hypot(dx, dz) || 1;
  // 0 at its right edge … 1 at its left (metres to the left of its line, over its width)
  const left = (-(x - s.ax) * dz + (z - s.az) * dx) / L;
  // (and on, as it slopes, over the half-metre past its edges `half` reaches: level with a road crossing there)
  const u = (left + s.w) / (2 * s.w);
  // (drawn as two strips, either side of its middle line: right edge → middle → left edge)
  const across = (r, c, l) => (u < 0.5 ? r + (c - r) * u * 2 : c + (l - c) * (u - 0.5) * 2);
  return across(s.aR, s.ay, s.aL) * (1 - k) + across(s.bR, s.by, s.bL) * k;
}

/** A pavement strip's height at a point (null if the point isn't on it, or within `reach` metres of it). */
export function walkY(s, x, z, reach = 0) {
  const dx = s.bx - s.ax;
  const dz = s.bz - s.az;
  const L2 = dx * dx + dz * dz || 1;
  const k = ((x - s.ax) * dx + (z - s.az) * dz) / L2;
  const slack = reach / Math.sqrt(L2);
  if (k < -0.02 - slack || k > 1.02 + slack) return null;
  // metres to the right of its road's line (as _roadMesh's right side)
  const d = ((x - s.ax) * dz - (z - s.az) * dx) / Math.sqrt(L2);
  const across = d * s.side;
  if (across < s.inner - 0.02 - reach || across > s.outer + 0.02 + reach) return null;
  const t = Math.max(0, Math.min(1, k));
  const inner = s.ya + (s.yb - s.ya) * t;
  if (s.oa == null) return inner;
  // (sloped across to its outer edge, as drawn)
  const u = Math.max(0, Math.min(1, (across - s.inner) / (s.outer - s.inner)));
  return inner + (s.oa + (s.ob - s.oa) * t - inner) * u;
}

/**
 * The surface at a point: the road's if a road passes here within a step up of where you are (so
 * you walk onto a bridge from its end, and under it from the bank), a pavement's over it, else the
 * ground.
 *
 * Where road stretches overlap they rarely agree to the centimetre (a dual carriageway's two ways,
 * a junction on a hill), so the surface is not simply the highest of them — that made small
 * invisible steps a scooter hopped like kerbs. Given where you are (`from`, your height + 0.3), it
 * follows the stretch nearest your height; and a stretch's round end (the disc past its last point,
 * flat at that point's height — on a slope it stands proud of the road on) only counts where no
 * stretch runs through the point.
 */
export function surfaceOf(ground, roads, walks, x, z, from = Infinity, mainOnly = false) {
  // (a crack between two surfaces — where pavements meet at a junction's corner, round a bend, an
  // alley's side — no wider than this is ridden over at the height you're at, not dropped into)
  const CRACK = 1.2;
  let crack = null;
  const near = (y) => {
    if (ref != null && Math.abs(y - ref) < 0.5 && (crack == null || Math.abs(y - ref) < Math.abs(crack - ref))) crack = y;
  };
  let best = ground;
  let onIt = false;
  let alleyEnd = -Infinity;
  const ref = Number.isFinite(from) ? from - 0.3 : null;
  let through = null;
  let cap = -Infinity;
  for (const s of roads) {
    if (mainOnly && s.alley) continue;
    const dx = s.bx - s.ax;
    const dz = s.bz - s.az;
    const raw = ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz || 1);
    const k = Math.max(0, Math.min(1, raw));
    const off = Math.hypot(x - (s.ax + dx * k), z - (s.az + dz * k));
    if (off > s.half) {
      if (off < s.half + CRACK && ref != null) near(segY(s, s.ax + dx * k + ((x - s.ax - dx * k) * s.half) / off, s.az + dz * k + ((z - s.az - dz * k) * s.half) / off, k));
      continue;
    }
    const y = segY(s, x, z, k);
    if (y > Math.max(from, ground) + 2.5) continue;
    // An alley's stretch only past its end (round a bend, where the next stretch doesn't reach):
    // on a hill, its end's height isn't the ground's just before the next one.
    const end = raw < -0.02 || raw > 1.02;
    if (s.alley && end) alleyEnd = Math.max(alleyEnd, y);
    else if (end) cap = Math.max(cap, y);
    // through this stretch: the one nearest your height (or the highest, asked from nowhere)
    else if (through == null || (ref == null ? y > through : Math.abs(y - ref) < Math.abs(through - ref))) through = y;
  }
  const road = through ?? (cap > -Infinity ? cap : null);
  if (road != null && road > best) {
    best = road;
    onIt = true;
  }
  for (const s of walks) {
    const y = walkY(s, x, z);
    if (y != null && y <= Math.max(from, ground) + 2.5) {
      onIt = true;
      best = Math.max(best, y);
    } else if (y == null && ref != null) {
      const ny = walkY(s, x, z, CRACK);
      if (ny != null) near(ny);
    }
  }
  if (onIt) return best;
  if (alleyEnd > -Infinity) return Math.max(best, alleyEnd);
  return crack != null && crack > best ? crack : best;
}
