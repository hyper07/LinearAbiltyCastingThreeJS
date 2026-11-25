import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeVehicle, pickKind } from './vehicles.js';
import { loadFleet, makeFleetVehicle, pickFleetKind } from './fleet.js';
import { follow, pointOn } from './drive.js';
import { isSmall } from './course.js';
import { takeRider, releaseRider } from './folk.js';

/**
 * The traffic a bike race rides through: cars, city buses and delivery
 * scooters on Seoul's real roads round the racers, each on its own side,
 * turning at the junctions onto whatever road meets theirs (so they cross
 * the course), slowing for whatever is ahead in their lane — a bike too,
 * if they see it in time — blinking before they turn, honking when held up.
 * Scooters also take the small streets. An air horn (items.js) stops the
 * cars ahead and sends the scooters to the kerb.
 *
 * The cars, the one-tonne trucks and the buses are real models (fleet.js:
 * Sketchfab, CC BY 4.0) once they have loaded; until then, and for anything
 * that didn't load, the built ones (vehicles.js).
 *
 * Each vehicle has a box ({ x, z, heading, halfLength, halfWidth }) for the
 * race to test bikes against (ride.js bikeGap), and a speed v.
 */

const SPEEDS = [0, 14.5, 12.5, 10.5, 8.5, 5.5]; // metres a second by road class (no motorways)
const WANT = { car: 24, bus: 3, scooter: 9 };
const SIZE = { scooter: [0.9, 0.36] };
/** A free model (polyfork.dev, CC BY 4.0): the delivery moped. */
const POLY = { scooter: './library/polyfork/delivery-moped-1aa2ce.glb' };
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

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
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this._spawnT = 0;
    loadModel('scooter').then((m) => (this.scooterModel = m));
    loadFleet();
  }

  /** Roads a vehicle of a kind may drive: cars and buses the main roads, scooters also the small streets. */
  _roads(x, z, kind) {
    // (never down a short cut's golmok: it is kept clear to race down)
    const keep = this.race.scRoads;
    return (this.g.roadsNear?.(x, z, 1) ?? []).filter((r) => r.pts.length >= 4 && r.cls >= 1 && (kind === 'scooter' ? r.cls <= 6 && r.cls !== 7 : r.cls <= 4) && !(kind === 'bus' && r.cls > 3) && !keep?.has(r));
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
    for (let tries = 0; tries < 12; tries++) {
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
      if (ahead < -0.4 && Math.random() < 0.75) continue;
      if (this.vehicles.some((v) => Math.hypot(v.box.x - q.x, v.box.z - q.z) < 9)) continue;
      if (this.g.buildingAt?.(q.x, q.z) || this.race.keepClear?.(q.x, q.z)) continue;
      const made = this._make(kind);
      const top = (SPEEDS[Math.min(5, r.cls)] ?? 8) * (kind === 'scooter' ? 1.05 : kind === 'bus' ? 0.85 : 1) * (0.85 + Math.random() * 0.3);
      const [halfLength, halfWidth] = made.size;
      const v = { ...made, road: r, at, lane, top, speed: top * 0.8, v: top * 0.8, y: this.g.surfaceAt(q.x, q.z), box: { x: q.x, z: q.z, heading: q.heading, halfLength, halfWidth }, missed: new Set(), stopFor: 0, waited: 0, roll: 0 };
      this.vehicles.push(v);
      this._place(v, 0);
      return true;
    }
    return false;
  }

  /** How far right of the road's middle a vehicle drives: its lane (a scooter by the kerb). */
  _lane(r, kind) {
    if (isSmall(r.cls)) return kind === 'scooter' ? Math.max(0, r.width / 2 - 1) : 0;
    const lane = r.oneway ? r.width / 4 : Math.max(1.7, Math.min(4.2, r.width / 4));
    return kind === 'scooter' ? Math.max(lane, r.width / 2 - 1.1) : kind === 'bus' ? Math.max(lane, r.width / 2 - 1.8) : lane;
  }

  update(dt, anchors) {
    if (!anchors.length) return;
    const me = anchors.find((a) => a.me) ?? anchors[0];
    // Far from every racer here: gone.
    for (const v of [...this.vehicles]) {
      const near = Math.min(...anchors.map((a) => Math.hypot(a.x - v.box.x, a.z - v.box.z)));
      if (near > 300) this._remove(v);
    }
    // Too few: more, a few a second, round the racers (most round you).
    this._spawnT -= dt;
    if (this._spawnT <= 0) {
      this._spawnT = 0.12;
      const count = { car: 0, bus: 0, scooter: 0 };
      for (const v of this.vehicles) count[v.kind]++;
      for (const kind of ['car', 'bus', 'scooter']) {
        if (count[kind] < WANT[kind] * (anchors.length > 1 ? 1.2 : 1)) {
          const a = Math.random() < 0.65 ? me : anchors[Math.floor(Math.random() * anchors.length)];
          this._spawn(a, kind);
          break;
        }
      }
    }
    const night = this.g.uniforms?.uNight?.value ?? 0;
    this.blink = (this.blink ?? 0) + dt;
    const on = this.blink % 0.8 < 0.4;
    for (const v of this.vehicles) {
      this._drive(v, dt);
      // (headlights on in the rain too)
      v.view?.lights(Math.max(night, (this.g.weather?.level.wet ?? 0) > 0.3 ? 0.5 : 0), v.braking);
      const d = Math.hypot(v.box.x - me.x, v.box.z - me.z);
      v.view?.near(d < 90);
      // A delivery scooter's rider: a real person near you; far off, none drawn (better than a faceless doll).
      if (v.kind === 'scooter') {
        if (!v.rider && d < 110) {
          v.rider = takeRider();
          if (v.rider) v.group.add(v.rider);
        } else if (v.rider && d > 140) {
          releaseRider(v.rider);
          v.rider = null;
        }
      }
      v.view?.indicate(v.hazard ? 'both' : v.signal, on);
    }
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
    for (const o of this.vehicles) if (o !== v) look(o.box.x, o.box.z, o.box.halfWidth * 2);
    // Bikes: seen late (they are small and quick) — a driver brakes only for one fairly close in front.
    for (const r of this.race.racers) if (!r.left) look(r.s.x, r.s.z, 0.7, 18);
    for (const p of this.g.life?.near?.(b.x, b.z, 26) ?? []) look(p.x, p.z, 0.6, 14);
    v.stopFor = Math.max(0, v.stopFor - dt);
    let want = gap < Infinity ? v.top * Math.max(0, Math.min(1, (gap - 2.5) / 10)) : v.top;
    if (v.stopFor > 0) want = 0;
    // Slow into the turn at the end of the road.
    const left = this._leftOnRoad(v);
    if (left < 25 && v.next?.bend > 0.5) want = Math.min(want, 4 + left * 0.25);
    // Coming up to a junction with the race coming through it across our way: wait at the line.
    // (at the line: clear of the course's carriageway — half its width and a car's length back from
    // where the roads meet, not in the middle of a ten-lane crossing)
    const clear = left < 60 ? this._raceAcross(v, left) : 0;
    v.giving = clear > 0 && left > clear - 1.5;
    if (v.giving) want = Math.min(want, Math.max(0, (left - clear) * 0.7));
    v.speed += Math.max(-8 * dt, Math.min(2.6 * dt, want - v.speed));
    v.braking = want < v.speed - 0.4;
    v.hazard = v.stopFor > 0;
    v.braking ||= Boolean(v.giving);
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
    const next = follow(v.road.pts, v.at, v.speed * dt);
    v.at = next;
    if (next.end) this._nextRoad(v);
    const q = pointOn(v.road.pts, v.at, v.lane);
    b.heading += turn(b.heading, q.heading) * Math.min(1, dt * 5);
    b.x = q.x;
    b.z = q.z;
    v.v = v.speed;
    this._place(v, dt);
  }

  /**
   * Is a racer coming through the junction at the end of this vehicle's road, across its way? (A
   * rider on our road going our way, or the other, is traffic like any other.) Looks a few seconds ahead.
   */
  _raceAcross(v, left) {
    const pts = v.road.pts;
    const n = pts.length / 2 - 1;
    const ex = v.at.dir > 0 ? pts[n * 2] : pts[0];
    const ez = v.at.dir > 0 ? pts[n * 2 + 1] : pts[1];
    const hd = v.box.heading;
    for (const r of this.race.racers) {
      if (r.left || r.mode !== 'ride' || r.s.v < 4) continue;
      const d = Math.hypot(r.s.x - ex, r.s.z - ez);
      if (d > 14 + r.s.v * 3.2) continue;
      // across our way (not along our road)
      const rel = Math.abs(Math.sin(turn(hd, r.s.travel ?? r.s.heading)));
      if (rel < 0.45) continue;
      // and coming to the junction, or in it — not long past it
      const fx = -Math.sin(r.s.travel ?? r.s.heading);
      const fz = -Math.cos(r.s.travel ?? r.s.heading);
      if ((ex - r.s.x) * fx + (ez - r.s.z) * fz < -6) continue;
      // how far back from the junction to wait: the course's half-width there, and a little more
      let w = 8;
      const pts = this.race.course?.points ?? [];
      let best = 30;
      for (let i = 0; i < pts.length; i += 2) {
        const dd = Math.hypot(pts[i][0] - ex, pts[i][1] - ez);
        if (dd < best) {
          best = dd;
          w = pts[i][2] ?? 8;
        }
      }
      return Math.max(4, w / 2 + 3.5);
    }
    return 0;
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
    if (o) {
      v.road = o.r;
      v.at = o.at;
      v.lane = this._lane(o.r, v.kind);
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
      if (v.kind !== 'scooter') continue;
      const dx = v.box.x - x;
      const dz = v.box.z - z;
      const along = dx * fx + dz * fz;
      if (along < 0 || along > range || Math.abs(dx * -fz + dz * fx) > 2.5) continue;
      v.lane = Math.max(v.lane, v.road.width / 2 - 0.35);
    }
  }

  _remove(v) {
    releaseRider(v.rider);
    v.rider = null;
    this.group.remove(v.group);
    this.vehicles.splice(this.vehicles.indexOf(v), 1);
  }

  dispose() {
    for (const v of this.vehicles) releaseRider(v.rider);
    this.g.scene.remove(this.group);
    this.vehicles = [];
  }
}
