/**
 * The hero's panels (adapted from Lanternwood's panels.js): the bag (a grid
 * of slots; I or B), the character (C: ten equipment slots round the hero
 * turning on a plinth in what they wear, and their numbers), and the
 * armsmonger's stall (buy and sell). Drag an item to wear it, take it off,
 * move it, swap it, or sell it; right-click or double-click wears (or, at the
 * stall, sells). Hovering shows what an item is and how it compares to what
 * is worn. Pictures come from the items' own 3D models.
 */
import { el, esc } from './ui.js';
import { BASES, SLOTS, SLOT_NAMES, RARITIES, STAT_NAMES, POTIONS, BAG_SIZE, AFFIXES, slotsFor, canEquip, compareItem, equipFromBag, unequip, moveInBag, sellFromBag, sellPrice, buyPrice, buy, sortBag, isTwoHanded, refillPotions } from './items.js';
import { RESOURCES } from './rules.js';

const fmt = (k, v) => `${v > 0 ? '+' : ''}${Number.isInteger(v) ? v : v.toFixed(1)} ${STAT_NAMES[k] ?? k}`;

/** What an item is, for its tooltip. */
export function itemTip(entry, p, { worn = false, price = null, sell = false, buying = false } = {}) {
  if (!entry) return '';
  if (!entry.base) {
    const P = POTIONS[entry.kind];
    return `<div class="gr-tip__name" style="color:${P.color}">${esc(P.name)}${entry.n > 1 ? ` ×${entry.n}` : ''}</div><div class="gr-tip__line">${esc(P.desc)}</div><div class="gr-tip__hint">Press ${P.key} to drink — no cooldown.</div>${price != null ? `<div class="gr-tip__price">${price} gold</div>` : ''}`;
  }
  const b = BASES[entry.base];
  const R = RARITIES[entry.rarity];
  const can = canEquip(entry, p);
  const lines = Object.entries(entry.stats).map(([k, v]) => `<div class="gr-tip__stat">${esc(fmt(k, v))}</div>`).join('');
  let cmp = '';
  if (!worn && slotsFor(entry).length) {
    const d = compareItem(entry, p.equip);
    const keys = Object.keys(d);
    cmp = keys.length ? `<div class="gr-tip__cmp"><div class="gr-tip__cmph">If worn</div>${keys.map((k) => `<div class="${d[k] > 0 ? 'is-up' : 'is-down'}">${esc(fmt(k, d[k]))}</div>`).join('')}</div>` : '<div class="gr-tip__cmp"><div class="gr-tip__cmph">Same as worn</div></div>';
  }
  const kind = b.slot === 'mainhand' ? `${b.hands === 2 ? 'Two-handed' : 'One-handed'} ${b.name.toLowerCase()}` : `${SLOT_NAMES[b.slot === 'trinket' ? 'trinket1' : b.slot]}${b.weight ? ` · ${b.weight}` : ''}`;
  const affix = entry.affixes?.length ? `<div class="gr-tip__affix">${entry.affixes.map((a) => esc(AFFIXES[a]?.name ?? a)).join(' · ')}</div>` : '';
  return `<div class="gr-tip__name" style="color:${R.color}">${esc(entry.name)}</div>
    <div class="gr-tip__kind">${esc(R.name)} · ${esc(kind)}</div>
    <div class="gr-tip__lvl">Item level ${entry.ilvl} · <span class="${entry.req > p.level ? 'is-bad' : ''}">needs level ${entry.req}</span></div>
    ${lines}${affix}
    ${!can.ok && !worn ? `<div class="gr-tip__bad">${esc(can.reason)}</div>` : ''}
    ${cmp}
    ${price != null ? `<div class="gr-tip__price">${sell ? 'Sells for' : 'Costs'} ${price} gold</div>` : ''}
    <div class="gr-tip__hint">${buying ? 'Click to buy.' : worn ? 'Drag to the bag to take off.' : sell ? 'Right-click (or drag to the stall) to sell.' : 'Drag onto the hero, or right-click, to wear.'}</div>`;
}

export class Panels {
  /**
   * `game`: { profile (getter), studio, preview (getter), onChange(), sfx, merchantStock() }.
   */
  constructor(host, game) {
    this.g = game;
    this.host = host;
    this.root = el('div', 'gr-panels');
    host.append(this.root);
    this.tip = el('div', 'gr-tip');
    this.tip.hidden = true;
    this.root.append(this.tip);
    this.open = { bag: false, char: false, shop: false };
    this.stock = [];
    this.drag = null;
    this._onMove = (e) => this._move(e);
    this._onUp = (e) => this._up(e);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
  }

  get p() {
    return this.g.profile;
  }

  get any() {
    return this.open.bag || this.open.char || this.open.shop;
  }

  toggle(which, on = !this.open[which]) {
    this.open[which] = on;
    if (which === 'shop' && on) {
      this.open.bag = true;
      this.open.char = false;
      this.stock = this.g.merchantStock();
    }
    if (which === 'shop' && !on) this.stock = [];
    if (which !== 'shop' && on && this.open.shop) this.open.shop = false;
    this.g.sfx?.tick?.();
    this.render();
  }

  closeAll() {
    this.open = { bag: false, char: false, shop: false };
    this.render();
  }

  render() {
    this.tip.hidden = true;
    this.root.querySelectorAll('.gr-win').forEach((w) => w.remove());
    if (this.open.char) this.root.append(this._charWin());
    else this.g.preview?.el.remove();
    if (this.open.shop) this.root.append(this._shopWin());
    if (this.open.bag) this.root.append(this._bagWin());
    this.root.classList.toggle('is-open', this.any);
  }

  _icon(entry) {
    if (!entry) return '';
    if (entry.base) return `<img alt="" draggable="false" src="${this.g.studio.icon(entry)}">`;
    const P = POTIONS[entry.kind];
    return `<i class="gr-flask" style="--c:${P.color}"></i><b class="gr-cell__n">${entry.n}</b>`;
  }

  _cell(entry, attrs, extra = '') {
    const r = entry?.base ? entry.rarity : '';
    return `<div class="gr-cell ${r ? `is-${r}` : ''} ${extra}" ${attrs}>${this._icon(entry)}</div>`;
  }

  /* ------------------------------------------------------------ windows */

  _bagWin() {
    const p = this.p;
    const w = el('section', 'gr-win gr-win--bag');
    w.innerHTML = `<header><h2>Bag</h2><button class="gr-x" data-close="bag" aria-label="Close">×</button></header>
      <div class="gr-grid">${p.bag.map((e, i) => this._cell(e, `data-bag="${i}"`)).join('')}</div>
      <footer><span class="gr-goldline"><i class="gr-coin"></i> ${p.gold}</span><button class="gr-btn gr-btn--small" data-sort>Tidy</button></footer>`;
    this._wire(w);
    w.querySelector('[data-sort]').addEventListener('click', () => {
      sortBag(p.bag);
      this._changed();
    });
    return w;
  }

  _charWin() {
    const p = this.p;
    const v = this.g.vitals();
    const s = this.g.stats();
    const w = el('section', 'gr-win gr-win--char');
    const slot = (k) => `<div class="gr-eq" data-slot="${k}">${this._cell(p.equip[k], `data-slot="${k}"`, 'gr-cell--eq')}<span>${esc(SLOT_NAMES[k])}</span></div>`;
    const left = ['head', 'chest', 'cape', 'hands', 'trinket1'];
    const right = ['legs', 'feet', 'mainhand', 'offhand', 'trinket2'];
    const R = RESOURCES[s.resource];
    w.innerHTML = `<header><h2>${esc(this.g.heroName)} <small>Level ${p.level}</small></h2><button class="gr-x" data-close="char" aria-label="Close">×</button></header>
      <div class="gr-paper">
        <div class="gr-paper__col">${left.map(slot).join('')}</div>
        <div class="gr-preview"></div>
        <div class="gr-paper__col">${right.map(slot).join('')}</div>
      </div>
      <dl class="gr-statlist">
        <dt>Health</dt><dd>${s.maxHp}</dd><dt>${esc(R.name)}</dt><dd>${s.maxRes}</dd>
        <dt>Attack</dt><dd>${s.atk}</dd><dt>Spell power</dt><dd>${s.spell}</dd>
        <dt>Armour</dt><dd>${s.armour}</dd><dt>Critical</dt><dd>${Math.round(s.crit * 100)} % ×${s.critMult.toFixed(2)}</dd>
        <dt>Block</dt><dd>${Math.round(s.block * 100)} %</dd><dt>Speed</dt><dd>${Math.round(s.speed * 100)} %</dd>
        <dt>Experience</dt><dd>${p.xp} / ${v.next}</dd><dt>Gold</dt><dd>${p.gold}</dd>
      </dl>`;
    const pv = this.g.preview;
    if (pv) w.querySelector('.gr-preview').append(pv.el);
    this._wire(w);
    return w;
  }

  _shopWin() {
    const w = el('section', 'gr-win gr-win--shop');
    const m = this.g.merchant ?? { title: "Dorrin's Arms", sub: 'Armsmonger of Brindlewick', lead: '“Steel for the woods, and coin for what you drag back out of them.”' };
    w.innerHTML = `<header><h2>${esc(m.title)} <small>${esc(m.sub)}</small></h2><button class="gr-x" data-close="shop" aria-label="Close">×</button></header>
      <p class="gr-shop__lead">${esc(m.lead)} Drag your things here to sell.</p>
      <div class="gr-grid gr-grid--shop" data-sell>
        ${['hp', 'mp'].map((k) => this._cell({ kind: k, n: '∞' }, `data-buy="${k}"`)).join('')}
        ${this.stock.map((e, i) => this._cell(e, `data-stock="${i}"`)).join('')}
      </div>
      <footer><span class="gr-goldline"><i class="gr-coin"></i> ${this.p.gold}</span><button class="gr-btn gr-btn--small" data-refill title="Buy draughts and tonics until you carry five of each">Refill potions</button><span class="gr-shop__note">Click to buy · right-click your bag to sell</span></footer>`;
    this._wire(w);
    w.querySelector('[data-refill]').addEventListener('click', () => {
      const r = refillPotions(this.p, 5);
      const n = r.bought.hp + r.bought.mp;
      if (n) {
        this.g.sfx?.coins?.();
        this.g.toast?.(`Refilled: ${r.bought.hp} draught${r.bought.hp === 1 ? '' : 's'}, ${r.bought.mp} tonic${r.bought.mp === 1 ? '' : 's'} for ${r.cost} gold`, 'gold');
      } else {
        this.g.sfx?.denied?.();
        this.g.toast?.(r.reason ?? 'Your potions are full.', 'muted');
      }
      this._changed();
    });
    return w;
  }

  /* ------------------------------------------------------------ input */

  _entryAt(t) {
    const p = this.p;
    if (t.dataset.bag != null) return { from: 'bag', i: +t.dataset.bag, entry: p.bag[+t.dataset.bag] };
    if (t.dataset.slot != null) return { from: 'slot', slot: t.dataset.slot, entry: p.equip[t.dataset.slot] };
    if (t.dataset.stock != null) return { from: 'stock', i: +t.dataset.stock, entry: this.stock[+t.dataset.stock] };
    if (t.dataset.buy != null) return { from: 'buy', entry: { kind: t.dataset.buy, n: 1 } };
    return null;
  }

  _wire(w) {
    w.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.toggle(b.dataset.close, false)));
    w.querySelectorAll('.gr-cell').forEach((c) => {
      c.addEventListener('pointerenter', () => this._showTip(c));
      c.addEventListener('pointerleave', () => (this.tip.hidden = true));
      c.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        const at = this._entryAt(c);
        if (!at?.entry) return;
        if (at.from === 'stock' || at.from === 'buy') return this._buy(at);
        this.drag = { ...at, x0: e.clientX, y0: e.clientY, ghost: null, cell: c };
        e.preventDefault();
      });
      c.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._quick(c);
      });
      c.addEventListener('dblclick', () => this._quick(c));
    });
  }

  _showTip(c) {
    if (this.drag) return;
    const at = this._entryAt(c);
    if (!at?.entry) return;
    const shop = this.open.shop;
    const price = at.from === 'stock' || at.from === 'buy' ? buyPrice(at.entry) : shop && at.from === 'bag' ? sellPrice(at.entry) : null;
    this.tip.innerHTML = itemTip(at.entry, this.p, { worn: at.from === 'slot', price, sell: shop && at.from === 'bag', buying: at.from === 'stock' || at.from === 'buy' });
    this.tip.hidden = false;
    const r = c.getBoundingClientRect();
    const host = this.root.getBoundingClientRect();
    const tw = this.tip.offsetWidth;
    const th = this.tip.offsetHeight;
    let x = r.right + 10 - host.left;
    if (x + tw > host.width - 8) x = r.left - tw - 10 - host.left;
    const y = Math.min(host.height - th - 8, Math.max(8, r.top - host.top));
    this.tip.style.transform = `translate(${x}px, ${y}px)`;
  }

  /** Right-click: wear it; take it off; drink it; at the stall, sell it. */
  _quick(c) {
    const at = this._entryAt(c);
    if (!at?.entry) return;
    const p = this.p;
    if (at.from === 'stock' || at.from === 'buy') return this._buy(at);
    if (at.from === 'bag' && this.open.shop) return this._sell(at.i);
    if (at.from === 'bag' && !at.entry.base) return this.g.drink(at.entry.kind);
    if (at.from === 'bag') return this._result(equipFromBag(p, at.i));
    if (at.from === 'slot') return this._result(unequip(p, at.slot));
  }

  _sell(i) {
    const e = this.p.bag[i];
    if (!e) return;
    const gold = sellFromBag(this.p, i);
    this.g.toast(`Sold ${e.base ? e.name : POTIONS[e.kind].name} for ${gold} gold`, 'gold');
    this.g.sfx?.coins();
    this._changed();
  }

  _buy(at) {
    const r = buy(this.p, at.entry, at.from === 'stock' ? this.stock : null);
    if (!r.ok) {
      this.g.toast(r.reason, 'muted');
      this.g.sfx?.denied();
      return;
    }
    this.g.toast(`Bought ${at.entry.base ? at.entry.name : POTIONS[at.entry.kind].name}`, at.entry.base ? 'item' : 'potion', at.entry.base ? at.entry : null, at.entry.base ? null : POTIONS[at.entry.kind].color);
    this.g.sfx?.coins();
    this._changed();
  }

  _result(r) {
    if (!r.ok) {
      this.g.toast(r.reason, 'muted');
      this.g.sfx?.denied();
    } else this.g.sfx?.equip?.();
    this._changed();
  }

  _changed() {
    this.g.onChange();
    this.render();
  }

  _move(e) {
    const d = this.drag;
    if (!d) return;
    if (!d.ghost) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
      d.ghost = el('div', 'gr-ghost', this._icon(d.entry));
      this.root.append(d.ghost);
      d.cell.classList.add('is-dragged');
      this.tip.hidden = true;
      // Light up where it can go.
      if (d.entry.base) for (const s of slotsFor(d.entry)) this.root.querySelectorAll(`.gr-eq[data-slot="${s}"]`).forEach((x) => x.classList.add('is-target'));
    }
    const host = this.root.getBoundingClientRect();
    d.ghost.style.transform = `translate(${e.clientX - host.left - 28}px, ${e.clientY - host.top - 28}px)`;
  }

  _up(e) {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (!d.ghost) return;
    d.ghost.remove();
    d.cell.classList.remove('is-dragged');
    this.root.querySelectorAll('.is-target').forEach((x) => x.classList.remove('is-target'));
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const cell = under?.closest('[data-bag], [data-slot], [data-sell], .gr-preview');
    const p = this.p;
    if (!cell) return this.render();
    if (d.from === 'bag') {
      if (cell.dataset.bag != null) {
        moveInBag(p.bag, d.i, +cell.dataset.bag);
        return this._changed();
      }
      if (cell.dataset.slot != null) {
        if (!d.entry.base || !slotsFor(d.entry).includes(cell.dataset.slot)) return this._result({ ok: false, reason: 'That does not go there.' });
        return this._result(equipFromBag(p, d.i, cell.dataset.slot));
      }
      if (cell.classList.contains('gr-preview') && d.entry.base) return this._result(equipFromBag(p, d.i));
      if (cell.dataset.sell != null && this.open.shop) return this._sell(d.i);
    }
    if (d.from === 'slot') {
      if (cell.dataset.bag != null) return this._result(unequip(p, d.slot, p.bag[+cell.dataset.bag] ? -1 : +cell.dataset.bag));
      if (cell.dataset.slot != null && cell.dataset.slot !== d.slot && slotsFor(d.entry).includes(cell.dataset.slot)) {
        // Trinket to trinket: swap.
        [p.equip[d.slot], p.equip[cell.dataset.slot]] = [p.equip[cell.dataset.slot], p.equip[d.slot]];
        return this._changed();
      }
    }
    this.render();
  }

  dispose() {
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    this.root.remove();
  }
}

void SLOTS;
void BAG_SIZE;
void isTwoHanded;
