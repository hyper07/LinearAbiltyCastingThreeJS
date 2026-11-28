import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Fewer draws for the same picture (render-quality.md §5): the GPU's cost in this city is the number of
 * draw calls (each a state change, twice over for whatever casts the sun's shadow), not triangles.
 *
 *   mergeStatic(group)        hand-built models of many little parts (the palace's columns, posts and
 *                             arches) → one mesh per material, the parts' places baked in
 *   trimShadows(root)         parts smaller than a shadow-map texel stop casting (a bolt, a whisker)
 */

/**
 * A part this small (its bounding sphere's radius, metres) is under one texel of the sun's shadow map
 * (a 120–180 m box on 1024–2048 texels: 9–12 cm a texel): its shadow is nothing a player could see.
 */
export const SHADOW_MIN = 0.06;

/** Each mesh under `root` smaller than `min` metres across (world size, at its current pose) casts no shadow. */
export function trimShadows(root, min = SHADOW_MIN) {
  root.updateMatrixWorld(true);
  let trimmed = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.castShadow || o.isInstancedMesh) return;
    const g = o.geometry;
    if (!g) return;
    if (!g.boundingSphere) g.computeBoundingSphere();
    if (g.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() < min) {
      o.castShadow = false;
      trimmed++;
    }
  });
  return trimmed;
}

/**
 * Small-detail culling (what Unity's and Unreal's per-object cull distances do): a part whose bounding
 * sphere covers less than `px` pixels of radius on the screen isn't drawn (camera or shadow) — a bot's
 * eye highlight past 8 m, its bolts and claws past 25 m. Nothing that is ever more than a pixel or two
 * goes. The game's own `visible` flags are left alone (it hides through layer 0 instead); every part
 * is on DETAIL_LAYER too, which a close-up camera (the rival panel's) enables to see them all.
 *
 *   const cull = new DetailCull();
 *   cull.add(rider.root);            // its parts measured once, at its rest pose
 *   cull.update(camera);             // each frame
 */
export const DETAIL_LAYER = 1;

export class DetailCull {
  constructor({ px = 0.9 } = {}) {
    this.px = px;
    this.roots = [];
    this._p = new THREE.Vector3();
    this._c = new THREE.Vector3();
  }

  /** Measure `root`'s little parts (those under `max` metres across); bigger ones are never culled. */
  add(root, { max = 0.12 } = {}) {
    root.updateMatrixWorld(true);
    const parts = [];
    root.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || !o.geometry) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const r = o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis();
      if (r >= max) return;
      o.layers.enable(DETAIL_LAYER);
      parts.push({ o, r, off: false });
    });
    parts.sort((a, b) => a.r - b.r);
    this.roots.push({ root, parts });
  }

  remove(root) {
    const i = this.roots.findIndex((e) => e.root === root);
    if (i < 0) return;
    for (const p of this.roots[i].parts) p.o.layers.enable(0);
    this.roots.splice(i, 1);
  }

  /** Each frame: parts too small to see from where the camera is, off; the rest on. */
  update(camera, height = 720) {
    // pixels a metre at one metre off: the screen's height over the view's height there
    const k = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    camera.getWorldPosition(this._c);
    for (const e of this.roots) {
      e.root.getWorldPosition(this._p);
      const d = Math.max(0.1, this._p.distanceTo(this._c));
      // (parts are sorted small first: everything under this radius goes)
      const cut = (this.px * d) / k;
      for (const p of e.parts) {
        const off = p.r < cut;
        if (off === p.off) {
          if (!off) break;
          continue;
        }
        p.off = off;
        if (off) p.o.layers.disable(0);
        else p.o.layers.enable(0);
      }
    }
  }
}

/** Whether `o` can be baked into its group: a plain mesh, nothing that moves or draws itself its own way. */
function bakeable(o, group) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isBatchedMesh || Array.isArray(o.material) || o.userData.keep) return false;
  if (o.morphTargetInfluences?.length || !o.geometry?.attributes.position) return false;
  // (only under plain groups up to `group`: not inside an LOD or anything animated)
  for (let p = o.parent; p && p !== group; p = p.parent) if (p.isLOD || p.isMesh || p.userData.keep) return false;
  return true;
}

/**
 * Merge every plain mesh under `group` into one mesh per material (its place, turn and size baked into
 * the vertices, in `group`'s own space): the same picture in a handful of draws. Mirrored parts and
 * anything that isn't a plain mesh are left as they are. The merged meshes take the shadow flags of
 * the parts they came from (any part casting → it casts). Returns how many meshes went in.
 */
export function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map();
  const parts = [];
  group.traverse((o) => {
    if (o === group || !bakeable(o, group)) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    if (m.determinant() <= 0) return;
    parts.push([o, m]);
  });
  if (parts.length < 2) return 0;
  for (const [o, m] of parts) {
    const src = o.geometry;
    // (a part drawing only some of its geometry would show all of it merged: leave such a part alone;
    // a box's groups don't matter under one material — they are ignored)
    if (src.drawRange.start !== 0 || src.drawRange.count !== Infinity) continue;
    const g = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      const a = src.attributes[name];
      if (a) g.setAttribute(name, a.clone());
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (src.index) g.setIndex(src.index.clone());
    else g.setIndex([...Array(g.attributes.position.count).keys()]);
    g.applyMatrix4(m);
    let e = byMat.get(o.material);
    if (!e) byMat.set(o.material, (e = { geos: [], parts: [], cast: false, receive: false }));
    e.geos.push(g);
    e.parts.push(o);
    e.cast ||= o.castShadow;
    e.receive ||= o.receiveShadow;
  }
  let merged = 0;
  for (const [mat, e] of byMat) {
    if (e.geos.length < 2) continue;
    const geo = mergeGeometries(e.geos, false);
    if (!geo) continue;
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = e.cast;
    mesh.receiveShadow = e.receive;
    mesh.name = 'merged';
    for (const o of e.parts) o.removeFromParent();
    group.add(mesh);
    merged += e.parts.length;
  }
  return merged;
}
