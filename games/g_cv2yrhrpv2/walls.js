/**
 * What a racer can't ride through: the buildings' footprints (each a ring of
 * wall segments, solid inside) and thin walls (an alley's garden walls), in
 * world metres, sorted into a grid so a frame only looks at the few walls
 * near it. Pure numbers, no three.js, so the tests can ride into them.
 *
 * A racer is a circle on the ground. `sweep` moves a circle from one point to
 * another and says where it first touches a wall (continuous: at 85 km/h, or
 * a tenth of a second between frames, nothing is jumped through), `push`
 * takes a circle that somehow ended up in a wall (a spawn, a network snap)
 * back out, `inside` says whether a point is inside a footprint, and `ray`
 * how far a wall is along a line (for the camera and for how wide a street
 * really is between its walls).
 */

/** A racer's circle: the scooter and the rider on it, seen from above. */
export const RIDER_RADIUS = 0.42;

const EPS = 1e-6;

export class Walls {
  /** @param {number} cell grid square, metres */
  constructor(cell = 8) {
    this.cell = cell;
    this.grid = new Map();
    this.ringGrid = new Map();
    this.rings = [];
    this.count = 0;
    this._stamp = 0;
  }

  _key(i, j) {
    return i * 131071 + j;
  }

  _cells(minx, minz, maxx, maxz, fn) {
    const c = this.cell;
    const i0 = Math.floor(minx / c);
    const i1 = Math.floor(maxx / c);
    const j0 = Math.floor(minz / c);
    const j1 = Math.floor(maxz / c);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) fn(this._key(i, j));
  }

  /** A thin wall from a to b (`owner`: the ring it belongs to, or anything to say what it is). */
  addSegment(ax, az, bx, bz, owner = null) {
    if (Math.hypot(bx - ax, bz - az) < 1e-3) return null;
    const s = { ax, az, bx, bz, owner, seen: 0 };
    this._cells(Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz), (k) => {
      let list = this.grid.get(k);
      if (!list) this.grid.set(k, (list = []));
      list.push(s);
    });
    this.count++;
    return s;
  }

  /** A footprint: a closed ring of points (xs, zs), solid inside. */
  addRing(xs, zs, info = null) {
    const n = xs.length;
    if (n < 3) return null;
    let minx = Infinity;
    let maxx = -Infinity;
    let minz = Infinity;
    let maxz = -Infinity;
    for (let i = 0; i < n; i++) {
      minx = Math.min(minx, xs[i]);
      maxx = Math.max(maxx, xs[i]);
      minz = Math.min(minz, zs[i]);
      maxz = Math.max(maxz, zs[i]);
    }
    const ring = { xs, zs, minx, maxx, minz, maxz, info, seen: 0 };
    this.rings.push(ring);
    this._cells(minx, minz, maxx, maxz, (k) => {
      let list = this.ringGrid.get(k);
      if (!list) this.ringGrid.set(k, (list = []));
      list.push(ring);
    });
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      this.addSegment(xs[i], zs[i], xs[j], zs[j], ring);
    }
    return ring;
  }

  /** Every wall segment whose grid squares touch a box. */
  segments(minx, minz, maxx, maxz) {
    const out = [];
    const stamp = ++this._stamp;
    this._cells(minx, minz, maxx, maxz, (k) => {
      for (const s of this.grid.get(k) ?? []) {
        if (s.seen === stamp) continue;
        s.seen = stamp;
        out.push(s);
      }
    });
    return out;
  }

  /** The footprint a point is inside, or null. */
  inside(x, z) {
    const list = this.ringGrid.get(this._key(Math.floor(x / this.cell), Math.floor(z / this.cell)));
    if (!list) return null;
    for (const r of list) {
      if (x < r.minx || x > r.maxx || z < r.minz || z > r.maxz) continue;
      if (pointInRing(r.xs, r.zs, x, z)) return r;
    }
    return null;
  }

  /**
   * A circle of radius `r` moving from (x0, z0) to (x1, z1): the first wall it touches, as
   * { t (0–1 along the move), nx, nz (the wall's face toward the circle), seg }, or null.
   * A wall the circle already overlaps counts only if it is moving further into it.
   */
  sweep(x0, z0, x1, z1, r) {
    const segs = this.segments(Math.min(x0, x1) - r, Math.min(z0, z1) - r, Math.max(x0, x1) + r, Math.max(z0, z1) + r);
    let best = null;
    const dx = x1 - x0;
    const dz = z1 - z0;
    for (const s of segs) {
      const hit = sweepSegment(x0, z0, dx, dz, r, s.ax, s.az, s.bx, s.bz);
      if (hit && (!best || hit.t < best.t)) {
        best = hit;
        best.seg = s;
      }
    }
    return best;
  }

  /** Whether a circle at a point overlaps a wall (or its middle is inside a footprint). */
  hits(x, z, r) {
    if (this.inside(x, z)) return true;
    for (const s of this.segments(x - r, z - r, x + r, z + r)) if (segDist(x, z, s.ax, s.az, s.bx, s.bz).d < r - 1e-4) return true;
    return false;
  }

  /**
   * A circle that is in a wall, or inside a footprint, moved out the shortest way (a few rounds,
   * for corners and buildings that touch). Returns { x, z, moved (metres), ok (clear now) }.
   */
  push(x, z, r, rounds = 6) {
    const x0 = x;
    const z0 = z;
    for (let k = 0; k < rounds; k++) {
      let moved = false;
      const ring = this.inside(x, z);
      if (ring) {
        // Out through the nearest wall of the footprint, and a radius beyond it.
        let best = null;
        const n = ring.xs.length;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const c = segDist(x, z, ring.xs[i], ring.zs[i], ring.xs[j], ring.zs[j]);
          if (!best || c.d < best.d) best = c;
        }
        const d = Math.max(EPS, best.d);
        x = best.x + ((best.x - x) / d) * (r + 0.02);
        z = best.z + ((best.z - z) / d) * (r + 0.02);
        moved = true;
      }
      for (const s of this.segments(x - r, z - r, x + r, z + r)) {
        const c = segDist(x, z, s.ax, s.az, s.bx, s.bz);
        if (c.d >= r - 1e-4) continue;
        let nx;
        let nz;
        if (c.d > 1e-5) {
          nx = (x - c.x) / c.d;
          nz = (z - c.z) / c.d;
        } else {
          // Right on the line: out to the side away from the footprint (or either side of a thin wall).
          const ex = s.bx - s.ax;
          const ez = s.bz - s.az;
          const L = Math.hypot(ex, ez);
          nx = -ez / L;
          nz = ex / L;
          if (s.owner?.xs && pointInRing(s.owner.xs, s.owner.zs, x + nx * 0.05, z + nz * 0.05)) {
            nx = -nx;
            nz = -nz;
          }
        }
        x += nx * (r - c.d + 0.01);
        z += nz * (r - c.d + 0.01);
        moved = true;
      }
      if (!moved) return { x, z, moved: Math.hypot(x - x0, z - z0), ok: true };
    }
    return { x, z, moved: Math.hypot(x - x0, z - z0), ok: !this.hits(x, z, r * 0.98) };
  }

  /** How far along a line (unit direction dx, dz) to the first wall, up to `max`. */
  ray(x, z, dx, dz, max) {
    const x1 = x + dx * max;
    const z1 = z + dz * max;
    let best = max;
    for (const s of this.segments(Math.min(x, x1), Math.min(z, z1), Math.max(x, x1), Math.max(z, z1))) {
      const t = segCross(x, z, x1, z1, s.ax, s.az, s.bx, s.bz);
      if (t != null) best = Math.min(best, t * max);
    }
    return best;
  }

  /** How much of a straight line (metres) runs inside footprints, sampled every `step` m. */
  insideAlong(ax, az, bx, bz, step = 0.75) {
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(L / step));
    let k = 0;
    for (let i = 0; i <= n; i++) if (this.inside(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n)) k++;
    return (k / (n + 1)) * L;
  }
}

/** Even–odd: is (x, z) inside the ring? */
export function pointInRing(xs, zs, x, z) {
  let inside = false;
  for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) {
    if (zs[i] > z !== zs[j] > z && x < ((xs[j] - xs[i]) * (z - zs[i])) / (zs[j] - zs[i]) + xs[i]) inside = !inside;
  }
  return inside;
}

/** The nearest point of segment a→b to (x, z), and how far. */
export function segDist(x, z, ax, az, bx, bz) {
  const ex = bx - ax;
  const ez = bz - az;
  const L2 = ex * ex + ez * ez || 1e-12;
  const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / L2));
  const cx = ax + ex * t;
  const cz = az + ez * t;
  return { x: cx, z: cz, t, d: Math.hypot(x - cx, z - cz) };
}

/** Where line p0→p1 crosses segment a→b, as t along p0→p1 (0–1), or null. */
function segCross(px, pz, qx, qz, ax, az, bx, bz) {
  const rx = qx - px;
  const rz = qz - pz;
  const sx = bx - ax;
  const sz = bz - az;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((ax - px) * sz - (az - pz) * sx) / den;
  const u = ((ax - px) * rz - (az - pz) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

/**
 * A circle (radius r) at p0 moving by (dx, dz) against segment a→b: the first touch as
 * { t, nx, nz } — t along the move (0–1), n the way out from the wall — or null.
 */
export function sweepSegment(px, pz, dx, dz, r, ax, az, bx, bz) {
  const ex = bx - ax;
  const ez = bz - az;
  const L = Math.hypot(ex, ez);
  if (L < 1e-9) return sweepPoint(px, pz, dx, dz, r, ax, az);
  const ux = ex / L;
  const uz = ez / L;
  // The line's normal, and which side of it the circle starts on.
  let mx = -uz;
  let mz = ux;
  let h0 = (px - ax) * mx + (pz - az) * mz;
  let dm = dx * mx + dz * mz;
  if (h0 < 0 || (h0 === 0 && dm > 0)) {
    mx = -mx;
    mz = -mz;
    h0 = -h0;
    dm = -dm;
  }
  let best = null;
  if (h0 < r) {
    // Already within reach of the line: touching its face now, if moving into it.
    const u = (px - ax) * ux + (pz - az) * uz;
    if (u >= 0 && u <= L) {
      if (dm < -1e-9) return { t: 0, nx: mx, nz: mz };
      return null;
    }
  } else if (dm < -1e-12) {
    const t = (h0 - r) / -dm;
    if (t <= 1) {
      const u = (px + dx * t - ax) * ux + (pz + dz * t - az) * uz;
      if (u >= 0 && u <= L) best = { t, nx: mx, nz: mz };
    }
  }
  if (best) return best;
  // Its ends: round caps.
  const a = sweepPoint(px, pz, dx, dz, r, ax, az);
  const b = sweepPoint(px, pz, dx, dz, r, bx, bz);
  if (a && (!b || a.t <= b.t)) return a;
  return b;
}

/** A circle moving against a point (a wall's end). */
function sweepPoint(px, pz, dx, dz, r, cx, cz) {
  const fx = px - cx;
  const fz = pz - cz;
  const A = dx * dx + dz * dz;
  const B = 2 * (fx * dx + fz * dz);
  const C = fx * fx + fz * fz - r * r;
  if (C <= 0) {
    // Overlapping it already: only moving closer counts.
    if (B < 0) {
      const d = Math.sqrt(fx * fx + fz * fz) || 1;
      return { t: 0, nx: fx / d, nz: fz / d };
    }
    return null;
  }
  if (A < 1e-14 || B >= 0) return null;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const t = (-B - Math.sqrt(disc)) / (2 * A);
  if (t < 0 || t > 1) return null;
  const hx = px + dx * t - cx;
  const hz = pz + dz * t - cz;
  const d = Math.hypot(hx, hz) || 1;
  return { t, nx: hx / d, nz: hz / d };
}

/**
 * The footprints of buildings as rings in world metres, from tiles.js tiles (decoded): the same
 * sums SeoulGame uses to stand them up (x east from the tile's corner, z = −north).
 */
export function tileRings(tile, tx, ty, size, origin) {
  const ox = tx * size - origin.x;
  const oz = -(ty * size - origin.y);
  return tile.buildings.map((b) => {
    const n = b.ring.length / 2;
    const xs = new Float64Array(n);
    const zs = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = ox + b.ring[i * 2];
      zs[i] = oz - b.ring[i * 2 + 1];
    }
    return { xs, zs, height: b.height };
  });
}
