/**
 * The Desert of the Pyramids' plan, as pure numbers (no three.js): seven
 * oasis towns strung along the Nile, west to east, one per floor. Across the
 * river, by the first oasis, stand the Great Pyramids and the Great Sphinx.
 *
 * Every oasis is a little sandstone town in a palm garden:
 *
 *   a round paved plaza in the middle (the landmark, the portal, the boss),
 *   a colonnade walk in a ring round it, three paths in from the plaza,
 *   and outside the ring, on raised stone platforms, the three schools on
 *   the river side (their doors facing the plaza), the shop, the arcade,
 *   the museum, the quest board and a nook with the treasure chest.
 *
 * Between the paths lie the gardens (palms, a pool, flower beds): you walk
 * on the stone, not in the beds. Raised stone causeways join each oasis to
 * the next across the sand (the "stairs": they belong to no floor and shut
 * while the next oasis is locked); the first is an avenue of sphinxes.
 *
 * Everything you walk on is at one height and nothing overlaps, so the
 * walking grid is a single layer (tree/nav.js with layers = 1). Same contract
 * as the Lagoon's plan: surfaces, locate, height, ground, floorAt, margin,
 * focusFloor, facing — but the camera always stands south of the buddy and
 * looks north, across the oases and the river to the pyramids.
 */
import { PLINTH_R, PLINTH_H, SUBJECT_ORDER } from '../layout.js';

export const DESERT = {
  /** West to east, an oasis every this many metres. */
  gap: 108,
  /** The paved plaza in the middle of each oasis. */
  plazaR: 12.5,
  /** The colonnade walk round it. */
  walkR: 26,
  walkW: 3.2,
  /** The garden (palms and beds) the town stands in. */
  gardenR: 47,
  /** Walking height: every platform, path and causeway (the sand is at 0, the gardens a little up). */
  deck: 1.0,
  gardenY: 0.3,
  rim: 0.55,
  /** The Nile: this far north of the oases, this wide (half). */
  river: { off: 80, half: 12 }
};

/** Each oasis's middle [x, z]: along a gentle S, west (floor 1) to east. */
export const OASES = Array.from({ length: 7 }, (_, k) => [(k - 3) * DESERT.gap, Math.round(22 * Math.sin(k * 1.15) * 10) / 10]);

const D2R = Math.PI / 180;
/** A direction by compass degrees: 0 north (−z), 90 east (+x), 180 south (+z). */
export const dirOf = (deg) => [Math.sin(deg * D2R), -Math.cos(deg * D2R)];
const at2 = (cx, cz, r, deg) => {
  const [dx, dz] = dirOf(deg);
  return [cx + dx * r, cz + dz * r];
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

/**
 * The platforms: compass angle round the oasis, distance from its middle, platform radius.
 * The schools stand on the river side, facing the plaza (and the camera); the small places
 * on the south side; the causeways leave east (90°) and west (270°).
 */
export const PADS = [
  { id: 'history', a: 0, r: 38, pr: 7.5 },
  { id: 'physics', a: 50, r: 38, pr: 7.5 },
  { id: 'shop', a: 116, r: 35, pr: 4.6 },
  { id: 'arcade', a: 143, r: 35, pr: 4.6 },
  { id: 'nook', a: 180, r: 33.5, pr: 3.6 },
  { id: 'museum', a: 217, r: 35, pr: 4.6 },
  { id: 'board', a: 244, r: 35, pr: 4.6 },
  { id: 'math', a: 310, r: 38, pr: 7.5 }
];
/** The paths from the plaza out to the colonnade (compass degrees). */
export const SPOKES = [180, 65, 295];
const WIDTH = { path: 3.0, small: 2.4, causeway: 3.6 };

/** A straight walkway between two points. */
function segment(ax, az, bx, bz, width, extra = {}) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  return { ax, az, bx, bz, dx: dx / len, dz: dz / len, len, a0: 0, a1: len, width, ...extra };
}

/** The Nile's middle line, west to east: a smooth curve north of the oases ([x, z] points). */
export function riverLine(step = 6) {
  const { off } = DESERT.river;
  const zAt = (x) => {
    // Follow the oases' S (smoothly between them), with a slow meander of its own.
    const u = x / DESERT.gap + 3;
    const k = Math.max(0, Math.min(5, Math.floor(u)));
    const t = Math.max(-1, Math.min(2, u - k));
    const z0 = OASES[k][1], z1 = OASES[k + 1][1];
    const s = t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
    return z0 + (z1 - z0) * s - off - 7 * Math.sin(x * 0.019 + 0.6);
  };
  const pts = [];
  for (let x = -900; x <= 900; x += step) pts.push([x, zAt(x)]);
  return pts;
}

/** The pyramids and the Sphinx across the river from the first oasis: [x, z, base, height]. */
export const GIZA = {
  pyramids: [
    { id: 'great', x: -352, z: -215, base: 96, h: 64, cap: 'gold' },
    { id: 'middle', x: -235, z: -278, base: 86, h: 58, cap: 'casing' },
    { id: 'small', x: -150, z: -330, base: 50, h: 33 },
    { id: 'queen', x: -287, z: -193, base: 12, h: 8 },
    { id: 'queen', x: -287, z: -208, base: 11, h: 7.5 },
    { id: 'queen', x: -287, z: -222, base: 10, h: 7 }
  ],
  /** The Great Sphinx lies in front of them, looking across the river at the first oasis. */
  sphinx: { x: -278, z: -146, scale: 24 }
};

export function planDesert(count) {
  const { plazaR, walkR, walkW, deck, rim, gardenR } = DESERT;
  const y = deck;
  const floors = [];
  for (let k = 0; k < count; k++) {
    const [cx, cz] = OASES[k];
    const pads = {};
    for (const p of PADS) {
      const [x, z] = at2(cx, cz, p.r, p.a);
      pads[p.id] = { ...p, x, z, y, k, out: unit(x - cx, z - cz) };
    }
    const links = [];
    for (const a of SPOKES) {
      const [ax, az] = at2(cx, cz, plazaR - 1, a), [bx, bz] = at2(cx, cz, walkR, a);
      links.push(segment(ax, az, bx, bz, WIDTH.path, { type: 'path', floor: k + 1, spoke: a }));
    }
    for (const p of PADS) {
      const [ax, az] = at2(cx, cz, walkR, p.a);
      links.push(segment(ax, az, pads[p.id].x, pads[p.id].z, p.pr < 4 ? WIDTH.small : WIDTH.path, { type: 'path', floor: k + 1, to: p.id }));
    }
    const at = (id, dir, dist) => ({ x: pads[id].x + dir[0] * dist, z: pads[id].z + dir[1] * dist, y });
    const outOf = (id) => pads[id].out;
    const inOf = (id) => [-pads[id].out[0], -pads[id].out[1]];
    const plazaAt = (deg, r) => {
      const [x, z] = at2(cx, cz, r, deg);
      return { x, z, y };
    };
    const toMiddle = (p, d) => {
      const [ux, uz] = unit(cx - p.x, cz - p.z);
      return { x: p.x + ux * d, z: p.z + uz * d, y };
    };
    // Every door faces the plaza: you come along the path from the colonnade straight to it.
    const plinths = SUBJECT_ORDER.map((subject) => {
      const door = at(subject, inOf(subject), PLINTH_R - 0.6);
      return { subject, x: pads[subject].x, z: pads[subject].z, r: PLINTH_R, y: y + PLINTH_H, door: { x: door.x, z: door.z }, yaw: yawOf(inOf(subject)) };
    });
    const place = (kind, id, r) => ({ kind, x: pads[id].x, z: pads[id].z, r, yaw: yawOf(inOf(id)), at: at(id, inOf(id), r + 1.2) });
    const places = [
      ...SUBJECT_ORDER.map((s) => place(s, s, PLINTH_R)),
      place('shop', 'shop', 2.8),
      place('arcade', 'arcade', 2.8),
      { kind: 'landmark', x: cx, z: cz, r: 4.2, yaw: 0, at: plazaAt(180, 6.6) },
      place('museum', 'museum', 2.8),
      place('board', 'board', 1.6)
    ];
    // On the plaza: the portal east (towards the next oasis), the puzzle boss west, the World Portal (oasis 1) south-east.
    const portal = plazaAt(90, 8.2), boss = plazaAt(270, 8.2), gate = plazaAt(140, 8.8);
    const chest = at('nook', outOf('nook'), 0.4);
    const rock = at('nook', outOf('nook'), 2.0);
    const side = (id, deg) => dirOf(pads[id].a + deg);
    const gemSpots = [at('math', outOf('math'), 5.6), at('nook', side('nook', 90), 2.3), at('physics', outOf('physics'), 5.6), at('shop', outOf('shop'), 3.2), at('history', outOf('history'), 5.6), plazaAt(212, 10.5)].map((p) => [p.x, p.z]);
    const toySpots = [plazaAt(40, 9.5), plazaAt(-40, 9.5), at('math', side('math', 70), 5.9), at('physics', side('physics', -70), 5.9)].map((p) => [p.x, p.z]);
    const path = [];
    for (let i = 0; i < 12; i++) {
      const p = plazaAt(i * 30 + 15, walkR);
      path.push([p.x, p.z]);
    }
    for (const a of SPOKES) {
      const p = plazaAt(a, (plazaR + walkR) / 2);
      path.push([p.x, p.z]);
    }
    for (let i = 0; i < 6; i++) {
      const p = plazaAt(i * 60 + 30, 7.4);
      path.push([p.x, p.z]);
    }
    floors.push({
      k, n: k + 1, y, centre: { x: cx, z: cz },
      // The particles' box (particles.js): the oasis and a little beyond.
      cx, cz: cz - 50, rx: 50, rz: 92,
      pads, links, plinths, places, path, spurs: [],
      portal: { ...portal, yaw: yawOf(unit(cx - portal.x, cz - portal.z)), at: toMiddle(portal, 2.2) },
      boss: { ...boss, yaw: yawOf(unit(cx - boss.x, cz - boss.z)), at: toMiddle(boss, 2.6) },
      worldGate: k === 0 ? { ...gate, yaw: yawOf(unit(cx - gate.x, cz - gate.z)), at: toMiddle(gate, 2.2) } : null,
      chest: { ...chest, yaw: yawOf(inOf('nook')), rock: { x: rock.x, z: rock.z }, at: at('nook', inOf('nook'), 1.4) },
      gemSpots,
      toySpots,
      spawn: plazaAt(180, 6),
      label: { x: cx, y: y + 18, z: cz - 6 },
      view: { target: [cx, y + 1, cz - 8], offset: [16, 52, 66] }
    });
  }

  // The causeways: off the colonnade east, across the sand, onto the next oasis's colonnade west.
  const stairs = [];
  for (let k = 0; k < count - 1; k++) {
    const lo = floors[k], hi = floors[k + 1];
    const [ax, az] = at2(lo.centre.x, lo.centre.z, walkR, 90);
    const [bx, bz] = at2(hi.centre.x, hi.centre.z, walkR, 270);
    const [nx, nz] = unit(-(bz - az), bx - ax);
    const bend = k % 2 ? 4 : -4;
    const pts = [[ax, az], [ax + (bx - ax) * 0.34 + nx * bend, az + (bz - az) * 0.34 + nz * bend], [ax + (bx - ax) * 0.68 - nx * bend, az + (bz - az) * 0.68 - nz * bend], [bx, bz]];
    const segs = [];
    for (let i = 1; i < pts.length; i++) segs.push(segment(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], WIDTH.causeway, { type: 'causeway' }));
    const g = segs[0];
    // The first causeway is lined with little sphinxes, the others with obelisks and palms.
    stairs.push({ k, from: lo.n, to: hi.n, pts, segs, width: WIDTH.causeway, avenue: k % 3 === 0 ? 'sphinx' : k % 3 === 1 ? 'obelisk' : 'palm', a: { x: g.ax + g.dx * 5, z: g.az + g.dz * 5, y }, b: { x: g.ax + g.dx * 9, z: g.az + g.dz * 9, y } });
  }

  const margin = (hit) => (hit.deck || hit.plaza ? rim : 0.3);
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
      if (r > gardenR + 4) continue;
      if (r <= plazaR) roomier({ y, floor: f.n, layer: 0, plaza: true, edge: plazaR - r });
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
  /** The oasis nearest a point: what the camera is looking at. */
  function oasisAt(x, z) {
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
  const xs = floors.map((f) => f.centre.x), zs = floors.map((f) => f.centre.z);
  const reach = gardenR + 12;
  const first = floors[0];
  return {
    kind: 'desert',
    floors,
    stairs,
    surfaces,
    locate,
    ground,
    height,
    floorAt,
    margin,
    layers: 1,
    navBounds: { x0: Math.min(...xs) - reach, x1: Math.max(...xs) + reach, z0: Math.min(...zs) - reach, z1: Math.max(...zs) + reach },
    start: first.spawn,
    floorH: 12,
    focusFloor: (x, z) => oasisAt(x, z).n,
    /** "Out" is always south: the camera stands south of the buddy and looks north, to the river and the pyramids. */
    facing: () => 0,
    overview: { target: [0, 0, -70], offset: [0, 330, 400] },
    /** Arriving in the desert: the first oasis in front, the Sphinx and the pyramids beyond the river. */
    arrival: { target: [first.centre.x - 4, 10, first.centre.z - 46], offset: [16, 34, 128] },
    /** A warm, late-afternoon sky and a low sun from the south-west (World.js). */
    sky: {
      day: { top: '#5d9fe0', mid: '#ffd6a0', bottom: '#ffc788', fog: '#f4d2a2', hemiSky: '#ffeccc', hemiGround: '#c98f52', hemi: 0.78, sun: '#ffd9a2', sunI: 2.05, amb: 0.1 },
      night: { top: '#0a1233', mid: '#2a2f6e', bottom: '#4a3a6e', fog: '#2a2850', hemiSky: '#7f86d8', hemiGround: '#3a2a40', hemi: 0.85, sun: '#b9c2ff', sunI: 0.55, amb: 0.22 }
    },
    sun: [-58, 62, 66],
    /** Haze that lets the pyramids show from every oasis. */
    fog: { near: 200, nearK: 1.2, far: 950, farK: 3 }
  };
}
