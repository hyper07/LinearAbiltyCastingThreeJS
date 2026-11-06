import { createClothing } from './ClothingDefinition.js';

export const CLOTHING_SLOTS = [
  { id: 'head', label: 'Head', glyph: '🎭' },
  { id: 'chest', label: 'Chest', glyph: '🛡' },
  { id: 'back', label: 'Back', glyph: '🧥' },
  { id: 'waist', label: 'Waist', glyph: '⛓' }
];

export const noneClothing = createClothing('clothing-none', {
  label: 'None',
  slot: 'chest',
  visual: null,
  icon: '○',
  description: 'Remove gear from this slot.'
});

export const hoodShadow = createClothing('hood-shadow', {
  label: 'Shadow Hood',
  slot: 'head',
  attachPoint: 'head',
  visual: 'hood',
  color: '#2a2438',
  icon: '🕯',
  description: 'Deep hood — assassin and necromancer staple.'
});

export const hoodCrimson = createClothing('hood-crimson', {
  label: 'Crimson Hood',
  slot: 'head',
  attachPoint: 'head',
  visual: 'hood',
  color: '#6a1828',
  icon: '🕯',
  description: 'Blood-red cowl.'
});

export const skullMask = createClothing('skull-mask', {
  label: 'Skull Mask',
  slot: 'head',
  attachPoint: 'head',
  visual: 'skull-mask',
  color: '#d8d0c4',
  icon: '💀',
  description: 'Bone mask over the face.'
});

export const capeDark = createClothing('cape-dark', {
  label: 'Dark Cape',
  slot: 'back',
  attachPoint: 'chest',
  visual: 'cape',
  color: '#1a1428',
  icon: '🧥',
  description: 'Floor-length black cape.'
});

export const capeCrimson = createClothing('cape-crimson', {
  label: 'Crimson Cape',
  slot: 'back',
  attachPoint: 'chest',
  visual: 'cape',
  color: '#7a1828',
  icon: '🧥',
  description: 'Battle-worn red cloak.'
});

export const capeHoly = createClothing('cape-holy', {
  label: 'Holy Mantle',
  slot: 'back',
  attachPoint: 'chest',
  visual: 'cape',
  color: '#d4c878',
  icon: '✠',
  description: 'Paladin and crusader mantle.'
});

export const pauldronsGold = createClothing('pauldrons-gold', {
  label: 'Gold Pauldrons',
  slot: 'chest',
  attachPoint: 'chest',
  visual: 'pauldrons',
  color: '#c9a227',
  icon: '⛨',
  description: 'Heavy shoulder guards.'
});

export const pauldronsSteel = createClothing('pauldrons-steel', {
  label: 'Steel Pauldrons',
  slot: 'chest',
  attachPoint: 'chest',
  visual: 'pauldrons',
  color: '#8890a0',
  icon: '⛨',
  description: 'Polished steel shoulders.'
});

export const beltLeather = createClothing('belt-leather', {
  label: 'Leather Belt',
  slot: 'waist',
  attachPoint: 'hips',
  visual: 'belt',
  color: '#4a3828',
  icon: '⛓',
  description: 'Wide leather war belt.'
});

export const beltGold = createClothing('belt-gold', {
  label: 'Royal Belt',
  slot: 'waist',
  attachPoint: 'hips',
  visual: 'belt',
  color: '#b8942a',
  icon: '⛓',
  description: 'Gilded buckle and plates.'
});

export const quiver = createClothing('quiver', {
  label: 'Quiver',
  slot: 'back',
  attachPoint: 'chest',
  visual: 'quiver',
  color: '#5a4030',
  icon: '🏹',
  description: 'Arrow quiver — amazon and demon hunter.'
});

export const boneSpikes = createClothing('bone-spikes', {
  label: 'Bone Spikes',
  slot: 'chest',
  attachPoint: 'chest',
  visual: 'bone-spikes',
  color: '#d8d0c4',
  icon: '☠',
  description: 'Jagged bone shoulder spikes.'
});

export const DEFAULT_CLOTHING = [
  noneClothing,
  hoodShadow,
  hoodCrimson,
  skullMask,
  capeDark,
  capeCrimson,
  capeHoly,
  pauldronsGold,
  pauldronsSteel,
  beltLeather,
  beltGold,
  quiver,
  boneSpikes
];
