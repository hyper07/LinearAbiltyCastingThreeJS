/**
 * Every creature in AI Arcademia as a sculpting recipe (sculpt.js): smooth
 * shapes tied to bones, paint for the markings, and where the face goes.
 * All original designs, one soft-vinyl-toy house style:
 *
 *   buddies    fox cub, little robot, dragonling, puffball, bunny sprite
 *   teachers   Professor Hoot (owl), Tock (tortoise), Gizmo (raccoon)
 *   townsfolk  frog, hedgehog, mouse, duck, bear, crab, penguin, lion, yeti
 *   the sea    octopus, seal, sea turtle (and the penguin and crab)
 *   the desert fennec fox, camel calf, meerkat, jerboa, gecko, scarab beetle;
 *              its teachers Miss Lotus (hippo), Uncle Reed (ibis), Dr. Sandy (sand cat)
 *   the Moon   water bear (tardigrade), luna moth, axolotl, hamster, robot pup, moon jelly;
 *              its teachers Miss Mochi (moon rabbit), Captain Ginger (red panda), Dr. Comet (koala)
 *
 * Units: about one metre tall, feet at y = 0, facing +z.
 */

/* ---------------------------------------------------------------- helpers */

const S = (c, r, o = {}) => ({ s: 'sph', c, r, ...o });
const E = (c, r, o = {}) => ({ s: 'ell', c, r, ...o });
const C = (a, b, r, o = {}) => ({ s: 'cap', a, b, r, ...o });
const T = (a, b, ra, rb, o = {}) => ({ s: 'taper', a, b, r: [ra, rb], ...o });
const B = (c, r, round, o = {}) => ({ s: 'box', c, r, round, ...o });
const D = (c, r, th, o = {}) => ({ s: 'disc', c, r: [r, th], ...o });
const flipX = (v) => (Array.isArray(v) && v.length === 3 && typeof v[0] === 'number' ? [-v[0], v[1], v[2]] : v);
/** A shape and its mirror image (x → −x); bone names ending in L become R. */
function pair(shape) {
  const m = { ...shape };
  for (const k of ['c', 'a', 'b']) if (m[k]) m[k] = flipX(m[k]);
  if (m.rot) m.rot = [m.rot[0], -m.rot[1], -m.rot[2]];
  if (typeof m.bone === 'string' && m.bone.endsWith('L')) m.bone = `${m.bone.slice(0, -1)}R`;
  return [shape, m];
}
const both = (...shapes) => shapes.flatMap(pair);

export const CREAM = '#fff4e6';
const PINK = '#ffb3b8';
const INK = '#3a2a24';

/** The shared skeleton. Rest positions; a recipe may move some. */
function skeleton(over = {}) {
  const base = {
    root: [null, 0, 0, 0],
    hips: ['root', 0, 0.22, 0],
    chest: ['hips', 0, 0.34, 0],
    head: ['chest', 0, 0.46, 0],
    earL: ['head', -0.17, 0.88, -0.02],
    earR: ['head', 0.17, 0.88, -0.02],
    armL: ['chest', -0.17, 0.4, 0.02],
    armR: ['chest', 0.17, 0.4, 0.02],
    legL: ['hips', -0.1, 0.19, 0.02],
    legR: ['hips', 0.1, 0.19, 0.02],
    tail: ['hips', 0, 0.22, -0.18],
    tail2: ['tail', 0, 0.36, -0.36],
    wingL: ['chest', -0.1, 0.44, -0.14],
    wingR: ['chest', 0.1, 0.44, -0.14]
  };
  for (const [k, v] of Object.entries(over)) base[k] = typeof v[0] === 'string' || v[0] === null ? v : [base[k]?.[0] ?? 'root', ...v];
  return Object.entries(base).map(([name, [parent, x, y, z]]) => [name, parent, x, y, z]);
}

/** The chibi body most critters share: a bean body, stubby legs and arms. */
function chibiBody({ belly = CREAM, socks = null, arms = true, bodyR = [0.2, 0.2, 0.18], legR = 0.072 } = {}) {
  const parts = [
    E([0, 0.3, 0], bodyR, { k: 0.1, bone: 'chest' }),
    E([0, 0.24, 0.0], [bodyR[0] * 0.95, bodyR[1] * 0.75, bodyR[2] * 0.95], { k: 0.08, bone: 'hips' }),
    ...both(C([-0.1, 0.18, 0.02], [-0.11, 0.07, 0.04], legR, { k: 0.06, bone: 'legL' }), E([-0.11, 0.05, 0.06], [legR * 1.05, 0.05, legR * 1.35], { k: 0.04, bone: 'legL' }))
  ];
  if (arms) parts.push(...both(C([-0.17, 0.4, 0.02], [-0.28, 0.28, 0.06], 0.055, { k: 0.035, bone: 'armL' }), S([-0.29, 0.265, 0.065], 0.066, { k: 0.03, bone: 'armL' })));
  const paint = [];
  if (belly) paint.push(E([0, 0.28, 0.13], [0.13, 0.14, 0.1], { col: belly, soft: 0.01 }));
  if (socks) paint.push(...both(E([-0.11, 0.04, 0.07], [0.1, 0.055, 0.13], { col: socks })), ...both(S([-0.26, 0.25, 0.08], 0.05, { col: socks })));
  return { parts, paint };
}

/** A round head at `c` with radii `r` (the face looks along +z). */
const head = (c = [0, 0.68, 0], r = [0.34, 0.29, 0.3], o = {}) => E(c, r, { k: 0.12, bone: 'head', ...o });

/* ---------------------------------------------------------------- recipes */

/**
 * Each recipe: { color (default body colour), bones, parts, paint, face, hat, extras }
 *   face  { eyeX, eyeY, eyeR, mouthY, cheekX, cheekY, browUp, style: 'gloss'|'led', eyeTilt, glasses }
 *   hat   { lift, scale, wear }  how a hat sits (scales by head size); `wear`: a hat it wears unless given another
 *   wings 'dragon' | 'fairy' | null — extra skinned wing meshes
 *   gloss 0–1 (vinyl sheen), fur 0–1 (soft rim)
 */
export const SPECIES = {
  fox() {
    const b = chibiBody({ socks: '#4a2b20' });
    return {
      color: '#ff9b54', fur: 1, gloss: 0.25,
      bones: skeleton({ earL: ['head', -0.19, 0.9, -0.03], earR: ['head', 0.19, 0.9, -0.03], tail: ['hips', 0, 0.2, -0.17], tail2: ['tail', 0.08, 0.4, -0.38] }),
      parts: [
        head([0, 0.68, 0], [0.35, 0.29, 0.3]),
        ...both(E([-0.21, 0.58, 0.12], [0.16, 0.12, 0.15], { k: 0.08, bone: 'head', col: CREAM })),
        E([0, 0.6, 0.24], [0.11, 0.075, 0.1], { k: 0.08, bone: 'head', col: CREAM }),
        ...both(T([-0.18, 0.88, -0.03], [-0.29, 1.14, -0.06], 0.12, 0.022, { k: 0.07, bone: 'earL' })),
        ...b.parts,
        C([0, 0.2, -0.17], [0.06, 0.36, -0.34], 0.1, { k: 0.07, bone: 'tail' }),
        C([0.06, 0.36, -0.34], [0.12, 0.52, -0.42], 0.11, { k: 0.06, bone: 'tail2' }),
        S([0.13, 0.56, -0.43], 0.1, { k: 0.06, bone: 'tail2', col: CREAM })
      ],
      paint: [
        ...b.paint,
        ...both(S([-0.28, 1.1, -0.06], 0.075, { col: '#4a2b20' })),
        ...both(E([-0.21, 0.92, 0.04], [0.055, 0.1, 0.05], { col: PINK })),
        E([0, 0.635, 0.335], [0.04, 0.026, 0.03], { col: INK, soft: 0.004 }),
        E([0, 0.32, 0.15], [0.12, 0.15, 0.08], { col: CREAM })
      ],
      face: { eyeX: 0.13, eyeY: 0.71, eyeR: 0.072, mouthY: 0.57, cheekX: 0.22, cheekY: 0.6 },
      hat: { lift: 0 }
    };
  },
  bunny() {
    const b = chibiBody();
    return {
      color: '#c9b6ff', fur: 1, gloss: 0.2, wings: 'fairy',
      bones: skeleton({ earL: ['head', -0.11, 0.9, -0.02], earR: ['head', 0.11, 0.9, -0.02] }),
      parts: [
        head([0, 0.67, 0], [0.33, 0.29, 0.29]),
        ...both(E([-0.18, 0.58, 0.14], [0.13, 0.1, 0.12], { k: 0.08, bone: 'head', col: CREAM })),
        ...both(T([-0.11, 0.88, -0.02], [-0.17, 1.3, -0.05], 0.075, 0.065, { k: 0.06, bone: 'earL' })),
        ...b.parts,
        ...both(E([-0.11, 0.05, 0.08], [0.08, 0.05, 0.13], { k: 0.04, bone: 'legL' })),
        S([0, 0.24, -0.2], 0.085, { k: 0.04, bone: 'tail', col: '#ffffff' })
      ],
      paint: [
        ...b.paint,
        ...both(E([-0.15, 1.1, 0.03], [0.04, 0.17, 0.04], { col: PINK, rot: [0, 0, -0.14] })),
        E([0, 0.615, 0.3], [0.03, 0.022, 0.03], { col: '#ff7aa8', soft: 0.004 })
      ],
      face: { eyeX: 0.125, eyeY: 0.69, eyeR: 0.072, mouthY: 0.565, cheekX: 0.2, cheekY: 0.6 },
      hat: { lift: 0 }
    };
  },
  dragon() {
    const b = chibiBody({ belly: '#fff1c4' });
    return {
      color: '#7ee08a', gloss: 0.45, wings: 'dragon',
      bones: skeleton({ earL: ['head', -0.27, 0.74, -0.04], earR: ['head', 0.27, 0.74, -0.04], tail: ['hips', 0, 0.2, -0.16], tail2: ['tail', 0, 0.2, -0.4] }),
      parts: [
        head([0, 0.68, 0], [0.33, 0.28, 0.29]),
        E([0, 0.6, 0.2], [0.17, 0.11, 0.14], { k: 0.09, bone: 'head', col: '#fff1c4' }),
        ...both(T([-0.13, 0.9, -0.08], [-0.2, 1.1, -0.18], 0.05, 0.014, { k: 0.04, bone: 'head', col: '#fff1c4' })),
        ...both(E([-0.31, 0.74, -0.04], [0.03, 0.085, 0.07], { k: 0.04, bone: 'earL', rot: [0, 0, 0.5] })),
        ...b.parts,
        T([0, 0.2, -0.15], [0, 0.18, -0.42], 0.11, 0.06, { k: 0.07, bone: 'tail' }),
        T([0, 0.18, -0.42], [0, 0.3, -0.6], 0.06, 0.025, { k: 0.04, bone: 'tail2' }),
        E([0, 0.33, -0.63], [0.075, 0.06, 0.025], { k: 0.03, bone: 'tail2', col: 'dark', rot: [0.9, 0, 0] }),
        ...[0.86, 0.72, 0.52, 0.36].map((y, i) => T([0, y, -0.2 - i * 0.05], [0, y + 0.06, -0.27 - i * 0.05], 0.03, 0.006, { k: 0.02, bone: i < 2 ? 'head' : 'chest', col: '#fff1c4' }))
      ],
      paint: [
        ...b.paint,
        ...[0.22, 0.28, 0.34].map((y) => E([0, y, 0.18], [0.12, 0.008, 0.04], { col: '#ecd59a', soft: 0.004 })),
        ...both(S([-0.05, 0.635, 0.335], 0.018, { col: '#2f6b3a', soft: 0.004 }))
      ],
      face: { eyeX: 0.135, eyeY: 0.72, eyeR: 0.074, mouthY: 0.55, cheekX: 0.22, cheekY: 0.6 },
      hat: { lift: 0 }
    };
  },
  puff() {
    // A cloud: a ball of soft round lobes, a curl on top, tiny feet and nubby arms.
    const lobes = [];
    const ring = (n, y, rr, r, z0 = 0, ph = 0) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ph;
        lobes.push(S([Math.cos(a) * rr, y, Math.sin(a) * rr * 0.9 + z0], r, { k: 0.035, bone: 'head' }));
      }
    };
    ring(8, 0.42, 0.29, 0.15);
    ring(6, 0.64, 0.2, 0.15, 0, 0.5);
    ring(5, 0.26, 0.2, 0.13, 0, 0.3);
    lobes.push(S([0, 0.76, -0.02], 0.15, { k: 0.04, bone: 'head' }));
    return {
      color: '#ff9ed2', fur: 0.7, gloss: 0.15,
      bones: skeleton({ head: ['chest', 0, 0.3, 0], armL: ['head', -0.4, 0.4, 0.06], armR: ['head', 0.4, 0.4, 0.06], earL: ['head', 0, 0.88, 0], earR: ['head', 0.03, 0.9, 0], legL: ['hips', -0.12, 0.12, 0.02], legR: ['hips', 0.12, 0.12, 0.02] }),
      parts: [
        S([0, 0.48, 0.02], 0.33, { k: 0.05, bone: 'head' }),
        ...lobes,
        T([0, 0.86, 0], [0.05, 1.0, 0.02], 0.05, 0.03, { k: 0.04, bone: 'earL' }),
        T([0.05, 1.0, 0.02], [0.12, 0.98, 0.03], 0.03, 0.02, { k: 0.02, bone: 'earR' }),
        ...both(E([-0.12, 0.08, 0.04], [0.07, 0.06, 0.08], { k: 0.06, bone: 'legL' })),
        ...both(S([-0.43, 0.38, 0.06], 0.065, { k: 0.05, bone: 'armL' }))
      ],
      paint: [E([0, 0.22, 0.0], [0.4, 0.12, 0.4], { col: 'dark', soft: 0.08 }), E([0, 0.6, 0.25], [0.25, 0.2, 0.15], { col: 'light', soft: 0.06 })],
      face: { eyeX: 0.13, eyeY: 0.53, eyeR: 0.075, mouthY: 0.41, cheekX: 0.23, cheekY: 0.44 },
      hat: { lift: -0.02 }
    };
  },
  robot() {
    return {
      color: '#7cc6ff', gloss: 1, robot: true,
      bones: skeleton({ earL: ['head', -0.32, 0.68, 0], earR: ['head', 0.32, 0.68, 0] }),
      parts: [
        B([0, 0.69, 0], [0.31, 0.25, 0.26], 0.13, { k: 0.04, bone: 'head' }),
        ...both(D([-0.31, 0.68, 0], 0.075, 0.02, { k: 0.02, bone: 'earL', rot: [0, Math.PI / 2, 0], col: '#5b6b85' })),
        C([0, 0.92, 0], [0, 1.03, 0], 0.016, { k: 0.02, bone: 'head', col: '#5b6b85' }),
        C([0, 0.44, 0], [0, 0.5, 0], 0.07, { k: 0.03, bone: 'chest', col: '#5b6b85' }),
        B([0, 0.29, 0], [0.19, 0.16, 0.16], 0.09, { k: 0.04, bone: 'chest' }),
        ...both(C([-0.17, 0.38, 0.0], [-0.24, 0.25, 0.04], 0.04, { k: 0.03, bone: 'armL', col: '#5b6b85' }), S([-0.25, 0.23, 0.05], 0.058, { k: 0.02, bone: 'armL', col: 'dark' })),
        ...both(C([-0.09, 0.16, 0.0], [-0.1, 0.08, 0.02], 0.045, { k: 0.03, bone: 'legL', col: '#5b6b85' }), B([-0.1, 0.045, 0.04], [0.07, 0.045, 0.09], 0.035, { k: 0.02, bone: 'legL', col: 'dark' }))
      ],
      paint: [
        B([0, 0.68, 0.2], [0.24, 0.16, 0.12], 0.09, { col: '#1d2a40', soft: 0.004 }),
        B([0, 0.3, 0.14], [0.11, 0.08, 0.06], 0.03, { col: '#2b3a55', soft: 0.004 }),
        S([-0.04, 0.32, 0.17], 0.022, { col: '#ffcf4d', soft: 0.003 }),
        S([0.04, 0.32, 0.17], 0.022, { col: '#ff7a7a', soft: 0.003 }),
        S([0, 0.26, 0.17], 0.018, { col: '#7ee08a', soft: 0.003 })
      ],
      face: { eyeX: 0.11, eyeY: 0.7, eyeR: 0.065, mouthY: 0.6, cheekX: 0.2, cheekY: 0.62, style: 'led' },
      antenna: [0, 1.06, 0],
      hat: { lift: 0.02 }
    };
  },
  owl() {
    return {
      color: '#b98a5e', fur: 0.8, gloss: 0.2,
      bones: skeleton({ head: ['chest', 0, 0.55, 0], earL: ['head', -0.2, 0.96, -0.02], earR: ['head', 0.2, 0.96, -0.02], armL: ['chest', -0.3, 0.6, -0.02], armR: ['chest', 0.3, 0.6, -0.02] }),
      parts: [
        E([0, 0.44, 0], [0.33, 0.38, 0.3], { k: 0.12, bone: 'chest' }),
        head([0, 0.78, 0], [0.33, 0.27, 0.29], { k: 0.16 }),
        ...both(T([-0.2, 0.96, -0.02], [-0.3, 1.12, -0.06], 0.07, 0.014, { k: 0.05, bone: 'earL', col: 'dark' })),
        T([0, 0.73, 0.27], [0, 0.66, 0.34], 0.045, 0.008, { k: 0.02, bone: 'head', col: '#ffb347' }),
        ...both(E([-0.31, 0.46, -0.01], [0.07, 0.2, 0.15], { k: 0.05, bone: 'armL', col: 'dark', rot: [0, 0, -0.15] })),
        ...both(E([-0.1, 0.05, 0.08], [0.065, 0.035, 0.09], { k: 0.04, bone: 'legL', col: '#ffb347' })),
        E([0, 0.14, -0.26], [0.12, 0.06, 0.08], { k: 0.05, bone: 'tail', col: 'dark' })
      ],
      paint: [
        ...both(E([-0.125, 0.78, 0.25], [0.15, 0.15, 0.12], { col: '#f6e3c4', soft: 0.012 })),
        E([0, 0.38, 0.22], [0.2, 0.24, 0.12], { col: '#f1d7b0', soft: 0.015 }),
        ...[[-0.08, 0.44], [0.08, 0.44], [0, 0.36], [-0.1, 0.3], [0.1, 0.3], [0, 0.24]].map(([x, y]) => E([x, y, 0.28], [0.035, 0.015, 0.05], { col: 'dark', soft: 0.004 }))
      ],
      face: { eyeX: 0.125, eyeY: 0.79, eyeR: 0.082, mouthY: null, cheekX: 0.22, cheekY: 0.7, glasses: true },
      hat: { lift: -0.01 }
    };
  },
  tortoise() {
    return {
      color: '#9ccf7a', gloss: 0.3,
      bones: skeleton({ head: ['chest', 0, 0.5, 0.16], earL: ['head', -0.1, 0.9, 0.1], earR: ['head', 0.1, 0.9, 0.1], armL: ['chest', -0.24, 0.3, 0.18], armR: ['chest', 0.24, 0.3, 0.18], legL: ['hips', -0.22, 0.2, -0.18], legR: ['hips', 0.22, 0.2, -0.18], tail: ['hips', 0, 0.22, -0.36] }),
      parts: [
        E([0, 0.36, -0.06], [0.34, 0.27, 0.36], { k: 0.04, bone: 'chest', col: '#5f8f4a' }),
        E([0, 0.27, -0.05], [0.37, 0.07, 0.39], { k: 0.04, bone: 'chest', col: '#c49a5a' }),
        E([0, 0.3, 0.16], [0.24, 0.16, 0.12], { k: 0.05, bone: 'chest', col: '#ead49b' }),
        C([0, 0.42, 0.16], [0, 0.56, 0.22], 0.1, { k: 0.06, bone: 'head' }),
        head([0, 0.73, 0.24], [0.27, 0.24, 0.24]),
        ...both(C([-0.24, 0.26, 0.18], [-0.26, 0.07, 0.22], 0.075, { k: 0.05, bone: 'armL' })),
        ...both(C([-0.22, 0.2, -0.18], [-0.24, 0.07, -0.2], 0.08, { k: 0.05, bone: 'legL' })),
        T([0, 0.22, -0.38], [0, 0.16, -0.48], 0.04, 0.012, { k: 0.03, bone: 'tail' })
      ],
      paint: [
        ...[[0, 0.62, -0.06], [0, 0.52, 0.14], [0, 0.5, -0.27], [-0.2, 0.52, -0.04], [0.2, 0.52, -0.04], [-0.16, 0.45, 0.14], [0.16, 0.45, 0.14], [-0.16, 0.45, -0.26], [0.16, 0.45, -0.26]].map((c) => S(c, 0.085, { col: '#7fae5c', soft: 0.01 })),
        E([0, 0.66, 0.46], [0.05, 0.02, 0.04], { col: '#3c6b30', soft: 0.004 })
      ],
      face: { eyeX: 0.11, eyeY: 0.76, eyeR: 0.07, mouthY: 0.63, cheekX: 0.18, cheekY: 0.66, glasses: true },
      hat: { lift: 0 }
    };
  },
  raccoon() {
    const b = chibiBody({ belly: '#eef0f4', socks: '#3a3f4c' });
    return {
      color: '#9aa3b5', fur: 1, gloss: 0.2,
      bones: skeleton({ earL: ['head', -0.2, 0.9, -0.02], earR: ['head', 0.2, 0.9, -0.02], tail: ['hips', 0, 0.22, -0.17], tail2: ['tail', 0.05, 0.4, -0.38] }),
      parts: [
        head([0, 0.68, 0], [0.35, 0.28, 0.3]),
        E([0, 0.59, 0.23], [0.13, 0.085, 0.11], { k: 0.08, bone: 'head', col: '#eef0f4' }),
        ...both(E([-0.22, 0.58, 0.1], [0.15, 0.11, 0.14], { k: 0.08, bone: 'head', col: '#eef0f4' })),
        ...both(T([-0.2, 0.88, -0.02], [-0.27, 1.02, -0.04], 0.09, 0.035, { k: 0.06, bone: 'earL' })),
        ...b.parts,
        C([0, 0.22, -0.17], [0.05, 0.4, -0.38], 0.11, { k: 0.07, bone: 'tail' }),
        C([0.05, 0.4, -0.38], [0.1, 0.6, -0.44], 0.11, { k: 0.06, bone: 'tail2' })
      ],
      paint: [
        ...b.paint,
        E([0, 0.71, 0.22], [0.3, 0.075, 0.14], { col: '#3a3f4c', soft: 0.012 }),
        ...both(E([-0.13, 0.7, 0.24], [0.1, 0.09, 0.1], { col: '#3a3f4c', soft: 0.01 })),
        E([0, 0.62, 0.33], [0.04, 0.026, 0.03], { col: INK, soft: 0.004 }),
        ...both(E([-0.23, 0.96, 0.02], [0.045, 0.06, 0.04], { col: '#3a3f4c' })),
        ...[[0.02, 0.3, -0.26], [0.05, 0.42, -0.39], [0.08, 0.54, -0.43]].map((c) => S(c, 0.135, { col: '#3a3f4c', soft: 0.004, s: 'sph' })).map((p, i) => ({ ...p, s: 'disc', r: [0.16, 0.024], rot: [i === 0 ? 0.9 : 0.5, 0, 0] })),
        S([0.11, 0.64, -0.45], 0.07, { col: '#3a3f4c' })
      ],
      face: { eyeX: 0.13, eyeY: 0.71, eyeR: 0.07, mouthY: 0.555, cheekX: 0.22, cheekY: 0.6 },
      hat: { lift: 0 }
    };
  },
  frog() {
    const b = chibiBody({ belly: '#e6f7c8' });
    return {
      color: '#7fd67a', gloss: 0.6,
      bones: skeleton({ earL: ['head', -0.15, 0.82, 0.08], earR: ['head', 0.15, 0.82, 0.08] }),
      parts: [
        head([0, 0.62, 0], [0.37, 0.24, 0.3]),
        ...both(S([-0.15, 0.82, 0.08], 0.11, { k: 0.06, bone: 'earL' })),
        ...b.parts
      ],
      paint: [...b.paint, E([0, 0.54, 0.22], [0.24, 0.07, 0.12], { col: '#e6f7c8', soft: 0.02 }), ...both(S([-0.2, 0.7, -0.18], 0.04, { col: 'dark' }), S([0.08, 0.76, -0.2], 0.03, { col: 'dark' }))],
      face: { eyeX: 0.15, eyeY: 0.83, eyeR: 0.07, mouthY: 0.57, cheekX: 0.25, cheekY: 0.6, eyeDepth: 0.06 },
      hat: { lift: 0.02 }
    };
  },
  hedgehog() {
    const b = chibiBody({ belly: '#f3dcbc' });
    // Spikes: rows fanning back over the crown and down the back.
    const spikes = [];
    for (let row = 0; row < 4; row++) {
      const n = 5 + row;
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1) - 0.5) * (1.5 + row * 0.25);
        const pitch = 0.35 + row * 0.42; // 0 = on top, π/2 = straight back
        const dir = [Math.sin(u) * Math.cos(pitch) * 0.9, Math.cos(u) * Math.cos(pitch), -Math.sin(pitch) - 0.25];
        const l = Math.hypot(...dir);
        const d = dir.map((x) => x / l);
        const base = [d[0] * 0.25, 0.64 - row * 0.1 + d[1] * 0.24, -0.04 + d[2] * 0.24];
        const tip = [base[0] + d[0] * 0.2, base[1] + d[1] * 0.2 + 0.03, base[2] + d[2] * 0.2];
        spikes.push(T(base, tip, 0.065, 0.012, { k: 0.025, bone: row < 2 ? 'head' : 'chest', col: '#7a5638' }));
      }
    }
    return {
      color: '#e2b98b', fur: 0.9, gloss: 0.2,
      bones: skeleton(),
      parts: [head([0, 0.66, 0.02], [0.32, 0.28, 0.29]), E([0, 0.58, 0.25], [0.1, 0.08, 0.1], { k: 0.08, bone: 'head', col: '#f3dcbc' }), E([0, 0.52, -0.12], [0.3, 0.32, 0.26], { k: 0.08, bone: 'chest', col: '#8a6444' }), ...spikes, ...b.parts],
      paint: [...b.paint, S([0, 0.6, 0.35], 0.03, { col: INK, soft: 0.004 })],
      face: { eyeX: 0.12, eyeY: 0.7, eyeR: 0.065, mouthY: 0.55, cheekX: 0.2, cheekY: 0.6 },
      hat: { lift: 0.04 }
    };
  },
  mouse() {
    const b = chibiBody({ belly: '#f4eef8' });
    return {
      color: '#cbbfd6', fur: 1, gloss: 0.2,
      bones: skeleton({ earL: ['head', -0.22, 0.9, -0.03], earR: ['head', 0.22, 0.9, -0.03], tail2: ['tail', 0.1, 0.3, -0.4] }),
      parts: [
        head([0, 0.66, 0], [0.32, 0.27, 0.29]),
        E([0, 0.57, 0.23], [0.1, 0.07, 0.1], { k: 0.08, bone: 'head', col: '#f4eef8' }),
        ...both(D([-0.25, 0.95, -0.03], 0.15, 0.025, { k: 0.06, bone: 'earL', rot: [0, -0.2, 0] })),
        ...b.parts,
        C([0, 0.2, -0.18], [0.1, 0.26, -0.36], 0.028, { k: 0.03, bone: 'tail', col: '#ffb3c8' }),
        C([0.1, 0.26, -0.36], [0.16, 0.42, -0.42], 0.026, { k: 0.02, bone: 'tail2', col: '#ffb3c8' })
      ],
      paint: [...b.paint, ...both(D([-0.25, 0.95, 0.0], 0.1, 0.03, { col: '#ffc2d6', rot: [0, -0.2, 0] })), S([0, 0.6, 0.33], 0.03, { col: '#ff7aa8', soft: 0.004 })],
      face: { eyeX: 0.12, eyeY: 0.69, eyeR: 0.068, mouthY: 0.54, cheekX: 0.2, cheekY: 0.59 },
      hat: { lift: 0 }
    };
  },
  duck() {
    const b = chibiBody({ belly: '#fff6c9', arms: false });
    return {
      color: '#ffe066', gloss: 0.35,
      bones: skeleton({ armL: ['chest', -0.2, 0.38, -0.02], armR: ['chest', 0.2, 0.38, -0.02] }),
      parts: [
        head([0, 0.67, 0], [0.31, 0.28, 0.28]),
        E([0, 0.58, 0.27], [0.13, 0.045, 0.12], { k: 0.03, bone: 'head', col: '#ff9f43' }),
        T([0, 0.92, 0], [0.04, 1.02, -0.04], 0.04, 0.01, { k: 0.03, bone: 'head' }),
        ...b.parts.filter((p) => p.bone !== 'legL' && p.bone !== 'legR'),
        ...both(C([-0.1, 0.18, 0.02], [-0.11, 0.07, 0.04], 0.035, { k: 0.04, bone: 'legL', col: '#ff9f43' }), E([-0.11, 0.035, 0.08], [0.08, 0.03, 0.11], { k: 0.03, bone: 'legL', col: '#ff9f43' })),
        ...both(E([-0.2, 0.34, -0.02], [0.06, 0.13, 0.12], { k: 0.05, bone: 'armL', rot: [0, 0, -0.3] })),
        T([0, 0.32, -0.18], [0, 0.42, -0.28], 0.08, 0.02, { k: 0.05, bone: 'tail' })
      ],
      paint: [...b.paint],
      face: { eyeX: 0.12, eyeY: 0.7, eyeR: 0.065, mouthY: null, cheekX: 0.2, cheekY: 0.62 },
      hat: { lift: 0.03 }
    };
  },
  bear() {
    const b = chibiBody();
    return {
      color: '#c98f62', fur: 1, gloss: 0.2,
      bones: skeleton({ earL: ['head', -0.24, 0.88, -0.02], earR: ['head', 0.24, 0.88, -0.02] }),
      parts: [
        head([0, 0.68, 0], [0.34, 0.29, 0.3]),
        E([0, 0.59, 0.24], [0.13, 0.09, 0.1], { k: 0.08, bone: 'head', col: CREAM }),
        ...both(S([-0.24, 0.9, -0.03], 0.09, { k: 0.06, bone: 'earL' })),
        ...b.parts,
        S([0, 0.22, -0.2], 0.06, { k: 0.04, bone: 'tail' })
      ],
      paint: [...b.paint, ...both(S([-0.25, 0.92, 0.03], 0.055, { col: 'light' })), E([0, 0.635, 0.33], [0.045, 0.03, 0.03], { col: INK, soft: 0.004 })],
      face: { eyeX: 0.13, eyeY: 0.72, eyeR: 0.066, mouthY: 0.56, cheekX: 0.22, cheekY: 0.6 },
      hat: { lift: 0 }
    };
  },
  lion() {
    const bear = SPECIES.bear();
    const mane = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      mane.push(S([Math.cos(a) * 0.32, 0.68 + Math.sin(a) * 0.28, -0.06], 0.12, { k: 0.06, bone: 'head', col: '#c9772f' }));
    }
    return { ...bear, color: '#f2c46b', parts: [...bear.parts.filter((p) => p.bone !== 'earL' && p.bone !== 'earR'), ...mane, ...both(S([-0.22, 0.92, 0.0], 0.07, { k: 0.04, bone: 'earL' }))], paint: bear.paint.filter((p) => p.c?.[1] < 0.9) };
  },
  yeti() {
    const bear = SPECIES.bear();
    const fluff = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      fluff.push(S([Math.cos(a) * 0.2, 0.32 + Math.sin(a * 2) * 0.03, Math.sin(a) * 0.17], 0.09, { k: 0.06, bone: 'chest' }));
    }
    return { ...bear, color: '#eef5ff', parts: [...bear.parts, ...fluff, T([0, 0.94, 0.0], [0.03, 1.04, 0.06], 0.06, 0.015, { k: 0.04, bone: 'head' })], paint: [E([0, 0.68, 0.22], [0.22, 0.17, 0.1], { col: '#9fb3d1', soft: 0.02 }), ...bear.paint.slice(-1)] };
  },
  crab() {
    return {
      color: '#ff7a5c', gloss: 0.5,
      bones: skeleton({ head: ['chest', 0, 0.36, 0], earL: ['head', -0.1, 0.48, 0.1], earR: ['head', 0.1, 0.48, 0.1], armL: ['chest', -0.3, 0.32, 0.08], armR: ['chest', 0.3, 0.32, 0.08], legL: ['hips', -0.24, 0.2, -0.02], legR: ['hips', 0.24, 0.2, -0.02] }),
      parts: [
        E([0, 0.32, 0], [0.36, 0.2, 0.26], { k: 0.08, bone: 'head' }),
        ...both(C([-0.1, 0.44, 0.1], [-0.12, 0.6, 0.12], 0.028, { k: 0.04, bone: 'earL' }), S([-0.12, 0.62, 0.12], 0.06, { k: 0.03, bone: 'earL', col: 'light' })),
        ...both(C([-0.3, 0.32, 0.08], [-0.42, 0.42, 0.18], 0.05, { k: 0.04, bone: 'armL' }), E([-0.46, 0.48, 0.22], [0.11, 0.09, 0.08], { k: 0.04, bone: 'armL' }), T([-0.5, 0.56, 0.26], [-0.44, 0.66, 0.28], 0.04, 0.012, { k: 0.02, bone: 'armL' })),
        ...both(C([-0.26, 0.22, -0.04], [-0.38, 0.06, 0.0], 0.035, { k: 0.03, bone: 'legL' }), C([-0.24, 0.22, -0.12], [-0.36, 0.06, -0.14], 0.035, { k: 0.03, bone: 'legL' }))
      ],
      paint: [E([0, 0.24, 0.16], [0.24, 0.1, 0.12], { col: 'light', soft: 0.02 })],
      face: { eyeX: 0.12, eyeY: 0.62, eyeR: 0.055, mouthY: 0.32, cheekX: 0.2, cheekY: 0.34, stalks: true },
      hat: { lift: -0.02 }
    };
  },
  penguin() {
    return {
      color: '#2f3550', gloss: 0.5,
      bones: skeleton({ head: ['chest', 0, 0.55, 0], armL: ['chest', -0.27, 0.5, 0], armR: ['chest', 0.27, 0.5, 0] }),
      parts: [
        E([0, 0.42, 0], [0.29, 0.36, 0.27], { k: 0.1, bone: 'chest' }),
        head([0, 0.76, 0], [0.3, 0.26, 0.27], { k: 0.16 }),
        T([0, 0.7, 0.26], [0, 0.66, 0.34], 0.045, 0.01, { k: 0.02, bone: 'head', col: '#ff9f43' }),
        ...both(E([-0.28, 0.4, 0], [0.05, 0.18, 0.1], { k: 0.04, bone: 'armL', rot: [0, 0, -0.25] })),
        ...both(E([-0.1, 0.03, 0.08], [0.07, 0.03, 0.1], { k: 0.03, bone: 'legL', col: '#ff9f43' }))
      ],
      paint: [E([0, 0.4, 0.17], [0.21, 0.29, 0.14], { col: '#ffffff', soft: 0.015 }), ...both(E([-0.1, 0.77, 0.21], [0.11, 0.12, 0.08], { col: '#ffffff', soft: 0.012 }))],
      face: { eyeX: 0.1, eyeY: 0.78, eyeR: 0.06, mouthY: null, cheekX: 0.18, cheekY: 0.68 },
      hat: { lift: 0 }
    };
  },
  /** The Great Tree: a squirrel with tufted ears and a big curling tail. */
  squirrel() {
    const b = chibiBody({ socks: '#8a4a26' });
    return {
      color: '#d9824a', fur: 1, gloss: 0.2,
      bones: skeleton({ earL: ['head', -0.15, 0.92, -0.02], earR: ['head', 0.15, 0.92, -0.02], tail: ['hips', 0, 0.2, -0.18], tail2: ['tail', 0, 0.55, -0.34] }),
      parts: [
        head([0, 0.68, 0], [0.33, 0.29, 0.29]),
        ...both(E([-0.19, 0.58, 0.13], [0.15, 0.11, 0.13], { k: 0.08, bone: 'head', col: CREAM })),
        ...both(T([-0.15, 0.9, -0.02], [-0.2, 1.08, -0.04], 0.085, 0.02, { k: 0.06, bone: 'earL' })),
        ...b.parts,
        C([0, 0.2, -0.18], [0, 0.42, -0.36], 0.12, { k: 0.08, bone: 'tail' }),
        C([0, 0.42, -0.36], [0, 0.72, -0.34], 0.15, { k: 0.08, bone: 'tail2' }),
        S([0, 0.82, -0.24], 0.13, { k: 0.07, bone: 'tail2' })
      ],
      paint: [...b.paint, ...both(S([-0.2, 1.07, -0.04], 0.03, { col: '#8a4a26', soft: 0.01 }))],
      face: { eyeX: 0.12, eyeY: 0.7, eyeR: 0.072, mouthY: 0.57, cheekX: 0.2, cheekY: 0.6 },
      hat: { lift: 0 }
    };
  },
  /** The sea islands: a round octopus, front tentacles up like arms, the rest curling on the ground. */
  octopus() {
    return {
      color: '#c58cff', gloss: 0.5,
      bones: skeleton({ head: ['chest', 0, 0.42, 0], earL: ['head', -0.12, 0.92, 0], earR: ['head', 0.12, 0.92, 0], armL: ['chest', -0.18, 0.28, 0.12], armR: ['chest', 0.18, 0.28, 0.12], legL: ['hips', -0.14, 0.16, 0.04], legR: ['hips', 0.14, 0.16, 0.04], tail: ['hips', 0, 0.16, -0.14] }),
      parts: [
        E([0, 0.64, -0.05], [0.33, 0.35, 0.31], { k: 0.12, bone: 'head' }),
        E([0, 0.3, 0.02], [0.25, 0.15, 0.23], { k: 0.12, bone: 'chest' }),
        ...both(C([-0.17, 0.3, 0.13], [-0.3, 0.24, 0.22], 0.06, { k: 0.05, bone: 'armL' }), T([-0.3, 0.24, 0.22], [-0.37, 0.34, 0.29], 0.05, 0.02, { k: 0.04, bone: 'armL' })),
        ...both(C([-0.13, 0.2, 0.08], [-0.27, 0.05, 0.13], 0.065, { k: 0.05, bone: 'legL' }), T([-0.27, 0.05, 0.13], [-0.37, 0.05, 0.04], 0.05, 0.018, { k: 0.03, bone: 'legL' })),
        ...both(C([-0.1, 0.18, -0.08], [-0.2, 0.05, -0.22], 0.06, { k: 0.05, bone: 'tail' }), T([-0.2, 0.05, -0.22], [-0.12, 0.05, -0.33], 0.045, 0.015, { k: 0.03, bone: 'tail' }))
      ],
      paint: [
        ...[[0.14, 0.86, 0.14], [-0.17, 0.8, 0.18], [0.24, 0.66, 0.12], [-0.05, 0.93, -0.02], [0.02, 0.78, -0.3], [-0.24, 0.62, -0.12]].map((c) => S(c, 0.045, { col: '#9a63e0', soft: 0.01 })),
        ...both(S([-0.36, 0.33, 0.29], 0.03, { col: CREAM, soft: 0.006 }), S([-0.36, 0.06, 0.05], 0.03, { col: CREAM, soft: 0.006 }))
      ],
      face: { eyeX: 0.12, eyeY: 0.62, eyeR: 0.075, mouthY: 0.49, cheekX: 0.21, cheekY: 0.53 },
      hat: { lift: 0.08 }
    };
  },
  /** The sea islands: a plump seal pup with front flippers, a whiskery muzzle and a tail of flippers. */
  seal() {
    return {
      color: '#a9bccf', gloss: 0.55,
      bones: skeleton({ head: ['chest', 0, 0.5, 0.06], armL: ['chest', -0.24, 0.28, 0.1], armR: ['chest', 0.24, 0.28, 0.1], legL: ['hips', -0.08, 0.08, -0.32], legR: ['hips', 0.08, 0.08, -0.32], tail: ['hips', 0, 0.1, -0.28] }),
      parts: [
        E([0, 0.3, -0.03], [0.26, 0.28, 0.29], { k: 0.12, bone: 'chest' }),
        E([0, 0.14, -0.22], [0.19, 0.13, 0.22], { k: 0.12, bone: 'hips' }),
        head([0, 0.68, 0.06], [0.27, 0.25, 0.25], { k: 0.15 }),
        E([0, 0.61, 0.27], [0.12, 0.075, 0.07], { k: 0.05, bone: 'head', col: CREAM }),
        S([0, 0.66, 0.33], 0.036, { k: 0.02, bone: 'head', col: INK }),
        ...both(E([-0.25, 0.2, 0.12], [0.05, 0.13, 0.09], { k: 0.04, bone: 'armL', rot: [0.3, 0, -0.55] })),
        ...both(E([-0.1, 0.05, -0.42], [0.1, 0.03, 0.08], { k: 0.04, bone: 'legL', rot: [0, 0.5, 0] }))
      ],
      paint: [
        E([0, 0.3, 0.19], [0.16, 0.19, 0.12], { col: 'light', soft: 0.015 }),
        ...[[0.16, 0.42, -0.2], [-0.18, 0.36, -0.14], [0.05, 0.5, -0.24], [-0.12, 0.86, -0.06]].map((c) => S(c, 0.035, { col: '#8096ad', soft: 0.008 }))
      ],
      face: { eyeX: 0.11, eyeY: 0.72, eyeR: 0.07, mouthY: 0.57, cheekX: 0.19, cheekY: 0.63 },
      hat: { lift: 0 }
    };
  },
  /** The desert: a fennec fox cub — sandy, with enormous ears and a dark-tipped tail. */
  fennec() {
    const b = chibiBody({ socks: '#c98f55' });
    return {
      color: '#f1c98c', fur: 1, gloss: 0.25,
      bones: skeleton({ earL: ['head', -0.2, 0.86, -0.03], earR: ['head', 0.2, 0.86, -0.03], tail: ['hips', 0, 0.2, -0.17], tail2: ['tail', 0.06, 0.38, -0.38] }),
      parts: [
        head([0, 0.68, 0], [0.34, 0.28, 0.29]),
        ...both(E([-0.2, 0.58, 0.13], [0.15, 0.11, 0.14], { k: 0.08, bone: 'head', col: CREAM })),
        E([0, 0.6, 0.24], [0.1, 0.07, 0.1], { k: 0.08, bone: 'head', col: CREAM }),
        ...both(T([-0.18, 0.86, -0.03], [-0.38, 1.22, -0.07], 0.17, 0.035, { k: 0.08, bone: 'earL' })),
        ...b.parts,
        C([0, 0.2, -0.17], [0.05, 0.34, -0.34], 0.09, { k: 0.07, bone: 'tail' }),
        C([0.05, 0.34, -0.34], [0.1, 0.5, -0.42], 0.1, { k: 0.06, bone: 'tail2' }),
        S([0.11, 0.54, -0.43], 0.09, { k: 0.06, bone: 'tail2', col: '#4a3326' })
      ],
      paint: [
        ...b.paint,
        ...both(E([-0.26, 1.0, 0.03], [0.08, 0.15, 0.06], { col: PINK, rot: [0, 0, 0.5] })),
        E([0, 0.635, 0.335], [0.04, 0.026, 0.03], { col: INK, soft: 0.004 })
      ],
      face: { eyeX: 0.13, eyeY: 0.7, eyeR: 0.078, mouthY: 0.57, cheekX: 0.22, cheekY: 0.6 },
      hat: { lift: 0 }
    };
  },
  /** The desert: a camel calf, standing on four long legs, one soft hump, a curved neck. */
  camel() {
    return {
      color: '#e0b27a', fur: 0.7, gloss: 0.2,
      bones: skeleton({ hips: ['root', 0, 0.5, -0.2], chest: ['hips', 0, 0.62, 0.05], head: ['chest', 0, 0.84, 0.32], earL: ['head', -0.09, 1.3, 0.38], earR: ['head', 0.09, 1.3, 0.38], armL: ['chest', -0.13, 0.52, 0.2], armR: ['chest', 0.13, 0.52, 0.2], legL: ['hips', -0.13, 0.5, -0.3], legR: ['hips', 0.13, 0.5, -0.3], tail: ['hips', 0, 0.64, -0.45] }),
      parts: [
        E([0, 0.64, 0.02], [0.24, 0.2, 0.3], { k: 0.1, bone: 'chest' }),
        E([0, 0.62, -0.26], [0.23, 0.19, 0.24], { k: 0.1, bone: 'hips' }),
        S([0, 0.86, -0.1], 0.15, { k: 0.1, bone: 'chest', col: '#d39d62' }),
        C([0, 0.74, 0.24], [0, 1.08, 0.36], 0.09, { k: 0.07, bone: 'head' }),
        E([0, 1.18, 0.42], [0.17, 0.15, 0.17], { k: 0.08, bone: 'head' }),
        E([0, 1.12, 0.56], [0.11, 0.08, 0.1], { k: 0.06, bone: 'head', col: '#f3d6a8' }),
        ...both(E([-0.12, 1.31, 0.36], [0.04, 0.06, 0.03], { k: 0.03, bone: 'earL' })),
        ...both(C([-0.13, 0.52, 0.18], [-0.13, 0.08, 0.2], 0.055, { k: 0.05, bone: 'armL' }), E([-0.13, 0.04, 0.23], [0.07, 0.04, 0.08], { k: 0.03, bone: 'armL', col: '#a37850' })),
        ...both(C([-0.13, 0.52, -0.32], [-0.13, 0.08, -0.32], 0.06, { k: 0.05, bone: 'legL' }), E([-0.13, 0.04, -0.29], [0.07, 0.04, 0.08], { k: 0.03, bone: 'legL', col: '#a37850' })),
        C([0, 0.66, -0.48], [0, 0.5, -0.56], 0.03, { k: 0.02, bone: 'tail' })
      ],
      paint: [
        ...both(S([-0.05, 1.11, 0.65], 0.022, { col: INK, soft: 0.004 })),
        E([0, 0.86, -0.1], [0.18, 0.06, 0.18], { col: '#c88f58', soft: 0.02 })
      ],
      face: { eyeX: 0.085, eyeY: 1.22, eyeR: 0.05, mouthY: 1.07, cheekX: 0.12, cheekY: 1.14 },
      hat: { lift: 0 }
    };
  },
  /** The desert: a scarab beetle, round and shiny, with six little legs and two feelers. */
  scarab() {
    return {
      color: '#3fa0a8', gloss: 0.85,
      bones: skeleton({ head: ['chest', 0, 0.3, 0.2], earL: ['head', -0.06, 0.4, 0.34], earR: ['head', 0.06, 0.4, 0.34], armL: ['chest', -0.22, 0.22, 0.12], armR: ['chest', 0.22, 0.22, 0.12], legL: ['hips', -0.22, 0.2, -0.12], legR: ['hips', 0.22, 0.2, -0.12] }),
      parts: [
        E([0, 0.3, -0.06], [0.3, 0.2, 0.34], { k: 0.04, bone: 'chest' }),
        E([0, 0.36, 0.0], [0.28, 0.16, 0.3], { k: 0.04, bone: 'chest', col: '#2f8c9a' }),
        E([0, 0.3, 0.3], [0.19, 0.15, 0.14], { k: 0.06, bone: 'head', col: '#2a6f7c' }),
        ...both(C([-0.06, 0.4, 0.36], [-0.12, 0.56, 0.42], 0.018, { k: 0.02, bone: 'earL', col: '#1f3a40' }), S([-0.12, 0.57, 0.42], 0.035, { k: 0.02, bone: 'earL', col: '#f2c14e' })),
        ...both(C([-0.22, 0.22, 0.14], [-0.34, 0.05, 0.22], 0.03, { k: 0.02, bone: 'armL', col: '#1f3a40' })),
        ...both(C([-0.26, 0.2, 0.0], [-0.38, 0.05, 0.0], 0.03, { k: 0.02, bone: 'chest', col: '#1f3a40' })),
        ...both(C([-0.22, 0.2, -0.14], [-0.34, 0.05, -0.24], 0.03, { k: 0.02, bone: 'legL', col: '#1f3a40' }))
      ],
      paint: [E([0, 0.5, -0.06], [0.015, 0.06, 0.32], { col: '#f2c14e', soft: 0.006 }), ...both(S([-0.15, 0.46, -0.12], 0.05, { col: '#7fe0e0', soft: 0.01 }))],
      face: { eyeX: 0.08, eyeY: 0.34, eyeR: 0.05, mouthY: 0.25, cheekX: 0.13, cheekY: 0.27 },
      hat: { lift: -0.02 }
    };
  },
  /** The desert: a meerkat standing up on look-out — slim, sandy, dark eye patches, a thin dark-tipped tail. */
  meerkat() {
    const b = chibiBody({ belly: '#f6e6c8', socks: '#8a6a4a', bodyR: [0.17, 0.25, 0.16], legR: 0.06 });
    return {
      color: '#d6b07c', fur: 1, gloss: 0.2,
      bones: skeleton({ head: ['chest', 0, 0.5, 0], earL: ['head', -0.2, 0.84, -0.02], earR: ['head', 0.2, 0.84, -0.02], armL: ['chest', -0.15, 0.44, 0.06], armR: ['chest', 0.15, 0.44, 0.06], tail: ['hips', 0, 0.16, -0.16], tail2: ['tail', 0, 0.06, -0.4] }),
      parts: [
        head([0, 0.74, 0.02], [0.27, 0.25, 0.26]),
        E([0, 0.66, 0.22], [0.11, 0.08, 0.12], { k: 0.08, bone: 'head', col: '#f6e6c8' }),
        ...both(S([-0.22, 0.84, -0.02], 0.065, { k: 0.04, bone: 'earL', col: '#6b4a32' })),
        ...b.parts.map((q) => (q.bone === 'armL' || q.bone === 'armR' ? { ...q, c: q.c && [q.c[0] * 0.8, q.c[1] + 0.08, q.c[2] + 0.06], a: q.a && [q.a[0] * 0.8, q.a[1] + 0.06, q.a[2] + 0.04], b: q.b && [q.b[0] * 0.7, q.b[1] + 0.1, q.b[2] + 0.1] } : q)),
        C([0, 0.16, -0.16], [0, 0.07, -0.4], 0.04, { k: 0.03, bone: 'tail' }),
        C([0, 0.07, -0.4], [0, 0.05, -0.56], 0.03, { k: 0.02, bone: 'tail2', col: '#3a2a20' })
      ],
      paint: [...b.paint, ...both(E([-0.11, 0.77, 0.2], [0.075, 0.06, 0.06], { col: '#5a3a26', soft: 0.01 })), E([0, 0.69, 0.33], [0.035, 0.024, 0.03], { col: INK, soft: 0.004 }), E([0, 0.42, -0.14], [0.12, 0.2, 0.06], { col: '#b88f5c', soft: 0.02 })],
      face: { eyeX: 0.11, eyeY: 0.77, eyeR: 0.06, mouthY: 0.64, cheekX: 0.18, cheekY: 0.68 },
      hat: { lift: 0 }
    };
  },
  /** The desert: a jerboa — a tiny hopper with huge ears, long feet and a long tail with a black-and-white tuft. */
  jerboa() {
    const b = chibiBody({ belly: '#fff6e6', bodyR: [0.18, 0.17, 0.16], legR: 0.06 });
    return {
      color: '#e9c38e', fur: 1, gloss: 0.2,
      bones: skeleton({ earL: ['head', -0.15, 0.9, -0.03], earR: ['head', 0.15, 0.9, -0.03], tail: ['hips', 0, 0.18, -0.16], tail2: ['tail', 0, 0.1, -0.5] }),
      parts: [
        head([0, 0.6, 0.02], [0.3, 0.26, 0.27]),
        E([0, 0.52, 0.24], [0.09, 0.06, 0.08], { k: 0.08, bone: 'head', col: '#fff6e6' }),
        ...both(E([-0.17, 0.98, -0.04], [0.09, 0.22, 0.04], { k: 0.05, bone: 'earL', rot: [0, 0, -0.35] })),
        ...b.parts.filter((q) => q.bone !== 'legL' && q.bone !== 'legR'),
        ...both(C([-0.1, 0.18, 0.0], [-0.11, 0.06, 0.02], 0.06, { k: 0.05, bone: 'legL' }), E([-0.11, 0.035, 0.12], [0.06, 0.035, 0.16], { k: 0.03, bone: 'legL', col: '#fff6e6' })),
        C([0, 0.18, -0.16], [0, 0.1, -0.5], 0.025, { k: 0.02, bone: 'tail' }),
        C([0, 0.1, -0.5], [0, 0.16, -0.7], 0.022, { k: 0.02, bone: 'tail2' }),
        E([0, 0.18, -0.76], [0.06, 0.06, 0.09], { k: 0.03, bone: 'tail2', col: '#2b2b33' }),
        E([0, 0.2, -0.84], [0.05, 0.05, 0.05], { k: 0.03, bone: 'tail2', col: '#ffffff' })
      ],
      paint: [...b.paint, ...both(E([-0.17, 0.98, 0.0], [0.05, 0.16, 0.03], { col: PINK, rot: [0, 0, -0.35] })), S([0, 0.55, 0.3], 0.028, { col: '#ff7aa8', soft: 0.004 })],
      face: { eyeX: 0.12, eyeY: 0.63, eyeR: 0.075, mouthY: 0.5, cheekX: 0.2, cheekY: 0.54 },
      hat: { lift: 0 }
    };
  },
  /** The desert: a gecko on all fours — a big round head, huge eyes, spots and a curly tail. */
  gecko() {
    return {
      color: '#8fd06a', gloss: 0.55,
      bones: skeleton({ hips: ['root', 0, 0.2, -0.12], chest: ['hips', 0, 0.22, 0.08], head: ['chest', 0, 0.3, 0.28], earL: ['head', -0.1, 0.5, 0.3], earR: ['head', 0.1, 0.5, 0.3], armL: ['chest', -0.16, 0.2, 0.14], armR: ['chest', 0.16, 0.2, 0.14], legL: ['hips', -0.16, 0.18, -0.16], legR: ['hips', 0.16, 0.18, -0.16], tail: ['hips', 0, 0.18, -0.3], tail2: ['tail', 0.1, 0.12, -0.6] }),
      parts: [
        E([0, 0.22, -0.02], [0.17, 0.12, 0.3], { k: 0.08, bone: 'chest' }),
        head([0, 0.38, 0.36], [0.25, 0.2, 0.22], { k: 0.12 }),
        ...both(C([-0.15, 0.2, 0.14], [-0.28, 0.05, 0.2], 0.04, { k: 0.03, bone: 'armL' }), S([-0.3, 0.035, 0.22], 0.05, { k: 0.02, bone: 'armL', col: '#b9e88a' })),
        ...both(C([-0.15, 0.18, -0.16], [-0.28, 0.05, -0.2], 0.045, { k: 0.03, bone: 'legL' }), S([-0.3, 0.035, -0.2], 0.055, { k: 0.02, bone: 'legL', col: '#b9e88a' })),
        T([0, 0.18, -0.28], [0.1, 0.1, -0.56], 0.09, 0.06, { k: 0.05, bone: 'tail' }),
        T([0.1, 0.1, -0.56], [0.28, 0.08, -0.66], 0.06, 0.025, { k: 0.04, bone: 'tail2' })
      ],
      paint: [
        E([0, 0.15, 0.05], [0.13, 0.06, 0.24], { col: '#e8f7b8', soft: 0.02 }),
        ...[[0.08, 0.33, -0.06], [-0.09, 0.32, 0.06], [0.0, 0.34, -0.2], [0.1, 0.3, 0.14], [-0.06, 0.3, -0.16], [0.06, 0.52, 0.3]].map((c) => S(c, 0.04, { col: '#f2a03a', soft: 0.01 }))
      ],
      face: { eyeX: 0.11, eyeY: 0.44, eyeR: 0.085, mouthY: 0.3, cheekX: 0.18, cheekY: 0.34 },
      hat: { lift: 0.1 }
    };
  },
  /**
   * The desert's history teacher, Uncle Reed: a plush sacred ibis — a round white body, a soft slate
   * head and neck with a big cream face, a short curved beak, dark-tipped wings and tail plumes, a
   * turquoise-and-gold Egyptian collar, and a papyrus scroll tucked under one wing.
   */
  ibis() {
    const SLATE = '#5a6075';
    return {
      color: '#fbf6ee', fur: 0.4, gloss: 0.3,
      bones: skeleton({ hips: ['root', 0, 0.4, 0], chest: ['hips', 0, 0.56, 0], head: ['chest', 0, 0.86, 0.1], earL: ['head', -0.08, 1.16, 0.08], earR: ['head', 0.08, 1.16, 0.08], armL: ['chest', -0.2, 0.66, 0], armR: ['chest', 0.2, 0.66, 0], legL: ['hips', -0.08, 0.4, 0.02], legR: ['hips', 0.08, 0.4, 0.02], tail: ['hips', 0, 0.52, -0.26] }),
      parts: [
        E([0, 0.6, -0.03], [0.23, 0.22, 0.27], { k: 0.1, bone: 'chest' }),
        E([0, 0.5, 0.0], [0.19, 0.12, 0.2], { k: 0.08, bone: 'hips' }),
        C([0, 0.74, 0.08], [0, 0.9, 0.11], 0.08, { k: 0.06, bone: 'head', col: SLATE }),
        S([0, 1.0, 0.11], 0.2, { k: 0.08, bone: 'head', col: SLATE }),
        // The beak: two tapers curving down.
        T([0, 0.95, 0.28], [0, 0.9, 0.44], 0.044, 0.027, { k: 0.02, bone: 'head', col: '#4b4856' }),
        T([0, 0.9, 0.44], [0, 0.8, 0.52], 0.027, 0.012, { k: 0.015, bone: 'head', col: '#4b4856' }),
        // Wings, black-tipped, held at the sides.
        ...both(E([-0.21, 0.62, -0.05], [0.065, 0.16, 0.23], { k: 0.05, bone: 'armL', rot: [0.15, 0, -0.18] })),
        ...both(E([-0.2, 0.56, -0.25], [0.05, 0.08, 0.09], { k: 0.04, bone: 'armL', col: SLATE })),
        // Fluffy black tail plumes.
        E([0, 0.56, -0.32], [0.13, 0.08, 0.12], { k: 0.05, bone: 'tail', col: SLATE }),
        // The scroll under the left wing.
        C([-0.18, 0.5, 0.2], [0.04, 0.46, 0.25], 0.045, { k: 0.01, bone: 'armL', col: '#f3e6c4' }),
        S([-0.2, 0.5, 0.2], 0.052, { k: 0.01, bone: 'armL', col: '#b5793f' }),
        S([0.06, 0.46, 0.25], 0.052, { k: 0.01, bone: 'armL', col: '#b5793f' }),
        // Long legs and wide feet.
        ...both(C([-0.08, 0.42, 0.02], [-0.08, 0.06, 0.03], 0.028, { k: 0.02, bone: 'legL', col: '#3a3a44' }), E([-0.08, 0.03, 0.07], [0.06, 0.022, 0.09], { k: 0.02, bone: 'legL', col: '#3a3a44' }))
      ],
      paint: [
        // A big cream face, so the eyes read on the grey head.
        E([0, 1.0, 0.24], [0.17, 0.13, 0.1], { col: '#fff4e6', soft: 0.014 }),
        E([0, 0.6, 0.24], [0.15, 0.16, 0.08], { col: '#fffdf8', soft: 0.02 }),
        // A broad collar: turquoise, gold and turquoise bands round the neck.
        { s: 'disc', c: [0, 0.76, 0.06], r: [0.22, 0.022], rot: [Math.PI / 2, 0, 0], col: '#36bfc4', soft: 0.006 },
        { s: 'disc', c: [0, 0.72, 0.05], r: [0.24, 0.02], rot: [Math.PI / 2, 0, 0], col: '#f2c14e', soft: 0.006 },
        { s: 'disc', c: [0, 0.685, 0.04], r: [0.26, 0.02], rot: [Math.PI / 2, 0, 0], col: '#2f6fb8', soft: 0.006 }
      ],
      face: { eyeX: 0.085, eyeY: 1.04, eyeR: 0.056, mouthY: null, cheekX: 0.13, cheekY: 0.97 },
      hat: { lift: 0 }
    };
  },
  /**
   * The desert's math teacher, Miss Lotus: a round plush hippo in soft lilac, with a wide pale muzzle,
   * little round ears, a pink tummy and a lotus flower worn over one ear.
   */
  hippo() {
    const b = chibiBody({ belly: '#f7c9da', bodyR: [0.25, 0.22, 0.22], legR: 0.088 });
    return {
      color: '#b9a7e0', fur: 0.3, gloss: 0.35,
      bones: skeleton({ earL: ['head', -0.2, 0.92, -0.06], earR: ['head', 0.2, 0.92, -0.06], armL: ['chest', -0.2, 0.4, 0.02], armR: ['chest', 0.2, 0.4, 0.02] }),
      parts: [
        head([0, 0.72, -0.02], [0.33, 0.27, 0.28]),
        // The big muzzle.
        E([0, 0.6, 0.18], [0.25, 0.16, 0.18], { k: 0.1, bone: 'head', col: '#d6c9f0' }),
        ...both(E([-0.2, 0.93, -0.06], [0.065, 0.07, 0.045], { k: 0.04, bone: 'earL' })),
        ...b.parts.map((q) => (q.bone === 'armL' || q.bone === 'armR' ? { ...q, r: typeof q.r === 'number' ? q.r * 1.2 : q.r } : q)),
        S([0, 0.24, -0.22], 0.05, { k: 0.03, bone: 'tail' })
      ],
      paint: [
        ...b.paint,
        ...both(E([-0.2, 0.93, -0.02], [0.035, 0.04, 0.03], { col: '#f7a8c4', soft: 0.006 })),
        // Nostrils on top of the muzzle.
        ...both(E([-0.08, 0.7, 0.33], [0.03, 0.022, 0.03], { col: '#7a6aa0', soft: 0.005 })),
        // Soft freckles.
        ...[[0.16, 0.62, 0.3], [0.19, 0.57, 0.27], [-0.16, 0.62, 0.3], [-0.19, 0.57, 0.27]].map((c) => S(c, 0.012, { col: '#a593cf', soft: 0.003 }))
      ],
      face: { eyeX: 0.13, eyeY: 0.82, eyeR: 0.068, mouthY: 0.53, cheekX: 0.23, cheekY: 0.64 },
      hat: { lift: 0, wear: 'lotus' }
    };
  },
  /**
   * The desert's physics teacher, Dr. Sandy: a sand cat — pale sandy fur, wide-set pointed ears,
   * a broad face with fluffy cheeks, faint stripes on the legs and a ringed, black-tipped tail.
   */
  sandcat() {
    const b = chibiBody({ belly: '#fff3dc', socks: '#c9a06a' });
    return {
      color: '#e6c99b', fur: 1, gloss: 0.2,
      bones: skeleton({ earL: ['head', -0.22, 0.86, -0.02], earR: ['head', 0.22, 0.86, -0.02], tail: ['hips', 0, 0.2, -0.17], tail2: ['tail', 0.05, 0.36, -0.38] }),
      parts: [
        head([0, 0.68, 0], [0.36, 0.28, 0.3]),
        ...both(E([-0.21, 0.58, 0.12], [0.16, 0.12, 0.15], { k: 0.08, bone: 'head', col: '#fff3dc' })),
        E([0, 0.6, 0.24], [0.1, 0.07, 0.1], { k: 0.08, bone: 'head', col: '#fff3dc' }),
        ...both(T([-0.21, 0.86, -0.02], [-0.33, 1.06, -0.05], 0.11, 0.03, { k: 0.07, bone: 'earL' })),
        ...b.parts,
        C([0, 0.2, -0.17], [0.05, 0.36, -0.36], 0.07, { k: 0.06, bone: 'tail' }),
        C([0.05, 0.36, -0.36], [0.1, 0.56, -0.44], 0.065, { k: 0.05, bone: 'tail2' }),
        S([0.1, 0.59, -0.44], 0.07, { k: 0.05, bone: 'tail2', col: '#3a2a20' })
      ],
      paint: [
        ...b.paint,
        ...both(E([-0.26, 0.97, 0.02], [0.06, 0.1, 0.05], { col: PINK, rot: [0, 0, 0.45] })),
        ...both(S([-0.32, 1.05, -0.05], 0.035, { col: '#7a5a3c', soft: 0.008 })),
        E([0, 0.635, 0.335], [0.04, 0.026, 0.03], { col: '#d98a8a', soft: 0.004 }),
        // Faint stripes on the arms and legs, and rings round the tail.
        ...both(E([-0.27, 0.3, 0.07], [0.06, 0.012, 0.07], { col: '#b98d58', soft: 0.004 }), E([-0.11, 0.12, 0.07], [0.08, 0.012, 0.08], { col: '#b98d58', soft: 0.004 })),
        ...[[0.03, 0.29, -0.28], [0.07, 0.44, -0.4], [0.09, 0.52, -0.43]].map((c) => S(c, 0.075, { col: '#a07a4c', soft: 0.006 })),
        // Brow marks above the eyes.
        ...both(E([-0.1, 0.84, 0.24], [0.04, 0.012, 0.03], { col: '#b98d58', soft: 0.004, rot: [0, 0, 0.3] }))
      ],
      face: { eyeX: 0.135, eyeY: 0.7, eyeR: 0.08, mouthY: 0.565, cheekX: 0.23, cheekY: 0.6 },
      hat: { lift: 0 }
    };
  },
  /** The Moon: a plush water bear (tardigrade) — a chubby, wrinkly bean on four pairs of stubby legs, a little round snout. */
  tardigrade() {
    const SKIN = '#f2cdb0', FOLD = '#dcae8c';
    return {
      color: SKIN, fur: 0.5, gloss: 0.3,
      bones: skeleton({ hips: ['root', 0, 0.3, -0.18], chest: ['hips', 0, 0.34, 0.04], head: ['chest', 0, 0.46, 0.26], earL: ['head', -0.1, 0.76, 0.26], earR: ['head', 0.1, 0.76, 0.26], armL: ['chest', -0.25, 0.24, 0.12], armR: ['chest', 0.25, 0.24, 0.12], legL: ['hips', -0.25, 0.22, -0.2], legR: ['hips', 0.25, 0.22, -0.2], tail: ['hips', 0, 0.28, -0.4] }),
      parts: [
        E([0, 0.34, -0.22], [0.26, 0.24, 0.2], { k: 0.09, bone: 'hips' }),
        E([0, 0.38, -0.01], [0.29, 0.28, 0.2], { k: 0.09, bone: 'chest' }),
        E([0, 0.32, -0.38], [0.2, 0.18, 0.12], { k: 0.08, bone: 'tail' }),
        head([0, 0.52, 0.26], [0.31, 0.29, 0.25], { k: 0.1 }),
        T([0, 0.44, 0.46], [0, 0.43, 0.54], 0.085, 0.07, { k: 0.04, bone: 'head', col: '#f9dcc8' }),
        ...both(C([-0.25, 0.24, 0.13], [-0.3, 0.06, 0.18], 0.078, { k: 0.06, bone: 'armL' }), S([-0.31, 0.045, 0.22], 0.05, { k: 0.03, bone: 'armL', col: '#f9dcc8' })),
        ...both(C([-0.28, 0.26, -0.06], [-0.33, 0.06, -0.06], 0.078, { k: 0.06, bone: 'chest' })),
        ...both(C([-0.25, 0.24, -0.22], [-0.3, 0.06, -0.26], 0.078, { k: 0.06, bone: 'legL' }), S([-0.31, 0.045, -0.29], 0.05, { k: 0.03, bone: 'legL', col: '#f9dcc8' })),
        ...both(C([-0.15, 0.24, -0.4], [-0.19, 0.06, -0.47], 0.062, { k: 0.05, bone: 'tail' }))
      ],
      paint: [
        // Soft folds round the body, a pale tummy, freckles.
        ...[0.1, -0.1, -0.3].map((z) => E([0, 0.38, z], [0.32, 0.31, 0.014], { col: FOLD, soft: 0.012 })),
        E([0, 0.2, -0.08], [0.2, 0.08, 0.3], { col: '#f9dcc8', soft: 0.03 }),
        ...[[0.12, 0.62, 0.18], [-0.1, 0.6, 0.12], [0.02, 0.64, -0.02]].map((c) => S(c, 0.022, { col: FOLD, soft: 0.006 })),
        S([0, 0.43, 0.545], 0.035, { col: '#c98a7a', soft: 0.006 })
      ],
      face: { eyeX: 0.12, eyeY: 0.58, eyeR: 0.07, mouthY: null, cheekX: 0.21, cheekY: 0.49 },
      hat: { lift: 0 }
    };
  },
  /** The Moon: a luna moth — a fuzzy cream body, feathery antennae, big pale-green tailed wings with eyespots. */
  lunamoth() {
    const b = chibiBody({ belly: '#fffbea', bodyR: [0.19, 0.21, 0.17] });
    return {
      color: '#f4f1dc', fur: 1, gloss: 0.15, wings: 'moth',
      bones: skeleton({ earL: ['head', -0.1, 0.92, 0.02], earR: ['head', 0.1, 0.92, 0.02], wingL: ['chest', -0.1, 0.46, -0.16], wingR: ['chest', 0.1, 0.46, -0.16] }),
      parts: [
        head([0, 0.68, 0], [0.31, 0.27, 0.28]),
        // A fluffy ruff round the neck.
        ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => S([Math.sin((i / 8) * Math.PI * 2) * 0.17, 0.45, Math.cos((i / 8) * Math.PI * 2) * 0.15], 0.075, { k: 0.05, bone: 'chest', col: '#ffffff' })),
        ...both(T([-0.1, 0.9, 0.02], [-0.22, 1.18, 0.1], 0.03, 0.02, { k: 0.02, bone: 'earL', col: '#b9a06a' }), E([-0.24, 1.2, 0.11], [0.05, 0.1, 0.025], { k: 0.02, bone: 'earL', col: '#d9c48a', rot: [0, 0, 0.5] })),
        ...b.parts
      ],
      paint: [...b.paint, ...both(E([-0.12, 0.75, 0.22], [0.06, 0.03, 0.03], { col: '#d9efc0', soft: 0.01 })), E([0, 0.3, -0.15], [0.14, 0.16, 0.08], { col: '#d6f0c2', soft: 0.02 })],
      face: { eyeX: 0.12, eyeY: 0.7, eyeR: 0.078, mouthY: 0.57, cheekX: 0.21, cheekY: 0.6 },
      hat: { lift: 0 }
    };
  },
  /** The Moon: an axolotl — pink, a wide smiley head with three feathery gill fronds each side, a finned tail. */
  axolotl() {
    const b = chibiBody({ belly: '#ffe3ea', bodyR: [0.19, 0.2, 0.17] });
    const GILL = '#ff6f9a';
    return {
      color: '#ffb7cb', gloss: 0.55,
      bones: skeleton({ earL: ['head', -0.3, 0.72, -0.02], earR: ['head', 0.3, 0.72, -0.02], tail: ['hips', 0, 0.2, -0.17], tail2: ['tail', 0, 0.22, -0.42] }),
      parts: [
        head([0, 0.67, 0.01], [0.37, 0.26, 0.28]),
        ...both(
          T([-0.3, 0.72, -0.02], [-0.47, 0.9, -0.05], 0.045, 0.03, { k: 0.02, bone: 'earL', col: GILL }),
          T([-0.32, 0.67, -0.03], [-0.52, 0.72, -0.06], 0.045, 0.03, { k: 0.02, bone: 'earL', col: GILL }),
          T([-0.3, 0.61, -0.03], [-0.47, 0.53, -0.06], 0.045, 0.03, { k: 0.02, bone: 'earL', col: GILL }),
          S([-0.47, 0.9, -0.05], 0.045, { k: 0.02, bone: 'earL', col: GILL }), S([-0.52, 0.72, -0.06], 0.045, { k: 0.02, bone: 'earL', col: GILL }), S([-0.47, 0.53, -0.06], 0.045, { k: 0.02, bone: 'earL', col: GILL })
        ),
        ...b.parts,
        T([0, 0.2, -0.16], [0, 0.22, -0.42], 0.1, 0.07, { k: 0.06, bone: 'tail' }),
        E([0, 0.25, -0.55], [0.03, 0.12, 0.16], { k: 0.05, bone: 'tail2' })
      ],
      paint: [...b.paint, ...[[0.18, 0.84, 0.12], [-0.2, 0.82, 0.1], [0.05, 0.9, -0.08], [0.1, 0.36, -0.12]].map((c) => S(c, 0.03, { col: '#ff8fb0', soft: 0.008 }))],
      face: { eyeX: 0.17, eyeY: 0.7, eyeR: 0.055, mouthY: 0.58, cheekX: 0.25, cheekY: 0.62 },
      hat: { lift: -0.02 }
    };
  },
  /** The Moon: a hamster — round and golden, a white tummy and muzzle, big puffy cheeks, tiny round ears. */
  hamster() {
    const b = chibiBody({ belly: '#fff6ea', bodyR: [0.23, 0.22, 0.2], legR: 0.065 });
    return {
      color: '#f2bd78', fur: 1, gloss: 0.15,
      bones: skeleton({ earL: ['head', -0.2, 0.9, -0.02], earR: ['head', 0.2, 0.9, -0.02] }),
      parts: [
        head([0, 0.66, 0], [0.34, 0.29, 0.29]),
        ...both(E([-0.2, 0.58, 0.13], [0.16, 0.13, 0.14], { k: 0.09, bone: 'head', col: '#fff6ea' })),
        E([0, 0.6, 0.24], [0.09, 0.06, 0.08], { k: 0.07, bone: 'head', col: '#fff6ea' }),
        ...both(E([-0.21, 0.91, -0.03], [0.075, 0.075, 0.04], { k: 0.04, bone: 'earL' })),
        ...b.parts,
        S([0, 0.22, -0.21], 0.045, { k: 0.03, bone: 'tail', col: '#fff6ea' })
      ],
      paint: [...b.paint, ...both(S([-0.21, 0.92, 0.0], 0.04, { col: PINK })), E([0, 0.625, 0.315], [0.03, 0.02, 0.03], { col: '#ff8a9a', soft: 0.004 }), E([0, 0.9, 0.14], [0.08, 0.05, 0.04], { col: '#d9944e', soft: 0.02 })],
      face: { eyeX: 0.12, eyeY: 0.7, eyeR: 0.066, mouthY: 0.56, cheekX: 0.22, cheekY: 0.6 },
      hat: { lift: 0 }
    };
  },
  /** The Moon: a little helper robot pup — a white boxy head with floppy teal ear panels, a snout, an LED face, a wagging antenna tail. */
  robopup() {
    const METAL = '#9aa6b8', TEAL = '#2fb8c4';
    return {
      color: '#eef2f8', gloss: 1, robot: true,
      bones: skeleton({ earL: ['head', -0.27, 0.84, -0.02], earR: ['head', 0.27, 0.84, -0.02], tail: ['hips', 0, 0.26, -0.18], tail2: ['tail', 0, 0.42, -0.28] }),
      parts: [
        B([0, 0.68, 0], [0.3, 0.24, 0.26], 0.14, { k: 0.04, bone: 'head' }),
        B([0, 0.6, 0.25], [0.13, 0.08, 0.08], 0.06, { k: 0.04, bone: 'head' }),
        S([0, 0.64, 0.34], 0.04, { k: 0.02, bone: 'head', col: '#2b2f3a' }),
        ...both(B([-0.3, 0.72, -0.02], [0.05, 0.14, 0.1], 0.04, { k: 0.02, bone: 'earL', col: TEAL, rot: [0, 0, 0.25] })),
        C([0, 0.42, 0], [0, 0.48, 0], 0.07, { k: 0.03, bone: 'chest', col: METAL }),
        B([0, 0.28, -0.02], [0.18, 0.15, 0.17], 0.09, { k: 0.04, bone: 'chest' }),
        ...both(C([-0.16, 0.36, 0.02], [-0.23, 0.24, 0.05], 0.04, { k: 0.03, bone: 'armL', col: METAL }), S([-0.24, 0.22, 0.06], 0.055, { k: 0.02, bone: 'armL', col: TEAL })),
        ...both(C([-0.09, 0.16, 0.0], [-0.1, 0.08, 0.02], 0.045, { k: 0.03, bone: 'legL', col: METAL }), B([-0.1, 0.045, 0.04], [0.07, 0.045, 0.09], 0.035, { k: 0.02, bone: 'legL', col: TEAL })),
        C([0, 0.26, -0.18], [0, 0.42, -0.28], 0.02, { k: 0.01, bone: 'tail', col: METAL }),
        S([0, 0.45, -0.3], 0.05, { k: 0.01, bone: 'tail2', col: '#ffb347' })
      ],
      paint: [
        B([0, 0.7, 0.2], [0.22, 0.12, 0.1], 0.08, { col: '#1d2a40', soft: 0.004 }),
        E([0, 0.3, 0.15], [0.09, 0.07, 0.04], { col: TEAL, soft: 0.004 }),
        S([0, 0.3, 0.17], 0.03, { col: '#ffd23f', soft: 0.003 })
      ],
      face: { eyeX: 0.1, eyeY: 0.72, eyeR: 0.06, mouthY: 0.63, cheekX: 0.19, cheekY: 0.64, style: 'led' },
      antenna: [0, 0.98, -0.05],
      hat: { lift: 0.02 }
    };
  },
  /** The Moon: a moon jelly — a glossy lavender bell with a frilly rim and four short wavy tentacle legs. */
  moonjelly() {
    const frill = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      frill.push(S([Math.sin(a) * 0.33, 0.43, Math.cos(a) * 0.31], 0.06, { k: 0.04, bone: 'head', col: '#e7dcff' }));
    }
    return {
      color: '#c8c2ff', gloss: 0.85,
      bones: skeleton({ head: ['chest', 0, 0.44, 0], earL: ['head', -0.1, 0.9, 0], earR: ['head', 0.1, 0.9, 0], armL: ['chest', -0.18, 0.36, 0.08], armR: ['chest', 0.18, 0.36, 0.08], legL: ['hips', -0.1, 0.3, 0.04], legR: ['hips', 0.1, 0.3, 0.04], tail: ['hips', 0, 0.3, -0.1] }),
      parts: [
        E([0, 0.62, 0], [0.36, 0.3, 0.33], { k: 0.12, bone: 'head' }),
        E([0, 0.45, 0], [0.32, 0.08, 0.3], { k: 0.08, bone: 'head', col: '#e7dcff' }),
        ...frill,
        ...both(C([-0.16, 0.4, 0.08], [-0.26, 0.24, 0.12], 0.045, { k: 0.04, bone: 'armL', col: '#e7dcff' }), S([-0.27, 0.22, 0.13], 0.05, { k: 0.03, bone: 'armL', col: '#e7dcff' })),
        ...both(C([-0.1, 0.4, 0.04], [-0.12, 0.2, 0.06], 0.05, { k: 0.04, bone: 'legL', col: '#e7dcff' }), C([-0.12, 0.2, 0.06], [-0.1, 0.04, 0.08], 0.045, { k: 0.03, bone: 'legL', col: '#e7dcff' })),
        ...both(C([-0.07, 0.4, -0.1], [-0.1, 0.12, -0.14], 0.04, { k: 0.03, bone: 'tail', col: '#e7dcff' }))
      ],
      paint: [
        // Four soft glowing rings on the bell, like a moon jelly's, and a sheen.
        ...[[0.13, 0.13], [-0.13, 0.13], [0.13, -0.13], [-0.13, -0.13]].map(([x, z]) => E([x, 0.86, z], [0.07, 0.03, 0.07], { col: '#fff0ff', soft: 0.015 })),
        E([0.1, 0.8, 0.22], [0.08, 0.05, 0.05], { col: '#ffffff', soft: 0.03 })
      ],
      face: { eyeX: 0.12, eyeY: 0.62, eyeR: 0.07, mouthY: 0.52, cheekX: 0.21, cheekY: 0.55 },
      hat: { lift: -0.02 }
    };
  },
  /**
   * The Moon's math teacher, Miss Mochi: the moon rabbit of the old East Asian story — snowy white,
   * very long ears (one flopped), a soft yellow collar, a little mortar of rice cakes in her arm and
   * a pestle in her paw, and a crescent-moon clip (not the lilac bunny sprite, who has wings).
   */
  moonrabbit() {
    const b = chibiBody({ belly: '#fffdf9' });
    const WOOD = '#b07a4a';
    return {
      color: '#f8f4ee', fur: 1, gloss: 0.2,
      bones: skeleton({ earL: ['head', -0.11, 0.9, -0.02], earR: ['head', 0.11, 0.9, -0.02] }),
      parts: [
        head([0, 0.67, 0], [0.33, 0.29, 0.29]),
        ...both(E([-0.18, 0.58, 0.14], [0.13, 0.1, 0.12], { k: 0.08, bone: 'head', col: '#fffdf9' })),
        // Long ears: the left one up, the right one flopping out to the side.
        T([-0.11, 0.88, -0.02], [-0.15, 1.4, -0.05], 0.08, 0.07, { k: 0.06, bone: 'earL' }),
        T([0.11, 0.88, -0.02], [0.32, 1.26, 0.04], 0.08, 0.07, { k: 0.06, bone: 'earR' }),
        ...b.parts,
        S([0, 0.24, -0.2], 0.09, { k: 0.04, bone: 'tail', col: '#ffffff' }),
        // The mortar in her left arm, a round rice cake on top; the pestle in her right paw.
        T([-0.23, 0.14, 0.2], [-0.23, 0.29, 0.21], 0.075, 0.105, { k: 0.01, bone: 'armL', col: WOOD }),
        E([-0.23, 0.33, 0.21], [0.085, 0.05, 0.085], { k: 0.004, bone: 'armL', col: '#ffffff' }),
        C([0.29, 0.22, 0.08], [0.34, 0.5, 0.13], 0.026, { k: 0.01, bone: 'armR', col: '#d1a374' }),
        S([0.345, 0.53, 0.135], 0.052, { k: 0.01, bone: 'armR', col: '#d1a374' })
      ],
      paint: [
        ...b.paint,
        E([-0.135, 1.13, 0.03], [0.04, 0.18, 0.04], { col: '#ffc2d1', rot: [0, 0, -0.08] }),
        E([0.215, 1.08, 0.075], [0.04, 0.16, 0.04], { col: '#ffc2d1', rot: [0, 0, 0.5] }),
        E([0, 0.615, 0.3], [0.03, 0.022, 0.03], { col: '#ff8fa8', soft: 0.004 }),
        // A soft yellow collar with a little coral bow, like a festival jacket.
        { s: 'disc', c: [0, 0.44, 0.0], r: [0.18, 0.03], rot: [Math.PI / 2, 0, 0], col: '#ffd36b', soft: 0.006 },
        ...both(E([-0.035, 0.41, 0.19], [0.035, 0.022, 0.02], { col: '#ff8fa3', soft: 0.004, rot: [0, 0, -0.35] })),
        S([0, 0.41, 0.2], 0.016, { col: '#ff6f8a', soft: 0.003 }),
        // The mortar's dark rim, and a pink dot of bean paste on the rice cake.
        S([-0.23, 0.375, 0.24], 0.02, { col: '#ff9ec0', soft: 0.004 })
      ],
      face: { eyeX: 0.125, eyeY: 0.69, eyeR: 0.072, mouthY: 0.565, cheekX: 0.2, cheekY: 0.6 },
      hat: { lift: 0, wear: 'crescent' }
    };
  },
  /**
   * The Moon's history teacher, Captain Ginger: a red panda, a retired space captain — rusty fur, a
   * white face with bushy white eyebrows, white-rimmed ears, dark legs and a big ringed tail, and his
   * star-badge captain's cap.
   */
  redpanda() {
    const RUST = '#d0612c', DARK = '#3b2420', WHITE = '#fff6ec';
    const b = chibiBody({ belly: '#9a4420', socks: DARK });
    return {
      color: RUST, fur: 1, gloss: 0.2,
      bones: skeleton({ earL: ['head', -0.22, 0.88, -0.02], earR: ['head', 0.22, 0.88, -0.02], tail: ['hips', 0, 0.2, -0.17], tail2: ['tail', 0.04, 0.38, -0.4] }),
      parts: [
        head([0, 0.68, 0], [0.36, 0.29, 0.3]),
        ...both(E([-0.2, 0.58, 0.13], [0.15, 0.11, 0.14], { k: 0.08, bone: 'head', col: WHITE })),
        E([0, 0.6, 0.24], [0.1, 0.07, 0.1], { k: 0.08, bone: 'head', col: WHITE }),
        ...both(T([-0.22, 0.86, -0.02], [-0.3, 1.04, -0.04], 0.1, 0.04, { k: 0.06, bone: 'earL' })),
        ...b.parts,
        C([0, 0.2, -0.17], [0.04, 0.38, -0.4], 0.12, { k: 0.07, bone: 'tail' }),
        C([0.04, 0.38, -0.4], [0.08, 0.6, -0.46], 0.12, { k: 0.06, bone: 'tail2' })
      ],
      paint: [
        ...b.paint,
        ...both(E([-0.25, 0.96, 0.02], [0.06, 0.075, 0.05], { col: WHITE })),
        // Bushy white eyebrows: he is a grandpa.
        ...both(E([-0.12, 0.83, 0.25], [0.07, 0.025, 0.04], { col: '#ffffff', soft: 0.006, rot: [0, 0, 0.25] })),
        E([0, 0.635, 0.335], [0.045, 0.03, 0.03], { col: INK, soft: 0.004 }),
        // Dark arms, and rings round the tail.
        ...both(S([-0.27, 0.27, 0.07], 0.07, { col: DARK, soft: 0.01 })),
        ...[[0.02, 0.3, -0.29], [0.05, 0.43, -0.41], [0.07, 0.55, -0.45]].map((c, i) => ({ s: 'disc', c, r: [0.16, 0.026], rot: [i === 0 ? 0.9 : 0.5, 0, 0], col: '#8f3a18', soft: 0.004 })),
        S([0.09, 0.66, -0.47], 0.07, { col: '#8f3a18' })
      ],
      face: { eyeX: 0.13, eyeY: 0.71, eyeR: 0.068, mouthY: 0.555, cheekX: 0.22, cheekY: 0.6 },
      hat: { lift: 0, wear: 'spacecap' }
    };
  },
  /**
   * The Moon's physics teacher, Dr. Comet: a koala astronaut-scientist — soft grey, big round fluffy
   * ears, a big dark nose, a cream tummy, and an astronaut headband with its gold visor flipped up.
   */
  koala() {
    const LIGHT = '#f1f2f5';
    const b = chibiBody({ belly: '#f4f1ec', bodyR: [0.22, 0.21, 0.19] });
    return {
      color: '#a9b0bc', fur: 1, gloss: 0.2,
      bones: skeleton({ earL: ['head', -0.3, 0.84, -0.02], earR: ['head', 0.3, 0.84, -0.02] }),
      parts: [
        head([0, 0.68, 0], [0.35, 0.29, 0.3]),
        // Big fluffy round ears.
        ...both(S([-0.34, 0.86, -0.02], 0.15, { k: 0.06, bone: 'earL' }), S([-0.41, 0.8, 0.0], 0.1, { k: 0.05, bone: 'earL' }), S([-0.38, 0.95, 0.0], 0.09, { k: 0.05, bone: 'earL' })),
        // The big dark nose.
        E([0, 0.63, 0.27], [0.075, 0.09, 0.06], { k: 0.03, bone: 'head', col: '#3a3d48' }),
        ...b.parts
      ],
      paint: [
        ...b.paint,
        ...both(S([-0.35, 0.86, 0.1], 0.1, { col: LIGHT, soft: 0.02 })),
        E([0, 0.54, 0.25], [0.12, 0.05, 0.08], { col: LIGHT, soft: 0.02 }),
        // A mission patch on the chest: a little star.
        S([-0.09, 0.36, 0.17], 0.035, { col: '#ff8a3d', soft: 0.004 })
      ],
      face: { eyeX: 0.15, eyeY: 0.73, eyeR: 0.06, mouthY: 0.52, cheekX: 0.23, cheekY: 0.6 },
      hat: { lift: 0, wear: 'visor' }
    };
  },
  /** The sea islands: a sea turtle with a domed teal shell and four flippers. */
  seaturtle() {
    return {
      color: '#7fd6c0', gloss: 0.4,
      bones: skeleton({ head: ['chest', 0, 0.46, 0.2], earL: ['head', -0.1, 0.85, 0.14], earR: ['head', 0.1, 0.85, 0.14], armL: ['chest', -0.3, 0.28, 0.16], armR: ['chest', 0.3, 0.28, 0.16], legL: ['hips', -0.22, 0.16, -0.24], legR: ['hips', 0.22, 0.16, -0.24], tail: ['hips', 0, 0.2, -0.38] }),
      parts: [
        E([0, 0.34, -0.06], [0.36, 0.22, 0.4], { k: 0.04, bone: 'chest', col: '#2f9d8b' }),
        E([0, 0.25, -0.05], [0.38, 0.06, 0.42], { k: 0.04, bone: 'chest', col: '#e9d9a8' }),
        C([0, 0.36, 0.2], [0, 0.5, 0.27], 0.1, { k: 0.06, bone: 'head' }),
        head([0, 0.68, 0.3], [0.25, 0.22, 0.23]),
        ...both(E([-0.36, 0.24, 0.18], [0.16, 0.035, 0.08], { k: 0.04, bone: 'armL', rot: [0, 0.5, -0.35] })),
        ...both(E([-0.24, 0.16, -0.32], [0.09, 0.03, 0.06], { k: 0.04, bone: 'legL', rot: [0, -0.4, 0] }))
      ],
      paint: [
        ...[[0, 0.55, -0.06], [0, 0.48, 0.18], [0, 0.46, -0.3], [-0.22, 0.47, -0.05], [0.22, 0.47, -0.05], [-0.17, 0.42, 0.17], [0.17, 0.42, 0.17], [-0.17, 0.42, -0.28], [0.17, 0.42, -0.28]].map((c) => S(c, 0.09, { col: '#4fbfa8', soft: 0.012 })),
        ...[[0.1, 0.8, 0.38], [-0.12, 0.77, 0.4], [0.18, 0.66, 0.42]].map((c) => S(c, 0.03, { col: '#4fb39a', soft: 0.006 }))
      ],
      face: { eyeX: 0.11, eyeY: 0.71, eyeR: 0.068, mouthY: 0.59, cheekX: 0.18, cheekY: 0.62 },
      hat: { lift: 0 }
    };
  }
};

/** Default body colour of a species. */
export const speciesColor = (s) => (SPECIES[s] ?? SPECIES.fox)().color;

/** Clothing for the history guides: a painted tunic and collar in the costume's colour. */
export function costumePaint(color) {
  return [
    E([0, 0.27, 0], [0.24, 0.17, 0.22], { col: color, soft: 0.01 }),
    { s: 'disc', c: [0, 0.44, 0.0], r: [0.17, 0.03], rot: [Math.PI / 2, 0, 0], col: color, soft: 0.006 }
  ];
}
