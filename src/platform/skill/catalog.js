import { createSkill } from './SkillDefinition.js';
import { CastShape } from '../../config/settings.js';

/** Default skill set (keys 1–0) — mirrors `ELEMENTS` + `ELEMENT_META`. */
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

export const arcChain = createSkill('arc-chain', {
  label: 'Arc Chain',
  abilityId: 'chain',
  castAnim: 'cast2',
  castShape: CastShape.LINE,
  accent: '#ffd23f',
  key: '7',
  hint: 'Arc Chain'
});

export const voidOrb = createSkill('void-orb', {
  label: 'Void Orb',
  abilityId: 'orb',
  castAnim: 'cast1',
  castShape: CastShape.LINE,
  accent: '#c27bff',
  key: '8',
  hint: 'Void Orb'
});

export const hailstorm = createSkill('hailstorm', {
  label: 'Hailstorm',
  abilityId: 'hail',
  castAnim: 'cast3',
  castShape: CastShape.ZONE,
  accent: '#bfe8ff',
  key: '9',
  hint: 'Hailstorm'
});

export const blinkStrike = createSkill('blink-strike', {
  label: 'Blink Strike',
  abilityId: 'blink',
  castAnim: 'cast1',
  castShape: CastShape.LINE,
  accent: '#3dffb0',
  key: '0',
  hint: 'Blink Strike'
});

export const DEFAULT_SKILLS = [
  frostLance,
  stormLance,
  cinderFall,
  novaBeam,
  voltaicSnare,
  glacialCrown,
  arcChain,
  voidOrb,
  hailstorm,
  blinkStrike
];

/** Map ability id → default skill (for resolving cast anim from element id). */
export const SKILL_BY_ABILITY = Object.fromEntries(
  DEFAULT_SKILLS.map((skill) => [skill.abilityId, skill])
);
