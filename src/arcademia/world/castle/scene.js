/**
 * The Sky Castle in 3D: a floating island high in a deep blue sky, crowned by
 * a white-stone castle town.
 *
 * On top, one paved street of terraces winds up the castle hill (flagstones,
 * plazas, garden beds by the walls, a crenellated parapet with lanterns along
 * its edge), white retaining walls of block masonry between its turns — their
 * tops planted with hedges, flowers and little trees, ivy spilling down their
 * faces — and round turrets with teal conical roofs and gold finials rising
 * from the walls all the way up. Wide stone ramps with a red carpet up the
 * middle join the floors, a portcullis at each foot; signposts point the way.
 * The keep crowns the top: a great round tower and four slim ones, banners and
 * spires, in a courtyard garden. Outside the town wall a ring of meadow and
 * orchards with cottages runs to the rim, where two streams pour off the edge
 * as waterfalls into the clouds.
 *
 * Below the rim the island's underside is an upside-down cone of layered
 * blue-grey stone ledges, mossy, hung with vines and roots, tapering to a
 * point. Big soft cumulus clouds drift round and below it; small floating
 * islets bob nearby (two tied to the rim with rope bridges). Far below lie
 * green rolling hills, a river, forests, old stone ruins and blue mountains on
 * the skyline. By night the lanterns, windows and stained glass glow under the
 * stars.
 *
 * What you walk on (each floor's street, the ramps) is kept in `walk`, so
 * clicks find it; each floor's parts are grouped (`tiers`, with the ramp up to
 * it) so a locked one can be greyed.
 */
import * as THREE from 'three';
import { fbm, noise } from '../layout.js';
import { add, batch, box, cyl, ico, mat, seeded, toonRamp, gable } from '../kit.js';
import { lampMat, windowMat, SUBJECT_ICONS } from '../buildings.js';
import { patchCutout } from '../cutout.js';
import { gridMesh, facet, toonMesh, parts, Mx, bar, signTexture, discTexture, glowTexture } from '../mars/scene.js';
import { CASTLE as C, UNDER, BELOW, farGround } from './plan.js';
import { STONE, spire, roundTower, archWindow, banner, castleGate, glassMat } from './buildings.js';

const TAU = Math.PI * 2;
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ---------------------------------------------------------------- the stone */

/**
 * Masonry: toon-shaded vertex colours, and on every steep face a pattern of stone blocks in courses
 * (staggered joints, each block a touch lighter or darker), by its place in the world — so every wall,
 * whatever its triangles, reads as white ashlar.
 */
const stoneMats = new Map();
function stoneMaterial(side = THREE.FrontSide) {
  if (stoneMats.has(side)) return stoneMats.get(side);
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp(), side });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStoneP;\nvarying vec3 vStoneN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvStoneP = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvStoneN = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vStoneP;
varying vec3 vStoneN;
float stoneHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 sn = normalize(vStoneN);
  float steep = 1.0 - smoothstep(0.55, 0.78, abs(sn.y));
  float rr = max(length(vStoneP.xz), 0.001);
  float lh = length(sn.xz);
  float radial = lh > 0.01 ? abs(dot(sn.xz / lh, vStoneP.xz / rr)) : 1.0;
  float along = radial > 0.5 ? atan(vStoneP.x, vStoneP.z) * rr : rr;
  float row = floor(vStoneP.y / 0.62);
  float bu = along / 1.3 + row * 0.5;
  float id = stoneHash(vec2(floor(bu), row));
  float jv = fract(vStoneP.y / 0.62), ju = fract(bu);
  float joint = max(1.0 - smoothstep(0.0, 0.07, jv), 1.0 - smoothstep(0.0, 0.04, min(ju, 1.0 - ju)));
  float k = mix(0.92 + id * 0.11, 0.8, joint);
  // A string course of darker stone half-way up every storey.
  float m6 = mod(vStoneP.y - 3.0, 6.0);
  float course = 1.0 - smoothstep(0.1, 0.16, min(m6, 6.0 - m6));
  k *= 1.0 - course * 0.14;
  diffuseColor.rgb *= mix(1.0, k, steep);
}`);
  };
  m.customProgramCacheKey = () => `castle-stone-${side}`;
  stoneMats.set(side, m);
  return m;
}

const CREAM = new THREE.Color('#f1eadb'), CREAM2 = new THREE.Color('#e9e0ce'), GRIME = new THREE.Color('#cfc6b4');
const MOSS = new THREE.Color('#7fae5c'), MOSS2 = new THREE.Color('#5f9a4c');
const LAWN = [new THREE.Color('#8fd06a'), new THREE.Color('#7fc460')], HEDGE = new THREE.Color('#5aa84f');
const PAVE = [new THREE.Color('#f3ecdd'), new THREE.Color('#e6dcc8')];

/* ---------------------------------------------------------------- the island's top: the filler under it all */

function islandTop(plan) {
  const radii = [];
  for (let r = 0.01; r < plan.footR + 1.5; r += 0.6) radii.push(r);
  const inner = radii.length;
  const OUT = 10;
  const SEG = 640;
  const rows = [];
  for (let i = 0; i < inner + OUT; i++) {
    const row = [];
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * TAU;
      const r = i < inner ? radii[i] : plan.footR + 1.5 + (plan.lipR(a) - plan.footR - 1.5) * ((i - inner + 1) / OUT);
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      row.push([x, plan.shell(x, z), z]);
    }
    rows.push(row);
  }
  const geo = gridMesh(rows, (c, p, q, s) => {
    const { mx, my, mz, steep } = facet(p, q, s);
    const n = noise(mx * 0.35, mz * 0.35);
    if (steep > 0.8) {
      c.copy(CREAM).lerp(GRIME, smooth(4, -2, my - Math.floor(my / 6) * 6) * 0.25);
      return;
    }
    const b = plan.onBand(mx * (Math.hypot(mx, mz) + 0.7) / Math.max(0.01, Math.hypot(mx, mz)), mz * (Math.hypot(mx, mz) + 0.7) / Math.max(0.01, Math.hypot(mx, mz)));
    if (b) c.copy(PAVE[1]);
    else if (my > plan.keepY - 0.3) {
      // The keep's courtyard: paving rings, garden beds.
      const r = Math.hypot(mx, mz);
      c.copy(r < 13 || (Math.floor(r / 2.2) & 1) ? PAVE[0] : LAWN[n > 0 ? 0 : 1]);
    } else if (my < C.meadowY + 1) c.copy(LAWN[n > 0.1 ? 1 : 0]).offsetHSL(0, 0, fbm(mx * 0.08, mz * 0.08) * 0.04);
    else c.copy(HEDGE).offsetHSL(0, 0, n * 0.04);
  }, { closed: true });
  const m = new THREE.Mesh(geo, stoneMaterial());
  m.receiveShadow = true;
  m.castShadow = true;
  m.name = 'castle-island';
  return m;
}

/* ---------------------------------------------------------------- the walls' own faces */

/** A wall face as a strip: along φ, from `bottom(φ)` up to `top(φ)` at radius `rOf(φ)`; grimy at the foot, mossy patches high up. */
function wallStrip(plan, a, b, rOf, bottom, top, seed = 1) {
  const n = Math.max(2, Math.ceil(((b - a) * (plan.riOf(a) + 4)) / 0.8));
  const H = 6;
  const pos = [], col = [];
  const c = new THREE.Color();
  const V = [];
  for (let j = 0; j <= n; j++) {
    const phi = a + ((b - a) * j) / n, r = rOf(phi), t = plan.thetaOf(phi);
    const y0 = bottom(phi), y1 = top(phi);
    const colRow = [];
    for (let i = 0; i <= H; i++) {
      const y = y0 + ((y1 - y0) * i) / H;
      colRow.push([Math.sin(t) * r, y, Math.cos(t) * r]);
    }
    V.push(colRow);
  }
  const colourAt = (x, y, z, k) => {
    c.copy(fbm(x * 0.2 + seed, z * 0.2) > 0 ? CREAM : CREAM2).lerp(GRIME, (1 - k) ** 3 * 0.45);
    const moss = noise(x * 0.25 + seed * 3, y * 0.3 + z * 0.25);
    if (k > 0.7 && moss > 0.25) c.lerp(moss > 0.45 ? MOSS2 : MOSS, Math.min(1, (moss - 0.25) * 4) * smooth(0.7, 1, k));
    return c;
  };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < H; i++) {
      const p = V[j][i], q = V[j + 1][i], s = V[j + 1][i + 1], u = V[j][i + 1];
      for (const [v, k] of [[p, i / H], [q, i / H], [s, (i + 1) / H], [p, i / H], [s, (i + 1) / H], [u, (i + 1) / H]]) {
        pos.push(...v);
        const cc = colourAt(v[0], v[1], v[2], k);
        col.push(cc.r, cc.g, cc.b);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/** The retaining walls between the turns, the town wall outside the lowest turn, and the two ends. */
function walls(plan) {
  const g = new THREE.Group();
  const m = stoneMaterial(THREE.DoubleSide);
  const { PHI } = plan;
  const topOf = (phi) => (phi + TAU <= PHI ? plan.bandY(phi + TAU) + plan.WALK_UP : plan.keepY);
  // Every turn's inner wall (its face looks out at you), in pieces so each stays a gentle curve.
  const step = 0.5;
  for (let a = 0; a < PHI - 1e-6; a += step) {
    const b = Math.min(PHI, a + step);
    g.add(new THREE.Mesh(wallStrip(plan, a, b, (phi) => plan.riOf(phi) + 0.01, (phi) => plan.bandY(phi) - 0.5, topOf, 3), m));
  }
  // The town wall: the lowest turn's outer face, down to the meadow.
  const meadowAt = (phi) => {
    const p = plan.pt(phi, C.W);
    return plan.meadow(p.x, p.z) - 0.8;
  };
  for (let a = 0; a < TAU - 1e-6; a += step) {
    const b = Math.min(TAU, a + step);
    g.add(new THREE.Mesh(wallStrip(plan, a, b, (phi) => plan.riOf(phi) + C.W - 0.01, meadowAt, (phi) => plan.bandY(phi) - 0.02, 7), m));
  }
  // The two ends: where floor 1 begins (a cliff of wall beside the lower town), and the top floor's far end.
  const end = (phi, r0, r1, y0, y1) => {
    const t = plan.thetaOf(phi), sx = Math.sin(t), cz = Math.cos(t);
    const geo = new THREE.BufferGeometry();
    const P = [[r0, y0], [r1, y0], [r1, y1], [r0, y0], [r1, y1], [r0, y1]].flatMap(([r, y]) => [sx * r, y, cz * r]);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(18).fill(0).map((_, i) => [CREAM.r, CREAM.g, CREAM.b][i % 3]), 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, m));
  };
  const ri0 = plan.riOf(0), low = C.meadowY - 1.5;
  end(0, ri0 - C.gap, ri0, low, plan.bandY(TAU) + plan.WALK_UP);
  end(0, ri0, ri0 + C.W, low, 0);
  const riE = plan.riOf(PHI);
  end(PHI, riE, riE + C.P, plan.topY - 0.5, plan.keepY);
  for (const k of g.children) {
    k.receiveShadow = true;
    k.castShadow = true;
  }
  return g;
}

/* ---------------------------------------------------------------- the streets */

function bandGrid(plan, a, b, acrossList, yOf) {
  const outer = plan.riOf(a) + C.W;
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

/** One floor's street: garden beds along the wall, flagstone paths to each door, the plaza's paving with a rosette, the road and its kerb. */
function floorTop(plan, f, look) {
  const { rows, params } = bandGrid(plan, f.phiS, f.phiE, ACROSS, () => f.y);
  const grass = new THREE.Color(look.grass), dark = new THREE.Color(look.grassDark);
  const kerb = new THREE.Color('#d2c6b0'), plazaC = [new THREE.Color('#fbf5e8'), new THREE.Color('#efe5d0')], rosette = new THREE.Color(look.banner);
  const flower = look.flowers.map((x) => new THREE.Color(x));
  const PL = C.placeLine;
  const ms = f.plinths.find((p) => p.subject === 'math'), ps = f.plinths.find((p) => p.subject === 'physics');
  const phiOf = (x, z) => plan.onBand(x, z)?.phi ?? 0;
  const plazaA = phiOf(ms.x, ms.z) - 4.2 / (f.ri + PL), plazaB = phiOf(ps.x, ps.z) + 4.2 / (f.ri + PL);
  const spurs = [...f.places, { ...f.portal, kind: 'portal' }, ...(f.worldGate ? [{ ...f.worldGate, kind: 'worlds' }] : [])].map((p) => ({ phi: phiOf(p.x, p.z), from: plan.onBand(p.x, p.z)?.across ?? 6 }));
  const geo = gridMesh(rows, (c, p, q, s, [phi, o]) => {
    const { mx, mz } = facet(p, q, s);
    const n = noise(mx * 0.35, mz * 0.35);
    const ri = plan.riOf(phi), arc = phi * (ri + o);
    const sd = Math.hypot(mx - f.spawn.x, mz - f.spawn.z);
    if (sd < 2.6) {
      c.copy(sd < 0.6 || (sd > 1.9 && sd < 2.3) ? rosette : plazaC[Math.floor(Math.atan2(mx - f.spawn.x, mz - f.spawn.z) * 2.5 + 10) & 1]);
      return;
    }
    if (o >= C.road) {
      const t = (Math.floor(arc / 1.4 + (Math.floor((o - C.road) / 1.1) & 1) * 0.5) + Math.floor((o - C.road) / 1.1)) & 1;
      c.copy(PAVE[t]).offsetHSL(0, 0, n * 0.02);
      if (o < C.road + 0.35) c.copy(kerb);
      return;
    }
    c.copy(n > 0.15 ? dark : grass).offsetHSL(0, 0, n * 0.03);
    if (noise(mx * 1.7, mz * 1.7) > 0.55 && o < 3) c.copy(flower[Math.floor((mx * 7 + mz * 3) & 0xff) % flower.length]);
    if (phi > plazaA && phi < plazaB && o > 8.2) c.copy(plazaC[(Math.floor(arc / 1.2) + Math.floor(o / 1.2)) & 1]);
    else if (spurs.some((sp) => Math.abs(phi - sp.phi) * (ri + o) < 1.05 && o > sp.from)) c.copy(PAVE[0]).offsetHSL(0, 0, n * 0.02);
  }, { params });
  return toonMesh(geo, `castle-floor-${f.n}`);
}

/** A ramp: the whole width of the street, a storey up, in broad stone steps, a red carpet with gold edges up the middle. */
function rampTop(plan, s) {
  const { rows, params } = bandGrid(plan, s.pa, s.pb, ACROSS, (phi) => plan.bandY(phi));
  const A = new THREE.Color('#f3ebdb'), B = new THREE.Color('#ddd2bd'), edge = new THREE.Color('#cbbfa7');
  const red = new THREE.Color('#c8413c'), gold = new THREE.Color('#f2c14e');
  const geo = gridMesh(rows, (c, p, q, s2, [phi, o]) => {
    const t = (phi - s.pa) / (s.pb - s.pa);
    c.copy(Math.floor(t * 22) & 1 ? A : B);
    const mid = Math.abs(o - C.W / 2 - 0.5);
    if (mid < 1.5) c.copy(red);
    else if (mid < 1.85) c.copy(gold);
    if (o < 0.45 || o > C.W - 0.45) c.copy(edge);
  }, { params });
  return toonMesh(geo, `castle-ramp-${s.from}`);
}

/* ---------------------------------------------------------------- parapets, lanterns, hedges */

/** A crenellated parapet along the street's edge from φ a to φ b; a lantern on every few merlons. */
function parapet(P, lamps, plan, a, b, o = C.W - 0.45, every = 6) {
  const outer = plan.riOf(a) + o;
  const n = Math.max(1, Math.round(((b - a) * outer) / 1.15));
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const phi = a + ((b - a) * i) / n, p = plan.pt(phi, o), y = plan.bandY(phi), yaw = plan.thetaOf(phi);
    if (prev) {
      bar(P, STONE.white, [prev.x, prev.y + 0.42, prev.z], [p.x, y + 0.42, p.z], 0.62, 0.9);
      bar(P, STONE.cream, [prev.x, prev.y + 0.92, prev.z], [p.x, y + 0.92, p.z], 0.72, 0.12);
    }
    if (i % 2 === 0) {
      P.put(STONE.white, new THREE.BoxGeometry(0.55, 0.42, 0.62), Mx(p.x, y + 1.18, p.z, yaw));
      if (i % every === 0 && i > 0 && i < n) {
        P.put(STONE.darkWood, new THREE.BoxGeometry(0.08, 0.5, 0.08), Mx(p.x, y + 1.6, p.z, yaw));
        lamps.put(lampMat, new THREE.BoxGeometry(0.26, 0.3, 0.26), Mx(p.x, y + 1.98, p.z, yaw));
        P.put(STONE.tealDark, new THREE.ConeGeometry(0.24, 0.3, 4), Mx(p.x, y + 2.28, p.z, yaw + Math.PI / 4));
      }
    }
    prev = { x: p.x, y, z: p.z };
  }
}
/** A parapet straight across the street (at its two ends). */
function endParapet(P, plan, phi, y) {
  const a = plan.pt(phi, 0.3), b = plan.pt(phi, C.W - 0.2);
  bar(P, STONE.white, [a.x, y + 0.45, a.z], [b.x, y + 0.45, b.z], 0.62, 0.9);
  bar(P, STONE.cream, [a.x, y + 0.95, a.z], [b.x, y + 0.95, b.z], 0.72, 0.12);
}

/** A round little tree: a trunk and a cloud of leaf balls (sometimes in blossom). */
function tree(P, x, y, z, s, r, blossom = false) {
  P.put(STONE.wood, new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.4 * s, 6), Mx(x, y + 0.7 * s, z));
  const greens = blossom ? ['#ffc2d6', '#ffb0c8', '#fff0f4'] : ['#6cc35a', '#5aa84f', '#7fd068'];
  for (let k = 0; k < 4; k++) {
    const a = r() * TAU;
    P.put(greens[k % 3], new THREE.IcosahedronGeometry((0.65 + r() * 0.3) * s, 1), Mx(x + Math.sin(a) * 0.45 * s, y + (1.65 + r() * 0.5) * s, z + Math.cos(a) * 0.45 * s, r() * 3, 1));
  }
}

/** Ivy falling down a wall from (sx, cz)·ro at height y: leafy clumps, smaller further down. */
function ivyFall(P, r, sx, cz, t, ro, y, len) {
  const greens = ['#5aa84f', '#4f9a48', '#6cc35a', '#3f8a45'];
  const n = Math.max(2, Math.round(len / 0.45));
  const tx = Math.cos(t), tz = -Math.sin(t);
  let drift = 0;
  for (let i = 0; i < n; i++) {
    const k = i / n, s = 0.42 * (1 - k * 0.6) * (0.8 + r() * 0.4);
    drift += (r() - 0.5) * 0.25;
    P.put(greens[Math.floor(r() * 4)], new THREE.IcosahedronGeometry(s, 0), Mx(sx * ro + tx * drift, y - i * 0.45, cz * ro + tz * drift, r() * 3, 1, r()));
    if (r() < 0.5) P.put(greens[Math.floor(r() * 4)], new THREE.IcosahedronGeometry(s * 0.7, 0), Mx(sx * ro + tx * (drift + 0.4), y - i * 0.45 - 0.2, cz * ro + tz * (drift + 0.4), r() * 3, 1, r()));
  }
}

/** Windows, doors and little balconies of the houses built into the retaining walls (the windows glow at night). */
function wallHouses(plan, floors) {
  const g = new THREE.Group();
  const P = parts();
  const r = seeded(1717);
  const { PHI } = plan;
  for (let phi = 0.15; phi < PHI - 0.1;) {
    const ri = plan.riOf(phi), t = plan.thetaOf(phi), sx = Math.sin(t), cz = Math.cos(t);
    const y0 = plan.bandY(phi), top = phi + TAU <= PHI ? plan.bandY(phi + TAU) : plan.keepY;
    const hgt = top - y0;
    const ro = ri + 0.04;
    const at = (h, out = 0) => {
      const m = new THREE.Object3D();
      m.position.set(sx * (ro + out), y0 + h, cz * (ro + out));
      m.rotation.y = t;
      m.updateMatrix();
      return m.matrix.clone();
    };
    const kind = r();
    if (hgt > 3.5 && kind > 0.8) {
      // A pilaster: a flat buttress of stone up the wall, a cap at the top.
      P.put(STONE.white, new THREE.BoxGeometry(0.7, hgt + 0.4, 0.4), at(hgt / 2 - 0.2, 0.18));
      P.put(STONE.cream, new THREE.BoxGeometry(0.9, 0.25, 0.55), at(hgt - 0.1, 0.25));
    } else if (hgt > 3.5 && kind < 0.8) {
      // An arched window high in the wall, a stone frame, sometimes a flower box or a balcony.
      const h = Math.min(hgt - 1.4, 3.2 + r() * 1.6), w = 0.55 + r() * 0.2, wh = 0.9 + r() * 0.3;
      P.put(windowMat, new THREE.PlaneGeometry(w, wh), at(h));
      P.put(windowMat, new THREE.CircleGeometry(w / 2, 10, 0, Math.PI), at(h + wh / 2));
      P.put(STONE.shade, new THREE.BoxGeometry(w + 0.3, 0.12, 0.25), at(h - wh / 2 - 0.05, 0.1));
      P.put(STONE.cream, new THREE.TorusGeometry(w / 2 + 0.06, 0.07, 4, 10, Math.PI), at(h + wh / 2, 0.03));
      const extra = r();
      if (extra < 0.35) {
        P.put(STONE.wood, new THREE.BoxGeometry(w + 0.25, 0.2, 0.3), at(h - wh / 2 - 0.2, 0.18));
        for (let k = 0; k < 4; k++) P.put(['#ff8fa3', '#ffd166', '#ffffff', '#c39bff'][k], new THREE.IcosahedronGeometry(0.1, 0), at(h - wh / 2 - 0.05, 0.25 + (k % 2) * 0.05).multiply(new THREE.Matrix4().makeTranslation(-w / 2 + 0.1 + k * (w / 3.4), 0, 0)));
      } else if (extra < 0.5) {
        P.put(STONE.white, new THREE.BoxGeometry(w + 0.9, 0.16, 0.8), at(h - wh / 2 - 0.12, 0.4));
        for (let k = 0; k < 5; k++) P.put(STONE.white, new THREE.CylinderGeometry(0.04, 0.04, 0.55, 5), at(h - wh / 2 + 0.2, 0.75).multiply(new THREE.Matrix4().makeTranslation(-(w + 0.8) / 2 + k * ((w + 0.8) / 4), 0, 0)));
        P.put(STONE.white, new THREE.BoxGeometry(w + 0.9, 0.08, 0.08), at(h - wh / 2 + 0.48, 0.78));
      } else if (extra < 0.62 && floors) {
        const look = floors[Math.min(floors.length - 1, Math.max(0, plan.segAt(phi).floor ? plan.segAt(phi).floor - 1 : 0))].look;
        const bn = new THREE.Shape();
        bn.moveTo(-0.3, 0);
        bn.lineTo(0.3, 0);
        bn.lineTo(0.3, -1.2);
        bn.lineTo(0, -0.95);
        bn.lineTo(-0.3, -1.2);
        P.put(mat(look.banner, { side: THREE.DoubleSide }), new THREE.ShapeGeometry(bn), at(h + wh / 2 + 0.5, 0.06).multiply(new THREE.Matrix4().makeTranslation(w / 2 + 0.6, 0, 0)));
      }
    }
    phi += (1.8 + r() * 2.4) / ri;
  }
  P.build(g);
  return g;
}

/** The tops of the retaining walls: a planted wall-walk of hedges, flowers and little trees; ivy spilling down the face. */
function wallGardens(plan) {
  const g = new THREE.Group();
  const P = parts();
  const r = seeded(61);
  const { PHI } = plan;
  const flowers = ['#ffd166', '#ff8fa3', '#ffffff', '#c39bff', '#ff9f4a'];
  for (let phi = 0.05; phi < PHI - TAU - 0.02;) {
    const ri = plan.riOf(phi), mid = ri - C.gap / 2;
    const y = plan.bandY(phi + TAU) + plan.WALK_UP;
    const t = plan.thetaOf(phi), sx = Math.sin(t), cz = Math.cos(t);
    const kind = r();
    if (kind < 0.62) P.put(r() < 0.5 ? '#5aa84f' : '#4f9a48', new THREE.BoxGeometry(1.25, 0.6 + r() * 0.3, 1.1), Mx(sx * mid, y + 0.3, cz * mid, t));
    else if (kind < 0.8) tree(P, sx * mid, y, cz * mid, 0.8 + r() * 0.35, r, r() < 0.25);
    else for (let k = 0; k < 5; k++) P.put(flowers[Math.floor(r() * flowers.length)], new THREE.IcosahedronGeometry(0.14, 0), Mx(sx * (mid + (r() - 0.5) * 1.6), y + 0.12, cz * (mid + (r() - 0.5) * 1.6)));
    // Ivy spilling over the wall's face below: a cascade of leafy clumps.
    if (r() < 0.4) ivyFall(P, r, sx, cz, t, ri + 0.12, y, 1.2 + r() * 3.4);
    phi += (1.0 + r() * 0.7) / ri;
  }
  // The town wall's foot: hedges and flowers along the meadow.
  for (let phi = 0.05; phi < TAU - 0.05;) {
    const ro = plan.riOf(phi) + C.W + 0.7, t = plan.thetaOf(phi), x = Math.sin(t) * ro, z = Math.cos(t) * ro, y = plan.meadow(x, z);
    if (r() < 0.6) P.put('#4f9a48', new THREE.BoxGeometry(1.2, 0.7, 0.9), Mx(x, y + 0.3, z, t));
    else for (let k = 0; k < 4; k++) P.put(flowers[Math.floor(r() * flowers.length)], new THREE.IcosahedronGeometry(0.16, 0), Mx(x + (r() - 0.5), y + 0.12, z + (r() - 0.5)));
    if (r() < 0.3) ivyFall(P, r, Math.sin(t), Math.cos(t), t, plan.riOf(phi) + C.W + 0.12, plan.bandY(phi) - 0.2, 1.2 + r() * 2.5);
    phi += (1.1 + r() * 0.8) / ro;
  }
  P.build(g);
  return g;
}

/* ---------------------------------------------------------------- towers */

/** A turret for the skyline: a round white tower, a crenellated crown, windows, a teal conical roof and a gold finial (merged). */
function turret(P, x, y0, z, r, h, roof, facing, rnd) {
  P.put(STONE.white, new THREE.CylinderGeometry(r, r * 1.05, h, 16), Mx(x, y0 + h / 2, z));
  P.put(STONE.cream, new THREE.CylinderGeometry(r * 1.18, r * 1.02, 0.4, 16), Mx(x, y0 + h + 0.1, z));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    P.put(STONE.white, new THREE.BoxGeometry(0.34, 0.34, 0.3), Mx(x + Math.sin(a) * r * 1.1, y0 + h + 0.45, z + Math.cos(a) * r * 1.1, a));
  }
  const rh = r * (2.2 + rnd() * 1.4);
  const prof = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    prof.push(new THREE.Vector2(Math.max(0.001, r * 1.25 * (1 - t) ** 1.3), t * rh));
  }
  P.put(roof, new THREE.LatheGeometry(prof, 14), Mx(x, y0 + h + 0.3, z));
  P.put(STONE.gold, new THREE.SphereGeometry(Math.max(0.12, r * 0.13), 8, 6), Mx(x, y0 + h + 0.35 + rh, z));
  P.put(STONE.gold, new THREE.ConeGeometry(0.05, 0.6, 5), Mx(x, y0 + h + 0.7 + rh, z));
  // Windows on the side that faces out (glow at night).
  for (const k of [0.45, 0.75]) {
    if (h * k < 2) continue;
    const a = facing + (k - 0.6) * 1.2;
    const m = new THREE.Object3D();
    m.position.set(x + Math.sin(a) * (r + 0.02), y0 + h * k, z + Math.cos(a) * (r + 0.02));
    m.rotation.y = a;
    m.updateMatrix();
    P.put(windowMat, new THREE.PlaneGeometry(r * 0.38, r * 0.7), m.matrix.clone());
  }
  return y0 + h + rh;
}
/** A round bastion in a wall: a drum up to just above the street behind it, a crenellated top (it never hides the street from the camera). */
function bastion(P, x, y0, z, r, h, pennant) {
  P.put(STONE.white, new THREE.CylinderGeometry(r, r * 1.06, h, 16), Mx(x, y0 + h / 2, z));
  P.put(STONE.cream, new THREE.CylinderGeometry(r * 1.14, r * 1.0, 0.36, 16), Mx(x, y0 + h + 0.05, z));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    P.put(STONE.white, new THREE.BoxGeometry(0.36, 0.38, 0.3), Mx(x + Math.sin(a) * r * 1.08, y0 + h + 0.42, z + Math.cos(a) * r * 1.08, a));
  }
  P.put(STONE.darkWood, new THREE.CylinderGeometry(0.04, 0.05, 2.0, 5), Mx(x, y0 + h + 1.1, z));
  P.put(mat(pennant, { side: THREE.DoubleSide }), new THREE.ConeGeometry(0.22, 0.9, 3).rotateZ(-Math.PI / 2), Mx(x + 0.45, y0 + h + 1.85, z));
}
/**
 * Turrets rising from the retaining walls all the way up, and on the town wall: the white-and-teal skyline.
 * In front of a street's buildings they are low round bastions (the follow camera looks over them at the
 * street); tall spired turrets stand in front of the ramps and the streets' ends.
 */
function skyline(plan, floors) {
  const g = new THREE.Group();
  const P = parts();
  const r = seeded(808);
  const { PHI } = plan;
  const roofs = ['#2fb3a6', '#3cc4c0', '#26a29a', '#4fc9c0', '#2f9fb8'];
  const gates = plan.stairs.map((s) => s.pa);
  const nearGate = (phi, rad) => gates.some((pa) => Math.min(Math.abs(phi - pa), Math.abs(phi + TAU - pa)) * rad < 7.5);
  // A street's buildings stand between its start and end, a little in from each: there, keep the view open.
  const open = (phi) => {
    const seg = plan.segAt(phi);
    if (!seg.floor || phi < 0 || phi > PHI) return false;
    const f = plan.floors[seg.floor - 1], rad = plan.riOf(phi) + C.W;
    return (phi - f.phiS) * rad > 4 && (f.phiE - phi) * rad > 5;
  };
  const pennant = (phi) => floors[Math.max(0, (plan.segAt(phi).floor ?? 1) - 1)]?.look.banner ?? '#e0574f';
  // On the walls between the turns: from the lower street, up past the higher one.
  for (let phi = 0.25; phi < PHI - TAU - 0.05;) {
    const ri = plan.riOf(phi);
    if (!nearGate(phi, ri)) {
      const mid = ri - C.gap / 2, t = plan.thetaOf(phi);
      const lo = plan.bandY(phi) - 0.3, hi = plan.bandY(phi + TAU) + plan.WALK_UP;
      if (open(phi + TAU)) bastion(P, Math.sin(t) * mid, lo, Math.cos(t) * mid, 1.15, hi - lo + 0.5, pennant(phi + TAU));
      else {
        const tall = r() < 0.5;
        const h = hi - lo + 3 + r() * 4 + (tall ? 5 + r() * 7 : 0);
        turret(P, Math.sin(t) * mid, lo, Math.cos(t) * mid, tall ? 0.95 : 1.05 + r() * 0.15, h, roofs[Math.floor(r() * roofs.length)], t, r);
      }
    }
    phi += (open(phi + TAU) ? 12 + r() * 8 : 6 + r() * 3) / ri;
  }
  // Round the keep's courtyard on the summit: a ring of spired towers and little teal-roofed halls, the crown of the skyline.
  for (let a = 0; a < TAU; a += 0.3 + r() * 0.2) {
    const bands = plan.bandsAt(a), b = bands.at(-1);
    const d = b.ri - 1.8 - r() * 1.5;
    if (d < 10.5) continue;
    const x = Math.sin(a) * d, z = Math.cos(a) * d, y = plan.keepY;
    if (r() < 0.6) turret(P, x, y - 0.2, z, 1.0 + r() * 0.4, 7 + r() * 11, roofs[Math.floor(r() * roofs.length)], a, r);
    else {
      P.put(STONE.white, new THREE.BoxGeometry(3.2, 3.6, 2.6), Mx(x, y + 1.8, z, a));
      P.put(roofs[Math.floor(r() * roofs.length)], gable(3.6, 3.0, 1.8), Mx(x, y + 3.6, z, a));
      P.put(STONE.white, gable(3.18, 2.58, 1.5), Mx(x, y + 3.6, z, a));
      const m = new THREE.Object3D();
      m.position.set(x + Math.sin(a) * 1.31, y + 2.2, z + Math.cos(a) * 1.31);
      m.rotation.y = a;
      m.updateMatrix();
      P.put(windowMat, new THREE.PlaneGeometry(0.6, 0.9), m.matrix.clone());
    }
  }
  // On the town wall, from the meadow.
  for (let phi = 0.12; phi < TAU - 0.1;) {
    const ro = plan.riOf(phi) + C.W;
    if (!nearGate(phi, ro)) {
      const t = plan.thetaOf(phi), d = ro + 0.9, x = Math.sin(t) * d, z = Math.cos(t) * d;
      const lo = plan.meadow(x, z) - 0.5;
      if (open(phi)) bastion(P, x, lo, z, 1.35, plan.bandY(phi) - lo + 0.5, pennant(phi));
      else turret(P, x, lo, z, 1.3 + r() * 0.25, plan.bandY(phi) - lo + 3.2 + r() * 4 + (r() < 0.4 ? 5 : 0), roofs[Math.floor(r() * roofs.length)], t, r);
    }
    phi += (open(phi) ? 14 + r() * 6 : 8 + r() * 4) / ro;
  }
  P.build(g);
  return g;
}

/** The keep on the summit: a great round tower and four slim ones, a ring of halls, banners, a courtyard garden. */
function keep(plan) {
  const g = new THREE.Group();
  const y = plan.keepY;
  const fa = Math.atan2(plan.start.x, plan.start.z);
  // The great round tower, a ring of corbels half-way, a slim belfry stage and a tall spire.
  roundTower(g, [0, y, 0], 3.7, 17, '#2fb3a6', { windows: 3, facing: fa, roofH: 0.01 });
  add(g, cyl(4.0, 3.75, 0.5, 20), mat(STONE.cream), [0, y + 9, 0]);
  roundTower(g, [0, y + 17.4, 0], 2.4, 7, '#2fb3a6', { windows: 3, facing: fa, roofH: 12 });
  // Slimmer, taller towers beside it, for the crown of the skyline.
  roundTower(g, [Math.sin(fa + 2.6) * 3.4, y, Math.cos(fa + 2.6) * 3.4], 1.5, 27, '#3cc4c0', { windows: 3, facing: fa, roofH: 6.5 });
  roundTower(g, [Math.sin(fa - 2.2) * 3.6, y, Math.cos(fa - 2.2) * 3.6], 1.3, 22, '#4fc9c0', { windows: 2, facing: fa, roofH: 5.5 });
  for (let i = 0; i < 4; i++) {
    const a = fa + 0.4 + (i / 4) * TAU, d = 7.2;
    roundTower(g, [Math.sin(a) * d, y, Math.cos(a) * d], 1.35 + (i % 2) * 0.25, 11 + (i % 2) * 5, i % 2 ? '#26a29a' : '#4fc9c0', { windows: 2, facing: a, roofH: 4.8 });
    const b = a + TAU / 8, hd = 5.6;
    const hall = new THREE.Group();
    hall.position.set(Math.sin(b) * hd, y, Math.cos(b) * hd);
    hall.rotation.y = b;
    add(hall, box(4.6, 5.2, 2.6), mat(STONE.white), [0, 2.6, 0]);
    add(hall, gable(5.0, 3.0, 1.6), mat('#2fb3a6'), [0, 5.2, 0]);
    for (const sx of [-1.2, 0, 1.2]) archWindow(hall, [sx, 3.2, 1.31], 0, 0.5, 1.0, { glassM: i % 2 ? windowMat : glassMat() });
    g.add(hall);
  }
  for (let i = 0; i < 6; i++) {
    const a = fa + (i / 6) * TAU + 0.3;
    banner(g, [Math.sin(a) * 3.72, y + 15.5, Math.cos(a) * 3.72], a, ['#3a6fd0', '#e0574f', '#f2c14e'][i % 3], 0.9, 3.4);
  }
  // A great door facing the arrival side.
  add(g, box(2.0, 3.0, 0.4), mat(STONE.darkWood), [Math.sin(fa) * 3.6, y + 1.5, Math.cos(fa) * 3.6], [0, fa, 0]);
  batch(g);
  return g;
}

/* ---------------------------------------------------------------- the meadow outside the walls */

function meadowLife(plan, streams) {
  const g = new THREE.Group();
  const P = parts();
  const r = seeded(4040);
  const flowers = ['#ffd166', '#ff8fa3', '#ffffff', '#c39bff', '#ff9f4a', '#7cc6ff'];
  const inStream = (x, z) => streams.some((s) => {
    const a = Math.atan2(x, z), d = Math.abs(Math.atan2(Math.sin(a - s.a), Math.cos(a - s.a))) * Math.hypot(x, z);
    return d < 4;
  });
  const free = (x, z) => {
    const a = Math.atan2(x, z), rr = Math.hypot(x, z), o = plan.bandsAt(a)[0];
    return rr > o.ro + 3.4 && rr < plan.lipR(a) - 2.2 && !inStream(x, z);
  };
  for (let i = 0; i < 2600; i++) {
    const a = r() * TAU, d = plan.footR - 18 + r() * 36;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (!free(x, z)) continue;
    const y = plan.meadow(x, z);
    const k = r();
    if (k < 0.06) tree(P, x, y, z, 1.1 + r() * 0.6, r, r() < 0.3);
    else if (k < 0.5) P.put(flowers[Math.floor(r() * flowers.length)], new THREE.IcosahedronGeometry(0.13 + r() * 0.08, 0), Mx(x, y + 0.12, z));
    else if (k < 0.56) P.put('#5aa84f', new THREE.IcosahedronGeometry(0.5 + r() * 0.4, 1), Mx(x, y + 0.2, z, r() * 3, 1));
  }
  // Cottages of the lower town: white walls, teal or coral roofs, a chimney, a glowing window.
  const roofs = ['#2fb3a6', '#ff8a6b', '#3cc4c0', '#e0a03a'];
  let made = 0;
  for (let tries = 0; tries < 900 && made < 22; tries++) {
    const a = r() * TAU, d = plan.footR + 2 + r() * 10;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (!free(x, z) || !free(x + 2.2, z) || !free(x - 2.2, z) || !free(x, z + 2.2) || !free(x, z - 2.2)) continue;
    const y = plan.meadow(x, z), yaw = a;
    P.put(STONE.white, new THREE.BoxGeometry(3.0, 2.2, 2.4), Mx(x, y + 1.0, z, yaw));
    const roof = gable(3.5, 2.9, 1.5);
    P.put(roofs[made % roofs.length], roof, Mx(x, y + 2.1, z, yaw));
    P.put(STONE.white, gable(2.98, 2.38, 1.3), Mx(x, y + 2.1, z, yaw));
    P.put(STONE.shade, new THREE.BoxGeometry(0.4, 1.2, 0.4), Mx(x + Math.cos(yaw) * 0.9, y + 3.2, z - Math.sin(yaw) * 0.9, yaw));
    const m = new THREE.Object3D();
    m.position.set(x + Math.sin(yaw) * 1.21, y + 1.3, z + Math.cos(yaw) * 1.21);
    m.rotation.y = yaw;
    m.updateMatrix();
    P.put(windowMat, new THREE.PlaneGeometry(0.6, 0.6), m.matrix.clone());
    made++;
  }
  P.build(g);
  return g;
}

/* ---------------------------------------------------------------- the underside */

/** The island's underside: layered blue-grey stone ledges, mossy on top, tapering to a point. */
function underside(plan) {
  const SEG = 160;
  const rows = [];
  const lip = (a) => plan.lipR(a);
  const top = (a) => {
    const L = lip(a);
    return plan.meadow(Math.sin(a) * L * 0.999, Math.cos(a) * L * 0.999);
  };
  // Subdivide the profile so the ledges can be lumpy.
  const prof = [];
  for (let i = 0; i < UNDER.length - 1; i++) {
    const [f0, d0] = UNDER[i], [f1, d1] = UNDER[i + 1];
    const n = i === UNDER.length - 2 ? 1 : 2;
    for (let k = 0; k < n; k++) prof.push([f0 + ((f1 - f0) * k) / n, d0 + ((d1 - d0) * k) / n]);
  }
  prof.push([0, C.depth]);
  for (const [f, d] of prof) {
    const row = [];
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * TAU;
      // Lumpy, but never out past the rim (seen from above, nothing pokes out under the meadow's edge).
      const wob = f < 0.999 ? Math.min(0.995 / Math.max(f, 1e-3), 1 - Math.abs(fbm(Math.sin(a) * 1.6 + d * 0.03, Math.cos(a) * 1.6 + d * 0.03)) * 0.12) : 1;
      const rr = lip(a) * f * wob;
      const y = top(a) - d * (1 + noise(a * 3, d * 0.1) * 0.03) - (f < 0.999 ? Math.max(0, noise(a * 4 + d, d * 0.3)) * 0.5 : 0);
      row.push([Math.sin(a) * rr, y, Math.cos(a) * rr]);
    }
    rows.push(row);
  }
  // Close the tip.
  const tipY = rows.at(-1)[0][1];
  rows[rows.length - 1] = rows.at(-1).map(() => [0, tipY - 6, 0]);
  const BANDS = ['#7f92ad', '#90a2bb', '#71849f', '#9cadc3', '#8395b0', '#95a7be'].map((c) => new THREE.Color(c));
  const mossA = new THREE.Color('#7fae5c'), mossB = new THREE.Color('#6a9c55'), dirt = new THREE.Color('#9a8a70'), turf = new THREE.Color('#7fc460');
  const geo = gridMesh(rows, (c, p, q, s) => {
    const { mx, my, mz } = facet(p, q, s);
    const n = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]).cross(new THREE.Vector3(s[0] - p[0], s[1] - p[1], s[2] - p[2])).normalize();
    const depth = C.meadowY - my;
    c.copy(BANDS[Math.floor((my + 400 + fbm(mx * 0.05, mz * 0.05) * 2) / 3.2) % BANDS.length]).offsetHSL(0, 0, noise(mx * 0.3, mz * 0.3) * 0.03);
    if (depth < 1.2) c.copy(turf);
    else if (depth < 3.5) c.lerp(dirt, 0.6);
    // Moss: on the ledges' tops near the rim, patches further down.
    const up = Math.abs(n.y);
    const mossy = (up > 0.6 ? 0.75 : 0.1) * (1 - smooth(8, 45, depth)) + Math.max(0, noise(mx * 0.12, my * 0.18 + mz * 0.12) - 0.2) * 0.9 * (1 - smooth(25, 90, depth));
    if (mossy > 0.4 && depth >= 1.2) c.lerp(noise(mx, mz) > 0 ? mossA : mossB, Math.min(0.85, (mossy - 0.4) * 2.5));
  }, { closed: true });
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp(), side: THREE.DoubleSide }));
  m.name = 'castle-underside';
  m.receiveShadow = true;
  return { mesh: m, rows };
}

/** Vines and roots hanging from the underside's ledges, and leafy tufts. */
function hangings(plan, rows) {
  const g = new THREE.Group();
  const P = parts();
  const r = seeded(2121);
  const vine = ['#5f9a4c', '#4f8a45', '#6fae58'], root = ['#5a4a3a', '#6a5644', '#4f4034'];
  const n = rows[0].length;
  for (let i = 1; i < rows.length - 4; i++) {
    for (let j = 0; j < n; j++) {
      if (r() > 0.13 - i * 0.006) continue;
      const [x, y, z] = rows[i][j];
      const isRoot = r() < 0.12 + i * 0.02;
      const len = (isRoot ? 3 : 2.5) + r() * (isRoot ? 9 : 9) * (1 - i / rows.length);
      const k = 0.97;
      if (isRoot) {
        // A root: a thin, wandering line of bark.
        const w = 0.12 + r() * 0.12;
        const pts = [new THREE.Vector3(x * k, y + 0.3, z * k)];
        for (let q = 1; q <= 3; q++) pts.push(new THREE.Vector3(x * k + (r() - 0.5) * 1.2, y - (len * q) / 3, z * k + (r() - 0.5) * 1.2));
        const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, w, 4, false);
        P.put(root[Math.floor(r() * 3)], tube, new THREE.Matrix4());
      } else {
        // A vine: a thin stem dotted with leafy clumps, thinning to its tip.
        P.put(vine[Math.floor(r() * 3)], new THREE.CylinderGeometry(0.04, 0.07, len, 4), Mx(x * k, y - len / 2, z * k));
        for (let q = 0.15; q < 1; q += 0.22 + r() * 0.12) P.put(vine[Math.floor(r() * 3)], new THREE.IcosahedronGeometry((0.5 - q * 0.3) * (0.7 + r() * 0.5), 0), Mx(x * k + (r() - 0.5) * 0.3, y - len * q, z * k + (r() - 0.5) * 0.3, r() * 3, 1, r()));
      }
    }
  }
  P.build(g);
  for (const m of g.children) m.castShadow = false;
  return g;
}

/* ---------------------------------------------------------------- water */

function fallMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; uniform float uNight; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = vec2(vUv.x * 9.0, vUv.y * 26.0 + uTime * 3.2);
        float s = n(p) * 0.6 + n(p * vec2(2.0, 0.6) + 3.0) * 0.4;
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        float fade = smoothstep(0.0, 0.05, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
        vec3 day = mix(vec3(0.62, 0.84, 0.98), vec3(1.0), smoothstep(0.35, 0.8, s));
        vec3 c = mix(day, day * vec3(0.35, 0.45, 0.75), uNight);
        gl_FragColor = vec4(c, (0.72 + s * 0.28) * edge * fade);
        #include <colorspace_fragment>
      }`
  });
}
/** The waterfalls' spray (dimmed at night). */
const mists = [];
/** A waterfall pouring off the rim at angle a: a stream across the meadow, then a ribbon falling into the clouds, spray at the lip. */
function waterfall(plan, s, fm) {
  const g = new THREE.Group();
  const a = s.a, sx = Math.sin(a), cz = Math.cos(a);
  const L = plan.lipR(a), o = plan.bandsAt(a)[0];
  const y0 = plan.meadow(sx * (L - 0.5), cz * (L - 0.5));
  // The stream from the town wall's foot to the rim.
  const bed = new THREE.PlaneGeometry(3.0, L - o.ro - 0.6, 1, 8);
  bed.rotateX(-Math.PI / 2);
  const p = bed.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const d = o.ro + 0.3 + (L - o.ro - 0.6) * (0.5 - p.getZ(i) / (L - o.ro - 0.6));
    const x = p.getX(i);
    p.setXYZ(i, sx * d + cz * x, plan.meadow(sx * d, cz * d) + 0.12, cz * d - sx * x);
  }
  bed.computeVertexNormals();
  const water = mat('#8fdcf6', { rough: 0.2, emissive: '#3fb7e0', ei: 0.2, key: 'castlestream' });
  g.add(new THREE.Mesh(bed, water));
  for (const k of [-1, 1]) for (let d = o.ro + 1; d < L - 1; d += 1.3) add(g, ico(0.3 + ((d * 7) % 3) * 0.08), mat('#b9c3cf'), [sx * d + cz * k * 1.45, plan.meadow(sx * d, cz * d) + 0.12, cz * d - sx * k * 1.45]);
  // A little stone spout in the town wall where the stream starts.
  add(g, box(1.6, 1.0, 0.8), mat(STONE.cream), [sx * (o.ro + 0.2), plan.meadow(sx * o.ro, cz * o.ro) + 0.9, cz * (o.ro + 0.2)], [0, a, 0]);
  // The fall: a ribbon curving out and down, widening as it goes.
  const N = 40, H = s.h;
  const pos = [], uv = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, drop = H * t, outw = 0.8 + Math.sqrt(t) * 8, w = 2.4 + t * 9;
    const d = L - 0.2 + outw;
    for (const u of [0, 1]) {
      const x = (u - 0.5) * w;
      pos.push(sx * d + cz * x, y0 - drop, cz * d - sx * x);
      uv.push(u, t);
    }
  }
  const idx = [];
  for (let i = 0; i < N; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  const fall = new THREE.BufferGeometry();
  fall.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fall.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  fall.setIndex(idx);
  const ribbon = new THREE.Mesh(fall, fm);
  ribbon.renderOrder = 2;
  g.add(ribbon);
  // Spray at the lip, mist where it fades.
  const mist = glowTexture([[0, 'rgba(255,255,255,0.85)'], [0.5, 'rgba(235,245,255,0.35)'], [1, 'rgba(235,245,255,0)']]);
  for (const [k, sc] of [[0.02, 6], [0.5, 18], [0.75, 30]]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mist, depthWrite: false, transparent: true, opacity: k > 0.4 ? 0.55 : 0.8 }));
    sp.material.userData.day = sp.material.opacity;
    mists.push(sp.material);
    const d = L + 0.6 + Math.sqrt(k) * 7;
    sp.position.set(sx * d, y0 - H * k, cz * d);
    sp.scale.setScalar(sc);
    g.add(sp);
  }
  return g;
}

/* ---------------------------------------------------------------- the sky: clouds, islets */

/** Big soft cumulus: clusters of puffs, bright on top, a cool blue in their shadows. */
function clouds(plan) {
  const g = new THREE.Group();
  const m = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: toonRamp(), emissive: new THREE.Color('#a9c8ee'), emissiveIntensity: 0.42 });
  m.userData.noCut = true;
  const r = seeded(321);
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const cluster = (cx, cy, cz, size, flat = 1) => {
    const list = [];
    const n = 9 + Math.floor(r() * 8);
    for (let k = 0; k < n; k++) {
      const s = size * (0.45 + r() * 0.55) * (k < 3 ? 1.25 : 1);
      const dx = (r() - 0.5) * size * 3.4, dz = (r() - 0.5) * size * 2.2;
      const dy = Math.max(0, size * 0.75 - Math.hypot(dx, dz) * 0.28) * r() + (k < 3 ? size * 0.35 : 0);
      const p = geo.clone();
      p.scale(s, s * 0.82 * flat, s);
      p.translate(cx + dx, cy + dy * flat, cz + dz);
      list.push(p);
    }
    // A flat-ish base so it reads as cumulus.
    const base = geo.clone();
    base.scale(size * 2.1, size * 0.45, size * 1.4);
    base.translate(cx, cy - size * 0.1, cz);
    list.push(base);
    const merged = mergeAll(list);
    const mesh = new THREE.Mesh(merged, m);
    g.add(mesh);
  };
  const fa = Math.atan2(plan.start.x, plan.start.z);
  // Round and below the island, around its tip, and far out at its level.
  for (let i = 0; i < 16; i++) {
    const a = fa + (i / 16) * TAU + r() * 0.3, d = 150 + r() * 220;
    cluster(Math.sin(a) * d, -70 - r() * 90, Math.cos(a) * d, 10 + r() * 9);
  }
  for (let i = 0; i < 6; i++) {
    const a = r() * TAU, d = 55 + r() * 40;
    cluster(Math.sin(a) * d, -110 - r() * 40, Math.cos(a) * d, 7 + r() * 5);
  }
  for (let i = 0; i < 10; i++) {
    const a = fa + 0.8 + (i / 10) * TAU, d = 330 + r() * 260;
    cluster(Math.sin(a) * d, -20 + r() * 110, Math.cos(a) * d, 16 + r() * 14);
  }
  // A few close by, drifting at the town's level (never in front of the arrival view).
  for (const k of [2.0, 3.2, 4.4]) {
    const a = fa + k, d = 120 + r() * 30;
    cluster(Math.sin(a) * d, 6 + r() * 25, Math.cos(a) * d, 8 + r() * 4);
  }
  // The sea of clouds far below, over the land.
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU, d = 240 + r() * 650;
    cluster(Math.sin(a) * d, -175 - r() * 30, Math.cos(a) * d, 22 + r() * 18, 0.55);
  }
  g.userData.material = m;
  return g;
}
function mergeAll(list) {
  let n = 0;
  for (const q of list) n += (q.index ? q.index.count : q.attributes.position.count);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const q0 of list) {
    const q = q0.index ? q0.toNonIndexed() : q0;
    q.computeVertexNormals();
    pos.set(q.attributes.position.array, o * 3);
    nor.set(q.attributes.normal.array, o * 3);
    o += q.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

/** Little floating islets: a grassy top on a stone cone, a tree, a ruin or a tiny tower; the far ones bob. */
function islet(r, size, kind) {
  const g = new THREE.Group();
  const P = parts();
  const prof = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    prof.push(new THREE.Vector2(Math.max(0.001, size * (1 - t) ** 0.8 * (1 + Math.sin(t * 9) * 0.05)), -t * size * 2.3));
  }
  const rock = new THREE.LatheGeometry(prof.reverse(), 12);
  const rp = rock.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const a = Math.atan2(rp.getX(i), rp.getZ(i));
    const k = 1 + Math.sin(a * 5 + size) * 0.06 + Math.sin(a * 11) * 0.03;
    rp.setXYZ(i, rp.getX(i) * k, rp.getY(i), rp.getZ(i) * k);
  }
  P.put('#8d9fb8', rock, Mx(0, 0, 0));
  P.put('#7fc460', new THREE.CylinderGeometry(size * 1.02, size * 0.98, size * 0.25, 12), Mx(0, size * 0.05, 0));
  for (let i = 0; i < 5; i++) {
    const a = r() * TAU;
    P.put('#5f9a4c', new THREE.CylinderGeometry(0.06, 0.2, size * (0.6 + r()), 4), Mx(Math.sin(a) * size * 0.7, -size * 0.6, Math.cos(a) * size * 0.7));
  }
  const y = size * 0.17;
  if (kind === 'tree') tree(P, 0, y, 0, Math.min(1.8, size * 0.4), r, r() < 0.4);
  else if (kind === 'ruin') {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      P.put(STONE.cream, new THREE.CylinderGeometry(size * 0.08, size * 0.09, size * (0.5 + r() * 0.8), 8), Mx(Math.sin(a) * size * 0.5, y + size * 0.4, Math.cos(a) * size * 0.5));
    }
    P.put(STONE.cream, new THREE.BoxGeometry(size * 1.2, size * 0.12, size * 0.25), Mx(0, y + size * 0.95, size * 0.35));
  } else {
    turret(P, 0, y, 0, size * 0.3, size * 1.1, '#3cc4c0', 0, r);
  }
  P.build(g);
  return g;
}
function islets(plan) {
  const g = new THREE.Group();
  const r = seeded(99);
  const fa = Math.atan2(plan.start.x, plan.start.z);
  const list = [];
  // Two tied to the rim with rope bridges (still), the rest far out (they bob).
  const near = [[fa - 0.75, 5, 'tree'], [fa + 0.95, 4.4, 'tower']];
  for (const [a, size, kind] of near) {
    const L = plan.lipR(a), d = L + 14 + size;
    const isle = islet(r, size, kind);
    const y = C.meadowY - 5;
    isle.position.set(Math.sin(a) * d, y, Math.cos(a) * d);
    g.add(isle);
    // The rope bridge: planks sagging between the rim and the islet.
    const P = parts();
    const A = new THREE.Vector3(Math.sin(a) * (L - 0.5), plan.meadow(Math.sin(a) * (L - 1), Math.cos(a) * (L - 1)) + 0.2, Math.cos(a) * (L - 0.5));
    const B = new THREE.Vector3(Math.sin(a) * (d - size * 0.9), y + size * 0.2, Math.cos(a) * (d - size * 0.9));
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = A.clone().lerp(B, t);
      p.y -= Math.sin(t * Math.PI) * 1.6;
      P.put(STONE.wood, new THREE.BoxGeometry(1.5, 0.08, 0.32), Mx(p.x, p.y, p.z, a));
      for (const s of [-1, 1]) if (i % 3 === 0) P.put(STONE.darkWood, new THREE.CylinderGeometry(0.04, 0.04, 0.9, 4), Mx(p.x + Math.cos(a) * s * 0.75, p.y + 0.45, p.z - Math.sin(a) * s * 0.75));
    }
    for (const s of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, p = A.clone().lerp(B, t);
        pts.push(new THREE.Vector3(p.x + Math.cos(a) * s * 0.75, p.y - Math.sin(t * Math.PI) * 1.4 + 0.9, p.z - Math.sin(a) * s * 0.75));
      }
      P.put('#d9c49a', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.04, 4, false), new THREE.Matrix4());
    }
    P.build(g);
  }
  // Placed round the island where they frame it (never behind it as you arrive): [turn from the arrival side, distance, height, size].
  const far = [[0.75, 190, 8, 4.5], [-1.1, 175, -10, 6], [1.35, 230, -28, 7], [-1.55, 240, 18, 3.5], [2.3, 200, -5, 5.5], [-2.4, 215, 10, 4], [3.0, 260, -20, 6.5]];
  for (let i = 0; i < far.length; i++) {
    const [da, d, y, size] = far[i];
    const a = fa + da;
    const isle = islet(r, size, ['tree', 'ruin', 'tower', 'tree'][i % 4]);
    isle.position.set(Math.sin(a) * d, y, Math.cos(a) * d);
    isle.rotation.y = r() * TAU;
    g.add(isle);
    list.push({ isle, y, phase: r() * TAU, amp: 0.6 + r() * 0.8 });
  }
  g.userData.bob = (t) => {
    for (const b of list) b.isle.position.y = b.y + Math.sin(t * 0.35 + b.phase) * b.amp;
  };
  return g;
}

/* ---------------------------------------------------------------- the land far below */

function farLand(plan) {
  const R1 = 1800, RINGS = 70, SEGS = 200;
  const rows = [];
  for (let i = 0; i <= RINGS; i++) {
    const rr = 1 + R1 * (i / RINGS) ** 1.6;
    const row = [];
    for (let j = 0; j < SEGS; j++) {
      const a = (j / SEGS) * TAU + (i % 2) * (Math.PI / SEGS);
      const x = Math.sin(a) * rr, z = Math.cos(a) * rr;
      row.push([x, farGround(x, z), z]);
    }
    rows.push(row);
  }
  const G = ['#8fd06a', '#7cc35e', '#9ad874', '#6fb55a'].map((c) => new THREE.Color(c));
  const forest = new THREE.Color('#4f9a4c'), river = new THREE.Color('#5fb4e8'), mount = new THREE.Color('#6f9a86'), rock = new THREE.Color('#9aa6b0'), snow = new THREE.Color('#f4f7fb');
  const geo = gridMesh(rows, (c, p, q, s) => {
    const { mx, my, mz, steep } = facet(p, q, s);
    c.copy(G[Math.floor((fbm(mx * 0.01, mz * 0.01) + 1) * 2) % 4]);
    if (fbm(mx * 0.012 + 7, mz * 0.012) > 0.22) c.lerp(forest, 0.75);
    if (my - BELOW.y > 70) c.lerp(mount, Math.min(1, (my - BELOW.y - 70) / 60));
    if (steep > 0.6 && my - BELOW.y > 90) c.lerp(rock, 0.5);
    if (my - BELOW.y > 260) c.copy(snow);
    if (my < BELOW.y - 12.5) c.copy(river);
  }, { closed: true });
  const m = toonMesh(geo, 'castle-land');
  m.castShadow = false;
  return m;
}
/** Old stone ruins on the hills below: broken towers, arches and columns, big enough to see from the sky. */
function ruins() {
  const g = new THREE.Group();
  const P = parts();
  const r = seeded(555);
  for (const [x, z, s] of BELOW.ruins) {
    const y = farGround(x, z);
    const k = 6 * s;
    for (let i = 0; i < 5; i++) {
      const a = r() * TAU, d = r() * 3.5 * k;
      const h = k * (1.2 + r() * 3);
      P.put(i % 2 ? '#e8e0cf' : '#d8cfbd', new THREE.BoxGeometry(k * (0.5 + r() * 0.5), h, k * (0.5 + r() * 0.5)), Mx(x + Math.sin(a) * d, y + h / 2 - 1, z + Math.cos(a) * d, r()));
    }
    // An arch.
    for (const sx of [-1, 1]) P.put('#e8e0cf', new THREE.BoxGeometry(k * 0.5, k * 2.2, k * 0.5), Mx(x + sx * k * 1.1, y + k * 1.1 - 1, z + k * 2.5));
    P.put('#e8e0cf', new THREE.BoxGeometry(k * 2.7, k * 0.45, k * 0.5), Mx(x, y + k * 2.3 - 1, z + k * 2.5));
    for (let i = 0; i < 6; i++) P.put('#cfc6b4', new THREE.CylinderGeometry(k * 0.18, k * 0.2, k * (0.6 + r() * 1.6), 8), Mx(x - k * 3 + i * k * 1.2, y + k * 0.6 - 1, z - k * 2.4));
  }
  // Forests: dark green cones on the hills.
  for (let i = 0; i < 700; i++) {
    const a = r() * TAU, d = 120 + r() * 800;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (fbm(x * 0.012 + 7, z * 0.012) < 0.18) continue;
    const y = farGround(x, z), s = 5 + r() * 5;
    if (y < BELOW.y - 10) continue;
    P.put(r() < 0.5 ? '#3f8a45' : '#4f9a4c', new THREE.ConeGeometry(s * 0.5, s * 1.6, 6), Mx(x, y + s * 0.7, z));
  }
  P.build(g);
  for (const m of g.children) m.castShadow = false;
  return g;
}

/* ---------------------------------------------------------------- signs and street life */

/** A signpost by the parapet, its boards facing out (towards the camera): [text, colour] each, top first. */
function signpost(group, P, plan, phi, y, boards, { o = C.W - 1.1, top = null } = {}) {
  const p = plan.pt(phi, o), yaw = plan.thetaOf(phi);
  const h = 1.5 + boards.length * 0.62 + (top ? 0.9 : 0);
  P.put(STONE.wood, new THREE.CylinderGeometry(0.08, 0.1, h, 8), Mx(p.x, y + h / 2, p.z));
  P.put(STONE.gold, new THREE.SphereGeometry(0.12, 8, 6), Mx(p.x, y + h + 0.05, p.z));
  boards.forEach(([text, color], i) => {
    const yy = y + h - (top ? 1.2 : 0.35) - i * 0.62;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.55), new THREE.MeshBasicMaterial({ map: signTexture(text, color), toneMapped: false }));
    m.position.set(p.x + Math.sin(yaw) * 0.09, yy, p.z + Math.cos(yaw) * 0.09);
    m.rotation.y = yaw;
    group.add(m);
    P.put(STONE.darkWood, new THREE.BoxGeometry(1.82, 0.62, 0.08), Mx(p.x, yy, p.z, yaw));
  });
  if (top) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.58, 28), new THREE.MeshBasicMaterial({ map: discTexture(top[0], top[1]), toneMapped: false }));
    disc.position.set(p.x + Math.sin(yaw) * 0.06, y + h - 0.4, p.z + Math.cos(yaw) * 0.06);
    disc.rotation.y = yaw;
    group.add(disc);
    P.put(top[1], new THREE.CylinderGeometry(0.66, 0.66, 0.08, 28), new THREE.Matrix4().compose(new THREE.Vector3(p.x, y + h - 0.4, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, yaw, 0, 'YXZ')), new THREE.Vector3(1, 1, 1)));
  }
}

/** A floor's street life in its free corners: barrels, crates, flower pots, benches, little trees in tubs, banner poles. */
function floorDeco(plan, f, look) {
  const g = new THREE.Group();
  const r = seeded(97 + f.n * 31);
  const P = parts();
  const avoid = [
    ...f.places.map((p) => [p.x, p.z, p.r + 1.2]),
    ...f.places.map((p) => [p.at.x, p.at.z, 1.8]),
    ...[f.portal, f.boss, f.chest, f.chest.rock, f.worldGate, f.spawn].filter(Boolean).map((q) => [q.x, q.z, 2.4]),
    ...[f.portal.at, f.boss.at, f.chest.at].map((q) => [q.x, q.z, 1.6]),
    ...[...f.gemSpots, ...f.toySpots].map(([x, z]) => [x, z, 1.6])
  ];
  const busy = (x, z, pad) => {
    const b = plan.onBand(x, z);
    if (!b || b.phi < f.phiS + 0.02 || b.phi > f.phiE - 0.02) return true;
    if (b.across < 0.6 + pad * 0.3 || b.across > C.road - 0.5) return true;
    return avoid.some(([ax, az, ar]) => Math.hypot(ax - x, az - z) < ar + pad);
  };
  const at = () => {
    const phi = f.phiS + r() * (f.phiE - f.phiS), p = plan.pt(phi, 0.6 + r() * (C.road - 1.2));
    return [p.x, p.z];
  };
  for (let tries = 0, n = 0; tries < 900 && n < 9; tries++) {
    const [x, z] = at();
    if (busy(x, z, 0.8)) continue;
    const y = f.y, ry = r() * TAU, c = Math.cos(ry), s = Math.sin(ry);
    const kind = n % 5;
    if (kind === 0) {
      for (let k = 0; k < 3; k++) P.put(STONE.wood, new THREE.CylinderGeometry(0.34, 0.3, 0.8, 10), Mx(x + (k - 1) * 0.72 * c, y + 0.4, z - (k - 1) * 0.72 * s));
      P.put(STONE.wood, new THREE.CylinderGeometry(0.34, 0.3, 0.8, 10), Mx(x, y + 1.2, z));
      for (let k = 0; k < 3; k++) P.put(STONE.darkWood, new THREE.TorusGeometry(0.33, 0.03, 4, 14).rotateX(Math.PI / 2), Mx(x + (k - 1) * 0.72 * c, y + 0.6, z - (k - 1) * 0.72 * s));
    } else if (kind === 1) {
      P.put(STONE.wood, new THREE.CylinderGeometry(0.45, 0.35, 0.55, 10), Mx(x, y + 0.28, z));
      tree(P, x, y + 0.4, z, 0.75, r, r() < 0.4);
    } else if (kind === 2) {
      P.put(STONE.darkWood, new THREE.CylinderGeometry(0.06, 0.08, 3.4, 6), Mx(x, y + 1.7, z));
      P.put(STONE.gold, new THREE.SphereGeometry(0.1, 8, 6), Mx(x, y + 3.45, z));
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.lineTo(1.1, -0.25);
      sh.lineTo(0, -0.55);
      P.put(mat(look.banner, { side: THREE.DoubleSide }), new THREE.ShapeGeometry(sh), Mx(x + 0.04, y + 3.3, z, ry));
    } else if (kind === 3) {
      P.put(STONE.wood, new THREE.BoxGeometry(1.6, 0.1, 0.45), Mx(x, y + 0.45, z, ry));
      for (const k of [-1, 1]) P.put(STONE.cream, new THREE.BoxGeometry(0.2, 0.45, 0.42), Mx(x + k * 0.65 * c, y + 0.22, z - k * 0.65 * s, ry));
    } else {
      P.put(STONE.wood, new THREE.BoxGeometry(0.7, 0.7, 0.7), Mx(x, y + 0.35, z, ry));
      P.put('#c99a62', new THREE.BoxGeometry(0.55, 0.55, 0.55), Mx(x + c * 0.75, y + 0.28, z - s * 0.75, ry + 0.4));
      for (let k = 0; k < 4; k++) P.put(['#ff6b6b', '#ffd23f', '#7fd068', '#ff9f4a'][k], new THREE.SphereGeometry(0.11, 8, 6), Mx(x + (k - 1.5) * 0.14 * c, y + 0.78, z - (k - 1.5) * 0.14 * s));
    }
    n++;
  }
  // Flower pots along the wall behind the buildings.
  for (let tries = 0, n = 0; tries < 400 && n < 10; tries++) {
    const phi = f.phiS + 0.02 + r() * (f.phiE - f.phiS - 0.04), p = plan.pt(phi, 0.55);
    if (avoid.some(([ax, az, ar]) => Math.hypot(ax - p.x, az - p.z) < ar)) continue;
    P.put('#c97a52', new THREE.CylinderGeometry(0.3, 0.22, 0.45, 8), Mx(p.x, f.y + 0.22, p.z));
    for (let k = 0; k < 4; k++) P.put(look.flowers[k % look.flowers.length], new THREE.IcosahedronGeometry(0.12, 0), Mx(p.x + (r() - 0.5) * 0.3, f.y + 0.5, p.z + (r() - 0.5) * 0.3));
    n++;
  }
  P.build(g);
  return g;
}

/* ---------------------------------------------------------------- the whole Sky Castle */

/**
 * Build the Sky Castle for a plan and the floors' looks.
 * @returns {{ group, walk, tiers, gates, fireflySpots, update(t, night), setNight(k), dust() }}
 */
export function buildCastleWorld(plan, floors) {
  const group = new THREE.Group();
  group.name = 'castle';
  const walk = new THREE.Group();
  walk.name = 'walk';
  group.add(walk);
  group.add(islandTop(plan));
  const city = new THREE.Group();
  city.add(walls(plan), wallHouses(plan, floors), wallGardens(plan), skyline(plan, floors), keep(plan));
  patchCutout(city);
  group.add(city);
  const streams = plan.streams;
  group.add(meadowLife(plan, streams));
  const under = underside(plan);
  group.add(under.mesh, hangings(plan, under.rows));
  const fm = fallMaterial();
  for (const s of streams) group.add(waterfall(plan, s, fm));
  const sky = clouds(plan);
  group.add(sky);
  const isles = islets(plan);
  group.add(isles);
  group.add(farLand(plan), ruins());
  const subjects = `${SUBJECT_ICONS.math}${SUBJECT_ICONS.history}${SUBJECT_ICONS.physics}`;
  const count = plan.floors.length;
  const fireflySpots = [];
  // The floors: each its own street (walkable), its parapet, lanterns, signs and street life, greyed while it is locked.
  const tiers = plan.floors.map((f) => {
    const look = floors[f.k].look;
    const w = new THREE.Group();
    w.add(floorTop(plan, f, look));
    w.userData.floor = f.n;
    walk.add(w);
    const deco = floorDeco(plan, f, look);
    const P = parts(), lamps = parts();
    parapet(P, lamps, plan, f.phiS, f.phiE);
    if (f.k === 0) endParapet(P, plan, f.phiS + 0.3 / plan.riOf(f.phiS), f.y);
    if (f.k === count - 1) endParapet(P, plan, f.phiE - 0.3 / plan.riOf(f.phiE), f.y);
    // Signposts: arriving (the schools are this way →, the way down ←), at the plaza (up →, down ←), at the ramp up (↑ next floor).
    const len = (f.phiE - f.phiS) * (f.ri + C.placeLine);
    const along = (d) => plan.phiAlong(f.k, d);
    const up = f.n < count ? [`⬆ ${f.n + 1} →`, '#2fb3a6'] : null;
    const down = f.n > 1 ? [`← ⬇ ${f.n - 1}`, '#8a7f8c'] : null;
    signpost(deco, P, plan, along(2.6), f.y, [[`${subjects} →`, look.banner], down].filter(Boolean), { top: [`${floors[f.k].icon} ${f.n}`, look.banner] });
    signpost(deco, P, plan, f.plaza.phi + 3.2 / (f.ri + C.W), f.y, [up, f.k === 0 ? ['← 🌍', '#4f8fd6'] : down].filter(Boolean));
    if (up) signpost(deco, P, plan, along(len - 2.2), f.y, [up, [`← ${subjects}`, look.banner]]);
    else signpost(deco, P, plan, along(len - 2.2), f.y, [[`← ${subjects}`, look.banner]], { top: [`👑 ${f.n}`, look.banner] });
    // The ramp up to this floor: its parapet and banner poles belong to this floor (greyed with it).
    const s = plan.stairs[f.k - 1];
    if (s) {
      parapet(P, lamps, plan, s.pa, s.pb, C.W - 0.45, 4);
      for (const o of [1.0, C.W - 1.6]) {
        const p = plan.pt(s.pa - 1.4 / (plan.riOf(s.pa) + o), o);
        P.put(STONE.darkWood, new THREE.CylinderGeometry(0.08, 0.1, 4.4, 6), Mx(p.x, s.ya + 2.2, p.z));
        P.put(STONE.gold, new THREE.SphereGeometry(0.14, 8, 6), Mx(p.x, s.ya + 4.5, p.z));
        const yaw = plan.thetaOf(s.pa);
        const bn = new THREE.Group();
        banner(bn, [0, 0, 0], 0, look.banner, 0.8, 2.0);
        bn.position.set(p.x, s.ya + 4.1, p.z);
        bn.rotation.y = yaw;
        deco.add(bn);
      }
    }
    for (const [x, z] of f.toySpots) fireflySpots.push({ x, y: f.y, z });
    P.build(deco);
    lamps.build(deco);
    batch(deco);
    patchCutout(deco);
    group.add(deco);
    return { walk: w, deco };
  });
  // The ramps (walkable), a portcullis at the foot of each.
  const gates = [];
  const rampWalk = new THREE.Group();
  for (const s of plan.stairs) {
    const look = floors[s.from - 1].look;
    rampWalk.add(rampTop(plan, s));
    const gate = castleGate({ a: s.a, b: { x: s.a.x + s.up.x, y: s.a.y, z: s.a.z + s.up.z }, width: C.W - 0.4 }, look);
    gate.userData.to = s.to;
    patchCutout(gate);
    gates.push(gate);
    group.add(gate);
  }
  walk.add(rampWalk);
  const nightCloud = new THREE.Color('#5a6a9a'), dayCloud = new THREE.Color('#ffffff');
  const nightEm = new THREE.Color('#243a74'), dayEm = new THREE.Color('#a9c8ee');
  isles.userData.bob(0);
  return {
    group,
    walk,
    tiers,
    gates,
    fireflySpots,
    update(t) {
      isles.userData.bob(t);
      fm.uniforms.uTime.value = t;
      sky.rotation.y = t * 0.0012;
    },
    setNight(k) {
      const m = sky.userData.material;
      m.color.copy(dayCloud).lerp(nightCloud, k);
      m.emissive.copy(dayEm).lerp(nightEm, k);
      fm.uniforms.uNight.value = k;
      for (const m of mists) m.opacity = m.userData.day * (1 - k * 0.75);
      glassMat().emissiveIntensity = 0.18 + k * 1.5;
    },
    dust: () => {}
  };
}
