/**
 * The mountain picker as a toy world map: rounded continents on a blue sea,
 * a pin on every famous mountain, the made-up Snowpuff Islands in their own
 * corner. Region tabs zoom the map (the view glides), difficulty chips filter
 * the pins, and the chosen pin's card shows the mountain's silhouette, its
 * local name, its difficulty, a true kid-friendly fact and your best time.
 *
 * The map is plain SVG (no 3D); the outlines are hand-made and stylised.
 */
import { MOUNTAINS, REGIONS } from './mountains.js';
import { profile } from './landmarks.js';

const W = 1000, H = 500;
/** Equirectangular: (lon, lat) → map units. */
export const project = (lon, lat) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];

// rough, rounded continent outlines (lon, lat): a toy map, not an atlas
const LANDS = [
  [[-168, 66], [-162, 70], [-140, 70], [-125, 72], [-95, 72], [-80, 74], [-62, 66], [-55, 52], [-66, 45], [-70, 41], [-76, 35], [-81, 31], [-80, 25], [-90, 29], [-97, 26], [-97, 20], [-91, 16], [-83, 9], [-79, 8], [-85, 12], [-92, 15], [-105, 20], [-112, 30], [-117, 32], [-123, 38], [-125, 48], [-133, 56], [-148, 60], [-160, 58], [-166, 60]],
  [[-50, 60], [-42, 62], [-22, 70], [-20, 80], [-60, 82], [-72, 78], [-58, 72]],
  [[-79, 8], [-72, 12], [-62, 10], [-50, 0], [-35, -6], [-39, -15], [-48, -26], [-58, -36], [-65, -42], [-68, -52], [-74, -52], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [10, 57], [5, 60], [10, 63], [20, 70], [30, 71], [40, 68], [45, 60], [40, 48], [30, 45], [28, 41], [22, 40], [19, 42], [14, 45], [12, 44], [16, 40], [10, 44], [3, 43], [-5, 36]],
  [[-6, 50], [1, 51], [2, 53], [-2, 57], [-5, 58], [-6, 55]],
  [[-24, 64], [-14, 64], [-14, 66], [-22, 66.5]],
  [[-17, 15], [-17, 21], [-10, 30], [-6, 35], [10, 37], [20, 32], [32, 31], [34, 28], [43, 12], [51, 11], [42, -2], [40, -10], [40, -16], [35, -24], [32, -29], [20, -35], [18, -30], [12, -17], [13, -6], [9, 4], [-8, 5], [-15, 10]],
  [[44, -25], [48, -25], [50, -15], [49, -12], [44, -17]],
  [[26, 40], [36, 36], [35, 32], [43, 13], [55, 22], [57, 26], [66, 25], [72, 20], [77, 8], [80, 15], [88, 22], [92, 20], [98, 16], [100, 13], [104, 10], [106, 17], [108, 21], [117, 24], [121, 31], [122, 38], [121, 40], [125, 40], [129, 42], [135, 44], [140, 50], [142, 54], [155, 60], [163, 60], [170, 66], [180, 68], [180, 72], [140, 74], [110, 77], [80, 73], [60, 70], [50, 67], [45, 60], [40, 48], [30, 45], [28, 41]],
  [[130, 31], [132, 34], [135, 34], [140, 35], [141, 38], [142, 42], [141, 45], [139, 42], [136, 36]],
  // the Korean peninsula, and Jeju island off its tip
  [[124.6, 40.0], [126.0, 38.0], [126.6, 37.0], [126.2, 35.2], [126.6, 34.4], [127.7, 34.7], [129.3, 35.2], [129.5, 36.6], [128.6, 38.4], [127.6, 39.8], [129.8, 41.0], [129.6, 42.4], [128.0, 42.0], [126.0, 41.4]],
  [[126.15, 33.25], [126.95, 33.22], [127.0, 33.55], [126.25, 33.52]],
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [144, -38], [135, -35], [129, -32], [115, -34]],
  [[172, -41], [175, -37], [178, -38], [174, -42], [170, -46], [167, -46]]
];

/** The made-up islands' corner of the map (a dashed inset in the South Pacific). */
const ISLES = { x: 60, y: 330, w: 220, h: 120 };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Smooth closed path through points (a soft, toy-like coastline). */
function blob(pts) {
  const p = pts.map(([lon, lat]) => project(lon, lat));
  const n = p.length;
  const mid = (a, b) => `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  let d = `M${mid(p[n - 1], p[0])}`;
  for (let i = 0; i < n; i++) d += ` Q${p[i][0].toFixed(1)} ${p[i][1].toFixed(1)} ${mid(p[i], p[(i + 1) % n])}`;
  return `${d}Z`;
}

/** Where a mountain's pin goes. */
export function pinXY(m) {
  if (m.coords) return project(m.coords.lon, m.coords.lat);
  const mp = m.map ?? { x: 0.5, y: 0.5 };
  return [ISLES.x + mp.x * ISLES.w, ISLES.y + mp.y * ISLES.h];
}

/** A region's view box in map units. */
export function regionView(id) {
  if (id === 'snowpuff') return [ISLES.x - 30, ISLES.y - 25, ISLES.w + 60, ISLES.h + 50];
  const v = REGIONS[id]?.view ?? [0, 0, 1, 1];
  return [v[0] * W, v[1] * H, v[2] * W, v[3] * H];
}

/** A mountain's silhouette as an SVG path in a w × h box (from the same shape the 3D uses). */
export function silhouette(m, w = 120, h = 60) {
  const fn = m.peak ? profile(m.peak.shape) : (x) => Math.pow(Math.max(0, 1 - Math.abs(x)), 1.3) * (0.7 + (m.difficulty ?? 1) * 0.1);
  let d = `M0 ${h}`;
  for (let i = 0; i <= 60; i++) {
    const x = -1 + (i / 60) * 2;
    let y = 0;
    for (const z of [-0.2, 0, 0.2]) y = Math.max(y, fn(x, z));
    d += ` L${((i / 60) * w).toFixed(1)} ${(h - y * h * 0.92).toFixed(1)}`;
  }
  return `${d} L${w} ${h}Z`;
}

const stars = (n) => `<span aria-label="difficulty ${n} of 3">${'❄'.repeat(n)}<i>${'❄'.repeat(3 - n)}</i></span>`;

/**
 * Build the picker into `host`. Returns { el, select(id), dispose() }.
 * `onPick(id)`, `onGo()`; `best` the saved best times; `fmt` formats a time.
 */
export function worldMap(host, { picked, best = {}, onPick, onGo, fmt = (t) => t.toFixed(1), ordinal = (n) => n, footer = '' }) {
  const root = document.createElement('div');
  root.className = 'sp-world';
  const pins = MOUNTAINS.map((m) => {
    const [x, y] = pinXY(m);
    return `<g class="sp-pin d${m.difficulty}" data-pin="${m.id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" tabindex="0" role="button" aria-label="${esc(m.name)}">
      <circle class="sp-pin__halo" r="9"/><path class="sp-pin__peak" d="M-6 3 L-1.5 -5 L0.5 -2 L2 -4 L6 3Z"/><text class="sp-pin__label" y="-10">${esc(m.name)}</text></g>`;
  }).join('');
  root.innerHTML = `
    <div class="sp-world__bar">
      <div class="sp-world__tabs" role="tablist">${Object.entries(REGIONS).map(([id, r]) => `<button class="sp-chip" data-region="${id}">${esc(r.name)}</button>`).join('')}</div>
      <div class="sp-world__filters"><button class="sp-chip is-on" data-diff="0">All</button><button class="sp-chip" data-diff="1">Easy ❄</button><button class="sp-chip" data-diff="2">Medium ❄❄</button><button class="sp-chip" data-diff="3">Hard ❄❄❄</button></div>
    </div>
    <svg class="sp-world__map" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-label="World map of mountains">
      <defs><pattern id="sp-waves" width="14" height="8" patternUnits="userSpaceOnUse"><path d="M0 6 Q3.5 2 7 6 T14 6" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="1"/></pattern></defs>
      <rect x="-500" y="-500" width="${W + 1000}" height="${H + 1000}" class="sp-world__sea"/>
      <rect x="-500" y="-500" width="${W + 1000}" height="${H + 1000}" fill="url(#sp-waves)"/>
      <g class="sp-world__land">${LANDS.map((l) => `<path d="${blob(l)}"/>`).join('')}</g>
      <g class="sp-world__isles"><rect x="${ISLES.x}" y="${ISLES.y}" width="${ISLES.w}" height="${ISLES.h}" rx="18"/>
        <path d="${blob([[-160, -32], [-153, -30], [-150, -34], [-156, -37]])}"/><path d="${blob([[-142, -27], [-134, -25], [-131, -30], [-139, -32]])}"/><path d="${blob([[-121, -34], [-114, -32], [-112, -38], [-119, -39]])}"/>
        <text x="${ISLES.x + ISLES.w / 2}" y="${ISLES.y + ISLES.h - 10}">Snowpuff Islands (made up!)</text></g>
      <g class="sp-world__pins">${pins}</g>
    </svg>
    <div class="sp-card sp-world__card" data-world-card></div>`;
  host.append(root);
  const svg = root.querySelector('svg');
  const card = root.querySelector('[data-world-card]');
  let region = 'world', diff = 0, current = picked;
  let view = [0, 0, W, H], anim = null;
  const glide = (to) => {
    cancelAnimationFrame(anim);
    const from = view.slice(), t0 = performance.now();
    const step = (t) => {
      const u = Math.min(1, (t - t0) / 450), e = u * u * (3 - 2 * u);
      view = from.map((v, i) => v + (to[i] - v) * e);
      svg.setAttribute('viewBox', view.map((v) => v.toFixed(1)).join(' '));
      // pins keep their size on screen whatever the zoom
      svg.style.setProperty('--pin', (view[2] / W).toFixed(3));
      if (u < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
  const visible = () => MOUNTAINS.filter((m) => (diff ? m.difficulty === diff : true) && (region === 'world' || m.region === region));
  const render = () => {
    for (const b of root.querySelectorAll('[data-region]')) b.classList.toggle('is-on', b.dataset.region === region);
    for (const b of root.querySelectorAll('[data-diff]')) b.classList.toggle('is-on', Number(b.dataset.diff) === diff);
    const vis = new Set(visible().map((m) => m.id));
    for (const g of root.querySelectorAll('[data-pin]')) {
      g.classList.toggle('is-off', !vis.has(g.dataset.pin));
      g.classList.toggle('is-on', g.dataset.pin === current);
    }
    const m = MOUNTAINS.find((x) => x.id === current) ?? MOUNTAINS[0];
    const b = best[m.id];
    // a crater lake shows on the card (Cheonji, Baengnokdam): a deep-blue pool in the top, mirroring the walls
    const lakeY = m.peak?.lake ? 60 - profile(m.peak.shape)(0, 0) * 60 * 0.92 : 0;
    const lake = m.peak?.lake ? `<ellipse cx="60" cy="${(lakeY + 1.5).toFixed(1)}" rx="${m.peak.shape === 'caldera' ? 15 : 7}" ry="2.6" fill="${m.peak.lake}"/><ellipse cx="57" cy="${(lakeY + 1).toFixed(1)}" rx="5" ry="0.7" fill="#9cc6f2" opacity=".8"/>` : '';
    card.innerHTML = `<svg class="sp-world__sil" viewBox="0 0 120 60" aria-hidden="true"><path d="${silhouette(m)}"/>${lake}</svg>
      <h2>${esc(m.name)}</h2><div class="sp-world__local">${esc(m.local ?? '')}</div>
      <div class="sp-diff">${stars(m.difficulty)}</div>
      <p class="sp-world__fact">${esc(m.fact ?? '')}</p>
      <p class="sp-world__blurb">${esc(m.blurb)}</p>
      <div class="sp-best">${b ? `Best: ${fmt(b.time)} · ${ordinal(b.place)}` : 'Not raced yet'}</div>${typeof footer === 'function' ? footer(m) : footer}`;
  };
  const select = (id, { zoom = false } = {}) => {
    current = id;
    onPick?.(id);
    const m = MOUNTAINS.find((x) => x.id === id);
    if (zoom && m && region !== 'world' && m.region !== region) {
      region = m.region;
      glide(regionView(region));
    }
    render();
  };
  root.addEventListener('click', (e) => {
    const pin = e.target.closest('[data-pin]');
    if (pin) return select(pin.dataset.pin);
    const r = e.target.closest('[data-region]');
    if (r) {
      region = r.dataset.region;
      glide(regionView(region));
      const vis = visible();
      if (vis.length && !vis.some((m) => m.id === current)) select(vis[0].id);
      return render();
    }
    const d = e.target.closest('[data-diff]');
    if (d) {
      diff = Number(d.dataset.diff);
      const vis = visible();
      if (vis.length && !vis.some((m) => m.id === current)) select(vis[0].id);
      render();
    }
  });
  root.addEventListener('dblclick', (e) => e.target.closest('[data-pin]') && onGo?.());
  root.addEventListener('keydown', (e) => {
    const pin = e.target.closest?.('[data-pin]');
    if (pin && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      select(pin.dataset.pin);
    }
  });
  // start zoomed on the chosen mountain's region
  const start = MOUNTAINS.find((m) => m.id === picked);
  region = start?.region && start.region !== 'snowpuff' ? start.region : 'world';
  view = regionView(region);
  svg.setAttribute('viewBox', view.join(' '));
  svg.style.setProperty('--pin', (view[2] / W).toFixed(3));
  render();
  return {
    el: root,
    select,
    /** ← → step through the mountains on show. */
    step(dir) {
      const vis = visible();
      if (!vis.length) return;
      const i = Math.max(0, vis.findIndex((m) => m.id === current));
      select(vis[(i + dir + vis.length) % vis.length].id);
    },
    dispose() {
      cancelAnimationFrame(anim);
      root.remove();
    }
  };
}
