/**
 * Living things of the diorama, drawn in batches: trees (instanced, their
 * crowns swaying in the wind), flowers, rocks and grass tufts, drifting
 * clouds, a few birds wheeling round the peak, and fireflies at night.
 */
import * as THREE from 'three';
import { GROUND_Y, PLINTH_R, noise } from './layout.js';
import { seeded, toonRamp } from './kit.js';

const wind = { uTime: { value: 0 } };
export const windClock = wind;

/** Make an instanced material sway: vertices sway more the higher they are in the crown. */
function swaying(material, amount = 0.12) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wind.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
          float sway = sin(uTime * 1.6 + ip.x * 0.37 + ip.z * 0.23) * ${amount.toFixed(3)} * max(0.0, position.y);
          transformed.x += sway;
          transformed.z += sway * 0.5;
        #endif`
      );
  };
  material.customProgramCacheKey = () => `sway${amount}`;
  return material;
}

/** A crown geometry for each kind of tree, with its colours baked per face. */
function crownGeometry(kind, leaf = '#5fcf6a') {
  const parts = [];
  if (kind === 'palm') {
    const trunk = new THREE.CylinderGeometry(0.16, 0.22, 2.6, 6);
    trunk.translate(0.15, 1.3, 0);
    parts.push(trunk);
    for (let i = 0; i < 6; i++) {
      const f = new THREE.ConeGeometry(0.32, 2.2, 4);
      f.scale(1, 1, 0.3);
      f.rotateZ(Math.PI / 2 + 0.35);
      f.translate(1.0, 0, 0);
      f.rotateY((i / 6) * Math.PI * 2);
      f.translate(0.15, 2.65, 0);
      parts.push(f);
    }
  } else if (kind === 'shroom') {
    const stem = new THREE.CylinderGeometry(0.3, 0.42, 2.0, 8);
    stem.translate(0, 1.0, 0);
    const cap = new THREE.SphereGeometry(1.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.scale(1, 0.7, 1);
    cap.translate(0, 1.9, 0);
    parts.push(stem, cap);
  } else if (kind === 'candy') {
    const a = new THREE.SphereGeometry(1.1, 12, 10);
    a.translate(0, 1.7, 0);
    const b = new THREE.SphereGeometry(0.7, 10, 8);
    b.translate(0.6, 1.3, 0.2);
    parts.push(a, b);
  } else if (kind === 'cone' || kind === 'snowcone') {
    [[1.25, 1.6, 0.9], [1.0, 1.4, 1.75], [0.7, 1.2, 2.5]].forEach(([r, h, y]) => {
      const c = new THREE.ConeGeometry(r, h, 7);
      c.translate(0, y, 0);
      parts.push(c);
    });
  } else if (kind === 'birch') {
    const a = new THREE.IcosahedronGeometry(0.85, 0);
    a.scale(0.9, 1.3, 0.9);
    a.translate(0, 1.6, 0);
    parts.push(a);
  } else {
    const a = new THREE.IcosahedronGeometry(1.15, 1);
    a.translate(0, 1.5, 0);
    const b = new THREE.IcosahedronGeometry(0.8, 1);
    b.translate(0.55, 1.15, 0.25);
    const c = new THREE.IcosahedronGeometry(0.75, 1);
    c.translate(-0.5, 1.2, -0.3);
    parts.push(a, b, c);
  }
  let g = parts.length > 1 ? mergeAll(parts) : parts[0];
  g = g.toNonIndexed();
  g.computeVertexNormals();
  // Light from above: the top faces of each crown a shade lighter.
  const p = g.attributes.position, n = g.attributes.normal;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
    const up = (n.getY(i) + n.getY(i + 1) + n.getY(i + 2)) / 3;
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    let v = 0.85 + up * 0.18;
    let snow = 0;
    if (kind === 'snowcone' && up > 0.35 && y > 1.2) snow = 1;
    // Palm trunks and mushroom stems are not leaf-coloured: a near-white the instance tint barely moves.
    const stem = (kind === 'palm' && y < 2.5) || (kind === 'shroom' && y < 1.85);
    let rgb = snow ? [1.25, 1.25, 1.3] : [v, v, v];
    if (kind === 'palm' || kind === 'shroom') {
      // These carry their own colours; the instance tint is near white.
      const cc = new THREE.Color(stem ? (kind === 'palm' ? '#b07a52' : '#fff1de') : leaf).multiplyScalar(v);
      rgb = [cc.r, cc.g, cc.b];
    }
    for (let k = 0; k < 3; k++) col.set(rgb, (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function mergeAll(list) {
  // Small local merge (positions/normals/uvs only).
  const nonIdx = list.map((g) => g.toNonIndexed());
  const total = nonIdx.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
  let o = 0;
  for (const g of nonIdx) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

/**
 * Pick open spots on each floor (not on paths, plinths, stairs or the stream).
 * @returns {(x: number, z: number, pad?: number) => boolean}
 */
export function makeSpotCheck(plan) {
  const near = (pts, x, z) => {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
    return best;
  };
  return (x, z, pad = 0) => {
    const n = plan.floorAt(x, z);
    if (!n) return false;
    const f = plan.floors[n - 1];
    if (plan.inside(f, x, z) < 1.4 + pad) return false;
    if (near(f.path, x, z) < 2.0 + pad) return false;
    if (f.plinths.some((p) => Math.hypot(x - p.x, z - p.z) < PLINTH_R + 0.9 + pad)) return false;
    if (Math.abs(x - f.river.x) < 2.3 + pad) return false;
    for (const s of plan.stairs) if (near([[s.a.x, s.a.z + 2], [s.b.x, s.b.z - 2]], x, z) < 2.6 + pad) return false;
    return true;
  };
}

/** Trees on every floor and down in the valley: a few instanced meshes, swaying. */
export function buildTrees(plan, floors) {
  const r = seeded(1234);
  const ok = makeSpotCheck(plan);
  const byKind = new Map();
  const put = (kind, x, z, y, s, leaf) => {
    const list = byKind.get(kind) ?? [];
    list.push({ x, y, z, s, leaf, rot: r() * Math.PI * 2 });
    byKind.set(kind, list);
  };
  for (const f of plan.floors) {
    const look = floors[f.k].look;
    let placed = 0;
    if (look.tree === 'none') continue;
    for (let tries = 0; tries < 1600 && placed < 40; tries++) {
      const x = f.cx + (r() * 2 - 1) * f.rx;
      const z = f.cz + (r() * 2 - 1.15) * f.rz;
      if (!ok(x, z, 0.3) || plan.floorAt(x, z) !== f.n) continue;
      if (f.places?.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 2.2)) continue;
      const kind = look.tree === 'fruit' ? (r() < 0.6 ? 'fruit' : 'round') : look.tree;
      const c = new THREE.Color(look.leaf).offsetHSL((r() - 0.5) * 0.04, (r() - 0.5) * 0.1, (r() - 0.5) * 0.08);
      put(kind, x, z, plan.ground(x, z), 0.75 + r() * 0.55, c);
      placed++;
    }
  }
  // The valley: a ring of mixed trees round the foot of the mountain.
  for (let i = 0; i < 380; i++) {
    const a = r() * Math.PI * 2, d = 55 + r() * 70;
    const x = Math.cos(a) * d * 1.15, z = -70 + Math.sin(a) * d * 1.5;
    const y = plan.ground(x, z);
    if (y > GROUND_Y + 6 || y < GROUND_Y - 0.4 || plan.floorAt(x, z)) continue;
    if (plan.river.distToBrook(x, z) < 4 || Math.hypot(x - plan.river.lake.x, z - plan.river.lake.z) < plan.river.lake.r + 4) continue;
    const kind = r() < 0.45 ? 'cone' : 'round';
    put(kind, x, z, y, 0.9 + r() * 0.8, new THREE.Color(kind === 'cone' ? '#4f8f6a' : '#73ad6c').offsetHSL(0, 0, (r() - 0.5) * 0.08));
  }
  const group = new THREE.Group();
  group.name = 'trees';
  const trunkMat = new THREE.MeshToonMaterial({ color: '#b07a52', gradientMap: toonRamp() });
  const birchMat = new THREE.MeshStandardMaterial({ color: '#efeae0', roughness: 0.9, flatShading: true });
  const crownMat = swaying(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }));
  const fruitMat = swaying(new THREE.MeshToonMaterial({ color: '#ff4f5e', gradientMap: toonRamp() }));
  const dummy = new THREE.Object3D();
  for (const [kind, list] of byKind) {
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, kind === 'cone' || kind === 'snowcone' ? 0.9 : 1.2, 6);
    trunkGeo.translate(0, kind === 'cone' || kind === 'snowcone' ? 0.45 : 0.6, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, kind === 'birch' ? birchMat : trunkMat, list.length);
    trunks.visible = !(kind === 'palm' || kind === 'shroom');
    const own = kind === 'palm' || kind === 'shroom';
    const crowns = new THREE.InstancedMesh(crownGeometry(kind, kind === 'palm' ? '#4fc46a' : list[0].leaf.getStyle()), crownMat, list.length);
    list.forEach((t, i) => {
      dummy.position.set(t.x, t.y - 0.05, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.setScalar(t.s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      crowns.setMatrixAt(i, dummy.matrix);
      crowns.setColorAt(i, own ? new THREE.Color(1, 1, 1).offsetHSL(0, 0, (i % 5) * -0.03) : t.leaf);
    });
    for (const m of [trunks, crowns]) {
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    }
    if (kind === 'fruit') {
      const fruitGeo = new THREE.IcosahedronGeometry(0.12, 0);
      const fruits = new THREE.InstancedMesh(fruitGeo, fruitMat, list.length * 6);
      let k = 0;
      for (const t of list) for (let j = 0; j < 6; j++) {
        const a = j * 1.05 + t.rot;
        dummy.position.set(t.x + Math.cos(a) * 1.0 * t.s, t.y + (1.2 + (j % 3) * 0.35) * t.s, t.z + Math.sin(a) * 1.0 * t.s);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(t.s);
        dummy.updateMatrix();
        fruits.setMatrixAt(k++, dummy.matrix);
      }
      group.add(fruits);
    }
  }
  group.userData.positions = [...byKind.values()].flat();
  return group;
}

/** Flowers, grass tufts and rocks: three instanced meshes over all the floors. */
export function buildGround(plan, floors) {
  const r = seeded(77);
  const ok = makeSpotCheck(plan);
  const flowers = [], tufts = [], rocks = [];
  for (const f of plan.floors) {
    const look = floors[f.k].look;
    for (let i = 0; i < 3500 && flowers.length < (f.k + 1) * 320; i++) {
      const x = f.cx + (r() * 2 - 1) * f.rx, z = f.cz + (r() * 2 - 1.1) * f.rz;
      if (!ok(x, z, -0.6) || plan.floorAt(x, z) !== f.n || f.places?.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 0.6)) continue;
      const patch = noise(x * 0.25, z * 0.25);
      const lush = ['meadow', 'mushroom', 'harbor'].includes(look.theme);
      if (!lush && patch <= 0.1) continue;
      if (patch > 0.1) flowers.push({ x, z, y: plan.ground(x, z), c: new THREE.Color(look.flowers[Math.floor(r() * look.flowers.length)]) });
      else tufts.push({ x, z, y: plan.ground(x, z), c: new THREE.Color(look.grassDark).offsetHSL(0, 0.1, 0.02 + r() * 0.06) });
    }
    for (let i = 0; i < 400 && rocks.length < (f.k + 1) * 22; i++) {
      const x = f.cx + (r() * 2 - 1) * f.rx, z = f.cz + (r() * 2 - 1.1) * f.rz;
      if (!ok(x, z, -0.4) || plan.floorAt(x, z) !== f.n || f.places?.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 0.6)) continue;
      rocks.push({ x, z, y: plan.ground(x, z), s: 0.25 + r() * 0.5 });
    }
  }
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const flowerGeo = new THREE.OctahedronGeometry(0.11, 0);
  flowerGeo.scale(1, 0.6, 1);
  const stemGeo = new THREE.ConeGeometry(0.1, 0.42, 4);
  stemGeo.translate(0, 0.21, 0);
  const fm = new THREE.InstancedMesh(flowerGeo, new THREE.MeshToonMaterial({ gradientMap: toonRamp() }), flowers.length);
  flowers.forEach((f, i) => {
    dummy.position.set(f.x, f.y + 0.28, f.z);
    dummy.rotation.set(0, r() * 3, 0);
    dummy.scale.setScalar(0.8 + r() * 0.6);
    dummy.updateMatrix();
    fm.setMatrixAt(i, dummy.matrix);
    fm.setColorAt(i, f.c);
  });
  const stems = new THREE.InstancedMesh(stemGeo, swaying(new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: toonRamp() }), 0.2), flowers.length + tufts.length);
  [...flowers, ...tufts].forEach((f, i) => {
    dummy.position.set(f.x, f.y - 0.02, f.z);
    dummy.rotation.set(0, r() * 3, 0);
    const s = i < flowers.length ? 0.7 : 1 + r() * 0.8;
    dummy.scale.set(s, s * (i < flowers.length ? 0.7 : 1), s);
    dummy.updateMatrix();
    stems.setMatrixAt(i, dummy.matrix);
    stems.setColorAt(i, i < flowers.length ? new THREE.Color('#5fbf5a') : tufts[i - flowers.length].c);
  });
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  rockGeo.scale(1, 0.6, 1);
  const rm = new THREE.InstancedMesh(rockGeo, new THREE.MeshToonMaterial({ color: '#c3c9ee', gradientMap: toonRamp() }), rocks.length);
  rocks.forEach((k, i) => {
    dummy.position.set(k.x, k.y + k.s * 0.2, k.z);
    dummy.rotation.set(r(), r() * 3, r() * 0.4);
    dummy.scale.setScalar(k.s);
    dummy.updateMatrix();
    rm.setMatrixAt(i, dummy.matrix);
  });
  for (const m of [fm, stems, rm]) {
    m.receiveShadow = true;
    group.add(m);
  }
  rm.castShadow = true;
  return group;
}

/** Puffy low-poly clouds that drift round the mountain. */
export function buildClouds() {
  const r = seeded(5);
  const group = new THREE.Group();
  const m = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: toonRamp(), transparent: true, opacity: 0.96 });
  const geo = new THREE.SphereGeometry(1, 14, 10);
  for (let i = 0; i < 11; i++) {
    const c = new THREE.Group();
    const n = 4 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const s = 2.5 + r() * 3;
      const puff = new THREE.Mesh(geo, m);
      puff.position.set((k - n / 2) * 3.2 + r() * 1.5, r() * 1.5 + (k % 2) * 0.8, r() * 2.5);
      puff.scale.set(s, s * 0.7, s);
      c.add(puff);
    }
    const a = r() * Math.PI * 2;
    c.userData = { a, d: 150 + r() * 90, y: 62 + r() * 45, speed: 0.006 + r() * 0.008 };
    group.add(c);
  }
  group.userData.update = (dt) => {
    for (const c of group.children) {
      c.userData.a += dt * c.userData.speed;
      c.position.set(Math.cos(c.userData.a) * c.userData.d, c.userData.y, -90 + Math.sin(c.userData.a) * c.userData.d * 0.9);
      c.rotation.y = -c.userData.a;
    }
  };
  group.userData.update(0);
  return group;
}

/** Birds: two wings each, flapping, wheeling in wide loops. */
export function buildBirds() {
  const group = new THREE.Group();
  const m = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: toonRamp(), side: THREE.DoubleSide });
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, 0, 0, -0.2, 1.1, 0, 0], 3));
  wing.computeVertexNormals();
  const body = new THREE.ConeGeometry(0.12, 0.7, 5);
  body.rotateX(Math.PI / 2);
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Group();
    b.add(new THREE.Mesh(body, m));
    const L = new THREE.Mesh(wing, m), R = new THREE.Mesh(wing, m);
    R.scale.x = -1;
    b.add(L, R);
    b.userData = { L, R, a: i * 0.9, r: 24 + i * 5, y: 14 + i * 7, speed: 0.22 + (i % 3) * 0.06, cx: (i % 2 ? 14 : -16), cz: -20 - i * 26 };
    group.add(b);
  }
  group.userData.update = (dt, t) => {
    for (const b of group.children) {
      const u = b.userData;
      u.a += dt * u.speed;
      b.position.set(u.cx + Math.cos(u.a) * u.r, u.y + Math.sin(u.a * 2) * 2, u.cz + Math.sin(u.a) * u.r);
      b.rotation.y = -u.a;
      const flap = Math.sin(t * 9 + u.r) * 0.6;
      u.L.rotation.z = flap;
      u.R.rotation.z = -flap;
    }
  };
  return group;
}

/** Fireflies: soft warm points that drift near the trees, seen at night. */
export function buildFireflies(plan, treePositions) {
  const r = seeded(3);
  const n = 420;
  const base = new Float32Array(n * 3);
  const spots = treePositions.filter((t) => plan.floorAt(t.x, t.z) > 0);
  for (let i = 0; i < n; i++) {
    const t = spots[Math.floor(r() * spots.length)] ?? { x: 0, y: 0, z: 0 };
    base.set([t.x + (r() - 0.5) * 6, t.y + 0.6 + r() * 2.5, t.z + (r() - 0.5) * 6], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  const phase = new Float32Array(n).map(() => r() * 10);
  g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: wind.uTime, uNight: { value: 0 }, uScale: { value: 300 } },
    vertexShader: `attribute float phase; uniform float uTime; uniform float uScale; varying float vA;
      void main(){ vec3 p = position + vec3(sin(uTime*0.7+phase)*0.6, sin(uTime*1.1+phase*1.7)*0.4, cos(uTime*0.6+phase)*0.6);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        vA = 0.5 + 0.5 * sin(uTime * 2.6 + phase * 3.0); gl_PointSize = uScale * (0.12 + 0.06 * vA) / -mv.z; }`,
    fragmentShader: `uniform float uNight; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.86, 0.45) * 1.6, a * vA * uNight); }`
  });
  const points = new THREE.Points(g, material);
  points.frustumCulled = false;
  points.userData.material = material;
  return points;
}

/**
 * The Moon Base's own scenery (it has no trees): craters with raised rims,
 * glowing crystal clusters, solar-panel arrays, satellite dishes, antenna
 * masts with blinking lights, little rovers, moon rocks — and the Earth
 * hanging in the sky above it. Merged into a few meshes; `update(t)` blinks
 * the lights and turns the dishes.
 */
export function buildMoonProps(plan, floors) {
  const group = new THREE.Group();
  group.name = 'moon-props';
  const r = seeded(777);
  const ok = makeSpotCheck(plan);
  const parts = new Map();
  const add = (color, geo, m, opts = {}) => {
    const key = `${color}|${opts.emissive ?? ''}`;
    if (!parts.has(key)) parts.set(key, { color, opts, list: [] });
    geo.applyMatrix4(m);
    parts.get(key).list.push(geo);
  };
  const M = (x, y, z, ry = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s));
  const blinkers = [];
  const dishes = [];
  for (const f of plan.floors) {
    const look = floors[f.k].look;
    if (look.theme !== 'moon') continue;
    let placed = 0;
    for (let tries = 0; tries < 2400 && placed < 46; tries++) {
      const x = f.cx + (r() * 2 - 1) * f.rx;
      const z = f.cz + (r() * 2 - 1.15) * f.rz;
      if (!ok(x, z, 0.6) || plan.floorAt(x, z) !== f.n) continue;
      if (f.places?.some((p) => Math.hypot(p.x - x, p.z - z) < p.r + 2.6)) continue;
      const y = plan.ground(x, z);
      const ry = r() * Math.PI * 2;
      const kind = placed % 7;
      if (kind === 0 || kind === 4) {
        // a crater: a shallow raised rim and a darker floor
        const s = 0.9 + r() * 1.3;
        add('#b9bccf', new THREE.TorusGeometry(1.1, 0.28, 6, 22).rotateX(Math.PI / 2).scale(1, 0.55, 1), M(x, y + 0.05, z, ry, s));
        add('#9497ad', new THREE.CircleGeometry(1.05, 20).rotateX(-Math.PI / 2), M(x, y + 0.04, z, ry, s));
      } else if (kind === 1) {
        // glowing crystals
        const hue = r() < 0.5 ? '#7ff7ff' : '#c39bff';
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 + r();
          const g = new THREE.OctahedronGeometry(0.22 + r() * 0.18, 0).scale(0.6, 1.8 + r(), 0.6);
          g.rotateZ((r() - 0.5) * 0.7);
          add(hue, g, M(x + Math.cos(a) * 0.35, y + 0.35, z + Math.sin(a) * 0.35, a), { emissive: hue });
        }
      } else if (kind === 2) {
        // a solar panel array
        for (let k = -1; k <= 1; k++) {
          add('#d4d6e2', new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), M(x + k * 1.0 * Math.cos(ry), y + 0.4, z - k * 1.0 * Math.sin(ry), ry));
          const panel = new THREE.BoxGeometry(0.9, 0.05, 0.6).rotateX(-0.5);
          add('#2a4f9e', panel, M(x + k * 1.0 * Math.cos(ry), y + 0.85, z - k * 1.0 * Math.sin(ry), ry));
          add('#9ec3ff', new THREE.BoxGeometry(0.86, 0.06, 0.04).rotateX(-0.5), M(x + k * 1.0 * Math.cos(ry), y + 0.86, z - k * 1.0 * Math.sin(ry), ry));
        }
      } else if (kind === 3) {
        // a satellite dish that turns slowly
        const dish = new THREE.Group();
        dish.position.set(x, y, z);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.5, 10), new THREE.MeshToonMaterial({ color: '#d4d6e2', gradientMap: toonRamp() }));
        base.position.y = 0.25;
        const head = new THREE.Group();
        head.position.y = 0.7;
        const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3), new THREE.MeshToonMaterial({ color: '#f4f5fa', gradientMap: toonRamp(), side: THREE.DoubleSide }));
        bowl.rotation.x = Math.PI / 2 + 0.6;
        const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), base.material);
        horn.rotation.x = 0.6 + Math.PI / 2;
        horn.position.set(0, 0.2, 0.25);
        head.add(bowl, horn);
        dish.add(base, head);
        group.add(dish);
        dishes.push(head);
      } else if (kind === 5) {
        // an antenna mast with a blinking light
        add('#c9ccd9', new THREE.CylinderGeometry(0.06, 0.1, 2.6, 6), M(x, y + 1.3, z));
        for (let k = 0; k < 3; k++) add('#c9ccd9', new THREE.BoxGeometry(0.5 - k * 0.12, 0.04, 0.04), M(x, y + 1.6 + k * 0.35, z, ry));
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff5f5f' }));
        light.position.set(x, y + 2.7, z);
        group.add(light);
        blinkers.push(light);
      } else {
        // a little rover
        add('#f4f5fa', new THREE.BoxGeometry(0.9, 0.35, 0.6), M(x, y + 0.45, z, ry));
        add('#ffb347', new THREE.BoxGeometry(0.5, 0.25, 0.45), M(x, y + 0.75, z, ry));
        for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) {
          const c = Math.cos(ry), s = Math.sin(ry);
          add('#3a3f55', new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12).rotateX(Math.PI / 2), M(x + dx * c + dz * s, y + 0.18, z - dx * s + dz * c, ry));
        }
        add('#7cc6ff', new THREE.SphereGeometry(0.1, 8, 6), M(x, y + 0.95, z, ry));
      }
      // moon rocks round about
      if (r() < 0.6) add('#a3a6bd', new THREE.DodecahedronGeometry(0.25 + r() * 0.3, 0), M(x + (r() - 0.5) * 3, y + 0.1, z + (r() - 0.5) * 3, r() * 6));
      placed++;
    }
    // The Earth in the sky above the Moon Base.
    const earth = new THREE.Group();
    earth.position.set(f.cx - 30, f.y + 34, f.cz - 70);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(7, 40, 28), new THREE.MeshBasicMaterial({ color: '#3f8fe0', fog: false }));
    earth.add(globe);
    const land = new THREE.Mesh(new THREE.SphereGeometry(7.04, 40, 28), new THREE.MeshBasicMaterial({ color: '#6fcf7a', fog: false, transparent: true, opacity: 0.95 }));
    // paint continents: keep only some faces of the outer shell
    const idx = land.geometry.index.array, keep = [];
    const pos = land.geometry.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < idx.length; i += 3) {
      v.fromBufferAttribute(pos, idx[i]);
      const n = Math.sin(v.x * 0.55) * Math.cos(v.y * 0.7) + Math.sin(v.z * 0.45 + v.y * 0.3);
      if (n > 0.55) keep.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    land.geometry.setIndex(keep);
    earth.add(land);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(7.8, 32, 20), new THREE.MeshBasicMaterial({ color: '#9fd4ff', transparent: true, opacity: 0.18, side: THREE.BackSide, fog: false }));
    earth.add(glow);
    earth.rotation.z = 0.4;
    group.add(earth);
    group.userData.earth = globe;
  }
  for (const { color, opts, list } of parts.values()) {
    const geo = mergeAll(list);
    const mat = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp() });
    if (opts.emissive) {
      mat.emissive = new THREE.Color(opts.emissive);
      mat.emissiveIntensity = 0.8;
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  group.userData.update = (t) => {
    blinkers.forEach((b, i) => (b.visible = Math.sin(t * 3 + i * 1.7) > 0));
    dishes.forEach((d, i) => (d.rotation.y = Math.sin(t * 0.3 + i) * 1.2));
    if (group.userData.earth) group.userData.earth.parent.rotation.y = t * 0.03;
  };
  return group;
}
