import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * The squares a course rides through that the road map has no road over: Gwanghwamun Square (the riders
 * come up the paving past the fountain, round Admiral Yi's plinth, past King Sejong and out toward the
 * gate) and the drive across Cheong Wa Dae's lawn in front of its main hall. Each is a paved surface at
 * pavement height (the road slab's 0.9 m over its level and a kerb's 0.14 — `PLAZA_LIFT`), a racing lane
 * down it that the course planner may use as a street (`plazaRoads`, joined to the real roads at its ends),
 * what stands on it as walls (the plinths, planters and bollards — `plazaRings`), and people about its
 * edges. No cars: race.js keeps the lane clear (`inPlazaLane`), and traffic only drives the map's roads.
 *
 *   plazaY(x, z, ground)          // the paving's height at a point, or null off every square
 *   plazaRoads(roads, ids)        // the lanes as streets for the planner (course.js, a def's `plaza`)
 *   plazaRings(ids)               // what a rider can't ride through, as rings for walls.js
 *   plazaFolk(ids)                // where people stand about its edges
 *   new PlazaView(scene, ground)  // the paving, planters and bollards, drawn
 *
 * World metres from City Hall (x east, z south), as the courses and the landmarks (skyline.js).
 */

/** How far a square's paving stands over the land: the road slab (0.9 m) and the kerb (0.14 m). */
export const PLAZA_LIFT = 1.04;

/** A box on the ground, [x, z, width (along x), depth (along z)] — solid. */
const rect = (x, z, w, d) => ({ x, z, w, d });

export const PLAZAS = [
  {
    id: 'gwanghwamun',
    kind: 'square',
    // the paving: west and east edge at each z, south to north — between Jongno/Saemunan-ro's crossing and
    // Sajik-ro in front of the gate, from the buildings on the west (the Sejong Center's line) to the
    // pavement of Sejong-daero's southbound carriageway on the east
    // (and out to the end of Sajik-ro 8-gil, which comes into its west side by the Sejong Center's north end)
    rows: [[-455, -118, -86], [-470, -128, -84], [-490, -132, -82], [-560, -134, -76], [-640, -134, -77], [-720, -134, -79], [-800, -134, -82], [-866, -134, -82], [-874, -143, -82], [-900, -143, -82], [-908, -134, -82], [-930, -134, -83], [-960, -133, -86], [-975, -130, -94]],
    // the racing lane: up the west side of the fountain (through the spray of its west row), round the
    // admiral's plinth on its west, past King Sejong, a gentle weave between the planters, out toward the gate
    lane: [[-100, -458], [-100, -490], [-105, -506], [-107, -520], [-104, -538], [-100, -570], [-104, -620], [-108, -660], [-109, -700], [-114, -745], [-108, -790], [-114, -835], [-108, -880], [-102, -925], [-98, -962]],
    width: 14,
    // where the lane meets the roads ([its point, the road's point]): from its south end onto Jongno westbound
    // and from Saemunan-ro eastbound (across the crossing); from its north end onto Sajik-ro eastbound (to
    // Yulgok-ro) and westbound (along the front of the gate's junction); from its bend by the Sejong Center's
    // north end onto Sajik-ro 8-gil, west
    joins: [[0, [-96, -445]], [0, [-96, -428]], [-1, [-95, -984]], [-1, [-101, -997]], [12, [-145, -887]]],
    // the admiral's plinth (its broad lowest step), the turtle ship's base, King Sejong's plinth
    solids: [rect(-92, -517, 13, 13), rect(-92, -507.4, 3.2, 6.4), rect(-92, -691, 10, 8)],
    // round granite planters at the weave's bends, just off the lane (x, z, radius)
    planters: [[-109.5, -570, 1.2], [-104.5, -745, 1.3], [-98, -748, 1.3], [-117.5, -790, 1.3], [-104.5, -835, 1.3], [-98, -838, 1.3], [-124, -640, 1.2]],
    // stone bollards along the lane's edges (from, to: indices of the lane's points), every `every` metres — none
    // where a course turns off it (by the Sejong Center's north end, its north end)
    bollards: { runs: [[5, 7], [8, 11]], every: 6, off: 8 },
    // people about: along the west edge, watching the fountain, by King Sejong (x, z, facing x, z)
    folk: [[-118, -470, 1, 0], [-119, -476, 1, 0.2], [-120, -497, 1, 0], [-121, -503, 1, -0.2], [-124, -540, 1, 0], [-125, -545, 1, 0.3], [-127, -600, 1, 0], [-127, -606, 1, 0], [-128, -700, 1, 0], [-127, -705, 1, -0.3], [-87, -712, -1, 0], [-86, -718, -1, 0.2], [-127, -800, 1, 0], [-126, -806, 1, 0.2], [-128, -900, 1, 0], [-87, -900, -1, 0], [-88, -930, -1, 0.3]]
  },
  {
    id: 'cheongwadae',
    kind: 'drive',
    // up from the front gate onto the lawn, across the front of the main hall, and down again to the road
    lane: [[-150, -1965], [-158, -2000], [-165, -2040], [-185, -2105], [-200, -2150], [-235, -2195], [-268, -2200], [-300, -2195], [-335, -2140], [-342, -2090], [-345, -2040], [-349, -1985], [-350, -1955]],
    width: 10,
    // (the paving reaches this far past the lane's edges)
    pad: 2.5,
    joins: [[0, [-143, -1944]], [-1, [-351, -1918]]],
    // the main hall's terrace and its wings (skyline.js blueHouse)
    solids: [rect(-268, -2250, 106, 30)],
    planters: [],
    bollards: null,
    folk: [[-214, -2205, 0.2, 1], [-220, -2210, 0.3, 1], [-320, -2208, -0.2, 1], [-326, -2203, -0.3, 1], [-172, -2150, -1, 0], [-360, -2120, 1, 0]]
  }
];

const byId = new Map(PLAZAS.map((p) => [p.id, p]));
const listOf = (ids) => (ids == null ? PLAZAS : [].concat(ids).map((id) => byId.get(id)).filter(Boolean));

/** A point's distance to a polyline [[x, z], …], and where along it (index of the segment, 0…1 on it). */
export function toLine(line, x, z) {
  let best = Infinity;
  let at = 0;
  let k = 0;
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const dx = line[i][0] - ax;
    const dz = line[i][1] - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) [best, at, k] = [d, i - 1, t];
  }
  return { d: best, i: at, t: k };
}

/** A square's west and east edge at `z` (its rows), or null past its ends. */
function rowAt(p, z) {
  const r = p.rows;
  if (z > r[0][0] || z < r[r.length - 1][0]) return null;
  for (let i = 1; i < r.length; i++) {
    if (z >= r[i][0]) {
      const k = (z - r[i - 1][0]) / (r[i][0] - r[i - 1][0] || 1);
      return [r[i - 1][1] + (r[i][1] - r[i - 1][1]) * k, r[i - 1][2] + (r[i][2] - r[i - 1][2]) * k];
    }
  }
  return null;
}

/**
 * A drive's paved line: its lane, carried on toward each road it joins to that road's pavement (6.5 m short
 * of the road's middle line) — so the paving meets the pavement, flush, with no strip of bare land between.
 */
export function pavedLine(p) {
  if (p._line) return p._line;
  const line = p.lane.slice();
  for (const [end, to] of p.joins ?? []) {
    const from = end < 0 ? p.lane[p.lane.length + end] : p.lane[end];
    const L = Math.hypot(to[0] - from[0], to[1] - from[1]);
    if (L < 7) continue;
    const k = (L - 6.5) / L;
    const q = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
    if (end < 0) line.push(q);
    else line.unshift(q);
  }
  p._line = line;
  return line;
}

/** Its bounds (with a margin), worked out once. */
function boundsOf(p) {
  if (p._b) return p._b;
  const pts = p.rows ? p.rows.flatMap(([z, w, e]) => [[w, z], [e, z]]) : pavedLine(p);
  const m = p.rows ? 0 : p.width / 2 + (p.pad ?? 0);
  const xs = pts.map((q) => q[0]);
  const zs = pts.map((q) => q[1]);
  p._b = { x0: Math.min(...xs) - m, x1: Math.max(...xs) + m, z0: Math.min(...zs) - m, z1: Math.max(...zs) + m };
  return p._b;
}

/** The square a point is on (its paving), or null. */
export function plazaAt(x, z, ids = null) {
  for (const p of listOf(ids)) {
    const b = boundsOf(p);
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    if (p.rows) {
      const r = rowAt(p, z);
      if (r && x >= r[0] && x <= r[1]) return p;
    } else if (toLine(pavedLine(p), x, z).d <= p.width / 2 + (p.pad ?? 0)) return p;
  }
  return null;
}

/** The paving's height at a point (the land's, `ground(x, z)`, and PLAZA_LIFT), or null off every square. */
export function plazaY(x, z, ground, ids = null) {
  return plazaAt(x, z, ids) ? ground(x, z) + PLAZA_LIFT : null;
}

/** Whether a point is in a square's racing lane (and `extra` metres past its edges) — kept clear of traffic and people. */
export function inPlazaLane(x, z, extra = 2, ids = null) {
  for (const p of listOf(ids)) {
    const b = boundsOf(p);
    if (x < b.x0 - 20 || x > b.x1 + 20 || z < b.z0 - 20 || z > b.z1 + 20) continue;
    if (toLine(p.lane, x, z).d < p.width / 2 + extra) return true;
  }
  return false;
}

/** A polyline with a point at least every `step` metres. */
function dense(line, step) {
  const out = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const [bx, bz] = line[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}

/**
 * The squares' lanes as streets for the course planner (course.js): each lane a two-way street of its width
 * (class 4, so a Medium course may use it), a point every 10 m; and a short piece from its end to each road
 * it joins — onto that road's nearest point (within 8 m of where it is given), so the graph joins them.
 */
export function plazaRoads(roads, ids = null) {
  const out = [];
  for (const p of listOf(ids)) {
    const lane = dense(p.lane, 10);
    out.push({ pts: Float32Array.from(lane.flat()), width: p.width, cls: 4, plaza: p.id });
    for (const [end, want] of p.joins ?? []) {
      let best = null;
      let bd = 8;
      for (const r of roads) {
        if (r.cls < 1 || r.cls > 4 || r.plaza) continue;
        for (let i = 0; i < r.pts.length; i += 2) {
          const d = Math.hypot(r.pts[i] - want[0], r.pts[i + 1] - want[1]);
          if (d < bd) [bd, best] = [d, [r.pts[i], r.pts[i + 1]]];
        }
      }
      if (!best) continue;
      // (from one of the lane's own points: a point of its street too)
      const from = end < 0 ? p.lane[p.lane.length + end] : p.lane[end];
      out.push({ pts: Float32Array.of(from[0], from[1], best[0], best[1]), width: p.width, cls: 4, plaza: p.id });
    }
  }
  return out;
}

/** The bollards along a square's lane: [x, z] each. */
export function plazaBollards(p) {
  const out = [];
  if (!p.bollards) return out;
  const { runs, every, off } = p.bollards;
  for (const [a, b] of runs) {
    const line = dense(p.lane.slice(a, b + 1), every);
    for (let i = 0; i < line.length; i++) {
      const q = line[Math.min(line.length - 1, i + 1)];
      const o = line[Math.max(0, i - 1)];
      const dx = q[0] - o[0];
      const dz = q[1] - o[1];
      const L = Math.hypot(dx, dz) || 1;
      for (const s of [-1, 1]) {
        const x = line[i][0] + (-dz / L) * off * s;
        const z = line[i][1] + (dx / L) * off * s;
        // (never in a planter, nor off the paving)
        if ((p.planters ?? []).some(([px, pz, r]) => Math.hypot(px - x, pz - z) < r + 1.2)) continue;
        if (p.rows && !plazaAt(x, z, p.id)) continue;
        out.push([x, z]);
      }
    }
  }
  return out;
}

/** A ring round a point: `n` corners at radius `r`. */
const ringOf = (x, z, r, n) => {
  const xs = [];
  const zs = [];
  for (let k = 0; k < n; k++) {
    xs.push(x + Math.cos((k / n) * Math.PI * 2) * r);
    zs.push(z + Math.sin((k / n) * Math.PI * 2) * r);
  }
  return { xs, zs };
};

/** What a rider can't ride through on the squares (plinths, planters, bollards): rings { xs, zs } for walls.addRing. */
export function plazaRings(ids = null) {
  const out = [];
  for (const p of listOf(ids)) {
    for (const s of p.solids ?? []) out.push({ xs: [s.x - s.w / 2, s.x + s.w / 2, s.x + s.w / 2, s.x - s.w / 2], zs: [s.z - s.d / 2, s.z - s.d / 2, s.z + s.d / 2, s.z + s.d / 2] });
    for (const [x, z, r] of p.planters ?? []) out.push(ringOf(x, z, r, 8));
    for (const [x, z] of plazaBollards(p)) out.push(ringOf(x, z, 0.16, 4));
  }
  return out;
}

/** Where people stand about the squares: { x, z, heading } (heading the race's: facing (−sin, −cos)). */
export function plazaFolk(ids = null) {
  const out = [];
  for (const p of listOf(ids)) for (const [x, z, fx, fz] of p.folk ?? []) out.push({ x, z, heading: Math.atan2(-fx, -fz) });
  return out;
}

/* ------------------------------------------------------------------ drawn */

/** Granite setts: pale grey squares with darker joints, a little mottled. */
function settTexture(color = '#bdb7ac') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = color;
  x.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 600; k++) {
    x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '70,66,60'}, 0.07)`;
    x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  x.strokeStyle = 'rgba(80, 76, 70, 0.55)';
  x.lineWidth = 1.5;
  for (let k = 0; k <= 4; k++) {
    x.beginPath();
    x.moveTo(0, k * 32);
    x.lineTo(128, k * 32);
    x.stroke();
    x.beginPath();
    x.moveTo(k * 32, 0);
    x.lineTo(k * 32, 128);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * The squares drawn: each one's paving laid on the land at PLAZA_LIFT (a strip mesh: the square's rows, or
 * either side of the drive's lane, every few metres so it follows the ground), a kerb round its edge, the
 * granite planters with their shrubs, the bollards (one instanced mesh). Shown within `range` of the camera.
 */
export class PlazaView {
  constructor(scene, ground, { range = 1800 } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'plazas';
    this.range = range;
    this.centres = [];
    scene.add(this.group);
    const paving = new THREE.MeshStandardMaterial({ map: settTexture(), color: '#ffffff', roughness: 0.78, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    const kerb = new THREE.MeshLambertMaterial({ color: '#9c968c' });
    const stone = new THREE.MeshLambertMaterial({ color: '#c9c3b6' });
    const shrub = new THREE.MeshLambertMaterial({ color: '#3f6b3a' });
    const y = (x, z) => ground(x, z) + PLAZA_LIFT;
    for (const p of PLAZAS) {
      const pos = [];
      const uv = [];
      const idx = [];
      const add = (x, z) => {
        pos.push(x, y(x, z), z);
        uv.push(x / 2.4, z / 2.4);
        return pos.length / 3 - 1;
      };
      // a strip: rows of `cols + 1` points across, joined
      const strip = (rowsXZ) => {
        for (let j = 0; j < rowsXZ.length; j++) {
          const row = rowsXZ[j].map(([x, z]) => add(x, z));
          if (j) {
            const prev = rowsXZ[j - 1]._ids;
            for (let i = 0; i < row.length - 1; i++) idx.push(prev[i], row[i], prev[i + 1], prev[i + 1], row[i], row[i + 1]);
          }
          rowsXZ[j]._ids = row;
        }
      };
      const across = [];
      if (p.rows) {
        const z0 = p.rows[0][0];
        const z1 = p.rows[p.rows.length - 1][0];
        for (let z = z0; z >= z1 - 0.01; z -= 4) {
          const [w, e] = rowAt(p, Math.max(z, z1));
          const n = 10;
          across.push(Array.from({ length: n + 1 }, (_, i) => [w + ((e - w) * i) / n, Math.max(z, z1)]));
        }
      } else {
        const line = dense(pavedLine(p), 4);
        const half = p.width / 2 + (p.pad ?? 0);
        for (let i = 0; i < line.length; i++) {
          const q = line[Math.min(line.length - 1, i + 1)];
          const o = line[Math.max(0, i - 1)];
          const dx = q[0] - o[0];
          const dz = q[1] - o[1];
          const L = Math.hypot(dx, dz) || 1;
          across.push([-1, -0.5, 0, 0.5, 1].map((s) => [line[i][0] + (-dz / L) * half * s, line[i][1] + (dx / L) * half * s]));
        }
      }
      strip(across);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      // (wound either way: seen from above whichever it is)
      paving.side = THREE.DoubleSide;
      const mesh = new THREE.Mesh(geo, paving);
      mesh.receiveShadow = true;
      this.group.add(mesh);
      // the kerb: a low granite edge down both long sides, where the paving meets the land (one mesh)
      const edges = [across.map((r) => r[0]), across.map((r) => r[r.length - 1])];
      const kerbs = [];
      const o = new THREE.Object3D();
      for (const e of edges) {
        for (let i = 1; i < e.length; i++) {
          const [ax, az] = e[i - 1];
          const [bx, bz] = e[i];
          const L = Math.hypot(bx - ax, bz - az);
          if (L < 0.2) continue;
          o.position.set((ax + bx) / 2, (y(ax, az) + y(bx, bz)) / 2 - PLAZA_LIFT / 2, (az + bz) / 2);
          o.rotation.set(0, Math.atan2(bx - ax, bz - az), 0);
          o.updateMatrix();
          kerbs.push(new THREE.BoxGeometry(0.3, PLAZA_LIFT + 0.05, L).applyMatrix4(o.matrix));
        }
      }
      if (kerbs.length) this.group.add(new THREE.Mesh(mergeGeometries(kerbs), kerb));
      // the planters: a round granite basin, a mound of clipped shrubs
      for (const [x, z, r] of p.planters ?? []) {
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.7, 16), stone);
        basin.position.set(x, y(x, z) + 0.35, z);
        basin.castShadow = basin.receiveShadow = true;
        const bush = new THREE.Mesh(new THREE.SphereGeometry(r * 0.92, 12, 8), shrub);
        bush.scale.y = 0.6;
        bush.position.set(x, y(x, z) + 0.75, z);
        bush.castShadow = true;
        this.group.add(basin, bush);
      }
      // the bollards: short stone posts with a rounded head, one instanced mesh
      const posts = plazaBollards(p);
      if (posts.length) {
        const g = new THREE.CylinderGeometry(0.13, 0.16, 0.85, 8);
        g.translate(0, 0.425, 0);
        const inst = new THREE.InstancedMesh(g, stone, posts.length);
        const m = new THREE.Matrix4();
        posts.forEach(([x, z], i) => inst.setMatrixAt(i, m.makeTranslation(x, y(x, z), z)));
        inst.castShadow = true;
        this.group.add(inst);
      }
      const b = boundsOf(p);
      this.centres.push(new THREE.Vector3((b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2));
    }
  }

  /** Each frame: shown only near (the camera within `range` of a square's middle). */
  update(camera) {
    const c = camera.position;
    this.group.visible = this.centres.some((v) => Math.hypot(v.x - c.x, v.z - c.z) < this.range);
  }
}
