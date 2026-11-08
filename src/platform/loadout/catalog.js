import { createLoadout } from './Loadout.js';

const ELEMENTAL_SKILLS = [
  'frost-lance',
  'storm-lance',
  'cinder-fall',
  'nova-beam',
  'voltaic-snare',
  'glacial-crown',
  'arc-chain',
  'void-orb',
  'hailstorm',
  'blink-strike',
  // Barbarian skills (physical).
  'earthsplitter',
  'rampage',
  'battle-roar',
  'skybreaker-leap',
  'iron-tempest',
  'worldbreaker'
];

/** Class loadout — the same elemental kit, a signature weapon per class. */
function classLoadout(id, label, weapon) {
  return createLoadout(id, { label, skills: ELEMENTAL_SKILLS, weapon });
}

/**
 * Default loadout for the caster. `skills` is the full spell list (for stat
 * sheets); which are on keys 1–9 comes from the class skill tree.
 */
export const casterDefault = createLoadout('caster-default', {
  label: 'Elemental Caster',
  skills: ELEMENTAL_SKILLS,
  weapon: 'arcane-wand'
});

/** Staff-focused loadout — same skills, arcane staff equipped. */
export const casterStaff = createLoadout('caster-staff', {
  label: 'Staff Caster',
  skills: ELEMENTAL_SKILLS,
  weapon: 'arcane-staff'
});

/* One loadout per class: the same ten spells, the class's starting weapon. */
const CLASS_WEAPONS = {
  knight: ['Knight', 'longsword'],
  mage: ['Mage', 'arcane-staff'],
  barbarian: ['Barbarian', 'war-axe'],
  amazon: ['Amazon', 'longbow'],
  shadowblade: ['Shadowblade', 'twin-daggers'],
  templar: ['Templar', 'war-hammer'],
  bonecaller: ['Bonecaller', 'necro-staff'],
  wildwarden: ['Wildwarden', 'druid-staff']
};

export const CLASS_LOADOUTS = Object.entries(CLASS_WEAPONS).map(([id, [label, weapon]]) => classLoadout(`class-${id}`, label, weapon));

export const DEFAULT_LOADOUTS = [casterDefault, casterStaff, ...CLASS_LOADOUTS];
