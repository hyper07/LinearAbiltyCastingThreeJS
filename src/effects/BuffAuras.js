import { AdditiveBlending, CylinderGeometry, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { getColor } from '../utils/color.js';

/**
 * Auras on whoever a team buff reached (Battle Roar, and any forged skill
 * built on it): a glowing ring on the ground and a soft column of light
 * rising around the body, following them for as long as the buff lasts.
 * The ring drains clockwise as the time runs out, and the last second fades,
 * so everyone in the party can read who is buffed and for how much longer.
 *
 * One aura per key (a player): a new roar refreshes it rather than stacking.
 *
 *   auras.show('me', character, { color: '#ff4d3d', seconds: 6 })
 *   auras.update(elapsed)      // every frame
 */

const RING_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RING_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uLeft;    // 1 → 0 as the buff runs out
  uniform float uFade;    // 0..1 envelope (in, out)
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    // The band, a soft inner wash, and a pulse travelling outward.
    float band = smoothstep(0.78, 0.86, r) * (1.0 - smoothstep(0.92, 1.0, r));
    float wash = smoothstep(0.2, 0.9, r) * 0.18;
    float pulse = smoothstep(0.08, 0.0, abs(r - fract(uTime * 0.7))) * 0.5;
    // The timer: the band only covers the time still left, clockwise from the front.
    float a = atan(p.x, p.y) / 6.28318 + 0.5;
    float timer = step(a, uLeft);
    float alpha = (band * (0.35 + 0.65 * timer) + wash + pulse * (1.0 - r)) * uFade;
    gl_FragColor = vec4(uColor * (1.2 + band), alpha);
  }
`;

const COLUMN_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uFade;
  varying vec2 vUv;
  void main() {
    // Bright at the feet, gone by the head; streaks drifting up.
    float up = 1.0 - vUv.y;
    float streak = 0.55 + 0.45 * sin(vUv.x * 50.0 + uTime * 1.5) * sin(vUv.y * 9.0 - uTime * 4.0);
    float alpha = pow(up, 1.6) * streak * 0.42 * uFade;
    gl_FragColor = vec4(uColor * 1.4, alpha);
  }
`;

export class BuffAuras {
  constructor(scene) {
    this.group = new Group();
    this.group.name = 'buff-auras';
    scene.add(this.group);
    /** key → { target, until, seconds, ring, column, uniforms } */
    this.auras = new Map();
    this._ringGeometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this._columnGeometry = new CylinderGeometry(0.75, 0.9, 2.3, 32, 1, true).translate(0, 1.15, 0);
    this.elapsed = 0;
  }

  /**
   * @param {string} key one aura per key
   * @param {{ position: import('three').Vector3 }} target anything with a position (the character, a remote player)
   * @param {{ color?: string, seconds?: number, radius?: number }} [options]
   */
  show(key, target, { color = '#ff4d3d', seconds = 6, radius = 1.3 } = {}) {
    let aura = this.auras.get(key);
    if (!aura) {
      const uniforms = { uColor: { value: getColor(color).clone() }, uTime: { value: 0 }, uLeft: { value: 1 }, uFade: { value: 0 } };
      const material = (fragmentShader) =>
        new ShaderMaterial({ uniforms, vertexShader: RING_VERTEX, fragmentShader, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
      const ring = new Mesh(this._ringGeometry, material(RING_FRAGMENT));
      ring.renderOrder = 5;
      const column = new Mesh(this._columnGeometry, material(COLUMN_FRAGMENT));
      column.renderOrder = 6;
      const holder = new Group();
      holder.add(ring, column);
      this.group.add(holder);
      aura = { holder, ring, column, uniforms, born: this.elapsed };
      this.auras.set(key, aura);
    }
    aura.target = target;
    aura.seconds = seconds;
    aura.until = this.elapsed + seconds;
    aura.uniforms.uColor.value.copy(getColor(color));
    aura.ring.scale.setScalar(radius * 2);
    return aura;
  }

  /** Seconds left on an aura (0 = none). */
  left(key) {
    const aura = this.auras.get(key);
    return aura ? Math.max(0, aura.until - this.elapsed) : 0;
  }

  remove(key) {
    const aura = this.auras.get(key);
    if (!aura) return;
    this.group.remove(aura.holder);
    aura.ring.material.dispose();
    aura.column.material.dispose();
    this.auras.delete(key);
  }

  clear() {
    for (const key of [...this.auras.keys()]) this.remove(key);
  }

  /** @param {number} elapsed game time, seconds */
  update(elapsed) {
    this.elapsed = elapsed;
    for (const [key, aura] of this.auras) {
      const left = aura.until - elapsed;
      const position = aura.target?.position;
      if (left <= 0 || !position) {
        this.remove(key);
        continue;
      }
      aura.holder.position.set(position.x, position.y + 0.04, position.z);
      const u = aura.uniforms;
      u.uTime.value = elapsed;
      u.uLeft.value = left / aura.seconds;
      // In over a fifth of a second, out over the last second.
      u.uFade.value = Math.min(1, (elapsed - aura.born) / 0.2, left / 1);
    }
  }
}
