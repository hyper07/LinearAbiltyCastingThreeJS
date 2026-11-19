/**
 * The stash: a chest in every hub holding the same things, for what won't
 * fit in the bag or isn't needed on the road. Slots are arrays where an
 * empty slot is null; what's in a slot is the game's own (an item, a stack).
 * Moving merges stacks where the game says two entries stack, else fills the
 * first empty slot, else fails. Pure: tests/unit/zones.test.mjs.
 *
 *   const rules = { stack: (a, b) => a.kind && a.kind === b.kind, max: 20, count: (e) => e.n ?? 1, setCount: (e, n) => (e.n = n) };
 *   move(bag, 3, stash, rules)       → { ok, moved }   bag[3] into the stash
 *   sortSlots(stash, (e) => e.name)  → sorted, gaps last
 */

const noStack = { stack: () => false, max: 1, count: () => 1, setCount: () => {} };

/**
 * Move `from[i]` into `to` (into slot `j` if given: swapping with what's
 * there). Stacks fill matching stacks first. Returns { ok, moved, left }.
 */
export function move(from, i, to, rules = noStack, j = null) {
  const R = { ...noStack, ...rules };
  const e = from[i];
  if (e == null) return { ok: false, moved: 0, left: 0 };
  if (j != null) {
    const there = to[j];
    if (there != null && R.stack(there, e)) {
      const room = R.max - R.count(there);
      const n = Math.min(room, R.count(e));
      if (n <= 0) return { ok: false, moved: 0, left: R.count(e) };
      R.setCount(there, R.count(there) + n);
      if (n === R.count(e)) from[i] = null;
      else R.setCount(e, R.count(e) - n);
      return { ok: true, moved: n, left: from[i] ? R.count(from[i]) : 0 };
    }
    to[j] = e;
    from[i] = there ?? null;
    return { ok: true, moved: R.count(e), left: 0 };
  }
  let left = R.count(e);
  let moved = 0;
  for (let k = 0; k < to.length && left > 0; k++) {
    const t = to[k];
    if (t == null || !R.stack(t, e)) continue;
    const n = Math.min(R.max - R.count(t), left);
    if (n <= 0) continue;
    R.setCount(t, R.count(t) + n);
    left -= n;
    moved += n;
  }
  if (left > 0) {
    const k = to.indexOf(null);
    if (k < 0) {
      if (moved) R.setCount(e, left);
      return { ok: moved > 0, moved, left };
    }
    if (moved) R.setCount(e, left);
    to[k] = e;
    from[i] = null;
    return { ok: true, moved: moved + left, left: 0 };
  }
  from[i] = null;
  return { ok: true, moved, left: 0 };
}

/** Sort a list of slots in place by `key` (strings or numbers), entries first, gaps last. */
export function sortSlots(list, key = (e) => String(e)) {
  const full = list.filter((e) => e != null);
  full.sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  for (let i = 0; i < list.length; i++) list[i] = full[i] ?? null;
  return list;
}

/** Move everything that fits from one list into another (Store all / Take all). Returns how many entries moved. */
export function moveAll(from, to, rules = noStack, keep = () => false) {
  let n = 0;
  for (let i = 0; i < from.length; i++) {
    if (from[i] == null || keep(from[i], i)) continue;
    const r = move(from, i, to, rules);
    if (r.ok) n++;
  }
  return n;
}

/** How many slots are used. */
export const used = (list) => list.reduce((n, e) => n + (e != null ? 1 : 0), 0);
