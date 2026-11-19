/**
 * The Cinder Rift, walkable: the floor seventy metres below the overlook,
 * between the cliff (west), the rivers of lava (east and south) and the
 * crags that climb out of the north. Ashward Outpost stands at the cliff's
 * foot where the Cinder Stair comes down; Emberfall Ledge, a shelf of basalt
 * up a ramp, is where Cindermaw's brood nests. Pure — no three.js — so the
 * ground, the collision, the minimap and the tests share one height.
 *
 *   riftHeight(x, z)  metres (the land above for x west of the cliff)
 *   lavaAt(x, z)      0–1 where it flows (a walker can't step in)
 *   riftAreaAt(x, z)  'outpost' | 'ledge' | 'rift'
 *
 * Lava is drawn by the Vista's floor (its surface sits 0.6 m under the
 * walkable ground here and above the ground where the ground dips into a
 * channel), so this ground is pushed below it wherever lava flows.
 */
import { simplex2, fbm, smoothstep } from './noise.js';
import { heightAt, riftAt } from './heights.js';
import { CLIFF_X, regionSdf } from './map.js';

const N1 = simplex2(301);
const N2 = simplex2(302);
const N3 = simplex2(303);

/** Where you can walk (a rounded box, its edge broken by noise), the ledge, the outpost. */
export const RIFT = {
  region: { x0: 141, x1: 236, z0: -178, z1: -24, r: 18 },
  ledge: { x: 200, z: -140, r: 15, rise: 4.5, ramp: { x: 200, z0: -127, z1: -108, half: 5 } },
  outpost: { x: 160, z: -58, r: 16 },
  stair: { x: 144, z: -46 }
};

/** The places in the rift, for banners, the minimap and the music. */
export const RIFT_AREAS = [
  { id: 'outpost', name: 'Ashward Outpost', sub: 'the last fire before the lava', x: RIFT.outpost.x, z: RIFT.outpost.z },
  { id: 'rift', name: 'The Cinder Rift', sub: 'seventy metres down', x: 196, z: -86 },
  { id: 'ledge', name: 'Emberfall Ledge', sub: "where the drake's brood nests", x: RIFT.ledge.x, z: RIFT.ledge.z }
];

export function riftAreaAt(x, z) {
  if (Math.hypot(x - RIFT.outpost.x, z - RIFT.outpost.z) < RIFT.outpost.r + 4) return 'outpost';
  if (Math.hypot(x - RIFT.ledge.x, z - RIFT.ledge.z) < RIFT.ledge.r + 6) return 'ledge';
  return 'rift';
}

/** Lava, 0–1 (none on the land above). */
export function lavaAt(x, z) {
  return x < CLIFF_X + 3 ? 0 : riftAt(x, z).lava;
}

/** How far outside the walkable floor (negative inside), with a broken edge. */
export function riftOutside(x, z) {
  return regionSdf(RIFT.region, x, z) + N1(x / 26, z / 26) * 6 + N2(x / 8, z / 8) * 1.4;
}

/** The ledge's lift at a point (0 on the floor, 1 on the shelf; the ramp in between). */
export function ledgeLift(x, z) {
  const L = RIFT.ledge;
  const d = Math.hypot(x - L.x, z - L.z) + N3(x / 5, z / 5) * 1.2;
  const shelf = smoothstep(L.r + 1.6, L.r - 1.6, d);
  const R = L.ramp;
  const along = smoothstep(R.z1, R.z0, z) * (z > L.z ? 1 : 0);
  const ramp = along * smoothstep(R.half + 1.5, R.half - 1, Math.abs(x - R.x));
  return Math.max(shelf, ramp);
}

export function riftHeight(x, z) {
  const top = heightAt(x, z);
  if (x < CLIFF_X - 2) return top;
  const r = riftAt(x, z);
  const d = riftOutside(x, z);
  // Where you walk the floor is worn smooth (cracked basalt and ash), rougher toward the edges.
  const smooth = -71.2 + fbm(N3, x / 55, z / 55, 3) * 2.6 + fbm(N1, x / 7, z / 7, 2) * 0.25;
  let h = r.h + (smooth - r.h) * smoothstep(0, -14, d) * (1 - smoothstep(0.2, 0.5, r.lava));
  // Crags out of the floor beyond where you can walk (lava keeps its channels).
  if (d > -4) {
    const rise = Math.pow(smoothstep(-4, 26, d), 1.3) * (30 + 14 * fbm(N3, x / 40, z / 40, 3)) + Math.abs(fbm(N2, x / 11, z / 11, 3)) * 6 * smoothstep(4, 20, d);
    h += rise * (1 - smoothstep(0.15, 0.5, r.lava));
  }
  h += RIFT.ledge.rise * ledgeLift(x, z);
  // Ground dips under the lava's surface where it flows.
  h += (-77.6 - h) * smoothstep(0.25, 0.6, r.lava);
  // The cliff's foot: the land above blends down onto the floor.
  const k = smoothstep(CLIFF_X + 1, CLIFF_X + 7, x + N1(z / 9, 1.3) * 1.5);
  return top * (1 - k) + h * k;
}

/** Points for the zone's builder: lava pools' warm lights, the outpost's fire. */
export function lavaLights(step = 26) {
  const out = [];
  for (let z = RIFT.region.z0 - 10; z <= RIFT.region.z1 + 20; z += step) {
    for (let x = RIFT.region.x0; x <= RIFT.region.x1 + 30; x += step) {
      if (lavaAt(x, z) > 0.7 && riftOutside(x, z) < 20) out.push({ x, z });
    }
  }
  return out;
}
