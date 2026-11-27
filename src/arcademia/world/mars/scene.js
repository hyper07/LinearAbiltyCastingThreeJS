/**
 * Mars in 3D: Olympus Mons as a compact red-rock mountain with a little Mars
 * base wound round it — one paved terrace spiralling up from the plain to the
 * caldera's rim (red soil behind, a paved road with a railing and lamps along
 * the edge), layered red, rust and ochre cliffs between its turns, wide ramps
 * with lit edges and arrow chevrons from each floor to the next (a pressure
 * door at each foot, beacons and signposts), the three schools of every floor
 * joined by pressurised tubes round their plaza, the caldera's pit inside the
 * top turn, and a steep escarpment down to the plain at the foot.
 *
 * Beyond, the wide red plain runs out to the skyline: flat-topped mesas, big
 * crater rims, a great layered canyon to the east and the other Tharsis
 * volcanoes far behind; a small bright Sun low in the butterscotch sky, with
 * Phobos and Deimos. At the volcano's foot stand the giants everyone can
 * see: the steel Big Rocket on its launch pad by its tower, the habitat
 * village with its printed domes and greenhouse tunnels, the six-wheeled
 * rover on its loop and the helicopter drone circling over the village.
 * Boulders lie everywhere; solar panels, beacons, supply crates and pennants
 * dot the floors; dust devils wander the plain.
 *
 * What you walk on (each floor's stretch of terrace, the ramps) is kept in
 * `walk`, so clicks find it; each floor's parts are grouped (`tiers`, with the
 * ramp up to it) so a locked one can be greyed. `dust(x, y, z, size)` kicks up
 * a puff of red dust (World.js calls it when someone lands from a floaty hop).
 */
import * as THREE from 'three';
import { GROUND_Y, fbm, noise } from '../layout.js';
import { add, batch, box, cyl, mat, seeded, sphere, toonRamp, vcMat } from '../kit.js';
import { lampMat, windowMat, SUBJECT_ICONS } from '../buildings.js';
import { subjectsOf } from '../../content/subjects.js';
import { patchCutout } from '../cutout.js';
import { tmat } from '../moon/buildings.js';
import { SIGHTS, MOONS, SUN, MARS as M, farGround, plain } from './plan.js';
import { MARS, bigRocketModel, marsRoverModel, droneModel, greenhouseTunnel, steelMaterial, devilMaterial, devilGeometry, marsGate } from './buildings.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Layered rock: bands of red, rust and ochre by height, a little wavy. */
const STRATA = ['#a8523a', '#c4683f', '#dc955c', '#8f4430', '#b85f3e', '#e2a46a', '#9c4a34'].map((c) => new THREE.Color(c));
const strata = (x, y, z) => STRATA[((Math.floor((y + 60 + fbm(x * 0.05, z * 0.05) * 1.6) / 1.35) % STRATA.length) + STRATA.length) % STRATA.length];

/** A triangle mesh from a grid of points (rows of [x, y, z]), one flat colour a facet. */
export function gridMesh(rows, colourOf, { closed = false, params = null } = {}) {
  const pos = [], col = [];
  const c = new THREE.Color();
  const tri = (i0, j0, i1, j1, i2, j2) => {
    const p = rows[i0][j0], q = rows[i1][j1], s = rows[i2][j2];
    const mid = params ? [(params[i0][j0][0] + params[i1][j1][0] + params[i2][j2][0]) / 3, (params[i0][j0][1] + params[i1][j1][1] + params[i2][j2][1]) / 3] : null;
    colourOf(c, p, q, s, mid);
    for (const v of [p, q, s]) {
      pos.push(v[0], v[1], v[2]);
      col.push(c.r, c.g, c.b);
    }
  };
  for (let i = 0; i + 1 < rows.length; i++) {
    const n = rows[i].length;
    for (let j = 0; j < (closed ? n : n - 1); j++) {
      const j2 = (j + 1) % n;
      if ((i + j) % 2) {
        tri(i, j, i + 1, j, i, j2);
        tri(i, j2, i + 1, j, i + 1, j2);
      } else {
        tri(i, j, i + 1, j, i + 1, j2);
        tri(i, j, i + 1, j2, i, j2);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}
export const facet = (p, q, s) => {
  const mx = (p[0] + q[0] + s[0]) / 3, my = (p[1] + q[1] + s[1]) / 3, mz = (p[2] + q[2] + s[2]) / 3;
  const spread = Math.max(p[1], q[1], s[1]) - Math.min(p[1], q[1], s[1]);
  const span = Math.max(Math.hypot(p[0] - q[0], p[2] - q[2]), Math.hypot(p[0] - s[0], p[2] - s[2]), Math.hypot(q[0] - s[0], q[2] - s[2]));
  return { mx, my, mz, steep: spread / (span || 1) };
};
export const toonMesh = (geo, name) => {
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }));
  m.receiveShadow = true;
  m.name = name;
  return m;
};

/* ---------------------------------------------------------------- the mountain */

/** The rock of the volcano: the cliffs between the turns, the summit and caldera, the escarpment (under the terrace it hides a little lower). */
function volcanoRock(plan) {
  const radii = [];
  for (let r = 0.01; r < plan.footR + 1.5; r += 0.6) radii.push(r);
  for (let r = plan.footR + 1.5; r <= plan.rockR + 0.01; r += 1.6) radii.push(r);
  const SEG = 640;
  const rows = radii.map((r) => {
    const row = [];
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * TAU;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      row.push([x, plan.rock(x, z) - (plan.onBand(x, z) ? 0.35 : 0), z]);
    }
    return row;
  });
  const soil = [new THREE.Color('#d98a58'), new THREE.Color('#cf7d4d')], pit = new THREE.Color('#7c3c2c');
  const geo = gridMesh(rows, (c, p, q, s) => {
    const { mx, my, mz, steep } = facet(p, q, s);
    const r = Math.hypot(mx, mz);
    if (steep > 0.8) c.copy(strata(mx, my, mz)).offsetHSL(0, 0, noise(mx * 0.4, mz * 0.4) * 0.025);
    else c.copy(soil[noise(mx * 0.3, mz * 0.3) > 0 ? 0 : 1]);
    if (r < M.pitR + 2.2) c.lerp(pit, smooth(M.pitR + 2.2, M.pitR * 0.4, r) * 0.75);
  }, { closed: true });
  const m = toonMesh(geo, 'mars-rock');
  m.material = strataMaterial();
  m.castShadow = true;
  return m;
}

/**
 * The rock's material: toon-shaded vertex colours, but every steep face is painted with crisp
 * horizontal layers of red, rust and ochre by its height in the world (so tall cliffs read as
 * layered rock, whatever the triangles).
 */
function strataMaterial() {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uStrata = { value: STRATA };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRockP;\nvarying vec3 vRockN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvRockP = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvRockN = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vRockP;
varying vec3 vRockN;
uniform vec3 uStrata[7];
vec3 strataAt(vec3 p) {
  float w = sin(p.x * 0.071) * 0.9 + sin(p.z * 0.053 + 1.3) * 0.9 + sin((p.x + p.z) * 0.19) * 0.25;
  int i = int(mod(floor((p.y + 60.0 + w) / 1.35), 7.0));
  vec3 c = uStrata[0];
  for (int k = 1; k < 7; k++) if (k == i) c = uStrata[k];
  return c * (0.97 + 0.05 * sin(p.x * 1.7 + p.z * 1.3));
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float rockSteep = 1.0 - smoothstep(0.62, 0.78, abs(normalize(vRockN).y));
diffuseColor.rgb = mix(diffuseColor.rgb, strataAt(vRockP), rockSteep);`);
  };
  m.customProgramCacheKey = () => 'mars-strata';
  return m;
}

/* ---------------------------------------------------------------- the terrace */

/** Rows (one per `across`) of points along the terrace from φ a to φ b, the height from `yOf`; and each point's (φ, across). */
function bandGrid(plan, a, b, acrossList, yOf) {
  const outer = plan.riOf(a) + M.W;
  const n = Math.max(2, Math.ceil(((b - a) * outer) / 0.9));
  const rows = [], params = [];
  for (const o of acrossList) {
    const row = [], prm = [];
    for (let j = 0; j <= n; j++) {
      const phi = a + ((b - a) * j) / n;
      const p = plan.pt(phi, o);
      row.push([p.x, yOf(phi), p.z]);
      prm.push([phi, o]);
    }
    rows.push(row);
    params.push(prm);
  }
  return { rows, params };
}
const ACROSS = [0, 0.5, 1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.0, 8.6, 9.3, 9.9, 10.25, 10.9, 11.6, 12.3, 13.0, 13.6, 14.05, 14.5];

/** One floor's stretch of terrace: red soil and dust drifts at the back, paved paths to each door, the plaza's paving, the road with its kerbs. */
function floorTop(plan, f, look) {
  const { rows, params } = bandGrid(plan, f.phiS, f.phiE, ACROSS, () => f.y);
  const grass = new THREE.Color(look.grass), dark = new THREE.Color(look.grassDark), drift = new THREE.Color(look.patch?.color ?? look.path);
  const pave = [new THREE.Color('#f6dcc0'), new THREE.Color('#ecccab')], kerb = new THREE.Color('#c98d66'), plazaC = [new THREE.Color('#fbe6cf'), new THREE.Color('#f1d4b3')];
  const PL = M.placeLine;
  const ms = f.plinths.find((p) => p.subject === 'math'), ps = f.plinths.find((p) => p.subject === 'physics');
  const phiOf = (x, z) => plan.onBand(x, z)?.phi ?? 0;
  const plazaA = phiOf(ms.x, ms.z) - 4.2 / (f.ri + PL), plazaB = phiOf(ps.x, ps.z) + 4.2 / (f.ri + PL);
  const spurs = [...f.places, { ...f.portal, kind: 'portal' }, ...(f.worldGate ? [{ ...f.worldGate, kind: 'worlds' }] : [])].map((p) => ({ phi: phiOf(p.x, p.z), from: plan.onBand(p.x, p.z)?.across ?? 6 }));
  const geo = gridMesh(rows, (c, p, q, s, [phi, o]) => {
    const { mx, mz } = facet(p, q, s);
    const n = noise(mx * 0.35, mz * 0.35);
    const ri = plan.riOf(phi), arc = phi * (ri + o);
    if (o >= M.road) {
      const t = (Math.floor(arc / 1.6) + Math.floor((o - M.road) / 1.5)) & 1;
      c.copy(pave[t]).offsetHSL(0, 0, n * 0.02);
      if (o < M.road + 0.35 || o > M.W - 0.45) c.copy(kerb);
      return;
    }
    c.copy(n > 0.15 ? dark : grass).offsetHSL(0, 0, n * 0.03);
    if (look.patch && noise(mx * look.patch.k + 9, mz * look.patch.k * 0.6) > look.patch.t) c.copy(drift).offsetHSL(0, 0, n * 0.02);
    if (phi > plazaA && phi < plazaB && o > 8.2) c.copy(plazaC[(Math.floor(arc / 1.3) + Math.floor(o / 1.3)) & 1]);
    else if (spurs.some((sp) => Math.abs(phi - sp.phi) * (ri + o) < 1.05 && o > sp.from)) c.copy(pave[0]).offsetHSL(0, 0, n * 0.02);
    if (o < 0.5) c.lerp(new THREE.Color(look.rock[0]), 0.45);
  }, { params });
  return toonMesh(geo, `mars-floor-${f.n}`);
}

/** A ramp: the whole width of the terrace, a storey up, in pale bands like broad steps. */
function rampTop(plan, s) {
  const { rows, params } = bandGrid(plan, s.pa, s.pb, ACROSS, (phi) => plan.bandY(phi));
  const A = new THREE.Color('#f4dfc8'), B = new THREE.Color('#e3c3a3'), edge = new THREE.Color('#b9744f');
  const geo = gridMesh(rows, (c, p, q, s2, [phi, o]) => {
    const t = (phi - s.pa) / (s.pb - s.pa);
    c.copy(Math.floor(t * 22) & 1 ? A : B);
    if (o < 0.45 || o > M.W - 0.45) c.copy(edge);
  }, { params });
  return toonMesh(geo, `mars-ramp-${s.from}`);
}

/* ---------------------------------------------------------------- railings, lamps, lit edges, chevrons */

/** Merged meshes, one per colour (or material), from placed geometries. */
export function parts() {
  const map = new Map();
  return {
    put(color, geo, m) {
      if (m) geo.applyMatrix4(m);
      if (!map.has(color)) map.set(color, []);
      map.get(color).push(geo.index ? geo.toNonIndexed() : geo);
    },
    build(group) {
      for (const [color, list] of map) {
        const mesh = new THREE.Mesh(mergeList(list), typeof color === 'string' ? mat(color, { rough: 0.9 }) : color);
        mesh.castShadow = typeof color === 'string';
        mesh.receiveShadow = true;
        group.add(mesh);
      }
      return group;
    }
  };
}
export const Mx = (x, y, z, ry = 0, s = 1, rx = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), new THREE.Vector3(s, s, s));
/** A thin bar (w × h section) from a to b. */
export function bar(P, color, a, b, w = 0.08, h = w) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  if (len < 1e-3) return;
  const m = new THREE.Matrix4().lookAt(A, B, UP);
  m.setPosition(A.clone().add(B).multiplyScalar(0.5));
  P.put(color, new THREE.BoxGeometry(w, h, len), m);
}
const ROCKS = ['#8f4a35', '#a5583e', '#7c4232', '#b86a48', '#c47a4e'];
const edgeMat = mat('#5fe8dc', { emissive: '#2fe0d0', ei: 0.8, key: 'marsedge' });
const chevMat = mat('#ffd23f', { emissive: '#ffb020', ei: 0.55, key: 'marschev' });

/** A railing along the terrace's edge from φ a to φ b (posts, two rails), a lamp post every few posts. */
function railing(P, lamps, plan, a, b, o = M.W - 0.22, every = 4) {
  const outer = plan.riOf(a) + o;
  const n = Math.max(1, Math.round(((b - a) * outer) / 2.3));
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const phi = a + ((b - a) * i) / n, p = plan.pt(phi, o), y = plan.bandY(phi);
    const lamp = i % every === 2;
    P.put('#f2ece6', new THREE.CylinderGeometry(0.06, 0.07, lamp ? 2.6 : 1.1, 6), Mx(p.x, y + (lamp ? 1.3 : 0.55), p.z));
    if (lamp) {
      const inn = plan.pt(phi, o - 0.55);
      bar(P, '#f2ece6', [p.x, y + 2.55, p.z], [inn.x, y + 2.55, inn.z], 0.07);
      lamps.put(lampMat, new THREE.BoxGeometry(0.34, 0.16, 0.34), Mx(inn.x, y + 2.45, inn.z, plan.thetaOf(phi)));
      P.put(MARS.teal, new THREE.BoxGeometry(0.42, 0.08, 0.42), Mx(inn.x, y + 2.57, inn.z, plan.thetaOf(phi)));
    }
    if (prev) {
      bar(P, MARS.terra, [prev.x, prev.y + 1.08, prev.z], [p.x, y + 1.08, p.z], 0.09);
      bar(P, '#f2ece6', [prev.x, prev.y + 0.58, prev.z], [p.x, y + 0.58, p.z], 0.06);
    }
    prev = { x: p.x, y, z: p.z };
  }
}
/** A railing straight across the terrace (at its two ends: floor 1's start, the top's end). */
function endRail(P, plan, phi, y) {
  const a = plan.pt(phi, 0.3), b = plan.pt(phi, M.W - 0.2);
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    P.put('#f2ece6', new THREE.CylinderGeometry(0.06, 0.07, 1.1, 6), Mx(a.x + (b.x - a.x) * t, y + 0.55, a.z + (b.z - a.z) * t));
  }
  bar(P, MARS.terra, [a.x, y + 1.08, a.z], [b.x, y + 1.08, b.z], 0.09);
  bar(P, '#f2ece6', [a.x, y + 0.58, a.z], [b.x, y + 0.58, b.z], 0.06);
}

/** A ramp's lit edges, its arrow chevrons pointing up, and a beacon mast either side of its foot. */
function rampMarks(P, glow, plan, s, blinkers, group) {
  const n = Math.ceil(((s.pb - s.pa) * (plan.riOf(s.pa) + M.W)) / 1.2);
  for (const o of [0.32, M.W - 0.62]) {
    for (let i = 0; i < n; i++) {
      const p0 = s.pa + ((s.pb - s.pa) * i) / n, p1 = s.pa + ((s.pb - s.pa) * (i + 1)) / n;
      const a = plan.pt(p0, o), b = plan.pt(p1, o);
      bar(glow, edgeMat, [a.x, plan.bandY(p0) + 0.06, a.z], [b.x, plan.bandY(p1) + 0.06, b.z], 0.22, 0.05);
    }
  }
  // Chevrons up the middle and either side: ">" shapes pointing up the ramp.
  for (let k = 1; k <= 4; k++) {
    const t = k / 5;
    for (const o of [3.4, M.W / 2, M.W - 3.4]) {
      const phi = s.pa + (s.pb - s.pa) * t, r = plan.riOf(phi) + o, d = 0.9 / r;
      const tip = plan.pt(phi + d * 0.6, o), l = plan.pt(phi - d * 0.6, o - 1.0), rr = plan.pt(phi - d * 0.6, o + 1.0);
      const y = (ph) => plan.bandY(ph) + 0.08;
      bar(glow, chevMat, [l.x, y(phi - d * 0.6), l.z], [tip.x, y(phi + d * 0.6), tip.z], 0.24, 0.05);
      bar(glow, chevMat, [rr.x, y(phi - d * 0.6), rr.z], [tip.x, y(phi + d * 0.6), tip.z], 0.24, 0.05);
    }
  }
  for (const o of [0.8, M.W - 1.0]) {
    const p = plan.pt(s.pa - 1.2 / (plan.riOf(s.pa) + o), o);
    P.put('#f2ece6', new THREE.CylinderGeometry(0.1, 0.14, 4.2, 8), Mx(p.x, s.ya + 2.1, p.z));
    for (let i = 0; i < 3; i++) P.put(i % 2 ? '#f2ece6' : MARS.terra, new THREE.CylinderGeometry(0.16, 0.16, 0.3, 8), Mx(p.x, s.ya + 1.2 + i * 1.0, p.z));
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffcf5a' }));
    light.position.set(p.x, s.ya + 4.45, p.z);
    group.add(light);
    blinkers.push(light);
  }
}

/* ---------------------------------------------------------------- signs */

const signCache = new Map();
/** A sign board's picture: icons, a number, an arrow (→ is up the mountain), on a cream card with a coloured edge. */
export function signTexture(text, color) {
  const key = `${text}|${color}`;
  if (signCache.has(key)) return signCache.get(key);
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(4, 4, 504, 152, 34);
  g.fill();
  g.fillStyle = '#fff8ef';
  g.beginPath();
  g.roundRect(16, 16, 480, 128, 26);
  g.fill();
  g.fillStyle = '#3b3340';
  g.font = 'bold 92px "Nunito Variable", system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 86);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  signCache.set(key, t);
  return t;
}
/** A signpost by the railing, its boards facing out (towards the camera): [text, colour] each, top first. */
function signpost(group, P, plan, phi, y, boards, { o = M.W - 0.75, top = null } = {}) {
  const p = plan.pt(phi, o), yaw = plan.thetaOf(phi);
  const h = 1.5 + boards.length * 0.62 + (top ? 0.9 : 0);
  P.put('#f2ece6', new THREE.CylinderGeometry(0.07, 0.09, h, 8), Mx(p.x, y + h / 2, p.z));
  boards.forEach(([text, color], i) => {
    const yy = y + h - (top ? 1.2 : 0.35) - i * 0.62;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.55), new THREE.MeshBasicMaterial({ map: signTexture(text, color), toneMapped: false }));
    m.position.set(p.x + Math.sin(yaw) * 0.09, yy, p.z + Math.cos(yaw) * 0.09);
    m.rotation.y = yaw;
    group.add(m);
    P.put('#e9ddd0', new THREE.BoxGeometry(1.8, 0.6, 0.08), Mx(p.x, yy, p.z, yaw));
  });
  if (top) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.58, 28), new THREE.MeshBasicMaterial({ map: discTexture(top[0], top[1]), toneMapped: false }));
    disc.position.set(p.x + Math.sin(yaw) * 0.06, y + h - 0.4, p.z + Math.cos(yaw) * 0.06);
    disc.rotation.y = yaw;
    group.add(disc);
    P.put(top[1], new THREE.CylinderGeometry(0.66, 0.66, 0.08, 28), new THREE.Matrix4().compose(new THREE.Vector3(p.x, y + h - 0.4, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, yaw, 0, 'YXZ')), new THREE.Vector3(1, 1, 1)));
  }
}
/** A round floor badge: the floor's icon over its number. */
export function discTexture(text, color) {
  const key = `disc|${text}|${color}`;
  if (signCache.has(key)) return signCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.beginPath();
  g.arc(128, 128, 126, 0, TAU);
  g.fill();
  g.fillStyle = '#fff8ef';
  g.beginPath();
  g.arc(128, 128, 108, 0, TAU);
  g.fill();
  g.fillStyle = '#3b3340';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const [icon, n] = text.split(' ');
  g.font = '86px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  g.fillText(icon, 128, 92);
  g.font = 'bold 84px "Nunito Variable", system-ui, sans-serif';
  g.fillText(n, 128, 182);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  signCache.set(key, t);
  return t;
}

/* ---------------------------------------------------------------- the base: tubes and ring props */

/** The pressurised tubes between the schools: white with terracotta ribs, portholes, little feet. */
function tubes(P, f) {
  for (const t of f.tubes) {
    const A = new THREE.Vector3(t.a.x, t.y, t.a.z), B = new THREE.Vector3(t.b.x, t.y, t.b.z);
    const len = A.distanceTo(B), dir = B.clone().sub(A).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    const at = (k) => A.clone().addScaledVector(dir, len * k);
    P.put(MARS.white, new THREE.CylinderGeometry(t.r, t.r, len, 16), new THREE.Matrix4().compose(at(0.5), q, new THREE.Vector3(1, 1, 1)));
    const ribs = Math.max(2, Math.round(len / 0.9));
    for (let i = 0; i <= ribs; i++) P.put(i === 0 || i === ribs ? MARS.teal : MARS.terra, new THREE.CylinderGeometry(t.r + 0.06, t.r + 0.06, i === 0 || i === ribs ? 0.3 : 0.12, 16), new THREE.Matrix4().compose(at(i / ribs), q, new THREE.Vector3(1, 1, 1)));
    // Portholes facing out, and two feet.
    const out = new THREE.Vector3(at(0.5).x, 0, at(0.5).z).normalize();
    for (let i = 0; i < ribs; i++) {
      const c = at((i + 0.5) / ribs).addScaledVector(out, t.r + 0.01);
      const m = new THREE.Object3D();
      m.position.copy(c);
      m.lookAt(c.clone().add(out));
      m.updateMatrix();
      P.put(windowMat, new THREE.CircleGeometry(0.17, 12), m.matrix.clone());
    }
    for (const k of [0.3, 0.7]) {
      const c = at(k);
      P.put('#d9d2cb', new THREE.BoxGeometry(0.2, t.y - f.y, 0.2), Mx(c.x, f.y + (t.y - f.y) / 2, c.z));
    }
  }
}

/** A floor's rocks and props (solar panels, beacons, supply crates, pennants, sample racks) in its free corners, off the road and the places. */
function floorDeco(plan, f, look, blinkers) {
  const g = new THREE.Group();
  const r = seeded(97 + f.n * 31);
  const P = parts();
  const avoid = [
    ...f.places.map((p) => [p.x, p.z, p.r + 1.2]),
    ...f.places.map((p) => [p.at.x, p.at.z, 1.8]),
    ...[f.portal, f.boss, f.chest, f.chest.rock, f.worldGate, f.spawn].filter(Boolean).map((q) => [q.x, q.z, 2.4]),
    ...[f.portal.at, f.boss.at, f.chest.at].map((q) => [q.x, q.z, 1.6]),
    ...[...f.gemSpots, ...f.toySpots].map(([x, z]) => [x, z, 1.6]),
    ...f.blockers.map((b) => [b.x, b.z, 1.2])
  ];
  const busy = (x, z, pad) => {
    const b = plan.onBand(x, z);
    if (!b || b.phi < f.phiS + 0.02 || b.phi > f.phiE - 0.02) return true;
    if (b.across < 0.7 + pad * 0.3 || b.across > M.road - 0.5) return true;
    return avoid.some(([ax, az, ar]) => Math.hypot(ax - x, az - z) < ar + pad);
  };
  const at = () => {
    const phi = f.phiS + r() * (f.phiE - f.phiS), p = plan.pt(phi, 0.6 + r() * (M.road - 1.2));
    return [p.x, p.z];
  };
  for (let tries = 0, n = 0; tries < 600 && n < 26; tries++) {
    const [x, z] = at();
    if (busy(x, z, 0)) continue;
    const s = r() < 0.15 ? 0.5 + r() * 0.45 : 0.15 + r() * 0.3;
    const geo = new THREE.DodecahedronGeometry(1, 0);
    geo.scale(1, 0.55 + r() * 0.35, 0.8 + r() * 0.4);
    P.put(ROCKS[Math.floor(r() * ROCKS.length)], geo, Mx(x, f.y + s * 0.2, z, r() * TAU, s, (r() - 0.5) * 0.5));
    n++;
  }
  for (let tries = 0, n = 0; tries < 900 && n < 7; tries++) {
    const [x, z] = at();
    if (busy(x, z, 0.8)) continue;
    const y = f.y, ry = r() * TAU, c = Math.cos(ry), s = Math.sin(ry);
    const kind = n % 5;
    if (kind === 0) {
      for (let k = -1; k <= 1; k++) {
        P.put('#d9d4cf', new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), Mx(x + k * c, y + 0.4, z - k * s, ry));
        P.put(MARS.solar, new THREE.BoxGeometry(0.9, 0.05, 0.6).rotateX(-0.5), Mx(x + k * c, y + 0.85, z - k * s, ry));
        P.put('#9ec3ff', new THREE.BoxGeometry(0.86, 0.06, 0.04).rotateX(-0.5), Mx(x + k * c, y + 0.86, z - k * s, ry));
      }
    } else if (kind === 1) {
      P.put('#f2ece6', new THREE.CylinderGeometry(0.06, 0.1, 2.6, 6), Mx(x, y + 1.3, z));
      for (let k = 0; k < 3; k++) P.put(look.banner, new THREE.BoxGeometry(0.5 - k * 0.12, 0.05, 0.05), Mx(x, y + 1.6 + k * 0.35, z, ry));
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffcf5a' }));
      light.position.set(x, y + 2.7, z);
      g.add(light);
      blinkers.push(light);
    } else if (kind === 2) {
      P.put(MARS.teal, new THREE.BoxGeometry(0.8, 0.6, 0.8), Mx(x, y + 0.3, z, ry));
      P.put('#f2ece6', new THREE.BoxGeometry(0.7, 0.5, 0.7), Mx(x + c * 0.9, y + 0.25, z - s * 0.9, ry + 0.3));
      P.put(MARS.yellow, new THREE.BoxGeometry(0.5, 0.45, 0.5), Mx(x + c * 0.2, y + 0.82, z - s * 0.2, ry + 0.5));
    } else if (kind === 3) {
      P.put('#d9d4cf', new THREE.CylinderGeometry(0.035, 0.04, 2.0, 5), Mx(x, y + 1.0, z));
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.lineTo(0.9, -0.22);
      sh.lineTo(0, -0.44);
      P.put(look.banner, new THREE.ShapeGeometry(sh), Mx(x + 0.03, y + 1.95, z, ry));
      P.put(MARS.yellow, new THREE.SphereGeometry(0.07, 8, 6), Mx(x, y + 2.02, z));
    } else {
      P.put('#f2ece6', new THREE.BoxGeometry(1.2, 0.3, 0.5), Mx(x, y + 0.5, z, ry));
      for (let k = 0; k < 4; k++) P.put(['#7fd8ff', '#ffc83d', '#ff8f7a', '#9be08a'][k], new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), Mx(x + (k - 1.5) * 0.26 * c, y + 0.8, z - (k - 1.5) * 0.26 * s, ry));
      for (const k of [-1, 1]) P.put('#c9cfd8', new THREE.BoxGeometry(0.06, 0.5, 0.06), Mx(x + k * 0.55 * c, y + 0.25, z - k * 0.55 * s, ry));
    }
    n++;
  }
  P.build(g);
  return g;
}

/** Boulders on the plain round the foot, and tumbled at the foot of the escarpment. */
function plainRocks(group, plan) {
  const r = seeded(4242);
  const P = parts();
  const R0 = plan.footR + 3;
  for (let i = 0; i < 1100; i++) {
    const a = r() * TAU, d = R0 + r() * 170;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if ([SIGHTS.rocket, SIGHTS.village].some((s) => Math.hypot(x - s.x, z - s.z) < s.r + 4)) continue;
    if (Math.abs(Math.hypot(x - SIGHTS.rover.x, z - SIGHTS.rover.z) - SIGHTS.rover.loop) < 4) continue;
    if (d < plan.rockR && plan.rock(x, z) > plain(x, z) + 0.25) continue;
    const s = r() < 0.12 ? 1.4 + r() * 1.8 : 0.35 + r() * 0.7;
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(1, 0.55 + r() * 0.35, 0.8 + r() * 0.4);
    P.put(ROCKS[Math.floor(r() * ROCKS.length)], g, Mx(x, plain(x, z) + s * 0.2, z, r() * TAU, s, (r() - 0.5) * 0.5));
  }
  for (let i = 0; i < 260; i++) {
    const a = r() * TAU;
    const o = plan.bandsAt(a)[0];
    const d = o.ro + M.esc + (o.y - GROUND_Y) * M.escK + 0.5 + r() * 5;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if ([SIGHTS.rocket, SIGHTS.village].some((s) => Math.hypot(x - s.x, z - s.z) < s.r + 4)) continue;
    const s = 0.6 + r() * 1.6;
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(1, 0.6 + r() * 0.3, 0.9);
    P.put(ROCKS[Math.floor(r() * ROCKS.length)], g, Mx(x, plain(x, z) + s * 0.2, z, r() * TAU, s, (r() - 0.5) * 0.5));
  }
  group.add(P.build(new THREE.Group()));
}

/* ---------------------------------------------------------------- the far plain */

/** The plain round the volcano out to the skyline: a polar grid, one flat colour a facet. */
function farPlain(plan) {
  const R0 = plan.rockR - 1, R1 = 1500, RINGS = 84, SEGS = 240, under = R0 + 5;
  const rows = [];
  for (let i = 0; i <= RINGS; i++) {
    const r = R0 + (R1 - R0) * (i / RINGS) ** 1.8;
    const row = [];
    for (let j = 0; j < SEGS; j++) {
      const a = (j / SEGS) * TAU + (i % 2) * (Math.PI / SEGS);
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      // Where it meets the volcano's own rock, tuck a little lower so the two never flicker.
      row.push([x, farGround(x, z) - (r < under ? 0.45 : 0), z]);
    }
    rows.push(row);
  }
  const plainA = new THREE.Color('#e09460'), plainB = new THREE.Color('#d68756'), mesa = new THREE.Color('#eaa874'), deep = new THREE.Color('#9a4e34');
  const geo = gridMesh(rows, (c, p, q, s) => {
    const { mx, my, mz, steep } = facet(p, q, s);
    const far = Math.min(1, Math.max(0, (Math.hypot(mx, mz) - 260) / 200));
    const above = my - GROUND_Y;
    c.copy(noise(mx * 0.35, mz * 0.35) > 0 ? plainA : plainB);
    if (steep > (far > 0 ? 0.32 : 0.6)) c.copy(strata(mx, my * 0.5, mz));
    else if (above > 8) c.lerp(mesa, Math.min(1, above / 30) * far);
    if (above < -10) c.lerp(deep, Math.min(1, (-above - 10) / 20));
    c.offsetHSL(0, 0, fbm(mx * 0.05, mz * 0.05) * 0.03);
  }, { closed: true });
  return toonMesh(geo, 'mars-far');
}

/* ---------------------------------------------------------------- the sky: the Sun, Phobos and Deimos */

export function glowTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [k, s] of stops) grad.addColorStop(k, s);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** A small bright Sun (Mars is farther from it than the Earth), a soft glow round it, and the bluish halo Mars's dusty sky has. */
function sun(dir) {
  const g = new THREE.Group();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture([[0, 'rgba(210,230,255,0.85)'], [0.25, 'rgba(160,195,240,0.5)'], [0.6, 'rgba(150,185,230,0.16)'], [1, 'rgba(150,185,230,0)']]), depthWrite: false, fog: false, transparent: true }));
  halo.scale.setScalar(330);
  // A crisp bright disc with a warm rim, so it reads as the Sun even in the pale dusty sky.
  const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,253,240,1)'], [0.47, 'rgba(255,226,150,1)'], [0.52, 'rgba(255,214,130,0.55)'], [1, 'rgba(255,214,140,0)']]), depthWrite: false, fog: false, transparent: true }));
  disc.scale.setScalar(64);
  g.add(halo, disc);
  g.position.copy(dir).multiplyScalar(1250);
  g.renderOrder = -8;
  for (const s of [halo, disc]) s.renderOrder = -8;
  g.userData.sprites = [halo, disc];
  return g;
}
/** A little lumpy grey-brown moon with dark craters. */
function lumpyMoon(r, seed, stretch) {
  const geo = new THREE.IcosahedronGeometry(r, 3);
  const p = geo.attributes.position, v = new THREE.Vector3();
  const rnd = seeded(seed);
  const pits = Array.from({ length: 9 }, () => [new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), 0.18 + rnd() * 0.22]);
  const col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    let k = 1 + fbm(n.x * 2 + seed, n.y * 2 + n.z * 1.5) * 0.22;
    c.set('#c2b0a2');
    for (const [d, s] of pits) {
      const a = n.angleTo(d);
      if (a < s) {
        k -= 0.08 * (1 - a / s);
        c.lerp(new THREE.Color('#857266'), 0.6 * (1 - a / s));
      }
    }
    p.setXYZ(i, v.x * k * stretch[0], v.y * k * stretch[1], v.z * k * stretch[2]);
    c.toArray(col, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#8a6a5c'), emissiveIntensity: 0.45, fog: false }));
  m.renderOrder = -7;
  return m;
}
function moons() {
  const g = new THREE.Group();
  const halo = glowTexture([[0, 'rgba(255,246,236,0.55)'], [0.45, 'rgba(255,236,220,0.22)'], [1, 'rgba(255,230,210,0)']]);
  const make = (m, r, dist, seed, stretch) => {
    const moon = lumpyMoon(r, seed, stretch);
    moon.position.set(...m.dir).normalize().multiplyScalar(dist);
    // A soft glow round each little moon, so it reads as a moon in the sky, not a floating rock.
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, depthWrite: false, fog: false, transparent: true }));
    glow.position.copy(moon.position).multiplyScalar(1.02);
    glow.scale.setScalar(r * 4.2);
    glow.renderOrder = -8;
    g.add(glow, moon);
    moon.userData.glow = glow;
    return moon;
  };
  const phobos = make(MOONS.phobos, MOONS.phobos.r, 1150, 3, [1.3, 0.92, 1]);
  phobos.rotation.set(0.4, 0.8, 0.2);
  const deimos = make(MOONS.deimos, MOONS.deimos.r, 1180, 9, [1.12, 0.96, 1]);
  g.userData = { phobos, deimos };
  return g;
}

/* ---------------------------------------------------------------- the giants */

/** A lattice tower: four posts, cross bars, a walkway arm, a blinking light on top. */
function launchTower(g, [x, y, z], h, armYaw) {
  for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) add(g, box(0.4, h, 0.4), mat('#f2ece6'), [x + dx, y + h / 2, z + dz]);
  for (let i = 0; i < Math.floor(h / 2.6); i++) {
    const yy = y + 1.5 + i * 2.6;
    const c = i % 3 === 0 ? MARS.terra : '#f2ece6';
    add(g, box(2.9, 0.22, 0.22), mat(c), [x, yy, z + 1.3]);
    add(g, box(2.9, 0.22, 0.22), mat(c), [x, yy, z - 1.3]);
    add(g, box(0.22, 0.22, 2.9), mat(c), [x + 1.3, yy, z]);
    add(g, box(0.22, 0.22, 2.9), mat(c), [x - 1.3, yy, z]);
    add(g, box(0.12, 3.7, 0.12), mat('#d9d2cb'), [x, yy + 1.3, z + 1.3], [0, 0, 0.78 * (i % 2 ? 1 : -1)]);
  }
  const arm = new THREE.Group();
  arm.position.set(x, y + h * 0.78, z);
  arm.rotation.y = armYaw;
  add(arm, box(1.4, 1.3, 7.4), mat('#f2ece6'), [0, 0, 4.2]);
  add(arm, box(1.5, 0.25, 7.5), mat(MARS.teal), [0, -0.7, 4.2]);
  g.add(arm);
  add(g, box(3.2, 0.6, 3.2), mat(MARS.terra), [x, y + h + 0.3, z]);
  add(g, cyl(0.06, 0.06, 4, 5), mat('#c9cfd8'), [x, y + h + 2.6, z]);
}

function giants(group) {
  const out = {};
  const ground = (x, z) => plain(x, z);
  // The Big Rocket on its printed launch pad, by its tower.
  {
    const S = SIGHTS.rocket, y = ground(S.x, S.z);
    const g = new THREE.Group();
    const padGeo = new THREE.CylinderGeometry(12, 12.6, 1.2, 48, 4);
    const A = new THREE.Color(MARS.terraLight), B = new THREE.Color(MARS.terra);
    const pc = new Float32Array(padGeo.attributes.position.count * 3);
    for (let i = 0; i < padGeo.attributes.position.count; i++) (Math.floor((padGeo.attributes.position.getY(i) + 1) / 0.3) % 2 ? A : B).toArray(pc, i * 3);
    padGeo.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    add(g, padGeo, vcMat({ key: 'marsprint' }), [S.x, y + 0.6, S.z]);
    add(g, cyl(11.8, 11.8, 0.08, 48), mat('#efe0d2'), [S.x, y + 1.22, S.z]);
    add(g, new THREE.TorusGeometry(10.6, 0.25, 4, 64), mat(MARS.yellow), [S.x, y + 1.25, S.z], [Math.PI / 2, 0, 0]);
    // The launch mount: a ring on six legs.
    add(g, new THREE.TorusGeometry(3.6, 0.5, 8, 32), mat('#8e8f96', { metal: 0.5 }), [S.x, y + 5.6, S.z], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      add(g, box(0.7, 4.6, 0.7), mat('#8e8f96', { metal: 0.5 }), [S.x + Math.sin(a) * 3.8, y + 3.4, S.z + Math.cos(a) * 3.8]);
    }
    launchTower(g, [S.x - 9.5, y + 1.2, S.z - 3], 42, Math.PI / 2 + 0.05);
    const top = add(g, sphere(0.45, 10, 8), mat('#ff5f5f', { emissive: '#ff3030', ei: 1.4, key: 'beacon' }), [S.x - 9.5, y + 1.2 + 42 + 4.7, S.z - 3]);
    top.userData.live = true;
    batch(g);
    const rocket = bigRocketModel();
    rocket.position.set(S.x, y + 4.4, S.z);
    rocket.rotation.y = 0.3;
    g.add(rocket);
    group.add(g);
    out.beacon = top;
  }
  // The habitat village: printed domes joined by little tunnels, greenhouse tunnels, solar fields, a dish.
  {
    const S = SIGHTS.village, y = ground(S.x, S.z);
    const g = new THREE.Group();
    const rnd = seeded(51);
    const domes = [[0, 0, 5.2], [-11, 6, 3.6], [10, 8, 3.8], [3, -12, 3.2], [-9, -9, 2.8]];
    for (const [dx, dz, r] of domes) {
      const prof = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        prof.push(new THREE.Vector2(Math.max(0.001, r * Math.cos(t * Math.PI / 2) ** 0.85), r * 1.25 * Math.sin(t * Math.PI / 2)));
      }
      const geo = new THREE.LatheGeometry(prof, 32);
      const A = new THREE.Color(MARS.terraLight), B = new THREE.Color(MARS.terra), cc = new Float32Array(geo.attributes.position.count * 3);
      for (let i = 0; i < geo.attributes.position.count; i++) (Math.floor(geo.attributes.position.getY(i) / 0.3) % 2 ? A : B).toArray(cc, i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(cc, 3));
      add(g, geo, vcMat({ key: 'marsprint' }), [S.x + dx, y, S.z + dz]);
      add(g, new THREE.TorusGeometry(r, 0.22, 6, 32), mat(MARS.white), [S.x + dx, y + 0.2, S.z + dz], [Math.PI / 2, 0, 0]);
      add(g, new THREE.SphereGeometry(r * 0.22, 14, 6, 0, TAU, 0, Math.PI / 2), windowMat, [S.x + dx, y + r * 1.25 - 0.1, S.z + dz]);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + rnd();
        const rr = r * Math.cos(0.45) ** 0.85;
        const w = add(g, new THREE.CircleGeometry(r * 0.09, 14), windowMat, [S.x + dx + Math.sin(a) * (rr + 0.05), y + r * 0.55, S.z + dz + Math.cos(a) * (rr + 0.05)]);
        w.rotation.y = a;
      }
    }
    // Tunnels between the domes.
    for (const [a, b] of [[0, 1], [0, 2], [0, 3], [3, 4], [1, 4]]) {
      const [ax, az] = domes[a], [bx, bz] = domes[b];
      const len = Math.hypot(bx - ax, bz - az);
      add(g, cyl(1.0, 1.0, len, 14), mat(MARS.white), [S.x + (ax + bx) / 2, y + 1.0, S.z + (az + bz) / 2], [Math.PI / 2, Math.atan2(bx - ax, bz - az), 0]).rotation.order = 'YXZ';
    }
    // Greenhouse tunnels, glowing a little at night.
    for (const [dx, dz, yaw] of [[-16, -2, 0.2], [16, -4, -0.3], [-2, 14, 1.4]]) {
      const gh = greenhouseTunnel(9, 2.0, Math.round(dx * 7 + dz));
      gh.position.set(S.x + dx, y, S.z + dz);
      gh.rotation.y = yaw;
      g.add(gh);
    }
    // Solar fields, a dish, an antenna, a little landing pad.
    for (let i = 0; i < 8; i++) {
      const x = S.x + 22 + (i % 4) * 3.2, z = S.z - 10 + Math.floor(i / 4) * 4.5;
      add(g, cyl(0.08, 0.08, 1.2, 5), mat('#c9cfd8'), [x, y + 0.6, z]);
      add(g, box(2.8, 0.08, 1.8), tmat('solar', MARS.solar), [x, y + 1.3, z], [-0.5, 0, 0]);
    }
    add(g, cyl(0.25, 0.35, 5, 8), mat('#f2ece6'), [S.x - 20, y + 2.5, S.z + 12]);
    const dish = new THREE.LatheGeometry([0, 1, 2, 2.8].map((r) => new THREE.Vector2(r, r * r * 0.18)), 24);
    add(g, dish, mat(MARS.white, { side: THREE.DoubleSide }), [S.x - 20, y + 5.6, S.z + 12], [0.8, 0.6, 0]);
    add(g, cyl(5, 5.2, 0.4, 32), mat('#efe0d2'), [S.x + 8, y + 0.2, S.z + 22]);
    add(g, new THREE.TorusGeometry(4.2, 0.18, 4, 40), mat(MARS.yellow), [S.x + 8, y + 0.42, S.z + 22], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      add(g, cyl(0.12, 0.12, 0.1, 8), lampMat, [S.x + 8 + Math.sin(a) * 4.6, y + 0.45, S.z + 22 + Math.cos(a) * 4.6]);
    }
    batch(g);
    group.add(g);
  }
  // The rover on its loop, the drone on its circle.
  const rover = marsRoverModel();
  rover.scale.setScalar(1.3);
  group.add(rover);
  const drone = droneModel();
  drone.scale.setScalar(2.2);
  group.add(drone);
  out.rover = rover;
  out.drone = drone;
  return out;
}

function mergeList(list) {
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

/* ---------------------------------------------------------------- dust */

/** Dust devils: tall twisting funnels of red dust wandering the plain on slow loops. */
function dustDevils(group) {
  const devils = [];
  const spots = [[-215, 60, 50, 26], [210, -90, 60, 30], [-120, -230, 50, 22], [200, 150, 50, 24], [10, 260, 40, 20], [-60, 230, 30, 18]];
  spots.forEach(([cx, cz, roam, h], i) => {
    const m = devilMaterial();
    m.uniforms.uA.value = 0.55;
    m.uniforms.uColor.value.set('#e39466');
    const f = new THREE.Mesh(devilGeometry(h, 0.6, h * 0.22), m);
    f.renderOrder = 3;
    const base = new THREE.Mesh(new THREE.CircleGeometry(h * 0.18, 24), new THREE.MeshBasicMaterial({ color: '#d98a5c', transparent: true, opacity: 0.35, depthWrite: false }));
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.15;
    const g = new THREE.Group();
    g.add(f, base);
    group.add(g);
    devils.push({ g, m, cx, cz, roam, phase: i * 1.7 });
  });
  return {
    update(t) {
      for (const d of devils) {
        const x = d.cx + Math.sin(t * 0.021 + d.phase) * d.roam, z = d.cz + Math.sin(t * 0.017 + d.phase * 1.3) * d.roam * 0.6;
        d.g.position.set(x, plain(x, z) - 0.2, z);
        d.g.rotation.y = t * 1.4;
        d.g.children[0].rotation.z = Math.sin(t * 0.7 + d.phase) * 0.05;
        d.m.uniforms.uTime.value = t + d.phase;
      }
    },
    setNight(k) {
      for (const d of devils) d.m.uniforms.uA.value = 0.55 * (1 - k * 0.8);
    }
  };
}

/** Puffs of red dust: little soft balls that bloom out and settle, then fade. */
function dustPuffs(group) {
  const puffs = [];
  for (let i = 0; i < 28; i++) {
    const p = new THREE.Group();
    p.visible = false;
    const m = new THREE.MeshLambertMaterial({ color: '#e3a07a', transparent: true, opacity: 0, depthWrite: false });
    const balls = [];
    for (let k = 0; k < 7; k++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + (k % 3) * 0.05, 1), m);
      const a = (k / 7) * TAU;
      b.userData.v = [Math.sin(a) * (0.8 + (k % 2) * 0.45), 0.3 + (k % 3) * 0.18, Math.cos(a) * (0.8 + (k % 2) * 0.45)];
      p.add(b);
      balls.push(b);
    }
    p.userData = { m, balls, t: 9 };
    group.add(p);
    puffs.push(p);
  }
  let next = 0;
  return {
    kick(x, y, z, s = 1) {
      const p = puffs[next];
      next = (next + 1) % puffs.length;
      p.position.set(x, y + 0.05, z);
      p.scale.setScalar(s);
      p.userData.t = 0;
      p.visible = true;
    },
    update(dt) {
      for (const p of puffs) {
        if (!p.visible) continue;
        const u = p.userData;
        u.t += dt;
        const k = u.t / 1.1;
        if (k >= 1) {
          p.visible = false;
          continue;
        }
        u.m.opacity = 0.6 * (1 - k);
        const spread = 1 - Math.pow(1 - k, 2.2);
        for (const b of u.balls) {
          const [vx, vy, vz] = b.userData.v;
          b.position.set(vx * spread, vy * Math.sin(k * Math.PI) * 0.8, vz * spread);
          b.scale.setScalar(0.6 + k * 0.9);
        }
      }
    }
  };
}

/* ---------------------------------------------------------------- the whole of Mars */

/**
 * Build Mars for a plan and the floors' looks.
 * @returns {{ group, walk, tiers, gates, fireflySpots, update(t, night), setNight(k), dust(x, y, z, s) }}
 */
export function buildMarsWorld(plan, floors) {
  const group = new THREE.Group();
  group.name = 'mars';
  const walk = new THREE.Group();
  walk.name = 'walk';
  group.add(walk);
  group.add(volcanoRock(plan));
  group.add(farPlain(plan));
  const theSun = sun(new THREE.Vector3(...SUN.disc).normalize());
  group.add(theSun);
  const sky = moons();
  group.add(sky);
  const big = giants(group);
  plainRocks(group, plan);
  const blinkers = [];
  // The signs show the three subjects taught here (content/subjects.js).
  const subjects = subjectsOf('mars').map((s) => SUBJECT_ICONS[s]).join('');
  const count = plan.floors.length;
  // The floors: each its own stretch of terrace (walkable), its railing, lamps, signs, tubes, rocks and props, greyed while it is locked.
  const tiers = plan.floors.map((f) => {
    const look = floors[f.k].look;
    const w = new THREE.Group();
    w.add(floorTop(plan, f, look));
    w.userData.floor = f.n;
    walk.add(w);
    const deco = floorDeco(plan, f, look, blinkers);
    const P = parts(), lamps = parts();
    railing(P, lamps, plan, f.phiS, f.phiE);
    if (f.k === 0) endRail(P, plan, f.phiS + 0.25 / plan.riOf(f.phiS), f.y);
    if (f.k === count - 1) endRail(P, plan, f.phiE - 0.25 / plan.riOf(f.phiE), f.y);
    tubes(P, f);
    // The plaza's mark on the road in front of the middle school: a ring in the floor's colour.
    P.put(look.banner, new THREE.RingGeometry(1.9, 2.5, 48).rotateX(-Math.PI / 2), Mx(f.spawn.x, f.y + 0.035, f.spawn.z));
    P.put('#fff6e8', new THREE.CircleGeometry(0.5, 24).rotateX(-Math.PI / 2), Mx(f.spawn.x, f.y + 0.035, f.spawn.z));
    // Signposts: arriving (the schools are this way →, the way down ←), at the plaza (up →, down ←), at the ramp up (↑ next floor).
    const len = (f.phiE - f.phiS) * (f.ri + M.placeLine);
    const along = (d) => plan.phiAlong(f.k, d);
    const up = f.n < count ? [`⬆ ${f.n + 1} →`, MARS.teal] : null;
    const down = f.n > 1 ? [`← ⬇ ${f.n - 1}`, '#8a7f8c'] : null;
    signpost(deco, P, plan, along(2.6), f.y, [[`${subjects} →`, look.banner], down].filter(Boolean), { top: [`${floors[f.k].icon} ${f.n}`, look.banner] });
    signpost(deco, P, plan, f.plaza.phi + 3.2 / (f.ri + M.W), f.y, [up, f.k === 0 ? ['← 🌍', '#4f8fd6'] : down].filter(Boolean));
    if (up) signpost(deco, P, plan, along(len - 2.2), f.y, [up, [`← ${subjects}`, look.banner]]);
    else signpost(deco, P, plan, along(len - 2.2), f.y, [[`← ${subjects}`, look.banner]], { top: ['🌋 ' + f.n, look.banner] });
    // The ramp up to this floor: its railing, lit edges, chevrons and beacons belong to this floor (greyed with it).
    const s = plan.stairs[f.k - 1];
    const glow = parts();
    if (s) {
      railing(P, lamps, plan, s.pa, s.pb, M.W - 0.22, 3);
      rampMarks(P, glow, plan, s, blinkers, deco);
    }
    P.build(deco);
    lamps.build(deco);
    glow.build(deco);
    patchCutout(deco);
    group.add(deco);
    return { walk: w, deco };
  });
  // The ramps (walkable), a pressure door at the foot of each.
  const gates = [];
  const rampWalk = new THREE.Group();
  for (const s of plan.stairs) {
    const look = floors[s.from - 1].look;
    const top = rampTop(plan, s);
    rampWalk.add(top);
    const gate = marsGate({ a: s.a, b: { x: s.a.x + s.up.x, y: s.a.y, z: s.a.z + s.up.z }, width: M.W - 0.4 }, look);
    gate.userData.to = s.to;
    gates.push(gate);
    group.add(gate);
  }
  walk.add(rampWalk);
  const devils = dustDevils(group);
  const dust = dustPuffs(group);
  const steel = steelMaterial();
  const nightTint = new THREE.Color('#56608e');
  const R = SIGHTS.rover, D = SIGHTS.drone;
  const placeRover = (t) => {
    const a = t * 0.07;
    const x = R.x + Math.sin(a) * R.loop, z = R.z + Math.cos(a) * R.loop * 0.7;
    big.rover.position.set(x, plain(x, z), z);
    big.rover.rotation.y = Math.atan2(Math.cos(a) * R.loop, -Math.sin(a) * R.loop * 0.7);
    for (const wl of big.rover.userData.wheels) wl.rotation.x = t * 1.2;
    big.rover.userData.head.rotation.y = Math.sin(t * 0.4) * 0.8;
  };
  const placeDrone = (t) => {
    const a = -t * 0.12;
    const x = D.x + Math.sin(a) * D.loop, z = D.z + Math.cos(a) * D.loop;
    big.drone.position.set(x, plain(D.x, D.z) + D.y + Math.sin(t * 1.3) * 0.8, z);
    big.drone.rotation.y = a - Math.PI / 2;
    big.drone.rotation.z = 0.12;
    const [lo, hi] = big.drone.userData.rotors;
    lo.rotation.y = t * 22;
    hi.rotation.y = -t * 22;
  };
  placeRover(0);
  placeDrone(0);
  devils.update(0);
  let last = null;
  return {
    group,
    walk,
    tiers,
    gates,
    fireflySpots: [],
    update(t) {
      const dt = last == null ? 0 : Math.max(0, Math.min(0.1, t - last));
      last = t;
      placeRover(t);
      placeDrone(t);
      devils.update(t);
      dust.update(dt);
      big.beacon.visible = Math.sin(t * 2.4) > -0.2;
      blinkers.forEach((b, i) => (b.visible = Math.sin(t * 3 + i * 1.7) > 0));
      sky.userData.phobos.rotation.y = t * 0.02;
    },
    setNight(k) {
      for (const m of [sky.userData.phobos, sky.userData.deimos]) {
        m.material.emissiveIntensity = 0.45 + k * 0.9;
        m.userData.glow.material.opacity = 0.8 - k * 0.35;
      }
      for (const s of theSun.userData.sprites) s.material.opacity = 1 - k;
      steel.color.copy(steel.userData.base).lerp(nightTint, k * 0.8);
      edgeMat.emissiveIntensity = 0.8 + k * 1.6;
      chevMat.emissiveIntensity = 0.55 + k * 1.2;
      devils.setNight(k);
    },
    dust: (x, y, z, s) => dust.kick(x, y, z, s)
  };
}
