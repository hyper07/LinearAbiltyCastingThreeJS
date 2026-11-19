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
  survival: '🛡️', 'battle-royale': '🌀', 'squad-royale': '🤝', 'boss-hunt': '🐉', 'monster-hunt': '⚔️', creatures: '🐾', action: '🔥', quest: '📜', 'dungeon-crawl': '🗝️', study: '📚', 'calm-study': '🌱', 'market-sim': '📈', 'work-sim': '💼', strategy: '♜', arena: '⚔', mmorpg: '🏰', travel: '🗺️', shooter: '🎯', racing: '🏎️', coop: '🪖', sports: '⚽', learning: '🎓', rpg: '🗡️'
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
/** Official games with a real screenshot for a cover (public/covers/<name>.jpg; scripts/covers.mjs takes most of them). */
const PHOTO_COVERS = new Set([
  'hearthvale', 'lanebreak', 'thistledown', 'stormbreak-ruins', 'frost-hollow', 'the-wyrms-graveyard', 'dragons-keep', 'saltwind-squads', 'ember-ruins', 'study-grove',
  // Taken by scripts/covers.mjs (run it again to refresh them).
  'breachline', 'bastion', 'gravepurge2d', 'seoul', 'shardfront', 'stock-market', 'work-life', 'lanternwood', 'stoneball', 'gloamreach', 'wyldhunt', 'kithvale', 'kindlewatch'
]);

/**
 * A game's cover as markup: a screenshot of the game where there is one
 * (if it fails to load, the drawn cover takes its place), else the drawn cover.
 */
export function coverHtml(game) {
  const name = String(game.id ?? '').replace(/^official:/, '');
  if (!game.official || !PHOTO_COVERS.has(name)) return coverSvg(game);
  return `<img class="cover-photo" src="./covers/${name}.jpg" alt="" loading="lazy" decoding="async" data-cover-fallback>`;
}

/** Swap any cover photo under `root` that failed to load for the drawn cover. */
export function guardCovers(root, game) {
  for (const img of root.querySelectorAll('img[data-cover-fallback]')) {
    img.addEventListener('error', () => {
      const box = document.createElement('div');
      box.innerHTML = coverSvg(game);
      img.replaceWith(box.firstElementChild);
    }, { once: true });
  }
}

export function coverSvg(game) {
  if (game.card?.cover === 'market') return marketCover(game);
  if (game.card?.cover === 'work') return workCover(game);
  if (game.card?.cover === 'rts') return rtsCover(game);
  if (game.card?.cover === 'moba') return mobaCover(game);
  if (game.card?.cover === 'mmo') return mmoCover(game);
  if (game.card?.cover === 'city') return cityCover(game);
  if (game.card?.cover === 'drift') return driftCover(game);
  if (game.card?.cover === 'squad') return squadCover(game);
  if (game.card?.cover === 'fps') return fpsCover(game);
  if (game.card?.cover === 'arcademia') return arcademiaCover(game);
  if (game.card?.cover === 'gloamreach') return gloamreachCover(game);
  if (game.card?.cover === 'wyldhunt') return wyldhuntCover(game);
  if (game.card?.cover === 'kithvale') return kithvaleCover(game);
  if (game.card?.cover === 'kindlewatch') return kindlewatchCover(game);
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

/** AI Arcademia: a terraced green mountain, three little buildings a terrace, a waterfall. */
function arcademiaCover(game) {
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  const tiers = [0, 1, 2, 3, 4];
  const terr = tiers.map((i) => {
    const y = 160 - i * 24, w = 300 - i * 46, x = 160 - w / 2;
    return `<path d="M${x} ${y} Q${x + w / 2} ${y - 8} ${x + w} ${y} L${x + w - 6} ${y + 22} L${x + 6} ${y + 22} Z" fill="${['#a6cf8f', '#9fcb86', '#96c48a', '#8fc3a0', '#a9c9bd'][i]}"/><path d="M${x + 6} ${y + 6} L${x + w - 6} ${y + 6} L${x + w - 6} ${y + 22} L${x + 6} ${y + 22} Z" fill="#8a9aab" opacity=".55"/>` +
      [0, 1, 2].map((k) => {
        const bx = x + w * (0.25 + k * 0.25), c = ['#e0795b', '#c99a5b', '#6aa7c9'][k];
        return `<rect x="${bx - 7}" y="${y - 12}" width="14" height="10" fill="#f2e6cc"/><path d="M${bx - 9} ${y - 12} L${bx} ${y - 20} L${bx + 9} ${y - 12} Z" fill="${c}"/><rect x="${bx - 2}" y="${y - 7}" width="4" height="5" fill="#ffd27a"/>`;
      }).join('');
  }).join('');
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs><linearGradient id="ac-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9d6d2"/><stop offset="1" stop-color="#f3efe0"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#ac-${uid})"/>
    <path d="M0 120 L50 40 L90 110 L130 30 L170 100 L215 25 L260 105 L300 45 L320 80 V180 H0Z" fill="#9aa8ba"/>
    <path d="M50 40 L60 56 L42 54Z M130 30 L141 48 L120 46Z M215 25 L226 43 L205 42Z" fill="#f4f7fa"/>
    ${terr}
    <rect x="236" y="62" width="7" height="110" fill="#9fe0e6" opacity=".85"/>
    <circle cx="70" cy="30" r="12" fill="#fff6c8"/>
    <rect x="12" y="12" width="150" height="34" rx="17" fill="#fcf8ee" opacity=".95"/>
    <text x="26" y="35" fill="#2c6b62" font-family="system-ui, sans-serif" font-size="17" font-weight="900" letter-spacing="1"><tspan fill="#d98a1f">AI </tspan>ARCADEMIA</text>
  </svg>`;
}

/** Gloamreach: a golden sky, a giant oak, a timber house with lit windows, the gate's arch glowing violet. */
function gloamreachCover(game) {
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs>
      <linearGradient id="gr-sky-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4a7a"/><stop offset="0.55" stop-color="#e8a060"/><stop offset="1" stop-color="#ffd08a"/></linearGradient>
      <radialGradient id="gr-arch-${uid}" cx="0.5" cy="0.6" r="0.6"><stop offset="0" stop-color="#e48cff"/><stop offset="1" stop-color="#4a1a6a"/></radialGradient>
    </defs>
    <rect width="320" height="180" fill="url(#gr-sky-${uid})"/>
    <circle cx="44" cy="96" r="16" fill="#fff0c0" opacity=".9"/>
    <path d="M150 180 V120 H210 V180Z M156 120 a24 24 0 0 1 48 0Z" fill="#6a6070"/>
    <path d="M168 180 V128 a12 12 0 0 1 24 0 V180Z" fill="url(#gr-arch-${uid})"/>
    <path d="M232 180 V96 Q240 70 252 40 Q262 70 268 96 V180Z" fill="#3a2414"/>
    <ellipse cx="252" cy="40" rx="62" ry="40" fill="#3e5a1e"/><ellipse cx="226" cy="58" rx="34" ry="24" fill="#5a7a26"/><ellipse cx="282" cy="56" rx="30" ry="22" fill="#4a6a22"/>
    <path d="M40 180 V128 H112 V180Z" fill="#efe0c0"/><path d="M32 130 L76 96 L120 130Z" fill="#7a3a24"/>
    <path d="M40 128 H112 M56 128 V180 M76 128 V180 M96 128 V180 M40 152 H112" stroke="#4a2e1c" stroke-width="3"/>
    <rect x="61" y="136" width="10" height="10" fill="#ffc060"/><rect x="81" y="136" width="10" height="10" fill="#ffc060"/>
    <rect x="0" y="168" width="320" height="12" fill="#8a7050"/>
    <text x="14" y="30" fill="#fff4d6" font-family="Georgia, serif" font-size="20" letter-spacing="3">GLOAMREACH</text>
  </svg>`;
}

/** Wyldhunt: a jungle canyon, a waterfall in mist between dark cliffs, ruined pillars, a horned beast's silhouette. */
function wyldhuntCover(game) {
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs>
      <linearGradient id="wh-sky-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ab8c0"/><stop offset="1" stop-color="#d8e2d8"/></linearGradient>
      <linearGradient id="wh-fall-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8f2f0"/><stop offset="1" stop-color="#ffffff" stop-opacity=".2"/></linearGradient>
      <radialGradient id="wh-mist-${uid}" cx="0.5" cy="0.8" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity=".85"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="320" height="180" fill="url(#wh-sky-${uid})"/>
    <path d="M128 20 H176 L184 150 H120Z" fill="url(#wh-fall-${uid})"/>
    <ellipse cx="152" cy="146" rx="90" ry="40" fill="url(#wh-mist-${uid})"/>
    <path d="M0 0 H118 L126 40 L112 90 L120 180 H0Z" fill="#3a4a3a"/><path d="M320 0 H188 L180 50 L196 100 L186 180 H320Z" fill="#344434"/>
    <path d="M0 40 H110 M0 90 H112 M196 70 H320 M190 120 H320" stroke="#5a7a3a" stroke-width="5" opacity=".8"/>
    <rect x="92" y="60" width="16" height="110" fill="#2a322a" opacity=".75"/><rect x="214" y="80" width="14" height="90" fill="#2a322a" opacity=".7"/>
    <path d="M60 180 Q66 150 92 146 Q104 128 118 136 L126 128 L124 140 Q140 142 146 156 L160 180Z" fill="#1c2414"/>
    <path d="M110 134 Q104 116 112 108 M122 132 Q130 112 126 104" stroke="#e8dcc0" stroke-width="3" fill="none"/>
    <path d="M0 160 Q40 150 80 164 T160 160 T240 164 T320 158 V180 H0Z" fill="#2a4a1e"/>
    <text x="14" y="30" fill="#f4f0dc" font-family="Georgia, serif" font-size="20" letter-spacing="3">WYLDHUNT</text>
  </svg>`;
}

/** Kithvale: a timber gate with a curved tile roof and two paper lanterns, framing green hills under a dusk sky; a little round creature with a crown of grass. */
function kithvaleCover(game) {
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs>
      <linearGradient id="kv-sky-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a7cc0"/><stop offset="0.55" stop-color="#c8a6c8"/><stop offset="1" stop-color="#f8cc9c"/></linearGradient>
      <radialGradient id="kv-lamp-${uid}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff6d8"/><stop offset="1" stop-color="#f0c070"/></radialGradient>
    </defs>
    <rect width="320" height="180" fill="url(#kv-sky-${uid})"/>
    <ellipse cx="250" cy="52" rx="44" ry="12" fill="#fff0dc" opacity=".7"/><ellipse cx="70" cy="40" rx="36" ry="9" fill="#fff0dc" opacity=".6"/>
    <path d="M0 118 Q60 92 130 108 T250 96 T320 104 V180 H0Z" fill="#6a9a4a"/>
    <path d="M0 140 Q90 120 170 136 T320 128 V180 H0Z" fill="#7aaa52"/>
    <path d="M150 180 Q160 150 172 132 L178 132 Q176 150 196 180Z" fill="#d8b47c"/>
    <rect x="70" y="36" width="16" height="144" fill="#4a3124"/><rect x="234" y="36" width="16" height="144" fill="#4a3124"/>
    <rect x="54" y="44" width="212" height="10" fill="#3e2a1e"/><rect x="62" y="60" width="196" height="6" fill="#3e2a1e"/>
    <path d="M36 44 Q160 30 284 44 L292 34 Q160 14 28 34Z" fill="#d6a858"/><path d="M28 34 Q160 14 292 34" stroke="#8a5a2a" stroke-width="3" fill="none"/>
    <line x1="116" y1="66" x2="116" y2="78" stroke="#2a2018"/><ellipse cx="116" cy="88" rx="8" ry="10" fill="url(#kv-lamp-${uid})"/>
    <line x1="204" y1="66" x2="204" y2="78" stroke="#2a2018"/><ellipse cx="204" cy="88" rx="8" ry="10" fill="url(#kv-lamp-${uid})"/>
    <circle cx="128" cy="150" r="13" fill="#a8c87a"/><path d="M124 138 L120 126 M128 137 L129 124 M132 138 L138 127" stroke="#5a8a34" stroke-width="3" stroke-linecap="round"/>
    <circle cx="124" cy="148" r="2.6" fill="#2a1a10"/><circle cx="132" cy="148" r="2.6" fill="#2a1a10"/>
    <text x="14" y="28" fill="#fff4dc" font-family="system-ui, sans-serif" font-weight="800" font-size="20" letter-spacing="1">Kithvale</text>
  </svg>`;
}

/** Kindlewatch: a snowy courtyard seen from above at night, a brazier's warm pool against the blue, snow-capped blocks, a horned knight. */
function kindlewatchCover(game) {
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs>
      <radialGradient id="kw-pool-${uid}" cx="0.42" cy="0.5" r="0.55"><stop offset="0" stop-color="#f2b070"/><stop offset="0.45" stop-color="#8a6a7a"/><stop offset="1" stop-color="#22264a"/></radialGradient>
      <radialGradient id="kw-fire-${uid}" cx="0.5" cy="0.6" r="0.5"><stop offset="0" stop-color="#fff6c8"/><stop offset="0.5" stop-color="#ffb040"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="320" height="180" fill="url(#kw-pool-${uid})"/>
    <g stroke="#1a1222" stroke-width="3">
      <rect x="0" y="0" width="320" height="34" fill="#2a2e4c"/>
      <rect x="10" y="6" width="40" height="22" rx="6" fill="#dfe6f8"/><rect x="56" y="6" width="40" height="22" rx="6" fill="#cfd8f0"/><rect x="230" y="6" width="40" height="22" rx="6" fill="#dfe6f8"/><rect x="276" y="6" width="40" height="22" rx="6" fill="#cfd8f0"/>
      <rect x="226" y="96" width="34" height="46" rx="4" fill="#3c4266"/><rect x="226" y="80" width="34" height="22" rx="6" fill="#e6ecfa"/>
      <rect x="116" y="88" width="30" height="48" rx="4" fill="#4a4e72"/><path d="M106 84 Q131 104 156 84 Z" fill="#8a5426"/>
      <path d="M260 120 Q280 112 300 124 Q296 150 268 150 Z" fill="#9ad0f2"/>
    </g>
    <ellipse cx="131" cy="70" rx="22" ry="30" fill="url(#kw-fire-${uid})"/>
    <g stroke="#1a1222" stroke-width="2.5">
      <path d="M180 132 h22 v18 h-22z" fill="#5c6c8c"/><circle cx="191" cy="122" r="11" fill="#8c9ebc"/>
      <path d="M181 116 q-12 -10 -8 -20 q4 10 10 12z M201 116 q12 -10 8 -20 q-4 10 -10 12z" fill="#e2d6b4"/>
      <path d="M203 140 l26 -14" stroke="#dce6f0" stroke-width="4"/>
      <path d="M78 150 q6 -12 14 -4 q6 -14 12 2 z" fill="#e05a2a"/>
    </g>
    <text x="14" y="168" fill="#ffe2a8" stroke="#1a1222" stroke-width="3" paint-order="stroke" font-family="system-ui, sans-serif" font-weight="900" font-size="22" letter-spacing="2">KINDLEWATCH</text>
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

/** Lanebreak's cover: three lanes from corner to corner, a river, two crystals. */
function mobaCover(game) {
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs><linearGradient id="lb-${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d4a2a"/><stop offset="1" stop-color="#1c3220"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#lb-${uid})"/>
    <path d="M70 0 L250 180" stroke="#3f8fb8" stroke-width="14" opacity=".85"/>
    <g fill="none" stroke="#a68a5f" stroke-width="9" stroke-linejoin="round" stroke-linecap="round">
      <path d="M40 160 L40 22 L280 22"/><path d="M40 160 L280 22"/><path d="M40 160 L280 160 L280 22"/>
    </g>
    <path d="M40 142 l10 14 -10 14 -10 -14z" fill="#3d8bff"/><path d="M280 4 l10 14 -10 14 -10 -14z" fill="#ef4f4f"/>
    <g fill="#ffd27a"><circle cx="150" cy="88" r="4"/><circle cx="170" cy="78" r="4"/></g>
    <text x="60" y="118" fill="#fff" font-family="system-ui, sans-serif" font-size="22" font-weight="800">⚔ Lanebreak</text>
  </svg>`;
}

/** Hearthvale's cover: a town at dusk under a hill, a road to a glowing gate. */
/** A city at dusk: towers with lit windows over a river. Our own drawing (no photograph, no skyline traced). */
function fpsCover(game) {
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs><linearGradient id="fp-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2a3c"/><stop offset="1" stop-color="#5b6d80"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#fp-${uid})"/>
    <path d="M0 122 L110 96 H210 L320 122 V180 H0Z" fill="#8f8a80"/>
    <rect x="0" y="40" width="70" height="92" fill="#b9b2a4"/><rect x="250" y="34" width="70" height="98" fill="#a59e90"/>
    <rect x="118" y="78" width="30" height="30" fill="#a9773f" stroke="#6b451f" stroke-width="3"/><path d="M118 78 L148 108 M148 78 L118 108" stroke="#6b451f" stroke-width="3"/>
    <ellipse cx="190" cy="128" rx="46" ry="12" fill="none" stroke="#ffd24a" stroke-width="3" stroke-dasharray="10 6"/>
    <text x="182" y="135" fill="#ffd24a" font-family="system-ui, sans-serif" font-size="20" font-weight="900">A</text>
    <circle cx="86" cy="104" r="7" fill="#ff8a3c"/><rect x="80" y="111" width="12" height="20" rx="5" fill="#ff8a3c"/>
    <circle cx="232" cy="96" r="6" fill="#38c6d9"/><rect x="227" y="102" width="10" height="17" rx="4" fill="#38c6d9"/>
    <g stroke="#7dffb0" stroke-width="2.5"><path d="M160 60 v-12 M160 76 v12 M152 68 h-12 M168 68 h12"/></g>
    <text x="16" y="30" fill="#fff" font-family="system-ui, sans-serif" font-size="22" font-weight="900">${String(game.title).replace(/[<&]/g, '')}</text>
  </svg>`;
}

/** A walled outpost round a glowing reactor at dusk, a purple rift, soldiers on the wall. */
function squadCover(game) {
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  const r = rng(game.id);
  let dead = '';
  for (let k = 0; k < 18; k++) {
    const x = 10 + r() * 110;
    const y = 120 + r() * 50;
    dead += `<circle cx="${x}" cy="${y - 7}" r="3" fill="#e8e2d0"/><rect x="${x - 2}" y="${y - 4}" width="4" height="9" rx="2" fill="#d8d0bc"/>`;
  }
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs><linearGradient id="sq-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1030"/><stop offset=".6" stop-color="#5a2a50"/><stop offset="1" stop-color="#a0603a"/></linearGradient>
    <radialGradient id="sr-${uid}"><stop offset="0" stop-color="#e0b0ff"/><stop offset="1" stop-color="#7020c0" stop-opacity="0"/></radialGradient></defs>
    <rect width="320" height="180" fill="url(#sq-${uid})"/>
    <path d="M0 120 L320 108 V180 H0Z" fill="#4a3428"/>
    <ellipse cx="60" cy="150" rx="46" ry="12" fill="url(#sr-${uid})"/>
    ${dead}
    <path d="M160 98 h130 v40 h-130z" fill="#7a7670"/><path d="M160 98 h130 v5 h-130z" fill="#9aa0a8"/>
    <rect x="212" y="70" width="26" height="40" fill="#3a4048"/><rect x="218" y="80" width="14" height="24" fill="#5cd8ff"/>
    <circle cx="225" cy="88" r="26" fill="#5cd8ff" opacity=".18"/>
    ${[176, 196, 262, 280].map((x, k) => `<circle cx="${x}" cy="88" r="3.4" fill="#f0d0b0"/><rect x="${x - 3}" y="91" width="6" height="8" rx="2" fill="${['#4f8cff', '#3ddc84', '#ff8a2a', '#f5c518'][k]}"/>`).join('')}
    <path d="M150 100 L120 128" stroke="#ffe9b0" stroke-width="1.5"/><path d="M170 96 L110 122" stroke="#ffe9b0" stroke-width="1.5"/>
    <text x="16" y="34" fill="#ffffff" font-family="system-ui, sans-serif" font-size="24" font-weight="900">${String(game.title).replace(/[<&]/g, '')}</text>
    <text x="17" y="52" fill="#d79bff" font-family="system-ui, sans-serif" font-size="11" font-weight="800" letter-spacing="2">${String(game.id).endsWith('2d') ? 'TOP-DOWN 2D · CO-OP' : 'GRAVE PURGE · HOLD THE OUTPOST'}</text>
  </svg>`;
}

/** Night towers, a wet road, two cars' light trails sweeping through a bend. */
function driftCover(game) {
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  const r = rng(game.id);
  let towers = '';
  for (let x = 0; x < 320; ) {
    const w = 16 + Math.floor(r() * 24);
    const h = 40 + Math.floor(r() * 90);
    let lights = '';
    for (let wy = 112 - h + 6; wy < 106; wy += 8) for (let wx = x + 3; wx < x + w - 4; wx += 6) if (r() < 0.35) lights += `<rect x="${wx}" y="${wy}" width="3" height="3" fill="${r() < 0.2 ? '#ff9a3c' : '#ffd98a'}"/>`;
    towers += `<rect x="${x}" y="${112 - h}" width="${w}" height="${h}" fill="${r() < 0.5 ? '#141a33' : '#1c2347'}"/>${lights}`;
    x += w + 1;
  }
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs>
      <linearGradient id="dr-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05060f"/><stop offset=".7" stop-color="#2a1747"/><stop offset="1" stop-color="#5a2a4a"/></linearGradient>
      <linearGradient id="dt-${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff3d2e" stop-opacity="0"/><stop offset="1" stop-color="#ff3d2e"/></linearGradient>
      <linearGradient id="dh-${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2ad4ff" stop-opacity="0"/><stop offset="1" stop-color="#b9f2ff"/></linearGradient>
    </defs>
    <rect width="320" height="180" fill="url(#dr-${uid})"/>
    ${towers}
    <path d="M0 112 H320 V180 H0Z" fill="#14151c"/>
    <path d="M-10 175 C 90 160, 140 120, 330 128" stroke="#2a2c38" stroke-width="34" fill="none"/>
    <path d="M-10 168 C 90 152, 150 118, 330 122" stroke="url(#dt-${uid})" stroke-width="3" fill="none"/>
    <path d="M-10 178 C 100 162, 160 126, 330 132" stroke="url(#dh-${uid})" stroke-width="3" fill="none"/>
    <path d="M150 140 l14 -5 l22 1 l8 6 l-6 5 h-34 z" fill="#e8e9ee"/><path d="M164 135 l6 -5 h12 l6 6z" fill="#2a3442"/>
    <circle cx="160" cy="147" r="3.5" fill="#0a0a0a"/><circle cx="184" cy="147" r="3.5" fill="#0a0a0a"/>
    <path d="M196 141 l10 0" stroke="#fff6c8" stroke-width="2"/>
    <text x="16" y="34" fill="#ffffff" font-family="system-ui, sans-serif" font-size="24" font-weight="900" font-style="italic">${String(game.title).replace(/[<&]/g, '')}</text>
    <text x="17" y="54" fill="#ff8a2a" font-family="system-ui, sans-serif" font-size="12" font-weight="800" letter-spacing="2">강남 · SEOUL NIGHT RACING</text>
  </svg>`;
}

function cityCover(game) {
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  const r = rng(game.id);
  let towers = '';
  for (let x = 4; x < 316; ) {
    const w = 14 + Math.floor(r() * 22);
    const h = 30 + Math.floor(r() * 95);
    const y = 138 - h;
    let lights = '';
    for (let wy = y + 6; wy < 132; wy += 9) for (let wx = x + 3; wx < x + w - 4; wx += 6) if (r() < 0.45) lights += `<rect x="${wx}" y="${wy}" width="3" height="4" fill="#ffd98a"/>`;
    towers += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${r() < 0.5 ? '#2c3158' : '#3a3f6e'}"/>${lights}`;
    x += w + 2;
  }
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs><linearGradient id="ct-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27255a"/><stop offset=".6" stop-color="#c8658f"/><stop offset="1" stop-color="#ffb46a"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#ct-${uid})"/>
    <circle cx="250" cy="52" r="20" fill="#ffe7b0" opacity=".9"/>
    ${towers}
    <rect y="138" width="320" height="42" fill="#3b4a8a"/>
    <path d="M0 150 H320 M0 162 H320" stroke="#ffd98a" stroke-width="1.5" stroke-dasharray="14 22" opacity=".5"/>
    <text x="16" y="34" fill="#fff3d6" font-family="system-ui, sans-serif" font-size="22" font-weight="800">🗺️ ${String(game.title).replace(/[<&]/g, '')}</text>
  </svg>`;
}

function mmoCover(game) {
  const uid = String(game.id).replace(/[^a-z0-9-]/gi, '-');
  const houses = [[30, 120], [72, 128], [112, 118], [210, 124], [252, 130]].map(([x, y]) => `<rect x="${x}" y="${y}" width="30" height="24" fill="#d8c8a8"/><path d="M${x - 4} ${y} L${x + 15} ${y - 16} L${x + 34} ${y}Z" fill="#8a4a3a"/><rect x="${x + 11}" y="${y + 10}" width="8" height="14" fill="#5a3a2a"/><rect x="${x + 3}" y="${y + 6}" width="6" height="5" fill="#ffd27a"/>`).join('');
  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${String(game.title).replace(/"/g, '&quot;')}">
    <defs><linearGradient id="hv-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2350"/><stop offset=".65" stop-color="#b8607a"/><stop offset="1" stop-color="#e8a86a"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#hv-${uid})"/>
    <path d="M0 120 Q90 70 170 100 T320 90 V180 H0Z" fill="#3d5a34"/>
    <path d="M150 180 Q160 140 168 104" stroke="#b49a6a" stroke-width="10" fill="none"/>
    <ellipse cx="168" cy="96" rx="11" ry="14" fill="#7fd6ff" opacity=".85"/>
    ${houses}
    <text x="16" y="34" fill="#ffe8b8" font-family="system-ui, sans-serif" font-size="22" font-weight="800">🏰 Hearthvale</text>
  </svg>`;
}
