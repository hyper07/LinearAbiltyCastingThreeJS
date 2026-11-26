import * as THREE from 'three';
import { compile, sculpt, trace, gradient } from '../arcademia/world/creatures/sculpt.js';
import { SPECIES } from '../snowpuff/riders.js';
import { plushMaterial, furShells, setFurLod, vinylMaterial, knitMaterial } from './plush.js';
import { Scooter } from './scooter.js';
import { blobTexture } from './items.js';
import { goldHelmet } from './helmet.js';
import { applyPlushPose, lerpPose, smoothstep } from '../shared/motion/dance.js';
import { podiumDance } from '../shared/motion/signatures.js';

/**
 * Kickrani's riders: Snowpuff Peaks' plush animals, come to Seoul on
 * electric kick scooters. The same sculpted toys — each species a recipe of
 * smooth shapes blended into one soft skinned body by the Arcademia sculptor
 * (renderer-agnostic geometry) — dressed for WebGL2 here: plush with sheen,
 * fibre noise and a fresnel rim, shell fur close up (fewer shells further
 * off), bead eyes with catchlights, a stitched smile, their accent (scarf,
 * bobble hat, backpack) and boots.
 *
 * The recipes, the contact-shadow bake and the fur mask below are copied from
 * src/snowpuff/render/riderModel.js (RECIPES, plushBody, bakeContact and
 * bakeFurry aren't exported there, and that file imports three/webgpu);
 * Snowpuff is never edited from here.
 *
 *   const r = new PlushRider('bunny', { body: '#ff6fb4' });
 *   scene.add(r.root);
 *   r.pose(dt, { speed, lean, steer, braking, boost, bump, air, mode, t, night });
 *
 * Hierarchy: root (place, yaw) → lean (the turn, scooter and all) → jolt
 * (bumps, hops) → { scooter, rider (scale) → squash → tilt (crouch) → body }.
 * Travel is −z.
 */

/* ======== copied from src/snowpuff/render/riderModel.js (recipes, sculpting, bakes) ======== */
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
        E([0, 0.615, 0.3], [0.03, 0.02, 0.03], { col: '#e0447e', soft: 0.004 })
      ],
      face: { iris: '#4a2236', eyeX: 0.12, eyeY: 0.66, eyeR: 0.04, mouthY: 0.565 },
      accent: null,
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

/* ======== end of the copy ======== */

/** How big the plush riders are in the street (Snowpuff's are about 1 m tall). */
export const RIDER_SCALE = 1.18;
/** The scooter is built in metres for a 1 m toy; in the street it is this much bigger. */
export const SCOOTER_SCALE = 1.24;

const G = {};
const sphere = () => (G.sphere ??= new THREE.SphereGeometry(1, 24, 16));
const lowSphere = () => (G.low ??= new THREE.SphereGeometry(1, 12, 8));
const _v = new THREE.Vector3();
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** A five-pointed star (dizzy stars, backpack badges). Copied from riderModel.js. */
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

/** A critically-ish damped spring toward a goal: { x, v }. */
function spring(s, goal, k, d, dt) {
  s.v += ((goal - s.x) * k - s.v * d) * dt;
  s.x += s.v * dt;
  return s.x;
}

/**
 * The riders and their scooters stay out of the scene's fog: fog is the street's weather, not the
 * characters' — a rival 40 m ahead in a fog bank is still a crisp plush toy while the cars round it
 * fade (the weather's FOG_BANK). Run on anything added to a rider (a helmet, a can, a new scooter).
 */
export function noFog(obj) {
  obj.traverse((o) => {
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      if (m.fog === false) continue;
      m.fog = false;
      m.needsUpdate = true;
    }
  });
}

export class PlushRider {
  /**
   * @param {string} species  a Snowpuff species (fox, bunny, bear, cat, frog, pig, penguin)
   * @param {{ body?: string, trim?: string, fur?: number, res?: number, shadow?: boolean, screen?: boolean }} o
   */
  constructor(species, { body = null, trim = '#ffffff', fur = 10, res = 96, shadow = true, screen = true, ride = 'city' } = {}) {
    this.species = species;
    const sp = SPECIES[species] ?? SPECIES.fox;
    this.sp = sp;
    const { geometry, model, recipe } = sculptSpecies(species, res);
    this.root = new THREE.Group();
    this.root.name = `rider-${species}`;
    this.lean = new THREE.Group();
    this.jolt = new THREE.Group();
    this.root.add(this.lean);
    this.lean.add(this.jolt);
    // The scooter, in its rider's colours.
    this._paint = body ?? sp.accent;
    this._trim = trim;
    this.scooter = new Scooter({ model: ride, body: this._paint, trim, screen });
    this.deck = this.scooter.deckTop * SCOOTER_SCALE;
    this.scooter.group.scale.setScalar(SCOOTER_SCALE);
    this.jolt.add(this.scooter.group);
    // The rider: standing on the deck, a little turned (front foot forward), knees bent.
    this.rider = new THREE.Group();
    this.rider.position.y = this.deck + 0.005;
    this.rider.scale.setScalar(RIDER_SCALE);
    this.jolt.add(this.rider);
    this.squash = new THREE.Group();
    this.tilt = new THREE.Group();
    this.body = new THREE.Group();
    this.rider.add(this.squash);
    this.squash.add(this.tilt);
    this.tilt.add(this.body);
    // the sculpt faces +z; travel is −z
    this.body.rotation.y = Math.PI;
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
    this.recipe = recipe;
    this.material = plushMaterial({ color: sp.color });
    const mesh = new THREE.SkinnedMesh(geometry, this.material);
    mesh.add(bones[0]);
    mesh.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(bones));
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.mesh = mesh;
    this.body.add(mesh);
    this.furLen = fur > 0 ? (species === 'penguin' ? 0.016 : 0.045) : 0;
    if (fur > 0) {
      this.fur = furShells(mesh, { color: sp.color, count: fur, length: this.furLen });
      this.body.add(this.fur);
    }
    this.addFace(model, recipe.face, byName.get('head'));
    this.addAccent(recipe.accent, byName);
    this.addBoots(byName);
    // Dizzy stars round the head after a fall.
    this.stars = new THREE.Group();
    const starM = new THREE.MeshStandardMaterial({ color: '#ffd23a', emissive: '#ffb800', emissiveIntensity: 0.9, roughness: 0.4 });
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Mesh(starGeometry(), starM);
      s.scale.setScalar(0.05);
      this.stars.add(s);
    }
    this.stars.visible = false;
    this.root.add(this.stars);
    // A small soft contact shadow under the wheels (the sun's own shadow does the rest).
    this.blob = new THREE.Mesh(G.blob ??= new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), G.blobMat ??= new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    this.blob.scale.set(0.42, 1, 1.15);
    this.blob.position.y = 0.025;
    this.blob.renderOrder = 1;
    this.root.add(this.blob);
    // Springs and timers.
    noFog(this.root);
    this.sp2 = { ear: { x: 0, v: 0 }, earB: { x: 0, v: 0 }, wag: { x: 0, v: 0 }, tailL: { x: 0, v: 0 }, scarf: { x: 0, v: 0 }, bob: { x: 0, v: 0 }, crouch: { x: 0, v: 0 }, leanB: { x: 0, v: 0 }, armsUp: { x: 0, v: 0 }, sq: { x: 1, v: 0 } };
    this.t = Math.random() * 10;
    this.blink = 2 + Math.random() * 3;
    this.lastHeading = null;
  }

  addFace(model, f, headBone) {
    const hp = this.rest.get('head');
    const sdf = model.sdf;
    const eyeMat = vinylMaterial(f.iris ?? '#4a2a1a', { roughness: 0.1, clearcoat: 1 });
    const pupilMat = vinylMaterial('#0b0807', { roughness: 0.08, clearcoat: 1 });
    const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.eyes = [];
    for (const s of [-1, 1]) {
      const hit = trace(sdf, [s * f.eyeX, f.eyeY, 1.5], [0, 0, -1], 3);
      if (!hit) continue;
      const g = gradient(sdf, hit[0], hit[1], hit[2], 0.004);
      const eye = new THREE.Group();
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

  /** Chunky boots over the feet, on the deck. */
  addBoots(bones) {
    const m = vinylMaterial('#2b2f3a', { roughness: 0.55, clearcoat: 0.25 });
    const sole = vinylMaterial('#f4f1ea', { roughness: 0.7, clearcoat: 0 });
    const laceM = vinylMaterial(this.sp.accent, { roughness: 0.5, clearcoat: 0.2 });
    const pad = this.furLen;
    for (const [name, sx] of [['legL', -1], ['legR', 1]]) {
      const b = bones.get(name);
      const lp = this.rest.get(name);
      const boot = new THREE.Group();
      boot.position.set(sx * 0.11 - lp.x, 0.055 - lp.y, 0.05 - lp.z);
      const shell = new THREE.Mesh(sphere(), m);
      shell.scale.set(0.098 + pad, 0.07 + pad * 0.6, 0.128 + pad);
      const cuff = new THREE.Mesh(G.cuff ??= new THREE.CylinderGeometry(1, 1.17, 0.07, 18), m);
      cuff.scale.set(0.075 + pad, 1, 0.075 + pad);
      cuff.position.set(0, 0.06, -0.015);
      const bottom = new THREE.Mesh(sphere(), sole);
      bottom.scale.set(0.1 + pad, 0.026, 0.132 + pad);
      bottom.position.y = -0.04;
      for (let k = 0; k < 3; k++) {
        for (const d of [-1, 1]) {
          const l = new THREE.Mesh(G.lace ??= new THREE.CapsuleGeometry(0.006, 0.06, 3, 6).rotateZ(Math.PI / 2), laceM);
          l.position.set(0, 0.03 + k * 0.022 + pad * 0.5, 0.085 + pad - k * 0.018);
          l.rotation.set(-0.7, d * 0.55, 0);
          boot.add(l);
        }
      }
      for (const o of [shell, cuff, bottom]) o.castShadow = true;
      boot.add(shell, cuff, bottom);
      b.add(boot);
    }
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
      const tail = new THREE.Group();
      tail.position.set(0.08, 0.46 - cp.y, -0.2);
      let parent = tail;
      const segs = [];
      for (let i = 0; i < 4; i++) {
        const seg = new THREE.Group();
        const piece = new THREE.Mesh(G.scarf ??= new THREE.BoxGeometry(0.1, 0.1, 0.025, 2, 2, 1), m);
        piece.position.y = -0.05;
        seg.add(piece);
        seg.position.y = i ? -0.1 : 0;
        parent.add(seg);
        parent = seg;
        segs.push(seg);
      }
      chestB.add(tail);
      this.extras.scarf = segs;
    } else if (kind === 'beanie') {
      const m = knitMaterial(sp.accent);
      const hat = new THREE.Group();
      hat.position.set(0, (sp.animal === 'penguin' ? 0.86 : 0.84) - hp.y, -0.02);
      hat.rotation.x = -0.12;
      const fp = this.furLen * 0.85;
      const dome = new THREE.Mesh(G.dome ??= new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), m);
      dome.scale.set(0.3 + fp, 0.2 + fp, 0.27 + fp);
      const rim = new THREE.Mesh(G.rim ??= new THREE.TorusGeometry(1, 0.17, 10, 36), knitMaterial('#ffffff'));
      rim.scale.set(0.3 + fp, 0.27 + fp, 0.2);
      rim.rotation.x = Math.PI / 2;
      const pom = new THREE.Group();
      pom.position.y = 0.2 + fp;
      const ball = new THREE.Mesh(sphere(), knitMaterial('#ffffff'));
      ball.scale.setScalar(0.075);
      ball.position.y = 0.05;
      pom.add(ball);
      for (const o of [dome, rim, ball]) o.castShadow = true;
      hat.add(dome, rim, pom);
      headB.add(hat);
      this.extras.pom = pom;
      this.extras.hat = hat;
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

  /**
   * The golden helmet on or off: a gold cycling helmet fitted to this head (its ellipsoid in the
   * recipe — ears poke out of it), a bobble hat taken off under it. Just the helmet: no glow round
   * the rider.
   */
  setHelmet(on) {
    on = Boolean(on);
    if (on && !this.helmet) {
      const part = this.recipe.parts.find((p) => p.bone === 'head' && p.s === 'ell') ?? { c: [0, 0.67, 0], r: [0.34, 0.29, 0.3] };
      this.helmet = goldHelmet(part, this.rest.get('head'), this.furLen);
      noFog(this.helmet);
      this.bones.get('head').add(this.helmet);
      // (a rival already fading by the camera fades its helmet too)
      if (this._mats) {
        this.helmet.traverse((o) => {
          if (!o.material || this._mats.some((e) => e.m === o.material)) return;
          o.material.alphaHash = true;
          o.material.needsUpdate = true;
          this._mats.push({ m: o.material, opacity: o.material.opacity });
          o.material.opacity *= this._fade ?? 1;
        });
      }
    }
    this.helmetOn = on;
    if (this.helmet) this.helmet.visible = on;
    if (this.extras.hat) this.extras.hat.visible = !on;
  }

  /** A gulp from a can of energy drink: the paw up to the mouth with a can in it, the head back. */
  drink() {
    if (!this.can) {
      const can = new THREE.Group();
      const body = new THREE.Mesh(G.can ??= new THREE.CylinderGeometry(0.034, 0.034, 0.105, 16), vinylMaterial('#3fb68b', { roughness: 0.25, clearcoat: 1 }));
      const band = new THREE.Mesh(G.canBand ??= new THREE.CylinderGeometry(0.0345, 0.0345, 0.04, 16), vinylMaterial('#f8f6ef', { roughness: 0.4, clearcoat: 0.6 }));
      const top = new THREE.Mesh(G.canTop ??= new THREE.CylinderGeometry(0.03, 0.034, 0.012, 16), vinylMaterial('#c9ccd1', { roughness: 0.25, clearcoat: 1 }));
      top.position.y = 0.058;
      can.add(body, band, top);
      const arm = this.bones.get('armR');
      const ap = this.rest.get('armR');
      // in the right paw (the recipe's paw for armR is the mirror of armL's: x +0.3)
      can.position.set(0.3 - ap.x, 0.27 - ap.y, 0.1 - ap.z);
      can.rotation.z = 0.5;
      arm.add(can);
      noFog(can);
      this.can = can;
    }
    this.can.visible = true;
    this._drink = { t: 0, dur: 0.75 };
  }

  /** Fur level of detail from the camera distance (m). */
  furLod(dist) {
    if (!this.fur) return;
    const max = this.fur.userData.count;
    setFurLod(this.fur, dist < 7 ? max : dist < 16 ? max * 0.55 : dist < 34 ? Math.min(max, 3) : 0);
  }

  /**
   * Fade rider and scooter together (1 whole … 0 gone): a rival right by the camera. Screen-door
   * (alpha-hashed) so nothing needs sorting; the first fade switches it on for good (one shader
   * change per material, at most once).
   */
  fade(k) {
    k = Math.max(0, Math.min(1, k));
    if (k === this._fade) return;
    this._fade = k;
    if (!this._mats) {
      if (k >= 1) return;
      this._mats = [];
      const seen = new Set([G.blobMat]);
      this.root.traverse((o) => {
        for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
          if (seen.has(m)) continue;
          seen.add(m);
          this._mats.push({ m, opacity: m.opacity });
          if (!m.transparent && !m.alphaHash) {
            m.alphaHash = true;
            m.needsUpdate = true;
          }
        }
      });
    }
    for (const e of this._mats) e.m.opacity = e.opacity * k;
    this.blob.visible = k > 0.5;
  }

  /** Put the rider at (x, y, z) in the ground's frame although it hangs under the tipped-over scooter's lean. */
  placeRider(x, y, z, lean) {
    const c = Math.cos(-lean);
    const s = Math.sin(-lean);
    this.rider.position.set(x * c - y * s, x * s + y * c, z);
  }

  /** A reaction for the menus: 'wave', 'ears' (a wiggle) or 'hop'. */
  react(kind, dur = kind === 'hop' ? 0.55 : 1.1) {
    this._react = { kind, t: 0, dur };
  }

  /** Swap the scooter for another model (the scooter select), in the same colours. */
  setRide(model, { body, trim } = {}) {
    if (this.scooter.model === model) return;
    const old = this.scooter;
    const paint = body ?? this._paint ?? this.sp.accent;
    this.scooter = new Scooter({ model, body: paint, trim: trim ?? this._trim ?? '#ffffff', screen: Boolean(old.screenTex) });
    this.scooter.group.scale.setScalar(SCOOTER_SCALE);
    old.group.removeFromParent();
    old.dispose();
    noFog(this.scooter.group);
    this.jolt.add(this.scooter.group);
    this.deck = this.scooter.deckTop * SCOOTER_SCALE;
    this.rider.position.y = this.deck + 0.005;
  }

  /** Remove from the scene and free what is only ours (the sculpted body is shared per species). */
  dispose() {
    this.root.removeFromParent();
    this.scooter.dispose();
  }

  /**
   * Off the scooter and up on a podium block (the race's ceremony, podium.js): the rider stands at
   * the root (the block's top), the scooter parked at `park` — [x, y, z, yaw] in the root's own
   * frame, on its kickstand. `null` puts it all back as it was for riding.
   */
  standOff(park) {
    this._stand = park ?? null;
    const g = this.scooter.group;
    if (park) {
      g.position.set(park[0], park[1], park[2]);
      g.rotation.set(0, park[3], 0);
      this.scooter.setStand(true);
    } else {
      g.position.set(0, 0, 0);
      g.rotation.set(0, 0, 0);
      // (what the dance moved that riding doesn't set: the sway, the rubber-hose arms)
      this.tilt.rotation.z = 0;
      this.bones.get('armL')?.scale.setScalar(1);
      this.bones.get('armR')?.scale.setScalar(1);
      this._danceKey = null;
    }
  }

  /**
   * The ceremony, procedural (no clips), on the music's beat (`beats`: where the track is, in beats):
   * each species its own signature dance (src/shared/motion/signatures.js — slow and smooth, in half
   * time: the bunny bounce-sways, the pig side-steps and claps, the cat body-waves and sways its hips,
   * the fox pops its chest every two beats and waves its arms, the bear two-steps heavily and rolls its
   * shoulders, the frog squats and rises wide, the penguin waddle-glides, waves its flippers and turns),
   * eight bars in four variants, and its place's flourish on top (`place` 1: a slow V held two beats and
   * one soft hop every two bars; 2 one paw up, 3 a small V; any other place a little side-clap). Species +
   * place + `start` (the beat it began on) decide every pose: the same in every browser. The ears and the
   * tail follow on soft springs, flowing; the bunny's the floppiest.
   */
  celebrate(dt, { kind = 'win', heading = 0, night = 0, beats = null, place = null, start = 0, bpm = 143.6 } = {}) {
    dt = Math.min(dt, 0.05);
    this.t += dt;
    const t = this.t;
    const B = this.bones;
    const S = this.sp2;
    this.root.rotation.y = heading;
    this.lean.rotation.z = 0;
    this.jolt.position.set(0, 0, 0);
    this.jolt.rotation.set(0, 0, 0);
    this.scooter.update(dt, { roll: 0, steer: 0, braking: false, night, speed: 0, boost: false });
    this.scooter.setStand(true);
    this.stars.visible = false;
    this.rider.position.set(0, 0.005, 0);
    this.rider.rotation.set(0, 0, 0);
    const pl = place ?? { win: 1, dance: 2, clap: 3 }[kind] ?? 4;
    const key = `${this.species}|${pl}|${start}|${bpm}`;
    if (this._danceKey !== key) {
      this._danceKey = key;
      this._dance = podiumDance(this.species, { place: pl, start, bpm });
      this._lastBeat = this._lastPose = this._lastY = null;
      this._ease = 0;
    }
    const bt = beats ?? (this._lastBeat ?? 0) + (dt * bpm) / 60;
    let pose = this._dance.sample(bt);
    // the music jumping (its loop going round, or coming in late): ease over from where we were, no snap
    if (this._lastBeat != null && Math.abs(bt - this._lastBeat - (dt * bpm) / 60) > 0.5) this._ease = 1;
    this._lastBeat = bt;
    if (this._ease > 0 && this._lastPose) {
      pose = lerpPose(this._lastPose, pose, smoothstep(1 - this._ease));
      this._ease = Math.max(0, this._ease - dt / 0.6);
    }
    this._lastPose = pose;
    applyPlushPose({ bones: B, squash: this.squash, tilt: this.tilt, turn: this.body, turnRest: Math.PI, hipsRestY: 0.2 }, pose);
    // ears and tail on soft springs (slow and loose, so they flow after the dance, not jitter): left
    // behind as the body rises, flung up as it sinks, swinging after the sway and the head's tilt
    const sig = this._dance.signature;
    const y = (pose.lift ?? 0) + (pose.hipsY ?? 0) + (pose.stretch ?? 0) * 0.3;
    const vy = this._lastY == null || dt <= 0 ? 0 : (y - this._lastY) / dt;
    this._lastY = y;
    const fling = Math.max(-0.9, Math.min(0.9, vy * 1.2 * sig.ears));
    const earA = Math.max(-1, Math.min(0.8, spring(S.ear, -0.05 - fling, 30, 3.6, dt)));
    const earB = spring(S.earB, ((pose.sway ?? 0) * 1.6 + (pose.head?.[2] ?? 0) * 0.8) * sig.ears + (pose.yaw ?? 0) * 0.3, 20, 3, dt);
    // (both ears swing the same way, keeping their spread: opposite turns would pinch them into one point)
    B.get('earL').rotation.set(earA, 0, -0.08 + earB);
    B.get('earR').rotation.set(earA * 0.92, 0, 0.08 + earB);
    const tb = B.get('tail'), t2 = B.get('tail2');
    if (tb) {
      const wag = spring(S.wag, (-(pose.hips?.[1] ?? 0) * 1.5 - (pose.sway ?? 0) - (pose.hips?.[2] ?? 0)) * sig.tail, 24, 3, dt);
      const lift = spring(S.tailL, 0.35 - Math.max(-0.4, Math.min(0.4, vy * 0.6)), 24, 3.5, dt);
      tb.rotation.set(-lift * 0.5, wag * 0.55, wag * 0.25);
      if (t2) t2.rotation.set(-lift * 0.35, wag * 0.7, wag * 0.35);
    }
    if (this.extras.scarf) this.extras.scarf.forEach((seg, i) => (seg.rotation.z = -earB * (0.4 + i * 0.1) + Math.sin(t * 2 + i * 0.7) * 0.06));
    if (this.extras.pom) this.extras.pom.rotation.z = spring(S.bob, (pose.sway ?? 0) * 2 - fling * 0.4, 35, 3.5, dt) * 0.6;
    const rimK = 0.34 * (1 - night * 0.8);
    this.material.userData.u.uRimK.value = rimK;
    if (this.fur) this.fur.userData.u.uRimK.value = 1 - night * 0.8;
    this.material.userData.u.uFlash.value = 0;
    if (this.fur) this.fur.userData.u.uFlash.value = 0;
    // happy squinting eyes, with a blink now and then
    this.blink -= dt;
    if (this.blink < 0) this.blink = 2.5 + Math.random() * 3;
    for (const e of this.eyes) e.scale.y = this.blink < 0.12 ? 0.15 : pl === 1 ? 0.35 : 0.7;
    const air = Math.max(0, pose.lift ?? 0);
    this.blob.visible = true;
    this.blob.scale.set(0.5 - air * 0.4, 1, 0.5 - air * 0.4);
  }

  /**
   * Animate from a state: { heading (world yaw, 0 faces −z), speed, lean, steer,
   * braking, boost (crouch for a boost), bump (a joint's jolt 0–1), air (hop height),
   * wobble, mode ('ride' | 'tumble' | 'dizzy' | 'win' | 'grid'), t (seconds into a
   * fall), roll (wheel angle), night (0–1), glow ('#hex' or null), visible }.
   */
  pose(dt, st) {
    dt = Math.min(dt, 0.05);
    this.t += dt;
    const t = this.t;
    const B = this.bones;
    const S = this.sp2;
    const mode = st.mode ?? 'ride';
    const speed = st.speed ?? 0;
    const night = st.night ?? 0;
    this.root.rotation.y = st.heading ?? 0;
    // how fast the heading turns (whips the ears and tail)
    const hd = st.heading ?? 0;
    const yawRate = this.lastHeading == null ? 0 : Math.atan2(Math.sin(hd - this.lastHeading), Math.cos(hd - this.lastHeading)) / Math.max(1e-3, dt);
    this.lastHeading = hd;
    const down = mode === 'tumble' || mode === 'dizzy';
    const ft = st.t ?? 0;
    // ---- the scooter and the whole lean
    const wob = (st.wobble ?? 0) > 0 ? Math.sin(t * 21) * 0.13 * st.wobble : 0;
    let lean = (st.lean ?? 0) + wob;
    // fallen: the scooter on its side; getting up: righted again
    // a branch in the front wheel: it stops dead, the back kicks up over it (an endo), then down on its side
    const endo = down && st.fallKind === 'wheel' && mode === 'tumble' ? Math.sin(Math.min(1, ft / 0.5) * Math.PI) : 0;
    if (down) {
      const k = mode === 'tumble' ? Math.min(1, Math.max(0, ft - (st.fallKind === 'wheel' ? 0.35 : 0)) / 0.25) : Math.max(0, 1 - Math.max(0, ft - 1.25) / 0.3);
      lean = (st.fallSide ?? 1) * 1.38 * k;
    }
    this.lean.rotation.z = lean;
    // bumps: a quick shake up and a tip back; a hop lifts it all
    const bump = st.bump ?? 0;
    this.jolt.position.y = (st.air ?? 0) + bump * 0.02 * Math.sin(t * 60);
    this.jolt.rotation.x = bump * 0.03 * Math.sin(t * 47) + (st.air > 0 ? -0.08 : 0) - endo * 1.05;
    // (turning about the front wheel, not the deck: lifted as it tips)
    this.jolt.position.y += endo * 0.42;
    this.jolt.position.z = -endo * 0.25;
    this.scooter.update(dt, { roll: st.roll ?? 0, steer: down ? 0 : clamp((st.steer ?? 0) * (1 - Math.min(1, speed / 6)) + (st.lean ?? 0) * 0.4, -1, 1), braking: Boolean(st.braking), night, speed, boost: Boolean(st.boost) });
    this.scooter.setStand(mode === 'grid' && speed < 0.2);
    // ---- the rider
    const crouchGoal = down ? 0 : st.boost ? 1 : st.braking ? 0.35 : 0.15 + Math.min(0.2, speed * 0.02);
    const crouch = spring(S.crouch, crouchGoal, 120, 14, dt);
    const win = mode === 'win';
    const armsUp = spring(S.armsUp, win ? 1 : 0, 90, 10, dt);
    // landing squash from a hop or a big bump
    if (st.landed) S.sq.v -= 2.5 + st.landed;
    const sq = spring(S.sq, 1, 260, 12, dt);
    const breathe = 1 + Math.sin(t * 2.3) * 0.012;
    this.squash.scale.set(1 + (1 - sq) * 0.6, sq * breathe, 1 + (1 - sq) * 0.6);
    // lean the body into the turn a little more than the scooter (weight inside), back from a boost
    // (in a drift the body hangs out, away from the slide)
    const bodyLean = spring(S.leanB, down ? 0 : (st.lean ?? 0) * 0.35 - (st.drift ?? 0) * 0.5, 80, 12, dt);
    this.rider.rotation.z = bodyLean;
    this.tilt.rotation.x = -crouch * 0.1;
    // stance: turned a little, front foot forward
    this.body.rotation.y = Math.PI + (down ? 0 : 0.28);
    this.rider.position.set(0, this.deck + 0.005, -0.08);
    this.rider.rotation.x = 0;
    this.rider.rotation.y = 0;
    const hips = B.get('hips'), chest = B.get('chest'), headB = B.get('head');
    // knees bent: the hips drop and push back; more in a crouch
    hips.position.y = 0.2 - (0.035 + crouch * 0.05);
    hips.rotation.set(0.1 + crouch * 0.12, -0.28 * 0.6, 0);
    chest.rotation.set(0.12 + crouch * 0.16, 0.12, -bodyLean * 0.3);
    // the head looks where it is going (undoing the stance and the crouch's pitch), into the turn
    headB.rotation.set(-0.16 - crouch * 0.3, 0.16 + (st.steer ?? 0) * 0.25, bodyLean * 0.4);
    // arms forward to the grips (rotation.y swings forward, z raises; L at −x), or up at the finish
    const reach = 1.25, raise = 1.25 + crouch * 0.1;
    const upA = armsUp;
    B.get('armL').rotation.set(0, reach * (1 - upA) + Math.sin(t * 14) * 0.2 * upA, -(raise * (1 - upA) + 2.6 * upA));
    B.get('armR').rotation.set(0, -reach * (1 - upA) - Math.sin(t * 14 + 1) * 0.2 * upA, raise * (1 - upA) + 2.6 * upA);
    // Throwing a branch: the right arm swings back and up over the shoulder (the wind-up), then whips forward.
    if (st.throwK != null && !down) {
      const k = st.throwK;
      const back = k < 0.6 ? Math.sin((k / 0.6) * Math.PI * 0.5) : 1 - (k - 0.6) / 0.4;
      const whip = k < 0.6 ? 0 : Math.sin(((k - 0.6) / 0.4) * Math.PI);
      B.get('armR').rotation.set(0, -reach * (1 - back) + 0.7 * back - 1.1 * whip, raise * (1 - back) + 2.7 * back - 0.6 * whip);
      chest.rotation.y += 0.35 * back - 0.5 * whip;
    }
    // A gulp of energy drink: the right paw up to the mouth with the can, the head tipped back.
    const dr = this._drink;
    if (dr) {
      dr.t += dt;
      const u = Math.min(1, dr.t / dr.dur);
      const env = Math.sin(u * Math.PI);
      if (!down) {
        B.get('armR').rotation.set(0.35 * env, -reach * (1 - env) - 1.55 * env, raise * (1 - env) + 2.35 * env);
        headB.rotation.x -= 0.42 * env;
        if (this.can) this.can.rotation.z = 0.5 + 1.1 * env;
      }
      if (u >= 1) {
        this._drink = null;
        if (this.can) this.can.visible = false;
      }
    }
    // legs: bent, the front one forward
    B.get('legL').rotation.set(-0.25 - crouch * 0.15, 0, 0.04);
    B.get('legR').rotation.set(0.12 - crouch * 0.1, 0, -0.04);
    // the finish: a happy hop
    this.squash.position.y = win ? Math.abs(Math.sin(t * 7)) * 0.12 : 0;
    // A reaction (the menus: picked, a new scooter): a wave, a wiggle of the ears, a little hop.
    const re = this._react;
    if (re && !down) {
      re.t += dt;
      const u = Math.min(1, re.t / re.dur);
      const env = Math.sin(u * Math.PI);
      if (re.kind === 'wave') {
        B.get('armR').rotation.set(0, -0.2, 1.3 + 1.4 * env + Math.sin(re.t * 16) * 0.35 * env);
        headB.rotation.z += Math.sin(re.t * 8) * 0.12 * env;
      } else if (re.kind === 'hop') {
        this.squash.position.y += Math.sin(u * Math.PI) * 0.22;
        if (u > 0.92 && !re.landed) {
          re.landed = true;
          S.sq.v -= 3.5;
          S.ear.v += 6;
        }
        B.get('armL').rotation.z -= 0.9 * env;
        B.get('armR').rotation.z += 0.9 * env;
      } else if (re.kind === 'ears') {
        S.earB.v += Math.sin(re.t * 22) * 40 * dt * env;
        S.ear.v += Math.cos(re.t * 18) * 30 * dt * env;
        headB.rotation.y += Math.sin(re.t * 9) * 0.25 * env;
      }
      if (u >= 1) this._react = null;
    }
    // ---- a fall: thrown forward in a roll, sat dazed in the road with stars, then up and back on
    this.stars.visible = mode === 'dizzy';
    this.blob.scale.set(0.42 + Math.abs(lean) * 0.25, 1, 1.15);
    this.blob.material.opacity = 0.5;
    this.blob.visible = (st.air ?? 0) < 0.25;
    if (down) {
      if (mode === 'tumble') {
        const u = Math.min(1, ft / 0.7);
        this.placeRider(0, this.deck + Math.sin(u * Math.PI) * 0.6, -u * 0.9, lean);
        this.rider.rotation.z = -lean;
        this.rider.rotation.x = -u * Math.PI * 2;
      } else {
        // sitting: dropped to the ground beside the scooter, leaning back on the paws, head wobbling
        const up = Math.max(0, Math.min(1, (ft - 1.25) / 0.3));
        this.placeRider(0.32 * (1 - up), 0.02 * (1 - up) + this.deck * up, -0.9 * (1 - up), lean);
        this.rider.rotation.z = -lean * (1 - up);
        hips.position.y = 0.2 - 0.12 * (1 - up);
        chest.rotation.set(-0.25 * (1 - up), 0, 0);
        headB.rotation.set(Math.sin(t * 5) * 0.15, Math.sin(t * 3.5) * 0.35, Math.sin(t * 4.2) * 0.2);
        B.get('armL').rotation.set(-0.6, 0, -0.9);
        B.get('armR').rotation.set(-0.6, 0, 0.9);
        B.get('legL').rotation.set(-1.2 * (1 - up), 0, 0.2);
        B.get('legR').rotation.set(-1.2 * (1 - up), 0, -0.2);
        // stars round the head
        headB.updateWorldMatrix(true, false);
        this.root.updateWorldMatrix(true, false);
        const hw = headB.getWorldPosition(_v);
        this.root.worldToLocal(hw);
        this.stars.children.forEach((s, i) => {
          const a = t * 4 + (i / 4) * Math.PI * 2;
          s.position.set(hw.x + Math.cos(a) * 0.32, hw.y + 0.38 + Math.sin(a * 2) * 0.03, hw.z + Math.sin(a) * 0.32);
          s.rotation.set(0, a * 2, 0);
        });
      }
    }
    // ---- springs: ears lean back with speed and bounce on bumps; a turn whips them and the tail
    const earGoal = down ? 0.3 : -Math.min(0.85, speed * 0.05) + (st.air > 0 ? -0.2 : 0);
    S.ear.v += bump * 4 * Math.sin(t * 50);
    if (st.landed) S.ear.v += 5 + st.landed;
    S.earB.v += yawRate * dt * 30;
    const earA = spring(S.ear, earGoal, 60, 6, dt);
    const earB = spring(S.earB, Math.sin(t * 3.1) * 0.05, 40, 5, dt);
    B.get('earL').rotation.set(earA, 0, -0.08 - earB);
    B.get('earR').rotation.set(earA * 0.92, 0, 0.08 + earB);
    const tb = B.get('tail'), t2 = B.get('tail2');
    if (tb) {
      S.wag.v += yawRate * dt * 26;
      if (st.landed) S.tailL.v -= 4 + st.landed;
      const wag = spring(S.wag, -(st.lean ?? 0) * 1.4 + Math.sin(t * 3.2) * 0.08, 45, 4.5, dt);
      const lift = spring(S.tailL, Math.min(0.6, speed * 0.05), 50, 5, dt);
      tb.rotation.set(-lift * 0.5, wag * 0.55, wag * 0.25);
      if (t2) t2.rotation.set(-lift * 0.35, wag * 0.7, wag * 0.35);
    }
    const w = Math.min(1, speed / 9);
    if (this.fur) this.fur.userData.u.uWind.value.set(0, -0.008 * w, -0.03 * w);
    if (this.extras.scarf) {
      const sc = spring(S.scarf, w * 1.1 + Math.sin(t * 13) * 0.15 * w, 30, 4, dt);
      this.extras.scarf.forEach((seg, i) => {
        seg.rotation.z = -sc * (0.5 + i * 0.12) + Math.sin(t * 9 + i) * 0.08 * w;
        seg.rotation.x = Math.sin(t * 7 + i * 0.7) * 0.1 * (0.2 + w);
      });
    }
    if (this.extras.pom) {
      S.bob.v -= bump * 3;
      this.extras.pom.rotation.z = spring(S.bob, 0, 80, 5, dt) * 0.6 + w * 0.3;
    }
    // ---- rim and glow: the fresnel rim dims at night (no glowing toys in the dark); an item's glow
    const rimK = 0.34 * (1 - night * 0.8);
    this.material.userData.u.uRimK.value = rimK;
    if (this.fur) this.fur.userData.u.uRimK.value = 1 - night * 0.8;
    const flash = st.glow ? 0.18 + Math.sin(t * 8) * 0.06 : 0;
    this.material.userData.u.uFlash.value = flash;
    if (this.fur) this.fur.userData.u.uFlash.value = flash;
    // ---- blink
    this.blink -= dt;
    const shut = (this.blink < 0.12 && this.blink > 0) || mode === 'dizzy';
    if (this.blink < 0) this.blink = 2.5 + Math.random() * 3;
    for (const e of this.eyes) {
      e.scale.y = shut ? 0.15 : win ? 0.35 : 1;
    }
  }
}
