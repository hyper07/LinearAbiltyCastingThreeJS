/**
 * The mountain itself: the faceted terrain (every triangle one flat colour —
 * grass on the terraces, blue-grey rock on the cliffs, sand-stone paths),
 * the ring of peaks around it, the water (a stream down every terrace, a
 * waterfall over every cliff, a pond and a brook below) and the sky.
 */
import * as THREE from 'three';
import { FLOOR_H, GROUND_Y, fbm, noise } from './layout.js';
import { mat, seeded, toonRamp } from './kit.js';

const ROCK = [new THREE.Color('#a9b3e0'), new THREE.Color('#939fd6'), new THREE.Color('#bcc4ec')];
const MOSS = new THREE.Color('#8fd49a');
const VALLEY = [new THREE.Color('#9fe08f'), new THREE.Color('#8ad67f')];
const PATH = new THREE.Color('#ffe9c2');
const BED = new THREE.Color('#7fc6d6');
const tmp = new THREE.Color();

/** Distance from a point to a polyline. */
function distTo(pts, x, z) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

/**
 * @param {ReturnType<import('./layout.js').planMountain>} plan
 * @param {object[]} floors  FLOORS (looks)
 */
export function buildTerrain(plan, floors) {
  const cell = 1.3;
  const last = plan.floors.at(-1);
  const X0 = -150, X1 = 150, Z0 = Math.floor(last.cz - 95), Z1 = 110;
  const nx = Math.round((X1 - X0) / cell), nz = Math.round((Z1 - Z0) / cell);
  const r = seeded(7);
  // Shared grid points, jittered so the facets are not a chessboard.
  const px = new Float32Array((nx + 1) * (nz + 1)), pz = new Float32Array(px.length), py = new Float32Array(px.length);
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const k = j * (nx + 1) + i;
      const edge = i === 0 || j === 0 || i === nx || j === nz;
      const x = X0 + i * cell + (edge ? 0 : (r() - 0.5) * cell * 0.55);
      const z = Z0 + j * cell + (edge ? 0 : (r() - 0.5) * cell * 0.55);
      px[k] = x;
      pz[k] = z;
      py[k] = plan.ground(x, z);
    }
  }
  const tris = nx * nz * 2;
  const pos = new Float32Array(tris * 9);
  const col = new Float32Array(tris * 9);
  const info = new Int8Array(tris); // floor index of a grass triangle, -1 otherwise
  let t = 0;
  const paths = plan.floors.map((f) => f.path);
  const spurs = plan.floors.map((f) => f.spurs ?? []);
  const tri = (a, b, c) => {
    const o = t * 9;
    pos[o] = px[a]; pos[o + 1] = py[a]; pos[o + 2] = pz[a];
    pos[o + 3] = px[b]; pos[o + 4] = py[b]; pos[o + 5] = pz[b];
    pos[o + 6] = px[c]; pos[o + 7] = py[c]; pos[o + 8] = pz[c];
    const cx = (px[a] + px[b] + px[c]) / 3, cz = (pz[a] + pz[b] + pz[c]) / 3, cy = (py[a] + py[b] + py[c]) / 3;
    const spread = Math.max(py[a], py[b], py[c]) - Math.min(py[a], py[b], py[c]);
    let floorIdx = -1;
    const n = noise(cx * 0.35, cz * 0.35);
    if (spread > 0.9) {
      // Cliff: blue-grey rock, lit by which way the facet faces; ledges that face up grow moss.
      const ux = px[b] - px[a], uy = py[b] - py[a], uz = pz[b] - pz[a];
      const vx = px[c] - px[a], vy = py[c] - py[a], vz = pz[c] - pz[a];
      const nxv = uy * vz - uz * vy, nyv = uz * vx - ux * vz, nzv = ux * vy - uy * vx;
      const ny = Math.abs(nyv) / (Math.hypot(nxv, nyv, nzv) || 1);
      // The cliff below a floor wears that floor's rock.
      const owner = floors[Math.max(0, Math.min(floors.length - 1, Math.ceil((cy - 0.5) / FLOOR_H)))].look;
      tmp.set(owner.rock?.[(Math.floor((n + 1) * 1.5)) % 3] ?? ROCK[0]);
      tmp.offsetHSL(0, 0, (nzv > 0 ? 0.03 : -0.03) + ny * 0.06);
      if (cy < 0.5) tmp.copy(ROCK[(Math.floor((n + 1) * 1.5)) % 3]);
      if (ny > 0.62 || (ny > 0.42 && noise(cx * 0.5 + 3, cz * 0.5) > 0.25)) tmp.set(owner.grassDark ?? '#8fd49a').offsetHSL(0, 0, n * 0.04 - 0.05);
    } else {
      const k = Math.round(cy / FLOOR_H);
      const onFloor = k >= 0 && k < plan.floors.length && Math.abs(cy - k * FLOOR_H) < 0.9 && plan.inside(plan.floors[k], cx, cz) > -1;
      if (onFloor) {
        floorIdx = k;
        const look = floors[k].look;
        tmp.set(n > 0.15 ? look.grassDark : look.grass);
        tmp.offsetHSL(0, 0, n * 0.03);
        if (look.craters && noise(cx * 0.18 + 5, cz * 0.18) > 0.45) tmp.set('#a9acbf');
        if (look.theme === 'harbor' && noise(cx * 0.12, cz * 0.12 + 4) > 0.35) tmp.set('#ffe7b0');
        if (look.theme === 'desert' && noise(cx * 0.3, cz * 0.1) > 0.3) tmp.set('#f2c06a');
        const s = plan.river.segments[k];
        if (Math.abs(cx - s.x) < 1.3 && cz > s.z0 - 1 && cz < s.z1 + 1) tmp.copy(BED);
        else if (distTo(paths[k], cx, cz) < 1.45 + noise(cx, cz) * 0.25 || spurs[k].some((sp) => distTo(sp, cx, cz) < 1.0)) {
          tmp.set(look.path ?? '#ffe9c2').offsetHSL(0, 0, n * 0.04);
          floorIdx = -1;
        }
      } else {
        tmp.copy(VALLEY[n > 0 ? 0 : 1]);
        if (cy > GROUND_Y + 12) tmp.lerp(ROCK[0], Math.min(1, (cy - GROUND_Y - 12) / 18));
        if (cy > GROUND_Y + 40) tmp.lerp(new THREE.Color('#f4f7fa'), Math.min(1, (cy - GROUND_Y - 40) / 8));
        if (cy < GROUND_Y - 0.9) tmp.copy(BED);
      }
    }
    for (let v = 0; v < 3; v++) {
      col[o + v * 3] = tmp.r;
      col[o + v * 3 + 1] = tmp.g;
      col[o + v * 3 + 2] = tmp.b;
    }
    info[t] = floorIdx;
    t++;
  };
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      if ((i + j) % 2) {
        tri(a, c, b);
        tri(b, c, d);
      } else {
        tri(a, c, d);
        tri(a, d, b);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const base = col.slice();
  const material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.name = 'terrain';
  /** Dim the grass of locked floors (a cool grey-green), bright again when they open. */
  mesh.userData.setLocked = (locked) => {
    const c = new THREE.Color();
    for (let k = 0; k < tris; k++) {
      const f = info[k];
      for (let v = 0; v < 3; v++) {
        const o = k * 9 + v * 3;
        c.setRGB(base[o], base[o + 1], base[o + 2]);
        if (f >= 0 && locked(f + 1)) {
          const l = c.getHSL({}).l;
          c.lerp(tmp.setHSL(0.45, 0.08, l * 0.85), 0.65);
        }
        col[o] = c.r;
        col[o + 1] = c.g;
        col[o + 2] = c.b;
      }
    }
    geo.attributes.color.needsUpdate = true;
  };
  return mesh;
}

/** The ring of tall faceted peaks, snow on top, and the summit behind the top floor. */
export function buildPeaks(plan) {
  const group = new THREE.Group();
  const r = seeded(21);
  const top = plan.floors.at(-1);
  const spots = [
    [-112, -80, 40, 70], [-130, -170, 46, 100], [-80, -250, 46, 110], [10, -280, 56, 130], [90, -250, 46, 104], [130, -160, 42, 92], [118, -60, 32, 60], [-126, 0, 26, 44], [136, 20, 24, 40], [-60, -295, 36, 90], [70, -305, 36, 96],
    [top.cx - 10, top.cz - 40, 34, top.y + 36], [top.cx + 26, top.cz - 26, 20, top.y + 18], [top.cx - 34, top.cz - 18, 18, top.y + 14]
  ];
  const snow = new THREE.Color('#ffffff'), rock = new THREE.Color('#a3aee0'), rockDark = new THREE.Color('#8b97cf'), green = new THREE.Color('#9fe08f');
  for (const [x, z, rad, h] of spots) {
    const geo = new THREE.ConeGeometry(rad, h - GROUND_Y, 7 + Math.floor(r() * 3), 5, false).toNonIndexed();
    const p = geo.attributes.position;
    const seed = r() * 100;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
      const k = (vy + (h - GROUND_Y) / 2) / (h - GROUND_Y);
      const wob = 1 + fbm(vx * 0.08 + seed, vz * 0.08 + vy * 0.05) * 0.35 * (1 - k);
      if (k < 0.999) p.setXYZ(i, vx * wob + noise(vy * 0.2 + seed, 1) * 2 * (1 - k), vy, vz * wob);
    }
    geo.computeVertexNormals();
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i += 3) {
      const yy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 + (h - GROUND_Y) / 2 + GROUND_Y;
      const c = new THREE.Color().copy(noise(i * 0.37, seed) > 0 ? rock : rockDark);
      if (yy > h - (h - GROUND_Y) * 0.28 + noise(i, seed) * 4) c.copy(snow);
      else if (yy < GROUND_Y + 10) c.lerp(green, 0.6);
      for (let v = 0; v < 3; v++) col.set([c.r, c.g, c.b], (i + v) * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() }));
    m.position.set(x, GROUND_Y + (h - GROUND_Y) / 2 - 1, z);
    m.rotation.y = r() * Math.PI;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

/* ---------------------------------------------------------------- water */

const waterUniforms = { uTime: { value: 0 }, uNight: { value: 0 } };
export const waterClock = waterUniforms;

function waterMaterial({ fall = false } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: !fall,
    side: fall ? THREE.DoubleSide : THREE.FrontSide,
    uniforms: { ...waterUniforms, uFall: { value: fall ? 1 : 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vWorld;
      void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uNight; uniform float uFall;
      varying vec2 vUv; varying vec3 vWorld;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main() {
        vec3 deep = mix(vec3(0.33, 0.70, 0.78), vec3(0.10, 0.20, 0.42), uNight);
        vec3 light = mix(vec3(0.62, 0.90, 0.92), vec3(0.30, 0.45, 0.70), uNight);
        float speed = uFall > 0.5 ? 2.6 : 0.55;
        vec2 p = vec2(vUv.x * (uFall > 0.5 ? 6.0 : 3.0), vUv.y * (uFall > 0.5 ? 3.0 : 6.0) - uTime * speed);
        float streak = n(p * vec2(1.0, 2.0)) * 0.6 + n(p * 3.1) * 0.4;
        float edge = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
        vec3 c = mix(deep, light, streak);
        float foam = smoothstep(0.62, 0.86, streak) * (uFall > 0.5 ? 1.0 : 0.55);
        foam += (1.0 - edge) * 0.55;
        if (uFall > 0.5) foam += smoothstep(0.82, 1.0, 1.0 - vUv.y) * 0.9;
        c = mix(c, vec3(0.96, 0.99, 1.0) * mix(1.0, 0.7, uNight), clamp(foam, 0.0, 1.0));
        float a = uFall > 0.5 ? 0.86 * edge + 0.1 : 0.88;
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`
  });
}

/** The stream down every terrace, the falls over every cliff, the pond and the brook. */
export function buildWater(plan) {
  const group = new THREE.Group();
  group.name = 'water';
  const flat = waterMaterial();
  const fall = waterMaterial({ fall: true });
  for (const s of plan.river.segments) {
    const len = s.z1 - s.z0;
    const g = new THREE.PlaneGeometry(2.3, len, 2, Math.ceil(len));
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, flat);
    m.position.set(s.x, s.y - 0.32, (s.z0 + s.z1) / 2);
    group.add(m);
  }
  for (const f of plan.river.falls) {
    const h = f.top - f.bottom;
    // A sheet curving out over the lip and down the face of the cliff.
    const g = new THREE.PlaneGeometry(2.4, h + 0.6, 3, Math.ceil(h * 1.5));
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const k = (h / 2 + 0.3 - y) / (h + 0.6); // 0 at the lip, 1 at the bottom
      p.setZ(i, Math.sin(Math.min(1, k * 3) * Math.PI / 2) * 1.6 + k * 0.6 + noise(p.getX(i) * 2, y) * 0.08);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, fall);
    m.position.set(f.x, f.bottom + h / 2 - 0.1, f.z - 0.4);
    group.add(m);
  }
  const L = plan.river.lake;
  const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 24), flat);
  lake.geometry.rotateX(-Math.PI / 2);
  lake.scale.set(L.r / 0.9 + 2.5, 1, L.r + 2.5);
  lake.position.set(L.x, L.y, L.z);
  group.add(lake);
  // The brook: a ribbon down the polyline.
  const pts = plan.river.brook.map(([x, z]) => new THREE.Vector3(x, L.y - 0.05, z));
  pts.unshift(new THREE.Vector3(L.x, L.y - 0.05, L.z));
  const curve = new THREE.CatmullRomCurve3(pts);
  const N = 80;
  const verts = [], uvs = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const p = curve.getPoint(i / N), tng = curve.getTangent(i / N);
    const side = new THREE.Vector3(-tng.z, 0, tng.x).normalize().multiplyScalar(1.6);
    verts.push(p.x - side.x, p.y, p.z - side.z, p.x + side.x, p.y, p.z + side.z);
    uvs.push(0, i / 6, 1, i / 6);
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  bg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  bg.setIndex(idx);
  group.add(new THREE.Mesh(bg, flat));
  // Foam where each fall lands: soft white puffs that bob.
  const foamMat = mat('#ffffff', { rough: 1, opacity: 0.8, key: 'foam' });
  const foamGeo = new THREE.IcosahedronGeometry(0.5, 0);
  group.userData.foam = [];
  for (const f of plan.river.falls) {
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(foamGeo, foamMat);
      m.position.set(f.x + (k - 2.5) * 0.45, f.bottom - 0.15, f.z + 1.6 + (k % 2) * 0.5);
      m.userData.phase = k * 1.1 + f.floor;
      group.add(m);
      group.userData.foam.push(m);
    }
  }
  group.userData.update = (time) => {
    waterUniforms.uTime.value = time;
    for (const m of group.userData.foam) {
      const s = 0.7 + 0.35 * Math.sin(time * 4 + m.userData.phase);
      m.scale.set(s * 1.3, s * 0.6, s);
    }
  };
  return group;
}

/* ---------------------------------------------------------------- sky */

export function buildSky() {
  const uniforms = { uTop: { value: new THREE.Color('#8fd3ff') }, uMid: { value: new THREE.Color('#d9f3ff') }, uBottom: { value: new THREE.Color('#fff4dc') } };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms,
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom; varying vec3 vP;
        void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(uMid, uTop, smoothstep(0.0, 0.55, y)) : mix(uMid, uBottom, smoothstep(0.0, -0.3, y));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
        }`
    })
  );
  sky.renderOrder = -10;
  // Stars, seen only at night.
  const r = seeded(99);
  const n = 900;
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2;
    const y = Math.abs(u) * 0.95 + 0.05;
    const s = Math.sqrt(1 - y * y);
    p.set([Math.cos(a) * s * 560, y * 560, Math.sin(a) * s * 560], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: '#fff6d8', transparent: true, opacity: 0, fog: false, depthWrite: false }));
  moon.position.set(-220, 260, -420);
  moon.lookAt(0, 0, 0);
  const group = new THREE.Group();
  group.add(sky, stars, moon);
  group.userData = { uniforms, stars, moon };
  return group;
}
