import * as THREE from 'three';
import { ZONES } from './world.js';

/**
 * Hearthvale's living landscape — for the eyes only (the server's world is
 * flat; everything here is drawn on top and decides nothing):
 *
 *   hills        the ground rolls; everyone stands on it (`heightAt`)
 *   grass        thousands of tufts in one draw: they sway in the wind and
 *                bend away from whoever walks through
 *   ponds        water to wade through; rings spread from your steps
 *   flowers      in patches, with butterflies over them
 *   birds        small flocks that take off when you come close, and land again
 *   day & night  the sun crosses the sky; at night come stars, fireflies and lanterns
 *   indoors      torches flicker, dust drifts in the crypt, embers rise in the spire
 *
 * The same zone always grows the same way (seeded by its name).
 */

const DAY = 480; // seconds for a whole day
const smooth = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function seeded(text) {
  let a = 2166136261;
  for (let i = 0; i < text.length; i++) a = Math.imul(a ^ text.charCodeAt(i), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The height of a zone's ground at a point: rolling hills, with bowls for the ponds. */
export function heightFn(zone) {
  const def = ZONES[zone];
  const amp = def.hills ?? 0;
  if (!amp) return () => 0;
  const rand = seeded(zone);
  const [a, b, c, d] = [rand() * 6, rand() * 6, rand() * 6, rand() * 6];
  const raw = (x, z) => amp * (Math.sin(x * 0.045 + a) * Math.cos(z * 0.05 + b) * 0.6 + Math.sin(x * 0.11 + z * 0.07 + c) * 0.28 + Math.sin(z * 0.19 - x * 0.13 + d) * 0.12);
  const ponds = (def.ponds ?? []).map((p) => ({ ...p, base: raw(p.x, p.z) }));
  const h = (x, z) => {
    let y = raw(x, z);
    for (const p of ponds) {
      const dist = Math.hypot(x - p.x, z - p.z);
      if (dist > p.r * 1.7) continue;
      y += (p.base - y) * smooth(p.r * 1.7, p.r, dist); // level ground round the pond
      y -= 1.5 * smooth(p.r, p.r * 0.35, dist); // and a bowl in it
    }
    return y;
  };
  h.ponds = ponds.map((p) => ({ ...p, level: p.base - 0.55 }));
  return h;
}

export class Landscape {
  /**
   * @param {string} zone
   * @param {(x: number, z: number) => number} height the zone's `heightFn`
   */
  constructor(zone, height) {
    this.zone = zone;
    this.def = ZONES[zone];
    this.h = height;
    this.group = new THREE.Group();
    this.indoor = this.def.kind === 'dungeon' || this.def.kind === 'raid';
    this.rand = seeded(`${zone}:life`);
    this.time = 0;
    this.clock = DAY * 0.3; // start in the morning
    this.actors = Array.from({ length: 8 }, () => new THREE.Vector3(0, 0, 0));
    this.uniforms = { uTime: { value: 0 }, uActors: { value: this.actors } };
    this.rings = [];
    this.stepAt = 0;
    if (this.indoor) this._indoors();
    else {
      this._grass();
      this._flowers();
      this._water();
      this._birds();
      this._sky();
    }
  }

  /** Whether grass, flowers or birds may be at a point (not on a path, a wall, a pond or a doorstep). */
  _free(x, z, pad = 0) {
    const def = this.def;
    const [w, h] = def.size;
    if (x < 2 || z < 2 || x > w - 2 || z > h - 2) return false;
    for (const wall of def.walls) if (Math.hypot(wall.x - x, wall.z - z) < wall.r + 0.8 + pad) return false;
    for (const p of this.h.ponds ?? []) if (Math.hypot(p.x - x, p.z - z) < p.r * 0.95 + pad) return false;
    for (const n of def.npcs) if (Math.hypot(n.at[0] - x, n.at[1] - z) < 3 + pad) return false;
    for (const s of def.stations) if (Math.hypot(s.at[0] - x, s.at[1] - z) < 2.5 + pad) return false;
    // The paths: straight from the spawn to each portal.
    for (const p of def.portals) {
      const [ax, az] = def.spawn;
      const [bx, bz] = p.at;
      const dx = bx - ax;
      const dz = bz - az;
      const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - (ax + dx * k), z - (az + dz * k)) < 4.2 + pad) return false;
    }
    return true;
  }

  /* --------------------------------------------------------------- grass */

  _grass() {
    const [w, h] = this.def.size;
    const town = this.def.kind === 'town';
    // A town's green is mown; the wilds grow thick.
    const count = Math.round(Math.min(36000, w * h * (town ? 0.3 : 0.62)));
    // One tuft: three blades crossed, each a tapering strip, one unit tall.
    const pos = [];
    for (let b = 0; b < 3; b++) {
      const a = (b / 3) * Math.PI;
      const cx = Math.cos(a);
      const sz = Math.sin(a);
      const lean = (b - 1) * 0.12;
      const v = (side, y) => [cx * side * 0.09 * (1 - y * 0.85) + lean * y, y, sz * side * 0.09 * (1 - y * 0.85)];
      const quads = [[v(-1, 0), v(1, 0), v(1, 0.5)], [v(-1, 0), v(1, 0.5), v(-1, 0.5)], [v(-1, 0.5), v(1, 0.5), v(0, 1)]];
      for (const tri of quads) for (const p of tri) pos.push(...p);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.uniforms.uActors = this.uniforms.uActors;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec3 uActors[8];')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 gw = instanceMatrix * vec4(transformed, 1.0);
          float gk = position.y * position.y;
          // The wind, in slow waves across the field, with a quick shiver on top.
          float wind = sin(uTime * 1.6 + gw.x * 0.32 + gw.z * 0.24) * 0.22 + sin(uTime * 3.4 + gw.z * 0.9 + gw.x * 0.5) * 0.06;
          vec2 off = vec2(wind, wind * 0.55);
          float flat_ = 0.0;
          // Whoever walks through pushes the blades aside and down.
          for (int i = 0; i < 8; i++) {
            vec2 d = gw.xz - uActors[i].xy;
            float f = smoothstep(uActors[i].z, 0.0, length(d));
            off += normalize(d + vec2(0.0001)) * f * 0.95;
            flat_ = max(flat_, f);
          }
          mat3 gm = mat3(instanceMatrix);
          float gs = dot(gm[0], gm[0]);
          vec3 local = (transpose(gm) * vec3(off.x, -flat_ * 0.55, off.y)) / gs;
          transformed += local * gk;`)
        .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vColor.rgb *= mix(0.5, 1.2, position.y);\n#endif');
    };
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const o = new THREE.Object3D();
    const rand = this.rand;
    const base = new THREE.Color(this.def.ground);
    const c = new THREE.Color();
    let n = 0;
    for (let tries = 0; tries < count * 3 && n < count; tries++) {
      // Grass grows in drifts: thick here, thin there.
      const x = rand() * w;
      const z = rand() * h;
      const drift = Math.sin(x * 0.08) * Math.cos(z * 0.07) + Math.sin(x * 0.21 + z * 0.17) * 0.5;
      if (drift < -0.55 + rand() * 0.5 || !this._free(x, z)) continue;
      o.position.set(x, this.h(x, z) - 0.03, z);
      o.rotation.set(0, rand() * Math.PI, 0);
      const s = (0.55 + rand() * 0.75 + Math.max(0, drift) * 0.35) * (town ? 0.5 : 1);
      o.scale.set(s * 1.5, s, s * 1.5);
      o.updateMatrix();
      mesh.setMatrixAt(n, o.matrix);
      mesh.setColorAt(n, c.copy(base).offsetHSL((rand() - 0.5) * 0.05, 0.12, 0.05 + rand() * 0.12));
      n++;
    }
    mesh.count = n;
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  /* ------------------------------------------------- flowers, butterflies */

  _flowers() {
    const [w, h] = this.def.size;
    const rand = this.rand;
    const patches = [];
    for (let tries = 0; tries < 400 && patches.length < Math.round((w * h) / 1400); tries++) {
      const x = rand() * w;
      const z = rand() * h;
      if (this._free(x, z, 2)) patches.push({ x, z, r: 2.5 + rand() * 3, hue: [0.93, 0.13, 0.58, 0.0, 0.76][Math.floor(rand() * 5)] });
    }
    this.patches = patches;
    const per = 26;
    const head = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.13, 0), new THREE.MeshLambertMaterial(), patches.length * per);
    const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.02, 1, 4).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: '#3f7a35' }), patches.length * per);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let n = 0;
    for (const p of patches) {
      for (let i = 0; i < per; i++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * p.r;
        const x = p.x + Math.cos(a) * d;
        const z = p.z + Math.sin(a) * d;
        if (!this._free(x, z)) continue;
        const tall = 0.3 + rand() * 0.35;
        const y = this.h(x, z);
        o.position.set(x, y, z);
        o.rotation.set(0, 0, 0);
        o.scale.set(1, tall, 1);
        o.updateMatrix();
        stem.setMatrixAt(n, o.matrix);
        o.position.y = y + tall;
        o.scale.setScalar(0.8 + rand() * 0.7);
        o.updateMatrix();
        head.setMatrixAt(n, o.matrix);
        head.setColorAt(n, c.setHSL(p.hue + (rand() - 0.5) * 0.04, 0.85, 0.62 + rand() * 0.12));
        n++;
      }
    }
    head.count = stem.count = n;
    this.group.add(stem, head);
    // Butterflies: two wings that beat, wandering over a patch each.
    const wing = new THREE.BufferGeometry();
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.16, 0, 0.1, 0.16, 0, -0.1, 0, 0, 0, -0.16, 0, -0.1, -0.16, 0, 0.1], 3));
    wing.computeVertexNormals();
    const count = Math.min(40, patches.length * 2);
    this.flies = new THREE.InstancedMesh(wing, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), count);
    this.flyAt = Array.from({ length: count }, (_, i) => ({ patch: patches[i % patches.length], phase: rand() * 9, speed: 0.5 + rand() * 0.6 }));
    for (let i = 0; i < count; i++) this.flies.setColorAt(i, c.setHSL(rand(), 0.9, 0.7));
    this.flies.frustumCulled = false;
    this.group.add(this.flies);
  }

  /* --------------------------------------------------------------- water */

  _water() {
    this.waters = [];
    for (const p of this.h.ponds ?? []) {
      const mat = new THREE.MeshStandardMaterial({ color: this.def.mist ? '#3f6f62' : '#3f9fd0', roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.78 });
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.uniforms.uTime;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTime;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += sin(uTime * 1.3 + position.x * 0.8) * 0.035 + cos(uTime * 1.7 + position.z * 0.7) * 0.03;');
      };
      const water = new THREE.Mesh(new THREE.CircleGeometry(p.r * 1.05, 40, 0, Math.PI * 2).rotateX(-Math.PI / 2), mat);
      // A few rings of vertices, so the surface can swell.
      water.geometry = new THREE.RingGeometry(0, p.r * 1.05, 40, 6).rotateX(-Math.PI / 2);
      water.position.set(p.x, p.level, p.z);
      water.receiveShadow = true;
      this.group.add(water);
      this.waters.push(p);
      // Reeds round the edge.
      const reed = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.035, 1, 4).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: '#6f8f3a' }), 60);
      const o = new THREE.Object3D();
      for (let i = 0; i < 60; i++) {
        const a = this.rand() * Math.PI * 2;
        const d = p.r * (0.78 + this.rand() * 0.22);
        const x = p.x + Math.cos(a) * d;
        const z = p.z + Math.sin(a) * d;
        o.position.set(x, this.h(x, z), z);
        o.rotation.set((this.rand() - 0.5) * 0.3, 0, (this.rand() - 0.5) * 0.3);
        o.scale.set(1, 0.9 + this.rand() * 1.1, 1);
        o.updateMatrix();
        reed.setMatrixAt(i, o.matrix);
      }
      this.group.add(reed);
    }
    this.ringMesh = new THREE.InstancedMesh(new THREE.RingGeometry(0.86, 1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }), 48);
    this.ringMesh.count = 0;
    this.ringMesh.frustumCulled = false;
    this.group.add(this.ringMesh);
  }

  /** The pond a point is in (deep enough to wade), or null. */
  pondAt(x, z) {
    for (const p of this.waters ?? []) if (Math.hypot(p.x - x, p.z - z) < p.r * 0.9 && this.h(x, z) < p.level - 0.05) return p;
    return null;
  }

  /* --------------------------------------------------------------- birds */

  _birds() {
    const [w, h] = this.def.size;
    const rand = this.rand;
    this.flocks = [];
    for (let tries = 0; tries < 200 && this.flocks.length < Math.round((w * h) / 5200) + 2; tries++) {
      const x = rand() * w;
      const z = rand() * h;
      if (!this._free(x, z, 3)) continue;
      this.flocks.push({ x, z, home: [x, z], state: 'ground', t: 0, birds: Array.from({ length: 5 }, () => ({ dx: (rand() - 0.5) * 3, dz: (rand() - 0.5) * 3, a: rand() * 6, hop: rand() * 9, vx: 0, vz: 0, y: 0 })) });
    }
    const body = new THREE.ConeGeometry(0.13, 0.42, 5).rotateX(Math.PI / 2);
    const wings = new THREE.BufferGeometry();
    wings.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.08, 0.42, 0, -0.06, 0, 0, -0.12, 0, 0, 0.08, 0, 0, -0.12, -0.42, 0, -0.06], 3));
    wings.computeVertexNormals();
    const n = this.flocks.length * 5;
    this.birdBody = new THREE.InstancedMesh(body, new THREE.MeshLambertMaterial({ color: this.def.mist ? '#3a3a44' : '#f1ece0' }), n);
    this.birdWing = new THREE.InstancedMesh(wings, new THREE.MeshLambertMaterial({ color: this.def.mist ? '#2a2a33' : '#d8d0c0', side: THREE.DoubleSide }), n);
    for (const m of [this.birdBody, this.birdWing]) {
      m.frustumCulled = false;
      m.castShadow = true;
      this.group.add(m);
    }
  }

  /* ------------------------------------------------------- sky and night */

  _sky() {
    // Stars, on a dome far away.
    const pts = [];
    for (let i = 0; i < 500; i++) {
      const a = this.rand() * Math.PI * 2;
      const e = Math.acos(this.rand() * 0.95);
      pts.push(Math.sin(e) * Math.cos(a) * 380, Math.cos(e) * 380, Math.sin(e) * Math.sin(a) * 380);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    this.group.add(this.stars);
    // Fireflies, near whoever is watching.
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(70 * 3), 3));
    const dot = document.createElement('canvas');
    dot.width = dot.height = 32;
    const dc = dot.getContext('2d');
    const glow = dc.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.35, 'rgba(255,255,255,0.6)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    dc.fillStyle = glow;
    dc.fillRect(0, 0, 32, 32);
    this.fireflies = new THREE.Points(fg, new THREE.PointsMaterial({ color: '#d8ff7a', size: 0.5, map: new THREE.CanvasTexture(dot), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.fireflies.frustumCulled = false;
    this.fireSeeds = Array.from({ length: 70 }, () => [this.rand() * 50 - 25, 0.4 + this.rand() * 2.4, this.rand() * 50 - 25, this.rand() * 9]);
    this.group.add(this.fireflies);
    // Lanterns by the stalls and the gates: lit at night.
    this.lanterns = [];
    const spots = [...this.def.walls.filter((w) => w.kind === 'stall').map((w) => [w.x + 2.6, w.z + 1.2]), ...this.def.portals.map((p) => [p.at[0] + 3.2, p.at[1]])].slice(0, 9);
    for (const [x, z] of spots) {
      const y = this.h(x, z);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 6), new THREE.MeshLambertMaterial({ color: '#4a3a2a' }));
      post.position.set(x, y + 1.3, z);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshBasicMaterial({ color: '#5a4a30' }));
      lamp.position.set(x, y + 2.75, z);
      const light = new THREE.PointLight('#ffc878', 0, 16, 1.6);
      light.position.copy(lamp.position);
      this.group.add(post, lamp, light);
      this.lanterns.push({ lamp, light });
    }
  }

  /** How dark it is: 0 at noon, 1 in the middle of the night. */
  get night() {
    if (this.indoor) return 0;
    const sun = Math.sin((this.clock / DAY) * Math.PI * 2 - Math.PI / 2); // −1 midnight … 1 noon
    return smooth(0.15, -0.35, sun);
  }

  /** The hour, for anyone who asks ("Morning", "Night"…). */
  get hour() {
    const t = (this.clock / DAY) % 1;
    return t < 0.2 ? 'Night' : t < 0.3 ? 'Dawn' : t < 0.7 ? 'Day' : t < 0.8 ? 'Dusk' : 'Night';
  }

  /* -------------------------------------------------------------- indoors */

  _indoors() {
    const [w, h] = this.def.size;
    const raid = this.def.kind === 'raid';
    const n = 260;
    const g = new THREE.BufferGeometry();
    this.moteSeeds = Array.from({ length: n }, () => [this.rand() * w, this.rand() * 7, this.rand() * h, this.rand() * 9]);
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    this.motes = new THREE.Points(g, new THREE.PointsMaterial({ color: raid ? '#ff8a3a' : '#9fd8ff', size: raid ? 0.16 : 0.09, transparent: true, opacity: raid ? 0.9 : 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.motes.frustumCulled = false;
    this.group.add(this.motes);
    // Pools on the floor: water in the crypt, embers' glow in the spire.
    for (let i = 0; i < 9; i++) {
      const x = 6 + this.rand() * (w - 12);
      const z = 10 + this.rand() * (h - 20);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(1.5 + this.rand() * 2.5, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: raid ? '#ff5a1f' : '#2f5f78', emissive: raid ? '#ff3a00' : '#0a2a3a', emissiveIntensity: raid ? 1.4 : 0.5, roughness: 0.1, transparent: true, opacity: 0.7 }));
      pool.position.set(x, 0.03, z);
      this.group.add(pool);
    }
  }

  /* --------------------------------------------------------------- update */

  /**
   * @param {number} dt
   * @param {{ x: number, z: number, moving?: boolean }} me
   * @param {Array<{ x: number, z: number }>} others nearby bodies (they bend the grass too)
   * @param {{ scene: THREE.Scene, sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight }} world
   */
  update(dt, me, others, world) {
    this.time += dt;
    this.clock = (this.clock + dt) % DAY;
    this.uniforms.uTime.value = this.time;
    const list = [me, ...others].slice(0, 8);
    this.actors.forEach((v, i) => (list[i] ? v.set(list[i].x, list[i].z, i === 0 ? 2.3 : 1.9) : v.set(-999, -999, 0.01)));
    if (this.indoor) {
      const p = this.motes.geometry.attributes.position;
      const raid = this.def.kind === 'raid';
      this.moteSeeds.forEach(([x, y, z, ph], i) => p.setXYZ(i, x + Math.sin(this.time * 0.3 + ph) * 1.5, raid ? (y + this.time * 0.8 + ph) % 8 : y + Math.sin(this.time * 0.4 + ph) * 0.6, z + Math.cos(this.time * 0.25 + ph) * 1.5));
      p.needsUpdate = true;
      // Torches flicker.
      world.torches?.forEach((t, i) => (t.intensity = 18 * (0.8 + Math.sin(this.time * 9 + i * 2.1) * 0.1 + Math.sin(this.time * 23 + i) * 0.08)));
      return;
    }
    this._day(world, me);
    this._ripples(dt, me, others);
    this._butterflies(me);
    this._flocks(dt, me);
  }

  _day(world, me) {
    const sunUp = Math.sin((this.clock / DAY) * Math.PI * 2 - Math.PI / 2);
    const night = this.night;
    const dusk = smooth(0.5, 0.05, Math.abs(sunUp)) * (1 - night * 0.6);
    const sky = new THREE.Color(this.def.mist ? '#9fb8b0' : '#9cc8e8').lerp(new THREE.Color('#f2a36b'), dusk * 0.75).lerp(new THREE.Color('#10163a'), night);
    world.scene.background = sky;
    world.scene.fog.color.copy(sky);
    if (this.def.mist) {
      world.scene.fog.near = 25;
      world.scene.fog.far = 120;
    }
    world.hemi.intensity = 1.1 - night * 0.78;
    world.sun.intensity = 2.2 * Math.max(0.06, 1 - night) * (1 - dusk * 0.35);
    world.sun.color.set('#fff0d8').lerp(new THREE.Color('#ff9a5a'), dusk).lerp(new THREE.Color('#8fa8ff'), night);
    const a = (this.clock / DAY) * Math.PI * 2;
    // By night the light is the moon's, from the other side.
    const up = night > 0.5 ? 55 : Math.max(14, sunUp * 70);
    world.sun.position.set(me.x + Math.cos(a) * 45, this.h(me.x, me.z) + up, me.z + 20 + Math.sin(a) * 15);
    this.stars.material.opacity = night;
    this.stars.position.set(me.x, 0, me.z);
    this.fireflies.material.opacity = night * 0.95;
    if (night > 0.02) {
      const p = this.fireflies.geometry.attributes.position;
      this.fireSeeds.forEach(([x, y, z, ph], i) => {
        const fx = me.x + x + Math.sin(this.time * 0.5 + ph) * 2.5;
        const fz = me.z + z + Math.cos(this.time * 0.4 + ph * 1.3) * 2.5;
        p.setXYZ(i, fx, this.h(fx, fz) + y + Math.sin(this.time * 1.1 + ph) * 0.4, fz);
      });
      p.needsUpdate = true;
    }
    for (const [i, l] of this.lanterns.entries()) {
      l.light.intensity = night * (9 + Math.sin(this.time * 7 + i * 3) * 0.8);
      l.lamp.material.color.set(night > 0.1 ? '#ffd27a' : '#5a4a30');
    }
  }

  _ripples(dt, me, others) {
    // Steps in water leave rings.
    this.stepAt -= dt;
    if (this.stepAt <= 0) {
      this.stepAt = 0.32;
      for (const a of [me, ...others]) {
        const pond = a.moving !== false ? this.pondAt(a.x, a.z) : null;
        if (pond && this.rings.length < 48) this.rings.push({ x: a.x, z: a.z, y: pond.level + 0.04, t: 0 });
      }
    }
    this.rings = this.rings.filter((r) => (r.t += dt) < 1.6);
    const o = new THREE.Object3D();
    this.rings.forEach((r, i) => {
      o.position.set(r.x, r.y, r.z);
      o.scale.setScalar(0.3 + r.t * 1.9);
      o.updateMatrix();
      this.ringMesh.setMatrixAt(i, o.matrix);
      this.ringMesh.setColorAt(i, new THREE.Color('#e8f8ff').multiplyScalar(1 - r.t / 1.6));
    });
    this.ringMesh.count = this.rings.length;
    this.ringMesh.instanceMatrix.needsUpdate = true;
    if (this.ringMesh.instanceColor) this.ringMesh.instanceColor.needsUpdate = true;
  }

  _butterflies(me) {
    const o = new THREE.Object3D();
    const asleep = this.night > 0.6;
    this.flyAt.forEach((f, i) => {
      const t = this.time * f.speed + f.phase;
      // Startled: a butterfly drifts away from whoever comes close.
      const x0 = f.patch.x + Math.sin(t * 0.9) * f.patch.r;
      const z0 = f.patch.z + Math.cos(t * 0.7 + f.phase) * f.patch.r;
      const d = Math.hypot(x0 - me.x, z0 - me.z);
      const flee = d < 3 ? (3 - d) * 0.9 : 0;
      const x = x0 + ((x0 - me.x) / (d || 1)) * flee;
      const z = z0 + ((z0 - me.z) / (d || 1)) * flee;
      o.position.set(x, this.h(x, z) + (asleep ? 0.35 : 0.9 + Math.sin(t * 2.3) * 0.35 + flee * 0.5), z);
      o.rotation.set(0, t * 1.4, 0);
      // The wing beat: the wings fold up and down.
      o.scale.set(1, 1, 1);
      o.rotation.z = asleep ? 1.2 : Math.sin(t * 22) * 1.1;
      o.updateMatrix();
      this.flies.setMatrixAt(i, o.matrix);
    });
    this.flies.instanceMatrix.needsUpdate = true;
  }

  _flocks(dt, me) {
    const o = new THREE.Object3D();
    let n = 0;
    for (const f of this.flocks) {
      f.t += dt;
      const d = Math.hypot(f.x - me.x, f.z - me.z);
      if (f.state === 'ground' && d < 7.5) {
        // Startled: up and away from you.
        f.state = 'flying';
        f.t = 0;
        const ax = (f.x - me.x) / (d || 1);
        const az = (f.z - me.z) / (d || 1);
        for (const b of f.birds) {
          b.vx = ax * (5 + Math.random() * 3) + (Math.random() - 0.5) * 3;
          b.vz = az * (5 + Math.random() * 3) + (Math.random() - 0.5) * 3;
        }
        this.startled = (this.startled ?? 0) + 1;
      } else if (f.state === 'flying' && f.t > 7) {
        // Land somewhere quiet near home.
        for (let k = 0; k < 12; k++) {
          const x = f.home[0] + (Math.random() - 0.5) * 30;
          const z = f.home[1] + (Math.random() - 0.5) * 30;
          if (this._free(x, z, 2) && Math.hypot(x - me.x, z - me.z) > 14) {
            f.x = x;
            f.z = z;
            break;
          }
        }
        f.state = 'landing';
        f.t = 0;
        for (const b of f.birds) {
          b.fromX = b.wx;
          b.fromZ = b.wz;
          b.fromY = b.y;
        }
      } else if (f.state === 'landing' && f.t > 2.2) f.state = 'ground';
      for (const b of f.birds) {
        let x;
        let z;
        let y;
        let flap = 0;
        if (f.state === 'ground') {
          // Pecking about: small hops.
          const hop = Math.max(0, Math.sin(this.time * 3 + b.hop));
          x = f.x + b.dx;
          z = f.z + b.dz;
          y = this.h(x, z) + (hop > 0.93 ? (hop - 0.93) * 3 : 0);
          b.a += dt * (hop > 0.93 ? 4 : 0);
        } else if (f.state === 'flying') {
          b.wx = (b.wx ?? f.x + b.dx) + b.vx * dt;
          b.wz = (b.wz ?? f.z + b.dz) + b.vz * dt;
          b.y = Math.min(9 + b.hop * 0.3, (b.y || 0) + dt * 4.5);
          // After a while they circle.
          const turn = f.t > 2 ? 0.9 * dt : 0;
          [b.vx, b.vz] = [b.vx * Math.cos(turn) - b.vz * Math.sin(turn), b.vx * Math.sin(turn) + b.vz * Math.cos(turn)];
          x = b.wx;
          z = b.wz;
          y = this.h(x, z) + b.y;
          b.a = Math.atan2(b.vx, b.vz);
          flap = Math.sin(this.time * 26 + b.hop) * 0.9;
        } else {
          const k = smooth(0, 2.2, f.t);
          x = b.fromX + (f.x + b.dx - b.fromX) * k;
          z = b.fromZ + (f.z + b.dz - b.fromZ) * k;
          y = this.h(x, z) + b.fromY * (1 - k);
          b.a = Math.atan2(f.x + b.dx - b.fromX, f.z + b.dz - b.fromZ);
          flap = Math.sin(this.time * 26 + b.hop) * 0.9;
          if (k >= 1) {
            b.wx = b.wz = undefined;
            b.y = 0;
          }
        }
        o.position.set(x, y + 0.14, z);
        o.rotation.set(0, b.a, 0);
        o.scale.setScalar(1);
        o.updateMatrix();
        this.birdBody.setMatrixAt(n, o.matrix);
        o.scale.set(1, 1, 1);
        o.rotation.set(0, b.a, 0);
        o.updateMatrix();
        // Wings: folded on the ground, beating in the air.
        const wing = new THREE.Matrix4().makeScale(f.state === 'ground' ? 0.35 : 1, 1, 1);
        const lift = new THREE.Matrix4().makeTranslation(0, f.state === 'ground' ? 0.02 : flap * 0.12, 0);
        this.birdWing.setMatrixAt(n, o.matrix.clone().multiply(lift).multiply(wing));
        n++;
      }
    }
    this.birdBody.count = this.birdWing.count = n;
    this.birdBody.instanceMatrix.needsUpdate = true;
    this.birdWing.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.group.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
  }
}
