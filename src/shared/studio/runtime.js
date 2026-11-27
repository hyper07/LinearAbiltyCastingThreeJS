/**
 * The Game Studio's runtime: plays a game from its data (spec.js) in any of the four render
 * styles, four animation styles and three looks. Every Studio game's package (games/<code>/
 * index.js) calls it with its data files; the Studio page calls it for the live previews and
 * the editor's preview; a class plays it from the data the server allows them.
 *
 *   const game = await mountStudioGame(host, data, { mode: 'play', onExit })
 *   game.dispose()
 *
 * Modes: 'play' (input, HUD, music), 'preview' (autopilot, no HUD, quiet — the style picker),
 * 'embedded' (play inside the editor's box: keys only while it has focus).
 *
 * Controls (one table, H shows it): WASD/arrows move, Space jump (or attack when the game has
 * no jumping), J / click attack, H How to play, Esc pause. Drag to turn the camera (full 3D).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HelpPanel, hintItems } from '../helpPanel.js';
import { music } from '../music.js';
import { buildCharacter, pixelFrames, lookMaterial } from './characters.js';
import { poseRig, spriteFrame } from './animate.js';
import { collide, layoutMap, onIce } from './layout.js';
import { buildWorld3D, collectColor, collectGeometry, colorsFor, paintBackdrop, paintMap2D, skyCanvas, PX } from './world.js';
import { addLights, configureRenderer, makeDraw, makeWeather } from './looks.js';
import { StudioHud } from './hud.js';
import { playSound } from './sfx.js';
import { creditsOf, goalText } from './spec.js';

export const CONTROLS = {
  title: 'How to play',
  goal: 'Do what each map asks, then step through the glowing door.',
  groups: [
    {
      name: 'Move',
      rows: [
        { id: 'up', keys: ['W', '↑'], codes: ['KeyW', 'ArrowUp'], does: 'Up / forward', hint: true },
        { id: 'down', keys: ['S', '↓'], codes: ['KeyS', 'ArrowDown'], does: 'Down / back' },
        { id: 'left', keys: ['A', '←'], codes: ['KeyA', 'ArrowLeft'], does: 'Left' },
        { id: 'right', keys: ['D', '→'], codes: ['KeyD', 'ArrowRight'], does: 'Right' },
        { id: 'jump', keys: ['Space'], codes: ['Space'], does: 'Jump (attack in games without jumping)', hint: true }
      ]
    },
    {
      name: 'Act',
      rows: [{ id: 'attack', keys: ['J', 'Click'], codes: ['KeyJ', 'Enter'], does: 'Attack', hint: true }]
    },
    {
      name: 'Menus',
      rows: [
        { id: 'pause', keys: ['Esc'], codes: ['Escape'], does: 'Pause (restart, credits, leave)', hint: true },
        { id: 'help', keys: ['H'], codes: ['KeyH'], does: 'How to play', hint: true }
      ]
    }
  ]
};
const codes = (id) => CONTROLS.groups.flatMap((g) => g.rows).find((r) => r.id === id)?.codes ?? [];

const DIFF = { easy: { speed: 0.75, damage: 0.5 }, normal: { speed: 1, damage: 1 }, hard: { speed: 1.25, damage: 1.5 } };

export async function mountStudioGame(host, data, options = {}) {
  const game = new StudioGame(host, data, options);
  await game.open();
  return game;
}

/** Pre-rendered sprite frames for smooth / toon / plush characters in the 2D styles. */
function prerenderFrames(renderer, char, look, animation) {
  const W = 128;
  const H = 144;
  const target = new THREE.WebGLRenderTarget(W, H, { colorSpace: THREE.SRGBColorSpace });
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a6070', 1.6));
  const key = new THREE.DirectionalLight('#ffffff', 2.2);
  key.position.set(2, 4, 5);
  scene.add(key);
  const { group, rig } = buildCharacter({ ...char, size: 1 }, { look });
  scene.add(group);
  const cam = new THREE.OrthographicCamera(-1, 1, 2.05, -0.2, 0.1, 20);
  cam.position.set(0, 1.2, 6);
  cam.lookAt(0, 0.95, 0);
  const pixels = new Uint8Array(W * H * 4);
  const prevTarget = renderer.getRenderTarget();
  const prevClear = renderer.getClearColor(new THREE.Color());
  const prevAlpha = renderer.getClearAlpha();
  const prevShadow = renderer.shadowMap.enabled;
  renderer.shadowMap.enabled = false;
  renderer.setClearColor(0x000000, 0);
  const shot = (t, moving) => {
    poseRig(rig, animation, { t, moving });
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(target, 0, 0, W, H, pixels);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const img = c.getContext('2d').createImageData(W, H);
    for (let y = 0; y < H; y++) img.data.set(pixels.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    c.getContext('2d').putImageData(img, 0, 0);
    return c;
  };
  const frames = { idle: [shot(0, 0), shot(0.9, 0)], walk: Array.from({ length: 8 }, (_, i) => shot((i / 8) * ((Math.PI * 2) / 9.5), 0.9)), width: W, height: H };
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevClear, prevAlpha);
  renderer.shadowMap.enabled = prevShadow;
  group.userData.dispose?.();
  target.dispose();
  return frames;
}

export class StudioGame {
  constructor(host, data, { mode = 'play', fullscreen = mode === 'play', map = 0, onExit = null, onEvent = () => {}, title = '', quality = 'auto', libraryRoot = './library/', sound = mode !== 'preview' } = {}) {
    Object.assign(this, { host, data, mode, fullscreen, mapIndex: map, onExit, onEvent, title, quality, libraryRoot, soundOn: sound });
    this.keys = new Set();
    this.paused = false;
    this.score = 0;
    this.yaw = 0;
    this.closed = false;
    this.t = 0;
    this.spriteFrames = new Map();
    this.gltf = new Map();
  }

  get style() {
    return this.data.style;
  }

  async open() {
    this.root = document.createElement('div');
    this.root.className = 'sg-root';
    this.root.tabIndex = -1;
    this.root.style.cssText = this.fullscreen ? 'position:fixed;inset:0;z-index:200;background:#0d1020;outline:none' : 'position:absolute;inset:0;overflow:hidden;background:#0d1020;outline:none';
    this.host.append(this.root);
    const pixel = this.style.animation === 'pixel';
    this.renderer = new THREE.WebGLRenderer({ antialias: !pixel, powerPreference: 'high-performance', preserveDrawingBuffer: this.mode === 'preview' });
    configureRenderer(this.renderer, { look: this.style.look, pixel, quality: this.quality });
    this.renderer.domElement.style.cssText += ';display:block;width:100%;height:100%';
    this.root.append(this.renderer.domElement);
    if (this.mode !== 'preview') {
      const hint = hintItems(CONTROLS).map((r) => `${r.keys.join('/')} ${r.does.split(' (')[0]}`).join(' · ');
      this.hud = new StudioHud(this.root, {
        hint,
        credits: () => creditsOf(this.data),
        onResume: () => this.setPaused(false),
        onRestart: () => {
          this.setPaused(false);
          this.loadMap(this.mapIndex);
        },
        onLeave: this.onExit ? () => this.close() : null
      });
      this.help = new HelpPanel({ host: this.root, id: 'studio-game', table: CONTROLS, onOpen: () => this.setPaused(true, false), onClose: () => this.setPaused(false) });
      // Keys go to the game's own box (focused when it opens and on every click), so typing
      // anywhere else on the page — the Studio's chat box — never moves the player.
      this._down = (e) => this.key(e, true);
      this._up = (e) => this.key(e, false);
      this._blur = () => this.keys.clear();
      this.root.addEventListener('keydown', this._down);
      this.root.addEventListener('keyup', this._up);
      this.root.addEventListener('focusout', this._blur);
      this._bindPointer();
    }
    this._resize = () => this.resize();
    this._ro = new ResizeObserver(this._resize);
    this._ro.observe(this.root);
    this.loadMap(this.mapIndex);
    if (this.mode === 'play' && this.fullscreen) this.help?.openFirstTime();
    this._last = performance.now();
    this.renderer.setAnimationLoop((t) => this.frame(t));
    if (this.fullscreen) this.root.focus();
  }

  /** Keys reach the game from its own box — never while typing in a field inside it. */
  _listening(e) {
    const tag = e.target?.tagName;
    return !(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable);
  }

  key(e, down) {
    if (!this._listening(e)) return;
    e.stopPropagation();
    if (down && codes('help').includes(e.code)) {
      e.preventDefault();
      return this.help.toggle();
    }
    if (down && codes('pause').includes(e.code)) {
      e.preventDefault();
      return this.setPaused(!this.paused);
    }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (down) {
      if (!this.keys.has(e.code)) {
        if (codes('attack').includes(e.code)) this.attack();
        if (codes('jump').includes(e.code)) {
          if (this.data.rules.jump) this.jump();
          else this.attack();
        }
      }
      this.keys.add(e.code);
    } else this.keys.delete(e.code);
  }

  _bindPointer() {
    const el = this.renderer.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.root.focus();
      down = { x: e.clientX, y: e.clientY, yaw: this.yaw, moved: false };
      el.setPointerCapture?.(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (Math.abs(dx) + Math.abs(e.clientY - down.y) > 6) down.moved = true;
      if (down.moved && this.style.render === 'full3d') this.yaw = down.yaw - dx * 0.008;
    });
    el.addEventListener('pointerup', () => {
      if (down && !down.moved && !this.paused) this.attack();
      down = null;
    });
  }

  setPaused(on, card = true) {
    this.paused = on;
    this.keys.clear();
    this.hud?.pause(on && card);
  }

  sound(event) {
    if (!this.soundOn) return;
    const id = this.data.audio.sfx[event];
    if (id && id !== 'none') playSound(id);
  }

  resize() {
    const w = this.root.clientWidth || 320;
    const h = this.root.clientHeight || 200;
    this.renderer.setSize(w, h, false);
    if (this.camera?.isPerspectiveCamera) this.camera.aspect = w / h;
    if (this.camera?.isOrthographicCamera) {
      const view = this.mode === 'preview' ? 14 : 18;
      Object.assign(this.camera, { left: (-view * w) / h / 2, right: (view * w) / h / 2, top: view / 2, bottom: -view / 2 });
    }
    this.camera?.updateProjectionMatrix();
    this.draw?.setSize(w, h);
  }

  /* ---------------------------------------------------------------- maps */

  /** Build map `i` (everything from the last one is let go first). */
  loadMap(i) {
    this.unloadMap();
    const maps = this.data.maps.maps;
    this.mapIndex = Math.max(0, Math.min(maps.length - 1, i));
    const map = maps[this.mapIndex];
    this.map = map;
    const render = this.style.render;
    const side = render === 'painted';
    const look = this.style.look;
    const palette = this.style.palette;
    this.layout = layoutMap(map, { goal: this.data.rules.goal, side });
    const L = this.layout;
    const scene = new THREE.Scene();
    this.scene = scene;
    const colors = colorsFor(map, palette);
    scene.background = new THREE.CanvasTexture(skyCanvas(colors.sky[0], colors.sky[1], { stars: map.time === 'night' || map.biome === 'space' }));
    scene.background.colorSpace = THREE.SRGBColorSpace;
    const fogFar = render === 'flat2d' ? 400 : map.weather === 'fog' ? 30 : 140;
    if (render !== 'flat2d') scene.fog = new THREE.Fog(colors.fog, map.weather === 'fog' ? 6 : 40, fogFar);
    const span = side ? 30 : L.half + 6;
    this.lights = addLights(scene, this.renderer, { look, time: map.time, biome: map.biome, quality: this.quality, span });

    // The camera for the style.
    const aspect = (this.root.clientWidth || 4) / (this.root.clientHeight || 3);
    if (render === 'flat2d') {
      this.camera = new THREE.OrthographicCamera(-9 * aspect, 9 * aspect, 9, -9, 0.1, 100);
      this.camera.up.set(0, 0, -1);
    } else {
      this.camera = new THREE.PerspectiveCamera(render === 'hd2d' ? 30 : render === 'painted' ? 40 : 55, aspect, 0.1, 400);
    }

    // The world.
    const groundRef = map.ground ? this.data.assets.used.find((a) => a.id === map.ground) : null;
    if (render === 'flat2d') {
      const canvas = paintMap2D(L, map, { palette, pixel: this.style.animation === 'pixel', look });
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      if (this.style.animation === 'pixel') tex.magFilter = THREE.NearestFilter;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(L.half * 2, L.half * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex }));
      const outside = new THREE.Mesh(new THREE.PlaneGeometry(L.half * 6, L.half * 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: colors.ground2 }));
      outside.position.y = -0.05;
      scene.add(outside, plane);
      const door = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffe8a0', transparent: true, opacity: 0.35 }));
      door.position.set(L.exit.x, 0.06, L.exit.z);
      scene.add(door);
      const markers = L.markers.map((p) => {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.8, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#8ae8ff' }));
        m.position.set(p.x, 0.07, p.z);
        scene.add(m);
        return m;
      });
      this.world = {
        markers,
        openDoor: (open) => {
          door.material.opacity = open ? 0.95 : 0.35;
          door.material.color.set(open ? '#fff07a' : '#ffe8a0');
        },
        update: (dt, t) => door.scale.setScalar(1 + Math.sin(t * 4) * 0.06),
        dispose: () => {
          tex.dispose();
          for (const o of [plane, outside, door, ...markers]) {
            o.geometry.dispose();
            o.material.dispose();
          }
        }
      };
    } else {
      let groundTexture = null;
      if (groundRef?.file && (groundRef.kind === 'texture')) groundTexture = new THREE.TextureLoader().load(`${this.libraryRoot}${groundRef.file.split('/').map(encodeURIComponent).join('/')}`);
      this.world = buildWorld3D(L, map, { look, palette, side, groundTexture });
      scene.add(this.world.group);
      if (side) this._buildBackdrop(map);
    }
    this.weather = makeWeather(scene, map.weather, { area: side ? 50 : 34 });

    // Things to collect.
    this.collectGeo = collectGeometry(map.collectible);
    this.collectMat = lookMaterial(look, collectColor(map.collectible), map.collectible === 'coin' || map.collectible === 'key' ? 'metal' : 'shiny');
    this.collectMat.emissive = new THREE.Color(collectColor(map.collectible));
    this.collectMat.emissiveIntensity = 0.35;
    this.items = L.collectibles.map((p) => {
      const m = new THREE.Mesh(this.collectGeo, this.collectMat);
      m.position.set(p.x, render === 'flat2d' ? 0.2 : 0.7, p.z);
      if (render === 'flat2d') m.rotation.x = -Math.PI / 2;
      m.castShadow = true;
      scene.add(m);
      return { x: p.x, z: p.z, mesh: m, taken: false };
    });

    // The player and everyone else.
    const P = this.data.cast.player;
    this.player = this.makeEntity(P, L.start.x, L.start.z, { player: true });
    this.player.hp = this.data.rules.lives;
    this.player.maxHp = this.data.rules.lives;
    this.player.speed = this.data.rules.playerSpeed;
    const byId = new Map(this.data.cast.characters.map((c) => [c.id, c]));
    this.entities = L.spawns.map((s) => byId.get(s.cast)).map((c, k) => (c ? this.makeEntity(c, L.spawns[k].x, L.spawns[k].z) : null)).filter(Boolean);
    this._loadProps();
    this.visited = new Set();
    this.timeLeft = this.data.rules.timeLimit || (this.data.rules.goal === 'survive' ? 60 : 0);
    this.doorOpen = false;
    this.world.openDoor?.(false);
    this.camPos = null;
    this.resize();
    if (this.mode !== 'preview') {
      const track = map.music ?? this.data.audio.music;
      if (this.mode === 'play' && track && track !== 'none') music.play(track).catch(() => {});
      this.hud?.toast(map.name, 1600);
      if (map.story) this.hud?.talk(map.story);
      this._storyUntil = map.story ? 5 : 0;
    }
    this.onEvent('map', { index: this.mapIndex, id: map.id });
  }

  _buildBackdrop(map) {
    const layers = paintBackdrop(map, { palette: this.style.palette, look: this.style.look });
    this.backdrop = layers.map((l) => {
      const tex = new THREE.CanvasTexture(l.canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      const width = l.depth * 3.2;
      // Height and how far below the ground each layer starts, so its lower edge hides behind the land.
      const [height, bottom] = { 60: [34, -8], 30: [18, -4], 16: [9, -2] }[l.depth] ?? [l.depth * 0.6, -2];
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
      mesh.position.set(0, bottom + height / 2, -l.depth);
      mesh.renderOrder = -10 + l.depth * -0.01;
      this.scene.add(mesh);
      return { mesh, tex, depth: l.depth, width };
    });
  }

  _loadProps() {
    const refs = new Map(this.data.assets.used.map((a) => [a.id, a]));
    this.propObjects = [];
    for (const p of this.layout.props) {
      const ref = refs.get(p.asset);
      const holder = new THREE.Group();
      holder.position.set(p.x, 0, p.z);
      holder.rotation.y = p.rot;
      this.scene.add(holder);
      this.propObjects.push(holder);
      const file = ref?.file;
      if (!file || !/\.(glb|gltf)$/i.test(file)) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), lookMaterial(this.style.look, '#c89858'));
        box.position.y = 0.4;
        box.castShadow = true;
        holder.add(box);
        continue;
      }
      this._gltf(file).then((scene) => {
        if (this.closed || !holder.parent) return;
        const obj = scene.clone(true);
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3());
        const k = (1.6 * p.s) / Math.max(0.2, size.x, size.y, size.z);
        obj.scale.setScalar(k);
        obj.position.y = -box.min.y * k;
        obj.traverse((o) => {
          if (o.isMesh) o.castShadow = o.receiveShadow = true;
        });
        holder.add(obj);
      }).catch(() => {});
    }
  }

  _gltf(file) {
    if (!this.gltf.has(file)) {
      const url = `${this.libraryRoot}${file.split('/').map(encodeURIComponent).join('/')}`;
      this.gltf.set(file, new GLTFLoader().loadAsync(url).then((g) => g.scene));
    }
    return this.gltf.get(file);
  }

  /** One character in the world, drawn the game's way (3D model, sprite, or pre-rendered sprite). */
  makeEntity(char, x, z, { player = false } = {}) {
    const render = this.style.render;
    const anim = this.style.animation;
    const e = { char, x, z, y: 0, vy: 0, vx: 0, vz: 0, home: { x, z }, hp: char.health, maxHp: char.health, speed: char.speed, r: 0.45 * char.size, facing: 0, moving: 0, attackT: 0, hurtT: 0, invuln: 0, alive: true, player, seed: Math.random() * 10, wander: null, boss: char.role === 'boss', friend: char.role === 'npc' || char.role === 'ally' };
    if (render === 'full3d' || render === 'painted') {
      const built = buildCharacter(char, { look: this.style.look });
      e.view = { kind: 'mesh', obj: built.group, rig: built.rig };
      this.scene.add(built.group);
      // A character made from a library model: the model stands in for the procedural body
      // (moved by the animation style as a whole — hops, squash, sway; no retargeted clips yet).
      const ref = char.model ? this.data.assets.used.find((a) => a.id === char.model) : null;
      if (ref?.file && /\.(glb|gltf)$/i.test(ref.file)) {
        this._gltf(ref.file).then((scene) => {
          if (this.closed || !built.group.parent) return;
          const obj = scene.clone(true);
          const box = new THREE.Box3().setFromObject(obj);
          const k = 1.5 / Math.max(0.1, box.getSize(new THREE.Vector3()).y);
          obj.scale.setScalar(k);
          obj.position.y = -box.min.y * k;
          obj.traverse((o) => {
            if (o.isMesh) o.castShadow = o.receiveShadow = true;
          });
          for (const child of built.rig.root.children) child.visible = false;
          built.rig.root.add(obj);
        }).catch(() => {});
      }
    } else {
      let frames = this.spriteFrames.get(char.id + (player ? ':p' : ''));
      if (!frames) {
        frames = anim === 'pixel' ? pixelFrames(char) : prerenderFrames(this.renderer, char, this.style.look, anim);
        this.spriteFrames.set(char.id + (player ? ':p' : ''), frames);
      }
      const canvas = document.createElement('canvas');
      canvas.width = frames.width;
      canvas.height = frames.height;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      if (anim === 'pixel') tex.magFilter = tex.minFilter = THREE.NearestFilter;
      const h = 1.5 * char.size;
      const w = (h * frames.width) / frames.height;
      const geo = new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0);
      const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 });
      if (render === 'flat2d') {
        mat.dispose();
        const basic = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4 });
        const mesh = new THREE.Mesh(geo, basic);
        mesh.rotation.x = -Math.PI / 2;
        const holder = new THREE.Group();
        holder.add(mesh);
        // A soft shadow under the sprite.
        const shadow = new THREE.Mesh(new THREE.CircleGeometry(w * 0.32, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
        shadow.position.set(0, 0.02, -0.05);
        holder.add(shadow);
        this.scene.add(holder);
        e.view = { kind: 'sprite', obj: holder, mesh, canvas, ctx: canvas.getContext('2d'), tex, frames, last: null, flat: true };
      } else {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        this.scene.add(mesh);
        e.view = { kind: 'sprite', obj: mesh, mesh, canvas, ctx: canvas.getContext('2d'), tex, frames, last: null };
      }
    }
    e.view.obj.position.set(x, 0, z);
    return e;
  }

  unloadMap() {
    if (!this.scene) return;
    this.weather?.dispose();
    this.lights?.dispose();
    this.world?.dispose?.();
    for (const e of [this.player, ...(this.entities ?? [])].filter(Boolean)) this._disposeEntity(e);
    for (const b of this.backdrop ?? []) {
      b.tex.dispose();
      b.mesh.geometry.dispose();
      b.mesh.material.dispose();
    }
    this.backdrop = null;
    this.collectGeo?.dispose();
    this.collectMat?.dispose();
    this.scene.background?.dispose?.();
    this.draw?.dispose();
    this.draw = null;
    this.scene = null;
  }

  _disposeEntity(e) {
    const v = e.view;
    if (!v) return;
    v.obj.parent?.remove(v.obj);
    if (v.kind === 'mesh') v.obj.userData.dispose?.();
    else {
      v.tex.dispose();
      v.obj.traverse((o) => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
    }
    e.view = null;
  }

  /* ---------------------------------------------------------------- play */

  attack() {
    const p = this.player;
    if (!p || p.attackT > 0 || this.paused) return;
    p.attackT = 0.35;
    this.sound('attack');
    for (const e of this.entities) {
      if (!e.alive || e.friend) continue;
      const dx = e.x - p.x;
      const dz = e.z - p.z;
      const d = Math.hypot(dx, dz);
      const ahead = d < 0.01 ? 1 : (Math.sin(p.facing) * dx + Math.cos(p.facing) * dz) / d;
      if (d < 1.0 + e.r || (d < 1.8 + e.r && ahead > 0.2)) {
        e.hp -= 1;
        e.hurtT = 0.3;
        e.vx += (dx / Math.max(d, 0.1)) * 6;
        e.vz += (dz / Math.max(d, 0.1)) * 6;
        this.sound('hit');
        if (e.hp <= 0) this.defeat(e);
      }
    }
  }

  jump() {
    const p = this.player;
    if (!p || p.y > 0.01 || this.paused) return;
    p.vy = 7.5;
    this.sound('jump');
  }

  defeat(e) {
    e.alive = false;
    this.score += e.boss ? 100 : 10;
    this.sound(e.boss ? 'powerup' : 'coin');
    this._disposeEntity(e);
    this.onEvent('defeat', { id: e.char.id });
  }

  hurt(amount) {
    const p = this.player;
    if (p.invuln > 0 || amount <= 0) return;
    p.hp -= amount;
    p.invuln = 1.2;
    p.hurtT = 0.3;
    this.sound('hurt');
    if (p.hp <= 0) {
      this.sound('lose');
      if (this.mode === 'preview') return this.loadMap(this.mapIndex);
      this.hud?.toast('Oops! Try again', 1600);
      this.loadMap(this.mapIndex);
    }
  }

  /** Has this map's goal been met? */
  goalMet() {
    const goal = this.data.rules.goal;
    const foes = this.entities.filter((e) => !e.friend);
    const left = (list) => list.filter((e) => e.alive).length;
    switch (goal) {
      case 'collect': return this.items.every((i) => i.taken);
      case 'defeat': return left(foes) === 0;
      case 'boss': {
        const bosses = foes.filter((e) => e.boss);
        return bosses.length ? left(bosses) === 0 : this.items.every((i) => i.taken);
      }
      case 'survive': return this.timeLeft <= 0;
      case 'explore': return this.layout.markers.every((_, k) => this.visited.has(k));
      default: return true;
    }
  }

  goalLine() {
    const goal = this.data.rules.goal;
    const foes = this.entities.filter((e) => !e.friend);
    const n = (list) => list.filter((e) => e.alive).length;
    if (this.doorOpen) return 'The door is open — step through!';
    switch (goal) {
      case 'collect': return `${this.items.filter((i) => i.taken).length} / ${this.items.length} collected`;
      case 'defeat': return `${n(foes)} monsters left`;
      case 'boss': return foes.some((e) => e.boss) ? 'Defeat the boss!' : `${this.items.filter((i) => i.taken).length} / ${this.items.length} collected`;
      case 'survive': return `Stay safe: ${Math.ceil(this.timeLeft)} s`;
      case 'explore': return `${this.visited.size} / ${this.layout.markers.length} places visited`;
      default: return goalText(goal);
    }
  }

  input() {
    if (this.mode === 'preview') return this.autopilot();
    if (this.paused) return { x: 0, z: 0 };
    const any = (id) => codes(id).some((c) => this.keys.has(c));
    let x = (any('right') ? 1 : 0) - (any('left') ? 1 : 0);
    let z = (any('down') ? 1 : 0) - (any('up') ? 1 : 0);
    if (this.style.render === 'full3d' && (x || z)) {
      const c = Math.cos(this.yaw);
      const s = Math.sin(this.yaw);
      [x, z] = [x * c + z * s, -x * s + z * c];
    }
    return { x, z };
  }

  /** The style previews play themselves: walk to the nearest thing to collect, swing at monsters. */
  autopilot() {
    const p = this.player;
    const target = this.items.filter((i) => !i.taken).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0] ?? this.layout.exit;
    const near = this.entities.find((e) => e.alive && !e.friend && Math.hypot(e.x - p.x, e.z - p.z) < 1.8);
    if (near && Math.random() < 0.05) this.attack();
    const dx = target.x - p.x;
    const dz = target.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) return { x: 0, z: 0 };
    return { x: dx / d, z: dz / d };
  }

  frame(now) {
    if (this.closed || !this.scene) return;
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    if (!this.paused) this.step(dt);
    this.updateCamera(dt);
    this.updateViews();
    if (!this.draw) {
      const w = this.root.clientWidth || 320;
      const h = this.root.clientHeight || 200;
      this.draw = makeDraw(this.renderer, this.scene, this.camera, { look: this.style.look, quality: this.mode === 'preview' ? 'low' : this.quality, width: w, height: h });
      this.draw.setSize(w, h);
    }
    this.draw.render();
  }

  step(dt) {
    this.t += dt;
    const t = this.t;
    const L = this.layout;
    const p = this.player;
    const rules = this.data.rules;
    const diff = DIFF[rules.difficulty] ?? DIFF.normal;
    const side = L.kind === 'side';

    // The player.
    const inp = this.input();
    const len = Math.hypot(inp.x, inp.z);
    const ice = onIce(L, p.x, p.z);
    const want = { x: len ? (inp.x / len) * p.speed : 0, z: len ? (inp.z / len) * p.speed * (side ? 0.6 : 1) : 0 };
    const grip = ice ? 2.5 : 14;
    p.vx += (want.x - p.vx) * Math.min(1, grip * dt);
    p.vz += (want.z - p.vz) * Math.min(1, grip * dt);
    p.moving = Math.min(1, Math.hypot(p.vx, p.vz) / Math.max(1, p.speed));
    if (len) p.facing = Math.atan2(inp.x, inp.z);
    if (rules.jump) {
      p.vy -= 22 * dt;
      p.y = Math.max(0, p.y + p.vy * dt);
      if (p.y === 0) p.vy = 0;
    }
    const moved = collide(L, p.x + p.vx * dt, p.z + p.vz * dt, p.r, { jumping: p.y > 0.4 });
    p.x = moved.x;
    p.z = moved.z;
    p.attackT = Math.max(0, p.attackT - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    for (const h of L.hazards) if (p.y < 0.4 && Math.hypot(p.x - h.x, p.z - h.z) < h.r) this.hurt(1);

    // Things to collect.
    for (const it of this.items) {
      if (it.taken) continue;
      it.mesh.rotation[this.style.render === 'flat2d' ? 'z' : 'y'] = t * 2.5;
      if (this.style.render !== 'flat2d') it.mesh.position.y = 0.7 + Math.sin(t * 3 + it.x) * 0.12;
      if (Math.hypot(it.x - p.x, it.z - p.z) < 0.8 + p.r) {
        it.taken = true;
        it.mesh.visible = false;
        this.score += 1;
        this.sound('coin');
      }
    }
    L.markers.forEach((m, k) => {
      if (!this.visited.has(k) && Math.hypot(m.x - p.x, m.z - p.z) < 1.4) {
        this.visited.add(k);
        this.sound('powerup');
        if (this.world.markers?.[k]) this.world.markers[k].visible = false;
      }
    });

    // Everyone else.
    let talk = null;
    let boss = null;
    for (const e of this.entities) {
      if (!e.alive) continue;
      const dx = p.x - e.x;
      const dz = p.z - e.z;
      const d = Math.hypot(dx, dz);
      const speed = e.speed * (e.friend ? 1 : diff.speed);
      let goal = null;
      const wander = () => {
        if (!e.wander || Math.hypot(e.wander.x - e.x, e.wander.z - e.z) < 0.4 || Math.random() < 0.004) e.wander = { x: e.home.x + (Math.random() - 0.5) * 8, z: e.home.z + (Math.random() - 0.5) * (side ? 3 : 8) };
        return { ...e.wander, k: 0.5 };
      };
      switch (e.char.behaviour) {
        case 'chase': goal = d < 13 && !e.friend ? { x: p.x, z: p.z, k: 1 } : wander(); break;
        case 'guard': goal = d < 5 && !e.friend ? { x: p.x, z: p.z, k: 1 } : Math.hypot(e.x - e.home.x, e.z - e.home.z) > 1 ? { ...e.home, k: 0.6 } : null; break;
        case 'patrol': goal = { x: e.home.x + Math.sin(t * 0.5 + e.seed) * 4, z: e.home.z, k: 0.6 }; break;
        case 'flee': goal = d < 6 ? { x: e.x - dx, z: e.z - dz, k: 1 } : wander(); break;
        case 'idle': goal = null; break;
        default: goal = d < 5 && !e.friend ? { x: p.x, z: p.z, k: 0.9 } : wander();
      }
      let vx = 0;
      let vz = 0;
      if (goal && e.hurtT <= 0) {
        const gx = goal.x - e.x;
        const gz = goal.z - e.z;
        const gd = Math.hypot(gx, gz);
        if (gd > 0.2) {
          vx = (gx / gd) * speed * goal.k;
          vz = (gz / gd) * speed * goal.k;
          e.facing = Math.atan2(gx, gz);
        }
      } else if (e.friend && d < 4) e.facing = Math.atan2(dx, dz);
      e.vx *= Math.max(0, 1 - 8 * dt);
      e.vz *= Math.max(0, 1 - 8 * dt);
      const next = collide(L, e.x + (vx + e.vx) * dt, e.z + (vz + e.vz) * dt, e.r);
      e.moving = Math.min(1, Math.hypot(vx, vz) / Math.max(1, speed));
      e.x = next.x;
      e.z = next.z;
      e.hurtT = Math.max(0, e.hurtT - dt);
      if (!e.friend && e.char.damage > 0 && d < e.r + p.r + 0.1 && p.y < 0.6) this.hurt(Math.max(1, Math.round(e.char.damage * diff.damage)));
      if (e.friend && e.char.line && d < 2.6) talk = `${e.char.name}: ${e.char.line}`;
      if (e.boss && d < 18) boss = e;
    }

    // Time, the door, the next map.
    if (this.timeLeft > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0 && rules.goal !== 'survive' && rules.timeLimit > 0) {
        this.hud?.toast("Time's up! Try again");
        return this.loadMap(this.mapIndex);
      }
    }
    if (!this.doorOpen && this.goalMet()) {
      this.doorOpen = true;
      this.world.openDoor?.(true);
      this.sound('door');
      this.hud?.toast('The door is open!');
    }
    if (this.doorOpen && Math.hypot(p.x - L.exit.x, p.z - L.exit.z) < 1.4) return this.nextMap();
    this.world.update?.(dt, t);
    this.weather.update(dt, p, t);
    this.lights.update(p);
    if (this._storyUntil > 0) {
      this._storyUntil -= dt;
      if (this._storyUntil <= 0) this.hud?.talk(null);
    }
    if (this.hud) {
      if (this._storyUntil <= 0) this.hud.talk(talk);
      this.hud.boss(boss ? boss.char.name : null, boss ? boss.hp / boss.maxHp : 0);
      this.hud.status({ hearts: p.hp, maxHearts: p.maxHp, score: this.score, mapName: `${this.map.name} (${this.mapIndex + 1}/${this.data.maps.maps.length})`, goal: this.goalLine() });
      this.hud.minimap({
        area: L.area,
        player: p,
        foes: this.entities.filter((e) => e.alive),
        items: this.items.filter((i) => !i.taken),
        door: L.exit,
        doorOpen: this.doorOpen,
        markers: L.markers.filter((_, k) => !this.visited.has(k)),
        water: L.water
      });
    }
  }

  nextMap() {
    this.sound('win');
    if (this.mapIndex + 1 < this.data.maps.maps.length) return this.loadMap(this.mapIndex + 1);
    if (this.mode === 'preview') return this.loadMap(0);
    this.onEvent('finish', { score: this.score });
    this.setPaused(true, false);
    const buttons = [['Play again', () => {
      this.score = 0;
      this.setPaused(false);
      this.loadMap(0);
    }], ['Credits', () => this.hud.showCredits(() => this.nextMapCard())]];
    if (this.onExit) buttons.push(['Leave', () => this.close()]);
    this._endButtons = buttons;
    this.nextMapCard();
  }

  nextMapCard() {
    this.hud?.card(`<b style="font-size:22px">You did it! 🎉</b><div>Score ★ ${this.score}</div>`, this._endButtons);
  }

  updateCamera(dt) {
    const p = this.player;
    const render = this.style.render;
    const cam = this.camera;
    let want;
    let look;
    if (render === 'flat2d') {
      const L = this.layout;
      const hx = Math.max(0, L.half - (cam.right - cam.left) / 2);
      const hz = Math.max(0, L.half - (cam.top - cam.bottom) / 2);
      want = new THREE.Vector3(Math.max(-hx, Math.min(hx, p.x)), 40, Math.max(-hz, Math.min(hz, p.z)));
      look = new THREE.Vector3(want.x, 0, want.z);
    } else if (render === 'hd2d') {
      want = new THREE.Vector3(p.x, 15, p.z + 17);
      look = new THREE.Vector3(p.x, 0.8, p.z);
    } else if (render === 'painted') {
      want = new THREE.Vector3(p.x, 3.4, 15);
      look = new THREE.Vector3(p.x, 1.4, 0);
    } else {
      const yaw = this.mode === 'preview' ? this.t * 0.15 : this.yaw;
      want = new THREE.Vector3(p.x + Math.sin(yaw) * 9.5, 6.2, p.z + Math.cos(yaw) * 9.5);
      look = new THREE.Vector3(p.x, 1, p.z);
    }
    if (!this.camPos) this.camPos = want.clone();
    this.camPos.lerp(want, Math.min(1, dt * 6));
    cam.position.copy(this.camPos);
    if (render === 'flat2d') cam.lookAt(this.camPos.x, 0, this.camPos.z);
    else cam.lookAt(look.x + (this.camPos.x - want.x), look.y, look.z + (this.camPos.z - want.z));
    for (const b of this.backdrop ?? []) {
      // Parallax: far layers follow the camera most, so they seem to move least.
      const follow = 1 - 8 / b.depth;
      b.mesh.position.x = cam.position.x * follow;
      b.tex.offset.x = (cam.position.x * (1 - follow)) / b.width;
    }
  }

  updateViews() {
    const anim = this.style.animation;
    const all = [this.player, ...this.entities].filter((e) => e?.alive !== false && e?.view);
    for (const e of all) {
      const v = e.view;
      const flash = e.invuln > 0 && Math.floor(this.t * 12) % 2 === 0;
      if (v.kind === 'mesh') {
        v.obj.position.set(e.x, e.y, e.z);
        const turn = e.facing - v.obj.rotation.y;
        v.obj.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * 0.25;
        poseRig(v.rig, anim, { t: this.t, moving: e.moving, attack: e.attackT / 0.35, hurt: e.hurtT / 0.3, air: e.y > 0.05, seed: e.seed });
        v.obj.visible = !flash;
      } else {
        const f = spriteFrame(v.frames, anim, { t: this.t, moving: e.moving, attack: e.attackT / 0.35, seed: e.seed });
        if (f.frame !== v.last) {
          v.ctx.clearRect(0, 0, v.canvas.width, v.canvas.height);
          v.ctx.drawImage(f.frame, 0, 0);
          v.tex.needsUpdate = true;
          v.last = f.frame;
        }
        const left = Math.sin(e.facing) < -0.1;
        if (Math.abs(Math.sin(e.facing)) > 0.1) v.flip = left;
        const sx = (v.flip ? -1 : 1) * f.sx;
        if (v.flat) {
          v.obj.position.set(e.x, 0.05 + (e.z + 100) * 0.0005, e.z + f.lift * 0.3);
          v.mesh.scale.set(sx, f.sy, 1);
          v.mesh.rotation.z = f.tilt;
        } else {
          v.obj.position.set(e.x, e.y + f.lift, e.z);
          v.obj.scale.set(sx, f.sy, 1);
          v.obj.rotation.z = f.tilt;
          v.obj.rotation.y = 0;
        }
        v.obj.visible = !flash;
      }
    }
  }

  /** The current frame as an image (style picker thumbnails). */
  snapshot(type = 'image/jpeg') {
    try {
      this.draw?.render();
      return this.renderer.domElement.toDataURL(type, 0.8);
    } catch {
      return null;
    }
  }

  /** Swap in changed data (the chat box): rebuild the current map. */
  setData(data, { map = this.mapIndex } = {}) {
    this.data = data;
    this.spriteFrames.clear();
    this.loadMap(Math.min(map, data.maps.maps.length - 1));
  }

  close(notify = true) {
    this.dispose();
    if (notify) this.onExit?.();
  }

  dispose() {
    if (this.closed) return;
    this.closed = true;
    this.renderer.setAnimationLoop(null);
    this._ro?.disconnect();
    if (this._down) {
      this.root.removeEventListener('keydown', this._down);
      this.root.removeEventListener('keyup', this._up);
      this.root.removeEventListener('focusout', this._blur);
    }
    if (this.mode === 'play') music.stop?.();
    this.unloadMap();
    this.help?.dispose?.();
    this.hud?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.root.remove();
  }
}

export { PX };
