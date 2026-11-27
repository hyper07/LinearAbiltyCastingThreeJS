import * as THREE from 'three';

/**
 * The fountain in front of Admiral Yi on Gwanghwamun Square — our own take on it, a floor fountain you can
 * ride through: a field of jets down the square's middle in front of his plinth, a row of tall jets along
 * each side (the racing lane runs through the west row's spray), the wet stone between them glistening, a
 * strip of small green, red and white lights set in the paving along both rows.
 *
 * A show, not a loop: the jets run a programme of patterns one after another (`SHOW`) — a wave rolling down
 * the field, a sweep side to side, rings opening from the middle, a chequer chasing, the whole field
 * pulsing with the tall rows, and a tall burst from the centre — each cross-faded into the next, the tall
 * rows answering the field. Every jet throws droplets off its crown and splashes where it falls.
 *   by day:   sunlit water — white, half see-through, glints running up the columns, the floor shining;
 *   at night: lit from below — the field cyan and blue (pink flecks when it chases), the west row teal, the
 *             east row pink, the floor glowing with them, the admiral lit softly from below (skyline.js).
 *
 * Cheap: every jet is one instance of a thin open cone (one draw), every droplet a point (one draw), every
 * splash a disc (one draw), all drawn by small shaders; the instances' heights and colours are set each
 * frame only when the camera is near (a few times a second further off), and nothing within 900 m.
 *
 * Ride (or swing the camera) through a tall jet and the spray beads on the lens: `spray` (0…1), read by the
 * skyline for a light mist over the picture.
 */

/** The fountain's layout (m, in the statue group's frame: x across, z down the square, south) and its show's pace. */
export const FOUNTAIN = {
  field: { cols: 7, rows: 16, dx: 1.3, z0: 15, z1: 55 },
  edge: { x: 10.5, rows: 18, z0: 12, z1: 58 },
  burst: { z: 35 },
  floor: { width: 25, z0: 8, z1: 62 },
  // seconds a pattern runs, and the cross-fade into the next
  step: 10,
  blend: 1.6
};

/** The show's patterns, in order. */
export const SHOW = ['wave', 'sweep', 'rings', 'chase', 'pulse', 'burst'];

const S = (x) => 0.5 + 0.5 * Math.sin(x);
const smooth = (u) => u * u * (3 - 2 * u);

/**
 * The show at time `t` (s): the pattern now (`a`), the next (`b`), and how far it has faded into the next (0…1).
 */
export function showAt(t) {
  const k = Math.floor(t / FOUNTAIN.step);
  const into = t - k * FOUNTAIN.step;
  const fade = into > FOUNTAIN.step - FOUNTAIN.blend ? smooth((into - (FOUNTAIN.step - FOUNTAIN.blend)) / FOUNTAIN.blend) : 0;
  return { a: SHOW[((k % SHOW.length) + SHOW.length) % SHOW.length], b: SHOW[(((k + 1) % SHOW.length) + SHOW.length) % SHOW.length], fade };
}

/**
 * One jet's height (m) in one pattern at `t`: `jet` { kind: 'field' | 'edge' | 'burst', u (−0.5 … 0.5 across),
 * v (0 at the statue … 1 down the square), side (−1 west, 1 east, edges), r, c (row, column) }.
 */
export function patternHeight(p, jet, t) {
  const { kind, u = 0, v = 0, side = 0, r = 0, c = 0 } = jet;
  if (kind === 'burst') return p === 'burst' ? 3 + 9.5 * S(t * 1.7) ** 2 : 0;
  if (kind === 'edge') {
    switch (p) {
      case 'wave': return 2 + 6 * S(t * 1.2 - v * 4) ** 2;
      case 'sweep': return 2 + 6 * S(t * 1.1 + side * 1.57);
      case 'rings': {
        // (a hump of tall jets running down each row and round again: its distance taken round the loop, no jump)
        const dv = v - ((t * 0.32) % 1);
        return 1.5 + 7 * Math.exp(-(((dv - Math.round(dv)) * 6) ** 2));
      }
      case 'chase': return 2 + 3.5 * S(t * 5 + r * Math.PI);
      case 'pulse': return 2 + 6.5 * S(t * 3) ** 3;
      default: return 1.6 + 0.8 * S(t * 2 + r);
    }
  }
  const d = Math.hypot(u * 1.4, (v - 0.5) * 1.8);
  switch (p) {
    case 'wave': return 0.5 + 3.2 * S(t * 2.2 - v * 7) ** 2;
    case 'sweep': return 0.4 + 3.6 * Math.exp(-(((u - 0.62 * Math.sin(t * 1.1)) * 4) ** 2));
    case 'rings': return 0.4 + 3.2 * S(t * 3 - d * 12) ** 2;
    case 'chase': return 0.5 + 2.7 * S(t * 5 + (r + c) * Math.PI);
    case 'pulse': return 0.4 + 3.4 * S(t * 3) ** 3 * (1 - 0.3 * Math.abs(u));
    default: return 0.5 + 1.2 * S(t * 4 - d * 10);
  }
}

/** A jet's height (m) at `t`, the show's patterns cross-faded. */
export function jetHeight(jet, t) {
  const { a, b, fade } = showAt(t);
  const h = patternHeight(a, jet, t);
  return fade > 0 ? h + (patternHeight(b, jet, t) - h) * fade : h;
}

/**
 * A jet's colour after dark (r, g, b 0…1): the field cyan to blue (pink flecks when the chequer chases),
 * the west row teal, the east row pink, the centre burst white-cyan.
 */
export function jetColor(jet, t, out = new THREE.Color()) {
  const { kind, v = 0, side = 0, r = 0, c = 0 } = jet;
  if (kind === 'burst') return out.setHSL(0.52, 0.6, 0.78);
  if (kind === 'edge') return side > 0 ? out.setHSL(0.9 + 0.03 * Math.sin(t * 0.4 + r * 0.3), 0.85, 0.62) : out.setHSL(0.44 + 0.03 * Math.sin(t * 0.3 + r * 0.25), 0.85, 0.55);
  const { a } = showAt(t);
  if (a === 'chase' && (r + c) % 2) return out.setHSL(0.92, 0.8, 0.62);
  return out.setHSL(0.5 + 0.08 * S(t * 0.35 + v * 3) + (a === 'rings' ? 0.03 : 0), 0.9, 0.55 + 0.08 * Math.sin(t * 0.7 + c));
}

/** Every jet of the fountain, with where it stands (x, z in the statue group's frame). */
export function fountainJets() {
  const { field: f, edge: e, burst } = FOUNTAIN;
  const jets = [];
  for (let r = 0; r < f.rows; r++) {
    const v = r / (f.rows - 1);
    for (let c = 0; c < f.cols; c++) jets.push({ kind: 'field', r, c, u: c / (f.cols - 1) - 0.5, v, x: (c - (f.cols - 1) / 2) * f.dx, z: f.z0 + v * (f.z1 - f.z0) });
  }
  for (let r = 0; r < e.rows; r++) {
    const v = r / (e.rows - 1);
    for (const side of [-1, 1]) jets.push({ kind: 'edge', r, side, v, x: side * e.x, z: e.z0 + v * (e.z1 - e.z0) });
  }
  jets.push({ kind: 'burst', x: 0, z: burst.z, v: 0.5 });
  return jets;
}

const jetVert = /* glsl */ `
  attribute float aSeed;
  varying float vUp;
  varying float vSeed;
  varying vec3 vColor;
  void main() {
    vUp = position.y;
    vSeed = aSeed;
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }`;
// (blended ONE, ONE_MINUS_SRC_ALPHA: by day a half see-through white over what is behind; at night alpha 0 — light added)
const jetFrag = /* glsl */ `
  uniform float uTime;
  uniform float uNight;
  uniform float uBright;
  varying float vUp;
  varying float vSeed;
  varying vec3 vColor;
  void main() {
    // a column of water: full at the nozzle, thinning to the top, breaking into a crown of spray there
    float body = pow(1.0 - vUp, 0.6);
    float crown = smoothstep(0.72, 1.0, vUp) * (1.0 - smoothstep(0.97, 1.0, vUp));
    // the water running up it, beading and breaking
    float streak = 0.72 + 0.28 * sin(vUp * 38.0 - uTime * 16.0 + vSeed * 20.0);
    float a = clamp((body * 0.62 + crown * 0.45) * streak, 0.0, 1.0);
    // by day, glints of sun running up the columns
    float g = fract(sin(floor(vUp * 26.0 - uTime * 9.0) * 12.9898 + vSeed * 78.233) * 43758.5453);
    float spark = step(0.94, g) * (1.0 - uNight) * (0.6 + 0.4 * body);
    vec3 col = vColor * uBright * a + vec3(spark * 1.4);
    gl_FragColor = vec4(col, a * (1.0 - uNight) * 0.8);
  }`;

const dropVert = /* glsl */ `
  attribute vec3 aBase;
  attribute float aH;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uScale;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    // thrown off the crown, falling back in a parabola, a little outward, every one on its own beat
    float p = fract(uTime * (0.55 + 0.35 * fract(aSeed * 7.13)) + aSeed);
    float ang = aSeed * 6.2832 * 3.0;
    float spread = (0.25 + 0.2 * aH * 0.12) * p * (0.6 + 0.8 * fract(aSeed * 3.7));
    vec3 pos = aBase + vec3(cos(ang) * spread, aH * (1.0 - p * p) + 0.05, sin(ang) * spread);
    vColor = aColor;
    vFade = (1.0 - p) * step(0.6, aH);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uScale * (0.05 + 0.03 * fract(aSeed * 11.0)) / max(0.5, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const dropFrag = /* glsl */ `
  uniform float uNight;
  uniform float uBright;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.15, length(q)) * vFade;
    gl_FragColor = vec4(vColor * uBright * a, a * (1.0 - uNight) * 0.7);
  }`;

const splashVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    vUv = uv;
    #ifdef USE_INSTANCING_COLOR
      vColor = instanceColor;
    #else
      vColor = vec3(1.0);
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }`;
const splashFrag = /* glsl */ `
  uniform float uTime;
  uniform float uNight;
  uniform float uBright;
  varying vec2 vUv;
  varying vec3 vColor;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    // foam where it falls, a ring of ripple running out
    float foam = smoothstep(1.0, 0.2, d) * 0.55 + smoothstep(0.12, 0.0, abs(d - fract(uTime * 1.3))) * 0.35 * (1.0 - d);
    float a = clamp(foam, 0.0, 1.0);
    gl_FragColor = vec4(vColor * uBright * a, a * (1.0 - uNight) * 0.6);
  }`;

const BLEND = { blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, transparent: true, depthWrite: false };

/** Ripples on the wet floor, as a normal map (a few rings and a little noise), repeating. */
function rippleNormals() {
  if (typeof document === 'undefined') return null;
  const n = 128;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d');
  const img = x.createImageData(n, n);
  const h = (i, j) => {
    let v = 0;
    for (const [cx, cy, f] of [[30, 40, 0.5], [90, 20, 0.7], [70, 95, 0.45], [15, 110, 0.6]]) {
      const dx = Math.min(Math.abs(i - cx), n - Math.abs(i - cx));
      const dy = Math.min(Math.abs(j - cy), n - Math.abs(j - cy));
      v += Math.sin(Math.hypot(dx, dy) * f) * Math.exp(-Math.hypot(dx, dy) / 40);
    }
    return v;
  };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const dx = h((i + 1) % n, j) - h((i + n - 1) % n, j);
      const dy = h(i, (j + 1) % n) - h(i, (j + n - 1) % n);
      const k = (j * n + i) * 4;
      img.data[k] = 128 + dx * 40;
      img.data[k + 1] = 128 + dy * 40;
      img.data[k + 2] = 255;
      img.data[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 9);
  return t;
}

export class Fountain {
  /**
   * @param {THREE.Group} parent  the statues' group (its origin the admiral's plinth, the square running down +z)
   * `y(x, z)`: the paving's height at a point of the group's frame over its origin's (the square slopes a little)
   */
  constructor(parent, { x = 0, z = 0, y = () => 0 } = {}) {
    const F = FOUNTAIN;
    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    parent.add(this.group);
    const yAt = (px, pz) => y(px + x, pz + z);
    // the wet floor: dark granite, shining (the sun's glints by day, the jets' colours on it at night), rippling
    const ripples = rippleNormals();
    this.floor = new THREE.MeshPhongMaterial({ color: '#4a4f55', specular: '#d8ecff', shininess: 140, emissive: '#1a4f7a', emissiveIntensity: 0, normalMap: ripples, normalScale: new THREE.Vector2(0.35, 0.35), polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
    // (laid on the paving as it slopes: a point every couple of metres)
    const fg = new THREE.PlaneGeometry(F.floor.width, F.floor.z1 - F.floor.z0, 10, 24).rotateX(-Math.PI / 2);
    const fp = fg.attributes.position;
    const fz = (F.floor.z0 + F.floor.z1) / 2;
    for (let i = 0; i < fp.count; i++) fp.setY(i, yAt(fp.getX(i), fp.getZ(i) + fz) + 0.02);
    fg.computeVertexNormals();
    const floor = new THREE.Mesh(fg, this.floor);
    floor.position.set(0, 0, fz);
    floor.receiveShadow = true;
    this.group.add(floor);
    // the jets
    this.jets = fountainJets();
    for (const j of this.jets) j.y = yAt(j.x, j.z);
    const cone = new THREE.CylinderGeometry(0.5, 1, 1, 7, 1, true);
    cone.translate(0, 0.5, 0);
    const seeds = new Float32Array(this.jets.length).map((_, i) => (Math.sin(i * 12.9898) * 43758.5453) % 1);
    cone.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds.map(Math.abs), 1));
    this.jetMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uBright: { value: 1 } }, vertexShader: jetVert, fragmentShader: jetFrag, side: THREE.DoubleSide, ...BLEND });
    this.jetMesh = new THREE.InstancedMesh(cone, this.jetMat, this.jets.length);
    this.jetMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.jets.length * 3), 3);
    this.jetMesh.frustumCulled = false;
    // the droplets: five off each jet's crown
    const PER = 5;
    const nd = this.jets.length * PER;
    const dg = new THREE.BufferGeometry();
    const base = new Float32Array(nd * 3);
    const dSeed = new Float32Array(nd);
    this.jets.forEach((j, i) => {
      for (let k = 0; k < PER; k++) {
        const q = i * PER + k;
        base.set([j.x, j.y, j.z], q * 3);
        dSeed[q] = Math.abs((Math.sin(q * 78.233 + 1.7) * 43758.5453) % 1);
      }
    });
    dg.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
    dg.setAttribute('aBase', new THREE.BufferAttribute(base, 3));
    dg.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1));
    this.dropH = new THREE.BufferAttribute(new Float32Array(nd), 1);
    this.dropC = new THREE.BufferAttribute(new Float32Array(nd * 3), 3);
    dg.setAttribute('aH', this.dropH);
    dg.setAttribute('aColor', this.dropC);
    this.dropMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uBright: { value: 1 }, uScale: { value: 900 } }, vertexShader: dropVert, fragmentShader: dropFrag, ...BLEND });
    this.drops = new THREE.Points(dg, this.dropMat);
    this.drops.frustumCulled = false;
    this.PER = PER;
    // the splashes where they fall
    this.splashMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uNight: { value: 0 }, uBright: { value: 1 } }, vertexShader: splashVert, fragmentShader: splashFrag, ...BLEND });
    this.splash = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.splashMat, this.jets.length);
    this.splash.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.jets.length * 3), 3);
    this.splash.frustumCulled = false;
    // the floor lights: a strip along the inside of each tall row (bloomed after dark)
    const leds = [];
    for (const sx of [-1, 1]) for (let k = 0; k <= Math.floor((F.edge.z1 - F.edge.z0) / 0.9); k++) leds.push([sx * (F.edge.x - 0.9), F.edge.z0 + k * 0.9, k]);
    this.ledMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.05, 0.22), this.ledMat, leds.length);
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    const LED = ['#3cff6e', '#ff3b4f', '#ffffff', '#3cff6e', '#ff3b4f'];
    leds.forEach(([lx, lz, k], i) => {
      m.makeTranslation(lx, yAt(lx, lz) + 0.04, lz);
      this.leds.setMatrixAt(i, m);
      this.leds.setColorAt(i, col.set(LED[k % LED.length]));
    });
    this.ledMat.color.setScalar(0.25);
    this.group.add(this.jetMesh, this.splash, this.drops, this.leds);
    for (const o of [this.jetMesh, this.splash, this.drops, this.leds]) o.userData.noShadow = true;
    this._m = new THREE.Matrix4();
    this._c = new THREE.Color();
    this._day = new THREE.Color('#e6f4ff');
    this._glow = new THREE.Color();
    this._v = new THREE.Vector3();
    this._next = 0;
    this.heights = new Float32Array(this.jets.length);
    /** How much spray is on the camera's lens just now (0…1). */
    this.spray = 0;
    this.update(0, 0, 0);
  }

  /**
   * Each frame: `t` seconds, `night` 0…1, `d` the camera's distance (m), `cam` its position (for the spray on
   * the lens). Near (within 250 m) every frame; further, a few times a second; past 900 m not drawn.
   */
  update(t, night = 0, d = 0, cam = null) {
    this.group.visible = d < 900;
    for (const mat of [this.jetMat, this.dropMat, this.splashMat]) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uNight.value = night;
      // (by day a little under white; after dark bright, for the bloom)
      mat.uniforms.uBright.value = 0.85 + 1.6 * night;
    }
    if (!this.group.visible) {
      this.spray = 0;
      return;
    }
    if (d > 250 && t < this._next) return;
    this._next = t + 1 / 8;
    const m = this._m;
    const c = this._c;
    const PER = this.PER;
    let tall = 0;
    this._glow.setRGB(0, 0, 0);
    this.jets.forEach((j, i) => {
      const h = jetHeight(j, t);
      this.heights[i] = h;
      const w = j.kind === 'burst' ? 0.42 : j.kind === 'edge' ? 0.17 : 0.13;
      m.makeScale(w, Math.max(0.01, h), w).setPosition(j.x, j.y + 0.03, j.z);
      this.jetMesh.setMatrixAt(i, m);
      // by day plain water, after dark coloured light
      if (night > 0.02) jetColor(j, t, c).lerp(this._day, 1 - night);
      else c.copy(this._day);
      this.jetMesh.setColorAt(i, c);
      for (let k = 0; k < PER; k++) {
        this.dropH.array[i * PER + k] = h;
        this.dropC.array.set([c.r, c.g, c.b], (i * PER + k) * 3);
      }
      const s = (j.kind === 'burst' ? 3 : 1) * (0.5 + Math.min(1.6, h * 0.22));
      m.makeScale(s, 1, s).setPosition(j.x, j.y + 0.05, j.z);
      this.splash.setMatrixAt(i, m);
      this.splash.setColorAt(i, c);
      if (night > 0.02) this._glow.add(c);
      if (h > 4) tall++;
    });
    this.jetMesh.instanceMatrix.needsUpdate = true;
    this.jetMesh.instanceColor.needsUpdate = true;
    this.splash.instanceMatrix.needsUpdate = true;
    this.splash.instanceColor.needsUpdate = true;
    this.dropH.needsUpdate = true;
    this.dropC.needsUpdate = true;
    this.ledMat.color.setScalar(0.25 + 1.4 * night);
    // the wet floor: the jets' colours glowing in it after dark, the ripples drifting
    this.floor.emissive.copy(this._glow.multiplyScalar(1 / this.jets.length));
    // (a glow in the wet stone, not a lit slab: at 0.55 the whole floor bloomed to a pale cyan sheet)
    this.floor.emissiveIntensity = 0.1 * night;
    if (this.floor.normalMap) this.floor.normalMap.offset.set(Math.sin(t * 0.13) * 0.05, t * 0.02);
    // spray on the lens: the camera in (or just by) a jet's column, below its top
    let wet = 0;
    if (cam && d < 120) {
      const v = this.group.worldToLocal(this._v.copy(cam));
      this.jets.forEach((j, i) => {
        const h = this.heights[i];
        if (h < 1.2 || v.y > j.y + h + 0.5) return;
        const r = Math.hypot(v.x - j.x, v.z - j.z);
        if (r < 2.2) wet = Math.max(wet, (1 - r / 2.2) * Math.min(1, h / 5));
      });
    }
    // (on at once; running off over a second or so)
    this.spray = wet > this.spray ? wet : Math.max(0, this.spray - 0.015);
    this._tall = tall;
  }
}
