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

/** Places to race round: a centre (world metres from City Hall) and how far out the loop goes. */
export const COURSES = [
  { id: 'gwanghwamun', name: 'Gwanghwamun Loop', ko: '광화문', x: -150, z: -500, r: 650, text: 'Round the palace gate and City Hall: wide boulevards and a few hard corners.' },
  { id: 'namsan', name: 'Namsan Twisties', ko: '남산', x: 900, z: 900, r: 700, text: 'Under the tower, below the mountain: twenty corners — a drifter\'s course.' },
  { id: 'dongdaemun', name: 'Dongdaemun Night', ko: '동대문', x: 4300, z: -300, r: 700, text: 'Past the old east gate and the night markets: quick turns on busy streets.' },
  { id: 'gangnam', name: 'Gangnam Avenues', ko: '강남', x: 6343, z: 7091, r: 1000, text: 'The big avenues south of the river: flat out, then hard on the brakes.' },
  { id: 'yeouido', name: 'Yeouido Island', ko: '여의도', x: -3300, z: 4700, r: 600, text: 'The river island of towers: long and fast, over the water and back.' },
  // The long ones: across the city, a single lap is a journey.
  { id: 'hangang', name: 'Han River Grand Tour', ko: '한강', x: 1500, z: 4300, r: 3000, target: 15000, min: 8000, max: 26000, reach: 1.6, laps: 1, long: true, text: 'Both banks of the Han and the bridges between: nearly 14 km of the city at night.' },
  { id: 'marathon', name: 'Seoul Marathon', ko: '서울 일주', x: 2500, z: 3800, r: 3500, target: 18000, min: 8000, max: 26000, reach: 1.6, laps: 1, long: true, text: 'The longest: 16 km from the old city south over the river and back.' },
  // The runs: from district to district across the whole city, start to finish.
  { id: 'run50', name: 'Seoul 50K', ko: '서울 50K', run: true, long: true, laps: 1, stops: ['종로구', '마포구', '영등포구', '동작구', '서초구', '강남구', '성동구', '동대문구', '종로구'], text: 'A run of some 55 km: Jongno to Mapo, over the river to Yeouido and Gangnam, back by Seongdong — a checkpoint in every district.' },
  { id: 'run100', name: 'Seoul 100K', ko: '서울 100K', run: true, long: true, laps: 1, stops: ['종로구', '은평구', '마포구', '강서구', '양천구', '구로구', '영등포구', '동작구', '서초구', '강남구', '송파구', '강동구', '광진구', '중랑구', '동대문구', '종로구'], text: 'The whole city, some 105 km: fifteen districts, west to east and back over the river twice.' },
  { id: 'downtown', name: 'Downtown Circuit', ko: '도심', x: 1500, z: -500, r: 2200, target: 12000, min: 8000, max: 26000, reach: 1.6, laps: 1, long: true, text: 'Palaces, markets and towers: 12 km of the old city\'s boulevards.' }
];

/** How much a metre of each class of road costs: big roads are preferred, small ones avoided. */
const COST = [0.75, 0.7, 0.8, 1.0, 1.6];
const key = (x, z) => `${Math.round(x * 2)}|${Math.round(z * 2)}`;

/** The road network near a place, as a graph: nodes where roads' points are, edges along them. */
export function buildGraph(roads, cx, cz, reach) {
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
        const cost = len * (COST[r.cls] ?? 1.4);
        a.adj.push({ to: id, len, cost, width: r.width });
        b.adj.push({ to: prev, len, cost, width: r.width });
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

/** The node on a big road nearest a point (the biggest road class found within reach wins). */
function snap(nodes, x, z, reach) {
  let best = -1;
  let bestScore = Infinity;
  nodes.forEach((n, i) => {
    if (n.adj.length < 2) return;
    const d = Math.hypot(n.x - x, n.z - z);
    if (d > reach) return;
    const score = d + n.cls * 90;
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
    const [bx, bz, bw] = pts[i];
    const len = Math.hypot(bx - ax, bz - az);
    let t = step - carry;
    while (t <= len) {
      out.push([ax + ((bx - ax) * t) / len, az + ((bz - az) * t) / len, Math.max(aw, bw)]);
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
 */
export function planCourse(roads, def, { step = 6, why = null, target = def.target ?? 4200 } = {}) {
  const nodes = buildGraph(roads, def.x, def.z, def.r * (def.reach ?? 3));
  let best = null;
  for (const turn of [Math.PI / 4, 0, Math.PI / 8, (3 * Math.PI) / 8, Math.PI / 6]) {
    for (const scale of [0.45, 0.6, 0.8, 1, 1.25]) {
      const R = def.r * scale;
      const anchors = [0, 1, 2, 3].map((k) => snap(nodes, def.x + Math.cos(turn + (k * Math.PI) / 2) * R, def.z + Math.sin(turn + (k * Math.PI) / 2) * R, Math.max(250, R * 0.9)));
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
      const pts = route.map((id) => [nodes[id].x, nodes[id].z, nodes[id].width || 10]);
      const points = resample(cutHairpins(resample(pts, step).slice(0, -1)).concat([resample(pts, step)[0]]), step).slice(0, -1);
      const s = [0];
      for (let i = 1; i < points.length; i++) s.push(s[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
      const length = s.at(-1) + Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]);
      // A course worth racing: not a dash round one block, not a tour of the city.
      if (length < (def.min ?? 1800) || length > (def.max ?? 9000)) {
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
      // The loop nearest the length wanted wins.
      const score = Math.abs(length - target);
      if (!best || score < best.score) best = { id: def.id, points, s, length, score };
    }
  }
  if (best) delete best.score;
  return best;
}

/** Cut hairpins out of an open line of points (a run, which does not loop). */
function cutHairpinsOpen(points) {
  const pts = points.slice();
  const heading = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
  for (let guard = 0; guard < 400; guard++) {
    let pin = -1;
    for (let i = 2; i < pts.length - 2; i++) {
      const t = heading(pts[i], pts[i + 2]) - heading(pts[i - 2], pts[i]);
      if (Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) > 2.3) {
        pin = i;
        break;
      }
    }
    if (pin < 0) break;
    let k = 1;
    while (pin - k > 0 && pin + k < pts.length - 1 && Math.hypot(pts[pin - k][0] - pts[pin + k][0], pts[pin - k][1] - pts[pin + k][1]) < 30) k++;
    pts.splice(pin - k + 1, 2 * k - 1);
  }
  return pts;
}

/**
 * Plan a run: from one place to the next through a list of them (each moved
 * onto the nearest big road), by the best roads, never the same street
 * twice. An open course — it starts at the first place and finishes at the
 * last. Returns { open: true, points, s, length, checkpoints: [{ i, name }] }.
 */
export function planRun(roads, stops, { step = 6 } = {}) {
  const xs = stops.map((p) => p.x);
  const zs = stops.map((p) => p.z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const reach = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2 + 2500;
  const nodes = buildGraph(roads, cx, cz, reach);
  const anchors = stops.map((p) => snap(nodes, p.x, p.z, 1500));
  if (anchors.some((a) => a < 0)) return null;
  const used = new Set();
  const route = [anchors[0]];
  const marks = [{ node: anchors[0], name: stops[0].name }];
  for (let k = 1; k < anchors.length; k++) {
    if (anchors[k] === anchors[k - 1]) continue;
    const leg = path(nodes, anchors[k - 1], anchors[k], used);
    if (!leg) return null;
    for (let i = 1; i < leg.length; i++) {
      used.add(`${leg[i - 1]}>${leg[i]}`);
      route.push(leg[i]);
    }
    marks.push({ node: anchors[k], name: stops[k].name });
  }
  const pts = route.map((id) => [nodes[id].x, nodes[id].z, nodes[id].width || 10]);
  const points = resample(cutHairpinsOpen(resample(pts, step)), step);
  const s = [0];
  for (let i = 1; i < points.length; i++) s.push(s[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  // Each stop is a checkpoint: the nearest point of the run to it, in order along the way.
  const checkpoints = [];
  let from = 0;
  for (const m of marks.slice(1)) {
    const n = nodes[m.node];
    let best = from;
    let bestD = Infinity;
    for (let i = from; i < points.length; i++) {
      const d = Math.hypot(points[i][0] - n.x, points[i][1] - n.z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
      if (d > bestD + 3000) break;
    }
    checkpoints.push({ i: best, name: m.name });
    from = best + 1;
  }
  return { open: true, points, s, length: s.at(-1), checkpoints };
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
