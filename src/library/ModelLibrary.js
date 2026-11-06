import { Group, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const _m = new Matrix4();
const _place = new Matrix4();
const _local = new Matrix4();
const _q = new Quaternion();
const _pos = new Vector3();
const _scale = new Vector3();
const _up = new Vector3(0, 1, 0);

/**
 * Loads library models once and draws every copy of them as instances.
 *
 * A placement is `{ model, x, y, z, yaw, scale }` where `scale` is uniform and
 * the model is set down on its own footprint: its bounding box is centred on
 * (x, z) and its lowest point sits at y. That is the contract the composer
 * relies on, so a model authored off-centre or floating still lands where it
 * was put.
 */
export class ModelLibrary {
  /** @param {import('./Catalog.js').Catalog} catalog */
  constructor(catalog) {
    this.catalog = catalog;
    this.loader = new GLTFLoader();
    /** @type {Map<string, Promise<{ parts: {geometry, material, matrix: Matrix4}[] } | null>>} */
    this.cache = new Map();
  }

  /** Static parts of a model (geometry + material + transform relative to its root). */
  load(model) {
    if (!this.cache.has(model.id)) {
      this.cache.set(
        model.id,
        this.loader
          .loadAsync(this.catalog.url(model.file))
          .then((gltf) => {
            gltf.scene.updateMatrixWorld(true);
            const parts = [];
            gltf.scene.traverse((node) => {
              if (!node.isMesh || node.isSkinnedMesh) return;
              const materials = [].concat(node.material);
              for (const material of materials) {
                // Library assets were authored for many engines; one-sided foliage
                // cards from photoscans are the usual offender.
                if (material.transparent && material.opacity >= 0.99) material.transparent = false;
                if (material.map) material.map.anisotropy = 4;
              }
              parts.push({ geometry: node.geometry, material: node.material, matrix: node.matrixWorld.clone() });
            });
            return parts.length ? { parts } : null;
          })
          .catch((error) => {
            console.warn(`[ModelLibrary] ${model.id}: ${error.message}`);
            return null;
          })
      );
    }
    return this.cache.get(model.id);
  }

  /**
   * Build one InstancedMesh per part per model for a batch of placements.
   *
   * @param {{model: object, x: number, y?: number, z: number, yaw?: number, scale?: number}[]} placements
   * @param {{ castShadow?: (p) => boolean }} [options]
   * @returns {Promise<Group>}
   */
  async instantiate(placements, { shadowRadius = Infinity } = {}) {
    const group = new Group();
    group.name = 'library-instances';
    const byModel = new Map();
    for (const placement of placements) {
      if (!byModel.has(placement.model.id)) byModel.set(placement.model.id, []);
      byModel.get(placement.model.id).push(placement);
    }

    await Promise.all(
      [...byModel.values()].map(async (list) => {
        const model = list[0].model;
        const loaded = await this.load(model);
        if (!loaded) return;
        const [w, , d] = model.size;
        const [minX, minY, minZ] = model.min;
        // Re-centre on the footprint and drop onto the ground.
        _local.makeTranslation(-(minX + w / 2), -minY, -(minZ + d / 2));

        // Near copies cast shadows, distant scenery does not — the shadow map
        // only covers the arena and would waste its resolution on the horizon.
        const near = list.filter((p) => Math.hypot(p.x, p.z) <= shadowRadius);
        const far = list.filter((p) => Math.hypot(p.x, p.z) > shadowRadius);
        for (const [batch, shadows] of [
          [near, true],
          [far, false]
        ]) {
          if (!batch.length) continue;
          for (const part of loaded.parts) {
            const mesh = new InstancedMesh(part.geometry, part.material, batch.length);
            mesh.castShadow = shadows;
            mesh.receiveShadow = true;
            mesh.name = model.id;
            batch.forEach((p, i) => {
              _q.setFromAxisAngle(_up, p.yaw ?? 0);
              _pos.set(p.x, p.y ?? 0, p.z);
              _scale.setScalar(p.scale ?? 1);
              _place.compose(_pos, _q, _scale);
              _m.multiplyMatrices(_place, _local).multiply(part.matrix);
              mesh.setMatrixAt(i, _m);
            });
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
            group.add(mesh);
          }
        }
      })
    );
    return group;
  }

  /**
   * One model as its own little scene graph, for the level editor: selectable,
   * draggable, with the same footprint-centred pivot as an instance. Shares
   * geometry and materials with the cache, so it is cheap to make and drop.
   *
   * @returns {Promise<Group|null>}
   */
  async createObject(model) {
    const loaded = await this.load(model);
    if (!loaded) return null;
    const [w, , d] = model.size;
    const [minX, minY, minZ] = model.min;
    const pivot = new Matrix4().makeTranslation(-(minX + w / 2), -minY, -(minZ + d / 2));
    const group = new Group();
    group.name = model.id;
    for (const part of loaded.parts) {
      const mesh = new Mesh(part.geometry, part.material);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.multiplyMatrices(pivot, part.matrix);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }

  /** Drop instanced meshes (geometry/material stay cached for the next map). */
  release(group) {
    group?.traverse((node) => {
      if (node.isInstancedMesh) node.dispose();
    });
    group?.removeFromParent();
  }
}
