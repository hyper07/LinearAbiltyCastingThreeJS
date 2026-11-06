/**
 * Small line icons for the bag and the paper doll, one per item kind.
 * 24×24, drawn in `currentColor`, so a slot's rarity colour tints its icon.
 */
const P = {
  head: '<path d="M5 15a7 7 0 0 1 14 0v3H5z"/><path d="M5 13h14"/><path d="M10 15v3M14 15v3"/><path d="M12 4v4"/>',
  chest: '<path d="M8 4l-4 3 1.5 4L7 10v10h10V10l1.5 1L20 7l-4-3c-1 1.5-2.4 2-4 2s-3-.5-4-2z"/><path d="M12 6v14"/>',
  hands: '<path d="M7 21v-6l-2-4 1.5-1 2.5 3V5a1.2 1.2 0 0 1 2.4 0v5V4a1.2 1.2 0 0 1 2.4 0v6V5a1.2 1.2 0 0 1 2.4 0v6-3a1.2 1.2 0 0 1 2.4 0v7c0 3-2 6-5 6z"/>',
  legs: '<path d="M7 3h10l-1 18h-3.5L12 10l-.5 11H8z"/><path d="M7 7h10"/>',
  feet: '<path d="M7 3h5v9l7 3c1 .5 1.5 1.5 1.5 2.5V20H4v-4l3-2z"/><path d="M4 17h16.5"/>',
  waist: '<rect x="3" y="9" width="18" height="6" rx="1.5"/><rect x="10" y="8" width="5" height="8" rx="1"/><path d="M12.5 10v4"/>',
  back: '<path d="M8 3h8l1 4 3 14H4L7 7z"/><path d="M8 3c1 2 7 2 8 0"/><path d="M12 7v14"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 7.8-8 9-4.6-1.2-8-4.5-8-9V6z"/><path d="M12 3v18M4.5 11h15"/>',
  focus: '<path d="M12 3l6 7-6 11-6-11z"/><path d="M6 10h12"/><path d="M12 3l-2 7 2 11 2-11z"/>',
  quiver: '<path d="M9 9h6l-1 12h-4z"/><path d="M10 9l-2-6M12 9V2M14 9l2-6"/><path d="M7 3l1.5 1M12 2v1M17 3l-1.5 1"/>',
  neck: '<path d="M5 4c0 6 3 9 7 9s7-3 7-9"/><path d="M12 13l-3 4 3 4 3-4z"/>',
  ring: '<circle cx="12" cy="14" r="6"/><path d="M9.5 8l2.5-4 2.5 4"/>',
  weapon: '<path d="M14.5 4H20v5.5L9 20.5 4.5 21l-.5-.5.5-4.5z"/><path d="M6 15l3 3M4 20l3-3"/>',
  book: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/>',
  potion: '<path d="M10 3h4M10.5 3v5L6 15a4 4 0 0 0 3.5 6h5A4 4 0 0 0 18 15l-4.5-7V3"/><path d="M7.5 14h9"/>',
  gold: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4"/>'
};

const svg = (body) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** The icon for a gear slot kind or item-class: 'head', 'shield', 'ring'… */
export function kindIcon(kind) {
  return svg(P[kind] ?? P.weapon);
}

/** The icon for an item. */
export function itemIcon(item) {
  if (item.type === 'gear') return kindIcon(item.kind === 'offhand' ? item.group : item.kind);
  return kindIcon(item.type);
}
