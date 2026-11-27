/**
 * Dig site (the Desert's archaeology game): a grid of sand. Tap a square to brush it — two strokes
 * clear it — and see what is buried. Each find opens a question about it, or a code written in
 * picture symbols to crack with a key (any language's letters or digits). After a few empty
 * squares something glints where a find is, so nobody digs forever. Keyboard: the arrow keys move
 * round the site, Enter or Space brushes; in a code, tap the key or type the letter.
 *
 * Data (content/games.js digProblems): dig { q, w, h, finds: [{ at: [x, y], emoji, label, text?, question | decode }] }
 */
import { el, button } from '../../ui/dom.js';
import { t as tr } from '../../i18n/index.js';
import { cipherFor, decodes, hashOf, rng } from '../../content/games.js';
import { gameCard, note, scorer, finish, shake, flash, gridKeys, rowKeys, gate, wait, alive } from './kit.js';

const DEPTH = 2;
const PEBBLES = ['', '', '·', '∴', '🦴', '🐚', '', ''];

export async function playDig(r) {
  const d = r.lesson.dig;
  const award = scorer(r);
  const { card, body, fb } = gameCard(r, 'dig', { kicker: tr('act.dig.kicker'), title: d.q, how: tr('act.dig.how') });
  r.say(tr('act.dig.say'), { line: 't.act.dig.say' });
  r.ctx = { step: tr('act.dig.ctx', { q: d.q }), hint: tr('act.dig.how') };
  const rand = rng(hashOf(r.lesson.id));

  const side = el('div', 'arc-dig__side');
  const shelf = el('div', 'arc-dig__shelf', null, { 'aria-label': tr('act.dig.finds', { n: 0, total: d.finds.length }) });
  const site = el('div', 'arc-dig__site', null, { role: 'grid', 'aria-label': tr('act.dig.siteAria', { w: d.w, h: d.h }) });
  site.style.setProperty('--cols', d.w);
  const panel = el('div', 'arc-dig__panel', null, { hidden: true });
  side.append(el('p', 'arc-dig__shelfTitle', tr('act.dig.shelf')), shelf);
  const layout = el('div', 'arc-dig');
  layout.append(site, side);
  body.append(layout, panel);

  const findAt = new Map(d.finds.map((f) => [`${f.at[0]},${f.at[1]}`, f]));
  const cells = [];
  const solved = new Set();
  let empties = 0;
  let open = null;
  const drawShelf = () => {
    shelf.replaceChildren(...d.finds.map((f) => el('span', `arc-dig__slot${solved.has(f) ? ' is-got' : ''}`, solved.has(f) ? f.emoji : '❔', { title: solved.has(f) ? f.label : '' })));
    shelf.setAttribute('aria-label', tr('act.dig.finds', { n: solved.size, total: d.finds.length }));
  };
  drawShelf();

  for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
    const find = findAt.get(`${x},${y}`) ?? null;
    const c = { x, y, depth: DEPTH, find, pebble: find ? '' : PEBBLES[Math.floor(rand() * PEBBLES.length)] };
    const row = el('div', 'arc-dig__cellwrap', null, { role: 'gridcell' });
    c.b = button('arc-dig__cell', null, () => brush(c));
    c.b.append(el('span', 'arc-dig__under', null, { 'aria-hidden': 'true' }));
    row.append(c.b);
    site.append(row);
    cells.push(c);
  }
  const cellLabel = (c) => tr('act.dig.cellAria', { col: c.x + 1, row: c.y + 1, state: c.depth > 0 ? tr('act.dig.sand') : c.find ? c.find.label : tr('act.dig.dug') });
  const drawCell = (c) => {
    c.b.dataset.depth = String(c.depth);
    c.b.querySelector('.arc-dig__under').textContent = c.depth > 0 ? '' : c.find ? c.find.emoji : c.pebble;
    c.b.setAttribute('aria-label', cellLabel(c));
    c.b.classList.toggle('is-find', !c.depth && Boolean(c.find));
    c.b.classList.toggle('is-solved', Boolean(c.find && solved.has(c.find)));
  };
  cells.forEach(drawCell);
  gridKeys(cells.map((c) => c.b), d.w);

  // One thing to wait for at a time (leaving the lesson stops whichever it is): a find uncovered, then solving it.
  let waiter = null, uncovered = null;
  function brush(c) {
    if (open) return;
    if (c.depth === 0) {
      if (c.find && !solved.has(c.find)) found(c);
      return;
    }
    c.depth--;
    r.game.sound.brush();
    flash(c.b, 'is-brushed', 400);
    c.b.classList.remove('is-glint');
    drawCell(c);
    if (c.depth > 0) return;
    if (c.find) {
      empties = 0;
      r.game.sound.toy('gem');
      return found(c);
    }
    empties++;
    // Nothing here: after a few empty squares, something glints where a find is buried.
    if (empties >= 4) {
      const hidden = cells.filter((x) => x.find && x.depth > 0);
      if (hidden.length) {
        const g = hidden[Math.floor(rand() * hidden.length)];
        g.b.classList.add('is-glint');
        note(fb, tr('act.dig.glint'));
        empties = 0;
      }
    } else note(fb, tr('act.dig.nothing'));
  }
  const found = (c) => {
    uncovered = c;
    open = c.find;
    waiter?.open();
  };

  /** A find's card: what it is, then its question or its code. */
  async function solveFind(c) {
    const f = c.find;
    // One thing at a time: the find's card takes the dig site's place until it is solved.
    layout.hidden = true;
    card.classList.add('is-finding');
    panel.hidden = false;
    panel.replaceChildren();
    const head = el('div', 'arc-dig__found');
    const words = el('div', null);
    words.append(el('p', 'arc-card__kicker', tr('act.dig.found')), el('h3', 'arc-game__sub', f.label));
    if (f.text) words.append(el('p', 'arc-dig__text', f.text));
    head.append(el('span', 'arc-dig__big', f.emoji, { 'aria-hidden': 'true' }), words);
    panel.append(head);
    const pfb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
    const solvedIt = gate(r);
    if (f.question) {
      const q = f.question;
      r.ctx = { step: tr('act.dig.ctxFind', { label: f.label, q: q.q }), hint: q.hint, worked: q.explain };
      panel.append(el('p', 'arc-q arc-dig__q', q.q), r.choices(q, pfb, () => solvedIt.open(), { practice: true, onResult: (right, m) => right && !m && award() }), pfb);
      panel.querySelector('.arc-choice')?.focus({ preventScroll: true });
    } else decodePuzzle(f, panel, pfb, () => solvedIt.open());
    panel.scrollIntoView?.({ block: 'nearest', behavior: r.game.reducedMotion ? 'auto' : 'smooth' });
    await solvedIt.wait;
    solved.add(f);
    drawCell(c);
    drawShelf();
    flash(shelf.children[d.finds.indexOf(f)], 'is-yes');
    const more = solved.size < d.finds.length;
    const back = button('arc-btn arc-btn--primary arc-btn--big', more ? tr('act.dig.keepDigging') : tr('act.dig.allFound'), null);
    panel.append(back);
    back.focus({ preventScroll: true });
    await r.until(back);
    r.game.sound.tap();
    panel.hidden = true;
    layout.hidden = false;
    card.classList.remove('is-finding');
    open = null;
    if (more) {
      note(fb, tr('act.dig.finds', { n: solved.size, total: d.finds.length }));
      c.b.focus({ preventScroll: true });
    }
  }

  /** The symbol code: fill each slot by tapping its letter in the key (or typing it). */
  function decodePuzzle(f, host, pfb, done) {
    const dc = f.decode;
    const cipher = cipherFor(dc.message, hashOf(`${r.lesson.id}:${d.finds.indexOf(f)}`));
    r.ctx = { step: tr('act.dig.ctxDecode', { q: dc.q }), hint: tr('act.dig.decodeHow'), worked: `${dc.message}. ${dc.explain}` };
    host.append(el('p', 'arc-card__kicker', tr('act.dig.decodeKicker')), el('p', 'arc-q arc-dig__q', dc.q), el('p', 'arc-hint', tr('act.dig.decodeHow')));
    const code = el('div', 'arc-code', null, { 'aria-label': tr('act.dig.codeAria') });
    const slots = cipher.code.map((c, i) => {
      if (c.space) {
        code.append(el('span', 'arc-code__space'));
        return null;
      }
      const s = el('span', 'arc-code__cell', null, { 'aria-label': tr('act.dig.slotAria', { n: i + 1, sym: c.sym }) });
      s.append(el('span', 'arc-code__sym', c.sym, { 'aria-hidden': 'true' }), el('span', 'arc-code__ch', ''));
      code.append(s);
      return s;
    });
    const keyBox = el('div', 'arc-code__key', null, { role: 'group', 'aria-label': tr('act.dig.key') });
    const keys = cipher.key.map((k) => {
      const b = button('arc-code__pair', null, () => tryCh(k.ch, b), { 'aria-label': tr('act.dig.keyAria', { sym: k.sym, ch: k.ch }) });
      b.append(el('span', 'arc-code__sym', k.sym, { 'aria-hidden': 'true' }), el('span', 'arc-code__eq', '=', { 'aria-hidden': 'true' }), el('strong', null, k.ch));
      keyBox.append(b);
      return { ...k, b };
    });
    rowKeys(keys.map((k) => k.b));
    host.append(code, el('p', 'arc-dig__keyTitle', `🔑 ${tr('act.dig.key')}`), keyBox, pfb);
    let pos = cipher.code.findIndex((c) => !c.space), miss = 0, missesAll = 0;
    const mark = () => slots.forEach((s, i) => s?.classList.toggle('is-now', i === pos));
    mark();
    keys[0]?.b.focus({ preventScroll: true });
    const typed = (e) => {
      if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = keys.find((x) => x.ch === e.key.toUpperCase());
      if (!k) return;
      // Handled here: the letter reaches no other key handler (the platform's own shortcuts).
      e.preventDefault();
      e.stopPropagation();
      tryCh(k.ch, k.b);
    };
    host.addEventListener('keydown', typed);
    function tryCh(ch, b) {
      if (pos < 0) return;
      if (decodes(cipher, pos, ch)) {
        slots[pos].querySelector('.arc-code__ch').textContent = ch;
        slots[pos].classList.add('is-done');
        slots[pos].setAttribute('aria-label', tr('act.dig.slotDone', { n: pos + 1, sym: cipher.code[pos].sym, ch }));
        r.game.sound.tap();
        keys.forEach((k) => k.b.classList.remove('is-hint'));
        miss = 0;
        pos = cipher.code.findIndex((c, i) => i > pos && !c.space);
        mark();
        if (pos < 0) {
          host.removeEventListener('keydown', typed);
          keys.forEach((k) => (k.b.disabled = true));
          if (!missesAll) award();
          r.good(code, pfb, tr('act.dig.cracked', { message: dc.message, explain: dc.explain }));
          done();
        } else note(pfb, '');
        return;
      }
      miss++;
      missesAll++;
      shake(b);
      const want = cipher.code[pos].sym;
      if (miss >= 2) keys.find((k) => k.sym === want)?.b.classList.add('is-hint');
      r.oops(null, pfb, tr('act.dig.lookFor', { sym: want }));
    }
  }

  cells[0].b.focus({ preventScroll: true });
  while (solved.size < d.finds.length) {
    waiter = gate(r);
    await waiter.wait;
    waiter = null;
    await solveFind(uncovered);
  }
  await wait(100);
  if (!alive(r)) return;
  r.good(shelf, fb, tr('act.dig.done'));
  await finish(r, card);
}
