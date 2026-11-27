/**
 * The junctions Kickrani's traffic drives through (traffic.js), and who may go into each.
 *
 * Found from the roads the cars drive: where three or more road ends meet (or a road's end meets
 * another road running on through), the points a few metres apart joined into one — a divided road's
 * two carriageways crossing another's are one junction, not four. Each has a box (a circle round its
 * middle, `r` m: the crossing roads' width and a little) and its arms (each road's way in).
 *
 * Who goes into the box:
 * - at a junction of main roads crossing (two ways in at an angle) the lights: a green for one pair of
 *   ways in, then a moment's all-red to clear the box, then the other — changed early when nobody
 *   comes on the green and someone waits on the red, kept no longer than SIGNAL.maxGreen;
 * - and everywhere, the box itself: a car goes in only if its way through (`path`) keeps clear of every
 *   car already going through from another way in, and there is room for it on the road out past the
 *   box — it never stops in the box (no blocking the box) and two never meet across it. On a junction
 *   with no lights, whoever has waited longest at the line goes first.
 * The riders don't come into it: nobody waits for them (they dodge the cars).
 */

/** Seconds: the shortest green, the longest (with someone waiting on the red), the all-red between. */
export const SIGNAL = { minGreen: 5, maxGreen: 10, clear: 2 };
/** Metres: road ends this close are the same point; points of one junction this much further apart than their roads' half widths are still one. */
const MEET = 6;
const JOIN = 5;

/** Lengths along a road's line from its start, at each of its points (kept per road). */
const cumCache = new WeakMap();
export function cumOf(road) {
  let c = cumCache.get(road);
  if (c) return c;
  const p = road.pts;
  const n = p.length / 2;
  c = new Float64Array(n);
  for (let k = 1; k < n; k++) c[k] = c[k - 1] + Math.hypot(p[k * 2] - p[k * 2 - 2], p[k * 2 + 1] - p[k * 2 - 1]);
  cumCache.set(road, c);
  return c;
}

/** How far along its road's line (from its start) a place { i, t } is. */
export function sOf(road, at) {
  const c = cumOf(road);
  const i = Math.min(at.i, c.length - 2);
  return c[i] + (c[i + 1] - c[i]) * at.t;
}

/** The point on a road's line nearest (x, z): { d (how far off), s (how far along), seg (which stretch) }. */
function nearestOn(road, x, z) {
  const p = road.pts;
  const c = cumOf(road);
  let best = { d: Infinity, s: 0, seg: 0 };
  for (let k = 0; k < p.length / 2 - 1; k++) {
    const ax = p[k * 2];
    const az = p[k * 2 + 1];
    const ex = p[k * 2 + 2] - ax;
    const ez = p[k * 2 + 3] - az;
    const L2 = ex * ex + ez * ez || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / L2));
    const d = Math.hypot(ax + ex * t - x, az + ez * t - z);
    if (d < best.d) best = { d, s: c[k] + Math.sqrt(L2) * t, seg: k };
  }
  return best;
}

/** The way a road heads (game yaw) at `s` m along it, going `dir`. */
function headingAt(road, s, dir) {
  const p = road.pts;
  const c = cumOf(road);
  let k = 0;
  while (k < c.length - 2 && c[k + 1] < s) k++;
  const ex = (p[k * 2 + 2] - p[k * 2]) * dir;
  const ez = (p[k * 2 + 3] - p[k * 2 + 1]) * dir;
  return Math.atan2(-ex, -ez);
}

/**
 * Do two ways through a box ({ pts: [x, z, …], hw }) come within reach of each other (their half widths
 * and `room` m between)?
 */
export function pathsMeet(a, b, room = 0.6) {
  const reach = a.hw + b.hw + room;
  const r2 = reach * reach;
  const p = a.pts;
  const q = b.pts;
  for (let i = 0; i < p.length; i += 2) {
    for (let j = 0; j < q.length; j += 2) {
      const dx = p[i] - q[j];
      const dz = p[i + 1] - q[j + 1];
      if (dx * dx + dz * dz < r2) return true;
    }
  }
  return false;
}

export class Junctions {
  /**
   * @param {Iterable<any>} roads the roads cars may drive ({ pts, width, oneway, cls, bridge })
   */
  constructor(roads) {
    this.list = [];
    /** per road: the junctions on it, by how far along it ({ j, s }) */
    this.byRoad = new Map();
    this.now = 0;
    this.live = new Set();
    this._build([...new Set(roads)]);
  }

  _build(roads) {
    // Every road end, on a grid.
    const CELL = 12;
    const key = (x, z) => `${Math.floor(x / CELL)}_${Math.floor(z / CELL)}`;
    const ends = [];
    const grid = new Map();
    for (const r of roads) {
      const m = r.pts.length / 2 - 1;
      for (const at of [0, m]) {
        const e = { r, x: r.pts[at * 2], z: r.pts[at * 2 + 1], last: at === m, id: ends.length };
        ends.push(e);
        const k = key(e.x, e.z);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(e);
      }
    }
    // (one stretch grid for the roads passing on through a point)
    const segs = new Map();
    for (const r of roads) {
      if (r.bridge) continue;
      const seen = new Set();
      const add = (x, z) => {
        const kk = key(x, z);
        if (seen.has(kk)) return;
        seen.add(kk);
        if (!segs.has(kk)) segs.set(kk, []);
        segs.get(kk).push(r);
      };
      // every cell along each stretch, not only at its points (a long straight has none in between)
      for (let k = 0; k < r.pts.length / 2; k++) {
        const x = r.pts[k * 2];
        const z = r.pts[k * 2 + 1];
        add(x, z);
        if (k === r.pts.length / 2 - 1) continue;
        const ex = r.pts[k * 2 + 2] - x;
        const ez = r.pts[k * 2 + 3] - z;
        const steps = Math.ceil(Math.hypot(ex, ez) / (CELL / 2));
        for (let s = 1; s < steps; s++) add(x + (ex * s) / steps, z + (ez * s) / steps);
      }
    }
    const near = (map, x, z) => {
      const out = [];
      const cx = Math.floor(x / CELL);
      const cz = Math.floor(z / CELL);
      for (let i = cx - 2; i <= cx + 2; i++) for (let j = cz - 2; j <= cz + 2; j++) for (const e of map.get(`${i}_${j}`) ?? []) out.push(e);
      return out;
    };
    // Ends a few metres apart: one point.
    const up = ends.map((_, i) => i);
    const find = (i) => (up[i] === i ? i : (up[i] = find(up[i])));
    for (const e of ends) for (const o of near(grid, e.x, e.z)) if (o.id > e.id && Math.hypot(o.x - e.x, o.z - e.z) < MEET) up[find(o.id)] = find(e.id);
    const groups = new Map();
    for (const e of ends) {
      const g = find(e.id);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(e);
    }
    // Each point where three ways or more meet: the road ends there, and the roads running on through it.
    const nodes = [];
    for (const g of groups.values()) {
      const x = g.reduce((a, e) => a + e.x, 0) / g.length;
      const z = g.reduce((a, e) => a + e.z, 0) / g.length;
      const touch = new Map();
      for (const e of g) {
        if (!touch.has(e.r)) touch.set(e.r, { r: e.r, ends: [] });
        touch.get(e.r).ends.push(e.last);
      }
      let ways = g.length;
      for (const r of new Set(near(segs, x, z))) {
        if (touch.has(r)) continue;
        const n = nearestOn(r, x, z);
        const len = cumOf(r)[cumOf(r).length - 1];
        if (n.d > Math.max(1.5, (r.width ?? 6) * 0.3) || n.s < 1 || n.s > len - 1) continue;
        touch.set(r, { r, ends: [], through: n.s });
        ways += 2;
      }
      if (ways < 3 || touch.size < 2) continue;
      const wide = Math.max(...[...touch.values()].map((t) => t.r.width ?? 6));
      nodes.push({ x, z, touch, wide, id: nodes.length });
    }
    // Points of one junction (a divided road's carriageways): joined.
    const nup = nodes.map((_, i) => i);
    const nfind = (i) => (nup[i] === i ? i : (nup[i] = nfind(nup[i])));
    const ngrid = new Map();
    for (const n of nodes) {
      const k = key(n.x, n.z);
      if (!ngrid.has(k)) ngrid.set(k, []);
      ngrid.get(k).push(n);
    }
    for (const n of nodes) for (const o of near(ngrid, n.x, n.z)) if (o.id > n.id && Math.hypot(o.x - n.x, o.z - n.z) < (n.wide + o.wide) / 2 + JOIN) nup[nfind(o.id)] = nfind(n.id);
    const joined = new Map();
    for (const n of nodes) {
      const g = nfind(n.id);
      if (!joined.has(g)) joined.set(g, []);
      joined.get(g).push(n);
    }
    for (const g of joined.values()) {
      const x = g.reduce((a, n) => a + n.x, 0) / g.length;
      const z = g.reduce((a, n) => a + n.z, 0) / g.length;
      const roadsHere = new Map();
      for (const n of g) for (const t of n.touch.values()) if (!roadsHere.has(t.r)) roadsHere.set(t.r, t);
      let spread = 0;
      for (const n of g) spread = Math.max(spread, Math.hypot(n.x - x, n.z - z));
      const half = Math.max(...[...roadsHere.values()].map((t) => (t.r.width ?? 6) / 2));
      const j = { id: this.list.length, x, z, r: Math.max(4.5, Math.min(22, spread + half + 1)), arms: [], holders: new Set(), waiting: new Map(), sig: null, ask: [-1e9, -1e9], come: [-1e9, -1e9], seen: 0 };
      // its arms: each road's way in
      for (const t of roadsHere.values()) {
        const r = t.r;
        const n = nearestOn(r, x, z);
        const len = cumOf(r)[cumOf(r).length - 1];
        const s = t.through ?? (n.s < len / 2 ? 0 : len);
        // (a road that ends here comes in going toward its end; one through it, either way — one-way, its own)
        const dirs = t.through != null ? (r.oneway ? [1] : [1, -1]) : s === 0 ? (r.oneway ? [] : [-1]) : [1];
        for (const dir of dirs) {
          const hd = headingAt(r, Math.max(0, Math.min(len, s - dir * 3)), dir);
          j.arms.push({ r, dir, hd, cls: r.cls ?? 4, group: 0 });
        }
        if (!this.byRoad.has(r)) this.byRoad.set(r, []);
        this.byRoad.get(r).push({ j, s });
      }
      // Lights where main roads cross: the ways in along the biggest road one green, those across it the other.
      const main = j.arms.filter((a) => a.cls <= 4);
      if (main.length >= 3) {
        const lead = main.reduce((a, b) => (b.cls < a.cls || (b.cls === a.cls && (b.r.width ?? 6) > (a.r.width ?? 6)) ? b : a));
        for (const a of j.arms) a.group = Math.abs(Math.sin(a.hd - lead.hd)) < 0.5 ? 0 : 1;
        if (j.arms.some((a) => a.group === 1) && j.arms.some((a) => a.group === 0)) j.sig = { g: Math.random() < 0.5 ? 0 : 1, state: 'green', t: Math.random() * SIGNAL.minGreen };
      }
      this.list.push(j);
    }
    for (const list of this.byRoad.values()) list.sort((a, b) => a.s - b.s);
  }

  /** The arm a vehicle on `road` going `dir` comes into junction `j` by (or undefined). */
  armOf(j, road, dir) {
    return j.arms.find((a) => a.r === road && a.dir === dir);
  }

  /**
   * The next junction along a road from `s` m going `dir` (one whose box it is still in counts): { j, d } —
   * d how far on its middle is (under 0: past it, still in its box) — or null within `reach` m.
   */
  ahead(road, s, dir, reach = 80, skip = null) {
    const list = this.byRoad.get(road);
    if (!list) return null;
    let best = null;
    for (const e of list) {
      if (e.j === skip) continue;
      const d = (e.s - s) * dir;
      if (d < -e.j.r || d > reach) continue;
      if (!best || d < best.d) best = { j: e.j, d };
    }
    return best;
  }

  /** How far along `road` junction `j`'s middle lies (or null if it isn't on it). */
  sOn(j, road) {
    return this.byRoad.get(road)?.find((e) => e.j === j)?.s ?? null;
  }

  /** Is the green on for this arm (always, at a junction without lights)? */
  green(j, arm) {
    if (!j.sig) return true;
    return j.sig.state === 'green' && j.sig.g === (arm?.group ?? 0);
  }

  /** The lights moving on: green → all-red → the other green, by who is waiting and who is coming. */
  tick(dt) {
    this.now += dt;
    for (const j of this.live) {
      if (this.now - j.seen > 6) {
        this.live.delete(j);
        continue;
      }
      const s = j.sig;
      if (!s) continue;
      s.t += dt;
      const other = 1 - s.g;
      if (s.state === 'green') {
        const asked = this.now - j.ask[other] < 1;
        const coming = this.now - j.come[s.g] < 1.5;
        if (asked && (s.t >= SIGNAL.maxGreen || (s.t >= SIGNAL.minGreen && !coming))) {
          s.state = 'clear';
          s.t = 0;
        }
      } else if (s.t >= SIGNAL.clear) {
        s.state = 'green';
        s.g = other;
        s.t = 0;
      }
    }
  }

  /** Someone is coming to `j` by `arm` (and, `waiting`, held at its line): keeps its lights working. */
  touch(j, arm, waiting) {
    j.seen = this.now;
    this.live.add(j);
    const g = arm?.group ?? 0;
    if (waiting) j.ask[g] = this.now;
    else j.come[g] = this.now;
  }
}
