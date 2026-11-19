/**
 * A Kithvale creature, alive: sculpted once per species from its recipe
 * (AI Arcademia's SDF sculptor, auto-skinned to the recipe's bones), dressed
 * in a painted skin (the body colour applied in the shader over its painted
 * markings, soft wrapped light, a warm rim on fur), fur shells on the woolly
 * and furry ones, a glossy pebble shell on the Pebbleroll, a soft dark
 * outline, a face that blinks and changes expression — and moved in code,
 * each body its own way:
 *
 *   hop      the Tuftlet bounds in arcs, squashing as it lands
 *   waddle   the Pebbleroll toddles — and tucks into a ball and rolls
 *   fly      the Lumoth hovers and flutters four painted wings, its belly a lantern
 *   trot     the Mistfawn steps in diagonal pairs, grazes, flicks its ears
 *   bounce   the Puffwool bobs along, and floats when it's happy
 *   scurry   the Emberkit wriggles low, its tail a flame
 *
 * `makeCreature(species, { res, fur })` → { group, update(dt, st), emote(kind), … }.
 * `st`: { speed, state, look (world point or null), breath (0…1 in the trust moment) }.
 */
import * as THREE from 'three';
import { compile, sculpt, trace } from '../../arcademia/world/creatures/sculpt.js';
import { outlineMaterial, inkFor } from '../../arcademia/world/creatures/materials.js';
import { buildFace } from './face.js';
import { RECIPES } from './recipes.js';
import { painterly } from '../paint.js';
import { paperTexture } from '../painted.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
/** How big each kind is drawn (the recipes are sculpted near 1:1). */
export const SCALE = { tuftlet: 1.15, pebbleroll: 1.25, lumoth: 1.3, mistfawn: 1.15, puffwool: 1.15, emberkit: 1.55 };
/** Finer sculpting for the slender ones. */
const RES_K = { mistfawn: 1.5, emberkit: 1.2, lumoth: 1.25 };

const models = new Map();
const geos = new Map();
export function modelFor(species) {
  if (!models.has(species)) {
    const recipe = RECIPES[species]();
    let model = compile(recipe);
    // Bare skin round the eyes and mouth (so fur never grows over them): paint them a body-like colour.
    const f = recipe.face;
    const ring = new THREE.Color(recipe.color).lerp(new THREE.Color('#fff8ee'), 0.18).getStyle();
    const masks = [];
    for (const sx of [-1, 1]) {
      const hit = trace(model.sdf, [sx * f.eyeX, f.eyeY, 2], [0, 0, -1], 4);
      if (hit) masks.push({ s: 'sph', c: hit, r: f.eyeR * 1.55, col: ring, soft: 0.01 });
    }
    if (masks.length) {
      recipe.paint = [...masks, ...(recipe.paint ?? [])];
      model = compile(recipe);
    }
    models.set(species, model);
  }
  return models.get(species);
}
export function creatureGeometry(species, res = 64) {
  const key = `${species}|${res}`;
  if (!geos.has(key)) geos.set(key, sculpt(modelFor(species), { res: Math.round(res * (RES_K[species] ?? 1)) }));
  return geos.get(key);
}

/* ------------------------------------------------------------------ skins */

const TINT_VERT = ['#include <common>', '#include <common>\nattribute vec2 tint;\nvarying vec2 vTint;\nvarying vec3 vRest;'];
const TINT_BEGIN = ['#include <begin_vertex>', '#include <begin_vertex>\nvTint = tint;\nvRest = position;'];
const TINT_FRAG = `#ifdef USE_COLOR
  vec3 cBody = mix(vColor.rgb, uBody * vTint.y, vTint.x);
  diffuseColor.rgb *= cBody;
#endif`;

const skins = new Map();
/** The body: painted markings (vertex colour) and the body colour where `tint` says, lit softly. */
export function skinMaterial(body, { fur = 0, gloss = 0.2 } = {}) {
  const key = `${body}|${fur}|${gloss}`;
  if (skins.has(key)) return skins.get(key);
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 - gloss * 0.62, metalness: 0 });
  const u = { uBody: { value: new THREE.Color(body) }, uSheen: { value: gloss } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace(...TINT_VERT).replace(...TINT_BEGIN);
    sh.fragmentShader = 'uniform vec3 uBody;\nuniform float uSheen;\nvarying vec2 vTint;\nvarying vec3 vRest;\n' + sh.fragmentShader.replace('#include <color_fragment>', TINT_FRAG);
  };
  m.customProgramCacheKey = () => 'kith-skin';
  painterly(m, { wrap: 0.7, rim: 0.32 + fur * 0.5, shade: 0.22, trans: fur * 0.12 });
  skins.set(key, m);
  return m;
}

const shells = new Map();
/**
 * One layer of fur: the body again, pushed out along its normals by `k` of
 * the fur's length, with strands cut from a fine 3D hash of the rest
 * position — fewer strands the higher the layer, lighter at the tips.
 */
export function shellMaterial(body, k, { len = 0.022, density = 110 } = {}) {
  const key = `${body}|${k.toFixed(3)}|${len}|${density}`;
  if (shells.has(key)) return shells.get(key);
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const u = { uBody: { value: new THREE.Color(body) }, uK: { value: k }, uLen: { value: len }, uDensity: { value: density } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'uniform float uK;\nuniform float uLen;\n' + sh.vertexShader.replace(...TINT_VERT).replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = tint;\nvRest = position;\ntransformed += normal * uLen * uK;\ntransformed.y -= uLen * uK * uK * 0.4;');
    sh.fragmentShader = 'uniform vec3 uBody;\nuniform float uK;\nuniform float uDensity;\nvarying vec2 vTint;\nvarying vec3 vRest;\nfloat h31(vec3 p) { p = fract(p * vec3(0.1031, 0.103, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `${TINT_FRAG}
        {
          vec3 cell = floor(vRest * uDensity);
          float n = h31(cell);
          vec3 f = fract(vRest * uDensity) - 0.5;
          float core = 1.0 - smoothstep(0.25, 0.5, length(f));
          if (n * (0.55 + core * 0.45) < uK * 0.82 + 0.06) discard;
          // Fur only where the body colour shows (not on painted noses, hooves, eyes' rims).
          if (vTint.x < 0.5) discard;
          diffuseColor.rgb *= 0.78 + uK * 0.4;
        }`);
  };
  m.customProgramCacheKey = () => 'kith-shell';
  painterly(m, { wrap: 0.8, rim: 0.7, shade: 0.22, trans: 0.2 });
  shells.set(key, m);
  return m;
}

/* ------------------------------------------------------------------ extras */

/** A moth's wing, painted: cream with a soft brown edge and an eye-spot. */
function wingTexture(fore) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(20, 64, 4, 40, 64, 110);
  grad.addColorStop(0, '#fff6e0');
  grad.addColorStop(0.6, '#f2dcb0');
  grad.addColorStop(1, '#b88a5a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(120,80,50,0.55)';
  g.beginPath();
  g.arc(fore ? 78 : 70, 60, 14, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fff2c8';
  g.beginPath();
  g.arc(fore ? 78 : 70, 60, 7, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(140,100,60,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(4, 64);
    g.lineTo(128, 10 + i * 27);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let wingMats = null;
function addMothWings(byName) {
  wingMats ??= [true, false].map((fore) => painterly(new THREE.MeshStandardMaterial({ map: wingTexture(fore), side: THREE.DoubleSide, roughness: 0.8, transparent: true, opacity: 0.95, depthWrite: true }), { wrap: 0.8, rim: 0.4, trans: 0.9 }));
  const out = [];
  for (const s of [-1, 1]) {
    const bone = byName[s < 0 ? 'wingL' : 'wingR'];
    for (const fore of [true, false]) {
      const sh = new THREE.Shape();
      if (fore) {
        sh.moveTo(0, 0);
        sh.bezierCurveTo(0.08, 0.16, 0.28, 0.2, 0.36, 0.12);
        sh.bezierCurveTo(0.38, 0.04, 0.3, -0.04, 0.12, -0.04);
        sh.lineTo(0, 0);
      } else {
        sh.moveTo(0, 0);
        sh.bezierCurveTo(0.06, -0.04, 0.24, -0.06, 0.26, -0.16);
        sh.bezierCurveTo(0.22, -0.26, 0.08, -0.2, 0, -0.04);
      }
      const g = new THREE.ShapeGeometry(sh, 10);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.38, p.getY(i) / 0.4 + 0.5);
      // Lay the wing flat (in x–z), out to the side.
      g.rotateX(Math.PI / 2);
      g.rotateY(fore ? -0.15 : 0.35);
      if (s < 0) g.scale(-1, 1, 1);
      const m = new THREE.Mesh(g, wingMats[fore ? 0 : 1]);
      m.position.set(0, 0, fore ? 0.02 : -0.04);
      m.castShadow = true;
      const pivot = new THREE.Group();
      pivot.add(m);
      bone.add(pivot);
      out.push({ pivot, s, fore });
    }
  }
  return out;
}

let lanternMat = null;
/** The Lumoth's belly: a little paper lantern, glowing. */
function addBellyLantern(byName, restAbdomen) {
  lanternMat ??= new THREE.MeshStandardMaterial({ map: paperTexture(9, 6), color: 0xfff0d0, emissive: new THREE.Color('#ffb860'), emissiveIntensity: 1.6, roughness: 0.8 });
  const g = new THREE.SphereGeometry(1, 16, 12);
  const m = new THREE.Mesh(g, lanternMat);
  m.scale.set(0.105, 0.105, 0.15);
  m.rotation.x = Math.PI / 2;
  const bone = byName.abdomen;
  m.position.set(0, -0.01, -0.04);
  bone.add(m);
  void restAbdomen;
  return m;
}

let flameMat = null;
function addFlame(byName) {
  flameMat ??= new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.75, 0.16), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const g = new THREE.ConeGeometry(0.05, 0.18, 8, 1, true);
  g.translate(0, 0.09, 0);
  const m = new THREE.Mesh(g, flameMat);
  const inner = new THREE.Mesh(g, flameMat);
  inner.scale.set(0.5, 0.7, 0.5);
  m.add(inner);
  m.position.set(0, 0.02, -0.12);
  m.rotation.x = -0.5;
  byName.tail3.add(m);
  return m;
}

/* ------------------------------------------------------------------ emotes */

const emoteTex = new Map();
function emoteTexture(kind) {
  if (emoteTex.has(kind)) return emoteTex.get(kind);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.translate(64, 64);
  const bubble = (fill = '#fffaf0') => {
    g.fillStyle = fill;
    g.strokeStyle = 'rgba(60,40,40,0.8)';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(0, -4, 44, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  };
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (kind === 'love') {
    g.fillStyle = '#ff5a7a';
    g.strokeStyle = 'rgba(80,20,30,0.8)';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(0, 36);
    g.bezierCurveTo(-60, -4, -30, -56, 0, -24);
    g.bezierCurveTo(30, -56, 60, -4, 0, 36);
    g.fill();
    g.stroke();
  } else {
    bubble();
    g.fillStyle = kind === 'alarm' ? '#d8402e' : kind === 'dislike' ? '#7a6a8a' : '#4a3a2a';
    g.font = `800 ${kind === 'sleep' ? 50 : 64}px Georgia, serif`;
    g.fillText({ curious: '?', alarm: '!', dislike: '…', like: '♪', sleep: 'z z', ready: '♥' }[kind] ?? '?', 0, -2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  emoteTex.set(kind, t);
  return t;
}

/* ------------------------------------------------------------------ the creature */

const ease = (o, k, v, dt, rate = 10) => (o[k] += (v - o[k]) * Math.min(1, dt * rate));

export function makeCreature(species, { res = 64, fur = 6, outline = true, color = null, seed = 1 } = {}) {
  const model = modelFor(species);
  const recipe = model.recipe;
  const body = color ?? recipe.color;
  const geometry = creatureGeometry(species, res);
  const scale = SCALE[species] ?? 1;
  const group = new THREE.Group();
  const rig = new THREE.Group();
  rig.scale.setScalar(scale);
  group.add(rig);
  const lift = new THREE.Group();
  rig.add(lift);
  const squash = new THREE.Group();
  lift.add(squash);
  // Bones, per creature.
  const byName = {};
  const list = recipe.bones.map(([name, parent, x, y, z]) => {
    const b = new THREE.Bone();
    b.name = name;
    b.userData.rest = V(x, y, z);
    byName[name] = b;
    return { b, parent };
  });
  for (const { b, parent } of list) {
    if (parent) {
      byName[parent].add(b);
      b.position.copy(b.userData.rest).sub(byName[parent].userData.rest);
    } else b.position.copy(b.userData.rest);
  }
  const bones = list.map((x) => x.b);
  const skin = new THREE.SkinnedMesh(geometry, skinMaterial(body, { fur: recipe.fur ?? 0, gloss: recipe.gloss ?? 0.2 }));
  skin.castShadow = true;
  skin.receiveShadow = true;
  skin.add(bones[0]);
  skin.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skin.bind(skeleton);
  skin.frustumCulled = false;
  squash.add(skin);
  let hull = null;
  if (outline) {
    hull = new THREE.SkinnedMesh(geometry, outlineMaterial(inkFor(body), 0.007));
    hull.bind(skeleton, skin.bindMatrix);
    hull.frustumCulled = false;
    hull.raycast = () => {};
    squash.add(hull);
  }
  // Fur shells (the furry ones), added and removed with quality.
  const furShells = [];
  const furry = (recipe.fur ?? 0) > 0.5;
  const setFur = (n) => {
    for (const s of furShells) s.removeFromParent();
    furShells.length = 0;
    if (!furry || n <= 0) return;
    const len = recipe.wool ? 0.035 : species === 'lumoth' ? 0.02 : species === 'mistfawn' ? 0.009 : 0.016;
    const density = recipe.wool ? 70 : species === 'mistfawn' ? 160 : 120;
    for (let i = 1; i <= n; i++) {
      const s = new THREE.SkinnedMesh(geometry, shellMaterial(body, i / n, { len, density }));
      s.bind(skeleton, skin.bindMatrix);
      s.frustumCulled = false;
      s.castShadow = false;
      s.receiveShadow = true;
      s.raycast = () => {};
      squash.add(s);
      furShells.push(s);
    }
  };
  setFur(fur);
  // The face, on the head bone.
  const headBone = byName.head;
  const face = buildFace({ sdf: model.sdf, f: recipe.face, headBone, headPos: headBone.userData.rest, body, lowDetail: false });
  const wings = recipe.fly ? addMothWings(byName) : null;
  const lantern = species === 'lumoth' ? addBellyLantern(byName) : null;
  const flame = species === 'emberkit' ? addFlame(byName) : null;
  // A soft round shadow under it (helps it sit on the grass, and shows where a flyer is).
  const blob = new THREE.Mesh(BLOB_GEO, BLOB_MAT);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.04;
  blob.scale.setScalar(scale * (species === 'mistfawn' ? 1.2 : species === 'puffwool' ? 1.3 : 0.9));
  blob.raycast = () => {};
  group.add(blob);
  // The emote above its head.
  const emoteSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoteTexture('curious'), transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
  emoteSprite.visible = false;
  emoteSprite.renderOrder = 30;
  group.add(emoteSprite);
  const top = trace(model.sdf, [0, 3, 0], [0, -1, 0], 4)?.[1] ?? 0.6;
  const height = Math.max(top, headBone.userData.rest.y + 0.15) * scale;
  // Rest poses to return to.
  const rest = {};
  for (const [n, b] of Object.entries(byName)) rest[n] = { q: b.quaternion.clone(), p: b.position.clone(), s: b.scale.clone() };
  const B = byName;
  const gait = { tuftlet: 'hop', pebbleroll: 'waddle', lumoth: 'fly', mistfawn: 'trot', puffwool: 'bounce', emberkit: 'scurry' }[species];
  const r = mulberry(seed * 7919 + species.length);
  const st = { t: r() * 10, phase: r(), lookYaw: 0, lookPitch: 0, flickT: 1 + r() * 3, flick: 0, side: 1, emoteT: 0, roll: 0, tuck: 0, graze: 0, grazeT: 4 + r() * 5, hover: recipe.fly ? 1.2 : 0, spin: 0, hopT: 0, shake: 0, cheer: 0, bob: 0 };
  const tmp = V();

  function update(dt, s = {}) {
    st.t += dt;
    const t = st.t;
    const speed = s.speed ?? 0;
    const state = s.state ?? 'idle';
    const moving = speed > 0.08;
    for (const k of ['emoteT', 'hopT', 'shake', 'cheer']) st[k] = Math.max(0, st[k] - dt);
    // Gait phase: faster with speed.
    const rate = { hop: 1.6, waddle: 2.6, fly: 0, trot: 1.25, bounce: 1.9, scurry: 3.4 }[gait];
    st.phase += dt * (moving ? 0.8 + speed * rate : 0);
    const p = st.phase * Math.PI * 2;
    const fleeing = state === 'flee';
    const tucked = gait === 'waddle' && (state === 'flee' || state === 'hide');
    st.tuck += ((tucked ? 1 : 0) - st.tuck) * Math.min(1, dt * 8);
    // Expression.
    let expr = 'neutral';
    if (state === 'flee' || state === 'wary') expr = 'surprised';
    else if (state === 'curious') expr = Math.sin(t * 0.7) > 0.75 ? 'thinking' : 'neutral';
    else if (state === 'eat') expr = 'chew';
    else if (state === 'ready' || state === 'play' || st.cheer > 0) expr = st.cheer > 0 ? 'cheer' : 'happy';
    else if (state === 'trust') expr = 'calm';
    else if (state === 'hide') expr = gait === 'waddle' ? 'sleep' : 'sad';
    else if (state === 'sleep') expr = 'sleep';
    else if (st.shake > 0) expr = 'sad';
    face.setExpression(expr);
    if (state === 'trust') face.calm(s.breath ?? 0);
    face.update(dt, t);
    // Where it looks.
    let wantYaw = 0;
    let wantPitch = 0;
    if (s.look && ['curious', 'wary', 'ready', 'trust', 'idle', 'friend'].includes(state)) {
      group.updateMatrixWorld();
      tmp.copy(s.look);
      group.worldToLocal(tmp);
      const h = headBone.userData.rest;
      wantYaw = THREE.MathUtils.clamp(Math.atan2(tmp.x, tmp.z - h.z * scale), -1.1, 1.1);
      wantPitch = THREE.MathUtils.clamp(-Math.atan2(tmp.y - h.y * scale, Math.hypot(tmp.x, tmp.z)), -0.5, 0.5);
    }
    if (st.shake > 0) wantYaw = Math.sin(t * 22) * 0.45;
    ease(st, 'lookYaw', wantYaw, dt, 5);
    ease(st, 'lookPitch', wantPitch, dt, 5);
    const tilt = state === 'curious' ? Math.sin(t * 0.9) * 0.28 : 0;
    // Breathing.
    const breathe = Math.sin(t * (state === 'trust' ? Math.PI * 2 / (s.breathLen ?? 2.4) : 2.2)) * 0.016;
    const core = B.body ?? B.chest ?? B.hips;
    core.scale.set(1 + breathe, 1 + breathe * 0.7, 1 + breathe);
    // Grazing now and then (four-legged, idle).
    if ((gait === 'trot' || gait === 'bounce') && state === 'idle' && !moving) {
      if ((st.grazeT -= dt) < 0) {
        st.graze = st.graze > 0.5 ? 0 : 1;
        st.grazeT = st.graze ? 2.5 + r() * 3 : 4 + r() * 6;
      }
    } else st.graze = 0;
    const graze = (st.gz = (st.gz ?? 0) + ((st.graze ? 1 : 0) - (st.gz ?? 0)) * Math.min(1, dt * 3));
    // The head.
    const hb = B.head;
    hb.quaternion.copy(rest.head.q);
    const eat = state === 'eat' ? 1 : 0;
    st.eatK = (st.eatK ?? 0) + (eat - (st.eatK ?? 0)) * Math.min(1, dt * 5);
    if (B.neck) {
      B.neck.quaternion.copy(rest.neck.q);
      B.neck.rotateY(st.lookYaw * 0.5);
      B.neck.rotateX(st.lookPitch * 0.4 + graze * 1.05 + st.eatK * 0.9 + (moving ? Math.sin(p * 2) * 0.06 : 0));
      hb.rotateY(st.lookYaw * 0.5);
      hb.rotateX(st.lookPitch * 0.6 - graze * 0.2 + (st.eatK > 0.5 ? Math.sin(t * 12) * 0.06 : 0));
    } else {
      hb.rotateY(st.lookYaw);
      hb.rotateX(st.lookPitch + st.eatK * 0.45 + (st.eatK > 0.5 ? Math.sin(t * 13) * 0.07 : 0));
    }
    hb.rotateZ(tilt);
    if (tucked) hb.scale.setScalar(1 - st.tuck * 0.75);
    else hb.scale.copy(rest.head.s);
    if (B.head && gait === 'waddle') hb.position.copy(rest.head.p).add(V(0, -0.03 * st.tuck, -0.14 * st.tuck));
    // Ears: flicks, back when alarmed, down when sad.
    if ((st.flickT -= dt) < 0) {
      st.flick = 0.25;
      st.side = r() < 0.5 ? -1 : 1;
      st.flickT = 1.5 + r() * 4;
    }
    st.flick = Math.max(0, st.flick - dt);
    for (const [n, sd] of [['earL', -1], ['earR', 1]]) {
      const e = B[n];
      if (!e) continue;
      e.quaternion.copy(rest[n].q);
      const fl = st.flick > 0 && st.side === sd ? Math.sin((st.flick / 0.25) * Math.PI) * 0.5 : 0;
      const back = fleeing || state === 'hide' ? 0.9 : state === 'wary' ? -0.3 : state === 'trust' ? 0.35 : 0;
      e.rotateZ(-sd * (fl + Math.sin(t * 2.6 + sd) * 0.05));
      e.rotateX(-back);
    }
    // Body by gait.
    let y = 0;
    let sy = 1;
    let pitch = 0;
    let roll = 0;
    const legs = (names, amp, phaseOf) => {
      for (const n of names) {
        const L = B[n];
        if (!L) continue;
        L.quaternion.copy(rest[n].q);
        L.rotateX(moving ? Math.sin(p + phaseOf(n)) * amp : 0);
      }
    };
    switch (gait) {
      case 'hop': {
        // Bounds: an arc of air, a squash on landing.
        const hopping = moving || st.hopT > 0 || state === 'play' || state === 'ready';
        const ph = moving ? st.phase % 1 : ((t * 1.4) % 1);
        if (hopping) {
          const air = ph < 0.72 ? Math.sin((ph / 0.72) * Math.PI) : 0;
          y = air * (moving ? 0.1 + Math.min(0.2, speed * 0.04) : 0.06);
          sy = ph >= 0.72 ? 1 - Math.sin(((ph - 0.72) / 0.28) * Math.PI) * 0.16 : 1 + air * 0.06;
          pitch = moving ? (air - 0.4) * 0.25 : 0;
          for (const n of ['footL', 'footR']) {
            B[n].quaternion.copy(rest[n].q);
            B[n].rotateX(air * 0.7);
          }
        } else {
          for (const n of ['footL', 'footR']) B[n].quaternion.copy(rest[n].q);
          sy = 1 + Math.sin(t * 2.2) * 0.012;
        }
        for (const n of ['handL', 'handR']) {
          B[n].quaternion.copy(rest[n].q);
          B[n].rotateX(state === 'eat' ? -1.1 : moving ? -0.4 : 0);
        }
        // The grass crown sways (more when it hops).
        B.tuft.quaternion.copy(rest.tuft.q);
        B.tuft.rotateZ(Math.sin(t * 2.1) * 0.08 + (moving ? -Math.cos(p) * 0.12 : 0));
        B.tuft.rotateX(moving ? 0.15 : 0);
        break;
      }
      case 'waddle': {
        const k = 1 - st.tuck;
        legs(['legFL', 'legBR'], 0.6 * k, () => 0);
        legs(['legFR', 'legBL'], 0.6 * k, () => Math.PI);
        for (const n of ['legFL', 'legFR', 'legBL', 'legBR']) B[n].scale.setScalar(Math.max(0.01, k));
        roll = moving ? Math.sin(p) * 0.09 * k : 0;
        y = moving ? Math.abs(Math.sin(p)) * 0.02 * k : 0;
        // Tucked: a ball that rolls along the ground.
        if (st.tuck > 0.05) {
          st.roll += dt * speed / 0.32;
          y += st.tuck * 0.06;
        }
        break;
      }
      case 'fly': {
        // Hover and flutter; higher when it flees; land on the ground when resting with a friend.
        const want = state === 'flee' ? 3.2 : state === 'trust' || state === 'eat' ? 0.55 : s.perch ? 0.0 : 1.15;
        ease(st, 'hover', want, dt, 1.6);
        y = st.hover + Math.sin(t * 2.4) * 0.07 * Math.min(1, st.hover);
        pitch = THREE.MathUtils.clamp(speed * 0.08, 0, 0.4);
        const flapRate = st.hover < 0.1 ? 0 : moving || fleeing ? 17 : 11;
        const flap = Math.sin(t * flapRate);
        for (const w of wings) {
          const a = (flapRate ? flap * (w.fore ? 0.75 : 0.6) + 0.15 : -0.9) * w.s;
          w.pivot.rotation.set(0, 0, a);
          if (!flapRate) w.pivot.rotation.y = w.s * (w.fore ? 0.35 : 0.6);
          else w.pivot.rotation.y = 0;
        }
        for (const n of ['antL', 'antR']) {
          B[n].quaternion.copy(rest[n].q);
          B[n].rotateX(Math.sin(t * 3 + (n === 'antL' ? 0 : 1)) * 0.08 - pitch * 0.5);
        }
        if (lantern) lantern.material.emissiveIntensity = 1.3 + Math.sin(t * 3.1) * 0.25 + (state === 'ready' || state === 'trust' ? 0.6 : 0);
        break;
      }
      case 'trot': {
        const amp = Math.min(0.6, 0.25 + speed * 0.06);
        const run = speed > 3.5;
        for (const [n, ph] of [['legFL', 0], ['legBR', run ? 0.3 : 0], ['legFR', Math.PI], ['legBL', run ? Math.PI + 0.3 : Math.PI]]) {
          const L = B[n];
          L.quaternion.copy(rest[n].q);
          L.rotateX(moving ? Math.sin(p + ph) * amp : 0);
          const lo = B[n.replace('leg', 'low')];
          lo.quaternion.copy(rest[n.replace('leg', 'low')].q);
          const front = n.includes('F');
          lo.rotateX(moving ? Math.max(0, Math.sin(p + ph + (front ? -1.2 : 1.2))) * (front ? -0.9 : 0.9) * amp * 1.4 : 0);
        }
        y = moving ? Math.abs(Math.sin(p)) * (run ? 0.07 : 0.025) : 0;
        pitch = run ? Math.sin(p * 2) * 0.05 : 0;
        if (B.tail) {
          B.tail.quaternion.copy(rest.tail.q);
          B.tail.rotateX(fleeing ? -1.0 : -0.2 + Math.sin(t * 5) * 0.12);
        }
        break;
      }
      case 'bounce': {
        legs(['legFL', 'legBR'], 0.5, () => 0);
        legs(['legFR', 'legBL'], 0.5, () => Math.PI);
        y = moving ? Math.abs(Math.sin(p)) * 0.07 : 0;
        // Happy, it floats up a little on the breeze.
        const float = state === 'play' || state === 'ready' || st.cheer > 0 || s.float ? 1 : 0;
        ease(st, 'bob', float, dt, 2);
        y += st.bob * (0.35 + Math.sin(t * 1.6) * 0.12);
        roll = Math.sin(t * 1.3) * 0.04 * st.bob;
        sy = 1 + Math.sin(t * 2) * 0.015;
        break;
      }
      case 'scurry': {
        for (const [n, ph] of [['legFL', 0], ['legBR', 0], ['legFR', Math.PI], ['legBL', Math.PI]]) {
          const L = B[n];
          L.quaternion.copy(rest[n].q);
          if (moving) {
            L.rotateY(Math.sin(p + ph) * 0.7);
            L.rotateZ((n.endsWith('L') ? 1 : -1) * Math.max(0, Math.cos(p + ph)) * 0.3);
          }
        }
        // The S-wave down the body and tail; a lazy sway when still.
        const wave = moving ? 0.45 : 0.12;
        const wt = moving ? p : t * 1.4;
        B.body.quaternion.copy(rest.body.q);
        B.body.rotateY(Math.sin(wt) * wave * 0.25);
        B.chest.quaternion.copy(rest.chest.q);
        B.chest.rotateY(-Math.sin(wt) * wave * 0.35);
        ['tail1', 'tail2', 'tail3'].forEach((n, i) => {
          B[n].quaternion.copy(rest[n].q);
          B[n].rotateY(Math.sin(wt - 0.9 * (i + 1)) * wave * (0.5 + i * 0.25));
          B[n].rotateX(state === 'hide' ? 0.2 : -0.08 * i);
        });
        for (const n of ['gillL', 'gillR']) {
          B[n].quaternion.copy(rest[n].q);
          B[n].rotateZ((n === 'gillL' ? -1 : 1) * Math.sin(t * 3) * 0.12);
        }
        if (flame) {
          const f = 0.85 + Math.sin(t * 17) * 0.12 + Math.sin(t * 29) * 0.08 + (state === 'ready' || st.cheer > 0 ? 0.4 : 0);
          flame.scale.set(f, f * (1 + (moving ? 0.3 : 0)), f);
          flame.visible = state !== 'hide';
        }
        y = state === 'hide' ? -0.05 : 0;
        sy = state === 'hide' ? 0.85 : 1;
        break;
      }
      default:
        break;
    }
    // Tails wag for the others (the fawn's flicks are above).
    if (B.tail && gait !== 'trot' && gait !== 'scurry') {
      B.tail.quaternion.copy(rest.tail.q);
      const wag = state === 'ready' || state === 'play' || st.cheer > 0 ? 14 : moving ? 8 : 2.5;
      B.tail.rotateY(Math.sin(t * wag) * (wag > 10 ? 0.5 : 0.25));
    }
    // A shiver of disgust; a cheer: a hop and a spin.
    if (st.cheer > 0) {
      const k = st.cheer / 1.4;
      y += Math.abs(Math.sin(k * Math.PI * 3)) * 0.18 * (gait === 'fly' ? 0.5 : 1);
      st.spin += dt * 9 * Math.min(1, k * 2);
    } else st.spin *= Math.exp(-dt * 6);
    lift.position.y = y;
    lift.rotation.set(pitch + (gait === 'waddle' ? 0 : 0), st.spin, roll);
    squash.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    if (gait === 'waddle' && st.tuck > 0.05) {
      squash.rotation.x = st.roll;
      squash.position.y = 0.25 * st.tuck;
      squash.position.z = 0;
    } else {
      squash.rotation.x *= 0;
      squash.position.y = 0;
    }
    // The emote.
    if (st.emoteT > 0) {
      emoteSprite.visible = true;
      const k = Math.min(1, (1.6 - st.emoteT) * 6, st.emoteT * 3);
      emoteSprite.scale.setScalar(0.42 * k + 0.05);
      emoteSprite.position.set(0, height + 0.32 + (y + 0) * scale + Math.sin(t * 4) * 0.03, 0);
    } else emoteSprite.visible = false;
    blob.material.opacity = 0.22;
    blob.scale.setScalar(scale * (species === 'mistfawn' ? 1.2 : species === 'puffwool' ? 1.3 : 0.9) * (1 / (1 + y * 0.8)));
  }
  update(0);
  return {
    species,
    group,
    face,
    bones: byName,
    height,
    scale,
    update,
    setFur,
    flame,
    lantern,
    get hover() {
      return st.hover;
    },
    /** A bubble over its head: curious, alarm, love, like, dislike, ready, sleep. */
    emote(kind, secs = 1.6) {
      emoteSprite.material.map = emoteTexture(kind);
      emoteSprite.material.needsUpdate = true;
      st.emoteT = secs;
    },
    hop: () => (st.hopT = 0.7),
    cheer: (s = 1.4) => (st.cheer = s),
    shake: (s = 0.9) => (st.shake = s),
    /** Where its head is in the world (for the trust ring, hearts, the camera). */
    headWorld(out = new THREE.Vector3()) {
      return headBone.getWorldPosition(out);
    },
    dispose() {
      for (const s of furShells) s.removeFromParent();
      emoteSprite.material.dispose();
    }
  };
}

const BLOB_GEO = new THREE.CircleGeometry(0.36, 20);
const BLOB_MAT = new THREE.MeshBasicMaterial({ color: '#2a2440', transparent: true, opacity: 0.22, depthWrite: false });
function mulberry(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
