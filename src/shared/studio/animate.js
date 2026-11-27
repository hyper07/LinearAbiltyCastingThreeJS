/**
 * The four animation styles, as functions of time — one for 3D rigs (characters.js
 * buildCharacter) and one for sprites (pixelFrames). Pure maths on the parts; no clips to load.
 *
 *   pixel     a few poses flipped at 8 fps (stepped time, no in-betweens)
 *   skeletal  smooth swings every frame (what a rigged, blended clip looks like)
 *   toon      stepped at 12 fps, squash and stretch on every step
 *   plush     hops, squishes on landing, ears and tails on springs (render-quality.md §6)
 */
const TAU = Math.PI * 2;
const stepped = (t, fps) => Math.floor(t * fps) / fps;

/** The time each style samples motion at. */
export function styleTime(style, t) {
  if (style === 'pixel') return stepped(t, 8);
  if (style === 'toon') return stepped(t, 12);
  return t;
}

/**
 * Pose a rig for this frame.
 * @param {object} rig        from buildCharacter
 * @param {string} style      pixel | skeletal | toon | plush
 * @param {{ t: number, moving: number, attack?: number, hurt?: number, air?: boolean, seed?: number }} s
 *   moving 0…1 (how fast, of top speed); attack/hurt 1 → 0 as they fade
 */
export function poseRig(rig, style, { t, moving = 0, attack = 0, hurt = 0, air = false, seed = 0 }) {
  const time = styleTime(style, t + seed);
  const walk = moving > 0.05;
  const rate = walk ? 7 + moving * 5 : 1.6;
  const p = time * rate;
  let swing = walk ? Math.sin(p) * 0.7 * Math.min(1, moving + 0.3) : Math.sin(p) * 0.04;
  if (style === 'pixel') swing = walk ? Math.sign(Math.sin(p)) * 0.55 : 0;
  const root = rig.root;
  root.position.y = 0;
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  if (rig.legL) {
    rig.legL.rotation.x = swing;
    rig.legR.rotation.x = -swing;
    rig.armL.rotation.x = -swing * 0.8;
    rig.armR.rotation.x = swing * 0.8;
    rig.armL.rotation.z = 0.12;
    rig.armR.rotation.z = -0.12;
  }
  if (rig.head && rig.head !== rig.body) rig.head.rotation.set(walk ? 0 : Math.sin(time * 0.9) * 0.06, walk ? 0 : Math.sin(time * 0.5) * 0.15, 0);
  const bounce = Math.abs(Math.sin(p));
  switch (style) {
    case 'skeletal':
      root.position.y = walk ? bounce * 0.05 : Math.sin(time * 2) * 0.01;
      root.rotation.z = walk ? Math.sin(p) * 0.03 : 0;
      break;
    case 'toon': {
      const k = walk ? Math.cos(p * 2) * 0.09 : Math.sin(time * 3) * 0.03;
      root.scale.set(1 - k * 0.6, 1 + k, 1 - k * 0.6);
      root.position.y = walk ? bounce * 0.08 : 0;
      break;
    }
    case 'plush': {
      const hop = walk ? Math.abs(Math.sin(p * 0.5)) : 0;
      root.position.y = hop * 0.28 + (walk ? 0 : Math.max(0, Math.sin(time * 0.7)) ** 12 * 0.15);
      // Squish at the bottom of each hop; breathe when still.
      const squish = walk ? Math.max(0, 0.25 - hop) * 0.6 : Math.sin(time * 2.2) * 0.015;
      root.scale.set(1 + squish * 0.6, 1 - squish, 1 + squish * 0.6);
      root.rotation.z = walk ? Math.sin(p * 0.5) * 0.08 : 0;
      for (const [i, ear] of rig.ears.entries()) ear.rotation.x = Math.sin(t * (walk ? 11 : 3) - i * 0.6) * (walk ? 0.35 : 0.08) - hop * 0.3;
      if (rig.tail) rig.tail.rotation.y = Math.sin(t * 9) * 0.5;
      break;
    }
    case 'pixel':
      root.position.y = walk && Math.floor(time * 8) % 2 ? 0.04 : 0;
      break;
    default:
      break;
  }
  if (style !== 'plush') {
    for (const [i, ear] of rig.ears.entries()) ear.rotation.x = Math.sin(time * 4 + i) * 0.05;
    if (rig.tail) rig.tail.rotation.y = Math.sin(time * (walk ? 8 : 2)) * 0.3;
  }
  if (air) {
    root.scale.set(0.92, 1.12, 0.92);
    if (rig.legL) {
      rig.legL.rotation.x = 0.5;
      rig.legR.rotation.x = -0.3;
    }
  }
  if (attack > 0 && rig.armR) {
    const a = style === 'pixel' || style === 'toon' ? (attack > 0.5 ? 1 : 0.4) : attack;
    rig.armR.rotation.x = -2.2 * a;
    root.rotation.y = 0.4 * a * (style === 'toon' ? 1.4 : 1);
  }
  if (hurt > 0) root.rotation.x = -0.25 * hurt;
}

/**
 * A sprite's frame for this moment: which canvas, and how to scale/lift it.
 * @param {{ idle: HTMLCanvasElement[], walk: HTMLCanvasElement[] }} frames
 * @returns {{ frame: HTMLCanvasElement, sx: number, sy: number, lift: number, tilt: number }}
 */
export function spriteFrame(frames, style, { t, moving = 0, attack = 0, seed = 0 }) {
  const walk = moving > 0.05;
  const time = t + seed;
  const pick = (list, fps) => list[Math.floor(time * fps) % list.length];
  switch (style) {
    case 'pixel':
      return { frame: walk ? pick(frames.walk, 8) : pick(frames.idle, 2), sx: 1, sy: 1, lift: 0, tilt: 0 };
    case 'skeletal':
      return { frame: walk ? pick(frames.walk, 10) : frames.idle[0], sx: 1, sy: 1 + Math.sin(time * 2.4) * 0.015, lift: walk ? Math.abs(Math.sin(time * 10)) * 0.05 : 0, tilt: walk ? Math.sin(time * 10) * 0.05 : Math.sin(time * 1.3) * 0.02 };
    case 'toon': {
      const s = stepped(time, 12);
      const k = walk ? Math.cos(s * 20) * 0.1 : Math.sin(s * 3) * 0.04;
      return { frame: walk ? pick(frames.walk, 12) : pick(frames.idle, 3), sx: 1 - k * 0.6 + (attack > 0.5 ? 0.15 : 0), sy: 1 + k, lift: walk ? Math.abs(Math.sin(s * 10)) * 0.08 : 0, tilt: attack > 0 ? -0.2 : 0 };
    }
    case 'plush': {
      const hop = walk ? Math.abs(Math.sin(time * 5)) : Math.max(0, Math.sin(time * 0.7)) ** 12 * 0.5;
      const squish = Math.max(0, 0.25 - hop) * (walk ? 0.6 : 0.1);
      return { frame: frames.idle[0], sx: 1 + squish * 0.7, sy: 1 - squish + hop * 0.06, lift: hop * 0.3, tilt: walk ? Math.sin(time * 5) * 0.1 : 0 };
    }
    default:
      return { frame: frames.idle[0], sx: 1, sy: 1, lift: 0, tilt: 0 };
  }
}

export { TAU };
