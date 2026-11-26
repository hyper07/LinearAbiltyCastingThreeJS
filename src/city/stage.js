import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PlushRider, sculptSpecies } from './plushRider.js';
import { Scooter } from './scooter.js';
import { CREW_ORDER, rider } from './crew.js';
import { SCOOTER_ORDER } from './scoot.js';

/**
 * Kickrani's pre-race stage: a little round plaza on a Seoul rooftop
 * — a roundabout of asphalt with its double yellow ring and a granite kerb,
 * zebra stripes leading in, two street lamps — and the city behind it: towers
 * with lit windows, N Seoul Tower on its hill, the tallest tower far off.
 * The plush riders stand round the turntable on their scooters; it turns the
 * one you choose to the front, and they wave, wiggle their ears and hop. On
 * the scooter step the six scooters stand on plinths behind, the chosen one
 * lifted and turning, and your rider rides it; the sky, the light, the lamps,
 * the windows, rain, snow and fog show the time and weather you pick, live.
 *
 * The pattern is Snowpuff Peaks' menu stage (src/snowpuff/stage.js: a
 * turntable that turns the chosen rider to face you, the camera gliding
 * between sets, reactions when picked), built again here for this game's
 * WebGL renderer — Snowpuff's files are only read.
 */

const R = 2.35; // the riders' circle on the turntable
const PARK = { y: 0.35 }; // the scooters' plinths

/** The light and sky for each time of day (the weather mixes into it). */
export const STAGE_TIMES = {
  day: { top: '#3d7fd6', low: '#cfe6ff', key: '#fff3e0', keyI: 2.6, hemi: 0.85, sunY: 0.75, night: 0, sun: '#fff6d8' },
  golden: { top: '#5b7fc0', low: '#ffcf96', key: '#ffbe78', keyI: 2.3, hemi: 0.6, sunY: 0.22, night: 0.1, sun: '#ffb060' },
  dusk: { top: '#2c2f6e', low: '#ff9a7a', key: '#ff8a6a', keyI: 1.1, hemi: 0.42, sunY: 0.06, night: 0.55, sun: '#ff7050' },
  night: { top: '#060a1c', low: '#1b2550', key: '#9fb4ff', keyI: 0.4, hemi: 0.2, sunY: 0.5, night: 1, sun: '#c8d6ff' }
};
const TIME_CYCLE = ['day', 'golden', 'dusk', 'night'];
const WEATHER_CYCLE = ['clear', 'rain', 'snow', 'fog'];

export class JaraniStage {
  constructor(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 600);
    this.camPos = new THREE.Vector3(0, 1.7, R + 5);
    this.camLook = new THREE.Vector3(0, 0.8, R * 0.5);
    this.goalPos = this.camPos.clone();
    this.goalLook = this.camLook.clone();
    this.view = 'rider';
    this.t = 0;
    this.picked = 'bunny';
    this.ride = 'city';
    this.riders = new Map();
    this.parked = new Map();
    this.spinAngle = 0;
    this.sky = { time: 'day', weather: 'clear' };
    this.look = { ...this._mix('day', 'clear') };
    this.built = false;
  }

  /* -------------------------------------------------------------- the set */

  /** The set at once; the riders sculpted a few at a time afterwards (`ready` resolves when all are in). */
  build() {
    const s = this.scene;
    const pm = new THREE.PMREMGenerator(this.renderer);
    const env = new RoomEnvironment();
    this.envTex = pm.fromScene(env, 0.04).texture;
    s.environment = this.envTex;
    s.environmentIntensity = 0.5;
    pm.dispose();
    // The sky: a gradient dome with the sun's glow (or the moon's), and stars at night.
    this.skyU = { uTop: { value: new THREE.Color() }, uLow: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0.4, 0.5, -0.8).normalize() }, uNight: { value: 0 }, uGrey: { value: 0 } };
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(400, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.skyU,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform vec3 uTop; uniform vec3 uLow; uniform vec3 uSun; uniform vec3 uSunDir; uniform float uNight; uniform float uGrey; varying vec3 vDir;
          float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
          void main(){
            vec3 d = normalize(vDir);
            float h = clamp(d.y, 0.0, 1.0);
            vec3 col = mix(uLow, uTop, pow(h, 0.5));
            float s = max(0.0, dot(d, uSunDir));
            col += uSun * (pow(s, 8.0) * 0.35 + pow(s, 400.0) * 2.0) * (1.0 - uGrey);
            vec3 cell = floor(d * 180.0);
            float star = step(0.9965, hash(cell)) * uNight * (1.0 - uGrey) * smoothstep(0.05, 0.3, d.y);
            col += vec3(star);
            col = d.y < 0.0 ? uLow * 0.8 : col;
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`
      })
    );
    dome.renderOrder = -10;
    s.add(dome);
    // The rooftop: asphalt with zebra stripes leading to the roundabout, a parapet round its edge.
    this.floorMat = new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.85, metalness: 0 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(26, 64).rotateX(-Math.PI / 2), this.floorMat);
    floor.receiveShadow = true;
    s.add(floor);
    const parapet = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 0.9, 64, 1, true), new THREE.MeshStandardMaterial({ color: '#b9b4aa', roughness: 0.9, side: THREE.DoubleSide }));
    parapet.position.y = 0.45;
    s.add(parapet);
    // The turntable: a roundabout disc, a granite kerb, a double yellow ring and white dashes.
    this.table = new THREE.Group();
    s.add(this.table);
    const kerb = new THREE.Mesh(new THREE.CylinderGeometry(R + 1.05, R + 1.12, 0.3, 64), new THREE.MeshStandardMaterial({ color: '#cfcac2', roughness: 0.7 }));
    kerb.position.y = 0.15;
    kerb.castShadow = kerb.receiveShadow = true;
    this.table.add(kerb);
    this.spin = new THREE.Group();
    this.spin.position.y = 0.3;
    this.table.add(this.spin);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R + 0.95, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: discTexture(), roughness: 0.75 }));
    disc.position.y = 0.006;
    disc.receiveShadow = true;
    this.spin.add(disc);
    // Street lamps either side (lit after dark).
    this.lampMat = new THREE.MeshStandardMaterial({ color: '#fff2cc', emissive: '#ffd27a', emissiveIntensity: 0 });
    this.lamps = [];
    for (const x of [-7.5, 6.5]) {
      const g = new THREE.Group();
      g.position.set(x, 0, -3.5);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 10), new THREE.MeshStandardMaterial({ color: '#4a5058', roughness: 0.5, metalness: 0.6 }));
      pole.position.y = 2.1;
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8).rotateZ(Math.PI / 2), pole.material);
      arm.position.set(-Math.sign(x) * 0.45, 4.15, 0);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.14, 14), this.lampMat);
      head.position.set(-Math.sign(x) * 0.9, 4.05, 0);
      const light = new THREE.PointLight('#ffcf80', 0, 12, 1.6);
      light.position.set(-Math.sign(x) * 0.9, 3.8, 0);
      g.add(pole, arm, head, light);
      s.add(g);
      this.lamps.push(light);
    }
    // The city behind: towers with windows, N Seoul Tower on Namsan, the Jamsil Sky Tower far off.
    const lit = windowTexture(true);
    const face = windowTexture(false);
    // (three kinds of tower: cream render, blue-grey glass, brick — a skyline, not a grey wall)
    this.windowMats = ['#fff4e2', '#b9cde6', '#e8b59a'].map((c, k) => new THREE.MeshStandardMaterial({ color: c, map: face, emissiveMap: lit, emissive: '#ffd49a', emissiveIntensity: 0, roughness: k === 1 ? 0.25 : 0.7, metalness: k === 1 ? 0.5 : 0.1 }));
    this.windowMat = this.windowMats[0];
    const towers = new THREE.Group();
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 46; k++) {
      const a = -Math.PI * 0.95 + (k / 45) * Math.PI * 0.9 + (rnd() - 0.5) * 0.04;
      const d = 150 + rnd() * 110;
      const w = 14 + rnd() * 20;
      const h = 12 + rnd() * rnd() * 75;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * (0.6 + rnd() * 0.6)), this.windowMats[k % 3]);
      b.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
      b.rotation.y = -a + Math.PI / 2;
      towers.add(b);
    }
    s.add(towers);
    const hill = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.4, 0.55, 1), new THREE.MeshStandardMaterial({ color: '#3f6a3c', roughness: 0.95 }));
    hill.position.set(-70, -2, -190);
    s.add(hill);
    const tower = new THREE.Group();
    tower.position.set(-70, 20, -190);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 36, 12), new THREE.MeshStandardMaterial({ color: '#e8e6e2', roughness: 0.6 }));
    shaft.position.y = 18;
    this.towerTop = new THREE.MeshStandardMaterial({ color: '#f2f0ea', emissive: '#7ad1ff', emissiveIntensity: 0, roughness: 0.4 });
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 5, 16), this.towerTop);
    pod.position.y = 36;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 16, 8), shaft.material);
    mast.position.y = 46;
    tower.add(shaft, pod, mast);
    s.add(tower);
    const lotte = new THREE.Mesh(new THREE.CylinderGeometry(1, 9, 150, 4, 1).rotateY(Math.PI / 4), new THREE.MeshPhysicalMaterial({ color: '#c9d8e6', roughness: 0.15, metalness: 0.6, clearcoat: 1 }));
    lotte.position.set(120, 75, -230);
    s.add(lotte);
    // Light: sky and ground, a key with soft shadows, a cool rim from behind.
    this.hemi = new THREE.HemisphereLight('#dcecff', '#6b5a4a', 0.8);
    s.add(this.hemi);
    this.key = new THREE.DirectionalLight('#fff3e6', 2.4);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    this.key.shadow.bias = -0.0006;
    this.key.shadow.normalBias = 0.02;
    const sc = this.key.shadow.camera;
    sc.left = -7;
    sc.right = 7;
    sc.top = 7;
    sc.bottom = -7;
    sc.near = 1;
    sc.far = 40;
    s.add(this.key, this.key.target);
    this.rim = new THREE.DirectionalLight('#cfe6ff', 1.4);
    this.rim.position.set(-4, 5, -8);
    s.add(this.rim);
    this.fog = new THREE.Fog('#cfe6ff', 30, 420);
    s.fog = this.fog;
    // Rain and snow round the plaza.
    this._weatherFx();
    // The scooters on their plinths (shown on the scooter step).
    this.showroom = new THREE.Group();
    this.showroom.visible = false;
    s.add(this.showroom);
    this._showroom();
    this.built = true;
    this.applySky(true);
    // The riders, sculpted one at a time so the page keeps breathing.
    this.ready = (async () => {
      for (const id of [this.picked, ...CREW_ORDER.filter((c) => c !== this.picked)]) {
        await new Promise((ok) => setTimeout(ok, 0));
        if (this.disposed) return;
        sculptSpecies(id, 96);
        this._addRider(id);
      }
    })();
    return this;
  }

  _addRider(id) {
    const ch = rider(id);
    const m = new PlushRider(id, { body: ch.scooter, trim: ch.trim, fur: 8, screen: false, ride: id === this.picked ? this.ride : 'city' });
    const i = CREW_ORDER.indexOf(id);
    const a = (i / CREW_ORDER.length) * Math.PI * 2;
    m.root.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    const holder = new THREE.Group();
    holder.add(m.root);
    this.spin.add(holder);
    m.root.traverse((o) => (o.userData.pick = { char: id }));
    this.riders.set(id, { m, a, holder, st: { mode: 'grid', speed: 0, heading: a + Math.PI + 0.55 } });
    if (id === this.picked) m.react('wave');
  }

  _showroom() {
    const plinthM = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.35, clearcoat: 0.6 });
    const ringM = new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: 0.85 });
    SCOOTER_ORDER.forEach((id, k) => {
      const g = new THREE.Group();
      // a row behind and to the left of the rider in front, curving round
      const u = k / (SCOOTER_ORDER.length - 1);
      g.position.set(-4.7 + u * 6.3, 0, -0.7 - Math.sin(u * Math.PI) * 0.7);
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.62, PARK.y, 36), plinthM);
      plinth.position.y = PARK.y / 2;
      plinth.castShadow = plinth.receiveShadow = true;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 8, 40).rotateX(Math.PI / 2), ringM);
      ring.position.y = PARK.y + 0.01;
      ring.visible = false;
      const turn = new THREE.Group();
      turn.position.y = PARK.y;
      const sc = new Scooter({ model: id, body: rider(this.picked).scooter, trim: rider(this.picked).trim, screen: false });
      sc.group.scale.setScalar(1.24);
      sc.setStand(true);
      turn.add(sc.group);
      g.add(plinth, ring, turn);
      g.traverse((o) => (o.userData.pick = { scooter: id }));
      this.showroom.add(g);
      this.parked.set(id, { g, turn, ring, sc, lift: 0 });
    });
  }

  _weatherFx() {
    const N = 1600;
    const pos = new Float32Array(N * 6);
    this.rainSeed = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      this.rainSeed[i * 3] = (Math.random() - 0.5) * 30;
      this.rainSeed[i * 3 + 1] = Math.random() * 14;
      this.rainSeed[i * 3 + 2] = (Math.random() - 0.5) * 24 - 2;
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#cfe0ff', transparent: true, opacity: 0.45, depthWrite: false }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);
    const M = 1200;
    const sp = new Float32Array(M * 3);
    for (let i = 0; i < M; i++) {
      sp[i * 3] = (Math.random() - 0.5) * 30;
      sp[i * 3 + 1] = Math.random() * 12;
      sp[i * 3 + 2] = (Math.random() - 0.5) * 24 - 2;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 0.07, transparent: true, opacity: 0.95, depthWrite: false }));
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    this.scene.add(this.snow);
  }

  /* -------------------------------------------------------------- picks */

  /** The rider in front (turned there; they wave or wiggle their ears). */
  pickRider(id, react = true) {
    if (this.picked !== id) {
      const old = this.riders.get(this.picked);
      // (the last one goes back to the S1 everyone starts on)
      if (old && old.m.scooter.model !== 'city') old.m.setRide('city');
    }
    this.picked = id;
    const e = this.riders.get(id);
    if (!e) return;
    if (e.m.scooter.model !== this.ride) e.m.setRide(this.ride);
    if (react) e.m.react(['wave', 'ears', 'wave', 'hop'][Math.floor(Math.random() * 4)]);
    for (const p of this.parked.values()) p.dirty = true;
  }

  /** The chosen scooter: your rider hops onto it, its plinth lifts. */
  setScooter(id, react = true) {
    this.ride = id;
    const e = this.riders.get(this.picked);
    if (e && e.m.scooter.model !== id) {
      e.m.setRide(id);
      if (react) {
        e.m.react('hop');
        e.slide = 1;
      }
    }
  }

  /** The time and the weather shown (as the race will have them; Random cycles through them all). */
  setSky(time, weather) {
    this.sky = { time, weather };
  }

  setView(view) {
    this.view = view;
    this.showroom.visible = view === 'scooter';
  }

  /** What is under a point of the screen: { char } or { scooter } or null. */
  pick(x, y, rect) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1), this.camera);
    const targets = [this.spin, ...(this.showroom.visible ? [this.showroom] : [])];
    for (const h of ray.intersectObjects(targets, true)) {
      const p = h.object.userData.pick;
      if (!p) continue;
      if (p.char && this.view === 'scooter' && p.char !== this.picked) continue;
      if (p.char && !this.riders.get(p.char)?.holder.visible) continue;
      return p;
    }
    return null;
  }

  /* -------------------------------------------------------------- each frame */

  _mix(time, weather) {
    const T = STAGE_TIMES[time] ?? STAGE_TIMES.day;
    const grey = weather === 'rain' ? 0.6 : weather === 'storm' ? 0.78 : weather === 'snow' ? 0.45 : weather === 'fog' ? 0.55 : 0;
    const greyCol = new THREE.Color(weather === 'snow' ? '#d9dee8' : weather === 'fog' ? '#c7ccd3' : '#6d7886').multiplyScalar(0.25 + 0.75 * (1 - T.night * 0.85));
    const c = (hex) => new THREE.Color(hex).lerp(greyCol, grey);
    return {
      top: c(T.top),
      low: c(T.low),
      sun: new THREE.Color(T.sun),
      key: new THREE.Color(T.key),
      keyI: T.keyI * (1 - grey * 0.55),
      hemi: T.hemi * (1 - grey * 0.25),
      sunY: T.sunY,
      night: T.night,
      grey,
      fogNear: weather === 'fog' ? 4 : weather === 'snow' ? 18 : weather === 'rain' || weather === 'storm' ? 24 : 120,
      fogFar: weather === 'fog' ? 34 : weather === 'snow' ? 180 : weather === 'rain' || weather === 'storm' ? 220 : 900,
      rain: weather === 'rain' ? 1 : weather === 'storm' ? 1.6 : 0,
      snow: weather === 'snow' ? 1 : 0,
      wet: weather === 'rain' || weather === 'storm' ? 1 : weather === 'fog' ? 0.3 : 0,
      storm: weather === 'storm'
    };
  }

  /** Ease the light, the sky and the weather toward what is picked (`snap`: at once). */
  applySky(snap = false, dt = 1 / 60) {
    // (Random: on the weather step it cycles through them all; before that, a fine golden evening)
    const tick = Math.floor(this.t / 2.2);
    const cycle = this.view === 'weather';
    const time = this.sky.time === 'random' || !STAGE_TIMES[this.sky.time] ? (cycle ? TIME_CYCLE[tick % 4] : 'golden') : this.sky.time;
    const weather = this.sky.weather === 'random' ? (cycle ? WEATHER_CYCLE[(tick + 1) % 4] : 'clear') : this.sky.weather;
    this.shown = { time, weather };
    const goal = this._mix(time, weather);
    const k = snap ? 1 : 1 - Math.exp(-dt * 3);
    const L = this.look;
    for (const c of ['top', 'low', 'sun', 'key']) L[c] = (L[c]?.clone?.() ?? goal[c].clone()).lerp(goal[c], k);
    for (const n of ['keyI', 'hemi', 'sunY', 'night', 'grey', 'fogNear', 'fogFar', 'rain', 'snow', 'wet']) L[n] = (L[n] ?? goal[n]) + (goal[n] - (L[n] ?? goal[n])) * k;
    this.skyU.uTop.value.copy(L.top);
    this.skyU.uLow.value.copy(L.low);
    this.skyU.uSun.value.copy(L.sun);
    this.skyU.uNight.value = L.night;
    this.skyU.uGrey.value = L.grey;
    const sunDir = new THREE.Vector3(0.55, Math.max(0.04, L.sunY), -0.7).normalize();
    this.skyU.uSunDir.value.copy(sunDir);
    this.key.color.copy(L.key);
    this.key.intensity = L.keyI;
    this.key.position.copy(sunDir).multiplyScalar(14).add(new THREE.Vector3(0, 0, 3));
    this.key.target.position.set(0, 0, 0);
    this.hemi.intensity = L.hemi;
    this.hemi.color.copy(L.top).lerp(new THREE.Color('#ffffff'), 0.5);
    this.scene.environmentIntensity = 0.25 + 0.3 * (1 - L.night);
    this.fog.color.copy(L.low);
    this.fog.near = L.fogNear;
    this.fog.far = L.fogFar;
    this.lampMat.emissiveIntensity = L.night * 3;
    for (const l of this.lamps) l.intensity = L.night * 14;
    for (const m of this.windowMats) m.emissiveIntensity = L.night * 1.6;
    this.towerTop.emissiveIntensity = L.night * 1.2;
    this.floorMat.roughness = 0.85 - L.wet * 0.6;
    this.floorMat.metalness = L.wet * 0.25;
    this.floorMat.color.setScalar(1 - L.wet * 0.3);
    this.rain.visible = L.rain > 0.05;
    this.rain.material.opacity = Math.min(0.7, 0.4 * L.rain);
    this.snow.visible = L.snow > 0.05;
    this.snow.material.opacity = L.snow;
    this.storm = goal.storm;
  }

  update(dt, aspect) {
    if (!this.built) return;
    dt = Math.min(dt, 0.05);
    this.t += dt;
    this._camera(dt, aspect);
    this.applySky(false, dt);
    // A storm: now and then the sky flashes white.
    if (this.storm && Math.random() < dt * 0.25) this.flash = 1;
    this.flash = Math.max(0, (this.flash ?? 0) - dt * 4);
    if (this.flash > 0) this.hemi.intensity += this.flash * 2.5;
    // The turntable brings the chosen rider round to the front; on the title it sways a little.
    const e = this.riders.get(this.picked);
    if (e) {
      let diff = -e.a - this.spinAngle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.spinAngle += diff * Math.min(1, dt * 4.5);
      this.spin.rotation.y = this.spinAngle;
    }
    const solo = this.view === 'scooter' || this.view === 'course' || this.view === 'weather';
    const night = this.look.night;
    for (const [id, r] of this.riders) {
      const me = id === this.picked;
      r.holder.visible = !solo || me;
      if (!r.holder.visible) continue;
      // now and then the one in front does something on its own
      if (me && !r.m._react && Math.random() < dt * 0.18) r.m.react(['ears', 'wave', 'hop'][Math.floor(Math.random() * 3)]);
      r.st.night = night;
      r.st.speed = 0;
      // (on the scooter step the one in front turns side-on, to show the scooter)
      const side = me && this.view === 'scooter' ? -1.6 : 0;
      r.turnK = (r.turnK ?? 0) + (side - (r.turnK ?? 0)) * Math.min(1, dt * 4);
      r.st.heading = r.a + Math.PI + 0.55 + r.turnK;
      r.m.pose(dt, r.st);
      // a new scooter slides in under a hop
      if (r.slide > 0) {
        r.slide = Math.max(0, r.slide - dt * 2.8);
        r.m.scooter.group.position.x = r.slide * r.slide * 1.2;
      } else if (r.slide === 0) {
        r.m.scooter.group.position.x = 0;
        r.slide = -1;
      }
      r.m.furLod?.(this.camera.position.distanceTo(r.m.root.getWorldPosition(new THREE.Vector3())));
    }
    // The showroom: the chosen scooter lifted and turning, the rest turning slowly.
    for (const [id, p] of this.parked) {
      const on = id === this.ride;
      p.lift += ((on ? 0.25 : 0) - p.lift) * Math.min(1, dt * 6);
      p.turn.position.y = PARK.y + p.lift;
      p.turn.rotation.y += dt * (on ? 0.9 : 0.15);
      p.ring.visible = on;
      if (p.dirty && this.view === 'scooter') {
        p.dirty = false;
        const ch = rider(this.picked);
        const sc = new Scooter({ model: id, body: ch.scooter, trim: ch.trim, screen: false });
        sc.group.scale.setScalar(1.24);
        sc.setStand(true);
        p.turn.remove(p.sc.group);
        p.sc.dispose();
        p.turn.add(sc.group);
        p.sc = sc;
        sc.group.traverse((o) => (o.userData.pick = { scooter: id }));
      }
    }
    // Rain and snow fall round the plaza.
    if (this.rain.visible) {
      const pos = this.rain.geometry.attributes.position.array;
      const seed = this.rainSeed;
      const fall = 14 * dt * Math.max(1, this.look.rain);
      for (let i = 0; i < seed.length / 3; i++) {
        seed[i * 3 + 1] -= fall;
        if (seed[i * 3 + 1] < 0) seed[i * 3 + 1] += 14;
        const x = seed[i * 3];
        const y = seed[i * 3 + 1];
        const z = seed[i * 3 + 2];
        pos.set([x, y, z, x + 0.03, y + 0.45, z], i * 6);
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    if (this.snow.visible) {
      const p = this.snow.geometry.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] -= dt * (0.6 + (i % 7) * 0.06);
        p[i] += Math.sin(this.t + i) * dt * 0.2;
        if (p[i + 1] < 0) p[i + 1] = 12;
      }
      this.snow.geometry.attributes.position.needsUpdate = true;
    }
  }

  _camera(dt, aspect) {
    const v = this.view;
    if (v === 'rider') {
      this.goalPos.set(0.55, 1.75, R + 4.4);
      this.goalLook.set(0.75, 0.9, R * 0.62);
    } else if (v === 'scooter') {
      this.goalPos.set(-0.1, 2.5, R + 6.1);
      this.goalLook.set(-0.35, 0.55, 0.4);
    } else if (v === 'course') {
      this.goalPos.set(-2.4, 1.9, R + 5.2);
      this.goalLook.set(-3.3, 1.2, R * 0.2);
    } else {
      this.goalPos.set(1.6, 1.25, R + 5.6);
      this.goalLook.set(2.3, 2.0, 0);
    }
    // (on a narrow screen, further back)
    if (aspect && aspect < 1.1) this.goalPos.z += 2.5;
    const k = 1 - Math.exp(-dt * 3.2);
    this.camPos.lerp(this.goalPos, k);
    this.camLook.lerp(this.goalLook, k);
    const sway = Math.sin(this.t * 0.25) * 0.12;
    this.camera.position.set(this.camPos.x + sway, this.camPos.y, this.camPos.z);
    this.camera.lookAt(this.camLook);
    if (aspect && Math.abs(this.camera.aspect - aspect) > 1e-3) {
      this.camera.aspect = aspect;
      this.camera.fov = aspect < 1 ? 55 : 38;
      this.camera.updateProjectionMatrix();
    }
  }

  render(renderer) {
    const exp = renderer.toneMappingExposure;
    renderer.toneMappingExposure = 1.05;
    renderer.render(this.scene, this.camera);
    renderer.toneMappingExposure = exp;
  }

  dispose() {
    this.disposed = true;
    for (const r of this.riders.values()) r.m.dispose();
    for (const p of this.parked.values()) p.sc.dispose();
    // (the scooters' and riders' geometries are shared with the race: only the set's own are freed)
    this.scene.remove(this.showroom);
    this.scene.traverse((o) => {
      if (o.isMesh || o.isPoints || o.isLineSegments) {
        if (!o.isSkinnedMesh) o.geometry?.dispose();
        for (const m of [].concat(o.material ?? [])) {
          m.map?.dispose();
          m.emissiveMap?.dispose();
          m.dispose?.();
        }
      }
    });
    this.envTex?.dispose();
  }
}

/* ---------------------------------------------------------------- textures */

/** The rooftop's asphalt: worn, with zebra stripes leading in from the front and two sides. */
function floorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#4b4d52';
  g.fillRect(0, 0, 1024, 1024);
  const img = g.getImageData(0, 0, 1024, 1024);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  // (26 m across: 1 m is about 19.7 px; the middle is the turntable)
  const m = 1024 / 52;
  const cx = 512;
  g.fillStyle = 'rgba(240,240,236,0.88)';
  for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0]]) {
    for (let k = -3; k <= 3; k++) {
      const along = 4.6;
      const x = cx + dx * along * m + (dz ? k * 0.9 * m : 0);
      const y = cx + dz * along * m + (dx ? k * 0.9 * m : 0);
      g.save();
      g.translate(x, y);
      g.fillRect(dz ? -0.25 * m : -1.6 * m, dz ? -1.6 * m : -0.25 * m, dz ? 0.5 * m : 3.2 * m, dz ? 3.2 * m : 0.5 * m);
      g.restore();
    }
  }
  // a painted bike lane arrow on the right
  g.fillStyle = 'rgba(70,160,90,0.55)';
  g.fillRect(cx + 7 * m, cx - 12 * m, 2 * m, 24 * m);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The roundabout disc: asphalt, a double yellow ring, white dashes round its edge, SSAENG in the middle. */
function discTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#3f4146';
  g.fillRect(0, 0, 1024, 1024);
  const img = g.getImageData(0, 0, 1024, 1024);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = '#f2c230';
  g.lineWidth = 9;
  for (const r of [300, 322]) {
    g.beginPath();
    g.arc(512, 512, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = '#f2f2ee';
  g.lineWidth = 12;
  g.setLineDash([40, 34]);
  g.beginPath();
  g.arc(512, 512, 470, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.font = '900 92px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('쌩쌩', 512, 470);
  g.font = '900 54px system-ui, sans-serif';
  g.fillText('JARANI', 512, 560);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A tower's face: a grid of windows (`lit`: the emissive map, some windows on). */
function windowTexture(lit) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = lit ? '#000' : '#8d96a3';
  g.fillRect(0, 0, 128, 256);
  for (let y = 6; y < 256; y += 14) {
    for (let x = 6; x < 128; x += 14) {
      if (lit) g.fillStyle = Math.random() < 0.45 ? `rgba(255,${200 + Math.random() * 40},${120 + Math.random() * 60},1)` : '#000';
      else g.fillStyle = Math.random() < 0.5 ? '#5d6878' : '#6f7c8f';
      g.fillRect(x, y, 9, 9);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
