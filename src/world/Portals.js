import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  TextureLoader,
  TorusGeometry
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
  rim: new TorusGeometry(1, 0.05, 8, 72),
  gate: new PlaneGeometry(2.45, 3.25),
  pool: new CircleGeometry(1.9, 48)
};

/* ---------------------------------------------------------------------- */
/* The stone frame: an arch of rough-hewn blocks on a dais                 */
/* ---------------------------------------------------------------------- */

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A box with its corners knocked about, so each block reads as cut stone. */
function roughBlock(w, h, d, rng) {
  const g = new BoxGeometry(w, h, d, 2, 2, 2);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const k = 0.06;
    p.setXYZ(i, p.getX(i) * (1 + (rng() - 0.5) * k * 2), p.getY(i) * (1 + (rng() - 0.5) * k * 2), p.getZ(i) * (1 + (rng() - 0.5) * k * 2));
  }
  return g.toNonIndexed();
}

export const PORTAL_FRAMES = { arch: 'Stone arch', gateway: 'Stone gateway', ring: 'Glowing ring' };

const frames = new Map();
/** Built once per style and shared by every portal: stone blocks + rune inlays. */
function portalFrame(style) {
  if (!frames.has(style)) frames.set(style, style === 'gateway' ? buildGateway() : style === 'ring' ? null : buildArch());
  return frames.get(style);
}

/** A dais with a step in front — both frames stand on one. */
function dais(rng, stones, width = 4.1) {
  const slab = roughBlock(width, 0.22, 1.6, rng);
  slab.translate(0, 0.11, 0);
  const step = roughBlock(width * 0.63, 0.12, 0.7, rng);
  step.translate(0, 0.06, 1.12);
  stones.push(slab, step);
}

function finish(stones, runes) {
  const built = { stone: mergeGeometries(stones), runes: mergeGeometries(runes) };
  built.stone.computeVertexNormals();
  return built;
}

/** Two standing-stone pillars and a heavy lintel: a gate rather than a ring. */
function buildGateway() {
  const rng = seeded(9127);
  const stones = [];
  const runes = [];
  for (const side of [-1, 1]) {
    // Three stacked drums per pillar, each a little offset, narrowing upward.
    let y = 0.22;
    for (let i = 0; i < 3; i++) {
      const h = 1.05 + rng() * 0.12;
      const w = 0.78 - i * 0.06;
      const block = roughBlock(w, h, w * 0.95, rng);
      block.rotateY((rng() - 0.5) * 0.1);
      block.translate(side * 1.62 + (rng() - 0.5) * 0.04, y + h / 2, (rng() - 0.5) * 0.04);
      stones.push(block);
      // A rune down the inner face of every drum, both sides of the gate.
      for (const face of [1, -1]) {
        const rune = new BoxGeometry(0.1, h * 0.55, 0.02);
        rune.translate(side * 1.62, y + h / 2, face * (w * 0.48 + 0.01));
        runes.push(rune.toNonIndexed());
      }
      y += h;
    }
  }
  // The lintel overhangs both pillars; a capstone sits on top.
  const lintel = roughBlock(4.3, 0.62, 0.95, rng);
  lintel.translate(0, 3.62, 0);
  const cap = roughBlock(2.2, 0.36, 0.7, rng);
  cap.translate(0, 4.1, 0);
  stones.push(lintel, cap);
  for (const face of [1, -1]) {
    const band = new BoxGeometry(2.6, 0.08, 0.02);
    band.translate(0, 3.62, face * 0.49);
    runes.push(band.toNonIndexed());
    const mark = new BoxGeometry(0.3, 0.3, 0.02);
    mark.rotateZ(Math.PI / 4);
    mark.translate(0, 4.1, face * 0.36);
    runes.push(mark.toNonIndexed());
  }
  dais(rng, stones, 4.6);
  return finish(stones, runes);
}

function buildArch() {
  const rng = seeded(7331);
  const stones = [];
  const runes = [];
  const cy = 1.78; // arch centre height
  const rx = 1.5;
  const ry = 2.08;
  const count = 15;
  for (let i = 0; i < count; i++) {
    // Along the arch from one foot (~-12°) over the top to the other (~192°).
    const t = i / (count - 1);
    const a = (-12 + t * 204) * (Math.PI / 180);
    const x = Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    const keystone = i === Math.floor(count / 2);
    const w = keystone ? 0.62 : 0.5 + rng() * 0.12;
    const h = keystone ? 0.7 : 0.46 + rng() * 0.1;
    const block = roughBlock(w, h, keystone ? 0.72 : 0.6 + rng() * 0.08, rng);
    // Each block follows the curve, with a little sag and wobble.
    const tangent = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx);
    block.rotateZ(tangent + Math.PI / 2 + (rng() - 0.5) * 0.12);
    block.rotateY((rng() - 0.5) * 0.12);
    block.translate(x, Math.max(y, 0.25), (rng() - 0.5) * 0.06);
    stones.push(block);
    // Runes on alternate blocks, both faces, set into the stone.
    if (i % 2 === 0 || keystone) {
      for (const side of [1, -1]) {
        const rune = new BoxGeometry(keystone ? 0.14 : 0.08, keystone ? 0.34 : 0.22, 0.02);
        rune.rotateZ(tangent + Math.PI / 2);
        rune.translate(x * 0.985, Math.max(y, 0.25), side * (keystone ? 0.37 : 0.315));
        runes.push(rune.toNonIndexed());
      }
    }
  }
  // Heavy foot stones each side, and a dais with a step in front.
  for (const side of [-1, 1]) {
    const foot = roughBlock(0.86, 0.7, 0.86, rng);
    foot.translate(side * 1.52, 0.35, 0);
    stones.push(foot);
  }
  dais(rng, stones);
  return finish(stones, runes);
}

const stoneMaterial = new MeshStandardMaterial({ color: '#a29d96', roughness: 0.95, metalness: 0, flatShading: true });
/* The keep's own masonry maps (public/textures/cathedral), so the gates match the ruins. */
{
  const loader = new TextureLoader();
  const load = (file, srgb) =>
    loader.load(`./textures/cathedral/${file}`, (texture) => {
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.anisotropy = 4;
      if (srgb) texture.colorSpace = SRGBColorSpace;
      stoneMaterial.needsUpdate = true;
    });
  stoneMaterial.map = load('color.jpg', true);
  stoneMaterial.normalMap = load('normal.jpg', false);
  stoneMaterial.roughnessMap = load('roughness.jpg', false);
  stoneMaterial.aoMap = null;
}

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
    // A thin glow where the vortex meets the stone.
    const rim = new Mesh(geometries.rim, new MeshBasicMaterial({ color: color.clone().multiplyScalar(2.2), toneMapped: false }));
    rim.scale.set(1.12, 1.58, 1);
    rim.position.y = 1.75;
    const pool = new Mesh(geometries.pool, new ShaderMaterial({ ...shared, fragmentShader: POOL }));
    pool.rotation.x = -Math.PI / 2;
    const style = PORTAL_FRAMES[data.frame] ? data.frame : 'arch';
    const built = portalFrame(style);
    // Rune inlays glow in the portal's colour, brighter as it opens.
    this.runeMaterial = new MeshBasicMaterial({ color: color.clone().multiplyScalar(2.5), toneMapped: false, transparent: true, opacity: 0 });
    if (built) {
      const stones = new Mesh(built.stone, stoneMaterial);
      stones.castShadow = true;
      stones.receiveShadow = true;
      this.group.add(stones, new Mesh(built.runes, this.runeMaterial));
      pool.position.y = 0.23;
      vortex.position.y = rim.position.y = 1.85;
    } else {
      pool.position.y = 0.04;
    }
    // The gateway's opening is a tall rectangle: stretch the vortex to fill it.
    if (style === 'gateway') vortex.geometry = geometries.gate;
    this.style = style;
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
    if (this.style === 'gateway') this.rim.scale.set(1.22 * ease, 1.62 * ease, 1);
    else this.rim.scale.set(1.12 * ease, 1.58 * ease, 1);
    this.rim.rotation.z = Math.sin(time * 0.8) * 0.04;
    this.runeMaterial.opacity = ease * (0.75 + 0.25 * Math.sin(time * 2.2 + this.data.x));
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  dispose() {
    this.group.removeFromParent();
    // The stone material and the frame geometry are shared; only per-portal materials go.
    this.group.traverse((node) => {
      if (node.material && node.material !== stoneMaterial) node.material.dispose();
    });
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
