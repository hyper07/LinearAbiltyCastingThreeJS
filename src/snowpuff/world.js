/**
 * The mountain in 3D, built from a course (course.js): the snow (streamed
 * chunks along the run, kickers, ice), everything that sells speed — fence
 * panels and posts close on both sides, piste poles, feather flags, slalom
 * gates, ski lifts with moving chairs crossing overhead and running beside
 * the run, arches, lanterns at night, trees right at the edge — and the
 * pickups. Static things live in 100 m sections that are shown only near
 * you; lifts, flags, stars and lantern lights move every frame.
 */
import * as THREE from 'three/webgpu';
import { uniform, vec3, float, mix, smoothstep, positionLocal, positionWorld, instanceIndex, sin, time, hash, uv, step, fract, mx_noise_float, abs, normalWorld, max, dot, pow, positionViewDirection, normalView, attribute, color, vec4, mrt, texture, cameraPosition } from 'three/tsl';
import { instanceColor as instanceColorNode } from './render/instanceColor.js';
import { frameAt, groundAt, toWorld, rampShape, rng, RUNOUT, project } from './course.js';
import { snowMaterial, iceMaterial } from './render/snow.js';
import { loadKit, instance } from './render/models.js';
import { RiderModel } from './render/riderModel.js';
import { ALL_SPECIES } from './riders.js';
import { KEEP_BUFFERS } from './fx.js';
import { sceneryPlan } from './landmarks.js';
import { buildBackdrop as buildHeroPeak, buildWater, faceClouds, BUILDERS, prayerFlags, toriiGate, buildTrain } from './render/scenery.js';

const SECTION = 100;
const IN_COLS = 46;
const OUT = [0.6, 1.4, 2.4, 3.6, 5, 6.6, 8.6, 11, 14, 18, 23, 29, 36, 44, 53, 63];

const _f = {};
const _p = {};

export class World {
  constructor({ scene, course, mountain, tier, trails, sky }) {
    this.scene = scene;
    this.course = course;
    this.mountain = mountain;
    this.tier = tier;
    this.trails = trails;
    this.sky = sky;
    this.root = new THREE.Group();
    this.root.name = 'world';
    scene.add(this.root);
    this.sections = [];
    this.movers = [];
    this.rand = rng(course.seed * 7 + 3);
    this.lanternSpots = [];
    this.spectators = [];
  }

  section(s) {
    const i = Math.max(0, Math.floor(s / SECTION));
    while (this.sections.length <= i) {
      const g = new THREE.Group();
      g.userData.s0 = this.sections.length * SECTION;
      this.root.add(g);
      this.sections.push(g);
    }
    return this.sections[i];
  }

  async build(progress = () => {}) {
    const c = this.course, m = this.mountain;
    const L = c.length;
    this.snow = snowMaterial({
      trails: this.trails, sun: this.sky.u.sun, sunColor: this.sky.u.sunColor, sparkle: m.time === 'night' ? 0.5 : 1,
      land: m.land ? { colour: m.land.colour, from: m.land.from * L, beyond: m.land.beyond ?? 8 } : null,
      sand: m.sand ? { colour: m.sand.colour, from: m.sand.from * L } : null
    });
    progress('Laying the snow', 0.05);
    await idle();
    this.buildTerrain();
    this.buildBackdrop();
    progress('Shaping the jumps', 0.25);
    await idle();
    this.buildKickers();
    this.buildIce();
    progress('Fetching trees, lifts and chalets', 0.32);
    const want = ['spruce', 'pine', 'pylon', 'chair', 'snowman', 'hay', 'snowFence', 'boulders', 'outcrop', 'startHut', 'hut', 'cannon'];
    if (m.village) want.push('chalet', 'barn', 'fir', 'baseStation', 'bunting', 'present');
    if (m.lanterns) want.push('lantern');
    if (m.lifts?.some((l) => l.cabin === 'gondola')) want.push('gondola');
    this.plan = sceneryPlan(c, m);
    for (const k of new Set(this.plan.map((p) => p.kind))) if (!BUILDERS[k] && k !== 'prayer' && !want.includes(k)) want.push(k);
    const kits = {};
    await Promise.all(want.map(async (k) => {
      kits[k] = await loadKit(k, k === 'lantern' ? { emissiveTest: (mat) => isWarm(mat.color), emissive: '#ffb050' } : k === 'cannon' ? { skip: (n) => /^(plume|streak)/.test(n) } : {});
    }));
    this.kits = kits;
    progress('Putting up fences and flags', 0.55);
    await idle();
    this.buildFences();
    this.buildPoles();
    this.buildFlags();
    this.buildBarriers();
    progress('Planting the forest', 0.65);
    await idle();
    this.buildTrees();
    progress('Hanging the ski lifts', 0.75);
    await idle();
    this.buildLifts();
    this.buildArches();
    this.buildEnds();
    this.buildCannons();
    if (m.lanterns) this.buildLanterns();
    progress('Scattering stars and snowballs', 0.85);
    await idle();
    this.buildPickups();
    this.buildSpectators();
    this.buildBells();
    this.buildFans();
    progress('Raising the famous mountain on the skyline', 0.9);
    await idle();
    this.buildLandmarks();
  }

  /* ---------------------------------------------------------------- the famous mountain and its place */

  buildLandmarks() {
    const c = this.course, m = this.mountain;
    if (m.peak) {
      this.hero = buildHeroPeak(c, m, this.sky);
      this.root.add(this.hero);
    }
    const water = buildWater(c, m);
    if (water) this.root.add(water);
    // the scenery beside the run, one instanced group per kind per section
    const byKey = new Map();
    const over = [];
    for (const it of this.plan ?? []) {
      if (it.kind === 'prayer') {
        over.push(it);
        continue;
      }
      const sec = this.section(it.s);
      const key = `${it.kind}|${sec.id}`;
      if (!byKey.has(key)) byKey.set(key, { kind: it.kind, sec, list: [] });
      const p = toWorld(c, it.s, it.lat, 0, {});
      if (!this.valid(p.x, p.z, it.s, it.lat)) continue;
      byKey.get(key).list.push({ x: p.x, y: p.y - 0.08, z: p.z, ry: it.ry, s: it.scale });
    }
    this.sceneryKits ??= {};
    for (const { kind, sec, list } of byKey.values()) {
      if (!list.length) continue;
      const kit = this.kits[kind] ?? (this.sceneryKits[kind] ??= BUILDERS[kind]?.());
      if (!kit) continue;
      sec.add(instance(kit, list));
    }
    if (over.length) this.root.add(prayerFlags(c, over));
    // the mountain railway over the run (the Matterhorn)
    if (m.train) {
      let best = c.length * 0.45, bk = Infinity;
      for (let s = c.length * 0.3; s < c.length * 0.7; s += 10) {
        const k = Math.abs(c.curvature[Math.round(s)]) + (c.kickers.some((kk) => Math.abs(kk.s - s) < 30) ? 1 : 0);
        if (k < bk) {
          bk = k;
          best = s;
        }
      }
      this.train = buildTrain(c, best);
      this.section(best).add(this.train);
      c.trainS = best;
    }
  }

  /* ---------------------------------------------------------------- snow */

  /** How far the course-space ground may reach on one side at s without folding over itself in a turn. */
  reach(s, side) {
    const c = this.course;
    let k = 0;
    for (let j = -30; j <= 30; j += 6) k = Math.max(k, side * c.curvature[Math.max(0, Math.min(c.n - 1, Math.round(s + j)))]);
    if (k <= 1e-4) return 63;
    const W = frameAt(c, s, _f).width;
    return Math.max(8, Math.min(63, 0.78 / k - W));
  }

  /** Is a world point really beside the run at s (not across a bend, nearer another stretch)? */
  valid(x, z, s, lat) {
    const c = this.course;
    if (lat !== 0 && Math.abs(lat) > frameAt(c, s, _f).width + this.reach(s, Math.sign(lat))) return false;
    const p = project(c, x, z, s, 260);
    return Math.abs(p.s - s) < 12;
  }

  /** A world-space ground under everything: fills the inside of tight turns and the far slopes. */
  buildBackdrop() {
    const c = this.course;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < c.n; i += 5) {
      x0 = Math.min(x0, c.px[i]); x1 = Math.max(x1, c.px[i]);
      z0 = Math.min(z0, c.pz[i]); z1 = Math.max(z1, c.pz[i]);
    }
    const M = 140, cell = 8;
    x0 -= M; z0 -= M; x1 += M; z1 += M;
    const nx = Math.ceil((x1 - x0) / cell) + 1, nz = Math.ceil((z1 - z0) / cell) + 1;
    const pos = new Float32Array(nx * nz * 3), crs = new Float32Array(nx * nz * 3), side = new Float32Array(nx * nz * 2);
    let hint = 0;
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const x = x0 + i * cell, z = z0 + j * cell;
        const p = project(c, x, z, hint, i === 0 ? 3000 : 220);
        hint = p.s;
        const f = frameAt(c, p.s, _f);
        const W = f.width;
        const a = Math.abs(p.lat);
        // beyond the run's own ground keep rising like the mountainside; under the run, tuck away
        let y = groundAt(c, p.s, Math.sign(p.lat) * Math.min(a, W + 95), false) - 0.7;
        if (a < W + 6) y -= 3;
        const o = (j * nx + i) * 3;
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
        crs[o] = p.s; crs[o + 1] = p.lat; crs[o + 2] = W;
        side[(j * nx + i) * 2] = f.rx;
        side[(j * nx + i) * 2 + 1] = f.rz;
      }
    }
    const idx = [];
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('course', new THREE.BufferAttribute(crs, 3));
    g.setAttribute('side', new THREE.BufferAttribute(side, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // keep the normals pointing up whichever way the grid winds
    const nrm = g.attributes.normal;
    let flip = 0;
    for (let i = 0; i < nrm.count; i += 50) flip += nrm.getY(i);
    if (flip < 0) {
      for (let t = 0; t < idx.length; t += 3) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
      g.setIndex(idx);
      g.computeVertexNormals();
    }
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, this.snow);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.root.add(mesh);
    this.backdrop = mesh;
  }

  buildTerrain() {
    const c = this.course;
    const total = c.n - 1;
    const cols = [];
    for (let i = OUT.length - 1; i >= 0; i--) cols.push({ out: -OUT[i] });
    for (let i = 0; i < IN_COLS; i++) cols.push({ t: -1 + (2 * i) / (IN_COLS - 1) });
    for (const d of OUT) cols.push({ out: d });
    const latOf = (col, W, s) => {
      if (col.t != null) return col.t * W;
      const side = Math.sign(col.out);
      return side * (W + Math.abs(col.out) * this.reach(s, side) / 63);
    };
    const CH = 50;
    for (let s0 = -20; s0 < total; s0 += CH) {
      const s1 = Math.min(total, s0 + CH);
      const rows = Math.round(s1 - s0) + 1;
      const nc = cols.length;
      const pos = new Float32Array(rows * nc * 3), nor = new Float32Array(rows * nc * 3), crs = new Float32Array(rows * nc * 3), side = new Float32Array(rows * nc * 2);
      const P = (s, lat) => {
        const f = frameAt(c, Math.max(0, s), _f);
        // before the start the run continues up a little (the start ramp)
        const back = Math.min(0, s);
        const y = groundAt(c, Math.max(0, s), lat, false) - back * Math.tan(f.pitch);
        return [f.x + f.rx * lat + f.tx * back, y, f.z + f.rz * lat + f.tz * back];
      };
      for (let r = 0; r < rows; r++) {
        const s = s0 + r;
        const f = frameAt(c, Math.max(0, s), {});
        const W = f.width;
        for (let k = 0; k < nc; k++) {
          const lat = latOf(cols[k], W, Math.max(0, s));
          const p = P(s, lat);
          const o = (r * nc + k) * 3;
          pos[o] = p[0]; pos[o + 1] = p[1]; pos[o + 2] = p[2];
          // normal from neighbours (exact, so chunks meet without seams)
          const e = 0.5;
          const a = P(s, lat - e), b = P(s, lat + e), d0 = P(s - e, lat), d1 = P(s + e, lat);
          const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
          const vx = d1[0] - d0[0], vy = d1[1] - d0[1], vz = d1[2] - d0[2];
          let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
          if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
          const l = Math.hypot(nx, ny, nz) || 1;
          nor[o] = nx / l; nor[o + 1] = ny / l; nor[o + 2] = nz / l;
          crs[o] = s; crs[o + 1] = lat; crs[o + 2] = W;
          side[(r * nc + k) * 2] = f.rx;
          side[(r * nc + k) * 2 + 1] = f.rz;
        }
      }
      const idx = [];
      for (let r = 0; r < rows - 1; r++) for (let k = 0; k < nc - 1; k++) {
        const a = r * nc + k, b = a + 1, d = a + nc, e = d + 1;
        idx.push(a, b, d, b, e, d);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('course', new THREE.BufferAttribute(crs, 3));
      g.setAttribute('side', new THREE.BufferAttribute(side, 2));
      g.setIndex(idx);
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, this.snow);
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      this.section(Math.max(0, s0)).add(mesh);
    }
  }

  /** A snow mesh over a patch of course space: (s, lat) → height via fn. */
  patch(s0, s1, l0, l1, ns, nl, heightFn, material) {
    const c = this.course;
    const pos = [], nor = [], crs = [], side = [], idx = [];
    const H = (s, lat) => {
      const p = toWorld(c, s, lat, 0, {});
      p.y = heightFn(s, lat) + 0.004;
      return p;
    };
    for (let i = 0; i <= ns; i++) {
      const s = s0 + ((s1 - s0) * i) / ns;
      const f = frameAt(c, s, {});
      for (let j = 0; j <= nl; j++) {
        const lat = l0 + ((l1 - l0) * j) / nl;
        const p = H(s, lat);
        const e = 0.15;
        const a = H(s, lat - e), b = H(s, lat + e), d0 = H(s - e, lat), d1 = H(s + e, lat);
        const u = [b.x - a.x, b.y - a.y, b.z - a.z], v = [d1.x - d0.x, d1.y - d0.y, d1.z - d0.z];
        let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        if (n[1] < 0) n = n.map((x) => -x);
        const l = Math.hypot(...n) || 1;
        pos.push(p.x, p.y, p.z);
        nor.push(n[0] / l, n[1] / l, n[2] / l);
        crs.push(s, lat, f.width);
        side.push(f.rx, f.rz);
      }
    }
    for (let i = 0; i < ns; i++) for (let j = 0; j < nl; j++) {
      const a = i * (nl + 1) + j, b = a + 1, d = a + nl + 1, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('course', new THREE.Float32BufferAttribute(crs, 3));
    g.setAttribute('side', new THREE.Float32BufferAttribute(side, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return new THREE.Mesh(g, material);
  }

  buildKickers() {
    const c = this.course;
    const lipM = new THREE.MeshStandardNodeMaterial({ color: this.mountain.fence.colour, roughness: 0.5 });
    for (const k of c.kickers) {
      const back = 1.3;
      const hw = k.w * 0.5 * 1.18;
      const mesh = this.patch(k.s - 0.4, k.s + k.len + back, k.lat - hw, k.lat + hw, 36, 18, (s, lat) => {
        const base = groundAt(c, s, lat, false);
        if (s <= k.s + k.len) return base + rampShape(k, s, lat);
        // the back of the lip falls away steeply, rounded
        const u = (s - k.s - k.len) / back;
        const top = rampShape(k, k.s + k.len - 0.001, lat);
        return base + top * Math.max(0, 1 - u * u) ** 0.7;
      }, this.snow);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.section(k.s).add(mesh);
      // the painted lip line and two little marker flags
      const f = frameAt(c, k.s + k.len - 0.15, {});
      const p = toWorld(c, k.s + k.len - 0.15, k.lat, 0, {});
      const lip = new THREE.Mesh(new THREE.BoxGeometry(k.w * 0.78, 0.05, 0.22), lipM);
      lip.position.set(p.x, groundAt(c, k.s + k.len - 0.15, k.lat) + 0.01, p.z);
      lip.rotation.set(-Math.atan(k.h * 1.75 / k.len) * 0.9, -f.heading, 0, 'YXZ');
      this.section(k.s).add(lip);
      for (const sd of [-1, 1]) {
        const q = toWorld(c, k.s + k.len - 0.3, k.lat + sd * (k.w * 0.5 + 0.5), 0, {});
        this.addFlagPole(this.section(k.s), q, sd < 0 ? '#ff5a5f' : '#3a86ff', 1.6);
      }
    }
  }

  buildIce() {
    const c = this.course;
    if (!c.ice.length) return;
    const mat = iceMaterial();
    for (const p of c.ice) {
      const mesh = this.patch(p.s, p.s + p.len, p.lat - p.w / 2, p.lat + p.w / 2, 12, 10, (s, lat) => groundAt(c, s, lat, false) + 0.025, mat);
      // round the patch: squash the corners down under the snow
      const pos = mesh.geometry.attributes.position, crs = mesh.geometry.attributes.course;
      for (let i = 0; i < pos.count; i++) {
        const u = (crs.getX(i) - p.s - p.len / 2) / (p.len / 2), v = (crs.getY(i) - p.lat) / (p.w / 2);
        if (u * u + v * v > 1) pos.setY(i, pos.getY(i) - 0.12);
      }
      mesh.receiveShadow = true;
      this.section(p.s).add(mesh);
    }
    if (c.creek) {
      const s = c.creek.s;
      const W = frameAt(c, s, _f).width;
      const mesh = this.patch(s - 2.2, s + 2.2, -W - 22, W + 22, 6, 60, (ss, lat) => groundAt(c, ss, lat, false) + 0.02, mat);
      mesh.receiveShadow = true;
      this.section(s).add(mesh);
    }
  }

  /* ---------------------------------------------------------------- the speed kit */

  buildFences() {
    const c = this.course, m = this.mountain;
    const L = c.n - 1;
    const postGeo = new THREE.CylinderGeometry(0.045, 0.055, 1.25, 8).translate(0, 0.62, 0);
    const postMat = new THREE.MeshStandardNodeMaterial({ color: '#e9edf3', roughness: 0.5, metalness: 0.2 });
    const fabric = fenceMaterial(m.fence.colour, m.fence.alt);
    const step = 3;
    for (let s0 = 0; s0 < L; s0 += SECTION) {
      const s1 = Math.min(L, s0 + SECTION);
      const posts = [];
      for (const sd of [-1, 1]) {
        const verts = [], uvs = [], nrm = [], idx = [];
        let along = 0;
        for (let s = s0; s <= s1; s += 1) {
          const f = frameAt(c, s, _f);
          const lat = sd * (f.width + 3.4);
          const p = toWorld(c, s, lat, 0, _p);
          const sag = Math.sin(((s % step) / step) * Math.PI) * 0.05;
          const base = verts.length / 3;
          verts.push(p.x, p.y + 0.16 + sag, p.z, p.x, p.y + 1.04 - sag, p.z);
          uvs.push(along, 0, along, 1);
          nrm.push(-f.rx * sd, 0, -f.rz * sd, -f.rx * sd, 0, -f.rz * sd);
          if (s > s0) idx.push(base - 2, base, base - 1, base - 1, base, base + 1);
          along += 1;
          if (s % step === 0) posts.push({ x: p.x, y: p.y - 0.05, z: p.z });
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        g.setIndex(idx);
        g.computeBoundingSphere();
        const mesh = new THREE.Mesh(g, fabric);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.section(s0).add(mesh);
      }
      const im = new THREE.InstancedMesh(postGeo, postMat, posts.length);
      const m4 = new THREE.Matrix4();
      posts.forEach((p, i) => im.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
      im.castShadow = true;
      im.computeBoundingSphere();
      this.section(s0).add(im);
    }
  }

  buildPoles() {
    // Piste marker poles just off the run's edge: orange and white, every 10 m both sides.
    const c = this.course;
    const L = c.n - 1;
    const geo = new THREE.CylinderGeometry(0.035, 0.04, 1.9, 8).translate(0, 0.95, 0);
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.4 });
    const band = step(0.5, fract(positionLocal.y.mul(2.4)));
    mat.colorNode = mix(vec3(1.0, 0.42, 0.08), vec3(0.97, 0.97, 0.97), band);
    for (let s0 = 0; s0 < L; s0 += SECTION) {
      const list = [];
      for (let s = s0 + 5; s < Math.min(L, s0 + SECTION); s += 10) for (const sd of [-1, 1]) {
        const f = frameAt(c, s, _f);
        const p = toWorld(c, s, sd * (f.width + 0.9), 0, _p);
        list.push({ x: p.x, y: p.y - 0.1, z: p.z, rz: sd * 0.04 });
      }
      this.section(s0).add(instance({ parts: [{ geometry: geo, material: mat }] }, list));
    }
  }

  addFlagPole(parent, p, colour, h = 2.2) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, h, 6).translate(0, h / 2, 0), new THREE.MeshStandardNodeMaterial({ color: '#f2f2f2', roughness: 0.4 }));
    pole.position.set(p.x, p.y, p.z);
    pole.castShadow = true;
    const flag = new THREE.Mesh(this.flagGeo ??= new THREE.PlaneGeometry(0.5, 0.34, 6, 2).translate(0.25, 0, 0), wavyMaterial(colour));
    flag.position.y = h - 0.2;
    pole.add(flag);
    parent.add(pole);
    return pole;
  }

  buildFlags() {
    // Tall feather flags every ~40 m, alternating sides: the colours of the mountain.
    const c = this.course, m = this.mountain;
    const L = c.n - 1;
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 3.8, 6).translate(0, 1.9, 0);
    const poleMat = new THREE.MeshStandardNodeMaterial({ color: '#dfe4ea', roughness: 0.4, metalness: 0.3 });
    const flagGeo = new THREE.PlaneGeometry(0.8, 2.6, 4, 10);
    flagGeo.translate(0.4, 2.3, 0);
    const cols = [m.fence.colour, m.fence.alt, '#ff6fb4', '#3fd0b0'];
    const mats = cols.map((col) => wavyMaterial(col, 0.25));
    let k = 0;
    for (let s = 20; s < L - 10; s += 38) {
      const sd = k % 2 ? 1 : -1;
      const f = frameAt(c, s, _f);
      const p = toWorld(c, s, sd * (f.width + 2.3), 0, _p);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(p.x, p.y - 0.1, p.z);
      pole.rotation.y = -f.heading + (sd > 0 ? Math.PI : 0) + Math.PI / 2;
      pole.castShadow = true;
      const flag = new THREE.Mesh(flagGeo, mats[k % mats.length]);
      flag.castShadow = true;
      pole.add(flag);
      this.section(s).add(pole);
      k++;
    }
  }

  buildBarriers() {
    const c = this.course, K = this.kits;
    const by = {};
    for (const o of c.obstacles) (by[o.kind] ??= []).push(o);
    const place = (o, extra = {}) => {
      const f = frameAt(c, o.s, _f);
      const p = toWorld(c, o.s, o.lat, 0, _p);
      return { x: p.x, y: p.y - 0.05, z: p.z, ry: -f.heading + (extra.ry ?? 0), ...extra };
    };
    this.snowmen = new Map();
    const groups = (list, kit, opts) => {
      const bySec = new Map();
      for (const o of list) {
        const sec = this.section(o.s);
        if (!bySec.has(sec)) bySec.set(sec, []);
        bySec.get(sec).push(o);
      }
      for (const [sec, obs] of bySec) {
        const items = obs.map(opts);
        const g = instance(kit, items);
        sec.add(g);
        if (kit === K.snowman) obs.forEach((o, i) => this.snowmen.set(o.id, { g, i }));
      }
    };
    if (by.snowman) groups(by.snowman, K.snowman, (o) => place(o, { ry: o.rot * 0.3 - 0.3, s: 1.05 }));
    if (by.hay) groups(by.hay, K.hay, (o) => place(o, { ry: 0, sx: 2.0, sy: 1.9, sz: 2.2 }));
    if (by.fence) groups(by.fence, K.snowFence, (o) => place(o, { ry: 0, sx: 1.4, sy: 0.72, sz: 1 }));
    if (by.rock) groups(by.rock, K.boulders, (o) => place(o, { ry: o.rot, s: 0.82 }));
    if (by.log) {
      const logKit = logKitMake();
      groups(by.log, logKit, (o) => place(o, { ry: 0.08 * Math.sin(o.rot) }));
    }
    // slalom gates: two poles and a waving banner between them
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.3, 8).translate(0, 1.15, 0);
    const red = new THREE.MeshStandardNodeMaterial({ color: '#ff4b5c', roughness: 0.35 });
    const blue = new THREE.MeshStandardNodeMaterial({ color: '#3a86ff', roughness: 0.35 });
    for (const gt of c.gates) {
      const sec = this.section(gt.s);
      const mat = gt.colour === 'red' ? red : blue;
      const f = frameAt(c, gt.s, _f);
      for (const sd of [-1, 1]) {
        const p = toWorld(c, gt.s, gt.lat + sd * gt.gap, 0, _p);
        const pole = new THREE.Mesh(poleGeo, mat);
        pole.position.set(p.x, p.y - 0.05, p.z);
        pole.castShadow = true;
        sec.add(pole);
      }
      const p = toWorld(c, gt.s, gt.lat, 0, _p);
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(gt.gap * 2, 0.55, 8, 2), wavyMaterial(gt.colour === 'red' ? '#ff4b5c' : '#3a86ff', 0.12, true));
      banner.position.set(p.x, p.y + 1.85, p.z);
      banner.rotation.y = -f.heading;
      banner.castShadow = true;
      sec.add(banner);
    }
  }

  buildTrees() {
    const c = this.course, m = this.mountain, r = this.rand;
    const K = { ...this.kits };
    // tinted forests: rime-frosted "snow flower" trees, dark cedar, deep spruce
    const tint = m.trees?.tint;
    if (tint) {
      const recolour = (kit) => ({
        ...kit,
        parts: kit.parts.map((p) => {
          const mm = p.material.clone();
          const col = mm.color ?? new THREE.Color('#ffffff');
          const hsl = col.getHSL({});
          const leafy = hsl.h > 0.18 && hsl.h < 0.5;
          if (tint === 'rime') mm.color = leafy || hsl.l > 0.7 ? new THREE.Color('#e9f1fb') : col.clone();
          else if (tint === 'cedar') mm.color = leafy ? col.clone().multiplyScalar(0.62).lerp(new THREE.Color('#1f4a36'), 0.35) : col.clone();
          else if (tint === 'dark') mm.color = leafy ? col.clone().multiplyScalar(0.55).lerp(new THREE.Color('#163b2c'), 0.4) : col.clone();
          if (mm.map && tint === 'rime') mm.map = null;
          return { geometry: p.geometry, material: mm };
        })
      });
      K.spruce = recolour(K.spruce);
      K.pine = recolour(K.pine);
    }
    const L = c.n - 1;
    for (let s0 = -20; s0 < L; s0 += SECTION) {
      const spruce = [], pine = [], farSpruce = [], farPine = [];
      for (let s = Math.max(0, s0); s < Math.min(L, s0 + SECTION); s += 2.5) {
        const f = frameAt(c, s, _f);
        for (const sd of [-1, 1]) {
          // near the fence: trees right at the edge sell the speed
          if (r() < m.trees.near * 0.32) {
            const lat = sd * (f.width + 4.6 + r() * 4);
            const p = toWorld(c, s + r() * 2, lat, 0, _p);
            if (!this.valid(p.x, p.z, s, lat)) continue;
            (r() < 0.75 ? spruce : pine).push({ x: p.x, y: p.y - 0.2, z: p.z, ry: r() * 6.28, s: 0.75 + r() * 0.55 });
          }
          // the forest on the mountainside
          const n = Math.floor(m.trees.density * 2.4 + r());
          for (let i = 0; i < n; i++) {
            const lat = sd * (f.width + 9 + r() ** 0.8 * 52);
            const p = toWorld(c, s + r() * 2.5, lat, 0, _p);
            if (!this.valid(p.x, p.z, s, lat)) continue;
            const near = Math.abs(lat) < f.width + 16;
            (r() < 0.7 ? (near ? spruce : farSpruce) : near ? pine : farPine).push({ x: p.x, y: p.y - 0.3, z: p.z, ry: r() * 6.28, s: 0.9 + r() * 0.9 });
          }
        }
      }
      const sec = this.section(Math.max(0, s0));
      if (spruce.length) sec.add(instance(K.spruce, spruce, { shadow: true }));
      if (pine.length) sec.add(instance(K.pine, pine, { shadow: true }));
      if (farSpruce.length) sec.add(instance(K.spruce, farSpruce, { shadow: false }));
      if (farPine.length) sec.add(instance(K.pine, farPine, { shadow: false }));
      // a few rocks poking out of the snow up the sides
      const rocks = [];
      for (let i = 0; i < 4; i++) {
        const s = Math.max(0, s0) + r() * SECTION;
        if (s > L) continue;
        const f = frameAt(c, s, _f);
        const lat = (r() < 0.5 ? -1 : 1) * (f.width + 12 + r() * 40);
        const p = toWorld(c, s, lat, 0, _p);
        if (!this.valid(p.x, p.z, s, lat)) continue;
        rocks.push({ x: p.x, y: p.y - 0.6, z: p.z, ry: r() * 6.28, s: 1 + r() * 1.6 });
      }
      if (rocks.length) sec.add(instance(K.outcrop, rocks));
    }
  }

  /* ---------------------------------------------------------------- lifts */

  buildLifts() {
    const c = this.course, K = this.kits;
    const pylonH = K.pylon.size.y;
    const cableMat = new THREE.MeshStandardNodeMaterial({ color: '#30343c', roughness: 0.4, metalness: 0.6 });
    for (const lf of c.lifts) {
      // tower base heights
      const towers = lf.towers.map((t) => ({ ...t, y: groundAt(c, Math.max(0, Math.min(c.n - 1, t.s)), t.lat, false) - 0.2 }));
      if (towers.length < 2) continue;
      // direction of each span (for tower orientation)
      const list = towers.map((t, i) => {
        const a = towers[Math.max(0, i - 1)], b = towers[Math.min(towers.length - 1, i + 1)];
        const dx = b.x - a.x, dz = b.z - a.z;
        const l = Math.hypot(dx, dz) || 1;
        const px = -dz / l, pz = dx / l;
        return { x: t.x, y: t.y, z: t.z, ry: Math.atan2(-pz, px) };
      });
      const sec = this.section(Math.max(0, Math.min(c.n - 1, lf.s)));
      sec.add(instance(K.pylon, list));
      // two cables (up and down), sagging between towers
      const lines = [-1.75, 1.75].map((off) => towers.map((t, i) => {
        const L0 = list[i];
        const px = Math.cos(L0.ry), pz = -Math.sin(L0.ry);
        return new THREE.Vector3(t.x + px * off, t.y + pylonH - 0.55, t.z + pz * off);
      }));
      const tubes = [];
      const paths = [];
      for (const pts of lines) {
        const dense = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          const span = a.distanceTo(b);
          for (let k = 0; k < 12; k++) {
            const u = k / 12;
            const p = a.clone().lerp(b, u);
            p.y -= Math.sin(u * Math.PI) * span * 0.018;
            dense.push(p);
          }
        }
        dense.push(pts.at(-1).clone());
        paths.push(dense);
        tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dense), dense.length * 2, 0.035, 5, false));
      }
      for (const g of tubes) {
        const cable = new THREE.Mesh(g, cableMat);
        cable.castShadow = false;
        sec.add(cable);
      }
      // chairs: up one cable, down the other, a steady loop
      const loop = [...paths[0], ...paths[1].slice().reverse()];
      const cum = [0];
      for (let i = 1; i < loop.length; i++) cum.push(cum[i - 1] + loop[i].distanceTo(loop[i - 1]));
      const total = cum.at(-1);
      const n = Math.max(4, Math.floor(total / 13));
      const chairKit = (lf.cabin === 'gondola' || (lf.kind === 'along' && this.mountain.id === 'aurora')) && K.gondola ? K.gondola : K.chair;
      const chairs = instance(chairKit, new Array(n).fill(0).map(() => ({ x: 0, y: -999, z: 0 })), { shadow: true });
      chairs.children.forEach((im) => (im.frustumCulled = false));
      this.root.add(chairs);
      this.movers.push({ type: 'lift', s: lf.s, chairs, loop, cum, total, n, hang: chairKit.size.y - 0.1, speed: 2.6, t: this.rand() * 100 });
    }
  }

  /* ---------------------------------------------------------------- arches, start, finish, village */

  buildArches() {
    const c = this.course, m = this.mountain;
    for (const a of c.arches) {
      const f = frameAt(c, a.s, {});
      const W = f.width + 2.6;
      const H = a.kind === 'check' ? 6.5 : 7.5;
      if (m.arches === 'torii') {
        // red torii gates over the run instead of the inflatable arches
        this.section(a.s).add(toriiGate(c, a.s));
        if (a.kind === 'finish') this.section(a.s).add(this.patch(a.s - 0.6, a.s + 0.6, -f.width, f.width, 2, 48, (s, lat) => groundAt(c, s, lat, false) + 0.02, checkerMaterial()));
        continue;
      }
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * Math.PI;
        const lat = -Math.cos(t) * W;
        const base = groundAt(c, a.s, lat, false);
        const mid = groundAt(c, a.s, 0, false);
        const y = (base + (mid - base) * Math.sin(t)) + Math.sin(t) * H - 0.3;
        pts.push(new THREE.Vector3(f.x + f.rx * lat, y, f.z + f.rz * lat));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, a.kind === 'check' ? 0.55 : 0.85, 14, false);
      const cols = a.kind === 'finish' ? ['#ffffff', '#1d2233'] : a.kind === 'start' ? [m.fence.colour, '#ffffff'] : [m.fence.alt, m.fence.colour];
      const arch = new THREE.Mesh(tube, stripeVinyl(cols[0], cols[1], a.kind === 'finish' ? 40 : 14));
      arch.castShadow = true;
      arch.receiveShadow = true;
      this.section(a.s).add(arch);
      // the banner: hanging under the top, facing up the run
      const label = a.kind === 'finish' ? 'FINISH' : a.kind === 'start' ? 'SNOWPUFF PEAKS' : a.s < c.length / 2 ? '🔔 1/3 🔔' : '🔔 2/3 🔔';
      const tex = bannerTexture(label, a.kind === 'finish' ? '#1d2233' : m.fence.colour);
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(a.kind === 'start' ? 11 : 8, 1.6), new THREE.MeshStandardNodeMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide }));
      const top = pts[20];
      banner.position.set(top.x, top.y - 1.7, top.z);
      banner.rotation.y = -f.heading;
      banner.castShadow = true;
      this.section(a.s).add(banner);
      if (a.kind === 'finish') {
        // a checkered line across the snow
        const line = this.patch(a.s - 0.6, a.s + 0.6, -f.width, f.width, 2, 48, (s, lat) => groundAt(c, s, lat, false) + 0.02, checkerMaterial());
        this.section(a.s).add(line);
      }
    }
  }

  buildEnds() {
    const c = this.course, K = this.kits, m = this.mountain, r = this.rand;
    // the start: a hut behind the gate
    const f0 = frameAt(c, 0, {});
    const sh = toWorld(c, 0, f0.width + 5, 0, {});
    this.section(0).add(instance(K.startHut, [{ x: sh.x, y: sh.y - 0.1, z: sh.z, ry: -f0.heading + Math.PI / 2, s: 1.3 }]));
    const L = c.length;
    const fe = frameAt(c, L + 40, {});
    if (m.village) {
      const items = { chalet: [], barn: [], fir: [], present: [], cannon: [] };
      for (let s = L - 30; s < L + RUNOUT - 10; s += 18) {
        const f = frameAt(c, s, _f);
        for (const sd of [-1, 1]) {
          if (s > L - 5 && r() < 0.8) {
            const lat = sd * (f.width + 15 + r() * 14);
            const p = toWorld(c, s, lat, 0, _p);
            (r() < 0.8 ? items.chalet : items.barn).push({ x: p.x, y: p.y - 0.4, z: p.z, ry: -f.heading + (sd > 0 ? -Math.PI / 2 : Math.PI / 2) + (r() - 0.5) * 0.3, s: 1 + r() * 0.2 });
          }
          const q = toWorld(c, s + 6, sd * (f.width + 6.5 + r() * 3), 0, _p);
          items.fir.push({ x: q.x, y: q.y - 0.1, z: q.z, ry: r() * 6.28, s: 1.3 + r() * 0.5 });
          if (r() < 0.35) {
            const g = toWorld(c, s + 3, sd * (f.width + 4.5), 0, _p);
            items.present.push({ x: g.x, y: g.y - 0.05, z: g.z, ry: r() * 6.28, s: 0.8 + r() * 0.4 });
          }
        }
      }
      const fc = toWorld(c, L - 60, -(frameAt(c, L - 60, _f).width + 6), 0, {});
      items.cannon.push({ x: fc.x, y: fc.y, z: fc.z, ry: -frameAt(c, L - 60, _f).heading + 0.6, s: 0.7 });
      const sec = this.section(L);
      for (const [k, list] of Object.entries(items)) if (list.length && K[k]) sec.add(instance(K[k], list));
      const bs = toWorld(c, L + 90, fe.width + 26, 0, {});
      sec.add(instance(K.baseStation, [{ x: bs.x, y: bs.y - 0.5, z: bs.z, ry: -fe.heading - Math.PI / 2 }]));
    } else {
      // a refuge hut and a few huts by the finish
      const sec = this.section(L);
      const list = [];
      for (const sd of [-1, 1]) {
        const p = toWorld(c, L + 30 + r() * 30, sd * (fe.width + 14), 0, {});
        list.push({ x: p.x, y: p.y - 0.4, z: p.z, ry: -fe.heading + (sd > 0 ? -Math.PI / 2 : Math.PI / 2), s: 1.2 });
      }
      sec.add(instance(K.hut, list));
    }
  }

  /**
   * Snowmaking guns beside the run, blowing gentle plumes away over the
   * slope (the plume itself is particles, game-side: world.cannons).
   */
  buildCannons() {
    const c = this.course, K = this.kits, r = this.rand;
    this.cannons = [];
    if (!K.cannon) return;
    const L = c.length;
    let sd = r() < 0.5 ? -1 : 1;
    for (let s = 150 + r() * 60; s < L - 90; s += 210 + r() * 90) {
      const f = frameAt(c, s, _f);
      const lat = sd * (f.width + 5 + r() * 2);
      const p = toWorld(c, s, lat, 0, {});
      if (!this.valid(p.x, p.z, s, lat)) {
        sd = -sd;
        continue;
      }
      // the forward (downhill) and outward directions here
      const q = toWorld(c, s + 2, lat, 0, {});
      const fx = (q.x - p.x) / 2, fz = (q.z - p.z) / 2;
      const ox = f.rx * sd, oz = f.rz * sd;
      const dx = fx * 0.75 + ox * 0.65, dz = fz * 0.75 + oz * 0.65;
      const n = Math.hypot(dx, dz);
      const ux = dx / n, uz = dz / n;
      // the model's barrel points along its +x
      const ry = Math.atan2(-uz, ux);
      const sc = 1.05;
      this.section(s).add(instance(K.cannon, [{ x: p.x, y: p.y - 0.1, z: p.z, ry, s: sc }]));
      // the nozzle: the barrel's mouth, ~3 m up and a little ahead of the mast
      const top = K.cannon.size.y * sc;
      this.cannons.push({ s, x: p.x + ux * 0.75 * sc, y: p.y - 0.1 + top * 0.78, z: p.z + uz * 0.75 * sc, dx: ux, dz: uz, t: r() * 10 });
      sd = -sd;
    }
  }

  buildLanterns() {
    const c = this.course, K = this.kits;
    const L = c.n - 1;
    for (let s0 = 0; s0 < L; s0 += SECTION) {
      const list = [];
      for (let s = s0 + 8; s < Math.min(L, s0 + SECTION); s += 16) {
        const sd = Math.floor(s / 16) % 2 ? 1 : -1;
        const f = frameAt(c, s, _f);
        const lat = sd * (f.width + 1.6);
        const p = toWorld(c, s, lat, 0, _p);
        list.push({ x: p.x, y: p.y - 0.1, z: p.z, ry: -f.heading + (sd > 0 ? Math.PI : 0), s: 1.25 });
        this.lanternSpots.push({ s, x: p.x, y: p.y + 3.1, z: p.z });
      }
      this.section(s0).add(instance(K.lantern, list));
    }
    // a pool of real lights, moved to the lanterns just ahead
    this.lights = [];
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight('#ffb35a', 9, 14, 1.8);
      l.castShadow = false;
      this.root.add(l);
      this.lights.push(l);
    }
  }

  /* ---------------------------------------------------------------- pickups */

  buildPickups() {
    const c = this.course;
    // Every item reads from far away: a coloured beam of light, a glowing ring on the snow,
    // and the item itself floating, bobbing and spinning — gold stars, icy-blue snowballs, mint shields.
    this.items = [];
    for (const gf of c.gifts) this.items.push({ id: gf.id, kind: 'gift', s: gf.s, lat: gf.lat, h: gf.h, risky: Boolean(gf.risky) });
    for (const p of c.piles) this.items.push({ id: p.id, kind: 'pile', s: p.s, lat: p.lat, h: 1.25 });
    this.items.sort((x, y) => x.s - y.s);
    for (const it of this.items) {
      const g = toWorld(c, it.s, it.lat, 0, {});
      it.x = g.x;
      it.gy = g.y;
      it.z = g.z;
      it.ph = this.rand() * 6.28;
    }
    const COL = { gift: new THREE.Color('#ff5fa2'), pile: new THREE.Color('#5ec8ff') };
    this.itemCol = COL;
    const byKind = (k) => this.items.filter((it) => it.kind === k);
    const fresnel = pow(float(1).sub(abs(dot(normalView, positionViewDirection))), 2);
    // gift boxes: wrapped presents in bright paper with a ribbon, glowing round the edges
    const gifts = byKind('gift');
    const camFade = smoothstep(2.5, 9, positionWorld.sub(cameraPosition).length()).mul(0.7).add(0.3);
    const boxMat = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.35, clearcoat: 0.6 });
    boxMat.emissiveNode = vec3(1, 0.45, 0.7).mul(fresnel.mul(1.4).add(0.18)).mul(camFade);
    const ribMat = new THREE.MeshPhysicalNodeMaterial({ color: '#fff4b0', roughness: 0.3, clearcoat: 1 });
    ribMat.emissiveNode = vec3(1, 0.85, 0.35).mul(fresnel.mul(1.2).add(0.35)).mul(camFade);
    this.giftBoxes = new THREE.InstancedMesh(giftBoxGeometry(), boxMat, Math.max(1, gifts.length));
    this.giftBoxes.userData.list = gifts;
    const paper = ['#ff4b8b', '#3a86ff', '#3fd0b0', '#ffb020', '#a970ff'].map((c) => new THREE.Color(c));
    gifts.forEach((it, i) => this.giftBoxes.setColorAt(i, paper[it.id % paper.length]));
    this.ribbons = new THREE.InstancedMesh(giftRibbonGeometry(), ribMat, Math.max(1, gifts.length));
    this.ribbons.userData.list = gifts;
    // snowballs floating over each pile (the heap stays on the snow)
    const ballMat = new THREE.MeshStandardNodeMaterial({ color: '#f4fbff', roughness: 0.45 });
    ballMat.emissiveNode = vec3(0.35, 0.75, 1.0).mul(fresnel.mul(2.2).add(0.25));
    const piles = byKind('pile');
    this.pileBalls = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 3), ballMat, Math.max(1, piles.length));
    this.pileBalls.userData.list = piles;
    this.pileMesh = new THREE.InstancedMesh(pileGeometry(), new THREE.MeshStandardNodeMaterial({ color: '#f6f9ff', roughness: 0.75 }), Math.max(1, piles.length));
    const m4 = new THREE.Matrix4();
    piles.forEach((p, i) => this.pileMesh.setMatrixAt(i, m4.compose(new THREE.Vector3(p.x, p.gy - 0.05, p.z), new THREE.Quaternion(), new THREE.Vector3(1.3, 1.3, 1.3))));
    this.pileMesh.castShadow = this.pileMesh.receiveShadow = true;
    // (shields come from gifts now; this mesh stays empty)
    const shieldMat = new THREE.MeshPhysicalNodeMaterial({ color: '#7fffe0', roughness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1 });
    shieldMat.emissiveNode = vec3(0.2, 1.0, 0.8).mul(pow(float(1).sub(abs(dot(normalView, positionViewDirection))), 2.5)).mul(2.6);
    shieldMat.depthWrite = false;
    shieldMat.mrtNode = KEEP_BUFFERS();
    const shields = [];
    this.shieldMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.75, 3), shieldMat, Math.max(1, shields.length));
    this.shieldMesh.userData.list = shields;
    // beams of light and rings on the snow (one draw each for all items)
    const beamGeo = new THREE.CylinderGeometry(0.32, 0.55, 1, 16, 1, true).translate(0, 0.5, 0);
    const beamMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const by = uv().y;
    const beamA = float(1).sub(by).pow(1.6).mul(0.55).mul(sin(time.mul(3).add(by.mul(6))).mul(0.15).add(0.85));
    beamMat.colorNode = vec4(1, 1, 1, beamA); // the instance colour multiplies in
    beamMat.mrtNode = mrt({ normal: vec4(0), velocity: vec4(0), emissive: vec4(instanceColorNode().mul(beamA).mul(0.9), beamA) });
    beamMat.fog = false;
    this.beams = new THREE.InstancedMesh(beamGeo, beamMat, this.items.length);
    const ringGeo = new THREE.RingGeometry(0.75, 1.05, 40).rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const ringA = sin(time.mul(4)).mul(0.25).add(0.75);
    ringMat.colorNode = vec4(1, 1, 1, ringA);
    ringMat.mrtNode = mrt({ normal: vec4(0), velocity: vec4(0), emissive: vec4(instanceColorNode().mul(ringA).mul(0.6), ringA) });
    this.rings = new THREE.InstancedMesh(ringGeo, ringMat, this.items.length);
    this.items.forEach((it, i) => {
      this.beams.setColorAt(i, COL[it.kind]);
      this.rings.setColorAt(i, COL[it.kind]);
    });
    for (const im of [this.giftBoxes, this.ribbons, this.pileBalls, this.pileMesh, this.shieldMesh, this.beams, this.rings]) {
      im.frustumCulled = false;
      this.root.add(im);
    }
    this.giftBoxes.castShadow = true;
    this.pileBalls.castShadow = true;
    // risky bonus lines: a glowing chevron on the snow before the kicker, pointing at the stars
    const arrowTex = chevronTexture();
    const arrowMat = new THREE.MeshBasicNodeMaterial({ map: arrowTex, transparent: true, depthWrite: false });
    arrowMat.emissiveNode = color('#ffd23f').mul(texture(arrowTex).a).mul(1.2);
    arrowMat.mrtNode = mrt({ normal: vec4(0), velocity: vec4(0) });
    for (const k of c.kickers) {
      if (!c.gifts.some((g) => g.risky && Math.abs(g.s - k.s - k.len) < 20)) continue;
      for (const d of [16, 9]) {
        const f = frameAt(c, k.s - d, {});
        const p = toWorld(c, k.s - d, k.lat, 0.04, {});
        const ar = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2).rotateX(-Math.PI / 2), arrowMat);
        ar.position.set(p.x, p.y + 0.03, p.z);
        ar.rotation.y = -f.heading;
        this.section(k.s).add(ar);
      }
    }
    this.taken = new Set();
  }

  /** The next gift box just ahead of (s, lat) that you haven't opened, for a glance. */
  nextGift(s, lat) {
    for (const it of this.items ?? []) {
      if (it.kind !== 'gift' || it.s < s + 4) continue;
      if (it.s > s + 22) break;
      if (!this.taken.has(it.id) && Math.abs(it.lat - lat) < 7) return it;
    }
    return null;
  }

  /** Hide a pickup the local player took (pickups are personal). */
  take(id) {
    this.taken.add(id);
  }

  resetPickups() {
    this.taken.clear();
  }

  buildSpectators() {
    // Plush fans behind the finish fence, cheering everyone home.
    const c = this.course;
    const L = c.length;
    const r = this.rand;
    for (let i = 0; i < 8; i++) {
      const sp = ALL_SPECIES[i % ALL_SPECIES.length];
      const fan = new RiderModel(sp, { fur: 0, res: 46, shadow: true });
      const sd = i % 2 ? 1 : -1;
      const s = L - 28 + i * 3.2;
      const f = frameAt(c, s, _f);
      const p = toWorld(c, s, sd * (f.width + 4.4 + r() * 1.2), 0, _p);
      fan.root.position.set(p.x, p.y + 0.02, p.z);
      fan.root.rotation.y = -f.heading + (sd > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.PI;
      fan.board.visible = false;
      this.section(L).add(fan.root);
      this.spectators.push({ fan, s, phase: r() * 6 });
    }
  }

  /* ---------------------------------------------------------------- per frame */

  update(dt, focusS, focus) {
    if (this.hero && this.camera) faceClouds(this.hero, this.camera);
    if (this.train) {
      this.trainT = (this.trainT ?? 0) + dt;
      const span = this.train.userData.span;
      const u = (Math.sin(this.trainT * 0.18) * 0.5 + 0.5);
      this.train.userData.train.position.x = -span + 6 + u * (span * 2 - 36);
    }
    const c = this.course;
    // sections near you only
    for (const g of this.sections) {
      const s0 = g.userData.s0;
      g.visible = s0 + SECTION > focusS - 60 && s0 < focusS + 430;
    }
    const m4 = this.m4 ??= new THREE.Matrix4();
    const q = this.q ??= new THREE.Quaternion();
    const e = this.e ??= new THREE.Euler();
    const sc = this.sc ??= new THREE.Vector3();
    const p = this.pv ??= new THREE.Vector3();
    // lifts
    const cam = this.camera?.position;
    for (const mv of this.movers) {
      mv.t += dt * mv.speed;
      const near = Math.abs(mv.s - focusS) < 600;
      mv.chairs.visible = near;
      if (!near) continue;
      for (let i = 0; i < mv.n; i++) {
        const d = (mv.t + (i / mv.n) * mv.total) % mv.total;
        let k = 1;
        while (k < mv.cum.length - 1 && mv.cum[k] < d) k++;
        const a = mv.loop[k - 1], b = mv.loop[k];
        const u = (d - mv.cum[k - 1]) / Math.max(1e-4, mv.cum[k] - mv.cum[k - 1]);
        p.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u - mv.hang, a.z + (b.z - a.z) * u);
        e.set(Math.sin(mv.t * 0.7 + i) * 0.03, Math.atan2(b.x - a.x, b.z - a.z), 0);
        q.setFromEuler(e);
        // never in front of the lens: a chair that comes within ~5 m of the camera shrinks away
        let k2 = 1;
        if (cam) {
          const dc = Math.hypot(p.x - cam.x, p.y + mv.hang * 0.5 - cam.y, p.z - cam.z);
          k2 = dc > 6 ? 1 : dc < 4 ? 0 : (dc - 4) / 2;
        }
        m4.compose(p, q, sc.setScalar(k2));
        for (const im of mv.chairs.children) im.setMatrixAt(i, m4);
      }
      for (const im of mv.chairs.children) im.instanceMatrix.needsUpdate = true;
    }
    // items: bob and spin the ones near you; hide the rest and the taken
    const t = (this.time = (this.time ?? 0) + dt);
    if (this.items) {
      const show = (it) => it.s > focusS - 15 && it.s < focusS + 240 && !this.taken.has(it.id);
      for (const im of [this.giftBoxes, this.ribbons, this.pileBalls, this.shieldMesh]) {
        im.userData.list.forEach((it, i) => {
          const on = show(it);
          const big = it.kind === 'gift' ? (it.risky ? 1.25 : 1.05) : 1;
          e.set(it.kind === 'gift' ? 0.18 : 0.3, t * (it.kind === 'gift' ? 1.8 : 1.4) + it.ph, 0);
          q.setFromEuler(e);
          p.set(it.x, it.gy + it.h + Math.sin(t * 2.2 + it.ph) * 0.18, it.z);
          m4.compose(p, q, sc.setScalar(on ? big * (1 + Math.sin(t * 5 + it.ph) * 0.05) : 0));
          im.setMatrixAt(i, m4);
        });
        im.instanceMatrix.needsUpdate = true;
      }
      this.pileBalls.userData.list.forEach((it, i) => {
        if (this.taken.has(it.id) !== Boolean(it.hidden)) {
          it.hidden = this.taken.has(it.id);
          m4.compose(p.set(it.x, it.gy - 0.05, it.z), q.identity(), sc.setScalar(it.hidden ? 0 : 1.3));
          this.pileMesh.setMatrixAt(i, m4);
          this.pileMesh.instanceMatrix.needsUpdate = true;
        }
      });
      this.items.forEach((it, i) => {
        const on = show(it);
        const d = it.s - focusS;
        // beams fade in from far away and thin out right in front of you
        const k = on ? Math.min(1, Math.max(0, (d - 6) / 30)) : 0;
        m4.compose(p.set(it.x, it.gy, it.z), q.identity(), sc.set(k, on ? (it.risky ? 16 : 11) : 0, k));
        this.beams.setMatrixAt(i, m4);
        m4.compose(p.set(it.x, it.gy + 0.06, it.z), q.setFromEuler(e.set(0, t + it.ph, 0)), sc.setScalar(on && it.h < 2 ? 1 + Math.sin(t * 4 + it.ph) * 0.08 : 0));
        this.rings.setMatrixAt(i, m4);
      });
      this.beams.instanceMatrix.needsUpdate = true;
      this.rings.instanceMatrix.needsUpdate = true;
    }
    // lantern lights: the six nearest ahead
    if (this.lights) {
      let j = 0;
      for (const sp of this.lanternSpots) {
        if (sp.s < focusS - 12) continue;
        if (j >= this.lights.length) break;
        this.lights[j].position.set(sp.x, sp.y, sp.z);
        this.lights[j].intensity = 9 * (0.92 + Math.sin(t * 7 + j) * 0.05);
        j++;
      }
    }
    // spectators cheer when you come near
    for (const sp of this.spectators) {
      const near = Math.abs(sp.s - focusS) < 90;
      sp.fan.root.visible = near;
      sp.cheerT = Math.max(0, (sp.cheerT ?? 0) - dt);
      const passing = Math.abs(sp.s - focusS) < 18;
      if (near) {
        const ms = (sp.st ??= { menu: true, cheer: false });
        ms.cheer = sp.cheerT > 0 || passing || (sp.s > this.course.length - 40 && Math.sin(t * 2 + sp.phase) > -0.3);
        sp.fan.pose(dt, ms);
      }
    }
    // bells swing when rung
    if (this.bellMap) for (const b of this.bellMap.values()) {
      b.v += (-b.swing * 30 - b.v * 1.6) * dt;
      b.swing += b.v * dt;
      b.pivot.rotation.x = b.swing * 0.4;
    }
  }

  /* ---------------------------------------------------------------- the interactive mountain */

  /** Little arches with a brass bell over some landings (rung by jumping through). */
  buildBells() {
    const c = this.course;
    this.bellMap = new Map();
    const cow = this.mountain.bells === 'cowbell';
    // a round brass bell, or (in the Alps) a big square-shouldered cowbell on a red-and-white strap
    const bellGeo = cow ? new THREE.CylinderGeometry(0.3, 0.46, 0.7, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.7).translate(0, -0.45, 0) : new THREE.SphereGeometry(0.42, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.62).translate(0, -0.42, 0);
    const bellMat = new THREE.MeshPhysicalNodeMaterial({ color: cow ? '#c98b3a' : '#ffc94a', roughness: cow ? 0.4 : 0.25, metalness: 0.85, clearcoat: 1 });
    bellMat.emissiveNode = vec3(0.6, 0.4, 0.05).mul(pow(float(1).sub(abs(dot(normalView, positionViewDirection))), 2));
    for (const b of c.bells) {
      const f = frameAt(c, b.s, {});
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * Math.PI;
        const lat = b.lat - Math.cos(a) * (b.w / 2);
        const base = groundAt(c, b.s, lat, false);
        const p = toWorld(c, b.s, lat, 0, {});
        pts.push(new THREE.Vector3(p.x, base + Math.sin(a) * b.h, p.z));
      }
      const arch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.16, 8), stripeVinyl(this.mountain.fence.alt, '#ffffff', 10));
      arch.castShadow = true;
      this.section(b.s).add(arch);
      const pivot = new THREE.Group();
      pivot.position.copy(pts[12]).add(new THREE.Vector3(0, -0.12, 0));
      pivot.rotation.y = -f.heading;
      const bell = new THREE.Mesh(bellGeo, bellMat);
      const clap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), bellMat);
      clap.position.y = -0.82;
      pivot.add(bell, clap);
      this.section(b.s).add(pivot);
      this.bellMap.set(b.id, { pivot, swing: 0, v: 0 });
    }
  }

  ringBell(id) {
    const b = this.bellMap?.get(id);
    if (b) b.v += 6;
  }

  /** Burst a snowman (any rider rode through it): it vanishes in a poof for everyone here. */
  burstSnowman(id) {
    const ref = this.snowmen?.get(id);
    if (!ref) return;
    const m4 = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const im of ref.g.children) {
      im.setMatrixAt(ref.i, m4);
      im.instanceMatrix.needsUpdate = true;
    }
  }

  /** Dropped ice patches: show the live ones. */
  syncIce(list) {
    this.iceMeshes ??= new Map();
    const live = new Set(list.map((x) => x.id));
    for (const [id, m] of this.iceMeshes) if (!live.has(id)) {
      m.removeFromParent();
      m.geometry.dispose();
      this.iceMeshes.delete(id);
    }
    for (const p of list) {
      if (this.iceMeshes.has(p.id)) continue;
      const mesh = this.patch(p.s, p.s + p.len, p.lat - p.w / 2, p.lat + p.w / 2, 10, 8, (s, lat) => groundAt(this.course, s, lat) + 0.04, this.iceMat ??= iceMaterial());
      const pos = mesh.geometry.attributes.position, crs = mesh.geometry.attributes.course;
      for (let i = 0; i < pos.count; i++) {
        const u = (crs.getX(i) - p.s - p.len / 2) / (p.len / 2), v = (crs.getY(i) - p.lat) / (p.w / 2);
        if (u * u + v * v > 1) pos.setY(i, pos.getY(i) - 0.12);
      }
      mesh.receiveShadow = true;
      this.root.add(mesh);
      this.iceMeshes.set(p.id, mesh);
    }
  }

  /** A clump of snow falling from a chair (i = its index; -1 tidies spares). */
  dropSnow(i, d, w) {
    this.clumps ??= [];
    if (i < 0) {
      for (const m of this.clumps.splice(0)) m.visible = false;
      return;
    }
    let m = this.clumps[i];
    if (!m) {
      m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 2), new THREE.MeshStandardNodeMaterial({ color: '#f4f8ff', roughness: 0.8 }));
      m.castShadow = true;
      this.root.add(m);
      this.clumps[i] = m;
    }
    m.visible = true;
    const fall = Math.min(1, d.t / 0.9);
    m.position.set(w.x, w.y + 8.5 * (1 - fall * fall), w.z);
    const sq = d.landed ? Math.max(0.2, 1 - (d.t - 0.9) * 0.3) : 1;
    m.scale.set(1.3, d.landed ? 0.45 * sq : 1, 1.3);
  }

  /** Fans along the fences that cheer when you pass or land a trick near them. */
  buildFans() {
    const c = this.course, r = this.rand;
    const L = c.length;
    for (const s0 of [L * 0.2, L * 0.42, L * 0.6, L * 0.82]) {
      const sd = r() < 0.5 ? -1 : 1;
      for (let i = 0; i < 3; i++) {
        const s = s0 + i * 2.2;
        const f = frameAt(c, s, _f);
        const lat = sd * (f.width + 4.6 + r() * 0.8);
        const p = toWorld(c, s, lat, 0, _p);
        if (!this.valid(p.x, p.z, s, lat)) continue;
        const fan = new RiderModel(ALL_SPECIES[(i + Math.floor(s0)) % ALL_SPECIES.length], { fur: 0, res: 40, shadow: false });
        fan.root.position.set(p.x, p.y + 0.02, p.z);
        fan.root.rotation.y = -f.heading + (sd > 0 ? Math.PI / 2 : -Math.PI / 2) + Math.PI;
        fan.board.visible = false;
        this.section(s).add(fan.root);
        this.spectators.push({ fan, s, phase: r() * 6 });
      }
    }
  }

  /** Make the fans near `s` jump and wave for a while. */
  cheer(s, secs = 2) {
    for (const sp of this.spectators) if (Math.abs(sp.s - s) < 60) sp.cheerT = Math.max(sp.cheerT ?? 0, secs);
  }

  dispose() {
    this.root.traverse((o) => {
      o.geometry?.dispose?.();
    });
    this.root.removeFromParent();
  }
}

/* ---------------------------------------------------------------- helpers */

const idle = () => new Promise((r) => setTimeout(r, 0));

function isWarm(col) {
  if (!col) return false;
  const hsl = {};
  col.getHSL(hsl);
  return hsl.h > 0.08 && hsl.h < 0.18 && hsl.s > 0.5 && hsl.l > 0.45;
}

/** Fabric fence panels: the mountain's colour with a band and a row of stars, a soft fold shading. */
function fenceMaterial(colour, alt) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, side: THREE.DoubleSide });
  const u = uv();
  const band = step(0.78, u.y).add(step(u.y, 0.1)).clamp(0, 1);
  const dots = step(0.82, fract(u.x.mul(0.5)).sub(0.5).abs().mul(-1).add(1)).mul(step(0.38, u.y)).mul(step(u.y, 0.62));
  const fold = sin(u.x.mul(Math.PI * 2 / 3)).mul(0.06);
  const base = mix(color(colour), color(alt), band);
  m.colorNode = mix(base, vec3(1, 1, 1), dots.mul(0.85)).mul(fold.add(1));
  return m;
}

/** A flag that waves (vertex sway grows away from the pole). */
function wavyMaterial(colour, amp = 0.18, both = false) {
  const m = new THREE.MeshStandardNodeMaterial({ color: colour, roughness: 0.7, side: THREE.DoubleSide });
  const u = uv();
  const ph = hash(instanceIndex).mul(6.28);
  const wave = sin(time.mul(7).add(u.x.mul(5)).add(positionWorld.x.mul(0.3)).add(ph)).mul(u.x.mul(amp)).add(sin(time.mul(11).add(u.y.mul(3))).mul(both ? amp * 0.4 : amp * 0.25).mul(u.x));
  m.positionNode = positionLocal.add(vec3(0, 0, wave));
  m.colorNode = color(colour).mul(float(1).sub(abs(wave).mul(0.8)));
  return m;
}

/** Glossy inflatable vinyl in two-colour stripes along the tube. */
function stripeVinyl(a, b, count) {
  const m = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const k = step(0.5, fract(uv().x.mul(count)));
  m.colorNode = mix(color(a), color(b), k);
  return m;
}

function checkerMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.6 });
  const c = attributeCourse();
  const k = step(0.5, fract(c.x.mul(0.8))).add(step(0.5, fract(c.y.mul(0.8)))).mod(2);
  m.colorNode = mix(vec3(0.08, 0.09, 0.12), vec3(0.97, 0.97, 0.99), k);
  return m;
}
const attributeCourse = () => attribute('course', 'vec3');

function bannerTexture(text, colour) {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 160;
  const g = cv.getContext('2d');
  g.fillStyle = colour;
  g.fillRect(0, 0, 1024, 160);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 10, 1024, 6);
  g.fillRect(0, 144, 1024, 6);
  g.font = '900 96px "Nunito Variable", Nunito, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(0,0,0,.25)';
  g.strokeText(text, 512, 84);
  g.fillText(text, 512, 84);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function giftBoxGeometry() {
  const g = new THREE.BoxGeometry(0.8, 0.7, 0.8, 4, 4, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    // soften the corners: a plump, rounded present
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    const c = new THREE.Vector3(Math.max(-0.3, Math.min(0.3, v.x)), Math.max(-0.25, Math.min(0.25, v.y)), Math.max(-0.3, Math.min(0.3, v.z)));
    const d = v.clone().sub(c);
    if (d.length() > 1e-5) v.copy(c.add(d.setLength(0.1)));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function giftRibbonGeometry() {
  const parts = [new THREE.BoxGeometry(0.84, 0.74, 0.16), new THREE.BoxGeometry(0.16, 0.74, 0.84)];
  for (const sd of [-1, 1]) parts.push(new THREE.TorusGeometry(0.13, 0.05, 8, 16).rotateY(sd * 0.6).translate(sd * 0.12, 0.45, 0));
  const flat = parts.map((x) => (x.index ? x.toNonIndexed() : x));
  let n = 0;
  for (const x of flat) n += x.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const x of flat) {
    pos.set(x.attributes.position.array, o);
    nor.set(x.attributes.normal.array, o);
    o += x.attributes.position.array.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

function chevronTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffd23f';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 8;
  g.lineJoin = 'round';
  for (const y of [18, 62]) {
    g.beginPath();
    g.moveTo(18, y + 42);
    g.lineTo(64, y);
    g.lineTo(110, y + 42);
    g.lineTo(110, y + 62);
    g.lineTo(64, y + 22);
    g.lineTo(18, y + 62);
    g.closePath();
    g.fill();
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function pileGeometry() {
  const parts = [new THREE.SphereGeometry(0.75, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1)];
  const balls = [[0, 0.42, 0, 0.2], [0.26, 0.3, 0.1, 0.17], [-0.24, 0.3, 0.12, 0.17], [0.05, 0.3, -0.27, 0.17], [0.08, 0.6, 0.05, 0.15]];
  for (const [x, y, z, r] of balls) parts.push(new THREE.SphereGeometry(r, 14, 10).translate(x, y, z));
  const flat = parts.map((g) => g.toNonIndexed());
  let count = 0;
  for (const g of flat) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
  let o = 0;
  for (const g of flat) {
    pos.set(g.attributes.position.array, o);
    nor.set(g.attributes.normal.array, o);
    o += g.attributes.position.array.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

let logKitCache = null;
/** A jumpable log: bark, pale end rings and a cap of snow. */
function logKitMake() {
  if (logKitCache) return logKitCache;
  const bark = new THREE.MeshStandardNodeMaterial({ roughness: 0.9 });
  const p = positionLocal;
  bark.colorNode = mix(vec3(0.36, 0.24, 0.16), vec3(0.5, 0.35, 0.22), mx_noise_float(p.mul(vec3(8, 2, 2))).mul(0.5).add(0.5));
  const body = new THREE.CylinderGeometry(0.3, 0.32, 3.4, 16, 1).rotateZ(Math.PI / 2).translate(0, 0.3, 0);
  const ends = new THREE.CylinderGeometry(0.29, 0.29, 3.42, 16, 1, false).rotateZ(Math.PI / 2).translate(0, 0.3, 0);
  ends.deleteAttribute('uv');
  const ring = new THREE.MeshStandardNodeMaterial({ color: '#e0c49a', roughness: 0.8 });
  const snowCap = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.75, 0.16, 0.34).translate(0, 0.56, 0);
  const snowM = new THREE.MeshStandardNodeMaterial({ color: '#f4f7fc', roughness: 0.8 });
  logKitCache = { parts: [{ geometry: body, material: bark }, { geometry: ends, material: ring }, { geometry: snowCap, material: snowM }], size: new THREE.Vector3(3.4, 0.7, 0.64) };
  return logKitCache;
}

export { max, smoothstep, normalWorld, uniform };
