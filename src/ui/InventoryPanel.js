import { BAG_COLS, BAG_MAX_ROWS, STASH_COLS, STASH_ROWS, xpToNext } from '../items/Profile.js';
import { ELEMENT_NAMES, RARITIES, SKILL_MAX_RANK, describeItem, itemColor, itemSize, statLabel } from '../items/Items.js';
import { fits, overlapping, usedCells } from '../items/Grid.js';
import { ARMOR_CLASSES, GEAR_SLOTS, PROFICIENCY, armorCounts, pieceStats } from '../items/Gear.js';
import { treeSpells } from '../platform/skill/tree.js';
import { CLASS_SPECS } from '../platform/character/classes.js';
import { itemIcon, kindIcon } from './itemIcons.js';
import { itemThumbnails } from './ItemThumbnails.js';
import { ELEMENT_SIGILS } from './glyphs.js';
import { platform } from '../platform/index.js';
import { POTIONS } from '../items/Items.js';
import { POTION_KINDS, potionEntry } from '../items/hotbar.js';

/**
 * An item's picture (its 3D model, rendered — ui/ItemThumbnails.js) for a
 * slot of `cells`; the line icon when pictures cannot be made. Books carry
 * their skill's symbol on the cover.
 */
function picture(item, cells) {
  const wrap = document.createElement('span');
  wrap.className = 'inventory__pic';
  const url = itemThumbnails.of(item, cells);
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.draggable = false;
    wrap.append(img);
  } else wrap.innerHTML = itemIcon(item);
  if (item.type === 'book') {
    const sigil = document.createElement('span');
    sigil.className = 'inventory__sigil';
    sigil.innerHTML = ELEMENT_SIGILS[item.element] ?? '';
    wrap.append(sigil);
  }
  return wrap;
}

/**
 * The bag (Tab).
 *
 * Left: what you wear, as a paper doll — weapon, helmet, body armor, gloves,
 * belt, leg armor, boots, cloak, off-hand (shield, focus or quiver), amulet
 * and two rings — with your armor proficiency and set bonuses under it.
 * Right: the bag — a grid where every item takes its own size in cells (a
 * ring 1×1, a helmet 2×2, a rifle 2×4) — then what everything adds up to and
 * your skills. The bag starts 8×4 and grows with your level, bag upgrades
 * and rows bought from merchants.
 *
 * Click a weapon or piece of gear in the bag to wear it, a book to read it,
 * a bag upgrade to use it; click something you wear to take it off.
 * Everything can be dragged:
 * - within the bag, to arrange it (onto another item to swap the two);
 * - from the bag onto the paper doll, to wear it (a ring onto either finger);
 * - from the paper doll into the bag, to take it off into that spot (onto a
 *   piece for the same slot, to swap the two);
 * - out of the bag, in a fight, to drop it on the ground (right-click too).
 * A full bag takes nothing more: make room by arranging or dropping.
 *
 * Stash mode (`openStash`, from the main menu or a village's Stashkeeper):
 * the bag beside the big shared stash. Click moves an item across; drag
 * places it exactly.
 */

/** Paper-doll layout: rows of three. `weapon` is the weapon in hand. */
const DOLL = [
  ['back', 'head', 'neck'],
  ['weapon', 'chest', 'offhand'],
  ['hands', 'waist', 'ring1'],
  ['feet', 'legs', 'ring2']
];

/** Short names for "compared with what you wear" lines. */
const SHORT = {
  damage: '% spell damage',
  cooldown: '% faster cooldowns',
  health: ' max health',
  speed: '% move speed',
  crit: '% crit chance',
  gold: '% gold found',
  attack: '% weapon damage',
  armor: '% armor',
  block: '% block',
  regen: ' health/s',
  thorns: ' thorns'
};
/** Can this item be worn in this paper-doll slot? */
const goesIn = (item, slotId) =>
  slotId === 'weapon' ? item?.type === 'weapon' : item?.type === 'gear' && GEAR_SLOTS.some((s) => s.id === slotId && s.kind === item.kind);

/** The name of the slot an item is worn in. */
const slotName = (item) => (item.type === 'weapon' ? 'weapon' : (GEAR_SLOTS.find((s) => s.kind === item.kind)?.label ?? 'its').toLowerCase());

const shortStat = (key, v) => {
  const abs = Math.round(Math.abs(v) * 10) / 10;
  return `${v > 0 ? '+' : '−'}${abs}${SHORT[key] ?? `% ${ELEMENT_NAMES[key] ?? key}`}`;
};

export class InventoryPanel {
  /**
   * @param {HTMLElement} host
   * @param {import('../items/Profile.js').Profile} profile
   * @param {{ onEquip: (item, slotId?: string) => void, onUnequip: (slotId: string, at?: number[]) => void, onRead: (item) => void, onDrop: (item) => void, canDrop?: () => boolean, onMessage?: (text: string) => void }} actions
   */
  constructor(host, profile, actions) {
    this.profile = profile;
    this.actions = actions;
    this.root = document.createElement('div');
    this.root.className = 'inventory';
    this.root.hidden = true;
    host.appendChild(this.root);

    this.belt = document.createElement('div');
    this.belt.className = 'belt';
    this.belt.hidden = true;
    host.appendChild(this.belt);
    /** Items picked up since the bag was last open (the Bag button counts them). */
    this.unseen = 0;
    this.belt.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.belt.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-bag]')) this.actions.onOpenBag ? this.actions.onOpenBag() : this.toggle(true);
    });

    profile.on('slots', () => this.renderBelt());
    profile.on('change', () => {
      this.renderBelt();
      if (!this.root.hidden) this.render();
    });
    profile.on('gear', () => {
      if (!this.root.hidden) this.render();
    });
    this.renderBelt();
  }

  get isOpen() {
    return !this.root.hidden;
  }

  toggle(force) {
    this.root.hidden = force === undefined ? !this.root.hidden : !force;
    if (this.root.hidden) this.stashMode = false;
    if (!this.root.hidden && this.unseen) {
      this.unseen = 0;
      this.renderBelt();
    }
    this.root.classList.toggle('is-stash', Boolean(this.stashMode));
    if (!this.root.hidden) this.render();
    this.actions.onToggle?.(!this.root.hidden);
  }

  /** Open the bag beside the stash. */
  openStash() {
    this.stashMode = true;
    this.toggle(true);
  }

  setBeltVisible(visible) {
    this.belt.hidden = !visible;
  }

  /** Something new went into the bag: the Bag button says so until the bag is opened. */
  markNew() {
    if (!this.root.hidden) return;
    this.unseen += 1;
    this.renderBelt();
  }

  renderBelt() {
    const p = this.profile;
    const used = usedCells(p.bag);
    const total = BAG_COLS * p.bagRowCount;
    const full = used >= total;
    // A potion on the action bar shows its count there; one that is not shows it here (R / Z).
    const onBar = new Set(p.slots ?? []);
    const potions = POTION_KINDS.filter((k) => !onBar.has(potionEntry(k)))
      .map((k) => `<span class="belt__slot" title="${POTIONS[k].name} (${k === 'health' ? 'R' : 'Z'})"><kbd>${k === 'health' ? 'R' : 'Z'}</kbd><i style="background:${POTIONS[k].color}"></i>${p.potions[k]}</span>`)
      .join('');
    const news = this.unseen ? `<b class="belt__new">${this.unseen} new</b>` : '';
    this.belt.innerHTML = `
      ${potions}
      <span class="belt__slot belt__gold" title="Gold">● ${p.gold}</span>
      <button type="button" class="belt__slot belt__bag${full ? ' is-full' : ''}" data-open-bag title="Open the bag (Tab): see what you picked up, wear it, arrange it${full ? ' — the bag is full: new loot stays on the ground' : ''}"><kbd>Tab</kbd>Bag ${used}/${total}${full ? ' · full' : ''}${news}</button>
      <span class="belt__slot belt__level" title="Level ${p.level} — ${p.xp} / ${xpToNext(p.level)} XP">Lv ${p.level}<b><i style="width:${Math.round((p.xp / xpToNext(p.level)) * 100)}%"></i></b></span>`;
  }

  render() {
    const p = this.profile;
    this.root.replaceChildren();
    const card = document.createElement('div');
    card.className = 'inventory__card';

    const head = document.createElement('header');
    head.className = 'inventory__head';
    head.innerHTML = `<h2>${this.stashMode ? 'Stash' : 'Bag'}</h2><span>${p.gold} gold · ${p.potions.health} health · ${p.potions.focus} mana potions</span>`;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = this.stashMode ? 'Close' : 'Close (Tab)';
    close.addEventListener('click', () => this.toggle(false));
    head.append(close);

    const left = document.createElement('section');
    left.className = 'inventory__left';
    const right = document.createElement('section');
    right.className = 'inventory__right';
    if (this.stashMode) {
      card.classList.add('is-stash');
      left.append(this._bagHeader(), this._grid('bag'));
      const sh = document.createElement('div');
      sh.className = 'inventory__grid-head';
      sh.innerHTML = `<strong>Stash</strong><span>${usedCells(p.stash)} / ${STASH_COLS * STASH_ROWS} cells · shared by every class · click an item to move it across, or drag it to a spot</span>`;
      right.append(sh, this._grid('stash'));
    } else {
      left.append(this._doll(), this._armorInfo());
      const lower = document.createElement('div');
      lower.className = 'inventory__lower';
      lower.append(this._totals(), this._spells());
      right.append(this._bagHeader(), this._grid('bag'), lower);
    }
    card.append(head, left, right);
    this.root.append(card);
  }

  /** Bag size, level and XP, and how the bag grows. */
  _bagHeader() {
    const p = this.profile;
    const box = document.createElement('div');
    box.className = 'inventory__grid-head';
    const total = BAG_COLS * p.bagRowCount;
    const next = p.nextRowLevel;
    const grow = p.bagRowCount >= BAG_MAX_ROWS ? 'full size' : next ? `next row at level ${next}` : 'grows with bag upgrades and merchants';
    box.innerHTML = `<strong>Bag</strong><span>${usedCells(p.bag)} / ${total} cells · ${BAG_COLS}×${p.bagRowCount} · ${grow}</span>`;
    const lvl = document.createElement('span');
    lvl.className = 'inventory__level';
    const need = xpToNext(p.level);
    lvl.title = `${p.xp} / ${need} XP to level ${p.level + 1}. Monsters and quests give XP; every 3 levels the bag grows a row.`;
    lvl.innerHTML = `Level ${p.level}<b><i style="width:${Math.round((p.xp / need) * 100)}%"></i></b>`;
    box.append(lvl);
    return box;
  }

  /* -------------------------------------------------------------------- */

  _doll() {
    const p = this.profile;
    const box = document.createElement('div');
    box.className = 'inventory__doll';
    box.innerHTML = '<small>Equipped — click to take off, or drag into the bag</small>';
    const grid = document.createElement('div');
    grid.className = 'inventory__doll-grid';
    for (const row of DOLL) {
      for (const slotId of row) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'inventory__gear';
        if (slotId === 'weapon') {
          const eq = p.equipped;
          cell.dataset.slot = 'weapon';
          // The weapon in hand: from the bag, or the one the loadout gave you.
          const held = eq ?? { type: 'weapon', weapon: platform.getActiveWeaponId?.(), rarity: 'common', name: platform.getActiveWeapon?.()?.label ?? 'Weapon' };
          if (held.weapon && held.weapon !== 'unarmed') cell.append(picture(held, [2, 2]));
          else cell.innerHTML = `<b>${kindIcon('weapon')}</b>`;
          cell.setAttribute('aria-label', held.name);
          if (eq) {
            cell.style.borderColor = itemColor(eq);
            cell.style.color = itemColor(eq);
            cell.title = [eq.name, ...describeItem(eq), '', 'Click: take off · Drag: into the bag, or out to drop it · Click another weapon in the bag to swap'].join('\n');
            this._wornHandlers(cell, eq, 'weapon');
          } else {
            cell.classList.add('is-empty');
            cell.title = `${held.name} — the weapon your loadout gave you. Click a weapon in the bag to hold it instead.`;
          }
          grid.append(cell);
          continue;
        }
        const slot = GEAR_SLOTS.find((s) => s.id === slotId);
        const item = p.gear[slotId];
        cell.dataset.slot = slotId;
        if (!item) {
          cell.classList.add('is-empty');
          cell.innerHTML = `<b>${kindIcon(slot.kind === 'offhand' ? 'shield' : slot.kind)}</b>`;
          cell.append(Object.assign(document.createElement('span'), { textContent: slot.label }));
          cell.title = `${slot.label} — empty`;
          cell.disabled = true;
        } else {
          const color = itemColor(item);
          cell.style.borderColor = color;
          cell.style.color = color;
          cell.append(picture(item, itemSize(item)));
          cell.setAttribute('aria-label', item.name);
          const active = p.isActive(item);
          if (!active) cell.classList.add('is-idle');
          if (item.rarity && RARITIES[item.rarity]) cell.dataset.rarity = item.rarity;
          const favored = item.group === p.favoredArmor;
          cell.title = [
            item.name,
            ...describeItem(item),
            ...(favored ? ['', `Proficient: +${PROFICIENCY * 100}% from its base properties`] : []),
            ...(active ? [] : ['', 'Not working: your weapon takes both hands']),
            '',
            'Click: take off · Drag: into the bag, or out to drop it'
          ].join('\n');
          this._wornHandlers(cell, item, slotId);
        }
        grid.append(cell);
      }
    }
    box.append(grid);
    return box;
  }

  /** A worn piece: click (or Enter) takes it off, a drag moves it. */
  _wornHandlers(cell, item, slotId) {
    cell.classList.add('is-draggable');
    cell.addEventListener('pointerdown', (e) => this._dragStart(e, item, { worn: slotId }, cell));
    // Pointer clicks are decided by the drag code; this is the keyboard's.
    cell.addEventListener('click', (e) => e.detail === 0 && this.actions.onUnequip?.(slotId));
  }

  _armorInfo() {
    const p = this.profile;
    const box = document.createElement('div');
    box.className = 'inventory__sets';
    const cls = CLASS_SPECS.find((c) => c.id === p.classId);
    const fav = ARMOR_CLASSES[p.favoredArmor];
    box.innerHTML = '<small>Armor class</small>';
    const prof = document.createElement('span');
    prof.innerHTML = `${cls?.label ?? 'Your class'} is proficient in <b style="color:${fav.color}">${fav.label}</b>: +${PROFICIENCY * 100}% from its base properties.`;
    box.append(prof);
    const counts = armorCounts(p.gear);
    const worn = Object.keys(ARMOR_CLASSES).filter((c) => counts[c]);
    if (!worn.length) {
      box.append(Object.assign(document.createElement('span'), { textContent: 'Wear 3 or 5 pieces of one armor class for a set bonus.' }));
    }
    for (const c of worn) {
      const def = ARMOR_CLASSES[c];
      const n = counts[c];
      const row = document.createElement('div');
      row.className = 'inventory__set';
      const title = document.createElement('strong');
      title.style.color = def.color;
      title.textContent = `${def.label} ${n}/5`;
      row.append(title);
      for (const tier of def.sets) {
        const on = n >= tier.pieces;
        const line = document.createElement('span');
        line.className = on ? 'is-on' : '';
        line.textContent = `${on ? '✓' : '○'} ${tier.pieces}: ${Object.entries(tier.stats).map(([k, v]) => shortStat(k, v)).join(', ')}`;
        row.append(line);
      }
      box.append(row);
    }
    return box;
  }

  /** A container as a grid of cells, items laid on it at their size. */
  _grid(name) {
    const p = this.profile;
    const g = p.grid(name);
    const wrap = document.createElement('div');
    wrap.className = `inventory__grid inventory__grid--${name}`;
    wrap.dataset.grid = name;
    wrap.style.setProperty('--cols', g.cols);
    wrap.style.setProperty('--rows', g.rows);
    for (const item of g.items) {
      const [w, h] = item._size ?? itemSize(item);
      const [x, y] = item.at ?? [0, 0];
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'inventory__item';
      tile.dataset.uid = item.uid;
      tile.style.setProperty('--x', x);
      tile.style.setProperty('--y', y);
      tile.style.setProperty('--w', w);
      tile.style.setProperty('--h', h);
      const color = itemColor(item);
      tile.style.borderColor = color;
      tile.style.color = color;
      tile.append(picture(item, [w, h]));
      tile.setAttribute('aria-label', item.name);
      const book = item.type === 'book' ? p.bookStatus(item.element) : null;
      if (book && !book.ok) tile.classList.add('is-unreadable');
      if (item.rarity && RARITIES[item.rarity]) tile.dataset.rarity = item.rarity;
      const wearable = item.type === 'weapon' || item.type === 'gear';
      const verb = this.stashMode ? `Click: move to the ${name === 'bag' ? 'stash' : 'bag'}` : wearable ? 'Click: equip' : item.type === 'bag' ? 'Click: use' : 'Click: read';
      tile.title = [
        item.name,
        `${w}×${h} — ${w * h} cell${w * h > 1 ? 's' : ''}`,
        ...describeItem(item),
        ...(item.type === 'gear' ? this._compare(item) : []),
        ...(book ? ['', book.ok ? `You can read it: ${book.reason.toLowerCase()}` : book.reason] : []),
        '',
        `${verb} · Drag: move${this.actions.canDrop?.() ? ', or out of the bag to drop it' : ''} · Right-click: drop`
      ].join('\n');
      tile.addEventListener('pointerdown', (e) => this._dragStart(e, item, { grid: name }, tile));
      tile.addEventListener('click', (e) => e.detail === 0 && this._click(item, name));
      tile.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.actions.onDrop(item);
      });
      wrap.append(tile);
    }
    return wrap;
  }

  /** A click (no drag) on an item. */
  _click(item, from) {
    if (this.stashMode) {
      const r = this.profile.move(item.uid, from === 'bag' ? 'stash' : 'bag');
      if (!r.ok && r.message) this._say(r.message);
      this.render();
      return;
    }
    if (item.type === 'weapon' || item.type === 'gear') this.actions.onEquip(item);
    else this.actions.onRead(item);
  }

  _say(text) {
    this.actions.onMessage?.(text);
  }

  /**
   * Press on an item: a click if the pointer does not move, else a drag —
   * the item follows the pointer and where it would land lights up: cells
   * in a grid (green: fits, amber: swaps, red: no), the paper-doll slots it
   * can be worn in, or — outside the bag, in a fight — the ground.
   * @param {{ grid?: string, worn?: string }} from  a grid name, or the slot it is worn in
   */
  _dragStart(e, item, from, el) {
    if (e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    const box = el.getBoundingClientRect();
    /** The carried picture's size: the item's own, or its size in the bag for a worn piece. */
    let gw = box.width;
    let gh = box.height;
    const size = item._size ?? itemSize(item);
    const card = this.root.querySelector('.inventory__card');
    const canDrop = Boolean(this.actions.canDrop?.());
    // A worn piece is drawn in a square slot; it lands in the grid by its centre.
    const grabX = from.worn ? null : sx - box.left;
    const grabY = from.worn ? null : sy - box.top;
    let ghost = null;
    let preview = null;
    let hint = null;
    let target = null;

    const where = (cx, cy) => {
      for (const grid of this.root.querySelectorAll('[data-grid]')) {
        const r = grid.getBoundingClientRect();
        if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
        const cell = r.width / Number(grid.style.getPropertyValue('--cols'));
        const ox = grabX ?? (size[0] * cell) / 2;
        const oy = grabY ?? (size[1] * cell) / 2;
        const x = Math.round((cx - ox - r.left) / cell);
        const y = Math.round((cy - oy - r.top) / cell);
        return { kind: 'grid', grid, name: grid.dataset.grid, x, y };
      }
      const slot = document.elementsFromPoint(cx, cy).find((n) => n.dataset?.slot);
      if (slot) return { kind: 'slot', slot: slot.dataset.slot, el: slot };
      const c = card.getBoundingClientRect();
      const outside = cx < c.left || cx > c.right || cy < c.top || cy > c.bottom;
      return outside && canDrop ? { kind: 'ground' } : null;
    };

    /** What letting go on a grid spot would do: 'ok', 'swap' (with `other`) or 'bad'. */
    const onGrid = (t) => {
      const g = this.profile.grid(t.name);
      const inside = t.x >= 0 && t.y >= 0 && t.x + size[0] <= g.cols && t.y + size[1] <= g.rows;
      if (from.worn) {
        if (t.name !== 'bag') return { verdict: 'bad' };
        if (fits(g.items, g.cols, g.rows, size, t.x, t.y)) return { verdict: 'ok' };
        const inWay = inside ? overlapping(g.items, size, t.x, t.y) : [];
        return inWay.length === 1 && goesIn(inWay[0], from.worn) ? { verdict: 'swap', other: inWay[0] } : { verdict: 'bad' };
      }
      if (fits(g.items, g.cols, g.rows, size, t.x, t.y, item)) return { verdict: 'ok' };
      return { verdict: inside && overlapping(g.items, size, t.x, t.y, item).length === 1 ? 'swap' : 'bad' };
    };

    const lift = () => {
      if (from.worn) {
        // Off the paper doll it is carried at its size in the bag, so you see the room it needs.
        const bag = this.root.querySelector('[data-grid="bag"]');
        const cell = bag ? bag.getBoundingClientRect().width / Number(bag.style.getPropertyValue('--cols')) : 40;
        ghost = document.createElement('div');
        ghost.className = 'inventory__item';
        ghost.style.borderColor = ghost.style.color = itemColor(item);
        ghost.append(picture(item, size));
        gw = size[0] * cell;
        gh = size[1] * cell;
      } else {
        ghost = el.cloneNode(true);
        ghost.removeAttribute('data-uid');
      }
      ghost.classList.add('inventory__ghost');
      ghost.style.width = `${gw}px`;
      ghost.style.height = `${gh}px`;
      this.root.append(ghost); // inside the bag, where the tile styles apply
      el.classList.add('is-lifted');
      preview = document.createElement('div');
      preview.className = 'inventory__drop';
      // The slots it can be worn in light up while it is carried.
      if (from.grid === 'bag') {
        for (const n of this.root.querySelectorAll('[data-slot]')) if (goesIn(item, n.dataset.slot)) n.classList.add('is-drop-ok');
      }
      if (canDrop) {
        hint = document.createElement('div');
        hint.className = 'inventory__ground';
        hint.textContent = 'Drag outside the bag to drop it on the ground';
        this.root.append(hint);
      }
    };

    const clear = () => this.root.querySelectorAll('.is-drop-target, .is-drop-bad').forEach((n) => n.classList.remove('is-drop-target', 'is-drop-bad'));

    const move = (ev) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        lift();
      }
      const gx = grabX ?? gw / 2;
      const gy = grabY ?? gh / 2;
      ghost.style.transform = `translate(${ev.clientX - gx}px, ${ev.clientY - gy}px)`;
      target = where(ev.clientX, ev.clientY);
      clear();
      this.root.classList.toggle('is-dropping', target?.kind === 'ground');
      if (hint) hint.textContent = target?.kind === 'ground' ? `Let go to drop ${item.name} on the ground` : 'Drag outside the bag to drop it on the ground';
      if (target?.kind === 'grid') {
        const { verdict } = onGrid(target);
        preview.className = `inventory__drop is-${verdict}`;
        preview.style.setProperty('--x', target.x);
        preview.style.setProperty('--y', target.y);
        preview.style.setProperty('--w', size[0]);
        preview.style.setProperty('--h', size[1]);
        target.grid.append(preview);
      } else {
        preview.remove();
        if (target?.kind === 'slot' && target.slot !== from.worn) {
          target.el.classList.add(from.grid === 'bag' && goesIn(item, target.slot) ? 'is-drop-target' : 'is-drop-bad');
        }
      }
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!ghost) {
        if (from.worn) this.actions.onUnequip?.(from.worn);
        else this._click(item, from.grid);
        return;
      }
      ghost.remove();
      preview?.remove();
      hint?.remove();
      clear();
      this.root.querySelectorAll('.is-drop-ok').forEach((n) => n.classList.remove('is-drop-ok'));
      this.root.classList.remove('is-dropping');
      el.classList.remove('is-lifted');
      this._drop(item, from, target, target?.kind === 'grid' ? onGrid(target) : null);
      if (!this.root.hidden) this.render();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  /** Let go of a dragged item over `target`. */
  _drop(item, from, target, grid) {
    if (!target) return;
    if (target.kind === 'ground') {
      this.actions.onDrop(item);
      this._say(`${item.name} dropped`);
      return;
    }
    if (target.kind === 'slot') {
      if (!from.grid || target.slot === from.worn) return;
      if (from.grid !== 'bag') return this._say('Move it into your bag first');
      if (item.type !== 'weapon' && item.type !== 'gear') return this._say(`${item.name} cannot be worn`);
      if (!goesIn(item, target.slot)) return this._say(`${item.name} goes in the ${slotName(item)} slot`);
      this.actions.onEquip(item, target.slot);
      return;
    }
    if (from.worn) {
      if (grid.verdict === 'ok') this.actions.onUnequip?.(from.worn, [target.x, target.y]);
      else if (grid.verdict === 'swap') this.actions.onEquip(grid.other, from.worn);
      else this._say('It does not fit there');
      return;
    }
    const r = this.profile.move(item.uid, target.name, target.x, target.y);
    if (!r.ok && r.message) this._say(r.message);
  }

  /** "Compared with what you wear" lines for a piece of gear in the bag. */
  _compare(item) {
    const p = this.profile;
    const slotId = p.slotFor(item);
    const worn = p.gear[slotId];
    const now = pieceStats(item, p.favoredArmor);
    const lines = ['', worn ? `Instead of ${worn.name}:` : 'Nothing worn there — all gain:'];
    if (worn) {
      const was = pieceStats(worn, p.favoredArmor);
      const keys = new Set([...Object.keys(now), ...Object.keys(was)]);
      const diffs = [...keys].map((k) => [k, (now[k] ?? 0) - (was[k] ?? 0)]).filter(([, v]) => Math.abs(v) >= 0.05);
      lines.push(diffs.length ? diffs.map(([k, v]) => shortStat(k, v)).join(', ') : 'the same');
    } else lines.push(Object.entries(now).map(([k, v]) => shortStat(k, v)).join(', '));
    if (item.group === p.favoredArmor) lines.push(`(includes your +${PROFICIENCY * 100}% ${ARMOR_CLASSES[item.group].label} proficiency)`);
    if (!p.isActive(item)) lines.push('Needs a free hand — your weapon takes both');
    return lines;
  }

  _totals() {
    const s = this.profile.stats;
    const box = document.createElement('div');
    box.className = 'inventory__stats';
    box.innerHTML = '<small>Everything adds up to</small>';
    const lines = [
      s.armor && `${Math.min(75, s.armor)}% less damage taken${s.armor > 75 ? ' (max 75)' : ''}`,
      s.block && `${Math.min(60, s.block)}% chance to block a hit${s.block > 60 ? ' (max 60)' : ''}`,
      s.health && statLabel('health', s.health),
      s.regen && statLabel('regen', s.regen),
      s.thorns && statLabel('thorns', s.thorns),
      s.speed && statLabel('speed', s.speed),
      s.damage && statLabel('damage', s.damage),
      s.attack && statLabel('attack', s.attack),
      s.cooldown && statLabel('cooldown', s.cooldown),
      s.crit && statLabel('crit', s.crit),
      s.gold && statLabel('gold', s.gold),
      ...Object.entries(s.element).filter(([, v]) => v).map(([el, v]) => statLabel(el, v))
    ].filter(Boolean);
    for (const line of lines.length ? lines : ['Nothing yet — wear some gear']) box.append(Object.assign(document.createElement('span'), { textContent: line }));
    return box;
  }

  _spells() {
    const p = this.profile;
    const box = document.createElement('div');
    box.className = 'inventory__skills';
    box.innerHTML = '<small>Your skills — skill tree (K)</small>';
    for (const el of treeSpells(p.classId)) {
      const rank = p.rank(el);
      const row = document.createElement('span');
      row.textContent = rank ? `${ELEMENT_NAMES[el]}  ${rank}/${SKILL_MAX_RANK}` : `${ELEMENT_NAMES[el]}  —`;
      if (!rank) row.style.opacity = '0.5';
      box.append(row);
    }
    return box;
  }
}
