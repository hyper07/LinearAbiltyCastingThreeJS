import { EventEmitter } from '../utils/EventEmitter.js';
import { SKILL_MAX_RANK, SKILL_RANK, buyPrice, itemValue } from './Items.js';
import { GEAR_SLOTS, GEAR_SLOT_IDS, activeSetBonuses, gearActive, isTwoHanded, pieceStats } from './Gear.js';
import { SLOT_COUNT, nodeOf, prerequisite, spellName, startingRanks, treeFor, treeSpells } from '../platform/skill/tree.js';

// Storage key keeps the game's first name (Elemental Arena) so existing saves still load.
const KEY = 'elemental-arena.profile';
export const BAG_SIZE = 30;
export const BELT_MAX = 10;

/**
 * The player's character between runs: purse, potion belt, bag, the weapon
 * in hand, the gear worn (items/Gear.js: helmet, armor, shield, boots,
 * rings…), and — per class — which spells are learned, their ranks and the
 * five on keys 1–5. Saved per browser (a convenience, like campaign
 * progress); `reset()` starts over.
 *
 * Gold, potions, the bag and the gear are shared by every class (a stash) —
 * though how well gear works depends on the class wearing it; spells are
 * not, because each class has its own skill tree (platform/skill/tree.js).
 *
 * Emits `change` whenever anything changes, `stats` when the numbers the
 * game uses (damage, cooldowns, health, speed…) may have moved, `slots`
 * when the spells on keys 1–5 change, and `gear` when what is worn changes.
 */
export class Profile extends EventEmitter {
  constructor() {
    super();
    /** The current class's bonuses — set by the game, not saved. */
    this.classBonus = {};
    /** The class being played (a character id) — set by the game. */
    this.classId = 'caster';
    /** The armor class the current class is proficient in — set by the game. */
    this.favoredArmor = 'cloth';
    /** Is the weapon in hand two-handed? (A shield or focus then does nothing.) */
    this.twoHanded = false;
    this._load();
  }

  /** Switch to a class: its bonuses, its armor proficiency, and its own spells and keys. */
  setClass(classId, bonuses, favoredArmor = 'cloth') {
    this.classId = classId ?? 'caster';
    this.classBonus = { ...(bonuses ?? {}) };
    this.favoredArmor = favoredArmor;
    this._ensure(this.classId);
    this.emit('stats', this.stats);
    this.emit('slots', this.slots);
  }

  _blank() {
    return {
      gold: 0,
      potions: { health: 2, focus: 0 },
      bag: [],
      equipped: null,
      /** Worn gear, by slot id (items/Gear.js GEAR_SLOTS). */
      gear: Object.fromEntries(GEAR_SLOT_IDS.map((id) => [id, null])),
      /** Per class id: `{ ranks: { element: rank }, slots: [element|null × 5] }`. */
      progress: {}
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
    this.gold = data?.gold ?? blank.gold;
    this.equipped = data?.equipped ?? null;
    this.potions = { ...blank.potions, ...(data?.potions ?? {}) };
    this.bag = Array.isArray(data?.bag) ? data.bag.slice(0, BAG_SIZE) : [];
    this.gear = { ...blank.gear };
    for (const id of GEAR_SLOT_IDS) if (data?.gear?.[id]?.type === 'gear') this.gear[id] = data.gear[id];
    this.progress = data?.progress && typeof data.progress === 'object' ? data.progress : {};
    // Saves from before skill trees kept one set of ranks for everyone (rank 0
    // = usable). Those books were read, so they count: each class gets them
    // back on the spells its tree has, the first time it is played.
    this._legacyRanks = data?.legacySkills ?? (data?.skills && !data.progress ? data.skills : null);
  }

  /** Make sure a class has a progress record, starting spells on keys. */
  _ensure(classId) {
    const existing = this.progress[classId];
    if (existing) {
      // Trees change between versions: a key holding a skill the class no
      // longer has is emptied (the Barbarian's old spells, for one)…
      existing.slots = existing.slots.map((el) => (el && nodeOf(classId, el) ? el : null));
      // …and a saved character always knows its class's current starting skills.
      for (const el of treeFor(classId).start) {
        if (existing.ranks[el] > 0) continue;
        existing.ranks[el] = 1;
        const free = existing.slots.indexOf(null);
        if (free >= 0) existing.slots[free] = el;
      }
      return existing;
    }
    const ranks = startingRanks(classId);
    for (const el of treeSpells(classId)) {
      const old = this._legacyRanks?.[el] ?? 0;
      if (old > 0) ranks[el] = Math.min(SKILL_MAX_RANK, Math.max(ranks[el] ?? 0, old + 1));
    }
    const slots = Array(SLOT_COUNT).fill(null);
    const learned = treeSpells(classId).filter((el) => ranks[el] > 0);
    // Start spells first, then whatever else is known, in tree order.
    const order = [...new Set([...treeFor(classId).start, ...learned])].filter((el) => ranks[el] > 0);
    order.slice(0, SLOT_COUNT).forEach((el, i) => (slots[i] = el));
    this.progress[classId] = { ranks, slots };
    return this.progress[classId];
  }

  save() {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ gold: this.gold, potions: this.potions, bag: this.bag, equipped: this.equipped, gear: this.gear, progress: this.progress, legacySkills: this._legacyRanks ?? undefined })
      );
    } catch {
      /* private mode: the character just is not remembered */
    }
    this.emit('change', this);
  }

  reset() {
    Object.assign(this, this._blank());
    this._legacyRanks = null;
    this._ensure(this.classId);
    this.save();
    this.emit('stats', this.stats);
    this.emit('slots', this.slots);
  }

  /* -------------------------------------------------------------------- */
  /* Spells                                                                */
  /* -------------------------------------------------------------------- */

  /** Spell ranks of a class (default: the one being played). 0 = not learned. */
  ranksOf(classId = this.classId) {
    return this._ensure(classId).ranks;
  }

  /** The current class's ranks, every spell listed. */
  get skills() {
    return this.ranksOf();
  }

  rank(element, classId = this.classId) {
    return this.ranksOf(classId)[element] ?? 0;
  }

  knows(element, classId = this.classId) {
    return this.rank(element, classId) > 0;
  }

  /** The spells on keys 1–5 (null = empty key). */
  slotsOf(classId = this.classId) {
    return this._ensure(classId).slots;
  }

  get slots() {
    return this.slotsOf();
  }

  /** How many books for a spell are in the bag. */
  booksFor(element) {
    return this.bag.filter((it) => it.type === 'book' && it.element === element).length;
  }

  /**
   * Can this class read a book for this spell right now?
   * @returns {{ ok: boolean, reason: string }}
   */
  bookStatus(element, classId = this.classId) {
    const node = nodeOf(classId, element);
    if (!node) return { ok: false, reason: `Not in this class's skill tree — sell it` };
    const rank = this.rank(element, classId);
    if (rank >= SKILL_MAX_RANK) return { ok: false, reason: `${spellName(element)} is already at rank ${SKILL_MAX_RANK}` };
    const need = prerequisite(classId, element);
    if (need && this.rank(need.element, classId) < need.rank) {
      return { ok: false, reason: `Needs ${spellName(need.element)} at rank ${need.rank} first` };
    }
    return { ok: true, reason: rank ? `Raise to rank ${rank + 1}` : 'Learn it' };
  }

  /**
   * Put a learned spell on a key. If it is already on another key, the two
   * keys swap.
   */
  setSlot(index, element, classId = this.classId) {
    const slots = this.slotsOf(classId);
    if (index < 0 || index >= SLOT_COUNT || !this.knows(element, classId)) return false;
    const was = slots.indexOf(element);
    if (was === index) return true;
    if (was >= 0) slots[was] = slots[index];
    slots[index] = element;
    this.save();
    if (classId === this.classId) this.emit('slots', this.slots);
    return true;
  }

  clearSlot(index, classId = this.classId) {
    const slots = this.slotsOf(classId);
    if (!slots[index]) return;
    slots[index] = null;
    this.save();
    if (classId === this.classId) this.emit('slots', this.slots);
  }

  /* -------------------------------------------------------------------- */
  /* Derived numbers                                                       */
  /* -------------------------------------------------------------------- */

  /** The weapon in hand changed: a two-handed one switches a shield or focus off. */
  setWeapon(weapon) {
    const two = isTwoHanded(weapon);
    if (two === this.twoHanded) return;
    this.twoHanded = two;
    this.emit('stats', this.stats);
    this.emit('gear', this.gear);
  }

  /** Is a worn piece doing anything right now? */
  isActive(item) {
    return gearActive(item, this.twoHanded);
  }

  /** Everything the class, gear and ranks add up to, in plain numbers. */
  get stats() {
    const s = { damage: 0, cooldown: 0, health: 0, speed: 0, crit: 0, gold: 0, armor: 0, attack: 0, block: 0, regen: 0, thorns: 0, element: {}, elementCooldown: {} };
    // Class bonuses (platform/character/classes.js), the weapon, every worn
    // piece and the armor set bonuses all add up the same way.
    const sources = [this.classBonus ?? {}, this.equipped?.stats ?? {}];
    for (const id of GEAR_SLOT_IDS) {
      const item = this.gear[id];
      if (item && this.isActive(item)) sources.push(pieceStats(item, this.favoredArmor));
    }
    for (const set of activeSetBonuses(this.gear)) sources.push(set.stats);
    for (const source of sources) {
      for (const [key, value] of Object.entries(source)) {
        if (key in s && key !== 'element' && key !== 'elementCooldown') s[key] += value;
        else s.element[key] = (s.element[key] ?? 0) + value;
      }
    }
    // Rank 1 is the spell as it comes; every rank after that adds.
    for (const [element, rank] of Object.entries(this.skills)) {
      if (rank <= 1) continue;
      s.element[element] = (s.element[element] ?? 0) + (rank - 1) * SKILL_RANK.damage;
      s.elementCooldown[element] = (rank - 1) * SKILL_RANK.cooldown;
    }
    s.regen = Math.round(s.regen * 10) / 10;
    return s;
  }

  /**
   * Damage multiplier for one spell — or, for `attack`, for weapon hits and
   * swings (weapon damage, not spell damage).
   */
  damageMultiplier(element) {
    const s = this.stats;
    if (element === 'attack') return Math.max(0.1, 1 + s.attack / 100);
    if (element === 'thorns') return 1;
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

  /**
   * Equip a weapon or a piece of gear from the bag; whatever was there goes
   * back in the bag in its place. A ring goes on a free finger, else replaces
   * the first ring.
   */
  equip(uid) {
    const i = this.bag.findIndex((it) => it.uid === uid);
    const item = this.bag[i];
    if (!item || (item.type !== 'weapon' && item.type !== 'gear')) return null;
    let old;
    if (item.type === 'weapon') {
      old = this.equipped;
      this.equipped = item;
    } else {
      const slot = this.slotFor(item);
      old = this.gear[slot];
      this.gear[slot] = item;
    }
    if (old) this.bag[i] = old;
    else this.bag.splice(i, 1);
    this.save();
    this.emit('stats', this.stats);
    if (item.type === 'gear') this.emit('gear', this.gear);
    return item;
  }

  /** Which slot a piece of gear would go in. */
  slotFor(item) {
    const slots = GEAR_SLOTS.filter((s) => s.kind === item.kind).map((s) => s.id);
    return slots.find((id) => !this.gear[id]) ?? slots[0];
  }

  /** Take off whatever is in a gear slot (back to the bag). */
  unequipGear(slotId) {
    const item = this.gear[slotId];
    if (!item || this.bag.length >= BAG_SIZE) return false;
    this.bag.push(item);
    this.gear[slotId] = null;
    this.save();
    this.emit('stats', this.stats);
    this.emit('gear', this.gear);
    return true;
  }

  unequip() {
    if (!this.equipped || this.bag.length >= BAG_SIZE) return false;
    this.bag.push(this.equipped);
    this.equipped = null;
    this.save();
    this.emit('stats', this.stats);
    return true;
  }

  /**
   * Read a skill book: learn the spell (and put it on a free key), or raise
   * its rank. The book stays in the bag if the class cannot read it.
   */
  read(uid, classId = this.classId) {
    const i = this.bag.findIndex((it) => it.uid === uid);
    const book = this.bag[i];
    if (!book || book.type !== 'book') return { ok: false, message: 'Not a book' };
    const status = this.bookStatus(book.element, classId);
    if (!status.ok) return { ok: false, message: status.reason };
    this.bag.splice(i, 1);
    const ranks = this.ranksOf(classId);
    const slots = this.slotsOf(classId);
    ranks[book.element] = (ranks[book.element] ?? 0) + 1;
    const name = spellName(book.element);
    let message = `${name} — rank ${ranks[book.element]}`;
    if (ranks[book.element] === 1) {
      const free = slots.indexOf(null);
      if (free >= 0) {
        slots[free] = book.element;
        message = `Learned ${name} — it is on key ${free + 1}`;
      } else message = `Learned ${name} — open the skill tree (K) to put it on a key`;
    }
    this.save();
    if (classId === this.classId) {
      this.emit('stats', this.stats);
      this.emit('slots', this.slots);
    }
    return { ok: true, message };
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
