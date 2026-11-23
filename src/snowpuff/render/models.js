/**
 * Ready-made props from the asset library (polyfork, CC BY 4.0 — credited by
 * name in the game's Credits panel and docs/third-party.md), loaded once and
 * turned into instancing kits: every sub-mesh of a model baked into one
 * geometry per material, so a hundred spruces are a few draw calls.
 *
 * If a file is missing (a fresh clone before `npm run dev` fetched the
 * library), a simple stand-in made here takes its place, so the game always runs.
 */
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import { POLYFORK } from '../assets.js';

export { POLYFORK };

const loader = new GLTFLoader();

/**
 * A kit: { parts: [{ geometry, material }], size: Vector3, min: Vector3, fallback }.
 * Geometries are in the model's own units with its base at y = 0 and centred in x/z.
 */
export async function loadKit(key, { emissiveTest = null, emissive = null } = {}) {
  const [id] = POLYFORK[key];
  try {
    const gltf = await loader.loadAsync(`./library/polyfork/${id}.glb`);
    const root = gltf.scene;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const centre = box.getCenter(new THREE.Vector3());
    const shift = new THREE.Matrix4().makeTranslation(-centre.x, -box.min.y, -centre.z);
    const byMat = new Map();
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const geo = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(shift, o.matrixWorld));
      for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) geo.deleteAttribute(k);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (mats.length > 1 && geo.groups.length) {
        for (const gr of geo.groups) {
          const part = subGeometry(geo, gr);
          push(byMat, mats[gr.materialIndex], part);
        }
      } else push(byMat, mats[0], geo);
    });
    const parts = [];
    for (const [mat, geos] of byMat) {
      const g = geos.length > 1 ? mergeGeometries(normalise(geos), false) : geos[0];
      if (!g) continue;
      const m = toNodeMaterial(mat);
      if (emissiveTest && emissiveTest(mat)) {
        m.emissive = new THREE.Color(emissive ?? mat.color);
        m.emissiveIntensity = 2.2;
      }
      parts.push({ geometry: g, material: m });
    }
    return { key, parts, size: box.getSize(new THREE.Vector3()), fallback: false };
  } catch (error) {
    return fallbackKit(key);
  }
}

function push(map, mat, geo) {
  if (!map.has(mat)) map.set(mat, []);
  map.get(mat).push(geo);
}

/** Make every geometry in a merge group carry the same attributes. */
function normalise(geos) {
  const want = ['position', 'normal', 'uv', 'color'].filter((k) => geos.every((g) => g.attributes[k]));
  return geos.map((g) => {
    const out = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(out.attributes)) if (!want.includes(k)) out.deleteAttribute(k);
    return out;
  });
}

function subGeometry(geo, group) {
  const src = geo.index ? geo.toNonIndexed() : geo;
  const out = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(src.attributes)) {
    const start = geo.index ? group.start : group.start;
    out.setAttribute(k, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + group.count) * a.itemSize), a.itemSize));
  }
  return out;
}

/** Standard → standard node material, keeping the look; a little roughness variety. */
function toNodeMaterial(mat) {
  const m = new THREE.MeshStandardNodeMaterial({
    color: mat.color ?? new THREE.Color('#ffffff'),
    map: mat.map ?? null,
    roughness: Math.min(1, Math.max(0.45, mat.roughness ?? 0.8)),
    metalness: Math.min(0.3, mat.metalness ?? 0),
    vertexColors: Boolean(mat.vertexColors),
    transparent: Boolean(mat.transparent),
    opacity: mat.opacity ?? 1,
    side: mat.side ?? THREE.FrontSide,
    flatShading: false
  });
  if (mat.emissive && mat.emissiveIntensity && mat.emissive.getHex() !== 0) {
    m.emissive = mat.emissive.clone();
    m.emissiveIntensity = mat.emissiveIntensity;
  }
  m.name = mat.name ?? '';
  return m;
}

/* ---------------------------------------------------------------- stand-ins */

const std = (color, o = {}) => new THREE.MeshStandardNodeMaterial({ color, roughness: 0.8, ...o });

function fallbackKit(key) {
  const parts = [];
  const add = (g, m) => parts.push({ geometry: g, material: m });
  switch (key) {
    case 'spruce':
    case 'pine':
    case 'fir': {
      add(new THREE.CylinderGeometry(0.15, 0.22, 1.2, 8).translate(0, 0.6, 0), std('#6a4a32'));
      const g = mergeGeometries([0, 1, 2].map((i) => new THREE.ConeGeometry(1.5 - i * 0.4, 2, 9).translate(0, 1.6 + i * 1.2, 0)));
      add(g, std('#2f6a44'));
      break;
    }
    case 'snowman': {
      const g = mergeGeometries([new THREE.SphereGeometry(0.5, 16, 12).translate(0, 0.45, 0), new THREE.SphereGeometry(0.36, 16, 12).translate(0, 1.05, 0), new THREE.SphereGeometry(0.26, 16, 12).translate(0, 1.5, 0)]);
      add(g, std('#f4f7fb'));
      add(new THREE.ConeGeometry(0.05, 0.25, 8).rotateX(Math.PI / 2).translate(0, 1.5, 0.3), std('#ff8a2a'));
      break;
    }
    case 'hay':
      add(new THREE.CylinderGeometry(0.26, 0.26, 0.94, 16).rotateZ(Math.PI / 2).translate(0, 0.26, 0), std('#d8b060'));
      break;
    case 'snowFence':
      add(new THREE.BoxGeometry(2, 1.2, 0.08).translate(0, 0.6, 0), std('#d07a3a'));
      break;
    case 'boulders':
    case 'outcrop':
      add(new THREE.IcosahedronGeometry(1.1, 1).scale(1.1, 0.7, 1).translate(0, 0.6, 0), std('#77808f', { flatShading: true }));
      break;
    case 'pylon':
      add(new THREE.BoxGeometry(0.5, 9.6, 0.5).translate(0, 4.8, 0), std('#6d7684', { metalness: 0.3 }));
      add(new THREE.BoxGeometry(4, 0.3, 0.4).translate(0, 9.4, 0), std('#6d7684', { metalness: 0.3 }));
      break;
    case 'chair':
      add(new THREE.BoxGeometry(0.06, 2.6, 0.06).translate(0, 2.2, 0), std('#444a55'));
      add(new THREE.BoxGeometry(1.8, 0.12, 0.6).translate(0, 0.9, 0), std('#3a4f8a'));
      add(new THREE.BoxGeometry(1.8, 0.6, 0.1).translate(0, 1.2, -0.3), std('#3a4f8a'));
      break;
    case 'lantern':
      add(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8).translate(0, 1.2, 0), std('#5a3a22'));
      add(new THREE.BoxGeometry(0.3, 0.4, 0.3).translate(0, 2.4, 0), Object.assign(std('#ffd27a'), { emissive: new THREE.Color('#ffb648'), emissiveIntensity: 2.2 }));
      break;
    default:
      add(new THREE.BoxGeometry(4, 3, 4).translate(0, 1.5, 0), std('#c9a77a'));
  }
  const box = new THREE.Box3();
  for (const p of parts) {
    p.geometry.computeBoundingBox();
    box.union(p.geometry.boundingBox);
  }
  return { key, parts, size: box.getSize(new THREE.Vector3()), fallback: true };
}

/**
 * Instances of a kit: one InstancedMesh per part, sharing transforms.
 * `list` = [{ x, y, z, ry, s (uniform) or sx/sy/sz }]. Returns a Group.
 */
export function instance(kit, list, { shadow = true, receive = true } = {}) {
  const g = new THREE.Group();
  if (!list.length) return g;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  const mats = list.map((it) => {
    e.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
    q.setFromEuler(e);
    p.set(it.x, it.y, it.z);
    sc.set(it.sx ?? it.s ?? 1, it.sy ?? it.s ?? 1, it.sz ?? it.s ?? 1);
    return m4.compose(p, q, sc).clone();
  });
  for (const part of kit.parts) {
    const im = new THREE.InstancedMesh(part.geometry, part.material, list.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = shadow;
    im.receiveShadow = receive;
    im.computeBoundingSphere();
    g.add(im);
  }
  g.userData.count = list.length;
  return g;
}
