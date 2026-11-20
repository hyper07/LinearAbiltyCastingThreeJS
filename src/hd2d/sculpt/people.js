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
 * body, stubby arms with mitten hands, short legs in boots. Units: metres,
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
const BELT = '#5a3a26';
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

/**
 * A person's description from a Lanternwood look ({ hair, eyes, beard, build,
 * sex, outfit }) and what they wear (an items.js gearLook, or an NPC's
 * { head, chest … }). `cls` gives a hero their class's silhouette; `hostile`
 * a monster's angry glowing eyes.
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
  return {
    hair,
    build: look.build === 'slim' ? 'slim' : 'broad',
    sex: look.sex === 'f' ? 'f' : 'm',
    beard: ['beard', 'stubble', 'moustache'].includes(look.beard) && headwear !== 'hidden' ? look.beard : null,
    eyes: ['wide', 'narrow', 'dot'].includes(look.eyes) ? look.eyes : 'wide',
    outfit: ['tunic', 'robe', 'dress', 'apron'].includes(outfit) ? outfit : 'tunic',
    apron: outfit === 'apron' ? look.apron ?? '#7a5a3a' : null,
    cls: ['blade', 'warden', 'seer', 'ranger'].includes(cls) ? cls : null,
    headwear,
    pauldrons: gear?.chest?.weight === 'heavy',
    hostile: Boolean(hostile),
    eyeGlow,
    hat: headwear === 'brim' ? extra?.hat ?? '#8a5a3a' : null,
    pack: extra?.pack ?? null
  };
}

/** The name of a description's mesh: the same shape, the same geometry. */
export const shapeKey = (d) => ['p', d.hair, d.build, d.sex, d.beard ?? '-', d.outfit, d.apron ?? '-', d.cls ?? '-', d.headwear, d.pauldrons ? 'P' : '-', d.hat ?? '-', d.pack ?? '-'].join('|');
/** The name of a description's face (its eyes and temper differ on the same mesh). */
export const faceKey = (d) => `${shapeKey(d)}|${d.eyes}|${d.hostile ? d.eyeGlow ?? 'H' : '-'}|${d.sex}`;

/* ---------------------------------------------------------------- the recipe */

/** Hair over the crown (the face carved free first), per cut. All on the head bone. */
function hairParts(cut, H) {
  const [cx, cy, cz] = H.c, [rx, ry, rz] = H.r;
  const hb = { bone: 'head', col: 'hair' };
  const cap = (grow = 1, drop = 0) => E([cx, cy + 0.05 - drop, cz - 0.025], [rx * 1.06 * grow, ry * 0.97 * grow, rz * 1.08 * grow], { k: 0.04, ...hb });
  // The face, carved out of the cap: everything in front below the hairline.
  const face = (top = 1.2, wide = 0.42) => E([cx, top - 0.3, cz + 0.32], [wide, 0.34, 0.34], { sub: true, k: 0.025 });
  const fringe = (n = 3, y = 1.34, spread = 0.26, r = 0.1) => Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    const x = t * spread * 2;
    return E([x, y - Math.abs(t) * 0.06, cz + rz * 0.86 - Math.abs(t) * 0.1], [r * 1.25, r * 0.8, r * 0.7], { k: 0.04, rot: [0.5, 0, -t * 0.8], ...hb });
  });
  switch (cut) {
    case 'bald':
      return { before: [], after: [] };
    case 'under': // under a hood or a helm: just a fringe
      return { before: [], after: fringe(3, 1.33, 0.2, 0.085) };
    case 'long':
      return {
        before: [cap(1.02), face(1.22, 0.4)],
        after: [...fringe(4, 1.34, 0.28, 0.09), ...both(E([-0.43, 0.98, -0.06], [0.13, 0.34, 0.24], { k: 0.06, ...hb })), E([0, 1.0, -0.24], [0.42, 0.4, 0.2], { k: 0.08, ...hb })]
      };
    case 'bun':
      return { before: [cap(0.99), face()], after: [...fringe(3, 1.35, 0.22, 0.085), S([0, 1.62, -0.16], 0.16, { k: 0.05, ...hb }), D([0, 1.52, -0.12], 0.13, 0.025, { k: 0.02, rot: [1.2, 0, 0], bone: 'head', col: 'trim' })] };
    case 'spiky': {
      const spikes = [];
      for (let i = 0; i < 7; i++) {
        const a = -1.1 + (i / 6) * 2.2;
        const base = [Math.sin(a) * 0.3, 1.42 + Math.cos(a) * 0.08, -0.06 - Math.abs(a) * 0.05];
        spikes.push(T(base, [base[0] * 1.9, base[1] + 0.26 - Math.abs(a) * 0.08, base[2] - 0.12], 0.12, 0.02, { k: 0.04, ...hb }));
      }
      return { before: [cap(1.0), face()], after: [...fringe(4, 1.36, 0.28, 0.08), ...spikes] };
    }
    case 'ponytail':
      return {
        before: [cap(1.0), face()],
        after: [...fringe(3, 1.34, 0.24, 0.09), S([0, 1.4, -0.43], 0.1, { k: 0.04, ...hb }), T([0, 1.36, -0.5], [0.02, 1.06, -0.56], 0.1, 0.045, { k: 0.04, ...hb }), S([0, 1.38, -0.47], 0.06, { k: 0.015, bone: 'head', col: 'trim' })]
      };
    case 'bob':
      return {
        before: [E([cx, cy - 0.02, cz - 0.03], [rx * 1.1, ry * 1.05, rz * 1.12], { k: 0.04, ...hb }), face(1.16, 0.38)],
        after: [E([0, 1.36, cz + rz * 0.78], [0.34, 0.09, 0.08], { k: 0.04, rot: [0.45, 0, 0], ...hb })]
      };
    case 'curly': {
      const curls = [];
      for (let ring = 0; ring < 3; ring++) {
        const n = 8 - ring * 2, y = 1.32 + ring * 0.13, rr = 0.42 - ring * 0.13;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + ring * 0.4;
          curls.push(S([Math.sin(a) * rr, y, Math.cos(a) * rr * 0.92 - 0.04], 0.15 - ring * 0.02, { k: 0.035, ...hb }));
        }
      }
      return { before: [...curls, face(1.22)], after: fringe(3, 1.34, 0.24, 0.09) };
    }
    case 'pigtails':
      return {
        before: [cap(1.0), face()],
        after: [...fringe(3, 1.35, 0.26, 0.09), ...both(E([-0.5, 1.3, -0.1], [0.15, 0.18, 0.15], { k: 0.04, ...hb }), S([-0.42, 1.36, -0.08], 0.05, { k: 0.015, bone: 'head', col: 'trim' }))]
      };
    default: // short
      return { before: [cap(1.0), face()], after: fringe(3, 1.35, 0.26, 0.095) };
  }
}

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
  const hair = hairParts(d.hair, H);
  const parts = [];
  const paint = [];
  // Class headwear sculpted round the head (carved free at the face), before the head itself.
  if (d.headwear === 'helm') {
    parts.push(
      E([0, 1.28, -0.02], [0.52, 0.36, 0.46], { k: 0.03, bone: 'head', col: STEEL, sheen: 0.9 }),
      E([0, 1.05, 0.36], [0.4, 0.27, 0.3], { sub: true, k: 0.04 }),
      T([0, 1.42, 0.43], [0, 1.18, 0.45], 0.045, 0.03, { k: 0.02, bone: 'head', col: STEEL, sheen: 0.9 }),
      E([0, 1.6, -0.04], [0.06, 0.05, 0.3], { k: 0.04, bone: 'head', col: 'trim', sheen: 0.5 })
    );
    paint.push(E([0, 1.24, 0], [0.56, 0.035, 0.5], { col: 'trim', sheen: 0.6, soft: 0.006 }));
  } else if (d.headwear === 'cowl' || d.headwear === 'hood') {
    const tall = d.headwear === 'cowl';
    parts.push(
      E([0, 1.19, -0.05], [0.54, tall ? 0.47 : 0.44, 0.47], { k: 0.04, bone: 'head', col: 'cloth' }),
      E([0, 1.08, 0.34], [0.37, 0.31, 0.26], { sub: true, k: 0.05 }),
      T([0, tall ? 1.5 : 1.44, -0.22], tall ? [0, 1.78, -0.5] : [0, 1.5, -0.52], tall ? 0.16 : 0.13, 0.025, { k: 0.06, bone: 'head', col: 'cloth' })
    );
  }
  if (d.headwear === 'brim') {
    parts.push(
      E([0, 1.56, -0.03], [0.37, 0.17, 0.34], { k: 0.03, bone: 'head', col: d.hat }),
      D([0, 1.47, 0], 0.64, 0.025, { k: 0.04, bone: 'head', col: d.hat, tone: 1.15, rot: [Math.PI / 2, 0, 0] })
    );
    paint.push(E([0, 1.5, -0.03], [0.4, 0.04, 0.37], { col: 'trim', soft: 0.006 }));
  }
  parts.push(...hair.before);
  // The head: a big round dome with soft cheeks, little ears and a button nose.
  parts.push(
    E(H.c, H.r, { k: 0.06, bone: 'head', col: 'skin' }),
    E([0, 1.03, 0.1], [0.38, 0.22, 0.29], { k: 0.12, bone: 'head', col: 'skin' }),
    ...both(S([-0.455, 1.1, 0.0], 0.075, { k: 0.04, bone: 'head', col: 'skin' })),
    S([0, 1.05, 0.405], 0.034, { k: 0.03, bone: 'head', col: 'skin', tone: 0.97 })
  );
  parts.push(...hair.after);
  if (d.beard === 'beard') parts.push(E([0, 0.93, 0.2], [0.34, 0.2, 0.22], { k: 0.04, bone: 'head', col: 'hair', tone: 0.9 }), E([0, 0.86, 0.26], [0.18, 0.12, 0.12], { k: 0.05, bone: 'head', col: 'hair', tone: 0.9 }));
  if (d.beard === 'moustache') parts.push(...both(E([-0.08, 1.0, 0.39], [0.09, 0.035, 0.04], { k: 0.02, bone: 'head', col: 'hair', rot: [0, 0, 0.25] })));
  if (d.beard === 'stubble') paint.push(E([0, 0.92, 0.25], [0.34, 0.12, 0.2], { col: 'skin', tone: 0.82, soft: 0.03 }));
  // Blush.
  paint.push(...both(E([-0.27, 1.01, 0.32], [0.085, 0.05, 0.1], { col: d.sex === 'f' ? '#f08888' : '#e8907a', soft: d.sex === 'f' ? 0.025 : 0.035 })));
  // The body: a bean in the outer cloth, a tunic down the front, a belt with a buckle, a collar.
  parts.push(
    E([0, 0.5, 0], [bx, 0.27, bz], { k: 0.08, bone: 'torso', col: 'cloth' }),
    E([0, 0.34, 0], [bx * 0.96, 0.13, bz * 0.95], { k: 0.08, bone: 'torso', col: 'cloth' })
  );
  paint.push(
    E([0, 0.52, bz * 0.85], [bx * 0.5, 0.26, 0.14], { col: 'tunic', soft: 0.006 }),
    E([0, 0.355, bz * 0.96], [0.045, 0.04, 0.05], { col: 'trim', sheen: 0.8, soft: 0.004 }),
    E([0, 0.74, 0.02], [0.24, 0.035, 0.2], { col: 'trim', soft: 0.006 })
  );
  // A belt (a robe or a dress flares out right below it, so they go without).
  if (d.outfit !== 'robe' && d.outfit !== 'dress') paint.push(E([0, 0.355, 0], [bx + 0.04, 0.034, bz + 0.04], { col: BELT, soft: 0.004 }));
  if (d.outfit === 'apron') paint.push(E([0, 0.4, bz * 0.8], [bx * 0.7, 0.2, 0.14], { col: d.apron, soft: 0.006 }), E([0, 0.355, 0], [bx + 0.045, 0.03, bz + 0.045], { col: d.apron, tone: 0.8, soft: 0.004 }));
  if (d.outfit === 'robe') {
    parts.push(T([0, 0.42, 0], [0, 0.3, 0], bx * 0.9, bx * 1.2, { k: 0.06, bone: 'torso', col: 'cloth' }));
    paint.push(E([0, 0.12, 0], [bx * 1.4, 0.04, bx * 1.4], { col: 'trim', soft: 0.006 }), E([0, 0.25, bz + 0.05], [0.07, 0.16, 0.1], { col: 'tunic', soft: 0.006 }));
  } else if (d.outfit === 'dress') {
    parts.push(T([0, 0.42, 0], [0, 0.33, 0], bx * 0.9, bx * 1.12, { k: 0.06, bone: 'torso', col: 'tunic' }));
    paint.push(E([0, 0.21, 0], [bx * 1.3, 0.035, bx * 1.3], { col: 'trim', soft: 0.006 }));
  }
  // Arms: sleeves angled out a little, mitten hands (skin or gloves) at the fists.
  const fist = [sx + hand[0], shoulderY + hand[1], hand[2]];
  parts.push(
    ...both(
      T([-(sx - 0.04), shoulderY - 0.02, 0], [-(fist[0] - 0.01), fist[1] + 0.07, 0.02], 0.085, 0.07, { k: 0.035, bone: 'armNeg', col: 'cloth' }),
      E([-fist[0], fist[1], fist[2]], [0.085, 0.09, 0.085], { k: 0.03, bone: 'armNeg', col: 'hands' })
    )
  );
  paint.push(...both(E([-(fist[0] - 0.005), fist[1] + 0.085, 0.02], [0.085, 0.025, 0.085], { col: 'trim', soft: 0.005 })));
  // Legs and boots.
  parts.push(
    ...both(
      C([-lx, hipY - 0.01, 0], [-lx, 0.11, 0.01], 0.085, { k: 0.03, bone: 'legNeg', col: 'legs' }),
      E([-lx, 0.068, 0.045], [0.1, 0.068, 0.14], { k: 0.04, bone: 'legNeg', col: 'shoes' })
    )
  );
  paint.push(...both(E([-lx, 0.02, 0.045], [0.11, 0.02, 0.15], { col: 'shoes', tone: 0.6, soft: 0.004 })));
  // Class marks and heavy armour.
  if (d.cls === 'blade' && !d.pauldrons) parts.push(E([sx + 0.01, shoulderY + 0.04, 0], [0.15, 0.09, 0.16], { k: 0.025, bone: 'armPos', col: STEEL, sheen: 0.9, rot: [0, 0, -0.35] }));
  if (d.pauldrons) parts.push(...both(E([-(sx + 0.01), shoulderY + 0.05, 0], [0.17, 0.1, 0.18], { k: 0.025, bone: 'armNeg', col: 'cloth', sheen: 0.9, rot: [0, 0, 0.35] })));
  if (d.cls === 'ranger') parts.push(E([0, 0.73, -0.02], [bx + 0.1, 0.085, bz + 0.09], { k: 0.04, bone: 'torso', col: 'cloth', tone: 0.82 }));
  if (d.cls === 'seer' && d.outfit === 'robe') paint.push(E([0, 0.52, bz * 0.9], [0.05, 0.26, 0.1], { col: 'trim', soft: 0.005 }));
  if (d.pack) parts.push(E([0, 0.56, -(bz + 0.1)], [0.24, 0.25, 0.14], { k: 0.04, bone: 'torso', col: d.pack }), E([0, 0.76, -(bz + 0.12)], [0.2, 0.06, 0.12], { k: 0.03, bone: 'torso', col: d.pack, tone: 1.15 }));
  return {
    slots: PERSON_SLOTS,
    bones,
    parts,
    paint,
    blend: 0.007,
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
