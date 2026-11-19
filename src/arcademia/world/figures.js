/**
 * Everyone in AI Arcademia is a chunky, toy-like creature — no people.
 * Big round heads, big shiny eyes, stubby legs and a bouncy squash-and-
 * stretch walk. All original designs:
 *
 *   buddies    the player's pick: fox cub, robot, dragonling, puffball, bunny sprite
 *   teachers   Professor Hoot (owl, math), Tock (tortoise, history),
 *              Gizmo (raccoon inventor, physics)
 *   townsfolk  frogs, hedgehogs, mice, ducks, bear cubs… wandering the terraces
 *
 * The proportions and the walk cycle started from the walker kits in
 * vendor/3dviz/kits/creatures, squashed into rounder, bouncier toys.
 *
 *   const c = makeCreature({ species: 'fox', color: '#ff9b54', hat: 'party' });
 *   c.update(dt, { speed })   c.hop()  c.cheer()  c.sad()  c.wave()  c.talk(s)
 */
import * as THREE from 'three';
import { toon } from './kit.js';

export const BUDDIES = [
  { id: 'fox', name: 'Fox cub', color: '#ff9b54', emoji: '🦊' },
  { id: 'robot', name: 'Little robot', color: '#7cc6ff', emoji: '🤖' },
  { id: 'dragon', name: 'Dragonling', color: '#7ee08a', emoji: '🐲' },
  { id: 'puff', name: 'Puffball', color: '#ff9ed2', emoji: '☁️' },
  { id: 'bunny', name: 'Bunny sprite', color: '#c9b6ff', emoji: '🐰' }
];
export const BUDDY_COLORS = ['#ff9b54', '#7cc6ff', '#7ee08a', '#ff9ed2', '#c9b6ff', '#ffd45c', '#ff7a7a', '#5fd3c6'];
/** Hats a buddy can wear (bought with coins in the wardrobe). */
export const HATS = [
  { id: 'none', name: 'No hat', cost: 0, emoji: '🙂' },
  { id: 'party', name: 'Party hat', cost: 0, emoji: '🥳' },
  { id: 'beanie', name: 'Cosy beanie', cost: 40, emoji: '🧢' },
  { id: 'flower', name: 'Flower crown', cost: 60, emoji: '🌸' },
  { id: 'propeller', name: 'Propeller cap', cost: 90, emoji: '🚁' },
  { id: 'wizard', name: 'Wizard hat', cost: 140, emoji: '🧙' },
  { id: 'crown', name: 'Golden crown', cost: 220, emoji: '👑' },
  { id: 'space', name: 'Space helmet', cost: 300, emoji: '🚀' }
];
export const TOWNSFOLK = ['frog', 'hedgehog', 'mouse', 'duck', 'bear', 'bunny', 'fox', 'puff', 'crab', 'penguin'];

const SPECIES_COLOR = {
  owl: '#b98a5e', tortoise: '#8fcf7a', raccoon: '#9aa3b5', frog: '#7fd67a', hedgehog: '#c99a6b', mouse: '#cbbfd6',
  duck: '#ffe066', bear: '#c98f62', crab: '#ff7a5c', penguin: '#2f3550', bunny: '#f3e6ff', fox: '#ff9b54', puff: '#ff9ed2', robot: '#7cc6ff', dragon: '#7ee08a'
};

const part = (parent, geo, material, [x = 0, y = 0, z = 0] = [], [rx = 0, ry = 0, rz = 0] = [], scale = null) => {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (scale) m.scale.set(...scale);
  m.castShadow = true;
  parent.add(m);
  return m;
};
const pivot = (parent, [x = 0, y = 0, z = 0] = []) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
};
const S = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h);
const lighter = (c, k = 0.35) => new THREE.Color(c).lerp(new THREE.Color('#ffffff'), k).getStyle();
const darker = (c, k = 0.3) => new THREE.Color(c).multiplyScalar(1 - k).getStyle();

/**
 * A creature. `scale` 1 is buddy-sized (about 1 m tall); teachers are a bit bigger.
 * `costume` dresses a history guide (content/schema.js LOOKS).
 */
export function makeCreature({ species = 'fox', color = null, hat = 'none', costume = null, scale = 1, seed = 1, glasses = false } = {}) {
  const body = color ?? SPECIES_COLOR[species] ?? '#ff9b54';
  const M = toon(body), belly = toon(species === 'penguin' ? '#ffffff' : lighter(body, 0.55)), dark = toon(species === 'penguin' ? '#ff9f43' : darker(body, 0.35));
  const group = new THREE.Group();
  const rig = pivot(group);
  rig.scale.setScalar(scale);
  const squash = pivot(rig); // squash-and-stretch happens here
  const robot = species === 'robot';
  const puff = species === 'puff';
  // Body: a round bean; the head sits on it, bigger than the body.
  const bodyR = puff ? 0.0 : 0.25;
  const hipY = 0.2;
  if (!puff) {
    if (robot) {
      part(squash, new THREE.BoxGeometry(0.42, 0.36, 0.34), M, [0, hipY + 0.18, 0]);
      part(squash, new THREE.BoxGeometry(0.2, 0.14, 0.02), toon('#2b3a55'), [0, hipY + 0.2, 0.175]);
      part(squash, S(0.03, 8, 6), toon('#ffcf4d', { emissive: '#ffb020', ei: 0.6 }), [0.05, hipY + 0.2, 0.19]);
    } else {
      part(squash, S(bodyR), M, [0, hipY + 0.2, 0], [0, 0, 0], [1, 1.05, 0.92]);
      part(squash, S(bodyR * 0.72), belly, [0, hipY + 0.18, 0.09], [0, 0, 0], [1, 1.1, 0.7]);
    }
  }
  // Stubby feet.
  const feet = [-1, 1].map((s) => {
    const p = pivot(squash, [s * 0.12, hipY, 0]);
    part(p, robot ? new THREE.BoxGeometry(0.13, 0.12, 0.2) : S(0.085, 10, 8), robot ? toon('#5b6b85') : dark, [0, -0.13, 0.03], [0, 0, 0], robot ? null : [1, 0.7, 1.35]);
    return p;
  });
  // Little arms (wings for the owl and the dragon).
  const arms = [-1, 1].map((s) => {
    const p = pivot(squash, [s * (puff ? 0.36 : 0.24), hipY + (puff ? 0.33 : 0.27), 0]);
    if (species === 'owl') part(p, S(0.12, 10, 8), dark, [s * 0.04, -0.06, 0], [0, 0, s * 0.3], [0.45, 1.1, 0.8]);
    else part(p, robot ? new THREE.CylinderGeometry(0.035, 0.035, 0.2, 8) : S(0.065, 10, 8), robot ? toon('#5b6b85') : M, [s * 0.03, -0.08, 0], [0, 0, 0], robot ? null : [0.9, 1.3, 0.9]);
    if (robot) part(p, S(0.05, 8, 6), toon('#5b6b85'), [s * 0.03, -0.2, 0]);
    return p;
  });
  // Head.
  const neck = pivot(squash, [0, puff ? 0.0 : hipY + 0.38, 0]);
  const head = pivot(neck);
  const hr = puff ? 0.38 : robot ? 0.3 : 0.32;
  if (robot) {
    part(head, new THREE.BoxGeometry(hr * 2, hr * 1.6, hr * 1.7), M, [0, hr * 0.85, 0]);
    part(head, new THREE.BoxGeometry(hr * 1.6, hr * 1.1, 0.02), toon('#22304a'), [0, hr * 0.85, hr * 0.86]);
    part(head, new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6), toon('#5b6b85'), [0, hr * 1.75, 0]);
    part(head, S(0.05, 10, 8), toon('#ff7a7a', { emissive: '#ff4d4d', ei: 0.7 }), [0, hr * 1.75 + 0.1, 0]);
    for (const s of [-1, 1]) part(head, new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), toon('#5b6b85'), [s * hr * 1.02, hr * 0.85, 0], [0, 0, Math.PI / 2]);
  } else if (puff) {
    const fluff = new THREE.IcosahedronGeometry(hr, 2);
    const p = fluff.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      v.multiplyScalar(1 + Math.sin(v.x * 30 + v.y * 20) * 0.04);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    fluff.computeVertexNormals();
    part(head, fluff, M, [0, hr + 0.06, 0]);
    for (let i = 0; i < 3; i++) part(head, new THREE.ConeGeometry(0.05, 0.16, 6), M, [(i - 1) * 0.07, hr * 2 + 0.08, 0], [0, 0, (i - 1) * -0.5]);
  } else {
    part(head, S(hr, 18, 14), M, [0, hr, 0], [0, 0, 0], [1.05, 0.95, 0.95]);
  }
  // Muzzles, ears, beaks, shells — what makes each species.
  const faceZ = hr * 0.9;
  const ears = [];
  if (species === 'fox') {
    part(head, S(hr * 0.42, 12, 8), belly, [0, hr * 0.7, faceZ * 0.92], [0, 0, 0], [1.1, 0.75, 0.8]);
    part(head, S(0.045, 8, 6), toon('#2b2118'), [0, hr * 0.8, faceZ + 0.06]);
    for (const s of [-1, 1]) {
      const e = pivot(head, [s * hr * 0.55, hr * 1.7, 0]);
      part(e, new THREE.ConeGeometry(0.11, 0.24, 4), M, [0, 0.08, 0], [0, Math.PI / 4, s * -0.25]);
      part(e, new THREE.ConeGeometry(0.05, 0.1, 4), toon('#3a2a20'), [s * -0.02, 0.17, 0], [0, Math.PI / 4, s * -0.25]);
      ears.push(e);
    }
  } else if (species === 'bunny') {
    for (const s of [-1, 1]) {
      const e = pivot(head, [s * hr * 0.4, hr * 1.75, 0]);
      part(e, S(0.08, 10, 8), M, [0, 0.2, 0], [0, 0, s * -0.12], [0.8, 3, 0.6]);
      part(e, S(0.05, 10, 8), toon('#ffb3c8'), [0, 0.2, 0.03], [0, 0, s * -0.12], [0.6, 2.4, 0.4]);
      ears.push(e);
    }
    part(head, S(0.035, 8, 6), toon('#ff7aa8'), [0, hr * 0.8, faceZ + 0.04]);
  } else if (species === 'dragon') {
    part(head, S(hr * 0.45, 12, 8), belly, [0, hr * 0.62, faceZ * 0.85], [0, 0, 0], [1.2, 0.7, 0.8]);
    for (const s of [-1, 1]) part(head, new THREE.ConeGeometry(0.05, 0.2, 6), toon('#fff1c4'), [s * hr * 0.45, hr * 1.85, -0.03], [-0.3, 0, s * -0.3]);
    for (const s of [-1, 1]) {
      const wing = new THREE.BufferGeometry();
      wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, s * 0.34, 0.22, -0.05, s * 0.3, -0.08, -0.05], 3));
      wing.computeVertexNormals();
      part(squash, wing, toon(lighter(body, 0.2), { side: THREE.DoubleSide }), [s * 0.12, hipY + 0.32, -0.18]);
    }
  } else if (species === 'owl') {
    for (const s of [-1, 1]) part(head, S(hr * 0.36, 12, 10), belly, [s * hr * 0.38, hr * 1.05, faceZ * 0.72], [0, 0, 0], [1, 1, 0.5]);
    part(head, new THREE.ConeGeometry(0.06, 0.13, 6), toon('#ffb347'), [0, hr * 0.78, faceZ + 0.04], [Math.PI / 2 + 0.3, 0, 0]);
    for (const s of [-1, 1]) {
      const e = pivot(head, [s * hr * 0.62, hr * 1.75, 0]);
      part(e, new THREE.ConeGeometry(0.07, 0.18, 5), dark, [0, 0.05, 0], [0, 0, s * -0.4]);
      ears.push(e);
    }
  } else if (species === 'tortoise') {
    part(squash, new THREE.SphereGeometry(0.36, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#8a6a3c'), [0, hipY + 0.12, -0.05], [0, 0, 0], [1, 0.95, 1.05]);
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(squash, new THREE.CylinderGeometry(0.08, 0.09, 0.03, 6), toon('#c49a5a'), i ? [Math.cos(a) * 0.2, hipY + 0.33, -0.05 + Math.sin(a) * 0.2] : [0, hipY + 0.47, -0.05], i ? [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6] : [0, 0, 0]);
    }
    neck.position.set(0, hipY + 0.3, 0.26);
  } else if (species === 'raccoon') {
    part(head, new THREE.BoxGeometry(hr * 1.9, hr * 0.42, 0.06), toon('#3a3f4c'), [0, hr * 1.05, faceZ * 0.9], [0, 0, 0]);
    part(head, S(hr * 0.35, 12, 8), toon('#eef0f4'), [0, hr * 0.62, faceZ * 0.9], [0, 0, 0], [1.2, 0.7, 0.8]);
    part(head, S(0.04, 8, 6), toon('#2b2118'), [0, hr * 0.72, faceZ + 0.05]);
    for (const s of [-1, 1]) {
      const e = pivot(head, [s * hr * 0.62, hr * 1.7, 0]);
      part(e, S(0.08, 10, 8), M, [0, 0.03, 0], [0, 0, 0], [1, 1.2, 0.5]);
      ears.push(e);
    }
  } else if (species === 'frog') {
    for (const s of [-1, 1]) part(head, S(hr * 0.38, 12, 10), M, [s * hr * 0.45, hr * 1.65, 0.05]);
  } else if (species === 'hedgehog') {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 1.6 - 0.8, b = (i % 4) * 0.35 + 0.2;
      part(head, new THREE.ConeGeometry(0.06, 0.2, 5), toon('#7a5638'), [Math.sin(a) * hr * 0.85, hr + Math.cos(b) * hr * 0.6, -Math.cos(a) * hr * 0.75], [-1.2 + b, a, 0]);
    }
    part(head, S(0.04, 8, 6), toon('#2b2118'), [0, hr * 0.78, faceZ + 0.08]);
  } else if (species === 'mouse') {
    for (const s of [-1, 1]) {
      const e = pivot(head, [s * hr * 0.7, hr * 1.6, 0]);
      part(e, S(0.14, 12, 10), M, [0, 0.06, 0], [0, 0, 0], [1, 1, 0.35]);
      part(e, S(0.09, 10, 8), toon('#ffc2d6'), [0, 0.06, 0.03], [0, 0, 0], [1, 1, 0.3]);
      ears.push(e);
    }
    part(head, S(0.035, 8, 6), toon('#ff7aa8'), [0, hr * 0.78, faceZ + 0.05]);
  } else if (species === 'crab') {
    for (const s of [-1, 1]) {
      part(head, new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6), M, [s * hr * 0.4, hr * 1.85, 0.05]);
    }
    for (const s of [-1, 1]) {
      const claw = pivot(squash, [s * 0.42, hipY + 0.18, 0.12]);
      part(claw, S(0.13, 10, 8), M, [0, 0, 0], [0, 0, 0], [1, 0.8, 1]);
      part(claw, new THREE.ConeGeometry(0.06, 0.16, 6), M, [s * 0.02, 0.12, 0.06], [-0.4, 0, s * -0.4]);
    }
  } else if (species === 'penguin') {
    part(head, S(hr * 0.6, 12, 10), toon('#ffffff'), [0, hr * 0.85, faceZ * 0.55], [0, 0, 0], [1.2, 1, 0.7]);
    part(head, new THREE.ConeGeometry(0.06, 0.14, 6), toon('#ff9f43'), [0, hr * 0.68, faceZ + 0.05], [Math.PI / 2, 0, 0]);
  } else if (species === 'duck') {
    part(head, S(hr * 0.4, 12, 8), toon('#ff9f43'), [0, hr * 0.7, faceZ + 0.04], [0, 0, 0], [1.2, 0.45, 0.9]);
  } else if (species === 'bear') {
    part(head, S(hr * 0.4, 12, 8), belly, [0, hr * 0.68, faceZ * 0.9], [0, 0, 0], [1.1, 0.8, 0.7]);
    part(head, S(0.045, 8, 6), toon('#2b2118'), [0, hr * 0.78, faceZ + 0.06]);
    for (const s of [-1, 1]) {
      const e = pivot(head, [s * hr * 0.68, hr * 1.62, 0]);
      part(e, S(0.1, 10, 8), M, [0, 0, 0], [0, 0, 0], [1, 1, 0.6]);
      ears.push(e);
    }
  }
  // Tails.
  const tail = pivot(squash, [0, hipY + 0.12, -0.24]);
  if (species === 'fox') {
    part(tail, S(0.13, 10, 8), M, [0, 0.12, -0.14], [0.6, 0, 0], [0.8, 1.6, 0.8]);
    part(tail, S(0.08, 8, 6), toon('#ffffff'), [0, 0.3, -0.26]);
  } else if (species === 'bunny' || species === 'bear' || species === 'puff') part(tail, S(0.08, 8, 6), toon('#ffffff'), [0, 0.02, 0]);
  else if (species === 'dragon') {
    part(tail, new THREE.ConeGeometry(0.09, 0.4, 8), M, [0, 0.0, -0.18], [-1.9, 0, 0]);
    part(tail, new THREE.ConeGeometry(0.06, 0.1, 4), toon('#fff1c4'), [0, 0.1, -0.15], [-0.4, 0, 0]);
  } else if (species === 'raccoon') {
    for (let i = 0; i < 4; i++) part(tail, S(0.09, 10, 8), toon(i % 2 ? '#3a3f4c' : body), [0, 0.04 + i * 0.07, -0.08 - i * 0.07]);
  } else if (species === 'mouse') part(tail, new THREE.TorusGeometry(0.15, 0.015, 4, 12, Math.PI), toon('#ffb3c8'), [0, 0.05, -0.12], [0, Math.PI / 2, 0]);
  // The face: huge shiny eyes, brows, a mouth that smiles, talks and frowns, blush.
  const eyeW = toon('#ffffff'), eyeD = toon('#1d1a2a'), shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const eyeY = robot ? hr * 0.9 : species === 'owl' ? hr * 1.05 : hr * 1.08;
  const eyeX = robot ? hr * 0.36 : species === 'owl' ? hr * 0.38 : hr * 0.36;
  const eyeS = species === 'owl' ? 1.25 : 1;
  const eyes = [-1, 1].map((s) => {
    const e = pivot(head, [s * eyeX, eyeY, robot ? hr * 0.88 : faceZ * (species === 'owl' ? 0.95 : 0.88)]);
    if (robot) {
      part(e, S(hr * 0.17, 12, 8), toon('#7ff7ff', { emissive: '#3fe0ff', ei: 0.9 }), [0, 0, 0], [0, 0, 0], [1, 1, 0.3]);
    } else {
      part(e, S(hr * 0.24 * eyeS, 14, 10), eyeW, [0, 0, 0], [0, 0, 0], [1, 1.12, 0.55]);
      part(e, S(hr * 0.17 * eyeS, 14, 10), eyeD, [0, -0.005, hr * 0.09], [0, 0, 0], [1, 1.1, 0.5]);
      part(e, S(hr * 0.06 * eyeS, 8, 6), shine, [hr * 0.05, hr * 0.07, hr * 0.17]);
      part(e, S(hr * 0.03 * eyeS, 6, 4), shine, [-hr * 0.05, -hr * 0.05, hr * 0.17]);
    }
    return e;
  });
  const brows = robot || puff ? [] : [-1, 1].map((s) => part(head, new THREE.CapsuleGeometry(0.012, hr * 0.22, 3, 6), toon(darker(body, 0.55)), [s * eyeX, eyeY + hr * 0.36, faceZ * 0.9], [0, 0, Math.PI / 2 - s * 0.15]));
  const mouthY = robot ? hr * 0.55 : species === 'duck' || species === 'owl' ? hr * 0.55 : hr * 0.58;
  const smile = part(head, new THREE.TorusGeometry(hr * 0.13, hr * 0.03, 5, 12, Math.PI), toon(robot ? '#7ff7ff' : '#5a2430'), [0, mouthY, faceZ * (robot ? 0.98 : 0.97)], [0, 0, Math.PI]);
  const open = part(head, S(hr * 0.11, 10, 8), toon('#7a2638'), [0, mouthY - 0.01, faceZ * 0.96], [0, 0, 0], [1.1, 0.8, 0.4]);
  open.visible = false;
  const frown = part(head, new THREE.TorusGeometry(hr * 0.1, hr * 0.028, 5, 12, Math.PI), toon('#5a2430'), [0, mouthY - 0.03, faceZ * 0.97]);
  frown.visible = false;
  if (!robot) for (const s of [-1, 1]) part(head, S(hr * 0.12, 10, 6), toon('#ff8fa8', { opacity: 0.7 }), [s * hr * 0.62, hr * 0.78, faceZ * 0.8], [0, 0, 0], [1, 0.55, 0.3]);
  if (glasses || species === 'owl' || species === 'tortoise') {
    const fr = toon('#3a2e2a');
    for (const s of [-1, 1]) part(head, new THREE.TorusGeometry(hr * 0.27 * eyeS, hr * 0.03, 5, 16), fr, [s * eyeX, eyeY, faceZ * 0.98]);
    part(head, new THREE.BoxGeometry(hr * 0.2, hr * 0.04, hr * 0.04), fr, [0, eyeY + hr * 0.04, faceZ * 1.0]);
  }
  if (species === 'raccoon') for (const s of [-1, 1]) part(head, new THREE.TorusGeometry(hr * 0.27, hr * 0.06, 6, 14), toon('#d7b45a'), [s * eyeX, eyeY + hr * 0.55, faceZ * 0.7], [-0.5, 0, 0]);
  wearHat(head, costume ? COSTUME_HATS[costume] : hat, hr, species, costume);
  if (costume) dress(squash, costume, hipY);
  if (species === 'owl' && !costume) wearHat(head, 'mortarboard', hr, species);
  // A soft round shadow.
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshBasicMaterial({ color: '#1f3a3a', transparent: true, opacity: 0.2, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.03;
  blob.scale.setScalar(scale);
  group.add(blob);

  const st = { phase: Math.random(), t: Math.random() * 10, blink: 2 + Math.random() * 3, look: 0, lookT: 2, waveT: 0, cheerT: 0, hopT: 0, sadT: 0, talkT: 0 };
  function update(dt, { speed = 0 } = {}) {
    st.t += dt;
    const walking = speed > 0.05;
    st.phase += dt * (walking ? 2.2 + speed * 0.35 : 0);
    const p = st.phase * Math.PI * 2;
    // Bouncy walk: a hop every step, squash on landing.
    let y = 0, sy = 1;
    if (walking) {
      const b = Math.abs(Math.sin(p));
      y = b * 0.09;
      sy = 1 + (b - 0.5) * 0.12;
    } else sy = 1 + Math.sin(st.t * 2.4) * 0.025;
    st.hopT = Math.max(0, st.hopT - dt);
    st.cheerT = Math.max(0, st.cheerT - dt);
    st.sadT = Math.max(0, st.sadT - dt);
    st.waveT = Math.max(0, st.waveT - dt);
    st.talkT = Math.max(0, st.talkT - dt);
    if (st.hopT > 0) {
      const k = 1 - st.hopT / 0.6;
      y = Math.sin(Math.PI * k) * 0.45;
      sy = k < 0.15 ? 0.8 : k > 0.9 ? 0.85 : 1.12;
    }
    if (st.cheerT > 0) {
      y = Math.abs(Math.sin(st.t * 9)) * 0.3;
      sy = 1 + Math.sin(st.t * 18) * 0.08;
      rig.rotation.y = Math.sin(st.t * 6) * 0.4;
    } else rig.rotation.y *= 0.9;
    rig.position.y = y;
    squash.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    rig.rotation.z = st.sadT > 0 ? Math.sin(st.t * 10) * 0.12 * (st.sadT / 1.2) : walking ? Math.sin(p) * 0.06 : 0;
    feet.forEach((f, i) => (f.rotation.x = walking ? Math.sin(p + (i ? Math.PI : 0)) * 0.7 : 0));
    arms.forEach((a, i) => {
      const s = i ? 1 : -1;
      let z = s * 0.25, x = walking ? Math.sin(p + (i ? 0 : Math.PI)) * 0.6 : Math.sin(st.t * 1.6 + i) * 0.05;
      if (st.cheerT > 0) {
        z = s * (2.4 + Math.sin(st.t * 14) * 0.3);
        x = 0;
      } else if (st.waveT > 0 && i === 1) {
        z = 2.3 + Math.sin(st.t * 12) * 0.5;
        x = 0;
      } else if (st.sadT > 0) z = s * 0.05;
      a.rotation.z += (z - a.rotation.z) * Math.min(1, dt * 12);
      a.rotation.x += (x - a.rotation.x) * Math.min(1, dt * 12);
    });
    for (const e of ears) e.rotation.z = st.sadT > 0 ? Math.sign(e.position.x) * 0.6 : Math.sin(st.t * 3 + e.position.x * 10) * 0.08;
    tail.rotation.y = Math.sin(st.t * (walking ? 10 : 3)) * 0.35;
    // Looking about, blinking.
    if ((st.lookT -= dt) < 0) {
      st.look = walking ? 0 : (Math.random() - 0.5) * 0.9;
      st.lookT = 1.5 + Math.random() * 3;
    }
    head.rotation.y += (st.look - head.rotation.y) * Math.min(1, dt * 3);
    head.rotation.x = st.sadT > 0 ? 0.3 : Math.sin(st.t * 0.8) * 0.05;
    if ((st.blink -= dt) < 0) st.blink = 2.2 + Math.random() * 3.5;
    const shut = st.blink < 0.12 || st.cheerT > 0 && Math.sin(st.t * 3) > 0.7;
    for (const e of eyes) e.scale.y = shut ? 0.1 : st.sadT > 0 ? 0.75 : 1;
    const talking = st.talkT > 0 && Math.sin(st.t * 16) > -0.2;
    open.visible = talking || st.cheerT > 0 || st.hopT > 0;
    frown.visible = st.sadT > 0 && !open.visible;
    smile.visible = !open.visible && !frown.visible;
    brows.forEach((b, i) => {
      b.position.y = eyeY + hr * (st.sadT > 0 ? 0.3 : 0.36 + (st.talkT > 0 || st.cheerT > 0 ? 0.06 : 0));
      b.rotation.z = Math.PI / 2 - (i ? -1 : 1) * (st.sadT > 0 ? -0.35 : 0.15);
    });
  }
  update(0);
  return {
    group,
    update,
    species,
    hop: () => (st.hopT = 0.6),
    cheer: (s = 1.8) => (st.cheerT = s),
    sad: (s = 1.2) => (st.sadT = s),
    wave: (s = 1.6) => (st.waveT = s),
    talk: (s = 2) => (st.talkT = s),
    state: st
  };
}

/** History guides: a costume hat and a bit of clothing for each look. */
const COSTUME_HATS = {
  guide: 'beanie', 'stone-age': 'bone', egypt: 'nemes', mesopotamia: 'cap', greece: 'wreath', rome: 'helmet', china: 'topknot', 'silk-road': 'turban',
  viking: 'roundhelm', knight: 'knight', 'castle-cook': 'chef', maya: 'feathers', mali: 'kufi', printer: 'flatcap', explorer: 'tricorn', inventor: 'tophat',
  factory: 'flatcap', scientist: 'goggles', pilot: 'pilot', astronaut: 'space', nurse: 'nurse', farmer: 'straw'
};
const COSTUME_COLORS = {
  guide: '#2f5d6b', 'stone-age': '#c9a77a', egypt: '#f2ead8', mesopotamia: '#b0643c', greece: '#f4f1ea', rome: '#d0453e', china: '#2f9d8b', 'silk-road': '#e07b3b',
  viking: '#6f9a5f', knight: '#9aa3ad', 'castle-cook': '#ffffff', maya: '#2fb5a3', mali: '#f0b43a', printer: '#e8dcc4', explorer: '#3f6fb3', inventor: '#7a5a46',
  factory: '#6b7c8f', scientist: '#ffffff', pilot: '#8a6a4e', astronaut: '#f4f4f4', nurse: '#f4f6f8', farmer: '#5f9f4f'
};
function dress(squash, costume, hipY) {
  const c = toon(COSTUME_COLORS[costume] ?? '#2f5d6b');
  // A cape or tunic over the body: a short skirt-cone and a collar.
  part(squash, new THREE.CylinderGeometry(0.2, 0.31, 0.26, 14, 1, true), c, [0, hipY + 0.12, 0], [0, 0, 0]);
  part(squash, new THREE.TorusGeometry(0.16, 0.04, 6, 14), c, [0, hipY + 0.4, 0], [Math.PI / 2, 0, 0]);
}

function wearHat(head, hat, hr, species, costume = null) {
  if (!hat || hat === 'none') return;
  const top = hr * (species === 'robot' ? 1.72 : species === 'puff' ? 2.1 : 1.9);
  const c = (col, extra) => toon(col, extra);
  const P = (geo, m, pos, rot, sc) => part(head, geo, m, pos, rot, sc);
  switch (hat) {
    case 'party':
      P(new THREE.ConeGeometry(hr * 0.42, hr * 0.95, 14), c('#ff6fb5'), [0.04, top + hr * 0.38, 0], [0, 0, -0.2]);
      P(S(hr * 0.12, 8, 6), c('#ffe066'), [0.13, top + hr * 0.86, 0]);
      for (let i = 0; i < 3; i++) P(new THREE.TorusGeometry(hr * (0.33 - i * 0.09), hr * 0.03, 4, 14), c(['#7cc6ff', '#ffe066', '#7ee08a'][i]), [0.04 + i * 0.03, top + hr * (0.12 + i * 0.22), 0], [Math.PI / 2, 0.2, 0]);
      break;
    case 'beanie':
      P(new THREE.SphereGeometry(hr * 0.86, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c('#ef6f6c'), [0, top - hr * 0.42, 0]);
      P(new THREE.TorusGeometry(hr * 0.84, hr * 0.1, 6, 16), c('#fff1f1'), [0, top - hr * 0.42, 0], [Math.PI / 2, 0, 0]);
      P(S(hr * 0.16, 8, 6), c('#fff1f1'), [0, top + hr * 0.45, 0]);
      break;
    case 'flower':
      P(new THREE.TorusGeometry(hr * 0.72, hr * 0.06, 5, 16), c('#7ee08a'), [0, top - hr * 0.3, 0], [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        P(S(hr * 0.13, 8, 6), c(['#ff9ed2', '#ffe066', '#ffffff'][i % 3]), [Math.cos(a) * hr * 0.72, top - hr * 0.26, Math.sin(a) * hr * 0.72]);
      }
      break;
    case 'propeller':
      P(new THREE.SphereGeometry(hr * 0.8, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c('#7cc6ff'), [0, top - hr * 0.4, 0]);
      P(new THREE.CylinderGeometry(0.01, 0.01, hr * 0.3, 6), c('#555'), [0, top + hr * 0.5, 0]);
      for (const s of [-1, 1]) P(new THREE.BoxGeometry(hr * 0.9, 0.01, hr * 0.12), c(s > 0 ? '#ff6f6f' : '#ffe066'), [s * hr * 0.42, top + hr * 0.65, 0]);
      break;
    case 'wizard':
      P(new THREE.ConeGeometry(hr * 0.6, hr * 1.4, 14), c('#6f5ad6'), [0, top + hr * 0.5, -0.02], [-0.15, 0, 0]);
      P(new THREE.CylinderGeometry(hr * 0.95, hr * 0.95, hr * 0.06, 18), c('#6f5ad6'), [0, top - hr * 0.2, 0]);
      for (let i = 0; i < 3; i++) P(S(hr * 0.06, 6, 4), c('#ffe066', { emissive: '#ffd36b', ei: 0.6 }), [Math.cos(i * 2) * hr * 0.35, top + hr * (0.2 + i * 0.3), hr * 0.3]);
      break;
    case 'crown':
      P(new THREE.CylinderGeometry(hr * 0.55, hr * 0.5, hr * 0.32, 10, 1, true), c('#ffd23f', { metal: 0.6 }), [0, top - hr * 0.1, 0]);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        P(new THREE.ConeGeometry(hr * 0.1, hr * 0.25, 4), c('#ffd23f', { metal: 0.6 }), [Math.cos(a) * hr * 0.52, top + hr * 0.15, Math.sin(a) * hr * 0.52]);
        P(S(hr * 0.06, 6, 4), c(['#ff6f6f', '#7cc6ff', '#7ee08a'][i % 3]), [Math.cos(a) * hr * 0.56, top - hr * 0.08, Math.sin(a) * hr * 0.56]);
      }
      break;
    case 'space':
      P(S(hr * 1.35, 18, 14), c('#bfe9ff', { opacity: 0.35 }), [0, hr * 0.95, 0]);
      P(new THREE.TorusGeometry(hr * 0.95, hr * 0.12, 6, 18), c('#e8eef5'), [0, hr * 0.05, 0], [Math.PI / 2, 0, 0]);
      break;
    case 'mortarboard':
      P(new THREE.BoxGeometry(hr * 1.5, hr * 0.08, hr * 1.5), c('#2b2b3a'), [0, top - hr * 0.05, 0], [0, Math.PI / 4, 0]);
      P(new THREE.CylinderGeometry(hr * 0.5, hr * 0.55, hr * 0.25, 12), c('#2b2b3a'), [0, top - hr * 0.2, 0]);
      P(S(hr * 0.07, 6, 4), c('#ffd23f'), [0, top + hr * 0.02, 0]);
      P(new THREE.CylinderGeometry(0.008, 0.008, hr * 0.5, 4), c('#ffd23f'), [hr * 0.5, top - hr * 0.2, hr * 0.2], [0, 0, 0.2]);
      break;
    case 'bone':
      P(new THREE.CylinderGeometry(0.02, 0.02, hr * 0.9, 6), c('#f4efe1'), [0, top - hr * 0.2, 0], [0, 0, Math.PI / 2]);
      for (const s of [-1, 1]) P(S(hr * 0.09, 6, 4), c('#f4efe1'), [s * hr * 0.45, top - hr * 0.2, 0]);
      break;
    case 'nemes':
      P(new THREE.SphereGeometry(hr * 1.06, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), c('#f2c94c'), [0, hr * 1.02, -hr * 0.04]);
      for (const s of [-1, 1]) P(new THREE.BoxGeometry(hr * 0.3, hr * 1.0, hr * 0.12), c('#3b6fd6'), [s * hr * 0.92, hr * 0.6, hr * 0.15]);
      break;
    case 'helmet':
      P(new THREE.SphereGeometry(hr * 1.04, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c('#e2b84a', { metal: 0.5 }), [0, hr * 1.08, 0]);
      P(new THREE.BoxGeometry(hr * 0.18, hr * 0.55, hr * 1.7), c('#e0453e'), [0, top + hr * 0.15, -hr * 0.05]);
      break;
    case 'roundhelm':
      P(new THREE.SphereGeometry(hr * 1.04, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c('#a3abb5', { metal: 0.4 }), [0, hr * 1.08, 0]);
      P(new THREE.BoxGeometry(hr * 0.1, hr * 0.5, hr * 0.1), c('#a3abb5', { metal: 0.4 }), [0, hr * 1.0, hr * 1.0]);
      break;
    case 'knight':
      P(new THREE.CylinderGeometry(hr * 1.02, hr * 1.02, hr * 1.2, 14), c('#b9c1ca', { metal: 0.5 }), [0, hr * 1.25, 0]);
      P(new THREE.BoxGeometry(hr * 1.3, hr * 0.12, hr * 0.1), c('#2d2d33'), [0, hr * 1.1, hr * 1.0]);
      P(new THREE.ConeGeometry(hr * 0.2, hr * 0.6, 6), c('#3d6fd6'), [0, hr * 2.15, 0]);
      break;
    case 'chef':
      P(new THREE.CylinderGeometry(hr * 0.75, hr * 0.7, hr * 0.6, 12), c('#ffffff'), [0, top + hr * 0.05, 0]);
      P(S(hr * 0.85, 12, 8), c('#ffffff'), [0, top + hr * 0.45, 0], [0, 0, 0], [1, 0.6, 1]);
      break;
    case 'tophat':
      P(new THREE.CylinderGeometry(hr * 1.2, hr * 1.2, hr * 0.06, 16), c('#2b2b3a'), [0, top - hr * 0.2, 0]);
      P(new THREE.CylinderGeometry(hr * 0.65, hr * 0.65, hr * 0.9, 16), c('#2b2b3a'), [0, top + hr * 0.25, 0]);
      P(new THREE.CylinderGeometry(hr * 0.66, hr * 0.66, hr * 0.12, 16), c('#e0453e'), [0, top - hr * 0.08, 0]);
      break;
    case 'flatcap':
    case 'cap':
    case 'kufi':
      P(new THREE.CylinderGeometry(hr * 0.82, hr * 0.9, hr * 0.38, 14), c(hat === 'kufi' ? '#f4f1ea' : hat === 'cap' ? '#e2a33a' : '#6b5b4b'), [0, top - hr * 0.3, 0]);
      if (hat === 'flatcap') P(new THREE.BoxGeometry(hr * 1.0, hr * 0.07, hr * 0.5), c('#6b5b4b'), [0, top - hr * 0.42, hr * 0.8]);
      break;
    case 'turban':
      P(new THREE.TorusGeometry(hr * 0.75, hr * 0.28, 6, 14), c('#f6e7c8'), [0, top - hr * 0.3, 0], [Math.PI / 2, 0, 0]);
      P(S(hr * 0.75, 12, 8), c('#f6e7c8'), [0, top - hr * 0.2, 0], [0, 0, 0], [1, 0.6, 1]);
      P(S(hr * 0.1, 6, 4), c('#e0453e'), [0, top - hr * 0.2, hr * 0.85]);
      break;
    case 'wreath':
      P(new THREE.TorusGeometry(hr * 0.9, hr * 0.07, 4, 16), c('#6fbf4f'), [0, top - hr * 0.35, 0], [Math.PI / 2 - 0.2, 0, 0]);
      break;
    case 'topknot':
      P(S(hr * 0.3, 10, 8), c('#2b2b3a'), [0, top, -hr * 0.1]);
      P(new THREE.BoxGeometry(hr * 0.1, hr * 0.1, hr * 0.7), c('#ffd23f'), [0, top, -hr * 0.1]);
      break;
    case 'feathers':
      P(new THREE.CylinderGeometry(hr * 0.9, hr * 0.95, hr * 0.25, 14), c('#ffd23f'), [0, top - hr * 0.3, 0]);
      for (let i = 0; i < 7; i++) P(new THREE.ConeGeometry(hr * 0.1, hr * 1.0, 4), c(['#2fb5a3', '#e0453e', '#ffd23f'][i % 3]), [(i - 3) * hr * 0.22, top + hr * 0.25, -hr * 0.3], [-0.3, 0, (i - 3) * 0.18]);
      break;
    case 'tricorn':
      P(new THREE.CylinderGeometry(hr * 1.1, hr * 1.1, hr * 0.1, 3), c('#2b2b3a'), [0, top - hr * 0.25, 0], [0, Math.PI, 0]);
      P(new THREE.CylinderGeometry(hr * 0.65, hr * 0.75, hr * 0.4, 12), c('#2b2b3a'), [0, top - hr * 0.05, 0]);
      break;
    case 'goggles':
      for (const s of [-1, 1]) P(new THREE.TorusGeometry(hr * 0.2, hr * 0.06, 6, 12), c('#d7b45a', { metal: 0.5 }), [s * hr * 0.36, top - hr * 0.35, hr * 0.7], [-0.6, 0, 0]);
      P(new THREE.TorusGeometry(hr * 0.95, hr * 0.04, 4, 18), c('#5a4a3a'), [0, top - hr * 0.4, 0], [Math.PI / 2 - 0.3, 0, 0]);
      break;
    case 'pilot':
      P(new THREE.SphereGeometry(hr * 1.06, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), c('#8a6a4e'), [0, hr * 1.0, -hr * 0.03]);
      for (const s of [-1, 1]) P(new THREE.TorusGeometry(hr * 0.2, hr * 0.06, 6, 12), c('#4c5560', { metal: 0.4 }), [s * hr * 0.36, hr * 1.6, hr * 0.75], [-0.5, 0, 0]);
      break;
    case 'nurse':
      P(new THREE.BoxGeometry(hr * 1.0, hr * 0.4, hr * 0.5), c('#ffffff'), [0, top - hr * 0.15, hr * 0.15]);
      P(new THREE.BoxGeometry(hr * 0.26, hr * 0.08, hr * 0.02), c('#e0453e'), [0, top - hr * 0.15, hr * 0.41]);
      break;
    case 'straw':
      P(new THREE.CylinderGeometry(hr * 1.5, hr * 1.5, hr * 0.07, 16), c('#f2d27a'), [0, top - hr * 0.3, 0]);
      P(new THREE.CylinderGeometry(hr * 0.7, hr * 0.85, hr * 0.45, 14), c('#f2d27a'), [0, top - hr * 0.05, 0]);
      P(new THREE.CylinderGeometry(hr * 0.86, hr * 0.86, hr * 0.1, 14), c('#e0453e'), [0, top - hr * 0.2, 0]);
      break;
    default:
      break;
  }
}

/** The teachers: owl for math, tortoise for history, raccoon for physics. */
export const TEACHERS = {
  math: { name: 'Professor Hoot', species: 'owl', emoji: '🦉' },
  history: { name: 'Tock the Time-Keeper', species: 'tortoise', emoji: '🐢' },
  physics: { name: 'Gizmo the Inventor', species: 'raccoon', emoji: '🦝' }
};
/** A guide's species, from their look (the same look, the same critter). */
export function guideSpecies(look) {
  const list = ['bear', 'fox', 'mouse', 'hedgehog', 'frog', 'duck', 'bunny', 'owl'];
  let h = 0;
  for (const ch of String(look)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
