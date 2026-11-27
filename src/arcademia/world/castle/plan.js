/**
 * The Sky Castle's plan, as pure numbers (no three.js): a floating island in
 * the sky crowned by a white-stone castle town.
 *
 * One street of terraces winds up the castle hill like a snail's shell: about
 * two and a half turns from the lower town by the island's rim to the high
 * keep. Along it lie the seven floors one after another — the gatehouse
 * market by the rim, terraced streets and courtyards, walls and bridges
 * between towers, up to the spire gardens round the keep — joined by wide
 * gentle stone ramps (a portcullis at the foot of each, raised while the
 * floor above is open). Going up is always the same way round: to the right,
 * seen from outside. Each floor is the same cosy street: its three schools
 * side by side round a plaza, its landmark beside them, the market stalls of
 * the small places either side, the puzzle boss and the floor portal by the
 * ramp up, a chest at the start. The floors lie on every side of the island,
 * and nothing on a floor is more than a few seconds' walk from its plaza.
 *
 * Across a street (outwards from the retaining wall behind it): the buildings
 * with their backs to the wall, facing out (their fronts are +Z in the
 * models), so the camera, outside, sees their fronts; then the paved road with
 * a crenellated parapet along its edge. Between one turn and the next stands a
 * white retaining wall a storey high, its top a planted wall-walk; outside the
 * lowest turn the town wall drops to a ring of meadow and orchards, and past
 * the meadow's rim the island's underside, an upside-down cone of layered
 * blue-grey stone hung with moss, vines and roots, tapers down into the clouds.
 *
 * Turns never lie over one another, so the walking grid is a single layer
 * (tree/nav.js with layers = 1). The same contract as Mars's plan (surfaces,
 * locate, height, ground, floorAt, margin, focusFloor, facing, camLift,
 * followRound) — the spiral, its floors and ramps are measured the same way —
 * plus the island (`lipR`, `meadow`, `UNDER`), the far land below (`farGround`)
 * and the sky: a deep blue day with big cumulus clouds, stars and a moon by
 * night (castle/scene.js).
 */
import { PLINTH_R, PLINTH_H, fbm } from '../layout.js';

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;

export const CASTLE = {
  /** A storey: how much higher each floor is than the one before. */
  floorH: 6,
  /** The street's width (wall to parapet), and the retaining wall between one turn and the next (its top a planted wall-walk). */
  W: 14.5,
  gap: 2.5,
  /** The street's inner edge at the top floor's far end: inside it, the keep's courtyard. */
  topRi: 10.5,
  /** The keep's courtyard stands this much above the top floor. */
  keepUp: 1.0,
  /** A ramp's length along its inner (shortest) edge: a storey up over this is a gentle slope. */
  rampIn: 14,
  /** Across the street, metres out from the wall: where the paved road begins, and where each kind stands. */
  road: 9.9,
  placeLine: 5,
  /** How much of the street along the wall is kept clear of walkers (on a floor, on a ramp). */
  back: 3.2,
  backRamp: 3.2,
  across: { math: 5, history: 5, physics: 5, landmark: 4.9, shop: 6.1, arcade: 6.1, museum: 6.1, board: 7.3, worlds: 7.2, portal: 7.4, boss: 8.6, chest: 6.6 },
  /** Floor 1's plaza faces this way (degrees): the arrival view looks at the island from there. */
  spawnAngle: -20,
  /** The meadow ring outside the town wall: its level, and how far past the lowest street the rim runs. */
  meadowY: -2.2,
  lipOut: 11,
  /** The underside: from the rim down to its tip (metres below the meadow). */
  depth: 128
};
CASTLE.P = CASTLE.W + CASTLE.gap;

/**
 * A floor, from its start (the top of the ramp from below) to its end (the foot of the ramp up):
 * each kind and the width of street it takes (metres along the line the buildings stand on).
 * The World Portal is on floor 1 only. The plaza is in front of the middle school (history).
 */
export const ROW = [['chest', 4.2], ['board', 3.8], ['worlds', 4.0], ['landmark', 10.0], ['math', 10.2], ['history', 10.2], ['physics', 10.2], ['shop', 7.0], ['arcade', 7.0], ['museum', 7.0], ['portal', 3.8], ['boss', 4.2]];
const PAD0 = 1.4, PAD1 = 1.2;
const SCHOOLS = ['math', 'history', 'physics'];
const RADIUS = { shop: 2.8, arcade: 2.8, museum: 2.8, landmark: 4.2, board: 1.6 };

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The underside's profile, rim to tip: [fraction of the rim's radius, metres below the meadow].
 * A wide shallow saucer of layered ledges, then a long taper to a point (castle/scene.js shapes it).
 */
export const UNDER = [[1.0, 0], [0.995, 1.6], [0.965, 3.2], [0.95, 6.5], [0.9, 8.2], [0.875, 13], [0.8, 15], [0.765, 21], [0.68, 23], [0.63, 31], [0.53, 34], [0.47, 45], [0.38, 49], [0.31, 62], [0.22, 70], [0.15, 86], [0.09, 98], [0.04, 114], [0.0, 1]];

/** The land far below: its level, the river's course (from the island's foot outwards), ruins on the hills. */
export const BELOW = {
  y: -265,
  river: [[-900, 420], [-520, 260], [-240, 300], [40, 180], [260, 260], [520, 120], [900, 160], [1300, 40]],
  riverHalf: 16,
  /** Old stone ruins (x, z, size) and the distant mountains' ring (from, to radius). */
  ruins: [[-170, 360, 1.3], [280, 420, 1.0], [-420, 120, 0.9], [120, 640, 1.6], [-640, 520, 1.2], [520, -220, 1.0], [-260, -480, 1.1]],
  hills: [780, 1500]
};

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

/** The land far below the island: rolling green hills, the river's valley, mountains on the skyline. */
export function farGround(x, z) {
  const r = Math.hypot(x, z);
  let h = BELOW.y + fbm(x * 0.006, z * 0.006) * 34 + fbm(x * 0.02 + 5, z * 0.02) * 6;
  const d = distTo(BELOW.river, x, z);
  h -= 16 * (1 - smooth(BELOW.riverHalf, BELOW.riverHalf + 120, d));
  if (d < BELOW.riverHalf) h = Math.min(h, BELOW.y - 14);
  const [m0, m1] = BELOW.hills;
  const k = smooth(m0, m1, r);
  if (k > 0) h += k * (90 + 160 * Math.max(0, fbm(x * 0.003 + 3, z * 0.003 - 2) + 0.35));
  return h;
}

/**
 * The plan for the Sky Castle's `count` floors along the winding street.
 *
 * Positions on the street are (φ, across): φ is how far round the spiral (radians, 0 at floor 1's
 * start, growing up the hill), `across` is metres out from the street's inner edge (the wall).
 */
export function planCastle(count) {
  const { floorH: H, W, gap, P, topRi, placeLine: PL } = CASTLE;
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
    cur = k > 0 ? psiFor(0, sAt(0, psiS) + CASTLE.rampIn) : psiS;
  }
  const PHI = cur;
  const riOf = (phi) => topRi + (P * (PHI - phi)) / TAU;
  const spans = lay.map(({ psiS, psiE }) => ({ s: PHI - psiS, e: PHI - psiE }));
  /** Along a floor: φ at a distance d (metres on the building line) from its start. */
  const phiAlong = (k, d) => PHI - psiFor(PL, sAt(PL, PHI - spans[k].s) - d);
  const slotD = (k, kind) => {
    let d = PAD0;
    for (const [kk, w] of rowOf(k)) {
      if (kk === kind) return d + w / 2;
      d += w;
    }
    return null;
  };
  // Floor 1's plaza (in front of its history school) faces the spawn angle.
  const th0 = CASTLE.spawnAngle * D2R - phiAlong(0, slotD(0, 'history'));
  const thetaOf = (phi) => th0 + phi;
  const pt = (phi, o, y = 0) => {
    const r = riOf(phi) + o, t = thetaOf(phi);
    return { x: r * Math.sin(t), z: r * Math.cos(t), y };
  };
  const out = (phi) => [Math.sin(thetaOf(phi)), Math.cos(thetaOf(phi))];

  // The ramps between floors: a storey up, the whole width of the street.
  const ramps = [];
  for (let k = 0; k < count - 1; k++) ramps.push({ k, from: k + 1, to: k + 2, pa: spans[k].e, pb: spans[k + 1].s, ya: k * H, yb: (k + 1) * H });
  /** The street's height at φ: a floor's level, or part-way up a ramp. */
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
  /** The street's turns at an angle (the outermost first): φ, inner and outer edge, height. */
  function bandsAt(th) {
    const fu = (((th - th0) % TAU) + TAU) % TAU;
    const list = [];
    for (let phi = fu; phi <= PHI + 1e-9; phi += TAU) {
      const ri = riOf(phi);
      list.push({ phi, ri, ro: ri + W, y: bandY(phi) });
    }
    return list;
  }
  /** Where a point is on the street: { phi, ri, across } or null (off it). */
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
    const at = (kind, o = CASTLE.across[kind]) => {
      const phi = phiAlong(k, slotD(k, kind));
      return { phi, ...pt(phi, o, y) };
    };
    const place = (kind) => {
      const p = at(kind), r = SCHOOLS.includes(kind) ? PLINTH_R : RADIUS[kind];
      return { kind, x: p.x, z: p.z, r, yaw: thetaOf(p.phi), phi: p.phi, at: pt(p.phi, CASTLE.across[kind] + r + 1.2, y) };
    };
    const plinths = SCHOOLS.map((subject) => {
      const p = at(subject), door = pt(p.phi, CASTLE.across[subject] + PLINTH_R - 0.6);
      return { subject, x: p.x, z: p.z, r: PLINTH_R, y: y + PLINTH_H, door: { x: door.x, z: door.z }, yaw: thetaOf(p.phi) };
    });
    const places = [...SCHOOLS.map(place), place('shop'), place('arcade'), place('landmark'), place('museum'), place('board')];
    const spot = (kind, front) => {
      const p = at(kind);
      return { x: p.x, z: p.z, yaw: thetaOf(p.phi), at: pt(p.phi, CASTLE.across[kind] + front, y) };
    };
    const chestP = at('chest'), barrel = at('chest', 3.6);
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
    // Gems hide in nooks behind the buildings and out at the far corners; toys stand by the parapet.
    const gemSpots = [[D('landmark', -5.6), 2.2], [D('shop', -3.9), 2.6], [phiAlong(k, 0.9), W - 1.5], [D('museum', 4.0), 2.6], [phiAlong(k, len - 1.0), W - 1.5]].map(([phi, o]) => {
      const p = pt(phi, o);
      return [p.x, p.z];
    });
    const toySpots = [D('board'), D('landmark', -3), D('shop', 1), D('museum')].map((phi) => {
      const p = pt(phi, W - 1.4);
      return [p.x, p.z];
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
      // The chest hides behind a stack of barrels.
      chest: { x: chestP.x, z: chestP.z, yaw: thetaOf(chestP.phi), rock: { x: barrel.x, z: barrel.z }, at: pt(chestP.phi, CASTLE.across.chest + 1.6, y) },
      gemSpots,
      toySpots,
      tubes: [],
      blockers: [],
      spawn,
      /** Where you step onto this floor from the ramp below, and where the ramp up begins. */
      arrive: pt(phiAlong(k, 1.5), 12.0, y),
      leave: pt(phiAlong(k, len - 1.5), 12.0, y),
      label: { x: lab.x, y: y + 15, z: lab.z },
      view: { target: [plaza.x, y + 2, plaza.z], offset: [ox * 40 + side[0] * 9, 30, oz * 40 + side[1] * 9] }
    });
  }

  // The ramps as stairs (the same shape World.js and the tests use): foot and top on the middle line.
  const stairs = ramps.map((r) => {
    const a = pt(r.pa, W / 2, r.ya), b = pt(r.pb, W / 2, r.yb);
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const t = thetaOf(r.pa);
    // Up the ramp at its foot: along the spiral.
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
    // The strip along the wall behind the buildings is not for walking (no narrow back alleys to get stuck in).
    const ends = Math.min(W - b.across, b.phi * b.r, (PHI - b.phi) * b.r);
    if (seg.ramp) return [{ y: b.y, floor: 0, layer: 0, stair: seg.ramp.stair, edge: Math.min(ends, b.across - CASTLE.backRamp) }];
    return [{ y: b.y, floor: seg.floor, layer: 0, ring: floors[seg.floor - 1], edge: Math.min(ends, b.across - CASTLE.back) }];
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
  const keepY = topY + CASTLE.keepUp;
  const footR = riOf(0) + W;
  /** The island's rim (the meadow's edge) at an angle: a little wavy, never round like a coin. */
  const lipR = (a) => footR + CASTLE.lipOut + 2.4 * Math.sin(a * 3 + 1.1) + 1.4 * Math.sin(a * 7 + 0.4) + 0.8 * Math.sin(a * 13 + 2);
  /** The meadow ring outside the town wall: nearly level, curling down at the rim. */
  const meadow = (x, z) => {
    const r = Math.hypot(x, z), L = lipR(Math.atan2(x, z));
    return CASTLE.meadowY + fbm(x * 0.12, z * 0.12) * 0.35 - 1.4 * smooth(L - 3.5, L, r);
  };
  /** Wall-walks (the planted tops of the retaining walls) stand a little proud of the street above them. */
  const WALK_UP = 0.25;

  /**
   * The solid island at a spot (castle/scene.js, the camera): a street (its own height); the
   * retaining wall's top between one turn and the next (the higher street's level); the keep's
   * courtyard inside the top turn; the meadow outside the lowest turn; air past the rim.
   */
  function rock(x, z) {
    const r = Math.hypot(x, z), a = Math.atan2(x, z);
    if (r >= lipR(a)) return -1e3;
    const bands = bandsAt(a);
    const o = bands[0];
    if (r >= o.ro) return meadow(x, z);
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      if (r >= b.ri) return b.y;
      const inner = bands[i + 1];
      if (!inner) break;
      if (r > inner.ro) return inner.y + WALK_UP;
    }
    return keepY;
  }
  /**
   * The filler under it all (castle/scene.js draws it as one mesh behind the walls' own faces):
   * like `rock`, but every drop comes 0.7 m early, so its slanting facets hide behind the walls.
   */
  function shell(x, z) {
    const r = Math.hypot(x, z), a = Math.atan2(x, z), k = (r + 0.7) / (r || 1);
    const xx = x * k, zz = z * k;
    const y = rock(xx, zz);
    if (y < -900) return meadow(x, z);
    return onBand(xx, zz) ? y - 0.35 : y;
  }

  /**
   * How much the camera must rise so it is out of the island and no wall stands between it and what
   * it looks at (the buddy): 0 when the view is clear. A far view (arriving, the whole island) is
   * never lifted: it may look at the island from beside it, its underside in view.
   */
  function camLift(cx, cy, cz, tx, ty, tz) {
    if (Math.hypot(cx - tx, cy - ty, cz - tz) > 80) return 0;
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
  const reach = footR + 1;
  const fa = Math.atan2(foot.spawn.x, foot.spawn.z);
  // The sun: from the front left and high, as the arrival view looks at the island, so the town is lit.
  const sa = fa + 0.75;
  /** Two streams across the meadow that pour off the rim as waterfalls (one in the arrival view). */
  const streams = [{ a: fa + 0.42, h: 150 }, { a: fa - 2.3, h: 140 }];
  const sunDir = [Math.sin(sa) * 0.55, 0.72, Math.cos(sa) * 0.55];
  return {
    kind: 'castle',
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
    shell,
    meadow,
    lipR,
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
    topY,
    keepY,
    WALK_UP,
    streams,
    /** The island reaches this far out at most (its widest rim). */
    rimR: footR + CASTLE.lipOut + 4.7,
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
    /** "Out" at a point: away from the island's middle (the camera stands that way). */
    facing: (x, z) => Math.atan2(x, z),
    /** The follow camera turns with the buddy round the hill, so it stays outside and A / D walk round. */
    followRound: true,
    /** The follow camera straight out behind the buddy, so A / D run along the street. */
    homeOffset: [0, 8.2, 14.2],
    /** The whole island from above and outside. */
    overview: { target: [Math.sin(fa) * 30, 4, Math.cos(fa) * 30], offset: [Math.sin(fa) * 120, 130, Math.cos(fa) * 120] },
    /** Arriving: the whole floating island from beside it, like a picture — the castle on top, its underside tapering into the clouds. */
    arrival: { target: [Math.sin(fa) * 8, -40, Math.cos(fa) * 8], offset: [Math.sin(fa - 0.1) * 262, 22, Math.cos(fa - 0.1) * 262], hold: true },
    /** The camera may look a little flatter, so the sky and the clouds show. */
    maxPolar: 1.5,
    /** Its own big clouds (castle/scene.js): the shared little ones stay hidden. */
    ownClouds: true,
    sunDir,
    sky: {
      // A bright deep-blue day, pale at the horizon.
      day: { top: '#1450c4', mid: '#5aa6ee', bottom: '#a8d4f8', fog: '#a9d1f6', hemiSky: '#eef7ff', hemiGround: '#9cc79a', hemi: 1.12, sun: '#fff4e0', sunI: 2.0, amb: 0.14 },
      // Night: deep navy, the lanterns and windows warm.
      night: { top: '#081233', mid: '#1d2f6e', bottom: '#2c3f86', fog: '#1a2a62', hemiSky: '#6f84d8', hemiGround: '#1a2350', hemi: 0.9, sun: '#b3c4ff', sunI: 0.55, amb: 0.22 }
    },
    sun: sunDir.map((v) => v * 100),
    fog: { near: 170, nearK: 1.1, far: 1100, farK: 2.6 }
  };
}


