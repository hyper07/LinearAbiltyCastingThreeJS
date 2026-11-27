import * as THREE from 'three';
import { follow, pointOn } from './drive.js';
import { Folk } from './folk.js';
import { narrowPoint, narrowRoad } from './alleys.js';

/**
 * Street life: ordinary people on Seoul's pavements — walking, walking the
 * dog, coming back from the shops with bags, waiting in groups at the
 * crossings, standing at shop doors, on the phone. In the small streets
 * (alleys.bin) there is no pavement: they walk anywhere across it — in a race
 * along its edges, out of the riders' way. The narrow streets are people's
 * only (no traffic, alleys.js isNarrow): in a race a few are always put down
 * the narrow ones the course runs down near you (never a short cut's golmok,
 * kept clear to race down). A bike race asks who is near
 * (`near`), rings its bell or blasts its horn at them (`shoo`: they step
 * aside), and knocks into them (`bump`).
 *
 * Everyone you see is real: rigged, textured Rocketbox men and women with
 * faces and motion-captured walks, idles, texting and cheering (folk.js).
 * There are as many as Folk can dress — no faceless stand-ins: further off
 * the pavement is quieter, the way a street thins out with distance. In a
 * race, people gather ahead of the riders, where they will be seen. Only the
 * walkers' small dogs are drawn here (instanced: a body, a head, legs).
 *
 *   const life = new StreetLife(game);   // game: the SeoulGame
 *   life.update(dt);                       // every frame
 */

/** How many of each, near you (the stand-abouts come in twos and threes, and some walkers in pairs). */
export const CROWD = { walk: 22, dog: 5, shop: 8, stand: 12 };
/** In a race, how many at least down the narrow streets the course runs down near you, and the share of new people sent there till then. */
export const ALLEY_FOLK = { want: 4, share: 0.3 };
const ON_FOOT = new Set(['walk', 'jog', 'dog', 'shop', 'stand']);
/** Who becomes a real person near you: everyone on foot (nobody is drawn who isn't). */
const REAL = new Set(['walk', 'dog', 'shop', 'stand']);
const NEAR = 10;
const FAR = 80;
const GONE = 100;

/** Everyday Seoul clothes: mostly dark and neutral, a few colours. */
const TOPS = ['#1d1f24', '#23293a', '#2f2f33', '#4a4d55', '#e9e6df', '#c9b79c', '#8b6d4f', '#5b6b7d', '#7a2830', '#2e4a3a', '#b8b2a7', '#f2f0ea', '#3c3f6b', '#d9cfbf'];
const LEGS = ['#1b1c20', '#25272d', '#2c3446', '#3d4350', '#58606d', '#6b5a48', '#cfc6b6', '#1f2a44'];
const SPORT = ['#e8e8e8', '#2a6fdb', '#e2483d', '#1d1f24', '#f2c230', '#3fb68b', '#ff7aa8'];
const SKIN = ['#f1d3bd', '#e8c3a5', '#dcb091', '#f4dccb', '#d9ab8c'];
const HAIR = ['#141212', '#1c1714', '#2a1f1a', '#3b2a20', '#5a3d2a', '#1a1a1a'];
const BIKES = ['#2f2f33', '#c7c9cc', '#1f3b6b', '#7a1f24', '#e2e2dc'];
const DOGS = ['#f4f1ea', '#f4f1ea', '#d9b98c', '#8a5a34', '#2a2522', '#c9c3b8'];
const BAGS = ['#f3efe6', '#b98a5a', '#1d1f24', '#d2342c', '#2a6a3e', '#e9d7b0'];
const BOXES = ['#c8322b', '#1f5bb5', '#2fb39a', '#f2f0ea', '#f2c230'];

const tmp = new THREE.Object3D();
const mBase = new THREE.Matrix4();
const mPart = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const sc = new THREE.Vector3(1, 1, 1);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const angle = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const col = (hex) => new THREE.Color(hex);

function merge(list) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal']) {
    const arrays = list.map((g) => g.toNonIndexed().attributes[name].array);
    const all = new Float32Array(arrays.reduce((s, a) => s + a.length, 0));
    let at = 0;
    for (const a of arrays) {
      all.set(a, at);
      at += a.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(all, 3));
  }
  return out;
}

/** A small dog's parts (a maltese, a poodle, a shiba): body, head, ears, four legs, a tail, and its lead. Forward is −Z. */
function shapes() {
  return {
    dogBody: new THREE.CapsuleGeometry(0.1, 0.24, 4, 8).rotateX(Math.PI / 2),
    dogHead: merge([new THREE.SphereGeometry(0.085, 10, 8), new THREE.SphereGeometry(0.045, 8, 6).translate(0, -0.02, -0.08), new THREE.SphereGeometry(0.035, 6, 5).translate(-0.06, 0.04, 0.02), new THREE.SphereGeometry(0.035, 6, 5).translate(0.06, 0.04, 0.02)]),
    dogLeg: new THREE.CylinderGeometry(0.025, 0.022, 0.16, 5).translate(0, -0.08, 0),
    dogTail: new THREE.CapsuleGeometry(0.025, 0.1, 2, 5).translate(0, 0.06, 0),
    leash: new THREE.CylinderGeometry(0.006, 0.006, 1, 4).translate(0, 0.5, 0)
  };
}

/** Within this many metres of the camera (each way) people stand on the surface under their feet, every frame. */
const FEET_NEAR = 70;

export class StreetLife {
  /** @param {any} game the SeoulGame */
  constructor(game) {
    this.g = game;
    this.people = [];
    this.group = new THREE.Group();
    game.scene.add(this.group);
    const s = shapes();
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, envMapIntensity: 0.8 });
    const draw = (geo, n, color = null) => {
      const m = new THREE.InstancedMesh(geo, color ? new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 }) : mat, n);
      m.castShadow = false;
      m.receiveShadow = true;
      m.count = 0;
      m.frustumCulled = false;
      if (!color) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
      this.group.add(m);
      return m;
    };
    this.parts = {
      dogBody: draw(s.dogBody, CROWD.dog + 2),
      dogHead: draw(s.dogHead, CROWD.dog + 2),
      dogLeg: draw(s.dogLeg, (CROWD.dog + 2) * 4),
      dogTail: draw(s.dogTail, CROWD.dog + 2),
      leash: draw(s.leash, CROWD.dog + 2, '#c0392b')
    };
    this.time = 0;
    this._spawnT = 0;
    /** Spectators a race stands at its barriers (addFan): they stay put and cheer. */
    this.fans = [];
    /** The real people near you (Rocketbox avatars), dressed over the nearest of these. */
    this.folk = new Folk(game);
  }

  /**
   * A spectator at a race: stands where put, facing `heading`, cheering as much as told (0…1) —
   * clapping, arms up and hopping as cars come by, some filming on their phones. Returns a handle
   * the race moves and drives: { group: { position }, update(dt, _, cheer), remove() }.
   */
  addFan({ x, y, z, heading }) {
    const m = this._person('stand', null, null, 0, { x, z, heading });
    Object.assign(m, { kind: 'fan', heading, y, yGoal: y, cheer: 0.15, phone: Math.random() < 0.3, fixed: true });
    const position = new THREE.Vector3(x, y, z);
    m.handlePos = position;
    this.fans.push(m);
    const life = this;
    return {
      group: { position },
      person: m,
      update(dt, _speed, cheer) {
        m.cheer = cheer;
      },
      remove() {
        const i = life.fans.indexOf(m);
        if (i >= 0) life.fans.splice(i, 1);
      },
      sync() {
        m.x = position.x;
        m.y = m.yGoal = position.y;
        m.z = position.z;
      }
    };
  }

  /** Roads people may be beside: not motorways, not on bridges. */
  _roads() {
    const p = this.g.pos;
    return (this.g.roadsNear?.(p.x, p.z, 1) ?? []).filter((r) => r.cls >= 1 && !r.bridge && r.pts.length >= 4);
  }

  /**
   * In a race, the narrow streets near you that the course runs down (people only: no traffic there) —
   * not a short cut's golmok, kept clear to race down. Worked out once a second.
   */
  _narrowLanes(roads) {
    const race = this.g.race;
    const c = race?.course;
    if (this.g.mode !== 'race' || !c?.points) return [];
    if (this._lanes && this.time - this._lanes.t < 1) return this._lanes.list;
    const p = this.g.pos;
    const pts = c.points.filter((q) => narrowPoint(q) && Math.abs(q[0] - p.x) < FAR + 20 && Math.abs(q[1] - p.z) < FAR + 20);
    // (a course point on the street's line: the course runs down it)
    const onCourse = (r) => {
      for (let i = 2; i < r.pts.length; i += 2) {
        const ax = r.pts[i - 2];
        const az = r.pts[i - 1];
        const dx = r.pts[i] - ax;
        const dz = r.pts[i + 1] - az;
        if (Math.max(ax, ax + dx) < p.x - FAR - 22 || Math.min(ax, ax + dx) > p.x + FAR + 22 || Math.max(az, az + dz) < p.z - FAR - 22 || Math.min(az, az + dz) > p.z + FAR + 22) continue;
        const L2 = dx * dx + dz * dz || 1;
        for (const q of pts) {
          const t = Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - az) * dz) / L2));
          if (Math.hypot(q[0] - ax - dx * t, q[1] - az - dz * t) < 2) return true;
        }
      }
      return false;
    };
    const list = pts.length ? roads.filter((r) => r.small && narrowRoad(r) && !race.scRoads?.has(r) && onCourse(r)) : [];
    this._lanes = { t: this.time, list };
    return list;
  }

  /** A new person of a kind, somewhere near, where they belong. */
  _spawn(kind) {
    const roads = this._roads();
    if (!roads.length) return;
    const p = this.g.pos;
    // (in a race, a few always down the narrow streets the course takes near you: no traffic there, the
    // people make them alive — at the edges, for the riders to weave past)
    const lanes = ON_FOOT.has(kind) && Math.random() < ALLEY_FOLK.share ? this._narrowLanes(roads) : [];
    const few = lanes.length && this.people.filter((m) => lanes.includes(m.road)).length < ALLEY_FOLK.want;
    for (let tries = 0; tries < 40; tries++) {
      const r = pick(few ? lanes : roads);
      const n = r.pts.length / 2 - 1;
      const at = { i: Math.floor(Math.random() * n), t: Math.random(), dir: Math.random() < 0.5 ? 1 : -1 };
      const half = r.width / 2;
      // On foot, anywhere across the pavement (3 m); bikes along its road-side edge; motorbikes in the road, by the kerb.
      // A small street has no pavement: people walk anywhere across it, bikes and motorbikes keep right.
      if (r.small && kind === 'moto') continue;
      const racing = this.g.mode === 'race';
      // Waiting at a crossing: at the street's end, by the corner. At a shop door: at the back of the pavement.
      const corner = kind === 'stand' && !r.small && Math.random() < 0.5;
      const door = kind === 'stand' && !corner && !r.small && Math.random() < 0.5;
      if (corner) Object.assign(at, Math.random() < 0.5 ? { i: 0, t: 0.02 + Math.random() * 0.06 } : { i: n - 1, t: 0.92 + Math.random() * 0.06 });
      const edge = (Math.random() < 0.5 ? -1 : 1) * Math.max(0.2, half - 0.4);
      const side = r.small ? (ON_FOOT.has(kind) ? (racing ? edge : (Math.random() * 2 - 1) * Math.max(0.2, half - 0.45)) : Math.max(0, half - 0.7)) : ON_FOOT.has(kind) ? (door ? half + 2.5 + Math.random() * 0.4 : corner ? half + (racing ? 1.7 : 0.8) + Math.random() * 0.8 : half + 0.9 + Math.random() * 1.9) : kind === 'bike' ? half + 0.75 : half - 1.1;
      const pt = pointOn(r.pts, at, side);
      const d = Math.hypot(pt.x - p.x, pt.z - p.z);
      if (d < NEAR || d > FAR) continue;
      // In a race, people turn up ahead of the riders (behind them nobody would see them).
      if (racing) {
        const yaw = this.g.yaw ?? 0;
        const along = (pt.x - p.x) * -Math.sin(yaw) + (pt.z - p.z) * -Math.cos(yaw);
        if (along < -10 && Math.random() < 0.85) continue;
      }
      if (kind === 'moto' ? this.g.buildingAt?.(pt.x, pt.z) || r.width < 9 : !this._free(pt.x, pt.z) || (!r.small && this._median(r.pts, at, side))) continue;
      const m = this._person(kind, r, at, side, pt);
      this.people.push(m);
      if (door) {
        // at a shop door: alone, on the phone or looking about, facing the street or the window
        m.phone = Math.random() < 0.55;
        m.heading = pt.heading + (Math.random() < 0.5 ? -Math.PI / 2 : Math.PI / 2);
        return;
      }
      // Friends: two walk together; those standing about are in twos and threes (more at a crossing), facing each other.
      if ((kind === 'walk' && Math.random() < 0.25) || kind === 'stand') {
        const more = kind === 'stand' ? 1 + (Math.random() < 0.4 ? 1 : 0) + (corner && Math.random() < 0.5 ? 1 : 0) : 1;
        for (let k = 1; k <= more; k++) {
          const a = (k / (more + 1)) * Math.PI * 2;
          const off = kind === 'stand' ? { x: Math.cos(a) * 0.75, z: Math.sin(a) * 0.75 } : null;
          const side2 = kind === 'stand' ? side : side + (side + 0.6 < half + 2.9 ? 0.6 : -0.6);
          const pt2 = off ? { x: pt.x + off.x, z: pt.z + off.z, heading: 0 } : pointOn(r.pts, at, side2);
          if (!this._free(pt2.x, pt2.z)) continue;
          const friend = this._person(kind, r, at, side2, pt2);
          if (kind === 'stand') {
            friend.heading = Math.atan2(-(pt.x - pt2.x), -(pt.z - pt2.z));
            m.heading = Math.atan2(-(pt2.x - pt.x), -(pt2.z - pt.z));
          } else friend.phase = m.phase + 0.5;
          this.people.push(friend);
        }
      }
      return;
    }
  }

  _person(kind, road, at, side, pt) {
    const sporty = kind === 'jog';
    return {
      kind,
      road,
      at,
      side,
      x: pt.x,
      z: pt.z,
      y: null,
      heading: kind === 'stand' ? pt.heading + (Math.random() < 0.5 ? Math.PI / 2 : 0) : pt.heading,
      speed: { walk: 1.05 + Math.random() * 0.55, jog: 2.6 + Math.random() * 0.8, dog: 0.85 + Math.random() * 0.3, shop: 1.0 + Math.random() * 0.35, stand: 0, bike: 3.6 + Math.random() * 2.2, moto: 7.5 + Math.random() * 3 }[kind],
      phase: Math.random() * 10,
      scale: 0.9 + Math.random() * 0.16,
      top: col(sporty ? pick(SPORT) : pick(TOPS)),
      legs: col(sporty ? pick(['#1b1c20', '#25272d', '#3d4350']) : pick(LEGS)),
      skin: col(pick(SKIN)),
      hair: col(pick(HAIR)),
      long: Math.random() < 0.42,
      phone: kind === 'stand' && Math.random() < 0.45,
      share: kind === 'bike' && Math.random() < 0.45,
      bike: col(kind === 'moto' ? pick(['#e9e9e6', '#c8322b', '#2a2c31', '#1f5bb5']) : pick(BIKES)),
      cargo: col(pick(BOXES)),
      dog: col(pick(DOGS)),
      bags: [col(pick(BAGS)), Math.random() < 0.5 ? col(pick(BAGS)) : null]
    };
  }

  /** A strip between two carriageways (another road just beyond it): no pavement, nobody walks there. */
  _median(pts, at, side) {
    const out = pointOn(pts, at, side + 2.6);
    return this.g.onRoad?.(out.x, out.z, 0);
  }

  /** Off every road, outside every building, not in the river. */
  _free(x, z) {
    // (nor in a race's short-cut golmok: those are kept clear to race down)
    return !this.g.onRoad?.(x, z, 0.2) && !this.g.buildingAt?.(x, z) && !this.g.waterAt?.(x, z) && !(this.g.mode === 'race' && (this.g.race?.keepClear?.(x, z) || this.g.race?.atCorner?.(x, z)));
  }

  update(dt) {
    if (!this.g.roadTiles) return;
    this.time += dt;
    const p = this.g.pos;
    const high = this.g.mode === 'fly' && p.y - this.g.groundAt(p.x, p.z) > 150;
    this.group.visible = !high;
    if (high) return;
    // Too far: gone. Too few: more, a handful a second.
    for (const m of this.people) if (Math.hypot(m.x - p.x, m.z - p.z) >= GONE) m.gone = true;
    this.people = this.people.filter((m) => !m.gone);
    this._spawnT -= dt;
    if (this._spawnT <= 0) {
      this._spawnT = 0.03;
      const count = {};
      for (const m of this.people) count[m.kind] = (count[m.kind] ?? 0) + 1;
      for (const [k, want] of Object.entries(CROWD)) if ((count[k] ?? 0) < want) this._spawn(k);
    }
    for (const m of this.people) this._move(m, dt);
    for (const m of this.fans) {
      m.phase += dt;
      if (m.handlePos) {
        m.x = m.handlePos.x;
        m.y = m.handlePos.y;
        m.z = m.handlePos.z;
      }
    }
    this._all = this.people.concat(this.fans);
    // Who is near enough to be a real person (on foot, or a fan at the barriers).
    for (const m of this.people) m.onFoot = REAL.has(m.kind);
    for (const m of this.fans) m.onFoot = true;
    this.folk.update(dt, this._all ?? (this._all = []), this.g.camera ?? { position: p });
    this._pose();
  }

  /** People within `r` metres of a point (everyone moving or standing about; not a race's fans). */
  near(x, z, r) {
    return this.people.filter((m) => Math.abs(m.x - x) < r && Math.abs(m.z - z) < r);
  }

  /**
   * Make way: people ahead of (x, z, heading) within `range` step to the side away from the line,
   * hurrying; with `loud` (an air horn) further, and the bikes and scooters pull over too.
   */
  shoo(x, z, heading, range, loud = false) {
    const fx = -Math.sin(heading);
    const fz = -Math.cos(heading);
    for (const m of this.near(x, z, range)) {
      if (!loud && !ON_FOOT.has(m.kind)) continue;
      const dx = m.x - x;
      const dz = m.z - z;
      const along = dx * fx + dz * fz;
      const side = dx * -fz + dz * fx;
      if (along < 0 || along > range || Math.abs(side) > (loud ? 5 : 3)) continue;
      const s = side >= 0 ? 1 : -1;
      const by = (loud ? 2.4 : 1.5) - Math.abs(side) * 0.3;
      if (by <= 0) continue;
      m.tx = -fz * s * by;
      m.tz = fx * s * by;
      m.aside = loud ? 3.5 : 2.5;
      m.waiting = Math.max(m.waiting ?? 0, 0.8);
    }
  }

  /** Knocked by a bike at (x, z): a stagger back, and a moment stood still. */
  bump(m, x, z) {
    const dx = m.x - x;
    const dz = m.z - z;
    const d = Math.hypot(dx, dz) || 1;
    m.tx = (m.ox ?? 0) + (dx / d) * 1.2;
    m.tz = (m.oz ?? 0) + (dz / d) * 1.2;
    m.aside = 3;
    m.waiting = 3;
  }

  _move(m, dt) {
    // Walkers stop now and then (a shop window, a crossing); those standing about stay.
    if (m.kind === 'walk' || m.kind === 'shop' || m.kind === 'dog') {
      if (!(m.waiting > 0) && Math.random() < dt * (m.kind === 'dog' ? 0.12 : 0.05)) m.waiting = 2 + Math.random() * 7;
    }
    if (m.kind === 'stand' || m.waiting > 0) {
      m.waiting -= dt;
      m.stride = Math.max(0, (m.stride ?? 0) - dt * 3);
    } else {
      m.stride = Math.min(1, (m.stride ?? 0) + dt * 3);
      const next = follow(m.road.pts, m.at, m.speed * dt);
      if (next.end) next.dir = -next.dir;
      const pt = pointOn(m.road.pts, next, m.side);
      const blocked = m.kind === 'moto' ? this.g.buildingAt?.(pt.x, pt.z) : !this._free(pt.x, pt.z) || (ON_FOOT.has(m.kind) && !m.road.small && this._median(m.road.pts, next, m.side));
      if (blocked) {
        // Something in the way (a crossing, a building, the other road): back the way they came.
        m.at = { ...m.at, dir: -m.at.dir };
        if (m.kind === 'moto') m.side = -m.side;
      } else {
        m.at = next;
        m.bx = pt.x;
        m.bz = pt.z;
        m.heading += angle(m.heading, pt.heading) * Math.min(1, dt * (ON_FOOT.has(m.kind) ? 5 : 3));
      }
    }
    // Stepping aside (a bell, a horn, a bump), and back again after.
    m.bx ??= m.x;
    m.bz ??= m.z;
    m.aside = Math.max(0, (m.aside ?? 0) - dt);
    const k = Math.min(1, dt * (m.aside > 0 ? 6 : 0.8));
    m.ox = (m.ox ?? 0) + ((m.aside > 0 ? m.tx : 0) - (m.ox ?? 0)) * k;
    m.oz = (m.oz ?? 0) + ((m.aside > 0 ? m.tz : 0) - (m.oz ?? 0)) * k;
    m.x = m.bx + m.ox;
    m.z = m.bz + m.oz;
    // On the pavement: as high as the road beside it and the kerb; a motorbike on the road. Near the
    // camera, on what is really under their feet (surface.js: the pavement, the road, an alley's paving,
    // at its level), every frame; further off a guess from the land, a few times a second. Only
    // a step (a kerb) is eased: up and down a steep street the feet keep to it (eased as a whole, they
    // trailed the slope by a few centimetres, more at a jog).
    const ground = this.g.groundAt(m.x, m.z);
    // (the street's level over the land here: a hill street stands level across, over the slope — roadLevel.js)
    const lift = Math.max(0, (this.g.baseAt?.(m.x, m.z) ?? ground) - ground);
    const cam = this.g.camera?.position;
    const near = cam && this.g.surfaceAt && Math.abs(m.x - cam.x) < FEET_NEAR && Math.abs(m.z - cam.z) < FEET_NEAR;
    m.yT = (m.yT ?? 0) - dt;
    // (In a small street, at road level: there is no kerb.)
    const guess = (m.road?.small ? 0.9 : m.kind === 'moto' ? 0.9 : m.kind === 'bike' ? 0.92 : 1.04) + lift;
    // What is drawn under them (no crack bridged: they stand on what is there). A small street is laid only
    // where a race runs down it (golmok.js): any other is the bare land, and they walk on that — not at road
    // level in the air over it.
    const under = () => this.g.surfaceAt(m.x, m.z, (m.y ?? ground + lift + 1) + 0.4, false, true) - ground;
    if (near) {
      // (where no pavement is laid by a main road — a side street's mouth, a corner — on the land there too:
      // not in the air at the pavement's height)
      m.overGoal = Math.max(0, Math.min(1.3 + lift, under()));
    } else if (m.yT <= 0 || m.overGoal == null) {
      m.yT = 0.35;
      m.overGoal = m.road?.small && this.g.surfaceAt ? Math.max(0, Math.min(1.3 + lift, under())) : guess;
    }
    m.over ??= m.overGoal;
    m.over += (m.overGoal - m.over) * Math.min(1, dt * (near ? 12 : 6));
    m.y = ground + m.over;
    m.yGoal = m.y;
    const rate = { walk: 3.6, jog: 2.7, dog: 3.6, shop: 3.6, stand: 0, bike: 1.7, moto: 2.6 }[m.kind];
    m.phase += dt * m.speed * rate * (m.stride ?? 1) + (m.kind === 'stand' ? dt : 0);
  }

  /** The walkers' dogs (the people themselves are folk.js's real bodies; nobody without one is drawn). */
  _pose() {
    const P = this.parts;
    const n = {};
    for (const k of Object.keys(P)) n[k] = 0;
    const put = (part, color = null) => {
      const mesh = P[part];
      const i = n[part]++;
      if (i >= mesh.instanceMatrix.count) return;
      mesh.setMatrixAt(i, mPart);
      if (color && mesh.instanceColor) mesh.setColorAt(i, color);
    };
    /** mPart = base × a part at (x, y, z), turned (rx, ry, rz), sized (sy along its length). */
    const at = (x, y, z, rx = 0, ry = 0, rz = 0, sy = 1) => {
      e.set(rx, ry, rz, 'YXZ');
      q.setFromEuler(e);
      mPart.compose(v.set(x, y, z), q, sc.set(1, sy, 1)).premultiply(mBase);
    };
    for (const m of this.people) {
      if (!m.real || m.kind !== 'dog') continue;
      tmp.position.set(m.x, m.y, m.z);
      tmp.rotation.set(0, m.heading, 0);
      tmp.scale.setScalar(m.scale);
      tmp.updateMatrix();
      mBase.copy(tmp.matrix);
      this._dog(m, put, at, m.stride ?? 1);
    }
    for (const [k, mesh] of Object.entries(P)) {
      mesh.count = Math.min(n[k], mesh.instanceMatrix.count);
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  /** A small dog trotting ahead and to the right, on a lead to the walker's hand; it stops to sniff. */
  _dog(m, put, at, stride) {
    const t = m.phase * 1.8;
    const dx = 0.55;
    const dz = -0.75;
    const trot = Math.sin(t * 1.6) * 0.5 * stride;
    const sniff = (1 - stride) * 0.35;
    at(dx, 0.27 + Math.abs(Math.sin(t * 1.6)) * 0.02 * stride, dz);
    put('dogBody', m.dog);
    at(dx, 0.36 - sniff * 0.5, dz - 0.24, sniff);
    put('dogHead', m.dog);
    for (const [lx, lz, ph] of [[-0.06, -0.12, 0], [0.06, -0.12, Math.PI], [-0.06, 0.12, Math.PI], [0.06, 0.12, 0]]) {
      at(dx + lx, 0.2, dz + lz, Math.sin(t * 1.6 + ph) * 0.5 * stride);
      put('dogLeg', m.dog);
    }
    at(dx, 0.32, dz + 0.2, -0.6 + Math.sin(this.time * 9 + m.phase) * 0.15, Math.sin(this.time * 9 + m.phase) * 0.5);
    put('dogTail', m.dog);
    // The lead: from the hand (0.215, ~0.95, −0.27) down to the collar.
    const hx = 0.225;
    const hy = 0.97;
    const hz = -0.3;
    const cx = dx;
    const cy = 0.36;
    const cz = dz - 0.14;
    const len = Math.hypot(cx - hx, cy - hy, cz - hz);
    const dir = new THREE.Vector3(cx - hx, cy - hy, cz - hz).normalize();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    mPart.compose(v.set(hx, hy, hz), q, sc.set(1, len, 1)).premultiply(mBase);
    put('leash');
    void trot;
  }

  dispose() {
    this.folk.dispose();
    this.g.scene.remove(this.group);
    for (const m of Object.values(this.parts)) {
      m.geometry.dispose();
      m.dispose();
    }
  }
}
