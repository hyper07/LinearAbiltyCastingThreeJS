/**
 * Cut-out puppets: rigs of painted limbs (art/heroes.js, art/foes.js) and
 * the poses that animate them — idle, run, three-blow combos with smears,
 * charge and release, dash, throw, cast, hurt and death for the heroes; each
 * foe's wind-ups (the telegraphs you read), blows, staggers and falls.
 *
 * A rig is a list of parts: { id, sprite (or { f, b } per view), parent,
 * at: [x, y] on the parent (tiles, y up), layer (or { f, b }) }. A pose is
 * { root: { x, y, r, sx, sy }, [part]: { r, x, y, sx, sy } }; poses are made
 * by functions of the actor's state and time. Facing left mirrors the rig;
 * facing away swaps to the back-view pieces and order.
 */

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (t) => t * t * (3 - 2 * t);
const outQuad = (t) => 1 - (1 - t) * (1 - t);
const inQuad = (t) => t * t;

/** Piecewise keyframes: keys [[t, v], …] (sorted); eased between. */
export function kf(t, keys, curve = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      return v0 + (v1 - v0) * curve((t - t0) / Math.max(1e-6, t1 - t0));
    }
  }
  return keys[keys.length - 1][1];
}

/* ------------------------------------------------------------ rigs */

export const RIGS = {
  warden: {
    scale: 0.86,
    parts: [
      { id: 'cape', sprite: 'warden/cape', parent: 'torso', at: [0, 0.5], layer: { f: 0, b: 7 } },
      { id: 'armB', sprite: 'warden/arm-far', parent: 'torso', at: [-0.17, 0.45], layer: { f: 1, b: 2 } },
      { id: 'shield', sprite: 'warden/shield', parent: 'armB', at: [0, -0.3], layer: { f: 2, b: 3 } },
      { id: 'legB', sprite: 'warden/leg', parent: 'root', at: [-0.08, 0.46], layer: { f: 3, b: 4 }, tint: 0.8 },
      { id: 'legF', sprite: 'warden/leg', parent: 'root', at: [0.08, 0.46], layer: { f: 4, b: 5 } },
      { id: 'torso', sprite: { f: 'warden/torso-f', b: 'warden/torso-b' }, parent: 'root', at: [0, 0.42], layer: { f: 5, b: 6 } },
      { id: 'head', sprite: { f: 'warden/head-f', b: 'warden/head-b' }, parent: 'torso', at: [0, 0.5], layer: { f: 6, b: 8 } },
      { id: 'armF', sprite: 'warden/arm', parent: 'torso', at: [0.17, 0.45], layer: { f: 8, b: 9 } },
      { id: 'weapon', sprite: 'warden/sword', parent: 'armF', at: [0, -0.39], layer: { f: 9, b: 10 } }
    ]
  },
  runner: {
    scale: 0.92,
    parts: [
      { id: 'cape', sprite: 'runner/cape', parent: 'head', at: [-0.08, 0.06], layer: { f: 0, b: 9 } },
      { id: 'armB', sprite: 'runner/arm-far', parent: 'torso', at: [-0.15, 0.4], layer: { f: 1, b: 2 } },
      { id: 'legB', sprite: 'runner/leg', parent: 'root', at: [-0.07, 0.48], layer: { f: 2, b: 3 }, tint: 0.8 },
      { id: 'legF', sprite: 'runner/leg', parent: 'root', at: [0.07, 0.48], layer: { f: 3, b: 4 } },
      { id: 'torso', sprite: { f: 'runner/torso-f', b: 'runner/torso-b' }, parent: 'root', at: [0, 0.44], layer: { f: 4, b: 5 } },
      { id: 'lantern', sprite: 'runner/lantern', parent: 'torso', at: [-0.14, 0.08], layer: { f: 5, b: 1 } },
      { id: 'head', sprite: { f: 'runner/head-f', b: 'runner/head-b' }, parent: 'torso', at: [0, 0.46], layer: { f: 6, b: 7 } },
      { id: 'weapon', sprite: 'runner/spear', parent: 'armF', at: [0, -0.36], layer: { f: 7, b: 6 } },
      { id: 'armF', sprite: 'runner/arm', parent: 'torso', at: [0.15, 0.4], layer: { f: 8, b: 8 } }
    ]
  },
  imp: {
    scale: 0.95,
    parts: [
      { id: 'tail', sprite: 'imp/tail', parent: 'body', at: [-0.12, 0.08], layer: 0, r0: Math.PI },
      { id: 'wingB', sprite: 'imp/wing', parent: 'body', at: [-0.06, 0.28], layer: 1, r0: 0.4, flipX: true, tint: 0.75 },
      { id: 'legB', sprite: 'imp/limb', parent: 'body', at: [-0.07, 0.04], layer: 2, tint: 0.8 },
      { id: 'legF', sprite: 'imp/limb', parent: 'body', at: [0.07, 0.04], layer: 3 },
      { id: 'armB', sprite: 'imp/limb', parent: 'body', at: [-0.13, 0.24], layer: 4, tint: 0.8 },
      { id: 'body', sprite: 'imp/body', parent: 'root', at: [0, 0.16], layer: 5 },
      { id: 'head', sprite: 'imp/head', parent: 'body', at: [0, 0.3], layer: 6 },
      { id: 'armF', sprite: 'imp/limb', parent: 'body', at: [0.13, 0.24], layer: 7 },
      { id: 'wingF', sprite: 'imp/wing', parent: 'body', at: [0.06, 0.28], layer: 8, r0: -0.2 }
    ]
  },
  slime: {
    scale: 1,
    parts: [
      { id: 'body', sprite: 'slime/body', parent: 'root', at: [0, 0], layer: 0 },
      { id: 'eyes', sprite: 'slime/eyes', parent: 'body', at: [0.04, 0.26], layer: 1 }
    ]
  },
  sentinel: {
    scale: 1.0,
    parts: [
      { id: 'armB', sprite: 'sentinel/limb', parent: 'torso', at: [-0.17, 0.42], layer: 0, tint: 0.8 },
      { id: 'legB', sprite: 'sentinel/limb', parent: 'root', at: [-0.08, 0.44], layer: 1, tint: 0.8 },
      { id: 'legF', sprite: 'sentinel/limb', parent: 'root', at: [0.08, 0.44], layer: 2 },
      { id: 'torso', sprite: 'sentinel/torso', parent: 'root', at: [0, 0.42], layer: 3 },
      { id: 'head', sprite: 'sentinel/head', parent: 'torso', at: [0, 0.46], layer: 4 },
      { id: 'weapon', sprite: 'sentinel/sword', parent: 'armF', at: [0, -0.34], layer: 5 },
      { id: 'armF', sprite: 'sentinel/limb', parent: 'torso', at: [0.17, 0.42], layer: 6 },
      { id: 'shield', sprite: 'sentinel/shield', parent: 'armB', at: [0.08, -0.3], layer: 7 }
    ]
  },
  archer: {
    scale: 0.95,
    parts: [
      { id: 'cloak', sprite: 'archer/cloak', parent: 'torso', at: [0, 0.36], layer: 0 },
      { id: 'legB', sprite: 'archer/limb', parent: 'root', at: [-0.07, 0.36], layer: 1, tint: 0.8 },
      { id: 'legF', sprite: 'archer/limb', parent: 'root', at: [0.07, 0.36], layer: 2 },
      { id: 'armB', sprite: 'archer/limb', parent: 'torso', at: [-0.13, 0.32], layer: 3, tint: 0.85 },
      { id: 'torso', sprite: 'archer/torso', parent: 'root', at: [0, 0.34], layer: 4 },
      { id: 'head', sprite: 'archer/head', parent: 'torso', at: [0, 0.36], layer: 5 },
      { id: 'armF', sprite: 'archer/limb', parent: 'torso', at: [0.12, 0.32], layer: 6 },
      { id: 'bow', sprite: 'archer/bow', parent: 'armF', at: [0, -0.28], layer: 7 }
    ]
  },
  gorehorn: {
    scale: 1.15,
    parts: [
      { id: 'tail', sprite: 'gorehorn/tail', parent: 'body', at: [-0.58, 0.56], layer: 0, r0: 2.4 },
      { id: 'legBB', sprite: 'gorehorn/leg', parent: 'body', at: [-0.36, 0.22], layer: 1, tint: 0.7 },
      { id: 'legFB', sprite: 'gorehorn/leg', parent: 'body', at: [0.3, 0.22], layer: 2, tint: 0.7 },
      { id: 'body', sprite: 'gorehorn/body', parent: 'root', at: [0, 0.3], layer: 3 },
      { id: 'legBF', sprite: 'gorehorn/leg', parent: 'body', at: [-0.3, 0.18], layer: 4 },
      { id: 'legFF', sprite: 'gorehorn/leg', parent: 'body', at: [0.36, 0.18], layer: 5 },
      { id: 'head', sprite: 'gorehorn/head', parent: 'body', at: [0.46, 0.44], layer: 6 }
    ]
  },
  jarl: {
    scale: 1.55,
    parts: [
      { id: 'armB', sprite: 'jarl/arm', parent: 'torso', at: [-0.66, 1.0], layer: 0, tint: 0.75 },
      { id: 'legB', sprite: 'jarl/leg', parent: 'root', at: [-0.26, 0.72], layer: 1, tint: 0.8 },
      { id: 'legF', sprite: 'jarl/leg', parent: 'root', at: [0.26, 0.72], layer: 2 },
      { id: 'torso', sprite: 'jarl/torso', parent: 'root', at: [0, 0.62], layer: 3 },
      { id: 'head', sprite: 'jarl/head', parent: 'torso', at: [0, 1.18], layer: 4 },
      { id: 'weapon', sprite: 'jarl/maul', parent: 'armF', at: [0, -0.92], layer: 5 },
      { id: 'armF', sprite: 'jarl/arm', parent: 'torso', at: [0.66, 1.0], layer: 6 }
    ]
  }
};

/* ------------------------------------------------------------ drawing */

const ORDER = new WeakMap();
/** A rig's parts with every parent before its children (cached). */
export function ordered(rig) {
  let out = ORDER.get(rig);
  if (out) return out;
  out = [];
  const done = new Set(['root']);
  let left = [...rig.parts];
  while (left.length) {
    const next = left.filter((p) => done.has(p.parent));
    if (!next.length) throw new Error(`rig has a part with no parent: ${left.map((p) => p.id)}`);
    for (const p of next) {
      out.push(p);
      done.add(p.id);
    }
    left = left.filter((p) => !done.has(p.id));
  }
  ORDER.set(rig, out);
  return out;
}

const IDENT = { x: 0, y: 0, r: 0, sx: 1, sy: 1 };

/**
 * Lay out a rig in a pose and push its pieces into the sprite batch.
 * `o`: x, y (feet), z (lift), flip (face left), view ('f' | 'b'), scale,
 * flash, tint, alpha, glow, key (sort), ghost (tint+alpha for afterimages).
 */
export function drawPuppet(batch, atlas, rigName, pose, o) {
  const rig = RIGS[rigName];
  const S = (o.scale ?? 1) * rig.scale;
  const view = o.view ?? 'f';
  const flip = o.flip ? -1 : 1;
  const root = { ...IDENT, ...(pose.root ?? {}) };
  const world = { root: { x: root.x * S, y: root.y * S, r: root.r, sx: root.sx, sy: root.sy } };
  const out = [];
  for (const p of ordered(rig)) {
    const pp = pose[p.id] ?? IDENT;
    const par = world[p.parent] ?? world.root;
    // the joint, in the parent's frame (scaled), then rotated by the parent
    const lx = (p.at[0] + (pp.x ?? 0)) * S * par.sx;
    const ly = (p.at[1] + (pp.y ?? 0)) * S * par.sy;
    const c = Math.cos(par.r);
    const s = Math.sin(par.r);
    const w = { x: par.x + lx * c - ly * s, y: par.y + lx * s + ly * c, r: par.r + (p.r0 ?? 0) + (pp.r ?? 0), sx: par.sx * (pp.sx ?? 1), sy: par.sy * (pp.sy ?? 1) };
    world[p.id] = w;
    if (pp.hide) continue;
    const layer = typeof p.layer === 'object' ? p.layer[view] : p.layer;
    const name = typeof p.sprite === 'object' ? p.sprite[view] : p.sprite;
    out.push({ p, w, layer, name, pp });
  }
  out.sort((a, b) => a.layer - b.layer);
  const tint = o.tint ?? [1, 1, 1];
  for (const { p, w, name, pp } of out) {
    const f = atlas.get(name);
    const k = p.tint ?? 1;
    const partFlip = (p.flipX ? -1 : 1) * flip;
    batch.push(f, o.x + w.x * flip, o.y, {
      z: (o.z ?? 0) + w.y,
      rot: w.r * flip,
      flip: partFlip < 0,
      sx: S * w.sx * (pp.fs ?? 1),
      sy: S * w.sy * (pp.fs ?? 1),
      tint: [tint[0] * k, tint[1] * k, tint[2] * k],
      alpha: o.alpha ?? 1,
      flash: o.flash ?? 0,
      glow: (o.glow ?? 0) + (pp.glow ?? 0),
      key: o.key ?? o.y,
      base: o.y
    });
  }
  return world;
}

/* ------------------------------------------------------------ hero poses */

/**
 * The hero's pose. `a` = { anim, t (time in anim), dur, step (combo index),
 * run (0…1 speed), phase (stride), charge (0…1), hurtT, deadT, time }.
 */
export function heroPose(kind, a) {
  const spear = kind === 'runner';
  const T = a.time;
  const run = a.run ?? 0;
  const ph = a.phase ?? 0;
  const pose = { root: { x: 0, y: 0, r: 0, sx: 1, sy: 1 } };
  // Base: idle breathing and the run cycle.
  const breathe = Math.sin(T * 2.2) * 0.012;
  const stride = Math.sin(ph);
  const bob = Math.abs(Math.cos(ph)) * 0.05 * run;
  pose.root.y = bob + breathe;
  pose.root.sy = 1 + breathe * 1.5 - run * 0.02;
  pose.torso = { r: -0.12 * run + Math.sin(T * 2.2) * 0.01 };
  pose.head = { r: 0.04 * run + Math.sin(T * 2.2 + 1) * 0.02 };
  pose.legF = { r: stride * 0.75 * run };
  pose.legB = { r: -stride * 0.75 * run };
  pose.armB = { r: -stride * 0.45 * run - 0.15 };
  pose.armF = { r: spear ? 0.5 + stride * 0.25 * run : 0.35 + stride * 0.4 * run };
  pose.weapon = { r: spear ? 1.25 : 1.15 };
  pose.shield = { r: 0.1 };
  pose.cape = { r: 0.25 * run + Math.sin(T * 3 + ph) * 0.06 * (0.3 + run) };
  pose.lantern = { r: -stride * 0.3 * run + Math.sin(T * 2) * 0.05 };
  const t = a.t ?? 0;
  switch (a.anim) {
    case 'attack': {
      const s = a.step;
      if (!spear) {
        if (s === 0) {
          // forehand: up and back, then hard down across
          pose.armF.r = kf(t, [[0, 0.4], [0.07, 2.7], [0.13, -0.2], [0.36, 0.2]], outQuad);
          pose.weapon.r = kf(t, [[0, 1.1], [0.07, 0.3], [0.13, 0.15], [0.36, 0.9]]);
          pose.torso.r = kf(t, [[0, 0], [0.07, 0.18], [0.13, -0.22], [0.36, -0.05]]);
        } else if (s === 1) {
          // backhand: low and across, then up
          pose.armF.r = kf(t, [[0, 0.1], [0.07, -0.6], [0.14, 2.3], [0.38, 1.4]], outQuad);
          pose.weapon.r = kf(t, [[0, 0.8], [0.07, 1.3], [0.14, 0.2], [0.38, 0.6]]);
          pose.torso.r = kf(t, [[0, 0], [0.07, -0.2], [0.14, 0.2], [0.38, 0.05]]);
        } else {
          // overhead: rise, then slam
          pose.armF.r = kf(t, [[0, 0.6], [0.18, 3.0], [0.24, 0.35], [0.58, 0.4]], outQuad);
          pose.armB.r = kf(t, [[0, -0.1], [0.18, 2.6], [0.24, 0.2], [0.58, -0.1]]);
          pose.weapon.r = kf(t, [[0, 1], [0.18, 0.1], [0.24, 0.05], [0.58, 0.9]]);
          pose.root.y += kf(t, [[0, 0], [0.16, 0.14], [0.22, 0], [0.58, 0]]);
          pose.root.sy *= kf(t, [[0, 1], [0.16, 1.1], [0.23, 0.82], [0.34, 1.04], [0.58, 1]]);
          pose.root.sx = kf(t, [[0, 1], [0.16, 0.94], [0.23, 1.16], [0.34, 0.98], [0.58, 1]]);
          pose.torso.r = kf(t, [[0, 0], [0.18, 0.15], [0.24, -0.3], [0.58, -0.05]]);
        }
      } else if (s === 0) {
        // thrust: draw back, then lunge the point forward
        pose.armF.r = kf(t, [[0, 0.6], [0.06, 1.0], [0.1, 1.62], [0.3, 1.2]], outQuad);
        pose.weapon.r = kf(t, [[0, 0.6], [0.06, 0.2], [0.1, 0], [0.3, 0.3]]);
        pose.armF.x = kf(t, [[0, 0], [0.06, -0.12], [0.1, 0.16], [0.3, 0]]);
        pose.torso.r = kf(t, [[0, 0], [0.06, 0.1], [0.1, -0.28], [0.3, -0.1]]);
      } else if (s === 1) {
        // sweep: a wide cut from high to low
        pose.armF.r = kf(t, [[0, 1.0], [0.07, 2.6], [0.14, 0.0], [0.34, 0.5]], outQuad);
        pose.weapon.r = kf(t, [[0, 0.4], [0.07, 0.0], [0.14, 0.3], [0.34, 0.8]]);
        pose.torso.r = kf(t, [[0, 0], [0.07, 0.25], [0.14, -0.3], [0.34, -0.05]]);
      } else {
        // vault: up into the air, the spear driven down
        pose.root.y += kf(t, [[0, 0], [0.12, 0.42], [0.2, 0], [0.5, 0]], outQuad);
        pose.root.r = kf(t, [[0, 0], [0.12, 0.25], [0.2, -0.35], [0.5, 0]]);
        pose.armF.r = kf(t, [[0, 0.8], [0.12, 2.8], [0.2, 0.7], [0.5, 0.7]], outQuad);
        pose.weapon.r = kf(t, [[0, 0.4], [0.12, 0.1], [0.2, 0], [0.5, 0.6]]);
        pose.legF.r = kf(t, [[0, 0], [0.12, 0.8], [0.2, 0], [0.5, 0]]);
        pose.legB.r = kf(t, [[0, 0], [0.12, -0.6], [0.2, 0], [0.5, 0]]);
        pose.root.sy *= kf(t, [[0, 1], [0.1, 1.1], [0.2, 0.84], [0.32, 1]]);
      }
      break;
    }
    case 'charge': {
      const c = a.charge ?? 0;
      pose.root.sy *= 1 - c * 0.1;
      pose.root.sx = 1 + c * 0.06;
      pose.torso.r = 0.2 * c;
      pose.armF.r = spear ? 1.6 - c * 0.5 : -0.8 - c * 0.6;
      pose.armF.x = spear ? -0.14 * c : 0;
      pose.weapon.r = spear ? 0 : 1.6;
      pose.legF.r = 0.4 * c;
      pose.legB.r = -0.5 * c;
      break;
    }
    case 'heavy': {
      if (spear) {
        pose.armF.r = 1.6;
        pose.weapon.r = 0;
        pose.armF.x = kf(t, [[0, -0.1], [0.1, 0.2], [0.42, 0]]);
        pose.torso.r = -0.35;
        pose.legF.r = 0.8;
        pose.legB.r = -0.7;
        pose.root.sx = kf(t, [[0, 1.2], [0.2, 1.05], [0.42, 1]]);
        pose.root.sy *= kf(t, [[0, 0.86], [0.2, 0.96], [0.42, 1]]);
      } else {
        // a whirl: arm out, the body spinning (mirrored back and forth by the caller)
        pose.armF.r = 1.55;
        pose.weapon.r = 0.05;
        pose.armB.r = -1.2;
        pose.torso.r = -0.1;
        pose.root.sy *= kf(t, [[0, 0.9], [0.15, 1.05], [0.48, 1]]);
      }
      break;
    }
    case 'dash': {
      const k = clamp01(t / (a.dur ?? 0.25));
      if (spear) {
        pose.root.sx = 1.25;
        pose.root.sy *= 0.82;
        pose.torso.r = -0.5;
        pose.legF.r = 0.9;
        pose.legB.r = -0.9;
        pose.cape.r = 1.2;
      } else {
        pose.root.r = -TAU * outQuad(k);
        pose.root.y += 0.25 * Math.sin(k * Math.PI);
        pose.root.sy *= 0.8;
        pose.root.sx = 0.9;
        pose.armF.r = 1.8;
        pose.legF.r = 1.6;
        pose.legB.r = 1.2;
      }
      break;
    }
    case 'throw':
      pose.armF.r = kf(t, [[0, 0.4], [0.08, -1.2], [0.16, 2.2], [0.32, 1.0]], outQuad);
      pose.weapon.hide = !spear ? t > 0.08 && t < 0.3 : false;
      pose.torso.r = kf(t, [[0, 0], [0.08, 0.2], [0.16, -0.25], [0.32, 0]]);
      break;
    case 'cast':
      pose.armF.r = kf(t, [[0, 0.3], [0.2, 2.9], [0.6, 2.9], [0.8, 0.4]]);
      pose.armB.r = kf(t, [[0, -0.1], [0.2, 2.5], [0.6, 2.5], [0.8, -0.1]]);
      pose.root.y += kf(t, [[0, 0], [0.2, 0.08], [0.6, 0.08], [0.8, 0]]);
      pose.head.r = kf(t, [[0, 0], [0.2, 0.2], [0.6, 0.2], [0.8, 0]]);
      break;
    case 'drink':
      pose.armB.r = kf(t, [[0, -0.1], [0.12, 2.6], [0.4, 2.6], [0.5, -0.1]]);
      pose.head.r = kf(t, [[0, 0], [0.12, 0.3], [0.4, 0.3], [0.5, 0]]);
      break;
    case 'hurt':
      pose.torso.r = 0.35 * (1 - clamp01(t / 0.3));
      pose.head.r = 0.3 * (1 - clamp01(t / 0.3));
      pose.armF.r += 0.6;
      pose.armB.r -= 0.6;
      pose.root.x = -0.06 * (1 - clamp01(t / 0.3));
      break;
    case 'dead': {
      const k = clamp01(t / 0.6);
      pose.root.r = 1.45 * outQuad(k);
      pose.root.y = 0.2 * Math.sin(k * Math.PI) * (1 - k);
      pose.armF.r = 2.2;
      pose.armB.r = 1.8;
      pose.legF.r = 0.4;
      pose.head.r = 0.4;
      break;
    }
    default:
      break;
  }
  return pose;
}

/* ------------------------------------------------------------ foe poses */

/** A foe's pose from its brain's state and its body's numbers. */
export function foePose(type, e, T) {
  const st = e.brain?.state ?? 'idle';
  const t = e.brain?.t ?? 0;
  const run = e.run ?? 0;
  const ph = e.phase ?? 0;
  const stride = Math.sin(ph);
  const pose = { root: { x: 0, y: 0, r: 0, sx: 1, sy: 1 } };
  const dead = e.dead;
  if (type === 'imp') {
    const flap = Math.sin(T * 26 + e.seed) * 0.55;
    pose.root.y = 0.22 + Math.sin(T * 7 + e.seed) * 0.05;
    pose.wingF = { r: flap };
    pose.wingB = { r: -flap * 0.8 };
    pose.tail = { r: Math.sin(T * 5 + e.seed) * 0.4 };
    pose.legF = { r: 0.3 + stride * 0.3 };
    pose.legB = { r: -0.2 - stride * 0.3 };
    pose.armF = { r: 0.4 };
    pose.armB = { r: -0.3 };
    pose.head = { r: Math.sin(T * 3 + e.seed) * 0.08 };
    pose.body = { r: -0.15 * run };
    if (st === 'windThrow') {
      const k = clamp01(t / 0.55);
      pose.armF.r = 2.6 + k * 0.4;
      pose.body.r = 0.25 * k;
      pose.root.sy = 1 - 0.18 * k;
      pose.root.sx = 1 + 0.12 * k;
      pose.head.r = 0.15;
    } else if (st === 'recover' && e.lastAct === 'ember') {
      const k = clamp01(t / 0.2);
      pose.armF.r = 2.8 - k * 3.2;
      pose.body.r = -0.3 * (1 - k);
    } else if (st === 'windScratch') {
      pose.armF.r = 2.4;
      pose.body.r = 0.3;
      pose.root.sy = 0.86;
    } else if (st === 'alert') {
      pose.root.y += Math.sin(clamp01(t / 0.4) * Math.PI) * 0.35;
      pose.root.sy = 1.12;
    } else if (st === 'hurt') {
      pose.body.r = 0.5;
      pose.head.r = 0.4;
    }
  } else if (type === 'slime') {
    const wob = Math.sin(T * 6 + e.seed) * 0.04;
    pose.root.sx = 1 + wob;
    pose.root.sy = 1 - wob;
    pose.eyes = { x: Math.cos(e.look ?? 0) * 0.06, y: Math.sin(e.look ?? 0) * 0.03 };
    if (st === 'squash') {
      const k = clamp01(t / (e.brain.squashTime ?? 0.4));
      pose.root.sx = 1 + 0.32 * k + Math.sin(T * 40) * 0.03 * k;
      pose.root.sy = 1 - 0.36 * k;
    } else if (st === 'air') {
      const k = clamp01(t / 0.42);
      pose.root.sx = 0.82 + 0.1 * k;
      pose.root.sy = 1.26 - 0.2 * k;
    } else if (st === 'rest' && t < 0.18) {
      const k = t / 0.18;
      pose.root.sx = 1.3 - 0.3 * k;
      pose.root.sy = 0.72 + 0.28 * k;
    }
  } else if (type === 'sentinel') {
    pose.legF = { r: stride * 0.5 * run };
    pose.legB = { r: -stride * 0.5 * run };
    pose.armB = { r: 1.0 };
    pose.shield = { r: -1.0, fs: 0.82 };
    pose.armF = { r: 0.5 };
    pose.weapon = { r: 1.0 };
    pose.torso = { r: -0.05 * run };
    pose.head = { r: Math.sin(T * 1.5 + e.seed) * 0.04 };
    pose.root.y = Math.abs(Math.cos(ph)) * 0.03 * run;
    if (st === 'windChop') {
      const k = clamp01(t / 0.68);
      pose.armF.r = 0.5 + 2.5 * outQuad(k);
      pose.weapon.r = 1.0 - 0.8 * k;
      pose.torso.r = 0.18 * k;
      pose.armB.r = 0.6;
      pose.shield.r = -0.6;
      pose.root.sy = 1 + 0.06 * k;
    } else if (st === 'recover' && e.lastAct === 'melee') {
      const k = clamp01(t / 0.12);
      pose.armF.r = 3.0 - 3.2 * k;
      pose.weapon.r = 0.2;
      pose.torso.r = -0.25;
      pose.armB.r = 0.3;
      pose.shield.r = -0.3;
    } else if (st === 'windBash') {
      const k = clamp01(t / 0.48);
      pose.armB.r = 1.2 - 0.6 * k;
      pose.torso.r = 0.2 * k;
      pose.root.x = -0.1 * k;
    } else if (st === 'recover' && e.lastAct === 'bash') {
      pose.armB.r = 1.6;
      pose.root.x = 0.12;
    } else if (st === 'broken') {
      // guard broken: shield dropped, reeling
      pose.armB.r = -0.4;
      pose.shield.r = 0.9;
      pose.shield.y = -0.1;
      pose.torso.r = 0.3 + Math.sin(T * 9) * 0.06;
      pose.head.r = 0.4;
      pose.armF.r = -0.3;
    } else if (st === 'hurt') {
      pose.torso.r = 0.2;
    }
  } else if (type === 'archer') {
    pose.legF = { r: stride * 0.55 * run };
    pose.legB = { r: -stride * 0.55 * run };
    pose.armF = { r: 0.6 };
    pose.armB = { r: -0.2 };
    pose.bow = { r: 0.2 };
    pose.cloak = { r: 0.2 * run + Math.sin(T * 2.5 + e.seed) * 0.06 };
    pose.root.y = Math.abs(Math.cos(ph)) * 0.04 * run;
    if (st === 'draw') {
      const k = clamp01(t / 0.35);
      pose.armF.r = 1.57 * k + 0.6 * (1 - k);
      pose.bow.r = -1.57 * k + 0.2 * (1 - k);
      pose.armB.r = 1.3 * k;
      pose.armB.x = -0.06 * k;
      pose.torso = { r: -0.08 * k };
    } else if (st === 'loose') {
      pose.armF.r = 1.57;
      pose.bow.r = -1.57;
      pose.armB.r = -0.6;
    }
  } else if (type === 'gorehorn') {
    const sp = st === 'charge' ? 2.2 : 1;
    const s2 = Math.sin(ph * sp);
    pose.legFF = { r: s2 * 0.55 * run };
    pose.legBB = { r: s2 * 0.55 * run };
    pose.legFB = { r: -s2 * 0.55 * run };
    pose.legBF = { r: -s2 * 0.55 * run };
    pose.tail = { r: Math.sin(T * 4 + e.seed) * 0.3 };
    pose.head = { r: Math.sin(T * 1.6 + e.seed) * 0.05 };
    pose.body = { r: 0 };
    pose.root.y = Math.abs(Math.cos(ph * sp)) * 0.04 * run;
    if (st === 'paw') {
      pose.legFF.r = Math.sin(T * 18) * 0.6 - 0.2;
      pose.head.r = -0.3;
      pose.body.r = -0.08;
      pose.root.sy = 0.95;
    } else if (st === 'charge') {
      pose.head.r = -0.4;
      pose.body.r = -0.06;
    } else if (st === 'stunned') {
      pose.head.r = 0.35 + Math.sin(T * 6) * 0.1;
      pose.body.r = 0.06;
      pose.root.sy = 0.92;
    } else if (st === 'windGore') {
      const k = clamp01(t / 0.5);
      pose.head.r = 0.5 * k;
      pose.root.x = -0.1 * k;
    } else if (st === 'skid' && e.lastAct === 'melee') {
      pose.head.r = -0.6;
      pose.root.x = 0.12;
    }
  } else if (type === 'jarl') {
    const k = (v) => clamp01(t / v);
    pose.legF = { r: stride * 0.35 * run };
    pose.legB = { r: -stride * 0.35 * run };
    pose.armF = { r: 0.5 };
    pose.armB = { r: -0.3 };
    pose.weapon = { r: 0.9 };
    pose.torso = { r: Math.sin(T * 1.2) * 0.02 };
    pose.head = { r: Math.sin(T * 1.3) * 0.03 };
    pose.root.y = Math.abs(Math.cos(ph)) * 0.05 * run + Math.sin(T * 1.2) * 0.02;
    const raise = e.out?.raise ?? 0;
    if (st === 'slam' || st === 'shards') {
      pose.armF.r = 0.5 + 2.6 * outQuad(raise);
      pose.armB.r = -0.3 + 2.4 * raise;
      pose.weapon.r = 0.9 - 0.8 * raise;
      pose.torso.r = 0.12 * raise;
      pose.root.sy = 1 + 0.06 * raise;
    } else if (st === 'sweep') {
      pose.armF.r = -1.2 * raise + 0.5 * (1 - raise);
      pose.torso.r = 0.25 * raise;
    } else if (st === 'recover' && (e.lastAct === 'slam' || e.lastAct === 'shards')) {
      const q = k(0.14);
      pose.armF.r = 3.1 - 2.8 * q;
      pose.armB.r = 2.1 - 2.3 * q;
      pose.weapon.r = 0.1;
      pose.torso.r = -0.2 * q;
      pose.root.sy = 1 - 0.1 * (1 - q) * 0 - 0.06;
    } else if (st === 'recover' && e.lastAct === 'melee') {
      pose.armF.r = 2.2 * (1 - k(0.4));
      pose.torso.r = -0.2;
    } else if (st === 'roar') {
      const q = e.out?.roar ?? 0;
      pose.armF.r = 0.5 + 1.6 * q;
      pose.armB.r = -0.3 + 1.6 * q;
      pose.head.r = 0.25 * q + Math.sin(T * 30) * 0.03 * q;
      pose.root.sy = 1 + 0.05 * q;
    } else if (st === 'breath') {
      pose.head.r = -0.15;
      pose.torso.r = -0.1;
    } else if (st === 'leap') {
      const c = e.out?.crouch ?? 0;
      const air = e.out?.air ?? 0;
      pose.root.sy = 1 - 0.18 * c + (air > 0 ? 0.12 : 0);
      pose.root.sx = 1 + 0.12 * c;
      pose.armF.r = 0.5 + 2.4 * (air > 0 ? 1 : c);
      pose.weapon.r = 0.2;
      pose.legF.r = air > 0 ? 0.6 : 0;
      pose.legB.r = air > 0 ? -0.5 : 0;
    }
  }
  if (e.hurtT > 0 && !dead && type !== 'jarl') {
    pose.root.x = (pose.root.x ?? 0) - 0.08 * e.hurtT * 4;
    pose.root.r = (pose.root.r ?? 0) + 0.12 * e.hurtT * 4;
  }
  if (dead) {
    const k = clamp01((e.deadT ?? 0) / 0.5);
    pose.root.r = (pose.root.r ?? 0) + (type === 'slime' ? 0 : 1.4 * outQuad(k));
    pose.root.sy = (pose.root.sy ?? 1) * (type === 'slime' ? 1 - 0.7 * k : 1);
    pose.root.sx = (pose.root.sx ?? 1) * (type === 'slime' ? 1 + 0.5 * k : 1);
    pose.root.y = (pose.root.y ?? 0) * (1 - k);
  }
  return pose;
}

export { ease, outQuad, inQuad, clamp01 };
