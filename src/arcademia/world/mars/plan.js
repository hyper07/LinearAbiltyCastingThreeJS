/**
 * Mars's plan, as pure numbers (no three.js): Olympus Mons, the tallest
 * volcano in the solar system, as a compact red-rock mountain with a little
 * Mars base wound round it.
 *
 * One terrace spirals up the volcano like a mountain road: about two and a
 * half turns from the plain to the caldera's rim. Along it lie the seven
 * floors one after another, each a short flat stretch, joined by wide gentle
 * ramps (a pressure door at the foot of each). Going up is always the same
 * way round: to the right, seen from outside. Each floor is the same little
 * base: its three schools side by side round a plaza (joined by pressurised
 * tubes), its landmark beside them, the small places (tents) either side, the
 * puzzle boss and the floor portal by the ramp up, a chest at the start. The
 * floors lie on every side of the mountain, so it is used all the way round,
 * and nothing on a floor is more than a few seconds' walk from its plaza.
 *
 * Across the terrace (outwards from the cliff behind it): the buildings with
 * their backs to the rock, facing out (their fronts are +Z in the models), so
 * the camera, outside, sees their fronts; then the paved road with a railing
 * and lamps along its edge. Turns never lie over one another, so the walking
 * grid is a single layer (tree/nav.js with layers = 1). Same contract as the
 * Moon's plan (surfaces, locate, height, ground, floorAt, margin, focusFloor,
 * facing), plus Mars's sky (butterscotch, a small Sun, Phobos and Deimos:
 * mars/scene.js), its gravity, about 38 % of the Earth's (`float`), and
 * `camLift` (the follow camera never ends up in or behind the rock).
 *
 * Round the foot, on the red plain, stand the giants everyone can see: the
 * Big Rocket, the habitat village with its greenhouses, the rover's loop and
 * the helicopter drone's circle; far out are mesas, crater rims, a great
 * canyon and the other Tharsis volcanoes.
 */
import { PLINTH_R, PLINTH_H, GROUND_Y, fbm, noise } from '../layout.js';

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

export const MARS = {
  /** A storey: how much higher each floor is than the one before. */
  floorH: 6,
  /** The terrace's width (cliff to railing), and the cliff between one turn and the next. */
  W: 14.5,
  gap: 2.5,
  /** The terrace's inner edge at the top floor's far end (the caldera's rim), the pit inside. */
  topRi: 9,
  pitR: 5,
  pitDepth: 9,
  /** A ramp's length along its inner (shortest) edge: a storey up over this is a gentle slope. */
  rampIn: 14,
  /** Across the terrace, metres out from the cliff: where the paved road begins, and where each kind stands. */
  road: 9.9,
  placeLine: 5,
  /** How much of the terrace along the cliff is kept clear of walkers (on a floor, on a ramp). */
  back: 3.2,
  backRamp: 3.2,
  across: { math: 5, history: 5, physics: 5, landmark: 4.9, shop: 6.1, arcade: 6.1, museum: 6.1, board: 7.3, worlds: 7.2, portal: 7.4, boss: 8.6, chest: 6.6 },
  /** Floor 1's plaza faces this way (degrees): the arrival view looks in at the volcano with the Sun beyond. */
  spawnAngle: -20,
  /** The basal escarpment: how far out it runs from the terrace's edge (more for a higher stretch). */
  esc: 5,
  escK: 0.35
};
MARS.P = MARS.W + MARS.gap;

/**
 * A floor, from its start (the top of the ramp from below) to its end (the foot of the ramp up):
 * each kind and the width of road it takes (metres along the line the buildings stand on).
 * The World Portal is on floor 1 only. The plaza is in front of the middle school (history), the schools near where you arrive.
 */
export const ROW = [['chest', 4.2], ['board', 3.8], ['worlds', 4.0], ['landmark', 10.0], ['math', 10.2], ['history', 10.2], ['physics', 10.2], ['shop', 7.0], ['arcade', 7.0], ['museum', 7.0], ['portal', 3.8], ['boss', 4.2]];
const PAD0 = 1.4, PAD1 = 1.2;
const SCHOOLS = ['math', 'history', 'physics'];
const RADIUS = { shop: 2.8, arcade: 2.8, museum: 2.8, landmark: 4.2, board: 1.6 };

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Craters on the plain round the foot: [x, z, radius]. */
export const CRATERS = [[-196, -40, 16], [205, 30, 13], [-60, -228, 22], [175, -175, 19], [120, 205, 9], [-205, 150, 11]];

/**
 * The giants on the plain, seen from the floors (r: the ground kept flat for each): the Big Rocket
 * on its pad, the habitat village with greenhouses, the rover's loop, the drone's circle. Arriving,
 * the rocket stands left of the volcano and the village right, the rover between; all off the
 * terrace, so they never lengthen a walk.
 */
export const SIGHTS = {
  rocket: { x: -88, z: 72, r: 15 },
  village: { x: 9, z: 109, r: 24 },
  rover: { x: -36, z: 100, loop: 11, r: 5 },
  drone: { x: 9, z: 109, loop: 18, y: 15 }
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
 * The plan for Mars's `count` floors along the spiral terrace.
 *
 * Positions on the terrace are (φ, across): φ is how far round the spiral (radians, 0 at floor 1's
 * start, growing up the mountain), `across` is metres out from the terrace's inner edge.
 */
export function planMars(count) {
  const { floorH: H, W, gap, P, topRi, placeLine: PL } = MARS;
  // Arc lengths along a line `o` metres out from the inner edge, counted from the top end back down
  // the spiral (ψ radians from the top floor's far end): the inner edge there is topRi + P ψ / 2π.
  const qa = P / (2 * TAU);
  const sAt = (o, psi) => (topRi + o) * psi + qa * psi * psi;
  const psiFor = (o, s) => {
    const b = topRi + o;
    return (-b + Math.sqrt(b * b + 4 * qa * s)) / (2 * qa);
  };
  const rowOf = (k) => ROW.filter(([kind]) => kind !== 'worlds' || k === 0);
  const lengthOf = (k) => PAD0 + PAD1 + rowOf(k).reduce((s, [, w]) => s + w, 0);

  // Lay the floors from the top down, each ramp below its floor.
  const lay = [];
  let cur = 0;
  for (let k = count - 1; k >= 0; k--) {
    const psiE = cur, psiS = psiFor(PL, sAt(PL, psiE) + lengthOf(k));
    lay[k] = { psiS, psiE };
    cur = k > 0 ? psiFor(0, sAt(0, psiS) + MARS.rampIn) : psiS;
  }
  const PHI = cur;
  const riOf = (phi) => topRi + (P * (PHI - phi)) / TAU;
  const spans = lay.map(({ psiS, psiE }) => ({ s: PHI - psiS, e: PHI - psiE }));
  /** Along a floor: φ at a distance d (metres on the building line) from its start. */
  const phiAlong = (k, d) => PHI - psiFor(PL, sAt(PL, PHI - spans[k].s) - d);
  // Floor 1's plaza (in front of its history school) faces the spawn angle.
  const slotD = (k, kind) => {
    let d = PAD0;
    for (const [kk, w] of rowOf(k)) {
      if (kk === kind) return d + w / 2;
      d += w;
    }
    return null;
  };
  const th0 = MARS.spawnAngle * D2R - phiAlong(0, slotD(0, 'history'));
  const thetaOf = (phi) => th0 + phi;
  const pt = (phi, o, y = 0) => {
    const r = riOf(phi) + o, t = thetaOf(phi);
    return { x: r * Math.sin(t), z: r * Math.cos(t), y };
  };
  const out = (phi) => [Math.sin(thetaOf(phi)), Math.cos(thetaOf(phi))];

  // The ramps between floors: a storey up, the whole width of the terrace.
  const ramps = [];
  for (let k = 0; k < count - 1; k++) ramps.push({ k, from: k + 1, to: k + 2, pa: spans[k].e, pb: spans[k + 1].s, ya: k * H, yb: (k + 1) * H });
  /** The terrace's height at φ: a floor's level, or part-way up a ramp. */
  function bandY(phi) {
    for (let k = 0; k < count; k++) {
      if (phi <= spans[k].e + 1e-9) {
        if (phi >= spans[k].s - 1e-9 || k === 0) return k * H;
        const r = ramps[k - 1];
        return r.ya + ((phi - r.pa) / (r.pb - r.pa)) * H;
      }
    }
    return (count - 1) * H;
  }
  /** What is at φ: { floor } on a floor, { ramp } on a ramp. */
  function segAt(phi) {
    for (let k = 0; k < count; k++) {
      if (phi >= spans[k].s - 1e-9 && phi <= spans[k].e + 1e-9) return { floor: k + 1 };
      if (k < count - 1 && phi > spans[k].e && phi < spans[k + 1].s) return { ramp: ramps[k] };
    }
    return { floor: phi < 0 ? 1 : count };
  }
  /** The terrace's turns at an angle (the outermost first): φ, inner and outer edge, height. */
  function bandsAt(th) {
    const fu = (((th - th0) % TAU) + TAU) % TAU;
    const list = [];
    for (let phi = fu; phi <= PHI + 1e-9; phi += TAU) {
      const ri = riOf(phi);
      list.push({ phi, ri, ro: ri + W, y: bandY(phi) });
    }
    return list;
  }
  /** Where a point is on the terrace: { phi, ri, across } or null (off it). */
  function onBand(x, z) {
    const r = Math.hypot(x, z);
    for (const b of bandsAt(Math.atan2(x, z))) {
      if (r > b.ro) return null;
      if (r >= b.ri) return { ...b, across: r - b.ri, r };
    }
    return null;
  }

  const floors = [];
  for (let k = 0; k < count; k++) {
    const y = k * H;
    const at = (kind, o = MARS.across[kind]) => {
      const phi = phiAlong(k, slotD(k, kind));
      return { phi, ...pt(phi, o, y) };
    };
    const place = (kind) => {
      const p = at(kind), r = SCHOOLS.includes(kind) ? PLINTH_R : RADIUS[kind];
      return { kind, x: p.x, z: p.z, r, yaw: thetaOf(p.phi), phi: p.phi, at: pt(p.phi, MARS.across[kind] + r + 1.2, y) };
    };
    const plinths = SCHOOLS.map((subject) => {
      const p = at(subject), door = pt(p.phi, MARS.across[subject] + PLINTH_R - 0.6);
      return { subject, x: p.x, z: p.z, r: PLINTH_R, y: y + PLINTH_H, door: { x: door.x, z: door.z }, yaw: thetaOf(p.phi) };
    });
    const places = [...SCHOOLS.map(place), place('shop'), place('arcade'), place('landmark'), place('museum'), place('board')];
    const spot = (kind, front) => {
      const p = at(kind);
      return { x: p.x, z: p.z, yaw: thetaOf(p.phi), at: pt(p.phi, MARS.across[kind] + front, y) };
    };
    const chestP = at('chest'), rock = at('chest', 3.6);
    const plaza = at('history'), mid = plaza.phi;
    const spawn = pt(mid, 12.2, y);
    // The road's middle, start to end (the townsfolk stroll along it).
    const path = [];
    const len = lengthOf(k);
    for (let d = 1.5; d < len - 1; d += 3) {
      const p = pt(phiAlong(k, d), 12.0, y);
      path.push([p.x, p.z]);
    }
    const D = (kind, dd = 0) => phiAlong(k, slotD(k, kind) + dd);
    // Gems hide in nooks behind the buildings and out at the far corners; toys stand by the railing.
    const gemSpots = [[D('landmark', -5.6), 2.2], [D('shop', -3.9), 2.6], [phiAlong(k, 0.9), W - 1.4], [D('museum', 4.0), 2.6], [phiAlong(k, len - 1.0), W - 1.4]].map(([phi, o]) => {
      const p = pt(phi, o);
      return [p.x, p.z];
    });
    const toySpots = [D('board'), D('landmark', -3), D('shop', 1), D('museum')].map((phi) => {
      const p = pt(phi, W - 1.3);
      return [p.x, p.z];
    });
    // The pressurised tubes joining the three schools (from dome wall to dome wall), as blockers too.
    const tubes = [['math', 'history'], ['history', 'physics']].map(([a, b]) => {
      const ra = riOf(at(a).phi) + PL;
      const pa = pt(at(a).phi + 3.1 / ra, 4.6, y), pb = pt(at(b).phi - 3.1 / ra, 4.6, y);
      return { a: pa, b: pb, r: 0.7, y: y + PLINTH_H + 0.75 };
    });
    const blockers = tubes.flatMap((t) => {
      const n = Math.ceil(Math.hypot(t.b.x - t.a.x, t.b.z - t.a.z) / 0.7);
      return Array.from({ length: n + 1 }, (_, i) => ({ x: t.a.x + ((t.b.x - t.a.x) * i) / n, z: t.a.z + ((t.b.z - t.a.z) * i) / n, y, r: 0.85 }));
    });
    const [ox, oz] = out(mid), side = [oz, -ox];
    const lab = pt(mid, W + 7, y);
    floors.push({
      k, n: k + 1, y,
      phiS: spans[k].s, phiE: spans[k].e,
      ri: riOf(mid), ro: riOf(mid) + W,
      // The particles' box (particles.js): round the plaza.
      cx: spawn.x, cz: spawn.z - 30, rx: 44, rz: 60,
      plinths, places, path, spurs: [],
      plaza: { x: plaza.x, z: plaza.z, phi: mid },
      portal: spot('portal', 2.2),
      boss: spot('boss', 2.6),
      worldGate: k === 0 ? spot('worlds', 2.2) : null,
      chest: { x: chestP.x, z: chestP.z, yaw: thetaOf(chestP.phi), rock: { x: rock.x, z: rock.z }, at: pt(chestP.phi, MARS.across.chest + 1.6, y) },
      gemSpots,
      toySpots,
      tubes,
      blockers,
      spawn,
      /** Where you step onto this floor from the ramp below, and where the ramp up begins. */
      arrive: pt(phiAlong(k, 1.5), 12.0, y),
      leave: pt(phiAlong(k, len - 1.5), 12.0, y),
      label: { x: lab.x, y: y + 14, z: lab.z },
      view: { target: [plaza.x, y + 2, plaza.z], offset: [ox * 40 + side[0] * 9, 30, oz * 40 + side[1] * 9] }
    });
  }

  // The ramps as stairs (the same shape World.js and the tests use): foot and top on the middle line.
  const stairs = ramps.map((r) => {
    const a = pt(r.pa, W / 2, r.ya), b = pt(r.pb, W / 2, r.yb);
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const t = thetaOf(r.pa);
    // Up the ramp at its foot: along the spiral, a touch inwards.
    const tx = Math.cos(t), tz = -Math.sin(t);
    return { ...r, a, b, width: W, len, dx: (b.x - a.x) / len, dz: (b.z - a.z) / len, up: { x: tx, z: tz } };
  });
  for (const s of stairs) s.ramp = s;
  ramps.forEach((r, i) => (r.stair = stairs[i]));

  const margin = (hit) => (hit.stair ? 0.5 : 0.8);
  /** The surface at a spot (at most one: turns never overlap). */
  function surfaces(x, z) {
    const b = onBand(x, z);
    if (!b) return [];
    const seg = segAt(b.phi);
    // The strip along the cliff behind the buildings is not for walking (no narrow back alleys to get stuck in).
    const ends = Math.min(W - b.across, b.phi * b.r, (PHI - b.phi) * b.r);
    if (seg.ramp) return [{ y: b.y, floor: 0, layer: 0, stair: seg.ramp.stair, edge: Math.min(ends, b.across - MARS.backRamp) }];
    return [{ y: b.y, floor: seg.floor, layer: 0, ring: floors[seg.floor - 1], edge: Math.min(ends, b.across - MARS.back) }];
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

  const topY = (count - 1) * H;
  /** The summit inside the top turn: a plateau a little above the top floor, the caldera's pit in the middle. */
  const summit = (x, z, r) => {
    const rim = MARS.pitR + 2.2;
    if (r >= rim) return topY + 1.0 + fbm(x * 0.2, z * 0.2) * 0.3;
    return topY + 1.0 - (MARS.pitDepth + 1.0) * (1 - smooth(MARS.pitR * 0.45, rim, r)) ** 0.8 + fbm(x * 0.25, z * 0.25) * 0.4;
  };
  /**
   * The rock of the mountain at a spot (mars/scene.js draws it): the terrace (its own height), the
   * layered cliffs between one turn and the next, the summit and caldera inside the top turn, the
   * escarpment from the outermost turn down to the plain.
   */
  function rock(x, z) {
    const r = Math.hypot(x, z);
    const bands = bandsAt(Math.atan2(x, z));
    const o = bands[0];
    if (r >= o.ro) {
      const esc = MARS.esc + (o.y - GROUND_Y) * MARS.escK;
      const k = smooth(o.ro, o.ro + esc, r);
      return o.y + (plain(x, z) - o.y) * k + fbm(x * 0.3, z * 0.3) * 0.8 * Math.sin(Math.PI * Math.min(1, k * 1.2));
    }
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      if (r >= b.ri) return b.y;
      const inner = bands[i + 1];
      if (!inner) break;
      if (r > inner.ro) {
        const t = smooth(inner.ro, b.ri, r);
        return inner.y + (b.y - inner.y) * t + fbm(x * 0.45 + i * 3, z * 0.45) * 1.2 * Math.sin(Math.PI * t);
      }
    }
    const last = bands.at(-1), sum = summit(x, z, r);
    if (last.y > topY - 0.5) return r > last.ri - 1.2 ? last.y + (Math.max(sum, last.y + 0.8) - last.y) * (1 - smooth(last.ri - 0.5, last.ri, r)) : sum;
    const t = smooth(last.ri - gap, last.ri, r);
    return sum + (last.y - sum) * t + fbm(x * 0.45, z * 0.45) * 1.2 * Math.sin(Math.PI * t);
  }

  /**
   * How much the camera must rise so it is out of the rock and nothing of the mountain stands between it
   * and what it looks at (the buddy): 0 when the view is clear.
   */
  function camLift(cx, cy, cz, tx, ty, tz) {
    let need = rock(cx, cz) + 2.2 - cy;
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      const x = cx + (tx - cx) * t, z = cz + (tz - cz) * t, yy = cy + (ty - cy) * t;
      const h = rock(x, z) + 0.7;
      if (h > yy) need = Math.max(need, (h - yy) / (1 - t));
    }
    return Math.max(0, need);
  }

  const foot = floors[0];
  const footR = riOf(0) + W;
  const reach = footR + 1;
  const fa = Math.atan2(foot.spawn.x, foot.spawn.z);
  return {
    kind: 'mars',
    floors,
    stairs,
    ramps,
    surfaces,
    locate,
    ground,
    height,
    floorAt,
    margin,
    rock,
    camLift,
    bandsAt,
    bandY,
    onBand,
    riOf,
    thetaOf,
    pt,
    phiAlong,
    segAt,
    PHI,
    footR,
    /** The volcano's own rock reaches this far out (the escarpment's foot at its highest); the far plain beyond. */
    rockR: footR + MARS.esc + (topY * 0.75 - GROUND_Y) * MARS.escK + 6,
    layers: 1,
    navBounds: { x0: -reach, x1: reach, z0: -reach, z1: reach },
    start: foot.spawn,
    floorH: H,
    /** The floor nearest a point (on a ramp: the nearer end's): what the camera is looking at. */
    focusFloor: (x, z) => {
      const r = Math.hypot(x, z);
      let best = null, bd = Infinity;
      for (const b of bandsAt(Math.atan2(x, z))) {
        const d = r < b.ri ? b.ri - r : r > b.ro ? r - b.ro : 0;
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
      if (!best) return 1;
      const seg = segAt(best.phi);
      return seg.floor ?? (best.phi - seg.ramp.pa < seg.ramp.pb - best.phi ? seg.ramp.from : seg.ramp.to);
    },
    /** "Out" at a point: away from the volcano's middle (the camera stands that way). */
    facing: (x, z) => Math.atan2(x, z),
    /** The follow camera turns with the buddy round the mountain, so it stays outside and A / D walk round. */
    followRound: true,
    /** The follow camera straight out behind the buddy (not off to one side), so A / D run along the terrace. */
    homeOffset: [0, 8.2, 14.2],
    overview: { target: [Math.sin(fa) * 42, 0, Math.cos(fa) * 42], offset: [Math.sin(fa) * 112, 132, Math.cos(fa) * 112] },
    /** Arriving: behind the buddy on floor 1, the whole volcano beyond, the Sun, Phobos and Deimos in the sky. */
    arrival: { target: [foot.spawn.x, 8, foot.spawn.z], offset: [Math.sin(fa - 0.06) * 196, 15, Math.cos(fa - 0.06) * 196] },
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
