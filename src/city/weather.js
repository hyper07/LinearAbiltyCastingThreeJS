import * as THREE from 'three';

/**
 * Weather over the city: clear, rain, a storm (heavier rain and lightning),
 * snow, or fog. Rain and snow fall in a box that follows the camera (one
 * draw each, moved in the vertex shader, so it costs almost nothing); wet
 * weather darkens the roads and makes them shine (`wet`, read by the road
 * shader); fog closes in; a storm flashes the sky now and then (`flash`).
 *
 *   const w = new Weather(scene);
 *   w.set('rain');               // or w.auto = true: it changes by itself every few minutes
 *   w.update(dt, camera);        // every frame
 */
export const WEATHERS = {
  clear: { wind: 0.45, name: 'Clear', icon: '🌙', rain: 0, snow: 0, fog: 1, wet: 0, storm: false },
  rain: { wind: 0.9, name: 'Rain', icon: '🌧️', rain: 0.65, snow: 0, fog: 0.62, wet: 1, storm: false },
  storm: { wind: 2.0, name: 'Storm', icon: '⛈️', rain: 1, snow: 0, fog: 0.5, wet: 1, storm: true },
  snow: { wind: 0.6, name: 'Snow', icon: '❄️', rain: 0, snow: 1, fog: 0.55, wet: 0.35, storm: false },
  fog: { wind: 0.2, name: 'Fog', icon: '🌫️', rain: 0, snow: 0, fog: 0.22, wet: 0.25, storm: false }
};
export const WEATHER_ORDER = ['clear', 'rain', 'storm', 'snow', 'fog'];
/** How often each comes when the weather changes by itself (snow only in the cold months). */
const ODDS = { clear: 0.5, rain: 0.22, storm: 0.08, snow: 0.1, fog: 0.1 };

/** The next weather, by the odds, never the same twice running. */
export function nextWeather(now, month = new Date().getMonth(), random = Math.random) {
  const cold = month === 11 || month <= 1;
  const odds = Object.entries(ODDS).filter(([k]) => k !== now && (k !== 'snow' || cold));
  const total = odds.reduce((s, [, p]) => s + p, 0);
  let r = random() * total;
  for (const [k, p] of odds) if ((r -= p) <= 0) return k;
  return odds[0][0];
}

/** The times of day a bike race can start at (hours, Seoul time), for the race menu. */
export const TIME_PICKS = {
  random: { name: 'Random', icon: '🎲' },
  day: { name: 'Day', icon: '☀️', hours: [9.5, 15.5] },
  golden: { name: 'Golden hour', icon: '🌇', hours: [17.6, 18.4] },
  night: { name: 'Night', icon: '🌙', hours: [20.5, 23.8] }
};
export const WEATHER_PICKS = ['random', 'clear', 'rain', 'storm', 'snow', 'fog'];
/** How often each weather comes for a race on "random" (a little more fine weather than the city's own). */
const RACE_ODDS = { clear: 0.46, rain: 0.2, storm: 0.09, snow: 0.13, fog: 0.12 };

/**
 * A race's sky: { hour, weather } — what was picked, or random (a random
 * time of day; weather by the odds, snow only in the cold months).
 */
export function raceSky(time = 'random', weather = 'random', { month = new Date().getMonth(), random = Math.random } = {}) {
  const kinds = ['day', 'golden', 'night'];
  const t = TIME_PICKS[time]?.hours ? time : kinds[Math.floor(random() * kinds.length)];
  const [a, b] = TIME_PICKS[t].hours;
  const hour = a + (b - a) * random();
  let w = weather;
  if (!WEATHERS[w]) {
    const cold = month === 11 || month <= 1;
    const odds = Object.entries(RACE_ODDS).filter(([k]) => k !== 'snow' || cold);
    let r = random() * odds.reduce((s, [, p]) => s + p, 0);
    w = odds.find(([, p]) => (r -= p) <= 0)?.[0] ?? 'clear';
  }
  return { hour: Math.round(hour * 100) / 100, weather: w, time: t };
}

const BOX = new THREE.Vector3(90, 46, 90); // metres of falling weather round the camera
const RAIN = 9000;
const SNOW = 7000;

function seeds(n, perPoint) {
  const a = new Float32Array(n * perPoint * 4);
  for (let i = 0; i < n; i++) {
    const s = [Math.random(), Math.random(), Math.random(), Math.random()];
    for (let k = 0; k < perPoint; k++) a.set(s, (i * perPoint + k) * 4);
  }
  return a;
}

const COMMON = /* glsl */ `
  uniform vec3 uCam;
  uniform vec3 uBox;
  uniform float uTime;
  attribute vec4 aSeed;
  // A point in the box round the camera: the seed places it, time moves it down, and it wraps.
  vec3 place(vec3 drift) {
    vec3 p = aSeed.xyz * uBox + drift;
    p = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5 + uCam;
    return p;
  }
`;

export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.kind = 'clear';
    /** Changing by itself: every 3–7 minutes, by the odds. */
    this.auto = false;
    this.onChange = null;
    this._nextChange = 180 + Math.random() * 240;
    this.level = { rain: 0, snow: 0, fog: 1, wet: 0 };
    this.flash = 0;
    this._nextBolt = 6;
    this.uniforms = { uCam: { value: new THREE.Vector3() }, uBox: { value: BOX }, uTime: { value: 0 }, uNight: { value: 1 } };

    // Rain: short streaks, each a line of two points, slanting a little with the wind.
    const rain = new THREE.BufferGeometry();
    rain.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN * 2 * 3), 3));
    rain.setAttribute('aSeed', new THREE.BufferAttribute(seeds(RAIN, 2), 4));
    const end = new Float32Array(RAIN * 2);
    for (let i = 0; i < RAIN; i++) end[i * 2 + 1] = 1;
    rain.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    rain.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    this.rain = new THREE.LineSegments(rain, new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, uAmount: { value: 0 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        ${COMMON}
        uniform float uAmount;
        attribute float aEnd;
        varying float vA;
        void main() {
          float speed = 24.0 + aSeed.w * 8.0;
          vec3 p = place(vec3(uTime * 3.0, -uTime * speed, uTime * 1.2));
          p += vec3(0.11, 1.0, 0.045) * aEnd * (0.9 + aSeed.w * 0.6);
          // Thinner far off, and only as many drops as the rain is heavy.
          float d = length(p - uCam);
          vA = step(aSeed.w, uAmount) * (1.0 - smoothstep(20.0, 45.0, d)) * (0.35 + 0.65 * aEnd);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uNight;
        varying float vA;
        void main() {
          if (vA < 0.01) discard;
          gl_FragColor = vec4(mix(vec3(0.75, 0.8, 0.88), vec3(0.6, 0.66, 0.78), uNight), vA * 0.42);
        }`
    }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.rain.renderOrder = 5;

    // Snow: soft round flakes that drift.
    const snow = new THREE.BufferGeometry();
    snow.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SNOW * 3), 3));
    snow.setAttribute('aSeed', new THREE.BufferAttribute(seeds(SNOW, 1), 4));
    snow.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    this.snow = new THREE.Points(snow, new THREE.ShaderMaterial({
      uniforms: { ...this.uniforms, uAmount: { value: 0 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        ${COMMON}
        uniform float uAmount;
        varying float vA;
        void main() {
          float t = uTime;
          vec3 drift = vec3(sin(t * 0.7 + aSeed.w * 40.0) * 1.6 + t * 0.8, -t * (1.6 + aSeed.w * 0.9), cos(t * 0.5 + aSeed.x * 30.0) * 1.3);
          vec3 p = place(drift);
          vec4 mv = viewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          vA = step(aSeed.w, uAmount) * (1.0 - smoothstep(25.0, 45.0, d));
          gl_PointSize = clamp(110.0 / max(d, 1.0), 1.5, 9.0) * (0.7 + aSeed.y * 0.6);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float r = 1.0 - smoothstep(0.25, 0.5, length(c));
          if (r * vA < 0.02) discard;
          gl_FragColor = vec4(vec3(0.96, 0.97, 1.0), r * vA * 0.9);
        }`
    }));
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    this.snow.renderOrder = 5;
    scene.add(this.rain, this.snow);
  }

  get info() {
    return WEATHERS[this.kind];
  }

  /** Change the weather (it eases in over a few seconds). */
  set(kind) {
    if (!WEATHERS[kind]) return;
    this.kind = kind;
    this._nextBolt = 3 + Math.random() * 5;
  }

  next() {
    this.set(WEATHER_ORDER[(WEATHER_ORDER.indexOf(this.kind) + 1) % WEATHER_ORDER.length]);
    return this.kind;
  }

  /** @param {number} dt @param {THREE.Camera} camera @param {number} night 0 day … 1 night */
  update(dt, camera, night = 1) {
    if (this.auto) {
      this._nextChange -= dt;
      if (this._nextChange <= 0) {
        this.set(nextWeather(this.kind));
        // Bad weather passes sooner than fine.
        this._nextChange = (this.kind === 'clear' ? 240 : 150) + Math.random() * 180;
        this.onChange?.(this.kind);
      }
    }
    const want = WEATHERS[this.kind];
    const k = Math.min(1, dt * 0.6);
    for (const key of ['rain', 'snow', 'fog', 'wet']) this.level[key] += (want[key] - this.level[key]) * (key === 'wet' ? Math.min(1, dt * 0.25) : k);
    const u = this.uniforms;
    u.uTime.value += dt;
    u.uCam.value.copy(camera.position);
    u.uNight.value = night;
    this.rain.visible = this.level.rain > 0.01;
    this.snow.visible = this.level.snow > 0.01;
    // Each shows as many drops (or flakes) as the weather is heavy.
    this.rain.material.uniforms.uAmount.value = this.level.rain;
    this.snow.material.uniforms.uAmount.value = this.level.snow;
    // Lightning: a double flash every 5–14 s in a storm.
    this.flash = Math.max(0, this.flash - dt * 3.2);
    if (want.storm) {
      this._nextBolt -= dt;
      if (this._nextBolt <= 0) {
        this.flash = 1;
        this._again = 0.18;
        this._nextBolt = 5 + Math.random() * 9;
      }
      if (this._again != null) {
        this._again -= dt;
        if (this._again <= 0) {
          this.flash = Math.max(this.flash, 0.7);
          this._again = null;
        }
      }
    }
  }

  dispose() {
    for (const m of [this.rain, this.snow]) {
      this.scene.remove(m);
      m.geometry.dispose();
      m.material.dispose();
    }
  }
}
