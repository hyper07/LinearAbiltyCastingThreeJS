/**
 * A cover for a game's card, drawn from what the game is (its card's `look`):
 * the sky by time of day, the ground's colour, a skyline that matches the
 * world (pines, peaks, houses, walls, ruins, gravestones, domes, palms…), fog,
 * and the genre's badge. An SVG string, the same every time for the same game.
 */

const SKY = {
  day: ['#4e9be6', '#bfe3ff'],
  dawn: ['#6c74b4', '#ffc49a'],
  dusk: ['#3a2b63', '#f2875a'],
  night: ['#070d24', '#24345f']
};
const GROUND = {
  grass: '#4f8f3a', snow: '#e6eef6', sand: '#e1c07a', rock: '#7b7e86', dirt: '#8a6a45', mud: '#5e4a35',
  gravel: '#9a948a', moss: '#5f7d3a', ice: '#bfe3f2', lava: '#3a2420', paving: '#8d8f96', asphalt: '#3d4046'
};
export const GENRE_ICONS = {
  survival: '🛡️', 'battle-royale': '🌀', 'squad-royale': '🤝', 'boss-hunt': '🐉', 'monster-hunt': '⚔️', quest: '📜', 'dungeon-crawl': '🗝️', study: '📚', 'calm-study': '🌱', 'market-sim': '📈', 'work-sim': '💼', strategy: '♜'
};

/** A small seeded random, so a game's skyline never changes between visits. */
function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`;
};

/** What stands on the horizon, from the world's theme or its edge. */
function skyline(kind, r, color) {
  const parts = [];
  const base = 118;
  if (kind === 'forest') {
    for (let x = -10; x < 330; x += 14 + r() * 10) {
      const h = 28 + r() * 34;
      parts.push(`<path d="M${x} ${base}L${x + 10} ${base - h}L${x + 20} ${base}Z"/>`);
    }
  } else if (kind === 'mountains' || kind === 'cliffs' || kind === 'snow') {
    let d = `M-10 ${base}`;
    for (let x = -10; x < 340; x += 30 + r() * 30) d += `L${x + 15} ${base - 30 - r() * 50}L${x + 35} ${base - 10 - r() * 15}`;
    parts.push(`<path d="${d}L340 ${base}Z"/>`);
  } else if (kind === 'buildings' || kind === 'city' || kind === 'industrial') {
    for (let x = -5; x < 330; x += 22 + r() * 14) {
      const w = 16 + r() * 14;
      const h = 24 + r() * 52;
      parts.push(`<rect x="${x}" y="${base - h}" width="${w}" height="${h}"/>`);
      for (let wy = base - h + 5; wy < base - 6; wy += 9) if (r() > 0.45) parts.push(`<rect x="${x + 4}" y="${wy}" width="3" height="3" fill="#ffd77a" opacity=".8"/>`);
    }
  } else if (kind === 'walls' || kind === 'medieval' || kind === 'dungeon') {
    parts.push(`<rect x="-5" y="${base - 26}" width="340" height="26"/>`);
    for (let x = -5; x < 330; x += 14) parts.push(`<rect x="${x}" y="${base - 33}" width="8" height="8"/>`);
    const t = 40 + r() * 200;
    parts.push(`<rect x="${t}" y="${base - 62}" width="26" height="62"/><path d="M${t - 4} ${base - 62}L${t + 13} ${base - 84}L${t + 30} ${base - 62}Z"/>`);
  } else if (kind === 'ruins' || kind === 'desert') {
    if (kind === 'desert') parts.push(`<path d="M${170 + r() * 60} ${base}l45 -50l45 50Z"/>`);
    for (let x = 10; x < 320; x += 26 + r() * 30) {
      const h = 18 + r() * 40;
      parts.push(`<rect x="${x}" y="${base - h}" width="8" height="${h}"/>`);
      if (r() > 0.5) parts.push(`<rect x="${x - 3}" y="${base - h - 4}" width="14" height="4"/>`);
    }
  } else if (kind === 'halloween') {
    for (let x = 5; x < 320; x += 20 + r() * 16) parts.push(`<path d="M${x} ${base}v-14a7 7 0 0 1 14 0v14Z"/>`);
    const tx = 60 + r() * 180;
    parts.push(`<path d="M${tx} ${base}v-46m0 16l-12 -10m12 2l10 -12" stroke="${color}" stroke-width="4" fill="none" stroke-linecap="round"/>`);
  } else if (kind === 'scifi') {
    for (let x = 0; x < 330; x += 50 + r() * 30) {
      parts.push(`<path d="M${x} ${base}a26 22 0 0 1 52 0Z"/>`);
      if (r() > 0.4) parts.push(`<rect x="${x + 24}" y="${base - 50}" width="3" height="30"/><circle cx="${x + 25.5}" cy="${base - 52}" r="3" fill="#7fd6ff"/>`);
    }
  } else if (kind === 'coast') {
    for (let x = 20; x < 320; x += 60 + r() * 60) {
      parts.push(`<path d="M${x} ${base}q4 -30 -2 -46" stroke="${color}" stroke-width="4" fill="none"/>`);
      parts.push(`<path d="M${x - 2} ${base - 46}q-16 -2 -22 8M${x - 2} ${base - 46}q16 -2 22 8M${x - 2} ${base - 46}q-6 -12 -18 -12M${x - 2} ${base - 46}q6 -12 18 -12" stroke="${color}" stroke-width="3" fill="none"/>`);
    }
  } else if (kind === 'farm') {
    parts.push(`<path d="M${60 + r() * 140} ${base}v-28l20 -16l20 16v28Z"/>`);
    let d = `M-10 ${base}`;
    for (let x = -10; x < 340; x += 60) d += `Q${x + 30} ${base - 22 - r() * 12} ${x + 60} ${base}`;
    parts.push(`<path d="${d}Z"/>`);
  } else {
    let d = `M-10 ${base}`;
    for (let x = -10; x < 340; x += 80) d += `Q${x + 40} ${base - 24 - r() * 20} ${x + 80} ${base}`;
    parts.push(`<path d="${d}Z"/>`);
  }
  return `<g fill="${color}">${parts.join('')}</g>`;
}

/**
 * @param {{ id: string, card: object }} game
 * @returns {string} SVG markup (320×180)
 */
export function coverSvg(game) {
  if (game.card?.cover === 'market') return marketCover(game);
  if (game.card?.cover === 'work') return workCover(game);
  if (game.card?.cover === 'rts') return rtsCover(game);
  const look = game.card?.look ?? {};
  const r = rng(game.id);
  // Gradient ids must be plain: `official:frost-hollow` would break url(#…).
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  const [top, bottom] = SKY[look.timeOfDay] ?? SKY.day;
  const ground = GROUND[look.ground] ?? GROUND.grass;
  const night = look.timeOfDay === 'night';
  const kind = look.theme && look.theme !== 'ruins' ? look.theme : look.edge ?? 'open';
  const far = shade(bottom, night ? 1.6 : 0.62);
  const near = shade(ground, 0.55);
  const fog = Math.min(0.55, (look.fog ?? 0.3) * 0.6);
  const sunX = 40 + r() * 240;
  const sunY = look.timeOfDay === 'day' ? 34 : 70;
  const stars = night ? Array.from({ length: 22 }, () => `<circle cx="${(r() * 320).toFixed(1)}" cy="${(r() * 80).toFixed(1)}" r="${(0.5 + r()).toFixed(1)}"/>`).join('') : '';
  const lava = look.ground === 'lava' ? `<path d="M0 150 Q80 140 160 152 T320 148 V158 Q240 162 160 156 T0 160Z" fill="#ff6a1f" opacity=".9"/>` : '';
  const water = kind === 'coast' ? `<rect y="112" width="320" height="10" fill="#4fa3d1" opacity=".8"/>` : '';
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
      <linearGradient id="fog-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="${fog}"/></linearGradient>
    </defs>
    <rect width="320" height="180" fill="url(#sky-${uid})"/>
    <g fill="#fff" opacity=".85">${stars}</g>
    <circle cx="${sunX}" cy="${sunY}" r="${night ? 11 : 15}" fill="${night ? '#f2f4ff' : look.timeOfDay === 'day' ? '#fff6c8' : '#ffd08a'}" opacity=".95"/>
    ${skyline(kind, r, far)}
    ${water}
    <path d="M0 116 Q80 104 160 114 T320 110 V180 H0Z" fill="${ground}"/>
    <path d="M0 140 Q90 128 180 140 T320 136 V180 H0Z" fill="${near}" opacity=".55"/>
    ${lava}
    <rect width="320" height="180" fill="url(#fog-${uid})"/>
  </svg>`;
}

/** The stock game's cover: a night skyline of candles and a climbing line. */
function marketCover(game) {
  const r = rng(game.id);
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  let price = 120;
  const candles = [];
  const line = [];
  for (let i = 0; i < 26; i++) {
    const open = price;
    price = Math.max(40, Math.min(170, price + (r() - 0.38) * 18));
    const x = 14 + i * 11.6;
    const up = price < open; // y grows downward: a smaller y is a higher price
    candles.push(`<rect x="${x.toFixed(1)}" y="${Math.min(open, price).toFixed(1)}" width="6" height="${Math.max(2, Math.abs(open - price)).toFixed(1)}" rx="1" fill="${up ? '#3fbf7f' : '#ef6b6b'}" opacity="0.85"/>`);
    line.push(`${(x + 3).toFixed(1)},${price.toFixed(1)}`);
  }
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs><linearGradient id="mk-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e2238"/><stop offset="1" stop-color="#091019"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#mk-${uid})"/>
    ${[50, 90, 130].map((y) => `<line x1="0" x2="320" y1="${y}" y2="${y}" stroke="rgba(255,255,255,0.06)"/>`).join('')}
    ${candles.join('')}
    <polyline points="${line.join(' ')}" fill="none" stroke="#7fd6ff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <text x="16" y="164" fill="#e8edf3" font-family="system-ui, sans-serif" font-size="20" font-weight="800">$1,000,000</text>
  </svg>`;
}

/** Work Life's cover: an office skyline at dusk, lit windows, a briefcase badge. */
function workCover(game) {
  const r = rng(game.id);
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  const towers = [];
  let x = 0;
  while (x < 320) {
    const w = 26 + Math.floor(r() * 30);
    const h = 60 + Math.floor(r() * 100);
    const y = 180 - h;
    const windows = [];
    for (let wy = y + 8; wy < 172; wy += 12) {
      for (let wx = x + 5; wx < x + w - 6; wx += 9) if (r() > 0.45) windows.push(`<rect x="${wx}" y="${wy}" width="4" height="6" fill="#ffd27a" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`);
    }
    towers.push(`<rect x="${x}" y="${y}" width="${w - 3}" height="${h}" fill="#17243a"/>${windows.join('')}`);
    x += w;
  }
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs><linearGradient id="wk-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a5c"/><stop offset="0.6" stop-color="#c0607a"/><stop offset="1" stop-color="#f2a65a"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#wk-${uid})"/>
    ${towers.join('')}
    <text x="16" y="34" fill="#fff" font-family="system-ui, sans-serif" font-size="22" font-weight="800">💼 9 to 5</text>
  </svg>`;
}

/** Shardfront's cover: two bases across a dark field, crystals between, shots in the air. */
function rtsCover(game) {
  const r = rng(game.id);
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  const crystals = Array.from({ length: 9 }, (_, i) => {
    const x = 128 + i * 8 + r() * 6;
    const y = 112 + Math.sin(i) * 6;
    return `<path d="M${x.toFixed(1)} ${(y - 14).toFixed(1)} l5 10 -5 8 -5 -8z" fill="#7ef0ff" opacity="${(0.65 + r() * 0.35).toFixed(2)}"/>`;
  }).join('');
  const shots = Array.from({ length: 5 }, () => {
    const x = 80 + r() * 160;
    const y = 60 + r() * 40;
    return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + 14).toFixed(1)}" y2="${(y + 5).toFixed(1)}" stroke="#ffd27a" stroke-width="2" stroke-linecap="round"/>`;
  }).join('');
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs><linearGradient id="rts-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16223a"/><stop offset="1" stop-color="#2c4a2a"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#rts-${uid})"/>
    <path d="M0 120 Q80 104 160 116 T320 112 V180 H0Z" fill="#3e6230"/>
    <g fill="#8e9aa8"><rect x="22" y="96" width="44" height="30" rx="3"/><rect x="30" y="82" width="28" height="16"/><rect x="72" y="110" width="16" height="16"/></g>
    <rect x="22" y="118" width="44" height="5" fill="#3d8bff"/>
    <g fill="#5c8a3a"><rect x="262" y="88" width="8" height="38" fill="#3b2b1d"/><circle cx="266" cy="82" r="22"/><circle cx="240" cy="112" r="10"/></g>
    <circle cx="266" cy="100" r="4" fill="#ef4f4f"/>
    ${crystals}
    ${shots}
    <text x="16" y="34" fill="#fff" font-family="system-ui, sans-serif" font-size="22" font-weight="800">♜ Shardfront</text>
  </svg>`;
}
