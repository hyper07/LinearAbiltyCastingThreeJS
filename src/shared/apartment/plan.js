/**
 * Apartment plans as plain JSON, and the pure maths on them (no three.js).
 *
 * A proof of the technique in knowledge/apartment-study.md (§3 data model, §5 plan → 3D,
 * §10 areas and facing). Units are metres; a plan point is [x, y] and lands in three.js at
 * (x, elevation, y), so plan "up" (−y) is −z. `plan.north` is the clockwise angle in degrees
 * from plan up to true north (0: up is north).
 *
 *   plan = {
 *     schema: 'gamory.apartment/1', lengthUnit: 'm', north: 0,
 *     levels:    [{ id, index, name, elevation, height, slab }],
 *     walls:     [{ id, level, a: [x, y], b: [x, y], thickness, kind, height?, openings: [{ id, type, at, width, sill, head }] }],
 *     rooms:     [{ id, level, unit?, kind, name: { en, ko }, polygon: [[x, y], …] }],
 *     units:     [{ id, level, number, type, name: { en, ko }, rooms: [ids], outline, sideT, facing, balcony }],
 *     cores:     [{ id, level, kind, polygon }],
 *     furniture: [{ id, level, unit?, kind, x, y, w, d, h, face?: [fx, fy], color, y0? }],
 *     footprint: [[x, y], …]
 *   }
 *
 * `at` is the distance of an opening's centre from the wall's `a` end. Wall kinds: exterior,
 * corridor, party, partition, core, railing. A railing keeps its own low `height` and is never cut.
 */

/** 1 평 = 400/121 m² (3.305785…), the Korean unit for floor area. */
export const SQM_PER_PYEONG = 400 / 121;
/** 1 m² = 10.7639… ft². */
export const SQFT_PER_SQM = 1 / 0.09290304;

/** Area in m² written in the unit the viewer picked: 'm2', 'pyeong' or 'ft2'. */
export function formatArea(m2, unit = 'm2') {
  if (unit === 'pyeong') return `${(m2 / SQM_PER_PYEONG).toFixed(1)}평`;
  if (unit === 'ft2') return `${Math.round(m2 * SQFT_PER_SQM).toLocaleString('en-US')} ft²`;
  return `${m2.toFixed(2)} m²`;
}

/** Signed shoelace area (positive when the points run counter-clockwise in x-right, y-up maths axes). */
export function signedArea(pts) {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  return s / 2;
}

export const polygonArea = (pts) => Math.abs(signedArea(pts));

export function perimeter(pts) {
  let p = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) p += Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
  return p;
}

/** Area centroid of a simple polygon. */
export function centroid(pts) {
  const a = signedArea(pts);
  if (Math.abs(a) < 1e-9) return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    cx += (pts[j][0] + pts[i][0]) * f;
    cy += (pts[j][1] + pts[i][1]) * f;
  }
  return [cx / (6 * a), cy / (6 * a)];
}

export function bbox(pts) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, d: y1 - y0 };
}

export const rectPoly = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/**
 * Area inside the walls of an outline drawn on wall centre lines, for an orthogonal polygon whose
 * boundary walls are all `t` thick: A − P·t/2 + t² (each convex corner adds (t/2)², each reflex one
 * takes it away, and an orthogonal outline has four more convex than reflex corners).
 */
export const innerAreaOrthogonal = (pts, t) => polygonArea(pts) - (perimeter(pts) * t) / 2 + t * t;

/**
 * A unit's areas, Korean style (knowledge/apartment-study.md §4.2):
 *  - exclusive (전용): inside the inner faces of the unit's outer and party walls (안목치수); a
 *    rectangle with per-side thicknesses is exact, other outlines use the mean thickness;
 *  - service (서비스): balconies, not counted;
 *  - residentialCommon (주거공용): this unit's share of the level's corridor, stairs and lifts, in
 *    proportion to exclusive area;
 *  - supply (공급) = exclusive + residentialCommon.
 */
export function unitAreas(plan, unitId) {
  const unit = plan.units.find((u) => u.id === unitId);
  if (!unit) return null;
  const exclusive = exclusiveArea(unit);
  const service = plan.rooms.filter((r) => r.unit === unitId && r.kind === 'balcony').reduce((s, r) => s + polygonArea(r.polygon), 0);
  const level = plan.units.filter((u) => u.level === unit.level);
  const levelExclusive = level.reduce((s, u) => s + exclusiveArea(u), 0);
  const common =
    plan.rooms.filter((r) => r.level === unit.level && !r.unit && (r.kind === 'corridor' || r.kind === 'stair' || r.kind === 'elevator' || r.kind === 'lobby')).reduce((s, r) => s + polygonArea(r.polygon), 0);
  const residentialCommon = levelExclusive ? (common * exclusive) / levelExclusive : 0;
  return { exclusive, service, residentialCommon, supply: exclusive + residentialCommon };
}

function exclusiveArea(unit) {
  if (unit.sideT && unit.outline.length === 4) {
    const b = bbox(unit.outline);
    const { left, right, front, back } = unit.sideT;
    return (b.w - left / 2 - right / 2) * (b.d - front / 2 - back / 2);
  }
  const t = unit.sideT ? (unit.sideT.left + unit.sideT.right + unit.sideT.front + unit.sideT.back) / 4 : 0.2;
  return innerAreaOrthogonal(unit.outline, t);
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const COMPASS_EN = { N: 'North', NE: 'North-east', E: 'East', SE: 'South-east', S: 'South', SW: 'South-west', W: 'West', NW: 'North-west' };
const COMPASS_KO = { N: '북향', NE: '북동향', E: '동향', SE: '남동향', S: '남향', SW: '남서향', W: '서향', NW: '북서향' };

/** Compass point of an outward normal [nx, ny] in plan axes, given plan.north. */
export function compassOf([nx, ny], north = 0) {
  const bearing = ((Math.atan2(nx, -ny) * 180) / Math.PI - north + 720) % 360;
  return COMPASS[Math.round(bearing / 45) % 8];
}

export const facingName = (c, lang = 'en') => (lang === 'ko' ? COMPASS_KO[c] : COMPASS_EN[c]) ?? c;

/**
 * Where a unit faces: the outward normal of the exterior wall carrying the widest glazing of its
 * living room (or of any room), as a compass point. Korean listings say 남향 (south-facing) for this.
 */
export function unitFacing(plan, unit) {
  const rooms = plan.rooms.filter((r) => r.unit === unit.id);
  const c = centroid(unit.outline);
  let best = null;
  for (const w of plan.walls) {
    if (w.level !== unit.level || w.kind !== 'exterior') continue;
    for (const o of w.openings) {
      if (o.type !== 'window' && o.type !== 'balcony-door') continue;
      const p = pointAlong(w, o.at);
      const room = rooms.find((r) => pointInPolygon(nudgeInside(w, p, c), r.polygon));
      if (!room) continue;
      const score = o.width * (room.kind === 'living' ? 3 : 1);
      if (!best || score > best.score) best = { score, normal: outwardNormal(w, c) };
    }
  }
  return best ? compassOf(best.normal, plan.north ?? 0) : null;
}

export function pointAlong(wall, at) {
  const len = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
  const t = len ? at / len : 0;
  return [wall.a[0] + (wall.b[0] - wall.a[0]) * t, wall.a[1] + (wall.b[1] - wall.a[1]) * t];
}

/** The wall's unit normal pointing away from `inside`. */
export function outwardNormal(wall, inside) {
  const dx = wall.b[0] - wall.a[0];
  const dy = wall.b[1] - wall.a[1];
  const len = Math.hypot(dx, dy) || 1;
  let n = [dy / len, -dx / len];
  const mid = [(wall.a[0] + wall.b[0]) / 2, (wall.a[1] + wall.b[1]) / 2];
  if ((inside[0] - mid[0]) * n[0] + (inside[1] - mid[1]) * n[1] > 0) n = [-n[0], -n[1]];
  return n;
}

function nudgeInside(wall, p, inside) {
  const n = outwardNormal(wall, inside);
  return [p[0] - n[0] * 0.3, p[1] - n[1] * 0.3];
}

export function pointInPolygon([x, y], pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * A straight wall with openings as boxes, the cheap way (no CSG): a full piece up to each
 * opening, a sill piece under it, a lintel piece over it, then on. Every piece is
 * { x, y, z, len, h, thick, rot } — centre in plan x/y, bottom z above the floor, rotation about
 * the vertical. Ends are stretched by half the thickness so corners close.
 * `height` is the full wall height; `cut` clamps every piece (the dollhouse section cut).
 */
export function wallPieces(wall, height, cut = Infinity) {
  const dx = wall.b[0] - wall.a[0];
  const dy = wall.b[1] - wall.a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return [];
  const ux = dx / len;
  const uy = dy / len;
  const ext = wall.thickness / 2;
  const top = Math.min(wall.height ?? height, cut);
  const rot = Math.atan2(dy, dx);
  const pieces = [];
  const push = (s0, s1, z0, z1) => {
    z1 = Math.min(z1, top);
    if (s1 - s0 < 1e-4 || z1 - z0 < 0.005) return;
    const s = (s0 + s1) / 2;
    pieces.push({ x: wall.a[0] + ux * s, y: wall.a[1] + uy * s, z: z0, len: s1 - s0, h: z1 - z0, thick: wall.thickness, rot });
  };
  const holes = (wall.openings ?? [])
    .map((o) => ({ s0: Math.max(0, o.at - o.width / 2), s1: Math.min(len, o.at + o.width / 2), sill: o.sill ?? 0, head: o.head ?? 2.1 }))
    .sort((p, q) => p.s0 - q.s0);
  let s = -ext;
  for (const h of holes) {
    push(s, h.s0, 0, height);
    if (h.sill > 0) push(h.s0, h.s1, 0, h.sill);
    if (h.head < height) push(h.s0, h.s1, h.head, height);
    s = Math.max(s, h.s1);
  }
  push(s, len + ext, 0, height);
  return pieces;
}

/* ------------------------------------------------------------------------ */
/* A generated test building: a double-loaded corridor, like a city block of  */
/* studios and small flats (오피스텔 / 도시형생활주택), 5 levels by default.  */
/* ------------------------------------------------------------------------ */

const T_EXT = 0.25;
const T_CORR = 0.2;
const T_PARTY = 0.2;
const T_PART = 0.1;

/** Unit types: width along the façade (centre lines), names, and whether the living room gets a balcony. */
export const UNIT_TYPES = {
  studio: { w: [4.4, 5.0], en: 'Studio', ko: '원룸' },
  studioBalcony: { w: [4.6, 5.2], en: 'Studio + balcony', ko: '원룸 + 발코니', balcony: true },
  oneBed: { w: [6.2, 6.8], en: 'One-bed + balcony', ko: '투룸 + 발코니', balcony: true },
  twoBed: { w: [9.2, 9.8], en: 'Two-bed corner', ko: '쓰리룸', balcony: true }
};

/** Small seeded random numbers (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A whole building: `levels` storeys of the same corridor floor (units renumbered per level),
 * 3.0 m floor to floor, walls 2.8 m. The south row has balconies; the north row has the core.
 */
export function corridorBuilding({ levels = 5, seed = 7, length = 46 } = {}) {
  const rand = rng(seed);
  const north = rowLayout(rand, length, true);
  const south = rowLayout(rand, length, false);
  const L = Math.max(north.at(-1).x1, south.at(-1).x1);
  const dN = 8.4;
  const cw = 1.8;
  const dS = 8.4;
  const D = dN + cw + dS;
  const plan = {
    schema: 'gamory.apartment/1',
    lengthUnit: 'm',
    north: 0,
    levels: [],
    walls: [],
    rooms: [],
    units: [],
    cores: [],
    furniture: [],
    footprint: rectPoly(0, 0, L, D),
    source: { kind: 'generated', note: 'Procedural test building (src/shared/apartment/plan.js), not a real layout.' }
  };
  for (let i = 0; i < levels; i++) {
    const level = { id: `L${i + 1}`, index: i, name: `${i + 1}F`, elevation: i * 3.0, height: 2.8, slab: 0.2 };
    plan.levels.push(level);
    buildLevel(plan, level, { north, south, L, dN, cw, dS, D, rand: rng(seed * 31 + i) });
  }
  for (const u of plan.units) u.facing = unitFacing(plan, u);
  return plan;
}

/** Split a row into units (and, on the north row, a 6 m core in the middle). */
function rowLayout(rand, length, withCore) {
  const order = withCore ? ['studio', 'oneBed', 'studio', 'oneBed', 'core', 'oneBed', 'studio', 'oneBed'] : ['twoBed', 'oneBed', 'studioBalcony', 'studioBalcony', 'oneBed', 'studioBalcony', 'twoBed'];
  const widths = order.map((t) => (t === 'core' ? 6.0 : UNIT_TYPES[t].w[0] + rand() * (UNIT_TYPES[t].w[1] - UNIT_TYPES[t].w[0])));
  const scale = length / widths.reduce((s, w) => s + w, 0);
  let x = 0;
  return order.map((type, i) => {
    const w = Math.round(widths[i] * scale * 10) / 10;
    const cell = { type, x0: x, x1: i === order.length - 1 ? length : x + w };
    x = cell.x1;
    return cell;
  });
}

function buildLevel(plan, level, g) {
  const { L, dN, cw, D, rand } = g;
  const lv = level.id;
  const n = level.index + 1;
  const yC0 = dN;
  const yC1 = dN + cw;
  const id = (p) => `${lv}-${p}`;
  const wall = (key, a, b, thickness, kind, extra = {}) => {
    const w = { id: id(key), level: lv, a, b, thickness, kind, openings: [], ...extra };
    plan.walls.push(w);
    return w;
  };
  const open = (w, type, x, width, sill, head) => {
    const at = Math.hypot(x[0] - w.a[0], x[1] - w.a[1]);
    w.openings.push({ id: `${w.id}-o${w.openings.length}`, type, at, width, sill, head });
  };
  const room = (key, unit, kind, en, ko, polygon) => plan.rooms.push({ id: id(key), level: lv, unit, kind, name: { en, ko }, polygon });

  // The shell: two façades, two ends, two corridor walls.
  const fN = wall('ext-n', [0, 0], [L, 0], T_EXT, 'exterior');
  const fS = wall('ext-s', [0, D], [L, D], T_EXT, 'exterior');
  const eW = wall('ext-w', [0, 0], [0, D], T_EXT, 'exterior');
  const eE = wall('ext-e', [L, 0], [L, D], T_EXT, 'exterior');
  open(eW, 'window', [0, (yC0 + yC1) / 2], 1.2, 0.9, 2.2);
  open(eE, 'window', [L, (yC0 + yC1) / 2], 1.2, 0.9, 2.2);
  const cN = wall('corr-n', [0, yC0], [L, yC0], T_CORR, 'corridor');
  const cS = wall('corr-s', [0, yC1], [L, yC1], T_CORR, 'corridor');
  room('corridor', null, 'corridor', 'Corridor', '복도', rectPoly(0, yC0, L, yC1));

  let numN = 1;
  let numS = 2;
  for (const [row, cells] of [['n', g.north], ['s', g.south]]) {
    const facade = row === 'n' ? fN : fS;
    const corr = row === 'n' ? cN : cS;
    cells.forEach((cell, i) => {
      if (i > 0) wall(`party-${row}${i}`, [cell.x0, row === 'n' ? 0 : yC1], [cell.x0, row === 'n' ? yC0 : D], T_PARTY, 'party');
      if (cell.type === 'core') {
        coreCell(plan, level, cell, { y0: 0, y1: yC0, corr, open, wall, room, id });
        return;
      }
      const number = String(n * 100 + (row === 'n' ? numN : numS)).padStart(3, '0');
      if (row === 'n') numN += 2;
      else numS += 2;
      const mirror = i % 2 === 1;
      unitCell(plan, level, cell, { row, number, mirror, facade, corr, yC0, yC1, D, open, wall, room, rand, first: i === 0, last: i === cells.length - 1 });
    });
  }
}

/** One flat between two party walls. Local axes: u along the façade, v from the corridor wall (0) to the façade (depth). */
function unitCell(plan, level, cell, o) {
  const { row, number, mirror, facade, corr, yC0, yC1, D, open, wall, room, rand } = o;
  const type = UNIT_TYPES[cell.type];
  const W = cell.x1 - cell.x0;
  const depth = row === 'n' ? yC0 : D - yC1;
  const unitId = `${level.id}-u${number}`;
  // Local (u, v) → plan (x, y).
  const P = (u, v) => {
    const uu = mirror ? W - u : u;
    return [cell.x0 + uu, row === 'n' ? yC0 - v : yC1 + v];
  };
  const R = (u0, v0, u1, v1) => {
    const a = P(u0, v0);
    const b = P(u1, v1);
    return rectPoly(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1]));
  };
  const rooms = [];
  const addRoom = (key, kind, en, ko, poly) => {
    room(`${number}-${key}`, unitId, kind, en, ko, poly);
    rooms.push(`${level.id}-${number}-${key}`);
  };
  const strip = 2.4; // bath / entry / kitchen strip on the corridor side
  const bathW = 2.2;
  const items = [];
  // A piece of furniture in local axes: centre (u, v), size su × sv, height h; `face` is the way its
  // front looks (local [fu, fv]); the builder puts a sofa's back or a bed's head on the other side.
  const item = (kind, u, v, su, sv, h, color, face = null, y0 = 0) => items.push({ kind, u, v, su, sv, h, color, face, y0 });

  addRoom('bath', 'bath', 'Bathroom', '욕실', R(0, 0, bathW, strip));
  const bathSide = wall(`${number}-bath-side`, P(bathW, 0), P(bathW, strip), T_PART, 'partition');
  wall(`${number}-bath-top`, P(0, strip), P(bathW, strip), T_PART, 'partition');
  open(bathSide, 'door', P(bathW, 1.5), 0.75, 0, 2.1);
  addRoom('entry', 'kitchen', 'Entry and kitchen', '현관·주방', R(bathW, 0, W, strip));
  open(corr, 'entry-door', P(bathW + 0.55, 0), 0.95, 0, 2.1);
  item('toilet', 0.45, 0.45, 0.4, 0.65, 0.42, '#f4f4f2');
  item('basin', 1.5, 0.3, 0.6, 0.45, 0.85, '#f4f4f2');
  item('shower', 0.6, 1.85, 1.0, 0.9, 0.06, '#dfe5e8');
  // Kitchen: a run along the corridor wall past the door when there is room, else along the party wall.
  const runStart = bathW + 1.25;
  if (W - runStart >= 2.3) {
    const runEnd = Math.min(W - 0.95, runStart + 2.6);
    item('counter', (runStart + runEnd) / 2, 0.42, runEnd - runStart, 0.6, 0.9, '#ebe7e0', [0, 1]);
    item('fridge', W - 0.5, 0.45, 0.7, 0.7, 1.85, '#d4d7db', [0, 1]);
  } else {
    item('counter', W - 0.42, 1.0, 0.6, 1.7, 0.9, '#ebe7e0', [-1, 0]);
    item('fridge', W - 0.45, 2.05, 0.7, 0.6, 1.85, '#d4d7db', [-1, 0]);
  }

  // The rooms on the façade.
  const balcony = !!type.balcony && row === 's';
  const livingU0 = 0;
  let livingU1 = W;
  const beds = cell.type === 'oneBed' ? 1 : cell.type === 'twoBed' ? 2 : 0;
  const bedW = 3.0;
  if (beds) {
    livingU1 = W - beds * bedW;
    wall(`${number}-living-side`, P(livingU1, strip), P(livingU1, depth), T_PART, 'partition');
    const stripWall = wall(`${number}-bed-strip`, P(livingU1, strip), P(W, strip), T_PART, 'partition');
    for (let b = 0; b < beds; b++) {
      const u0 = livingU1 + b * bedW;
      const u1 = u0 + bedW;
      const main = b === beds - 1;
      if (b > 0) wall(`${number}-bed-side${b}`, P(u0, strip), P(u0, depth), T_PART, 'partition');
      addRoom(`bed${b + 1}`, 'bedroom', main ? 'Main bedroom' : 'Bedroom', main ? '안방' : '침실', R(u0, strip, u1, depth));
      open(stripWall, 'door', P(u0 + 0.6, strip), 0.85, 0, 2.1);
      open(facade, 'window', P((u0 + u1) / 2, depth), 1.6, 0.9, 2.2);
      // Head against the far side wall, a nightstand by the window, the wardrobe on the strip wall.
      const len = 2.05;
      const wide = main ? 1.6 : 1.2;
      const bv = depth - 0.8 - wide / 2;
      item('bed', u1 - 0.1 - len / 2, bv, len, wide, 0.5, '#efebe4', [-1, 0]);
      item('throw', u1 - 0.1 - len * 0.78, bv, len * 0.34, wide + 0.04, 0.53, '#c9a974');
      item('nightstand', u1 - 0.3, depth - 0.38, 0.4, 0.4, 0.5, '#7a5a3f');
      item('lamp', u1 - 0.3, depth - 0.38, 0.22, 0.22, 0.3, '#ffe2b0', null, 0.5);
      item('wardrobe', u0 + 1.0 + (bedW - 1.3) / 2, strip + 0.36, bedW - 1.3, 0.6, 2.0, '#d8d2c8', [0, 1]);
    }
  }
  addRoom('living', 'living', beds ? 'Living room' : 'Room', beds ? '거실' : '방', R(livingU0, strip, livingU1, depth));
  const lw = livingU1 - livingU0;
  if (balcony) {
    open(facade, 'balcony-door', P(livingU0 + lw / 2, depth), Math.min(2.4, lw - 0.6), 0, 2.2);
    const bd = 1.5;
    addRoom('balcony', 'balcony', 'Balcony', '발코니', R(livingU0 + 0.1, depth, livingU1 - 0.1, depth + bd));
    wall(`${number}-rail`, P(livingU0 + 0.1, depth + bd), P(livingU1 - 0.1, depth + bd), 0.08, 'railing', { height: 1.1 });
    wall(`${number}-rail-a`, P(livingU0 + 0.1, depth), P(livingU0 + 0.1, depth + bd), 0.08, 'railing', { height: 1.1 });
    wall(`${number}-rail-b`, P(livingU1 - 0.1, depth), P(livingU1 - 0.1, depth + bd), 0.08, 'railing', { height: 1.1 });
    item('chair', livingU0 + lw * 0.3, depth + 0.75, 0.55, 0.55, 0.8, '#3d3a36', [0, -1]);
    item('sidetable', livingU0 + lw * 0.5, depth + 0.75, 0.42, 0.42, 0.5, '#7a5a3f');
    item('plant', livingU1 - 0.5, depth + 1.05, 0.45, 0.45, 0.9, '#4f7a4a');
  } else {
    open(facade, 'window', P(livingU0 + lw / 2, depth), Math.min(2.2, lw - 0.8), 0.6, 2.2);
  }
  const vMid = strip + (depth - strip) * 0.6;
  if (beds) {
    // Sofa on one side wall facing the TV unit on the other, rug, coffee table, floor lamp, dining table by the kitchen.
    item('rug', livingU0 + lw / 2, vMid, Math.min(2.4, lw - 1.2), 1.8, 0.012, '#d9cbb5');
    item('sofa', livingU0 + 0.55, vMid, 0.9, 2.1, 0.8, rand() < 0.5 ? '#8fa08a' : '#bdb6aa', [1, 0]);
    item('coffee', livingU0 + 0.55 + lw * 0.33, vMid, 0.55, 1.0, 0.4, '#7a5a3f');
    item('tv', livingU1 - 0.3, vMid, 0.4, 1.6, 0.5, '#3b3d42', [-1, 0]);
    item('lamp', livingU0 + 0.35, depth - 0.45, 0.3, 0.3, 1.5, '#ffe2b0');
    item('table', livingU0 + lw / 2, strip + 0.95, 1.2, 0.8, 0.74, '#8a6a4c');
  } else {
    // Studio: the bed in the far corner, a small sofa, a two-seat table.
    item('bed', W - 0.1 - 1.025, depth - 0.95, 2.05, 1.4, 0.5, '#efebe4', [-1, 0]);
    item('throw', W - 0.1 - 1.6, depth - 0.95, 0.7, 1.44, 0.53, '#c9a974');
    item('sofa', 0.5, strip + 1.7, 0.85, 1.6, 0.8, '#bdb6aa', [1, 0]);
    item('table', W / 2 - 0.3, strip + 0.8, 0.7, 0.7, 0.74, '#8a6a4c');
    item('lamp', 0.35, depth - 0.45, 0.3, 0.3, 1.5, '#ffe2b0');
    item('rug', W / 2 - 0.4, strip + 2.0, 1.4, 1.8, 0.012, '#d9cbb5');
  }

  // Wall thicknesses round the unit, for the exclusive area; end units have a façade wall at the side.
  const outline = R(0, 0, W, depth);
  const sideT = { left: o.first ? T_EXT : T_PARTY, right: o.last ? T_EXT : T_PARTY, front: T_EXT, back: T_CORR };
  const name = { en: balcony || !type.balcony ? type.en : type.en.replace(' + balcony', ''), ko: balcony || !type.balcony ? type.ko : type.ko.replace(' + 발코니', '') };
  plan.units.push({ id: unitId, level: level.id, number, type: cell.type, name, rooms, outline, sideT, balcony, facing: null });
  // Local boxes to plan boxes: u runs along ±x and v along ±y, so sizes keep their axes; only facings flip.
  const fx = mirror ? -1 : 1;
  const fy = row === 'n' ? -1 : 1;
  items.forEach((it, k) => {
    const [x, y] = P(it.u, it.v);
    plan.furniture.push({
      id: `${unitId}-f${k}`, level: level.id, unit: unitId, kind: it.kind, x, y, w: it.su, d: it.sv, h: it.h,
      face: it.face ? [it.face[0] * fx, it.face[1] * fy] : null, color: it.color, y0: it.y0
    });
  });
}

/** The core: a stair and two lifts, opening onto the corridor. */
function coreCell(plan, level, cell, o) {
  const { y0, y1, corr, open, wall, room, id } = o;
  const xm = cell.x0 + 3.2;
  wall('core-mid', [xm, y0], [xm, y1], T_PARTY, 'core');
  room('stair', null, 'stair', 'Stairs', '계단실', rectPoly(cell.x0, y0, xm, y1));
  room('lift', null, 'elevator', 'Lifts', '엘리베이터', rectPoly(xm, y0, cell.x1, y0 + 2.8));
  room('lobby', null, 'lobby', 'Lift lobby', '엘리베이터 홀', rectPoly(xm, y0 + 2.8, cell.x1, y1));
  wall('lift-back', [xm, y0 + 2.8], [cell.x1, y0 + 2.8], T_PARTY, 'core');
  open(corr, 'door', [cell.x0 + 1.6, y1], 1.2, 0, 2.1);
  open(corr, 'opening', [(xm + cell.x1) / 2, y1], 2.2, 0, 2.4);
  plan.cores.push({ id: id('core'), level: level.id, kind: 'stair', polygon: rectPoly(cell.x0, y0, xm, y1) });
  plan.cores.push({ id: id('lifts'), level: level.id, kind: 'elevator', polygon: rectPoly(xm, y0, cell.x1, y0 + 2.8) });
  // Two flights of steps (boxes) and two lift doors, as furniture so the builder draws them.
  for (let s = 0; s < 9; s++) {
    plan.furniture.push({ id: id(`step-a${s}`), level: level.id, kind: 'step', x: cell.x0 + 0.75, y: y1 - 1.2 - s * 0.28, w: 1.2, d: 0.28, h: 0.17 * (s + 1), color: '#bfbcb6', y0: 0 });
    plan.furniture.push({ id: id(`step-b${s}`), level: level.id, kind: 'step', x: cell.x0 + 2.35, y: y0 + 1.6 + s * 0.28, w: 1.2, d: 0.28, h: Math.max(0.05, 1.53 - 0.17 * s), color: '#bfbcb6', y0: 0 });
  }
  for (const dx of [0.8, 2.0]) plan.furniture.push({ id: id(`liftdoor${dx}`), level: level.id, kind: 'liftdoor', x: xm + dx, y: y0 + 2.88, w: 1.0, d: 0.06, h: 2.1, color: '#9ea3aa', y0: 0 });
}
