/**
 * The Cinder Rift, seen from the overlook: seventy metres down, a broken
 * basalt floor split by rivers and a lake of lava that glow and crawl,
 * jagged spires, plumes of smoke, fountains of fire that burst now and then,
 * a red glow on everything from below — and Vaelthrax, the Ember Drake,
 * circling on the updraught, now gliding, now beating its wings, sometimes
 * roaring and breathing fire at the lava (Mesh2Motion dragon, CC0).
 * From Brindlewick it is spectacle (the cliff's edge keeps the hero up top);
 * in the Cinder Rift zone it is the lava itself: its floor sits just under the
 * walkable ground there (rift.js), so only the molten channels show, and the
 * spires that stand where you walk are solid (`spires` lists them).
 */
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { riftAt } from './heights.js';
import { CLIFF_X } from './map.js';
import { rng } from './noise.js';
import { characterLoader } from '../library/characters.js';
import { DRAKE } from './cast.js';

const RIFT_VERT = /* glsl */ `
attribute float aLava;
varying float vLava;
varying vec3 vW;
varying vec3 vN;
void main() {
  vLava = aLava;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const RIFT_FRAG = /* glsl */ `
uniform sampler2D tRock;
uniform sampler2D tRockN;
uniform sampler2D tLava;
uniform sampler2D tLavaE;
uniform sampler2D tNoise;
uniform float uTime;
uniform vec3 uSky;
uniform vec3 uSun;
uniform vec3 uSunCol;
uniform vec3 uCam;
varying float vLava;
varying vec3 vW;
varying vec3 vN;
void main() {
  vec3 N = normalize(vN);
  vec2 uv = vW.xz / 9.0;
  vec3 rock = texture2D(tRock, uv).rgb * 0.4;
  vec3 rn = texture2D(tRockN, uv).xyz * 2.0 - 1.0;
  N = normalize(N + vec3(rn.x, 0.0, rn.y) * 0.6);
  // Rock: dim sky from above, the sunset grazing from the west, red glow from the lava below.
  float lavaNear = smoothstep(0.0, 1.0, vLava * 0.6 + texture2D(tNoise, vW.xz / 120.0).r * 0.2);
  vec3 col = rock * (uSky * (0.25 + 0.35 * N.y) + uSunCol * max(dot(N, uSun), 0.0) * 0.6);
  col += rock * vec3(1.0, 0.25, 0.06) * (0.4 + 2.2 * lavaNear) * (0.6 + 0.4 * (1.0 - N.y));
  // Lava: crawling crust over glowing melt.
  vec2 flow = vec2(uTime * 0.012, uTime * 0.004);
  float n = texture2D(tNoise, vW.xz / 40.0 + flow).g;
  vec3 lc = texture2D(tLava, vW.xz / 14.0 + flow + n * 0.08).rgb;
  vec3 le = texture2D(tLavaE, vW.xz / 14.0 + flow + n * 0.08).rgb;
  float pulse = 0.8 + 0.2 * sin(uTime * 0.7 + vW.x * 0.05);
  vec3 lava = lc * 0.3 + le * vec3(3.4, 1.3, 0.35) * 3.4 * pulse + vec3(1.6, 0.3, 0.04) * 0.9;
  col = mix(col, lava, smoothstep(0.35, 0.75, vLava));
  // Thick haze with distance, red low down.
  float d = length(vW - uCam);
  float fog = 1.0 - exp(-d * 0.0014);
  vec3 haze = mix(vec3(0.28, 0.09, 0.06), vec3(0.5, 0.3, 0.28), smoothstep(-70.0, 40.0, vW.y));
  col = mix(col, haze, fog * 0.75);
  gl_FragColor = vec4(col, 1.0);
}`;

export class Vista {
  /** `inRift`: seen from the rift's floor (always shown, its glow always on); `avoid(x, z)`: no spire there. */
  constructor({ inRift = false, avoid = () => false } = {}) {
    this.group = new THREE.Group();
    this.r = rng(66);
    this.geysers = [];
    this.drake = null;
    this.inRift = inRift;
    this.avoid = avoid;
    this.spires = [];
  }

  async build(bank, effects) {
    const [rock, lava] = await Promise.all([bank.ambient('Rock035', { fallback: '#222' }), bank.ambient('Lava004', { fallback: '#a02010' })]);
    // The rift floor: from the cliff's foot out to the far walls.
    const W = 900;
    const D = 900;
    const seg = 200;
    const geo = new THREE.PlaneGeometry(W, D, seg, seg);
    geo.rotateX(-Math.PI / 2);
    geo.translate(CLIFF_X - 6 + W / 2, 0, -60);
    const pos = geo.attributes.position;
    const lavaA = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const { h, lava: l } = riftAt(x, z);
      pos.setY(i, h);
      lavaA[i] = l;
    }
    geo.setAttribute('aLava', new THREE.BufferAttribute(lavaA, 1));
    geo.computeVertexNormals();
    this.uniforms = {
      tRock: { value: rock.map },
      tRockN: { value: rock.normalMap },
      tLava: { value: lava.map },
      tLavaE: { value: lava.emissiveMap ?? lava.map },
      tNoise: { value: bank.noise() },
      uTime: { value: 0 },
      uSky: { value: new THREE.Color('#8a6a8a') },
      uSun: { value: new THREE.Vector3(-0.9, 0.23, -0.36).normalize() },
      uSunCol: { value: new THREE.Color('#ffa060') },
      uCam: { value: new THREE.Vector3() }
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: RIFT_VERT, fragmentShader: RIFT_FRAG, toneMapped: false });
    for (const t of [rock.map, rock.normalMap, lava.map, lava.emissiveMap]) if (t) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const floor = new THREE.Mesh(geo, mat);
    floor.frustumCulled = false;
    // Down in the rift the walkable ground covers the floor; only the lava shows through.
    if (this.inRift) floor.position.y = -0.6;
    this.group.add(floor);
    // Jagged spires of basalt.
    const spireMat = mat;
    const r = this.r;
    for (let k = 0; k < 46; k++) {
      const x = CLIFF_X + 40 + r() * 600;
      const z = -380 + r() * 640;
      const { h, lava: l } = riftAt(x, z);
      if (l > 0.2) continue;
      const height = 18 + r() * 55;
      if (this.avoid(x, z)) continue;
      this.spires.push({ x, z, r: 6 });
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        pts.push(new THREE.Vector2(Math.max(0.3, (1 - t) * (5 + r() * 6) + Math.sin(t * 9 + k) * 1.2), t * height));
      }
      const g = new THREE.LatheGeometry(pts, 7);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.8 + r() * 0.4), p.getY(i), p.getZ(i) * (0.8 + r() * 0.4));
      g.setAttribute('aLava', new THREE.BufferAttribute(new Float32Array(p.count).fill(0.25), 1));
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, spireMat);
      m.position.set(x, h - 2, z);
      m.rotation.set((r() - 0.5) * 0.25, r() * 6, (r() - 0.5) * 0.25);
      m.frustumCulled = false;
      this.group.add(m);
    }
    // Fire fountains in the lava, and smoke plumes.
    for (let k = 0; k < 9; k++) {
      let x;
      let z;
      let tries = 0;
      do {
        x = CLIFF_X + 60 + r() * 450;
        z = -260 + r() * 420;
        tries++;
      } while (riftAt(x, z).lava < 0.6 && tries < 60);
      this.geysers.push({ x, y: riftAt(x, z).h, z, next: r() * 6, on: 0 });
      effects.addChimney(new THREE.Vector3(x, riftAt(x, z).h + 2, z), { rate: 1.4, size: 9, dark: 0.18 });
    }
    this.effects = effects;
    // A great warm light from below, felt on the cliff's face.
    this.glow = new THREE.PointLight(0xff5a1a, 0, 260, 1.2);
    this.glow.position.set(CLIFF_X + 80, -45, 0);
    this.group.add(this.glow);
    await this.loadDrake();
  }

  async loadDrake() {
    const loader = characterLoader();
    const base = './library/rigged/mesh2motion/dragon/';
    const [model, ...clips] = await Promise.all(['model', 'animations/fly-glide', 'animations/fly-flap', 'animations/fire-breath', 'animations/roar'].map((f) => loader.loadAsync(`${base}${f}.glb`).catch(() => null)));
    if (!model) return;
    const body = SkeletonUtils.clone(model.scene);
    const box = new THREE.Box3().setFromObject(body);
    const size = box.getSize(new THREE.Vector3());
    const len = Math.max(size.x, size.z) || 1;
    body.scale.setScalar(DRAKE.length / len);
    body.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = false;
        o.castShadow = false;
        if (o.material) {
          o.material = o.material.clone();
          o.material.emissive = new THREE.Color(0x401004);
          o.material.emissiveIntensity = 0.6;
        }
      }
    });
    const holder = new THREE.Group();
    holder.add(body);
    this.group.add(holder);
    const mixer = new THREE.AnimationMixer(body);
    const [glide, flap, fire, roar] = clips.map((g) => (g?.animations[0] ? mixer.clipAction(g.animations[0]) : null));
    glide?.play();
    flap?.play();
    flap?.setEffectiveWeight(0);
    this.drake = { holder, mixer, glide, flap, fire, roar, mode: 'glide', next: 6, w: 0, angle: 0 };
  }

  update(dt, t, camera, look) {
    if (!this.uniforms) return;
    const u = this.uniforms;
    u.uTime.value = t;
    u.uCam.value.copy(camera.position);
    u.uSun.value.copy(look.toLight);
    u.uSunCol.value.copy(look.lightColor ?? u.uSunCol.value);
    // Only spend on the rift when it can be seen (from the east side of the village; always from below).
    const near = this.inRift || (camera.position.x > 60 && camera.position.z > -120);
    this.group.visible = this.inRift || (camera.position.x > 20 && camera.position.z > -150);
    this.glow.intensity = near ? (this.inRift ? 60 : 140) : 0;
    // Fire fountains: bursts of flame and sparks.
    for (const g of this.geysers) {
      g.next -= dt;
      if (g.next < 0 && this.group.visible) {
        g.on = 1.6;
        g.next = 4 + this.r() * 9;
      }
      if (g.on > 0) {
        g.on -= dt;
        for (let i = 0; i < 6; i++) this.effects.burst(new THREE.Vector3(g.x, g.y + 1, g.z), 2, [1, 0.45 + this.r() * 0.3, 0.1], 14);
      }
    }
    const d = this.drake;
    if (!d) return;
    // Circle on the updraught; flap when climbing; now and then roar or breathe fire.
    d.angle += dt * 0.11;
    const a = d.angle;
    const x = DRAKE.centre[0] + Math.cos(a) * DRAKE.radius;
    const z = DRAKE.centre[1] + Math.sin(a) * DRAKE.radius * 0.8;
    const climb = Math.sin(a * 2.3);
    const y = DRAKE.altitude + climb * 12;
    d.holder.position.set(x, y, z);
    const dx = -Math.sin(a) * DRAKE.radius;
    const dz = Math.cos(a) * DRAKE.radius * 0.8;
    d.holder.rotation.set(-climb * 0.12, Math.atan2(dx, dz), -0.32);
    d.next -= dt;
    if (d.next < 0 && d.mode === 'glide') {
      d.mode = this.r() < 0.5 && d.fire ? 'fire' : 'roar';
      d.next = 3.2;
      const act = d.mode === 'fire' ? d.fire : d.roar;
      act?.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.4).play();
      this.events = [{ type: d.mode === 'fire' ? 'drakeFire' : 'roar', at: d.holder.position.clone() }];
    } else if (d.next < 0) {
      d.mode = 'glide';
      d.next = 10 + this.r() * 12;
      d.fire?.fadeOut(0.6);
      d.roar?.fadeOut(0.6);
    }
    if (d.mode === 'fire' && d.next > 0.5 && d.next < 2.6) {
      // A gout of flame from the jaws, toward the lava below.
      const head = new THREE.Vector3(0, 0, DRAKE.length * 0.48).applyEuler(d.holder.rotation).add(d.holder.position);
      for (let i = 0; i < 4; i++) {
        this.effects.sparkList.push({ x: head.x, y: head.y, z: head.z, vx: dx * 0.08 + (this.r() - 0.5) * 6, vy: -8 - this.r() * 6, vz: dz * 0.08 + (this.r() - 0.5) * 6, life: 0, max: 1.4, col: [1, 0.5, 0.12], g: 2 });
      }
    }
    const want = climb > 0.2 || d.mode !== 'glide' ? 1 : 0;
    d.w += (want - d.w) * Math.min(1, dt * 1.5);
    d.flap?.setEffectiveWeight(d.w);
    d.glide?.setEffectiveWeight(1 - d.w);
    d.mixer.update(dt);
  }

  dispose() {
    this.drake?.mixer.stopAllAction();
    this.group.removeFromParent();
  }

  takeEvents() {
    const e = this.events ?? [];
    this.events = [];
    return e;
  }
}
