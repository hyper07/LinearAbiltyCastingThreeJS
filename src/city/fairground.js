import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * A fairground of our own beside a course (the Jamsil Fairground course, by
 * Seokchon Lake): the "Starlight Fun Fair · 별빛 놀이공원" — every ride our
 * own design, no real park's castle, mascot or name:
 *
 *   a wooden roller coaster   a lift hill, a big drop, camelbacks and a turn,
 *                             on a lattice of timber posts, a train of four
 *                             cars running round it (slow up the chain, fast
 *                             down the drops)
 *   a drop tower              a lattice tower with a ring of seats that climbs,
 *                             hangs at the top, and drops
 *   a big wheel               sixteen gondolas, kept level as it turns
 *   a carousel                a striped canopy, horses rising and falling
 *   a pirate-ship swing       a boat on an A-frame, swinging higher and higher
 *   bunting and lights        flags along the fence, strings of bulbs that
 *                             light up after dark with the rides' own bulbs
 *
 * and a fence along the course (solid: walls.js) with an arch at the gate.
 * The rides only move near you. Fairground sounds as you pass: a band
 * organ's waltz, the coaster's chain going clack-clack up the lift and
 * screams on the drops.
 *
 *   const fair = new Fairground(game, course);   // course.def.fair: { at: [x, z], side: ±1 }
 *   fair.update(dt);                             // each frame
 *   fair.dispose();
 */

const C = (hex) => new THREE.Color(hex);
const PAL = {
  timber: C('#a7773f'),
  timberDark: C('#7d5a32'),
  steel: C('#c9ced6'),
  red: C('#e2382f'),
  white: C('#f4f1ea'),
  yellow: C('#ffcc2e'),
  blue: C('#2f78d6'),
  teal: C('#20b3a4'),
  pink: C('#ff7bb0'),
  purple: C('#8a5bd6'),
  plaza: C('#a8977a'),
  fence: C('#2b4f8a'),
  hull: C('#8a4b2a'),
  sail: C('#f2ead8')
};
const FLAGS = ['#e2382f', '#ffcc2e', '#2f78d6', '#20b3a4', '#ff7bb0', '#8a5bd6', '#ffffff'];

/** A small seeded random. */
function rng(seed) {
  let h = (seed * 2654435761) >>> 0 || 1;
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

/** Geometry gathered piece by piece (each with its colour), merged into one mesh per material. */
class Pile {
  constructor() {
    this.parts = [];
  }
  add(geo, color, m4) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m4);
    g.deleteAttribute('uv');
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([color.r, color.g, color.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.parts.push(g);
  }
  mesh(material) {
    if (!this.parts.length) return null;
    const m = new THREE.Mesh(mergeGeometries(this.parts), material);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    m.castShadow = m.receiveShadow = true;
    return m;
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** A box between two points (a post, a beam, a brace), `w` thick. */
function beam(pile, geo, a, b, w, color) {
  const d = _v.subVectors(b, a);
  const len = d.length();
  if (len < 1e-4) return;
  _q.setFromUnitVectors(UP, d.normalize());
  _m.compose(_s.addVectors(a, b).multiplyScalar(0.5), _q, new THREE.Vector3(w, len, w));
  pile.add(geo, color, _m);
}

/**
 * The coaster's track in the park's own frame (x along the course, z away from it, y up), as a
 * closed curve: the station by the fence, the lift hill, the big drop into a turn, camelbacks
 * along the back, a turn round and home. Pure: the tests check it climbs, drops and closes.
 */
export function coasterTrack() {
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  return new THREE.CatmullRomCurve3([
    P(-46, 2.2, 12), P(-28, 2.2, 12), P(-12, 6, 12), P(4, 13, 12), P(16, 19, 12), P(24, 20.5, 13.5), P(31, 18, 18),
    P(35, 9, 25), P(32, 3.2, 32), P(22, 3, 38), P(10, 11, 40), P(-2, 4, 40), P(-16, 9.5, 40), P(-30, 3.5, 39),
    P(-44, 6.5, 36), P(-54, 5, 28), P(-55, 3, 19), P(-52, 2.4, 14)
  ], true, 'catmullrom', 0.5);
}

/** Where the train is: from the lift (slow, the chain) to the drops (fast), a speed for each point of the track. */
export function coasterSpeed(y, onLift) {
  if (onLift) return 3.2;
  return Math.max(4, Math.sqrt(2 * 9.81 * Math.max(0, 21.5 - y)) * 0.92);
}

export class Fairground {
  constructor(game, course) {
    this.g = game;
    this.course = course;
    const def = course.def?.fair ?? {};
    this.t = 0;
    this.group = new THREE.Group();
    this.group.name = 'fairground';
    game.scene.add(this.group);
    // The park's frame: at the course point nearest `at`, along the course there, on the `side` of it.
    const pts = course.points;
    const at = def.at ?? [pts[0][0], pts[0][1]];
    let bi = 0;
    let bd = Infinity;
    pts.forEach((p, i) => {
      const d = Math.hypot(p[0] - at[0], p[1] - at[1]);
      if (d < bd) [bd, bi] = [d, i];
    });
    const n = pts.length;
    const a = pts[(bi - 4 + n) % n];
    const b = pts[(bi + 4) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / L;
    const uz = (b[1] - a[1]) / L;
    const side = def.side ?? 1;
    // (away from the course: right of the way it runs is (−uz, ux))
    const vx = -uz * side;
    const vz = ux * side;
    const p = pts[bi];
    const edge = (p[2] ?? 10) / 2 + 3.5;
    this.origin = { x: p[0] + vx * edge, z: p[1] + vz * edge };
    this.frame = { ux, uz, vx, vz };
    this.ground = game.groundAt(this.origin.x, this.origin.z) + 0.9;
    this.group.position.set(this.origin.x, this.ground, this.origin.z);
    // local +z away from the course, local x along it (the way it runs on its right, back along it on its left)
    this.group.rotation.y = Math.atan2(vx, vz);
    this.group.updateMatrixWorld(true);
    this.mats = {
      solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 }),
      metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.6 }),
      bulb: new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffffff', emissiveIntensity: 0.2, roughness: 0.4, toneMapped: true }),
      flag: new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 })
    };
    // (the bulbs glow in their own colours)
    this.mats.bulb.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;');
    };
    this.box = new THREE.BoxGeometry(1, 1, 1);
    this.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
    this.ball = new THREE.SphereGeometry(0.5, 8, 6);
    this.rides = {};
    this._plaza();
    this._coaster();
    this._tower();
    this._wheel();
    this._carousel();
    this._ship();
    this._bunting();
    this._fence();
    this.near = false;
  }

  /** A point in the park (local x, y, z) in the world. */
  world(x, y, z) {
    return new THREE.Vector3(x, y, z).applyMatrix4(this.group.matrixWorld);
  }

  _plaza() {
    // paving under the whole fair, and a lamp post here and there (lit at night, for real)
    const pile = new Pile();
    // (a slab down into the land: the roads stand 0.9 m over it, and no edge of it floats)
    _m.compose(new THREE.Vector3(-14, -0.62, 30), _q.identity(), new THREE.Vector3(200, 1.24, 56));
    pile.add(this.box, PAL.plaza, _m);
    const lamps = [];
    for (const [x, z] of [[-75, 20], [-28, 18], [12, 22], [50, 34], [-60, 46]]) {
      _m.compose(new THREE.Vector3(x, 2.4, z), _q.identity(), new THREE.Vector3(0.14, 4.8, 0.14));
      pile.add(this.cyl, C('#3a3f4a'), _m);
      const w = this.world(x, 4.9, z);
      lamps.push({ x: w.x, y: w.y, z: w.z, ground: this.ground });
    }
    this.group.add(pile.mesh(this.mats.solid));
    // (their light is the bulbs' own: the city's lamp pools here washed the whole fair out in a haze)
    void lamps;
  }

  /** The wooden coaster: timber bents under a track on two steel rails, and a train of four cars. */
  _coaster() {
    const curve = coasterTrack();
    this.track = curve;
    this.trackLen = curve.getLength();
    const wood = new Pile();
    const steel = new Pile();
    const bulbs = new Pile();
    const N = Math.round(this.trackLen / 2.2);
    const frames = curve.computeFrenetFrames(N, true);
    for (let i = 0; i < N; i++) {
      const u = i / N;
      const p = curve.getPointAt(u);
      const t = curve.getTangentAt(u);
      const side = new THREE.Vector3(-t.z, 0, t.x).normalize();
      // the bent: two posts to the ground, a cap beam, a brace (every other one an X)
      const l = p.clone().addScaledVector(side, 0.9);
      const r = p.clone().addScaledVector(side, -0.9);
      for (const q of [l, r]) beam(wood, this.box, new THREE.Vector3(q.x, 0, q.z), new THREE.Vector3(q.x, p.y - 0.25, q.z), 0.22, i % 2 ? PAL.timber : PAL.timberDark);
      beam(wood, this.box, new THREE.Vector3(l.x, p.y - 0.3, l.z), new THREE.Vector3(r.x, p.y - 0.3, r.z), 0.2, PAL.timberDark);
      if (p.y > 4) for (let y = 3; y < p.y - 1; y += 3.2) beam(wood, this.box, new THREE.Vector3(l.x, y, l.z), new THREE.Vector3(r.x, Math.min(p.y - 0.6, y + 2.6), r.z), 0.12, PAL.timberDark);
      // a bulb on every other bent's cap
      if (i % 3 === 0) {
        _m.compose(new THREE.Vector3(l.x, p.y - 0.05, l.z), _q.identity(), new THREE.Vector3(0.22, 0.22, 0.22));
        bulbs.add(this.ball, C(FLAGS[i % 6]), _m);
      }
    }
    void frames;
    // the rails and the timber track bed under them
    for (const o of [-0.55, 0.55]) {
      const pts = [];
      for (let i = 0; i <= 240; i++) {
        const u = (i % 240) / 240;
        const p = curve.getPointAt(u);
        const t = curve.getTangentAt(u);
        pts.push(p.addScaledVector(new THREE.Vector3(-t.z, 0, t.x).normalize(), o));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 480, 0.09, 6, true);
      steel.add(tube, PAL.steel, _m.identity());
      tube.dispose();
    }
    const bed = [];
    for (let i = 0; i < 480; i++) {
      const u0 = i / 480;
      const u1 = (i + 1) / 480;
      const quad = [];
      for (const u of [u0, u1]) {
        const p = curve.getPointAt(u % 1);
        const t = curve.getTangentAt(u % 1);
        const s = new THREE.Vector3(-t.z, 0, t.x).normalize();
        quad.push(p.clone().addScaledVector(s, 0.75).add(new THREE.Vector3(0, -0.12, 0)), p.clone().addScaledVector(s, -0.75).add(new THREE.Vector3(0, -0.12, 0)));
      }
      bed.push(quad[0], quad[1], quad[3], quad[0], quad[3], quad[2]);
    }
    const bedGeo = new THREE.BufferGeometry().setFromPoints(bed);
    bedGeo.computeVertexNormals();
    wood.add(bedGeo, PAL.timberDark, _m.identity());
    bedGeo.dispose();
    // the station: a roof on posts over the first stretch
    for (const x of [-44, -34, -24]) for (const z of [10, 14.5]) beam(wood, this.box, new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 5, z), 0.25, PAL.white);
    _m.compose(new THREE.Vector3(-34, 5.2, 12.2), _q.identity(), new THREE.Vector3(24, 0.4, 7));
    wood.add(this.box, PAL.red, _m);
    this.group.add(wood.mesh(this.mats.solid), steel.mesh(this.mats.metal), bulbs.mesh(this.mats.bulb));
    // the train: four cars, each a rounded tub with two seats
    const train = new THREE.Group();
    const cars = [];
    const carGeo = new THREE.BoxGeometry(1.5, 0.75, 2.0);
    const nose = new THREE.CylinderGeometry(0.75, 0.75, 1.5, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
    for (let k = 0; k < 4; k++) {
      const car = new THREE.Group();
      const pile = new Pile();
      pile.add(carGeo, k % 2 ? PAL.yellow : PAL.red, _m.makeTranslation(0, 0.55, 0));
      if (k === 0) pile.add(nose, PAL.yellow, _m.makeTranslation(0, 0.55, -1));
      pile.add(this.box, C('#26262c'), _m.compose(new THREE.Vector3(0, 0.95, 0.3), _q.identity(), new THREE.Vector3(1.3, 0.25, 0.5)));
      pile.add(this.box, C('#26262c'), _m.compose(new THREE.Vector3(0, 0.95, -0.5), _q.identity(), new THREE.Vector3(1.3, 0.25, 0.5)));
      car.add(pile.mesh(this.mats.solid));
      train.add(car);
      cars.push(car);
    }
    this.group.add(train);
    this.rides.coaster = { train, cars, u: 0, v: 3 };
  }

  /** The drop tower: a square lattice tower, lit up its corners, and the ring of seats. */
  _tower() {
    const H = 52;
    const at = new THREE.Vector3(64, 0, 22);
    const steel = new Pile();
    const bulbs = new Pile();
    const R = 1.6;
    for (const [dx, dz] of [[-R, -R], [R, -R], [R, R], [-R, R]]) beam(steel, this.box, new THREE.Vector3(at.x + dx, 0, at.z + dz), new THREE.Vector3(at.x + dx, H, at.z + dz), 0.3, PAL.steel);
    for (let y = 2; y < H; y += 2.6) {
      const c = [[-R, -R], [R, -R], [R, R], [-R, R]];
      for (let k = 0; k < 4; k++) {
        const [ax, az] = c[k];
        const [bx, bz] = c[(k + 1) % 4];
        beam(steel, this.box, new THREE.Vector3(at.x + ax, y, at.z + az), new THREE.Vector3(at.x + bx, y + 2.6, at.z + bz), 0.1, PAL.steel);
      }
      _m.compose(new THREE.Vector3(at.x + R + 0.05, y, at.z + R + 0.05), _q.identity(), new THREE.Vector3(0.25, 0.25, 0.25));
      bulbs.add(this.ball, C(y % 5 < 2.6 ? '#ff4ad2' : '#5ad2ff'), _m);
      _m.compose(new THREE.Vector3(at.x - R - 0.05, y, at.z - R - 0.05), _q.identity(), new THREE.Vector3(0.25, 0.25, 0.25));
      bulbs.add(this.ball, C(y % 5 < 2.6 ? '#5ad2ff' : '#ff4ad2'), _m);
    }
    // the cap and the name across the top
    _m.compose(new THREE.Vector3(at.x, H + 1, at.z), _q.identity(), new THREE.Vector3(5, 2, 5));
    steel.add(this.box, PAL.blue, _m);
    _m.compose(new THREE.Vector3(at.x, 0.5, at.z), _q.identity(), new THREE.Vector3(9, 1, 9));
    steel.add(this.cyl, PAL.white, _m);
    this.group.add(steel.mesh(this.mats.metal), bulbs.mesh(this.mats.bulb));
    // the ring of seats round the tower
    const car = new THREE.Group();
    const pile = new Pile();
    const ring = new THREE.TorusGeometry(3.2, 0.35, 8, 24).rotateX(Math.PI / 2);
    pile.add(ring, PAL.yellow, _m.identity());
    ring.dispose();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      _m.compose(new THREE.Vector3(Math.cos(a) * 3.6, -0.5, Math.sin(a) * 3.6), _q.setFromAxisAngle(UP, -a), new THREE.Vector3(0.9, 1.0, 0.7));
      pile.add(this.box, k % 2 ? PAL.red : PAL.blue, _m);
    }
    car.add(pile.mesh(this.mats.solid));
    car.position.copy(at).setY(3);
    this.group.add(car);
    this.rides.tower = { car, at, H, t: 0 };
  }

  /** The big wheel: a rim of bulbs on spokes, on an A-frame, sixteen gondolas kept level. */
  _wheel() {
    const at = new THREE.Vector3(-92, 19.5, 30);
    const Rr = 16;
    const frame = new Pile();
    for (const sz of [-2.2, 2.2]) for (const sx of [-9, 9]) beam(frame, this.box, new THREE.Vector3(at.x + sx, 0, at.z + sz), new THREE.Vector3(at.x, at.y, at.z + sz * 0.4), 0.55, PAL.white);
    beam(frame, this.box, new THREE.Vector3(at.x, at.y, at.z - 1.2), new THREE.Vector3(at.x, at.y, at.z + 1.2), 0.9, PAL.steel);
    this.group.add(frame.mesh(this.mats.metal));
    const wheel = new THREE.Group();
    wheel.position.copy(at);
    const metal = new Pile();
    const bulbs = new Pile();
    for (const z of [-0.8, 0.8]) {
      const rim = new THREE.TorusGeometry(Rr, 0.2, 6, 64);
      metal.add(rim, PAL.white, _m.makeTranslation(0, 0, z));
      rim.dispose();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        beam(metal, this.box, new THREE.Vector3(0, 0, z), new THREE.Vector3(Math.cos(a) * Rr, Math.sin(a) * Rr, z), 0.12, PAL.white);
      }
    }
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      _m.compose(new THREE.Vector3(Math.cos(a) * (Rr + 0.3), Math.sin(a) * (Rr + 0.3), 0.9), _q.identity(), new THREE.Vector3(0.28, 0.28, 0.28));
      bulbs.add(this.ball, C(FLAGS[k % 6]), _m);
    }
    wheel.add(metal.mesh(this.mats.metal), bulbs.mesh(this.mats.bulb));
    this.group.add(wheel);
    // the gondolas: one instanced draw, placed each frame (hanging level)
    const gon = new THREE.Group();
    const pile = new Pile();
    pile.add(new THREE.CylinderGeometry(1.1, 0.9, 1.6, 10), C('#ffffff'), _m.makeTranslation(0, -1.3, 0));
    pile.add(new THREE.ConeGeometry(1.2, 0.6, 10), C('#ffffff'), _m.makeTranslation(0, -0.2, 0));
    const gonGeo = mergeGeometries(pile.parts);
    pile.parts = [];
    const gondolas = new THREE.InstancedMesh(gonGeo, new THREE.MeshStandardMaterial({ roughness: 0.5 }), 16);
    for (let k = 0; k < 16; k++) gondolas.setColorAt(k, C(FLAGS[k % 6]));
    gondolas.castShadow = true;
    gon.add(gondolas);
    this.group.add(gon);
    this.rides.wheel = { wheel, gondolas, at, R: Rr, a: 0 };
  }

  /** The carousel: a striped canopy over a turning platform, horses on poles rising and falling. */
  _carousel() {
    const at = new THREE.Vector3(-8, 0, 27);
    const fixed = new Pile();
    _m.compose(new THREE.Vector3(at.x, 0.3, at.z), _q.identity(), new THREE.Vector3(16, 0.6, 16));
    fixed.add(this.cyl, PAL.white, _m);
    this.group.add(fixed.mesh(this.mats.solid));
    const spin = new THREE.Group();
    spin.position.set(at.x, 0.6, at.z);
    const pile = new Pile();
    const bulbs = new Pile();
    _m.compose(new THREE.Vector3(0, 0.15, 0), _q.identity(), new THREE.Vector3(14.5, 0.3, 14.5));
    pile.add(this.cyl, C('#c8a46a'), _m);
    _m.compose(new THREE.Vector3(0, 3.2, 0), _q.identity(), new THREE.Vector3(1.6, 6.4, 1.6));
    pile.add(this.cyl, PAL.yellow, _m);
    // the canopy: a cone of red and white segments
    for (let k = 0; k < 16; k++) {
      const seg = new THREE.ConeGeometry(8.2, 2.6, 16, 1, true, (k / 16) * Math.PI * 2, Math.PI / 8);
      pile.add(seg, k % 2 ? PAL.red : PAL.white, _m.makeTranslation(0, 7.6, 0));
      seg.dispose();
    }
    _m.compose(new THREE.Vector3(0, 6.1, 0), _q.identity(), new THREE.Vector3(16.6, 0.6, 16.6));
    pile.add(new THREE.CylinderGeometry(0.5, 0.5, 1, 32, 1, true), PAL.yellow, _m);
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      _m.compose(new THREE.Vector3(Math.cos(a) * 8.35, 5.9, Math.sin(a) * 8.35), _q.identity(), new THREE.Vector3(0.24, 0.24, 0.24));
      bulbs.add(this.ball, C(k % 2 ? '#ffe9a0' : '#ff7a7a'), _m);
    }
    spin.add(pile.mesh(this.mats.solid), bulbs.mesh(this.mats.bulb));
    // the horses: an instanced draw (body, neck and head as one shape), each on its pole
    const horse = new Pile();
    horse.add(this.box, C('#ffffff'), _m.compose(new THREE.Vector3(0, 0, 0), _q.identity(), new THREE.Vector3(0.45, 0.55, 1.3)));
    horse.add(this.box, C('#ffffff'), _m.compose(new THREE.Vector3(0, 0.45, -0.6), _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5), new THREE.Vector3(0.3, 0.8, 0.3)));
    horse.add(this.box, C('#ffffff'), _m.compose(new THREE.Vector3(0, 0.85, -0.85), _q.identity(), new THREE.Vector3(0.3, 0.3, 0.55)));
    for (const [x, z] of [[-0.15, -0.45], [0.15, -0.45], [-0.15, 0.45], [0.15, 0.45]]) horse.add(this.box, C('#ffffff'), _m.compose(new THREE.Vector3(x, -0.55, z), _q.identity(), new THREE.Vector3(0.1, 0.6, 0.1)));
    horse.add(this.cyl, C('#e8c25a'), _m.compose(new THREE.Vector3(0, 1.4, 0), _q.identity(), new THREE.Vector3(0.08, 5.2, 0.08)));
    const horseGeo = mergeGeometries(horse.parts);
    horse.parts = [];
    const horses = new THREE.InstancedMesh(horseGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }), 16);
    for (let k = 0; k < 16; k++) horses.setColorAt(k, C(['#ffffff', '#f3d2a2', '#c9a37a', '#f7f0e2'][k % 4]));
    horses.castShadow = true;
    spin.add(horses);
    this.group.add(spin);
    this.rides.carousel = { spin, horses, a: 0 };
  }

  /** The pirate ship: a hull with a mast and a sail, swinging on an A-frame. */
  _ship() {
    const at = new THREE.Vector3(34, 13, 50);
    const frame = new Pile();
    for (const sx of [-5.5, 5.5]) for (const sz of [-6, 6]) beam(frame, this.box, new THREE.Vector3(at.x + sx, 0, at.z + sz), new THREE.Vector3(at.x + sx * 0.15, at.y, at.z), 0.45, PAL.purple);
    beam(frame, this.box, new THREE.Vector3(at.x - 1, at.y, at.z), new THREE.Vector3(at.x + 1, at.y, at.z), 0.7, PAL.steel);
    this.group.add(frame.mesh(this.mats.metal));
    const swing = new THREE.Group();
    swing.position.copy(at);
    const pile = new Pile();
    // arms down to the hull, the hull (a stretched half-cylinder), its rails, a mast and a sail
    for (const sz of [-3, 3]) beam(pile, this.box, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -9.5, sz), 0.3, PAL.steel);
    const hull = new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2);
    pile.add(hull, PAL.hull, _m.compose(new THREE.Vector3(0, -10, 0), _q.identity(), new THREE.Vector3(2.6, 2.4, 12)));
    pile.add(this.box, PAL.yellow, _m.compose(new THREE.Vector3(0, -9.9, 0), _q.identity(), new THREE.Vector3(5.2, 0.25, 12.4)));
    pile.add(this.box, C('#5c3320'), _m.compose(new THREE.Vector3(0, -6.5, 0), _q.identity(), new THREE.Vector3(0.25, 7, 0.25)));
    pile.add(this.box, PAL.sail, _m.compose(new THREE.Vector3(0.1, -6, 0), _q.identity(), new THREE.Vector3(0.05, 4, 5)));
    swing.add(pile.mesh(this.mats.solid));
    this.group.add(swing);
    this.rides.ship = { swing, a: 0, amp: 0.2, t: 0 };
  }

  /** Flags on lines between poles along the fence, and strings of bulbs over the paths. */
  _bunting() {
    const flags = new Pile();
    const bulbs = new Pile();
    const poles = new Pile();
    const tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.25, 0, 0), new THREE.Vector3(0.25, 0, 0), new THREE.Vector3(0, -0.55, 0)]);
    tri.computeVertexNormals();
    const r = rng(5);
    const runs = [];
    for (let x = -108; x < 84; x += 12) runs.push([new THREE.Vector3(x, 6.2, 4.5), new THREE.Vector3(x + 12, 6.2, 4.5)]);
    for (const [ax, az, bx, bz] of [[-70, 8, -40, 22], [-40, 22, -10, 14], [-10, 14, 20, 24], [20, 24, 52, 12]]) runs.push([new THREE.Vector3(ax, 7, az), new THREE.Vector3(bx, 7, bz)]);
    for (const [a, b] of runs) {
      for (const q of [a, b]) beam(poles, this.cyl, new THREE.Vector3(q.x, 0, q.z), new THREE.Vector3(q.x, q.y + 0.3, q.z), 0.16, C('#e8e8e8'));
      const len = a.distanceTo(b);
      const cnt = Math.floor(len / 0.8);
      for (let k = 1; k < cnt; k++) {
        const t = k / cnt;
        const p = a.clone().lerp(b, t);
        p.y -= Math.sin(Math.PI * t) * 0.9;
        _m.compose(p, _q.setFromAxisAngle(UP, Math.atan2(-(b.z - a.z), b.x - a.x)), _s.set(1, 1, 1));
        if (k % 2) flags.add(tri, C(FLAGS[Math.floor(r() * FLAGS.length)]), _m);
        else {
          _m.compose(p.clone().setY(p.y - 0.05), _q.identity(), new THREE.Vector3(0.18, 0.18, 0.18));
          bulbs.add(this.ball, C(k % 4 ? '#ffe7a0' : '#ff9a6a'), _m);
        }
      }
    }
    tri.dispose();
    this.group.add(flags.mesh(this.mats.flag), bulbs.mesh(this.mats.bulb), poles.mesh(this.mats.metal));
  }

  /**
   * A fence between the fair and the course, with an arch at the gate saying what it is — solid
   * (the course's walls), so a rider who runs wide meets it and stays on the street.
   */
  _fence() {
    const pile = new Pile();
    const x0 = -112;
    const x1 = 84;
    for (let x = x0; x <= x1; x += 2) {
      if (x > -6 && x < 6) continue;
      beam(pile, this.box, new THREE.Vector3(x, 0, 1), new THREE.Vector3(x, 1.2, 1), 0.08, PAL.fence);
    }
    for (const y of [0.35, 1.1]) {
      beam(pile, this.box, new THREE.Vector3(x0, y, 1), new THREE.Vector3(-6, y, 1), 0.06, PAL.fence);
      beam(pile, this.box, new THREE.Vector3(6, y, 1), new THREE.Vector3(x1, y, 1), 0.06, PAL.fence);
    }
    // the arch over the gate
    for (const x of [-6, 6]) beam(pile, this.box, new THREE.Vector3(x, 0, 1), new THREE.Vector3(x, 6.5, 1), 0.6, PAL.blue);
    this.group.add(pile.mesh(this.mats.solid));
    const cv = document.createElement('canvas');
    cv.width = 1024;
    cv.height = 192;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 192);
    grad.addColorStop(0, '#2b3b9a');
    grad.addColorStop(1, '#5a2b9a');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 192);
    g.fillStyle = '#ffd23a';
    for (let k = 0; k < 40; k++) {
      g.beginPath();
      g.arc(12 + k * 25.6, 10, 5, 0, Math.PI * 2);
      g.arc(12 + k * 25.6, 182, 5, 0, Math.PI * 2);
      g.fill();
    }
    g.font = '900 76px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 10;
    g.strokeStyle = '#1a1030';
    g.strokeText('★ STARLIGHT FUN FAIR ★', 512, 78);
    g.fillStyle = '#fff4c8';
    g.fillText('★ STARLIGHT FUN FAIR ★', 512, 78);
    g.font = '800 44px system-ui, sans-serif';
    g.fillStyle = '#ffd23a';
    g.fillText('별빛 놀이공원', 512, 144);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.signTex = tex;
    this.signMat = new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.3, side: THREE.DoubleSide });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.4), this.signMat);
    sign.position.set(0, 6.6, 1);
    // (facing the course, so it reads the right way round from the road)
    sign.rotation.y = Math.PI;
    this.group.add(sign);
    // solid: the fence's line in the world (both sides of the gate: the gate's a gate, not a way through)
    const walls = this.course.walls;
    if (walls) {
      const a = this.world(x0, 0, 1);
      const b = this.world(x1, 0, 1);
      walls.addSegment(a.x, a.z, b.x, b.z, 'fair');
    }
  }

  /** Each frame: the rides move (near you), the bulbs glow after dark, the fair is heard as you pass. */
  update(dt) {
    this.t += dt;
    const cam = this.g.camera?.position ?? this.g.pos;
    const d = Math.hypot(cam.x - this.origin.x, cam.z - this.origin.z);
    this.near = d < 450;
    this.group.visible = d < 1400;
    const night = this.g.uniforms?.uNight?.value ?? 0;
    this.mats.bulb.emissiveIntensity = 0.35 + night * 2.6;
    this.signMat.emissiveIntensity = 0.25 + night * 1.2;
    if (this.near) {
      this._moveCoaster(dt);
      this._moveTower(dt);
      this._moveWheel(dt);
      this._moveCarousel(dt);
      this._moveShip(dt);
    }
    this._sound(d);
  }

  _moveCoaster(dt) {
    const c = this.rides.coaster;
    const y = this.track.getPointAt(c.u).y;
    // up the chain from just after the station to the crest; then gravity
    c.lift = c.u > 0.1 && c.u < 0.27;
    const want = coasterSpeed(y, c.lift);
    c.v += Math.max(-6 * dt, Math.min(8 * dt, want - c.v));
    c.u = (c.u + (c.v * dt) / this.trackLen) % 1;
    c.drop = !c.lift && y < 12 && c.v > 14;
    c.cars.forEach((car, k) => {
      const u = (c.u - (k * 2.3) / this.trackLen + 1) % 1;
      const p = this.track.getPointAt(u);
      const t = this.track.getTangentAt(u);
      car.position.copy(p);
      car.lookAt(p.x - t.x, p.y - t.y, p.z - t.z);
    });
  }

  _moveTower(dt) {
    const tw = this.rides.tower;
    tw.t = (tw.t + dt) % 22;
    const t = tw.t;
    const top = tw.H - 5;
    let y;
    if (t < 12) y = 3 + (top - 3) * (0.5 - 0.5 * Math.cos((t / 12) * Math.PI));
    else if (t < 15) y = top + Math.sin(t * 9) * 0.04;
    else if (t < 17.8) y = Math.max(5, top - 0.5 * 9.81 * (t - 15) ** 2 * 0.95);
    else if (t < 19) y = 5 - (t - 17.8) * 1.6;
    else y = 3;
    tw.dropping = t >= 15 && t < 17.8;
    tw.car.position.y = y;
    tw.car.rotation.y += dt * (t < 12 ? 0.2 : 0);
  }

  _moveWheel(dt) {
    const w = this.rides.wheel;
    w.a = (w.a + dt * 0.09) % (Math.PI * 2);
    w.wheel.rotation.z = w.a;
    const m = new THREE.Matrix4();
    for (let k = 0; k < 16; k++) {
      const a = w.a + (k / 16) * Math.PI * 2;
      m.makeTranslation(w.at.x + Math.cos(a) * w.R, w.at.y + Math.sin(a) * w.R, w.at.z);
      w.gondolas.setMatrixAt(k, m);
    }
    w.gondolas.instanceMatrix.needsUpdate = true;
  }

  _moveCarousel(dt) {
    const c = this.rides.carousel;
    c.a += dt * 0.55;
    c.spin.rotation.y = c.a;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (let k = 0; k < 16; k++) {
      const ring = k % 2 ? 6 : 4.2;
      const a = (k / 16) * Math.PI * 2;
      const y = 1.7 + Math.sin(this.t * 2.2 + k * 1.3) * 0.35;
      q.setFromAxisAngle(UP, -a);
      m.compose(new THREE.Vector3(Math.cos(a) * ring, y, Math.sin(a) * ring), q, _s.set(1, 1, 1));
      c.horses.setMatrixAt(k, m);
    }
    c.horses.instanceMatrix.needsUpdate = true;
  }

  _moveShip(dt) {
    const s = this.rides.ship;
    s.t = (s.t + dt) % 30;
    // builds up for twenty seconds, swings high, then eases down
    s.amp = s.t < 20 ? 0.2 + (s.t / 20) * 1.05 : Math.max(0.05, 1.25 - (s.t - 20) * 0.14);
    s.a = Math.sin(this.t * 0.95) * s.amp;
    s.swing.rotation.x = s.a;
    s.high = Math.abs(s.a) > 1;
  }

  /** The fair's sound: a band organ's waltz, the coaster's chain, screams on the drops — louder the nearer. */
  _sound(d) {
    const ctx = this.g.street?._audio?.();
    if (!ctx) return;
    const k = Math.max(0, Math.min(1, (260 - d) / 200));
    if (!this.audio && k > 0) this._startSound(ctx);
    if (!this.audio) return;
    const now = ctx.currentTime;
    this.audio.gain.gain.setTargetAtTime(k * 0.16, now, 0.3);
    if (k <= 0) return;
    // the waltz: one note a beat, the bass on the one
    this._beat = (this._beat ?? 0) + (this._lastT ? now - this._lastT : 0);
    this._lastT = now;
    const beat = 60 / 168;
    while (this._beat >= beat) {
      this._beat -= beat;
      this._step = ((this._step ?? -1) + 1) % TUNE.length;
      const [note, bass] = TUNE[this._step];
      if (note) this._pipe(ctx, note, beat * 0.9, 0.5);
      if (bass) this._pipe(ctx, bass, beat * 0.6, 0.6, 'triangle');
      else if (this._step % 3) this._pipe(ctx, (TUNE[this._step - (this._step % 3)]?.[1] ?? 196) * 2, beat * 0.25, 0.25, 'triangle');
    }
    const c = this.rides.coaster;
    // the chain: a clack eight times a second up the lift
    this._clack = (this._clack ?? 0) + 1 / 60;
    if (c.lift && this._clack > 0.12) {
      this._clack = 0;
      this._noise(ctx, 2400, 0.03, 0.35);
    }
    const tw = this.rides.tower;
    const screaming = (c.drop || tw.dropping || this.rides.ship.high) && k > 0.15;
    if (screaming && (this._screamT ?? 0) <= now) {
      this._screamT = now + 1.6 + Math.random();
      this._scream(ctx);
    }
  }

  _startSound(ctx) {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    gain.connect(lp).connect(ctx.destination);
    this.audio = { gain, lp };
  }

  _pipe(ctx, f, dur, vol, type = 'square') {
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o.type = type;
    o2.type = 'sine';
    o.frequency.value = f;
    o2.frequency.value = f * 2.005;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol * 0.3, now + 0.02);
    g.gain.setTargetAtTime(0, now + dur * 0.7, 0.05);
    o.connect(g);
    o2.connect(g);
    g.connect(this.audio.gain);
    o.start(now);
    o2.start(now);
    o.stop(now + dur + 0.3);
    o2.stop(now + dur + 0.3);
  }

  _noise(ctx, f, dur, vol) {
    const now = ctx.currentTime;
    const buf = (this._nbuf ??= (() => {
      const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const a = b.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
      return b;
    })());
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(bp).connect(g).connect(this.audio.gain);
    src.start(now, Math.random() * 0.5, dur + 0.05);
  }

  /** A few riders' screams: voices of noise, bent up and down. */
  _scream(ctx) {
    const now = ctx.currentTime;
    for (let v = 0; v < 3; v++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const f = 700 + Math.random() * 500;
      o.frequency.setValueAtTime(f, now);
      o.frequency.linearRampToValueAtTime(f * 1.35, now + 0.25);
      o.frequency.linearRampToValueAtTime(f * 0.9, now + 1.2);
      const vib = ctx.createOscillator();
      vib.frequency.value = 6 + Math.random() * 3;
      const vg = ctx.createGain();
      vg.gain.value = 25;
      vib.connect(vg).connect(o.frequency);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.09, now + 0.08);
      g.gain.setTargetAtTime(0, now + 0.9, 0.2);
      o.connect(bp).connect(g).connect(this.audio.gain);
      o.start(now + v * 0.07);
      vib.start(now);
      o.stop(now + 1.8);
      vib.stop(now + 1.8);
    }
  }

  dispose() {
    if (this.lampId != null) this.g.nightLights?.remove(this.lampId);
    this.audio?.gain.disconnect();
    this.audio = null;
    this.group.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
    for (const m of Object.values(this.mats)) m.dispose();
    this.signMat?.dispose();
    this.signTex?.dispose();
    for (const g of [this.box, this.cyl, this.ball]) g.dispose();
    this.group.removeFromParent();
  }
}

/** A band-organ waltz of our own (a melody note and a bass note a beat, 3/4), Hz; 0 a rest. */
const N = { G3: 196, C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3 };
const TUNE = [
  [N.E4, N.C4 / 2], [N.G4, 0], [N.C5, 0], [N.B4, N.G3 / 2], [N.A4, 0], [N.G4, 0],
  [N.F4, N.D4 / 2], [N.A4, 0], [N.D5, 0], [N.C5, N.G3 / 2], [N.B4, 0], [N.A4, 0],
  [N.G4, N.C4 / 2], [N.E5, 0], [N.D5, 0], [N.C5, N.G3 / 2], [N.B4, 0], [N.D5, 0],
  [N.C5, N.C4 / 2], [N.G4, 0], [N.E4, 0], [N.C4, N.G3 / 2], [0, 0], [0, 0]
];
