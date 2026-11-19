/**
 * The full map: a large top-down map of the whole area, opened with O (or
 * the Map entry in the pause menu, or the button on the minimap), drawn
 * from the same painted canvas as the minimap — 1 px a metre, north up —
 * with area names, the player's arrow, companions and the places that
 * matter, and a legend. Wheel or pinch zooms, dragging pans, ⌖ recenters;
 * a click sets a waypoint (a pin here and on the minimap, a beam in the
 * world, a direction cue on screen), a click on the pin clears it.
 *
 * The game pauses (single player) and stops drawing 3D while it is open;
 * the map itself draws only when something changes.
 *
 * It knows nothing of a particular world: a zone hands it its map data —
 * `{ title, base, extent, areas, legend, markers }` — and setZone() swaps
 * them when the player crosses into another zone. A game made of zones also
 * passes `world()` (shared/zones/manager.js): a World tab then shows every
 * zone and how their portals join them, the ones not yet visited as "?".
 *
 * MapView (world ↔ screen, zoom and pan, clamped) and Waypoint are pure and
 * tested in tests/unit/worldMap.test.mjs.
 */

export const MAP_KEY = 'KeyO';
export const MAP_KEY_LABEL = 'O';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Where the map sits on screen: `extent` {x0, x1, z0, z1} in metres (x to
 * the right, z down the page — north up), a view of w×h pixels, a zoom from
 * 1 (the whole map fits) to `maxZoom`, and the world point at the view's middle.
 */
export class MapView {
  constructor(extent, { maxZoom = 8 } = {}) {
    this.extent = extent;
    this.maxZoom = maxZoom;
    this.w = 1;
    this.h = 1;
    this.zoom = 1;
    this.cx = (extent.x0 + extent.x1) / 2;
    this.cz = (extent.z0 + extent.z1) / 2;
  }

  get W() {
    return this.extent.x1 - this.extent.x0;
  }

  get H() {
    return this.extent.z1 - this.extent.z0;
  }

  /** Pixels a metre: the whole map fits at zoom 1. */
  get scale() {
    return Math.min(this.w / this.W, this.h / this.H) * this.zoom;
  }

  setSize(w, h) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.clamp();
  }

  toScreen(x, z) {
    const s = this.scale;
    return [this.w / 2 + (x - this.cx) * s, this.h / 2 + (z - this.cz) * s];
  }

  toWorld(sx, sy) {
    const s = this.scale;
    return [this.cx + (sx - this.w / 2) / s, this.cz + (sy - this.h / 2) / s];
  }

  /** Keep the map in view: no panning past its edges (centred on an axis where it's smaller than the view). */
  clamp() {
    const s = this.scale;
    const hw = this.w / 2 / s;
    const hh = this.h / 2 / s;
    const { x0, x1, z0, z1 } = this.extent;
    this.cx = hw * 2 >= this.W ? (x0 + x1) / 2 : clamp(this.cx, x0 + hw, x1 - hw);
    this.cz = hh * 2 >= this.H ? (z0 + z1) / 2 : clamp(this.cz, z0 + hh, z1 - hh);
  }

  /** Zoom by `factor` keeping the world point under (sx, sy) where it is (as far as the clamps allow). */
  zoomAt(factor, sx = this.w / 2, sy = this.h / 2) {
    const [wx, wz] = this.toWorld(sx, sy);
    this.zoom = clamp(this.zoom * factor, 1, this.maxZoom);
    const s = this.scale;
    this.cx = wx - (sx - this.w / 2) / s;
    this.cz = wz - (sy - this.h / 2) / s;
    this.clamp();
  }

  /** Drag by (dx, dy) screen pixels: the map follows the pointer. */
  pan(dx, dy) {
    const s = this.scale;
    this.cx -= dx / s;
    this.cz -= dy / s;
    this.clamp();
  }

  /** Centre on a world point (clamped). */
  centerOn(x, z) {
    this.cx = x;
    this.cz = z;
    this.clamp();
  }
}

/** A waypoint: set by a click, cleared by a click on it (within `radius` metres) or clear(). */
export class Waypoint {
  constructor() {
    this.point = null;
    this.listeners = new Set();
  }

  set(x, z) {
    this.point = { x, z };
    this._emit();
    return this.point;
  }

  clear() {
    this.point = null;
    this._emit();
  }

  /** A click on the map at (x, z): clears the pin when it's on it, else moves the pin there. Returns the new point or null. */
  click(x, z, radius = 6) {
    if (this.point && Math.hypot(this.point.x - x, this.point.z - z) <= radius) {
      this.clear();
      return null;
    }
    return this.set(x, z);
  }

  /** Distance and world bearing (radians, 0 = +z) from (x, z), or null with no pin. */
  from(x, z) {
    if (!this.point) return null;
    const dx = this.point.x - x;
    const dz = this.point.z - z;
    return { dist: Math.hypot(dx, dz), bearing: Math.atan2(dx, dz) };
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    for (const fn of this.listeners) fn(this.point);
  }
}

/* ------------------------------------------------------------------ the overlay */

const CSS = `
.wm{position:absolute;inset:0;z-index:60;display:grid;grid-template-columns:1fr auto;gap:12px;padding:18px;background:rgba(8,8,12,.78);backdrop-filter:blur(2px);color:#f3ead8;font:14px/1.35 system-ui,sans-serif}
.wm__stage{position:relative;border-radius:14px;overflow:hidden;background:#11100d;box-shadow:0 0 0 2px rgba(255,230,180,.28) inset;min-height:200px;touch-action:none;cursor:grab}
.wm__stage.is-drag{cursor:grabbing}
.wm canvas{position:absolute;inset:0;width:100%;height:100%}
.wm__side{display:flex;flex-direction:column;gap:10px;width:min(240px,32vw);overflow:auto}
.wm__side h2{margin:0;font-size:1.25em;letter-spacing:.04em}
.wm__btns{display:flex;flex-wrap:wrap;gap:6px}
.wm button{font:inherit;color:inherit;background:rgba(255,255,255,.1);border:1px solid rgba(255,230,180,.35);border-radius:8px;padding:.35em .7em;cursor:pointer}
.wm button:hover{background:rgba(255,255,255,.2)}
.wm button:focus-visible{outline:2px solid #ffd77a;outline-offset:2px}
.wm__legend{list-style:none;margin:0;padding:0;display:grid;gap:5px}
.wm__legend li{display:flex;align-items:center;gap:8px}
.wm__legend canvas{position:static;width:18px;height:18px;flex:none}
.wm__tip{margin:0;opacity:.75;font-size:.9em}
.wm__tabs{display:flex;gap:4px}
.wm__tabs button[aria-pressed=true]{background:rgba(255,215,122,.3);border-color:#ffd77a}
.wm-btn{position:absolute;z-index:3;right:-4px;top:-4px;width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,230,180,.7);background:rgba(20,16,10,.85);color:#ffe9b8;font-size:15px;line-height:1;cursor:pointer;pointer-events:auto;display:grid;place-items:center}
.wm-cue{position:absolute;left:50%;top:64px;transform:translateX(-50%);z-index:5;display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:rgba(10,8,14,.55);color:#ffd0f6;font:600 13px/1 system-ui,sans-serif;pointer-events:none}
.wm-cue i{display:inline-block;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:14px solid #ff5ad9}
@media (max-width:720px){.wm{grid-template-columns:1fr;grid-template-rows:1fr auto;padding:10px}.wm__side{width:auto;max-height:34vh}}
`;
let styled = false;
function styles() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.dataset.worldMapStyle = '';
  s.textContent = CSS;
  document.head.append(s);
}

/** Draw one marker shape at (x, y), size `r` (CSS px × dpr already applied by the caller). */
export function drawMarker(g, kind, x, y, r, color = '#fff') {
  g.save();
  g.lineWidth = Math.max(1, r * 0.28);
  g.strokeStyle = 'rgba(0,0,0,0.75)';
  g.fillStyle = color;
  g.beginPath();
  if (kind === 'diamond') {
    g.moveTo(x, y - r * 1.3);
    g.lineTo(x + r * 1.1, y);
    g.lineTo(x, y + r * 1.3);
    g.lineTo(x - r * 1.1, y);
    g.closePath();
  } else if (kind === 'square') {
    g.rect(x - r, y - r * 0.75, r * 2, r * 1.5);
  } else if (kind === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.5 : r * 1.3;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  } else if (kind === 'skull') {
    g.arc(x, y - r * 0.2, r * 1.1, Math.PI * 0.85, Math.PI * 2.15);
    g.lineTo(x + r * 0.6, y + r * 1.0);
    g.lineTo(x - r * 0.6, y + r * 1.0);
    g.closePath();
  } else if (kind === 'heart') {
    g.moveTo(x, y + r);
    g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.5);
    g.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r);
  } else if (kind === 'pin') {
    g.arc(x, y - r * 1.6, r * 0.9, Math.PI, 0);
    g.lineTo(x, y);
    g.closePath();
  } else if (kind === 'tent') {
    g.moveTo(x, y - r * 1.3);
    g.lineTo(x + r * 1.3, y + r);
    g.lineTo(x - r * 1.3, y + r);
    g.closePath();
  } else {
    g.arc(x, y, r, 0, Math.PI * 2);
  }
  g.fill();
  g.stroke();
  g.restore();
}

/**
 * @param {object} o
 * @param {HTMLElement} o.host        the game's root
 * @param {string} o.title
 * @param {HTMLCanvasElement} o.base  the painted map, 1 px a metre from (extent.x0, extent.z0)
 * @param {{x0,x1,z0,z1}} o.extent
 * @param {{name:string,x:number,z:number}[]} [o.areas]
 * @param {{shape:string,color:string,label:string}[]} [o.legend]
 * @param {() => {x:number,z:number,shape?:string,color?:string,r?:number,label?:string}[]} [o.markers]
 * @param {() => {x:number,z:number,yaw:number}} o.player   yaw: 0 faces +z (down the page)
 * @param {Waypoint} o.waypoint
 * @param {() => void} [o.onOpen]  pause the game
 * @param {() => void} [o.onClose] resume it
 */
export class WorldMap {
  constructor({ host, title = 'Map', base, extent, areas = [], legend = [], markers = () => [], player, waypoint, world = null, onOpen = () => {}, onClose = () => {} }) {
    styles();
    Object.assign(this, { host, title, base, extent, areas, legend, markers, player, waypoint, world, onOpen, onClose });
    this.tab = 'zone';
    this.view = new MapView(extent);
    this.el = null;
    this._raf = 0;
    this._offWp = waypoint.onChange(() => this.redraw());
  }

  /** Another zone's map data (its painted base, bounds, names, legend, markers); the waypoint is the caller's to keep or clear. */
  setZone({ title = this.title, base = this.base, extent = this.extent, areas = [], legend = this.legend, markers = this.markers } = {}) {
    Object.assign(this, { title, base, extent, areas, legend, markers });
    this.view = new MapView(extent);
    if (this.el) {
      this.close();
      this.open();
    }
  }

  get isOpen() {
    return Boolean(this.el);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  /** Open on the World tab (a hub's map board). */
  openWorld() {
    this.open({ tab: 'world' });
  }

  open({ tab = 'zone' } = {}) {
    if (this.el) return;
    this.tab = this.world && tab === 'world' ? 'world' : 'zone';
    const el = document.createElement('div');
    el.className = 'wm';
    el.dataset.worldMap = '';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', this.title);
    el.innerHTML = `<div class="wm__stage" data-map-stage><canvas></canvas></div>
      <aside class="wm__side"><h2></h2>
        ${this.world ? '<div class="wm__tabs" role="group" aria-label="Map view"><button type="button" data-map-tab="zone">This zone</button><button type="button" data-map-tab="world">World</button></div>' : ''}
        <div class="wm__btns"><button type="button" data-map-zoom="in" aria-label="Zoom in">＋</button><button type="button" data-map-zoom="out" aria-label="Zoom out">－</button><button type="button" data-map-center title="Back to you">⌖ You</button><button type="button" data-map-clear>Clear pin</button><button type="button" data-map-close>Close (${MAP_KEY_LABEL})</button></div>
        <ul class="wm__legend"></ul>
        <p class="wm__tip">Click to set a waypoint, click it again to clear. Wheel or pinch to zoom, drag to pan.</p>
      </aside>`;
    el.querySelector('h2').textContent = this.title;
    const legend = el.querySelector('.wm__legend');
    for (const item of [{ shape: 'arrow', color: '#ffffff', label: 'You' }, { shape: 'pin', color: '#ff5ad9', label: 'Waypoint' }, ...this.legend]) {
      const li = document.createElement('li');
      const c = document.createElement('canvas');
      c.width = c.height = 36;
      const g = c.getContext('2d');
      if (item.shape === 'arrow') arrow(g, 18, 18, Math.PI, 12, item.color);
      else drawMarker(g, item.shape, 18, item.shape === 'pin' ? 30 : 18, 9, item.color);
      li.append(c, document.createTextNode(item.label));
      legend.append(li);
    }
    this.host.append(el);
    this.el = el;
    this.canvas = el.querySelector('canvas');
    this._bind();
    const p = this.player();
    this.view.zoom = 1;
    this._fit();
    if (p) this.view.centerOn(p.x, p.z);
    this.onOpen();
    this.redraw();
    el.querySelector('[data-map-close]').focus();
  }

  close() {
    if (!this.el) return;
    this._ro?.disconnect();
    this.el.remove();
    this.el = null;
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.onClose();
  }

  dispose() {
    this.close();
    this._offWp?.();
  }

  _fit() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.dpr = dpr;
    this.canvas.width = Math.max(2, Math.round(r.width * dpr));
    this.canvas.height = Math.max(2, Math.round(r.height * dpr));
    this.view.setSize(r.width, r.height);
  }

  _bind() {
    const el = this.el;
    const stage = el.querySelector('[data-map-stage]');
    el.querySelector('[data-map-close]').addEventListener('click', () => this.close());
    el.querySelector('[data-map-center]').addEventListener('click', () => {
      const p = this.player();
      if (p) this.view.centerOn(p.x, p.z);
      this.redraw();
    });
    el.querySelector('[data-map-clear]').addEventListener('click', () => this.waypoint.clear());
    for (const b of el.querySelectorAll('[data-map-tab]')) b.addEventListener('click', () => this.setTab(b.dataset.mapTab));
    this._syncTabs();
    for (const b of el.querySelectorAll('[data-map-zoom]')) {
      b.addEventListener('click', () => {
        this.view.zoomAt(b.dataset.mapZoom === 'in' ? 1.5 : 1 / 1.5);
        this.redraw();
      });
    }
    el.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === MAP_KEY) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      this.view.zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
      this.redraw();
    }, { passive: false });
    // Drag to pan; a press that barely moves is a click (the waypoint); two fingers pinch.
    const pts = new Map();
    let moved = 0;
    let pinch = 0;
    stage.addEventListener('pointerdown', (e) => {
      stage.setPointerCapture?.(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
      stage.classList.add('is-drag');
    });
    stage.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && d > 0) {
          const r = stage.getBoundingClientRect();
          this.view.zoomAt(d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
        }
        pinch = d;
      } else this.view.pan(dx, dy);
      this.redraw();
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      const single = pts.size === 1;
      pts.delete(e.pointerId);
      stage.classList.remove('is-drag');
      if (single && moved < 6 && e.type === 'pointerup' && this.tab === 'zone') {
        const r = stage.getBoundingClientRect();
        const [x, z] = this.view.toWorld(e.clientX - r.left, e.clientY - r.top);
        const { x0, x1, z0, z1 } = this.extent;
        if (x >= x0 && x <= x1 && z >= z0 && z <= z1) this.waypoint.click(x, z, 10 / this.view.scale);
      }
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    this._ro = new ResizeObserver(() => {
      this._fit();
      this.redraw();
    });
    this._ro.observe(stage);
  }

  /** Draw on the next frame (once, however many changes come in before it). */
  redraw() {
    if (!this.el || this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this.draw();
    });
  }

  /** 'zone' (this zone's map) or 'world' (every zone and the doors between them). */
  setTab(tab) {
    this.tab = this.world && tab === 'world' ? 'world' : 'zone';
    this._syncTabs();
    this.redraw();
  }

  _syncTabs() {
    if (!this.el) return;
    for (const b of this.el.querySelectorAll('[data-map-tab]')) b.setAttribute('aria-pressed', String(b.dataset.mapTab === this.tab));
    this.el.dataset.mapView = this.tab;
    for (const b of this.el.querySelectorAll('[data-map-zoom],[data-map-center],[data-map-clear]')) b.disabled = this.tab === 'world';
  }

  /** The World view: zones as named plaques, portals as roads between them; unvisited ones "?". */
  drawWorld(g, w, h) {
    const { nodes, links } = this.world();
    g.fillStyle = '#16130e';
    g.fillRect(0, 0, w, h);
    // Faint parchment grain.
    g.globalAlpha = 0.08;
    for (let i = 0; i < 60; i++) {
      g.fillStyle = i % 2 ? '#fff3d6' : '#000';
      g.fillRect((i * 97) % w, (i * 53) % h, 120, 1);
    }
    g.globalAlpha = 1;
    // Lay the zones out: their own `at` ([0..1, 0..1]) or along a gentle arc in order.
    const n = nodes.length;
    const pos = new Map();
    nodes.forEach((nd, i) => {
      const a = nd.at ?? [0.14 + (0.72 * i) / Math.max(1, n - 1), 0.5 + Math.sin((i / Math.max(1, n - 1)) * Math.PI) * -0.18];
      pos.set(nd.id, [a[0] * w, a[1] * h]);
    });
    g.lineCap = 'round';
    for (const l of links) {
      const [ax, ay] = pos.get(l.a) ?? [0, 0];
      const [bx, by] = pos.get(l.b) ?? [0, 0];
      g.setLineDash(l.soon ? [6, 8] : []);
      g.strokeStyle = l.soon ? 'rgba(255,240,210,0.35)' : 'rgba(255,215,122,0.75)';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
      g.setLineDash([]);
      if (l.name) {
        g.font = '500 12px system-ui, sans-serif';
        g.textAlign = 'center';
        g.fillStyle = 'rgba(255,240,210,0.8)';
        g.fillText(l.soon ? `${l.name} (coming soon)` : l.name, (ax + bx) / 2, (ay + by) / 2 - 8);
      }
    }
    for (const nd of nodes) {
      const [x, y] = pos.get(nd.id);
      const known = nd.visited || nd.current;
      const label = nd.stub ? nd.name : known ? nd.name : '?';
      g.font = `600 ${known ? 16 : 22}px Georgia, serif`;
      const tw = Math.max(90, g.measureText(label).width + 28);
      g.fillStyle = nd.current ? 'rgba(255,215,122,0.28)' : nd.stub ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';
      g.strokeStyle = nd.current ? '#ffd77a' : nd.stub ? 'rgba(255,255,255,0.3)' : 'rgba(255,230,180,0.55)';
      g.lineWidth = nd.current ? 3 : 1.5;
      g.beginPath();
      g.roundRect(x - tw / 2, y - 22, tw, 44, 12);
      g.fill();
      g.stroke();
      g.fillStyle = known || nd.stub ? '#fff3d6' : 'rgba(255,243,214,0.7)';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, x, y - (known && nd.hub ? 5 : 0));
      if (known && nd.hub) {
        g.font = '500 11px system-ui, sans-serif';
        g.fillStyle = nd.waystone ? '#9fe8a8' : 'rgba(255,243,214,0.6)';
        g.fillText(`${nd.waystone ? '◆ ' : ''}${nd.hub}`, x, y + 12);
      }
      if (nd.current) {
        g.font = '600 11px system-ui, sans-serif';
        g.fillStyle = '#ffd77a';
        g.fillText('You are here', x, y + 34);
      }
    }
    g.textBaseline = 'alphabetic';
    g.font = '500 12px system-ui, sans-serif';
    g.fillStyle = 'rgba(255,243,214,0.65)';
    g.textAlign = 'left';
    g.fillText('◆ a waystone you have reached · ? a place not yet visited', 12, h - 12);
  }

  draw() {
    if (!this.el) return;
    const g = this.canvas.getContext('2d');
    const dpr = this.dpr ?? 1;
    const v = this.view;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.tab === 'world' && this.world) {
      this.drawWorld(g, v.w, v.h);
      return;
    }
    g.fillStyle = '#11100d';
    g.fillRect(0, 0, v.w, v.h);
    const [ox, oy] = v.toScreen(this.extent.x0, this.extent.z0);
    g.imageSmoothingEnabled = v.scale < 3;
    g.drawImage(this.base, ox, oy, v.W * v.scale, v.H * v.scale);
    // Area names.
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `600 ${clamp(11 + v.zoom * 1.5, 12, 20)}px system-ui, sans-serif`;
    for (const a of this.areas) {
      const [x, y] = v.toScreen(a.x, a.z);
      g.lineWidth = 3.5;
      g.strokeStyle = 'rgba(0,0,0,0.7)';
      g.strokeText(a.name, x, y);
      g.fillStyle = '#fff3d6';
      g.fillText(a.name, x, y);
    }
    // Places, people, creatures.
    const r = clamp(4 + v.zoom * 0.6, 4, 9);
    for (const m of this.markers()) {
      const [x, y] = v.toScreen(m.x, m.z);
      if (x < -20 || y < -20 || x > v.w + 20 || y > v.h + 20) continue;
      drawMarker(g, m.shape ?? 'dot', x, y, r * (m.r ?? 1), m.color ?? '#ffffff');
      if (m.label && v.zoom >= 2) {
        g.font = '500 12px system-ui, sans-serif';
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(0,0,0,0.7)';
        g.strokeText(m.label, x, y + r * 2.4);
        g.fillStyle = '#ffffff';
        g.fillText(m.label, x, y + r * 2.4);
      }
    }
    // The waypoint.
    const wp = this.waypoint.point;
    if (wp) {
      const [x, y] = v.toScreen(wp.x, wp.z);
      drawMarker(g, 'pin', x, y, 9, '#ff5ad9');
    }
    // You.
    const p = this.player();
    if (p) {
      const [x, y] = v.toScreen(p.x, p.z);
      arrow(g, x, y, p.yaw, 11, '#ffffff');
    }
    // North.
    g.font = '700 14px system-ui, sans-serif';
    g.fillStyle = '#fff3d6';
    g.fillText('N ↑', v.w - 26, 18);
  }
}

/** The player's arrow at (x, y), facing `yaw` (0 = down the page, +z). */
function arrow(g, x, y, yaw, s, color) {
  const fx = Math.sin(yaw);
  const fy = Math.cos(yaw);
  g.save();
  g.translate(x, y);
  g.rotate(Math.atan2(fy, fx) + Math.PI / 2);
  g.beginPath();
  g.moveTo(0, -s);
  g.lineTo(s * 0.7, s * 0.75);
  g.lineTo(0, s * 0.35);
  g.lineTo(-s * 0.7, s * 0.75);
  g.closePath();
  g.fillStyle = color;
  g.strokeStyle = 'rgba(0,0,0,0.85)';
  g.lineWidth = 2;
  g.fill();
  g.stroke();
  g.restore();
}

/** A small map button on a minimap (opens the full map on click or tap). */
export function mapButton(minimapEl, onClick) {
  styles();
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'wm-btn';
  b.dataset.mapButton = '';
  b.title = `Full map (${MAP_KEY_LABEL})`;
  b.setAttribute('aria-label', `Full map (${MAP_KEY_LABEL})`);
  b.textContent = '🗺';
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  if (getComputedStyle(minimapEl).position === 'static') minimapEl.style.position = 'relative';
  minimapEl.append(b);
  return b;
}

/**
 * The on-screen cue toward the waypoint: an arrow turned the way to go
 * (relative to where the camera faces) and the distance. `update` each frame.
 */
export class WaypointCue {
  constructor(host) {
    styles();
    this.el = document.createElement('div');
    this.el.className = 'wm-cue';
    this.el.dataset.waypointCue = '';
    this.el.hidden = true;
    this.el.innerHTML = '<i></i><span></span>';
    host.append(this.el);
  }

  /** `heading`: where the camera looks (radians, 0 = +z). */
  update(waypoint, x, z, heading) {
    const w = waypoint.from(x, z);
    if (!w || w.dist < 4) {
      if (w && w.dist < 4) waypoint.clear();
      this.el.hidden = true;
      return;
    }
    this.el.hidden = false;
    // Screen-up is the camera's heading; positive turns right.
    const rel = Math.atan2(Math.sin(heading - w.bearing), Math.cos(heading - w.bearing));
    this.el.firstChild.style.transform = `rotate(${rel}rad)`;
    this.el.lastChild.textContent = `${Math.round(w.dist)} m`;
  }

  dispose() {
    this.el.remove();
  }
}
