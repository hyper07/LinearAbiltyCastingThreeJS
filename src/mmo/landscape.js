import { ZONES } from './world.js';
import { LivingLand, smooth, seeded } from '../world/LivingLand.js';

/**
 * Hearthvale's landscape: each zone's hills, and what lives on them
 * (world/LivingLand.js draws it). For the eyes only — the server's world is
 * flat, except for the things that block the way there too (walls of kind
 * `cliff` and `giant` in world.js, which this draws as a waterfall and a
 * giant tree).
 */

/** The height of a zone's ground at a point: rolling hills, with bowls for the ponds. */
export function heightFn(zone) {
  const def = ZONES[zone];
  const amp = def.hills ?? 0;
  if (!amp) return () => 0;
  const rand = seeded(zone);
  const [a, b, c, d] = [rand() * 6, rand() * 6, rand() * 6, rand() * 6];
  const raw = (x, z) => amp * (Math.sin(x * 0.045 + a) * Math.cos(z * 0.05 + b) * 0.6 + Math.sin(x * 0.11 + z * 0.07 + c) * 0.28 + Math.sin(z * 0.19 - x * 0.13 + d) * 0.12);
  const ponds = (def.ponds ?? []).map((p) => ({ ...p, base: raw(p.x, p.z) }));
  const h = (x, z) => {
    let y = raw(x, z);
    for (const p of ponds) {
      const dist = Math.hypot(x - p.x, z - p.z);
      if (dist > p.r * 1.7) continue;
      y += (p.base - y) * smooth(p.r * 1.7, p.r, dist); // level ground round the pond
      y -= 1.5 * smooth(p.r, p.r * 0.35, dist); // and a bowl in it
    }
    return y;
  };
  h.ponds = ponds.map((p) => ({ ...p, level: p.base - 0.55 }));
  return h;
}


/** What may not be grown on in a zone: paths, walls, doorsteps. */
function freeFn(def) {
  return (x, z, pad = 0) => {
    for (const wall of def.walls) if (Math.hypot(wall.x - x, wall.z - z) < wall.r + 0.8 + pad) return false;
    for (const n of def.npcs) if (Math.hypot(n.at[0] - x, n.at[1] - z) < 3 + pad) return false;
    for (const s of def.stations) if (Math.hypot(s.at[0] - x, s.at[1] - z) < 2.5 + pad) return false;
    for (const sp of def.spawns ?? []) if (sp.count === 1 && Math.hypot(sp.at[0] - x, sp.at[1] - z) < 6 + pad) return false;
    // The paths: straight from the spawn to each portal.
    for (const p of def.portals) {
      const [ax, az] = def.spawn;
      const [bx, bz] = p.at;
      const dx = bx - ax;
      const dz = bz - az;
      const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - (ax + dx * k), z - (az + dz * k)) < 4.2 + pad) return false;
    }
    return true;
  };
}

/** The living landscape of a zone. */
export function Landscape(zone, height) {
  const def = ZONES[zone];
  const [w, h] = def.size;
  const indoor = def.kind === 'dungeon' ? 'crypt' : def.kind === 'raid' ? 'spire' : null;
  const town = def.kind === 'town';
  return new LivingLand({
    seed: zone,
    bounds: [0, 0, w, h],
    height,
    free: freeFn(def),
    ground: def.ground,
    indoor,
    mist: Boolean(def.mist),
    // A town's green is mown; the wilds grow thick.
    grass: { density: town ? 0.3 : 0.62, scale: town ? 0.5 : 1 },
    flowers: true,
    birds: true,
    ponds: height.ponds ?? [],
    kickables: town ? 6 : Math.round((w * h) / 1300),
    waterfalls: def.walls.filter((x) => x.kind === 'cliff').map((x) => ({ x: x.x, z: x.z, face: x.face ?? 0, height: x.tall ?? 10 })),
    giants: def.walls.filter((x) => x.kind === 'giant').map((x) => ({ x: x.x, z: x.z, r: x.r })),
    mountains: true,
    sky: { cycle: true },
    lanterns: [...def.walls.filter((x) => x.kind === 'stall').map((x) => [x.x + 2.6, x.z + 1.2]), ...def.portals.map((p) => [p.at[0] + 3.2, p.at[1]])]
  });
}
