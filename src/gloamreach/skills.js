/**
 * The heroes' skills, as data: what each one costs and how long it waits,
 * how it plays (kind), its numbers, the animation it borrows, and its words
 * for the skill bar. Pure (no three.js), so tests read it.
 *
 * Every hero has six on the bar: the left and right mouse buttons and 1–4.
 *
 *   SKILL_BAR.mage → ['firebolt', 'chain', 'nova', 'blink', 'meteor', 'ward']
 *   SKILLS.meteor.cd → 14
 */

/** The bar's keys, in order. */
export const BAR_KEYS = ['LMB', 'RMB', '1', '2', '3', '4'];

/**
 * Skills. `cost` in the class's resource; `cd` seconds; `mult` × attack (spells
 * × attack and spell power); `aim`: 'pointer' (at the mouse, snapped to a
 * monster), 'ground' (a spot, clamped to `range`), 'self'. `anim` names a
 * borrowed clip (actors.js BORROWED).
 */
export const SKILLS = {
  /* -------------------------------------------------------------- Knight */
  combo: {
    id: 'combo', cls: 'knight', name: 'Blade Combo', cost: 0, cd: 0, kind: 'combo', aim: 'pointer', icon: 'combo',
    desc: 'Three swings that chain if you keep pressing: a rising cut, a backhand, and a heavy overhead that knocks foes back.',
    stages: [
      { anim: 'Slash1', dur: 0.62, hit: 0.36, mult: 1.0, arc: 2.3, range: 2.7, knock: 2.5, step: 0.8 },
      { anim: 'Slash2', dur: 0.6, hit: 0.32, mult: 1.15, arc: 2.5, range: 2.7, knock: 2.5, step: 0.8 },
      { anim: 'Slash3', dur: 0.95, hit: 0.5, mult: 2.0, arc: 1.6, range: 3.1, knock: 6, step: 1.8, heavy: true }
    ],
    window: 0.55
  },
  block: {
    id: 'block', cls: 'knight', name: 'Shield Wall', cost: 0, cd: 0, kind: 'block', aim: 'pointer', icon: 'block', anim: 'Block',
    desc: 'Hold to raise your guard: blows from the front lose 80 %. You walk while blocking.'
  },
  bash: {
    id: 'bash', cls: 'knight', name: 'Shield Bash', cost: 22, cd: 6, kind: 'cone', aim: 'pointer', icon: 'bash', anim: 'Bash',
    mult: 0.9, arc: 1.8, range: 2.8, knock: 5, stun: 1.8, hit: 0.3, dur: 0.75,
    desc: 'Slam your shield into the foes in front: they are stunned for 1.8 s.'
  },
  charge: {
    id: 'charge', cls: 'knight', name: 'Charge', cost: 20, cd: 8, kind: 'dash', aim: 'pointer', icon: 'charge', anim: 'Charge',
    mult: 1.3, range: 10, speed: 20, width: 1.5, knock: 7, stun: 0.9,
    desc: 'Rush up to 10 m at the pointer, bowling over and dazing everything in your way.'
  },
  whirl: {
    id: 'whirl', cls: 'knight', name: 'Whirlwind', cost: 34, cd: 10, kind: 'spin', aim: 'self', icon: 'whirl', anim: 'Whirl',
    mult: 0.6, radius: 3.4, time: 1.8, tick: 0.3, knock: 1.5,
    desc: 'Spin with your blade out for 1.8 s, cutting everything around you. You can walk while you spin.'
  },
  slam: {
    id: 'slam', cls: 'knight', name: 'Sundering Leap', cost: 40, cd: 14, kind: 'leap', aim: 'ground', icon: 'slam', anim: 'Slam', level: 1,
    mult: 2.6, range: 9, radius: 3.8, knock: 8, stun: 1.1,
    desc: 'Leap to the pointer and bring your blade down: a shockwave that hurls foes back.'
  },
  /* -------------------------------------------------------------- Ranger */
  quick: {
    id: 'quick', cls: 'ranger', name: 'Quick Shot', cost: 0, cd: 0.42, kind: 'arrow', aim: 'pointer', icon: 'quick', anim: 'Shoot',
    mult: 0.95, speed: 46, range: 34, dur: 0.4,
    desc: 'Loose an arrow at the pointer. Hold the button to keep shooting — you can shoot while backing away.'
  },
  charged: {
    id: 'charged', cls: 'ranger', name: 'Charged Shot', cost: 12, cd: 1.2, kind: 'charge-arrow', aim: 'pointer', icon: 'charged', anim: 'Draw',
    mult: 0.9, maxMult: 3.4, chargeTime: 1.1, speed: 62, range: 42, pierce: true,
    desc: 'Hold to draw the bow (up to 1.1 s), release to fire a piercing arrow — up to 3.4 × damage.'
  },
  multishot: {
    id: 'multishot', cls: 'ranger', name: 'Multishot', cost: 24, cd: 4, kind: 'fan', aim: 'pointer', icon: 'multishot', anim: 'Shoot',
    mult: 0.75, count: 7, spread: 0.85, speed: 44, range: 26, dur: 0.5,
    desc: 'Seven arrows in a fan toward the pointer.'
  },
  roll: {
    id: 'roll', cls: 'ranger', name: 'Dodge Roll', cost: 14, cd: 2.5, kind: 'roll', aim: 'self', icon: 'roll', anim: 'Roll',
    range: 6.5, time: 0.55, iframes: 0.42,
    desc: 'Roll the way you are moving (or back from the pointer). Nothing touches you mid-roll.'
  },
  rain: {
    id: 'rain', cls: 'ranger', name: 'Arrow Rain', cost: 40, cd: 12, kind: 'rain', aim: 'ground', icon: 'rain', anim: 'SkyShot',
    mult: 0.42, range: 24, radius: 4.4, time: 2.6, tick: 0.22, slow: 0.4,
    desc: 'Arrows fall on the spot under the pointer for 2.6 s, slowing what they do not kill.'
  },
  explosive: {
    id: 'explosive', cls: 'ranger', name: 'Blast Arrow', cost: 28, cd: 8, kind: 'arrow', aim: 'pointer', icon: 'explosive', anim: 'Shoot', level: 1,
    mult: 1.6, speed: 40, range: 30, burst: 3.2, burstMult: 1.4, fire: true, dur: 0.5,
    desc: 'An arrow tipped with alchemist\'s fire: it bursts where it lands, burning everything near.'
  },
  /* -------------------------------------------------------------- Mage */
  firebolt: {
    id: 'firebolt', cls: 'mage', name: 'Firebolt', cost: 5, cd: 0.48, kind: 'bolt', aim: 'pointer', icon: 'firebolt', anim: 'Cast', spell: true,
    mult: 1.15, speed: 26, range: 30, splash: 1.4, burn: 2, dur: 0.42,
    desc: 'A bolt of fire at the pointer that bursts on the first thing it meets.'
  },
  chain: {
    id: 'chain', cls: 'mage', name: 'Chain Lightning', cost: 22, cd: 3.2, kind: 'chain', aim: 'pointer', icon: 'chain', anim: 'Cast', spell: true,
    mult: 1.5, range: 18, jumps: 5, jumpRange: 8, decay: 0.82, dur: 0.5,
    desc: 'Lightning leaps from your hand to the foe at the pointer, then on to five more.'
  },
  nova: {
    id: 'nova', cls: 'mage', name: 'Frost Nova', cost: 26, cd: 8, kind: 'nova', aim: 'self', icon: 'nova', anim: 'Nova', spell: true,
    mult: 0.9, radius: 6.2, freeze: 2.4, dur: 0.6,
    desc: 'A ring of frost bursts out of you: everything near is frozen in place for 2.4 s.'
  },
  blink: {
    id: 'blink', cls: 'mage', name: 'Blink', cost: 15, cd: 5, kind: 'blink', aim: 'ground', icon: 'blink', anim: 'Cast', spell: true,
    range: 10,
    desc: 'Step through the air to the pointer, up to 10 m.'
  },
  meteor: {
    id: 'meteor', cls: 'mage', name: 'Meteor', cost: 45, cd: 14, kind: 'meteor', aim: 'ground', icon: 'meteor', anim: 'CastBig', spell: true,
    mult: 3.6, range: 24, radius: 4.6, delay: 1.15, burnTime: 3, burnMult: 0.25, dur: 0.9,
    desc: 'Call down a burning star on the spot under the pointer. The ground burns after.'
  },
  ward: {
    id: 'ward', cls: 'mage', name: 'Arcane Ward', cost: 30, cd: 18, kind: 'ward', aim: 'self', icon: 'ward', anim: 'Nova', spell: true,
    absorb: 0.45, time: 8,
    desc: 'A shell of violet light that soaks up damage worth 45 % of your health for 8 s.'
  }
};

/** Each class's bar: LMB, RMB, 1, 2, 3, 4. */
export const SKILL_BAR = {
  knight: ['combo', 'block', 'bash', 'charge', 'whirl', 'slam'],
  ranger: ['quick', 'charged', 'multishot', 'roll', 'rain', 'explosive'],
  mage: ['firebolt', 'chain', 'nova', 'blink', 'meteor', 'ward']
};

/** The skill on a bar key ('LMB', 'RMB', '1'…'4') for a class. */
export function skillOn(cls, key) {
  const i = BAR_KEYS.indexOf(String(key));
  const id = SKILL_BAR[cls]?.[i];
  return id ? SKILLS[id] : null;
}

/** The next stage of a combo: within `window` seconds of the last swing, else back to the first. */
export function nextComboStage(skill, lastStage, sinceLast) {
  const n = skill.stages.length;
  if (lastStage == null || lastStage < 0 || sinceLast > skill.window) return 0;
  return (lastStage + 1) % n;
}

/** A charged shot's damage multiplier after holding `held` seconds. */
export function chargeMult(skill, held) {
  const k = Math.max(0, Math.min(1, held / skill.chargeTime));
  return skill.mult + (skill.maxMult - skill.mult) * k * k;
}
