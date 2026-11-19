/**
 * Kindlewatch's renderer: flat painted art, lit like a stage.
 *
 *   1. G-buffer (three targets at once): the ground (painted tileable stone,
 *      snow and ice blended by masks, drift edges inked in the shader), flat
 *      decals, ground telegraphs, then every standing sprite in y order from
 *      one atlas — albedo, normal + elevation, glow + gloss.
 *   2. Light: a cool moon and sky, then up to MAX_LIGHTS warm point lights,
 *      each with soft shadows marched through a signed distance field of the
 *      blocks (their heights too, so a brazier's flame clears its own bowl).
 *   3. Effects straight onto the lit picture (embers, sparks, smears, flames).
 *   4. Bloom, then tone, grade, vignette and grain to the screen.
 *
 * Projection: a point on the ground (x, y) at height h is drawn at
 * (x, y + h) — the top-down oblique of classic action games. Everything that
 * stands remembers its foot line, so the light pass can put each pixel back
 * where it really is.
 */
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export const MAX_LIGHTS = 20;
export const ELEV_RANGE = 8; // tiles of elevation the G-buffer can hold

const FULL_VERT = /* glsl */ `
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`;

/* ------------------------------------------------------------ sprite batch (G-buffer) */

const SPRITE_VERT = /* glsl */ `
uniform vec4 uView;
in vec2 aUv; in vec4 aTint; in vec4 aInfo; in vec4 aBase;
out vec2 vUv; out vec4 vTint; out vec4 vInfo; out vec4 vBase; out vec2 vWorld;
void main() {
  vUv = aUv; vTint = aTint; vInfo = aInfo; vBase = aBase; vWorld = position.xy;
  vec2 ndc = (position.xy - uView.xy) / uView.zw * 2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);
}`;

const SPRITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap; uniform sampler2D uNormal;
in vec2 vUv; in vec4 vTint; in vec4 vInfo; in vec4 vBase; in vec2 vWorld;
layout(location = 0) out vec4 oAlb;
layout(location = 1) out vec4 oNrm;
layout(location = 2) out vec4 oMat;
void main() {
  vec4 c = texture(uMap, vUv);
  float a = c.a * vTint.a;
  if (a < 0.03) discard;
  vec3 col = c.rgb * vTint.rgb;
  vec4 n = texture(uNormal, vUv);
  vec2 nxy = n.xy * 2.0 - 1.0;
  nxy.x *= vInfo.z;                 // mirrored sprites mirror their normals
  float cr = cos(vInfo.y), sr = sin(vInfo.y);
  nxy = vec2(nxy.x * cr - nxy.y * sr, nxy.x * sr + nxy.y * cr);
  float top = n.z;
  // vBase: x foot line, y top-face height, z flat (lies on the ground), w gloss
  float elev = mix(max(0.0, vWorld.y - vBase.x), vBase.y, top) * (1.0 - vBase.z);
  float flash = vInfo.x;
  col = mix(col, vec3(1.0, 0.95, 0.88), flash * 0.85);
  float glow = n.w + vInfo.w + flash * 0.35;
  if (vBase.z > 0.5) nxy *= 0.6;
  oAlb = vec4(sqrt(clamp(col, 0.0, 1.0)), a);
  oNrm = vec4(nxy * 0.5 + 0.5, elev / ${ELEV_RANGE.toFixed(1)}, a);
  oMat = vec4(clamp(glow, 0.0, 1.0), vBase.w, 0.0, a);
}`;

const FLOATS = 16; // per vertex

/**
 * Quads from the atlas, sorted back to front by their foot line, drawn in
 * one call. `push(frame, x, y, opts)`: x, y the foot point on the ground;
 * opts: sx, sy, rot, flip, z (lift off the ground), tint [r,g,b], alpha,
 * flash, glow, gloss, top (height of a top face), flat, key (sort override).
 */
export class SpriteBatch {
  constructor(atlasTex, normalTex, capacity = 6000, { sorted = true } = {}) {
    this.capacity = capacity;
    this.sorted = sorted;
    this.data = new Float32Array(capacity * 4 * FLOATS);
    const index = new Uint32Array(capacity * 6);
    for (let i = 0; i < capacity; i++) index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    const geo = new THREE.BufferGeometry();
    const buf = new THREE.InterleavedBuffer(this.data, FLOATS).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', new THREE.InterleavedBufferAttribute(buf, 2, 0));
    geo.setAttribute('aUv', new THREE.InterleavedBufferAttribute(buf, 2, 2));
    geo.setAttribute('aTint', new THREE.InterleavedBufferAttribute(buf, 4, 4));
    geo.setAttribute('aInfo', new THREE.InterleavedBufferAttribute(buf, 4, 8));
    geo.setAttribute('aBase', new THREE.InterleavedBufferAttribute(buf, 4, 12));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    this.buffer = buf;
    this.geo = geo;
    this.uView = { value: new THREE.Vector4() };
    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: SPRITE_VERT,
      fragmentShader: SPRITE_FRAG,
      uniforms: { uMap: { value: atlasTex }, uNormal: { value: normalTex }, uView: this.uView },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.items = [];
    this.pool = [];
    this.count = 0;
  }

  clear() {
    for (const it of this.items) this.pool.push(it);
    this.items.length = 0;
  }

  push(f, x, y, o = {}) {
    const it = this.pool.pop() ?? {};
    it.f = f;
    it.x = x;
    it.y = y;
    it.sx = o.sx ?? 1;
    it.sy = o.sy ?? 1;
    it.rot = o.rot ?? 0;
    it.flip = o.flip ? -1 : 1;
    it.z = o.z ?? 0;
    it.r = o.tint?.[0] ?? 1;
    it.g = o.tint?.[1] ?? 1;
    it.b = o.tint?.[2] ?? 1;
    it.a = o.alpha ?? 1;
    it.flash = o.flash ?? 0;
    it.glow = o.glow ?? 0;
    it.gloss = o.gloss ?? 0;
    it.top = o.top ?? 0;
    it.flat = o.flat ? 1 : 0;
    it.base = o.base ?? y;
    it.key = o.key ?? y;
    it.n = this.items.length;
    this.items.push(it);
    return it;
  }

  /** Build the vertex data (sorted north to south) for this frame. */
  upload() {
    const items = this.items;
    if (this.sorted) items.sort((a, b) => b.key - a.key || a.n - b.n);
    const d = this.data;
    let q = 0;
    for (const it of items) {
      if (q >= this.capacity) break;
      const f = it.f;
      const l = -f.ox * it.sx;
      const r = (f.w - f.ox) * it.sx;
      const bo = -f.oy * it.sy;
      const t = (f.h - f.oy) * it.sy;
      const c = Math.cos(it.rot);
      const s = Math.sin(it.rot);
      const px = it.x;
      const py = it.y + it.z;
      // corners: bl, br, tr, tl
      const fl = it.flip < 0;
      const u0 = fl ? f.u1 : f.u0;
      const u1 = fl ? f.u0 : f.u1;
      const cs = [[l, bo, u0, f.v0], [r, bo, u1, f.v0], [r, t, u1, f.v1], [l, t, u0, f.v1]];
      for (let k = 0; k < 4; k++) {
        const [lx, ly, u, v] = cs[k];
        const o = (q * 4 + k) * FLOATS;
        d[o] = px + lx * c - ly * s;
        d[o + 1] = py + lx * s + ly * c;
        d[o + 2] = u;
        d[o + 3] = v;
        d[o + 4] = it.r;
        d[o + 5] = it.g;
        d[o + 6] = it.b;
        d[o + 7] = it.a;
        d[o + 8] = it.flash;
        d[o + 9] = it.rot;
        d[o + 10] = it.flip;
        d[o + 11] = it.glow;
        d[o + 12] = it.base;
        d[o + 13] = it.top;
        d[o + 14] = it.flat;
        d[o + 15] = it.gloss;
      }
      q++;
    }
    this.count = q;
    this.buffer.needsUpdate = true;
    this.buffer.clearUpdateRanges();
    this.buffer.addUpdateRange(0, q * 4 * FLOATS);
    this.geo.setDrawRange(0, q * 6);
  }
}

/* ------------------------------------------------------------ telegraphs (G-buffer, glowing on the floor) */

const TELE_VERT = /* glsl */ `
uniform vec4 uView;
in vec2 aLocal; in vec4 aShape; in vec4 aColor;
out vec2 vLocal; out vec4 vShape; out vec4 vColor;
void main() {
  vLocal = aLocal; vShape = aShape; vColor = aColor;
  vec2 ndc = (position.xy - uView.xy) / uView.zw * 2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);
}`;

/* aShape: x kind (0 circle, 1 arc, 2 line), y size (radius / length), z spread (arc radians / line width), w k (0…1 fill) */
const TELE_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
in vec2 vLocal; in vec4 vShape; in vec4 vColor;
layout(location = 0) out vec4 oAlb;
layout(location = 1) out vec4 oNrm;
layout(location = 2) out vec4 oMat;
void main() {
  float kind = vShape.x, size = vShape.y, spread = vShape.z, k = clamp(vShape.w, 0.0, 1.0);
  float inside = 0.0, edge = 0.0, fill = 0.0;
  float aa = fwidth(length(vLocal)) * 1.5;
  if (kind < 0.5) {
    float r = length(vLocal);
    inside = 1.0 - smoothstep(size - aa, size, r);
    edge = inside * smoothstep(size - 0.16 - aa, size - 0.16, r);
    fill = 1.0 - smoothstep(size * k - aa, size * k, r);
  } else if (kind < 1.5) {
    float r = length(vLocal);
    float ang = abs(atan(vLocal.y, vLocal.x));
    float inA = 1.0 - smoothstep(spread * 0.5 - 0.02, spread * 0.5, ang);
    inside = inA * (1.0 - smoothstep(size - aa, size, r));
    edge = inside * max(smoothstep(size - 0.16 - aa, size - 0.16, r), 1.0 - smoothstep(spread * 0.5 - 0.06, spread * 0.5 - 0.04, ang));
    fill = inside * (1.0 - smoothstep(size * k - aa, size * k, r));
  } else {
    float along = vLocal.x, across = abs(vLocal.y);
    inside = step(0.0, along) * (1.0 - smoothstep(size - aa, size, along)) * (1.0 - smoothstep(spread * 0.5 - aa, spread * 0.5, across));
    edge = inside * smoothstep(spread * 0.5 - 0.07 - aa, spread * 0.5 - 0.07, across) * step(0.45, fract(along * 2.2));
    fill = inside * (1.0 - smoothstep(size * k - aa, size * k, along));
  }
  // Painted look: diagonal hatching in the fill, a bright rim, a pulse as the blow nears.
  float hatch = 0.5 + 0.5 * sin((gl_FragCoord.x + gl_FragCoord.y) * 0.35);
  float a = inside * (0.1 + fill * (0.16 + hatch * 0.08)) + edge * 0.55;
  a *= vColor.a;
  if (a < 0.01) discard;
  float pulse = 0.75 + 0.25 * sin(uTime * 22.0) * k;
  vec3 col = vColor.rgb;
  oAlb = vec4(sqrt(col), a);
  oNrm = vec4(0.5, 0.5, 0.0, a);
  oMat = vec4((0.12 + edge * 0.2) * pulse, 0.0, 0.0, a);
}`;

export class TelegraphBatch {
  constructor(capacity = 64) {
    this.capacity = capacity;
    this.stride = 12;
    this.data = new Float32Array(capacity * 4 * this.stride);
    const index = new Uint16Array(capacity * 6);
    for (let i = 0; i < capacity; i++) index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    const geo = new THREE.BufferGeometry();
    const buf = new THREE.InterleavedBuffer(this.data, this.stride).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', new THREE.InterleavedBufferAttribute(buf, 2, 0));
    geo.setAttribute('aLocal', new THREE.InterleavedBufferAttribute(buf, 2, 2));
    geo.setAttribute('aShape', new THREE.InterleavedBufferAttribute(buf, 4, 4));
    geo.setAttribute('aColor', new THREE.InterleavedBufferAttribute(buf, 4, 8));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    this.buffer = buf;
    this.geo = geo;
    this.uView = { value: new THREE.Vector4() };
    this.uTime = { value: 0 };
    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: TELE_VERT,
      fragmentShader: TELE_FRAG,
      uniforms: { uView: this.uView, uTime: this.uTime },
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.n = 0;
  }

  clear() {
    this.n = 0;
  }

  /** shape: { kind: 'circle'|'arc'|'line', x, y, angle, r|len, spread|width, k }, color [r,g,b,a] */
  push(s, color = [1, 0.35, 0.15, 1]) {
    if (this.n >= this.capacity) return;
    const kind = s.kind === 'circle' ? 0 : s.kind === 'arc' ? 1 : 2;
    const size = s.r ?? s.len ?? 1;
    const spread = s.kind === 'arc' ? s.spread : s.width ?? 0.3;
    const ext = kind === 2 ? Math.max(size, spread) + 0.2 : size + 0.2;
    const ang = s.angle ?? 0;
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    const corners = kind === 2 ? [[-0.1, -spread / 2 - 0.1], [size + 0.1, -spread / 2 - 0.1], [size + 0.1, spread / 2 + 0.1], [-0.1, spread / 2 + 0.1]] : [[-ext, -ext], [ext, -ext], [ext, ext], [-ext, ext]];
    for (let k = 0; k < 4; k++) {
      const [lx, ly] = corners[k];
      const o = (this.n * 4 + k) * this.stride;
      this.data[o] = s.x + lx * c - ly * sn;
      this.data[o + 1] = s.y + lx * sn + ly * c;
      this.data[o + 2] = lx;
      this.data[o + 3] = ly;
      this.data[o + 4] = kind;
      this.data[o + 5] = size;
      this.data[o + 6] = spread;
      this.data[o + 7] = s.k ?? 0;
      this.data[o + 8] = color[0];
      this.data[o + 9] = color[1];
      this.data[o + 10] = color[2];
      this.data[o + 11] = color[3] ?? 1;
    }
    this.n++;
  }

  upload() {
    this.buffer.needsUpdate = true;
    this.buffer.clearUpdateRanges();
    this.buffer.addUpdateRange(0, this.n * 4 * this.stride);
    this.geo.setDrawRange(0, this.n * 6);
  }
}

/* ------------------------------------------------------------ the ground */

const GROUND_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMask, uStone, uStoneN, uSnow, uSnowN, uIce, uIceN, uDirt, uDirtN, uNoise;
uniform vec4 uView; uniform vec2 uMap; uniform float uRepeat;
in vec2 vUv;
layout(location = 0) out vec4 oAlb;
layout(location = 1) out vec4 oNrm;
layout(location = 2) out vec4 oMat;
vec4 M(vec2 p) { return texture(uMask, p / uMap); }
void main() {
  vec2 p = uView.xy + vUv * uView.zw;
  vec4 m = M(p);
  vec2 t = p / uRepeat;
  vec4 n1 = texture(uNoise, p * 0.06);
  vec4 n2 = texture(uNoise, p * 0.23 + 0.37);
  vec4 n3 = texture(uNoise, p * 0.9 + 0.11);
  // Flagstones, stained and varied; bare frozen earth where the paving is gone.
  vec3 stone = texture(uStone, t).rgb;
  vec4 sN = texture(uStoneN, t);
  stone *= mix(vec3(0.86, 0.9, 1.02), vec3(1.06, 1.02, 0.98), n1.r);
  stone = mix(stone, stone * vec3(0.82, 0.86, 0.95), smoothstep(0.55, 0.8, n2.b) * 0.6);
  vec4 n0 = texture(uNoise, p * 0.021 + 0.5);
  stone *= 0.86 + n0.r * 0.28;
  stone = mix(stone, stone * vec3(1.06, 0.98, 0.9), smoothstep(0.5, 0.8, n0.g) * 0.5);
  float worn = smoothstep(0.42, 0.7, texture(uNoise, p * 0.045 + 0.13).g);
  vec3 smoothStone = vec3(0.12, 0.124, 0.15) * (0.9 + n2.r * 0.2);
  stone = mix(stone, smoothStone, worn * 0.5);
  sN = mix(sN, vec4(0.5, 0.5, 0.7, 1.0), worn * 0.6);
  vec2 dt = t * 1.37 + 0.21;
  float earth = smoothstep(0.42, 0.58, m.b + (n2.g - 0.5) * 0.5) * 0.85;
  vec3 col = mix(stone, texture(uDirt, dt).rgb, earth);
  vec4 baseN = mix(sN, texture(uDirtN, dt), earth);
  vec2 nxy = baseN.xy * 2.0 - 1.0;
  float hgt = baseN.z;
  float gloss = 0.0;
  // Snow: it fills the cracks first, then buries the stones; a crisp painted edge with an ink line outside it.
  float sm = m.r + (n2.r - 0.5) * 0.22 + (n1.b - 0.5) * 0.12;
  float e = sm - hgt * 0.2;
  const float TH = 0.36;
  float fw = max(fwidth(e), 1e-4);
  float px = (e - TH) / fw;               // pixels from the snow's edge (+ inside)
  float cover = smoothstep(-0.8, 0.8, px);
  vec2 sg = vec2(M(p + vec2(0.3, 0.0)).r - M(p - vec2(0.3, 0.0)).r, M(p + vec2(0.0, 0.3)).r - M(p - vec2(0.0, 0.3)).r) / 0.6;
  vec3 snow = texture(uSnow, t * 0.7).rgb;
  vec4 snN = texture(uSnowN, t * 0.7);
  float depth = smoothstep(TH, TH + 0.35, e);
  snow *= mix(0.78, 1.04, depth);
  vec2 snowN = (snN.xy * 2.0 - 1.0) * 0.8 - sg * 1.6 * (1.0 - depth * 0.7);
  // A rounded lip just inside the edge catches light; the floor just outside darkens under the drift.
  float lip = smoothstep(0.0, 3.0, px) * (1.0 - smoothstep(3.0, 10.0, px));
  snowN += normalize(sg + 1e-5) * -0.35 * lip;
  snow = mix(snow, snow * 1.08, lip * 0.5);
  float under = (1.0 - smoothstep(-14.0, -1.0, -abs(px))) ;
  col *= 1.0 - 0.28 * (1.0 - smoothstep(-16.0, 0.0, px)) * step(px, 0.0) * smoothstep(-16.0, -2.0, px);
  float inkS = smoothstep(-4.2, -3.0, px) * (1.0 - smoothstep(-0.6, 0.6, px));
  col = mix(col, snow, cover);
  nxy = mix(nxy, snowN, cover);
  // Ice: blue glass with streaks and cracks, an inked rim.
  float im = m.g + (n2.a - 0.5) * 0.18;
  float fwi = max(fwidth(im), 1e-4);
  float ipx = (im - 0.5) / fwi;
  float ice = smoothstep(-0.8, 0.8, ipx);
  vec3 iceC = texture(uIce, t * 0.8).rgb;
  vec4 iN = texture(uIceN, t * 0.8);
  iceC *= mix(vec3(0.82, 0.9, 1.0), vec3(1.04, 1.04, 1.0), smoothstep(0.5, 0.9, im));
  iceC = mix(iceC, vec3(dot(iceC, vec3(0.33))) * vec3(0.95, 1.0, 1.08), 0.3);
  float inkI = smoothstep(-4.5, -3.0, ipx) * (1.0 - smoothstep(-0.6, 0.6, ipx));
  col = mix(col, iceC, ice);
  nxy = mix(nxy, (iN.xy * 2.0 - 1.0) * 0.6, ice);
  gloss = ice * 0.9;
  vec3 ink = vec3(0.07, 0.055, 0.1);
  col = mix(col, ink, max(inkS * 0.85, inkI * 0.9));
  // Under the walls: the dark between blocks.
  float wall = smoothstep(0.35, 0.75, m.a);
  col = mix(col, vec3(0.035, 0.03, 0.06), wall);
  oAlb = vec4(sqrt(clamp(col, 0.0, 1.0)), 1.0);
  oNrm = vec4(clamp(nxy * 0.5 + 0.5, 0.0, 1.0), 0.0, 1.0);
  oMat = vec4(0.0, gloss, 0.0, 1.0);
}`;

/* ------------------------------------------------------------ lighting */

const LIGHT_FRAG = /* glsl */ `
precision highp float;
#define MAXL ${MAX_LIGHTS}
uniform sampler2D tAlb, tNrm, tMat, tSdf;
uniform vec4 uView; uniform vec2 uMap;
uniform vec4 uLP[MAXL];   // x, y, height, radius
uniform vec4 uLC[MAXL];   // rgb (intensity in), w: 1 casts shadows
uniform int uCount;
uniform vec3 uSkyTop, uSkySide, uMoonDir, uMoonCol;
uniform float uBands;
in vec2 vUv;
out vec4 oColor;
vec3 S(vec2 p) { return texture(tSdf, p / uMap).rgb; }  // r: distance to a block (tiles), g: block height here, b: tallest block near
float shadowTo(vec3 P, vec3 L) {
  vec2 d2 = L.xy - P.xy;
  float total = length(d2);
  if (total < 0.05) return 1.0;
  vec2 dir = d2 / total;
  float t = 0.03;
  // Leave the block this pixel belongs to.
  for (int i = 0; i < 6; i++) { float s = S(P.xy + dir * t).r; if (s > 0.0) break; t += max(-s, 0.05); }
  float res = 1.0;
  for (int i = 0; i < 28; i++) {
    if (t >= total - 0.15) break;
    vec2 q = P.xy + dir * t;
    vec3 s = S(q);
    float rayH = mix(P.z, L.z, t / total);
    if (s.r < 0.0 && s.g > rayH) return 0.0;
    if (s.b > rayH) res = min(res, 4.0 * s.r / t);
    t += clamp(s.r, 0.06, 1.5);
  }
  res = clamp(res, 0.0, 1.0);
  return res * res * (3.0 - 2.0 * res);
}
float moonShadow(vec3 P) {
  vec2 dir = normalize(uMoonDir.xy);
  float slope = uMoonDir.z / max(length(uMoonDir.xy), 1e-3);
  float t = 0.03;
  for (int i = 0; i < 6; i++) { float s = S(P.xy + dir * t).r; if (s > 0.0) break; t += max(-s, 0.05); }
  float res = 1.0;
  for (int i = 0; i < 14; i++) {
    vec2 q = P.xy + dir * t;
    vec3 s = S(q);
    float rayH = P.z + t * slope;
    if (rayH > 3.0) break;
    if (s.r < 0.0 && s.g > rayH) return 0.0;
    if (s.b > rayH) res = min(res, 3.0 * s.r / t);
    t += clamp(s.r, 0.08, 1.0);
  }
  res = clamp(res, 0.0, 1.0);
  return res * res * (3.0 - 2.0 * res);
}
void main() {
  vec4 A = texture(tAlb, vUv);
  vec4 N = texture(tNrm, vUv);
  vec4 Mt = texture(tMat, vUv);
  vec3 alb = A.rgb * A.rgb;
  vec2 nxy = N.xy * 2.0 - 1.0;
  vec3 n = vec3(nxy, sqrt(max(0.0, 1.0 - dot(nxy, nxy))));
  float elev = N.z * ${ELEV_RANGE.toFixed(1)};
  vec2 sp = uView.xy + vUv * uView.zw;
  vec3 P = vec3(sp.x, sp.y - elev, elev);
  vec3 sdfHere = S(P.xy);
  // Sky: cold from above, colder from the side; corners and the feet of blocks darker.
  float ao = elev < 0.08 ? mix(0.42, 1.0, smoothstep(0.0, 1.1, sdfHere.r)) : 1.0;
  vec3 amb = mix(uSkySide, uSkyTop, n.z * n.z) * ao;
  float mn = max(dot(n, normalize(uMoonDir)), 0.0);
  vec3 moon = uMoonCol * mn * moonShadow(P);
  vec3 warm = vec3(0.0);
  vec3 spec = vec3(0.0);
  vec3 V = normalize(vec3(0.0, -0.45, 1.0));
  for (int i = 0; i < MAXL; i++) {
    if (i >= uCount) break;
    vec4 lp = uLP[i];
    vec3 d = lp.xyz - P;
    float dist = length(d);
    if (dist > lp.w) continue;
    vec3 l = d / dist;
    float x = dist / lp.w;
    float att = (1.0 - x) * (1.0 - x) * (1.0 + 2.0 * x);
    att *= smoothstep(0.0, 1.2, dist) * 0.35 + 0.65;
    float ndl = dot(n, l);
    ndl = clamp(ndl * 0.7 + 0.3, 0.0, 1.0);
    float sh = uLC[i].w > 0.5 ? shadowTo(P + vec3(n.xy * 0.04, 0.0), lp.xyz) : 1.0;
    vec3 c = uLC[i].rgb * att * sh;
    warm += c * ndl;
    if (Mt.g > 0.01) spec += c * pow(max(dot(n, normalize(l + V)), 0.0), 40.0) * Mt.g * 2.5;
  }
  // A touch of painted banding: light falls off in soft steps.
  float lum = dot(warm, vec3(0.3, 0.5, 0.2));
  float stepped = (floor(lum * uBands) + smoothstep(0.35, 0.65, fract(lum * uBands))) / uBands;
  warm *= mix(1.0, stepped / max(lum, 1e-4), 0.12 * step(0.02, lum));
  vec3 col = alb * (amb + moon + warm) + spec + alb * Mt.r * 3.2;
  if (A.a < 0.01) col = vec3(0.0);
  oColor = vec4(col, 1.0);
}`;

/* ------------------------------------------------------------ effects (straight onto the lit picture) */

const FX_VERT = /* glsl */ `
uniform vec4 uView;
in vec2 aUv; in vec4 aColor;
out vec2 vUv; out vec4 vColor;
void main() {
  vUv = aUv; vColor = aColor;
  vec2 ndc = (position.xy - uView.xy) / uView.zw * 2.0 - 1.0;
  gl_Position = vec4(ndc, 0.0, 1.0);
}`;
const FX_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
in vec2 vUv; in vec4 vColor;
out vec4 oColor;
void main() {
  vec4 c = texture(uMap, vUv);
  float a = c.a * vColor.a;
  if (a < 0.004) discard;
  vec3 col = c.rgb;
  oColor = vec4(col * vColor.rgb, a);
}`;

export class FxBatch {
  constructor(atlasTex, { additive = false, capacity = 4000 } = {}) {
    this.capacity = capacity;
    this.stride = 8;
    this.data = new Float32Array(capacity * 4 * this.stride);
    const index = new Uint32Array(capacity * 6);
    for (let i = 0; i < capacity; i++) index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
    const geo = new THREE.BufferGeometry();
    const buf = new THREE.InterleavedBuffer(this.data, this.stride).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', new THREE.InterleavedBufferAttribute(buf, 2, 0));
    geo.setAttribute('aUv', new THREE.InterleavedBufferAttribute(buf, 2, 2));
    geo.setAttribute('aColor', new THREE.InterleavedBufferAttribute(buf, 4, 4));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    this.buffer = buf;
    this.geo = geo;
    this.uView = { value: new THREE.Vector4() };
    this.material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FX_VERT,
      fragmentShader: FX_FRAG,
      uniforms: { uMap: { value: atlasTex }, uView: this.uView },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    if (additive) {
      this.material.blending = THREE.CustomBlending;
      this.material.blendSrc = THREE.SrcAlphaFactor;
      this.material.blendDst = THREE.OneFactor;
    }
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.n = 0;
  }

  clear() {
    this.n = 0;
  }

  /** A quad of frame f centred on (x, y): w, h in tiles (default the frame's), rotation, colour [r,g,b] (HDR), alpha. */
  push(f, x, y, { w = f.w, h = f.h, rot = 0, color = [1, 1, 1], alpha = 1, ox = 0.5, oy = 0.5, flip = false } = {}) {
    if (this.n >= this.capacity) return;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const l = -w * ox;
    const r = w * (1 - ox);
    const b = -h * oy;
    const t = h * (1 - oy);
    const u0 = flip ? f.u1 : f.u0;
    const u1 = flip ? f.u0 : f.u1;
    const cs = [[l, b, u0, f.v0], [r, b, u1, f.v0], [r, t, u1, f.v1], [l, t, u0, f.v1]];
    const d = this.data;
    for (let k = 0; k < 4; k++) {
      const [lx, ly, u, v] = cs[k];
      const o = (this.n * 4 + k) * this.stride;
      d[o] = x + lx * c - ly * s;
      d[o + 1] = y + lx * s + ly * c;
      d[o + 2] = u;
      d[o + 3] = v;
      d[o + 4] = color[0];
      d[o + 5] = color[1];
      d[o + 6] = color[2];
      d[o + 7] = alpha;
    }
    this.n++;
  }

  upload() {
    this.buffer.needsUpdate = true;
    this.buffer.clearUpdateRanges();
    this.buffer.addUpdateRange(0, this.n * 4 * this.stride);
    this.geo.setDrawRange(0, this.n * 6);
  }
}

/* ------------------------------------------------------------ the final picture */

const FINAL_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tLit; uniform sampler2D uNoise;
uniform float uExposure, uTime, uHurt, uFade, uCold, uPulse;
uniform vec2 uRes;
in vec2 vUv;
out vec4 oColor;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec2 uv = vUv;
  vec3 c;
  if (uPulse > 0.001) {
    vec2 off = (uv - 0.5) * 0.01 * uPulse;
    c = vec3(texture(tLit, uv + off).r, texture(tLit, uv).g, texture(tLit, uv - off).b);
  } else c = texture(tLit, uv).rgb;
  c *= uExposure;
  c = aces(c);
  // Grade: shadows lean blue-violet, highlights warm.
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, c * vec3(0.9, 0.95, 1.12) + vec3(0.0, 0.004, 0.02), (1.0 - smoothstep(0.0, 0.5, l)) * uCold);
  c = mix(c, c * vec3(1.06, 1.0, 0.92), smoothstep(0.45, 1.0, l) * 0.6);
  c = mix(vec3(l), c, 1.08);
  // Vignette: soft and dark, like the edges of a painting.
  vec2 d = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float v = smoothstep(1.0, 0.25, length(d * vec2(0.82, 1.0)));
  c *= mix(0.2, 1.0, v);
  c = mix(c, c * vec3(1.0, 0.3, 0.28) + vec3(0.12, 0.0, 0.0), uHurt * smoothstep(0.55, 0.0, v) * 0.7);
  // Grain on the canvas.
  float g = texture(uNoise, uv * uRes / 256.0 + fract(uTime * 7.13)).r - 0.5;
  c += g * 0.025;
  c *= 1.0 - uFade;
  oColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
}`;

/* ------------------------------------------------------------ the stage */

function fullscreen(material) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return { scene, mesh };
}

export class Stage {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {object} o atlas (packed Atlas), ground ({ mask, textures, noise }), sdf (DataTexture), mapW, mapH
   */
  constructor(renderer, o) {
    this.renderer = renderer;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    this.mapW = o.mapW;
    this.mapH = o.mapH;
    const atlas = o.atlas;
    this.atlas = atlas;
    this.atlasTex = new THREE.CanvasTexture(atlas.canvas);
    this.atlasTex.colorSpace = THREE.SRGBColorSpace;
    this.atlasTex.minFilter = THREE.LinearMipmapLinearFilter;
    this.atlasTex.anisotropy = 4;
    this.normalTex = new THREE.DataTexture(atlas.normal, atlas.width, atlas.height, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.normalTex.minFilter = THREE.LinearMipmapLinearFilter;
    this.normalTex.magFilter = THREE.LinearFilter;
    this.normalTex.generateMipmaps = true;
    this.normalTex.needsUpdate = true;
    this.decals = new SpriteBatch(this.atlasTex, this.normalTex, 3000, { sorted: false });
    this.sprites = new SpriteBatch(this.atlasTex, this.normalTex, 7000);
    this.tele = new TelegraphBatch(64);
    this.fxAdd = new FxBatch(this.atlasTex, { additive: true, capacity: 5000 });
    this.fxMix = new FxBatch(this.atlasTex, { additive: false, capacity: 3000 });
    this.fxTop = new FxBatch(this.atlasTex, { additive: true, capacity: 600 });
    this.sdf = o.sdf;
    this.noise = o.ground.noise;
    const G = o.ground;
    this.groundMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULL_VERT,
      fragmentShader: GROUND_FRAG,
      uniforms: {
        uMask: { value: G.mask },
        uStone: { value: G.stone.albedo }, uStoneN: { value: G.stone.normal },
        uSnow: { value: G.snow.albedo }, uSnowN: { value: G.snow.normal },
        uIce: { value: G.ice.albedo }, uIceN: { value: G.ice.normal },
        uDirt: { value: G.dirt.albedo }, uDirtN: { value: G.dirt.normal },
        uNoise: { value: G.noise },
        uView: { value: new THREE.Vector4() },
        uMap: { value: new THREE.Vector2(o.mapW, o.mapH) },
        uRepeat: { value: G.repeat }
      },
      depthTest: false,
      depthWrite: false
    });
    this.ground = fullscreen(this.groundMat);
    this.gScene = new THREE.Scene();
    this.gScene.add(this.ground.mesh, this.decals.mesh, this.tele.mesh, this.sprites.mesh);
    this.ground.mesh.renderOrder = 0;
    this.decals.mesh.renderOrder = 1;
    this.tele.mesh.renderOrder = 2;
    this.sprites.mesh.renderOrder = 3;
    this.lightP = Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4());
    this.lightC = Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4());
    this.lightMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULL_VERT,
      fragmentShader: LIGHT_FRAG,
      uniforms: {
        tAlb: { value: null }, tNrm: { value: null }, tMat: { value: null }, tSdf: { value: this.sdf },
        uView: { value: new THREE.Vector4() },
        uMap: { value: new THREE.Vector2(o.mapW, o.mapH) },
        uLP: { value: this.lightP },
        uLC: { value: this.lightC },
        uCount: { value: 0 },
        uSkyTop: { value: new THREE.Color(0.1, 0.14, 0.33) },
        uSkySide: { value: new THREE.Color(0.065, 0.085, 0.21) },
        uMoonDir: { value: new THREE.Vector3(-0.6, -0.18, 0.78).normalize() },
        uMoonCol: { value: new THREE.Color(0.12, 0.16, 0.3) },
        uBands: { value: 5 }
      },
      depthTest: false,
      depthWrite: false
    });
    this.light = fullscreen(this.lightMat);
    this.fxScene = new THREE.Scene();
    this.fxScene.add(this.fxMix.mesh, this.fxAdd.mesh, this.fxTop.mesh);
    this.fxMix.mesh.renderOrder = 0;
    this.fxAdd.mesh.renderOrder = 1;
    this.fxTop.mesh.renderOrder = 2;
    this.finalMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: FULL_VERT,
      fragmentShader: FINAL_FRAG,
      uniforms: {
        tLit: { value: null }, uNoise: { value: this.noise },
        uExposure: { value: 1.15 }, uTime: { value: 0 }, uHurt: { value: 0 }, uFade: { value: 0 }, uCold: { value: 1 }, uPulse: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) }
      },
      depthTest: false,
      depthWrite: false
    });
    this.final = fullscreen(this.finalMat);
    this.view = { x: 0, y: 0, w: 24, h: 13.5 };
    this.lights = [];
    this.scale = 1;
    this.bloomOn = true;
  }

  /** Size the targets: css size × pixel ratio × render scale. */
  resize(w, h, ratio, scale = 1) {
    this.cssW = w;
    this.cssH = h;
    this.scale = scale;
    const pw = Math.max(64, Math.round(w * ratio * scale));
    const ph = Math.max(64, Math.round(h * ratio * scale));
    this.pw = pw;
    this.ph = ph;
    this.gbuf?.dispose();
    this.lit?.dispose();
    this.gbuf = new THREE.WebGLRenderTarget(pw, ph, { count: 3, type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
    this.lit = new THREE.WebGLRenderTarget(pw, ph, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    if (!this.bloom) this.bloom = new UnrealBloomPass(new THREE.Vector2(pw, ph), 0.55, 0.5, 1.05);
    this.bloom.setSize(pw, ph);
    this.finalMat.uniforms.uRes.value.set(pw, ph);
  }

  /** The world rectangle on screen, centred on (cx, cy), `viewH` tiles tall. */
  setView(cx, cy, viewH) {
    const aspect = this.cssW / this.cssH;
    this.view.h = viewH;
    this.view.w = viewH * aspect;
    this.view.x = cx - this.view.w / 2;
    this.view.y = cy - viewH / 2;
  }

  /** World point → CSS pixel. */
  toScreen(x, y) {
    return [((x - this.view.x) / this.view.w) * this.cssW, (1 - (y - this.view.y) / this.view.h) * this.cssH];
  }

  toWorld(px, py) {
    return [this.view.x + (px / this.cssW) * this.view.w, this.view.y + (1 - py / this.cssH) * this.view.h];
  }

  render(time) {
    const r = this.renderer;
    const v = this.view;
    for (const u of [this.sprites.uView, this.decals.uView, this.tele.uView, this.fxAdd.uView, this.fxMix.uView, this.fxTop.uView, this.groundMat.uniforms.uView, this.lightMat.uniforms.uView]) u.value.set(v.x, v.y, v.w, v.h);
    this.tele.uTime.value = time;
    this.decals.upload();
    this.sprites.upload();
    this.tele.upload();
    this.fxAdd.upload();
    this.fxMix.upload();
    this.fxTop.upload();
    // Lights: nearest the middle of the view first.
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    const vis = this.lights.filter((l) => l.x + l.r > v.x - 1 && l.x - l.r < v.x + v.w + 1 && l.y + l.r > v.y - 2 && l.y - l.r < v.y + v.h + 1);
    vis.sort((a, b) => (b.i ?? 1) / (1 + Math.hypot(b.x - cx, b.y - cy) * 0.1) - (a.i ?? 1) / (1 + Math.hypot(a.x - cx, a.y - cy) * 0.1));
    const n = Math.min(MAX_LIGHTS, vis.length);
    for (let i = 0; i < n; i++) {
      const l = vis[i];
      this.lightP[i].set(l.x, l.y, l.h ?? 1, l.r);
      this.lightC[i].set(l.c[0] * (l.i ?? 1), l.c[1] * (l.i ?? 1), l.c[2] * (l.i ?? 1), l.shadow === false ? 0 : 1);
    }
    this.lightMat.uniforms.uCount.value = n;
    this.lightCount = n;
    r.autoClear = false;
    // 1. G-buffer
    r.setRenderTarget(this.gbuf);
    r.setClearColor(0x000000, 0);
    r.clear(true, false, false);
    r.render(this.gScene, this.camera);
    // 2. light
    const lu = this.lightMat.uniforms;
    lu.tAlb.value = this.gbuf.textures[0];
    lu.tNrm.value = this.gbuf.textures[1];
    lu.tMat.value = this.gbuf.textures[2];
    r.setRenderTarget(this.lit);
    r.render(this.light.scene, this.camera);
    // 3. effects
    r.render(this.fxScene, this.camera);
    // 4. bloom, then the final grade to the screen
    if (this.bloomOn) this.bloom.render(r, null, this.lit, 0, false);
    this.finalMat.uniforms.tLit.value = this.lit.texture;
    this.finalMat.uniforms.uTime.value = time;
    r.setRenderTarget(null);
    r.render(this.final.scene, this.camera);
    r.autoClear = true;
    this.decals.clear();
    this.sprites.clear();
    this.tele.clear();
    this.fxAdd.clear();
    this.fxMix.clear();
    this.fxTop.clear();
  }

  dispose() {
    this.gbuf?.dispose();
    this.lit?.dispose();
    this.bloom?.dispose();
    this.atlasTex.dispose();
    this.normalTex.dispose();
    for (const m of [this.decals, this.sprites, this.tele, this.fxAdd, this.fxMix, this.fxTop]) {
      m.geo.dispose();
      m.material.dispose();
    }
    for (const m of [this.groundMat, this.lightMat, this.finalMat]) m.dispose();
  }
}
