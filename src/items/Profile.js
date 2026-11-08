import { EventEmitter } from '../utils/EventEmitter.js';
import { SKILL_MAX_RANK, SKILL_RANK, buyPrice, itemSize, itemValue } from './Items.js';
import { findSpot, fits, overlapping } from './Grid.js';
import { GEAR_SLOTS, GEAR_SLOT_IDS, activeSetBonuses, gearActive, isTwoHanded, pieceStats } from './Gear.js';
import { SLOT_COUNT, nodeOf, prerequisite, spellName, startingRanks, treeFor, treeSpells } from '../platform/skill/tree.js';
import { DEFAULT_POTION_KEYS, SKILL_KEYS_FIRST, potionEntry, potionOf } from './hotbar.js';

// Storage key keeps the game's first name (Elemental Arena) so existing saves still load.
const KEY = 'elemental-arena.profile';
/** The bag is a grid: 8 cells across, 4 rows to start, up to 12. */
export const BAG_COLS = 8;
export const BAG_BASE_ROWS = 4;
export const BAG_MAX_ROWS = 12;
/** The stash (main menu, or the Stashkeeper in a village): a big shared grid. */
export const STASH_COLS = 12;
export const STASH_ROWS = 10;
/** Every this many character levels, the bag grows a row (up to 6 rows from levels). */
export const LEVELS_PER_ROW = 3;
export const MAX_LEVEL = 50;
/** XP to go from `level` to the next. */
export const xpToNext = (level) => Math.round(80 * Math.pow(level, 1.45));
export const BELT_MAX = 10;

/** `[x, y]` when both are whole cells, else null (anywhere free). */
const spotOf = (x, y) => (Number.isInteger(x) && Number.isInteger(y) ? [x, y] : null);

/** What a full bag says when something will not go in. */
const noRoom = (item) => `No room in your bag for ${item.name}. Open the bag (Tab) and move things to make room, or drag one out to drop it`;

/**
 * The player's character between runs: level and XP, purse, potion belt, bag
 * and stash (grids of items, see items/Grid.js), the weapon
 * in hand, the gear worn (items/Gear.js: helmet, armor, shield, boots,
 * rings…), and — per class — which spells are learned, their ranks and the
 * action bar: keys 1–9, each holding a skill or a potion (items/hotbar.js). Saved per browser (a convenience, like campaign
 * progress); `reset()` starts over.
 *
 * Gold, potions, the bag and the gear are shared by every class (a stash) —
 * though how well gear works depends on the class wearing it; spells are
 * not, because each class has its own skill tree (platform/skill/tree.js).
 *
 * Emits `change` whenever anything changes, `stats` when the numbers the
 * game uses (damage, cooldowns, health, speed…) may have moved, `slots`
 * when what is on keys 1–9 changes, and `gear` when what is worn changes.
 */
export class Profile extends EventEmitter {
  /**
   * @param {{ storage?: Storage|null, data?: object }} [options] where the character is
   *   kept: the browser's storage (default), or nowhere (`null`: the game server keeps
   *   it in its database, and the browser mirrors the server's copy)
   */
  constructor({ storage, data } = {}) {
    super();
    this.storage = storage === undefined ? browserStorage() : storage;
    /** The current class's bonuses — set by the game, not saved. */
    this.classBonus = {};
    /** The class being played (a character id) — set by the game. */
    this.classId = 'caster';
    /** The armor class the current class is proficient in — set by the game. */
    this.favoredArmor = 'cloth';
    /** Is the weapon in hand two-handed? (A shield or focus then does nothing.) */
    this.twoHanded = false;
    this._load(data !== undefined ? data : this._readSaved());
  }

  _readSaved() {
    try {
      return JSON.parse(this.storage?.getItem(KEY) ?? 'null');
    } catch {
      return null;
    }
  }

  /** The character as saved: what the browser's storage or the server's database holds. */
  serialize() {
    return { gold: this.gold, potions: this.potions, bag: this.bag, stash: this.stash, level: this.level, xp: this.xp, bagRows: this.bagRows, rowsBought: this.rowsBought, equipped: this.equipped, gear: this.gear, progress: this.progress, legacySkills: this._legacyRanks ?? undefined };
  }

  /**
   * Replace the whole character with another copy of it (the server's) and
   * tell everything that shows it.
   */
  loadState(data) {
    this._load(JSON.parse(JSON.stringify(data ?? null)));
    this._ensure(this.classId);
    this.emit('stats', this.stats);
    this.emit('slots', this.slots);
    this.emit('gear', this.gear);
    this.emit('bag', this.bagRowCount);
    this.emit('change', this);
  }

  /** A short fingerprint of the character: the browser and the server compare theirs. */
  digest() {
    return profileDigest(this);
  }

  /** Switch where the character is kept (see the constructor), reading what is there. */
  useStorage(storage) {
    this.storage = storage;
    this.loadState(this._readSaved());
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
      stash: [],
      level: 1,
      xp: 0,
      /** Extra bag rows from upgrade items and from merchants. */
      bagRows: 0,
      rowsBought: 0,
      equipped: null,
      /** Worn gear, by slot id (items/Gear.js GEAR_SLOTS). */
      gear: Object.fromEntries(GEAR_SLOT_IDS.map((id) => [id, null])),
      /** Per class id: `{ ranks: { element: rank }, slots: [element|'potion:kind'|null × 9] }`. */
      progress: {}
    };
  }

  _load(data) {
    const blank = this._blank();
    this.gold = data?.gold ?? blank.gold;
    this.equipped = data?.equipped ?? null;
    this.potions = { ...blank.potions, ...(data?.potions ?? {}) };
    this.level = Math.max(1, Math.min(MAX_LEVEL, data?.level ?? 1));
    this.xp = Math.max(0, data?.xp ?? 0);
    this.bagRows = Math.max(0, data?.bagRows ?? 0);
    this.rowsBought = Math.max(0, data?.rowsBought ?? 0);
    this.stash = Array.isArray(data?.stash) ? data.stash : [];
    this.bag = [];
    // Place everything again (sizes can change between versions); what no
    // longer fits in the bag goes to the stash rather than being lost.
    const fromSave = Array.isArray(data?.bag) ? data.bag : [];
    for (const it of this.stash) it._size = itemSize(it);
    this.stash = this._repack(this.stash, STASH_COLS, STASH_ROWS, []);
    const overflow = [];
    this.bag = this._repack(fromSave, BAG_COLS, this.bagRowCount, overflow);
    for (const it of overflow) {
      const at = findSpot(this.stash, STASH_COLS, STASH_ROWS, it._size);
      it.at = at ?? [0, 0];
      this.stash.push(it);
    }
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
      // Saves from when the bar had five keys, spells only: four more keys,
      // with the potions on 6 and 7 (where a new character has them).
      // (Always the same array, changed in place: callers hold on to it.)
      if (!Array.isArray(existing.slots)) existing.slots = [];
      const slots = existing.slots;
      if (slots.length < SLOT_COUNT) {
        const was = slots.length;
        for (let i = was; i < SLOT_COUNT; i++) slots[i] = null;
        for (const [kind, i] of Object.entries(DEFAULT_POTION_KEYS)) {
          if (i >= was && !slots.includes(potionEntry(kind))) slots[i] = potionEntry(kind);
        }
      }
      slots.length = SLOT_COUNT;
      // Trees change between versions: a key holding a skill the class no
      // longer has is emptied (the Barbarian's old spells, for one)…
      for (let i = 0; i < SLOT_COUNT; i++) {
        const el = slots[i];
        if (!(el && (potionOf(el) || nodeOf(classId, el)))) slots[i] = null;
      }
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
    for (const [kind, i] of Object.entries(DEFAULT_POTION_KEYS)) slots[i] = potionEntry(kind);
    const learned = treeSpells(classId).filter((el) => ranks[el] > 0);
    // Start spells first, then whatever else is known, in tree order: on keys
    // 1–5, then any key still free.
    const order = [...new Set([...treeFor(classId).start, ...learned])].filter((el) => ranks[el] > 0);
    const keys = [...Array(SLOT_COUNT).keys()].filter((i) => i < SKILL_KEYS_FIRST || !slots[i]);
    order.slice(0, keys.length).forEach((el, n) => (slots[keys[n]] = el));
    this.progress[classId] = { ranks, slots };
    return this.progress[classId];
  }

  save() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.serialize()));
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

  /** What is on keys 1–9: a skill, `potion:kind`, or null (an empty key). */
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
   * Put a learned spell or a potion (`potion:health`) on a key. If it is
   * already on another key, the two keys swap — so moving a key onto an
   * empty one moves it.
   */
  setSlot(index, element, classId = this.classId) {
    const slots = this.slotsOf(classId);
    if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT) return false;
    if (!potionOf(element) && !this.knows(element, classId)) return false;
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
  /* Bag, stash, level                                                     */
  /* -------------------------------------------------------------------- */

  /** Bag rows from character level: one every LEVELS_PER_ROW levels, up to 6. */
  get levelRows() {
    return Math.min(6, Math.floor(this.level / LEVELS_PER_ROW));
  }

  /** How many rows the bag has now. */
  get bagRowCount() {
    return Math.min(BAG_MAX_ROWS, BAG_BASE_ROWS + this.levelRows + this.bagRows);
  }

  /** The level that gives the next bag row (null when levels give no more). */
  get nextRowLevel() {
    if (this.levelRows >= 6 || this.bagRowCount >= BAG_MAX_ROWS) return null;
    return (this.levelRows + 1) * LEVELS_PER_ROW;
  }

  /** A container by name: `{ items, cols, rows }`. */
  grid(name) {
    return name === 'stash'
      ? { items: this.stash, cols: STASH_COLS, rows: STASH_ROWS }
      : { items: this.bag, cols: BAG_COLS, rows: this.bagRowCount };
  }

  /** Lay items out again from scratch; what does not fit goes to `overflow`. */
  _repack(list, cols, rows, overflow) {
    const out = [];
    // Big things first pack tighter; items that already have a free spot keep it.
    const sorted = [...list].map((it) => ((it._size = itemSize(it)), it));
    for (const it of sorted) {
      if (it.at && fits(out, cols, rows, it._size, it.at[0], it.at[1])) {
        out.push(it);
        continue;
      }
      const at = findSpot(out, cols, rows, it._size);
      if (at) {
        it.at = at;
        out.push(it);
      } else overflow.push(it);
    }
    return out;
  }

  /** Put an item in a container at a spot (if given and free) or anywhere free. */
  _put(item, spot = null, name = 'bag') {
    const g = this.grid(name);
    item._size = itemSize(item);
    const at = spot && fits(g.items, g.cols, g.rows, item._size, spot[0], spot[1]) ? spot : findSpot(g.items, g.cols, g.rows, item._size);
    if (!at) return false;
    item.at = [...at];
    g.items.push(item);
    return true;
  }

  /** Is there room for this item in the bag? */
  hasRoomFor(item) {
    const g = this.grid('bag');
    return Boolean(findSpot(g.items, g.cols, g.rows, itemSize(item)));
  }

  /** Would `pickUp` take this? The same answer, without taking it. */
  canPickUp(item) {
    if (item.type === 'gold') return { ok: true, message: '' };
    if (item.type === 'potion') {
      return this.potions[item.potion] >= BELT_MAX ? { ok: false, message: 'Potion belt is full' } : { ok: true, message: '' };
    }
    return this.hasRoomFor(item) ? { ok: true, message: '' } : { ok: false, message: noRoom(item) };
  }

  /**
   * Move an item within or between the bag and the stash. With `x, y` it
   * goes there (if it fits — or swaps with the one item in the way, when
   * that one fits where this came from); without, anywhere free.
   * @returns {{ ok: boolean, message?: string }}
   */
  move(uid, to, x = null, y = null) {
    const fromName = this.bag.some((it) => it.uid === uid) ? 'bag' : this.stash.some((it) => it.uid === uid) ? 'stash' : null;
    if (!fromName) return { ok: false };
    const from = this.grid(fromName);
    const dest = this.grid(to);
    const item = from.items.find((it) => it.uid === uid);
    item._size = itemSize(item);
    const was = item.at;
    if (x == null) {
      if (fromName === to) return { ok: true };
      const at = findSpot(dest.items, dest.cols, dest.rows, item._size);
      if (!at) return { ok: false, message: to === 'stash' ? 'The stash is full' : 'No room in your bag' };
      from.items.splice(from.items.indexOf(item), 1);
      item.at = at;
      dest.items.push(item);
    } else if (fits(dest.items, dest.cols, dest.rows, item._size, x, y, item)) {
      from.items.splice(from.items.indexOf(item), 1);
      item.at = [x, y];
      dest.items.push(item);
    } else {
      // One item in the way: swap the two, if it fits where this one was.
      const inWay = x + item._size[0] <= dest.cols && y + item._size[1] <= dest.rows ? overlapping(dest.items, item._size, x, y, item) : [];
      if (inWay.length !== 1) return { ok: false, message: 'It does not fit there' };
      const other = inWay[0];
      from.items.splice(from.items.indexOf(item), 1);
      dest.items.splice(dest.items.indexOf(other), 1);
      const placedOk = fits(dest.items, dest.cols, dest.rows, item._size, x, y);
      if (placedOk) {
        item.at = [x, y];
        dest.items.push(item);
      }
      other._size = itemSize(other);
      if (!placedOk || !fits(from.items, from.cols, from.rows, other._size, was[0], was[1])) {
        // Undo.
        if (placedOk) dest.items.splice(dest.items.indexOf(item), 1);
        item.at = was;
        from.items.push(item);
        dest.items.push(other);
        return { ok: false, message: 'It does not fit there' };
      }
      other.at = [...was];
      from.items.push(other);
    }
    this.save();
    return { ok: true };
  }

  /** Use a bag upgrade item: the bag grows for good. */
  useBagUpgrade(uid) {
    const i = this.bag.findIndex((it) => it.uid === uid && it.type === 'bag');
    if (i < 0) return { ok: false, message: 'Not a bag upgrade' };
    if (this.bagRowCount >= BAG_MAX_ROWS) return { ok: false, message: `Your bag is already as big as it gets (${BAG_MAX_ROWS} rows)` };
    const [item] = this.bag.splice(i, 1);
    this.bagRows += item.rows;
    this.save();
    this.emit('bag', this.bagRowCount);
    return { ok: true, message: `${item.name}: your bag now has ${this.bagRowCount} rows` };
  }

  /**
   * Gain experience. Levels up as many times as it covers.
   * @returns {number} levels gained
   */
  addXp(amount) {
    if (this.level >= MAX_LEVEL || amount <= 0) return 0;
    const rowsBefore = this.bagRowCount;
    this.xp += Math.round(amount);
    let gained = 0;
    while (this.level < MAX_LEVEL && this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level);
      this.level += 1;
      gained += 1;
    }
    if (this.level >= MAX_LEVEL) this.xp = 0;
    this.save();
    if (gained) this.emit('level', { level: this.level, bagGrew: this.bagRowCount > rowsBefore });
    return gained;
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
    if (!this._put(item)) return { ok: false, message: noRoom(item) };
    this.save();
    return { ok: true, message: item.name };
  }

  /**
   * Equip a weapon or a piece of gear from the bag; whatever was there goes
   * back in the bag in its place. A ring goes on a free finger, else replaces
   * the first ring.
   */
  equip(uid, slotId = null) {
    const i = this.bag.findIndex((it) => it.uid === uid);
    const item = this.bag[i];
    if (!item || (item.type !== 'weapon' && item.type !== 'gear')) return null;
    // A slot asked for (a ring dragged onto the second finger) is used when the piece goes there.
    const asked = item.type === 'gear' && slotId && GEAR_SLOTS.some((s) => s.id === slotId && s.kind === item.kind) ? slotId : null;
    const slot = item.type === 'weapon' ? null : asked ?? this.slotFor(item);
    const old = item.type === 'weapon' ? this.equipped : this.gear[slot];
    // The new piece leaves the bag; the old one goes where it was, or
    // anywhere it fits. No room for it at all: nothing changes.
    const spot = item.at;
    this.bag.splice(i, 1);
    if (old && !this._put(old, spot)) {
      this.bag.splice(i, 0, item);
      this._lastError = `No room in your bag for ${old.name}`;
      return null;
    }
    if (item.type === 'weapon') this.equipped = item;
    else this.gear[slot] = item;
    delete item.at;
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

  /** Take off whatever is in a gear slot (back to the bag: at `x, y` if it fits there, else anywhere). */
  unequipGear(slotId, x = null, y = null) {
    const item = this.gear[slotId];
    if (!item || !this._put(item, spotOf(x, y))) return false;
    this.gear[slotId] = null;
    this.save();
    this.emit('stats', this.stats);
    this.emit('gear', this.gear);
    return true;
  }

  /** Put the weapon in hand back in the bag (at `x, y` if it fits there); the loadout's weapon is held again. */
  unequip(x = null, y = null) {
    if (!this.equipped || !this._put(this.equipped, spotOf(x, y))) return false;
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

  /**
   * Take an item out of the bag or the stash — or, with `worn`, off the
   * character (dropping a piece of gear or the weapon in hand).
   */
  remove(uid, { worn = false } = {}) {
    let list = this.bag;
    let i = list.findIndex((it) => it.uid === uid);
    if (i < 0) {
      list = this.stash;
      i = list.findIndex((it) => it.uid === uid);
    }
    if (i < 0) return worn ? this._takeOff(uid) : null;
    const [item] = list.splice(i, 1);
    delete item.at;
    this.save();
    return item;
  }

  /** Take a worn piece or the weapon in hand off the character, to nowhere. */
  _takeOff(uid) {
    let item = null;
    if (this.equipped?.uid === uid) {
      item = this.equipped;
      this.equipped = null;
    } else {
      const slotId = Object.keys(this.gear).find((id) => this.gear[id]?.uid === uid);
      if (!slotId) return null;
      item = this.gear[slotId];
      this.gear[slotId] = null;
    }
    this.save();
    this.emit('stats', this.stats);
    if (item.type === 'gear') this.emit('gear', this.gear);
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

  /**
   * @param {object} item the offer
   * @param {{ uid?: string }} [options] the id the bought copy gets (the server names it)
   * @returns {{ ok: boolean, message: string }}
   */
  buy(item, { uid } = {}) {
    const price = buyPrice(item);
    if (this.gold < price) return { ok: false, message: `Not enough gold (${price} needed)` };
    if (item.type === 'service' && item.service === 'bagRow') {
      if (this.bagRowCount >= BAG_MAX_ROWS) return { ok: false, message: `Your bag is already as big as it gets (${BAG_MAX_ROWS} rows)` };
      this.gold -= price;
      this.bagRows += 1;
      this.rowsBought += 1;
      this.save();
      this.emit('bag', this.bagRowCount);
      return { ok: true, message: `Your bag now has ${this.bagRowCount} rows` };
    }
    const copy = { ...item, uid: uid ?? `${item.uid}-${Date.now().toString(36)}` };
    const result = this.pickUp(copy);
    if (!result.ok) return result;
    this.gold -= price;
    this.save();
    return { ok: true, message: `Bought ${item.name} for ${price} gold` };
  }
}

/** The browser's storage when there is one (not on the server, not in private mode). */
function browserStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * A fingerprint of a character (a Profile or its saved form): what it holds
 * and where, its gold, potions, level and spells. Computed the same way in
 * the browser and on the server, so either can tell when the two copies
 * have drifted apart. Item contents are not in it — an item's id is its
 * identity, and only the server makes items.
 */
export function profileDigest(p) {
  const grid = (list) => (list ?? []).map((it) => `${it.uid}@${it.at?.[0] ?? '-'},${it.at?.[1] ?? '-'}`).sort().join(';');
  const gear = Object.entries(p.gear ?? {}).map(([slot, it]) => `${slot}=${it?.uid ?? ''}`).sort().join(';');
  const progress = Object.keys(p.progress ?? {}).sort().map((cls) => {
    const r = p.progress[cls] ?? {};
    const ranks = Object.keys(r.ranks ?? {}).sort().filter((k) => r.ranks[k] > 0).map((k) => `${k}:${r.ranks[k]}`).join(',');
    return `${cls}[${ranks}|${(r.slots ?? []).map((s) => s ?? '').join(',')}]`;
  }).join(';');
  const potions = Object.keys(p.potions ?? {}).sort().map((k) => `${k}:${p.potions[k]}`).join(',');
  const text = [p.gold, p.xp, p.level, p.bagRows, p.rowsBought, potions, grid(p.bag), grid(p.stash), p.equipped?.uid ?? '', gear, progress].join('|');
  // Two independent 32-bit hashes (FNV-1a and djb2): 64 bits is plenty to notice a drift.
  let a = 0x811c9dc5;
  let b = 5381;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = (Math.imul(b, 33) + c) | 0;
  }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36);
}
