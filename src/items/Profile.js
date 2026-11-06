import { EventEmitter } from '../utils/EventEmitter.js';
import { SKILL_MAX_RANK, SKILL_RANK, buyPrice, itemValue } from './Items.js';

const KEY = 'elemental-arena.profile';
export const BAG_SIZE = 24;
export const BELT_MAX = 10;

/**
 * The player's character between runs: purse, potion belt, bag, the weapon
 * in hand and spell ranks. Saved per browser (a convenience, like campaign
 * progress); `reset()` starts over.
 *
 * Emits `change` whenever anything changes, and `stats` when the numbers the
 * game uses (damage, cooldowns, health, speed…) may have moved.
 */
export class Profile extends EventEmitter {
  constructor() {
    super();
    /** The current class's bonuses — set by the game, not saved. */
    this.classBonus = {};
    this._load();
  }

  setClass(bonuses) {
    this.classBonus = { ...(bonuses ?? {}) };
    this.emit('stats', this.stats);
  }

  _blank() {
    return {
      gold: 0,
      potions: { health: 2, focus: 0 },
      bag: [],
      equipped: null,
      skills: { ice: 0, thunder: 0, meteor: 0, beam: 0, snare: 0, glacier: 0, chain: 0, orb: 0, hail: 0, blink: 0 }
    };
  }

  _load() {
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    } catch {
      data = null;
    }
    const blank = this._blank();
    Object.assign(this, blank, data ?? {});
    this.potions = { ...blank.potions, ...(data?.potions ?? {}) };
    this.skills = { ...blank.skills, ...(data?.skills ?? {}) };
    this.bag = Array.isArray(this.bag) ? this.bag.slice(0, BAG_SIZE) : [];
  }

  save() {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ gold: this.gold, potions: this.potions, bag: this.bag, equipped: this.equipped, skills: this.skills })
      );
    } catch {
      /* private mode: the character just is not remembered */
    }
    this.emit('change', this);
  }

  reset() {
    Object.assign(this, this._blank());
    this.save();
    this.emit('stats', this.stats);
  }

  /* -------------------------------------------------------------------- */
  /* Derived numbers                                                       */
  /* -------------------------------------------------------------------- */

  /** Everything the gear and ranks add up to, in plain numbers. */
  get stats() {
    const s = { damage: 0, cooldown: 0, health: 0, speed: 0, crit: 0, gold: 0, armor: 0, element: {}, elementCooldown: {} };
    // Class bonuses (platform/character/classes.js) and gear add up the same way.
    for (const source of [this.classBonus ?? {}, this.equipped?.stats ?? {}]) {
      for (const [key, value] of Object.entries(source)) {
        if (key in s && key !== 'element' && key !== 'elementCooldown') s[key] += value;
        else s.element[key] = (s.element[key] ?? 0) + value;
      }
    }
    for (const [element, rank] of Object.entries(this.skills)) {
      if (!rank) continue;
      s.element[element] = (s.element[element] ?? 0) + rank * SKILL_RANK.damage;
      s.elementCooldown[element] = rank * SKILL_RANK.cooldown;
    }
    return s;
  }

  /** Damage multiplier for one spell. */
  damageMultiplier(element) {
    const s = this.stats;
    return 1 + (s.damage + (s.element[element] ?? 0)) / 100;
  }

  /** Cooldown multiplier for one spell (never below 40%). */
  cooldownMultiplier(element) {
    const s = this.stats;
    return Math.max(0.4, 1 - (s.cooldown + (s.elementCooldown[element] ?? 0)) / 100);
  }

  /* -------------------------------------------------------------------- */
  /* Actions                                                               */
  /* -------------------------------------------------------------------- */

  /**
   * Take an item off the ground.
   * @returns {{ ok: boolean, message: string }}
   */
  pickUp(item) {
    if (item.type === 'gold') {
      this.gold += item.amount;
      this.save();
      return { ok: true, message: `+${item.amount} gold` };
    }
    if (item.type === 'potion') {
      if (this.potions[item.potion] >= BELT_MAX) return { ok: false, message: 'Potion belt is full' };
      this.potions[item.potion] += 1;
      this.save();
      return { ok: true, message: item.name };
    }
    if (this.bag.length >= BAG_SIZE) return { ok: false, message: 'Your bag is full — sell or drop something (Tab)' };
    this.bag.push(item);
    this.save();
    return { ok: true, message: item.name };
  }

  /** Equip a weapon from the bag; the old one goes back in its place. */
  equip(uid) {
    const i = this.bag.findIndex((it) => it.uid === uid);
    if (i < 0 || this.bag[i].type !== 'weapon') return null;
    const item = this.bag[i];
    if (this.equipped) this.bag[i] = this.equipped;
    else this.bag.splice(i, 1);
    this.equipped = item;
    this.save();
    this.emit('stats', this.stats);
    return item;
  }

  unequip() {
    if (!this.equipped || this.bag.length >= BAG_SIZE) return false;
    this.bag.push(this.equipped);
    this.equipped = null;
    this.save();
    this.emit('stats', this.stats);
    return true;
  }

  /** Read a skill book. */
  read(uid) {
    const i = this.bag.findIndex((it) => it.uid === uid);
    const book = this.bag[i];
    if (!book || book.type !== 'book') return { ok: false, message: 'Not a book' };
    if (this.skills[book.element] >= SKILL_MAX_RANK) return { ok: false, message: 'That spell is already at its highest rank' };
    this.bag.splice(i, 1);
    this.skills[book.element] += 1;
    this.save();
    this.emit('stats', this.stats);
    return { ok: true, message: `${book.name.replace('Tome of ', '')} rank ${this.skills[book.element]}` };
  }

  usePotion(kind) {
    if (!this.potions[kind]) return false;
    this.potions[kind] -= 1;
    this.save();
    return true;
  }

  remove(uid) {
    const i = this.bag.findIndex((it) => it.uid === uid);
    if (i < 0) return null;
    const [item] = this.bag.splice(i, 1);
    this.save();
    return item;
  }

  sell(uid) {
    const item = this.remove(uid);
    if (!item) return 0;
    const price = itemValue(item);
    this.gold += price;
    this.save();
    return price;
  }

  /** @returns {{ ok: boolean, message: string }} */
  buy(item) {
    const price = buyPrice(item);
    if (this.gold < price) return { ok: false, message: `Not enough gold (${price} needed)` };
    const copy = { ...item, uid: `${item.uid}-${Date.now().toString(36)}` };
    const result = this.pickUp(copy);
    if (!result.ok) return result;
    this.gold -= price;
    this.save();
    return { ok: true, message: `Bought ${item.name} for ${price} gold` };
  }
}
