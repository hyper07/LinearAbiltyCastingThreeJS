/**
 * A plan (src/shared/apartment/plan.js) as a cut-away 3D building at night.
 *
 * The proof of knowledge/apartment-study.md §5–§7: every level is built once and kept; the active
 * level shows its interior with walls cut at `cut` metres, the levels below show a closed shell
 * with lit windows, the ones above are hidden. Walls are one InstancedMesh per level (one unit box,
 * a matrix and a colour per piece), furniture one more, glowing lamps one more, so a whole floor is
 * a handful of draw calls. Plan [x, y] → three (x, elevation, y).
 */
import * as THREE from 'three';
import { bbox, centroid, outwardNormal, pointAlong, wallPieces } from './plan.js';

const FLOOR_COLORS = {
  living: '#c79c6c',
  bedroom: '#cda477',
  kitchen: '#d9d2c7',
  bath: '#cdd5d9',
  balcony: '#8d8882',
  corridor: '#5f6168',
  lobby: '#6c6e74',
  stair: '#7d7f84',
  elevator: '#4f5258'
};
const WALL_COLORS = { exterior: '#ebe6de', corridor: '#efebe5', party: '#f2eee8', partition: '#f6f3ee', core: '#e4e0d9', railing: '#3c4048' };
const GLOW_KINDS = new Set(['lamp']);

const unitBox = new THREE.BoxGeometry(1, 1, 1);

/** A soft round light pool (additive), drawn on floors under lamps and street lights. */
function poolTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Plan polygon → a flat floor mesh at height y (ShapeGeometry in XY, turned to lie in XZ). */
function floorMesh(polygon, material, y) {
  const shape = new THREE.Shape(polygon.map(([x, py]) => new THREE.Vector2(x, -py)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Boxes for one piece of furniture: { x, y (plan), z (bottom), sx, sy (plan sizes), sz, color }.
 * `face` puts a sofa's back, a bed's head, a TV's screen on the right side.
 */
function furnitureBoxes(f) {
  const out = [];
  const box = (x, y, z, sx, sy, sz, color) => out.push({ x, y, z, sx, sy, sz, color });
  const z0 = f.y0 ?? 0;
  const [fx, fy] = f.face ?? [0, 0];
  // A strip `t` thick on the back side (opposite the face), full width across.
  const back = (t, z, h, color) => {
    if (fx) box(f.x - fx * (f.w / 2 - t / 2), f.y, z, t, f.d, h, color);
    else if (fy) box(f.x, f.y - fy * (f.d / 2 - t / 2), z, f.w, t, h, color);
  };
  switch (f.kind) {
    case 'sofa':
      box(f.x, f.y, z0, f.w, f.d, f.h * 0.5, f.color);
      back(0.22, z0, f.h, f.color);
      break;
    case 'bed': {
      box(f.x, f.y, z0, f.w, f.d, f.h, f.color);
      back(0.08, z0, 0.95, '#8a6a4c');
      // Pillows near the head.
      const px = fx ? f.x - fx * (f.w / 2 - 0.35) : f.x;
      const py = fy ? f.y - fy * (f.d / 2 - 0.35) : f.y;
      box(px, py, z0 + f.h, fx ? 0.35 : f.w * 0.8, fx ? f.d * 0.8 : 0.35, 0.1, '#fbfaf7');
      break;
    }
    case 'table':
    case 'coffee':
    case 'sidetable':
      box(f.x, f.y, z0 + f.h - 0.04, f.w, f.d, 0.04, f.color);
      box(f.x, f.y, z0, Math.min(f.w, f.d) * 0.25, Math.min(f.w, f.d) * 0.25, f.h - 0.04, '#4a3a2c');
      break;
    case 'chair':
      box(f.x, f.y, z0, f.w, f.d, 0.45, f.color);
      back(0.08, z0, f.h, f.color);
      break;
    case 'tv':
      box(f.x, f.y, z0, f.w, f.d, f.h, '#6b5340');
      back(0.05, z0 + f.h, 0.62, '#111317');
      break;
    case 'counter':
      box(f.x, f.y, z0, f.w, f.d, f.h - 0.03, '#f1eee9');
      box(f.x, f.y, z0 + f.h - 0.03, f.w, f.d, 0.03, '#8c8f94');
      break;
    case 'plant':
      box(f.x, f.y, z0, f.w * 0.7, f.d * 0.7, 0.35, '#b9a48a');
      box(f.x, f.y, z0 + 0.35, f.w, f.d, f.h - 0.35, f.color);
      break;
    default:
      box(f.x, f.y, z0, f.w, f.d, f.h, f.color);
  }
  return out;
}

function instancedBoxes(boxes, material) {
  const mesh = new THREE.InstancedMesh(unitBox, material, Math.max(1, boxes.length));
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  boxes.forEach((b, i) => {
    m.makeScale(b.sx, b.sz, b.sy);
    m.setPosition(b.x, b.z + b.sz / 2, b.y);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, c.set(b.color));
  });
  mesh.count = boxes.length;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Build the whole building. Returns the view: its group, and the calls the page drives it with.
 * `opts.cut` is the section height (1.2 m like an architect's plan cut); `opts.seed` picks lit windows.
 */
export function createApartmentView(plan, { cut = 1.2, seed = 3 } = {}) {
  const group = new THREE.Group();
  group.name = 'apartment';
  const pool = poolTexture();
  const fp = bbox(plan.footprint);
  const top = plan.levels.at(-1);
  const floorToFloor = plan.levels.length > 1 ? plan.levels[1].elevation - plan.levels[0].elevation : 3;
  let rand = seed >>> 0;
  const random = () => ((rand = (rand * 1664525 + 1013904223) >>> 0) / 4294967296);

  const wallMat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  const furnMat = new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0 });
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ffe0b0' });
  const slabMat = new THREE.MeshStandardMaterial({ color: '#2e323b', roughness: 0.95 });
  const shellMat = new THREE.MeshStandardMaterial({ color: '#1c2130', roughness: 0.85 });
  const windowMat = new THREE.MeshBasicMaterial({ toneMapped: true });
  // Seen from below its back face gets little light, so it glows a touch, like a lamp-lit ceiling.
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#f3efe8', roughness: 0.95, side: THREE.DoubleSide, emissive: '#6b5a44', emissiveIntensity: 0.6 });
  const poolMat = new THREE.MeshBasicMaterial({ map: pool, color: '#ffb46a', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });

  const levels = new Map();
  for (const level of plan.levels) {
    const lg = new THREE.Group();
    lg.name = level.id;
    lg.position.y = level.elevation;
    group.add(lg);
    const interior = new THREE.Group();
    const shell = new THREE.Group();
    const ceiling = new THREE.Group();
    lg.add(interior, shell, ceiling);
    ceiling.visible = false;

    // Slab under the level.
    const slab = new THREE.Mesh(unitBox, slabMat);
    slab.scale.set(fp.w + 0.3, level.slab, fp.d + 0.3);
    slab.position.set(fp.x0 + fp.w / 2, -level.slab / 2, fp.y0 + fp.d / 2);
    slab.receiveShadow = true;
    interior.add(slab);

    // Floors, one material each so a unit can be lit up when picked.
    const floors = [];
    for (const r of plan.rooms.filter((q) => q.level === level.id)) {
      const mat = new THREE.MeshStandardMaterial({ color: FLOOR_COLORS[r.kind] ?? '#bfb6aa', roughness: r.kind === 'bath' ? 0.4 : 0.75, emissive: '#ffb066', emissiveIntensity: 0 });
      const mesh = floorMesh(r.polygon, mat, 0.005);
      mesh.userData = { room: r.id, unit: r.unit, kind: r.kind };
      interior.add(mesh);
      floors.push(mesh);
      ceiling.add(floorMesh(r.polygon, ceilMat, level.height - 0.01));
      // A warm pool of light in lived-in rooms.
      if (r.unit && (r.kind === 'living' || r.kind === 'bedroom' || r.kind === 'kitchen')) {
        const b = bbox(r.polygon);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), poolMat);
        p.rotation.x = -Math.PI / 2;
        p.scale.set(b.w * 1.1, b.d * 1.1, 1);
        p.position.set(b.x0 + b.w / 2, 0.02, b.y0 + b.d / 2);
        p.renderOrder = 2;
        interior.add(p);
      }
    }

    // Walls: one instanced box per piece; the count changes with the cut (lintels go first).
    const walls = plan.walls.filter((w) => w.level === level.id);
    const maxPieces = walls.reduce((s, w) => s + wallPieces(w, level.height).length, 0);
    const wallMesh = new THREE.InstancedMesh(unitBox, wallMat, Math.max(1, maxPieces));
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    interior.add(wallMesh);
    const writeWalls = (h) => {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      const p = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      const c = new THREE.Color();
      let i = 0;
      for (const w of walls) {
        for (const piece of wallPieces(w, level.height, w.kind === 'railing' ? Infinity : h)) {
          // Plan rotation r about the vertical: a plan direction (cos r, sin r) is three (cos r, 0, sin r) → angle −r about +y.
          q.setFromAxisAngle(up, -piece.rot);
          s.set(piece.len, piece.h, piece.thick);
          p.set(piece.x, piece.z + piece.h / 2, piece.y);
          wallMesh.setMatrixAt(i, m.compose(p, q, s));
          wallMesh.setColorAt(i, c.set(WALL_COLORS[w.kind] ?? '#eeeae4'));
          i++;
        }
      }
      wallMesh.count = i;
      wallMesh.instanceMatrix.needsUpdate = true;
      if (wallMesh.instanceColor) wallMesh.instanceColor.needsUpdate = true;
      wallMesh.computeBoundingSphere();
    };
    writeWalls(cut);

    // Furniture and lamps.
    const furn = plan.furniture.filter((f) => f.level === level.id);
    const solid = [];
    const glow = [];
    for (const f of furn) {
      if (GLOW_KINDS.has(f.kind)) {
        // A floor lamp: a thin pole and a glowing shade; a table lamp: just the shade.
        const z0 = f.y0 ?? 0;
        if (f.h > 1) solid.push({ x: f.x, y: f.y, z: z0, sx: 0.04, sy: 0.04, sz: f.h - 0.3, color: '#2b2b2b' });
        glow.push({ x: f.x, y: f.y, z: z0 + Math.max(0, f.h - 0.3), sx: f.w, sy: f.d, sz: 0.3, color: f.color });
      } else solid.push(...furnitureBoxes(f));
    }
    const furnMesh = instancedBoxes(solid, furnMat);
    interior.add(furnMesh);
    const glowMesh = instancedBoxes(glow, glowMat);
    glowMesh.castShadow = false;
    interior.add(glowMesh);

    // The closed shell for when this level is below the one you look at: a dark box, lit windows, balcony slabs.
    const box = new THREE.Mesh(unitBox, shellMat);
    box.scale.set(fp.w + 0.25, floorToFloor - 0.02, fp.d + 0.25);
    box.position.set(fp.x0 + fp.w / 2, (floorToFloor - 0.02) / 2 - level.slab, fp.y0 + fp.d / 2);
    box.castShadow = true;
    box.receiveShadow = true;
    shell.add(box);
    const panes = [];
    const centre = [fp.x0 + fp.w / 2, fp.y0 + fp.d / 2];
    for (const w of walls.filter((q) => q.kind === 'exterior')) {
      const n = outwardNormal(w, centre);
      const rot = Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]);
      for (const o of w.openings) {
        const [x, y] = pointAlong(w, o.at);
        const lit = random() < 0.68;
        const warm = ['#ffcf8a', '#ffd9a0', '#ffc27a', '#fff0d0'][Math.floor(random() * 4)];
        panes.push({ x: x + n[0] * 0.14, y: y + n[1] * 0.14, z: o.sill, len: o.width, h: o.head - o.sill, rot, color: lit ? warm : '#1a2131' });
      }
    }
    const paneMesh = new THREE.InstancedMesh(unitBox, windowMat, Math.max(1, panes.length));
    {
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const c = new THREE.Color();
      panes.forEach((p, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -p.rot);
        paneMesh.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, p.z + p.h / 2, p.y), q, new THREE.Vector3(p.len, p.h, 0.02)));
        paneMesh.setColorAt(i, c.set(p.color));
      });
      paneMesh.count = panes.length;
    }
    shell.add(paneMesh);
    const balconies = plan.rooms.filter((r) => r.level === level.id && r.kind === 'balcony');
    for (const r of balconies) {
      const b = bbox(r.polygon);
      const s1 = new THREE.Mesh(unitBox, slabMat);
      s1.scale.set(b.w, 0.18, b.d);
      s1.position.set(b.x0 + b.w / 2, -0.09, b.y0 + b.d / 2);
      const rail = new THREE.Mesh(unitBox, shellMat);
      rail.scale.set(b.w, 1.0, b.d);
      rail.position.set(b.x0 + b.w / 2, 0.5, b.y0 + b.d / 2);
      shell.add(s1, rail);
    }

    levels.set(level.id, { level, group: lg, interior, shell, ceiling, floors, writeWalls, enter: 0 });
  }

  // The roof: a slab and a parapet over the top level, a few rooftop boxes, shown when no level is open.
  const roof = new THREE.Group();
  {
    const y = top.elevation + floorToFloor - top.slab;
    const r = new THREE.Mesh(unitBox, slabMat);
    r.scale.set(fp.w + 0.3, 0.3, fp.d + 0.3);
    r.position.set(fp.x0 + fp.w / 2, y + 0.15, fp.y0 + fp.d / 2);
    r.receiveShadow = true;
    roof.add(r);
    const parapet = new THREE.MeshStandardMaterial({ color: '#3a3f4a', roughness: 0.9 });
    for (const [sx, sz, px, pz] of [
      [fp.w + 0.3, 0.2, fp.x0 + fp.w / 2, fp.y0 - 0.05],
      [fp.w + 0.3, 0.2, fp.x0 + fp.w / 2, fp.y0 + fp.d + 0.05],
      [0.2, fp.d + 0.3, fp.x0 - 0.05, fp.y0 + fp.d / 2],
      [0.2, fp.d + 0.3, fp.x0 + fp.w + 0.05, fp.y0 + fp.d / 2]
    ]) {
      const p = new THREE.Mesh(unitBox, parapet);
      p.scale.set(sx, 1.0, sz);
      p.position.set(px, y + 0.8, pz);
      roof.add(p);
    }
    const kit = [
      [fp.x0 + fp.w * 0.5, fp.y0 + 4, 6.4, 3.2, 3.0, '#4a4f5a'], // stair and lift overrun
      [fp.x0 + fp.w * 0.2, fp.y0 + fp.d * 0.6, 2.2, 1.4, 1.2, '#5b616c'], // plant units
      [fp.x0 + fp.w * 0.8, fp.y0 + fp.d * 0.6, 2.2, 1.4, 1.2, '#5b616c'],
      [fp.x0 + fp.w * 0.5, fp.y0 + fp.d * 0.75, 8, 3, 0.4, '#3f5b3a'] // a planted terrace
    ];
    for (const [x, z, sx, sz, h, color] of kit) {
      const k = new THREE.Mesh(unitBox, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
      k.scale.set(sx, h, sz);
      k.position.set(x, y + 0.3 + h / 2, z);
      k.castShadow = true;
      roof.add(k);
    }
  }
  group.add(roof);

  // Ground, a street on the south side, pavements, street lamps with pools of light.
  const ground = new THREE.Group();
  {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: '#141922', roughness: 1 }));
    g.rotation.x = -Math.PI / 2;
    g.position.set(fp.x0 + fp.w / 2, -plan.levels[0].slab - 0.02, fp.y0 + fp.d / 2);
    g.receiveShadow = true;
    ground.add(g);
    const roadY = fp.y0 + fp.d + 9;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(600, 9), new THREE.MeshStandardMaterial({ color: '#1b1f27', roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(fp.x0 + fp.w / 2, g.position.y + 0.01, roadY);
    ground.add(road);
    const dashes = [];
    for (let x = -120; x < 160; x += 6) dashes.push({ x, y: roadY, z: g.position.y + 0.015, sx: 3, sy: 0.15, sz: 0.01, color: '#cfd3da' });
    const lamps = [];
    for (let x = fp.x0 - 30; x < fp.x0 + fp.w + 30; x += 14) {
      dashes.push({ x, y: roadY - 5.2, z: g.position.y, sx: 0.12, sy: 0.12, sz: 6, color: '#30343c' });
      lamps.push({ x, y: roadY - 4.6, z: g.position.y + 5.8, sx: 0.5, sy: 0.9, sz: 0.15, color: '#fff1d2' });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), poolMat);
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, g.position.y + 0.03, roadY - 3);
      ground.add(p);
    }
    ground.add(instancedBoxes(dashes, furnMat), instancedBoxes(lamps, glowMat));
  }
  group.add(ground);

  // Light: a dark blue night with a warm key from above standing in for the room lights.
  const hemi = new THREE.HemisphereLight('#33466e', '#0a0d14', 0.9);
  const key = new THREE.DirectionalLight('#ffd6a0', 2.2);
  key.position.set(fp.x0 + fp.w * 0.35, 40, fp.y0 + fp.d * 0.5 + 14);
  key.target.position.set(fp.x0 + fp.w / 2, 0, fp.y0 + fp.d / 2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const half = Math.max(fp.w, fp.d) * 0.62;
  Object.assign(key.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 120 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const moon = new THREE.DirectionalLight('#8aa2d6', 0.35);
  moon.position.set(fp.x0 - 30, 50, fp.y0 - 40);
  group.add(hemi, key, key.target, moon);

  let active = plan.levels[0].id;
  let mode = 'floor';
  let cutNow = cut;

  /** Show one level cut open ('floor'), or the closed building from above ('rooftop') or the street ('street'). */
  function setLevel(id, nextMode = 'floor') {
    mode = nextMode;
    if (id) active = id;
    const idx = plan.levels.findIndex((l) => l.id === active);
    for (const [, L] of levels) {
      const i = L.level.index;
      if (mode !== 'floor') {
        L.group.visible = true;
        L.interior.visible = false;
        L.shell.visible = true;
      } else {
        L.group.visible = i <= idx;
        L.interior.visible = i === idx;
        L.shell.visible = i < idx;
        if (i === idx) L.enter = 1;
      }
    }
    roof.visible = mode !== 'floor';
    // Keep the warm key's shadows on the open level.
    const L = levels.get(active);
    key.target.position.y = mode === 'floor' ? L.level.elevation : 0;
    key.position.y = key.target.position.y + 40;
  }

  function setCut(h) {
    cutNow = h;
    for (const [, L] of levels) L.writeWalls(h);
  }

  function highlight(unitId) {
    for (const [, L] of levels) for (const f of L.floors) f.material.emissiveIntensity = unitId && f.userData.unit === unitId ? 0.35 : 0;
  }

  const unitOf = (unitId) => plan.units.find((u) => u.id === unitId);

  /** Where a unit's pin sits: above its centre, just over the cut walls. */
  function unitAnchor(unitId, out = new THREE.Vector3()) {
    const u = unitOf(unitId);
    const L = levels.get(u.level);
    const [x, y] = centroid(u.outline);
    return out.set(x, L.group.position.y + cutNow + 0.9, y);
  }

  function unitBounds(unitId) {
    const u = unitOf(unitId);
    const b = bbox(u.outline);
    const e = levels.get(u.level).level.elevation;
    return { center: new THREE.Vector3(b.x0 + b.w / 2, e, b.y0 + b.d / 2), size: new THREE.Vector3(b.w, 3, b.d) };
  }

  /** Eye-height viewpoints in a unit's main rooms, for the photo strip on its card. */
  function interiorShots(unitId) {
    const u = unitOf(unitId);
    const e = levels.get(u.level).level.elevation;
    const shots = [];
    for (const r of plan.rooms.filter((q) => q.unit === unitId && (q.kind === 'living' || q.kind === 'bedroom' || q.kind === 'kitchen'))) {
      const b = bbox(r.polygon);
      // From the inner corner on the corridor side, looking at the far corner by the window.
      const facade = u.outline.some(([, y]) => y < 1) ? -1 : 1; // north row units have their façade at small y
      const yFrom = facade < 0 ? b.y0 + b.d - 0.35 : b.y0 + 0.35;
      const yTo = facade < 0 ? b.y0 + 0.3 : b.y0 + b.d - 0.3;
      shots.push({ title: r.name.en, position: new THREE.Vector3(b.x0 + 0.35, e + 1.45, yFrom), target: new THREE.Vector3(b.x0 + b.w - 0.4, e + 1.0, yTo) });
    }
    return shots.slice(0, 3);
  }

  /** Run `fn` with the active level's walls at full height and its ceiling on (for interior shots). */
  function withFullHeight(fn) {
    const L = levels.get(active);
    L.writeWalls(Infinity);
    L.ceiling.visible = true;
    try {
      return fn();
    } finally {
      L.ceiling.visible = false;
      L.writeWalls(cutNow);
    }
  }

  /** Ease the newly opened level down into place. */
  function update(dt) {
    for (const [, L] of levels) {
      if (L.enter > 0) {
        L.enter = Math.max(0, L.enter - dt / 0.35);
        const t = L.enter * L.enter;
        L.group.position.y = L.level.elevation + t * 1.6;
      }
    }
  }

  setLevel(active, 'floor');
  const bounds = new THREE.Box3(new THREE.Vector3(fp.x0, 0, fp.y0), new THREE.Vector3(fp.x0 + fp.w, top.elevation + floorToFloor, fp.y0 + fp.d));
  return {
    group,
    plan,
    bounds,
    lights: { hemi, key, moon },
    setLevel,
    setCut,
    highlight,
    unitAnchor,
    unitBounds,
    interiorShots,
    withFullHeight,
    update,
    get active() {
      return active;
    },
    get mode() {
      return mode;
    }
  };
}
