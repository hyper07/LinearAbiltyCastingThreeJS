/**
 * The creatures' bodies: Mesh2Motion's rigged beasts (CC0) loaded once and
 * cloned, made ours — repainted through their own texture's light and shade
 * into a new coat, reshaped bone by bone, given fur — and animated with
 * their clips blended by speed (feet kept planted) and one-shots over them.
 *
 *   const rig = await loadRig('horse');           // { gltf, clips, natural }
 *   const b = new Beast(rig, { height: 1.9, coat });
 *   b.move(speed); b.play('Rear'); each frame b.update(dt)
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { characterLoader } from '../library/characters.js';

const M2M = './library/rigged/mesh2motion/';
export const RIGS = {
  horse: { model: 'horse/model.glb', clips: { Idle: 'idle', Walk: 'walk', Trot: 'trot', Run: 'run', Rear: 'rear', Kick: 'kick', Eat: 'eating', Headbutt: 'headbut', Death: 'death', Sleep: 'sleep', TurnL: 'turn-left', TurnR: 'turn-right', Rise: 'lay-to-idle' }, dir: 'horse' },
  trex: { model: 'kaiju/variations/trex.glb', clips: { Idle: 'idle', Walk: 'walk', Bite: 'attack', Tail: 'tail-attack', Roar: 'roar', Hit: 'hit', Death: 'death', Swim: 'swim' }, dir: 'kaiju' },
  spider: { model: 'spider/model.glb', clips: { Idle: 'idle', Walk: 'walk', Attack: 'attack', Bite: 'bite', Hit: 'hit', Death: 'death', Jump: 'jump', Threat: 'threat-display', Eat: 'eating' }, dir: 'spider' }
};

const loader = characterLoader();
const cache = new Map();

/** Load a rig and its clips once (null if the library isn't there). */
export function loadRig(id) {
  if (!cache.has(id)) {
    const R = RIGS[id];
    cache.set(
      id,
      (async () => {
        const gltf = await loader.loadAsync(M2M + R.model).catch(() => null);
        if (!gltf) return null;
        const clips = {};
        await Promise.all(
          Object.entries(R.clips).map(async ([name, file]) => {
            const g = await loader.loadAsync(`${M2M}${R.dir}/animations/${file}.glb`).catch(() => null);
            const c = g?.animations?.[0];
            if (c) {
              c.name = name;
              clips[name] = c;
            }
          })
        );
        gltf.scene.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(gltf.scene, true);
        return { id, gltf, clips, natural: box.max.y - box.min.y, length: box.max.z - box.min.z, box };
      })()
    );
  }
  return cache.get(id);
}

/* ------------------------------------------------------------------ the coat */

/**
 * Repaint a creature: its texture's brightness picks a colour from a ramp
 * (shadow → mid → light) for its back, another for its belly (by how far down
 * the body faces), with stripes across the back and an optional damage wear
 * (scars, dulling) and glow (eyes, rage). Keeps the model's own shading detail.
 */
export function coatMaterial(src, { back, belly, stripe = null, stripeK = 0, wear = false, rim = 0.4, rough = 0.75 }) {
  const m = new THREE.MeshStandardMaterial({ map: src.map, roughness: rough, metalness: 0 });
  const u = {
    uBack: { value: back.map((c) => new THREE.Color(c)) },
    uBelly: { value: belly.map((c) => new THREE.Color(c)) },
    uStripe: { value: new THREE.Color(stripe ?? back[0]) },
    uStripeK: { value: stripeK },
    uWear: { value: 0 },
    uFlash: { value: new THREE.Color(0, 0, 0) },
    uRage: { value: 0 },
    uRim: { value: rim },
    uDissolve: { value: 0 }
  };
  m.userData.coat = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'varying vec3 vRestP;\nvarying vec3 vRestN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRestP = position;\nvRestN = normal;');
    sh.fragmentShader = 'varying vec3 vRestP;\nvarying vec3 vRestN;\nuniform vec3 uBack[3];\nuniform vec3 uBelly[3];\nuniform vec3 uStripe;\nuniform float uStripeK;\nuniform float uWear;\nuniform vec3 uFlash;\nuniform float uRage;\nuniform float uRim;\nuniform float uDissolve;\n' + sh.fragmentShader
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
        vec4 texel = texture2D(map, vMapUv);
        float l = dot(texel.rgb, vec3(0.3, 0.55, 0.15));
        vec3 a = l < 0.5 ? mix(uBack[0], uBack[1], l * 2.0) : mix(uBack[1], uBack[2], l * 2.0 - 1.0);
        vec3 b = l < 0.5 ? mix(uBelly[0], uBelly[1], l * 2.0) : mix(uBelly[1], uBelly[2], l * 2.0 - 1.0);
        float under = smoothstep(0.1, -0.5, normalize(vRestN).y);
        vec3 c = mix(a, b, under);
        // Stripes across the back.
        float st = smoothstep(0.55, 0.8, sin(vRestP.z * 9.0 + sin(vRestP.x * 4.0) * 1.5) * 0.5 + 0.5) * (1.0 - under) * uStripeK;
        c = mix(c, uStripe, st);
        // Wear: scars and grime as the hunt goes on.
        float sc = fract(sin(dot(floor(vRestP.xz * 14.0 + vRestP.y * 3.0), vec2(12.9898, 78.233))) * 43758.5453);
        float scar = step(1.0 - uWear * 0.35, sc) * smoothstep(0.0, 0.2, uWear);
        c = mix(c, vec3(0.32, 0.08, 0.06), scar * 0.8);
        c *= 1.0 - uWear * 0.18;
        if (uDissolve > 0.0 && sc < uDissolve) discard;
        diffuseColor.rgb *= c;
        #endif`
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          float fr = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0);
          outgoingLight += vec3(0.9, 0.95, 1.0) * fr * uRim * 0.18 + uFlash + vec3(1.0, 0.25, 0.05) * uRage * fr * 0.3;
        }
        #include <opaque_fragment>`
      );
  };
  m.customProgramCacheKey = () => 'wyld-coat';
  return m;
}

/* ------------------------------------------------------------------ fur */

/**
 * Fur shells over a skinned mesh: the body drawn again `layers` times, each
 * pushed out along the (skinned) normal, cut into strands by a noise —
 * fewer strands survive further out — darkened at the root, lighter at the
 * tips, drooping with gravity and tossed by motion. `lenOf(vertex)` gives
 * each vertex's fur length (metres, in model units before the scale): a
 * mane, a ruff, feathered fetlocks. One draw for all the layers.
 */
export function furShells(mesh, { layers = 12, lenOf, coat, density = 220, tip = '#d8c8a0', clump = 0.5 }) {
  const src = mesh.geometry;
  const n = src.attributes.position.count;
  const lens = new Float32Array(n);
  let any = 0;
  for (let i = 0; i < n; i++) {
    lens[i] = Math.max(0, lenOf(i));
    if (lens[i] > 0) any++;
  }
  if (!any) return null;
  // Only the triangles that carry fur.
  const index = src.index ? src.index.array : Array.from({ length: n }, (_, i) => i);
  const tris = [];
  for (let t = 0; t < index.length; t += 3) if (lens[index[t]] + lens[index[t + 1]] + lens[index[t + 2]] > 0) tris.push(index[t], index[t + 1], index[t + 2]);
  const used = [...new Set(tris)];
  const remap = new Map(used.map((v, i) => [v, i]));
  const m = used.length;
  const g = new THREE.BufferGeometry();
  const copy = (name, size) => {
    const a = src.attributes[name];
    if (!a) return;
    const out = new Float32Array(m * layers * size);
    for (let L = 0; L < layers; L++) for (let i = 0; i < m; i++) for (let k = 0; k < size; k++) out[(L * m + i) * size + k] = a.getComponent(used[i], k);
    g.setAttribute(name, new THREE.BufferAttribute(out, size));
  };
  copy('position', 3);
  copy('normal', 3);
  copy('uv', 2);
  copy('skinIndex', 4);
  copy('skinWeight', 4);
  const shell = new Float32Array(m * layers * 2);
  for (let L = 0; L < layers; L++) for (let i = 0; i < m; i++) {
    shell[(L * m + i) * 2] = (L + 1) / layers;
    shell[(L * m + i) * 2 + 1] = lens[used[i]];
  }
  g.setAttribute('aShell', new THREE.BufferAttribute(shell, 2));
  const idx = new Uint32Array(tris.length * layers);
  for (let L = 0; L < layers; L++) for (let t = 0; t < tris.length; t++) idx[L * tris.length + t] = L * m + remap.get(tris[t]);
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  const mat = new THREE.MeshStandardMaterial({ map: mesh.material.map, roughness: 0.9, metalness: 0, side: THREE.FrontSide });
  const u = {
    uGravity: { value: new THREE.Vector3(0, -0.4, 0) },
    uTip: { value: new THREE.Color(tip) },
    uDensity: { value: density },
    uClump: { value: clump },
    uMotion: { value: new THREE.Vector3() },
    uShells: { value: layers },
    uLenK: { value: 1 }
  };
  const cu = coat?.userData.coat;
  mat.userData.fur = u;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, cu ?? {});
    sh.vertexShader = 'attribute vec2 aShell;\nvarying vec2 vShell;\nvarying vec3 vRestP;\nvarying vec3 vRestN;\nuniform vec3 uGravity;\nuniform vec3 uMotion;\nuniform float uLenK;\n' + sh.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRestP = position;\nvRestN = normal;')
      .replace(
        '#include <skinning_vertex>',
        `#include <skinning_vertex>
        {
          float h = aShell.x;
          float L = aShell.y * uLenK;
          vShell = vec2(h, L);
          vec3 nrm = normalize(objectNormal);
          transformed += nrm * L * h + (uGravity + uMotion) * L * h * h;
        }`
      );
    let frag = sh.fragmentShader;
    frag = 'varying vec2 vShell;\nuniform vec3 uTip;\nuniform float uDensity;\nuniform float uClump;\nuniform float uShells;\n' + frag;
    if (cu) {
      // Same coat as the body underneath.
      frag = 'varying vec3 vRestP;\nvarying vec3 vRestN;\nuniform vec3 uBack[3];\nuniform vec3 uBelly[3];\nuniform vec3 uStripe;\nuniform float uStripeK;\nuniform float uWear;\nuniform vec3 uFlash;\nuniform float uRage;\nuniform float uDissolve;\n' + frag;
    } else frag = 'varying vec3 vRestP;\nvarying vec3 vRestN;\n' + frag;
    frag = frag.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
      vec4 texel = texture2D(map, vMapUv);
      vec3 c = texel.rgb;
      ${cu ? `float l = dot(texel.rgb, vec3(0.3, 0.55, 0.15));
      vec3 a = l < 0.5 ? mix(uBack[0], uBack[1], l * 2.0) : mix(uBack[1], uBack[2], l * 2.0 - 1.0);
      vec3 b = l < 0.5 ? mix(uBelly[0], uBelly[1], l * 2.0) : mix(uBelly[1], uBelly[2], l * 2.0 - 1.0);
      float under = smoothstep(0.1, -0.5, normalize(vRestN).y);
      c = mix(a, b, under);
      float st = smoothstep(0.55, 0.8, sin(vRestP.z * 9.0 + sin(vRestP.x * 4.0) * 1.5) * 0.5 + 0.5) * (1.0 - under) * uStripeK;
      c = mix(c, uStripe, st);
      c *= 1.0 - uWear * 0.2;` : ''}
      // Strands: a cell noise in the texture's space; thinner further out.
      // Two lattices, turned against each other, so no rows line up.
      float strand = 0.0;
      for (int k = 0; k < 2; k++) {
        float a = float(k) * 0.9 + 0.3;
        vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * vMapUv * uDensity * (1.0 + float(k) * 0.37);
        vec2 cell = floor(q);
        vec2 f = fract(q) - 0.5;
        float hsh = fract(sin(dot(cell + float(k) * 17.0, vec2(127.1, 311.7))) * 43758.5453);
        float hsh2 = fract(sin(dot(cell + float(k) * 17.0, vec2(269.5, 183.3))) * 43758.5453);
        strand = max(strand, (1.0 - length(f + (vec2(hsh, hsh2) - 0.5) * 0.5) * 2.2) * (0.55 + hsh * 0.6));
      }
      if (strand < vShell.x * (1.05 - uClump * 0.2) || vShell.y <= 0.0) discard;
      float ao = mix(0.62, 1.05, vShell.x);
      c = mix(c, c * uTip * 1.4, vShell.x * vShell.x * 0.7) * ao;
      diffuseColor.rgb *= c;
      #endif`
    );
    frag = frag.replace('#include <opaque_fragment>', `${cu ? 'outgoingLight += uFlash + vec3(1.0, 0.2, 0.05) * uRage * 0.15 * vShell.x;' : ''}\n#include <opaque_fragment>`);
    sh.fragmentShader = frag;
  };
  mat.customProgramCacheKey = () => `wyld-fur${cu ? '-coat' : ''}`;
  const fur = new THREE.SkinnedMesh(g, mat);
  fur.bind(mesh.skeleton, mesh.bindMatrix);
  fur.frustumCulled = false;
  fur.castShadow = false;
  fur.receiveShadow = true;
  fur.userData.fur = u;
  return fur;
}

/** Each vertex's main bone (the one with the most weight) and that weight. */
export function mainBones(mesh) {
  const si = mesh.geometry.attributes.skinIndex;
  const sw = mesh.geometry.attributes.skinWeight;
  const out = new Array(si.count);
  for (let i = 0; i < si.count; i++) {
    let best = 0;
    let bw = -1;
    for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > bw) [bw, best] = [sw.getComponent(i, k), si.getComponent(i, k)];
    out[i] = mesh.skeleton.bones[best]?.name ?? '';
  }
  return out;
}

/** How much of a vertex's weight is on bones whose names match. */
export function weightOn(mesh, i, re) {
  const si = mesh.geometry.attributes.skinIndex;
  const sw = mesh.geometry.attributes.skinWeight;
  let w = 0;
  for (let k = 0; k < 4; k++) if (re.test(mesh.skeleton.bones[si.getComponent(i, k)]?.name ?? '')) w += sw.getComponent(i, k);
  return w;
}

/* ------------------------------------------------------------------ a living beast */

export class Beast {
  constructor(rig, { height = null, scale = null, coat = null, gaits = ['Walk', 'Run'], speeds = null, name = '' } = {}) {
    this.rig = rig;
    this.object = new THREE.Group();
    this.object.name = name;
    this.model = SkeletonUtils.clone(rig.gltf.scene);
    const s = scale ?? (height ? height / rig.natural : 1);
    this.scaleK = s;
    this.model.scale.setScalar(s);
    this.object.add(this.model);
    this.meshes = [];
    this.model.traverse((o) => {
      if (o.isSkinnedMesh) {
        o.frustumCulled = false;
        o.castShadow = true;
        o.receiveShadow = true;
        if (coat) o.material = coat(o.material);
        this.meshes.push(o);
      }
      if (o.isBone) (this.bones ??= {})[o.name] = o;
    });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const [n, c] of Object.entries(rig.clips)) this.actions[n] = this.mixer.clipAction(c);
    this.loco = ['Idle', ...gaits].filter((n) => this.actions[n]);
    for (const n of this.loco) {
      const a = this.actions[n];
      a.play();
      a.setEffectiveWeight(n === 'Idle' ? 1 : 0);
    }
    // Ground speed (m/s at this scale) each gait's feet move at; estimated if not given.
    this.speeds = speeds ?? Object.fromEntries(this.loco.map((n, i) => [n, i === 0 ? 0 : 1.6 * i * s * (rig.length / 2)]));
    this.speed = 0;
    this.overlay = null;
    this.pace = 1;
  }

  /** Play a clip over the gaits: once (then back) or looping; `hold` keeps the last frame. */
  play(name, { loop = false, fade = 0.2, speed = 1, hold = false } = {}) {
    const a = this.actions[name];
    if (!a) return false;
    if (this.overlay && this.overlay !== name) this.actions[this.overlay]?.fadeOut(fade);
    a.reset();
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    a.clampWhenFinished = hold || !loop;
    a.timeScale = speed;
    a.setEffectiveWeight(1);
    a.fadeIn(fade).play();
    this.overlay = name;
    this.overlayHold = hold;
    return true;
  }

  rest(fade = 0.3) {
    if (!this.overlay) return;
    this.actions[this.overlay]?.fadeOut(fade);
    this.overlay = null;
  }

  /** How far through the overlay (0…1); 1 when none. */
  progress() {
    if (!this.overlay) return 1;
    const a = this.actions[this.overlay];
    return a ? Math.min(1, a.time / a.getClip().duration) : 1;
  }

  done() {
    return this.progress() >= 0.98 && !this.actions[this.overlay]?.loop !== THREE.LoopRepeat;
  }

  move(speed) {
    this.speed = speed;
  }

  update(dt) {
    const sp = this.speed;
    const names = this.loco;
    const w = Object.fromEntries(names.map((n) => [n, 0]));
    if (sp < 0.12 || names.length < 2) w.Idle = 1;
    else {
      // Between the two gaits whose speeds bracket ours.
      let i = 1;
      while (i < names.length - 1 && sp > this.speeds[names[i]] * 1.05) i++;
      const lo = i === 1 ? 'Idle' : names[i - 1];
      const hi = names[i];
      const v0 = lo === 'Idle' ? 0.12 : this.speeds[lo];
      const v1 = this.speeds[hi];
      const t = THREE.MathUtils.clamp((sp - v0) / Math.max(0.01, v1 - v0), 0, 1);
      const k = t * t * (3 - 2 * t);
      w[lo] = 1 - k;
      w[hi] = k;
    }
    const over = this.overlay ? this.actions[this.overlay].getEffectiveWeight() : 0;
    for (const n of names) this.actions[n].setEffectiveWeight(w[n] * (1 - over * 0.999));
    // The leading gait plays at the speed that keeps the feet planted; the others follow its phase.
    const gaits = names.slice(1);
    if (gaits.length) {
      const lead = gaits.reduce((a, b) => (w[b] > w[a] ? b : a), gaits[0]);
      const la = this.actions[lead];
      la.timeScale = sp > 0.12 ? THREE.MathUtils.clamp(sp / this.speeds[lead], 0.5, 2.2) * this.pace : 1;
      const ph = la.time / la.getClip().duration;
      for (const n of gaits) {
        if (n === lead) continue;
        const a = this.actions[n];
        a.timeScale = 0;
        a.time = ph * a.getClip().duration;
      }
    }
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.model);
  }
}
