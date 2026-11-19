/**
 * The gorge's weather: hazy sun most of the time, with gentle showers that
 * blow through every few minutes (a fixed cycle, so it is the same for
 * everyone and the tests can read it), and the rain itself — streaks drawn
 * on the GPU round the camera in the wet pass, after Homescape's rain: one
 * instanced quad per drop, all motion in the shader, none under a roof (a
 * top-down depth of the tent, the tarp and the arches is baked once and
 * each drop below it is dropped), fading softly against the ground.
 */
import * as THREE from 'three';
import { wet } from './post.js';
import { shared } from '../gloamreach/materials.js';
import { EXTENT } from './map.js';

export { CYCLE, CYCLE_LEN, rainAt } from './rules.js';

const RAIN_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform vec3 uCam;
uniform vec2 uWind;
uniform float uBox;
uniform float uAmount;
uniform sampler2D tRoof;
uniform vec4 uRoofBox;
uniform sampler2D tHeight;
uniform vec4 uExt;
varying float vA;
varying vec2 vUv;
varying float vViewZ;
void main() {
  vUv = uv;
  float fall = 10.0;
  float H = 26.0;
  // Each drop's column, wrapped round the camera.
  vec2 col = (aSeed.xy - 0.5) * uBox;
  vec2 base = floor((uCam.xz - col) / uBox + 0.5) * uBox + col;
  float t = fract(aSeed.z - uTime * fall / H);
  vec3 p = vec3(base.x, uCam.y - 8.0 + t * H, base.y);
  p.xz += uWind * (1.0 - t) * 3.0;
  // Thin by the amount of rain; none below the ground or under a roof.
  float keep = step(aSeed.w, uAmount);
  float ground = texture2D(tHeight, (p.xz - uExt.xy) / uExt.zw).r;
  vec2 ruv = (p.xz - uRoofBox.xy) / uRoofBox.zw;
  float rr = (ruv.x > 0.0 && ruv.x < 1.0 && ruv.y > 0.0 && ruv.y < 1.0) ? texture2D(tRoof, ruv).r : 0.0;
  float underRoof = rr > 1.0 && p.y < rr - 1000.0 ? 1.0 : 0.0;
  keep *= step(ground, p.y) * (1.0 - underRoof);
  vA = keep * smoothstep(0.0, 0.08, t) * 0.55;
  // A streak along the fall, facing the eye.
  vec3 dir = normalize(vec3(uWind.x * 0.3, -1.0, uWind.y * 0.3));
  vec3 toEye = normalize(cameraPosition - p);
  vec3 side = normalize(cross(dir, toEye));
  vec3 q = p + side * (uv.x - 0.5) * 0.018 + dir * (uv.y - 0.5) * 0.55;
  vec4 mv = viewMatrix * vec4(q, 1.0);
  vViewZ = -mv.z;
  vA *= smoothstep(0.6, 2.0, vViewZ);
  gl_Position = projectionMatrix * mv;
}`;

const RAIN_FRAG = /* glsl */ `
uniform sampler2D tDepthLin;
uniform vec2 uScreen;
uniform vec3 uLight;
varying float vA;
varying vec2 vUv;
varying float vViewZ;
void main() {
  if (vA < 0.003) discard;
  float sceneZ = texture2D(tDepthLin, gl_FragCoord.xy / uScreen).r;
  float a = vA * smoothstep(0.0, 0.4, sceneZ - vViewZ) * (1.0 - abs(vUv.x - 0.5) * 2.0);
  gl_FragColor = vec4(uLight, a);
}`;

export class Rain {
  constructor({ count = 10000, heightTex, roofs = [], renderer }) {
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    let r = 11;
    const rnd = () => ((r = (r * 16807) % 2147483647) - 1) / 2147483646;
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i++) seeds[i] = rnd();
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    g.instanceCount = count;
    this.roof = this._bakeRoofs(renderer, roofs);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.uTime,
        uCam: { value: new THREE.Vector3() },
        uWind: { value: new THREE.Vector2(0.6, 0.3) },
        uBox: { value: 28 },
        uAmount: { value: 0 },
        tRoof: { value: this.roof.texture },
        uRoofBox: { value: this.roof.box },
        tHeight: { value: heightTex },
        uExt: { value: new THREE.Vector4(EXTENT.x0, EXTENT.z0, EXTENT.x1 - EXTENT.x0, EXTENT.z1 - EXTENT.z0) },
        tDepthLin: wet.tDepthLin,
        uScreen: wet.uScreen,
        uLight: { value: new THREE.Color(0.75, 0.8, 0.82) }
      },
      vertexShader: RAIN_VERT,
      fragmentShader: RAIN_FRAG,
      transparent: true,
      depthWrite: false
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    this.mesh.layers.set(1);
    this.count = count;
  }

  /** The roofs' heights, seen from above, once (a float texture over their bounding box). */
  _bakeRoofs(renderer, roofs) {
    const box = new THREE.Box3();
    for (const o of roofs) box.expandByObject(o);
    if (box.isEmpty()) box.set(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));
    box.expandByScalar(1);
    const S = 256;
    const W = box.max.x - box.min.x;
    const D = box.max.z - box.min.z;
    const target = new THREE.WebGLRenderTarget(S, S, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: true });
    const cam = new THREE.OrthographicCamera(-W / 2, W / 2, D / 2, -D / 2, 0.1, 500);
    cam.position.set((box.min.x + box.max.x) / 2, box.max.y + 50, (box.min.z + box.max.z) / 2);
    cam.up.set(0, 0, -1);
    cam.lookAt(cam.position.x, 0, cam.position.z);
    const scene = new THREE.Scene();
    const mat = new THREE.ShaderMaterial({
      vertexShader: 'varying float vY; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'varying float vY; void main(){ gl_FragColor = vec4(vY + 1000.0, 0.0, 0.0, 1.0); }',
      side: THREE.DoubleSide
    });
    for (const o of roofs) {
      o.updateMatrixWorld(true);
      o.traverse((m) => {
        if (!m.isMesh) return;
        const c = new THREE.Mesh(m.geometry, mat);
        c.matrixAutoUpdate = false;
        c.matrix.copy(m.matrixWorld);
        scene.add(c);
      });
    }
    const prev = renderer.getRenderTarget();
    const clear = renderer.getClearColor(new THREE.Color());
    const alpha = renderer.getClearAlpha();
    renderer.setRenderTarget(target);
    renderer.setClearColor(new THREE.Color(0, 0, 0), 1);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.setRenderTarget(prev);
    renderer.setClearColor(clear, alpha);
    mat.dispose();
    // u along +x, v along +z (the camera looks down with −z up, so flip v when sampling: the texture's v runs toward −z).
    return { texture: target.texture, target, box: new THREE.Vector4(box.min.x, box.max.z, W, -D) };
  }

  update(camera, amount, lightColor) {
    const u = this.mat.uniforms;
    u.uCam.value.copy(camera.position);
    u.uAmount.value = amount;
    if (lightColor) u.uLight.value.copy(lightColor).multiplyScalar(0.55).addScalar(0.2);
    this.mesh.visible = amount > 0.01;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.roof.target.dispose();
  }
}
