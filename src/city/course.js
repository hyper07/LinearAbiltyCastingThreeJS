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
 * …and a bike at 70 km/h: never the motorway, rarely the trunk roads; the
 * wide city roads cheapest (room to race and to pass), the small streets a
 * little dearer and the narrow ones much dearer (`narrow`: how much more a
 * metre costs for each metre under 6 m wide) — so the main loop races the
 * roads, and the narrowest golmok are left for the short cuts
 * (planShortcuts) a bold rider can take.
 */
export const BIKE_COST = Object.assign([Infinity, 1.7, 0.95, 0.88, 0.9, 1.0, 1.15, 1.5], { narrow: 0.9, against: 8 });
/** Small streets: what a course point's class says it is (5 residential, 6 alley, 7 pedestrian). */
export const isSmall = (cls) => cls >= 5;
const key = (x, z) => `${Math.round(x * 2)}|${Math.round(z * 2)}`;

/**
 * The road network near a place, as a graph: nodes where roads' points are, edges along them.
 * With `walls` (walls.js: the buildings' footprints), a street whose line runs through a building
 * is moved a little to the side to the gap between them (`shift`, metres to its right) if that
 * clears it, and otherwise left out: the map's alleys don't always agree with its buildings, and a
 * race must never be routed through one.
 */
export function buildGraph(roads, cx, cz, reach, costs = COST, walls = null) {
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
      if (prev != null && prev !== id) {
        const a = nodes[prev];
        const b = nodes[id];
        const shift = walls ? clearShift(walls, a.x, a.z, b.x, b.z) : 0;
        if (shift == null) {
          prev = id;
          continue;
        }
        const len = Math.hypot(a.x - b.x, a.z - b.z);
        const cost = len * (costs[r.cls] ?? 1.4) * (1 + Math.max(0, 6 - (r.width || 6)) * (costs.narrow ?? 0)) * (shift ? 1.15 : 1);
        // A one-way road (its points run the way the traffic goes): a bike goes with the traffic — the
        // wrong way costs `against` times as much (so a loop uses the other carriageway back).
        const oneway = Boolean(r.oneway);
        a.adj.push({ to: id, len, cost, width: r.width, cls: r.cls, oneway, road: r, shift });
        b.adj.push({ to: prev, len, cost: cost * (oneway ? costs.against ?? 1 : 1), width: r.width, cls: r.cls, oneway, against: oneway, road: r, shift: -shift });
        for (const nd of [a, b]) {
          nd.cls = Math.min(nd.cls, r.cls);
          nd.width = Math.max(nd.width, r.width);
        }
      }
      prev = id;
    }
  }
  return nodes;
}

/**
 * Does the street from a to b run clear of the buildings? 0 if it does; else the sideways shift
 * (metres to the right of a→b, up to 2.25) that clears it; null if none does. Its ends (2.5 m
 * each) aren't asked: a junction's corner may clip a building's.
 */
export function clearShift(walls, ax, az, bx, bz) {
  const len = Math.hypot(bx - ax, bz - az);
  if (len < 6) return walls.inside((ax + bx) / 2, (az + bz) / 2) ? null : 0;
  const ux = (bx - ax) / len;
  const uz = (bz - az) / len;
  const rx = -uz;
  const rz = ux;
  const cut = Math.min(2.5, len * 0.25);
  const x0 = ax + ux * cut;
  const z0 = az + uz * cut;
  const x1 = bx - ux * cut;
  const z1 = bz - uz * cut;
  for (const o of [0, 0.75, -0.75, 1.5, -1.5, 2.25, -2.25]) {
    if (walls.insideAlong(x0 + rx * o, z0 + rz * o, x1 + rx * o, z1 + rz * o) <= 0.3) return o;
  }
  return null;
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
      out.push(bc == null ? [ax + ((bx - ax) * t) / len, az + ((bz - az) * t) / len, Math.max(aw, bw)] : [ax + ((bx - ax) * t) / len, az + ((bz - az) * t) / len, bw, bc, pts[i][4] ?? 0]);
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
 * never on a motorway, mostly on roads wide enough to race, and each point
 * also says what it is on: [x, z, width, class (5+ is a small street), one-way
 * (1 with the traffic, −1 against it, 0 a two-way road)].
 */
export function planCourse(roads, def, { step = 6, why = null, bike = false, walls = null, target = def.target ?? (bike ? 2300 : 4200) } = {}) {
  // (a bike also rides the alleys: those that stop just short of a road, joined to it)
  if (bike) roads = joinAlleys(roads);
  const nodes = buildGraph(roads, def.x, def.z, def.r * (def.reach ?? 3), bike ? BIKE_COST : COST, walls);
  let best = null;
  const cands = [];
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
        // (and whether it is one carriageway of a one-way road, ridden with its traffic: 1; against it: −1)
        return [nodes[id].x, nodes[id].z, e.width || 8, e.cls ?? 4, e.oneway ? (e.against ? -1 : 1) : 0];
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
      // The loop nearest the length wanted wins — for a bike, one mostly on roads you can race with an
      // alley or two in it, and few hard corners (each a stop at 70 km/h).
      let score = Math.abs(length - target);
      if (bike) {
        // The main loop on roads you can race: a little of the wider small streets is fine, the narrow
        // golmok are for the short cuts.
        const small = points.filter((p) => isSmall(p[3])).length / points.length;
        score += 2200 * Math.max(0, small - 0.3);
        score += 60 * sharpTurns(points);
        // and narrow: every point under 4.6 m wide is a pinch
        score += 30 * points.filter((p) => (p[2] ?? 8) < 4.6).length;
      }
      const cand = { id: def.id, points, s, length, score, graph: { nodes, route: route.slice() } };
      cands.push(cand);
      if (!best || score < best.score) best = cand;
    }
  }
  // A bike loop with a golmok short cut or two beats one without (among the few best): try them.
  if (bike && walls && cands.length > 1) {
    cands.sort((a, b) => a.score - b.score);
    for (const c of cands.slice(0, 12)) {
      const started = startOnBigRoad(c);
      Object.defineProperty(started, 'graph', { enumerable: false, value: c.graph });
      c.score -= 180 * Math.min(2, planShortcuts(started, { walls }).length);
    }
    best = cands.slice(0, 12).reduce((a, b) => (b.score < a.score ? b : a));
  }
  if (best) delete best.score;
  // (the graph and route, for the short cuts: not part of the course itself)
  if (best) Object.defineProperty(best, 'graph', { enumerable: false, value: best.graph });
  return best;
}

/** How many hard corners (more than about 70° within 36 m) a loop of points has. */
export function sharpTurns(points) {
  const m = points.length;
  const head = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
  let n = 0;
  let last = -99;
  for (let i = 0; i < m; i++) {
    const t = head(points[i], points[(i + 3) % m]) - head(points[(i - 3 + m) % m], points[i]);
    if (Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) > 1.2 && i - last > 6) {
      n++;
      last = i;
    }
  }
  return n;
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
 * widest road on it (never in an alley), with a long run to the first corner
 * (a pack at 70 km/h needs room to string out). Returns the course turned
 * round so that point is index 0 (distances counted again from there).
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
    // how far to the first corner (more than ~30°), up to 240 m
    let run = 0;
    while (run < 40) {
      const k = i + run;
      const u = head(pts[(k - 3 + n) % n], pts[k % n]) - head(pts[k % n], pts[(k + 3) % n]);
      if (Math.abs(Math.atan2(Math.sin(u), Math.cos(u))) > 0.5) break;
      run++;
    }
    const score = narrow - bend * 20 - (isSmall(pts[i][3] ?? 4) ? 50 : 0) + Math.min(run, 30) * 1.2;
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

/**
 * Move a line of course points (a loop, or `open` — a short cut) sideways into the gap between the
 * buildings where the map's street and its buildings disagree: each point goes where it has the
 * most room either side (up to 3 m off; a point already clear of the walls by its street's
 * half-width stays put), and the moves are smoothed so the line stays a line. Returns new points.
 */
export function centreLine(points, walls, { open = false, reach = 3 } = {}) {
  const n = points.length;
  if (!walls || n < 3) return points;
  const at = (i) => points[open ? Math.max(0, Math.min(n - 1, i)) : ((i % n) + n) % n];
  const right = (i) => {
    const a = at(i - 1);
    const b = at(i + 1);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / L, (b[0] - a[0]) / L];
  };
  // How much room a point has: how far to the nearer wall, sideways (up to half the width and a bit).
  // (over a few metres along the street, so a gap across it — a side alley — isn't taken for its line)
  const roomAt = (x, z, rx, rz, half) => {
    let room = Infinity;
    for (const a of [-2, 0, 2]) {
      const px = x - rz * a;
      const pz = z + rx * a;
      if (walls.inside(px, pz)) return -1;
      room = Math.min(room, walls.ray(px, pz, rx, rz, half + 1.5), walls.ray(px, pz, -rx, -rz, half + 1.5));
    }
    return room;
  };
  const want = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const half = (p[2] ?? 6) / 2;
    const [rx, rz] = right(i);
    const here = roomAt(p[0], p[1], rx, rz, half);
    if (here >= half - 0.3) continue;
    let best = 0;
    let bestScore = here;
    for (let o = -reach; o <= reach + 1e-6; o += 0.25) {
      const r = roomAt(p[0] + rx * o, p[1] + rz * o, rx, rz, half);
      const score = r - Math.abs(o) * 0.12;
      if (r >= 0 && score > bestScore + 0.05) {
        bestScore = score;
        best = o;
      }
    }
    want[i] = best;
  }
  // Smoothed: each moves the most of its own and its neighbours' (so a point between two that move, moves too).
  const out = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let wsum = 0;
    for (let k = -2; k <= 2; k++) {
      const j = open ? Math.max(0, Math.min(n - 1, i + k)) : (((i + k) % n) + n) % n;
      const w = 3 - Math.abs(k);
      sum += want[j] * w;
      wsum += w;
    }
    let o = Math.abs(want[i]) > Math.abs(sum / wsum) ? want[i] : sum / wsum;
    // (the ends of a short cut stay where they join the course)
    if (open && (i === 0 || i === n - 1)) o = 0;
    const [rx, rz] = right(i);
    const p = points[i].slice();
    p[0] += rx * o;
    p[1] += rz * o;
    out.push(p);
  }
  // Moved into a building after all that (a bad bit of map): back where it was.
  for (let i = 0; i < n; i++) if (walls.inside(out[i][0], out[i][1]) && !walls.inside(points[i][0], points[i][1])) out[i] = points[i].slice();
  return out;
}

/**
 * The room each point has between the walls: for each, metres clear to its left and to its right
 * (up to its street's half-width and 2 m more — a pavement), as one array [left0, right0, left1, …].
 */
export function roomOf(points, walls, { open = false } = {}) {
  const n = points.length;
  const room = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const half = (p[2] ?? 6) / 2;
    const a = points[open ? Math.max(0, i - 1) : (i - 1 + n) % n];
    const b = points[open ? Math.min(n - 1, i + 1) : (i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const rx = -(b[1] - a[1]) / L;
    const rz = (b[0] - a[0]) / L;
    room[i * 2] = walls ? walls.ray(p[0], p[1], -rx, -rz, half + 2) : half + 2;
    room[i * 2 + 1] = walls ? walls.ray(p[0], p[1], rx, rz, half + 2) : half + 2;
  }
  return room;
}

/** Distances along a line of points (and its whole length, back to the start if a loop). */
export function alongLine(points, open = false) {
  const s = [0];
  for (let i = 1; i < points.length; i++) s.push(s[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const length = s.at(-1) + (open ? 0 : Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]));
  return { s, length };
}

/**
 * Short cuts: the narrowest golmok that leave the course and join it again further on, shorter
 * than the course between — a bold rider's line (tight walls, a tight turn in), a cautious one
 * keeps to the road. Each is { id, from, to (course indices it leaves and joins at), points (open,
 * from the course's point `from` to its point `to`), s, length, span (the course's metres it cuts
 * out), saves, width (its narrowest), roads (the streets it runs down) }. Never across the start
 * line, never two over the same stretch. Needs the course's graph (planCourse).
 */
export function planShortcuts(course, { max = 2, narrowest = 6.5, pinch = 4.7, step = 6, walls = null, why = null } = {}) {
  const g = course.graph;
  if (!g) return [];
  const { nodes } = g;
  const pts = course.points;
  const n = pts.length;
  const L = course.length;
  const S = course.s;
  // The course points by 10 m square, for "how near the course is this".
  const cell = 10;
  const grid = new Map();
  pts.forEach((p, i) => {
    const k = `${Math.floor(p[0] / cell)}|${Math.floor(p[1] / cell)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  });
  const nearest = (x, z) => {
    let best = -1;
    let bd = Infinity;
    const ci = Math.floor(x / cell);
    const cj = Math.floor(z / cell);
    for (let i = ci - 1; i <= ci + 1; i++) {
      for (let j = cj - 1; j <= cj + 1; j++) {
        for (const k of grid.get(`${i}|${j}`) ?? []) {
          const d = Math.hypot(pts[k][0] - x, pts[k][1] - z);
          if (d < bd) {
            bd = d;
            best = k;
          }
        }
      }
    }
    return { i: best, d: bd };
  };
  // The nodes on the course (where a short cut may leave or join it), and those just beside it.
  const on = new Map();
  const beside = new Uint8Array(nodes.length);
  nodes.forEach((nd, id) => {
    if (!nd.adj.length) return;
    const q = nearest(nd.x, nd.z);
    if (q.i < 0) return;
    if (q.d < 4.5) on.set(id, q.i);
    else if (q.d < 6) beside[id] = 1;
  });
  const head = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
  const turnBy = (a, b) => Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
  const courseDir = (k) => head(pts[(((k - 2) % n) + n) % n], pts[(k + 2) % n]);
  const found = [];
  for (const [a, ka] of on) {
    if (ka < 10 || ka > n - 20) continue;
    // Out along the narrow streets (never against a one-way), up to 450 m, until the course is met again.
    const dist = new Map([[a, 0]]);
    const prev = new Map();
    const heap = new Heap();
    heap.push(a, 0);
    while (heap.size) {
      const u = heap.pop();
      const du = dist.get(u);
      for (const e of nodes[u].adj) {
        if (e.against || !isSmall(e.cls) || e.width > narrowest) continue;
        const v = e.to;
        const d = du + e.len;
        if (d > 450 || d >= (dist.get(v) ?? Infinity)) continue;
        if (on.has(v)) {
          if (u === a) continue;
          // Back on the course: a short cut, if it goes the course's way.
          const kb = on.get(v);
          const span = S[kb] - S[ka];
          if (kb <= ka || kb > n - 8 || span < 40 || span > L * 0.45) {
            why?.push(kb <= ka ? 'backward' : kb > n - 8 ? 'line' : span < 40 ? 'short' : 'long');
            continue;
          }
          const way = [v, u];
          while (way.at(-1) !== a) way.push(prev.get(way.at(-1)));
          way.reverse();
          found.push({ a, b: v, ka, kb, way, len: d, span });
          continue;
        }
        if (beside[v]) continue;
        dist.set(v, d);
        prev.set(v, u);
        heap.push(v, d);
      }
    }
  }
  const out = [];
  const edge = (a, b) => nodes[a].adj.find((e) => e.to === b);
  for (const f of found) {
    // Worth the risk, but not a race-winner by itself: 15–230 m saved.
    if (f.span - f.len < Math.max(15, f.span * 0.1) || f.span - f.len > 230) {
      why?.push('saves');
      continue;
    }
    const ws = [];
    for (let i = 1; i < f.way.length; i++) ws.push(edge(f.way[i - 1], f.way[i]));
    const width = Math.min(...ws.map((e) => e.width));
    // (mostly golmok: at least 40% of it, or its narrowest, no wider than `pinch`)
    const tight = ws.reduce((t, e) => t + (e.width <= pinch ? e.len : 0), 0) / f.len;
    if (width > pinch || tight < 0.4) {
      why?.push('wide');
      continue;
    }
    // In off the course and back on at no more than a hard corner (never a turn-round).
    const first = nodes[f.way[1]];
    const last = nodes[f.way.at(-2)];
    if (turnBy(courseDir(f.ka), head([nodes[f.a].x, nodes[f.a].z], [first.x, first.z])) > 1.95) continue;
    if (turnBy(head([last.x, last.z], [nodes[f.b].x, nodes[f.b].z]), courseDir(f.kb)) > 1.95) continue;
    // Its points: from the course's point, along the golmok, to the course's point.
    const raw = [[pts[f.ka][0], pts[f.ka][1], ws[0].width, ws[0].cls, 0]];
    for (let i = 1; i < f.way.length - 1; i++) {
      const nd = nodes[f.way[i]];
      raw.push([nd.x, nd.z, ws[i - 1].width, ws[i - 1].cls, 0]);
    }
    raw.push([pts[f.kb][0], pts[f.kb][1], ws.at(-1).width, ws.at(-1).cls, 0]);
    let points = resample(raw, step);
    if (Math.hypot(points.at(-1)[0] - raw.at(-1)[0], points.at(-1)[1] - raw.at(-1)[1]) > 1.5) points.push(raw.at(-1).slice());
    else points[points.length - 1] = raw.at(-1).slice();
    if (walls) points = centreLine(points, walls, { open: true, reach: 2 });
    // No turn-round inside it either.
    let pin = false;
    for (let i = 2; i < points.length - 2; i++) if (turnBy(head(points[i - 2], points[i]), head(points[i], points[i + 2])) > 2.2) pin = true;
    if (pin) continue;
    // Not a lane running alongside the course (most of it well away from the course's line).
    const by = points.slice(2, -2).filter((p) => nearest(p[0], p[1]).d < 9).length;
    if (by > Math.max(2, (points.length - 4) * 0.35)) continue;
    const { s, length } = alongLine(points, true);
    out.push({ from: f.ka, to: f.kb, points, s, length, span: f.span, saves: f.span - length, width, roads: new Set(ws.map((e) => e.road.joined ?? e.road)), score: (f.span - length) * (1 + Math.max(0, 4.7 - width) * 0.4) });
  }
  // The best few, each over a stretch of its own (with room between).
  out.sort((x, y) => y.score - x.score || x.from - y.from);
  const kept = [];
  for (const c of out) {
    if (kept.length >= max) break;
    if (c.saves < 15) continue;
    if (kept.some((k) => c.from < k.to + 12 && k.from < c.to + 12)) continue;
    kept.push(c);
  }
  kept.sort((x, y) => x.from - y.from);
  return kept.map((c, k) => {
    delete c.score;
    return { id: `${course.id}-sc${k}`, ...c };
  });
}

/**
 * A planned course made ready to race: started where a grid fits (startOnBigRoad), moved into the
 * gaps between the buildings (centreLine), its short cuts found, and the room each point has
 * between the walls (roomOf) — the same everywhere for the same streets and buildings.
 */
export function finishCourse(planned, { walls = null, shortcuts = true } = {}) {
  let c = startOnBigRoad(planned);
  if (walls) {
    const points = centreLine(c.points, walls);
    const { s, length } = alongLine(points);
    c = { ...c, points, s, length };
  }
  Object.defineProperty(c, 'graph', { enumerable: false, value: planned.graph });
  c.shortcuts = shortcuts ? planShortcuts(c, { walls }) : [];
  c.room = roomOf(c.points, walls);
  for (const sc of c.shortcuts) sc.room = roomOf(sc.points, walls, { open: true });
  return c;
}

/**
 * Small streets that stop just short of the road they lead onto (or run a little way into it):
 * the map's alleys and its roads were drawn by different hands, so an alley's end is not always
 * a point of the road. Each such end (one no other street shares) within reach of another street
 * is carried on to the nearest point of that street's line, and that point added to the street —
 * so the alley meets the road at its middle, and the course can turn from one into the other.
 * Returns new roads (copies of the ones it changed); the rest are as they were.
 */
export function joinAlleys(roads, { reach = 6 } = {}) {
  const keyOf = (x, z) => key(x, z);
  const count = new Map();
  for (const r of roads) for (let i = 0; i < r.pts.length; i += 2) {
    const k = keyOf(r.pts[i], r.pts[i + 1]);
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  // Every street's segments by 20 m square.
  const cell = 20;
  const grid = new Map();
  roads.forEach((r, ri) => {
    for (let i = 2; i < r.pts.length; i += 2) {
      const ax = r.pts[i - 2];
      const az = r.pts[i - 1];
      const bx = r.pts[i];
      const bz = r.pts[i + 1];
      const seen = new Set();
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / (cell / 2)));
      for (let s = 0; s <= steps; s++) {
        const k = `${Math.floor((ax + ((bx - ax) * s) / steps) / cell)}|${Math.floor((az + ((bz - az) * s) / steps) / cell)}`;
        if (seen.has(k)) continue;
        seen.add(k);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push([ri, i / 2 - 1]);
      }
    }
  });
  const adds = new Map(); // road index → [{ seg, t, x, z }]
  const ends = new Map(); // road index → { start?: [x, z], end?: [x, z] }
  roads.forEach((r, ri) => {
    if (!isSmall(r.cls)) return;
    const n = r.pts.length / 2;
    if (n < 2) return;
    for (const which of ['start', 'end']) {
      const i = which === 'start' ? 0 : n - 1;
      const x = r.pts[i * 2];
      const z = r.pts[i * 2 + 1];
      if ((count.get(keyOf(x, z)) ?? 0) > 1) continue;
      // which way the street runs out at this end
      const j = which === 'start' ? 1 : n - 2;
      const ox = x - r.pts[j * 2];
      const oz = z - r.pts[j * 2 + 1];
      const ol = Math.hypot(ox, oz) || 1;
      let best = null;
      const ci = Math.floor(x / cell);
      const cj = Math.floor(z / cell);
      for (let a = ci - 1; a <= ci + 1; a++) {
        for (let b = cj - 1; b <= cj + 1; b++) {
          for (const [rj, seg] of grid.get(`${a}|${b}`) ?? []) {
            if (rj === ri) continue;
            const q = roads[rj];
            const ax = q.pts[seg * 2];
            const az = q.pts[seg * 2 + 1];
            const bx = q.pts[seg * 2 + 2];
            const bz = q.pts[seg * 2 + 3];
            const ex = bx - ax;
            const ez = bz - az;
            const L2 = ex * ex + ez * ez || 1e-9;
            const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / L2));
            const fx = ax + ex * t;
            const fz = az + ez * t;
            const d = Math.hypot(fx - x, fz - z);
            // Within reach of the other street's edge — and ahead of the alley's end, or right on it (not back along it).
            const ahead = ((fx - x) * ox + (fz - z) * oz) / ol;
            if (d > (q.width || 6) / 2 + reach || (d > 1.5 && ahead < d * 0.3)) continue;
            if (!best || d < best.d) best = { d, rj, seg, t, x: fx, z: fz };
          }
        }
      }
      if (!best) continue;
      if (!adds.has(best.rj)) adds.set(best.rj, []);
      adds.get(best.rj).push(best);
      if (!ends.has(ri)) ends.set(ri, {});
      ends.get(ri)[which] = [best.x, best.z];
    }
  });
  if (!adds.size && !ends.size) return roads;
  return roads.map((r, ri) => {
    const add = adds.get(ri);
    const end = ends.get(ri);
    if (!add && !end) return r;
    const pts = [];
    const n = r.pts.length / 2;
    if (end?.start) pts.push(end.start[0], end.start[1]);
    for (let i = 0; i < n; i++) {
      pts.push(r.pts[i * 2], r.pts[i * 2 + 1]);
      for (const a of (add ?? []).filter((q) => q.seg === i && q.t > 0 && q.t < 1).sort((p, q) => p.t - q.t)) pts.push(a.x, a.z);
    }
    if (end?.end) pts.push(end.end[0], end.end[1]);
    // (points that fell right on one already there: once)
    const clean = [pts[0], pts[1]];
    for (let i = 2; i < pts.length; i += 2) if (Math.hypot(pts[i] - clean.at(-2), pts[i + 1] - clean.at(-1)) > 0.3) clean.push(pts[i], pts[i + 1]);
    return { ...r, pts: Float32Array.from(clean), joined: r };
  });
}
