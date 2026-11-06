import { Skeleton } from 'three';

/**
 * Walk two hierarchies in lockstep — `clone(true)` preserves child order.
 *
 * @param {import('three').Object3D} a
 * @param {import('three').Object3D} b
 * @param {(source: import('three').Object3D, clone: import('three').Object3D) => void} callback
 */
function parallelTraverse(a, b, callback) {
  callback(a, b);
  const count = Math.min(a.children.length, b.children.length);
  for (let i = 0; i < count; i++) {
    parallelTraverse(a.children[i], b.children[i], callback);
  }
}

/**
 * Deep-clone a rigged model so skinned meshes bind to **new** bones.
 *
 * `Object3D.clone(true)` duplicates the hierarchy but leaves each
 * `SkinnedMesh` pointing at the original skeleton — animating both copies
 * then corrupts every bone matrix. This remaps each mesh onto cloned bones.
 *
 * @param {import('three').Object3D} source
 */
export function cloneSkinnedHierarchy(source) {
  const clone = source.clone(true);
  const sourceLookup = new Map();
  const boneLookup = new Map();
  const cloneBonesByName = new Map();

  clone.traverse((node) => {
    if (node.isBone) cloneBonesByName.set(node.name, node);
  });

  parallelTraverse(source, clone, (sourceNode, cloneNode) => {
    sourceLookup.set(cloneNode, sourceNode);
    if (sourceNode.isBone) boneLookup.set(sourceNode, cloneNode);
  });

  clone.traverse((node) => {
    if (!node.isSkinnedMesh) return;

    const sourceMesh = sourceLookup.get(node);
    if (!sourceMesh?.isSkinnedMesh || !sourceMesh.skeleton) return;

    const srcSkel = sourceMesh.skeleton;
    const bones = srcSkel.bones.map((bone) => {
      const mapped = cloneBonesByName.get(bone.name) ?? boneLookup.get(bone);
      if (!mapped || mapped === bone) {
        console.warn(`[cloneSkinnedHierarchy] bone not remapped: ${bone.name}`);
      }
      return mapped ?? bone;
    });

    const boneInverses = srcSkel.boneInverses.map((matrix) => matrix.clone());
    const skeleton = new Skeleton(bones, boneInverses);
    skeleton.init();
    node.bind(skeleton, sourceMesh.bindMatrix.clone());
    node.normalizeSkinWeights?.();
  });

  clone.updateWorldMatrix(true, true);
  return clone;
}
