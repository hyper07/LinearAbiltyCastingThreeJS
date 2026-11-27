/**
 * Kickrani's map in the corner of a race: the real streets round you (every
 * road and small street from roads.bin and alleys.bin, as wide as they are),
 * the buildings faintly (the course's own walls), the river where it is
 * near, the course and its short cuts (dotted), the item boxes, marble
 * patches, oil slicks and smoke clouds in the road, the traffic, and every rider as a dot in
 * their colour. It turns with you (smoothly), or keeps north up — a click on
 * the map switches, remembered on this device.
 *
 * Cheap: everything that stands still is drawn once per race into a canvas
 * (`build`); `draw` (called ~12 times a second) lays that canvas under you,
 * turned, and the few moving things on top.
 */

import { SKYLINE } from './skyline.js';

const turn = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** How far off a landmark is still marked on the map (m): the tall towers from across the city, the rest from round about. */
export const MARK_RANGE = { tower: 9000, gold: 9000, palace: 2600, bluehouse: 2600, statue: 1600 };

/**
 * Where a landmark goes on the round map (pixels, from the map's middle at `R`, `cy`): at its place if it
 * is on the map, else on the rim the way it lies — { x, y, rim }. `rot` is the map's turn, `S` pixels a metre.
 */
export function markAt(l, me, { R, cy, rot, S, inset = 20 }) {
  const dx = (l.x - me.x) * S;
  const dz = (l.z - me.z) * S;
  let x = dx * Math.cos(rot) - dz * Math.sin(rot);
  let y = dx * Math.sin(rot) + dz * Math.cos(rot);
  const max = R - inset;
  // (from the map's middle, not from you — you sit a little below it when the map turns with you)
  const ox = x;
  const oy = y + (cy - R);
  const d = Math.hypot(ox, oy);
  if (d <= max) return { x: R + ox, y: R + oy, rim: false };
  return { x: R + (ox / d) * max, y: R + (oy / d) * max, rim: true };
}

/** A landmark's little sign on the map, `s` pixels across, centred at (x, y): no words. */
export function drawMark(g, kind, x, y, s = 22, rim = false) {
  g.save();
  g.translate(x, y);
  g.globalAlpha = rim ? 0.92 : 1;
  g.fillStyle = 'rgba(255, 255, 255, 0.92)';
  g.strokeStyle = 'rgba(24, 21, 38, 0.85)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, s / 2, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  const k = s / 22;
  g.scale(k, k);
  g.lineJoin = 'round';
  if (kind === 'tower' || kind === 'gold') {
    if (kind === 'gold') {
      g.fillStyle = '#d4a03a';
      g.fillRect(-3.5, -8, 7, 16);
      g.fillStyle = '#ffe7a6';
      g.fillRect(-1.5, -6, 1.5, 12);
    } else {
      g.fillStyle = '#5b6b80';
      g.beginPath();
      g.moveTo(0, -10);
      g.lineTo(2.4, 8);
      g.lineTo(-2.4, 8);
      g.closePath();
      g.fill();
      g.fillStyle = '#e84a3c';
      g.beginPath();
      g.ellipse(0, -1, 4.6, 2.2, 0, 0, Math.PI * 2);
      g.fill();
    }
  } else if (kind === 'palace' || kind === 'bluehouse') {
    // a hanok roof, its corners swept up, over a hall
    g.fillStyle = kind === 'bluehouse' ? '#2f67b4' : '#3b404a';
    g.beginPath();
    g.moveTo(-9, -1);
    g.quadraticCurveTo(-5, 1, -4, -5);
    g.lineTo(4, -5);
    g.quadraticCurveTo(5, 1, 9, -1);
    g.lineTo(7, 2);
    g.lineTo(-7, 2);
    g.closePath();
    g.fill();
    g.fillStyle = kind === 'bluehouse' ? '#dfe6ee' : '#b3412e';
    g.fillRect(-5, 2, 10, 5);
  } else if (kind === 'statue') {
    g.fillStyle = '#8f8a80';
    g.fillRect(-4, 2, 8, 7);
    g.fillStyle = '#4b4a3c';
    g.beginPath();
    g.arc(0, -7, 2.4, 0, Math.PI * 2);
    g.fill();
    g.fillRect(-2.6, -4.6, 5.2, 6.8);
    g.fillRect(3.2, -9, 1, 10);
  }
  g.restore();
}
/** Pixels a metre on the map (about 170 m from you to its edge). */
export const MAP_SCALE = 1.3;

export class RaceMinimap {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.cv = canvas;
    this.rot = null;
    this.northUp = false;
    try {
      this.northUp = localStorage.getItem('gamory.jarani.northUp') === '1';
    } catch {
      /* private mode */
    }
    this.layer = null;
  }

  toggle() {
    this.northUp = !this.northUp;
    try {
      localStorage.setItem('gamory.jarani.northUp', this.northUp ? '1' : '0');
    } catch {
      /* private mode */
    }
  }

  /** The still layer for a race: water, buildings, every street, the course and its short cuts. */
  build(race) {
    const g = race.g;
    const c = race.course;
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const p of c.points) {
      x0 = Math.min(x0, p[0]);
      x1 = Math.max(x1, p[0]);
      z0 = Math.min(z0, p[1]);
      z1 = Math.max(z1, p[1]);
    }
    const M = 260;
    x0 -= M;
    z0 -= M;
    x1 += M;
    z1 += M;
    const K = Math.min(MAP_SCALE, 2600 / Math.max(x1 - x0, z1 - z0));
    const cv = document.createElement('canvas');
    cv.width = Math.ceil((x1 - x0) * K);
    cv.height = Math.ceil((z1 - z0) * K);
    const ctx = cv.getContext('2d');
    ctx.setTransform(K, 0, 0, K, -x0 * K, -z0 * K);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // The river (and any water) where it is near: sampled every 4 m, drawn soft.
    if (g.waterAt) {
      const step = 4;
      const w = Math.ceil((x1 - x0) / step);
      const h = Math.ceil((z1 - z0) / step);
      const wc = document.createElement('canvas');
      wc.width = w;
      wc.height = h;
      const wg = wc.getContext('2d');
      const img = wg.createImageData(w, h);
      let any = false;
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          if (!g.waterAt(x0 + i * step, z0 + j * step)) continue;
          any = true;
          const o = (j * w + i) * 4;
          img.data[o] = 46;
          img.data[o + 1] = 104;
          img.data[o + 2] = 168;
          img.data[o + 3] = 235;
        }
      }
      if (any) {
        wg.putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(wc, x0, z0, w * step, h * step);
      }
      this.water = any;
    }
    // Buildings, faintly: the footprints the course's walls were made from.
    ctx.fillStyle = 'rgba(120, 112, 168, 0.22)';
    let nb = 0;
    for (const r of c.walls?.rings ?? []) {
      if (r.maxx < x0 || r.minx > x1 || r.maxz < z0 || r.minz > z1) continue;
      ctx.beginPath();
      ctx.moveTo(r.xs[0], r.zs[0]);
      for (let i = 1; i < r.xs.length; i++) ctx.lineTo(r.xs[i], r.zs[i]);
      ctx.closePath();
      ctx.fill();
      nb++;
    }
    this.buildings = nb;
    // Every street: the small ones thin and faint under the main roads, each as wide as it is.
    const roads = [];
    for (const list of g.roadTiles?.values() ?? []) {
      for (const r of list) {
        const p = r.pts;
        let inside = false;
        for (let i = 0; i < p.length; i += 2) {
          if (p[i] > x0 && p[i] < x1 && p[i + 1] > z0 && p[i + 1] < z1) {
            inside = true;
            break;
          }
        }
        if (inside) roads.push(r);
      }
    }
    roads.sort((a, b) => (b.small ? 9 : 0) + b.cls - ((a.small ? 9 : 0) + a.cls));
    for (const pass of ['edge', 'top']) {
      for (const r of roads) {
        const p = r.pts;
        ctx.strokeStyle = pass === 'edge' ? 'rgba(10, 8, 20, 0.5)' : r.small ? 'rgba(170, 170, 200, 0.62)' : r.bridge ? 'rgba(226, 222, 244, 0.95)' : 'rgba(205, 208, 230, 0.88)';
        ctx.lineWidth = Math.max(r.small ? 1.6 / MAP_SCALE : 2.6 / MAP_SCALE, r.width) + (pass === 'edge' ? 1.6 / MAP_SCALE : 0);
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
        ctx.stroke();
      }
    }
    this.roads = roads.length;
    // The course: a broad gold band; its short cuts dotted cyan.
    ctx.strokeStyle = 'rgba(255, 210, 58, 0.42)';
    ctx.lineWidth = 7 / MAP_SCALE;
    ctx.beginPath();
    c.points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.stroke();
    ctx.save();
    ctx.setLineDash([6 / MAP_SCALE, 6 / MAP_SCALE]);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(127, 240, 255, 0.95)';
    ctx.lineWidth = 5 / MAP_SCALE;
    for (const sc of c.shortcuts ?? []) {
      ctx.beginPath();
      sc.points.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.stroke();
    }
    ctx.restore();
    // The start and finish: a chequered bar across the road.
    const a = c.points[0];
    const b = c.points[1];
    const hd = Math.atan2(b[0] - a[0], b[1] - a[1]);
    ctx.save();
    ctx.translate(a[0], a[1]);
    ctx.rotate(-hd);
    const w = (a[2] ?? 10) * 0.6;
    for (let k = 0; k < 6; k++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (k + j) % 2 ? '#1a1222' : '#ffffff';
      ctx.fillRect(-w / 2 + (k * w) / 6, -2 / MAP_SCALE + (j * 2.5) / MAP_SCALE, w / 6, 2.5 / MAP_SCALE);
    }
    ctx.restore();
    this.layer = { cv, x0, z0, K };
    return this.layer;
  }

  /** Draw the map for `race` now (dt: seconds since the last draw, for the turn's easing). */
  draw(race, dt = 1 / 12) {
    const cv = this.cv;
    const g = cv.getContext('2d');
    const W = cv.width;
    const R = W / 2;
    const me = race.me;
    if (!me) return;
    if (!this.layer) this.build(race);
    const S = MAP_SCALE;
    // turned with you, eased (a quick lean doesn't swing the map about), or north up
    const want = this.northUp ? 0 : me.s.travel ?? me.s.heading;
    this.rot = this.rot == null ? want : this.rot + turn(this.rot, want) * Math.min(1, dt * 5);
    const cy = this.northUp ? R : R * 1.2;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath();
    g.arc(R, R, R - 4, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = 'rgba(24, 21, 38, 0.86)';
    g.fillRect(0, 0, W, W);
    g.translate(R, cy);
    g.rotate(this.rot);
    g.scale(S, S);
    g.translate(-me.s.x, -me.s.z);
    const L = this.layer;
    g.imageSmoothingEnabled = true;
    g.drawImage(L.cv, L.x0, L.z0, L.cv.width / L.K, L.cv.height / L.K);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    // the course ahead of you, bright
    const pts = race.course.points;
    const n = pts.length;
    g.strokeStyle = '#ffd23a';
    g.lineWidth = 8 / S;
    g.beginPath();
    if (me.sc != null && race.paths?.[me.sc]) {
      const p = race.paths[me.sc];
      for (let k = 0; k < 40; k++) {
        const q = p.points[Math.min(p.points.length - 1, me.si + k)];
        if (k) g.lineTo(q[0], q[1]);
        else g.moveTo(q[0], q[1]);
      }
    } else for (let k = 0; k < 40; k++) {
      const p = pts[(me.idx + k) % n];
      if (k) g.lineTo(p[0], p[1]);
      else g.moveTo(p[0], p[1]);
    }
    g.stroke();
    // item boxes: small pink dots
    g.fillStyle = '#ff7aa8';
    for (const b of race.boxes?.live() ?? []) {
      g.beginPath();
      g.arc(b.x, b.z, 2.4, 0, Math.PI * 2);
      g.fill();
    }
    // marbles in the road: a speckle of bright dots in their colours, ringed
    for (const p of race.patches ?? []) {
      g.strokeStyle = 'rgba(122, 216, 255, 0.9)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(p.bx ?? p.x, p.bz ?? p.z, Math.max(2.5, (p.br ?? 2) + 1), 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#e8f8ff';
      for (let k = 0; k < p.marbles.length; k += 4) {
        const m = p.marbles[k];
        if (!m.live) continue;
        g.fillRect(m.x - 0.5, m.z - 0.5, 1, 1);
      }
    }
    // oil in the road: a black puddle, ringed in its sheen's violet
    for (const o of race.slicks ?? []) {
      g.fillStyle = 'rgba(20, 18, 28, 0.9)';
      g.strokeStyle = 'rgba(200, 155, 255, 0.95)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.arc(o.x, o.z, Math.max(2.5, o.r), 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    // smoke clouds: a soft grey round, thinning as the cloud does
    for (const c of race.clouds ?? []) {
      const age = race.clock - c.born;
      const k = Math.max(0, Math.min(1, (7 - age) / 3));
      const R = Math.min(5, 1 + age * 4) + 1;
      const gr = g.createRadialGradient(c.x, c.z, 0, c.x, c.z, R);
      gr.addColorStop(0, `rgba(214, 218, 224, ${0.85 * k})`);
      gr.addColorStop(1, 'rgba(214, 218, 224, 0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(c.x, c.z, R, 0, Math.PI * 2);
      g.fill();
    }
    for (const v of race.traffic?.vehicles ?? []) {
      g.save();
      g.translate(v.box.x, v.box.z);
      g.rotate(-v.box.heading);
      g.fillStyle = v.kind === 'bus' ? '#7fd1ff' : v.kind === 'scooter' ? '#ffb02e' : '#e8e8ee';
      g.fillRect(-v.box.halfWidth, -v.box.halfLength, v.box.halfWidth * 2, v.box.halfLength * 2);
      g.restore();
    }
    for (const r of race.racers) {
      if (r === me || r.left) continue;
      g.fillStyle = r.color;
      g.strokeStyle = r.helmet ? '#ffd23a' : '#fff';
      g.lineWidth = 2.2;
      g.beginPath();
      g.arc(r.s.x, r.s.z, 5, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    g.restore();
    // the landmarks: a little sign each where it stands, or on the rim the way it lies (the towers from
    // across the city, the palace, Cheong Wa Dae and the statues from round about)
    this.marks = [];
    for (const l of SKYLINE) {
      const kind = l.icon ?? 'tower';
      if (Math.hypot(l.x - me.s.x, l.z - me.s.z) > Math.min(l.range ?? 9000, MARK_RANGE[kind] ?? 9000)) continue;
      const m = markAt(l, { x: me.s.x, z: me.s.z }, { R, cy, rot: this.rot, S });
      drawMark(g, kind, m.x, m.y, m.rim ? 20 : 24, m.rim);
      this.marks.push(l.id);
    }
    // you: an arrow the way you go
    g.save();
    g.translate(R, cy);
    if (this.northUp) g.rotate(-(me.s.travel ?? me.s.heading));
    g.fillStyle = me.color ?? '#ffd23a';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, -15);
    g.lineTo(10, 11);
    g.lineTo(0, 5);
    g.lineTo(-10, 11);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    // the rim, and north on it
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(R, R, R - 4, 0, Math.PI * 2);
    g.stroke();
    const na = -Math.PI / 2 + this.rot;
    const nx = R + Math.cos(na) * (R - 22);
    const ny = R + Math.sin(na) * (R - 22);
    g.fillStyle = '#ff5a5a';
    g.beginPath();
    g.arc(nx, ny, 15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = '900 20px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('N', nx, ny + 1);
    this.drawn = (this.drawn ?? 0) + 1;
  }
}
