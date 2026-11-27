/**
 * What the signature games (sort, maphunt, dig, countdown, rover, rhythm) share: their card, a
 * gentle feedback line, the coins and XP for things solved on the first try (the challenge's own
 * `right` event, capped per game), the Next button that ends the activity, and keyboard helpers.
 *
 * Each game is a runner (lesson/activities.js RUNNERS): `async (r) => …` that builds its card in
 * r.main, plays by events, and resolves when the child presses Next (r.until, so leaving the
 * lesson stops it). Their rules are in content/games.js; their look in games.css.
 */
import { el, button } from '../../ui/dom.js';
import { t as tr } from '../../i18n/index.js';

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The game's card: a kicker, the lesson's instruction (q), and a body to fill. */
export function gameCard(r, kind, { kicker, title, how = null, shot = 'wide' }) {
  r.clear();
  r.shot(shot);
  const card = el('section', `arc-card arc-game arc-game--${kind}`, null, { 'aria-label': kicker });
  const head = el('header', 'arc-game__head');
  head.append(el('p', 'arc-card__kicker', kicker), el('h2', 'arc-q arc-game__title', title));
  if (how) head.append(el('p', 'arc-hint arc-game__how', how));
  const body = el('div', 'arc-game__body');
  const fb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
  card.append(head, body, fb);
  r.main.append(card);
  return { card, head, body, fb };
}

/** A gentle line in the feedback (no sound): `tone` '' | 'good' | 'oops'. */
export function note(fb, text, tone = '') {
  fb.className = `arc-feedback${tone ? ` is-${tone}` : ''}`;
  fb.textContent = text;
}

/**
 * Coins and XP for something solved on the first try: the challenge's `right` event (2 coins,
 * 10 XP, today's "answer right" quest), at most `cap` times in one game.
 */
export function scorer(r, cap = 4) {
  let n = 0;
  return () => {
    if (n >= cap || !r.game?.gs) return;
    n++;
    const got = r.game.gs.event('right', { combo: 0 });
    r.flashCoins?.(got);
  };
}

/**
 * Something to wait for inside a game that leaving the lesson still stops: `await g.wait` resolves
 * when `g.open()` is called, and rejects (like r.until) when the child leaves. Make it just before
 * waiting on it: only the latest r.until is stopped by leaving.
 */
export function gate(r) {
  const b = document.createElement('button');
  const wait = r.until(b);
  let opened = false;
  return {
    wait,
    open: () => {
      if (opened) return;
      opened = true;
      b.click();
    }
  };
}

/** Show the Next button and wait for it: the activity is over. */
export async function finish(r, card, label = tr('lesson.next')) {
  const next = button('arc-btn arc-btn--primary arc-btn--big arc-game__next', label, null);
  const row = el('div', 'arc-row');
  row.append(next);
  card.append(row);
  next.focus({ preventScroll: true });
  next.scrollIntoView?.({ block: 'nearest' });
  await r.until(next);
  r.game.sound.tap();
}

/** A wobble on an element (CSS turns it off for reduced motion). */
export function shake(e) {
  if (!e) return;
  e.classList.remove('is-shake');
  void e.offsetWidth;
  e.classList.add('is-shake');
}
/** A short glow on an element. */
export function flash(e, cls = 'is-flash', ms = 900) {
  if (!e) return;
  e.classList.remove(cls);
  void e.offsetWidth;
  e.classList.add(cls);
  setTimeout(() => e.classList.remove(cls), ms);
}

/**
 * Arrow keys move the focus around a grid of cells (roving tabindex: one cell is in the tab
 * order, the rest are reached with the arrows; Home / End jump to the ends of a row).
 */
export function gridKeys(cells, cols) {
  const focus = (i) => {
    cells.forEach((c, k) => c.setAttribute('tabindex', k === i ? '0' : '-1'));
    cells[i].focus();
  };
  cells.forEach((c, i) => {
    c.setAttribute('tabindex', i === 0 ? '0' : '-1');
    c.addEventListener('keydown', (e) => {
      const row = Math.floor(i / cols), col = i % cols, rows = Math.ceil(cells.length / cols);
      let to = null;
      if (e.key === 'ArrowRight' && col < cols - 1 && i + 1 < cells.length) to = i + 1;
      else if (e.key === 'ArrowLeft' && col > 0) to = i - 1;
      else if (e.key === 'ArrowDown' && row < rows - 1 && i + cols < cells.length) to = i + cols;
      else if (e.key === 'ArrowUp' && row > 0) to = i - cols;
      else if (e.key === 'Home') to = row * cols;
      else if (e.key === 'End') to = Math.min(cells.length - 1, row * cols + cols - 1);
      if (to == null) return;
      e.preventDefault();
      focus(to);
    });
  });
  return focus;
}

/** Arrow keys (and Home / End) move between a row of buttons. */
export function rowKeys(items) {
  items.forEach((b, i) => b.addEventListener('keydown', (e) => {
    const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to == null || !items[to]) return;
    e.preventDefault();
    items[to].focus();
  }));
}

/** Progress dots: n done of total. */
export function dots(n, total, label) {
  const d = el('div', 'arc-dots', null, { 'aria-label': label });
  for (let k = 0; k < total; k++) d.append(el('i', k < n ? 'is-done' : k === n ? 'is-on' : ''));
  return d;
}

/** Are we still in the lesson (the child may leave in the middle of an animation)? */
export const alive = (r) => r.root?.isConnected !== false;
