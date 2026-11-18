/**
 * Lanternwood's world: a night forest with a camp in the middle. Ground
 * painted from pixel tiles and a splat map (dirt paths, ruin flagstones,
 * glowing glade moss), an instanced conifer forest that dithers away when it
 * stands between the camera and the hero, instanced grass, tents, the
 * Hearthlight bonfire, torches, lantern posts, the Greyvault ruins, fireflies,
 * a starry sky and a moon whose shadows follow the hero.
 *
 *   const world = buildWorld({ fx, sprites });
 *   world.update(dt, { camera, hero, yaw });  …  world.dispose();
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RAMPS, bayer, mix } from '../pixel/art.js';
import { WORLD, layoutTrees, solidCircles, nearPath, seeded, distToPath } from './rules.js';
import { FxBillboard, SpriteActor, canvasOf, texFor } from './gfx.js';
import { create as rockCluster } from '../../vendor/3dviz/kits/nature/rock-cluster.js';
import { create as lanternPost } from '../../vendor/3dviz/kits/props/lantern-post.js';
import { create as barrelKit } from '../../vendor/3dviz/kits/props/barrel.js';
import { create as crateKit } from '../../vendor/3dviz/kits/props/crate.js';
import { create as cartKit } from '../../vendor/3dviz/kits/props/cart.js';

const SPAN = 220; // the ground plane, metres a side
const FIRE_RAMP = ['#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6', '#ffffff'];

/* ------------------------------------------------------------ textures */

/** A tileable pixel texture: integer-frequency sines + Bayer dither choose a ramp shade. */
function tile(size, rampColors, { waves = [[1, 2, 0.9], [3, 1, 0.6], [2, 5, 0.4]], speck = null, seed = 1, dither = 0.9 } = {}) {
  const rand = seeded(seed);
  const phases = waves.map(() => rand() * 6.28);
  return canvasOf(size, size, (g) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let n = 0;
        waves.forEach(([kx, ky, a], i) => {
          n += Math.sin(((kx * x + ky * y) / size) * Math.PI * 2 + phases[i]) * a;
        });
        n += bayer(x, y) * dither;
        const idx = Math.max(0, Math.min(rampColors.length - 1, Math.floor((n / 1.9 + 0.5) * rampColors.length)));
        g.fillStyle = rampColors[idx];
        g.fillRect(x, y, 1, 1);
      }
    }
    if (speck) {
      for (let i = 0; i < speck.count; i++) {
        const [x, y] = [Math.floor(rand() * size), Math.floor(rand() * size)];
        g.fillStyle = speck.colors[Math.floor(rand() * speck.colors.length)];
        g.fillRect(x, y, speck.w ?? 1, speck.h ?? 2);
      }
    }
  });
}

/** Flagstones: a grid of stones offset every other row, each its own shade, dark seams. */
function flagstones(size) {
  const rand = seeded(5);
  const R = ['#3a3a48', '#4a4a58', '#5a5a66', '#6a6874', '#7a7682'];
  return canvasOf(size, size, (g) => {
    g.fillStyle = '#23222c';
    g.fillRect(0, 0, size, size);
    const n = 4, s = size / n;
    for (let row = 0; row < n; row++) {
      for (let col = -1; col < n; col++) {
        const x0 = col * s + (row % 2 ? s / 2 : 0);
        const shade = Math.floor(rand() * 3) + 1;
        for (let y = 2; y < s - 2; y++) {
          for (let x = 2; x < s - 2; x++) {
            const px = ((Math.round(x0 + x) % size) + size) % size;
            const py = Math.round(row * s + y);
            const edge = y < 4 || x < 4 ? 1 : y > s - 5 || x > s - 5 ? -1 : 0;
            const k = Math.max(0, Math.min(4, shade + edge + (bayer(px, py) > 0.3 && rand() < 0.15 ? -1 : 0)));
            g.fillStyle = R[k];
            g.fillRect(px, py, 1, 1);
          }
        }
      }
    }
    // Moss in the seams.
    for (let i = 0; i < 160; i++) {
      g.fillStyle = rand() < 0.5 ? '#2c4a34' : '#3a5e3a';
      g.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 2, 1);
    }
  });
}

function texture(canvas, repeat = true, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}

/** Where the dirt, flagstones and moss go: R dirt, G stone, B moss. */
function splatCanvas() {
  const S = 512;
  const at = (v) => ((v + SPAN / 2) / SPAN) * S;
  const m = S / SPAN; // canvas pixels a metre
  return canvasOf(S, S, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'lighter';
    g.filter = 'blur(2px)';
    // Camp clearing: packed earth, strongest near the fire.
    const camp = g.createRadialGradient(at(0), at(0), 0, at(0), at(0), 12 * m);
    camp.addColorStop(0, 'rgb(255,0,0)');
    camp.addColorStop(0.55, 'rgb(200,0,0)');
    camp.addColorStop(1, 'rgb(0,0,0)');
    g.fillStyle = camp;
    g.fillRect(0, 0, S, S);
    // Paths.
    g.strokeStyle = 'rgb(255,0,0)';
    g.lineCap = g.lineJoin = 'round';
    g.lineWidth = 3.4 * m;
    for (const path of WORLD.paths) {
      g.beginPath();
      path.forEach(([x, z], i) => (i ? g.lineTo(at(x), at(z)) : g.moveTo(at(x), at(z))));
      g.stroke();
    }
    // Greyvault's floor.
    const ru = WORLD.areas.ruins;
    const floor = g.createRadialGradient(at(ru.x), at(ru.z), 0, at(ru.x), at(ru.z), 12 * m);
    floor.addColorStop(0, 'rgb(0,255,0)');
    floor.addColorStop(0.7, 'rgb(0,230,0)');
    floor.addColorStop(1, 'rgb(0,0,0)');
    g.fillStyle = floor;
    g.fillRect(0, 0, S, S);
    // Glowmoss.
    const gl = WORLD.areas.glade;
    const moss = g.createRadialGradient(at(gl.x), at(gl.z), 0, at(gl.x), at(gl.z), 15 * m);
    moss.addColorStop(0, 'rgb(0,0,255)');
    moss.addColorStop(0.6, 'rgb(0,0,200)');
    moss.addColorStop(1, 'rgb(0,0,0)');
    g.fillStyle = moss;
    g.fillRect(0, 0, S, S);
    // The hollow: bare earth patches.
    const ho = WORLD.areas.hollow;
    const den = g.createRadialGradient(at(ho.x), at(ho.z), 0, at(ho.x), at(ho.z), 9 * m);
    den.addColorStop(0, 'rgb(160,0,0)');
    den.addColorStop(1, 'rgb(0,0,0)');
    g.fillStyle = den;
    g.fillRect(0, 0, S, S);
  });
}

/* --------------------------------------------------------------- shaders */

const BAYER_GLSL = /* glsl */ `
float ldBayer(vec2 p) {
  ivec2 i = ivec2(mod(p, 4.0));
  int k = i.x + i.y * 4;
  float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
  return (m[k] + 0.5) / 16.0;
}`;

function groundMaterial(uniforms) {
  const splat = texture(splatCanvas(), false, false);
  splat.magFilter = THREE.LinearFilter;
  splat.minFilter = THREE.LinearFilter;
  const grass = texture(tile(128, ['#22402c', '#2c5234', '#38663c', '#4a7c44', '#5f924e'], { seed: 2, speck: { count: 260, colors: ['#5f8a48', '#6e9a50', '#1a2c22'], w: 1, h: 2 } }));
  const dirt = texture(tile(128, ['#2e2219', '#3d2e22', '#4e3c2c', '#5f4a36', '#715a42'], { seed: 3, waves: [[2, 1, 0.8], [1, 3, 0.6], [5, 2, 0.3]], speck: { count: 140, colors: ['#867056', '#2a1e16', '#6a6070'], w: 2, h: 1 } }));
  const stone = texture(flagstones(128));
  const moss = texture(tile(128, ['#123530', '#18473e', '#1f5c4c', '#2a735c', '#3a8c6c'], { seed: 4, speck: { count: 200, colors: ['#7ff0c8', '#5ad0b0', '#0e2a26'], w: 1, h: 1 } }));
  const mat = new THREE.MeshLambertMaterial({ map: splat });
  const u = { tGrass: { value: grass }, tDirt: { value: dirt }, tStone: { value: stone }, tMoss: { value: moss }, uTile: { value: SPAN / 4 }, uTime: uniforms.uTime };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform sampler2D tGrass, tDirt, tStone, tMoss;\nuniform float uTile, uTime;`)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
vec4 sp = texture2D(map, vMapUv);
vec2 tuv = vMapUv * uTile;
vec3 cG = texture2D(tGrass, tuv).rgb;
vec3 cD = texture2D(tDirt, tuv * 1.1).rgb;
vec3 cS = texture2D(tStone, tuv * 0.75).rgb;
vec3 cM = texture2D(tMoss, tuv).rgb;
float lumG = dot(cG, vec3(0.33));
vec3 col = mix(cG, cM, smoothstep(0.35, 0.6, sp.b + (lumG - 0.06) * 2.0));
col = mix(col, cD, smoothstep(0.4, 0.6, sp.r + (lumG - 0.06) * 2.5));
col = mix(col, cS, smoothstep(0.42, 0.58, sp.g + (dot(cS, vec3(0.33)) - 0.06) * 2.0));
diffuseColor.rgb *= col;`
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
float glint = smoothstep(0.55, 0.9, dot(cM, vec3(0.6, 0.3, 0.1)) * 3.0);
totalEmissiveRadiance += vec3(0.015, 0.07, 0.06) * sp.b * (0.6 + 0.4 * sin(uTime * 0.8 + vMapUv.x * 90.0)) + vec3(0.2, 0.9, 0.7) * glint * sp.b * 0.2;`
      );
  };
  mat.customProgramCacheKey = () => 'ld-ground';
  return { mat, textures: [splat, grass, dirt, stone, moss] };
}

/* ----------------------------------------------------------------- trees */

function coloured(geometry, top, bottom) {
  const pos = geometry.attributes.position;
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Color(bottom), b = new THREE.Color(top), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - min.y) / (max.y - min.y || 1);
    c.copy(a).lerp(b, t);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** One stylised spruce, about 8 m tall: a trunk and five drooping tiers of needles. */
function coniferGeometry() {
  const parts = [coloured(new THREE.CylinderGeometry(0.16, 0.3, 2.2, 6).translate(0, 1.1, 0), '#4a3428', '#2a1c16')];
  const tiers = [[2.3, 1.2, 2.7], [1.95, 2.3, 2.5], [1.6, 3.4, 2.3], [1.2, 4.5, 2.1], [0.8, 5.6, 1.9], [0.45, 6.6, 1.5]];
  tiers.forEach(([r, y, h], i) => {
    const g = new THREE.ConeGeometry(r, h, 8, 1).translate(0, y + h / 2, 0);
    g.rotateY(i * 0.7);
    parts.push(coloured(g, i % 2 ? '#548a6c' : '#4e8266', '#1a3428'));
  });
  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

/** A Lambert material that screen-door fades where it stands between the camera and the hero. */
function fadingMaterial(params, uniforms, key) {
  const mat = new THREE.MeshLambertMaterial(params);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCam = uniforms.uCam;
    shader.uniforms.uHero = uniforms.uHero;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uCam;\nuniform vec3 uHero;\nvarying float vFade;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
vec3 ldOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#ifdef USE_INSTANCING
ldOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
#endif
vec2 ldA = uCam.xz, ldB = uHero.xz, ldAB = ldB - ldA;
float ldT = clamp(dot(ldOrigin.xz - ldA, ldAB) / max(0.001, dot(ldAB, ldAB)), 0.0, 1.0);
float ldD = length(ldOrigin.xz - (ldA + ldAB * ldT));
vFade = (1.0 - smoothstep(1.4, 3.2, ldD)) * (1.0 - smoothstep(0.9, 1.0, ldT));
vFade = max(vFade, 1.0 - smoothstep(3.0, 6.5, length(ldOrigin.xz - ldA)));`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vFade;\n${BAYER_GLSL}`)
      .replace('void main() {', 'void main() {\n  if (vFade > 0.01 && ldBayer(gl_FragCoord.xy) < vFade * 0.8) discard;');
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}

/* ------------------------------------------------------------------ props */

function clothTexture(color) {
  const base = new THREE.Color(color);
  const light = `#${base.clone().offsetHSL(0.02, 0, 0.1).getHexString()}`;
  const dark = `#${base.clone().offsetHSL(-0.03, -0.05, -0.12).getHexString()}`;
  const stripe = mix(`#${base.getHexString()}`, '#e8dcc0', 0.55);
  return canvasOf(64, 64, (g) => {
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const band = x % 32 < 4 ? stripe : (x + y * 0.2) % 8 < 1 ? dark : bayer(x, y) > 0.35 ? light : `#${base.getHexString()}`;
        g.fillStyle = y < 3 ? dark : band;
        g.fillRect(x, y, 1, 1);
      }
    }
  });
}

/** An A-frame tent: ridge along z, an open door at +z with a warm glow inside. */
function tent(t, disposables) {
  const group = new THREE.Group();
  const { w, d, h } = t;
  const [hw, hd] = [w / 2, d / 2];
  const v = [];
  const uv = [];
  const quad = (a, b, c, e, u0 = [0, 0], u1 = [1, 1]) => {
    v.push(...a, ...b, ...c, ...a, ...c, ...e);
    uv.push(u0[0], u0[1], u1[0], u0[1], u1[0], u1[1], u0[0], u0[1], u1[0], u1[1], u0[0], u1[1]);
  };
  // Two slopes, each a little past the ends (a flysheet).
  quad([-hw, 0, hd + 0.15], [-hw, 0, -hd - 0.15], [0, h, -hd - 0.15], [0, h, hd + 0.15], [0, 0], [2, 1]);
  quad([hw, 0, -hd - 0.15], [hw, 0, hd + 0.15], [0, h, hd + 0.15], [0, h, -hd - 0.15], [0, 0], [2, 1]);
  // The back wall.
  v.push(-hw, 0, -hd, hw, 0, -hd, 0, h, -hd);
  uv.push(0, 0, 1, 0, 0.5, 1);
  // The front: two flaps either side of the door.
  const dw = w * 0.2;
  v.push(-hw, 0, hd, -dw, 0, hd, 0, h, hd, hw, 0, hd, 0, h, hd, dw, 0, hd);
  uv.push(0, 0, 0.3, 0, 0.5, 1, 1, 0, 0.5, 1, 0.7, 0);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const tex = texture(clothTexture(t.color));
  const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
  // The lit inside, seen through the door.
  const inner = new THREE.BufferGeometry();
  inner.setAttribute('position', new THREE.Float32BufferAttribute([-hw * 0.8, 0.02, hd - 0.3, hw * 0.8, 0.02, hd - 0.3, 0, h * 0.85, hd - 0.3], 3));
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9a48').multiplyScalar(0.55), side: THREE.DoubleSide });
  group.add(new THREE.Mesh(inner, glowMat));
  // Poles and guy ropes.
  const poleMat = new THREE.MeshLambertMaterial({ color: '#5a4030' });
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, h + 0.35, 5).translate(0, (h + 0.35) / 2, 0);
  for (const z of [hd + 0.12, -hd - 0.12]) {
    const p = new THREE.Mesh(poleGeo, poleMat);
    p.position.z = z;
    p.castShadow = true;
    group.add(p);
  }
  const rope = [];
  for (const sz of [1, -1]) for (const sx of [1, -1]) rope.push(0, h + 0.2, sz * (hd + 0.12), sx * (hw + 0.5), 0, sz * (hd + 1.0));
  const ropeGeo = new THREE.BufferGeometry();
  ropeGeo.setAttribute('position', new THREE.Float32BufferAttribute(rope, 3));
  const ropeMat = new THREE.LineBasicMaterial({ color: '#8a7a60' });
  group.add(new THREE.LineSegments(ropeGeo, ropeMat));
  group.position.set(t.x, 0, t.z);
  group.rotation.y = t.rot;
  disposables.push(geo, tex, mat, inner, glowMat, poleMat, poleGeo, ropeGeo, ropeMat);
  return group;
}

function logSeat(l, mats) {
  const geo = new THREE.CylinderGeometry(0.28, 0.3, 2.0, 9).rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(geo, [mats.bark, mats.cut, mats.cut]);
  m.position.set(l.x, 0.26, l.z);
  m.rotation.y = l.rot;
  m.castShadow = m.receiveShadow = true;
  return m;
}

/* ------------------------------------------------------------------ build */

/**
 * @param {{ makeFx: (id: string, options?: object) => any, sprites: object }} deps
 *   makeFx: a synchronous FxPlayer factory (the game preloads the modules).
 */
export function buildWorld({ makeFx, sprites }) {
  const scene = new THREE.Scene();
  const disposables = [];
  const uniforms = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uHero: { value: new THREE.Vector3() } };
  const fog = new THREE.FogExp2('#141e38', 0.02);
  scene.fog = fog;
  scene.background = new THREE.Color('#141e38');
  const own = (...xs) => {
    disposables.push(...xs);
    return xs[0];
  };

  /* sky */
  const sky = new THREE.Mesh(
    own(new THREE.SphereGeometry(300, 32, 16)),
    own(new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uMoon: { value: new THREE.Vector3(-0.45, 0.5, -0.74).normalize() } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }',
      fragmentShader: /* glsl */ `
varying vec3 vDir; uniform vec3 uMoon;
float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
void main(){
  float y = max(vDir.y, 0.0);
  vec3 col = mix(vec3(0.07,0.10,0.19), vec3(0.015,0.02,0.05), pow(y, 0.6));
  vec3 q = floor(vDir * 220.0);
  float s = step(0.9975, h(q)) * smoothstep(0.05, 0.3, y);
  col += vec3(0.8,0.85,1.0) * s * (0.5 + 0.5 * h(q + 1.0));
  float m = dot(normalize(vDir), uMoon);
  col += vec3(0.9,0.95,1.0) * smoothstep(0.9993, 0.9996, m) * 2.4;
  col += vec3(0.25,0.32,0.55) * pow(max(m, 0.0), 60.0) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`
    }))
  );
  sky.renderOrder = -10;
  scene.add(sky);

  /* light */
  const hemi = new THREE.HemisphereLight('#6878b8', '#2a2018', 2.0);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight('#a8bcff', 2.0);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 120 });
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.04;
  scene.add(moon, moon.target);
  const MOON_DIR = new THREE.Vector3(-0.45, 0.62, -0.64).normalize();

  const fire = new THREE.PointLight('#ff8c40', 70, 34, 1.6);
  fire.position.set(0, 1.6, 0);
  scene.add(fire);

  /* ground */
  const ground = groundMaterial(uniforms);
  disposables.push(ground.mat, ...ground.textures);
  const groundMesh = new THREE.Mesh(own(new THREE.PlaneGeometry(SPAN, SPAN).rotateX(-Math.PI / 2)), ground.mat);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  /* trees */
  const trees = layoutTrees();
  const treeGeo = own(coniferGeometry());
  const treeMat = own(fadingMaterial({ vertexColors: true, flatShading: true }, uniforms, 'ld-tree'));
  const forest = new THREE.InstancedMesh(treeGeo, treeMat, trees.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  const rand = seeded(21);
  trees.forEach((t, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.28);
    const k = t.s * (0.95 + rand() * 0.3);
    sc.set(k * (0.9 + rand() * 0.25), k * (0.95 + rand() * 0.35), k * (0.9 + rand() * 0.25));
    m4.compose(pos.set(t.x, 0, t.z), q, sc);
    forest.setMatrixAt(i, m4);
    col.setHSL(0.42 + (rand() - 0.5) * 0.08, 0.35 + rand() * 0.2, 0.75 + rand() * 0.35);
    forest.setColorAt(i, col);
  });
  forest.castShadow = true;
  forest.receiveShadow = true;
  scene.add(forest);

  /* grass */
  const grassCanvas = canvasOf(32, 24, (g) => {
    const R = ['#1e3a26', '#2a5030', '#3a6a3a', '#4f8444', '#6a9e50'];
    const r = seeded(9);
    for (let i = 0; i < 16; i++) {
      const x = 1 + Math.floor(r() * 30);
      const h = 8 + Math.floor(r() * 15);
      const lean = (r() - 0.5) * 0.5;
      for (let y = 0; y < h; y++) {
        const px = Math.round(x + lean * y);
        g.fillStyle = R[Math.min(4, Math.floor((y / h) * 4.5))];
        g.fillRect(px, 23 - y, 1, 1);
      }
    }
  });
  const grassTex = own(texture(grassCanvas, false));
  grassTex.minFilter = THREE.NearestFilter;
  grassTex.generateMipmaps = false;
  const quadA = new THREE.PlaneGeometry(0.9, 0.62).translate(0, 0.31, 0);
  const quadB = quadA.clone().rotateY(Math.PI / 2);
  const grassGeo = own(mergeGeometries([quadA, quadB]));
  quadA.dispose();
  quadB.dispose();
  const normals = grassGeo.attributes.normal;
  for (let i = 0; i < normals.count; i++) normals.setXYZ(i, 0, 1, 0);
  const grassMat = own(new THREE.MeshLambertMaterial({ map: grassTex, alphaTest: 0.5, side: THREE.DoubleSide }));
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
transformed.x += sin(uTime * 1.7 + ph) * 0.07 * uv.y;
transformed.z += cos(uTime * 1.3 + ph) * 0.05 * uv.y;
#endif`
      );
  };
  grassMat.customProgramCacheKey = () => 'ld-grass';
  const blades = [];
  const gr = seeded(33);
  const ru = WORLD.areas.ruins;
  for (let i = 0; i < 26000 && blades.length < 9000; i++) {
    const a = gr() * Math.PI * 2;
    const r = Math.sqrt(gr()) * (WORLD.radius + 4);
    const [x, z] = [Math.cos(a) * r, Math.sin(a) * r];
    if (Math.hypot(x, z) < 6.5) continue;
    if (nearPath(x, z, -0.6)) continue;
    if (Math.hypot(x - ru.x, z - ru.z) < 9 && gr() < 0.85) continue;
    // Clumps: keep more where a slow wave is high.
    const clump = Math.sin(x * 0.21) + Math.sin(z * 0.17 + x * 0.05);
    if (gr() > 0.35 + clump * 0.35) continue;
    blades.push([x, z, 0.7 + gr() * 0.7, gr() * 6.28]);
  }
  const grass = new THREE.InstancedMesh(grassGeo, grassMat, blades.length);
  blades.forEach(([x, z, s, rot], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    m4.compose(pos.set(x, 0, z), q, sc.set(s, s * (0.8 + (i % 5) * 0.1), s));
    grass.setMatrixAt(i, m4);
    col.setHSL(0.27 + ((i * 13) % 7) * 0.012, 0.4, 0.85 + ((i * 7) % 5) * 0.06);
    grass.setColorAt(i, col);
  });
  grass.receiveShadow = true;
  scene.add(grass);

  /* rocks */
  const kits = [];
  WORLD.rocks.forEach(([x, z, s], i) => {
    const r = rockCluster({ count: 6, seed: 40 + i, spread: 1.1, rock: i % 2 ? '#6c6a72' : '#76726e' });
    r.group.position.set(x, 0, z);
    r.group.scale.setScalar(s);
    r.group.rotation.y = i * 1.3;
    kits.push(r);
  });

  /* camp */
  const camp = new THREE.Group();
  scene.add(camp);
  for (const t of WORLD.tents) camp.add(tent(t, disposables));
  const woodMats = {
    bark: own(new THREE.MeshLambertMaterial({ color: '#4a3226' })),
    cut: own(new THREE.MeshLambertMaterial({ color: '#b08858' }))
  };
  for (const l of WORLD.logs) {
    const m = logSeat(l, woodMats);
    disposables.push(m.geometry);
    camp.add(m);
  }
  WORLD.crates.forEach((c, i) => {
    const k = c.kind === 'barrel' ? barrelKit({ seed: i + 1 }) : crateKit({ seed: i + 1, size: 0.7 });
    k.group.position.set(c.x, 0, c.z);
    k.group.rotation.y = i * 0.9;
    kits.push(k);
  });
  {
    const k = cartKit({ seed: 3 });
    k.group.position.set(WORLD.cart.x, 0, WORLD.cart.z);
    k.group.rotation.y = WORLD.cart.rot;
    kits.push(k);
  }
  // Lantern posts: each its own glass, so they can be lit one by one.
  const lanterns = WORLD.lanterns.map((l, i) => {
    const k = lanternPost({ seed: i + 2 });
    k.group.position.set(l.x, 0, l.z);
    k.group.rotation.y = Math.atan2(-l.x, -l.z);
    const glass = [];
    k.group.traverse((o) => {
      if (o.isMesh && o.material?.emissiveIntensity > 0) {
        o.material = o.material.clone();
        disposables.push(o.material);
        glass.push(o.material);
      }
    });
    kits.push(k);
    const lampPos = new THREE.Vector3();
    k.group.updateMatrixWorld(true);
    const lampSocket = Array.isArray(k.sockets) ? k.sockets.find((s) => s.name === 'lamp') : null;
    lampPos.fromArray(lampSocket?.position_m ?? [0, 2.4, 0]);
    k.group.localToWorld(lampPos);
    return { x: l.x, z: l.z, glass, lit: false, lamp: lampPos };
  });
  for (const k of kits) {
    k.group.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = true;
    });
    scene.add(k.group);
  }

  // The Hearthlight: a ring of stones, logs, coals, and the pixel fire.
  const stoneGeo = own(new THREE.DodecahedronGeometry(0.26, 0));
  const stoneMat = own(new THREE.MeshLambertMaterial({ color: '#6a6470', flatShading: true }));
  const ring = new THREE.InstancedMesh(stoneGeo, stoneMat, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    m4.compose(pos.set(Math.cos(a) * 1.15, 0.1, Math.sin(a) * 1.15), q.setFromEuler(new THREE.Euler(i, i * 2, 0)), sc.set(1.1, 0.7, 1));
    ring.setMatrixAt(i, m4);
  }
  ring.castShadow = true;
  camp.add(ring);
  const coalTex = own(new THREE.CanvasTexture(canvasOf(64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,170,80,1)');
    grad.addColorStop(0.35, 'rgba(255,90,30,0.7)');
    grad.addColorStop(1, 'rgba(255,60,20,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  })));
  const glowGeo = own(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  const coals = new THREE.Mesh(glowGeo, own(new THREE.MeshBasicMaterial({ map: coalTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  coals.scale.set(5.5, 1, 5.5);
  coals.position.y = 0.04;
  camp.add(coals);
  const fireFx = new FxBillboard(makeFx('fire/campfire', { palette: FIRE_RAMP, light: 0.6 }), { pxm: 15, color: 1.15 });
  fireFx.mesh.position.set(0, 0.05, 0);
  camp.add(fireFx.mesh);

  // Embers drifting up from the fire.
  const SPARKS = 46;
  const sparkPos = new Float32Array(SPARKS * 3);
  const sparkLife = new Float32Array(SPARKS).map(() => Math.random() * 3);
  const sparkGeo = own(new THREE.BufferGeometry());
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const dotTex = own(new THREE.CanvasTexture(canvasOf(16, 16, (g) => {
    g.fillStyle = '#fff';
    g.fillRect(6, 6, 4, 4);
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.fillRect(4, 6, 8, 4);
    g.fillRect(6, 4, 4, 8);
  })));
  const sparkMat = own(new THREE.PointsMaterial({ color: new THREE.Color('#ffb050').multiplyScalar(3), size: 0.09, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  scene.add(sparks);

  // Torches: a pole and a shared pixel flame.
  const torchFxPlayer = makeFx('fire/torch', { palette: FIRE_RAMP, light: 0.15 });
  const torchPole = own(new THREE.CylinderGeometry(0.06, 0.08, 1.7, 6).translate(0, 0.85, 0));
  const torchMat = own(new THREE.MeshLambertMaterial({ color: '#4a3424' }));
  const flames = [];
  const torches = WORLD.torches.map((t) => {
    const pole = new THREE.Mesh(torchPole, torchMat);
    pole.position.set(t.x, 0, t.z);
    pole.castShadow = true;
    camp.add(pole);
    const f = new FxBillboard(torchFxPlayer, { pxm: 64, color: 1.3 });
    f.owner = false;
    f.mesh.position.set(t.x, 1.25, t.z);
    camp.add(f.mesh);
    flames.push(f);
    return { x: t.x, z: t.z, y: 2.0, lit: true };
  });

  /* Greyvault ruins */
  const ruins = new THREE.Group();
  scene.add(ruins);
  const ruinMat = own(new THREE.MeshLambertMaterial({ color: '#7a7684', flatShading: true }));
  const mossMat = own(new THREE.MeshLambertMaterial({ color: '#4a6a4a', flatShading: true }));
  const pr = seeded(77);
  for (const [x, z, h] of WORLD.pillars) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(own(new THREE.BoxGeometry(1.5, 0.4, 1.5)), ruinMat);
    base.position.y = 0.2;
    g.add(base);
    const shaft = new THREE.Mesh(own(new THREE.CylinderGeometry(0.5, 0.56, h, 8)), ruinMat);
    shaft.position.y = 0.4 + h / 2;
    g.add(shaft);
    // A broken top: a tilted chunk, or a capital on the tall ones.
    const top = h > 3 ? new THREE.Mesh(own(new THREE.BoxGeometry(1.3, 0.35, 1.3)), ruinMat) : new THREE.Mesh(own(new THREE.CylinderGeometry(0.42, 0.5, 0.5, 8)), mossMat);
    top.position.y = 0.4 + h + 0.18;
    top.rotation.set((pr() - 0.5) * 0.4, pr() * 3, (pr() - 0.5) * 0.4);
    g.add(top);
    g.position.set(x, 0, z);
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = true;
    });
    ruins.add(g);
  }
  // Fallen drums and a low broken wall.
  for (let i = 0; i < 6; i++) {
    const a = pr() * Math.PI * 2;
    const r = 6 + pr() * 6;
    const drum = new THREE.Mesh(own(new THREE.CylinderGeometry(0.5, 0.5, 1.2 + pr(), 8)), i % 2 ? ruinMat : mossMat);
    drum.rotation.set(Math.PI / 2, 0, pr() * 3);
    drum.position.set(ru.x + Math.cos(a) * r, 0.45, ru.z + Math.sin(a) * r);
    drum.castShadow = drum.receiveShadow = true;
    ruins.add(drum);
  }
  for (let i = 0; i < 9; i++) {
    const a = -0.4 + i * 0.16;
    const blk = new THREE.Mesh(own(new THREE.BoxGeometry(1.4, 0.6 + pr() * 0.9, 0.7)), ruinMat);
    blk.position.set(ru.x + Math.cos(a + Math.PI) * 13.5, 0.3, ru.z + Math.sin(a + Math.PI) * 13.5);
    blk.rotation.y = -a;
    blk.castShadow = blk.receiveShadow = true;
    ruins.add(blk);
  }
  // Braziers: a stone pedestal and bowl; lit, a pixel flame and a light.
  const braziers = WORLD.braziers.map((b) => {
    const g = new THREE.Group();
    const ped = new THREE.Mesh(own(new THREE.CylinderGeometry(0.42, 0.55, 1.0, 8)), ruinMat);
    ped.position.y = 0.5;
    const bowl = new THREE.Mesh(own(new THREE.CylinderGeometry(0.75, 0.45, 0.4, 10, 1, true)), own(new THREE.MeshLambertMaterial({ color: '#4a4248', side: THREE.DoubleSide })));
    bowl.position.y = 1.2;
    const coal = new THREE.Mesh(own(new THREE.CircleGeometry(0.62, 10).rotateX(-Math.PI / 2)), own(new THREE.MeshLambertMaterial({ color: '#1a1414', emissive: '#000000' })));
    coal.position.y = 1.3;
    g.add(ped, bowl, coal);
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = o.receiveShadow = true;
    });
    g.position.set(b.x, 0, b.z);
    ruins.add(g);
    return { id: b.id, x: b.x, z: b.z, y: 1.9, lit: false, group: g, coal, flame: null };
  });

  /* glade: glowing mushrooms */
  const shroomGeo = own(mergeGeometries([
    coloured(new THREE.CylinderGeometry(0.035, 0.05, 0.22, 5).translate(0, 0.11, 0), '#c8d8e0', '#8898a0'),
    coloured(new THREE.SphereGeometry(0.13, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.2, 0), '#a0fff0', '#40c8d0')
  ].map((g) => (g.index ? g.toNonIndexed() : g))));
  const shroomMat = own(new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(0.85, 0.95, 0.95) }));
  const gl = WORLD.areas.glade;
  const sh = seeded(55);
  const shrooms = new THREE.InstancedMesh(shroomGeo, shroomMat, 70);
  for (let i = 0; i < 70; i++) {
    const a = sh() * Math.PI * 2;
    const r = 3 + sh() * 13;
    const s = 0.45 + sh() * 0.7;
    m4.compose(pos.set(gl.x + Math.cos(a) * r, 0, gl.z + Math.sin(a) * r), q.identity(), sc.set(s, s, s));
    shrooms.setMatrixAt(i, m4);
  }
  scene.add(shrooms);

  /* herbs */
  const herbs = WORLD.herbs.map(([x, z], i) => {
    const a = new SpriteActor({ shadow: 0.25, glow: 0.35 });
    a.show(sprites.herb);
    a.group.position.set(x, 0, z);
    scene.add(a.group);
    return { i, x, z, actor: a, taken: false };
  });

  /* fireflies */
  const FLIES = 220;
  const flyBase = new Float32Array(FLIES * 3);
  const flyPos = new Float32Array(FLIES * 3);
  const flyCol = new Float32Array(FLIES * 3);
  const fr = seeded(66);
  const flyAreas = [[0, 0, 16, 60], [gl.x, gl.z, 15, 60], [ru.x, ru.z, 14, 30], [WORLD.areas.hollow.x, WORLD.areas.hollow.z, 12, 20], [0, 0, 60, 50]];
  let fi = 0;
  for (const [cx, cz, r, n] of flyAreas) {
    for (let k = 0; k < n && fi < FLIES; k++, fi++) {
      const a = fr() * 6.28, d = Math.sqrt(fr()) * r;
      flyBase.set([cx + Math.cos(a) * d, 0.5 + fr() * 2.5, cz + Math.sin(a) * d], fi * 3);
      const c = new THREE.Color(fr() < 0.7 ? '#d8ff7a' : '#8affd8').multiplyScalar(2.2);
      flyCol.set([c.r, c.g, c.b], fi * 3);
    }
  }
  const flyGeo = own(new THREE.BufferGeometry());
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  flyGeo.setAttribute('color', new THREE.BufferAttribute(flyCol, 3));
  const flyMat = own(new THREE.PointsMaterial({ size: 0.13, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const flies = new THREE.Points(flyGeo, flyMat);
  flies.frustumCulled = false;
  scene.add(flies);

  /* the pooled lights that follow the hero around (the nearest flames) */
  const pool = Array.from({ length: 4 }, () => {
    const l = new THREE.PointLight('#ff9a4a', 0, 14, 1.8);
    scene.add(l);
    return l;
  });

  const solids = solidCircles(trees);

  /** Light sources for sprites and the pool: { x, y, z, power, color }. */
  const sources = () => [
    ...torches.filter((t) => t.lit).map((t) => ({ x: t.x, y: t.y, z: t.z, power: 1, color: '#ff9a4a' })),
    ...lanterns.filter((l) => l.lit).map((l) => ({ x: l.lamp.x, y: l.lamp.y, z: l.lamp.z, power: 0.9, color: '#ffd28a' })),
    ...braziers.filter((b) => b.lit).map((b) => ({ x: b.x, y: b.y + 0.4, z: b.z, power: 1.6, color: '#ff8a3a' }))
  ];

  let hearth = 0.7; // how strong the Hearthlight burns (grows as the quests are done)
  const fireColor = new THREE.Color('#ff8c40');
  const moonAmbient = new THREE.Color(0.52, 0.58, 0.8);
  const tmp = new THREE.Color();
  let poolTimer = 0;
  let flick = 0;
  let lights = [];

  const world = {
    scene,
    trees,
    solids,
    herbs,
    braziers,
    lanterns,
    fireLight: fire,
    uniforms,

    /** The light a sprite standing at (x, z) gets: moonlight plus nearby flames. */
    lightAt(x, z, out = new THREE.Color()) {
      out.copy(moonAmbient);
      const df = Math.hypot(x, z);
      const kf = Math.max(0, 1 - df / (17 + hearth * 7)) ** 1.6 * (1.25 + hearth * 0.5) * (0.92 + flick * 0.08);
      out.r += fireColor.r * kf;
      out.g += fireColor.g * kf * 0.9;
      out.b += fireColor.b * kf * 0.8;
      for (const s of lights) {
        const d = Math.hypot(x - s.x, z - s.z);
        if (d > 9) continue;
        const k = (1 - d / 9) ** 2 * 0.9 * s.power;
        tmp.set(s.color);
        out.r += tmp.r * k;
        out.g += tmp.g * k;
        out.b += tmp.b * k;
      }
      out.r = Math.min(out.r, 1.12);
      out.g = Math.min(out.g, 1.05);
      out.b = Math.min(out.b, 1.0);
      return out;
    },

    /** 0…1: how many quests are done, shown as fire size and lit lanterns. */
    setProgress(done, total) {
      hearth = 0.7 + (done / total) * 0.6;
      lanterns.forEach((l, i) => {
        l.lit = i < done;
        for (const m of l.glass) {
          m.emissiveIntensity = l.lit ? 3 : 0.04;
        }
      });
      const s = 0.85 + (done / total) * 0.45;
      fireFx.mesh.scale.set((128 / 15) * s, (128 / 15) * s, 1);
    },

    lightBrazier(id, on = true) {
      const b = braziers.find((x) => x.id === id);
      if (!b || b.lit === on) return;
      b.lit = on;
      b.coal.material.emissive.set(on ? '#ff5a1a' : '#000000');
      if (on) {
        b.flame = new FxBillboard(makeFx('fire/spirit-flame', { palette: FIRE_RAMP }), { pxm: 40, color: 1.4 });
        b.flame.mesh.position.set(b.x, 1.25, b.z);
        ruins.add(b.flame.mesh);
        flames.push(b.flame);
      }
    },

    /** Back to how a new journey finds it: herbs on the ground, braziers cold, lanterns out. */
    reset() {
      for (const h of herbs) {
        h.taken = false;
        h.actor.group.visible = true;
      }
      for (const b of braziers) {
        b.lit = false;
        b.coal.material.emissive.set('#000000');
        if (b.flame) {
          flames.splice(flames.indexOf(b.flame), 1);
          b.flame.dispose();
          b.flame = null;
        }
      }
      world.setProgress(0, 5);
    },

    takeHerb(i) {
      const h = herbs[i];
      if (!h || h.taken) return;
      h.taken = true;
      h.actor.group.visible = false;
    },

    update(dt, { yaw, hero, camera }) {
      uniforms.uTime.value += dt;
      const t = uniforms.uTime.value;
      uniforms.uCam.value.copy(camera.position);
      uniforms.uHero.value.set(hero.x, 0, hero.z);
      // Moon and its shadow box follow the hero.
      moon.target.position.set(hero.x, 0, hero.z);
      moon.position.set(hero.x + MOON_DIR.x * 60, MOON_DIR.y * 60, hero.z + MOON_DIR.z * 60);
      sky.position.copy(camera.position);
      // The fire breathes.
      flick = 0.5 + 0.5 * Math.sin(t * 13.1) * Math.sin(t * 7.3 + 1.1) + 0.25 * Math.sin(t * 23.0);
      fire.intensity = (50 + hearth * 40) * (0.86 + 0.14 * flick);
      fire.distance = 26 + hearth * 12;
      fire.position.y = 1.6 + flick * 0.08;
      fireFx.update(dt, yaw);
      torchFxPlayer.update(dt);
      for (const f of flames) f.update(dt, yaw);
      // Sparks.
      for (let i = 0; i < SPARKS; i++) {
        sparkLife[i] += dt;
        const L = sparkLife[i] % 2.6;
        const seed = i * 12.9898;
        sparkPos[i * 3] = Math.sin(seed) * 0.5 + Math.sin(t * 2 + seed) * 0.25 * L;
        sparkPos[i * 3 + 1] = 0.6 + L * 1.5;
        sparkPos[i * 3 + 2] = Math.cos(seed) * 0.5 + Math.cos(t * 1.7 + seed) * 0.25 * L;
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkMat.opacity = 0.9;
      // Fireflies wander and blink.
      for (let i = 0; i < FLIES; i++) {
        const j = i * 3;
        flyPos[j] = flyBase[j] + Math.sin(t * 0.4 + i) * 1.2;
        flyPos[j + 1] = flyBase[j + 1] + Math.sin(t * 0.9 + i * 1.7) * 0.4;
        flyPos[j + 2] = flyBase[j + 2] + Math.cos(t * 0.35 + i * 0.7) * 1.2;
      }
      flyGeo.attributes.position.needsUpdate = true;
      flyMat.opacity = 0.75 + 0.25 * Math.sin(t * 2.1);
      // Herbs bob a little.
      for (const h of herbs) if (!h.taken) h.actor.update(dt, yaw, world.lightAt(h.x, h.z, tmp));
      // The four nearest flames get a real light (re-chosen twice a second).
      poolTimer -= dt;
      if (poolTimer <= 0) {
        poolTimer = 0.5;
        lights = sources().sort((a, b) => Math.hypot(a.x - hero.x, a.z - hero.z) - Math.hypot(b.x - hero.x, b.z - hero.z));
        pool.forEach((l, i) => {
          const s = lights[i];
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
      fireFx.dispose();
      for (const f of flames) f.dispose();
      torchFxPlayer._texture?.dispose();
      for (const h of herbs) h.actor.dispose();
      for (const k of kits) {
        k.group.traverse((o) => {
          if (o.isMesh) o.geometry?.dispose();
        });
      }
      for (const d of disposables) d.dispose?.();
      forest.dispose();
      grass.dispose();
      shrooms.dispose();
      ring.dispose();
      scene.clear();
    }
  };
  world.setProgress(0, 5);
  return world;
}

export { distToPath };
