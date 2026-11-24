/**
 * The Lagoon in 3D: a turquoise lagoon (shallow and bright by the islands,
 * deeper across the middle, deep blue beyond, with ripples, a line of foam
 * at every beach and soft caustics in the shallows), seven sandy islands
 * with palms, a boardwalk ring on stilts round each, piers out to the
 * overwater villas' decks (plunge pools by the schools), long boardwalks
 * from island to island with lanterns and a gate, sailboats and kayaks
 * bobbing, and low islands on the horizon.
 *
 * What you walk on (sand tops, planks) is kept apart in `walk`, so clicks
 * find it; each island's parts are grouped so a locked island can be greyed.
 */
import * as THREE from 'three';
import { add, batch, box, cone, cyl, leafGeo, limb, mat, seeded, sphere, vcMat } from '../kit.js';
import { lampMat } from '../buildings.js';
import { buildGate } from '../structures.js';
import { LAGOON } from './plan.js';

const TAU = Math.PI * 2;
const polar = (cx, cz, r, a) => [cx + r * Math.sin(a), cz + r * Math.cos(a)];
const plank = () => mat('#c39a6b', { rough: 0.9 });
const plankDark = () => mat('#a9825a', { rough: 0.9 });
const post = () => mat('#6b4a30', { rough: 0.9 });
const rope = () => mat('#e9d8b0', { rough: 1 });

/* ---------------------------------------------------------------- water */

function water(plan) {
  const isl = plan.floors.map((f) => new THREE.Vector2(f.centre.x, f.centre.z));
  while (isl.length < 7) isl.push(new THREE.Vector2(9999, 9999));
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 },
    uNight: { value: 0 },
    uRing: { value: LAGOON.ring },
    uIsl: { value: isl },
    cShallow: { value: new THREE.Color('#8ff0e0') },
    cMid: { value: new THREE.Color('#2fc7d6') },
    cDeep: { value: new THREE.Color('#1a8fc4') },
    cFar: { value: new THREE.Color('#1462a8') }
  }]);
  uniforms.uIsl.value = isl;
  const m = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    vertexShader: `varying vec2 vP; varying vec3 vW;
      #include <fog_pars_vertex>
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xz; vW = w.xyz;
        vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uTime; uniform float uNight; uniform float uRing; uniform vec2 uIsl[7];
      uniform vec3 cShallow; uniform vec3 cMid; uniform vec3 cDeep; uniform vec3 cFar;
      varying vec2 vP; varying vec3 vW;
      #include <fog_pars_fragment>
      void main() {
        float d = 1e9;
        for (int i = 0; i < 7; i++) d = min(d, length(vP - uIsl[i]));
        float r = length(vP);
        float lagoon = 1.0 - smoothstep(uRing + 30.0, uRing + 120.0, r);
        vec3 col = mix(cFar, cDeep, lagoon);
        col = mix(col, cMid, lagoon * (1.0 - smoothstep(20.0, 90.0, d)) * 0.9 + (1.0 - smoothstep(uRing - 60.0, uRing + 10.0, r)) * 0.35);
        float shallow = 1.0 - smoothstep(14.0, 52.0, d);
        col = mix(col, cShallow, shallow);
        // Caustics in the shallows, ripples everywhere.
        float c = sin(vP.x * 0.42 + uTime * 0.9) * sin(vP.y * 0.39 - uTime * 0.7) + sin((vP.x - vP.y) * 0.27 + uTime * 0.6);
        col += shallow * 0.09 * smoothstep(0.7, 1.7, c);
        float rip = sin(vP.x * 0.9 + uTime * 1.3 + sin(vP.y * 0.31)) * sin(vP.y * 0.8 - uTime * 1.1);
        col += 0.035 * smoothstep(0.55, 1.0, rip);
        // Foam where the water meets each beach.
        float foam = smoothstep(18.5, 16.2, d) * smoothstep(14.8, 15.8, d) * (0.55 + 0.45 * sin(uTime * 1.6 + d * 2.4));
        col = mix(col, vec3(1.0), foam * 0.8);
        // Night: dark blue with a moon sheen.
        col = mix(col, col * vec3(0.18, 0.28, 0.55) + vec3(0.0, 0.02, 0.06) * smoothstep(0.6, 1.0, rip), uNight);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1600, 96), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = false;
  mesh.name = 'lagoon-water';
  mesh.userData.update = (t, night) => {
    m.uniforms.uTime.value = t;
    m.uniforms.uNight.value = night;
  };
  return mesh;
}

/* ---------------------------------------------------------------- islands */

/** A sandy island: a flat top you walk on, sloping into the water. */
function sandIsland(walk, deco, f) {
  const { sandR, deck } = LAGOON;
  const prof = [[0, deck], [sandR, deck], [sandR + 1.6, deck - 0.35], [sandR + 3.4, 0.1], [sandR + 6, -1.2]].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(prof, 48);
  const sand = mat('#f6e7c1', { rough: 1 });
  add(walk, g, sand, [f.centre.x, 0, f.centre.z]).receiveShadow = true;
  // A sandy path ring and a few rocks and shells.
  const r = seeded(f.n * 13);
  const rock = mat('#b9b2a3');
  for (let i = 0; i < 8; i++) {
    const a = r() * TAU, d = sandR + 2 + r() * 3;
    const [x, z] = polar(f.centre.x, f.centre.z, d, a);
    add(deco, sphere(0.5 + r() * 0.6, 7, 5), rock, [x, 0.2, z], [r(), r(), r()], [1.3, 0.55, 1]);
  }
}

/** A palm: a curved, ringed trunk, a crown of fronds and coconuts. */
function palm(deco, { x, z, lean, seed }, y, out, leafColor) {
  const r = seeded(seed);
  const h = 6.5 + r() * 2.2;
  const dir = [out[0] + (r() - 0.5) * 0.6, out[1] + (r() - 0.5) * 0.6];
  const top = [x + dir[0] * h * lean * 1.6, y + h, z + dir[1] * h * lean * 1.6];
  const pts = [[x, y - 0.2, z], [x + dir[0] * h * lean * 0.3, y + h * 0.4, z + dir[1] * h * lean * 0.3], [x + dir[0] * h * lean, y + h * 0.78, z + dir[1] * h * lean], top];
  add(deco, limb(pts, 0.32, 0.2, { segs: 16, radial: 7 }), mat('#9c7a54', { rough: 0.95 }));
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  for (let i = 1; i < 9; i++) {
    const p = curve.getPointAt(i / 9);
    add(deco, new THREE.TorusGeometry(0.29 - i * 0.012, 0.045, 4, 10), mat('#7d5e3e'), [p.x, p.y, p.z], [Math.PI / 2, 0, 0]);
  }
  const leaf = vcMat({ side: THREE.DoubleSide, key: 'leaf' });
  for (let i = 0; i < 9; i++) {
    const m = add(deco, leafGeo(3.4 + r() * 0.9, 0.75, { color: leafColor, droop: 1.3, cup: 0.15, segL: 10 }), leaf, top);
    m.rotation.order = 'YXZ';
    m.rotation.set(0.15 + r() * 0.25, (i / 9) * TAU + r() * 0.3, 0);
  }
  for (let i = 0; i < 3; i++) add(deco, sphere(0.2, 8, 6), mat('#6b4a2a'), [top[0] + Math.sin(i * 2.1) * 0.3, top[1] - 0.25, top[2] + Math.cos(i * 2.1) * 0.3]);
}

/** Planks along a straight run, with posts into the water and rope rails (skipping `noRail` sides). */
function walkway(walk, deco, ax, az, bx, bz, y, width, { rails = true, lanterns = 0, stilts = 2.6 } = {}) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  if (len < 0.2) return;
  const yaw = Math.atan2(dx, dz);
  const ux = dx / len, uz = dz / len;
  const n = Math.max(2, Math.round(len / 0.5));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    add(walk, box(width, 0.14, (len / n) * 0.92), i % 2 ? plank() : plankDark(), [ax + dx * t, y - 0.07, az + dz * t], [0, yaw, 0]);
  }
  for (const s of [-1, 1]) {
    const ox = uz * s * (width / 2 + 0.05), oz = -ux * s * (width / 2 + 0.05);
    add(deco, box(0.16, 0.24, len), post(), [ax + dx / 2 + ox, y - 0.24, az + dz / 2 + oz], [0, yaw, 0]);
    const k = Math.max(1, Math.round(len / stilts));
    for (let i = 0; i <= k; i++) {
      const px = ax + dx * (i / k) + ox, pz = az + dz * (i / k) + oz;
      add(deco, cyl(0.1, 0.1, y + 1.6, 5), post(), [px, (y - 1.6) / 2, pz]);
      if (rails) add(deco, cyl(0.06, 0.07, 1.0, 5), post(), [px, y + 0.5, pz]);
    }
    if (rails) {
      const rail = add(deco, cyl(0.04, 0.04, len, 4), rope(), [ax + dx / 2 + ox, y + 0.95, az + dz / 2 + oz]);
      rail.rotation.set(0, yaw, 0);
      rail.rotateX(Math.PI / 2);
    }
  }
  for (let i = 1; i <= lanterns; i++) {
    const t = i / (lanterns + 1);
    const ox = uz * (width / 2 + 0.05), oz = -ux * (width / 2 + 0.05);
    add(deco, cyl(0.06, 0.07, 1.9, 5), post(), [ax + dx * t + ox, y + 0.95, az + dz * t + oz]);
    add(deco, box(0.24, 0.3, 0.24), lampMat, [ax + dx * t + ox, y + 1.95, az + dz * t + oz]);
  }
}

/** The boardwalk ring round an island: planks in a circle, stilts, rails with gaps where piers and links join. */
function ringWalk(walk, deco, f, gaps) {
  const { walkR, walkW, deck: y } = LAGOON;
  const { x: cx, z: cz } = f.centre;
  const n = Math.round((TAU * walkR) / 0.5);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const [x, z] = polar(cx, cz, walkR, a);
    add(walk, box(walkW, 0.14, ((TAU * walkR) / n) * 0.92), i % 2 ? plank() : plankDark(), [x, y - 0.07, z], [0, a + Math.PI / 2, 0]);
  }
  const gap = (a, side) => gaps.some((g) => g.side === side && Math.abs(Math.atan2(Math.sin(a - g.a), Math.cos(a - g.a))) < g.half);
  for (const side of [-1, 1]) {
    const R = walkR + side * (walkW / 2 + 0.05);
    const k = Math.round((TAU * R) / 2.4);
    let prev = null;
    for (let i = 0; i <= k; i++) {
      const a = (i / k) * TAU;
      const [x, z] = polar(cx, cz, R, a);
      add(deco, cyl(0.1, 0.1, y + 1.6, 5), post(), [x, (y - 1.6) / 2, z]);
      if (gap(a, side)) {
        prev = null;
        continue;
      }
      add(deco, cyl(0.06, 0.07, 1.0, 5), post(), [x, y + 0.5, z]);
      if (prev) {
        const len = Math.hypot(x - prev[0], z - prev[1]);
        const rail = add(deco, cyl(0.04, 0.04, len, 4), rope(), [(x + prev[0]) / 2, y + 0.95, (z + prev[1]) / 2]);
        rail.rotation.set(0, Math.atan2(x - prev[0], z - prev[1]), 0);
        rail.rotateX(Math.PI / 2);
      }
      prev = [x, z];
    }
    add(deco, new THREE.TorusGeometry(R, 0.08, 4, 96), post(), [cx, y - 0.24, cz], [Math.PI / 2, 0, 0]);
  }
}

/** A villa's deck on stilts: teak planks in a circle, a rail with a gap for its pier, a plunge pool by the schools. */
function padDeck(walk, deco, f, p, look) {
  const y = LAGOON.deck;
  const N = Math.max(16, Math.round(p.pr * 4));
  for (let i = 0; i < N; i++) {
    add(walk, new THREE.CylinderGeometry(p.pr, p.pr, 0.32, 2, 1, false, (i / N) * TAU, TAU / N), i % 2 ? plank() : plankDark(), [p.x, y - 0.16, p.z]);
  }
  add(deco, new THREE.TorusGeometry(p.pr, 0.12, 5, 48), post(), [p.x, y - 0.2, p.z], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    add(deco, cyl(0.16, 0.16, y + 1.8, 6), post(), [p.x + Math.sin(a) * p.pr * 0.75, (y - 1.8) / 2, p.z + Math.cos(a) * p.pr * 0.75]);
  }
  // Rail round the rim, open towards the pier (inwards).
  const inward = Math.atan2(-p.out[0], -p.out[1]);
  const R = p.pr - 0.15;
  const k = Math.max(10, Math.round((TAU * R) / 1.6));
  let prev = null;
  for (let i = 0; i <= k; i++) {
    const a = (i / k) * TAU;
    if (Math.abs(Math.atan2(Math.sin(a - inward), Math.cos(a - inward))) < Math.asin(Math.min(1, 2.0 / R))) {
      prev = null;
      continue;
    }
    const [x, z] = polar(p.x, p.z, R, a);
    if (i < k) add(deco, cyl(0.06, 0.07, 1.0, 5), post(), [x, y + 0.5, z]);
    if (prev) {
      const len = Math.hypot(x - prev[0], z - prev[1]);
      const rail = add(deco, cyl(0.04, 0.04, len, 4), rope(), [(x + prev[0]) / 2, y + 0.95, (z + prev[1]) / 2]);
      rail.rotation.set(0, Math.atan2(x - prev[0], z - prev[1]), 0);
      rail.rotateX(Math.PI / 2);
    }
    prev = [x, z];
  }
  if (p.pr > 6) {
    // A plunge pool on the deck beside the villa.
    const side = Math.atan2(p.out[0], p.out[1]) + 1.75;
    const [px, pz] = polar(p.x, p.z, 6.0, side);
    add(deco, box(1.7, 0.06, 2.6), mat('#5fd4ec', { rough: 0.15 }), [px, y + 0.03, pz], [0, side, 0]);
    add(deco, box(1.95, 0.08, 2.85), mat('#f6f2e8'), [px, y + 0.0, pz], [0, side, 0]);
  }
}

/** A sailboat or a kayak, bobbing. */
function boat(kind, seed) {
  const g = new THREE.Group();
  const r = seeded(seed);
  const hullC = ['#ffffff', '#ffd23f', '#ff7a5c', '#7cc6ff'][Math.floor(r() * 4)];
  if (kind === 'sail') {
    const hull = add(g, sphere(1.0, 14, 8), mat(hullC), [0, 0.1, 0]);
    hull.scale.set(0.9, 0.45, 2.4);
    add(g, cyl(0.06, 0.07, 5, 6), post(), [0, 2.6, 0.2]);
    const sail = new THREE.Shape();
    sail.moveTo(0, 0);
    sail.lineTo(0, 4.2);
    sail.lineTo(2.0, 0.2);
    add(g, new THREE.ShapeGeometry(sail), mat('#fffaf0', { side: THREE.DoubleSide }), [0.05, 0.6, 0.2], [0, Math.PI / 2, 0]);
  } else {
    const hull = add(g, sphere(0.5, 12, 6), mat(hullC), [0, 0.05, 0]);
    hull.scale.set(0.7, 0.4, 3.2);
    add(g, box(1.8, 0.05, 0.12), post(), [0, 0.4, 0], [0, 0.4, 0.3]);
  }
  batch(g);
  const phase = r() * 10;
  g.userData.update = (t) => {
    g.position.y = Math.sin(t * 1.1 + phase) * 0.08;
    g.rotation.z = Math.sin(t * 0.9 + phase) * 0.05;
    g.rotation.x = Math.sin(t * 0.7 + phase * 1.3) * 0.03;
  };
  return g;
}

/** Low islands on the horizon. */
function horizon(group) {
  const r = seeded(77);
  const far = new THREE.Group();
  const sand = mat('#f2dfb0'), green = [mat('#4faa6a'), mat('#5fbf7a')];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + r() * 0.2;
    const [x, z] = polar(0, 0, 520 + r() * 220, a);
    const s = 10 + r() * 22;
    const isl = add(far, sphere(s, 14, 6), sand, [x, -s * 0.75, z]);
    isl.scale.set(1.6, 1, 1.2);
    for (let k = 0; k < 4; k++) add(far, sphere(s * 0.35, 8, 6), green[k % 2], [x + (r() - 0.5) * s, s * 0.12, z + (r() - 0.5) * s]);
  }
  for (const m of far.children) m.castShadow = false;
  group.add(batch(far));
}

/**
 * Build the Lagoon for a plan and the islands' looks.
 * @returns {{ group, walk, tiers, gates, fireflySpots, water, update(t, night), setNight(k) }}
 */
export function buildLagoonWorld(plan, floors) {
  const group = new THREE.Group();
  group.name = 'lagoon';
  const walk = new THREE.Group();
  walk.name = 'walk';
  group.add(walk);
  const sea = water(plan);
  group.add(sea);
  horizon(group);
  const tiers = [];
  const fireflySpots = [];
  const D2R = Math.PI / 180;
  for (const f of plan.floors) {
    const look = floors[f.k].look;
    const w = new THREE.Group(), deco = new THREE.Group();
    sandIsland(w, deco, f);
    for (const p of f.palms) palm(deco, p, LAGOON.deck, [Math.sin(Math.atan2(p.x - f.centre.x, p.z - f.centre.z)), Math.cos(Math.atan2(p.x - f.centre.x, p.z - f.centre.z))], look.leaf);
    // Gaps in the ring's rails: piers to the sand (inside), piers to the villas and the links (outside).
    const gaps = [];
    for (const L of f.links) {
      // A pier from the sand meets the ring on its inside; a pier to a villa leaves it on the outside.
      const fromSand = !L.to;
      const px = fromSand ? L.bx : L.ax, pz = fromSand ? L.bz : L.az;
      gaps.push({ a: Math.atan2(px - f.centre.x, pz - f.centre.z), side: fromSand ? -1 : 1, half: (L.width / 2 + 0.6) / LAGOON.walkR });
    }
    for (const a of [f.theta + 90 * D2R, f.theta - 90 * D2R]) gaps.push({ a, side: 1, half: 2.4 / LAGOON.walkR });
    ringWalk(w, deco, f, gaps);
    for (const L of f.links) walkway(w, deco, L.ax, L.az, L.bx, L.bz, LAGOON.deck, L.width, { rails: true });
    for (const id in f.pads) {
      padDeck(w, deco, f, f.pads[id], look);
      fireflySpots.push({ x: f.pads[id].x, y: LAGOON.deck, z: f.pads[id].z });
    }
    batch(w);
    batch(deco);
    w.userData.floor = f.n;
    walk.add(w);
    group.add(deco);
    tiers.push({ walk: w, deco });
  }
  // The long boardwalks between the islands, with lanterns, and a gate at the start of each.
  const links = new THREE.Group(), linkWalk = new THREE.Group();
  const gates = [];
  for (const s of plan.stairs) {
    for (const L of s.segs) walkway(linkWalk, links, L.ax, L.az, L.bx, L.bz, LAGOON.deck, L.width, { lanterns: Math.max(1, Math.round(L.len / 14)) });
    const gate = buildGate({ a: s.a, b: s.b, width: s.width }, { ...floors[s.from - 1].look, stone: '#9a6b45' });
    gate.userData.to = s.to;
    gates.push(gate);
    group.add(gate);
  }
  batch(links);
  batch(linkWalk);
  walk.add(linkWalk);
  group.add(links);
  // Boats in the lagoon.
  const boats = [];
  const r = seeded(5);
  for (let i = 0; i < 14; i++) {
    const kind = i % 3 ? 'kayak' : 'sail';
    const b = boat(kind, i + 1);
    const a = r() * TAU;
    const d = i < 8 ? 40 + r() * 60 : LAGOON.ring + 70 + r() * 80;
    b.position.set(Math.sin(a) * d, 0, Math.cos(a) * d);
    b.rotation.y = r() * TAU;
    group.add(b);
    boats.push(b);
  }
  return {
    group,
    walk,
    tiers,
    gates,
    fireflySpots,
    water: sea,
    update(t, night) {
      sea.userData.update(t, night);
      for (const b of boats) b.userData.update(t);
    }
  };
}
