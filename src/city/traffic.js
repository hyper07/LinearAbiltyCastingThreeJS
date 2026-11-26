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
 *
 * The course's own roads are kept busy the other way: cars, taxis, buses and
 * delivery scooters coming at you down the far side of a two-way road (or
 * down the other carriageway of a divided one) — how many by the course's
 * level (course.js LEVELS: Easy moderate, Hard busy), always in their own
 * lane; and on Medium and Hard, cars parked along the kerb (never just
 * before a corner). At night every headlight and tail light glows, near and
 * far (one draw for all of them).
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
    this._onT = 0;
    const level = race.course?.def?.level ?? 'easy';
    this.level = LEVELS[level] ?? LEVELS.easy;
    // (the residential lanes the course takes: delivery scooters on them, coming the other way too, not cars)
    this.carsOnLanes = false;
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
    if (isSmall(r.cls)) return kind === 'scooter' ? Math.max(0, r.width / 2 - 1) : r.oneway || r.width < 5.5 ? 0 : Math.max(1.2, r.width / 4);
    const lane = r.oneway ? r.width / 4 : Math.max(1.7, Math.min(4.2, r.width / 4));
    return kind === 'scooter' ? Math.max(lane, r.width / 2 - 1.1) : kind === 'bus' ? Math.max(lane, r.width / 2 - 1.8) : lane;
  }

  update(dt, anchors) {
    if (!anchors.length) return;
    const me = anchors.find((a) => a.me) ?? anchors[0];
    // Far from every racer here: gone.
    for (const v of [...this.vehicles]) {
      if (v.parked) continue;
      const near = Math.min(...anchors.map((a) => Math.hypot(a.x - v.box.x, a.z - v.box.z)));
      // (one that came at you and has gone by: gone, and another sent up the road ahead)
      const behind = v.oncoming && (v.box.x - me.x) * -Math.sin(me.heading) + (v.box.z - me.z) * -Math.cos(me.heading) < -45;
      if (near > 300 || behind) this._remove(v);
    }
    // Too few: more, a few a second, round the racers (most round you).
    this._spawnT -= dt;
    if (this._spawnT <= 0) {
      this._spawnT = 0.12;
      const count = { car: 0, bus: 0, scooter: 0 };
      for (const v of this.vehicles) if (!v.oncoming && !v.parked) count[v.kind]++;
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
      this._onT = 0.2;
      const on = this.vehicles.filter((v) => v.oncoming).length;
      if (on < this.level.oncoming) this._spawnOncoming(me);
    }
    this._parked(anchors);
    const night = this.g.uniforms?.uNight?.value ?? 0;
    this.blink = (this.blink ?? 0) + dt;
    const on = this.blink % 0.8 < 0.4;
    for (const v of this.vehicles) {
      if (v.parked) {
        v.braking = false;
        this._place(v, 0);
      } else this._drive(v, dt);
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
    this._glowFrame(night, me);
  }

  /**
   * A vehicle coming the other way down the course ahead of `anchor` (90–230 m on): on the far side
   * of the same two-way road, or down the other carriageway of a divided one — a road beside the
   * course running against it. Returns whether one was made.
   */
  _spawnOncoming(anchor) {
    const c = this.race.course;
    if (!c || anchor.idx == null) return false;
    const n = c.points.length;
    for (let tries = 0; tries < 6; tries++) {
      const k = 13 + Math.floor(Math.random() * 26);
      const i = c.open ? Math.min(n - 2, anchor.idx + k) : (anchor.idx + k) % n;
      const p = c.points[i];
      const q = c.points[c.open ? i + 1 : (i + 1) % n];
      const hx = q[0] - p[0];
      const hz = q[1] - p[1];
      const hl = Math.hypot(hx, hz) || 1;
      const w = p[2] ?? 8;
      const kinds = ['car', 'car', 'car', 'car', 'bus', 'scooter'];
      // (down a residential lane: a delivery scooter)
      const kind = isSmall(p[3] ?? 4) ? 'scooter' : kinds[Math.floor(Math.random() * kinds.length)];
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
          // (the other carriageway of a divided road may lie well across a median)
          if (d > w / 2 + (p[4] ? 48 : 14)) continue;
          const dot = (ex * hx + ez * hz) / (Math.sqrt(L2) * hl);
          // along the course one way or the other; the way it is driven: against the course
          let dir = 0;
          if (dot < -0.85) dir = 1;
          else if (dot > 0.85 && !r.oneway) dir = -1;
          if (!dir) continue;
          if (!best || d < best.d) best = { r, at: { i: j, t, dir }, d };
        }
      }
      if (!best) continue;
      const lane = this._lane(best.r, kind);
      const at = pointOn(best.r.pts, best.at, lane);
      if (Math.hypot(at.x - anchor.x, at.z - anchor.z) < 70) continue;
      if (this.vehicles.some((v) => Math.hypot(v.box.x - at.x, v.box.z - at.z) < 10)) continue;
      if (this.g.buildingAt?.(at.x, at.z) || this.race.keepClear?.(at.x, at.z)) continue;
      const made = this._make(kind);
      const top = (SPEEDS[Math.min(5, best.r.cls)] ?? 8) * (kind === 'scooter' ? 1.05 : kind === 'bus' ? 0.85 : 1) * (0.85 + Math.random() * 0.3);
      const [halfLength, halfWidth] = made.size;
      const v = { ...made, road: best.r, at: best.at, lane, top, speed: top * 0.9, v: top * 0.9, y: this.g.surfaceAt(at.x, at.z), box: { x: at.x, z: at.z, heading: at.heading, halfLength, halfWidth }, missed: new Set(), stopFor: 0, waited: 0, roll: 0, oncoming: true };
      this.vehicles.push(v);
      this._place(v, 0);
      return true;
    }
    return false;
  }

  /**
   * Where cars stand parked along the course (Medium and Hard: `parked` a km): at the kerb on the
   * riders' side, on two-way roads and lanes, never in the 60 m before a corner nor just after it,
   * nor at a short cut's mouth, nor in a building — the same places for everyone.
   */
  _parkSpots() {
    this.spots = [];
    const c = this.race.course;
    const per = this.level.parked ?? 0;
    if (!c || !per) return;
    const n = c.points.length;
    const calm = cornerZones(c.points, { before: 10, after: 3 });
    const gap = 1000 / per;
    const walls = c.walls;
    const from = c.open ? c.startI + 30 : 30;
    const to = c.open ? c.finishI - 10 : n - 10;
    let k = 0;
    let last = -Infinity;
    for (let i = from; i < to; i += 2, k++) {
      if (c.s[i] - last < gap) continue;
      const p = c.points[i];
      const q = c.points[(i + 1) % n];
      const w = p[2] ?? 8;
      if (calm[i] || p[4] || w < 7 || w > 15 || c.wild?.[i]) continue;
      if ((c.shortcuts ?? []).some((sc) => Math.abs(sc.from - i) < 6 || Math.abs(sc.to - i) < 6)) continue;
      const hd = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
      const lat = w / 2 - 1.15;
      const x = p[0] + Math.cos(hd) * lat;
      const z = p[1] - Math.sin(hd) * lat;
      if (walls?.hits(x, z, 1.1) || this.g.buildingAt?.(x, z)) continue;
      last = c.s[i];
      this.spots.push({ i, x, z, heading: hd, k, v: null });
    }
  }

  /** The parked cars near anyone riding: there, and gone again further off. */
  _parked(anchors) {
    for (const s of this.spots) {
      const d = Math.min(...anchors.map((a) => Math.hypot(a.x - s.x, a.z - s.z)));
      if (!s.v && d < 220 && d > 25) {
        const made = this._make('car');
        const [halfLength, halfWidth] = made.size;
        s.v = { ...made, parked: true, top: 0, speed: 0, v: 0, y: this.g.surfaceAt(s.x, s.z), box: { x: s.x, z: s.z, heading: s.heading, halfLength, halfWidth }, missed: new Set(), stopFor: 0, waited: 0, roll: 0 };
        this.vehicles.push(s.v);
        this._place(s.v, 0);
      } else if (s.v && d > 280) {
        this._remove(s.v);
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
      uniforms: { uK: { value: 0 } },
      vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC;
        void main() { vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * 320.0 / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uK; varying vec3 vC;
        void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a = a * a * uK; if (a < 0.01) discard; gl_FragColor = vec4(vC * (0.6 + 2.4 * smoothstep(0.25, 0.0, d)), a); }`,
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
    const k = Math.max(0, Math.min(1, (night - 0.3) / 0.4)) + ((this.g.weather?.level.wet ?? 0) > 0.3 ? 0.35 : 0);
    g.material.uniforms.uK.value = Math.min(1, k);
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
    // One coming head-on down a narrow street: tuck in to the kerb and creep past, never a stand-off.
    let headOn = false;
    for (const r of this.race.racers) {
      if (r.left) continue;
      const dx = r.s.x - b.x;
      const dz = r.s.z - b.z;
      const along = dx * fx + dz * fz;
      if (along > 0 && along < 28 && Math.cos((r.s.travel ?? r.s.heading) - b.heading) < -0.5 && Math.abs(dx * -fz + dz * fx) < 3.5) headOn = true;
      else look(r.s.x, r.s.z, 0.7, 18);
    }
    if (headOn && !v.parked) v.lane = Math.max(v.lane, (v.road.width ?? 6) / 2 - v.box.halfWidth - 0.15);
    for (const p of this.g.life?.near?.(b.x, b.z, 26) ?? []) look(p.x, p.z, 0.6, 14);
    v.stopFor = Math.max(0, v.stopFor - dt);
    let want = gap < Infinity ? v.top * Math.max(0, Math.min(1, (gap - 2.5) / 10)) : v.top;
    if (headOn) want = Math.min(want, 3);
    // Coming the other way up to a corner of the course with riders coming to it: the riders turn
    // across this lane there — wait short of it, as the crossing traffic waits at the junctions.
    if (v.oncoming) {
      const hold = this._cornerAhead(v);
      if (hold < Infinity) want = Math.min(want, Math.max(0, (hold - 9) * 0.6));
    }
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
   * How far ahead (m) is a corner of the course this oncoming vehicle comes up to with a racer coming
   * to it (within 50 m of it, not yet through it) — Infinity if none within 40 m.
   */
  _cornerAhead(v) {
    const c = this.race.course;
    const turns = this.race.turnsList;
    if (!c || !turns?.length) return Infinity;
    const b = v.box;
    const fx = -Math.sin(b.heading);
    const fz = -Math.cos(b.heading);
    let best = Infinity;
    for (const t of turns) {
      if (Math.abs(t.bend) < 0.6) continue;
      const p = c.points[t.at];
      const along = (p[0] - b.x) * fx + (p[1] - b.z) * fz;
      if (along < 4 || along > 40 || Math.abs((p[0] - b.x) * -fz + (p[1] - b.z) * fx) > 14) continue;
      const coming = this.race.racers.some((r) => !r.left && r.mode === 'ride' && Math.hypot(r.s.x - p[0], r.s.z - p[1]) < 50 && (r.idx ?? 0) <= t.at + 3 && (r.idx ?? 0) >= t.at - 12);
      if (coming) best = Math.min(best, along);
    }
    return best;
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
    for (const s of this.spots ?? []) if (s.v === v) s.v = null;
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
