/**
 * Mars's plan, as pure numbers (no three.js): Olympus Mons, the tallest
 * volcano in the solar system, as a red-rock mountain you can walk all the
 * way round. Each floor is a whole ring-shaped terrace round the volcano, one
 * storey above the last and a step further in, with layered red-rock cliffs
 * between; the top terrace is the rim of the caldera.
 *
 * On every ring the three schools and the small places stand all the way
 * round, facing out (their fronts are +Z in the models), so the camera,
 * outside the ring, sees their fronts wherever the buddy is. A walking lane
 * runs round the outside of each ring. Stairs cut into the cliff climb from
 * each ring to the next, each set a good way round from the last, so the
 * way up spirals round the mountain.
 *
 * Rings never lie over one another, so the walking grid is a single layer
 * (tree/nav.js with layers = 1). Same contract as the Moon's plan (surfaces,
 * locate, height, ground, floorAt, margin, focusFloor, facing), plus Mars's
 * sky (butterscotch, a small Sun, Phobos and Deimos: mars/scene.js) and its
 * gravity, about 38 % of the Earth's (`float`).
 *
 * Round the foot, on the red plain, stand the giants everyone can see: the
 * Big Rocket, the habitat village with its greenhouses, the rover's loop and
 * the helicopter drone's circle; far out are mesas, crater rims, a great
 * canyon and the other Tharsis volcanoes.
 */
import { PLINTH_R, PLINTH_H, SUBJECT_ORDER, GROUND_Y, fbm, noise } from '../layout.js';

export const MARS = {
  /** A storey: the height of the red-rock cliff from one ring up to the next. */
  floorH: 7.5,
  /** A ring's walking width, and the cliff's width between one ring and the next. */
  ringW: 14,
  cliff: 2.5,
  /** The top ring's inner edge: the caldera's rim. Inside, the pit. */
  rimR: 18,
  pitR: 10,
  pitDepth: 12,
  /** The basal escarpment: from the first ring down to the plain. */
  esc: 7,
  /** Where the places stand across a ring (from its inner edge) and the lane walks round it. */
  placeIn: 5.8,
  laneIn: 11.8,
  stairW: 3.0,
  /** How far round (degrees) each ring's stairs up are from where you arrive on it. */
  stairAt: 152
};

const D2R = Math.PI / 180;
const polar = (r, a) => [r * Math.sin(a), r * Math.cos(a)];
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** The two flights of a staircase with a landing between (the same as structures.js buildStairs). */
export const lift = (t) => (t < 0.42 ? (t / 0.42) * 0.5 : t < 0.58 ? 0.5 : 0.5 + ((t - 0.58) / 0.42) * 0.5);

/** Ring k's (0 = the foot) inner and outer radius, for `count` rings. */
export const ringIn = (k, count = 7) => MARS.rimR + (count - 1 - k) * (MARS.ringW + MARS.cliff);
export const ringOut = (k, count = 7) => ringIn(k, count) + MARS.ringW;

/** The places round a ring: degrees from where the stairs from below arrive (the first ring: the World Portal's spot). */
export const SLOTS = { landmark: 20, math: 56, shop: 90, history: 122, portal: 141, boss: 168, museum: 192, physics: 226, board: 262, arcade: 298, nook: 332, gate: -15 };

/** Craters on the plain round the foot: [x, z, radius]. */
export const CRATERS = [[-196, -40, 16], [205, 30, 13], [-60, -228, 22], [175, -175, 19], [120, 205, 9], [-205, 150, 11]];

/**
 * The giants on the plain, seen from every ring (r: the ground kept flat for each): the Big
 * Rocket on its pad, the habitat village with greenhouses, the rover's loop, the drone's circle.
 * Arriving, the rocket stands left of the volcano and the village right, the rover between.
 */
export const SIGHTS = {
  rocket: { x: -95, z: 128, r: 15 },
  village: { x: -2, z: 178, r: 24 },
  rover: { x: -50, z: 172, loop: 16, r: 5 },
  drone: { x: -2, z: 178, loop: 18, y: 15 }
};

/**
 * The Sun: low in the butterscotch sky to the north-east, where the arrival view sees it; the light
 * comes from the same way, a little higher, so the terraces stay bright. Phobos and Deimos: up in
 * the sky to the north (unit-ish directions, sizes).
 */
export const SUN = { disc: [0.743, 0.21, -0.669], light: [0.6, 0.66, -0.54] };
export const MOONS = {
  phobos: { dir: [0.208, 0.24, -0.978], r: 34 },
  deimos: { dir: [0.616, 0.158, -0.788], r: 13 }
};

/** The far canyon's line (a Valles Marineris-like gash to the east), and its half width. */
export const CANYON = { pts: [[330, -80], [480, -230], [720, -300], [980, -330], [1300, -460]], half: 60, depth: 48 };

/** Distance from a point to a polyline. */
export function distTo(pts, x, z) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

/** A crater's bowl and raised rim: the height it adds at distance d from its middle, radius r. */
function crater(d, r) {
  if (d > r * 1.6) return 0;
  const k = d / r;
  if (k < 1) return -r * 0.18 * (1 - k * k) + r * 0.08 * smooth(0.6, 1, k);
  return r * 0.08 * (1 - smooth(1, 1.6, k));
}

/** The red plain round the volcano: soft dunes, craters, the giants' pads kept flat. */
export function plain(x, z) {
  let h = GROUND_Y + fbm(x * 0.035, z * 0.035) * 1.1 + Math.max(0, noise(x * 0.09 + 4, z * 0.03)) * 0.7;
  for (const [cx, cz, r] of CRATERS) h += crater(Math.hypot(x - cx, z - cz), r);
  for (const s of [SIGHTS.rocket, SIGHTS.village]) {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < s.r + 8) h += (GROUND_Y - h) * (1 - smooth(s.r, s.r + 8, d));
  }
  return h;
}

/** The plain far out (mars/scene.js): mesas, big craters, the canyon, the other volcanoes on the skyline. */
export function farGround(x, z) {
  let h = plain(x, z);
  const far = smooth(260, 460, Math.hypot(x, z));
  if (far > 0) {
    const m = fbm(x * 0.0042 + 11, z * 0.0042 - 7);
    h += smooth(0.3, 0.38, m) * 34 * far + smooth(0.52, 0.58, m) * 18 * far;
    for (const [cx, cz, cr] of [[-470, 170, 95], [-720, -420, 150], [520, 380, 120], [-260, 520, 70]]) h += crater(Math.hypot(x - cx, z - cz), cr) * 1.4;
    const c = distTo(CANYON.pts, x, z);
    h += -CANYON.depth * (1 - smooth(CANYON.half * 0.55, CANYON.half, c)) + 6 * smooth(CANYON.half, CANYON.half + 20, c) * (1 - smooth(CANYON.half + 20, CANYON.half + 90, c));
    for (const [cx, cz, cr, ch] of [[-700, -980, 320, 110], [-150, -1180, 300, 100], [420, -1080, 280, 90]]) {
      const d = Math.hypot(x - cx, z - cz);
      if (d < cr) h = Math.max(h, GROUND_Y + ch * (1 - d / cr) ** 1.4 - (d < cr * 0.12 ? (1 - d / (cr * 0.12)) * 14 : 0));
    }
  }
  return h;
}

/**
 * The plan for Mars's `count` ring terraces.
 */
export function planMars(count) {
  const H = MARS.floorH;
  const floors = [];
  const stairs = [];
  let arrive = -20 * D2R;
  for (let k = 0; k < count; k++) {
    const y = k * H;
    const ri = ringIn(k, count), ro = ringOut(k, count);
    const rc = ri + MARS.placeIn, rl = ri + MARS.laneIn;
    const base = arrive;
    const ang = (deg) => base + deg * D2R;
    const at = (r, deg) => {
      const [x, z] = polar(r, ang(deg));
      return { x, z, y };
    };
    /** A place's walk-up spot: out from it towards the lane. */
    const front = (deg, dist) => at(rc + dist, deg);
    const plinths = SUBJECT_ORDER.map((subject) => {
      const p = at(rc, SLOTS[subject]);
      const door = front(SLOTS[subject], PLINTH_R - 0.6);
      return { subject, x: p.x, z: p.z, r: PLINTH_R, y: y + PLINTH_H, door: { x: door.x, z: door.z }, yaw: ang(SLOTS[subject]) };
    });
    const place = (kind, slot, r) => {
      const p = at(rc, SLOTS[slot]);
      return { kind, x: p.x, z: p.z, r, yaw: ang(SLOTS[slot]), at: front(SLOTS[slot], r + 1.2) };
    };
    const places = [
      ...SUBJECT_ORDER.map((s) => place(s, s, PLINTH_R)),
      place('shop', 'shop', 2.8),
      place('arcade', 'arcade', 2.8),
      place('landmark', 'landmark', 4.2),
      place('museum', 'museum', 2.8),
      place('board', 'board', 1.6)
    ];
    const portal = at(rc, SLOTS.portal), boss = at(rc, SLOTS.boss), gate = at(rc, SLOTS.gate);
    const chest = at(rc - 0.6, SLOTS.nook), rock = at(rc - 2.6, SLOTS.nook);
    const path = [];
    for (let d = 0; d < 360; d += 9) {
      const p = at(rl, d);
      path.push([p.x, p.z]);
    }
    const gemSpots = [[ri + 1.6, 40], [ri + 1.6, 206], [ro - 1.3, 340], [ri + 1.6, 306], [ro - 1.3, 108]].map(([r, d]) => {
      const p = at(r, d);
      return [p.x, p.z];
    });
    const toySpots = [75, 208, 274, 307].map((d) => {
      const p = at(rc + 1.0, d);
      return [p.x, p.z];
    });
    const out = (deg) => [Math.sin(ang(deg)), Math.cos(ang(deg))];
    const lab = at(rc, 90), lo = out(90);
    const v = at(rc, SLOTS.landmark), vo = out(SLOTS.landmark), vs = [vo[1], -vo[0]];
    const spawn = at(rl - 0.8, k === 0 ? 0 : 4);
    floors.push({
      k, n: k + 1, y, ri, ro, rc, rl, base,
      // The particles' box (particles.js): the whole ring.
      cx: 0, cz: -ro + 10, rx: ro, rz: ro * 2 - 14,
      plinths, places, path, spurs: [],
      portal: { ...portal, yaw: ang(SLOTS.portal), at: front(SLOTS.portal, 2.2) },
      boss: { ...boss, yaw: ang(SLOTS.boss), at: front(SLOTS.boss, 2.6) },
      worldGate: k === 0 ? { ...gate, yaw: ang(SLOTS.gate), at: front(SLOTS.gate, 2.2) } : null,
      chest: { ...chest, yaw: ang(SLOTS.nook), rock: { x: rock.x, z: rock.z }, at: front(SLOTS.nook, 0.8) },
      gemSpots,
      toySpots,
      spawn,
      label: { x: lab.x + lo[0] * 6, y: y + 15, z: lab.z + lo[1] * 6 },
      view: { target: [v.x, y + 1, v.z], offset: [vo[0] * 62 + vs[0] * 18, 46, vo[1] * 62 + vs[1] * 18] }
    });
    // The stairs up: from this ring's inner strip, through the cliff, to the next ring's outer strip.
    if (k < count - 1) {
      const a0 = ang(MARS.stairAt);
      const r0 = ri + 2.5, r1 = ringOut(k + 1, count) - 2.5;
      // Turned round far enough that the flight is about 16 m long (a gentle climb).
      const tang = Math.sqrt(Math.max(1, 16 * 16 - (r0 - r1) ** 2));
      const a1 = a0 + tang / ((r0 + r1) / 2);
      const [ax, az] = polar(r0, a0), [bx, bz] = polar(r1, a1);
      const len = Math.hypot(bx - ax, bz - az);
      stairs.push({ k, from: k + 1, to: k + 2, a: { x: ax, z: az, y }, b: { x: bx, z: bz, y: y + H }, width: MARS.stairW, len, dx: (bx - ax) / len, dz: (bz - az) / len });
      arrive = a1;
    }
  }

  /** Along a staircase: how far (a, metres from its foot) and how far off its middle line (perp). */
  const across = (s, x, z) => {
    const ox = x - s.a.x, oz = z - s.a.z;
    return { a: ox * s.dx + oz * s.dz, perp: Math.abs(ox * s.dz - oz * s.dx) };
  };
  function onStair(s, x, z, over = 0.3) {
    const { a, perp } = across(s, x, z);
    if (a < -over || a > s.len + over || perp > s.width / 2) return null;
    return { t: Math.max(0, Math.min(1, a / s.len)), edge: s.width / 2 - perp };
  }
  const stairY = (s, t) => s.a.y + (s.b.y - s.a.y) * lift(t);
  const ringOf = (r) => floors.find((f) => r >= f.ri && r <= f.ro) ?? null;
  const margin = (hit) => (hit.stair ? 0.3 : 0.8);
  /** The surface at a spot (at most one: nothing overlaps; the stairs win where they cross a ring's strip). */
  function surfaces(x, z) {
    for (const s of stairs) {
      const o = onStair(s, x, z);
      if (o) return [{ y: stairY(s, o.t), floor: 0, layer: 0, stair: s, edge: o.edge }];
    }
    const r = Math.hypot(x, z);
    const f = ringOf(r);
    return f ? [{ y: f.y, floor: f.n, layer: 0, ring: f, edge: Math.min(r - f.ri, f.ro - r) }] : [];
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
    if (hit.ring) {
      for (const p of hit.ring.plinths) {
        const d = Math.hypot(x - p.x, z - p.z);
        if (d < PLINTH_R + 0.3) return hit.y + PLINTH_H * (1 - smooth(PLINTH_R - 0.1, PLINTH_R + 0.3, d));
      }
    }
    return hit.y;
  }
  const floorAt = (x, z, yy) => locate(x, z, yy)?.floor ?? 0;

  const top = floors.at(-1), foot = floors[0];
  /**
   * The rock of the mountain at a spot (mars/scene.js draws it): the ring tops, the layered cliffs
   * between them (cut away where the stairs go), the caldera's pit, the escarpment down to the plain.
   */
  function rock(x, z) {
    const r = Math.hypot(x, z);
    let h;
    if (r < top.ri) {
      // The caldera: a little lip on the rim, a steep wall down to the pit's floor.
      if (r > top.ri - 1.2) h = top.y + 1.0 * (1 - smooth(top.ri - 0.4, top.ri, r));
      else h = top.y - MARS.pitDepth + (MARS.pitDepth + 1.0) * smooth(MARS.pitR, top.ri - 1.2, r) ** 1.6 + fbm(x * 0.2, z * 0.2) * 0.5;
    } else if (r > foot.ro) {
      const k = smooth(foot.ro, foot.ro + MARS.esc, r);
      h = foot.y + (plain(x, z) - foot.y) * k + fbm(x * 0.3, z * 0.3) * 0.8 * Math.sin(Math.PI * Math.min(1, k * 1.2));
    } else {
      const f = ringOf(r);
      if (f) h = f.y;
      else {
        // A cliff between ring k (outside, lower) and ring k + 1 (inside, higher).
        const lowF = floors.find((g) => g.ri > r) ?? foot;
        const hiF = floors[lowF.k + 1] ?? top;
        const t = smooth(hiF.ro, lowF.ri, r);
        h = hiF.y + (lowF.y - hiF.y) * t + fbm(x * 0.45 + lowF.k * 3, z * 0.45) * 1.4 * Math.sin(Math.PI * t);
      }
    }
    // Where a staircase cuts through, the rock is carved down to just under its steps.
    for (const s of stairs) {
      const { a, perp } = across(s, x, z);
      if (a < -1.5 || a > s.len + 1.5 || perp > s.width / 2 + 1.4) continue;
      const t = Math.max(0, Math.min(1, a / s.len));
      const cap = stairY(s, t) - 0.25 + Math.max(0, perp - s.width / 2) * 3;
      h = Math.min(h, Math.max(cap, s.a.y - 0.4));
    }
    return h;
  }

  const fa = Math.atan2(foot.spawn.x, foot.spawn.z);
  const reach = foot.ro + 4;
  return {
    kind: 'mars',
    floors,
    stairs,
    surfaces,
    locate,
    ground,
    height,
    floorAt,
    margin,
    rock,
    layers: 1,
    navBounds: { x0: -reach, x1: reach, z0: -reach, z1: reach },
    start: foot.spawn,
    floorH: H,
    /** The ring nearest a point: what the camera is looking at. */
    focusFloor: (x, z) => {
      const r = Math.hypot(x, z);
      let best = foot, bd = Infinity;
      for (const f of floors) {
        const d = r < f.ri ? f.ri - r : r > f.ro ? r - f.ro : 0;
        if (d < bd) {
          bd = d;
          best = f;
        }
      }
      return best.n;
    },
    /** "Out" at a point: away from the volcano's middle (the camera stands that way). */
    facing: (x, z) => Math.atan2(x, z),
    overview: { target: [0, 18, 0], offset: [130, 175, 250] },
    /** Arriving: behind the buddy on the first ring, the whole volcano beyond, the Sun, Phobos and Deimos in the sky. */
    arrival: { target: [foot.spawn.x, 8, foot.spawn.z], offset: [Math.sin(fa) * 170, 14, Math.cos(fa) * 170] },
    /** The camera may look a little flatter, so the sky with the Sun and the two little moons shows. */
    maxPolar: 1.5,
    /** About 38 % of the Earth's gravity: hops a bit floatier (the Moon's are floatier still). */
    float: 0.45,
    /** No Earth's moon in this sky: Phobos and Deimos instead (mars/scene.js). */
    noMoon: true,
    sky: {
      // A butterscotch day: pale peach overhead, warm cream at the horizon.
      day: { top: '#e8a074', mid: '#f5cba0', bottom: '#fde3c6', fog: '#f0c7a0', hemiSky: '#fff0e2', hemiGround: '#c27a52', hemi: 1.15, sun: '#fff3e2', sunI: 1.9, amb: 0.18 },
      // Night: deep indigo with the blue glow of a Martian sunset low on the horizon.
      night: { top: '#0c1232', mid: '#26306a', bottom: '#4f6fb8', fog: '#2a3264', hemiSky: '#8a9ae0', hemiGround: '#4a2c3a', hemi: 0.85, sun: '#a9b8ff', sunI: 0.55, amb: 0.24 }
    },
    sun: SUN.light.map((v) => v * 100),
    fog: { near: 150, nearK: 1.1, far: 950, farK: 2.6 }
  };
}
