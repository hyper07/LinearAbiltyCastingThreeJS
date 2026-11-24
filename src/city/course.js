/**
 * Race courses on Seoul's real roads. A course is planned, not drawn: four
 * points are set round a famous place, each is moved onto the nearest big
 * road, and the course goes from each to the next by the best way on the
 * road network — big roads preferred, no street used twice — closing into a
 * loop. The same roads always give the same course, so everyone in a race
 * plans the same one without it being sent.
 *
 * A road here is { pts: Float32Array [x0, z0, x1, z1, …], width, cls } in
 * world metres (x east, z south), as SeoulGame reads them from roads.bin.
 */

/**
 * The bike courses: short loops (1.5–3 km, two to four minutes a race) round
 * Seoul neighbourhoods where the small streets are — hanok alleys, printing
 * lanes, workshop streets, market lanes — so a race goes from a busy road
 * full of traffic into a golmok barely wider than the handlebars and out
 * again. Centres are world metres from City Hall; `r` is how far out the loop
 * is drawn. The small streets come from alleys.bin (scripts/geo/seoul-alleys.mjs);
 * without it the loops keep to the bigger roads.
 */
export const BIKE_COURSES = [
  { id: 'ikseon', name: 'Ikseon Hanok Lanes', ko: '익선동', x: 1111, z: -802, r: 330, text: 'Tiled roofs and lanes one bike wide, out onto Jongno with its buses and back in.' },
  { id: 'euljiro', name: 'Euljiro Print Alleys', ko: '을지로', x: 1287, z: -25, r: 330, text: 'Print shops, delivery scooters and stacked paper in alleys behind the big road.' },
  { id: 'seochon', name: 'Seochon Backstreets', ko: '서촌', x: -656, z: -1468, r: 320, text: 'West of the palace: old houses, steep little lanes and narrow pavements.' },
  { id: 'yeonnam', name: 'Yeonnam Cafe Loop', ko: '연남동', x: -4809, z: 416, r: 340, text: 'Cafes, wires overhead and people everywhere along the park.' },
  { id: 'seongsu', name: 'Seongsu Workshops', ko: '성수동', x: 6855, z: 2438, r: 340, text: 'Brick workshops turned cafes, loading lorries and wide crossings.' },
  { id: 'mullae', name: 'Mullae Ironworks', ko: '문래동', x: -7377, z: 5575, r: 330, text: 'Metal shops and shutters, sparks and tight corners between them.' },
  { id: 'haebangchon', name: 'Haebangchon Hill', ko: '해방촌', x: 801, z: 2417, r: 320, text: 'Up the hill under the tower and down again: steep alleys, brakes on.' }
];
/** Kept for anything that still asks for "the courses". */
export const COURSES = BIKE_COURSES;

/** How much a metre of each class of road costs a car: big roads are preferred, small ones avoided. */
const COST = [0.75, 0.7, 0.8, 1.0, 1.6, 4, 9, 9];
/**
 * …and a bike: never the motorway, rarely the trunk roads; the small streets
 * a little cheaper than the big ones, so a loop goes in and out of them.
 */
export const BIKE_COST = [Infinity, 2.4, 1.3, 1.0, 0.92, 0.8, 0.74, 0.86];
/** Small streets: what a course point's class says it is (5 residential, 6 alley, 7 pedestrian). */
export const isSmall = (cls) => cls >= 5;
const key = (x, z) => `${Math.round(x * 2)}|${Math.round(z * 2)}`;

/** The road network near a place, as a graph: nodes where roads' points are, edges along them. */
export function buildGraph(roads, cx, cz, reach, costs = COST) {
  const nodes = [];
  const index = new Map();
  const node = (x, z) => {
    const k = key(x, z);
    let id = index.get(k);
    if (id == null) {
      id = nodes.length;
      index.set(k, id);
      nodes.push({ x, z, adj: [], cls: 9, width: 0 });
    }
    return id;
  };
  for (const r of roads) {
    if (!Number.isFinite(costs[r.cls] ?? 1.4)) continue;
    const n = r.pts.length / 2;
    let prev = null;
    for (let i = 0; i < n; i++) {
      const x = r.pts[i * 2];
      const z = r.pts[i * 2 + 1];
      if (Math.abs(x - cx) > reach || Math.abs(z - cz) > reach) {
        prev = null;
        continue;
      }
      const id = node(x, z);
      nodes[id].cls = Math.min(nodes[id].cls, r.cls);
      nodes[id].width = Math.max(nodes[id].width, r.width);
      if (prev != null && prev !== id) {
        const a = nodes[prev];
        const b = nodes[id];
        const len = Math.hypot(a.x - b.x, a.z - b.z);
        const cost = len * (costs[r.cls] ?? 1.4);
        a.adj.push({ to: id, len, cost, width: r.width, cls: r.cls });
        b.adj.push({ to: prev, len, cost, width: r.width, cls: r.cls });
      }
      prev = id;
    }
  }
  return nodes;
}

/** A small heap for the search. */
class Heap {
  constructor() {
    this.a = [];
  }
  push(item, p) {
    const a = this.a;
    a.push([p, item]);
    for (let i = a.length - 1; i > 0; ) {
      const j = (i - 1) >> 1;
      if (a[j][0] <= a[i][0]) break;
      [a[i], a[j]] = [a[j], a[i]];
      i = j;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top?.[1];
  }
  get size() {
    return this.a.length;
  }
}

/** The best way from one node to another; `used` edges (from earlier legs) cost far more, so a loop doesn't double back. */
function path(nodes, from, to, used) {
  const dist = new Float64Array(nodes.length).fill(Infinity);
  const prev = new Int32Array(nodes.length).fill(-1);
  const heap = new Heap();
  dist[from] = 0;
  heap.push(from, 0);
  while (heap.size) {
    const u = heap.pop();
    if (u === to) break;
    for (const e of nodes[u].adj) {
      const penalty = used.has(`${u}>${e.to}`) || used.has(`${e.to}>${u}`) ? 25 : 1;
      const d = dist[u] + e.cost * penalty;
      if (d < dist[e.to]) {
        dist[e.to] = d;
        prev[e.to] = u;
        heap.push(e.to, d);
      }
    }
  }
  if (!Number.isFinite(dist[to])) return null;
  const out = [to];
  while (out[0] !== from) out.unshift(prev[out[0]]);
  return out;
}

/**
 * The node on a big road nearest a point (the biggest road class found within reach wins);
 * for a bike, a junction on any street but the biggest roads.
 */
function snap(nodes, x, z, reach, bike = false) {
  let best = -1;
  let bestScore = Infinity;
  nodes.forEach((n, i) => {
    if (n.adj.length < (bike ? 3 : 2)) return;
    const d = Math.hypot(n.x - x, n.z - z);
    if (d > reach) return;
    const score = bike ? d + (n.cls <= 1 ? 250 : 0) : d + n.cls * 90;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/** Evenly spaced points along a polyline, every `step` metres. */
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az, aw] = pts[i - 1];
    const [bx, bz, bw, bc] = pts[i];
    const len = Math.hypot(bx - ax, bz - az);
    let t = step - carry;
    while (t <= len) {
      out.push(bc == null ? [ax + ((bx - ax) * t) / len, az + ((bz - az) * t) / len, Math.max(aw, bw)] : [ax + ((bx - ax) * t) / len, az + ((bz - az) * t) / len, bw, bc]);
      t += step;
    }
    carry = len - (t - step);
  }
  return out;
}

/**
 * Cut hairpins out of a loop of points: where it turns right round (up one
 * side of a divided road and back down the other), trim back both ways while
 * the two sides run close together, and join the ends.
 */
function cutHairpins(points) {
  const pts = points.slice();
  const heading = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
  for (let guard = 0; guard < 50; guard++) {
    const n = pts.length;
    let pin = -1;
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 2 + n) % n];
      const b = pts[i];
      const c = pts[(i + 2) % n];
      const t = heading(b, c) - heading(a, b);
      if (Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) > 2.3) {
        pin = i;
        break;
      }
    }
    if (pin < 0 || n < 40) break;
    let k = 1;
    while (k < n / 4 && Math.hypot(pts[(pin - k + n) % n][0] - pts[(pin + k) % n][0], pts[(pin - k + n) % n][1] - pts[(pin + k) % n][1]) < 30) k++;
    // Drop pin−k+1 … pin+k−1 (going round the loop's end if need be).
    const drop = new Set();
    for (let d = -k + 1; d <= k - 1; d++) drop.add((pin + d + n) % n);
    const kept = pts.filter((_, i) => !drop.has(i));
    pts.length = 0;
    pts.push(...kept);
  }
  return pts;
}

/**
 * Plan a course round a place. Returns { points: [[x, z, width]], s (distance
 * at each point), length } or null when no loop could be made there.
 *
 * With `bike` (the bike race): the loop is short (1.4–3.4 km, about 2.3 wanted),
 * never on a motorway, goes through the small streets where it can and each
 * point also says what it is on: [x, z, width, class] (5+ is a small street).
 */
export function planCourse(roads, def, { step = 6, why = null, bike = false, target = def.target ?? (bike ? 2300 : 4200) } = {}) {
  const nodes = buildGraph(roads, def.x, def.z, def.r * (def.reach ?? 3), bike ? BIKE_COST : COST);
  let best = null;
  for (const turn of [Math.PI / 4, 0, Math.PI / 8, (3 * Math.PI) / 8, Math.PI / 6]) {
    for (const scale of [0.45, 0.6, 0.8, 1, 1.25]) {
      const R = def.r * scale;
      const anchors = [0, 1, 2, 3].map((k) => snap(nodes, def.x + Math.cos(turn + (k * Math.PI) / 2) * R, def.z + Math.sin(turn + (k * Math.PI) / 2) * R, bike ? Math.max(120, R * 0.7) : Math.max(250, R * 0.9), bike));
      if (anchors.some((a) => a < 0) || new Set(anchors).size < 4) {
        why?.push(`anchors ${anchors}`);
        continue;
      }
      const used = new Set();
      const route = [anchors[0]];
      let ok = true;
      for (let k = 0; k < 4; k++) {
        const leg = path(nodes, anchors[k], anchors[(k + 1) % 4], used);
        if (!leg) {
          why?.push(`no way ${k}`);
          ok = false;
          break;
        }
        for (let i = 1; i < leg.length; i++) {
          used.add(`${leg[i - 1]}>${leg[i]}`);
          route.push(leg[i]);
        }
      }
      if (!ok) continue;
      // Cut out spurs — out along a street and straight back the same way (a dead end, or round an
      // anchor): a race must never turn round on itself. The route is a loop, so look round the join too.
      const loop = route.slice(0, -1);
      for (let guard = 0; guard < loop.length * 2 && loop.length > 8; guard++) {
        const m = loop.length;
        const at = loop.findIndex((id, i) => loop[(i + 2) % m] === id);
        if (at < 0) break;
        const drop = [(at + 1) % m, (at + 2) % m].sort((x, y) => y - x);
        for (const d of drop) loop.splice(d, 1);
      }
      route.length = 0;
      route.push(...loop, loop[0]);
      // Each point: where it is, and (for a bike) the width and class of the street that leads to it.
      const edge = (a, b) => nodes[a].adj.find((e) => e.to === b);
      const pts = route.map((id, i) => {
        if (!bike) return [nodes[id].x, nodes[id].z, nodes[id].width || 10];
        const e = edge(route[Math.max(0, i - 1)], route[Math.max(1, i)]) ?? edge(route[i], route[i + 1]) ?? { width: 8, cls: 4 };
        return [nodes[id].x, nodes[id].z, e.width || 8, e.cls ?? 4];
      });
      const points = resample(cutHairpins(resample(pts, step).slice(0, -1)).concat([resample(pts, step)[0]]), step).slice(0, -1);
      const s = [0];
      for (let i = 1; i < points.length; i++) s.push(s[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
      const length = s.at(-1) + Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]);
      // A course worth racing: not a dash round one block, not a tour of the city.
      if (length < (def.min ?? (bike ? 1400 : 1800)) || length > (def.max ?? (bike ? 3400 : 9000))) {
        why?.push(`length ${length.toFixed(0)}`);
        continue;
      }
      // Too much doubling back (a street used both ways) and it isn't a loop.
      const seen = new Map();
      let back = 0;
      route.forEach((id, i) => {
        if (seen.has(id) && i - seen.get(id) > 2) back++;
        seen.set(id, i);
      });
      if (back > route.length * 0.12) {
        why?.push(`back ${back}/${route.length}`);
        continue;
      }
      // Any turn-round left (one the cutting could not undo) and it is no race course.
      const head = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
      const m = points.length;
      const pins = points.filter((b, i) => {
        const t = head(b, points[(i + 2) % m]) - head(points[(i - 2 + m) % m], b);
        return Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) > 2.3;
      }).length;
      if (pins) {
        why?.push(`hairpins ${pins}`);
        continue;
      }
      // The loop nearest the length wanted wins (for a bike, one that is partly small streets and partly big).
      let score = Math.abs(length - target);
      if (bike) {
        const small = points.filter((p) => isSmall(p[3])).length / points.length;
        score += 2200 * Math.max(0, 0.3 - small) + 1200 * Math.max(0, small - 0.8);
      }
      if (!best || score < best.score) best = { id: def.id, points, s, length, score };
    }
  }
  if (best) delete best.score;
  return best;
}

/**
 * Where a racer is along the course: the point nearest them, searched a little
 * behind and ahead of where they were last (so a course that crosses itself
 * is followed the right way). Returns { i, off } — index, and how far off the line.
 */
export function locate(course, x, z, near = null) {
  const n = course.points.length;
  let best = -1;
  let bestD = Infinity;
  const look = (i) => {
    const p = course.points[((i % n) + n) % n];
    const d = Math.hypot(p[0] - x, p[1] - z);
    if (d < bestD) {
      bestD = d;
      best = ((i % n) + n) % n;
    }
  };
  if (near == null) for (let i = 0; i < n; i++) look(i);
  else for (let i = near - 15; i <= near + 60; i++) look(i);
  return { i: best, off: bestD };
}

/**
 * Start a loop where a grid of four fits: the straightest stretch of the
 * widest road on it (never in an alley). Returns the course turned round so
 * that point is index 0 (distances counted again from there).
 */
export function startOnBigRoad(course) {
  const pts = course.points;
  const n = pts.length;
  const head = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
  let best = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 6 + n) % n];
    const b = pts[i];
    const c = pts[(i + 6) % n];
    const t = head(b, c) - head(a, b);
    const bend = Math.abs(Math.atan2(Math.sin(t), Math.cos(t)));
    // Wide, straight, and the grid behind it (a few points back) on the same road.
    let narrow = Infinity;
    for (let k = -5; k <= 3; k++) narrow = Math.min(narrow, pts[(i + k + n) % n][2] ?? 8);
    const score = narrow - bend * 20 - (isSmall(pts[i][3] ?? 4) ? 50 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  const points = pts.slice(best).concat(pts.slice(0, best));
  const s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  return { ...course, points, s };
}
