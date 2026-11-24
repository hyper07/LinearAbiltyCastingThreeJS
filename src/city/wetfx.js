import * as THREE from 'three';

/**
 * Rain on the race: what a wet street does with light (knowledge/racing-study.md
 * §6) — every bright light near you (headlights, tail and brake lights, the
 * scooters' LEDs) smeared down the wet road toward the camera as a long soft
 * streak, the falling rain lit up where it crosses those lights, and spray
 * kicked up behind wheels. Two draws (streaks, spray) and a few uniforms on
 * the rain; nothing when the road is dry.
 *
 *   const fx = new WetFx(game);
 *   fx.light(x, y, z, color, power)   // each frame, for each light (the race and traffic call it)
 *   fx.spray(x, y, z, heading, speed, size)
 *   fx.update(dt)                     // once a frame, after the lights
 */

const MAX_STREAKS = 96;
const MAX_DROPS = 700;
const LIT = 8;

export class WetFx {
  constructor(game) {
    this.g = game;
    this.lights = [];
    // Streaks: a unit quad on the ground from the light (z = 0) toward the camera (z = 1).
    const quad = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
    this.streakMat = new THREE.ShaderMaterial({
      uniforms: { uWet: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        varying vec2 vUv;
        varying vec3 vColor;
        void main() {
          vUv = uv;
          vColor = aColor;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uWet;
        varying vec2 vUv;
        varying vec3 vColor;
        void main() {
          // brightest under the light, fading toward the camera; soft at the sides, broken by ripples
          float along = 1.0 - vUv.y;
          float across = 1.0 - abs(vUv.x * 2.0 - 1.0);
          float ripple = 0.75 + 0.25 * sin(vUv.y * 60.0 + vUv.x * 9.0);
          float a = pow(1.0 - along, 1.6) * pow(across, 2.2) * ripple * uWet;
          gl_FragColor = vec4(vColor * a, 1.0);
        }`
    });
    this.streaks = new THREE.InstancedMesh(quad, this.streakMat, MAX_STREAKS);
    this.streaks.geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(MAX_STREAKS * 3), 3));
    this.streaks.frustumCulled = false;
    this.streaks.count = 0;
    this.streaks.renderOrder = 4;
    // Spray: soft grey droplets thrown up and back, falling and fading.
    const pos = new Float32Array(MAX_DROPS * 3);
    const life = new Float32Array(MAX_DROPS);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    this.drops = { pos, life, vel: new Float32Array(MAX_DROPS * 3), next: 0 };
    this.spraySys = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: { uNight: { value: 0 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute float aLife;
        varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vA = clamp(aLife, 0.0, 1.0);
          gl_PointSize = clamp((0.035 + (1.0 - vA) * 0.09) * 700.0 / max(-mv.z, 0.5), 1.0, 28.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uNight;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float r = 1.0 - smoothstep(0.1, 0.5, length(c));
          float a = r * vA * 0.26;
          if (a < 0.01) discard;
          gl_FragColor = vec4(mix(vec3(0.86, 0.89, 0.93), vec3(0.42, 0.46, 0.54), uNight), a);
        }`
    }));
    this.spraySys.frustumCulled = false;
    this.spraySys.renderOrder = 6;
    game.scene.add(this.streaks, this.spraySys);
    this._o = new THREE.Object3D();
    this._c = new THREE.Color();
    this.litPos = Array.from({ length: LIT }, () => new THREE.Vector4());
    this.litCol = Array.from({ length: LIT }, () => new THREE.Vector3());
    this._hookRain();
  }

  /** The city's rain lit where it falls through a light: eight lights nearest you, fed to its shader. */
  _hookRain() {
    const rain = this.g.weather?.rain;
    if (!rain || rain.material.userData.lit) return;
    const m = rain.material;
    m.userData.lit = true;
    m.uniforms.uLitPos = { value: this.litPos };
    m.uniforms.uLitCol = { value: this.litCol };
    m.vertexShader = m.vertexShader
      .replace('varying float vA;', `varying float vA;\nvarying vec3 vLit;\nuniform vec4 uLitPos[${LIT}];\nuniform vec3 uLitCol[${LIT}];`)
      .replace('gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);', `vLit = vec3(0.0);
          for (int i = 0; i < ${LIT}; i++) {
            vec3 d = p - uLitPos[i].xyz;
            vLit += uLitCol[i] * uLitPos[i].w * exp(-dot(d, d) / 6.0);
          }
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);`);
    m.fragmentShader = m.fragmentShader
      .replace('varying float vA;', 'varying float vA;\nvarying vec3 vLit;')
      .replace('gl_FragColor = vec4(mix(vec3(0.75, 0.8, 0.88), vec3(0.6, 0.66, 0.78), uNight), vA * 0.42);', 'vec3 base = mix(vec3(0.75, 0.8, 0.88), vec3(0.6, 0.66, 0.78), uNight);\n          gl_FragColor = vec4(base + vLit * 2.2, vA * (0.42 + min(0.5, dot(vLit, vec3(0.4)))));');
    m.needsUpdate = true;
  }

  /** A light this frame: where (its lamp), its colour, how bright (0–1+). */
  light(x, y, z, color, power = 1) {
    if (this.lights.length < MAX_STREAKS) this.lights.push({ x, y, z, color, power });
  }

  /** Spray behind a wheel at (x, y, z), going `heading` at `speed` m/s; `size` 1 for a scooter, more for a car. */
  spray(x, y, z, heading, speed, size = 1) {
    const wet = this.g.weather?.level.wet ?? 0;
    if (wet < 0.25 || speed < 2) return;
    const D = this.drops;
    const n = Math.min(5, Math.ceil(speed * 0.3 * size * wet));
    const bx = Math.sin(heading);
    const bz = Math.cos(heading);
    for (let k = 0; k < n; k++) {
      const i = D.next;
      D.next = (D.next + 1) % MAX_DROPS;
      D.pos[i * 3] = x + (Math.random() - 0.5) * 0.15 * size;
      D.pos[i * 3 + 1] = y + 0.05;
      D.pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.15 * size;
      const back = speed * (0.12 + Math.random() * 0.12);
      const side = (Math.random() - 0.5) * 1.4 * size;
      D.vel[i * 3] = bx * back + bz * side;
      D.vel[i * 3 + 1] = 0.8 + Math.random() * 1.4 * Math.min(1.5, size);
      D.vel[i * 3 + 2] = bz * back - bx * side;
      D.life[i] = 0.3 + Math.random() * 0.25;
    }
  }

  update(dt) {
    const w = this.g.weather;
    const wet = w?.level.wet ?? 0;
    const night = this.g.uniforms?.uNight.value ?? 0;
    const cam = this.g.camera.position;
    this.streakMat.uniforms.uWet.value = Math.min(1, wet * 1.1);
    this.spraySys.material.uniforms.uNight.value = night;
    // Streaks: each light smeared toward the camera, longer the further it is and the lower you look.
    const o = this._o;
    const col = this.streaks.geometry.attributes.aColor;
    let n = 0;
    if (wet > 0.05) {
      this.lights.sort((a, b) => Math.hypot(a.x - cam.x, a.z - cam.z) - Math.hypot(b.x - cam.x, b.z - cam.z));
      for (const l of this.lights) {
        const dx = cam.x - l.x;
        const dz = cam.z - l.z;
        const d = Math.hypot(dx, dz);
        if (d > 90 || n >= MAX_STREAKS) continue;
        const ground = this.g.surfaceAt?.(l.x, l.z, l.y + 1) ?? l.y - 0.6;
        const h = Math.max(0.2, l.y - ground);
        const len = Math.min(d * 0.9, h * (4 + d * 0.06) + 1.2);
        o.position.set(l.x, ground + 0.035, l.z);
        o.rotation.set(0, Math.atan2(dx, dz), 0);
        o.scale.set(0.35 + h * 0.25, 1, len);
        o.updateMatrix();
        this.streaks.setMatrixAt(n, o.matrix);
        this._c.set(l.color).multiplyScalar(l.power * (0.35 + 0.65 * Math.max(night, 0.4)));
        col.setXYZ(n, this._c.r, this._c.g, this._c.b);
        n++;
      }
    }
    this.streaks.count = n;
    this.streaks.instanceMatrix.needsUpdate = true;
    col.needsUpdate = true;
    // The rain lit by the nearest lights.
    for (let i = 0; i < LIT; i++) {
      const l = wet > 0.05 ? this.lights[i] : null;
      if (l) {
        this.litPos[i].set(l.x, l.y, l.z, l.power * 0.6 * (0.3 + night * 0.7));
        this._c.set(l.color);
        this.litCol[i].set(this._c.r, this._c.g, this._c.b);
      } else this.litPos[i].w = 0;
    }
    this.lights.length = 0;
    // Spray: thrown, falling, fading.
    const D = this.drops;
    for (let i = 0; i < MAX_DROPS; i++) {
      if (D.life[i] <= 0) continue;
      D.life[i] -= dt * 1.6;
      D.vel[i * 3 + 1] -= 9.8 * dt;
      D.pos[i * 3] += D.vel[i * 3] * dt;
      D.pos[i * 3 + 1] += D.vel[i * 3 + 1] * dt;
      D.pos[i * 3 + 2] += D.vel[i * 3 + 2] * dt;
      if (D.life[i] <= 0) D.pos[i * 3 + 1] = -1e4;
    }
    this.spraySys.geometry.attributes.position.needsUpdate = true;
    this.spraySys.geometry.attributes.aLife.needsUpdate = true;
  }

  dispose() {
    this.g.scene.remove(this.streaks, this.spraySys);
    this.streaks.geometry.dispose();
    this.streakMat.dispose();
    this.spraySys.geometry.dispose();
    this.spraySys.material.dispose();
    for (const p of this.litPos) p.w = 0;
  }
}
