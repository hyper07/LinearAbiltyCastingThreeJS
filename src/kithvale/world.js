/**
 * Puts Kithvale together: the land and its painted ground, the sky and its
 * light at the hour, distant hills fading into the haze, meadow grass and
 * flowers, the trees, the stream and the pond, the village and its gate,
 * the shrine, the bridge, rocks, reeds and lily pads, what can be gathered,
 * and the colliders you, your friends and the camera respect (the land
 * itself is the wall where it gets too steep — no invisible ones).
 * `buildWorld` reports progress as it goes and returns what the game drives
 * each frame: `world.update(dt, t, camera, focus, hour)` → the mood.
 */
import * as THREE from 'three';
import { CollisionWorld } from '../gloamreach/collide.js';
import { shared } from '../gloamreach/materials.js';
import { heightGrid, splatMaps, heightTexture, terrainMaterial, Terrain, LAYERS } from './terrain.js';
import { Sky, Lighting } from './sky.js';
import { Grass } from './grass.js';
import { Trees } from './trees.js';
import { Waters } from './water.js';
import { buildVillage, glow } from './village.js';
import { buildLandmarks } from './landmarks.js';
import { treeList, buildRocks, buildWaterside, Forage, buildBoulders, buildHollow, buildCaches } from './nature.js';
import { bridgeAt, waterAt } from './heights.js';
import { paintShared } from './paint.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

/** Far hills all round, beyond the ridges: two painted bands that take the haze's colour. */
function vista(noise) {
  const group = new THREE.Group();
  const bands = [];
  for (const [R, H, seed, k] of [[1100, 150, 1, 0.55], [820, 95, 2, 0.32]]) {
    const seg = 160;
    const pos = [];
    const v = [];
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const n = Math.sin(a * 3 + seed) * 0.35 + Math.sin(a * 7 + seed * 2) * 0.22 + Math.sin(a * 13 + seed) * 0.1 + Math.sin(a * 29) * 0.04;
      const h = H * (0.55 + n * 0.6);
      pos.push(Math.cos(a) * R, -40, Math.sin(a) * R, Math.cos(a) * R, h, Math.sin(a) * R);
      v.push(0, 1);
    }
    for (let i = 0; i < seg; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aV', new THREE.Float32BufferAttribute(v, 1));
    g.setIndex(idx);
    const u = { uTop: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() }, uK: { value: k }, tNoise: { value: noise } };
    const m = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: 'attribute float aV; varying float vV; varying vec3 vP; void main(){ vV = aV; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uTop; uniform vec3 uBottom; uniform float uK; uniform sampler2D tNoise; varying float vV; varying vec3 vP; void main(){ float n = texture2D(tNoise, vec2(atan(vP.z, vP.x) * 3.0, vP.y * 0.004)).g; vec3 c = mix(uBottom, uTop, smoothstep(0.0, 1.0, vV) * (0.8 + n * 0.3)); gl_FragColor = vec4(c, 1.0); }',
      side: THREE.DoubleSide,
      depthWrite: true,
      fog: false
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = -900;
    group.add(mesh);
    bands.push({ mesh, u, k });
  }
  return {
    group,
    update(camera, mood) {
      group.position.set(camera.position.x, 0, camera.position.z);
      for (const b of bands) {
        // The farther band nearly the sky's horizon; the nearer one a cooler, darker blue-green.
        b.u.uTop.value.copy(mood.hor).lerp(mood.mid, 0.25).lerp(mood.hemiG, b.k * 0.35);
        b.u.uBottom.value.copy(mood.fog).lerp(mood.hor, 0.4);
        if (b.k < 0.4) b.u.uTop.value.lerp(new THREE.Color('#5a6a7a'), 0.25).multiplyScalar(0.92);
      }
    },
    dispose() {
      for (const b of bands) {
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
      }
    }
  };
}

export async function buildWorld({ renderer, bank, settings, save = {}, onProgress = () => {} }) {
  const scene = new THREE.Scene();
  const world = { scene, updaters: [], disposers: [], spots: {}, limits: { treeFar: Infinity, far: Infinity, shadowDist: 60 } };
  const step = async (label, k) => {
    onProgress(label, k);
    await tick();
  };

  await step('Shaping the vale', 0.03);
  const grid = heightGrid();
  world.grid = grid;
  const ground = (x, z) => {
    const d = bridgeAt(x, z);
    const h = grid.at(x, z);
    return d != null ? Math.max(h, d) : h;
  };
  const slope = (x, z) => Math.hypot(grid.at(x + 0.5, z) - grid.at(x - 0.5, z), grid.at(x, z + 0.5) - grid.at(x, z - 0.5));
  const colliders = new CollisionWorld({ height: ground, slope, maxSlope: 0.95, maxDrop: 1.6 });
  // Deep water is a wall too (wade the shallows, not the pond's middle).
  const walk = colliders.walkable.bind(colliders);
  colliders.walkable = (fx, fz, x, z) => {
    if (bridgeAt(x, z) != null) return true;
    if (waterAt(x, z) - grid.at(x, z) > 0.8) return false;
    return walk(fx, fz, x, z);
  };
  world.colliders = colliders;
  world.ground = ground;

  await step('Painting the ground', 0.1);
  const splat = splatMaps(grid);
  const arrays = await bank.arrays(LAYERS, settings.texSize ?? 1024);
  const noise = bank.noise();
  world.noise = noise;
  const tmat = terrainMaterial(arrays, splat, noise);
  const terrain = new Terrain(grid, tmat);
  scene.add(terrain.group);
  world.heightTex = heightTexture(grid);
  world.splat = splat;
  world.disposers.push(() => {
    terrain.dispose();
    splat.a.dispose();
    splat.b.dispose();
    world.heightTex.dispose();
    tmat.dispose();
  });

  await step('Hanging the sky', 0.18);
  const sky = new Sky(renderer, noise);
  sky.bakeEnvironments();
  scene.add(sky.mesh);
  const lighting = new Lighting(scene, { shadowSize: settings.shadow, shadowBox: settings.shadowBox });
  lighting.sun.layers.enable(1);
  lighting.hemi.layers.enable(1);
  world.sky = sky;
  world.lighting = lighting;
  const far = vista(noise);
  scene.add(far.group);
  world.disposers.push(() => {
    sky.dispose();
    far.dispose();
  });

  await step('Growing the meadow', 0.26);
  const grass = new Grass({ heightTex: world.heightTex, splat, noise, settings, heightAt: (x, z) => grid.at(x, z) });
  scene.add(grass.group);
  world.grass = grass;
  world.disposers.push(() => grass.dispose());

  await step('Planting the woods', 0.34);
  const list = treeList(settings.trees ?? 1);
  const trees = new Trees(list, (x, z) => grid.at(x, z), { msaa: (settings.msaa ?? 0) > 0 });
  scene.add(trees.group);
  for (const t of list) if (t.kind !== 'bush') colliders.circle(t.x, t.z, t.kind === 'pine' ? 0.4 : 0.45);
  world.trees = list;
  world.treeField = trees;
  world.disposers.push(() => trees.dispose());

  await step('Filling the stream and the pond', 0.42);
  const waters = new Waters(noise);
  scene.add(waters.group);
  world.waters = waters;
  world.disposers.push(() => waters.dispose());
  scene.add(buildWaterside());

  await step('Raising Lanternrest', 0.5);
  const village = buildVillage({ colliders, bank });
  scene.add(village.group);
  world.village = village;
  const marks = buildLandmarks({ colliders });
  scene.add(marks.group);
  world.landmarks = marks;
  const rocks = buildRocks(colliders);
  scene.add(rocks.group);
  world.forage = new Forage();
  scene.add(world.forage.group);
  world.boulders = buildBoulders(colliders, save.boulders ?? []);
  scene.add(world.boulders.group);
  world.hollow = buildHollow();
  scene.add(world.hollow.group);
  world.caches = buildCaches(save.caches ?? []);
  scene.add(world.caches.group);

  // Lantern light: a few real lights shared among the nearest lanterns (always the same number, so nothing recompiles).
  const pool = [0, 1, 2, 3].map(() => {
    const l = new THREE.PointLight(0xffb060, 0, 9, 1.8);
    scene.add(l);
    return l;
  });
  const lamps = [...village.lights];
  world.lamps = lamps;
  let poolT = 0;

  world.update = (dt, t, camera, focus, hour) => {
    shared.uTime.value = t;
    const mood = lighting.setHour(hour);
    world.mood = mood;
    scene.environment = sky.envFor(hour);
    scene.environmentIntensity = mood.envIntensity;
    sky.setHour(hour, mood);
    sky.update(t, camera);
    far.update(camera, mood);
    lighting.follow(focus, camera);
    terrain.update(camera);
    grass.update(camera);
    trees.update(camera, focus, { far: world.limits?.treeFar ?? Infinity, shadowDist: world.limits?.shadowDist ?? 60 });
    waters.update(t, mood);
    // Lanterns glow at dusk and through the night; the light pool follows you.
    const dark = THREE.MathUtils.smoothstep(Math.abs(((hour - 12 + 24) % 24) - 12), 4.6, 6.8);
    glow.value = 0.25 + dark * 1.6;
    paintShared.uRimTint.value.copy(mood.sun).lerp(new THREE.Color('#ffd8a8'), 0.4);
    if ((poolT -= dt) < 0) {
      poolT = 0.4;
      const sorted = lamps.map((p) => [p, p.distanceToSquared(focus)]).sort((a, b) => a[1] - b[1]);
      pool.forEach((l, i) => {
        const s = sorted[i];
        if (s && s[1] < 60 * 60) {
          l.position.copy(s[0]);
          l.userData.on = true;
        } else l.userData.on = false;
      });
    }
    for (const l of pool) l.intensity = l.userData.on ? 7 * dark : 0;
    for (const u of world.updaters) u(dt, t, camera, focus, mood);
    return mood;
  };
  world.dispose = () => {
    for (const d of world.disposers) d();
  };
  await step('Ready', 1);
  return world;
}
