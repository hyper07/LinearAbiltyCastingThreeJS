import { RANKS, BUILDINGS, GUARDIANS, COLORS, FORGE_REACH, LOOKS } from './rules.js';
import { SIZE, RIDGES, ROCKS, STRUCTURES, GUARDS, BASE, BARRACKS, ARMORY, FORGE, PAD, foeDef } from './map.js';
import { pickAt, boxedIn, drawOverlay } from './overlay.js';
import { loadTextures, paintLand, drawWorld, remains, LIFT } from './flatReal.js';

/**
 * Grave Purge in 2D: the same game drawn flat on a plain canvas. At first
 * (and wherever WebGL is missing) as simple shapes over a painted land;
 * once the sprites are baked (sprites.js — a second or two, in the
 * background), the realistic way (flatReal.js): photo-textured ground,
 * cliffs, blight, and pre-rendered sprites. Same interface as the 3D view,
 * so the game screen can use either.
 */

const PX = 8; // pixels a metre in the painted land
const TINT = { husk: '#d9d4c4', ravager: '#c9b8a8', hexer: '#b9a6d9', brute: '#b8b0a0', wight: '#8a9aa8', bonecaller: '#9a70c0' };

class Point {
  constructor(x = 0, y = 0, z = 0) {
    this.set(x, y, z);
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class FlatView {
  constructor(host) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'bs__canvas';
    host.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.target = new Point(PAD.x, 0, PAD.z + 6);
    this.zoom = 27;
    this.time = 0;
    this.width = 1;
    this.height = 1;
    this.selected = new Set();
    this.popups = [];
    this.fx = [];
    this.dying = [];
    this.siteHp = new Map();
    this.falling = new Map();
    this.look = new Map(); // entity id → { a (shown facing), swing, aa }
    this.land = this._paint();
    this.sprites = null;
    this.progress = 0;
    this.ready = this._bake();
  }

  /** Textures and sprites, then the land repainted with them. */
  async _bake() {
    try {
      const [{ bakeSprites }, tex] = await Promise.all([import('./sprites.js'), loadTextures()]);
      const sprites = await bakeSprites((p) => (this.progress = p));
      if (!sprites || !tex.t1 || this.gone) return false;
      this.land = paintLand(tex, sprites);
      this.sprites = sprites;
      this.progress = 1;
      return true;
    } catch (e) {
      console.warn('2D sprites', e);
      return false;
    }
  }

  /* ------------------------------------------------------------- the land */

  _paint() {
    const n = SIZE * PX;
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    const r = rng(42);
    // Ground: the bands' colours, speckled.
    const img = g.createImageData(n, n);
    const band = [[181, 165, 147], [162, 146, 134], [143, 127, 134], [122, 101, 118]];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const wx = x / PX;
        const wz = y / PX;
        const d = Math.hypot(wx, wz);
        const t = Math.min(3, Math.max(0, d < 100 ? Math.max(0, (d - 90) / 20) : d < 165 ? 1 + Math.max(0, (d - 155) / 20) : d < 225 ? 2 + Math.max(0, (d - 215) / 20) : 3));
        const a = band[Math.floor(t)];
        const b = band[Math.min(3, Math.floor(t) + 1)];
        const f = t - Math.floor(t);
        const grain = (r() - 0.5) * 22 + Math.sin(wx * 0.31) * Math.cos(wz * 0.27) * 6;
        const i = (y * n + x) * 4;
        img.data[i] = a[0] + (b[0] - a[0]) * f + grain;
        img.data[i + 1] = a[1] + (b[1] - a[1]) * f + grain;
        img.data[i + 2] = a[2] + (b[2] - a[2]) * f + grain;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    g.scale(PX, PX);
    // Darker patches of turned earth.
    for (let k = 0; k < 160; k++) {
      g.fillStyle = `rgba(60,40,40,${0.05 + r() * 0.08})`;
      g.beginPath();
      g.ellipse(r() * SIZE, r() * SIZE, 2 + r() * 8, 2 + r() * 6, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    // The camp: a plated yard with a low wall.
    g.fillStyle = '#8d9198';
    g.fillRect(BASE.x0, BASE.z0, BASE.x1 - BASE.x0, BASE.z1 - BASE.z0);
    g.strokeStyle = 'rgba(40,44,52,0.35)';
    g.lineWidth = 0.08;
    for (let x = BASE.x0; x <= BASE.x1; x += 2.5) {
      g.beginPath();
      g.moveTo(x, BASE.z0);
      g.lineTo(x, BASE.z1);
      g.stroke();
    }
    for (let z = BASE.z0; z <= BASE.z1; z += 2.5) {
      g.beginPath();
      g.moveTo(BASE.x0, z);
      g.lineTo(BASE.x1, z);
      g.stroke();
    }
    g.fillStyle = '#a8a39a';
    for (const [x, z, w, d] of [[BASE.x1, 0, 1, 14], [BASE.x1, 26, 1, 12.5], [0, BASE.z1, 18, 1], [30, BASE.z1, 18.5, 1]]) g.fillRect(x, z, w, d);
    const block = (x, z, w, d, top, side) => {
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(x - w / 2 + 0.6, z - d / 2 + 0.8, w, d);
      g.fillStyle = side;
      g.fillRect(x - w / 2, z - d / 2, w, d);
      g.fillStyle = top;
      g.fillRect(x - w / 2 + 0.4, z - d / 2 + 0.4, w - 0.8, d - 1.4);
    };
    block(BARRACKS.x, BARRACKS.z, 8, 6, '#e8ecef', '#9aa4ad');
    g.fillStyle = '#ff8a2a';
    g.fillRect(BARRACKS.x - 3, BARRACKS.z + 1.2, 6, 1.2);
    block(ARMORY.x, ARMORY.z, 6, 5, '#e8ecef', '#9aa4ad');
    g.fillStyle = '#4f8cff';
    g.fillRect(ARMORY.x - 2, ARMORY.z - 1.6, 4, 0.8);
    // The pad, the Forge.
    g.fillStyle = '#6a6e74';
    g.beginPath();
    for (let k = 0; k < 8; k++) g.lineTo(PAD.x + Math.cos((k / 8) * Math.PI * 2 + 0.39) * 5, PAD.z + Math.sin((k / 8) * Math.PI * 2 + 0.39) * 5);
    g.fill();
    g.strokeStyle = '#ff9a3a';
    g.lineWidth = 0.4;
    g.stroke();
    g.fillStyle = '#5a626e';
    g.beginPath();
    g.arc(FORGE.x, FORGE.z, 2.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e04030';
    for (let k = 0; k < 4; k++) g.fillRect(FORGE.x + Math.cos((k * Math.PI) / 2 + 0.8) * 2 - 0.4, FORGE.z + Math.sin((k * Math.PI) / 2 + 0.8) * 2 - 0.4, 0.8, 0.8);
    // Ridges and boulders: lumps of rock, lit from the north-west.
    const lump = (x, z, rad) => {
      const pts = [];
      const sides = 7;
      for (let k = 0; k < sides; k++) {
        const a = (k / sides) * Math.PI * 2 + r();
        pts.push([x + Math.cos(a) * rad * (0.75 + r() * 0.35), z + Math.sin(a) * rad * (0.75 + r() * 0.35)]);
      }
      g.fillStyle = 'rgba(20,12,16,0.35)';
      g.beginPath();
      pts.forEach(([px, pz], k) => (k ? g.lineTo(px + 1.2, pz + 1.6) : g.moveTo(px + 1.2, pz + 1.6)));
      g.fill();
      const grad = g.createLinearGradient(x - rad, z - rad, x + rad, z + rad);
      const tone = 90 + r() * 30;
      grad.addColorStop(0, `rgb(${tone + 40},${tone + 30},${tone + 24})`);
      grad.addColorStop(1, `rgb(${tone - 30},${tone - 38},${tone - 40})`);
      g.fillStyle = grad;
      g.beginPath();
      pts.forEach(([px, pz], k) => (k ? g.lineTo(px, pz) : g.moveTo(px, pz)));
      g.fill();
    };
    for (const { pts, w } of RIDGES) for (const [x, z] of pts) {
      lump(x + (r() - 0.5) * 1.5, z + (r() - 0.5) * 1.5, w / 2 + r() * 1.2);
      if (r() < 0.6) lump(x + (r() - 0.5) * 3, z + (r() - 0.5) * 3, w / 3);
    }
    for (const [x, z, rad] of ROCKS) lump(x, z, rad);
    // Graves, bones and dead trees.
    for (let k = 0; k < 300; k++) {
      const x = 52 + r() * (SIZE - 56);
      const z = 4 + r() * (SIZE - 8);
      if (x < BASE.x1 + 8 && z < BASE.z1 + 8) continue;
      const kind = r();
      if (kind < 0.3) {
        // A dead tree: a few crooked branches from a trunk.
        g.strokeStyle = 'rgba(30,20,20,0.3)';
        g.lineWidth = 0.5;
        g.lineCap = 'round';
        const branches = () => {
          for (let b = 0; b < 5; b++) {
            const a = r() * Math.PI * 2;
            const l = 1 + r() * 2;
            g.beginPath();
            g.moveTo(x, z);
            g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.6, z + Math.sin(a + 0.5) * l * 0.6, x + Math.cos(a) * l, z + Math.sin(a) * l);
            g.stroke();
          }
        };
        g.save();
        g.translate(1, 1.4);
        branches();
        g.restore();
        g.strokeStyle = '#6a5040';
        g.lineWidth = 0.35;
        branches();
        g.fillStyle = '#5a4030';
        g.beginPath();
        g.arc(x, z, 0.45, 0, Math.PI * 2);
        g.fill();
      } else if (kind < 0.7) {
        // A gravestone.
        g.fillStyle = 'rgba(20,12,16,0.3)';
        g.fillRect(x + 0.3, z + 0.3, 1, 0.5);
        g.fillStyle = '#9a9690';
        g.beginPath();
        g.roundRect(x - 0.5, z - 0.25, 1, 0.5, 0.2);
        g.fill();
        g.fillStyle = '#6a3a30';
        g.fillRect(x - 0.4, z + 0.3, 0.8, 1.4);
      } else {
        // Bones.
        g.strokeStyle = '#e8e2d0';
        g.lineWidth = 0.18;
        for (let b = 0; b < 3; b++) {
          const a = r() * Math.PI;
          g.beginPath();
          g.moveTo(x + Math.cos(a) * 0.5 + b * 0.3, z + Math.sin(a) * 0.5);
          g.lineTo(x - Math.cos(a) * 0.5 + b * 0.3, z - Math.sin(a) * 0.5);
          g.stroke();
        }
      }
    }
    return c;
  }

  /* -------------------------------------------------------------- camera */

  get scale() {
    return this.height / (this.zoom * 1.05);
  }

  resize(w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.width = w;
    this.height = h;
  }

  pan(dx, dz) {
    this.target.x = Math.max(0, Math.min(SIZE, this.target.x + dx));
    this.target.z = Math.max(0, Math.min(SIZE, this.target.z + dz));
  }

  zoomBy(f) {
    this.zoom = Math.max(14, Math.min(90, this.zoom * f));
  }

  groundAt(px, py) {
    const k = this.scale;
    return { x: this.target.x + (px - this.width / 2) / k, z: this.target.z + (py - this.height / 2) / k };
  }

  /** A world point on screen; height lifts it up the screen a little (bars over heads). */
  toScreen(x, y, z) {
    const k = this.scale;
    return { x: (x - this.target.x) * k + this.width / 2, y: (z - this.target.z) * k + this.height / 2 - y * k * (this.sprites ? LIFT : 0.45), front: true };
  }

  pick(state, px, py, kind = 'foe', mySlot = -1) {
    return pickAt(this, state, px, py, kind, mySlot);
  }

  boxed(state, x0, y0, x1, y1, mySlot) {
    return boxedIn(this, state, x0, y0, x1, y1, mySlot);
  }

  overlay(ctx, state) {
    drawOverlay(this, ctx, state);
  }

  /* -------------------------------------------------------------- effects */

  _ring(x, z, r, color, life, rise = false) {
    this.fx.push({ kind: 'ring', x, z, r, color, life, t: 0, rise });
  }

  _line(a, b, color, life, width) {
    this.fx.push({ kind: 'line', ax: a.x, az: a.z, bx: b.x, bz: b.z, color, life, t: 0, width });
  }

  _site(id) {
    return STRUCTURES.find((s) => s.id === id) ?? null;
  }

  absorb(events, state) {
    const at = new Map(state.ents.map((e) => [e.i, e]));
    for (const e of events) {
      if (e.t === 'shot') {
        const a = at.get(e.id);
        const b = at.get(e.to) ?? this._site(e.to);
        if (a && b) this._line(a, b, e.big ? '#9ff0ff' : '#ffe9b0', 0.08, e.big ? 2 : 1.2);
      } else if (e.t === 'bolt') {
        const a = at.get(e.id) ?? this._site(e.id);
        const b = at.get(e.to);
        if (a && b) this._line(a, b, '#c070ff', 0.22, 2.5);
      } else if (e.t === 'blast') this.fx.push({ kind: 'blast', x: e.x, z: e.z, r: e.r, color: '#80e0ff', life: 0.4, t: 0 });
      else if (e.t === 'slam') this._ring(e.x, e.z, e.r, '#ff7040', 0.6);
      else if (e.t === 'summon') this._ring(e.x, e.z, 4, '#b060ff', 0.8);
      else if (e.t === 'forge') {
        this._ring(e.x, e.z, 4, '#40c0ff', 1);
        this.fx.push({ kind: 'blast', x: e.x, z: e.z, r: 2.5, color: '#80e0ff', life: 0.6, t: 0 });
      } else if (e.t === 'fall') {
        this.fx.push({ kind: 'blast', x: e.x, z: e.z, r: (BUILDINGS[e.type]?.r ?? 2) * 1.8, color: '#c0a080', life: 0.7, t: 0 });
        this.falling.set(e.id, 0);
        if (this.sprites) setTimeout(() => this.sprites && remains(this.land, this.sprites, e.x, e.z, 'building'), 900);
      } else if (e.t === 'kill') {
        const dead = this.last?.get(e.id);
        if (dead) {
          this.dying.push({ e: dead, t: 0 });
          if (this.sprites) setTimeout(() => this.sprites && remains(this.land, this.sprites, dead.x, dead.z, dead.k === 'troop' ? 'troop' : 'bones'), 1100);
        }
      } else if (e.t === 'ore' && e.o === this.mySlot) this.popups.push({ x: e.x, z: e.z, text: `+${e.n}`, t: 0 });
    }
  }

  /* -------------------------------------------------------------- frames */

  render(state, dt, { follow = null } = {}) {
    this.time += dt;
    if (follow) {
      const k = Math.min(1, dt * 5);
      this.target.x += (follow.x - this.target.x) * k;
      this.target.z += (follow.z - this.target.z) * k;
    }
    this.last = new Map(state.ents.map((e) => [e.i, e]));
    this.siteHp = new Map(state.hurt.map(([i, hp, max]) => [i, { hp, max }]));
    const g = this.ctx;
    const k = this.scale;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = '#1c1820';
    g.fillRect(0, 0, this.width, this.height);
    // The land, then everything in world metres.
    g.save();
    g.translate(this.width / 2, this.height / 2);
    g.scale(k, k);
    g.translate(-this.target.x, -this.target.z);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(this.land, 0, 0, SIZE, SIZE);
    const view = { x0: this.target.x - this.width / 2 / k - 8, x1: this.target.x + this.width / 2 / k + 8, z0: this.target.z - this.height / 2 / k - 8, z1: this.target.z + this.height / 2 / k + 8 };
    const seen = (x, z, pad = 0) => x > view.x0 - pad && x < view.x1 + pad && z > view.z0 - pad && z < view.z1 + pad;
    this._camp(g);
    if (this.sprites) {
      for (const d of this.dying) d.t += dt;
      this.dying = this.dying.filter((d) => d.t < 1.2);
      for (const [id, f] of this.falling) this.falling.set(id, f + dt);
      drawWorld(this, g, state, dt, seen);
      this._effects(g, dt);
      g.restore();
      this._grade(g);
      this.popups = this.popups.filter((p) => (p.t += dt) < 1.4);
      return;
    }
    const down = new Set(state.down);
    for (const s of STRUCTURES) {
      if (!seen(s.x, s.z, 12)) continue;
      if (down.has(s.id)) {
        const f = this.falling.get(s.id);
        if (f == null || f > 1.2) continue;
        this.falling.set(s.id, f + dt);
        g.globalAlpha = 1 - f / 1.2;
        this._building(g, s, state);
        g.globalAlpha = 1;
        continue;
      }
      this._building(g, s, state);
    }
    // Sleeping guards where they stand; the awake dead; soldiers on top.
    const awake = new Set(state.ents.map((e) => e.i));
    for (const gd of GUARDS) {
      if (down.has(gd.id) || awake.has(gd.id) || !seen(gd.x, gd.z)) continue;
      this._foe(g, { i: gd.id, kind: gd.kind, x: gd.x, z: gd.z, a: (gd.id * 2.3) % 6.28, tier: gd.tier, act: 'sleep' }, dt);
    }
    for (const d of this.dying) {
      d.t += dt;
      g.globalAlpha = Math.max(0, 1 - d.t / 1.2);
      if (d.e.k === 'troop') this._troop(g, d.e, dt, true);
      else if (d.e.k === 'foe') this._foe(g, d.e, dt, true);
      g.globalAlpha = 1;
    }
    this.dying = this.dying.filter((d) => d.t < 1.2);
    for (const e of state.ents) if (e.k === 'foe' && seen(e.x, e.z)) this._foe(g, e, dt);
    for (const e of state.ents) if (e.k === 'gun' && seen(e.x, e.z)) this._gun(g, e);
    for (const e of state.ents) if (e.k === 'troop' && seen(e.x, e.z)) this._troop(g, e, dt);
    this._effects(g, dt);
    g.restore();
    this._grade(g);
    this.popups = this.popups.filter((p) => (p.t += dt) < 1.4);
  }

  /** A dusk vignette over everything. */
  _grade(g) {
    const v = g.createRadialGradient(this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.35, this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.75);
    v.addColorStop(0, 'rgba(20,10,30,0)');
    v.addColorStop(1, 'rgba(20,10,30,0.45)');
    g.fillStyle = v;
    g.fillRect(0, 0, this.width, this.height);
  }

  _camp(g) {
    // The Forge's turning ring and the pad's glow.
    g.save();
    g.translate(FORGE.x, FORGE.z);
    g.rotate(this.time * 0.4);
    g.strokeStyle = 'rgba(64,192,255,0.6)';
    g.lineWidth = 0.35;
    g.setLineDash([2, 1]);
    g.beginPath();
    g.arc(0, 0, FORGE_REACH, 0, Math.PI * 2);
    g.stroke();
    g.restore();
    g.setLineDash([]);
    const glow = g.createRadialGradient(FORGE.x, FORGE.z, 0, FORGE.x, FORGE.z, 4);
    glow.addColorStop(0, 'rgba(80,200,255,0.55)');
    glow.addColorStop(1, 'rgba(80,200,255,0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(FORGE.x, FORGE.z, 4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = `rgba(61,220,132,${0.4 + Math.sin(this.time * 2) * 0.15})`;
    g.lineWidth = 0.3;
    g.beginPath();
    g.arc(PAD.x, PAD.z, 4.8, 0, Math.PI * 2);
    g.stroke();
  }

  _shadow(g, x, z, r) {
    g.fillStyle = 'rgba(15,8,14,0.35)';
    g.beginPath();
    g.ellipse(x + r * 0.35, z + r * 0.45, r, r * 0.8, 0, 0, Math.PI * 2);
    g.fill();
  }

  _glow(g, x, z, r, color, alpha = 0.5) {
    const grad = g.createRadialGradient(x, z, 0, x, z, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha *= alpha;
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, z, r, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha /= alpha;
  }

  _building(g, s, state) {
    const def = BUILDINGS[s.type];
    const { x, z } = s;
    const r = def.r;
    const pulse = Math.sin(this.time * 2.4 + s.id) * 0.5 + 0.5;
    this._shadow(g, x, z, r * 1.05);
    if (s.type === 'spire') {
      g.fillStyle = '#4a3a40';
      g.beginPath();
      g.arc(x, z, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#d8cfc0';
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + 0.3;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * r * 0.5, z + Math.sin(a) * r * 0.5);
        g.lineTo(x + Math.cos(a + 0.25) * r * 1.25, z + Math.sin(a + 0.25) * r * 1.25);
        g.lineTo(x + Math.cos(a + 0.4) * r * 0.55, z + Math.sin(a + 0.4) * r * 0.55);
        g.fill();
      }
      this._glow(g, x, z, 1.6, '#c080ff', 0.5 + pulse * 0.4);
      g.fillStyle = '#e8d0ff';
      g.beginPath();
      g.arc(x, z, 0.4, 0, Math.PI * 2);
      g.fill();
    } else if (s.type === 'barrow') {
      g.fillStyle = '#6a5a50';
      g.beginPath();
      g.ellipse(x, z, r * 1.1, r * 0.75, 0.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#857468';
      g.beginPath();
      g.ellipse(x - 0.3, z - 0.3, r * 0.8, r * 0.5, 0.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#a8a29a';
      g.fillRect(x - 0.3, z - r * 0.9, 0.6, 1.2);
    } else if (s.type === 'crypt' || s.type === 'ossuary' || s.type === 'heart') {
      const w = r * 1.7;
      const d = r * 1.3;
      g.fillStyle = s.type === 'crypt' ? '#7a7a82' : '#4a4048';
      g.fillRect(x - w / 2, z - d / 2, w, d);
      // A pitched roof: two slopes.
      g.fillStyle = s.type === 'crypt' ? '#c45a3a' : '#7a2030';
      g.fillRect(x - w / 2 + 0.3, z - d / 2 + 0.3, w - 0.6, d / 2 - 0.3);
      g.fillStyle = s.type === 'crypt' ? '#9a4028' : '#5a1828';
      g.fillRect(x - w / 2 + 0.3, z, w - 0.6, d / 2 - 0.3);
      g.strokeStyle = 'rgba(0,0,0,0.3)';
      g.lineWidth = 0.12;
      for (let k = 1; k < 5; k++) {
        g.beginPath();
        g.moveTo(x - w / 2 + (w * k) / 5, z - d / 2 + 0.3);
        g.lineTo(x - w / 2 + (w * k) / 5, z + d / 2 - 0.3);
        g.stroke();
      }
      if (s.type !== 'crypt') this._glow(g, x, z, r * 1.6, s.type === 'heart' ? '#ff2040' : '#ff3040', 0.25 + pulse * 0.2);
      if (s.type === 'heart') {
        // The crystal above it, and the seal while the wards stand.
        g.fillStyle = `rgb(255,${60 + pulse * 60},${80 + pulse * 40})`;
        g.beginPath();
        g.moveTo(x, z - 3.6);
        g.lineTo(x + 1.6, z - 0.4);
        g.lineTo(x, z + 1.2);
        g.lineTo(x - 1.6, z - 0.4);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.4)';
        g.beginPath();
        g.moveTo(x, z - 3.6);
        g.lineTo(x - 1.6, z - 0.4);
        g.lineTo(x, z - 0.8);
        g.fill();
        if (state.keysLeft > 0) {
          g.fillStyle = 'rgba(144,64,255,0.18)';
          g.strokeStyle = `rgba(190,120,255,${0.5 + pulse * 0.3})`;
          g.lineWidth = 0.3;
          g.beginPath();
          g.arc(x, z, 9, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        }
      }
    } else if (s.type === 'cache') {
      g.fillStyle = '#7a4a28';
      g.fillRect(x - 0.9, z - 0.6, 1.8, 1.2);
      g.fillStyle = '#e0b040';
      g.fillRect(x - 0.9, z - 0.12, 1.8, 0.24);
      g.fillRect(x - 0.12, z - 0.6, 0.24, 1.2);
      this._glow(g, x, z, 2.2, '#ffd060', 0.3 + pulse * 0.3);
    } else if (s.type === 'node' || s.type === 'shrine') {
      const shrine = s.type === 'shrine';
      const color = shrine ? '#ffb030' : '#40e0ff';
      // A stepped stone base, candles, and the floating soul.
      g.fillStyle = '#5a5458';
      g.beginPath();
      for (let k = 0; k < 8; k++) g.lineTo(x + Math.cos((k / 8) * Math.PI * 2 + 0.39) * r * 1.1, z + Math.sin((k / 8) * Math.PI * 2 + 0.39) * r * 1.1);
      g.fill();
      g.fillStyle = '#7a7478';
      g.beginPath();
      for (let k = 0; k < 8; k++) g.lineTo(x + Math.cos((k / 8) * Math.PI * 2 + 0.39) * r * 0.75, z + Math.sin((k / 8) * Math.PI * 2 + 0.39) * r * 0.75);
      g.fill();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        g.fillStyle = '#f0e8d0';
        g.fillRect(x + Math.cos(a) * r * 0.95 - 0.12, z + Math.sin(a) * r * 0.95 - 0.12, 0.24, 0.24);
        this._glow(g, x + Math.cos(a) * r * 0.95, z + Math.sin(a) * r * 0.95, 0.6, '#ffc060', 0.6 + pulse * 0.4);
      }
      this._glow(g, x, z, r * 2, color, 0.35 + pulse * 0.25);
      const bob = Math.sin(this.time * 2 + s.id) * 0.25;
      g.save();
      g.translate(x, z - 0.6 + bob);
      g.rotate(this.time * 0.8);
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, -1);
      g.lineTo(0.8, 0);
      g.lineTo(0, 1);
      g.lineTo(-0.8, 0);
      g.fill();
      g.restore();
    }
  }

  _gun(g, e) {
    this._shadow(g, e.x, e.z, 1.2);
    g.fillStyle = '#5a626e';
    g.beginPath();
    g.arc(e.x, e.z, 1.1, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.translate(e.x, e.z);
    g.rotate(-e.a);
    g.fillStyle = '#f5c518';
    g.fillRect(-0.45, -0.5, 0.9, 1);
    g.fillStyle = '#30343a';
    g.fillRect(-0.3, 0.3, 0.16, 1.3);
    g.fillRect(0.14, 0.3, 0.16, 1.3);
    g.restore();
  }

  /** Smoothly turned facing and a swing when it strikes or shoots. */
  _pose(e, dt) {
    let p = this.look.get(e.i);
    if (!p) this.look.set(e.i, (p = { a: e.a, swing: 0, aa: e.aa }));
    const d = Math.atan2(Math.sin(e.a - p.a), Math.cos(e.a - p.a));
    p.a += d * Math.min(1, dt * 12);
    if (e.aa !== p.aa) {
      p.aa = e.aa;
      p.swing = 1;
    }
    p.swing = Math.max(0, p.swing - dt * 5);
    return p;
  }

  _troop(g, e, dt, dead = false) {
    const def = RANKS[e.rank];
    if (LOOKS[e.rank].ship) {
      // A flying thing, simply: a dart shape up in the air.
      const p = this._pose(e, dt);
      const size = LOOKS[e.rank].ship === 'big' ? 3.2 : 0.8;
      this._shadow(g, e.x + 1, e.z + 1, size * 0.7);
      g.save();
      g.translate(e.x, e.z - size);
      g.rotate(-p.a);
      g.fillStyle = LOOKS[e.rank].paint;
      g.beginPath();
      g.moveTo(0, size);
      g.lineTo(size * 0.8, -size * 0.7);
      g.lineTo(0, -size * 0.3);
      g.lineTo(-size * 0.8, -size * 0.7);
      g.closePath();
      g.fill();
      g.restore();
      return;
    }
    const p = this._pose(e, dt);
    const r = 0.5 * def.scale;
    const color = COLORS[e.o] ?? '#888';
    const step = e.act === 'run' ? Math.sin(this.time * 14 + e.i) : 0;
    this._shadow(g, e.x, e.z, r * 1.1);
    if (this.selected.has(e.i)) {
      g.strokeStyle = '#ffffff';
      g.lineWidth = 0.12;
      g.beginPath();
      g.arc(e.x, e.z, r * 1.7, 0, Math.PI * 2);
      g.stroke();
    }
    if (def.tier >= 3) this._glow(g, e.x, e.z, r * 3.2, e.rank === 'paragon' ? '#ffd060' : '#a080ff', 0.45);
    g.save();
    g.translate(e.x, e.z);
    g.rotate(-p.a);
    if (dead) g.scale(1.1, 0.5);
    // Boots, the body, the gun ahead (a kick when it fires), the helmet.
    g.fillStyle = '#2a2a30';
    g.beginPath();
    g.arc(-r * 0.45, step * r * 0.5, r * 0.3, 0, Math.PI * 2);
    g.arc(r * 0.45, -step * r * 0.5, r * 0.3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = LOOKS[e.rank].paint;
    g.beginPath();
    g.ellipse(0, 0, r * 1.05, r * 0.8, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1e2126';
    g.fillRect(r * 0.25, r * 0.2 - p.swing * 0.15, r * 0.24, r * (1.4 + def.tier * 0.25));
    if (p.swing > 0.6) {
      g.fillStyle = '#fff2b0';
      g.beginPath();
      g.arc(r * 0.37, r * (1.7 + def.tier * 0.25), r * 0.3, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = def.tier >= 1 ? '#3a4048' : '#5a6048';
    g.beginPath();
    g.arc(0, -r * 0.05, r * 0.55, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = color;
    g.fillRect(-r * 0.12, -r * 0.5, r * 0.24, r * 0.5);
    g.restore();
    // Rank chevrons.
    if (def.tier >= 1 && !dead) {
      g.strokeStyle = def.tier >= 3 ? '#ffd060' : '#ffffff';
      g.lineWidth = 0.1;
      for (let k = 0; k < def.tier; k++) {
        const y = e.z - r * 1.6 - k * 0.25;
        g.beginPath();
        g.moveTo(e.x - 0.3, y + 0.15);
        g.lineTo(e.x, y);
        g.lineTo(e.x + 0.3, y + 0.15);
        g.stroke();
      }
    }
  }

  _foe(g, e, dt, dead = false) {
    const def = foeDef(e.kind);
    const guardian = GUARDIANS[e.kind];
    const p = this._pose(e, dt);
    const r = (def.size / 1.8) * 0.55 * (guardian ? 1 : 1 + ((e.tier ?? 1) - 1) * 0.06);
    const tint = guardian?.tint ?? TINT[e.kind] ?? '#ccc';
    const sleep = e.act === 'sleep';
    const step = e.act === 'run' ? Math.sin(this.time * 12 + e.i) : 0;
    this._shadow(g, e.x, e.z, r);
    if (guardian) this._glow(g, e.x, e.z, r * 2.6, guardian.tint, 0.4 + Math.sin(this.time * 3) * 0.1);
    else if ((e.tier ?? 1) >= 3) this._glow(g, e.x, e.z, r * 2, (e.tier ?? 1) >= 4 ? '#ff3050' : '#8040ff', 0.25);
    g.save();
    g.translate(e.x, e.z);
    g.rotate(-p.a);
    if (dead) g.scale(1.2, 0.4);
    if (sleep) g.globalAlpha *= 0.85;
    // Bony arms (one swinging when it strikes), a ribcage, a skull.
    g.strokeStyle = '#e8e2d0';
    g.lineWidth = r * 0.22;
    g.lineCap = 'round';
    const reach = def.ranged ? 0.6 : 1;
    g.beginPath();
    g.moveTo(-r * 0.7, 0);
    g.lineTo(-r * 0.9, r * (0.6 + step * 0.3));
    g.moveTo(r * 0.7, 0);
    g.lineTo(r * (0.8 - p.swing * 0.3), r * (0.6 + p.swing * reach + -step * 0.3));
    g.stroke();
    g.fillStyle = tint;
    g.beginPath();
    g.ellipse(0, 0, r * 0.85, r * 0.6, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(40,30,30,0.5)';
    g.lineWidth = r * 0.08;
    for (let k = -1; k <= 1; k++) {
      g.beginPath();
      g.moveTo(-r * 0.6, k * r * 0.22);
      g.lineTo(r * 0.6, k * r * 0.22);
      g.stroke();
    }
    g.fillStyle = '#f0ebdc';
    g.beginPath();
    g.arc(0, r * 0.15, r * 0.48, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = guardian || (e.tier ?? 1) >= 3 ? '#ff4040' : '#201818';
    g.beginPath();
    g.arc(-r * 0.17, r * 0.35, r * 0.11, 0, Math.PI * 2);
    g.arc(r * 0.17, r * 0.35, r * 0.11, 0, Math.PI * 2);
    g.fill();
    if (def.ranged) {
      g.fillStyle = '#7a3ac0';
      g.beginPath();
      g.arc(0, r * 0.05, r * 0.42, Math.PI, Math.PI * 2);
      g.fill();
    }
    if (guardian) {
      // A crown of spikes.
      g.fillStyle = '#f0d080';
      for (let k = 0; k < 5; k++) {
        const a = Math.PI + (k / 4) * Math.PI;
        g.beginPath();
        g.moveTo(Math.cos(a) * r * 0.42, r * 0.15 + Math.sin(a) * r * 0.42);
        g.lineTo(Math.cos(a) * r * 0.75, r * 0.15 + Math.sin(a) * r * 0.75);
        g.lineTo(Math.cos(a + 0.3) * r * 0.42, r * 0.15 + Math.sin(a + 0.3) * r * 0.42);
        g.fill();
      }
    }
    g.restore();
    if (sleep && Math.sin(this.time * 1.5 + e.i) > 0.6) {
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.font = `700 ${r * 0.9}px system-ui, sans-serif`;
      g.fillText('z', e.x + r * 0.6, e.z - r * 0.8 - ((this.time + e.i) % 1) * 0.5);
    }
  }

  _effects(g, dt) {
    this.fx = this.fx.filter((f) => {
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1) return false;
      g.globalAlpha = Math.max(0, 1 - k);
      if (f.kind === 'line') {
        g.strokeStyle = f.color;
        g.lineWidth = f.width / Math.max(4, this.scale);
        g.beginPath();
        g.moveTo(f.ax, f.az);
        g.lineTo(f.bx, f.bz);
        g.stroke();
      } else if (f.kind === 'ring') {
        g.strokeStyle = f.color;
        g.lineWidth = 0.25;
        g.beginPath();
        g.arc(f.x, f.z, Math.max(0.1, f.r * (0.2 + k * 0.8)), 0, Math.PI * 2);
        g.stroke();
      } else if (f.kind === 'blast') {
        const grad = g.createRadialGradient(f.x, f.z, 0, f.x, f.z, f.r * (0.4 + k));
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, f.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(f.x, f.z, f.r * (0.4 + k), 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      return true;
    });
  }

  dispose() {
    this.gone = true;
    this.canvas.remove();
    this.land = null;
  }
}
