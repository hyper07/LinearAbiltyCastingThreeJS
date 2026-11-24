/**
 * Every creature in AI Arcademia as a sculpting recipe (sculpt.js): smooth
 * shapes tied to bones, paint for the markings, and where the face goes.
 * All original designs, one soft-vinyl-toy house style:
 *
 *   buddies    fox cub, little robot, dragonling, puffball, bunny sprite
 *   teachers   Professor Hoot (owl), Tock (tortoise), Gizmo (raccoon)
 *   townsfolk  frog, hedgehog, mouse, duck, bear, crab, penguin, lion, yeti
 *   the sea    octopus, seal, sea turtle (and the penguin and crab)
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
 *   hat   { lift, scale }  how a hat sits (scales by head size)
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
