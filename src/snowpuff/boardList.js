/**
 * The snowboards a rider can pick, as data (pure): ids, names, chip colours
 * and the little trail or sound each funny one has. All original designs, no
 * brands. Boards are cosmetic only — every board rides with the same
 * physics. The 3D boards are render/boards.js.
 */

export const BOARDS = [
  { id: 'classic', name: 'Classic', chip: ['#ffffff', '#ff6fb4'] },
  { id: 'rainbow', name: 'Rainbow', chip: ['#ff4b5c', '#3a86ff'], trail: 'rainbow' },
  { id: 'pizza', name: 'Pizza slice', chip: ['#ffcf5a', '#d9432f'], trail: 'cheese' },
  { id: 'surf', name: 'Surfboard', chip: ['#3fd0b0', '#ff8a3d'], trail: 'splash' },
  { id: 'banana', name: 'Banana', chip: ['#ffe14d', '#6b4a1e'] },
  { id: 'fish', name: 'Fish', chip: ['#ff9a3d', '#2a86ff'] },
  { id: 'rocket', name: 'Rocket', chip: ['#e8edf5', '#ff4b2b'], trail: 'flame' },
  { id: 'box', name: 'Cardboard box', chip: ['#c99a62', '#8a6236'] },
  { id: 'cookie', name: 'Gingerbread', chip: ['#b8733a', '#ffffff'], trail: 'sprinkles' },
  { id: 'cloud', name: 'Cloud', chip: ['#ffffff', '#bcd6ff'], trail: 'puffs' },
  { id: 'neon', name: 'Neon', chip: ['#16131f', '#3cf2ff'] },
  { id: 'dragon', name: 'Dragon', chip: ['#3fae5a', '#ffd23f'] },
  { id: 'melon', name: 'Watermelon', chip: ['#ff5a6e', '#2e9b4a'], trail: 'seeds' },
  { id: 'sled', name: 'Wooden sled', chip: ['#c98a4a', '#7a4a22'] }
];

export const BOARD_IDS = BOARDS.map((b) => b.id);
export const DEFAULT_BOARD = 'classic';

/** A board id from anywhere (a save, the network): known ones pass, anything else is Classic. */
export const cleanBoard = (id) => (BOARD_IDS.includes(id) ? id : DEFAULT_BOARD);

/** A random board (the AI's, the 🎲 button). `rand` = () => [0, 1). */
export const randomBoard = (rand = Math.random) => BOARD_IDS[Math.floor(rand() * BOARD_IDS.length) % BOARD_IDS.length];

export const boardInfo = (id) => BOARDS.find((b) => b.id === cleanBoard(id));

const KEY = 'snowpuff.board';

export function loadBoard(storage = globalThis.localStorage) {
  try {
    return cleanBoard(storage?.getItem(KEY));
  } catch {
    return DEFAULT_BOARD;
  }
}

export function saveBoard(id, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, cleanBoard(id));
    return true;
  } catch {
    return false;
  }
}

/** A chip for the picker: the board seen from above, tilted. */
export function boardChip(id, size = 44) {
  const b = boardInfo(id);
  const [a, c] = b.chip;
  const deck = (fill, extra = '') => `<g transform="rotate(-28 22 20)"><rect x="4" y="14" width="36" height="12" rx="6" fill="${fill}" stroke="#2a2f4a" stroke-width="1.6"/>${extra}</g>`;
  const body = {
    classic: deck(a, `<circle cx="13" cy="20" r="2.4" fill="${c}"/><path d="M19 17l2 3-2 3M25 17l2 3-2 3" stroke="${c}" stroke-width="1.6" fill="none"/><circle cx="32" cy="20" r="2" fill="#3a86ff"/>`),
    rainbow: deck('#fff', ['#ff4b5c', '#ffa52e', '#ffe14d', '#3fd06a', '#3a86ff'].map((k, i) => `<rect x="6" y="${15 + i * 2}" width="32" height="2" fill="${k}"/>`).join('')),
    pizza: `<g transform="rotate(-28 22 20)"><path d="M4 14 L40 20 L4 26Z" fill="${a}" stroke="#b5651d" stroke-width="2"/><circle cx="12" cy="18" r="2" fill="${c}"/><circle cx="20" cy="21" r="2" fill="${c}"/><circle cx="11" cy="23" r="1.8" fill="${c}"/></g>`,
    surf: deck(a, `<rect x="6" y="19" width="32" height="2.4" fill="${c}"/><path d="M10 15c3 2 5 2 8 0" stroke="#fff" stroke-width="1.4" fill="none"/>`),
    banana: `<path d="M5 12 Q22 34 40 12 Q22 26 5 12Z" fill="${a}" stroke="#c9a400" stroke-width="1.6"/><path d="M5 12 l-2 -2" stroke="${c}" stroke-width="2.4"/>`,
    fish: `<g transform="rotate(-20 22 20)"><ellipse cx="20" cy="20" rx="15" ry="7" fill="${a}" stroke="#2a2f4a" stroke-width="1.4"/><path d="M34 20 l7 -6 v12z" fill="${c}"/><circle cx="10" cy="18" r="2" fill="#fff"/><circle cx="10" cy="18" r="1" fill="#16131f"/></g>`,
    rocket: deck(a, `<path d="M40 20 l-6 -6 v12z" fill="${c}"/><circle cx="16" cy="20" r="3" fill="#3a86ff" stroke="#fff" stroke-width="1"/><path d="M4 18 l-3 2 3 2" fill="#ffd23f"/>`),
    box: deck(a, `<rect x="18" y="14" width="5" height="12" fill="#d9c8a0" opacity=".9"/><path d="M8 18h7M8 22h5" stroke="${c}" stroke-width="1.2"/>`),
    cookie: deck(a, `<path d="M8 17q3 3 6 0t6 0 6 0 6 0" stroke="${c}" stroke-width="1.5" fill="none"/><circle cx="13" cy="22" r="1.4" fill="#ff4b8b"/><circle cx="25" cy="22" r="1.4" fill="#3fd0b0"/>`),
    cloud: `<g transform="rotate(-24 22 20)"><path d="M6 24 a5 5 0 0 1 4 -8 a6 6 0 0 1 11 -2 a6 6 0 0 1 11 2 a5 5 0 0 1 3 8z" fill="${a}" stroke="${c}" stroke-width="2"/></g>`,
    neon: deck(a, `<rect x="5.5" y="15.5" width="33" height="9" rx="4.5" fill="none" stroke="${c}" stroke-width="2"/><path d="M12 22l4-4 4 4 4-4 4 4" stroke="#ff3fd0" stroke-width="1.4" fill="none"/>`),
    dragon: deck(a, `<path d="M8 17l3 3-3 3M14 17l3 3-3 3M20 17l3 3-3 3M26 17l3 3-3 3" stroke="#2a7a3a" stroke-width="1.3" fill="none"/><circle cx="37" cy="18" r="1.6" fill="${c}"/>`),
    melon: deck(a, `<rect x="4" y="23" width="36" height="3" rx="1.5" fill="${c}"/><path d="M12 18v2M18 19v2M24 18v2M30 19v2" stroke="#16131f" stroke-width="1.6" stroke-linecap="round"/>`),
    sled: `<g transform="rotate(-24 22 20)"><rect x="5" y="15" width="34" height="3" fill="${a}" stroke="${c}"/><rect x="5" y="19" width="34" height="3" fill="${a}" stroke="${c}"/><rect x="5" y="23" width="34" height="3" fill="${a}" stroke="${c}"/><path d="M40 16 q4 4 0 9" stroke="#e4d1a6" stroke-width="1.5" fill="none"/></g>`
  }[b.id];
  return `<svg viewBox="0 0 44 40" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}
