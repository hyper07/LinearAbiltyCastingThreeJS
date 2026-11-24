/**
 * Small low-poly models of the history hall's artifacts (schema.js
 * ARTIFACTS), for the turning pedestal. Each sits on y = 0, about 1 m tall.
 */
import * as THREE from 'three';
import { add, box, cyl, cone, sphere, ico, mat } from './kit.js';

const gold = () => mat('#d7b45a', { rough: 0.3, metal: 0.7 });
const bronze = () => mat('#a8743f', { rough: 0.4, metal: 0.6 });
const stone = () => mat('#b9b2a3', { rough: 0.95 });
const clay = () => mat('#c8794a', { rough: 0.85 });
const wood = () => mat('#8a5e3c', { rough: 0.85 });
const iron = () => mat('#4c5560', { rough: 0.5, metal: 0.5 });
const cream = () => mat('#efe4c8', { rough: 0.9 });
const lathe = (pts, c, seg = 14) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), c);

const MODELS = {
  'hand-axe': (g) => {
    const geo = new THREE.OctahedronGeometry(0.4, 0);
    geo.scale(0.75, 1.3, 0.35);
    add(g, geo, mat('#8d8170', { rough: 0.9 }), [0, 0.52, 0]);
  },
  'cave-painting': (g) => {
    add(g, box(1.0, 0.75, 0.15), mat('#c9a77a', { rough: 1 }), [0, 0.5, 0]);
    const ochre = mat('#9c3d1e', { rough: 1 });
    add(g, box(0.36, 0.16, 0.02), ochre, [-0.1, 0.55, 0.08]);
    for (const x of [-0.24, -0.16, 0.0, 0.08]) add(g, box(0.03, 0.14, 0.02), ochre, [x, 0.42, 0.08]);
    add(g, box(0.1, 0.1, 0.02), ochre, [0.13, 0.62, 0.08]);
    add(g, cyl(0.06, 0.06, 0.02, 10), mat('#3a2a20'), [0.3, 0.7, 0.08], [Math.PI / 2, 0, 0]);
  },
  'clay-tablet': (g) => {
    add(g, box(0.6, 0.8, 0.12), clay(), [0, 0.45, 0], [-0.15, 0, 0]);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) add(g, cone(0.025, 0.06, 3), mat('#8a4f2c'), [-0.2 + c * 0.1, 0.72 - r * 0.1, 0.07 - r * 0.015], [Math.PI / 2, 0, 0]);
  },
  pyramid: (g) => {
    add(g, cone(0.75, 0.9, 4), mat('#e2c98f', { rough: 0.9 }), [0, 0.45, 0], [0, Math.PI / 4, 0]);
    add(g, cone(0.12, 0.14, 4), gold(), [0, 0.86, 0], [0, Math.PI / 4, 0]);
  },
  scarab: (g) => {
    add(g, sphere(0.35, 12, 8), mat('#2f8f83', { rough: 0.3, metal: 0.4 }), [0, 0.3, 0], [0, 0, 0], [1, 0.6, 1.3]);
    add(g, sphere(0.17, 10, 6), mat('#2f8f83', { rough: 0.3, metal: 0.4 }), [0, 0.3, 0.45], [0, 0, 0], [1.2, 0.7, 0.8]);
    add(g, box(0.02, 0.2, 0.7), gold(), [0, 0.5, 0]);
  },
  amphora: (g) => g.add(lathe([[0, 0], [0.1, 0.02], [0.32, 0.35], [0.3, 0.65], [0.12, 0.85], [0.12, 1.0], [0.16, 1.03], [0, 1.03]], clay())),
  'greek-column': (g) => {
    add(g, box(0.55, 0.1, 0.55), cream(), [0, 0.05, 0]);
    add(g, cyl(0.17, 0.2, 0.95, 12), cream(), [0, 0.57, 0]);
    add(g, box(0.5, 0.1, 0.5), cream(), [0, 1.08, 0]);
  },
  'roman-arch': (g) => {
    for (const s of [-1, 1]) add(g, box(0.25, 0.7, 0.3), stone(), [s * 0.38, 0.35, 0]);
    add(g, new THREE.TorusGeometry(0.38, 0.12, 4, 10, Math.PI), stone(), [0, 0.7, 0]);
    add(g, box(0.12, 0.16, 0.32), mat('#d8ccb4'), [0, 1.1, 0]);
  },
  coin: (g) => {
    add(g, cyl(0.45, 0.45, 0.08, 24), gold(), [0, 0.5, 0], [Math.PI / 2, 0, 0]);
    add(g, cyl(0.3, 0.3, 0.1, 24), mat('#c49a3a', { rough: 0.3, metal: 0.7 }), [0, 0.5, 0], [Math.PI / 2, 0, 0]);
    add(g, box(0.06, 0.2, 0.06), stone(), [0, 0.1, 0]);
  },
  scroll: (g) => {
    add(g, box(0.9, 0.02, 0.5), cream(), [0, 0.4, 0]);
    for (const s of [-1, 1]) add(g, cyl(0.07, 0.07, 0.6, 10), wood(), [s * 0.46, 0.43, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 4; i++) add(g, box(0.6, 0.005, 0.03), mat('#3a2a20'), [0, 0.42, -0.15 + i * 0.1]);
  },
  'silk-bolt': (g) => {
    add(g, cyl(0.25, 0.25, 0.9, 16), mat('#c0392b', { rough: 0.35 }), [0, 0.3, 0], [0, 0, Math.PI / 2]);
    add(g, box(0.9, 0.02, 0.6), mat('#e1a33a', { rough: 0.35 }), [0.2, 0.06, 0.4], [0, 0.3, 0]);
  },
  compass: (g) => {
    add(g, cyl(0.4, 0.42, 0.12, 20), wood(), [0, 0.3, 0]);
    add(g, cyl(0.34, 0.34, 0.02, 20), cream(), [0, 0.37, 0]);
    add(g, cone(0.05, 0.3, 4), mat('#c0392b'), [0, 0.39, 0.13], [Math.PI / 2, 0, 0]);
    add(g, cone(0.05, 0.3, 4), iron(), [0, 0.39, -0.13], [-Math.PI / 2, 0, 0]);
  },
  'viking-ship': (g) => {
    const hull = new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    hull.scale(0.5, 0.5, 1.6);
    add(g, hull, wood(), [0, 0.4, 0]);
    add(g, cyl(0.03, 0.03, 0.9, 5), wood(), [0, 0.8, 0]);
    add(g, box(0.02, 0.5, 0.55), mat('#c0392b', { rough: 0.9 }), [0, 0.95, 0], [0, Math.PI / 2, 0]);
    add(g, cone(0.06, 0.3, 5), wood(), [0, 0.55, 0.85], [0.6, 0, 0]);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) add(g, cyl(0.07, 0.07, 0.02, 10), mat(['#f2b84b', '#2a78d6'][i % 2]), [s * 0.26, 0.42, -0.45 + i * 0.3], [0, 0, Math.PI / 2]);
  },
  helmet: (g) => {
    add(g, new THREE.SphereGeometry(0.38, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), iron(), [0, 0.4, 0]);
    add(g, box(0.07, 0.35, 0.07), iron(), [0, 0.35, 0.38]);
    add(g, cyl(0.39, 0.39, 0.06, 16), bronze(), [0, 0.41, 0]);
    add(g, box(0.06, 0.2, 0.06), stone(), [0, 0.1, 0]);
  },
  castle: (g) => {
    add(g, box(0.8, 0.5, 0.8), stone(), [0, 0.25, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      add(g, cyl(0.15, 0.15, 0.8, 8), stone(), [sx * 0.4, 0.4, sz * 0.4]);
      add(g, cone(0.19, 0.3, 8), mat('#3d6fb3'), [sx * 0.4, 0.95, sz * 0.4]);
    }
    add(g, box(0.2, 0.28, 0.02), wood(), [0, 0.14, 0.41]);
  },
  'printing-press': (g) => {
    const w = wood();
    for (const s of [-1, 1]) add(g, box(0.1, 1.1, 0.1), w, [s * 0.35, 0.55, 0]);
    add(g, box(0.85, 0.1, 0.2), w, [0, 1.05, 0]);
    add(g, box(0.6, 0.12, 0.5), w, [0, 0.45, 0]);
    add(g, cyl(0.04, 0.04, 0.5, 6), iron(), [0, 0.75, 0]);
    add(g, box(0.5, 0.04, 0.04), iron(), [0, 0.8, 0.1], [0, 0.4, 0]);
    add(g, box(0.5, 0.02, 0.4), cream(), [0, 0.52, 0]);
  },
  globe: (g) => {
    add(g, cyl(0.2, 0.25, 0.08, 10), wood(), [0, 0.04, 0]);
    add(g, cyl(0.03, 0.03, 0.35, 6), bronze(), [0, 0.2, 0]);
    add(g, sphere(0.38, 16, 10), mat('#3d8fd6', { rough: 0.6 }), [0, 0.65, 0]);
    for (let i = 0; i < 6; i++) add(g, ico(0.14), mat('#d8c48a'), [Math.cos(i * 1.2) * 0.3, 0.65 + Math.sin(i * 1.9) * 0.2, Math.sin(i * 1.2) * 0.3]);
    add(g, new THREE.TorusGeometry(0.43, 0.02, 4, 24, Math.PI), bronze(), [0, 0.65, 0], [0, 0, -0.4]);
  },
  telescope: (g) => {
    for (let i = 0; i < 3; i++) add(g, cyl(0.02, 0.02, 0.7, 5), wood(), [Math.cos(i * 2.1) * 0.15, 0.32, Math.sin(i * 2.1) * 0.15], [Math.sin(i * 2.1) * 0.25, 0, -Math.cos(i * 2.1) * 0.25]);
    add(g, cyl(0.07, 0.1, 0.9, 12), gold(), [0, 0.8, 0], [0.9, 0, 0]);
  },
  'steam-engine': (g) => {
    add(g, cyl(0.25, 0.25, 0.8, 14), mat('#2f5d4a', { rough: 0.5, metal: 0.4 }), [0, 0.35, 0], [0, 0, Math.PI / 2]);
    add(g, cyl(0.06, 0.08, 0.5, 8), iron(), [0.25, 0.75, 0]);
    add(g, new THREE.TorusGeometry(0.28, 0.04, 6, 16), iron(), [-0.25, 0.45, 0.3]);
    for (let i = 0; i < 4; i++) add(g, box(0.5, 0.03, 0.03), iron(), [-0.25, 0.45, 0.3], [0, 0, i * Math.PI / 4]);
    for (let i = 0; i < 3; i++) add(g, sphere(0.1 + i * 0.04, 8, 6), mat('#f4f4f4', { opacity: 0.6, key: 'steam' }), [0.25, 1.05 + i * 0.18, 0]);
  },
  lightbulb: (g) => {
    add(g, sphere(0.3, 16, 12), mat('#fff3c4', { rough: 0.1, emissive: '#ffd36b', ei: 0.8 }), [0, 0.7, 0]);
    add(g, cyl(0.13, 0.14, 0.25, 12), mat('#b8b8b8', { rough: 0.3, metal: 0.8 }), [0, 0.32, 0]);
    add(g, cyl(0.07, 0.1, 0.1, 10), iron(), [0, 0.15, 0]);
  },
  telephone: (g) => {
    add(g, box(0.5, 0.25, 0.4), mat('#2b2b33', { rough: 0.4 }), [0, 0.12, 0]);
    add(g, cyl(0.06, 0.06, 0.5, 8), mat('#2b2b33', { rough: 0.4 }), [0, 0.42, 0], [0, 0, Math.PI / 2]);
    for (const s of [-1, 1]) add(g, cyl(0.09, 0.07, 0.1, 10), mat('#2b2b33'), [s * 0.25, 0.38, 0]);
    add(g, cyl(0.13, 0.13, 0.02, 16), gold(), [0, 0.25, 0.2], [Math.PI / 2, 0, 0]);
  },
  airplane: (g) => {
    const cloth = mat('#e9dfc4', { rough: 0.9 });
    for (const y of [0.35, 0.75]) add(g, box(1.3, 0.03, 0.22), cloth, [0, y, 0]);
    for (const x of [-0.6, -0.2, 0.2, 0.6]) add(g, cyl(0.012, 0.012, 0.4, 4), wood(), [x, 0.55, 0]);
    add(g, box(0.06, 0.06, 0.8), wood(), [0, 0.5, -0.25]);
    add(g, box(0.4, 0.15, 0.03), cloth, [0, 0.55, -0.6]);
    add(g, box(0.06, 0.06, 0.05), stone(), [0, 0.1, 0]);
    add(g, cyl(0.02, 0.02, 0.25, 4), wood(), [0, 0.22, 0]);
  },
  rocket: (g) => {
    add(g, cyl(0.16, 0.18, 0.8, 14), mat('#f4f4f4', { rough: 0.4 }), [0, 0.55, 0]);
    add(g, cone(0.16, 0.35, 14), mat('#c0392b', { rough: 0.4 }), [0, 1.12, 0]);
    for (let i = 0; i < 3; i++) add(g, box(0.02, 0.25, 0.2), mat('#2a78d6'), [Math.cos(i * 2.1) * 0.18, 0.25, Math.sin(i * 2.1) * 0.18], [0, -i * 2.1, 0]);
    add(g, cyl(0.06, 0.06, 0.02, 10), mat('#1d2a4a'), [0, 0.75, 0.17], [Math.PI / 2, 0, 0]);
  },
  'moon-boot': (g) => {
    add(g, box(0.36, 0.5, 0.36), mat('#e6e6e6', { rough: 0.6 }), [0, 0.35, -0.05]);
    add(g, box(0.38, 0.14, 0.7), mat('#8a8f96', { rough: 0.7 }), [0, 0.07, 0.08]);
    for (let i = 0; i < 6; i++) add(g, box(0.38, 0.03, 0.04), mat('#5c6167'), [0, 0.0, -0.22 + i * 0.1]);
  },
  computer: (g) => {
    add(g, box(0.7, 0.5, 0.5), mat('#e6dfcf', { rough: 0.6 }), [0, 0.45, 0]);
    add(g, box(0.5, 0.34, 0.02), mat('#1d3a2a', { emissive: '#3fff8a', ei: 0.15 }), [0, 0.47, 0.26]);
    add(g, box(0.8, 0.06, 0.35), mat('#d7d0c0'), [0, 0.03, 0.45]);
    add(g, box(0.75, 0.15, 0.4), mat('#d7d0c0'), [0, 0.15, 0]);
  },
  abacus: (g) => {
    const w = wood();
    add(g, box(0.9, 0.06, 0.12), w, [0, 0.05, 0]);
    add(g, box(0.9, 0.06, 0.12), w, [0, 0.75, 0]);
    for (const s of [-1, 1]) add(g, box(0.06, 0.76, 0.12), w, [s * 0.45, 0.4, 0]);
    for (let r = 0; r < 5; r++) {
      add(g, cyl(0.01, 0.01, 0.84, 4), iron(), [0, 0.15 + r * 0.13, 0], [0, 0, Math.PI / 2]);
      for (let b = 0; b < 5; b++) add(g, sphere(0.05, 8, 5), mat(['#c0392b', '#f2b84b', '#2a78d6', '#1baf7a', '#9b7be0'][r]), [-0.3 + b * 0.09 + (b > 2 ? 0.2 : 0), 0.15 + r * 0.13, 0], [0, 0, Math.PI / 2], [1, 0.7, 1]);
    }
  },
  sundial: (g) => {
    add(g, cyl(0.12, 0.16, 0.5, 10), stone(), [0, 0.25, 0]);
    add(g, cyl(0.42, 0.42, 0.06, 24), bronze(), [0, 0.53, 0]);
    const gn = new THREE.BufferGeometry();
    gn.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.56, -0.3, 0, 0.56, 0.2, 0, 0.86, -0.3], 3));
    gn.computeVertexNormals();
    add(g, gn, mat('#a8743f', { rough: 0.4, metal: 0.6, side: THREE.DoubleSide }));
    for (let i = 0; i < 12; i++) add(g, box(0.02, 0.01, 0.08), mat('#3a2a20'), [Math.cos(i / 12 * Math.PI * 2) * 0.35, 0.565, Math.sin(i / 12 * Math.PI * 2) * 0.35], [0, -i / 12 * Math.PI * 2, 0]);
  },
  wheel: (g) => {
    add(g, new THREE.TorusGeometry(0.45, 0.06, 6, 20), wood(), [0, 0.52, 0]);
    add(g, cyl(0.1, 0.1, 0.18, 10), wood(), [0, 0.52, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) add(g, box(0.04, 0.84, 0.05), wood(), [0, 0.52, 0], [0, 0, (i / 8) * Math.PI]);
  },
  // The sea islands.
  anchor: (g) => {
    add(g, cyl(0.05, 0.05, 0.85, 8), iron(), [0, 0.55, 0]);
    add(g, new THREE.TorusGeometry(0.09, 0.03, 6, 14), iron(), [0, 1.03, 0]);
    add(g, box(0.5, 0.05, 0.05), iron(), [0, 0.85, 0]);
    add(g, new THREE.TorusGeometry(0.32, 0.05, 6, 18, Math.PI), iron(), [0, 0.42, 0], [0, 0, Math.PI]);
    for (const s of [-1, 1]) add(g, cone(0.08, 0.16, 4), iron(), [s * 0.32, 0.48, 0], [0, 0, s * 0.5]);
  },
  conch: (g) => {
    g.add(lathe([[0, 0], [0.18, 0.05], [0.3, 0.25], [0.28, 0.45], [0.18, 0.62], [0.08, 0.82], [0, 0.9]], mat('#f6c9b0', { rough: 0.6 }), 18));
    add(g, sphere(0.2, 12, 8), mat('#f08a7a', { rough: 0.4 }), [0.12, 0.3, 0.15], [0, 0, 0], [1, 1.3, 0.6]);
    for (let i = 0; i < 5; i++) add(g, new THREE.TorusGeometry(0.25 - i * 0.04, 0.02, 4, 16), mat('#e8a98c'), [0, 0.2 + i * 0.13, 0], [Math.PI / 2, 0, 0]);
  },
  'ship-wheel': (g) => {
    add(g, new THREE.TorusGeometry(0.38, 0.05, 8, 24), wood(), [0, 0.6, 0]);
    add(g, cyl(0.09, 0.09, 0.12, 12), gold(), [0, 0.6, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(g, cyl(0.025, 0.03, 0.62, 6), wood(), [Math.cos(a) * 0.3, 0.6 + Math.sin(a) * 0.3, 0], [0, 0, a + Math.PI / 2]);
    }
    add(g, box(0.12, 0.3, 0.12), wood(), [0, 0.15, 0]);
  },
  'diving-helmet': (g) => {
    add(g, sphere(0.36, 18, 12), bronze(), [0, 0.6, 0]);
    add(g, cyl(0.3, 0.36, 0.2, 18), bronze(), [0, 0.25, 0]);
    for (const [x, z, r] of [[0, 0.33, 0.14], [0.3, 0.12, 0.09], [-0.3, 0.12, 0.09]]) {
      add(g, cyl(r + 0.03, r + 0.03, 0.06, 14), gold(), [x, 0.62, z], [Math.PI / 2, Math.atan2(x, z), 0]);
      add(g, cyl(r, r, 0.07, 14), mat('#7fb8d6', { rough: 0.2 }), [x * 1.02, 0.62, z * 1.02], [Math.PI / 2, Math.atan2(x, z), 0]);
    }
  },
  pearl: (g) => {
    for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#a7b3c4', { rough: 0.5 }), [0, 0.25, s * 0.02], [s > 0 ? -0.5 : Math.PI, 0, 0], [1, 0.35, 1]);
    add(g, sphere(0.15, 16, 12), mat('#fff8f0', { rough: 0.15, metal: 0.3 }), [0, 0.32, 0.05]);
  },
  'message-bottle': (g) => {
    g.add(lathe([[0, 0], [0.16, 0.02], [0.17, 0.5], [0.08, 0.66], [0.06, 0.82], [0, 0.82]], mat('#8fd0b4', { rough: 0.15, opacity: 0.6 }), 16));
    add(g, cyl(0.05, 0.05, 0.1, 8), wood(), [0, 0.86, 0]);
    add(g, cyl(0.07, 0.07, 0.32, 10), cream(), [0, 0.28, 0]);
  },
  // The Great Tree.
  acorn: (g) => {
    add(g, sphere(0.3, 16, 12), mat('#b5793f', { rough: 0.5 }), [0, 0.42, 0], [0, 0, 0], [1, 1.25, 1]);
    add(g, new THREE.SphereGeometry(0.33, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#7a5a36', { rough: 0.95 }), [0, 0.62, 0]);
    add(g, cyl(0.03, 0.04, 0.16, 6), mat('#5a3a20'), [0, 0.98, 0]);
  },
  pinecone: (g) => {
    for (let i = 0; i < 9; i++) {
      const y = 0.15 + i * 0.09, r = 0.32 * Math.sin(Math.PI * (0.15 + i / 10));
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + i * 0.4;
        add(g, box(0.12, 0.04, 0.16), mat(i % 2 ? '#8a5a32' : '#a06a3a', { rough: 0.9 }), [Math.sin(a) * r, y, Math.cos(a) * r], [-0.5, a, 0]);
      }
    }
    add(g, sphere(0.2, 10, 8), mat('#6b4426'), [0, 0.5, 0], [0, 0, 0], [1, 2.2, 1]);
  },
  'tree-ring': (g) => {
    add(g, cyl(0.45, 0.45, 0.16, 28), mat('#e8c99a', { rough: 0.9 }), [0, 0.5, 0], [Math.PI / 2, 0, 0]);
    for (let i = 1; i < 7; i++) add(g, new THREE.TorusGeometry(i * 0.06, 0.008, 4, 32), mat('#9a6b45'), [0, 0.5, 0.085]);
    add(g, new THREE.TorusGeometry(0.45, 0.04, 6, 32), mat('#6b4a30'), [0, 0.5, 0]);
    add(g, box(0.5, 0.06, 0.3), wood(), [0, 0.03, 0]);
  },
  magnifier: (g) => {
    add(g, new THREE.TorusGeometry(0.28, 0.04, 8, 28), gold(), [0, 0.72, 0]);
    add(g, cyl(0.26, 0.26, 0.02, 24), mat('#cfefff', { rough: 0.1, opacity: 0.5 }), [0, 0.72, 0], [Math.PI / 2, 0, 0]);
    add(g, cyl(0.05, 0.06, 0.5, 8), wood(), [0, 0.22, 0], [0, 0, 0.0]);
  }
};

export function buildArtifact(model) {
  const g = new THREE.Group();
  (MODELS[model] ?? MODELS.scroll)(g);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}
export const ARTIFACT_MODELS = Object.keys(MODELS);
