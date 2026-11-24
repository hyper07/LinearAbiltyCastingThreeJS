/**
 * Sky, light and air for one mountain: a gradient dome with a sun glow (or
 * a moon, the aurora and stars at night), height fog tinted to the horizon,
 * a ring of distant snowy peaks, image-based light (an HDRI from the library
 * where there is one, else the sky itself through PMREM) and one shadowed
 * sun that follows the player in a tight box (render-quality.md §2.1, §2.4, §2.7).
 */
import * as THREE from 'three/webgpu';
import {
  Fn, uniform, vec2, vec3, vec4, float, mix, smoothstep, pow, max, dot, normalize, positionLocal, positionWorld, cameraPosition, atan, sin,
  mx_noise_float, mx_cell_noise_float, fog, exp, clamp, time, abs
} from 'three/tsl';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { summitDir, backdropPlace } from '../landmarks.js';

const HDRI = {
  noon: 'kloofendal_48d_partly_cloudy_puresky_1k.hdr',
  sunset: 'spruit_sunrise_1k.hdr',
  night: 'satara_night_1k.hdr'
};
export const HDRI_CREDIT = Object.values(HDRI);

const dirFrom = (altDeg, azDeg) => {
  const a = (altDeg * Math.PI) / 180, z = (azDeg * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(z) * Math.cos(a), Math.sin(a), -Math.cos(z) * Math.cos(a)).normalize();
};

export class Sky {
  constructor(scene, mountain, course = null) {
    this.scene = scene;
    const P = mountain.palette;
    this.night = mountain.time === 'night';
    // sunrise just beside the summit: the sky glows round the peak and its snow catches the light side-on
    const sunDir = P.sunOnPeak && course && mountain.peak ? new THREE.Vector3(...summitDir(course, mountain)).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.6).add(new THREE.Vector3(0, 0.06, 0)).normalize() : dirFrom(P.sunAlt, P.sunAz);
    this.u = {
      zenith: uniform(new THREE.Color(P.sky[0])),
      mid: uniform(new THREE.Color(P.sky[1])),
      horizon: uniform(new THREE.Color(P.sky[2])),
      fog: uniform(new THREE.Color(P.fog)),
      sun: uniform(sunDir),
      sunColor: uniform(new THREE.Color(P.sun)),
      aurora: uniform(this.night ? 1 : 0),
      stars: uniform(this.night ? 1 : 0),
      fogDensity: uniform(P.fogD ?? (this.night ? 0.0019 : mountain.time === 'sunset' ? 0.001 : 0.0011)),
      auroraA: uniform(new THREE.Color(P.auroraA ?? '#33ff8c')),
      auroraB: uniform(new THREE.Color(P.auroraB ?? '#9e59ff')),
      fogBase: uniform(0)
    };
    const u = this.u;
    // ---- the dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4200, 48, 24), new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false }));
    dome.material.fog = false;
    const dir = normalize(positionLocal);
    const skyCol = Fn(() => {
      const y = dir.y;
      const c = mix(u.horizon, u.mid, smoothstep(0.0, 0.22, y)).toVar();
      c.assign(mix(c, u.zenith, smoothstep(0.18, 0.85, y)));
      c.assign(mix(c, u.fog, smoothstep(0.06, -0.05, y)));
      const sd = max(dot(dir, u.sun), 0);
      c.addAssign(vec3(u.sunColor).mul(pow(sd, 6).mul(this.night ? 0.06 : 0.28)));
      return c;
    })();
    dome.material.colorNode = skyCol;
    dome.material.emissiveNode = Fn(() => {
      const y = dir.y;
      const sd = max(dot(dir, u.sun), 0);
      const disc = smoothstep(0.9993, 0.9997, sd).mul(this.night ? 1.4 : 4);
      const halo = pow(sd, 220).mul(this.night ? 0.35 : 1.2);
      const out = vec3(u.sunColor).mul(disc.add(halo)).toVar();
      // aurora: drifting curtains of green and violet
      const az = atan(dir.x, dir.z);
      const band = smoothstep(0.1, 0.28, y).mul(smoothstep(0.85, 0.4, y));
      const n1 = mx_noise_float(vec2(az.mul(2.6).add(time.mul(0.03)), y.mul(1.5)));
      const n2 = mx_noise_float(vec2(az.mul(7.0).sub(time.mul(0.05)), y.mul(9.0)));
      let curtain = pow(max(n1.mul(0.7).add(n2.mul(0.3)).add(0.15), 0), 2).mul(band).mul(2.2);
      let hue = mix(u.auroraA, u.auroraB, smoothstep(0.25, 0.65, y).add(n2.mul(0.3)));
      if (P.aurora === 'ribbon') {
        // Iceland's: one long ribbon snaking across the sky, fine vertical rays, green at its foot fading to purple tops
        const centre = sin(az.mul(1.6).add(time.mul(0.04))).mul(0.07).add(sin(az.mul(4.1).sub(time.mul(0.06))).mul(0.025)).add(0.3);
        const d = y.sub(centre);
        const rays = mx_noise_float(vec2(az.mul(60).add(time.mul(0.2)), 0.5)).mul(0.5).add(0.5);
        const foot = smoothstep(-0.05, 0.0, d).mul(smoothstep(0.2, 0.02, d));
        curtain = foot.mul(rays.mul(0.7).add(0.3)).mul(n1.mul(0.4).add(0.8)).mul(1.1);
        hue = mix(u.auroraA, u.auroraB, smoothstep(0.0, 0.09, d));
      }
      out.addAssign(hue.mul(curtain).mul(u.aurora));
      // stars
      const cell = mx_cell_noise_float(dir.mul(420));
      const tw = sin(time.mul(3).add(cell.mul(60))).mul(0.4).add(0.6);
      out.addAssign(vec3(0.9, 0.95, 1).mul(smoothstep(0.9965, 0.9995, cell)).mul(tw).mul(smoothstep(0.02, 0.2, y)).mul(u.stars).mul(1.6));
      return out;
    })();
    dome.frustumCulled = false;
    dome.renderOrder = -10;
    this.dome = dome;
    scene.add(dome);
    // ---- fog: exponential with distance, thinner with height above the run
    const dist = positionWorld.sub(cameraPosition).length();
    const hfall = exp(positionWorld.y.sub(u.fogBase).mul(-0.004)).clamp(0.25, 1.4);
    const factor = float(1).sub(exp(dist.mul(u.fogDensity).pow(2).negate())).mul(hfall).clamp(0, 0.97);
    scene.fogNode = fog(u.fog, factor);
    // ---- the sun (shadowed, follows the player) and a soft fill
    this.sun = new THREE.DirectionalLight(P.sun, P.sunI);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 3;
    const sc = this.sun.shadow.camera;
    sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 260;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(P.hemi[0], P.hemi[1], this.night ? 0.5 : 0.35);
    scene.add(this.hemi);
    this.envIntensity = P.envI;
  }

  /** Image-based light: the library HDRI for this time of day, else the sky dome itself. */
  async environment(renderer, { useHdri = true } = {}) {
    const name = HDRI[this.night ? 'night' : this.u.sun.value.y < 0.35 ? 'sunset' : 'noon'];
    let tex = null;
    if (useHdri && !this.night) {
      try {
        const hdr = await new HDRLoader().loadAsync(`./library/rigged/hdri/${name}`);
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        tex = hdr;
        this.hdri = name;
      } catch {
        tex = null;
      }
    }
    if (!tex) {
      const pm = new THREE.PMREMGenerator(renderer);
      const s = new THREE.Scene();
      s.add(this.dome.clone());
      tex = pm.fromScene(s, 0, 1, 5000).texture;
      pm.dispose();
      this.hdri = null;
    }
    this.scene.environment = tex;
    this.scene.environmentIntensity = this.envIntensity * (this.hdri ? 1 : 1.3);
    // Turn the HDRI's brightest side toward our sun.
    this.scene.environmentRotation = new THREE.Euler(0, this.hdri ? Math.atan2(this.u.sun.value.x, -this.u.sun.value.z) : 0, 0);
    return tex;
  }

  /** Keep the dome, the fog and the sun's shadow box with the player. */
  follow(target, shadowSize = 26) {
    this.dome.position.copy(target);
    this.u.fogBase.value = target.y - 30;
    const s = this.u.sun.value;
    const sc = this.sun.shadow.camera;
    if (sc.right !== shadowSize) {
      sc.left = -shadowSize; sc.right = shadowSize; sc.top = shadowSize; sc.bottom = -shadowSize;
      sc.updateProjectionMatrix();
    }
    // snap to shadow texels so edges don't crawl
    const texel = (shadowSize * 2) / (this.sun.shadow.mapSize.x || 1024);
    const x = Math.round(target.x / texel) * texel, y = Math.round(target.y / texel) * texel, z = Math.round(target.z / texel) * texel;
    this.sun.target.position.set(x, y, z);
    this.sun.position.set(x + s.x * 120, y + s.y * 120, z + s.z * 120);
  }

  setShadowSize(px) {
    this.sun.shadow.mapSize.set(px, px);
  }
}

/**
 * Distant peaks around the course: big soft low-poly mountains, snowy above
 * a line, rocky streaks below, lost in the fog. One mesh.
 */
export function distantPeaks(course, mountain, rand) {
  const pts = [];
  for (let i = 0; i < course.n; i += 40) pts.push([course.px[i], course.pz[i]]);
  let cx = 0, cz = 0;
  for (const [x, z] of pts) { cx += x; cz += z; }
  cx /= pts.length; cz /= pts.length;
  const top = course.py[0];
  const bottom = course.py[course.n - 1];
  const geos = [];
  const count = 26;
  // a famous mountain on the skyline: leave its side of the ring open and keep the rest low,
  // so nothing stands in front of the hero
  const hero = mountain.peak ? backdropPlace(course, mountain) : null;
  const heroA = hero ? Math.atan2(hero.z - cz, hero.x - cx) : 0;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rand() * 0.2;
    const r = 1500 + rand() * 1100;
    let h = (top - bottom) * (0.7 + rand() * 0.9) + 250;
    if (hero) {
      const off = Math.abs(Math.atan2(Math.sin(a - heroA), Math.cos(a - heroA)));
      if (off < 1.15) continue;
      h *= 0.55;
    }
    const base = bottom - 120;
    const g = new THREE.ConeGeometry(500 + rand() * 500, h + (top - base) * 0.2, 9, 6);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      const jitter = 1 + (rand() - 0.5) * 0.35;
      p.setX(k, p.getX(k) * jitter);
      p.setZ(k, p.getZ(k) * jitter);
      p.setY(k, y + (rand() - 0.5) * 40);
    }
    g.translate(cx + Math.cos(a) * r, base + (h + (top - base) * 0.2) / 2, cz + Math.sin(a) * r);
    geos.push(g.toNonIndexed());
  }
  const merged = mergeGeos(geos);
  merged.computeVertexNormals();
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, flatShading: true });
  const yN = positionWorld.y;
  const snowLine = float(bottom + (top - bottom) * 0.55);
  const n = mx_noise_float(positionWorld.mul(0.004)).mul(120);
  const rock = mountain.time === 'night' ? vec3(0.2, 0.22, 0.32) : mountain.time === 'sunset' ? vec3(0.42, 0.36, 0.4) : vec3(0.5, 0.55, 0.65);
  m.colorNode = mix(rock, vec3(0.94, 0.96, 1.0), smoothstep(snowLine.sub(60), snowLine.add(40), yN.add(n)));
  const mesh = new THREE.Mesh(merged, m);
  mesh.frustumCulled = false;
  mesh.receiveShadow = false;
  return mesh;
}

function mergeGeos(list) {
  let count = 0;
  for (const g of list) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3);
  let o = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, o);
    o += g.attributes.position.array.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return out;
}

export { vec4, clamp, abs };
