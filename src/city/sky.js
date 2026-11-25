import * as THREE from 'three';

/**
 * Seoul's light (knowledge/seoul-buildings.md §5, render-quality.md): a sky
 * that is deep blue overhead and pale at the horizon with a glow round the
 * sun (warm and wide at golden hour and dusk), and the sun's shadows in a
 * tight box that follows the camera, snapped to its texels so they don't
 * shimmer as you ride.
 */

/** A sky dome round the camera: zenith, horizon, the sun's glow. Uses the city's uSkyTop/uSkyLow. */
export function skyDome(uniforms) {
  const u = { uTop: uniforms.uSkyTop, uLow: uniforms.uSkyLow, uNight: uniforms.uNight, uSunDir: { value: new THREE.Vector3(0.5, 0.5, 0.2) }, uSunCol: { value: new THREE.Color('#ffffff') }, uDusk: { value: 0 }, uZenith: { value: new THREE.Color('#2a64c8') } };
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    vertexShader: 'varying vec3 vDir;\nvoid main() {\n  vDir = position;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}',
    fragmentShader: `uniform vec3 uTop; uniform vec3 uLow; uniform float uNight; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uDusk; uniform vec3 uZenith;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        float s = max(0.0, dot(d, normalize(uSunDir)));
        // Overhead deeper than the reflection colour; a pale band at the horizon (haze); warm on the sun's side at dusk.
        vec3 top = mix(uTop, uZenith, 0.6 * (1.0 - smoothstep(0.7, 1.0, uNight)));
        vec3 col = mix(uLow, top, pow(h, 0.45));
        col = mix(col, uSunCol * 1.05, uDusk * pow(s, 3.0) * (1.0 - h) * 0.85);
        col += uSunCol * (pow(s, 12.0) * 0.18 + pow(s, 900.0) * 3.0) * (1.0 - uNight);
        col = d.y < 0.0 ? uLow * 0.95 : col;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), m);
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  dome.userData.u = u;
  return dome;
}

/**
 * A light colour grade after tone mapping: a touch more saturation and contrast than AgX's flat
 * film look, warm highlights and cool shadows (render-quality.md §2.8).
 */
export const GradeShader = {
  name: 'SeoulGrade',
  uniforms: { tDiffuse: { value: null }, uSat: { value: 1.18 }, uContrast: { value: 1.08 }, uSplit: { value: 0.04 }, uLift: { value: 0 } },
  vertexShader: 'varying vec2 vUv;\nvoid main() {\n  vUv = uv;\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n}',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat; uniform float uContrast; uniform float uSplit; uniform float uLift;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 col = mix(vec3(l), c.rgb, uSat);
      col = (col - 0.5) * uContrast + 0.5;
      col += mix(vec3(-0.3, 0.0, 0.5), vec3(0.5, 0.15, -0.35), smoothstep(0.2, 0.8, l)) * uSplit;
      // (at night) the darks lifted to a deep blue, so shapes read in the shadows
      col += vec3(0.55, 0.65, 1.0) * uLift * (1.0 - smoothstep(0.0, 0.45, l));
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
    }`
};

const UP = new THREE.Vector3(0, 1, 0);
const right = new THREE.Vector3();
const up = new THREE.Vector3();

/** Point the sun's shadow box at `at` (the camera), its centre snapped to whole shadow texels. */
export function followSun(sun, sunDir, at, box) {
  const cam = sun.shadow.camera;
  if (cam.right !== box) {
    cam.left = cam.bottom = -box;
    cam.right = cam.top = box;
    cam.near = 1;
    cam.far = 2000;
    cam.updateProjectionMatrix();
  }
  const texel = (2 * box) / sun.shadow.mapSize.x;
  right.crossVectors(sunDir, UP).normalize();
  up.crossVectors(right, sunDir).normalize();
  const a = at.dot(right);
  const b = at.dot(up);
  const t = sun.target.position.copy(at).addScaledVector(right, Math.round(a / texel) * texel - a).addScaledVector(up, Math.round(b / texel) * texel - b);
  sun.position.copy(t).addScaledVector(sunDir, 900);
  sun.target.updateMatrixWorld();
}
