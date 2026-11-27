import * as THREE from 'three';
import { fleetKindFor, LOD, loadFleet, makeFleetMoped, makeFleetVehicle, pickFleetKind } from './fleet.js';
import { follow } from './drive.js';
import { isSmall, LEVELS } from './course.js';
import { cornerZones } from './golmok.js';
import { takeRider } from './folk.js';
import { narrowPoint, narrowRoad } from './alleys.js';
import { Junctions, pathsMeet, sOf } from './junctions.js';

/**
 * The traffic a bike race rides through: cars, city buses and delivery
 * scooters on Seoul's real roads round the racers, each on its own side,
 * turning at the junctions onto whatever road meets theirs (so they cross
 * the course), slowing for whatever is ahead in their lane and giving way to
 * one another across a junction, blinking before they turn or change lane,
 * honking when held up. Scooters also take the residential lanes wide enough.
 *
 * Never in a narrow street (alleys.js isNarrow: every golmok and alley, a
 * residential lane under 7 m, a two-way road under 6 m): those are for people
 * only. Nothing drives into one, is put down in one, parks or stands in one —
 * where the course runs down one, it has no traffic.
 *
 * They don't get out of the riders' way: coming the other way or across, a
 * vehicle holds its lane and its speed — no swerving, no braking, no waiting
 * at a junction for the race — and the rider has to dodge it. The only rider
 * a driver brakes for is one going its way in front of it in its lane (it
 * follows, as it follows a car) or one standing still there (held by the
 * police, stuck in a jam).
 *
 * Nothing appears or goes in view (SIGHT): a vehicle is put down only where
 * the camera can't see it — round a corner, behind a building or a wall,
 * behind the camera, in the fog — and drives into view along its lane; it is
 * taken off only where it can't be seen either (one that should go but is
 * still in view drives on until it isn't). When no hidden place can be found
 * the street waits for one rather than make a car pop up. No fading: a
 * vehicle is always solid.
 *
 * Every vehicle is a real model (fleet.js: Sketchfab, CC BY 4.0; polyfork's
 * delivery moped), loaded before the race starts; far off, a reduced copy of
 * the same model. Nothing is put down until its model is there.
 *
 * Each vehicle has a box ({ x, z, heading, halfLength, halfWidth }) for the
 * race to test bikes against (ride.js bikeGap), and a speed v.
 *
 * The course's own roads are kept busy the other way: cars, taxis, buses and
 * delivery scooters coming at you down the far side of a two-way road (or
 * down the other carriageway of a divided one) — how many by the course's
 * level (course.js LEVELS: Easy busier, Medium busy, Hard packed), always in
 * their own lane — and going your way too: slower cars, taxis, trucks, buses
 * and delivery scooters sent up the course ahead of you, in the riders' own
 * lanes, to weave past (never put down within 40 m of a rider, never two
 * side by side as a wall). On a road with two lanes or more their way, cars
 * now and then change lane (blinking first, never with a rider close), and
 * pull out round a car parked at the kerb rather than stand behind it. Cars
 * stand parked at the kerb (never just before a corner), and buses stand at
 * their stops on the wider roads. At night every headlight and tail light
 * glows, near and far (one draw for all of them).
 */

const SPEEDS = [0, 14.5, 12.5, 10.5, 8.5, 5.5]; // metres a second by road class (no motorways)
const WANT = { car: 24, bus: 3, scooter: 9 };
/** No more than this many vehicles at once (those still in view on their way out count too): the street round you is busy enough. */
const CAP = 115;
/**
 * Standing this many seconds with nothing moving it on (not a parked one, not one waiting at a junction's
 * line or in the queue behind one): taken off once out of sight.
 */
export const STUCK = 8;
/** Waiting at a junction (or in the queue for one) longer than this counts as stuck too. */
export const WAIT_MAX = 40;
/**
 * Following (the Intelligent Driver Model): `gap` m kept bumper to bumper standing, `time` s of headway on
 * the move, `brake` m/s² a comfortable stop, `hard` m/s² the hardest. Pulling away is each kind's PULL.
 */
export const FOLLOW = { gap: 2, time: 1.2, brake: 3, hard: 9 };
/** Across the lane (a lane change, out round a parked car): at most `ratio` m across per metre along, `max` m/s — its nose never far off the lane's way. */
export const SIDE = { ratio: 0.25, max: 1.4, park: 0.8 };
/** How much room (m) a vehicle keeps round itself from another, box to box, as the last guard (`_bumps`). */
const BUMP_ROOM = 0.2;
/** How far (m) further back than behind a moving one a vehicle stops behind a parked one: room to pull out round it, its nose straight. */
const PARK_ROOM = 6;
const SIZE = { scooter: [0.9, 0.36] };
/** How hard each pulls away (m/s²): a bus and a loaded truck slowly, a scooter quickest. Braking is the same for all. */
const PULL = { bus: 1.3, townbus: 1.5, truck: 1.7, scooter: 3, car: 2.4 };
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
/** How far (radians) a vehicle's nose may point off its lane's way along a road (off a turn's arc). */
export const MAX_STEER = 0.45;

/**
 * What the camera can see, for putting vehicles down and taking them off: `step` m between the samples of
 * a sight line tested against the buildings (on a `cell` m grid, kept); `px` screen pixels — a vehicle
 * smaller than that on screen (far down a long straight, in the haze) is past seeing; `gone` m from every
 * rider is when a vehicle should go (once out of sight), `far` m for one sent up the course (coming at you
 * or going your way: it may start far down a straight, where it is too small to see, and drive into view);
 * a bus is a green town bus `town` of the time.
 */
export const SIGHT = { step: 2, cell: 1, px: 2.5, gone: 300, far: 700, town: 0.35 };

/**
 * Do two vehicles' boxes ({ x, z, heading, halfLength, halfWidth }) overlap on the ground (each shrunk by
 * `slack` m all round)? Separating axes: the two boxes' own.
 */
export function overlaps(a, b, slack = 0) {
  if (Math.hypot(a.x - b.x, a.z - b.z) > a.halfLength + a.halfWidth + b.halfLength + b.halfWidth) return false;
  const reach = (o, ux, uz) => Math.abs(-Math.sin(o.heading) * ux - Math.cos(o.heading) * uz) * (o.halfLength - slack) + Math.abs(Math.cos(o.heading) * ux - Math.sin(o.heading) * uz) * (o.halfWidth - slack);
  for (const h of [a.heading, a.heading + Math.PI / 2, b.heading, b.heading + Math.PI / 2]) {
    const ux = -Math.sin(h);
    const uz = -Math.cos(h);
    if (Math.abs((b.x - a.x) * ux + (b.z - a.z) * uz) > reach(a, ux, uz) + reach(b, ux, uz)) return false;
  }
  return true;
}

/**
 * How far (m) two vehicles' boxes run into each other: the least overlap along the separating axes — under
 * 0 when apart (by about that much, near enough), over 0 when one is in the other.
 */
export function overlapDepth(a, b) {
  const reach = (o, ux, uz) => Math.abs(-Math.sin(o.heading) * ux - Math.cos(o.heading) * uz) * o.halfLength + Math.abs(Math.cos(o.heading) * ux - Math.sin(o.heading) * uz) * o.halfWidth;
  let depth = Infinity;
  for (const h of [a.heading, a.heading + Math.PI / 2, b.heading, b.heading + Math.PI / 2]) {
    const ux = -Math.sin(h);
    const uz = -Math.cos(h);
    depth = Math.min(depth, reach(a, ux, uz) + reach(b, ux, uz) - Math.abs((b.x - a.x) * ux + (b.z - a.z) * uz));
  }
  return depth;
}

/**
 * How big a vehicle `hl` m half-long, heading `heading`, standing at (x, y, z) looks on a screen `height`
 * pixels tall from `cam`: the largest of its length, width and height as seen from there (end-on its
 * length counts for nothing, from above its height), in pixels.
 */
export function onScreen(cam, height, x, z, hl, heading, y = 0) {
  const big = hl > 3.5;
  const L = hl * 2;
  const W = big ? 2.5 : hl > 1.2 ? 1.8 : 0.8;
  const H = big ? 3.2 : hl > 1.2 ? 1.6 : 1.8;
  const dx = x - cam.position.x;
  const dy = y + H / 2 - cam.position.y;
  const dz = z - cam.position.z;
  const d = Math.max(1, Math.hypot(dx, dy, dz));
  const fx = -Math.sin(heading);
  const fz = -Math.cos(heading);
  const along = (dx * fx + dz * fz) / d;
  const across = (dx * -fz + dz * fx) / d;
  const up = dy / d;
  const seen = (a) => Math.sqrt(Math.max(0, 1 - a * a));
  const k = height / (d * 2 * Math.tan(((cam.fov ?? 58) * Math.PI) / 360));
  return Math.max(L * seen(along), W * seen(across), H * seen(up)) * k;
}

/**
 * Vehicles sat on the road under each tyre: every frame within `near` m of the camera, past that every `every`
 * frames (under all four still: on a hill's cross-fall the two ends' middles left the high side's tyres in the road).
 */
export const SIT = { near: 90, every: 4 };
/** A parked vehicle is sat on the road again every this many frames (the road under it may have come in since). */
export const PARK_RESIT = 30;

/**
 * How a vehicle at (x, z) heading `heading` sits on the surface (`surfaceAt(x, z, from)`), its tyres at
 * `axles` ({ front, rear: z of the axles, nose to −z; track: half the track, 0 for a two-wheeler}):
 * { y (its origin's height), pitch (+ nose up), roll (+ right side up) } — the plane through the
 * tyres' heights, lifted until no tyre is below the surface (on a twisted bit of road the lowest
 * one touches, the others on it). With `four` false only the axles' middles are sampled (no roll).
 */
export function sitOn(surfaceAt, x, z, heading, { front, rear, track }, from = Infinity, four = true) {
  const fx = -Math.sin(heading);
  const fz = -Math.cos(heading);
  // right of the nose: (−fz, fx)
  const at = (along, side) => surfaceAt(x - fx * along - fz * side, z - fz * along + fx * side, from);
  const base = rear - front || 1;
  let fl, fr, rl, rr;
  if (four && track > 0) {
    fl = at(front, -track);
    fr = at(front, track);
    rl = at(rear, -track);
    rr = at(rear, track);
  } else {
    fl = fr = at(front, 0);
    rl = rr = at(rear, 0);
  }
  const yf = (fl + fr) / 2;
  const yr = (rl + rr) / 2;
  const pitch = Math.atan2(yf - yr, base);
  const roll = track > 0 ? Math.atan2((fr + rr - fl - rl) / 2, 2 * track) : 0;
  // the plane's height at the origin (between the axles)
  let y = yr + ((yf - yr) * rear) / base;
  const sp = Math.tan(pitch);
  const sr = Math.tan(roll);
  // (each tyre's height on the plane: its origin's, plus the rise to it; lifted to the highest one under it)
  const on = (along, side) => y - along * sp + side * sr;
  let lift = 0;
  if (track > 0 && four) {
    lift = Math.max(fl - on(front, -track), fr - on(front, track), rl - on(rear, -track), rr - on(rear, track), 0);
  }
  y += lift;
  return { y, pitch, roll };
}

/** How far either side of a road's corner a lane rounds it (metres, at most: under half of each stretch). */
export const ROUND = 4.5;

/**
 * Where a vehicle `side` metres right of a road's middle is at { i, t, dir }, and which way it heads.
 * Each corner of the road's line is rounded off (a curve from ROUND m before it to ROUND m after, as
 * a driver takes it), the lane offset square to that curve: a car in any lane goes round a bend with
 * no jump and no kink — the way it moves never snaps round by the corner's angle (up to 60° on Bukak
 * Skyway's hairpins), so its nose can keep to it. On the inside of a bend tighter than the lane is
 * wide, the lane closes in toward the middle round the curve (it never loops back on itself).
 */
export function laneAt(pts, { i, t, dir }, side = 0) {
  const n = pts.length / 2 - 1;
  const unit = (k) => {
    const ex = pts[k * 2 + 2] - pts[k * 2];
    const ez = pts[k * 2 + 3] - pts[k * 2 + 1];
    const l = Math.hypot(ex, ez) || 1e-6;
    return [ex / l, ez / l, l];
  };
  const [ux, uz, len] = unit(i);
  const d = t * len;
  let x = pts[i * 2] + ux * d;
  let z = pts[i * 2 + 1] + uz * d;
  let tx = ux;
  let tz = uz;
  let sd = side * dir;
  // the corner this point is rounding, if any: k (between stretch k − 1 and k), and how far round (0–1)
  const cutAt = (k) => Math.min(ROUND, unit(k - 1)[2] * 0.45, unit(k)[2] * 0.45);
  // On the inside of a bend: no further from the middle than 0.8 of the rounded corner's own radius —
  // closing in gently before it and out after (at most 0.4 m across a metre along), never in and out.
  const room = (k) => {
    const [ax, az] = unit(k - 1);
    const [bx, bz] = unit(k);
    // (+: it bends toward the right of +1)
    if (Math.sign(bx * -az + bz * ax) !== Math.sign(sd)) return Infinity;
    const cos = Math.max(-1, Math.min(1, ax * bx + az * bz));
    return (0.8 * cutAt(k)) / Math.max(1e-3, Math.tan(Math.acos(cos) / 2));
  };
  if (sd) {
    let cap = Math.abs(sd);
    const reach = Math.abs(sd) / 0.4;
    for (let k = i, far = d; k > 0 && far < reach; far += unit(--k)[2]) cap = Math.min(cap, room(k) + 0.4 * far);
    for (let k = i + 1, far = len - d; k < n && far < reach; far += unit(k++)[2]) cap = Math.min(cap, room(k) + 0.4 * far);
    sd = Math.sign(sd) * cap;
  }
  let k = -1;
  let tau = 0;
  if (i > 0 && d < cutAt(i)) {
    k = i;
    tau = 0.5 + d / (2 * cutAt(i));
  } else if (i + 1 < n && len - d < cutAt(i + 1)) {
    k = i + 1;
    tau = (d - (len - cutAt(i + 1))) / (2 * cutAt(i + 1));
  }
  if (k > 0) {
    const [ax, az] = unit(k - 1);
    const [bx, bz] = unit(k);
    const cos = ax * bx + az * bz;
    if (cos < 0.9998) {
      const cut = cutAt(k);
      const cx = pts[k * 2];
      const cz = pts[k * 2 + 1];
      const u = 1 - tau;
      // (a quadratic curve: ROUND m back along the stretch before, the corner, ROUND m on along the next)
      x = u * u * (cx - ax * cut) + 2 * u * tau * cx + tau * tau * (cx + bx * cut);
      z = u * u * (cz - az * cut) + 2 * u * tau * cz + tau * tau * (cz + bz * cut);
      tx = u * ax + tau * bx;
      tz = u * az + tau * bz;
      const tl = Math.hypot(tx, tz);
      if (tl < 1e-3) [tx, tz] = tau < 0.5 ? [ax, az] : [bx, bz];
      else [tx, tz] = [tx / tl, tz / tl];
    }
  }
  // right of the line going +1 is (−tz, tx): the lane `side` metres right of the way it goes
  return { x: x - tz * sd, z: z + tx * sd, heading: Math.atan2(-tx * dir, -tz * dir) };
}

/** How many metres before a road's end a turn begins, and after the next road's start it ends: more the sharper it is. */
export const turnIn = (bend) => 2 + 5 * Math.min(1, Math.abs(bend ?? 0) / (Math.PI / 2));

/**
 * A turn's path: a smooth curve (cubic Bézier) from (x0, z0) going `h0` to (x1, z1) going `h1`, its length
 * measured so a vehicle goes round it at its own speed (`arcAt`), and how fast to take it (`slow`, m/s).
 */
export function arc(x0, z0, h0, x1, z1, h1, reach = 0.42) {
  const d = Math.hypot(x1 - x0, z1 - z0);
  const h = d * reach;
  const p = [x0, z0, x0 - Math.sin(h0) * h, z0 - Math.cos(h0) * h, x1 + Math.sin(h1) * h, z1 + Math.cos(h1) * h, x1, z1];
  const N = 16;
  const lens = [0];
  let px = x0;
  let pz = z0;
  for (let k = 1; k <= N; k++) {
    const q = bezier(p, k / N);
    lens.push(lens[k - 1] + Math.hypot(q.x - px, q.z - pz));
    px = q.x;
    pz = q.z;
  }
  const bend = Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0)));
  return { p, lens, len: lens[N], u: 0, slow: bend > 0.5 ? 4 + 4 * (1 - Math.min(1, bend / (Math.PI / 2))) : Infinity };
}

function bezier(p, t) {
  const s = 1 - t;
  const a = s * s * s;
  const b = 3 * s * s * t;
  const c = 3 * s * t * t;
  const d = t * t * t;
  return { x: a * p[0] + b * p[2] + c * p[4] + d * p[6], z: a * p[1] + b * p[3] + c * p[5] + d * p[7] };
}

/** The point `u` metres round a turn (`arc`). */
export function arcAt(tr, u) {
  const N = tr.lens.length - 1;
  let k = 1;
  while (k < N && tr.lens[k] < u) k++;
  const a = tr.lens[k - 1];
  const f = (u - a) / (tr.lens[k] - a || 1);
  return bezier(tr.p, Math.min(1, (k - 1 + Math.max(0, Math.min(1, f))) / N));
}

/**
 * Does a driver going `heading` brake for this rider in front of it? Only one going its way (it follows,
 * as it follows a car), or one standing still in the road (held by the police, stuck in a jam: a driver
 * doesn't run into something stopped) — never one riding at it or across its way: they have to get out of
 * its way, not it out of theirs.
 */
export function brakesFor(heading, rider) {
  if (rider.left) return false;
  if (rider.pulled || Math.abs(rider.s.v ?? 0) < 1.5) return true;
  return Math.cos((rider.s.travel ?? rider.s.heading) - heading) > 0.5;
}

/**
 * Two vehicles whose ways cross ahead (each { x, z, heading, speed, halfLength, halfWidth }): does `a`
 * give way to `b`? It does if `b` is already in the crossing, or gets there clearly first, or — the two
 * getting there about together — `b` comes from `a`'s right. One already in the crossing never waits (it
 * clears it), so two never wait for each other. Returns how far `a` may go before stopping (m), or null.
 */
export function giveWay(a, b, reach = 26) {
  const fax = -Math.sin(a.heading);
  const faz = -Math.cos(a.heading);
  const fbx = -Math.sin(b.heading);
  const fbz = -Math.cos(b.heading);
  const cross = fax * fbz - faz * fbx;
  // (the same way or head on: no crossing — following and the lanes see to those)
  if (Math.abs(cross) < 0.4) return null;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  // how far each is from where their lines meet
  const ta = (dx * fbz - dz * fbx) / cross;
  const tb = (dz * fax - dx * faz) / -cross;
  const roomA = (b.halfWidth ?? 1) + (a.halfLength ?? 2) + 1;
  const roomB = (a.halfWidth ?? 1) + (b.halfLength ?? 2) + 1;
  if (ta < roomA || ta > reach + roomA) return null;
  if (tb < -roomB || tb > reach + roomB) return null;
  const stop = Math.max(0, ta - roomA);
  if (Math.abs(tb) < roomB) return stop;
  if (tb < 0) return null;
  const sa = ta / Math.max(1, a.speed);
  const sb = tb / Math.max(1, b.speed);
  if (sb + 0.8 < sa) return stop;
  const right = -dx * faz + dz * fax > 0;
  if (Math.abs(sa - sb) <= 0.8 && right) return stop;
  return null;
}

/**
 * The delivery riders: real people (folk.js takeRider: Rocketbox, sat in a riding pose), each pose baked once
 * into still meshes merged by material — the same figure, a few draws and no skinning, so every scooter on
 * the move can carry its rider at any distance (a skinned figure is dozens of draws). Up to RIDERS.looks
 * different people, then shared.
 */
export const RIDERS = { looks: 10 };
const riderLooks = [];

/** A posed figure (a holder of skinned meshes) as still geometry in the holder's own space, merged by material. */
export function bakeFigure(holder) {
  holder.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(holder.matrixWorld).invert();
  const byMat = new Map();
  const v = new THREE.Vector3();
  holder.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    o.skeleton?.update();
    const src = o.geometry;
    const pos = src.attributes.position;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const out = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      if (o.isSkinnedMesh) o.getVertexPosition(i, v);
      else v.fromBufferAttribute(pos, i);
      v.applyMatrix4(m);
      out[i * 3] = v.x;
      out[i * 3 + 1] = v.y;
      out[i * 3 + 2] = v.z;
    }
    const mats = [].concat(o.material);
    const groups = Array.isArray(o.material) && src.groups.length ? src.groups : [{ start: 0, count: src.index ? src.index.count : pos.count, materialIndex: 0 }];
    for (const gr of groups) {
      const mat = mats[gr.materialIndex ?? 0];
      if (!mat) continue;
      const idx = [];
      for (let k = gr.start; k < gr.start + gr.count; k++) idx.push(src.index ? src.index.getX(k) : k);
      // (only the corners this piece uses)
      const map = new Map();
      const p = [];
      const uv = [];
      const index = [];
      for (const i of idx) {
        let j = map.get(i);
        if (j === undefined) {
          j = map.size;
          map.set(i, j);
          p.push(out[i * 3], out[i * 3 + 1], out[i * 3 + 2]);
          if (src.attributes.uv) uv.push(src.attributes.uv.getX(i), src.attributes.uv.getY(i));
        }
        index.push(j);
      }
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat).push({ p, uv, index });
    }
  });
  const list = [];
  for (const [mat, pieces] of byMat) {
    const p = [];
    const uv = [];
    const index = [];
    for (const piece of pieces) {
      const base = p.length / 3;
      for (const x of piece.p) p.push(x);
      for (const x of piece.uv) uv.push(x);
      for (const i of piece.index) index.push(base + i);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    if (uv.length === (p.length / 3) * 2) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    list.push({ g, mat });
  }
  return list;
}

/** A delivery rider for a scooter: a still figure (see RIDERS), or null while the people haven't loaded. */
function stillRider() {
  if (riderLooks.length < RIDERS.looks) {
    const h = takeRider();
    if (h) {
      const look = bakeFigure(h);
      if (look.length) riderLooks.push(look);
    }
  }
  if (!riderLooks.length) return null;
  const look = riderLooks[Math.floor(Math.random() * riderLooks.length)];
  const g = new THREE.Group();
  for (const p of look) {
    const m = new THREE.Mesh(p.g, p.mat);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  g.userData.rider = true;
  return g;
}

export class RaceTraffic {
  /** @param {any} game the SeoulGame @param {any} race the Race */
  constructor(game, race) {
    this.g = game;
    this.race = race;
    this.vehicles = [];
    this._frustum = new THREE.Frustum();
    this._pv = new THREE.Matrix4();
    this._ball = new THREE.Sphere();
    /** the buildings' footprints on a grid, as the sight lines find them (true: inside one) */
    this._solidCells = new Map();
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this._spawnT = 0;
    this._onT = 0;
    this._alT = 0;
    this._goT = 0;
    const level = race.course?.def?.level ?? 'easy';
    this.level = LEVELS[level] ?? LEVELS.easy;
    // (the residential lanes the course takes: delivery scooters on them, coming the other way too — and on
    // Hard, cars too, on the lanes wide enough for one and a rider beside it)
    this.carsOnLanes = Boolean(this.level.dense);
    // (already in by now: the race waits for them before the lights — race.js _begin)
    loadFleet();
    this._courseLanes();
    this.junctions = new Junctions(this._drivable());
    this._parkSpots();
    this._glow();
  }

  /**
   * Roads a vehicle of a kind may drive: cars and buses the main roads, scooters (and on Hard cars) also
   * the residential lanes wide enough — never a narrow street (people only), nor a short cut's golmok.
   */
  _roads(x, z, kind) {
    const keep = this.race.scRoads;
    const carMax = this.carsOnLanes ? 5 : 4;
    return (this.g.roadsNear?.(x, z, 1) ?? []).filter((r) => r.pts.length >= 4 && r.cls >= 1 && r.cls <= (kind === 'scooter' ? 5 : kind === 'bus' ? 3 : carMax) && !this._narrow(r) && !keep?.has(r));
  }

  /**
   * Every road a vehicle may drive round the course (and, with no course, round the middle of the map): what
   * the junctions are found from.
   */
  _drivable() {
    const out = new Set();
    const pts = this.race.course?.points;
    const at = pts?.length ? pts.filter((_, k) => k % 25 === 0) : [[0, 0]];
    for (const p of at) for (const r of this._roads(p[0], p[1], 'scooter')) out.add(r);
    return out;
  }

  /** Whether a road is narrow (people only): as the course measured it where it runs down it, else by the map. */
  _narrow(r) {
    return this.laneNarrow?.get(r) ?? narrowRoad(r);
  }

  /**
   * The residential lanes the course runs down, narrow or not as the course has them: where it measured the
   * room between the buildings (a zig-zag's lanes, course.js measureRoom) that, not the map's 6.2 m default —
   * and narrow if any of the course's points on it is. (A lane is the course's where it runs along it: not
   * one crossing it at a junction.)
   */
  _courseLanes() {
    this.laneNarrow = new Map();
    const pts = this.race.course?.points;
    if (!pts) return;
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k];
      if ((p[3] ?? 4) !== 5) continue;
      const q = pts[(k + 1) % pts.length];
      const hx = q[0] - p[0];
      const hz = q[1] - p[1];
      const hl = Math.hypot(hx, hz) || 1;
      const narrow = narrowPoint(p);
      for (const r of this.g.roadsNear?.(p[0], p[1], 1) ?? []) {
        if (r.cls !== 5 || this.laneNarrow.get(r) === true || (!narrow && this.laneNarrow.has(r))) continue;
        for (let i = 2; i < r.pts.length; i += 2) {
          const ax = r.pts[i - 2];
          const az = r.pts[i - 1];
          const dx = r.pts[i] - ax;
          const dz = r.pts[i + 1] - az;
          if (Math.min(ax, ax + dx) > p[0] + 2 || Math.max(ax, ax + dx) < p[0] - 2 || Math.min(az, az + dz) > p[1] + 2 || Math.max(az, az + dz) < p[1] - 2) continue;
          const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / (dx * dx + dz * dz || 1)));
          if (Math.hypot(p[0] - ax - dx * t, p[1] - az - dz * t) < 1.5 && Math.abs(dx * hx + dz * hz) > 0.8 * hl * Math.hypot(dx, dz)) {
            this.laneNarrow.set(r, narrow);
            break;
          }
        }
      }
    }
  }

  /**
   * A vehicle's look: a real model of the kind (a bus now and then a green town bus; a kind whose model
   * didn't load, another real one) — null while none is in, and nothing is put down then.
   */
  _make(kind) {
    const group = new THREE.Group();
    let view = null;
    let size;
    if (kind === 'scooter') {
      const body = makeFleetMoped();
      if (!body) return null;
      group.add(body);
      size = SIZE.scooter;
    } else {
      const want = kind === 'bus' ? (Math.random() < SIGHT.town ? 'townbus' : 'bus') : pickFleetKind();
      const as = want ? fleetKindFor(want) : null;
      view = as ? makeFleetVehicle(as) : null;
      if (!view) return null;
      group.add(view.group);
      size = [view.size.length / 2, view.size.width / 2 - 0.05];
    }
    this.group.add(group);
    return { group, view, kind, size, model: view?.model ?? kind };
  }

  /** A delivery scooter on the move has its rider on from the start (a real person; parked ones stand empty). */
  _ride(v) {
    if (v.kind !== 'scooter' || v.parked) return true;
    v.rider = stillRider();
    if (!v.rider) return false;
    v.group.add(v.rider);
    return true;
  }

  /** A new vehicle on a road a little way from someone riding (mostly ahead of them, out of sight). */
  _spawn(anchor, kind) {
    const roads = this._roads(anchor.x, anchor.z, kind);
    if (!roads.length) return false;
    const fx = -Math.sin(anchor.heading);
    const fz = -Math.cos(anchor.heading);
    for (let tries = 0; tries < 16; tries++) {
      const r = roads[Math.floor(Math.random() * roads.length)];
      const n = r.pts.length / 2 - 1;
      const i = Math.floor(Math.random() * n);
      const at = { i, t: Math.random(), dir: r.oneway ? 1 : Math.random() < 0.5 ? 1 : -1 };
      const lane = this._lane(r, kind);
      const q = laneAt(r.pts, at, lane);
      const dx = q.x - anchor.x;
      const dz = q.z - anchor.z;
      const d = Math.hypot(dx, dz);
      // Not on top of anyone; out ahead, far enough to be seen coming, a few behind.
      const ahead = (dx * fx + dz * fz) / d;
      if (d < (anchor.me ? (ahead > 0.3 ? 95 : 45) : 30) || d > 260) continue;
      if (ahead < -0.4 && Math.random() < 0.85) continue;
      if (this._nearRider(q.x, q.z) || this.vehicles.some((v) => Math.hypot(v.box.x - q.x, v.box.z - q.z) < 9)) continue;
      if (this.g.buildingAt?.(q.x, q.z) || this.race.keepClear?.(q.x, q.z)) continue;
      // (never into a jam, nor in or at a junction's box)
      if (this._jamAt(q.x, q.z) || this._atJunction(q.x, q.z, 6)) continue;
      // (only out of sight: round a corner, behind a building or the camera, in the fog — it drives into view)
      const hl = kind === 'bus' ? 5.5 : 2.4;
      if (this._seen(q.x, this.g.surfaceAt(q.x, q.z), q.z, hl + 1, true, hl, q.heading)) continue;
      const made = this._make(kind);
      if (!made) return false;
      const top = (SPEEDS[Math.min(5, r.cls)] ?? 8) * (kind === 'scooter' ? 1.05 : kind === 'bus' ? 0.85 : 1) * (0.85 + Math.random() * 0.3);
      const [halfLength, halfWidth] = made.size;
      const v = { ...made, road: r, at, lane, lat: lane, top, speed: top * 0.8, v: top * 0.8, y: this.g.surfaceAt(q.x, q.z), box: { x: q.x, z: q.z, heading: q.heading, halfLength, halfWidth }, missed: new Set(), stopFor: 0, waited: 0, roll: 0 };
      if (!this._born(v)) return false;
      return true;
    }
    return false;
  }

  /** How far right of the road's middle a vehicle drives: its lane (a scooter by the kerb). */
  _lane(r, kind) {
    if (isSmall(r.cls)) return kind === 'scooter' ? Math.max(0, r.width / 2 - 1) : r.oneway || r.width < 5.5 ? 0 : Math.max(1.2, r.width / 4);
    const lane = r.oneway ? r.width / 4 : Math.max(1.7, Math.min(4.2, r.width / 4));
    return kind === 'scooter' ? Math.max(lane, r.width / 2 - 1.1) : kind === 'bus' ? Math.max(lane, r.width / 2 - 1.8) : lane;
  }

  /**
   * The lanes (offsets right of the road's middle, 3.2 m apart) a car may drive on its side of a road
   * with two or more lanes its way — null on one narrower than that, and on the small streets.
   */
  _lanes(r) {
    if (isSmall(r.cls)) return null;
    const w = r.width ?? 6;
    const out = [];
    for (let x = r.oneway ? -w / 2 + 1.6 : 1.6; x <= w / 2 - 1.4; x += 3.2) out.push(x);
    return out.length > 1 ? out : null;
  }

  update(dt, anchors) {
    if (!anchors.length) return;
    this._view();
    this.junctions.tick(dt);
    const me = anchors.find((a) => a.me) ?? anchors[0];
    // Done with: far from every racer, or (sent up the course, or coming down it) passed — off the street
    // once out of sight; still in view, driving on till it isn't.
    this._goT -= dt;
    if (this._goT <= 0) {
      this._goT = 0.2;
      for (const v of [...this.vehicles]) {
        if (v.parked) continue;
        const near = Math.min(...anchors.map((a) => Math.hypot(a.x - v.box.x, a.z - v.box.z)));
        const behind = (v.oncoming || v.along) && (v.box.x - me.x) * -Math.sin(me.heading) + (v.box.z - me.z) * -Math.cos(me.heading) < -45;
        // (and one stuck for good — at a corner too tight for it, behind two that met nose to side — once out
        // of sight: never left there to block the road, never taken off in view)
        if (near > (v.oncoming || v.along ? SIGHT.far : SIGHT.gone) || behind || v.deadEnd || v.stuckT > STUCK) this._retire(v);
        else v.going = false;
      }
    }
    // Too few: more, a few a second, round the racers (most round you).
    this._spawnT -= dt;
    if (this._spawnT <= 0 && this.vehicles.length < CAP) {
      this._spawnT = 0.12;
      const count = { car: 0, bus: 0, scooter: 0 };
      for (const v of this.vehicles) if (!v.oncoming && !v.along && !v.parked && !v.going) count[v.kind]++;
      for (const kind of ['car', 'bus', 'scooter']) {
        if (count[kind] < WANT[kind] * this.level.traffic * (anchors.length > 1 ? 1.2 : 1)) {
          const a = Math.random() < 0.65 ? me : anchors[Math.floor(Math.random() * anchors.length)];
          this._spawn(a, kind);
          break;
        }
      }
    }
    // Coming the other way down the course's own roads, ahead of you: kept to the level's number.
    this._onT -= dt;
    if (this._onT <= 0) {
      this._onT = 0.1;
      const on = this.vehicles.filter((v) => v.oncoming && !v.going).length;
      if (on < this.level.oncoming) this._spawnOncoming(me);
    }
    // …and going your way up the course ahead, in the riders' lanes: slower traffic to weave past.
    this._alT -= dt;
    if (this._alT <= 0) {
      this._alT = 0.1;
      const al = this.vehicles.filter((v) => v.along && !v.going).length;
      if (al < (this.level.along ?? 0)) this._spawnOncoming(me, true);
    }
    this._parked(anchors);
    const night = this.g.uniforms?.uNight?.value ?? 0;
    this.blink = (this.blink ?? 0) + dt;
    const on = this.blink % 0.8 < 0.4;
    const cam = this._cam ?? me;
    for (const v of this.vehicles.slice()) {
      if (v.parked) {
        v.braking = false;
        this._place(v, 0);
      } else this._drive(v, dt);
      // (a short cut's golmok is kept clear to race down: one that strays into its mouth goes back to its
      // lane, and one far from you goes — once out of sight)
      if (!v.parked && this.race.keepClear?.(v.box.x, v.box.z)) {
        v.lane = this._lane(v.road, v.kind);
        if (Math.hypot(v.box.x - me.x, v.box.z - me.z) > 40) this._retire(v);
        if (!this.vehicles.includes(v)) continue;
      }
      // (one sent up the course that has turned off it: just traffic now, and another sent in its place)
      if ((v.along || v.oncoming) && (v.ciT = (v.ciT ?? 0.5) - dt) <= 0) {
        v.ciT = 0.5;
        if (!this._onCourse(v)) v.along = v.oncoming = false;
      }
      // (headlights on in the rain too)
      v.view?.lights(Math.max(night, (this.g.weather?.level.wet ?? 0) > 0.3 ? 0.5 : 0, (this.g.weather?.level.thick ?? 0) * 0.8), v.braking);
      // the full model near the camera, its reduced copy far off (a little apart, so it never flickers)
      const d = Math.hypot(v.box.x - cam.x, v.box.z - cam.z);
      v.lodNear = v.lodNear ?? true ? d < LOD.far : d < LOD.near;
      v.view?.near(v.lodNear);
      v.view?.indicate(v.hazard ? 'both' : v.signal, on);
    }
    this._glowFrame(night, me);
  }

  /** The camera's view this frame (what can see a vehicle come or go): its frustum, and the fog. */
  _view() {
    const cam = this.g.camera;
    if (!cam) {
      this._cam = null;
      return;
    }
    this._pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._pv);
    this._cam = cam.position;
    // (the canvas's height on the page, in the pixels an eye sees)
    this._h = this.g.renderer?.domElement?.clientHeight || 720;
    const f = this.g.scene?.fog;
    // (past nine tenths of the way through the fog, a car is gone into it)
    this._fogFar = f?.isFog ? f.near + (f.far - f.near) * 0.9 : Infinity;
  }

  /**
   * Could the camera see something at (x, y, z) about `r` m round: in its view, inside the fog — a vehicle
   * (`hl` m half-long, heading `heading`) big enough on screen to make out (SIGHT.px) — and with `sight`,
   * along a clear line across the ground to its middle or either end, not behind the course's walls or any
   * building.
   */
  _seen(x, y, z, r = 3, sight = false, hl = 0, heading = 0) {
    const cam = this._cam;
    if (!cam) return true;
    const d = Math.hypot(x - cam.x, z - cam.z);
    if (d - r > this._fogFar) return false;
    this._ball.center.set(x, y + 1, z);
    this._ball.radius = r;
    if (!this._frustum.intersectsSphere(this._ball)) return false;
    if (hl > 0 && onScreen(this.g.camera, this._h, x, z, hl, heading, y) < SIGHT.px) return false;
    if (!sight || d < r + 3) return true;
    if (this._clear(cam.x, cam.z, x, z)) return true;
    if (hl > 0) {
      const fx = -Math.sin(heading) * hl;
      const fz = -Math.cos(heading) * hl;
      if (this._clear(cam.x, cam.z, x + fx, z + fz) || this._clear(cam.x, cam.z, x - fx, z - fz)) return true;
    }
    return false;
  }

  /** Is the line across the ground from (ax, az) to (bx, bz) clear of the course's walls and of every building? */
  _clear(ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    const d = Math.hypot(dx, dz);
    if (d < 3) return true;
    const ux = dx / d;
    const uz = dz / d;
    const walls = this.race.course?.walls;
    if (walls && walls.ray(ax, az, ux, uz, d) < d - 1.5) return false;
    if (!this.g.buildingAt) return true;
    // (two samples in a row inside a building: the line goes through it, not past its corner)
    let run = 0;
    for (let s = 3; s < d - 2; s += SIGHT.step) {
      run = this._solid(ax + ux * s, az + uz * s) ? run + 1 : 0;
      if (run >= 2) return false;
    }
    return true;
  }

  /** Is there a building at (x, z)? On a grid, remembered (the city's footprints are a slow lookup). */
  _solid(x, z) {
    const c = SIGHT.cell;
    const i = Math.floor(x / c);
    const j = Math.floor(z / c);
    const key = i * 1048576 + j;
    let hit = this._solidCells.get(key);
    if (hit === undefined) {
      if (this._solidCells.size > 300000) this._solidCells.clear();
      hit = Boolean(this.g.buildingAt((i + 0.5) * c, (j + 0.5) * c));
      this._solidCells.set(key, hit);
    }
    return hit;
  }

  /** A vehicle just made: on the street, in place (out of sight: see the callers). False if it couldn't be (no rider for a scooter). */
  _born(v) {
    if (!this._ride(v)) {
      this.group.remove(v.group);
      return false;
    }
    this.vehicles.push(v);
    this._place(v, 0);
    return true;
  }

  /** Done with: off the street at once if out of sight; else it goes on as it was until it is (`going`). */
  _retire(v) {
    if (this._seen(v.box.x, v.y, v.box.z, v.box.halfLength + 1, true, v.box.halfLength, v.box.heading)) {
      v.going = true;
      return;
    }
    this._remove(v);
  }

  /** A scooter's rider off it (the figure's geometry is shared: nothing to free). */
  _dropRider(v) {
    if (!v.rider) return;
    v.rider.removeFromParent();
    v.rider = null;
  }

  /** Is any rider within `r` metres of a point (no vehicle is put down there: it would pop up in their face)? */
  _nearRider(x, z, r = 40) {
    return this.race.racers.some((o) => !o.left && Math.hypot(o.s.x - x, o.s.z - z) < r);
  }

  /** Is a vehicle sent up the course still on it (its own carriageway, or the other one of a divided road)? */
  _onCourse(v) {
    const c = this.race.course;
    if (!c || v.ci == null) return true;
    const n = c.points.length;
    let best = Infinity;
    let bi = v.ci;
    for (let k = -12; k <= 12; k++) {
      const i = c.open ? v.ci + k : (v.ci + k + n) % n;
      if (i < 0 || i >= n) continue;
      const d = Math.hypot(c.points[i][0] - v.box.x, c.points[i][1] - v.box.z);
      if (d < best) [best, bi] = [d, i];
    }
    v.ci = bi;
    const p = c.points[bi];
    return best < (p[2] ?? 8) / 2 + (v.oncoming && p[4] ? 48 : 6);
  }

  /**
   * A vehicle coming the other way down the course ahead of `anchor` (80–230 m on): on the far side
   * of the same two-way road, or down the other carriageway of a divided one — a road beside the
   * course running against it. With `along`, one going the riders' way instead (90–270 m on), in
   * their own carriageway: slower than they are, to weave past. Only where the camera can't see it
   * (round the course's next corner, behind a building, in the fog): on a long straight in clear air
   * none comes until there is such a place. Returns whether one was made.
   */
  _spawnOncoming(anchor, along = false) {
    const c = this.race.course;
    if (!c || anchor.idx == null) return false;
    const n = c.points.length;
    const dense = along && this.level.dense;
    const tries0 = dense ? 14 : 10;
    for (let tries = 0; tries < tries0; tries++) {
      // (60–600 m on up the course (85 going your way, 70 coming at you, off Hard): out of sight round a
      // corner, or so far down a straight it is too small to see — from where it drives into view)
      const from = dense ? 60 : along ? 85 : 70;
      const k = this._ahead(anchor.idx, from + Math.random() * (600 - from));
      const i = c.open ? Math.min(n - 2, anchor.idx + k) : (anchor.idx + k) % n;
      const p = c.points[i];
      // (a narrow stretch of the course has no traffic: people only)
      if (narrowPoint(p)) continue;
      const q = c.points[c.open ? i + 1 : (i + 1) % n];
      const hx = q[0] - p[0];
      const hz = q[1] - p[1];
      const hl = Math.hypot(hx, hz) || 1;
      const w = p[2] ?? 8;
      const kinds = along ? ['car', 'car', 'car', 'car', 'car', 'bus', 'scooter', 'scooter'] : ['car', 'car', 'car', 'car', 'bus', 'scooter'];
      // (down a residential lane: a delivery scooter — on Hard now and then a car, where one fits)
      const small = isSmall(p[3] ?? 4);
      const kind = small ? (dense && Math.random() < 0.45 ? 'car' : 'scooter') : kinds[Math.floor(Math.random() * kinds.length)];
      // a road passing by this point, going the other way (its own direction, or the way it's driven back)
      let best = null;
      for (const r of this._roads(p[0], p[1], kind)) {
        const m = r.pts.length / 2 - 1;
        for (let j = 0; j < m; j++) {
          const ax = r.pts[j * 2];
          const az = r.pts[j * 2 + 1];
          const bx = r.pts[j * 2 + 2];
          const bz = r.pts[j * 2 + 3];
          const ex = bx - ax;
          const ez = bz - az;
          const L2 = ex * ex + ez * ez || 1;
          const t = Math.max(0, Math.min(1, ((p[0] - ax) * ex + (p[1] - az) * ez) / L2));
          const d = Math.hypot(ax + ex * t - p[0], az + ez * t - p[1]);
          // (the other carriageway of a divided road may lie well across a median; the riders' own is the course's)
          if (d > w / 2 + (along ? 5 : p[4] ? 48 : 14)) continue;
          const dot = (ex * hx + ez * hz) / (Math.sqrt(L2) * hl);
          // along the course one way or the other; the way it is driven: against the course (or with it)
          let dir = 0;
          if (dot < -0.85) dir = along ? (r.oneway ? 0 : -1) : 1;
          else if (dot > 0.85) dir = along ? 1 : r.oneway ? 0 : -1;
          if (!dir) continue;
          if (!best || d < best.d) best = { r, at: { i: j, t, dir }, d };
        }
      }
      if (!best) continue;
      // (a car on a road with lanes to spare: any of them)
      const lanes = kind === 'car' ? this._lanes(best.r) : null;
      const lane = lanes ? lanes[Math.floor(Math.random() * lanes.length)] : this._lane(best.r, kind);
      const at = laneAt(best.r.pts, best.at, lane);
      const dA = Math.hypot(at.x - anchor.x, at.z - anchor.z);
      if (dA < from || dA > SIGHT.far - 40 || this._nearRider(at.x, at.z)) continue;
      // (room round it: never two abreast, or a car beside one coming the other way — a wall across the road)
      // (a car crossing at a junction is no wall along the road: only kept a car's length off)
      if (dense ? !this._roomFor(at, best.r) : this.vehicles.some((v) => Math.hypot(v.box.x - at.x, v.box.z - at.z) < (Math.abs(Math.cos(v.box.heading - at.heading)) > 0.7 ? (along ? 22 : 12) : 8))) continue;
      if (this.g.buildingAt?.(at.x, at.z) || this.race.keepClear?.(at.x, at.z)) continue;
      if (this._jamAt(at.x, at.z) || this._atJunction(at.x, at.z, 6)) continue;
      // (out of sight only: it drives into view)
      const half = kind === 'bus' ? 5.5 : 2.4;
      if (this._seen(at.x, this.g.surfaceAt(at.x, at.z), at.z, half + 1, true, half, at.heading)) continue;
      const made = this._make(kind);
      if (!made) return false;
      // (going your way: slower than the riders, some much slower — a truck, a bus, a cautious driver)
      const top = (SPEEDS[Math.min(5, best.r.cls)] ?? 8) * (kind === 'scooter' ? 1.05 : kind === 'bus' ? 0.85 : 1) * (along ? 0.55 + Math.random() * 0.35 : 0.85 + Math.random() * 0.3);
      const [halfLength, halfWidth] = made.size;
      const v = { ...made, road: best.r, at: best.at, lane, lat: lane, top, speed: top * 0.9, v: top * 0.9, y: this.g.surfaceAt(at.x, at.z), box: { x: at.x, z: at.z, heading: at.heading, halfLength, halfWidth }, missed: new Set(), stopFor: 0, waited: 0, roll: 0, oncoming: !along, along, ci: i };
      return this._born(v);
    }
    return false;
  }

  /** The course point `m` metres on from point `i` (as an offset in points). */
  _ahead(i, m) {
    const c = this.race.course;
    const n = c.points.length;
    let k = 0;
    for (let d = 0; d < m && k < n - 1; k++) {
      const a = c.points[(i + k) % n];
      const b = c.points[(i + k + 1) % n];
      d += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return k;
  }

  /**
   * Room on Hard's tight streets for one more going the riders' way at `at`: a little closer than elsewhere,
   * but never two side by side, nor beside one coming the other way, nor beside a car parked at the kerb —
   * across the road from it always a gap (each a car's length and more clear of another), and in its own
   * lane 14 m behind or ahead of the next.
   */
  _roomFor(at, road) {
    const fx = -Math.sin(at.heading);
    const fz = -Math.cos(at.heading);
    const width = (road.width ?? 6) + 2;
    for (const v of this.vehicles) {
      const dx = v.box.x - at.x;
      const dz = v.box.z - at.z;
      if (Math.abs(Math.cos(v.box.heading - at.heading)) < 0.7) {
        if (Math.hypot(dx, dz) < 8) return false;
        continue;
      }
      const al = Math.abs(dx * fx + dz * fz) - v.box.halfLength;
      const sd = Math.abs(dx * -fz + dz * fx);
      if (sd < 1.6 && al < 14) return false;
      if (sd < width && al < 10) return false;
    }
    return true;
  }

  /**
   * Where cars stand parked along the course (`parked` a km): at the kerb on the riders' side, on
   * two-way roads and lanes; and where buses stand at their stops (`stops` a km), on the wider roads
   * (two lanes or more the riders' way) — never in the 60 m before a corner nor just after it, nor at
   * a short cut's mouth, nor in a building — the same places for everyone.
   */
  _parkSpots() {
    this.spots = [];
    const c = this.race.course;
    if (!c) return;
    const n = c.points.length;
    const calm = cornerZones(c.points, { before: 10, after: 3 });
    const walls = c.walls;
    const from = c.open ? c.startI + 30 : 30;
    const to = c.open ? c.finishI - 10 : n - 10;
    // (on Hard, cars parked on the narrower two-way streets too, and delivery scooters left at the kerb of the lanes)
    const dense = Boolean(this.level.dense);
    for (const [kind, per] of [['bus', this.level.stops ?? 0], ['car', this.level.parked ?? 0], ['scooter', this.level.scooters ?? 0]]) {
      if (!per) continue;
      const gap = 1000 / per;
      let k = 0;
      let last = -Infinity;
      for (let i = from; i < to; i += 2, k++) {
        if (c.s[i] - last < gap) continue;
        const p = c.points[i];
        const q = c.points[(i + 1) % n];
        const w = p[2] ?? 8;
        // (never in a narrow street — people only — nor where the course comes out of one)
        if (calm[i] || c.wild?.[i] || narrowPoint(p) || narrowPoint(q) || narrowPoint(c.points[(i - 1 + n) % n])) continue;
        if (kind === 'car' ? p[4] || w < (dense ? 6.5 : 7) || w > 15 : kind === 'scooter' ? p[4] || w < 4.5 || w > 12 : isSmall(p[3] ?? 4) || w < (p[4] ? 7.4 : 12)) continue;
        if ((c.shortcuts ?? []).some((sc) => Math.abs(sc.from - i) < 6 || Math.abs(sc.to - i) < 6)) continue;
        // (a bus's length clear of the next corner too)
        if (kind === 'bus' && calm[(i + 3) % n]) continue;
        // (at the kerb of the road itself, along it: the course's point isn't always on the road's middle,
        // nor its way quite the road's — one put by the course's stood out into the lane, askew, and the
        // traffic ran into it)
        const kerb = this._kerbOf(p, q);
        if (!kerb) continue;
        // (in a place to park: along the kerb, out of the lanes the traffic drives — a car passing it at most
        // eases over a little in its own lane, never out into the next)
        const at = this._kerbPlace(kerb, kind);
        if (!at) continue;
        const hd = at.heading;
        const x = kerb.x + Math.cos(hd) * at.lat;
        const z = kerb.z - Math.sin(hd) * at.lat;
        if (walls?.hits(x, z, kind === 'scooter' ? 0.5 : 1.1) || this.g.buildingAt?.(x, z)) continue;
        // (never at a junction: clear of its box and its crossings by a car's length and more)
        if (this._atJunction(x, z, (kind === 'bus' ? 6 : 2.5) + 12)) continue;
        // (never two together: a bus stop clear of the parked cars; a parked scooter a little closer)
        if (this.spots.some((s) => Math.hypot(s.x - x, s.z - z) < (kind === 'scooter' || s.kind === 'scooter' ? 16 : 30))) continue;
        last = c.s[i];
        this.spots.push({ i, x, z, heading: hd, k, kind, v: null, kx: kerb.x, kz: kerb.z, side: at.side, edge: at.edge, hw: at.hw });
      }
    }
  }

  /**
   * The road under a course point `p` (toward the next, `q`) that runs its way: the point on its middle
   * line nearest `p`, its width and its heading the course's way — null if there is none within a few metres.
   */
  _kerbOf(p, q) {
    const hx = q[0] - p[0];
    const hz = q[1] - p[1];
    const hl = Math.hypot(hx, hz) || 1;
    let best = null;
    for (const r of this.g.roadsNear?.(p[0], p[1], 1) ?? []) {
      if (r.cls < 1 || r.cls > 5) continue;
      const m = r.pts.length / 2 - 1;
      for (let j = 0; j < m; j++) {
        const ax = r.pts[j * 2];
        const az = r.pts[j * 2 + 1];
        const ex = r.pts[j * 2 + 2] - ax;
        const ez = r.pts[j * 2 + 3] - az;
        const L = Math.hypot(ex, ez) || 1e-6;
        const t = Math.max(0, Math.min(1, ((p[0] - ax) * ex + (p[1] - az) * ez) / (L * L)));
        const d = Math.hypot(ax + ex * t - p[0], az + ez * t - p[1]);
        const dot = (ex * hx + ez * hz) / (L * hl);
        if (d > (r.width ?? 6) / 2 + 2 || Math.abs(dot) < 0.9 || (best && d >= best.d)) continue;
        const s = Math.sign(dot);
        best = { d, x: ax + ex * t, z: az + ez * t, width: r.width ?? 6, heading: Math.atan2(-ex * s, -ez * s), r, s };
      }
    }
    return best;
  }

  /**
   * Where along a road's kerb (`kerb`, from _kerbOf) a vehicle of `kind` may park: { heading, lat (m right of
   * the middle), hw (the half width it was measured for), side, edge } — at the kerb the right way along
   * (a one-way street's either kerb, facing its way; a two-way road's the course's side), and only where it
   * leaves the lanes clear: a car going by in the lane beside it eases over SIDE.park m at most and stays out
   * of the next lane (a bus at its stop may stand in the outer of two lanes or more, which the cars change out
   * of). Null where it can't.
   */
  _kerbPlace(kerb, kind) {
    const r = kerb.r;
    const w = kerb.width;
    const hw = kind === 'bus' ? 1.3 : kind === 'scooter' ? 0.42 : 1.02;
    const edge = w / 2 - 0.1;
    const heading = r?.oneway && kerb.s < 0 ? kerb.heading + Math.PI : kerb.heading;
    const own = [this._lane(r ?? { width: w, cls: 4 }, 'car'), ...((r && this._lanes(r)) ?? [])];
    // the lanes' middles, m right of the middle going `heading`, both ways on a two-way road
    const lanes = r?.oneway ? own : [...own, ...own.map((l) => -l)];
    const CAR = 1.0;
    for (const side of r?.oneway ? [1, -1] : [1]) {
      const lat = side * (edge - hw);
      let hit = 0;
      let shift = 0;
      for (const l of lanes) {
        const over = CAR + hw + 0.3 - Math.abs(l - lat);
        if (over <= 0) continue;
        hit++;
        // (the car in that lane eased over, away from it: still clear of every other lane?)
        const moved = l - side * over;
        if (lanes.some((m) => m !== l && Math.abs(m - moved) < 2 * CAR + 0.2)) shift = Infinity;
        shift = Math.max(shift, over);
      }
      const ok = hit === 0 || (hit === 1 && shift <= SIDE.park) || (kind === 'bus' && own.length > 2 && hit === 1);
      if (ok) return { heading, lat, hw, side, edge };
    }
    return null;
  }

  /**
   * The parked cars near anyone riding: put down while out of sight (its place stays empty while you can
   * see it), and gone again further off — once out of sight too.
   */
  _parked(anchors) {
    this._parkT = (this._parkT ?? 0) - 1;
    if (this._parkT > 0) return;
    this._parkT = 5;
    for (const s of this.spots) {
      const d = Math.min(...anchors.map((a) => Math.hypot(a.x - s.x, a.z - s.z)));
      // (never put down close to a rider: it would pop up in front of them)
      if (!s.v && d < 600 && d > 45 && !this._nearRider(s.x, s.z)) {
        const hl = s.kind === 'bus' ? 5.5 : s.kind === 'scooter' ? 0.9 : 2.4;
        const y = this.g.surfaceAt(s.x, s.z);
        if (this._seen(s.x, y, s.z, hl + 1, true, hl, s.heading)) continue;
        // (nor on top of one driving past)
        if (this.vehicles.some((o) => Math.hypot(o.box.x - s.x, o.box.z - s.z) < hl + o.box.halfLength + 1)) continue;
        const made = this._make(s.kind);
        if (!made) continue;
        const [halfLength, halfWidth] = made.size;
        // (one wider than the place was measured for would stand out in the lane: another time, another model)
        if (s.edge != null && halfWidth > s.hw + 0.06) {
          this.group.remove(made.group);
          continue;
        }
        // (its side against the kerb, whatever its width)
        if (s.edge != null) {
          const lat = s.side * (s.edge - halfWidth);
          s.x = s.kx + Math.cos(s.heading) * lat;
          s.z = s.kz - Math.sin(s.heading) * lat;
        }
        // (a bus at its stop blinks to pull out again)
        s.v = { ...made, parked: true, top: 0, speed: 0, v: 0, y, box: { x: s.x, z: s.z, heading: s.heading, halfLength, halfWidth }, missed: new Set(), stopFor: 0, waited: 0, roll: 0, signal: s.kind === 'bus' ? 'left' : null };
        this._born(s.v);
      } else if (s.v && d > 640) this._retire(s.v);
      else if (s.v) s.v.going = false;
    }
  }

  /** Every vehicle's lamps as glows (headlights white, tail lights red), seen from far off at night: one draw. */
  _glow() {
    const MAX = 400;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3));
    geo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(MAX), 1));
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uK: { value: 0 }, uFog: { value: 0 } },
      // (in a fog bank each lamp is a wide soft halo, seen before the car is — dimming with distance
      // through the fog rather than at the fog's edge)
      vertexShader: `attribute float size; attribute vec3 color; uniform float uFog; varying vec3 vC; varying float vF;
        void main() { vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); float z = max(1.0, -mv.z);
          vF = mix(1.0, exp(-z / 45.0), uFog);
          gl_PointSize = size * (1.0 + uFog * 1.6) * 320.0 / z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uK; uniform float uFog; varying vec3 vC; varying float vF;
        void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a = mix(a * a, a * a * a * 0.8 + a * 0.12, uFog) * uK * vF; if (a < 0.01) discard; gl_FragColor = vec4(vC * (0.6 + 2.4 * smoothstep(0.25 - uFog * 0.12, 0.0, d)), a); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.glow = new THREE.Points(geo, mat);
    this.glow.frustumCulled = false;
    this.glow.renderOrder = 3;
    this.group.add(this.glow);
    this.glowMax = MAX;
  }

  _glowFrame(night, me) {
    const g = this.glow;
    if (!g) return;
    // (lights on in the rain, and in a fog bank by day too: halos ahead before the cars)
    const thick = this.g.weather?.level.thick ?? 0;
    const k = Math.max(0, Math.min(1, (night - 0.3) / 0.4)) + ((this.g.weather?.level.wet ?? 0) > 0.3 ? 0.35 : 0) + thick * 0.85;
    g.material.uniforms.uK.value = Math.min(1, k);
    g.material.uniforms.uFog.value = thick;
    g.visible = k > 0.02;
    if (!g.visible) return;
    const pos = g.geometry.attributes.position.array;
    const col = g.geometry.attributes.color.array;
    const size = g.geometry.attributes.size.array;
    let m = 0;
    const put = (x, y, z, r, gg, b, s) => {
      if (m >= this.glowMax) return;
      pos[m * 3] = x;
      pos[m * 3 + 1] = y;
      pos[m * 3 + 2] = z;
      col[m * 3] = r;
      col[m * 3 + 1] = gg;
      col[m * 3 + 2] = b;
      size[m] = s;
      m++;
    };
    for (const v of this.vehicles) {
      if (v.parked) continue;
      const b = v.box;
      const fx = -Math.sin(b.heading);
      const fz = -Math.cos(b.heading);
      const rx = -fz;
      const rz = fx;
      const y = v.y + (v.kind === 'bus' ? 0.9 : v.kind === 'scooter' ? 0.9 : 0.75);
      const half = v.kind === 'scooter' ? 0 : b.halfWidth - 0.3;
      const front = b.halfLength + 0.05;
      for (const s of v.kind === 'scooter' ? [0] : [-1, 1]) {
        put(b.x + fx * front + rx * half * s, y, b.z + fz * front + rz * half * s, 1, 0.93, 0.78, v.kind === 'scooter' ? 0.5 : 0.75);
        put(b.x - fx * front + rx * half * s, y + 0.05, b.z - fz * front + rz * half * s, 1, 0.12, 0.08, v.braking ? 0.65 : 0.4);
      }
    }
    g.geometry.setDrawRange(0, m);
    g.geometry.attributes.position.needsUpdate = true;
    g.geometry.attributes.color.needsUpdate = true;
    g.geometry.attributes.size.needsUpdate = true;
    void me;
  }

  /**
   * Along its road on its own side — following the road's bends, pulling away and braking smoothly,
   * slowing for what is ahead in its lane and giving way across a junction — onto the next road at the
   * end (signalling first, the blink kept on through the turn), its nose always the way it is moving.
   */
  _drive(v, dt) {
    const b = v.box;
    const fx = -Math.sin(b.heading);
    const fz = -Math.cos(b.heading);
    let gap = Infinity;
    // (what the gap is to: a vehicle, a rider or a person, or a junction's line — and how fast it goes our way)
    let lead = null;
    let leadV = 0;
    // (`ext`: how far the thing reaches back toward us from its middle — a car's tail, not its middle)
    const look = (x, z, width = 1.6, react = 24, ext = 0, who = null, speed = 0) => {
      const dx = x - b.x;
      const dz = z - b.z;
      const along = dx * fx + dz * fz - b.halfLength - ext;
      const side = Math.abs(dx * -fz + dz * fx);
      if (along > -0.5 && along < react && side < b.halfWidth + width * 0.5 + 2 * BUMP_ROOM && along < gap) {
        gap = along;
        lead = who;
        leadV = speed;
      }
    };
    const me = { x: b.x, z: b.z, heading: b.heading, speed: v.speed, halfLength: b.halfLength, halfWidth: b.halfWidth };
    v.yieldT ??= 0;
    v.pushT = Math.max(0, (v.pushT ?? 0) - dt);
    const yielding = !v.pushT;
    let held = false;
    const oncoming = [];
    const parked = [];
    const ways = [];
    const laneHd = v.turn ? b.heading : laneAt(v.road.pts, v.at, 0).heading;
    const lfx = -Math.sin(laneHd);
    const lfz = -Math.cos(laneHd);
    // The junction ahead (its lights and its box, `_junction`): how far to its line, if held there.
    const line = this._junction(v);
    if (line < gap) {
      gap = line;
      lead = 'line';
      leadV = 0;
    }
    // A car parked at the kerb (a bus at its stop) ahead in our lane: pull out round it, not stand behind it.
    let cand = null;
    for (const o of this.vehicles) {
      if (o === v) continue;
      const ob = o.box;
      const dx0 = ob.x - b.x;
      const dz0 = ob.z - b.z;
      if (Math.abs(dx0) > 120 || Math.abs(dz0) > 120) continue;
      const c = Math.cos(ob.heading - b.heading);
      // (one coming the other way keeps to its own lane: braked for only if it stands in ours — and every
      // one facing us, moving or not, keeps us from pulling out into its lane, from further off too)
      const facing = c <= -0.6 && !o.parked;
      if (Math.abs(dx0) > 40 || Math.abs(dz0) > 40) {
        if (facing) oncoming.push(o);
        continue;
      }
      if (facing) oncoming.push(o);
      else if (!o.parked && c >= 0.6) ways.push(o);
      if (o.parked) parked.push(o);
      else if (facing && (o.speed ?? 0) > 0.5) {
        // (its lane's business)
      } else if (Math.abs(c) >= 0.6) {
        // following (or one standing across the way): its width across our way
        const sn = Math.abs(Math.sin(ob.heading - b.heading));
        look(ob.x, ob.z, (sn * ob.halfLength + Math.abs(c) * ob.halfWidth) * 2, 30, Math.abs(c) * ob.halfLength + sn * ob.halfWidth, o, Math.max(0, (o.speed ?? 0) * c));
      } else if (yielding && !v.jHold && !v.jNear && !o.jHold) {
        // crossing away from any junction the lights and the box see to: who gives way (never both)
        const w = giveWay(me, { x: ob.x, z: ob.z, heading: ob.heading, speed: o.v ?? o.speed ?? 0, halfLength: ob.halfLength, halfWidth: ob.halfWidth });
        if (w != null && w + 2.5 < gap) {
          gap = w + 2.5;
          lead = o;
          leadV = 0;
          held = true;
        }
      }
      // (how far along and across from us it stands measured along the lane, not our nose: a nose turned out
      // to pull round it isn't the road turning)
      const cl = Math.cos(ob.heading - laneHd);
      if (!o.parked || Math.abs(cl) < 0.8) continue;
      const al = dx0 * lfx + dz0 * lfz;
      const sd = dx0 * -lfz + dz0 * lfx;
      // (its corners too, standing a little askew: a bus at its stop on a bend)
      const room = b.halfWidth + Math.sqrt(Math.max(0, 1 - cl * cl)) * ob.halfLength + Math.abs(cl) * ob.halfWidth + 0.5;
      if (al < -ob.halfLength - b.halfLength || al > 30 + ob.halfLength || Math.abs(sd) > room) continue;
      if (!cand || al < cand.al) cand = { o, al, lat: (v.lat ?? v.lane) + sd - Math.sign(sd || 1) * room, side: Math.sign(sd || 1) };
    }
    // Out round a parked car only with room for the whole of it — the other lane clear far enough ahead to
    // get past and back in, nobody beside us there, no junction on the way; and once started, on round it
    // (never back in beside it, never left standing askew). Else it waits straight in its lane behind it.
    if (v.dodge && (!this.vehicles.includes(v.dodge.o) || this._alongLane(v, v.dodge.o, lfx, lfz) < -(v.dodge.o.box.halfLength + b.halfLength + 1))) v.dodge = null;
    if (v.dodge && cand?.o === v.dodge.o) v.dodge = cand;
    if (!v.dodge && cand && this._roundFree(v, cand, oncoming, ways, lfx, lfz)) v.dodge = cand;
    const dodge = v.dodge;
    // A parked one in our way braked for — while we can't go round it, stopping well short of it (room to
    // pull out round it, straight); going round it, only if we couldn't get across in time at the pace we
    // move across (SIDE).
    for (const o of parked) {
      const ob = o.box;
      const c = Math.cos(ob.heading - b.heading);
      const sn = Math.abs(Math.sin(ob.heading - b.heading));
      const reach = Math.abs(c) * ob.halfLength + sn * ob.halfWidth;
      if (dodge?.o === o) {
        const rem = Math.abs(dodge.lat - (v.lat ?? v.lane));
        const tail = this._alongLane(v, o, lfx, lfz) - b.halfLength - reach;
        if (rem <= SIDE.ratio * 0.9 * Math.max(0, tail - 0.5) + 0.05) continue;
      }
      look(ob.x, ob.z, (sn * ob.halfLength + Math.abs(c) * ob.halfWidth) * 2, 30, reach + (dodge?.o === o ? 0 : PARK_ROOM), o, 0);
    }
    // (waiting at a crossing more than six seconds: through, for a moment — nobody stands there for ever)
    v.yieldT = held && v.speed < 1 ? v.yieldT + dt : 0;
    if (v.yieldT > 6) {
      v.yieldT = 0;
      v.pushT = 2;
    }
    // Riders: no swerving, no braking, no waiting at a junction for them — coming the other way or across,
    // a vehicle holds its lane and its speed, and the rider has to get out of its way. A driver brakes only
    // for one going its way close in front in its lane (following, as it follows a car: a bike is seen
    // late, small and quick) or one standing still there — held by the police, stuck in a jam (brakesFor).
    for (const r of this.race.racers) if (brakesFor(b.heading, r)) look(r.s.x, r.s.z, 0.7, 18, 0.9, r, Math.max(0, (r.s.v ?? 0) * Math.cos((r.s.travel ?? r.s.heading) - b.heading)));
    for (const p of this.g.life?.near?.(b.x, b.z, 26) ?? []) look(p.x, p.z, 0.6, 14, 0.3, p, 0);
    v.stopFor = Math.max(0, v.stopFor - dt);
    // How fast it would go on a clear road: its own pace, slower into a turn, at a dead end, round a corner.
    let top = v.stopFor > 0 ? 0 : v.top;
    const left = this._leftOnRoad(v);
    if (!v.next && !v.noNext && left < 55) {
      v.next = this._pickNext(v);
      v.noNext = !v.next;
    }
    if (left < 25 && Math.abs(v.next?.bend ?? 0) > 0.5) top = Math.min(top, 4 + left * 0.25);
    if (v.noNext) top = Math.min(top, 3 + left * 0.3);
    if (v.turn) top = Math.min(top, v.turn.slow);
    // Following (IDM): pulling away at its own pace, easing up to what is in front and keeping its gap — a
    // queue stands straight, a couple of metres bumper to bumper, and moves off smoothly.
    const pull = PULL[v.view?.kind] ?? PULL[v.kind] ?? PULL.car;
    const s = v.speed;
    let acc = s <= top ? pull * (1 - (top > 0.1 ? (s / top) ** 4 : 1)) : -Math.min(5, 2 * (s - top) + 0.5);
    if (gap < Infinity) {
      const headway = FOLLOW.time * (v.kind === 'bus' ? 1.3 : 1);
      const want = FOLLOW.gap + Math.max(0, s * headway + (s * (s - leadV)) / (2 * Math.sqrt(pull * FOLLOW.brake)));
      acc -= pull * (want / Math.max(0.2, gap)) ** 2;
    }
    // (and the last of it brought to a stop, not crept for seconds)
    if (gap < FOLLOW.gap + 0.8 && s < 1.5 && leadV < 0.5) acc = Math.min(acc, -s / 0.4);
    acc = Math.max(-FOLLOW.hard, Math.min(pull, acc));
    v.speed = Math.max(0, s + acc * dt);
    v.braking = acc < -0.6 || v.speed < 0.3;
    v.hazard = v.stopFor > 0;
    // Why it stands, if it does: at a junction's line (or in the queue behind one waiting there) — a wait
    // that ends — or held up by something else (`stuckT`).
    v.waitWhy = lead === 'line' && v.jWhy ? 'signal' : lead && typeof lead === 'object' && lead.waitWhy && (lead.speed ?? 0) < 1 ? 'queue' : null;
    // Held up a while by something in front: a toot of the horn (not at a red light).
    v.waited = v.speed < 0.5 && gap < 8 && !v.waitWhy ? v.waited + dt : 0;
    if (v.waited > 1.6 && v.kind !== 'scooter') {
      v.waited = -5;
      const d = Math.hypot(b.x - this.g.pos.x, b.z - this.g.pos.z);
      if (d < 50) this.g.street?._horn?.(0.4 * (1 - d / 50), v.kind === 'bus' ? 220 : 330);
    }
    // Signal which way it turns at the end (and on through the turn, a second and a half).
    v.turnSig = Math.max(0, (v.turnSig ?? 0) - dt);
    v.signal = v.next && left < 40 && Math.abs(v.next.bend) > 0.4 ? (v.next.bend > 0 ? 'left' : 'right') : v.noNext && left < 40 ? 'left' : v.turnSig > 0 ? v.turnSide : null;
    // Now and then over to another lane (on a road with two or more our way): blinking a moment first, and
    // only into one clear for the whole move — never near a junction, never with a rider close by.
    if (v.kind !== 'scooter' && !dodge && left > 40 && !v.turnSig && !v.turn && !v.jNear && !v.jHold) {
      v.laneT = (v.laneT ?? 2 + Math.random() * 8) - dt;
      if (v.laneTo != null) {
        v.laneSig -= dt;
        v.signal = v.laneTo > (v.lat ?? v.lane) ? 'right' : 'left';
        if (v.laneSig <= 0) {
          if (this._laneFree(v, v.laneTo)) v.lane = v.laneTo;
          v.laneTo = null;
        }
      } else if (v.laneT <= 0) {
        v.laneT = 5 + Math.random() * 9;
        const lanes = this._lanes(v.road);
        if (lanes) {
          let i = 0;
          for (let j = 1; j < lanes.length; j++) if (Math.abs(lanes[j] - v.lane) < Math.abs(lanes[i] - v.lane)) i = j;
          const to = lanes[i + (Math.random() < 0.5 ? -1 : 1)] ?? lanes[i - 1] ?? lanes[i + 1];
          if (to != null && Math.abs(to - v.lane) > 1 && v.speed > 3 && this._laneFree(v, to)) {
            v.laneTo = to;
            v.laneSig = 1.4;
          }
        }
      }
    } else v.laneTo = null;
    // Across to the lane (or out round a parked car) only as it rolls on — at most SIDE.ratio m across a
    // metre along — never a slide from a standstill: its nose stays within a few degrees of the lane's way,
    // and one that has to stop stands straight.
    const aim = dodge ? (dodge.side > 0 ? Math.min(v.lane, dodge.lat) : Math.max(v.lane, dodge.lat)) : v.lane;
    v.lat ??= v.lane;
    // (where it was on its way, put back if this frame's move would end in another vehicle)
    const was = { road: v.road, at: v.at, turn: v.turn && { ...v.turn }, next: v.next, noNext: v.noNext, lane: v.lane, lat: v.lat, top: v.top, turnSig: v.turnSig, turnSide: v.turnSide, deadEnd: v.deadEnd };
    const off = aim - v.lat;
    const across = Math.sign(off) * Math.min(Math.abs(off), Math.min(SIDE.max, SIDE.ratio * v.speed) * dt);
    if (across && !this._sideBumps(v, across)) v.lat += across;
    if (Math.abs(off) > 0.3 && !(v.next && left < 40)) v.signal = off > 0 ? 'right' : 'left';
    let step = v.speed * dt;
    // (never into another vehicle: if this step would run into one in front, it stops short instead — never
    // through it, however long it waits: two stood nose to side used to creep on through each other, a
    // crash in the road. One stuck for good is taken off once out of sight: update, STUCK.)
    if (step > 0 && this._bumps(v, step)) {
      step = 0;
      v.speed = 0;
    }
    // (stuck: standing with nothing that will move it on — not at a red light or in the queue behind one,
    // unless that wait has gone on far too long)
    if (v.speed >= 0.3) v.stuckT = v.waitT = 0;
    else {
      v.waitT = v.waitWhy ? (v.waitT ?? 0) + dt : 0;
      if (!v.waitWhy || v.waitT > WAIT_MAX) v.stuckT = (v.stuckT ?? 0) + dt;
    }
    let q;
    if (v.turn) {
      // round the corner on its arc
      v.turn.u = Math.min(v.turn.len, v.turn.u + step);
      q = arcAt(v.turn, v.turn.u);
      if (v.turn.u >= v.turn.len) v.turn = null;
    } else if (!v.jWhy && ((v.next && left - step <= turnIn(v.next.bend)) || (v.noNext && left - step <= 1.5))) {
      // (not while held at a junction's line: the turn starts once it may go)
      // into the turn a few metres before the end of the road
      this._nextRoad(v);
      q = v.turn ? arcAt(v.turn, Math.min(step, v.turn.len)) : laneAt(v.road.pts, v.at, v.lat);
      if (v.turn) v.turn.u = Math.min(step, v.turn.len);
    } else {
      const next = follow(v.road.pts, v.at, step);
      v.at = next;
      if (next.end) this._nextRoad(v);
      q = v.turn ? arcAt(v.turn, 0) : laneAt(v.road.pts, v.at, v.lat);
    }
    // Its nose the way it is moving (no sliding sideways): turned toward its own track, smoothly — however
    // little it moved this frame. (It used to turn only on a step over 2 cm: at 120 fps anything under
    // 2.4 m/s — creeping in a queue, round a dead end's U-turn — kept its old heading, and drove on
    // sideways or backwards.)
    const mx = q.x - b.x;
    const mz = q.z - b.z;
    const moved = Math.hypot(mx, mz);
    // (within a tenth of a second, and — fast round a hairpin — within 0.8 m of its own motion)
    // (never more than a steer's angle off its lane's way: a creep across it is no reason to face across the road)
    let toward = Math.atan2(-mx, -mz);
    if (!v.turn && q.heading != null) toward = q.heading + Math.max(-MAX_STEER, Math.min(MAX_STEER, turn(q.heading, toward)));
    let heading = b.heading;
    if (moved > 1e-6) heading += turn(b.heading, toward) * (1 - Math.exp(-Math.max(dt * 10, moved / 0.8)));
    else if (!v.turn && q.heading != null) heading += turn(b.heading, q.heading) * Math.min(1, dt * 2);
    // (the last guard on where it really ends up — along its lane's bend, across it, its nose turning, round
    // a corner's arc: the straight step `_bumps` tried isn't all of it. A nose swung back in beside a parked
    // car, two passing at a junction's mouth, ran their corners into each other. Into another: it stays put.)
    if (this._into(v, { x: q.x, z: q.z, heading, halfLength: b.halfLength, halfWidth: b.halfWidth })) {
      Object.assign(v, was);
      v.speed = 0;
    } else {
      b.heading = heading;
      b.x = q.x;
      b.z = q.z;
    }
    v.v = v.speed;
    this._place(v, dt);
  }

  /**
   * Would this vehicle at `next` ({ x, z, heading, halfLength, halfWidth }) be in another one — moving,
   * parked, coming the other way — touching one it was clear of, or deeper into one it already touches?
   */
  _into(v, next) {
    const b = v.box;
    for (const o of this.vehicles) {
      if (o === v || Math.abs(o.box.x - next.x) > 15 || Math.abs(o.box.z - next.z) > 15) continue;
      const now = overlapDepth(next, o.box);
      if (now > 0 && now > overlapDepth(b, o.box) + 1e-4) return true;
    }
    return false;
  }

  /**
   * Would moving `step` m on put this vehicle into another one in front of it (going about its way or
   * standing across it)? The last guard against two in one place, whatever the following and giving way missed.
   */
  _bumps(v, step) {
    const b = v.box;
    const fx = -Math.sin(b.heading);
    const fz = -Math.cos(b.heading);
    const x = b.x + fx * step;
    const z = b.z + fz * step;
    const moved = { x, z, heading: b.heading, halfLength: b.halfLength, halfWidth: b.halfWidth };
    for (const o of this.vehicles) {
      if (o === v) continue;
      const dx = o.box.x - x;
      const dz = o.box.z - z;
      if (dx * dx + dz * dz > 225) continue;
      const al = dx * fx + dz * fz;
      const c = Math.cos(o.box.heading - b.heading);
      // (one coming head on in our lane is the lanes' business, not a wall — never both stuck — unless we
      // are the one out of our lane, out round a parked car: we wait, it comes on; a parked one is a wall)
      if (c < -0.5 && !o.parked && Math.abs((v.lat ?? v.lane) - v.lane) < 0.5) continue;
      // (box to box, a hand's breadth round each, whichever side it is on — a lane bending in toward one
      // parked on the bend, a nose turning as it goes: never into it; one already that close, only away)
      if (overlaps(moved, o.box, -BUMP_ROOM) && !overlaps(b, o.box, -BUMP_ROOM)) return true;
      if (overlaps(moved, o.box) && dx * dx + dz * dz < (o.box.x - b.x) ** 2 + (o.box.z - b.z) ** 2) return true;
      if (al <= 0) continue;
      const ac = Math.abs(c);
      const s = Math.sqrt(Math.max(0, 1 - c * c));
      const reach = ac * o.box.halfLength + s * o.box.halfWidth;
      const wide = s * o.box.halfLength + ac * o.box.halfWidth;
      if (al < b.halfLength + reach + 0.4 && Math.abs(dx * -fz + dz * fx) < b.halfWidth + wide) return true;
    }
    return false;
  }

  /**
   * Would moving this vehicle `by` m to its right (across its lane: out round a parked car, back in again)
   * put it into another one it isn't already touching? Then it stays where it is across the road.
   */
  _sideBumps(v, by) {
    const b = v.box;
    const x = b.x - Math.cos(b.heading) * -by;
    const z = b.z + Math.sin(b.heading) * -by;
    const moved = { x, z, heading: b.heading, halfLength: b.halfLength, halfWidth: b.halfWidth };
    for (const o of this.vehicles) {
      if (o === v || Math.abs(o.box.x - x) > 15 || Math.abs(o.box.z - z) > 15) continue;
      if (overlaps(moved, o.box, -BUMP_ROOM) && !overlaps(b, o.box, -BUMP_ROOM)) return true;
      if (overlaps(moved, o.box) && (o.box.x - x) ** 2 + (o.box.z - z) ** 2 < (o.box.x - b.x) ** 2 + (o.box.z - b.z) ** 2) return true;
    }
    return false;
  }

  /**
   * Is the lane at `to` clear for this vehicle to move into for the whole move — nobody there beside it,
   * nobody ahead it would close on, nobody coming up behind it would cut in front of — and no rider near?
   */
  _laneFree(v, to) {
    const b = v.box;
    const fx = -Math.sin(b.heading);
    const fz = -Math.cos(b.heading);
    const shift = to - (v.lat ?? v.lane);
    if (this._nearRider(b.x, b.z, 30)) return false;
    // (the move takes Δ/SIDE.ratio m along)
    const span = Math.abs(shift) / SIDE.ratio + b.halfLength;
    return !this.vehicles.some((o) => {
      if (o === v) return false;
      const dx = o.box.x - b.x;
      const dz = o.box.z - b.z;
      const al = dx * fx + dz * fz;
      const behind = 8 + Math.max(0, (o.speed ?? 0) - v.speed) * 2.5;
      return al > -behind - o.box.halfLength && al < span + 8 + o.box.halfLength && Math.abs(dx * -fz + dz * fx - shift) < b.halfWidth + o.box.halfWidth + 0.8;
    });
  }

  /** How far along its lane (its middle to `o`'s) another vehicle is, measured along the lane's way (lfx, lfz). */
  _alongLane(v, o, lfx, lfz) {
    return (o.box.x - v.box.x) * lfx + (o.box.z - v.box.z) * lfz;
  }

  /**
   * Room to go out round a parked car (`cand`: { o, al, lat }) and back in: across into the room beside it,
   * the whole way — nobody coming the other way there before we are past and back (at their pace and ours),
   * nobody going our way there beside or just behind us, no junction before we are back in our lane.
   */
  _roundFree(v, cand, oncoming, ways, lfx, lfz) {
    const b = v.box;
    const ob = cand.o.box;
    const shift = cand.lat - (v.lat ?? v.lane);
    // how far on we are back in: past its front, and the distance to get across and back at SIDE.ratio
    const D = cand.al + ob.halfLength + b.halfLength + 2 + Math.abs(shift) / SIDE.ratio;
    const T = D / Math.max(3, v.speed) + 1.5;
    const clear = (o, from, to) => {
      const dx = o.box.x - b.x;
      const dz = o.box.z - b.z;
      const al = dx * lfx + dz * lfz;
      const sd = dx * -lfz + dz * lfx;
      return !(al > from && al < to && Math.abs(sd - shift) < b.halfWidth + o.box.halfWidth + 0.6);
    };
    for (const o of oncoming) if (!clear(o, -b.halfLength - o.box.halfLength, D + (o.speed ?? 0) * T + 10)) return false;
    for (const o of ways) if (!clear(o, -(6 + (o.speed ?? 0) * 1.5) - o.box.halfLength, D + 4)) return false;
    // (never out round it into a junction)
    if (v.jNear && v.jAhead != null && v.jAhead < D + 6) return false;
    return true;
  }

  /**
   * The junction ahead of a vehicle (Junctions): whether it may go into its box now — on a green (or at one
   * with no lights), its way through clear of everyone going through from another way in, room for it on
   * the road out past the box, and (with no lights) nobody who came to the line before it waiting on a way
   * that crosses its own. Once it may, it holds the box (`jHold`) until it is out the other side. Returns
   * how far its nose is from the junction's line while it must wait there (Infinity when it needn't).
   */
  _junction(v) {
    const J = this.junctions;
    const b = v.box;
    // out of the box it held: let go
    if (v.jHold) {
      const j = v.jHold;
      if (!v.turn && Math.hypot(b.x - j.x, b.z - j.z) > j.r + b.halfLength + 0.5) this._letGo(v);
    }
    v.jNear = false;
    v.jAhead = null;
    v.jWhy = null;
    if (v.turn && !v.jHold) {
      this._unwait(v);
      return Infinity;
    }
    if (v.turn) return Infinity;
    const a = J.ahead(v.road, sOf(v.road, v.at), v.at.dir, 90, v.jHold);
    if (!a) {
      this._unwait(v);
      return Infinity;
    }
    const j = a.j;
    const nose = a.d - j.r - b.halfLength - 0.3;
    v.jAhead = a.d - j.r;
    v.jNear = nose < 45;
    if (nose > 70) {
      this._unwait(v);
      return Infinity;
    }
    const arm = J.armOf(j, v.road, v.at.dir);
    J.touch(j, arm, false);
    // (already in the box: on through it)
    if (nose < -1.5) {
      this._hold(v, j, this._jPath(v, j, a.d) ?? { pts: [b.x, b.z], hw: b.halfWidth, exit: null });
      return Infinity;
    }
    const decide = (v.speed * v.speed) / (2 * FOLLOW.brake) + 5;
    // (far off: only the lights matter — the box is looked at as it comes up to it)
    let why = J.green(j, arm) ? null : 'signal';
    // (on an amber it couldn't stop for: through)
    if (why && nose < (v.speed * v.speed) / (2 * 6) && j.sig?.state === 'clear' && j.sig.t < 0.6) why = null;
    let path = null;
    if (!why && nose < decide) {
      path = this._jPath(v, j, a.d);
      if (!path) why = 'box';
      else why = this._may(v, j, path);
    }
    if (!why) {
      // (still in the box behind: this one is claimed once out of it)
      if (path && !v.jHold) this._hold(v, j, path);
      else this._unwait(v);
      return Infinity;
    }
    // held at the line
    v.jWhy = why;
    if (v.jWait !== j) {
      this._unwait(v);
      v.jWait = j;
      j.waiting.set(v, J.now);
    }
    // (its way through as it waits — kept apart from the way through the box it may still be in)
    v.jNose = nose;
    if (path) v.jWaitPath = path;
    v.jWaitRoad = v.road;
    v.jWaitDir = v.at.dir;
    J.touch(j, arm, true);
    return Math.max(0, nose);
  }

  /** May this vehicle go into junction `j`'s box by `path` now? null if so, else why not ('box', 'exit'). */
  _may(v, j, path) {
    const J = this.junctions;
    const same = (o) => o.jRoad === v.road && o.jDir === v.at.dir;
    for (const h of j.holders) {
      if (h === v || same(h) || !h.jPath) continue;
      if (pathsMeet(path, h.jPath)) return 'box';
    }
    // (no lights: whoever came to the line first, on a way that crosses ours, goes first)
    if (!j.sig) {
      const mine = j.waiting.get(v) ?? J.now;
      for (const [w, since] of j.waiting) {
        if (w === v) continue;
        if (w.jWait !== j || !this.vehicles.includes(w)) {
          j.waiting.delete(w);
          continue;
        }
        if ((w.jWaitRoad === v.road && w.jWaitDir === v.at.dir) || since > mine - 0.3 || w.jWhy === 'exit' || (w.jNose ?? 99) > 4 || !w.jWaitPath) continue;
        if (pathsMeet(path, w.jWaitPath)) return 'box';
      }
    }
    // Room on the road out past the box: never in it with nowhere to go (blocking the box).
    const X = path.exit;
    if (X) {
      const b = v.box;
      const fx = -Math.sin(X.heading);
      const fz = -Math.cos(X.heading);
      for (const o of this.vehicles) {
        if (o === v || Math.abs(o.box.x - X.x) > 25 || Math.abs(o.box.z - X.z) > 25) continue;
        if (Math.cos(o.box.heading - X.heading) < 0.5 || (!o.parked && (o.speed ?? 0) > 2.5)) continue;
        const dx = o.box.x - X.x;
        const dz = o.box.z - X.z;
        const al = dx * fx + dz * fz;
        if (al > -o.box.halfLength - 1 && al < 2 * b.halfLength + 3 + o.box.halfLength && Math.abs(dx * -fz + dz * fx) < o.box.halfWidth + b.halfWidth + 0.2) return 'exit';
      }
    }
    return null;
  }

  /**
   * A vehicle's way through junction `j` (its middle `d` m on): a curve from where its lane meets the box
   * to where it leaves it — on along this road, or onto the road it turns into at this one's end. Sampled
   * every metre and a half: { pts, hw, exit: { x, z, heading } } (at a road's end with no road on, along its line).
   */
  _jPath(v, j, d) {
    const r = v.road;
    const len = sOf(r, { i: r.pts.length / 2 - 2, t: 1 });
    const sj = this.junctions.sOn(j, r);
    const atEnd = sj != null && Math.abs(sj - (v.at.dir > 0 ? len : 0)) < 1;
    const lane = v.lane;
    const E = laneAt(r.pts, follow(r.pts, v.at, Math.max(0, d - j.r)), lane);
    let X;
    if (atEnd && !v.next && !v.noNext) {
      v.next = this._pickNext(v);
      v.noNext = !v.next;
    }
    if (atEnd && v.next) {
      const o = v.next;
      const s0 = sOf(o.r, o.at);
      const s2 = this.junctions.sOn(j, o.r) ?? s0;
      X = laneAt(o.r.pts, follow(o.r.pts, o.at, Math.abs(s2 - s0) + j.r), this._lane(o.r, v.kind));
    } else X = laneAt(r.pts, follow(r.pts, v.at, Math.max(0, d) + j.r), lane);
    const tr = arc(E.x, E.z, E.heading, X.x, X.z, X.heading);
    const n = Math.max(2, Math.ceil(tr.len / 1.5));
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const q = arcAt(tr, (tr.len * k) / n);
      pts.push(q.x, q.z);
    }
    return { pts, hw: v.box.halfWidth, exit: X };
  }

  /** Into junction `j`'s box by `path`: held till out the other side. */
  _hold(v, j, path) {
    this._unwait(v);
    if (v.jHold && v.jHold !== j) this._letGo(v);
    v.jHold = j;
    v.jPath = path;
    v.jRoad = v.road;
    v.jDir = v.at.dir;
    j.holders.add(v);
  }

  _letGo(v) {
    v.jHold?.holders.delete(v);
    v.jHold = null;
  }

  _unwait(v) {
    v.jWait?.waiting.delete(v);
    v.jWait = null;
    v.jWaitPath = null;
  }

  /** Is (x, z) in or close by a junction's box (`room` m round it)? */
  _atJunction(x, z, room = 0) {
    for (const j of this.junctions.list) if (Math.abs(j.x - x) < j.r + room && Math.abs(j.z - z) < j.r + room && Math.hypot(j.x - x, j.z - z) < j.r + room) return j;
    return null;
  }

  /** A jam here: something on the road within `r` m standing or crawling (nothing is put down into one). */
  _jamAt(x, z, r = 30) {
    return this.vehicles.some((o) => !o.parked && (o.speed ?? 0) < 2 && Math.abs(o.box.x - x) < r && Math.abs(o.box.z - z) < r);
  }

  _leftOnRoad(v) {
    const pts = v.road.pts;
    const n = pts.length / 2 - 1;
    let d = 0;
    const { i, t, dir } = v.at;
    const seg = (k) => Math.hypot(pts[k * 2 + 2] - pts[k * 2], pts[k * 2 + 3] - pts[k * 2 + 1]);
    if (dir > 0) {
      d += seg(i) * (1 - t);
      for (let k = i + 1; k < n && d < 60; k++) d += seg(k);
    } else {
      d += seg(i) * t;
      for (let k = i - 1; k >= 0 && d < 60; k--) d += seg(k);
    }
    return d;
  }

  /** The roads that meet this one's end, and which one to take (how much it bends: + left). */
  _pickNext(v) {
    const pts = v.road.pts;
    const n = pts.length / 2 - 1;
    const endX = v.at.dir > 0 ? pts[n * 2] : pts[0];
    const endZ = v.at.dir > 0 ? pts[n * 2 + 1] : pts[1];
    const inHd = v.at.dir > 0 ? Math.atan2(-(pts[n * 2] - pts[n * 2 - 2]), -(pts[n * 2 + 1] - pts[n * 2 - 1])) : Math.atan2(-(pts[0] - pts[2]), -(pts[1] - pts[3]));
    // (the roads whose ends are within 10 m of this one's — or, if none, 25 m: the map's roads don't always quite meet)
    let fine = [];
    for (const reach of [10, 25]) {
      const options = [];
      for (const r of this._roads(endX, endZ, v.kind)) {
        if (r === v.road) continue;
        const m = r.pts.length / 2 - 1;
        if (Math.hypot(r.pts[0] - endX, r.pts[1] - endZ) < reach) options.push({ r, at: { i: 0, t: 0, dir: 1 }, hd: Math.atan2(-(r.pts[2] - r.pts[0]), -(r.pts[3] - r.pts[1])) });
        if (!r.oneway && Math.hypot(r.pts[m * 2] - endX, r.pts[m * 2 + 1] - endZ) < reach) options.push({ r, at: { i: m - 1, t: 1, dir: -1 }, hd: Math.atan2(-(r.pts[m * 2 - 2] - r.pts[m * 2]), -(r.pts[m * 2 - 1] - r.pts[m * 2 + 1])) });
      }
      // Never straight back the way it came.
      fine = options.filter((o) => Math.abs(turn(inHd, o.hd)) < 2.6);
      if (fine.length) break;
    }
    if (!fine.length) return null;
    const o = fine[Math.floor(Math.random() * fine.length)];
    return { ...o, bend: turn(inHd, o.hd) };
  }

  /**
   * Onto the next road at the end of this one: round the corner on a smooth arc (`turn`) from where it is
   * in its lane, heading the way it was, to its lane a few metres into the new road, heading along it — never
   * a jump across the junction, never its nose swung round on the spot. At a dead end (no road on): it
   * turns round in the road (on a one-way street's, it goes once out of sight).
   */
  _nextRoad(v) {
    const o = v.next ?? this._pickNext(v);
    v.next = null;
    v.noNext = false;
    v.laneTo = null;
    if (!o) {
      // a dead end: round in the road to the other side, as drivers do (back up a one-way street: it goes
      // once out of sight)
      if (v.road.oneway) v.deadEnd = true;
      const from = laneAt(v.road.pts, v.at, v.lat ?? v.lane);
      const ex = v.box.x;
      const ez = v.box.z;
      // (round in a half circle across the road — its handles two thirds of the way across: the old
      // tight teardrop, out and 3 m back, swung the nose round faster than it could follow)
      v.at = follow(v.road.pts, { ...v.at, dir: -v.at.dir }, 0.5);
      v.lane = v.lat = this._lane(v.road, v.kind);
      const to = laneAt(v.road.pts, v.at, v.lat);
      v.turn = arc(ex, ez, from.heading, to.x, to.z, to.heading, 0.66);
      v.turn.slow = 3;
      v.turnSig = 3;
      v.turnSide = 'left';
      return;
    }
    if (Math.abs(o.bend) > 0.4) {
      v.turnSig = 3;
      v.turnSide = o.bend > 0 ? 'left' : 'right';
    }
    // where it is and which way it goes now (the end of its lane on this road)…
    const from = laneAt(v.road.pts, v.at, v.lat ?? v.lane);
    const ex = v.box.x;
    const ez = v.box.z;
    v.road = o.r;
    v.at = o.at;
    v.lane = v.lat = this._lane(o.r, v.kind);
    // …and where it comes out on the new road's lane, a few metres in (further if it is already some way
    // along it, as on a right turn from the outer lane)
    const p0 = laneAt(v.road.pts, v.at, 0);
    const on = (ex - p0.x) * -Math.sin(p0.heading) + (ez - p0.z) * -Math.cos(p0.heading);
    v.at = follow(v.road.pts, v.at, Math.max(0, Math.min(on, 12)) + turnIn(o.bend));
    const to = laneAt(v.road.pts, v.at, v.lat);
    v.turn = arc(ex, ez, from.heading, to.x, to.z, to.heading);
    v.top = (SPEEDS[Math.min(5, o.r.cls)] ?? 8) * (v.kind === 'scooter' ? 1.05 : v.kind === 'bus' ? 0.85 : 1) * (0.85 + Math.random() * 0.3);
    v.missed.clear();
  }

  /**
   * Stand a vehicle on the road under its own wheels (`sitOn`): nose up or down the hill and tipped
   * across a cambered road, its lowest tyre on the surface and none sunk into it — the four tyres
   * sampled every frame near the camera (SIT.near m), every few frames further off, a parked one now
   * and then (PARK_RESIT). Smoothed only in what a step adds over the hill (a seam, a kerb): up a hill the
   * wheels never lag above or below the road.
   */
  _place(v, dt) {
    const b = v.box;
    v.group.position.x = b.x;
    v.group.position.z = b.z;
    v.group.rotation.order = 'YXZ';
    v.group.rotation.y = b.heading;
    if (v.view) v.view.wheels((v.speed * dt) / (v.view.size.wheel || 0.33));
    if (v.parked && v.sat) {
      // (sat again now and then: one put down before the road under it was laid — its land still coming
      // in, far off — sat on the bare ground, its wheels a metre into the road drawn over it later)
      v.parkT = (v.parkT ?? Math.floor(Math.random() * PARK_RESIT)) + 1;
      if (v.parkT < PARK_RESIT) return;
      v.parkT = 0;
      v.sat = false;
    }
    const cam = this._cam ?? this.g.camera?.position;
    const d = cam ? Math.hypot(b.x - cam.x, b.z - cam.z) : 0;
    const near = d < SIT.near;
    // (measured from the street's level under it — level across, smooth along: roadLevel.js — or the land)
    const ground = this.g.baseAt?.(b.x, b.z, v.y) ?? this.g.groundAt?.(b.x, b.z) ?? 0;
    // (far off, every SIT.every frames: it can't be seen to the centimetre there — between, at the same
    // height over the street's level, which the road follows)
    v.sitT = (v.sitT ?? 0) + 1;
    if (dt && !near && v.sat && v.sitT < SIT.every) {
      v.y = ground + v.over;
      v.group.position.y = v.y;
      return;
    }
    const ax = v.axles ?? (v.axles = v.view?.axles ?? { front: -b.halfLength * 0.66, rear: b.halfLength * 0.66, track: v.kind === 'scooter' ? 0 : b.halfWidth * 0.8 });
    const at = sitOn((x, z, from) => this.g.surfaceAt(x, z, from), b.x, b.z, b.heading, ax, v.sat ? v.y + 1 : Infinity, ax.track > 0);
    const step = dt * Math.max(1, v.sitT);
    v.sitT = 0;
    if (!v.sat || !dt) {
      v.over = at.y - ground;
      v.pitch = at.pitch;
      v.bank = at.roll;
    } else {
      // the height over the ground (a road's own rise is the ground's: followed exactly; a seam, a kerb, eased)
      const dy = at.y - ground - v.over;
      v.over += Math.abs(dy) > 0.6 ? dy : dy * (1 - Math.exp(-step * (dy > 0 ? 30 : 14)));
      const k = 1 - Math.exp(-step * 14);
      v.pitch += (at.pitch - v.pitch) * k;
      v.bank += (at.roll - v.bank) * k;
    }
    v.sat = true;
    v.y = ground + v.over;
    v.group.position.y = v.y;
    v.group.rotation.x = v.pitch;
    v.group.rotation.z = v.bank;
  }

  /** Everything within `r` metres of a point. */
  near(x, z, r) {
    return this.vehicles.filter((v) => Math.abs(v.box.x - x) < r && Math.abs(v.box.z - z) < r);
  }

  /** An air horn: cars ahead in the cone stop a few seconds; scooters pull over to the kerb. */
  airHorn(x, z, heading, range) {
    const fx = -Math.sin(heading);
    const fz = -Math.cos(heading);
    for (const v of this.vehicles) {
      const dx = v.box.x - x;
      const dz = v.box.z - z;
      const d = Math.hypot(dx, dz);
      if (d > range || (dx * fx + dz * fz) / (d || 1) < 0.3) continue;
      v.stopFor = v.kind === 'scooter' ? 1.5 : 3;
      if (v.kind === 'scooter') v.lane = Math.max(v.lane, v.road.width / 2 + 0.6);
    }
  }

  /** A bike's bell behind them: delivery scooters just ahead in its line ease over to the kerb. */
  bell(x, z, heading, range) {
    const fx = -Math.sin(heading);
    const fz = -Math.cos(heading);
    for (const v of this.vehicles) {
      // (one going the rider's way, rung at from behind: one coming at them doesn't move over for it, and
      // one parked at the kerb has nowhere to go)
      if (v.kind !== 'scooter' || v.parked || Math.cos(v.box.heading - heading) < 0.5) continue;
      const dx = v.box.x - x;
      const dz = v.box.z - z;
      const along = dx * fx + dz * fz;
      if (along < 0 || along > range || Math.abs(dx * -fz + dz * fx) > 2.5) continue;
      v.lane = Math.max(v.lane, v.road.width / 2 - 0.35);
    }
  }

  _remove(v) {
    for (const s of this.spots ?? []) if (s.v === v) s.v = null;
    this._letGo(v);
    this._unwait(v);
    this._dropRider(v);
    this.group.remove(v.group);
    const i = this.vehicles.indexOf(v);
    if (i >= 0) this.vehicles.splice(i, 1);
  }

  dispose() {
    for (const v of this.vehicles) this._dropRider(v);
    this.g.scene.remove(this.group);
    this.vehicles = [];
  }
}
