import { ELEMENT_META } from '../config/settings.js';
import { POTIONS, SKILL_MAX_RANK, SKILL_RANK } from '../items/Items.js';
import { potionOf } from '../items/hotbar.js';
import { kindIcon } from './itemIcons.js';
import { SLOT_COUNT, prerequisite, spellName, treeFor } from '../platform/skill/tree.js';
import { platform } from '../platform/index.js';
import { ELEMENT_SIGILS } from './glyphs.js';
import { skillDetails } from '../platform/skill/info.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const SVG_NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z"/><path d="M12 6v14"/></svg>';
/** Circumference of the rank ring (r = 30 in a 68×68 box). */
const RING = 2 * Math.PI * 30;

/**
 * One class's skill tree and its keys.
 *
 * Top: keys 1–9 (skills, and the potions they share the bar with). Below, the tree itself: the class crest at the root, a
 * line to each branch, and down each branch its skills tier by tier, joined
 * by lines that light up once the rank a skill needs is reached. Each skill
 * is a medallion with its symbol, a ring that fills with its rank, and
 * badges for its key, a lock or a skill book ready to read.
 *
 * Hover a skill (or focus it) to see everything about it in the detail
 * panel; click it to keep it there. The panel is where a skill is learned or
 * ranked up from a book and put on a key.
 *
 * Used twice: in the K panel during a run, and in the main menu's Skill Tree
 * tab for whichever class is picked there.
 */
export class SkillTreeView {
  /**
   * @param {HTMLElement} host
   * @param {import('../items/Profile.js').Profile} profile
   * @param {{ classId?: () => string, onMessage?: (text: string) => void }} [options]
   */
  constructor(host, profile, { classId, onMessage } = {}) {
    this.host = host;
    this.profile = profile;
    this.classId = classId ?? (() => profile.classId);
    this.onMessage = onMessage ?? (() => {});
    this.selectedSlot = null;
    /** The skill whose details stay in the panel (clicked). */
    this.pinned = null;
    /** The skill under the pointer, shown instead while hovered. */
    this.hovered = null;
    this._observer = null;
  }

  _say(text) {
    this.onMessage(text);
  }

  render() {
    const p = this.profile;
    const classId = this.classId();
    const tree = treeFor(classId);
    const slots = p.slotsOf(classId);
    const all = tree.branches.flatMap((b) => b.spells);
    if (this.selectedSlot == null || this.selectedSlot >= SLOT_COUNT) {
      const free = slots.indexOf(null);
      this.selectedSlot = free >= 0 ? free : 0;
    }
    if (!all.includes(this.pinned)) this.pinned = all.find((e) => p.rank(e, classId) > 0) ?? all[0] ?? null;
    if (!all.includes(this.hovered)) this.hovered = null;

    const root = el('div', 'skilltree');

    /* --- the keys (1–9): skills and potions --- */
    const keys = el('div', 'skilltree__keys');
    slots.forEach((element, i) => {
      const key = el('button', 'skilltree__key');
      key.type = 'button';
      const potion = potionOf(element);
      if (i === this.selectedSlot) key.classList.add('is-selected');
      if (potion) key.style.setProperty('--accent', POTIONS[potion].color);
      else if (element) key.style.setProperty('--accent', ELEMENT_META[element]?.accent ?? '');
      else key.classList.add('is-empty');
      key.append(el('kbd', null, String(i + 1)));
      const glyph = el('span', 'skilltree__glyph');
      glyph.innerHTML = potion ? kindIcon('potion') : element ? ELEMENT_SIGILS[element] ?? '' : '';
      const name = potion ? POTIONS[potion].name : element ? spellName(element) : 'Empty';
      key.append(glyph, el('span', 'skilltree__key-name', name));
      key.title = element ? `Key ${i + 1}: ${name}\nClick to see it · right-click to empty the key` : `Key ${i + 1} is empty — pick a learned skill below, then “Put on key ${i + 1}”`;
      key.addEventListener('click', () => {
        this.selectedSlot = i;
        if (element && !potion) this.pinned = element;
        this.render();
      });
      key.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        p.clearSlot(i, classId);
        this.selectedSlot = i;
        this.render();
      });
      keys.append(key);
    });
    const hint = el(
      'p',
      'skilltree__hint',
      tree.note ??
        (tree.resource === 'rage' ? 'Fights with Rage: tier-1 skills and melee hits build it, tier-2 skills spend it. ' : '') +
          `Hover a skill for its details, click to keep them. Skill books teach a skill and raise its rank (max ${SKILL_MAX_RANK}); a skill lower in a branch needs the one above it at the rank on the line.`
    );

    /* --- the tree --- */
    const main = el('div', 'skilltree__main');
    const board = el('div', 'skilltree__board');
    board.style.setProperty('--branches', tree.branches.length);
    const tiers = Math.max(...tree.branches.map((b) => b.spells.length));
    board.style.setProperty('--tiers', tiers);
    const wires = svgEl('svg', { class: 'skilltree__wires', 'aria-hidden': 'true' });
    board.append(wires);

    const character = platform.characters.get(classId);
    const crest = el('div', 'skilltree__crest');
    crest.style.gridColumn = `1 / -1`;
    crest.append(el('span', 'skilltree__crest-icon', character?.icon ?? '✦'));
    const crestText = el('div');
    crestText.append(el('strong', null, character?.label ?? 'Caster'), el('small', null, tree.resource === 'rage' ? 'Physical skills · Rage' : `${all.length} skills · ${tree.branches.length} branches`));
    crest.append(crestText);
    board.append(crest);

    const links = [];
    tree.branches.forEach((branch, b) => {
      const banner = el('div', 'skilltree__banner', branch.label);
      banner.style.setProperty('--branch', branch.accent);
      banner.style.gridColumn = String(b + 1);
      banner.style.gridRow = '2';
      board.append(banner);
      links.push({ from: crest, to: banner, color: branch.accent, met: true, root: true });
      let above = banner;
      branch.spells.forEach((element, t) => {
        const node = this._node(element, t + 1, classId, slots);
        node.style.gridColumn = String(b + 1);
        node.style.gridRow = String(t + 3);
        board.append(node);
        const need = t > 0 ? prerequisite(classId, element) : null;
        const met = !need || p.rank(need.element, classId) >= need.rank;
        links.push({ from: above, to: node.querySelector('.skilltree__medal'), color: branch.accent, met, label: need ? `rank ${need.rank}` : null, first: t === 0 });
        above = node; // the next line leaves from under the name and rank
      });
    });

    this.detail = el('aside', 'skilltree__detail');
    main.append(board, this.detail);
    root.append(keys, hint, main);
    this.host.replaceChildren(root);
    this._renderDetail();

    // Lines are drawn from where the boxes actually landed, and again
    // whenever the board changes size (a hidden menu tab has no size yet).
    const draw = () => this._wire(board, wires, links);
    this._observer?.disconnect();
    this._observer = new ResizeObserver(draw);
    this._observer.observe(board);
    requestAnimationFrame(draw);
  }

  /** Draw the connectors between crest, banners and medallions. */
  _wire(board, wires, links) {
    const box = board.getBoundingClientRect();
    if (!box.width) return;
    wires.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    wires.replaceChildren();
    const defs = svgEl('defs');
    const glow = svgEl('filter', { id: 'skilltree-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
    glow.append(svgEl('feGaussianBlur', { stdDeviation: '2.2' }));
    defs.append(glow);
    wires.append(defs);
    for (const link of links) {
      const a = link.from.getBoundingClientRect();
      const b = link.to.getBoundingClientRect();
      const x1 = a.left + a.width / 2 - box.left;
      const y1 = a.bottom - box.top;
      const x2 = b.left + b.width / 2 - box.left;
      const y2 = b.top - box.top;
      const mid = (y1 + y2) / 2;
      const d = link.root ? `M${x1} ${y1} C${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}` : `M${x1} ${y1} L${x2} ${y2}`;
      const cls = `skilltree__wire${link.met ? ' is-met' : ''}${link.root ? ' is-root' : ''}`;
      if (link.met && !link.root) wires.append(svgEl('path', { d, class: 'skilltree__wire-glow', stroke: link.color, filter: 'url(#skilltree-glow)' }));
      wires.append(svgEl('path', { d, class: cls, stroke: link.met ? link.color : '#4a5361' }));
      if (link.label) {
        const g = svgEl('g', { class: `skilltree__wire-tag${link.met ? ' is-met' : ''}` });
        const w = 46;
        g.append(svgEl('rect', { x: x2 - w / 2, y: mid - 8, width: w, height: 16, rx: 8, stroke: link.met ? link.color : '#4a5361' }));
        const text = svgEl('text', { x: x2, y: mid + 3.5, 'text-anchor': 'middle' });
        text.textContent = link.label;
        g.append(text);
        wires.append(g);
      }
    }
  }

  _node(element, tier, classId, slots) {
    const p = this.profile;
    const rank = p.rank(element, classId);
    const status = p.bookStatus(element, classId);
    const books = p.booksFor(element);
    const need = prerequisite(classId, element);
    const locked = need && p.rank(need.element, classId) < need.rank;
    const meta = ELEMENT_META[element] ?? {};

    const node = el('button', 'skilltree__node');
    node.type = 'button';
    node.style.setProperty('--accent', meta.accent ?? '#ffffff');
    node.classList.add(rank ? 'is-learned' : locked ? 'is-locked' : 'is-open');
    if (books && status.ok) node.classList.add('has-book');
    if (element === this.pinned) node.classList.add('is-pinned');
    node.setAttribute('aria-label', `${spellName(element)}, tier ${tier}, ${rank ? `rank ${rank} of ${SKILL_MAX_RANK}` : locked ? 'locked' : 'not learned'}`);

    const medal = el('span', 'skilltree__medal');
    const ring = svgEl('svg', { class: 'skilltree__ring', viewBox: '0 0 68 68', 'aria-hidden': 'true' });
    ring.append(svgEl('circle', { cx: 34, cy: 34, r: 30, class: 'skilltree__ring-track' }));
    ring.append(svgEl('circle', { cx: 34, cy: 34, r: 30, class: 'skilltree__ring-fill', 'stroke-dasharray': `${(RING * rank) / SKILL_MAX_RANK} ${RING}` }));
    const glyph = el('span', 'skilltree__glyph');
    glyph.innerHTML = ELEMENT_SIGILS[element] ?? ELEMENT_SIGILS[meta.base] ?? '';
    medal.append(ring, glyph);
    const onKey = slots.indexOf(element);
    if (onKey >= 0) medal.append(el('kbd', 'skilltree__badge skilltree__badge--key', String(onKey + 1)));
    if (locked) {
      const lock = el('span', 'skilltree__badge skilltree__badge--lock');
      lock.innerHTML = LOCK;
      medal.append(lock);
    } else if (books && status.ok) {
      const book = el('span', 'skilltree__badge skilltree__badge--book');
      book.innerHTML = BOOK;
      medal.append(book);
    }
    node.append(medal, el('span', 'skilltree__name', spellName(element)), el('span', 'skilltree__rank', rank ? `${rank} / ${SKILL_MAX_RANK}` : locked ? 'Locked' : 'Not learned'));

    const show = () => {
      if (this.hovered === element) return;
      this.hovered = element;
      this._renderDetail();
    };
    const hide = () => {
      if (this.hovered !== element) return;
      this.hovered = null;
      this._renderDetail();
    };
    node.addEventListener('pointerenter', show);
    node.addEventListener('pointerleave', hide);
    node.addEventListener('focus', show);
    node.addEventListener('blur', hide);
    node.addEventListener('click', () => {
      this.pinned = element;
      this.hovered = null;
      this.render();
      this.host.querySelector(`.skilltree__node[data-skill="${element}"]`)?.focus({ preventScroll: true });
    });
    node.dataset.skill = element;
    return node;
  }

  /** The detail panel: the hovered skill, else the pinned one. */
  _renderDetail() {
    if (!this.detail) return;
    const element = this.hovered ?? this.pinned;
    this.detail.replaceChildren();
    if (!element) return;
    const p = this.profile;
    const classId = this.classId();
    const tree = treeFor(classId);
    const rank = p.rank(element, classId);
    const info = skillDetails(element, rank);
    const branch = tree.branches.find((b) => b.spells.includes(element));
    const tier = branch ? branch.spells.indexOf(element) + 1 : 1;
    const need = prerequisite(classId, element);
    const unlocks = branch?.spells[tier];
    const status = p.bookStatus(element, classId);
    const books = p.booksFor(element);
    const slots = p.slotsOf(classId);
    const d = this.detail;
    d.style.setProperty('--accent', info.accent);
    d.classList.toggle('is-preview', Boolean(this.hovered) && this.hovered !== this.pinned);

    const head = el('header', 'skilltree__detail-head');
    const glyph = el('span', 'skilltree__detail-glyph');
    glyph.innerHTML = ELEMENT_SIGILS[element] ?? ELEMENT_SIGILS[ELEMENT_META[element]?.base] ?? '';
    const title = el('div');
    title.append(el('strong', null, info.name), el('small', null, `${branch?.label ?? ''} · Tier ${tier} · ${info.physical ? 'Physical skill' : 'Spell'}`));
    head.append(glyph, title);
    d.append(head);

    const rankRow = el('div', 'skilltree__detail-rank');
    const pips = el('div', 'skilltree__pips');
    for (let r = 1; r <= SKILL_MAX_RANK; r++) pips.append(el('i', r <= rank ? 'is-on' : ''));
    rankRow.append(el('span', null, rank ? `Rank ${rank} / ${SKILL_MAX_RANK}` : 'Not learned'), pips);
    d.append(rankRow);

    d.append(el('p', 'skilltree__detail-text', info.description));

    const stats = el('dl', 'skilltree__detail-stats');
    const row = (label, value, next) => {
      stats.append(el('dt', null, label));
      const dd = el('dd', null, value);
      if (next) dd.append(el('em', null, ` → ${next}`));
      stats.append(dd);
    };
    row('Aim', info.cast);
    row('Reach', info.reach);
    row('Damage', String(info.damage), info.next ? String(info.next.damage) : null);
    row('Cooldown', `${info.cooldown} s`, info.next && info.next.cooldown !== info.cooldown ? `${info.next.cooldown} s` : null);
    d.append(stats);
    if (info.next) d.append(el('p', 'skilltree__detail-note', `Next rank: +${SKILL_RANK.damage}% damage, −${SKILL_RANK.cooldown}% cooldown (the → numbers). Gear and class bonuses add on top.`));

    if (info.effects.length) {
      const list = el('ul', 'skilltree__detail-effects');
      for (const line of info.effects) list.append(el('li', null, line));
      d.append(list);
    }

    const reqs = el('div', 'skilltree__detail-reqs');
    if (need) {
      const met = p.rank(need.element, classId) >= need.rank;
      reqs.append(el('span', met ? 'is-met' : 'is-warn', `${met ? '✓' : '✗'} Needs ${spellName(need.element)} at rank ${need.rank}`));
    } else reqs.append(el('span', 'is-met', '✓ Top of its branch — no requirement'));
    if (unlocks) {
      const nextNeed = prerequisite(classId, unlocks);
      reqs.append(el('span', null, `Unlocks ${spellName(unlocks)} at rank ${nextNeed?.rank ?? tier + 1}`));
    }
    d.append(reqs);

    const actions = el('div', 'skilltree__detail-actions');
    if (books && status.ok) {
      const read = el('button', 'skilltree__read', `${rank ? 'Rank up' : 'Learn'} — read a book (${books} in bag)`);
      read.type = 'button';
      read.addEventListener('click', () => {
        const book = p.bag.find((it) => it.type === 'book' && it.element === element);
        this._say(p.read(book.uid, classId).message);
        this.pinned = element;
        this.render();
      });
      actions.append(read);
    } else {
      const why = books ? status.reason : rank >= SKILL_MAX_RANK ? 'Fully ranked' : `${info.physical ? 'Manual' : 'Tome'} of ${spellName(element)}: none in the bag — monsters and merchants have them`;
      actions.append(el('p', 'skilltree__detail-note', why));
    }
    if (rank) {
      const keyRow = el('div', 'skilltree__detail-keys');
      keyRow.append(el('span', null, 'Put on key'));
      slots.forEach((onKey, i) => {
        const b = el('button', onKey === element ? 'is-on' : '', String(i + 1));
        b.type = 'button';
        const there = potionOf(onKey) ? POTIONS[potionOf(onKey)].name : onKey && spellName(onKey);
        b.title = onKey === element ? `${spellName(element)} is on key ${i + 1}` : onKey ? `Replace ${there} on key ${i + 1}` : `Key ${i + 1} is empty`;
        b.addEventListener('click', () => {
          p.setSlot(i, element, classId);
          this.selectedSlot = i;
          this.pinned = element;
          this.render();
        });
        keyRow.append(b);
      });
      actions.append(keyRow);
    }
    d.append(actions);
  }
}

/** The in-run window (K): the tree for the class being played. */
export class SkillTreePanel {
  /**
   * @param {HTMLElement} host
   * @param {import('../items/Profile.js').Profile} profile
   * @param {{ onMessage?: (text: string) => void }} [options]
   */
  constructor(host, profile, { onMessage } = {}) {
    this.profile = profile;
    this.root = el('div', 'skill-panel');
    this.root.hidden = true;
    this.card = el('div', 'skill-panel__card');
    this.head = el('header', 'skill-panel__head');
    this.body = el('div', 'skill-panel__body');
    this.card.append(this.head, this.body);
    this.root.append(this.card);
    // Clicking the dim backdrop closes it, like the bag.
    this.root.addEventListener('pointerdown', (e) => {
      if (e.target === this.root) this.toggle(false);
    });
    host.appendChild(this.root);
    this.view = new SkillTreeView(this.body, profile, { onMessage });
    profile.on('change', () => this.isOpen && this.render());
    profile.on('slots', () => this.isOpen && this.render());
  }

  get isOpen() {
    return !this.root.hidden;
  }

  toggle(force) {
    this.root.hidden = force === undefined ? !this.root.hidden : !force;
    if (this.isOpen) this.render();
  }

  render() {
    const label = platform.characters.get(this.profile.classId)?.label ?? 'Caster';
    const books = this.profile.bag.filter((it) => it.type === 'book').length;
    this.head.replaceChildren();
    const title = el('h2', null, `${label} — skill tree`);
    const sub = el('span', null, `${books} skill book${books === 1 ? '' : 's'} in the bag`);
    const close = el('button', null, 'Close (K)');
    close.type = 'button';
    close.addEventListener('click', () => this.toggle(false));
    this.head.append(title, sub, close);
    this.view.render();
  }
}
