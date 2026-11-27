/**
 * A map's world from its layout (layout.js), in the game's style:
 *
 *   buildWorld3D(…)    full 3D, HD-2D and the painted side view: ground, water, decorations
 *                      (instanced), hazards, the exit door, markers; per look (looks.js materials)
 *   paintMap2D(…)      full 2D: the whole map painted once on a canvas (pixel ground from
 *                      src/pixel/art.js for pixel games, soft painted ground otherwise)
 *   paintBackdrop(…)   the painted side view's layered parallax backdrop (sky, far, mid, near)
 */
import * as THREE from 'three';
import { paintGround, ramp } from '../../pixel/art.js';
import { lookMaterial, addOutline } from './characters.js';

export const BIOME_COLORS = {
  meadow: { ground: '#7cc45a', ground2: '#5aa046', sky: ['#8fd3ff', '#e8f7ff'], leaf: '#3f8f3a', trunk: '#8a5a32', rock: '#9a9aa6', water: '#4aa8e8', far: '#7aa8d0', fog: '#cfe9ff' },
  forest: { ground: '#4f8a3c', ground2: '#3a6e2e', sky: ['#7fbfe8', '#d8f0e0'], leaf: '#2f6e34', trunk: '#6a4428', rock: '#8a8a90', water: '#3a90c8', far: '#4a7a6a', fog: '#c8e0d0' },
  snow: { ground: '#eef4fb', ground2: '#d6e4f2', sky: ['#a8c8e8', '#f0f6ff'], leaf: '#2f5e4a', trunk: '#6a4428', rock: '#a8b4c4', water: '#9fd6f0', far: '#b8c8e0', fog: '#e8f0fa' },
  desert: { ground: '#e8c88a', ground2: '#d6aa6a', sky: ['#7ab8f0', '#fde8c0'], leaf: '#5a9a4a', trunk: '#8a6a3a', rock: '#c08a5a', water: '#3ab0c8', far: '#d0a070', fog: '#f6e2c0' },
  beach: { ground: '#f2dca0', ground2: '#e6c888', sky: ['#6ac0f0', '#e0f6ff'], leaf: '#3a9a4a', trunk: '#9a6a3a', rock: '#a09a90', water: '#2aa0d8', far: '#5ab0d8', fog: '#d8f0ff' },
  cave: { ground: '#4a4458', ground2: '#3a3448', sky: ['#141020', '#2a2238'], leaf: '#5a7a8a', trunk: '#4a3a3a', rock: '#6a6478', water: '#2a6a9a', far: '#2a2438', fog: '#1a1626' },
  castle: { ground: '#8a8478', ground2: '#6e6a60', sky: ['#6a8ab8', '#d0d8e8'], leaf: '#4a7a4a', trunk: '#5a4a3a', rock: '#9a948a', water: '#4a7aa8', far: '#6a7a98', fog: '#c8d0e0' },
  lava: { ground: '#3a2a2a', ground2: '#2a1a1a', sky: ['#2a1010', '#8a3a1a'], leaf: '#3a3030', trunk: '#2a2020', rock: '#4a3a38', water: '#ff6a1a', far: '#4a1a10', fog: '#3a1a10' },
  city: { ground: '#a0a4ac', ground2: '#8a8e96', sky: ['#7ab0e8', '#e6f0fa'], leaf: '#4a9a4a', trunk: '#7a5a3a', rock: '#b0b0b8', water: '#4a90d8', far: '#8a9ab8', fog: '#dce6f0' },
  space: { ground: '#7a7a8e', ground2: '#5a5a6e', sky: ['#05050f', '#1a1a3a'], leaf: '#8a6ae8', trunk: '#4a4a6a', rock: '#8a8aa0', water: '#6ae8ff', far: '#2a2a4a', fog: '#0a0a1a' },
  swamp: { ground: '#5a6a3a', ground2: '#4a5a30', sky: ['#7a8a7a', '#c8d0b8'], leaf: '#3a5a2a', trunk: '#4a3a2a', rock: '#6a6a5a', water: '#4a6a4a', far: '#5a6a58', fog: '#a8b0a0' },
  candy: { ground: '#ffc8e0', ground2: '#ffb0d0', sky: ['#b8e0ff', '#fff0f8'], leaf: '#ff8ac0', trunk: '#fff0f0', rock: '#c8a0ff', water: '#a0e8ff', far: '#e8b0e0', fog: '#ffe8f4' }
};
const TIME_SKY = { night: ['#0b1030', '#26305a'], sunset: ['#4a3a80', '#ffa060'], dawn: ['#6a8ad0', '#ffc8b0'] };

const PALETTE_SHIFT = { bright: [0, 0.05, 0], pastel: [0, -0.2, 0.12], earthy: [0.02, -0.15, -0.05], moody: [0, -0.1, -0.12], neon: [0, 0.3, 0.02] };
/** A colour moved by the game's palette (style.palette). */
export function tint(hex, palette = 'bright') {
  const [h, s, l] = PALETTE_SHIFT[palette] ?? PALETTE_SHIFT.bright;
  return `#${new THREE.Color(hex).offsetHSL(h, s, l).getHexString()}`;
}
export function colorsFor(map, palette) {
  const base = BIOME_COLORS[map.biome] ?? BIOME_COLORS.meadow;
  const out = {};
  for (const [k, v] of Object.entries(base)) out[k] = Array.isArray(v) ? v.map((c) => tint(c, palette)) : tint(v, palette);
  if (TIME_SKY[map.time] && map.biome !== 'cave' && map.biome !== 'space') out.sky = TIME_SKY[map.time];
  return out;
}

/** A vertical gradient canvas (the sky). */
export function skyCanvas(top, bottom, { stars = false } = {}) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  if (stars) {
    c.width = 512;
    const g2 = c.getContext('2d');
    g2.fillStyle = grad;
    g2.fillRect(0, 0, 512, 256);
    g2.fillStyle = '#ffffff';
    for (let i = 0; i < 160; i++) g2.fillRect((i * 97) % 512, (i * 53) % 180, 1 + (i % 3 === 0), 1);
  }
  return c;
}

/* ------------------------------------------------------------------ 3D */

const COLLECT_COLORS = { coin: '#f0c040', gem: '#4ae8c8', star: '#ffe24a', orb: '#a88aff', flower: '#ff8ac0', key: '#f0c040', fish: '#6ab7ff', snowflake: '#d8f6ff' };
export const collectColor = (kind) => COLLECT_COLORS[kind] ?? '#f0c040';

function starShape() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.14 : 0.32;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
}

/** The geometry of a collectible. */
export function collectGeometry(kind) {
  switch (kind) {
    case 'coin': return new THREE.CylinderGeometry(0.28, 0.28, 0.07, 20).rotateX(Math.PI / 2);
    case 'gem': return new THREE.OctahedronGeometry(0.28);
    case 'star': return starShape();
    case 'key': return new THREE.TorusGeometry(0.16, 0.05, 8, 16);
    case 'fish': return new THREE.SphereGeometry(0.22, 12, 8).scale(1.5, 0.8, 0.5);
    case 'snowflake': return new THREE.OctahedronGeometry(0.26, 0).scale(1, 1, 0.3);
    case 'flower': return new THREE.DodecahedronGeometry(0.22);
    default: return new THREE.SphereGeometry(0.25, 16, 12);
  }
}

/**
 * The 3D world for one map. Returns { group, update(dt, t), door, markers, dispose }.
 * `side`: the painted side view (only the lane's ground; the backdrop is separate).
 */
export function buildWorld3D(layout, map, { look = 'stylized', palette = 'bright', side = false, groundTexture = null } = {}) {
  const group = new THREE.Group();
  const colors = colorsFor(map, palette);
  const disposables = [];
  const keep = (x) => (disposables.push(x), x);
  const mat = (color, kind) => keep(lookMaterial(look, color, kind));
  const big = side ? layout.length + 40 : layout.half * 2 + 30;

  // Ground: a gently uneven plane with two shades mixed by noise (vertex colours).
  const groundGeo = keep(new THREE.PlaneGeometry(big, side ? 40 : big, 64, side ? 16 : 64).rotateX(-Math.PI / 2));
  const pos = groundGeo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c1 = new THREE.Color(colors.ground);
  const c2 = new THREE.Color(colors.ground2);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const n = Math.sin(x * 0.35) * Math.cos(z * 0.29) * 0.5 + Math.sin(x * 0.11 + z * 0.17) * 0.5;
    tmp.copy(c1).lerp(c2, (n + 1) / 2);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
    const inPlay = side ? Math.abs(z) < 4 : Math.max(Math.abs(x), Math.abs(z)) < layout.half;
    if (!inPlay) pos.setY(i, Math.max(0, (Math.sin(x * 0.2) + Math.cos(z * 0.23)) * 0.3));
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  groundGeo.computeVertexNormals();
  const groundMat = keep(look === 'cartoon' ? new THREE.MeshToonMaterial({ vertexColors: true }) : look === 'realistic' ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
  if (groundTexture) {
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(big / 4, (side ? 40 : big) / 4);
    groundTexture.colorSpace = THREE.SRGBColorSpace;
    groundMat.map = groundTexture;
    groundMat.vertexColors = false;
  }
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  group.add(ground);

  // Water and ice.
  for (const w of layout.water) {
    const m = w.frozen ? mat('#d8f2ff', 'shiny') : keep(new THREE.MeshPhysicalMaterial({ color: colors.water, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.82, clearcoat: 1 }));
    const disc = new THREE.Mesh(keep(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2)), m);
    disc.scale.set(w.rx, 1, w.rz);
    disc.position.set(w.x, 0.03, w.z);
    disc.receiveShadow = true;
    group.add(disc);
    const rim = new THREE.Mesh(keep(new THREE.RingGeometry(1, 1.12, 40).rotateX(-Math.PI / 2)), mat(w.frozen ? '#ffffff' : colors.ground2));
    rim.scale.set(w.rx, 1, w.rz);
    rim.position.set(w.x, 0.035, w.z);
    group.add(rim);
  }
  if (layout.river) {
    const r = layout.river;
    const strip = new THREE.Mesh(keep(new THREE.PlaneGeometry(layout.half * 2 + 30, r.w).rotateX(-Math.PI / 2)), r.frozen ? mat('#d8f2ff', 'shiny') : keep(new THREE.MeshPhysicalMaterial({ color: colors.water, roughness: 0.1, transparent: true, opacity: 0.85, clearcoat: 1 })));
    strip.position.set(0, 0.03, r.z);
    group.add(strip);
    const b = layout.bridge;
    if (b && !r.frozen) {
      if (b.stones) {
        for (let i = -1; i <= 1; i++) {
          const st = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.45, 0.5, 0.2, 10)), mat(colors.rock));
          st.position.set(b.x, 0.1, r.z + i * 0.9);
          group.add(st);
        }
      } else {
        const deck = new THREE.Mesh(keep(new THREE.BoxGeometry(b.w, 0.2, r.w + 1.4)), mat('#9c6a3c'));
        deck.position.set(b.x, 0.15, r.z);
        deck.castShadow = deck.receiveShadow = true;
        group.add(deck);
      }
    }
  }
  for (const h of layout.hazards) {
    const lava = new THREE.Mesh(keep(new THREE.CircleGeometry(h.r, 24).rotateX(-Math.PI / 2)), mat('#ff6a1a', 'glow'));
    lava.position.set(h.x, 0.04, h.z);
    group.add(lava);
  }

  // Decorations: one InstancedMesh per part, for all of a kind.
  const items = [...layout.solids, ...layout.decor];
  const byKind = new Map();
  for (const it of items) (byKind.get(it.kind) ?? byKind.set(it.kind, []).get(it.kind)).push(it);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const instanced = (geo, material, list, place) => {
    const mesh = new THREE.InstancedMesh(keep(geo), material, list.length);
    list.forEach((it, i) => {
      const { y = 0, sx = 1, sy = 1, sz = 1 } = place(it);
      q.setFromAxisAngle(up, it.rot ?? 0);
      m4.compose(new THREE.Vector3(it.x, y, it.z), q, new THREE.Vector3(sx * it.s, sy * it.s, sz * it.s));
      mesh.setMatrixAt(i, m4);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const snow = map.biome === 'snow';
  for (const [kind, list] of byKind) {
    switch (kind) {
      case 'trees': {
        const pine = snow || map.biome === 'forest' || map.biome === 'castle';
        const palm = map.biome === 'beach' || map.biome === 'desert';
        instanced(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 7), mat(colors.trunk), list, () => ({ y: 0.6 }));
        if (pine) {
          instanced(new THREE.ConeGeometry(0.9, 1.6, 8), mat(colors.leaf), list, () => ({ y: 1.6 }));
          instanced(new THREE.ConeGeometry(0.65, 1.2, 8), mat(snow ? '#f4f8ff' : colors.leaf), list, () => ({ y: 2.3 }));
        } else if (palm) {
          instanced(new THREE.SphereGeometry(0.8, 8, 4, 0, Math.PI * 2, 0, Math.PI / 3), mat(colors.leaf), list, () => ({ y: 1.25, sy: 0.6 }));
        } else {
          instanced(new THREE.IcosahedronGeometry(0.9, 1), mat(colors.leaf), list, () => ({ y: 1.7 }));
        }
        break;
      }
      case 'rocks':
        instanced(new THREE.DodecahedronGeometry(0.6, 0), mat(colors.rock), list, (it) => ({ y: 0.25, sy: 0.6 + it.v * 0.3 }));
        break;
      case 'ruins':
        instanced(new THREE.CylinderGeometry(0.35, 0.4, 2, 8), mat(colors.rock), list, (it) => ({ y: 1 - it.v * 0.6, sy: 0.5 + it.v }));
        break;
      case 'flowers':
        instanced(new THREE.SphereGeometry(0.1, 6, 4), mat(['#ff8ac0', '#ffe24a', '#ffffff', '#a88aff'][Math.floor(list[0].v * 4)]), list, () => ({ y: 0.18 }));
        instanced(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 4), mat('#3a8a3a'), list, () => ({ y: 0.09 }));
        break;
      case 'village':
        instanced(new THREE.BoxGeometry(2.4, 1.6, 2), mat(tint('#f4e2c0', palette)), list, () => ({ y: 0.8 }));
        instanced(new THREE.ConeGeometry(1.9, 1.1, 4), mat(tint('#c8483e', palette)), list, () => ({ y: 2.15 }));
        break;
      case 'crystals':
        instanced(new THREE.OctahedronGeometry(0.4, 0), mat(map.biome === 'lava' ? '#ff8a3a' : '#8ae8ff', 'glow'), list, () => ({ y: 0.5, sy: 1.8 }));
        break;
      case 'mushrooms':
        instanced(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 6), mat('#f4eeda'), list, () => ({ y: 0.2 }));
        instanced(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e8483e'), list, () => ({ y: 0.38 }));
        break;
      case 'cactus':
        instanced(new THREE.CapsuleGeometry(0.22, 1, 4, 8), mat('#4a9a4a'), list, () => ({ y: 0.7 }));
        break;
      case 'snowmen':
        instanced(new THREE.SphereGeometry(0.5, 14, 10), mat('#ffffff'), list, () => ({ y: 0.45 }));
        instanced(new THREE.SphereGeometry(0.34, 14, 10), mat('#ffffff'), list, () => ({ y: 1.1 }));
        break;
      case 'towers':
        instanced(new THREE.CylinderGeometry(1.1, 1.3, 5, 10), mat(colors.rock), list, () => ({ y: 2.5 }));
        instanced(new THREE.ConeGeometry(1.4, 1.6, 10), mat(tint('#4a5d8a', palette)), list, () => ({ y: 5.8 }));
        break;
      case 'hill':
        instanced(new THREE.SphereGeometry(1, 16, 10), mat(colors.ground2), list, (it) => ({ y: -it.r * 0.5, sx: it.r / it.s, sy: (it.r * 0.6) / it.s, sz: it.r / it.s }));
        break;
      default:
        break;
    }
  }

  // The exit door: a glowing arch, dim until it opens.
  const door = new THREE.Group();
  const doorMat = keep(new THREE.MeshStandardMaterial({ color: '#ffe8a0', emissive: '#ffd060', emissiveIntensity: 0.2, transparent: true, opacity: 0.5 }));
  const arch = new THREE.Mesh(keep(new THREE.TorusGeometry(1.1, 0.16, 10, 28, Math.PI)), mat('#c89858'));
  arch.position.y = 1.2;
  door.add(arch);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.16, 0.16, 1.2, 10)), mat('#c89858'));
    post.position.set(s * 1.1, 0.6, 0);
    door.add(post);
  }
  const glow = new THREE.Mesh(keep(new THREE.CircleGeometry(1.0, 28)), doorMat);
  glow.position.y = 1.1;
  glow.scale.y = 1.15;
  door.add(glow);
  door.position.set(layout.exit.x, 0, layout.exit.z);
  if (side) door.rotation.y = 0;
  group.add(door);
  if (look === 'cartoon') {
    arch.geometry.computeBoundingSphere();
    addOutline(arch, 0.04);
  }

  const markers = layout.markers.map((p) => {
    const m = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.5, 0.5, 2.4, 16, 1, true)), keep(new THREE.MeshBasicMaterial({ color: '#8ae8ff', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })));
    m.position.set(p.x, 1.2, p.z);
    group.add(m);
    return m;
  });

  return {
    group,
    door,
    markers,
    openDoor(open) {
      doorMat.emissiveIntensity = open ? 2.2 : 0.2;
      doorMat.opacity = open ? 0.9 : 0.35;
    },
    update(dt, t) {
      glow.rotation.z = t * 0.5;
      for (const m of markers) m.rotation.y = t;
    },
    dispose() {
      for (const d of disposables) d.dispose?.();
      groundTexture?.dispose?.();
    }
  };
}

/* ------------------------------------------------------------------ 2D */

export const PX = 16; // canvas pixels per world unit (full 2D)

/** The whole map painted on one canvas, top-down (full 2D). */
export function paintMap2D(layout, map, { palette = 'bright', pixel = true, look = 'stylized' } = {}) {
  const colors = colorsFor(map, palette);
  const w = layout.half * 2 * PX;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = w;
  const g = c.getContext('2d');
  const toPx = (v) => (v + layout.half) * PX;
  if (pixel) {
    paintGround(g, w, w, ramp(colors.ground), { seed: layout.half });
  } else {
    g.fillStyle = colors.ground;
    g.fillRect(0, 0, w, w);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `${colors.ground2}${look === 'realistic' ? '55' : '33'}`;
      const x = (i * 131) % w;
      const y = (i * 71 + (i % 7) * 37) % w;
      g.beginPath();
      g.ellipse(x, y, 10 + (i % 5) * 8, 6 + (i % 4) * 5, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const outline = look === 'cartoon' ? '#1a1026' : null;
  const blob = (x, y, rx, ry, fill, stroke = outline) => {
    g.beginPath();
    g.ellipse(toPx(x), toPx(y), rx * PX, ry * PX, 0, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
    if (stroke) {
      g.lineWidth = 2;
      g.strokeStyle = stroke;
      g.stroke();
    }
  };
  for (const wtr of layout.water) blob(wtr.x, wtr.z, wtr.rx, wtr.rz, wtr.frozen ? '#d8f2ff' : colors.water, wtr.frozen ? '#ffffff' : outline);
  if (layout.river) {
    g.fillStyle = layout.river.frozen ? '#d8f2ff' : colors.water;
    g.fillRect(0, toPx(layout.river.z - layout.river.w / 2), w, layout.river.w * PX);
    if (layout.bridge && !layout.river.frozen) {
      g.fillStyle = '#9c6a3c';
      g.fillRect(toPx(layout.bridge.x - layout.bridge.w / 2), toPx(layout.river.z - layout.river.w / 2 - 0.6), layout.bridge.w * PX, (layout.river.w + 1.2) * PX);
    }
  }
  for (const h of layout.hazards) blob(h.x, h.z, h.r, h.r, '#ff6a1a', '#ffd060');
  const items = [...layout.solids, ...layout.decor].sort((a, b) => a.z - b.z);
  for (const it of items) {
    if (it.kind === 'hill') continue;
    const s = it.s ?? 1;
    // A soft shadow first, then the thing, lit from the top-left.
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.beginPath();
    g.ellipse(toPx(it.x) + 4, toPx(it.z) + 5, (it.r + 0.2) * PX * s, (it.r + 0.1) * PX * s * 0.7, 0, 0, Math.PI * 2);
    g.fill();
    switch (it.kind) {
      case 'trees':
        blob(it.x, it.z, 0.95 * s, 0.95 * s, map.biome === 'snow' ? '#e8f0f8' : colors.leaf);
        blob(it.x - 0.25 * s, it.z - 0.25 * s, 0.4 * s, 0.4 * s, tint(colors.leaf, 'pastel'), null);
        break;
      case 'rocks':
      case 'ruins':
        blob(it.x, it.z, 0.65 * s, 0.5 * s, colors.rock);
        break;
      case 'flowers':
        blob(it.x, it.z, 0.12, 0.12, ['#ff8ac0', '#ffe24a', '#ffffff', '#a88aff'][Math.floor(it.v * 4)], null);
        break;
      case 'village':
        g.fillStyle = tint('#c8483e', palette);
        g.fillRect(toPx(it.x - 1.2), toPx(it.z - 1), 2.4 * PX, 2 * PX);
        if (outline) g.strokeRect(toPx(it.x - 1.2), toPx(it.z - 1), 2.4 * PX, 2 * PX);
        break;
      case 'crystals':
        blob(it.x, it.z, 0.35, 0.5, '#8ae8ff');
        break;
      case 'mushrooms':
        blob(it.x, it.z, 0.3, 0.3, '#e8483e');
        break;
      case 'cactus':
        blob(it.x, it.z, 0.3, 0.3, '#4a9a4a');
        break;
      case 'snowmen':
        blob(it.x, it.z, 0.5, 0.5, '#ffffff');
        break;
      case 'towers':
        blob(it.x, it.z, 1.2, 1.2, colors.rock);
        blob(it.x, it.z, 0.8, 0.8, tint('#4a5d8a', palette));
        break;
      default:
        break;
    }
  }
  return c;
}

/* --------------------------------------------------------------- backdrop */

/**
 * The painted side view's layers, far to near: [{ canvas, depth, height }] — each a strip of
 * silhouettes in the biome's colours, softer and bluer with distance (aerial perspective).
 */
export function paintBackdrop(map, { palette = 'bright', look = 'cartoon', width = 2048 } = {}) {
  const colors = colorsFor(map, palette);
  const rnd = (() => {
    let s = 7;
    for (const ch of map.id) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  })();
  const layer = (h, color, shape, depth, haze) => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = h;
    const g = c.getContext('2d');
    const fill = new THREE.Color(color).lerp(new THREE.Color(colors.sky[1]), haze);
    g.fillStyle = `#${fill.getHexString()}`;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= width; x += 8) g.lineTo(x, shape(x));
    g.lineTo(width, h);
    g.closePath();
    g.fill();
    if (look === 'cartoon') {
      g.strokeStyle = 'rgba(26,16,38,0.6)';
      g.lineWidth = 3;
      g.stroke();
    }
    return { canvas: c, depth, height: h };
  };
  const peaks = Array.from({ length: 12 }, () => [rnd() * width, 60 + rnd() * 120]);
  const far = layer(400, colors.far, (x) => 400 - Math.max(...peaks.map(([px, ph]) => Math.max(0, ph * 1.6 - Math.abs(x - px) * 0.6))) - 30, 60, 0.55);
  const mid = layer(300, colors.ground2, (x) => 300 - 60 - Math.sin(x * 0.006 + 1) * 30 - Math.sin(x * 0.017) * 14 - (map.features.includes('trees') ? Math.max(0, Math.sin(x * 0.09)) * 30 : 0), 30, 0.3);
  const near = layer(200, colors.leaf, (x) => 200 - 40 - Math.abs(Math.sin(x * 0.03)) * 26 - Math.sin(x * 0.011) * 10, 16, 0.08);
  return [far, mid, near];
}
