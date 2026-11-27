import * as THREE from 'three';

/**
 * The fountain in front of Admiral Yi on Gwanghwamun Square — our own take on it: a long shallow pool on
 * the square's centre line, a field of thin vertical jets down its middle and a taller row along each
 * edge, rising and falling in waves; after dark lit from below in slowly shifting cyan, blue and teal
 * (pink on one edge row), the wet stone glowing, a strip of small coloured lights set in the paving along
 * both sides. By day the same jets run as plain water.
 *
 * Cheap: every jet one instance of a thin open cone drawn additively by a small shader (no particles),
 * every nozzle's glow and every floor light an instance too; the instances' heights and colours are set
 * a few times a second only when the camera is near.
 */

/** The pool's size (m) and its jets: rows along it, columns across the middle field, the edge rows apart. */
export const FOUNTAIN = { length: 42, width: 9, rows: 15, cols: 5, edge: 3.9 };

/** A jet's height (m) at time `t` (s): waves running down the pool; the edge rows taller and slower. */
export function jetHeight(row, col, t, { edge = false } = {}) {
  if (edge) return 2.6 + 2.4 * (0.5 + 0.5 * Math.sin(t * 0.9 - row * 0.55));
  const wave = 0.5 + 0.5 * Math.sin(t * 1.6 - row * 0.7 + Math.cos(col * 1.3) * 0.8);
  return 0.6 + 2.6 * wave * wave;
}

/** A jet's colour after dark (r, g, b 0…1): cyan to blue to teal over a minute or so, the right edge row pink. */
export function jetColor(row, col, t, { edge = 0 } = {}, out = new THREE.Color()) {
  if (edge > 0) return out.setHSL(0.9 + 0.03 * Math.sin(t * 0.2 + row * 0.3), 0.85, 0.62);
  const h = 0.5 + 0.08 * Math.sin(t * 0.11 + row * 0.18) + (edge < 0 ? -0.04 : 0);
  return out.setHSL(h, 0.9, 0.55 + 0.1 * Math.sin(t * 0.7 + col));
}

const jetVert = `
  varying float vUp;
  varying vec3 vColor;
  void main() {
    vUp = position.y;
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }`;
const jetFrag = `
  uniform float uBright;
  varying float vUp;
  varying vec3 vColor;
  void main() {
    // a column of water: bright at the nozzle, thinning and fading to the top, a little spray there
    float a = pow(1.0 - vUp, 0.7) * 0.75 + smoothstep(0.82, 1.0, vUp) * 0.25;
    gl_FragColor = vec4(vColor * uBright * a, 1.0);
  }`;

export class Fountain {
  /** @param {THREE.Group} parent  the statues' group; the pool's middle at (x, z) in it, running along z */
  constructor(parent, { x = 0, z = 0 } = {}) {
    const F = FOUNTAIN;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    parent.add(this.group);
    // the pool: dark wet stone, a rim of granite
    this.water = new THREE.MeshPhongMaterial({ color: '#12202c', specular: '#9fc6e0', shininess: 90, emissive: '#1a4f7a', emissiveIntensity: 0 });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(F.width, F.length), this.water);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.06;
    pool.receiveShadow = true;
    const rimMat = new THREE.MeshLambertMaterial({ color: '#bdb6a8' });
    for (const sx of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, F.length + 0.5), rimMat);
      rim.position.set((sx * (F.width + 0.5)) / 2, 0.06, 0);
      this.group.add(rim);
    }
    this.group.add(pool);
    // the jets: the middle field, then the two edge rows
    this.jets = [];
    for (let r = 0; r < F.rows; r++) {
      const zz = -F.length / 2 + 1.5 + (r * (F.length - 3)) / (F.rows - 1);
      for (let c = 0; c < F.cols; c++) this.jets.push({ r, c, x: -2 + c, z: zz, edge: 0 });
      this.jets.push({ r, c: -1, x: -F.edge, z: zz, edge: -1 });
      this.jets.push({ r, c: 9, x: F.edge, z: zz, edge: 1 });
    }
    const cone = new THREE.CylinderGeometry(0.05, 0.16, 1, 6, 1, true);
    cone.translate(0, 0.5, 0);
    this.jetMat = new THREE.ShaderMaterial({ uniforms: { uBright: { value: 0.5 } }, vertexShader: jetVert, fragmentShader: jetFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.jetMesh = new THREE.InstancedMesh(cone, this.jetMat, this.jets.length);
    this.jetMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.jets.length * 3), 3);
    this.jetMesh.frustumCulled = false;
    // the nozzles' glow on the water, and the floor lights along both sides
    this.glowMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.glow = new THREE.InstancedMesh(new THREE.CircleGeometry(0.6, 12).rotateX(-Math.PI / 2), this.glowMat, this.jets.length);
    this.glow.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.jets.length * 3), 3);
    this.glow.frustumCulled = false;
    const leds = [];
    for (const sx of [-1, 1]) for (let k = 0; k <= Math.floor(F.length / 0.9); k++) leds.push([(sx * (F.width / 2 + 1.1)), -F.length / 2 + k * 0.9, k]);
    this.ledMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.05, 0.22), this.ledMat, leds.length);
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    const LED = ['#3cff6e', '#ff3b4f', '#ffffff', '#3cff6e', '#ff3b4f'];
    leds.forEach(([lx, lz, k], i) => {
      m.makeTranslation(lx, 0.03, lz);
      this.leds.setMatrixAt(i, m);
      this.leds.setColorAt(i, col.set(LED[k % LED.length]));
    });
    this.ledMat.color.setScalar(0.25);
    this.group.add(this.jetMesh, this.glow, this.leds);
    this._m = new THREE.Matrix4();
    this._c = new THREE.Color();
    this._next = 0;
    this.update(0, 0, 0);
  }

  /** Each frame: `t` seconds, `night` 0…1, `d` the camera's distance (m) — set a few times a second, near. */
  update(t, night = 0, d = 0) {
    this.group.visible = d < 900;
    if (!this.group.visible || t < this._next) return;
    this._next = t + 1 / 20;
    const m = this._m;
    const c = this._c;
    this.jets.forEach((j, i) => {
      const h = jetHeight(j.r, j.c, t, { edge: j.edge !== 0 });
      m.makeScale(1, h, 1).setPosition(j.x, 0.06, j.z);
      this.jetMesh.setMatrixAt(i, m);
      // by day plain water, after dark coloured light
      if (night > 0.02) jetColor(j.r, j.c, t, { edge: j.edge }, c).lerp(this._white ??= new THREE.Color('#dff4ff'), 1 - night);
      else c.set('#dff4ff');
      this.jetMesh.setColorAt(i, c);
      m.makeTranslation(j.x, 0.08, j.z);
      this.glow.setMatrixAt(i, m);
      this.glow.setColorAt(i, c.multiplyScalar(night));
    });
    this.jetMesh.instanceMatrix.needsUpdate = true;
    this.jetMesh.instanceColor.needsUpdate = true;
    this.glow.instanceMatrix.needsUpdate = true;
    this.glow.instanceColor.needsUpdate = true;
    this.jetMat.uniforms.uBright.value = 0.35 + 2.2 * night;
    this.ledMat.color.setScalar(0.25 + 1.4 * night);
    this.water.emissiveIntensity = 0.9 * night;
    this.water.emissive.setHSL(0.55 + 0.05 * Math.sin(t * 0.11), 0.8, 0.35);
  }
}
