/**
 * Never lose the buddy behind a bush: anything drawn in front of the buddy,
 * inside a soft circle round it on screen, is dithered away. The circle
 * follows the buddy every frame (one shared uniform); the creatures, the
 * ground and see-through things are left alone.
 *
 *   patchCutout(group)               once a group of props is built
 *   updateCutout(camera, renderer, point, height, on)   every frame
 */
import * as THREE from 'three';

/** xy: centre in drawing-buffer pixels, z: radius in pixels (0 = off), w: depth the buddy is at. */
export const cutUniform = { value: new THREE.Vector4(0, 0, 0, 0) };
const done = new WeakSet();

const CODE = `
  if (uArcCut.z > 0.0 && gl_FragCoord.z < uArcCut.w) {
    vec2 dpx = (gl_FragCoord.xy - uArcCut.xy) * vec2(1.0, 0.78);
    float rr = length(dpx) / uArcCut.z;
    if (rr < 1.0) {
      vec2 q = mod(floor(gl_FragCoord.xy), 4.0);
      float bayer = (mod(q.x + q.y * 4.0 * 0.0 + (q.x * 2.0 + q.y * 3.0), 4.0) + mod(q.x * 3.0 + q.y, 4.0) * 4.0) / 16.0;
      if (smoothstep(1.0, 0.55, rr) * 0.92 > bayer) discard;
    }
  }`;

function patch(m) {
  if (done.has(m) || m.transparent || m.isShaderMaterial || m.isRawShaderMaterial || m.userData.noCut) return;
  done.add(m);
  const prev = m.onBeforeCompile;
  const prevKey = m.customProgramCacheKey();
  m.onBeforeCompile = function (shader, renderer) {
    prev.call(this, shader, renderer);
    shader.uniforms.uArcCut = cutUniform;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec4 uArcCut;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>${CODE}`);
  };
  m.customProgramCacheKey = () => `${prevKey}|arc-cut`;
  m.needsUpdate = true;
}

/** Let everything in `root` be cut away round the buddy (skips creatures and see-through materials). */
export function patchCutout(root) {
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.userData.noCut) return;
    for (const m of [].concat(o.material)) if (m) patch(m);
  });
}

const v = new THREE.Vector3(), w = new THREE.Vector3(), size = new THREE.Vector2();
/** Aim the cut at the buddy: `point` its middle, `height` how tall it is (m). */
export function updateCutout(camera, renderer, point, height, on = true) {
  if (!on) {
    cutUniform.value.z = 0;
    return;
  }
  renderer.getDrawingBufferSize(size);
  v.copy(point).project(camera);
  const x = (v.x * 0.5 + 0.5) * size.x, y = (v.y * 0.5 + 0.5) * size.y;
  w.copy(point).addScaledVector(camera.up, height * 0.5).project(camera);
  const px = Math.abs(w.y - v.y) * 0.5 * size.y;
  // The cut starts a little in front of the buddy, so the ground at its feet stays.
  const toCam = camera.position.clone().sub(point);
  const d = toCam.length();
  w.copy(point).addScaledVector(toCam.normalize(), Math.min(1.4, d * 0.5)).project(camera);
  cutUniform.value.set(x, y, Math.max(56, px * 2.2), w.z * 0.5 + 0.5);
}
