/**
 * The mountain's plan, as pure numbers (no three.js): where each floor's
 * terrace is, its three plinths, the stairs up to the next floor, the
 * stream that falls down every cliff, and the height of the ground
 * anywhere — which the terrain mesh, the walkers and the nav grid all read.
 *
 * Floors are terraces stepping back up one mountain: floor k (0-based)
 * stands FLOOR_H higher and STEP further back than the one below. Each
 * terrace is a blob — a half-ellipse in front, a long tapering one behind —
 * so the stack reads as a mountain, not a pile of plates.
 */
export const FLOOR_H = 7.5;
export const STEP = 30;
export const DEPTH = 30;
export const GROUND_Y = -7;
export const PLINTH_R = 4.6;
export const PLINTH_H = 0.55;
/** The three schools on a floor, in order: the school slots (content/subjects.js SLOTS); each world puts its own subject in each. */
export const SUBJECT_ORDER = ['math', 'history', 'physics'];

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

/** Smooth value noise in 2D, the same in every browser. */
function hash(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
export function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return lerp(lerp(hash(xi, zi), hash(xi + 1, zi), u), lerp(hash(xi, zi + 1), hash(xi + 1, zi + 1), u), v) * 2 - 1;
}
export const fbm = (x, z) => noise(x, z) * 0.6 + noise(x * 2.1 + 7, z * 2.1 - 3) * 0.3 + noise(x * 4.3 - 11, z * 4.3 + 5) * 0.1;

/**
 * The plan for `count` floors.
 * @returns {{ floors: object[], stairs: object[], river: object, height(x, z): number, floorAt(x, z): number }}
 */
export function planMountain(count) {
  const floors = [];
  for (let k = 0; k < count; k++) {
    const y = k * FLOOR_H;
    const cx = 0;
    const cz = -k * STEP;
    const rx = 46 - k * 0.8;
    const back = 110 - k * 8;
    const phase = [k * 1.3, k * 2.1 + 1, k * 0.7 + 2];
    floors.push({ k, n: k + 1, y, cx, cz, rx, rz: DEPTH, back, phase });
  }
  const blob = (f, a) => 1 + 0.045 * Math.sin(3 * a + f.phase[0]) + 0.035 * Math.sin(5 * a + f.phase[1]) + 0.02 * Math.sin(9 * a + f.phase[2]);
  /** How far inside floor f a point is, in metres (negative outside). */
  const inside = (f, x, z) => {
    const dx = (x - f.cx) / f.rx;
    const dz = (z - f.cz) / (z > f.cz ? f.rz : f.back);
    const d = Math.hypot(dx, dz) / blob(f, Math.atan2(dz, dx));
    return (1 - d) * (z > f.cz ? f.rz : Math.min(f.rx, 30));
  };
  /** The front edge of floor f at x (where its cliff drops to the floor below), or null. */
  const frontZ = (f, x) => {
    let lo = f.cz, hi = f.cz + f.rz * 1.2;
    if (inside(f, x, lo + 0.01) < 0) return null;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (inside(f, x, mid) > 0) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  // Where things stand on each floor: between the cliff of the floor above and the front edge.
  for (const f of floors) {
    const above = floors[f.k + 1];
    const backAt = (x) => (above ? frontZ(above, x) ?? f.cz - 6 : f.cz - 8);
    const midAt = (x) => {
      const fr = frontZ(f, x);
      return fr == null ? f.cz : (fr + Math.max(backAt(x), f.cz - 12)) / 2;
    };
    f.frontZ = (x) => frontZ(f, x);
    f.backZ = backAt;
    // The back row: the three subject buildings, under the cliff of the floor above.
    const backRow = (x, r) => Math.max(backAt(x), f.cz - 20) + r + 2.2;
    const xs = { math: f.cx - 22, history: f.cx, physics: f.cx + 18 };
    f.plinths = SUBJECT_ORDER.map((subject) => {
      const x = xs[subject];
      const z = backRow(x, PLINTH_R);
      return { subject, x, z, r: PLINTH_R, y: f.y + PLINTH_H, door: { x, z: z + PLINTH_R - 0.6 }, yaw: 0 };
    });
    // The main path, in front of the back row, from one end to the other.
    const pathAt = (x) => {
      const fr = frontZ(f, x);
      if (fr == null) return null;
      return Math.min(fr - 9, backRow(x, PLINTH_R) + PLINTH_R + 2.6);
    };
    const pathPts = [];
    for (let x = f.cx - f.rx * 0.84; x <= f.cx + f.rx * 0.84; x += 2) {
      const z = pathAt(x);
      if (z != null) pathPts.push([x, z]);
    }
    f.path = pathPts;
    // The front row: smaller places, each joined to the path by a short spur.
    const frontRow = (x, r) => (frontZ(f, x) ?? f.cz + 20) - r - 3.2;
    const front = [['shop', -30, 2.8], ['arcade', -15, 2.8], ['landmark', 0, 4.2], ['museum', 13, 2.8], ['board', 22, 1.6]];
    f.places = [
      ...f.plinths.map((p) => ({ kind: p.subject, x: p.x, z: p.z, r: PLINTH_R })),
      ...front.map(([kind, dx, r]) => {
        const x = f.cx + dx;
        return { kind, x, z: frontRow(x, r), r };
      })
    ];
    // The World Portal (to the other study worlds) stands on the first floor, between the landmark and the museum.
    if (f.k === 0) {
      const x = f.cx + 7, z = frontRow(f.cx + 7, 1.6);
      f.worldGate = { x, z, yaw: 0, at: { x, z: z - 1.6 - 1.2 } };
    }
    f.spurs = f.places.map((p) => {
      const pz = pathAt(p.x) ?? p.z;
      return [[p.x, pz], [p.x, p.z + (p.z > pz ? -p.r * 0.6 : p.r * 0.6)]];
    });
    f.river = { x: f.cx + 35 };
  }
  // Stairs from each floor to the next, on alternate sides.
  const stairs = [];
  for (let k = 0; k < count - 1; k++) {
    const lo = floors[k], hi = floors[k + 1];
    const x = k % 2 === 0 ? lo.cx - 36 : lo.cx + 27;
    const top = hi.frontZ(x) ?? hi.cz + 8;
    const a = { x, z: top + 6.5, y: lo.y };
    const b = { x, z: top - 4, y: hi.y };
    stairs.push({ k, from: lo.n, to: hi.n, a, b, width: 2.6 });
  }
  // The stream: one line down the right of every terrace; a waterfall over every cliff.
  const river = { segments: [], falls: [] };
  for (const f of floors) {
    const x = f.river.x;
    const back = f.backZ(x);
    const front = f.frontZ(x) ?? f.cz + f.rz;
    river.segments.push({ floor: f.n, x, z0: back + (floors[f.k + 1] ? 0.2 : -4), z1: front - 0.2, y: f.y });
    river.falls.push({ floor: f.n, x, z: front, top: f.y, bottom: f.k ? floors[f.k - 1].y : GROUND_Y + 0.4 });
  }

  // At the foot of the mountain the last waterfall fills a pond, and a brook winds away to the front.
  const f0 = floors[0];
  const lakeZ = (f0.frontZ(f0.river.x) ?? 15) + 9;
  river.lake = { x: f0.river.x + 1, z: lakeZ, r: 8.5, y: GROUND_Y - 0.55 };
  river.brook = [[river.lake.x + 4, lakeZ + 6], [river.lake.x + 9, lakeZ + 16], [river.lake.x + 7, lakeZ + 28], [river.lake.x + 14, lakeZ + 42], [river.lake.x + 12, lakeZ + 60]];
  const distToLine = (x, z, pts) => {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
    return best;
  };
  river.distToBrook = (x, z) => distToLine(x, z, river.brook);
  const valleyWater = (x, z, h) => {
    const L = river.lake;
    const d = Math.hypot((x - L.x) * 0.9, z - L.z);
    let out = h;
    if (d < L.r + 3) out = lerp(GROUND_Y - 1.6, out, smooth(L.r - 2, L.r + 3, d));
    const b = distToLine(x, z, river.brook);
    if (b < 3.2) out = Math.min(out, lerp(GROUND_Y - 1.2, out, smooth(1, 3.2, b)));
    return out;
  };

  const riverDip = (x, z, f) => {
    const s = river.segments[f.k];
    if (z < s.z0 - 1 || z > s.z1 + 2) return 0;
    const w = Math.abs(x - s.x);
    return -0.75 * (1 - smooth(0.9, 1.7, w));
  };
  const stairRamp = (x, z) => {
    for (const s of stairs) {
      const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
      const len2 = dx * dx + dz * dz;
      const t = ((x - s.a.x) * dx + (z - s.a.z) * dz) / len2;
      if (t < -0.02 || t > 1.02) continue;
      const px = s.a.x + dx * t, pz = s.a.z + dz * t;
      if (Math.hypot(x - px, z - pz) > s.width / 2 + 0.15) continue;
      // Two flights with a landing in the middle.
      const tt = Math.max(0, Math.min(1, t));
      const lift = tt < 0.42 ? tt / 0.42 * 0.5 : tt < 0.58 ? 0.5 : 0.5 + (tt - 0.58) / 0.42 * 0.5;
      return lerp(s.a.y, s.b.y, lift);
    }
    return null;
  };
  const plinthLift = (x, z) => {
    for (const f of floors) for (const p of f.plinths) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < p.r + 0.3) return { y: f.y, lift: PLINTH_H * (1 - smooth(p.r - 0.1, p.r + 0.3, d)) };
    }
    return null;
  };

  /** The terrain's height without the plinths: what the ground mesh draws. */
  function ground(x, z) {
    // The valley floor, rising into hills far out.
    const far = Math.max(0, Math.hypot(x * 0.62, (z + 90) * 0.46) - 70);
    let h = GROUND_Y + fbm(x * 0.05, z * 0.05) * 1.2 + far * far * 0.02 + Math.max(0, far - 10) * 0.6 * (0.6 + 0.4 * fbm(x * 0.03 + 4, z * 0.03));
    h = valleyWater(x, z, h);
    let on = null;
    for (const f of floors) {
      const e = inside(f, x, z);
      if (e < -0.5) continue;
      const s = smooth(0, 1.6, e);
      const below = f.k ? floors[f.k - 1].y : GROUND_Y;
      // Rocky ledges in the cliff band.
      const rough = s > 0 && s < 1 ? fbm(x * 0.55 + f.k * 3, z * 0.55) * 1.2 * Math.sin(Math.PI * s) : 0;
      const v = lerp(below, f.y, s) + rough;
      if (v > h) {
        h = v;
        on = s >= 1 ? f : null;
      }
    }
    if (on) h += riverDip(x, z, on) + fbm(x * 0.12, z * 0.12) * 0.06;
    const ramp = stairRamp(x, z);
    if (ramp != null) h = ramp;
    return h;
  }
  /** The height a walker stands at: the ground, the plinths on it. */
  function height(x, z) {
    const g = ground(x, z);
    const p = plinthLift(x, z);
    return p && Math.abs(g - p.y) < 0.6 ? Math.max(g, p.y + p.lift) : g;
  }
  /** The floor number (1…) a point is on, or 0 for the valley and cliffs. */
  function floorAt(x, z) {
    const h = ground(x, z);
    const k = Math.round(h / FLOOR_H);
    if (k < 0 || k >= floors.length || Math.abs(h - k * FLOOR_H) > 1.2) return 0;
    return floors[k].n;
  }
  return { floors, stairs, river, ground, height, floorAt, inside };
}

/* ---------------------------------------------------------------- walking */

/**
 * A walking grid over the terraces: a cell is open if it is on a floor (or
 * a stair), not in a building, not in the stream (except on a bridge), and
 * not a cliff. `locked(n)` closes whole floors and the stairs up to them.
 */
export function buildNavGrid(plan, { cell = 0.8, locked = () => false, blockers = [], bridges = [] } = {}) {
  const xs = plan.floors.map((f) => [f.cx - f.rx - 4, f.cx + f.rx + 4]);
  const x0 = Math.min(...xs.map((v) => v[0])), x1 = Math.max(...xs.map((v) => v[1]));
  const z0 = plan.floors.at(-1).cz - 16, z1 = plan.floors[0].cz + DEPTH + 4;
  const w = Math.ceil((x1 - x0) / cell), d = Math.ceil((z1 - z0) / cell);
  const h = new Float32Array(w * d);
  const open = new Uint8Array(w * d);
  const floorOf = new Uint8Array(w * d);
  const onStair = (x, z) => plan.stairs.find((s) => {
    const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z;
    const t = ((x - s.a.x) * dx + (z - s.a.z) * dz) / (dx * dx + dz * dz);
    if (t < 0 || t > 1) return false;
    return Math.hypot(x - (s.a.x + dx * t), z - (s.a.z + dz * t)) < s.width / 2 - 0.25;
  });
  for (let j = 0; j < d; j++) {
    for (let i = 0; i < w; i++) {
      const x = x0 + (i + 0.5) * cell, z = z0 + (j + 0.5) * cell;
      const idx = j * w + i;
      h[idx] = plan.height(x, z);
      const stair = onStair(x, z);
      const n = plan.floorAt(x, z);
      floorOf[idx] = stair ? 0 : n;
      let ok = Boolean(stair) || n > 0;
      if (stair && locked(stair.to)) ok = false;
      if (n && locked(n)) ok = false;
      if (ok && n) {
        const f = plan.floors[n - 1];
        const s = plan.river.segments[n - 1];
        const inStream = Math.abs(x - s.x) < 1.25 && z > s.z0 - 0.5 && z < s.z1 + 1;
        if (inStream && !bridges.some((b) => b.floor === n && Math.abs(z - b.z) < b.width / 2 && Math.abs(x - b.x) < b.length / 2)) ok = false;
        if (plan.inside(f, x, z) < 0.9) ok = false; // keep off the cliff lip
      }
      if (ok && blockers.some((b) => Math.hypot(x - b.x, z - b.z) < b.r)) ok = false;
      open[idx] = ok ? 1 : 0;
    }
  }
  // No cliffs between neighbours.
  const step = (a, b) => Math.abs(h[a] - h[b]) < cell * 0.95;
  const toCell = (x, z) => [Math.floor((x - x0) / cell), Math.floor((z - z0) / cell)];
  const centre = (i, j) => [x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell];
  const inGrid = (i, j) => i >= 0 && j >= 0 && i < w && j < d;
  const isOpen = (i, j) => inGrid(i, j) && open[j * w + i] === 1;

  /** The nearest open cell to a point (searching outwards a little). */
  function nearestOpen(x, z, reach = 10) {
    const [ci, cj] = toCell(x, z);
    if (isOpen(ci, cj)) return [ci, cj];
    for (let r = 1; r <= reach; r++) {
      let best = null, bd = Infinity;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !isOpen(ci + di, cj + dj)) continue;
        const dd = di * di + dj * dj;
        if (dd < bd) { bd = dd; best = [ci + di, cj + dj]; }
      }
      if (best) return best;
    }
    return null;
  }

  /** A* from a point to a point; the path as [[x, z], …], straightened. Null if there is none. */
  function findPath(from, to) {
    const s = nearestOpen(from[0], from[1], 4), g = nearestOpen(to[0], to[1], 12);
    if (!s || !g) return null;
    const start = s[1] * w + s[0], goal = g[1] * w + g[0];
    const came = new Int32Array(w * d).fill(-1);
    const closed = new Uint8Array(w * d);
    const cost = new Float32Array(w * d).fill(Infinity);
    const heap = [[0, start]];
    cost[start] = 0;
    const gx = g[0], gz = g[1];
    const push = (item) => {
      heap.push(item);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false, guard = 0;
    while (heap.length && guard++ < 400000) {
      const [, cur] = pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === goal) { found = true; break; }
      const ci = cur % w, cj = (cur / w) | 0;
      for (const [di, dj, c] of dirs) {
        const ni = ci + di, nj = cj + dj;
        if (!isOpen(ni, nj) || closed[nj * w + ni]) continue;
        if (di && dj && (!isOpen(ci + di, cj) || !isOpen(ci, cj + dj))) continue;
        const nIdx = nj * w + ni;
        if (!step(cur, nIdx)) continue;
        const nc = cost[cur] + c;
        if (nc < cost[nIdx]) {
          cost[nIdx] = nc;
          came[nIdx] = cur;
          push([nc + Math.hypot(ni - gx, nj - gz), nIdx]);
        }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = goal; c !== -1; c = came[c]) cells.push(c);
    cells.reverse();
    // Straighten: skip cells while a straight line between stays open and level.
    const pts = cells.map((c) => centre(c % w, (c / w) | 0));
    const clear = (a, b) => {
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (cell * 0.5));
      let prev = null;
      for (let k = 0; k <= n; k++) {
        const x = lerp(a[0], b[0], k / n), z = lerp(a[1], b[1], k / n);
        const [i, j] = toCell(x, z);
        if (!isOpen(i, j)) return false;
        const idx = j * w + i;
        if (prev != null && prev !== idx && !step(prev, idx)) return false;
        prev = idx;
      }
      return true;
    };
    const out = [pts[0]];
    let anchor = 0;
    for (let k = 2; k < pts.length; k++) {
      if (!clear(pts[anchor], pts[k])) {
        out.push(pts[k - 1]);
        anchor = k - 1;
      }
    }
    out.push(pts.at(-1));
    return out;
  }

  /** May a walker step from one point to another (WASD)? */
  function canStep(fx, fz, tx, tz) {
    const a = toCell(fx, fz), b = toCell(tx, tz);
    if (!isOpen(b[0], b[1])) return false;
    if (a[0] === b[0] && a[1] === b[1]) return true;
    return isOpen(a[0], a[1]) ? step(a[1] * w + a[0], b[1] * w + b[0]) : true;
  }
  return { findPath, canStep, nearestOpen: (x, z) => { const c = nearestOpen(x, z); return c && centre(c[0], c[1]); }, w, d, cell, x0, z0, open, floorOf };
}
