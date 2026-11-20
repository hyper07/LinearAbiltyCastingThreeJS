/**
 * Lanternwood's people as soft vinyl toys — heroes, villagers and the
 * people-shaped monsters — sculpted (sdf.js) on the very joints the rig
 * poses (rig.js: torso, head, the arms, the legs), so every walk, combo,
 * skill pose, aim twist and backpedal plays on them unchanged.
 *
 * Pure: no three.js, no DOM. personRecipe(desc) → a sculpting recipe;
 * personDesc(look, …) reads a Lanternwood look (classes.js / rules.js NPCS)
 * into a description; shapeKey(desc) names its geometry, so everyone with
 * the same cut, build, clothes and headwear shares one mesh (colours are
 * per figure: slots, material.js).
 *
 * Proportions: chibi — a big round head (about half the height), a bean of a
 * body, stubby arms with mitten hands and a thumb, short legs in boots — and
 * detailed like a sculpted toy: hair in locks, ears, collars, cuffs, a belt
 * and buckle, hems, boot cuffs; villagers' scarves, kerchiefs, bands, flowers. Units: metres,
 * feet at y = 0, facing +Z; −X is the figure's right (its weapon hand).
 */

/* ---------------------------------------------------------------- helpers */

const S = (c, r, o = {}) => ({ s: 'sph', c, r, ...o });
const E = (c, r, o = {}) => ({ s: 'ell', c, r, ...o });
const C = (a, b, r, o = {}) => ({ s: 'cap', a, b, r, ...o });
const T = (a, b, ra, rb, o = {}) => ({ s: 'taper', a, b, r: [ra, rb], ...o });
const D = (c, r, th, o = {}) => ({ s: 'disc', c, r: [r, th], ...o });
const flipX = (v) => (Array.isArray(v) && v.length === 3 && typeof v[0] === 'number' ? [-v[0], v[1], v[2]] : v);
const SWAP = { armNeg: 'armPos', armPos: 'armNeg', legNeg: 'legPos', legPos: 'legNeg' };
/** A shape (on the −X side) and its mirror image; Neg bones become Pos. */
function pair(shape) {
  const m = { ...shape };
  for (const k of ['c', 'a', 'b']) if (m[k]) m[k] = flipX(m[k]);
  if (m.rot) m.rot = [m.rot[0], -m.rot[1], -m.rot[2]];
  if (SWAP[m.bone]) m.bone = SWAP[m.bone];
  return [shape, m];
}
const both = (...shapes) => shapes.flatMap(pair);

/** The colour slots every person has (material.js palette order). */
export const PERSON_SLOTS = ['skin', 'hair', 'cloth', 'tunic', 'trim', 'legs', 'shoes', 'hands'];
export const HAIRS = ['short', 'long', 'bun', 'spiky', 'ponytail', 'bob', 'bald', 'curly', 'pigtails'];
const B = (c, r, round, o = {}) => ({ s: 'box', c, r, round, ...o });
const BELT = '#5a3a26';
const POUCH = '#7a5434';
const GOLD = '#d8b048';
const STEEL = '#aab4be';

/* ---------------------------------------------------------------- the body plan */

/**
 * Where the joints are for a build (body frame). The rig reads these the way
 * it read the voxel figure's (rig.js): the neck, the hip, each shoulder, each
 * hip joint; plus where each fist is from its shoulder (the weapon socket).
 */
export function bodyPlan(build = 'broad') {
  const broad = build !== 'slim';
  const bx = broad ? 0.29 : 0.245, bz = broad ? 0.235 : 0.21;
  const sx = broad ? 0.33 : 0.29, lx = broad ? 0.15 : 0.13;
  const neckY = 0.76, hipY = 0.27, shoulderY = 0.7;
  const hand = [0.12, -0.36, 0.03]; // the fist, from the shoulder (on +X; mirrored for the right)
  return {
    bx, bz, sx, lx, neckY, hipY, shoulderY, hand,
    head: { c: [0, 1.17, 0.0], r: [0.47, 0.41, 0.4] },
    joints: {
      head: [0, neckY, 0],
      torso: [0, hipY, 0],
      armNeg: [-sx, shoulderY, 0],
      armPos: [sx, shoulderY, 0],
      legNeg: [-lx, hipY, 0],
      legPos: [lx, hipY, 0]
    },
    height: 1.6,
    armLength: -hand[1] + 0.06,
    legLen: hipY,
    backZ: -bz - 0.05,
    headLift: 0
  };
}

/* ---------------------------------------------------------------- description */

const WEARS = ['scarf', 'kerchief', 'band', 'flower'];
/** A light colour (an elder's white or grey hair). */
const pale = (hex) => {
  const n = parseInt(String(hex ?? '').replace('#', ''), 16);
  if (!Number.isFinite(n)) return false;
  return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255) > 3 * 200;
};

/**
 * A person's description from a Lanternwood look ({ hair, eyes, beard, build,
 * sex, outfit, elder, wear }) and what they wear (an items.js gearLook, or an
 * NPC's { head, chest … }). `cls` gives a hero their class's silhouette;
 * `hostile` a monster's angry glowing eyes. `look.wear` is a villager's
 * extras: [['scarf' | 'kerchief' | 'band' | 'flower', '#colour'], …].
 */
export function personDesc(look = {}, gear = null, { cls = null, hostile = false, eyeGlow = null, extra = null } = {}) {
  const head = gear?.head ?? null;
  const robe = Boolean(gear?.chest?.robe);
  const outfit = robe ? 'robe' : look.outfit ?? 'tunic';
  // What sits on the head: a gear hat or helm (gear3d.js, on the head joint) leaves the hair it does not
  // hide; with nothing worn, a class shows its own headwear.
  let headwear = 'none';
  if (head) headwear = head.hidesHair ? 'hidden' : 'hat';
  else if (cls === 'warden') headwear = 'helm';
  else if (cls === 'seer') headwear = 'cowl';
  else if (cls === 'ranger') headwear = 'hood';
  else if (extra?.headwear) headwear = extra.headwear;
  let hair = HAIRS.includes(look.hair) ? look.hair : 'short';
  if (headwear === 'hidden' || headwear === 'helm' || headwear === 'cowl' || headwear === 'hood') hair = 'under';
  else if ((headwear === 'hat' || headwear === 'brim') && (hair === 'spiky' || hair === 'bun' || hair === 'curly' || hair === 'pigtails')) hair = 'short';
  const beard = ['beard', 'stubble', 'moustache'].includes(look.beard) && headwear !== 'hidden' ? look.beard : null;
  const weight = gear?.chest?.weight;
  // A villager's extras (a scarf, a kerchief or head band, a flower in the hair); not under a helm or hood.
  const wear = (look.wear ?? extra?.wear ?? [])
    .filter(([k, c]) => WEARS.includes(k) && /^#[0-9a-f]{3,6}$/i.test(c ?? ''))
    .filter(([k]) => !((k === 'kerchief' || k === 'band' || k === 'flower') && (headwear !== 'none' || hair === 'under')))
    .map(([k, c]) => [k, c.toLowerCase()]);
  return {
    hair,
    build: look.build === 'slim' ? 'slim' : 'broad',
    sex: look.sex === 'f' ? 'f' : 'm',
    beard,
    elder: Boolean(look.elder || (beard === 'beard' && pale(look.hairColor))),
    eyes: ['wide', 'narrow', 'dot'].includes(look.eyes) ? look.eyes : 'wide',
    outfit: ['tunic', 'robe', 'dress', 'apron'].includes(outfit) ? outfit : 'tunic',
    apron: outfit === 'apron' ? look.apron ?? '#7a5a3a' : null,
    cls: ['blade', 'warden', 'seer', 'ranger'].includes(cls) ? cls : null,
    headwear,
    pauldrons: weight === 'heavy',
    armor: weight === 'heavy' || weight === 'medium' ? weight : null,
    hostile: Boolean(hostile),
    eyeGlow,
    hat: headwear === 'brim' ? extra?.hat ?? '#8a5a3a' : null,
    pack: extra?.pack ?? null,
    wear
  };
}

/** The name of a description's mesh: the same shape, the same geometry. */
export const shapeKey = (d) => ['p', d.hair, d.build, d.sex, d.beard ?? '-', d.elder ? 'E' : '-', d.outfit, d.apron ?? '-', d.cls ?? '-', d.headwear, d.pauldrons ? 'P' : '-', d.armor ?? '-', d.hat ?? '-', d.pack ?? '-', (d.wear ?? []).map((w) => w.join(':')).join(',') || '-'].join('|');
/** The name of a description's face (its eyes and temper differ on the same mesh). */
export const faceKey = (d) => `${shapeKey(d)}|${d.eyes}|${d.hostile ? d.eyeGlow ?? 'H' : '-'}|${d.sex}`;

/* ---------------------------------------------------------------- hair */

/** The hair cap's ellipsoid (round the head, a little bigger), for placing locks on it. */
const CAP = { c: [0, 1.22, -0.025], r: [0.498, 0.398, 0.432] };
/** A point on the hair cap at azimuth `t` (0 the front, π the back; + toward −X) and elevation `e`, pushed `out` along its normal. */
function onCap(t, e, out = 0, grow = 1) {
  const [cx, cy, cz] = CAP.c, rx = CAP.r[0] * grow, ry = CAP.r[1] * grow, rz = CAP.r[2] * grow;
  const x = -Math.sin(t) * Math.cos(e) * rx, y = Math.sin(e) * ry, z = Math.cos(t) * Math.cos(e) * rz;
  const nx = x / (rx * rx), ny = y / (ry * ry), nz = z / (rz * rz), l = Math.hypot(nx, ny, nz);
  return [cx + x + (nx / l) * out, cy + y + (ny / l) * out, cz + z + (nz / l) * out];
}
/**
 * A lock of hair lying on the cap from (t0, e0) to (t1, e1), thick `r0` at
 * the root and `r1` at the tip; `out0` / `out1` how far its axis sits off the
 * cap (negative: half sunk in, so it reads as a ridge).
 */
const lock = (t0, e0, t1, e1, r0, r1, { out0 = -r0 * 0.45, out1 = 0, k = 0.022, grow = 1, col = 'hair' } = {}) =>
  T(onCap(t0, e0, out0, grow), onCap(t1, e1, out1, grow), r0, r1, { k, bone: 'head', col });

/** Hair, per cut: `before` the head (the cap, the face carved free), `after` it (locks, ties). All on the head bone. */
function hairParts(cut, H, d) {
  const [cx, cy, cz] = H.c, [rx, ry, rz] = H.r;
  const hb = { bone: 'head', col: 'hair' };
  const cap = (grow = 1, drop = 0) => E([cx, cy + 0.05 - drop, cz - 0.025], [rx * 1.06 * grow, ry * 0.97 * grow, rz * 1.08 * grow], { k: 0.04, ...hb });
  // The face, carved out of the cap: everything in front below the hairline.
  const face = (top = 1.2, wide = 0.42) => E([cx, top - 0.3, cz + 0.32], [wide, 0.34, 0.34], { sub: true, k: 0.025 });
  // A side parting, a shallow groove the crease shading darkens.
  const part = (x = 0.1) => C(onCap(-Math.sign(x) * 0.25, 0.75, 0.02), onCap(-Math.sign(x) * 0.6, 1.25, 0.02), 0.018, { sub: true, k: 0.012 });
  // Bangs over the forehead: `n` locks from the top of the head to points above the brows, swept a little.
  const bangs = (n = 5, spread = 0.95, { sweep = 0.12, tipE = 0.13, r0 = 0.095, r1 = 0.024, rootE = 0.85, len = 1 } = {}) => Array.from({ length: n }, (_, i) => {
    const u = n === 1 ? 0 : i / (n - 1) - 0.5;
    const t0 = u * spread * 0.7, t1 = u * spread + sweep;
    return lock(t0, rootE, t1, tipE + Math.abs(u) * 0.12 * len + (i % 2) * 0.03, r0, r1, { out1: 0.012 });
  });
  // Locks in front of the ears, down to `to` (an elevation: lower is longer).
  const sideLocks = (to = -0.25, r0 = 0.085) => both(lock(-1.0, 0.45, -1.12, to, r0, 0.03, { out1: 0.01 }));
  // Combed locks over the crown toward the back, and short points at the nape.
  const crown = (n = 7, toE = 0.05, from = 1.2) => Array.from({ length: n }, (_, i) => {
    const t = Math.PI * (0.55 + (i / (n - 1)) * 0.9);
    return lock(t * 0.5, from, t, toE, 0.085, 0.045, { out0: -0.035, out1: -0.012, k: 0.016 });
  });
  const nape = (n = 5, toE = -0.42, r0 = 0.09) => Array.from({ length: n }, (_, i) => {
    const t = Math.PI + (i / (n - 1) - 0.5) * 1.6;
    return lock(t, 0.05, t + (i / (n - 1) - 0.5) * 0.15, toE - (i % 2) * 0.06, r0, 0.025, { out0: -0.03, out1: 0.0 });
  });
  // A tie (a band in the trim colour) round a bunch of hair at `c`, its axis along `dir`.
  const tie = (c, rot, r = 0.065) => D(c, r, 0.028, { k: 0.012, bone: 'head', col: 'trim', rot, fab: 'stitch' });
  switch (cut) {
    case 'bald':
      // An elder keeps a fringe of hair round the back of the head.
      return { before: [], after: d.elder ? [...both(E([-0.42, 1.22, -0.12], [0.1, 0.13, 0.16], { k: 0.04, ...hb })), ...nape(5, -0.25, 0.07).map((p) => ({ ...p, r: [0.07, 0.04] }))] : [] };
    case 'under': // under a hood or a helm: bangs and the locks by the ears
      return { before: [], after: [...bangs(4, 0.62, { tipE: 0.14, r0: 0.065, r1: 0.022, rootE: 0.36 }), ...both(lock(-0.95, 0.12, -1.05, -0.2, 0.055, 0.025, { out1: 0.01 })), ...nape(5, -0.4, 0.08)] };
    case 'long':
      return {
        before: [cap(1.02), face(1.22, 0.4)],
        after: [
          ...bangs(4, 0.9, { sweep: -0.1 }), part(-0.1), ...crown(7, -0.2),
          ...both(lock(-1.0, 0.5, -1.18, -0.75, 0.1, 0.04, { out1: 0.02 }), lock(-1.35, 0.3, -1.6, -0.9, 0.11, 0.035, { out1: 0.03 })),
          E([0, 1.0, -0.24], [0.4, 0.36, 0.18], { k: 0.08, ...hb }),
          ...[-0.3, -0.1, 0.1, 0.3].map((x, i) => T([x, 1.2, -0.38], [x * 1.25, 0.74 - (i % 2) * 0.05, -0.34], 0.12, 0.035, { k: 0.03, ...hb }))
        ]
      };
    case 'bun':
      return {
        before: [cap(0.99), face()],
        after: [
          ...bangs(3, 0.8, { sweep: 0.18, rootE: 0.75 }), ...crown(7, 0.75, 0.2).map((p) => ({ ...p, b: [p.b[0] * 0.4, 1.52, -0.2] })), ...sideLocks(-0.1, 0.06),
          S([0, 1.62, -0.17], 0.15, { k: 0.04, ...hb }),
          // The bun wound round: two ridges over it.
          T([-0.13, 1.6, -0.1], [0.12, 1.7, -0.2], 0.05, 0.04, { k: 0.02, ...hb }), T([0.13, 1.56, -0.13], [-0.1, 1.68, -0.26], 0.05, 0.035, { k: 0.02, ...hb }),
          tie([0, 1.51, -0.12], [1.2, 0, 0], 0.13)
        ]
      };
    case 'spiky': {
      const spikes = [];
      for (let row = 0; row < 2; row++) for (let i = 0; i < 7 - row * 2; i++) {
        const t = Math.PI * (0.35 + ((i + row * 0.5) / 6) * 1.3);
        const e = 0.95 - row * 0.45;
        const base = onCap(t * 0.6 + (row ? 0.8 : 0), e, -0.03);
        const dir = onCap(t * 0.6 + (row ? 0.8 : 0), e, 0.3);
        spikes.push(T(base, [dir[0], dir[1] + 0.06, dir[2] - 0.08], 0.11, 0.018, { k: 0.03, ...hb }));
      }
      return { before: [cap(1.0), face()], after: [...bangs(4, 1.0, { sweep: 0.2, r1: 0.014, tipE: 0.1 }), ...spikes, ...sideLocks(-0.1, 0.07), ...nape(4, -0.3)] };
    }
    case 'ponytail':
      // Combed back to a tie high on the back of the head; the tail is four locks that leave the tie
      // together, part a little and end in points — hair, not one smooth lobe.
      return {
        before: [cap(1.0), face()],
        after: [
          ...bangs(4, 0.9, { sweep: 0.12 }), ...sideLocks(-0.2, 0.075), ...crown(7, 0.55, 1.25).map((p) => ({ ...p, b: [p.b[0] * 0.25, 1.46, -0.42] })),
          E([0, 1.45, -0.44], [0.075, 0.07, 0.06], { k: 0.03, ...hb }),
          tie([0, 1.45, -0.5], [0.3, 0, 0], 0.062),
          ...[[-0.05, 0.02, 1.03, -0.66, 0.06], [0.05, -0.0, 1.06, -0.7, 0.058], [0.0, 0.06, 1.16, -0.72, 0.052], [-0.02, -0.07, 1.12, -0.6, 0.05]].flatMap(([x0, x1, y1, z1, r]) => [
            T([x0 * 0.6, 1.44, -0.53], [x0 + x1 * 0.4, 1.32, -0.66 + (z1 + 0.66) * 0.3], r, r * 0.95, { k: 0.012, ...hb }),
            T([x0 + x1 * 0.4, 1.32, -0.66 + (z1 + 0.66) * 0.3], [x0 + x1, y1, z1], r * 0.95, 0.016, { k: 0.012, ...hb })
          ])
        ]
      };
    case 'bob':
      return {
        before: [E([cx, cy - 0.02, cz - 0.03], [rx * 1.1, ry * 1.05, rz * 1.12], { k: 0.04, ...hb }), face(1.16, 0.38)],
        after: [
          ...bangs(6, 0.95, { sweep: 0, tipE: 0.16, r1: 0.04, len: 0 }), part(0.12),
          // The ends curl in under the jaw.
          ...both(E([-0.36, 0.9, 0.12], [0.11, 0.08, 0.14], { k: 0.05, ...hb, rot: [0, 0, 0.5] })),
          ...[-0.36, -0.12, 0.12, 0.36].map((x) => E([x, 0.86, -0.18 - (0.4 - Math.abs(x)) * 0.25], [0.12, 0.07, 0.12], { k: 0.05, ...hb }))
        ]
      };
    case 'curly': {
      const curls = [];
      for (let ring = 0; ring < 4; ring++) {
        const n = 10 - ring * 2, y = 1.28 + ring * 0.1, rr = 0.44 - ring * 0.1;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + ring * 0.4;
          if (ring === 0 && Math.cos(a) > 0.55) continue; // the face
          curls.push(S([Math.sin(a) * rr, y, Math.cos(a) * rr * 0.92 - 0.04], 0.13 - ring * 0.015 + ((i * 7 + ring) % 3) * 0.01, { k: 0.025, ...hb }));
        }
      }
      const front = [-0.22, -0.08, 0.07, 0.21].map((x, i) => S([x, 1.36 - (i % 2) * 0.03, 0.33 - Math.abs(x) * 0.25], 0.075, { k: 0.02, ...hb }));
      return { before: [cap(0.96), face(1.22)], after: [...curls, ...front, ...nape(5, -0.3, 0.08).map((p) => ({ ...p, r: [0.08, 0.06] }))] };
    }
    case 'pigtails':
      return {
        before: [cap(1.0), face()],
        after: [
          ...bangs(4, 0.9, { sweep: -0.05 }), part(0.0), ...sideLocks(-0.1, 0.06),
          ...both(
            S([-0.46, 1.34, -0.1], 0.08, { k: 0.04, ...hb }),
            tie([-0.5, 1.33, -0.12], [0, 0, 1.2], 0.065),
            T([-0.54, 1.33, -0.13], [-0.62, 1.12, -0.12], 0.1, 0.06, { k: 0.03, ...hb }),
            T([-0.62, 1.12, -0.12], [-0.58, 0.92, -0.1], 0.065, 0.025, { k: 0.03, ...hb }),
            T([-0.56, 1.3, -0.08], [-0.66, 1.05, -0.04], 0.05, 0.018, { k: 0.02, ...hb })
          )
        ]
      };
    default: // short
      return { before: [cap(1.0), face()], after: [...bangs(5, 1.0), part(0.1), ...crown(7, -0.05), ...nape(5), ...sideLocks(-0.18)] };
  }
}

/* ---------------------------------------------------------------- the recipe */

/**
 * The sculpting recipe for a person: { slots, bones, parts, paint, face, plan }.
 * `face` says where the eyes, brows and mouth go (face.js).
 */
export function personRecipe(d) {
  const P = bodyPlan(d.build);
  const { bx, bz, sx, lx, hipY, shoulderY, hand } = P;
  const H = P.head;
  const J = P.joints;
  const bones = [
    ['torso', null, ...J.torso],
    ['head', 'torso', ...J.head],
    ['armNeg', 'torso', ...J.armNeg],
    ['armPos', 'torso', ...J.armPos],
    ['legNeg', null, ...J.legNeg],
    ['legPos', null, ...J.legPos]
  ];
  const hair = hairParts(d.hair, H, d);
  const parts = [];
  const paint = [];
  const tb = { bone: 'torso' };
  // Where the front of the body is at (x, y) (its bean), for things laid on it.
  const front = (x, y) => bz * Math.sqrt(Math.max(0, 1 - (x / bx) ** 2 - ((y - 0.5) / 0.27) ** 2));
  const metal = { sheen: 0.9, fab: null };
  // Class headwear sculpted round the head (carved free at the face), before the head itself.
  if (d.headwear === 'helm') {
    parts.push(
      E([0, 1.28, -0.02], [0.52, 0.36, 0.46], { k: 0.03, bone: 'head', col: STEEL, ...metal }),
      E([0, 1.05, 0.36], [0.4, 0.27, 0.3], { sub: true, k: 0.04 }),
      // A brow band, a nose guard, a ridge over the top; rivets round the band.
      E([0, 1.235, -0.02], [0.545, 0.05, 0.485], { k: 0.012, bone: 'head', col: 'trim', sheen: 0.7, fab: null }),
      T([0, 1.42, 0.43], [0, 1.16, 0.46], 0.045, 0.03, { k: 0.02, bone: 'head', col: STEEL, ...metal }),
      E([0, 1.6, -0.04], [0.06, 0.05, 0.32], { k: 0.04, bone: 'head', col: 'trim', sheen: 0.6, fab: null }),
      ...[0.55, 1.0, 1.45, 1.9, 2.35, 2.8].flatMap((t) => both(S([-Math.sin(t) * 0.55, 1.235, Math.cos(t) * 0.49 - 0.02], 0.022, { k: 0.006, bone: 'head', col: '#e8d8a8', ...metal })))
    );
  } else if (d.headwear === 'cowl' || d.headwear === 'hood') {
    const tall = d.headwear === 'cowl';
    parts.push(
      E([0, 1.19, -0.05], [0.54, tall ? 0.47 : 0.44, 0.47], { k: 0.04, bone: 'head', col: 'cloth' }),
      E([0, 1.08, 0.34], [0.37, 0.31, 0.26], { sub: true, k: 0.05 }),
      // The hood's rim, turned back round the face, stitched.
      E([0, 1.1, 0.31], [0.43, 0.38, 0.11], { k: 0.02, bone: 'head', col: tall ? 'trim' : 'cloth', tone: tall ? 1 : 1.1, fab: { weave: 0.6, stitch: 0.7 } }),
      E([0, 1.08, 0.36], [0.35, 0.3, 0.2], { sub: true, k: 0.03 }),
      T([0, tall ? 1.5 : 1.44, -0.22], tall ? [0, 1.78, -0.5] : [0, 1.5, -0.52], tall ? 0.16 : 0.13, 0.025, { k: 0.06, bone: 'head', col: 'cloth' })
    );
    paint.push(E([0, 1.42, -0.1], [0.02, 0.4, 0.5], { fab: 'stitch', soft: 0.01 }));
    if (tall) parts.push(E([0, 0.79, 0.24], [0.05, 0.05, 0.03], { k: 0.01, bone: 'torso', col: '#9ad8ff', sheen: 1, glow: 0.4, fab: null }));
  }
  if (d.headwear === 'brim') {
    parts.push(
      E([0, 1.56, -0.03], [0.37, 0.17, 0.34], { k: 0.03, bone: 'head', col: d.hat, fab: 'weave' }),
      D([0, 1.47, 0], 0.64, 0.025, { k: 0.04, bone: 'head', col: d.hat, tone: 1.15, rot: [Math.PI / 2, 0, 0], fab: 'weave' }),
      // A band and a feather.
      E([0, 1.5, -0.03], [0.395, 0.045, 0.365], { k: 0.01, bone: 'head', col: 'trim', fab: null }),
      T([0.33, 1.52, -0.05], [0.5, 1.8, -0.24], 0.04, 0.012, { k: 0.015, bone: 'head', col: '#e8e0d0', fab: 'strands' })
    );
  }
  parts.push(...hair.before);
  // The head: a big round dome with soft cheeks, ears with a hollow in them, and a small soft nose.
  parts.push(
    E(H.c, H.r, { k: 0.06, bone: 'head', col: 'skin' }),
    E([0, 1.03, 0.1], [0.38, 0.22, 0.29], { k: 0.12, bone: 'head', col: 'skin' }),
    ...both(
      E([-0.465, 1.08, 0.02], [0.06, 0.092, 0.075], { k: 0.03, bone: 'head', col: 'skin', rot: [0, -0.35, 0.12] }),
      E([-0.51, 1.075, 0.035], [0.022, 0.052, 0.04], { sub: true, k: 0.012, rot: [0, -0.35, 0.12] })
    ),
    E([0, 1.045, 0.398], [0.04, 0.03, 0.03], { k: 0.03, bone: 'head', col: 'skin', tone: 0.98 })
  );
  parts.push(...hair.after);
  // Beards: clumps of hair under the chin and along the jaw (an elder's long and full), moustaches that curl.
  const hairy = { bone: 'head', col: 'hair', tone: 0.92, fab: 'strands' };
  if (d.beard === 'beard') {
    const long = d.elder ? 0.17 : 0;
    parts.push(
      E([0, 0.93, 0.2], [0.34, 0.2, 0.22], { k: 0.04, ...hairy }),
      ...[-0.22, -0.11, 0, 0.11, 0.22].map((x, i) => T([x, 0.92, 0.27 - Math.abs(x) * 0.3], [x * 1.1, 0.78 - long - (i === 2 ? 0.05 : 0) + Math.abs(x) * 0.25, 0.3 - Math.abs(x) * 0.3], 0.085, 0.025, { k: 0.025, ...hairy })),
      ...both(T([-0.04, 1.0, 0.39], [-0.2, 0.96, 0.33], 0.04, 0.025, { k: 0.015, ...hairy, tone: 0.95 }))
    );
    // A mouth's gap in the beard.
    parts.push(E([0, 0.955, 0.37], [0.09, 0.035, 0.06], { sub: true, k: 0.02 }));
  }
  if (d.beard === 'moustache') parts.push(...both(T([-0.03, 1.0, 0.395], [-0.15, 0.97, 0.35], 0.042, 0.022, { k: 0.015, ...hairy }), S([-0.17, 0.985, 0.34], 0.025, { k: 0.02, ...hairy })));
  if (d.beard === 'stubble') paint.push(E([0, 0.92, 0.25], [0.34, 0.12, 0.2], { col: 'skin', tone: 0.82, soft: 0.03 }));
  // Blush, and a soft shine on the nose.
  paint.push(...both(E([-0.27, 1.01, 0.32], [0.09, 0.055, 0.1], { col: d.sex === 'f' ? '#f08888' : '#e8907a', soft: d.sex === 'f' ? 0.022 : 0.03 })));
  paint.push(S([0.012, 1.055, 0.43], 0.014, { tone: 1.12, soft: 0.01 }));
  // A shine round the hair (the toy's "halo").
  if (d.hair !== 'bald' && d.hair !== 'under') paint.push(E([0, 1.43, -0.03], [0.53, 0.032, 0.48], { tone: 1.16, sheen: 0.35, soft: 0.02 }));
  // The body: a bean in the outer cloth, with a raised tunic panel down the front, a collar, seams.
  parts.push(
    E([0, 0.5, 0], [bx, 0.27, bz], { k: 0.08, ...tb, col: 'cloth' }),
    E([0, 0.34, 0], [bx * 0.96, 0.13, bz * 0.95], { k: 0.08, ...tb, col: 'cloth' })
  );
  const robeish = d.outfit === 'robe' || d.outfit === 'dress';
  if (!robeish && !d.armor) {
    // The tunic: a panel laid over the coat, with a stitched placket and buttons.
    parts.push(E([0, 0.5, bz * 0.6], [bx * 0.6, 0.235, bz * 0.47], { k: 0.025, ...tb, col: 'tunic' }));
    paint.push(E([0, 0.52, front(0, 0.52) + 0.012], [0.012, 0.2, 0.04], { fab: 'stitch', soft: 0.006 }));
    for (const y of [0.6, 0.48]) parts.push(S([0, y, front(0, y) + 0.015], 0.019, { k: 0.006, ...tb, col: 'trim', sheen: 0.5, fab: null }));
  }
  if (robeish) {
    // A robe's or dress's front: a lighter panel down the middle, edged with stitches.
    paint.push(E([0, 0.52, bz * 0.85], [bx * 0.38, 0.26, 0.14], { col: 'tunic', soft: 0.006 }));
    paint.push(...both(E([-bx * 0.38, 0.52, bz * 0.85], [0.012, 0.25, 0.14], { fab: 'stitch', soft: 0.006 })));
  }
  // The collar: a band round the neck and two flaps over the chest.
  parts.push(
    E([0, 0.75, 0.0], [0.215, 0.045, 0.185], { k: 0.02, ...tb, col: 'trim' }),
    ...both(E([-0.085, 0.712, front(0.085, 0.712) + 0.01], [0.09, 0.055, 0.022], { k: 0.012, ...tb, col: 'trim', rot: [-0.55, 0, 0.6] }))
  );
  // Side seams.
  paint.push(...both(E([-bx, 0.5, 0], [0.015, 0.26, 0.06], { fab: 'stitch', soft: 0.008 })));
  // A belt with a buckle (a robe has a sash, a dress a ribbon).
  const beltY = 0.36;
  if (!robeish) {
    parts.push(
      E([0, beltY, 0], [bx * 0.96 + 0.025, 0.036, bz * 0.95 + 0.025], { k: 0.012, ...tb, col: BELT, fab: 'grain' }),
      B([0, beltY, bz * 0.95 + 0.03], [0.052, 0.044, 0.016], 0.012, { k: 0.006, ...tb, col: GOLD, sheen: 0.85, fab: null }),
      B([0, beltY, bz * 0.95 + 0.05], [0.028, 0.022, 0.03], 0.006, { sub: true, k: 0.004 }),
      C([0.0, beltY, bz * 0.95 + 0.036], [0.02, beltY, bz * 0.95 + 0.036], 0.008, { k: 0.002, ...tb, col: GOLD, sheen: 0.85 }),
      // A pouch on the belt (the off side).
      B([bx * 0.7, beltY - 0.06, bz * 0.62], [0.07, 0.065, 0.04], 0.03, { k: 0.015, ...tb, col: POUCH, rot: [0, 0.75, 0], fab: 'grain' }),
      B([bx * 0.71, beltY - 0.02, bz * 0.64], [0.072, 0.03, 0.044], 0.02, { k: 0.008, ...tb, col: POUCH, tone: 0.85, rot: [0, 0.75, 0], fab: 'grain' }),
      S([bx * 0.73 + 0.02, beltY - 0.04, bz * 0.62 + 0.03], 0.012, { k: 0.004, ...tb, col: GOLD, sheen: 0.8 })
    );
    // The coat's skirt below the belt, with a stitched hem.
    parts.push(E([0, 0.285, 0], [bx * 1.05, 0.085, bz * 1.1], { k: 0.04, ...tb, col: 'cloth' }));
    paint.push(E([0, 0.218, 0], [bx * 1.25, 0.012, bz * 1.3], { fab: 'stitch', soft: 0.008 }), E([0, 0.205, 0], [bx * 1.25, 0.018, bz * 1.3], { tone: 0.82, soft: 0.01 }));
  }
  if (d.outfit === 'apron') {
    // An apron over the front, down past the knees: a bib, a pocket with stitches, ties at the back.
    const ap = d.apron;
    parts.push(
      E([0, 0.47, bz * 0.62], [bx * 0.68, 0.24, bz * 0.48], { k: 0.02, ...tb, col: ap, fab: 'weave' }),
      B([0, 0.2, front(0, 0.34) + 0.01], [bx * 0.6, 0.11, 0.016], 0.015, { k: 0.02, ...tb, col: ap, rot: [0.12, 0, 0], fab: 'weave' }),
      B([0, 0.26, front(0, 0.34) + 0.03], [0.09, 0.055, 0.012], 0.01, { k: 0.006, ...tb, col: ap, tone: 0.9, rot: [0.12, 0, 0], fab: { weave: 1, stitch: 0.5 } }),
      ...both(C([-bx * 0.5, 0.69, front(bx * 0.5, 0.69)], [-0.13, 0.78, 0.05], 0.014, { k: 0.008, ...tb, col: ap }), E([-0.06, beltY + 0.01, -bz - 0.03], [0.055, 0.03, 0.02], { k: 0.01, ...tb, col: ap, rot: [0, 0, 0.5] }))
    );
  }
  if (d.outfit === 'robe') {
    parts.push(T([0, 0.42, 0], [0, 0.3, 0], bx * 0.9, bx * 1.2, { k: 0.06, ...tb, col: 'cloth' }));
    // Folds down the skirt, a sash with a knot and tails.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2, r = bx * 1.08;
      parts.push(C([Math.sin(a) * r * 0.82, 0.32, Math.cos(a) * r * 0.82], [Math.sin(a) * r * 1.02, 0.06, Math.cos(a) * r * 1.02], 0.03, { k: 0.04, ...tb, col: 'cloth' }));
    }
    paint.push(E([0, 0.1, 0], [bx * 1.5, 0.05, bx * 1.5], { col: 'trim', soft: 0.006 }), E([0, 0.155, 0], [bx * 1.5, 0.008, bx * 1.5], { fab: 'stitch', soft: 0.006 }), E([0, 0.25, bz + 0.05], [0.07, 0.16, 0.1], { col: 'tunic', soft: 0.006 }));
    parts.push(
      E([0, 0.43, 0], [bx * 0.98 + 0.02, 0.04, bz + 0.02], { k: 0.015, ...tb, col: 'trim' }),
      S([0.09, 0.43, bz + 0.03], 0.04, { k: 0.01, ...tb, col: 'trim' }),
      T([0.09, 0.41, bz + 0.04], [0.12, 0.26, bz + 0.07], 0.03, 0.02, { k: 0.01, ...tb, col: 'trim' }),
      T([0.08, 0.41, bz + 0.04], [0.04, 0.28, bz + 0.07], 0.028, 0.018, { k: 0.01, ...tb, col: 'trim' })
    );
  } else if (d.outfit === 'dress') {
    parts.push(T([0, 0.42, 0], [0, 0.33, 0], bx * 0.9, bx * 1.12, { k: 0.06, ...tb, col: 'tunic' }));
    // A frilled hem, and a ribbon at the waist.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      parts.push(S([Math.sin(a) * bx * 1.12, 0.2, Math.cos(a) * bx * 1.12], 0.05, { k: 0.03, ...tb, col: 'trim' }));
    }
    parts.push(E([0, 0.43, 0], [bx * 0.98 + 0.02, 0.035, bz + 0.02], { k: 0.012, ...tb, col: 'trim' }), ...both(E([-0.07, 0.44, -bz - 0.04], [0.06, 0.04, 0.025], { k: 0.01, ...tb, col: 'trim', rot: [0, 0, 0.5] })));
  }
  // Arms: a puffed shoulder, a sleeve angled out a little with a stitched seam at the shoulder and a cuff
  // at the wrist; mitten hands (skin or gloves) with a thumb.
  const fist = [sx + hand[0], shoulderY + hand[1], hand[2]];
  const armTilt = -0.51;
  const wide = d.outfit === 'robe';
  parts.push(
    ...both(
      S([-(sx - 0.03), shoulderY - 0.01, 0], d.outfit === 'dress' ? 0.12 : 0.1, { k: 0.03, bone: 'armNeg', col: 'cloth' }),
      T([-(sx - 0.04), shoulderY - 0.02, 0], [-(fist[0] - 0.01), fist[1] + 0.07, 0.02], 0.085, wide ? 0.095 : 0.07, { k: 0.035, bone: 'armNeg', col: 'cloth' }),
      E([-(fist[0] - 0.018), fist[1] + 0.09, 0.02], wide ? [0.125, 0.04, 0.125] : [0.096, 0.032, 0.096], { k: 0.012, bone: 'armNeg', col: 'trim', rot: [0, 0, armTilt] }),
      E([-fist[0], fist[1], fist[2]], [0.085, 0.09, 0.085], { k: 0.03, bone: 'armNeg', col: 'hands', fab: null }),
      E([-(fist[0] - 0.06), fist[1] + 0.02, fist[2] + 0.055], [0.034, 0.052, 0.034], { k: 0.018, bone: 'armNeg', col: 'hands', rot: [0.5, 0, 0.7], fab: null })
    )
  );
  paint.push(...both(E([-(sx + 0.005), shoulderY - 0.04, 0], [0.11, 0.014, 0.11], { fab: 'stitch', rot: [0, 0, armTilt], soft: 0.01 })));
  // Legs and boots: a folded cuff at the top, a sole with a lip, a toe cap.
  parts.push(
    ...both(
      C([-lx, hipY - 0.01, 0], [-lx, 0.11, 0.01], 0.085, { k: 0.03, bone: 'legNeg', col: 'legs' }),
      E([-lx, 0.068, 0.045], [0.1, 0.068, 0.14], { k: 0.04, bone: 'legNeg', col: 'shoes' }),
      E([-lx, 0.135, 0.005], [0.103, 0.034, 0.103], { k: 0.012, bone: 'legNeg', col: 'shoes', tone: 1.12 }),
      E([-lx, 0.022, 0.048], [0.108, 0.024, 0.152], { k: 0.008, bone: 'legNeg', col: 'shoes', tone: 0.55, fab: null })
    )
  );
  paint.push(...both(E([-lx, 0.09, 0.17], [0.07, 0.05, 0.04], { tone: 1.12, sheen: 0.3, soft: 0.02 })));
  // Armour: a breastplate with rivets and plate lines over heavy armour, a mail shirt's edge and a leather
  // guard over medium.
  if (d.armor === 'heavy') {
    parts.push(
      E([0, 0.52, bz * 0.42], [bx * 0.9, 0.24, bz * 0.68], { k: 0.02, ...tb, col: 'cloth', sheen: 0.85, fab: null }),
      ...[0.6, 0.47].flatMap((y) => both(S([-bx * 0.55, y, front(bx * 0.55, y) + 0.035], 0.016, { k: 0.004, ...tb, col: GOLD, sheen: 0.9 })))
    );
    paint.push(E([0, 0.44, 0.28], [bx * 0.95, 0.008, 0.2], { tone: 0.6, soft: 0.006 }), E([0, 0.56, 0.3], [0.01, 0.2, 0.2], { tone: 1.2, sheen: 1, soft: 0.006 }));
  } else if (d.armor === 'medium') {
    parts.push(E([0, 0.5, bz * 0.6], [bx * 0.62, 0.235, bz * 0.47], { k: 0.025, ...tb, col: 'tunic', sheen: 0.55, fab: { weave: 1, grain: 0.4 } }));
    parts.push(...both(E([-bx * 0.75, 0.68, 0.0], [0.13, 0.05, 0.16], { k: 0.015, ...tb, col: BELT, rot: [0, 0, 0.45], fab: { grain: 1, stitch: 0.6 } })));
  }
  // Class marks and heavy armour: pauldrons in layered plates, with rivets.
  const pauldron = (side, col) => [
    E([-(sx + 0.01), shoulderY + 0.05, 0], [0.17, 0.1, 0.18], { k: 0.025, bone: side, col, sheen: 0.9, rot: [0, 0, 0.35], fab: null }),
    E([-(sx + 0.05), shoulderY - 0.005, 0], [0.155, 0.075, 0.17], { k: 0.015, bone: side, col, sheen: 0.9, tone: 0.92, rot: [0, 0, 0.45], fab: null }),
    ...[-0.08, 0, 0.08].map((z) => S([-(sx + 0.03), shoulderY + 0.135, z], 0.017, { k: 0.004, bone: side, col: GOLD, sheen: 0.9 }))
  ];
  if (d.cls === 'blade' && !d.pauldrons) {
    parts.push(...pauldron('armPos', STEEL).map((p) => ({ ...p, ...(p.c ? { c: [-p.c[0], p.c[1], p.c[2]] } : {}), rot: p.rot ? [p.rot[0], -p.rot[1], -p.rot[2]] : undefined })));
    // Its strap across the chest.
    parts.push(C([sx * 0.8, 0.72, 0.05], [-bx * 0.7, 0.4, front(bx * 0.7, 0.4) - 0.02], 0.02, { k: 0.01, ...tb, col: BELT, fab: 'grain' }));
  }
  if (d.pauldrons) parts.push(...pauldron('armNeg', 'cloth'), ...pauldron('armPos', 'cloth').map((p) => ({ ...p, ...(p.c ? { c: [-p.c[0], p.c[1], p.c[2]] } : {}), rot: p.rot ? [p.rot[0], -p.rot[1], -p.rot[2]] : undefined })));
  if (d.cls === 'ranger') {
    // A short mantle over the shoulders, its edge cut into leaves.
    parts.push(E([0, 0.73, -0.02], [bx + 0.1, 0.085, bz + 0.09], { k: 0.04, ...tb, col: 'cloth', tone: 0.82 }));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const x = Math.sin(a) * (bx + 0.07), z = Math.cos(a) * (bz + 0.065);
      parts.push(T([x, 0.7, z], [x * 1.1, 0.6, z * 1.1], 0.05, 0.012, { k: 0.02, ...tb, col: 'cloth', tone: 0.82 }));
    }
  }
  if (d.cls === 'seer' && d.outfit === 'robe') paint.push(E([0, 0.52, bz * 0.9], [0.05, 0.26, 0.1], { col: 'trim', soft: 0.005 }));
  if (d.pack) {
    parts.push(
      E([0, 0.56, -(bz + 0.1)], [0.24, 0.25, 0.14], { k: 0.04, ...tb, col: d.pack, fab: 'weave' }),
      E([0, 0.68, -(bz + 0.17)], [0.22, 0.1, 0.1], { k: 0.02, ...tb, col: d.pack, tone: 0.85, fab: { weave: 1, stitch: 0.5 } }),
      C([-0.2, 0.8, -(bz + 0.1)], [0.2, 0.8, -(bz + 0.1)], 0.065, { k: 0.02, ...tb, col: '#a8845a', fab: 'weave' }),
      ...both(C([-0.13, 0.76, 0.0], [-0.15, 0.42, front(0.15, 0.42) - 0.01], 0.022, { k: 0.01, ...tb, col: BELT, fab: 'grain' })),
      S([0, 0.6, -(bz + 0.24)], 0.025, { k: 0.006, ...tb, col: GOLD, sheen: 0.8 })
    );
  }
  // A villager's extras.
  for (const [kind, col] of d.wear ?? []) {
    if (kind === 'scarf') {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        parts.push(S([Math.sin(a) * 0.2, 0.77 + Math.cos(a * 2) * 0.008, Math.cos(a) * 0.17 + 0.01], 0.07, { k: 0.04, ...tb, col, fab: 'weave' }));
      }
      parts.push(T([0.12, 0.74, 0.18], [0.17, 0.5, front(0.17, 0.5) + 0.04], 0.06, 0.05, { k: 0.02, ...tb, col, fab: 'weave' }));
      paint.push(E([0.17, 0.53, front(0.17, 0.53) + 0.04], [0.08, 0.012, 0.08], { tone: 0.75, soft: 0.01 }));
    } else if (kind === 'kerchief') {
      parts.push(E([0, 1.3, -0.05], [0.53, 0.38, 0.47], { k: 0.03, bone: 'head', col, fab: 'weave' }), E([0, 1.06, 0.34], [0.46, 0.3, 0.3], { sub: true, k: 0.03 }));
      parts.push(...both(T([-0.06, 1.22, -0.47], [-0.16, 1.1, -0.56], 0.05, 0.03, { k: 0.015, bone: 'head', col, fab: 'weave' })), S([0, 1.24, -0.48], 0.05, { k: 0.015, bone: 'head', col }));
    } else if (kind === 'band') {
      parts.push(E([0, 1.33, -0.03], [0.535, 0.055, 0.465], { k: 0.015, bone: 'head', col, fab: 'weave' }), E([0.06, 1.33, -0.48], [0.05, 0.04, 0.035], { k: 0.01, bone: 'head', col }));
    } else if (kind === 'flower') {
      const c0 = [0.38, 1.38, 0.18];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        parts.push(S([c0[0] + 0.02, c0[1] + Math.sin(a) * 0.045, c0[2] + Math.cos(a) * 0.045], 0.035, { k: 0.01, bone: 'head', col, fab: null }));
      }
      parts.push(S([c0[0] + 0.045, c0[1], c0[2]], 0.025, { k: 0.008, bone: 'head', col: '#f8d850', fab: null }));
    }
  }
  return {
    slots: PERSON_SLOTS,
    bones,
    parts,
    paint,
    blend: 0.007,
    fabSlots: { cloth: 'weave', tunic: 'weave', trim: 'weave', legs: 'weave', hair: 'strands', shoes: 'grain' },
    plan: P,
    face: personFace(d)
  };
}

/** Where a person's eyes, brows and mouth go, and how they look (face.js). */
export function personFace(d) {
  const eyeR = d.eyes === 'dot' ? 0.052 : d.eyes === 'narrow' ? 0.068 : 0.078;
  return { eyeX: 0.165, eyeY: 1.09, eyeR, squint: d.eyes === 'narrow' ? 0.72 : 1, mouthY: 0.955, browY: 1.205, hostile: d.hostile, eyeGlow: d.eyeGlow, lashes: d.sex === 'f', fangs: false };
}

/** The colours of a person (slot order) from the colours a look's sprite was drawn with. */
export function personPalette(c) {
  return [c.skin, c.hair, c.cloth, c.tunic, c.trim, c.legs, c.shoes, c.hands ?? c.skin];
}
