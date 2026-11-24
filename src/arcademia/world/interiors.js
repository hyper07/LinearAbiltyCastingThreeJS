/**
 * The rooms inside the buildings, each a small lit 3D scene behind the
 * lesson cards:
 *
 *   classroom  desks in rows, tall windows, posters, a bookshelf, a globe,
 *              and a big green chalkboard showing the lesson's own board
 *   hall       a museum hall: columns, banners, display cases, a timeline
 *              wall, the costumed guide, and a turning pedestal for artifacts
 *   lab        benches with flasks, shelves of jars, a telescope by the
 *              window, a planet poster, and a big screen for the experiment
 *
 * Each returns { scene, camera, shots, update(dt), … } — `shots` are camera
 * positions the lesson moves between ("board", "guide", "artifact", …).
 */
import * as THREE from 'three';
import { add, box, cyl, cone, sphere, ico, mat, signTexture, batch, seeded } from './kit.js';
import { makeCreature, guideSpecies } from './figures.js';
import { SPECIES } from './creatures/species.js';
import { buildArtifact } from './artifacts.js';

function room({ w = 16, d = 12, h = 6, wall = '#f1e6cf', floor = '#c69c6d', trim = '#8a5e3c' }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2a2420');
  const g = new THREE.Group();
  const wallM = mat(wall, { rough: 0.95 });
  const floorM = mat(floor, { rough: 0.85 });
  const floorDark = mat(new THREE.Color(floor).multiplyScalar(0.86).getStyle(), { rough: 0.85 });
  // Floorboards.
  for (let i = 0; i < 16; i++) add(g, box(w / 16 - 0.02, 0.1, d), i % 2 ? floorM : floorDark, [-w / 2 + (i + 0.5) * (w / 16), -0.05, 0]);
  add(g, box(w, h, 0.2), wallM, [0, h / 2, -d / 2]);
  add(g, box(0.2, h, d), wallM, [-w / 2, h / 2, 0]);
  add(g, box(0.2, h, d), wallM, [w / 2, h / 2, 0]);
  add(g, box(w, 0.2, d), mat('#efe7d6', { rough: 1 }), [0, h, 0]);
  // Wainscot and skirting.
  const trimM = mat(trim, { rough: 0.8 });
  add(g, box(w, 1.1, 0.08), mat(new THREE.Color(wall).multiplyScalar(0.86).getStyle(), { rough: 0.9 }), [0, 0.55, -d / 2 + 0.12]);
  add(g, box(w, 0.1, 0.12), trimM, [0, 1.12, -d / 2 + 0.14]);
  for (const s of [-1, 1]) {
    add(g, box(0.08, 1.1, d), mat(new THREE.Color(wall).multiplyScalar(0.86).getStyle(), { rough: 0.9 }), [s * (w / 2 - 0.12), 0.55, 0]);
    add(g, box(0.12, 0.1, d), trimM, [s * (w / 2 - 0.14), 1.12, 0]);
  }
  scene.add(g);
  scene.add(new THREE.HemisphereLight('#fff6e6', '#6b5a48', 1.3));
  const key = new THREE.DirectionalLight('#fff1d6', 1.8);
  key.position.set(-6, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
  scene.add(key, key.target);
  return { scene, g, wallM, trimM };
}

/** Tall windows with sunlight on one side wall. */
function windows(g, w, d, side = -1, count = 3) {
  const glass = mat('#cfeaf2', { rough: 0.1, emissive: '#fff3d0', ei: 0.9, key: 'room-window' });
  const frame = mat('#f7f2e8', { rough: 0.8 });
  for (let i = 0; i < count; i++) {
    const z = -d / 2 + 2.2 + i * ((d - 3) / count);
    add(g, box(0.06, 2.4, 1.4), glass, [side * (w / 2 - 0.08), 3.0, z]);
    add(g, box(0.1, 2.6, 0.1), frame, [side * (w / 2 - 0.1), 3.0, z]);
    add(g, box(0.1, 0.1, 1.5), frame, [side * (w / 2 - 0.1), 3.0, z]);
    add(g, box(0.16, 0.14, 1.6), frame, [side * (w / 2 - 0.12), 1.75, z]);
  }
}

function poster(g, text, [x, y, z], ry, { w = 1.4, h = 1.0, bg = '#fff6dc', fg = '#2c6b62' } = {}) {
  const t = signTexture(text, { w: 280, h: 200, bg, fg, border: '#c9a26b', font: 'bold 60px "Nunito Variable", system-ui' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
}

function plant(g, [x, y, z]) {
  add(g, cyl(0.25, 0.2, 0.45, 8), mat('#c46a4a', { rough: 0.8 }), [x, y + 0.22, z]);
  for (let i = 0; i < 6; i++) add(g, cone(0.12, 0.8, 4), mat('#4f9a5c', { rough: 0.9 }), [x + Math.cos(i) * 0.12, y + 0.75, z + Math.sin(i) * 0.12], [Math.cos(i) * 0.4, 0, Math.sin(i) * 0.4]);
}

function shelf(g, [x, y, z], ry = 0, rows = 3) {
  const s = new THREE.Group();
  s.position.set(x, y, z);
  s.rotation.y = ry;
  const wood = mat('#8a5e3c', { rough: 0.85 });
  add(s, box(2.2, 0.08, 0.5), wood, [0, 0, 0]);
  for (let r = 0; r <= rows; r++) add(s, box(2.2, 0.08, 0.5), wood, [0, r * 0.7, 0]);
  for (const sx of [-1, 1]) add(s, box(0.08, rows * 0.7, 0.5), wood, [sx * 1.1, (rows * 0.7) / 2, 0]);
  const colors = ['#c0392b', '#2a78d6', '#f2b84b', '#1baf7a', '#9b7be0', '#e36a5c', '#3d5a80'];
  const r = seeded(Math.round(x * 10 + z));
  for (let row = 0; row < rows; row++) {
    let bx = -1.0;
    while (bx < 0.95) {
      const bw = 0.08 + r() * 0.08, bh = 0.4 + r() * 0.2;
      add(s, box(bw, bh, 0.35), mat(colors[Math.floor(r() * colors.length)], { rough: 0.8 }), [bx + bw / 2, row * 0.7 + 0.04 + bh / 2, 0], [0, 0, r() < 0.1 ? 0.2 : 0]);
      bx += bw + 0.02;
    }
  }
  g.add(s);
}

/* ---------------------------------------------------------------- the classroom */

/** `teacher`: the realm's math teacher's species (the owl on the mountain; a squirrel, a penguin…). */
export function buildClassroom(look, teacher = 'owl') {
  const W = 16, D = 12, H = 6;
  const { scene, g } = room({ w: W, d: D, h: H, wall: look.wall, floor: '#c79a69' });
  windows(g, W, D, -1, 3);
  // The chalkboard: its face is a canvas the lesson draws on.
  const frame = mat('#8a5e3c', { rough: 0.8 });
  add(g, box(7.6, 3.4, 0.16), frame, [0, 3.2, -D / 2 + 0.2]);
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 1600;
  boardCanvas.height = 800;
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  boardTex.colorSpace = THREE.SRGBColorSpace;
  boardTex.anisotropy = 8;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.6 * 0.86), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.95 }));
  board.position.set(0, 3.2, -D / 2 + 0.29);
  g.add(board);
  add(g, box(7.4, 0.12, 0.3), frame, [0, 1.48, -D / 2 + 0.36]);
  for (let i = 0; i < 4; i++) add(g, cyl(0.03, 0.03, 0.22, 6), mat(['#ffffff', '#ffe28a', '#ff9fb2', '#9fd3ff'][i], { rough: 1 }), [-2.6 + i * 0.35, 1.57, -D / 2 + 0.38], [0, 0, Math.PI / 2]);
  add(g, box(0.5, 0.12, 0.18), mat('#3b3530', { rough: 0.9 }), [2.6, 1.6, -D / 2 + 0.38]);
  // Teacher's desk with an apple, books and a globe.
  const desk = mat('#9a6b47', { rough: 0.8 });
  add(g, box(2.6, 0.12, 1.1), desk, [3.6, 1.0, -D / 2 + 2.2]);
  add(g, box(2.5, 0.95, 0.08), desk, [3.6, 0.5, -D / 2 + 2.7]);
  for (const sx of [-1, 1]) add(g, box(0.1, 0.95, 1.0), desk, [3.6 + sx * 1.2, 0.5, -D / 2 + 2.2]);
  add(g, sphere(0.14, 8, 6), mat('#d8392b', { rough: 0.5 }), [3.0, 1.2, -D / 2 + 2.1]);
  add(g, box(0.5, 0.12, 0.35), mat('#2a78d6'), [3.9, 1.12, -D / 2 + 2.0]);
  add(g, box(0.46, 0.1, 0.32), mat('#f2b84b'), [3.9, 1.23, -D / 2 + 2.0]);
  add(g, cyl(0.05, 0.12, 0.25, 6), mat('#8a6a3c'), [4.5, 1.18, -D / 2 + 2.2]);
  const globe = new THREE.Group();
  globe.position.set(4.5, 1.58, -D / 2 + 2.2);
  globe.userData.live = true;
  add(globe, sphere(0.26, 12, 9), mat('#3d8fd6', { rough: 0.6 }));
  for (let i = 0; i < 5; i++) add(globe, ico(0.1), mat('#5fb37d', { rough: 0.8 }), [Math.cos(i * 1.3) * 0.2, Math.sin(i * 2.1) * 0.15, Math.sin(i * 1.3) * 0.2]);
  g.add(globe);
  // Desks in rows, a chair at each.
  const top = mat('#c9a37a', { rough: 0.8 }), leg = mat('#5a6470', { rough: 0.6, metal: 0.3 });
  const seat = [mat('#2a78d6'), mat('#eb6834'), mat('#1baf7a'), mat('#f2b84b')];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    const x = -4.5 + c * 3, z = -0.6 + r * 2.4;
    add(g, box(1.6, 0.08, 0.9), top, [x, 0.95, z]);
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.35, 0.35]) add(g, box(0.06, 0.95, 0.06), leg, [x + sx, 0.47, z + sz]);
    add(g, box(0.7, 0.07, 0.6), seat[(r + c) % 4], [x, 0.6, z + 0.85]);
    add(g, box(0.7, 0.6, 0.06), seat[(r + c) % 4], [x, 0.95, z + 1.15]);
    for (const sx of [-0.3, 0.3]) for (const sz of [0.6, 1.1]) add(g, box(0.05, 0.6, 0.05), leg, [x + sx, 0.3, z + sz]);
    if ((r + c) % 3 === 0) add(g, box(0.4, 0.05, 0.3), mat('#fdfbf2'), [x - 0.3, 1.01, z], [0, 0.2, 0]);
  }
  shelf(g, [W / 2 - 0.5, 0.05, 1.5], -Math.PI / 2);
  poster(g, '1 2 3', [W / 2 - 0.12, 3.2, -2.4], -Math.PI / 2);
  poster(g, '+ − × ÷', [W / 2 - 0.12, 4.5, 1.2], -Math.PI / 2, { bg: '#e9f5ff', fg: '#2a78d6' });
  poster(g, '△ ○ □', [-W / 2 + 0.12, 4.8, 3.2], Math.PI / 2, { bg: '#fff0f3', fg: '#c0392b' });
  plant(g, [-W / 2 + 0.8, 0, -D / 2 + 0.8]);
  plant(g, [W / 2 - 0.8, 0, -D / 2 + 0.8]);
  // A clock above the board.
  add(g, cyl(0.42, 0.42, 0.08, 18), mat('#fbf7ee'), [5.4, 4.9, -D / 2 + 0.2], [Math.PI / 2, 0, 0]);
  add(g, box(0.04, 0.3, 0.02), mat('#222'), [5.4, 4.98, -D / 2 + 0.26]);
  add(g, box(0.22, 0.04, 0.02), mat('#222'), [5.48, 4.9, -D / 2 + 0.26]);
  // The teacher.
  const teacherFig = makeCreature({ species: teacher, scale: 1.5 });
  teacherFig.group.position.set(-4.6, 0, -D / 2 + 1.8);
  teacherFig.group.rotation.y = 0.5;
  scene.add(teacherFig.group);
  batch(g);
  return {
    scene,
    boardCanvas,
    boardTex,
    teacher: teacherFig,
    shots: {
      wide: { pos: [3.5, 4.6, 7.5], look: [-0.2, 2.6, -D / 2] },
      board: { pos: [0, 3.25, 1.6], look: [0, 3.15, -D / 2] },
      teacher: { pos: [-1.2, 2.5, 0.5], look: [-4.6, 1.8, -D / 2 + 1.8] }
    },
    update(dt, t) {
      globe.rotation.y += dt * 0.4;
      teacherFig.update(dt, {});
      if (Math.sin(t * 0.3) > 0.97) teacherFig.talk(0.4);
    }
  };
}

/* ---------------------------------------------------------------- the history hall */

export function buildHall(look, teacher = 'tortoise') {
  const W = 18, D = 14, H = 7;
  const { scene, g } = room({ w: W, d: D, h: H, wall: '#efe4cf', floor: '#d9cfbd' });
  // Marble-ish checker floor over the boards.
  for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) add(g, box(2, 0.02, 2), mat((i + j) % 2 ? '#e9e1d2' : '#cfc3ad', { rough: 0.4 }), [-8 + i * 2, 0.01, -6 + j * 2]);
  const col = mat('#f7f2e8', { rough: 0.7 }), base = mat('#d8ccb4', { rough: 0.8 });
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = sx * 6.5, z = -5 + i * 4;
    add(g, cyl(0.38, 0.42, H - 0.6, 14), col, [x, (H - 0.6) / 2 + 0.3, z]);
    add(g, box(1.1, 0.3, 1.1), base, [x, 0.15, z]);
    add(g, box(1.1, 0.3, 1.1), base, [x, H - 0.3, z]);
  }
  // Banners in the floor's colour.
  const banner = mat(look.banner, { rough: 0.9 });
  for (const x of [-3.5, 3.5]) {
    add(g, box(1.4, 3, 0.05), banner, [x, 4.6, -D / 2 + 0.2]);
    add(g, cone(0.7, 0.6, 3), banner, [x, 2.9, -D / 2 + 0.2], [0, 0, Math.PI], [1, 1, 0.08]);
  }
  // The timeline wall: a long band with year marks.
  add(g, box(10, 0.12, 0.06), mat('#8a5e3c'), [0, 2.4, -D / 2 + 0.16]);
  for (let i = 0; i <= 10; i++) add(g, box(0.06, 0.3, 0.06), mat('#8a5e3c'), [-5 + i, 2.4, -D / 2 + 0.18]);
  // Display cases with little treasures.
  const glass = mat('#d8f0f4', { rough: 0.05, opacity: 0.35, key: 'case-glass' });
  const wood = mat('#7a5638', { rough: 0.8 });
  const r = seeded(9);
  for (const [x, z] of [[-6.5, 3.5], [6.5, 3.5], [-6.5, -1], [6.5, -1]]) {
    add(g, box(1.6, 1.0, 1.0), wood, [x * 0.82, 0.5, z]);
    add(g, box(1.5, 0.8, 0.9), glass, [x * 0.82, 1.4, z]);
    add(g, [ico(0.2), cone(0.2, 0.4, 5), box(0.3, 0.2, 0.2)][Math.floor(r() * 3)], mat(['#c8794a', '#d7b45a', '#7f9fb0'][Math.floor(r() * 3)], { rough: 0.5, metal: 0.3 }), [x * 0.82, 1.2, z]);
  }
  // The pedestal where artifacts turn.
  add(g, cyl(0.7, 0.8, 1.1, 16), mat('#e9e1d2', { rough: 0.5 }), [3, 0.55, -2]);
  add(g, cyl(0.85, 0.85, 0.1, 16), mat('#c9a24b', { rough: 0.3, metal: 0.6 }), [3, 1.15, -2]);
  const turntable = new THREE.Group();
  turntable.position.set(3, 1.2, -2);
  scene.add(turntable);
  // Spotlight on the pedestal.
  const spot = new THREE.SpotLight('#fff1d6', 30, 12, 0.5, 0.5, 1.5);
  spot.position.set(3, 6.5, 0);
  spot.target.position.set(3, 1.2, -2);
  scene.add(spot, spot.target);
  shelf(g, [-W / 2 + 0.5, 0.05, -3], Math.PI / 2, 4);
  plant(g, [W / 2 - 1, 0, -D / 2 + 1]);
  batch(g);
  const tock = makeCreature({ species: teacher, scale: 1.4 });
  tock.group.position.set(-5.2, 0, -4.4);
  tock.group.rotation.y = 0.6;
  scene.add(tock.group);
  let guide = null;
  let artifact = null;
  const state = { spin: 0.4, drag: 0 };
  return {
    scene,
    shots: {
      wide: { pos: [0, 4.2, 9], look: [0, 2.3, -4] },
      guide: { pos: [1.2, 2.3, 3.6], look: [-1.0, 1.4, -1.6] },
      artifact: { pos: [3, 2.2, 1.6], look: [3, 1.65, -2] },
      timeline: { pos: [0, 3, 3.5], look: [0, 2.5, -D / 2] }
    },
    /** Dress the guide for this lesson (schema.js LOOKS). */
    setGuide(lookId, seed = 1) {
      if (guide) scene.remove(guide.group);
      guide = makeCreature({ species: guideSpecies(lookId), costume: lookId, scale: 1.45, seed });
      guide.group.position.set(-2.3, 0, -1.6);
      guide.group.rotation.y = 0.25;
      scene.add(guide.group);
      return guide;
    },
    get guide() {
      return guide;
    },
    setArtifact(model) {
      turntable.clear();
      artifact = buildArtifact(model);
      turntable.add(artifact);
    },
    spinBy(dx) {
      turntable.rotation.y += dx;
      state.drag = 1.5;
    },
    tock,
    update(dt) {
      guide?.update(dt, {});
      tock.update(dt, {});
      state.drag = Math.max(0, state.drag - dt);
      if (!state.drag) turntable.rotation.y += dt * state.spin;
    }
  };
}

/* ---------------------------------------------------------------- the physics lab */

export function buildLab(look, teacher = 'raccoon') {
  const W = 16, D = 12, H = 6;
  const { scene, g } = room({ w: W, d: D, h: H, wall: '#e6eef0', floor: '#9aa7b0' });
  // Tiles over the floor.
  for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) add(g, box(2, 0.02, 2), mat((i + j) % 2 ? '#dfe6ea' : '#c9d3d9', { rough: 0.5 }), [-7 + i * 2, 0.01, -5 + j * 2]);
  windows(g, W, D, 1, 3);
  // The big screen on the back wall (the experiment shows over it).
  add(g, box(8, 4, 0.2), mat('#2b3440', { rough: 0.5 }), [0, 3.3, -D / 2 + 0.2]);
  add(g, box(7.6, 3.6, 0.05), mat('#cfe7ee', { rough: 0.3, emissive: '#bfe3ef', ei: 0.5, key: 'screen' }), [0, 3.3, -D / 2 + 0.32]);
  // Benches with flasks and beakers.
  const bench = mat('#3d4a57', { rough: 0.5 }), benchTop = mat('#f2f2ee', { rough: 0.4 });
  const glass = mat('#bfe6ef', { rough: 0.05, opacity: 0.5, key: 'lab-glass' });
  const liquids = ['#ff6b8a', '#6bd3ff', '#a5ff8a', '#ffd36b'].map((c) => mat(c, { rough: 0.3, emissive: c, ei: 0.25 }));
  for (const [x, z] of [[-4.5, 1.5], [4.5, 1.5], [-4.5, 4.4], [4.5, 4.4]]) {
    add(g, box(3.4, 0.95, 1.3), bench, [x, 0.48, z]);
    add(g, box(3.6, 0.1, 1.45), benchTop, [x, 1.0, z]);
    for (let i = 0; i < 3; i++) {
      const fx = x - 1.1 + i * 1.1;
      add(g, cyl(0.12, 0.28, 0.45, 10), glass, [fx, 1.28, z]);
      add(g, cyl(0.06, 0.12, 0.25, 8), glass, [fx, 1.62, z]);
      add(g, cyl(0.22, 0.25, 0.18, 10), liquids[(i + Math.round(x)) & 3], [fx, 1.14, z]);
    }
  }
  // Shelves of jars and a skeleton of a planet poster.
  const jarShelf = new THREE.Group();
  jarShelf.position.set(-W / 2 + 0.5, 0, -1);
  jarShelf.rotation.y = Math.PI / 2;
  const wood = mat('#8a5e3c', { rough: 0.85 });
  for (let r = 0; r < 4; r++) add(jarShelf, box(3, 0.08, 0.5), wood, [0, 0.4 + r * 0.8, 0]);
  for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) add(jarShelf, cyl(0.13, 0.13, 0.36, 8), liquids[(r + i) & 3], [-1.25 + i * 0.5, 0.62 + r * 0.8, 0]);
  g.add(jarShelf);
  poster(g, '☀ ● ● ●', [W / 2 - 0.12, 4.6, -3.5], -Math.PI / 2, { bg: '#1d2a4a', fg: '#ffd36b' });
  poster(g, 'F = m a', [-W / 2 + 0.12, 4.6, 3], Math.PI / 2, { bg: '#fff6dc', fg: '#1baf7a' });
  // A telescope on a tripod by the window.
  const scope = new THREE.Group();
  scope.position.set(W / 2 - 1.6, 0, -D / 2 + 1.6);
  for (let i = 0; i < 3; i++) add(scope, cyl(0.03, 0.03, 1.6, 5), mat('#4c5560'), [Math.cos(i * 2.1) * 0.3, 0.75, Math.sin(i * 2.1) * 0.3], [Math.sin(i * 2.1) * 0.25, 0, -Math.cos(i * 2.1) * 0.25]);
  add(scope, cyl(0.12, 0.16, 1.5, 10), mat('#d7b45a', { rough: 0.3, metal: 0.6 }), [0, 1.75, 0], [0.9, 0.6, 0]);
  g.add(scope);
  // A hanging model of the planets.
  const mobile = new THREE.Group();
  mobile.position.set(0, 5.4, 1.5);
  mobile.userData.live = true;
  add(mobile, sphere(0.35, 12, 8), mat('#ffcf4d', { emissive: '#ffb020', ei: 0.6 }));
  [['#6fb3ff', 1.2, 0.14], ['#ff8a5b', 1.9, 0.18], ['#b6e388', 2.6, 0.12]].forEach(([c, rr, s], i) => {
    const arm = new THREE.Group();
    arm.rotation.y = i * 2;
    add(arm, sphere(s, 10, 6), mat(c), [rr, -0.2 * i, 0]);
    mobile.add(arm);
  });
  g.add(mobile);
  // The lab teacher in a white coat, in lab goggles unless they wear their own gear (Dr. Comet's astronaut visor).
  const teacherFig = makeCreature({ species: teacher, hat: SPECIES[teacher]?.().hat?.wear ? 'none' : 'goggles', scale: 1.5 });
  teacherFig.group.position.set(5.2, 0, -D / 2 + 2);
  teacherFig.group.rotation.y = -0.5;
  scene.add(teacherFig.group);
  batch(g);
  return {
    scene,
    teacher: teacherFig,
    shots: {
      wide: { pos: [0, 4.3, 8.2], look: [0, 2.5, -D / 2] },
      screen: { pos: [0, 3.3, 2.2], look: [0, 3.2, -D / 2] }
    },
    update(dt, t) {
      mobile.rotation.y += dt * 0.25;
      teacherFig.update(dt, {});
      if (Math.sin(t * 0.4) > 0.97) teacherFig.wave(0.8);
    }
  };
}
