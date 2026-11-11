/**
 * The storm's schedule: where the safe circle is at any moment of a battle
 * royale. Pure maths from a seed and the phases in settings.royale, so every
 * player in a party computes the same circle from the same clock (the host's,
 * which it sends every couple of seconds).
 *
 *   const plan = stormPlan(seed, settings.royale)
 *   circleAt(plan, t) → { x, z, radius, next: { x, z, radius }, phase, closing, untilChange, damage }
 */

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {number} seed
 * @param {{ startRadius: number, phases: { wait, shrink, radius, damage }[] }} config
 * @param {number} [pace] × every duration (a level's `storm`: 0.5 = twice as fast)
 */
export function stormPlan(seed, config, pace = 1) {
  const random = rng(seed);
  const circles = [{ x: 0, z: 0, radius: config.startRadius }];
  const phases = [];
  let t = 0;
  for (const phase of config.phases) {
    const prev = circles.at(-1);
    // The next circle sits wholly inside the last one, somewhere off-centre.
    const room = Math.max(0, prev.radius - phase.radius) * 0.85;
    const angle = random() * Math.PI * 2;
    const off = Math.sqrt(random()) * room;
    const next = { x: prev.x + Math.cos(angle) * off, z: prev.z + Math.sin(angle) * off, radius: phase.radius };
    const wait = phase.wait * pace;
    const shrink = phase.shrink * pace;
    phases.push({ from: prev, to: next, waitEnd: t + wait, shrinkEnd: t + wait + shrink, damage: phase.damage });
    circles.push(next);
    t += wait + shrink;
  }
  return { phases, end: t, last: circles.at(-1) };
}

const lerp = (a, b, k) => a + (b - a) * k;

/** The safe circle at `t` seconds into the match. */
export function circleAt(plan, t) {
  for (let i = 0; i < plan.phases.length; i++) {
    const p = plan.phases[i];
    if (t < p.waitEnd) {
      return { ...p.from, next: p.to, phase: i, closing: false, untilChange: p.waitEnd - t, damage: i === 0 ? 0 : plan.phases[i - 1].damage };
    }
    if (t < p.shrinkEnd) {
      const k = (t - p.waitEnd) / (p.shrinkEnd - p.waitEnd);
      return {
        x: lerp(p.from.x, p.to.x, k),
        z: lerp(p.from.z, p.to.z, k),
        radius: lerp(p.from.radius, p.to.radius, k),
        next: p.to,
        phase: i,
        closing: true,
        untilChange: p.shrinkEnd - t,
        damage: p.damage
      };
    }
  }
  const last = plan.phases.at(-1);
  return { ...plan.last, next: plan.last, phase: plan.phases.length, closing: false, untilChange: 0, damage: (last?.damage ?? 10) * 1.5 };
}

/** Is a point outside the circle (with a little grace at the edge)? */
export function outside(circle, x, z, grace = 0.3) {
  return Math.hypot(x - circle.x, z - circle.z) > circle.radius + grace;
}
