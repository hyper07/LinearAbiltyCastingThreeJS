/**
 * Item grids: the bag and the stash.
 *
 * Every item that goes in a container takes a rectangle of cells (its size,
 * `itemSize` in items/Items.js — a ring 1×1, a dagger 1×2, a helmet 2×2,
 * body armor 2×3, a rifle 2×4…). Where it sits is stored on the item itself
 * as `at: [x, y]` (top-left cell), so a container is just an array of items
 * and saves as JSON.
 */

/** Does a w×h item fit at (x, y), ignoring the item `ignore` (the one being moved)? */
export function fits(items, cols, rows, size, x, y, ignore = null) {
  const [w, h] = size;
  if (x < 0 || y < 0 || x + w > cols || y + h > rows) return false;
  for (const other of items) {
    if (other === ignore || other.uid === ignore?.uid || !other.at) continue;
    const [ow, oh] = other._size ?? [1, 1];
    const [ox, oy] = other.at;
    if (x < ox + ow && x + w > ox && y < oy + oh && y + h > oy) return false;
  }
  return true;
}

/** The first spot (left to right, top to bottom) where a w×h item fits, or null. */
export function findSpot(items, cols, rows, size, ignore = null) {
  for (let y = 0; y <= rows - size[1]; y++) {
    for (let x = 0; x <= cols - size[0]; x++) {
      if (fits(items, cols, rows, size, x, y, ignore)) return [x, y];
    }
  }
  return null;
}

/** Items overlapping a w×h rectangle at (x, y). */
export function overlapping(items, size, x, y, ignore = null) {
  const [w, h] = size;
  return items.filter((other) => {
    if (other === ignore || other.uid === ignore?.uid || !other.at) return false;
    const [ow, oh] = other._size ?? [1, 1];
    const [ox, oy] = other.at;
    return x < ox + ow && x + w > ox && y < oy + oh && y + h > oy;
  });
}

/** How many cells are used. */
export function usedCells(items) {
  return items.reduce((n, it) => n + (it._size ? it._size[0] * it._size[1] : 1), 0);
}
