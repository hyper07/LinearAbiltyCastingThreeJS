import { settings, ELEMENT_META, CastShape } from '../config/settings.js';
import { SKILL_MAX_RANK, SKILL_RANK } from '../items/Items.js';
import { SLOT_COUNT, prerequisite, spellName, treeFor } from '../platform/skill/tree.js';
import { platform } from '../platform/index.js';
import { ELEMENT_SIGILS } from './glyphs.js';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * One class's skill tree and its five keys.
 *
 * Top: keys 1–5. Click a key to choose it, then click a learned spell to put
 * it there (right-click a key to empty it). Below: the class's branches,
 * tier 1 at the top. Each spell shows its rank, what it needs, and — when a
 * book for it is in the bag — a button to read it on the spot.
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
  }

  _say(text) {
    this.onMessage(text);
  }

  render() {
    const p = this.profile;
    const classId = this.classId();
    const tree = treeFor(classId);
    const slots = p.slotsOf(classId);
    if (this.selectedSlot == null || this.selectedSlot >= SLOT_COUNT) {
      const free = slots.indexOf(null);
      this.selectedSlot = free >= 0 ? free : 0;
    }

    const root = el('div', 'skilltree');

    /* --- the five keys --- */
    const keys = el('div', 'skilltree__keys');
    slots.forEach((element, i) => {
      const key = el('button', 'skilltree__key');
      key.type = 'button';
      if (i === this.selectedSlot) key.classList.add('is-selected');
      if (element) key.style.setProperty('--accent', ELEMENT_META[element]?.accent ?? '');
      else key.classList.add('is-empty');
      key.append(el('kbd', null, String(i + 1)));
      const glyph = el('span', 'skilltree__glyph');
      glyph.innerHTML = element ? ELEMENT_SIGILS[element] ?? '' : '';
      key.append(glyph, el('span', 'skilltree__key-name', element ? spellName(element) : 'Empty'));
      key.title = element ? `Key ${i + 1}: ${spellName(element)}\nRight-click to empty it` : `Key ${i + 1} is empty — pick it, then click a learned spell`;
      key.addEventListener('click', () => {
        this.selectedSlot = i;
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
        (tree.resource === 'rage'
          ? `Fights with Rage: tier-1 skills and melee hits build it, tier-2 skills spend it. `
          : '') +
          `Pick a key, then click a learned skill to put it there. Skill books teach a skill and raise its rank (max ${SKILL_MAX_RANK}); a tier-2 skill needs the one above it at rank 2, tier 3 needs rank 3.`
    );

    /* --- the branches --- */
    const branches = el('div', 'skilltree__branches');
    branches.style.setProperty('--branches', tree.branches.length);
    for (const branch of tree.branches) {
      const col = el('section', 'skilltree__branch');
      col.style.setProperty('--branch', branch.accent);
      col.append(el('h3', 'skilltree__branch-name', branch.label));
      branch.spells.forEach((element, i) => {
        if (i > 0) {
          const need = prerequisite(classId, element);
          const met = p.rank(need.element, classId) >= need.rank;
          col.append(el('div', `skilltree__link${met ? ' is-met' : ''}`, `rank ${need.rank}`));
        }
        col.append(this._node(element, i + 1, classId, slots));
      });
      branches.append(col);
    }

    root.append(keys, hint, branches);
    this.host.replaceChildren(root);
  }

  _node(element, tier, classId, slots) {
    const p = this.profile;
    const rank = p.rank(element, classId);
    const status = p.bookStatus(element, classId);
    const books = p.booksFor(element);
    const need = prerequisite(classId, element);
    const locked = need && p.rank(need.element, classId) < need.rank;
    const meta = ELEMENT_META[element] ?? {};

    const node = el('article', 'skilltree__node');
    node.style.setProperty('--accent', meta.accent ?? '');
    node.classList.add(rank ? 'is-learned' : locked ? 'is-locked' : 'is-open');
    if (books && status.ok) node.classList.add('has-book');

    const head = el('div', 'skilltree__node-head');
    const glyph = el('span', 'skilltree__glyph');
    glyph.innerHTML = ELEMENT_SIGILS[element] ?? '';
    const title = el('div', 'skilltree__node-title');
    const shape = meta.cast === 'zone' ? ' · far cast' : meta.cast === CastShape.SELF ? ' · around you' : '';
    title.append(el('strong', null, spellName(element)), el('small', null, `Tier ${tier}${shape}`));
    head.append(glyph, title);
    const onKey = slots.indexOf(element);
    if (onKey >= 0) head.append(el('kbd', 'skilltree__on-key', String(onKey + 1)));
    node.append(head);

    const pips = el('div', 'skilltree__pips');
    pips.setAttribute('aria-label', `Rank ${rank} of ${SKILL_MAX_RANK}`);
    for (let r = 1; r <= SKILL_MAX_RANK; r++) pips.append(el('i', r <= rank ? 'is-on' : ''));
    node.append(pips);

    const combat = settings.combat[element] ?? {};
    const ability = settings[element] ?? {};
    const bonus = rank > 1 ? ` · +${(rank - 1) * SKILL_RANK.damage}% dmg` : '';
    const reach = meta.cast === CastShape.SELF ? `${ability.zoneRadius ?? 0} m around` : `${ability.range ?? 0} m`;
    const rage = meta.rage > 0 ? ` · +${meta.rage} Rage/hit` : meta.rage < 0 ? ` · ${-meta.rage} Rage` : meta.rageOnCast ? ` · +${meta.rageOnCast} Rage` : '';
    node.append(el('p', 'skilltree__stats', `${combat.damage ?? 0} dmg · ${ability.cooldown ?? 0}s · ${reach}${rage}${bonus}`));

    const foot = el('div', 'skilltree__node-foot');
    if (rank) foot.append(el('span', null, `Rank ${rank}/${SKILL_MAX_RANK}`));
    else if (locked) foot.append(el('span', 'is-warn', `Needs ${spellName(need.element)} rank ${need.rank}`));
    else foot.append(el('span', null, 'Not learned — find its skill book'));

    if (books && status.ok) {
      const read = el('button', 'skilltree__read', `${rank ? 'Rank up' : 'Learn'} (${books} book${books > 1 ? 's' : ''})`);
      read.type = 'button';
      read.addEventListener('click', (e) => {
        e.stopPropagation();
        const book = p.bag.find((it) => it.type === 'book' && it.element === element);
        this._say(p.read(book.uid, classId).message);
        this.render();
      });
      foot.append(read);
    } else if (books) {
      foot.append(el('span', 'skilltree__books', `${books} book${books > 1 ? 's' : ''} in bag`));
    }
    node.append(foot);

    if (rank) {
      node.classList.add('is-clickable');
      node.title = `Click to put ${spellName(element)} on key ${this.selectedSlot + 1}`;
      node.addEventListener('click', () => {
        p.setSlot(this.selectedSlot, element, classId);
        const next = p.slotsOf(classId).indexOf(null);
        if (next >= 0) this.selectedSlot = next;
        this.render();
      });
    }
    return node;
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
