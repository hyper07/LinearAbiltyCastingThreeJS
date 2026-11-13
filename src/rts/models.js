import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FACTIONS, STATS, CELL } from './rules.js';

/**
 * Shardfront's looks: every unit and building of the three factions, made of
 * simple shapes (our own designs), in two parts — the `body` in the
 * faction's colours, and the `trim` (white here) that is drawn in the
 * player's colour. Unit parts are shared geometry for instanced drawing.
 *
 * When the open asset library is downloaded, the Frontier League's buildings
 * use the KayKit Space Base Bits models (CC0, Kay Lousberg) instead; see
 * `loadKitBuildings`. Without it, the shapes here stand in.
 */

const tmp = new THREE.Object3D();

/** One shape, coloured and placed: what the merged geometry is made from. */
function part(geometry, color, { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  tmp.position.set(...at);
  tmp.rotation.set(...rot);
  tmp.scale.set(...scale);
  tmp.updateMatrix();
  g.applyMatrix4(tmp.matrix);
  const c = new THREE.Color(color);
  const colors = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = c.r;
    colors[i + 1] = c.g;
    colors[i + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(name)) g.deleteAttribute(name);
  return g;
}

const merge = (parts) => {
  const g = mergeGeometries(parts, false);
  g.computeBoundingSphere();
  return g;
};

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s);
const sphere = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
const octa = (r) => new THREE.OctahedronGeometry(r, 0);
const torus = (r, t) => new THREE.TorusGeometry(r, t, 6, 16);
const W = '#ffffff';
const R = Math.PI / 2;

/* ------------------------------------------------------------------ units */

const UNIT_SHAPES = {
  league(type, c) {
    const { body, dark, accent } = c;
    switch (type) {
      case 'worker': // a tracked hauler with a drill arm
        return {
          body: [part(box(1.1, 0.5, 1.4), body, { at: [0, 0.55, 0] }), part(box(0.35, 0.35, 1.5), dark, { at: [-0.6, 0.25, 0] }), part(box(0.35, 0.35, 1.5), dark, { at: [0.6, 0.25, 0] }), part(cone(0.18, 0.6), accent, { at: [0, 0.6, 0.95], rot: [R, 0, 0] })],
          trim: [part(box(0.8, 0.2, 0.6), W, { at: [0, 0.9, -0.2] })]
        };
      case 'light': // a two-legged rifle walker
        return {
          body: [part(box(0.25, 0.9, 0.25), dark, { at: [-0.25, 0.45, 0] }), part(box(0.25, 0.9, 0.25), dark, { at: [0.25, 0.45, 0] }), part(box(0.8, 0.6, 0.6), body, { at: [0, 1.15, 0] }), part(box(0.12, 0.12, 1.1), accent, { at: [0.35, 1.2, 0.5] })],
          trim: [part(box(0.82, 0.18, 0.62), W, { at: [0, 1.38, 0] })]
        };
      case 'raider': // a four-wheeled buggy with a twin gun
        return {
          body: [part(box(1.3, 0.4, 1.9), body, { at: [0, 0.55, 0] }), ...[[-0.75, 0.6], [0.75, 0.6], [-0.75, -0.6], [0.75, -0.6]].map(([x, z]) => part(cyl(0.32, 0.32, 0.25), dark, { at: [x, 0.33, z], rot: [0, 0, R] })), part(box(0.1, 0.1, 0.9), accent, { at: [-0.12, 0.95, 0.5] }), part(box(0.1, 0.1, 0.9), accent, { at: [0.12, 0.95, 0.5] })],
          trim: [part(box(0.9, 0.25, 0.7), W, { at: [0, 0.88, -0.2] })]
        };
      case 'heavy': // a plated walker
        return {
          body: [part(box(0.5, 1.1, 0.6), dark, { at: [-0.5, 0.55, 0] }), part(box(0.5, 1.1, 0.6), dark, { at: [0.5, 0.55, 0] }), part(box(1.8, 1.0, 1.3), body, { at: [0, 1.6, 0] }), part(box(0.5, 0.5, 0.9), accent, { at: [-1.1, 1.7, 0.3] }), part(box(0.5, 0.5, 0.9), accent, { at: [1.1, 1.7, 0.3] })],
          trim: [part(box(1.0, 0.3, 1.32), W, { at: [0, 2.2, 0] })]
        };
      default: // siege: a tracked mortar
        return {
          body: [part(box(1.8, 0.6, 2.2), body, { at: [0, 0.5, 0] }), part(box(0.4, 0.5, 2.3), dark, { at: [-1, 0.3, 0] }), part(box(0.4, 0.5, 2.3), dark, { at: [1, 0.3, 0] }), part(cyl(0.3, 0.38, 1.8), accent, { at: [0, 1.3, 0.3], rot: [-0.7, 0, 0] })],
          trim: [part(box(1.2, 0.3, 0.8), W, { at: [0, 0.95, -0.6] })]
        };
    }
  },
  thornkin(type, c) {
    const { body, dark, accent } = c;
    switch (type) {
      case 'worker': // a walking bulb with leaves
        return {
          body: [part(sphere(0.55), body, { at: [0, 0.6, 0], scale: [1, 0.9, 1] }), part(cone(0.25, 0.8, 5), '#7fb24a', { at: [0.3, 1.1, 0], rot: [0, 0, -0.6] }), part(cone(0.25, 0.8, 5), '#7fb24a', { at: [-0.3, 1.1, 0], rot: [0, 0, 0.6] })],
          trim: [part(sphere(0.2, 6, 5), W, { at: [0, 1.15, 0] })]
        };
      case 'light': // a spiny stalk
        return {
          body: [part(cone(0.45, 1.8, 7), body, { at: [0, 0.9, 0] }), ...[0, 1, 2, 3, 4].map((k) => part(cone(0.08, 0.5, 4), dark, { at: [Math.cos(k * 1.26) * 0.3, 0.6 + k * 0.18, Math.sin(k * 1.26) * 0.3], rot: [Math.sin(k * 1.26) * R, 0, -Math.cos(k * 1.26) * R] }))],
          trim: [part(sphere(0.22, 6, 5), W, { at: [0, 1.8, 0] })]
        };
      case 'raider': // a low thorny hound
        return {
          body: [part(sphere(0.7), body, { at: [0, 0.75, 0], scale: [0.8, 0.6, 1.5] }), ...[[-0.35, 0.5], [0.35, 0.5], [-0.35, -0.5], [0.35, -0.5]].map(([x, z]) => part(cone(0.12, 0.6, 4), dark, { at: [x, 0.3, z], rot: [Math.PI, 0, 0] })), ...[0, 1, 2].map((k) => part(cone(0.1, 0.5, 4), accent, { at: [0, 1.15, -0.4 + k * 0.4] }))],
          trim: [part(sphere(0.25, 6, 5), W, { at: [0, 0.9, 0.9] })]
        };
      case 'heavy': // a bark-plated beast
        return {
          body: [part(sphere(1.1, 10, 8), body, { at: [0, 1.3, 0], scale: [1.1, 0.95, 1.2] }), ...[[-0.8, 0.6], [0.8, 0.6], [-0.8, -0.6], [0.8, -0.6]].map(([x, z]) => part(cyl(0.25, 0.3, 0.8, 6), dark, { at: [x, 0.4, z] })), part(box(0.9, 0.3, 1.2), dark, { at: [0, 2.2, 0], rot: [0, 0.3, 0] }), part(cone(0.18, 0.7, 5), accent, { at: [0.5, 1.5, 1.1], rot: [R, 0, 0] }), part(cone(0.18, 0.7, 5), accent, { at: [-0.5, 1.5, 1.1], rot: [R, 0, 0] })],
          trim: [part(box(0.6, 0.25, 0.6), W, { at: [0, 2.42, 0], rot: [0, 0.3, 0] })]
        };
      default: // siege: a pod on a thick stem
        return {
          body: [part(cyl(0.35, 0.55, 1.2, 7), dark, { at: [0, 0.6, 0] }), part(cyl(0.9, 0.2, 0.6, 9, 1, true), body, { at: [0, 1.4, 0.1] }), part(sphere(0.45), accent, { at: [0, 1.7, 0.1] }), part(sphere(0.6), body, { at: [0, 0.35, 0], scale: [1.4, 0.5, 1.6] })],
          trim: [part(torus(0.6, 0.1), W, { at: [0, 0.8, 0], rot: [R, 0, 0] })]
        };
    }
  },
  prism(type, c) {
    const { body, dark, accent } = c;
    switch (type) {
      case 'worker': // a floating shard
        return {
          body: [part(octa(0.55), body, { at: [0, 1.0, 0], scale: [0.8, 1.3, 0.8] })],
          trim: [part(octa(0.2), W, { at: [0, 1.0, 0.42] })]
        };
      case 'light': // a tall shard in a ring
        return {
          body: [part(octa(0.5), body, { at: [0, 1.3, 0], scale: [0.7, 2, 0.7] }), part(octa(0.2), accent, { at: [0, 1.3, 0.5] })],
          trim: [part(torus(0.6, 0.06), W, { at: [0, 1.3, 0], rot: [R, 0, 0] })]
        };
      case 'raider': // spinning blades
        return {
          body: [part(octa(0.35), accent, { at: [0, 1.0, 0] }), ...[0, 1, 2].map((k) => part(cone(0.25, 1.2, 4), body, { at: [Math.cos((k * 2 * Math.PI) / 3) * 0.6, 1.0, Math.sin((k * 2 * Math.PI) / 3) * 0.6], rot: [0, -(k * 2 * Math.PI) / 3, -R] }))],
          trim: [part(torus(0.35, 0.06), W, { at: [0, 1.0, 0], rot: [R, 0, 0] })]
        };
      case 'heavy': // a crystal wall
        return {
          body: [part(box(1.5, 2.4, 0.9), body, { at: [0, 1.6, 0] }), part(octa(0.5), body, { at: [-0.9, 1.0, 0.2], scale: [0.7, 1.6, 0.7] }), part(octa(0.5), body, { at: [0.9, 1.0, 0.2], scale: [0.7, 1.6, 0.7] }), part(box(1.52, 0.2, 0.92), dark, { at: [0, 0.5, 0] })],
          trim: [part(box(1.52, 0.3, 0.92), W, { at: [0, 2.5, 0] })]
        };
      default: // siege: a lens in a frame
        return {
          body: [part(torus(0.9, 0.15), body, { at: [0, 1.6, 0] }), part(sphere(0.45), accent, { at: [0, 1.6, 0] }), part(octa(0.5), dark, { at: [0, 0.6, 0], scale: [1.4, 1, 1.4] })],
          trim: [part(torus(0.55, 0.07), W, { at: [0, 0.6, 0], rot: [R, 0, 0] })]
        };
    }
  }
};

/** Shared unit geometry: `{ body, trim }` for a faction's unit type. */
export function unitGeometry(faction, type) {
  const f = FACTIONS[faction];
  const shape = UNIT_SHAPES[faction](type, f.look);
  // Scale to the unit's footprint so every faction's same role reads the same size.
  // A little bigger than the footprint, so they read from the camera's height.
  const s = (STATS[faction][type].radius / 0.8) * 1.35;
  const k = new THREE.Matrix4().makeScale(s, s, s);
  const body = merge(shape.body);
  const trim = merge(shape.trim);
  body.applyMatrix4(k);
  trim.applyMatrix4(k);
  return { body, trim, hover: faction === 'prism' };
}

/* -------------------------------------------------------------- buildings */

const BUILDING_SHAPES = {
  league(type, c, w) {
    const { body, dark, accent } = c;
    switch (type) {
      case 'core':
        return { body: [part(box(w, 1.6, w), dark, { at: [0, 0.8, 0] }), part(box(w * 0.8, 3, w * 0.8), body, { at: [0, 3.1, 0] }), part(sphere(w * 0.28, 12, 6), body, { at: [0, 4.6, 0], scale: [1, 0.6, 1] }), part(cyl(0.1, 0.1, 3), accent, { at: [w * 0.3, 6, w * 0.3] })], trim: [part(box(w * 0.82, 0.4, w * 0.82), W, { at: [0, 2.2, 0] })] };
      case 'depot':
        return { body: [part(cyl(w * 0.22, w * 0.22, 2.6), body, { at: [-w * 0.2, 1.3, 0] }), part(cyl(w * 0.22, w * 0.22, 2.2), body, { at: [w * 0.22, 1.1, -w * 0.1] }), part(box(w * 0.9, 0.3, w * 0.9), dark, { at: [0, 0.15, 0] })], trim: [part(cyl(w * 0.23, w * 0.23, 0.3), W, { at: [-w * 0.2, 2.4, 0] })] };
      case 'barracks':
        return { body: [part(box(w * 0.9, 2.4, w * 0.8), body, { at: [0, 1.2, 0] }), part(cyl(0, w * 0.65, 1.4, 4), dark, { at: [0, 3.1, 0], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.9] }), part(box(w * 0.3, 1.6, 0.2), dark, { at: [0, 0.8, w * 0.41] })], trim: [part(box(w * 0.92, 0.35, w * 0.82), W, { at: [0, 2.2, 0] })] };
      case 'workshop':
        return { body: [part(box(w * 0.95, 3, w * 0.85), body, { at: [0, 1.5, 0] }), part(cyl(0.4, 0.5, 3), dark, { at: [w * 0.3, 4, -w * 0.2] }), part(box(0.3, 0.3, w * 0.9), accent, { at: [-w * 0.2, 3.4, 0.2] })], trim: [part(box(w * 0.97, 0.35, w * 0.87), W, { at: [0, 2.7, 0] })] };
      default:
        return { body: [part(cyl(w * 0.25, w * 0.35, 2.6, 8), dark, { at: [0, 1.3, 0] }), part(box(w * 0.5, 0.8, w * 0.5), body, { at: [0, 3, 0] }), part(box(0.2, 0.2, 1.6), accent, { at: [0, 3.1, 0.9] })], trim: [part(box(w * 0.52, 0.2, w * 0.52), W, { at: [0, 3.45, 0] })] };
    }
  },
  thornkin(type, c, w) {
    const { body, dark, accent } = c;
    switch (type) {
      case 'core':
        return { body: [part(cyl(w * 0.14, w * 0.24, 4.5, 8), dark, { at: [0, 2.25, 0] }), part(sphere(w * 0.42, 12, 8), body, { at: [0, 5.6, 0], scale: [1, 0.7, 1] }), part(sphere(w * 0.25, 10, 6), '#7fb24a', { at: [w * 0.25, 6.4, 0] }), ...[0, 1, 2, 3].map((k) => part(cyl(0.2, 0.5, w * 0.4, 5), dark, { at: [Math.cos(k * R) * w * 0.3, 0.3, Math.sin(k * R) * w * 0.3], rot: [Math.sin(k * R) * 1.2, 0, -Math.cos(k * R) * 1.2] }))], trim: [part(sphere(0.6, 8, 6), W, { at: [0, 4.4, w * 0.18] })] };
      case 'depot':
        return { body: [part(sphere(w * 0.38, 10, 8), body, { at: [0, w * 0.32, 0], scale: [1, 1.2, 1] }), part(cone(0.3, 1, 5), '#7fb24a', { at: [0, w * 0.8, 0] })], trim: [part(torus(w * 0.3, 0.12), W, { at: [0, w * 0.2, 0], rot: [R, 0, 0] })] };
      case 'barracks':
        return { body: [...[[-0.25, -0.2, 3], [0.25, 0.1, 3.6], [0, 0.3, 2.6], [-0.2, 0.3, 2.2], [0.3, -0.3, 2.4]].map(([x, z, h]) => part(cone(w * 0.18, h, 6), body, { at: [x * w, h / 2, z * w] })), part(sphere(w * 0.4, 10, 6), dark, { at: [0, 0.2, 0], scale: [1, 0.3, 1] })], trim: [part(sphere(0.45, 8, 6), W, { at: [0.25 * w, 3.6, 0.1 * w] })] };
      case 'workshop':
        return { body: [part(sphere(w * 0.48, 12, 8, 0, Math.PI * 2, 0, R), body, { at: [0, 0, 0], scale: [1, 0.7, 1] }), part(cone(0.4, 2.6, 6), accent, { at: [0, w * 0.4, 0] }), ...[0, 1, 2].map((k) => part(torus(w * 0.2, 0.15), dark, { at: [Math.cos(k * 2.1) * w * 0.2, 1.1, Math.sin(k * 2.1) * w * 0.2], rot: [R, 0, k] }))], trim: [part(torus(w * 0.46, 0.15), W, { at: [0, 0.2, 0], rot: [R, 0, 0] })] };
      default:
        return { body: [part(cone(w * 0.3, 5, 6), dark, { at: [0, 2.5, 0] }), part(sphere(0.6, 8, 6), accent, { at: [0, 4.4, 0] })], trim: [part(torus(w * 0.22, 0.12), W, { at: [0, 1, 0], rot: [R, 0, 0] })] };
    }
  },
  prism(type, c, w) {
    const { body, dark, accent } = c;
    switch (type) {
      case 'core':
        return { body: [part(octa(w * 0.3), body, { at: [0, 4.2, 0], scale: [1, 2.2, 1] }), part(cyl(w * 0.45, w * 0.5, 0.8, 6), dark, { at: [0, 0.4, 0] }), part(octa(w * 0.12), accent, { at: [w * 0.32, 2, w * 0.32], scale: [1, 2, 1] }), part(octa(w * 0.12), accent, { at: [-w * 0.32, 2, -w * 0.32], scale: [1, 2, 1] })], trim: [part(torus(w * 0.38, 0.18), W, { at: [0, 3.2, 0], rot: [R, 0, 0] })] };
      case 'depot':
        return { body: [part(octa(w * 0.32), body, { at: [0, 2.2, 0], scale: [1, 1.6, 1] }), part(cyl(w * 0.3, w * 0.4, 0.4, 6), dark, { at: [0, 0.2, 0] })], trim: [part(torus(w * 0.28, 0.08), W, { at: [0, 0.5, 0], rot: [R, 0, 0] })] };
      case 'barracks':
        return { body: [...[0, 1, 2, 3, 4].map((k) => part(octa(w * 0.14), body, { at: [Math.cos(k * 1.256) * w * 0.3, 1.8, Math.sin(k * 1.256) * w * 0.3], scale: [1, 2.6, 1] })), part(cyl(w * 0.45, w * 0.48, 0.4, 10), dark, { at: [0, 0.2, 0] }), part(octa(w * 0.12), accent, { at: [0, 2.2, 0] })], trim: [part(torus(w * 0.4, 0.12), W, { at: [0, 0.5, 0], rot: [R, 0, 0] })] };
      case 'workshop':
        return { body: [part(box(w * 0.55, w * 0.55, w * 0.55), body, { at: [0, w * 0.5, 0], rot: [Math.PI / 4, 0, Math.PI / 4] }), part(cyl(w * 0.45, w * 0.48, 0.5, 8), dark, { at: [0, 0.25, 0] }), part(octa(w * 0.1), accent, { at: [w * 0.35, 1.2, -w * 0.3], scale: [1, 2, 1] })], trim: [part(torus(w * 0.42, 0.12), W, { at: [0, 0.6, 0], rot: [R, 0, 0] })] };
      default:
        return { body: [part(octa(w * 0.22), body, { at: [0, 2.6, 0], scale: [0.8, 3, 0.8] }), part(sphere(0.5, 8, 6), accent, { at: [0, 5.2, 0] })], trim: [part(torus(w * 0.3, 0.08), W, { at: [0, 0.8, 0], rot: [R, 0, 0] })] };
    }
  }
};

/** A building's geometry, sized to its footprint: `{ body, trim }`. */
export function buildingGeometry(faction, type) {
  const f = FACTIONS[faction];
  const w = STATS[faction][type].size * CELL * 0.9;
  const shape = BUILDING_SHAPES[faction](type, f.look, w);
  return { body: merge(shape.body), trim: merge(shape.trim) };
}

/** A crystal: a cluster of shards (one geometry, scaled by what is left in it). */
export function crystalGeometry() {
  const parts = [
    part(octa(0.6), '#7ef0ff', { at: [0, 1.1, 0], scale: [0.7, 2, 0.7] }),
    part(octa(0.45), '#5fd0ff', { at: [0.5, 0.7, 0.2], scale: [0.7, 1.6, 0.7], rot: [0, 0, -0.4] }),
    part(octa(0.4), '#9cf7ff', { at: [-0.45, 0.6, -0.2], scale: [0.7, 1.5, 0.7], rot: [0.3, 0, 0.4] })
  ];
  return merge(parts);
}

/* ------------------------------------------------ the KayKit space base */

const KIT = 'library/kaykit/KayKit-Space-Base-Bits-1.0/addons/kaykit_space_base_bits/Assets/gltf/';
/** The Frontier League's buildings from the KayKit Space Base Bits pack. */
const KIT_BUILDINGS = { core: 'basemodule_garage', depot: 'cargodepot_A', barracks: 'basemodule_A', workshop: 'basemodule_D' };

/**
 * Load the KayKit models for the Frontier League's buildings, each scaled to
 * its footprint and stood on the ground. Resolves `{ [type]: Object3D }` —
 * empty when the library isn't there (the shapes above stand in).
 */
export async function loadKitBuildings(base = './') {
  const loader = new GLTFLoader();
  const out = {};
  await Promise.all(Object.entries(KIT_BUILDINGS).map(async ([type, file]) => {
    try {
      const gltf = await loader.loadAsync(`${base}${KIT}${file}.gltf`);
      const model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const w = STATS.league[type].size * CELL * 0.92;
      const k = w / Math.max(size.x, size.z);
      model.scale.setScalar(k);
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.set(-center.x * k, -bounds.min.y * k, -center.z * k);
      const holder = new THREE.Group();
      holder.add(model);
      holder.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      holder.userData.height = size.y * k;
      out[type] = holder;
    } catch {
      /* not downloaded (yet): the shapes stand in */
    }
  }));
  return out;
}

/* ------------------------------------------------------- your own models */

/**
 * Model slots: put a GLB you have the rights to under `library/my-models/`
 * and list it in `library/my-models/shardfront.json`:
 *
 *   { "slots": { "league:heavy": { "file": "my-models/walker.glb",
 *       "credit": "Walker by Someone (CC BY 4.0)", "turn": 180 } } }
 *
 * A slot is `<faction>:<unit or building type>`. The model is fitted to the
 * unit's size (or the building's footprint) and stood on the ground; `turn`
 * (degrees) turns it to face forward (+z). Units keep a ring in the player's
 * colour under them. Resolves `{ slots: { [key]: { parts, credit } }, credits }`;
 * empty when there is no list.
 */
export async function loadModelSlots(base = './') {
  let list;
  try {
    const res = await fetch(`${base}library/my-models/shardfront.json`, { cache: 'no-cache' });
    if (!res.ok) return { slots: {}, credits: [] };
    list = await res.json();
  } catch {
    return { slots: {}, credits: [] };
  }
  const loader = new GLTFLoader();
  const slots = {};
  const credits = [];
  await Promise.all(Object.entries(list?.slots ?? {}).map(async ([key, slot]) => {
    const [faction, type] = key.split(':');
    const stats = STATS[faction]?.[type];
    const file = String(slot?.file ?? '');
    if (!stats || !/^my-models\/[\w./-]+\.(glb|gltf)$/i.test(file) || file.includes('..')) return;
    try {
      const gltf = await loader.loadAsync(`${base}library/${file}`);
      const root = gltf.scene;
      root.rotation.y = ((Number(slot.turn) || 0) * Math.PI) / 180;
      root.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(root);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const want = stats.kind === 'unit' ? stats.radius * 2 * 1.5 : stats.size * CELL * 0.92;
      const k = (want / Math.max(size.x, size.z, 1e-3)) * (Number(slot.scale) || 1);
      const fit = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
      const parts = [];
      root.traverse((o) => {
        if (!o.isMesh || o.isSkinnedMesh) return;
        const geometry = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(fit, o.matrixWorld));
        parts.push({ geometry, material: o.material });
      });
      if (!parts.length) return;
      slots[key] = { parts, credit: String(slot.credit ?? '').slice(0, 200), height: size.y * k };
      if (slot.credit) credits.push(`${stats.name}: ${String(slot.credit).slice(0, 200)}`);
    } catch {
      /* a broken file: the built-in look stays */
    }
  }));
  return { slots, credits };
}
