import { createSkill } from './SkillDefinition.js';
import { CastShape } from '../../config/settings.js';

/** Default six-element skill set — mirrors `ELEMENTS` + `ELEMENT_META`. */
export const frostLance = createSkill('frost-lance', {
  label: 'Frost Lance',
  abilityId: 'ice',
  castAnim: 'cast3',
  castShape: CastShape.LINE,
  accent: '#5fd0ff',
  key: '1',
  hint: 'Frost Lance'
});

export const stormLance = createSkill('storm-lance', {
  label: 'Storm Lance',
  abilityId: 'thunder',
  castAnim: 'cast2',
  castShape: CastShape.LINE,
  accent: '#7fb4ff',
  key: '2',
  hint: 'Storm Lance'
});

export const cinderFall = createSkill('cinder-fall', {
  label: 'Cinder Fall',
  abilityId: 'meteor',
  castAnim: 'cast1',
  castShape: CastShape.LINE,
  accent: '#ff8a3c',
  key: '3',
  hint: 'Cinder Fall'
});

export const novaBeam = createSkill('nova-beam', {
  label: 'Nova Beam',
  abilityId: 'beam',
  castAnim: 'cast1',
  castShape: CastShape.LINE,
  accent: '#7ff0ff',
  key: '4',
  hint: 'Nova Beam'
});

export const voltaicSnare = createSkill('voltaic-snare', {
  label: 'Voltaic Snare',
  abilityId: 'snare',
  castAnim: 'cast2',
  castShape: CastShape.ZONE,
  accent: '#a98bff',
  key: '5',
  hint: 'Voltaic Snare'
});

export const glacialCrown = createSkill('glacial-crown', {
  label: 'Glacial Crown',
  abilityId: 'glacier',
  castAnim: 'cast3',
  castShape: CastShape.ZONE,
  accent: '#8ee8ff',
  key: '6',
  hint: 'Glacial Crown'
});

export const DEFAULT_SKILLS = [
  frostLance,
  stormLance,
  cinderFall,
  novaBeam,
  voltaicSnare,
  glacialCrown
];

/** Map ability id → default skill (for resolving cast anim from element id). */
export const SKILL_BY_ABILITY = Object.fromEntries(
  DEFAULT_SKILLS.map((skill) => [skill.abilityId, skill])
);
