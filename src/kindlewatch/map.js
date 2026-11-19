/**
 * Kindlewatch Keep: the starting map, as data. Pure (no DOM, no three.js),
 * deterministic, tested in tests/unit/kindlewatch.test.mjs.
 *
 * World units are tiles: x grows east, y grows *north* (up the screen). A
 * tile (x, y) covers [x, x+1) × [y, y+1). Six rooms, joined by corridors cut
 * through thick snow-capped walls:
 *
 *                     [ The Rime Throne ]            boss arena
 *                            | Rime Gate (three beacons open it)
 *   [ Frozen Garden ]—[ Brazier Court ]—[ Bone Cloister ]
 *                            | barricade               | barricade
 *                     [ Gatehouse Yard ]——[ Fallen Rampart ]
 *                          (start)
 */

export const W = 92;
export const H = 82;
export const WALL = 0;
export const FLOOR = 1;

/** Full height of a wall's front face, in tiles (walls south of a room step down so they don't hide the floor). */
export const WALL_H = 1.7;

export const ROOMS = [
  { id: 'yard', name: 'Gatehouse Yard', x0: 34, y0: 4, x1: 55, y1: 19 },
  { id: 'court', name: 'Brazier Court', x0: 32, y0: 26, x1: 57, y1: 45 },
  { id: 'garden', name: 'Frozen Garden', x0: 6, y0: 25, x1: 25, y1: 45 },
  { id: 'cloister', name: 'Bone Cloister', x0: 64, y0: 26, x1: 85, y1: 44 },
  { id: 'rampart', name: 'Fallen Rampart', x0: 64, y0: 4, x1: 85, y1: 19 },
  { id: 'throne', name: 'The Rime Throne', x0: 32, y0: 52, x1: 57, y1: 77, circle: { cx: 45, cy: 64.6, r: 12.6 } }
];

/** Corridors through the walls, with what stands in each. */
export const CORRIDORS = [
  { from: 'yard', to: 'court', x0: 43, y0: 20, x1: 46, y1: 25, door: { kind: 'barricade', y: 22 } },
  { from: 'court', to: 'garden', x0: 26, y0: 34, x1: 31, y1: 37 },
  { from: 'court', to: 'cloister', x0: 58, y0: 34, x1: 63, y1: 37 },
  { from: 'cloister', to: 'rampart', x0: 73, y0: 20, x1: 76, y1: 25, door: { kind: 'barricade', y: 23 } },
  { from: 'yard', to: 'rampart', x0: 56, y0: 10, x1: 63, y1: 13 },
  { from: 'court', to: 'throne', x0: 43, y0: 46, x1: 46, y1: 53, door: { kind: 'gate', y: 49 } }
];

/** Wall left standing inside a room's rectangle, so rooms aren't plain boxes. */
const NOTCHES = [
  [34, 4, 35, 5], [54, 4, 55, 5], [34, 18, 34, 19], [55, 18, 55, 19],
  [32, 26, 33, 27], [56, 44, 57, 45], [32, 45, 32, 45], [57, 26, 57, 26],
  [6, 25, 7, 26], [24, 25, 25, 26], [6, 44, 6, 45], [25, 45, 25, 45],
  [64, 26, 64, 27], [85, 43, 85, 44], [85, 26, 85, 26],
  [64, 4, 65, 6], [85, 4, 85, 5], [64, 19, 65, 19]
];

/**
 * Everything that stands in the keep. `h` is the height in tiles (what a
 * shadow ray must clear); `solid` blocks walking. Lights: braziers (`lit`,
 * `beacon` for the three that open the Rime Gate) and wall torches.
 */
const P = (kind, x, y, extra = {}) => ({ kind, x, y, ...extra });

export const PROP_KINDS = {
  block: { h: 1.0, solid: true, w: 1, d: 1 },
  pillar: { h: 2.4, solid: true, w: 1, d: 1 },
  brazier: { h: 1.45, solid: true, w: 1, d: 1, light: true },
  greatbrazier: { h: 1.75, solid: true, w: 1, d: 1, light: true },
  torch: { h: 0, solid: false, w: 1, d: 1, light: true },
  barricade: { h: 0.95, solid: true, w: 1, d: 1, breakable: true },
  gate: { h: 2.6, solid: true, w: 4, d: 1 },
  fountain: { h: 0.95, solid: true, w: 3, d: 3 },
  hedge: { h: 1.0, solid: true, w: 1, d: 1 },
  tree: { h: 3.2, solid: true, w: 1, d: 1 },
  statue: { h: 2.3, solid: true, w: 1, d: 1 },
  bench: { h: 0.5, solid: true, w: 2, d: 1 },
  lowwall: { h: 0.85, solid: true, w: 1, d: 1 },
  sarcophagus: { h: 0.8, solid: true, w: 2, d: 1 },
  fence: { h: 0.75, solid: true, w: 1, d: 1 },
  crate: { h: 0.8, solid: true, w: 1, d: 1, breakable: true },
  pot: { h: 0.6, solid: true, w: 1, d: 1, breakable: true },
  banner: { h: 0, solid: false, w: 1, d: 1 },
  throne: { h: 2.8, solid: true, w: 3, d: 2 },
  rubble: { h: 0, solid: false, w: 1, d: 1 },
  bones: { h: 0, solid: false, w: 1, d: 1 }
};

export const PROPS = [
  // ---- Gatehouse Yard (start)
  P('brazier', 41, 17, { lit: true }), P('brazier', 48, 17, { lit: true }),
  P('torch', 37, 19, { lit: true }), P('torch', 52, 19, { lit: false }),
  P('block', 36, 19), P('block', 36, 18), P('block', 53, 19), P('block', 54, 17),
  P('pillar', 38, 12), P('pillar', 51, 12),
  P('crate', 36, 8), P('crate', 36, 9), P('crate', 37, 7), P('pot', 53, 7), P('pot', 53, 8), P('pot', 52, 6),
  P('lowwall', 40, 7), P('lowwall', 41, 7), P('rubble', 42, 7), P('bones', 47, 9),
  P('barricade', 43, 22), P('barricade', 44, 22), P('barricade', 45, 22), P('barricade', 46, 22),
  P('banner', 39, 19), P('banner', 50, 19),
  // ---- Brazier Court (the heart of the keep)
  P('greatbrazier', 39, 37, { lit: true }),
  P('pillar', 46, 31), P('pillar', 34, 32),
  P('block', 34, 45), P('block', 33, 44), P('block', 33, 43), P('block', 55, 45), P('block', 55, 44), P('block', 56, 27), P('block', 57, 28), P('block', 33, 28),
  P('lowwall', 48, 40), P('lowwall', 49, 40), P('lowwall', 50, 40), P('lowwall', 36, 29), P('lowwall', 37, 29),
  P('torch', 41, 45, { lit: true }), P('torch', 48, 45, { lit: true }),
  P('banner', 37, 45), P('banner', 52, 45),
  P('pot', 34, 40), P('pot', 34, 39), P('crate', 56, 31), P('rubble', 43, 33), P('bones', 52, 30),
  P('gate', 43, 49),
  // ---- Frozen Garden
  P('fountain', 14, 34),
  P('hedge', 9, 40), P('hedge', 10, 40), P('hedge', 11, 40), P('hedge', 19, 40), P('hedge', 20, 40), P('hedge', 21, 40),
  P('hedge', 9, 30), P('hedge', 10, 30), P('hedge', 11, 30), P('hedge', 19, 30), P('hedge', 20, 30), P('hedge', 21, 30),
  P('tree', 8, 43), P('tree', 23, 43), P('tree', 8, 28), P('tree', 23, 28),
  P('bench', 13, 40), P('bench', 17, 30),
  P('statue', 11, 44), P('statue', 20, 44),
  P('brazier', 15, 44, { lit: false, beacon: 'garden' }),
  P('torch', 8, 45, { lit: false }), P('torch', 23, 45, { lit: true }),
  P('pot', 24, 32), P('pot', 24, 33), P('rubble', 7, 36),
  // ---- Bone Cloister
  P('pillar', 67, 30), P('pillar', 71, 30), P('pillar', 78, 30), P('pillar', 82, 30),
  P('pillar', 67, 40), P('pillar', 71, 40), P('pillar', 78, 40), P('pillar', 82, 40),
  P('sarcophagus', 68, 35), P('sarcophagus', 80, 35),
  P('brazier', 75, 43, { lit: false, beacon: 'cloister' }),
  P('banner', 68, 44), P('banner', 72, 44), P('banner', 79, 44), P('banner', 83, 44),
  P('torch', 70, 44, { lit: true }), P('torch', 81, 44, { lit: true }),
  P('crate', 84, 27), P('crate', 84, 28), P('pot', 83, 27), P('bones', 74, 33), P('bones', 79, 38), P('bones', 66, 33),
  P('barricade', 73, 23), P('barricade', 74, 23), P('barricade', 75, 23), P('barricade', 76, 23),
  // ---- Fallen Rampart
  P('block', 66, 15), P('block', 67, 15), P('block', 66, 16), P('block', 84, 7), P('block', 83, 6), P('block', 79, 16), P('block', 78, 16, { cap: 'low' }),
  P('lowwall', 70, 10), P('lowwall', 71, 10), P('lowwall', 72, 10),
  P('fence', 76, 13), P('fence', 77, 13), P('fence', 80, 13), P('fence', 81, 13), P('fence', 82, 13),
  P('brazier', 83, 18, { lit: false, beacon: 'rampart' }),
  P('torch', 68, 19, { lit: true }), P('torch', 80, 19, { lit: false }),
  P('crate', 67, 6), P('crate', 68, 6), P('pot', 69, 6), P('rubble', 74, 16), P('rubble', 69, 13), P('bones', 81, 9),
  // ---- The Rime Throne
  P('brazier', 38, 58, { lit: true, arena: true }), P('brazier', 51, 58, { lit: true, arena: true }),
  P('brazier', 38, 71, { lit: true, arena: true }), P('brazier', 51, 71, { lit: true, arena: true }),
  P('pillar', 34, 64), P('pillar', 55, 64), P('pillar', 40, 75), P('pillar', 49, 75),
  P('throne', 43, 74),
  P('bones', 42, 61), P('rubble', 48, 67)
];

/** Snow piled deep (r in tiles, a = amount); negative a clears it (melted round fires, swept paths). */
export const SNOW = [
  { x: 35, y: 15, r: 4, a: 1 }, { x: 54, y: 9, r: 3.5, a: 1 }, { x: 45, y: 4, r: 4, a: 0.8 },
  { x: 44.5, y: 13, r: 3, a: -0.6 }, { x: 44.5, y: 8, r: 2.4, a: -0.4 },
  { x: 33, y: 38, r: 4.5, a: 1 }, { x: 57, y: 42, r: 3.5, a: 1 }, { x: 46, y: 26, r: 3, a: 0.9 }, { x: 52, y: 28, r: 3, a: 0.6 },
  { x: 39.5, y: 37.5, r: 5.5, a: -1 },
  { x: 7, y: 33, r: 4, a: 1 }, { x: 24, y: 41, r: 3.5, a: 1 }, { x: 15, y: 26, r: 4, a: 1 }, { x: 15.5, y: 35.5, r: 3, a: 0.5 },
  { x: 85, y: 36, r: 4, a: 1 }, { x: 75, y: 35, r: 3, a: -0.5 },
  { x: 72, y: 4, r: 4, a: 1 }, { x: 85, y: 12, r: 4, a: 1 }, { x: 64, y: 10, r: 3, a: 0.9 },
  { x: 45, y: 64.6, r: 5, a: -0.5 }, { x: 33, y: 70, r: 4, a: 1 }, { x: 57, y: 60, r: 4, a: 1 }
];

/** Ice you slide on: ellipses (rx, ry in tiles, rot in radians). */
export const ICE = [
  { x: 49.5, y: 9.5, rx: 2.2, ry: 1.3, rot: 0.2 },
  { x: 53.5, y: 36.5, rx: 3.4, ry: 5.2, rot: 0.05 },
  { x: 41.5, y: 29.5, rx: 1.6, ry: 0.9, rot: -0.3 },
  { x: 15.5, y: 35.5, rx: 6.4, ry: 5.0, rot: 0 },
  { x: 21.5, y: 26.8, rx: 2.4, ry: 1.2, rot: 0.3 },
  { x: 70.5, y: 6.5, rx: 3.4, ry: 1.6, rot: -0.1 },
  { x: 75.5, y: 31.5, rx: 2.0, ry: 1.1, rot: 0.4 },
  { x: 40.5, y: 66, rx: 3.0, ry: 2.0, rot: 0.5 },
  { x: 50, y: 62, rx: 2.4, ry: 1.6, rot: -0.4 }
];

/** Who waits in each room (they wake when you walk in). */
export const SPAWNS = {
  yard: [{ type: 'imp', x: 44.5, y: 15.5 }, { type: 'imp', x: 48, y: 14 }, { type: 'slime', x: 40.5, y: 13.5, size: 2 }],
  court: [
    { type: 'imp', x: 41, y: 40 }, { type: 'imp', x: 43, y: 34.5 }, { type: 'imp', x: 36.5, y: 34 },
    { type: 'slime', x: 50.5, y: 33.5, size: 3 }, { type: 'sentinel', x: 45, y: 42.5 }
  ],
  garden: [
    { type: 'slime', x: 12, y: 37, size: 3 }, { type: 'slime', x: 19.5, y: 34, size: 3 }, { type: 'slime', x: 10.5, y: 27.5, size: 2 },
    { type: 'archer', x: 20.5, y: 42.5 }, { type: 'imp', x: 17, y: 27.5 }
  ],
  cloister: [
    { type: 'sentinel', x: 72.5, y: 37.5 }, { type: 'sentinel', x: 79, y: 33 }, { type: 'archer', x: 83.5, y: 42 },
    { type: 'imp', x: 67.5, y: 36.5 }, { type: 'imp', x: 75.5, y: 29.5 }
  ],
  rampart: [
    { type: 'gorehorn', x: 75.5, y: 8 }, { type: 'gorehorn', x: 72.5, y: 15.5 }, { type: 'imp', x: 68.5, y: 12.5 },
    { type: 'slime', x: 82.5, y: 10.5, size: 2 }, { type: 'archer', x: 66, y: 18 }
  ],
  throne: [{ type: 'jarl', x: 45, y: 68.5 }]
};

export const START = { x: 44.5, y: 7.2 };
export const BEACONS = ['garden', 'cloister', 'rampart'];

/* ------------------------------------------------------------ building */

const inRect = (x, y, r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
const inRoom = (x, y, room) => (room.circle ? Math.hypot(x + 0.5 - room.circle.cx, y + 0.5 - room.circle.cy) <= room.circle.r : inRect(x, y, room));

/** The tile grid: WALL or FLOOR, row-major (index y * W + x). */
export function buildGrid() {
  const grid = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (ROOMS.some((r) => inRoom(x, y, r)) || CORRIDORS.some((c) => inRect(x, y, c))) grid[y * W + x] = FLOOR;
    }
  }
  for (const [x0, y0, x1, y1] of NOTCHES) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y * W + x] = WALL;
  return grid;
}

export const tileAt = (grid, x, y) => (x < 0 || y < 0 || x >= W || y >= H ? WALL : grid[(y | 0) * W + (x | 0)]);

/** Which room a point is in (corridors belong to none): its id, or null. */
export function roomAt(x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  for (const r of ROOMS) if (inRoom(tx, ty, r)) return r.id;
  return null;
}

/**
 * Height of each wall tile's front face: full height (WALL_H) unless floor
 * lies just to the north — then it steps down so the room behind still shows.
 */
export function wallHeights(grid) {
  const h = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (grid[y * W + x] !== WALL) continue;
      let k = 0;
      for (let j = 1; j <= 3; j++) {
        if (tileAt(grid, x, y + j) === FLOOR) {
          k = j;
          break;
        }
      }
      h[y * W + x] = k ? Math.min(WALL_H, Math.max(0.45, k - 1)) : WALL_H;
    }
  }
  return h;
}

/** How far (in tiles, capped) each wall tile is from the nearest floor: the far ones fade into the dark. */
export function wallDepth(grid, cap = 6) {
  const d = new Uint8Array(W * H).fill(255);
  const q = [];
  for (let i = 0; i < W * H; i++) if (grid[i] === FLOOR) {
    d[i] = 0;
    q.push(i);
  }
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi];
    const x = i % W;
    const y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (d[j] !== 255 || d[i] >= cap) continue;
      d[j] = d[i] + 1;
      q.push(j);
    }
  }
  return d;
}

/** Each prop with its kind's numbers filled in and a stable id. */
export function buildProps() {
  return PROPS.map((p, i) => ({ id: i, ...PROP_KINDS[p.kind], ...p }));
}

/** Footprint tiles of a prop. */
export function footprint(p) {
  const out = [];
  for (let dy = 0; dy < (p.d ?? 1); dy++) for (let dx = 0; dx < (p.w ?? 1); dx++) out.push([p.x + dx, p.y + dy]);
  return out;
}

/**
 * The walkable map: true where nothing stands. `open` says which doors are
 * open (a Set of prop ids broken or raised).
 */
export function solidGrid(grid, props, open = new Set()) {
  const solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) solid[i] = grid[i] === WALL ? 1 : 0;
  for (const p of props) {
    if (!p.solid || open.has(p.id)) continue;
    for (const [x, y] of footprint(p)) solid[y * W + x] = 1;
  }
  return solid;
}

/** Tiles reachable from (x, y) without crossing a solid tile (4-way). */
export function reachable(solid, x, y) {
  const seen = new Uint8Array(W * H);
  const start = (y | 0) * W + (x | 0);
  if (solid[start]) return seen;
  const q = [start];
  seen[start] = 1;
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi];
    const cx = i % W;
    const cy = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (seen[j] || solid[j]) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return seen;
}

/** Which rooms can be walked to from the start, given the open doors. */
export function roomsReachable(grid, props, open = new Set()) {
  const seen = reachable(solidGrid(grid, props, open), START.x, START.y);
  const out = new Set();
  for (let i = 0; i < W * H; i++) if (seen[i]) {
    const r = roomAt((i % W) + 0.5, ((i / W) | 0) + 0.5);
    if (r) out.add(r);
  }
  return out;
}

/** Doors (barricades and the gate) in a corridor: the prop ids. */
export function doorsOf(props, corridor) {
  return props.filter((p) => (p.kind === 'barricade' || p.kind === 'gate') && footprint(p).some(([x, y]) => inRect(x, y, corridor))).map((p) => p.id);
}

/* ------------------------------------------------------------ the ground's masks */

/** A small seeded random. */
export function rng(seed = 1) {
  let h = seed >>> 0 || 1;
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash2 = (x, y) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Smooth value noise in [0, 1]. */
export function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1 + 7.3, y * 2.1 - 3.1) * 0.3 + vnoise(x * 4.3 - 1.7, y * 4.3 + 9.2) * 0.15;

/** Mask resolution: samples per tile. */
export const MASK_RES = 4;

/**
 * The ground's masks at MASK_RES samples a tile: snow depth (0…1; drifts
 * pile against walls and melt round fires), ice, and bare earth.
 * Returns Float32Arrays of (W·MASK_RES) × (H·MASK_RES).
 */
export function buildMasks(grid, props) {
  const mw = W * MASK_RES;
  const mh = H * MASK_RES;
  const snow = new Float32Array(mw * mh);
  const ice = new Float32Array(mw * mh);
  const earth = new Float32Array(mw * mh);
  // Distance to the nearest wall (in tiles, capped at 4), for drifts against walls.
  const wallSeed = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) wallSeed[i] = grid[i] === WALL ? 1 : 0;
  const fires = props.filter((p) => p.kind === 'brazier' || p.kind === 'greatbrazier');
  for (let my = 0; my < mh; my++) {
    for (let mx = 0; mx < mw; mx++) {
      const x = (mx + 0.5) / MASK_RES;
      const y = (my + 0.5) / MASK_RES;
      // Nearest wall within 3 tiles (a cheap ring search over tiles).
      let wd = 3;
      const tx = Math.floor(x);
      const ty = Math.floor(y);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        if (tileAt(grid, tx + dx, ty + dy) !== WALL) continue;
        const cx = Math.max(tx + dx, Math.min(x, tx + dx + 1));
        const cy = Math.max(ty + dy, Math.min(y, ty + dy + 1));
        wd = Math.min(wd, Math.hypot(x - cx, y - cy));
      }
      let s = 0.22 + (fbm(x * 0.35, y * 0.35) - 0.5) * 0.9;
      s += Math.max(0, 1 - wd / 2.6) * 0.75 * (0.7 + fbm(x * 0.9 + 3, y * 0.9) * 0.6);
      for (const b of SNOW) {
        const k = Math.max(0, 1 - Math.hypot(x - b.x, y - b.y) / b.r);
        s += b.a * k * k * (3 - 2 * k) * 0.9;
      }
      for (const f of fires) {
        const d = Math.hypot(x - f.x - 0.5, y - f.y - 0.5);
        if (f.lit) s -= Math.max(0, 1 - d / 3.6) * 0.9;
      }
      let ic = 0;
      for (const e of ICE) {
        const c = Math.cos(e.rot);
        const sn = Math.sin(e.rot);
        const lx = ((x - e.x) * c + (y - e.y) * sn) / e.rx;
        const ly = (-(x - e.x) * sn + (y - e.y) * c) / e.ry;
        const r = Math.hypot(lx, ly) + (fbm(x * 1.3, y * 1.3) - 0.5) * 0.35;
        ic = Math.max(ic, Math.min(1, (1 - r) * 4));
      }
      const i = my * mw + mx;
      snow[i] = Math.max(0, Math.min(1, s)) * (1 - ic * 0.92);
      ice[i] = Math.max(0, ic);
      earth[i] = Math.max(0, Math.min(1, (fbm(x * 0.6 + 40, y * 0.6 - 12) - 0.62) * 4));
    }
  }
  return { snow, ice, earth, mw, mh };
}

/** Sample a mask (bilinear) at world (x, y). */
export function sampleMask(mask, mw, mh, x, y) {
  const fx = Math.max(0, Math.min(mw - 1.001, x * MASK_RES - 0.5));
  const fy = Math.max(0, Math.min(mh - 1.001, y * MASK_RES - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const ax = fx - x0;
  const ay = fy - y0;
  const i = y0 * mw + x0;
  return (mask[i] * (1 - ax) + mask[i + 1] * ax) * (1 - ay) + (mask[i + mw] * (1 - ax) + mask[i + mw + 1] * ax) * ay;
}

/** Grass tufts poking through the snow: along walls and in the garden, seeded. */
export function grassTufts(grid, props) {
  const r = rng(77);
  const out = [];
  const solid = solidGrid(grid, props);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (solid[y * W + x]) continue;
      const nearWall = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[(y + dy) * W + x + dx] === WALL);
      const room = roomAt(x + 0.5, y + 0.5);
      const chance = (nearWall ? 0.22 : 0.025) + (room === 'garden' ? 0.12 : 0);
      if (r() < chance) out.push({ x: x + 0.2 + r() * 0.6, y: y + 0.15 + r() * 0.6, s: 0.7 + r() * 0.6, v: (r() * 4) | 0 });
    }
  }
  return out;
}
