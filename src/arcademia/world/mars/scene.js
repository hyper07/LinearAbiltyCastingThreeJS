/**
 * Mars in 3D: Olympus Mons as a red-rock mountain you can walk all the way
 * round — seven ring terraces (flat tops of red soil with drifts of paler
 * dust and a lane round the outside), layered red, rust and ochre cliffs
 * between them with stairs cut into the rock, the caldera's pit inside the
 * top ring, and a steep escarpment down to the plain at the foot.
 *
 * Beyond, the wide red plain runs out to the skyline: flat-topped mesas, big
 * crater rims, a great layered canyon to the east and the other Tharsis
 * volcanoes far behind; a small bright Sun low in the butterscotch sky, with
 * Phobos and Deimos. At the volcano's foot stand the giants everyone can
 * see from every ring: the steel Big Rocket on its launch pad by its tower,
 * the habitat village with its printed domes and greenhouse tunnels, the
 * six-wheeled rover on its loop and the helicopter drone circling over the
 * village. Boulders and basalt rocks lie everywhere; solar panels, beacons,
 * supply crates and pennants dot the rings; dust devils wander the plain.
 *
 * What you walk on (each ring's top, the stairs) is kept in `walk`, so clicks
 * find it; each ring's parts are grouped (`tiers`) so a locked one can be
 * greyed. `dust(x, y, z, size)` kicks up a puff of red dust (World.js calls
 * it when someone lands from a floaty Mars hop).
 */
import * as THREE from 'three';
import { GROUND_Y, fbm, noise } from '../layout.js';
import { add, batch, box, cyl, mat, seeded, sphere, toonRamp, vcMat } from '../kit.js';
import { lampMat, windowMat } from '../buildings.js';
import { buildStairs } from '../structures.js';
import { patchCutout } from '../cutout.js';
import { tmat } from '../moon/buildings.js';
import { SIGHTS, MOONS, SUN, MARS as M, farGround, plain } from './plan.js';
import { MARS, bigRocketModel, marsRoverModel, droneModel, greenhouseTunnel, steelMaterial, devilMaterial, devilGeometry, marsGate } from './buildings.js';

const TAU = Math.PI * 2;
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Layered rock: bands of red, rust and ochre by height, a little wavy. */
const STRATA = ['#a8523a', '#c4683f', '#dc955c', '#8f4430', '#b85f3e', '#e2a46a', '#9c4a34'].map((c) => new THREE.Color(c));
const strata = (x, y, z) => STRATA[((Math.floor((y + 60 + fbm(x * 0.05, z * 0.05) * 1.6) / 1.35) % STRATA.length) + STRATA.length) % STRATA.length];

/** A triangle mesh from a polar grid: rows of [x, y, z] points (one row per radius), one flat colour a facet. */
function polarMesh(rows, colourOf, { closed = true } = {}) {
  const pos = [], col = [];
  const c = new THREE.Color();
  const tri = (p, q, s) => {
    colourOf(c, p, q, s);
    for (const v of [p, q, s]) {
      pos.push(v[0], v[1], v[2]);
      col.push(c.r, c.g, c.b);
    }
  };
  for (let i = 0; i + 1 < rows.length; i++) {
    const A = rows[i], B = rows[i + 1];
    const n = A.length;
    for (let j = 0; j < (closed ? n : n - 1); j++) {
      const j2 = (j + 1) % n;
      if ((i + j) % 2) {
        tri(A[j], B[j], A[j2]);
        tri(A[j2], B[j], B[j2]);
      } else {
        tri(A[j], B[j], B[j2]);
        tri(A[j], B[j2], A[j2]);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}
const facet = (p, q, s) => {
  const mx = (p[0] + q[0] + s[0]) / 3, my = (p[1] + q[1] + s[1]) / 3, mz = (p[2] + q[2] + s[2]) / 3;
  const spread = Math.max(p[1], q[1], s[1]) - Math.min(p[1], q[1], s[1]);
  const span = Math.max(Math.hypot(p[0] - q[0], p[2] - q[2]), Math.hypot(p[0] - s[0], p[2] - s[2]), Math.hypot(q[0] - s[0], q[2] - s[2]));
  return { mx, my, mz, steep: spread / (span || 1) };
};

/* ---------------------------------------------------------------- the mountain */

/** The rock of the volcano: the cliffs between the rings, the caldera, the escarpment (under the ring tops it hides a little lower). */
function volcanoRock(plan) {
  const top = plan.floors.at(-1), foot = plan.floors[0];
  const radii = [];
  for (let r = 0.01; r < top.ri - 1.2; r += 1.4) radii.push(r);
  radii.push(top.ri - 1.2, top.ri - 0.6, top.ri - 0.2);
  for (let k = plan.floors.length - 1; k >= 0; k--) {
    const f = plan.floors[k];
    for (let r = f.ri + 0.05; r < f.ro; r += 2.4) radii.push(r);
    radii.push(f.ro - 0.05);
    if (k > 0) {
      const lo = plan.floors[k - 1];
      for (let i = 1; i < 7; i++) radii.push(f.ro + ((lo.ri - f.ro) * i) / 7);
    }
  }
  for (let i = 1; i <= 8; i++) radii.push(foot.ro + (M.esc * i) / 8);
  radii.push(foot.ro + M.esc + 2.5, foot.ro + M.esc + 6);
  const SEG = 720;
  const ringOf = (r) => plan.floors.find((f) => r > f.ri && r < f.ro);
  const rows = radii.map((r) => {
    const row = [];
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * TAU;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      row.push([x, plan.rock(x, z) - (ringOf(r) ? 0.35 : 0), z]);
    }
    return row;
  });
  const soil = [new THREE.Color('#d98a58'), new THREE.Color('#cf7d4d')], pit = new THREE.Color('#7c3c2c');
  const geo = polarMesh(rows, (c, p, q, s) => {
    const { mx, my, mz, steep } = facet(p, q, s);
    const r = Math.hypot(mx, mz);
    if (steep > 0.55) c.copy(strata(mx, my, mz)).offsetHSL(0, 0, noise(mx * 0.4, mz * 0.4) * 0.025);
    else c.copy(soil[noise(mx * 0.3, mz * 0.3) > 0 ? 0 : 1]);
    if (r < top.ri - 1.2) c.lerp(pit, smooth(top.ri - 1.2, M.pitR - 2, r) * 0.7);
  });
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }));
  m.receiveShadow = m.castShadow = true;
  m.name = 'mars-rock';
  return m;
}

/** Is a point in a staircase's cut (where a ring's top leaves a gap for the steps)? */
function inCut(plan, x, z, pad = 0.35) {
  return plan.stairs.some((s) => {
    const ox = x - s.a.x, oz = z - s.a.z;
    const a = ox * s.dx + oz * s.dz, perp = Math.abs(ox * s.dz - oz * s.dx);
    return a > -0.6 && a < s.len + 0.6 && perp < s.width / 2 + pad;
  });
}

/** One ring's flat top: red soil, drifts of paler dust, the lane round the outside, little paths to each place's door. */
function ringTop(plan, f, look) {
  const radii = [];
  for (let r = f.ri; r < f.ro - 0.01; r += 1.15) radii.push(r);
  radii.push(f.ro);
  const SEG = Math.max(160, Math.round((TAU * f.ro) / 1.3));
  const rows = radii.map((r) => {
    const row = [];
    for (let j = 0; j < SEG; j++) {
      const a = (j / SEG) * TAU;
      row.push([Math.sin(a) * r, f.y, Math.cos(a) * r]);
    }
    return row;
  });
  const grass = new THREE.Color(look.grass), dark = new THREE.Color(look.grassDark), path = new THREE.Color(look.path), drift = new THREE.Color(look.patch?.color ?? look.path), lip = new THREE.Color(look.rock[0]);
  const spurs = f.places.map((p) => [p.x, p.z, p.at.x, p.at.z]);
  const nearSeg = (x, z, [ax, az, bx, bz]) => {
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - ax - dx * t, z - az - dz * t);
  };
  const pos = [], col = [];
  const geo = polarMesh(rows, (c, p, q, s) => {
    const { mx, mz } = facet(p, q, s);
    const r = Math.hypot(mx, mz);
    const n = noise(mx * 0.35, mz * 0.35);
    c.copy(n > 0.15 ? dark : grass).offsetHSL(0, 0, n * 0.03);
    if (look.patch && noise(mx * look.patch.k + 9, mz * look.patch.k * 0.6) > look.patch.t) c.copy(drift).offsetHSL(0, 0, n * 0.02);
    if (Math.abs(r - f.rl) < 1.45 + noise(mx, mz) * 0.25 || spurs.some((sp) => nearSeg(mx, mz, sp) < 1.0)) c.copy(path).offsetHSL(0, 0, n * 0.03);
    if (f.ro - r < 0.7 || r - f.ri < 0.5) c.lerp(lip, 0.45);
  });
  // Leave a gap where a staircase cuts down through the ring's edge.
  const P = geo.attributes.position.array, C = geo.attributes.color.array;
  for (let i = 0; i < P.length; i += 9) {
    const x = (P[i] + P[i + 3] + P[i + 6]) / 3, z = (P[i + 2] + P[i + 5] + P[i + 8]) / 3;
    if (inCut(plan, x, z)) continue;
    for (let k = 0; k < 9; k++) {
      pos.push(P[i + k]);
      col.push(C[i + k]);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeVertexNormals();
  const m = new THREE.Mesh(out, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }));
  m.receiveShadow = true;
  m.name = `mars-ring-${f.n}`;
  return m;
}

/* ---------------------------------------------------------------- the far plain */

/** The plain round the volcano out to the skyline: a polar grid, one flat colour a facet. */
function farPlain(plan) {
  const R0 = plan.floors[0].ro + M.esc + 1, R1 = 1500, RINGS = 84, SEGS = 240, under = R0 + 5;
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
  const geo = polarMesh(rows, (c, p, q, s) => {
    const { mx, my, mz, steep } = facet(p, q, s);
    const far = Math.min(1, Math.max(0, (Math.hypot(mx, mz) - 260) / 200));
    const above = my - GROUND_Y;
    c.copy(noise(mx * 0.35, mz * 0.35) > 0 ? plainA : plainB);
    if (steep > (far > 0 ? 0.32 : 0.6)) c.copy(strata(mx, my * 0.5, mz));
    else if (above > 8) c.lerp(mesa, Math.min(1, above / 30) * far);
    if (above < -10) c.lerp(deep, Math.min(1, (-above - 10) / 20));
    c.offsetHSL(0, 0, fbm(mx * 0.05, mz * 0.05) * 0.03);
  });
  const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }));
  m.receiveShadow = true;
  m.name = 'mars-far';
  return m;
}

/* ---------------------------------------------------------------- the sky: the Sun, Phobos and Deimos */

function glowTexture(stops) {
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

/* ---------------------------------------------------------------- rocks and ring props */

/** Merged meshes, one per colour, from a list of placed geometries. */
function parts() {
  const map = new Map();
  return {
    put(color, geo, m) {
      geo.applyMatrix4(m);
      if (!map.has(color)) map.set(color, []);
      map.get(color).push(geo.index ? geo.toNonIndexed() : geo);
    },
    build(group) {
      for (const [color, list] of map) {
        const mesh = new THREE.Mesh(mergeList(list), mat(color, { rough: 0.9 }));
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
      }
      return group;
    }
  };
}
const Mx = (x, y, z, ry = 0, s = 1, rx = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), new THREE.Vector3(s, s, s));
const ROCKS = ['#8f4a35', '#a5583e', '#7c4232', '#b86a48', '#c47a4e'];

/** Boulders on the plain round the foot. */
function plainRocks(group, plan) {
  const r = seeded(4242);
  const P = parts();
  const R0 = plan.floors[0].ro + M.esc + 2;
  for (let i = 0; i < 1100; i++) {
    const a = r() * TAU, d = R0 + r() * 170;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if ([SIGHTS.rocket, SIGHTS.village].some((s) => Math.hypot(x - s.x, z - s.z) < s.r + 4)) continue;
    if (Math.abs(Math.hypot(x - SIGHTS.rover.x, z - SIGHTS.rover.z) - SIGHTS.rover.loop) < 4) continue;
    const s = r() < 0.12 ? 1.4 + r() * 1.8 : 0.35 + r() * 0.7;
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(1, 0.55 + r() * 0.35, 0.8 + r() * 0.4);
    P.put(ROCKS[Math.floor(r() * ROCKS.length)], g, Mx(x, plain(x, z) + s * 0.2, z, r() * TAU, s, (r() - 0.5) * 0.5));
  }
  // Boulders tumbled at the foot of the escarpment.
  for (let i = 0; i < 260; i++) {
    const a = r() * TAU, d = plan.floors[0].ro + M.esc + 0.5 + r() * 6;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    const s = 0.6 + r() * 1.6;
    const g = new THREE.DodecahedronGeometry(1, 0);
    g.scale(1, 0.6 + r() * 0.3, 0.9);
    P.put(ROCKS[Math.floor(r() * ROCKS.length)], g, Mx(x, plain(x, z) + s * 0.2, z, r() * TAU, s, (r() - 0.5) * 0.5));
  }
  group.add(P.build(new THREE.Group()));
}

/** A ring's rocks and props (solar panels, a beacon, supply crates, pennants, a sample rack), off the places, the lane and the stairs. */
function ringDeco(plan, f, look, blinkers) {
  const g = new THREE.Group();
  const r = seeded(97 + f.n * 31);
  const P = parts();
  const busy = (x, z, pad) => {
    const rr = Math.hypot(x, z);
    if (rr < f.ri + 0.9 + pad * 0.3 || rr > f.ro - 0.9 || Math.abs(rr - f.rl) < 1.9 + pad * 0.3) return true;
    if (inCut(plan, x, z, 1.4)) return true;
    if (f.places.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 1.4 + pad || Math.hypot(p.at.x - x, p.at.z - z) < 1.6 + pad)) return true;
    for (const q of [f.portal, f.boss, f.chest, f.chest.rock, f.worldGate, f.spawn]) if (q && Math.hypot(q.x - x, q.z - z) < 2.6 + pad) return true;
    if ([...f.gemSpots, ...f.toySpots].some(([gx, gz]) => Math.hypot(gx - x, gz - z) < 1.6 + pad)) return true;
    return false;
  };
  const at = () => {
    const a = r() * TAU, d = f.ri + r() * (f.ro - f.ri);
    return [Math.sin(a) * d, Math.cos(a) * d];
  };
  const count = Math.round((f.ro / 131) * 70) + 14;
  for (let tries = 0, n = 0; tries < count * 12 && n < count; tries++) {
    const [x, z] = at();
    if (busy(x, z, 0)) continue;
    const s = r() < 0.12 ? 0.55 + r() * 0.5 : 0.15 + r() * 0.32;
    const geo = new THREE.DodecahedronGeometry(1, 0);
    geo.scale(1, 0.55 + r() * 0.35, 0.8 + r() * 0.4);
    P.put(ROCKS[Math.floor(r() * ROCKS.length)], geo, Mx(x, f.y + s * 0.2, z, r() * TAU, s, (r() - 0.5) * 0.5));
    n++;
  }
  const props = Math.round((f.ro / 131) * 10) + 4;
  for (let tries = 0, n = 0; tries < 1500 && n < props; tries++) {
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
 * Build Mars for a plan and the rings' looks.
 * @returns {{ group, walk, tiers, gates, fireflySpots, update(t, night), setNight(k), dust(x, y, z, s) }}
 */
export function buildMarsWorld(plan, floors) {
  const group = new THREE.Group();
  group.name = 'mars';
  const walk = new THREE.Group();
  walk.name = 'walk';
  group.add(walk);
  const rockMesh = volcanoRock(plan);
  group.add(rockMesh);
  group.add(farPlain(plan));
  const theSun = sun(new THREE.Vector3(...SUN.disc).normalize());
  group.add(theSun);
  const sky = moons();
  group.add(sky);
  const big = giants(group);
  plainRocks(group, plan);
  const blinkers = [];
  // The rings: each its own top (walkable) and its rocks and props, greyed while it is locked.
  const tiers = plan.floors.map((f) => {
    const look = floors[f.k].look;
    const w = new THREE.Group();
    w.add(ringTop(plan, f, look));
    w.userData.floor = f.n;
    walk.add(w);
    const deco = ringDeco(plan, f, look, blinkers);
    patchCutout(deco);
    group.add(deco);
    return { walk: w, deco };
  });
  // The stairs cut into the cliffs, a pressure door at the foot of each.
  const gates = [];
  const stairWalk = new THREE.Group();
  for (const s of plan.stairs) {
    const look = floors[s.from - 1].look;
    stairWalk.add(buildStairs(s, look));
    const gate = marsGate(s, look);
    gate.userData.to = s.to;
    gates.push(gate);
    group.add(gate);
  }
  walk.add(stairWalk);
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
      devils.setNight(k);
    },
    dust: (x, y, z, s) => dust.kick(x, y, z, s)
  };
}
