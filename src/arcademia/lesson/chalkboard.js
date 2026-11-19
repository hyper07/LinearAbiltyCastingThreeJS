/**
 * A real-looking chalkboard: dark green slate with grain, old eraser
 * smudges and ghosts of yesterday's sums, and chalk that writes itself —
 * letters revealed left to right, lines drawn along their length, circles
 * round their arc — with a dusty, broken texture. It plays a worked
 * example (math.js BOARDS) step by step and can mirror itself onto the
 * 3D board in the classroom.
 */
const W = 1600, H = 800;
const CHALK = { w: '#f4f1e8', y: '#ffe48a', p: '#ffadc0', b: '#a9d8ff', g: '#b8f0a8' };
/** Chalk handwriting; Korean, Japanese and Chinese fall back to rounded system fonts. */
const FONT = '"Chalkboard SE", "Chalkboard", "Comic Sans MS", "Marker Felt", "Segoe Print", "Hiragino Maru Gothic ProN", "Apple SD Gothic Neo", "PingFang SC", "Noto Sans CJK KR", "Noto Sans CJK JP", "Noto Sans CJK SC", "Microsoft YaHei", cursive';

/** A tile of grain, punched out of every stroke so chalk looks dusty. */
function grainTile() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random();
    img.data[i + 3] = v < 0.32 ? 255 * (0.5 + Math.random() * 0.5) : v < 0.5 ? 90 : 0;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export class Chalkboard {
  /** @param {HTMLCanvasElement} canvas a 1600×800 canvas (it is resized to that) */
  constructor(canvas, { mirror = null, sound = null, onSay = null, reducedMotion = false } = {}) {
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    this.g = canvas.getContext('2d');
    this.mirror = mirror; // { canvas, texture } of the 3D board
    this.sound = sound;
    this.onSay = onSay;
    this.reducedMotion = reducedMotion;
    this.grain = grainTile();
    this.slate = document.createElement('canvas');
    this.slate.width = W;
    this.slate.height = H;
    this.base = document.createElement('canvas');
    this.base.width = W;
    this.base.height = H;
    this.layer = document.createElement('canvas');
    this.layer.width = W;
    this.layer.height = H;
    this.tmp = document.createElement('canvas');
    this.tmp.width = W;
    this.tmp.height = H;
    this._paintSlate();
    this.clear();
  }

  /** The slate: green, grainy, with smudges and ghost sums half rubbed out. */
  _paintSlate() {
    const g = this.slate.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2f5a48');
    grad.addColorStop(1, '#264b3c');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // Fine grain.
    const img = g.getImageData(0, 0, W, H);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    // Eraser smudges: wide soft arcs of chalk dust.
    g.save();
    for (let i = 0; i < 9; i++) {
      g.globalAlpha = 0.018 + Math.random() * 0.02;
      g.strokeStyle = '#e8efe6';
      g.lineWidth = 60 + Math.random() * 70;
      g.lineCap = 'round';
      g.beginPath();
      const x = Math.random() * W, y = Math.random() * H;
      g.arc(x, y, 150 + Math.random() * 250, Math.random() * 6, Math.random() * 6 + 1.5);
      g.stroke();
    }
    // Ghosts of old sums.
    g.globalAlpha = 0.055;
    g.fillStyle = '#ffffff';
    g.font = `70px ${FONT}`;
    for (const [t, x, y] of [['7 + 5 = 12', 1050, 160], ['3 × 4', 160, 690], ['½', 1350, 620], ['24 ÷ 6', 700, 750]]) g.fillText(t, x, y);
    g.restore();
    // A dusty band along the bottom edge.
    const dust = g.createLinearGradient(0, H - 60, 0, H);
    dust.addColorStop(0, 'rgba(255,255,255,0)');
    dust.addColorStop(1, 'rgba(255,255,255,0.08)');
    g.fillStyle = dust;
    g.fillRect(0, H - 60, W, 60);
  }

  clear() {
    const b = this.base.getContext('2d');
    b.clearRect(0, 0, W, H);
    b.drawImage(this.slate, 0, 0);
    this.steps = [];
    this.i = 0;
    this.p = 0;
    this.current = null;
    this.playing = false;
    this._present(this.base);
  }

  /** Write these steps (math.js BOARDS), one after another. */
  play(steps, { onDone = null } = {}) {
    this.clear();
    this.steps = steps;
    this.onDone = onDone;
    this.playing = true;
    this._next();
  }

  /** Finish the current example at once. */
  finish() {
    while (this.playing) {
      this.p = 1;
      this._commit();
    }
  }

  _next() {
    if (this.i >= this.steps.length) {
      this.playing = false;
      this.current = null;
      this._present(this.base);
      this.onDone?.();
      return;
    }
    const s = this.steps[this.i++];
    if (s.t === 'say') {
      this.onSay?.(s.s);
      this.current = { s, dur: this.reducedMotion ? 0.2 : Math.min(2.2, 0.6 + s.s.length * 0.025) };
    } else if (s.t === 'pause') {
      this.current = { s, dur: (s.ms ?? 500) / 1000 };
    } else {
      this._draw(this.layer.getContext('2d'), s, true);
      this.current = { s, dur: this.reducedMotion ? 0.05 : duration(s) };
    }
    this.p = 0;
  }

  /** Step time forward. */
  update(dt) {
    if (!this.playing || !this.current) return;
    this.p = Math.min(1, this.p + dt / this.current.dur);
    const t = this.current.s.t;
    if (t !== 'say' && t !== 'pause') {
      if (Math.random() < dt * 14) this.sound?.chalk();
      this._reveal();
    }
    if (this.p >= 1) this._commit();
  }

  _commit() {
    const s = this.current?.s;
    if (s && s.t !== 'say' && s.t !== 'pause') {
      const b = this.base.getContext('2d');
      b.drawImage(this.layer, 0, 0);
      this.layer.getContext('2d').clearRect(0, 0, W, H);
      this._present(this.base);
    }
    this._next();
  }

  /** Draw the base, then the part of the current stroke written so far. */
  _reveal() {
    const s = this.current.s, p = this.p;
    const t = this.tmp.getContext('2d');
    t.clearRect(0, 0, W, H);
    t.save();
    t.drawImage(this.layer, 0, 0);
    t.globalCompositeOperation = 'destination-in';
    t.fillStyle = '#000';
    t.strokeStyle = '#000';
    t.lineCap = 'round';
    t.lineJoin = 'round';
    if (s.t === 'text') {
      const bb = this._textBox(s);
      t.fillRect(bb.x - 10, bb.y - 10, (bb.w + 20) * p, bb.h + 20);
    } else if (s.t === 'line') {
      t.lineWidth = 34;
      strokePartial(t, s.pts, p);
    } else if (s.t === 'hop') {
      t.lineWidth = 40;
      const pts = hopPoints(s);
      strokePartial(t, pts, p);
    } else if (s.t === 'circle' || s.t === 'pizza') {
      t.beginPath();
      const r = (s.r ?? 30) + 30;
      t.moveTo(s.x, s.y);
      t.arc(s.x, s.y, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      t.closePath();
      t.fill();
    } else if (s.t === 'rect') {
      t.lineWidth = 30;
      const pts = [[s.x, s.y], [s.x + s.w, s.y], [s.x + s.w, s.y + s.h], [s.x, s.y + s.h], [s.x, s.y]];
      if (s.fill) t.fillRect(s.x - 10, s.y - 10, (s.w + 20) * p, s.h + 20);
      else strokePartial(t, pts, p);
    } else if (s.t === 'cross') {
      t.lineWidth = 30;
      const k = s.s;
      if (p < 0.5) strokePartial(t, [[s.x - k, s.y - k], [s.x + k, s.y + k]], p * 2);
      else {
        strokePartial(t, [[s.x - k, s.y - k], [s.x + k, s.y + k]], 1);
        strokePartial(t, [[s.x + k, s.y - k], [s.x - k, s.y + k]], (p - 0.5) * 2);
      }
    }
    t.restore();
    const g = this.g;
    g.drawImage(this.base, 0, 0);
    g.drawImage(this.tmp, 0, 0);
    // The stick of chalk at the writing point.
    const tip = this._tip(s, p);
    if (tip) {
      g.save();
      g.translate(tip[0], tip[1]);
      g.rotate(-0.6);
      g.fillStyle = CHALK[s.c ?? 'w'];
      g.shadowColor = 'rgba(0,0,0,0.35)';
      g.shadowBlur = 8;
      g.fillRect(-6, -54, 14, 56);
      g.restore();
    }
    this._mirror();
  }

  _tip(s, p) {
    if (s.t === 'text') {
      const bb = this._textBox(s);
      return [bb.x + bb.w * p, bb.y + bb.h * 0.7];
    }
    if (s.t === 'line') return pointAt(s.pts, p);
    if (s.t === 'hop') return pointAt(hopPoints(s), p);
    if (s.t === 'circle' || s.t === 'pizza') {
      const a = -Math.PI / 2 + p * Math.PI * 2;
      return [s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r];
    }
    return null;
  }

  _textBox(s) {
    const g = this.g;
    const size = 90 * (s.size ?? 1);
    g.font = `${size}px ${FONT}`;
    const w = g.measureText(s.s).width;
    const x = s.align === 'center' ? s.x - w / 2 : s.align === 'right' ? s.x - w : s.x;
    return { x, y: s.y - size * 0.85, w, h: size * 1.1 };
  }

  /** Draw one step fully, chalky, onto a layer. */
  _draw(g, s, clearFirst = false) {
    if (clearFirst) g.clearRect(0, 0, W, H);
    g.save();
    const col = CHALK[s.c ?? 'w'];
    g.strokeStyle = col;
    g.fillStyle = col;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const rough = (fn) => {
      // Two passes, slightly apart: a hand-drawn line.
      for (let k = 0; k < 2; k++) {
        g.save();
        g.globalAlpha = k ? 0.55 : 0.9;
        g.translate((Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 2.5);
        fn();
        g.restore();
      }
    };
    if (s.t === 'text') {
      const size = 90 * (s.size ?? 1);
      g.font = `${size}px ${FONT}`;
      g.textAlign = s.align ?? 'left';
      g.textBaseline = 'alphabetic';
      rough(() => g.fillText(s.s, s.x, s.y));
    } else if (s.t === 'line') {
      g.lineWidth = 7;
      rough(() => {
        g.beginPath();
        s.pts.forEach(([x, y], i) => (i ? g.lineTo(x + wob(), y + wob()) : g.moveTo(x, y)));
        g.stroke();
      });
    } else if (s.t === 'hop') {
      g.lineWidth = 6;
      const pts = hopPoints(s);
      rough(() => {
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
      });
      const [ex, ey] = pts.at(-1);
      g.beginPath();
      g.moveTo(ex - 14, ey - 16);
      g.lineTo(ex, ey);
      g.lineTo(ex + 6, ey - 20);
      g.stroke();
    } else if (s.t === 'circle') {
      g.lineWidth = 7;
      rough(() => {
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        s.fill ? g.fill() : g.stroke();
      });
    } else if (s.t === 'rect') {
      g.lineWidth = 6;
      rough(() => {
        if (s.fill) {
          g.globalAlpha *= 0.55;
          g.fillRect(s.x, s.y, s.w, s.h);
        } else g.strokeRect(s.x, s.y, s.w, s.h);
      });
    } else if (s.t === 'cross') {
      g.lineWidth = 9;
      rough(() => {
        g.beginPath();
        g.moveTo(s.x - s.s, s.y - s.s);
        g.lineTo(s.x + s.s, s.y + s.s);
        g.moveTo(s.x + s.s, s.y - s.s);
        g.lineTo(s.x - s.s, s.y + s.s);
        g.stroke();
      });
    } else if (s.t === 'pizza') {
      g.lineWidth = 7;
      for (let k = 0; k < s.shaded; k++) {
        g.save();
        g.globalAlpha = 0.45;
        g.fillStyle = CHALK[s.c ?? 'y'];
        g.beginPath();
        g.moveTo(s.x, s.y);
        g.arc(s.x, s.y, s.r - 4, -Math.PI / 2 + (k / s.parts) * Math.PI * 2, -Math.PI / 2 + ((k + 1) / s.parts) * Math.PI * 2);
        g.closePath();
        g.fill();
        g.restore();
      }
      rough(() => {
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        for (let k = 0; k < s.parts; k++) {
          const a = -Math.PI / 2 + (k / s.parts) * Math.PI * 2;
          g.moveTo(s.x, s.y);
          g.lineTo(s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r);
        }
        g.stroke();
      });
    }
    // Dusty: punch grain out of what was drawn.
    g.globalCompositeOperation = 'destination-out';
    g.globalAlpha = 0.55;
    const pat = g.createPattern(this.grain, 'repeat');
    g.fillStyle = pat;
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  _present(src) {
    this.g.drawImage(src, 0, 0);
    this._mirror();
  }

  _mirror() {
    if (!this.mirror) return;
    const now = performance.now();
    if (now - (this._mirrorT ?? 0) < 60) return;
    this._mirrorT = now;
    this.mirror.canvas.getContext('2d').drawImage(this.canvas, 0, 0, this.mirror.canvas.width, this.mirror.canvas.height);
    this.mirror.texture.needsUpdate = true;
  }
}

const wob = () => (Math.random() - 0.5) * 3;
function duration(s) {
  if (s.t === 'text') return Math.min(1.2, 0.2 + s.s.length * 0.05);
  if (s.t === 'line') return Math.min(0.9, 0.12 + polyLen(s.pts) / 1200);
  if (s.t === 'hop') return 0.28;
  if (s.t === 'circle') return s.fill ? 0.12 : 0.35;
  if (s.t === 'pizza') return 1.0;
  if (s.t === 'rect') return s.fill ? 0.5 : 0.7;
  if (s.t === 'cross') return 0.3;
  return 0.3;
}
function polyLen(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}
function hopPoints(s) {
  const out = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    out.push([s.x1 + (s.x2 - s.x1) * t, s.y - Math.sin(Math.PI * t) * s.h]);
  }
  return out;
}
function pointAt(pts, p) {
  const total = polyLen(pts);
  let left = total * p;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (left <= seg) {
      const k = seg ? left / seg : 0;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    }
    left -= seg;
  }
  return pts.at(-1);
}
function strokePartial(g, pts, p) {
  const total = polyLen(pts);
  let left = total * p;
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const k = Math.min(1, left / (seg || 1));
    g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k);
    left -= seg;
  }
  g.stroke();
}
