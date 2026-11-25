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
  },
  // The Desert of the Pyramids.
  shadoof: (g) => {
    for (const x of [-0.08, 0.08]) add(g, box(0.05, 0.7, 0.08), wood(), [x, 0.35, 0]);
    add(g, cyl(0.025, 0.025, 1.2, 8), wood(), [0, 0.72, 0], [0, 0, 1.25]);
    add(g, sphere(0.12, 10, 8), clay(), [-0.52, 0.62, 0]);
    add(g, cyl(0.006, 0.006, 0.4, 4), mat('#6b5b4b'), [0.56, 0.7, 0]);
    const bucket = lathe([[0, 0], [0.09, 0.0], [0.11, 0.14], [0.1, 0.16], [0, 0.16]], clay());
    bucket.position.set(0.56, 0.36, 0);
    g.add(bucket);
    add(g, box(0.9, 0.04, 0.35), mat('#7fb8d6', { rough: 0.2 }), [0.25, 0.02, 0]);
  },
  senet: (g) => {
    add(g, box(0.9, 0.16, 0.34), mat('#c49a5a', { rough: 0.7 }), [0, 0.38, 0]);
    add(g, box(0.92, 0.04, 0.36), mat('#3d2a1c'), [0, 0.28, 0]);
    for (const x of [-0.38, 0.38]) for (const z of [-0.13, 0.13]) add(g, box(0.05, 0.28, 0.05), mat('#3d2a1c'), [x, 0.14, z]);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) add(g, box(0.075, 0.01, 0.09), mat((r + c) % 2 ? '#f3e6c4' : '#e2cfa0'), [-0.36 + c * 0.08, 0.465, -0.1 + r * 0.1]);
    for (const [c, r, col] of [[1, 0, '#2b4fa8'], [3, 1, '#2b4fa8'], [6, 2, '#f2ead8'], [8, 0, '#f2ead8']]) add(g, cyl(0.025, 0.03, 0.07, 10), mat(col, { rough: 0.4 }), [-0.36 + c * 0.08, 0.505, -0.1 + r * 0.1]);
  },
  papyrus: (g) => {
    add(g, box(0.7, 0.62, 0.02), mat('#ead9a8', { rough: 0.95 }), [0, 0.56, 0], [-0.12, 0, 0]);
    for (const y of [0.25, 0.87]) add(g, cyl(0.05, 0.05, 0.76, 12), mat('#d9c48e'), [0, y, y > 0.5 ? -0.07 : 0.07], [0, 0, Math.PI / 2]);
    const ink = mat('#2a2420');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) add(g, box(0.05, 0.06, 0.01), (r + c) % 4 ? ink : mat('#b5442e'), [-0.25 + c * 0.1, 0.74 - r * 0.12, 0.02 - r * 0.015], [-0.12, 0, 0]);
  },
  'salt-slab': (g) => {
    add(g, box(0.9, 0.5, 0.14), mat('#f2efe8', { rough: 0.6 }), [0, 0.3, 0.06], [0, 0, 0]);
    add(g, box(0.9, 0.5, 0.14), mat('#e6e0d4', { rough: 0.6 }), [0, 0.3, -0.1], [0.06, 0, 0]);
    for (const x of [-0.3, 0.3]) add(g, box(0.05, 0.54, 0.34), mat('#8a5e3c', { rough: 0.9 }), [x, 0.3, -0.02]);
  },
  'cubit-rod': (g) => {
    add(g, box(1.04, 0.07, 0.09), mat('#2b2b33', { rough: 0.5 }), [0, 0.4, 0], [0, 0, 0.0]);
    for (let i = 0; i <= 7; i++) add(g, box(0.008, 0.075, 0.095), gold(), [-0.52 + i * (1.04 / 7), 0.4, 0]);
    for (let i = 0; i < 28; i++) add(g, box(0.004, 0.03, 0.096), mat('#f2c14e'), [-0.52 + i * (1.04 / 28), 0.425, 0]);
    for (const x of [-0.3, 0.3]) add(g, box(0.06, 0.36, 0.2), wood(), [x, 0.18, 0]);
  },
  obelisk: (g) => {
    add(g, box(0.3, 0.06, 0.3), mat('#c98a76', { rough: 0.8 }), [0, 0.03, 0]);
    add(g, cyl(0.07, 0.11, 0.95, 4), mat('#d99a84', { rough: 0.8 }), [0, 0.53, 0], [0, Math.PI / 4, 0]);
    add(g, cone(0.1, 0.12, 4), gold(), [0, 1.06, 0], [0, Math.PI / 4, 0]);
    for (let i = 0; i < 5; i++) add(g, box(0.05, 0.04, 0.01), mat('#7a3f30'), [0, 0.85 - i * 0.12, 0.085 + i * 0.006]);
  },
  'rosetta-stone': (g) => {
    add(g, box(0.62, 0.85, 0.2), mat('#3e3d44', { rough: 0.7 }), [0, 0.48, 0], [0, 0, 0.03]);
    add(g, box(0.3, 0.2, 0.2), mat('#3e3d44', { rough: 0.7 }), [-0.14, 0.95, 0], [0, 0, 0.5]);
    const scratch = mat('#9a98a3');
    for (let r = 0; r < 12; r++) add(g, box(r < 3 ? 0.36 : r < 7 ? 0.5 : 0.54, 0.012, 0.01), scratch, [0, 0.82 - r * 0.055, 0.105]);
    for (const y of [0.66, 0.42]) add(g, box(0.56, 0.008, 0.012), mat('#c9c7cf'), [0, y, 0.106]);
  },
  astrolabe: (g) => {
    add(g, cyl(0.36, 0.36, 0.05, 32), bronze(), [0, 0.6, 0], [Math.PI / 2, 0, 0]);
    add(g, new THREE.TorusGeometry(0.36, 0.035, 8, 36), gold(), [0, 0.6, 0]);
    add(g, new THREE.TorusGeometry(0.08, 0.025, 6, 16), gold(), [0, 1.02, 0]);
    add(g, box(0.06, 0.06, 0.04), gold(), [0, 0.97, 0]);
    add(g, box(0.62, 0.03, 0.02), gold(), [0, 0.6, 0.04], [0, 0, 0.4]);
    for (let i = 0; i < 6; i++) add(g, sphere(0.02, 6, 4), mat('#fff1c4', { rough: 0.3, metal: 0.6 }), [Math.cos(i) * 0.22, 0.6 + Math.sin(i * 1.7) * 0.2, 0.04]);
    add(g, box(0.06, 0.3, 0.06), wood(), [0, 0.15, 0]);
  },
  manuscript: (g) => {
    add(g, box(0.62, 0.08, 0.46), mat('#8a4f2c', { rough: 0.7 }), [0, 0.42, 0]);
    add(g, box(0.58, 0.06, 0.42), cream(), [0.01, 0.48, 0]);
    add(g, box(0.62, 0.02, 0.46), mat('#8a4f2c', { rough: 0.7 }), [0, 0.52, 0]);
    add(g, box(0.06, 0.12, 0.47), mat('#b5793f'), [0.12, 0.47, 0]);
    add(g, box(0.18, 0.005, 0.18), mat('#c9963f'), [-0.1, 0.531, 0], [0, Math.PI / 4, 0]);
    add(g, box(0.3, 0.38, 0.3), wood(), [0, 0.19, 0]);
  },
  'golden-mask': (g) => {
    add(g, sphere(0.36, 20, 14), gold(), [0, 0.62, 0], [0, 0, 0], [1, 1.15, 0.8]);
    const blue = mat('#2b4fa8', { rough: 0.4 });
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) add(g, box(0.1, 0.035, 0.22), i % 2 ? blue : gold(), [s * 0.33, 0.5 - i * 0.07, -0.02]);
    for (let i = 0; i < 4; i++) add(g, box(0.5 + i * 0.03, 0.03, 0.05), i % 2 ? blue : gold(), [0, 0.26 - i * 0.05, 0.12]);
    for (const s of [-1, 1]) add(g, sphere(0.05, 10, 8), mat('#ffffff', { rough: 0.3 }), [s * 0.12, 0.7, 0.27], [0, 0, 0], [1.3, 0.7, 0.5]);
    for (const s of [-1, 1]) add(g, sphere(0.025, 8, 6), mat('#1a1a24'), [s * 0.12, 0.7, 0.29]);
    add(g, cyl(0.03, 0.05, 0.16, 8), blue, [0, 0.36, 0.22], [0.2, 0, 0]);
    add(g, sphere(0.06, 10, 8), gold(), [0, 0.98, 0.22]);
  },
  'temple-statue': (g) => {
    add(g, box(0.9, 0.12, 0.4), stone(), [0, 0.06, 0]);
    for (const x of [-0.24, 0.24]) {
      const sand = mat('#e0b07c', { rough: 0.9 });
      add(g, box(0.3, 0.32, 0.3), sand, [x, 0.28, 0]);
      add(g, box(0.22, 0.32, 0.18), sand, [x, 0.6, -0.04]);
      add(g, sphere(0.1, 12, 8), sand, [x, 0.86, 0]);
      add(g, cone(0.13, 0.2, 4), mat('#f2d49a', { rough: 0.9 }), [x, 0.82, -0.02], [0, Math.PI / 4, 0]);
      for (const s of [-1, 1]) add(g, box(0.05, 0.14, 0.06), mat('#f2d49a'), [x + s * 0.1, 0.74, 0.02]);
    }
  },
  // The Moon's museum.
  mortar: (g) => {
    g.add(lathe([[0, 0.02], [0.3, 0.02], [0.38, 0.12], [0.42, 0.42], [0.36, 0.44], [0.3, 0.2], [0, 0.18]], wood(), 20));
    add(g, cyl(0.42, 0.42, 0.04, 20), mat('#6e4a2e', { rough: 0.85 }), [0, 0.42, 0]);
    add(g, cyl(0.05, 0.07, 0.85, 10), mat('#b98a5e', { rough: 0.8 }), [0.06, 0.62, 0], [0, 0, -0.35]);
    for (let i = 0; i < 3; i++) add(g, sphere(0.07, 10, 8), mat('#fbf7ef', { rough: 0.6 }), [-0.14 + i * 0.12, 0.43, 0.12 - i * 0.05], [0, 0, 0], [1, 0.6, 1]);
  },
  mooncake: (g) => {
    add(g, cyl(0.24, 0.26, 0.06, 6), wood(), [0, 0.03, 0]);
    add(g, cyl(0.42, 0.44, 0.3, 28), mat('#c98a3f', { rough: 0.6 }), [0, 0.6, 0], [Math.PI / 2 - 0.25, 0, 0]);
    add(g, cyl(0.36, 0.36, 0.02, 28), mat('#e0a856', { rough: 0.5 }), [0, 0.62, 0.15], [Math.PI / 2 - 0.25, 0, 0]);
    for (let i = 0; i < 8; i++) add(g, sphere(0.07, 8, 6), mat('#d99a4a', { rough: 0.5 }), [Math.cos(i * 0.785) * 0.42, 0.6 + Math.sin(i * 0.785) * 0.41, 0.04 + Math.sin(i * 0.785) * 0.1]);
    add(g, sphere(0.1, 12, 8), mat('#f0b04a', { rough: 0.4, emissive: '#ffb648', ei: 0.15 }), [0, 0.62, 0.17], [0, 0, 0], [1, 1, 0.4]);
  },
  satellite: (g) => {
    add(g, cyl(0.08, 0.1, 0.3, 8), iron(), [0, 0.15, 0]);
    add(g, sphere(0.28, 24, 16), mat('#d8dde4', { rough: 0.15, metal: 0.9 }), [0, 0.62, 0]);
    for (const [ax, az] of [[0.5, 0.2], [-0.5, 0.2], [0.35, -0.4], [-0.35, -0.4]]) add(g, cyl(0.012, 0.012, 1.0, 5), mat('#c3cad6', { rough: 0.3, metal: 0.8 }), [ax * 0.5, 0.5, az * 0.5 - 0.3], [-1.1, 0, ax * 0.9]);
  },
  capsule: (g) => {
    add(g, cyl(0.3, 0.36, 0.12, 12), iron(), [0, 0.06, 0]);
    add(g, sphere(0.42, 22, 16), mat('#9aa3ad', { rough: 0.5, metal: 0.4 }), [0, 0.55, 0]);
    for (const x of [-0.15, 0.15]) add(g, cyl(0.07, 0.07, 0.04, 14), mat('#1d2a4a', { rough: 0.2, emissive: '#7cc6ff', ei: 0.2 }), [x, 0.64, 0.39], [Math.PI / 2, 0, 0]);
    add(g, new THREE.TorusGeometry(0.42, 0.03, 6, 28), mat('#6b7480', { metal: 0.6 }), [0, 0.55, 0], [Math.PI / 2, 0, 0]);
  },
  'space-helmet': (g) => {
    add(g, cyl(0.2, 0.26, 0.2, 14), iron(), [0, 0.1, 0]);
    add(g, sphere(0.36, 22, 16), mat('#f4f4f4', { rough: 0.35 }), [0, 0.58, 0]);
    add(g, sphere(0.3, 18, 12), mat('#2b3f6b', { rough: 0.1, metal: 0.4, emissive: '#7cc6ff', ei: 0.1 }), [0, 0.58, 0.12], [0, 0, 0], [0.85, 0.7, 0.75]);
    add(g, new THREE.TorusGeometry(0.33, 0.04, 6, 24), mat('#c0392b', { rough: 0.4 }), [0, 0.3, 0], [Math.PI / 2, 0, 0]);
  },
  'slide-rule': (g) => {
    add(g, box(0.2, 0.3, 0.2), wood(), [0, 0.15, 0]);
    add(g, box(1.1, 0.16, 0.04), mat('#f4efe2', { rough: 0.6 }), [0, 0.5, 0], [0, 0, 0.25]);
    add(g, box(1.1, 0.06, 0.05), mat('#e6dcc4', { rough: 0.6 }), [0.12, 0.53, 0.01], [0, 0, 0.25]);
    add(g, box(0.1, 0.22, 0.07), mat('#d9e6f2', { opacity: 0.6, key: 'slideglass' }), [-0.1, 0.48, 0], [0, 0, 0.25]);
    for (let i = 0; i < 9; i++) add(g, box(0.006, 0.05, 0.05), mat('#3a2a24'), [-0.42 + i * 0.1, 0.38 + i * 0.026, 0.02], [0, 0, 0.25]);
  },
  'moon-rock': (g) => {
    add(g, cyl(0.3, 0.34, 0.12, 12), mat('#2b2f3a', { rough: 0.6 }), [0, 0.06, 0]);
    const geo = new THREE.IcosahedronGeometry(0.34, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + 0.14 * Math.sin(p.getX(i) * 9) * Math.cos(p.getZ(i) * 7) + 0.08 * Math.sin(p.getY(i) * 13);
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k);
    }
    geo.computeVertexNormals();
    add(g, geo, mat('#8f8f96', { rough: 1 }), [0, 0.4, 0]);
    add(g, new THREE.CylinderGeometry(0.4, 0.4, 0.7, 20, 1, true), mat('#d9f2ff', { opacity: 0.2, key: 'rockcase' }), [0, 0.45, 0]);
  },
  'space-telescope': (g) => {
    add(g, box(0.1, 0.3, 0.1), iron(), [0, 0.15, 0]);
    add(g, cyl(0.2, 0.2, 0.9, 16), mat('#d8dde4', { rough: 0.25, metal: 0.8 }), [0, 0.6, 0], [0, 0, Math.PI / 2]);
    add(g, cyl(0.21, 0.21, 0.08, 16), mat('#2b2f3a'), [0.48, 0.6, 0], [0, 0, Math.PI / 2]);
    for (const s of [-1, 1]) add(g, box(0.5, 0.02, 0.24), mat('#2a4f9a', { rough: 0.3, metal: 0.4 }), [-0.1, 0.6, s * 0.45]);
    add(g, cyl(0.02, 0.02, 0.7, 5), iron(), [-0.1, 0.6, 0], [Math.PI / 2, 0, 0]);
  },
  'space-station': (g) => {
    add(g, cyl(0.05, 0.08, 0.4, 8), iron(), [0, 0.2, 0]);
    add(g, box(1.2, 0.04, 0.05), mat('#c3cad6', { metal: 0.7 }), [0, 0.5, 0]);
    for (const x of [-0.5, -0.3, 0.3, 0.5]) for (const s of [-1, 1]) add(g, box(0.16, 0.01, 0.36), mat('#c99a3f', { rough: 0.3, metal: 0.5 }), [x, 0.5, s * 0.22]);
    add(g, cyl(0.08, 0.08, 0.5, 12), mat('#f4f4f4', { rough: 0.4 }), [0, 0.5, 0], [Math.PI / 2, 0, 0]);
    add(g, cyl(0.07, 0.07, 0.3, 12), mat('#e6e9ee', { rough: 0.4 }), [0.12, 0.5, 0.1], [0, 0, Math.PI / 2]);
  },
  shuttle: (g) => {
    add(g, box(0.12, 0.3, 0.12), iron(), [0, 0.15, 0]);
    add(g, cyl(0.12, 0.14, 0.9, 14), mat('#f4f4f4', { rough: 0.4 }), [0, 0.55, 0], [Math.PI / 2, 0, 0]);
    add(g, cone(0.12, 0.25, 14), mat('#2b2f3a', { rough: 0.5 }), [0, 0.55, 0.57], [Math.PI / 2, 0, 0]);
    const wing = new THREE.Shape();
    wing.moveTo(0, 0.3);
    wing.lineTo(0.42, -0.35);
    wing.lineTo(-0.42, -0.35);
    wing.closePath();
    add(g, new THREE.ExtrudeGeometry(wing, { depth: 0.03, bevelEnabled: false }), mat('#2b2f3a', { rough: 0.5 }), [0, 0.5, 0.05], [-Math.PI / 2, 0, 0]);
    add(g, box(0.02, 0.25, 0.2), mat('#f4f4f4'), [0, 0.72, -0.35]);
  },
  'moon-rover': (g) => {
    add(g, box(0.6, 0.14, 0.42), mat('#e6e9ee', { rough: 0.4 }), [0, 0.3, 0]);
    for (const x of [-0.26, 0, 0.26]) for (const s of [-1, 1]) add(g, cyl(0.09, 0.09, 0.07, 12), mat('#3a3f4c', { rough: 0.8 }), [x, 0.12, s * 0.26], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) add(g, box(0.34, 0.015, 0.3), mat('#2a4f9a', { rough: 0.3, metal: 0.4 }), [0, 0.42, s * 0.35], [s * 0.4, 0, 0]);
    add(g, cyl(0.02, 0.02, 0.3, 5), iron(), [0.2, 0.52, 0]);
    add(g, box(0.14, 0.08, 0.1), mat('#c99a3f', { metal: 0.5 }), [0.2, 0.7, 0]);
  },
  'air-filter': (g) => {
    add(g, box(0.36, 0.36, 0.36), mat('#9aa3ad', { rough: 0.6, metal: 0.3 }), [-0.2, 0.18, 0]);
    add(g, box(0.4, 0.4, 0.06), mat('#d9c48a', { rough: 0.9 }), [-0.2, 0.2, 0.2]);
    add(g, box(0.38, 0.05, 0.4), mat('#c0c4cc', { rough: 0.4, opacity: 0.85, key: 'filterbag' }), [-0.2, 0.42, 0.02]);
    add(g, limbTube(), mat('#4c5560', { rough: 0.5 }), [0, 0, 0]);
    for (let i = 0; i < 3; i++) add(g, box(0.42, 0.05, 0.02), mat('#b0b5bd', { rough: 0.7 }), [-0.2, 0.08 + i * 0.12, 0.235]);
  },
  orbiter: (g) => {
    add(g, cyl(0.06, 0.08, 0.3, 8), iron(), [0, 0.15, 0]);
    add(g, box(0.42, 0.42, 0.42), mat('#d7b45a', { rough: 0.3, metal: 0.6 }), [0, 0.55, 0]);
    for (const s of [-1, 1]) add(g, box(0.5, 0.02, 0.3), mat('#2a4f9a', { rough: 0.3, metal: 0.4 }), [s * 0.48, 0.6, 0]);
    add(g, cyl(0.07, 0.09, 0.12, 12), mat('#2b2f3a'), [0, 0.38, 0.12]);
    add(g, cyl(0.14, 0.02, 0.08, 14), mat('#e6e9ee', { metal: 0.5 }), [0, 0.82, 0]);
  },
  // The Mars Museum.
  'mars-globe': (g) => {
    // An old Mars globe on a wooden stand: a red-orange ball with dark patches, a white cap and thin "canal" lines.
    add(g, cyl(0.2, 0.25, 0.08, 10), wood(), [0, 0.04, 0]);
    add(g, cyl(0.03, 0.03, 0.35, 6), bronze(), [0, 0.2, 0]);
    add(g, sphere(0.38, 20, 14), mat('#d9774a', { rough: 0.7 }), [0, 0.65, 0]);
    for (let i = 0; i < 5; i++) add(g, ico(0.12), mat('#9a4a2c', { rough: 0.9 }), [Math.cos(i * 1.3) * 0.31, 0.6 + Math.sin(i * 2.1) * 0.12, Math.sin(i * 1.3) * 0.31], [0, 0, 0], [1.4, 0.5, 1.4]);
    add(g, sphere(0.12, 12, 6), mat('#ffffff', { rough: 0.5 }), [0, 1.0, 0], [0, 0, 0], [1.4, 0.4, 1.4]);
    for (let i = 0; i < 4; i++) add(g, new THREE.TorusGeometry(0.385, 0.006, 3, 24, 1.1), mat('#5a2a1a'), [0, 0.65, 0], [0.4 + i * 0.5, i * 1.2, 0.2]);
    add(g, new THREE.TorusGeometry(0.43, 0.02, 4, 24, Math.PI), bronze(), [0, 0.65, 0], [0, 0, -0.4]);
  },
  pastels: (g) => {
    // The first Mars picture coloured in by hand: a board of number strips shaded with pastel crayons, crayons in front.
    add(g, box(0.9, 0.7, 0.05), mat('#f4efe2', { rough: 0.9 }), [0, 0.6, 0], [-0.15, 0, 0]);
    const shades = ['#5a3a2a', '#8a5a3a', '#b9784a', '#d99a5a', '#f0c27a', '#c98a5a'];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) add(g, box(0.11, 0.11, 0.02), mat(shades[(r * 3 + c * 2 + (r * c) % 3) % shades.length], { rough: 1 }), [-0.33 + c * 0.11, 0.84 - r * 0.11, 0.03 + r * 0.016], [-0.15, 0, 0]);
    add(g, box(0.5, 0.06, 0.25), wood(), [0, 0.03, 0.2]);
    ['#d9603b', '#f2c14e', '#8a5a3a', '#ff9e7a'].forEach((col, i) => add(g, cyl(0.03, 0.03, 0.22, 8), mat(col, { rough: 0.8 }), [-0.15 + i * 0.1, 0.09, 0.22], [0, 0, Math.PI / 2]));
  },
  'viking-lander': (g) => {
    // Three legs with round footpads, a six-sided body, a tall camera mast, a dish and a little scoop arm.
    for (let i = 0; i < 3; i++) {
      const a = i * 2.09;
      add(g, cyl(0.025, 0.025, 0.4, 6), iron(), [Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]);
      add(g, cyl(0.08, 0.08, 0.02, 12), iron(), [Math.cos(a) * 0.42, 0.01, Math.sin(a) * 0.42]);
    }
    add(g, cyl(0.32, 0.32, 0.16, 6), mat('#d8dde4', { rough: 0.3, metal: 0.6 }), [0, 0.42, 0]);
    add(g, box(0.18, 0.14, 0.18), mat('#d7b45a', { rough: 0.3, metal: 0.6 }), [-0.08, 0.56, 0.05]);
    add(g, cyl(0.025, 0.025, 0.35, 6), iron(), [0.16, 0.66, 0.1]);
    add(g, box(0.1, 0.12, 0.08), mat('#e6e9ee', { metal: 0.4 }), [0.16, 0.86, 0.1]);
    add(g, cyl(0.2, 0.03, 0.06, 16), mat('#f4f4f4', { metal: 0.3 }), [-0.12, 0.78, -0.12], [0.6, 0, 0.3]);
    add(g, cyl(0.015, 0.015, 0.4, 5), iron(), [0.3, 0.48, -0.08], [0, 0, -1.0]);
    add(g, box(0.07, 0.05, 0.07), iron(), [0.47, 0.37, -0.08]);
  },
  'airbag-lander': (g) => {
    // A little lander wrapped in a bunch of white airbag balloons, bounced to a stop.
    add(g, cyl(0.3, 0.34, 0.08, 12), mat('#c97a50', { rough: 0.95 }), [0, 0.04, 0]);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(g, sphere(0.2, 14, 10), mat('#f4f1ea', { rough: 0.6 }), [Math.cos(a) * 0.28, 0.42 + (i % 2) * 0.14 - 0.07, Math.sin(a) * 0.28]);
    }
    add(g, sphere(0.2, 14, 10), mat('#f4f1ea', { rough: 0.6 }), [0, 0.68, 0]);
    add(g, sphere(0.2, 14, 10), mat('#f4f1ea', { rough: 0.6 }), [0, 0.2, 0]);
    add(g, cone(0.18, 0.2, 3), mat('#d7b45a', { rough: 0.3, metal: 0.6 }), [0, 0.45, 0.32], [Math.PI / 2, 0, 0]);
  },
  'twin-rover': (g) => {
    // Six wheels on rocker legs, a flat deck of solar panels like wings, and a tall mast with two camera eyes.
    for (const x of [-0.26, 0, 0.26]) for (const s of [-1, 1]) add(g, cyl(0.08, 0.08, 0.07, 12), mat('#3a3f4c', { rough: 0.8 }), [x, 0.08, s * 0.26], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) add(g, box(0.56, 0.03, 0.03), iron(), [0, 0.18, s * 0.24], [0, 0, 0.1]);
    add(g, box(0.4, 0.16, 0.3), mat('#e6e9ee', { rough: 0.4 }), [0, 0.28, 0]);
    add(g, box(0.62, 0.02, 0.5), mat('#2a4f9a', { rough: 0.3, metal: 0.4 }), [0, 0.37, 0]);
    for (const s of [-1, 1]) add(g, box(0.2, 0.02, 0.3), mat('#2a4f9a', { rough: 0.3, metal: 0.4 }), [s * 0.4, 0.38, -0.05], [0, 0, s * 0.2]);
    add(g, cyl(0.025, 0.025, 0.42, 6), iron(), [0.2, 0.58, 0.15]);
    add(g, box(0.18, 0.07, 0.07), mat('#e6e9ee'), [0.2, 0.8, 0.15]);
    for (const s of [-1, 1]) add(g, cyl(0.022, 0.022, 0.02, 10), mat('#1d2a4a', { emissive: '#7cc6ff', ei: 0.2 }), [0.2 + s * 0.05, 0.8, 0.19], [Math.PI / 2, 0, 0]);
  },
  'mars-orbiter': (g) => {
    // A gold box with one wing of solar panels and a big dish on top (Mangalyaan's shape, simplified).
    add(g, cyl(0.06, 0.08, 0.3, 8), iron(), [0, 0.15, 0]);
    add(g, box(0.4, 0.4, 0.4), mat('#d7b45a', { rough: 0.3, metal: 0.6 }), [0, 0.52, 0]);
    add(g, cyl(0.01, 0.01, 0.2, 5), iron(), [0.3, 0.52, 0], [0, 0, Math.PI / 2]);
    for (let i = 0; i < 3; i++) add(g, box(0.22, 0.02, 0.34), mat('#2a4f9a', { rough: 0.3, metal: 0.4 }), [0.5 + i * 0.24, 0.52, 0]);
    add(g, cyl(0.3, 0.06, 0.08, 20), mat('#f4f4f4', { metal: 0.3 }), [0, 0.8, 0]);
    add(g, cyl(0.015, 0.015, 0.12, 5), iron(), [0, 0.88, 0]);
  },
  'rover-wheel': (g) => {
    // A big aluminium rover wheel with curved spokes and zigzag treads; the holes in the tread spell "JPL" in Morse code.
    add(g, box(0.5, 0.06, 0.3), mat('#2b2f3a', { rough: 0.6 }), [0, 0.03, 0]);
    const rim = mat('#c3cad6', { rough: 0.3, metal: 0.8 });
    add(g, cyl(0.42, 0.42, 0.34, 28), rim, [0, 0.5, 0], [Math.PI / 2, 0, 0]);
    add(g, cyl(0.34, 0.34, 0.36, 28), mat('#8a929e', { rough: 0.5, metal: 0.5 }), [0, 0.5, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 6; i++) add(g, box(0.04, 0.34, 0.03), rim, [Math.cos(i * 1.047) * 0.16, 0.5 + Math.sin(i * 1.047) * 0.16, 0.18], [0, 0, i * 1.047 + 0.3]);
    add(g, cyl(0.07, 0.07, 0.38, 12), iron(), [0, 0.5, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      add(g, box(0.05, 0.03, 0.34), mat('#a9b0bc', { metal: 0.6 }), [Math.cos(a) * 0.43, 0.5 + Math.sin(a) * 0.43, 0], [0, 0, a]);
    }
    const dots = [1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1];
    dots.forEach((d, i) => {
      const a = 1.9 + i * 0.12;
      add(g, d ? box(0.03, 0.01, 0.08) : box(0.03, 0.01, 0.03), mat('#2b2f3a'), [Math.cos(a) * 0.425, 0.5 + Math.sin(a) * 0.425, 0], [0, 0, a + Math.PI / 2]);
    });
  },
  'hope-probe': (g) => {
    // A six-sided spacecraft with three solar panels and a big white dish (the Hope orbiter's shape, simplified).
    add(g, cyl(0.06, 0.08, 0.3, 8), iron(), [0, 0.15, 0]);
    add(g, cyl(0.26, 0.26, 0.42, 6), mat('#d8dde4', { rough: 0.25, metal: 0.8 }), [0, 0.55, 0]);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      add(g, box(0.5, 0.02, 0.26), mat('#2a4f9a', { rough: 0.3, metal: 0.4 }), [Math.cos(a) * 0.5, 0.45, Math.sin(a) * 0.5], [0, -a, 0]);
    }
    add(g, cyl(0.34, 0.08, 0.1, 22), mat('#f4f4f4', { metal: 0.3 }), [0, 0.82, 0]);
    add(g, box(0.1, 0.08, 0.06), mat('#d7b45a', { metal: 0.6 }), [0, 0.6, 0.27]);
  },
  'sample-tube': (g) => {
    // A shiny sample tube with a rock core inside, in its holder: the tubes a rover fills to send home one day.
    add(g, cyl(0.26, 0.3, 0.1, 16), mat('#2b2f3a', { rough: 0.6 }), [0, 0.05, 0]);
    add(g, cyl(0.07, 0.07, 0.75, 18), mat('#e6e9ee', { rough: 0.15, metal: 0.9 }), [0, 0.5, 0], [0, 0, 0.12]);
    add(g, cyl(0.055, 0.055, 0.3, 14), mat('#b9663e', { rough: 1 }), [0.02, 0.42, 0.04], [0, 0, 0.12]);
    add(g, cyl(0.078, 0.078, 0.07, 18), mat('#d7b45a', { rough: 0.3, metal: 0.7 }), [-0.045, 0.88, 0], [0, 0, 0.12]);
    add(g, new THREE.CylinderGeometry(0.22, 0.22, 0.9, 20, 1, true), mat('#d9f2ff', { opacity: 0.2, key: 'tubecase' }), [0, 0.5, 0]);
  },
  'butterfly-rover': (g) => {
    // Six wheels, a boxy body, a camera mast, and four blue solar panels open like butterfly wings.
    for (const x of [-0.24, 0, 0.24]) for (const s of [-1, 1]) add(g, cyl(0.08, 0.08, 0.07, 12), mat('#3a3f4c', { rough: 0.8 }), [x, 0.08, s * 0.24], [Math.PI / 2, 0, 0]);
    add(g, box(0.44, 0.18, 0.3), mat('#f4f4f4', { rough: 0.4 }), [0, 0.28, 0]);
    for (const s of [-1, 1]) for (const z of [-0.12, 0.12]) add(g, box(0.34, 0.015, 0.22), mat('#2f6fd6', { rough: 0.3, metal: 0.4 }), [s * 0.36, 0.48, z * 1.6], [0, z > 0 ? -s * 0.3 : s * 0.3, s * 0.55]);
    add(g, cyl(0.025, 0.025, 0.4, 6), iron(), [0.15, 0.56, 0.12]);
    add(g, box(0.16, 0.08, 0.08), mat('#e6e9ee'), [0.15, 0.78, 0.12]);
    add(g, box(0.06, 0.06, 0.02), mat('#d9603b'), [-0.12, 0.33, 0.16]);
  },
  'mars-helicopter': (g) => {
    // A tissue-box body on four springy legs, two long stacked rotor blades, and a solar panel on top.
    for (let i = 0; i < 4; i++) {
      const a = i * 1.571 + 0.785;
      add(g, cyl(0.012, 0.012, 0.42, 5), mat('#c3cad6', { metal: 0.6 }), [Math.cos(a) * 0.16, 0.2, Math.sin(a) * 0.16], [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]);
    }
    add(g, box(0.2, 0.16, 0.2), mat('#d7b45a', { rough: 0.3, metal: 0.6 }), [0, 0.42, 0]);
    add(g, cyl(0.018, 0.018, 0.4, 6), iron(), [0, 0.68, 0]);
    for (const [y, r] of [[0.62, 0.2], [0.72, -0.4]]) add(g, box(1.1, 0.012, 0.09), mat('#2b2f3a', { rough: 0.4 }), [0, y, 0], [0, r, 0]);
    add(g, box(0.22, 0.015, 0.16), mat('#2a4f9a', { rough: 0.3, metal: 0.4 }), [0, 0.89, 0]);
  },
  moxie: (g) => {
    // A gold box about the size of a car battery, with pipes and a little glowing window: the machine that made oxygen on Mars.
    add(g, box(0.5, 0.06, 0.4), mat('#2b2f3a', { rough: 0.6 }), [0, 0.03, 0]);
    add(g, box(0.42, 0.42, 0.34), mat('#d7b45a', { rough: 0.25, metal: 0.8 }), [0, 0.3, 0]);
    for (let i = 0; i < 4; i++) add(g, box(0.43, 0.012, 0.35), mat('#b8963f', { metal: 0.7 }), [0, 0.14 + i * 0.1, 0]);
    add(g, cyl(0.06, 0.06, 0.03, 16), mat('#7ff7ff', { emissive: '#7ff7ff', ei: 0.6 }), [0.08, 0.36, 0.175], [Math.PI / 2, 0, 0]);
    add(g, cyl(0.025, 0.025, 0.4, 8), iron(), [-0.16, 0.6, 0.06]);
    add(g, cyl(0.025, 0.025, 0.3, 8), iron(), [0.04, 0.6, -0.08], [0, 0, 0.6]);
    for (let i = 0; i < 3; i++) add(g, sphere(0.05, 10, 8), mat('#cfefff', { opacity: 0.55, key: 'o2bubble' }), [-0.16 + i * 0.03, 0.84 + i * 0.09, 0.06]);
  }
};

/** A curved hose for the Apollo 13 air-filter fix. */
function limbTube() {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.2, 0.24), new THREE.Vector3(0.2, 0.3, 0.3), new THREE.Vector3(0.36, 0.5, 0.1), new THREE.Vector3(0.38, 0.75, -0.05)]);
  return new THREE.TubeGeometry(curve, 20, 0.06, 8, false);
}

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
