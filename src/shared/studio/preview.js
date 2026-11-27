/**
 * Small live previews for the Studio: a sample game for the style and look pickers, one
 * character on a turntable for the animation picker and the character generator, and still
 * thumbnails (one shared offscreen renderer) for the asset store.
 */
import * as THREE from 'three';
import { buildCharacter, pixelFrames } from './characters.js';
import { poseRig, spriteFrame } from './animate.js';
import { configureRenderer } from './looks.js';
import { starterData } from './spec.js';

/** A tiny game that shows a style off: a small map with things to collect and two monsters. */
export function sampleGame({ render = 'full3d', animation = 'plush', look = 'cartoon', biome = 'meadow' } = {}) {
  const data = starterData({ title: 'Preview', render, animation, look, genre: 'monster-hunt' });
  const map = data.maps.maps[0];
  Object.assign(map, { size: 'small', biome, features: biome === 'snow' ? ['trees', 'frozen-lake', 'snowmen'] : ['trees', 'lake', 'flowers', 'rocks'], collectibles: 10, weather: biome === 'snow' ? 'snow' : 'clear' });
  data.rules.lives = 9;
  data.rules.jump = false;
  return data;
}

/** A sample character for the animation picker. */
export const SAMPLE_CHARACTER = { id: 'sample', name: 'Pip', role: 'ally', base: 'auto', body: 'bunny', colors: { main: '#f7c6d9', second: '#ffffff', accent: '#ff7aa8' }, accessories: ['scarf'], size: 1, speed: 4, health: 3, damage: 0, behaviour: 'idle', line: '', model: null };

/**
 * One character, alive: walks in place, stops, turns. `sprite` true draws it as the 2D styles
 * do (pixel sprite for 'pixel', else a flat billboard of its frames).
 * Returns { root, update(char, options), snapshot(), dispose() }.
 */
export function mountCharacterPreview(host, char, { look = 'cartoon', animation = 'plush', sprite = false, background = '#1d2238' } = {}) {
  const root = document.createElement('div');
  root.style.cssText = 'position:absolute;inset:0';
  host.append(root);
  const renderer = new THREE.WebGLRenderer({ antialias: animation !== 'pixel', alpha: false, preserveDrawingBuffer: true });
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 1.6, 5.2);
  camera.lookAt(0, 0.85, 0);
  scene.add(new THREE.HemisphereLight('#dfe8ff', '#3a3040', 1.3));
  const key = new THREE.DirectionalLight('#fff2e0', 2.4);
  key.position.set(3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#bcd4ff', 1);
  rim.position.set(-3, 3, -4);
  scene.add(rim);
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.12, 40), new THREE.MeshStandardMaterial({ color: '#3a4166', roughness: 0.8 }));
  stage.position.y = -0.06;
  stage.receiveShadow = true;
  scene.add(stage);
  root.append(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  let current = null;
  let opts = { look, animation, sprite };
  const build = () => {
    if (current) {
      scene.remove(current.obj);
      current.dispose();
    }
    configureRenderer(renderer, { look: opts.look, pixel: opts.animation === 'pixel' && opts.sprite });
    renderer.shadowMap.enabled = true;
    if (opts.sprite) {
      const frames = opts.animation === 'pixel' ? pixelFrames(char) : pixelFrames(char, { scale: 4 });
      const canvas = document.createElement('canvas');
      canvas.width = frames.width;
      canvas.height = frames.height;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      const h = 1.8;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry((h * frames.width) / frames.height, h).translate(0, h / 2, 0), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
      mesh.castShadow = true;
      scene.add(mesh);
      let last = null;
      current = {
        obj: mesh,
        tick: (t, moving) => {
          const f = spriteFrame(frames, opts.animation, { t, moving });
          if (f.frame !== last) {
            const g = canvas.getContext('2d');
            g.clearRect(0, 0, canvas.width, canvas.height);
            g.drawImage(f.frame, 0, 0);
            tex.needsUpdate = true;
            last = f.frame;
          }
          mesh.position.y = f.lift;
          mesh.scale.set(f.sx, f.sy, 1);
          mesh.rotation.z = f.tilt;
        },
        dispose: () => {
          tex.dispose();
          mesh.geometry.dispose();
          mesh.material.dispose();
        }
      };
    } else {
      const { group, rig } = buildCharacter({ ...char, size: 1 }, { look: opts.look });
      scene.add(group);
      current = {
        obj: group,
        tick: (t, moving) => {
          poseRig(rig, opts.animation, { t, moving });
          group.rotation.y = Math.sin(t * 0.4) * 0.9;
        },
        dispose: () => group.userData.dispose?.()
      };
    }
  };
  build();
  const resize = () => {
    const w = root.clientWidth || 200;
    const h = root.clientHeight || 200;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  resize();
  const start = performance.now();
  renderer.setAnimationLoop((now) => {
    const t = (now - start) / 1000;
    const moving = t % 5 < 3 ? 0.9 : 0;
    current.tick(t, moving);
    renderer.render(scene, camera);
  });
  return {
    root,
    update(nextChar, nextOpts = {}) {
      char = nextChar ?? char;
      opts = { ...opts, ...nextOpts };
      build();
    },
    snapshot: () => renderer.domElement.toDataURL('image/png'),
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      current?.dispose();
      stage.geometry.dispose();
      stage.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
      root.remove();
    }
  };
}

let thumbRenderer = null;
const thumbCache = new Map();
/** A still picture of a character (store cards): one offscreen renderer for every thumbnail. */
export function characterThumbnail(char, { look = 'cartoon', size = 160 } = {}) {
  const key = JSON.stringify([char, look, size]);
  if (thumbCache.has(key)) return thumbCache.get(key);
  if (char.base === 'pixel') {
    const frames = pixelFrames(char);
    const url = frames.idle[0].toDataURL('image/png');
    thumbCache.set(key, url);
    return url;
  }
  thumbRenderer ??= new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  thumbRenderer.setSize(size, size, false);
  configureRenderer(thumbRenderer, { look });
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#dfe8ff', '#3a3040', 1.4));
  const key2 = new THREE.DirectionalLight('#fff2e0', 2.4);
  key2.position.set(3, 5, 4);
  scene.add(key2);
  const { group, rig } = buildCharacter({ ...char, size: 1 }, { look });
  poseRig(rig, 'skeletal', { t: 0.4, moving: 0 });
  group.rotation.y = 0.4;
  scene.add(group);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.4, 5);
  camera.lookAt(0, 0.8, 0);
  thumbRenderer.setClearColor(0x000000, 0);
  thumbRenderer.render(scene, camera);
  const url = thumbRenderer.domElement.toDataURL('image/png');
  group.userData.dispose?.();
  if (thumbCache.size > 300) thumbCache.clear();
  thumbCache.set(key, url);
  return url;
}

/**
 * A downloaded 3D model on a turntable (the asset browser). `url` is under /library/.
 * Returns { snapshot(), dispose() }; shows a note in the box if the model cannot be loaded.
 */
export function mountModelPreview(host, url) {
  const root = document.createElement('div');
  root.style.cssText = 'position:absolute;inset:0';
  host.append(root);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  configureRenderer(renderer, { look: 'stylized' });
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  root.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1d2238');
  scene.add(new THREE.HemisphereLight('#e8f0ff', '#3a3040', 1.5));
  const key = new THREE.DirectionalLight('#fff2e0', 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  const pivot = new THREE.Group();
  scene.add(pivot);
  let alive = true;
  import('three/addons/loaders/GLTFLoader.js')
    .then(({ GLTFLoader }) => new GLTFLoader().loadAsync(url))
    .then((gltf) => {
      if (!alive) return;
      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const k = 1.6 / Math.max(0.01, size.x, size.y, size.z);
      obj.scale.setScalar(k);
      obj.position.set(-((box.min.x + box.max.x) / 2) * k, -box.min.y * k, -((box.min.z + box.max.z) / 2) * k);
      pivot.add(obj);
    })
    .catch(() => {
      if (!alive) return;
      const note = document.createElement('div');
      note.textContent = 'The 3D library is not downloaded on this server yet.';
      note.style.cssText = 'position:absolute;inset:auto 8px 8px;font:600 12px system-ui;color:#fff;opacity:.8';
      root.append(note);
    });
  const resize = () => {
    const w = root.clientWidth || 200;
    const h = root.clientHeight || 200;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 1.3, 3.2);
    camera.lookAt(0, 0.7, 0);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  resize();
  renderer.setAnimationLoop((t) => {
    pivot.rotation.y = t / 1600;
    renderer.render(scene, camera);
  });
  return {
    snapshot: () => renderer.domElement.toDataURL('image/png'),
    dispose() {
      alive = false;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      renderer.dispose();
      renderer.forceContextLoss?.();
      root.remove();
    }
  };
}
