/**
 * Gloamreach: the starting map of a fantasy RPG — the golden-hour village
 * of Brindlewick, the carved Warden's Gate, the violet Gloamwood beyond, and
 * the Cinder Rift seen from the cliffs — with its people and creatures.
 * No quests yet: walk, run, jump, meet people, look.
 *
 *   const game = new GloamreachGame(document.body, { onClose, account });
 *   await game.open();   …   game.close();
 *
 * map.js / heights.js / collide.js / quality.js / cast.js are pure (tested);
 * world.js builds the scene; life.js runs the people; hero.js and camera.js
 * the player; post.js the look; audio.js the sound; ui.js the screens.
 */
import * as THREE from 'three';
import { TextureBank } from './textures.js';
import { buildWorld } from './world.js';
import { Post } from './post.js';
import { SETTINGS, chooseTier, Governor } from './quality.js';
import { Effects } from './fx.js';
import { Vista } from './vista.js';
import { Life } from './life.js';
import { loadTemplate, Actor, FallbackActor } from './actors.js';
import { Hero } from './hero.js';
import { FollowCamera } from './camera.js';
import { Sound } from './audio.js';
import { HEROES } from './cast.js';
import { START, AREAS, areaAt, OVERLOOK } from './map.js';
import { shared } from './materials.js';
import { paintMap, Minimap } from './minimap.js';
import { Loading, StartScreen, Hud, creditsPanel, pauseMenu, el } from './ui.js';
import './gloamreach.css';

const PREFS = 'gloamreach.prefs';
const prefs = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(PREFS)) ?? {};
    } catch {
      return {};
    }
  },
  save(p) {
    try {
      localStorage.setItem(PREFS, JSON.stringify(p));
    } catch {
      /* private mode */
    }
  }
};

const KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
const HERO_CLIPS = ['JumpStart', 'JumpAir', 'JumpLand', 'Sprint'];

export class GloamreachGame {
  constructor(host, { onClose, account } = {}) {
    this.onClose = onClose;
    this.account = account;
    this.root = el('div', 'gr');
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'application');
    this.root.setAttribute('aria-label', 'Gloamreach');
    (host ?? document.body).append(this.root);
    this.mode = 'loading';
    this.keys = new Set();
    this.closed = false;
    this.debug = new URLSearchParams(location.search).has('debug');
    this.sound = new Sound();
    this.prefs = prefs.load();
    this.picked = HEROES.some((h) => h.id === this.prefs.hero) ? this.prefs.hero : 'knight';
    this.t = 0;
    this.area = null;
    this._onKey = (e) => this.keyDown(e);
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => this.keys.clear();
    this._onMouse = (e) => this.mouseMove(e);
    this._onLock = () => this.lockChanged();
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.addEventListener('mousemove', this._onMouse);
    document.addEventListener('pointerlockchange', this._onLock);
    window.gloamreach = this;
  }

  /* ================================================================ life */

  async open() {
    this.loading = new Loading(this.root);
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer = renderer;
    renderer.domElement.className = 'gr-view';
    this.root.prepend(renderer.domElement);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // A first guess at what this machine can draw; the governor refines it.
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    const q = new URLSearchParams(location.search).get('quality');
    this.tier = SETTINGS[q] ? q : chooseTier({ gpu, memory: navigator.deviceMemory, cores: navigator.hardwareConcurrency, pixels: screen.width * screen.height * devicePixelRatio ** 2, mobile: /Mobi|Android/i.test(navigator.userAgent) });
    this.gpu = gpu;
    this.governor = new Governor(this.tier, { max: q ? q : 'ultra' });
    const settings = { ...SETTINGS[this.tier], msaa: this.tier === 'low' ? 0 : 4 };
    this.settings = settings;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2500);
    this.resize();
    this._resize = new ResizeObserver(() => this.resize());
    this._resize.observe(this.root);

    this.bank = new TextureBank(renderer, { size: this.tier === 'low' ? 512 : 1024 });
    const progress = (label, k) => this.loading?.set(label, k * 0.7);
    this.world = await buildWorld({ renderer, bank: this.bank, settings, onProgress: progress });
    if (this.closed) return;
    const scene = this.world.scene;
    this.scene = scene;
    this.effects = new Effects(this.bank, { fireflies: settings.fireflies });
    scene.add(this.effects.group);
    for (const [id, h] of Object.entries(this.world.spots.homes)) this.effects.addChimney(h.chimney, { rate: 1.6, size: 1.1, dark: 0.75 });
    this.effects.addChimney(this.world.spots.homes.smithy.forge.clone().add(new THREE.Vector3(0, 0.3, 0)), { rate: 3, size: 0.6, dark: 0.35, sparks: 0.5 });
    for (const [x, z, r] of [[0, -300, 9], [-10, -230, 14], [12, -265, 12], [-20, -190, 10], [30, -210, 8]]) this.effects.addWisp(new THREE.Vector3(x, this.world.grid.at(x, z), z), r, Math.random() < 0.5 ? [0.55, 0.85, 1] : [0.9, 0.6, 1]);
    this.loading?.set('Lighting the rift', 0.72);
    this.vista = new Vista();
    await this.vista.build(this.bank, this.effects);
    scene.add(this.vista.group);
    this.loading?.set('Waking the people', 0.78);
    this.life = new Life({ scene, world: this.world, bank: this.bank, effects: this.effects });
    await this.life.load((k) => this.loading?.set('Waking the people', 0.78 + k * 0.17));
    this.loading?.set('Calling the heroes', 0.96);
    this.heroTemplates = {};
    await Promise.all(HEROES.map(async (h) => (this.heroTemplates[h.id] = await loadTemplate(h.model, { detail: this.bank.noise(), borrow: HERO_CLIPS }))));
    if (this.closed) return;
    this.follow = new FollowCamera(this.camera, this.world.colliders);
    this.post = new Post(renderer);
    this.applyTier(this.tier, true);
    this.minimapCanvas = paintMap(this.world.grid, this.world.scattered);
    this.setHero(this.picked);
    // Compile the shaders now, not at the first glance at something.
    this.menuCamera(0);
    this.world.update(0.016, 0, this.camera, this.heroFocus());
    renderer.compile(scene, this.camera);
    this.loading.set('Ready', 1);
    this.loading.hide();
    this.loading = null;
    this.menu();
    let last = performance.now();
    let frames = 0;
    let fpsT = 0;
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      const raw = now - last;
      const dt = Math.min(0.05, raw / 1000);
      last = now;
      frames++;
      fpsT += dt;
      if (fpsT >= 0.5) {
        this.fps = Math.round(frames / fpsT);
        frames = 0;
        fpsT = 0;
      }
      this.frame(dt, raw);
    };
    this._raf = requestAnimationFrame(loop);
    this.ready = true;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    cancelAnimationFrame(this._raf);
    this._resize?.disconnect();
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    window.removeEventListener('mousemove', this._onMouse);
    document.removeEventListener('pointerlockchange', this._onLock);
    if (document.pointerLockElement) document.exitPointerLock();
    this.life?.dispose();
    this.heroActor?.dispose();
    this.effects?.dispose();
    this.world?.dispose();
    this.post?.dispose();
    this.hud?.dispose();
    this.minimap?.dispose();
    this.bank?.dispose();
    this.sound.dispose();
    this.renderer?.dispose();
    this.root.remove();
    if (window.gloamreach === this) delete window.gloamreach;
    this.onClose?.();
  }

  resize() {
    if (!this.renderer) return;
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.settings?.maxDpr ?? 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post?.resize();
  }

  /** Switch quality tier: resolution, shadows, post effects, grass, lights. */
  applyTier(tier, first = false) {
    this.tier = tier;
    const s = { ...SETTINGS[tier], msaa: this.settings.msaa };
    this.settings = s;
    this.resize();
    this.post.configure({ ao: s.ao, rays: s.rays, bloom: s.bloom, smaa: s.smaa || !s.msaa, msaa: s.msaa }, s.scale);
    if (!first) this.world.lighting.setShadow(s.shadow, s.shadowBox);
    this.world.lights.setCount(s.lights);
    for (const l of this.world.foliage.layers) l.uniforms.uDensity.value = Math.min(1, s.grass);
  }

  /* ================================================================ heroes */

  setHero(id) {
    this.picked = id;
    const def = HEROES.find((h) => h.id === id);
    const tpl = this.heroTemplates[id];
    const old = this.hero;
    if (this.heroActor) {
      this.scene.remove(this.heroActor.object);
      this.heroActor.dispose();
    }
    this.heroActor = tpl ? new Actor(tpl, { height: def.height, name: def.name }) : new FallbackActor(def.accent);
    this.scene.add(this.heroActor.object);
    this.hero = new Hero(this.heroActor, {
      colliders: this.world.colliders,
      height: def.height,
      onStep: (surface, speed, p) => {
        this.sound.step(surface, speed);
        if (surface === 'dirt' && speed > 4) this.effects.dust(p, 2, [0.7, 0.6, 0.45]);
      },
      onLand: (hard, surface) => {
        this.sound.step(surface, 6, 1 + hard);
        this.effects.dust(this.hero.pos, 4 + Math.round(hard * 8));
      }
    });
    // Capes need their shoulder height in the model's own units.
    if (this.hero.capeU && tpl) this.hero.capeU.value.w = (tpl.natural ?? 1.8) * 0.8;
    if (old && this.mode === 'play') this.hero.place(old.pos.x, old.pos.z, old.yaw);
    else this.hero.place(1, 26, 0);
  }

  heroFocus() {
    return this.hero ? this.hero.pos.clone() : new THREE.Vector3(START.x, 0, START.z);
  }

  /* ================================================================ screens */

  menu() {
    this.mode = 'menu';
    this.hero.place(1, 26, 0);
    this.start = new StartScreen(this.root, {
      picked: this.picked,
      onPick: (id) => {
        this.sound.wake();
        this.sound.tick();
        this.setHero(id);
        this.hero.place(1, 26, 0);
        this.prefs.hero = id;
        prefs.save(this.prefs);
      },
      onBegin: () => this.begin(),
      onCredits: () => this.credits(),
      onClose: () => this.close()
    });
    this.root.focus();
  }

  menuCamera(t) {
    // In front of the hero in the square, the Elder Oak and the houses behind.
    const a = Math.sin(t * 0.12) * 0.22;
    const p = this.hero.pos;
    this.camera.position.set(p.x + Math.sin(a) * 4.6 + 0.8, p.y + 1.45, p.z + Math.cos(a) * 4.6);
    this.camera.lookAt(p.x - 0.9, p.y + 1.2, p.z - 1);
    this.camera.fov = 45;
    this.camera.updateProjectionMatrix();
  }

  begin() {
    this.sound.wake();
    this.sound.tick();
    this.start?.hide();
    this.start = null;
    this.hero.place(START.x, START.z, START.yaw);
    this.follow.yaw = START.yaw + Math.PI;
    this.follow.pitch = 0.16;
    this.follow.pivot.set(0, 0, 0);
    this.camera.fov = 55;
    this.camera.updateProjectionMatrix();
    this.hud = new Hud(this.root, { debug: this.debug });
    this.minimap = new Minimap(this.hud.el, this.minimapCanvas);
    this.mode = 'play';
    this.area = null;
    this.root.focus();
  }

  credits() {
    this.sound.tick();
    this.creditsOpen = creditsPanel(this.root, () => {
      this.creditsOpen = null;
      this.root.focus();
    });
  }

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'paused';
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    this.pauseEl = pauseMenu(this.root, {
      tier: this.tier,
      soundOn: this.sound.enabled,
      onResume: () => this.resume(),
      onCredits: () => this.credits(),
      onSound: () => {
        this.sound.setEnabled(!this.sound.enabled);
        return this.sound.enabled;
      },
      onLeave: () => this.close()
    });
  }

  resume() {
    this.pauseEl?.remove();
    this.pauseEl = null;
    this.mode = 'play';
    this.root.focus();
  }

  /* ================================================================ input */

  keyDown(e) {
    if (this.closed) return;
    if (e.code === 'Escape') {
      if (this.creditsOpen) this.creditsOpen.close();
      else if (this.mode === 'play') this.pause();
      else if (this.mode === 'paused') this.resume();
      return;
    }
    if (this.mode !== 'play') return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyH') this.hud?.showHint();
    this.keys.add(e.code);
  }

  mouseMove(e) {
    if (this.mode !== 'play') return;
    if (document.pointerLockElement === this.renderer.domElement || e.buttons & 3) this.follow.look(e.movementX, e.movementY);
  }

  lockChanged() {
    // Esc that leaves pointer lock opens the menu, as players expect.
    if (!document.pointerLockElement && this.mode === 'play' && this._locked) this.pause();
    this._locked = Boolean(document.pointerLockElement);
  }

  bindPointer() {
    const c = this.renderer.domElement;
    if (this._bound) return;
    this._bound = true;
    c.addEventListener('click', () => {
      this.sound.wake();
      if (this.mode === 'play' && !document.pointerLockElement) c.requestPointerLock?.()?.catch?.(() => {});
    });
    c.addEventListener('wheel', (e) => {
      if (this.mode === 'play') this.follow.zoom(e.deltaY);
    }, { passive: true });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  input() {
    const k = this.keys;
    const has = (c) => k.has(c);
    let x = 0;
    let z = 0;
    for (const code of k) {
      const v = KEYS[code];
      if (v === 'f') z += 1;
      if (v === 'b') z -= 1;
      if (v === 'l') x -= 1;
      if (v === 'r') x += 1;
    }
    return { x: Math.sign(x), z: Math.sign(z), sprint: has('ShiftLeft') || has('ShiftRight'), walk: has('ControlLeft') || has('ControlRight') || has('KeyC'), jump: has('Space') };
  }

  /* ================================================================ frame */

  frame(dt, rawMs) {
    this.bindPointer();
    this.t += dt;
    const t = this.t;
    const playing = this.mode === 'play';
    if (playing) {
      const inp = this.input();
      this.hero.update(dt, inp, this.follow.heading());
      this.follow.update(dt, this.hero, { sprinting: inp.sprint && this.hero.speed > 5, moving: this.hero.speed > 0.5 });
    } else if (this.mode === 'menu') {
      this.hero.actor.move(0);
      this.hero.actor.update(dt);
      this.menuCamera(t);
    } else {
      this.hero.actor.update(0);
    }
    shared.uPlayer.value.copy(this.hero.pos);
    const focus = this.hero.pos;
    const look = this.world.update(dt, t, this.camera, focus);
    shared.uRimColor.value.copy(this.world.lighting.sun.color).multiplyScalar(0.6);
    shared.uWind.value.set(0.8, 0.6, 1, 0.3 + 0.3 * Math.sin(t * 0.13));
    this.life.update(dt, t, this.camera, playing ? this.hero : null);
    this.vista.update(dt, t, this.camera, { ...look, lightColor: this.world.lighting.sun.color });
    this.effects.update(dt, t, this.camera, { gloam: this.world.gloam, lightColor: this.world.lighting.sun.color, toLight: look.toLight, wind: { x: 0.8, y: 0.6 } });
    // Events: greetings, the smith's hammer, the drake.
    for (const ev of this.life.events) {
      if (ev.type === 'greet' && this.hud) this.hud.say(ev.who.c.id, ev.who.c.greet);
      if (ev.type === 'hammer') {
        this.effects.burst(ev.at, 10, [1, 0.6, 0.2], 3);
        this.sound.clang(ev.at.distanceTo(this.camera.position));
      }
    }
    for (const ev of this.vista.takeEvents()) if (ev.type === 'roar' || ev.type === 'drakeFire') this.sound.roar(ev.at.distanceTo(this.camera.position));
    const rift = THREE.MathUtils.smoothstep(focus.x, 70, 130) * (1 - this.world.gloam);
    this.sound.update(dt, { gloam: this.world.gloam, rift });
    look.bloom = 0.3 + this.world.gloam * 0.12;
    this.post.render(this.scene, this.camera, { ...look, lightColor: this.world.lighting.sun.color, gloam: this.world.gloam, fade: 0 });
    if (playing && this.hud) this.hudFrame(dt);
    // Quality: step down when frames run long, up when there's room.
    if (playing && rawMs > 0 && rawMs < 500) {
      const next = this.governor.frame(rawMs);
      if (next && next !== this.tier) this.applyTier(next);
    }
  }

  hudFrame(dt) {
    const hero = this.hero;
    // The place's banner.
    const area = areaAt(hero.pos.x, hero.pos.z);
    if (area !== this.area) {
      const first = this.area === null;
      this.area = area;
      const a = AREAS.find((x) => x.id === area);
      if (a && (!first || area === 'village')) this.hud.showBanner(a.name, a.sub);
    }
    // Name plates over the nearest people.
    const plates = [];
    const v = new THREE.Vector3();
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    for (const { b, d } of this.life.near(hero.pos, 12).slice(0, 4)) {
      const head = b.actor.object.position.clone();
      const box = b.c.height ?? 1.8;
      head.y += (b.state === 'sit' ? box * 0.75 : box) + 0.35;
      v.copy(head).project(this.camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) continue;
      plates.push({ id: b.c.id, name: b.c.name ?? '', title: b.c.title ?? '', x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, d });
    }
    // At most two plates, the farther nudged up if they'd overlap.
    const shown = plates.filter((p) => p.name).slice(0, 2);
    if (shown.length === 2 && Math.abs(shown[0].x - shown[1].x) < 170 && Math.abs(shown[0].y - shown[1].y) < 50) shown[1].y = Math.min(shown[1].y, shown[0].y) - 52;
    this.hud.update(dt, shown);
    // The minimap, every other frame.
    if ((this._mm = !this._mm)) {
      const dots = [];
      for (const b of this.life.people) dots.push({ x: b.x, z: b.z, color: '#ffd77a', r: 1.8 });
      for (const b of this.life.animals) dots.push({ x: b.x, z: b.z, color: '#e8e8e8', r: 1.4 });
      dots.push({ x: OVERLOOK.x + 4, z: OVERLOOK.z, color: '#ff7a3a', r: 2.2 });
      this.minimap.draw({ x: hero.pos.x, z: hero.pos.z, yawMap: Math.atan2(Math.cos(hero.yaw), Math.sin(hero.yaw)) + Math.PI / 2 }, this.follow.heading(), dots);
    }
    if (this.debug && (this._st = (this._st ?? 0) + dt) > 0.5) {
      this._st = 0;
      const s = this.post.stats ?? {};
      this.hud.setStats(`${this.fps} fps  ${(1000 / Math.max(1, this.fps)).toFixed(1)} ms\ndraws ${s.calls}  tris ${((s.triangles ?? 0) / 1e6).toFixed(2)}M\ntier ${this.tier}  ${this.gpu}\npos ${hero.pos.x.toFixed(1)}, ${hero.pos.z.toFixed(1)}`);
    }
  }

  /* ================================================================ for tests and cover shots */

  /** Frame time with the GPU waited for (ms, mean of `n` frames) and the draw counts — for ?debug and tests. */
  bench(n = 30) {
    const gl = this.renderer.getContext();
    this.frame(1 / 60, 16);
    gl.finish();
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      this.frame(1 / 60, 16);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    }
    const ms = (performance.now() - t0) / n;
    return { ms: Math.round(ms * 100) / 100, calls: this.post.stats?.calls, triangles: this.post.stats?.triangles, tier: this.tier };
  }

  /** Put the hero somewhere, facing `yaw`, the camera behind (pitch, distance optional). */
  teleport(x, z, yaw = Math.PI, { pitch = 0.16, dist = 4.6 } = {}) {
    this.hero.place(x, z, yaw);
    this.follow.yaw = yaw + Math.PI;
    this.follow.pitch = pitch;
    this.follow.wantDist = this.follow.dist = this.follow.cur = dist;
    this.follow.pivot.set(0, 0, 0);
    this.follow.update(0.016, this.hero, {});
  }
}
