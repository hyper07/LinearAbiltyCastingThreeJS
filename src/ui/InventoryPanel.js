import { BAG_COLS, BAG_MAX_ROWS, STASH_COLS, STASH_ROWS, xpToNext } from '../items/Profile.js';
import { ELEMENT_NAMES, RARITIES, SKILL_MAX_RANK, describeItem, itemColor, itemSize, statLabel } from '../items/Items.js';
import { fits, overlapping, usedCells } from '../items/Grid.js';
import { ARMOR_CLASSES, GEAR_SLOTS, PROFICIENCY, armorCounts, pieceStats } from '../items/Gear.js';
import { treeSpells } from '../platform/skill/tree.js';
import { CLASS_SPECS } from '../platform/character/classes.js';
import { itemIcon, kindIcon } from './itemIcons.js';

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
 * a bag upgrade to use it; drag anything to move it (onto another item to
 * swap, onto the paper doll to wear it); click something you wear to take it
 * off; right-click to drop.
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
const shortStat = (key, v) => {
  const abs = Math.round(Math.abs(v) * 10) / 10;
  return `${v > 0 ? '+' : '−'}${abs}${SHORT[key] ?? `% ${ELEMENT_NAMES[key] ?? key}`}`;
};

export class InventoryPanel {
  /**
   * @param {HTMLElement} host
   * @param {import('../items/Profile.js').Profile} profile
   * @param {{ onEquip: (item) => void, onUnequip: (slotId: string) => void, onRead: (item) => void, onDrop: (item) => void, onMessage?: (text: string) => void }} actions
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
    this.root.classList.toggle('is-stash', Boolean(this.stashMode));
    if (!this.root.hidden) this.render();
  }

  /** Open the bag beside the stash. */
  openStash() {
    this.stashMode = true;
    this.toggle(true);
  }

  setBeltVisible(visible) {
    this.belt.hidden = !visible;
  }

  renderBelt() {
    const p = this.profile;
    this.belt.innerHTML = `
      <span class="belt__slot" title="Health potion (R)"><kbd>R</kbd><i style="background:#ff4a5a"></i>${p.potions.health}</span>
      <span class="belt__slot" title="Focus potion (Z)"><kbd>Z</kbd><i style="background:#4ad2ff"></i>${p.potions.focus}</span>
      <span class="belt__slot belt__gold" title="Gold">● ${p.gold}</span>
      <span class="belt__slot" title="Bag (Tab)"><kbd>Tab</kbd>Bag ${usedCells(p.bag)}/${BAG_COLS * p.bagRowCount}</span>
      <span class="belt__slot belt__level" title="Level ${p.level} — ${p.xp} / ${xpToNext(p.level)} XP">Lv ${p.level}<b><i style="width:${Math.round((p.xp / xpToNext(p.level)) * 100)}%"></i></b></span>`;
  }

  render() {
    const p = this.profile;
    this.root.replaceChildren();
    const card = document.createElement('div');
    card.className = 'inventory__card';

    const head = document.createElement('header');
    head.className = 'inventory__head';
    head.innerHTML = `<h2>${this.stashMode ? 'Stash' : 'Bag'}</h2><span>${p.gold} gold · ${p.potions.health} health · ${p.potions.focus} focus potions</span>`;
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
      sh.innerHTML = `<strong>Stash</strong><span>${usedCells(p.stash)} / ${STASH_COLS * STASH_ROWS} cells · shared by every class · click an item to move it across</span>`;
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
    box.innerHTML = '<small>Equipped — click to take off</small>';
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
          cell.innerHTML = `<b>${kindIcon('weapon')}</b>`;
          const name = document.createElement('span');
          name.textContent = eq ? eq.name : 'Loadout weapon';
          if (eq) {
            cell.style.borderColor = itemColor(eq);
            cell.style.color = itemColor(eq);
            cell.title = [eq.name, ...describeItem(eq), '', 'Swap it by clicking another weapon in the bag.'].join('\n');
          } else {
            cell.classList.add('is-empty');
            cell.title = 'Weapon — the one your loadout gave you. Click a weapon in the bag to hold it instead.';
          }
          cell.append(name);
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
          cell.innerHTML = `<b>${itemIcon(item)}</b>`;
          cell.append(Object.assign(document.createElement('span'), { textContent: item.name }));
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
            'Click: take off'
          ].join('\n');
          cell.addEventListener('click', () => this.actions.onUnequip?.(slotId));
        }
        grid.append(cell);
      }
    }
    box.append(grid);
    return box;
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
      tile.innerHTML = `<b>${itemIcon(item)}</b>`;
      const label = document.createElement('span');
      label.textContent = item.name;
      tile.append(label);
      if (w * h <= 1) tile.classList.add('is-tiny');
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
        `${verb} · Drag: move · Right-click: drop`
      ].join('\n');
      tile.addEventListener('pointerdown', (e) => this._dragStart(e, item, name, tile));
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
   * the item follows the pointer, the cells it would land on light up
   * (green: fits, amber: swaps, red: no), and letting go moves it there or
   * onto a paper-doll slot.
   */
  _dragStart(e, item, from, tile) {
    if (e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    const box = tile.getBoundingClientRect();
    const grabX = sx - box.left;
    const grabY = sy - box.top;
    let ghost = null;
    let preview = null;
    let target = null;
    const size = item._size ?? itemSize(item);

    const where = (cx, cy) => {
      for (const grid of this.root.querySelectorAll('[data-grid]')) {
        const r = grid.getBoundingClientRect();
        if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
        const cell = r.width / Number(grid.style.getPropertyValue('--cols'));
        const x = Math.round((cx - grabX - r.left) / cell);
        const y = Math.round((cy - grabY - r.top) / cell);
        return { kind: 'grid', grid, name: grid.dataset.grid, x, y, cell };
      }
      const slot = document.elementsFromPoint(cx, cy).find((n) => n.dataset?.slot);
      return slot ? { kind: 'slot', slot: slot.dataset.slot, el: slot } : null;
    };

    const move = (ev) => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        ghost = tile.cloneNode(true);
        ghost.classList.add('is-ghost');
        ghost.style.width = `${box.width}px`;
        ghost.style.height = `${box.height}px`;
        document.body.append(ghost);
        tile.classList.add('is-lifted');
        preview = document.createElement('div');
        preview.className = 'inventory__drop';
      }
      ghost.style.transform = `translate(${ev.clientX - grabX}px, ${ev.clientY - grabY}px)`;
      target = where(ev.clientX, ev.clientY);
      this.root.querySelectorAll('.is-drop-target').forEach((n) => n.classList.remove('is-drop-target'));
      if (target?.kind === 'grid') {
        const g = this.profile.grid(target.name);
        const ok = fits(g.items, g.cols, g.rows, size, target.x, target.y, item);
        const swap = !ok && target.x >= 0 && target.y >= 0 && target.x + size[0] <= g.cols && target.y + size[1] <= g.rows && overlapping(g.items, size, target.x, target.y, item).length === 1;
        preview.className = `inventory__drop ${ok ? 'is-ok' : swap ? 'is-swap' : 'is-bad'}`;
        preview.style.setProperty('--x', target.x);
        preview.style.setProperty('--y', target.y);
        preview.style.setProperty('--w', size[0]);
        preview.style.setProperty('--h', size[1]);
        target.grid.append(preview);
      } else {
        preview.remove();
        if (target?.kind === 'slot') target.el.classList.add('is-drop-target');
      }
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (!ghost) {
        this._click(item, from);
        return;
      }
      ghost.remove();
      preview?.remove();
      tile.classList.remove('is-lifted');
      if (target?.kind === 'grid') {
        const r = this.profile.move(item.uid, target.name, target.x, target.y);
        if (!r.ok && r.message) this._say(r.message);
      } else if (target?.kind === 'slot' && from === 'bag' && (item.type === 'weapon' || item.type === 'gear')) {
        this.actions.onEquip(item);
      }
      this.render();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
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
