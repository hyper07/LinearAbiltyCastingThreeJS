/**
 * Chunked GPU grass: a camera-following ring of n×n clumps (placed in the
 * vertex shader from gl_InstanceID) split into parts×parts chunks, each its
 * own draw, so chunks behind the camera, past the grass's reach or inside a
 * ring's hole are never submitted. The shader reads `uChunk` = (first cell x,
 * first cell z, chunk width) instead of deriving the cell from uN alone:
 *
 *   float ix = uChunk.x + mod(id, uChunk.z);
 *   float iz = uChunk.y + floor(id / uChunk.z);
 */
import * as THREE from 'three';

/** Split an n-wide grid into parts×parts chunks: the chunk width, the (rounded) n, and each chunk's first cell. */
export function splitGrid(n, parts) {
  const cw = Math.max(1, Math.round(n / parts));
  const cells = [];
  for (let j = 0; j < parts; j++) for (let i = 0; i < parts; i++) cells.push([i * cw, j * cw]);
  return { cw, n: cw * parts, cells };
}

/** The GLSL that maps an instance to its cell through `uChunk`. */
export const CHUNK_PARS = 'uniform vec3 uChunk;\n';
export const CHUNK_CELL = 'float ix = uChunk.x + mod(id, uChunk.z);\nfloat iz = uChunk.y + floor(id / uChunk.z);';
export const PLAIN_CELL = 'float ix = mod(id, uN);\nfloat iz = floor(id / uN);';

/** Per frame: which ring chunks to draw for this camera. */
export class ChunkCull {
  constructor() {
    this.frustum = new THREE.Frustum();
    this.m = new THREE.Matrix4();
    this.box = new THREE.Box3();
    this.x = 0;
    this.z = 0;
    this.y = 0;
  }

  setCamera(camera) {
    this.m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.m);
    this.x = camera.position.x;
    this.z = camera.position.z;
    this.y = camera.position.y;
  }

  /**
   * Is the chunk of cells [c0, c0 + cw) of an n-grid following `origin`
   * (snapped to `spacing`) worth drawing? Not past `radius` (m, from the
   * camera), not wholly inside `inner`, and in view. `heightAt` (optional)
   * bounds it vertically; else the camera's height ± 60 m.
   */
  visible(origin, spacing, n, c0x, c0z, cw, { radius, inner = 0, heightAt = null, pad = 2 }) {
    const bx = Math.floor(origin.x / spacing) - n * 0.5;
    const bz = Math.floor(origin.z / spacing) - n * 0.5;
    const x0 = (bx + c0x) * spacing;
    const z0 = (bz + c0z) * spacing;
    const x1 = x0 + (cw + 1) * spacing;
    const z1 = z0 + (cw + 1) * spacing;
    const nx = Math.max(x0, Math.min(this.x, x1));
    const nz = Math.max(z0, Math.min(this.z, z1));
    if (Math.hypot(nx - this.x, nz - this.z) > radius) return false;
    if (inner > 0) {
      const fx = Math.max(Math.abs(x0 - this.x), Math.abs(x1 - this.x));
      const fz = Math.max(Math.abs(z0 - this.z), Math.abs(z1 - this.z));
      if (Math.hypot(fx, fz) < inner - 2) return false;
    }
    let lo = this.y - 60;
    let hi = this.y + 60;
    if (heightAt) {
      lo = Infinity;
      hi = -Infinity;
      for (const [sx, sz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [(x0 + x1) / 2, (z0 + z1) / 2]]) {
        const h = heightAt(sx, sz);
        if (h < lo) lo = h;
        if (h > hi) hi = h;
      }
      lo -= 3;
      hi += pad + 3;
    }
    this.box.min.set(x0, lo, z0);
    this.box.max.set(x1, hi, z1);
    return this.frustum.intersectsBox(this.box);
  }
}
