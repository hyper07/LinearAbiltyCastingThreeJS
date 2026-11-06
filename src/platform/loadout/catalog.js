import { createLoadout } from './Loadout.js';

const ELEMENTAL_SKILLS = [
  'frost-lance',
  'storm-lance',
  'cinder-fall',
  'nova-beam',
  'voltaic-snare',
  'glacial-crown'
];

/** Class loadout — same elemental kit, signature weapon per Diablo archetype. */
function classLoadout(id, label, weapon) {
  return createLoadout(id, { label, skills: ELEMENTAL_SKILLS, weapon });
}

/** Default six-slot elemental loadout for the caster. */
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

/* Diablo II */
export const d2AmazonLoadout = classLoadout('d2-amazon', 'Amazon', 'longbow');
export const d2AssassinLoadout = classLoadout('d2-assassin', 'Assassin', 'twin-daggers');
export const d2BarbarianLoadout = classLoadout('d2-barbarian', 'Barbarian', 'war-axe');
export const d2DruidLoadout = classLoadout('d2-druid', 'Druid', 'druid-staff');
export const d2NecromancerLoadout = classLoadout('d2-necromancer', 'Necromancer', 'necro-staff');
export const d2PaladinLoadout = classLoadout('d2-paladin', 'Paladin', 'war-hammer');
export const d2SorceressLoadout = classLoadout('d2-sorceress', 'Sorceress', 'arcane-wand');

/* Diablo III */
export const d3BarbarianLoadout = classLoadout('d3-barbarian', 'Barbarian', 'battle-axe');
export const d3CrusaderLoadout = classLoadout('d3-crusader', 'Crusader', 'mace');
export const d3DemonHunterLoadout = classLoadout('d3-demon-hunter', 'Demon Hunter', 'crossbow');
export const d3MonkLoadout = classLoadout('d3-monk', 'Monk', 'battle-staff');
export const d3NecromancerLoadout = classLoadout('d3-necromancer', 'Necromancer', 'necro-staff');
export const d3WitchDoctorLoadout = classLoadout('d3-witch-doctor', 'Witch Doctor', 'void-orb');
export const d3WizardLoadout = classLoadout('d3-wizard', 'Wizard', 'arcane-staff');

export const DEFAULT_LOADOUTS = [
  casterDefault,
  casterStaff,
  d2AmazonLoadout,
  d2AssassinLoadout,
  d2BarbarianLoadout,
  d2DruidLoadout,
  d2NecromancerLoadout,
  d2PaladinLoadout,
  d2SorceressLoadout,
  d3BarbarianLoadout,
  d3CrusaderLoadout,
  d3DemonHunterLoadout,
  d3MonkLoadout,
  d3NecromancerLoadout,
  d3WitchDoctorLoadout,
  d3WizardLoadout
];
