/**
 * The air of each floor: one batch of particles that moves to whichever
 * floor the camera is on and changes with its theme — falling petals in
 * the meadow, sand swirls in the desert, glowing spores in the mushroom
 * grove, snow on the peaks, sparkles in the clouds, sea spray at the
 * harbor, twinkles on the moon, sparkling moon dust on the Moon's bases, red dust motes on Mars. All the motion is in the shader.
 */
import * as THREE from 'three';

const MODES = {
  petals: { color: '#ffb3c8', size: 7, mode: 0, glow: 0 },
  sand: { color: '#f6d08a', size: 4, mode: 1, glow: 0 },
  spores: { color: '#b8ffea', size: 6, mode: 2, glow: 1 },
  snow: { color: '#ffffff', size: 6, mode: 0, glow: 0 },
  sparkles: { color: '#fff3b0', size: 6, mode: 3, glow: 1 },
  spray: { color: '#e6fbff', size: 4, mode: 2, glow: 0 },
  twinkles: { color: '#bfe3ff', size: 5, mode: 3, glow: 1 },
  /** The Moon: fine dust sparkling in the sunlight, hanging low over the decks. */
  moondust: { color: '#eef2ff', size: 3.5, mode: 3, glow: 1 },
  /** Mars: fine red dust motes drifting sideways on the breeze, low over the terraces. */
  reddust: { color: '#e9a27a', size: 4, mode: 1, glow: 0 }
};

export function buildParticles(n = 900) {
  const g = new THREE.BufferGeometry();
  const base = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    base.set([Math.random(), Math.random(), Math.random()], i * 3);
    seed[i] = Math.random() * 100;
  }
  g.setAttribute('position', new THREE.BufferAttribute(base, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const uniforms = {
    uTime: { value: 0 }, uMode: { value: 0 }, uColor: { value: new THREE.Color('#ffffff') }, uSize: { value: 6 }, uGlow: { value: 0 },
    uMin: { value: new THREE.Vector3() }, uSpan: { value: new THREE.Vector3(1, 1, 1) }
  };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: /* glsl */ `
      attribute float seed; uniform float uTime; uniform float uMode; uniform float uSize; uniform vec3 uMin; uniform vec3 uSpan; varying float vA;
      void main() {
        vec3 p = position;
        float t = uTime + seed;
        if (uMode < 0.5) { p.y = fract(p.y - t * 0.05); p.x += sin(t * 0.9) * 0.02; p.z += cos(t * 0.7) * 0.02; }
        else if (uMode < 1.5) { p.x = fract(p.x + t * 0.04); p.y = p.y * 0.25 + sin(t * 2.0 + p.x * 20.0) * 0.03; }
        else if (uMode < 2.5) { p.y = fract(p.y + t * 0.03); p.x += sin(t) * 0.01; }
        else { p.y = p.y * 0.8 + sin(t * 0.5) * 0.01; }
        vec3 w = uMin + p * uSpan;
        vec4 mv = modelViewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = uMode > 2.5 ? 0.35 + 0.65 * pow(0.5 + 0.5 * sin(t * 3.0), 3.0) : 0.85;
        gl_PointSize = uSize * 12.0 / -mv.z;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uGlow; varying float vA;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, d);
        gl_FragColor = vec4(uColor * (1.0 + uGlow * 0.6), a * vA); }`
  });
  const points = new THREE.Points(g, material);
  points.frustumCulled = false;
  points.userData = {
    setFloor(f, look) {
      const m = MODES[look.particles] ?? MODES.petals;
      uniforms.uMode.value = m.mode;
      uniforms.uColor.value.set(m.color);
      uniforms.uSize.value = m.size;
      uniforms.uGlow.value = m.glow;
      uniforms.uMin.value.set(f.cx - f.rx, f.y + 0.2, f.cz - 10);
      uniforms.uSpan.value.set(f.rx * 2, look.particles === 'snow' || look.particles === 'petals' ? 22 : 8, f.rz + 14);
      material.blending = m.glow ? THREE.AdditiveBlending : THREE.NormalBlending;
    },
    update(dt) {
      uniforms.uTime.value += dt;
    }
  };
  return points;
}
