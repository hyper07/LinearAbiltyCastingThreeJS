/**
 * Puts one of Gloamreach's zones together (zones.js): ground, sky and light,
 * trees, buildings, foliage, the gate, the Gloamwood, the rift floor, and the
 * colliders the hero and camera respect. Only what belongs to the zone is
 * built — its bounds for the land and the scatter, its features for the rest
 * — so Brindlewick never builds a Gloamwood tree and vice versa. With no zone
 * it builds the whole old map (tests, tools). `buildWorld` reports progress
 * as it goes and returns the pieces the game drives each frame.
 */
import * as THREE from 'three';
import { ROADS, ELDER_TREES, GLOAM_GIANTS, ROOT_HOUSES, BUILDINGS, STALLS, WELL, SIGNPOST, FENCES, LANTERNS, GATE, OVERLOOK, EXTENT, scatterTrees, gloamAt, isClear, footprint } from './map.js';
import { CollisionWorld } from './collide.js';
import { heightGrid, splatMaps, splatTextures, heightTexture, terrainMaterial, Terrain, LAYERS, ponds } from './terrain.js';
import { heightAt } from './heights.js';
import { riftHeight, lavaAt, riftOutside, lavaLights, RIFT } from './rift.js';
import { inZone } from './zones.js';
import { simplex2, smoothstep } from './noise.js';
import { Sky, Lighting } from './sky.js';
import { TreeField, giantTree } from './trees.js';
import { shared } from './materials.js';
import { Kit, tf } from './kit.js';
import { buildingMaterials, buildVillage, innSign } from './buildings.js';
import { PropLibrary, addWell, addStall, addFences, addSignpost, addLanternPosts, addBenches, addOverlook, addFlowerBeds } from './props.js';
import { gateMaterials, buildGate } from './gate.js';
import { gloamMaterials, addRootHouse, addGloamLamps, addMushrooms, addMoonwell } from './gloamwood.js';
import { Foliage, plants } from './foliage.js';
import { LightPool, glowSprites } from './lights.js';
import { rng } from './noise.js';

const tick = () => new Promise((r) => setTimeout(r, 0));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Heights over a zone's grid, cached while the game runs (a return trip skips the slowest part). */
const GRIDS = new Map();
function zoneGrid(zone) {
  const key = zone?.id ?? '*';
  if (!GRIDS.has(key)) GRIDS.set(key, heightGrid(zone?.bounds ?? EXTENT, zone?.terrain?.source === 'rift' ? riftHeight : heightAt));
  return GRIDS.get(key);
}

/** The splat maps' bytes per zone, kept like the heights (the textures are made again each visit). */
const SPLATS = new Map();

/** Warm a zone's caches ahead of a trip (the manager calls this in idle time near a door). */
export function prewarm(zone) {
  zoneGrid(zone);
  if (zone?.terrain?.source !== 'rift') scatterTrees(5);
}

/** The tree kinds a zone grows (their bark and leaf atlases are painted once, then cached in the bank). */
export const zoneTreeKinds = (zone) => (zone?.terrain?.source === 'rift' ? [] : zone?.features?.includes('gloamwood') ? ['gloam', 'gloamGiant'] : ['oak', 'birch', 'elder']);

/** The rift's floor painted: basalt, ash and scorched earth, by slope and how near the lava is. */
function riftSplat(grid) {
  const EXT = grid.extent;
  const CELL = 0.5;
  const W = Math.round((EXT.x1 - EXT.x0) / CELL);
  const H = Math.round((EXT.z1 - EXT.z0) / CELL);
  const A = new Uint8Array(W * H * 4);
  const B = new Uint8Array(W * H * 4);
  const N = simplex2(711);
  const M = simplex2(712);
  for (let j = 0; j < H; j++) {
    const z = EXT.z0 + (j + 0.5) * CELL;
    for (let i = 0; i < W; i++) {
      const x = EXT.x0 + (i + 0.5) * CELL;
      const hx = grid.at(x + 0.5, z) - grid.at(x - 0.5, z);
      const hz = grid.at(x, z + 0.5) - grid.at(x, z - 0.5);
      const slope = Math.hypot(hx, hz);
      const n1 = N(x / 9, z / 9);
      const n2 = M(x / 2.4, z / 2.4);
      const hot = x > 139 ? Math.min(1, lavaAt(x, z) * 2.2 + lavaAt(x + 3, z) + lavaAt(x - 3, z) + lavaAt(x, z + 3) + lavaAt(x, z - 3)) : 0;
      let rock = smoothstep(0.35, 0.9, slope) + smoothstep(0.2, 0.7, n1 * 0.5 + 0.5) * 0.6 + hot * 0.4;
      let ash = (1 - smoothstep(0.4, 0.9, slope)) * (0.45 + n2 * 0.25);
      let dirt = smoothstep(0.1, 0.6, -n1) * 0.5 * (1 - hot);
      const grass = x < 138 ? 0.4 : 0;
      const sum = rock + ash + dirt + grass + 1e-5;
      const k = (j * W + i) * 4;
      A[k] = (grass / sum) * 255;
      A[k + 1] = (dirt / sum) * 255;
      A[k + 3] = (rock / sum) * 255;
      B[k + 1] = (ash / sum) * 255;
    }
  }
  return splatTextures(A, B, W, H, EXT);
}

export async function buildWorld({ renderer, bank, settings, zone = null, onProgress = () => {} }) {
  const scene = new THREE.Scene();
  const has = (f) => !zone || zone.features?.includes(f);
  const keep = zone ? (x, z) => inZone(zone, x, z) : () => true;
  const rift = zone?.terrain?.source === 'rift';
  // Draw distances from the power settings (GloamreachGame.applyPower): scattered trees, small things.
  const world = { scene, zone, keep, rift, updaters: [], disposers: [], spots: {}, limits: { treeFar: 420, far: Infinity } };
  const step = async (label, k) => {
    onProgress(label, k);
    await tick();
  };
  const msaa = (settings.msaa ?? 0) > 0;

  await step('Shaping the land', 0.04);
  const grid = zoneGrid(zone);
  const H = grid.at;
  world.grid = grid;
  world.extent = grid.extent;
  const gridSlope = (x, z) => Math.hypot(H(x + 0.35, z) - H(x - 0.35, z), H(x, z + 0.35) - H(x, z - 0.35)) / 0.7;
  const colliders = new CollisionWorld(rift ? { height: H, slope: gridSlope } : { height: H });
  if (rift) {
    // Lava is a wall: nothing steps into it.
    const walk = colliders.walkable.bind(colliders);
    colliders.walkable = (fx, fz, x, z) => lavaAt(x, z) < 0.3 && walk(fx, fz, x, z);
  }
  world.colliders = colliders;
  const elders = ELDER_TREES.filter((t) => keep(t.x, t.z));
  const gloamGiants = GLOAM_GIANTS.filter((t) => keep(t.x, t.z));
  const rootHouses = has('gloamwood') ? ROOT_HOUSES.filter((h) => keep(h.x, h.z)) : [];
  const scattered = rift ? [] : scatterTrees(5).filter((t) => keep(t.x, t.z));
  world.scattered = scattered;

  await step('Painting the ground', 0.12);
  const raw = SPLATS.get(zone?.id ?? '*');
  const splat = raw ? splatTextures(raw.A, raw.B, raw.W, raw.H, raw.extent) : rift ? riftSplat(grid) : splatMaps(grid, [...scattered.map((t) => ({ x: t.x, z: t.z, r: 0.6 * t.s })), ...elders, ...gloamGiants]);
  if (!raw) SPLATS.set(zone?.id ?? '*', { ...splat.raw, W: splat.W, H: splat.H, extent: splat.extent });
  const arrays = await bank.arrays(LAYERS, settings.texSize ?? 1024);
  const noise = bank.noise();
  const tmat = terrainMaterial(arrays, splat, noise);
  // Basalt and ash: the rift's ground darker and warmer than the fields'.
  if (rift) tmat.color.set('#a08a80');
  const terrain = new Terrain(grid, tmat);
  scene.add(terrain.group);
  world.terrain = terrain;
  world.heightTex = heightTexture(grid);
  world.splat = splat;
  world.disposers.push(() => {
    terrain.dispose();
    splat.a.dispose();
    splat.b.dispose();
    world.heightTex.dispose();
    tmat.dispose();
  });

  await step('Lighting the sky', 0.22);
  const sky = new Sky(renderer, noise);
  sky.bakeEnvironments();
  scene.add(sky.mesh);
  const lighting = new Lighting(scene, { shadowSize: settings.shadow, shadowBox: settings.shadowBox });
  world.sky = sky;
  world.lighting = lighting;
  scene.environment = sky.envs.village;
  world.disposers.push(() => sky.dispose());
  const water = ponds(bank, keep);
  scene.add(water.group);
  world.updaters.push((dt, t) => water.update(t));
  const pool = new LightPool(scene, settings.lights);
  world.lights = pool;
  world.disposers.push(() => pool.dispose());

  const props = new PropLibrary();
  world.props = props;
  scene.add(props.group);
  world.disposers.push(() => props.dispose());
  const propJobs = [];
  const r = rng(91);
  const mats = await buildingMaterials(bank);
  const glowGlass = (m) => {
    if (/glass/i.test(m.name)) {
      m.emissive = new THREE.Color('#ffb060');
      m.emissiveIntensity = 2.5;
      m.transparent = false;
    }
  };

  /* ---------------------------------------------------------- the village */
  if (has('village')) {
  await step('Raising Brindlewick', 0.3);
  const [wellStone, soil, fence] = await Promise.all([bank.ambient('Bricks112A', { fallback: '#a89888' }), bank.ambient('Ground078', { fallback: '#4a3424' }), bank.ambient('WoodFloor041', { fallback: '#6a5a48' })]);
  const std = (set, extra = {}) => new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, roughnessMap: set.arm, aoMap: set.arm, vertexColors: true, roughness: 1, ...extra });
  Object.assign(mats, {
    wellStone: std(wellStone),
    soil: std(soil, { color: 0x806050 }),
    fenceWood: std(fence, { color: 0xc8b8a0 }),
    water: new THREE.MeshStandardMaterial({ color: 0x0a0c0a, roughness: 0.05, vertexColors: true }),
    rope: new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1, vertexColors: true }),
    fruit: new THREE.MeshStandardMaterial({ roughness: 0.45, vertexColors: true })
  });
  for (const [name, a, b] of [['crimson', '#9a1e1e', '#e8d8b8'], ['ochre', '#c88a2a', '#f0e2c0'], ['teal', '#1e6a6a', '#e8dcc0']]) mats[`cloth_${name}`] = new THREE.MeshStandardMaterial({ map: bank.cloth(a, b), roughness: 0.95, side: THREE.DoubleSide, vertexColors: true });
  const vkit = new Kit();
  const homes = buildVillage(vkit, H);
  world.spots.homes = homes;
  const well = addWell(vkit, H(WELL.x, WELL.z));
  world.spots.well = well;
  world.spots.stalls = STALLS.map((st) => addStall(vkit, st, H(st.x, st.z), r));
  addFences(vkit, H, r);
  const lanterns = addLanternPosts(vkit, H);
  world.spots.benches = addBenches(vkit, H);
  addOverlook(vkit, H, r);
  addFlowerBeds(vkit, H, r);
  const village = vkit.build(mats);
  scene.add(village);
  for (const m of addSignpost(vkit, bank, H)) scene.add(m);
  const sign = innSign(bank, homes.inn.sign);
  scene.add(sign.object);
  world.updaters.push((dt, t) => sign.update(t));

  // Colliders: buildings, stalls, the well, posts, fences, benches, the overlook wall.
  for (const b of BUILDINGS) {
    colliders.box(b.x, b.z, b.w / 2 + 0.2, b.d / 2 + 0.2 + (b.floors > 1 ? 0.3 : 0), b.face, -50, 30);
    const [sx, sz] = [V(0, 0, b.d / 2 + 0.6), V(0, 0, b.d / 2 + 1.0)].map((v) => v.applyAxisAngle(V(0, 1, 0), b.face));
    void sx, sz;
  }
  colliders.circle(WELL.x, WELL.z, 1.7, -50, 5);
  for (const st of STALLS) colliders.box(st.x, st.z, 1.8, 1.05, st.face, -50, 3);
  for (const [x, z] of LANTERNS) colliders.circle(x, z, 0.3, -50, 4);
  colliders.circle(SIGNPOST.x, SIGNPOST.z, 0.25, -50, 4);
  for (const b of world.spots.benches) colliders.box(b.x, b.z, 1.0, 0.3, b.face, -50, 1);
  for (const line of FENCES) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i];
      const [bx, bz] = line[i + 1];
      colliders.box((ax + bx) / 2, (az + bz) / 2, 0.12, Math.hypot(bx - ax, bz - az) / 2, Math.atan2(bx - ax, bz - az), -50, 1.2);
    }
  }
  // The smithy's lean-to and the inn's porch are part of their boxes; the overlook's wall:
  colliders.box(OVERLOOK.x + 4.6, 0, 0.5, 9.5, 0, -50, 1.2);

  // Light: lanterns, the forge, doorway lamps; window glows.
  for (const l of lanterns) pool.add(l.pos, { color: '#ffb25a', intensity: 7, distance: 13, flicker: 0.18, glow: 1.3, glowSize: 1.3 });
  pool.add(homes.smithy.forge, { color: '#ff6a20', intensity: 14, distance: 10, flicker: 0.35, glow: 0.8, glowSize: 2 });
  for (const [id, h] of Object.entries(homes)) if (id !== 'smithy') pool.add(h.lamp, { color: '#ffa850', intensity: 3.5, distance: 8, flicker: 0.12, glow: 0.9, glowSize: 1 });
  const lanternMs = lanterns.map((l) => tf(l.pos.x, l.pos.y - 0.42, l.pos.z, 0, l.ang, 0, 1.15, 1.15, 1.15));
  const doorLampMs = Object.entries(homes).filter(([id]) => id !== 'smithy').map(([, h]) => tf(h.lamp.x, h.lamp.y - 0.35, h.lamp.z, 0, 0, 0, 0.9, 0.9, 0.9));

  await step('Setting out the market', 0.38);
  propJobs.push(
    props.place('wooden_lantern_01', [...lanternMs, ...doorLampMs], { onMaterial: glowGlass }),
    props.place('wooden_bucket_01', [tf(WELL.x + 1.1, H(WELL.x, WELL.z) + 1.08, WELL.z + 0.2, 0, 0.4, 0)])
  );
  // Barrels, crates and baskets by doors, stalls and the inn.
  const clutter = { barrel: [], crate: [], basket: [] };
  for (const [id, h] of Object.entries(homes)) {
    const b = BUILDINGS.find((x) => x.id === id);
    const side = V(b.w / 2 - 0.6, 0, b.d / 2 + 0.7).applyAxisAngle(V(0, 1, 0), b.face);
    const p = V(b.x, 0, b.z).add(side);
    (r() < 0.5 ? clutter.barrel : clutter.crate).push(tf(p.x, H(p.x, p.z), p.z, 0, r() * 6, 0));
    if (r() < 0.6) {
      const q = p.clone().add(V(0.9, 0, 0.3).applyAxisAngle(V(0, 1, 0), b.face));
      clutter.crate.push(tf(q.x, H(q.x, q.z), q.z, 0, r() * 6, 0, 0.9, 0.9, 0.9));
    }
    void h;
  }
  for (const st of world.spots.stalls) {
    const p = st.front.clone().add(V(r() * 2 - 1, 0, r() * 2 - 1));
    clutter.basket.push(tf(p.x, H(p.x, p.z), p.z, 0, r() * 6, 0, 1.3, 1.3, 1.3));
    const q = st.keeper.clone().add(V(1.6, 0, 0));
    clutter.barrel.push(tf(q.x, H(q.x, q.z), q.z, 0, r() * 6, 0));
  }
  for (const p of homes.inn.tables) clutter.barrel.push(tf(p.x + 2, H(p.x + 2, p.z), p.z + 1.5, 0, r() * 6, 0));
  propJobs.push(props.place('wine_barrel_01', clutter.barrel), props.place('wooden_crate_01', clutter.crate), props.place('wicker_basket_01', clutter.basket));
  propJobs.push(props.place('wooden_picnic_table', homes.inn.tables.map((p) => tf(p.x, H(p.x, p.z), p.z, 0, 0.3, 0))));
  for (const p of homes.inn.tables) colliders.box(p.x, p.z, 1.0, 0.9, 0.3, -50, 1.2);
  for (const m of clutter.barrel) {
    const e = m.elements;
    colliders.circle(e[12], e[14], 0.4, -50, 1.2);
  }
  for (const m of clutter.crate) {
    const e = m.elements;
    colliders.circle(e[12], e[14], 0.45, -50, 1.2);
  }
  }

  /* ---------------------------------------------------------- the gate */
  if (has('gate')) {
  await step("Carving the Warden's Gate", 0.46);
  const gmats = await gateMaterials(bank, { iron: mats.iron });
  const gate = buildGate(gmats, H);
  scene.add(gate.group);
  for (const p of gate.lights) pool.add(p, { color: '#ffaa55', intensity: 8, distance: 14, flicker: 0.2, glow: 1.2, glowSize: 1.5 });
  const lanternGate = gate.lights.map((p) => tf(p.x, p.y - 0.3, p.z, 0, 0, 0, 1.2, 1.2, 1.2));
  propJobs.push(props.place('wooden_lantern_01', lanternGate, { onMaterial: glowGlass }));
  const R = GATE.width / 2;
  for (const s of [-1, 1]) {
    const cx = s * (R + (GATE.outerHalfWidth - R) / 2);
    colliders.box(cx, (GATE.z0 + GATE.z1) / 2, (GATE.outerHalfWidth - R) / 2 + 0.3, (GATE.z1 - GATE.z0) / 2 + 2.5, 0, -50, 60);
  }
  // The block over the tunnel (for the camera).
  colliders.box(0, (GATE.z0 + GATE.z1) / 2, R + 1, (GATE.z1 - GATE.z0) / 2, 0, gate.floor + GATE.height - 0.6, 60);
  world.gmats = gmats;
  }

  /* ---------------------------------------------------------- the Gloamwood */
  if (has('gloamwood')) {
  await step('Waking the Gloamwood', 0.54);
  const gmats = world.gmats ?? (await gateMaterials(bank, { iron: mats.iron }));
  const lmats = { ...(await gloamMaterials(bank)), gateStone: gmats.gateStone, gateTrim: gmats.gateTrim, rune: gmats.rune, iron: mats.iron };
  const gkit = new Kit();
  world.spots.rootHouses = rootHouses.map((h) => addRootHouse(gkit, h, H(h.x, h.z)));
  const lamps = addGloamLamps(gkit, H);
  const mushroomSpots = [];
  for (const g of gloamGiants) for (let k = 0; k < 4; k++) mushroomSpots.push([g.x + Math.cos(k * 1.7) * (g.r + 3), g.z + Math.sin(k * 1.7) * (g.r + 3), 7]);
  for (const l of lamps) mushroomSpots.push([l.x + 1.5, l.z + 0.8, 4]);
  addMushrooms(gkit, mushroomSpots, H);
  const moon = addMoonwell(gkit, 0, -306, H);
  world.spots.moonwell = moon;
  scene.add(gkit.build(lmats));
  for (const p of lamps) pool.add(p, { color: '#6ad0ff', intensity: 9, distance: 16, flicker: 0.05, glow: 1.6, glowSize: 1.6 });
  for (const h of world.spots.rootHouses) {
    for (const p of h.lamps) pool.add(p, { color: '#7ad8ff', intensity: 6, distance: 12, flicker: 0.05, glow: 1.4, glowSize: 1.2 });
    for (const p of h.windows) pool.add(p, { color: '#ffa040', intensity: 3, distance: 8, flicker: 0.1, glow: 0.7, glowSize: 1.6 });
  }
  pool.add(moon.centre.clone().add(V(0, 0.6, 0)), { color: '#5ae0ff', intensity: 16, distance: 22, flicker: 0.04, glow: 1.0, glowSize: 4 });
  for (const s of moon.stones) pool.add(s, { color: '#b070ff', intensity: 0, distance: 1, flicker: 0, glow: 0.8, glowSize: 0.9 });
  for (const p of lamps) colliders.circle(p.x - 0.4, p.z, 0.35, -50, 4);
  for (const h of rootHouses) {
    const R2 = 8.4;
    for (let k = -6; k <= 6; k++) {
      const a = h.face + (k / 6) * Math.PI * 0.62;
      colliders.circle(h.x + Math.sin(a) * R2, h.z + Math.cos(a) * R2, 1.3, -50, 12);
    }
    colliders.circle(h.x, h.z, 6, -50, 30);
  }
  colliders.circle(0, -306, 3.6, -50, 1.2);
  for (const s of moon.stones) colliders.circle(s.x, s.z, 0.7, -50, 6);
  }

  /* ---------------------------------------------------------- the rift floor */
  if (rift) {
    await step('Cooling the basalt', 0.54);
    // Light thrown up from the lava onto everything (the cliff shades the floor from the low sun).
    const fill = new THREE.HemisphereLight('#8a7088', '#ff7a32', 1.1);
    scene.add(fill);
    // Warm light from the lava near where you walk.
    for (const p of lavaLights()) pool.add(new THREE.Vector3(p.x, -74, p.z), { color: '#ff6a1a', intensity: 22, distance: 34, flicker: 0.25, glow: 0, glowSize: 0 });
    // The outpost: crates, barrels and a watch-fire's light.
    const O = RIFT.outpost;
    const ring = (n, rad, off = 0) => Array.from({ length: n }, (_, i) => {
      const a = off + (i / n) * Math.PI * 2;
      return [O.x + Math.cos(a) * rad, O.z + Math.sin(a) * rad];
    });
    const crates = ring(7, O.r - 3.2, 0.3).filter(([x, z]) => Math.hypot(x - RIFT.stair.x - 7, z - RIFT.stair.z) > 6);
    const barrels = ring(5, O.r - 4.4, 1.1);
    propJobs.push(
      props.place('wooden_crate_01', crates.map(([x, z]) => tf(x, H(x, z), z, 0, r() * 6, 0, 1.2, 1.2, 1.2))),
      props.place('wine_barrel_01', barrels.map(([x, z]) => tf(x, H(x, z), z, 0, r() * 6, 0)))
    );
    for (const [x, z] of [...crates, ...barrels]) colliders.circle(x, z, 0.55, -100, 2);
    pool.add(new THREE.Vector3(O.x, H(O.x, O.z) + 1.4, O.z), { color: '#ffb05a', intensity: 30, distance: 26, flicker: 0.3, glow: 1.4, glowSize: 2.2 });
    // Fallen basalt along the crags' feet.
    const blocks = [];
    for (let k = 0; k < 140 && blocks.length < 46; k++) {
      const x = RIFT.region.x0 + r() * (RIFT.region.x1 - RIFT.region.x0 + 20);
      const z = RIFT.region.z0 - 6 + r() * (RIFT.region.z1 - RIFT.region.z0 + 6);
      const d = riftOutside(x, z);
      if (d < -3 || d > 7 || lavaAt(x, z) > 0.05) continue;
      if (Math.hypot(x - O.x, z - O.z) < O.r + 4 || Math.hypot(x - RIFT.ledge.x, z - RIFT.ledge.z) < RIFT.ledge.r + 4) continue;
      blocks.push(tf(x, H(x, z) - 0.8, z, 0, r() * 6, 0, 1.1 + r() * 1.2, 1 + r() * 1.3, 1.1 + r() * 1.2));
    }
    propJobs.push(props.scatter('rock_face_01', blocks.filter((_, i) => i % 2), { dist: 220, tint: new THREE.Color(0.42, 0.36, 0.34) }), props.scatter('rock_face_02', blocks.filter((_, i) => !(i % 2)), { dist: 220, tint: new THREE.Color(0.4, 0.34, 0.33) }));
    for (const m of blocks) {
      const e = m.elements;
      colliders.circle(e[12], e[14], 1.2 * Math.hypot(e[0], e[2]), -100, 60);
    }
  }
  /* ---------------------------------------------------------- trees */
  await step('Raising the giants', 0.62);
  for (const spec of elders) {
    const g = giantTree(bank, 'elder', spec, H, { msaa });
    scene.add(g.group);
    colliders.circle(spec.x, spec.z, spec.r * 1.25, -50, 60);
    await tick();
  }
  for (const spec of [...gloamGiants, ...rootHouses.map((h) => ({ x: h.x, z: h.z, r: 3.1, h: 48, seed: h.seed * 7 }))]) {
    const g = giantTree(bank, 'gloamGiant', spec, H, { msaa });
    scene.add(g.group);
    colliders.circle(spec.x, spec.z, spec.r * 1.25, -50, 60);
    await tick();
  }
  await step('Growing the woods', 0.7);
  const field = new TreeField(bank, scattered, H, { lod: settings.treeLod, msaa });
  scene.add(field.group);
  for (const t of scattered) colliders.circle(t.x, t.z, 0.42 * t.s + 0.15, -50, 30);
  world.trees = field;
  world.disposers.push(() => field.dispose());

  /* ---------------------------------------------------------- foliage */
  await step('Sowing grass and flowers', 0.78);
  let foliage = null;
  if (!rift) {
    foliage = new Foliage({ heightTex: world.heightTex, splat, noise, settings, heightAt: H, extent: grid.extent });
    scene.add(foliage.group);
    world.disposers.push(() => foliage.dispose());
    propJobs.push(plants(props, { heightAt: H, isClear: (x, z, m) => keep(x, z) && isClear(x, z, m), trees: scattered, giants: [...elders, ...gloamGiants], roads: has('gloamwood') ? ROADS : [], houses: rootHouses, density: settings.foliage }));
  }
  world.foliage = foliage;

  // Mossy rocks and cliff faces where the land is rough.
  const rocks = [];
  const faces = [];
  for (let k = 0; k < 160 && !rift; k++) {
    const x = -150 + r() * 290;
    const z = -360 + r() * 500;
    if (!keep(x, z) || !isClear(x, z, 2)) continue;
    const sl = Math.abs(H(x + 1, z) - H(x - 1, z)) + Math.abs(H(x, z + 1) - H(x, z - 1));
    if (sl > 1.5 && sl < 6 && faces.length < 40) faces.push(tf(x, H(x, z) - 1.5, z, 0, r() * 6, 0, 3 + r() * 3, 3 + r() * 3, 3 + r() * 3));
    else if (sl < 1.2 && rocks.length < 70) rocks.push(tf(x, H(x, z) - 0.15, z, 0, r() * 6, 0, 1 + r() * 1.6, 1 + r() * 1.4, 1 + r() * 1.6));
  }
  // Around the gate's cut, rough faces to hide where stone meets ridge.
  if (has('gate')) for (const s of [-1, 1]) for (const z of [-118, -124, -160, -168]) faces.push(tf(s * (GATE.outerHalfWidth + 4 + r() * 2), H(s * 30, z) - 2, z, 0, r() * 6, 0, 5, 7, 5));
  propJobs.push(props.scatter('rock_moss_set_01', rocks.slice(0, 35), { split: true, dist: 110 }), props.scatter('rock_moss_set_02', rocks.slice(35), { split: true, dist: 110 }), props.scatter('rock_face_01', faces.filter((_, i) => i % 2), { dist: 220 }), props.scatter('rock_face_02', faces.filter((_, i) => !(i % 2)), { dist: 220 }));
  for (const m of rocks) {
    const e = m.elements;
    colliders.circle(e[12], e[14], 0.9 * Math.hypot(e[0], e[2]), -50, 2);
  }
  await step('Placing the props', 0.86);
  await Promise.all(propJobs);

  // Glows for every emitter, one draw.
  const glows = glowSprites(pool.emitters, bank.glow(128, 2.4));
  scene.add(glows);
  world.updaters.push((dt, t) => (glows.material.uniforms.uTime.value = t));

  /** One frame of the world. */
  world.update = (dt, t, camera, focus) => {
    const g = rift ? 0 : gloamAt(focus.z);
    world.gloam = g;
    shared.uTime.value = t;
    shared.uGloam.value = g;
    const look = lighting.setGloam(g);
    tmat.userData.uniforms.uWet.value = g;
    scene.environment = g > 0.5 ? sky.envs.gloamwood : sky.envs.village;
    scene.environmentIntensity = look.envIntensity;
    sky.update(t, camera, g);
    lighting.follow(focus, camera);
    terrain.update(camera);
    field.update(camera, focus, { farDist: Math.min(420, world.limits.treeFar) });
    foliage?.update(camera);
    props.update(camera, focus, world.limits.far);
    pool.update(focus, t, dt);
    for (const u of world.updaters) u(dt, t, camera, focus);
    return look;
  };
  world.dispose = () => {
    for (const d of world.disposers) d();
  };
  void footprint;
  await step('Ready', 1);
  return world;
}
