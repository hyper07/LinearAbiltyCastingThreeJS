/**
 * The plush riders as 3D toys: each species is a sculpting recipe (smooth
 * shapes blended into one soft body, tied to bones) run through the Arcademia
 * sculptor (src/arcademia/world/creatures/sculpt.js — renderer-agnostic
 * geometry), then dressed in TSL plush with shell fur (plush.js), bead eyes,
 * a stitched mouth, blush, their accent (goggles, scarf, bobble hat,
 * backpack) and a snowboard.
 *
 *   const geo = sculptSpecies('fox');            // once per species (cached)
 *   const rider = new RiderModel('fox', { fur: 12 });
 *   rider.pose(dt, state);                          // every frame
 *
 * Hierarchy: root (world yaw) → air (spin/flip) → lean (carve) → squash →
 * { board, body (turned side-on, regular stance) }. Units: about 1 m tall.
 */
import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { compile, sculpt, trace, gradient } from '../../arcademia/world/creatures/sculpt.js';
import { SPECIES } from '../riders.js';
import { plushMaterial, furShells, vinylMaterial, knitMaterial } from './plush.js';

/* ---------------------------------------------------------------- recipe helpers */

const S = (c, r, o = {}) => ({ s: 'sph', c, r, ...o });
const E = (c, r, o = {}) => ({ s: 'ell', c, r, ...o });
const C = (a, b, r, o = {}) => ({ s: 'cap', a, b, r, ...o });
const T = (a, b, ra, rb, o = {}) => ({ s: 'taper', a, b, r: [ra, rb], ...o });
const flipX = (v) => (Array.isArray(v) && v.length === 3 && typeof v[0] === 'number' ? [-v[0], v[1], v[2]] : v);
function pair(shape) {
  const m = { ...shape };
  for (const k of ['c', 'a', 'b']) if (m[k]) m[k] = flipX(m[k]);
  if (m.rot) m.rot = [m.rot[0], -m.rot[1], -m.rot[2]];
  if (typeof m.bone === 'string' && m.bone.endsWith('L')) m.bone = `${m.bone.slice(0, -1)}R`;
  return [shape, m];
}
const both = (...shapes) => shapes.flatMap(pair);

const BONES = {
  root: [null, 0, 0, 0],
  hips: ['root', 0, 0.2, 0],
  chest: ['hips', 0, 0.33, 0],
  head: ['chest', 0, 0.46, 0],
  earL: ['head', -0.13, 0.9, -0.02],
  earR: ['head', 0.13, 0.9, -0.02],
  armL: ['chest', -0.17, 0.38, 0.02],
  armR: ['chest', 0.17, 0.38, 0.02],
  legL: ['hips', -0.1, 0.17, 0.02],
  legR: ['hips', 0.1, 0.17, 0.02],
  tail: ['hips', 0, 0.2, -0.17]
};
const skeleton = (over = {}) => Object.entries({ ...BONES, ...over }).map(([name, [p, x, y, z]]) => [name, p, x, y, z]);

/** The shared plush body: a bean, stubby legs with round feet, short arms with mitten paws. */
function plushBody({ light, belly = true, bodyR = [0.21, 0.2, 0.19] } = {}) {
  const parts = [
    E([0, 0.29, 0], bodyR, { k: 0.1, bone: 'chest' }),
    E([0, 0.2, 0], [bodyR[0] * 0.97, bodyR[1] * 0.72, bodyR[2] * 0.95], { k: 0.08, bone: 'hips' }),
    ...both(C([-0.1, 0.16, 0.02], [-0.11, 0.07, 0.03], 0.078, { k: 0.06, bone: 'legL' }), E([-0.11, 0.05, 0.06], [0.085, 0.052, 0.115], { k: 0.04, bone: 'legL' })),
    ...both(C([-0.17, 0.38, 0.02], [-0.29, 0.27, 0.05], 0.06, { k: 0.04, bone: 'armL' }), S([-0.3, 0.255, 0.06], 0.07, { k: 0.03, bone: 'armL' }))
  ];
  const paint = belly ? [E([0, 0.27, 0.14], [0.13, 0.15, 0.1], { col: light, soft: 0.012 })] : [];
  return { parts, paint };
}
const head = (c = [0, 0.67, 0], r = [0.34, 0.29, 0.3], o = {}) => E(c, r, { k: 0.13, bone: 'head', ...o });
const BLUSH = '#ff8fa8';

/* ---------------------------------------------------------------- recipes */

const RECIPES = {
  fox(sp) {
    const b = plushBody({ light: sp.light });
    const D = sp.dark;
    return {
      bones: skeleton({ earL: ['head', -0.19, 0.88, -0.02], earR: ['head', 0.19, 0.88, -0.02], tail: ['hips', 0, 0.22, -0.18], tail2: ['tail', 0.02, 0.36, -0.42] }),
      parts: [
        head([0, 0.67, 0], [0.35, 0.29, 0.3]),
        // cheek ruffs and a short snout
        ...both(E([-0.2, 0.585, 0.13], [0.16, 0.115, 0.15], { k: 0.08, bone: 'head', col: sp.light })),
        E([0, 0.6, 0.23], [0.115, 0.08, 0.11], { k: 0.08, bone: 'head', col: sp.light }),
        // pointed ears
        ...both(T([-0.18, 0.86, -0.02], [-0.3, 1.14, -0.05], 0.12, 0.02, { k: 0.06, bone: 'earL' })),
        ...b.parts,
        // the big fluffy tail: thick at the root, fattest in the middle, a cream tip
        T([0, 0.2, -0.17], [0.02, 0.32, -0.38], 0.08, 0.15, { k: 0.08, bone: 'tail' }),
        T([0.02, 0.32, -0.38], [0.05, 0.5, -0.52], 0.16, 0.13, { k: 0.08, bone: 'tail2' }),
        S([0.06, 0.6, -0.56], 0.11, { k: 0.07, bone: 'tail2', col: sp.light })
      ],
      paint: [
        ...b.paint,
        E([0, 0.3, 0.13], [0.15, 0.17, 0.1], { col: sp.light }),
        ...both(S([-0.29, 1.1, -0.05], 0.075, { col: D })),
        ...both(E([-0.21, 0.92, 0.03], [0.05, 0.09, 0.05], { col: '#ffd9c4' })),
        // dark socks and mittens
        ...both(E([-0.11, 0.045, 0.06], [0.1, 0.06, 0.13], { col: D }), S([-0.3, 0.255, 0.06], 0.08, { col: D })),
        E([0, 0.63, 0.335], [0.04, 0.028, 0.03], { col: '#2a1a14', soft: 0.004 }),
        ...both(E([-0.22, 0.6, 0.25], [0.05, 0.032, 0.04], { col: BLUSH, soft: 0.02 }))
      ],
      face: { eyeX: 0.125, eyeY: 0.7, eyeR: 0.04, mouthY: 0.555 },
      accent: 'goggles'
    };
  },
  bear(sp) {
    const b = plushBody({ light: sp.light, bodyR: [0.22, 0.21, 0.2] });
    return {
      bones: skeleton({ earL: ['head', -0.22, 0.9, -0.02], earR: ['head', 0.22, 0.9, -0.02] }),
      parts: [
        head([0, 0.67, 0], [0.35, 0.3, 0.31]),
        E([0, 0.6, 0.23], [0.15, 0.1, 0.1], { k: 0.08, bone: 'head', col: sp.light }),
        ...both(S([-0.23, 0.9, -0.02], 0.09, { k: 0.06, bone: 'earL' })),
        ...b.parts,
        S([0, 0.21, -0.2], 0.07, { k: 0.04, bone: 'tail' })
      ],
      paint: [
        ...b.paint,
        ...both(S([-0.235, 0.91, 0.05], 0.05, { col: sp.light })),
        E([0, 0.635, 0.325], [0.045, 0.03, 0.03], { col: '#3a2418', soft: 0.004 }),
        ...both(E([-0.21, 0.6, 0.25], [0.055, 0.035, 0.04], { col: BLUSH, soft: 0.02 }))
      ],
      face: { eyeX: 0.13, eyeY: 0.69, eyeR: 0.04, mouthY: 0.565 },
      accent: 'scarf'
    };
  },
  cat(sp) {
    const b = plushBody({ light: sp.light });
    const stripe = '#6f7b96';
    return {
      bones: skeleton({ earL: ['head', -0.19, 0.86, 0], earR: ['head', 0.19, 0.86, 0], tail: ['hips', 0, 0.2, -0.18] }),
      parts: [
        head([0, 0.67, 0], [0.35, 0.28, 0.3]),
        E([0, 0.59, 0.21], [0.14, 0.085, 0.09], { k: 0.08, bone: 'head', col: sp.light }),
        ...both(T([-0.18, 0.84, 0], [-0.25, 1.06, -0.01], 0.1, 0.018, { k: 0.05, bone: 'earL' })),
        ...b.parts,
        C([0, 0.2, -0.18], [0.04, 0.3, -0.36], 0.05, { k: 0.04, bone: 'tail' }),
        C([0.04, 0.3, -0.36], [0.1, 0.48, -0.4], 0.05, { k: 0.03, bone: 'tail' })
      ],
      paint: [
        ...b.paint,
        ...[-0.08, 0, 0.08].map((x) => E([x, 0.93, 0.08], [0.018, 0.07, 0.05], { col: stripe, soft: 0.006 })),
        ...both(E([-0.31, 0.68, 0.06], [0.03, 0.015, 0.06], { col: stripe, soft: 0.006 }), E([-0.33, 0.62, 0.04], [0.03, 0.015, 0.06], { col: stripe, soft: 0.006 })),
        ...both(E([-0.215, 0.95, 0.03], [0.04, 0.06, 0.03], { col: '#ffc6d2' })),
        E([0, 0.62, 0.3], [0.028, 0.02, 0.03], { col: '#e86a8a', soft: 0.004 }),
        ...both(E([-0.21, 0.59, 0.24], [0.05, 0.032, 0.04], { col: BLUSH, soft: 0.02 }))
      ],
      face: { eyeX: 0.13, eyeY: 0.67, eyeR: 0.04, mouthY: 0.57 },
      accent: 'beanie'
    };
  },
  frog(sp) {
    const b = plushBody({ light: sp.light });
    return {
      bones: skeleton(),
      parts: [
        head([0, 0.65, 0], [0.37, 0.26, 0.31]),
        ...both(S([-0.155, 0.85, 0.07], 0.115, { k: 0.06, bone: 'head' })),
        ...b.parts
      ],
      paint: [
        ...b.paint,
        ...both(S([-0.155, 0.87, 0.16], 0.07, { col: '#ffffff', soft: 0.006 })),
        ...both(E([-0.24, 0.6, 0.23], [0.06, 0.035, 0.04], { col: BLUSH, soft: 0.02 }))
      ],
      face: { eyeX: 0.155, eyeY: 0.875, eyeR: 0.04, mouthY: 0.58, wide: true, eyeZ: 0.24 },
      accent: 'backpack'
    };
  },
  pig(sp) {
    const b = plushBody({ light: sp.light });
    return {
      bones: skeleton({ earL: ['head', -0.2, 0.88, 0], earR: ['head', 0.2, 0.88, 0] }),
      parts: [
        head([0, 0.67, 0], [0.35, 0.29, 0.31]),
        E([0, 0.6, 0.29], [0.11, 0.08, 0.07], { k: 0.04, bone: 'head', col: '#ff9c8c' }),
        ...both(T([-0.19, 0.86, 0.0], [-0.27, 1.0, 0.06], 0.08, 0.025, { k: 0.04, bone: 'earL' })),
        ...b.parts,
        C([0, 0.22, -0.19], [0.03, 0.27, -0.25], 0.025, { k: 0.02, bone: 'tail' })
      ],
      paint: [
        ...b.paint,
        ...both(E([-0.035, 0.6, 0.36], [0.018, 0.026, 0.02], { col: '#8a3a3a', soft: 0.004 })),
        ...both(E([-0.22, 0.6, 0.24], [0.055, 0.035, 0.04], { col: BLUSH, soft: 0.02 }))
      ],
      face: { eyeX: 0.13, eyeY: 0.7, eyeR: 0.038, mouthY: 0.52 },
      accent: 'goggles'
    };
  },
  penguin(sp) {
    const b = plushBody({ light: sp.light, bodyR: [0.23, 0.22, 0.2], belly: false });
    return {
      bones: skeleton(),
      parts: [
        head([0, 0.66, 0], [0.34, 0.3, 0.3]),
        ...b.parts,
        T([0, 0.61, 0.27], [0, 0.585, 0.38], 0.05, 0.012, { k: 0.02, bone: 'head', col: '#ff9f1c' })
      ],
      paint: [
        E([0, 0.32, 0.12], [0.17, 0.2, 0.12], { col: sp.light, soft: 0.012 }),
        E([0, 0.62, 0.2], [0.25, 0.17, 0.16], { col: sp.light, soft: 0.01 }),
        ...both(E([-0.21, 0.58, 0.24], [0.05, 0.032, 0.04], { col: BLUSH, soft: 0.02 }))
      ],
      face: { eyeX: 0.12, eyeY: 0.68, eyeR: 0.038, mouthY: null },
      accent: 'beanie'
    };
  }
};

/* ---------------------------------------------------------------- sculpting (cached) */

const sculpted = new Map();

/** The sculpted body of a species: { geometry, model (sdf), recipe }. */
export function sculptSpecies(species, res = 74) {
  const key = `${species}|${res}`;
  if (sculpted.has(key)) return sculpted.get(key);
  const sp = SPECIES[species];
  const recipe = RECIPES[sp.animal](sp);
  const model = compile(recipe);
  const geometry = sculpt(model, { res });
  const out = { geometry, model, recipe };
  sculpted.set(key, out);
  return out;
}

/* ---------------------------------------------------------------- shared little geometries */

const G = {};
const sphere = () => (G.sphere ??= new THREE.SphereGeometry(1, 24, 16));
const lowSphere = () => (G.low ??= new THREE.SphereGeometry(1, 12, 8));

function boardGeometry() {
  if (G.board) return G.board;
  // A board along x: rounded tips that turn up, a slight camber.
  const len = 1.12, wid = 0.29, th = 0.028;
  const g = new THREE.BoxGeometry(len, th, wid, 40, 1, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const u = Math.abs(x) / (len / 2);
    // round the ends: pull the corners in along an ellipse
    const end = Math.max(0, (u - 0.78) / 0.22);
    const pinch = Math.sqrt(Math.max(0, 1 - end * end));
    p.setZ(i, z * (0.92 + 0.08 * pinch) * (end > 0 ? 0.55 + 0.45 * pinch : 1));
    p.setY(i, p.getY(i) + (u > 0.72 ? ((u - 0.72) / 0.28) ** 2 * 0.075 : 0) + (1 - u * u) * 0.006);
  }
  g.computeVertexNormals();
  G.board = g;
  return g;
}

/* ---------------------------------------------------------------- the rider */

const _v = new THREE.Vector3();

export class RiderModel {
  /**
   * @param {string} species
   * @param {{ fur?: number, res?: number, shadow?: boolean }} o
   */
  constructor(species, { fur = 0, res = 74, shadow = true } = {}) {
    this.species = species;
    const sp = SPECIES[species];
    this.sp = sp;
    const { geometry, model, recipe } = sculptSpecies(species, res);
    this.root = new THREE.Group();
    this.root.name = `rider-${species}`;
    this.air = new THREE.Group();
    this.lean = new THREE.Group();
    this.squash = new THREE.Group();
    this.root.add(this.air);
    this.air.add(this.lean);
    this.lean.add(this.squash);
    // The board, then the body turned side-on (regular stance: left foot forward, facing right of travel).
    this.board = new THREE.Group();
    const deck = new THREE.Mesh(boardGeometry(), vinylMaterial(sp.board, { roughness: 0.28 }));
    deck.castShadow = shadow;
    deck.receiveShadow = true;
    const stripe = new THREE.Mesh(boardGeometry(), vinylMaterial(sp.boardTrim, { roughness: 0.3 }));
    stripe.scale.set(0.84, 1.15, 0.32);
    stripe.position.y = 0.002;
    const base = new THREE.Mesh(boardGeometry(), vinylMaterial('#2b2f3a', { roughness: 0.4, clearcoat: 0.3 }));
    base.scale.set(1.005, 0.6, 1.02);
    base.position.y = -0.008;
    this.board.add(deck, stripe, base);
    for (const sx of [-0.2, 0.2]) {
      const bind = new THREE.Mesh(sphere(), vinylMaterial('#2b2f3a', { roughness: 0.5, clearcoat: 0.2 }));
      bind.scale.set(0.09, 0.035, 0.14);
      bind.position.set(sx, 0.035, 0);
      this.board.add(bind);
    }
    this.board.rotation.y = Math.PI / 2; // board's x → along travel (z)
    this.board.position.y = 0.03;
    this.squash.add(this.board);

    this.body = new THREE.Group();
    this.body.rotation.y = Math.PI / 2;
    this.body.position.y = 0.045;
    this.squash.add(this.body);

    // Bones from the recipe's rest positions.
    const bones = [];
    const byName = new Map();
    const world = new Map();
    for (const [name, parent, x, y, z] of recipe.bones) {
      const b = new THREE.Bone();
      b.name = name;
      world.set(name, new THREE.Vector3(x, y, z));
      const pw = parent ? world.get(parent) : new THREE.Vector3();
      b.position.set(x - pw.x, y - pw.y, z - pw.z);
      if (parent) byName.get(parent).add(b);
      bones.push(b);
      byName.set(name, b);
    }
    this.bones = byName;
    this.rest = world;
    const mat = plushMaterial({ color: sp.color });
    this.material = mat;
    const mesh = new THREE.SkinnedMesh(geometry, mat);
    mesh.add(bones[0]);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.mesh = mesh;
    this.body.add(mesh);
    this.wind = uniform(new THREE.Vector3());
    this.furLen = fur > 0 ? (species === 'penguin' ? 0.014 : 0.03) : 0;
    if (fur > 0) {
      this.fur = furShells(mesh, { color: sp.color, count: fur, length: this.furLen, wind: this.wind });
      this.body.add(this.fur);
    }
    this.addFace(model, recipe.face, byName.get('head'));
    this.addAccent(recipe.accent, byName);
    // Springs: ears, accent tail, pompom.
    this.spring = { earA: 0, earV: 0, earB: 0, earBV: 0, tail: 0, tailV: 0, bob: 0, bobV: 0 };
    this.t = Math.random() * 10;
    this.squashT = 0;
    this.blink = 2 + Math.random() * 3;
    this.headTurn = 0;
  }

  addFace(model, f, headBone) {
    const hp = this.rest.get('head');
    const sdf = model.sdf;
    const eyeMat = vinylMaterial('#1a1210', { roughness: 0.12, clearcoat: 1 });
    const glint = new THREE.MeshBasicNodeMaterial({ color: '#ffffff' });
    this.eyes = [];
    for (const s of [-1, 1]) {
      const z0 = 1.5;
      const hit = trace(sdf, [s * f.eyeX, f.eyeY, z0], [0, 0, -1], 3);
      if (!hit) continue;
      const g = gradient(sdf, hit[0], hit[1], hit[2], 0.004);
      const eye = new THREE.Group();
      // sit the bead a little proud of the surface, above the fur
      const lift = this.furLen * 0.8;
      eye.position.set(hit[0] - hp.x + g[0] * lift, hit[1] - hp.y + g[1] * lift, hit[2] - hp.z + g[2] * lift);
      eye.lookAt(_v.set(eye.position.x + g[0], eye.position.y + g[1] * 0.4, eye.position.z + g[2]));
      const ball = new THREE.Mesh(sphere(), eyeMat);
      ball.scale.set(f.eyeR, f.eyeR * 1.15, f.eyeR * 0.6);
      const gl = new THREE.Mesh(lowSphere(), glint);
      gl.scale.setScalar(f.eyeR * 0.32);
      gl.position.set(f.eyeR * 0.3, f.eyeR * 0.38, f.eyeR * 0.5);
      eye.add(ball, gl);
      headBone.add(eye);
      this.eyes.push(eye);
    }
    if (f.mouthY != null) {
      // A stitched one-line smile.
      const w = f.wide ? 0.11 : 0.045;
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const u = i / 12 - 0.5;
        const x = u * w * 2;
        const y = f.mouthY - Math.cos(u * Math.PI) * (f.wide ? 0.02 : 0.012);
        const hit = trace(sdf, [x, y, 1.5], [0, 0, -1], 3);
        if (hit) pts.push(new THREE.Vector3(hit[0] - hp.x, hit[1] - hp.y, hit[2] - hp.z + 0.003 + this.furLen * 0.5));
      }
      if (pts.length > 3) {
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0065, 6, false), vinylMaterial('#3a2420', { roughness: 0.6, clearcoat: 0 }));
        headBone.add(tube);
      }
    }
  }

  addAccent(kind, bones) {
    const sp = this.sp;
    const headB = bones.get('head'), chestB = bones.get('chest');
    const hp = this.rest.get('head'), cp = this.rest.get('chest');
    this.extras = {};
    if (kind === 'goggles') {
      const g = new THREE.Group();
      g.position.set(0, 0.79 - hp.y, 0.02 - hp.z);
      g.rotation.x = -0.32;
      const strap = new THREE.Mesh(new THREE.TorusGeometry(1, 0.11, 10, 48), vinylMaterial(sp.accent, { roughness: 0.55, clearcoat: 0.2 }));
      strap.scale.set(0.335, 0.31, 0.25);
      strap.rotation.x = Math.PI / 2;
      g.add(strap);
      const frameM = vinylMaterial(sp.accent, { roughness: 0.3 });
      const lensM = new THREE.MeshPhysicalNodeMaterial({ color: new THREE.Color(sp.accent).lerp(new THREE.Color('#ffffff'), 0.35), roughness: 0.05, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.6 });
      for (const s of [-1, 1]) {
        const frame = new THREE.Mesh(sphere(), frameM);
        frame.scale.set(0.1, 0.07, 0.06);
        frame.position.set(s * 0.1, 0, 0.275);
        const lens = new THREE.Mesh(sphere(), lensM);
        lens.scale.set(0.085, 0.056, 0.05);
        lens.position.set(s * 0.1, 0, 0.3);
        g.add(frame, lens);
      }
      headB.add(g);
    } else if (kind === 'scarf') {
      const m = knitMaterial(sp.accent);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.32, 12, 40), m);
      ring.scale.set(0.27, 0.26, 0.23);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0.47 - cp.y, 0);
      chestB.add(ring);
      // The tails: a little chain that swings behind.
      const tail = new THREE.Group();
      tail.position.set(0.08, 0.46 - cp.y, -0.2);
      let parent = tail;
      const segs = [];
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Group();
        const piece = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.025, 2, 2, 1), m);
        piece.position.y = -0.05;
        seg.add(piece);
        seg.position.y = i ? -0.1 : 0;
        parent.add(seg);
        parent = seg;
        segs.push(seg);
      }
      chestB.add(tail);
      this.extras.scarf = segs;
      this.extras.scarfRoot = tail;
    } else if (kind === 'beanie') {
      const m = knitMaterial(sp.accent);
      const hat = new THREE.Group();
      const top = sp.animal === 'penguin' ? 0.86 : 0.84;
      hat.position.set(0, top - hp.y, -0.02);
      hat.rotation.x = -0.12;
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), m);
      dome.scale.set(0.3, 0.2, 0.27);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.17, 10, 36), knitMaterial('#ffffff'));
      rim.scale.set(0.3, 0.27, 0.2);
      rim.rotation.x = Math.PI / 2;
      const pom = new THREE.Group();
      pom.position.y = 0.2;
      const ball = new THREE.Mesh(sphere(), knitMaterial('#ffffff'));
      ball.scale.setScalar(0.075);
      ball.position.y = 0.05;
      pom.add(ball);
      hat.add(dome, rim, pom);
      headB.add(hat);
      this.extras.pom = pom;
    } else if (kind === 'backpack') {
      const m = vinylMaterial(sp.accent, { roughness: 0.45, clearcoat: 0.5 });
      const pack = new THREE.Group();
      pack.position.set(0, 0.32 - cp.y, -0.2);
      const bag = new THREE.Mesh(sphere(), m);
      bag.scale.set(0.17, 0.17, 0.1);
      const flap = new THREE.Mesh(sphere(), vinylMaterial('#ffd23f', { roughness: 0.45, clearcoat: 0.5 }));
      flap.scale.set(0.12, 0.06, 0.05);
      flap.position.set(0, 0.08, -0.07);
      const star = new THREE.Mesh(starGeometry(), vinylMaterial('#ffffff', { roughness: 0.4 }));
      star.scale.setScalar(0.05);
      star.position.set(0, -0.02, -0.1);
      star.rotation.y = Math.PI;
      pack.add(bag, flap, star);
      chestB.add(pack);
      this.extras.pack = pack;
    }
  }

  /** Remove from the scene and free what is only ours. */
  dispose() {
    this.root.removeFromParent();
  }

  /**
   * Animate from a state: { heading (world yaw of the run), yaw, spin, flip,
   * edge, tuck, charge, speed, air, tumble, spinout, wobble, landed (impact),
   * menu (standing on the stage), cheer }.
   */
  pose(dt, st) {
    this.t += dt;
    const t = this.t;
    const B = this.bones;
    const menu = Boolean(st.menu);
    // world yaw: local −z points along travel
    if (!menu) this.root.rotation.y = -((st.heading ?? 0) + (st.yaw ?? 0));
    // spin & flip in the air; tumble and spin-out are cartoon rolls
    let spin = st.spin ?? 0, flip = st.flip ?? 0, roll = 0;
    if (st.tumbleK > 0) roll = (1 - st.tumbleK) * Math.PI * 2;
    if (st.spinoutK > 0) spin += (1 - st.spinoutK) * Math.PI * 4;
    this.air.rotation.set(-flip, -spin, roll, 'YXZ');
    this.air.position.y = st.tumbleK > 0 ? Math.sin((1 - st.tumbleK) * Math.PI) * 0.6 : 0;
    // lean into the carve (around the travel axis), crouch, tuck
    const edge = st.edge ?? 0;
    const crouch = Math.max(st.charge ?? 0, (st.tuck ?? 0) * 0.85, st.wobble > 0 ? 0.4 : 0);
    this.lean.rotation.z = -edge * 0.42 + (st.wobble > 0 ? Math.sin(t * 22) * 0.12 * st.wobble : 0);
    this.lean.rotation.x = -(st.tuck ?? 0) * 0.08;
    // squash on landing
    if (st.landed) this.squashT = Math.min(1, 0.3 + st.landed * 0.12);
    this.squashT = Math.max(0, this.squashT - dt * 5);
    const sq = Math.sin(this.squashT * Math.PI) * 0.6 + this.squashT * 0.4;
    const breathe = 1 + Math.sin(t * 2.3) * 0.012;
    this.squash.scale.set(1 + sq * 0.1, (1 - sq * 0.16) * breathe, 1 + sq * 0.1);
    B.get('hips').position.y = 0.2 - crouch * 0.075;
    B.get('chest').rotation.z = 0;
    B.get('chest').rotation.x = crouch * 0.25;
    // head looks where you go (toward the body's +x = travel); in menus it looks at you
    const look = menu ? Math.sin(t * 0.6) * 0.15 : 1.05 - (st.spinoutK > 0 ? 0.6 : 0);
    this.headTurn += (look - this.headTurn) * Math.min(1, dt * 6);
    B.get('head').rotation.set(menu ? Math.sin(t * 1.3) * 0.04 : 0.05, this.headTurn, menu ? Math.sin(t * 0.9) * 0.05 : -edge * 0.12);
    // arms out for balance, flailing in a tumble, up for a cheer
    const flail = st.tumbleK > 0 || st.spinoutK > 0 ? Math.sin(t * 18) * 0.5 : 0;
    const arms = menu ? (st.cheer ? 2.2 + Math.sin(t * 9) * 0.4 : 0.25 + Math.sin(t * 1.4) * 0.05) : 0.85 + Math.sin(t * 2.1) * 0.08 + (st.air ? 0.5 : 0) + crouch * 0.2;
    B.get('armL').rotation.set(0, 0, -arms - flail - (menu ? 0 : edge * 0.3));
    B.get('armR').rotation.set(0, 0, arms + flail - (menu ? 0 : edge * 0.3));
    // ears: a spring that leans back with speed and bounces on landings
    const sp = this.spring;
    const earTarget = menu ? Math.sin(t * 1.1) * 0.08 : -Math.min(0.85, (st.speed ?? 0) * 0.028) + (st.air ? -0.25 : 0);
    if (st.landed) sp.earV += 6 + st.landed;
    sp.earV += ((earTarget - sp.earA) * 60 - sp.earV * 6) * dt;
    sp.earA += sp.earV * dt;
    sp.earBV += ((Math.sin(t * 3.1) * 0.05 - sp.earB) * 40 - sp.earBV * 5) * dt;
    sp.earB += sp.earBV * dt;
    const eL = B.get('earL'), eR = B.get('earR');
    eL.rotation.set(sp.earA, 0, -0.08 - sp.earB);
    eR.rotation.set(sp.earA * 0.92, 0, 0.08 + sp.earB);
    // tail: a springy swish that swings against the carve, lifts with speed and bounces on landings
    const tb = B.get('tail'), t2 = B.get('tail2');
    if (tb) {
      const wagGoal = menu ? Math.sin(t * 1.8) * 0.35 : -edge * 0.7 + Math.sin(t * 3.2) * 0.08;
      if (st.landed) sp.tailLV = (sp.tailLV ?? 0) - 5 - st.landed;
      sp.wagV = (sp.wagV ?? 0) + ((wagGoal - (sp.wag ?? 0)) * 45 - (sp.wagV ?? 0) * 4.5) * dt;
      sp.wag = (sp.wag ?? 0) + sp.wagV * dt;
      const liftGoal = menu ? 0 : Math.min(0.6, (st.speed ?? 0) * 0.02) + (st.air ? 0.2 : 0);
      sp.tailLV = (sp.tailLV ?? 0) + ((liftGoal - (sp.tailL ?? 0)) * 50 - (sp.tailLV ?? 0) * 5) * dt;
      sp.tailL = (sp.tailL ?? 0) + sp.tailLV * dt;
      tb.rotation.set(-sp.tailL * 0.5, sp.wag * 0.55, sp.wag * 0.25);
      if (t2) t2.rotation.set(-sp.tailL * 0.35, sp.wag * 0.7, sp.wag * 0.35);
    }
    // fur combed back by the wind of your speed (in body space: travel is +x)
    const w = menu ? 0 : Math.min(1, (st.speed ?? 0) / 28);
    this.wind.value.set(-0.03 * w, -0.008 * w, 0);
    // accents
    if (this.extras.scarf) {
      sp.tailV += ((w * 1.1 + Math.sin(t * 13) * 0.15 * w - sp.tail) * 30 - sp.tailV * 4) * dt;
      sp.tail += sp.tailV * dt;
      this.extras.scarf.forEach((seg, i) => {
        seg.rotation.z = -sp.tail * (0.5 + i * 0.12) * (menu ? 0.1 : 1) + Math.sin(t * 9 + i) * 0.08 * w;
        seg.rotation.x = Math.sin(t * 7 + i * 0.7) * 0.1 * (0.2 + w);
      });
    }
    if (this.extras.pom) {
      if (st.landed) sp.bobV -= 4;
      sp.bobV += ((-sp.bob) * 80 - sp.bobV * 5) * dt;
      sp.bob += sp.bobV * dt;
      this.extras.pom.rotation.z = sp.bob * 0.6 + w * 0.3;
    }
    if (this.extras.pack) this.extras.pack.position.y = 0.32 - 0.33 + Math.sin(t * 6) * 0.004 - this.squashT * 0.02;
    // blink
    this.blink -= dt;
    const shut = this.blink < 0.12 && this.blink > 0;
    if (this.blink < 0) this.blink = 2.5 + Math.random() * 3;
    for (const e of this.eyes) e.scale.y = shut ? 0.15 : 1;
  }
}

function starGeometry() {
  if (G.star) return G.star;
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.45 : 1;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  G.star = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2 });
  G.star.center();
  return G.star;
}
export { starGeometry };
