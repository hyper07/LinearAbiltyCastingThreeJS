import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadBody } from '../mmo/bodies.js';

/**
 * Stoneball's cavemen: the KayKit Barbarian (CC0, Kay Lousberg) from the
 * asset library, stripped of helmet, cape and axes, re-skinned in his
 * tribe's leather (bare arms and legs, a fur trim, bone toggles), with a
 * thick shaggy mane of jittered low-poly clumps on the head bone, and on
 * some a big beard and a bone stuck in the hair. If the library model isn't
 * there, a procedural chibi caveman stands in, so the game always plays.
 *
 *   const c = await makeCaveman({ look, leather, dark });   // look from rules.js
 *   scene.add(c.model);  …  c.update(dt, player);  …  c.dispose();
 */

const HEIGHT = 1.75;
/** The scale the head was measured at (bodies.js dress() at height 1.8, which counts the hidden hat). */
const MEASURED = 0.750687787;
const ATLAS = 256; // the 1024² KayKit atlas is flat colour swatches: a quarter size loses nothing
const CW = ATLAS / 8; // the atlas is 8 swatches across and 4 down
const CH = ATLAS / 4;

const col = (c) => new THREE.Color(c);
const shade = (c, k) => {
  const x = col(c);
  return k >= 0 ? x.lerp(new THREE.Color('#ffffff'), k) : x.multiplyScalar(1 + k);
};
const css = (c) => `#${c.getHexString()}`;

/** A small seeded stream, so the same look always grows the same hair. */
function seeded(seed) {
  let s = Math.floor(seed * 1e9) | 0 || 7;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ================================================================ hair */

/** One rough clump: a welded icosahedron, every corner pushed in or out, flat-shaded. */
function clump(random, r, sx, sy, sz, tint) {
  const g = new THREE.IcosahedronGeometry(1, 0);
  const pos = g.attributes.position;
  const moves = new Map();
  for (let i = 0; i < pos.count; i++) {
    const k = `${Math.round(pos.getX(i) * 1e3)},${Math.round(pos.getY(i) * 1e3)},${Math.round(pos.getZ(i) * 1e3)}`;
    if (!moves.has(k)) moves.set(k, 0.72 + random() * 0.5);
    const m = moves.get(k);
    pos.setXYZ(i, pos.getX(i) * m * r * sx, pos.getY(i) * m * r * sy, pos.getZ(i) * m * r * sz);
  }
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 3) {
    // Per face, a touch lighter or darker: strands catching the light.
    const k = 0.82 + random() * 0.36;
    for (let j = 0; j < 3; j++) colors.set([tint.r * k, tint.g * k, tint.b * k], (i + j) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  return g;
}

/**
 * A shaggy mane (and maybe a beard) for a head: an ellipsoid at `c` with
 * radii `r` (x, y, z), the face looking +z. Returns one merged geometry with
 * vertex colours; colour it white × the vertex colours (hair colour baked in).
 */
export function hairGeometry({ c, r, hair, shag = 0.5, beard = false, face = 0.75 }, random) {
  const parts = [];
  const tint = col(hair);
  const vol = 0.92 + shag * 0.35;
  const at = (a, e, out = 1) => new THREE.Vector3(
    c.x + Math.sin(a) * Math.cos(e) * r.x * out,
    c.y + Math.sin(e) * r.y * out,
    c.z + Math.cos(a) * Math.cos(e) * r.z * out
  );
  const put = (p, size, sx, sy, sz, tilt = 0) => {
    const g = clump(random, size, sx, sy, sz, tint);
    g.rotateX((random() - 0.5) * 0.9 + tilt);
    g.rotateY(random() * Math.PI * 2);
    g.translate(p.x, p.y, p.z);
    parts.push(g);
  };
  const W = r.x;
  // Crown: a dome of big clumps, leaving the face clear below the hairline.
  for (let ring = 0; ring < 4; ring++) {
    const e = (0.38 + ring * 0.33) * (Math.PI / 2) * 0.98;
    const n = [11, 10, 7, 3][ring];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.4 + (random() - 0.5) * 0.35;
      if (ring === 0 && Math.cos(a) > face - 0.05) continue; // forehead
      put(at(a, e + (random() - 0.5) * 0.12, 1.02), W * (0.32 + random() * 0.1) * vol, 1, 0.85, 1);
    }
  }
  // Fringe: shaggy bangs over the brow.
  for (let i = 0; i < 6; i++) {
    const a = -0.75 + (i / 5) * 1.5 + (random() - 0.5) * 0.15;
    put(at(a, 0.62 + random() * 0.12, 1.04), W * (0.2 + random() * 0.07) * vol, 1.05, 1.15, 0.8, 0.5);
  }
  // Mane: thick locks over the ears and down the back of the head and neck.
  const long = 0.55 + shag * 0.75;
  for (let i = 0; i < 16; i++) {
    const a = Math.PI * (0.38 + (i / 15) * 1.24) + (random() - 0.5) * 0.2;
    for (let k = 0; k < 3; k++) {
      const e = 0.35 - k * 0.5 * long - random() * 0.15;
      const p = at(a, e, 1.03 + k * 0.03);
      if (Math.cos(a) > 0.2) continue;
      put(p, W * (0.3 - k * 0.04 + random() * 0.08) * vol, 0.95, 1.35 + k * 0.15, 0.9);
    }
  }
  // Side locks framing the face.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      const p = at(s * (1.05 + random() * 0.15), 0.15 - k * 0.45, 1.05);
      put(p, W * (0.24 + random() * 0.06) * vol, 0.85, 1.45, 0.85);
    }
  }
  if (beard) {
    // A big shaggy beard from ear to ear, hanging past the chin.
    for (let i = 0; i < 9; i++) {
      const a = -1.15 + (i / 8) * 2.3;
      const p = at(a, -0.42 - Math.cos(a) * 0.2, 1.0);
      put(p, W * (0.24 + random() * 0.07), 1, 1.25, 0.9);
    }
    for (let i = 0; i < 4; i++) {
      const a = -0.45 + (i / 3) * 0.9;
      const p = at(a, -0.85 - random() * 0.12, 0.92);
      put(p, W * (0.22 + random() * 0.06), 0.95, 1.5, 0.85);
    }
  }
  const g = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  g.computeVertexNormals();
  return g;
}

/** A femur through the topknot: two knuckles and a shaft. */
function boneGeometry(len) {
  const parts = [];
  const shaft = new THREE.CylinderGeometry(len * 0.07, len * 0.07, len, 6).rotateZ(Math.PI / 2);
  parts.push(shaft);
  for (const s of [-1, 1]) for (const z of [-1, 1]) parts.push(new THREE.IcosahedronGeometry(len * 0.11, 0).translate((s * len) / 2, 0, z * len * 0.07));
  for (const p of parts) p.deleteAttribute('uv');
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  for (const p of parts) p.dispose();
  g.computeVertexNormals();
  return g;
}

/* ================================================================ skin */

/**
 * The Barbarian's atlas, repainted for one caveman: tribe leather on the
 * tunic, darker hide straps and wraps, fur trim, bone where there was iron,
 * bare skin on arms and legs, his own hair colour on brows and beard.
 * Swatch (column, row) as they sit in the 8×4 atlas.
 */
function paintAtlas(image, { leather, dark, skin, hair, beard }) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ATLAS;
  const g = canvas.getContext('2d');
  g.drawImage(image, 0, 0, ATLAS, ATLAS);
  const fur = css(col(leather).lerp(col('#efe2c4'), 0.55));
  const swatch = (cx, cy, colour, light = 0.12, deep = -0.28) => {
    const x = cx * CW, y = cy * CH;
    const grad = g.createLinearGradient(0, y, 0, y + CH);
    grad.addColorStop(0, css(shade(colour, light)));
    grad.addColorStop(1, css(shade(colour, deep)));
    g.fillStyle = grad;
    g.fillRect(x, y, CW, CH);
    // The rim strip the model uses for edges, a shade lighter.
    g.fillStyle = css(shade(colour, light + 0.08));
    g.globalAlpha = 0.6;
    g.fillRect(x + CW * 0.85, y + CH * 0.08, CW * 0.15, CH * 0.84);
    g.globalAlpha = 1;
  };
  swatch(0, 0, skin, 0.1, -0.12); // face
  swatch(1, 0, beard ? hair : shade(skin, -0.18), 0.05, -0.2); // brows + beard (a heavy jaw if he has none)
  swatch(0, 1, leather, 0.14, -0.3); // tunic
  swatch(1, 1, skin, 0.06, -0.14); // bare arms
  swatch(7, 2, shade(skin, -0.06), 0.04, -0.16); // hands
  swatch(6, 0, dark, 0.1, -0.25); // straps, bracers, belt
  swatch(2, 1, fur, 0.1, -0.22); // fur trim
  swatch(3, 0, '#e9dfc6', 0.05, -0.18); // bone (was iron)
  swatch(7, 0, '#5b4330', 0.1, -0.3); // fur collar
  swatch(7, 1, shade(dark, 0.08), 0.1, -0.25); // hide leggings
  swatch(3, 2, shade(skin, -0.04), 0.04, -0.16); // bare feet
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/* ================================================================ the body */

const CLIPS = {
  idle: 'Idle',
  run: 'Running_A',
  walk: 'Walking_A',
  kick: 'Unarmed_Melee_Attack_Kick',
  pass: 'Unarmed_Melee_Attack_Kick',
  tackle: 'Dodge_Forward',
  diveL: 'Dodge_Left',
  diveR: 'Dodge_Right',
  stun: 'Hit_A',
  cheer: 'Cheer',
  sad: 'Hit_B',
  catch: 'Block',
  throw: 'Throw'
};
const ONE_SHOT_SPEED = { kick: 1.5, pass: 1.7, tackle: 1.4, diveL: 1.3, diveR: 1.3, stun: 1.2, catch: 1.4, throw: 1.6, sad: 0.8, cheer: 1 };
const HIDE = /(_Hat|_Cape|Shield|Axe|Mug)/;

/**
 * A caveman. Resolves `{ model, update(dt, player, speed), head (Object3D for labels), dispose() }`.
 * @param {{ look: object, leather: string, dark: string, seed?: number }} spec
 */
export async function makeCaveman(spec) {
  const gltf = await loadBody('Barbarian').catch(() => null);
  if (!gltf) return proceduralCaveman(spec);
  try {
    return kaykitCaveman(gltf, spec);
  } catch (err) {
    console.warn('stoneball: falling back to the procedural caveman', err);
    return proceduralCaveman(spec);
  }
}

function kaykitCaveman(gltf, { look, leather, dark }) {
  const random = seeded(look.shag + look.wide * 3.1 + look.tall * 7.7);
  const model = SkeletonUtils.clone(gltf.scene);
  let image = null, base = null;
  model.traverse((o) => {
    if (o.isMesh && !base) {
      base = o.material;
      image = o.material.map?.image;
    }
  });
  if (!image) throw new Error('no atlas');
  const map = paintAtlas(image, { leather, dark, skin: look.skin, hair: look.hair, beard: look.beard });
  const material = base.clone();
  material.map = map;
  material.color.set('#ffffff');
  material.roughness = 0.85;
  material.metalness = 0;
  model.traverse((o) => {
    if (!o.isMesh) return;
    if (HIDE.test(o.name)) {
      o.visible = false;
      return;
    }
    o.material = material;
    o.castShadow = true;
    o.frustumCulled = false;
  });
  // Scale: the body (raw head-top at y 2.186) to HEIGHT less the hair on top, his build on top of that.
  const k = (HEIGHT - 0.13) / 2.186;
  model.scale.set(k * look.wide, k * look.tall, k * look.wide);
  model.updateMatrixWorld(true);
  const headBone = model.getObjectByName('head');
  // Hair grows in a measured space (the bind pose at scale MEASURED, where the
  // head spans x ±0.41, y 0.85…1.64, z −0.35…0.40), then hangs on the head bone.
  const hairMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  const hairGeo = hairGeometry({ c: new THREE.Vector3(0, 1.27, -0.02), r: new THREE.Vector3(0.44, 0.41, 0.41), hair: look.hair, shag: look.shag, beard: look.beard }, random);
  const hair = new THREE.Mesh(hairGeo, hairMat);
  hair.castShadow = true;
  const extras = [hairGeo, hairMat, map, material];
  const holder = new THREE.Group();
  holder.add(hair);
  if (look.shag > 0.62) {
    const bg = boneGeometry(0.42);
    const bm = new THREE.MeshStandardMaterial({ color: '#efe6cf', flatShading: true, roughness: 0.7 });
    const bone = new THREE.Mesh(bg, bm);
    bone.position.set(0, 1.74, -0.04);
    bone.rotation.set(0, 0.5, 0.18);
    bone.castShadow = true;
    holder.add(bone);
    extras.push(bg, bm);
  }
  // Measured space → raw model space → world → head-bone space.
  const unscale = new THREE.Matrix4().makeScale(1 / MEASURED, 1 / MEASURED, 1 / MEASURED);
  const toBone = new THREE.Matrix4().copy(headBone.matrixWorld).invert().multiply(model.matrixWorld).multiply(unscale);
  holder.applyMatrix4(toBone);
  headBone.add(holder);

  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  const anim = animator(mixer, actions);
  const head = new THREE.Object3D();
  head.position.set(0, 2.05 / k, 0);
  model.add(head);
  return {
    model,
    head,
    update(dt, p, speed) {
      anim(dt, p, speed);
      slidePose(model, p, dt);
    },
    dispose() {
      mixer.stopAllAction();
      for (const x of extras) x.dispose();
    }
  };
}

/**
 * A sliding tackle: the whole caveman leans back and goes in feet first, low along the grass,
 * then gets up again. (Turned within his facing, so the lean is always backwards.)
 */
function slidePose(model, p, dt) {
  model.rotation.order = 'YXZ';
  const want = p.slideT > 0 ? -1.15 : 0;
  model.rotation.x += (want - model.rotation.x) * Math.min(1, dt * (p.slideT > 0 ? 18 : 8));
  model.position.y = Math.max(0, -model.rotation.x) * 0.26;
}

/**
 * Plays the right clip for what a caveman is doing: idle or running by
 * speed, one-shots (kick, lunge, dive, stagger, catch, throw) when his act
 * counter ticks over, cheering or sulking while that lasts.
 */
function animator(mixer, actions) {
  let current = null, seen = -1, oneShot = null, oneShotT = 0;
  const play = (name, fade = 0.15, once = false, speed = 1) => {
    const a = actions[CLIPS[name]] ?? actions[name];
    if (!a) return false;
    if (current === a && !once) return true;
    a.reset();
    a.setEffectiveTimeScale(speed);
    a.setEffectiveWeight(1);
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = once;
    if (current && current !== a) current.crossFadeTo(a, fade, false);
    a.play();
    current = a;
    return true;
  };
  return (dt, p, speed) => {
    if (p.actN !== seen) {
      seen = p.actN;
      if (p.act && CLIPS[p.act]) {
        const loop = p.act === 'cheer';
        play(p.act, 0.1, !loop, ONE_SHOT_SPEED[p.act] ?? 1);
        oneShot = p.act;
        const clip = actions[CLIPS[p.act]]?.getClip();
        oneShotT = loop ? Infinity : clip ? clip.duration / (ONE_SHOT_SPEED[p.act] ?? 1) - 0.1 : 0.5;
      }
    }
    if (oneShot) {
      oneShotT -= dt;
      const over = oneShotT <= 0 || ((oneShot === 'cheer' || oneShot === 'sad') && p.act !== oneShot);
      // A long sulk holds its last frame; anything else hands back to running about.
      if (over && !(oneShot === 'sad' && p.act === 'sad')) oneShot = null;
    }
    // Sliding: still, the legs out (the lean is slidePose's).
    if (p.slideT > 0) {
      play('idle', 0.08);
      mixer.update(dt);
      return;
    }
    if (!oneShot) {
      if (speed > 0.6) {
        play('run', 0.18);
        current.setEffectiveTimeScale(Math.min(1.6, Math.max(0.7, speed / 6.2)));
      } else play('idle', 0.25);
    }
    mixer.update(dt);
  };
}

/* ================================================================ fallback */

const parts = { geos: null };
function fallbackGeos() {
  if (parts.geos) return parts.geos;
  parts.geos = {
    leg: new THREE.CapsuleGeometry(0.1, 0.22, 3, 6),
    arm: new THREE.CapsuleGeometry(0.085, 0.3, 3, 6),
    torso: new THREE.IcosahedronGeometry(0.32, 1).scale(1, 1.08, 0.85),
    trim: new THREE.TorusGeometry(0.29, 0.06, 4, 10).rotateX(Math.PI / 2),
    head: new THREE.IcosahedronGeometry(0.42, 2).scale(1, 0.95, 0.95),
    eye: new THREE.SphereGeometry(0.045, 6, 4),
    nose: new THREE.IcosahedronGeometry(0.07, 0),
    brow: new THREE.BoxGeometry(0.16, 0.05, 0.06)
  };
  return parts.geos;
}

/** A chibi caveman out of primitives, animated by hand: legs swing, arms pump, a bob. */
export function proceduralCaveman({ look, leather, dark }) {
  const random = seeded(look.shag + 0.37);
  const G = fallbackGeos();
  const flat = (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85 });
  const mats = { skin: flat(look.skin), hide: flat(leather), dark: flat(dark), fur: flat(css(col(leather).lerp(col('#efe2c4'), 0.55))), black: flat('#1a1410') };
  const model = new THREE.Group();
  const body = new THREE.Group();
  model.add(body);
  const mesh = (g, m, x, y, z) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    return o;
  };
  const legs = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.13, 0.42, 0);
    pivot.add(mesh(G.leg, mats.skin, 0, -0.2, 0));
    body.add(pivot);
    return pivot;
  });
  body.add(mesh(G.torso, mats.hide, 0, 0.66, 0));
  body.add(mesh(G.trim, mats.fur, 0, 0.42, 0));
  const arms = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.33, 0.82, 0);
    const a = mesh(G.arm, mats.skin, 0, -0.2, 0);
    pivot.add(a);
    pivot.rotation.z = s * 0.25;
    body.add(pivot);
    return pivot;
  });
  const headG = new THREE.Group();
  headG.position.set(0, 1.3, 0);
  headG.add(mesh(G.head, mats.skin, 0, 0, 0));
  for (const s of [-1, 1]) {
    headG.add(mesh(G.eye, mats.black, s * 0.14, 0.02, 0.37));
    headG.add(mesh(G.brow, mats.black, s * 0.14, 0.11, 0.37));
  }
  headG.add(mesh(G.nose, mats.skin, 0, -0.06, 0.42));
  const hairGeo = hairGeometry({ c: new THREE.Vector3(0, 0, -0.02), r: new THREE.Vector3(0.44, 0.42, 0.42), hair: look.hair, shag: look.shag, beard: look.beard, face: 0.7 }, random);
  const hairMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  headG.add(mesh(hairGeo, hairMat, 0, 0, 0));
  body.add(headG);
  model.scale.set(look.wide, look.tall, look.wide);
  const head = new THREE.Object3D();
  head.position.set(0, 2.05, 0);
  model.add(head);
  let phase = 0, seen = -1, shot = null, shotT = 0;
  return {
    model,
    head,
    procedural: true,
    update(dt, p, speed) {
      if (p.actN !== seen) {
        seen = p.actN;
        shot = p.act;
        shotT = 0.45;
      }
      shotT -= dt;
      if (shotT <= 0 && shot !== 'cheer' && shot !== 'sad') shot = null;
      if ((shot === 'cheer' || shot === 'sad') && p.act !== shot) shot = null;
      phase += dt * (speed > 0.6 ? 2.2 * Math.max(0.8, speed / 4) : 1.2);
      const swing = speed > 0.6 ? Math.sin(phase * Math.PI) * 0.9 : 0;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      arms[0].rotation.x = -swing * 0.8;
      arms[1].rotation.x = swing * 0.8;
      body.position.y = speed > 0.6 ? Math.abs(Math.sin(phase * Math.PI)) * 0.08 : Math.sin(phase) * 0.01;
      body.rotation.x = 0;
      if (shot === 'kick' || shot === 'pass') legs[1].rotation.x = -1.3 * Math.sin(Math.max(0, shotT) / 0.45 * Math.PI);
      if (shot === 'tackle' || shot === 'diveL' || shot === 'diveR') body.rotation.x = 0.9;
      if (shot === 'cheer') {
        arms[0].rotation.x = arms[1].rotation.x = Math.PI;
        body.position.y = Math.abs(Math.sin(phase * 3)) * 0.3;
      }
      if (shot === 'sad') body.rotation.x = 0.35;
      if (p.slideT > 0) {
        legs[0].rotation.x = legs[1].rotation.x = -1.2;
        arms[0].rotation.x = arms[1].rotation.x = 0.6;
      }
      slidePose(model, p, dt);
    },
    dispose() {
      for (const m of Object.values(mats)) m.dispose();
      hairGeo.dispose();
      hairMat.dispose();
    }
  };
}
