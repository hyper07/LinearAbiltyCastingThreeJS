/**
 * The goggles a rider can wear, as data (pure): ids, names and the colours
 * of their picker chips. All original designs. The 3D models are
 * render/goggles.js. Kept here so the menus, the save, the network code and
 * the tests can use the list without three.js.
 */

export const GOGGLES = [
  { id: 'classic', name: 'Classic', chip: ['#ffffff', '#ff9a2e'] },
  { id: 'sky', name: 'Sky mirror', chip: ['#1d1f26', '#3d8bff'] },
  { id: 'rainbow', name: 'Rainbow', chip: ['#1d1f26', '#b05cff', '#3fd0b0'] },
  { id: 'heart', name: 'Hearts', chip: ['#ff4b8b', '#ff9ac8'] },
  { id: 'star', name: 'Stars', chip: ['#ff8a1a', '#ffd23f'] },
  { id: 'googly', name: 'Googly eyes', chip: ['#ffffff', '#16131f'] },
  { id: 'cateye', name: 'Cat-eye', chip: ['#ff6fb4', '#6b4a9c'] },
  { id: 'aviator', name: 'Aviator', chip: ['#c99a3a', '#6b8f4a'] },
  { id: 'snorkel', name: 'Snorkel mask', chip: ['#3ab8e8', '#ff7a33'] },
  { id: 'swim', name: 'Swim goggles', chip: ['#ff3fa0', '#3fe0ff'] },
  { id: 'glasses3d', name: '3D glasses', chip: ['#f4f1ea', '#e63946', '#3a86ff'] },
  { id: 'pixel', name: 'Pixel shades', chip: ['#16131f', '#16131f'] },
  { id: 'hypno', name: 'Hypno spiral', chip: ['#16131f', '#ffffff'] },
  { id: 'donut', name: 'Donuts', chip: ['#d9a066', '#ff7ab8'] },
  { id: 'frogeyes', name: 'Frog eyes', chip: ['#6fcf4a', '#1d1f26'] },
  { id: 'cyclops', name: 'Cyclops visor', chip: ['#c7ced9', '#4fe3ff'] },
  { id: 'led', name: 'LED visor', chip: ['#16131f', '#ff3b6b'] },
  { id: 'flower', name: 'Sunflowers', chip: ['#ffc93a', '#7a4a1e'] }
];

export const GOGGLE_IDS = GOGGLES.map((g) => g.id);
export const DEFAULT_GOGGLES = 'classic';

/** A goggle id from anywhere (a save, the network): known ones pass, anything else is Classic. */
export const cleanGoggle = (id) => (GOGGLE_IDS.includes(id) ? id : DEFAULT_GOGGLES);

/** A random pair (the AI's, the 🎲 button). `rand` = () => [0, 1). */
export const randomGoggle = (rand = Math.random) => GOGGLE_IDS[Math.floor(rand() * GOGGLE_IDS.length) % GOGGLE_IDS.length];

const KEY = 'snowpuff.goggles';

/** The pair this device remembers (Classic if none, or if storage fails). */
export function loadGoggles(storage = globalThis.localStorage) {
  try {
    return cleanGoggle(storage?.getItem(KEY));
  } catch {
    return DEFAULT_GOGGLES;
  }
}

export function saveGoggles(id, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, cleanGoggle(id));
    return true;
  } catch {
    return false;
  }
}

/** A chip for the picker: a little SVG of the pair. */
export function goggleChip(id, size = 44) {
  const g = GOGGLES.find((x) => x.id === id) ?? GOGGLES[0];
  const [a, b, c = b] = g.chip;
  const lens = {
    heart: (x) => `<path d="M${x} 25 l-6 -6 a3.5 3.5 0 0 1 6 -4 a3.5 3.5 0 0 1 6 4z" fill="${b}" stroke="${a}" stroke-width="2"/>`,
    star: (x) => `<path d="M${x} 13 l2.4 5 5.4.6 -4 3.7 1.1 5.3 -4.9 -2.7 -4.9 2.7 1.1 -5.3 -4 -3.7 5.4 -.6z" fill="${b}" stroke="${a}" stroke-width="1.6"/>`,
    googly: (x) => `<circle cx="${x}" cy="20" r="7" fill="#fff" stroke="${b}" stroke-width="2"/><circle cx="${x + 1.5}" cy="22" r="3.5" fill="${b}"/>`,
    pixel: (x) => `<rect x="${x - 7}" y="16" width="14" height="8" fill="${b}"/><rect x="${x - 5}" y="17" width="3" height="2" fill="#fff"/>`,
    hypno: (x) => `<circle cx="${x}" cy="20" r="7" fill="${b}" stroke="${a}" stroke-width="2"/><path d="M${x} 20 m0 -1 a1 1 0 1 1 -1 1 a2.5 2.5 0 1 1 2.5 2.5 a4 4 0 1 1 -4 -4" fill="none" stroke="${a}" stroke-width="1.3"/>`,
    donut: (x) => `<circle cx="${x}" cy="20" r="7" fill="none" stroke="${b}" stroke-width="4"/><circle cx="${x}" cy="20" r="7" fill="none" stroke="${a}" stroke-width="1.5" stroke-dasharray="2 3"/>`,
    flower: (x) => `<circle cx="${x}" cy="20" r="8.5" fill="${a}" stroke="#e09a10" stroke-width="1"/><circle cx="${x}" cy="20" r="4.5" fill="${b}"/>`,
    frogeyes: (x) => `<circle cx="${x}" cy="16" r="6.5" fill="${a}" stroke="#2a5a20" stroke-width="1.5"/><circle cx="${x}" cy="16" r="3" fill="${b}"/>`
  }[id];
  let body;
  if (lens) body = lens(13) + lens(31);
  else if (id === 'glasses3d') body = `<rect x="4" y="13" width="36" height="13" rx="2" fill="${a}" stroke="#2a2f4a" stroke-width="1.5"/><rect x="7" y="15" width="12" height="9" fill="${b}"/><rect x="25" y="15" width="12" height="9" fill="${c}"/>`;
  else if (id === 'cyclops' || id === 'led') body = `<rect x="3" y="13" width="38" height="13" rx="6" fill="${b}" stroke="${a}" stroke-width="2.5"/>${id === 'led' ? `<path d="M10 17h2v5h3 M19 17v5 M24 17v5h3 M24 19h2 M31 17h3v5h-3" stroke="#fff" stroke-width="1.2" fill="none"/>` : ''}`;
  else if (id === 'aviator' || id === 'swim') body = `<ellipse cx="13" cy="20" rx="${id === 'swim' ? 5 : 7}" ry="${id === 'swim' ? 4 : 7}" fill="${b}" stroke="${a}" stroke-width="2"/><ellipse cx="31" cy="20" rx="${id === 'swim' ? 5 : 7}" ry="${id === 'swim' ? 4 : 7}" fill="${b}" stroke="${a}" stroke-width="2"/>`;
  else if (id === 'cateye') body = `<path d="M5 16 Q13 12 20 18 Q16 27 9 24 Q5 22 5 16Z M39 16 Q31 12 24 18 Q28 27 35 24 Q39 22 39 16Z" fill="${b}" stroke="${a}" stroke-width="2"/><path d="M7 15 l2 -5 3 4z M37 15 l-2 -5 -3 4z" fill="${a}"/>`;
  else if (id === 'snorkel') body = `<rect x="5" y="13" width="34" height="14" rx="6" fill="#bfeeff" stroke="${a}" stroke-width="2.5"/><path d="M39 22 q4 0 4 -6 v-12" stroke="${b}" stroke-width="3" fill="none"/>`;
  else body = `<rect x="3" y="13" width="38" height="14" rx="7" fill="${c === b ? b : `url(#g-${id})`}" stroke="${a}" stroke-width="3"/>`;
  const grad = id === 'rainbow' ? `<defs><linearGradient id="g-${id}"><stop offset="0" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>` : '';
  return `<svg viewBox="0 0 44 40" width="${size}" height="${size}" aria-hidden="true">${grad}<path d="M2 20 Q22 34 42 20" stroke="#2a2f4a" stroke-width="2" fill="none" opacity=".35"/>${body}</svg>`;
}
