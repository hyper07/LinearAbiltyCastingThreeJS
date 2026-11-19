/**
 * Puts Mistfall Gorge together: the land, the sky and its light, the river,
 * the falls and their mist, the jungle, the rocks, the ruins, the camp and
 * the colliders the hunter, the mount and the camera respect. `buildWorld`
 * reports progress as it goes and returns what the game drives each frame.
 */
import * as THREE from 'three';
import { CollisionWorld } from '../gloamreach/collide.js';
import { heightGrid, splatMaps, heightTexture, terrainMaterial, Terrain, LAYERS } from './terrain.js';
import { Sky, Lighting } from './sky.js';
import { groundAt, slopeAt } from './heights.js';
import { shared } from '../gloamreach/materials.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function buildWorld({ renderer, bank, settings, onProgress = () => {}, parts = {} }) {
  const scene = new THREE.Scene();
  const world = { scene, updaters: [], disposers: [], spots: {}, rain: 0, limits: { treeFar: Infinity, far: Infinity } };
  const step = async (label, k) => {
    onProgress(label, k);
    await tick();
  };

  await step('Cutting the gorge', 0.04);
  const grid = heightGrid();
  world.grid = grid;
  const colliders = new CollisionWorld({ height: groundAt, slope: slopeAt, maxSlope: 0.95, maxDrop: 1.6 });
  world.colliders = colliders;

  await step('Painting the stone and the moss', 0.12);
  const splat = splatMaps(grid);
  const arrays = await bank.arrays(LAYERS, settings.texSize ?? 1024);
  const noise = bank.noise();
  world.noise = noise;
  const tmat = terrainMaterial(arrays, splat, noise);
  const terrain = new Terrain(grid, tmat);
  scene.add(terrain.group);
  world.terrain = terrain;
  world.tmat = tmat;
  world.heightTex = heightTexture(grid);
  world.splat = splat;
  world.disposers.push(() => {
    terrain.dispose();
    splat.a.dispose();
    splat.b.dispose();
    world.heightTex.dispose();
    tmat.dispose();
  });

  await step('Hanging the sky', 0.2);
  const sky = new Sky(renderer, noise);
  sky.bakeEnvironments();
  scene.add(sky.mesh);
  const lighting = new Lighting(scene, { shadowSize: settings.shadow, shadowBox: settings.shadowBox });
  lighting.sun.layers.enable(1);
  lighting.hemi.layers.enable(1);
  world.sky = sky;
  world.lighting = lighting;
  scene.environment = sky.envs.sun;
  world.disposers.push(() => sky.dispose());

  // The rest of the map, each part its own module (added as they are built).
  for (const [label, k, fn] of parts.list ?? []) {
    await step(label, k);
    await fn(world, { renderer, bank, settings });
  }

  world.update = (dt, t, camera, focus) => {
    shared.uTime.value = t;
    const w = world.rain;
    const look = lighting.setWeather(w);
    tmat.userData.uniforms.uRain.value = Math.min(1, w * 1.2 + (world.wetness ?? 0));
    if (world.rainU) world.rainU.value = tmat.userData.uniforms.uRain.value;
    tmat.userData.uniforms.uTime.value = t;
    scene.environment = w > 0.5 ? sky.envs.rain : sky.envs.sun;
    scene.environmentIntensity = look.envIntensity;
    sky.update(t, camera, w);
    lighting.follow(focus, camera);
    terrain.update(camera);
    for (const u of world.updaters) u(dt, t, camera, focus, look);
    return look;
  };
  world.dispose = () => {
    for (const d of world.disposers) d();
  };
  await step('Ready', 1);
  return world;
}
