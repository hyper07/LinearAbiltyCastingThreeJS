import * as THREE from 'three';
import { TILE, USES, decodeTile, tileKey, tileOf } from './tiles.js';
import { dress } from '../mmo/bodies.js';
import { confetti } from '../ui/pop.js';
import './city.css';

const el = (tag, className, text) => {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Where the game's world begins: Seoul City Hall, in the source's grid (EPSG:5186, metres). */
const ORIGIN = { x: 198050, y: 551860 };
/** Wall colours by what a building is for (see tiles.js USES), light to read windows on. */
const PALETTE = { house: '#d9c4a5', apartment: '#cfd6dd', shop: '#e2b98f', office: '#a9bdd1', public: '#d7b0a0', industry: '#b9b3a6', other: '#c9c2b6' };
const QUALITY = { low: 800, medium: 1300, high: 2000 };
const ATTRIBUTION = '건물 데이터: 국토교통부 GIS건물통합정보 · 공공누리 제1유형(출처표시) — building data: MOLIT, Korea (KOGL Type 1)';

/**
 * Seoul, for real: every building in the city at its true place and height,
 * from the national building register (public data, KOGL type 1), streamed
 * as map tiles while you fly over it or walk its streets.
 *
 * The world is the source's own grid in metres, moved so City Hall is the
 * origin: +X is east, −Z is north. The ground is flat (no terrain data is
 * used or shown). Nothing here is sent anywhere: districts you have visited
 * are kept in this browser.
 */
export class SeoulGame {
  /** @param {HTMLElement} host @param {{ onClose?: () => void, base?: string }} [options] */
  constructor(host, { onClose = () => {}, base = './geo/seoul/' } = {}) {
    this.host = host;
    this.onClose = onClose;
    this.base = base;
    this.tiles = new Map(); // key → { state, mesh?, foot?, place? }
    this.queue = [];
    this.keys = new Set();
    this.mode = 'fly';
    this.pos = new THREE.Vector3(0, 260, 900);
    this.yaw = 0; // 0 looks north (−Z)
    this.pitch = -0.32;
    this.hour = 15;
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
        <button type="button" class="seoul__x" data-close aria-label="Leave Seoul">✕</button>
      </header>
      <div class="seoul__toast" data-toast role="status" aria-live="polite" hidden></div>
      <div class="seoul__msg" data-msg hidden></div>
      <aside class="seoul__places" data-places hidden></aside>
      <footer class="seoul__bar">
        <div class="seoul__group">
          <button type="button" data-mode="fly" title="Fly over the city (F switches)">🛸 Fly</button>
          <button type="button" data-mode="walk" title="Walk the streets (F switches)">🚶 Walk</button>
          <button type="button" data-open-places title="Districts and tall buildings to go to (M)">🧭 Places</button>
        </div>
        <label class="seoul__time" title="Time of day">🌞<input type="range" min="0" max="24" step="0.25" data-hour aria-label="Time of day" /><span data-clock></span></label>
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
    $('[data-hour]').value = String(this.hour);
    $('[data-hour]').addEventListener('input', (e) => this.setHour(Number(e.target.value)));
    $('[data-quality]').value = this.quality;
    $('[data-quality]').addEventListener('change', (e) => {
      this.quality = e.target.value;
      try {
        localStorage.setItem('gamory.seoul.quality', this.quality);
      } catch {
        /* private mode */
      }
      this.root.focus();
    });
    this._scene($('[data-stage]'));
    this._input($('[data-stage]'));
    this.setMode('fly');
    this.setHour(this.hour);
    this._stamps();
    this.root.focus();
    this._last = performance.now();
    this._raf = requestAnimationFrame((t) => this._frame(t));
    // The index says which tiles exist; without it the map was never converted.
    try {
      const r = await fetch(`${this.base}index.json`);
      if (!r.ok) throw new Error(String(r.status));
      this.index = await r.json();
      this.index.landmarks = (this.index.landmarks ?? []).map((l) => ({ ...l, wx: l.x - ORIGIN.x, wz: -(l.y - ORIGIN.y) }));
    } catch {
      this._message('<b>Seoul\'s map isn\'t installed on this server yet.</b><br>Download 국토교통부 GIS건물통합정보 for 서울특별시 (file <code>AL_D010_11_…</code>, free, KOGL type 1) into <code>library/Seoul_Map.zip/</code> or <code>data/geo/seoul/</code>, then run <code>npm run geo:seoul</code> and open this again.');
    }
    return this;
  }

  close() {
    cancelAnimationFrame(this._raf);
    this._resize?.disconnect();
    window.removeEventListener('keydown', this._down, true);
    window.removeEventListener('keyup', this._up, true);
    for (const t of this.tiles.values()) this._free(t);
    this.tiles.clear();
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
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'seoul__canvas';
    stage.prepend(this.canvas);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#b9d4ee', 400, 2200);
    this.camera = new THREE.PerspectiveCamera(58, 1, 1, 9000);
    this.hemi = new THREE.HemisphereLight('#dcecff', '#6a6458', 1.15);
    this.sun = new THREE.DirectionalLight('#fff3dc', 2.1);
    this.scene.add(this.hemi, this.sun, this.sun.target);
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
    this.uniforms = { uNight: { value: 0 } };
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uNight = this.uniforms.uNight;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aWall;\nvarying vec3 vWall;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWall = aWall;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uNight;\nvarying vec3 vWall;\nfloat seoulLit = 0.0;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          if (vWall.x >= 0.0) {
            // Windows: a grid along the wall and up it; some lit at night, each building its own.
            float far = smoothstep(350.0, 1300.0, length(vViewPosition));
            vec2 cell = vec2(vWall.x / 3.2, vWall.y / 3.3);
            vec2 f = fract(cell);
            vec2 id = floor(cell);
            float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.3, f.y) * step(f.y, 0.78);
            float r = fract(sin(dot(id + vWall.z * 31.0, vec2(12.9898, 78.233))) * 43758.5453);
            vec3 glass = mix(vec3(0.42, 0.56, 0.7), vec3(0.08, 0.1, 0.16), uNight);
            diffuseColor.rgb = mix(diffuseColor.rgb, glass, win * 0.7 * (1.0 - far));
            float on = step(1.0 - 0.5 * fract(vWall.z * 7.3 + 0.35), r);
            seoulLit = uNight * mix(win * on, 0.16, far);
          }`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.8, 0.48) * seoulLit * 1.35;');
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
    const sky = new THREE.Color('#0b1226').lerp(new THREE.Color('#a9cdf0'), Math.min(1, day * 1.8)).lerp(new THREE.Color('#f2a66a'), dusk * 0.55);
    this.scene.background = sky;
    this.scene.fog.color.copy(sky);
    const a = ((this.hour - 6) / 12) * Math.PI;
    this.sunDir = new THREE.Vector3(Math.cos(a) * 0.8, Math.max(0.12, Math.sin(a)), 0.45).normalize();
    this.sun.intensity = 0.15 + day * 2.2;
    this.sun.color.set('#fff3dc').lerp(new THREE.Color('#ff9a5a'), dusk);
    this.hemi.intensity = 0.28 + day * 0.95;
    this.uniforms.uNight.value = night;
    this.ground.material.color.setScalar(0.5 + Math.min(1, day * 1.6) * 0.7);
    const h = Math.floor(this.hour);
    this.$('[data-hour]').value = String(this.hour);
    this.$('[data-clock]').textContent = `${String(h).padStart(2, '0')}:${String(Math.round((this.hour - h) * 60)).padStart(2, '0')}`;
  }

  /* ---------------------------------------------------------------- tiles */

  /** Load what is near, drop what is far: called every frame, does a little each time. */
  _stream() {
    if (!this.index) return;
    const reach = QUALITY[this.quality] + (this.mode === 'fly' ? Math.min(1200, this.pos.y * 1.2) : 0);
    const [ctx, cty] = tileOf(this.pos.x + ORIGIN.x, -this.pos.z + ORIGIN.y);
    const span = Math.ceil(reach / TILE);
    const want = new Map();
    for (let dx = -span; dx <= span; dx++) {
      for (let dy = -span; dy <= span; dy++) {
        const d = Math.hypot(dx, dy) * TILE;
        const key = tileKey(ctx + dx, cty + dy);
        if (d <= reach && this.index.tiles[key]) want.set(key, d);
      }
    }
    for (const [key, t] of this.tiles) {
      if (want.has(key)) continue;
      this._free(t);
      this.tiles.delete(key);
    }
    this.scene.fog.near = reach * 0.45;
    this.scene.fog.far = reach * 1.05;
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
      foot.push({ minx, maxx, minz, maxz, xs, zs, h, name: b.name });
      let along = seed * 3.2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const dx = xs[j] - xs[i];
        const dz = zs[j] - zs[i];
        const len = Math.hypot(dx, dz) || 1;
        // The ring runs counter-clockwise seen from above (north up), so this points outward.
        const nx = -dz / len;
        const nz = dx / len;
        const u0 = along;
        const u1 = along + len;
        along = u1;
        pos.push(xs[i], 0, zs[i], xs[j], 0, zs[j], xs[j], h, zs[j], xs[i], 0, zs[i], xs[j], h, zs[j], xs[i], h, zs[i]);
        for (let k = 0; k < 6; k++) nor.push(nx, 0, nz);
        // Darker at the foot: a cheap shadow where walls meet the street.
        for (const top of [0, 0, 1, 0, 1, 1]) col.push(color.r * (top ? 1 : 0.78), color.g * (top ? 1 : 0.78), color.b * (top ? 1 : 0.78));
        wall.push(u0, 0, seed, u1, 0, seed, u1, h, seed, u0, 0, seed, u1, h, seed, u0, h, seed);
      }
      const contour = [];
      for (let i = 0; i < n; i++) contour.push(new THREE.Vector2(xs[i], zs[i]));
      for (let [a, c, d] of THREE.ShapeUtils.triangulateShape(contour, [])) {
        // Facing the sky, whichever way the triangulation wound it (else the roof is lit from below).
        if ((zs[c] - zs[a]) * (xs[d] - xs[a]) - (xs[c] - xs[a]) * (zs[d] - zs[a]) < 0) [c, d] = [d, c];
        pos.push(xs[a], h, zs[a], xs[c], h, zs[c], xs[d], h, zs[d]);
        for (let k = 0; k < 3; k++) {
          nor.push(0, 1, 0);
          col.push(roof.r, roof.g, roof.b);
          wall.push(-1, 0, seed);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('aWall', new THREE.Float32BufferAttribute(wall, 3));
    geo.computeBoundingSphere();
    t.mesh = new THREE.Mesh(geo, this.material);
    this.buildings.add(t.mesh);
    t.foot = foot;
    t.place = t.data.place;
    t.count = t.data.buildings.length;
    t.data = null;
    t.state = 'ready';
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

  setMode(mode) {
    this.mode = mode === 'walk' ? 'walk' : 'fly';
    for (const b of this.root.querySelectorAll('[data-mode]')) b.classList.toggle('is-on', b.dataset.mode === this.mode);
    if (this.mode === 'walk') {
      // Land where you were hovering — beside a building, not inside one.
      this.pos.y = 0;
      for (let k = 0; k < 40 && this.buildingAt(this.pos.x, this.pos.z); k++) this.pos.x += 6;
      this.pitch = Math.max(-0.5, Math.min(0.3, this.pitch));
      this._walker();
    } else {
      this.pos.y = Math.max(this.pos.y, 120);
      if (this.walker) this.walker.visible = false;
    }
    this.$('[data-help]').textContent = this.mode === 'fly'
      ? 'W A S D fly · Space / C up and down · Shift fast · drag to look · F walk · M places'
      : 'W A S D walk · Shift run · drag to look · wheel zooms · F fly · M places';
    this.root.focus();
  }

  /** The traveller you walk as: a figure from the asset library if it is there, else a plain marker. */
  _walker() {
    if (!this.walker) {
      this.walker = new THREE.Group();
      const marker = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1, 4, 10), new THREE.MeshLambertMaterial({ color: '#ff5da2' }));
      marker.position.y = 0.9;
      this.walker.add(marker);
      this.scene.add(this.walker);
      dress({ body: 'Rogue', show: [], tint: '#ffffff', height: 1.8, hat: false }).then((made) => {
        if (!made || !this.walker) return;
        this.walker.remove(marker);
        this.walker.add(made.model);
        this.walkerAnim = made;
      }).catch(() => {});
    }
    this.walker.visible = true;
    this.zoom ??= 9;
  }

  /** Jump to a place: above it, looking north across it. */
  goTo(wx, wz, { height = 0, name = '' } = {}) {
    this.setMode('fly');
    this.pos.set(wx, Math.max(180, height + 120), wz + 420 + height);
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
      const speed = (60 + this.pos.y * 0.6) * (fast ? 3.5 : 1);
      this.pos.x += (fx * f + rx * s) * speed * dt;
      this.pos.z += (fz * f + rz * s) * speed * dt;
      this.pos.y = Math.max(8, Math.min(2500, this.pos.y + up * speed * 0.7 * dt + f * Math.sin(this.pitch) * speed * dt * 0.6));
      this.speed = Math.hypot(f, s) * speed;
    } else {
      const speed = fast ? 9 : 4.2;
      const l = Math.hypot(f, s) || 1;
      const nx = this.pos.x + ((fx * f + rx * s) / l) * speed * dt;
      const nz = this.pos.z + ((fz * f + rz * s) / l) * speed * dt;
      // Walls stop you; slide along them where you can.
      if (!this.buildingAt(nx, nz)) {
        this.pos.x = nx;
        this.pos.z = nz;
      } else if (!this.buildingAt(nx, this.pos.z)) this.pos.x = nx;
      else if (!this.buildingAt(this.pos.x, nz)) this.pos.z = nz;
      const moving = Boolean(f || s);
      this.speed = moving ? speed : 0;
      if (moving) this.walker.rotation.y = Math.atan2(fx * f + rx * s, fz * f + rz * s);
      this.walker.position.set(this.pos.x, 0, this.pos.z);
      const a = this.walkerAnim;
      if (a) {
        const want = a.actions[moving ? (fast ? 'Running_A' : 'Walking_A') : 'Idle'];
        if (want && this._clip !== want) {
          want.reset().play();
          this._clip?.crossFadeTo(want, 0.2, false);
          this._clip = want;
        }
        a.mixer.update(dt);
      }
    }
    // Stay over the city.
    this.pos.x = Math.max(-21000, Math.min(21000, this.pos.x));
    this.pos.z = Math.max(-17000, Math.min(18000, this.pos.z));
  }

  _camera() {
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    if (this.mode === 'fly') {
      this.camera.position.copy(this.pos);
      this.camera.lookAt(this.pos.clone().add(dir));
    } else {
      const head = new THREE.Vector3(this.pos.x, 1.7, this.pos.z);
      this.camera.position.copy(head).addScaledVector(dir, -this.zoom);
      this.camera.position.y = Math.max(0.6, this.camera.position.y);
      this.camera.lookAt(head);
    }
    this.sun.position.copy(this.camera.position).addScaledVector(this.sunDir, 800);
    this.sun.target.position.copy(this.camera.position);
    this.sun.target.updateMatrixWorld();
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
      this.pitch = Math.max(-1.45, Math.min(this.mode === 'fly' ? 0.9 : 0.35, this.pitch - (e.clientY - drag.y) * 0.004));
      drag = { x: e.clientX, y: e.clientY };
    });
    const end = () => (drag = null);
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.mode === 'walk') this.zoom = Math.max(3, Math.min(40, this.zoom * (e.deltaY > 0 ? 1.12 : 0.89)));
      else this.pos.y = Math.max(8, Math.min(2500, this.pos.y * (e.deltaY > 0 ? 1.1 : 0.91)));
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
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (e.repeat) return;
      if (e.code === 'KeyF') this.setMode(this.mode === 'fly' ? 'walk' : 'fly');
      else if (e.code === 'KeyM') this.togglePlaces();
      else if (e.code === 'Escape') (this.$('[data-places]').hidden ? this.close() : this.togglePlaces(false));
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
      <h4>Tallest named buildings</h4><div class="seoul__list" data-landmarks></div>`;
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
      v.set(l.wx, l.height + 8, l.wz).project(this.camera);
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

  _frame(now) {
    this._raf = requestAnimationFrame((t) => this._frame(t));
    const dt = Math.min(0.1, (now - this._last) / 1000);
    this._last = now;
    this._move(dt);
    this._camera();
    this._stream();
    this._where();
    this.renderer.render(this.scene, this.camera);
    this._labels();
  }
}
