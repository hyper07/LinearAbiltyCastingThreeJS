import * as THREE from 'three';
import { buildingType, typeSpec, floorsOf, shopUnits, tenants, rng, TOWERS } from './buildtypes.js';
import { SignAtlas } from './signs.js';

/**
 * Real buildings beside a bike course (knowledge/seoul-buildings.md). Far
 * off, Seoul is the city's one cheap shader; within a few metres of the
 * course each building is rebuilt for real as you come near, and the
 * shader's walls of it are hidden:
 *
 *  - its type from the register (buildtypes.js) — a shop building, an office
 *    tower with white fins, a glass tower, an older concrete office, a brick
 *    villa, an apartment slab — with true floor heights and a parapet;
 *  - one designed front where it faces the street, plain sides and backs,
 *    party walls blank;
 *  - windows cut into the wall: reveals, a frame, a sill, glass set back,
 *    rooms behind the glass (interior mapping: ceiling lights, desks,
 *    blinds, lit or not, warm or cool) under a reflection of the sky and the
 *    street; shopfronts lit inside, some with their shutters down at night;
 *  - signs where Korean signs go (§4): one sign over each shop, upper
 *    tenants on the band between floors or in vinyl letters on their
 *    windows, a stack of boxes on the front edge from 2F up, a name on top of
 *    a tower, a lit standing sign on the pavement — lit at night;
 *  - photo textures at true size (ambientCG, CC0) in world metres, grime at
 *    the foot and streaks under the sills, AC units, gas pipes, downpipes,
 *    grilles, and water tanks, stair huts, sheds and rails on the roofs.
 *
 * A few buildings are built each frame into a batch (one mesh per material);
 * batches far behind are dropped and their shader walls come back.
 */

const NEAR_COURSE = 30; // metres from the course
const BUILD = 190;
const DROP = 300;
const PER_FRAME = 2;
const BATCH = 10;

const C = (hex) => new THREE.Color(hex);
const lerp = (a, b, t) => a + (b - a) * t;

/** The wall finishes: an ambientCG surface, how many metres one repeat of it is, its tints. */
const FINISH = {
  'granite-grey': { tex: 'Granite002A', scale: 1.2, joints: [0.9, 0.6], tints: ['#d6d6d4', '#c2c4c6', '#e2e0dc'], rough: 0.55 },
  'granite-beige': { tex: 'Granite001A', scale: 1.2, joints: [0.6, 0.6], tints: ['#efe6dc', '#e0d2c4', '#f4ece2'], rough: 0.55 },
  'tile-white': { tex: 'Tiles107', scale: 2.4, tints: ['#f2efe8', '#e8e4da', '#f4f2ee'], rough: 0.35 },
  'tile-small': { tex: 'Tiles133A', scale: 1.2, tints: ['#f0e4d2', '#e4d6c4', '#f2ece4', '#d8c8b4'], rough: 0.4 },
  render: { tex: 'Plaster001', scale: 2.5, tints: ['#efe9dd', '#e6e1d6', '#f2e6d4', '#dfe3e2', '#efe2d9', '#d9d4c8'], rough: 0.9 },
  'brick-red': { tex: 'Bricks101', scale: 1.7, tints: ['#ffffff', '#f0e2dc', '#e8d4cc'], rough: 0.85 },
  'brick-beige': { tex: 'Bricks105', scale: 1.3, tints: ['#ffffff', '#f2e4d4', '#e6d0bc'], rough: 0.85 },
  concrete: { tex: 'Concrete034', scale: 3, tints: ['#e4e2dc', '#d4d2cc', '#eceae4'], rough: 0.9 },
  fin: { tex: 'Plaster001', scale: 4, tints: ['#f4f4f2', '#eceeee'], rough: 0.35 },
  dark: { tex: 'Granite002A', scale: 1.2, joints: [0.9, 0.6], tints: ['#5a5c60', '#4a4c50', '#6a6460'], rough: 0.4 }
};
const FRAMES = { white: C('#eeeeea'), silver: C('#a9aeb4'), dark: C('#3b3d42'), bronze: C('#5e5244') };
const SILL = C('#d8d4cc');
const AC = C('#ecebe6');
const GAS = C('#e2b432');
const PIPE = C('#c9c7c0');
const VINYL = ['#ffffff', '#ffd400', '#e8312a', '#2a62c9', '#19a45a', '#ff7a1a'].map(C);
const AWN = ['#c83a2a', '#1f5bb5', '#2f8f4e', '#3a3c40', '#7a2bd1', '#d98a1a', '#7a1f2a'].map(C);

const textureCache = new Map();
function libTexture(id, part, srgb) {
  const key = `${id}|${part}`;
  if (!textureCache.has(key)) {
    const t = new THREE.TextureLoader().load(`./library/ambientcg/${id}/${id}_1K-JPG_${part}.jpg`, undefined, undefined, () => {});
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(key, t);
  }
  return textureCache.get(key);
}

/* ------------------------------------------------------------------ geometry */

/** Triangles sorted by material: position, normal, uv, colour, and (glass) a vec4 per vertex. */
class Geo {
  constructor() {
    this.b = new Map();
  }
  bucket(key) {
    let k = this.b.get(key);
    if (!k) this.b.set(key, (k = { pos: [], nrm: [], uv: [], col: [], ex: [] }));
    return k;
  }
  /**
   * A quad a-b-c-d (any winding: turned to face `n`). `uv` four [u, v], `col` four colours or one,
   * `ex` one vec4 for all four corners.
   */
  quad(key, a, b, c, d, n, uv = null, col = null, ex = null) {
    const k = this.bucket(key);
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1];
    const cy = e1[2] * e2[0] - e1[0] * e2[2];
    const cz = e1[0] * e2[1] - e1[1] * e2[0];
    let P = [a, b, c, d];
    let U = uv ?? [[0, 0], [1, 0], [1, 1], [0, 1]];
    let K = Array.isArray(col) ? col : [col, col, col, col];
    if (cx * n[0] + cy * n[1] + cz * n[2] < 0) {
      P = [a, d, c, b];
      U = [U[0], U[3], U[2], U[1]];
      K = [K[0], K[3], K[2], K[1]];
    }
    for (const i of [0, 1, 2, 0, 2, 3]) {
      const p = P[i];
      k.pos.push(p[0], p[1], p[2]);
      k.nrm.push(n[0], n[1], n[2]);
      k.uv.push(U[i][0], U[i][1]);
      const c0 = K[i] ?? WHITE;
      k.col.push(c0.r, c0.g, c0.b);
      if (ex) k.ex.push(ex[0], ex[1], ex[2], ex[3]);
    }
  }
  meshes(mats) {
    const out = [];
    for (const [key, k] of this.b) {
      if (!k.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(k.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(k.nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(k.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(k.col, 3));
      if (k.ex.length) g.setAttribute('aCell', new THREE.Float32BufferAttribute(k.ex, 4));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mats(key));
      m.name = key;
      const lit = !key.startsWith('glass') && !key.startsWith('spill');
      m.castShadow = lit && !key.startsWith('vinyl');
      m.receiveShadow = lit;
      out.push(m);
    }
    return out;
  }
}
const WHITE = new THREE.Color(1, 1, 1);

/** A wall's frame: s along it, y up from the street, d out of it (negative: into the wall). */
class Wall {
  constructor(x0, z0, x1, z1, fl) {
    const len = Math.hypot(x1 - x0, z1 - z0) || 1;
    Object.assign(this, { x0, z0, len, fl, ux: (x1 - x0) / len, uz: (z1 - z0) / len, along: 0 });
    // Out of the building is u turned right: (−uz, ux) — the caller orders the ends so it is.
    this.ox = -this.uz;
    this.oz = this.ux;
    this.n = [this.ox, 0, this.oz];
    this.u = [this.ux, 0, this.uz];
  }
  P(s, y, d) {
    return [this.x0 + this.ux * s + this.ox * d, this.fl + y, this.z0 + this.uz * s + this.oz * d];
  }
}

/** Colour times a number (a new colour). */
const mul = (c, k) => new THREE.Color(c.r * k, c.g * k, c.b * k);

export class Facades {
  constructor(game, course) {
    this.g = game;
    this.course = course;
    this.done = new Map(); // building → batch
    this.queue = [];
    this.open = null;
    this.batches = [];
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.atlas = new SignAtlas();
    this.mats = new Map();
    this.uni = { uNight: game.uniforms.uNight, uSkyTop: game.uniforms.uSkyTop, uSkyLow: game.uniforms.uSkyLow, uSunDir: { value: new THREE.Vector3(0.5, 0.6, 0.3) }, uSunCol: { value: new THREE.Color('#fff3dc') } };
    this.t = 0;
  }

  /* -------------------------------------------------------------- materials */

  _mat(key) {
    if (this.mats.has(key)) return this.mats.get(key);
    let m;
    const night = this.uni.uNight;
    if (key.startsWith('wall:')) {
      const f = FINISH[key.slice(5)];
      m = new THREE.MeshStandardMaterial({ map: libTexture(f.tex, 'Color', true), normalMap: libTexture(f.tex, 'NormalGL'), roughnessMap: libTexture(f.tex, 'Roughness'), roughness: f.rough / 0.7, metalness: 0, vertexColors: true });
      m.normalScale.set(0.8, 0.8);
      // Weathering (§5): broad stains and thin vertical streaks, in the wall's own metres; granite
      // panels also get their joints (the stone texture itself has none).
      const [jw, jh] = f.joints ?? [0, 0];
      const F = (v) => v.toFixed(3);
      m.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>
            float wvh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float wvn(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
              return mix(mix(wvh(i), wvh(i + vec2(1.0, 0.0)), f.x), mix(wvh(i + vec2(0.0, 1.0)), wvh(i + vec2(1.0, 1.0)), f.x), f.y); }`)
          .replace('#include <map_fragment>', `#include <map_fragment>
            {
              vec2 mm = vMapUv * ${F(f.scale)};
              float blot = wvn(mm * 0.3) * 0.65 + wvn(mm * 1.1 + 7.0) * 0.35;
              float streak = smoothstep(0.6, 0.95, wvn(vec2(mm.x * 2.6, mm.y * 0.1))) * (0.4 + 0.6 * wvn(vec2(mm.x * 0.5, mm.y * 0.04 + 3.0)));
              diffuseColor.rgb *= 1.0 - 0.11 * smoothstep(0.35, 0.85, blot) - 0.13 * streak;
              ${f.joints ? `float row = floor(mm.y / ${F(jh)});
              vec2 q = vec2(fract((mm.x + mod(row, 2.0) * ${F(jw / 2)}) / ${F(jw)}) * ${F(jw)}, fract(mm.y / ${F(jh)}) * ${F(jh)});
              float jt = min(min(q.x, ${F(jw)} - q.x), min(q.y, ${F(jh)} - q.y));
              diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(0.003, 0.008, jt));
              diffuseColor.rgb *= 0.94 + 0.12 * wvh(floor(vec2((mm.x + mod(row, 2.0) * ${F(jw / 2)}) / ${F(jw)}, row)));` : ''}
            }`);
      };
    } else if (key === 'trim') {
      m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 });
    } else if (key === 'fabric') {
      m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
    } else if (key === 'shutter') {
      m = new THREE.MeshStandardMaterial({ map: libTexture('CorrugatedSteel005', 'Color', true), normalMap: libTexture('CorrugatedSteel005', 'NormalGL'), vertexColors: true, roughness: 0.6, metalness: 0.5 });
    } else if (key === 'sign-wide' || key === 'sign-tall') {
      const tex = key === 'sign-wide' ? this.atlas.wide : this.atlas.tall;
      m = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.1, roughness: 0.45, vertexColors: true });
    } else if (key === 'vinyl') {
      m = new THREE.MeshStandardMaterial({ map: this.atlas.glyphs, alphaTest: 0.45, vertexColors: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    } else if (key === 'tower') {
      m = new THREE.MeshStandardMaterial({ map: this.atlas.towers, emissiveMap: this.atlas.towers, emissive: '#ffffff', emissiveIntensity: 0.1, alphaTest: 0.45, vertexColors: true, roughness: 0.4, side: THREE.DoubleSide });
    } else if (key === 'spill') {
      m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    } else {
      m = this._glassMat();
    }
    void night;
    this.mats.set(key, m);
    return m;
  }

  /**
   * Glass: rooms behind it (interior mapping) under a reflection of the sky, the street and the sun.
   * aCell: the room's width and height (m), what it is (0 office · 1 home · 2 shop · 3 lobby · 4 curtain
   * wall with spandrels · 5 dark void), a seed. uv: metres across the glass.
   */
  _glassMat() {
    const m = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.uni);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aCell;\nvarying vec4 vCell;\nvarying vec2 vM;\nvarying vec3 vWP;\nvarying vec3 vWN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCell = aCell;\nvM = uv;\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * normal);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uNight;
          uniform vec3 uSkyTop;
          uniform vec3 uSkyLow;
          uniform vec3 uSunDir;
          uniform vec3 uSunCol;
          varying vec4 vCell;
          varying vec2 vM;
          varying vec3 vWP;
          varying vec3 vWN;
          float gh(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          // Goods on a shelf: packs 0.14 × 0.26 m in quiet colours, a shelf edge every 0.42 m.
          vec3 goods(vec2 q, float seed) {
            vec2 c = floor(q / vec2(0.14, 0.42));
            float r = gh(c + seed * 13.0);
            vec3 pal = r < 0.2 ? vec3(0.8, 0.22, 0.18) : r < 0.4 ? vec3(0.95, 0.8, 0.3) : r < 0.55 ? vec3(0.2, 0.42, 0.75) : r < 0.7 ? vec3(0.25, 0.6, 0.35) : r < 0.85 ? vec3(0.92, 0.9, 0.86) : vec3(0.45, 0.3, 0.22);
            float y = fract(q.y / 0.42);
            vec3 pack = mix(vec3(0.55), pal, 0.65) * (0.75 + 0.25 * gh(c + 3.7));
            pack *= step(0.08, y) * step(y, 0.08 + 0.62 * (0.7 + 0.3 * gh(c + 1.1)));
            return mix(vec3(0.78, 0.79, 0.8), pack + vec3(0.1), step(0.08, y) * step(0.02, fract(q.x / 0.14)));
          }
          // The view ray into a box room W × H × D (metres) from the point p on its glass front.
          // kind: 0 office · 1 home · 2 shop (style by seed: a mart, a cafe, a clinic or salon, a restaurant).
          vec3 roomCol(vec2 p, vec3 v, vec3 dims, float kind, float seed, float lit, vec3 lamp) {
            float tx = abs((v.x > 0.0 ? dims.x - p.x : -p.x) / (abs(v.x) > 1e-4 ? v.x : 1e-4));
            float ty = abs((v.y > 0.0 ? dims.y - p.y : -p.y) / (abs(v.y) > 1e-4 ? v.y : 1e-4));
            float tz = dims.z / max(1e-3, v.z);
            float t = min(min(tx, ty), tz);
            vec3 h = vec3(p, 0.0) + v * t;
            float style = floor(fract(seed * 7.31) * 4.0);
            bool warm = kind == 2.0 && (style == 1.0 || style == 3.0);
            vec3 wallC = kind == 1.0 ? mix(vec3(0.86, 0.8, 0.7), vec3(0.78, 0.82, 0.8), step(0.5, seed)) : warm ? vec3(0.62, 0.48, 0.36) : kind == 2.0 ? vec3(0.93, 0.93, 0.9) : vec3(0.8, 0.81, 0.82);
            vec3 floorC = kind == 1.0 ? vec3(0.5, 0.38, 0.27) : warm ? vec3(0.42, 0.3, 0.2) : kind == 2.0 ? vec3(0.74, 0.74, 0.72) : vec3(0.42, 0.43, 0.46);
            vec3 col = wallC;
            float glow = 0.0;
            // Something part-way in: desks and partitions (offices), shelves, tables or a counter (shops), a sofa (homes).
            float zp = dims.z * (0.3 + 0.25 * fract(seed * 3.3));
            float tp = zp / max(1e-3, v.z);
            vec3 hp = vec3(p, 0.0) + v * tp;
            bool front = tp < t && hp.x > 0.15 && hp.x < dims.x - 0.15;
            bool hit = false;
            if (front) {
              if (kind == 0.0 && hp.y < 1.2) { col = mix(vec3(0.32, 0.34, 0.38), vec3(0.72, 0.71, 0.68), step(1.1, hp.y)); hit = true; }
              else if (kind == 2.0 && style == 0.0 && hp.y < 1.55 && fract(hp.x / 2.4 + seed) < 0.6) { col = goods(hp.xy + vec2(seed * 9.0, 0.0), seed); hit = true; }
              else if (kind == 2.0 && warm && hp.y < 0.76 && hp.y > 0.7 - 0.0 * seed) { col = vec3(0.36, 0.25, 0.17); hit = true; }
              else if (kind == 2.0 && warm && hp.y < 0.7 && fract(hp.x / 1.4 + seed) < 0.12) { col = vec3(0.2, 0.16, 0.13); hit = true; }
              else if (kind == 2.0 && style == 2.0 && hp.y < 1.05 && fract(hp.x / 3.0 + seed) < 0.5) { col = vec3(0.9, 0.9, 0.88); hit = true; }
              else if (kind == 1.0 && hp.y < 0.8 && seed > 0.5) { col = vec3(0.42, 0.34, 0.28); hit = true; }
            }
            if (hit) h = hp;
            else if (t == tz) {
              if (kind == 0.0) col = mix(col, vec3(0.3, 0.32, 0.36), step(0.7, h.y) * step(h.y, 0.78));
              if (kind == 2.0 && style == 0.0) col = mix(col, goods(h.xy, seed), step(h.y, 2.2) * step(0.1, h.y));
              if (kind == 2.0 && style == 2.0) {
                // A clinic or a salon: posters and a mirror on a white wall.
                vec2 pc = fract(h.xy / vec2(1.6, 3.0) + vec2(seed, 0.0));
                col = mix(col, mix(vec3(0.3, 0.55, 0.8), vec3(0.85, 0.45, 0.55), step(0.5, gh(floor(h.xy / vec2(1.6, 3.0)) + seed))), step(0.2, pc.x) * step(pc.x, 0.6) * step(0.4, pc.y) * step(pc.y, 0.62));
              }
              if (warm) col = mix(col, vec3(0.3, 0.2, 0.13), step(fract(h.x / 0.9), 0.08));
              if (kind == 1.0) col = mix(col, vec3(0.55, 0.42, 0.32), step(fract(h.x / 2.3 + seed), 0.18) * step(h.y, 1.9));
            } else if (t == ty) {
              if (v.y > 0.0) {
                col = vec3(0.9, 0.9, 0.88);
                vec2 cp = h.xz;
                // Ceiling lights: long panels in offices, marts and clinics; round warm pendants in cafes; one round lamp in a home.
                float panel = kind == 1.0 ? 1.0 - smoothstep(0.18, 0.24, length(vec2(cp.x - dims.x * 0.5, cp.y - dims.z * 0.5)))
                  : warm ? 1.0 - smoothstep(0.1, 0.16, length(fract(cp / vec2(1.4, 1.6)) - 0.5))
                  : step(0.62, fract(cp.x / 1.25 + 0.3)) * step(0.4, fract(cp.y / 1.6));
                glow = panel;
              } else {
                col = floorC;
              }
            } else {
              col = wallC * 0.9;
              if (kind == 2.0 && style == 0.0) col = mix(col, goods(vec2(h.z, h.y), seed + 1.0), step(h.y, 2.0) * step(0.1, h.y));
            }
            // Light falls off into the room, brighter near the ceiling.
            float fall = 0.65 + 0.35 * clamp(h.y / dims.y, 0.0, 1.0);
            vec3 light = warm ? lamp * vec3(1.05, 0.82, 0.6) : lamp;
            return col * fall * mix(vec3(0.16), light, lit) + glow * lit * light * 1.6;
          }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          {
            float kind = vCell.z;
            float seed = vCell.w;
            vec2 cs = vCell.xy;
            vec2 cid = floor(vM / cs);
            vec2 f = fract(vM / cs);
            vec2 p = f * cs;
            float r = gh(cid + seed * 37.0);
            float r2 = gh(cid * 1.7 + seed * 11.0);
            vec3 N = normalize(vWN);
            vec3 V = normalize(vWP - cameraPosition);
            vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), N));
            vec3 Vt = vec3(dot(V, T), V.y, max(0.04, dot(V, -N)));
            float night = uNight;
            // Who has the lights on: shops nearly all, offices many (fewer at night), homes some (more at night).
            float litP = kind == 2.0 ? 0.92 : kind == 1.0 ? mix(0.1, 0.55, night) : kind == 3.0 ? 0.8 : mix(0.75, 0.42, night);
            float lit = step(r, litP);
            float hue = gh(cid + seed * 5.0 + 2.0);
            vec3 lamp = kind == 1.0 ? (hue < 0.75 ? vec3(1.0, 0.74, 0.46) : vec3(0.92, 0.95, 1.0)) : kind == 2.0 ? vec3(1.08, 1.04, 0.96) : (hue < 0.7 ? vec3(0.95, 0.98, 1.04) : vec3(1.0, 0.9, 0.74));
            // By day a lit room is still darker than the street outside it.
            lamp *= mix(kind == 2.0 ? 0.42 : 0.36, kind == 2.0 ? 0.95 : 0.9, night);
            float roomH = cs.y;
            float sill = 0.0;
            if (kind == 4.0) {
              // A curtain wall: the bottom of each floor is an opaque spandrel; the room above it.
              sill = 0.95;
              roomH = cs.y - sill;
            }
            vec3 dims = vec3(cs.x, roomH, kind == 2.0 ? 6.0 : kind == 1.0 ? 3.6 : 4.5);
            vec3 inside;
            if (kind == 5.0) inside = vec3(0.06, 0.06, 0.065);
            else if (kind == 4.0 && p.y < sill) inside = vec3(0.07, 0.08, 0.1);
            else inside = roomCol(vec2(p.x, p.y - sill), Vt, dims, kind == 4.0 ? 0.0 : kind == 3.0 ? 2.0 : kind, fract(r * 7.13), lit, lamp);
            // Blinds half down in some offices and homes; curtains drawn in some homes at night.
            if ((kind == 0.0 || kind == 4.0 || kind == 1.0) && r2 < 0.35) {
              float drop = 0.25 + 0.6 * fract(r2 * 9.7);
              float by = (p.y - sill) / max(0.1, roomH);
              if (by > 1.0 - drop) {
                float slat = 0.85 + 0.15 * step(0.5, fract(p.y / 0.05));
                inside = vec3(0.78, 0.76, 0.72) * slat * mix(0.55, 0.9, lit) * mix(1.0, 0.25 + 0.75 * lit, night) + lamp * lit * night * 0.25;
              }
            }
            if (kind == 1.0 && night > 0.5 && r2 > 0.7) {
              float side = min(f.x, 1.0 - f.x);
              if (side < 0.3) inside = mix(vec3(0.9, 0.72, 0.5), vec3(0.8, 0.8, 0.75), step(0.5, hue)) * (0.3 + 0.9 * lit);
            }
            // Tinted glass: offices and towers a blue-grey or green coating, homes and shops clear.
            vec3 tint = kind == 4.0 || kind == 0.0 ? mix(vec3(0.55, 0.66, 0.74), vec3(0.6, 0.7, 0.66), step(0.5, fract(seed * 3.7))) : vec3(0.92, 0.95, 0.95);
            inside *= tint;
            // The reflection: sky above, the buildings across the street at the horizon, the street below; the sun.
            vec3 R = reflect(V, N);
            float az = atan(R.z, R.x);
            float skyline = 0.05 + 0.2 * gh(vec2(floor(az * 9.0), 1.0)) * step(0.3, gh(vec2(floor(az * 9.0), 2.0)));
            vec3 sky = mix(uSkyLow, mix(uSkyTop, vec3(0.16, 0.38, 0.78), 0.5 * (1.0 - night)), sqrt(clamp(R.y, 0.0, 1.0)));
            vec3 bld = mix(uSkyLow * 0.55, vec3(0.32, 0.31, 0.3), 0.5) * (1.0 - 0.65 * night) + vec3(1.0, 0.85, 0.6) * night * 0.12 * step(0.6, gh(floor(vec2(az * 60.0, R.y * 40.0))));
            vec3 env = R.y < 0.0 ? mix(vec3(0.24, 0.24, 0.25) * (1.0 - 0.7 * night), bld, smoothstep(-0.25, 0.0, R.y)) : mix(bld, sky, smoothstep(skyline - 0.02, skyline + 0.02, R.y));
            env += uSunCol * pow(max(0.0, dot(R, normalize(uSunDir))), 400.0) * 6.0 * (1.0 - night);
            float cosT = clamp(dot(-V, N), 0.0, 1.0);
            float F0 = kind == 4.0 ? 0.16 : kind == 0.0 ? 0.1 : 0.05;
            float fres = F0 + (1.0 - F0) * pow(1.0 - cosT, 5.0);
            // Panes not quite flat: the reflection wobbles a little from pane to pane.
            fres = clamp(fres * (0.85 + 0.3 * gh(cid + 9.1)), 0.0, 1.0);
            // Coated office glass reflects through its own tint (BLDG_4's dark blue panes); clear glass a little dimmer.
            vec3 coat = kind == 4.0 || kind == 0.0 ? mix(vec3(0.42, 0.52, 0.68), vec3(0.45, 0.58, 0.56), step(0.6, fract(seed * 3.7))) : vec3(0.85);
            vec3 col = mix(inside, env * coat, fres);
            // Curtain walls: thin mullions at each cell edge.
            if (kind == 4.0) {
              float mu = min(min(f.x, 1.0 - f.x) * cs.x, min(f.y, 1.0 - f.y) * cs.y);
              col = mix(vec3(0.16, 0.17, 0.19) + env * 0.1, col, smoothstep(0.03, 0.045, mu));
            }
            diffuseColor.rgb = col;
          }`);
    };
    return m;
  }

  /* -------------------------------------------------------------- streaming */

  /** Each frame: queue the buildings by the course near you, build a couple, drop what is far behind. */
  update() {
    this.t++;
    const g = this.g;
    const night = this.uni.uNight.value;
    for (const [key, m] of this.mats) {
      if (key === 'sign-wide' || key === 'sign-tall') m.emissiveIntensity = 0.05 + night * 0.62;
      else if (key === 'tower') m.emissiveIntensity = 0.06 + night * 1.0;
      else if (key === 'spill') m.opacity = night * 0.55;
    }
    if (g.sunDir) this.uni.uSunDir.value.copy(g.sunDir);
    if (g.sun) this.uni.uSunCol.value.copy(g.sun.color).multiplyScalar(Math.min(1.5, g.sun.intensity / 1.6));
    for (const b of this.batches) for (const m of b.meshes) if (m.name === 'shutter') m.visible = night > 0.55;
    const p = g.pos;
    if (this.t % 15 === 1) this._scan(p);
    // Build a few queued buildings into the open batch; close it when full or the queue is empty.
    for (let k = 0; k < PER_FRAME && this.queue.length; k++) {
      const b = this.queue.shift();
      if (this.done.has(b) || !b.tile?.mesh) continue;
      this.open ??= { geo: new Geo(), list: [], x: b.minx, z: b.minz };
      try {
        this._building(b, this.open.geo);
      } catch (e) {
        console.warn('facades', e);
      }
      this.open.list.push(b);
      this.done.set(b, this.open);
    }
    if (this.open && (this.open.list.length >= BATCH || !this.queue.length)) this._close();
    for (const batch of [...this.batches]) {
      if (Math.hypot(batch.x - p.x, batch.z - p.z) < DROP) continue;
      for (const m of batch.meshes) {
        this.group.remove(m);
        m.geometry.dispose();
      }
      for (const b of batch.list) {
        this.g.hideWalls?.(b, false);
        this.done.delete(b);
      }
      this.batches.splice(this.batches.indexOf(batch), 1);
    }
  }

  _scan(p) {
    const pts = this.course.points.filter((q) => Math.abs(q[0] - p.x) < BUILD + 40 && Math.abs(q[1] - p.z) < BUILD + 40);
    this.pts = pts;
    const fresh = [];
    for (const t of this.g.tiles?.values() ?? []) {
      if (!t.foot) continue;
      for (const b of t.foot) {
        if (this.done.has(b) || b.base == null || this.queue.includes(b)) continue;
        const cx = (b.minx + b.maxx) / 2;
        const cz = (b.minz + b.maxz) / 2;
        const d = Math.hypot(cx - p.x, cz - p.z);
        if (d > BUILD) continue;
        const near = b.h > 28 ? NEAR_COURSE * 2.4 : NEAR_COURSE; // towers are seen from further off
        if (!pts.some((q) => q[0] > b.minx - near && q[0] < b.maxx + near && q[1] > b.minz - near && q[1] < b.maxz + near)) continue;
        b.tile = t;
        fresh.push([d, b]);
      }
    }
    fresh.sort((a, b) => a[0] - b[0]);
    for (const [, b] of fresh) this.queue.push(b);
  }

  _close() {
    const batch = this.open;
    this.open = null;
    batch.meshes = batch.geo.meshes((key) => this._mat(key));
    batch.geo = null;
    for (const m of batch.meshes) this.group.add(m);
    for (const b of batch.list) this.g.hideWalls?.(b, true);
    this.batches.push(batch);
  }

  /* -------------------------------------------------------------- one building */

  _building(b, G) {
    const n = b.xs.length;
    let area = 0;
    for (let i = 0; i < n; i++) area += b.xs[i] * b.zs[(i + 1) % n] - b.xs[(i + 1) % n] * b.zs[i];
    area = Math.abs(area / 2);
    const type = buildingType({ kind: b.kind ?? 6, h: b.h, area, seed: b.seed ?? 0.5 });
    const spec = typeSpec(type, b.seed ?? 0.5);
    // The road is laid 0.9 m over the land: the street level, and the height above it.
    const fl = b.top - b.h + 0.9;
    const H = Math.max(3, b.h - 0.9);
    const F = floorsOf(H, spec);
    const r = rng((b.seed ?? 0.5) * 977 + b.minx * 0.013);
    const finish = spec.finish === 'glass' ? 'fin' : spec.finish;
    const tint = C(FINISH[finish].tints[Math.floor(r() * FINISH[finish].tints.length)]);
    const sideTint = C(FINISH[spec.side === 'glass' ? 'fin' : spec.side].tints[Math.floor(r() * FINISH[spec.side === 'glass' ? 'fin' : spec.side].tints.length)]);
    const frame = type === 'villa' ? (r() < 0.6 ? FRAMES.white : FRAMES.silver) : type === 'concrete' ? (r() < 0.5 ? FRAMES.silver : FRAMES.dark) : r() < 0.5 ? FRAMES.dark : r() < 0.6 ? FRAMES.silver : FRAMES.bronze;
    const cat = this.atlas.names;
    const ten = tenants(cat, r, 0, F.n, 6);
    // Upper tenants: how each shows itself — a sign on the band under its windows, letters on its glass, or both.
    const upper = ten.upper.map((i) => (i == null ? null : { i, band: r() < 0.6, vinyl: r() < 0.65, col: VINYL[Math.floor(r() * VINYL.length)] }));
    for (const u of upper) if (u && !u.band && !u.vinyl) u.band = true;
    const ctx = { b, G, type, spec, F, H, fl, r, tint, sideTint, frame, upper, stack: spec.signs && F.n >= 3 && r() < 0.65, stackDone: false, topDone: false, seedGlass: r() };
    // Walls: which face the street.
    const pts = this.pts ?? [];
    let along = 0;
    const walls = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      let [x0, z0, x1, z1] = [b.xs[i], b.zs[i], b.xs[j], b.zs[j]];
      const len = Math.hypot(x1 - x0, z1 - z0);
      const start = along;
      along += len;
      if (len < 0.05) continue;
      const ux = (x1 - x0) / len;
      const uz = (z1 - z0) / len;
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      // Which side is out of the building; order the ends so out is u turned right.
      let ox = -uz;
      let oz = ux;
      if (this._inside(b, mx + ox * 0.4, mz + oz * 0.4)) {
        if (this._inside(b, mx - ox * 0.4, mz - oz * 0.4)) continue;
        [x0, z0, x1, z1] = [x1, z1, x0, z0];
        ox = -ox;
        oz = -oz;
      }
      const W = new Wall(x0, z0, x1, z1, fl);
      W.along = start;
      const party = len > 1 && Boolean(this.g.buildingAt?.(mx + ox * 0.9, mz + oz * 0.9));
      const facesCourse = pts.some((q) => (q[0] - mx) * ox + (q[1] - mz) * oz > 1 && Math.hypot(q[0] - mx, q[1] - mz) < NEAR_COURSE + len / 2);
      const facesRoad = this.g.onRoad?.(mx + ox * 5, mz + oz * 5, 1) ?? false;
      walls.push({ W, len, party, front: !party && len >= 3 && (facesCourse || facesRoad), course: facesCourse });
    }
    // The longest street front is the main one (the stack of signs, the name on top).
    const mainFront = walls.filter((w) => w.front).sort((a, c) => Number(c.course) - Number(a.course) || c.len - a.len)[0];
    const longest = Math.max(...walls.map((w) => w.len), 1);
    for (const w of walls) {
      w.main = w === mainFront;
      w.long = w.len >= longest * 0.6;
      if (type === 'office' || type === 'glass') this._towerWall(ctx, w);
      else if (w.party || w.len < 1.2) this._plainWall(ctx, w, []);
      else if (type === 'apartment') this._apartmentWall(ctx, w);
      else if (w.front) this._frontWall(ctx, w);
      else this._sideWall(ctx, w);
    }
    this._roof(ctx, walls);
  }

  /* ---------------------------------------------------------- wall pieces */

  /**
   * A wall from below the street to the top of its parapet, with `holes` cut out (each
   * {s0, s1, y0, y1}); grime at the foot, a streak under every window.
   */
  _plainWall(ctx, w, holes, finishKey, tintC) {
    const { G, b, fl } = ctx;
    const W = w.W;
    const fin = finishKey ?? (w.front ? ctx.spec.finish : ctx.spec.side);
    const finish = fin === 'glass' ? 'fin' : fin;
    const tint = tintC ?? (w.front ? ctx.tint : ctx.sideTint);
    const scale = FINISH[finish].scale;
    const key = `wall:${finish}`;
    const yBot = b.base - fl;
    const yTop = ctx.H + (ctx.spec.parapet ?? 0);
    const S = [0, w.len];
    const Y = [yBot, yTop, 0, 0.5, 1.4];
    for (const h of holes) {
      S.push(Math.max(0, Math.min(w.len, h.s0)), Math.max(0, Math.min(w.len, h.s1)));
      Y.push(h.y0, h.y1);
    }
    const su = [...new Set(S.map((v) => Math.round(v * 1000) / 1000))].sort((a, c) => a - c);
    const yu = [...new Set(Y.filter((v) => v >= yBot && v <= yTop).map((v) => Math.round(v * 1000) / 1000))].sort((a, c) => a - c);
    const grime = (y) => (y < 0 ? 0.6 : y < 0.5 ? 0.66 + 0.24 * (y / 0.5) : y < 1.4 ? 0.9 + 0.1 * ((y - 0.5) / 0.9) : 1) * (0.94 + 0.06 * Math.min(1, y / 12));
    for (let i = 0; i < su.length - 1; i++) {
      const s0 = su[i];
      const s1 = su[i + 1];
      if (s1 - s0 < 0.005) continue;
      const sc = (s0 + s1) / 2;
      // Merge runs of solid cells up the wall where nothing changes, to keep the count down.
      for (let j = 0; j < yu.length - 1; j++) {
        const y0 = yu[j];
        const y1 = yu[j + 1];
        const yc = (y0 + y1) / 2;
        if (holes.some((h) => sc > h.s0 && sc < h.s1 && yc > h.y0 && yc < h.y1)) continue;
        // A streak under the window above this cell (in its column, within 3 m).
        const above = holes.find((h) => h.streak !== false && sc > h.s0 && sc < h.s1 && h.y0 >= y1 - 1e-3 && h.y0 - y1 < 3);
        const st = (y) => (above ? 1 - 0.2 * Math.max(0, 1 - (above.y0 - y) / 3) : 1);
        const cols = [mul(tint, grime(y0) * st(y0)), mul(tint, grime(y0) * st(y0)), mul(tint, grime(y1) * st(y1)), mul(tint, grime(y1) * st(y1))];
        const U = (s, y) => [(W.along + s) / scale, y / scale];
        G.quad(key, W.P(s0, y0, 0), W.P(s1, y0, 0), W.P(s1, y1, 0), W.P(s0, y1, 0), W.n, [U(s0, y0), U(s1, y0), U(s1, y1), U(s0, y1)], cols);
      }
    }
    // The coping along the top of the parapet.
    if ((ctx.spec.parapet ?? 0) > 0) this._box(G, 'trim', W, 0, w.len, yTop, yTop + 0.08, -0.25, 0.05, mul(tint, 0.95), { back: true });
    // The parapet's inside face, seen from the roofs around.
    if ((ctx.spec.parapet ?? 0) > 0) G.quad(key, W.P(0, ctx.H, -0.2), W.P(w.len, ctx.H, -0.2), W.P(w.len, yTop, -0.2), W.P(0, yTop, -0.2), [-W.ox, 0, -W.oz], [[0, 0], [w.len / scale, 0], [w.len / scale, 1], [0, 1]], mul(tint, 0.8));
  }

  /** A box in a wall's frame (s, y, d ranges); `faces`: colour per face or one; uv in metres / scale. */
  _box(G, key, W, s0, s1, y0, y1, d0, d1, col, { back = false, uvScale = 0, cells = null } = {}) {
    const P = (s, y, d) => W.P(s, y, d);
    const U = uvScale ? (a, c) => [a / uvScale, c / uvScale] : () => [0, 0];
    const cl = (k) => (cells?.col?.[k] ? cells.col[k] : col);
    const uvq = (k, def) => cells?.uv?.[k] ?? def;
    // front (+n)
    G.quad(key, P(s0, y0, d1), P(s1, y0, d1), P(s1, y1, d1), P(s0, y1, d1), W.n, uvq('front', [U(W.along + s0, y0), U(W.along + s1, y0), U(W.along + s1, y1), U(W.along + s0, y1)]), cl('front'));
    if (back) G.quad(key, P(s1, y0, d0), P(s0, y0, d0), P(s0, y1, d0), P(s1, y1, d0), [-W.ox, 0, -W.oz], uvq('back', [U(W.along + s1, y0), U(W.along + s0, y0), U(W.along + s0, y1), U(W.along + s1, y1)]), cl('back'));
    // ends (±u)
    G.quad(key, P(s1, y0, d1), P(s1, y0, d0), P(s1, y1, d0), P(s1, y1, d1), W.u, uvq('end1', [U(d1, y0), U(d0, y0), U(d0, y1), U(d1, y1)]), cl('end1') ?? col);
    G.quad(key, P(s0, y0, d0), P(s0, y0, d1), P(s0, y1, d1), P(s0, y1, d0), [-W.ux, 0, -W.uz], uvq('end0', [U(d0, y0), U(d1, y0), U(d1, y1), U(d0, y1)]), cl('end0') ?? col);
    // top, bottom
    G.quad(key, P(s0, y1, d1), P(s1, y1, d1), P(s1, y1, d0), P(s0, y1, d0), [0, 1, 0], uvq('top', [U(s0, d1), U(s1, d1), U(s1, d0), U(s0, d0)]), cl('top') ?? mul(col, 1.05));
    G.quad(key, P(s0, y0, d0), P(s1, y0, d0), P(s1, y0, d1), P(s0, y0, d1), [0, -1, 0], uvq('bottom', [U(s0, d0), U(s1, d0), U(s1, d1), U(s0, d1)]), cl('bottom') ?? mul(col, 0.7));
  }

  /** Glass across s0…s1, y0…y1 at depth d: rooms of cw × ch metres of `kind` behind it. */
  _glass(G, W, s0, s1, y0, y1, d, cw, ch, kind, seed, uOff = 0, vOff = 0) {
    G.quad('glass', W.P(s0, y0, d), W.P(s1, y0, d), W.P(s1, y1, d), W.P(s0, y1, d), W.n, [[uOff, vOff], [uOff + s1 - s0, vOff], [uOff + s1 - s0, vOff + y1 - y0], [uOff, vOff + y1 - y0]], WHITE, [cw, ch, kind, seed]);
  }

  /**
   * A window: reveals into the wall, glass set back, a frame (a middle bar in a wide one, more bars
   * in a band), a sill out front; a grille over it on a villa's low floors.
   */
  _window(ctx, w, o) {
    const { G } = ctx;
    const W = w.W;
    const D = o.depth ?? 0.18;
    const fin = o.finish;
    const scale = FINISH[fin].scale;
    const key = `wall:${fin}`;
    const t0 = mul(o.tint, 0.82);
    const t1 = mul(o.tint, 0.5);
    const U = (a, c) => [(W.along + a) / scale, c / scale];
    // Reveals: left, right, the head (soffit) and the inner sill.
    G.quad(key, W.P(o.s0, o.y0, 0), W.P(o.s0, o.y0, -D), W.P(o.s0, o.y1, -D), W.P(o.s0, o.y1, 0), W.u, [U(o.s0, o.y0), U(o.s0 + D, o.y0), U(o.s0 + D, o.y1), U(o.s0, o.y1)], [t0, t1, t1, t0]);
    G.quad(key, W.P(o.s1, o.y0, -D), W.P(o.s1, o.y0, 0), W.P(o.s1, o.y1, 0), W.P(o.s1, o.y1, -D), [-W.ux, 0, -W.uz], [U(o.s1 - D, o.y0), U(o.s1, o.y0), U(o.s1, o.y1), U(o.s1 - D, o.y1)], [t1, t0, t0, t1]);
    G.quad(key, W.P(o.s0, o.y1, -D), W.P(o.s1, o.y1, -D), W.P(o.s1, o.y1, 0), W.P(o.s0, o.y1, 0), [0, -1, 0], [U(o.s0, o.y1 + D), U(o.s1, o.y1 + D), U(o.s1, o.y1), U(o.s0, o.y1)], [mul(t1, 0.8), mul(t1, 0.8), mul(t0, 0.8), mul(t0, 0.8)]);
    G.quad(key, W.P(o.s0, o.y0, 0), W.P(o.s1, o.y0, 0), W.P(o.s1, o.y0, -D), W.P(o.s0, o.y0, -D), [0, 1, 0], [U(o.s0, o.y0), U(o.s1, o.y0), U(o.s1, o.y0 - D), U(o.s0, o.y0 - D)], [t0, t0, t1, t1]);
    const fw = o.frameW ?? 0.05;
    const fd = -D + 0.02;
    const fr = o.frame ?? ctx.frame;
    // The frame round the glass.
    this._box(G, 'trim', W, o.s0, o.s1, o.y0, o.y0 + fw, -D, fd + 0.05, fr);
    this._box(G, 'trim', W, o.s0, o.s1, o.y1 - fw, o.y1, -D, fd + 0.05, fr);
    this._box(G, 'trim', W, o.s0, o.s0 + fw, o.y0, o.y1, -D, fd + 0.05, fr);
    this._box(G, 'trim', W, o.s1 - fw, o.s1, o.y0, o.y1, -D, fd + 0.05, fr);
    // Bars: every `pane` metres (or one down the middle of a wide sliding window).
    const width = o.s1 - o.s0;
    const panes = o.pane ? Math.max(1, Math.round(width / o.pane)) : width > 1.25 ? 2 : 1;
    for (let k = 1; k < panes; k++) {
      const s = o.s0 + (width * k) / panes;
      this._box(G, 'trim', W, s - fw * 0.6, s + fw * 0.6, o.y0, o.y1, -D, fd + 0.06, fr);
    }
    if (o.transom) this._box(G, 'trim', W, o.s0, o.s1, o.transom - fw * 0.6, o.transom + fw * 0.6, -D, fd + 0.05, fr);
    // Glass: one room per pane (a band of offices), or one room behind the window.
    const cw = o.cell ?? (panes > 1 && o.kind !== 2 ? width / panes : width);
    this._glass(G, W, o.s0, o.s1, o.y0, o.y1, -D + 0.03, cw, o.y1 - o.y0, o.kind, o.seed ?? ctx.seedGlass, 0, 0);
    // The sill out front.
    if (o.sill !== false) this._box(G, 'trim', W, o.s0 - 0.05, o.s1 + 0.05, o.y0 - 0.06, o.y0, -0.02, 0.06, SILL);
    // A villa's security grille.
    if (o.grille) {
      const gc = C('#3c3e42');
      this._box(G, 'trim', W, o.s0 - 0.04, o.s1 + 0.04, o.y0 + 0.02, o.y0 + 0.05, 0.02, 0.1, gc);
      this._box(G, 'trim', W, o.s0 - 0.04, o.s1 + 0.04, o.y1 - 0.05, o.y1 - 0.02, 0.02, 0.1, gc);
      const bars = Math.max(3, Math.round(width / 0.12));
      for (let k = 0; k <= bars; k++) {
        const s = o.s0 + (width * k) / bars;
        this._box(G, 'trim', W, s - 0.008, s + 0.008, o.y0 + 0.02, o.y1 - 0.02, 0.07, 0.09, gc);
      }
    }
    return { s0: o.s0, s1: o.s1, y0: o.y0, y1: o.y1, streak: o.streak };
  }

  /** Vinyl letters on a run of panes: one big letter to a pane, the tenant's name (§4). */
  _vinyl(ctx, W, panes, name, col, d) {
    const glyphs = this.atlas.glyphsOf(name);
    if (!glyphs.length || !panes.length) return;
    const first = Math.max(0, Math.floor((panes.length - glyphs.length) / 2));
    for (let k = 0; k < Math.min(glyphs.length, panes.length); k++) {
      const p = panes[first + k];
      if (!p) break;
      const size = Math.min(p.s1 - p.s0, p.y1 - p.y0) * 0.78;
      const sc = (p.s0 + p.s1) / 2;
      const yc = (p.y0 + p.y1) / 2 + (p.y1 - p.y0) * 0.04;
      const [u0, v0, u1, v1] = this.atlas.uv('glyph', glyphs[k]);
      ctx.G.quad('vinyl', W.P(sc - size / 2, yc - size / 2, d), W.P(sc + size / 2, yc - size / 2, d), W.P(sc + size / 2, yc + size / 2, d), W.P(sc - size / 2, yc + size / 2, d), W.n, [[u0, v1], [u1, v1], [u1, v0], [u0, v0]], col);
    }
  }

  /**
   * A horizontal sign box (§4): its face the name, lit at night. The name keeps its proportions: on a
   * long sign the panel's own colour runs on either side of it, on a short one above and below.
   */
  _wideSign(ctx, W, s0, s1, y0, y1, d0, d1, idx) {
    const [u0, v0, u1, v1] = this.atlas.uv('wide', idx);
    const px = 10 / this.atlas.wide.image.width;
    const pad = [u0 + px, (v0 + v1) / 2];
    const edge = [pad, pad, pad, pad];
    const dim = mul(WHITE, 0.4);
    this._box(ctx.G, 'sign-wide', W, s0, s1, y0, y1, d0, d1, WHITE, { cells: { uv: { front: edge, end0: edge, end1: edge, top: edge, bottom: edge, back: edge }, col: { end0: dim, end1: dim, top: dim, bottom: mul(WHITE, 0.3) } } });
    const aspect = ((u1 - u0) * this.atlas.wide.image.width) / ((v1 - v0) * this.atlas.wide.image.height);
    const fw = s1 - s0;
    const fh = y1 - y0;
    let w = fw;
    let h = fh;
    if (fw / fh > aspect * 1.2) w = fh * aspect * 1.2;
    else if (fw / fh < aspect * 0.8) h = Math.max(fh * 0.55, fw / (aspect * 0.8));
    const sc = (s0 + s1) / 2;
    const yc = (y0 + y1) / 2;
    const d = d1 + 0.004;
    ctx.G.quad('sign-wide', W.P(sc - w / 2, yc - h / 2, d), W.P(sc + w / 2, yc - h / 2, d), W.P(sc + w / 2, yc + h / 2, d), W.P(sc - w / 2, yc + h / 2, d), W.n, [[u0, v1], [u1, v1], [u1, v0], [u0, v0]], WHITE);
  }

  /** A box of the tall atlas: its two big faces along the wall's ±u (a projecting sign) or its front (a standing sign). */
  _tallSign(ctx, W, s0, s1, y0, y1, d0, d1, idx, projecting) {
    const [u0, v0, u1, v1] = this.atlas.uv('tall', idx);
    const face = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]];
    const faceR = [[u1, v1], [u0, v1], [u0, v0], [u1, v0]];
    const edge = [[u0, v0 + 0.001], [u0 + 0.001, v0 + 0.001], [u0 + 0.001, v0 + 0.002], [u0, v0 + 0.002]];
    const dim = mul(WHITE, 0.45);
    const cells = projecting
      ? { uv: { end0: face, end1: faceR, front: edge, back: edge, top: edge, bottom: edge }, col: { front: dim, back: dim, top: dim, bottom: dim } }
      : { uv: { front: face, back: faceR, end0: face, end1: faceR, top: edge, bottom: edge }, col: { top: dim, bottom: dim } };
    this._box(ctx.G, 'sign-tall', W, s0, s1, y0, y1, d0, d1, WHITE, { back: true, cells });
  }

  /* ---------------------------------------------------------- the walls by type */

  /** A street front: shops on 1F with their signs, upper floors with windows and their tenants' signs. */
  _frontWall(ctx, w) {
    const { G, spec, F, r, type } = ctx;
    const W = w.W;
    const len = w.len;
    const holes = [];
    const finish = spec.finish;
    const tint = ctx.tint;
    const gH = F.groundH;
    const shopsHere = !w.noShops && type !== 'villa' && (type === 'shop' || spec.signs || r() < 0.5);
    // ---- 1F
    if (type === 'villa') {
      if (spec.piloti && len > 5) {
        // Piloti parking: the ground floor open, columns holding the floors up, cars' shade inside.
        const y1 = Math.min(gH - 0.3, 2.5);
        const o = { s0: 0.35, s1: len - 0.35, y0: -0.4, y1 };
        holes.push(o);
        const D = 4;
        const dark = C('#5e5c58');
        G.quad(`wall:concrete`, W.P(o.s0, o.y0, -D), W.P(o.s1, o.y0, -D), W.P(o.s1, y1, -D), W.P(o.s0, y1, -D), W.n, null, mul(dark, 0.55));
        G.quad(`wall:concrete`, W.P(o.s0, y1, 0), W.P(o.s1, y1, 0), W.P(o.s1, y1, -D), W.P(o.s0, y1, -D), [0, -1, 0], [[0, 0], [len / 3, 0], [len / 3, 1.3], [0, 1.3]], [mul(dark, 0.8), mul(dark, 0.8), mul(dark, 0.4), mul(dark, 0.4)]);
        G.quad(`wall:concrete`, W.P(o.s0, 0.02, 0), W.P(o.s0, 0.02, -D), W.P(o.s0, y1, -D), W.P(o.s0, y1, 0), W.u, null, mul(dark, 0.6));
        G.quad(`wall:concrete`, W.P(o.s1, 0.02, -D), W.P(o.s1, 0.02, 0), W.P(o.s1, y1, 0), W.P(o.s1, y1, -D), [-W.ux, 0, -W.uz], null, mul(dark, 0.6));
        G.quad(`wall:concrete`, W.P(o.s0, 0.02, 0), W.P(o.s1, 0.02, 0), W.P(o.s1, 0.02, -D), W.P(o.s0, 0.02, -D), [0, 1, 0], null, mul(dark, 0.7));
        for (let s = 3.2; s < len - 1.5; s += 3.4) this._box(G, 'trim', W, s - 0.2, s + 0.2, 0, y1, -0.6, -0.2, C('#bdb8ae'));
      } else if (len > 3) {
        // A front door, and windows either side.
        const ds = len * (0.25 + r() * 0.5);
        holes.push(this._window(ctx, w, { s0: ds - 0.55, s1: ds + 0.55, y0: 0.15, y1: 2.25, depth: 0.25, kind: 3, finish, tint, sill: false, frame: FRAMES.dark, streak: false }));
        for (let s = 1.2; s < len - 1.2; s += 2.8) {
          if (Math.abs(s - ds) < 1.6) continue;
          holes.push(this._window(ctx, w, { s0: s - 0.6, s1: s + 0.6, y0: 1.0, y1: 2.1, kind: 1, finish, tint, grille: true }));
        }
      }
    } else if (shopsHere) {
      const units = shopUnits(len, r, 0.45);
      const signY0 = gH - 1.18;
      const signY1 = gH - 0.22;
      const top = signY0 - 0.12;
      for (const [a, c] of units) {
        const name = tenants(this.atlas.names, r, 1, 1).ground[0];
        // The shopfront: glass nearly floor to sign, a door bay, a transom bar on some.
        holes.push(this._window(ctx, w, { s0: a, s1: c, y0: 0.12, y1: top, depth: 0.32, kind: 2, finish, tint, pane: 1.6 + r() * 0.6, transom: r() < 0.4 ? top - 0.55 : 0, frame: r() < 0.5 ? FRAMES.dark : FRAMES.silver, frameW: 0.06, sill: false, streak: false, seed: r() }));
        // The sign over it: that shop's width, a gap at each side.
        this._wideSign(ctx, W, a + 0.08, c - 0.08, signY0, signY1, 0.02, 0.24, name);
        // Light from the shop on the pavement at night.
        G.quad('spill', W.P(a + 0.3, 0.03, 0.2), W.P(c - 0.3, 0.03, 0.2), W.P(c - 0.6, 0.03, 2.6), W.P(a + 0.6, 0.03, 2.6), [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], [C('#ffe2b0'), C('#ffe2b0'), C('#000000'), C('#000000')]);
        // Shutters down at night on some.
        if (r() < 0.3) {
          const sh = C('#c4c6c8');
          G.quad('shutter', W.P(a, 0.12, 0.03), W.P(c, 0.12, 0.03), W.P(c, top, 0.03), W.P(a, top, 0.03), W.n, [[0, 0], [(c - a) / 1.2, 0], [(c - a) / 1.2, (top - 0.12) / 1.2], [0, (top - 0.12) / 1.2]], sh);
        }
        // An awning under the sign on some.
        if (r() < 0.28 && c - a > 2) {
          const col = AWN[Math.floor(r() * AWN.length)];
          const out = 1.1 + r() * 0.4;
          G.quad('fabric', W.P(a + 0.1, top - 0.05, 0.05), W.P(c - 0.1, top - 0.05, 0.05), W.P(c - 0.1, top - 0.55, out), W.P(a + 0.1, top - 0.55, out), [0, 0.9, 0.4], null, col);
          G.quad('fabric', W.P(a + 0.1, top - 0.55, out), W.P(c - 0.1, top - 0.55, out), W.P(c - 0.1, top - 0.8, out), W.P(a + 0.1, top - 0.8, out), W.n, null, mul(col, 0.9));
        }
        // A lit standing sign on the pavement (not in the way of the course).
        if (r() < 0.45) {
          const s = a + 0.5 + r() * Math.max(0.1, c - a - 1);
          const d = 1.3 + r() * 0.5;
          const [px, , pz] = W.P(s, 0, d);
          if (!(this.pts ?? []).some((q) => Math.hypot(q[0] - px, q[1] - pz) < (q[2] ?? 6) / 2 + 0.8)) this._tallSign(ctx, W, s - 0.16, s + 0.16, 0.02, 1.35, d - 0.16, d + 0.16, name, false);
        }
      }
    } else {
      // Offices and others without shops: an entrance and windows on 1F.
      const ds = len / 2;
      holes.push(this._window(ctx, w, { s0: ds - 1.2, s1: ds + 1.2, y0: 0.12, y1: gH - 1.0, depth: 0.6, kind: 3, finish, tint, pane: 1.2, sill: false, frame: FRAMES.dark, streak: false }));
      for (let s = 1.4; s < len - 1.2; s += 2.6) if (Math.abs(s - ds) > 2.2) holes.push(this._window(ctx, w, { s0: s - 0.7, s1: s + 0.7, y0: 1.0, y1: gH - 1.0, kind: 0, finish, tint }));
    }
    // ---- upper floors
    const winW = spec.winW ?? 1.6;
    for (let k = 1; k < F.n; k++) {
      const fy = gH + (k - 1) * F.floorH;
      const y0 = fy + (spec.sill ?? 0.9);
      const y1 = Math.min(fy + F.floorH - 0.35, ctx.H - 0.2);
      if (y1 - y0 < 0.5) continue;
      const ten = ctx.upper[k - 1];
      const panes = [];
      if (spec.windows === 'band' && len > 2.4) {
        const o = { s0: 0.45, s1: len - 0.45, y0, y1, depth: 0.14, kind: 0, finish, tint, pane: 1.3 + (ctx.seedGlass * 0.3) };
        holes.push(this._window(ctx, w, o));
        const count = Math.max(1, Math.round((o.s1 - o.s0) / o.pane));
        for (let q = 0; q < count; q++) panes.push({ s0: o.s0 + ((o.s1 - o.s0) * q) / count, s1: o.s0 + ((o.s1 - o.s0) * (q + 1)) / count, y0, y1 });
      } else {
        const ww = winW;
        const cols = Math.max(1, Math.floor((len - 0.8) / (ww + (type === 'villa' ? 1.4 : 1.0))));
        const gap = len / cols;
        for (let q = 0; q < cols; q++) {
          const sc = gap * (q + 0.5);
          const s0 = sc - ww / 2;
          const s1 = sc + ww / 2;
          if (s0 < 0.3 || s1 > len - 0.3) continue;
          holes.push(this._window(ctx, w, { s0, s1, y0, y1: type === 'villa' ? Math.min(y1, y0 + spec.winH) : y1, kind: type === 'villa' ? 1 : 0, finish, tint, grille: type === 'villa' && (k <= 2 || r() < 0.3) }));
          panes.push({ s0, s1, y0, y1 });
          // A villa's AC unit hung on the wall beside a window.
          if (type === 'villa' && r() < 0.35 && s1 + 1.0 < len) this._acUnit(ctx, W, s1 + 0.55, fy + 0.35);
        }
      }
      if (!ten || type === 'villa') continue;
      // The tenant's sign on the band under its windows, and its letters on the glass.
      if (ten.band && y0 - fy > 0.7 && len > 3) this._wideSign(ctx, W, 0.4, len < 12 ? len - 0.4 : 0.4 + len * 0.6, fy + 0.1, y0 - 0.1, 0.02, 0.18, ten.i);
      if (ten.vinyl) this._vinyl(ctx, W, panes, this.atlas.names[ten.i].name, ten.col, -0.1);
    }
    // ---- the stack of projecting signs at one end of the main front, from 2F up (§4)
    if (w.main && ctx.stack && !ctx.stackDone && len > 4) {
      ctx.stackDone = true;
      const s = r() < 0.5 ? 0.35 : len - 0.35;
      for (let k = 1; k < Math.min(F.n, 7); k++) {
        const ten = ctx.upper[k - 1];
        if (!ten) continue;
        const fy = gH + (k - 1) * F.floorH;
        this._tallSign(ctx, W, s - 0.13, s + 0.13, fy + 0.25, fy + F.floorH - 0.2, 0.35, 1.0, ten.i, true);
        this._box(G, 'trim', W, s - 0.03, s + 0.03, fy + 0.45, fy + 0.5, 0, 0.35, FRAMES.dark);
        this._box(G, 'trim', W, s - 0.03, s + 0.03, fy + F.floorH - 0.5, fy + F.floorH - 0.45, 0, 0.35, FRAMES.dark);
      }
    }
    // A downpipe down one end.
    if (r() < 0.7) this._box(G, 'trim', W, len - 0.22, len - 0.12, -0.5, ctx.H + 0.2, 0.0, 0.1, PIPE);
    // Gas pipe: yellow, along the wall at 1F's top and down the side (villas, shops).
    if ((type === 'villa' || type === 'shop') && r() < 0.6) this._gasPipe(ctx, W, len, gH - 0.1);
    this._plainWall(ctx, w, holes, finish, tint);
  }

  /** A side or back wall: plain, a few small windows, AC units, pipes. */
  _sideWall(ctx, w) {
    const { G, spec, F, r, type } = ctx;
    const W = w.W;
    const len = w.len;
    const holes = [];
    const finish = spec.side;
    const tint = ctx.sideTint;
    if (type === 'concrete' && spec.bandSides) return this._frontWall({ ...ctx, upper: ctx.upper.map(() => null), stack: false, spec: { ...spec, signs: false } }, { ...w, main: false, noShops: true });
    const gH = F.groundH;
    const spots = type === 'villa' ? Math.max(1, Math.floor(len / 4)) : Math.max(0, Math.floor(len / 7));
    for (let k = 1; k < F.n; k++) {
      const fy = gH + (k - 1) * F.floorH;
      for (let q = 0; q < spots; q++) {
        if (r() < 0.35) continue;
        const sc = (len * (q + 0.5)) / spots;
        const ww = type === 'villa' ? 1.1 : 0.7;
        const wh = type === 'villa' ? 1.1 : 0.8;
        const y0 = fy + (type === 'villa' ? 1.0 : 1.4);
        if (sc - ww / 2 < 0.4 || sc + ww / 2 > len - 0.4) continue;
        holes.push(this._window(ctx, w, { s0: sc - ww / 2, s1: sc + ww / 2, y0, y1: Math.min(y0 + wh, fy + F.floorH - 0.3), kind: type === 'villa' ? 1 : 0, finish, tint, depth: 0.14, grille: type === 'villa' && k <= 2 }));
        if (r() < 0.4) this._acUnit(ctx, W, Math.min(len - 0.6, sc + ww / 2 + 0.6), fy + 0.25);
      }
    }
    if (r() < 0.6) this._box(G, 'trim', W, 0.12, 0.22, -0.5, ctx.H + 0.2, 0.0, 0.1, PIPE);
    if ((type === 'villa' || type === 'shop') && r() < 0.5) this._gasPipe(ctx, W, len, gH + (F.n > 2 ? F.floorH : 0) - 0.1);
    this._plainWall(ctx, w, holes, finish, tint);
  }

  /** An apartment slab: glazed balconies on the long sides; the block's big number on the ends. */
  _apartmentWall(ctx, w) {
    const { G, F, r } = ctx;
    const W = w.W;
    const len = w.len;
    const holes = [];
    const tint = ctx.tint;
    if (w.long) {
      for (let k = 0; k < F.n; k++) {
        const fy = k === 0 ? 0 : F.groundH + (k - 1) * F.floorH;
        const fh = k === 0 ? F.groundH : F.floorH;
        holes.push(this._window(ctx, w, { s0: 0.4, s1: len - 0.4, y0: fy + 0.12, y1: fy + fh - 0.28, depth: 0.3, kind: 1, finish: 'render', tint, pane: 1.25, transom: fy + 1.05, frame: FRAMES.white, sill: false }));
      }
    } else {
      // The block number painted near the top, as every Seoul apartment has.
      const num = `${1 + Math.floor(r() * 3)}0${1 + Math.floor(r() * 9)}`;
      const size = Math.min(3.2, len * 0.22);
      const y = ctx.H - size * 1.4;
      [...num].forEach((ch, k) => {
        const gi = this.atlas.glyphIndex.get(ch);
        if (gi == null) return;
        const [u0, v0, u1, v1] = this.atlas.uv('glyph', gi);
        const s = len / 2 + (k - 1) * size * 0.62;
        G.quad('vinyl', W.P(s - size / 2, y, 0.02), W.P(s + size / 2, y, 0.02), W.P(s + size / 2, y + size, 0.02), W.P(s - size / 2, y + size, 0.02), W.n, [[u0, v1], [u1, v1], [u1, v0], [u0, v0]], C('#3a5a8c'));
      });
    }
    this._plainWall(ctx, w, holes, 'render', tint);
  }

  /** An office tower (white fins over dark glass) or a glass tower: the same all round. */
  _towerWall(ctx, w) {
    const { G, spec, F, r, type, H } = ctx;
    const W = w.W;
    const len = w.len;
    const gH = F.groundH;
    const glassTop = type === 'glass' ? H + 1.2 : H - 0.9;
    const seed = ctx.seedGlass;
    if (w.party || len < 1.5) {
      this._plainWall({ ...ctx, spec: { ...spec, parapet: type === 'glass' ? 1.2 : spec.parapet } }, w, [], type === 'glass' ? 'concrete' : 'fin', C('#d8d8d6'));
      return;
    }
    // The base: dark granite with a recessed glass lobby; shops along it on a street front.
    const holes = [];
    if (w.front && len > 8 && r() < 0.6) {
      const units = shopUnits(len, r, 0.6);
      for (const [a, c] of units) {
        const name = tenants(this.atlas.names, r, 1, 1).ground[0];
        holes.push(this._window(ctx, w, { s0: a, s1: c, y0: 0.12, y1: gH - 1.5, depth: 0.4, kind: 2, finish: 'dark', tint: C('#ffffff'), pane: 1.8, frame: FRAMES.dark, frameW: 0.06, sill: false, streak: false, seed: r() }));
        this._wideSign(ctx, W, a + 0.1, c - 0.1, gH - 1.35, gH - 0.45, 0.02, 0.22, name);
      }
    } else if (len > 3) {
      holes.push(this._window(ctx, w, { s0: 0.6, s1: len - 0.6, y0: 0.12, y1: gH - 0.5, depth: w.front ? 1.6 : 0.4, kind: 3, finish: 'dark', tint: C('#ffffff'), pane: 1.5, frame: FRAMES.dark, sill: false, streak: false }));
    }
    // The base and (office) the white frame round the top, as walls; the glass between them.
    const baseTop = gH;
    const S = (y0, y1, hs, fin, tint) => this._plainWall({ ...ctx, H: y1, spec: { ...spec, parapet: 0 }, b: { ...ctx.b, base: ctx.fl + y0 } }, w, hs, fin, tint);
    S(ctx.b.base - ctx.fl, baseTop, holes, 'dark', C('#ffffff'));
    if (type === 'office') {
      // Glass set back behind white aluminium fins, one every bay, with wide piers at the corners.
      const bay = spec.bay;
      const count = Math.max(1, Math.round((len - 1.2) / bay));
      const step = (len - 1.2) / count;
      this._glass(G, W, 0.6, len - 0.6, baseTop, glassTop, -0.3, step, F.floorH, 4, seed, 0, 0);
      const white = C('#f2f2ef');
      for (let k = 0; k <= count; k++) {
        const s = 0.6 + k * step;
        const half = k === 0 || k === count ? 0.6 : 0.16;
        this._box(G, 'wall:fin', W, Math.max(0, s - half), Math.min(len, s + half), baseTop - 0.1, H + 0.8, -0.3, 0.22, white, { uvScale: 4 });
      }
      // Top band and the lip under the glass.
      this._box(G, 'wall:fin', W, 0, len, glassTop, H + 0.8, -0.3, 0.12, white, { uvScale: 4, back: true });
      this._box(G, 'wall:fin', W, 0, len, baseTop - 0.35, baseTop, -0.3, 0.25, white, { uvScale: 4 });
    } else {
      // A curtain wall flush with the face: mullions every 1.5 m, a transom at every floor.
      const bay = spec.bay;
      const count = Math.max(1, Math.round(len / bay));
      const step = len / count;
      this._glass(G, W, 0, len, baseTop, glassTop, 0, step, F.floorH, 4, seed, 0, 0);
      const mc = C('#8c939b');
      for (let k = 0; k <= count; k++) {
        const s = k * step;
        this._box(G, 'trim', W, Math.max(0, s - 0.04), Math.min(len, s + 0.04), baseTop, glassTop, 0, 0.1, mc);
      }
      for (let y = baseTop; y <= glassTop + 0.01; y += F.floorH) this._box(G, 'trim', W, 0, len, y - 0.05, y + 0.05, 0, 0.08, mc);
      this._box(G, 'trim', W, 0, len, glassTop, glassTop + 0.15, -0.3, 0.1, mc);
    }
    // The name at the top of the main front (§4: only big towers have one).
    if (w.main && spec.top && !ctx.topDone && len > 12 && H > 30) {
      ctx.topDone = true;
      const ti = Math.floor(r() * TOWERS.length);
      const [u0, v0, u1, v1] = this.atlas.uv('tower', ti);
      const hgt = Math.min(3.2, Math.max(1.6, H * 0.035));
      const wid = Math.min(len * 0.6, hgt * 6.4);
      const s0 = (len - wid) / 2;
      const y0 = type === 'office' ? glassTop + 0.05 : glassTop - hgt - 1.5;
      const col = [C('#ffffff'), C('#e8312a'), C('#ffffff'), C('#1d4fa8')][Math.floor(r() * 4)];
      const d = type === 'office' ? 0.16 : 0.14;
      const yy = type === 'office' ? Math.min(y0, H + 0.8 - hgt) : y0;
      G.quad('tower', W.P(s0, yy, d), W.P(s0 + wid, yy, d), W.P(s0 + wid, yy + hgt, d), W.P(s0, yy + hgt, d), W.n, [[u0, v1], [u1, v1], [u1, v0], [u0, v0]], col);
    }
  }

  /* ---------------------------------------------------------- clutter */

  _acUnit(ctx, W, s, y) {
    const { G } = ctx;
    this._box(G, 'trim', W, s - 0.4, s + 0.4, y, y + 0.58, 0.05, 0.38, AC);
    // Its fan (a dark disc as a square) and the bracket under it.
    G.quad('trim', W.P(s - 0.22, y + 0.08, 0.385), W.P(s + 0.14, y + 0.08, 0.385), W.P(s + 0.14, y + 0.48, 0.385), W.P(s - 0.22, y + 0.48, 0.385), W.n, null, C('#4a4c50'));
    this._box(G, 'trim', W, s - 0.35, s - 0.31, y - 0.25, y, 0, 0.38, FRAMES.silver);
    this._box(G, 'trim', W, s + 0.31, s + 0.35, y - 0.25, y, 0, 0.38, FRAMES.silver);
  }

  _gasPipe(ctx, W, len, y) {
    const { G, r } = ctx;
    const a = 0.4 + r() * 0.5;
    const c = len - 0.4 - r() * 0.5;
    if (c - a < 1) return;
    this._box(G, 'trim', W, a, c, y - 0.025, y + 0.025, 0.04, 0.09, GAS);
    this._box(G, 'trim', W, a - 0.025, a + 0.025, 0.4, y, 0.04, 0.09, GAS);
    // The meter low down.
    this._box(G, 'trim', W, a - 0.18, a + 0.18, 0.9, 1.3, 0.02, 0.2, C('#cfc9b8'));
  }

  /** The roof: a water tank, a stair hut, AC units, a shed on some villas, a rail, an antenna. */
  _roof(ctx, walls) {
    const { G, b, type, r, H, fl } = ctx;
    const top = fl + H;
    const cx = (b.minx + b.maxx) / 2;
    const cz = (b.minz + b.maxz) / 2;
    const fits = (x, z, half) => [[-half, -half], [half, -half], [half, half], [-half, half], [0, 0]].every(([a, c]) => this._inside(b, x + a, z + c));
    const spot = (half) => {
      for (let k = 0; k < 8; k++) {
        const x = lerp(b.minx, b.maxx, 0.2 + r() * 0.6);
        const z = lerp(b.minz, b.maxz, 0.2 + r() * 0.6);
        if (fits(x, z, half)) return [x, z];
      }
      return fits(cx, cz, half) ? [cx, cz] : null;
    };
    const Wx = new Wall(0, 0, 1, 0, top); // world-aligned frame: s = x, d = z
    const boxAt = (key, x, z, hx, hy0, hy1, hz, col) => this._box(G, key, Wx, x - hx, x + hx, hy0, hy1, z - hz, z + hz, col, { uvScale: key.startsWith('wall:') ? 2.5 : 0 });
    if (type === 'office' || type === 'glass') {
      const s = spot(3);
      if (s) boxAt('wall:concrete', s[0], s[1], 3, 0, 3.2, 2.5, C('#c8c6c0'));
      return;
    }
    // The stair hut, its door.
    const hut = spot(1.6);
    if (hut && type !== 'apartment') {
      boxAt('wall:render', hut[0], hut[1], 1.5, 0, 2.7, 1.3, ctx.sideTint);
      boxAt('trim', hut[0], hut[1], 1.6, 2.7, 2.85, 1.4, mul(ctx.sideTint, 0.9));
    }
    // The water tank on its steel stand.
    const tank = spot(1.0);
    if (tank && r() < 0.85) {
      const colT = [C('#3a6fb5'), C('#c9ccd0'), C('#e9e8e2'), C('#3a6fb5')][Math.floor(r() * 4)];
      boxAt('trim', tank[0], tank[1], 0.8, 0, 0.5, 0.8, C('#55585e'));
      this._cyl(G, tank[0], top + 0.5, tank[1], 0.85, 1.5, colT, 12);
    }
    // AC condensers.
    for (let k = 0; k < 2 + Math.floor(r() * 3); k++) {
      const p = spot(0.5);
      if (p) boxAt('trim', p[0], p[1], 0.42, 0, 0.62, 0.18, AC);
    }
    // A shed of corrugated roofing on a villa; a rail round some roofs; an antenna.
    if (type === 'villa' && r() < 0.45) {
      const p = spot(2);
      if (p) {
        const col = [C('#2f7f4e'), C('#2f5fa5'), C('#b5462a')][Math.floor(r() * 3)];
        boxAt('trim', p[0], p[1], 1.9, 0, 2.0, 1.6, C('#d9d6cc'));
        boxAt('shutter', p[0], p[1], 2.1, 2.0, 2.12, 1.8, col);
      }
    }
    if (r() < 0.35) {
      const p = spot(0.3);
      if (p) {
        boxAt('trim', p[0], p[1], 0.03, 0, 3.2, 0.03, C('#8a8d92'));
        boxAt('trim', p[0], p[1], 0.6, 2.6, 2.63, 0.02, C('#8a8d92'));
      }
    }
    if (r() < 0.25) {
      const p = spot(1.4);
      if (p) {
        // Solar panels, tilted to the south.
        const y0 = top + 0.4;
        G.quad('trim', [p[0] - 1.3, y0, p[1] - 0.8], [p[0] + 1.3, y0, p[1] - 0.8], [p[0] + 1.3, y0 + 0.9, p[1] + 0.5], [p[0] - 1.3, y0 + 0.9, p[1] + 0.5], [0, 0.82, -0.57], null, C('#1c2a4a'));
      }
    }
    // A rail round a villa's roof (it is somewhere to hang washing and sit out).
    if (type === 'villa' && r() < 0.5) {
      for (const w of walls) {
        if (w.len < 1) continue;
        const yT = H + (ctx.spec.parapet ?? 0);
        this._box(G, 'trim', w.W, 0, w.len, yT + 0.75, yT + 0.8, -0.15, -0.1, C('#d6d8da'));
        for (let s = 0; s <= w.len; s += 1.2) this._box(G, 'trim', w.W, s - 0.02, s + 0.02, yT, yT + 0.78, -0.15, -0.11, C('#d6d8da'));
      }
    }
  }

  _cyl(G, x, y0, z, rad, h, col, n = 10) {
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const a1 = ((k + 1) / n) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const p = (a, y) => [x + Math.cos(a) * rad, y, z + Math.sin(a) * rad];
      G.quad('trim', p(a0, y0), p(a1, y0), p(a1, y0 + h), p(a0, y0 + h), [Math.cos(am), 0, Math.sin(am)], null, col);
      G.quad('trim', [x, y0 + h, z], [x, y0 + h, z], p(a1, y0 + h), p(a0, y0 + h), [0, 1, 0], null, mul(col, 1.05));
    }
  }

  _inside(b, x, z) {
    let inside = false;
    for (let i = 0, j = b.xs.length - 1; i < b.xs.length; j = i++) {
      if ((b.zs[i] > z) !== (b.zs[j] > z) && x < ((b.xs[j] - b.xs[i]) * (z - b.zs[i])) / (b.zs[j] - b.zs[i]) + b.xs[i]) inside = !inside;
    }
    return inside;
  }

  dispose() {
    for (const batch of this.batches) {
      for (const m of batch.meshes) m.geometry.dispose();
      for (const b of batch.list) this.g.hideWalls?.(b, false);
    }
    this.batches = [];
    this.queue = [];
    this.open = null;
    this.done.clear();
    this.g.scene.remove(this.group);
    for (const m of this.mats.values()) m.dispose();
    this.atlas.dispose();
  }
}
