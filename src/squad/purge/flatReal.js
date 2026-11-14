import { RANKS, BUILDINGS, GUARDIANS, COLORS, FOES, FORGE_REACH } from './rules.js';
import { SIZE, RIDGES, ROCKS, STRUCTURES, GUARDS, BASE, BARRACKS, ARMORY, FORGE, PAD, Grid, foeDef } from './map.js';
import { ELEVATION } from './sprites.js';

/**
 * Grave Purge 2D, the realistic way: textured ground (ambientCG photos,
 * blended band into band), rock cliffs along the ridges, the blight
 * spreading round the dead's buildings, and the baked sprites (sprites.js)
 * drawn back to front with soft shadows — the land painted once, the rest
 * every frame. Remains stay where things fell.
 */

export const PX = 10; // pixels a metre in the painted land
const LIFT = Math.cos(ELEVATION); // how much a metre of height rises up the screen
const TEX = { t1: 'Ground078', t2: 'Ground071', t3: 'Ground103', t4: 'Gravel043', rock: 'Rock030', yard: 'Concrete034' };
const TILE = { t1: 7, t2: 6, t3: 6, t4: 5, rock: 5, yard: 5 };
/** Which baked kind of the dead a guardian is drawn from. */
const GUARD_BODY = { Skeleton_Warrior: 'brute', Skeleton_Mage: 'bonecaller', Skeleton_Rogue: 'ravager' };

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadTextures() {
  const out = {};
  await Promise.all(Object.entries(TEX).map(async ([k, id]) => (out[k] = await loadImage(`./library/ambientcg/${id}/${id}_1K-JPG_Color.jpg`))));
  return out;
}

/** A smooth random field (value noise), small; drawn up it makes soft blotches. */
function noiseCanvas(n, seed, cells = 16) {
  const r = rng(seed);
  const grid = Array.from({ length: (cells + 1) * (cells + 1) }, () => r());
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const img = c.getContext('2d').createImageData(n, n);
  const at = (i, j) => grid[j * (cells + 1) + i];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const fx = (x / n) * cells;
      const fy = (y / n) * cells;
      const i = Math.floor(fx);
      const j = Math.floor(fy);
      const u = fx - i;
      const v = fy - j;
      const su = u * u * (3 - 2 * u);
      const sv = v * v * (3 - 2 * v);
      const val = (at(i, j) * (1 - su) + at(i + 1, j) * su) * (1 - sv) + (at(i, j + 1) * (1 - su) + at(i + 1, j + 1) * su) * sv;
      const k = (y * n + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = val * 255;
      img.data[k + 3] = 255;
    }
  }
  c.getContext('2d').putImageData(img, 0, 0);
  return c;
}

function pattern(g, img, metres) {
  const p = g.createPattern(img, 'repeat');
  p.setTransform(new DOMMatrix().scale(metres / img.width));
  return p;
}

/** A sprite (a still) drawn with its feet at (x, z) metres, `k` pixels a metre. */
export function stamp(g, still, x, z, k = 1, flip = false) {
  const s = k / still.ppm;
  g.save();
  g.translate(x, z);
  if (flip) g.scale(-1, 1);
  g.drawImage(still.atlas, -still.anchor.x * s, -still.anchor.y * s, still.cell * s, still.cell * s);
  g.restore();
}

function shadow(g, x, z, rx, ry, alpha = 0.38) {
  g.save();
  g.translate(x + rx * 0.35, z + ry * 0.4);
  g.scale(rx, ry);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  grad.addColorStop(0, `rgba(10,6,12,${alpha})`);
  grad.addColorStop(1, 'rgba(10,6,12,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, 1, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** The land, painted once: ground bands, the camp, cliffs, boulders, graves and dead trees. */
export function paintLand(tex, sprites) {
  const n = SIZE * PX;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  g.scale(PX, PX);
  const r = rng(77);
  // The bands, each blended over the last along a ragged edge.
  g.fillStyle = pattern(g, tex.t1, TILE.t1);
  g.fillRect(0, 0, SIZE, SIZE);
  const edges = [[95, 't2'], [160, 't3'], [220, 't4']];
  edges.forEach(([radius, key], idx) => {
    const m = 256;
    const mask = document.createElement('canvas');
    mask.width = mask.height = m;
    const mg = mask.getContext('2d');
    const noise = noiseCanvas(64, 11 + idx, 8).getContext('2d').getImageData(0, 0, 64, 64).data;
    const img = mg.createImageData(m, m);
    for (let y = 0; y < m; y++) {
      for (let x = 0; x < m; x++) {
        const wx = (x / m) * SIZE;
        const wz = (y / m) * SIZE;
        const nz = noise[(Math.floor((y / m) * 64) * 64 + Math.floor((x / m) * 64)) * 4] / 255;
        const d = Math.hypot(wx, wz) + (nz - 0.5) * 22;
        const a = Math.max(0, Math.min(1, (d - radius) / 10));
        img.data[(y * m + x) * 4 + 3] = a * 255;
      }
    }
    mg.putImageData(img, 0, 0);
    const layer = document.createElement('canvas');
    layer.width = layer.height = n;
    const lg = layer.getContext('2d');
    lg.scale(PX, PX);
    lg.fillStyle = pattern(lg, tex[key], TILE[key]);
    lg.fillRect(0, 0, SIZE, SIZE);
    // The far band greyer and colder: ash.
    if (key === 't4') {
      lg.fillStyle = 'rgba(70,40,80,0.35)';
      lg.globalCompositeOperation = 'multiply';
      lg.fillRect(0, 0, SIZE, SIZE);
      lg.globalCompositeOperation = 'source-over';
    }
    lg.setTransform(1, 0, 0, 1, 0, 0);
    lg.globalCompositeOperation = 'destination-in';
    lg.imageSmoothingEnabled = true;
    lg.drawImage(mask, 0, 0, n, n);
    g.drawImage(layer, 0, 0, SIZE, SIZE);
  });
  // Soft light and dark across the land, so no two places look alike.
  const blot = noiseCanvas(128, 5, 20);
  g.globalCompositeOperation = 'overlay';
  g.globalAlpha = 0.35;
  g.drawImage(blot, 0, 0, SIZE, SIZE);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  // The camp: a concrete yard with expansion joints and a low wall.
  g.fillStyle = pattern(g, tex.yard, TILE.yard);
  g.fillRect(BASE.x0, BASE.z0, BASE.x1 - BASE.x0, BASE.z1 - BASE.z0);
  g.fillStyle = 'rgba(120,130,140,0.25)';
  g.fillRect(BASE.x0, BASE.z0, BASE.x1 - BASE.x0, BASE.z1 - BASE.z0);
  g.strokeStyle = 'rgba(30,30,36,0.35)';
  g.lineWidth = 0.1;
  for (let x = 4; x < BASE.x1; x += 4) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, BASE.z1);
    g.stroke();
  }
  for (let z = 4; z < BASE.z1; z += 4) {
    g.beginPath();
    g.moveTo(0, z);
    g.lineTo(BASE.x1, z);
    g.stroke();
  }
  // Yellow-and-black edge stripes where the yard meets the dirt.
  g.lineWidth = 0.35;
  g.setLineDash([0.8, 0.8]);
  g.strokeStyle = '#d8b020';
  g.strokeRect(BASE.x0 + 0.3, BASE.z0 + 0.3, BASE.x1 - 0.6, BASE.z1 - 0.6);
  g.setLineDash([]);
  for (const [x, z, w, d] of [[BASE.x1, 0, 1, 14], [BASE.x1, 26, 1, 12.5], [0, BASE.z1, 18, 1], [30, BASE.z1, 18.5, 1]]) {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(x + 0.3, z + 0.5, w, d);
    g.fillStyle = '#8a8680';
    g.fillRect(x, z, w, d);
    g.fillStyle = '#b4b0a8';
    g.fillRect(x, z, w, Math.min(d, 0.35));
  }
  // Cliffs: a dark face below each ridge, a lit rocky top, a bright rim on the sun's side.
  const rock = pattern(g, tex.rock, TILE.rock);
  const path = (pts, dx = 0, dz = 0) => {
    g.beginPath();
    pts.forEach(([x, z], k) => (k ? g.lineTo(x + dx, z + dz) : g.moveTo(x + dx, z + dz)));
  };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const { pts, w } of RIDGES) {
    path(pts, 0.9, 2.6);
    g.lineWidth = w + 1.4;
    g.strokeStyle = 'rgba(10,6,10,0.45)';
    g.stroke();
    path(pts, 0, 1.6);
    g.lineWidth = w + 0.6;
    g.strokeStyle = rock;
    g.stroke();
    g.strokeStyle = 'rgba(20,14,18,0.55)';
    g.stroke();
    path(pts, -0.35, -0.4);
    g.lineWidth = w;
    g.strokeStyle = 'rgba(255,240,220,0.5)';
    g.stroke();
    path(pts);
    g.lineWidth = w - 0.5;
    g.strokeStyle = rock;
    g.stroke();
    g.strokeStyle = 'rgba(200,180,160,0.12)';
    g.stroke();
  }
  // Boulders on the ridges and in the bands.
  const boulder = (x, z, rad) => {
    shadow(g, x, z, rad * 1.25, rad * 0.95, 0.55);
    // A lump, flatter on top: its upper edge raised a little up the screen (it has height).
    const pts = [];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const up = Math.sin(a) < 0 ? 1.25 : 0.85;
      pts.push([x + Math.cos(a) * rad * (0.8 + r() * 0.3), z + Math.sin(a) * rad * up * (0.7 + r() * 0.3)]);
    }
    g.save();
    g.beginPath();
    pts.forEach(([px, pz], k) => (k ? g.lineTo(px, pz) : g.moveTo(px, pz)));
    g.closePath();
    g.clip();
    g.fillStyle = rock;
    g.fillRect(x - rad * 2, z - rad * 2, rad * 4, rad * 4);
    const grad = g.createLinearGradient(x - rad, z - rad, x + rad * 0.8, z + rad);
    grad.addColorStop(0, 'rgba(255,236,210,0.45)');
    grad.addColorStop(0.45, 'rgba(120,100,90,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = grad;
    g.fillRect(x - rad * 2, z - rad * 2, rad * 4, rad * 4);
    g.restore();
  };
  // The ridges built up of piled rocks, back to front, so each sits on the one behind.
  const pile = [];
  for (const { pts, w } of RIDGES) {
    for (const [x, z] of pts) {
      for (let n = 0; n < 3; n++) pile.push([x + (r() - 0.5) * w * 0.75, z + (r() - 0.5) * w * 0.6, w * (0.18 + r() * 0.2)]);
    }
  }
  pile.sort((a, b) => a[1] - b[1]);
  for (const [x, z, rad] of pile) boulder(x, z, rad);
  for (const [x, z, rad] of ROCKS) boulder(x, z, rad);
  const st = sprites?.stills ?? {};
  // The camp's buildings.
  const place = (key, x, z) => {
    if (!st[key]) return;
    shadow(g, x, z, st[key].w * 0.55, st[key].w * 0.4, 0.45);
    stamp(g, st[key], x, z);
  };
  place('pad', PAD.x, PAD.z);
  place('forge', FORGE.x, FORGE.z);
  place('barracks', BARRACKS.x, BARRACKS.z);
  place('armory', ARMORY.x, ARMORY.z);
  place('cargo', 40, 30);
  place('cargo', 42, 4);
  place('solar', 22, 3);
  place('solar', 28, 3);
  place('turbine', 4, 5);
  place('lights', 46, 2);
  place('lights', 2, 35);
  // Graves, bones and dead trees across the land (not on the ridges or the buildings), back to front.
  const grid = new Grid();
  const bits = [];
  const kinds = ['treeL', 'treeM', 'treeS', 'treeS', 'stone', 'stone', 'marker', 'marker', 'grave', 'ribs', 'bone', 'bone', 'fence', 'lantern', 'coffin', 'pumpkin'];
  for (let k = 0; k < 520; k++) {
    const x = 4 + r() * (SIZE - 8);
    const z = 4 + r() * (SIZE - 8);
    if ((x < BASE.x1 + 6 && z < BASE.z1 + 6) || grid.blocked(x, z) || grid.blocked(x + 1.5, z) || grid.blocked(x - 1.5, z)) continue;
    bits.push([x, z, kinds[Math.floor(r() * kinds.length)], r() < 0.5]);
  }
  bits.sort((a, b) => a[1] - b[1]);
  for (const [x, z, key, flip] of bits) {
    const s = st[key];
    if (!s) continue;
    if (key.startsWith('tree')) shadow(g, x + 0.8, z + 0.6, s.w * 0.45, s.w * 0.25, 0.4);
    else shadow(g, x, z, s.w * 0.45, s.w * 0.3, 0.35);
    stamp(g, s, x, z, 1, flip);
  }
  return c;
}

/** The blight round one of the dead's buildings: dark purple ground, veined. */
export function blightFor(radius, seed) {
  const n = 192;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  const r = rng(seed);
  g.translate(n / 2, n / 2);
  for (let k = 0; k < 26; k++) {
    const a = r() * Math.PI * 2;
    const d = r() * n * 0.28;
    const rad = n * (0.1 + r() * 0.16);
    const grad = g.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0, Math.cos(a) * d, Math.sin(a) * d, rad);
    grad.addColorStop(0, 'rgba(48,18,52,0.55)');
    grad.addColorStop(0.7, 'rgba(60,24,64,0.35)');
    grad.addColorStop(1, 'rgba(60,24,64,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, rad, 0, Math.PI * 2);
    g.fill();
  }
  // Veins, glowing faintly.
  g.lineCap = 'round';
  for (let k = 0; k < 12; k++) {
    let a = r() * Math.PI * 2;
    let x = 0;
    let y = 0;
    g.beginPath();
    g.moveTo(0, 0);
    for (let s = 0; s < 7; s++) {
      a += (r() - 0.5) * 0.9;
      x += Math.cos(a) * n * 0.055;
      y += Math.sin(a) * n * 0.055;
      g.lineTo(x, y);
    }
    g.strokeStyle = 'rgba(150,60,170,0.35)';
    g.lineWidth = 1.6;
    g.stroke();
  }
  return { canvas: c, size: radius * 3.4 };
}

/** The remains things leave: a bone pile, rubble and scorch. */
export function remains(land, sprites, x, z, kind) {
  const g = land.getContext('2d');
  g.save();
  g.scale(PX, PX);
  if (kind === 'building') {
    const grad = g.createRadialGradient(x, z, 0, x, z, 4.5);
    grad.addColorStop(0, 'rgba(20,14,14,0.65)');
    grad.addColorStop(1, 'rgba(20,14,14,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, z, 4.5, 0, Math.PI * 2);
    g.fill();
    const r = rng(Math.round(x * 31 + z * 17));
    for (let k = 0; k < 14; k++) {
      g.fillStyle = `rgb(${90 + r() * 40},${84 + r() * 30},${80 + r() * 30})`;
      const s = 0.3 + r() * 0.7;
      g.fillRect(x + (r() - 0.5) * 6, z + (r() - 0.5) * 5, s, s * 0.7);
    }
  } else if (kind === 'troop') {
    g.fillStyle = 'rgba(90,10,10,0.45)';
    g.beginPath();
    g.ellipse(x, z, 0.7, 0.45, 0.3, 0, Math.PI * 2);
    g.fill();
  } else if (sprites?.stills?.ribs) {
    stamp(g, sprites.stills[Math.round(x + z) % 2 ? 'ribs' : 'bone'], x, z, 0.75);
  }
  g.restore();
}

/* ------------------------------------------------------------- per frame */

/** Which of the five drawn ways round faces `a` (0 = south, π/2 = east), and whether to mirror it. */
function dirOf(a) {
  const d = (((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8);
  return d <= 4 ? [d, false] : [8 - d, true];
}

function frame(g, sheet, row, col, x, z, k, scale, flip) {
  const s = (k * scale) / sheet.ppm;
  const c = sheet.cell;
  g.save();
  g.translate(x, z);
  g.scale(flip ? -s : s, s);
  g.drawImage(sheet.atlas, col * c, row * c, c, c, -sheet.anchor.x, -sheet.anchor.y, c, c);
  g.restore();
}

/**
 * Draw the world (in metres, on a context already scaled and moved for the
 * camera): blight, shadows, then every building, guard and soldier from
 * the back to the front.
 */
export function drawWorld(view, g, state, dt, seen) {
  const sp = view.sprites;
  const k = 1; // the context is in metres
  const down = new Set(state.down);
  const items = [];
  // Blight under the dead's buildings that stand (and shrinking under the fallen).
  view.blights ??= new Map();
  for (const s of STRUCTURES) {
    if (!seen(s.x, s.z, 14)) continue;
    const def = BUILDINGS[s.type];
    let fade = 1;
    if (down.has(s.id)) {
      const f = view.falling.get(s.id);
      if (f == null || f > 2.5) continue;
      fade = 1 - f / 2.5;
    }
    let b = view.blights.get(s.id);
    if (!b) view.blights.set(s.id, (b = blightFor(def.r + (def.key || def.heart ? 3 : 1.5), s.id)));
    g.globalAlpha = fade;
    g.drawImage(b.canvas, s.x - b.size / 2, s.z - b.size / 2, b.size, b.size);
    g.globalAlpha = 1;
    items.push({ z: s.z, draw: () => building(view, g, s, state, down.has(s.id)) });
  }
  // The camp's guns.
  for (const e of state.ents) if (e.k === 'gun' && seen(e.x, e.z)) items.push({ z: e.z, draw: () => view._gun(g, e) });
  // Sleeping guards where they stand.
  const awake = new Set(state.ents.map((e) => e.i));
  for (const gd of GUARDS) {
    if (down.has(gd.id) || awake.has(gd.id) || !seen(gd.x, gd.z)) continue;
    const e = { i: gd.id, kind: gd.kind, x: gd.x, z: gd.z, a: (gd.id * 2.3) % 6.28, tier: gd.tier, act: 'sleep', aa: 0 };
    items.push({ z: e.z, draw: () => foe(view, g, e, dt) });
  }
  for (const e of state.ents) {
    if (!seen(e.x, e.z)) continue;
    if (e.k === 'foe') items.push({ z: e.z, draw: () => foe(view, g, e, dt) });
    else if (e.k === 'troop') items.push({ z: e.z, draw: () => troop(view, g, e, dt) });
  }
  for (const d of view.dying) {
    items.push({ z: d.e.z, draw: () => {
      g.globalAlpha = Math.max(0, 1 - d.t / 1.2);
      if (d.e.k === 'troop') troop(view, g, d.e, 0, true);
      else foe(view, g, d.e, 0, true);
      g.globalAlpha = 1;
    } });
  }
  // Shadows first, all of them; then the bodies back to front.
  items.sort((a, b) => a.z - b.z);
  view.shadowPass = true;
  for (const it of items) it.draw();
  view.shadowPass = false;
  for (const it of items) it.draw();
  void k;
  void sp;
}

function building(view, g, s, state, falling) {
  const st = view.sprites.stills[s.type];
  const def = BUILDINGS[s.type];
  const pulse = Math.sin(view.time * 2.4 + s.id) * 0.5 + 0.5;
  if (view.shadowPass) {
    shadow(g, s.x, s.z, (st?.w ?? def.r * 2) * 0.62, (st?.w ?? def.r * 2) * 0.42, 0.5);
    return;
  }
  if (falling) {
    const f = view.falling.get(s.id) ?? 0;
    g.save();
    g.globalAlpha = Math.max(0, 1 - f / 1.2);
    g.translate(s.x, s.z);
    g.scale(1 + f * 0.1, Math.max(0.05, 1 - f * 0.7));
    g.translate(-s.x, -s.z);
    if (st) stamp(g, st, s.x, s.z);
    g.restore();
    return;
  }
  if (!st) return view._building(g, s, state);
  stamp(g, st, s.x, s.z);
  // Light and souls.
  const glow = { spire: '#c080ff', crypt: '#8a50ff', ossuary: '#ff3848', node: '#40e0ff', shrine: '#ffb030', heart: '#ff2040', cache: '#ffd060' }[s.type];
  if (glow) {
    const top = s.type === 'spire' ? 4.6 * LIFT : s.type === 'heart' ? 9 * LIFT : s.type === 'shrine' ? 5.6 * LIFT : s.type === 'node' ? 4 * LIFT : 1.5;
    view._glow(g, s.x, s.z - top, s.type === 'heart' ? 7 : 2.4, glow, 0.35 + pulse * 0.35);
    if (s.type === 'node' || s.type === 'shrine' || s.type === 'heart') {
      const size = s.type === 'heart' ? 1.8 : 0.8;
      const bob = Math.sin(view.time * 2 + s.id) * 0.3;
      g.save();
      g.translate(s.x, s.z - top - 1 + bob);
      g.scale(1, 1.5);
      g.rotate(view.time * 0.7);
      const grad = g.createLinearGradient(-size, -size, size, size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, glow);
      grad.addColorStop(1, '#200818');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(0, -size);
      g.lineTo(size * 0.7, 0);
      g.lineTo(0, size);
      g.lineTo(-size * 0.7, 0);
      g.fill();
      g.restore();
    }
  }
  if (s.type === 'heart' && state.keysLeft > 0) {
    g.save();
    g.translate(s.x, s.z - 2);
    g.scale(1, 0.8);
    const grad = g.createRadialGradient(0, 0, 5, 0, 0, 10);
    grad.addColorStop(0, 'rgba(150,70,255,0.04)');
    grad.addColorStop(0.85, `rgba(170,90,255,${0.18 + pulse * 0.12})`);
    grad.addColorStop(1, 'rgba(170,90,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, 10, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

function troop(view, g, e, dt, dead = false) {
  const def = RANKS[e.rank];
  const sheet = view.sprites.soldiers?.[e.rank];
  if (!sheet) return view.shadowPass ? null : view._troop(g, e, dt, dead);
  const p = view._pose(e, dead ? 0 : dt);
  const scale = def.scale;
  if (view.shadowPass) {
    shadow(g, e.x, e.z, 0.6 * scale, 0.35 * scale);
    // The team's colour on the ground, the way it is told apart.
    g.strokeStyle = view.selected.has(e.i) ? '#7dffb0' : COLORS[e.o];
    g.globalAlpha = view.selected.has(e.i) ? 0.95 : 0.6;
    g.lineWidth = view.selected.has(e.i) ? 0.12 : 0.09;
    g.beginPath();
    g.ellipse(e.x, e.z, 0.62 * scale, 0.42 * scale, 0, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
    return;
  }
  const [row, flip] = dirOf(p.a);
  const run = e.act === 'run';
  const col = run ? sheet.index.run[Math.floor(view.time * 12 + e.i) % sheet.index.run.length] : sheet.index.idle[0];
  if (def.tier >= 3) view._glow(g, e.x, e.z - 0.8, 1.8 * scale, e.rank === 'paragon' ? '#ffd060' : '#a080ff', 0.35);
  frame(g, sheet, row, col, e.x, e.z, 1, scale, flip);
  // A flash at the muzzle when it fires.
  if (p.swing > 0.55 && !dead) {
    const fx = e.x + Math.sin(p.a) * 0.75 * scale;
    const fz = e.z + Math.cos(p.a) * 0.75 * scale * Math.sin(ELEVATION) - 1.25 * scale * LIFT;
    view._glow(g, fx, fz, 0.7 + def.tier * 0.15, '#fff0a0', 0.9);
  }
  if (def.tier >= 1 && !dead) {
    g.strokeStyle = def.tier >= 3 ? '#ffd060' : '#ffffff';
    g.lineWidth = 0.07;
    for (let n = 0; n < def.tier; n++) {
      const y = e.z - 2.2 * scale * LIFT - n * 0.2;
      g.beginPath();
      g.moveTo(e.x - 0.22, y + 0.12);
      g.lineTo(e.x, y);
      g.lineTo(e.x + 0.22, y + 0.12);
      g.stroke();
    }
  }
}

function foe(view, g, e, dt, dead = false) {
  const def = foeDef(e.kind);
  const guardian = GUARDIANS[e.kind];
  const baseKind = guardian ? GUARD_BODY[def.body] : e.kind;
  const sheet = view.sprites.dead?.[baseKind];
  if (!sheet) return view.shadowPass ? null : view._foe(g, e, dt, dead);
  const p = view._pose(e, dead ? 0 : dt);
  const scale = (guardian ? def.size / FOES[baseKind].size : 1) * (guardian ? 1 : 1 + ((e.tier ?? 1) - 1) * 0.06);
  if (view.shadowPass) {
    shadow(g, e.x, e.z, 0.32 * def.size, 0.2 * def.size);
    if (guardian) {
      g.strokeStyle = guardian.tint;
      g.globalAlpha = 0.6;
      g.lineWidth = 0.15;
      g.beginPath();
      g.ellipse(e.x, e.z, 0.4 * def.size, 0.26 * def.size, 0, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    return;
  }
  const [row, flip] = dirOf(p.a);
  let col = sheet.index.idle[0];
  if (p.swing > 0) col = sheet.index.attack[Math.min(2, Math.floor((1 - p.swing) * 3))];
  else if (e.act === 'run') col = sheet.index.walk[Math.floor(view.time * (8 * def.speed) / 4.4 + e.i) % sheet.index.walk.length];
  if (guardian) view._glow(g, e.x, e.z - def.size * 0.4, def.size * 0.9, guardian.tint, 0.45 + Math.sin(view.time * 3) * 0.1);
  else if ((e.tier ?? 1) >= 3) view._glow(g, e.x, e.z - def.size * 0.35, def.size * 0.6, (e.tier ?? 1) >= 4 ? '#ff3050' : '#8040ff', 0.3);
  if (guardian) {
    // A guardian: its kind's body, bigger and washed in its colour.
    const c = sheet.cell;
    view.tintCanvas ??= document.createElement('canvas');
    const t = view.tintCanvas;
    t.width = t.height = c;
    const tg = t.getContext('2d');
    tg.drawImage(sheet.atlas, col * c, row * c, c, c, 0, 0, c, c);
    tg.globalCompositeOperation = 'source-atop';
    tg.fillStyle = guardian.tint;
    tg.globalAlpha = 0.4;
    tg.fillRect(0, 0, c, c);
    const s = scale / sheet.ppm;
    g.save();
    g.translate(e.x, e.z);
    g.scale(flip ? -s : s, s);
    g.drawImage(t, -sheet.anchor.x, -sheet.anchor.y);
    g.restore();
  } else frame(g, sheet, row, col, e.x, e.z, 1, scale, flip);
  if (e.act === 'sleep' && Math.sin(view.time * 1.5 + e.i) > 0.7) {
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.font = '700 0.6px system-ui, sans-serif';
    g.fillText('z', e.x + 0.4, e.z - def.size * LIFT - ((view.time + e.i) % 1) * 0.4);
  }
}

export { LIFT, FORGE_REACH };
