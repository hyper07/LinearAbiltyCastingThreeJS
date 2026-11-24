/**
 * The Great Tree's plan, as pure numbers (no three.js): a giant trunk with a
 * ring of treehouses round it for every floor, one ring above another. Each
 * ring is turned a little from the one below (TURN), so a building never
 * sits right under the next ring's building, and the spiral stair winds up
 * round the trunk from one ring's landing to the next.
 *
 * A ring is nine round wooden decks joined, all the way round, by bridges —
 * sturdy plank bridges and sagging rope bridges:
 *
 *            history  ~  museum
 *        nook                  shop
 *      board        (trunk)       math
 *        physics               hub ── landing (the stair)
 *              arcade ~ ~ ~ ~
 *
 * The schools and places face outwards, away from the trunk (their fronts
 * are +Z in the model), so the camera, outside the ring, sees their fronts.
 *
 * The contract is the mountain's (layout.js) — floors with plinths, places
 * and a path; stairs; height, ground and floorAt — except that one spot may
 * have a ring above another, so these take an optional third argument, the
 * height you are at, and pick the surface nearest to it. The walking grid
 * is layered (tree/nav.js).
 */
import { PLINTH_R, PLINTH_H, SUBJECT_ORDER } from '../layout.js';

export const TREE = {
  trunkR: 13.6,
  ground: -12,
  stairR: 17,
  stairW: 3.2,
  /** Half the angle of the flat landing on the spiral stair (radians). */
  land: (6 * Math.PI) / 180,
  /** Between rings: tall enough for a school under the next ring's bridges. */
  tierH: 12,
  /** How much each ring is turned from the one below (radians). */
  turn: (100 * Math.PI) / 180,
  /** How far inside a deck's rim a walker may go. */
  rim: 0.55
};

const D2R = Math.PI / 180;
/** The decks of a ring, in order round the trunk: angle from the landing, distance from the trunk's middle, radius. */
export const PADS = [
  { id: 'hub', a: 0, r: 34, pr: 9 },
  { id: 'math', a: 40, r: 40, pr: 7.2 },
  { id: 'shop', a: 80, r: 42, pr: 4.6 },
  { id: 'museum', a: 120, r: 42, pr: 4.6 },
  { id: 'history', a: 160, r: 40, pr: 7.2 },
  { id: 'nook', a: 200, r: 45, pr: 3.6 },
  { id: 'board', a: 240, r: 42, pr: 4.6 },
  { id: 'physics', a: 280, r: 40, pr: 7.2 },
  { id: 'arcade', a: 320, r: 42, pr: 4.6 }
];
/** The bridges: the landing to the hub, then deck to deck all the way round. */
export const LINKS = [
  ['landing', 'hub', 'plank'],
  ['hub', 'math', 'plank'],
  ['math', 'shop', 'rope'],
  ['shop', 'museum', 'plank'],
  ['museum', 'history', 'rope'],
  ['history', 'nook', 'rope'],
  ['nook', 'board', 'rope'],
  ['board', 'physics', 'plank'],
  ['physics', 'arcade', 'rope'],
  ['arcade', 'hub', 'plank']
];
const WIDTH = { plank: 3.0, rope: 2.4 };
const SAG = { plank: 0, rope: 0.5 };
const TAU = Math.PI * 2;

const polar = (r, a) => [r * Math.sin(a), r * Math.cos(a)];
const wrap = (a) => {
  a = ((a % TAU) + TAU) % TAU;
  return a > Math.PI ? a - TAU : a;
};
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const unit = (x, z) => {
  const d = Math.hypot(x, z) || 1;
  return [x / d, z / d];
};
const rot = (dir, deg) => {
  const a = Math.atan2(dir[0], dir[1]) + deg * D2R;
  return [Math.sin(a), Math.cos(a)];
};
const yawOf = (dir) => Math.atan2(dir[0], dir[1]);

/**
 * The plan for `count` rings.
 * @returns {object} floors, stairs, surfaces(x, z), locate(x, z, y), height(x, z, y), ground(x, z, y), floorAt(x, z, y), layerOf(hit)
 */
export function planTree(count) {
  const { stairR, stairW, land, tierH, turn, rim } = TREE;
  const floors = [];
  for (let k = 0; k < count; k++) {
    const phi = k * turn;
    const y = k * tierH;
    // Upper rings draw in a little, like a tree's crown.
    const shrink = 1 - k * 0.018;
    const pads = {};
    for (const p of PADS) {
      const r = p.id === 'hub' ? p.r : p.r * shrink;
      const [x, z] = polar(r, phi + p.a * D2R);
      pads[p.id] = { ...p, r, x, z, y, k, out: unit(x, z) };
    }
    const [lx, lz] = polar(stairR, phi);
    pads.landing = { id: 'landing', x: lx, z: lz, y, k, pr: 0, landing: true, out: unit(lx, lz) };
    const links = LINKS.map(([from, to, type]) => {
      const A = pads[from], B = pads[to];
      const dx = B.x - A.x, dz = B.z - A.z;
      const len = Math.hypot(dx, dz);
      // The free span between the two rims (from the landing, it starts at the stair's outer edge).
      const a0 = A.landing ? stairW / 2 : A.pr - 0.25, a1 = len - B.pr + 0.25;
      return { from, to, type, ax: A.x, az: A.z, bx: B.x, bz: B.z, dx: dx / len, dz: dz / len, len, a0, a1, y, floor: k + 1, width: WIDTH[type], sag: SAG[type] };
    });
    const at = (id, dir, dist) => ({ x: pads[id].x + dir[0] * dist, z: pads[id].z + dir[1] * dist, y });
    const outOf = (id) => pads[id].out;
    const inOf = (id) => [-pads[id].out[0], -pads[id].out[1]];
    const hub = pads.hub;
    const toHub = (p, d) => {
      const [ux, uz] = unit(hub.x - p.x, hub.z - p.z);
      return { x: p.x + ux * d, z: p.z + uz * d, y };
    };

    // Everything faces outwards; you go in at the front.
    const plinths = SUBJECT_ORDER.map((subject) => {
      const p = pads[subject];
      const door = at(subject, outOf(subject), PLINTH_R - 0.6);
      return { subject, x: p.x, z: p.z, r: PLINTH_R, y: y + PLINTH_H, door: { x: door.x, z: door.z }, yaw: yawOf(outOf(subject)) };
    });
    const place = (kind, id, r) => ({ kind, x: pads[id].x, z: pads[id].z, r, yaw: yawOf(outOf(id)), at: at(id, outOf(id), r + 1.2) });
    const places = [
      ...SUBJECT_ORDER.map((s) => place(s, s, PLINTH_R)),
      place('shop', 'shop', 2.8),
      place('arcade', 'arcade', 2.8),
      // The landmark stands in the middle of the hub; you meet it coming off the landing bridge.
      { kind: 'landmark', x: hub.x, z: hub.z, r: 4.2, yaw: yawOf(outOf('hub')), at: at('hub', inOf('hub'), 5.4) },
      place('museum', 'museum', 2.8),
      place('board', 'board', 1.6)
    ];

    // Round the hub's rim: the portal up (by the landing), and out at the front the puzzle boss and the
    // world portal (floor 1 only) — so a buddy arriving by it has the camera behind them, not the landmark.
    const ring = (deg, dist = 6.4) => at('hub', rot(inOf('hub'), deg), dist);
    const portal = ring(-46), gate = ring(148), boss = ring(-148);
    const nookIn = inOf('nook');
    const chest = at('nook', nookIn, 0.2);
    const rock = at('nook', outOf('nook'), 1.9);

    // Hidden gems: behind the schools (towards the trunk), beside the chest, behind the museum and the board.
    const gemSpots = [
      at('math', rot(inOf('math'), 28), 5.7), at('nook', rot(nookIn, 90), 2.2), at('physics', rot(inOf('physics'), -28), 5.7),
      at('museum', rot(inOf('museum'), 30), 3.2), at('board', rot(inOf('board'), -30), 3.2), at('history', rot(inOf('history'), 28), 5.7)
    ].map((p) => [p.x, p.z]);
    // Toys to poke: in front of the schools, either side of the door.
    const toySpots = [at('math', rot(outOf('math'), -48), 5.8), at('history', rot(outOf('history'), 48), 5.8), at('physics', rot(outOf('physics'), -48), 5.8), at('history', rot(outOf('history'), -48), 5.8)].map((p) => [p.x, p.z]);

    // Where townsfolk like to wander: round the hub, in front of every deck, halfway across the bridges.
    const path = [];
    for (let i = 0; i < 8; i++) {
      const p = at('hub', rot(inOf('hub'), i * 45 + 20), 5.6);
      path.push([p.x, p.z]);
    }
    for (const p of PADS) if (p.id !== 'hub') {
      const q = at(p.id, outOf(p.id), p.pr * 0.55);
      path.push([q.x, q.z]);
    }
    for (const L of links) if (L.from !== 'landing') path.push([L.ax + (L.dx * (L.a0 + L.a1)) / 2, L.az + (L.dz * (L.a0 + L.a1)) / 2]);

    const hubOut = outOf('hub');
    const side = [hubOut[1], -hubOut[0]];
    floors.push({
      k, n: k + 1, y, phi,
      // The particles' box: the whole ring.
      cx: 0, cz: -44, rx: 50, rz: 90,
      pads, links, plinths, places, path, spurs: [],
      portal: { ...portal, yaw: yawOf(unit(hub.x - portal.x, hub.z - portal.z)), at: toHub(portal, 2.2) },
      boss: { ...boss, yaw: yawOf(inOf('hub')), at: toHub(boss, 2.6) },
      worldGate: k === 0 ? { ...gate, yaw: yawOf(unit(hub.x - gate.x, hub.z - gate.z)), at: toHub(gate, 2.2) } : null,
      chest: { ...chest, yaw: yawOf(nookIn), rock: { x: rock.x, z: rock.z }, at: at('nook', nookIn, 1.7) },
      gemSpots,
      toySpots,
      spawn: at('hub', inOf('hub'), 7.2),
      label: { x: hub.x + hubOut[0] * 10, y: y + 15, z: hub.z + hubOut[1] * 10 },
      view: { target: [hub.x, y + 2, hub.z], offset: [hubOut[0] * 46 + side[0] * 16, 30, hubOut[1] * 46 + side[1] * 16] }
    });
  }

  // The spiral stair: from each ring's landing, round the trunk, up to the next ring's.
  const stairs = [];
  for (let k = 0; k < count - 1; k++) {
    const lo = floors[k], hi = floors[k + 1];
    const a0 = lo.phi + land, a1 = hi.phi - land;
    const [ax, az] = polar(stairR, a0), [bx, bz] = polar(stairR, a1);
    stairs.push({ k, from: lo.n, to: hi.n, a: { x: ax, z: az, y: lo.y }, b: { x: bx, z: bz, y: hi.y }, width: stairW, arc: { r: stairR, a0, a1, y0: lo.y, y1: hi.y } });
  }

  /** How far in from the edge a walker must keep, by kind of surface. */
  const margin = (hit) => (hit.deck ? rim : 0.3);
  const ringMax = Math.max(...PADS.map((p) => p.r + p.pr)) + 1;

  /**
   * Every surface at a spot, low to high: { y, floor, layer, deck | bridge | landing | stair, edge }.
   * Decks, bridges and landings belong to their ring; the stair belongs to no floor (like the
   * mountain's), but to the walking layer below its middle and the one above after it.
   */
  function surfaces(x, z) {
    const out = [];
    const r = Math.hypot(x, z);
    const ang = Math.atan2(x, z);
    if (Math.abs(r - stairR) <= stairW / 2) {
      const edge = stairW / 2 - Math.abs(r - stairR);
      for (const f of floors) if (Math.abs(wrap(ang - f.phi)) <= land) out.push({ y: f.y, floor: f.n, layer: f.k, landing: true, edge });
      for (const s of stairs) {
        const t = (((ang - s.arc.a0) % TAU) + TAU) % TAU / (s.arc.a1 - s.arc.a0);
        if (t <= 1) out.push({ y: lerp(s.arc.y0, s.arc.y1, t), floor: 0, layer: t < 0.5 ? s.k : s.k + 1, stair: s, t, edge });
      }
    }
    if (r >= stairR - stairW / 2 && r <= ringMax) {
      for (const f of floors) {
        let best = null;
        // A deck, or a bridge (at a bridge's mouth both are there: keep the roomier).
        const roomier = (hit) => {
          if (!best || hit.edge - margin(hit) > best.edge - margin(best)) best = hit;
        };
        for (const id in f.pads) {
          const p = f.pads[id];
          if (p.landing) continue;
          const d = Math.hypot(x - p.x, z - p.z);
          if (d <= p.pr) roomier({ y: f.y, floor: f.n, layer: f.k, deck: p, edge: p.pr - d });
        }
        for (const L of f.links) {
          const ox = x - L.ax, oz = z - L.az;
          const along = ox * L.dx + oz * L.dz;
          if (along < L.a0 - 0.6 || along > L.a1 + 0.6) continue;
          const perp = Math.abs(ox * L.dz - oz * L.dx);
          if (perp > L.width / 2) continue;
          const s = Math.max(0, Math.min(1, (along - L.a0) / (L.a1 - L.a0)));
          roomier({ y: f.y - L.sag * Math.sin(Math.PI * s), floor: f.n, layer: f.k, bridge: L, edge: L.width / 2 - perp });
        }
        if (best) out.push(best);
      }
    }
    return out.sort((a, b) => a.y - b.y);
  }

  /** The surface at a spot nearest to height `y` (the lowest if no height is given), or null. */
  function locate(x, z, y) {
    const list = surfaces(x, z);
    if (!list.length) return null;
    if (y == null || !Number.isFinite(y)) return list[0];
    let best = list[0];
    for (const s of list) if (Math.abs(s.y - y) < Math.abs(best.y - y)) best = s;
    return best;
  }
  /** The walking surface's height without the school plinths (what the decks and bridges draw). */
  function ground(x, z, y) {
    return locate(x, z, y)?.y ?? TREE.ground;
  }
  /** The height a walker stands at — a deck, a bridge, the stair — and up onto a school's plinth. */
  function height(x, z, y) {
    const hit = locate(x, z, y);
    if (!hit) return y ?? TREE.ground;
    if (hit.deck && SUBJECT_ORDER.includes(hit.deck.id)) {
      const d = Math.hypot(x - hit.deck.x, z - hit.deck.z);
      if (d < PLINTH_R + 0.3) return hit.y + PLINTH_H * (1 - smooth(PLINTH_R - 0.1, PLINTH_R + 0.3, d));
    }
    return hit.y;
  }
  /** The ring (1…) a point is on, or 0 for the stair and thin air. */
  function floorAt(x, z, y) {
    return locate(x, z, y)?.floor ?? 0;
  }
  const reach = ringMax + 3;
  return {
    kind: 'tree',
    floors,
    stairs,
    surfaces,
    locate,
    ground,
    height,
    floorAt,
    margin,
    layers: count,
    navBounds: { x0: -reach, x1: reach, z0: -reach, z1: reach },
    start: floors[0].spawn,
    floorH: tierH
  };
}
