/**
 * Everyone in AI Arcademia is a soft-vinyl-toy creature — no people. Each
 * one is sculpted at load from smooth signed-distance shapes (creatures/
 * sculpt.js, recipes in creatures/species.js), auto-skinned to a small
 * skeleton and animated in code: a squash-and-stretch walk, breathing, ear
 * flicks, a wagging tail, hops, a cheer dance, a sad droop and a wave. Faces
 * have glossy eyes with eyelids and swap shapes for each expression
 * (creatures/face.js); hats are little 3D models (creatures/hats.js).
 * All original designs:
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
 *   c.surprise()  c.think()  c.happy()  c.react(right)  c.lipSync(level)
 *
 * On the space maps everyone wears a space suit (`suit: 'moon' | 'mars'`): the
 * body below the head is repainted as a soft suit with gloves, boots and a
 * belt, a clear bubble helmet sized to the head goes on (long ears fold down
 * inside; a small hat stays on under the glass), with an oxygen pack on the
 * back and a little chest light.
 *
 * Meshes are built once per species (and costume) and level of detail, then
 * shared; the body colour is a material uniform. `lod: 'low'` is for
 * townsfolk far away, 'high' for the buddy, 'ultra' for close-ups.
 */
import * as THREE from 'three';
import { t } from '../i18n/index.js';
import { slotOf } from '../content/subjects.js';
import { SPECIES, costumePaint, garbPaint } from './creatures/species.js';
import { compile, sculpt, trace } from './creatures/sculpt.js';
import { creatureMaterial, outlineMaterial, inkFor, propMaterial } from './creatures/materials.js';
import { buildFace } from './creatures/face.js';
import { makeHat, spaceHelmet, oxygenPack, chestLight, SUITS, HATS_IN_HELMET } from './creatures/hats.js';

/** Names come from the current language (i18n chars.js), so they are getters. */
const named = (list, prefix) => list.map((x) => Object.defineProperty(x, 'name', { get: () => t(`${prefix}.${x.id}`), enumerable: true }));
export const BUDDIES = named([
  { id: 'fox', color: '#ff9b54', emoji: '🦊' },
  { id: 'robot', color: '#7cc6ff', emoji: '🤖' },
  { id: 'dragon', color: '#7ee08a', emoji: '🐲' },
  { id: 'puff', color: '#ff9ed2', emoji: '☁️' },
  { id: 'bunny', color: '#c9b6ff', emoji: '🐰' }
], 'buddy');
export const BUDDY_COLORS = ['#ff9b54', '#7cc6ff', '#7ee08a', '#ff9ed2', '#c9b6ff', '#ffd45c', '#ff7a7a', '#5fd3c6'];
/** Each colour's name key (chars.js), for screen readers. */
export const COLOR_NAMES = ['orange', 'sky', 'green', 'pink', 'lilac', 'yellow', 'red', 'teal'];
/** Hats a buddy can wear (bought with coins in the wardrobe). */
export const HATS = named([
  { id: 'none', cost: 0, emoji: '🙂' },
  { id: 'party', cost: 0, emoji: '🥳' },
  { id: 'beanie', cost: 40, emoji: '🧢' },
  { id: 'flower', cost: 60, emoji: '🌸' },
  { id: 'propeller', cost: 90, emoji: '🚁' },
  { id: 'wizard', cost: 140, emoji: '🧙' },
  { id: 'crown', cost: 220, emoji: '👑' },
  { id: 'space', cost: 300, emoji: '🚀' }
], 'hat');
/* ---------------------------------------------------------------- building */

const RES = { low: 40, mid: 56, high: 76, ultra: 100 };
const models = new Map();
const geos = new Map();
/** The compiled recipe for a species (and a guide's costume colours). */
function modelFor(species, costume) {
  const key = `${species}|${costume ?? ''}`;
  if (!models.has(key)) {
    const recipe = (SPECIES[species] ?? SPECIES.fox)();
    if (costume) recipe.paint = [...(recipe.paint ?? []), ...(GARB[costume] ? garbPaint(GARB[costume]) : costumePaint(COSTUME_COLORS[costume] ?? '#2f5d6b'))];
    const model = compile(recipe);
    // The head: its biggest shape on the head bone; its top, where hats sit.
    const headPart = model.parts.filter((p) => p.bone === 'head' && (p.s === 'ell' || p.s === 'sph' || p.s === 'box')).sort((a, b) => (b.r?.[0] ?? b.r) - (a.r?.[0] ?? a.r))[0];
    const c = headPart.c, hr = Array.isArray(headPart.r) ? headPart.r[0] : headPart.r;
    const top = trace(model.sdf, [c[0], c[1] + 2, c[2] + 0.02], [0, -1, 0], 4) ?? [c[0], c[1] + hr, c[2]];
    model.head = { c, hr, top };
    models.set(key, model);
  }
  return models.get(key);
}
/** The sculpted, skinned geometry, built once per species/costume/detail. */
export function creatureGeometry(species, { costume = null, lod = 'high' } = {}) {
  const key = `${species}|${costume ?? ''}|${lod}`;
  if (!geos.has(key)) {
    const t0 = performance.now();
    geos.set(key, sculpt(modelFor(species, costume), { res: RES[lod] ?? RES.high }));
    stats.builds++;
    stats.ms += performance.now() - t0;
  }
  return geos.get(key);
}
/** How long sculpting has taken so far (for the report and tests). */
export const stats = { builds: 0, ms: 0 };

/* ---------------------------------------------------------------- space suits */

/** The bones a space suit covers (the head, ears, tail and wings stay out). */
const SUIT_BONES = new Set(['root', 'hips', 'chest', 'armL', 'armR', 'legL', 'legR']);
const suitInfos = new Map();
/**
 * Where a creature's head and body are (from its sculpted mesh at rest, model space): the head's box
 * (its own bone only, not the ears), the suited body's box, the lowest point, each limb's reach.
 */
function suitInfo(species, costume, geometry) {
  const key = `${species}|${costume ?? ''}`;
  if (suitInfos.has(key)) return suitInfos.get(key);
  const recipe = modelFor(species, costume).recipe;
  const names = recipe.bones.map((b) => b[0]);
  const rest = Object.fromEntries(recipe.bones.map(([n, , x, y, z]) => [n, [x, y, z]]));
  const P = geometry.attributes.position, SI = geometry.attributes.skinIndex;
  const box = () => ({ min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
  const grow = (b, x, y, z) => {
    b.min[0] = Math.min(b.min[0], x); b.min[1] = Math.min(b.min[1], y); b.min[2] = Math.min(b.min[2], z);
    b.max[0] = Math.max(b.max[0], x); b.max[1] = Math.max(b.max[1], y); b.max[2] = Math.max(b.max[2], z);
  };
  const head = box(), body = box(), reach = {};
  let minY = Infinity;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const n = names[SI.getX(i)];
    minY = Math.min(minY, y);
    if (n === 'head') grow(head, x, y, z);
    else if (n === 'chest' || n === 'hips') grow(body, x, y, z);
    if (n === 'armL' || n === 'armR' || n === 'legL' || n === 'legR') {
      const r = rest[n];
      reach[n] = Math.max(reach[n] ?? 0, Math.hypot(x - r[0], y - r[1], z - r[2]));
    }
  }
  if (!Number.isFinite(body.min[0])) Object.assign(body, { min: [-0.18, 0.12, -0.18], max: [0.18, 0.45, 0.18] });
  const info = { names, rest, head, body, minY, reach };
  suitInfos.set(key, info);
  return info;
}
const suitGeos = new Map();
/** The creature's mesh with its body repainted as a space suit (shares everything but the colours). */
function suitGeometry(species, costume, lod, kind) {
  const key = `${species}|${costume ?? ''}|${lod}|${kind}`;
  if (suitGeos.has(key)) return suitGeos.get(key);
  const base = creatureGeometry(species, { costume, lod });
  const info = suitInfo(species, costume, base);
  const S = SUITS[kind] ?? SUITS.moon;
  const c = { body: new THREE.Color(S.body), belt: new THREE.Color(S.belt), boots: new THREE.Color(S.boots), glove: new THREE.Color(S.glove), dust: S.dust ? new THREE.Color(S.dust) : null };
  const P = base.attributes.position, SI = base.attributes.skinIndex;
  const colors = base.attributes.color.array.slice(), tint = base.attributes.tint.array.slice();
  const beltY = (info.rest.hips?.[1] ?? 0.22) + 0.035;
  const col = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const n = info.names[SI.getX(i)];
    if (!SUIT_BONES.has(n)) continue;
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    col.copy(c.body);
    if (n === 'legL' || n === 'legR') {
      if (y < info.minY + 0.085) col.copy(c.boots);
    } else if (n === 'armL' || n === 'armR') {
      const r = info.rest[n];
      if (Math.hypot(x - r[0], y - r[1], z - r[2]) > (info.reach[n] ?? 0.15) * 0.62) col.copy(c.glove);
    } else if (Math.abs(y - beltY) < 0.02) col.copy(c.belt);
    // Mars: a little red dust on the legs.
    if (c.dust && col.equals(c.body)) col.lerp(c.dust, Math.max(0, 1 - (y - info.minY) / 0.22) * (0.45 + 0.25 * Math.sin(x * 40 + z * 31)));
    col.toArray(colors, i * 3);
    tint[i * 2] = 0;
    tint[i * 2 + 1] = 1;
  }
  const geo = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'skinIndex', 'skinWeight']) geo.setAttribute(name, base.attributes[name]);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('tint', new THREE.BufferAttribute(tint, 2));
  geo.setIndex(base.index);
  geo.boundingSphere = base.boundingSphere;
  geo.boundingBox = base.boundingBox;
  suitGeos.set(key, geo);
  return geo;
}

/** The skeleton for one creature (bones are per creature; geometry is shared). */
function bonesFor(recipe) {
  const byName = {};
  const list = recipe.bones.map(([name, parent, x, y, z]) => {
    const b = new THREE.Bone();
    b.name = name;
    b.userData.rest = new THREE.Vector3(x, y, z);
    byName[name] = b;
    return { b, parent };
  });
  for (const { b, parent } of list) {
    if (parent) {
      byName[parent].add(b);
      b.position.copy(b.userData.rest).sub(byName[parent].userData.rest);
    } else b.position.copy(b.userData.rest);
  }
  return { bones: list.map((x) => x.b), byName };
}

/** Wings: a dragon's scalloped bat wings, a bunny sprite's see-through fairy wings or a luna moth's tailed wings, on the wing bones. */
function addWings(kind, byName, body) {
  for (const s of [-1, 1]) {
    const bone = byName[s < 0 ? 'wingL' : 'wingR'];
    const shape = new THREE.Shape();
    if (kind === 'dragon') {
      shape.moveTo(0, 0);
      shape.quadraticCurveTo(0.12, 0.2, 0.34, 0.2);
      shape.quadraticCurveTo(0.3, 0.1, 0.33, 0.02);
      shape.quadraticCurveTo(0.24, 0.0, 0.23, -0.07);
      shape.quadraticCurveTo(0.14, -0.06, 0.12, -0.13);
      shape.quadraticCurveTo(0.05, -0.06, 0, 0);
    } else if (kind === 'moth') {
      // A big rounded forewing and a hindwing that trails off in a long curly tail.
      shape.moveTo(0, 0);
      shape.quadraticCurveTo(0.06, 0.3, 0.3, 0.27);
      shape.quadraticCurveTo(0.42, 0.14, 0.26, 0.03);
      shape.quadraticCurveTo(0.3, -0.12, 0.3, -0.36);
      shape.quadraticCurveTo(0.2, -0.3, 0.16, -0.12);
      shape.quadraticCurveTo(0.08, -0.06, 0, 0);
    } else {
      shape.absellipse(0.16, 0.08, 0.17, 0.11, 0, Math.PI * 2, false, 0.4);
      const low = new THREE.Path();
      void low;
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    let m;
    if (kind === 'dragon') {
      m = new THREE.Mesh(g, propMaterial(new THREE.Color(body).multiplyScalar(0.78).getStyle(), { gloss: 0.4 }));
      const o = new THREE.Mesh(g, outlineMaterial(inkFor(body), 0.01));
      m.add(o);
    } else if (kind === 'moth') {
      m = new THREE.Mesh(g, propMaterial('#cdf3b4', { gloss: 0.3 }));
      m.add(new THREE.Mesh(g, outlineMaterial('#7a9a5a', 0.01)));
      // An eyespot on each forewing: a soft yellow ring round a dark dot.
      const spot = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), propMaterial('#ffd36b'));
      spot.position.set(0.2, 0.14, 0.025);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), propMaterial('#6b4a6a'));
      dot.position.z = 0.002;
      spot.add(dot);
      m.add(spot);
      const edge = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 4, 16), propMaterial('#ff9ec7'));
      edge.position.copy(spot.position);
      m.add(edge);
    } else {
      m = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
      const up = new THREE.Mesh(g, mat);
      const lo = new THREE.Mesh(g, mat);
      lo.scale.set(0.7, 0.7, 1);
      lo.rotation.z = -0.7;
      lo.position.y = -0.02;
      const rim = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#b9a8ff', side: THREE.BackSide, transparent: true, opacity: 0.6 }));
      rim.scale.set(1.04, 1.06, 1);
      up.add(rim);
      m.add(up, lo);
    }
    m.scale.x = s * -1;
    // A luna moth's wings are big: they show round its body from every side.
    if (kind === 'moth') m.scale.set(s * -1.7, 1.7, 1);
    m.rotation.y = s * -0.5;
    m.position.z = -0.02;
    if (kind === 'fairy') m.rotation.z = s * 0.25;
    bone.add(m);
  }
}

/**
 * A creature. `scale` 1 is buddy-sized (about 1 m tall); teachers are a bit bigger.
 * `costume` dresses a history guide (content/schema.js LOOKS).
 */
export function makeCreature({ species = 'fox', color = null, hat = 'none', costume = null, scale = 1, seed = 1, glasses = false, lod = 'high', float = 0, onLand = null, suit = null } = {}) {
  if (!SPECIES[species]) species = 'fox';
  const model = modelFor(species, costume);
  const recipe = model.recipe;
  const body = color ?? recipe.color;
  if (suit && !SUITS[suit]) suit = null;
  const geometry = suit ? suitGeometry(species, costume, lod, suit) : creatureGeometry(species, { costume, lod });
  const group = new THREE.Group();
  const rig = new THREE.Group();
  rig.scale.setScalar(scale);
  group.add(rig);
  const squash = new THREE.Group();
  rig.add(squash);
  const { bones, byName } = bonesFor(recipe);
  const skin = new THREE.SkinnedMesh(geometry, creatureMaterial(body, { fur: recipe.fur ?? 0, gloss: recipe.gloss ?? 0.25 }));
  skin.castShadow = true;
  skin.add(bones[0]);
  skin.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skin.bind(skeleton);
  const hull = new THREE.SkinnedMesh(geometry, outlineMaterial(inkFor(body), lod === 'low' ? 0.016 : 0.011));
  hull.bind(skeleton, skin.bindMatrix);
  hull.raycast = () => {};
  skin.frustumCulled = hull.frustumCulled = false;
  squash.add(skin, hull);
  const headBone = byName.head;
  const headPos = headBone.userData.rest;
  const face = buildFace({ sdf: model.sdf, f: { ...recipe.face, glasses: recipe.face.glasses || glasses }, headBone, headPos, body, lowDetail: lod === 'low' });
  if (recipe.wings) addWings(recipe.wings, byName, body);
  let bulb = null;
  if (recipe.antenna) {
    bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), propMaterial('#ff7a7a', { emissive: '#ff4d4d', ei: 0.9 }));
    bulb.position.set(...recipe.antenna).sub(headPos);
    headBone.add(bulb);
  }
  // Hats: on the head's top point, scaled to the head.
  // A teacher may wear its own hat unless given another (Hoot's mortarboard, Miss Lotus's lotus flower).
  let hatId = costume ? GARB[costume]?.hat ?? COSTUME_HATS[costume] : hat && hat !== 'none' ? hat : species === 'owl' ? 'mortarboard' : recipe.hat?.wear ?? null;
  // In a space suit only a small hat fits under the glass (the old helmets are the suit's now).
  if (suit && !HATS_IN_HELMET.has(hatId)) hatId = null;
  const hatObj = makeHat(hatId);
  let helmet = false;
  if (hatObj) {
    const { top, hr } = model.head;
    const holder = new THREE.Group();
    holder.position.set(top[0], top[1] - 0.02 + (recipe.hat?.lift ?? 0), top[2]).sub(headPos);
    holder.scale.setScalar(hr * (hatObj.userData.helmet ? 1.18 : 1));
    holder.add(hatObj);
    headBone.add(holder);
    helmet = Boolean(hatObj.userData.helmet);
  }
  // The space suit's helmet (sized to the head), oxygen pack and chest light.
  let suitHelmet = null;
  if (suit) {
    const info = suitInfo(species, costume, creatureGeometry(species, { costume, lod }));
    const { head: hb, body: bb } = info;
    const hc = [(hb.min[0] + hb.max[0]) / 2, (hb.min[1] + hb.max[1]) / 2 + 0.015, (hb.min[2] + hb.max[2]) / 2];
    const R = Math.max(hb.max[0] - hb.min[0], hb.max[1] - hb.min[1], hb.max[2] - hb.min[2]) * 0.6 + 0.04;
    suitHelmet = spaceHelmet(suit);
    suitHelmet.position.set(...hc).sub(headPos);
    suitHelmet.scale.setScalar(R);
    headBone.add(suitHelmet);
    helmet = true;
    const chest = byName.chest, cr = chest.userData.rest;
    const bw = bb.max[0] - bb.min[0], bh = bb.max[1] - bb.min[1];
    const pack = oxygenPack(suit);
    const ps = Math.max(0.12, Math.min(bw * 0.62, bh * 0.75));
    pack.scale.setScalar(ps);
    pack.position.set(0, bb.min[1] + bh * 0.55 - cr.y, bb.min[2] - ps * 0.12 - cr.z);
    chest.add(pack);
    const lamp = chestLight(suit);
    lamp.scale.setScalar(Math.max(0.03, bw * 0.13));
    lamp.position.set(0, bb.min[1] + bh * 0.62 - cr.y, bb.max[2] - 0.005 - cr.z);
    chest.add(lamp);
  }
  // A soft round shadow.
  const blob = new THREE.Mesh(BLOB_GEO, BLOB_MAT);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.03;
  blob.scale.setScalar(scale);
  blob.raycast = () => {};
  group.add(blob);

  const rnd = mulberry(seed * 9973 + species.length);
  // Low gravity (`float` 0–1, the Moon): hops go higher and last longer, walking lopes with bigger, slower bounces;
  // `onLand('hop' | 'step')` is called as the feet touch down again (World kicks up moon dust there).
  const HOP = 0.62 * (1 + float * 0.85), HOP_UP = 0.42 * (1 + float * 1.3), BOB = 0.07 * (1 + float * 1.6), LOPE = 1 - float * 0.3;
  const st = { phase: rnd(), t: rnd() * 10, look: 0, lookT: 2, waveT: 0, cheerT: 0, hopT: 0, sadT: 0, talkT: 0, surpriseT: 0, thinkT: 0, happyT: 0, flickT: 1 + rnd() * 3, flick: 0, flickSide: 1, voiceT: 0, voice: 0, lipFrames: 0 };
  const B = byName;
  const eased = (o, k, v, dt, rate = 10) => (o[k] += (v - o[k]) * Math.min(1, dt * rate));
  function update(dt, { speed = 0 } = {}) {
    st.t += dt;
    const t = st.t;
    const walking = speed > 0.05;
    const step0 = Math.floor(st.phase * 2);
    st.phase += dt * (walking ? (2.1 + speed * 0.35) * LOPE : 0);
    const p = st.phase * Math.PI * 2;
    if (onLand && walking && Math.floor(st.phase * 2) !== step0 && st.hopT <= 0) onLand('step');
    const hopping = st.hopT > 0;
    for (const k of ['hopT', 'cheerT', 'sadT', 'waveT', 'talkT', 'surpriseT', 'thinkT', 'happyT']) st[k] = Math.max(0, st[k] - dt);
    const cheer = st.cheerT > 0, sad = st.sadT > 0 && !cheer, wave = st.waveT > 0, think = st.thinkT > 0 && !cheer && !sad, surprise = st.surpriseT > 0 && !cheer;
    // Body: bounce, squash and stretch.
    let y = 0, sy = 1, spin = 0, roll = 0;
    if (walking) {
      const b = Math.abs(Math.sin(p));
      y = b * BOB;
      sy = 1 + (b - 0.45) * 0.1;
      roll = Math.sin(p) * 0.07;
    } else sy = 1 + Math.sin(t * 2.3) * 0.018;
    if (hopping && st.hopT <= 0 && onLand) onLand('hop');
    if (st.hopT > 0) {
      const k = 1 - st.hopT / HOP;
      if (k < 0.18) sy = 1 - (k / 0.18) * 0.2;
      else {
        const q = (k - 0.18) / 0.82;
        y = Math.sin(Math.PI * q) * HOP_UP;
        sy = q < 0.85 ? 1.12 - q * 0.1 : 0.86;
      }
    }
    if (cheer) {
      const b = Math.abs(Math.sin(t * 8.5));
      y = b * 0.26;
      sy = 0.9 + b * 0.22;
      spin = Math.sin(t * 5) * 0.45;
    }
    if (surprise) {
      const k = st.surpriseT / 0.9;
      y = Math.max(y, Math.sin(Math.min(1, (1 - k) * 4) * Math.PI) * 0.12);
      sy *= 1 + 0.08 * k;
    }
    if (sad) {
      sy *= 0.94;
      roll = Math.sin(t * 1.6) * 0.06;
    }
    rig.position.y = y;
    eased(rig.rotation, 'y', spin, dt, cheer ? 20 : 6);
    squash.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    eased(B.hips.rotation, 'z', roll, dt, 12);
    // Breathing.
    const breathe = Math.sin(t * 2.3) * 0.012;
    B.chest.scale.set(1 + breathe, 1 + breathe * 0.6, 1 + breathe);
    eased(B.chest.rotation, 'x', sad ? 0.22 : think ? 0.05 : walking ? 0.08 : 0, dt, 6);
    // Legs.
    for (const [name, ph] of [['legL', 0], ['legR', Math.PI]]) {
      const leg = B[name];
      eased(leg.rotation, 'x', walking ? Math.sin(p + ph) * 0.75 : cheer ? Math.sin(t * 8.5 + ph) * 0.3 : 0, dt, 18);
    }
    // Arms.
    for (const [name, s] of [['armL', -1], ['armR', 1]]) {
      const a = B[name];
      let z = s * 0.12, x = walking ? -Math.sin(p + (s < 0 ? 0 : Math.PI)) * 0.55 : Math.sin(t * 1.6 + s) * 0.05;
      if (cheer) {
        z = s * (1.85 + Math.sin(t * 14 + s) * 0.3);
        x = -0.55;
      } else if (wave && s > 0) {
        z = 1.75 + Math.sin(t * 13) * 0.4;
        x = -0.6;
      } else if (think && s > 0) {
        z = 0.5;
        x = -1.5;
      } else if (surprise) {
        z = s * 1.1;
        x = -0.4;
      } else if (sad) {
        z = s * 0.02;
        x = 0.25;
      }
      eased(a.rotation, 'z', z, dt, 12);
      eased(a.rotation, 'x', x, dt, 12);
    }
    // Head: look about, droop when sad, tilt when thinking.
    if ((st.lookT -= dt) < 0) {
      st.look = walking ? 0 : (rnd() - 0.5) * 0.9;
      st.lookT = 1.5 + rnd() * 3;
    }
    eased(B.head.rotation, 'y', cheer ? 0 : st.look * (think ? 0.4 : 1), dt, 3);
    // A recorded voice (voice/player.js) drives lipSync: the head nods a little with its loudness
    // (beaked faces like Hoot's have no mouth to move), and the mouth opens below.
    st.voiceT = Math.max(0, st.voiceT - dt);
    const voiced = st.voiceT > 0;
    const nod = voiced ? -st.voice * 0.09 : 0;
    eased(B.head.rotation, 'x', (sad ? 0.32 : think ? -0.16 : surprise ? -0.12 : walking ? -Math.abs(Math.sin(p)) * 0.05 : Math.sin(t * 0.8) * 0.04) + nod, dt, voiced ? 14 : 6);
    eased(B.head.rotation, 'z', think ? 0.2 : cheer ? Math.sin(t * 8.5) * 0.12 : 0, dt, 6);
    face.look(st.look * 0.8, 0);
    // Ears: a flick now and then; droop when sad; folded under a space helmet.
    if ((st.flickT -= dt) < 0) {
      st.flick = 0.25;
      st.flickSide = rnd() < 0.5 ? -1 : 1;
      st.flickT = 2 + rnd() * 4;
    }
    st.flick = Math.max(0, st.flick - dt);
    for (const [name, s] of [['earL', -1], ['earR', 1]]) {
      const e = B[name];
      const flick = st.flick > 0 && st.flickSide === s ? Math.sin((st.flick / 0.25) * Math.PI) * 0.45 : 0;
      eased(e.rotation, 'z', sad ? -s * 0.85 : -s * (flick + Math.sin(t * 3 + s) * 0.04) + (surprise ? s * 0.15 : 0), dt, sad ? 4 : 20);
      eased(e.rotation, 'x', helmet ? -1.1 : sad ? -0.3 : walking ? -0.12 : surprise ? -0.2 : 0, dt, 8);
    }
    // Tail.
    const wagRate = cheer || st.happyT > 0 ? 14 : walking ? 9 : 3;
    eased(B.tail.rotation, 'y', sad ? 0 : Math.sin(t * wagRate) * (cheer ? 0.5 : 0.32), dt, 16);
    eased(B.tail.rotation, 'x', sad ? 0.45 : 0, dt, 5);
    eased(B.tail2.rotation, 'y', sad ? 0 : Math.sin(t * wagRate - 0.9) * 0.4, dt, 16);
    // Wings.
    const flap = cheer ? Math.sin(t * 22) * 0.6 : Math.sin(t * (recipe.wings === 'fairy' ? 9 : 2.4)) * (recipe.wings === 'fairy' ? 0.35 : 0.12);
    B.wingL.rotation.y = flap - (sad ? 0.3 : 0);
    B.wingR.rotation.y = -flap + (sad ? 0.3 : 0);
    if (bulb) bulb.material.emissiveIntensity = 0.6 + Math.sin(t * 4) * 0.4;
    if (hatObj?.userData.spin) hatObj.userData.spin.rotation.y += dt * (walking || cheer ? 18 : 5);
    if (hatObj?.userData.blink) hatObj.userData.blink.visible = Math.sin(t * 5) > -0.3;
    if (suitHelmet) suitHelmet.userData.blink.visible = Math.sin(t * 3 + seed) > -0.5;
    // Face.
    const expr = cheer ? 'cheer' : sad ? 'sad' : surprise ? 'surprised' : think ? 'thinking' : st.happyT > 0 || st.hopT > 0 || wave ? 'happy' : 'neutral';
    face.setExpression(expr);
    if (voiced) {
      face.talk(true, st.voice);
      if (st.voice > 0.15) st.lipFrames++;
    } else face.talk(st.talkT > 0);
    face.update(dt, t);
  }
  update(0);
  return {
    group,
    update,
    species,
    face,
    bones: byName,
    hop: () => (st.hopT = HOP),
    cheer: (s = 1.8) => ((st.sadT = 0), (st.cheerT = s)),
    sad: (s = 1.4) => ((st.cheerT = 0), (st.happyT = 0), (st.sadT = s)),
    wave: (s = 1.6) => (st.waveT = s),
    talk: (s = 2) => (st.talkT = s),
    /** Lip-sync lite: a recorded voice's loudness now (0–1); it lapses on its own when the calls stop. */
    lipSync(level, hold = 0.2) {
      st.voice = Math.max(0, Math.min(1, Number(level) || 0));
      st.voiceT = hold;
      st.talkT = 0;
    },
    /** The space suit it wears ('moon' | 'mars'), or null. */
    suit,
    surprise: (s = 0.9) => (st.surpriseT = s),
    think: (s = 2) => (st.thinkT = s),
    happy: (s = 1.5) => (st.happyT = s),
    /** A reaction to an answer: a happy hop when right, a little droop when not. */
    react(right) {
      if (right) {
        st.happyT = 1.6;
        st.hopT = HOP;
      } else {
        st.sadT = 1.3;
      }
    },
    state: st
  };
}
const BLOB_GEO = new THREE.CircleGeometry(0.42, 24);
const BLOB_MAT = new THREE.MeshBasicMaterial({ color: '#1f3a3a', transparent: true, opacity: 0.2, depthWrite: false });
function mulberry(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** History guides: a costume hat and a bit of clothing for each look. */
const COSTUME_HATS = {
  guide: 'beanie', 'stone-age': 'bone', egypt: 'nemes', mesopotamia: 'cap', greece: 'wreath', rome: 'helmet', china: 'topknot', 'silk-road': 'turban',
  viking: 'roundhelm', knight: 'knight', 'castle-cook': 'chef', maya: 'feathers', mali: 'kufi', printer: 'flatcap', explorer: 'tricorn', inventor: 'tophat',
  factory: 'flatcap', scientist: 'goggles', pilot: 'pilot', astronaut: 'space', nurse: 'nurse', farmer: 'straw',
  sailor: 'cap', diver: 'goggles', wayfinder: 'flower', keeper: 'flatcap', ranger: 'straw', botanist: 'flower',
  nile: 'kufi', scribe: 'wig', caravan: 'headscarf', archaeologist: 'pith',
  stargazer: 'starcap', flightsuit: 'cap', mission: 'headset',
  roverteam: 'cap'
};
const COSTUME_COLORS = {
  guide: '#2f5d6b', 'stone-age': '#c9a77a', egypt: '#f2ead8', mesopotamia: '#b0643c', greece: '#f4f1ea', rome: '#d0453e', china: '#2f9d8b', 'silk-road': '#e07b3b',
  viking: '#6f9a5f', knight: '#9aa3ad', 'castle-cook': '#ffffff', maya: '#2fb5a3', mali: '#f0b43a', printer: '#e8dcc4', explorer: '#3f6fb3', inventor: '#7a5a46',
  factory: '#6b7c8f', scientist: '#ffffff', pilot: '#8a6a4e', astronaut: '#f4f4f4', nurse: '#f4f6f8', farmer: '#5f9f4f',
  sailor: '#2f5fa8', diver: '#f2a33a', wayfinder: '#e0643a', keeper: '#c94a3c', ranger: '#5f7f3a', botanist: '#8fbf6a',
  nile: '#f4ecd8', scribe: '#ffffff', caravan: '#2f4f9a', archaeologist: '#c9b48a',
  stargazer: '#3b4f9a', flightsuit: '#3f6fd6', mission: '#f4f6fa',
  roverteam: '#d9744a'
};
/**
 * The Sky Castle's townsfolk in medieval outfits (`costume`: a whole outfit, painted on, with its hat):
 * a baker in an apron and a puffy cap, a minstrel with a feathered cap, a squire in a tabard and a soft
 * padded helmet, a lady in a gown and a tall hennin with a veil, a jester in motley with a belled cap, a
 * copyist in a monk-like hood, a goodwife in a linen coif and apron, a wayfarer in a hood and capelet.
 */
export const GARB = {
  baker: { tunic: '#e8b45a', belt: '#8a5a3a', apron: '#ffffff', hat: 'bakercap' },
  minstrel: { tunic: '#d64a5a', belt: '#5a3a2a', collar: '#ffd23f', hat: 'minstrel' },
  squire: { tunic: '#c9d1dc', belt: '#6b4a33', tabard: '#3a6fd0', hat: 'softhelm' },
  lady: { tunic: '#ff9ec7', belt: '#f2c14e', collar: '#ffffff', long: true, hat: 'hennin' },
  jester: { tunic: '#7b5fd0', motley: '#ffd23f', belt: '#e0574f', collar: '#ffffff', hat: 'jester' },
  copyist: { tunic: '#8a6a4a', belt: '#e8d8a8', long: true, hat: 'scribehood' },
  goodwife: { tunic: '#5f9f6a', belt: '#8a5a3a', apron: '#fff6e6', hat: 'coif' },
  wayfarer: { tunic: '#3f7f8a', belt: '#6b4a33', hat: 'hood' },
  // The Sky Castle's history guides (schema.js LOOKS; the baker and the copyist above guide too): a stonemason in
  // a leather apron and a linen coif, a Japanese plasterer in an indigo coat and a headband, a Joseon scholar in a
  // pale robe and a black horsehair gat, an engineer in a turban, a stone carver in saffron, a monk in grey, a
  // stone builder with a bead collar, a nun (Hildegard, an abbess) in a dark habit and a wimple, a scholar of Fez in a headscarf,
  // a Renaissance painter in a soft cap, and a balloon-maker of 1783 in a tricorn.
  mason: { tunic: '#9a8f7c', belt: '#5a3f2a', apron: '#a0683f', hat: 'coif' },
  artisan: { tunic: '#2f4f7a', belt: '#f4efe6', collar: '#ffffff', hat: 'hachimaki' },
  seonbi: { tunic: '#e3efe9', belt: '#3a5fa0', collar: '#ffffff', long: true, hat: 'gat' },
  engineer: { tunic: '#2f7f8a', belt: '#d7b45a', collar: '#f2c14e', long: true, hat: 'turban' },
  carver: { tunic: '#d98a3a', belt: '#a83a3a' },
  monk: { tunic: '#8c8c88', belt: '#9a5a3a', long: true },
  stonebuilder: { tunic: '#c9853a', belt: '#7a3a2a', collar: '#e0574f' },
  nun: { tunic: '#3d3a48', belt: '#8a7a5a', collar: '#ffffff', long: true, hat: 'wimple' },
  scholar: { tunic: '#3f6f9a', belt: '#d7b45a', collar: '#ffffff', long: true, hat: 'headscarf' },
  renaissance: { tunic: '#8a3a4a', belt: '#5a3a2a', collar: '#d7b45a', hat: 'beret' },
  balloonist: { tunic: '#3a5fb0', belt: '#f2c14e', collar: '#ffffff', hat: 'tricorn' }
};
/** The teachers: owl for math, tortoise for history, raccoon for physics. */
export const TEACHERS = {
  math: { species: 'owl', emoji: '🦉', get name() { return t('teacher.math'); } },
  history: { species: 'tortoise', emoji: '🐢', get name() { return t('teacher.history'); } },
  physics: { species: 'raccoon', emoji: '🦝', get name() { return t('teacher.physics'); } }
};
/** The sea islands' teachers: Captain Pip the penguin (Sea Math), Grandma Inka the octopus (Sea Explorers), Dr. Splash the seal (Ocean Lab). */
export const SEA_TEACHERS = {
  math: { species: 'penguin', emoji: '🐧', get name() { return t('sea.teacher.math'); } },
  history: { species: 'octopus', emoji: '🐙', get name() { return t('sea.teacher.history'); } },
  physics: { species: 'seal', emoji: '🦭', get name() { return t('sea.teacher.physics'); } }
};
/** The Great Tree's teachers: Nutmeg the squirrel (Forest Math), Grandpa Bramble the bear (Forest History), Dr. Ribbit the frog (the Nature Lab). */
export const FOREST_TEACHERS = {
  math: { species: 'squirrel', emoji: '🐿️', get name() { return t('forest.teacher.math'); } },
  history: { species: 'bear', emoji: '🐻', get name() { return t('forest.teacher.history'); } },
  physics: { species: 'frog', emoji: '🐸', get name() { return t('forest.teacher.physics'); } }
};
/** The Desert of the Pyramids' teachers: Miss Lotus the hippo (the Pyramid School), Uncle Reed the ibis (the Temple School), Dr. Sandy the sand cat (the Sun Observatory). */
export const DESERT_TEACHERS = {
  math: { species: 'hippo', emoji: '🦛', get name() { return t('desert.teacher.math'); } },
  history: { species: 'ibis', emoji: '🪶', get name() { return t('desert.teacher.history'); } },
  physics: { species: 'sandcat', emoji: '🐱', get name() { return t('desert.teacher.physics'); } }
};
/** The Moon's teachers: Miss Mochi the moon rabbit (the Dome School), Captain Ginger the red panda (the Moon Museum), Dr. Comet the koala (the Star Observatory). */
export const MOON_TEACHERS = {
  math: { species: 'moonrabbit', emoji: '🐰', get name() { return t('moon.teacher.math'); } },
  history: { species: 'redpanda', emoji: '🪐', get name() { return t('moon.teacher.history'); } },
  physics: { species: 'koala', emoji: '🐨', get name() { return t('moon.teacher.physics'); } }
};
/**
 * Mars's teachers: Miss Ruby the otter (the Red Dome School), Professor Woolly the alpaca (the Mars Museum),
 * Dr. Digby the star-nosed mole (the Weather Lab). In their space suits each keeps a touch of their own under
 * the glass: Ruby's red-pebble clip and pencil, Woolly's glasses and red-planet pin, Digby's glasses and headlamp.
 */
export const MARS_TEACHERS = {
  math: { species: 'otter', emoji: '🦦', get name() { return t('mars.teacher.math'); } },
  history: { species: 'alpaca', emoji: '🦙', get name() { return t('mars.teacher.history'); } },
  physics: { species: 'mole', emoji: '🔦', get name() { return t('mars.teacher.physics'); } }
};
/**
 * The Sky Castle's teachers, each dressed for the castle: Miss Biscuit the corgi, a clockmaker in a leather apron
 * with a loupe on her headband (the Clock Tower School); Professor Hartley the stag, a librarian-scholar in a long
 * robe, round glasses and a velvet scholar's cap (the Library Hall); Dr. Sprocket the beaver, an inventor in a
 * leather apron with brass goggles on her cap (the Inventor's Workshop).
 */
export const CASTLE_TEACHERS = {
  math: { species: 'corgi', emoji: '🐶', get name() { return t('castle.teacher.math'); } },
  history: { species: 'stag', emoji: '🦌', get name() { return t('castle.teacher.history'); } },
  physics: { species: 'beaver', emoji: '🦫', get name() { return t('castle.teacher.physics'); } }
};
/** A realm's teachers ('land', 'forest', 'sea', 'desert', 'moon', 'mars' or 'castle'), by school slot (content/subjects.js SLOTS). */
export const teachersIn = (realm = 'land') => ({ sea: SEA_TEACHERS, forest: FOREST_TEACHERS, desert: DESERT_TEACHERS, moon: MOON_TEACHERS, mars: MARS_TEACHERS, castle: CASTLE_TEACHERS })[realm] ?? TEACHERS;
/** Who teaches a subject in a realm: the teacher of the school slot it is taught in (or of the slot itself, given a slot key). */
export const teacherOf = (realm, subject) => teachersIn(realm)[slotOf(realm, subject) ?? subject] ?? null;
/** A guide's species, from their look (the same look, the same critter). */
export function guideSpecies(look) {
  const list = ['bear', 'fox', 'mouse', 'hedgehog', 'frog', 'duck', 'bunny', 'owl'];
  let h = 0;
  for (const ch of String(look)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
