/**
 * The realms beyond Lanternwood, built in 3D from their layouts (realms.js)
 * and a look each: Sunmeadow Hills (a sunlit day of fields, round trees, a
 * windmill hamlet, fairy rings), Frostpeak Hollows (snow under an aurora,
 * snowy pines, ice crystals, a frozen lake, a garrison) and Emberfall Caldera
 * (black basalt, lava pools, dead trees, ash and embers, a forge town).
 *
 * Same surface as world.js's buildWorld, so the game drives either:
 *   const w = buildRealmWorld('frostpeak', { makeFx, sprites });
 *   w.update(dt, { camera, hero, yaw }); w.lightAt(x, z); w.solids; w.trees; w.gather; w.chests …
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { REALMS, seeded, treesFor, solidsFor } from './rules.js';
import { coloured, fadingMaterial, texture, tile, flagstones, coniferGeometry } from './world.js';
import { FxBillboard, SpriteActor, canvasOf } from './gfx.js';
import { ChunkedInstances, buildWaystone, buildChest } from './props.js';

const SPAN = 360;
const FIRE_RAMP = ['#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6', '#ffffff'];

/** Each realm's colours and moods. */
const LOOKS = {
  sunmeadow: {
    sky: { top: '#3f8ee0', horizon: '#d6ecfa', sun: [0.45, 0.72, -0.52], sunColor: '#fff6d8', clouds: 1, stars: 0, aurora: 0, ash: 0 },
    fog: ['#cfe6f4', 0.0075], far: 150,
    hemi: ['#cfe8ff', '#6a8a40', 1.7], sun: ['#fff2d6', 2.8],
    ambient: [1.02, 1.0, 0.9],
    tiles: {
      base: [['#3e7a30', '#4a8a36', '#5a9a3e', '#6aaa46', '#84c056'], { seed: 12, waves: [[1, 2, 0.45], [3, 1, 0.3], [2, 5, 0.2]], speck: { count: 320, colors: ['#9ad060', '#f0f0f0', '#f0d040', '#e080b0'], w: 1, h: 1 } }],
      path: [['#7a5c3a', '#8a6a44', '#9a7a52', '#aa8a60', '#ba9a6e'], { seed: 13, waves: [[2, 1, 0.8], [1, 3, 0.6], [5, 2, 0.3]], speck: { count: 120, colors: ['#c8b08a', '#6a5034'], w: 2, h: 1 } }],
      floor: null,
      special: [['#a8883a', '#b89a44', '#c8aa50', '#d8ba5e', '#e8ca70'], { seed: 14, waves: [[4, 1, 0.7], [8, 2, 0.3], [1, 5, 0.2]], speck: { count: 220, colors: ['#f0dc90', '#8a7030'], w: 1, h: 3 } }]
    },
    floorAreas: ['hamlet', 'grove'], specialAreas: ['barley'], stoneAreas: ['hamlet', 'grove'],
    flora: 'broadleaf', grass: ['#3a7a2a', '#4a8a30', '#5a9a38', '#74b048', '#94c860'], grassCount: 22000,
    particles: 'pollen', waystone: '#ffe08a', rock: '#8a8478'
  },
  frostpeak: {
    sky: { top: '#071226', horizon: '#3a5e88', sun: [-0.4, 0.55, -0.7], sunColor: '#e0eeff', clouds: 0, stars: 1, aurora: 1, ash: 0 },
    fog: ['#4e6c94', 0.0125], far: 125,
    hemi: ['#b0ccff', '#40506a', 1.9], sun: ['#d8e8ff', 2.4],
    ambient: [0.66, 0.76, 1.0],
    tiles: {
      base: [['#9aa8c2', '#aebcd4', '#c2d0e4', '#d6e2f0', '#eef4fc'], { seed: 22, waves: [[1, 2, 0.35], [3, 1, 0.25], [2, 5, 0.2]], speck: { count: 200, colors: ['#ffffff', '#8aa0c0'], w: 1, h: 1 } }],
      path: [['#5a6478', '#6a7488', '#7a8498', '#8a94a8', '#9aa4b8'], { seed: 23, waves: [[2, 1, 0.8], [1, 3, 0.6]], speck: { count: 140, colors: ['#c8d4e4', '#4a5464'], w: 2, h: 1 } }],
      floor: null,
      special: [['#2c5a8a', '#3a70a4', '#4a88bc', '#68a4d4', '#9ac8ec'], { seed: 25, waves: [[1, 1, 0.5], [6, 2, 0.2]], speck: { count: 160, colors: ['#e0f4ff', '#bfe8ff'], w: 3, h: 1 } }]
    },
    floorAreas: ['rimehold', 'garrison', 'throne'], specialAreas: ['lake'], stoneAreas: ['rimehold', 'garrison', 'throne'],
    flora: 'snowpine', grass: null,
    particles: 'snow', waystone: '#9ae8ff', rock: '#8a96aa'
  },
  emberfall: {
    sky: { top: '#140808', horizon: '#7a2e14', sun: [0.2, 0.32, -0.92], sunColor: '#ff9a4a', clouds: 0, stars: 0, aurora: 0, ash: 1 },
    fog: ['#4a2216', 0.012], far: 120,
    hemi: ['#ffb088', '#4a2418', 2.1], sun: ['#ffbe90', 2.4],
    ambient: [0.92, 0.66, 0.54],
    tiles: {
      base: [['#2a2226', '#342a2c', '#3e3434', '#4a3e3c', '#5a4a46'], { seed: 32, waves: [[1, 2, 0.4], [3, 1, 0.3], [2, 5, 0.2]], speck: { count: 200, colors: ['#5a4a46', '#0c0808', '#6a3020'], w: 1, h: 1 } }],
      path: [['#463a36', '#54463f', '#625248', '#725e52', '#826c5e'], { seed: 33, waves: [[2, 1, 0.8], [1, 3, 0.6]], speck: { count: 140, colors: ['#9a8474', '#2a201c'], w: 2, h: 1 } }],
      floor: [['#3a2622', '#46302a', '#523a32', '#62463a', '#725242'], { seed: 34, waves: [[2, 1, 0.4], [1, 3, 0.3]], speck: { count: 160, colors: ['#ff8a3a', '#1a1010'], w: 1, h: 1 } }],
      special: [['#3a0c08', '#6a1a0c', '#a83a10', '#e86a1a', '#ffb040'], { seed: 35, waves: [[3, 2, 0.9], [7, 3, 0.5], [2, 9, 0.3]], speck: { count: 60, colors: ['#fff0a0'], w: 1, h: 1 } }]
    },
    floorAreas: ['forge', 'temple', 'crown', 'quarry'], specialAreas: ['vents', 'flows'], stoneAreas: ['forge', 'temple', 'crown'],
    flora: 'deadwood', grass: null, lava: true,
    particles: 'ash', waystone: '#ffb04a', rock: '#3a3236'
  }
};

/* --------------------------------------------------------- the ground */

function splatFor(L, look) {
  const S = 1024;
  const at = (v) => ((v + SPAN / 2) / SPAN) * S;
  const m = S / SPAN;
  return canvasOf(S, S, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'lighter';
    g.filter = 'blur(2px)';
    const blob = (x, z, r, rgb, k = 0.65) => {
      const gr = g.createRadialGradient(at(x), at(z), 0, at(x), at(z), r * m);
      gr.addColorStop(0, rgb);
      gr.addColorStop(k, rgb);
      gr.addColorStop(1, 'rgb(0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, S, S);
    };
    // R: paths and the hub's packed earth; G: the named places' floors; B: the realm's special ground.
    g.strokeStyle = 'rgb(255,0,0)';
    g.lineCap = g.lineJoin = 'round';
    g.lineWidth = 3.6 * m;
    for (const path of L.paths) {
      g.beginPath();
      path.forEach(([x, z], i) => (i ? g.lineTo(at(x), at(z)) : g.moveTo(at(x), at(z))));
      g.stroke();
    }
    for (const id of look.floorAreas) {
      const a = L.areas[id];
      if (a) blob(a.x, a.z, a.r * 0.95, 'rgb(0,255,0)', 0.6);
    }
    for (const id of look.specialAreas) {
      const a = L.areas[id];
      if (a) blob(a.x, a.z, a.r * 1.05, 'rgb(0,0,255)', 0.55);
    }
    blob(L.waystone.x, L.waystone.z, 6, 'rgb(0,255,0)', 0.7);
    if (look.lava) for (const l of L.landmarks.filter((x) => x.type === 'lava')) blob(l.x, l.z, l.r * 1.9, 'rgb(0,0,255)', 0.5);
  });
}

function groundMaterial(L, look, uniforms) {
  const splat = texture(splatFor(L, look), false, false);
  splat.magFilter = splat.minFilter = THREE.LinearFilter;
  const T = look.tiles;
  const base = texture(tile(128, ...T.base));
  const path = texture(tile(128, ...T.path));
  const floor = T.floor ? texture(tile(128, ...T.floor)) : texture(flagstones(128));
  const special = texture(tile(128, ...T.special));
  const mat = new THREE.MeshLambertMaterial({ map: splat });
  const u = { tBase: { value: base }, tPath: { value: path }, tFloor: { value: floor }, tSpec: { value: special }, uTile: { value: SPAN / 4 }, uTime: uniforms.uTime, uLava: { value: look.lava ? 1 : 0 }, uIce: { value: look.particles === 'snow' ? 1 : 0 } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tBase, tPath, tFloor, tSpec;\nuniform float uTile, uTime, uLava, uIce;')
      .replace('#include <map_fragment>', /* glsl */ `
vec4 sp = texture2D(map, vMapUv);
vec2 tuv = vMapUv * uTile;
vec3 cB = texture2D(tBase, tuv).rgb;
vec3 cP = texture2D(tPath, tuv * 1.1).rgb;
vec3 cF = texture2D(tFloor, tuv * 0.8).rgb;
vec3 cS = texture2D(tSpec, tuv * 0.9).rgb;
float lumB = dot(cB, vec3(0.33));
vec3 col = mix(cB, cS, smoothstep(0.35, 0.6, sp.b + (lumB - 0.3) * 1.4));
col = mix(col, cP, smoothstep(0.4, 0.6, sp.r + (lumB - 0.3) * 1.6));
col = mix(col, cF, smoothstep(0.42, 0.58, sp.g + (dot(cF, vec3(0.33)) - 0.3) * 1.4));
diffuseColor.rgb *= col;`)
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
float lava = uLava * smoothstep(0.45, 0.8, sp.b) * smoothstep(0.25, 0.75, dot(cS, vec3(0.5, 0.35, 0.15)) * 2.0);
totalEmissiveRadiance += vec3(1.0, 0.38, 0.08) * lava * (0.9 + 0.35 * sin(uTime * 1.7 + vMapUv.x * 70.0 + vMapUv.y * 40.0));
totalEmissiveRadiance += vec3(0.1, 0.18, 0.28) * uIce * smoothstep(0.45, 0.8, sp.b) * (0.6 + 0.4 * sin(uTime * 0.6 + vMapUv.y * 120.0));`);
  };
  mat.customProgramCacheKey = () => `ld-realm-ground-${L.id}`;
  return { mat, textures: [splat, base, path, floor, special] };
}

/* ---------------------------------------------------------------- sky */

function skyMesh(look) {
  const S = look.sky;
  return new THREE.Mesh(
    new THREE.SphereGeometry(300, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTop: { value: new THREE.Color(S.top) }, uHor: { value: new THREE.Color(S.horizon) }, uSun: { value: new THREE.Vector3(...S.sun).normalize() }, uSunC: { value: new THREE.Color(S.sunColor) }, uTime: { value: 0 }, uK: { value: new THREE.Vector4(S.clouds, S.stars, S.aurora, S.ash) } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
      fragmentShader: /* glsl */ `
varying vec3 vDir; uniform vec3 uTop, uHor, uSun, uSunC; uniform float uTime; uniform vec4 uK;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = h(vec3(i,0.)), b = h(vec3(i+vec2(1,0),0.)), c = h(vec3(i+vec2(0,1),0.)), d = h(vec3(i+vec2(1,1),0.));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
void main(){
  float y = max(vDir.y, 0.0);
  vec3 col = mix(uHor, uTop, pow(y, 0.55));
  float m = dot(normalize(vDir), uSun);
  col += uSunC * smoothstep(0.9985, 0.9992, m) * 2.0;
  col += uSunC * pow(max(m, 0.0), 24.0) * 0.45;
  if (uK.x > 0.0) {
    vec2 q = vDir.xz / max(0.08, vDir.y) * 1.6 + vec2(uTime * 0.01, 0.0);
    float c = n2(q) * 0.6 + n2(q * 2.3) * 0.3 + n2(q * 5.1) * 0.1;
    col = mix(col, vec3(1.0), smoothstep(0.55, 0.8, c) * smoothstep(0.02, 0.25, y) * 0.85 * uK.x);
  }
  if (uK.y > 0.0) {
    vec3 sq = floor(vDir * 220.0);
    col += vec3(0.8,0.85,1.0) * step(0.9972, h(sq)) * smoothstep(0.05, 0.3, y) * (0.5 + 0.5 * h(sq + 1.0)) * uK.y;
  }
  if (uK.z > 0.0) {
    float band = sin(vDir.x * 6.0 + uTime * 0.25 + sin(vDir.z * 4.0 + uTime * 0.18) * 1.6);
    float a = smoothstep(0.15, 0.6, y) * smoothstep(0.85, 0.45, y) * (0.5 + 0.5 * band);
    float curtain = n2(vec2(vDir.x * 18.0 + uTime * 0.6, y * 3.0)) ;
    col += mix(vec3(0.1, 0.9, 0.6), vec3(0.5, 0.3, 0.9), smoothstep(0.3, 0.7, y)) * a * (0.35 + curtain * 0.5) * uK.z;
  }
  if (uK.w > 0.0) {
    col = mix(col, vec3(0.35, 0.12, 0.06), smoothstep(0.25, 0.0, y) * 0.6 * uK.w);
    float smoke = n2(vDir.xz / max(0.1, vDir.y) * 1.2 + vec2(uTime * 0.02, 0.0));
    col = mix(col, vec3(0.12, 0.06, 0.05), smoothstep(0.4, 0.8, smoke) * smoothstep(0.05, 0.4, y) * 0.7 * uK.w);
  }
  gl_FragColor = vec4(col, 1.0);
}`
    })
  );
}

/* --------------------------------------------------------- the flora */

function broadleafGeometry(lod = false) {
  const parts = [coloured(new THREE.CylinderGeometry(0.22, 0.36, 2.6, lod ? 4 : 6).translate(0, 1.3, 0), '#6a4a30', '#3a2818')];
  const blobs = lod ? [[0, 3.6, 0, 2.2]] : [[0, 3.4, 0, 1.9], [1.1, 3.0, 0.4, 1.3], [-1.0, 3.1, -0.3, 1.4], [0.2, 4.4, -0.2, 1.4], [-0.3, 3.2, 1.0, 1.2]];
  for (const [x, y, z, r] of blobs) parts.push(coloured(new THREE.IcosahedronGeometry(r, lod ? 0 : 1).translate(x, y, z), '#7ac050', '#2a5a24'));
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  parts.forEach((p) => p.dispose());
  g.computeVertexNormals();
  return g;
}

function deadTreeGeometry(lod = false) {
  const parts = [coloured(new THREE.CylinderGeometry(0.16, 0.38, 4.2, lod ? 4 : 6).translate(0, 2.1, 0), '#2a2220', '#141010')];
  if (!lod) {
    for (const [ang, y, len, tilt] of [[0.3, 2.6, 1.8, 0.9], [2.4, 3.1, 1.5, 0.8], [4.2, 2.2, 1.6, 1.0], [5.4, 3.6, 1.1, 0.6]]) {
      const b = new THREE.CylinderGeometry(0.05, 0.12, len, 4).translate(0, len / 2, 0).rotateZ(tilt).rotateY(ang).translate(0, y, 0);
      parts.push(coloured(b, '#3a2e2a', '#1a1414'));
    }
  }
  // Embers still glowing in the cracks near the foot.
  parts.push(coloured(new THREE.CylinderGeometry(0.4, 0.42, 0.18, 6).translate(0, 0.09, 0), '#c84a14', '#5a1a0a'));
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  parts.forEach((p) => p.dispose());
  g.computeVertexNormals();
  return g;
}

/* ---------------------------------------------------------- landmarks */

function landmark(l, ctx) {
  const { mats, own, group, extraSolids, sources, animate, makeFx, flames } = ctx;
  const g = new THREE.Group();
  g.position.set(l.x, 0, l.z);
  g.rotation.y = l.rot ?? 0;
  group.add(g);
  const box = (w, h, d, x, y, z, m, ry = 0) => {
    const geo = own(new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const cyl = (rt, rb, h, seg, x, y, z, m) => {
    const mesh = new THREE.Mesh(own(new THREE.CylinderGeometry(rt, rb, h, seg)), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const roof = (w, h, d, y, m) => {
    // A gable roof: a triangle (eaves overhanging) pushed out along z.
    const shape = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.3, -0.15), new THREE.Vector2(w / 2 + 0.3, -0.15), new THREE.Vector2(0, h)]);
    const geo = own(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2));
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(0, y, 0);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const windowGlow = (x, y, z, ry = 0) => box(0.6, 0.6, 0.06, x, y, z, mats.window, ry);
  switch (l.type) {
    case 'windmill': {
      cyl(1.6, 2.3, 7, 8, 0, 3.5, 0, mats.plaster);
      const cap = cyl(0, 2.0, 2.2, 8, 0, 8.1, 0, mats.roof);
      cap.castShadow = true;
      box(0.9, 1.6, 0.1, 0, 0.8, 2.25, mats.wood);
      windowGlow(0, 4.6, 1.95);
      const hub = new THREE.Group();
      hub.position.set(0, 6.6, 2.1);
      g.add(hub);
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(own(new THREE.BoxGeometry(0.5, 4.8, 0.08).translate(0, 2.6, 0)), mats.sail);
        blade.rotation.z = (i / 4) * Math.PI * 2;
        blade.castShadow = true;
        hub.add(blade);
      }
      animate.push((dt) => (hub.rotation.z += dt * 0.6));
      break;
    }
    case 'house': {
      box(5, 3, 4, 0, 1.5, 0, mats.plaster);
      roof(5.6, 2.2, 4.6, 3, mats.roof);
      box(1, 1.8, 0.1, 0, 0.9, 2.02, mats.wood);
      windowGlow(-1.6, 1.8, 2.02);
      windowGlow(1.6, 1.8, 2.02);
      box(0.6, 1.4, 0.6, 1.6, 4.2, -0.8, mats.stone);
      sources.push({ x: l.x, y: 2, z: l.z, power: 0.5, color: '#ffc870' });
      break;
    }
    case 'lodge': {
      for (let i = 0; i < 6; i++) box(6, 0.5, 0.5, 0, 0.25 + i * 0.5, 2.2, mats.wood).rotation.set(0, 0, 0);
      box(6, 3, 4.4, 0, 1.5, 0, mats.wood);
      roof(7, 2.4, 5.2, 3, mats.snowRoof);
      box(1.1, 2, 0.1, 0, 1, 2.48, mats.dark);
      windowGlow(-1.8, 1.8, 2.48);
      windowGlow(1.8, 1.8, 2.48);
      box(0.7, 1.6, 0.7, -2, 4.4, -1, mats.stone);
      sources.push({ x: l.x, y: 2, z: l.z, power: 0.9, color: '#ffb060' });
      break;
    }
    case 'forgehall': {
      for (const [x, z] of [[-2.6, -2], [2.6, -2], [-2.6, 2], [2.6, 2]]) box(0.5, 3.4, 0.5, x, 1.7, z, mats.stone);
      roof(6.6, 1.8, 5, 3.4, mats.dark);
      box(2, 1.2, 1.4, 0, 0.6, -0.8, mats.stone);
      box(1.4, 0.3, 1.0, 0, 1.25, -0.8, mats.lava);
      box(0.8, 3, 0.8, 0, 4.2, -1.6, mats.stone);
      sources.push({ x: l.x, y: 1.6, z: l.z, power: 1.6, color: '#ff7a2a' });
      const f = new FxBillboard(makeFx('fire/campfire', { palette: FIRE_RAMP, light: 0.4 }), { pxm: 28, color: 1.2 });
      f.mesh.position.set(l.x, 1.3, l.z - 0.6);
      group.add(f.mesh);
      flames.push(f);
      break;
    }
    case 'anvil':
      box(0.5, 0.6, 0.4, 0, 0.3, 0, mats.dark);
      box(1.0, 0.25, 0.42, 0, 0.72, 0, mats.metal);
      box(0.3, 0.16, 0.2, 0.62, 0.74, 0, mats.metal);
      break;
    case 'well':
      cyl(1.1, 1.2, 0.9, 10, 0, 0.45, 0, mats.stone);
      box(0.15, 2.2, 0.15, -0.9, 1.1, 0, mats.wood);
      box(0.15, 2.2, 0.15, 0.9, 1.1, 0, mats.wood);
      roof(2.4, 0.9, 1.6, 2.1, mats.roof);
      break;
    case 'hay':
      cyl(1.1, 1.1, 1.4, 10, 0, 0.7, 0, mats.hay).rotation.z = Math.PI / 2;
      break;
    case 'pond': {
      const w = new THREE.Mesh(own(new THREE.CircleGeometry(l.r + 0.6, 40).rotateX(-Math.PI / 2)), mats.water);
      w.position.y = 0.05;
      g.add(w);
      const rs = seeded(l.x * 7 + 3);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const st = new THREE.Mesh(own(new THREE.DodecahedronGeometry(0.4 + rs() * 0.4, 0)), mats.rock);
        st.position.set(Math.cos(a) * (l.r + 0.8), 0.15, Math.sin(a) * (l.r + 0.8));
        st.castShadow = st.receiveShadow = true;
        g.add(st);
      }
      break;
    }
    case 'stones': {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const h = 1.6 + (i % 3) * 0.6;
        box(0.8, h, 0.5, Math.cos(a) * 11, h / 2, Math.sin(a) * 11, mats.stone, -a);
        extraSolids.push({ x: l.x + Math.cos(a) * 11, z: l.z + Math.sin(a) * 11, r: 0.55 });
      }
      break;
    }
    case 'bigtree': {
      // Gnarlroot's grove: a ring of great roots round the clearing, a giant stump behind.
      const back = new THREE.Group();
      back.position.set(0, 0, -16);
      g.add(back);
      const trunk = new THREE.Mesh(own(new THREE.CylinderGeometry(2.6, 4.2, 12, 8)), mats.bark);
      trunk.position.y = 6;
      trunk.castShadow = true;
      back.add(trunk);
      for (const [x, y, z, r] of [[0, 14, 0, 6], [4, 12, -1, 4.5], [-4.5, 12.5, 1, 4.6], [1, 16, 2, 4]]) {
        const c = new THREE.Mesh(own(new THREE.IcosahedronGeometry(r, 1)), mats.leaf);
        c.position.set(x, y, z);
        c.castShadow = true;
        back.add(c);
      }
      extraSolids.push({ x: l.x, z: l.z - 16, r: 3.6 });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const root = box(1.2, 1.1, 5, Math.cos(a) * 20, 0.4, Math.sin(a) * 20, mats.bark, -a);
        root.rotation.x = 0.15;
        if (Math.abs(Math.sin(a) - 1) > 0.3) extraSolids.push({ x: l.x + Math.cos(a) * 20, z: l.z + Math.sin(a) * 20, r: 1.2 });
      }
      break;
    }
    case 'icearch': {
      for (const s of [-1, 1]) {
        box(2.2, 6, 2.2, s * 5, 3, 0, mats.iceRock);
        extraSolids.push({ x: l.x + s * 5, z: l.z, r: 1.5 });
      }
      box(12.4, 2, 2.2, 0, 6.6, 0, mats.iceRock);
      for (let i = 0; i < 7; i++) box(0.4, 1 + (i % 3) * 0.6, 0.4, -4.5 + i * 1.5, 5.2, 0.4, mats.ice);
      break;
    }
    case 'crystal': {
      const rs = seeded(l.x * 3 + l.z);
      for (let i = 0; i < 6; i++) {
        const c = new THREE.Mesh(own(new THREE.OctahedronGeometry(0.8, 0)), mats.ice);
        const s = 1 + rs() * 1.6;
        c.scale.set(s * 0.6, s * 2.4, s * 0.6);
        c.position.set((rs() - 0.5) * l.r * 1.4, s * 1.4, (rs() - 0.5) * l.r * 1.4);
        c.rotation.set((rs() - 0.5) * 0.6, rs() * 3, (rs() - 0.5) * 0.6);
        c.castShadow = true;
        g.add(c);
      }
      sources.push({ x: l.x, y: 2.5, z: l.z, power: 1.2, color: '#8ae8ff' });
      break;
    }
    case 'lake': {
      const ice = new THREE.Mesh(own(new THREE.CircleGeometry(21, 48).rotateX(-Math.PI / 2)), mats.lakeIce);
      ice.position.y = 0.04;
      ice.receiveShadow = true;
      g.add(ice);
      break;
    }
    case 'wall': {
      // The frozen garrison: broken walls round a square, gaps to walk through.
      const segs = [[-14, -14, 10, 0], [6, -14, 8, 0], [-14, 14, 8, 0], [8, 14, 12, 0], [-14, -6, 10, Math.PI / 2], [14, -2, 14, Math.PI / 2], [-14, 10, 6, Math.PI / 2]];
      for (const [x, z, len, ry] of segs) {
        box(len, 2.4, 1.2, x + (ry ? 0 : len / 2), 1.2, z + (ry ? len / 2 : 0), mats.iceRock, ry);
        const n = Math.ceil(len / 2);
        for (let i = 0; i <= n; i++) extraSolids.push({ x: l.x + x + (ry ? 0 : (i / n) * len), z: l.z + z + (ry ? (i / n) * len : 0), r: 0.9 });
      }
      for (const [x, z] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) box(2.2, 4.2, 2.2, x, 2.1, z, mats.iceRock);
      break;
    }
    case 'throne': {
      box(4, 0.8, 3, 0, 0.4, 0, mats.iceRock);
      box(2.4, 1.2, 1.8, 0, 1.4, 0, mats.ice);
      box(2.6, 4.5, 0.6, 0, 3.2, -1.1, mats.ice);
      for (let i = 0; i < 5; i++) {
        const sp = new THREE.Mesh(own(new THREE.OctahedronGeometry(0.4, 0)), mats.ice);
        sp.scale.set(0.6, 3, 0.6);
        sp.position.set(-1.6 + i * 0.8, 6 + (i % 2) * 0.8, -1.1);
        g.add(sp);
      }
      sources.push({ x: l.x, y: 3, z: l.z, power: 1.4, color: '#9ae8ff' });
      break;
    }
    case 'temple': {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const h = 4 + (i % 2) * 1.2;
        box(1.1, h, 1.1, Math.cos(a) * 11, h / 2, Math.sin(a) * 11, mats.obsidian);
        extraSolids.push({ x: l.x + Math.cos(a) * 11, z: l.z + Math.sin(a) * 11, r: 0.8 });
      }
      box(3, 0.9, 3, 0, 0.45, 0, mats.obsidian);
      extraSolids.push({ x: l.x, z: l.z, r: 1.8 });
      const f = new FxBillboard(makeFx('fire/brazier', { palette: FIRE_RAMP }), { pxm: 30, color: 1.3 });
      f.mesh.position.set(l.x, 0.9, l.z);
      group.add(f.mesh);
      flames.push(f);
      sources.push({ x: l.x, y: 2, z: l.z, power: 1.6, color: '#ff7a2a' });
      break;
    }
    case 'lava': {
      const pool = new THREE.Mesh(own(new THREE.CircleGeometry(l.r, 28).rotateX(-Math.PI / 2)), mats.lavaPool);
      pool.position.y = 0.07;
      g.add(pool);
      const rs = seeded(l.x * 5 + l.z);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const st = new THREE.Mesh(own(new THREE.DodecahedronGeometry(0.5 + rs() * 0.5, 0)), mats.obsidian);
        st.position.set(Math.cos(a) * (l.r + 0.3), 0.2, Math.sin(a) * (l.r + 0.3));
        st.castShadow = true;
        g.add(st);
      }
      sources.push({ x: l.x, y: 1, z: l.z, power: 2.0, color: '#ff6a1a' });
      break;
    }
    case 'spire': {
      const sp = cyl(0, 1.6, 9, 5, 0, 4.5, 0, mats.obsidian);
      sp.rotation.y = l.x;
      break;
    }
    default:
  }
  return g;
}

/* -------------------------------------------------------------- build */

/**
 * @param {string} realmId 'sunmeadow' | 'frostpeak' | 'emberfall'
 * @param {{ makeFx: Function, sprites: object }} deps
 */
export function buildRealmWorld(realmId, { makeFx, sprites }) {
  const R = REALMS[realmId];
  const L = R.layout;
  const look = LOOKS[realmId];
  const scene = new THREE.Scene();
  const disposables = [];
  const own = (x) => {
    disposables.push(x);
    return x;
  };
  const uniforms = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uHero: { value: new THREE.Vector3() } };
  scene.fog = new THREE.FogExp2(look.fog[0], look.fog[1]);
  scene.background = new THREE.Color(look.fog[0]);

  const sky = skyMesh(look);
  own(sky.geometry);
  own(sky.material);
  sky.renderOrder = -10;
  scene.add(sky);

  /* light */
  const hemi = new THREE.HemisphereLight(look.hemi[0], look.hemi[1], look.hemi[2]);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(look.sun[0], look.sun[1]);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const SUN_DIR = new THREE.Vector3(...look.sky.sun).normalize();
  if (SUN_DIR.y < 0.4) SUN_DIR.y = 0.55;
  SUN_DIR.normalize();

  /* ground */
  const ground = groundMaterial(L, look, uniforms);
  disposables.push(ground.mat, ...ground.textures);
  const groundMesh = new THREE.Mesh(own(new THREE.PlaneGeometry(SPAN, SPAN).rotateX(-Math.PI / 2)), ground.mat);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  /* materials for the set pieces */
  const lam = (c, extra = {}) => own(new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...extra }));
  const mats = {
    plaster: lam('#e8dcc0'), roof: lam('#a84a34'), wood: lam('#7a5434'), sail: lam('#f0ead8'), stone: lam('#8a8478'), dark: lam('#3a2c24'), metal: lam('#5a5a64'),
    window: own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(1.6) })), hay: lam('#e0c060'),
    water: own(new THREE.MeshLambertMaterial({ color: '#3a7ab0', emissive: '#10345a', transparent: true, opacity: 0.9 })), rock: lam(look.rock),
    bark: lam('#5a3e2a'), leaf: lam('#5aa040'), snowRoof: lam('#e8f0fa'), iceRock: lam('#8aa0c0'),
    ice: own(new THREE.MeshLambertMaterial({ color: '#a8e0ff', emissive: '#2a6a9a', flatShading: true, transparent: true, opacity: 0.9 })),
    lakeIce: own(new THREE.MeshLambertMaterial({ color: '#8ac0e8', emissive: '#14304a', transparent: true, opacity: 0.85 })),
    obsidian: lam('#221a20'), lava: own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a2a').multiplyScalar(1.6) })),
    lavaPool: own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6a1a').multiplyScalar(1.4) }))
  };
  if (realmId === 'emberfall') mats.stone.color.set('#4a3c38');
  if (realmId === 'frostpeak') mats.stone.color.set('#9aa6b8');

  /* flora */
  const trees = treesFor(realmId);
  const rand = seeded(realmId.length * 41);
  const treeMat = own(fadingMaterial({ vertexColors: true, flatShading: true }, uniforms, `ld-tree-${realmId}`));
  let treeGeo, treeLod;
  if (look.flora === 'broadleaf') {
    treeGeo = own(broadleafGeometry());
    treeLod = own(broadleafGeometry(true));
  } else if (look.flora === 'snowpine') {
    treeGeo = own(coniferGeometry({ needles: ['#3a6a5a', '#345e52', '#16302a'] }));
    treeLod = own(coniferGeometry({ lod: true, needles: ['#3a6a5a', '#345e52', '#16302a'] }));
    // Snow on the tiers: whiten the tops of the cones.
    for (const g of [treeGeo, treeLod]) {
      const p = g.attributes.position, c = g.attributes.color;
      for (let i = 0; i < p.count; i++) {
        if (p.getY(i) < 2.3) continue;
        const up = g.attributes.normal.getY(i);
        if (up > 0.25) c.setXYZ(i, 0.88, 0.93, 1.0);
      }
    }
  } else {
    treeGeo = own(deadTreeGeometry());
    treeLod = own(deadTreeGeometry(true));
  }
  const forest = new ChunkedInstances(scene, treeGeo, treeMat, trees.map((t) => {
    const k = t.s * (0.95 + rand() * 0.3);
    const tint = look.flora === 'broadleaf' ? new THREE.Color().setHSL(0.25 + (rand() - 0.5) * 0.08, 0.5, 0.8 + rand() * 0.3) : look.flora === 'snowpine' ? new THREE.Color().setHSL(0.45, 0.2, 0.85 + rand() * 0.25) : new THREE.Color().setHSL(0.05, 0.2, 0.7 + rand() * 0.4);
    return { x: t.x, z: t.z, rot: rand() * 6.28, s: k, sx: 0.9 + rand() * 0.25, sy: 0.95 + rand() * 0.35, sz: 0.9 + rand() * 0.25, color: tint };
  }), { size: 32, lod: treeLod, lodDist: 60 });

  // Small things: rocks everywhere; bushes and flowers, ice crystals, or basalt columns and vents.
  const scatter = (n, seed, test = () => true) => {
    const r = seeded(seed);
    const out = [];
    for (let i = 0; i < n * 4 && out.length < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (L.radius - 4);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - L.waystone.x, z - L.waystone.z) < 7) continue;
      if (!test(x, z, r)) continue;
      out.push({ x, z, r });
    }
    return out;
  };
  const inPlace = (x, z, pad = 0) => Object.values(L.areas).some((a) => Math.hypot(x - a.x, z - a.z) < a.r + pad);
  const onPath = (x, z) => L.paths.some((p) => p.some(([px, pz]) => Math.hypot(px - x, pz - z) < 3));
  const rockGeo = own(coloured(new THREE.DodecahedronGeometry(0.8, 0), look.rock, '#2a2a30'));
  const rockMat = own(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const rockItems = scatter(260, 71, (x, z) => !onPath(x, z) && !inPlace(x, z, -6)).map(({ x, z, r }) => ({ x, z, rot: r() * 6, s: 0.5 + r() * 1.2, sy: 0.6 + r() * 0.5 }));
  const rocks = new ChunkedInstances(scene, rockGeo, rockMat, rockItems, { size: 40 });
  const extraSolids = rockItems.filter((it) => it.s > 1.1).map((it) => ({ x: it.x, z: it.z, r: 0.7 * it.s }));
  const smalls = [];
  if (look.flora === 'broadleaf') {
    const bushGeo = own(coloured(new THREE.IcosahedronGeometry(0.9, 1), '#6ab048', '#24501e'));
    const bushMat = own(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    smalls.push(new ChunkedInstances(scene, bushGeo, bushMat, scatter(500, 72, (x, z) => !onPath(x, z) && !inPlace(x, z)).map(({ x, z, r }) => ({ x, z, rot: r() * 6, s: 0.6 + r() * 0.7, sy: 0.75, color: new THREE.Color().setHSL(0.26 + r() * 0.06, 0.5, 0.8 + r() * 0.3) })), { size: 40 }));
  } else if (look.flora === 'snowpine') {
    const crystalGeo = own(new THREE.OctahedronGeometry(0.5, 0).scale(0.6, 2.2, 0.6));
    const crystalMat = own(new THREE.MeshLambertMaterial({ color: '#a8e8ff', emissive: '#3a8ac0', flatShading: true }));
    smalls.push(new ChunkedInstances(scene, crystalGeo, crystalMat, scatter(260, 73, (x, z) => !onPath(x, z) && !inPlace(x, z, -4)).map(({ x, z, r }) => ({ x, z, y: 0.4, rot: r() * 6, s: 0.6 + r() * 1.1 })), { size: 40, castShadow: false }));
    const driftGeo = own(new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2));
    const driftMat = own(new THREE.MeshLambertMaterial({ color: '#e8f0fa' }));
    smalls.push(new ChunkedInstances(scene, driftGeo, driftMat, scatter(380, 74, (x, z) => !onPath(x, z) && !inPlace(x, z)).map(({ x, z, r }) => ({ x, z, rot: r() * 6, s: 0.8 + r() * 1.6, sy: 0.35, sz: 0.7 })), { size: 40, castShadow: false }));
  } else {
    const colGeo = own(coloured(new THREE.CylinderGeometry(0.7, 0.8, 3, 6).translate(0, 1.5, 0), '#3a3236', '#141012'));
    const colMat = own(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    const cols = scatter(220, 75, (x, z) => !onPath(x, z) && !inPlace(x, z, 2)).map(({ x, z, r }) => ({ x, z, rot: r() * 6, s: 0.6 + r() * 0.9, sy: 0.6 + r() * 1.4 }));
    smalls.push(new ChunkedInstances(scene, colGeo, colMat, cols, { size: 40 }));
    for (const c of cols) if (c.s > 0.8) extraSolids.push({ x: c.x, z: c.z, r: 0.75 * c.s });
    const ventGeo = own(new THREE.CircleGeometry(0.9, 8).rotateX(-Math.PI / 2));
    const ventMat = own(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6a1a').multiplyScalar(1.3), transparent: true, opacity: 0.85, depthWrite: false }));
    smalls.push(new ChunkedInstances(scene, ventGeo, ventMat, scatter(160, 76, (x, z) => !onPath(x, z)).map(({ x, z, r }) => ({ x, z, y: 0.06, rot: r() * 6, s: 0.4 + r() * 0.8, sz: 0.5 + r() })), { size: 40, castShadow: false, receiveShadow: false }));
  }

  /* grass (the meadow) */
  let grass = null;
  if (look.grass) {
    const R2 = look.grass;
    const gcv = canvasOf(32, 24, (g) => {
      const r = seeded(19);
      for (let i = 0; i < 16; i++) {
        const x = 1 + Math.floor(r() * 30), h = 8 + Math.floor(r() * 15), lean = (r() - 0.5) * 0.5;
        for (let y = 0; y < h; y++) {
          g.fillStyle = R2[Math.min(4, Math.floor((y / h) * 4.5))];
          g.fillRect(Math.round(x + lean * y), 23 - y, 1, 1);
        }
        if (r() < 0.3) {
          g.fillStyle = ['#ff80b0', '#ffffff', '#ffd040', '#b080ff'][Math.floor(r() * 4)];
          g.fillRect(Math.round(x + lean * h) - 1, 23 - h, 3, 2);
        }
      }
    });
    const gt = own(texture(gcv, false));
    gt.minFilter = THREE.NearestFilter;
    gt.generateMipmaps = false;
    const qa = new THREE.PlaneGeometry(0.9, 0.62).translate(0, 0.31, 0);
    const qb = qa.clone().rotateY(Math.PI / 2);
    const gg = own(mergeGeometries([qa, qb]));
    qa.dispose();
    qb.dispose();
    for (let i = 0; i < gg.attributes.normal.count; i++) gg.attributes.normal.setXYZ(i, 0, 1, 0);
    const gm = own(new THREE.MeshLambertMaterial({ map: gt, alphaTest: 0.5, side: THREE.DoubleSide }));
    gm.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;').replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
transformed.x += sin(uTime * 1.9 + ph) * 0.09 * uv.y;
transformed.z += cos(uTime * 1.4 + ph) * 0.06 * uv.y;
#endif`);
    };
    gm.customProgramCacheKey = () => 'ld-grass-day';
    grass = new ChunkedInstances(scene, gg, gm, scatter(look.grassCount, 77, (x, z, r) => !onPath(x, z) && !look.floorAreas.some((id) => L.areas[id] && Math.hypot(x - L.areas[id].x, z - L.areas[id].z) < L.areas[id].r * 0.85) && r() < 0.5 + (Math.sin(x * 0.2) + Math.sin(z * 0.17)) * 0.3).map(({ x, z, r }, i) => ({ x, z, rot: r() * 6, s: 0.7 + r() * 0.8, color: new THREE.Color().setHSL(0.25 + (i % 7) * 0.01, 0.45, 0.9 + (i % 5) * 0.05) })), { size: 24, castShadow: false });
  }

  /* set pieces */
  const props = new THREE.Group();
  scene.add(props);
  const sources = [];
  const animate = [];
  const flames = [];
  for (const l of L.landmarks) landmark(l, { mats, own, group: props, extraSolids, sources, animate, makeFx, flames });
  props.traverse((o) => {
    if (o.isMesh && o.material !== mats.window && o.material !== mats.lavaPool && o.material !== mats.lava) o.castShadow = o.receiveShadow = true;
  });
  // Torches round the hub.
  const hub = Object.values(L.areas)[0];
  const torchPlayer = makeFx('fire/torch', { palette: FIRE_RAMP, light: 0.15 });
  const poleGeo = own(new THREE.CylinderGeometry(0.06, 0.08, 1.7, 6).translate(0, 0.85, 0));
  const poleMat = own(new THREE.MeshLambertMaterial({ color: '#4a3424' }));
  const torches = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5;
    const x = hub.x + Math.cos(a) * (hub.r - 3), z = hub.z + Math.sin(a) * (hub.r - 3);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 0, z);
    pole.castShadow = true;
    scene.add(pole);
    const f = new FxBillboard(torchPlayer, { pxm: 64, color: 1.3 });
    f.owner = false;
    f.mesh.position.set(x, 1.25, z);
    scene.add(f.mesh);
    flames.push(f);
    torches.push({ x, z });
    extraSolids.push({ x, z, r: 0.25 });
    sources.push({ x, y: 2, z, power: realmId === 'sunmeadow' ? 0.3 : 1, color: '#ff9a4a' });
  }

  /* waystone, chests, things to gather */
  const waystone = buildWaystone({ x: L.waystone.x, z: L.waystone.z, tint: look.waystone, stone: realmId === 'emberfall' ? '#3a3036' : realmId === 'frostpeak' ? '#8a98b0' : '#9a9488' });
  scene.add(waystone.group);
  sources.push({ x: L.waystone.x, y: 3, z: L.waystone.z, power: 1, color: look.waystone });
  const chests = L.chests.map((c, i) => ({ ...c, ...buildChest({ x: c.x, z: c.z, rot: i * 1.3, wood: realmId === 'emberfall' ? '#3a2a24' : '#7a4a2a', metal: realmId === 'frostpeak' ? '#a8c8e8' : '#d8a83a' }) }));
  for (const c of chests) scene.add(c.group);
  const gsprite = sprites.gather[L.gather.kind];
  const gather = L.gather.points.map(([x, z], i) => {
    const a = new SpriteActor({ shadow: 0.25, glow: 0.45 });
    a.show(gsprite);
    a.group.position.set(x, 0, z);
    scene.add(a.group);
    return { i, x, z, actor: a, taken: false, kind: L.gather.kind };
  });

  /* particles: pollen and petals, snowfall, or ash and embers */
  const N = look.particles === 'snow' ? 1400 : 600;
  const pPos = new Float32Array(N * 3);
  const pSeed = new Float32Array(N * 4);
  const pr = seeded(81);
  for (let i = 0; i < N; i++) pSeed.set([pr() * 60 - 30, pr() * 14, pr() * 60 - 30, pr()], i * 4);
  const pGeo = own(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const dotTex = own(new THREE.CanvasTexture(canvasOf(16, 16, (g) => {
    g.fillStyle = '#fff';
    g.fillRect(5, 5, 6, 6);
    g.fillStyle = 'rgba(255,255,255,0.4)';
    g.fillRect(3, 5, 10, 6);
    g.fillRect(5, 3, 6, 10);
  })));
  const pColor = { pollen: new THREE.Color('#fff4b0').multiplyScalar(1.2), snow: new THREE.Color('#ffffff'), ash: new THREE.Color('#ff9a4a').multiplyScalar(2) }[look.particles];
  const pMat = own(new THREE.PointsMaterial({ color: pColor, size: look.particles === 'snow' ? 0.11 : 0.09, map: dotTex, transparent: true, depthWrite: false, blending: look.particles === 'snow' ? THREE.NormalBlending : THREE.AdditiveBlending, opacity: 0.9 }));
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);

  /* the pooled lights that follow the hero round */
  const pool = Array.from({ length: 4 }, () => {
    const l = new THREE.PointLight('#ff9a4a', 0, 14, 1.8);
    scene.add(l);
    return l;
  });
  let poolTimer = 0;
  let near = [];

  const solids = [...solidsFor(realmId, trees), ...extraSolids];
  const ambient = new THREE.Color(...look.ambient);
  const tmp = new THREE.Color();

  const world = {
    scene,
    realm: realmId,
    trees,
    solids,
    herbs: [],
    gather,
    braziers: [],
    lanterns: [],
    chests,
    waystone: L.waystone,
    waystoneOn: true,
    uniforms,
    look: { far: look.far, ambient: look.particles },

    lightAt(x, z, out = new THREE.Color()) {
      out.copy(ambient);
      for (const s of near) {
        const d = Math.hypot(x - s.x, z - s.z);
        if (d > 9) continue;
        const k = (1 - d / 9) ** 2 * 0.8 * s.power;
        tmp.set(s.color);
        out.r += tmp.r * k;
        out.g += tmp.g * k;
        out.b += tmp.b * k;
      }
      out.r = Math.min(out.r, 1.15);
      out.g = Math.min(out.g, 1.08);
      out.b = Math.min(out.b, 1.05);
      return out;
    },
    setProgress() {},
    lightBrazier() {},
    openChest(id) {
      const c = chests.find((x) => x.id === id);
      if (c && !c.opened) c.open();
    },
    takeHerb(i) {
      const h = gather[i];
      if (!h || h.taken) return;
      h.taken = true;
      h.actor.group.visible = false;
    },
    reset() {
      for (const h of gather) {
        h.taken = false;
        h.actor.group.visible = true;
      }
      for (const c of chests) c.opened = false;
    },

    update(dt, { yaw, hero, camera }) {
      uniforms.uTime.value += dt;
      const t = uniforms.uTime.value;
      sky.material.uniforms.uTime.value = t;
      uniforms.uCam.value.copy(camera.position);
      uniforms.uHero.value.set(hero.x, 0, hero.z);
      sun.target.position.set(hero.x, 0, hero.z);
      sun.position.set(hero.x + SUN_DIR.x * 70, SUN_DIR.y * 70, hero.z + SUN_DIR.z * 70);
      sky.position.copy(camera.position);
      forest.update(hero.x, hero.z, look.far, 44);
      rocks.update(hero.x, hero.z, look.far * 0.8, 36);
      for (const s of smalls) s.update(hero.x, hero.z, look.far * 0.7, 30);
      grass?.update(hero.x, hero.z, 50, 0);
      waystone.update(dt, t, true);
      for (const c of chests) c.update(dt);
      for (const a of animate) a(dt, t);
      torchPlayer.update(dt);
      for (const f of flames) f.update(dt, yaw);
      for (const h of gather) {
        if (h.taken) continue;
        h.actor.lift = 0.05 + Math.sin(t * 2 + h.i) * 0.05;
        h.actor.update(dt, yaw, world.lightAt(h.x, h.z, tmp));
      }
      // Particles round the camera: snow falls, ash falls while embers rise, pollen drifts.
      const cx = camera.position.x, cz = camera.position.z;
      for (let i = 0; i < N; i++) {
        const [ox, oy, oz, k] = [pSeed[i * 4], pSeed[i * 4 + 1], pSeed[i * 4 + 2], pSeed[i * 4 + 3]];
        let y;
        if (look.particles === 'snow') y = 14 - ((oy + t * (0.8 + k)) % 14);
        else if (look.particles === 'ash') y = k < 0.5 ? (oy + t * (0.6 + k * 2)) % 14 : 14 - ((oy + t * 0.5) % 14);
        else y = 0.5 + ((oy * 0.25 + Math.sin(t * 0.5 + i) * 0.4) % 3.5);
        const wx = ((ox + Math.sin(t * 0.3 + i) * 1.5 + (look.particles === 'snow' ? t * 0.6 : 0) - cx) % 60 + 90) % 60 - 30;
        const wz = ((oz + Math.cos(t * 0.25 + i * 0.7) * 1.5 - cz) % 60 + 90) % 60 - 30;
        pPos[i * 3] = cx + wx;
        pPos[i * 3 + 1] = y;
        pPos[i * 3 + 2] = cz + wz;
      }
      pGeo.attributes.position.needsUpdate = true;
      // The four nearest flames and glows get a real light (re-chosen twice a second).
      poolTimer -= dt;
      if (poolTimer <= 0) {
        poolTimer = 0.5;
        near = sources.filter((s) => Math.hypot(s.x - hero.x, s.z - hero.z) < 40).sort((a, b) => Math.hypot(a.x - hero.x, a.z - hero.z) - Math.hypot(b.x - hero.x, b.z - hero.z));
        pool.forEach((l, i) => {
          const s = near[i];
          if (s) {
            l.position.set(s.x, s.y, s.z);
            l.color.set(s.color);
            l.userData.power = s.power;
          } else l.userData.power = 0;
        });
      }
      pool.forEach((l, i) => {
        l.intensity = (l.userData.power ?? 0) * 9 * (0.85 + 0.15 * Math.sin(t * 11 + i * 2.1));
      });
    },

    dispose() {
      forest.dispose();
      rocks.dispose();
      for (const s of smalls) s.dispose();
      grass?.dispose();
      waystone.dispose();
      for (const c of chests) c.dispose();
      for (const h of gather) h.actor.dispose();
      for (const f of flames) f.dispose();
      torchPlayer._texture?.dispose();
      for (const d of disposables) d.dispose?.();
      scene.clear();
    }
  };
  return world;
}
