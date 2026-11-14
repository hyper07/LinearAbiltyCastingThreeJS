import { MOBS } from './data.js';

/**
 * How a blow looks: the move the body makes (`clip`) and the strokes drawn
 * through the air with it (view.js `slash`). For the eyes only — the server
 * decides what hits. Players' steel is ice-blue (a finisher flares white);
 * monsters' is crimson, and an elite's violet, so in a brawl you can tell
 * whose swing is whose.
 */
export const BLOW_COLORS = { player: '#6ecbff', finisher: '#eafcff', kick: '#9be0ff', monster: '#ff1f2e', elite: '#9a3cff' };

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** A player's basic attack: step 0, 1 or 2 of the chain, each with a few ways to swing. */
const PLAYER = [
  [
    { name: 'chop', clip: '1H_Melee_Attack_Chop', strokes: [{ roll: 1.3 }] },
    { name: 'thrust', clip: '1H_Melee_Attack_Stab', strokes: [{ shape: 'stab', size: 3.4, dur: 0.2 }] },
    { name: 'forehand', clip: '1H_Melee_Attack_Slice_Diagonal', strokes: [{ roll: 0.7 }] }
  ],
  [
    { name: 'backhand', clip: '1H_Melee_Attack_Slice_Diagonal', strokes: [{ roll: -0.75, flip: true }] },
    { name: 'uppercut', clip: '1H_Melee_Attack_Slice_Diagonal', strokes: [{ roll: -1.3, flip: true, y: 0.95, size: 2.9 }] },
    { name: 'double thrust', clip: '1H_Melee_Attack_Stab', strokes: [{ shape: 'stab', size: 3, dur: 0.16, side: -0.25 }, { shape: 'stab', size: 3.4, dur: 0.16, side: 0.25, delay: 0.1 }] }
  ],
  [
    { name: 'sweep', clip: '1H_Melee_Attack_Slice_Horizontal', strokes: [{ shape: 'wide', roll: 0.1, size: 3.5, dur: 0.32 }] },
    { name: 'cross', clip: '1H_Melee_Attack_Slice_Diagonal', strokes: [{ roll: 0.8, size: 3.2 }, { roll: -0.8, flip: true, size: 3.2, delay: 0.09 }] },
    { name: 'cleaver', clip: '2H_Melee_Attack_Chop', strokes: [{ roll: 1.35, size: 3.5, dur: 0.3 }, { shape: 'full', size: 2.6, y: 0.2, delay: 0.16, dur: 0.35 }] }
  ]
];

/** The same chain for a two-handed weapon (heavier, wider) and for a knife in each hand (quick, crossed). */
const STYLES = {
  twohand: [
    [{ name: 'great chop', clip: '2H_Melee_Attack_Chop', strokes: [{ roll: 1.35, size: 3.4, dur: 0.3 }] }, { name: 'great thrust', clip: '2H_Melee_Attack_Stab', strokes: [{ shape: 'stab', size: 3.8, dur: 0.22 }] }],
    [{ name: 'great slice', clip: '2H_Melee_Attack_Slice', strokes: [{ shape: 'wide', roll: -0.5, flip: true, size: 3.4, dur: 0.3 }] }, { name: 'great uppercut', clip: '2H_Melee_Attack_Slice', strokes: [{ roll: -1.3, flip: true, y: 0.95, size: 3.4 }] }],
    [{ name: 'great spin', clip: '2H_Melee_Attack_Spin', strokes: [{ shape: 'full', size: 3.6, dur: 0.4, y: 1 }] }, { name: 'earthshaker', clip: '2H_Melee_Attack_Chop', strokes: [{ roll: 1.35, size: 3.9, dur: 0.32 }, { shape: 'full', size: 3, y: 0.2, delay: 0.16, dur: 0.4 }] }]
  ],
  dual: [
    [{ name: 'left-right', clip: 'Dualwield_Melee_Attack_Slice', strokes: [{ roll: 0.6, size: 2.2, dur: 0.18 }, { roll: -0.6, flip: true, size: 2.2, dur: 0.18, delay: 0.08 }] }, { name: 'twin stab', clip: 'Dualwield_Melee_Attack_Stab', strokes: [{ shape: 'stab', size: 2.6, dur: 0.15, side: -0.3 }, { shape: 'stab', size: 2.6, dur: 0.15, side: 0.3, delay: 0.06 }] }],
    [{ name: 'scissor', clip: 'Dualwield_Melee_Attack_Chop', strokes: [{ roll: 1.1, size: 2.3, dur: 0.18 }, { roll: 1.1, flip: true, size: 2.3, dur: 0.18 }] }, { name: 'low cut', clip: 'Dualwield_Melee_Attack_Slice', strokes: [{ roll: -0.3, flip: true, y: 0.7, size: 2.3, dur: 0.18 }, { roll: 0.3, y: 1.3, size: 2.3, dur: 0.18, delay: 0.07 }] }],
    [{ name: 'flurry', clip: 'Dualwield_Melee_Attack_Slice', strokes: [{ roll: 0.9, size: 2.5, dur: 0.16 }, { roll: -0.9, flip: true, size: 2.5, dur: 0.16, delay: 0.06 }, { roll: 0.2, size: 2.7, dur: 0.16, delay: 0.12 }, { shape: 'stab', size: 3, dur: 0.16, delay: 0.18 }] }, { name: 'whirl of knives', clip: 'Dualwield_Melee_Attack_Slice', strokes: [{ shape: 'wide', roll: 0.1, size: 2.8, dur: 0.24 }, { shape: 'wide', roll: -0.1, flip: true, size: 2.8, dur: 0.24, delay: 0.1 }] }]
  ]
};

export function playerBlow(step, style = 'onehand') {
  const n = Math.max(0, Math.min(PLAYER.length - 1, step ?? 0));
  const b = pick((STYLES[style] ?? PLAYER)[n]);
  const color = n === PLAYER.length - 1 ? BLOW_COLORS.finisher : BLOW_COLORS.player;
  return { ...b, strokes: b.strokes.map((s) => ({ color, ...s })) };
}

/** The kick of someone who'd rather be shooting. */
export const kickBlow = () => ({ name: 'kick', clip: 'Unarmed_Melee_Attack_Kick', strokes: [{ roll: -0.5, flip: true, y: 0.7, size: 2, dur: 0.2, color: BLOW_COLORS.kick }] });

const claws = (roll, flip) => [0.75, 1.1, 1.45].map((y, i) => ({ roll, flip, y, thin: true, size: 2.1, delay: i * 0.03 }));
/** Monsters by how they are armed: bare hands claw, knives stab and cross, big weapons chop and sweep. */
const MONSTER = {
  claws: [
    { name: 'claw', clip: '1H_Melee_Attack_Chop', strokes: claws(0.55, false) },
    { name: 'rake', clip: '1H_Melee_Attack_Slice_Diagonal', strokes: claws(-0.55, true) }
  ],
  knives: [
    { name: 'stab', clip: '1H_Melee_Attack_Stab', strokes: [{ shape: 'stab', size: 2.8, dur: 0.18 }] },
    { name: 'cross', clip: 'Dualwield_Melee_Attack_Slice', strokes: [{ roll: 0.8, size: 2.3 }, { roll: -0.8, flip: true, size: 2.3, delay: 0.07 }] }
  ],
  heavy: [
    { name: 'overhead', clip: '1H_Melee_Attack_Chop', strokes: [{ roll: 1.35, size: 2.9, dur: 0.3 }] },
    { name: 'sweep', clip: '1H_Melee_Attack_Slice_Horizontal', strokes: [{ shape: 'wide', roll: 0.15, size: 3, dur: 0.32 }] },
    { name: 'backhand', clip: '1H_Melee_Attack_Slice_Diagonal', strokes: [{ roll: -0.8, flip: true, size: 2.7 }] }
  ]
};

export function mobBlow(type) {
  const def = MOBS[type] ?? {};
  const armed = (def.show ?? []).some((s) => /Knife/.test(s)) ? 'knives' : def.body === 'Skeleton_Minion' ? 'claws' : 'heavy';
  const b = pick(MONSTER[armed]);
  const scale = def.scale ?? 1;
  const color = def.elite ? BLOW_COLORS.elite : BLOW_COLORS.monster;
  const strokes = b.strokes.map((s) => ({ color, ...s, size: (s.size ?? 2.6) * scale, y: (s.y ?? 1.15) * scale }));
  // An elite's blow shakes the ground.
  if (def.elite && armed === 'heavy') strokes.push({ shape: 'full', color, size: 2.6 * scale, y: 0.2, delay: 0.18, dur: 0.4 });
  return { ...b, armed, strokes };
}
