import { BAG_SIZE } from '../items/Profile.js';
import { ELEMENT_NAMES, RARITIES, SKILL_MAX_RANK, describeItem, itemColor, statLabel } from '../items/Items.js';
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
 * Right: the 30 bag slots, then what everything adds up to and your spells.
 *
 * Click a weapon or piece of gear in the bag to wear it (whatever was in
 * that slot comes back to the bag), a book to read it; click something you
 * wear to take it off; right-click a bag item to drop it.
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
   * @param {{ onEquip: (item) => void, onUnequip: (slotId: string) => void, onRead: (item) => void, onDrop: (item) => void }} actions
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
    if (!this.root.hidden) this.render();
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
      <span class="belt__slot" title="Bag (Tab)"><kbd>Tab</kbd>Bag ${p.bag.length}/${BAG_SIZE}</span>`;
  }

  render() {
    const p = this.profile;
    this.root.replaceChildren();
    const card = document.createElement('div');
    card.className = 'inventory__card';

    const head = document.createElement('header');
    head.className = 'inventory__head';
    head.innerHTML = `<h2>Bag</h2><span>${p.gold} gold · ${p.potions.health} health · ${p.potions.focus} focus potions · ${p.bag.length}/${BAG_SIZE}</span>`;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close (Tab)';
    close.addEventListener('click', () => this.toggle(false));
    head.append(close);

    const left = document.createElement('section');
    left.className = 'inventory__left';
    left.append(this._doll(), this._armorInfo());

    const right = document.createElement('section');
    right.className = 'inventory__right';
    const lower = document.createElement('div');
    lower.className = 'inventory__lower';
    lower.append(this._totals(), this._spells());
    right.append(this._grid(), lower);

    card.append(head, left, right);
    this.root.append(card);
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

  _grid() {
    const p = this.profile;
    const grid = document.createElement('div');
    grid.className = 'inventory__grid';
    for (let i = 0; i < BAG_SIZE; i++) {
      const item = p.bag[i];
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'inventory__slot';
      if (!item) {
        slot.disabled = true;
        grid.append(slot);
        continue;
      }
      const color = itemColor(item);
      slot.style.borderColor = color;
      slot.innerHTML = `<b style="color:${color}">${itemIcon(item)}</b>`;
      const name = document.createElement('span');
      name.textContent = item.name;
      name.style.color = color;
      slot.append(name);
      const book = item.type === 'book' ? p.bookStatus(item.element) : null;
      if (book && !book.ok) slot.classList.add('is-unreadable');
      const wearable = item.type === 'weapon' || item.type === 'gear';
      slot.title = [
        item.name,
        ...describeItem(item),
        ...(item.type === 'gear' ? this._compare(item) : []),
        ...(book ? ['', book.ok ? `You can read it: ${book.reason.toLowerCase()}` : book.reason] : []),
        '',
        wearable ? 'Click: equip · Right-click: drop' : 'Click: read · Right-click: drop'
      ].join('\n');
      slot.addEventListener('click', () => (wearable ? this.actions.onEquip(item) : this.actions.onRead(item)));
      slot.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.actions.onDrop(item);
      });
      if (item.rarity && RARITIES[item.rarity]) slot.dataset.rarity = item.rarity;
      grid.append(slot);
    }
    return grid;
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
