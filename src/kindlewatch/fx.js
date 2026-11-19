/**
 * Effects: one capped particle pool (embers, sparks, snow puffs, smoke,
 * debris, frost), sword smears, shock rings, transient lights, footprints in
 * the snow, ambient snowfall, and the painted damage numbers (drawn on a 2D
 * overlay at full resolution). Seeded, so a run looks the same twice.
 */
import { rng } from './map.js';

const MAX = 1800;

export class Effects {
  constructor() {
    this.parts = [];
    this.smears = [];
    this.rings = [];
    this.lights = [];
    this.prints = [];
    this.skids = [];
    this.texts = [];
    this.flakes = [];
    this.rand = rng(99);
  }

  r() {
    return this.rand();
  }

  /**
   * One particle. kind picks a look: 'ember' (additive, glowing, rises),
   * 'spark' (additive streak along its velocity), 'flake', 'puff' (snow),
   * 'smoke', 'chunk' (debris), 'frost', 'glow' (soft additive blob), 'star'.
   */
  add(kind, x, y, o = {}) {
    if (this.parts.length >= MAX) this.parts.shift();
    const p = {
      kind, x, y, z: o.z ?? 0,
      vx: o.vx ?? 0, vy: o.vy ?? 0, vz: o.vz ?? 0,
      life: o.life ?? 0.6, t: 0,
      size: o.size ?? 0.15, size1: o.size1 ?? o.size ?? 0.15,
      color: o.color ?? [1, 0.6, 0.2], alpha: o.alpha ?? 1,
      grav: o.grav ?? 0, drag: o.drag ?? 0.5, rot: o.rot ?? 0, vr: o.vr ?? 0,
      tint: o.tint
    };
    this.parts.push(p);
    return p;
  }

  /** A burst of sparks: hit sparks, warm by default, flung round `angle` (or all round). */
  sparks(x, y, z, { n = 10, angle = null, spread = 1.4, speed = 7, color = [2.2, 1.4, 0.6], life = 0.32 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = angle === null ? this.r() * Math.PI * 2 : angle + (this.r() - 0.5) * spread;
      const s = speed * (0.4 + this.r() * 0.8);
      this.add('spark', x, y, { z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8, vz: Math.sin(a) * s * 0.2 + this.r() * 2, life: life * (0.6 + this.r() * 0.6), size: 0.22 + this.r() * 0.2, color, grav: -9, drag: 3 });
    }
  }

  embers(x, y, z, { n = 6, color = [2.4, 1.0, 0.3], speed = 1.5, life = 1.2, size = 0.07 } = {}) {
    for (let i = 0; i < n; i++) {
      this.add('ember', x + (this.r() - 0.5) * 0.3, y + (this.r() - 0.5) * 0.2, { z, vx: (this.r() - 0.5) * speed, vy: (this.r() - 0.5) * speed * 0.4, vz: 0.8 + this.r() * speed, life: life * (0.5 + this.r()), size: size * (0.6 + this.r() * 0.8), size1: 0.01, color, grav: -0.6, drag: 0.6 });
    }
  }

  puff(x, y, { n = 6, color = [0.85, 0.9, 1], speed = 1.6, size = 0.3, life = 0.6 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = this.r() * Math.PI * 2;
      this.add('puff', x, y, { z: 0.05, vx: Math.cos(a) * speed * this.r(), vy: Math.sin(a) * speed * this.r() * 0.6, vz: 0.4 + this.r() * 0.8, life: life * (0.6 + this.r() * 0.6), size: size * 0.5, size1: size * (1 + this.r()), color, alpha: 0.75, grav: 1.5, drag: 2.5 });
    }
  }

  debris(x, y, z, color, { n = 8, speed = 4 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = this.r() * Math.PI * 2;
      this.add('chunk', x, y, { z, vx: Math.cos(a) * speed * (0.3 + this.r()), vy: Math.sin(a) * speed * 0.6 * (0.3 + this.r()), vz: 2 + this.r() * 4, life: 0.8 + this.r() * 0.5, size: 0.07 + this.r() * 0.08, color, grav: 14, drag: 0.8, vr: (this.r() - 0.5) * 20, tint: true });
    }
  }

  frost(x, y, z, { n = 8, speed = 3, life = 0.6 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = this.r() * Math.PI * 2;
      this.add('frost', x, y, { z, vx: Math.cos(a) * speed * this.r(), vy: Math.sin(a) * speed * this.r() * 0.7, vz: this.r() * 2, life: life * (0.6 + this.r() * 0.7), size: 0.08 + this.r() * 0.1, size1: 0.02, color: [0.9, 1.4, 2.0], grav: 2, drag: 1.5, vr: (this.r() - 0.5) * 8 });
    }
  }

  /** A sword smear: frame 0–3, at the wielder, facing `angle`, sweeping `dir` (±1). */
  smear(x, y, z, angle, { frame = 0, dir = 1, size = 1.6, life = 0.16, color = [1.7, 1.55, 1.3], glow = [0.9, 0.5, 0.2] } = {}) {
    this.smears.push({ x, y, z, angle, frame, dir, size, life, t: 0, color, glow });
  }

  ring(x, y, { r0 = 0.3, r1 = 2.5, life = 0.35, color = [1.6, 1.3, 1.0], alpha = 0.9 } = {}) {
    this.rings.push({ x, y, r0, r1, life, t: 0, color, alpha });
  }

  flash(x, y, { h = 1, r = 5, c = [1, 0.6, 0.25], i = 3, life = 0.25 } = {}) {
    this.lights.push({ x, y, h, r, c, i, life, t: 0, i0: i });
  }

  print(x, y, rot) {
    if (this.prints.length > 160) this.prints.shift();
    this.prints.push({ x, y, rot, t: 0, life: 14 });
  }

  /** A scratch in the ice where you slid. */
  skid(x, y, rot) {
    if (this.skids.length > 120) this.skids.shift();
    this.skids.push({ x, y, rot, t: 0, life: 5 });
  }

  /** A damage number or a word, floating up. */
  text(x, y, z, str, { color = '#fff4e0', size = 26, life = 0.85, outline = '#1a1222', crit = false } = {}) {
    this.texts.push({ x: x + (this.r() - 0.5) * 0.3, y, z, str: String(str), color, size, life, t: 0, outline, crit, vx: (this.r() - 0.5) * 0.6 });
  }

  update(dt, view, wind = 0) {
    for (const p of this.parts) {
      p.t += dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.vz = p.vz * d - p.grav * dt;
      p.x += p.vx * dt + wind * dt * 0.2;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rot += p.vr * dt;
      if (p.kind === 'chunk' && p.z < 0) {
        p.z = 0;
        p.vz *= -0.35;
        p.vx *= 0.5;
        p.vy *= 0.5;
        p.vr *= 0.5;
      }
    }
    this.parts = this.parts.filter((p) => p.t < p.life);
    for (const s of this.smears) s.t += dt;
    this.smears = this.smears.filter((s) => s.t < s.life);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.life);
    for (const l of this.lights) {
      l.t += dt;
      l.i = l.i0 * Math.max(0, 1 - l.t / l.life);
    }
    this.lights = this.lights.filter((l) => l.t < l.life);
    for (const f of this.prints) f.t += dt;
    for (const f of this.skids) f.t += dt;
    this.skids = this.skids.filter((f) => f.t < f.life);
    this.prints = this.prints.filter((f) => f.t < f.life);
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter((t) => t.t < t.life);
    // Snowfall: keep a field of flakes round the view.
    if (view) {
      while (this.flakes.length < 70) this.flakes.push({ x: view.x + this.r() * view.w, y: view.y + this.r() * (view.h + 4), z: this.r() * 5, s: 0.4 + this.r() * 0.8, ph: this.r() * 6 });
      for (const f of this.flakes) {
        f.z -= dt * (0.5 + f.s * 0.5);
        f.x += dt * (0.25 + Math.sin(f.ph + f.z) * 0.3 + wind);
        f.y -= dt * 0.15;
        if (f.z < 0 || f.x < view.x - 2 || f.x > view.x + view.w + 2 || f.y < view.y - 3 || f.y > view.y + view.h + 2) {
          f.x = view.x + this.r() * view.w;
          f.y = view.y + this.r() * (view.h + 2) - 1;
          f.z = 3 + this.r() * 3;
        }
      }
    }
  }

  /** Push everything into the stage's effect batches. */
  draw(stage, atlas, time) {
    const dot = atlas.get('fx/dot');
    const glow = atlas.get('fx/glow');
    const spark = atlas.get('fx/spark');
    const smoke = atlas.get('fx/smoke');
    const flake = atlas.get('fx/flake');
    const star = atlas.get('fx/star');
    const ring = atlas.get('fx/ring');
    for (const p of this.parts) {
      const k = p.t / p.life;
      const size = p.size + (p.size1 - p.size) * k;
      const sy = p.y + p.z;
      if (p.kind === 'spark') {
        const a = Math.atan2(p.vy + p.vz * 0.6, p.vx);
        const len = Math.min(0.9, 0.1 + Math.hypot(p.vx, p.vy, p.vz) * 0.06);
        stage.fxAdd.push(spark, p.x, sy, { w: len, h: size * 0.4, rot: a, color: p.color, alpha: 1 - k });
      } else if (p.kind === 'ember') {
        const fl = 0.7 + 0.3 * Math.sin(time * 30 + p.x * 9);
        stage.fxAdd.push(dot, p.x, sy, { w: size * 2, h: size * 2, color: p.color.map((c) => c * fl), alpha: 1 - k * k });
      } else if (p.kind === 'glow') {
        stage.fxAdd.push(glow, p.x, sy, { w: size, h: size, color: p.color, alpha: (1 - k) * p.alpha });
      } else if (p.kind === 'star') {
        stage.fxAdd.push(star, p.x, sy, { w: size, h: size, rot: p.rot, color: p.color, alpha: 1 - k });
      } else if (p.kind === 'frost') {
        stage.fxAdd.push(star, p.x, sy, { w: size * 2, h: size * 2, rot: p.rot, color: p.color, alpha: 1 - k });
      } else if (p.kind === 'puff' || p.kind === 'smoke') {
        stage.fxMix.push(smoke, p.x, sy, { w: size, h: size, rot: p.rot, color: p.color, alpha: p.alpha * (1 - k) * (1 - k) });
      } else if (p.kind === 'chunk') {
        stage.fxMix.push(dot, p.x, sy, { w: size * 1.6, h: size * 1.3, rot: p.rot, color: p.color, alpha: k > 0.8 ? (1 - k) * 5 : 1 });
      } else {
        stage.fxMix.push(dot, p.x, sy, { w: size, h: size, color: p.color, alpha: 1 - k });
      }
    }
    for (const s of this.smears) {
      const k = s.t / s.life;
      const f = atlas.get(`fx/smear-${s.frame}`);
      // the arc sweeps a little further as it fades
      const rot = s.angle + s.dir * (k * 0.35 - 0.1);
      const sz = s.size * (0.95 + k * 0.12);
      const flipV = s.dir < 0;
      stage.fxMix.push(f, s.x, s.y + s.z, { w: f.w * sz / 1.2 * 1.2, h: (flipV ? -1 : 1) * f.h * sz / 2.3 * 2.3, ox: f.ox / f.w, oy: 0.5, rot, color: s.color, alpha: (1 - k) * 0.95 });
      stage.fxAdd.push(f, s.x, s.y + s.z, { w: f.w * sz * 1.05, h: (flipV ? -1 : 1) * f.h * sz * 1.05, ox: f.ox / f.w, oy: 0.5, rot, color: s.glow, alpha: (1 - k) * 0.8 });
    }
    for (const r of this.rings) {
      const k = r.t / r.life;
      const rad = r.r0 + (r.r1 - r.r0) * (1 - (1 - k) * (1 - k));
      stage.fxAdd.push(ring, r.x, r.y, { w: rad * 2.4, h: rad * 2.4 * 0.62, color: r.color, alpha: r.alpha * (1 - k) });
    }
    for (const f of this.flakes) {
      stage.fxMix.push(dot, f.x, f.y + f.z, { w: 0.07 * f.s + 0.03, h: 0.07 * f.s + 0.03, color: [0.9, 0.94, 1.05], alpha: 0.75 });
    }
  }

  /** Footprints as decals (under everything that stands). */
  drawPrints(stage, atlas) {
    const fp = atlas.get('footprint');
    for (const p of this.prints) {
      const a = Math.min(1, (p.life - p.t) / 4) * 0.55;
      stage.decals.push(fp, p.x, p.y, { rot: p.rot, flat: true, alpha: a, sx: 0.85, sy: 0.85 });
    }
  }

  /** Damage numbers and words on the 2D overlay (`toScreen` maps world → CSS px). */
  drawTexts(ctx, toScreen, scale = 1) {
    for (const t of this.texts) {
      const k = t.t / t.life;
      const [sx, sy] = toScreen(t.x + t.vx * k, t.y + t.z + 0.3 + k * 0.9);
      const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.7 : k < 0.25 ? 1.3 - ((k - 0.12) / 0.13) * 0.3 : 1;
      const size = t.size * pop * scale;
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.translate(sx, sy);
      ctx.rotate(t.crit ? -0.12 : -0.05);
      ctx.font = `900 ${size}px 'Nunito Variable', 'Nunito', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.22;
      ctx.strokeStyle = t.outline;
      ctx.strokeText(t.str, 0, 0);
      // a painted fill: a light top fading into the colour
      const grad = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, t.color);
      grad.addColorStop(1, t.color);
      ctx.fillStyle = grad;
      ctx.fillText(t.str, 0, 0);
      ctx.restore();
    }
  }
}
