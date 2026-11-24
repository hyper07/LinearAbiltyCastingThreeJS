/**
 * A layered walking grid for the Great Tree: one grid per ring, because a
 * ring may pass right over another. A cell of a layer is open if that ring
 * has a deck or bridge there (or the stair passes there on that layer's
 * half), it is not too near an edge, not in a building, and not locked.
 *
 * A walker steps to a neighbouring cell on its own layer, or onto the layer
 * above or below where the stair crosses from one to the next (the height
 * barely changes there; everywhere else the rings are a whole storey apart,
 * so the height check alone keeps them apart).
 *
 * Same API as layout.js buildNavGrid, with heights: findPath([x, z, y],
 * [x, z, y]) → [[x, z, y], …], canStep(fx, fz, tx, tz, y), nearestOpen(x, z, y).
 */
const lerp = (a, b, t) => a + (b - a) * t;

export function buildLayerNav(plan, { cell = 0.8, locked = () => false, blockers = [] } = {}) {
  const { x0, x1, z0, z1 } = plan.navBounds;
  const w = Math.ceil((x1 - x0) / cell), d = Math.ceil((z1 - z0) / cell);
  const L = plan.layers;
  const N = w * d;
  const h = new Float32Array(N * L).fill(-1e4);
  const open = new Uint8Array(N * L);
  const floorOf = new Uint8Array(N * L);
  for (let j = 0; j < d; j++) {
    for (let i = 0; i < w; i++) {
      const x = x0 + (i + 0.5) * cell, z = z0 + (j + 0.5) * cell;
      const list = plan.surfaces(x, z);
      if (!list.length) continue;
      for (const s of list) {
        const id = s.layer * N + j * w + i;
        // Two surfaces of one layer at a spot (a deck and its bridge's mouth): keep the roomier one.
        if (h[id] > -1e3 && open[id]) continue;
        h[id] = s.y;
        floorOf[id] = s.floor;
        let ok = s.edge > plan.margin(s);
        if (s.stair && locked(s.stair.to)) ok = false;
        if (s.floor && locked(s.floor)) ok = false;
        if (ok && blockers.some((b) => (b.y == null || Math.abs(b.y - s.y) < 3) && Math.hypot(x - b.x, z - b.z) < b.r)) ok = false;
        open[id] = ok ? 1 : 0;
      }
    }
  }

  const stepOk = (a, b) => Math.abs(h[a] - h[b]) < cell * 0.95;
  const toCell = (x, z) => [Math.floor((x - x0) / cell), Math.floor((z - z0) / cell)];
  const centre = (i, j) => [x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell];
  const inGrid = (i, j) => i >= 0 && j >= 0 && i < w && j < d;
  const isOpen = (l, i, j) => l >= 0 && l < L && inGrid(i, j) && open[l * N + j * w + i] === 1;

  /** The layer a point at height y is on: the surface nearest to y (an open one if two are as near). */
  function layerAt(i, j, y) {
    let best = -1, bd = Infinity;
    for (let l = 0; l < L; l++) {
      const id = l * N + j * w + i;
      if (h[id] < -1e3) continue;
      const dd = Math.abs(h[id] - (y ?? h[id])) - (open[id] ? 0.5 : 0);
      if (dd < bd) {
        bd = dd;
        best = l;
      }
    }
    if (best >= 0) return best;
    // Thin air: the layer whose rings are nearest that height.
    return Math.max(0, Math.min(L - 1, Math.round((y ?? 0) / (plan.floorH ?? 12))));
  }

  /** The nearest open cell on a point's layer: [layer, i, j] or null. */
  function nearestCell(x, z, y, reach = 10) {
    const [ci, cj] = toCell(x, z);
    const l = inGrid(ci, cj) ? layerAt(ci, cj, y) : Math.max(0, Math.min(L - 1, Math.round((y ?? 0) / (plan.floorH ?? 12))));
    if (isOpen(l, ci, cj)) return [l, ci, cj];
    for (let r = 1; r <= reach; r++) {
      let best = null, bd = Infinity;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !isOpen(l, ci + di, cj + dj)) continue;
        const dd = di * di + dj * dj;
        if (dd < bd) {
          bd = dd;
          best = [l, ci + di, cj + dj];
        }
      }
      if (best) return best;
    }
    return null;
  }

  const came = new Int32Array(N * L);
  const closed = new Uint8Array(N * L);
  const cost = new Float32Array(N * L);
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

  /** A* from a point to a point; the path as [[x, z, y], …], straightened. Null if there is none. */
  function findPath(from, to) {
    const s = nearestCell(from[0], from[1], from[2], 4), g = nearestCell(to[0], to[1], to[2] ?? from[2], 12);
    if (!s || !g) return null;
    const start = s[0] * N + s[2] * w + s[1], goal = g[0] * N + g[2] * w + g[1];
    came.fill(-1);
    closed.fill(0);
    cost.fill(Infinity);
    const heap = [[0, start]];
    cost[start] = 0;
    const gx = g[1], gz = g[2];
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
    let found = false, guard = 0;
    while (heap.length && guard++ < 600000) {
      const [, cur] = pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === goal) {
        found = true;
        break;
      }
      const cl = Math.floor(cur / N), rest = cur - cl * N;
      const ci = rest % w, cj = (rest / w) | 0;
      for (const [di, dj, c] of dirs) {
        const ni = ci + di, nj = cj + dj;
        for (const nl of [cl, cl + 1, cl - 1]) {
          if (!isOpen(nl, ni, nj)) continue;
          const nIdx = nl * N + nj * w + ni;
          if (closed[nIdx]) continue;
          if (di && dj && (!isOpen(nl, ci + di, cj) || !isOpen(nl, ci, cj + dj))) continue;
          if (!stepOk(cur, nIdx)) continue;
          const nc = cost[cur] + c;
          if (nc < cost[nIdx]) {
            cost[nIdx] = nc;
            came[nIdx] = cur;
            push([nc + Math.hypot(ni - gx, nj - gz), nIdx]);
          }
        }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = goal; c !== -1; c = came[c]) cells.push(c);
    cells.reverse();
    const info = cells.map((c) => {
      const l = Math.floor(c / N), rest = c - l * N;
      const [x, z] = centre(rest % w, (rest / w) | 0);
      return { l, x, z, y: h[c] };
    });
    // Straighten: skip cells while a straight line between stays open and level on one layer.
    const clear = (a, b) => {
      if (a.l !== b.l) return false;
      const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (cell * 0.5));
      let prev = null;
      for (let k = 0; k <= n; k++) {
        const [i, j] = toCell(lerp(a.x, b.x, k / n), lerp(a.z, b.z, k / n));
        if (!isOpen(a.l, i, j)) return false;
        const idx = a.l * N + j * w + i;
        if (prev != null && prev !== idx && !stepOk(prev, idx)) return false;
        prev = idx;
      }
      return true;
    };
    const out = [info[0]];
    let anchor = 0;
    for (let k = 2; k < info.length; k++) {
      if (!clear(info[anchor], info[k])) {
        out.push(info[k - 1]);
        anchor = k - 1;
      }
    }
    out.push(info.at(-1));
    return out.map((p) => [p.x, p.z, p.y]);
  }

  /**
   * May a walker at height y step from one point to another (WASD)? Only onto an
   * open cell about as high as where they stand — never up or down to another ring,
   * even when standing on a closed cell (a rim, by a building) to walk out of it.
   */
  function canStep(fx, fz, tx, tz, y) {
    const a = toCell(fx, fz), b = toCell(tx, tz);
    if (!inGrid(a[0], a[1]) || !inGrid(b[0], b[1])) return false;
    const la = layerAt(a[0], a[1], y);
    const from = la * N + a[1] * w + a[0];
    const fromY = h[from] > -1e3 ? h[from] : y ?? 0;
    for (const lb of [la, la + 1, la - 1]) {
      if (!isOpen(lb, b[0], b[1])) continue;
      const to = lb * N + b[1] * w + b[0];
      if (Math.abs(h[to] - fromY) < cell * 0.95 && (y == null || Math.abs(h[to] - y) < 2)) return true;
    }
    return false;
  }

  return {
    findPath,
    canStep,
    nearestOpen: (x, z, y) => {
      const c = nearestCell(x, z, y);
      return c && centre(c[1], c[2]);
    },
    layered: true,
    w, d, cell, x0, z0, open, floorOf, h, layers: L
  };
}
