/**
 * How high every street lies: one level for each point along it, flat from side to side.
 *
 * The roads (roads.bin) and the small streets (alleys.bin) are one network: where they meet they share a
 * point (or an alley's end comes out onto a road between its points: joined there). Each point gets a
 * level that every street through it agrees on:
 *
 *   - never under the land anywhere across the street and its pavements (the land never pokes up through
 *     a street; where the hillside falls away beside it, the street stands on a retaining wall over it —
 *     a drop you can ride off);
 *   - as even along the street as it can be without standing more than `band` metres over the land: each
 *     point eased toward its neighbours (a climb spread out, its bumps and kinks gone) and held a little
 *     toward the land (`pull`: on the flat it stays down on it). Seoul's hill roads climb more steeply than
 *     a gentle grade for hundreds of metres at a time — held to 8 %, Namsan's and Bugaksan's roads stood
 *     30–80 m over the land — so a long steep climb stays steep, only smoothed;
 *   - flat where streets meet: every point of every street within reach of a junction (over the crossing
 *     street's width and pavement) is one level, the junction's plate, the streets easing into it.
 *
 * The level is the land's height a street is laid over (SeoulGame lays the road slab 0.9 m over it, a
 * bridge's deck its lift higher still).
 *
 *   joinEnds(lines)                 // an alley's loose end joined to the road it comes out onto
 *   levelNetwork(lines, ground)     // lines: { xz, at, keys, half, reach, pave } — sets each line's `h`
 */

/** How far over the land a street may stand to even out its climbs, metres. */
export const BAND = 10;
/** How hard a street is held to the land (against easing toward its neighbours). */
export const PULL = 0.001;

/** Compressed adjacency from an edge list (a, b, len), both ways. */
function adjacency(n, ea, eb, el) {
  const deg = new Int32Array(n + 1);
  for (let k = 0; k < ea.length; k++) {
    deg[ea[k]]++;
    deg[eb[k]]++;
  }
  const start = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) start[i + 1] = start[i] + deg[i];
  const fill = start.slice(0, n);
  const to = new Int32Array(start[n]);
  const len = new Float64Array(start[n]);
  for (let k = 0; k < ea.length; k++) {
    to[fill[ea[k]]] = eb[k];
    len[fill[ea[k]]++] = el[k];
    to[fill[eb[k]]] = ea[k];
    len[fill[eb[k]]++] = el[k];
  }
  return { start, to, len };
}

/** A point added to a line (xz, at, keys, and vert if it has it) `d` metres along it, unless one is within `gap` metres. */
export function insertAt(line, d, key = null, gap = 0.5) {
  const { xz, at, keys } = line;
  const L = at[at.length - 1];
  if (d <= gap || d >= L - gap) return -1;
  let i = 1;
  while (i < at.length && at[i] < d) i++;
  if (at[i] - d < gap) {
    if (key != null && keys[i] == null) keys[i] = key;
    return i;
  }
  if (d - at[i - 1] < gap) {
    if (key != null && keys[i - 1] == null) keys[i - 1] = key;
    return i - 1;
  }
  const t = (d - at[i - 1]) / (at[i] - at[i - 1]);
  xz.splice(i * 2, 0, xz[i * 2 - 2] + (xz[i * 2] - xz[i * 2 - 2]) * t, xz[i * 2 - 1] + (xz[i * 2 + 1] - xz[i * 2 - 1]) * t);
  at.splice(i, 0, d);
  keys.splice(i, 0, key);
  // (the original points' indices, if it keeps them, move up past it)
  if (line.vert) for (let k = 0; k < line.vert.length; k++) if (line.vert[k] >= i) line.vert[k]++;
  return i;
}

/**
 * Join each street's loose ends to the street they come out onto between its points (an alley's end on a
 * road's side): a point put in that street there, sharing the end's key. `cell`: the search grid's size.
 */
export function joinEnds(lines, cell = 60) {
  const count = new Map();
  for (const l of lines) for (const k of l.keys) if (k != null) count.set(k, (count.get(k) ?? 0) + 1);
  const grid = new Map();
  lines.forEach((l, w) => {
    for (let i = 1; i < l.at.length; i++) {
      const cx = Math.floor((l.xz[i * 2 - 2] + l.xz[i * 2]) / 2 / cell);
      const cz = Math.floor((l.xz[i * 2 - 1] + l.xz[i * 2 + 1]) / 2 / cell);
      const g = `${cx}_${cz}`;
      if (!grid.has(g)) grid.set(g, []);
      grid.get(g).push(w, i);
    }
  });
  const adds = [];
  lines.forEach((l, w) => {
    const n = l.at.length;
    for (const i of [0, n - 1]) {
      const key = l.keys[i];
      if (key != null && count.get(key) > 1) continue;
      const x = l.xz[i * 2];
      const z = l.xz[i * 2 + 1];
      let best = null;
      const cx = Math.floor(x / cell);
      const cz = Math.floor(z / cell);
      for (let a = cx - 1; a <= cx + 1; a++) {
        for (let b = cz - 1; b <= cz + 1; b++) {
          const list = grid.get(`${a}_${b}`);
          if (!list) continue;
          for (let q = 0; q < list.length; q += 2) {
            const o = list[q];
            if (o === w) continue;
            const L = lines[o];
            const j = list[q + 1];
            const ax = L.xz[j * 2 - 2];
            const az = L.xz[j * 2 - 1];
            const dx = L.xz[j * 2] - ax;
            const dz = L.xz[j * 2 + 1] - az;
            const len2 = dx * dx + dz * dz || 1e-9;
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
            const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
            // (out onto it: within its width and a little)
            if (d > L.half + 1.5 || (best && d >= best.d)) continue;
            best = { o, d, along: L.at[j - 1] + (L.at[j] - L.at[j - 1]) * t };
          }
        }
      }
      if (!best) continue;
      const k = key ?? `j${w}|${i}`;
      l.keys[i] = k;
      adds.push([best.o, best.along, k]);
    }
  });
  // (two keys for one point: the end's and the one already there — the end takes that one)
  const alias = new Map();
  const canon = (k) => {
    while (alias.has(k)) k = alias.get(k);
    return k;
  };
  for (const [o, along, k] of adds) {
    const L = lines[o];
    const j = insertAt(L, along, k, 0.3);
    // (at its very end: that end is the junction)
    const at = j < 0 ? (along < L.at[L.at.length - 1] / 2 ? 0 : L.at.length - 1) : j;
    if (L.keys[at] == null) L.keys[at] = k;
    else if (canon(L.keys[at]) !== canon(k)) alias.set(canon(k), canon(L.keys[at]));
  }
  if (alias.size) for (const l of lines) for (let q = 0; q < l.keys.length; q++) if (l.keys[q] != null) l.keys[q] = canon(l.keys[q]);
}

/**
 * Level a network of streets. Each line: `xz` (x, z pairs, points no more than ~10 m apart), `at` (metres
 * along each), `keys` (the same key where streets share a point, else null), `half` (half its width),
 * `reach` (how far out from its middle must be clear of the land: its pavements), `pave` (how far past its
 * edge a street crossing it stays level: its pavement). Sets each line's `h` (Float64Array, a level per point).
 * `ground(x, z)`: the land's height.
 */
export function levelNetwork(lines, ground, { band = BAND, pull = PULL, smooth = 240, plateMax = 18 } = {}) {
  // Junctions: a key three or more ways leave from (two is a street carrying on as another).
  const ways = new Map();
  const add = (k, w) => {
    let s = ways.get(k);
    if (!s) ways.set(k, (s = { n: 0, lines: new Set() }));
    s.n++;
    s.lines.add(w);
  };
  lines.forEach((l, w) => {
    const n = l.at.length;
    l.keys.forEach((k, i) => {
      if (k == null) return;
      // (an end is one way out of the point; a point in the middle, two)
      add(k, w);
      if (i > 0 && i < n - 1) add(k, w);
    });
  });
  // Each junction's plate on each street through it: as far along it as the widest other street's half and pavement.
  const plates = [];
  lines.forEach((l, w) => {
    l.keys.forEach((k, i) => {
      const s = k != null ? ways.get(k) : null;
      if (!s || s.n < 3) return;
      let R = 0;
      for (const o of s.lines) if (o !== w) R = Math.max(R, lines[o].half + lines[o].pave);
      // (a street meeting itself: its own width)
      if (R === 0) R = l.half + l.pave;
      plates.push([w, l.at[i], Math.min(plateMax, R), k]);
    });
  });
  // (a point at each plate's edges, so a street is level right to the plate's edge and climbs from there)
  for (const [w, a, R] of plates) {
    insertAt(lines[w], a - R, null, 0.5);
    insertAt(lines[w], a + R, null, 0.5);
  }
  // Nodes: one per key, one per other point.
  const ids = new Map();
  let n = 0;
  const node = lines.map((l) =>
    l.keys.map((k) => {
      if (k == null) return n++;
      let id = ids.get(k);
      if (id == null) ids.set(k, (id = n++));
      return id;
    })
  );
  // Plates: every point within one is the junction's node (union-find).
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (i) => {
    while (parent[i] !== i) i = parent[i] = parent[parent[i]];
    return i;
  };
  const unite = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (const [w, a, R, k] of plates) {
    const l = lines[w];
    const J = ids.get(k);
    for (let i = 0; i < l.at.length; i++) if (Math.abs(l.at[i] - a) <= R + 0.01) unite(node[w][i], J);
  }
  // Compact the roots.
  const root = new Int32Array(n);
  const slot = new Int32Array(n).fill(-1);
  let m = 0;
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (slot[r] < 0) slot[r] = m++;
    root[i] = slot[r];
  }
  // The floor: the land's highest across each street and its pavements (and halfway to the next point).
  const floor = new Float64Array(m).fill(-Infinity);
  const ea = [];
  const eb = [];
  const el = [];
  lines.forEach((l, w) => {
    const N = l.at.length;
    const { xz, reach } = l;
    for (let i = 0; i < N; i++) {
      const p = Math.max(0, i - 1);
      const q = Math.min(N - 1, i + 1);
      const dx = xz[q * 2] - xz[p * 2];
      const dz = xz[q * 2 + 1] - xz[p * 2 + 1];
      const len = Math.hypot(dx, dz) || 1;
      const rx = dz / len;
      const rz = -dx / len;
      let top = -Infinity;
      const at = (x, z) => {
        for (const o of [-1, -0.5, 0, 0.5, 1]) top = Math.max(top, ground(x + rx * reach * o, z + rz * reach * o));
      };
      at(xz[i * 2], xz[i * 2 + 1]);
      if (i < N - 1) at((xz[i * 2] + xz[i * 2 + 2]) / 2, (xz[i * 2 + 1] + xz[i * 2 + 3]) / 2);
      if (i > 0) at((xz[i * 2] + xz[i * 2 - 2]) / 2, (xz[i * 2 + 1] + xz[i * 2 - 1]) / 2);
      const r = root[node[w][i]];
      floor[r] = Math.max(floor[r], top);
      if (i > 0) {
        const a = root[node[w][i - 1]];
        if (a !== r) {
          ea.push(a);
          eb.push(r);
          el.push(Math.max(0.05, l.at[i] - l.at[i - 1]));
        }
      }
    }
  });
  const adj = adjacency(m, ea, eb, el);
  // Within a band over the floor (never under the land, never more than `band` metres over it), as even as
  // it can be: each point eased to its neighbours' mean (weighted by how near they are) and kept in the
  // band, over and over — a climb spread out as far as the band lets it, its bumps and kinks gone.
  const h = Float64Array.from(floor);
  const wsum = new Float64Array(m);
  const wgt = new Float64Array(adj.to.length);
  for (let i = 0; i < m; i++) {
    for (let e = adj.start[i]; e < adj.start[i + 1]; e++) {
      wgt[e] = 1 / Math.max(2, adj.len[e]);
      wsum[i] += wgt[e];
    }
  }
  // (a dead end — a cul-de-sac, a street cut off at the map's edge — sits on its land: left free, it lay as
  // flat as its neighbour, and a dead end at the foot of a climb stood the whole band over the land)
  const pass = (top, k) => {
    for (let i = 0; i < m; i++) {
      if (!wsum[i]) continue;
      if (adj.start[i + 1] - adj.start[i] < 2) {
        h[i] = floor[i];
        continue;
      }
      let s = 0;
      for (let e = adj.start[i]; e < adj.start[i + 1]; e++) s += h[adj.to[e]] * wgt[e];
      const v = h[i] + ((s + pull * floor[i]) / (wsum[i] + pull) - h[i]) * k;
      const c = Math.max(floor[i], Math.min(floor[i] + top, v));
      moved = Math.max(moved, Math.abs(c - h[i]));
      h[i] = c;
    }
  };
  let moved = 0;
  let iterations = 0;
  for (; iterations < smooth; iterations++) {
    moved = 0;
    pass(band, 1.7);
    // (settled to the centimetre)
    if (moved < 0.01) break;
  }
  // (and the kinks where it touched the band's top eased off, a little over it)
  for (let it = 0; it < 8; it++) pass(band + 1.5, 1);
  lines.forEach((l, w) => {
    l.h = Float64Array.from(node[w], (id) => h[root[id]]);
  });
  return { nodes: m, plates: plates.length, iterations };
}
