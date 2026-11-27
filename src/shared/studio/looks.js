/**
 * The three looks as renderer, light and post settings (knowledge/render-quality.md):
 *
 *   realistic  ACES, PCF soft shadows 2048, an environment map for PBR reflections, and
 *              ground-truth ambient occlusion (GTAOPass, half resolution) — skipped on 'low'
 *   stylized   Neutral tone mapping (keeps colour), 1024 shadows, a warm key and cool fill
 *   cartoon    Neutral, bright flat fill, a strong rim; toon bands and ink outlines come from
 *              the materials (characters.js)
 *
 * Pixel animation games also draw at a low resolution, scaled up without smoothing.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TIME_LIGHT = {
  day: { sun: '#fff4e0', sunI: 2.6, hemiSky: '#cfe3ff', hemiGround: '#4a4038', hemiI: 0.9, elev: 1 },
  dawn: { sun: '#ffc8a0', sunI: 1.8, hemiSky: '#ffd8c8', hemiGround: '#4a3a48', hemiI: 0.8, elev: 0.45 },
  sunset: { sun: '#ff9a50', sunI: 2, hemiSky: '#ffb080', hemiGround: '#3a2a48', hemiI: 0.75, elev: 0.35 },
  night: { sun: '#9ab8ff', sunI: 0.9, hemiSky: '#3a4a8a', hemiGround: '#141022', hemiI: 0.6, elev: 0.8 }
};

/** Renderer settings for a look; `pixel` lowers the resolution for crisp, chunky pixels. */
export function configureRenderer(renderer, { look, pixel = false, quality = 'auto' }) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = look === 'realistic' ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
  renderer.toneMappingExposure = look === 'realistic' ? 1.0 : 1.05;
  renderer.shadowMap.enabled = quality !== 'off';
  renderer.shadowMap.type = look === 'realistic' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  const dpr = Math.min(globalThis.devicePixelRatio ?? 1, quality === 'low' ? 1 : 2);
  renderer.setPixelRatio(pixel ? Math.max(0.25, dpr / 3) : dpr);
  renderer.domElement.style.imageRendering = pixel ? 'pixelated' : 'auto';
}

/**
 * Lights for a scene: key (with shadows), hemisphere fill, a rim from behind; an environment
 * map for realistic. Returns { sun, update(target) } — the shadow box follows the player.
 */
export function addLights(scene, renderer, { look, time = 'day', biome = 'meadow', quality = 'auto', span = 30 }) {
  const t = TIME_LIGHT[time] ?? TIME_LIGHT.day;
  const cave = biome === 'cave' || biome === 'space';
  const hemi = new THREE.HemisphereLight(t.hemiSky, t.hemiGround, (look === 'cartoon' ? 1.3 : t.hemiI) * (cave ? 0.8 : 1));
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(t.sun, (look === 'cartoon' ? t.sunI * 0.8 : t.sunI) * (cave ? 0.6 : 1));
  sun.position.set(12, 22 * t.elev + 4, 10);
  sun.castShadow = quality !== 'off';
  const size = look === 'realistic' && quality !== 'low' ? 2048 : 1024;
  sun.shadow.mapSize.set(size, size);
  const half = Math.min(40, span);
  Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 120 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  if (look === 'realistic') sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(look === 'cartoon' ? '#ffffff' : '#bcd4ff', look === 'cartoon' ? 1.2 : 0.6);
  rim.position.set(-10, 8, -14);
  scene.add(rim);
  let env = null;
  if (look === 'realistic') {
    const pmrem = new THREE.PMREMGenerator(renderer);
    env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.environment = env;
    scene.environmentIntensity = time === 'night' ? 0.25 : 0.6;
  }
  return {
    sun,
    update(target) {
      sun.position.set(target.x + 12, 22 * t.elev + 4, target.z + 10);
      sun.target.position.set(target.x, 0, target.z);
    },
    dispose() {
      env?.dispose();
      scene.remove(hemi, sun, sun.target, rim);
    }
  };
}

/**
 * The frame's draw: a composer with ambient occlusion for the realistic look (not on 'low'),
 * a plain render otherwise. Returns { render(), setSize(w, h), dispose() }.
 */
export function makeDraw(renderer, scene, camera, { look, quality = 'auto', width = 800, height = 600 }) {
  if (look !== 'realistic' || quality === 'low') {
    return { render: () => renderer.render(scene, camera), setSize: () => {}, dispose: () => {} };
  }
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, Math.max(1, width / 2), Math.max(1, height / 2));
  ao.blendIntensity = 0.85;
  composer.addPass(ao);
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    setSize: (w, h) => {
      composer.setSize(w, h);
      ao.setSize(Math.max(1, w / 2), Math.max(1, h / 2));
    },
    dispose: () => {
      ao.dispose?.();
      composer.dispose?.();
    }
  };
}

/** Falling weather around a point: rain, snow, leaves or embers (Points, recycled). */
export function makeWeather(scene, kind, { area = 30 } = {}) {
  if (!kind || kind === 'clear' || kind === 'fog') return { update() {}, dispose() {} };
  const n = kind === 'rain' ? 1600 : kind === 'leaves' ? 260 : 900;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * area, Math.random() * 16, (Math.random() - 0.5) * area], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const color = { rain: '#9ec8ff', snow: '#ffffff', leaves: '#e8a040', embers: '#ff8a3a' }[kind] ?? '#ffffff';
  const mat = new THREE.PointsMaterial({ color, size: kind === 'rain' ? 0.06 : kind === 'leaves' ? 0.22 : 0.12, transparent: true, opacity: kind === 'rain' ? 0.6 : 0.9, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  const fall = { rain: 14, snow: 1.4, leaves: 1.1, embers: -1.2 }[kind] ?? 1;
  return {
    update(dt, center, t) {
      const p = geo.attributes.position;
      for (let i = 0; i < n; i++) {
        let y = p.getY(i) - fall * dt;
        let x = p.getX(i) + (kind === 'rain' ? 0 : Math.sin(t + i) * dt * 0.6);
        if (y < 0) y += 16;
        if (y > 16) y -= 16;
        p.setY(i, y);
        p.setX(i, x);
      }
      p.needsUpdate = true;
      points.position.set(center.x, 0, center.z);
    },
    dispose() {
      scene.remove(points);
      geo.dispose();
      mat.dispose();
    }
  };
}
