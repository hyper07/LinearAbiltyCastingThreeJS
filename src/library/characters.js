/**
 * Load and animate the library's rigged characters and creatures (the
 * `rigged` source: Mesh2Motion, Gobkit, VRM avatars, KayKit, the three.js
 * examples). Which to pick and why: knowledge/assets-guide.md.
 *
 *   const loader = characterLoader();
 *   const gltf = await loader.loadAsync(catalog.url(model.file));
 *   const body = SkeletonUtils.clone(gltf.scene);          // one per unit
 *   const clips = await rigClips(loader, catalog, model, ['Idle', 'Walk']);  // Mesh2Motion
 *   const named = segmentClips(gltf.animations[0], model.segments);        // Gobkit
 *   const walk = retargetClip(teddy, m2mHuman, clips.Walk, BONE_MAPS.mixamo); // any humanoid
 *
 * Mesh2Motion files are meshopt-compressed, so they need this loader (or any
 * GLTFLoader given `setMeshoptDecoder(MeshoptDecoder)`).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/** A GLTFLoader that also reads meshopt-compressed files. */
export function characterLoader(manager) {
  return new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
}

/**
 * Clips that ship as separate files on a shared rig (catalog.rigs[model.rig]).
 * Returns { name: AnimationClip } for the names asked for (all when omitted).
 */
export async function rigClips(loader, catalog, model, names = null) {
  const list = catalog.rigs?.[model.rig]?.clips ?? [];
  const wanted = names ? list.filter((c) => names.includes(c.name)) : list;
  const out = {};
  await Promise.all(
    wanted.map(async (c) => {
      const clip = (await loader.loadAsync(catalog.url(c.file))).animations[0];
      if (clip) out[c.name] = Object.assign(clip, { name: c.name });
    })
  );
  return out;
}

/** Cut one baked track into named clips by frame ranges, e.g. Gobkit's { idle: [0, 29], walk: [90, 119] }. */
export function segmentClips(clip, segments, fps = 24) {
  const out = {};
  for (const [name, [start, end]] of Object.entries(segments ?? {})) out[name] = THREE.AnimationUtils.subclip(clip, name, start, end + 1, fps);
  return out;
}

/**
 * Expressions of a VRM 0.x avatar loaded as plain glTF (no three-vrm needed):
 * { blink: [{ mesh, index, weight }], a: […], … } — set
 * `mesh.morphTargetInfluences[index] = weight * amount` to show one.
 */
export function vrmExpressions(gltf) {
  const groups = gltf.parser.json.extensions?.VRM?.blendShapeMaster?.blendShapeGroups ?? [];
  const meshesByIndex = new Map();
  gltf.scene.traverse((o) => {
    const index = gltf.parser.associations.get(o)?.meshes;
    if (o.isMesh && index !== undefined) (meshesByIndex.get(index) ?? meshesByIndex.set(index, []).get(index)).push(o);
  });
  const out = {};
  for (const g of groups) {
    const key = (g.presetName && g.presetName !== 'unknown' ? g.presetName : g.name).toLowerCase();
    out[key] = (g.binds ?? []).flatMap((b) => (meshesByIndex.get(b.mesh) ?? []).map((mesh) => ({ mesh, index: b.index, weight: b.weight / 100 })));
  }
  return out;
}

/** Show an expression from vrmExpressions() at 0..1. */
export function setExpression(expressions, name, amount) {
  for (const { mesh, index, weight } of expressions[name] ?? []) if (mesh.morphTargetInfluences) mesh.morphTargetInfluences[index] = weight * amount;
}

const sides = (m, l, r) =>
  Object.fromEntries(Object.entries(m).flatMap(([t, s]) => [[t.replace('*', l[0]), s.replace('*', l[1])], [t.replace('*', r[0]), s.replace('*', r[1])]]));

/**
 * Bone maps, target name → Mesh2Motion human name (the Unreal-mannequin names
 * Quaternius' Universal Animation Library uses too).
 */
export const BONE_MAPS = {
  /** Mixamo names: X Bot, Soldier, Michelle, Tripo/Meshy humanoids, and the 100Avatars VRMs. */
  mixamo: {
    'mixamorig:Hips': 'pelvis', 'mixamorig:Spine': 'spine_01', 'mixamorig:Spine1': 'spine_02', 'mixamorig:Spine2': 'spine_03', 'mixamorig:Neck': 'neck_01', 'mixamorig:Head': 'head',
    ...sides({ 'mixamorig:*Shoulder': 'clavicle_*', 'mixamorig:*Arm': 'upperarm_*', 'mixamorig:*ForeArm': 'lowerarm_*', 'mixamorig:*Hand': 'hand_*', 'mixamorig:*UpLeg': 'thigh_*', 'mixamorig:*Leg': 'calf_*', 'mixamorig:*Foot': 'foot_*', 'mixamorig:*ToeBase': 'ball_*' }, ['Left', 'l'], ['Right', 'r'])
  },
  /** KayKit adventurers and skeletons. */
  kaykit: {
    hips: 'pelvis', spine: 'spine_01', chest: 'spine_03', head: 'head',
    ...sides({ 'upperarm.*': 'upperarm_*', 'lowerarm.*': 'lowerarm_*', 'wrist.*': 'hand_*', 'upperleg.*': 'thigh_*', 'lowerleg.*': 'calf_*', 'foot.*': 'foot_*', 'toes.*': 'ball_*' }, ['l', 'l'], ['r', 'r'])
  }
};

/** Bones by name. GLTFLoader drops characters a track name can't hold ("upperarm.l" → "upperarml", "mixamorig:Hips" → "mixamorigHips"), so try both. */
const boneFinder = (root) => {
  const map = new Map();
  root.traverse((o) => {
    if (o.isBone && !map.has(o.name)) map.set(o.name, o);
  });
  return (name) => map.get(name) ?? map.get(THREE.PropertyBinding.sanitizeNodeName(name));
};
const worldQ = (o) => o.getWorldQuaternion(new THREE.Quaternion());
const worldP = (o) => o.getWorldPosition(new THREE.Vector3());
const direction = (from, to) => {
  const d = worldP(to).sub(worldP(from));
  return d.lengthSq() > 1e-10 ? d.normalize() : null;
};

/**
 * Bake `clip` (playing on `source`) onto `target`, whose bones have other
 * names, proportions and rest pose (A-pose vs T-pose).
 *
 * Each mapped target bone is first turned to point where its source bone
 * points at rest (which cancels A-pose vs T-pose), then follows the source
 * bone's change from rest in world space. The hips copy the source's movement,
 * scaled by leg length. Both scenes must be in their rest pose and face the
 * same way (a VRM 0.x avatar faces −Z: bake it inside a parent turned by π,
 * and show it the same way).
 *
 * @param {THREE.Object3D} target  gltf.scene of the body to animate
 * @param {THREE.Object3D} source  gltf.scene of the body the clip was made for
 * @param {THREE.AnimationClip} clip
 * @param {Record<string, string>} map  target bone name → source bone name, hips first
 */
export function retargetClip(target, source, clip, map, { fps = 30, name = clip.name } = {}) {
  const tBone = boneFinder(target);
  const sBone = boneFinder(source);
  const pairs = Object.entries(map).map(([t, s]) => [tBone(t), sBone(s)]).filter(([t, s]) => t && s);
  if (!pairs.length) throw new Error('retargetClip: no bone of the map is in both skeletons');
  // Each bone's first mapped child in map order (hips → spine, not hips → a thigh), the same pair on both rigs.
  const mapped = new Set(pairs.map(([t]) => t));
  const mappedParent = (o) => {
    while ((o = o.parent)) if (mapped.has(o)) return o;
    return null;
  };
  const childOf = new Map();
  for (const pair of pairs) {
    const parent = mappedParent(pair[0]);
    if (parent && !childOf.has(parent)) childOf.set(parent, pair);
  }
  const depth = (o) => {
    let d = 0;
    while ((o = o.parent)) d++;
    return d;
  };
  const [hipT, hipS] = pairs[0];
  pairs.sort((a, b) => depth(a[0]) - depth(b[0])); // parents first

  target.updateMatrixWorld(true);
  source.updateMatrixWorld(true);
  const rest = pairs.map(([t, s]) => {
    const child = childOf.get(t);
    const td = child && direction(t, child[0]);
    const sd = child && direction(s, child[1]);
    return {
      tRest: worldQ(t),
      sRestInv: worldQ(s).invert(),
      align: td && sd ? new THREE.Quaternion().setFromUnitVectors(td, sd) : new THREE.Quaternion(),
      position: t.position.clone(),
      quaternion: t.quaternion.clone()
    };
  });
  const hipRestS = worldP(hipS);
  const hipRestT = worldP(hipT);
  // Hip height over the feet, for scaling the hips' movement; 1 when there is no mesh to measure.
  const floor = (o) => new THREE.Box3().setFromObject(o).min.y;
  const legT = hipRestT.y - floor(target);
  const legS = hipRestS.y - floor(source);
  const scale = Number.isFinite(legT / legS) && legS > 1e-6 ? legT / legS : 1;

  const mixer = new THREE.AnimationMixer(source);
  // Once and held, so sampling at the very end reads the last pose, not the loop's first.
  mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1).play().clampWhenFinished = true;
  const frames = Math.max(2, Math.round(clip.duration * fps) + 1);
  const times = new Float32Array(frames);
  const quats = pairs.map(() => new Float32Array(frames * 4));
  const hips = new Float32Array(frames * 3);
  const q = new THREE.Quaternion();
  const pq = new THREE.Quaternion();
  const v = new THREE.Vector3();
  for (let f = 0; f < frames; f++) {
    const t = Math.min(clip.duration, f / fps);
    times[f] = t;
    mixer.setTime(t);
    source.updateMatrixWorld(true);
    pairs.forEach(([tb, sb], i) => {
      const r = rest[i];
      // world(target) = world(source) · rest(source)⁻¹ · align · rest(target)
      q.copy(worldQ(sb)).multiply(r.sRestInv).multiply(r.align).multiply(r.tRest);
      tb.parent.updateWorldMatrix(true, false);
      tb.parent.getWorldQuaternion(pq);
      tb.quaternion.copy(pq.invert().multiply(q));
      tb.updateMatrixWorld(true);
      tb.quaternion.toArray(quats[i], f * 4);
    });
    v.copy(worldP(hipS)).sub(hipRestS).multiplyScalar(scale).add(hipRestT);
    hipT.parent.worldToLocal(v);
    v.toArray(hips, f * 3);
  }
  pairs.forEach(([tb], i) => {
    tb.position.copy(rest[i].position);
    tb.quaternion.copy(rest[i].quaternion);
  });
  target.updateMatrixWorld(true);
  mixer.stopAllAction();
  mixer.uncacheRoot(source);
  const tracks = pairs.map(([tb], i) => new THREE.QuaternionKeyframeTrack(`${tb.name}.quaternion`, times, quats[i]));
  tracks.push(new THREE.VectorKeyframeTrack(`${hipT.name}.position`, times, hips));
  return new THREE.AnimationClip(name, clip.duration, tracks);
}
