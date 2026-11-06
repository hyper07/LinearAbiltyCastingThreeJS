import { BAG_SIZE } from '../items/Profile.js';
import { ELEMENT_NAMES, RARITIES, SKILL_MAX_RANK, STATS, describeItem, itemColor } from '../items/Items.js';

/**
 * The bag (Tab): the weapon in hand, what the gear adds up to, spell ranks,
 * and the 24 slots. Click a weapon to equip it, a book to read it; right-click
 * (or the Drop button) to throw something away. Plus the potion belt and purse
 * on the HUD.
 */
export class InventoryPanel {
  /**
   * @param {HTMLElement} host
   * @param {import('../items/Profile.js').Profile} profile
   * @param {{ onEquip: (item) => void, onRead: (item) => void, onDrop: (item) => void }} actions
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
    const s = p.stats;
    const statLines = [
      s.damage && STATS.damage.label(s.damage),
      s.cooldown && STATS.cooldown.label(s.cooldown),
      s.health && STATS.health.label(s.health),
      s.speed && STATS.speed.label(s.speed),
      s.crit && STATS.crit.label(s.crit),
      s.gold && STATS.gold.label(s.gold),
      ...Object.entries(s.element).map(([el, v]) => STATS[el]?.label(v))
    ].filter(Boolean);

    this.root.replaceChildren();
    const card = document.createElement('div');
    card.className = 'inventory__card';

    const head = document.createElement('header');
    head.className = 'inventory__head';
    head.innerHTML = `<h2>Bag</h2><span>${p.gold} gold · ${p.potions.health} health · ${p.potions.focus} focus potions</span>`;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close (Tab)';
    close.addEventListener('click', () => this.toggle(false));
    head.append(close);

    const left = document.createElement('section');
    left.className = 'inventory__left';
    const eq = p.equipped;
    const equipped = document.createElement('div');
    equipped.className = 'inventory__equipped';
    equipped.style.borderColor = eq ? itemColor(eq) : '';
    equipped.innerHTML = `<small>In hand</small>`;
    const eqName = document.createElement('strong');
    eqName.textContent = eq ? eq.name : 'Nothing from the bag — your loadout weapon';
    if (eq) eqName.style.color = itemColor(eq);
    equipped.append(eqName);
    if (eq) for (const line of describeItem(eq)) equipped.append(Object.assign(document.createElement('span'), { textContent: line }));
    const stats = document.createElement('div');
    stats.className = 'inventory__stats';
    stats.innerHTML = `<small>Bonuses</small>`;
    for (const line of statLines.length ? statLines : ['None yet — equip magic weapons']) stats.append(Object.assign(document.createElement('span'), { textContent: line }));
    const skills = document.createElement('div');
    skills.className = 'inventory__skills';
    skills.innerHTML = `<small>Spell ranks (skill books)</small>`;
    for (const [el, name] of Object.entries(ELEMENT_NAMES)) {
      const rank = p.skills[el] ?? 0;
      const row = document.createElement('span');
      row.textContent = `${name}  ${'●'.repeat(rank)}${'○'.repeat(SKILL_MAX_RANK - rank)}`;
      skills.append(row);
    }
    left.append(equipped, stats, skills);

    const grid = document.createElement('section');
    grid.className = 'inventory__grid';
    for (let i = 0; i < BAG_SIZE; i++) {
      const item = p.bag[i];
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'inventory__slot';
      if (item) {
        slot.style.borderColor = itemColor(item);
        slot.innerHTML = `<b>${item.type === 'book' ? '📖' : item.type === 'weapon' ? '⚔' : '•'}</b>`;
        const name = document.createElement('span');
        name.textContent = item.name;
        name.style.color = itemColor(item);
        slot.append(name);
        slot.title = [item.name, ...describeItem(item), '', item.type === 'weapon' ? 'Click: equip · Right-click: drop' : 'Click: read · Right-click: drop'].join('\n');
        slot.addEventListener('click', () => (item.type === 'weapon' ? this.actions.onEquip(item) : this.actions.onRead(item)));
        slot.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.actions.onDrop(item);
        });
        if (item.rarity && RARITIES[item.rarity]) slot.dataset.rarity = item.rarity;
      } else slot.disabled = true;
      grid.append(slot);
    }
    card.append(head, left, grid);
    this.root.append(card);
  }
}
