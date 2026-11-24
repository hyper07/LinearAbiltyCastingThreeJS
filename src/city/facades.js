import * as THREE from 'three';

/**
 * Real facades for the buildings beside a bike course. Far off, the city's
 * buildings are its one shader (windows painted on); near the course, each
 * wall that faces the street gets what you'd see riding past: window frames
 * and sills standing out of the wall on the shader's own window grid,
 * balconies with rails on the flats and the low villas, a shopfront frame
 * and a striped awning over the shops, gutters, and on the roofs water
 * tanks, air-conditioning units, a stair hut and a rail.
 *
 * Built a few buildings at a time as you come near (one mesh of vertex
 * colours for a batch), cleared when you have gone. The bricks, render and
 * tiles themselves are the city shader's (SeoulGame), near the camera.
 */

const NEAR_COURSE = 26; // metres from the course
const BUILD = 170;
const DROP = 280;
const C = (hex) => new THREE.Color(hex);
const FRAME = [C('#f2f0ea'), C('#3a3c40'), C('#8c8f94'), C('#e8e2d4')];
const AWN = [[C('#d8402a'), C('#f2f0ea')], [C('#1f5bb5'), C('#f2f0ea')], [C('#2f8f4e'), C('#f2f0ea')], [C('#f2c230'), C('#3a3c40')], [C('#7a2bd1'), C('#f2f0ea')]];

class Tris {
  constructor() {
    this.pos = [];
    this.col = [];
  }
  quad(a, b, c, d, col) {
    for (const p of [a, b, c, a, c, d]) this.pos.push(p[0], p[1], p[2]);
    for (let k = 0; k < 6; k++) this.col.push(col.r, col.g, col.b);
  }
  /** A box on a wall: `o` its centre, `u` along the wall, `n` out of it (unit), half sizes (along, up, out). */
  box(o, u, n, hu, hy, hn, col) {
    const P = (a, y, b) => [o[0] + u[0] * a + n[0] * b, o[1] + y, o[2] + u[2] * a + n[2] * b];
    const v = [P(-hu, -hy, -hn), P(hu, -hy, -hn), P(hu, -hy, hn), P(-hu, -hy, hn), P(-hu, hy, -hn), P(hu, hy, -hn), P(hu, hy, hn), P(-hu, hy, hn)];
    const top = col.clone().multiplyScalar(1.1);
    const side = col.clone().multiplyScalar(0.85);
    const under = col.clone().multiplyScalar(0.55);
    this.quad(v[4], v[7], v[6], v[5], top);
    this.quad(v[0], v[1], v[2], v[3], under);
    this.quad(v[3], v[2], v[6], v[7], col);
    this.quad(v[0], v[4], v[5], v[1], side);
    this.quad(v[1], v[5], v[6], v[2], side);
    this.quad(v[0], v[3], v[7], v[4], side);
  }
  mesh(mat) {
    if (!this.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
}

export class Facades {
  constructor(game, course) {
    this.g = game;
    this.course = course;
    this.done = new Map(); // building → batch
    this.batches = [];
    this.group = new THREE.Group();
    game.scene.add(this.group);
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 });
    this.t = 0;
  }

  /** Every so often: detail the buildings near the course near you; clear batches left behind. */
  update() {
    this.t++;
    if (this.t % 20) return;
    const p = this.g.pos;
    const pts = this.course.points.filter((q) => Math.abs(q[0] - p.x) < BUILD + 40 && Math.abs(q[1] - p.z) < BUILD + 40);
    const fresh = [];
    for (const t of this.g.tiles?.values() ?? []) {
      if (!t.foot) continue;
      for (const b of t.foot) {
        if (this.done.has(b) || b.base == null) continue;
        const cx = (b.minx + b.maxx) / 2;
        const cz = (b.minz + b.maxz) / 2;
        if (Math.abs(cx - p.x) > BUILD || Math.abs(cz - p.z) > BUILD) continue;
        // Beside the course: any of its points within reach of the footprint's box.
        if (!pts.some((q) => q[0] > b.minx - NEAR_COURSE && q[0] < b.maxx + NEAR_COURSE && q[1] > b.minz - NEAR_COURSE && q[1] < b.maxz + NEAR_COURSE)) continue;
        fresh.push(b);
        if (fresh.length >= 24) break;
      }
      if (fresh.length >= 24) break;
    }
    if (fresh.length) {
      const tris = new Tris();
      for (const b of fresh) this._detail(b, tris, pts);
      const mesh = tris.mesh(this.mat);
      const batch = { mesh, list: fresh, x: fresh[0].minx, z: fresh[0].minz };
      for (const b of fresh) this.done.set(b, batch);
      if (mesh) this.group.add(mesh);
      this.batches.push(batch);
    }
    for (const batch of [...this.batches]) {
      if (Math.hypot(batch.x - p.x, batch.z - p.z) < DROP) continue;
      if (batch.mesh) {
        this.group.remove(batch.mesh);
        batch.mesh.geometry.dispose();
      }
      for (const b of batch.list) this.done.delete(b);
      this.batches.splice(this.batches.indexOf(batch), 1);
    }
  }

  /** One building's details, on the walls that face the course. */
  _detail(b, T, pts) {
    const n = b.xs.length;
    const kind = b.kind ?? 6; // 0 house · 1 apartment · 2 shop · 3 office · 4 public · 5 industry · 6 other
    const h = b.h;
    const seed = b.seed ?? 0.5;
    const curtain = kind !== 1 && kind !== 0 && ((kind === 3 && h > 22 && (seed * 5.3) % 1 < 0.5) || h > 90);
    const flats = kind === 1;
    const office = !curtain && !flats && kind !== 0 && h >= 15;
    const floorH = flats ? 2.8 : curtain ? 3.8 : office ? 3.6 : 3.3;
    const bay = curtain ? 1.6 : flats ? 3.6 : office ? 1.55 : 3.2;
    const frame = FRAME[Math.floor(seed * 97) % FRAME.length];
    let along = b.start ?? seed * 3.2;
    const flip = b.flip ?? 1;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x0 = b.xs[i];
      const z0 = b.zs[i];
      const x1 = b.xs[j];
      const z1 = b.zs[j];
      const len = Math.hypot(x1 - x0, z1 - z0) || 1;
      const u0 = along * flip + 1000;
      along += len;
      if (len < 3) continue;
      const ux = (x1 - x0) / len;
      const uz = (z1 - z0) / len;
      // Outward (as the city builds it), and is a course point out there in front of this wall?
      const nx = -uz * (flip > 0 ? 1 : -1) * -1;
      const nz = ux * (flip > 0 ? 1 : -1) * -1;
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      const out = this._outward(b, mx, mz, nx, nz);
      if (!out) continue;
      const [ox, oz] = out;
      if (!pts.some((q) => (q[0] - mx) * ox + (q[1] - mz) * oz > 1 && Math.hypot(q[0] - mx, q[1] - mz) < NEAR_COURSE + len / 2)) continue;
      const u = [ux, 0, uz];
      const nrm = [ox, 0, oz];
      // Heights as the city's shader has them: its 0 is the wall's foot, h its top.
      const Y = (v) => b.base + (v * (b.top - b.base)) / h;
      const ground = Y(0.01);
      const at = (s, y, outBy) => [x0 + ux * s + ox * outBy, y, z0 + uz * s + oz * outBy];
      const floors = Math.min(Math.floor((h - 1.8) / floorH), office || curtain ? 6 : 8);
      // The shader's window grid on this wall: u from u0, a window in each bay.
      const dir = flip;
      const sOf = (uu) => (uu - u0) * dir;
      const shopFloor = kind === 2 || kind === 6 || kind === 3 || (kind === 0 && seed > 0.55);
      if (!curtain) {
        for (let f = shopFloor ? 1 : 0; f < floors; f++) {
          const y = f * floorH;
          const first = Math.ceil(Math.min(u0, u0 + len * dir) / bay);
          const last = Math.floor(Math.max(u0, u0 + len * dir) / bay);
          for (let c = first; c < last; c++) {
            const s = sOf((c + 0.5) * bay);
            if (s < 0.6 || s > len - 0.6) continue;
            const ww = bay * (office ? 0.6 : flats ? 0.84 : 0.6);
            const wy0 = Y(y + floorH * (flats ? 0.38 : 0.3));
            const wy1 = Y(y + floorH * (flats ? 0.86 : office ? 0.84 : 0.78));
            const cy = (wy0 + wy1) / 2;
            const hy = (wy1 - wy0) / 2;
            const o = at(s, cy, 0.04);
            // Frame round the window, a sill under it.
            T.box([o[0] - ux * ww / 2, cy, o[2] - uz * ww / 2], u, nrm, 0.04, hy, 0.05, frame);
            T.box([o[0] + ux * ww / 2, cy, o[2] + uz * ww / 2], u, nrm, 0.04, hy, 0.05, frame);
            T.box([o[0], wy1, o[2]], u, nrm, ww / 2 + 0.04, 0.04, 0.05, frame);
            T.box([o[0] + ox * 0.04, wy0 - 0.03, o[2] + oz * 0.04], u, nrm, ww / 2 + 0.08, 0.035, 0.09, frame.clone().multiplyScalar(0.92));
            // Flats and villas: a balcony slab and rail under the window band.
            if ((flats || (kind === 0 && seed < 0.6)) && f >= 1) {
              const by = Y(y + floorH * 0.3);
              const bo = at(s, by, 0.45);
              T.box(bo, u, nrm, bay / 2 - 0.05, 0.06, 0.45, C('#d9d6cf'));
              T.box([bo[0] + ox * 0.43, by + 0.5, bo[2] + oz * 0.43], u, nrm, bay / 2 - 0.05, 0.03, 0.02, C('#e8e6e0'));
              for (let q = -2; q <= 2; q++) T.box([bo[0] + ox * 0.43 + ux * q * (bay / 5), by + 0.25, bo[2] + oz * 0.43 + uz * q * (bay / 5)], u, nrm, 0.015, 0.25, 0.015, C('#c9c6bf'));
            }
          }
        }
      } else {
        // A curtain wall: mullions standing out a little at every bay, a band at every floor (the first six).
        for (let f = 0; f <= Math.min(floors, 6); f++) T.box(at(len / 2, Y(f * floorH), 0.06), u, nrm, len / 2, 0.05, 0.06, C('#9aa3ad'));
      }
      // Shopfronts: a frame and a striped awning every 7 m along the ground floor.
      if (shopFloor && len > 5) {
        for (let s = 1; s < len - 1; s += 7) {
          const wseg = Math.min(6.4, len - s - 0.6);
          if (wseg < 2) break;
          const mid = s + wseg / 2;
          const pick = AWN[Math.floor((seed * 31 + s) * 7) % AWN.length];
          const top = Y(3.25);
          const o = at(mid, top, 0.05);
          T.box(o, u, nrm, wseg / 2, 0.08, 0.08, C('#3a3c40'));
          // The awning: stripes sloping down and out.
          const stripes = Math.max(4, Math.round(wseg / 0.5));
          for (let q = 0; q < stripes; q++) {
            const s0 = mid - wseg / 2 + (q * wseg) / stripes;
            const s1 = s0 + wseg / stripes;
            const inY = Y(3.15);
            const outY = Y(2.7);
            T.quad(at(s0, inY, 0.08), at(s1, inY, 0.08), at(s1, outY, 1.1), at(s0, outY, 1.1), pick[q % 2]);
            T.quad(at(s0, outY, 1.1), at(s1, outY, 1.1), at(s1, inY, 0.08), at(s0, inY, 0.08), pick[q % 2].clone().multiplyScalar(0.6));
          }
          // A valance along the front.
          T.quad(at(mid - wseg / 2, Y(2.7), 1.1), at(mid + wseg / 2, Y(2.7), 1.1), at(mid + wseg / 2, Y(2.5), 1.12), at(mid - wseg / 2, Y(2.5), 1.12), pick[0]);
        }
      }
      // A downpipe at the corner.
      if (h < 30) T.box(at(0.2, (ground + b.top) / 2, 0.08), u, nrm, 0.04, (b.top - ground) / 2, 0.04, C('#b9b6ae'));
    }
    // On the roof: a water tank, units, a stair hut, a rail round the edge (low buildings).
    if (h < 40) {
      const cx = (b.minx + b.maxx) / 2;
      const cz = (b.minz + b.maxz) / 2;
      const top = b.top;
      const r = (k) => ((seed * 9973 * (k + 1)) % 1 + 1) % 1;
      const u = [1, 0, 0];
      const nrm = [0, 0, 1];
      const sx = (b.maxx - b.minx) * 0.25;
      const sz = (b.maxz - b.minz) * 0.25;
      if (this._inside(b, cx + sx * (r(1) - 0.5), cz + sz * (r(2) - 0.5))) {
        // The tank: a blue or white drum on legs.
        const tx = cx + sx * (r(1) - 0.5);
        const tz = cz + sz * (r(2) - 0.5);
        T.box([tx, top + 0.5, tz], u, nrm, 0.5, 0.5, 0.5, C('#6a6d74'));
        T.box([tx, top + 1.5, tz], u, nrm, 0.75, 0.6, 0.75, r(3) < 0.5 ? C('#2f6fd1') : C('#e8e6e0'));
      }
      for (let k = 0; k < 2; k++) {
        const ax = cx + sx * (r(5 + k) - 0.5) * 1.6;
        const az = cz + sz * (r(7 + k) - 0.5) * 1.6;
        if (this._inside(b, ax, az)) T.box([ax, top + 0.35, az], u, nrm, 0.45, 0.35, 0.3, C('#e2e0da'));
      }
      if (r(9) < 0.6 && this._inside(b, cx, cz)) T.box([cx - sx * 0.3, top + 1.2, cz + sz * 0.3], u, nrm, 1.2, 1.2, 1.4, C('#c9c3b6'));
    }
  }

  /** Which way is out of the building from a wall's middle (the side with no building), or null. */
  _outward(b, mx, mz, nx, nz) {
    for (const s of [1, -1]) {
      const x = mx + nx * s * 0.6;
      const z = mz + nz * s * 0.6;
      if (!this._inside(b, x, z)) return [nx * s, nz * s];
    }
    return null;
  }

  _inside(b, x, z) {
    let inside = false;
    for (let i = 0, j = b.xs.length - 1; i < b.xs.length; j = i++) {
      if ((b.zs[i] > z) !== (b.zs[j] > z) && x < ((b.xs[j] - b.xs[i]) * (z - b.zs[i])) / (b.zs[j] - b.zs[i]) + b.xs[i]) inside = !inside;
    }
    return inside;
  }

  dispose() {
    for (const batch of this.batches) batch.mesh?.geometry.dispose();
    this.batches = [];
    this.done.clear();
    this.g.scene.remove(this.group);
    this.mat.dispose();
  }
}
