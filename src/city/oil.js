import * as THREE from 'three';
import { seeded, corridorClamp } from './marbles.js';
import { LAMP_FIELD_GLSL } from './nightlights.js';

/**
 * Oil for Kickrani: an item that spills a glossy black slick of oil on the
 * road behind your scooter — about 3.6 m across and 4.5 long, an irregular
 * puddle with a few splashes round it, spreading out in half a second. It
 * lies there about 13 s, or until three riders have crossed it.
 *
 * Where marbles make you wobble (and fall if fast or steering), oil spins
 * you out: no grip for 1.2 s while the scooter turns a full circle sliding
 * on the way it was going, then upright again with most of its speed gone
 * (`OIL.keep` of it left). No fall — unless the slide meets a wall, which is
 * the usual crash. The golden helmet takes it, as it takes a marble fall.
 * The wheels leave oily tracks for a few metres after.
 *
 * Pure rules (planSlick, oilAt, onSlick, spinAngle) for the tests;
 * `OilField` draws the slicks (each one mesh laid on the road's surface, a
 * wet black with a thin-film rainbow sheen); `OilTracks` the tyre tracks;
 * `squeal` the tyres' shriek, synthesised.
 *
 * Everyone in a room lays the same slick from the same plan (the spiller's
 * browser sends it), and each crossing is told to the room, so the three
 * riders it takes are counted the same everywhere.
 */
export const OIL = {
  width: 3.6, // m across (less in a narrow street: its half, as marbles)
  length: 4.6, // m along
  back: 2.6, // m behind the rider its middle lands
  spread: 0.55, // s it takes to spread out
  life: 13.5, // s it lies
  fade: 1.2, // s it takes to go (the last of its life, or after its third rider)
  riders: 3, // riders it spins before it is wiped off
  edge: 0.25, // the field's level at the slick's edge (oilAt)
  spin: 1.2, // s a spin-out lasts: no grip, a full turn
  keep: 0.3, // share of the speed left after a spin
  wallFall: 3, // m/s: spinning into a wall faster than this is a crash
  track: 5, // m of oily tyre track after
  own: 1.5 // s the spiller can't be caught by their own slick
};

/**
 * One slick, planned from the rider who spills it (at x, z going `heading`, 0 is north, −z): blobs of
 * oil [x, z, r] in the world, a big one in the middle, smaller ones round it and a few splashes, kept
 * in the street's band `lo`…`hi` metres across the line `pts` (as marbles: pourBand, corridorClamp).
 * Returns { blobs, x, z, r, x0, x1, z0, z1 } (the middle, the reach, the box round it).
 */
export function planSlick({ x, z, heading, seed = 1, pts = null, lo = -Infinity, hi = Infinity }) {
  const rand = seeded(seed);
  const fx = -Math.sin(heading);
  const fz = -Math.cos(heading);
  const rx = Math.cos(heading);
  const rz = -Math.sin(heading);
  // narrower where the street allows less
  const w = Math.max(1.6, Math.min(OIL.width, hi - lo));
  const sx = w / OIL.width;
  const cx = x - fx * OIL.back;
  const cz = z - fz * OIL.back;
  const local = [[0, 0, 1.75]];
  const n = 6;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + (rand() - 0.5) * 0.7;
    const d = 0.5 + rand() * 0.4;
    local.push([Math.cos(a) * (OIL.width / 2 - 0.75) * d, Math.sin(a) * (OIL.length / 2 - 0.8) * d, 0.85 + rand() * 0.45]);
  }
  // splashes: small drops a little way out
  for (let k = 0; k < 4; k++) {
    const a = rand() * Math.PI * 2;
    const d = 1.0 + rand() * 0.12;
    local.push([Math.cos(a) * (OIL.width / 2 - 0.2) * d, Math.sin(a) * (OIL.length / 2 - 0.2) * d, 0.32 + rand() * 0.16]);
  }
  const blobs = [];
  for (const [a, b, r0] of local) {
    const r = r0 * (0.75 + 0.25 * sx);
    let bx = cx + rx * a * sx - fx * b;
    let bz = cz + rz * a * sx - fz * b;
    if (pts && pts.length > 1) {
      let l = lo + r * 0.45;
      let h = hi - r * 0.45;
      if (l > h) l = h = (lo + hi) / 2;
      const c = corridorClamp(pts, bx, bz, l, h);
      bx = c.x;
      bz = c.z;
    }
    blobs.push([bx, bz, r]);
  }
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const [bx, bz, r] of blobs) {
    x0 = Math.min(x0, bx - r);
    x1 = Math.max(x1, bx + r);
    z0 = Math.min(z0, bz - r);
    z1 = Math.max(z1, bz + r);
  }
  const mx = (x0 + x1) / 2;
  const mz = (z0 + z1) / 2;
  return { blobs, x: mx, z: mz, r: Math.hypot(x1 - x0, z1 - z0) / 2, x0, x1, z0, z1 };
}

/** How much oil is at a point: the blobs' field (1 at a big blob's middle; OIL.edge is its edge), × `grow`. */
export function oilAt(slick, x, z, grow = 1) {
  if (x < slick.x0 || x > slick.x1 || z < slick.z0 || z > slick.z1) return 0;
  let f = 0;
  for (const [bx, bz, r] of slick.blobs) {
    const d2 = ((x - bx) ** 2 + (z - bz) ** 2) / (r * r);
    if (d2 < 1) f += (1 - d2) * (1 - d2);
  }
  return f * grow;
}

/** Whether a point is in the slick (past its soft edge). */
export function onSlick(slick, x, z, grow = 1) {
  return oilAt(slick, x, z, grow) >= OIL.edge;
}

/** How far a slick has spread (0–1) at `age` seconds, and how much is left as it goes (`left` s of its life). */
export function slickGrow(age, left) {
  const t = Math.max(0, Math.min(1, age / OIL.spread));
  const out = 1 - (1 - t) ** 3;
  return out * Math.max(0, Math.min(1, left / OIL.fade));
}

/**
 * A spin-out's turn so far (radians, the way it turns: `dir` ±1) `t` seconds in: quick at first,
 * easing out to one full turn at OIL.spin.
 */
export function spinAngle(t, dir = 1) {
  const k = Math.max(0, Math.min(1, t / OIL.spin));
  return dir * Math.PI * 2 * (1 - (1 - k) ** 2);
}

/** The speed left `t` s into a spin from `v0`: down to OIL.keep of it at the end. */
export function spinSpeed(v0, t) {
  const k = Math.max(0, Math.min(1, t / OIL.spin));
  return v0 * OIL.keep ** k;
}

/* ------------------------------------------------------------ drawing */

const FIELD_MAX = 2.5;

/** A slick's field as a texture over its box (green: the field / FIELD_MAX), for the shader's soft edge. */
function fieldTexture(slick, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const dx = slick.x1 - slick.x0;
  const dz = slick.z1 - slick.z0;
  for (let j = 0; j < size; j++) {
    const z = slick.z0 + ((j + 0.5) / size) * dz;
    for (let i = 0; i < size; i++) {
      const x = slick.x0 + ((i + 0.5) / size) * dx;
      const f = Math.min(1, oilAt(slick, x, z) / FIELD_MAX);
      const o = (j * size + i) * 4;
      const v = Math.round(f * 255);
      img.data[o] = v;
      img.data[o + 1] = v;
      img.data[o + 2] = v;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  // (row 0 is z0: not flipped, so v runs with z)
  t.flipY = false;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

const OIL_GLSL = /* glsl */ `
  uniform float uGrow;
  uniform float uNight;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyLow;
  varying vec3 vOilW;
  float oilDepth = 0.0;
  float oilHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float oilNoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(oilHash(i), oilHash(i + vec2(1.0, 0.0)), f.x), mix(oilHash(i + vec2(0.0, 1.0)), oilHash(i + vec2(1.0, 1.0)), f.x), f.y); }`;

/**
 * Every slick on the road: one mesh each, a grid laid on the road's surface (so it sits flat on a hill
 * too, pulled forward against the road — no z-fighting, no floating), drawn wet and black with a hard
 * gloss (the sun and the sky in it) and a thin-film rainbow swirling over it, brightest at the thin
 * edges and at a low angle; the lamps' pools in it by night. Its edge is soft, from the blobs' field.
 */
export class OilField {
  constructor(scene, uniforms = {}) {
    this.scene = scene;
    this.uniforms = uniforms;
    this.group = new THREE.Group();
    this.group.name = 'oil';
    this.meshes = new Map();
    scene.add(this.group);
  }

  _material(tex) {
    const m = new THREE.MeshPhysicalMaterial({
      color: '#07080a',
      roughness: 0.07,
      metalness: 0,
      // (the scene's studio light, turned well down: a black gloss, darker than the road, not a grey sheen)
      envMap: this.scene.environment ?? null,
      envMapIntensity: 0.15,
      iridescence: 0.7,
      iridescenceIOR: 1.45,
      iridescenceThicknessRange: [220, 640],
      alphaMap: tex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -14
    });
    const grow = { value: 0 };
    m.userData.grow = grow;
    const u = this.uniforms;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uGrow = grow;
      shader.uniforms.uNight = u.uNight ?? { value: 0 };
      shader.uniforms.uSkyTop = u.uSkyTop ?? { value: new THREE.Color('#5b8fd6') };
      shader.uniforms.uSkyLow = u.uSkyLow ?? { value: new THREE.Color('#bcd4ea') };
      shader.uniforms.uLamps = u.uLamps ?? { value: [] };
      const lamps = Boolean(u.uLamps);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vOilW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOilW = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${OIL_GLSL}\n${lamps ? LAMP_FIELD_GLSL : 'vec3 lampField(vec3 p) { return vec3(0.0); }'}`)
        // the soft, spreading edge: the field (from the texture) against its edge level, times how far it has spread
        .replace('#include <alphamap_fragment>', `
          float oilF = texture2D(alphaMap, vAlphaMapUv).g * ${FIELD_MAX.toFixed(1)} * uGrow;
          diffuseColor.a *= smoothstep(${(OIL.edge * 0.6).toFixed(3)}, ${(OIL.edge * 1.5).toFixed(3)}, oilF);
          oilDepth = smoothstep(0.3, 1.5, oilF);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          {
            vec3 Vv = normalize(vViewPosition);
            float cosV = clamp(dot(normalize(normal), Vv), 0.0, 1.0);
            float fres = pow(1.0 - cosV, 3.0);
            vec2 wp = vOilW.xz;
            // the film's thickness: swirls (warped noise), thinner toward the edge
            vec2 warp = vec2(oilNoise(wp * 0.55 + 3.1), oilNoise(wp * 0.55 - 7.7)) * 3.0;
            float n = oilNoise(wp * 1.1 + warp) * 0.7 + oilNoise(wp * 3.2 - warp) * 0.3;
            float edgeK = 1.0 - oilDepth;
            float thick = n * 1.6 + edgeK * 0.3;
            // interference: each colour's phase through the film, longer at a slant
            float opd = thick * 2.2 * (0.65 + 0.35 * cosV);
            vec3 film = 0.5 + 0.5 * cos(6.2832 * (opd * vec3(1.0, 1.24, 1.52) + vec3(0.0, 0.1, 0.2)));
            film = pow(clamp(film, 0.0, 1.0), vec3(1.8));
            // the colours in thin marbled swirls over a deep black (in patches), and round the thin edge;
            // more at a low angle
            float lines = pow(0.5 + 0.5 * sin(n * 22.0 + warp.x * 2.0), 8.0);
            float patchy = smoothstep(0.4, 0.75, oilNoise(wp * 0.7 - warp * 0.4));
            float amount = (lines * patchy * 0.8 + edgeK * edgeK * 0.3 * (0.25 + 0.95 * oilNoise(wp * 1.7 + warp))) * (0.25 + 0.9 * fres);
            vec3 skyR = mix(uSkyLow, uSkyTop, 0.35) * mix(0.55, 0.06, uNight);
            vec3 lampR = lampField(vOilW) * 0.12;
            totalEmissiveRadiance += film * amount * (skyR * 1.1 + lampR + 0.04);
            // and the sky itself, mirrored dark at a low angle (a wet, black gloss)
            totalEmissiveRadiance += (skyR * 0.1 + lampR * 0.3) * fres * oilDepth;
          }`);
    };
    m.customProgramCacheKey = () => `kick-oil-${lamps(u)}`;
    return m;
  }

  /** A slick laid in the world (`ground(x, z)`: the road's height there). */
  add(slick, ground) {
    const N = 14;
    const geo = new THREE.PlaneGeometry(1, 1, N, N);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const dx = slick.x1 - slick.x0;
    const dz = slick.z1 - slick.z0;
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i);
      const v = 1 - uv.getY(i);
      const x = slick.x0 + u * dx;
      const z = slick.z0 + v * dz;
      pos.setXYZ(i, x, ground(x, z) + 0.035, z);
      uv.setXY(i, u, v);
    }
    // (its +y (v) now runs to −z: laid down this way, it faces up)
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const tex = fieldTexture(slick);
    const mesh = new THREE.Mesh(geo, this._material(tex));
    mesh.renderOrder = 2;
    mesh.receiveShadow = true;
    mesh.userData.tex = tex;
    this.group.add(mesh);
    this.meshes.set(slick, mesh);
    return mesh;
  }

  /** Each frame: how far each has spread (or gone); slicks no longer listed are taken away. */
  update(slicks, now) {
    const live = new Set(slicks);
    for (const [s, mesh] of this.meshes) {
      if (live.has(s)) {
        mesh.material.userData.grow.value = slickGrow(now - s.born, s.until - now);
        // (the studio light it mirrors, as dim as the scene's own: next to nothing by night)
        mesh.material.envMapIntensity = (this.scene.environmentIntensity ?? 0.25) * 0.6;
        continue;
      }
      this._drop(mesh);
      this.meshes.delete(s);
    }
  }

  _drop(mesh) {
    this.group.remove(mesh);
    mesh.geometry.dispose();
    mesh.userData.tex?.dispose();
    mesh.material.dispose();
  }

  dispose() {
    for (const mesh of this.meshes.values()) this._drop(mesh);
    this.meshes.clear();
    this.scene.remove(this.group);
  }
}

function lamps(u) {
  return u.uLamps ? 1 : 0;
}

let trackTex = null;
/** A smear of oil (soft at the sides and ends), for the tracks. */
function smearTexture() {
  if (trackTex) return trackTex;
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 64;
  const g = c.getContext('2d');
  const img = g.createImageData(32, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 32; x++) {
      // a soft ellipse, solid in the middle
      const d = Math.hypot((x + 0.5 - 16) / 16, (y + 0.5 - 32) / 32);
      const a = Math.max(0, Math.min(1, (1 - d) / 0.55));
      const o = (y * 32 + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(a * a * (3 - 2 * a) * 255);
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  trackTex = new THREE.CanvasTexture(c);
  return trackTex;
}

/**
 * Oily tyre tracks: a dark, glossy smear where an oily wheel went (a few hundred, the oldest
 * reused), thinning as the oil wears off the tyre.
 */
export class OilTracks {
  constructor(scene, max = 360) {
    this.scene = scene;
    this.max = max;
    const geo = new THREE.PlaneGeometry(0.14, 0.42).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: '#0a0b0d', roughness: 0.12, metalness: 0.1, alphaMap: smearTexture(), transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -13 });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.renderOrder = 2;
    this.next = 0;
    this.laid = 0;
    this._o = new THREE.Object3D();
    scene.add(this.mesh);
  }

  /** A smear at (x, y, z) along `heading`, `k` (0–1) how oily the tyre still is, `len` m long (at least). */
  mark(x, y, z, heading, k = 1, len = 0.42) {
    const o = this._o;
    o.position.set(x, y + 0.03, z);
    o.rotation.set(0, heading, 0);
    o.scale.set(0.5 + 0.7 * k, 1, Math.max(0.6 + 0.5 * k, len / 0.42));
    o.updateMatrix();
    this.mesh.setMatrixAt(this.next, o.matrix);
    this.next = (this.next + 1) % this.max;
    this.mesh.count = Math.max(this.mesh.count, this.next || this.max);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.laid++;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

let noiseBuf = null;
/**
 * Tyres squealing as a scooter spins out on oil: a band of noise that rises and falls in pitch with
 * the turn (synthesised), from a side (`pan`) at a level, over `dur` seconds.
 */
export function squeal(audio, { gain = 0.5, pan = 0, dur = OIL.spin } = {}) {
  if (!audio) return false;
  if (!noiseBuf || noiseBuf.sampleRate !== audio.sampleRate) {
    noiseBuf = audio.createBuffer(1, Math.floor(audio.sampleRate * 1.5), audio.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = audio.currentTime;
  const src = audio.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const out = audio.createGain();
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.exponentialRampToValueAtTime(0.3 * gain, t0 + 0.05);
  out.gain.setValueAtTime(0.3 * gain, t0 + dur * 0.6);
  out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = out;
  if (audio.createStereoPanner) {
    const p = audio.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(p);
    node = p;
  }
  node.connect(audio.destination);
  for (const [f0, q, v] of [[2100, 12, 1], [3300, 16, 0.6]]) {
    const f = audio.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q;
    // the pitch wavers with the turn: up, down, up
    f.frequency.setValueAtTime(f0 * 0.85, t0);
    f.frequency.linearRampToValueAtTime(f0 * 1.12, t0 + dur * 0.3);
    f.frequency.linearRampToValueAtTime(f0 * 0.92, t0 + dur * 0.6);
    f.frequency.linearRampToValueAtTime(f0 * 0.75, t0 + dur);
    const g = audio.createGain();
    g.gain.value = v;
    src.connect(f).connect(g).connect(out);
  }
  src.start(t0);
  src.stop(t0 + dur + 0.05);
  return true;
}
