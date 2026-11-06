import { Color } from 'three';

import { CLOTH_MESH_PATTERNS, SKIN_MESH_PATTERNS } from '../platform/appearance/Appearance.js';

/**
 * Snapshot mesh material colours so appearance can be re-applied live.
 *
 * @param {import('three').Object3D} root
 * @returns {Map<import('three').Material, import('three').Color>}
 */
export function captureMaterialBases(root) {
  const bases = new Map();
  root.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (!material?.color || bases.has(material)) continue;
      bases.set(material, material.color.clone());
    }
  });
  return bases;
}

/**
 * @param {string} meshName
 * @param {RegExp[]} patterns
 */
function matchesMesh(meshName, patterns) {
  return patterns.some((pattern) => pattern.test(meshName));
}

/**
 * Walk paired meshes and map clone materials to the source base colours.
 *
 * @param {import('three').Object3D} sourceRoot
 * @param {Map<import('three').Material, import('three').Color>} sourceBases
 * @param {import('three').Object3D} cloneRoot
 */
export function copyMaterialBases(sourceRoot, sourceBases, cloneRoot) {
  const bases = new Map();
  const sourceMeshes = [];
  const cloneMeshes = [];

  sourceRoot.traverse((node) => {
    if (node.isMesh) sourceMeshes.push(node);
  });
  cloneRoot.traverse((node) => {
    if (node.isMesh) cloneMeshes.push(node);
  });

  const count = Math.min(sourceMeshes.length, cloneMeshes.length);
  for (let i = 0; i < count; i++) {
    const srcMats = Array.isArray(sourceMeshes[i].material)
      ? sourceMeshes[i].material
      : [sourceMeshes[i].material];
    const cloneMats = Array.isArray(cloneMeshes[i].material)
      ? cloneMeshes[i].material
      : [cloneMeshes[i].material];

    for (let j = 0; j < Math.min(srcMats.length, cloneMats.length); j++) {
      const base = sourceBases.get(srcMats[j]);
      if (base && cloneMats[j]) bases.set(cloneMats[j], base.clone());
    }
  }

  return bases;
}

/**
 * Apply tint + optional skin/cloth region colours.
 *
 * @param {import('three').Object3D} root
 * @param {import('../platform/appearance/Appearance.js').CharacterAppearance} appearance
 * @param {Map<import('three').Material, import('three').Color>} bases
 */
export function applyCharacterColors(root, appearance, bases) {
  const tint = new Color(appearance.tint || '#ffffff');
  const skin = appearance.skinColor ? new Color(appearance.skinColor) : null;
  const cloth = appearance.clothColor ? new Color(appearance.clothColor) : null;

  root.traverse((node) => {
    if (!node.isMesh) return;

    const meshName = node.name ?? '';
    const isSkin = skin && matchesMesh(meshName, SKIN_MESH_PATTERNS);
    const isCloth = cloth && matchesMesh(meshName, CLOTH_MESH_PATTERNS);
    const materials = Array.isArray(node.material) ? node.material : [node.material];

    for (const material of materials) {
      if (!material?.color) continue;
      const base = bases.get(material);
      if (!base) continue;

      material.color.copy(base);

      if (isSkin) {
        material.color.multiply(skin);
      } else if (isCloth) {
        material.color.multiply(cloth);
      } else {
        material.color.multiply(tint);
      }
    }
  });
}
