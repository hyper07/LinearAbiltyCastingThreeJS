/**
 * Sort it out (the Great Tree's biology game): picture cards go into 2–4 labelled groups —
 * mammals, birds and fish; living and non-living; odd and even. Tap a card, then its group, or
 * drag it there; with the keyboard, Enter picks a card up, the arrows (or 1–4) choose a group.
 * With a `rule` question the groups start as mysteries holding a few examples: guess how they were
 * sorted, then sort the rest. A miss is never a loss: the card goes back, a hint shows, and after
 * two misses the right group glows.
 *
 * Data (content/games.js sortProblems): sort { q, groups: [{ id, label, emoji? }], items: [{ label, emoji, group, given? }], rule? }
 */
import { el, button } from '../../ui/dom.js';
import { t as tr } from '../../i18n/index.js';
import { shuffled, sortsInto } from '../../content/games.js';
import { gameCard, note, scorer, finish, shake, flash, rowKeys, alive, gate, wait } from './kit.js';

const COLORS = ['#ffd6a5', '#bde0fe', '#caffbf', '#ffc6ff'];

export async function playSort(r) {
  const s = r.lesson.sort;
  const award = scorer(r);
  const mystery = Boolean(s.rule);
  const { card, head, body, fb } = gameCard(r, 'sort', { kicker: tr(mystery ? 'act.sort.ruleKicker' : 'act.sort.kicker'), title: s.q, how: tr(mystery ? 'act.sort.ruleHow' : 'act.sort.how') });
  r.say(tr(mystery ? 'act.sort.ruleSay' : 'act.sort.say'), { line: mystery ? 't.act.sort.ruleSay' : 't.act.sort.say' });
  r.ctx = { step: tr('act.sort.ctx', { q: s.q }), hint: s.rule?.hint ?? tr('act.sort.how'), worked: s.groups.map((g) => `${g.label}: ${s.items.filter((i) => i.group === g.id).map((i) => i.label).join(', ')}`).join(' · ') };

  const placed = new Map(s.items.filter((i) => i.given).map((i) => [i, i.group]));
  let tray = shuffled(s.items.filter((i) => !i.given));
  let held = null;
  let revealed = !mystery;
  let fresh = null; // the card just sorted: its chip pops in
  const misses = new Map();
  let end = null;
  const done = () => end?.open();

  const bins = el('div', 'arc-sort__bins');
  const trayEl = el('div', 'arc-sort__tray', null, { role: 'group', 'aria-label': tr('act.sort.trayAria') });
  body.append(bins, trayEl);

  const binEls = s.groups.map((g, gi) => {
    const b = button('arc-sort__bin', null, () => drop(gi), { 'data-group': g.id });
    b.style.setProperty('--bin', COLORS[gi % COLORS.length]);
    b.append(el('span', 'arc-sort__label'), el('span', 'arc-sort__items'));
    bins.append(b);
    return b;
  });
  rowKeys(binEls);
  // Escape puts a held card back (and doesn't leave the lesson).
  for (const b of binEls) {
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !held) return;
      e.stopPropagation();
      held = null;
      draw();
      trayEl.querySelector('button')?.focus();
    });
  }

  const draw = () => {
    s.groups.forEach((g, gi) => {
      const b = binEls[gi];
      const inside = s.items.filter((it) => placed.get(it) === g.id);
      b.querySelector('.arc-sort__label').textContent = revealed ? `${g.emoji ? `${g.emoji} ` : ''}${g.label}` : `❓ ${tr('act.sort.mystery', { n: gi + 1 })}`;
      b.querySelector('.arc-sort__items').replaceChildren(...inside.map((it) => el('span', `arc-sort__chip${it.given ? ' is-given' : ''}${it === fresh ? ' is-new' : ''}`, it.emoji, { title: it.label })));
      b.setAttribute('aria-label', tr('act.sort.binAria', { n: gi + 1, group: revealed ? g.label : tr('act.sort.mystery', { n: gi + 1 }), count: inside.length }));
      b.classList.toggle('is-ready', Boolean(held));
      b.disabled = !revealed;
    });
    trayEl.replaceChildren();
    trayEl.hidden = !revealed;
    for (const it of tray) {
      const c = button(`arc-sort__card${held === it ? ' is-held' : ''}`, null, () => pick(it), { 'aria-pressed': String(held === it), 'aria-label': tr('act.sort.cardAria', { item: it.label }) });
      c.append(el('span', 'arc-sort__emoji', it.emoji, { 'aria-hidden': 'true' }), el('span', 'arc-sort__name', it.label));
      dragify(c, it);
      c.addEventListener('keydown', (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= s.groups.length) {
          e.preventDefault();
          e.stopPropagation();
          held = it;
          drop(n - 1);
        }
      });
      trayEl.append(c);
    }
    rowKeys([...trayEl.children]);
  };

  const pick = (it) => {
    if (dragging) return;
    held = held === it ? null : it;
    r.game.sound.tap();
    draw();
    if (held) {
      note(fb, tr('act.sort.held', { item: it.label, n: s.groups.length }));
      binEls[0].focus();
    }
  };

  const drop = (gi) => {
    if (!held || !revealed) return;
    const it = held, g = s.groups[gi], bin = binEls[gi];
    held = null;
    if (sortsInto(it, g.id)) {
      placed.set(it, g.id);
      fresh = it;
      tray = tray.filter((x) => x !== it);
      r.game.sound.toy('pop');
      if (!misses.get(it)) award();
      draw();
      flash(bin, 'is-yes');
      binEls.forEach((b) => b.classList.remove('is-hint'));
      if (!tray.length) return done();
      note(fb, tr('act.sort.yes', { item: it.label, group: g.label }), 'good');
      r.buddy.cheer(0.6);
      trayEl.querySelector('button')?.focus();
    } else {
      const m = (misses.get(it) ?? 0) + 1;
      misses.set(it, m);
      draw();
      const right = binEls[s.groups.findIndex((x) => x.id === it.group)];
      if (m >= 2) {
        right.classList.add('is-hint');
        r.oops(bin, fb, tr('act.sort.look', { item: it.label, group: s.groups.find((x) => x.id === it.group).label }));
      } else r.oops(bin, fb, `${tr('act.sort.no', { item: it.label, group: g.label })}${it.hint ? ` 💡 ${it.hint}` : ''}`);
      const again = [...trayEl.children].find((c) => c.getAttribute('aria-label') === tr('act.sort.cardAria', { item: it.label }));
      shake(again);
      again?.focus();
    }
  };

  // Drag a card onto a group (mouse or touch); a short tap is still a tap.
  let dragging = false;
  function dragify(c, it) {
    c.addEventListener('pointerdown', (e) => {
      if (!revealed || e.button > 0) return;
      const x0 = e.clientX, y0 = e.clientY;
      let ghost = null;
      const move = (ev) => {
        if (!ghost && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 10) return;
        if (!ghost) {
          dragging = true;
          held = it;
          ghost = el('div', 'arc-sort__ghost', it.emoji, { 'aria-hidden': 'true' });
          document.body.append(ghost);
          c.classList.add('is-dragging');
          binEls.forEach((b) => b.classList.add('is-ready'));
        }
        ghost.style.left = `${ev.clientX}px`;
        ghost.style.top = `${ev.clientY}px`;
        const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.arc-sort__bin');
        binEls.forEach((b) => b.classList.toggle('is-over', b === over));
      };
      const up = (ev) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (!ghost) return;
        ghost.remove();
        binEls.forEach((b) => b.classList.remove('is-over'));
        const over = ev.type === 'pointerup' ? document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.arc-sort__bin') : null;
        const gi = binEls.indexOf(over);
        if (gi >= 0) drop(gi);
        else {
          held = null;
          draw();
        }
        // The click that follows a drag is not a tap.
        setTimeout(() => (dragging = false), 0);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
  }

  draw();
  end = mystery ? null : gate(r);
  if (mystery) {
    // Find the rule first: the groups hold their examples; how were they sorted?
    const ask = el('div', 'arc-sort__rule');
    ask.append(el('h3', 'arc-game__sub', s.rule.q));
    const ruleFb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
    const ruled = gate(r);
    ask.append(r.choices(s.rule, ruleFb, () => ruled.open(), { practice: true, onResult: (right, m) => right && !m && award() }), ruleFb);
    body.insertBefore(ask, trayEl);
    ask.querySelector('button')?.focus();
    await ruled.wait;
    await wait(r.game.reducedMotion ? 400 : 1600);
    if (!alive(r)) return;
    ask.remove();
    revealed = true;
    head.querySelector('.arc-card__kicker').textContent = tr('act.sort.kicker');
    head.querySelector('.arc-game__how').textContent = tr('act.sort.how');
    draw();
    binEls.forEach((b, i) => setTimeout(() => flash(b, 'is-yes'), i * 120));
    note(fb, tr('act.sort.nowSort'), 'good');
    end = gate(r);
  }
  trayEl.querySelector('button')?.focus();
  await end.wait;
  r.good(bins, fb, tr('act.sort.done'));
  await finish(r, card);
}
