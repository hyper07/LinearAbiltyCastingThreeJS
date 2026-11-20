/**
 * How the game's existing calls map onto the sculpted figures — pure, so the
 * tests can check it (no three.js, no DOM).
 *
 *   JOINT_BONES        the rig's joints (rig.js) → the sculpted skeleton's bones
 *   RIG_POSES          every swing and skill pose the rig plays (combos in
 *                      classes.js WEAPONS, skills' `pose` in ABILITIES)
 *   heroExpression()   what a person's face shows for what their body is doing
 *   beastExpression()  the same for a monster
 *   gearSockets(J)     where each piece of gear hangs on a figure's joints
 */

/** The rig's joints and the bones of a sculpted person (the same names: the rig poses them directly). */
export const JOINT_BONES = { hips: 'torso', torso: 'torso', head: 'head', armNeg: 'armNeg', armPos: 'armPos', legNeg: 'legNeg', legPos: 'legPos' };

/** Swing poses (the basic attack, by weapon) and skill poses rig.js knows. */
export const SWING_POSES = ['sweepR', 'sweepL', 'heavyR', 'heavyL', 'smash', 'jabR', 'jabL', 'stab', 'thrust', 'bolt', 'bolt3', 'shot', 'power'];
export const SKILL_POSES = ['lunge', 'overhead', 'bash', 'plant', 'slam', 'nova', 'raise', 'draw', 'skyshot', 'cast'];
/** Poses that are body states rather than named poses (act.spin, act.guard, act.roll). */
export const STATE_POSES = ['spin', 'guard', 'roll'];
export const RIG_POSES = new Set([...SWING_POSES, ...SKILL_POSES, ...STATE_POSES]);

/** Skill poses that are spells: the face concentrates rather than snarls. */
const SPELL_POSES = new Set(['nova', 'raise', 'cast', 'plant', 'bolt', 'bolt3', 'draw', 'skyshot', 'shot', 'power']);

/**
 * A person's expression from their `act` (rig.js): beaten → ko, a hard hit →
 * hurt, striking → fierce (a monster roars), casting or aiming → focus,
 * guarding → fierce, talking → talk; at rest, neutral (a monster: mean).
 */
export function heroExpression(a = {}, { hostile = false } = {}) {
  if (!a) return hostile ? 'mean' : 'neutral';
  if (a.dead) return 'ko';
  if ((a.hurt ?? 0) > 0.35) return 'hurt';
  if (a.roll != null) return 'surprised';
  if (a.cast != null) return 'focus';
  const pose = a.swing?.pose ?? a.pose?.id ?? null;
  if (pose) return SPELL_POSES.has(pose) ? 'focus' : hostile ? 'roar' : 'fierce';
  if (a.spin != null) return hostile ? 'roar' : 'fierce';
  if (a.guard) return hostile ? 'angry' : 'fierce';
  if (a.talk) return 'talk';
  return hostile ? 'mean' : 'neutral';
}

/** A monster's expression from its `act` (beasts.js): stunned, hurt, striking, winding up, or just mean. */
export function beastExpression(a = {}) {
  if (!a) return 'mean';
  if (a.stun) return 'dizzy';
  if ((a.hurt ?? 0) > 0.35) return 'hurt';
  if (a.strike) return 'roar';
  if ((a.wind ?? 0) > 0.05) return 'angry';
  return 'mean';
}

/**
 * Where gear hangs, from a figure's joint measures J (rig.js): `armLength`,
 * `shoulderY` (above the hip), `legLen`, and for sculpted figures `fist`
 * (each fist's offset from its shoulder, [x, y, z] for the +X arm) and
 * `backZ`. Without those (the voxel figure) the old places come back exactly.
 * Each entry: { joint, pos: [x, y, z], rot?: [x, y, z] }.
 */
export function gearSockets(J) {
  const hand = J.armLength - 0.06;
  const fp = J.fist ?? [0, -hand, 0.03];
  const fistPos = [fp[0], fp[1], fp[2]];
  const fistNeg = [-fp[0], fp[1], fp[2]];
  const back = J.backZ ?? -0.34;
  return {
    handNeg: { joint: 'armNeg', pos: fistNeg },
    handPos: { joint: 'armPos', pos: fistPos },
    footNeg: { joint: 'legNeg', pos: [0, -J.legLen, -0.02] },
    footPos: { joint: 'legPos', pos: [0, -J.legLen, -0.02] },
    weapon: { joint: 'armNeg', pos: [fistNeg[0], fistNeg[1], fistNeg[2] + 0.01], rot: [-0.35, 0, 0] },
    bow: { joint: 'armPos', pos: [fistPos[0] + 0.02, fistPos[1], fistPos[2] + 0.03] },
    tome: { joint: 'armPos', pos: [fistPos[0] + 0.1, fistPos[1] + 0.05, fistPos[2] + 0.05] },
    shield: { joint: 'armPos', pos: [fistPos[0] + 0.15, fistPos[1] * 0.62, 0.02] },
    quiver: { joint: 'torso', pos: [0.18, J.shoulderY - 0.1, back], rot: [0, 0, -0.35] },
    head: { joint: 'head', pos: [0, J.headLift ?? 0, 0], scale: J.headScale ?? 1 },
    pauldronNeg: { joint: 'armNeg', pos: [-0.04, 0, 0] },
    pauldronPos: { joint: 'armPos', pos: [0.04, 0, 0] },
    cape: { joint: 'torso', pos: [0, J.shoulderY + 0.02, back] }
  };
}

/** How long each weapon is from the fist to its tip (the sword trail runs along it). */
export const WEAPON_LENGTH = { longsword: 1.3, dagger: 0.48, axe: 0.82, mace: 0.72, hammer: 0.9, spear: 1.55, staff: 1.45 };
export const weaponLength = (shape) => WEAPON_LENGTH[shape] ?? 0.86;
