/**
 * The shape of the land: one height function for the whole map, built from
 * map.js and seeded noise. Pure — the terrain mesh, the grass, collision,
 * the camera and the tests all sample this same function.
 *
 *   heightAt(x, z)   metres
 *   slopeAt(x, z)    rise per metre (0 flat, 1 is 45°)
 *   surfaceAt(x, z)  'cobble' | 'wetcobble' | 'dirt' | 'grass' | 'moss' | 'rock' | 'water'
 */
import { simplex2, fbm, smoothstep, clamp } from './noise.js';
import { EXTENT, REGIONS, RIDGE, GATE, PLAZA, PONDS, BUILDINGS, ROOT_HOUSES, ROADS, CLIFF_X, WELL, regionSdf, segDist } from './map.js';

const N1 = simplex2(11);
const N2 = simplex2(23);
const N3 = simplex2(37);
const N4 = simplex2(51);

/* ------------------------------------------------------------------ road field */

/** Distance to the nearest road edge of each surface, on a 0.5 m grid (built once). */
const CELL = 0.5;
const GW = Math.ceil((EXTENT.x1 - EXTENT.x0) / CELL) + 1;
const GH = Math.ceil((EXTENT.z1 - EXTENT.z0) / CELL) + 1;
const SURFACES = ['dirt', 'cobble', 'wetcobble'];
let field = null;

function buildField() {
  const f = SURFACES.map(() => new Float32Array(GW * GH).fill(40));
  for (const road of ROADS) {
    const grid = f[SURFACES.indexOf(road.surface)];
    for (let i = 0; i < road.pts.length - 1; i++) {
      const [ax, az] = road.pts[i];
      const [bx, bz] = road.pts[i + 1];
      const m = road.half + 14;
      const gx0 = Math.max(0, Math.floor((Math.min(ax, bx) - m - EXTENT.x0) / CELL));
      const gx1 = Math.min(GW - 1, Math.ceil((Math.max(ax, bx) + m - EXTENT.x0) / CELL));
      const gz0 = Math.max(0, Math.floor((Math.min(az, bz) - m - EXTENT.z0) / CELL));
      const gz1 = Math.min(GH - 1, Math.ceil((Math.max(az, bz) + m - EXTENT.z0) / CELL));
      for (let gz = gz0; gz <= gz1; gz++) {
        const z = EXTENT.z0 + gz * CELL;
        for (let gx = gx0; gx <= gx1; gx++) {
          const x = EXTENT.x0 + gx * CELL;
          // A wavering edge, so roads don't look drawn with a ruler.
          const wob = N3(x * 0.21, z * 0.21) * 0.45 + N4(x * 0.9, z * 0.9) * 0.12;
          const d = segDist(x, z, ax, az, bx, bz)[0] - road.half + wob;
          const k = gz * GW + gx;
          if (d < grid[k]) grid[k] = d;
        }
      }
    }
  }
  return f;
}

function sampleField(grid, x, z) {
  const fx = clamp((x - EXTENT.x0) / CELL, 0, GW - 1.001);
  const fz = clamp((z - EXTENT.z0) / CELL, 0, GH - 1.001);
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const tx = fx - ix;
  const tz = fz - iz;
  const k = iz * GW + ix;
  const a = grid[k] + (grid[k + 1] - grid[k]) * tx;
  const b = grid[k + GW] + (grid[k + GW + 1] - grid[k + GW]) * tx;
  return a + (b - a) * tz;
}

/** Distance to the edge of the nearest road of each surface (negative: on it). */
export function roadDistances(x, z) {
  field ??= buildField();
  return { dirt: sampleField(field[0], x, z), cobble: sampleField(field[1], x, z), wetcobble: sampleField(field[2], x, z) };
}

/* ------------------------------------------------------------------ the height */

/** The gentle rolling ground, without small bumps: what roads and pads follow. */
export function baseHeight(x, z) {
  const forest = smoothstep(-150, -175, z);
  return fbm(N1, x / 90, z / 90, 3) * 2.2 + forest * fbm(N2, x / 34, z / 34, 2) * 1.4;
}

const PLAZA_LEVEL = baseHeight(PLAZA.x, PLAZA.z);
const PADS = [
  ...BUILDINGS.map((b) => ({ b, level: baseHeight(b.x, b.z) + 0.05 })),
  ...ROOT_HOUSES.map((r) => ({ r, level: baseHeight(r.x, r.z) + 0.05 }))
];

/** Distance outside a building's rectangle (negative inside). */
function boxSdf(b, x, z, pad) {
  const c = Math.cos(b.face);
  const s = Math.sin(b.face);
  const dx = x - b.x;
  const dz = z - b.z;
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  const qx = Math.abs(lx) - (b.w / 2 + pad);
  const qz = Math.abs(lz) - (b.d / 2 + pad);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
}

/** How far outside every walkable region a point is (negative inside one). */
export function outside(x, z) {
  const dV = Math.min(regionSdf(REGIONS.village, x, z), regionSdf(REGIONS.promontory, x, z));
  const dF = regionSdf(REGIONS.gloamwood, x, z);
  return Math.min(dV, dF) + N2(x / 28, z / 28) * 7 + N3(x / 9, z / 9) * 1.6;
}

/** The ridge mask (1 on its crest) and the canyon cut through it (1 on the floor). */
function ridgeAndCanyon(x, z) {
  const wob = N1(x / 22, 0.7) * 3 + N2(x / 7, 3.3) * 0.8;
  const into = Math.min(z - (RIDGE.z0 + wob), RIDGE.z1 - wob - z);
  const ridge = smoothstep(-1, 9, into);
  const cx = Math.abs(x - GATE.x) + N3(z / 6, 1.7) * 0.5;
  const along = smoothstep(-178, -168, z) * smoothstep(-104, -114, z);
  let canyon = smoothstep(9.8, 7.6, cx) * along;
  // Wide cuts before each face of the gate, so the whole carved front shows.
  const ax = Math.abs(x - GATE.x) + N2(z / 5, 2.2) * 0.8;
  const south = smoothstep(GATE.z1 + 0.5, GATE.z1 - 0.5, -z + 0 * z) ; void south;
  const wide = smoothstep(GATE.outerHalfWidth + 6, GATE.outerHalfWidth + 2, ax);
  const sCut = smoothstep(-129.2, -130.2, z) * 0 + (z > GATE.z1 - 0.2 && z < -108 ? smoothstep(-108, -114, z) : 0);
  const nCut = z < GATE.z0 + 0.2 && z > -178 ? smoothstep(-178, -172, z) : 0;
  canyon = Math.max(canyon, wide * Math.max(sCut, nCut));
  // Inside the gatehouse's own footprint the floor is the road's.
  if (z <= GATE.z1 && z >= GATE.z0 && ax < GATE.outerHalfWidth) canyon = Math.max(canyon, smoothstep(9.8, 7.6, cx));
  return { ridge, canyon };
}

export function heightAt(x, z) {
  const base = baseHeight(x, z);
  let h = base + fbm(N2, x / 14, z / 14, 3) * 0.32 + N4(x / 3.2, z / 3.2) * 0.05;

  // Hills and cliffs beyond the walkable land: the map's natural walls.
  const d = outside(x, z);
  if (d > -4) {
    const n = fbm(N1, x / 40 + 9, z / 40, 3);
    // Lower toward the east cliff, so the overlook looks out over the rift, not into walls.
    const east = 1 - 0.6 * smoothstep(92, 128, x) * smoothstep(-200, -120, z);
    const rise = (Math.pow(smoothstep(-4, 30, d), 1.25) * (32 + 16 * n) + Math.max(0, d - 30) * 0.55) * east;
    const crags = Math.abs(fbm(N4, x / 11, z / 11, 3)) * 7 * smoothstep(4, 22, d);
    h += rise + crags;
  }

  // The ridge, and the road's canyon through it.
  const { ridge, canyon } = ridgeAndCanyon(x, z);
  if (ridge > 0) {
    const crest = RIDGE.height + fbm(N3, x / 26, z / 26, 4) * 9 + Math.abs(N4(x / 8, z / 8)) * 3;
    h = Math.max(h, h * (1 - ridge) + crest * ridge);
  }
  if (canyon > 0) h += (GATE.floor + baseHeight(x, z) * 0.2 - h) * canyon;

  // The east cliff: the land ends, the rift is seventy metres below.
  const drop = smoothstep(CLIFF_X - 2, CLIFF_X + 3.5, x + N3(z / 7, 3.1) * 2.5 + N4(z / 2.3, 0.2) * 0.6);
  if (drop > 0) h += (-72 + fbm(N1, x / 30, z / 30, 3) * 6 - h) * drop;

  // Roads and the square sit flat on the gentle ground (a little sunk, as worn roads are).
  const rd = roadDistances(x, z);
  const road = Math.min(rd.dirt, rd.cobble, rd.wetcobble);
  if (road < 4 && drop < 0.5) {
    const w = smoothstep(4, -0.5, road);
    h += (base - 0.06 - h) * w * (1 - canyon * 0.0);
  }
  const pd = Math.hypot(x - PLAZA.x, z - PLAZA.z) + N3(x / 9, z / 9) * 2.4;
  if (pd < PLAZA.r + 6) h += (PLAZA_LEVEL - 0.05 - h) * smoothstep(PLAZA.r + 6, PLAZA.r - 2, pd);

  // Level pads under the buildings.
  for (const p of PADS) {
    if (p.b) {
      const sd = boxSdf(p.b, x, z, 0.6);
      if (sd < 4) h += (p.level - h) * smoothstep(4, 0, sd);
    } else {
      const sd = Math.hypot(x - p.r.x, z - p.r.z) - p.r.r - 2;
      if (sd < 5) h += (p.level - h) * smoothstep(5, 0, sd) * 0.85;
    }
  }

  // Ponds: a soft bowl.
  for (const p of PONDS) {
    const pd2 = Math.hypot(x - p.x, z - p.z) / p.r;
    if (pd2 < 1.6) {
      const bowl = p.level - 1.4 * (1 - Math.min(1, pd2 * pd2));
      h = h + (Math.min(h, bowl + (pd2 > 1 ? (pd2 - 1) * 2.2 : 0)) - h) * smoothstep(1.6, 1.0, pd2);
    }
  }
  return h;
}

/** Rise per metre at a point (finite differences of heightAt). */
export function slopeAt(x, z, e = 0.35) {
  const dx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
  const dz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  return Math.hypot(dx, dz);
}

/** The ground's unit normal at a point. */
export function normalAt(x, z, e = 0.35) {
  const dx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
  const dz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  const l = Math.hypot(dx, 1, dz);
  return [-dx / l, 1 / l, -dz / l];
}

/** What the ground is made of at a point (for footsteps and the splat map). */
export function surfaceAt(x, z) {
  for (const p of PONDS) if (Math.hypot(x - p.x, z - p.z) < p.r * 0.92) return 'water';
  const rd = roadDistances(x, z);
  if (rd.wetcobble < 0) return 'wetcobble';
  if (rd.cobble < 0) return 'cobble';
  const pd = Math.hypot(x - PLAZA.x, z - PLAZA.z) + N3(x / 9, z / 9) * 2.4;
  if (pd < PLAZA.r) return 'cobble';
  if (rd.dirt < 0) return 'dirt';
  if (slopeAt(x, z) > 0.95) return 'rock';
  if (Math.abs(x - WELL.x) < 2.2 && Math.abs(z - WELL.z) < 2.2) return 'cobble';
  return z < -160 ? 'moss' : 'grass';
}

/** Plaza membership 0–1 (for the splat map). */
export function plazaAt(x, z) {
  const pd = Math.hypot(x - PLAZA.x, z - PLAZA.z) + N3(x / 9, z / 9) * 2.4 + N4(x / 2.5, z / 2.5) * 0.6;
  return smoothstep(PLAZA.r + 0.6, PLAZA.r - 0.8, pd);
}

/* ------------------------------------------------------------------ the rift below the cliff */

/** The Cinder Rift's floor (x from the cliff out): basalt, crags and spires; `lava` 0–1 where it flows. */
export function riftAt(x, z) {
  // Two winding rivers of fire.
  const r1 = Math.abs(z - (Math.sin(x / 70) * 60 + Math.sin(x / 23) * 12 - 20)) - 9 - N1(x / 30, z / 30) * 5;
  const r2 = Math.abs(z - (Math.cos(x / 55 + 1) * 90 + 60)) - 6 - N2(x / 25, z / 25) * 4;
  const pool = Math.hypot(x - 330, z + 40) - 46 - N3(x / 20, z / 20) * 10;
  const lavaD = Math.min(r1, r2, pool);
  const lava = smoothstep(2, -2, lavaD);
  let h = -72 + fbm(N4, x / 60, z / 60, 4) * 7;
  h += Math.abs(fbm(N1, x / 18, z / 18, 3)) * 5;
  // Far walls of the rift, jagged.
  const far = Math.max(0, x - 620) + Math.max(0, Math.abs(z) - 330);
  h += Math.pow(Math.min(1, far / 140), 1.5) * 44 + Math.abs(fbm(N2, x / 14, z / 14, 4)) * Math.min(1, far / 80) * 22;
  // Near the cliff the rift's floor is broken rock.
  h = h * (1 - lava) + (-75.5) * lava;
  return { h, lava };
}
