/**
 * Lanternwood — the hero classes, their skills, the basic-attack combo of
 * each weapon type, and the looks a hero can start with. Plain data and pure
 * functions (no three.js, no DOM), so every number here is unit-tested.
 *
 *   CLASSES.seer.skills      → ['nova', 'blink', 'lance', 'blizzard']  (keys 1–4)
 *   SKILLS.nova.cost / .cd   → mana (or energy) and seconds between uses
 *   COMBOS.spear             → the basic attack's stages for a spear
 *   LOOKS.blade              → the faces, hair and builds a Blade can wear
 */

/** Skin tones, light to deep (each becomes a shading ramp in sprites.js). */
export const SKINS = ['#f6d4b4', '#e6ae86', '#c98a60', '#94603e', '#62402c'];

/** Hair cuts drawn in sprites.js (the letter map of the head). */
export const HAIR_STYLES = ['short', 'long', 'bun', 'spiky', 'ponytail', 'bob', 'bald', 'curly'];

/**
 * The four classes. `lean` scales the shared stat curve (hp, resource, attack,
 * defence); `resource` is what skills cost (mana refills slowly, energy fast);
 * `skills` are on keys 1–4; `start` is the gear a new hero wears.
 */
export const CLASSES = {
  blade: {
    name: 'Blade', role: 'Melee', old: 'ember', resource: 'mana',
    blurb: 'A sword arm and a temper. Three-strike combos, a gap-closing lunge, a whirl and a fiery cleave.',
    lean: { hp: 1, mp: 1, atk: 1, def: 1, crit: 0 },
    skills: ['lunge', 'whirl', 'cleave', 'fireball'],
    weapons: ['shortsword', 'longsword', 'dagger', 'axe', 'spear'],
    armour: ['light', 'medium'],
    offhand: ['shield:buckler'],
    start: { weapon: 'shortsword', chest: 'jerkin', feet: 'boots' }
  },
  warden: {
    name: 'Warden', role: 'Tank · support', old: 'moss', resource: 'mana',
    blurb: 'Shield and mace. Slower, heavier blows, a stunning bash, a guard stance and a healing totem for the party.',
    lean: { hp: 1.25, mp: 0.9, atk: 0.92, def: 1.6, crit: 0 },
    skills: ['bash', 'guard', 'totem', 'quake'],
    weapons: ['mace', 'axe', 'shortsword', 'spear'],
    armour: ['light', 'medium', 'heavy'],
    offhand: ['shield:buckler', 'shield:kite', 'shield:tower'],
    start: { weapon: 'mace', offhand: 'kite', chest: 'mail', head: 'openhelm' }
  },
  seer: {
    name: 'Seer', role: 'Ranged caster', old: 'frost', resource: 'mana',
    blurb: 'A staff that fires bolts. Frost nova, blink, ice lance and a blizzard — fragile, but deadly from afar.',
    lean: { hp: 0.85, mp: 1.55, atk: 0.9, def: 0.8, crit: 0 },
    skills: ['nova', 'blink', 'lance', 'blizzard'],
    weapons: ['staff', 'dagger'],
    armour: ['light'],
    offhand: ['tome'],
    start: { weapon: 'staff', chest: 'robe', head: 'wizard' }
  },
  ranger: {
    name: 'Ranger', role: 'Ranged · agile', old: null, resource: 'energy',
    blurb: 'A bow and quick feet. Fast shots, a volley, a snare trap, a roll-shot and a rain of arrows.',
    lean: { hp: 0.95, mp: 1, atk: 1.02, def: 0.9, crit: 0.05 },
    skills: ['volley', 'trap', 'rollshot', 'rain'],
    weapons: ['bow', 'dagger'],
    armour: ['light', 'medium'],
    offhand: ['quiver'],
    start: { weapon: 'bow', chest: 'jerkin', head: 'cap', feet: 'boots' }
  }
};
export const CLASS_ORDER = ['blade', 'warden', 'seer', 'ranger'];

/** An old save's look (v1: ember / moss / frost) → its class. */
export const classOfOldLook = (look) => ({ ember: 'blade', moss: 'warden', frost: 'seer' })[look] ?? (CLASSES[look] ? look : 'blade');

/**
 * Skills. `cost` in the class's resource, `cd` seconds, `mult` × attack (spells
 * also × spell power), `kind` how the game plays it, `pose` the rig's pose,
 * `fx` the pixel effects it shows, `icon` its hotbar drawing.
 */
export const SKILLS = {
  // Blade
  lunge: { name: 'Lunge', cost: 10, cd: 4, kind: 'dash', mult: 1.6, range: 7, width: 1.4, knock: 5, pose: 'lunge', fx: ['moves/dash-strike', 'impacts/crit-hit'], icon: 'lunge', desc: 'Dash up to 7 m and strike every foe you pass.' },
  whirl: { name: 'Whirl', cost: 18, cd: 2.2, kind: 'aoe', mult: 1.3, radius: 3.4, knock: 6, pose: 'spin', fx: ['melee/spin-slash'], icon: 'whirl', desc: 'Spin with the blade out, hitting all around you.' },
  cleave: { name: 'Flame Cleave', cost: 22, cd: 5, kind: 'cone', mult: 2.4, range: 4.4, arc: 2.0, knock: 7, burn: 4, pose: 'overhead', fx: ['melee/heavy-cleave', 'fire/fire-breath'], icon: 'cleave', spell: true, desc: 'A great burning arc in front of you that sets foes alight.' },
  fireball: { name: 'Fireball', cost: 12, cd: 0.55, kind: 'proj', mult: 1.7, speed: 17, range: 22, radius: 1.6, knock: 4, pose: 'cast', fx: ['explosions/small-explosion'], icon: 'fire', spell: true, desc: 'A bolt of fire that bursts on the first thing it meets.' },
  // Warden
  bash: { name: 'Shield Bash', cost: 10, cd: 3.5, kind: 'bash', mult: 1.2, range: 2.8, arc: 1.7, knock: 8, stun: 1.6, pose: 'bash', fx: ['impacts/shield-block', 'status/stunned'], icon: 'bash', desc: 'Slam your shield into the foes in front: they are stunned.' },
  guard: { name: 'Guard', cost: 15, cd: 9, kind: 'buff', time: 4, reduce: 0.6, taunt: 12, pose: 'guard', fx: ['holy/divine-shield'], icon: 'guard', desc: 'Raise your shield: 60 % less damage for 4 s, and nearby foes turn on you.' },
  totem: { name: 'Regrowth Totem', cost: 25, cd: 14, kind: 'totem', time: 8, radius: 5.5, heal: 0.035, pose: 'plant', fx: ['nature/healing-bloom', 'holy/heal-aoe'], icon: 'totem', desc: 'Plant a totem that heals you and your party nearby for 8 s.' },
  quake: { name: 'Earthshaker', cost: 20, cd: 6, kind: 'aoe', mult: 1.6, radius: 4.2, knock: 9, slow: 0.4, slowT: 2, pose: 'slam', fx: ['impacts/ground-slam', 'nature/quake'], icon: 'quake', desc: 'Pound the ground: damage and a stagger all around.' },
  // Seer
  nova: { name: 'Frost Nova', cost: 16, cd: 5, kind: 'aoe', mult: 1.0, radius: 4.6, knock: 3, slow: 0.5, slowT: 3, pose: 'nova', fx: ['ice/frost-nova'], icon: 'nova', spell: true, desc: 'A ring of frost bursts out from you and slows everything it touches.' },
  blink: { name: 'Blink', cost: 12, cd: 4, kind: 'blink', range: 7.5, pose: 'cast', fx: ['arcane/blink-out', 'arcane/blink-in'], icon: 'blink', desc: 'Step through the air to a spot 7 m ahead.' },
  lance: { name: 'Ice Lance', cost: 14, cd: 1.2, kind: 'proj', pierce: true, mult: 2.2, speed: 24, range: 26, radius: 0.6, knock: 3, pose: 'thrust', fx: ['ice/ice-shatter'], icon: 'lance', spell: true, desc: 'A spear of ice that pierces through every foe in a line.' },
  blizzard: { name: 'Blizzard', cost: 30, cd: 10, kind: 'zone', mult: 0.45, range: 8, radius: 4, time: 4, tick: 0.5, slow: 0.5, slowT: 1, pose: 'raise', fx: ['ice/blizzard-vortex'], icon: 'blizzard', spell: true, desc: 'Call a storm of ice ahead of you: damage and a slow for 4 s.' },
  // Ranger
  volley: { name: 'Volley', cost: 20, cd: 3, kind: 'fan', mult: 0.9, count: 5, spread: 0.9, speed: 24, range: 20, knock: 2, pose: 'draw', fx: ['moves/arrow-shot'], icon: 'volley', desc: 'Loose five arrows in a fan.' },
  trap: { name: 'Snare Trap', cost: 15, cd: 8, kind: 'trap', mult: 1.5, radius: 2.4, root: 2.5, life: 20, pose: 'plant', fx: ['nature/root-snare'], icon: 'trap', desc: 'Set a snare at your feet: the first foes to cross it are rooted and hurt.' },
  rollshot: { name: 'Roll Shot', cost: 12, cd: 4, kind: 'rollshot', mult: 1.7, speed: 26, range: 20, pose: 'roll', fx: ['spawn/poof'], icon: 'rollshot', desc: 'Roll backwards out of reach and fire a heavy arrow as you land.' },
  rain: { name: 'Arrow Rain', cost: 28, cd: 9, kind: 'zone', mult: 0.5, range: 9, radius: 3.6, time: 3, tick: 0.3, pose: 'skyshot', fx: ['moves/arrow-shot'], icon: 'rain', desc: 'Arrows fall on a spot ahead of you for 3 s.' }
};

/**
 * The basic attack of each weapon type: stages that chain if pressed in time.
 * `pose` is the rig's motion; `proj` stages fire a missile instead of a swing.
 */
const ARC = Math.PI * 0.62;
export const COMBOS = {
  shortsword: [
    { dur: 0.3, cd: 0.26, mult: 1, arc: ARC, range: 2.4, knock: 3.2, pose: 'sweepR' },
    { dur: 0.3, cd: 0.26, mult: 1.15, arc: ARC, range: 2.4, knock: 3.2, pose: 'sweepL' },
    { dur: 0.46, cd: 0.5, mult: 1.9, arc: Math.PI * 0.5, range: 3.0, knock: 6.4, pose: 'smash', lunge: 7 }
  ],
  longsword: [
    { dur: 0.4, cd: 0.36, mult: 1.35, arc: Math.PI * 0.8, range: 3.0, knock: 4.2, pose: 'heavyR' },
    { dur: 0.4, cd: 0.36, mult: 1.5, arc: Math.PI * 0.8, range: 3.0, knock: 4.2, pose: 'heavyL' },
    { dur: 0.6, cd: 0.62, mult: 2.6, arc: Math.PI * 0.55, range: 3.5, knock: 8, pose: 'smash', lunge: 8 }
  ],
  dagger: [
    { dur: 0.17, cd: 0.13, mult: 0.62, arc: Math.PI * 0.45, range: 1.9, knock: 1.2, pose: 'jabR' },
    { dur: 0.17, cd: 0.13, mult: 0.62, arc: Math.PI * 0.45, range: 1.9, knock: 1.2, pose: 'jabL' },
    { dur: 0.17, cd: 0.13, mult: 0.7, arc: Math.PI * 0.45, range: 1.9, knock: 1.2, pose: 'jabR' },
    { dur: 0.3, cd: 0.34, mult: 1.4, arc: Math.PI * 0.5, range: 2.3, knock: 4, pose: 'stab', lunge: 6 }
  ],
  axe: [
    { dur: 0.42, cd: 0.38, mult: 1.4, arc: Math.PI * 0.75, range: 2.6, knock: 4.6, pose: 'heavyR' },
    { dur: 0.42, cd: 0.38, mult: 1.5, arc: Math.PI * 0.75, range: 2.6, knock: 4.6, pose: 'heavyL' },
    { dur: 0.6, cd: 0.62, mult: 2.5, arc: Math.PI * 0.5, range: 3.0, knock: 9, pose: 'smash', lunge: 6 }
  ],
  mace: [
    { dur: 0.38, cd: 0.34, mult: 1.25, arc: Math.PI * 0.7, range: 2.4, knock: 4.2, pose: 'heavyR' },
    { dur: 0.38, cd: 0.34, mult: 1.35, arc: Math.PI * 0.7, range: 2.4, knock: 4.2, pose: 'heavyL' },
    { dur: 0.56, cd: 0.6, mult: 2.3, arc: Math.PI * 0.5, range: 2.8, knock: 9, pose: 'smash', lunge: 5 }
  ],
  spear: [
    { dur: 0.3, cd: 0.28, mult: 1.1, arc: Math.PI * 0.28, range: 3.7, knock: 3.6, pose: 'thrust' },
    { dur: 0.3, cd: 0.28, mult: 1.1, arc: Math.PI * 0.28, range: 3.7, knock: 3.6, pose: 'thrust' },
    { dur: 0.5, cd: 0.5, mult: 2.0, arc: Math.PI * 0.62, range: 3.9, knock: 6, pose: 'sweepR', lunge: 6 }
  ],
  staff: [
    { dur: 0.28, cd: 0.3, mult: 0.85, pose: 'bolt', proj: 'bolt', speed: 19, range: 18 },
    { dur: 0.28, cd: 0.3, mult: 0.85, pose: 'bolt', proj: 'bolt', speed: 19, range: 18 },
    { dur: 0.42, cd: 0.5, mult: 0.8, pose: 'bolt3', proj: 'bolt', count: 3, spread: 0.32, speed: 19, range: 18 }
  ],
  bow: [
    { dur: 0.26, cd: 0.26, mult: 0.9, pose: 'shot', proj: 'arrow', speed: 28, range: 22 },
    { dur: 0.26, cd: 0.26, mult: 0.9, pose: 'shot', proj: 'arrow', speed: 28, range: 22 },
    { dur: 0.5, cd: 0.5, mult: 2.0, pose: 'power', proj: 'arrow', pierce: true, speed: 34, range: 26 }
  ],
  fists: [
    { dur: 0.22, cd: 0.2, mult: 0.5, arc: Math.PI * 0.5, range: 1.8, knock: 2, pose: 'jabR' },
    { dur: 0.22, cd: 0.2, mult: 0.5, arc: Math.PI * 0.5, range: 1.8, knock: 2, pose: 'jabL' }
  ]
};
export const comboFor = (weaponType) => COMBOS[weaponType] ?? COMBOS.fists;

/** The skill on a key (1–4) for a class. */
export const skillOnKey = (cls, key) => SKILLS[CLASSES[cls]?.skills[key - 1]] ? CLASSES[cls].skills[key - 1] : null;

/** Can a class use this skill right now (resource and cooldown)? */
export function canCast(skillId, resource, cooldownLeft = 0) {
  const s = SKILLS[skillId];
  if (!s) return { ok: false, reason: 'unknown' };
  if (cooldownLeft > 0) return { ok: false, reason: 'cooldown' };
  if (resource < s.cost) return { ok: false, reason: 'resource' };
  return { ok: true };
}

/* ------------------------------------------------------------- looks */

/**
 * The looks each class can start with: a face, a hair cut and colour, skin,
 * build, and the clothes they wear under any armour. Both women (f) and men (m).
 * `build`: 'slim' or 'broad'. `eyes`: 'wide', 'narrow' or 'dot'. `beard`: none, 'beard', 'stubble', 'moustache'.
 */
export const LOOKS = {
  blade: [
    { id: 'blade-a', name: 'Ember', sex: 'f', skin: 1, hair: 'ponytail', hairColor: '#7a3424', eyes: 'wide', build: 'slim', cloth: '#b8452e', tunic: '#d9b46a', trim: '#f0c040' },
    { id: 'blade-b', name: 'Corin', sex: 'm', skin: 2, hair: 'short', hairColor: '#3a2418', eyes: 'narrow', build: 'broad', beard: 'stubble', cloth: '#9a3428', tunic: '#c8a868', trim: '#e0b040' },
    { id: 'blade-c', name: 'Sable', sex: 'f', skin: 4, hair: 'bob', hairColor: '#1c1418', eyes: 'wide', build: 'slim', cloth: '#7a2a3a', tunic: '#d8c0a0', trim: '#f0a040' },
    { id: 'blade-d', name: 'Rook', sex: 'm', skin: 0, hair: 'spiky', hairColor: '#d8a040', eyes: 'dot', build: 'broad', cloth: '#a84a24', tunic: '#e0c890', trim: '#ffd060' }
  ],
  warden: [
    { id: 'warden-a', name: 'Moss', sex: 'm', skin: 2, hair: 'short', hairColor: '#e0c070', eyes: 'narrow', build: 'broad', beard: 'beard', cloth: '#3f7a4a', tunic: '#c9a26a', trim: '#c8e070' },
    { id: 'warden-b', name: 'Brea', sex: 'f', skin: 1, hair: 'bun', hairColor: '#8a4a28', eyes: 'wide', build: 'broad', cloth: '#4a6a3a', tunic: '#d0b080', trim: '#a8d060' },
    { id: 'warden-c', name: 'Oaken', sex: 'm', skin: 3, hair: 'bald', hairColor: '#2a1a14', eyes: 'dot', build: 'broad', beard: 'beard', cloth: '#2f5a44', tunic: '#b89060', trim: '#d8c060' },
    { id: 'warden-d', name: 'Hale', sex: 'f', skin: 4, hair: 'curly', hairColor: '#24160f', eyes: 'wide', build: 'slim', cloth: '#56783a', tunic: '#e0c8a0', trim: '#e8e080' }
  ],
  seer: [
    { id: 'seer-a', name: 'Frost', sex: 'f', skin: 0, hair: 'long', hairColor: '#aab4cc', eyes: 'wide', build: 'slim', cloth: '#3c6aa8', tunic: '#d8d0c0', trim: '#9ad8ff' },
    { id: 'seer-b', name: 'Aldren', sex: 'm', skin: 1, hair: 'long', hairColor: '#e8e4dc', eyes: 'narrow', build: 'slim', beard: 'beard', cloth: '#34508a', tunic: '#c8c0b0', trim: '#80c8ff' },
    { id: 'seer-c', name: 'Nyx', sex: 'f', skin: 3, hair: 'bun', hairColor: '#5a3a8a', eyes: 'narrow', build: 'slim', cloth: '#4a3a8a', tunic: '#d0c8e0', trim: '#c8a0ff' },
    { id: 'seer-d', name: 'Ilo', sex: 'm', skin: 2, hair: 'bun', hairColor: '#1c1418', eyes: 'dot', build: 'slim', beard: 'moustache', cloth: '#2c6a8a', tunic: '#d8e0e0', trim: '#80f0e0' }
  ],
  ranger: [
    { id: 'ranger-a', name: 'Thorn', sex: 'f', skin: 2, hair: 'ponytail', hairColor: '#4a2a18', eyes: 'narrow', build: 'slim', cloth: '#4a6a2a', tunic: '#b89060', trim: '#e0c050' },
    { id: 'ranger-b', name: 'Fenn', sex: 'm', skin: 1, hair: 'curly', hairColor: '#a85a2a', eyes: 'wide', build: 'slim', beard: 'stubble', cloth: '#5a5a2a', tunic: '#c8a878', trim: '#d0a040' },
    { id: 'ranger-c', name: 'Wren-of-Ash', sex: 'f', skin: 3, hair: 'short', hairColor: '#e0d0b0', eyes: 'wide', build: 'slim', cloth: '#3a5a4a', tunic: '#a89070', trim: '#90d0a0' },
    { id: 'ranger-d', name: 'Kestrel', sex: 'm', skin: 4, hair: 'spiky', hairColor: '#1c1418', eyes: 'narrow', build: 'broad', cloth: '#6a4a24', tunic: '#d0b080', trim: '#f0c040' }
  ]
};
export const lookById = (id) => Object.values(LOOKS).flat().find((l) => l.id === id) ?? null;
/** The first look of a class (and the one an old save's colours match). */
export const defaultLook = (cls) => (LOOKS[cls] ?? LOOKS.blade)[0];
