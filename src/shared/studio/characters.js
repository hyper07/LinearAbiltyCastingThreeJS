/**
 * Characters from data (spec.js CHARACTER_SCHEMA), made procedurally and instantly with our own
 * kits — the character generator, the game runtime and the store's previews all use this.
 *
 *   buildCharacter(char, { look })   a three.js Group with named parts (head, arms, legs, ears…)
 *                                    for animate.js: plush, toon or 3D-toon bodies, big heads
 *                                    (knowledge/render-quality.md §6: head ≈ body, eyes low and wide)
 *   pixelFrames(char)                sprite frames (idle ×2, walk ×4) shaded with src/pixel/art.js
 *                                    (scale 4: smooth light over nine shades)
 */
import * as THREE from 'three';
import { ramp, shadeSprite } from '../../pixel/art.js';

/* -------------------------------------------------------------- materials */

let toonRamp = null;
function toonGradient() {
  if (toonRamp) return toonRamp;
  const data = new Uint8Array([90, 170, 255]);
  toonRamp = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  toonRamp.minFilter = THREE.NearestFilter;
  toonRamp.magFilter = THREE.NearestFilter;
  toonRamp.generateMipmaps = false;
  toonRamp.needsUpdate = true;
  return toonRamp;
}

/**
 * A material for a look: realistic = physical (plush gets sheen, metal parts metalness),
 * stylized = standard, cartoon = toon bands. `kind`: 'soft' | 'metal' | 'shiny' | 'glow'.
 */
export function lookMaterial(look, color, kind = 'soft') {
  const c = new THREE.Color(color);
  if (kind === 'glow') return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.4, roughness: 0.4 });
  if (look === 'cartoon') return new THREE.MeshToonMaterial({ color: c, gradientMap: toonGradient() });
  if (look === 'realistic') {
    if (kind === 'metal') return new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.85, roughness: 0.3, clearcoat: 0.4 });
    if (kind === 'shiny') return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
    return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.88, sheen: 1, sheenRoughness: 0.6, sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.4) });
  }
  if (kind === 'metal') return new THREE.MeshStandardMaterial({ color: c, metalness: 0.6, roughness: 0.4 });
  return new THREE.MeshStandardMaterial({ color: c, roughness: kind === 'shiny' ? 0.3 : 0.7 });
}

const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1a1026, side: THREE.BackSide });

/** Ink outline by the inverted hull: a slightly larger back-face copy (cartoon look). */
export function addOutline(mesh, width = 0.05) {
  const hull = new THREE.Mesh(mesh.geometry, OUTLINE);
  hull.scale.setScalar(1 + width / Math.max(0.1, mesh.geometry.boundingSphere?.radius ?? (mesh.geometry.computeBoundingSphere(), mesh.geometry.boundingSphere.radius)));
  hull.userData.outline = true;
  hull.castShadow = false;
  mesh.add(hull);
  return hull;
}

/* ----------------------------------------------------------------- bodies */

const ROUND = new Set(['slime', 'ghost', 'blob']);
const METAL = new Set(['robot', 'knight']);

/**
 * A 3D character. Returns { group, rig, height } — rig holds the parts animate.js moves:
 * root (whole body, for hops and squash), body, head, armL, armR, legL, legR, ears[], tail.
 */
export function buildCharacter(char, { look = 'cartoon' } = {}) {
  const group = new THREE.Group();
  group.name = char.name;
  const root = new THREE.Group();
  group.add(root);
  const parts = [];
  const mat = (color, kind) => lookMaterial(look, color, kind);
  const main = mat(char.colors.main, METAL.has(char.body) ? 'metal' : 'soft');
  const second = mat(char.colors.second, char.body === 'robot' ? 'shiny' : 'soft');
  const accent = mat(char.colors.accent, char.body === 'knight' ? 'metal' : 'shiny');
  const eye = mat('#1a1026', 'shiny');
  const glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = (geo, m, x = 0, y = 0, z = 0, parent = root) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    parts.push(o);
    return o;
  };
  const rig = { root, body: null, head: null, armL: null, armR: null, legL: null, legR: null, ears: [], tail: null };
  const eyes = (parent, y, z, spread = 0.13, r = 0.06) => {
    for (const s of [-1, 1]) {
      const e = mesh(new THREE.SphereGeometry(r, 12, 10), eye, s * spread, y, z, parent);
      e.scale.z = 0.6;
      const g = mesh(new THREE.SphereGeometry(r * 0.35, 8, 6), glint, -0.02, 0.025, r * 0.5, e);
      g.castShadow = false;
    }
  };

  if (ROUND.has(char.body)) {
    const body = mesh(new THREE.SphereGeometry(0.5, 24, 18), main, 0, 0.45, 0);
    body.scale.set(1, char.body === 'ghost' ? 1.2 : 0.85, 1);
    rig.body = body;
    rig.head = body;
    if (char.body === 'ghost') {
      const skirt = mesh(new THREE.ConeGeometry(0.5, 0.5, 18, 1, true), main, 0, 0.05, 0);
      skirt.rotation.x = Math.PI;
    }
    if (char.body === 'slime') mesh(new THREE.SphereGeometry(0.16, 12, 10), second, -0.18, 0.72, 0.28).scale.set(1, 0.6, 0.5);
    eyes(body, 0.12, 0.42, 0.16, 0.08);
  } else {
    const robot = char.body === 'robot';
    const body = robot ? mesh(new THREE.BoxGeometry(0.62, 0.55, 0.45), main, 0, 0.55, 0) : mesh(new THREE.SphereGeometry(0.34, 20, 16), main, 0, 0.55, 0);
    if (!robot) body.scale.set(1, 1.08, 0.9);
    rig.body = body;
    if (char.body !== 'robot') mesh(new THREE.SphereGeometry(0.22, 16, 12), second, 0, 0.52, 0.17).scale.set(1, 1.1, 0.5);
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.05, 0);
    root.add(headGroup);
    rig.head = headGroup;
    const head = robot ? mesh(new THREE.BoxGeometry(0.62, 0.5, 0.52), main, 0, 0, 0, headGroup) : mesh(new THREE.SphereGeometry(0.4, 24, 18), char.body === 'kid' || char.body === 'mage' ? second : main, 0, 0, 0, headGroup);
    if (!robot) head.scale.set(1.08, 0.96, 1);
    eyes(headGroup, -0.04, robot ? 0.27 : 0.36, robot ? 0.14 : 0.14, 0.065);
    // Ears, beaks and the rest of a body's own shape.
    const ear = (geo, x, y, rz, m = main) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      pivot.rotation.z = rz;
      headGroup.add(pivot);
      const e = mesh(geo, m, 0, geo.parameters?.height ? geo.parameters.height / 2 : 0.1, 0, pivot);
      rig.ears.push(pivot);
      return e;
    };
    switch (char.body) {
      case 'bunny':
        for (const s of [-1, 1]) ear(new THREE.CapsuleGeometry(0.08, 0.42, 6, 10), s * 0.17, 0.3, -s * 0.12);
        break;
      case 'bear':
        for (const s of [-1, 1]) ear(new THREE.SphereGeometry(0.12, 12, 10), s * 0.28, 0.28, 0);
        break;
      case 'cat':
      case 'fox':
        for (const s of [-1, 1]) ear(new THREE.ConeGeometry(0.12, 0.26, 4), s * 0.24, 0.26, -s * 0.25);
        if (char.body === 'fox') mesh(new THREE.ConeGeometry(0.1, 0.22, 10), second, 0, -0.08, 0.42, headGroup).rotation.x = Math.PI / 2;
        break;
      case 'penguin':
      case 'bird':
        mesh(new THREE.ConeGeometry(0.07, 0.18, 10), accent, 0, -0.1, 0.42, headGroup).rotation.x = Math.PI / 2;
        break;
      case 'frog':
        for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.12, 12, 10), main, s * 0.2, 0.3, 0.12, headGroup);
        break;
      case 'dino':
        for (let i = 0; i < 3; i++) mesh(new THREE.ConeGeometry(0.07, 0.18, 6), accent, 0, 0.36 - i * 0.12, -0.3 - i * 0.05, headGroup);
        break;
      case 'kid':
        mesh(new THREE.SphereGeometry(0.42, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), accent, 0, 0.04, -0.03, headGroup);
        break;
      case 'knight':
        mesh(new THREE.BoxGeometry(0.5, 0.07, 0.1), accent, 0, 0.02, 0.38, headGroup);
        break;
      case 'mage':
        mesh(new THREE.ConeGeometry(0.36, 0.6, 14), main, 0, 0.5, 0, headGroup).rotation.z = 0.15;
        break;
      case 'robot':
        mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22), accent, 0, 0.35, 0, headGroup);
        mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(char.colors.accent, 'glow'), 0, 0.48, 0, headGroup);
        break;
      default:
        break;
    }
    // Limbs on pivots, so animate.js swings them from the shoulder and hip.
    const limb = (x, y, len, r, m) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      root.add(pivot);
      mesh(robot ? new THREE.BoxGeometry(r * 2, len, r * 2) : new THREE.CapsuleGeometry(r, len - r * 2, 6, 10), m, 0, -len / 2, 0, pivot);
      return pivot;
    };
    rig.armL = limb(-0.36, 0.72, 0.36, 0.085, main);
    rig.armR = limb(0.36, 0.72, 0.36, 0.085, main);
    rig.legL = limb(-0.15, 0.3, 0.3, 0.1, char.body === 'penguin' || char.body === 'bird' ? accent : main);
    rig.legR = limb(0.15, 0.3, 0.3, 0.1, char.body === 'penguin' || char.body === 'bird' ? accent : main);
    if (['cat', 'fox', 'dino', 'bear', 'bunny'].includes(char.body)) {
      const tail = new THREE.Group();
      tail.position.set(0, 0.4, -0.3);
      root.add(tail);
      const t = char.body === 'bunny' || char.body === 'bear' ? mesh(new THREE.SphereGeometry(0.1, 10, 8), second, 0, 0, -0.04, tail) : mesh(new THREE.CapsuleGeometry(0.07, char.body === 'dino' ? 0.5 : 0.36, 6, 8), char.body === 'fox' ? second : main, 0, 0.1, -0.2, tail);
      if (t.geometry.type === 'CapsuleGeometry') t.rotation.x = -1;
      rig.tail = tail;
    }
  }

  // Accessories (up to three).
  const head = rig.head;
  const top = ROUND.has(char.body) ? 0.48 : 0.36;
  for (const a of char.accessories ?? []) {
    switch (a) {
      case 'hat': {
        mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 20), accent, 0, top, 0, head);
        mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.26, 18), accent, 0, top + 0.14, 0, head);
        break;
      }
      case 'crown': {
        const gold = mat('#f0c040', 'metal');
        mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 8, 1, true), gold, 0, top + 0.05, 0, head);
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * Math.PI * 2;
          mesh(new THREE.ConeGeometry(0.04, 0.1, 5), gold, Math.sin(ang) * 0.2, top + 0.17, Math.cos(ang) * 0.2, head);
        }
        break;
      }
      case 'horns':
        for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(0.06, 0.22, 8), mat('#f4eeda', 'shiny'), s * 0.2, top, 0.05, head).rotation.z = -s * 0.4;
        break;
      case 'bow': {
        for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(0.08, 0.16, 8), accent, s * 0.09 + 0.18, top - 0.02, 0.1, head).rotation.z = (s * Math.PI) / 2;
        break;
      }
      case 'glasses':
        for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.075, 0.015, 6, 16), mat('#2a2a33', 'shiny'), s * 0.14, ROUND.has(char.body) ? 0.12 : -0.04, ROUND.has(char.body) ? 0.46 : 0.4, head);
        break;
      case 'scarf':
        mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 20), accent, 0, ROUND.has(char.body) ? 0.25 : 0.82, 0).rotation.x = Math.PI / 2;
        break;
      case 'cape': {
        const cape = mesh(new THREE.PlaneGeometry(0.6, 0.7), new THREE.MeshStandardMaterial({ color: char.colors.accent, side: THREE.DoubleSide, roughness: 0.8 }), 0, 0.5, -0.32);
        cape.rotation.x = 0.15;
        break;
      }
      case 'backpack':
        mesh(new THREE.BoxGeometry(0.4, 0.42, 0.2), accent, 0, 0.58, -0.32);
        break;
      case 'wings':
        for (const s of [-1, 1]) {
          const w = mesh(new THREE.SphereGeometry(0.28, 12, 8), mat('#ffffff', 'soft'), s * 0.32, 0.7, -0.3);
          w.scale.set(0.3, 1, 0.8);
          w.rotation.z = s * 0.5;
        }
        break;
      case 'sword': {
        const hand = rig.armR ?? root;
        mesh(new THREE.BoxGeometry(0.05, 0.6, 0.12), mat('#cfe2ea', 'metal'), 0.02, -0.55, 0.15, hand).rotation.x = -0.4;
        break;
      }
      case 'staff': {
        const hand = rig.armR ?? root;
        mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.1), mat('#9c6a3c', 'soft'), 0.03, -0.3, 0.1, hand);
        mesh(new THREE.SphereGeometry(0.08, 12, 10), mat(char.colors.accent, 'glow'), 0.03, 0.27, 0.1, hand);
        break;
      }
      case 'shield': {
        const hand = rig.armL ?? root;
        mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 18), accent, -0.05, -0.3, 0.12, hand).rotation.x = Math.PI / 2;
        break;
      }
      default:
        break;
    }
  }

  if (look === 'cartoon') for (const p of parts.slice()) if (p.material !== glint && p.geometry.type !== 'PlaneGeometry') addOutline(p, 0.025);
  group.scale.setScalar(char.size ?? 1);
  group.userData.dispose = () => {
    group.traverse((o) => {
      if (o.userData.outline) return;
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
  };
  return { group, rig, height: (ROUND.has(char.body) ? 1 : 1.5) * (char.size ?? 1) };
}

/* ----------------------------------------------------------------- pixels */

const W = 16;
const H = 18;

/** One frame's letter grid: m main, s second, a accent, e eye, w white glint. */
function pixelRows(char, pose) {
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const put = (x, y, c) => {
    if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c;
  };
  const ellipse = (cx, cy, rx, ry, c) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(x, y, c);
  };
  const rect = (x, y, w, h, c) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c);
  };
  const bob = pose.bob;
  if (ROUND.has(char.body)) {
    const squash = pose.walk % 2 ? 0.4 : 0;
    ellipse(7.5, 11.5 + bob + squash, 6.3 + squash, 5 - squash, 'm');
    if (char.body === 'ghost') for (let x = 2; x < 14; x += 3) rect(x + (pose.walk % 2), 15 + bob, 2, 2, 'm');
    ellipse(5.5, 9.5 + bob, 1.4, 1, 's');
    put(5, 11 + bob, 'e');
    put(10, 11 + bob, 'e');
    put(5, 10 + bob, 'w');
    put(10, 10 + bob, 'w');
  } else {
    // Legs and arms first, the body over them.
    const step = [0, 1, 0, -1][pose.walk] ?? 0;
    rect(5, 14 + bob - Math.max(0, step), 2, 3, char.body === 'penguin' || char.body === 'bird' ? 'a' : 'm');
    rect(9, 14 + bob - Math.max(0, -step), 2, 3, char.body === 'penguin' || char.body === 'bird' ? 'a' : 'm');
    ellipse(7.5, 12 + bob, 3.6, 3, 'm');
    ellipse(7.5, 12.6 + bob, 2, 1.8, 's');
    rect(3, 11 + bob + step, 1, 3, 'm');
    rect(12, 11 + bob - step, 1, 3, 'm');
    const face = char.body === 'kid' || char.body === 'mage' ? 's' : 'm';
    if (char.body === 'robot') rect(3, 3 + bob, 10, 7, 'm');
    else ellipse(7.5, 6.5 + bob, 5.4, 4.5, face);
    if (char.body !== 'robot' && face === 'm') ellipse(7.5, 8 + bob, 3, 1.8, 's');
    put(5, 6 + bob, 'e');
    put(10, 6 + bob, 'e');
    put(5, 5 + bob, 'w');
    put(10, 5 + bob, 'w');
    switch (char.body) {
      case 'bunny':
        rect(4, -1 + bob, 2, 4, 'm');
        rect(10, -1 + bob, 2, 4, 'm');
        rect(5, 0 + bob, 1, 2, 's');
        rect(10, 0 + bob, 1, 2, 's');
        break;
      case 'bear':
        ellipse(3, 2.5 + bob, 1.4, 1.4, 'm');
        ellipse(12, 2.5 + bob, 1.4, 1.4, 'm');
        break;
      case 'cat':
      case 'fox':
        rect(3, 1 + bob, 2, 2, 'm');
        put(3, 0 + bob, 'm');
        rect(11, 1 + bob, 2, 2, 'm');
        put(12, 0 + bob, 'm');
        break;
      case 'penguin':
      case 'bird':
        rect(7, 7 + bob, 2, 1, 'a');
        break;
      case 'kid':
        rect(3, 2 + bob, 10, 2, 'a');
        put(3, 4 + bob, 'a');
        put(12, 4 + bob, 'a');
        break;
      case 'knight':
        rect(3, 6 + bob, 10, 1, 'a');
        break;
      case 'mage':
        for (let i = 0; i < 4; i++) rect(5 + Math.floor(i / 2), -1 + i + bob, 6 - i, 1, 'a');
        rect(3, 3 + bob, 10, 1, 'a');
        break;
      case 'robot':
        put(7, 1 + bob, 'a');
        put(7, 2 + bob, 'a');
        rect(5, 8 + bob, 6, 1, 'a');
        break;
      case 'dino':
        put(7, 1 + bob, 'a');
        put(9, 2 + bob, 'a');
        put(5, 2 + bob, 'a');
        break;
      case 'frog':
        ellipse(4.5, 2.5 + bob, 1.4, 1.2, 'm');
        ellipse(10.5, 2.5 + bob, 1.4, 1.2, 'm');
        break;
      default:
        break;
    }
  }
  for (const a of char.accessories ?? []) {
    const y0 = ROUND.has(char.body) ? 6 : 1;
    if (a === 'crown') {
      rect(5, y0 + bob, 6, 1, 'a');
      put(5, y0 - 1 + bob, 'a');
      put(7, y0 - 1 + bob, 'a');
      put(10, y0 - 1 + bob, 'a');
    } else if (a === 'hat') {
      rect(3, y0 + 1 + bob, 10, 1, 'a');
      rect(5, y0 - 1 + bob, 6, 2, 'a');
    } else if (a === 'horns') {
      put(3, y0 + bob, 'w');
      put(12, y0 + bob, 'w');
    } else if (a === 'scarf' && !ROUND.has(char.body)) rect(4, 10 + bob, 8, 1, 'a');
    else if (a === 'sword') rect(14, 8 + bob, 1, 6, 'w');
    else if (a === 'staff') {
      rect(14, 5 + bob, 1, 11, 'a');
      put(14, 4 + bob, 'w');
    } else if (a === 'shield') rect(0, 11 + bob, 2, 3, 'a');
  }
  return g.map((r) => r.join(''));
}

const frameCache = new Map();
/**
 * Sprite frames for a character: { idle: [c0, c1], walk: [c0…c3], width, height } (canvases).
 * Cached by what they depend on.
 */
export function pixelFrames(char, { scale = 4 } = {}) {
  const key = JSON.stringify([char.body, char.colors, char.accessories, scale]);
  if (frameCache.has(key)) return frameCache.get(key);
  const ramps = { m: ramp(char.colors.main), s: ramp(char.colors.second), a: ramp(char.colors.accent) };
  const flat = { e: '#1a1026', w: '#ffffff' };
  const make = (pose) => shadeSprite(pixelRows(char, pose), ramps, { scale, flat }).canvas;
  const out = {
    idle: [make({ bob: 0, walk: 0 }), make({ bob: 1, walk: 0 })],
    walk: [0, 1, 2, 3].map((walk) => make({ bob: walk % 2 ? 1 : 0, walk })),
    width: W * scale,
    height: H * scale
  };
  if (frameCache.size > 200) frameCache.clear();
  frameCache.set(key, out);
  return out;
}
