import * as THREE from 'three';

/**
 * What a race car leaves behind: black skid marks from the rear tyres and
 * white tyre smoke when it drifts or brakes hard, a spray of sparks on a hard
 * slide or when it hits a wall, and flames from the exhausts while the turbo
 * burns (a full gauge: five seconds of it).
 *
 *   const fx = new RaceFx(scene);
 *   fx.car(r, { length, width, hit })   // each car, each frame, after it is placed
 *   fx.update(dt)                       // once a frame
 *
 * All of it is three draws and a pair of flame meshes per car, recycled.
 */
const MARKS = 1600;
const SMOKE = 500;
const SPARKS = 600;

const v = new THREE.Vector3();
const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);
const one = new THREE.Vector3(1, 1, 1);

export class RaceFx {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.time = 0;

    // Skid marks: flat dark strips on the road, oldest overwritten first, fading as they age.
    const strip = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.marks = new THREE.InstancedMesh(strip, new THREE.MeshBasicMaterial({ color: '#0b0b0c', transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }), MARKS);
    this.marks.count = 0;
    this.marks.frustumCulled = false;
    this.marks.renderOrder = 2;
    this._mark = 0;
    this.group.add(this.marks);

    // Smoke: soft round puffs that grow, rise a little and fade.
    this.smoke = particles(SMOKE, {
      vertex: /* glsl */ `
        attribute vec4 aLife; // age, life, size, fade
        varying float vA;
        void main() {
          float t = clamp(aLife.x / aLife.y, 0.0, 1.0);
          vA = (1.0 - t) * aLife.w * step(aLife.x, aLife.y);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aLife.z * (1.0 + t * 2.4) * 300.0 / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragment: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.1, d) * vA * 0.42;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vec3(0.86, 0.86, 0.88), a);
        }`,
      blending: THREE.NormalBlending
    });
    // Sparks: hot points that fly, fall and die quickly — added light, so the bloom picks them up.
    this.sparks = particles(SPARKS, {
      vertex: /* glsl */ `
        attribute vec4 aLife;
        varying float vA;
        void main() {
          float t = clamp(aLife.x / aLife.y, 0.0, 1.0);
          vA = (1.0 - t) * step(aLife.x, aLife.y);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aLife.z * 120.0 / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragment: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5 || vA < 0.01) discard;
          gl_FragColor = vec4(mix(vec3(3.0, 1.2, 0.3), vec3(4.0, 3.2, 1.6), vA) * vA, 1.0);
        }`,
      blending: THREE.AdditiveBlending
    });
    this.group.add(this.smoke.points, this.sparks.points);

    // Flame: a cone pointing back, hot white-blue at the root to orange at the tip.
    this.flameGeo = new THREE.ConeGeometry(0.15, 1.3, 12, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.65);
    this.flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.42, 0.05), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.8, 1.9), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.cars = new Map();
  }

  /**
   * One car's effects this frame: its view group is already placed.
   * @param {{ s: { x, z, heading, v, drift }, y: number, car: { group: THREE.Object3D }, boosting: boolean }} r
   */
  car(r, dt, { length = 4.4, width = 1.9, hit = 0 } = {}) {
    const s = r.s;
    let state = this.cars.get(r);
    if (!state) {
      state = { last: null, flames: this._flames(r.car.group, length) };
      this.cars.set(r, state);
    }
    const fx = -Math.sin(s.heading);
    const fz = -Math.cos(s.heading);
    const rx = -fz;
    const rz = fx;
    const speed = Math.abs(s.v);
    const sliding = (s.drift ?? 0) > 0.22 && speed > 10;
    const braking = r.braking && speed > 14;
    // The rear tyres: a little in from the corners, at the back axle.
    const back = length * 0.33;
    const half = width * 0.4;
    const y = r.y + 0.04;
    const tyres = [-1, 1].map((k) => [s.x - fx * back + rx * half * k, s.z - fz * back + rz * half * k]);
    if ((sliding || braking) && state.last) {
      for (let k = 0; k < 2; k++) {
        const [ax, az] = state.last[k];
        const [bx, bz] = tyres[k];
        const len = Math.hypot(bx - ax, bz - az);
        if (len > 0.05 && len < 6) this._addMark(ax, az, bx, bz, y, sliding ? 0.24 : 0.2);
      }
      // Smoke, thicker the harder it slides.
      const puffs = sliding ? Math.min(4, 1 + (s.drift ?? 0) * 5) : 0.6;
      for (let k = 0; k < 2; k++) if (Math.random() < puffs * dt * 30) this._puff(tyres[k][0], y + 0.25, tyres[k][1], -fx * speed * 0.15, -fz * speed * 0.15);
    }
    state.last = tyres;
    // Sparks: a hard slide scrapes, a wall hit showers.
    const scrape = sliding && (s.drift ?? 0) > 0.45 && speed > 18;
    if (scrape) for (let k = 0; k < 3; k++) if (Math.random() < dt * 40) this._spark(tyres[k % 2][0], y + 0.15, tyres[k % 2][1], -fx * speed * 0.4 + rx * (Math.random() - 0.5) * 6, -fz * speed * 0.4 + rz * (Math.random() - 0.5) * 6);
    if (hit > 6) for (let k = 0; k < Math.min(40, hit * 2); k++) this._spark(s.x + fx * length * 0.5, y + 0.5, s.z + fz * length * 0.5, (Math.random() - 0.5) * 10 - fx * 3, (Math.random() - 0.5) * 10 - fz * 3);
    // The turbo's flames, flickering.
    const on = Boolean(r.boosting);
    for (const f of state.flames) {
      f.visible = on;
      if (on) {
        const flick = 0.75 + Math.random() * 0.5;
        f.scale.set(1, 1, flick * (1 + Math.min(1, speed / 50)));
        f.children[0].scale.set(1, 1, 0.8 + Math.random() * 0.3);
      }
    }
    if (on && Math.random() < dt * 25) {
      const tail = state.flames[Math.floor(Math.random() * 2)];
      tail.getWorldPosition(v);
      this.sparks.emit(v.x - fx * 1.2, v.y, v.z - fz * 1.2, -fx * 6 + (Math.random() - 0.5) * 2, 0.5, -fz * 6 + (Math.random() - 0.5) * 2, 0.2 + Math.random() * 0.15, 0.3, 1);
    }
  }

  _flames(group, length) {
    const out = [];
    for (const k of [-1, 1]) {
      const f = new THREE.Mesh(this.flameGeo, this.flameMat);
      const core = new THREE.Mesh(this.flameGeo, this.coreMat);
      core.scale.set(0.45, 0.45, 0.4);
      f.add(core);
      // Out of the back bumper, low, either side of the middle (the car's front is −Z).
      f.position.set(0.32 * k, 0.38, length * 0.5 - 0.05);
      f.visible = false;
      group.add(f);
      out.push(f);
    }
    return out;
  }

  _addMark(ax, az, bx, bz, y, w) {
    const len = Math.hypot(bx - ax, bz - az);
    q.setFromAxisAngle(up, Math.atan2(-(bx - ax), -(bz - az)));
    m4.compose(v.set((ax + bx) / 2, y, (az + bz) / 2), q, new THREE.Vector3(w, 1, len + 0.05));
    this.marks.setMatrixAt(this._mark, m4);
    this._mark = (this._mark + 1) % MARKS;
    this.marks.count = Math.min(MARKS, this.marks.count + 1);
    this.marks.instanceMatrix.needsUpdate = true;
  }

  _puff(x, y, z, vx, vz) {
    this.smoke.emit(x, y, z, vx + (Math.random() - 0.5) * 1.5, 0.6 + Math.random() * 0.8, vz + (Math.random() - 0.5) * 1.5, 1.1 + Math.random() * 0.7, 0.9 + Math.random() * 0.6, 0.6 + Math.random() * 0.4);
  }

  _spark(x, y, z, vx, vz) {
    this.sparks.emit(x, y, z, vx, 1.5 + Math.random() * 3, vz, 0.25 + Math.random() * 0.35, 0.5 + Math.random() * 0.6, 1);
  }

  update(dt) {
    this.time += dt;
    this.smoke.step(dt, -0.2, 0.92);
    this.sparks.step(dt, 9.8, 0.98);
  }

  /** A car gone from the race: its flames go with it. */
  forget(r) {
    const st = this.cars.get(r);
    for (const f of st?.flames ?? []) f.parent?.remove(f);
    this.cars.delete(r);
  }

  /** Clear the road: a new race. */
  clear() {
    for (const r of [...this.cars.keys()]) this.forget(r);
    this.marks.count = 0;
    this._mark = 0;
    this.smoke.clear();
    this.sparks.clear();
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
    this.marks.geometry.dispose();
    this.marks.material.dispose();
    for (const p of [this.smoke, this.sparks]) {
      p.points.geometry.dispose();
      p.points.material.dispose();
    }
    this.flameGeo.dispose();
    this.flameMat.dispose();
    this.coreMat.dispose();
  }
}

/** A pool of particles: position, velocity, and (age, life, size, fade), each emitted over the oldest. */
function particles(n, { vertex, fragment, blending }) {
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const life = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) life[i * 4] = life[i * 4 + 1] = 1; // all dead
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aLife', new THREE.BufferAttribute(life, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, blending }));
  points.frustumCulled = false;
  let next = 0;
  let alive = 0;
  return {
    points,
    emit(x, y, z, vx, vy, vz, lifeS, size, fade) {
      const i = next;
      next = (next + 1) % n;
      pos.set([x, y, z], i * 3);
      vel.set([vx, vy, vz], i * 3);
      life.set([0, lifeS, size, fade], i * 4);
      alive = n;
    },
    step(dt, gravity, drag) {
      if (!alive) return;
      const k = Math.pow(drag, dt * 60);
      let any = 0;
      for (let i = 0; i < n; i++) {
        if (life[i * 4] >= life[i * 4 + 1]) continue;
        any++;
        life[i * 4] += dt;
        vel[i * 3] *= k;
        vel[i * 3 + 1] = vel[i * 3 + 1] * k - gravity * dt;
        vel[i * 3 + 2] *= k;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      }
      alive = any;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aLife.needsUpdate = true;
    },
    clear() {
      for (let i = 0; i < n; i++) life[i * 4] = life[i * 4 + 1];
      geo.attributes.aLife.needsUpdate = true;
      alive = 0;
    }
  };
}
