/**
 * The Lagoon's plan, as pure numbers (no three.js): seven sandy islands
 * round a great turquoise lagoon, one per floor (the sea islands' own
 * floors, with their own lessons). Every island is a resort in the water:
 *
 *   a round sandy island in the middle (the landmark, the portal, the boss),
 *   a circular boardwalk round it on stilts, three piers out to it,
 *   and outside the boardwalk the overwater villas — the three schools,
 *   the shop, the arcade, the museum, the quest board and a little nook
 *   with the treasure chest — each on its own deck at the end of a short pier.
 *
 * Long winding boardwalks join each island to the next (the "stairs": they
 * belong to no floor and shut while the next island is locked).
 *
 * Everything is at one height and nothing overlaps, so the walking grid is
 * a single layer (tree/nav.js with layers = 1). Same contract as the tree's
 * plan: surfaces, locate, height, ground, floorAt, margin, plus focusFloor
 * (which island the camera looks at) and facing (which way is "out").
 */
import { PLINTH_R, PLINTH_H, SUBJECT_ORDER } from '../layout.js';

export const LAGOON = {
  /** The islands sit on a circle this far from the lagoon's middle. */
  ring: 130,
  /** Sand: the walkable top of the island. */
  sandR: 12.5,
  /** The circular boardwalk round each island. */
  walkR: 26,
  walkW: 3.0,
  /** Deck height above the water (water at y = 0). */
  deck: 1.2,
  rim: 0.55
};

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;
/** The villas: angle round the island from "out" (away from the lagoon's middle), distance from the island's middle, deck radius. */
export const PADS = [
  { id: 'math', a: 0, r: 38, pr: 7.5 },
  { id: 'shop', a: 38, r: 35, pr: 4.6 },
  { id: 'board', a: 64, r: 35, pr: 4.6 },
  { id: 'history', a: 148, r: 38, pr: 7.5 },
  { id: 'nook', a: 180, r: 33.5, pr: 3.6 },
  { id: 'physics', a: 212, r: 38, pr: 7.5 },
  { id: 'museum', a: 296, r: 35, pr: 4.6 },
  { id: 'arcade', a: 322, r: 35, pr: 4.6 }
];
/** The piers from the sand to the boardwalk (angles from "out"). */
const SPOKES = [0, 120, 240];
const WIDTH = { pier: 3.0, link: 3.2 };

const polar = (cx, cz, r, a) => [cx + r * Math.sin(a), cz + r * Math.cos(a)];
const wrap = (a) => {
  a = ((a % TAU) + TAU) % TAU;
  return a > Math.PI ? a - TAU : a;
};
const unit = (x, z) => {
  const d = Math.hypot(x, z) || 1;
  return [x / d, z / d];
};
const yawOf = (dir) => Math.atan2(dir[0], dir[1]);
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A straight walkway between two points, its free span from a0 to a1 along it. */
function segment(ax, az, bx, bz, width, extra = {}) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  return { ax, az, bx, bz, dx: dx / len, dz: dz / len, len, a0: 0, a1: len, width, ...extra };
}

export function planLagoon(count) {
  const { ring, sandR, walkR, walkW, deck, rim } = LAGOON;
  const y = deck;
  const floors = [];
  for (let k = 0; k < count; k++) {
    const theta = (k / count) * TAU;
    const [cx, cz] = polar(0, 0, ring, theta);
    const out = [Math.sin(theta), Math.cos(theta)];
    const ang = (deg) => theta + deg * D2R;
    const pads = {};
    for (const p of PADS) {
      const [x, z] = polar(cx, cz, p.r, ang(p.a));
      pads[p.id] = { ...p, x, z, y, k, out: unit(x - cx, z - cz) };
    }
    // Walkways: the piers from the sand to the boardwalk, and from the boardwalk out to each villa.
    const links = [];
    for (const a of SPOKES) {
      const [ax, az] = polar(cx, cz, sandR - 1, ang(a)), [bx, bz] = polar(cx, cz, walkR, ang(a));
      links.push(segment(ax, az, bx, bz, WIDTH.pier, { type: 'pier', floor: k + 1 }));
    }
    for (const p of PADS) {
      const [ax, az] = polar(cx, cz, walkR, ang(p.a));
      links.push(segment(ax, az, pads[p.id].x, pads[p.id].z, p.pr < 4 ? 2.4 : WIDTH.pier, { type: 'pier', floor: k + 1, to: p.id }));
    }
    const at = (id, dir, dist) => ({ x: pads[id].x + dir[0] * dist, z: pads[id].z + dir[1] * dist, y });
    const outOf = (id) => pads[id].out;
    const inOf = (id) => [-pads[id].out[0], -pads[id].out[1]];
    const sandAt = (deg, r) => {
      const [x, z] = polar(cx, cz, r, ang(deg));
      return { x, z, y };
    };
    const toMiddle = (p, d) => {
      const [ux, uz] = unit(cx - p.x, cz - p.z);
      return { x: p.x + ux * d, z: p.z + uz * d, y };
    };

    // Everything faces outwards, away from its island's middle (fronts are +Z in the models).
    const plinths = SUBJECT_ORDER.map((subject) => {
      const p = pads[subject];
      const door = at(subject, outOf(subject), PLINTH_R - 0.6);
      return { subject, x: p.x, z: p.z, r: PLINTH_R, y: y + PLINTH_H, door: { x: door.x, z: door.z }, yaw: yawOf(outOf(subject)) };
    });
    // Each villa is reached by its pier from the boardwalk: go in at the front, which faces out.
    const place = (kind, id, r) => ({ kind, x: pads[id].x, z: pads[id].z, r, yaw: yawOf(outOf(id)), at: at(id, outOf(id), r + 1.2) });
    const places = [
      ...SUBJECT_ORDER.map((s) => place(s, s, PLINTH_R)),
      place('shop', 'shop', 2.8),
      place('arcade', 'arcade', 2.8),
      { kind: 'landmark', x: cx, z: cz, r: 4.2, yaw: theta, at: sandAt(0, 6.4) },
      place('museum', 'museum', 2.8),
      place('board', 'board', 1.6)
    ];
    // On the sand: the portal on to the next island, the puzzle boss, the World Portal (island 1).
    const portal = sandAt(90, 8.2), boss = sandAt(-90, 8.2), gate = sandAt(180, 8.2);
    const chest = at('nook', outOf('nook'), 0.4);
    const rock = at('nook', outOf('nook'), 2.0);
    const gemSpots = [at('math', inOf('math'), 5.6), at('nook', [outOf('nook')[1], -outOf('nook')[0]], 2.3), at('physics', inOf('physics'), 5.6), at('shop', inOf('shop'), 3.2), at('history', inOf('history'), 5.6), sandAt(150, 10.5)].map((p) => [p.x, p.z]);
    const sideOf = (id, deg) => {
      const o = outOf(id), a = Math.atan2(o[0], o[1]) + deg * D2R;
      return [Math.sin(a), Math.cos(a)];
    };
    const toySpots = [sandAt(45, 9.5), sandAt(-45, 9.5), at('math', sideOf('math', 55), 5.9), at('history', sideOf('history', -55), 5.9)].map((p) => [p.x, p.z]);
    // Palms on the sand, clear of the piers, the portal and the boss.
    const palms = [];
    for (let i = 0; i < 9; i++) {
      const deg = 20 + i * 40;
      if (SPOKES.some((s) => Math.abs(wrap((deg - s) * D2R)) < 18 * D2R) || [90, -90, 180, 270].some((s) => Math.abs(wrap((deg - s) * D2R)) < 16 * D2R)) continue;
      const p = sandAt(deg, 10.4);
      palms.push({ x: p.x, z: p.z, lean: (i % 3) * 0.12 + 0.12, seed: k * 31 + i });
    }
    const path = [];
    for (let i = 0; i < 12; i++) {
      const p = sandAt(i * 30 + 15, walkR);
      path.push([p.x, p.z]);
    }
    for (const a of SPOKES) {
      const p = sandAt(a, (sandR + walkR) / 2);
      path.push([p.x, p.z]);
    }
    for (let i = 0; i < 6; i++) {
      const p = sandAt(i * 60 + 30, 7);
      path.push([p.x, p.z]);
    }
    const side = [out[1], -out[0]];
    floors.push({
      k, n: k + 1, y, theta, out, side, centre: { x: cx, z: cz },
      cx, cz: cz - 40, rx: 48, rz: 88,
      pads, links, plinths, places, path, spurs: [], palms,
      portal: { ...portal, yaw: yawOf(unit(cx - portal.x, cz - portal.z)), at: toMiddle(portal, 2.2) },
      boss: { ...boss, yaw: yawOf(unit(cx - boss.x, cz - boss.z)), at: toMiddle(boss, 2.6) },
      worldGate: k === 0 ? { ...gate, yaw: yawOf(unit(cx - gate.x, cz - gate.z)), at: toMiddle(gate, 2.2) } : null,
      chest: { ...chest, yaw: yawOf(inOf('nook')), rock: { x: rock.x, z: rock.z }, at: at('nook', inOf('nook'), 1.4) },
      gemSpots,
      toySpots,
      spawn: sandAt(0, 4.6),
      label: { x: cx + out[0] * 10, y: y + 16, z: cz + out[1] * 10 },
      view: { target: [cx, y + 1, cz], offset: [out[0] * 58 + side[0] * 20, 52, out[1] * 58 + side[1] * 20] }
    });
  }

  // The long boardwalks from each island to the next: off the boardwalk ring, winding a little across the lagoon.
  const stairs = [];
  for (let k = 0; k < count - 1; k++) {
    const lo = floors[k], hi = floors[k + 1];
    const [ax, az] = polar(lo.centre.x, lo.centre.z, walkR, lo.theta + 90 * D2R);
    const [bx, bz] = polar(hi.centre.x, hi.centre.z, walkR, hi.theta - 90 * D2R);
    // A gentle S: two bends pushed out and in from the straight line.
    const [mx, mz] = [(ax + bx) / 2, (az + bz) / 2];
    const [nx, nz] = unit(mx, mz);
    const pts = [[ax, az], [ax + (bx - ax) * 0.3 + nx * 7, az + (bz - az) * 0.3 + nz * 7], [ax + (bx - ax) * 0.7 - nx * 5, az + (bz - az) * 0.7 - nz * 5], [bx, bz]];
    const segs = [];
    for (let i = 1; i < pts.length; i++) segs.push(segment(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], WIDTH.link, { type: 'link' }));
    // The gate stands a few metres along, facing the way to the next island.
    const g = segs[0];
    stairs.push({ k, from: lo.n, to: hi.n, pts, segs, width: WIDTH.link, a: { x: g.ax + g.dx * 4, z: g.az + g.dz * 4, y }, b: { x: g.ax + g.dx * 8, z: g.az + g.dz * 8, y } });
  }

  const margin = (hit) => (hit.deck || hit.sand ? rim : 0.3);
  /** Every surface at a spot (at most one here: nothing overlaps; where two meet, the roomier). */
  function surfaces(x, z) {
    let best = null;
    const roomier = (hit) => {
      if (!best || hit.edge - margin(hit) > best.edge - margin(best)) best = hit;
    };
    const along = (L, x, z, over) => {
      const ox = x - L.ax, oz = z - L.az;
      const a = ox * L.dx + oz * L.dz;
      if (a < -over || a > L.len + over) return -1;
      const perp = Math.abs(ox * L.dz - oz * L.dx);
      return perp <= L.width / 2 ? L.width / 2 - perp : -1;
    };
    for (const f of floors) {
      const dx = x - f.centre.x, dz = z - f.centre.z;
      const r = Math.hypot(dx, dz);
      if (r > 50) continue;
      if (r <= sandR) roomier({ y, floor: f.n, layer: 0, sand: true, edge: sandR - r });
      if (Math.abs(r - walkR) <= walkW / 2) roomier({ y, floor: f.n, layer: 0, walk: true, edge: walkW / 2 - Math.abs(r - walkR) });
      for (const id in f.pads) {
        const p = f.pads[id];
        const d = Math.hypot(x - p.x, z - p.z);
        if (d <= p.pr) roomier({ y, floor: f.n, layer: 0, deck: p, edge: p.pr - d });
      }
      for (const L of f.links) {
        const e = along(L, x, z, 0.5);
        if (e >= 0) roomier({ y, floor: f.n, layer: 0, bridge: L, edge: e });
      }
    }
    for (const st of stairs) for (const L of st.segs) {
      const e = along(L, x, z, 1.6);
      if (e >= 0) roomier({ y, floor: 0, layer: 0, stair: st, edge: e });
    }
    return best ? [best] : [];
  }
  function locate(x, z, yy) {
    const hit = surfaces(x, z)[0] ?? null;
    if (hit && yy != null && Number.isFinite(yy) && Math.abs(hit.y - yy) > 4) return null;
    return hit;
  }
  const ground = (x, z, yy) => locate(x, z, yy)?.y ?? yy ?? 0;
  function height(x, z, yy) {
    const hit = locate(x, z, yy);
    if (!hit) return yy ?? 0;
    if (hit.deck && SUBJECT_ORDER.includes(hit.deck.id)) {
      const d = Math.hypot(x - hit.deck.x, z - hit.deck.z);
      if (d < PLINTH_R + 0.3) return hit.y + PLINTH_H * (1 - smooth(PLINTH_R - 0.1, PLINTH_R + 0.3, d));
    }
    return hit.y;
  }
  const floorAt = (x, z, yy) => locate(x, z, yy)?.floor ?? 0;
  /** The island nearest a point: what the camera is looking at. */
  function islandAt(x, z) {
    let best = floors[0], bd = Infinity;
    for (const f of floors) {
      const d = Math.hypot(x - f.centre.x, z - f.centre.z);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }
  const reach = ring + 52;
  return {
    kind: 'lagoon',
    floors,
    stairs,
    surfaces,
    locate,
    ground,
    height,
    floorAt,
    margin,
    layers: 1,
    navBounds: { x0: -reach, x1: reach, z0: -reach, z1: reach },
    start: floors[0].spawn,
    floorH: 12,
    focusFloor: (x, z) => islandAt(x, z).n,
    /** "Out" at a point: away from the middle of its island (the camera stands that way). */
    facing: (x, z) => {
      const f = islandAt(x, z);
      return Math.atan2(x - f.centre.x, z - f.centre.z);
    },
    overview: { target: [0, 0, 0], offset: [0, 250, 230] }
  };
}
