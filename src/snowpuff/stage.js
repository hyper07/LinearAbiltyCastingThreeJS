/**
 * The menu stage: a soft-lit studio of snow, in the same WebGPU pipeline as
 * the race. Three sets on one floor, the camera gliding between them:
 *
 *   turntable  the four riders on a round snow stage that turns the chosen
 *              one to face you (title and rider select)
 *   dioramas   the three mountains as little models on pedestals, each with
 *              its own sky card — sunny, sunset, night with aurora
 *   podium     the top three on blocks, everyone else in front, confetti
 *
 * Light: a warm key with soft shadows, a cool fill, a strong rim from
 * behind so the pastel plush separates from the pastel set (render-quality §6).
 */
import * as THREE from 'three/webgpu';
import { vec3, float, mix, smoothstep, positionLocal, normalize, uniform, time, sin, mx_noise_float, pow, max, abs, color, positionWorld } from 'three/tsl';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RiderModel } from './render/riderModel.js';
import { peakGeometry } from './render/scenery.js';
import { SELECTABLE } from './riders.js';
import { MOUNTAINS } from './mountains.js';
import { loadKit, instance } from './render/models.js';
import { rng } from './course.js';

const TURN = new THREE.Vector3(0, 0, 0);
const DIO = new THREE.Vector3(40, 0, 0);
const POD = new THREE.Vector3(-40, 0, 0);

export class Stage {
  constructor(renderer, { fur = 0 } = {}) {
    this.renderer = renderer;
    this.fur = Math.min(16, fur);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 400);
    this.camPos = new THREE.Vector3(0, 1.6, 6.4);
    this.camLook = new THREE.Vector3(0, 0.8, 0);
    this.goalPos = this.camPos.clone();
    this.goalLook = this.camLook.clone();
    this.t = 0;
    this.picked = 'fox';
    this.mountain = MOUNTAINS[0].id;
    this.podiumRiders = [];
  }

  async build() {
    const s = this.scene;
    // backdrop: a big soft gradient dome and a snow floor
    const dome = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide }));
    const d = normalize(positionLocal);
    dome.material.colorNode = mix(color('#fdf3fa'), mix(color('#cfe4ff'), color('#8fbaf5'), smoothstep(0.25, 0.8, d.y)), smoothstep(-0.05, 0.3, d.y));
    s.add(dome);
    const floorM = new THREE.MeshStandardNodeMaterial({ roughness: 0.85 });
    const fp = positionWorld;
    floorM.colorNode = color('#f6f8fd').mul(mx_noise_float(fp.mul(0.6)).mul(0.025).add(1));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(170, 64).rotateX(-Math.PI / 2), floorM);
    floor.receiveShadow = true;
    s.add(floor);
    // light
    const pm = new THREE.PMREMGenerator(this.renderer);
    const env = new RoomEnvironment();
    s.environment = pm.fromScene(env, 0.04).texture;
    s.environmentIntensity = 0.55;
    env.dispose?.();
    pm.dispose();
    s.add(new THREE.HemisphereLight('#dcecff', '#fff1f6', 0.6));
    this.key = new THREE.DirectionalLight('#fff3e6', 2.6);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.radius = 6;
    this.key.shadow.bias = -0.0005;
    this.key.shadow.normalBias = 0.02;
    const sc = this.key.shadow.camera;
    sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 60;
    s.add(this.key, this.key.target);
    this.rim = new THREE.DirectionalLight('#cfe6ff', 2.2);
    s.add(this.rim, this.rim.target);
    // gentle snowfall
    const flakes = new THREE.BufferGeometry();
    const N = 700, pos = new Float32Array(N * 3), r = rng(5);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (r() - 0.5) * 30;
      pos[i * 3 + 1] = r() * 12;
      pos[i * 3 + 2] = (r() - 0.5) * 24 - 4;
    }
    flakes.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.flakePos = pos;
    const fm = new THREE.PointsNodeMaterial({ color: '#ffffff', size: 0.06, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false });
    this.flakes = new THREE.Points(flakes, fm);
    this.flakes.frustumCulled = false;
    s.add(this.flakes);

    this.buildTurntable();
    await this.buildDioramas();
    this.buildPodium();
    this.focus('title', true);
  }

  /* ---------------------------------------------------------------- turntable */

  buildTurntable() {
    const g = new THREE.Group();
    g.position.copy(TURN);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.5, 0.35, 64), new THREE.MeshStandardNodeMaterial({ color: '#ffffff', roughness: 0.7 }));
    deck.position.y = 0.175;
    deck.receiveShadow = true;
    deck.castShadow = true;
    const band = new THREE.Mesh(new THREE.TorusGeometry(2.46, 0.07, 10, 80), new THREE.MeshPhysicalNodeMaterial({ color: '#ff6fb4', roughness: 0.3, clearcoat: 1 }));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.25;
    g.add(deck, band);
    this.spin = new THREE.Group();
    this.spin.position.y = 0.35;
    g.add(this.spin);
    this.turnRiders = new Map();
    SELECTABLE.forEach((id, i) => {
      const m = new RiderModel(id, { fur: this.fur });
      const a = (i / SELECTABLE.length) * Math.PI * 2;
      m.root.position.set(Math.sin(a) * 1.35, 0, Math.cos(a) * 1.35);
      m.root.rotation.y = a;
      m.body.rotation.y = 0;
      m.board.rotation.y = 0;
      m.board.position.z = 0.02;
      this.spin.add(m.root);
      this.turnRiders.set(id, { m, a });
    });
    this.spinAngle = 0;
    this.scene.add(g);
    this.turntable = g;
  }

  pick(id) {
    this.picked = id;
  }

  /** Your board under every rider on the turntable (`swap`: the chosen one hops and the new board slides in). */
  setBoard(id, swap = false) {
    this.boardId = id;
    for (const [rid, e] of this.turnRiders) {
      e.m.setBoard(id);
      if (swap && rid === this.picked) {
        e.m.react('hop', 0.7);
        e.slide = 1;
      }
    }
  }

  /** Your goggles on every rider on the turntable (`tryOn`: the chosen one tries them on with a little bounce). */
  setGoggles(id, tryOn = false) {
    this.goggles = id;
    for (const [rid, e] of this.turnRiders) {
      e.m.setGoggles(id);
      if (tryOn && rid === this.picked) e.m.tryOn();
    }
  }

  /* ---------------------------------------------------------------- dioramas */

  async buildDioramas() {
    const spruce = await loadKit('spruce');
    const pylon = await loadKit('pylon');
    this.dioramas = new Map();
    MOUNTAINS.forEach((m, i) => {
      const g = new THREE.Group();
      g.position.set(DIO.x + (i - 1) * 4.4, 0, DIO.z);
      const r = rng(m.seed);
      // everything on the pedestal turns as one piece (the pedestal too); only the sky card behind stays put
      const turn = new THREE.Group();
      g.add(turn);
      // pedestal
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.75, 0.7, 48), new THREE.MeshStandardNodeMaterial({ color: '#ffffff', roughness: 0.6 }));
      ped.position.y = 0.35;
      ped.castShadow = ped.receiveShadow = true;
      turn.add(ped);
      // the mountain: a soft noisy cone, snow above, rock streaks
      let geo;
      const mm = new THREE.MeshStandardNodeMaterial({ roughness: 0.8 });
      if (m.peak) {
        // a famous mountain: its own silhouette in miniature, snow above its snow line
        const ph = Math.min(3.2, 1.45 * (m.peak.height / m.peak.radius) * 1.6 + 1.2);
        geo = peakGeometry(m.peak.shape, { radius: 1.5, height: ph, rings: 30, spokes: 72 }).translate(0, 0.7, 0);
        const hk = positionLocal.y.sub(0.7).div(ph);
        mm.colorNode = mix(color(m.peak.rock ?? '#666070'), color('#f8fbff'), smoothstep(float(m.peak.snowLine ?? 0.4).sub(0.05), float(m.peak.snowLine ?? 0.4).add(0.05), hk.add(mx_noise_float(positionLocal.mul(5)).mul(0.08))));
      } else {
        geo = new THREE.ConeGeometry(1.45, 2.2 + m.difficulty * 0.35, 48, 24);
        const p = geo.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const x = p.getX(k), y = p.getY(k), z = p.getZ(k);
          const a = Math.atan2(z, x);
          const n = 1 + Math.sin(a * 3 + m.seed) * 0.08 + Math.sin(a * 7 + y * 3) * 0.05;
          p.setXYZ(k, x * n, y, z * n);
        }
        geo.computeVertexNormals();
        geo.translate(0, 0.7 + (2.2 + m.difficulty * 0.35) / 2, 0);
        const rock = m.time === 'night' ? color('#3a4470') : m.time === 'sunset' ? color('#8a6a70') : color('#7a8aa8');
        const streak = mx_noise_float(positionLocal.mul(vec3(6, 1.2, 6)));
        mm.colorNode = mix(color('#f8fbff'), rock, smoothstep(0.35, 0.6, streak).mul(smoothstep(2.6, 1.2, positionLocal.y)).mul(0.6));
      }
      const mtn = new THREE.Mesh(geo, mm);
      mtn.castShadow = mtn.receiveShadow = true;
      turn.add(mtn);
      // a winding run down its face
      const pts = [];
      const H = 2.2 + m.difficulty * 0.35;
      for (let k = 0; k <= 30; k++) {
        const u = k / 30;
        const y = 0.72 + H * (1 - u) * 0.92;
        const rad = 1.45 * u * 0.95 + 0.06;
        const a = Math.PI / 2 + Math.sin(u * 6 + m.seed) * 0.6;
        pts.push(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad));
      }
      const run = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.05, 6), new THREE.MeshStandardNodeMaterial({ color: m.fence.colour, roughness: 0.5 }));
      turn.add(run);
      // trees
      const trees = [];
      for (let k = 0; k < 22 + m.difficulty * 10; k++) {
        const u = 0.35 + r() * 0.6;
        const a = r() * Math.PI * 2;
        const y = 0.7 + H * (1 - u);
        const rad = 1.45 * u * 1.0;
        trees.push({ x: Math.cos(a) * rad, y, z: Math.sin(a) * rad, ry: r() * 6, s: 0.05 + r() * 0.03 });
      }
      turn.add(instance(spruce, trees));
      // a tiny lift up one side
      const towers = [0.25, 0.5, 0.75].map((u) => ({ x: -Math.sin(0.4) * 1.45 * u, y: 0.7 + H * (1 - u), z: Math.cos(0.4) * 1.45 * u, ry: 0.4, s: 0.045 }));
      turn.add(instance(pylon, towers));
      // night lanterns
      if (m.lanterns) {
        const lm = new THREE.MeshBasicNodeMaterial({ color: '#ffb54a' });
        lm.emissiveNode = color('#ffb54a').mul(2.5);
        pts.forEach((pt, k) => {
          if (k % 3) return;
          const l = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), lm);
          l.position.copy(pt).add(new THREE.Vector3(0.1, 0.06, 0));
          turn.add(l);
        });
      }
      // the sky card behind
      const card = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), skyCard(m));
      card.position.set(0, 2.5, -1.9);
      g.add(card);
      // a little flag on the top
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshStandardNodeMaterial({ color: m.fence.alt, side: THREE.DoubleSide }));
      flag.position.set(0.15, 0.72 + H + 0.25, 0);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45), new THREE.MeshStandardNodeMaterial({ color: '#ffffff' }));
      pole.position.set(0, 0.72 + H + 0.12, 0);
      turn.add(flag, pole);
      this.scene.add(g);
      this.dioramas.set(m.id, { g, mtn, turn, lift: 0 });
    });
  }

  /* ---------------------------------------------------------------- podium */

  buildPodium() {
    const g = new THREE.Group();
    g.position.copy(POD);
    const blockM = new THREE.MeshPhysicalNodeMaterial({ color: '#ffffff', roughness: 0.4, clearcoat: 0.6 });
    const cols = ['#ffd23f', '#cfd8ea', '#ffb27a'];
    const heights = [1.1, 0.75, 0.5];
    const xs = [0, -1.6, 1.6];
    this.spots = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(roundedBlock(1.5, heights[i], 1.4), blockM);
      b.position.set(xs[i], heights[i] / 2, 0);
      b.castShadow = b.receiveShadow = true;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.12, 1.42), new THREE.MeshPhysicalNodeMaterial({ color: cols[i], roughness: 0.3, clearcoat: 1 }));
      trim.position.set(xs[i], heights[i] - 0.06, 0);
      g.add(b, trim);
      const num = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicNodeMaterial({ map: numberTexture(i + 1, cols[i]), transparent: true }));
      num.position.set(xs[i], heights[i] * 0.5, 0.71);
      g.add(num);
      this.spots.push(new THREE.Vector3(xs[i], heights[i], 0));
    }
    // the rest stand in front
    for (const x of [-3.0, 3.0, -4.1]) this.spots.push(new THREE.Vector3(x, 0, 0.9));
    this.scene.add(g);
    this.podium = g;
    this.podiumSet = new THREE.Group();
    g.add(this.podiumSet);
  }

  /** A burst of paper confetti over the podium. */
  confetti() {
    if (!this.conf) {
      const N = 420;
      const g = new THREE.BufferGeometry();
      this.confPos = new Float32Array(N * 3);
      this.confVel = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      const pal = ['#ff6fb4', '#ffd23f', '#3fd0b0', '#3a86ff', '#ff8a3d', '#ffffff'].map((c) => new THREE.Color(c));
      for (let i = 0; i < N; i++) pal[i % pal.length].toArray(col, i * 3);
      g.setAttribute('position', new THREE.BufferAttribute(this.confPos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      this.conf = new THREE.Points(g, new THREE.PointsNodeMaterial({ size: 0.09, vertexColors: true, sizeAttenuation: true }));
      this.conf.frustumCulled = false;
      this.podium.add(this.conf);
    }
    const p = this.confPos, v = this.confVel;
    for (let i = 0; i < p.length; i += 3) {
      p[i] = (Math.random() - 0.5) * 1.5; p[i + 1] = 2.2 + Math.random(); p[i + 2] = (Math.random() - 0.5) * 1.2;
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 3.5;
      v[i] = Math.cos(a) * sp; v[i + 1] = 3 + Math.random() * 5; v[i + 2] = Math.sin(a) * sp * 0.6;
    }
    this.confT = 6;
  }

  /** Put the finishers on the podium (racers in order). */
  setPodium(order, meSlot) {
    for (const m of this.podiumRiders) m.dispose();
    this.podiumRiders = [];
    order.slice(0, 6).forEach((r, i) => {
      const m = new RiderModel(r.species, { fur: i < 3 ? this.fur : 0, goggles: r.goggles, board: r.board, label: r.name });
      m.body.rotation.y = 0;
      // the winner pushes their goggles up to celebrate (and silly ones do their trick)
      if (i === 0) {
        m.gogglesUp(1);
        m.winner = true;
      }
      m.board.rotation.y = 0;
      const p = this.spots[i];
      m.root.position.copy(p);
      m.root.rotation.y = i < 3 ? 0 : 0;
      if (i >= 3) m.root.scale.setScalar(0.85);
      m.cheer = i < 3;
      m.me = r.slot === meSlot;
      m.label = r.name;
      this.podiumSet.add(m.root);
      this.podiumRiders.push(m);
    });
  }

  /* ---------------------------------------------------------------- camera and motion */

  focus(view, snap = false) {
    this.view = view;
    if (view === 'title' || view === 'lobby') {
      this.goalPos.set(TURN.x - 2.2, 2.2, TURN.z + 8.2);
      this.goalLook.set(TURN.x - 1.9, 0.95, TURN.z);
    } else if (view === 'riders') {
      this.goalPos.set(TURN.x + 0.55, 1.55, TURN.z + 6.1);
      this.goalLook.set(TURN.x + 0.75, 0.9, TURN.z + 1.0);
    } else if (view === 'mountains') {
      this.goalPos.set(DIO.x, 4.4, DIO.z + 13.5);
      this.goalLook.set(DIO.x, 0.6, DIO.z);
    } else if (view === 'podium') {
      this.goalPos.set(POD.x + 1.5, 2.3, POD.z + 7.8);
      this.goalLook.set(POD.x + 1.7, 1.2, POD.z + 0.2);
    }
    // the key and rim follow the set
    const at = view === 'mountains' ? DIO : view === 'podium' ? POD : TURN;
    this.key.position.set(at.x + 4, 9, at.z + 6);
    this.key.target.position.copy(at);
    this.rim.position.set(at.x - 3, 5, at.z - 8);
    this.rim.target.position.copy(at);
    if (snap) {
      this.camPos.copy(this.goalPos);
      this.camLook.copy(this.goalLook);
    }
  }

  setMountain(id) {
    this.mountain = id;
    this.turnVel = 0;
  }

  /**
   * Turn the chosen mountain yourself: `dir` −1 or +1 gives it a push (the
   * arrows, Q/E); `dragMountain` follows a drag (radians from pixels) and
   * flings on release. It slows to a stop, and its own slow turn comes back
   * a few seconds after you let go.
   */
  turnMountain(dir) {
    this.turnVel = (this.turnVel ?? 0) + dir * 2.6;
    this.turnHold = 4;
  }

  dragMountain(dxPx, dt = 1 / 60) {
    const d = this.dioramas?.get(this.mountain);
    if (!d) return;
    const a = dxPx * 0.011;
    d.turn.rotation.y += a;
    this.turnVel = a / Math.max(1 / 120, dt);
    this.turnHold = 4;
    this.dragging = true;
  }

  releaseMountain() {
    this.dragging = false;
  }

  update(dt, aspect) {
    this.t += dt;
    const k = 1 - Math.exp(-dt * 3.2);
    // on the mountains, the camera glides along the row to the one chosen (there are more than fit)
    const chosen = this.view === 'mountains' && this.dioramas?.get(this.mountain);
    if (chosen) {
      // the map covers the left: the chosen mountain stands on the right
      this.goalPos.x = chosen.g.position.x - 3.2;
      this.goalLook.x = chosen.g.position.x - 3.0;
    }
    this.camPos.lerp(this.goalPos, k);
    this.camLook.lerp(this.goalLook, k);
    const sway = Math.sin(this.t * 0.25) * 0.15;
    this.camera.position.set(this.camPos.x + sway, this.camPos.y, this.camPos.z);
    this.camera.lookAt(this.camLook);
    if (aspect && Math.abs(this.camera.aspect - aspect) > 1e-3) {
      this.camera.aspect = aspect;
      this.camera.fov = aspect < 1 ? 52 : 36;
      this.camera.updateProjectionMatrix();
    }
    // the turntable turns the chosen rider to the front (or idles round on the title)
    const entry = this.turnRiders.get(this.picked);
    let goal = -entry.a;
    if (this.view === 'title' || this.view === 'lobby') goal = -entry.a + Math.sin(this.t * 0.3) * 0.5;
    let diff = goal - this.spinAngle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.spinAngle += diff * Math.min(1, dt * 4);
    this.spin.rotation.y = this.spinAngle;
    for (const [id, e] of this.turnRiders) {
      const ms = (e.st ??= { menu: true, cheer: false });
      ms.cheer = id === this.picked && this.view === 'riders' && this.t % 4 < 0.9;
      e.m.pose(dt, ms);
      // a new board slides in under a hop
      if (e.slide > 0) {
        e.slide = Math.max(0, e.slide - dt * 2.6);
        const k = e.slide * e.slide;
        e.m.board.position.x = k * 1.4;
        e.m.board.rotation.z = k * 0.6;
      } else if (e.slide === 0) {
        e.m.board.position.x = 0;
        e.m.board.rotation.z = 0;
        e.slide = -1;
      }
    }
    // dioramas: the chosen one rises and turns
    for (const [id, d] of this.dioramas) {
      const on = id === this.mountain;
      d.lift += ((on ? 0.35 : 0) - d.lift) * Math.min(1, dt * 5);
      d.g.position.y = d.lift;
      if (on) {
        // your own turn (arrows, Q/E, drag) first; its slow idle turn only once you've let it be
        this.turnHold = Math.max(0, (this.turnHold ?? 0) - dt);
        if (!this.dragging) d.turn.rotation.y += dt * ((this.turnVel ?? 0) + (this.turnHold > 0 ? 0 : 0.35));
        this.turnVel = (this.turnVel ?? 0) * Math.exp(-dt * (this.dragging ? 12 : 2.4));
      } else d.turn.rotation.y += dt * 0.05;
      d.g.scale.setScalar(1 + d.lift * 0.25);
    }
    for (const m of this.podiumRiders) {
      m.pose(dt, (m.st ??= { menu: true, cheer: m.cheer }));
      if (m.winner && (m.flourishT = (m.flourishT ?? 0.6) - dt) < 0) {
        m.flourishT = 2.2;
        m.goggles?.flourish();
      }
    }
    if (this.conf && this.confT > 0) {
      this.confT -= dt;
      const p = this.confPos, v = this.confVel;
      for (let i = 0; i < p.length; i += 3) {
        v[i + 1] -= 6 * dt;
        const drag = Math.exp(-2.2 * dt);
        v[i] *= drag; v[i + 2] *= drag; v[i + 1] = Math.max(v[i + 1] * drag, -1.2);
        p[i] += (v[i] + Math.sin(this.t * 5 + i) * 0.4) * dt; p[i + 1] = Math.max(0.02, p[i + 1] + v[i + 1] * dt); p[i + 2] += v[i + 2] * dt;
      }
      this.conf.geometry.attributes.position.needsUpdate = true;
    }
    // snowfall
    const p = this.flakePos;
    const base = this.view === 'mountains' ? DIO : this.view === 'podium' ? POD : TURN;
    this.flakes.position.x = base.x;
    for (let i = 0; i < p.length; i += 3) {
      p[i + 1] -= dt * (0.35 + (i % 7) * 0.05);
      p[i] += Math.sin(this.t + i) * dt * 0.1;
      if (p[i + 1] < 0) p[i + 1] = 12;
    }
    this.flakes.geometry.attributes.position.needsUpdate = true;
  }
}

/* ---------------------------------------------------------------- helpers */

function skyCard(m) {
  const mat = new THREE.MeshBasicNodeMaterial();
  const p = positionLocal;
  const y = p.y.div(2.2).mul(0.5).add(0.5);
  const [a, b, c] = m.palette.sky;
  const grad = mix(color(c), mix(color(b), color(a), smoothstep(0.4, 1, y)), smoothstep(0.0, 0.5, y));
  mat.colorNode = grad;
  if (m.time === 'night') {
    const n = mx_noise_float(vec3(p.x.mul(1.5).add(time.mul(0.1)), p.y.mul(0.8), 0));
    const curtain = pow(max(n.add(0.2), 0), 2).mul(smoothstep(0.35, 0.65, y)).mul(smoothstep(0.98, 0.75, y));
    mat.emissiveNode = mix(color('#3dffa0'), color('#9a6bff'), y).mul(curtain).mul(2.2);
  } else if (m.time === 'sunset') {
    const sun = smoothstep(0.55, 0.0, p.sub(vec3(0.7, -0.6, 0)).length());
    mat.emissiveNode = color('#ffb070').mul(sun).mul(1.4);
  } else {
    const sun = smoothstep(0.35, 0.0, p.sub(vec3(-0.9, 1.1, 0)).length());
    mat.emissiveNode = color('#fff3c0').mul(sun).mul(1.6);
  }
  return mat;
}

function roundedBlock(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d, 6, 6, 6);
  const p = g.attributes.position;
  const r = 0.12;
  for (let i = 0; i < p.count; i++) {
    const v = [p.getX(i), p.getY(i), p.getZ(i)];
    const half = [w / 2 - r, h / 2 - r, d / 2 - r];
    const c = v.map((x, k) => Math.max(-half[k], Math.min(half[k], x)));
    const dx = v[0] - c[0], dy = v[1] - c[1], dz = v[2] - c[2];
    const l = Math.hypot(dx, dy, dz);
    if (l > 1e-6) p.setXYZ(i, c[0] + (dx / l) * r, c[1] + (dy / l) * r, c[2] + (dz / l) * r);
  }
  g.computeVertexNormals();
  return g;
}

function numberTexture(n, col) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  g.font = '900 200px "Nunito Variable", Nunito, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 22;
  g.strokeStyle = '#2a2f4a';
  g.strokeText(String(n), 128, 140);
  g.fillStyle = col;
  g.fillText(String(n), 128, 140);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export { float, uniform, sin, abs };
