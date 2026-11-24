/**
 * Speed lines round a boosting rider: thin tapered streaks in a ring about
 * the body, lying along the line of travel and rushing back past the rider.
 *
 * They live in the rider's own space (a child of the model's root, which
 * carries the heading and the pitch of the slope or the flight path), so they
 * stay exactly round the rider on the snow, up a kicker and through the air —
 * spins and flips turn the rider inside the ring, not the ring. One instanced
 * draw per rider, one material for everyone (so one pipeline, built behind the
 * loading card); off, every streak is scaled to nothing and nothing updates.
 */
import * as THREE from 'three/webgpu';
import { positionGeometry, smoothstep, float } from 'three/tsl';
import { KEEP_BUFFERS } from '../fx.js';

const N = 18;
/** Where the ring sits (rider space: up is +y, travel is −z) and how big it is (m). */
const CENTRE_Y = 0.72;
const R_MIN = 0.55;
const R_MAX = 1.15;
/** The stretch of air a streak runs along, front to back (m). */
const FRONT = -1.6;
const BACK = 2.6;

let GEO = null;
let MAT = null;

function geometry() {
  if (GEO) return GEO;
  // a five-sided tube along z, fat at the front (−z), a point at the tail (+z)
  GEO = new THREE.CylinderGeometry(0.08, 1, 1, 5, 1, true).rotateX(Math.PI / 2);
  return GEO;
}

function material() {
  if (MAT) return MAT;
  MAT = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  // bright at the head, fading off down the tail
  const z = positionGeometry.z;
  MAT.opacityNode = smoothstep(float(0.5), float(-0.15), z).mul(smoothstep(float(-0.5), float(-0.42), z)).mul(0.95);
  MAT.mrtNode = KEEP_BUFFERS();
  MAT.fog = false;
  return MAT;
}

const COLOURS = ['#3a8cff', '#6fbcff', '#ffffff', '#4aa3ff', '#9fd6ff'].map((c) => new THREE.Color(c));

export class SpeedLines {
  constructor() {
    this.mesh = new THREE.InstancedMesh(geometry(), material(), N);
    this.mesh.name = 'speed-lines';
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.renderOrder = 6;
    this.k = 0;
    this.lines = [];
    for (let i = 0; i < N; i++) {
      const l = { u: i / N + Math.random() / N, a: 0, r: 0, len: 1, w: 0.03 };
      this.place(l);
      this.lines.push(l);
      this.mesh.setColorAt(i, COLOURS[i % COLOURS.length]);
    }
    this.m4 = new THREE.Matrix4();
    this.p = new THREE.Vector3();
    this.q = new THREE.Quaternion();
    this.s = new THREE.Vector3();
    this.hide();
  }

  /** A fresh spot on the ring (never under the snow). */
  place(l) {
    for (let tries = 0; tries < 6; tries++) {
      l.a = Math.random() * Math.PI * 2;
      l.r = R_MIN + Math.random() * (R_MAX - R_MIN);
      if (CENTRE_Y + Math.sin(l.a) * l.r > 0.12) break;
    }
    l.len = 0.7 + Math.random() * 0.7;
    l.w = 0.018 + Math.random() * 0.018;
  }

  hide() {
    this.m4.makeScale(0, 0, 0);
    for (let i = 0; i < N; i++) this.mesh.setMatrixAt(i, this.m4);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Each frame: `on` while boosting; `speed` m/s sets how fast and how long the streaks are. */
  update(dt, on, speed = 20) {
    const goal = on ? 1 : 0;
    if (goal === 0 && this.k === 0) return;
    this.k += (goal - this.k) * Math.min(1, dt * (on ? 14 : 7));
    if (!on && this.k < 0.02) {
      this.k = 0;
      this.hide();
      return;
    }
    const v = Math.max(10, speed);
    const run = BACK - FRONT;
    const stretch = 0.8 + Math.min(1.4, v / 22);
    for (let i = 0; i < N; i++) {
      const l = this.lines[i];
      l.u += (dt * v * 0.85) / run;
      if (l.u >= 1) {
        l.u -= Math.floor(l.u);
        this.place(l);
      }
      // grow in at the front, thin away at the back
      const life = Math.sin(Math.PI * l.u);
      const len = l.len * stretch;
      this.p.set(Math.cos(l.a) * l.r, CENTRE_Y + Math.sin(l.a) * l.r, FRONT + l.u * run + len * 0.5);
      const w = l.w * this.k * life;
      this.s.set(w, w, len * (0.4 + 0.6 * this.k));
      this.m4.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m4);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
