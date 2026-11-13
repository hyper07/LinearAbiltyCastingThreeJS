/**
 * Flow fields: for one goal, every cell's walking distance to it. A whole
 * group shares one field (one search, not one per unit), and each unit just
 * steps toward its lowest neighbour. Fields are kept (least recently used
 * goes first) and thrown away whenever the walls change (a building goes up
 * or comes down, a crystal runs out).
 */

const SQRT2 = Math.SQRT2;
const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2]
];

export class FlowFields {
  /**
   * @param {number} n the grid's width and height in cells
   * @param {(i: number) => boolean} passable
   */
  constructor(n, passable, { keep = 48 } = {}) {
    this.n = n;
    this.passable = passable;
    this.keep = keep;
    this.cache = new Map();
    this.heapIdx = new Int32Array(n * n * 2);
    this.heapKey = new Float32Array(n * n * 2);
    this.searches = 0;
  }

  /** The walls changed: every field is stale. */
  reset() {
    this.cache.clear();
  }

  /**
   * The distance field toward `goals` (cell indices). `key` names the goal so
   * the field can be shared; the same key is the same field until reset().
   */
  field(key, goals) {
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit);
      return hit;
    }
    const dist = this.search(typeof goals === 'function' ? goals() : goals);
    this.cache.set(key, dist);
    if (this.cache.size > this.keep) this.cache.delete(this.cache.keys().next().value);
    return dist;
  }

  search(goals) {
    this.searches++;
    const n = this.n;
    const dist = new Float32Array(n * n).fill(Infinity);
    const idx = this.heapIdx;
    const key = this.heapKey;
    let size = 0;
    const push = (i, d) => {
      let at = size++;
      while (at > 0) {
        const up = (at - 1) >> 1;
        if (key[up] <= d) break;
        idx[at] = idx[up];
        key[at] = key[up];
        at = up;
      }
      idx[at] = i;
      key[at] = d;
    };
    const pop = () => {
      const top = idx[0];
      const last = --size;
      const li = idx[last];
      const ld = key[last];
      let at = 0;
      for (;;) {
        let child = at * 2 + 1;
        if (child >= size) break;
        if (child + 1 < size && key[child + 1] < key[child]) child++;
        if (key[child] >= ld) break;
        idx[at] = idx[child];
        key[at] = key[child];
        at = child;
      }
      idx[at] = li;
      key[at] = ld;
      return top;
    };
    for (const g of goals) {
      if (g < 0 || g >= n * n || dist[g] === 0) continue;
      dist[g] = 0;
      push(g, 0);
    }
    while (size > 0) {
      const d0 = key[0];
      const i = pop();
      if (d0 > dist[i]) continue;
      const x = i % n;
      const z = (i / n) | 0;
      for (const [dx, dz, cost] of DIRS) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
        const j = nz * n + nx;
        if (!this.passable(j)) continue;
        // No cutting a corner between two walls.
        if (dx && dz && (!this.passable(z * n + nx) || !this.passable(nz * n + x))) continue;
        const nd = d0 + cost;
        if (nd < dist[j]) {
          dist[j] = nd;
          if (size < idx.length) push(j, nd);
        }
      }
    }
    return dist;
  }

  /**
   * The next cell to walk to from cell `i` on `dist`, or -1 at the goal (or
   * nowhere to go). From inside a wall (a unit pushed into one), it walks out.
   */
  next(dist, i) {
    const n = this.n;
    const x = i % n;
    const z = (i / n) | 0;
    const inside = !this.passable(i);
    let best = -1;
    let bestD = inside ? Infinity : dist[i];
    for (const [dx, dz] of DIRS) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= n || nz >= n) continue;
      const j = nz * n + nx;
      if (!inside && dx && dz && (!this.passable(z * n + nx) || !this.passable(nz * n + x))) continue;
      if (dist[j] < bestD) {
        bestD = dist[j];
        best = j;
      }
    }
    return best;
  }
}
