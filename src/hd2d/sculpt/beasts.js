/**
 * Lanternwood's monsters as soft vinyl toys — cute, but plainly out to get
 * you: angry brows, eyes that glow, fangs. Each kind keeps the silhouette idea
 * of its old pixel figure (a wolf with an ember ridge, a jelly slime, a golem
 * of rock with lava in the cracks …), sculpted from smooth shapes (sdf.js) on
 * a small skeleton whose bones carry the roles beasts.js animated: 'leg'
 * (steps), 'arm' (raised on a wind-up, brought down in the strike), 'wing'
 * (flaps), 'head' (nods, looks at its target), 'tail' (wags), 'spin' (circles
 * the body), 'sway' (a flame, a hem). The root bone is the body itself.
 *
 * Pure data: no three.js. BEAST_RECIPES[kind](seed) → { slots, palette, glows,
 * bones, roles, parts, paint, face, height, type, gloss, fur, res }. A seed
 * only nudges small things (a tuft, a spot), so a kind keeps one look; the
 * recipe is the same for the same seed.
 * Units: metres, feet at y = 0, facing +Z.
 */

const S = (c, r, o = {}) => ({ s: 'sph', c, r, ...o });
const E = (c, r, o = {}) => ({ s: 'ell', c, r, ...o });
const C = (a, b, r, o = {}) => ({ s: 'cap', a, b, r, ...o });
const T = (a, b, ra, rb, o = {}) => ({ s: 'taper', a, b, r: [ra, rb], ...o });
const B = (c, r, round, o = {}) => ({ s: 'box', c, r, round, ...o });
const D = (c, r, th, o = {}) => ({ s: 'disc', c, r: [r, th], ...o });
const flipX = (v) => (Array.isArray(v) && v.length === 3 && typeof v[0] === 'number' ? [-v[0], v[1], v[2]] : v);
/** A shape on the −X side and its mirror; bone names ending in L become R. */
function pair(shape) {
  const m = { ...shape };
  for (const k of ['c', 'a', 'b']) if (m[k]) m[k] = flipX(m[k]);
  if (m.rot) m.rot = [m.rot[0], -m.rot[1], -m.rot[2]];
  if (typeof m.bone === 'string' && m.bone.endsWith('L')) m.bone = `${m.bone.slice(0, -1)}R`;
  return [shape, m];
}
const both = (...shapes) => shapes.flatMap(pair);
/** A bone on the −X side (its name ending L, at −x) and its mirror on +X (R). */
const boneBoth = (name, parent, x, y, z) => [[name, parent, -Math.abs(x), y, z], [`${name.slice(0, -1)}R`, parent, Math.abs(x), y, z]];

/** A small seeded stream (the same seed, the same numbers). */
export function seeded(seed = 1) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every beast's colour slots, in palette order. */
export const BEAST_SLOTS = ['body', 'belly', 'dark', 'accent', 'horn', 'glow', 'extra', 'eye'];

/* ---------------------------------------------------------------- shared bodies */

/**
 * A chibi four-legged beast (wolf, icefang, boar, salamander): a big head out
 * front, a bean of a body, four stubby legs that trot, a tail.
 * o: { len, h, headR, snout, legR, tail: 'fluffy' | 'long' | 'stub' }
 */
function quadruped(o = {}) {
  const len = o.len ?? 0.4, h = o.h ?? 0.5, hr = o.headR ?? [0.33, 0.29, 0.3], legR = o.legR ?? 0.075, legX = o.legX ?? 0.17;
  const hz = len + 0.04, hy = h + 0.3;
  const bones = [
    ['body', null, 0, h, 0],
    ['head', 'body', 0, h + 0.14, len - 0.08],
    ...boneBoth('legFL', 'body', legX, h - 0.1, len * 0.55),
    ...boneBoth('legBL', 'body', legX, h - 0.1, -len * 0.7),
    ['tail', 'body', 0, h + 0.06, -len - 0.02]
  ];
  const roles = { head: { role: 'head' }, legFL: { role: 'leg', phase: 0 }, legFR: { role: 'leg', phase: Math.PI }, legBL: { role: 'leg', phase: Math.PI }, legBR: { role: 'leg', phase: 0 }, tail: { role: 'tail' } };
  const parts = [
    E([0, h, -0.04], [0.27, 0.24, len], { k: 0.1, bone: 'body' }),
    E([0, h + 0.05, len * 0.45], [0.28, 0.27, 0.25], { k: 0.1, bone: 'body' }),
    E([0, hy, hz], hr, { k: 0.1, bone: 'head' }),
    ...both(
      C([-legX, h - 0.05, len * 0.55], [-legX, 0.09, len * 0.6], legR, { k: 0.05, bone: 'legFL' }),
      E([-legX, 0.055, len * 0.6 + 0.04], [legR * 1.15, 0.055, legR * 1.4], { k: 0.04, bone: 'legFL', col: 'dark' }),
      C([-legX, h - 0.05, -len * 0.7], [-legX, 0.09, -len * 0.72], legR * 1.05, { k: 0.05, bone: 'legBL' }),
      E([-legX, 0.055, -len * 0.72 + 0.04], [legR * 1.2, 0.055, legR * 1.4], { k: 0.04, bone: 'legBL', col: 'dark' })
    )
  ];
  if (o.tail === 'long') parts.push(T([0, h, -len - 0.05], [0, h - 0.18, -len - 0.62], 0.13, 0.03, { k: 0.06, bone: 'tail' }));
  else if (o.tail === 'stub') parts.push(S([0, h + 0.08, -len - 0.06], 0.08, { k: 0.04, bone: 'tail' }));
  else parts.push(C([0, h + 0.05, -len - 0.04], [0, h + 0.32, -len - 0.24], 0.1, { k: 0.06, bone: 'tail' }), S([0, h + 0.38, -len - 0.28], 0.12, { k: 0.06, bone: 'tail', col: 'belly' }));
  return { bones, roles, parts, head: { c: [0, hy, hz], r: hr }, h, len };
}

/* ---------------------------------------------------------------- the kinds */

export const BEAST_RECIPES = {
  wolf(seed = 1) {
    const rnd = seeded(seed);
    const q = quadruped({ len: 0.4, h: 0.48 });
    const [, hy, hz] = q.head.c;
    return {
      type: 'quad', height: 1.1, gloss: 0.25, fur: 1,
      slots: BEAST_SLOTS,
      palette: ['#6a6a7c', '#d4d2dc', '#2c2c38', '#ff7a2a', '#f4ecd8', '#ffb347', '#3a3a48', '#ffb347'],
      glows: [0, 0, 0, 0.55, 0, 1, 0, 0],
      bones: q.bones, roles: q.roles,
      parts: [
        ...q.parts,
        E([0, hy - 0.11, hz + 0.25], [0.15, 0.115, 0.15], { k: 0.07, bone: 'head', col: 'belly' }),
        ...both(E([-0.22, hy - 0.08, hz + 0.08], [0.13, 0.11, 0.12], { k: 0.07, bone: 'head', col: 'belly' })),
        ...both(T([-0.18, hy + 0.2, hz - 0.08], [-0.26 - rnd() * 0.02, hy + 0.47, hz - 0.12], 0.11, 0.022, { k: 0.05, bone: 'head' })),
        // The ember ridge: flame tufts down the neck and back.
        ...[0, 1, 2, 3].map((i) => T([0, q.h + 0.2 - i * 0.02, 0.22 - i * 0.16], [0, q.h + 0.36 - i * 0.04, 0.12 - i * 0.18], 0.07, 0.015, { k: 0.04, bone: i ? 'body' : 'head', col: 'accent', glow: 0.5 }))
      ],
      paint: [
        S([0, hy - 0.04, hz + 0.39], 0.05, { col: 'dark', soft: 0.004 }),
        ...both(E([-0.22, hy + 0.37, hz - 0.05], [0.045, 0.08, 0.04], { col: 'dark' })),
        E([0, q.h - 0.12, 0.05], [0.2, 0.12, 0.34], { col: 'belly', soft: 0.02 })
      ],
      face: { eyeX: 0.135, eyeY: hy + 0.06, eyeR: 0.072, mouthY: hy - 0.17, mouthW: 0.9, browY: hy + 0.2, hostile: true, eyeGlow: '#ffb347', fangs: true },
      res: 1
    };
  },
  icefang(seed = 2) {
    const w = BEAST_RECIPES.wolf(seed);
    const q = quadruped({ len: 0.42, h: 0.5 });
    return {
      ...w, height: 1.2, gloss: 0.45,
      palette: ['#c4d6ea', '#f4faff', '#2a3a5a', '#7ad8ff', '#e8f6ff', '#7ae8ff', '#5a7aa8', '#7ae8ff'],
      glows: [0, 0, 0, 0.35, 0, 1, 0, 0],
      bones: q.bones, roles: q.roles,
      // Ice crystals instead of flames on the ridge.
      parts: w.parts.map((p) => (p.col === 'accent' ? { ...p, r: [0.075, 0.01], col: 'accent', sheen: 1, glow: 0.3 } : p)),
      face: { ...w.face, eyeGlow: '#7ae8ff' }
    };
  },
  slime(seed = 3) {
    const rnd = seeded(seed);
    return {
      type: 'blob', height: 0.9, gloss: 1, fur: 0,
      slots: BEAST_SLOTS,
      palette: ['#7a5ac0', '#b8a0f0', '#3a2a6a', '#e0d4ff', '#ffffff', '#ffe14a', '#5a4098', '#ffe14a'],
      glows: [0.04, 0.08, 0, 0.1, 0, 1, 0, 0],
      bones: [['body', null, 0, 0.3, 0], ['top', 'body', 0, 0.62, -0.02]],
      roles: { top: { role: 'sway' } },
      parts: [
        E([0, 0.36, 0], [0.47, 0.37, 0.44], { k: 0.12, bone: 'body' }),
        E([0, 0.13, 0], [0.53, 0.13, 0.49], { k: 0.12, bone: 'body' }),
        S([0, 0.68, -0.03], 0.17, { k: 0.12, bone: 'top' }),
        T([0, 0.78, -0.04], [0.05 + rnd() * 0.04, 0.98, -0.1], 0.1, 0.025, { k: 0.08, bone: 'top' })
      ],
      paint: [
        E([-0.17, 0.62, 0.22], [0.12, 0.08, 0.12], { col: 'accent', tone: 1.1, soft: 0.04 }),
        E([0, 0.08, 0], [0.56, 0.06, 0.52], { col: 'dark', soft: 0.05 })
      ],
      face: { eyeX: 0.16, eyeY: 0.42, eyeR: 0.09, mouthY: 0.27, mouthW: 0.8, browY: 0.56, hostile: true, eyeGlow: '#ffe14a', fangs: true },
      res: 0.8
    };
  },
  golem(seed = 4) {
    const rnd = seeded(seed);
    const cracks = [];
    for (let i = 0; i < 7; i++) {
      const y = 0.75 + rnd() * 0.9, x = (rnd() - 0.5) * 0.9;
      cracks.push(E([x, y, 0.42], [0.18 + rnd() * 0.12, 0.022, 0.12], { rot: [0, 0, (rnd() - 0.5) * 1.6], col: 'glow', glow: 1.2, soft: 0.006 }));
      cracks.push(E([x * 0.9, y, -0.4], [0.16 + rnd() * 0.1, 0.022, 0.12], { rot: [0, 0, (rnd() - 0.5) * 1.6], col: 'glow', glow: 1.2, soft: 0.006 }));
    }
    return {
      type: 'walker', heavy: true, height: 2.2, gloss: 0.15, fur: 0,
      slots: BEAST_SLOTS,
      palette: ['#4a4046', '#5e5258', '#2a2228', '#ff8a2a', '#3a3034', '#ff8a2a', '#ffe060', '#ffe060'],
      glows: [0, 0, 0, 0.7, 0, 1.3, 1.3, 0],
      bones: [
        ['body', null, 0, 0.7, 0],
        ['head', 'body', 0, 1.62, 0.08],
        ...boneBoth('armL', 'body', 0.66, 1.48, 0),
        ...boneBoth('legL', null, 0.29, 0.55, 0)
      ],
      roles: { head: { role: 'head' }, armL: { role: 'arm' }, armR: { role: 'arm' }, legL: { role: 'leg', phase: 0 }, legR: { role: 'leg', phase: Math.PI } },
      parts: [
        B([0, 1.18, 0], [0.6, 0.52, 0.44], 0.3, { k: 0.12, bone: 'body' }),
        B([0, 0.72, 0], [0.44, 0.24, 0.34], 0.18, { k: 0.12, bone: 'body', col: 'belly' }),
        E([0, 1.8, 0.14], [0.3, 0.25, 0.27], { k: 0.12, bone: 'head' }),
        E([0, 1.9, 0.2], [0.33, 0.08, 0.2], { k: 0.06, bone: 'head', col: 'dark' }),
        ...both(
          S([-0.66, 1.52, 0], 0.29, { k: 0.08, bone: 'armL', col: 'belly' }),
          T([-0.72, 1.4, 0], [-0.8, 0.9, 0.08], 0.2, 0.17, { k: 0.08, bone: 'armL' }),
          S([-0.82, 0.68, 0.12], 0.28, { k: 0.08, bone: 'armL', col: 'belly' }),
          C([-0.29, 0.55, 0], [-0.3, 0.17, 0.02], 0.2, { k: 0.08, bone: 'legL' }),
          E([-0.3, 0.11, 0.08], [0.25, 0.12, 0.3], { k: 0.06, bone: 'legL', col: 'dark' })
        )
      ],
      paint: [
        ...cracks,
        S([0, 1.22, 0.44], 0.13, { col: 'extra', glow: 1.4, soft: 0.02 }),
        ...both(E([-0.82, 0.68, 0.36], [0.16, 0.02, 0.1], { col: 'glow', glow: 1.1, rot: [0, 0, 0.5], soft: 0.006 }))
      ],
      face: { eyeX: 0.11, eyeY: 1.79, eyeR: 0.075, mouthY: 1.66, mouthW: 1.0, browY: 1.92, hostile: true, eyeGlow: '#ffe060', fangs: true },
      res: 1.0
    };
  },
  wisp() {
    return {
      type: 'float', height: 1.0, gloss: 0.6, fur: 0.6,
      slots: BEAST_SLOTS,
      palette: ['#3fb0c8', '#a6f0ec', '#14506a', '#e8fff8', '#ffffff', '#b8fff6', '#6ad8e0', '#e8fffc'],
      glows: [0.45, 0.6, 0, 0.9, 0, 1, 0.5, 0],
      bones: [['body', null, 0, 0.45, 0], ['flame', 'body', 0, 0.68, -0.02], ...boneBoth('armL', 'body', 0.28, 0.42, 0.04)],
      roles: { flame: { role: 'sway' }, armL: { role: 'arm' }, armR: { role: 'arm' } },
      parts: [
        E([0, 0.45, 0], [0.31, 0.32, 0.29], { k: 0.12, bone: 'body' }),
        T([0, 0.62, -0.02], [0.05, 1.02, -0.1], 0.24, 0.02, { k: 0.12, bone: 'flame' }),
        T([-0.12, 0.62, -0.04], [-0.22, 0.86, -0.08], 0.1, 0.02, { k: 0.08, bone: 'flame' }),
        T([0, 0.25, -0.02], [0.06, 0.04, -0.1], 0.16, 0.02, { k: 0.1, bone: 'body' }),
        ...both(S([-0.32, 0.4, 0.05], 0.075, { k: 0.06, bone: 'armL', col: 'belly' }))
      ],
      paint: [E([0, 0.42, 0.18], [0.2, 0.2, 0.14], { col: 'belly', soft: 0.06 }), E([0.04, 0.95, -0.08], [0.1, 0.1, 0.1], { col: 'accent', soft: 0.05 })],
      face: { eyeX: 0.12, eyeY: 0.5, eyeR: 0.075, mouthY: 0.36, mouthW: 0.8, browY: 0.63, hostile: true, eyeGlow: '#e8fffc', fangs: true },
      res: 1
    };
  },
  thornling(seed = 5) {
    const rnd = seeded(seed);
    const thorns = [];
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + rnd() * 0.3, el = (rnd() - 0.3) * 1.1;
      const d = [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el) * 0.9];
      if (d[2] > 0.55 && Math.abs(d[1]) < 0.4) continue; // keep the face clear
      thorns.push(T([d[0] * 0.26, 0.45 + d[1] * 0.26, d[2] * 0.26], [d[0] * 0.44, 0.45 + d[1] * 0.44, d[2] * 0.44], 0.06, 0.01, { k: 0.03, bone: 'body', col: 'horn' }));
    }
    return {
      type: 'walker', height: 0.8, gloss: 0.25, fur: 0.3,
      slots: BEAST_SLOTS,
      palette: ['#4a7a34', '#7ab050', '#24401a', '#8ad050', '#f0e6cc', '#ffd27a', '#6a4428', '#ffd27a'],
      glows: [0, 0, 0, 0, 0, 1, 0, 0],
      bones: [['body', null, 0, 0.42, 0], ['top', 'body', 0, 0.72, 0], ...boneBoth('legL', null, 0.12, 0.22, 0)],
      roles: { top: { role: 'sway' }, legL: { role: 'leg', phase: 0 }, legR: { role: 'leg', phase: Math.PI } },
      parts: [
        S([0, 0.45, 0], 0.3, { k: 0.08, bone: 'body' }),
        ...thorns,
        D([0.05, 0.8, 0], 0.12, 0.018, { k: 0.04, bone: 'top', col: 'accent', rot: [1.2, 0.3, 0.4] }),
        C([0, 0.72, 0], [0.02, 0.8, 0], 0.025, { k: 0.02, bone: 'top', col: 'extra' }),
        ...both(C([-0.12, 0.22, 0], [-0.13, 0.06, 0.02], 0.055, { k: 0.04, bone: 'legL', col: 'extra' }), E([-0.13, 0.04, 0.05], [0.07, 0.04, 0.09], { k: 0.03, bone: 'legL', col: 'dark' }))
      ],
      paint: [E([0, 0.38, 0.2], [0.18, 0.14, 0.12], { col: 'belly', soft: 0.04 })],
      face: { eyeX: 0.11, eyeY: 0.5, eyeR: 0.07, mouthY: 0.37, mouthW: 0.8, browY: 0.62, hostile: true, eyeGlow: '#ffd27a', fangs: true },
      res: 0.85
    };
  },
  mossback(seed = 6) {
    const rnd = seeded(seed);
    const tufts = Array.from({ length: 6 }, () => S([(rnd() - 0.5) * 0.7, 1.22 + rnd() * 0.06, (rnd() - 0.6) * 0.7], 0.13, { k: 0.08, bone: 'body', col: 'accent', tone: 1.15 }));
    return {
      type: 'walker', heavy: true, height: 1.4, gloss: 0.2, fur: 0.3,
      slots: BEAST_SLOTS,
      palette: ['#7a7a68', '#a8a890', '#3a3a34', '#4a8a4a', '#f0e6cc', '#ffd27a', '#8ac050', '#ffd27a'],
      glows: [0, 0, 0, 0, 0, 1, 0, 0],
      bones: [['body', null, 0, 0.7, 0], ['head', 'body', 0, 0.68, 0.45], ...boneBoth('legFL', 'body', 0.42, 0.42, 0.3), ...boneBoth('legBL', 'body', 0.42, 0.42, -0.3)],
      roles: { head: { role: 'head' }, legFL: { role: 'leg', phase: 0 }, legFR: { role: 'leg', phase: Math.PI }, legBL: { role: 'leg', phase: Math.PI }, legBR: { role: 'leg', phase: 0 } },
      parts: [
        E([0, 0.86, -0.05], [0.66, 0.46, 0.62], { k: 0.06, bone: 'body', col: 'accent' }),
        E([0, 0.58, 0.05], [0.6, 0.24, 0.56], { k: 0.08, bone: 'body' }),
        ...tufts,
        E([0, 0.74, 0.62], [0.32, 0.27, 0.27], { k: 0.1, bone: 'head' }),
        ...both(
          C([-0.42, 0.45, 0.3], [-0.44, 0.1, 0.32], 0.15, { k: 0.06, bone: 'legFL' }), E([-0.44, 0.07, 0.36], [0.17, 0.08, 0.2], { k: 0.04, bone: 'legFL', col: 'dark' }),
          C([-0.42, 0.45, -0.3], [-0.44, 0.1, -0.32], 0.15, { k: 0.06, bone: 'legBL' }), E([-0.44, 0.07, -0.28], [0.17, 0.08, 0.2], { k: 0.04, bone: 'legBL', col: 'dark' })
        )
      ],
      paint: [
        ...Array.from({ length: 7 }, (_, i) => S([Math.sin(i * 0.9) * 0.45, 1.05 + Math.cos(i * 1.7) * 0.12, 0.3 * Math.cos(i * 0.9) - 0.1], 0.12, { col: 'extra', soft: 0.02 })),
        E([0, 0.66, 0.8], [0.14, 0.08, 0.1], { col: 'belly', soft: 0.03 })
      ],
      face: { eyeX: 0.13, eyeY: 0.8, eyeR: 0.07, mouthY: 0.64, mouthW: 0.9, browY: 0.93, hostile: true, eyeGlow: '#ffd27a', fangs: true },
      res: 0.9
    };
  },
  lampwight() {
    return {
      type: 'float', height: 2.45, gloss: 0.4, fur: 0.2,
      slots: BEAST_SLOTS,
      palette: ['#2c2046', '#3e2e5e', '#120c1c', '#d8a83a', '#8a92a0', '#7ab0d0', '#e8fff8', '#e8fffc'],
      glows: [0, 0, 0, 0.2, 0, 0.45, 1, 0], outline: '#6ad8ff',
      bones: [['body', null, 0, 1.3, 0], ['head', 'body', 0, 1.7, 0], ['hem', 'body', 0, 0.8, 0], ...boneBoth('armL', 'body', 0.48, 1.5, 0)],
      roles: { head: { role: 'head' }, hem: { role: 'sway' }, armL: { role: 'arm' }, armR: { role: 'arm' } },
      parts: [
        T([0, 1.5, 0], [0, 0.95, 0], 0.4, 0.62, { k: 0.15, bone: 'body' }),
        T([0, 0.95, 0], [0, 0.72, 0], 0.62, 0.72, { k: 0.15, bone: 'hem' }),
        E([0, 1.55, -0.02], [0.62, 0.22, 0.5], { k: 0.12, bone: 'body', col: 'belly' }),
        B([0, 2.02, 0.03], [0.38, 0.4, 0.36], 0.14, { k: 0.04, bone: 'head', col: 'horn', sheen: 0.8 }),
        T([0, 2.38, 0.03], [0, 2.72, 0.03], 0.44, 0.05, { k: 0.04, bone: 'head', col: 'dark' }),
        D([0, 2.82, 0.03], 0.1, 0.03, { k: 0.02, bone: 'head', col: 'accent', sheen: 0.8 }),
        D([0, 1.66, 0.03], 0.42, 0.04, { k: 0.04, bone: 'head', col: 'accent', sheen: 0.8, rot: [Math.PI / 2, 0, 0] }),
        ...both(
          T([-0.5, 1.5, 0], [-0.82, 0.95, 0.18], 0.1, 0.07, { k: 0.06, bone: 'armL', col: 'belly' }),
          E([-0.86, 0.86, 0.2], [0.13, 0.15, 0.13], { k: 0.05, bone: 'armL', col: 'horn' })
        )
      ],
      paint: [
        B([0, 2.02, 0.4], [0.3, 0.32, 0.05], 0.06, { col: 'glow', glow: 0.35, soft: 0.006 }),
        ...both(B([-0.38, 2.02, 0.03], [0.05, 0.32, 0.28], 0.06, { col: 'glow', glow: 0.35, soft: 0.006 })),
        E([0, 0.72, 0], [0.74, 0.05, 0.74], { col: 'accent', soft: 0.01 })
      ],
      face: { eyeX: 0.13, eyeY: 2.06, eyeR: 0.09, mouthY: 1.88, mouthW: 1.0, browY: 2.25, hostile: true, eyeGlow: '#ffffff', fangs: true },
      res: 1.2
    };
  },
  burrowmole() {
    return {
      type: 'walker', height: 1.0, gloss: 0.2, fur: 1,
      slots: BEAST_SLOTS,
      palette: ['#7a5a44', '#c8a080', '#3a2a20', '#e0a090', '#f4ecd8', '#ffd27a', '#d06070', '#ffd27a'],
      glows: [0, 0, 0, 0, 0, 1, 0, 0],
      bones: [['body', null, 0, 0.45, 0], ['head', 'body', 0, 0.6, 0.15], ...boneBoth('armL', 'body', 0.36, 0.52, 0.1), ...boneBoth('legL', null, 0.18, 0.2, 0)],
      roles: { head: { role: 'head' }, armL: { role: 'arm' }, armR: { role: 'arm' }, legL: { role: 'leg', phase: 0 }, legR: { role: 'leg', phase: Math.PI } },
      parts: [
        E([0, 0.46, -0.02], [0.4, 0.4, 0.36], { k: 0.1, bone: 'body' }),
        E([0, 0.7, 0.1], [0.32, 0.26, 0.28], { k: 0.12, bone: 'head' }),
        E([0, 0.6, 0.36], [0.16, 0.12, 0.14], { k: 0.06, bone: 'head', col: 'accent' }),
        S([0, 0.63, 0.5], 0.055, { k: 0.03, bone: 'head', col: 'extra' }),
        ...both(
          C([-0.36, 0.52, 0.1], [-0.5, 0.36, 0.26], 0.1, { k: 0.05, bone: 'armL' }),
          E([-0.52, 0.33, 0.3], [0.13, 0.08, 0.12], { k: 0.04, bone: 'armL', col: 'accent' }),
          ...[-1, 0, 1].map((i) => T([-0.52 + i * 0.06, 0.32, 0.36], [-0.54 + i * 0.08, 0.26, 0.5], 0.035, 0.01, { k: 0.015, bone: 'armL', col: 'horn' })),
          C([-0.18, 0.2, 0], [-0.18, 0.08, 0.04], 0.09, { k: 0.04, bone: 'legL' }), E([-0.18, 0.05, 0.08], [0.11, 0.05, 0.12], { k: 0.03, bone: 'legL', col: 'accent' })
        )
      ],
      paint: [E([0, 0.38, 0.28], [0.26, 0.24, 0.14], { col: 'belly', soft: 0.04 }), ...both(E([-0.04, 0.5, 0.42], [0.025, 0.04, 0.03], { col: 'horn', soft: 0.004 }))],
      face: { eyeX: 0.13, eyeY: 0.76, eyeR: 0.06, mouthY: 0.52, mouthW: 0.8, browY: 0.86, hostile: true, eyeGlow: '#ffd27a', fangs: true },
      res: 1
    };
  },
  hornet() {
    return {
      type: 'flier', flap: 38, amp: 0.55, height: 0.85, gloss: 0.45, fur: 0.6,
      slots: BEAST_SLOTS,
      palette: ['#f0c030', '#ffe080', '#2a1c12', '#dff4ff', '#2a1c12', '#ff8a3a', '#ffffff', '#ff8a3a'],
      glows: [0, 0, 0, 0.1, 0, 1, 0, 0],
      bones: [['body', null, 0, 0.45, 0], ['head', 'body', 0, 0.5, 0.15], ['tail', 'body', 0, 0.42, -0.2], ...boneBoth('wingL', 'body', 0.12, 0.66, -0.05)],
      roles: { head: { role: 'head' }, tail: { role: 'tail' }, wingL: { role: 'wing' }, wingR: { role: 'wing' } },
      parts: [
        E([0, 0.52, 0.1], [0.3, 0.29, 0.27], { k: 0.1, bone: 'head' }),
        E([0, 0.42, -0.22], [0.25, 0.25, 0.3], { k: 0.1, bone: 'tail' }),
        T([0, 0.36, -0.5], [0, 0.3, -0.72], 0.07, 0.01, { k: 0.04, bone: 'tail', col: 'dark' }),
        ...both(
          T([-0.1, 0.76, 0.2], [-0.2, 0.96, 0.32], 0.022, 0.014, { k: 0.02, bone: 'head', col: 'dark' }), S([-0.2, 0.97, 0.33], 0.045, { k: 0.02, bone: 'head', col: 'dark' }),
          E([-0.36, 0.78, -0.12], [0.26, 0.1, 0.014], { k: 0.02, bone: 'wingL', col: 'accent', rot: [0.2, 0.2, 0.45], tone: 1.1 }),
          C([-0.1, 0.25, 0.02], [-0.12, 0.12, 0.06], 0.03, { k: 0.02, bone: 'body', col: 'dark' })
        )
      ],
      paint: [
        ...[-0.14, -0.3].map((z) => E([0, 0.42, z], [0.3, 0.3, 0.045], { col: 'dark', soft: 0.008 })),
        E([0, 0.38, 0.28], [0.18, 0.12, 0.08], { col: 'belly', soft: 0.03 })
      ],
      face: { eyeX: 0.115, eyeY: 0.57, eyeR: 0.072, mouthY: 0.42, mouthW: 0.8, browY: 0.7, hostile: true, eyeGlow: '#ff8a3a', fangs: true },
      res: 1
    };
  },
  thornboar(seed = 7) {
    const rnd = seeded(seed);
    const q = quadruped({ len: 0.52, h: 0.56, headR: [0.38, 0.33, 0.32], legR: 0.09, legX: 0.22, tail: 'stub' });
    const [, hy, hz] = q.head.c;
    return {
      type: 'quad', height: 1.3, gloss: 0.2, fur: 0.9,
      slots: BEAST_SLOTS,
      palette: ['#7a4a34', '#b08060', '#3a2a20', '#5a8a3a', '#f4ecd8', '#ff8a3a', '#c08070', '#ff8a3a'],
      glows: [0, 0, 0, 0, 0, 1, 0, 0],
      bones: q.bones, roles: q.roles,
      parts: [
        ...q.parts,
        E([0, hy - 0.12, hz + 0.3], [0.19, 0.15, 0.13], { k: 0.06, bone: 'head', col: 'extra' }),
        ...both(
          T([-0.15, hy - 0.2, hz + 0.3], [-0.24, hy + 0.0, hz + 0.44], 0.045, 0.012, { k: 0.02, bone: 'head', col: 'horn' }),
          E([-0.3, hy + 0.25, hz - 0.08], [0.06, 0.12, 0.09], { k: 0.04, bone: 'head', rot: [0, 0, -0.5] })
        ),
        ...Array.from({ length: 6 }, (_, i) => T([0, q.h + 0.2 - Math.abs(i - 1) * 0.02, 0.3 - i * 0.16], [(rnd() - 0.5) * 0.08, q.h + 0.42, 0.22 - i * 0.17], 0.065, 0.01, { k: 0.03, bone: i ? 'body' : 'head', col: 'accent' }))
      ],
      paint: [...both(E([-0.06, hy - 0.08, hz + 0.43], [0.03, 0.04, 0.03], { col: 'dark', soft: 0.004 })), E([0, q.h - 0.15, 0.05], [0.24, 0.12, 0.4], { col: 'belly', soft: 0.03 })],
      face: { eyeX: 0.16, eyeY: hy + 0.08, eyeR: 0.07, mouthY: hy - 0.26, mouthW: 1.0, browY: hy + 0.22, hostile: true, eyeGlow: '#ff8a3a', fangs: true },
      res: 1
    };
  },
  shroomkin(seed = 8) {
    const rnd = seeded(seed);
    const spots = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + rnd() * 0.4;
      return S([Math.cos(a) * 0.36, 1.12 + rnd() * 0.08, Math.sin(a) * 0.34], 0.09 + rnd() * 0.03, { col: 'horn', soft: 0.008 });
    });
    return {
      type: 'walker', height: 1.3, gloss: 0.45, fur: 0,
      slots: BEAST_SLOTS,
      palette: ['#d04a3a', '#f0e0c0', '#8a6a4a', '#5aa04a', '#fff4e0', '#9aff6a', '#e8c8a0', '#9aff6a'],
      glows: [0, 0, 0, 0, 0, 1, 0, 0],
      bones: [['body', null, 0, 0.4, 0], ['head', 'body', 0, 0.6, 0], ...boneBoth('armL', 'body', 0.24, 0.5, 0), ...boneBoth('legL', null, 0.12, 0.22, 0)],
      roles: { head: { role: 'head' }, armL: { role: 'arm' }, armR: { role: 'arm' }, legL: { role: 'leg', phase: 0 }, legR: { role: 'leg', phase: Math.PI } },
      parts: [
        E([0, 1.06, -0.01], [0.58, 0.3, 0.55], { k: 0.06, bone: 'head' }),
        E([0, 0.86, 0], [0.52, 0.08, 0.5], { k: 0.06, bone: 'head', col: 'extra' }),
        E([0, 0.7, 0.02], [0.3, 0.27, 0.28], { k: 0.08, bone: 'head', col: 'belly' }),
        E([0, 0.4, 0], [0.25, 0.21, 0.22], { k: 0.08, bone: 'body', col: 'belly' }),
        ...both(
          C([-0.24, 0.5, 0], [-0.38, 0.32, 0.05], 0.06, { k: 0.04, bone: 'armL', col: 'accent' }),
          E([-0.4, 0.28, 0.07], [0.08, 0.05, 0.12], { k: 0.03, bone: 'armL', col: 'accent', rot: [0.3, 0, 0.4] }),
          C([-0.12, 0.22, 0], [-0.12, 0.08, 0.02], 0.08, { k: 0.04, bone: 'legL', col: 'dark' }),
          E([-0.12, 0.05, 0.05], [0.09, 0.05, 0.11], { k: 0.03, bone: 'legL', col: 'dark', tone: 0.8 })
        )
      ],
      paint: spots,
      face: { eyeX: 0.12, eyeY: 0.72, eyeR: 0.07, mouthY: 0.58, mouthW: 0.8, browY: 0.82, hostile: true, eyeGlow: '#9aff6a', fangs: false },
      res: 0.85
    };
  },
  gnarlroot(seed = 9) {
    const rnd = seeded(seed);
    const leaves = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return S([Math.cos(a) * 0.62, 3.2 + rnd() * 0.25 + (i % 2) * 0.12, Math.sin(a) * 0.55 - 0.1], 0.42 + rnd() * 0.1, { k: 0.12, bone: 'head', col: 'accent' });
    });
    const flowers = Array.from({ length: 6 }, () => S([(rnd() - 0.5) * 1.3, 3.25 + rnd() * 0.45, 0.3 + rnd() * 0.25], 0.09, { col: 'extra', soft: 0.015 }));
    return {
      type: 'walker', heavy: true, height: 3.75, gloss: 0.15, fur: 0.3,
      slots: BEAST_SLOTS,
      palette: ['#6a4a32', '#8a6a48', '#2a1a10', '#4a8a3a', '#5a8a4a', '#ffe060', '#f0a0c0', '#ffe060'],
      glows: [0, 0, 0, 0, 0, 1.2, 0.25, 0], outline: '#ffd27a',
      bones: [['body', null, 0, 1.2, 0], ['head', 'body', 0, 2.2, 0.05], ...boneBoth('armL', 'body', 0.7, 2.0, 0), ...boneBoth('legL', null, 0.42, 0.95, 0)],
      roles: { head: { role: 'head' }, armL: { role: 'arm' }, armR: { role: 'arm' }, legL: { role: 'leg', phase: 0 }, legR: { role: 'leg', phase: Math.PI } },
      parts: [
        T([0, 1.0, 0], [0, 2.1, 0], 0.72, 0.62, { k: 0.15, bone: 'body' }),
        E([0, 2.6, 0.08], [0.72, 0.62, 0.62], { k: 0.2, bone: 'head' }),
        ...leaves,
        ...both(
          T([-0.62, 2.05, 0], [-1.25, 1.35, 0.25], 0.24, 0.13, { k: 0.1, bone: 'armL' }),
          ...[-1, 0, 1].map((i) => T([-1.25, 1.35, 0.25], [-1.42 + i * 0.12, 1.08, 0.38 + i * 0.05], 0.09, 0.03, { k: 0.04, bone: 'armL' })),
          T([-0.4, 1.0, 0], [-0.5, 0.2, 0.06], 0.3, 0.24, { k: 0.12, bone: 'legL' }),
          E([-0.52, 0.12, 0.2], [0.32, 0.13, 0.42], { k: 0.08, bone: 'legL', col: 'belly' })
        )
      ],
      paint: [...flowers, E([0, 1.6, 0.6], [0.4, 0.5, 0.2], { col: 'horn', soft: 0.08 }), ...both(E([-0.45, 1.3, 0.55], [0.15, 0.3, 0.12], { col: 'dark', tone: 0.8, soft: 0.04 }))],
      face: { eyeX: 0.26, eyeY: 2.62, eyeR: 0.14, mouthY: 2.3, mouthW: 1.3, browY: 2.9, hostile: true, eyeGlow: '#ffe060', fangs: true },
      res: 1.3
    };
  },
  shardling() {
    const shards = Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2;
      const c = [Math.cos(a) * 0.6, 0.55 + Math.sin(a * 2) * 0.12, Math.sin(a) * 0.6];
      return T([c[0], c[1] - 0.12, c[2]], [c[0], c[1] + 0.14, c[2]], 0.07, 0.01, { k: 0.01, bone: 'shards', col: 'accent', sheen: 1, glow: 0.3 });
    });
    return {
      type: 'float', height: 1.2, gloss: 1, fur: 0,
      slots: BEAST_SLOTS,
      palette: ['#7ab8e8', '#e0f6ff', '#1e5a94', '#b0e0ff', '#ffffff', '#ffffff', '#4a8ac8', '#ffffff'],
      glows: [0.12, 0.2, 0, 0.3, 0, 1, 0, 0],
      bones: [['body', null, 0, 0.6, 0], ['shards', 'body', 0, 0.55, 0]],
      roles: { shards: { role: 'spin' } },
      parts: [
        T([0, 0.62, 0], [0, 1.08, 0], 0.32, 0.03, { k: 0.06, bone: 'body', sheen: 0.8 }),
        T([0, 0.62, 0], [0, 0.12, 0], 0.32, 0.03, { k: 0.06, bone: 'body', sheen: 0.8 }),
        E([0, 0.62, 0.02], [0.3, 0.2, 0.28], { k: 0.08, bone: 'body', col: 'belly' }),
        ...shards
      ],
      paint: [E([0, 0.95, 0.1], [0.06, 0.1, 0.06], { col: 'horn', soft: 0.03 })],
      face: { eyeX: 0.11, eyeY: 0.65, eyeR: 0.07, mouthY: 0.52, mouthW: 0.75, browY: 0.77, hostile: true, eyeGlow: '#ffffff', fangs: true },
      res: 1
    };
  },
  frostbat() {
    return {
      type: 'flier', flap: 13, amp: 0.75, height: 0.9, gloss: 0.3, fur: 1,
      slots: BEAST_SLOTS,
      palette: ['#5a8ac0', '#b8d8f0', '#2a3a5a', '#3a4a6a', '#f4faff', '#9ae8ff', '#9ad0f0', '#9ae8ff'],
      glows: [0, 0, 0, 0, 0, 1, 0, 0],
      bones: [['body', null, 0, 0.45, 0], ['head', 'body', 0, 0.55, 0.05], ...boneBoth('wingL', 'body', 0.22, 0.5, -0.02)],
      roles: { head: { role: 'head' }, wingL: { role: 'wing' }, wingR: { role: 'wing' } },
      parts: [
        S([0, 0.47, 0], 0.31, { k: 0.1, bone: 'head' }),
        ...both(
          T([-0.16, 0.66, 0], [-0.3, 1.0, -0.06], 0.13, 0.02, { k: 0.06, bone: 'head' }),
          E([-0.58, 0.5, -0.06], [0.38, 0.22, 0.022], { k: 0.04, bone: 'wingL', col: 'accent', rot: [0, 0, 0.15] }),
          ...[0, 1, 2].map((i) => T([-0.3 - i * 0.13, 0.6 - i * 0.04, -0.06], [-0.38 - i * 0.16, 0.3 - i * 0.02, -0.06], 0.035, 0.012, { k: 0.02, bone: 'wingL', col: 'dark' })),
          C([-0.09, 0.2, 0], [-0.1, 0.1, 0.02], 0.03, { k: 0.02, bone: 'body', col: 'dark' })
        )
      ],
      paint: [E([0, 0.4, 0.22], [0.18, 0.15, 0.1], { col: 'belly', soft: 0.03 }), ...both(E([-0.26, 0.86, 0.0], [0.04, 0.1, 0.04], { col: 'extra', soft: 0.01 }))],
      face: { eyeX: 0.12, eyeY: 0.53, eyeR: 0.075, mouthY: 0.39, mouthW: 0.85, browY: 0.66, hostile: true, eyeGlow: '#9ae8ff', fangs: true },
      res: 1
    };
  },
  cinderling(seed = 10) {
    const rnd = seeded(seed);
    const cracks = Array.from({ length: 8 }, () => E([(rnd() - 0.5) * 0.6, 0.3 + rnd() * 0.35, (rnd() - 0.5) * 0.6], [0.12, 0.018, 0.16], { rot: [rnd() * 3, rnd() * 3, rnd() * 3], col: 'glow', glow: 1, soft: 0.006 }));
    return {
      type: 'walker', height: 0.9, gloss: 0.3, fur: 0,
      slots: BEAST_SLOTS,
      palette: ['#2a1a14', '#4a2e1c', '#140c0c', '#ffc23d', '#3a2418', '#ff8a2a', '#ffe26b', '#fff4a0'],
      glows: [0, 0, 0, 1, 0, 1, 1, 0],
      bones: [['body', null, 0, 0.42, 0], ['flame', 'body', 0, 0.74, 0], ...boneBoth('armL', 'body', 0.3, 0.42, 0.02), ...boneBoth('legL', null, 0.13, 0.18, 0)],
      roles: { flame: { role: 'sway' }, armL: { role: 'arm' }, armR: { role: 'arm' }, legL: { role: 'leg', phase: 0 }, legR: { role: 'leg', phase: Math.PI } },
      parts: [
        S([0, 0.45, 0], 0.33, { k: 0.08, bone: 'body' }),
        T([0, 0.7, -0.02], [0.04, 1.02, -0.08], 0.14, 0.02, { k: 0.08, bone: 'flame', col: 'accent', glow: 1 }),
        T([-0.08, 0.7, 0.02], [-0.14, 0.9, 0.0], 0.08, 0.02, { k: 0.05, bone: 'flame', col: 'extra', glow: 1 }),
        ...both(S([-0.34, 0.4, 0.05], 0.08, { k: 0.05, bone: 'armL', col: 'belly' }), C([-0.13, 0.18, 0], [-0.13, 0.07, 0.02], 0.065, { k: 0.04, bone: 'legL', col: 'belly' }))
      ],
      paint: cracks,
      face: { eyeX: 0.12, eyeY: 0.5, eyeR: 0.075, mouthY: 0.36, mouthW: 0.9, browY: 0.63, hostile: true, eyeGlow: '#fff4a0', fangs: true },
      res: 1
    };
  },
  salamander(seed = 11) {
    const rnd = seeded(seed);
    const q = quadruped({ len: 0.5, h: 0.34, headR: [0.3, 0.22, 0.3], legR: 0.07, legX: 0.25, tail: 'long' });
    const [, hy, hz] = q.head.c;
    const spots = Array.from({ length: 9 }, (_, i) => S([(rnd() - 0.5) * 0.4, q.h + 0.2, 0.4 - i * 0.12], 0.05 + rnd() * 0.03, { col: 'glow', glow: 0.8, soft: 0.01 }));
    return {
      type: 'quad', height: 1.0, gloss: 0.6, fur: 0,
      slots: BEAST_SLOTS,
      palette: ['#c03a24', '#f0a060', '#5a1a14', '#ffc23d', '#f4ecd8', '#ffc23d', '#8a2018', '#ffe060'],
      glows: [0, 0.1, 0, 0.6, 0, 1, 0, 0],
      bones: q.bones.map((b) => (b[0] === 'head' ? ['head', 'body', 0, q.h + 0.1, q.len - 0.05] : b)), roles: q.roles,
      parts: [
        ...q.parts.map((p) => (p.bone === 'head' ? { ...p, c: [0, hy - 0.12, hz + 0.08] } : p)),
        E([0, hy - 0.16, hz + 0.3], [0.2, 0.1, 0.16], { k: 0.08, bone: 'head' }),
        ...both(S([-0.14, hy + 0.0, hz + 0.08], 0.09, { k: 0.05, bone: 'head' }))
      ],
      paint: [...spots, E([0, q.h - 0.14, 0.05], [0.22, 0.08, 0.42], { col: 'belly', soft: 0.03 })],
      face: { eyeX: 0.14, eyeY: hy - 0.03, eyeR: 0.07, mouthY: hy - 0.22, mouthW: 1.1, browY: hy + 0.1, hostile: true, eyeGlow: '#ffe060', fangs: true },
      res: 1
    };
  },
  tyrant() {
    return {
      type: 'walker', heavy: true, flap: 4, amp: 0.3, height: 3.25, gloss: 0.4, fur: 0,
      slots: BEAST_SLOTS,
      palette: ['#6a2420', '#ff8a2a', '#1c0e0a', '#4a2030', '#e8dcc0', '#ffe060', '#ffc23d', '#ffe060'],
      glows: [0, 0.3, 0, 0, 0, 1.3, 1, 0], outline: '#ff8a3a',
      bones: [['body', null, 0, 1.3, 0], ['head', 'body', 0, 2.05, 0.15], ['tail', 'body', 0, 1.0, -0.5], ...boneBoth('wingL', 'body', 0.45, 2.0, -0.35), ...boneBoth('armL', 'body', 0.7, 1.75, 0.2), ...boneBoth('legL', null, 0.42, 0.95, 0)],
      roles: { head: { role: 'head' }, tail: { role: 'tail' }, wingL: { role: 'wing' }, wingR: { role: 'wing' }, armL: { role: 'arm' }, armR: { role: 'arm' }, legL: { role: 'leg', phase: 0 }, legR: { role: 'leg', phase: Math.PI } },
      parts: [
        E([0, 1.45, 0], [0.78, 0.72, 0.62], { k: 0.15, bone: 'body' }),
        E([0, 2.5, 0.25], [0.58, 0.48, 0.52], { k: 0.15, bone: 'head' }),
        E([0, 2.3, 0.72], [0.34, 0.23, 0.27], { k: 0.12, bone: 'head' }),
        T([0, 1.1, -0.5], [0, 0.45, -1.7], 0.36, 0.06, { k: 0.12, bone: 'tail' }),
        ...both(
          T([-0.3, 2.82, 0.1], [-0.58, 3.25, -0.18], 0.11, 0.02, { k: 0.05, bone: 'head', col: 'horn' }),
          E([-1.25, 2.35, -0.45], [0.8, 0.5, 0.045], { k: 0.04, bone: 'wingL', col: 'accent', rot: [0, 0.3, 0.3] }),
          T([-0.45, 2.0, -0.35], [-1.9, 2.75, -0.6], 0.07, 0.04, { k: 0.04, bone: 'wingL', col: 'dark' }),
          C([-0.72, 1.75, 0.2], [-0.92, 1.15, 0.5], 0.18, { k: 0.08, bone: 'armL' }),
          ...[-1, 0, 1].map((i) => T([-0.95, 1.1, 0.55], [-1.0 + i * 0.07, 0.95, 0.72], 0.06, 0.015, { k: 0.02, bone: 'armL', col: 'horn' })),
          C([-0.42, 0.95, 0], [-0.46, 0.3, 0.05], 0.27, { k: 0.1, bone: 'legL' }),
          E([-0.47, 0.15, 0.2], [0.3, 0.13, 0.38], { k: 0.06, bone: 'legL', col: 'dark' })
        ),
        ...[0, 1, 2, 3].map((i) => T([0, 2.0 - i * 0.35, -0.55 + i * 0.02], [0, 2.18 - i * 0.35, -0.82], 0.1, 0.015, { k: 0.04, bone: i ? 'body' : 'head', col: 'horn' }))
      ],
      paint: [E([0, 1.3, 0.48], [0.5, 0.55, 0.22], { col: 'belly', glow: 0.25, soft: 0.02 }), ...[1.05, 1.3, 1.55].map((y) => E([0, y, 0.62], [0.45, 0.02, 0.1], { col: 'dark', soft: 0.006 }))],
      face: { eyeX: 0.21, eyeY: 2.6, eyeR: 0.11, mouthY: 2.18, mouthW: 1.2, browY: 2.82, hostile: true, eyeGlow: '#ffe060', fangs: true },
      res: 1.3
    };
  }
};

/** True for kinds sculpted here. */
export const isSculptedBeast = (kind) => Boolean(BEAST_RECIPES[kind]);
