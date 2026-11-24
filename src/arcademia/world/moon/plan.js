/**
 * The Moon's plan, as pure numbers (no three.js): seven moonbases, one per
 * floor, each inside a round crater, the craters set on a ring round the
 * plain where the Big Rocket stands. Every moonbase is the same toy layout:
 *
 *   a round landing pad in the middle (the landmark, the portal, the boss),
 *   a circular walk round it on the crater's inner terrace, three gangways in,
 *   and outside the walk, on landing pads of their own, the three schools,
 *   the shop, the arcade, the museum, the quest board and a little nook with
 *   the treasure chest, each reached by a short gangway from the walk.
 *
 * Pressurised glass-tube walkways join each crater to the next, through a
 * notch in the rims (the "stairs": they belong to no floor, and an airlock
 * at the start shuts while the next moonbase is locked).
 *
 * Everything you walk on is at one height and nothing overlaps, so the
 * walking grid is a single layer (tree/nav.js with layers = 1). Same contract
 * as the Lagoon's plan (surfaces, locate, height, ground, floorAt, margin,
 * focusFloor, facing), plus the sky the Moon has (black, the Sun, the Earth
 * low over the hills: World.js) and low gravity (`float`: floatier hops).
 */
import { PLINTH_R, PLINTH_H, SUBJECT_ORDER } from '../layout.js';

export const MOON = {
  /** The craters sit on a circle this far from the plain's middle. */
  ring: 150,
  /** The round landing pad in the middle of each moonbase. */
  hubR: 12.5,
  /** The circular walk on the crater's inner terrace. */
  walkR: 26,
  walkW: 3.2,
  /** Walking height: every deck, gangway and tube floor (the crater floor is at 0). */
  deck: 1.0,
  rim: 0.55,
  /** The crater: a flat floor, the inner wall up to the rim's crest, the outer slope back down to the plain. */
  floorR: 48,
  crestR: 57,
  outR: 78,
  rimH: 6.2,
  /** The glass tubes: radius of the glass, the notch cut through the rims for them. */
  tubeR: 2.4,
  notch: 7
};

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;

/** Each crater's middle [x, z], floor 1 first, round the ring (floor 1 due south of the plain's middle). */
export const CRATERS = Array.from({ length: 7 }, (_, k) => {
  const a = (k / 7) * TAU;
  return [Math.round(MOON.ring * Math.sin(a) * 100) / 100, Math.round(MOON.ring * Math.cos(a) * 100) / 100];
});

/**
 * The big landmarks on the plain inside the ring, seen from every moonbase:
 * the Big Rocket on its launch pad in the middle, the Moon Lander, the Radio
 * Telescope, and the Moon Rover driving its loop round the rocket. `r`: the
 * ground kept flat for each.
 */
export const LANDMARKS = {
  rocket: { x: 0, z: 0, r: 22 },
  lander: { x: -46, z: -30, r: 14 },
  dish: { x: 46, z: -34, r: 18 },
  rover: { x: 0, z: 0, loop: 36, r: 6 }
};

/** The Earth, hanging low over the hills to the north (the arrival view looks at it over the first crater). */
export const EARTH = { x: -300, y: 78, z: -1000, r: 62 };

/** The pads: angle round the crater from "out" (away from the plain's middle), distance from its middle, pad radius. */
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
/** The gangways in from the walk to the middle pad (angles from "out"). */
export const SPOKES = [0, 120, 240];
const WIDTH = { gangway: 3.0, small: 2.4, tube: 3.4 };

const polar = (cx, cz, r, a) => [cx + r * Math.sin(a), cz + r * Math.cos(a)];
const unit = (x, z) => {
  const d = Math.hypot(x, z) || 1;
  return [x / d, z / d];
};
const yawOf = (dir) => Math.atan2(dir[0], dir[1]);
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A straight walkway between two points. */
function segment(ax, az, bx, bz, width, extra = {}) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  return { ax, az, bx, bz, dx: dx / len, dz: dz / len, len, a0: 0, a1: len, width, ...extra };
}

export function planMoon(count) {
  const { hubR, walkR, walkW, deck, rim } = MOON;
  const y = deck;
  const floors = [];
  for (let k = 0; k < count; k++) {
    const theta = (k / count) * TAU;
    const [cx, cz] = polar(0, 0, MOON.ring, theta);
    const out = [Math.sin(theta), Math.cos(theta)];
    const ang = (deg) => theta + deg * D2R;
    const pads = {};
    for (const p of PADS) {
      const [x, z] = polar(cx, cz, p.r, ang(p.a));
      pads[p.id] = { ...p, x, z, y, k, out: unit(x - cx, z - cz) };
    }
    const links = [];
    for (const a of SPOKES) {
      const [ax, az] = polar(cx, cz, hubR - 1, ang(a)), [bx, bz] = polar(cx, cz, walkR, ang(a));
      links.push(segment(ax, az, bx, bz, WIDTH.gangway, { type: 'gangway', floor: k + 1, spoke: a }));
    }
    for (const p of PADS) {
      const [ax, az] = polar(cx, cz, walkR, ang(p.a));
      links.push(segment(ax, az, pads[p.id].x, pads[p.id].z, p.pr < 4 ? WIDTH.small : WIDTH.gangway, { type: 'gangway', floor: k + 1, to: p.id }));
    }
    const at = (id, dir, dist) => ({ x: pads[id].x + dir[0] * dist, z: pads[id].z + dir[1] * dist, y });
    const outOf = (id) => pads[id].out;
    const inOf = (id) => [-pads[id].out[0], -pads[id].out[1]];
    const hubAt = (deg, r) => {
      const [x, z] = polar(cx, cz, r, ang(deg));
      return { x, z, y };
    };
    const toMiddle = (p, d) => {
      const [ux, uz] = unit(cx - p.x, cz - p.z);
      return { x: p.x + ux * d, z: p.z + uz * d, y };
    };
    // Everything faces out, away from the crater's middle, towards the camera (fronts are +Z in the models).
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
      { kind: 'landmark', x: cx, z: cz, r: 4.2, yaw: theta, at: hubAt(0, 6.4) },
      place('museum', 'museum', 2.8),
      place('board', 'board', 1.6)
    ];
    // On the middle pad: the portal on to the next moonbase, the puzzle boss, the World Portal (moonbase 1).
    const portal = hubAt(90, 8.2), boss = hubAt(-90, 8.2), gate = hubAt(180, 8.2);
    const chest = at('nook', outOf('nook'), 0.4);
    const rock = at('nook', outOf('nook'), 2.0);
    const gemSpots = [at('math', inOf('math'), 5.6), at('nook', [outOf('nook')[1], -outOf('nook')[0]], 2.3), at('physics', inOf('physics'), 5.6), at('shop', inOf('shop'), 3.2), at('history', inOf('history'), 5.6), hubAt(150, 10.5)].map((p) => [p.x, p.z]);
    const sideOf = (id, deg) => {
      const o = outOf(id), a = Math.atan2(o[0], o[1]) + deg * D2R;
      return [Math.sin(a), Math.cos(a)];
    };
    const toySpots = [hubAt(45, 9.5), hubAt(-45, 9.5), at('math', sideOf('math', 55), 5.9), at('history', sideOf('history', -55), 5.9)].map((p) => [p.x, p.z]);
    // Where the townsfolk stroll: round the walk, along the gangways, on the middle pad.
    const path = [];
    for (let i = 0; i < 12; i++) {
      const p = hubAt(i * 30 + 15, walkR);
      path.push([p.x, p.z]);
    }
    for (const a of SPOKES) {
      const p = hubAt(a, (hubR + walkR) / 2);
      path.push([p.x, p.z]);
    }
    for (let i = 0; i < 6; i++) {
      const p = hubAt(i * 60 + 30, 7);
      path.push([p.x, p.z]);
    }
    const side = [out[1], -out[0]];
    floors.push({
      k, n: k + 1, y, theta, out, side, centre: { x: cx, z: cz },
      // The particles' box (particles.js): the crater and a little beyond.
      cx, cz: cz - 40, rx: 48, rz: 88,
      pads, links, plinths, places, path, spurs: [],
      portal: { ...portal, yaw: yawOf(unit(cx - portal.x, cz - portal.z)), at: toMiddle(portal, 2.2) },
      boss: { ...boss, yaw: yawOf(unit(cx - boss.x, cz - boss.z)), at: toMiddle(boss, 2.6) },
      worldGate: k === 0 ? { ...gate, yaw: yawOf(unit(cx - gate.x, cz - gate.z)), at: toMiddle(gate, 2.2) } : null,
      chest: { ...chest, yaw: yawOf(inOf('nook')), rock: { x: rock.x, z: rock.z }, at: at('nook', inOf('nook'), 1.4) },
      gemSpots,
      toySpots,
      spawn: hubAt(0, 4.6),
      label: { x: cx + out[0] * 10, y: y + 18, z: cz + out[1] * 10 },
      view: { target: [cx, y + 1, cz], offset: [out[0] * 58 + side[0] * 20, 54, out[1] * 58 + side[1] * 20] }
    });
  }

  // The glass tubes from each crater to the next: off the walk, out through the rims, a gentle S across the plain.
  const stairs = [];
  for (let k = 0; k < count - 1; k++) {
    const lo = floors[k], hi = floors[k + 1];
    const [ax, az] = polar(lo.centre.x, lo.centre.z, walkR, lo.theta + 90 * D2R);
    const [bx, bz] = polar(hi.centre.x, hi.centre.z, walkR, hi.theta - 90 * D2R);
    const [mx, mz] = [(ax + bx) / 2, (az + bz) / 2];
    const [nx, nz] = unit(mx, mz);
    const pts = [[ax, az], [ax + (bx - ax) * 0.3 + nx * 7, az + (bz - az) * 0.3 + nz * 7], [ax + (bx - ax) * 0.7 - nx * 5, az + (bz - az) * 0.7 - nz * 5], [bx, bz]];
    const segs = [];
    for (let i = 1; i < pts.length; i++) segs.push(segment(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], WIDTH.tube, { type: 'tube' }));
    // The airlock stands a few metres along, just off the walk, facing the way to the next moonbase.
    const g = segs[0];
    stairs.push({ k, from: lo.n, to: hi.n, pts, segs, width: WIDTH.tube, a: { x: g.ax + g.dx * 4, z: g.az + g.dz * 4, y }, b: { x: g.ax + g.dx * 8, z: g.az + g.dz * 8, y } });
  }

  const margin = (hit) => (hit.deck || hit.hub ? rim : 0.3);
  const along = (L, x, z, over) => {
    const ox = x - L.ax, oz = z - L.az;
    const a = ox * L.dx + oz * L.dz;
    if (a < -over || a > L.len + over) return -1;
    const perp = Math.abs(ox * L.dz - oz * L.dx);
    return perp <= L.width / 2 ? L.width / 2 - perp : -1;
  };
  /** Every surface at a spot (at most one: nothing overlaps; where two meet, the roomier). */
  function surfaces(x, z) {
    let best = null;
    const roomier = (hit) => {
      if (!best || hit.edge - margin(hit) > best.edge - margin(best)) best = hit;
    };
    for (const f of floors) {
      const dx = x - f.centre.x, dz = z - f.centre.z;
      const r = Math.hypot(dx, dz);
      if (r > 50) continue;
      if (r <= hubR) roomier({ y, floor: f.n, layer: 0, hub: true, edge: hubR - r });
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
  /** The crater nearest a point: what the camera is looking at. */
  function craterAt(x, z) {
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
  const reach = MOON.ring + 52;
  const first = floors[0];
  return {
    kind: 'moon',
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
    start: first.spawn,
    floorH: 12,
    focusFloor: (x, z) => craterAt(x, z).n,
    /** "Out" at a point: away from the middle of its crater (the camera stands that way). */
    facing: (x, z) => {
      const f = craterAt(x, z);
      return Math.atan2(x - f.centre.x, z - f.centre.z);
    },
    overview: { target: [0, 0, 0], offset: [0, 300, 270] },
    /** Arriving: over the first crater to the Big Rocket, and the Earth rising over the hills behind it. */
    // (The camera then follows the buddy at this offset: a low look north, the sky a third of the view.)
    arrival: { target: [first.centre.x, 2, first.centre.z], offset: [14, 20, 120] },
    /** Space: a black sky full of stars by day too, the Sun and the Earth (World.js, moon/scene.js). */
    space: true,
    /** The camera may look a little flatter here, so the black sky and the Earth show over the hills. */
    maxPolar: 1.42,
    /** Low gravity: buddies and townsfolk hop higher and float down slower (figures.js). */
    float: 1,
    sky: {
      day: { top: '#02030a', mid: '#070a1c', bottom: '#151b38', fog: '#141a36', hemiSky: '#e8eeff', hemiGround: '#6f7180', hemi: 0.85, sun: '#fffaf0', sunI: 2.1, amb: 0.14 },
      // Earth-light: the Earth lights the bases blue, and the windows glow.
      night: { top: '#010208', mid: '#040817', bottom: '#0c1430', fog: '#0c1330', hemiSky: '#8fb2ff', hemiGround: '#2c3450', hemi: 0.95, sun: '#9fc0ff', sunI: 0.85, amb: 0.3 }
    },
    sun: [72, 58, 44],
    fog: { near: 300, nearK: 1.2, far: 1250, farK: 3 }
  };
}
