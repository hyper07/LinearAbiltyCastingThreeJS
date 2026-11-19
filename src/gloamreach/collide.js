/**
 * What the hero can't walk through, and what the camera can't see through:
 * circles (trunks, posts, the well), turned boxes (houses, stalls, the
 * gatehouse) — each with a height range — and the land itself, which
 * blocks where it is too steep to climb or drops away (the map's natural
 * walls; there are no invisible ones). Pure: no three.js.
 */
import { heightAt, slopeAt } from './heights.js';

const CELL = 8;

export class CollisionWorld {
  constructor({ height = heightAt, slope = slopeAt, maxSlope = 0.95, maxDrop = 1.6 } = {}) {
    this.height = height;
    this.slope = slope;
    this.maxSlope = maxSlope;
    this.maxDrop = maxDrop;
    this.shapes = [];
    this.grid = new Map();
  }

  /** A vertical cylinder: x, z, radius, from y0 to y1. */
  circle(x, z, r, y0 = -1e3, y1 = 1e3, tag = null) {
    return this._add({ type: 'c', x, z, r, y0, y1, tag });
  }

  /** A box turned by `face` (see map.js): half-width hw along its front, half-depth hd. */
  box(x, z, hw, hd, face = 0, y0 = -1e3, y1 = 1e3, tag = null) {
    return this._add({ type: 'b', x, z, hw, hd, c: Math.cos(face), s: Math.sin(face), y0, y1, tag });
  }

  _add(shape) {
    this.shapes.push(shape);
    const reach = shape.type === 'c' ? shape.r : Math.hypot(shape.hw, shape.hd);
    for (let i = Math.floor((shape.x - reach) / CELL); i <= Math.floor((shape.x + reach) / CELL); i++) {
      for (let j = Math.floor((shape.z - reach) / CELL); j <= Math.floor((shape.z + reach) / CELL); j++) {
        const k = `${i},${j}`;
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(shape);
      }
    }
    return shape;
  }

  /** Shapes whose cells touch a circle around (x, z). */
  near(x, z, r) {
    const out = new Set();
    for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) {
      for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
        for (const s of this.grid.get(`${i},${j}`) ?? []) out.add(s);
      }
    }
    return out;
  }

  /** Push a circle of radius `r` (feet at y) out of every shape. Returns [x, z]. */
  pushOut(x, z, r, y = 0, height = 1.8) {
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const s of this.near(x, z, r + 1)) {
        if (y + height < s.y0 || y > s.y1) continue;
        if (s.type === 'c') {
          const dx = x - s.x;
          const dz = z - s.z;
          const d = Math.hypot(dx, dz);
          const min = s.r + r;
          if (d < min) {
            const k = d > 1e-6 ? (min - d) / d : 0;
            x += d > 1e-6 ? dx * k : min;
            z += d > 1e-6 ? dz * k : 0;
            moved = true;
          }
        } else {
          // Into the box's frame.
          const dx = x - s.x;
          const dz = z - s.z;
          const lx = dx * s.c - dz * s.s;
          const lz = dx * s.s + dz * s.c;
          const cx = Math.max(-s.hw, Math.min(s.hw, lx));
          const cz = Math.max(-s.hd, Math.min(s.hd, lz));
          let ox = lx - cx;
          let oz = lz - cz;
          let d = Math.hypot(ox, oz);
          if (d < r) {
            let nx, nz, push;
            if (d > 1e-6) {
              nx = ox / d;
              nz = oz / d;
              push = r - d;
            } else {
              // Inside: out by the nearest face.
              const px = s.hw - Math.abs(lx);
              const pz = s.hd - Math.abs(lz);
              if (px < pz) {
                nx = Math.sign(lx) || 1;
                nz = 0;
                push = px + r;
              } else {
                nx = 0;
                nz = Math.sign(lz) || 1;
                push = pz + r;
              }
            }
            const wx = nx * s.c + nz * s.s;
            const wz = -nx * s.s + nz * s.c;
            x += wx * push;
            z += wz * push;
            moved = true;
          }
          void ox, oz, d;
        }
      }
      if (!moved) break;
    }
    return [x, z];
  }

  /** Can a walker stand at (x, z), coming from (fx, fz)? False on steep ground or a drop. */
  walkable(fx, fz, x, z) {
    const h0 = this.height(fx, fz);
    const h1 = this.height(x, z);
    const run = Math.hypot(x - fx, z - fz) || 1e-6;
    if (h1 - h0 > 0 && this.slope(x, z) > this.maxSlope && (h1 - h0) / run > this.maxSlope * 0.6) return false;
    if (h0 - h1 > this.maxDrop * Math.max(run, 0.25) + 0.25) return false;
    return true;
  }

  /**
   * Move a walker from (x, z) by (dx, dz): blocked by shapes and the land,
   * sliding along whatever stops it. Returns [x, z].
   */
  move(x, z, dx, dz, r = 0.4, y = 0) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.3));
    for (let i = 0; i < steps; i++) {
      const sx = dx / steps;
      const sz = dz / steps;
      let nx = x + sx;
      let nz = z + sz;
      if (!this.walkable(x, z, nx, nz)) {
        // Slide: try each axis alone.
        if (this.walkable(x, z, x + sx, z)) nz = z;
        else if (this.walkable(x, z, x, z + sz)) nx = x;
        else {
          nx = x;
          nz = z;
        }
      }
      [nx, nz] = this.pushOut(nx, nz, r, y);
      if (!this.walkable(x, z, nx, nz)) {
        nx = x;
        nz = z;
      }
      x = nx;
      z = nz;
    }
    return [x, z];
  }

  /**
   * How far a ray from (ox, oy, oz) along unit (dx, dy, dz) goes before it
   * hits a shape or the ground (at most `max`).
   */
  raycast(ox, oy, oz, dx, dy, dz, max) {
    let best = max;
    const mx = ox + dx * max * 0.5;
    const mz = oz + dz * max * 0.5;
    for (const s of this.near(mx, mz, max * 0.5 + 1)) {
      const t = s.type === 'c' ? rayCylinder(s, ox, oy, oz, dx, dy, dz) : rayBox(s, ox, oy, oz, dx, dy, dz);
      if (t !== null && t >= 0 && t < best) best = t;
    }
    // The land: march, then refine.
    const step = 0.4;
    let prev = 0;
    for (let t = step; t <= best; t += step) {
      const y = oy + dy * t;
      if (y < this.height(ox + dx * t, oz + dz * t) + 0.2) {
        let a = prev;
        let b = t;
        for (let k = 0; k < 6; k++) {
          const m = (a + b) / 2;
          if (oy + dy * m < this.height(ox + dx * m, oz + dz * m) + 0.2) b = m;
          else a = m;
        }
        best = Math.min(best, a);
        break;
      }
      prev = t;
    }
    return best;
  }
}

function rayCylinder(s, ox, oy, oz, dx, dy, dz) {
  const px = ox - s.x;
  const pz = oz - s.z;
  const a = dx * dx + dz * dz;
  if (a < 1e-9) return null;
  const b = 2 * (px * dx + pz * dz);
  const c = px * px + pz * pz - s.r * s.r;
  if (c < 0) {
    const y = oy;
    return y >= s.y0 && y <= s.y1 ? 0 : null;
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 0) return null;
  const y = oy + dy * t;
  return y >= s.y0 && y <= s.y1 ? t : null;
}

function rayBox(s, ox, oy, oz, dx, dy, dz) {
  // Into the box's frame (y unchanged).
  const px = ox - s.x;
  const pz = oz - s.z;
  const lx = px * s.c - pz * s.s;
  const lz = px * s.s + pz * s.c;
  const ldx = dx * s.c - dz * s.s;
  const ldz = dx * s.s + dz * s.c;
  let t0 = -Infinity;
  let t1 = Infinity;
  const slab = (o, d, lo, hi) => {
    if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
    let a = (lo - o) / d;
    let b = (hi - o) / d;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    return t0 <= t1;
  };
  if (!slab(lx, ldx, -s.hw, s.hw)) return null;
  if (!slab(lz, ldz, -s.hd, s.hd)) return null;
  if (!slab(oy, dy, s.y0, s.y1)) return null;
  if (t1 < 0) return null;
  return Math.max(0, t0);
}
