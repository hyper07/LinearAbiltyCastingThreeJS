/**
 * Putting Gloamreach's Quaternius people together (folk.js says what with):
 *
 *  - the body's head (its modelled face, eyes and brows; the body under the
 *    clothes is cut away, as the packs advise), the outfit's pieces, the
 *    hairstyle and beard — every piece moved onto the body's skeleton by bone
 *    name, then merged per material (a few draws a person);
 *  - the packs' own textures and normal maps kept, with the game's rim and
 *    skin light-wrap; hair, brows and beard coloured; the skin toned (head
 *    and arms matched first, as their textures differ); outfit textures
 *    swapped for the pack's alternates;
 *  - bones renamed to the names the rest of the game uses (Hips, LeftHand…),
 *    so gear, the fighter's split body and footsteps work unchanged; gear
 *    anchors under the bones turn the polyfork frames the gear was made for
 *    onto these bones;
 *  - clips from the Universal Animation Library (idle, walk, jog, sprint,
 *    jumps, talk, sit…), the rest borrowed from Mesh2Motion like everyone's.
 *
 *   const t = await loadFolk(folkRecipe('brann', { sex: 'male' }), { detail, borrow });
 *   if (!t) …the polyfork template instead (the packs aren't there)
 *
 * The result is a template like actors.js loadTemplate's (Actor, FighterActor
 * and GearRig take it as is).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { characterLoader, retargetClip } from '../library/characters.js';
import { characterMaterial, bakeBorrowed, measureStrides, loadFile, polyUrl, MAX_PARTS } from './actors.js';
import { FOLK_FILES, folkFiles, recipeKey, partName, gameBoneName, sourceBoneMap, ATLAS, TILES, tileFor, atlasUv, robeWeights } from './folk.js';

// The base bodies' glTF ask for two normal maps under names the pack doesn't have ("T_Eye_Normal_png.png"): use the real files.
const manager = new THREE.LoadingManager();
manager.setURLModifier((u) => u.replace(/(T_(?:Hair_\d|Eye)_Normal)_png\.png$/, '$1.png'));
const loader = characterLoader(manager);
const sources = new Map();
/** A source glTF, loaded once (never changed: pieces are copied out of it). */
function source(url) {
  if (!sources.has(url)) sources.set(url, loader.loadAsync(encodeURI(url)).catch(() => null));
  return sources.get(url);
}
const textures = new Map();
function texture(url) {
  if (!textures.has(url)) {
    textures.set(url, new THREE.TextureLoader().loadAsync(encodeURI(url)).then((t) => {
      t.flipY = false;
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }).catch(() => null));
  }
  return textures.get(url);
}

/** Whether the packs are there (one probe, remembered). */
let probe = null;
export function folkAvailable() {
  probe ??= fetch(encodeURI(FOLK_FILES.animations), { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
  return probe;
}

/** The mean colour of a texture (for matching skin across textures, and for recolouring with shading kept). */
const means = new WeakMap();
function meanColour(tex) {
  if (!tex?.image) return null;
  if (means.has(tex)) return means.get(tex);
  let out = null;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(tex.image, 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data;
    let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      r += d[i];
      gg += d[i + 1];
      b += d[i + 2];
      n++;
    }
    // sRGB means, to linear.
    if (n) out = new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace);
  } catch {
    out = null;
  }
  means.set(tex, out);
  return out;
}
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/** Skinned meshes of a glTF scene with their material names (a multi-material mesh comes as several). */
function skinnedOf(root) {
  const out = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.isSkinnedMesh) out.push({ mesh: o, name: o.parent?.isGroup && !o.parent.isScene && /_\d+$/.test(o.name) ? o.parent.name : o.name, material: o.material });
  });
  return out;
}

const KEEP = ['position', 'normal', 'uv', 'skinIndex', 'skinWeight'];

/** A piece's geometry on the body's skeleton: skin indices by bone name, only the attributes all pieces share, plus aPart. */
function pieceGeometry(mesh, boneIndex, part, cut = null) {
  const src = mesh.geometry;
  const g = new THREE.BufferGeometry();
  for (const k of KEEP) {
    const a = src.attributes[k];
    if (!a) continue;
    if (k === 'skinIndex') {
      const map = mesh.skeleton.bones.map((b) => boneIndex.get(b.name) ?? 0);
      const arr = new Uint16Array(a.count * 4);
      for (let i = 0; i < a.count; i++) for (let j = 0; j < 4; j++) arr[i * 4 + j] = map[a.getComponent(i, j)] ?? 0;
      g.setAttribute(k, new THREE.Uint16BufferAttribute(arr, 4));
    } else {
      const arr = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) arr[i * a.itemSize + j] = a.getComponent(i, j);
      g.setAttribute(k, new THREE.BufferAttribute(arr, a.itemSize));
    }
  }
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
  const n = src.attributes.position.count;
  g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(n).fill(part), 1));
  g.setAttribute('aCape', new THREE.BufferAttribute(new Float32Array(n), 1));
  let index = src.index ? Array.from(src.index.array) : Array.from({ length: n }, (_, i) => i);
  if (cut) index = cut(index, src);
  g.setIndex(index);
  return g;
}

/** Keep only the triangles carried by the head and neck (the body under the clothes would show through them). */
function headOnly(bones) {
  const keep = new Set(bones.map((b, i) => (/^(Head|head|neck_01)$/.test(b.name) ? i : -1)).filter((i) => i >= 0));
  return (index, src) => {
    const si = src.attributes.skinIndex;
    const sw = src.attributes.skinWeight;
    const dom = (v) => {
      let best = 0;
      let w = -1;
      for (let k = 0; k < 4; k++) if (sw.getComponent(v, k) > w) [w, best] = [sw.getComponent(v, k), si.getComponent(v, k)];
      return best;
    };
    const out = [];
    for (let t = 0; t < index.length; t += 3) if (keep.has(dom(index[t])) && keep.has(dom(index[t + 1])) && keep.has(dom(index[t + 2]))) out.push(index[t], index[t + 1], index[t + 2]);
    return out;
  };
}

/** UAL clips the game uses, by its own names (the rest come from Mesh2Motion). */
const UAL_CLIPS = { Idle: 'Idle_Loop', Walk: 'Walk_Loop', Run: 'Jog_Fwd_Loop', Sprint: 'Sprint_Loop', JumpStart: 'Jump_Start', JumpAir: 'Jump_Loop', JumpLand: 'Jump_Land', Talk: 'Idle_Talking_Loop', SitChair: 'Sitting_Idle_Loop', SitTalk: 'Sitting_Talking_Loop', Interact: 'Interact', Roll: 'Roll', Hit: 'Hit_Chest', Die: 'Death01', FightIdle: 'Sword_Idle' };
const IN_PLACE = new Set(['Roll', 'Die']);

const templates = new Map();

/** A person's template from a recipe; null when the packs (or a piece) are missing. */
export function loadFolk(recipe, { detail = null, borrow = [], rim = 0.6 } = {}) {
  const key = recipeKey(recipe);
  if (!templates.has(key)) templates.set(key, build(recipe, { detail, rim }).catch((e) => {
    console.warn('folk: falling back to polyfork', e?.message ?? e);
    return null;
  }));
  return templates.get(key).then(async (t) => {
    if (!t) return null;
    const missing = borrow.filter((n) => !t.clips.some((c) => c.name === n));
    if (missing.length) t.clips.push(...(await bakeBorrowed(t.gltf, missing)));
    return t;
  });
}

async function build(recipe, { detail, rim }) {
  if (!(await folkAvailable())) return null;
  const files = folkFiles(recipe);
  const loaded = await Promise.all(files.map(source));
  if (loaded.some((x) => !x)) return null;
  const [bodyG, outfitG] = loaded;
  const hairG = recipe.hair !== 'none' ? await source(FOLK_FILES.hair(recipe.hair)) : null;
  const beardG = recipe.beard ? await source(FOLK_FILES.hair('Beard')) : null;
  const rangerG = recipe.cowl ? await source(FOLK_FILES.outfit(recipe.sex, 'ranger')) : null;
  const ual = await source(FOLK_FILES.animations);
  const variantTex = recipe.variant > 1 ? await texture(FOLK_FILES.outfitTexture(recipe.outfit, recipe.variant)) : null;

  // The body, copied: its skeleton is everyone's.
  const scene = SkeletonUtils.clone(bodyG.scene);
  const bodyPieces = skinnedOf(scene);
  const base = bodyPieces.find((p) => /SuperHero/i.test(p.name)) ?? bodyPieces[0];
  const skeleton = base.mesh.skeleton;
  const boneIndex = new Map(skeleton.bones.map((b, i) => [b.name, i]));
  const pieces = [];
  for (const p of bodyPieces) pieces.push({ ...p, cut: p === base ? headOnly(skeleton.bones) : null });
  for (const g of [outfitG, hairG, beardG].filter(Boolean)) for (const p of skinnedOf(g.scene)) pieces.push({ ...p, cut: null });
  // A cowl: the ranger's hood, worn over any outfit (as a hood, or a shawl's top).
  if (rangerG) for (const p of skinnedOf(rangerG.scene)) if (/Hood/i.test(p.name)) pieces.push({ ...p, cut: null, cowl: true });

  // Garments in order (aPart).
  const parts = [];
  const partOf = (name) => {
    let i = parts.indexOf(name);
    if (i < 0 && parts.length < MAX_PARTS) i = parts.push(name) - 1;
    return Math.max(0, i);
  };
  partOf('body');
  const skin = new THREE.Color(recipe.skin);
  const hair = new THREE.Color(recipe.hairColour);
  const headMean = meanColour(base.material.map);
  /** A piece's colour: skin toned (arms matched to the head first), hair, a dyed cowl or robe, the rest as painted. */
  const tintFor = (p, part) => {
    if (part === 'body') {
      const mean = meanColour(p.material.map) ?? headMean;
      const k = headMean && mean ? [headMean.r / Math.max(mean.r, 0.02), headMean.g / Math.max(mean.g, 0.02), headMean.b / Math.max(mean.b, 0.02)] : [1, 1, 1];
      const tone = headMean ? [skin.r / Math.max(headMean.r, 0.02), skin.g / Math.max(headMean.g, 0.02), skin.b / Math.max(headMean.b, 0.02)] : [1, 1, 1];
      // Toned only part way, so the texture's own warmth and shading stay.
      return new THREE.Color(...k.map((x, i) => Math.min(2.2, x * (0.35 + 0.65 * tone[i]))));
    }
    if (/hair|brows|beard/.test(part)) return hair.clone().multiplyScalar(part === 'brows' ? 0.75 : 1);
    if (p.cowl && recipe.cowl) return new THREE.Color(recipe.cowl);
    // An NPC's outfit, shaded a little their own way (heroes' are recoloured by their gear instead).
    if (recipe.atlas && recipe.shade && /^garment-/.test(part)) return new THREE.Color(recipe.shade);
    return new THREE.Color(1, 1, 1);
  };
  const named = (p) => {
    const n = partName(p.name, p.material?.name ?? '');
    return p.cowl ? 'garment-cowl' : n;
  };
  // No hood unless worn; no trousers under a robe (they'd show through it).
  const keep = (p, name) => !(name === 'garment-hood' && !recipe.hood) && !(recipe.robe && name === 'garment-leggings');
  const robe = recipe.robe ? robeGeometry(skeleton, base.mesh, recipe) : null;
  const partLum = [];
  const parent = base.mesh.parent;
  const bind = base.mesh.bindMatrix.clone();

  if (recipe.atlas) {
    // One material for every NPC: all pieces on the shared atlas, their colours in the vertices.
    const atlas = folkAtlas({ detail, rim });
    const geos = [];
    for (const p of pieces) {
      const name = named(p);
      if (!keep(p, name)) continue;
      const part = partOf(name);
      // A cowl is plain dyed cloth (the ranger's green hood won't dye to every colour).
      const tile = p.cowl ? TILES.indexOf('cloth') : tileFor(p.material?.name ?? '', recipe);
      atlas.draw(tile, p.cowl ? null : p.material, tile === TILES.indexOf(`${recipe.outfit}-${recipe.variant}`) ? variantTex : null);
      const g = pieceGeometry(p.mesh, boneIndex, part, p.cut);
      toAtlas(g, tile, tintFor(p, name));
      geos.push(g);
    }
    if (robe) {
      atlas.draw(TILES.indexOf('cloth'), null);
      toAtlas(robe, TILES.indexOf('cloth'), null);
      robe.attributes.aPart.array.fill(partOf('garment-robe'));
      geos.push(robe);
    }
    for (const p of bodyPieces) p.mesh.removeFromParent();
    const mesh = new THREE.SkinnedMesh(mergeGeometries(geos, false), atlas.material);
    Object.assign(mesh, { castShadow: true, receiveShadow: true, frustumCulled: false, name: 'folk-atlas' });
    parent.add(mesh);
    mesh.bind(skeleton, bind);
  } else {
    // Heroes: the packs' full-size textures, a material per pack material (gearRig recolours their garments).
    const mats = new Map();
    const materialFor = (p, part) => {
      const key = p.cowl ? 'cowl' : p.material;
      if (mats.has(key)) return mats.get(key);
      const m = characterMaterial(p.material, { detail, rim, textured: true, skin: part === 'body' ? 1 : 0 });
      m.color.copy(tintFor(p, part));
      if (p.cowl) {
        // Plain matte cloth (the ranger's texture and metal map belong to its green hood).
        Object.assign(m, { map: null, roughnessMap: null, metalnessMap: null, roughness: 0.85, metalness: 0 });
        // A hood is nearly all grazing angles round the face: the key light's rim would wash a dark dye out.
        m.userData.char.uRim.value = 0.1;
      }
      if (/hair|brows|beard/.test(part)) m.roughness = 0.55;
      if (part === 'eyes') m.roughness = 0.08;
      if (!/^(body|eyes|brows)$|hair|beard|cowl/.test(part) && variantTex && p.material.map) m.map = variantTex;
      mats.set(key, m);
      return m;
    };
    const groups = new Map();
    for (const p of pieces) {
      const name = named(p);
      if (!keep(p, name)) continue;
      const part = partOf(name);
      const m = materialFor(p, name);
      if (!groups.has(m)) groups.set(m, []);
      groups.get(m).push(pieceGeometry(p.mesh, boneIndex, part, p.cut));
      partLum[part] ??= (() => {
        const mean = meanColour(m.map);
        return mean ? Math.max(0.05, lum(mean) * lum(m.color)) : 0.5;
      })();
    }
    if (robe) {
      // The robe: our own cloth (vertex colours, the woven relief), dyed by the game like any robe.
      const part = partOf('garment-robe');
      robe.attributes.aPart.array.fill(part);
      const m = characterMaterial(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }), { detail, rim });
      groups.set(m, [robe]);
      partLum[part] = lum(new THREE.Color(recipe.robe));
    }
    for (const p of bodyPieces) p.mesh.removeFromParent();
    for (const [m, geos] of groups) {
      const mesh = new THREE.SkinnedMesh(mergeGeometries(geos, false), m);
      Object.assign(mesh, { castShadow: true, receiveShadow: true, frustumCulled: false, name: `folk-${m.name || 'robe'}` });
      parent.add(mesh);
      mesh.bind(skeleton, bind);
    }
  }
  // The game's bone names.
  for (const b of skeleton.bones) b.name = gameBoneName(b.name);
  scene.updateMatrixWorld(true);

  // Clips: the Universal Animation Library's first (same rig), on the game's names.
  const names = skeleton.bones.map((b) => b.name);
  const map = sourceBoneMap(['Hips', ...names.filter((n) => n !== 'Hips')], { head: 'Head' });
  const clips = [];
  const wanted = { ...UAL_CLIPS, ...(recipe.idle ? { Idle: recipe.idle } : {}) };
  for (const [name, from] of Object.entries(wanted)) {
    const clip = ual.animations.find((a) => a.name === from);
    if (!clip) continue;
    const baked = retargetClip(scene, ual.scene, clip, map, { name });
    if (IN_PLACE.has(name)) for (const tr of baked.tracks) if (tr.name.endsWith('.position')) for (let i = 0; i < tr.values.length; i += 3) [tr.values[i], tr.values[i + 2]] = [tr.values[0], tr.values[2]];
    clips.push(baked);
  }
  const gltf = { scene, animations: [] };
  const box = new THREE.Box3().setFromObject(scene, true);
  const natural = box.max.y - box.min.y;
  // Helmets were fitted to polyfork's big heads: on these smaller, rounder ones they sit a little higher and larger.
  const t = { id: recipeKey(recipe), gltf, clips, natural, scale: 1, parts, partLum: parts.map((_, i) => partLum[i] ?? 0.5), folk: recipe, stoop: recipe.stoop ? stoopAxes(scene, recipe.stoop) : null, gearTune: { helmUp: 0.24, helmScale: 1.14, helmBack: -0.02 } };
  t.strides = measureStrides(t);
  // Gear anchors: the polyfork frames the gear was made for, turned onto these bones.
  const ref = await loadFile(polyUrl('human-knight-base'));
  if (ref) addGearAnchors(scene, ref.scene);
  return t;
}

/* ------------------------------------------------------------------ gear anchors */

/** Bones gear goes on, and the child each points to (null: use the parent's direction). */
const GEAR_BONES = {
  Head: null, Neck: 'Head', Spine2: 'Neck',
  LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', LeftHand: null, RightArm: 'RightForeArm', RightForeArm: 'RightHand', RightHand: null,
  LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase'
};
const DIRECTION_FROM = { LeftHand: ['LeftForeArm', 'LeftHand'], RightHand: ['RightForeArm', 'RightHand'] };

/** Rest-pose world rotations and positions of a rig's bones (from its first skinned mesh's bind). */
function restOf(root) {
  let sk = null;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!sk && o.isSkinnedMesh) sk = o;
  });
  const out = new Map();
  if (!sk) return out;
  sk.skeleton.bones.forEach((b, i) => {
    const m = sk.matrixWorld.clone().multiply(sk.bindMatrix).multiply(sk.skeleton.boneInverses[i].clone().invert());
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    m.decompose(p, q, new THREE.Vector3());
    out.set(b.name, { p, q });
  });
  return out;
}

/** An anatomical frame for a bone: x along the bone, z toward the front (or up, for bones pointing forward). */
function frameOf(rest, name) {
  const pair = DIRECTION_FROM[name] ?? (GEAR_BONES[name] ? [name, GEAR_BONES[name]] : null);
  if (!pair) return new THREE.Quaternion();
  const a = rest.get(pair[0]);
  const b = rest.get(pair[1]);
  if (!a || !b) return new THREE.Quaternion();
  const x = b.p.clone().sub(a.p).normalize();
  const ref = Math.abs(x.z) > 0.85 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  const z = ref.sub(x.clone().multiplyScalar(ref.dot(x))).normalize();
  const y = z.clone().cross(x);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/**
 * Put an anchor (`<bone>_gear`) under each gear bone of `scene` whose frame
 * is the polyfork reference rig's bone frame, matched anatomically: gear
 * placed in the anchor sits on this body as it did on polyfork's.
 */
export function addGearAnchors(scene, refScene) {
  const mine = restOf(scene);
  const ref = restOf(refScene);
  for (const name of Object.keys(GEAR_BONES)) {
    const bone = scene.getObjectByName(name);
    const u = mine.get(name);
    const p = ref.get(name);
    if (!bone || !u || !p) continue;
    // A = Wu⁻¹ · Fu · Fp⁻¹ · Wp
    const a = u.q.clone().invert().multiply(frameOf(mine, name)).multiply(frameOf(ref, name).invert()).multiply(p.q);
    const anchor = new THREE.Object3D();
    anchor.name = `${name}_gear`;
    anchor.quaternion.copy(a);
    // Undo the bone's own scale (exports scale the armature), so gear sizes stay in metres of the model.
    const s = new THREE.Vector3();
    bone.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
    const rs = new THREE.Vector3();
    scene.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), rs);
    anchor.scale.set(rs.x / s.x, rs.y / s.y, rs.z / s.z);
    bone.add(anchor);
  }
}

/* ------------------------------------------------------------------ the atlas */

/** Move a piece's uvs into its atlas tile, and give it a colour (its tint; null keeps the colour it has). */
function toAtlas(g, tile, tint) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const [u, v] = atlasUv(uv.getX(i), uv.getY(i), tile);
    uv.setXY(i, u, v);
  }
  if (tint) {
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([tint.r, tint.g, tint.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  return g;
}

let bank = null;

/**
 * Every NPC's textures on one set of atlases (colour, normal, roughness-metal)
 * and one material: tiles are drawn the first time a person needs them.
 */
export function folkAtlas({ detail = null, rim = 0.6 } = {}) {
  if (bank) return bank;
  const { cols, rows, cell, small, pad } = ATLAS;
  const canvas = (s) => {
    const c = document.createElement('canvas');
    c.width = cols * s;
    c.height = rows * s;
    return c;
  };
  const colour = canvas(cell);
  const normal = canvas(small);
  const orm = canvas(small);
  normal.getContext('2d').fillStyle = 'rgb(128,128,255)';
  normal.getContext('2d').fillRect(0, 0, normal.width, normal.height);
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.flipY = false;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const maps = { colour: tex(colour, true), normal: tex(normal, false), orm: tex(orm, false) };
  const src = new THREE.MeshStandardMaterial({ map: maps.colour, normalMap: maps.normal, roughnessMap: maps.orm, metalnessMap: maps.orm, roughness: 1, metalness: 1, vertexColors: true });
  src.name = 'folk-atlas';
  const material = characterMaterial(src, { detail, rim, textured: true, atlas: true });
  const drawn = new Set();
  /** Draw an image into tile `i` of a canvas: stretched to the whole cell (so edges bleed outward), then inset by the padding. */
  const put = (c, s, i, img) => {
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    const x = (i % cols) * s;
    const y = Math.floor(i / cols) * s;
    const p = (pad * s) / cell;
    g.drawImage(img, x, y, s, s);
    g.drawImage(img, x + p, y + p, s - 2 * p, s - 2 * p);
    return [x, y];
  };
  const fill = (c, s, i, style, op = 'source-over') => {
    const g = c.getContext('2d');
    g.globalCompositeOperation = op;
    g.fillStyle = style;
    g.fillRect((i % cols) * s, Math.floor(i / cols) * s, s, s);
    g.globalCompositeOperation = 'source-over';
  };
  const ch = (x) => Math.round(Math.max(0, Math.min(1, x)) * 255);
  bank = {
    material,
    maps,
    /** Tile `i` from a pack material (and an alternate colour texture); 'cloth' when there's no material. */
    draw(i, m, override = null) {
      if (drawn.has(i) || i < 0) return;
      drawn.add(i);
      if (!m) {
        // Plain undyed cloth for robes: a soft weave in light grey, matte.
        const g = colour.getContext('2d');
        const x0 = (i % cols) * cell;
        const y0 = Math.floor(i / cols) * cell;
        g.fillStyle = '#d8d4cc';
        g.fillRect(x0, y0, cell, cell);
        for (let k = 0; k < cell; k += 4) {
          g.fillStyle = `rgba(0,0,0,${0.03 + ((k * 7) % 5) * 0.008})`;
          g.fillRect(x0 + k, y0, 2, cell);
          g.fillRect(x0, y0 + k, cell, 1);
        }
        fill(orm, small, i, `rgb(255,${ch(0.88)},0)`);
      } else {
        const name = m.name ?? '';
        const img = (override ?? m.map)?.image;
        if (img) put(colour, cell, i, img);
        else fill(colour, cell, i, `#${m.color.getHexString()}`);
        if (m.normalMap?.image) put(normal, small, i, m.normalMap.image);
        // Roughness in green, metal in blue (glTF's layout), times the material's factors.
        const rough = /Eyes/.test(name) ? 0.1 : /Hair/.test(name) ? 0.6 : m.roughness ?? 1;
        const metal = m.metalness ?? 0;
        if (m.roughnessMap?.image && !/Eyes|Hair/.test(name)) {
          put(orm, small, i, m.roughnessMap.image);
          fill(orm, small, i, `rgb(255,${ch(rough)},${ch(metal)})`, 'multiply');
        } else fill(orm, small, i, `rgb(255,${ch(rough)},${ch(metal)})`);
      }
      maps.colour.needsUpdate = true;
      maps.normal.needsUpdate = true;
      maps.orm.needsUpdate = true;
    }
  };
  return bank;
}

/* ------------------------------------------------------------------ robes and stooping */

/**
 * A long robe from the waist to the ankles, flaring toward the hem, with a
 * darker hem band and a trim at the waist; skinned to the hips and, lower
 * down, each side's thigh and shin (folk.js robeWeights), so it swings
 * with the legs. In the mesh's bind space, on its Unreal-named bones.
 */
function robeGeometry(skeleton, mesh, recipe) {
  const index = new Map(skeleton.bones.map((b, i) => [b.name, i]));
  const inv = mesh.bindMatrixInverse;
  const at = (name) => {
    const i = index.get(name);
    return i === undefined ? null : new THREE.Vector3().setFromMatrixPosition(inv.clone().multiply(skeleton.boneInverses[i].clone().invert()));
  };
  const pelvis = at('pelvis');
  const tl = at('thigh_l');
  const tr = at('thigh_r');
  const fl = at('foot_l');
  if (!pelvis || !tl || !tr || !fl) return null;
  const cx = (tl.x + tr.x) / 2;
  const hx = Math.abs(tl.x - tr.x) / 2 + 0.07;
  const side = Math.sign(tl.x - cx) || 1;
  const top = pelvis.y + 0.07;
  const hem = fl.y + 0.02;
  const rows = 12;
  const segs = 32;
  const base = new THREE.Color(recipe.robe);
  const trim = base.clone().lerp(new THREE.Color('#e8d8a8'), 0.45);
  const pos = [];
  const nrm = [];
  const uvs = [];
  const col = [];
  const si = [];
  const sw = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const flare = t * t * 0.75 + t * 0.2;
    const rx = hx + flare * 0.15;
    const rz = 0.12 + flare * 0.17;
    const y = top + (hem - top) * t;
    const c = t < 0.07 ? trim : t > 0.9 ? base.clone().multiplyScalar(0.62) : base;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const x = Math.sin(a) * rx;
      const z = Math.cos(a) * rz + (t * 0.02);
      pos.push(cx + x, y, pelvis.z + z);
      const n = new THREE.Vector3(Math.sin(a) / rx, 0.25 * flare, Math.cos(a) / rz).normalize();
      nrm.push(n.x, n.y, n.z);
      uvs.push(j / segs, t);
      col.push(c.r, c.g, c.b);
      const s = Math.max(0, Math.min(1, 0.5 + ((x * side) / rx) * 0.75));
      const w = robeWeights(t, s);
      for (let k = 0; k < 4; k++) {
        si.push(index.get(w[k]?.[0]) ?? 0);
        sw.push(w[k]?.[1] ?? 0);
      }
    }
  }
  const idx = [];
  for (let r = 0; r < rows; r++) for (let j = 0; j < segs; j++) {
    const a = r * (segs + 1) + j;
    const b = a + segs + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(pos.length / 3), 1));
  g.setAttribute('aCape', new THREE.BufferAttribute(new Float32Array(pos.length / 3), 1));
  g.setIndex(idx);
  return g;
}

/** For a stoop: each spine bone's local axis that is the body's left-right in the rest pose (bend about it). */
function stoopAxes(scene, angle) {
  const rest = restOf(scene);
  const axes = {};
  for (const name of ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head']) {
    const r = rest.get(name);
    if (r) axes[name] = new THREE.Vector3(1, 0, 0).applyQuaternion(r.q.clone().invert()).normalize();
  }
  return { angle, axes };
}
