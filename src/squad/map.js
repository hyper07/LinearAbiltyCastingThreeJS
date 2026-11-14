/**
 * Kestrel Outpost: Bastion Squad's map, our own layout. A mining outpost on
 * a dead world, 140 metres across. The reactor stands in a walled compound
 * at the middle, with a gate in each wall and a healing pad inside. The dead
 * climb out of rifts in the wastes — north, east and west, and from wave 8
 * the south-east too — and come for the gates.
 *
 * x east, z south, metres. Walls are boxes [x, z, wide, deep]; rocks and
 * wreckage outside are circles [x, z, r] that block walking (not shots).
 */

export const SIZE = 140;
export const REACTOR_AT = { x: 70, z: 70, r: 3.2 };
export const PAD = { x: 70, z: 80 };

const GATE = 6; // each gate's width
const LO = 50;
const HI = 90;
const mid = (LO + HI) / 2;
/** The compound's walls, a gate in the middle of each. */
export const WALLS = [
  [LO, LO - 1, mid - GATE / 2 - LO, 2], [mid + GATE / 2, LO - 1, HI - mid - GATE / 2, 2],
  [LO, HI - 1, mid - GATE / 2 - LO, 2], [mid + GATE / 2, HI - 1, HI - mid - GATE / 2, 2],
  [LO - 1, LO, 2, mid - GATE / 2 - LO], [LO - 1, mid + GATE / 2, 2, HI - mid - GATE / 2],
  [HI - 1, LO, 2, mid - GATE / 2 - LO], [HI - 1, mid + GATE / 2, 2, HI - mid - GATE / 2]
];
/** The gates: their middles, and which way is out. */
export const GATES = [
  { id: 'N', x: mid, z: LO, out: [0, -1] },
  { id: 'S', x: mid, z: HI, out: [0, 1] },
  { id: 'W', x: LO, z: mid, out: [-1, 0] },
  { id: 'E', x: HI, z: mid, out: [1, 0] }
];

/** Rocks and wreckage in the wastes: [x, z, radius]. */
export const ROCKS = [
  [40, 30, 3], [100, 28, 2.6], [28, 98, 3.2], [114, 96, 2.8], [62, 24, 2.2], [24, 56, 2.4], [118, 84, 2.4], [84, 118, 2.6],
  [36, 122, 2], [124, 40, 2.2], [16, 18, 3], [126, 14, 2.4], [52, 108, 2], [98, 60, 1.6], [42, 82, 1.8]
];

/** The outpost's buildings in the compound's corners: [x, z, radius, model]; they block walking too. */
export const DECOR = [
  [56, 56, 2.6, 'basemodule_garage'], [84, 56, 2.4, 'basemodule_E'], [56, 84, 2.4, 'basemodule_C'], [84, 84, 2.6, 'basemodule_A'],
  [60, 70, 1.2, 'cargo_A_stacked'], [80, 66, 1.2, 'cargo_B_stacked']
];

/** Where the dead climb out, and the way each comes in. The south-east rift opens at wave 8. */
export const RIFTS = [
  { id: 'north', x: 70, z: 8, path: [[70, 8], [70, 30], [70, 47]], from: 1 },
  { id: 'east', x: 132, z: 70, path: [[132, 70], [110, 70], [93, 70]], from: 1 },
  { id: 'west', x: 8, z: 70, path: [[8, 70], [30, 70], [47, 70]], from: 1 },
  { id: 'southeast', x: 126, z: 126, path: [[126, 126], [104, 106], [76, 100], [70, 93]], from: 8 }
];

/** Where each soldier starts: around the reactor. */
export const SPAWN = [[66, 76], [74, 76], [66, 64], [74, 64]];

const inBox = (x, z, [bx, bz, w, d], r) => x > bx - r && x < bx + w + r && z > bz - r && z < bz + d + r;

/** Is a circle of radius r at (x, z) clear of walls and rocks (and inside the map)? */
export function clear(x, z, r = 0.5) {
  if (x < r || z < r || x > SIZE - r || z > SIZE - r) return false;
  for (const w of WALLS) if (inBox(x, z, w, r)) return false;
  for (const [rx, rz, rr] of ROCKS) if (Math.hypot(x - rx, z - rz) < rr + r) return false;
  for (const [rx, rz, rr] of DECOR) if (Math.hypot(x - rx, z - rz) < rr + r) return false;
  if (Math.hypot(x - REACTOR_AT.x, z - REACTOR_AT.z) < REACTOR_AT.r + r) return false;
  return true;
}

/** Is a point inside the compound? */
export const inside = (x, z) => x > LO && x < HI && z > LO && z < HI;

/** Does a straight walk from a to b cross a wall? */
export function crossesWall(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
  for (let i = 1; i <= n; i++) {
    const x = ax + ((bx - ax) * i) / n;
    const z = az + ((bz - az) * i) / n;
    for (const w of WALLS) if (inBox(x, z, w, 0.3)) return true;
  }
  return false;
}

/**
 * A way from here to there: straight, or — when a wall is between — out of
 * (or into) the compound through whichever gate makes it shortest.
 */
export function way(ax, az, bx, bz) {
  return roundRocks([[ax, az], ...throughGates(ax, az, bx, bz)]).slice(1);
}

/** The round things in the way of a straight walk: the reactor, the outpost's buildings, rocks. */
const ROUND = () => [[REACTOR_AT.x, REACTOR_AT.z, REACTOR_AT.r], ...DECOR.map(([x, z, r]) => [x, z, r]), ...ROCKS];

/** Bend each leg of a walk round any round obstacle it would run into: a point beside it, on the nearer side. */
function roundRocks(points) {
  const out = [points[0]];
  for (let k = 1; k < points.length; k++) {
    const [ax, az] = out[out.length - 1];
    const [bx, bz] = points[k];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    let hit = null;
    for (const [cx, cz, r] of ROUND()) {
      const t = ((cx - ax) * dx + (cz - az) * dz) / len2;
      if (t <= 0 || t >= 1) continue;
      const px = ax + dx * t;
      const pz = az + dz * t;
      const miss = Math.hypot(px - cx, pz - cz);
      if (miss < r + 0.9 && (!hit || t < hit.t)) hit = { t, cx, cz, r, px, pz, miss };
    }
    if (hit) {
      // Step out sideways from the obstacle's middle, past its edge.
      let nx = hit.px - hit.cx;
      let nz = hit.pz - hit.cz;
      const n = Math.hypot(nx, nz);
      if (n < 1e-3) [nx, nz] = [-dz, dx];
      const m = Math.hypot(nx, nz) || 1;
      out.push([hit.cx + (nx / m) * (hit.r + 1.8), hit.cz + (nz / m) * (hit.r + 1.8)]);
    }
    out.push([bx, bz]);
  }
  return out;
}

function throughGates(ax, az, bx, bz) {
  if (!crossesWall(ax, az, bx, bz)) return [[bx, bz]];
  let best = null;
  for (const g of GATES) {
    const inner = [g.x - g.out[0] * 3, g.z - g.out[1] * 3];
    const outer = [g.x + g.out[0] * 3, g.z + g.out[1] * 3];
    const [first, second] = inside(ax, az) ? [inner, outer] : [outer, inner];
    const len = Math.hypot(first[0] - ax, first[1] - az) + Math.hypot(second[0] - first[0], second[1] - first[1]) + Math.hypot(bx - second[0], bz - second[1]);
    if (!best || len < best.len) best = { len, path: [first, second, [bx, bz]] };
  }
  return best.path;
}
