/**
 * A small construction kit: boxes, slabs, cylinders and gables with UVs in
 * metres (so a texture keeps one scale on every piece), each added to a
 * material's bucket with a transform and a tint; `build()` merges every
 * bucket into one mesh, so a whole village draws in a handful of calls.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** A transform from position, rotation (x, y, z radians) and scale. */
export function tf(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
}

/** Give every vertex a colour (the bucket's materials use vertex colours as a tint). */
function tint(geo, color) {
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    c[i * 3] = color.r;
    c[i * 3 + 1] = color.g;
    c[i * 3 + 2] = color.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

/** Keep only the attributes every merged piece shares. */
function tidy(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
}

export class Kit {
  constructor() {
    this.buckets = new Map();
  }

  /** Add a geometry (consumed) to a bucket, transformed by `m` (Matrix4) and tinted. */
  add(bucket, geo, m = null, color = '#ffffff') {
    if (m) geo.applyMatrix4(m);
    tint(geo, color instanceof THREE.Color ? color : new THREE.Color(color));
    if (!this.buckets.has(bucket)) this.buckets.set(bucket, []);
    this.buckets.get(bucket).push(tidy(geo));
    return this;
  }

  /** A box w×h×d, its base at y=0, UVs in metres / `uv`. */
  box(bucket, w, h, d, m, color, uv = 1) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    const a = g.attributes.uv;
    // Faces: +x, −x, +y, −y, +z, −z (four vertices each).
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) a.setXY(f * 4 + k, a.getX(f * 4 + k) * dims[f][0] / uv, a.getY(f * 4 + k) * dims[f][1] / uv);
    return this.add(bucket, g, m, color);
  }

  /** A cylinder (radius r0 at the bottom, r1 at the top), base at y=0. */
  cyl(bucket, r0, r1, h, m, color, seg = 10, uv = 1) {
    const g = new THREE.CylinderGeometry(r1, r0, h, seg, 1, false);
    g.translate(0, h / 2, 0);
    const a = g.attributes.uv;
    const circ = Math.PI * (r0 + r1);
    for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * circ / uv, a.getY(i) * h / uv);
    return this.add(bucket, g, m, color);
  }

  /**
   * A roof slab: a w (along x) by `len` (down the slope) sheet with thickness,
   * hinged at its top edge (y=0, z=0), sloping down toward +z by `pitch`, with
   * a little sag and up-turned eaves.
   */
  slab(bucket, w, len, thick, pitch, m, color, uv = 1, { sag = 0.12, curl = 0.18, segW = 10, segL = 6, under = null } = {}) {
    const top = new THREE.PlaneGeometry(w, len, segW, segL);
    // Plane is in XY; lay it down the slope.
    const pos = top.attributes.position;
    const uvs = top.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const v = pos.getY(i) / len + 0.5; // 0 at eave … 1 at ridge
      const along = (1 - v) * len;
      const s = Math.sin(((x / w) + 0.5) * Math.PI);
      const y = -Math.sin(pitch) * along - sag * s * Math.sin(v * Math.PI) + curl * Math.pow(1 - v, 3);
      const z = Math.cos(pitch) * along;
      pos.setXYZ(i, x, y + thick, z);
      uvs.setXY(i, (x + w / 2) / uv, along / uv);
    }
    top.computeVertexNormals();
    // Underside (made before the top is moved into place).
    const bottom = top.clone();
    this.add(bucket, top, m ? m.clone() : null, color);
    const bp = bottom.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setY(i, bp.getY(i) - thick);
    const idx = bottom.index.array;
    for (let i = 0; i < idx.length; i += 3) [idx[i], idx[i + 2]] = [idx[i + 2], idx[i]];
    bottom.computeVertexNormals();
    this.add(under ?? bucket, bottom, m ? m.clone() : null, color);
    return this;
  }

  /** A gable triangle (base w at y=0, apex at height h), facing +z, thickness t. */
  gable(bucket, w, h, t, m, color, uv = 1) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, h);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
    g.translate(0, 0, -t / 2);
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) / uv, a.getY(i) / uv);
    return this.add(bucket, g, m, color);
  }

  /** A beam from a to b (Vector3s), square section s. */
  beam(bucket, a, b, s, color, uv = 1, base = null) {
    const d = b.clone().sub(a);
    const len = d.length();
    const g = new THREE.BoxGeometry(s, len, s);
    const uvs = g.attributes.uv;
    const dims = [[s, len], [s, len], [s, s], [s, s], [s, len], [s, len]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) uvs.setXY(f * 4 + k, uvs.getX(f * 4 + k) * dims[f][0] / uv, uvs.getY(f * 4 + k) * dims[f][1] / uv);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
    if (base) m.premultiply(base);
    return this.add(bucket, g, m, color);
  }

  /** Merge every bucket into a mesh with its material (`materials[bucket]`). */
  build(materials, { shadows = true } = {}) {
    const group = new THREE.Group();
    for (const [name, list] of this.buckets) {
      const mat = materials[name];
      if (!mat || !list.length) continue;
      const geo = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = shadows && !mat.userData.noShadow;
      mesh.receiveShadow = true;
      mesh.name = name;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
}
