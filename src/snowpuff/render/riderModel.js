/**
 * The plush riders as 3D toys: each species is a sculpting recipe (smooth
 * shapes blended into one soft body, tied to bones) run through the Arcademia
 * sculptor (src/arcademia/world/creatures/sculpt.js — renderer-agnostic
 * geometry), then dressed in TSL plush with shell fur (plush.js), bead eyes,
 * a stitched mouth, blush, their accent (scarf, bobble hat, backpack),
 * goggles worn down over the eyes (goggles.js — one of many, the player's
 * pick), chunky boots and a snowboard with its own topsheet picture.
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
import { plushMaterial, furShells, setFurLod, vinylMaterial, knitMaterial, fabricMaterial } from './plush.js';
import { PoseRig, J, STANCE, SPIN_T, PLANT_T, iceSpin, plantPitch } from './poseRig.js';
import { buildGoggles } from './goggles.js';
import { buildBoard } from './boards.js';
import { cleanBoard } from '../boardList.js';
import { cleanGoggle } from '../goggleList.js';

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
        ...both(E([-0.22, 0.6, 0.25], [0.05, 0.032, 0.04], { col: BLUSH, soft: 0.034 }))
      ],
      face: { iris: '#6a3412', eyeX: 0.125, eyeY: 0.7, eyeR: 0.04, mouthY: 0.555 },
      accent: null,
      topsheet: 'stars'
    };
  },
  bunny(sp) {
    const b = plushBody({ light: sp.light });
    return {
      bones: skeleton({ earL: ['head', -0.11, 0.9, -0.03], earR: ['head', 0.11, 0.9, -0.03] }),
      parts: [
        head(),
        E([0, 0.585, 0.21], [0.13, 0.085, 0.09], { k: 0.08, bone: 'head', col: sp.light }),
        // long floppy ears that lean back and out
        ...both(T([-0.11, 0.86, -0.03], [-0.2, 1.33, -0.1], 0.085, 0.07, { k: 0.06, bone: 'earL' })),
        ...b.parts,
        S([0, 0.22, -0.21], 0.1, { k: 0.04, bone: 'tail', col: '#ffffff' })
      ],
      paint: [
        ...b.paint,
        ...both(E([-0.165, 1.1, 0.02], [0.042, 0.18, 0.04], { col: '#ffc2dc', rot: [0, 0, -0.18] })),
        ...both(E([-0.2, 0.59, 0.24], [0.055, 0.035, 0.04], { col: BLUSH, soft: 0.034 })),
        E([0, 0.615, 0.3], [0.03, 0.02, 0.03], { col: '#e0447e', soft: 0.004 }),
        // a lighter-pink belly panel with a little front pocket
        E([0, 0.25, 0.15], [0.15, 0.17, 0.1], { col: sp.light, soft: 0.008 }),
        E([0, 0.2, 0.19], [0.085, 0.05, 0.05], { col: '#ffb3d4', soft: 0.003 })
      ],
      face: { iris: '#4a2236', eyeX: 0.12, eyeY: 0.66, eyeR: 0.04, mouthY: 0.565 },
      accent: null,
      pocket: [0, 0.2, 0.19],
      topsheet: 'hearts'
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
        ...both(E([-0.21, 0.6, 0.25], [0.055, 0.035, 0.04], { col: BLUSH, soft: 0.034 }))
      ],
      face: { iris: '#3e2414', eyeX: 0.13, eyeY: 0.69, eyeR: 0.04, mouthY: 0.565 },
      accent: 'scarf',
      topsheet: 'paws'
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
        ...both(E([-0.21, 0.59, 0.24], [0.05, 0.032, 0.04], { col: BLUSH, soft: 0.034 }))
      ],
      face: { iris: '#33592a', eyeX: 0.13, eyeY: 0.67, eyeR: 0.04, mouthY: 0.57 },
      accent: 'beanie',
      topsheet: 'fish'
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
        ...both(E([-0.24, 0.6, 0.23], [0.06, 0.035, 0.04], { col: BLUSH, soft: 0.034 }))
      ],
      face: { iris: '#3a2a14', eyeX: 0.155, eyeY: 0.875, eyeR: 0.04, mouthY: 0.58, wide: true, eyeZ: 0.24 },
      accent: 'backpack',
      topsheet: 'dots'
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
        ...both(E([-0.22, 0.6, 0.24], [0.055, 0.035, 0.04], { col: BLUSH, soft: 0.034 }))
      ],
      face: { eyeX: 0.13, eyeY: 0.7, eyeR: 0.038, mouthY: 0.52 },
      accent: null,
      topsheet: 'hearts'
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
        ...both(E([-0.21, 0.58, 0.24], [0.05, 0.032, 0.04], { col: BLUSH, soft: 0.034 }))
      ],
      face: { eyeX: 0.12, eyeY: 0.68, eyeR: 0.038, mouthY: null },
      accent: 'beanie',
      topsheet: 'flakes'
    };
  }
};

/* ---------------------------------------------------------------- sculpting (cached) */

const sculpted = new Map();

/** The sculpted body of a species: { geometry, model (sdf), recipe }. */
export function sculptSpecies(species, res = 110) {
  const key = `${species}|${res}`;
  if (sculpted.has(key)) return sculpted.get(key);
  const sp = SPECIES[species];
  const recipe = RECIPES[sp.animal](sp);
  const model = compile(recipe);
  const geometry = sculpt(model, { res });
  bakeContact(geometry, model.sdf);
  bakeFurry(geometry, recipe);
  const out = { geometry, model, recipe };
  sculpted.set(key, out);
  return out;
}

/**
 * Contact shadow per vertex (attribute `ao`, 1 = open), from the distance
 * field: march a few steps out along the normal and see how soon the body is
 * there again (under the arms and chin, between the legs); the feet darken
 * where they meet the board.
 */
function bakeContact(geo, sdf) {
  const P = geo.attributes.position, N = geo.attributes.normal;
  const ao = new Float32Array(P.count);
  const steps = [0.018, 0.04, 0.07, 0.11, 0.16];
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
    let occ = 0, w = 1;
    for (const d of steps) {
      occ += (Math.max(0, d - sdf(x + nx * d, y + ny * d, z + nz * d)) / d) * w;
      w *= 0.62;
    }
    const feet = 0.55 + 0.45 * Math.min(1, Math.max(0, (y - 0.01) / 0.09));
    ao[i] = Math.max(0, Math.min(1, 1 - occ * 0.5)) * feet;
  }
  geo.setAttribute('ao', new THREE.BufferAttribute(ao, 1));
}

/**
 * Where fur grows (attribute `furry`, 0..1): all over — the dark mittens and
 * socks, the cream belly and muzzle too — but short and velvety round the
 * eyes, nose and mouth so the face stays crisp.
 */
function bakeFurry(geo, recipe) {
  const P = geo.attributes.position, N = geo.attributes.normal;
  const f = recipe.face;
  const hc = recipe.parts[0].c;
  const cy = (f.eyeY + (f.mouthY ?? f.eyeY - 0.12)) / 2, ry = Math.abs(f.eyeY - (f.mouthY ?? f.eyeY - 0.12)) / 2 + 0.075, rx = f.eyeX + 0.085;
  const out = new Float32Array(P.count);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const front = Math.min(1, Math.max(0, (N.getZ(i) - 0.25) / 0.35)) * (z > hc[2] ? 1 : 0);
    const e = Math.hypot(x / rx, (y - cy) / ry);
    const face = front * Math.min(1, Math.max(0, (1.25 - e) / 0.35));
    out[i] = 1 - face * 0.7;
  }
  geo.setAttribute('furry', new THREE.BufferAttribute(out, 1));
}

/* ---------------------------------------------------------------- shared little geometries */

const G = {};
const sphere = () => (G.sphere ??= new THREE.SphereGeometry(1, 24, 16));
const lowSphere = () => (G.low ??= new THREE.SphereGeometry(1, 12, 8));

/* ---------------------------------------------------------------- the rider */

const _v = new THREE.Vector3();
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export class RiderModel {
  /**
   * @param {string} species
   * @param {{ fur?: number, res?: number, shadow?: boolean, goggles?: string, label?: string }} o
   */
  constructor(species, { fur = 0, res = 110, shadow = true, goggles = 'classic', board = 'classic', label = '' } = {}) {
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
    this.board.rotation.y = Math.PI / 2; // board's x → along travel (z)
    this.board.position.y = 0.03;
    this.squash.add(this.board);

    this.rig = new PoseRig({ stance: STANCE[species] ?? 1 });
    this.body = new THREE.Group();
    this.body.rotation.y = this.rig.bodyYaw;
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
    // long shaggy fur (shorter on the penguin's sleek feathers)
    this.furLen = fur > 0 ? (species === 'penguin' ? 0.016 : 0.052) : 0;
    if (fur > 0) {
      this.fur = furShells(mesh, { color: sp.color, count: fur, length: this.furLen, wind: this.wind });
      this.body.add(this.fur);
    }
    this.addFace(model, recipe.face, byName.get('head'));
    this.addAccent(recipe.accent, byName);
    this.addBoots(byName);
    if (recipe.pocket) this.addPocket(recipe.pocket, byName.get('chest'));
    this.fit = this.measureFit(model.sdf, recipe);
    this.label = label;
    this.topsheet = recipe.topsheet;
    this.setGoggles(goggles);
    this.setBoard(board);
    // Springs: ears, accent tail, pompom.
    this.slipSpin = 0;
    this.slipT = 0;
    this.plantT = -1;
    this.flatY = 1;
    this.flatV = 0;
    this.spring = { earA: 0, earV: 0, earB: 0, earBV: 0, tail: 0, tailV: 0, bob: 0, bobV: 0 };
    this.t = Math.random() * 10;
    this.squashT = 0;
    this.blink = 2 + Math.random() * 3;
    this.headTurn = 0;
    this.handDrag = 0;
    this.handPos = new THREE.Vector3();
  }

  addFace(model, f, headBone) {
    const hp = this.rest.get('head');
    const sdf = model.sdf;
    // eyes with depth: a glossy dark iris, a black pupil sitting in it, two catchlights
    const eyeMat = vinylMaterial(f.iris ?? '#4a2a1a', { roughness: 0.1, clearcoat: 1 });
    const pupilMat = vinylMaterial('#0b0807', { roughness: 0.08, clearcoat: 1 });
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
      const pupil = new THREE.Mesh(sphere(), pupilMat);
      pupil.scale.set(f.eyeR * 0.66, f.eyeR * 0.78, f.eyeR * 0.45);
      pupil.position.z = f.eyeR * 0.2;
      const gl = new THREE.Mesh(lowSphere(), glint);
      gl.scale.setScalar(f.eyeR * 0.3);
      gl.position.set(f.eyeR * 0.32 * -s, f.eyeR * 0.4, f.eyeR * 0.6);
      const gl2 = new THREE.Mesh(lowSphere(), glint);
      gl2.scale.setScalar(f.eyeR * 0.13);
      gl2.position.set(-f.eyeR * 0.3 * -s, -f.eyeR * 0.36, f.eyeR * 0.58);
      eye.add(ball, pupil, gl, gl2);
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
        // stitched: short thread stitches with little gaps, like embroidery on a plush
        const curve = new THREE.CatmullRomCurve3(pts);
        const n = f.wide ? 7 : 4;
        const thread = vinylMaterial('#3a2420', { roughness: 0.7, clearcoat: 0 });
        for (let i = 0; i < n; i++) {
          const a = i / n + 0.12 / n, b = (i + 1) / n - 0.12 / n;
          const seg = [0, 0.5, 1].map((k) => curve.getPoint(a + (b - a) * k));
          headBone.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seg), 4, 0.0058, 5, false), thread));
        }
      }
    }
  }

  /**
   * Where goggles sit on this head (head-bone space): the head's ellipse at
   * eye height, measured from the sculpted shape, plus the eyes' place.
   */
  measureFit(sdf, recipe) {
    const f = recipe.face;
    const hp = this.rest.get('head');
    const hc = recipe.parts[0].c; // the head shape's centre
    const y = f.eyeY;
    const side = trace(sdf, [1.5, y, hc[2]], [-1, 0, 0], 3);
    const back = trace(sdf, [0, y, -1.5], [0, 0, 1], 3);
    const front = trace(sdf, [f.eyeX, y, 1.5], [0, 0, -1], 3);
    const pad = this.furLen + 0.008;
    const rx = (side ? side[0] : 0.34) + pad;
    const cz = hc[2];
    const zf = (front ? front[2] : 0.28) - cz;
    const k = Math.sqrt(Math.max(0.2, 1 - (f.eyeX / rx) ** 2));
    const rz = zf / k + pad;
    const rzb = (back ? cz - back[2] : rz) + pad;
    return { cy: y - hp.y, cz: cz - hp.z, rx, rz, rzb, ex: f.eyeX, er: f.eyeR, hy: hc[1] - hp.y };
  }

  /** Put on a pair of goggles (any id from goggleList.js; unknown ones are Classic). */
  setGoggles(id) {
    id = cleanGoggle(id);
    if (this.goggles?.id === id) return;
    const was = this.goggles;
    if (was) {
      was.group.removeFromParent();
      was.group.traverse((o) => o.isMesh && o.geometry.dispose());
    }
    this.goggles = buildGoggles(id, this.fit, { frame: this.sp.goggleFrame ?? this.sp.accent, text: this.label });
    this.bones.get('head').add(this.goggles.group);
    if (was) this.goggles.setUp(was.upGoal ?? 0, true);
  }

  /** Ride another board (cosmetic only; any id from boardList.js, unknown ones are Classic). */
  setBoard(id) {
    id = cleanBoard(id);
    if (this.deck?.id === id) return;
    if (this.deck) {
      this.deck.group.removeFromParent();
      this.deck.group.traverse((o) => o.isMesh && !o.geometry.userData.shared && o.geometry.dispose());
    }
    this.deck = buildBoard(id, { trim: this.sp.boardTrim, deck: this.sp.board, art: this.topsheet });
    this.board.add(this.deck.group);
  }

  /**
   * Fur level of detail from the camera distance (m): every shell close up,
   * fewer further away, none in the distance — the same fur length throughout.
   */
  furLod(dist) {
    if (!this.fur) return;
    const max = this.fur.userData.count;
    setFurLod(this.fur, dist < 7 ? max : dist < 16 ? max * 0.55 : dist < 40 ? Math.min(max, 4) : 0);
  }

  /** Goggles down (0) over the eyes, or pushed up (1) onto the forehead. */
  gogglesUp(k = 1) {
    this.goggles?.setUp(k);
  }

  /** A try-on: a happy head shake and a little bounce (the picker). */
  tryOn() {
    this.react('tryon', 0.8);
    this.goggles?.flourish();
  }

  /** A trick landed: silly goggles do their thing (the pixel shades drop in). */
  trickLanded() {
    this.goggles?.trick();
    this.deck?.trick();
  }

  /** Chunky dark boots over the feet, in the bindings. */
  addBoots(bones) {
    const m = vinylMaterial('#2b2f3a', { roughness: 0.55, clearcoat: 0.25 });
    const sole = vinylMaterial('#f4f1ea', { roughness: 0.7, clearcoat: 0 });
    const pad = this.furLen;
    for (const [name, sx] of [['legL', -1], ['legR', 1]]) {
      const b = bones.get(name);
      const lp = this.rest.get(name);
      const boot = new THREE.Group();
      boot.position.set(sx * 0.11 - lp.x, 0.055 - lp.y, 0.05 - lp.z);
      const shell = new THREE.Mesh(sphere(), m);
      shell.scale.set(0.098 + pad, 0.07 + pad * 0.6, 0.128 + pad);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.075 + pad, 0.088 + pad, 0.07, 18), m);
      cuff.position.set(0, 0.06, -0.015);
      const bottom = new THREE.Mesh(sphere(), sole);
      bottom.scale.set(0.1 + pad, 0.026, 0.132 + pad);
      bottom.position.y = -0.04;
      // criss-cross laces up the front, a bow at the top, a tread line round the sole
      const laceM = vinylMaterial(this.sp.accent, { roughness: 0.5, clearcoat: 0.2 });
      for (let k = 0; k < 3; k++) {
        for (const d of [-1, 1]) {
          const l = new THREE.Mesh(G.lace ??= new THREE.CapsuleGeometry(0.006, 0.06, 3, 6).rotateZ(Math.PI / 2), laceM);
          l.position.set(0, 0.03 + k * 0.022 + pad * 0.5, 0.085 + pad - k * 0.018);
          l.rotation.set(-0.7, d * 0.55, 0);
          boot.add(l);
        }
      }
      const bow = new THREE.Mesh(sphere(), laceM);
      bow.scale.set(0.022, 0.012, 0.012);
      bow.position.set(0, 0.098 + pad * 0.5, 0.045 + pad);
      const tread = new THREE.Mesh(G.tread ??= new THREE.TorusGeometry(1, 0.06, 6, 28).rotateX(Math.PI / 2), vinylMaterial('#c9c3b8', { roughness: 0.8, clearcoat: 0 }));
      tread.scale.set(0.1 + pad, 0.1, 0.132 + pad);
      tread.position.y = -0.052;
      boot.add(shell, cuff, bottom, tread, bow);
      b.add(boot);
    }
  }

  /** A little stitched front pocket (Mallow's snowsuit). */
  addPocket(at, chestB) {
    const cp = this.rest.get('chest');
    const g = new THREE.Group();
    g.position.set(at[0] - cp.x, at[1] - cp.y + 0.035, at[2] - cp.z + this.furLen + 0.015);
    const cloth = fabricMaterial('#ffa0c8');
    const flap = new THREE.Mesh(sphere(), cloth);
    flap.scale.set(0.085, 0.022, 0.025);
    // the pocket itself: a soft woven patch with a stitched seam round it
    const patch = new THREE.Mesh(sphere(), fabricMaterial('#ffb8d6'));
    patch.scale.set(0.09, 0.07, 0.022);
    patch.position.set(0, -0.055, -0.008);
    const seam = new THREE.Mesh(new THREE.TorusGeometry(1, 0.018, 4, 40), vinylMaterial('#e8659e', { roughness: 0.85, clearcoat: 0 }));
    seam.scale.set(0.082, 0.064, 0.4);
    seam.position.set(0, -0.055, 0.012);
    g.add(patch, seam);
    const button = new THREE.Mesh(lowSphere(), vinylMaterial('#ffffff', { roughness: 0.3 }));
    button.scale.setScalar(0.013);
    button.position.set(0, -0.006, 0.022);
    g.add(flap, button);
    chestB.add(g);
  }

  addAccent(kind, bones) {
    const sp = this.sp;
    const headB = bones.get('head'), chestB = bones.get('chest');
    const hp = this.rest.get('head'), cp = this.rest.get('chest');
    this.extras = {};
    if (kind === 'scarf') {
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
      // sized over the fur, so the long plush doesn't poke through the knit
      const fp = this.furLen * 0.85;
      dome.scale.set(0.3 + fp, 0.2 + fp, 0.27 + fp);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.17, 10, 36), knitMaterial('#ffffff'));
      rim.scale.set(0.3 + fp, 0.27 + fp, 0.2);
      rim.rotation.x = Math.PI / 2;
      const pom = new THREE.Group();
      pom.position.y = 0.2 + fp;
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

  /** A reaction: 'ouch' (a head shake, eyes squeezed), 'laugh' (a happy bounce, ^ ^ eyes), 'wave'. */
  react(kind, secs = 0.9) {
    this.reaction = kind;
    this.reactT = secs;
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
    // a snowball hit is a face-plant (pitched over the nose, below); a barrier knock is a roll
    if (st.tumbleK > 0 && !st.plant) roll = (1 - st.tumbleK) * Math.PI * 2;
    if (st.spinoutK > 0) spin += (1 - st.spinoutK) * Math.PI * 4;
    // ice: a quick cartoon spin round sideways (two whole turns, easing in and out, ending square),
    // timed here so it plays the same for a rider seen online
    if (st.slipK > 0) {
      if (!this.slipping) {
        this.slipDir = (st.yawRate ?? 0) >= 0 ? 1 : -1;
        this.slipT = 0;
      }
      this.slipping = true;
      this.slipT = Math.min(SPIN_T, this.slipT + dt);
      this.slipSpin = this.slipDir * iceSpin(this.slipT);
    } else {
      this.slipping = false;
      this.slipSpin *= Math.max(0, 1 - dt * 12);
    }
    spin += this.slipSpin;
    // the face-plant: over the board's nose into the snow, a beat there, then a springy pop back up
    let plant = 0;
    if (st.plant) this.plantT = this.plantT < 0 ? 0 : this.plantT + dt;
    else if (this.plantT >= 0 && this.plantT < PLANT_T) this.plantT += dt;
    else this.plantT = -1;
    if (this.plantT >= 0) plant = plantPitch(this.plantT);
    // squashed flat by a giant snowball: a pancake on the snow, ears and board sticking out,
    // then a springy pop back to full height (overshooting a little)
    if (st.flat) {
      this.flatY += (0.13 - this.flatY) * Math.min(1, dt * 30);
      this.flatV = 0;
    } else {
      this.flatV += ((1 - this.flatY) * 260 - this.flatV * 9) * dt;
      this.flatY += this.flatV * dt;
    }
    this.air.rotation.set(-flip - plant, -spin, roll, 'YXZ');
    this.air.position.y = st.tumbleK > 0 && !st.plant ? Math.sin((1 - st.tumbleK) * Math.PI) * 0.6 : 0;
    // the full body: layered poses and springs (poseRig.js), then onto the bones
    const P = this.rig.update(dt, st);
    const edge = st.edge ?? 0;
    this.body.rotation.y = menu ? 0 : this.rig.bodyYaw;
    this.lean.rotation.z = -P[J.lean] + (st.wobble > 0 ? Math.sin(t * 22) * 0.12 * st.wobble : 0);
    this.lean.rotation.x = -(st.tuck ?? 0) * 0.06;
    this.lean.position.y = P[J.hop];
    // squash on landing
    if (st.landed) this.squashT = Math.min(1, 0.3 + st.landed * 0.12);
    this.squashT = Math.max(0, this.squashT - dt * 5);
    const sq = Math.sin(this.squashT * Math.PI) * 0.6 + this.squashT * 0.4;
    const breathe = 1 + Math.sin(t * 2.3) * 0.012;
    const fl = Math.max(0, 1 - this.flatY);
    this.squash.scale.set((1 + sq * 0.1) * (1 + fl * 0.75), (1 - sq * 0.16) * breathe * this.flatY, (1 + sq * 0.1) * (1 + fl * 0.75));
    const hips = B.get('hips'), chest = B.get('chest'), headB = B.get('head');
    hips.position.y = 0.2 - P[J.hipsDrop] * 0.075;
    hips.rotation.set(0, P[J.hipsYaw], 0);
    chest.rotation.set(P[J.chestPitch], P[J.chestYaw] - P[J.hipsYaw], P[J.chestRoll]);
    headB.rotation.set(P[J.headPitch], P[J.headYaw] - P[J.chestYaw], P[J.headRoll]);
    // arms: rotation.z raises (σ = −1 for the L bone at −x, +1 for R), rotation.y swings to the front
    B.get('armL').rotation.set(0, P[J.armLSwing], -P[J.armLRaise]);
    B.get('armR').rotation.set(0, -P[J.armRSwing], P[J.armRRaise]);
    // the dragging glove (toeside carves): where it touches the snow, for the spray
    this.handDrag = P[J.drag];
    if (this.handDrag > 0.05) (this.rig.leadIsR ? B.get('armL') : B.get('armR')).localToWorld(this.handPos.set(this.rig.leadIsR ? -0.15 : 0.15, -0.1, 0.05));
    // reactions
    this.body.position.y = 0.045;
    if (this.reactT > 0) {
      this.reactT -= dt;
      const k = Math.min(1, this.reactT * 3);
      if (this.reaction === 'ouch') {
        B.get('head').rotation.y += Math.sin(t * 30) * 0.35 * k;
        B.get('head').rotation.z += 0.25 * k;
      } else if (this.reaction === 'laugh') {
        this.squash.position.y = Math.abs(Math.sin(t * 14)) * 0.08 * k;
        B.get('head').rotation.x -= 0.2 * k;
      } else if (this.reaction === 'hop') {
        // a hop off the board (a new one slides in underneath)
        const u = 1 - this.reactT / 0.7;
        this.body.position.y = 0.045 + Math.max(0, Math.sin(Math.min(1, u * 1.25) * Math.PI)) * 0.32;
      } else if (this.reaction === 'tryon') {
        // goggles on: a quick head shake, then a bounce
        B.get('head').rotation.y += Math.sin(t * 26) * 0.3 * k * k;
        B.get('head').rotation.x -= 0.12 * k;
        this.squash.position.y = Math.abs(Math.sin(this.reactT * 10)) * 0.07 * k;
      } else if (this.reaction === 'wave') {
        B.get('armR').rotation.set(0, 0, 2.6 + Math.sin(t * 16) * 0.5 * k);
      }
    } else this.squash.position.y = 0;
    for (const e of this.eyes) {
      const happy = this.reactT > 0 && (this.reaction === 'laugh' || this.reaction === 'wave');
      const ouch = this.reactT > 0 && this.reaction === 'ouch';
      e.userData.sy = happy ? 0.3 : ouch ? 0.15 : 1;
    }
    // ears: a spring that leans back with speed and bounces on landings
    const sp = this.spring;
    const earTarget = menu ? Math.sin(t * 1.1) * 0.08 : -Math.min(0.85, (st.speed ?? 0) * 0.028) + (st.air ? -0.25 : 0);
    if (st.landed) sp.earV += 6 + st.landed;
    // a direction change whips the ears and the tail (they lag, then overshoot)
    sp.earBV += (st.yawRate ?? 0) * dt * 38;
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
      const wagGoal = menu ? Math.sin(t * 1.8) * 0.35 : -(st.lean ?? edge * 0.4) * 1.4 + Math.sin(t * 3.2) * 0.08;
      sp.wagV = (sp.wagV ?? 0) + (st.yawRate ?? 0) * dt * 30;
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
    this.goggles?.update(dt, { jolt: (st.landed ? Math.min(1.5, 0.3 + st.landed * 0.1) : 0) + ((st.slipK ?? 0) > 0 || st.flat ? 0.35 : 0) + (this.plantT >= 0 ? 0.6 : 0), yawRate: st.yawRate ?? 0, wind: w });
    this.deck?.update(dt, { speed: menu ? 0 : st.speed ?? 0, carve: menu ? Math.sin(t * 1.3) * 0.4 : edge, boost: Boolean(st.boost), air: Boolean(st.air) });
    if (this.extras.pack) this.extras.pack.position.y = 0.32 - 0.33 + Math.sin(t * 6) * 0.004 - this.squashT * 0.02;
    // blink
    this.blink -= dt;
    const shut = this.blink < 0.12 && this.blink > 0;
    if (this.blink < 0) this.blink = 2.5 + Math.random() * 3;
    const wide = P[J.eyes];
    for (const e of this.eyes) {
      e.scale.y = shut ? 0.15 : (e.userData.sy ?? 1) * wide;
      e.scale.x = wide;
    }
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


