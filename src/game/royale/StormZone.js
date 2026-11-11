import { AdditiveBlending, CylinderGeometry, DoubleSide, Group, Mesh, RingGeometry, ShaderMaterial } from 'three';
import { getColor } from '../../utils/color.js';

/**
 * What the storm looks like: a wall of violet light around the safe circle,
 * with streaks drifting up it, and a thin white ring on the ground where the
 * next circle will be. Sized every frame from storm.js's circle.
 */

const WALL_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const WALL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uPulse;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    // Bright at the ground, thinning upward; streaks drifting up and around.
    float h = vUv.y;
    float base = pow(1.0 - h, 1.4);
    float a = atan(vWorld.z, vWorld.x);
    float streaks = 0.5 + 0.5 * sin(a * 40.0 + h * 9.0 - uTime * 2.2) * sin(a * 13.0 - uTime * 0.8);
    float band = smoothstep(0.0, 0.04, h) * (1.0 - smoothstep(0.9, 1.0, h));
    float alpha = (0.1 + 0.36 * base) * (0.55 + 0.45 * streaks) * band * (0.85 + 0.15 * uPulse);
    gl_FragColor = vec4(uColor * (1.1 + base), alpha);
  }
`;

const RING_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    float a = atan(vWorld.z, vWorld.x);
    float dash = step(0.5, fract(a * 18.0 - uTime * 0.4));
    gl_FragColor = vec4(uColor, 0.75 * dash);
  }
`;

export class StormZone {
  constructor(scene, color = '#7b5cff') {
    this.group = new Group();
    this.group.name = 'storm';
    this.uniforms = { uColor: { value: getColor(color).clone() }, uTime: { value: 0 }, uPulse: { value: 0 } };
    this.wall = new Mesh(
      new CylinderGeometry(1, 1, 1, 96, 1, true).translate(0, 0.5, 0),
      new ShaderMaterial({ uniforms: this.uniforms, vertexShader: WALL_VERTEX, fragmentShader: WALL_FRAGMENT, transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending })
    );
    this.wall.renderOrder = 4;
    this.ring = new Mesh(
      new RingGeometry(0.985, 1, 128).rotateX(-Math.PI / 2),
      new ShaderMaterial({ uniforms: { uColor: { value: getColor('#ffffff') }, uTime: this.uniforms.uTime }, vertexShader: WALL_VERTEX, fragmentShader: RING_FRAGMENT, transparent: true, depthWrite: false })
    );
    this.ring.renderOrder = 4;
    this.group.add(this.wall, this.ring);
    this.group.visible = false;
    scene.add(this.group);
  }

  /** @param {{ x, z, radius, next: { x, z, radius }, closing: boolean }} circle */
  update(circle, elapsed) {
    this.group.visible = true;
    this.uniforms.uTime.value = elapsed;
    this.uniforms.uPulse.value = circle.closing ? 0.5 + 0.5 * Math.sin(elapsed * 6) : 0;
    this.wall.position.set(circle.x, 0, circle.z);
    this.wall.scale.set(circle.radius, 14, circle.radius);
    const next = circle.next;
    const show = next && next.radius < circle.radius - 0.2;
    this.ring.visible = Boolean(show);
    if (show) {
      this.ring.position.set(next.x, 0.06, next.z);
      this.ring.scale.set(next.radius, 1, next.radius);
    }
  }

  hide() {
    this.group.visible = false;
  }

  dispose() {
    this.group.removeFromParent();
    this.wall.geometry.dispose();
    this.wall.material.dispose();
    this.ring.geometry.dispose();
    this.ring.material.dispose();
  }
}
