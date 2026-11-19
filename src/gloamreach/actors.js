/**
 * Gloamreach's people and creatures: rigged, animated models from the
 * asset library (polyfork's fantasy and village characters and animals, CC
 * BY 4.0), made to look their best and given more to do.
 *
 *  - Looks: their flat vertex colours become physically based materials —
 *    silver and steel turn metallic and glossy, gold too; skin gets a warm
 *    light-wrap; cloth and leather get a fine woven relief; every surface a
 *    rim of the key light; facets are smoothed (creased at hard edges).
 *  - Moves: besides their own idle, walk and run, they borrow KayKit's
 *    adventurers' clips (jump, land, sit, cheer, interact, look around…),
 *    retargeted bone by bone by each bone's turn away from a shared T-pose,
 *    baked once into ordinary clips.
 *  - Locomotion: idle, walk and run blend by speed with their phases locked,
 *    and play at the rate that keeps the feet planted.
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { toCreasedNormals, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { shared } from './materials.js';
import { characterLoader, retargetClip, BONE_MAPS } from '../library/characters.js';

const POLY = './library/polyfork/';
const M2M = './library/rigged/mesh2motion/human/';

const loader = characterLoader();
const files = new Map();
export function loadFile(url) {
  if (!files.has(url)) files.set(url, loader.loadAsync(url).catch(() => null));
  return files.get(url);
}
export const polyUrl = (id) => `${POLY}${id}.glb`;

/* ------------------------------------------------------------------ materials */

const CHAR_FRAG_PARS = /* glsl */ `
uniform float uRim;
uniform vec3 uRimColor;
uniform sampler2D tDetail;
uniform float uDetail;
varying vec3 vRest;
float charSkin;
float charMetal;
float charGold;
void RE_Direct_Char( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  float ndl = dot( geometryNormal, directLight.direction );
  float wrap = saturate( ( ndl + 0.5 ) / 1.5 ) - saturate( ndl );
  reflectedLight.directDiffuse += directLight.color * material.diffuseContribution * vec3( 1.0, 0.42, 0.28 ) * wrap * 0.75 * charSkin;
  float fres = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), 3.0 );
  float behind = saturate( dot( geometryViewDir, -directLight.direction ) * 0.5 + 0.55 );
  reflectedLight.directSpecular += directLight.color * fres * behind * uRim * 0.6;
}
`;

/**
 * Turn a flat-coloured character material into a full one: per-fragment
 * class from the vertex colour (skin, metal, gold, cloth), a fine relief,
 * light-wrap on skin and a rim.
 */
export function characterMaterial(src, { detail, rim = 0.6, emissive = null } = {}) {
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0,
    side: src.side ?? THREE.FrontSide,
    emissive: emissive ?? src.emissive ?? new THREE.Color(0),
    emissiveIntensity: src.emissiveIntensity ?? 1
  });
  const u = { uRim: { value: rim }, tDetail: { value: detail }, uDetail: { value: 1 }, uCape: { value: new THREE.Vector4(0, 0, 0, 1.5) }, uTime: shared.uTime };
  m.userData.char = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uRimColor: shared.uRimColor });
    sh.vertexShader = 'varying vec3 vRest;\nattribute float aCape;\nuniform vec4 uCape;\nuniform float uTime;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;')
      .replace(
        '#include <skinning_vertex>',
        `#include <skinning_vertex>
        {
          // A cape streams back with speed and ripples (model space: the character faces +z).
          float below = clamp((uCape.w - position.y) / (uCape.w * 0.72), 0.0, 1.0);
          float w = aCape * below * below;
          float ripple = sin(uTime * 9.0 + position.y * 6.0 + position.x * 3.0) * 0.5 + 0.5;
          transformed += vec3(0.0, uCape.y * w, -uCape.z * w * (0.85 + ripple * 0.3)) + vec3(uCape.x * w, 0.0, 0.0);
        }`
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${CHAR_FRAG_PARS}\n#undef RE_Direct\n#define RE_Direct RE_Direct_Char`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          vec3 c = diffuseColor.rgb;
          float mx = max(c.r, max(c.g, c.b));
          float mn = min(c.r, min(c.g, c.b));
          float sat = (mx - mn) / max(mx, 1e-3);
          // Skin: warm, middling saturation and brightness.
          charSkin = smoothstep(0.12, 0.25, c.r - c.b) * smoothstep(0.75, 0.45, sat) * smoothstep(0.15, 0.3, mx) * step(c.g, c.r) * step(c.b, c.g) * smoothstep(0.08, 0.2, sat);
          // Steel and silver: grey and bright. Gold: saturated yellow, bright.
          charMetal = smoothstep(0.16, 0.06, sat) * smoothstep(0.32, 0.55, mx);
          charGold = smoothstep(0.35, 0.55, sat) * smoothstep(0.45, 0.7, mx) * smoothstep(0.05, 0.15, c.r - c.b) * smoothstep(0.55, 0.85, c.g / max(c.r, 1e-3));
          charSkin *= 1.0 - charGold;
        }`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = mix(mix(0.82, 0.55, charSkin), 0.3, max(charMetal, charGold));`
      )
      .replace('#include <metalnessmap_fragment>', `float metalnessFactor = max(charMetal * 0.85, charGold * 0.9);`)
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // Fine relief: woven on cloth, pebbled on leather, nearly none on metal and skin.
          vec3 p = vRest * 1.3;
          vec3 bw = abs(normalize(cross(dFdx(vRest), dFdy(vRest))));
          bw = pow(bw, vec3(3.0)); bw /= (bw.x + bw.y + bw.z + 1e-4);
          float h = texture2D(tDetail, p.zy).g * bw.x + texture2D(tDetail, p.xz).g * bw.y + texture2D(tDetail, p.xy).g * bw.z;
          float k = uDetail * (1.0 - max(charMetal, charGold) * 0.85) * (1.0 - charSkin * 0.95) * 0.006;
          vec3 dpdx = dFdx(-vViewPosition);
          vec3 dpdy = dFdy(-vViewPosition);
          float dhdx = dFdx(h);
          float dhdy = dFdy(h);
          vec3 r1 = cross(dpdy, normal);
          vec3 r2 = cross(normal, dpdx);
          float det = dot(dpdx, r1);
          vec3 grad = sign(det) * (dhdx * r1 + dhdy * r2);
          vec3 nn = abs(det) * normal - grad * k;
          if (dot(nn, nn) > 1e-20) normal = normalize(nn);
        }`
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          float fr = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 4.0);
          outgoingLight += uRimColor * fr * uRim * 0.15;
        }
        #include <opaque_fragment>`
      );
  };
  m.customProgramCacheKey = () => 'gloam-char';
  return m;
}

/** Smooth a low-poly mesh's facets, keeping hard edges (creases over `angle`). */
function smoothGeometry(geo, angle = 0.9) {
  const out = toCreasedNormals(geo, angle);
  return out;
}

/* ------------------------------------------------------------------ retargeting */

/** polyfork's humanoids use Mixamo's bone names without the prefix. */
const QMAP = Object.fromEntries(Object.entries(BONE_MAPS.mixamo).map(([k, v]) => [k.replace('mixamorig:', ''), v]));

/** Clips borrowed from Mesh2Motion's human rig (CC0), under the names the game uses. */
export const BORROWED = {
  JumpStart: 'jump-start',
  JumpAir: 'jump-air',
  JumpLand: 'jump-land',
  Sprint: 'sprint',
  SitChair: 'sitting-idle',
  SitTalk: 'sitting-talking',
  SitFloor: 'sit-ground-idle',
  Talk: 'idle-talking',
  Listen: 'idle-listening',
  Greet: 'greeting',
  Nod: 'head-nod',
  Interact: 'interact',
  Hammer: 'hammering',
  Chop: 'chop-wood',
  Harvest: 'farm-harvest',
  Cast: 'spell-simple-idle',
  Lantern: 'idle-lantern',
  Pray: 'pray',
  FoldArms: 'idle-foldarms',
  Cheer: 'victory-fist-pump',
  Clap: 'clapping',
  LookAround: 'idle-subtle'
};

const clipFiles = new Map();
function m2mClip(file) {
  if (!clipFiles.has(file)) clipFiles.set(file, loader.loadAsync(`${M2M}animations/${file}.glb`).then((g) => g.animations[0] ?? null).catch(() => null));
  return clipFiles.get(file);
}

/**
 * Bake Mesh2Motion's clips onto a polyfork character's rig (the rest poses
 * differ — A-pose and T-pose — which retargetClip squares away bone by bone).
 */
export async function bakeBorrowed(targetGltf, names) {
  const base = await loadFile(`${M2M}variations/base.glb`);
  if (!base || !targetGltf.scene.getObjectByName('Hips')) return [];
  const out = [];
  const source = base.scene;
  for (const name of names) {
    const file = BORROWED[name];
    if (!file) continue;
    const clip = await m2mClip(file);
    if (!clip) continue;
    try {
      out.push(retargetClip(targetGltf.scene, source, clip, QMAP, { name }));
    } catch {
      /* a rig the map doesn't fit */
    }
  }
  return out;
}

/* ------------------------------------------------------------------ templates & actors */

/**
 * Load a polyfork character and get it ready to clone: smoothed, upgraded
 * materials, measured (height, stride speeds), its clips plus borrowed ones.
 */
export async function loadTemplate(id, { detail, borrow = [], height = null, rim = 0.6 } = {}) {
  const gltf = await loadFile(polyUrl(id));
  if (!gltf) return null;
  if (gltf.userData.template) return gltf.userData.template.then(async (t) => {
    // Already prepared: just bake any clips it doesn't have yet.
    const missing = borrow.filter((n) => !t.clips.some((c) => c.name === n));
    if (missing.length) t.clips.push(...(await bakeBorrowed(gltf, missing)));
    return t;
  });
  let resolve;
  gltf.userData.template = new Promise((r) => (resolve = r));
  const matCache = new Map();
  gltf.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry = smoothGeometry(o.geometry);
    const key = o.material.uuid;
    if (!matCache.has(key)) matCache.set(key, characterMaterial(o.material, { detail, rim }));
    o.material = matCache.get(key);
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
  });
  mergeSkinned(gltf.scene);
  const clips = [...gltf.animations];
  if (borrow.length) clips.push(...(await bakeBorrowed(gltf, borrow)));
  const box = new THREE.Box3().setFromObject(gltf.scene, true);
  const natural = box.max.y - box.min.y;
  const t = { id, gltf, clips, natural, scale: height ? height / natural : 1 };
  t.strides = measureStrides(t);
  resolve(t);
  return t;
}

/** A float copy of an attribute (merging needs matching types). */
function asFloat(attr) {
  const a = new Float32Array(attr.count * attr.itemSize);
  for (let i = 0; i < attr.count; i++) for (let k = 0; k < attr.itemSize; k++) a[i * attr.itemSize + k] = attr.getComponent(i, k);
  return new THREE.BufferAttribute(a, attr.itemSize);
}

/**
 * Merge a character's skinned parts (each glTF garment comes as its own
 * mesh) into one mesh per material on one skeleton: a few draws a person
 * instead of a dozen. Cape and cloak vertices are tagged (aCape) for the
 * cloth motion.
 */
function mergeSkinned(root) {
  const skinned = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.isSkinnedMesh) skinned.push(o);
  });
  if (skinned.length < 2) {
    for (const m of skinned) if (!m.geometry.attributes.aCape) m.geometry.setAttribute('aCape', new THREE.BufferAttribute(new Float32Array(m.geometry.attributes.position.count).fill(/cape|cloak/i.test(m.name) ? 1 : 0), 1));
    return;
  }
  // One skeleton holding every bone any part uses.
  const bones = [];
  const inverses = [];
  const index = new Map();
  for (const m of skinned) {
    m.skeleton.bones.forEach((b, i) => {
      if (index.has(b)) return;
      index.set(b, bones.length);
      bones.push(b);
      inverses.push(m.skeleton.boneInverses[i].clone());
    });
  }
  const base = skinned[0];
  const baseBindInv = base.bindMatrix.clone().invert();
  const byMat = new Map();
  for (const m of skinned) {
    const g = new THREE.BufferGeometry();
    const src = m.geometry;
    g.setAttribute('position', asFloat(src.attributes.position));
    g.setAttribute('normal', asFloat(src.attributes.normal));
    g.setAttribute('color', src.attributes.color ? asFloat(src.attributes.color) : new THREE.BufferAttribute(new Float32Array(src.attributes.position.count * 3).fill(1), 3));
    if (src.attributes.color && src.attributes.color.itemSize === 4) {
      const c4 = g.attributes.color;
      const c3 = new Float32Array(c4.count * 3);
      for (let i = 0; i < c4.count; i++) c3.set([c4.getX(i), c4.getY(i), c4.getZ(i)], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(c3, 3));
    }
    const si = src.attributes.skinIndex;
    const idx = new Uint16Array(si.count * 4);
    for (let i = 0; i < si.count; i++) for (let k = 0; k < 4; k++) idx[i * 4 + k] = index.get(m.skeleton.bones[si.getComponent(i, k)]) ?? 0;
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
    g.setAttribute('skinWeight', asFloat(src.attributes.skinWeight));
    g.setAttribute('aCape', new THREE.BufferAttribute(new Float32Array(si.count).fill(/cape|cloak/i.test(m.name) ? 1 : 0), 1));
    if (!m.bindMatrix.equals(base.bindMatrix)) g.applyMatrix4(baseBindInv.clone().multiply(m.bindMatrix));
    if (src.index) g.setIndex(src.index.clone());
    const key = m.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { material: m.material, geos: [] });
    byMat.get(key).geos.push(g.index ? g.toNonIndexed() : g);
  }
  const skeleton = new THREE.Skeleton(bones, inverses);
  const parent = base.parent;
  // A part can hold the skeleton under it (a glTF mesh node with children): keep those.
  for (const m of skinned) {
    for (const child of [...m.children]) m.parent.attach(child);
    m.parent.remove(m);
  }
  for (const { material, geos } of byMat.values()) {
    const merged = mergeGeometries(geos, false);
    const mesh = new THREE.SkinnedMesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    parent.add(mesh);
    mesh.bind(skeleton, base.bindMatrix);
  }
}

/** Speed (m/s at scale 1) each locomotion clip's feet move at, from the feet themselves. */
function measureStrides(t) {
  const out = {};
  const root = SkeletonUtils.clone(t.gltf.scene);
  const mixer = new THREE.AnimationMixer(root);
  for (const name of ['Walk', 'Run', 'Sprint']) {
    const clip = t.clips.find((c) => c.name === name);
    if (!clip) continue;
    mixer.stopAllAction();
    mixer.clipAction(clip).reset().play();
    const foot = root.getObjectByName('LeftFoot') ?? root.getObjectByName('LeftHindFoot');
    if (!foot) continue;
    let min = Infinity;
    let max = -Infinity;
    const n = 30;
    for (let i = 0; i <= n; i++) {
      mixer.setTime((i / n) * clip.duration);
      root.updateWorldMatrix(true, true);
      const p = root.worldToLocal(foot.getWorldPosition(new THREE.Vector3()));
      min = Math.min(min, p.z);
      max = Math.max(max, p.z);
    }
    // A foot is planted for about half the cycle and travels the stride back in it.
    out[name] = ((max - min) * 2) / clip.duration * 0.92;
  }
  return out;
}

/**
 * One character in the world: its own clone, mixer and actions. Locomotion
 * (`move(speed)`) blends idle → walk → run; one-shot or looping overlays
 * (`act(name)`) take over the whole body and hand back with a crossfade.
 */
export class Actor {
  constructor(template, { height = null, name = '' } = {}) {
    this.template = template;
    this.object = new THREE.Group();
    this.object.name = name;
    this.model = SkeletonUtils.clone(template.gltf.scene);
    const s = height ? height / template.natural : template.scale;
    this.scaleK = s;
    this.model.scale.setScalar(s);
    this.object.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const c of template.clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.loco = ['Idle', 'Walk', 'Run', 'Sprint'].filter((n) => this.actions[n]);
    for (const n of this.loco) {
      const a = this.actions[n];
      a.play();
      a.setEffectiveWeight(n === 'Idle' ? 1 : 0);
    }
    this.speed = 0;
    this.overlay = null;
    this.overlayW = 0;
    this.strides = Object.fromEntries(Object.entries(template.strides).map(([k, v]) => [k, v * s]));
    this.bones = {};
    this.model.traverse((o) => {
      if (o.isBone) this.bones[o.name] = o;
    });
  }

  /** Play a clip over the locomotion: loop it, or once (then back). */
  act(name, { loop = true, fade = 0.3, speed = 1, clamp = false } = {}) {
    const a = this.actions[name];
    if (!a) return false;
    if (this.overlay === name && a.isRunning()) return true;
    if (this.overlay && this.actions[this.overlay] && this.overlay !== name) this.actions[this.overlay].fadeOut(fade);
    a.reset();
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    a.clampWhenFinished = clamp || !loop;
    a.timeScale = speed;
    a.setEffectiveWeight(1);
    a.fadeIn(fade).play();
    this.overlay = name;
    this.overlayFade = fade;
    return true;
  }

  /** Stop the overlay, back to locomotion. */
  rest(fade = 0.3) {
    if (!this.overlay) return;
    this.actions[this.overlay]?.fadeOut(fade);
    this.overlay = null;
  }

  /** Is a one-shot overlay done? */
  done() {
    if (!this.overlay) return true;
    const a = this.actions[this.overlay];
    return !a || (a.loop === THREE.LoopOnce && a.time >= a.getClip().duration - 0.02);
  }

  /** Locomotion weights from ground speed (m/s). */
  move(speed) {
    this.speed = speed;
  }

  update(dt) {
    const sp = this.speed;
    const walkV = this.strides.Walk || 1.4;
    const runV = this.strides.Run || 4;
    const sprintV = this.strides.Sprint || runV * 1.6;
    const w = { Idle: 0, Walk: 0, Run: 0, Sprint: 0 };
    if (sp < 0.15) w.Idle = 1;
    else if (sp < walkV) {
      const t = THREE.MathUtils.smoothstep(sp, 0.15, walkV * 0.7);
      w.Idle = 1 - t;
      w.Walk = t;
    } else if (sp < runV * 1.1 || !this.actions.Sprint) {
      const t = THREE.MathUtils.smoothstep(sp, walkV * 1.05, runV * 0.85);
      w.Walk = 1 - t;
      w.Run = t;
    } else {
      const t = THREE.MathUtils.smoothstep(sp, runV * 1.1, Math.max(runV * 1.3, sprintV * 0.9));
      w.Run = 1 - t;
      w.Sprint = t;
    }
    const over = this.overlay ? 1 : 0;
    for (const n of this.loco) this.actions[n].setEffectiveWeight(w[n] * (1 - over * 0.999));
    // Lock the gaits' phases so the feet agree, and pace the leading one to the ground speed.
    const gaits = ['Walk', 'Run', 'Sprint'].filter((n) => this.actions[n]);
    if (gaits.length) {
      const leadName = gaits.reduce((a, b) => (w[b] > w[a] ? b : a), gaits[0]);
      const lead = this.actions[leadName];
      const natural = { Walk: walkV, Run: runV, Sprint: sprintV }[leadName];
      lead.timeScale = sp > 0.15 ? THREE.MathUtils.clamp(sp / natural, 0.6, 1.8) : 1;
      const phase = lead.time / lead.getClip().duration;
      for (const n of gaits) {
        if (n === leadName) continue;
        const a = this.actions[n];
        a.timeScale = 0;
        a.time = phase * a.getClip().duration;
      }
    }
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
  }
}

/** A simple animal: idle / walk / run by speed, from its own clips. */
export class Creature extends Actor {}

/**
 * A stand-in hero for when the asset library hasn't downloaded yet: a simple
 * cloaked figure that bobs as it moves. Same surface as Actor.
 */
export class FallbackActor {
  constructor(color = '#d9b25a') {
    this.object = new THREE.Group();
    this.model = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xe0b090, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.9, 6, 12), cloth);
    body.position.y = 0.95;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skin);
    head.position.y = 1.65;
    const cape = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.3, 16, 1, true), cloth);
    cape.position.y = 0.95;
    for (const m of [body, head, cape]) {
      m.castShadow = true;
      this.model.add(m);
    }
    this.object.add(this.model);
    this.bones = {};
    this.actions = {};
    this.strides = {};
    this.scaleK = 1;
    this.speed = 0;
    this.t = 0;
    this.overlay = null;
  }

  act() {
    return false;
  }

  rest() {}

  done() {
    return true;
  }

  move(speed) {
    this.speed = speed;
  }

  update(dt) {
    this.t += dt * (1 + this.speed * 1.6);
    this.model.position.y = Math.abs(Math.sin(this.t * 3)) * Math.min(0.08, this.speed * 0.02);
  }

  dispose() {}
}
