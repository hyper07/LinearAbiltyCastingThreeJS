import * as THREE from 'three';

/**
 * A living landscape — for the eyes only: it is drawn on top of a world and
 * decides nothing in it. Hearthvale's zones use it (src/mmo/landscape.js) and
 * so does every game on the action engine (world/ComposedWorld.js), each
 * asking for what suits the place:
 *
 *   grass        thousands of tufts in one draw: they sway in the wind and
 *                bend away from whoever walks through
 *   ponds        water to wade through; rings spread from your steps
 *   flowers      in patches, with butterflies over them
 *   birds        small flocks that take off when you come close, and land again
 *   kickables    logs that roll and boulders that tumble when someone walks into them
 *                (logs float if they end up in a pond)
 *   waterfalls   a cliff, a falling sheet of water, spray — more of it when you stand under
 *   giants       a huge bottle-trunked tree: leaves drift down, the crown shakes when you pass,
 *                its fruit glows at night
 *   mountains    snow-capped peaks all round, too far to ever reach
 *   sky          a day that passes (stars, fireflies and lanterns at night), or a fixed hour
 *   indoors      dust in a crypt, embers in a spire, pools, flickering torches
 *
 * The same seed always grows the same land.
 */

const DAY = 480; // seconds for a whole day
export const smooth = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function seeded(text) {
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

export class LivingLand {
  /**
   * @param {{
   *   seed: string,
   *   bounds: [number, number, number, number],     x0, z0, x1, z1: where things may grow
   *   height: (x: number, z: number) => number,
   *   free?: (x: number, z: number, pad: number) => boolean,   false on paths, walls, doorsteps…
   *   ground?: string,                              the ground's colour (the grass takes after it)
   *   grass?: { density?: number, scale?: number, thin?: (x: number, z: number) => number } | null,
   *   flowers?: boolean, birds?: boolean,
   *   ponds?: Array<{ x, z, r, level }>,
   *   kickables?: number,                           how many logs and boulders
   *   waterfalls?: Array<{ x, z, face?: number, height?: number }>,
   *   giants?: Array<{ x, z, r?: number }>,
   *   mountains?: boolean,
   *   sky?: { cycle: true } | { night: number } | null,   a passing day, or a fixed darkness (0–1)
   *   lanterns?: Array<[number, number]>,
   *   mist?: boolean,
   *   indoor?: null | 'crypt' | 'spire'
   * }} options
   */
  constructor(options) {
    this.o = options;
    this.def = { ground: options.ground ?? '#5d8a3c', mist: Boolean(options.mist), kind: options.indoor === 'spire' ? 'raid' : options.indoor ? 'dungeon' : 'open' };
    this.bounds = options.bounds;
    this.h = options.height;
    this.ponds = options.ponds ?? [];
    this.group = new THREE.Group();
    this.indoor = Boolean(options.indoor);
    this.rand = seeded(`${options.seed}:life`);
    this.time = 0;
    this.clock = DAY * 0.3; // start in the morning
    this.fixedNight = options.sky && !options.sky.cycle ? Math.max(0, Math.min(1, options.sky.night ?? 0)) : null;
    this.actors = Array.from({ length: 8 }, () => new THREE.Vector3(0, 0, 0));
    this.uniforms = { uTime: { value: 0 }, uActors: { value: this.actors } };
    this.rings = [];
    this.stepAt = 0;
    this.kicked = 0;
    this.patches = [];
    this.flocks = [];
    if (this.indoor) this._indoors();
    else {
      if (options.grass) this._grass();
      if (options.flowers) this._flowers();
      if (this.ponds.length) this._water();
      if (options.birds) this._birds();
      if (options.kickables) this._kickables(options.kickables);
      for (const w of options.waterfalls ?? []) this._waterfall(w);
      for (const g of options.giants ?? []) this._giant(g);
      if (options.mountains) this._mountains();
      if (options.sky) this._sky();
    }
  }

  /** A random point inside the bounds. */
  _spot() {
    const [x0, z0, x1, z1] = this.bounds;
    return [x0 + this.rand() * (x1 - x0), z0 + this.rand() * (z1 - z0)];
  }

  get area() {
    const [x0, z0, x1, z1] = this.bounds;
    return (x1 - x0) * (z1 - z0);
  }

  /** Whether grass, flowers, birds or a log may be at a point (not on a path, a wall, a pond…). */
  _free(x, z, pad = 0) {
    const [x0, z0, x1, z1] = this.bounds;
    if (x < x0 + 2 || z < z0 + 2 || x > x1 - 2 || z > z1 - 2) return false;
    for (const p of this.ponds) if (Math.hypot(p.x - x, p.z - z) < p.r * 0.95 + pad) return false;
    for (const g of this.o.giants ?? []) if (Math.hypot(g.x - x, g.z - z) < (g.r ?? 4.5) + 0.6 + pad) return false;
    for (const w of this.o.waterfalls ?? []) if (Math.hypot(w.x - x, w.z - z) < 5 + pad) return false;
    return this.o.free ? this.o.free(x, z, pad) : true;
  }

  /* --------------------------------------------------------------- grass */

  _grass() {
    const g = this.o.grass;
    // A town's green is mown; the wilds grow thick.
    const count = Math.round(Math.min(36000, this.area * (g.density ?? 0.62)));
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
      const [x, z] = this._spot();
      const drift = Math.sin(x * 0.08) * Math.cos(z * 0.07) + Math.sin(x * 0.21 + z * 0.17) * 0.5;
      if (drift < -0.55 + rand() * 0.5 || !this._free(x, z)) continue;
      const thin = g.thin ? g.thin(x, z) : 1;
      if (thin < 1 && rand() > thin) continue;
      o.position.set(x, this.h(x, z) - 0.03, z);
      o.rotation.set(0, rand() * Math.PI, 0);
      const s = (0.55 + rand() * 0.75 + Math.max(0, drift) * 0.35) * (g.scale ?? 1) * (thin < 1 ? 0.45 + thin * 0.55 : 1);
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
    const rand = this.rand;
    const patches = [];
    for (let tries = 0; tries < 400 && patches.length < Math.round(this.area / 1400) + 2; tries++) {
      const [x, z] = this._spot();
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
    const count = Math.max(1, Math.min(40, patches.length * 2));
    this.flies = new THREE.InstancedMesh(wing, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), count);
    this.flyAt = Array.from({ length: patches.length ? count : 0 }, (_, i) => ({ patch: patches[i % patches.length], phase: rand() * 9, speed: 0.5 + rand() * 0.6 }));
    for (let i = 0; i < count; i++) this.flies.setColorAt(i, c.setHSL(rand(), 0.9, 0.7));
    this.flies.frustumCulled = false;
    this.group.add(this.flies);
  }

  /* --------------------------------------------------------------- water */

  _water() {
    this.waters = [];
    for (const p of this.ponds) {
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
    const rand = this.rand;
    this.flocks = [];
    for (let tries = 0; tries < 200 && this.flocks.length < Math.round(this.area / 5200) + 2; tries++) {
      const [x, z] = this._spot();
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
    const spots = (this.o.lanterns ?? []).slice(0, 9);
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
    if (this.fixedNight != null) return this.fixedNight;
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
    const w = this.bounds[2];
    const h = this.bounds[3];
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
    if (this.o.sky?.cycle) this._day(world, me);
    else if (this.o.sky) this._nightLife(me);
    if (this.ringMesh) this._ripples(dt, me, others);
    if (this.flies) this._butterflies(me);
    if (this.birdBody) this._flocks(dt, me);
    if (this.kicks) this._kick(dt, list);
    for (const w of this.falls ?? []) this._fall(w, dt, me);
    for (const g of this.giantTrees ?? []) this._giantStep(g, dt, list);
  }

  _day(world, me) {
    const sunUp = Math.sin((this.clock / DAY) * Math.PI * 2 - Math.PI / 2);
    const night = this.night;
    const dusk = smooth(0.5, 0.05, Math.abs(sunUp)) * (1 - night * 0.6);
    const sky = new THREE.Color(this.def.mist ? '#9fb8b0' : '#9cc8e8').lerp(new THREE.Color('#f2a36b'), dusk * 0.75).lerp(new THREE.Color('#10163a'), night);
    this.skyColor = sky;
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
    this._nightLife(me);
  }

  /** Stars, fireflies and lanterns, by how dark it is. */
  _nightLife(me) {
    const night = this.night;
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

  /* ------------------------------------------------- logs and boulders */

  _kickables(count) {
    const rand = this.rand;
    const items = [];
    for (let tries = 0; tries < count * 30 && items.length < count; tries++) {
      const [x, z] = this._spot();
      if (!this._free(x, z, 1.5)) continue;
      const log = rand() < 0.5;
      items.push({ log, x, z, vx: 0, vz: 0, yaw: rand() * Math.PI, roll: 0, size: log ? 0.32 + rand() * 0.12 : 0.4 + rand() * 0.3, len: 1.8 + rand() * 1.2, spin: 0 });
    }
    this.kicks = items;
    const logs = items.filter((k) => k.log).length;
    const bark = new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.9, flatShading: true });
    this.logMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 9).rotateZ(Math.PI / 2), bark, Math.max(1, logs));
    this.rockMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 1, flatShading: true }), Math.max(1, items.length - logs));
    for (const m of [this.logMesh, this.rockMesh]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      this.group.add(m);
    }
    this._kick(0, []);
  }

  /** Whoever walks into a log or a boulder sends it rolling; in a pond, a log floats. */
  _kick(dt, actors) {
    const o = new THREE.Object3D();
    let li = 0;
    let ri = 0;
    for (const k of this.kicks) {
      for (const a of actors) {
        // A log is a line; a boulder a point.
        let px = k.x;
        let pz = k.z;
        if (k.log) {
          const ax = Math.cos(k.yaw);
          const az = -Math.sin(k.yaw);
          const t = Math.max(-k.len / 2, Math.min(k.len / 2, (a.x - k.x) * ax + (a.z - k.z) * az));
          px += ax * t;
          pz += az * t;
        }
        const dx = px - a.x;
        const dz = pz - a.z;
        const d = Math.hypot(dx, dz);
        if (d > k.size + 0.75 || d < 1e-3) continue;
        const push = (k.size + 0.75 - d) * 14;
        if (!k.vx && !k.vz) this.kicked++;
        k.vx += (dx / d) * push;
        k.vz += (dz / d) * push;
        if (k.log) k.spin += ((a.x - k.x) * dz - (a.z - k.z) * dx) * 0.4; // pushed off-centre, it turns
      }
      const speed = Math.hypot(k.vx, k.vz);
      const pond = this.ponds.find((p) => Math.hypot(p.x - k.x, p.z - k.z) < p.r * 0.92 && this.h(k.x, k.z) < p.level - 0.15);
      if (speed > 0.01 || Math.abs(k.spin) > 0.01) {
        const max = 7;
        if (speed > max) {
          k.vx *= max / speed;
          k.vz *= max / speed;
        }
        const nx = k.x + k.vx * dt;
        const nz = k.z + k.vz * dt;
        if (this._wild(nx, nz)) {
          k.x = nx;
          k.z = nz;
        } else {
          k.vx *= -0.4;
          k.vz *= -0.4;
        }
        k.roll += (speed * dt) / k.size;
        k.yaw += k.spin * dt;
        const drag = Math.exp(-(pond ? 0.9 : 2.6) * dt);
        k.vx *= drag;
        k.vz *= drag;
        k.spin *= Math.exp(-3 * dt);
      }
      const y = pond && k.log ? pond.level + Math.sin(this.time * 1.5 + k.x) * 0.04 : this.h(k.x, k.z) + k.size * (k.log ? 1 : 0.7);
      o.position.set(k.x, y, k.z);
      if (k.log) {
        o.rotation.set(k.roll, k.yaw, 0, 'YXZ');
        o.scale.set(k.len, k.size, k.size);
        o.updateMatrix();
        this.logMesh.setMatrixAt(li++, o.matrix);
      } else {
        o.rotation.set(k.roll * Math.sign(k.vz || 1), k.yaw, k.roll * -Math.sign(k.vx || 1));
        o.scale.setScalar(k.size);
        o.updateMatrix();
        this.rockMesh.setMatrixAt(ri++, o.matrix);
      }
    }
    this.logMesh.count = li;
    this.rockMesh.count = ri;
    this.logMesh.instanceMatrix.needsUpdate = true;
    this.rockMesh.instanceMatrix.needsUpdate = true;
  }

  /** Where a rolling thing may go: anywhere free, and into the ponds too. */
  _wild(x, z) {
    const [x0, z0, x1, z1] = this.bounds;
    if (x < x0 + 2 || z < z0 + 2 || x > x1 - 2 || z > z1 - 2) return false;
    if (this.ponds.some((p) => Math.hypot(p.x - x, p.z - z) < p.r)) return true;
    return this.o.free ? this.o.free(x, z, 0.4) : true;
  }

  /* ----------------------------------------------------------- waterfalls */

  _waterfall(w) {
    const tall = w.height ?? 10;
    const face = w.face ?? 0; // the way the water runs out, as an angle (0 = +z)
    const g = new THREE.Group();
    g.position.set(w.x, this.h(w.x, w.z), w.z);
    g.rotation.y = face;
    const rock = new THREE.MeshStandardMaterial({ color: '#77736b', roughness: 1, flatShading: true });
    // The cliff: a heap of boulders, tallest at the back.
    for (let i = 0; i < 11; i++) {
      const col = (i % 4) - 1.5;
      const row = Math.floor(i / 4);
      const b = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6 + this.rand() * 1.2, 0), rock);
      b.position.set(col * 2.6 + (this.rand() - 0.5), tall * (0.25 + row * 0.3) * (0.8 + this.rand() * 0.3), -1.5 - row * 1.6 + (this.rand() - 0.5));
      b.scale.set(1, 1.2 + row * 0.25, 1);
      b.rotation.set(this.rand() * 3, this.rand() * 3, this.rand() * 3);
      b.castShadow = true;
      g.add(b);
    }
    // The water: streaks running down a sheet.
    const cvs = document.createElement('canvas');
    cvs.width = 64;
    cvs.height = 256;
    const c = cvs.getContext('2d');
    c.fillStyle = 'rgba(120, 190, 235, 0.55)';
    c.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 70; i++) {
      c.fillStyle = `rgba(255,255,255,${0.25 + this.rand() * 0.6})`;
      c.fillRect(this.rand() * 64, this.rand() * 256, 1 + this.rand() * 3, 20 + this.rand() * 70);
    }
    const tex = new THREE.CanvasTexture(cvs);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(3.4, tall * 0.92, 1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    sheet.position.set(0, tall * 0.46, 1.9);
    sheet.rotation.x = -0.1;
    g.add(sheet);
    // Spray where it lands.
    const n = 90;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    const spray = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#f1fbff', size: 0.28, transparent: true, opacity: 0.75, depthWrite: false }));
    spray.frustumCulled = false;
    g.add(spray);
    this.group.add(g);
    // Where the water lands, in the world.
    const lx = w.x + Math.sin(face) * 2.6;
    const lz = w.z + Math.cos(face) * 2.6;
    (this.falls ??= []).push({ ...w, tex, spray, lx, lz, seeds: Array.from({ length: n }, () => [this.rand() * 6.28, this.rand(), this.rand() * 9]), under: 0 });
  }

  _fall(w, dt, me) {
    w.tex.offset.y += dt * 1.6;
    // Standing under it: the spray grows.
    const near = Math.hypot(me.x - w.lx, me.z - w.lz);
    w.under += ((near < 2.2 ? 1 : 0) - w.under) * Math.min(1, dt * 4);
    if (near < 2.2 && !w.wasUnder) this.showered = (this.showered ?? 0) + 1;
    w.wasUnder = near < 2.2;
    const p = w.spray.geometry.attributes.position;
    w.seeds.forEach(([a, r, ph], i) => {
      const t = (this.time * 1.4 + ph) % 1;
      const reach = (0.6 + r * 2.2) * (1 + w.under * 0.8) * t;
      p.setXYZ(i, Math.cos(a) * reach, 0.2 + Math.sin(t * Math.PI) * (0.8 + r * 1.6) * (1 + w.under), 2.4 + Math.sin(a) * reach * 0.6);
    });
    p.needsUpdate = true;
    w.spray.material.size = 0.28 + w.under * 0.18;
  }

  /* ------------------------------------------------------- the giant tree */

  _giant(spec) {
    const r = spec.r ?? 4.5;
    const tall = r * 3.4;
    const g = new THREE.Group();
    g.position.set(spec.x, this.h(spec.x, spec.z) - 0.3, spec.z);
    const bark = new THREE.MeshStandardMaterial({ color: '#8a6f55', roughness: 0.95, flatShading: true });
    // A bottle of a trunk: wide at the foot, wider at the belly, narrow at the neck.
    const profile = [[r * 1.15, 0], [r * 0.95, tall * 0.08], [r * 1.02, tall * 0.35], [r * 0.9, tall * 0.6], [r * 0.6, tall * 0.82], [r * 0.5, tall]].map(([x, y]) => new THREE.Vector2(x * 0.92, y));
    const trunk = new THREE.Mesh(new THREE.LatheGeometry(profile, 14), bark);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    g.add(trunk);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const root = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, r * 1.5, 6), bark);
      root.position.set(Math.cos(a) * r * 1.05, r * 0.25, Math.sin(a) * r * 1.05);
      root.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      g.add(root);
    }
    // Stubby boughs, and a wide flat crown on them.
    const crown = new THREE.Group();
    crown.position.y = tall;
    const leaf = new THREE.MeshStandardMaterial({ color: this.def.mist ? '#5f7a52' : '#4f9a3f', roughness: 0.9, flatShading: true });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.rand();
      const reach = r * (1.4 + this.rand() * 0.9);
      const bough = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.1, r * 0.22, reach, 6), bark);
      bough.position.set(Math.cos(a) * reach * 0.42, reach * 0.22, Math.sin(a) * reach * 0.42);
      bough.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
      bough.castShadow = true;
      const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (0.75 + this.rand() * 0.45), 0), leaf);
      tuft.position.set(Math.cos(a) * reach * 0.9, reach * 0.5 + this.rand() * r * 0.3, Math.sin(a) * reach * 0.9);
      tuft.scale.y = 0.55;
      tuft.castShadow = true;
      crown.add(bough, tuft);
    }
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 1.2, 0), leaf);
    top.position.y = r * 0.95;
    top.scale.y = 0.5;
    top.castShadow = true;
    crown.add(top);
    // Fruit that glows at night.
    const fruits = [];
    for (let i = 0; i < 9; i++) {
      const a = this.rand() * Math.PI * 2;
      const d = r * (0.8 + this.rand() * 1.3);
      const f = new THREE.Mesh(new THREE.SphereGeometry(r * 0.09, 8, 6), new THREE.MeshBasicMaterial({ color: '#6a5a2a' }));
      f.position.set(Math.cos(a) * d, r * (0.05 + this.rand() * 0.2), Math.sin(a) * d);
      crown.add(f);
      fruits.push(f);
    }
    const glow = new THREE.PointLight('#ffd27a', 0, r * 9, 1.5);
    glow.position.y = tall * 0.8;
    g.add(crown, glow);
    // Leaves, drifting down.
    const n = 70;
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    const leaves = new THREE.Points(lg, new THREE.PointsMaterial({ color: this.def.mist ? '#b8a86a' : '#b8e06a', size: 0.22, transparent: true, opacity: 0.9, depthWrite: false }));
    leaves.frustumCulled = false;
    g.add(leaves);
    this.group.add(g);
    (this.giantTrees ??= []).push({ ...spec, r, tall, crown, fruits, glow, leaves, shake: 0, seeds: Array.from({ length: n }, () => [this.rand() * 6.28, this.rand(), this.rand() * 9, 0.5 + this.rand()]) });
  }

  _giantStep(g, dt, actors) {
    // Someone passing under it shakes the crown, and more leaves come down.
    const near = actors.some((a) => Math.hypot(a.x - g.x, a.z - g.z) < g.r + 3.5);
    if (near && g.shake < 0.05) this.rustled = (this.rustled ?? 0) + 1;
    g.shake += ((near ? 1 : 0) - g.shake) * Math.min(1, dt * (near ? 5 : 0.7));
    g.crown.rotation.z = Math.sin(this.time * 7) * 0.012 * g.shake + Math.sin(this.time * 0.6) * 0.006;
    g.crown.rotation.x = Math.cos(this.time * 6.3) * 0.012 * g.shake;
    const p = g.leaves.geometry.attributes.position;
    g.seeds.forEach(([a, r, ph, sp], i) => {
      const t = (this.time * 0.09 * sp * (1 + g.shake * 2.5) + ph) % 1;
      const d = g.r * (0.6 + r * 2.1);
      p.setXYZ(i, Math.cos(a + t * 2) * d + Math.sin(this.time + ph) * 0.4, g.tall * (1.05 - t) + 0.3, Math.sin(a + t * 2) * d + Math.cos(this.time * 0.8 + ph) * 0.4);
    });
    p.needsUpdate = true;
    g.leaves.material.opacity = 0.55 + g.shake * 0.45;
    const night = this.night;
    g.glow.intensity = night * 14;
    for (const f of g.fruits) f.material.color.set(night > 0.1 ? '#ffd27a' : '#6a5a2a');
  }

  /* ------------------------------------------------------------ mountains */

  _mountains() {
    const [x0, z0, x1, z1] = this.bounds;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const reach = Math.max(x1 - x0, z1 - z0);
    const rock = new THREE.Color(this.def.mist ? '#5f6f6a' : '#6f84a8');
    const snow = new THREE.Color('#f4f8ff');
    const count = 22;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + this.rand() * 0.2;
      const d = reach * (0.95 + this.rand() * 0.5);
      const tall = reach * (0.28 + this.rand() * 0.3);
      const geo = new THREE.ConeGeometry(tall * (0.7 + this.rand() * 0.4), tall, 7, 4);
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let v = 0; v < pos.count; v++) {
        // Ragged sides, and snow above the line.
        const y = pos.getY(v) / tall + 0.5;
        if (y < 0.98) pos.setX(v, pos.getX(v) * (0.85 + this.rand() * 0.3));
        c.copy(rock).lerp(snow, smooth(0.55 + this.rand() * 0.1, 0.72, y));
        colors.set([c.r, c.g, c.b], v * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();
      const peak = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false }));
      peak.position.set(cx + Math.cos(a) * d, tall / 2 - 6, cz + Math.sin(a) * d);
      peak.rotation.y = this.rand() * 6;
      this.group.add(peak);
    }
  }

  dispose() {
    this.group.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
  }
}
