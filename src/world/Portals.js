import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  TorusGeometry
} from 'three';

/**
 * Portals: upright, swirling gateways the player walks into.
 *
 * A level lists them as `{ id, x, z, yaw, color, label, target }`, where
 * `target` is `{ type: 'none' }`, `{ type: 'portal', portal: id }` (another
 * portal in the same level) or `{ type: 'level', level: id }` (travel to
 * another level, waypoint-style). The game also opens one on its own when a
 * level's goal is met — the way out to the ending and the next level.
 */

export const PORTAL_COLORS = {
  blue: '#4fb6ff',
  red: '#ff4b3a',
  gold: '#ffc24a',
  green: '#4dffa0',
  violet: '#b77bff'
};

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const VORTEX = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float a = atan(p.y, p.x);
    float swirlA = sin(a * 3.0 + r * 11.0 - uTime * 4.2) * 0.5 + 0.5;
    float swirlB = sin(a * 5.0 - r * 15.0 + uTime * 2.7) * 0.5 + 0.5;
    float core = pow(1.0 - r, 3.0);
    float rim = smoothstep(0.72, 0.98, r);
    vec3 col = uColor * (0.35 + 0.9 * swirlA * swirlB) + vec3(1.0) * core * 0.9 + uColor * rim * 1.6;
    float alpha = (0.45 + 0.55 * swirlA) * smoothstep(1.0, 0.9, r) * uOpen;
    gl_FragColor = vec4(col * 1.5, alpha);
  }
`;

const POOL = /* glsl */ `
  uniform float uTime;
  uniform float uOpen;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float ring = smoothstep(0.08, 0.0, abs(r - (0.55 + 0.35 * fract(uTime * 0.6))));
    float glow = pow(max(0.0, 1.0 - r), 2.0);
    gl_FragColor = vec4(uColor * (glow * 0.9 + ring * 0.6), (glow * 0.8 + ring * 0.5) * uOpen);
  }
`;

const geometries = {
  vortex: new PlaneGeometry(2.2, 3.1),
  rim: new TorusGeometry(1, 0.07, 10, 72),
  pool: new CircleGeometry(1.9, 48)
};

export class Portal {
  /** @param {{ id: string, x: number, z: number, yaw?: number, color?: string, label?: string, target?: object }} data */
  constructor(data, heightAt = () => 0) {
    this.data = data;
    this.cooldown = 0;
    this.open = 0;
    const color = new Color(PORTAL_COLORS[data.color] ?? PORTAL_COLORS.blue);
    const uniforms = { uTime: { value: 0 }, uOpen: { value: 0 }, uColor: { value: color } };
    this.uniforms = uniforms;

    this.group = new Group();
    this.group.name = `portal-${data.id}`;
    const shared = { uniforms, vertexShader: VERTEX, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide };
    const vortex = new Mesh(geometries.vortex, new ShaderMaterial({ ...shared, fragmentShader: VORTEX }));
    vortex.position.y = 1.75;
    const rim = new Mesh(geometries.rim, new MeshBasicMaterial({ color: color.clone().multiplyScalar(2.2), toneMapped: false }));
    rim.scale.set(1.12, 1.58, 1);
    rim.position.y = 1.75;
    const pool = new Mesh(geometries.pool, new ShaderMaterial({ ...shared, fragmentShader: POOL }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.04;
    this.vortex = vortex;
    this.rim = rim;
    this.group.add(pool, vortex, rim);
    this.group.position.set(data.x, heightAt(data.x, data.z), data.z);
    this.group.rotation.y = data.yaw ?? 0;
  }

  get position() {
    return this.group.position;
  }

  /** Grow open over ~0.6 s, swirl, breathe. */
  update(dt, time) {
    this.open = Math.min(1, this.open + dt * 1.7);
    const ease = 1 - (1 - this.open) ** 3;
    this.uniforms.uTime.value = time;
    this.uniforms.uOpen.value = ease;
    this.vortex.scale.setScalar(Math.max(0.01, ease));
    this.rim.scale.set(1.12 * ease, 1.58 * ease, 1);
    this.rim.rotation.z = Math.sin(time * 0.8) * 0.04;
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  dispose() {
    this.group.removeFromParent();
    this.group.traverse((node) => node.material?.dispose());
  }
}

/**
 * The portals of the level being played, plus the walk-in test.
 * `onEnter(portal)` fires once when the caster steps into one.
 */
export class PortalSystem {
  constructor(scene, labels) {
    this.scene = scene;
    this.labels = labels;
    this.portals = [];
    this.onEnter = null;
  }

  setPortals(list, heightAt) {
    this.clear();
    for (const data of list) this.add(data, heightAt);
  }

  add(data, heightAt = () => 0) {
    const portal = new Portal(data, heightAt);
    this.scene.add(portal.group);
    if (data.label) {
      portal.labelHandle = this.labels?.add(portal.position, data.label, { className: 'world-label--portal', offset: 3.9, color: PORTAL_COLORS[data.color] });
    }
    this.portals.push(portal);
    return portal;
  }

  get(id) {
    return this.portals.find((p) => p.data.id === id) ?? null;
  }

  clear() {
    for (const portal of this.portals) {
      portal.labelHandle?.remove();
      portal.dispose();
    }
    this.portals = [];
  }

  /** @param {import('three').Vector3} player */
  update(dt, time, player) {
    for (const portal of this.portals) {
      portal.update(dt, time);
      if (portal.open < 0.8 || portal.cooldown > 0 || !player) continue;
      if (Math.hypot(player.x - portal.position.x, player.z - portal.position.z) < 1.05) {
        portal.cooldown = 1.5;
        this.onEnter?.(portal);
      }
    }
  }
}
