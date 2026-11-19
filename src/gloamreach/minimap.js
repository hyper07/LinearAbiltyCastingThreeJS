/**
 * The corner minimap (the platform's standard for RPGs): the map painted
 * once — hill shading, roads and cobbles, water, buildings, trees, the
 * Gate — then each frame a round window on it, turned with the camera so
 * up is where you look, the hero's arrow in the middle, people and animals
 * as dots, a north mark on the rim and the place's name beneath.
 */
import { EXTENT, BUILDINGS, ROOT_HOUSES, ELDER_TREES, GLOAM_GIANTS, PONDS, GATE, footprint, areaAt, AREAS } from './map.js';
import { roadDistances, plazaAt } from './heights.js';

export function paintMap(grid, trees) {
  const W = EXTENT.x1 - EXTENT.x0;
  const H = EXTENT.z1 - EXTENT.z0;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let j = 0; j < H; j++) {
    const z = EXTENT.z0 + j;
    const forest = z < -160;
    for (let i = 0; i < W; i++) {
      const x = EXTENT.x0 + i;
      const h = grid.at(x, z);
      const shade = (grid.at(x - 1, z - 1) - grid.at(x + 1, z + 1)) * 0.6;
      let r;
      let gg;
      let b;
      if (h < -20) [r, gg, b] = [70, 26, 18];
      else if (h > 12) [r, gg, b] = forest ? [62, 48, 78] : [92, 86, 72];
      else if (forest) [r, gg, b] = [44, 62, 66];
      else [r, gg, b] = [92, 118, 58];
      const rd = roadDistances(x, z);
      if (rd.dirt < 0) [r, gg, b] = [150, 122, 84];
      if (rd.cobble < 0 || plazaAt(x, z) > 0.5) [r, gg, b] = [176, 160, 136];
      if (rd.wetcobble < 0) [r, gg, b] = [130, 112, 150];
      const k = Math.max(0.55, Math.min(1.35, 1 + shade * 0.25 + Math.min(h, 40) * 0.004));
      const p = (j * W + i) * 4;
      img.data[p] = r * k;
      img.data[p + 1] = gg * k;
      img.data[p + 2] = b * k;
      img.data[p + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const X = (x) => x - EXTENT.x0;
  const Z = (z) => z - EXTENT.z0;
  g.fillStyle = 'rgba(60, 110, 140, 0.95)';
  for (const p of PONDS) {
    g.beginPath();
    g.arc(X(p.x), Z(p.z), p.r, 0, Math.PI * 2);
    g.fill();
  }
  for (const t of trees) {
    g.fillStyle = t.kind === 'gloam' ? 'rgba(90, 40, 110, 0.55)' : 'rgba(30, 60, 24, 0.5)';
    g.beginPath();
    g.arc(X(t.x), Z(t.z), 2.6 * t.s, 0, Math.PI * 2);
    g.fill();
  }
  for (const t of [...ELDER_TREES, ...GLOAM_GIANTS]) {
    g.fillStyle = t.z < -160 ? 'rgba(120, 50, 140, 0.7)' : 'rgba(34, 70, 26, 0.7)';
    g.beginPath();
    g.arc(X(t.x), Z(t.z), t.r * 3.2, 0, Math.PI * 2);
    g.fill();
  }
  for (const b of BUILDINGS) {
    const pts = footprint(b, 0.6);
    g.fillStyle = '#7a3e2a';
    g.strokeStyle = '#2a1a12';
    g.lineWidth = 1;
    g.beginPath();
    pts.forEach(([x, z], k) => (k ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))));
    g.closePath();
    g.fill();
    g.stroke();
  }
  for (const r of ROOT_HOUSES) {
    g.fillStyle = '#6a4a8a';
    g.beginPath();
    g.arc(X(r.x), Z(r.z), 9, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#b8b0c0';
  g.fillRect(X(-GATE.outerHalfWidth), Z(GATE.z0), GATE.outerHalfWidth * 2, GATE.z1 - GATE.z0);
  g.fillStyle = '#8a8070';
  g.fillRect(X(-GATE.width / 2), Z(GATE.z0), GATE.width, GATE.z1 - GATE.z0);
  return c;
}

export class Minimap {
  constructor(host, mapCanvas) {
    this.el = document.createElement('div');
    this.el.className = 'gr-minimap';
    this.canvas = document.createElement('canvas');
    this.label = document.createElement('div');
    this.label.className = 'gr-minimap__label';
    this.el.append(this.canvas, this.label);
    host.append(this.el);
    this.map = mapCanvas;
    this.size = 0;
    this.zoom = 1.25;
    this.area = null;
  }

  draw(hero, heading, dots = []) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const css = this.el.clientWidth || 180;
    const S = Math.round(css * dpr);
    if (S !== this.size) {
      this.canvas.width = this.canvas.height = S;
      this.size = S;
    }
    const g = this.canvas.getContext('2d');
    const R = S / 2;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath();
    g.arc(R, R, R - 2 * dpr, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#1a1410';
    g.fillRect(0, 0, S, S);
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const rot = -Math.PI / 2 - Math.atan2(fz, fx);
    const k = this.zoom * dpr;
    g.translate(R, R);
    g.rotate(rot);
    g.scale(k, k);
    g.imageSmoothingEnabled = true;
    g.drawImage(this.map, -(hero.x - EXTENT.x0), -(hero.z - EXTENT.z0));
    g.restore();
    // Dots and marks, upright whatever the map's turn: people, animals, monsters (red), chests (gold), the boss (a skull).
    g.save();
    g.beginPath();
    g.arc(R, R, R - 2 * dpr, 0, Math.PI * 2);
    g.clip();
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    for (const d of dots) {
      const lx = (d.x - hero.x) * k;
      const lz = (d.z - hero.z) * k;
      const x = R + lx * cr - lz * sr;
      const y = R + lx * sr + lz * cr;
      if (Math.hypot(x - R, y - R) > R + 8) continue;
      const r = (d.r ?? 1.8) * dpr * (d.shape ? 1 : this.zoom);
      if (d.shape === 'skull') {
        const s = 7 * dpr;
        g.fillStyle = '#f4e6d0';
        g.strokeStyle = '#3a0a06';
        g.lineWidth = 1.5 * dpr;
        g.beginPath();
        g.arc(x, y - s * 0.15, s * 0.75, Math.PI * 0.85, Math.PI * 2.15);
        g.lineTo(x + s * 0.45, y + s * 0.7);
        g.lineTo(x - s * 0.45, y + s * 0.7);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = '#5a0a06';
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.arc(x + sx * s * 0.3, y - s * 0.1, s * 0.2, 0, Math.PI * 2);
          g.fill();
        }
      } else if (d.shape === 'chest') {
        const s = 4.5 * dpr;
        g.fillStyle = '#ffcf4a';
        g.strokeStyle = '#4a2a06';
        g.lineWidth = 1.2 * dpr;
        g.fillRect(x - s, y - s * 0.7, s * 2, s * 1.4);
        g.strokeRect(x - s, y - s * 0.7, s * 2, s * 1.4);
      } else if (d.shape === 'elite') {
        g.fillStyle = d.color;
        g.strokeStyle = '#ffd76a';
        g.lineWidth = 1.5 * dpr;
        g.beginPath();
        g.moveTo(x, y - r * 1.6);
        g.lineTo(x + r * 1.4, y);
        g.lineTo(x, y + r * 1.6);
        g.lineTo(x - r * 1.4, y);
        g.closePath();
        g.fill();
        g.stroke();
      } else {
        g.fillStyle = d.color;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        if (d.ring) {
          g.strokeStyle = 'rgba(0,0,0,0.6)';
          g.lineWidth = 1 * dpr;
          g.stroke();
        }
      }
    }
    g.restore();
    // The hero's arrow (always up: the map turns), and north on the rim.
    g.save();
    g.translate(R, R);
    const a = rot + hero.yawMap;
    g.rotate(a);
    g.fillStyle = '#ffe9a8';
    g.strokeStyle = '#3a2a10';
    g.lineWidth = 1.5 * dpr;
    g.beginPath();
    g.moveTo(0, -8 * dpr);
    g.lineTo(5.5 * dpr, 6 * dpr);
    g.lineTo(0, 3 * dpr);
    g.lineTo(-5.5 * dpr, 6 * dpr);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
    const n = rot - Math.PI / 2;
    const nx = R + Math.cos(n) * (R - 11 * dpr);
    const ny = R + Math.sin(n) * (R - 11 * dpr);
    g.fillStyle = '#f2e2b8';
    g.font = `600 ${11 * dpr}px Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('N', nx, ny);
    const area = areaAt(hero.x, hero.z);
    if (area !== this.area) {
      this.area = area;
      this.label.textContent = AREAS.find((x) => x.id === area)?.name ?? '';
    }
  }

  dispose() {
    this.el.remove();
  }
}
