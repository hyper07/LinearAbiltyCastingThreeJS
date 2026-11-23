/**
 * Snow, in TSL (knowledge/render-quality.md §7):
 *
 *   SnowTrails — persistent board trails. Two render targets ping-pong over a
 *     window of the run in course space (lat × s, centred on you): each frame
 *     the old picture is copied in (scrolled as the window slides down the
 *     run, faded a hair), then every rider on the snow stamps its board's
 *     sweep since the last frame — a soft groove, deeper and wider when
 *     carving hard. No orthographic camera needed: the terrain carries its
 *     own (s, lat) per vertex, so the trail map lines up with it exactly.
 *
 *   snowMaterial — near-white with cool shadows (the sky does the blue),
 *     groomed corduroy on the run fading with distance, the trail grooves
 *     (darker, smoother, shaded from the map's slope), soft fresh powder off
 *     the run, macro variation, and sparkle: tiny glints where a cell of
 *     snow happens to mirror the sun to the eye, fed to bloom as emissive.
 */
import * as THREE from 'three/webgpu';
import {
  Fn, uniform, uniformArray, attribute, varying, texture, vec2, vec3, vec4, float, int, Loop, max, min, abs, clamp, mix, smoothstep,
  positionWorld, cameraPosition, cameraViewMatrix, normalLocal, sin, cos, pow, dot, reflect, normalize, length, uv, mx_noise_float, mx_cell_noise_float, step
} from 'three/tsl';

export const TRAIL = { lat: 26, len: 200, back: 60, w: 384, h: 1536, riders: 8 };

export class SnowTrails {
  constructor(renderer) {
    this.renderer = renderer;
    const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
    this.rts = [new THREE.RenderTarget(TRAIL.w, TRAIL.h, opts), new THREE.RenderTarget(TRAIL.w, TRAIL.h, opts)];
    this.cur = 0;
    this.base = uniform(0); // s at the window's bottom edge (v = 0)
    this.shift = uniform(0); // how far the window moved since last frame (in v)
    this.decay = uniform(0.9996);
    this.clear = uniform(1);
    this.segs = uniformArray(new Array(TRAIL.riders).fill(0).map(() => new THREE.Vector4()), 'vec4');
    this.wid = uniformArray(new Array(TRAIL.riders).fill(0), 'float');
    this.prevTex = texture(this.rts[1].texture);
    this.read = texture(this.rts[0].texture); // what the snow samples (swapped each frame)
    const prev = this.prevTex;
    const segs = this.segs, wid = this.wid;
    const mat = new THREE.MeshBasicNodeMaterial();
    mat.colorNode = Fn(() => {
      const p = uv();
      const src = vec2(p.x, p.y.add(this.shift));
      const inside = step(0, src.y).mul(step(src.y, 1));
      const old = prev.sample(src).r.mul(inside).mul(this.decay).mul(float(1).sub(this.clear));
      const v = old.toVar();
      // position in metres: x across, y along
      const m = vec2(p.x.mul(TRAIL.lat * 2), p.y.mul(TRAIL.len));
      Loop({ start: int(0), end: int(TRAIL.riders), type: 'int', condition: '<' }, ({ i }) => {
        const sg = segs.element(i);
        const w = wid.element(i);
        const a = vec2(sg.x, sg.y), b = vec2(sg.z, sg.w);
        const ab = b.sub(a);
        const h = clamp(dot(m.sub(a), ab).div(max(dot(ab, ab), 1e-5)), 0, 1);
        const d = length(m.sub(a).sub(ab.mul(h)));
        const stamp = smoothstep(w, w.mul(0.35), d).mul(step(0.001, w));
        v.assign(max(v, stamp));
      });
      return vec4(v, 0, 0, 1);
    })();
    this.quad = new THREE.QuadMesh(mat);
    this.first = true;
    this.wipe();
  }

  /** Clear both targets (fresh render targets hold garbage, and NaN × 0 is still NaN). */
  wipe() {
    const r = this.renderer;
    const keep = r.getRenderTarget();
    const col = r.getClearColor(new THREE.Color());
    const a = r.getClearAlpha();
    r.setClearColor(0x000000, 1);
    for (const rt of this.rts) {
      r.setRenderTarget(rt);
      r.clear();
    }
    r.setRenderTarget(keep);
    r.setClearColor(col, a);
  }

  /**
   * @param {number} baseS   new window base (s at v = 0)
   * @param {Array<{s0, lat0, s1, lat1, width}>} strokes  board sweeps this frame
   */
  update(baseS, strokes) {
    const old = this.base.value;
    this.shift.value = this.first ? 0 : (baseS - old) / TRAIL.len;
    this.base.value = baseS;
    this.clear.value = this.first ? 1 : 0;
    this.first = false;
    for (let i = 0; i < TRAIL.riders; i++) {
      const st = strokes[i];
      if (!st) {
        this.wid.array[i] = 0;
        continue;
      }
      this.segs.array[i].set(st.lat0 + TRAIL.lat, st.s0 - baseS, st.lat1 + TRAIL.lat, st.s1 - baseS);
      this.wid.array[i] = st.width;
    }
    // read the last written, write the other
    const src = this.rts[this.cur], dst = this.rts[1 - this.cur];
    this.prevTex.value = src.texture;
    const r = this.renderer;
    const keep = r.getRenderTarget();
    r.setRenderTarget(dst);
    this.quad.render(r);
    r.setRenderTarget(keep);
    this.read.value = dst.texture;
    this.cur = 1 - this.cur;
  }

  reset() {
    this.first = true;
    this.wipe();
  }

  dispose() {
    for (const rt of this.rts) rt.dispose();
  }
}

/**
 * The snow. `trails` may be null (low tier). `sun` is a uniform vec3 (direction
 * toward the sun) and `sunColor` a uniform colour, shared with the sky.
 */
export function snowMaterial({ trails = null, sun, sunColor, sparkle = 1, tintShadow = '#9db8e8' } = {}) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.7, metalness: 0 });
  const course = attribute('course', 'vec3'); // s, lat, half-width
  const side = attribute('side', 'vec2'); // world right vector (x, z) of the run here
  const vCourse = varying(course, 'vCourse');
  const vSide = varying(side, 'vSide');
  const sparkleU = uniform(sparkle);
  const shadowTint = uniform(new THREE.Color(tintShadow));
  m.userData.sparkle = sparkleU;

  const parts = () => {
    const s = vCourse.x, lat = vCourse.y, W = vCourse.z;
    const aLat = abs(lat);
    const onRun = float(1).sub(smoothstep(W.sub(0.6), W.add(1.4), aLat));
    const dist = length(positionWorld.sub(cameraPosition));
    // corduroy: fine ridges across the run, fading out before they alias
    const cordFade = float(1).sub(smoothstep(14, 46, dist)).mul(onRun);
    const ph = lat.mul(Math.PI * 2 / 0.34);
    const cord = cos(ph).mul(0.13).mul(cordFade);
    // trail grooves from the map
    let groove = float(0), gx = float(0), gy = float(0);
    if (trails) {
      const tuv = vec2(lat.add(TRAIL.lat).div(TRAIL.lat * 2), s.sub(trails.base).div(TRAIL.len));
      const inWin = step(0.0, tuv.y).mul(step(tuv.y, 1.0)).mul(step(0.0, tuv.x)).mul(step(tuv.x, 1.0));
      const tex = trails.read;
      const dx = 1 / TRAIL.w, dy = 1 / TRAIL.h;
      groove = tex.sample(tuv).r.mul(inWin);
      gx = tex.sample(tuv.add(vec2(dx, 0))).r.sub(tex.sample(tuv.sub(vec2(dx, 0))).r).mul(inWin);
      gy = tex.sample(tuv.add(vec2(0, dy))).r.sub(tex.sample(tuv.sub(vec2(0, dy))).r).mul(inWin);
    }
    // micro and macro variation
    const pw = positionWorld;
    const micro = mx_noise_float(pw.mul(2.1)).mul(0.5).add(mx_noise_float(pw.mul(7.3)).mul(0.25));
    const macro = mx_noise_float(pw.mul(vec3(0.035, 0.035, 0.035)));
    return { onRun, cord, groove, gx, gy, micro, macro, dist };
  };

  const P = parts();
  // normal: world normal tilted by corduroy (across the run) and the groove slope
  const sideW = vec3(vSide.x, 0, vSide.y);
  const fwdW = vec3(vSide.y, 0, vSide.x.negate());
  const nW = normalize(normalLocal.add(sideW.mul(P.cord.sub(P.gx.mul(1.6)))).add(fwdW.mul(P.gy.mul(-1.2))).add(vec3(P.micro.mul(0.06), 0, P.micro.mul(-0.05))));
  m.normalNode = normalize(cameraViewMatrix.mul(vec4(nW, 0)).xyz);
  // colour: cool white; grooves a touch darker and bluer; powder off the run brighter
  const base = mix(vec3(0.9, 0.93, 0.975), vec3(0.97, 0.98, 1.0), float(1).sub(P.onRun).mul(0.6));
  const varied = base.mul(P.macro.mul(0.035).add(1)).mul(P.micro.mul(0.02).add(1));
  m.colorNode = mix(varied, vec3(shadowTint).mul(0.95), P.groove.mul(0.3));
  m.roughnessNode = clamp(mix(float(0.55), float(0.82), float(1).sub(P.onRun)).sub(P.groove.mul(0.22)).add(P.micro.mul(0.06)), 0.25, 1);
  // sparkle: a few cells mirror the sun to the eye
  const V = normalize(cameraPosition.sub(positionWorld));
  const cell = mx_cell_noise_float(positionWorld.mul(22));
  const glint = step(0.955, cell).mul(pow(max(dot(reflect(V.negate(), nW), sun), 0), 90)).mul(float(1).sub(smoothstep(10, 60, P.dist)));
  m.emissiveNode = vec3(sunColor).mul(glint).mul(sparkleU).mul(float(1).sub(P.groove)).mul(3.5);
  return m;
}

/** Packed ice: glossy, blue, with a few frosty cracks (the frozen creek, ice patches). */
export function iceMaterial() {
  const m = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04 });
  const p = positionWorld;
  const crack = smoothstep(0.03, 0.0, abs(mx_noise_float(p.mul(0.9)))).mul(0.5).add(smoothstep(0.02, 0.0, abs(mx_noise_float(p.mul(2.3).add(4)))).mul(0.35));
  const deep = mx_noise_float(p.mul(0.25)).mul(0.5).add(0.5);
  m.colorNode = mix(mix(vec3(0.55, 0.78, 0.95), vec3(0.75, 0.9, 1.0), deep), vec3(0.95, 0.98, 1.0), crack);
  m.roughnessNode = mix(float(0.06), float(0.5), crack);
  return m;
}

export { sin };
