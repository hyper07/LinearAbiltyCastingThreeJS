/**
 * Lanternwood — aiming at the mouse pointer, as pure maths (no three.js, no
 * DOM), so the tests can check it.
 *
 * The pointer is cast onto the ground to an aim point. Ranged attacks fly
 * toward it, ground spells land on it (clamped to their reach), and a
 * pointer within AIM_SNAP of a monster snaps to the monster. While walking,
 * the hero's legs keep going where the keys say and the upper body twists
 * toward the aim, up to MAX_TWIST either way; past that the whole figure
 * turns for the cast (and walks backward, a backpedal, while it lasts).
 *
 *   const p = rayToGround(origin, dir);              // { x, z } or null
 *   const t = snapToFoe(p, foes);                    // the foe under the pointer, or null
 *   const q = clampToRange(hero, p, range);          // { x, z, d }
 *   const { face, twist, full } = twistSplit(legs, aimAngle);
 *   const { back, moveYaw } = legMotion(face, moveAngle);
 */

const TAU = Math.PI * 2;
export const wrapAngle = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

/** How close (metres) the pointer must be to a monster to lock onto it. */
export const AIM_SNAP = 1.5;
/** How far the upper body twists from the legs (radians, either way): about 100°. */
export const MAX_TWIST = (100 * Math.PI) / 180;
/** Seconds after the mouse last moved that a melee strike still turns to it. */
export const MELEE_MOUSE_WINDOW = 2.5;
/** …and a ranged attack (a mouse left resting for longer than this is taken as keyboard play). */
export const RANGED_MOUSE_WINDOW = 20;

/** A ray from `o` along `d` (arrays or {x,y,z}) meets the plane y = h: the point, or null if it never does (or behind). */
export function rayToGround(o, d, h = 0) {
  const [ox, oy, oz] = Array.isArray(o) ? o : [o.x, o.y, o.z];
  const [dx, dy, dz] = Array.isArray(d) ? d : [d.x, d.y, d.z];
  if (Math.abs(dy) < 1e-6) return null;
  const t = (h - oy) / dy;
  if (t <= 0) return null;
  return { x: ox + dx * t, z: oz + dz * t };
}

/** The heading (radians, 0 toward +Z, as the game's) from a point to another. */
export const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

/** A target point brought within `range` of `from` (same direction): { x, z, d }. */
export function clampToRange(from, to, range) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d <= range) return { x: to.x, z: to.z, d };
  const k = range / d;
  return { x: from.x + dx * k, z: from.z + dz * k, d: range };
}

/** The living monster nearest the point within `radius` (its own size counts a little), or null. */
export function snapToFoe(point, foes, radius = AIM_SNAP) {
  let best = null, bd = Infinity;
  for (const f of foes) {
    if (f.alive === false) continue;
    const d = Math.hypot(f.x - point.x, f.z - point.z) - (f.r ?? f.def?.radius ?? 0) * 0.5;
    if (d <= radius && d < bd) [best, bd] = [f, d];
  }
  return best;
}

/**
 * Split an aim between the legs and the upper body. `legs`: where the body
 * faces now (the way it walks); `aim`: where to shoot. Within MAX_TWIST the
 * legs stay and the body twists; past it the whole figure turns to the aim.
 */
export function twistSplit(legs, aim, max = MAX_TWIST) {
  const diff = wrapAngle(aim - legs);
  if (Math.abs(diff) <= max) return { face: legs, twist: diff, full: false };
  return { face: wrapAngle(aim), twist: 0, full: true };
}

/** How the legs move for a body facing `face` while travelling toward `move`: forward or backpedalling, and the legs' turn. */
export function legMotion(face, move) {
  const rel = wrapAngle(move - face);
  const back = Math.abs(rel) > Math.PI * 0.6;
  return { back, moveYaw: back ? wrapAngle(rel - Math.PI) : rel };
}

/**
 * Whether an attack aims at the pointer: ranged ones whenever the pointer is
 * on the game and has moved lately (in the last RANGED_MOUSE_WINDOW s), melee
 * ones only if it moved in the last few seconds; otherwise the old aim
 * (the nearest foe ahead).
 */
export function usesPointer({ ranged, onCanvas, lastMove, now }) {
  if (!onCanvas || lastMove == null) return false;
  return now - lastMove <= (ranged ? RANGED_MOUSE_WINDOW : MELEE_MOUSE_WINDOW);
}
