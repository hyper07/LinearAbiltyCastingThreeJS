import { createCharacter } from './CharacterDefinition.js';
import { KAYKIT_ANIMATION_CLIPS } from './modelManifest.js';
import { ELEMENT_META } from '../../config/settings.js';

/**
 * Player classes. Every class casts the same six elemental spells; what
 * differs is the body, the starting weapon, the close-range attacks, and a
 * set of bonuses that push each one toward a style of play:
 *
 *   health / armor   how much punishment it takes (armor = % of damage ignored)
 *   speed            % move speed
 *   damage           % to every spell
 *   cooldown         % off every cooldown
 *   crit             % critical chance
 *   <element>        % to one spell (ice, thunder, meteor, beam, snare, glacier,
 *                    chain, orb, hail, blink)
 *
 * Bonuses stack with gear and skill books (see items/Profile.js).
 */

/**
 * Bodies. All nine share KayKit's rig and animation set, so any class can
 * wear any of them; each class lists the ones that suit it.
 */
export const LOOKS = {
  knight: { label: 'Knight', path: './models/characters/knight/model.glb', targetHeight: 1.82 },
  mage: { label: 'Mage', path: './models/characters/mage/model.glb', targetHeight: 1.78 },
  barbarian: { label: 'Barbarian', path: './models/characters/barbarian/model.glb', targetHeight: 1.86 },
  rogue: { label: 'Rogue', path: './models/characters/rogue/model.glb', targetHeight: 1.76 },
  'rogue-hooded': { label: 'Hooded rogue', path: './models/characters/rogue-hooded/model.glb', targetHeight: 1.74 },
  'skeleton-warrior': { label: 'Skeleton warrior', path: './models/characters/skeleton-warrior/model.glb', targetHeight: 1.82 },
  'skeleton-mage': { label: 'Skeleton mage', path: './models/characters/skeleton-mage/model.glb', targetHeight: 1.78 },
  'skeleton-rogue': { label: 'Skeleton rogue', path: './models/characters/skeleton-rogue/model.glb', targetHeight: 1.76 },
  'skeleton-minion': { label: 'Skeleton minion', path: './models/characters/skeleton-minion/model.glb', targetHeight: 1.7 }
};

const agile = { castBlendIn: 0.1, castBlendOut: 0.22, castLean: 0.26, castRecoil: 0.12, castSettle: 2.9 };
const heavy = { castBlendIn: 0.16, castBlendOut: 0.34, castLean: 0.42, castRecoil: 0.2, castSettle: 2.2 };
const mystic = { castBlendIn: 0.14, castBlendOut: 0.32, castLean: 0.3, castRecoil: 0.14, castSettle: 2.5 };

/**
 * @typedef {object} ClassSpec
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {string} tagline
 * @property {string} weapon       starting weapon id
 * @property {string} motion       motion profile id
 * @property {object} casting
 * @property {string[]} looks      suggested bodies, first is the default
 * @property {string} tint
 * @property {string[]} attacks    close-range attack ids
 * @property {Record<string, number>} bonuses
 */

/** @type {ClassSpec[]} */
export const CLASS_SPECS = [
  {
    id: 'knight',
    label: 'Knight',
    icon: '🛡',
    tagline: 'Sworn shield of the Ember Keep. Plate, patience, and a long blade.',
    weapon: 'longsword',
    motion: 'humanoid-heavy',
    casting: heavy,
    looks: ['knight', 'skeleton-warrior'],
    tint: '#d9dde6',
    attacks: ['heavy-slash', 'shield-bash', 'smite', 'thrust'],
    bonuses: { health: 50, armor: 20, speed: -5, glacier: 15 }
  },
  {
    id: 'mage',
    label: 'Mage',
    icon: '✦',
    tagline: 'Scholar of the six elements. Frail in a brawl, terrifying at range.',
    weapon: 'arcane-staff',
    motion: 'humanoid-walk',
    casting: mystic,
    looks: ['mage', 'skeleton-mage'],
    tint: '#7aa8ff',
    attacks: ['arcane-strike', 'force-push', 'staff-bash', 'jab'],
    bonuses: { health: -25, damage: 18, cooldown: 10 }
  },
  {
    id: 'barbarian',
    label: 'Barbarian',
    icon: '🪓',
    tagline: 'Raider out of the frozen north who laughs at wounds and calls down fire.',
    weapon: 'war-axe',
    motion: 'humanoid-heavy',
    casting: heavy,
    looks: ['barbarian', 'skeleton-warrior'],
    tint: '#d08a5a',
    attacks: ['cleave', 'maul', 'whirlwind', 'war-cry-strike'],
    bonuses: { health: 70, armor: 10, speed: 8, meteor: 20 }
  },
  {
    id: 'amazon',
    label: 'Amazon',
    icon: '🏹',
    tagline: 'Huntress of the southern isles. Fast feet, sure aim, storm in the bowstring.',
    weapon: 'longbow',
    motion: 'humanoid-sprint',
    casting: agile,
    looks: ['rogue', 'rogue-hooded'],
    tint: '#e0a0c0',
    attacks: ['charged-shot', 'jab', 'rapid-strike', 'power-strike'],
    bonuses: { speed: 10, crit: 12, thunder: 20 }
  },
  {
    id: 'shadowblade',
    label: 'Shadowblade',
    icon: '🗡',
    tagline: 'A knife in the dark — there, and gone, and the trap already sprung.',
    weapon: 'twin-daggers',
    motion: 'humanoid-sprint',
    casting: { ...agile, castLean: 0.22, castBlendIn: 0.08 },
    looks: ['rogue-hooded', 'skeleton-rogue'],
    tint: '#8a94a8',
    attacks: ['shadow-step', 'fan-knives', 'palm-strike', 'roundhouse'],
    bonuses: { speed: 15, crit: 8, snare: 15, health: -10 }
  },
  {
    id: 'templar',
    label: 'Templar',
    icon: '✚',
    tagline: 'A holy knight for whom the light is a weapon, not a comfort.',
    weapon: 'war-hammer',
    motion: 'humanoid-heavy',
    casting: heavy,
    looks: ['knight', 'mage'],
    tint: '#ffd77a',
    attacks: ['smite', 'shield-bash', 'heavy-slash', 'war-cry-strike'],
    bonuses: { health: 30, armor: 10, beam: 25 }
  },
  {
    id: 'bonecaller',
    label: 'Bonecaller',
    icon: '💀',
    tagline: 'Speaks with what the war left behind, and the dead answer in lightning.',
    weapon: 'necro-staff',
    motion: 'humanoid-walk',
    casting: mystic,
    looks: ['skeleton-mage', 'skeleton-minion'],
    tint: '#b9a6d9',
    attacks: ['bone-spear', 'soul-drain', 'staff-bash', 'thrust'],
    bonuses: { health: -10, damage: 10, cooldown: 6, snare: 20 }
  },
  {
    id: 'wildwarden',
    label: 'Wildwarden',
    icon: '🌿',
    tagline: 'Keeper of the old groves. Frost, thorn and a long memory.',
    weapon: 'druid-staff',
    motion: 'humanoid-walk',
    casting: mystic,
    looks: ['mage', 'barbarian'],
    tint: '#7ccf8a',
    attacks: ['rake', 'mauling-swipe', 'slash', 'thrust'],
    bonuses: { health: 20, glacier: 20, ice: 15 }
  }
];

/** Bonus lines for the menu, in plain words. */
export function describeBonuses(bonuses = {}) {
  const sign = (v) => (v > 0 ? `+${v}` : `${v}`);
  return Object.entries(bonuses).map(([key, v]) => {
    if (key === 'health') return `${sign(v)} max health`;
    if (key === 'armor') return `${v}% less damage taken`;
    if (key === 'speed') return `${sign(v)}% move speed`;
    if (key === 'damage') return `${sign(v)}% spell damage`;
    if (key === 'cooldown') return `−${v}% cooldowns`;
    if (key === 'crit') return `+${v}% critical chance`;
    return `${sign(v)}% ${ELEMENT_META[key]?.label ?? key} damage`;
  });
}

/** The chosen body per class, remembered in this browser. */
const LOOK_KEY = 'elemental-arena.looks';
export function savedLook(classId) {
  try {
    return JSON.parse(localStorage.getItem(LOOK_KEY) ?? '{}')[classId] ?? null;
  } catch {
    return null;
  }
}
export function saveLook(classId, lookId) {
  try {
    const all = JSON.parse(localStorage.getItem(LOOK_KEY) ?? '{}');
    all[classId] = lookId;
    localStorage.setItem(LOOK_KEY, JSON.stringify(all));
  } catch {
    /* private mode: the default look it is */
  }
}

/**
 * Bodies from "My models" (uploads and generated characters), registered once
 * the catalog has loaded. Ids are `custom:<slug>`.
 * @type {Record<string, { label: string, path: string, rig: string, animations: string[] }>}
 */
export const CUSTOM_LOOKS = {};

export function registerCustomLooks(models) {
  for (const key of Object.keys(CUSTOM_LOOKS)) delete CUSTOM_LOOKS[key];
  for (const m of models) {
    if (!m.rigged || (m.rig !== 'mixamo' && !m.animations?.length)) continue;
    CUSTOM_LOOKS[`custom:${m.slug}`] = { label: m.name, path: `./library/${m.file}`, rig: m.rig, animations: m.animations ?? [] };
  }
  return CUSTOM_LOOKS;
}

/** Which clip in a model plays idle, walk, run and the casts — by name. */
function guessClips(names) {
  const find = (re, fallback) => names.find((n) => re.test(n)) ?? fallback;
  const idle = find(/idle/i, names[0]);
  const attack = find(/attack|slash|shoot|cast|fire|punch/i, idle);
  return { idle, walk: find(/walk/i, null), run: find(/run|sprint/i, null), casts: { cast1: attack, cast2: attack, cast3: attack } };
}

/** The rig adapter and motion set a look needs. */
export function lookRig(lookId) {
  const custom = CUSTOM_LOOKS[lookId];
  if (!custom) return { rig: 'kaykit', motionDataset: 'kaykit-locomotion' };
  return custom.rig === 'mixamo' ? { rig: 'mixamo', motionDataset: 'caster-locomotion' } : { rig: 'kaykit', motionDataset: null };
}

/** The `model` block for a class wearing a given body. */
export function lookModel(lookId, tint) {
  const custom = CUSTOM_LOOKS[lookId];
  if (custom) {
    return custom.rig === 'mixamo'
      ? { format: 'glb-mixamo', idle: custom.path, scale: 1, targetHeight: 1.8, tint }
      : { format: 'glb', idle: custom.path, scale: 1, targetHeight: 1.8, tint, animationClips: guessClips(custom.animations) };
  }
  const look = LOOKS[lookId] ?? LOOKS.knight;
  return {
    format: 'glb',
    idle: look.path,
    scale: 1,
    targetHeight: look.targetHeight,
    tint,
    animationClips: KAYKIT_ANIMATION_CLIPS
  };
}

export const CLASS_CHARACTERS = CLASS_SPECS.map((spec) =>
  createCharacter(spec.id, {
    label: spec.label,
    series: 'Classes',
    icon: spec.icon,
    tagline: spec.tagline,
    rig: 'kaykit',
    model: lookModel(savedLook(spec.id) ?? spec.looks[0], spec.tint),
    look: savedLook(spec.id) ?? spec.looks[0],
    castClips: ['cast1', 'cast2', 'cast3'],
    motion: spec.motion,
    motionDataset: 'kaykit-locomotion',
    defaultLoadout: `class-${spec.id}`,
    wandSide: spec.id === 'amazon' ? 'Left' : 'Right',
    casting: spec.casting,
    classSpec: spec
  })
);

/** Bonuses for a character id (none for the sandbox caster). */
export function classBonuses(characterId) {
  return CLASS_SPECS.find((c) => c.id === characterId)?.bonuses ?? {};
}
