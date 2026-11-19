/**
 * Gloamreach's starting map, as plain data: where the village of
 * Brindlewick, the Warden's Gate, the Gloamwood and the Cinder Rift overlook
 * are; the roads; every building, tree, lamp and fence. Pure — no three.js —
 * so the terrain, collision and minimap are built from it, and tests read it.
 *
 * Coordinates are metres: x east, z south, y up. The hero starts south of
 * Brindlewick's square, looking north at the Elder Oak.
 */
import { rng, smoothstep } from './noise.js';

/** The main terrain's extent (the rift beyond the east cliff is a mesh of its own). */
export const EXTENT = { x0: -200, x1: 160, z0: -400, z1: 170 };

/** The places, for the minimap and the area banner. */
export const AREAS = [
  { id: 'village', name: 'Brindlewick', sub: 'a village at the turn of the light', x: 0, z: 0 },
  { id: 'gate', name: "The Warden's Gate", sub: 'carved before the village had a name', x: 0, z: -142 },
  { id: 'gloamwood', name: 'The Gloamwood', sub: 'where the dusk never ends', x: 0, z: -240 },
  { id: 'overlook', name: 'Cinder Rift Overlook', sub: 'mind the edge', x: 126, z: 0 },
  { id: 'stair', name: 'The Cinder Stair', sub: 'the way down into the rift', x: 122, z: -44 }
];

export const START = { x: 1.5, z: 40, yaw: Math.PI }; // yaw π: facing −z (north)

/** Walkable regions as rounded boxes (signed distance < 0 inside). */
export const REGIONS = {
  village: { x0: -112, x1: 104, z0: -116, z1: 108, r: 26 },
  promontory: { x0: 92, x1: 139, z0: -20, z1: 20, r: 6 },
  gloamwood: { x0: -96, x1: 96, z0: -330, z1: -164, r: 30 },
  // A shelf above the rift, north of the overlook along the cliff: the Cinder Stair goes down from here.
  ledge: { x0: 104, x1: 140, z0: -66, z1: -12, r: 12 }
};

/** The shelf at the head of the Cinder Stair (the drake's brood now nests below, in the rift: rift.js). */
export const LEDGE = { x: 123, z: -45, r: 15 };

/** The ridge the Warden's Gate cuts through, and the canyon the road takes. */
export const RIDGE = { z0: -162, z1: -124, height: 46 };
export const GATE = { x: 0, z0: -154, z1: -130, width: 10.5, height: 12.5, outerHalfWidth: 26, top: 36, floor: 0.4 };
export const PLAZA = { x: 1, z: 2, r: 22 };
export const CLIFF_X = 137;

/** Roads: polylines with a half-width and a surface (cobble, dirt, wetcobble). */
export const ROADS = [
  { id: 'south', surface: 'dirt', half: 3.2, pts: [[0, 112], [3, 86], [1, 58], [0, 30]] },
  { id: 'north', surface: 'dirt', half: 3.2, pts: [[0, -18], [-2, -30], [3, -52], [6, -74], [2, -98], [0, -114], [0, -126]] },
  { id: 'gatecobble', surface: 'cobble', half: 4.6, pts: [[0, -112], [0, -128], [0, -160], [0, -168]] },
  { id: 'forest', surface: 'wetcobble', half: 2.9, pts: [[0, -164], [-6, -182], [-12, -204], [-4, -228], [9, -248], [8, -268], [-4, -288], [-2, -304], [0, -312]] },
  { id: 'east', surface: 'dirt', half: 2.4, pts: [[18, 2], [42, 4], [66, 11], [92, 6], [114, 1], [131, 0]] },
  { id: 'west', surface: 'dirt', half: 2.2, pts: [[-19, 4], [-44, 12], [-66, 22], [-78, 28]] },
  { id: 'lane', surface: 'dirt', half: 1.6, pts: [[-24, -16], [-40, -26], [-52, -22]] }
];

/** Ponds: a basin carved into the ground and a water surface. */
export const PONDS = [
  { x: -86, z: 34, r: 10, level: -0.55, zone: 'village' },
  { x: 36, z: -204, r: 8.5, level: -0.4, zone: 'gloamwood' }
];

/**
 * Buildings. `face` is the angle the front door looks toward (0 = +z, south;
 * π/2 = +x, east). w along the front, d deep, floors above the stone plinth.
 */
export const BUILDINGS = [
  { id: 'inn', kind: 'inn', name: 'The Gilded Acorn', x: -32, z: -8, w: 15, d: 10, floors: 2, face: 1.35, seed: 11 },
  { id: 'h1', kind: 'house', x: 29, z: -17, w: 10, d: 8, floors: 2, face: -0.95, seed: 2 },
  { id: 'h2', kind: 'house', x: 34, z: 18, w: 9, d: 8, floors: 2, face: -2.1, seed: 3 },
  { id: 'h3', kind: 'house', x: -31, z: 23, w: 9, d: 7, floors: 1, face: 2.1, seed: 4 },
  { id: 'h4', kind: 'house', x: -16, z: 40, w: 10, d: 7, floors: 2, face: 2.75, seed: 5 },
  { id: 'h5', kind: 'house', x: 18, z: 41, w: 9, d: 8, floors: 1, face: -2.7, seed: 6 },
  { id: 'smithy', kind: 'smithy', x: 49, z: -8, w: 9, d: 7, floors: 1, face: 0.12, seed: 7 },
  { id: 'h7', kind: 'house', x: -54, z: -5, w: 8, d: 7, floors: 1, face: 1.2, seed: 8 },
  { id: 'h8', kind: 'house', x: -46, z: 36, w: 8, d: 6, floors: 1, face: 1.9, seed: 9 },
  { id: 'h9', kind: 'house', x: 54, z: 26, w: 8, d: 7, floors: 2, face: -2.4, seed: 10 },
  { id: 'h10', kind: 'house', x: 72, z: -12, w: 8, d: 7, floors: 1, face: 0.3, seed: 12 }
];

/** Houses grown into the roots of the Gloamwood's great trees. */
export const ROOT_HOUSES = [
  { id: 'r1', x: -27, z: -212, face: 1.4, r: 5.5, seed: 21 },
  { id: 'r2', x: 29, z: -262, face: -1.6, r: 5, seed: 22 },
  { id: 'r3', x: -24, z: -290, face: 1.1, r: 4.8, seed: 23 }
];

export const WELL = { x: -4, z: 5, r: 1.7 };
export const STALLS = [
  { x: 14, z: -8, face: -1.9, cloth: 'crimson', goods: 'apples' },
  { x: 17, z: 5, face: -1.55, cloth: 'ochre', goods: 'cloth' },
  { x: 11, z: 16, face: -0.9, cloth: 'teal', goods: 'pumpkins' },
  // The armsmonger's stall, across the square: blades on a rack, potions on the counter.
  { x: -15, z: 9, face: 1.75, cloth: 'crimson', goods: 'arms' }
];
export const SIGNPOST = { x: -6.5, z: -20, face: 0.15 };
export const OVERLOOK = { x: 129, z: 0, face: Math.PI / 2 };

/** The giants: trees a hundred feet tall around the village (x, z, trunk radius, height). */
export const ELDER_TREES = [
  { x: -8, z: -48, r: 3.7, h: 50, seed: 101 },
  { x: 19, z: -66, r: 2.9, h: 44, seed: 102 },
  { x: -46, z: -42, r: 3.1, h: 46, seed: 103 },
  { x: 56, z: -42, r: 2.7, h: 42, seed: 104 },
  { x: -62, z: 46, r: 2.9, h: 44, seed: 105 },
  { x: 62, z: 60, r: 2.5, h: 40, seed: 106 },
  { x: -26, z: 72, r: 2.4, h: 38, seed: 107 },
  { x: 86, z: -34, r: 2.3, h: 36, seed: 108 },
  { x: -84, z: -60, r: 2.8, h: 42, seed: 109 },
  { x: 36, z: 86, r: 2.4, h: 38, seed: 110 }
];

/** The Gloamwood's twisted giants (the root houses' trees are added to these). */
export const GLOAM_GIANTS = [
  { x: 22, z: -186, r: 4.2, h: 48, seed: 201 },
  { x: -36, z: -246, r: 4.6, h: 52, seed: 202 },
  { x: 40, z: -230, r: 3.8, h: 46, seed: 203 },
  { x: 24, z: -300, r: 4.4, h: 50, seed: 204 },
  { x: -50, z: -186, r: 3.6, h: 44, seed: 205 },
  { x: 60, z: -280, r: 3.9, h: 46, seed: 206 },
  { x: -62, z: -270, r: 4, h: 46, seed: 207 },
  { x: 2, z: -330, r: 4.8, h: 54, seed: 208 }
];

/* ------------------------------------------------------------------ geometry helpers */

/** Signed distance to a rounded box region (negative inside). */
export function regionSdf(reg, x, z) {
  const cx = (reg.x0 + reg.x1) / 2;
  const cz = (reg.z0 + reg.z1) / 2;
  const hx = (reg.x1 - reg.x0) / 2 - reg.r;
  const hz = (reg.z1 - reg.z0) / 2 - reg.r;
  const qx = Math.abs(x - cx) - hx;
  const qz = Math.abs(z - cz) - hz;
  const ox = Math.max(qx, 0);
  const oz = Math.max(qz, 0);
  return Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0) - reg.r;
}

/** Distance from a point to segment ab, and the parameter along it. */
export function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz || 1e-9;
  let t = ((px - ax) * dx + (pz - az) * dz) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + dx * t - px;
  const qz = az + dz * t - pz;
  return [Math.sqrt(qx * qx + qz * qz), t];
}

/** Nearest road to a point: { d (to its edge, negative on it), road }. */
export function nearestRoad(x, z, roads = ROADS) {
  let best = Infinity;
  let which = null;
  for (const road of roads) {
    for (let i = 0; i < road.pts.length - 1; i++) {
      const [a, b] = [road.pts[i], road.pts[i + 1]];
      const [d] = segDist(x, z, a[0], a[1], b[0], b[1]);
      const e = d - road.half;
      if (e < best) {
        best = e;
        which = road;
      }
    }
  }
  return { d: best, road: which };
}

/** How far into the Gloamwood a point is: 0 in Brindlewick, 1 past the gate (through the tunnel). */
export function gloamAt(z) {
  return smoothstep(-134, -158, z);
}

/** Which area a point is in, for the banner and the minimap. */
export function areaAt(x, z) {
  if (z < -160) return 'gloamwood';
  if (z < -118) return 'gate';
  if (x > 104 && z < -22) return 'stair';
  if (x > 104) return 'overlook';
  return 'village';
}

/** Building footprint corners in the world, for collision, pads and the minimap. */
export function footprint(b, pad = 0) {
  const c = Math.cos(b.face);
  const s = Math.sin(b.face);
  const hw = b.w / 2 + pad;
  const hd = b.d / 2 + pad;
  // Local +z is the front (toward `face`); local +x is to its left as you face the door from outside.
  const pts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
  return pts.map(([lx, lz]) => [b.x + lx * c + lz * s, b.z - lx * s + lz * c]);
}

/** The world point at local (lx, lz) of something at (x, z) facing `face`. */
export function toWorld(o, lx, lz) {
  const c = Math.cos(o.face);
  const s = Math.sin(o.face);
  return [o.x + lx * c + lz * s, o.z - lx * s + lz * c];
}

/* ------------------------------------------------------------------ scattered things */

/** Is (x, z) clear of roads, buildings, the plaza and ponds by `m` metres? */
export function isClear(x, z, m = 2) {
  if (nearestRoad(x, z).d < m) return false;
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + m) return false;
  for (const b of BUILDINGS) if (Math.hypot(x - b.x, z - b.z) < Math.max(b.w, b.d) * 0.62 + m) return false;
  for (const p of PONDS) if (Math.hypot(x - p.x, z - p.z) < p.r + m) return false;
  for (const r of ROOT_HOUSES) if (Math.hypot(x - r.x, z - r.z) < r.r + 6 + m) return false;
  if (Math.abs(x - WELL.x) < 3 + m && Math.abs(z - WELL.z) < 3 + m) return false;
  if (z < -112 && z > -172 && Math.abs(x) < GATE.outerHalfWidth + m) return false;
  return true;
}

/**
 * Ordinary trees: a seeded scatter, denser toward the edges (the forest
 * walls that bound the map), sparse in the village, none on roads.
 * Returns [{ x, z, s (scale), kind: 'oak'|'birch'|'gloam', seed }].
 */
export function scatterTrees(seed = 5) {
  const r = rng(seed);
  const out = [];
  const giants = [...ELDER_TREES, ...GLOAM_GIANTS, ...ROOT_HOUSES.map((h) => ({ x: h.x, z: h.z, r: 4 }))];
  const cell = 6;
  const taken = new Map();
  const key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  const near = (x, z, min) => {
    const cx = Math.floor(x / cell);
    const cz = Math.floor(z / cell);
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        for (const t of taken.get(`${cx + i},${cz + j}`) ?? []) if (Math.hypot(t.x - x, t.z - z) < min) return true;
      }
    }
    return false;
  };
  for (let n = 0; n < 26000 && out.length < 760; n++) {
    const x = EXTENT.x0 + 20 + r() * (CLIFF_X - 2 - EXTENT.x0 - 20);
    const z = EXTENT.z0 + 40 + r() * (EXTENT.z1 - 30 - EXTENT.z0 - 40);
    const dV = Math.min(regionSdf(REGIONS.village, x, z), regionSdf(REGIONS.promontory, x, z));
    const dF = regionSdf(REGIONS.gloamwood, x, z);
    const inRidge = z < RIDGE.z1 + 4 && z > RIDGE.z0 - 4;
    if (inRidge) continue;
    if (x > 100 && Math.abs(z) < 26) continue; // the overlook stays open
    const forest = z < -150;
    const d = forest ? dF : dV;
    // Wanted density: a wall of trees past the edge, a light scatter inside.
    let want = d > -2 ? 1 : d > -16 ? 0.55 : forest ? 0.32 : 0.12;
    if (d > 46) want = 0.25; // far up the hills: thinner, they're mostly hidden
    if (!forest && Math.hypot(x, z) < 52) want *= 0.25; // the village itself stays open
    if (r() > want) continue;
    if (!isClear(x, z, forest ? 3 : 4)) continue;
    let blocked = false;
    for (const g of giants) if (Math.hypot(g.x - x, g.z - z) < (g.r ?? 3) + 7) blocked = true;
    if (blocked) continue;
    const min = forest ? 7.5 : d > -2 ? 6.5 : 9;
    if (near(x, z, min)) continue;
    const t = { x, z, s: 0.8 + r() * 0.55, kind: forest ? 'gloam' : r() < 0.18 ? 'birch' : 'oak', seed: Math.floor(r() * 1e6) };
    out.push(t);
    const k = key(x, z);
    if (!taken.has(k)) taken.set(k, []);
    taken.get(k).push(t);
  }
  return out.filter((t) => regionSdf(REGIONS.ledge, t.x, t.z) > 1.5);
}

/** Lamp posts along the Gloamwood path, every ~13 m, side to side. */
export function gloamLamps() {
  const road = ROADS.find((r) => r.id === 'forest');
  const out = [];
  let carry = 6;
  let side = 1;
  for (let i = 0; i < road.pts.length - 1; i++) {
    const [ax, az] = road.pts[i];
    const [bx, bz] = road.pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const nx = -(bz - az) / len;
    const nz = (bx - ax) / len;
    for (let s = carry; s < len; s += 13) {
      const t = s / len;
      out.push({ x: ax + (bx - ax) * t + nx * side * (road.half + 1.3), z: az + (bz - az) * t + nz * side * (road.half + 1.3) });
      side = -side;
      carry = s + 13 - len;
    }
  }
  return out;
}

/** Village lantern posts: around the square and along the roads out. */
export const LANTERNS = [
  [-12, -14], [15, -15], [21, 12], [-17, 16], [6, 23], [-21, -2],
  [-4, 60], [5, 84], [-2.5, -64], [8.5, -92], [3.5, -113], [-4, -113],
  [40, 8], [70, 15], [104, 3.5], [-42, 16], [-66, 26]
];

/** Split-rail fences: polylines (gaps are left where they end). */
export const FENCES = [
  [[-17, -24], [-9, -22.5], [-5.5, -22.5]],
  [[5.5, -22.5], [12, -23], [22, -27]],
  [[-5, -34], [-4, -46], [-1.5, -60]],
  [[9, -36], [10.5, -52], [12, -70]],
  [[-6, 54], [-5, 76], [-3, 98]],
  [[7, 54], [8, 74], [7.5, 96]],
  [[-60, 14], [-74, 18], [-92, 20], [-100, 30]],
  [[62, 18], [80, 16], [96, 12]],
  [[110, 12], [122, 16]],
  [[110, -10], [122, -14]]
];

/** Flower beds: [x, z, radius, kind]. */
export const FLOWER_BEDS = [
  [-12, -22, 3.2, 'poppy'], [12, -24, 3, 'poppy'], [-8, -36, 2.4, 'poppy'], [6, -40, 2.2, 'marigold'],
  [-24, -2, 2.2, 'poppy'], [22, -10, 2, 'marigold'], [-24, 14, 2.4, 'poppy'], [25, 12, 2.2, 'poppy'],
  [-9, 30, 2.4, 'marigold'], [10, 32, 2.4, 'poppy'], [-70, 34, 6, 'poppy'], [-92, 42, 5, 'marigold'],
  [-4, 72, 3, 'poppy'], [9, 64, 3, 'poppy'], [-30, -26, 2.2, 'poppy'], [40, -2, 2.2, 'marigold'],
  [116, 8, 3, 'poppy'], [108, -8, 3, 'poppy']
];
