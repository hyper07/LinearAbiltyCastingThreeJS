import * as THREE from 'three';
import { follow, pointOn } from './drive.js';

/**
 * Street life: ordinary people on Seoul's pavements — walking, jogging,
 * walking the dog, coming back from the shops with bags, standing about in
 * twos and threes or on the phone — people on bikes (a good share on the
 * city's green share-bikes, with a basket) along the pavement's edge, and
 * delivery riders on motorbikes with a box on the back, along the edge of
 * the road (not in a race: the course is closed).
 *
 * Hundreds of them cost little: every body part is one instanced draw for
 * all of them (a torso for everyone, a head for everyone…), posed each frame
 * from a few numbers (a stride, a pedal stroke).
 *
 *   const life = new StreetLife(game);   // game: the SeoulGame
 *   life.update(dt);                       // every frame
 */

/** How many of each, near you. */
export const CROWD = { walk: 70, jog: 12, dog: 14, shop: 24, stand: 26, bike: 14, moto: 10 };
const ON_FOOT = new Set(['walk', 'jog', 'dog', 'shop', 'stand']);
const NEAR = 12;
const FAR = 150;
const GONE = 200;

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

/** A part's shape, its pivot at the origin (limbs hang down from it). Forward is −Z. */
function shapes() {
  const limb = (r, len) => new THREE.CapsuleGeometry(r, len, 3, 8).translate(0, -(len / 2 + r * 0.6), 0);
  const bar = (a, b, r = 0.02) => {
    const d = new THREE.Vector3().subVectors(b, a);
    const g = new THREE.CylinderGeometry(r, r, d.length(), 5);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return g;
  };
  const P = (y, z) => new THREE.Vector3(0, y, z);
  const frame = merge([bar(P(0.33, 0.52), P(0.42, -0.02)), bar(P(0.42, -0.02), P(0.85, -0.12)), bar(P(0.85, -0.12), P(0.88, -0.48)), bar(P(0.42, -0.02), P(0.33, -0.52)), bar(P(0.85, -0.12), P(0.33, -0.52)), bar(P(0.88, -0.48), P(0.33, 0.52)), bar(P(0.88, -0.48), P(1.0, -0.42)), bar(new THREE.Vector3(-0.24, 1.02, -0.44), new THREE.Vector3(0.24, 1.02, -0.44), 0.016), new THREE.BoxGeometry(0.12, 0.05, 0.24).translate(0, 0.95, -0.12)]);
  // A delivery motorbike: a step-through body, a seat, front cowl and bars.
  const moto = merge([
    new THREE.BoxGeometry(0.36, 0.3, 1.0).translate(0, 0.5, 0.05),
    new THREE.CapsuleGeometry(0.17, 0.5, 4, 8).rotateX(Math.PI / 2).translate(0, 0.72, 0.2),
    new THREE.BoxGeometry(0.3, 0.7, 0.24).translate(0, 0.75, -0.52),
    bar(new THREE.Vector3(-0.34, 1.12, -0.6), new THREE.Vector3(0.34, 1.12, -0.6), 0.02),
    new THREE.BoxGeometry(0.2, 0.12, 0.08).translate(0, 1.05, -0.66)
  ]);
  return {
    leg: limb(0.062, 0.72),
    arm: limb(0.046, 0.5),
    torso: new THREE.CapsuleGeometry(0.17, 0.36, 4, 10).scale(1, 1, 0.62),
    head: new THREE.SphereGeometry(0.105, 12, 10).scale(0.92, 1.08, 1),
    hair: new THREE.SphereGeometry(0.113, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58).scale(0.95, 1.1, 1.05).translate(0, 0.012, 0.008),
    // Long hair: down the back of the head to the shoulders.
    long: new THREE.CapsuleGeometry(0.1, 0.16, 3, 8).scale(1.05, 1, 0.7).translate(0, -0.1, 0.05),
    helmet: new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
    phone: new THREE.BoxGeometry(0.035, 0.14, 0.07),
    bag: new THREE.BoxGeometry(0.1, 0.32, 0.28).translate(0, -0.18, 0),
    wheel: new THREE.TorusGeometry(0.33, 0.028, 6, 22).rotateY(Math.PI / 2),
    tyre: new THREE.TorusGeometry(0.25, 0.065, 6, 18).rotateY(Math.PI / 2),
    frame,
    basket: new THREE.BoxGeometry(0.34, 0.22, 0.26).translate(0, 0.92, -0.66),
    moto,
    box: new THREE.BoxGeometry(0.48, 0.44, 0.46).translate(0, 1.05, 0.44),
    // A small dog (a maltese, a poodle, a shiba): body, head, ears, four legs, a tail.
    dogBody: new THREE.CapsuleGeometry(0.1, 0.24, 4, 8).rotateX(Math.PI / 2),
    dogHead: merge([new THREE.SphereGeometry(0.085, 10, 8), new THREE.SphereGeometry(0.045, 8, 6).translate(0, -0.02, -0.08), new THREE.SphereGeometry(0.035, 6, 5).translate(-0.06, 0.04, 0.02), new THREE.SphereGeometry(0.035, 6, 5).translate(0.06, 0.04, 0.02)]),
    dogLeg: new THREE.CylinderGeometry(0.025, 0.022, 0.16, 5).translate(0, -0.08, 0),
    dogTail: new THREE.CapsuleGeometry(0.025, 0.1, 2, 5).translate(0, 0.06, 0),
    leash: new THREE.CylinderGeometry(0.006, 0.006, 1, 4).translate(0, 0.5, 0)
  };
}

export class StreetLife {
  /** @param {any} game the SeoulGame */
  constructor(game) {
    this.g = game;
    this.people = [];
    this.group = new THREE.Group();
    game.scene.add(this.group);
    const s = shapes();
    const all = Object.values(CROWD).reduce((a, b) => a + b, 0) + 30 + 120; // and room for a race's spectators
    const mat = new THREE.MeshLambertMaterial();
    const draw = (geo, n, color = null) => {
      const m = new THREE.InstancedMesh(geo, color ? new THREE.MeshLambertMaterial({ color }) : mat, n);
      m.count = 0;
      m.frustumCulled = false;
      if (!color) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
      this.group.add(m);
      return m;
    };
    this.parts = {
      torso: draw(s.torso, all),
      head: draw(s.head, all),
      hair: draw(s.hair, all),
      long: draw(s.long, all),
      helmet: draw(s.helmet, CROWD.moto + 4),
      armL: draw(s.arm, all),
      armR: draw(s.arm, all),
      legL: draw(s.leg, all),
      legR: draw(s.leg, all),
      phone: draw(s.phone, all, '#202226'),
      bag: draw(s.bag, CROWD.shop * 2 + 4),
      wheel: draw(s.wheel, CROWD.bike * 2 + 4, '#1b1b1d'),
      tyre: draw(s.tyre, CROWD.moto * 2 + 4, '#1b1b1d'),
      frame: draw(s.frame, CROWD.bike + 2),
      basket: draw(s.basket, CROWD.bike + 2, '#3c4a3f'),
      moto: draw(s.moto, CROWD.moto + 2),
      box: draw(s.box, CROWD.moto + 2),
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

  /** A new person of a kind, somewhere near, where they belong. */
  _spawn(kind) {
    const roads = this._roads();
    if (!roads.length) return;
    const p = this.g.pos;
    for (let tries = 0; tries < 40; tries++) {
      const r = pick(roads);
      const n = r.pts.length / 2 - 1;
      const at = { i: Math.floor(Math.random() * n), t: Math.random(), dir: Math.random() < 0.5 ? 1 : -1 };
      const half = r.width / 2;
      // On foot, anywhere across the pavement (3 m); bikes along its road-side edge; motorbikes in the road, by the kerb.
      const side = ON_FOOT.has(kind) ? half + 0.9 + Math.random() * 1.9 : kind === 'bike' ? half + 0.75 : half - 1.1;
      const pt = pointOn(r.pts, at, side);
      const d = Math.hypot(pt.x - p.x, pt.z - p.z);
      if (d < NEAR || d > FAR) continue;
      if (kind === 'moto' ? this.g.buildingAt?.(pt.x, pt.z) || r.width < 9 : !this._free(pt.x, pt.z) || this._median(r.pts, at, side)) continue;
      const m = this._person(kind, r, at, side, pt);
      this.people.push(m);
      // Friends: two walk together; those standing about are in twos and threes, facing each other.
      if ((kind === 'walk' && Math.random() < 0.25) || kind === 'stand') {
        const more = kind === 'stand' ? 1 + (Math.random() < 0.4 ? 1 : 0) : 1;
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
    return !this.g.onRoad?.(x, z, 0.2) && !this.g.buildingAt?.(x, z) && !this.g.waterAt?.(x, z);
  }

  update(dt) {
    if (!this.g.roadTiles) return;
    this.time += dt;
    const p = this.g.pos;
    const high = this.g.mode === 'fly' && p.y - this.g.groundAt(p.x, p.z) > 150;
    this.group.visible = !high;
    if (high) return;
    const racing = this.g.mode === 'race';
    // Too far: gone (and the motorbikes, when a race closes the roads). Too few: more, a handful a second.
    this.people = this.people.filter((m) => Math.hypot(m.x - p.x, m.z - p.z) < GONE && !(racing && m.kind === 'moto'));
    this._spawnT -= dt;
    if (this._spawnT <= 0) {
      this._spawnT = 0.03;
      const count = {};
      for (const m of this.people) count[m.kind] = (count[m.kind] ?? 0) + 1;
      for (const [k, want] of Object.entries(CROWD)) if ((count[k] ?? 0) < (racing ? (k === 'moto' ? 0 : want * 0.8) : want)) this._spawn(k);
    }
    for (const m of this.people) this._move(m, dt);
    for (const m of this.fans) m.phase += dt;
    this._pose();
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
      const blocked = m.kind === 'moto' ? this.g.buildingAt?.(pt.x, pt.z) : !this._free(pt.x, pt.z) || (ON_FOOT.has(m.kind) && this._median(m.road.pts, next, m.side));
      if (blocked) {
        // Something in the way (a crossing, a building, the other road): back the way they came.
        m.at = { ...m.at, dir: -m.at.dir };
        if (m.kind === 'moto') m.side = -m.side;
      } else {
        m.at = next;
        m.x = pt.x;
        m.z = pt.z;
        m.heading += angle(m.heading, pt.heading) * Math.min(1, dt * (ON_FOOT.has(m.kind) ? 5 : 3));
      }
    }
    // On the pavement: as high as the road beside it and the kerb; a motorbike on the road.
    m.yT = (m.yT ?? 0) - dt;
    if (m.yT <= 0 || m.y == null) {
      m.yT = 0.35;
      m.yGoal = this.g.groundAt(m.x, m.z) + (m.kind === 'moto' ? 0.9 : m.kind === 'bike' ? 0.92 : 1.04);
      m.y ??= m.yGoal;
    }
    m.y += (m.yGoal - m.y) * Math.min(1, dt * 6);
    const rate = { walk: 3.6, jog: 2.7, dog: 3.6, shop: 3.6, stand: 0, bike: 1.7, moto: 2.6 }[m.kind];
    m.phase += dt * m.speed * rate * (m.stride ?? 1) + (m.kind === 'stand' ? dt : 0);
  }

  /** Every part of everyone, from their place and stride. */
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
    const head = (m, y, z = -0.01, turn = 0, nod = 0) => {
      at(0, y, z, nod, turn);
      put('head', m.skin);
      if (m.kind === 'moto') {
        put('helmet', m.cargo);
        return;
      }
      put('hair', m.hair);
      if (m.long) put('long', m.hair);
    };
    for (const m of [...this.people, ...this.fans]) {
      if (m.handlePos) {
        m.x = m.handlePos.x;
        m.y = m.handlePos.y;
        m.z = m.handlePos.z;
      }
      tmp.position.set(m.x, m.y, m.z);
      tmp.rotation.set(0, m.heading, 0);
      tmp.scale.setScalar(m.scale);
      tmp.updateMatrix();
      mBase.copy(tmp.matrix);
      const s = Math.sin(m.phase);
      const c = Math.cos(m.phase);
      if (m.kind === 'fan') {
        this._fan(m, put, at, head);
      } else if (ON_FOOT.has(m.kind)) {
        const stride = m.stride ?? 1;
        const jog = m.kind === 'jog';
        const swing = s * (jog ? 0.75 : 0.42) * stride;
        const bob = Math.abs(c) * (jog ? 0.07 : 0.035) * stride;
        // Standing, a little sway and a look about; talking, a nod and a gesture.
        const idle = (1 - stride) * Math.sin(this.time * 0.9 + m.phase) * 0.05;
        const talk = m.kind === 'stand' ? Math.sin(this.time * 2.1 + m.phase * 3) : 0;
        at(0, 1.2 + bob, 0, (jog ? -0.12 : -0.04) * stride, idle * 3, idle);
        put('torso', m.top);
        head(m, 1.6 + bob, -0.01, idle * 6 + talk * 0.08, m.phone ? 0.25 : talk * 0.04);
        // Arms: swinging; bent and pumping when jogging; one to the ear on the phone; one on the lead; bags in both hands.
        const armX = 0.215;
        if (m.phone) {
          at(-armX, 1.47, 0, 0.1, 0, 0.06);
          put('armL', m.top);
          at(armX, 1.47, -0.02, 2.6, 0, -0.35);
          put('armR', m.top);
          at(0.1, 1.66, -0.04, 0, 0, 0);
          put('phone');
        } else {
          const bend = jog ? 0.9 : m.kind === 'stand' ? Math.max(0, talk) * 0.6 : 0;
          at(-armX, 1.47 + bob, 0, swing * 0.85 + bend, 0, 0.06);
          put('armL', m.top);
          at(armX, 1.47 + bob, 0, m.kind === 'dog' ? 0.55 : -swing * 0.85 + bend * (jog ? 1 : 0.3), 0, -0.06);
          put('armR', m.top);
        }
        if (m.kind === 'shop') {
          at(-armX - 0.03, 0.97 + bob, swing * 0.18);
          put('bag', m.bags[0]);
          if (m.bags[1]) {
            at(armX + 0.03, 0.97 + bob, -swing * 0.18);
            put('bag', m.bags[1]);
          }
        }
        at(-0.09, 0.93 + bob, 0, -swing);
        put('legL', m.legs);
        at(0.09, 0.93 + bob, 0, swing);
        put('legR', m.legs);
        if (m.kind === 'dog') this._dog(m, put, at, stride);
      } else {
        const bike = m.kind === 'bike';
        // The rider: leaning to the bars, legs on the pedals going round (or on the footboard).
        const lean = bike ? 0.42 : 0.15;
        const hip = bike ? 1.0 : 0.88;
        at(0, hip + 0.3, 0.02, -lean);
        put('torso', m.top);
        head(m, hip + 0.68, bike ? -0.14 : -0.05);
        at(-0.2, hip + 0.55, -0.12, 1.05 - lean * 0.3, 0, 0.08);
        put('armL', m.top);
        at(0.2, hip + 0.55, -0.12, 1.05 - lean * 0.3, 0, -0.08);
        put('armR', m.top);
        if (bike) {
          at(-0.1, hip, 0.04, 1.0 + s * 0.45);
          put('legL', m.legs);
          at(0.1, hip, 0.04, 1.0 - s * 0.45);
          put('legR', m.legs);
          at(0, 0, 0);
          put('frame', m.share ? col('#3aa65a') : m.bike);
          if (m.share) put('basket');
          at(0, 0.33, 0.52, m.phase * 2.2);
          put('wheel');
          at(0, 0.33, -0.52, m.phase * 2.2);
          put('wheel');
        } else {
          at(-0.13, hip, -0.02, 1.25);
          put('legL', m.legs);
          at(0.13, hip, -0.02, 1.25);
          put('legR', m.legs);
          at(0, 0, 0);
          put('moto', m.bike);
          put('box', m.cargo);
          at(0, 0.32, 0.52, m.phase * 3);
          put('tyre');
          at(0, 0.32, -0.6, m.phase * 3);
          put('tyre');
        }
      }
    }
    for (const [k, mesh] of Object.entries(P)) {
      mesh.count = Math.min(n[k], mesh.instanceMatrix.count);
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  /** A race spectator: clapping when it is quiet, arms up and hopping as cars come by, or filming. */
  _fan(m, put, at, head) {
    const c = m.cheer ?? 0.15;
    const t = this.time * (6 + c * 4) + m.phase * 3;
    const hop = c > 0.6 ? Math.abs(Math.sin(t * 0.9)) * 0.14 * c : 0;
    at(0, 1.2 + hop, 0, -0.05 + c * 0.05, Math.sin(this.time * 0.7 + m.phase) * 0.15);
    put('torso', m.top);
    head(m, 1.6 + hop, -0.01, Math.sin(this.time * 0.9 + m.phase) * 0.3 * (1 - c), m.phone ? 0.2 : -0.1 * c);
    if (m.phone) {
      // Filming: both hands holding the phone up in front.
      at(-0.2, 1.47 + hop, 0, 1.7, 0, -0.35);
      put('armL', m.top);
      at(0.2, 1.47 + hop, 0, 1.7, 0, 0.35);
      put('armR', m.top);
      at(0, 1.7 + hop, -0.42, 0.2);
      put('phone');
    } else if (c > 0.6) {
      // Arms up, waving.
      const wave = Math.sin(t) * 0.35;
      at(-0.215, 1.47 + hop, 0, 2.9 + wave, 0, 0.35);
      put('armL', m.top);
      at(0.215, 1.47 + hop, 0, 2.9 - wave, 0, -0.35);
      put('armR', m.top);
    } else {
      // Clapping in front.
      const clap = Math.abs(Math.sin(t * 1.4)) * 0.25;
      at(-0.215, 1.47, 0, 1.2, 0, -0.45 + clap);
      put('armL', m.top);
      at(0.215, 1.47, 0, 1.2, 0, 0.45 - clap);
      put('armR', m.top);
    }
    at(-0.09, 0.93 + hop, 0, 0);
    put('legL', m.legs);
    at(0.09, 0.93 + hop, 0, 0);
    put('legR', m.legs);
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
    this.g.scene.remove(this.group);
    for (const m of Object.values(this.parts)) {
      m.geometry.dispose();
      m.dispose();
    }
  }
}
