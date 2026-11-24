/**
 * Everything on a floor that isn't a school: the shop, the arcade hall, the
 * sticker museum, the quest board, the floor's landmark, the portal up, the
 * toys to poke (bells, bouncy mushrooms, balloons, fish ponds…), hidden
 * gems to find, and the cheap silhouette a far-away floor shows instead.
 *
 * Every builder returns a group with userData { top, update(dt, t), poke() }:
 * poke() is what happens when the child taps it — it always reacts.
 */
import * as THREE from 'three';
import { t as tr } from '../i18n/index.js';
import { add, batch, box, cone, cyl, ico, mat, seeded, signTexture, sphere, toon } from './kit.js';
import { door, window as win, lantern, palette, windowMat } from './buildings.js';
import { SEA_LANDMARKS } from './resort.js';

const small = (look) => palette(look, 'math');
/** A low round stone base for the smaller places. */
function pad(g, look, r) {
  add(g, cyl(r, r + 0.15, 0.35, 18), mat(look.stone), [0, 0.17, 0]);
  add(g, cyl(r - 0.2, r - 0.2, 0.06, 18), mat(look.path), [0, 0.36, 0]);
}
function sign(g, text, [x, y, z], { w = 2.2, h = 0.6, bg = '#2c6b62', fg = '#ffffff' } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTexture(text, { w: Math.round(w * 120), h: Math.round(h * 120), bg, fg, border: '#ffd23f', font: `900 ${Math.round(h * 60)}px "Nunito Variable", system-ui` }) }));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** A springy squash when poked. */
function bouncer(group) {
  let t = 9;
  return {
    poke: () => (t = 0),
    update: (dt) => {
      t += dt;
      const k = t < 0.7 ? Math.sin(t * 18) * Math.exp(-t * 5) : 0;
      group.scale.set(1 - k * 0.12, 1 + k * 0.18, 1 - k * 0.12);
    }
  };
}

/* ---------------------------------------------------------------- places */

/** The shop: a striped market stall with hats on show. Spend coins here. */
export function shop(look) {
  const g = new THREE.Group();
  const P = small(look);
  pad(g, look, 2.8);
  const wood = mat('#c9824a');
  add(g, box(3.6, 1.0, 1.6), wood, [0, 0.85, 0.3]);
  for (const sx of [-1.7, 1.7]) add(g, box(0.18, 2.8, 0.18), wood, [sx, 1.75, 0.9]);
  for (const sx of [-1.7, 1.7]) add(g, box(0.18, 2.8, 0.18), wood, [sx, 1.75, -0.6]);
  const stripes = [look.banner, '#ffffff'];
  for (let i = 0; i < 8; i++) add(g, box(0.48, 0.12, 2.2), mat(stripes[i % 2]), [-1.7 + 0.24 + i * 0.48, 3.2, 0.15], [-0.25, 0, 0]);
  sign(g, `🎩 ${tr('sign.shop')}`, [0, 2.6, 0.95], { w: 2.0, h: 0.5, bg: '#ff6fb5' });
  const items = [['#ff6fb5', 'cone'], ['#7cc6ff', 'dome'], ['#ffd23f', 'crown'], ['#7ee08a', 'cone']];
  items.forEach(([c, k], i) => {
    const x = -1.2 + i * 0.8;
    if (k === 'cone') add(g, cone(0.22, 0.5, 10), mat(c), [x, 1.6, 0.5]);
    else if (k === 'dome') add(g, new THREE.SphereGeometry(0.26, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(c), [x, 1.36, 0.5]);
    else add(g, cyl(0.24, 0.22, 0.24, 8, 1), mat(c, { metal: 0.6 }), [x, 1.48, 0.5]);
  });
  add(g, box(1.2, 0.7, 0.7), mat('#ffd23f', { metal: 0.5 }), [2.4, 0.7, 1.2]);
  add(g, sphere(0.2, 8, 6), mat('#ffd23f', { metal: 0.6 }), [2.4, 1.2, 1.2]);
  batch(g);
  const b = bouncer(g);
  Object.assign(g.userData, { top: 4.2, ...b });
  return g;
}

/** The arcade hall: a box with a flashing sign and a giant joystick. */
export function arcade(look) {
  const g = new THREE.Group();
  const P = small(look);
  pad(g, look, 2.8);
  add(g, box(4.2, 3.0, 3.0), mat('#5a3fa8'), [0, 1.85, -0.3]);
  add(g, box(4.5, 0.3, 3.3), mat('#ff6fb5'), [0, 3.5, -0.3]);
  door(g, P, [0, 0.36, 1.22], 1.0, 1.8, { arch: false, color: mat('#1d1a2a') });
  for (const sx of [-1.4, 1.4]) add(g, box(0.9, 1.1, 0.06), mat('#7ff7ff', { emissive: '#3fe0ff', ei: 0.7 }), [sx, 1.8, 1.23]);
  add(g, cyl(0.12, 0.12, 0.9, 8), mat('#2b2b3a'), [1.9, 0.8, 1.6], [0, 0, -0.3]);
  const knob = add(g, sphere(0.35, 12, 10), mat('#ff5f5f'), [2.05, 1.3, 1.6]);
  const neon = new THREE.Group();
  neon.userData.live = true;
  g.add(neon);
  const lights = [];
  for (let i = 0; i < 9; i++) lights.push(add(neon, sphere(0.1, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffe066', emissive: '#ffe066', emissiveIntensity: 1 }), [-2 + i * 0.5, 3.75, 1.3]));
  const s = sign(g, `🕹️ ${tr('sign.arcade')}`, [0, 3.0, 1.24], { w: 2.6, h: 0.55, bg: '#1d1a2a', fg: '#7ff7ff' });
  s.userData.live = true;
  batch(g);
  const b = bouncer(g);
  let t = 0;
  Object.assign(g.userData, {
    top: 4.6,
    poke: b.poke,
    update(dt) {
      t += dt;
      b.update(dt);
      lights.forEach((l, i) => l.material.emissiveIntensity = (Math.floor(t * 6) + i) % 3 === 0 ? 1.6 : 0.2);
    }
  });
  return g;
}

/** The sticker museum: a round pavilion with a big star on top. */
export function museum(look) {
  const g = new THREE.Group();
  const P = small(look);
  pad(g, look, 2.8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    add(g, cyl(0.16, 0.18, 2.4, 8), P.white, [Math.cos(a) * 2.1, 1.55, Math.sin(a) * 2.1]);
  }
  add(g, cyl(2.4, 2.4, 0.3, 20), P.trim, [0, 2.9, 0]);
  add(g, new THREE.SphereGeometry(2.3, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(look.banner), [0, 3.0, 0]);
  add(g, cyl(1.2, 1.2, 1.4, 14), P.wall, [0, 1.05, 0]);
  const star = new THREE.Group();
  star.position.set(0, 5.7, 0);
  star.userData.live = true;
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.35 : 0.8, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  add(star, new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb020', emissiveIntensity: 0.5 }), [0, 0, -0.12]);
  g.add(star);
  sign(g, `🌈 ${tr('sign.stickers')}`, [0, 1.9, 2.2], { w: 2.4, h: 0.5, bg: '#9b7be0' });
  batch(g);
  const b = bouncer(g);
  let spin = 0;
  Object.assign(g.userData, {
    top: 6.8,
    poke: () => {
      b.poke();
      spin = 12;
    },
    update(dt) {
      b.update(dt);
      spin = Math.max(0.8, spin - dt * 6);
      star.rotation.y += dt * spin;
    }
  });
  return g;
}

/** The quest board: a wooden notice board with pinned notes. */
export function board(look) {
  const g = new THREE.Group();
  const wood = mat('#a8714a');
  for (const sx of [-1.1, 1.1]) add(g, box(0.18, 2.6, 0.18), wood, [sx, 1.3, 0]);
  add(g, box(2.5, 1.6, 0.14), mat('#d9a86c'), [0, 1.8, 0]);
  add(g, cone(1.6, 0.6, 4), mat(look.roof.history), [0, 2.95, 0], [0, Math.PI / 4, 0], [1, 1, 0.35]);
  const notes = ['#fff6a8', '#ffd1e8', '#c9f0ff', '#d9ffd1'];
  notes.forEach((c, i) => add(g, box(0.5, 0.55, 0.02), mat(c), [-0.75 + i * 0.5, 1.8 + (i % 2) * 0.25, 0.09], [0, 0, (i - 1.5) * 0.12]));
  sign(g, `📋 ${tr('sign.quests')}`, [0, 1.1, 0.09], { w: 1.6, h: 0.36, bg: '#2c6b62' });
  batch(g);
  const b = bouncer(g);
  Object.assign(g.userData, { top: 3.5, ...b });
  return g;
}

/** The portal up: a ring of light at the foot of the stairs. Glows when the floor above is open. */
export function portal() {
  const g = new THREE.Group();
  add(g, cyl(1.3, 1.4, 0.2, 20), mat('#e6e1f5'), [0, 0.1, 0]);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.12, 8, 28), new THREE.MeshStandardMaterial({ color: '#9b7be0', emissive: '#c39bff', emissiveIntensity: 1.2 }));
  ring.position.y = 1.5;
  g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.05, 28), new THREE.MeshBasicMaterial({ color: '#d8c8ff', transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
  disc.position.y = 1.5;
  g.add(disc);
  let on = false, t = 0;
  Object.assign(g.userData, {
    top: 3,
    setOn: (v) => {
      on = v;
      ring.material.emissiveIntensity = v ? 1.4 : 0.1;
      ring.material.color.set(v ? '#9b7be0' : '#9a9aa8');
      disc.visible = v;
    },
    poke: () => (t = 0),
    update(dt) {
      t += dt;
      ring.rotation.y += dt * (on ? 1.5 : 0.2);
      disc.rotation.z -= dt;
      disc.material.opacity = on ? 0.35 + Math.sin(t * 4) * 0.15 : 0;
    }
  });
  return g;
}

/**
 * The World Portal: an arch of wood and gold round a swirling disc, with
 * three little worlds circling it. Walk up to it to choose another study world.
 */
export function worldGate() {
  const g = new THREE.Group();
  add(g, cyl(1.7, 1.85, 0.3, 22), mat('#d9cbb2'), [0, 0.15, 0]);
  add(g, cyl(1.45, 1.45, 0.06, 22), mat('#fff1d6'), [0, 0.33, 0]);
  const wood = mat('#8a5e3c'), gold = mat('#e2b84a', { metal: 0.6 });
  for (const s of [-1, 1]) {
    add(g, box(0.32, 2.6, 0.4), wood, [s * 1.35, 1.6, 0]);
    add(g, sphere(0.22, 8, 6), gold, [s * 1.35, 3.0, 0]);
  }
  add(g, new THREE.TorusGeometry(1.35, 0.16, 8, 26, Math.PI), gold, [0, 2.9, 0]);
  batch(g);
  const swirl = new THREE.Group();
  swirl.position.set(0, 2.0, 0);
  swirl.userData.live = true;
  const discs = ['#7cc6ff', '#c39bff', '#7ee08a'].map((c, i) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1.15 - i * 0.28, 5 + i, i), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    m.position.z = i * 0.02;
    swirl.add(m);
    return m;
  });
  g.add(swirl);
  const orbit = new THREE.Group();
  orbit.position.set(0, 2.0, 0);
  orbit.userData.live = true;
  const worlds = [['#7cc274', 0], ['#5fae6a', 2.1], ['#9fd3ff', 4.2]].map(([c, a]) => {
    const m = new THREE.Mesh(sphere(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, roughness: 0.5 }));
    m.userData.a = a;
    orbit.add(m);
    return m;
  });
  g.add(orbit);
  let t = 9, clock = 0;
  Object.assign(g.userData, {
    top: 3.6,
    poke: () => (t = 0),
    update(dt) {
      t += dt;
      clock += dt;
      const fast = t < 1.2 ? 6 : 1;
      discs.forEach((d, i) => (d.rotation.z += dt * fast * (i % 2 ? -1.4 : 1.1)));
      for (const w of worlds) {
        w.userData.a += dt * 0.9 * fast;
        w.position.set(Math.cos(w.userData.a) * 1.7, Math.sin(w.userData.a * 2) * 0.25 + Math.sin(w.userData.a) * 1.1, Math.sin(w.userData.a) * 0.35);
      }
      swirl.scale.setScalar(1 + Math.sin(clock * 3) * 0.03);
    }
  });
  return g;
}

/* ---------------------------------------------------------------- landmarks */

export function landmark(kind, look) {
  return (LANDMARKS[kind] ?? SEA_LANDMARKS[kind] ?? LANDMARKS.windmill)(look);
}

const LANDMARKS = {
  /** Meadow: a windmill. Tap it and the sails whirl. */
  windmill(look) {
    const g = new THREE.Group();
    pad(g, look, 4);
    // A round stone foundation: a ring of cut stones under a smooth plaster tower.
    add(g, cyl(2.45, 2.6, 0.5, 32), mat('#d9cdb8'), [0, 0.5, 0]);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.1;
      const stone = add(g, box(0.95, 0.4, 0.3), mat(i % 3 ? '#cbbd9f' : '#bfae8e'), [Math.sin(a) * 2.56, 0.5, Math.cos(a) * 2.56]);
      stone.rotation.y = a;
    }
    add(g, cyl(2.6, 2.6, 0.12, 32), mat('#efe4cf'), [0, 0.78, 0]);
    add(g, cyl(1.45, 2.05, 5.2, 28), mat('#fff1d6'), [0, 3.4, 0]);
    // A wooden gallery round the middle, with posts and flower boxes.
    add(g, cyl(2.05, 2.05, 0.16, 28), mat('#b9835a'), [0, 3.05, 0]);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      add(g, box(0.08, 0.55, 0.08), mat('#a8714a'), [Math.sin(a) * 1.98, 3.4, Math.cos(a) * 1.98]);
    }
    add(g, new THREE.TorusGeometry(1.98, 0.05, 6, 40), mat('#a8714a'), [0, 3.66, 0], [Math.PI / 2, 0, 0]);
    for (const a of [-0.7, 0.7]) {
      add(g, box(0.7, 0.22, 0.3), mat('#a8714a'), [Math.sin(a) * 1.75, 2.55, Math.cos(a) * 1.75], [0, a, 0]);
      for (let k = -1; k <= 1; k++) add(g, sphere(0.13, 8, 6), mat(['#ff8fa3', '#ffd23f', '#ffffff'][k + 1]), [Math.sin(a) * 1.75 + Math.cos(a) * k * 0.22, 2.74, Math.cos(a) * 1.75 - Math.sin(a) * k * 0.22]);
    }
    add(g, cone(1.85, 2.0, 28), mat('#ff7a5c'), [0, 7.2, 0]);
    add(g, cyl(1.62, 1.62, 0.14, 28), mat('#fff6e6'), [0, 6.22, 0]);
    add(g, box(1.3, 0.3, 0.6), mat('#d9cdb8'), [0, 0.3, 2.85]);
    door(g, palette(look, 'math'), [0, 0.84, 2.0], 0.9, 1.6);
    win(g, palette(look, 'math'), [0, 4.2, 1.6], 0, 0.6, 0.7, { arch: true });
    const sails = new THREE.Group();
    sails.position.set(0, 5.6, 1.9);
    sails.userData.live = true;
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI) / 2;
      add(arm, box(0.18, 3.6, 0.1), mat('#a8714a'), [0, 1.8, 0]);
      add(arm, box(0.9, 2.6, 0.05), mat(i % 2 ? '#ffffff' : '#ffe3e3'), [0.5, 2.1, 0.03]);
      sails.add(arm);
    }
    add(sails, sphere(0.35, 10, 8), mat('#a8714a'));
    g.add(sails);
    batch(g);
    let speed = 0.6;
    return Object.assign(g, { userData: { ...g.userData, top: 9.5, poke: () => (speed = 9), update: (dt) => { speed = Math.max(0.6, speed - dt * 2.5); sails.rotation.z -= dt * speed; } } });
  },
  /** Desert: an oasis — a pool under palms, with a camel-shaped topiary and fish. */
  oasis(look) {
    const g = new THREE.Group();
    add(g, cyl(4.2, 4.4, 0.3, 24), mat('#f6d08a'), [0, 0.15, 0]);
    const water = add(g, cyl(3.4, 3.4, 0.1, 24), new THREE.MeshStandardMaterial({ color: '#3fc6e0', roughness: 0.2, transparent: true, opacity: 0.85 }), [0, 0.32, 0]);
    water.userData.live = true;
    for (const [x, z, h] of [[-3.6, -1.6, 4.2], [3.4, -2.2, 3.6], [2.6, 2.8, 3.2]]) palm(g, x, z, h);
    const fish = fishSchool(g, 3, 2.6, 0.38);
    batch(g);
    return withFish(g, fish, 5.5);
  },
  /** Mushroom Grove: three giant bouncy toadstools to jump on. */
  shrooms(look) {
    const g = new THREE.Group();
    pad(g, look, 4);
    const caps = [];
    [[0, 0, 4.2, 2.6, '#ff5f7e'], [-2.4, 1.6, 2.6, 1.6, '#9b7be0'], [2.5, 1.3, 3.0, 1.9, '#ffb347']].forEach(([x, z, h, r, c]) => {
      const m = new THREE.Group();
      m.position.set(x, 0.35, z);
      m.userData.live = true;
      add(m, cyl(r * 0.3, r * 0.4, h, 12), toon('#fff6ea'), [0, h / 2, 0]);
      const cap = new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      cap.scale(1, 0.7, 1);
      add(m, cap, toon(c), [0, h, 0]);
      for (let i = 0; i < 6; i++) add(m, sphere(r * 0.16, 8, 6), toon('#ffffff'), [Math.cos(i * 1.1) * r * 0.6, h + r * 0.5, Math.sin(i * 1.1) * r * 0.6], [0, 0, 0], [1, 0.5, 1]);
      g.add(m);
      caps.push(m);
    });
    batch(g);
    let t = 9;
    return Object.assign(g, { userData: { top: 6.5, poke: () => (t = 0), update: (dt) => { t += dt; caps.forEach((m, i) => { const k = t < 1 ? Math.sin((t - i * 0.08) * 16) * Math.exp(-t * 4) : 0; m.scale.set(1 + k * 0.15, 1 - k * 0.22, 1 + k * 0.15); }); } } });
  },
  /** Snowy Peaks: a big snowman by a frozen pond; tap him and he waves his hat. */
  snowman(look) {
    const g = new THREE.Group();
    add(g, cyl(4.2, 4.3, 0.2, 24), toon('#dff2ff'), [0, 0.1, 0]);
    add(g, cyl(2.6, 2.6, 0.06, 24), new THREE.MeshStandardMaterial({ color: '#bfe9ff', roughness: 0.05, metalness: 0.2 }), [1.2, 0.24, 1.2]);
    const man = new THREE.Group();
    man.position.set(-1.4, 0.2, -0.6);
    man.userData.live = true;
    add(man, sphere(1.4, 16, 12), toon('#ffffff'), [0, 1.3, 0]);
    add(man, sphere(1.0, 16, 12), toon('#ffffff'), [0, 3.0, 0]);
    add(man, sphere(0.7, 16, 12), toon('#ffffff'), [0, 4.3, 0]);
    add(man, cone(0.12, 0.6, 8), toon('#ff9f43'), [0, 4.3, 0.85], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) add(man, sphere(0.09, 6, 4), toon('#1d1a2a'), [s * 0.25, 4.5, 0.62]);
    for (let i = 0; i < 3; i++) add(man, sphere(0.1, 6, 4), toon('#1d1a2a'), [0, 2.6 + i * 0.35, 0.95 - i * 0.05]);
    add(man, new THREE.TorusGeometry(0.75, 0.16, 8, 16), toon('#ff5f5f'), [0, 3.75, 0], [Math.PI / 2, 0, 0]);
    const hat = new THREE.Group();
    hat.position.set(0, 4.9, 0);
    add(hat, cyl(0.7, 0.7, 0.08, 14), toon('#2b2b3a'), [0, 0, 0]);
    add(hat, cyl(0.42, 0.42, 0.7, 14), toon('#2b2b3a'), [0, 0.38, 0]);
    man.add(hat);
    for (const s of [-1, 1]) add(man, cyl(0.04, 0.05, 1.5, 5), toon('#8a5e3c'), [s * 1.3, 3.2, 0], [0, 0, s * -1.0]);
    g.add(man);
    batch(g);
    let t = 9;
    return Object.assign(g, { userData: { top: 7, poke: () => (t = 0), update: (dt) => { t += dt; const k = t < 1.4 ? Math.sin(t * 10) : 0; hat.position.y = 4.9 + Math.max(0, k) * 0.6; hat.rotation.z = k * 0.4; man.rotation.z = k * 0.05; } } });
  },
  /** Cloud Sky City: a rainbow arch with balloons tied to it. Tap to release a balloon. */
  rainbow(look) {
    const g = new THREE.Group();
    pad(g, look, 4.2);
    ['#ff6f6f', '#ffb347', '#ffe066', '#7ee08a', '#7cc6ff', '#9b7be0'].forEach((c, i) => add(g, new THREE.TorusGeometry(3.6 - i * 0.32, 0.17, 8, 30, Math.PI), toon(c), [0, 0.35, 0]));
    for (const sx of [-3.4, 3.4]) add(g, sphere(1.0, 14, 10), toon('#ffffff'), [sx, 0.7, 0]);
    const balloons = balloonBunch(g, 0, 0.4, 1.6, 7);
    batch(g);
    return withBalloons(g, balloons, 7);
  },
  /** Harbor: a sailboat on a little harbor pool by a wooden dock; tap and it rocks. */
  boat(look) {
    const g = new THREE.Group();
    add(g, cyl(4.4, 4.6, 0.3, 24), toon('#e6e1d6'), [0, 0.15, 0]);
    add(g, cyl(3.8, 3.8, 0.1, 24), new THREE.MeshStandardMaterial({ color: '#3fa6e0', roughness: 0.2, transparent: true, opacity: 0.9 }), [0, 0.32, 0]);
    add(g, box(1.4, 0.2, 4), toon('#b98a5e'), [-3.2, 0.45, 0.5]);
    const ship = new THREE.Group();
    ship.position.set(0.6, 0.4, 0);
    ship.userData.live = true;
    const hull = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    hull.scale(1.0, 0.6, 2.4);
    add(ship, hull, toon('#ff7a5c'), [0, 0.45, 0]);
    add(ship, box(1.8, 0.1, 4.4), toon('#ffe9c2'), [0, 0.45, 0]);
    add(ship, cyl(0.07, 0.07, 4.2, 6), toon('#8a5e3c'), [0, 2.5, 0]);
    const sail = new THREE.BufferGeometry();
    sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.9, 0.1, 0, 4.4, 0.1, 0, 0.9, 1.9, 0, 0.9, -0.1, 0, 4.0, -0.1, 0, 0.9, -1.7], 3));
    sail.computeVertexNormals();
    add(ship, sail, toon('#ffffff', { side: THREE.DoubleSide }));
    add(ship, new THREE.ConeGeometry(0.4, 0.6, 3), toon('#3f7fd6'), [0, 4.6, 0], [0, 0, -Math.PI / 2], [1, 1, 0.2]);
    g.add(ship);
    const fish = fishSchool(g, 3, 3, 0.38, ship);
    batch(g);
    let t = 9, time = 0;
    const out = withFish(g, fish, 6);
    const base = out.userData.update;
    out.userData.poke = ((p) => () => {
      p();
      t = 0;
    })(out.userData.poke);
    out.userData.update = (dt) => {
      base(dt);
      t += dt;
      time += dt;
      ship.rotation.z = Math.sin(time * 1.2) * 0.05 + (t < 2 ? Math.sin(t * 6) * 0.25 * Math.exp(-t) : 0);
    };
    return out;
  },
  /** Moon Base: a rocket on its launch pad. Tap: countdown, a hop and a puff of smoke. */
  /** The Great Tree: a giant glowing flower. Tap it and its petals flutter open and it spins. */
  glowbloom(look) {
    const g = new THREE.Group();
    pad(g, look, 4);
    const green = toon('#4fae5a'), dark = toon('#3d8f4a');
    add(g, cyl(0.32, 0.5, 4.6, 8), green, [0, 2.6, 0]);
    for (const s of [-1, 1]) add(g, sphere(1.3, 10, 6), dark, [s * 1.2, 0.9, 0.2], [0, 0, s * 0.5], [1, 0.25, 0.6]);
    const head = new THREE.Group();
    head.position.set(0, 5.0, 0);
    head.userData.live = true;
    const heart = new THREE.Mesh(sphere(0.75, 14, 10), new THREE.MeshStandardMaterial({ color: '#fff2a8', emissive: '#ffd23f', emissiveIntensity: 0.7, roughness: 0.4 }));
    head.add(heart);
    const colors = [look.banner, '#ff9ed2', '#ffffff', look.flowers[0] ?? '#ffe066'];
    const petals = [];
    for (let i = 0; i < 9; i++) {
      const hinge = new THREE.Group();
      hinge.rotation.y = (i / 9) * Math.PI * 2;
      const leaf = new THREE.Group();
      add(leaf, sphere(1.0, 10, 6), toon(colors[i % colors.length]), [0, 0, 1.1], [0, 0, 0], [0.6, 0.16, 1.15]);
      hinge.add(leaf);
      head.add(hinge);
      petals.push(leaf);
    }
    g.add(head);
    batch(g);
    let t = 9, clock = 0;
    g.userData = {
      top: 7.5,
      poke: () => (t = 0),
      update(dt) {
        t += dt;
        clock += dt;
        const flutter = t < 1.6 ? Math.sin(t * 14) * Math.exp(-t * 2.4) * 0.5 : 0;
        petals.forEach((p, i) => (p.rotation.x = -0.35 - Math.sin(clock * 1.2 + i) * 0.06 - flutter));
        head.rotation.y += dt * (0.2 + (t < 1.6 ? 4 * Math.exp(-t * 2) : 0));
        heart.material.emissiveIntensity = 0.6 + Math.sin(clock * 2) * 0.2;
      }
    };
    return g;
  },
  rocket(look) {
    const g = new THREE.Group();
    add(g, cyl(4, 4.2, 0.4, 8), toon('#9aa3b5'), [0, 0.2, 0]);
    for (const sx of [-1, 1]) add(g, box(0.3, 7, 0.3), toon('#ff6f6f'), [sx * 2.4, 3.9, -0.8]);
    add(g, box(5.1, 0.3, 0.3), toon('#ff6f6f'), [0, 6.2, -0.8]);
    const ship = new THREE.Group();
    ship.position.set(0, 0.4, 0);
    ship.userData.live = true;
    add(ship, cyl(1.0, 1.1, 5, 16), toon('#ffffff'), [0, 3, 0]);
    add(ship, cone(1.0, 2.2, 16), toon('#ff6f6f'), [0, 6.6, 0]);
    add(ship, cyl(0.45, 0.45, 0.1, 14), toon('#7cc6ff', { emissive: '#3fa6ff', ei: 0.5 }), [0, 4.2, 1.02], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 3; i++) add(ship, box(0.12, 1.6, 1.0), toon('#7cc6ff'), [Math.cos(i * 2.1) * 1.05, 1.2, Math.sin(i * 2.1) * 1.05], [0, -i * 2.1, 0]);
    const flame = add(ship, cone(0.6, 1.6, 12), new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff7a1a', emissiveIntensity: 1.5 }), [0, -0.1, 0], [Math.PI, 0, 0]);
    g.add(ship);
    batch(g);
    let t = 9;
    return Object.assign(g, { userData: { top: 9, poke: () => (t = 0), update: (dt) => { t += dt; const up = t < 2.4 ? Math.sin((t / 2.4) * Math.PI) * 2.2 : 0; ship.position.y = 0.4 + up; flame.visible = t < 2.4; flame.scale.y = 0.8 + Math.random() * 0.5; } } });
  }
};

function palm(g, x, z, h) {
  for (let i = 0; i < 5; i++) add(g, cyl(0.2 - i * 0.02, 0.24 - i * 0.02, h / 5, 7), toon('#b07a52'), [x + Math.sin(i * 0.4) * 0.15 * i, 0.3 + (i + 0.5) * (h / 5), z]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(g, new THREE.ConeGeometry(0.35, 2.4, 4), toon('#4fbf6a'), [x + Math.cos(a) * 1.0, h + 0.4, z + Math.sin(a) * 1.0], [Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25], [1, 1, 0.25]);
  }
  add(g, sphere(0.25, 8, 6), toon('#8a5e3c'), [x, h + 0.1, z]);
}

/** Little fish that circle a pool, and jump when it is tapped. */
function fishSchool(g, n, r, y, avoid = null) {
  const fish = [];
  for (let i = 0; i < n; i++) {
    const f = new THREE.Group();
    f.userData.live = true;
    add(f, sphere(0.22, 10, 8), toon(['#ff9f43', '#ff6f6f', '#ffe066'][i % 3]), [0, 0, 0], [0, 0, 0], [1, 0.7, 1.6]);
    add(f, cone(0.14, 0.25, 4), toon(['#ff9f43', '#ff6f6f', '#ffe066'][i % 3]), [0, 0, -0.38], [-Math.PI / 2, 0, 0]);
    f.userData = { live: true, a: (i / n) * Math.PI * 2, r: r * (0.6 + i * 0.12), y, jump: 9 };
    g.add(f);
    fish.push(f);
  }
  return fish;
}
function withFish(g, fish, top) {
  g.userData = {
    top,
    poke: () => fish.forEach((f, i) => (f.userData.jump = -i * 0.25)),
    update(dt) {
      for (const f of fish) {
        const u = f.userData;
        u.a += dt * 0.7;
        u.jump += dt;
        const j = u.jump > 0 && u.jump < 0.9 ? Math.sin((u.jump / 0.9) * Math.PI) * 1.4 : 0;
        f.position.set(Math.cos(u.a) * u.r, u.y + j, Math.sin(u.a) * u.r);
        f.rotation.set(j ? -Math.cos((u.jump / 0.9) * Math.PI) * 0.8 : 0, -u.a, 0);
      }
    }
  };
  return g;
}

/** Balloons on strings; a tap lets one float away (it comes back later). */
function balloonBunch(g, x, y, z, n) {
  const out = [];
  const colors = ['#ff6f6f', '#ffd23f', '#7cc6ff', '#7ee08a', '#ff9ed2', '#9b7be0', '#ffb347'];
  for (let i = 0; i < n; i++) {
    const b = new THREE.Group();
    b.userData.live = true;
    const a = (i / n) * Math.PI * 2;
    const home = new THREE.Vector3(x + Math.cos(a) * 0.9, y + 3.2 + (i % 3) * 0.5, z + Math.sin(a) * 0.6);
    add(b, sphere(0.42, 12, 10), toon(colors[i % colors.length]), [0, 0, 0], [0, 0, 0], [1, 1.2, 1]);
    const string = add(b, cyl(0.01, 0.01, 2.4, 3), toon('#ffffff'), [0, -1.5, 0]);
    b.position.copy(home);
    b.userData = { live: true, home, free: false, t: Math.random() * 6, string };
    g.add(b);
    out.push(b);
  }
  return out;
}
function withBalloons(g, balloons, top) {
  g.userData = {
    top,
    poke: () => {
      const b = balloons.find((x) => !x.userData.free);
      if (b) {
        b.userData.free = true;
        b.userData.t = 0;
      }
    },
    update(dt) {
      for (const b of balloons) {
        const u = b.userData;
        u.t += dt;
        if (u.free) {
          b.position.y += dt * 2.2;
          b.position.x += Math.sin(u.t * 2) * dt;
          if (u.t > 9) {
            u.free = false;
            b.position.copy(u.home);
          }
        } else b.position.set(u.home.x + Math.sin(u.t * 1.3) * 0.12, u.home.y + Math.sin(u.t * 1.7) * 0.1, u.home.z);
      }
    }
  };
  return g;
}

/* ---------------------------------------------------------------- toys to poke */

/** Small toys scattered on a floor; each reacts to a tap (and makes a sound). */
export function toy(kind, look, seed = 1) {
  const g = new THREE.Group();
  const r = seeded(seed);
  if (kind === 'bell') {
    add(g, cyl(0.08, 0.1, 2.4, 6), toon('#8a5e3c'), [0, 1.2, 0]);
    add(g, box(1.0, 0.12, 0.12), toon('#8a5e3c'), [0, 2.4, 0]);
    const bell = new THREE.Group();
    bell.position.set(0, 2.3, 0);
    bell.userData.live = true;
    add(bell, new THREE.CylinderGeometry(0.12, 0.38, 0.55, 12, 1, true), toon('#ffd23f', { metal: 0.6, side: THREE.DoubleSide }), [0, -0.3, 0]);
    g.add(bell);
    let t = 9;
    batch(g);
    g.userData = { sound: 'bell', top: 3, poke: () => (t = 0), update: (dt) => { t += dt; bell.rotation.z = t < 2 ? Math.sin(t * 14) * 0.6 * Math.exp(-t * 1.5) : 0; } };
    return g;
  }
  if (kind === 'bouncer') {
    const c = [look.banner, '#ff5f7e', '#7cc6ff'][Math.floor(r() * 3)];
    const m = new THREE.Group();
    m.userData.live = true;
    add(m, cyl(0.35, 0.45, 1.0, 10), toon('#fff6ea'), [0, 0.5, 0]);
    const cap = new THREE.SphereGeometry(1.0, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.scale(1, 0.6, 1);
    add(m, cap, toon(c), [0, 1.0, 0]);
    for (let i = 0; i < 4; i++) add(m, sphere(0.14, 6, 4), toon('#ffffff'), [Math.cos(i * 1.6) * 0.55, 1.35, Math.sin(i * 1.6) * 0.55], [0, 0, 0], [1, 0.5, 1]);
    g.add(m);
    const b = bouncer(m);
    g.userData = { sound: 'boing', top: 2, ...b };
    return g;
  }
  if (kind === 'balloons') {
    add(g, cyl(0.3, 0.35, 0.4, 8), toon('#a8714a'), [0, 0.2, 0]);
    const bs = balloonBunch(g, 0, -0.6, 0, 4);
    withBalloons(g, bs, 4);
    g.userData.sound = 'pop';
    return g;
  }
  if (kind === 'pond') {
    add(g, cyl(1.8, 1.9, 0.25, 18), toon(look.stone), [0, 0.12, 0]);
    add(g, cyl(1.5, 1.5, 0.08, 18), new THREE.MeshStandardMaterial({ color: '#3fc6e0', roughness: 0.15, transparent: true, opacity: 0.85 }), [0, 0.27, 0]);
    const fish = fishSchool(g, 3, 1.1, 0.25);
    withFish(g, fish, 1.5);
    g.userData.sound = 'splash';
    return g;
  }
  if (kind === 'pot') {
    const p = new THREE.Group();
    p.userData.live = true;
    p.add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.4, 0.05], [0.6, 0.4], [0.5, 0.8], [0.3, 0.95], [0.35, 1.05], [0, 1.05]].map(([x, y]) => new THREE.Vector2(x, y)), 12), toon('#e07a4a')));
    p.children[0].castShadow = true;
    add(p, new THREE.TorusGeometry(0.5, 0.05, 4, 14), toon('#3f7fd6'), [0, 0.55, 0], [Math.PI / 2, 0, 0]);
    g.add(p);
    let t = 9;
    g.userData = { sound: 'boing', top: 1.6, poke: () => (t = 0), update: (dt) => { t += dt; p.rotation.z = t < 1.2 ? Math.sin(t * 16) * 0.2 * (1.2 - t) : 0; } };
    return g;
  }
  // 'spinner': a giant flower (or a pinwheel) that spins.
  add(g, cyl(0.06, 0.08, 2.0, 6), toon('#5fcf6a'), [0, 1.0, 0]);
  const head = new THREE.Group();
  head.position.set(0, 2.1, 0.1);
  head.userData.live = true;
  const petal = look.flowers[0] ?? '#ff8fa3';
  for (let i = 0; i < 6; i++) add(head, sphere(0.28, 10, 8), toon(i % 2 ? petal : '#ffffff'), [Math.cos((i / 6) * Math.PI * 2) * 0.42, Math.sin((i / 6) * Math.PI * 2) * 0.42, 0], [0, 0, 0], [1, 1, 0.4]);
  add(head, sphere(0.25, 10, 8), toon('#ffd23f'), [0, 0, 0.08], [0, 0, 0], [1, 1, 0.5]);
  g.add(head);
  let spin = 0.3;
  g.userData = { sound: 'whirl', top: 3, poke: () => (spin = 14), update: (dt) => { spin = Math.max(0.3, spin - dt * 5); head.rotation.z += dt * spin; } };
  return g;
}

export const TOYS_BY_THEME = {
  meadow: ['bell', 'spinner', 'balloons', 'bouncer'],
  desert: ['pot', 'pot', 'bell', 'spinner'],
  mushroom: ['bouncer', 'bouncer', 'bell', 'spinner'],
  snow: ['bell', 'balloons', 'pond', 'bouncer'],
  cloud: ['balloons', 'balloons', 'bouncer', 'bell'],
  harbor: ['pond', 'bell', 'balloons', 'pot'],
  moon: ['bouncer', 'bell', 'balloons', 'spinner']
};

/** A hidden gem: a spinning, glowing crystal to find and collect. */
export function gem(color = '#7ff7ff') {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.2, flatShading: true }));
  m.scale.set(1, 1.4, 1);
  m.position.y = 1.1;
  m.castShadow = true;
  g.add(m);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.06;
  g.add(halo);
  let t = Math.random() * 6, got = 0;
  g.userData = {
    collect: () => (got = 0.01),
    update(dt) {
      t += dt;
      m.rotation.y += dt * 2;
      m.position.y = 1.1 + Math.sin(t * 2.5) * 0.15 + got * 6;
      if (got) {
        got += dt;
        m.scale.setScalar(Math.max(0, 1 - got * 1.5));
        halo.visible = false;
        if (got > 0.7) g.visible = false;
      }
    }
  };
  return g;
}

/* ---------------------------------------------------------------- the far-away look */

/** A whole floor's places as one cheap mesh: a box and a roof each, in their colours. */
export function silhouette(floor, places) {
  const geos = [];
  const colorOf = { math: floor.look.roof.math, history: floor.look.roof.history, physics: floor.look.roof.physics };
  for (const p of places) {
    const big = ['math', 'history', 'physics'].includes(p.kind);
    const w = big ? 5.5 : 3.2, h = big ? 3.8 : 2.4;
    const body = new THREE.BoxGeometry(w, h, w * 0.8).toNonIndexed();
    body.translate(p.x, floor.y + 0.55 + h / 2, p.z);
    const roof = new THREE.ConeGeometry(w * 0.72, big ? 2.6 : 1.6, 4).toNonIndexed();
    roof.rotateY(Math.PI / 4);
    roof.translate(p.x, floor.y + 0.55 + h + (big ? 1.3 : 0.8), p.z);
    for (const [g, c] of [[body, floor.look.wall], [roof, colorOf[p.kind] ?? floor.look.banner]]) {
      const col = new THREE.Color(c);
      const arr = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < arr.length; i += 3) arr.set([col.r, col.g, col.b], i);
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      g.deleteAttribute('uv');
      geos.push(g);
    }
  }
  const pos = [], nor = [], col = [];
  for (const g of geos) {
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
    col.push(...g.attributes.color.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(out, new THREE.MeshToonMaterial({ vertexColors: true }));
  mesh.castShadow = true;
  return mesh;
}
export { lantern };
