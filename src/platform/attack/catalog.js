import { createAttack } from './AttackDefinition.js';

/* ------------------------------------------------------------------ *
 * Shared attack library — mixed into per-class kits below.
 * ------------------------------------------------------------------ */

export const slash = createAttack('slash', {
  label: 'Slash',
  damage: 11,
  range: 2.1,
  castAnim: 'cast2',
  accent: '#ffd0a0',
  hint: 'Quick horizontal cut'
});

export const heavySlash = createAttack('heavy-slash', {
  label: 'Heavy Slash',
  damage: 18,
  range: 2.4,
  arc: Math.PI * 0.8,
  knockback: 1.1,
  cooldown: 0.62,
  castAnim: 'cast1',
  accent: '#ff9860',
  hint: 'Wide power swing'
});

export const thrust = createAttack('thrust', {
  label: 'Thrust',
  damage: 13,
  range: 2.8,
  arc: Math.PI * 0.35,
  knockback: 0.4,
  cooldown: 0.38,
  castAnim: 'cast3',
  accent: '#ffe8c8',
  hint: 'Piercing lunge'
});

export const cleave = createAttack('cleave', {
  label: 'Cleave',
  damage: 22,
  range: 2.6,
  arc: Math.PI * 1.05,
  knockback: 1.4,
  cooldown: 0.72,
  castAnim: 'cast1',
  accent: '#ff7840',
  hint: 'Arcing cleave'
});

export const whirlwind = createAttack('whirlwind', {
  label: 'Whirlwind',
  damage: 16,
  range: 2.3,
  arc: Math.PI * 1.4,
  knockback: 0.9,
  cooldown: 0.85,
  castAnim: 'cast2',
  accent: '#ffa050',
  hint: 'Spinning strike'
});

export const jab = createAttack('jab', {
  label: 'Jab',
  damage: 9,
  range: 2.0,
  arc: Math.PI * 0.4,
  knockback: 0.25,
  cooldown: 0.28,
  castAnim: 'cast3',
  accent: '#c8e8ff',
  hint: 'Fast puncture'
});

export const powerStrike = createAttack('power-strike', {
  label: 'Power Strike',
  damage: 17,
  range: 2.5,
  knockback: 1.0,
  cooldown: 0.55,
  castAnim: 'cast1',
  accent: '#9fd4ff',
  hint: 'Charged spear thrust'
});

export const rapidStrike = createAttack('rapid-strike', {
  label: 'Rapid Strike',
  damage: 8,
  range: 1.9,
  arc: Math.PI * 0.55,
  knockback: 0.2,
  cooldown: 0.24,
  castAnim: 'cast2',
  accent: '#b8f0ff',
  hint: 'Flurry of blows'
});

export const palmStrike = createAttack('palm-strike', {
  label: 'Palm Strike',
  damage: 12,
  range: 1.8,
  arc: Math.PI * 0.5,
  knockback: 0.85,
  cooldown: 0.36,
  castAnim: 'cast3',
  accent: '#d8c8ff',
  hint: 'Short-range palm'
});

export const roundhouse = createAttack('roundhouse', {
  label: 'Roundhouse',
  damage: 14,
  range: 2.2,
  arc: Math.PI * 0.95,
  knockback: 0.75,
  cooldown: 0.48,
  castAnim: 'cast2',
  accent: '#e8b8ff',
  hint: 'Spinning kick'
});

export const shadowStep = createAttack('shadow-step', {
  label: 'Shadow Step',
  damage: 15,
  range: 2.4,
  arc: Math.PI * 0.6,
  knockback: 0.5,
  cooldown: 0.44,
  castAnim: 'cast1',
  accent: '#a898ff',
  hint: 'Blinking slash'
});

export const smite = createAttack('smite', {
  label: 'Smite',
  damage: 19,
  range: 2.3,
  arc: Math.PI * 0.7,
  knockback: 1.2,
  cooldown: 0.58,
  castAnim: 'cast1',
  accent: '#fff0b0',
  hint: 'Holy hammer blow'
});

export const shieldBash = createAttack('shield-bash', {
  label: 'Shield Bash',
  damage: 11,
  range: 1.7,
  arc: Math.PI * 0.45,
  knockback: 1.6,
  cooldown: 0.5,
  castAnim: 'cast3',
  accent: '#ffe8a8',
  hint: 'Stunning shoulder check'
});

export const warCryStrike = createAttack('war-cry-strike', {
  label: 'War Cry',
  damage: 14,
  range: 2.5,
  arc: Math.PI * 1.0,
  knockback: 1.3,
  cooldown: 0.68,
  castAnim: 'cast2',
  accent: '#ff9060',
  hint: 'Shout and swing'
});

export const maul = createAttack('maul', {
  label: 'Maul',
  damage: 24,
  range: 2.2,
  arc: Math.PI * 0.75,
  knockback: 1.5,
  cooldown: 0.78,
  castAnim: 'cast1',
  accent: '#ff6840',
  hint: 'Overhead crush'
});

export const rake = createAttack('rake', {
  label: 'Rake',
  damage: 13,
  range: 2.0,
  arc: Math.PI * 0.9,
  knockback: 0.55,
  cooldown: 0.4,
  castAnim: 'cast2',
  accent: '#90e8a0',
  hint: 'Claw swipe'
});

export const maulingSwipe = createAttack('mauling-swipe', {
  label: 'Mauling Swipe',
  damage: 17,
  range: 2.3,
  arc: Math.PI * 0.85,
  knockback: 0.95,
  cooldown: 0.52,
  castAnim: 'cast3',
  accent: '#78d890',
  hint: 'Bear-form swipe'
});

export const boneSpear = createAttack('bone-spear', {
  label: 'Bone Spear',
  damage: 14,
  range: 2.7,
  arc: Math.PI * 0.4,
  knockback: 0.35,
  cooldown: 0.46,
  castAnim: 'cast3',
  accent: '#c8f0d0',
  hint: 'Short bone jab'
});

export const soulDrain = createAttack('soul-drain', {
  label: 'Soul Drain',
  damage: 12,
  range: 2.1,
  arc: Math.PI * 0.55,
  knockback: 0.3,
  cooldown: 0.42,
  castAnim: 'cast2',
  accent: '#98ffb8',
  hint: 'Life tap strike'
});

export const staffBash = createAttack('staff-bash', {
  label: 'Staff Bash',
  damage: 10,
  range: 2.0,
  arc: Math.PI * 0.6,
  knockback: 0.7,
  cooldown: 0.38,
  castAnim: 'cast2',
  accent: '#b8d8ff',
  hint: 'Two-handed bonk'
});

export const arcaneStrike = createAttack('arcane-strike', {
  label: 'Arcane Strike',
  damage: 11,
  range: 2.2,
  arc: Math.PI * 0.65,
  knockback: 0.45,
  cooldown: 0.36,
  castAnim: 'cast3',
  accent: '#88d8ff',
  hint: 'Wand-infused hit'
});

export const forcePush = createAttack('force-push', {
  label: 'Force Push',
  damage: 9,
  range: 2.4,
  arc: Math.PI * 0.5,
  knockback: 1.8,
  cooldown: 0.48,
  castAnim: 'cast1',
  accent: '#a0e8ff',
  hint: 'Concussive shove'
});

export const crossbowBolt = createAttack('crossbow-bolt', {
  label: 'Crossbow Bolt',
  damage: 13,
  range: 3.2,
  arc: Math.PI * 0.25,
  knockback: 0.2,
  cooldown: 0.44,
  castAnim: 'cast3',
  accent: '#d0e8ff',
  hint: 'Point-blank bolt'
});

export const fanKnives = createAttack('fan-knives', {
  label: 'Fan of Knives',
  damage: 10,
  range: 2.1,
  arc: Math.PI * 1.1,
  knockback: 0.15,
  cooldown: 0.34,
  castAnim: 'cast2',
  accent: '#c0b0ff',
  hint: 'Spray of blades'
});

export const chargedShot = createAttack('charged-shot', {
  label: 'Charged Shot',
  damage: 16,
  range: 3.0,
  arc: Math.PI * 0.3,
  knockback: 0.35,
  cooldown: 0.56,
  castAnim: 'cast1',
  accent: '#90c8ff',
  hint: 'Drawn bow punch'
});

export const DEFAULT_ATTACKS = [
  slash,
  heavySlash,
  thrust,
  cleave,
  whirlwind,
  jab,
  powerStrike,
  rapidStrike,
  palmStrike,
  roundhouse,
  shadowStep,
  smite,
  shieldBash,
  warCryStrike,
  maul,
  rake,
  maulingSwipe,
  boneSpear,
  soulDrain,
  staffBash,
  arcaneStrike,
  forcePush,
  crossbowBolt,
  fanKnives,
  chargedShot
];
