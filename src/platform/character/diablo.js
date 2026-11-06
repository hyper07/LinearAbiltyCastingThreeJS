import { createCharacter } from './CharacterDefinition.js';

const CAST = ['cast1', 'cast2', 'cast3'];

const agileCast = {
  castBlendIn: 0.1,
  castBlendOut: 0.22,
  castLean: 0.26,
  castRecoil: 0.12,
  castSettle: 2.9
};

const heavyCast = {
  castBlendIn: 0.16,
  castBlendOut: 0.34,
  castLean: 0.42,
  castRecoil: 0.2,
  castSettle: 2.2
};

const mysticCast = {
  castBlendIn: 0.14,
  castBlendOut: 0.32,
  castLean: 0.3,
  castRecoil: 0.14,
  castSettle: 2.5
};

/* ------------------------------------------------------------------ */
/* Diablo II — seven original classes                                  */
/* ------------------------------------------------------------------ */

export const d2Amazon = createCharacter('d2-amazon', {
  label: 'Amazon',
  series: 'Diablo II',
  icon: '🏹',
  tagline: 'Bow and javelin huntress of the Skovos Isles',
  castClips: CAST,
  motion: 'humanoid-sprint',
  defaultLoadout: 'd2-amazon',
  wandSide: 'Left',
  casting: agileCast
});

export const d2Assassin = createCharacter('d2-assassin', {
  label: 'Assassin',
  series: 'Diablo II',
  icon: '🗡',
  tagline: 'Martial arts and shadow traps from the Viz-Jaq\'taar',
  castClips: CAST,
  motion: 'humanoid-sprint',
  defaultLoadout: 'd2-assassin',
  wandSide: 'Right',
  casting: { ...agileCast, castLean: 0.22, castBlendIn: 0.08 }
});

export const d2Barbarian = createCharacter('d2-barbarian', {
  label: 'Barbarian',
  series: 'Diablo II',
  icon: '⚔',
  tagline: 'Dual-wield fury and war cries from the Northern Steppes',
  castClips: CAST,
  motion: 'humanoid-heavy',
  defaultLoadout: 'd2-barbarian',
  wandSide: 'Right',
  casting: heavyCast
});

export const d2Druid = createCharacter('d2-druid', {
  label: 'Druid',
  series: 'Diablo II',
  icon: '🌿',
  tagline: 'Shape-shifting elementalist of the Tesheba Highlands',
  castClips: CAST,
  motion: 'humanoid-walk',
  defaultLoadout: 'd2-druid',
  wandSide: 'Right',
  casting: mysticCast
});

export const d2Necromancer = createCharacter('d2-necromancer', {
  label: 'Necromancer',
  series: 'Diablo II',
  icon: '💀',
  tagline: 'Curse and bone magic from the Priests of Rathma',
  castClips: CAST,
  motion: 'humanoid-walk',
  defaultLoadout: 'd2-necromancer',
  wandSide: 'Right',
  casting: { ...mysticCast, castBlendIn: 0.18, castLean: 0.28 }
});

export const d2Paladin = createCharacter('d2-paladin', {
  label: 'Paladin',
  series: 'Diablo II',
  icon: '🛡',
  tagline: 'Holy auras and zeal from the Church of Zakarum',
  castClips: CAST,
  motion: 'humanoid-heavy',
  defaultLoadout: 'd2-paladin',
  wandSide: 'Right',
  casting: { ...heavyCast, castLean: 0.36 }
});

export const d2Sorceress = createCharacter('d2-sorceress', {
  label: 'Sorceress',
  series: 'Diablo II',
  icon: '✦',
  tagline: 'Fire, cold and lightning from the Zann Esu mage clan',
  castClips: CAST,
  motion: 'humanoid-sprint',
  defaultLoadout: 'd2-sorceress',
  wandSide: 'Right',
  casting: {
    castBlendIn: 0.12,
    castBlendOut: 0.3,
    castLean: 0.34,
    castRecoil: 0.16,
    castSettle: 2.6
  }
});

/* ------------------------------------------------------------------ */
/* Diablo III — console / PC roster                                    */
/* ------------------------------------------------------------------ */

export const d3Barbarian = createCharacter('d3-barbarian', {
  label: 'Barbarian',
  series: 'Diablo III',
  icon: '⚔',
  tagline: 'Leap and whirlwind — last of the Duncraig defenders',
  castClips: CAST,
  motion: 'humanoid-heavy',
  defaultLoadout: 'd3-barbarian',
  wandSide: 'Right',
  casting: heavyCast
});

export const d3Crusader = createCharacter('d3-crusader', {
  label: 'Crusader',
  series: 'Diablo III',
  icon: '✠',
  tagline: 'Shield and faith — Akkhan\'s order returned from the east',
  castClips: CAST,
  motion: 'humanoid-heavy',
  defaultLoadout: 'd3-crusader',
  wandSide: 'Right',
  casting: { ...heavyCast, castLean: 0.38 }
});

export const d3DemonHunter = createCharacter('d3-demon-hunter', {
  label: 'Demon Hunter',
  series: 'Diablo III',
  icon: '⊹',
  tagline: 'Crossbow traps and smoke — sworn to the Sightless Eyes',
  castClips: CAST,
  motion: 'humanoid-sprint',
  defaultLoadout: 'd3-demon-hunter',
  wandSide: 'Left',
  casting: agileCast
});

export const d3Monk = createCharacter('d3-monk', {
  label: 'Monk',
  series: 'Diablo III',
  icon: '☯',
  tagline: 'Seven-sided strike and sweeping wind from Ivgorod',
  castClips: CAST,
  motion: 'humanoid-walk',
  defaultLoadout: 'd3-monk',
  wandSide: 'Right',
  casting: { ...agileCast, castLean: 0.24, castRecoil: 0.1 }
});

export const d3Necromancer = createCharacter('d3-necromancer', {
  label: 'Necromancer',
  series: 'Diablo III',
  icon: '☠',
  tagline: 'Army of the dead — Rathma\'s heirs reborn',
  castClips: CAST,
  motion: 'humanoid-walk',
  defaultLoadout: 'd3-necromancer',
  wandSide: 'Right',
  casting: mysticCast
});

export const d3WitchDoctor = createCharacter('d3-witch-doctor', {
  label: 'Witch Doctor',
  series: 'Diablo III',
  icon: '🎭',
  tagline: 'Spirit realm hexes and fetishes from Teganze',
  castClips: CAST,
  motion: 'humanoid-walk',
  defaultLoadout: 'd3-witch-doctor',
  wandSide: 'Left',
  casting: { ...mysticCast, castBlendIn: 0.16, castLean: 0.32 }
});

export const d3Wizard = createCharacter('d3-wizard', {
  label: 'Wizard',
  series: 'Diablo III',
  icon: '✧',
  tagline: 'Arcane mastery — youngest to survive the Yshari Sanctum',
  castClips: CAST,
  motion: 'humanoid-sprint',
  defaultLoadout: 'd3-wizard',
  wandSide: 'Right',
  casting: {
    castBlendIn: 0.11,
    castBlendOut: 0.28,
    castLean: 0.36,
    castRecoil: 0.18,
    castSettle: 2.7
  }
});

export const DIABLO_II_CHARACTERS = [
  d2Amazon,
  d2Assassin,
  d2Barbarian,
  d2Druid,
  d2Necromancer,
  d2Paladin,
  d2Sorceress
];

export const DIABLO_III_CHARACTERS = [
  d3Barbarian,
  d3Crusader,
  d3DemonHunter,
  d3Monk,
  d3Necromancer,
  d3WitchDoctor,
  d3Wizard
];

export const DIABLO_CHARACTERS = [...DIABLO_II_CHARACTERS, ...DIABLO_III_CHARACTERS];
