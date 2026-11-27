/**
 * Where everything on a map goes — pure and seeded, so a map looks the same every time it
 * loads and in every render style (the 2D painter, the 3D world and the painted side view all
 * read this). No three.js here; the tests run it.
 *
 *   layoutMap(map, { goal, side })  → { kind, half, length, depth, start, exit, solids, water,
 *                                       hazards, decor, collectibles, spawns, markers, props }
 */
const SIZE = { small: 14, medium: 20, large: 28 };
const LENGTH = { small: 50, medium: 80, large: 120 };

export function seeded(text) {
  let h = 2166136261;
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many of each decoration a map of this size gets. */
const DENSITY = { trees: 30, rocks: 14, ruins: 6, flowers: 50, village: 5, crystals: 12, mushrooms: 16, cactus: 14, snowmen: 4, 'lava-pools': 4, towers: 3 };
/** Decorations you cannot walk through, with their radius; low ones can be jumped. */
const SOLID = { trees: [0.6, false], rocks: [0.7, true], ruins: [0.6, false], village: [1.8, false], crystals: [0.5, true], cactus: [0.45, false], snowmen: [0.55, false], towers: [1.4, false], mushrooms: [0.4, true] };

/**
 * @param {object} map      a map from maps.json
 * @param {{ goal?: string, side?: boolean, scale?: number }} [options]  side: the painted side view (a long lane)
 */
export function layoutMap(map, { goal = 'collect', side = false } = {}) {
  const rnd = seeded(`${map.id}:${map.biome}:${map.size}`);
  const half = SIZE[map.size] ?? SIZE.medium;
  const length = LENGTH[map.size] ?? LENGTH.medium;
  const depth = 2.2;
  const area = side ? { x0: -length / 2, x1: length / 2, z0: -depth, z1: depth } : { x0: -half, x1: half, z0: -half, z1: half };
  const scale = side ? length / 80 : (half * half) / 400;
  const start = side ? { x: area.x0 + 3, z: 0 } : { x: 0, z: half - 3 };
  const exit = side ? { x: area.x1 - 3, z: 0 } : { x: 0, z: -half + 3 };
  const out = { kind: side ? 'side' : 'square', half, length, depth, area, start, exit, solids: [], water: [], hazards: [], decor: [], collectibles: [], spawns: [], markers: [], props: [], river: null, bridge: null };
  const span = (a, b) => a + rnd() * (b - a);
  const clear = (x, z, r) =>
    Math.hypot(x - start.x, z - start.z) > 3 + r &&
    Math.hypot(x - exit.x, z - exit.z) > 3 + r &&
    !out.water.some((w) => !w.frozen && ((x - w.x) / (w.rx + r)) ** 2 + ((z - w.z) / (w.rz + r)) ** 2 < 1) &&
    !out.solids.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + r) &&
    !out.hazards.some((h) => Math.hypot(x - h.x, z - h.z) < h.r + r) &&
    !(out.river && !out.bridge?.covers?.(x) && Math.abs(z - out.river.z) < out.river.w / 2 + r);
  /** A free spot, or null after a few tries. `lane` keeps it on the walkable strip (side view). */
  const spot = (r, { lane = true, edge = false } = {}) => {
    for (let i = 0; i < 40; i++) {
      const x = span(area.x0 + 1, area.x1 - 1);
      const z = side ? (lane ? span(-depth + 0.4, depth - 0.4) : span(-14, -depth - 1)) : edge ? (rnd() < 0.5 ? -1 : 1) * span(half - 3, half - 0.5) : span(area.z0 + 1, area.z1 - 1);
      if (!side || lane ? clear(x, z, r) : true) return { x, z };
    }
    return null;
  };

  const features = new Set(map.features ?? []);
  if (features.has('bridge') && !features.has('river')) features.add('river');
  // Water first (everything else avoids it).
  for (const f of ['lake', 'frozen-lake']) {
    if (!features.has(f)) continue;
    const rx = side ? span(4, 7) : span(3, 5) * Math.sqrt(scale) + 1;
    const rz = side ? 1.2 : rx * span(0.6, 0.9);
    const at = side ? { x: span(area.x0 + 12, area.x1 - 12), z: -depth - 1.6 } : { x: span(-half * 0.5, half * 0.5), z: span(-half * 0.3, half * 0.3) };
    out.water.push({ x: at.x, z: at.z, rx, rz, frozen: f === 'frozen-lake' || map.biome === 'snow' && f === 'lake' && map.weather === 'snow' });
  }
  if (features.has('river') && !side) {
    out.river = { z: span(-half * 0.3, half * 0.2), w: 2.6, frozen: map.biome === 'snow' };
    out.bridge = { x: span(-half * 0.4, half * 0.4), w: 3 };
    const b = out.bridge;
    b.covers = (x) => Math.abs(x - b.x) < b.w / 2;
    if (!features.has('bridge')) {
      // A river with no bridge still needs a way across: a row of stepping stones.
      b.stones = true;
    }
  }
  if (features.has('lava-pools')) {
    for (let i = 0; i < Math.round(DENSITY['lava-pools'] * scale) + 1; i++) {
      const p = spot(1.4);
      if (p) out.hazards.push({ ...p, r: span(1, 1.6), kind: 'lava' });
    }
  }
  if (features.has('hills') && !side) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + rnd() * 0.3;
      out.decor.push({ kind: 'hill', x: Math.cos(a) * (half + 4), z: Math.sin(a) * (half + 4), r: span(5, 9), s: 1, rot: 0, v: 0 });
    }
  }
  for (const f of Object.keys(DENSITY)) {
    if (!features.has(f) || f === 'lava-pools') continue;
    const n = Math.max(1, Math.round(DENSITY[f] * scale));
    for (let i = 0; i < n; i++) {
      const solid = SOLID[f];
      const background = side && (f === 'trees' || f === 'village' || f === 'towers' || rnd() < 0.5);
      const p = spot(solid ? solid[0] : 0.2, { lane: !background });
      if (!p) continue;
      const item = { kind: f, x: p.x, z: p.z, r: solid ? solid[0] : 0.2, low: solid ? solid[1] : true, rot: rnd() * Math.PI * 2, s: span(0.8, 1.3), v: rnd() };
      if (solid && !background) out.solids.push(item);
      else out.decor.push(item);
    }
  }
  // A ring of the biome's own trees or rocks around the edge, so the map's end looks like land.
  if (!side) {
    const ringKind = ['cave', 'castle', 'lava', 'space', 'city', 'desert'].includes(map.biome) ? 'rocks' : map.biome === 'candy' ? 'crystals' : 'trees';
    const n = Math.round(half * 2.4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const d = half + 1.2 + rnd() * 1.5;
      out.decor.push({ kind: ringKind, x: Math.cos(a) * d, z: Math.sin(a) * d, r: 0.8, rot: rnd() * 6, s: span(1, 1.6), v: rnd(), edge: true });
    }
  }
  const collectibleCount = Math.min(60, map.collectibles ?? 0);
  for (let i = 0; i < collectibleCount; i++) {
    const p = spot(0.4);
    if (p) out.collectibles.push(p);
  }
  for (const s of map.spawns ?? []) {
    for (let i = 0; i < s.count; i++) {
      let p = null;
      for (let k = 0; k < 6 && !p; k++) {
        const q = spot(0.6);
        if (q && Math.hypot(q.x - start.x, q.z - start.z) > (side ? 12 : 7)) p = q;
      }
      if (p) out.spawns.push({ cast: s.cast, x: p.x, z: p.z });
    }
  }
  if (goal === 'explore') {
    for (let i = 0; i < 3; i++) {
      const p = spot(0.8);
      if (p) out.markers.push(p);
    }
  }
  for (const prop of map.props ?? []) {
    for (let i = 0; i < prop.count; i++) {
      const p = spot(0.8, { lane: !side || rnd() < 0.3 });
      if (p) out.props.push({ asset: prop.asset, x: p.x, z: p.z, rot: rnd() * Math.PI * 2, s: span(0.9, 1.2) });
    }
  }
  return out;
}

/** Push a circle at (x, z) radius r out of the map's solid things; returns the corrected spot. */
export function collide(layout, x, z, r, { jumping = false } = {}) {
  const a = layout.area;
  x = Math.max(a.x0 + r, Math.min(a.x1 - r, x));
  z = Math.max(a.z0 + r, Math.min(a.z1 - r, z));
  for (const s of layout.solids) {
    if (jumping && s.low) continue;
    const dx = x - s.x;
    const dz = z - s.z;
    const d = Math.hypot(dx, dz);
    const min = s.r + r;
    if (d < min && d > 1e-6) {
      x = s.x + (dx / d) * min;
      z = s.z + (dz / d) * min;
    }
  }
  for (const w of layout.water) {
    if (w.frozen) continue;
    const k = ((x - w.x) / (w.rx + r)) ** 2 + ((z - w.z) / (w.rz + r)) ** 2;
    if (k < 1) {
      const ang = Math.atan2((z - w.z) / (w.rz + r), (x - w.x) / (w.rx + r));
      x = w.x + Math.cos(ang) * (w.rx + r);
      z = w.z + Math.sin(ang) * (w.rz + r);
    }
  }
  const river = layout.river;
  if (river && !river.frozen && Math.abs(z - river.z) < river.w / 2 + r && !(layout.bridge && Math.abs(x - layout.bridge.x) < layout.bridge.w / 2)) {
    z = z < river.z ? river.z - river.w / 2 - r : river.z + river.w / 2 + r;
  }
  return { x, z };
}

/** True when a spot is on ice (frozen lake or river): the runtime makes it slippery. */
export function onIce(layout, x, z) {
  return layout.water.some((w) => w.frozen && ((x - w.x) / w.rx) ** 2 + ((z - w.z) / w.rz) ** 2 < 1) || Boolean(layout.river?.frozen && Math.abs(z - layout.river.z) < layout.river.w / 2);
}
