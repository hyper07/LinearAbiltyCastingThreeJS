import * as THREE from 'three';
import { PowerKit } from '../shared/powerKit.js';
import { setChoice } from '../shared/power.js';
import { HelpPanel } from '../shared/helpPanel.js';
import { GameMusic, musicMenu, seoulTrack, band, musicCreditHtml } from '../shared/gameMusic.js';
import { CONTROLS, modeHint } from './controls.js';
import { TILE, USES, decodeTile, tileKey, tileOf } from './tiles.js';
import { Street } from './street.js';
import { roadPieces } from './bridges.js';
import { Weather, WEATHERS } from './weather.js';
import { StreetLife } from './life.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { skyDome, followSun, GradeShader } from './sky.js';
import { Race } from './race.js';
import { streetCredits } from './streetAssets.js';
import { readAlleys } from './alleys.js';
import { confetti } from '../ui/pop.js';
import './city.css';

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const textureCache = new Map();
/** One of the library's ambientCG surfaces (`Color`, `NormalGL`, …), repeating; it arrives when it arrives. */
function texture(id, part) {
  const key = `${id}|${part}`;
  if (!textureCache.has(key)) {
    const t = new THREE.TextureLoader().load(`./library/ambientcg/${id}/${id}_1K-JPG_${part}.jpg`, undefined, undefined, () => {});
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 16;
    if (part === 'Color') t.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(key, t);
  }
  return textureCache.get(key);
}

/** Two geometries as one, each in its own colour (per vertex). */
/**
 * Trees in the wind: the higher up, the more it sways — the whole tree slowly, the leaves
 * quickly; each tree its own timing (from where it stands), more in a storm.
 */
function windy(material, wind, flutter) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wind.uTime;
    shader.uniforms.uWind = wind.uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3][0] * 0.071 + instanceMatrix[3][2] * 0.053;
        #else
          float ph = 0.0;
        #endif
        float hgt = max(0.0, transformed.y - 1.2);
        float gust = 0.65 + 0.35 * sin(uTime * 0.31 + ph * 0.4);
        float sway = (sin(uTime * 1.25 + ph) * 0.7 + sin(uTime * 2.35 + ph * 1.7) * 0.3) * gust;
        transformed.x += sway * uWind * hgt * hgt * 0.012;
        transformed.z += cos(uTime * 0.95 + ph * 1.3) * uWind * hgt * hgt * 0.007;
        float leaf = sin(uTime * 7.3 + position.x * 4.1 + position.y * 3.3 + position.z * 2.7 + ph) * ${flutter.toFixed(2)};
        transformed += normal * leaf * uWind * 0.045 * step(3.0, transformed.y);`);
  };
  return material;
}

function mergeTwo(a, b, ca, cb) {
  const parts = [a, b].map((g, k) => {
    const n = g.toNonIndexed();
    const col = new THREE.Color(k ? cb : ca);
    const c = new Float32Array(n.attributes.position.count * 3);
    for (let i = 0; i < c.length; i += 3) [c[i], c[i + 1], c[i + 2]] = [col.r, col.g, col.b];
    n.setAttribute('color', new THREE.BufferAttribute(c, 3));
    n.deleteAttribute('uv');
    return n;
  });
  const geo = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const arrays = parts.map((g) => g.attributes[name].array);
    const out = new Float32Array(arrays.reduce((s, x) => s + x.length, 0));
    let at = 0;
    for (const arr of arrays) {
      out.set(arr, at);
      at += arr.length;
    }
    geo.setAttribute(name, new THREE.BufferAttribute(out, 3));
  }
  return geo;
}

/**
 * The shop signs of a Korean street: sixteen of them, generic words (no
 * names of real businesses), white or coloured letters on strong colours.
 */
function signAtlas() {
  const words = ['편의점', '카페', '약국', '치킨', '분식', '노래방', '부동산', '병원', '안경', '꽃집', '빵집', '세탁', '미용실', '정육점', '식당', 'PC방'];
  const colors = [['#1d6fd1', '#fff'], ['#e8402a', '#fff'], ['#18a35a', '#fff'], ['#f4c21b', '#1a1a1a'], ['#7a2bd1', '#fff'], ['#ffffff', '#c41a1a'], ['#0f2a55', '#ffd34a'], ['#e3007a', '#fff']];
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d');
  words.forEach((w, k) => {
    const x = (k % 4) * 256;
    const y = Math.floor(k / 4) * 64;
    const [bg, fg] = colors[k % colors.length];
    g.fillStyle = bg;
    g.fillRect(x, y, 256, 64);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 4;
    g.strokeRect(x + 2, y + 2, 252, 60);
    g.fillStyle = fg;
    g.font = '900 40px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(w, x + 128, y + 34);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  return t;
}

/**
 * Asphalt, as a Seoul road has it: lanes as wide as the road really is (from its lane count),
 * on a two-way road a double yellow down the middle, on a one-way carriageway (half of a big
 * road) the yellow on the median side; white lane dashes, white edges; wheel tracks worn darker
 * in every lane, patches of newer asphalt, grime along the kerb; and at the ends of a road (its
 * junctions) a zebra crossing and a stop line.
 *
 * aPaint: metres across from the middle (− the right of the way it runs), metres along, the
 * width, and its length (negative: one way; 0.5: no crossings — a motorway or a bridge).
 */
function roadMaterial(uniforms) {
  const m = new THREE.MeshLambertMaterial({ map: texture('Asphalt031', 'Color'), vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = uniforms.uNight;
    shader.uniforms.uWet = uniforms.uWet;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aPaint;\nvarying vec4 vPaint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaint = aPaint;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vPaint;\nuniform float uNight;\nuniform float uWet;\nvec3 roadGlow = vec3(0.0);\nfloat roadHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat roadNoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(roadHash(i), roadHash(i + vec2(1.0, 0.0)), f.x), mix(roadHash(i + vec2(0.0, 1.0)), roadHash(i + vec2(1.0, 1.0)), f.x), f.y); }')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float w = vPaint.z;
        float o = vPaint.x;
        float along = vPaint.y;
        bool oneway = vPaint.w < 0.0;
        float total = abs(vPaint.w);
        float half_ = w * 0.5;
        float x = abs(o);
        float far = smoothstep(150.0, 600.0, length(vViewPosition));
        float near_ = 1.0 - far;
        // Wear: patches of newer and older asphalt, grime along the kerbs.
        float patch_ = roadNoise(vec2(along, o) * 0.11);
        diffuseColor.rgb *= mix(0.9, 1.07, patch_);
        diffuseColor.rgb *= mix(0.82, 1.0, smoothstep(0.0, 0.9, half_ - x));
        // The lanes: how many and how wide.
        float lanesAll = max(1.0, floor((w - (oneway ? 1.0 : 1.6)) / 3.25 + 0.5));
        float perSide = oneway ? lanesAll : max(1.0, floor(lanesAll / 2.0 + 0.5));
        float laneW = oneway ? (w - 1.0) / perSide : (half_ - 0.8) / perSide;
        float start = oneway ? -half_ + 0.5 : 0.0;
        float lp = oneway ? (o - start) / laneW : x / laneW;
        float inLane = fract(lp);
        // Wheel tracks: two darker, smoother bands in every lane.
        float track = exp(-pow((inLane - 0.27) * 9.0, 2.0)) + exp(-pow((inLane - 0.73) * 9.0, 2.0));
        diffuseColor.rgb *= 1.0 - 0.1 * track * near_;
        // Wet: the asphalt goes dark; puddles where the road dips (in the wheel tracks and by the kerb), darker still.
        diffuseColor.rgb *= 1.0 - 0.45 * uWet;
        float puddle = smoothstep(0.56, 0.7, roadNoise(vec2(along, o) * 0.31) * 0.65 + roadNoise(vec2(along, o) * 1.7) * 0.25 + track * 0.08 + smoothstep(half_ - 1.2, half_, x) * 0.12) * uWet * near_;
        diffuseColor.rgb *= 1.0 - 0.4 * puddle;
        float lines = 0.0;
        float yellow = 0.0;
        // Crossings at the ends of a road (its junctions), not on motorways and bridges.
        float toEnd = min(along, total - along);
        bool crossing = total > 1.0 && w > 6.0 && toEnd > 2.0 && toEnd < 6.0;
        bool stop = total > 1.0 && w > 6.0 && toEnd > 6.8 && toEnd < 7.25;
        if (crossing) {
          // A zebra: long white bars along the road, 0.45 m wide, 0.9 m apart.
          lines += step(fract((o + 40.0) / 0.9), 0.5) * step(x, half_ - 0.4);
        } else if (stop) {
          lines += oneway ? 1.0 : step(o, 0.0);
        } else if (oneway) {
          // The median side: double yellow; the kerb side: solid white; dashes between the lanes.
          float ym = half_ - 0.35 - o;
          yellow += step(abs(ym - 0.0), 0.08) + step(abs(ym - 0.3), 0.08);
          lines += step(abs(o + half_ - 0.35), 0.08);
          float edge = abs(fract(lp + 0.5) - 0.5) * laneW;
          lines += step(edge, 0.08) * step(0.6, lp) * step(lp, perSide - 0.4) * step(fract(along / 12.0), 0.45);
        } else if (w > 9.0) {
          // A two-way road: double yellow in the middle, lanes dashed each way, white edges.
          yellow += step(0.12, x) * step(x, 0.27);
          float edge = abs(fract(lp + 0.5) - 0.5) * laneW;
          lines += step(edge, 0.08) * step(0.6, lp) * step(lp, perSide - 0.4) * step(fract(along / 12.0), 0.45);
          lines += step(abs(x - (half_ - 0.35)), 0.08);
        } else {
          // A small street: one dashed white line down the middle.
          lines += step(x, 0.08) * step(fract(along / 8.0), 0.5);
          lines += step(abs(x - (half_ - 0.35)), 0.08);
        }
        // Paint is a little worn too.
        float worn = 0.75 + 0.25 * roadNoise(vec2(along, o) * 1.7);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.75, 0.15), clamp(yellow, 0.0, 1.0) * near_ * worn);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95), clamp(lines, 0.0, 1.0) * near_ * worn);
        float w0 = w;
        // At night, a pool of warm light under every street lamp (one each 48 m, the side changing each time).
        float n = floor((along - 8.0) / 48.0 + 0.5);
        float side = mod(n, 2.0) < 0.5 ? -1.0 : 1.0;
        float da = along - (8.0 + n * 48.0);
        float dx = vPaint.x - side * (w0 * 0.5 + 0.5);
        float pool = exp(-(da * da) / 70.0 - (dx * dx) / 55.0);
        vec3 sodium = vec3(1.0, 0.78, 0.5);
        roadGlow = sodium * pool * uNight * (0.32 - 0.2 * uWet);
        // And on a wet road, the light stretched out along it, and a sheen of the sky at a low angle.
        float streak = exp(-(dx * dx) / 3.5) * exp(-abs(da) / 14.0);
        roadGlow += sodium * streak * uWet * uNight * 0.55;
        vec3 vdir = normalize(vViewPosition);
        roadGlow += vec3(0.16, 0.2, 0.28) * uWet * pow(1.0 - abs(vdir.z), 4.0) * 0.6;
        // Puddles mirror the sky at a low angle, and the lamps by night (rippled by the rain).
        float rip = 0.85 + 0.15 * sin(along * 7.0 + o * 5.0);
        roadGlow += vec3(0.2, 0.25, 0.33) * puddle * pow(1.0 - abs(vdir.z), 2.0) * 0.9 * rip * (1.0 - 0.85 * uNight);
        roadGlow += sodium * streak * puddle * uNight * 0.45 * rip;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += roadGlow;');
  };
  return m;
}

/**
 * The pavements: Seoul's paving blocks (ambientCG PavingStones152, CC0), true to
 * size, their joints in relief from the normal map, sharp at a glancing angle
 * (mipmaps, 16× anisotropic). A little calmer in colour than the photo. Wet,
 * they go darker and glossy, with standing water in the low blocks.
 */
function pavementMaterial(uniforms) {
  const m = new THREE.MeshStandardMaterial({ map: texture('PavingStones152', 'Color'), normalMap: texture('PavingStones152', 'NormalGL'), roughnessMap: texture('PavingStones152', 'Roughness'), color: '#cfc6c0', roughness: 1, metalness: 0, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.5, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWet = uniforms.uWet;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWet;')
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        {
          // standing water where the blocks are low (dark in the photo), the rest just damp
          float low = 1.0 - smoothstep(0.25, 0.5, dot(diffuseColor.rgb, vec3(0.33)));
          roughnessFactor = mix(roughnessFactor, mix(0.66, 0.36, low), uWet);
          diffuseColor.rgb *= 1.0 - uWet * (0.45 + 0.2 * low);
        }`);
  };
  return m;
}

/** Where the game's world begins: Seoul City Hall, in the source's grid (EPSG:5186, metres). */
const ORIGIN = { x: 198050, y: 551860 };
/** Wall colours by what a building is for (see tiles.js USES), light to read windows on. */
const PALETTE = { house: '#d8c9b4', apartment: '#e4e2dc', shop: '#d9cfc0', office: '#9fb0c0', public: '#d2c4b2', industry: '#b9b3a6', other: '#cfc8bc' };
/** Quiet runs the city at 45 frames a second. */
const POWER_PROFILE = { quietFps: 45 };
const QUALITY = { low: 800, medium: 1300, high: 2000 };
const ATTRIBUTION = '건물 buildings: 국토교통부 GIS건물통합정보 · 공공누리 제1유형(출처표시)';
/** Road widths in metres by class (motorway … tertiary); a link road is narrower. */
const ROAD_WIDTH = [22, 18, 15, 11, 8];
/** A one-way carriageway (half of a big road) of no known lane count. */
const ONE_WAY_WIDTH = [11.5, 10, 8.5, 7.5, 6];
const WATER = new THREE.Color('#3f74b3');
/** Roads are looked up by squares this wide (metres). */
const ROAD_CELL = 40;
export { ROAD_CELL };

/**
 * Gangnam Jarani (Seoul, for real): every building in the city at its true place and height,
 * from the national building register (public data, KOGL type 1), streamed
 * as map tiles while you fly over it or walk its streets.
 *
 * The world is the source's own grid in metres, moved so City Hall is the
 * origin: +X is east, −Z is north. The land (hills, and the Han where the
 * elevation model is level) and the main roads come from open data the
 * converter downloads; without them the ground is flat. Heights only shape
 * the ground: no elevation figure or coordinate is ever shown. Nothing here
 * is sent anywhere: districts you have visited are kept in this browser.
 */
export class SeoulGame {
  /** @param {HTMLElement} host @param {{ onClose?: () => void, base?: string }} [options] */
  constructor(host, { onClose = () => {}, base = './geo/seoul/', account = null } = {}) {
    this.account = account;
    this.host = host;
    this.onClose = onClose;
    this.base = base;
    this.tiles = new Map(); // key → { state, mesh?, foot?, place? }
    this.lands = new Map(); // key → { ground, roads? }: the land of every tile in view, built on or not
    this.queue = [];
    this.keys = new Set();
    this.mode = 'fly';
    this.pos = new THREE.Vector3(0, 260, 900);
    this.yaw = 0; // 0 looks north (−Z)
    this.pitch = -0.32;
    // The day goes by on its own: it starts at the time it is in Seoul now, and a whole day takes 24 minutes.
    const kst = new Date(Date.now() + 9 * 3600e3);
    this.hour = kst.getUTCHours() + kst.getUTCMinutes() / 60;
    this.quality = 'medium';
    this.visited = new Set();
    try {
      this.visited = new Set(JSON.parse(localStorage.getItem('gamory.seoul.visited') ?? '[]'));
      this.quality = localStorage.getItem('gamory.seoul.quality') ?? 'medium';
    } catch {
      /* private mode: nothing kept */
    }
    if (!QUALITY[this.quality]) this.quality = 'medium';
    window.seoul = this;
  }

  /* ----------------------------------------------------------------- open */

  async open() {
    this.root = el('div', 'seoul');
    this.root.tabIndex = -1;
    this.root.innerHTML = `
      <div class="seoul__stage" data-stage><canvas class="seoul__labels" data-labels></canvas></div>
      <header class="seoul__top">
        <div class="seoul__where"><b data-place>Seoul</b><small data-sub>서울특별시</small></div>
        <div class="seoul__stamps" data-stamps title="Districts you have visited"></div>
        <button type="button" class="seoul__x" data-close aria-label="Leave Gangnam Jarani">✕</button>
      </header>
      <div class="seoul__toast" data-toast role="status" aria-live="polite" hidden></div>
      <div class="seoul__msg" data-msg hidden></div>
      <aside class="seoul__places" data-places hidden></aside>
      <aside class="seoul__gfx" data-gfx hidden></aside>
      <footer class="seoul__bar">
        <div class="seoul__group">
          <button type="button" data-mode="fly" title="Fly over the city (F switches)">🛸 Fly</button>
          <button type="button" data-mode="walk" title="Walk the streets (F switches)">🚶 Walk</button>
          <button type="button" data-mode="drive" title="Drive: into the nearest car, or one brought to the road beside you">🚗 Drive</button>
          <button type="button" data-who title="Who you are on the street (V)">🧍</button>
          <button type="button" data-race title="Race bikes through real streets and alleys — alone against bots, or with up to four friends">🚲 Race</button>
          <button type="button" data-open-places title="Districts and tall buildings to go to (M)">🧭 Places</button>
          <button type="button" data-open-gfx title="Graphics: Quiet keeps your laptop cool (G)">⚙️ Graphics</button>
          <button type="button" data-help-button title="How to play (H)">❔ Help</button>
        </div>
        <span class="seoul__time" title="The time and weather in the city: they change by themselves"><span data-weather></span><span data-clock></span></span>
        <label class="seoul__quality">View<select data-quality aria-label="How far you can see"><option value="low">Near</option><option value="medium">Far</option><option value="high">Farthest</option></select></label>
        <span class="seoul__help" data-help></span>
      </footer>
      <p class="seoul__credit">${esc(ATTRIBUTION)}</p>`;
    this.host.append(this.root);
    const $ = (s) => this.root.querySelector(s);
    this.$ = $;
    $('[data-close]').addEventListener('click', () => this.close());
    for (const b of this.root.querySelectorAll('[data-mode]')) b.addEventListener('click', () => this.setMode(b.dataset.mode));
    $('[data-open-places]').addEventListener('click', () => this.togglePlaces());
    $('[data-open-gfx]').addEventListener('click', () => this.toggleGraphics());
    // How to play (H or I, the bar's ❔): the city stops drawing while it's up.
    this.help = new HelpPanel({
      host: this.root,
      id: 'seoul',
      table: CONTROLS,
      onOpen: () => {
        this.keys.clear();
        this.power?.setMenu('still');
      },
      onClose: () => {
        this.power?.setMenu('none');
        this.root.focus();
      }
    });
    $('[data-help-button]').addEventListener('click', () => this.help.open());
    $('[data-quality]').value = this.quality;
    $('[data-quality]').addEventListener('change', (e) => {
      this.quality = e.target.value;
      try {
        localStorage.setItem('gamory.seoul.quality', this.quality);
      } catch {
        /* private mode */
      }
      // The View list is the Graphics menu's draw distance too.
      const want = { low: 'near', medium: 'medium', high: 'far' }[this.quality];
      if (this.power && this.power.choices.distance !== want) this.power.set(setChoice(this.power.state, 'distance', want, POWER_PROFILE));
      this.root.focus();
    });
    this._scene($('[data-stage]'));
    this._showWeather();
    this._input($('[data-stage]'));
    this.street = new Street(this);
    this.street.whoButton = $('[data-who]');
    this.street.dress(this.street.who);
    $('[data-who]').addEventListener('click', () => this.street.switchPerson());
    this.race = new Race(this);
    $('[data-race]').addEventListener('click', () => this.race.menu());
    this.setMode('fly');
    this.setHour(this.hour);
    this._stamps();
    this.root.focus();
    this._last = performance.now();
    // Power: a capped loop (60, or 45 on Quiet), stopped in a hidden tab; the sun's shadows and AO on the menu.
    this.power = new PowerKit('seoul', { renderer: this.renderer, profile: POWER_PROFILE, features: { grass: false, ao: true, rays: false, shadows: true }, onChange: () => this.applyPower() });
    this.applyPower();
    // The soundtrack (docs/music.md): Neon Overpass while racing and while driving at night; otherwise the
    // city is left to its own sounds (the engine, the horn). On/off and volume are in the Graphics panel.
    this.music = new GameMusic('seoul', { settle: 2.5, hold: 0 });
    this.power.start((ms, now) => this._frame(now));
    // The index says which tiles exist; without it the map was never converted.
    try {
      const r = await fetch(`${this.base}index.json`);
      if (!r.ok) throw new Error(String(r.status));
      this.index = await r.json();
      this.index.landmarks = (this.index.landmarks ?? []).map((l) => ({ ...l, wx: l.x - ORIGIN.x, wz: -(l.y - ORIGIN.y) }));
      // The land and the roads, if the converter had them: both are needed before anything is built on them.
      const bin = (name) => fetch(`${this.base}${name}`).then((x) => (x.ok ? x.arrayBuffer() : null)).catch(() => null);
      const [terrain, roads] = await Promise.all([this.index.terrain ? bin('terrain.bin') : null, this.index.roads ? bin('roads.bin') : null]);
      if (terrain) this._terrain(terrain);
      if (roads) this._roads(roads);
      // The small streets round the bike courses (alleys.bin, if converted): planned on and walked, not drawn here.
      const alleys = this.roadTiles ? await bin('alleys.bin') : null;
      if (alleys) this._alleys(alleys);
      if (this.terrain) {
        this.ground.visible = false;
        this.pos.y += this.groundAt(this.pos.x, this.pos.z);
      }
      for (const l of this.index.landmarks) if (l.tower) this._tower(l);
      // A short credit always on screen; each source's full notice is in the Places panel.
      this.$('.seoul__credit').textContent = [ATTRIBUTION, this.terrain ? '지형 terrain: Copernicus DEM (EU / ESA)' : '', this.roadTiles ? '도로 roads: © OpenStreetMap contributors' : '', '자동차 car: Car Concept, Eric Chadwick / Khronos (CC BY 4.0)', this.alleyCount ? '골목 small streets: © OpenStreetMap contributors' : '', '스쿠터 scooter: polyfork.dev (CC BY 4.0)', ...streetCredits(), '보도 paving: ambientCG PavingStones152 (CC0)', '벽 walls: ambientCG.com (CC0)'].filter(Boolean).join(' · ');
      this.ready = true;
      // Gangnam Jarani opens on its races; close the menu to fly, walk and drive the city.
      this.race.menu();
      this.help.openFirstTime();
    } catch {
      this._message('<b>Seoul\'s map isn\'t installed on this server yet.</b><br>Download 국토교통부 GIS건물통합정보 for 서울특별시 (file <code>AL_D010_11_…</code>, free, KOGL type 1) into <code>library/Seoul_Map.zip/</code> or <code>data/geo/seoul/</code>, then run <code>npm run geo:seoul</code> and open this again.');
    }
    return this;
  }

  /** Graphics: the draw distance is the View (how far tiles load: the streaming ring), people beyond it aren't drawn, bloom on or off. */
  applyPower() {
    const c = this.power.choices;
    const q = { near: 'low', medium: 'medium', far: 'high' }[c.distance];
    if (q !== this.quality) {
      this.quality = q;
      const sel = this.$?.('[data-quality]');
      if (sel) sel.value = q;
    }
    this.lifeFar = { near: 110, medium: 170, far: 200 }[c.distance];
    this.bloomOn = c.bloom;
    // The sun's shadows: off on the low tier; a smaller map on Near shadows. AO on the high tier only.
    const shadows = c.shadows !== 'off' && q !== 'low';
    if (shadows !== this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.enabled = shadows;
      this.sun.castShadow = shadows;
      this.scene.traverse((o) => o.material && (o.material.needsUpdate = true));
    }
    const size = c.shadows === 'full' && q === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.shadowBox = size > 1024 ? 90 : 60;
    if (this.gtao) this.gtao.enabled = Boolean(c.ao) && q === 'high';
    this.power.invalidate();
  }

  /** The Graphics panel (G, or the bar's button). */
  toggleGraphics(open) {
    const box = this.$('[data-gfx]');
    const show = open ?? box.hidden;
    box.hidden = !show;
    if (show) box.replaceChildren(this.power.menu(), musicMenu());
    this.root.focus();
  }

  close() {
    this.music?.dispose();
    this.power?.dispose();
    this._resize?.disconnect();
    window.removeEventListener('keydown', this._down, true);
    window.removeEventListener('keyup', this._up, true);
    for (const t of this.tiles.values()) this._free(t);
    this.tiles.clear();
    for (const l of this.lands.values()) for (const m of [l.ground, l.roads, l.walks, l.trees, l.lamps, l.walls]) m?.geometry?.dispose();
    this.lands.clear();
    this.race?.dispose();
    this.street?.dispose();
    this.weather?.dispose();
    this.life?.dispose();
    this.composer?.dispose();
    this.renderer?.dispose();
    this.root?.remove();
    if (window.seoul === this) delete window.seoul;
    this.onClose();
  }

  _message(html) {
    const m = this.$('[data-msg]');
    m.hidden = !html;
    m.innerHTML = html ?? '';
  }

  toast(text) {
    const t = this.$('[data-toast]');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => (t.hidden = true), 3200);
  }

  /* ---------------------------------------------------------------- scene */

  _scene(stage) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // AgX: film-like, keeps the signs' strong colours from going neon (render-quality.md §2).
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    // The sun's shadows, in a box round you (on where the Graphics choice allows: applyPower).
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'seoul__canvas';
    stage.prepend(this.canvas);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#b9d4ee', 400, 2200);
    this.camera = new THREE.PerspectiveCamera(58, 1, 1, 9000);
    this.hemi = new THREE.HemisphereLight('#dcecff', '#6a6458', 1.15);
    this.sun = new THREE.DirectionalLight('#fff3dc', 2.1);
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.06;
    this.sun.shadow.radius = 2;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    // Weather: rain, storms, snow and fog, round the camera.
    this.weather = new Weather(this.scene);
    this.weather.auto = true;
    this.weather.onChange = () => this._showWeather();
    for (const k of ['rain', 'snow', 'fog', 'wet']) this.weather.level[k] = WEATHERS[this.weather.kind][k];
    // Bright windows, signs, lamps and headlights glow (bloom), most at night.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Ambient occlusion (the shadow line in every window reveal, under signs and sills), on the high tier.
    this.gtao = new GTAOPass(this.scene, this.camera, 640, 360);
    this.gtao.updateGtaoMaterial({ radius: 1.6, distanceExponent: 1.5, thickness: 2, scale: 1.2, samples: 12 });
    this.gtao.blendIntensity = 0.9;
    this.gtao.enabled = false;
    this.composer.addPass(this.gtao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 1.05);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new ShaderPass(GradeShader));
    // The ground: flat, with a faint block pattern so speed and distance can be felt.
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#93a08c';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,0.10)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(60000 / 100, 60000 / 100);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tex }));
    this.scene.add(this.ground);
    // One material for every building: its colour per vertex, windows drawn by the shader.
    this.uniforms = { uNight: { value: 0 }, uWet: { value: 0 }, uSkyTop: { value: new THREE.Color('#5b8fd6') }, uSkyLow: { value: new THREE.Color('#bcd4ea') } };
    this.wind = { uTime: { value: 0 }, uWind: { value: 0.5 } };
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    // The sky: deep overhead, hazy at the horizon, a glow round the sun.
    this.sky = skyDome(this.uniforms);
    this.scene.add(this.sky);
    this.signs = signAtlas();
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uNight = this.uniforms.uNight;
      shader.uniforms.uSigns = { value: this.signs };
      shader.uniforms.uSkyTop = this.uniforms.uSkyTop;
      shader.uniforms.uSkyLow = this.uniforms.uSkyLow;
      // Near walls in real materials: red brick, small tiles, render (ambientCG, CC0).
      shader.uniforms.uBrick = { value: texture('Bricks105', 'Color') };
      shader.uniforms.uRender = { value: texture('Concrete034', 'Color') };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aWall;\nattribute vec2 aKind;\nvarying vec3 vWall;\nvarying vec2 vKind;\nvarying vec3 vWorldN;\nvarying vec3 vWorldPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWall = aWall;\nvKind = aKind;\nvWorldN = normal;\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uNight;\nuniform sampler2D uSigns;\nuniform sampler2D uBrick;\nuniform sampler2D uRender;\nuniform vec3 uSkyTop;\nuniform vec3 uSkyLow;\nvarying vec3 vWall;\nvarying vec2 vKind;\nvarying vec3 vWorldN;\nvarying vec3 vWorldPos;\nfloat seoulLit = 0.0;\nvec3 seoulGlow = vec3(0.0);\nfloat seoulHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\nvec3 seoulRoom(vec2 f, vec3 Vt, float seed, float night, float lit) {\n  // Interior mapping: the window is the front of a room; follow the view ray in to its back wall, ceiling, floor or side.\n  vec3 v = normalize(Vt);\n  float tx = (v.x > 0.0 ? 1.0 - f.x : f.x) / max(1e-3, abs(v.x));\n  float ty = (v.y > 0.0 ? 1.0 - f.y : f.y) / max(1e-3, abs(v.y));\n  float tz = 0.85 / max(1e-3, v.z);\n  float t = min(min(tx, ty), tz);\n  vec3 h = vec3(f, 0.0) + v * t;\n  vec3 wallC = mix(vec3(0.78, 0.74, 0.68), vec3(0.62, 0.68, 0.74), step(0.5, seed));\n  vec3 col;\n  if (t == tz) {\n    col = wallC * (0.75 + 0.25 * h.y);\n    col = mix(col, vec3(0.32, 0.3, 0.3), step(0.22, h.y) * step(h.y, 0.34) * step(0.15, fract(h.x * 1.7 + seed)) * 0.8);\n  } else if (t == ty) {\n    if (v.y > 0.0) {\n      col = vec3(0.86, 0.86, 0.84);\n      float panel = step(0.55, fract(h.x * 2.0 + 0.25)) * step(0.5, fract(h.z * 2.4));\n      col += panel * lit * vec3(1.4, 1.3, 1.1);\n    } else col = vec3(0.4, 0.37, 0.34) * (0.8 + 0.4 * seed);\n  } else {\n    col = wallC * 0.82;\n  }\n  // Day: a room is darker than outside; night: unlit rooms dark, lit ones bright.\n  float bright = mix(0.42, mix(0.05, 1.15, lit), night);\n  return col * bright;\n}')
        .replace('#include <color_fragment>', `#include <color_fragment>
          if (vWall.x >= 0.0) {
            // What it is: 0 house · 1 apartment · 2 shop · 3 office · 4 public · 5 industry · 6 other; and how tall.
            float kind = vKind.x;
            float tall = vKind.y;
            float far = smoothstep(350.0, 1300.0, length(vViewPosition));
            // Glass towers: about half the tall offices (the rest stone with punched windows), and the very tallest.
            bool curtain = kind != 1.0 && kind != 0.0 && ((kind == 3.0 && tall > 22.0 && fract(vWall.z * 5.3) < 0.5) || tall > 90.0);
            bool flats = kind == 1.0;
            // Close up, the wall is a real material: the low red buildings brick, the grey-brown ones small
            // tiles, the rest render — its grain and colour, fading out with distance.
            float nearT = 1.0 - smoothstep(50.0, 240.0, length(vViewPosition));
            if (nearT > 0.0 && !curtain && tall < 25.0 && kind != 1.0) {
              float seedW = vWall.z;
              vec2 wuv = vec2(vWall.x, vWall.y);
              if (seedW < 0.2) {
                vec3 brick = texture2D(uBrick, wuv / 1.6).rgb;
                // (Until the texture is in, it samples black: leave the wall as it is.)
                diffuseColor.rgb = mix(diffuseColor.rgb, brick * vec3(1.18, 1.05, 1.0), nearT * 0.85 * step(0.03, brick.r + brick.g));
              } else if (seedW < 0.4) {
                vec3 tile = texture2D(uBrick, wuv / 0.7).rgb;
                float l = max(dot(tile, vec3(0.333)), 0.35 * step(dot(tile, vec3(0.333)), 0.01));
                diffuseColor.rgb *= mix(1.0, 0.55 + l * 1.3, nearT * 0.7);
              } else {
                float l = dot(texture2D(uRender, wuv / 3.0).rgb, vec3(0.333));
                l = l < 0.01 ? 0.45 : l;
                diffuseColor.rgb *= mix(1.0, 0.6 + l * 0.9, nearT * 0.6);
              }
            }
            float floorH = flats ? 2.8 : curtain ? 3.8 : 3.3;
            float bay = curtain ? 1.6 : flats ? 3.6 : 3.2;
            vec2 cell = vec2(vWall.x / bay, vWall.y / floorH);
            vec2 f = fract(cell);
            vec2 id = floor(cell);
            float r = seoulHash(id + vWall.z * 31.0);
            // Glass: the sky in it by day (lighter higher up), dark at night.
            float tint = fract(vWall.z * 13.7);
            vec3 tone = tint < 0.3 ? vec3(0.1, 0.17, 0.25) : tint < 0.5 ? vec3(0.1, 0.19, 0.19) : tint < 0.8 ? vec3(0.09, 0.11, 0.14) : vec3(0.17, 0.14, 0.11);
            // Glass reflects: the sky above, the street and the buildings across it below the horizon,
            // more of it at a glancing angle — what makes a glass tower look like glass.
            vec3 V = normalize(vWorldPos - cameraPosition);
            vec3 N = normalize(vWorldN);
            vec3 Rf = reflect(V, N);
            float fres = 0.18 + 0.82 * pow(1.0 - clamp(dot(-V, N), 0.0, 1.0), 3.0);
            float across = mix(seoulHash(vec2(floor(atan(Rf.z, Rf.x) * 7.0), 3.0)), 0.5, 1.0 - far * 0.0) * 0.6 + 0.2;
            vec3 city = mix(uSkyLow * 0.45, vec3(0.36, 0.35, 0.33), across) * (0.6 + 0.4 * (1.0 - uNight));
            float cityTop = 0.03 + 0.1 * across;
            vec3 refl = mix(city, mix(uSkyLow, uSkyTop, sqrt(clamp((Rf.y - cityTop) / (1.0 - cityTop), 0.0, 1.0))), smoothstep(cityTop - 0.03, cityTop + 0.03, Rf.y));
            vec3 glass = mix(tone, refl, fres * (curtain ? 0.8 : 0.6));
            glass = mix(glass, vec3(0.04, 0.05, 0.08) + refl * 0.15, uNight * 0.85);
            // Near, the glass has rooms behind it (interior mapping), lit or not, under the reflection.
            vec3 Tw = normalize(cross(vec3(0.0, 1.0, 0.0), N));
            vec3 Vt = vec3(dot(V, Tw), dot(V, vec3(0.0, 1.0, 0.0)), max(0.05, dot(V, -N)));
            float roomNear = (1.0 - far) * (1.0 - smoothstep(120.0, 420.0, length(vViewPosition)));
            float roomLit = step(1.0 - (0.25 + 0.3 * fract(vWall.z * 7.3 + 0.35)), r);
            vec3 room = seoulRoom(f, Vt, fract(r * 7.1), uNight, roomLit);
            glass = mix(glass, mix(room * mix(vec3(1.0), tone * 4.0, 0.35), refl, fres * (curtain ? 0.75 : 0.55)), roomNear);
            float win = 0.0;
            bool office = !curtain && !flats && kind != 0.0 && tall >= 15.0;
            // The top: a plain parapet band, no windows.
            float parapet = step(tall - 1.8, vWall.y);
            if (curtain) {
              // A curtain wall: glass with thin mullions and a band at each floor; each pane a touch different.
              bool fins = fract(vWall.z * 3.1) < 0.5;
              float mull = fins ? step(0.16, f.x) * step(0.05, f.y) : step(0.05, f.x) * step(0.12, f.y);
              win = mull * (1.0 - parapet);
              vec3 pane = glass * (0.92 + 0.12 * r * (1.0 - far)) * (fins ? vec3(0.78, 0.85, 1.0) : vec3(1.0));
              if (fins) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.9, 0.88), 0.85);
              // Mullions and floor bands in aluminium, a little of the building's own colour in them.
              diffuseColor.rgb = mix(mix(vec3(0.6, 0.62, 0.65), diffuseColor.rgb, 0.3) * 0.85, pane, win * 0.96);
            } else if (flats) {
              // Flats: a long window band with a pale balcony rail below it on every floor.
              win = step(0.08, f.x) * step(f.x, 0.92) * step(0.38, f.y) * step(f.y, 0.86) * (1.0 - parapet);
              float rail = step(0.3, f.y) * step(f.y, 0.36);
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.92, 0.88), 0.55);
              diffuseColor.rgb = mix(diffuseColor.rgb, glass, win * 0.85 * (1.0 - far));
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.98), rail * 0.6 * (1.0 - far));
            } else if (office) {
              // An office tower in stone or precast: rows and rows of small punched windows, 1.5 m apart.
              vec2 oc = vec2(vWall.x / 1.55, vWall.y / 3.6);
              vec2 of = fract(oc);
              id = floor(oc);
              r = seoulHash(id + vWall.z * 31.0);
              win = step(0.2, of.x) * step(of.x, 0.8) * step(0.3, of.y) * step(of.y, 0.84) * (1.0 - parapet);
              // A lintel's shadow on the glass, a sill's light below it.
              float sill = step(0.24, of.y) * step(of.y, 0.3) * step(0.18, of.x) * step(of.x, 0.82);
              diffuseColor.rgb = mix(diffuseColor.rgb, glass * (1.0 - 0.35 * step(0.76, of.y)), win * mix(0.95, 0.55, far));
              diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.18, sill * (1.0 - far));
              f = of;
            } else {
              win = step(0.2, f.x) * step(f.x, 0.8) * step(0.3, f.y) * step(f.y, 0.78) * (1.0 - parapet);
              diffuseColor.rgb = mix(diffuseColor.rgb, glass, win * 0.8 * (1.0 - far));
            }
            diffuseColor.rgb *= 1.0 + 0.07 * parapet;
            // A big screen on some tall stone towers, as Seoul's main streets have: a poster by day, lit at night.
            if (office && tall > 45.0 && vWall.z < 0.3) {
              float face = floor((vWall.x - 1000.0) / 26.0);
              vec2 bp = vec2(fract((vWall.x - 1000.0) / 26.0), (vWall.y - tall * 0.38) / (tall * 0.22));
              if (seoulHash(vec2(face, vWall.z * 71.0)) < 0.35 && bp.x > 0.2 && bp.x < 0.72 && bp.y > 0.0 && bp.y < 1.0) {
                float pick = floor(seoulHash(vec2(face, vWall.z * 13.0)) * 16.0);
                vec2 uv = vec2((mod(pick, 4.0) + (bp.x - 0.2) / 0.52) / 4.0, (floor(pick / 4.0) + 1.0 - bp.y) / 4.0);
                vec3 ad = texture2D(uSigns, uv).rgb;
                float frame = step(0.03, (bp.x - 0.2) / 0.52) * step((bp.x - 0.2) / 0.52, 0.97) * step(0.03, bp.y) * step(bp.y, 0.97);
                diffuseColor.rgb = mix(vec3(0.1), ad, frame);
                seoulGlow += ad * frame * (0.12 + uNight * 0.6);
                win = 0.0;
              }
            }
            // Depth: a slab edge at every floor, a shadow under each lintel, grime low down.
            if (!curtain) {
              diffuseColor.rgb *= 1.0 - 0.18 * step(f.y, 0.06) * (1.0 - parapet);
              diffuseColor.rgb *= 1.0 - 0.35 * win * step(flats ? 0.76 : 0.68, f.y);
              diffuseColor.rgb *= mix(0.97, 1.03, step(0.5, fract(id.x * 0.25)));
            }
            diffuseColor.rgb *= mix(0.78, 1.0, smoothstep(0.0, 14.0, vWall.y));
            // Lit windows at night: one in five to two in five, mostly warm, a few cool or TV-blue, dimmer far off.
            float on = step(1.0 - (0.2 + 0.22 * fract(vWall.z * 7.3 + 0.35)), r);
            float hue = seoulHash(id * 1.7 + 3.1);
            vec3 warm = hue < 0.62 ? vec3(1.0, 0.72, 0.42) : hue < 0.85 ? vec3(1.0, 0.86, 0.66) : hue < 0.95 ? vec3(0.7, 0.82, 1.0) : vec3(0.55, 0.65, 1.0);
            float lamp = 0.55 + 0.45 * seoulHash(id + 9.0);
            // The window's lit glass is brightest in the middle (a lamp in the room, curtains at the sides).
            float inner = win * (0.6 + 0.4 * (1.0 - abs(f.x - 0.5) * 2.0));
            seoulGlow += warm * uNight * mix(inner * on * lamp, 0.05, far) * 0.42;
            // Street level, far off: shop glass on the ground floor, lit warm at night, some shut. (No
            // signs out here: near the course facades.js puts each shop's own sign over it.)
            bool street = (kind == 2.0 || kind == 6.0 || kind == 3.0 || (kind == 0.0 && vWall.z > 0.55)) && vWall.y < 3.3 && far < 0.9;
            if (street) {
              float pane = step(0.06, fract(vWall.x / 2.4)) * step(0.15, vWall.y / 3.3);
              float open = step(0.3, seoulHash(vec2(floor(vWall.x / 7.0), vWall.z * 53.0)));
              diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.12, 0.14, 0.16), mix(vec3(0.32, 0.33, 0.35), vec3(0.45, 0.38, 0.28), open), uNight), pane * 0.9);
              seoulGlow += vec3(1.0, 0.8, 0.58) * pane * uNight * open * 0.28;
            }
            seoulLit = 0.0;
          } else {
            // A roof: darker, flatter.
            diffuseColor.rgb *= 0.85;
          }`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += seoulGlow;');
    };
    this.buildings = new THREE.Group();
    this.scene.add(this.buildings);
    this.labels = this.root.querySelector('[data-labels]');
    this.lctx = this.labels.getContext('2d');
    const fit = () => {
      if (!this.renderer) return;
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      this.renderer.setSize(w, h, false);
      this.composer?.setSize(w, h);
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.labels.width = Math.round(w * dpr);
      this.labels.height = Math.round(h * dpr);
      this.size = { w, h, dpr };
    };
    this._resize = new ResizeObserver(fit);
    this._resize.observe(stage);
    fit();
  }

  /** The hour, 0–24: where the sun is, the sky's colour, and whether windows are lit. */
  setHour(hour) {
    this.hour = ((hour % 24) + 24) % 24;
    const day = Math.max(0, Math.sin(((this.hour - 6) / 12) * Math.PI)); // 0 at 6 and 18, 1 at noon
    const night = 1 - Math.min(1, day * 2.4);
    const dusk = day > 0 ? Math.max(0, 1 - Math.abs(day - 0.18) * 5) : 0; // only while the sun is low, not all night
    // The blue hour: the sun just down or just up, the sky a clear deep blue (BLDG_5), not grey.
    const s = Math.sin(((this.hour - 6) / 12) * Math.PI);
    const blue = Math.max(0, 1 - Math.abs(s - 0.02) * 6);
    // The horizon's colour (the dome deepens it overhead): hazy blue by day, warm at golden hour, deep blue at dusk.
    const sky = new THREE.Color('#0b1226').lerp(new THREE.Color('#9cc4ea'), Math.min(1, day * 3.5)).lerp(new THREE.Color('#f4b070'), dusk * 0.5 * (1 - blue)).lerp(new THREE.Color('#7d93c4'), blue * 0.8);
    this.skyBase = sky.clone();
    this.scene.background = sky;
    this.scene.fog.color.copy(sky);
    const a = ((this.hour - 6) / 12) * Math.PI;
    // A Seoul sun: about 45° up at noon (between winter's 29° and summer's 76°), low and long-shadowed late on.
    this.sunDir = new THREE.Vector3(Math.cos(a) * 0.85, Math.max(0.1, Math.sin(a) * 0.82), 0.5).normalize();
    // Sunlight several times the sky's light, so shadows read; warm and still strong at golden hour.
    // At night: a little cold moonlight, the city lit by its own windows, signs and lamps.
    this.sun.intensity = 0.08 + 3.1 * Math.min(1, day * 3) ** 0.7;
    this.sun.color.set('#fff1d8').lerp(new THREE.Color('#ffa055'), dusk).lerp(new THREE.Color('#9fb4ff'), Math.max(0, (night - 0.6) / 0.4) * 0.7);
    this.hemi.intensity = 0.14 + 0.62 * Math.sqrt(day);
    // Shade is lit by the blue sky: cooler as the sun gets low and warm (golden hour's blue shadows).
    this.hemi.color.set('#dcecff').lerp(new THREE.Color('#8fb0e6'), dusk * 0.8);
    this.hemi.groundColor.set('#6a6458').lerp(new THREE.Color('#7a5a44'), dusk * 0.6);
    this.hemiBase = this.hemi.intensity;
    this.sunBase = this.sun.intensity;
    this.uniforms.uNight.value = night;
    if (this.sky) {
      const u = this.sky.userData.u;
      u.uSunDir.value.copy(this.sunDir);
      u.uSunCol.value.copy(this.sun.color);
      u.uDusk.value = Math.max(dusk * (1 - blue), blue * 0.35);
    }
    if (this.lampMat) this.lampMat.emissiveIntensity = night * 3;
    this.ground.material.color.setScalar(0.5 + Math.min(1, day * 1.6) * 0.7);
    const h = Math.floor(this.hour);
    this.$('[data-clock]').textContent = `${String(h).padStart(2, '0')}:${String(Math.round((this.hour - h) * 60)).padStart(2, '0')}`;
  }

  /* ---------------------------------------------------------------- tiles */

  /** Load what is near, drop what is far: called every frame, does a little each time. */
  _stream() {
    if (!this.ready) return;
    const reach = QUALITY[this.quality] + (this.mode === 'fly' ? Math.min(1200, this.pos.y * 1.2) : 0);
    const [ctx, cty] = tileOf(this.pos.x + ORIGIN.x, -this.pos.z + ORIGIN.y);
    const span = Math.ceil(reach / TILE);
    const want = new Map();
    const land = new Map();
    for (let dx = -span; dx <= span; dx++) {
      for (let dy = -span; dy <= span; dy++) {
        const d = Math.hypot(dx, dy) * TILE;
        const key = tileKey(ctx + dx, cty + dy);
        if (d > reach) continue;
        if (this.index.tiles[key]) want.set(key, d);
        if (this.terrain) land.set(key, d);
      }
    }
    // The land of every tile in view (hills and water have no buildings): a few a frame, nearest first.
    for (const [key, l] of this.lands) {
      if (land.has(key)) continue;
      for (const m of [l.ground, l.roads, l.walks, l.trees, l.lamps, l.walls]) {
        if (!m) continue;
        this.scene.remove(m);
        // Trees and lamps share their shapes across tiles: free only their own instance data.
        if (m.isInstancedMesh) m.dispose();
        else if (m.isGroup) m.children.forEach((c) => c.dispose?.());
        else m.geometry.dispose();
        for (const [cell, seg] of m.userData.owned ?? []) {
          const list = this.roadHash.get(cell);
          const at = list?.indexOf(seg) ?? -1;
          if (at >= 0) list.splice(at, 1);
        }
      }
      this.lands.delete(key);
    }
    let made = 0;
    for (const [key] of [...land].filter(([k]) => !this.lands.has(k)).sort((a, b) => a[1] - b[1])) {
      if (made++ >= 6) break;
      this.lands.set(key, this._land(key));
    }
    for (const [key, t] of this.tiles) {
      if (want.has(key)) continue;
      this._free(t);
      this.tiles.delete(key);
    }
    const fogK = this.weather?.level.fog ?? 1;
    // Aerial haze from a couple of hundred metres (BLDG_1: the far towers blue-grey), farther up high.
    const lift = Math.max(0, this.camera.position.y - (this.groundAt?.(this.camera.position.x, this.camera.position.z) ?? 0));
    this.scene.fog.near = Math.min(reach * 0.45, 140 + lift * 1.5) * fogK * fogK;
    this.scene.fog.far = reach * 1.2 * fogK;
    this.camera.far = reach * 1.6 + 2000;
    this.camera.updateProjectionMatrix();
    // Nearest first, a few fetches at a time.
    const missing = [...want].filter(([key]) => !this.tiles.has(key)).sort((a, b) => a[1] - b[1]);
    let loading = [...this.tiles.values()].filter((t) => t.state === 'loading').length;
    for (const [key] of missing) {
      if (loading >= 6) break;
      loading++;
      const t = { key, state: 'loading' };
      this.tiles.set(key, t);
      fetch(`${this.base}${key}.bin`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))).then((buf) => {
        if (this.tiles.get(key) !== t) return;
        t.data = decodeTile(new Uint8Array(buf));
        t.state = 'fetched';
      }).catch(() => {
        t.state = 'failed';
      });
    }
    // Building a tile's mesh takes a moment: one a frame, the nearest first.
    const ready = [...this.tiles.values()].filter((t) => t.state === 'fetched').sort((a, b) => (want.get(a.key) ?? 0) - (want.get(b.key) ?? 0))[0];
    if (ready) this._build(ready);
    this.loadingCount = missing.length + (ready ? 1 : 0);
  }

  _free(t) {
    if (t.mesh) {
      this.buildings.remove(t.mesh);
      t.mesh.geometry.dispose();
    }
    t.mesh = null;
    t.foot = null;
    t.data = null;
  }

  /** A tile's buildings as one mesh: walls and flat roofs, a colour each, and where its windows go. */
  _build(t) {
    const [tx, ty] = t.key.split('_').map(Number);
    const ox = tx * TILE - ORIGIN.x;
    const oz = -(ty * TILE - ORIGIN.y);
    const pos = [];
    const nor = [];
    const col = [];
    const wall = [];
    const kinds = [];
    const foot = [];
    const color = new THREE.Color();
    const roof = new THREE.Color();
    let seedBase = (tx * 73856093) ^ (ty * 19349663);
    for (const b of t.data.buildings) {
      const n = b.ring.length / 2;
      const h = b.height;
      seedBase = (seedBase * 1664525 + 1013904223) | 0;
      const seed = ((seedBase >>> 8) & 0xffff) / 0xffff;
      color.set(PALETTE[USES[b.use]] ?? PALETTE.other).offsetHSL((seed - 0.5) * 0.04, (seed - 0.5) * 0.08, (seed - 0.5) * 0.16 - (h > 60 ? 0.05 : 0));
      // Low buildings: some brick-red, some stone, some grey render — not all one pale.
      // Office towers in stone and precast, as downtown's are: brown, beige, white, grey, sandstone, charcoal.
      if (h >= 20 && ['office', 'public', 'other', 'shop'].includes(USES[b.use])) color.set(['#8c6b55', '#c8b79f', '#e6e3dc', '#9aa1a8', '#b59a7e', '#6d727a', '#ddd6c8'][Math.floor(seed * 7)]).offsetHSL(0, 0, (seed * 7 % 1 - 0.5) * 0.06);
      else if (h < 25 && USES[b.use] !== 'apartment') color.lerp(new THREE.Color(['#a65a44', '#8c8478', '#b8b2a8', '#d9d2c4', '#6f6a66'][Math.floor(seed * 5)]), 0.55);
      roof.copy(color).multiplyScalar(0.8).lerp(new THREE.Color('#8a8f96'), 0.35);
      // World points: east is +X, north is −Z.
      const xs = new Float32Array(n);
      const zs = new Float32Array(n);
      let minx = Infinity;
      let maxx = -Infinity;
      let minz = Infinity;
      let maxz = -Infinity;
      for (let i = 0; i < n; i++) {
        xs[i] = ox + b.ring[i * 2];
        zs[i] = oz - b.ring[i * 2 + 1];
        minx = Math.min(minx, xs[i]);
        maxx = Math.max(maxx, xs[i]);
        minz = Math.min(minz, zs[i]);
        maxz = Math.max(maxz, zs[i]);
      }
      // It stands on the land: its top is its height above the ground at its middle; its walls reach down to the lowest corner.
      let low = Infinity;
      for (let i = 0; i < n; i++) low = Math.min(low, this.groundAt(xs[i], zs[i]));
      const base = low - 1.5;
      const top = this.groundAt((minx + maxx) / 2, (minz + maxz) / 2) + b.height;
      // (base, top, kind, seed, where its walls' u starts and which way: for the near facades, facades.js)
      foot.push({ minx, maxx, minz, maxz, xs, zs, h: b.height, name: b.name, base, top, kind: Math.max(0, USES.indexOf(USES[b.use] ?? 'other')), seed, start: seed * 3.2, flip: 0 });
      const kind = Math.max(0, USES.indexOf(USES[b.use] ?? 'other'));
      let area = 0;
      for (let i = 0; i < n; i++) area += xs[i] * zs[(i + 1) % n] - xs[(i + 1) % n] * zs[i];
      const flip = area > 0 ? -1 : 1;
      foot.at(-1).flip = flip;
      let along = seed * 3.2;
      // Where its walls are in the tile's mesh (the near facades hide them: hideWalls).
      foot.at(-1).v0 = pos.length / 3;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const dx = xs[j] - xs[i];
        const dz = zs[j] - zs[i];
        const len = Math.hypot(dx, dz) || 1;
        // The ring runs counter-clockwise seen from above (north up), so this points outward.
        const nx = -dz / len;
        const nz = dx / len;
        const u0 = along * flip + 1000;
        const u1 = (along + len) * flip + 1000;
        along = u1;
        pos.push(xs[i], base, zs[i], xs[j], base, zs[j], xs[j], top, zs[j], xs[i], base, zs[i], xs[j], top, zs[j], xs[i], top, zs[i]);
        for (let k = 0; k < 6; k++) nor.push(nx, 0, nz);
        // Darker at the foot: a cheap shadow where walls meet the street.
        for (const top of [0, 0, 1, 0, 1, 1]) col.push(color.r * (top ? 1 : 0.78), color.g * (top ? 1 : 0.78), color.b * (top ? 1 : 0.78));
        wall.push(u0, 0, seed, u1, 0, seed, u1, h, seed, u0, 0, seed, u1, h, seed, u0, h, seed);
        for (let k = 0; k < 6; k++) kinds.push(kind, h);
      }
      foot.at(-1).v1 = pos.length / 3;
      const contour = [];
      for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(xs[i], zs[i]));
      for (let [a, c, d] of THREE.ShapeUtils.triangulateShape(contour, [])) {
        // Facing the sky, whichever way the triangulation wound it (else the roof is lit from below).
        if ((zs[c] - zs[a]) * (xs[d] - xs[a]) - (xs[c] - xs[a]) * (zs[d] - zs[a]) < 0) [c, d] = [d, c];
        pos.push(xs[a], top, zs[a], xs[c], top, zs[c], xs[d], top, zs[d]);
        for (let k = 0; k < 3; k++) {
          nor.push(0, 1, 0);
          col.push(roof.r, roof.g, roof.b);
          wall.push(-1, 0, seed);
          kinds.push(kind, h);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('aWall', new THREE.Float32BufferAttribute(wall, 3));
    geo.setAttribute('aKind', new THREE.Float32BufferAttribute(kinds, 2));
    geo.computeBoundingSphere();
    t.mesh = new THREE.Mesh(geo, this.material);
    t.mesh.castShadow = t.mesh.receiveShadow = true;
    this.buildings.add(t.mesh);
    t.foot = foot;
    t.place = t.data.place;
    t.count = t.data.buildings.length;
    t.data = null;
    t.state = 'ready';
  }

  /* ----------------------------------------------- the land, roads, a tower */

  /** Read terrain.bin: a grid of ground heights (and where there is water) over the whole city. */
  _terrain(buf) {
    const v = new DataView(buf);
    if (v.getUint32(0, true) !== 0x544f4553) return;
    const cols = v.getUint16(14, true);
    const rows = v.getUint16(16, true);
    this.terrain = {
      x0: v.getInt32(4, true) - ORIGIN.x, y0: v.getInt32(8, true) - ORIGIN.y, cell: v.getUint16(12, true), cols, rows,
      h: new Uint16Array(buf, 24, cols * rows), water: new Uint8Array(buf, 24 + cols * rows * 2, cols * rows)
    };
  }

  /** How high the ground is at a point, in the world's metres (0 everywhere without terrain). */
  groundAt(x, z) {
    const t = this.terrain;
    if (!t) return 0;
    const fx = Math.max(0, Math.min(t.cols - 1.001, (x - t.x0) / t.cell));
    const fy = Math.max(0, Math.min(t.rows - 1.001, (-z - t.y0) / t.cell));
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    const u = fx - i;
    const w = fy - j;
    const at = (a, b) => t.h[b * t.cols + a];
    return (at(i, j) * (1 - u) * (1 - w) + at(i + 1, j) * u * (1 - w) + at(i, j + 1) * (1 - u) * w + at(i + 1, j + 1) * u * w) / 10;
  }

  /** Whether a point is on water (the Han, a stream, a lake). */
  waterAt(x, z) {
    const t = this.terrain;
    if (!t) return false;
    const i = Math.round((x - t.x0) / t.cell);
    const j = Math.round((-z - t.y0) / t.cell);
    return i >= 0 && j >= 0 && i < t.cols && j < t.rows && t.water[j * t.cols + i] === 1;
  }

  /** One tile's land: the ground as a mesh coloured by what it is, and the roads that cross it. */
  _land(key) {
    const [tx, ty] = key.split('_').map(Number);
    const t = this.terrain;
    const ox = tx * TILE - ORIGIN.x;
    const oy = ty * TILE - ORIGIN.y;
    const n = TILE / t.cell; // cells across
    const pos = [];
    const col = [];
    const idx = [];
    const c = new THREE.Color();
    const town = new THREE.Color('#8f8b85');
    const wood = new THREE.Color('#4f7d48');
    const rock = new THREE.Color('#8f8f86');
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const x = ox + i * t.cell;
        const y = oy + j * t.cell;
        const z = -y;
        const h = this.groundAt(x, z);
        pos.push(x, h, z);
        if (this.waterAt(x, z)) c.copy(WATER);
        else {
          // Steep or high is wooded hillside; the highest is bare rock; the rest is town.
          const slope = Math.hypot(this.groundAt(x + t.cell, z) - this.groundAt(x - t.cell, z), this.groundAt(x, z + t.cell) - this.groundAt(x, z - t.cell)) / (2 * t.cell);
          c.copy(town).lerp(wood, Math.min(1, Math.max(0, slope * 5 - 0.25) + Math.max(0, (h - 110) / 120)));
          if (h > 420) c.lerp(rock, Math.min(1, (h - 420) / 200));
        }
        col.push(c.r, c.g, c.b);
      }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i;
        idx.push(a, a + 1, a + n + 2, a, a + n + 2, a + n + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // Paving underfoot, tiled in the world's metres.
    const uv = [];
    for (let k = 0; k < pos.length; k += 3) uv.push(pos[k] / 5, pos[k + 2] / 5);
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    this.landMaterial ??= new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, map: texture('Concrete034', 'Color') });
    const ground = new THREE.Mesh(geo, this.landMaterial);
    this.scene.add(ground);
    const roads = this._roadMesh(key);
    return { ground, roads, ...(roads?.userData.street ?? {}) };
  }

  /** Read roads.bin and sort every road into the tiles it crosses. */
  _roads(buf) {
    const v = new DataView(buf);
    if (v.getUint32(0, true) !== 0x524f4553) return;
    const x0 = v.getInt32(4, true) - ORIGIN.x;
    const y0 = v.getInt32(8, true) - ORIGIN.y;
    const count = v.getUint32(12, true);
    this.roadTiles = new Map();
    const all = [];
    let o = 16;
    for (let k = 0; k < count; k++) {
      const cls = v.getUint8(o);
      const flags = v.getUint8(o + 1);
      const n = v.getUint16(o + 2, true);
      const pts = new Float32Array(n * 2);
      const keys = new Array(n);
      let first = null;
      for (let i = 0; i < n; i++) {
        const xi = v.getInt32(o + 4 + i * 8, true);
        const yi = v.getInt32(o + 8 + i * 8, true);
        const x = x0 + xi / 10;
        const y = y0 + yi / 10;
        pts[i * 2] = x;
        pts[i * 2 + 1] = -y; // world Z
        keys[i] = `${xi}|${yi}`; // where roads meet: the same point, to the decimetre
        first ??= tileKey(...tileOf(x + ORIGIN.x, y + ORIGIN.y));
      }
      o += 4 + n * 8;
      // A road is listed with the tile it starts in (traffic, people, race courses).
      if (!this.roadTiles.has(first)) this.roadTiles.set(first, []);
      // As wide as its lanes (3.25 m each, and the shoulders), where the map says how many; else by its class.
      const lanes = flags >> 4;
      const oneway = Boolean(flags & 4);
      const width = lanes ? lanes * 3.25 + (oneway ? 1.0 : 1.6) : (oneway ? ONE_WAY_WIDTH[cls] : ROAD_WIDTH[cls]) * (flags & 1 ? 0.55 : 1);
      const road = { pts, width, bridge: Boolean(flags & 2), cls, oneway, lanes };
      this.roadTiles.get(first).push(road);
      all.push({ road, keys });
    }
    this.roadPieces = roadPieces(all, {
      water: (x, z) => this.waterAt(x, z),
      tile: (x, z) => tileKey(...tileOf(x + ORIGIN.x, -z + ORIGIN.y))
    });
    // Every road's surface on the map, by 40 m cell, so trees, lamps and pavements keep off all of them —
    // a big road is two roads in the data, one each way, and what lines one must not stand on the other.
    this.roadArea = new Map();
    for (const list of this.roadPieces.values()) {
      for (const r of list) {
        const half = r.width / 2;
        for (let i = 3; i < r.line.length; i += 3) {
          const seg = [r.line[i - 3], r.line[i - 2], r.line[i], r.line[i + 1], half];
          const cell = `${Math.floor((seg[0] + seg[2]) / 2 / ROAD_CELL)}_${Math.floor((seg[1] + seg[3]) / 2 / ROAD_CELL)}`;
          let at = this.roadArea.get(cell);
          if (!at) this.roadArea.set(cell, (at = []));
          at.push(seg);
        }
      }
    }
  }

  /**
   * The small streets (alleys.bin): each listed with the tile it starts in, beside the
   * main roads, so the bike courses can be planned through them and people walk them.
   * They are not drawn with the city: the race lays the ones its course uses (golmok.js).
   */
  _alleys(buf) {
    const list = readAlleys(buf, ORIGIN);
    for (const road of list) {
      const key = tileKey(...tileOf(road.pts[0] + ORIGIN.x, -road.pts[1] + ORIGIN.y));
      if (!this.roadTiles.has(key)) this.roadTiles.set(key, []);
      this.roadTiles.get(key).push(road);
    }
    this.alleyCount = list.length;
  }

  /**
   * A race's own time and weather: the clock stops at `hour` and the weather is set (at
   * once, not eased in). `null` gives the city its own clock and changing weather back.
   */
  raceSky(hour, weather) {
    if (hour == null) {
      if (this.clockPaused) {
        this.clockPaused = false;
        if (this.weather) this.weather.auto = true;
      }
      return;
    }
    this.clockPaused = true;
    this.setHour(hour);
    if (this.weather && WEATHERS[weather]) {
      this.weather.auto = false;
      this.weather.set(weather);
      for (const k of ['rain', 'snow', 'fog', 'wet']) this.weather.level[k] = WEATHERS[weather][k];
    }
    this._showWeather();
  }

  /** Whether a point is on any road's surface (with `margin` metres more each side). */
  onRoad(x, z, margin = 0) {
    if (!this.roadArea) return false;
    const cx = Math.floor(x / ROAD_CELL);
    const cz = Math.floor(z / ROAD_CELL);
    for (let i = cx - 1; i <= cx + 1; i++) {
      for (let j = cz - 1; j <= cz + 1; j++) {
        for (const [ax, az, bx, bz, half] of this.roadArea.get(`${i}_${j}`) ?? []) {
          const dx = bx - ax;
          const dz = bz - az;
          const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
          if (Math.hypot(x - (ax + dx * k), z - (az + dz * k)) < half + margin) return true;
        }
      }
    }
    return false;
  }

  /** The roads drawn with a tile, as ribbons laid on the ground (lifted on bridges). */
  _roadMesh(key) {
    const list = this.roadPieces?.get(key);
    if (!list?.length) return null;
    const pos = [];
    const col = [];
    const paint = []; // per vertex: metres across from the middle, metres along, the road's width
    const walk = []; // the pavements
    const wall = []; // the road's sides: kerbs, the slab's edge, bridge girders and parapets
    const wallCol = [];
    const trees = [];
    const lamps = [];
    const c = new THREE.Color();
    const owned = [];
    this.roadHash ??= new Map();
    for (const r of list) {
      // Points no more than 20 m apart, each with its deck height (worked out for the whole road network).
      const line = [];
      const eased = [];
      for (let i = 0; i < r.line.length; i += 3) {
        line.push([r.line[i], r.line[i + 1]]);
        eased.push(r.line[i + 2]);
      }
      c.set(r.cls <= 1 ? '#8c8e94' : '#9a9ca2');
      const half = r.width / 2;
      let prev = null;
      let last = null;
      let along = r.along ?? 0;
      let nextTree = Math.ceil(((r.along ?? 0) - 8) / 16) * 16 + 8;
      const expressway = r.cls === 0;
      // For the paint: the road's length (crossings at its ends; none on a motorway or a bridge), negative if one way.
      const mark = (expressway || r.bridge ? 0.5 : r.total ?? 0.5) * (r.oneway ? -1 : 1);
      line.forEach(([x, z], i) => {
        const [nx, nz] = line[Math.min(line.length - 1, i + 1)];
        const [px, pz] = line[Math.max(0, i - 1)];
        const dx = nx - px;
        const dz = nz - pz;
        const len = Math.hypot(dx, dz) || 1;
        const y = this.groundAt(x, z) + 0.9 + eased[i];
        const left = [x - (dz / len) * half, y, z + (dx / len) * half];
        const right = [x + (dz / len) * half, y, z - (dx / len) * half];
        if (last) along += Math.hypot(x - last[0], z - last[2]);
        // The pavement each side: a step up, a paving strip 3 m wide (not on an expressway or a bridge).
        const onBridge = eased[i] > 1;
        const kerb = 0.14;
        const outL = [x - (dz / len) * (half + 3), y + kerb, z + (dx / len) * (half + 3)];
        const outR = [x + (dz / len) * (half + 3), y + kerb, z - (dx / len) * (half + 3)];
        const inL = [left[0], y + kerb, left[2]];
        const inR = [right[0], y + kerb, right[2]];
        if (prev) {
          pos.push(...prev.left, ...prev.right, ...right, ...prev.left, ...right, ...left);
          for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
          const a0 = prev.along;
          for (const [o, v] of [[-half, a0], [half, a0], [half, along], [-half, a0], [half, along], [-half, along]]) paint.push(o, v, r.width, mark);
          // (Not where it would lie across another road: the other carriageway, a crossing.)
          const sideL = !this.onRoad((outL[0] + prev.outL[0]) / 2, (outL[2] + prev.outL[2]) / 2) && !this.onRoad((inL[0] + outL[0]) / 2, (inL[2] + outL[2]) / 2, -0.5);
          const sideR = !this.onRoad((outR[0] + prev.outR[0]) / 2, (outR[2] + prev.outR[2]) / 2) && !this.onRoad((inR[0] + outR[0]) / 2, (inR[2] + outR[2]) / 2, -0.5);
          const paved = !expressway && !onBridge && !prev.bridge;
          if (paved) {
            if (sideL) walk.push(...prev.inL, ...prev.outL, ...outL, ...prev.inL, ...outL, ...inL);
            if (sideR) walk.push(...prev.outR, ...prev.inR, ...inR, ...prev.outR, ...inR, ...outR);
          }
          // The road is a slab, not a sheet: a granite kerb up to the pavement, the pavement's edge and
          // the slab's sides down into the ground; on a bridge a deep girder under the deck and a
          // concrete parapet along it; on a motorway a concrete barrier.
          const quad = (a, b, ya0, ya1, yb0, yb1, col) => {
            wall.push(a[0], ya0, a[2], b[0], yb0, b[2], b[0], yb1, b[2], a[0], ya0, a[2], b[0], yb1, b[2], a[0], ya1, a[2]);
            for (let k = 0; k < 6; k++) wallCol.push(col[0], col[1], col[2]);
          };
          const KERB = [0.78, 0.77, 0.74];
          const SLAB = [0.5, 0.49, 0.47];
          const GIRDER = [0.6, 0.6, 0.62];
          const BARRIER = [0.72, 0.71, 0.69];
          const gA = (p) => this.groundAt(p[0], p[2]) - 0.4;
          const bridgeDeck = onBridge || prev.bridge;
          for (const [pe, e, po, oo, pIn, inn, walked] of [[prev.left, left, prev.outL, outL, prev.inL, inL, paved && sideL], [prev.right, right, prev.outR, outR, prev.inR, inR, paved && sideR]]) {
            if (walked) {
              quad(pe, e, pe[1], pIn[1], e[1], inn[1], KERB);
              quad(po, oo, gA(po), po[1], gA(oo), oo[1], SLAB);
            } else if (bridgeDeck) {
              // The girder under the deck's edge, then the parapet: outer face, top, inner face.
              quad(pe, e, pe[1] - 1.7, pe[1], e[1] - 1.7, e[1], GIRDER);
              quad(pe, e, pe[1], pe[1] + 1.0, e[1], e[1] + 1.0, BARRIER);
            } else {
              quad(pe, e, gA(pe), pe[1], gA(e), e[1], SLAB);
              if (expressway) quad(pe, e, pe[1], pe[1] + 0.85, e[1], e[1] + 0.85, BARRIER);
            }
          }
          // A ginkgo every so often along the pavement, and a lamp at every other.
          while (!expressway && !onBridge && along >= nextTree) {
            const side = Math.floor(nextTree / 16) % 2 ? 1 : -1;
            const off = half + 1.9;
            const tx = x + (dz / len) * off * side;
            const tz = z - (dx / len) * off * side;
            const lx = x + (dz / len) * (half + 0.5) * side;
            const lz = z - (dx / len) * (half + 0.5) * side;
            // Never on a road: not on the other carriageway, a crossing or a slip road.
            if (Math.floor(nextTree / 16) % 3 === 0) {
              if (!this.onRoad(lx, lz, 0.3)) lamps.push([lx, y + kerb, lz, Math.atan2(-dz * side, dx * side)]);
            } else if (!this.onRoad(tx, tz, 1.4)) trees.push([tx, y + kerb, tz, nextTree]);
            nextTree += 16;
          }
          // Remember the stretch, so someone walking here stands on the road and not under it.
          const seg = { ax: last[0], ay: last[1], az: last[2], bx: x, by: y, bz: z, half: half + 0.5 };
          const cell = `${Math.floor((last[0] + x) / 2 / ROAD_CELL)}_${Math.floor((last[2] + z) / 2 / ROAD_CELL)}`;
          if (!this.roadHash.has(cell)) this.roadHash.set(cell, []);
          this.roadHash.get(cell).push(seg);
          owned.push([cell, seg]);
        }
        last = [x, y, z];
        prev = { left, right, inL, inR, outL, outR, along, bridge: onBridge };
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('aPaint', new THREE.Float32BufferAttribute(paint, 4));
    const uv = [];
    for (let k = 0; k < pos.length; k += 3) uv.push(pos[k] / 6, pos[k + 2] / 6);
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    this.roadMaterial ??= roadMaterial(this.uniforms);
    const mesh = new THREE.Mesh(geo, this.roadMaterial);
    mesh.userData.owned = owned;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    mesh.userData.street = this._street(walk, trees, lamps);
    if (wall.length) {
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.Float32BufferAttribute(wall, 3));
      wg.setAttribute('color', new THREE.Float32BufferAttribute(wallCol, 3));
      const uv = [];
      for (let k = 0; k < wall.length; k += 3) uv.push((wall[k] + wall[k + 2]) / 3, wall[k + 1] / 3);
      wg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      wg.computeVertexNormals();
      this.wallMaterial ??= new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, map: texture('Concrete034', 'Color') });
      const walls = new THREE.Mesh(wg, this.wallMaterial);
      walls.receiveShadow = true;
      this.scene.add(walls);
      mesh.userData.street.walls = walls;
    }
    return mesh;
  }

  /** A tile's pavements (one mesh), ginkgo trees and street lamps (instanced). */
  _street(walk, trees, lamps) {
    const out = {};
    if (walk.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(walk, 3));
      const uv = [];
      // (PavingStones152: about twelve rows of 20 × 10 cm blocks in a 1.6 m tile)
      for (let k = 0; k < walk.length; k += 3) uv.push(walk[k] / 1.6, walk[k + 2] / 1.6);
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.computeVertexNormals();
      this.walkMaterial ??= pavementMaterial(this.uniforms);
      out.walks = new THREE.Mesh(geo, this.walkMaterial);
      out.walks.receiveShadow = true;
      this.scene.add(out.walks);
    }
    const o = new THREE.Object3D();
    if (trees.length) {
      // Street trees: a grey trunk and a full crown of a few leafy lumps — zelkovas and ginkgos, mostly
      // green, some gone gold. Two instanced draws a tile, so the crowns can each take their own colour.
      this.treeParts ??= (() => {
        const trunk = new THREE.CylinderGeometry(0.12, 0.2, 3.4, 7).translate(0, 1.7, 0);
        const lumps = [[0, 4.6, 0, 1.4], [0.9, 4.15, 0.35, 1.0], [-0.8, 4.3, -0.35, 1.05], [0.15, 5.55, -0.2, 1.0], [-0.35, 3.85, 0.85, 0.9], [0.45, 4.0, -0.9, 0.9], [-0.95, 5.0, 0.4, 0.8], [0.8, 5.1, -0.5, 0.8], [0.1, 6.3, 0.15, 0.7]];
        const parts = lumps.map(([x, y, z, r], i) => {
          const g = new THREE.IcosahedronGeometry(r, 2).toNonIndexed();
          // A little roughness, so the crown is not a pile of balls.
          const p = g.attributes.position;
          for (let k = 0; k < p.count; k++) {
            const n = 1 + 0.16 * Math.sin(p.getX(k) * 5.1 + i) * Math.cos(p.getY(k) * 4.3 + p.getZ(k) * 3.7);
            p.setXYZ(k, p.getX(k) * n + x, p.getY(k) * n * 0.92 + y, p.getZ(k) * n + z);
          }
          g.deleteAttribute('uv');
          g.computeVertexNormals();
          return g;
        });
        // Darker inside and underneath, as a real crown is (vertex colours, times each tree's own green).
        const crown = new THREE.BufferGeometry();
        const total = parts.reduce((s, g) => s + g.attributes.position.count, 0);
        const pos = new Float32Array(total * 3);
        const nor = new Float32Array(total * 3);
        const col = new Float32Array(total * 3);
        let at = 0;
        for (const g of parts) {
          pos.set(g.attributes.position.array, at * 3);
          nor.set(g.attributes.normal.array, at * 3);
          // Each little facet its own shade (leaves catching the light or not), darker low and inside.
          for (let k = 0; k < g.attributes.position.count; k += 3) {
            const jitter = 0.78 + Math.random() * 0.36;
            for (let j = 0; j < 3; j++) {
              const y = g.attributes.position.getY(k + j);
              const shade = (0.5 + 0.5 * Math.min(1, Math.max(0, (y - 3.2) / 3))) * jitter;
              col.set([shade, shade * (0.97 + Math.random() * 0.06), shade], (at + k + j) * 3);
            }
          }
          at += g.attributes.position.count;
        }
        crown.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        crown.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        crown.setAttribute('color', new THREE.BufferAttribute(col, 3));
        return {
          trunk,
          crown,
          bark: windy(new THREE.MeshLambertMaterial({ color: '#57504a' }), this.wind, 0.35),
          leaves: windy(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), this.wind, 1)
        };
      })();
      const group = new THREE.Group();
      const trunks = new THREE.InstancedMesh(this.treeParts.trunk, this.treeParts.bark, trees.length);
      const crowns = new THREE.InstancedMesh(this.treeParts.crown, this.treeParts.leaves, trees.length);
      const tint = new THREE.Color();
      trees.forEach(([x, y, z, seed], k) => {
        const r = (m) => (((seed * m) % 1) + 1) % 1;
        const sz = 0.8 + r(7.31) * 0.4;
        o.position.set(x, y, z);
        o.rotation.set(0, seed, 0);
        o.scale.set(sz, sz * (0.9 + r(3.7) * 0.25), sz);
        o.updateMatrix();
        trunks.setMatrixAt(k, o.matrix);
        crowns.setMatrixAt(k, o.matrix);
        // Three in four green (zelkova, ginkgo in summer), the rest ginkgo gold.
        if (r(5.17) < 0.75) tint.setHSL(0.24 + r(1.3) * 0.08, 0.42 + r(2.9) * 0.15, 0.24 + r(2.1) * 0.1);
        else tint.setHSL(0.12 + r(1.3) * 0.03, 0.7, 0.42 + r(2.1) * 0.08);
        crowns.setColorAt(k, tint);
      });
      trunks.castShadow = crowns.castShadow = true;
      group.add(trunks, crowns);
      out.trees = group;
      this.scene.add(group);
    }
    if (lamps.length) {
      // A tall grey street lamp: a pole, an arm over the road, a lamp that glows after dark.
      this.lampParts ??= (() => {
        const pole = new THREE.CylinderGeometry(0.08, 0.12, 8, 6).translate(0, 4, 0);
        const arm = new THREE.BoxGeometry(0.08, 0.08, 2.2).translate(0, 7.9, -1.1);
        const head = new THREE.BoxGeometry(0.35, 0.14, 0.7).translate(0, 7.8, -2.1);
        const metal = mergeTwo(pole, arm, '#7a7f86', '#7a7f86');
        this.lampMat = new THREE.MeshLambertMaterial({ color: '#fff4d8', emissive: '#ffd58a', emissiveIntensity: 0 });
        return { geo: metal, mat: new THREE.MeshLambertMaterial({ vertexColors: true }), head, headMat: this.lampMat };
      })();
      const poles = new THREE.InstancedMesh(this.lampParts.geo, this.lampParts.mat, lamps.length);
      const heads = new THREE.InstancedMesh(this.lampParts.head, this.lampParts.headMat, lamps.length);
      lamps.forEach(([x, y, z, a], k) => {
        o.position.set(x, y, z);
        o.rotation.set(0, a, 0);
        o.scale.set(1, 1, 1);
        o.updateMatrix();
        poles.setMatrixAt(k, o.matrix);
        heads.setMatrixAt(k, o.matrix);
      });
      const lampGroup = new THREE.Group();
      lampGroup.add(poles, heads);
      lampGroup.geometry = { dispose() {} };
      out.lamps = lampGroup;
      this.scene.add(lampGroup);
      this.lampMat.emissiveIntensity = (this.uniforms.uNight.value ?? 0) * 3;
    }
    return out;
  }

  /**
   * What you stand on at a point: the road's surface if a road passes here
   * within a step up of where you are (so you walk onto a bridge from its
   * end, and under it from the bank), else the ground.
   */
  surfaceAt(x, z, from = Infinity) {
    const ground = this.groundAt(x, z);
    if (!this.roadHash) return ground;
    let best = ground;
    const cx = Math.floor(x / ROAD_CELL);
    const cz = Math.floor(z / ROAD_CELL);
    for (let i = cx - 1; i <= cx + 1; i++) {
      for (let j = cz - 1; j <= cz + 1; j++) {
        for (const s of this.roadHash.get(`${i}_${j}`) ?? []) {
          const dx = s.bx - s.ax;
          const dz = s.bz - s.az;
          const k = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz || 1)));
          if (Math.hypot(x - (s.ax + dx * k), z - (s.az + dz * k)) > s.half) continue;
          const y = s.ay + (s.by - s.ay) * k;
          if (y > best && y <= Math.max(from, ground) + 2.5) best = y;
        }
      }
    }
    return best;
  }

  /** A broadcast tower the register lists only as a point: our own plain shape, to its real height. */
  _tower(l) {
    const g = new THREE.Group();
    const base = this.groundAt(l.wx, l.wz);
    const white = new THREE.MeshLambertMaterial({ color: '#e9ecef' });
    const dark = new THREE.MeshLambertMaterial({ color: '#5a6170' });
    const red = new THREE.MeshLambertMaterial({ color: '#d8483f' });
    const H = l.height;
    const part = (geo, mat, y) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.y = y;
      g.add(m);
    };
    part(new THREE.CylinderGeometry(9, 13, H * 0.1, 20), white, H * 0.05); // the foot
    part(new THREE.CylinderGeometry(4.5, 7, H * 0.48, 20), white, H * 0.34); // the shaft
    part(new THREE.CylinderGeometry(13, 9, H * 0.035, 24), dark, H * 0.5975); // under the deck
    part(new THREE.CylinderGeometry(14, 13, H * 0.06, 24), white, H * 0.645); // the observation deck
    part(new THREE.CylinderGeometry(7, 13, H * 0.04, 24), dark, H * 0.695);
    part(new THREE.CylinderGeometry(1.6, 3.2, H * 0.17, 12), red, H * 0.8); // the mast, banded
    part(new THREE.CylinderGeometry(0.8, 1.6, H * 0.115, 10), white, H * 0.9425);
    g.position.set(l.wx, base, l.wz);
    this.scene.add(g);
    l.base = base;
  }

  /**
   * Hide (or show again) a building's walls in its tile's mesh, while facades.js has built it
   * for real: its wall triangles are folded to a point, and put back from a copy.
   */
  hideWalls(b, hide) {
    const mesh = b.tile?.mesh;
    if (!mesh || b.v1 == null || b.v1 <= b.v0) return;
    const attr = mesh.geometry.attributes.position;
    const a = b.v0 * 3;
    const z = b.v1 * 3;
    if (hide) {
      if (b.saved) return;
      b.saved = attr.array.slice(a, z);
      for (let i = a + 3; i < z; i += 3) {
        attr.array[i] = attr.array[a];
        attr.array[i + 1] = attr.array[a + 1];
        attr.array[i + 2] = attr.array[a + 2];
      }
    } else {
      if (!b.saved) return;
      attr.array.set(b.saved, a);
      b.saved = null;
    }
    attr.addUpdateRange(a, z - a);
    attr.needsUpdate = true;
  }

  /** The building standing at a point on the ground (its footprint), or null. */
  buildingAt(x, z) {
    const [tx, ty] = tileOf(x + ORIGIN.x, -z + ORIGIN.y);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const t = this.tiles.get(tileKey(tx + dx, ty + dy));
        if (!t?.foot) continue;
        for (const b of t.foot) {
          if (x < b.minx || x > b.maxx || z < b.minz || z > b.maxz) continue;
          let inside = false;
          for (let i = 0, j = b.xs.length - 1; i < b.xs.length; j = i++) {
            if ((b.zs[i] > z) !== (b.zs[j] > z) && x < ((b.xs[j] - b.xs[i]) * (z - b.zs[i])) / (b.zs[j] - b.zs[i]) + b.xs[i]) inside = !inside;
          }
          if (inside) return b;
        }
      }
    }
    return null;
  }

  /* ---------------------------------------------------------------- moving */

  /**
   * Fly, walk or drive. `keep` (from getting in or out of a car) keeps you
   * where you are; otherwise walking starts on the ground under you.
   */
  setMode(mode, { keep = false, fromRace = false } = {}) {
    const was = this.mode;
    // Leaving a race by another button: the race takes itself down first.
    if (was === 'race' && mode !== 'race' && !fromRace) {
      this.race.quit();
      if (mode === 'fly') return;
    }
    if (mode === 'race') {
      this.mode = 'race';
      this.street.hide();
      for (const b of this.root.querySelectorAll('[data-mode]')) b.classList.remove('is-on');
      this.root.focus();
      return;
    }
    this.mode = mode === 'walk' || mode === 'drive' ? mode : 'fly';
    if (this.mode !== 'fly' && was === 'fly' && !keep) {
      // Land where you were hovering — beside a building, not inside one.
      for (let k = 0; k < 40 && this.buildingAt(this.pos.x, this.pos.z); k++) this.pos.x += 6;
      // Landing from the air: on the road if one is under you (a bridge too), else on the ground.
      this.pos.y = this.surfaceAt(this.pos.x, this.pos.z);
      this.pitch = Math.max(-0.5, Math.min(0.3, this.pitch));
      this.zoom = 4.5;
      this.street.walk();
    }
    if (this.mode === 'walk' && !keep) this.street.walk();
    if (this.mode === 'drive' && !keep && !this.street.drive()) {
      this.mode = 'walk';
      this.toast('The cars are still on their way — try again in a moment');
    }
    if (this.mode === 'fly') {
      this.street.hide();
      this.pos.y = Math.max(this.pos.y, this.groundAt(this.pos.x, this.pos.z) + 120);
      if (this.camera.fov !== 58) {
        this.camera.fov = 58;
        this.camera.updateProjectionMatrix();
      }
    }
    for (const b of this.root.querySelectorAll('[data-mode]')) b.classList.toggle('is-on', b.dataset.mode === this.mode);
    this.$('[data-help]').textContent = modeHint(this.mode);
    this.root.focus();
  }

  /** The roads that start in the tiles around a point (for traffic and people walking). */
  roadsNear(x, z, reach = 1) {
    if (!this.roadTiles) return [];
    const [tx, ty] = tileOf(x + ORIGIN.x, -z + ORIGIN.y);
    const out = [];
    for (let dx = -reach; dx <= reach; dx++) for (let dy = -reach; dy <= reach; dy++) out.push(...(this.roadTiles.get(tileKey(tx + dx, ty + dy)) ?? []));
    return out;
  }

  /** Jump to a place: above it, looking north across it. */
  goTo(wx, wz, { height = 0, name = '' } = {}) {
    this.setMode('fly');
    this.pos.set(wx, this.groundAt(wx, wz) + Math.max(180, height + 120), wz + 420 + height);
    this.yaw = 0;
    this.pitch = -0.38;
    if (name) this.toast(name);
    this.togglePlaces(false);
  }

  _move(dt) {
    const k = this.keys;
    const typing = document.activeElement?.matches?.('input, select');
    let f = 0;
    let s = 0;
    let up = 0;
    if (!typing) {
      if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
      if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
      if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
      if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
      if (k.has('Space') || k.has('KeyE')) up += 1;
      if (k.has('KeyC') || k.has('KeyQ')) up -= 1;
    }
    const fast = k.has('ShiftLeft') || k.has('ShiftRight');
    // Forward on the ground plane: yaw 0 looks north (−Z).
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = -fz;
    const rz = fx;
    if (this.mode === 'fly') {
      const speed = (60 + Math.max(0, this.pos.y - this.groundAt(this.pos.x, this.pos.z)) * 0.6) * (fast ? 3.5 : 1);
      this.pos.x += (fx * f + rx * s) * speed * dt;
      this.pos.z += (fz * f + rz * s) * speed * dt;
      const floor = this.groundAt(this.pos.x, this.pos.z) + 8;
      this.pos.y = Math.max(floor, Math.min(floor + 2600, this.pos.y + up * speed * 0.7 * dt + f * Math.sin(this.pitch) * speed * dt * 0.6));
      this.speed = Math.hypot(f, s) * speed;
    } else if (this.mode === 'race') this.race.update(dt);
    else this.street.update(dt);
    // Stay over the city.
    this.pos.x = Math.max(-21000, Math.min(21000, this.pos.x));
    this.pos.z = Math.max(-17000, Math.min(18000, this.pos.z));
  }

  _camera() {
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    if (this.mode === 'fly') {
      this.camera.position.copy(this.pos);
      this.camera.lookAt(this.pos.clone().add(dir));
    } else if (this.mode === 'race') this.race.camera(this.camera);
    else this.street.camera(this.camera);
    // The sun's shadow box round the camera (or the sun far off, without shadows).
    if (this.renderer.shadowMap.enabled) followSun(this.sun, this.sunDir, this.camera.position, this.shadowBox ?? 80);
    else {
      this.sun.position.copy(this.camera.position).addScaledVector(this.sunDir, 800);
      this.sun.target.position.copy(this.camera.position);
      this.sun.target.updateMatrixWorld();
    }
    if (this.sky) {
      this.sky.position.copy(this.camera.position);
      this.sky.scale.setScalar(this.camera.far * 0.9);
    }
    this.ground.position.set(Math.round(this.pos.x / 100) * 100, 0, Math.round(this.pos.z / 100) * 100);
  }

  _input(stage) {
    let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY };
      stage.setPointerCapture?.(e.pointerId);
      this.root.focus();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.yaw -= (e.clientX - drag.x) * 0.0045;
      this.dragAt = performance.now();
      this.pitch = Math.max(-1.45, Math.min(this.mode === 'fly' ? 0.9 : 0.35, this.pitch - (e.clientY - drag.y) * 0.004));
      drag = { x: e.clientX, y: e.clientY };
    });
    const end = () => (drag = null);
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.mode !== 'fly') this.zoom = Math.max(2.5, Math.min(40, this.zoom * (e.deltaY > 0 ? 1.12 : 0.89)));
      else {
        const g = this.groundAt(this.pos.x, this.pos.z);
        this.pos.y = g + Math.max(8, Math.min(2600, (this.pos.y - g) * (e.deltaY > 0 ? 1.1 : 0.91)));
      }
    }, { passive: false });
    stage.addEventListener('contextmenu', (e) => e.preventDefault());
    this._down = (e) => {
      if (!this.root.isConnected) return;
      if (e.target?.matches?.('input[type="search"], input[type="text"]')) {
        if (e.key === 'Escape') this.togglePlaces(false);
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
      if (this.help?.isOpen) {
        if (e.code === 'Escape' || e.code === 'KeyH' || e.code === 'KeyI') this.help.close();
        return;
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.repeat) return;
      if (this.mode === 'race') {
        // A tap of Space between two frames still sprints.
        if (e.code === 'Space') this.race.sprintTap = true;
        const slot = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
        if (slot >= 0) this.race.useSlot(slot);
        else if (e.code === 'KeyB') this.race.horn();
        else if (e.code === 'KeyH' || e.code === 'KeyI') this.help.toggle();
        else if (e.code === 'Escape') this.race.quit();
        return;
      }
      if (e.code === 'KeyF') this.setMode(this.mode === 'fly' ? 'walk' : 'fly');
      else if (e.code === 'KeyE' && this.mode !== 'fly') this.street.use();
      else if (e.code === 'KeyB' && this.mode === 'drive') this.street.horn();
      else if (e.code === 'KeyH' || e.code === 'KeyI') this.help.toggle();
      else if (e.code === 'KeyV' && this.mode !== 'fly') this.street.switchPerson();
      else if (e.code === 'KeyM') this.togglePlaces();
      else if (e.code === 'KeyG') this.toggleGraphics();
      else if (e.code === 'Escape') (!this.$('[data-gfx]').hidden ? this.toggleGraphics(false) : this.$('[data-places]').hidden ? this.close() : this.togglePlaces(false));
    };
    this._up = (e) => this.keys.delete(e.code);
    window.addEventListener('keydown', this._down, true);
    window.addEventListener('keyup', this._up, true);
    window.addEventListener('blur', () => this.keys.clear());
  }

  /* ----------------------------------------------------- where you are */

  _where() {
    const [tx, ty] = tileOf(this.pos.x + ORIGIN.x, -this.pos.z + ORIGIN.y);
    const t = this.tiles.get(tileKey(tx, ty));
    const place = t?.place || '';
    if (place && place !== this._place) {
      this._place = place;
      const [gu, dong] = place.split(' ');
      this.$('[data-place]').textContent = gu ?? 'Seoul';
      this.$('[data-sub]').textContent = `서울특별시 ${place}${dong ? '' : ''}`;
      if (gu && !this.visited.has(gu) && (this.index?.districts ?? []).some((d) => d.name === gu)) {
        this.visited.add(gu);
        try {
          localStorage.setItem('gamory.seoul.visited', JSON.stringify([...this.visited]));
        } catch {
          /* private mode */
        }
        this._stamps();
        this.toast(`New district: ${gu} — ${this.visited.size} of ${this.index.districts.length}`);
        confetti(null, this.visited.size === this.index.districts.length ? 160 : 40);
      }
    } else if (!place && !t && this._place !== '') {
      this._place = '';
      this.$('[data-place]').textContent = 'Seoul';
      this.$('[data-sub]').textContent = '서울특별시';
    }
  }

  _stamps() {
    const total = this.index?.districts?.length ?? 25;
    this.$('[data-stamps]').textContent = `🏙 ${this.visited.size} / ${total} districts`;
  }

  togglePlaces(force) {
    const box = this.$('[data-places]');
    const open = force ?? box.hidden;
    box.hidden = !open;
    if (!open || !this.index) return this.root.focus();
    box.innerHTML = `<header><b>Places</b><input type="search" placeholder="Search towers and districts" data-find aria-label="Search places" /><button type="button" class="seoul__x" data-places-close aria-label="Close">✕</button></header>
      <h4>Districts <small>${this.visited.size} of ${this.index.districts.length} visited</small></h4><div class="seoul__chips" data-districts></div>
      <h4>Tallest named buildings</h4><div class="seoul__list" data-landmarks></div>
      <h4>Where the map comes from</h4><p class="seoul__sources">${[`${ATTRIBUTION} (KOGL type 1)`, ...(this.index.credits ?? [])].map(esc).join('<br>')}</p>
      <h4>Music</h4><p class="seoul__sources" data-music-credit>${musicCreditHtml('seoul', esc)}</p>`;
    box.querySelector('[data-places-close]').addEventListener('click', () => this.togglePlaces(false));
    const fill = (q = '') => {
      const d = box.querySelector('[data-districts]');
      d.replaceChildren(...this.index.districts.filter((x) => x.name.includes(q)).map((x) => {
        const b = el('button', this.visited.has(x.name) ? 'is-done' : '', `${this.visited.has(x.name) ? '✓ ' : ''}${x.name}`);
        b.type = 'button';
        b.dataset.district = x.name;
        b.title = `${x.count.toLocaleString()} buildings`;
        b.addEventListener('click', () => this.goTo(x.x - ORIGIN.x, -(x.y - ORIGIN.y), { name: x.name }));
        return b;
      }));
      const l = box.querySelector('[data-landmarks]');
      l.replaceChildren(...this.index.landmarks.filter((x) => !q || x.name.toLowerCase().includes(q.toLowerCase()) || x.place.includes(q)).slice(0, 60).map((x) => {
        const b = el('button');
        b.type = 'button';
        b.dataset.landmark = x.name;
        b.innerHTML = `<b>${esc(x.name)}</b><small>${esc(x.place)}</small><i>${x.height} m</i>`;
        b.addEventListener('click', () => this.goTo(x.wx, x.wz, { height: x.height, name: `${x.name} · ${x.height} m` }));
        return b;
      }));
    };
    box.querySelector('[data-find]').addEventListener('input', (e) => fill(e.target.value.trim()));
    fill();
  }

  /** Names over the tall buildings in view. */
  _labels() {
    const ctx = this.lctx;
    const { w, h, dpr } = this.size;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!this.index) return;
    const reach = QUALITY[this.quality] + 900;
    const v = new THREE.Vector3();
    const shown = [];
    for (const l of this.index.landmarks) {
      const d = Math.hypot(l.wx - this.camera.position.x, l.wz - this.camera.position.z);
      if (d > reach) continue;
      v.set(l.wx, (l.base ??= this.groundAt(l.wx, l.wz)) + l.height + 8, l.wz).project(this.camera);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) continue;
      shown.push({ l, d, x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h });
    }
    shown.sort((a, b) => b.l.height - a.l.height);
    const taken = [];
    ctx.textAlign = 'center';
    for (const s of shown.slice(0, 40)) {
      if (taken.some((t) => Math.abs(t.x - s.x) < 90 && Math.abs(t.y - s.y) < 26)) continue;
      taken.push(s);
      if (taken.length > 14) break;
      const text = `${s.l.name} · ${s.l.height} m`;
      ctx.font = '700 12px "Nunito Variable", system-ui, sans-serif';
      const tw = ctx.measureText(text).width + 14;
      ctx.fillStyle = 'rgba(20, 16, 40, 0.78)';
      ctx.beginPath();
      ctx.roundRect(s.x - tw / 2, s.y - 22, tw, 20, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(text, s.x, s.y - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(s.x - 0.5, s.y - 2, 1, 10);
    }
  }

  /** The weather's part of each frame: the sky under cloud, lightning, wet roads, bloom by night. */
  _weather(dt) {
    const w = this.weather;
    // The clock: 24 minutes a day (an hour a minute); the light is set again a few times a second.
    this._hourT = (this._hourT ?? 0) + dt;
    this._hourAcc = (this._hourAcc ?? 0) + (this.clockPaused ? 0 : dt / 60);
    if (this._hourT > 0.25) {
      this.setHour(this.hour + this._hourAcc);
      this._showWeather();
      this._hourT = 0;
      this._hourAcc = 0;
    }
    const night = this.uniforms.uNight.value;
    w.update(dt, this.camera, night);
    const cloud = Math.max(w.level.rain, w.level.snow * 0.8, (1 - w.level.fog) * 0.9);
    if (this.skyBase) {
      const sky = this.scene.background;
      sky.copy(this.skyBase).lerp(this._grey ??= new THREE.Color(), 0);
      // Under cloud the day sky greys and dims; at night it takes the city's orange glow.
      const grey = (this._greyC ??= new THREE.Color()).setRGB(0.42, 0.45, 0.5).lerp(new THREE.Color('#2a2430'), night);
      sky.lerp(grey, cloud * 0.75);
      if (w.flash > 0) sky.lerp(this._bolt ??= new THREE.Color('#c9c6ff'), w.flash * 0.75);
      this.scene.fog.color.copy(sky);
      // What glass reflects: the sky overhead deeper than at the horizon.
      this.uniforms.uSkyTop.value.copy(sky).multiplyScalar(0.8).lerp(this._deep ??= new THREE.Color('#2f6fd0'), 0.35 * (1 - night) * (1 - cloud));
      this.uniforms.uSkyLow.value.copy(sky).lerp(this._haze ??= new THREE.Color('#e8eef3'), 0.3 * (1 - night));
    }
    // The studio reflections, for the city: a little by day, almost none at night.
    const day = 1 - night;
    this.scene.environmentIntensity = (0.04 + 0.22 * day) * (1 - cloud * 0.4) + w.flash * 0.4;
    this.hemi.intensity = (this.hemiBase ?? 1) * (1 - cloud * 0.35) + w.flash * 2.4;
    this.sun.intensity = (this.sunBase ?? 1) * (1 - cloud * 0.75);
    this.uniforms.uWet.value = w.level.wet;
    this.wind.uTime.value += dt;
    this.wind.uWind.value += ((WEATHERS[w.kind].wind ?? 0.5) - this.wind.uWind.value) * Math.min(1, dt * 0.5);
    if (this.bloom) this.bloom.strength = 0.16 + night * 0.32 + w.level.wet * night * 0.12;
  }

  /** The weather in the bar (it changes by itself: Weather.auto). */
  _showWeather() {
    const info = WEATHERS[this.weather?.kind];
    const b = this.$?.('[data-weather]');
    const day = (this.uniforms?.uNight.value ?? 1) < 0.5;
    if (b && info) b.textContent = `${this.weather.kind === 'clear' && day ? '☀️' : info.icon} ${info.name}`;
  }

  /** Neon Overpass on the grid and in the race, and in a car after dark (a dead band so dusk doesn't flap it). */
  _music(dt) {
    if (!this.music) return;
    this._night = band(this.uniforms?.uNight?.value ?? 0, this._night, 0.6, 0.4);
    const racing = this.mode === 'race' && ['grid', 'racing', 'done'].includes(this.race?.phase);
    this.music.update(dt, { area: seoulTrack({ mode: this.mode, racing, night: this._night }) });
  }

  _frame(now) {
    const dt = Math.min(0.1, (now - this._last) / 1000);
    this._last = now;
    this._move(dt);
    this._camera();
    this._stream();
    this._where();
    this._weather(dt);
    // People on the pavements, bikes and scooters (once the roads are in).
    if (!this.life && this.roadTiles && this.terrain) this.life = new StreetLife(this);
    this.life?.update(dt);
    this._music(dt);
    this.power.gpuBegin();
    if (this.quality === 'low' || this.bloomOn === false) this.renderer.render(this.scene, this.camera);
    else this.composer.render(dt);
    this.power.gpuEnd();
    this.power.sample(dt * 1000);
    this.power.showFps(this.root);
    this._labels();
  }
}
