/**
 * The Moon in 3D: grey-white regolith pocked with craters big and small,
 * boulders, boot prints and rover tracks; rounded highlands on the near
 * horizon; a black sky full of stars with the Sun, and the big blue-and-white
 * Earth hanging low over the hills to the north.
 *
 * Seven moonbases stand in seven round craters on a ring: in each, a landing
 * pad in the middle, a circular walk with rails on the crater's inner
 * terrace, gangways out to the schools' and places' own pads. Pressurised
 * glass tubes join each crater to the next through notches in the rims, an
 * airlock at the start of each. On the plain inside the ring stand the giant
 * landmarks everyone can see: the Big Rocket on its launch pad and tower, the
 * Moon Lander, the Radio Telescope, and the Moon Rover driving its loop round
 * the rocket, with flagged rover roads out to the craters.
 *
 * What you walk on (every deck top, all at one height with the same
 * world-aligned plates, so where two meet nothing flickers) is kept in
 * `walk`, so clicks find it; each moonbase's parts are grouped so a locked
 * one can be greyed. `dust(x, y, z, size)` kicks up a puff of moon dust
 * (World.js calls it when someone lands from a low-gravity hop).
 */
import * as THREE from 'three';
import { add, batch, box, cyl, mat, seeded, sphere, toonRamp } from '../kit.js';
import { lampMat } from '../buildings.js';
import { noise, fbm } from '../layout.js';
import { patchCutout } from '../cutout.js';
import { MOON, LANDMARKS, EARTH, PADS, SPOKES } from './plan.js';
import { LUNA, painted, tmat, tile, airlockGate, rocketModel, landerModel, roverModel, dishModel } from './buildings.js';

const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ---------------------------------------------------------------- decks you walk on */

let plateMat = null;
/** The deck plates every walking top shares: texture laid in world space, so overlaps match exactly. */
function plates() {
  if (!plateMat) plateMat = new THREE.MeshToonMaterial({ map: painted('plates', '#e6eaf1'), gradientMap: toonRamp() });
  return plateMat;
}
/** A flat walking top: a geometry lying in XZ, placed in the world, its UVs from world x and z. */
function top(parent, geo, y) {
  geo.translate(0, y, 0);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 4, p.getZ(i) / 4);
  const m = new THREE.Mesh(geo, plates());
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const disc = (cx, cz, r, seg = 48) => {
  const g = new THREE.CircleGeometry(r, seg);
  g.rotateX(-Math.PI / 2);
  g.translate(cx, 0, cz);
  return g;
};
const ringGeo = (cx, cz, r0, r1, seg = 160) => {
  const g = new THREE.RingGeometry(r0, r1, seg, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(cx, 0, cz);
  return g;
};
/** A strip from a to b, `w` wide, lying in XZ. */
const strip = (ax, az, bx, bz, w) => {
  const len = Math.hypot(bx - ax, bz - az);
  const g = new THREE.PlaneGeometry(w, len);
  g.rotateX(-Math.PI / 2);
  g.rotateY(Math.atan2(bx - ax, bz - az));
  g.translate((ax + bx) / 2, 0, (az + bz) / 2);
  return g;
};
const side = () => tmat('plates', '#c9d0db');
let sideInMat = null;
const sideInside = () => (sideInMat ??= new THREE.MeshToonMaterial({ map: painted('plates', '#c9d0db'), gradientMap: toonRamp(), side: THREE.BackSide }));
/** A round deck's side (an open cylinder) from y0 up to y. */
function drum(parent, cx, cz, r, y, y0, seg = 48, inside = false) {
  add(parent, tile(new THREE.CylinderGeometry(r, r, y - y0, seg, 1, true), Math.max(2, Math.round((TAU * r) / 4)), 0.4), inside ? sideInside() : side(), [cx, (y + y0) / 2, cz]);
}
/** The two sides of a straight walkway, from y0 up to y. */
function walls(parent, ax, az, bx, bz, w, y, y0) {
  const len = Math.hypot(bx - ax, bz - az);
  const yaw = Math.atan2(bx - ax, bz - az);
  const h = y - y0;
  for (const s of [-1, 1]) {
    const ox = Math.cos(yaw) * s * (w / 2), oz = -Math.sin(yaw) * s * (w / 2);
    add(parent, tile(new THREE.PlaneGeometry(len, h), Math.max(1, len / 4), 0.4), tmat('plates', '#c9d0db', '#2b2f3a', { side: THREE.DoubleSide }), [(ax + bx) / 2 + ox, (y + y0) / 2, (az + bz) / 2 + oz], [0, yaw + Math.PI / 2, 0]);
  }
}
/** Paint lying on a deck top (drawn over it, never fighting it). */
function inlay(color, map = null) {
  return new THREE.MeshToonMaterial({ color, map, gradientMap: toonRamp(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
}

/* ---------------------------------------------------------------- the ground */

/** The ground's height and look: the base craters, the tube notches, small craters, the far highlands. */
function groundField(plan) {
  const segs = plan.stairs.flatMap((s) => s.segs);
  const segDist = (x, z) => {
    let best = Infinity;
    for (const L of segs) {
      const ox = x - L.ax, oz = z - L.az;
      const a = Math.max(0, Math.min(L.len, ox * L.dx + oz * L.dz));
      best = Math.min(best, Math.hypot(ox - L.dx * a, oz - L.dz * a));
    }
    return best;
  };
  const sites = [LANDMARKS.rocket, LANDMARKS.lander, LANDMARKS.dish];
  const siteDist = (x, z) => Math.min(...sites.map((s) => Math.hypot(x - s.x, z - s.z) - s.r), Math.abs(Math.hypot(x, z) - LANDMARKS.rover.loop) - 5);
  const baseDist = (x, z) => Math.min(...plan.floors.map((f) => Math.hypot(x - f.centre.x, z - f.centre.z)));
  // Small craters: mostly little ones, a few big; clear of the decks, the tubes and the giant landmarks.
  const r = seeded(4242);
  const small = [];
  for (let tries = 0; tries < 4000 && small.length < 520; tries++) {
    const a = r() * TAU, d = Math.sqrt(r()) * 700;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    const R = 1.4 + 26 * Math.pow(r(), 3.2) * (d > 260 ? 1.6 : 1);
    if (segDist(x, z) < R * 1.6 + 6 || siteDist(x, z) < R * 1.4 + 3) continue;
    const b = baseDist(x, z);
    // On a base's crater floor only little ones, and only where no deck is near.
    if (b < MOON.outR + R * 1.2) {
      if (R > 3.2 || b > MOON.floorR - R * 1.5) continue;
      let clear = true;
      for (let k = 0; k < 9 && clear; k++) {
        const aa = (k / 8) * TAU, rr = k ? R * 1.5 + 2.5 : 0;
        if (plan.surfaces(x + Math.sin(aa) * rr, z + Math.cos(aa) * rr).length) clear = false;
      }
      if (!clear) continue;
    }
    if (small.some((c) => Math.hypot(c.x - x, c.z - z) < (c.r + R) * 0.8)) continue;
    small.push({ x, z, r: R });
  }
  // Bucket them for the per-vertex lookup.
  const CELL = 40, buckets = new Map();
  const keyOf = (i, j) => i * 10007 + j;
  for (const c of small) {
    const reach = c.r * 2;
    for (let i = Math.floor((c.x - reach) / CELL); i <= Math.floor((c.x + reach) / CELL); i++) for (let j = Math.floor((c.z - reach) / CELL); j <= Math.floor((c.z + reach) / CELL); j++) {
      const k = keyOf(i, j);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(c);
    }
  }
  const earthAz = Math.atan2(EARTH.x, -EARTH.z);
  const { floorR, crestR, outR, rimH } = MOON;
  /** The ground at a point: its height, and what it is (crater bowl, rim, maria, small-crater shading). */
  function at(x, z) {
    let rim = 0, inBase = 0;
    for (const f of plan.floors) {
      const dx = x - f.centre.x, dz = z - f.centre.z;
      const rr = Math.hypot(dx, dz);
      if (rr > outR + 2) continue;
      const ang = Math.atan2(dx, dz);
      const wob = 1 + 0.12 * noise(ang * 3 + f.n * 5, f.n);
      // Lower on the outer side, where the camera stands looking in: an amphitheatre, not a wall.
      const low = 1 - 0.6 * smooth(0.1, 0.85, Math.cos(ang - f.theta));
      rim += rimH * wob * low * (smooth(floorR, crestR, rr) - smooth(crestR, outR, rr));
      inBase = Math.max(inBase, 1 - smooth(floorR - 3, floorR + 3, rr));
    }
    const dT = segDist(x, z);
    const notch = smooth(4.2, 14, dT);
    const near = Math.min(baseDist(x, z) - outR + 10, dT - 7, siteDist(x, z));
    const flat = smooth(2, 45, near);
    const swell = fbm(x * 0.0065 + 3.1, z * 0.0065 - 7.3) * 6 + fbm(x * 0.03 + 1, z * 0.03 + 2) * 0.9;
    let y = rim * notch + flat * swell + 0.16 * fbm(x * 0.11, z * 0.11) - 0.12;
    // Small craters: a bowl and a raised lip.
    let shade = 0;
    const list = buckets.get(keyOf(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (list) for (const c of list) {
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d > 2) continue;
      const D = Math.min(4, 0.24 * c.r), h = Math.min(1.4, 0.075 * c.r);
      const v = d < 1 ? -D * (1 - d * d) + h * d ** 4 : h * Math.exp(-(((d - 1) / 0.38) ** 2));
      y += v;
      shade += d < 1 ? -(1 - d) * 0.6 : Math.exp(-(((d - 1) / 0.25) ** 2)) * 0.35;
    }
    // The highlands on the horizon (lower to the north, where the Earth rises over them).
    const dist = Math.hypot(x, z);
    if (dist > 480) {
      const far = smooth(480, 1050, dist);
      const az = Math.atan2(x, -z);
      let dA = Math.abs(az - earthAz);
      if (dA > Math.PI) dA = TAU - dA;
      const k = 1 - 0.62 * Math.exp(-((dA / 0.3) ** 2));
      y += far * k * (10 + 30 * Math.max(0, fbm(x * 0.0042 + 9, z * 0.0042 - 2) + 0.45)) + far * 4 * fbm(x * 0.02, z * 0.02);
    }
    const maria = smooth(0.05, 0.35, fbm(x * 0.0028 + 20, z * 0.0028 - 11));
    return { y, rim, inBase, shade, maria };
  }
  return { at, small, segDist };
}

function ground(field) {
  const N = 520;
  const g = new THREE.PlaneGeometry(2, 2, N, N);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  const colors = new Float32Array(p.count * 3);
  const C = (h) => new THREE.Color(h);
  const lo = C('#8c8e99'), hi = C('#bdbfc8'), mare = C('#777985'), rimC = C('#d9dbe2'), bowl = C('#7f818d'), floorC = C('#a4a6b0');
  const col = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getZ(i);
    const x = 300 * u + 960 * u ** 7, z = 300 * v + 960 * v ** 7;
    const s = field.at(x, z);
    p.setXYZ(i, x, s.y, z);
    const k = 0.5 + 0.5 * fbm(x * 0.02 + 5, z * 0.02 - 5);
    col.copy(lo).lerp(hi, Math.min(1, k * 0.9 + 0.15));
    col.lerp(mare, s.maria * 0.55 * (1 - s.inBase));
    col.lerp(floorC, s.inBase * 0.6);
    col.lerp(rimC, Math.min(1, s.rim / MOON.rimH) * 0.55);
    if (s.shade < 0) col.lerp(bowl, Math.min(1, -s.shade));
    else col.lerp(rimC, Math.min(1, s.shade));
    colors.set([col.r, col.g, col.b], i * 3);
    uv.setXY(i, x / 7, z / 7);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, map: painted('regolith') }));
  m.receiveShadow = true;
  m.name = 'moon-ground';
  return m;
}

/* ---------------------------------------------------------------- the sky: stars, the Sun, the Earth */

function stars() {
  const g = new THREE.Group();
  const r = seeded(808);
  for (const [n, size] of [[2600, 1.7], [320, 3.0], [40, 4.4]]) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const tint = [new THREE.Color('#ffffff'), new THREE.Color('#cfe0ff'), new THREE.Color('#fff1d0'), new THREE.Color('#ffd9e6')];
    for (let i = 0; i < n; i++) {
      const y = -0.12 + r() * 1.12, a = r() * TAU, s = Math.sqrt(1 - y * y);
      pos.set([Math.cos(a) * s * 1450, y * 1450, Math.sin(a) * s * 1450], i * 3);
      const c = tint[Math.floor(r() * tint.length)].clone().multiplyScalar(0.6 + r() * 0.4);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
    pts.frustumCulled = false;
    pts.renderOrder = -9;
    g.add(pts);
  }
  return g;
}

/** A soft round glow (for the Sun). */
function glowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.18, inner);
  grad.addColorStop(0.32, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function sun(dir) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,250,1)', 'rgba(255,236,190,0.35)'), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  s.position.copy(dir).multiplyScalar(1300);
  s.scale.setScalar(210);
  s.renderOrder = -8;
  return s;
}

/** The Earth's face: deep blue seas, green and sandy lands, white swirls of cloud, ice at the poles (invented shapes). */
function earthTexture() {
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const sea = new THREE.Color('#2367d1'), seaLight = new THREE.Color('#3c93f0'), land = new THREE.Color('#5fb85a'), sand = new THREE.Color('#d8c07e'), ice = new THREE.Color('#f4f8ff');
  const col = new THREE.Color();
  for (let j = 0; j < H; j++) {
    const lat = (0.5 - j / H) * Math.PI;
    for (let i = 0; i < W; i++) {
      const lon = (i / W) * TAU;
      const nx = Math.cos(lat) * Math.cos(lon), ny = Math.sin(lat), nz = Math.cos(lat) * Math.sin(lon);
      const n = fbm(nx * 1.6 + nz * 0.8 + 4, ny * 1.7 - nz * 1.2 + 9) + 0.25 * fbm(nx * 5 + 1, ny * 5 + nz * 4);
      col.copy(sea).lerp(seaLight, smooth(-0.3, 0.1, n));
      if (n > 0.12) col.copy(land).lerp(sand, smooth(0.0, 0.7, Math.abs(ny) < 0.45 ? fbm(nx * 4 + 7, nz * 4) + 0.3 : 0));
      const cl = fbm(nx * 3.2 + ny * 2 + 13, nz * 3.2 - ny * 2.5 + 3) + 0.4 * Math.sin(ny * 9 + nx * 3);
      col.lerp(new THREE.Color('#ffffff'), smooth(0.18, 0.5, cl) * 0.92);
      col.lerp(ice, smooth(0.78, 0.86, Math.abs(ny)));
      const k = (j * W + i) * 4;
      img.data[k] = col.r * 255;
      img.data[k + 1] = col.g * 255;
      img.data[k + 2] = col.b * 255;
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function earth() {
  const g = new THREE.Group();
  g.position.set(EARTH.x, EARTH.y, EARTH.z);
  const m = new THREE.MeshLambertMaterial({ map: earthTexture(), emissive: new THREE.Color('#2a56b0'), emissiveIntensity: 0.32, fog: false });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(EARTH.r, 64, 40), m);
  ball.rotation.set(0.35, 2.4, 0.2);
  g.add(ball);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH.r * 1.1, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: { uK: { value: 1 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); gl_Position = projectionMatrix * w; }',
      fragmentShader: 'uniform float uK; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(clamp(1.0 - abs(dot(vN, vV)), 0.0, 1.0), 1.6); float a = smoothstep(0.0, 0.55, 1.0 - abs(dot(vN, vV))) * (1.0 - f * 0.4); gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * a * 0.75 * uK, 1.0); }'
    })
  );
  g.add(halo);
  g.userData = { material: m, halo };
  return g;
}

/* ---------------------------------------------------------------- glass */

/** The tubes' glass: almost clear face-on, brighter at the edges, a soft sheen. */
function glassMaterial() {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uNight: { value: 0 } }]);
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
    vertexShader: `varying vec3 vN; varying vec3 vV;
      #include <fog_pars_vertex>
      void main(){ vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mvPosition.xyz); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uNight; varying vec3 vN; varying vec3 vV;
      #include <fog_pars_fragment>
      void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = 0.1 + 0.6 * pow(f, 2.2);
        vec3 c = mix(vec3(0.86, 0.96, 1.0), vec3(0.55, 0.8, 1.0), uNight);
        gl_FragColor = vec4(c, a);
        #include <fog_fragment>
      }`
  });
}

/* ---------------------------------------------------------------- boot prints and tracks */

/** Flat marks lying on the ground: quads of a see-through texture, all in one mesh per texture. */
class Marks {
  constructor(field) {
    this.field = field;
    this.lists = new Map();
  }
  /** One quad: centre, size (w across, l along), direction. */
  quad(kind, x, z, w, l, yaw, v0 = 0, v1 = 1) {
    const list = this.lists.get(kind) ?? [];
    this.lists.set(kind, list);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const corners = [[-w / 2, -l / 2, 0, v0], [w / 2, -l / 2, 1, v0], [w / 2, l / 2, 1, v1], [-w / 2, l / 2, 0, v1]];
    const pts = corners.map(([a, b, u, v]) => {
      const px = x + a * c + b * s, pz = z - a * s + b * c;
      return [px, this.field.at(px, pz).y + 0.05, pz, u, v];
    });
    list.push(pts);
  }
  /** A pair of tracks (or one) along a polyline. */
  track(pts, width = 0.9, gauge = 2.6, pair = true) {
    let run = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
      const len = Math.hypot(bx - ax, bz - az);
      const yaw = Math.atan2(bx - ax, bz - az);
      const nx = Math.cos(yaw), nz = -Math.sin(yaw);
      const steps = Math.max(1, Math.ceil(len / 3));
      for (let k = 0; k < steps; k++) {
        const t0 = k / steps, t1 = (k + 1) / steps;
        const mx = ax + (bx - ax) * (t0 + t1) / 2, mz = az + (bz - az) * (t0 + t1) / 2;
        const l = len / steps;
        for (const sgn of pair ? [-1, 1] : [0]) this.quad('track', mx + nx * sgn * gauge / 2, mz + nz * sgn * gauge / 2, width, l + 0.05, yaw, run / 3, (run + l) / 3);
        run += l;
      }
    }
  }
  /** A trail of boot prints along a polyline, left and right. */
  steps(pts, stride = 0.8) {
    let i = 0;
    for (let s = 1; s < pts.length; s++) {
      const [ax, az] = pts[s - 1], [bx, bz] = pts[s];
      const len = Math.hypot(bx - ax, bz - az);
      const yaw = Math.atan2(bx - ax, bz - az);
      for (let d = 0; d < len; d += stride, i++) {
        const sgn = i % 2 ? 1 : -1;
        const x = ax + (bx - ax) * (d / len) + Math.cos(yaw) * sgn * 0.18, z = az + (bz - az) * (d / len) - Math.sin(yaw) * sgn * 0.18;
        this.quad('boot', x, z, 0.3, 0.42, yaw);
      }
    }
  }
  build() {
    const out = new THREE.Group();
    for (const [kind, list] of this.lists) {
      const pos = [], uv = [], idx = [];
      for (const q of list) {
        const k = pos.length / 3;
        for (const [x, y, z, u, v] of q) {
          pos.push(x, y, z);
          uv.push(u, v);
        }
        idx.push(k, k + 2, k + 1, k, k + 3, k + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: painted(kind), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
      m.receiveShadow = true;
      m.renderOrder = 1;
      out.add(m);
    }
    return out;
  }
}

/** A little pennant on a pole (no real flags: two colours and a star). */
function pennant(parent, x, y, z, color, yaw = 0) {
  add(parent, cyl(0.05, 0.06, 2.6, 6), mat('#e8ecf2'), [x, y + 1.3, z]);
  const q = new THREE.Group();
  q.position.set(x, y + 2.5, z);
  q.rotation.y = yaw;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(1.2, -0.3);
  s.lineTo(0, -0.6);
  add(q, new THREE.ShapeGeometry(s), mat(color, { side: THREE.DoubleSide }), [0.05, 0, 0]);
  add(q, sphere(0.09, 8, 6), mat(LUNA.gold, { metal: 0.6 }), [0, 0.1, 0]);
  parent.add(q);
}

/** A boulder: a lumpy grey rock. */
function boulder(parent, x, y, z, s, seed) {
  const r = seeded(seed);
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.82 + 0.3 * Math.abs(Math.sin(p.getX(i) * 3.1 + seed) * Math.cos(p.getZ(i) * 2.7 + p.getY(i) * 1.9 + seed));
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  const tones = ['#9c9ea9', '#8a8c97', '#b2b4be', '#a3a5b0'];
  add(parent, geo, mat(tones[Math.floor(r() * tones.length)], { rough: 1 }), [x, y + s * 0.45, z], [r() * 3, r() * 3, r() * 3], [s * (0.9 + r() * 0.4), s * (0.6 + r() * 0.3), s * (0.9 + r() * 0.4)]);
}

/* ---------------------------------------------------------------- a moonbase */

function moonbase(w, deco, marks, f, look, plan, field) {
  const { hubR, walkR, walkW, deck: y } = MOON;
  const { x: cx, z: cz } = f.centre;
  const below = -0.5;
  // The middle landing pad.
  drum(w, cx, cz, hubR, y, below, 64);
  top(w, disc(cx, cz, hubR, 64), y);
  add(deco, new THREE.RingGeometry(hubR - 1.2, hubR - 0.7, 96), inlay(look.banner), [cx, y + 0.004, cz], [-Math.PI / 2, 0, 0]);
  add(deco, new THREE.RingGeometry(hubR - 0.55, hubR - 0.2, 96), inlay('#ffffff', painted('hazard', '#ffcf3f', '#2b2f3a')), [cx, y + 0.004, cz], [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    add(deco, cyl(0.12, 0.14, 0.1, 8), lampMat, [cx + Math.sin(a) * (hubR - 0.95), y + 0.05, cz + Math.cos(a) * (hubR - 0.95)]);
  }
  // The circular walk on the terrace: a deck ring, its sides.
  const r0 = walkR - walkW / 2, r1 = walkR + walkW / 2;
  drum(w, cx, cz, r1, y, below, 160);
  drum(w, cx, cz, r0, y, below, 160, true);
  top(w, ringGeo(cx, cz, r0, r1), y);
  add(deco, new THREE.RingGeometry(walkR - 0.06, walkR + 0.06, 160), inlay(LUNA.teal), [cx, y + 0.004, cz], [-Math.PI / 2, 0, 0]);
  // Rails round both edges of the walk, with gaps where gangways and tubes leave.
  const theta = f.theta;
  const outerGaps = [...PADS.map((p) => p.a), 90, -90].map((a) => ({ a: theta + a * D2R, half: 2.3 / r1 }));
  const innerGaps = SPOKES.map((a) => ({ a: theta + a * D2R, half: 2.1 / r0 }));
  const inGap = (gaps, a) => gaps.some((gp) => Math.abs(Math.atan2(Math.sin(a - gp.a), Math.cos(a - gp.a))) < gp.half);
  const post = mat('#f2f4f8'), rail = mat(look.banner);
  const railRing = (R, gaps, n, lampEvery) => {
    const posts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      posts.push(inGap(gaps, a) ? null : a);
    }
    posts.forEach((a, i) => {
      if (a == null) return;
      const x = cx + Math.sin(a) * R, z = cz + Math.cos(a) * R;
      add(deco, cyl(0.06, 0.07, 0.95, 6), post, [x, y + 0.47, z]);
      if (i % lampEvery === 0) add(deco, sphere(0.12, 8, 6), lampMat, [x, y + 1.02, z]);
      const b = posts[(i + 1) % n];
      if (b == null) return;
      const x1 = cx + Math.sin(b) * R, z1 = cz + Math.cos(b) * R;
      const len = Math.hypot(x1 - x, z1 - z);
      add(deco, box(0.07, 0.07, len), rail, [(x + x1) / 2, y + 0.92, (z + z1) / 2], [0, Math.atan2(x1 - x, z1 - z), 0]);
      add(deco, box(0.04, 0.04, len), post, [(x + x1) / 2, y + 0.5, (z + z1) / 2], [0, Math.atan2(x1 - x, z1 - z), 0]);
    });
  };
  railRing(r1 - 0.1, outerGaps, 72, 6);
  railRing(r0 + 0.1, innerGaps, 56, 7);
  // The gangways: plate tops, sides, rails.
  for (const L of f.links) {
    const a0 = L.to ? r1 - walkR + 0.1 : 1.0, a1 = L.to ? L.len - f.pads[L.to].pr + 0.1 : L.len - (walkR - r0) - 0.1;
    top(w, strip(L.ax, L.az, L.bx, L.bz, L.width), y);
    walls(w, L.ax + L.dx * a0, L.az + L.dz * a0, L.ax + L.dx * a1, L.az + L.dz * a1, L.width, y - 0.002, below);
    for (const s of [-1, 1]) {
      const ox = L.dz * s * (L.width / 2 - 0.08), oz = -L.dx * s * (L.width / 2 - 0.08);
      const len = a1 - a0;
      if (len < 1) continue;
      const mx = L.ax + L.dx * (a0 + a1) / 2 + ox, mz = L.az + L.dz * (a0 + a1) / 2 + oz;
      const yaw = Math.atan2(L.dx, L.dz);
      add(deco, box(0.07, 0.07, len), rail, [mx, y + 0.92, mz], [0, yaw, 0]);
      for (let d = 0; d <= len; d += Math.max(1, len / Math.ceil(len / 2.4))) add(deco, cyl(0.06, 0.07, 0.95, 6), post, [L.ax + L.dx * (a0 + d) + ox, y + 0.47, L.az + L.dz * (a0 + d) + oz]);
    }
  }
  // The pads: drums, plate tops, a hazard ring, landing lights.
  for (const id in f.pads) {
    const p = f.pads[id];
    drum(w, p.x, p.z, p.pr, y, below, 48);
    top(w, disc(p.x, p.z, p.pr, 48), y);
    add(deco, new THREE.RingGeometry(p.pr - 0.5, p.pr - 0.18, 64), inlay('#ffffff', painted('hazard', '#ffcf3f', '#2b2f3a')), [p.x, y + 0.004, p.z], [-Math.PI / 2, 0, 0]);
    const n = Math.round(p.pr * 1.6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + 0.2;
      add(deco, cyl(0.08, 0.1, 0.08, 8), lampMat, [p.x + Math.sin(a) * (p.pr - 0.75), y + 0.04, p.z + Math.cos(a) * (p.pr - 0.75)]);
    }
  }
  // The crater floor: boulders, crates, a pennant, boot prints between the pads, a little rover loop.
  const r = seeded(f.n * 131);
  const clear = (x, z, d) => {
    for (const [ox, oz] of [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d], [d * 0.7, d * 0.7], [-d * 0.7, d * 0.7], [d * 0.7, -d * 0.7], [-d * 0.7, -d * 0.7]]) if (plan.surfaces(x + ox, z + oz).length) return false;
    return field.segDist(x, z) > d + 3;
  };
  let rocks = 0;
  for (let tries = 0; tries < 600 && rocks < 26; tries++) {
    const a = r() * TAU, d = 13 + r() * 33;
    const x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d;
    const s = 0.4 + r() * 1.2;
    if (!clear(x, z, s + 1.2)) continue;
    boulder(deco, x, field.at(x, z).y - 0.1, z, s, f.n * 1000 + rocks);
    rocks++;
  }
  let crates = 0;
  for (let tries = 0; tries < 300 && crates < 5; tries++) {
    const a = r() * TAU, d = 30 + r() * 14;
    const x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d;
    if (!clear(x, z, 2.4)) continue;
    const gy = field.at(x, z).y;
    const yaw = r() * TAU;
    add(deco, box(1.2, 0.9, 1.0), mat('#eef1f6'), [x, gy + 0.45, z], [0, yaw, 0]);
    add(deco, box(1.22, 0.18, 1.02), mat(crates % 2 ? LUNA.orange : LUNA.teal), [x, gy + 0.6, z], [0, yaw, 0]);
    if (crates % 2) add(deco, box(0.8, 0.6, 0.7), mat('#dfe4ec'), [x + Math.sin(yaw + 1.2) * 1.1, gy + 0.3, z + Math.cos(yaw + 1.2) * 1.1], [0, yaw + 0.4, 0]);
    crates++;
  }
  for (let tries = 0, n = 0; tries < 200 && n < 2; tries++) {
    const a = r() * TAU, d = 16 + r() * 8;
    const x = cx + Math.sin(a) * d, z = cz + Math.cos(a) * d;
    if (!clear(x, z, 1.6)) continue;
    pennant(deco, x, field.at(x, z).y, z, n ? LUNA.teal : look.banner, r() * TAU);
    n++;
  }
  // Boot prints wandering between the walk and the rim, and a small rover loop on the crater floor.
  for (let k = 0; k < 4; k++) {
    const a0 = r() * TAU;
    const pts = [];
    for (let i = 0; i < 9; i++) {
      const a = a0 + i * 0.11, d = 29.5 + Math.sin(i * 0.9 + k) * 1.6 + (i > 6 ? (i - 6) * 3 : 0);
      pts.push([cx + Math.sin(a) * d, cz + Math.cos(a) * d]);
    }
    if (pts.every(([x, z]) => clear(x, z, 0.6))) marks.steps(pts);
  }
  const loop = [];
  for (let i = 0; i <= 40; i++) {
    const a = theta + 180 * D2R + (i / 40) * 1.4 - 0.7;
    loop.push([cx + Math.sin(a) * 43.5, cz + Math.cos(a) * 43.5]);
  }
  const ok = loop.filter(([x, z]) => clear(x, z, 1.4));
  if (ok.length > 10) marks.track(ok, 0.5, 1.3);
}

/* ---------------------------------------------------------------- the glass tubes */

function tube(w, deco, glass, s, look, field) {
  const { deck: y, tubeR } = MOON;
  const cy = y + 1.2;
  for (const L of s.segs) {
    top(w, strip(L.ax, L.az, L.bx, L.bz, L.width), y);
    walls(w, L.ax, L.az, L.bx, L.bz, L.width, y - 0.002, -0.7);
  }
  for (let i = 1; i < s.pts.length - 1; i++) {
    const [x, z] = s.pts[i];
    top(w, disc(x, z, s.width / 2, 24), y);
    drum(w, x, z, s.width / 2, y, -0.7, 24);
  }
  // Glass from the airlock to the far end, ribs and floor lights along it, legs underneath.
  const total = s.segs.reduce((t, L) => t + L.len, 0);
  const g0 = 4, g1 = total - 4;
  const white = mat('#f4f6fa'), ribM = mat('#e4e9f1', { rough: 0.4, metal: 0.4 }), stripe = mat(look.banner);
  let run = 0;
  for (const [i, L] of s.segs.entries()) {
    const a0 = Math.max(0, g0 - run), a1 = Math.min(L.len, g1 - run);
    if (a1 > a0) {
      // Long glass, a touch past each bend so the joints close.
      const e0 = a0 - (i > 0 ? 0.6 : 0), e1 = a1 + (i < s.segs.length - 1 ? 0.6 : 0);
      const len = e1 - e0;
      const mx = L.ax + L.dx * (e0 + e1) / 2, mz = L.az + L.dz * (e0 + e1) / 2;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(tubeR, tubeR, len, 40, 1, true), glass);
      m.position.set(mx, cy, mz);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(L.dx, 0, L.dz));
      m.renderOrder = 3;
      m.userData.live = true;
      deco.add(m);
      const yaw = Math.atan2(L.dx, L.dz);
      for (let d = a0; d <= a1 + 0.01; d += (a1 - a0) / Math.max(1, Math.round((a1 - a0) / 3.6))) {
        const x = L.ax + L.dx * d, z = L.az + L.dz * d;
        add(deco, new THREE.TorusGeometry(tubeR + 0.02, 0.1, 6, 40), ribM, [x, cy, z], [0, yaw, 0]);
        for (const sg of [-1, 1]) add(deco, box(0.18, 0.05, 0.3), lampMat, [x + Math.cos(yaw) * sg * (L.width / 2 - 0.15), y + 0.03, z - Math.sin(yaw) * sg * (L.width / 2 - 0.15)], [0, yaw, 0]);
      }
      // A band along the top of the glass, and a stripe low on each side.
      for (const sg of [-1, 1]) add(deco, box(0.12, 0.12, a1 - a0), stripe, [L.ax + L.dx * (a0 + a1) / 2 + Math.cos(yaw) * sg * (tubeR - 0.04) * 0.7, cy + tubeR * 0.7, L.az + L.dz * (a0 + a1) / 2 - Math.sin(yaw) * sg * (tubeR - 0.04) * 0.7], [0, yaw, 0]);
      for (let d = a0 + 3; d < a1 - 1; d += 7) {
        const x = L.ax + L.dx * d, z = L.az + L.dz * d;
        const gy = field.at(x, z).y;
        for (const sg of [-1, 1]) add(deco, cyl(0.12, 0.16, y - 0.7 - gy + 0.4, 6), white, [x + Math.cos(yaw) * sg * 1.4, (y - 0.7 + gy) / 2 - 0.2, z - Math.sin(yaw) * sg * 1.4]);
      }
    }
    run += L.len;
  }
  // Collars at the bends.
  for (let i = 1; i < s.pts.length - 1; i++) {
    const [x, z] = s.pts[i];
    for (const L of [s.segs[i - 1], s.segs[i]]) add(deco, new THREE.TorusGeometry(tubeR + 0.08, 0.2, 8, 40), white, [x - L.dx * 0.45 * (L === s.segs[i] ? -1 : 1), cy, z - L.dz * 0.45 * (L === s.segs[i] ? -1 : 1)], [0, Math.atan2(L.dx, L.dz), 0]);
  }
}

/* ---------------------------------------------------------------- the giant landmarks */

function giants(group, rnd, marks, plan) {
  const g = new THREE.Group();
  const live = new THREE.Group();
  // The Big Rocket on its launch pad, its tower beside it.
  const R = LANDMARKS.rocket;
  add(g, cyl(18, 19, 1.6, 64), mat('#c3c9d4', { rough: 0.6, metal: 0.3 }), [R.x, 0.6, R.z]);
  add(g, cyl(17.2, 17.2, 0.06, 64), mat('#e9edf3'), [R.x, 1.43, R.z]);
  add(g, new THREE.RingGeometry(15.4, 16.6, 96), inlay('#ffffff', painted('hazard', '#ffcf3f', '#2b2f3a')), [R.x, 1.47, R.z], [-Math.PI / 2, 0, 0]);
  add(g, new THREE.RingGeometry(9, 10, 96), inlay(LUNA.orange), [R.x, 1.47, R.z], [-Math.PI / 2, 0, 0]);
  const rocket = rocketModel();
  rocket.scale.setScalar(5);
  rocket.position.set(R.x, 1.4, R.z);
  rocket.rotation.y = 0.2;
  g.add(rocket);
  const tx = R.x - 11.5, tz = R.z - 2;
  const T = mat('#f2f4f8'), TO = mat(LUNA.orange);
  for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) add(g, box(0.45, 54, 0.45), T, [tx + x, 28.4, tz + z]);
  for (let i = 0; i < 18; i++) {
    const yy = 3 + i * 3;
    for (const [x, z, rx] of [[0, -1.6, 0], [0, 1.6, 0], [-1.6, 0, 1], [1.6, 0, 1]]) add(g, box(rx ? 0.3 : 3.4, 0.3, rx ? 3.4 : 0.3), i % 3 ? T : TO, [tx + x, yy, tz + z]);
    add(g, box(0.18, 4.4, 0.18), T, [tx, yy + 1.5, tz + 1.6], [0, 0, 0.78]);
  }
  for (const yy of [24, 38]) add(g, box(8, 0.8, 1.4), TO, [tx + 5, yy, tz + 1.2]);
  add(g, sphere(0.6, 10, 8), lampMat, [tx, 56, tz]);
  // The Moon Lander, a long way taller than you, looking out to the first crater.
  const Ld = LANDMARKS.lander;
  const lander = landerModel();
  lander.scale.setScalar(3.2);
  lander.position.set(Ld.x, 0, Ld.z);
  lander.rotation.y = Math.atan2(-Ld.x, 150 - Ld.z) + 0.4;
  g.add(lander);
  marks.steps([[Ld.x + 6, Ld.z + 5], [Ld.x + 14, Ld.z + 9], [Ld.x + 22, Ld.z + 8], [Ld.x + 28, Ld.z + 14]], 1.1);
  // The Radio Telescope.
  const Dd = LANDMARKS.dish;
  const dish = dishModel();
  dish.scale.setScalar(4);
  dish.position.set(Dd.x, 0, Dd.z);
  live.add(dish);
  // The Moon Rover, driving its loop round the rocket.
  const rover = roverModel();
  rover.scale.setScalar(2.2);
  live.add(rover);
  const rl = LANDMARKS.rover.loop;
  const ring = [];
  for (let i = 0; i <= 120; i++) ring.push([Math.sin((i / 120) * TAU) * rl, Math.cos((i / 120) * TAU) * rl]);
  marks.track(ring, 1.0, 6.4);
  // Flagged rover roads from the launch pad out to every crater, the lander and the dish.
  const colors = [LUNA.orange, LUNA.teal, '#ffd23f', '#ff7aa8'];
  const road = (ax, az, bx, bz, flags) => {
    const len = Math.hypot(bx - ax, bz - az);
    const pts = [];
    const nx = -(bz - az) / len, nz = (bx - ax) / len;
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, wig = Math.sin(t * Math.PI * 2 + ax * 0.1) * 2.5 * Math.sin(t * Math.PI);
      pts.push([ax + (bx - ax) * t + nx * wig, az + (bz - az) * t + nz * wig]);
    }
    marks.track(pts, 0.8, 3.0);
    if (flags) for (let i = 1; i < 12; i += 2) {
      const [x, z] = pts[i];
      pennant(g, x + nx * 3.4, 0, z + nz * 3.4, colors[i % colors.length], Math.atan2(nx, nz));
    }
  };
  for (const f of plan.floors) {
    const u = [f.centre.x / Math.hypot(f.centre.x, f.centre.z), f.centre.z / Math.hypot(f.centre.x, f.centre.z)];
    road(u[0] * 20, u[1] * 20, u[0] * (150 - MOON.outR + 4), u[1] * (150 - MOON.outR + 4), true);
  }
  road(-14, -12, Ld.x + 6, Ld.z + 8, false);
  road(14, -12, Dd.x - 8, Dd.z + 10, false);
  // Boulders scattered on the plain.
  for (let i = 0, n = 0; i < 900 && n < 140; i++) {
    const a = rnd() * TAU, d = 24 + rnd() * 480;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    if (plan.floors.some((f) => Math.hypot(x - f.centre.x, z - f.centre.z) < MOON.outR - 6)) continue;
    if (Math.hypot(x - Ld.x, z - Ld.z) < 12 || Math.hypot(x - Dd.x, z - Dd.z) < 14 || Math.hypot(x, z) < 22) continue;
    if (marks.field.segDist(x, z) < 6) continue;
    boulder(g, x, marks.field.at(x, z).y - 0.2, z, 0.6 + Math.pow(rnd(), 2) * 3.2, 9000 + n);
    n++;
  }
  g.traverse((o) => {
    if (o.isMesh && !o.material.transparent) o.castShadow = true;
  });
  group.add(batch(g));
  group.add(live);
  return { rover, dish };
}

/* ---------------------------------------------------------------- moon dust */

/** Puffs of moon dust: little grey balls that drift out and settle slowly, then fade. */
function dustPuffs(group) {
  const puffs = [];
  for (let i = 0; i < 28; i++) {
    const p = new THREE.Group();
    p.visible = false;
    const m = new THREE.MeshLambertMaterial({ color: '#d9dbe3', transparent: true, opacity: 0, depthWrite: false });
    const balls = [];
    for (let k = 0; k < 7; k++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + (k % 3) * 0.05, 1), m);
      const a = (k / 7) * TAU;
      b.userData.v = [Math.sin(a) * (0.9 + (k % 2) * 0.5), 0.35 + (k % 3) * 0.2, Math.cos(a) * (0.9 + (k % 2) * 0.5)];
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
        const k = u.t / 1.4;
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

/* ---------------------------------------------------------------- the whole Moon */

/**
 * Build the Moon for a plan and the moonbases' looks.
 * @returns {{ group, walk, tiers, gates, fireflySpots, update(t, night), setNight(k), dust(x, y, z, s) }}
 */
export function buildMoonWorld(plan, floors) {
  const group = new THREE.Group();
  group.name = 'moon';
  const walk = new THREE.Group();
  walk.name = 'walk';
  group.add(walk);
  const field = groundField(plan);
  group.add(ground(field));
  group.add(stars());
  const sunDir = new THREE.Vector3(...plan.sun).normalize();
  group.add(sun(sunDir));
  const planet = earth();
  group.add(planet);
  const marks = new Marks(field);
  const rnd = seeded(77);
  const big = giants(group, rnd, marks, plan);
  const glass = glassMaterial();

  // The moonbases.
  const tiers = [];
  const fireflySpots = [];
  for (const f of plan.floors) {
    const look = floors[f.k].look;
    const w = new THREE.Group(), deco = new THREE.Group();
    moonbase(w, deco, marks, f, look, plan, field);
    for (const id in f.pads) fireflySpots.push({ x: f.pads[id].x, y: MOON.deck, z: f.pads[id].z });
    batch(w);
    batch(deco);
    patchCutout(deco);
    w.userData.floor = f.n;
    walk.add(w);
    group.add(deco);
    tiers.push({ walk: w, deco });
  }
  // The glass tubes between the craters, an airlock at the start of each (and an open one at the far end).
  const links = new THREE.Group(), linkWalk = new THREE.Group();
  const gates = [];
  for (const s of plan.stairs) {
    const look = floors[s.from - 1].look;
    tube(linkWalk, links, glass, s, look, field);
    const gate = airlockGate(s, look, MOON.tubeR);
    gate.userData.to = s.to;
    gates.push(gate);
    group.add(gate);
    const L = s.segs.at(-1);
    const end = airlockGate({ a: { x: L.bx - L.dx * 4, z: L.bz - L.dz * 4, y: MOON.deck }, b: { x: L.bx - L.dx * 8, z: L.bz - L.dz * 8 } }, floors[s.to - 1].look, MOON.tubeR);
    end.userData.setOpen(true, true);
    end.userData.update(0);
    group.add(end);
  }
  batch(links);
  batch(linkWalk);
  patchCutout(links);
  walk.add(linkWalk);
  group.add(links);
  group.add(marks.build());

  const dust = dustPuffs(group);
  let last = null;
  const rl = LANDMARKS.rover.loop;
  const placeRover = (t) => {
    const a = t * 0.045;
    big.rover.position.set(Math.sin(a) * rl, field.at(Math.sin(a) * rl, Math.cos(a) * rl).y, Math.cos(a) * rl);
    big.rover.rotation.y = a + Math.PI / 2;
    for (const wl of big.rover.userData.wheels) wl.rotation.x = t * 0.75;
    big.rover.userData.head.rotation.y = Math.sin(t * 0.4) * 0.7;
  };
  placeRover(0);
  return {
    group,
    walk,
    tiers,
    gates,
    fireflySpots,
    update(t, night) {
      const dt = last == null ? 0 : Math.max(0, Math.min(0.1, t - last));
      last = t;
      placeRover(t);
      big.dish.userData.dish.rotation.y = Math.sin(t * 0.05) * 1.2;
      dust.update(dt);
      glass.uniforms.uNight.value = night;
    },
    setNight(k) {
      planet.userData.material.emissiveIntensity = 0.32 + k * 0.95;
      planet.userData.halo.material.uniforms.uK.value = 1 + k * 0.6;
    },
    dust: (x, y, z, s) => dust.kick(x, y, z, s)
  };
}
