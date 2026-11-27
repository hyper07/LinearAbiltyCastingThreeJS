import * as THREE from 'three';
import { signNames, TOWERS } from './buildtypes.js';

/**
 * The sign faces of a Seoul street, drawn once into canvas atlases from the
 * sign catalogue (buildtypes.js: made-up names, no real businesses):
 *
 *   wide      one horizontal shop sign (가로형 간판) per name, in the styles a
 *             Korean street has — a colour panel with white letters, a white
 *             panel with coloured letters and a stripe, dark channel-letter
 *             boards, a logo block with a phone number
 *   tall      the same names stacked one letter under another, for the boxes
 *             that stick out from a building's edge (돌출간판) and the lit
 *             standing signs on the pavement (입간판)
 *   glyphs    single white letters on clear, for the vinyl lettering on
 *             upper-floor windows (창문 시트지), tinted per tenant
 *   towers    big white channel letters for the top of a tower
 *
 * `uv(kind, i)` gives a cell's [u0, v0, u1, v1] (flipY off: v grows down).
 */

const FONT = '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Nanum Gothic", system-ui, sans-serif';
const PAL = [
  ['#1d4fa8', '#ffffff'], ['#d7261e', '#ffffff'], ['#128a43', '#ffffff'], ['#f6c400', '#1a1a1a'], ['#ffffff', '#c8161d'], ['#ffffff', '#1d4fa8'],
  ['#0d1b2a', '#ffd34a'], ['#5b2a86', '#ffffff'], ['#e85d1a', '#ffffff'], ['#24262b', '#ffffff'], ['#f4f1ea', '#2c6e49'], ['#0a7c86', '#ffffff'], ['#b0123f', '#ffffff']
];
const hash = (s) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return (h >>> 0) / 4294967296;
};
const phone = (s) => {
  const h = Math.floor(hash(`${s}#`) * 1e8);
  return `02-${String(300 + (h % 700)).padStart(3, '0')}-${String(Math.floor(h / 1000) % 10000).padStart(4, '0')}`;
};

/** Text as large as fits a box (one line), centred at x, y. */
function fit(g, text, x, y, w, h, weight = 900) {
  let size = h;
  g.font = `${weight} ${size}px ${FONT}`;
  const tw = g.measureText(text).width;
  if (tw > w) size = Math.floor((size * w) / tw);
  g.font = `${weight} ${size}px ${FONT}`;
  g.fillText(text, x, y);
  return size;
}

function wideSign(g, x, y, w, h, e) {
  const k = hash(e.name);
  const [bg, fg] = PAL[Math.floor(k * PAL.length)];
  const style = Math.floor(hash(`${e.name}s`) * 4);
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (e.floor === 0) {
    // A to-let banner: white cloth, red letters, a phone number.
    g.fillStyle = '#f8f6f0';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#d4161d';
    fit(g, e.name, x + w * 0.36, y + h * 0.52, w * 0.6, h * 0.74);
    g.fillStyle = '#1a1a1a';
    fit(g, phone(e.name).replace('02-', '010-'), x + w * 0.81, y + h * 0.52, w * 0.34, h * 0.3, 700);
    g.restore();
    return;
  }
  if (style === 2) {
    // A dark board with lit channel letters and an LED edge.
    g.fillStyle = '#1b1d22';
    g.fillRect(x, y, w, h);
    g.fillStyle = bg === '#ffffff' || bg === '#f4f1ea' ? fg : bg === '#24262b' || bg === '#0d1b2a' ? '#ffd34a' : bg;
    g.fillRect(x, y + h - 5, w, 3);
    g.fillStyle = g.fillStyle === '#1b1d22' ? '#ffffff' : g.fillStyle;
    fit(g, e.name, x + w / 2, y + h * 0.48, w * 0.86, h * 0.66);
  } else if (style === 3) {
    // White panel, coloured letters, a coloured stripe along the bottom.
    g.fillStyle = '#f7f6f2';
    g.fillRect(x, y, w, h);
    const ink = bg === '#ffffff' || bg === '#f4f1ea' ? fg : bg;
    g.fillStyle = ink;
    g.fillRect(x, y + h * 0.82, w, h * 0.18);
    fit(g, e.name, x + w / 2, y + h * 0.42, w * 0.88, h * 0.6);
  } else if (style === 1) {
    // A logo block on the left (the business's first letter in a circle), the name, a phone number.
    g.fillStyle = bg;
    g.fillRect(x, y, w, h);
    g.fillStyle = fg;
    g.beginPath();
    g.arc(x + h * 0.55, y + h / 2, h * 0.36, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = bg;
    fit(g, [...e.word][0], x + h * 0.55, y + h * 0.52, h * 0.5, h * 0.44);
    g.fillStyle = fg;
    fit(g, e.name, x + w * 0.52 + h * 0.2, y + h * 0.4, w * 0.7, h * 0.54);
    g.globalAlpha = 0.85;
    fit(g, phone(e.name), x + w * 0.52 + h * 0.2, y + h * 0.82, w * 0.5, h * 0.17, 600);
    g.globalAlpha = 1;
  } else {
    // A colour panel, white (or dark) letters, a thin light frame inside the edge.
    g.fillStyle = bg;
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 3;
    g.strokeRect(x + 5, y + 5, w - 10, h - 10);
    g.fillStyle = fg;
    fit(g, e.name, x + w / 2, y + h * 0.52, w * 0.86, h * 0.68);
  }
  // A darker edge all round (the box's own rim).
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 3;
  g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  g.restore();
}

function tallSign(g, x, y, w, h, e) {
  const [bg, fg] = PAL[Math.floor(hash(`${e.name}v`) * PAL.length)];
  g.save();
  g.fillStyle = bg;
  g.fillRect(x, y, w, h);
  g.strokeStyle = bg === '#ffffff' ? fg : 'rgba(255,255,255,0.55)';
  g.lineWidth = 3;
  g.strokeRect(x + 4, y + 4, w - 8, h - 8);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const chars = [...e.name.replace(/\s/g, '')].slice(0, 7);
  const step = Math.min(w * 0.95, (h - 20) / chars.length);
  chars.forEach((ch, i) => {
    g.font = `900 ${Math.floor(step * 0.82)}px ${FONT}`;
    g.fillText(ch, x + w / 2, y + h / 2 + (i - (chars.length - 1) / 2) * step);
  });
  g.restore();
}

export class SignAtlas {
  constructor() {
    this.names = signNames();
    // Wide: 4 across, 512 × 96 each.
    const WC = 4;
    const ww = 512;
    const wh = 96;
    const rows = Math.ceil(this.names.length / WC);
    this.wide = this._canvas(WC * ww, rows * wh, (g) => this.names.forEach((e, i) => wideSign(g, (i % WC) * ww, Math.floor(i / WC) * wh, ww, wh, e)));
    this.wideGrid = [WC, rows];
    // Tall: 32 across, 64 × 448 each.
    const TC = 32;
    const trows = Math.ceil(this.names.length / TC);
    this.tall = this._canvas(TC * 64, trows * 448, (g) => this.names.forEach((e, i) => tallSign(g, (i % TC) * 64, Math.floor(i / TC) * 448, 64, 448, e)));
    this.tallGrid = [TC, trows];
    // Glyphs: every letter of the upper-floor names and the digits, white on clear, 128 square.
    const chars = [...new Set(this.names.filter((e) => e.floor > 1).flatMap((e) => [...e.name.replace(/\s/g, '')]).concat([...'0123456789-']))];
    this.glyphIndex = new Map(chars.map((c, i) => [c, i]));
    const GC = 16;
    const grows = Math.ceil(chars.length / GC);
    this.glyphs = this._canvas(GC * 128, grows * 128, (g) => {
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      chars.forEach((c, i) => {
        g.font = `900 ${/[0-9-]/.test(c) ? 92 : 104}px ${FONT}`;
        g.fillText(c, (i % GC) * 128 + 64, Math.floor(i / GC) * 128 + 68);
      });
    }, true);
    this.glyphGrid = [GC, grows];
    // Tower names: big letters, 2 across, 1024 × 160.
    this.towers = this._canvas(2048, Math.ceil(TOWERS.length / 2) * 160, (g) => {
      g.fillStyle = '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      TOWERS.forEach((t, i) => fit(g, t, (i % 2) * 1024 + 512, Math.floor(i / 2) * 160 + 84, 980, 132));
    }, true);
    this.towerGrid = [2, Math.ceil(TOWERS.length / 2)];
  }

  _canvas(w, h, draw, clear = false) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    if (!clear) {
      g.fillStyle = '#808080';
      g.fillRect(0, 0, w, h);
    }
    draw(g);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false;
    t.anisotropy = 8;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }

  /** A cell's [u0, v0, u1, v1] in one of the atlases ('wide', 'tall', 'glyph', 'tower'), a hair inside its edges. */
  uv(kind, i) {
    const [cols, rows] = { wide: this.wideGrid, tall: this.tallGrid, glyph: this.glyphGrid, tower: this.towerGrid }[kind];
    const cu = 1 / cols;
    const cv = 1 / rows;
    const x = i % cols;
    const y = Math.floor(i / cols);
    const e = 0.002;
    return [x * cu + e * cu, y * cv + e * cv, (x + 1) * cu - e * cu, (y + 1) * cv - e * cv];
  }

  /** The glyph cells for a name's letters (unknown letters skipped). */
  glyphsOf(name) {
    return [...name.replace(/\s/g, '')].map((c) => this.glyphIndex.get(c)).filter((i) => i != null);
  }

  dispose() {
    for (const t of [this.wide, this.tall, this.glyphs, this.towers]) t.dispose();
  }
}
