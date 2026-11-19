/**
 * Kithvale's six wild species as sculpting recipes for AI Arcademia's SDF
 * sculptor (creatures/sculpt.js): smooth shapes blended into one body, each
 * tied to a bone, with paint for markings, and where the face goes. All
 * original designs, in a softer, more painterly key than Arcademia's toys —
 * lower contrast, natural colours, real proportions for each body plan:
 *
 *   tuftlet     a round hopper with leaf ears and a crown of grass blades
 *   pebbleroll  a low, stubby-legged roller under a shell of river pebbles
 *   lumoth      a fluffy moth with feathered antennae (its lantern belly,
 *               wings and glow are added by body.js)
 *   mistfawn    a slender dappled fawn with leaf-bud antlers
 *   puffwool    a cloud of wool with a lavender face and curled horns
 *   emberkit    a salamander with feathery ember gills (its tail flame is fx)
 *
 * Units: metres, feet at y = 0, facing +z. `bones`: [name, parent, x, y, z]
 * at rest (world). `face`: where the eyes, mouth and cheeks sit.
 */

const S = (c, r, o = {}) => ({ s: 'sph', c, r, ...o });
const E = (c, r, o = {}) => ({ s: 'ell', c, r, ...o });
const C = (a, b, r, o = {}) => ({ s: 'cap', a, b, r, ...o });
const T = (a, b, ra, rb, o = {}) => ({ s: 'taper', a, b, r: [ra, rb], ...o });
const flipX = (v) => (Array.isArray(v) && v.length === 3 && typeof v[0] === 'number' ? [-v[0], v[1], v[2]] : v);
/** A shape and its mirror (x → −x); bones ending in L become R. */
function pair(shape) {
  const m = { ...shape };
  for (const k of ['c', 'a', 'b']) if (m[k]) m[k] = flipX(m[k]);
  if (m.rot) m.rot = [m.rot[0], -m.rot[1], -m.rot[2]];
  if (typeof m.bone === 'string' && /L$/.test(m.bone)) m.bone = m.bone.replace(/L$/, 'R');
  return [shape, m];
}
const both = (...shapes) => shapes.flatMap(pair);
const mirrorBones = (list) => list.flatMap((b) => (/L$/.test(b[0]) ? [b, [b[0].replace(/L$/, 'R'), /L$/.test(b[1] ?? '') ? b[1].replace(/L$/, 'R') : b[1], -b[2], b[3], b[4]]] : [b]));

export const RECIPES = {
  tuftlet() {
    const blades = [];
    const tones = ['#5a8a34', '#6e9c3c', '#4a7a2e', '#82ac48', '#5e9038'];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      const lean = 0.12 + (i % 3) * 0.04;
      const h = 0.2 + (i % 2) * 0.07;
      blades.push(T([Math.cos(a) * 0.04, 0.42, Math.sin(a) * 0.04 - 0.02], [Math.cos(a) * lean, 0.42 + h, Math.sin(a) * lean - 0.04], 0.03, 0.006, { k: 0.02, bone: 'tuft', col: tones[i % tones.length] }));
    }
    return {
      color: '#a8c87a', fur: 0.8, gloss: 0.15,
      bones: mirrorBones([
        ['root', null, 0, 0, 0], ['body', 'root', 0, 0.22, 0], ['head', 'body', 0, 0.3, 0.05], ['tuft', 'head', 0, 0.42, -0.02],
        ['earL', 'head', -0.17, 0.36, -0.01], ['footL', 'body', -0.11, 0.07, 0.0], ['handL', 'body', -0.15, 0.16, 0.13], ['tail', 'body', 0, 0.16, -0.22]
      ]),
      parts: [
        E([0, 0.25, 0], [0.25, 0.23, 0.235], { k: 0.08, bone: 'body' }),
        E([0, 0.3, 0.06], [0.22, 0.18, 0.2], { k: 0.1, bone: 'head' }),
        ...both(E([-0.12, 0.22, 0.14], [0.09, 0.075, 0.07], { k: 0.07, bone: 'head', col: '#f2ead0' })),
        E([0, 0.21, 0.19], [0.06, 0.05, 0.05], { k: 0.06, bone: 'head', col: '#f2ead0' }),
        // Leaf ears, swept back and out.
        ...both(E([-0.22, 0.38, -0.04], [0.035, 0.12, 0.06], { k: 0.04, bone: 'earL', rot: [0.3, 0, 0.9], col: '#7aa848' })),
        // Big hind feet, little front paws.
        ...both(E([-0.12, 0.045, 0.05], [0.075, 0.05, 0.13], { k: 0.05, bone: 'footL', col: '#8ab05e' })),
        ...both(S([-0.15, 0.15, 0.17], 0.045, { k: 0.04, bone: 'handL', col: '#8ab05e' })),
        S([0, 0.16, -0.24], 0.07, { k: 0.04, bone: 'tail', col: '#f4eedc' }),
        ...blades
      ],
      paint: [
        E([0, 0.18, 0.16], [0.14, 0.12, 0.1], { col: '#f4ecd2', soft: 0.02 }),
        S([0, 0.235, 0.24], 0.022, { col: '#5a3a2a', soft: 0.004 }),
        ...both(E([-0.22, 0.3, 0.0], [0.03, 0.03, 0.03], { col: '#7a9a50', soft: 0.01 }))
      ],
      face: { eyeX: 0.095, eyeY: 0.31, eyeR: 0.05, mouthY: 0.205, cheekX: 0.16, cheekY: 0.24, iris: '#4a3a1e' }
    };
  },

  pebbleroll() {
    const pebbles = [];
    const tones = ['#7f8b96', '#b8ae9e', '#5f6b7a', '#93a294', '#c8bea8', '#6e7d70', '#a49686'];
    let i = 0;
    for (const [ring, y, rr, n] of [[0, 0.46, 0.08, 3], [1, 0.42, 0.17, 7], [2, 0.34, 0.24, 9], [3, 0.24, 0.27, 9]]) {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + ring * 0.35;
        const z = Math.sin(a) * rr * 1.18 - 0.03;
        if (z > 0.17 && y < 0.3) continue; // leave the face free
        const pr = 0.072 + (i % 3) * 0.012;
        pebbles.push(E([Math.cos(a) * rr, y, z], [pr, pr * 0.8, pr], { k: 0.006, bone: 'body', col: tones[i++ % tones.length] }));
      }
    }
    return {
      color: '#e2d2b8', fur: 0.1, gloss: 0.55, shell: true,
      bones: mirrorBones([
        ['root', null, 0, 0, 0], ['body', 'root', 0, 0.22, 0], ['head', 'body', 0, 0.22, 0.25], ['earL', 'head', -0.08, 0.32, 0.25],
        ['legFL', 'body', -0.15, 0.12, 0.15], ['legBL', 'body', -0.15, 0.12, -0.15], ['tail', 'body', 0, 0.15, -0.3]
      ]),
      parts: [
        E([0, 0.22, 0], [0.23, 0.17, 0.29], { k: 0.06, bone: 'body' }),
        E([0, 0.3, -0.02], [0.25, 0.17, 0.29], { k: 0.04, bone: 'body', col: '#3e3a40' }),
        ...pebbles,
        E([0, 0.22, 0.28], [0.13, 0.115, 0.12], { k: 0.07, bone: 'head' }),
        E([0, 0.19, 0.37], [0.065, 0.05, 0.06], { k: 0.05, bone: 'head', col: '#f0e4d0' }),
        ...both(S([-0.09, 0.32, 0.25], 0.04, { k: 0.03, bone: 'earL' })),
        ...both(C([-0.15, 0.12, 0.15], [-0.17, 0.035, 0.17], 0.05, { k: 0.04, bone: 'legFL' }), C([-0.15, 0.12, -0.15], [-0.17, 0.035, -0.17], 0.05, { k: 0.04, bone: 'legBL' })),
        T([0, 0.15, -0.29], [0, 0.1, -0.4], 0.05, 0.02, { k: 0.04, bone: 'tail', col: '#8e9aa4' })
      ],
      paint: [
        S([0, 0.205, 0.43], 0.022, { col: '#4a3a34', soft: 0.004 }),
        E([0, 0.12, 0.12], [0.16, 0.06, 0.16], { col: '#f2e6d2', soft: 0.02 }),
        ...both(S([-0.09, 0.33, 0.28], 0.022, { col: '#c8a890', soft: 0.006 }))
      ],
      face: { eyeX: 0.068, eyeY: 0.238, eyeR: 0.044, mouthY: 0.165, cheekX: 0.1, cheekY: 0.195, iris: '#2a2a3a', noBrows: true }
    };
  },

  lumoth() {
    const ruff = [];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      ruff.push(S([Math.cos(a) * 0.11, 0.42 + Math.sin(a * 2) * 0.01, Math.sin(a) * 0.09 + 0.03], 0.055, { k: 0.04, bone: 'body', col: '#fbf6ec' }));
    }
    const plume = (side) => {
      const out = [];
      for (let k = 0; k < 6; k++) {
        const t = k / 5;
        const x = side * (0.04 + t * 0.1);
        const y = 0.56 + t * 0.15 - t * t * 0.04;
        const z = 0.15 + t * 0.06;
        out.push(T([x, y, z], [x + side * 0.05, y + 0.02, z + 0.01], 0.012, 0.004, { k: 0.008, bone: side < 0 ? 'antL' : 'antR', col: '#e8d4a8' }));
        out.push(T([x, y, z], [x - side * 0.01, y + 0.05, z + 0.02], 0.012, 0.004, { k: 0.008, bone: side < 0 ? 'antL' : 'antR', col: '#e8d4a8' }));
      }
      out.push(T([side * 0.04, 0.53, 0.14], [side * 0.15, 0.7, 0.2], 0.012, 0.007, { k: 0.01, bone: side < 0 ? 'antL' : 'antR', col: '#d8c090' }));
      return out;
    };
    return {
      color: '#efe0c4', fur: 1, gloss: 0.1, fly: true,
      bones: mirrorBones([
        ['root', null, 0, 0, 0], ['body', 'root', 0, 0.36, 0], ['head', 'body', 0, 0.46, 0.1], ['antL', 'head', -0.04, 0.54, 0.14],
        ['wingL', 'body', -0.07, 0.38, -0.02], ['abdomen', 'body', 0, 0.28, -0.12], ['legL', 'body', -0.06, 0.28, 0.06]
      ]),
      parts: [
        E([0, 0.36, 0.0], [0.12, 0.12, 0.13], { k: 0.06, bone: 'body' }),
        ...ruff,
        E([0, 0.47, 0.12], [0.1, 0.09, 0.09], { k: 0.07, bone: 'head' }),
        ...plume(-1),
        ...plume(1),
        ...both(C([-0.06, 0.3, 0.06], [-0.1, 0.2, 0.1], 0.016, { k: 0.01, bone: 'legL', col: '#8a7458' }))
      ],
      paint: [E([0, 0.32, 0.08], [0.09, 0.06, 0.06], { col: '#d8b88a', soft: 0.02 })],
      face: { eyeX: 0.055, eyeY: 0.48, eyeR: 0.045, mouthY: 0.425, cheekX: 0.08, cheekY: 0.44, iris: '#1a1a2a', big: true }
    };
  },

  mistfawn() {
    const spots = [];
    const sp = [[-0.08, 0.69, -0.05], [0.07, 0.7, 0.02], [-0.03, 0.72, -0.18], [0.09, 0.68, -0.2], [-0.1, 0.67, 0.1], [0.02, 0.71, 0.12], [-0.06, 0.7, -0.3], [0.06, 0.69, -0.32], [0.0, 0.73, -0.08]];
    for (const c of sp) spots.push(S(c, 0.03, { col: '#fff2e2', soft: 0.008 }));
    const leg = (x, z, side, f) => {
      const up = `leg${f ? 'F' : 'B'}${side}`;
      const lo = `low${f ? 'F' : 'B'}${side}`;
      return [
        T([x, 0.5, z], [x, 0.27, z + (f ? 0.01 : -0.03)], f ? 0.06 : 0.07, 0.036, { k: 0.04, bone: up }),
        T([x, 0.27, z + (f ? 0.01 : -0.03)], [x, 0.04, z + (f ? 0.02 : -0.01)], 0.033, 0.027, { k: 0.02, bone: lo }),
        E([x, 0.03, z + (f ? 0.035 : 0)], [0.034, 0.03, 0.042], { k: 0.015, bone: lo, col: '#4a3a32' })
      ];
    };
    return {
      color: '#c99c6c', fur: 0.9, gloss: 0.15,
      bones: mirrorBones([
        ['root', null, 0, 0, 0], ['hips', 'root', 0, 0.58, -0.2], ['chest', 'hips', 0, 0.6, 0.16], ['neck', 'chest', 0, 0.68, 0.26], ['head', 'neck', 0, 0.91, 0.34],
        ['earL', 'head', -0.08, 1.01, 0.3], ['antlerL', 'head', -0.04, 1.02, 0.34],
        ['legFL', 'chest', -0.08, 0.5, 0.18], ['lowFL', 'legFL', -0.08, 0.27, 0.19], ['legBL', 'hips', -0.08, 0.5, -0.26], ['lowBL', 'legBL', -0.08, 0.27, -0.29],
        ['tail', 'hips', 0, 0.64, -0.4]
      ]),
      parts: [
        E([0, 0.62, -0.16], [0.15, 0.15, 0.21], { k: 0.08, bone: 'hips' }),
        E([0, 0.63, 0.12], [0.15, 0.16, 0.18], { k: 0.08, bone: 'chest' }),
        C([0, 0.68, 0.24], [0, 0.86, 0.33], 0.072, { k: 0.06, bone: 'neck' }),
        E([0, 0.94, 0.37], [0.105, 0.1, 0.12], { k: 0.06, bone: 'head' }),
        E([0, 0.89, 0.48], [0.058, 0.052, 0.075], { k: 0.05, bone: 'head', col: '#e8d2b4' }),
        ...both(E([-0.14, 1.02, 0.3], [0.09, 0.03, 0.05], { k: 0.03, bone: 'earL', rot: [0, 0.3, 0.45] })),
        ...both(T([-0.04, 1.02, 0.34], [-0.07, 1.12, 0.32], 0.016, 0.01, { k: 0.01, bone: 'antlerL', col: '#d8c4a0' }), S([-0.075, 1.13, 0.32], 0.03, { k: 0.015, bone: 'antlerL', col: '#7aaa50' }), S([-0.05, 1.11, 0.36], 0.022, { k: 0.012, bone: 'antlerL', col: '#8ab858' })),
        ...leg(-0.08, 0.18, 'L', true),
        ...leg(0.08, 0.18, 'R', true),
        ...leg(-0.08, -0.26, 'L', false),
        ...leg(0.08, -0.26, 'R', false),
        E([0, 0.68, -0.4], [0.05, 0.06, 0.05], { k: 0.04, bone: 'tail', col: '#fff6ea' })
      ],
      paint: [
        ...spots,
        E([0, 0.5, 0.0], [0.12, 0.06, 0.3], { col: '#f2e2cc', soft: 0.03 }),
        S([0, 0.9, 0.555], 0.022, { col: '#3a2a26', soft: 0.004 }),
        ...both(E([-0.15, 1.02, 0.32], [0.05, 0.015, 0.03], { col: '#f0c8b8', rot: [0, 0.3, 0.45], soft: 0.006 }))
      ],
      face: { eyeX: 0.064, eyeY: 0.96, eyeR: 0.038, mouthY: null, cheekX: 0.08, cheekY: 0.91, iris: '#3a2410', side: true }
    };
  },

  puffwool() {
    const wool = [];
    const ring = (n, y, rr, r, z0 = 0, ph = 0, bone = 'body') => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ph;
        wool.push(S([Math.cos(a) * rr, y, Math.sin(a) * rr * 1.12 + z0], r, { k: 0.04, bone }));
      }
    };
    ring(9, 0.48, 0.27, 0.15);
    ring(7, 0.66, 0.2, 0.14, -0.02, 0.4);
    ring(7, 0.32, 0.22, 0.13, 0, 0.2);
    wool.push(S([0, 0.76, -0.04], 0.15, { k: 0.04, bone: 'body' }));
    for (let i = 0; i < 4; i++) wool.push(S([Math.cos(i * 1.6) * 0.06, 0.7 + (i % 2) * 0.03, 0.3 + Math.sin(i * 1.6) * 0.04], 0.065, { k: 0.03, bone: 'head' }));
    const horn = (s) => {
      const out = [];
      for (let k = 0; k < 5; k++) {
        const a0 = (k / 5) * Math.PI * 1.4;
        const a1 = ((k + 1) / 5) * Math.PI * 1.4;
        const p = (a) => [s * (0.12 + Math.sin(a) * 0.07), 0.62 - (1 - Math.cos(a)) * 0.05, 0.3 - Math.sin(a) * 0.03 - a * 0.02];
        out.push(T(p(a0), p(a1), 0.035 - k * 0.005, 0.03 - k * 0.005, { k: 0.012, bone: 'head', col: '#e6c88e' }));
      }
      return out;
    };
    return {
      color: '#f6f3fa', fur: 1, gloss: 0.05, wool: true,
      bones: mirrorBones([
        ['root', null, 0, 0, 0], ['body', 'root', 0, 0.48, 0], ['head', 'body', 0, 0.54, 0.32], ['earL', 'head', -0.14, 0.58, 0.32],
        ['legFL', 'body', -0.12, 0.22, 0.14], ['legBL', 'body', -0.12, 0.22, -0.14], ['tail', 'body', 0, 0.5, -0.36]
      ]),
      parts: [
        S([0, 0.48, 0], 0.3, { k: 0.05, bone: 'body' }),
        ...wool,
        E([0, 0.52, 0.38], [0.11, 0.125, 0.11], { k: 0.05, bone: 'head', col: '#9a8aac' }),
        E([0, 0.47, 0.46], [0.065, 0.055, 0.05], { k: 0.04, bone: 'head', col: '#b4a6c4' }),
        ...both(E([-0.17, 0.56, 0.33], [0.07, 0.025, 0.04], { k: 0.02, bone: 'earL', rot: [0, 0, -0.4], col: '#9a8aac' })),
        ...horn(-1),
        ...horn(1),
        ...both(C([-0.12, 0.24, 0.14], [-0.12, 0.03, 0.15], 0.045, { k: 0.03, bone: 'legFL', col: '#6e6280' }), C([-0.12, 0.24, -0.14], [-0.12, 0.03, -0.15], 0.045, { k: 0.03, bone: 'legBL', col: '#6e6280' })),
        S([0, 0.52, -0.38], 0.08, { k: 0.03, bone: 'tail' })
      ],
      paint: [E([0, 0.25, 0], [0.4, 0.1, 0.4], { col: 'dark', soft: 0.1 }), S([0, 0.465, 0.51], 0.018, { col: '#5a4a6a', soft: 0.004 })],
      face: { eyeX: 0.06, eyeY: 0.55, eyeR: 0.04, mouthY: 0.45, cheekX: 0.085, cheekY: 0.49, iris: '#2a2030' }
    };
  },

  emberkit() {
    const gills = [];
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const a = -0.5 + k * 0.5;
        const base = [s * 0.1, 0.2 + k * 0.012, 0.25 - k * 0.025];
        const tip = [s * 0.17, 0.23 + Math.sin(a) * 0.07, 0.2 - k * 0.05];
        gills.push(T(base, tip, 0.016, 0.006, { k: 0.01, bone: s < 0 ? 'gillL' : 'gillR', col: '#ff9a4a' }));
        // Feathery barbs along each gill.
        for (let q = 1; q <= 2; q++) {
          const m = base.map((v, i) => v + (tip[i] - v) * (q / 3));
          gills.push(T(m, [m[0] + s * 0.025, m[1] + 0.03, m[2] - 0.01], 0.008, 0.004, { k: 0.006, bone: s < 0 ? 'gillL' : 'gillR', col: '#ffc070' }));
        }
      }
    }
    const tail = [];
    for (let k = 0; k < 3; k++) {
      const z0 = -0.13 - k * 0.16;
      const z1 = z0 - 0.17;
      tail.push(T([0, 0.13 - k * 0.012, z0], [0, 0.12 - k * 0.012, z1], 0.07 - k * 0.018, 0.05 - k * 0.018, { k: 0.04, bone: `tail${k + 1}` }));
    }
    return {
      color: '#e8753a', fur: 0.2, gloss: 0.55,
      bones: mirrorBones([
        ['root', null, 0, 0, 0], ['body', 'root', 0, 0.13, -0.02], ['chest', 'body', 0, 0.14, 0.12], ['head', 'chest', 0, 0.16, 0.24], ['gillL', 'head', -0.1, 0.2, 0.24],
        ['tail1', 'body', 0, 0.13, -0.14], ['tail2', 'tail1', 0, 0.12, -0.3], ['tail3', 'tail2', 0, 0.11, -0.46],
        ['legFL', 'chest', -0.09, 0.1, 0.13], ['legBL', 'body', -0.09, 0.1, -0.08]
      ]),
      parts: [
        E([0, 0.13, -0.02], [0.095, 0.075, 0.17], { k: 0.06, bone: 'body' }),
        E([0, 0.14, 0.13], [0.1, 0.08, 0.11], { k: 0.06, bone: 'chest' }),
        E([0, 0.165, 0.3], [0.125, 0.085, 0.115], { k: 0.06, bone: 'head' }),
        ...gills,
        ...tail,
        ...both(C([-0.09, 0.1, 0.13], [-0.17, 0.03, 0.17], 0.03, { k: 0.025, bone: 'legFL' }), C([-0.09, 0.1, -0.08], [-0.17, 0.03, -0.12], 0.032, { k: 0.025, bone: 'legBL' })),
        ...both(S([-0.18, 0.025, 0.18], 0.03, { k: 0.015, bone: 'legFL' }), S([-0.18, 0.025, -0.13], 0.03, { k: 0.015, bone: 'legBL' }))
      ],
      paint: [
        E([0, 0.075, 0.04], [0.09, 0.03, 0.25], { col: '#ffd49a', soft: 0.02 }),
        ...[[0.0, 0.2, 0.04], [-0.04, 0.2, -0.08], [0.04, 0.19, -0.16], [0, 0.17, -0.3], [-0.03, 0.15, -0.42]].map((c) => S(c, 0.032, { col: '#ffcf4a', soft: 0.008 })),
        E([0, 0.12, 0.4], [0.06, 0.02, 0.03], { col: '#7a2a1a', soft: 0.006 })
      ],
      face: { eyeX: 0.075, eyeY: 0.21, eyeR: 0.038, mouthY: 0.135, cheekX: 0.1, cheekY: 0.16, iris: '#6a2a0a' }
    };
  }
};
