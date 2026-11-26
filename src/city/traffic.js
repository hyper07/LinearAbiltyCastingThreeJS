import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeVehicle, pickKind } from './vehicles.js';
import { loadFleet, makeFleetVehicle, pickFleetKind } from './fleet.js';
import { follow, pointOn } from './drive.js';
import { isSmall, LEVELS } from './course.js';
import { cornerZones } from './golmok.js';
import { takeRider, releaseRider } from './folk.js';

/**
 * The traffic a bike race rides through: cars, city buses and delivery
 * scooters on Seoul's real roads round the racers, each on its own side,
 * turning at the junctions onto whatever road meets theirs (so they cross
 * the course), slowing for whatever is ahead in their lane, blinking before
 * they turn, honking when held up. Scooters also take the small streets.
 *
 * They don't get out of the riders' way: coming the other way or across, a
 * vehicle holds its lane and its speed — no swerving, no braking, no waiting
 * at a junction for the race — and the rider has to dodge it. The only rider
 * a driver brakes for is one going its way in front of it in its lane (it
 * follows, as it follows a car) or one standing still there (held by the
 * police, stuck in a jam).
 *
 * Nothing pops in or out in view (FADE): a vehicle is put down out of sight
 * where it can be — round a corner, behind a building, behind the camera, in
 * the fog — and one that has to appear (or go) in plain view fades over half a
 * second; past FADE.far from the camera it fades out, and back in nearer.
 *
 * The cars, the one-tonne trucks and the buses are real models (fleet.js:
 * Sketchfab, CC BY 4.0) once they have loaded; until then, and for anything
 * that didn't load, the built ones (vehicles.js).
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
const SIZE = { scooter: [0.9, 0.36] };
/** A free model (polyfork.dev, CC BY 4.0): the delivery moped. */
const POLY = { scooter: './library/polyfork/delivery-moped-1aa2ce.glb' };
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/**
 * Coming and going in view: a fade of `time` seconds; drawn out to `far` m from the camera (faded out past
 * it, back in inside `back`) — never a vehicle, a rider or a lamp appearing or vanishing in a frame.
 */
export const FADE = { time: 0.5, far: 280, back: 262 };

/** An alpha `a` a frame on toward `want`: at once where nobody can see it, else over FADE.time. */
export function fadeStep(a, want, dt, seen) {
  if (!seen) return want;
  const k = dt / FADE.time;
  return want > a ? Math.min(want, a + k) : Math.max(want, a - k);
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

/** The meshes of a vehicle (or of a rider), not counting a scooter's rider sat on it (that fades by itself). */
function meshesOf(obj, out = [], root = true) {
  if (!root && obj.userData?.rider) return out;
  if (obj.isMesh && obj.material) out.push(obj);
  for (const c of obj.children) meshesOf(c, out, false);
  return out;
}

/**
 * An object drawn at `a` (0–1) of itself: while it fades its meshes wear see-through copies of their
 * materials (and cast no shadow until they are mostly there); at 1 the shared materials go back on.
 */
function setAlpha(obj, a) {
  let list = obj.userData.fade;
  if (a >= 1) {
    if (!list) return;
    for (const f of list) {
      if (f.mesh.material === f.clone) f.mesh.material = f.orig;
      f.mesh.castShadow = f.shadow;
      for (const c of [f.clone].flat()) c.dispose();
    }
    obj.userData.fade = null;
    return;
  }
  if (!list) {
    const copy = (m) => {
      const c = m.clone();
      // (a painted body's own shader tweak goes with it)
      c.onBeforeCompile = m.onBeforeCompile;
      c.customProgramCacheKey = m.customProgramCacheKey;
      c.transparent = true;
      c.userData = { ...c.userData, base: m.opacity };
      return c;
    };
    list = obj.userData.fade = meshesOf(obj).map((mesh) => {
      const orig = mesh.material;
      const clone = Array.isArray(orig) ? orig.map(copy) : copy(orig);
      mesh.material = clone;
      return { mesh, orig, clone, shadow: mesh.castShadow };
    });
  }
  for (const f of list) {
    for (const c of [f.clone].flat()) c.opacity = c.userData.base * a;
    f.mesh.castShadow = f.shadow && a > 0.6;
  }
}

const loader = new GLTFLoader();
const models = {};
function loadModel(kind) {
  models[kind] ??= loader.loadAsync(POLY[kind]).then((g) => {
    // To size, the front to −z, sitting on the ground.
    const root = g.scene;
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const long = Math.max(size.x, size.z);
    const want = kind === 'bus' ? 11 : 1.85;
    const holder = new THREE.Group();
    holder.add(root);
    root.scale.multiplyScalar(want / long);
    if (size.x > size.z) root.rotation.y = Math.PI / 2;
    holder.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(holder);
    root.position.y -= b2.min.y;
    root.position.x -= (b2.min.x + b2.max.x) / 2;
    root.position.z -= (b2.min.z + b2.max.z) / 2;
    holder.traverse((o) => o.isMesh && (o.castShadow = true));
    return holder;
  }).catch(() => null);
  return models[kind];
}

/** A stand-in bus or scooter, built here, while (or if) the model isn't there. */
function plainModel(kind, color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1d242c', roughness: 0.1, metalness: 0.4 });
  if (kind === 'bus') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.7, 11), paint);
    body.position.y = 1.65;
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.9, 10.2), glass);
    win.position.y = 2.2;
    g.add(body, win);
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 1.6), paint);
    body.position.y = 0.55;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: '#d8402a' }));
    box.position.set(0, 1.05, 0.5);
    g.add(body, box);
  }
  return g;
}

export class RaceTraffic {
  /** @param {any} game the SeoulGame @param {any} race the Race */
  constructor(game, race) {
    this.g = game;
    this.race = race;
    this.vehicles = [];
    /** vehicles gone from the street, fading out where they can be seen (no longer hit or counted) */
    this.leaving = [];
    this._frustum = new THREE.Frustum();
    this._pv = new THREE.Matrix4();
    this._ball = new THREE.Sphere();
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this._spawnT = 0;
    this._onT = 0;
    this._alT = 0;
    const level = race.course?.def?.level ?? 'easy';
    this.level = LEVELS[level] ?? LEVELS.easy;
    // (the residential lanes the course takes: delivery scooters on them, coming the other way too — and on
    // Hard, cars too, on the lanes wide enough for one and a rider beside it)
    this.carsOnLanes = Boolean(this.level.dense);
    loadModel('scooter').then((m) => (this.scooterModel = m));
    loadFleet();
    this._parkSpots();
    this._glow();
  }

  /** Roads a vehicle of a kind may drive: cars and buses the main roads, scooters also the small streets. */
  _roads(x, z, kind) {
    // (never down a short cut's golmok: it is kept clear to race down)
    const keep = this.race.scRoads;
    const carMax = this.carsOnLanes ? 5 : 4;
    return (this.g.roadsNear?.(x, z, 1) ?? []).filter((r) => r.pts.length >= 4 && r.cls >= 1 && (kind === 'scooter' ? r.cls <= 6 && r.cls !== 7 : r.cls <= carMax && (r.cls < 5 || r.width >= 5.5)) && !(kind === 'bus' && r.cls > 3) && !keep?.has(r));
  }

  _make(kind) {
    const group = new THREE.Group();
    let view = null;
    let size;
    if (kind === 'scooter') {
      const body = this.scooterModel ? this.scooterModel.clone(true) : plainModel('scooter', ['#e9e9e6', '#c8322b', '#2a2c31', '#1f5bb5'][Math.floor(Math.random() * 4)]);
      // (the moped model is built facing +z: turned to face the way it goes, bars and basket in front, its box behind)
      if (this.scooterModel) body.rotation.y = Math.PI;
      group.add(body);
      // (its rider — a real person, sat — comes on as it nears you: see update)
      size = SIZE.scooter;
    } else {
      // a real model when it's in; else one of ours
      view = kind === 'bus' ? makeFleetVehicle('bus') : makeFleetVehicle(pickFleetKind() ?? '');
      view ??= makeVehicle(kind === 'bus' ? 'bus' : pickKind());
      group.add(view.group);
      size = [view.size.length / 2, view.size.width / 2 - 0.05];
    }
    this.group.add(group);
    return { group, view, kind, size, model: view?.model ?? kind };
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
      const q = pointOn(r.pts, at, lane);
      const dx = q.x - anchor.x;
      const dz = q.z - anchor.z;
      const d = Math.hypot(dx, dz);
      // Not on top of anyone; out ahead where it can be seen coming (far enough not to pop up in view at
      // 70 km/h), a few behind.
      const ahead = (dx * fx + dz * fz) / d;
      if (d < (anchor.me ? (ahead > 0.3 ? 95 : 45) : 30) || d > 230) continue;
      if (ahead < -0.4 && Math.random() < 0.85) continue;
      if (this._nearRider(q.x, q.z) || this.vehicles.some((v) => Math.hypot(v.box.x - q.x, v.box.z - q.z) < 9)) continue;
      if (this.g.buildingAt?.(q.x, q.z) || this.race.keepClear?.(q.x, q.z)) continue;
      // (out of sight if it can be: round a corner, behind a building or the camera, in the fog — the
      // last few tries take a place in view, and it fades in there)
      if (tries < 12 && this._seen(q.x, this.g.surfaceAt(q.x, q.z), q.z, 4, true)) continue;
      const made = this._make(kind);
      const top = (SPEEDS[Math.min(5, r.cls)] ?? 8) * (kind === 'scooter' ? 1.05 : kind === 'bus' ? 0.85 : 1) * (0.85 + Math.random() * 0.3);
      const [halfLength, halfWidth] = made.size;
      const v = { ...made, road: r, at, lane, top, speed: top * 0.8, v: top * 0.8, y: this.g.surfaceAt(q.x, q.z), box: { x: q.x, z: q.z, heading: q.heading, halfLength, halfWidth }, missed: new Set(), stopFor: 0, waited: 0, roll: 0 };
      this._born(v);
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
    const me = anchors.find((a) => a.me) ?? anchors[0];
    // Far from every racer here: gone (out of sight at once, in view fading out).
    for (const v of [...this.vehicles]) {
      if (v.parked) continue;
      const near = Math.min(...anchors.map((a) => Math.hypot(a.x - v.box.x, a.z - v.box.z)));
      // (one that came at you and has gone by: gone, and another sent up the road ahead)
      // (and one going your way, sent up the course ahead, that you have passed)
      const behind = (v.oncoming || v.along) && (v.box.x - me.x) * -Math.sin(me.heading) + (v.box.z - me.z) * -Math.cos(me.heading) < -45;
      if (near > 300 || behind) this._retire(v);
    }
    // Too few: more, a few a second, round the racers (most round you).
    this._spawnT -= dt;
    if (this._spawnT <= 0) {
      this._spawnT = 0.12;
      const count = { car: 0, bus: 0, scooter: 0 };
      for (const v of this.vehicles) if (!v.oncoming && !v.along && !v.parked) count[v.kind]++;
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
      const on = this.vehicles.filter((v) => v.oncoming).length;
      if (on < this.level.oncoming) this._spawnOncoming(me);
    }
    // …and going your way up the course ahead, in the riders' lanes: slower traffic to weave past.
    this._alT -= dt;
    if (this._alT <= 0) {
      this._alT = 0.1;
      const al = this.vehicles.filter((v) => v.along).length;
      if (al < (this.level.along ?? 0)) this._spawnOncoming(me, true);
    }
    this._parked(anchors);
    const night = this.g.uniforms?.uNight?.value ?? 0;
    this.blink = (this.blink ?? 0) + dt;
    const on = this.blink % 0.8 < 0.4;
    for (const v of [...this.vehicles]) {
      if (v.parked) {
        v.braking = false;
        this._place(v, 0);
      } else this._drive(v, dt);
      // (a short cut's golmok is kept clear to race down: one that strays into its mouth goes back to its
      // lane, and one far from you is gone — out of sight at once, else fading)
      if (!v.parked && this.race.keepClear?.(v.box.x, v.box.z)) {
        v.lane = this._lane(v.road, v.kind);
        if (Math.hypot(v.box.x - me.x, v.box.z - me.z) > 40) {
          this._retire(v);
          continue;
        }
      }
      // (one sent up the course that has turned off it: just traffic now, and another sent in its place)
      if ((v.along || v.oncoming) && (v.ciT = (v.ciT ?? 0.5) - dt) <= 0) {
        v.ciT = 0.5;
        if (!this._onCourse(v)) v.along = v.oncoming = false;
      }
      // (headlights on in the rain too)
      v.view?.lights(Math.max(night, (this.g.weather?.level.wet ?? 0) > 0.3 ? 0.5 : 0, (this.g.weather?.level.thick ?? 0) * 0.8), v.braking);
      const d = Math.hypot(v.box.x - me.x, v.box.z - me.z);
      v.view?.near(d < 90);
      this._fade(v, dt);
      v.view?.indicate(v.hazard ? 'both' : v.signal, on);
    }
    // Gone from the street, still fading out where they can be seen: driving on meanwhile, nothing to hit.
    for (const v of [...this.leaving]) {
      if (v.parked) this._place(v, 0);
      else this._drive(v, dt);
      this._fade(v, dt);
      if (v.alpha <= 0) this._remove(v);
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
    const f = this.g.scene?.fog;
    // (past nine tenths of the way through the fog, a car is gone into it)
    this._fogFar = f?.isFog ? f.near + (f.far - f.near) * 0.9 : Infinity;
  }

  /**
   * Could the camera see something at (x, y, z) about `r` m round: in its view, inside the fog — and with
   * `sight`, not behind the buildings and walls along the course either (a line across the ground to it).
   */
  _seen(x, y, z, r = 3, sight = false) {
    const cam = this._cam;
    if (!cam) return true;
    const dx = x - cam.x;
    const dz = z - cam.z;
    const d = Math.hypot(dx, dz);
    if (d - r > this._fogFar) return false;
    this._ball.center.set(x, y + 1, z);
    this._ball.radius = r;
    if (!this._frustum.intersectsSphere(this._ball)) return false;
    const walls = sight ? this.race.course?.walls : null;
    if (walls && d > r + 2 && walls.ray(cam.x, cam.z, dx / d, dz / d, d) < d - r - 1) return false;
    return true;
  }

  /** A vehicle just made: on the street, in place — seen as it is put down, it fades in. */
  _born(v) {
    this.vehicles.push(v);
    this._place(v, 0);
    v.alpha = v.lampA = this._seen(v.box.x, v.y, v.box.z, v.box.halfLength + 1) ? 0 : 1;
    setAlpha(v.group, v.alpha);
    v.group.visible = v.alpha > 0;
  }

  /** Off the street: gone at once out of sight; in view, fading out first (no longer hit or counted). */
  _retire(v) {
    const i = this.vehicles.indexOf(v);
    if (i >= 0) this.vehicles.splice(i, 1);
    for (const s of this.spots ?? []) if (s.v === v) s.v = null;
    v.dying = true;
    if (!this._seen(v.box.x, v.y, v.box.z, v.box.halfLength + 1) || !(v.alpha > 0)) this._remove(v);
    else this.leaving.push(v);
  }

  /**
   * A vehicle's fade this frame: in (just made), out (going, or past FADE.far from the camera) — over
   * FADE.time where the camera can see it, at once where it can't. Its lamps' glows go with it (but not
   * with the distance: lamps are seen far off at night). A delivery scooter's rider comes on near you
   * and goes further off (a real person; far off none is drawn, better than a faceless doll), fading too.
   */
  _fade(v, dt) {
    const cam = this._cam ?? { x: v.box.x, z: v.box.z };
    const d = Math.hypot(v.box.x - cam.x, v.box.z - cam.z);
    if (d > FADE.far) v.farOut = true;
    else if (d < FADE.back) v.farOut = false;
    const seen = this._seen(v.box.x, v.y, v.box.z, v.box.halfLength + 1);
    v.alpha = fadeStep(v.alpha ?? 1, v.dying || v.farOut ? 0 : 1, dt, seen);
    v.lampA = fadeStep(v.lampA ?? 1, v.dying ? 0 : 1, dt, seen);
    setAlpha(v.group, v.alpha);
    v.group.visible = v.alpha > 0.001;
    if (v.kind !== 'scooter' || v.parked) return;
    if (!v.rider && d < 110 && !v.dying) {
      v.rider = takeRider();
      if (v.rider) {
        v.group.add(v.rider);
        v.riderA = seen ? 0 : 1;
      }
    }
    if (!v.rider) return;
    v.riderA = fadeStep(v.riderA ?? 1, d > 140 || v.dying ? 0 : 1, dt, seen);
    if (v.riderA <= 0) this._dropRider(v);
    else setAlpha(v.rider, v.riderA);
  }

  /** A scooter's rider back to the pool, its own materials back on. */
  _dropRider(v) {
    if (!v.rider) return;
    setAlpha(v.rider, 1);
    releaseRider(v.rider);
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
   * their own carriageway: slower than they are, to weave past. Returns whether one was made.
   */
  _spawnOncoming(anchor, along = false) {
    const c = this.race.course;
    if (!c || anchor.idx == null) return false;
    const n = c.points.length;
    const dense = along && this.level.dense;
    const tries0 = dense ? 14 : 8;
    for (let tries = 0; tries < tries0; tries++) {
      // (on Hard anywhere 60–300 m on up the course, by the metre; else 15–44 of its points on)
      const k = dense ? this._ahead(anchor.idx, 60 + Math.random() * 240) : along ? 15 + Math.floor(Math.random() * 30) : 13 + Math.floor(Math.random() * 26);
      const i = c.open ? Math.min(n - 2, anchor.idx + k) : (anchor.idx + k) % n;
      const p = c.points[i];
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
      const at = pointOn(best.r.pts, best.at, lane);
      if (Math.hypot(at.x - anchor.x, at.z - anchor.z) < (dense ? 60 : along ? 85 : 70) || this._nearRider(at.x, at.z)) continue;
      // (room round it: never two abreast, or a car beside one coming the other way — a wall across the road)
      // (a car crossing at a junction is no wall along the road: only kept a car's length off)
      if (dense ? !this._roomFor(at, best.r) : this.vehicles.some((v) => Math.hypot(v.box.x - at.x, v.box.z - at.z) < (Math.abs(Math.cos(v.box.heading - at.heading)) > 0.7 ? (along ? 22 : 12) : 8))) continue;
      if (this.g.buildingAt?.(at.x, at.z) || this.race.keepClear?.(at.x, at.z)) continue;
      // (out of sight if it can be — round the course's next corner, behind a building, in the fog; on a long
      // straight in clear air the later tries take a place in view, and it fades in there)
      if (tries < tries0 * 0.6 && this._seen(at.x, this.g.surfaceAt(at.x, at.z), at.z, 4, true)) continue;
      const made = this._make(kind);
      // (going your way: slower than the riders, some much slower — a truck, a bus, a cautious driver)
      const top = (SPEEDS[Math.min(5, best.r.cls)] ?? 8) * (kind === 'scooter' ? 1.05 : kind === 'bus' ? 0.85 : 1) * (along ? 0.55 + Math.random() * 0.35 : 0.85 + Math.random() * 0.3);
      const [halfLength, halfWidth] = made.size;
      const v = { ...made, road: best.r, at: best.at, lane, top, speed: top * 0.9, v: top * 0.9, y: this.g.surfaceAt(at.x, at.z), box: { x: at.x, z: at.z, heading: at.heading, halfLength, halfWidth }, missed: new Set(), stopFor: 0, waited: 0, roll: 0, oncoming: !along, along, ci: i };
      this._born(v);
      return true;
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
        if (calm[i] || c.wild?.[i]) continue;
        if (kind === 'car' ? p[4] || w < (dense ? 6.5 : 7) || w > 15 : kind === 'scooter' ? p[4] || w < 4.5 || w > 12 : isSmall(p[3] ?? 4) || w < (p[4] ? 7.4 : 12)) continue;
        if ((c.shortcuts ?? []).some((sc) => Math.abs(sc.from - i) < 6 || Math.abs(sc.to - i) < 6)) continue;
        // (a bus's length clear of the next corner too)
        if (kind === 'bus' && calm[(i + 3) % n]) continue;
        const hd = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
        const lat = w / 2 - (kind === 'bus' ? 1.45 : kind === 'scooter' ? 0.6 : 1.15);
        const x = p[0] + Math.cos(hd) * lat;
        const z = p[1] - Math.sin(hd) * lat;
        if (walls?.hits(x, z, kind === 'scooter' ? 0.5 : 1.1) || this.g.buildingAt?.(x, z)) continue;
        // (never two together: a bus stop clear of the parked cars; a parked scooter a little closer)
        if (this.spots.some((s) => Math.hypot(s.x - x, s.z - z) < (kind === 'scooter' || s.kind === 'scooter' ? 16 : 30))) continue;
        last = c.s[i];
        this.spots.push({ i, x, z, heading: hd, k, kind, v: null });
      }
    }
  }

  /** The parked cars near anyone riding: there, and gone again further off. */
  _parked(anchors) {
    for (const s of this.spots) {
      const d = Math.min(...anchors.map((a) => Math.hypot(a.x - s.x, a.z - s.z)));
      // (never put down close to a rider: it would pop up in front of them)
      if (!s.v && d < 220 && d > 45 && !this._nearRider(s.x, s.z)) {
        const made = this._make(s.kind);
        const [halfLength, halfWidth] = made.size;
        // (a bus at its stop blinks to pull out again)
        s.v = { ...made, parked: true, top: 0, speed: 0, v: 0, y: this.g.surfaceAt(s.x, s.z), box: { x: s.x, z: s.z, heading: s.heading, halfLength, halfWidth }, missed: new Set(), stopFor: 0, waited: 0, roll: 0, signal: s.kind === 'bus' ? 'left' : null };
        // (its place is its place: seen, it fades in)
        this._born(s.v);
      } else if (s.v && d > 280) {
        this._retire(s.v);
        s.v = null;
      }
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
    for (const v of [...this.vehicles, ...this.leaving]) {
      if (v.parked) continue;
      // (fading in or out with the vehicle: never a lamp popping on or off in view)
      const la = v.lampA ?? 1;
      if (la <= 0) continue;
      const b = v.box;
      const fx = -Math.sin(b.heading);
      const fz = -Math.cos(b.heading);
      const rx = -fz;
      const rz = fx;
      const y = v.y + (v.kind === 'bus' ? 0.9 : v.kind === 'scooter' ? 0.9 : 0.75);
      const half = v.kind === 'scooter' ? 0 : b.halfWidth - 0.3;
      const front = b.halfLength + 0.05;
      for (const s of v.kind === 'scooter' ? [0] : [-1, 1]) {
        put(b.x + fx * front + rx * half * s, y, b.z + fz * front + rz * half * s, 1, 0.93, 0.78, (v.kind === 'scooter' ? 0.5 : 0.75) * la);
        put(b.x - fx * front + rx * half * s, y + 0.05, b.z - fz * front + rz * half * s, 1, 0.12, 0.08, (v.braking ? 0.65 : 0.4) * la);
      }
    }
    g.geometry.setDrawRange(0, m);
    g.geometry.attributes.position.needsUpdate = true;
    g.geometry.attributes.color.needsUpdate = true;
    g.geometry.attributes.size.needsUpdate = true;
    void me;
  }

  /** Along its road on its own side, slowing for what is ahead, onto the next road at the end (signalling first). */
  _drive(v, dt) {
    const b = v.box;
    const fx = -Math.sin(b.heading);
    const fz = -Math.cos(b.heading);
    let gap = Infinity;
    const look = (x, z, width = 1.6, react = 24) => {
      const dx = x - b.x;
      const dz = z - b.z;
      const along = dx * fx + dz * fz - b.halfLength;
      const side = Math.abs(dx * -fz + dz * fx);
      if (along > -0.5 && along < react && side < b.halfWidth + width * 0.5) gap = Math.min(gap, along);
    };
    // A car parked at the kerb (a bus at its stop) ahead in our lane: pull out round it, not stand behind it.
    let dodge = null;
    for (const o of this.vehicles) {
      if (o === v) continue;
      look(o.box.x, o.box.z, o.box.halfWidth * 2);
      if (!o.parked || Math.abs(Math.cos(o.box.heading - b.heading)) < 0.8) continue;
      const dx = o.box.x - b.x;
      const dz = o.box.z - b.z;
      const al = dx * fx + dz * fz;
      const sd = dx * -fz + dz * fx;
      const room = b.halfWidth + o.box.halfWidth + 0.5;
      if (al < -o.box.halfLength - b.halfLength || al > 30 + o.box.halfLength || Math.abs(sd) > room) continue;
      if (!dodge || al < dodge.al) dodge = { al, lat: (v.lat ?? v.lane) + sd - Math.sign(sd || 1) * room, side: Math.sign(sd || 1) };
    }
    // Riders: no swerving, no braking, no waiting at a junction for them — coming the other way or across,
    // a vehicle holds its lane and its speed, and the rider has to get out of its way. A driver brakes only
    // for one going its way close in front in its lane (following, as it follows a car: a bike is seen
    // late, small and quick) or one standing still there — held by the police, stuck in a jam (brakesFor).
    for (const r of this.race.racers) if (brakesFor(b.heading, r)) look(r.s.x, r.s.z, 0.7, 18);
    for (const p of this.g.life?.near?.(b.x, b.z, 26) ?? []) look(p.x, p.z, 0.6, 14);
    v.stopFor = Math.max(0, v.stopFor - dt);
    let want = gap < Infinity ? v.top * Math.max(0, Math.min(1, (gap - 2.5) / 10)) : v.top;
    if (v.stopFor > 0) want = 0;
    // Slow into the turn at the end of the road.
    const left = this._leftOnRoad(v);
    if (left < 25 && v.next?.bend > 0.5) want = Math.min(want, 4 + left * 0.25);
    v.speed += Math.max(-8 * dt, Math.min(2.6 * dt, want - v.speed));
    v.braking = want < v.speed - 0.4;
    v.hazard = v.stopFor > 0;
    // Held up a while by something in front: a toot of the horn.
    v.waited = v.speed < 0.5 && gap < 8 ? v.waited + dt : 0;
    if (v.waited > 1.6 && v.kind !== 'scooter') {
      v.waited = -5;
      const d = Math.hypot(b.x - this.g.pos.x, b.z - this.g.pos.z);
      if (d < 50) this.g.street?._horn?.(0.4 * (1 - d / 50), v.kind === 'bus' ? 220 : 330);
    }
    // Pick the next road before getting there, and signal which way.
    if (!v.next && left < 40) v.next = this._pickNext(v);
    v.signal = v.next && left < 40 && Math.abs(v.next.bend) > 0.4 ? (v.next.bend > 0 ? 'left' : 'right') : null;
    // Now and then over to another lane (on a road with two or more our way): blinking a moment
    // first, and only into a clear one — never with a rider close by.
    if (v.kind !== 'scooter' && !dodge && left > 30) {
      v.laneT = (v.laneT ?? 2 + Math.random() * 8) - dt;
      if (v.laneTo != null) {
        v.laneSig -= dt;
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
          if (to != null && Math.abs(to - v.lane) > 1 && this._laneFree(v, to)) {
            v.laneTo = to;
            v.laneSig = 1.1;
          }
        }
      }
    } else v.laneTo = null;
    // Across to the lane (or out round a parked car), a bike's width a second or so — never a jump.
    const aim = dodge ? (dodge.side > 0 ? Math.min(v.lane, dodge.lat) : Math.max(v.lane, dodge.lat)) : v.lane;
    v.lat ??= v.lane;
    v.lat += Math.max(-1.4 * dt, Math.min(1.4 * dt, aim - v.lat));
    const to = v.laneTo ?? aim;
    if (Math.abs(to - v.lat) > 0.3) v.signal = to > v.lat ? 'right' : 'left';
    const next = follow(v.road.pts, v.at, v.speed * dt);
    v.at = next;
    if (next.end) this._nextRoad(v);
    const q = pointOn(v.road.pts, v.at, v.lat);
    // (nosed the way it is moving over)
    b.heading += turn(b.heading, q.heading - Math.max(-0.12, Math.min(0.12, (aim - v.lat) * 0.1))) * Math.min(1, dt * 5);
    b.x = q.x;
    b.z = q.z;
    v.v = v.speed;
    this._place(v, dt);
  }

  /** Is the lane at `to` clear for this vehicle to move into: no vehicle beside or just ahead or behind there, no rider near? */
  _laneFree(v, to) {
    const b = v.box;
    const fx = -Math.sin(b.heading);
    const fz = -Math.cos(b.heading);
    const shift = to - (v.lat ?? v.lane);
    if (this._nearRider(b.x, b.z, 30)) return false;
    return !this.vehicles.some((o) => {
      if (o === v) return false;
      const dx = o.box.x - b.x;
      const dz = o.box.z - b.z;
      const al = dx * fx + dz * fz;
      return al > -12 && al < 20 && Math.abs(dx * -fz + dz * fx - shift) < 2.6;
    });
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
    const options = [];
    for (const r of this._roads(endX, endZ, v.kind)) {
      if (r === v.road) continue;
      const m = r.pts.length / 2 - 1;
      if (Math.hypot(r.pts[0] - endX, r.pts[1] - endZ) < 10) options.push({ r, at: { i: 0, t: 0, dir: 1 }, hd: Math.atan2(-(r.pts[2] - r.pts[0]), -(r.pts[3] - r.pts[1])) });
      if (!r.oneway && Math.hypot(r.pts[m * 2] - endX, r.pts[m * 2 + 1] - endZ) < 10) options.push({ r, at: { i: m - 1, t: 1, dir: -1 }, hd: Math.atan2(-(r.pts[m * 2 - 2] - r.pts[m * 2]), -(r.pts[m * 2 - 1] - r.pts[m * 2 + 1])) });
    }
    // Never straight back the way it came.
    const fine = options.filter((o) => Math.abs(turn(inHd, o.hd)) < 2.6);
    if (!fine.length) return null;
    const o = fine[Math.floor(Math.random() * fine.length)];
    return { ...o, bend: turn(inHd, o.hd) };
  }

  _nextRoad(v) {
    const o = v.next ?? this._pickNext(v);
    v.next = null;
    v.laneTo = null;
    if (o) {
      v.road = o.r;
      v.at = o.at;
      // (its place on the new road at once, as it turns in: never sliding across from a wide road's far lane)
      v.lane = v.lat = this._lane(o.r, v.kind);
      v.top = (SPEEDS[Math.min(5, o.r.cls)] ?? 8) * (v.kind === 'scooter' ? 1.05 : v.kind === 'bus' ? 0.85 : 1) * (0.85 + Math.random() * 0.3);
      v.missed.clear();
    } else v.at = { ...v.at, dir: -v.at.dir };
  }

  _place(v, dt) {
    const b = v.box;
    const y = this.g.surfaceAt(b.x, b.z, v.y + 1);
    v.y = dt ? v.y + (y - v.y) * Math.min(1, dt * 10) : y;
    v.group.position.set(b.x, v.y, b.z);
    v.group.rotation.y = b.heading;
    if (v.view) v.view.wheels((v.speed * dt) / (v.view.size.wheel || 0.33));
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
    this._dropRider(v);
    setAlpha(v.group, 1);
    this.group.remove(v.group);
    for (const list of [this.vehicles, this.leaving]) {
      const i = list.indexOf(v);
      if (i >= 0) list.splice(i, 1);
    }
  }

  dispose() {
    for (const v of [...this.vehicles, ...this.leaving]) this._dropRider(v);
    this.g.scene.remove(this.group);
    this.vehicles = [];
    this.leaving = [];
  }
}
