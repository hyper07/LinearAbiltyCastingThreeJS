import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * Kickrani's podium ceremony: when a race is over, the first three riders home (only riders who
 * crossed the line in time) stand on a podium just past the finish line, in the city as it is —
 * the time of day and the weather carry on. 1st in the middle and highest, 2nd on its left, 3rd on
 * its right (as you look at it), a big number on each block; their scooters parked beside it on
 * their kickstands. Each dances its own species' signature (src/shared/motion/signatures.js), the
 * winner throwing its arms up in a V and jumping at every bar, 2nd and 3rd smaller (plushRider.js
 * celebrate: procedural, squash and stretch, ears and tails flopping). Confetti
 * falls, the camera swings slowly round and pushes in. Your own rider, if it is up there, has a gold
 * ring round its block, the block's top glowing with it.
 *
 *   const p = new Podium(scene, { x, y, z, heading, sweep });   // heading: the way the course runs
 *   p.stand([{ view, me }, …]);                                    // in finishing order
 *   p.update(dt, { night }); p.aim(camera, { low });               // each frame
 *   p.dispose();
 *
 * `podiumSlots` (where each block stands, pure) is tested in tests/unit/jarani-podium.test.mjs.
 */

/** Blocks by place: height (m), and which side of the middle as you look at it (+1 your left). */
export const BLOCKS = [
  { place: 1, h: 0.95, side: 0, top: '#ffd23a', kind: 'win' },
  { place: 2, h: 0.66, side: 1, top: '#d9e2ec', kind: 'dance' },
  { place: 3, h: 0.46, side: -1, top: '#e39a5b', kind: 'clap' }
];
export const BLOCK_W = 1.3;
export const BLOCK_D = 1.15;
/** Podium Party's measured tempo (public/audio/bgm/manifest.json), when the race doesn't say. */
export const PODIUM_BPM = 143.6;
/** How long the podium shows on its own before the results come up over it (s). */
export const PODIUM_SECONDS = 6.5;

/**
 * Where each place stands: the podium at (x, z) facing `heading` (0 is north, −z; the riders face
 * that way, towards the camera). Returns [{ place, x, z, h, side }] for the first `n` places.
 * "Your left" as you look at it from in front is the riders' right: (cos h, −sin h).
 */
export function podiumSlots(x, z, heading, n = 3) {
  const lx = Math.cos(heading);
  const lz = -Math.sin(heading);
  return BLOCKS.slice(0, Math.max(0, Math.min(3, n))).map((b) => ({ place: b.place, h: b.h, side: b.side, kind: b.kind, x: x + lx * b.side * BLOCK_W, z: z + lz * b.side * BLOCK_W }));
}

function numberTexture(n, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.font = '900 190px system-ui, -apple-system, "Segoe UI", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 22;
  g.strokeStyle = '#2a2030';
  g.strokeText(String(n), 128, 140);
  g.fillStyle = color;
  g.fillText(String(n), 128, 140);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const CONFETTI = 420;
const CONFETTI_COLOURS = ['#ff4f6d', '#ffd23a', '#3fd0a8', '#4aa8ff', '#b46bff', '#ff8a2a', '#ffffff'];

export class Podium {
  /**
   * @param {THREE.Scene} scene
   * @param {{ x: number, y: number, z: number, heading: number, sweep?: (x0: number, z0: number, x1: number, z1: number) => number }} o
   *   sweep → how far (0–1) a camera can go from the podium toward (x1, z1) before a wall
   */
  constructor(scene, { x, y, z, heading, sweep = null }) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.z = z;
    this.heading = heading;
    this.sweep = sweep;
    this.t = 0;
    this.group = new THREE.Group();
    this.group.name = 'podium';
    this.group.position.set(x, y, z);
    this.group.rotation.y = heading;
    this.riders = [];
    this._disposables = [];
    this._build();
    scene.add(this.group);
  }

  _keep(...things) {
    this._disposables.push(...things);
    return things[0];
  }

  _build() {
    // the blocks, in the podium's own frame: riders face −z (the camera's side); "your left" is +x
    const white = this._keep(new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.55 }));
    const base = this._keep(new THREE.MeshStandardMaterial({ color: '#2c3550', roughness: 0.7 }));
    const carpet = this._keep(new THREE.MeshStandardMaterial({ color: '#c8243b', roughness: 0.9 }));
    const plinth = new THREE.Mesh(this._keep(new RoundedBoxGeometry(BLOCK_W * 3 + 0.5, 0.12, BLOCK_D + 0.5, 2, 0.04)), base);
    plinth.position.y = 0.06;
    plinth.receiveShadow = true;
    this.group.add(plinth);
    const rug = new THREE.Mesh(this._keep(new THREE.PlaneGeometry(1.7, 2.4).rotateX(-Math.PI / 2)), carpet);
    rug.position.set(0, 0.03, -BLOCK_D / 2 - 1.2);
    rug.receiveShadow = true;
    this.group.add(rug);
    this.blocks = BLOCKS.map((b) => {
      const g = new THREE.Group();
      g.position.set(b.side * BLOCK_W, 0.12, 0);
      const body = new THREE.Mesh(this._keep(new RoundedBoxGeometry(BLOCK_W - 0.06, b.h - 0.12, BLOCK_D, 3, 0.05)), white);
      body.position.y = (b.h - 0.12) / 2;
      body.castShadow = body.receiveShadow = true;
      g.add(body);
      // a coloured top with a glowing edge (lit at night without a lamp)
      const topM = this._keep(new THREE.MeshStandardMaterial({ color: b.top, roughness: 0.35, metalness: b.place === 1 ? 0.35 : 0.15, emissive: b.top, emissiveIntensity: 0.18 }));
      const top = new THREE.Mesh(this._keep(new RoundedBoxGeometry(BLOCK_W - 0.02, 0.08, BLOCK_D + 0.04, 2, 0.03)), topM);
      top.position.y = b.h - 0.12 + 0.02;
      top.receiveShadow = true;
      g.add(top);
      g.userData.topM = topM;
      // the place number on the front (facing the camera, −z)
      const tex = this._keep(numberTexture(b.place, b.top));
      const numM = this._keep(new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.2, roughness: 0.5, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.25 }));
      const size = Math.min(0.62, (b.h - 0.12) * 0.95);
      const num = new THREE.Mesh(this._keep(new THREE.PlaneGeometry(size, size)), numM);
      num.position.set(0, (b.h - 0.12) / 2 + 0.02, -BLOCK_D / 2 - 0.006);
      num.rotation.y = Math.PI;
      g.add(num);
      this.group.add(g);
      return g;
    });
    // the highlight for your own rider: a gold ring on its block (and its top glowing)
    this.ringM = this._keep(new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: 0.9, depthWrite: false }));
    this.ring = new THREE.Mesh(this._keep(new THREE.TorusGeometry(0.5, 0.035, 8, 48).rotateX(Math.PI / 2)), this.ringM);
    this.ring.visible = false;
    this.group.add(this.ring);
    // confetti: one instanced draw, flat paper bits that flutter down
    const paper = this._keep(new THREE.PlaneGeometry(0.07, 0.045));
    this.confM = this._keep(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: false }));
    this.confetti = new THREE.InstancedMesh(paper, this.confM, CONFETTI);
    this.confetti.frustumCulled = false;
    this.bits = [];
    const col = new THREE.Color();
    for (let i = 0; i < CONFETTI; i++) {
      this.bits.push(this._newBit({}, true));
      this.confetti.setColorAt(i, col.set(CONFETTI_COLOURS[i % CONFETTI_COLOURS.length]));
    }
    this.confetti.instanceColor.needsUpdate = true;
    this.group.add(this.confetti);
    // (the ceremony is the characters' stage, not the street: out of a fog bank like the riders)
    this.group.traverse((o) => {
      if (o.material && o.material.fog !== false) o.material.fog = false;
    });
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
  }

  /** A paper bit: launched up from either end of the podium in a burst (or waiting for one). */
  _newBit(b, wait = false) {
    const side = Math.random() < 0.5 ? -1 : 1;
    b.x = side * (BLOCK_W * 1.5 + 0.3) + (Math.random() - 0.5) * 0.4;
    b.y = 0.3;
    b.z = (Math.random() - 0.5) * 0.6;
    b.vx = -side * (0.6 + Math.random() * 1.6);
    b.vy = 5.5 + Math.random() * 3.5;
    b.vz = (Math.random() - 0.5) * 2.4 - 0.4;
    b.rx = Math.random() * 6;
    b.ry = Math.random() * 6;
    b.spin = 4 + Math.random() * 8;
    b.phase = Math.random() * 6;
    b.wait = wait ? Math.random() * 0.25 + (Math.random() < 0.5 ? 0 : 1.6) : 0.6 + Math.random() * 2.6;
    b.life = 0;
    return b;
  }

  /**
   * Put the riders up: `list` in finishing order, [{ view (a PlushRider), me }] (at most three).
   * Each stands on its block facing the camera, its scooter parked beside the podium.
   */
  stand(list) {
    this.riders = list.slice(0, 3).map((r, i) => {
      const b = BLOCKS[i];
      const v = r.view;
      // scooters: 2nd's beside the left end, 3rd's beside the right, the winner's out past 2nd's
      // (in the rider's own frame: it stands b.h + 0.06 up, on its block's top)
      const y = -(b.h + 0.06);
      const park = i === 0 ? [3.7, y, -0.9, 0.85] : i === 1 ? [1.3, y, 0.25, 0.45] : [-1.3, y, 0.25, -0.45];
      v.standOff(park);
      v.fade(1);
      v.root.visible = true;
      v.root.position.set(0, 0, 0);
      this.scene.remove(v.root);
      this.blocks[i].add(v.root);
      v.root.position.set(0, b.h - 0.12 + 0.06, 0);
      v.furLod?.(4);
      return { view: v, me: Boolean(r.me), kind: b.kind, i };
    });
    const mine = this.riders.find((r) => r.me);
    if (mine) {
      const blk = this.blocks[mine.i];
      const h = BLOCKS[mine.i].h;
      this.ring.visible = true;
      this.mineTop = blk.userData.topM;
      this.ring.position.set(blk.position.x, 0.12 + h - 0.12 + 0.07, 0);
    }
    return this.riders;
  }

  update(dt, { night = 0, beats = null } = {}) {
    this.t += dt;
    // a pulse in the ring round your block
    if (this.ring.visible) {
      this.ringM.opacity = 0.65 + 0.3 * Math.sin(this.t * 4);
      this.ring.scale.setScalar(1 + 0.05 * Math.sin(this.t * 4));
    }
    for (const b of this.blocks) b.userData.topM.emissiveIntensity = 0.12 + night * 0.5;
    // (your block's top glows with the ring's pulse: a light on you without a beam over your face)
    if (this.mineTop) this.mineTop.emissiveIntensity += 0.35 + 0.3 * Math.sin(this.t * 4);
    // the dancers: on the music's beat together, each its own species' signature dance with its
    // place's flourish on top (signatures.js), each a hair off the beat. The species, the place and
    // the song's position decide every move — counted from the song's first beat (the podium track
    // starts with the ceremony, from the top) — so a room's browsers dance alike
    this.beats = beats ?? (this.beats ?? 0) + dt * (PODIUM_BPM / 60);
    for (const r of this.riders) r.view.celebrate(dt, { kind: r.kind, place: r.i + 1, start: 0, bpm: PODIUM_BPM, heading: 0, night, beats: this.beats + [0, 0.035, -0.03][r.i] });
    // confetti: a burst from each end at the start, again every few seconds; it flutters as it falls
    const { _m: m, _q: q, _e: e, _p: p, _s: s } = this;
    for (let i = 0; i < this.bits.length; i++) {
      const b = this.bits[i];
      if (b.wait > 0) {
        b.wait -= dt;
        p.set(0, -50, 0);
        m.compose(p, q.identity(), s);
        this.confetti.setMatrixAt(i, m);
        continue;
      }
      b.life += dt;
      // up fast, then air drag takes over: down slowly, swaying
      b.vy -= 9.8 * dt;
      const drag = b.vy < 0 ? 3.2 : 0.6;
      b.vx -= b.vx * drag * 0.5 * dt;
      b.vz -= b.vz * drag * 0.5 * dt;
      if (b.vy < -1.1) b.vy = -1.1;
      b.x += (b.vx + Math.sin(b.life * 3 + b.phase) * (b.vy < 0 ? 0.6 : 0)) * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.rx += b.spin * dt;
      b.ry += b.spin * 0.7 * dt;
      if (b.y < 0.05 || b.life > 9) this._newBit(b);
      p.set(b.x, b.y, b.z);
      q.setFromEuler(e.set(b.rx, b.ry, b.phase));
      m.compose(p, q, s);
      this.confetti.setMatrixAt(i, m);
    }
    this.confetti.instanceMatrix.needsUpdate = true;
  }

  /**
   * The camera: in front of the podium, swinging slowly round it and pushing in. `low`: the results
   * are up, so the podium sits higher in the picture, above them.
   */
  aim(camera, { low = false } = {}) {
    const t = this.t;
    const ease = 1 - Math.exp(-t / 2.2);
    this._lowK = (this._lowK ?? 0) + ((low ? 1 : 0) - (this._lowK ?? 0)) * 0.04;
    const dist = 9.5 - 3.2 * ease + this._lowK * 1.6;
    const swing = -0.42 + 0.5 * ease + Math.sin(t * 0.22) * 0.12;
    const a = this.heading + swing;
    // in front: the way the riders face (−sin a, −cos a)
    let fx = -Math.sin(a);
    let fz = -Math.cos(a);
    let d = dist;
    if (this.sweep) d = Math.max(3.5, dist * this.sweep(this.x, this.z, this.x + fx * dist, this.z + fz * dist) - 0.4);
    const ly = 1.05 - this._lowK * 1.15;
    camera.position.set(this.x + fx * d, this.y + 1.9 + this._lowK * 0.6 + (dist - d) * 0.25, this.z + fz * d);
    camera.lookAt(this.x, this.y + ly, this.z);
    camera.fov += (48 - camera.fov) * 0.1;
    camera.updateProjectionMatrix();
  }

  dispose() {
    // the riders go back to the race's scene graph (the race disposes them)
    for (const r of this.riders) {
      r.view.root.removeFromParent();
      r.view.standOff(null);
    }
    this.riders = [];
    this.group.removeFromParent();
    for (const d of this._disposables) d.dispose?.();
    this.confetti.dispose();
  }
}
