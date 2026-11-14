import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadPerson, Person, PEOPLE } from './people.js';
import { loadCar, makeCar, PAINTS } from './cars.js';
import { stepCar, follow, pointOn, CAR } from './drive.js';

/**
 * Seoul's streets, lived in: you on foot as a real person (people.js),
 * cars to get into and drive (cars.js, drive.js), traffic that keeps to
 * the real roads and its own side of them, people walking the pavements,
 * a map in the corner that turns with you. SeoulGame hands over walking
 * and driving to this, and asks it for the camera.
 *
 * Nobody gets hurt: people step out of a car's way, and a car that meets
 * anything stops.
 */

const TRAFFIC = 12;
const WALKERS = 10;
const SPEEDS = [22, 17, 14, 11, 9]; // metres a second by road class (motorway … tertiary)
const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class Street {
  /** @param {any} game the SeoulGame */
  constructor(game) {
    this.g = game;
    this.scene = game.scene;
    // Shiny paint and glass want something to reflect: a soft studio light, only they see it.
    const pmrem = new THREE.PMREMGenerator(game.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.65;
    pmrem.dispose();
    try {
      this.who = localStorage.getItem('gamory.seoul.who') ?? 'mina';
    } catch {
      this.who = 'mina';
    }
    if (!PEOPLE[this.who]) this.who = 'mina';
    this.blob = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6 });
    this.cars = [];
    this.walkers = [];
    this.heading = 0;
    this.hud();
    this.me = new THREE.Group();
    this.marker = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.1, 4, 10), new THREE.MeshLambertMaterial({ color: '#ff5da2' }));
    this.marker.position.y = 0.85;
    this.me.add(this.marker, this._blob(0.9, 0.9));
    this.scene.add(this.me);
    this.me.visible = false;
    this.carKind = null;
    loadCar().then((k) => (this.carKind = k));
    this.dress(this.who);
  }

  /* -------------------------------------------------------------- who */

  /** Become someone (Mina or Jun). */
  dress(who) {
    this.who = who;
    try {
      localStorage.setItem('gamory.seoul.who', who);
    } catch {
      /* private mode */
    }
    loadPerson(who).then((loaded) => {
      if (!loaded || this.who !== who || this.gone) return;
      if (this.body) this.me.remove(this.body.group);
      this.body = new Person(loaded);
      this.me.add(this.body.group);
      this.marker.visible = false;
    });
    if (this.whoButton) this.whoButton.textContent = `🧍 ${PEOPLE[who].name}`;
  }

  switchPerson() {
    const kinds = Object.keys(PEOPLE);
    this.dress(kinds[(kinds.indexOf(this.who) + 1) % kinds.length]);
    this.g.toast?.(`You are ${PEOPLE[this.who].name} now`);
  }

  /* ------------------------------------------------------------- HUD */

  hud() {
    const root = this.g.root;
    const el = (cls, tag = 'div') => {
      const n = document.createElement(tag);
      n.className = cls;
      n.hidden = true;
      root.append(n);
      return n;
    };
    this.map = el('seoul__map', 'canvas');
    this.map.width = this.map.height = 360;
    this.speedo = el('seoul__speed');
    this.hint = el('seoul__hint');
  }

  /* ----------------------------------------------------- modes */

  /** On foot, where the game put you. */
  walk() {
    this.leaveCar();
    this.me.visible = true;
    this.me.position.copy(this.g.pos);
    this.show(true);
    this._parkNear();
  }

  /** Into the nearest car, or one brought to the road beside you. Returns false when no car could be had. */
  drive() {
    if (!this.carKind) return false;
    if (!this.car) {
      let c = this._nearestCar(30);
      if (!c) c = this._parkNear(true);
      if (!c) return false;
      this.enter(c);
    }
    this.show(true);
    return true;
  }

  /** Flying: the street is left as it is, out of sight. */
  hide() {
    this.show(false);
  }

  show(on) {
    for (const c of this.cars) c.view.group.visible = on;
    for (const w of this.walkers) w.group.visible = on;
    this.me.visible = on && !this.car;
    this.map.hidden = !on;
    this.speedo.hidden = !on || !this.car;
    if (!on) this.hint.hidden = true;
    this._engine(on && this.car ? 1 : 0);
  }

  /** E: into the car beside you, or out of the one you drive. */
  use() {
    if (this.car) {
      this.leaveCar();
      this.g.setMode('walk', { keep: true });
      return;
    }
    const c = this._nearestCar(4);
    if (c) {
      this.enter(c);
      this.g.setMode('drive', { keep: true });
    }
  }

  enter(c) {
    c.mode = 'mine';
    this.car = c;
    this.me.visible = false;
    this.g.zoom = Math.max(this.g.zoom ?? 9, 8);
    this.speedo.hidden = false;
    this._engine(1);
  }

  leaveCar() {
    const c = this.car;
    if (!c) return;
    c.mode = 'parked';
    c.s.v = 0;
    this.car = null;
    // Out of the driver's door (the left), or the other if a wall is there.
    const s = c.s;
    for (const side of [1, -1]) {
      const x = s.x - Math.cos(s.heading) * side * 2.1;
      const z = s.z + Math.sin(s.heading) * side * 2.1;
      if (!this.g.buildingAt(x, z)) {
        this.g.pos.set(x, this.g.surfaceAt(x, z, c.y), z);
        break;
      }
    }
    this.heading = s.heading;
    this.me.position.copy(this.g.pos);
    this.me.visible = true;
    this.speedo.hidden = true;
    this._engine(0);
  }

  /* --------------------------------------------------------- cars */

  /** A car object: its look and its state. */
  _car(color, mode, s, y) {
    const view = makeCar(this.carKind, color, { lite: mode === 'traffic' });
    const shadow = this._blob(this.carKind.width * 1.15, this.carKind.length * 1.1);
    view.group.add(shadow);
    this.scene.add(view.group);
    const c = { view, mode, s: { travel: s.heading, v: 0, steer: 0, ...s }, y, pitch: 0, speed: 0, waited: 0 };
    this.cars.push(c);
    this._place(c, 0);
    return c;
  }

  _blob(w, d) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), this.blob);
    m.position.y = 0.04;
    m.renderOrder = 1;
    return m;
  }

  _removeCar(c) {
    this.scene.remove(c.view.group);
    this.cars.splice(this.cars.indexOf(c), 1);
  }

  /** Is a point inside a car (other than `except`)? */
  _carAt(x, z, except = null, pad = 0) {
    for (const c of this.cars) {
      if (c === except || !c.view.group.visible) continue;
      const dx = x - c.s.x;
      const dz = z - c.s.z;
      const along = -dx * Math.sin(c.s.heading) - dz * Math.cos(c.s.heading);
      const side = dx * Math.cos(c.s.heading) - dz * Math.sin(c.s.heading);
      if (Math.abs(along) < CAR.halfLength + pad && Math.abs(side) < CAR.halfWidth + pad) return c;
    }
    return null;
  }

  _nearestCar(reach) {
    let best = null;
    let bestD = reach;
    const p = this.g.pos;
    for (const c of this.cars) {
      const d = Math.hypot(c.s.x - p.x, c.s.z - p.z) - 1.2;
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
    return best;
  }

  /** Stretches of road between `near` and `far` metres from you: [{ r, i }], looked up once a second. */
  _stretches(near, far, minClass = 0) {
    const p = this.g.pos;
    const key = `${near}|${far}|${minClass}`;
    this._stretchCache ??= new Map();
    const hit = this._stretchCache.get(key);
    if (hit && performance.now() - hit.at < 1000 && Math.hypot(hit.x - p.x, hit.z - p.z) < 40) return hit.list;
    const list = [];
    for (const r of this._roads(p.x, p.z)) {
      if (r.cls < minClass) continue;
      for (let i = 0; i + 1 < r.pts.length / 2; i++) {
        const d = Math.hypot((r.pts[i * 2] + r.pts[i * 2 + 2]) / 2 - p.x, (r.pts[i * 2 + 1] + r.pts[i * 2 + 3]) / 2 - p.z);
        if (d >= near && d <= far) list.push({ r, i });
      }
    }
    this._stretchCache.set(key, { at: performance.now(), x: p.x, z: p.z, list });
    return list;
  }

  /** Roads near a point that cars use, with their class and width. */
  _roads(x, z) {
    return (this.g.roadsNear?.(x, z) ?? []).filter((r) => r.cls <= 4 && r.pts.length >= 4);
  }

  /** Park a car (or a few) at the roadside near you. With `mine`, return the one nearest. */
  _parkNear(mine = false) {
    if (!this.carKind) return null;
    const p = this.g.pos;
    const roads = this._roads(p.x, p.z);
    const spots = [];
    for (const r of roads) {
      for (let i = 0; i + 1 < r.pts.length / 2; i++) {
        const at = { i, t: 0.5, dir: 1 };
        const q = pointOn(r.pts, at, r.width / 2 - 1.3);
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d < 60 && !this.g.buildingAt(q.x, q.z) && !this._carAt(q.x, q.z, null, 3)) spots.push({ ...q, d });
      }
    }
    spots.sort((a, b) => a.d - b.d);
    let made = null;
    const want = mine ? 1 : 3 - this.cars.filter((c) => c.mode === 'parked' && Math.hypot(c.s.x - p.x, c.s.z - p.z) < 80).length;
    for (let k = 0; k < want && spots.length; k++) {
      const q = spots.splice(mine ? 0 : Math.floor(Math.random() * Math.min(6, spots.length)), 1)[0];
      made ??= this._car(PAINTS[Math.floor(Math.random() * PAINTS.length)], 'parked', { x: q.x, z: q.z, heading: q.heading }, this.g.surfaceAt(q.x, q.z));
    }
    if (mine && !made) {
      // No road near: beside you.
      const x = p.x + Math.cos(this.heading) * 3;
      const z = p.z - Math.sin(this.heading) * 3;
      made = this._car(PAINTS[0], 'parked', { x, z, heading: this.heading }, this.g.surfaceAt(x, z));
    }
    return made;
  }

  /** Sit a car on the road: its height, nose up or down with the slope, wheels turned and rolled. */
  _place(c, dt) {
    const s = c.s;
    const fx = -Math.sin(s.heading) * CAR.halfLength;
    const fz = -Math.cos(s.heading) * CAR.halfLength;
    const y = this.g.surfaceAt(s.x, s.z, c.y);
    c.y = dt ? c.y + (y - c.y) * Math.min(1, dt * 12) : y;
    const yf = this.g.surfaceAt(s.x + fx, s.z + fz, c.y);
    const yb = this.g.surfaceAt(s.x - fx, s.z - fz, c.y);
    c.pitch += (Math.atan2(yf - yb, CAR.halfLength * 2) - c.pitch) * Math.min(1, dt * 8 || 1);
    const g = c.view.group;
    g.position.set(s.x, c.y, s.z);
    g.rotation.set(0, 0, 0);
    g.rotation.order = 'YXZ';
    g.rotation.y = s.heading;
    g.rotation.x = c.pitch;
    c.view.wheels(s.steer ?? 0, (s.v * dt) / (this.carKind.radius || 0.34));
  }

  /* ----------------------------------------------------------- frame */

  update(dt) {
    const k = this.g.keys;
    const key = (...codes) => codes.some((c) => k.has(c));
    const typing = document.activeElement?.matches?.('input, select');
    if (this.car) this._driveStep(dt, typing ? {} : { throttle: key('KeyW', 'ArrowUp'), brake: key('KeyS', 'ArrowDown'), left: key('KeyA', 'ArrowLeft'), right: key('KeyD', 'ArrowRight'), handbrake: key('Space') });
    else this._walkStep(dt, typing ? {} : { f: (key('KeyW', 'ArrowUp') ? 1 : 0) - (key('KeyS', 'ArrowDown') ? 1 : 0), s: (key('KeyD', 'ArrowRight') ? 1 : 0) - (key('KeyA', 'ArrowLeft') ? 1 : 0), run: key('ShiftLeft', 'ShiftRight') });
    if (this.carKind) this._traffic(dt);
    this._walkers(dt);
    this._hud(dt);
  }

  _walkStep(dt, { f = 0, s = 0, run = false }) {
    const g = this.g;
    const yaw = g.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const mx = fx * f + -fz * s;
    const mz = fz * f + fx * s;
    const len = Math.hypot(mx, mz);
    const speed = len ? (run ? 6 : 2.1) : 0;
    if (len) {
      const nx = g.pos.x + (mx / len) * speed * dt;
      const nz = g.pos.z + (mz / len) * speed * dt;
      const free = (x, z) => !g.buildingAt(x, z) && !this._carAt(x, z, null, 0.35);
      if (free(nx, nz)) g.pos.set(nx, g.pos.y, nz);
      else if (free(nx, g.pos.z)) g.pos.x = nx;
      else if (free(g.pos.x, nz)) g.pos.z = nz;
      this.heading += turn(this.heading, Math.atan2(-mx, -mz)) * Math.min(1, dt * 10);
    }
    g.pos.y = g.surfaceAt(g.pos.x, g.pos.z, g.pos.y);
    g.speed = speed;
    this.me.position.copy(g.pos);
    this.me.rotation.y = this.heading;
    this.body?.update(dt, speed);
    const near = this._nearestCar(4);
    this.hint.hidden = !near;
    if (near) this.hint.textContent = 'E — get in';
  }

  _driveStep(dt, input) {
    const c = this.car;
    const g = this.g;
    const blocked = (x, z) => Boolean(g.buildingAt(x, z) || this._carAt(x, z, c));
    const { hit } = stepCar(c.s, input, dt, blocked);
    if (hit > 5) this._thud(Math.min(1, hit / 25));
    // People step out of the way; one who is hit anyway is pushed, and the car stops.
    for (const w of this.walkers) {
      const d = Math.hypot(w.x - c.s.x, w.z - c.s.z);
      if (d < 2.6 && Math.abs(c.s.v) > 0.5) {
        c.s.v *= 0.2;
        w.dodge = 1.5;
      }
    }
    this._place(c, dt);
    c.braking = Boolean(input.brake && c.s.v > 0.5);
    g.pos.set(c.s.x, c.y, c.s.z);
    g.speed = Math.abs(c.s.v);
    this._engine(1, c.s.v, input.throttle);
    this.hint.hidden = Math.abs(c.s.v) > 1;
    this.hint.textContent = 'E — get out';
  }

  /** The camera: over your shoulder on foot; behind the car, swinging round after it, at the wheel. */
  camera(camera) {
    const g = this.g;
    if (this.car) {
      const c = this.car;
      // Unless you are looking round with the mouse, the view comes back behind the car.
      if (performance.now() - (g.dragAt ?? 0) > 1400) {
        const behind = c.s.heading; // behind the car, backing up included
        g.yaw += turn(g.yaw, behind) * Math.min(1, 0.05 + Math.abs(c.s.v) * 0.004);
        g.pitch += (-0.2 - g.pitch) * 0.04;
      }
      const dir = new THREE.Vector3(-Math.sin(g.yaw) * Math.cos(g.pitch), Math.sin(g.pitch), -Math.cos(g.yaw) * Math.cos(g.pitch));
      const focus = new THREE.Vector3(c.s.x, c.y + 1.3, c.s.z);
      const dist = (g.zoom ?? 8) + Math.abs(c.s.v) * 0.06;
      camera.position.copy(focus).addScaledVector(dir, -dist);
      camera.position.y = Math.max(camera.position.y, g.surfaceAt(camera.position.x, camera.position.z, c.y) + 0.8);
      camera.lookAt(focus);
      const fov = 58 + Math.min(14, Math.abs(c.s.v) * 0.35);
      if (Math.abs(camera.fov - fov) > 0.1) {
        camera.fov += (fov - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
      }
      return;
    }
    if (Math.abs(camera.fov - 58) > 0.1) {
      camera.fov = 58;
      camera.updateProjectionMatrix();
    }
    const dir = new THREE.Vector3(-Math.sin(g.yaw) * Math.cos(g.pitch), Math.sin(g.pitch), -Math.cos(g.yaw) * Math.cos(g.pitch));
    const head = new THREE.Vector3(g.pos.x, g.pos.y + 1.55, g.pos.z);
    // A little to the right of you, the way third-person cameras sit.
    head.add(new THREE.Vector3(Math.cos(g.yaw), 0, -Math.sin(g.yaw)).multiplyScalar(0.45));
    camera.position.copy(head).addScaledVector(dir, -(g.zoom ?? 4.5));
    camera.position.y = Math.max(camera.position.y, g.surfaceAt(camera.position.x, camera.position.z, g.pos.y) + 0.5);
    camera.lookAt(head);
  }

  /* --------------------------------------------------------- traffic */

  _traffic(dt) {
    const p = this.g.pos;
    const night = this.g.uniforms?.uNight?.value ?? 0;
    // Too far: gone. Too few: more, on a road a little way off.
    for (const c of [...this.cars]) {
      const d = Math.hypot(c.s.x - p.x, c.s.z - p.z);
      if (c.mode !== 'mine' && d > 420) this._removeCar(c);
      else c.view.near(d < 110 || c.mode === 'mine');
    }
    const moving = this.cars.filter((c) => c.mode === 'traffic');
    if (moving.length < TRAFFIC && Math.random() < dt * 6) this._spawnTraffic();
    for (const c of moving) this._drive(c, dt);
    for (const c of this.cars) c.view.lights(night, c.braking);
  }

  _spawnTraffic() {
    const p = this.g.pos;
    const list = this._stretches(60, 280);
    if (!list.length) return;
    const { r, i } = list[Math.floor(Math.random() * list.length)];
    const at = { i, t: Math.random(), dir: Math.random() < 0.5 ? 1 : -1 };
    const lane = Math.max(1.8, Math.min(4, r.width / 4));
    const q = pointOn(r.pts, at, lane);
    const d = Math.hypot(q.x - p.x, q.z - p.z);
    if (d < 50 || d > 300 || this._carAt(q.x, q.z, null, 4)) return;
    const c = this._car(PAINTS[Math.floor(Math.random() * PAINTS.length)], 'traffic', { x: q.x, z: q.z, heading: q.heading }, this.g.surfaceAt(q.x, q.z));
    Object.assign(c, { road: r, at, lane, top: SPEEDS[r.cls] ?? 10, speed: (SPEEDS[r.cls] ?? 10) * 0.7 });
  }

  /** A traffic car: along its road on its own side, slowing for whatever is ahead, on to the next road at the end. */
  _drive(c, dt) {
    const s = c.s;
    const fx = -Math.sin(s.heading);
    const fz = -Math.cos(s.heading);
    // What is ahead in our lane?
    let gap = Infinity;
    const look = (x, z) => {
      const dx = x - s.x;
      const dz = z - s.z;
      const along = dx * fx + dz * fz;
      const side = Math.abs(dx * -fz + dz * fx);
      if (along > 0.5 && along < 22 && side < 2.2) gap = Math.min(gap, along);
    };
    for (const o of this.cars) if (o !== c) look(o.s.x, o.s.z);
    if (!this.car) look(this.g.pos.x, this.g.pos.z);
    for (const w of this.walkers) look(w.x, w.z);
    const want = gap < Infinity ? c.top * Math.max(0, Math.min(1, (gap - 6) / 12)) : c.top;
    c.speed += Math.max(-9 * dt, Math.min(3 * dt, want - c.speed));
    c.braking = want < c.speed - 0.5;
    // Held up a long time: a toot of the horn.
    c.waited = c.speed < 0.5 && gap < 10 ? c.waited + dt : 0;
    if (c.waited > 3) {
      c.waited = -4;
      const d = Math.hypot(s.x - this.g.pos.x, s.z - this.g.pos.z);
      if (d < 60) this._horn(0.35 * (1 - d / 60), 330);
    }
    const next = follow(c.road.pts, c.at, c.speed * dt);
    c.at = next;
    if (next.end) this._nextRoad(c);
    const q = pointOn(c.road.pts, c.at, c.lane);
    s.heading += turn(s.heading, q.heading) * Math.min(1, dt * 5);
    s.v = c.speed;
    s.x = q.x;
    s.z = q.z;
    this._place(c, dt);
  }

  /** At the end of a road: onto one that starts or ends here, away from where we came; or turn round. */
  _nextRoad(c) {
    const pts = c.road.pts;
    const n = pts.length / 2 - 1;
    const endX = c.at.dir > 0 ? pts[n * 2] : pts[0];
    const endZ = c.at.dir > 0 ? pts[n * 2 + 1] : pts[1];
    const options = [];
    for (const r of this._roads(endX, endZ)) {
      if (r === c.road) continue;
      const m = r.pts.length / 2 - 1;
      if (Math.hypot(r.pts[0] - endX, r.pts[1] - endZ) < 10) options.push({ r, at: { i: 0, t: 0, dir: 1 } });
      if (Math.hypot(r.pts[m * 2] - endX, r.pts[m * 2 + 1] - endZ) < 10) options.push({ r, at: { i: m - 1, t: 1, dir: -1 } });
    }
    if (options.length) {
      const o = options[Math.floor(Math.random() * options.length)];
      c.road = o.r;
      c.at = o.at;
      c.lane = Math.max(1.8, Math.min(4, o.r.width / 4));
      c.top = SPEEDS[o.r.cls] ?? 10;
    } else c.at = { ...c.at, dir: -c.at.dir };
  }

  /* --------------------------------------------------------- walkers */

  _walkers(dt) {
    const p = this.g.pos;
    for (const w of [...this.walkers]) {
      if (Math.hypot(w.x - p.x, w.z - p.z) > 200) {
        this.scene.remove(w.group);
        this.walkers.splice(this.walkers.indexOf(w), 1);
      }
    }
    if (this.walkers.length < WALKERS && Math.random() < dt * 3 && !this._spawning) this._spawnWalker();
    for (const w of this.walkers) {
      // A car coming at them: a quick step aside onto the pavement's far edge.
      if (this.car && Math.abs(this.car.s.v) > 3) {
        const s = this.car.s;
        const dx = w.x - s.x;
        const dz = w.z - s.z;
        const along = -dx * Math.sin(s.heading) - dz * Math.cos(s.heading);
        const side = dx * Math.cos(s.heading) - dz * Math.sin(s.heading);
        if (along > 0 && along < 14 && Math.abs(side) < 2.5) w.dodge = 1.2;
      }
      const hurry = w.dodge > 0;
      w.dodge = Math.max(0, w.dodge - dt);
      if (hurry) w.side += dt * 3.5;
      const speed = hurry ? 4.5 : w.pace;
      const next = follow(w.road.pts, w.at, speed * dt);
      if (next.end) next.dir = -next.dir;
      const q = pointOn(w.road.pts, next, w.side);
      if (this.g.buildingAt(q.x, q.z)) {
        w.at = { ...w.at, dir: -w.at.dir };
        w.side = Math.max(w.road.width / 2 + 1, w.side - 0.5);
      } else {
        w.at = next;
        w.x = q.x;
        w.z = q.z;
        w.heading += turn(w.heading, q.heading) * Math.min(1, dt * 6);
      }
      const y = this.g.surfaceAt(w.x, w.z, w.y);
      w.y = w.y == null ? y : w.y + (y - w.y) * Math.min(1, dt * 10);
      w.group.position.set(w.x, w.y, w.z);
      w.group.rotation.y = w.heading;
      // Far away, the steps every few frames.
      const d = Math.hypot(w.x - p.x, w.z - p.z);
      w.tick = (w.tick ?? 0) + dt;
      if (d < 60 || w.tick > 0.12) {
        w.person.update(w.tick, speed);
        w.tick = 0;
      }
    }
  }

  async _spawnWalker() {
    const p = this.g.pos;
    const list = this._stretches(25, 140, 2);
    if (!list.length) return;
    const { r, i } = list[Math.floor(Math.random() * list.length)];
    const at = { i, t: Math.random(), dir: Math.random() < 0.5 ? 1 : -1 };
    const side = r.width / 2 + 1.6 + Math.random() * 1.2;
    const q = pointOn(r.pts, at, side);
    const d = Math.hypot(q.x - p.x, q.z - p.z);
    if (d < 25 || d > 150 || this.g.buildingAt(q.x, q.z)) return;
    this._spawning = true;
    const kind = Math.random() < 0.5 ? 'mina' : 'jun';
    const loaded = await loadPerson(kind);
    this._spawning = false;
    if (!loaded || this.gone) return;
    const person = new Person(loaded);
    const group = new THREE.Group();
    group.add(person.group, this._blob(0.8, 0.8));
    group.visible = this.map.hidden === false;
    this.scene.add(group);
    this.walkers.push({ person, group, road: r, at, side, x: q.x, z: q.z, y: null, heading: q.heading, pace: 1.2 + Math.random() * 0.5, dodge: 0 });
  }

  /* --------------------------------------------------------- the map */

  _hud() {
    if (this.map.hidden) return;
    const g = this.map.getContext('2d');
    const W = this.map.width;
    const R = W / 2;
    const scale = 0.9; // pixels a metre: about 200 m to the edge
    const p = this.g.pos;
    const yaw = this.g.yaw;
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = 'rgba(28, 34, 46, 0.86)';
    g.fillRect(0, 0, W, W);
    g.translate(R, R);
    g.rotate(yaw); // the way you look is up
    g.scale(scale, scale);
    g.translate(-p.x, -p.z);
    // Roads.
    g.strokeStyle = '#8a93a6';
    g.lineCap = 'round';
    const reach = 230;
    const cell = this.g.roadCell ?? 40;
    const seen = new Set();
    for (let i = Math.floor((p.x - reach) / cell); i <= Math.floor((p.x + reach) / cell); i++) {
      for (let j = Math.floor((p.z - reach) / cell); j <= Math.floor((p.z + reach) / cell); j++) {
        for (const s of this.g.roadHash?.get(`${i}_${j}`) ?? []) {
          if (seen.has(s)) continue;
          seen.add(s);
          g.lineWidth = Math.max(3, s.half * 1.6);
          g.beginPath();
          g.moveTo(s.ax, s.az);
          g.lineTo(s.bx, s.bz);
          g.stroke();
        }
      }
    }
    // Cars and people.
    for (const c of this.cars) {
      if (c === this.car) continue;
      g.fillStyle = c.mode === 'parked' ? '#a4b0c4' : '#ffffff';
      g.beginPath();
      g.arc(c.s.x, c.s.z, 3.2, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#9fe0a8';
    for (const w of this.walkers) {
      g.beginPath();
      g.arc(w.x, w.z, 2, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    // You: an arrow the way you face (or drive).
    const heading = this.car ? this.car.s.heading : this.heading;
    g.save();
    g.translate(R, R);
    g.rotate(yaw - heading);
    g.fillStyle = '#ffb02e';
    g.beginPath();
    g.moveTo(0, -12);
    g.lineTo(8, 9);
    g.lineTo(0, 4);
    g.lineTo(-8, 9);
    g.closePath();
    g.fill();
    g.restore();
    // North.
    const nx = R + Math.sin(-yaw) * (R - 18);
    const ny = R - Math.cos(-yaw) * (R - 18);
    g.fillStyle = '#ff6b6b';
    g.font = '800 22px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('N', nx, ny);
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.stroke();
    if (this.car) {
      const kmh = Math.round(Math.abs(this.car.s.v) * 3.6);
      this.speedo.innerHTML = `<b>${kmh}</b><small>km/h</small><i>${this.car.s.v < -0.3 ? 'R' : this.car.drift > 0.25 ? 'DRIFT' : 'D'}</i>`;
    }
  }

  /* ----------------------------------------------------------- sound */

  _audio() {
    if (this.audio) return this.audio;
    try {
      this.audio = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      this.audio = null;
    }
    return this.audio;
  }

  /** The engine: a low growl that rises with speed. */
  _engine(on, v = 0, throttle = false) {
    if (!on && !this.engine) return;
    const a = this._audio();
    if (!a) return;
    if (!this.engine) {
      const osc = a.createOscillator();
      osc.type = 'sawtooth';
      const osc2 = a.createOscillator();
      osc2.type = 'square';
      const filter = a.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      const gain = a.createGain();
      gain.gain.value = 0;
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain).connect(a.destination);
      osc.start();
      osc2.start();
      this.engine = { osc, osc2, gain, filter };
    }
    // Through the gears: the note climbs, drops at each change, climbs again.
    const sp = Math.abs(v);
    const gearTop = [0, 8, 16, 25, 34, 50];
    let gear = 1;
    while (gear < 5 && sp > gearTop[gear]) gear++;
    const within = (sp - gearTop[gear - 1]) / (gearTop[gear] - gearTop[gear - 1]);
    const f = 34 + within * 46 + (throttle ? 6 : 0);
    const t = a.currentTime;
    this.engine.osc.frequency.setTargetAtTime(f, t, 0.05);
    this.engine.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    this.engine.filter.frequency.setTargetAtTime(300 + within * 500 + (throttle ? 300 : 0), t, 0.08);
    this.engine.gain.gain.setTargetAtTime(on ? 0.05 + (throttle ? 0.035 : 0) : 0, t, 0.1);
  }

  /** H: the horn. */
  horn() {
    if (this.car) this._horn(0.35, 415);
  }

  _horn(volume, freq) {
    const a = this._audio();
    if (!a) return;
    const gain = a.createGain();
    gain.gain.setValueAtTime(volume * 0.25, a.currentTime);
    gain.gain.setTargetAtTime(0, a.currentTime + 0.35, 0.04);
    for (const f of [freq, freq * 1.26]) {
      const o = a.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      o.stop(a.currentTime + 0.5);
    }
    gain.connect(a.destination);
  }

  _thud(volume) {
    const a = this._audio();
    if (!a) return;
    const o = a.createOscillator();
    o.frequency.setValueAtTime(120, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, a.currentTime + 0.25);
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.4 * volume, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.3);
    o.connect(gain).connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.3);
  }

  dispose() {
    this.gone = true;
    this.engine?.osc.stop();
    this.engine?.osc2.stop();
    this.audio?.close?.();
    for (const c of this.cars) this.scene.remove(c.view.group);
    for (const w of this.walkers) this.scene.remove(w.group);
    this.scene.remove(this.me);
    for (const n of [this.map, this.speedo, this.hint]) n.remove();
  }
}
