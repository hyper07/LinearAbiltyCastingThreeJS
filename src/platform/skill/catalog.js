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

/* Barbarian skills — physical. castAnim names map to KayKit clips (modelManifest.js). */
const physical = (id, abilityId, label, castAnim, castShape, accent) =>
  createSkill(id, { label, abilityId, castAnim, castShape, accent, hint: label, physical: true });
export const earthsplitter = physical('earthsplitter', 'slam', 'Earthsplitter', 'slam', CastShape.LINE, '#e0a060');
export const rampage = physical('rampage', 'rampage', 'Rampage', 'charge', CastShape.LINE, '#ff7040');
export const battleRoar = physical('battle-roar', 'roar', 'Battle Roar', 'cheer', CastShape.SELF, '#ff4d3d');
export const skybreakerLeap = physical('skybreaker-leap', 'leap', 'Skybreaker Leap', 'leap', CastShape.ZONE, '#ffb347');
export const ironTempest = physical('iron-tempest', 'tempest', 'Iron Tempest', 'spin', CastShape.SELF, '#d8dde6');
export const worldbreaker = physical('worldbreaker', 'quake', 'Worldbreaker', 'slam', CastShape.ZONE, '#c88a4a');

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
  blinkStrike,
  earthsplitter,
  rampage,
  battleRoar,
  skybreakerLeap,
  ironTempest,
  worldbreaker
];

/** Map ability id → default skill (for resolving cast anim from element id). */
export const SKILL_BY_ABILITY = Object.fromEntries(
  DEFAULT_SKILLS.map((skill) => [skill.abilityId, skill])
);
