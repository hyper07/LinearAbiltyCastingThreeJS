import { Group, Mesh, MeshBasicMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

import { LAYER } from '../core/Layers.js';

/**
 * The rig machinery every procedural creature in this project shares.
 *
 * Bodies here are assembled once per *kind* into a template and cloned per
 * instance, which is what lets a monster cost a hierarchy copy instead of a
 * geometry merge. Three pieces make that work, and none of them know anything
 * about what is being built:
 *
 *   `joint`  — a named, animatable pivot. Names survive the clone, and are how
 *              the animator finds its handles again on the copy.
 *   `part`   — one piece of geometry tagged with the *role* its material plays
 *              rather than with a material, because at template time there is
 *              no material to bind: every instance needs its own.
 *   `collapseJoints` — bakes the parts inside each joint down to one mesh per
 *              material role. Parts inside a joint never move relative to each
 *              other (that is what makes them one joint), so this is free.
 *
 * A four-limbed dragon with a segmented neck and membraned wings is well over a
 * hundred pieces as authored. After collapsing it is a few dozen draws, and the
 * animation code did not change by a line.
 */

/** Stand-in until a clone binds the real thing. Never rendered. */
export const PLACEHOLDER = new MeshBasicMaterial();

/** A named, animatable pivot. */
export function joint(name) {
  const group = new Group();
  group.name = `j:${name}`;
  return group;
}

/**
 * One piece of a body.
 *
 * @param {import('three').BufferGeometry} geometry
 * @param {string} role 'body' | 'accent' | 'glow' | 'membrane'
 */
export function part(geometry, role, x = 0, y = 0, z = 0) {
  const mesh = new Mesh(geometry, PLACEHOLDER);
  mesh.userData.role = role;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Deliberately *not* on LAYER.CONTACT: that pass is a small box centred on
  // the caster, and a monster wandering through it would smear its blob shadow
  // across the player's feet.
  mesh.layers.set(LAYER.WORLD);
  return mesh;
}

/** Trim: too small to read as a shadow, not too small to cost one. */
export function trim(mesh) {
  mesh.castShadow = false;
  return mesh;
}

/** An unlit piece — eyes, throat glow. Never dissolves, never shadows. */
export function glowPart(geometry, x = 0, y = 0, z = 0) {
  const mesh = part(geometry, 'glow', x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.layers.set(LAYER.VFX);
  return mesh;
}

/**
 * Collapse every joint down to one mesh per material role.
 *
 * Meshes are grouped by role *and* by their shadow/layer flags, so trim that
 * opted out of casting shadows and eyes that live on the VFX layer are not
 * silently merged back in with the hide.
 */
export function collapseJoints(root) {
  const joints = [];
  root.traverse((node) => {
    if (node.isGroup || node === root) joints.push(node);
  });

  for (const group of joints) {
    const buckets = new Map();
    for (const child of [...group.children]) {
      if (!child.isMesh) continue;
      const key = `${child.userData.role}|${child.layers.mask}|${+child.castShadow}|${+child.receiveShadow}`;
      let bucket = buckets.get(key);
      if (!bucket) buckets.set(key, (bucket = { meshes: [], sample: child }));
      bucket.meshes.push(child);
    }

    for (const bucket of buckets.values()) {
      if (bucket.meshes.length < 2) continue;

      // Three's primitives disagree about indexing — boxes and cones are
      // indexed, icosahedra are not — and `mergeGeometries` refuses a mixed
      // bucket. Dropping the whole bucket to non-indexed is the cheap fix; at
      // these vertex counts the duplication is not worth measuring.
      const mixed =
        bucket.meshes.some((mesh) => mesh.geometry.index) &&
        bucket.meshes.some((mesh) => !mesh.geometry.index);

      const baked = bucket.meshes.map((mesh) => {
        mesh.updateMatrix();
        // A clone per part, because `applyMatrix4` mutates in place and the
        // source geometry is shared with every other kind that uses it.
        let geometry = mesh.geometry.clone();
        if (mixed && geometry.index) geometry = geometry.toNonIndexed();
        return geometry.applyMatrix4(mesh.matrix);
      });

      const merged = mergeGeometries(baked, false);
      for (const geometry of baked) geometry.dispose();
      if (!merged) continue;

      const sample = bucket.sample;
      const combined = new Mesh(merged, PLACEHOLDER);
      combined.userData.role = sample.userData.role;
      combined.userData.merged = true;
      combined.castShadow = sample.castShadow;
      combined.receiveShadow = sample.receiveShadow;
      combined.layers.mask = sample.layers.mask;

      for (const mesh of bucket.meshes) group.remove(mesh);
      group.add(combined);
    }
  }

  return root;
}

/**
 * Instantiate a template: clone the hierarchy, bind this instance's materials
 * and hand back the joints under the names the animator uses.
 *
 * The clone shares geometry with every other creature of its kind (which is the
 * point of the template) and shares nothing else.
 */
export function instantiate(template, materials) {
  const root = template.root.clone(true);

  root.traverse((node) => {
    if (!node.isMesh) return;
    node.material = materials[node.userData.role] ?? materials.body;
    node.frustumCulled = false; // the rig moves; its baked bounds do not
  });

  const joints = {};
  for (const name of template.jointNames) {
    joints[name] = root.getObjectByName(`j:${name}`);
  }
  // Chains (a neck, a tail, a row of rings) are handed back as arrays, because
  // that is how a travelling wave wants to read them.
  for (const [name, members] of Object.entries(template.chains ?? {})) {
    joints[name] = members.map((member) => joints[member]);
  }

  return {
    root,
    joints,
    centreHeight: template.centreHeight,
    barHeight: template.barHeight,
    footHeight: template.footHeight
  };
}
