import { ELEMENT_META, SPELL_IDS } from '../../config/settings.js';

/**
 * Class skill trees.
 *
 * Every class has three branches, and every branch is a short line of spells
 * from tier 1 to tier 3. A spell is *learned* by reading its skill book and
 * *ranked up* by reading more copies of the same book (see items/Profile.js).
 *
 * The rule that makes it a tree: a tier-2 spell's book can only be read once
 * the tier-1 spell above it is at rank 2, and a tier-3 spell needs its tier-2
 * parent at rank 3. A spell that is not in your class's tree cannot be learned
 * at all — that book is for selling.
 *
 * Of everything learned, the player puts what they like on the action bar:
 * `SLOT_COUNT` keys (1–9), each holding a skill or a potion (items/hotbar.js).
 *
 * Adding a spell to the game means adding it to `ELEMENTS` and then putting
 * it in the trees of the classes that should have it; a tree can hold any
 * number of branches and up to three tiers per branch.
 */

export const SLOT_COUNT = 9;
export const MAX_TIER = 3;

/** @typedef {{ id: string, label: string, accent: string, spells: string[] }} Branch */
/**
 * @typedef {{ branches: Branch[], start: string[], note?: string, resource?: 'rage' }} ClassTree
 *   `resource: 'rage'` — the class fights with Rage (built by hitting, spent by
 *   its big skills) on top of cooldowns.
 */

/** @type {Record<string, ClassTree>} keyed by character id */
export const CLASS_TREES = {
  knight: {
    start: ['ice', 'blink'],
    branches: [
      { id: 'bulwark', label: 'Bulwark', accent: '#8ee8ff', spells: ['ice', 'glacier'] },
      { id: 'charge', label: 'Charge', accent: '#3dffb0', spells: ['blink', 'beam'] },
      { id: 'thunder', label: 'Thunder', accent: '#7fb4ff', spells: ['thunder', 'chain'] }
    ]
  },
  mage: {
    start: ['ice', 'thunder'],
    branches: [
      { id: 'frost', label: 'Frost', accent: '#5fd0ff', spells: ['ice', 'hail', 'glacier'] },
      { id: 'storm', label: 'Storm', accent: '#ffd23f', spells: ['thunder', 'chain', 'snare'] },
      { id: 'arcane', label: 'Arcane', accent: '#c27bff', spells: ['orb', 'beam', 'meteor'] }
    ]
  },
  // No spells: physical skills. Tier 1 builds Rage, tier 2 spends it.
  barbarian: {
    start: ['slam', 'rampage'],
    resource: 'rage',
    branches: [
      { id: 'might', label: 'Might', accent: '#e0a060', spells: ['slam', 'quake'] },
      { id: 'rampage', label: 'Rampage', accent: '#ff7040', spells: ['rampage', 'leap'] },
      { id: 'warlord', label: 'Warlord', accent: '#ff4d3d', spells: ['roar', 'tempest'] }
    ]
  },
  amazon: {
    start: ['thunder', 'ice'],
    branches: [
      { id: 'storm', label: 'Storm', accent: '#ffd23f', spells: ['thunder', 'chain', 'hail'] },
      { id: 'hunt', label: 'Hunt', accent: '#a98bff', spells: ['ice', 'snare'] },
      { id: 'swift', label: 'Swift', accent: '#3dffb0', spells: ['blink', 'beam'] }
    ]
  },
  shadowblade: {
    start: ['blink', 'orb'],
    branches: [
      { id: 'shadow', label: 'Shadow', accent: '#3dffb0', spells: ['blink', 'snare'] },
      { id: 'void', label: 'Void', accent: '#c27bff', spells: ['orb', 'chain'] },
      { id: 'frost', label: 'Frost', accent: '#5fd0ff', spells: ['ice', 'hail'] }
    ]
  },
  templar: {
    start: ['orb', 'thunder'],
    branches: [
      { id: 'light', label: 'Light', accent: '#ffd77a', spells: ['orb', 'beam', 'meteor'] },
      { id: 'storm', label: 'Storm', accent: '#7fb4ff', spells: ['thunder', 'chain'] },
      { id: 'oath', label: 'Oath', accent: '#8ee8ff', spells: ['ice', 'glacier'] }
    ]
  },
  bonecaller: {
    start: ['orb', 'ice'],
    branches: [
      { id: 'soul', label: 'Soul', accent: '#b9a6d9', spells: ['orb', 'snare'] },
      { id: 'grave', label: 'Grave', accent: '#8ee8ff', spells: ['ice', 'glacier', 'hail'] },
      { id: 'storm', label: 'Storm', accent: '#ffd23f', spells: ['thunder', 'chain'] }
    ]
  },
  wildwarden: {
    start: ['ice', 'blink'],
    branches: [
      { id: 'winter', label: 'Winter', accent: '#5fd0ff', spells: ['ice', 'hail', 'glacier'] },
      { id: 'thorn', label: 'Thorn', accent: '#a98bff', spells: ['thunder', 'snare'] },
      { id: 'spirit', label: 'Spirit', accent: '#7ccf8a', spells: ['blink', 'orb'] }
    ]
  },
  // The sandbox caster is the spell tester: every spell, all known from the start.
  caster: {
    start: [...SPELL_IDS],
    note: 'Spell tester — knows every spell from the start.',
    branches: [
      { id: 'frost', label: 'Frost', accent: '#5fd0ff', spells: ['ice', 'hail', 'glacier'] },
      { id: 'storm', label: 'Storm', accent: '#ffd23f', spells: ['thunder', 'chain', 'snare'] },
      { id: 'arcane', label: 'Arcane', accent: '#c27bff', spells: ['orb', 'beam', 'meteor'] },
      { id: 'motion', label: 'Motion', accent: '#3dffb0', spells: ['blink'] }
    ]
  }
};

/** The tree for a character id; anything unknown plays as the spell tester. */
export function treeFor(classId) {
  return CLASS_TREES[classId] ?? CLASS_TREES.caster;
}

/** Every spell in a class's tree, branch by branch. */
export function treeSpells(classId) {
  return treeFor(classId).branches.flatMap((b) => b.spells);
}

/**
 * Where a spell sits in a class's tree.
 * @returns {{ branch: Branch, tier: number, parent: string|null }|null}
 */
export function nodeOf(classId, element) {
  for (const branch of treeFor(classId).branches) {
    const i = branch.spells.indexOf(element);
    if (i >= 0) return { branch, tier: i + 1, parent: i > 0 ? branch.spells[i - 1] : null };
  }
  return null;
}

/** The parent spell and the rank it needs before this one can be learned. */
export function prerequisite(classId, element) {
  const node = nodeOf(classId, element);
  if (!node?.parent) return null;
  return { element: node.parent, rank: node.tier };
}

/** Spell name for messages. */
export function spellName(element) {
  return ELEMENT_META[element]?.label ?? element;
}

/** Start spells, as starting ranks. */
export function startingRanks(classId) {
  return Object.fromEntries(treeFor(classId).start.map((el) => [el, 1]));
}
