/**
 * Painted textures for Kithvale's buildings and props, drawn once on
 * canvases: mottled lime plaster, wood with long grain strokes, cloth with
 * a woven tooth, river-stone masonry, paper for lanterns and screens, the
 * tile pattern under the roofs, and signboards with lettering.
 */
import * as THREE from 'three';
import { rng } from '../gloamreach/noise.js';

const tex = (c, { repeat = true, srgb = true } = {}) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
};
const canvas = (w, h = w) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
};

/** Plaster: a warm white with soft mottles and the odd hairline. Greyscale-ish (vertex colour tints it). */
export function plasterTexture(seed = 1) {
  const [c, g] = canvas(256);
  const r = rng(seed);
  g.fillStyle = '#f2ece2';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    const v = 215 + r() * 40;
    g.fillStyle = `rgba(${v},${v - 6},${v - 14},${0.12 + r() * 0.12})`;
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 8 + r() * 26, 5 + r() * 14, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = 'rgba(120,100,80,0.12)';
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    let x = r() * 256;
    let y = r() * 256;
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) g.lineTo((x += (r() - 0.5) * 20), (y += r() * 14));
    g.stroke();
  }
  return tex(c);
}

/** Wood: long grain strokes along v. Greyscale-ish (vertex colour gives the stain). */
export function woodTexture(seed = 2) {
  const [c, g] = canvas(128, 512);
  const r = rng(seed);
  g.fillStyle = '#c8b8a4';
  g.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 140; i++) {
    const x = r() * 128;
    const d = r() < 0.6;
    g.strokeStyle = d ? `rgba(70,50,35,${0.08 + r() * 0.16})` : `rgba(255,245,230,${0.06 + r() * 0.1})`;
    g.lineWidth = 0.6 + r() * 2.4;
    g.beginPath();
    g.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 2.5, y);
    g.stroke();
  }
  // A knot or two.
  for (let i = 0; i < 2; i++) {
    g.strokeStyle = 'rgba(60,40,30,0.25)';
    g.beginPath();
    g.ellipse(r() * 128, r() * 512, 5, 10, 0, 0, Math.PI * 2);
    g.stroke();
  }
  return tex(c);
}

/** Stone masonry: rounded river stones in mortar. */
export function stoneTexture(seed = 3) {
  const [c, g] = canvas(256);
  const r = rng(seed);
  g.fillStyle = '#7a7268';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 30) {
    let x = (y / 30) % 2 ? -18 : 0;
    while (x < 256) {
      const w = 34 + r() * 26;
      const v = 150 + r() * 70;
      g.fillStyle = `rgb(${v},${v - 6},${v - 12})`;
      g.beginPath();
      g.roundRect(x + 2, y + 2, w - 4, 26, 9);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.1)';
      g.beginPath();
      g.roundRect(x + 5, y + 4, w - 12, 8, 4);
      g.fill();
      x += w;
    }
  }
  return tex(c);
}

/** Cloth: a woven tooth and a faint border. */
export function clothTexture(seed = 4) {
  const [c, g] = canvas(128);
  const r = rng(seed);
  g.fillStyle = '#f0ece6';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) {
    g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.03})`;
    g.fillRect(i, 0, 1, 128);
    g.fillRect(0, i, 128, 1);
  }
  return tex(c);
}

/** Paper (lanterns and screens): fibrous, with ribs. */
export function paperTexture(seed = 5, ribs = 8) {
  const [c, g] = canvas(128);
  const r = rng(seed);
  g.fillStyle = '#fbf3e4';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(200,170,130,${r() * 0.06})`;
    g.fillRect(r() * 128, r() * 128, 1 + r() * 6, 1);
  }
  g.fillStyle = 'rgba(120,80,50,0.35)';
  for (let k = 0; k < ribs; k++) g.fillRect(0, (k / ribs) * 128, 128, 1.5);
  return tex(c);
}

/** Roof tiles' underside and the gaps between the tile rows: dark, warm. */
export function tileTexture(seed = 6) {
  const [c, g] = canvas(128);
  const r = rng(seed);
  g.fillStyle = '#d0c0b0';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 16) {
    g.fillStyle = 'rgba(60,40,30,0.25)';
    g.fillRect(0, y, 128, 2);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.08})`;
      g.fillRect(r() * 128, y + 3 + r() * 10, 8 + r() * 14, 3);
    }
  }
  return tex(c);
}

/** A signboard: lettering painted on a plank (or a banner). */
export function signTexture(text, { w = 512, h = 128, bg = '#5a3a24', ink = '#f2dca0', font = 'Georgia, serif', vertical = false, emblem = null } = {}) {
  const [c, g] = canvas(w, h);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const r = rng(text.length * 7 + 1);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
    g.fillRect(0, r() * h, w, 1 + r() * 2);
  }
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = Math.max(4, w * 0.012);
  g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (vertical) {
    const size = Math.min(w * 0.6, (h * 0.8) / Math.max(1, text.length));
    g.font = `700 ${size}px ${font}`;
    [...text].forEach((ch, i) => g.fillText(ch, w / 2, h * 0.1 + size * (i + 0.5)));
  } else {
    let size = h * 0.56;
    g.font = `700 ${size}px ${font}`;
    while (g.measureText(text).width > w * 0.86 && size > 8) g.font = `700 ${(size -= 2)}px ${font}`;
    g.fillText(text, w / 2, h / 2 + 2);
  }
  if (emblem) emblem(g, w, h);
  return tex(c, { repeat: false });
}
