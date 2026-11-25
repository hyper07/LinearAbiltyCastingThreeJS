import { BIKE_COURSES, courseStats } from './course.js';
import { decodeTile, tileKey, tileOf, TILE } from './tiles.js';
import { tileRings } from './walls.js';

/**
 * Kickrani's course picker map: a real map of Seoul drawn from the game's own
 * data, with no download of its own —
 *
 *   the land from terrain.bin: the Han, the streams and lakes (its water
 *     mask), the wooded hills (steep or high ground, as the city colours
 *     them) with a soft hill shade;
 *   every road from roads.bin (motorways and trunk roads bold, down to
 *     tertiary roads thin), the small streets from alleys.bin faintly when
 *     close, bridges dark-edged over the river;
 *   building footprints from the map tiles when close;
 *   the 25 districts' names, the hills, and landmarks (N Seoul Tower,
 *     Gyeongbokgung, Lotte World Tower, the 63 Building …);
 *   every course at its true size on its real streets, each in its colour —
 *     and the one picked (or pointed at in the list) with its route: the start
 *     and finish, arrows the way it runs, its short cuts dotted, its sharp
 *     turns ringed, and its length and turns beside it.
 *
 * Pan (drag), zoom (wheel, pinch, + −), and fly smoothly to a course.
 *
 * Fast: what stands still is drawn once into 256-pixel tiles per zoom level
 * (the land per pixel from the terrain grid, then buildings and roads as
 * vectors), kept, and laid out each frame; a tile not drawn yet borrows its
 * parent's picture until it is. Only the courses, pins and names are drawn
 * each frame.
 */

/** Each course's colour on the map (and its pin). */
export const COURSE_COLORS = { gwanghwamun: '#ff5a36', dongdaemun: '#e23ad0', namsan: '#1f9e4a', hongdae: '#8a4dff', yeouido: '#1c7ef2', cheongnyangni: '#f08c00', teheran: '#00a596', jamsil: '#ff2f72' };

/** Places named on the map (world metres: x east, z south of City Hall). `big`: named from further out. */
export const LANDMARKS = [
  { name: 'N Seoul Tower', ko: 'N서울타워', x: 907, z: 1673, icon: 'tower', big: true },
  { name: 'Gyeongbokgung', ko: '경복궁', x: -82, z: -1479, icon: 'palace', big: true },
  { name: 'Lotte World Tower', ko: '롯데월드타워', x: 11012, z: 5953, icon: 'tower', big: true },
  { name: '63 Building', ko: '63빌딩', x: -3367, z: 5170, icon: 'tower', big: true },
  { name: 'City Hall', ko: '서울시청', x: 6, z: -25, icon: 'hall' },
  { name: 'Changdeokgung', ko: '창덕궁', x: 1155, z: -1457, icon: 'palace' },
  { name: 'Seoul Station', ko: '서울역', x: -639, z: 1284, icon: 'station' },
  { name: 'DDP', ko: '동대문디자인플라자', x: 2763, z: -25, icon: 'hall' },
  { name: 'COEX', ko: '코엑스', x: 7211, z: 6067, icon: 'hall' },
  { name: 'Olympic Park', ko: '올림픽공원', x: 12682, z: 5063, icon: 'park' },
  { name: 'Seoul Forest', ko: '서울숲', x: 5255, z: 2427, icon: 'park' },
  { name: 'Yeouido Park', ko: '여의도공원', x: -4883, z: 4445, icon: 'park' },
  { name: 'World Cup Stadium', ko: '월드컵경기장', x: -7132, z: -230, icon: 'stadium' },
  { name: 'Jamsil Stadium', ko: '잠실종합운동장', x: 8307, z: 5999, icon: 'stadium' }
];
const HILLS = [
  { name: 'Namsan', ko: '남산', x: 700, z: 1900 },
  { name: 'Bugaksan', ko: '북악산', x: 272, z: -2944 },
  { name: 'Inwangsan', ko: '인왕산', x: -1733, z: -1813 },
  { name: 'Bukhansan', ko: '북한산', x: 0, z: -10247 },
  { name: 'Gwanaksan', ko: '관악산', x: -1253, z: 13504 },
  { name: 'Achasan', ko: '아차산', x: 11102, z: -418 },
  { name: 'Umyeonsan', ko: '우면산', x: 3604, z: 10408 }
];
const RIVER_LABELS = [[-4237, 3913], [2834, 5247], [9022, 4578], [-9200, 900]];

/** Pixels a metre at zoom level 0 (1 px = 64 m); each level doubles it. */
const BASE = 1 / 64;
const T = 256;
const MAX_LEVEL = 8;
/** The zoom range, pixels a metre. */
export const ZOOM = { min: 0.012, max: 3.5 };
/** Roads by class: [width at least (px), casing, fill]. 0 motorway … 4 tertiary; small streets last. */
const ROAD_LOOK = [
  [2.4, '#b4622a', '#f6a25a'],
  [2.0, '#b48a2a', '#ffd36a'],
  [1.6, '#b0a070', '#fff0b8'],
  [1.2, '#bdb4a0', '#ffffff'],
  [0.9, '#cfc6b2', '#ffffff']
];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** The highest class a level draws (fewer roads further out), and whether it draws the small streets and buildings. */
export function levelShows(L) {
  return { cls: L <= 1 ? 1 : L === 2 ? 2 : L === 3 ? 3 : 4, small: L >= 6, buildings: L >= 5 };
}

/** The zoom level to draw a view at `s` pixels a metre (with the screen's pixel ratio). */
export function levelFor(s, dpr = 1) {
  return clamp(Math.round(Math.log2((s * dpr) / BASE)), 0, MAX_LEVEL);
}

/** A view (centre, pixels a metre) that fits a box of the world in a W × H screen with a margin. */
export function fitView(x0, z0, x1, z1, W, H, pad = 40) {
  const s = clamp(Math.min((W - pad * 2) / Math.max(1, x1 - x0), (H - pad * 2) / Math.max(1, z1 - z0)), ZOOM.min, ZOOM.max);
  return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, s };
}

/**
 * The land under the map, per terrain cell: how wooded (0–255: steep or high ground, the way the
 * city colours it) and a hill shade (−127…127, lit from the north-west).
 */
function landLayers(t) {
  const { cols, rows, cell } = t;
  const green = new Uint8Array(cols * rows);
  const shade = new Int8Array(cols * rows);
  const H = (i, j) => t.h[clamp(j, 0, rows - 1) * cols + clamp(i, 0, cols - 1)] / 10;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      if (t.water[k] === 1) continue;
      const dx = (H(i + 1, j) - H(i - 1, j)) / (2 * cell);
      const dy = (H(i, j + 1) - H(i, j - 1)) / (2 * cell);
      const h = t.h[k] / 10;
      const g = clamp(Math.hypot(dx, dy) * 5 - 0.25, 0, 1) + clamp((h - 110) / 120, 0, 1);
      green[k] = Math.round(clamp(g, 0, 1) * 255);
      // (rows run north: up the map. Lit from up-left: ground falling away to the north-west is bright)
      shade[k] = Math.round(clamp((dx - dy) * 3.2, -1, 1) * 127);
    }
  }
  return { green, shade };
}

export class CourseMap {
  /**
   * @param {any} game the SeoulGame (terrain, roads, map tiles, districts)
   * @param {{ plans: () => Map<string, any>, picked: () => string, onHover?: (id: string|null) => void, onPick?: (id: string) => void }} o
   */
  constructor(game, o) {
    this.g = game;
    this.o = o;
    this.root = document.createElement('div');
    this.root.className = 'cm';
    this.root.innerHTML = `<canvas class="cm__canvas" aria-label="Map of Seoul with the eight courses on their real streets"></canvas>
      <div class="cm__pins"></div>
      <div class="cm__ui"><button type="button" data-cm-zoom="1" aria-label="Zoom in">+</button><button type="button" data-cm-zoom="-1" aria-label="Zoom out">−</button><button type="button" data-cm-all title="All the courses">⌂ Seoul</button></div>
      <p class="cm__credit">Map: OpenStreetMap contributors (ODbL) · 국토교통부 · Copernicus DEM</p>`;
    this.cv = this.root.querySelector('canvas');
    this.ctx = this.cv.getContext('2d');
    this.pinsEl = this.root.querySelector('.cm__pins');
    this.pins = new Map();
    for (const c of BIKE_COURSES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cm__pin';
      b.dataset.pin = c.id;
      b.setAttribute('aria-label', c.name);
      b.style.setProperty('--c', COURSE_COLORS[c.id] ?? '#ff8a2a');
      b.innerHTML = `<i></i><span>${esc(c.name)}</span>`;
      b.onpointerenter = () => this.o.onHover?.(c.id);
      b.onpointerleave = () => this.o.onHover?.(null);
      b.onclick = () => this.o.onPick?.(c.id);
      this.pinsEl.append(b);
      this.pins.set(c.id, b);
    }
    this.view = { cx: 2000, cz: 2500, s: 0.04 };
    this.W = 800;
    this.H = 500;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.tiles = new Map();
    this.queue = new Set();
    this.bld = new Map();
    this.hover = null;
    this.focusId = null;
    this.dirty = true;
    this.t = 0;
    this.fitted = false;
    this.drawnTiles = 0;
    this._wire();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.root);
  }

  /** Put the map in a container (the lobby's course step), and start drawing. */
  attach(container) {
    container.append(this.root);
    this._resize();
    this.dirty = true;
    if (!this._raf) this._loop();
  }

  _resize() {
    const r = this.root.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const first = this.W === 800 && this.H === 500;
    this.W = r.width;
    this.H = r.height;
    this.cv.width = Math.round(r.width * this.dpr);
    this.cv.height = Math.round(r.height * this.dpr);
    if (!this.fitted || first) this.overview(false);
    this.dirty = true;
  }

  /* ------------------------------------------------------------ data */

  _data() {
    if (this.data) return this.data;
    const g = this.g;
    const t = g.terrain;
    const roads = [];
    for (const list of g.roadTiles?.values() ?? []) for (const r of list) roads.push(r);
    // Roads by 500 m square (each road listed in every square a point or a segment's middle is in).
    const CELL = 500;
    const cells = new Map();
    roads.forEach((r, k) => {
      const p = r.pts;
      let x0 = Infinity;
      let x1 = -Infinity;
      let z0 = Infinity;
      let z1 = -Infinity;
      const add = (x, z) => {
        const key = Math.floor(x / CELL) * 4096 + Math.floor(z / CELL);
        let at = cells.get(key);
        if (!at) cells.set(key, (at = []));
        if (at[at.length - 1] !== k) at.push(k);
      };
      for (let i = 0; i < p.length; i += 2) {
        add(p[i], p[i + 1]);
        if (i) add((p[i] + p[i - 2]) / 2, (p[i + 1] + p[i - 1]) / 2);
        x0 = Math.min(x0, p[i]);
        x1 = Math.max(x1, p[i]);
        z0 = Math.min(z0, p[i + 1]);
        z1 = Math.max(z1, p[i + 1]);
      }
      r._box = [x0, z0, x1, z1];
    });
    this.data = { t, land: t ? landLayers(t) : null, roads, cells, CELL };
    return this.data;
  }

  /* ------------------------------------------------------------ the view */

  /** Fit every course (all of central Seoul between them). */
  overview(animate = true) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const c of BIKE_COURSES) {
      x0 = Math.min(x0, c.x - 1800);
      x1 = Math.max(x1, c.x + 1800);
      z0 = Math.min(z0, c.z - 1800);
      z1 = Math.max(z1, c.z + 1500);
    }
    this.focusId = null;
    this.fitted = true;
    this.flyTo(fitView(x0, z0, x1, z1, this.W, this.H, 20), animate);
  }

  /** Fly to a course: its whole loop in view, with room round it for the streets it runs through. */
  focus(id, animate = true) {
    const plan = this.o.plans().get(id);
    const def = BIKE_COURSES.find((c) => c.id === id);
    if (!def) return;
    let box = [def.x - def.r * 1.6, def.z - def.r * 1.6, def.x + def.r * 1.6, def.z + def.r * 1.6];
    if (plan) {
      box = [Infinity, Infinity, -Infinity, -Infinity];
      for (const p of plan.points) {
        box[0] = Math.min(box[0], p[0]);
        box[1] = Math.min(box[1], p[1]);
        box[2] = Math.max(box[2], p[0]);
        box[3] = Math.max(box[3], p[1]);
      }
    }
    const padX = (box[2] - box[0]) * 0.18 + 80;
    const padZ = (box[3] - box[1]) * 0.18 + 80;
    this.focusId = id;
    this.flyTo(fitView(box[0] - padX, box[1] - padZ, box[2] + padX, box[3] + padZ, this.W, this.H, 30), animate);
  }

  flyTo(v, animate = true) {
    if (!animate) {
      this.anim = null;
      this.view = { ...v };
      this.dirty = true;
      return;
    }
    // (in log-zoom, with the centre and zoom eased together: an out-and-in when the hop is long)
    const from = { ...this.view };
    const dist = Math.hypot(v.cx - from.cx, v.cz - from.cz);
    const out = Math.min(Math.log(from.s), Math.log(v.s), Math.log(Math.max(ZOOM.min, Math.min(this.W, this.H) / Math.max(1, dist * 1.4))));
    this.anim = { from, to: { ...v }, out, t: 0, dur: clamp(0.5 + dist / 9000, 0.6, 1.3) };
    this.dirty = true;
  }

  /** Pointing at a course (a pin or a list chip): lit up and its route shown, or null. */
  highlight(id) {
    this.hover = id;
    for (const [k, b] of this.pins) b.classList.toggle('is-hover', k === id);
    this.dirty = true;
  }

  /** A course's plan came in: its loop on the map. */
  refresh() {
    this.dirty = true;
  }

  _zoomAt(px, py, k) {
    const v = this.view;
    const s = clamp(v.s * k, ZOOM.min, ZOOM.max);
    const wx = v.cx + (px - this.W / 2) / v.s;
    const wz = v.cz + (py - this.H / 2) / v.s;
    v.cx = wx - (px - this.W / 2) / s;
    v.cz = wz - (py - this.H / 2) / s;
    v.s = s;
    this.anim = null;
    this.dirty = true;
  }

  _wire() {
    const cv = this.cv;
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      this._zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-clamp(e.deltaY, -300, 300) * 0.0018));
    }, { passive: false });
    const ptrs = new Map();
    let moved = 0;
    let pinch = null;
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture?.(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: this.view.s };
      }
    });
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      const p = ptrs.get(e.pointerId);
      if (!p) {
        // hovering a course's line lights it up
        const id = this._hit(e.clientX - r.left, e.clientY - r.top);
        if (id !== this._lineHover) {
          this._lineHover = id;
          cv.style.cursor = id ? 'pointer' : 'grab';
          this.o.onHover?.(id);
        }
        return;
      }
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2 - r.left;
        const my = (a.y + b.y) / 2 - r.top;
        this._zoomAt(mx, my, (pinch.s * (d / Math.max(1, pinch.d))) / this.view.s);
        return;
      }
      this.view.cx -= dx / this.view.s;
      this.view.cz -= dy / this.view.s;
      this.anim = null;
      this.dirty = true;
      cv.style.cursor = 'grabbing';
    });
    const up = (e) => {
      const had = ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      cv.style.cursor = 'grab';
      if (had && moved < 6 && e.type === 'pointerup') {
        const r = cv.getBoundingClientRect();
        const id = this._hit(e.clientX - r.left, e.clientY - r.top);
        if (id) this.o.onPick?.(id);
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', () => {
      if (this._lineHover) {
        this._lineHover = null;
        this.o.onHover?.(null);
      }
    });
    for (const b of this.root.querySelectorAll('[data-cm-zoom]')) b.onclick = () => this._zoomAt(this.W / 2, this.H / 2, Number(b.dataset.cmZoom) > 0 ? 1.8 : 1 / 1.8);
    this.root.querySelector('[data-cm-all]').onclick = () => this.overview(true);
  }

  /** The course whose line is under a point of the screen (within 9 px), or null. */
  _hit(px, py) {
    const v = this.view;
    let best = null;
    let bd = 9;
    for (const [id, plan] of this.o.plans()) {
      const pts = plan.points;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const ax = (a[0] - v.cx) * v.s + this.W / 2;
        const ay = (a[1] - v.cz) * v.s + this.H / 2;
        const bx = (b[0] - v.cx) * v.s + this.W / 2;
        const by = (b[1] - v.cz) * v.s + this.H / 2;
        const dx = bx - ax;
        const dy = by - ay;
        const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
        const d = Math.hypot(px - ax - dx * t, py - ay - dy * t);
        if (d < bd) {
          bd = d;
          best = id;
        }
      }
    }
    return best;
  }

  /* ------------------------------------------------------------ tiles */

  _tileKey(L, i, j) {
    return `${L}/${i}/${j}`;
  }

  /** Draw one tile (land per pixel, then buildings and roads): a 256-pixel canvas. */
  _renderTile(L, i, j) {
    const D = this._data();
    const sc = BASE * 2 ** L;
    const tw = T / sc;
    const wx0 = i * tw;
    const wz0 = j * tw;
    const cv = document.createElement('canvas');
    cv.width = cv.height = T;
    const ctx = cv.getContext('2d');
    const t = D.t;
    // The land: water, town, wooded hills, the hill shade.
    const img = ctx.createImageData(T, T);
    const d = img.data;
    const land = D.land;
    for (let py = 0; py < T; py++) {
      const wz = wz0 + (py + 0.5) / sc;
      for (let px = 0; px < T; px++) {
        const wx = wx0 + (px + 0.5) / sc;
        const o = (py * T + px) * 4;
        let r = 226;
        let g = 233;
        let b = 236;
        if (t) {
          const fx = (wx - t.x0) / t.cell;
          const fy = (-wz - t.y0) / t.cell;
          if (fx >= 0 && fy >= 0 && fx < t.cols - 1 && fy < t.rows - 1) {
            const ci = fx | 0;
            const cj = fy | 0;
            const u = fx - ci;
            const w = fy - cj;
            const k = cj * t.cols + ci;
            const k2 = k + t.cols;
            const bl = (a) => a[k] * (1 - u) * (1 - w) + a[k + 1] * u * (1 - w) + a[k2] * (1 - u) * w + a[k2 + 1] * u * w;
            const water = bl(t.water);
            if (water > 0.5) {
              r = 138;
              g = 202;
              b = 240;
            } else {
              const gr = bl(land.green) / 255;
              const sh = 1 + (bl(land.shade) / 127) * 0.16;
              r = (244 + (156 - 244) * gr) * sh;
              g = (237 + (206 - 237) * gr) * sh;
              b = (220 + (128 - 220) * gr) * sh;
            }
          }
        }
        d[o] = r;
        d[o + 1] = g;
        d[o + 2] = b;
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.setTransform(sc, 0, 0, sc, -wx0 * sc, -wz0 * sc);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const show = levelShows(L);
    // Buildings (close up): their footprints, a shade darker the taller.
    if (show.buildings) {
      const O = this.g.origin;
      const [tx0, ty0] = tileOf(wx0 + O.x, -(wz0 + tw) + O.y);
      const [tx1, ty1] = tileOf(wx0 + tw + O.x, -wz0 + O.y);
      for (let tx = tx0; tx <= tx1; tx++) {
        for (let ty = ty0; ty <= ty1; ty++) {
          const key = tileKey(tx, ty);
          if (this.g.index?.tiles && !this.g.index.tiles[key]) continue;
          const rings = this._buildings(key, tx, ty);
          if (!rings) continue;
          for (const r of rings) {
            ctx.fillStyle = r.height > 40 ? '#cdbfa6' : r.height > 15 ? '#d8cbb3' : '#e2d6bf';
            ctx.beginPath();
            ctx.moveTo(r.xs[0], r.zs[0]);
            for (let k = 1; k < r.xs.length; k++) ctx.lineTo(r.xs[k], r.zs[k]);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
    // Roads: the small streets faint, then every main road's edge and then its fill, the biggest on top.
    const ids = new Set();
    const C = D.CELL;
    for (let ci = Math.floor(wx0 / C) - 1; ci <= Math.floor((wx0 + tw) / C) + 1; ci++) {
      for (let cj = Math.floor(wz0 / C) - 1; cj <= Math.floor((wz0 + tw) / C) + 1; cj++) {
        for (const k of D.cells.get(ci * 4096 + cj) ?? []) ids.add(k);
      }
    }
    const list = [];
    for (const k of ids) {
      const r = D.roads[k];
      if (r.small ? !show.small : r.cls > show.cls) continue;
      const bx = r._box;
      if (bx[2] < wx0 - 30 || bx[0] > wx0 + tw + 30 || bx[3] < wz0 - 30 || bx[1] > wz0 + tw + 30) continue;
      list.push(r);
    }
    list.sort((a, b) => (b.small ? 9 : b.cls) - (a.small ? 9 : a.cls));
    const line = (r) => {
      const p = r.pts;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      for (let k = 2; k < p.length; k += 2) ctx.lineTo(p[k], p[k + 1]);
    };
    const grow = 1 + Math.max(0, 5 - L) * 0.08;
    for (const pass of [0, 1]) {
      for (const r of list) {
        if (!r.small) continue;
        line(r);
        ctx.strokeStyle = pass ? '#ffffff' : '#d6ccb8';
        ctx.lineWidth = Math.max(0.9 / sc, r.width * 0.9) + (pass ? 0 : 1.2 / sc);
        ctx.stroke();
      }
    }
    for (const pass of [0, 1]) {
      for (const r of list) {
        if (r.small) continue;
        const look = ROAD_LOOK[Math.min(4, r.cls)];
        const px = Math.max(look[0] * grow, r.width * sc);
        line(r);
        if (pass === 0) {
          ctx.strokeStyle = r.bridge ? '#5c5470' : look[1];
          ctx.lineWidth = (px + (r.bridge ? 2.6 : 1.4)) / sc;
        } else {
          ctx.strokeStyle = look[2];
          ctx.lineWidth = px / sc;
        }
        ctx.stroke();
      }
    }
    this.drawnTiles++;
    return cv;
  }

  /** A map tile's buildings (fetched from the city's own tiles the first time: null until then). */
  _buildings(key, tx, ty) {
    const got = this.bld.get(key);
    if (got) return got === 'wait' ? null : got;
    this.bld.set(key, 'wait');
    fetch(`${this.g.base}${key}.bin`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((buf) => {
      const rings = buf ? tileRings(decodeTile(new Uint8Array(buf)), tx, ty, TILE, this.g.origin) : [];
      this.bld.set(key, rings);
      // the tiles of the map over it, drawn again with them
      const O = this.g.origin;
      const x0 = tx * TILE - O.x;
      const z1 = -(ty * TILE - O.y);
      for (const [k, c] of this.tiles) {
        const [L, i, j] = k.split('/').map(Number);
        if (!levelShows(L).buildings) continue;
        const tw = T / (BASE * 2 ** L);
        if (i * tw > x0 + TILE || (i + 1) * tw < x0 || j * tw > z1 || (j + 1) * tw < z1 - TILE) continue;
        c.stale = true;
      }
      this.dirty = true;
    }).catch(() => this.bld.set(key, []));
    return null;
  }

  /* ------------------------------------------------------------ drawing */

  _loop() {
    this._raf = requestAnimationFrame((now) => {
      this._raf = null;
      if (!this.root.isConnected) return;
      const dt = Math.min(0.1, (now - (this._last ?? now)) / 1000);
      this._last = now;
      this.t += dt;
      this._step(dt);
      this._loop();
    });
  }

  _step(dt) {
    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.dur);
      const e = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2;
      const l0 = Math.log(a.from.s);
      const l1 = Math.log(a.to.s);
      // zoom: out toward `out` mid-way, then in (a parabola through the three)
      const lin = l0 + (l1 - l0) * e;
      const dip = Math.min(0, a.out - Math.min(l0, l1)) * 4 * e * (1 - e);
      this.view = { cx: a.from.cx + (a.to.cx - a.from.cx) * e, cz: a.from.cz + (a.to.cz - a.from.cz) * e, s: Math.exp(lin + dip) };
      if (a.t >= 1) this.anim = null;
      this.dirty = true;
    }
    // (the rider running round the course picked: always moving)
    const moving = Boolean(this.focusId || this.hover);
    if (!this.dirty && !moving && !this.queue.size) return;
    this.dirty = false;
    this._draw();
    // tiles still to draw: a few a frame (about 8 ms)
    const t0 = performance.now();
    for (const k of [...this.queue]) {
      if (performance.now() - t0 > 8) break;
      this.queue.delete(k);
      const [L, i, j] = k.split('/').map(Number);
      const cv = this._renderTile(L, i, j);
      this.tiles.set(k, cv);
      this.dirty = true;
    }
    // keep the most recent few hundred tiles
    if (this.tiles.size > 220) for (const k of [...this.tiles.keys()].slice(0, this.tiles.size - 180)) this.tiles.delete(k);
  }

  _draw() {
    const ctx = this.ctx;
    const v = this.view;
    const dpr = this.dpr;
    const W = this.W;
    const H = this.H;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#e2e9ec';
    ctx.fillRect(0, 0, W, H);
    if (!this.g.terrain && !this.g.roadTiles) return;
    const L = levelFor(v.s, dpr);
    const sc = BASE * 2 ** L;
    const tw = T / sc;
    const wx0 = v.cx - W / 2 / v.s;
    const wz0 = v.cz - H / 2 / v.s;
    const wx1 = v.cx + W / 2 / v.s;
    const wz1 = v.cz + H / 2 / v.s;
    ctx.imageSmoothingEnabled = true;
    const want = new Set();
    for (let i = Math.floor(wx0 / tw); i <= Math.floor(wx1 / tw); i++) {
      for (let j = Math.floor(wz0 / tw); j <= Math.floor(wz1 / tw); j++) {
        const key = this._tileKey(L, i, j);
        const sx = (i * tw - v.cx) * v.s + W / 2;
        const sy = (j * tw - v.cz) * v.s + H / 2;
        const size = tw * v.s;
        let c = this.tiles.get(key);
        if (c?.stale) want.add(key);
        if (c) {
          // (used: to the back of the queue for forgetting)
          this.tiles.delete(key);
          this.tiles.set(key, c);
          ctx.drawImage(c, sx, sy, size + 0.5, size + 0.5);
          continue;
        }
        want.add(key);
        // not drawn yet: the nearest coarser tile's piece of it
        for (let up = 1; up <= L; up++) {
          const f = 2 ** up;
          const pk = this._tileKey(L - up, Math.floor(i / f), Math.floor(j / f));
          const pc = this.tiles.get(pk);
          if (!pc) continue;
          const sub = T / f;
          ctx.drawImage(pc, (((i % f) + f) % f) * sub, (((j % f) + f) % f) * sub, sub, sub, sx, sy, size + 0.5, size + 0.5);
          break;
        }
      }
    }
    // (the nearest first, from the middle out)
    this.queue = new Set([...want].sort((a, b) => {
      const [, ai, aj] = a.split('/').map(Number);
      const [, bi, bj] = b.split('/').map(Number);
      const ci = v.cx / tw - 0.5;
      const cj = v.cz / tw - 0.5;
      return Math.hypot(ai - ci, aj - cj) - Math.hypot(bi - ci, bj - cj);
    }));
    this._overlay(ctx);
  }

  /** The screen point of a world point. */
  _sp(x, z) {
    const v = this.view;
    return [(x - v.cx) * v.s + this.W / 2, (z - v.cz) * v.s + this.H / 2];
  }

  _label(ctx, text, x, y, { size = 13, color = '#3a3346', halo = '#fffaf0', weight = 800, italic = false, align = 'center' } = {}) {
    ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px Nunito, system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width;
    const box = [align === 'left' ? x : x - w / 2, y - size / 2, w, size];
    for (const b of this._boxes) if (box[0] < b[0] + b[2] && box[0] + box[2] > b[0] && box[1] < b[1] + b[3] && box[1] + box[3] > b[1]) return false;
    this._boxes.push(box);
    ctx.lineWidth = 4;
    ctx.strokeStyle = halo;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    return true;
  }

  _overlay(ctx) {
    const v = this.view;
    const W = this.W;
    const H = this.H;
    this._boxes = [];
    const plans = this.o.plans();
    const picked = this.o.picked();
    const lit = new Set([this.hover, this.focusId, picked].filter(Boolean));
    const close = v.s > 0.09;
    // The courses: each its loop, at its true size on its streets.
    for (const c of BIKE_COURSES) {
      const plan = plans.get(c.id);
      if (!plan) continue;
      const col = COURSE_COLORS[c.id] ?? '#ff8a2a';
      const on = lit.has(c.id);
      const pts = plan.points;
      const stepN = v.s < 0.05 ? 4 : 1;
      ctx.beginPath();
      for (let i = 0; i <= pts.length; i += stepN) {
        const p = pts[i % pts.length];
        const [x, y] = this._sp(p[0], p[1]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const w = on ? clamp(v.s * 9, 4, 11) : clamp(v.s * 6, 2.5, 7);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = w + (on ? 5 : 3);
      ctx.globalAlpha = on ? 1 : 0.9;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (on && close) this._route(ctx, c, plan, col, w);
    }
    // The hills, the river, the districts, the landmarks (drawn under the pins, over the land).
    if (v.s < 0.5) {
      for (const h of HILLS) {
        const [x, y] = this._sp(h.x, h.z);
        if (x < -40 || y < -20 || x > W + 40 || y > H + 20) continue;
        this._label(ctx, `▲ ${h.name}`, x, y, { size: 12, color: '#2f6a2a', weight: 800 });
      }
      for (const [rx, rz] of RIVER_LABELS) {
        if (this.g.waterAt && !this.g.waterAt(rx, rz)) continue;
        const [x, y] = this._sp(rx, rz);
        if (x < -60 || y < -20 || x > W + 60 || y > H + 20) continue;
        this._label(ctx, '한강 Han River', x, y, { size: v.s > 0.08 ? 16 : 14, color: '#1d5f9c', halo: 'rgba(200,232,250,0.9)', italic: true, weight: 900 });
      }
    }
    const marks = LANDMARKS.filter((m) => m.big || v.s > 0.06);
    for (const m of marks) {
      const [x, y] = this._sp(m.x, m.z);
      if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
      this._icon(ctx, m.icon, x, y);
      this._label(ctx, m.name, x + 10, y, { size: m.big ? 12.5 : 11.5, color: '#2b1d4e', weight: 900, align: 'left' });
    }
    if (v.s > 0.018 && v.s < 0.4) {
      const fade = clamp((0.4 - v.s) / 0.15, 0, 1);
      ctx.globalAlpha = 0.75 * fade;
      for (const d of this.g.index?.districts ?? []) {
        const [x, y] = this._sp(d.x - this.g.origin.x, -(d.y - this.g.origin.y));
        if (x < -40 || y < -20 || x > W + 40 || y > H + 20) continue;
        this._label(ctx, d.name, x, y, { size: v.s > 0.08 ? 15 : 13, color: '#6a5a72', weight: 900 });
      }
      ctx.globalAlpha = 1;
    }
    // The pins: at each course's start (its middle until it is planned).
    for (const c of BIKE_COURSES) {
      const b = this.pins.get(c.id);
      const plan = plans.get(c.id);
      const at = plan ? plan.points[0] : [c.x, c.z];
      const [x, y] = this._sp(at[0], at[1]);
      const out = x < -30 || y < -30 || x > W + 30 || y > H + 30;
      b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      b.hidden = out;
      b.classList.toggle('is-on', c.id === picked);
      b.classList.toggle('is-close', close);
    }
    // a scale bar
    const m = [50, 100, 200, 500, 1000, 2000, 5000].find((k) => k * v.s > 70) ?? 5000;
    const len = m * v.s;
    ctx.fillStyle = 'rgba(255,250,240,0.85)';
    ctx.fillRect(10, H - 30, len + 20, 22);
    ctx.fillStyle = '#2b1d4e';
    ctx.fillRect(20, H - 16, len, 4);
    ctx.font = '800 11px Nunito, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(m >= 1000 ? `${m / 1000} km` : `${m} m`, 22, H - 23);
  }

  /** A landmark's little sign: a tower, a palace roof, a park's tree, a stadium, a station, a hall. */
  _icon(ctx, kind, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2b1d4e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = { tower: '#d43c9a', palace: '#c2410c', park: '#2f9e44', stadium: '#1c7ef2', station: '#5f3dc4', hall: '#495057' }[kind] ?? '#495057';
    ctx.beginPath();
    if (kind === 'tower') {
      ctx.moveTo(0, -5.5);
      ctx.lineTo(2.2, 4.5);
      ctx.lineTo(-2.2, 4.5);
    } else if (kind === 'palace') {
      ctx.moveTo(-5, -0.5);
      ctx.quadraticCurveTo(0, -5.5, 5, -0.5);
      ctx.lineTo(3.5, 4);
      ctx.lineTo(-3.5, 4);
    } else if (kind === 'park') {
      ctx.arc(0, -1, 4, 0, Math.PI * 2);
      ctx.rect(-0.8, 1, 1.6, 4);
    } else if (kind === 'stadium') {
      ctx.ellipse(0, 0, 5, 3.4, 0, 0, Math.PI * 2);
    } else ctx.rect(-4, -3.5, 8, 7);
    ctx.fill();
    ctx.restore();
  }

  /**
   * The course in focus, close: its short cuts dotted, its sharp turns ringed, arrows the way it
   * runs, a chequered start and finish, a rider running round it, and its numbers beside it.
   */
  _route(ctx, c, plan, col, w) {
    const pts = plan.points;
    const n = pts.length;
    // short cuts: dotted cyan, off the loop
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.lineCap = 'butt';
    for (const sc of plan.shortcuts ?? []) {
      ctx.beginPath();
      sc.points.forEach((q, i) => {
        const [x, y] = this._sp(q[0], q[1]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = w * 0.7 + 3;
      ctx.stroke();
      ctx.strokeStyle = '#00b8e6';
      ctx.lineWidth = w * 0.7;
      ctx.stroke();
    }
    ctx.restore();
    // sharp turns
    const st = (plan._stats ??= courseStats(plan));
    for (const t of st.turns) {
      if (t.angle <= Math.PI / 3) continue;
      const [x, y] = this._sp(pts[t.i][0], pts[t.i][1]);
      ctx.strokeStyle = '#d43c9a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, w + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // arrows the way it runs, every ~80 px
    const v = this.view;
    const every = Math.max(30, 80 / v.s);
    let next = every * 0.5;
    for (let i = 1; i < n; i++) {
      if (plan.s[i] < next) continue;
      next += every;
      const a = pts[i - 1];
      const b = pts[i];
      const [x, y] = this._sp(b[0], b[1]);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const k = Math.max(4, w * 0.75);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2b1d4e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(k * 1.2, 0);
      ctx.lineTo(-k * 0.8, -k);
      ctx.lineTo(-k * 0.3, 0);
      ctx.lineTo(-k * 0.8, k);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // start and finish: a chequered flag on a post
    const [sx, sy] = this._sp(pts[0][0], pts[0][1]);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.strokeStyle = '#2b1d4e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -30);
    ctx.stroke();
    for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) {
      ctx.fillStyle = (a + b) % 2 ? '#2b1d4e' : '#ffffff';
      ctx.fillRect(a * 5, -30 + b * 5, 5, 5);
    }
    ctx.strokeRect(0, -30, 20, 15);
    ctx.restore();
    // a rider running round it, about a lap every eight seconds
    const u = ((this.t / 8) % 1) * plan.length;
    let i = 0;
    while (i < n - 1 && plan.s[i + 1] < u) i++;
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const f = clamp((u - plan.s[i]) / Math.max(0.01, (plan.s[i + 1] ?? plan.length) - plan.s[i]), 0, 1);
    const [rx, ry] = this._sp(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f);
    ctx.fillStyle = '#ffd23a';
    ctx.strokeStyle = '#2b1d4e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(rx, ry, Math.max(5, w * 0.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // its numbers, in a tag above the loop
    let top = Infinity;
    let left = Infinity;
    let right = -Infinity;
    for (const p2 of pts) {
      const [x, y] = this._sp(p2[0], p2[1]);
      top = Math.min(top, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
    const sc = plan.shortcuts?.length ?? 0;
    const text = `${(plan.length / 1000).toFixed(1)} km · ${st.sharp} sharp turn${st.sharp === 1 ? '' : 's'}${sc ? ` · ${sc} short cut` : ''}`;
    ctx.font = '900 13px Nunito, system-ui, sans-serif';
    const tw = ctx.measureText(text).width + 20;
    const tx = clamp((left + right) / 2 - tw / 2, 6, this.W - tw - 6);
    const ty = clamp(top - 46, 6, this.H - 30);
    ctx.fillStyle = col;
    ctx.strokeStyle = '#2b1d4e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, 24, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tx + 10, ty + 12.5);
    this._boxes.push([tx, ty, tw, 24]);
  }

  dispose() {
    this._ro?.disconnect();
    if (this._raf) cancelAnimationFrame(this._raf);
    this.root.remove();
    this.tiles.clear();
  }
}
