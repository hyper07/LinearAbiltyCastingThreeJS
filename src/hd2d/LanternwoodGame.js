import * as THREE from 'three';
import { loadFx, FxPlayer } from '../pixel/fx.js';
import * as R from './rules.js';
import { buildSprites } from './sprites.js';
import { buildWorld } from './world.js';
import { SpriteActor, FxBillboard, disposeTextures, canvasOf } from './gfx.js';
import { Post } from './post.js';
import { Hud, Dialogue, panel, shopHtml, infoHtml, drawMap, titleHtml, CONTROLS_HTML, el, drawMinimap } from './ui.js';
import './hd2d.css';

/**
 * Lanternwood: a small action RPG in the "HD-2D" style — pixel-art people
 * standing upright in a lit 3D night forest, seen from behind and above the
 * hero. The camp's lanterns are going out; five quests lead out into the
 * woods (herbs, slimes, wolves, old braziers) and to the Lampwight in the
 * Greyvault ruins.
 *
 *   const game = new LanternwoodGame(document.body, { onClose });
 *   await game.open();   …   game.close();
 *
 * Rules (stats, damage, quests, save shape, world layout) live in rules.js;
 * the sprites in sprites.js; the scene in world.js; the screen in ui.js.
 */

const FX_IDS = [
  'fire/campfire', 'fire/torch', 'fire/spirit-flame', 'impacts/hit-spark', 'impacts/crit-hit', 'ui/level-up', 'pickups/coin-spin', 'pickups/crystal-shard',
  'pickups/potion', 'spawn/poof', 'holy/heal', 'arcane/mana-burst', 'melee/spin-slash', 'impacts/ground-slam', 'shadow/dark-explosion', 'pickups/collect-burst',
  'explosions/small-explosion', 'spawn/soul-rise'
];
const FIRE_RAMP = ['#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6', '#ffffff'];
const WISP_RAMP = ['#0e2a3a', '#14506a', '#1e7a94', '#2aa6b8', '#4ad0d8', '#7ff0ec', '#b8fff6', '#e8fffc', '#ffffff'];
const TAU = Math.PI * 2;
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const dirOf = (a) => [Math.sin(a), Math.cos(a)];
const HERO_R = 0.42;

const storage = {
  load() {
    try {
      return R.deserialize(localStorage.getItem(R.SAVE_KEY));
    } catch {
      return null;
    }
  },
  save(state) {
    try {
      localStorage.setItem(R.SAVE_KEY, R.serialize(state));
    } catch {
      /* private mode: the journey just isn't kept */
    }
  }
};

export class LanternwoodGame {
  constructor(host, { onClose, account } = {}) {
    this.onClose = onClose;
    this.account = account;
    this.root = el('div', 'ld');
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Lanternwood');
    (host ?? document.body).append(this.root);
    this.mode = 'loading';
    this.keys = new Set();
    this._raf = 0;
    this._onKey = (e) => this._key(e);
    this._onKeyUp = (e) => {
      e.stopPropagation();
      this.keys.delete(e.code);
    };
    this._onBlur = () => this.keys.clear();
    this.root.addEventListener('keydown', this._onKey);
    this.root.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.lanternwood = this;
    this.closed = false;
  }

  /* ================================================================ life */

  async open() {
    this.root.innerHTML = '<div class="ld-loading"><h1>Lanternwood</h1><p>Lighting the lanterns…</p></div>';
    this.root.focus();
    // Effects first (each a small module), then the sprites, then the world.
    const mods = new Map();
    await Promise.all(FX_IDS.map(async (id) => mods.set(id, await loadFx(id))));
    this.makeFx = (id, options = {}) => new FxPlayer(mods.get(id), options);
    await new Promise((r) => setTimeout(r, 0));
    if (this.closed) return;
    this.sprites = buildSprites();
    if (this.closed) return;

    this.root.innerHTML = '';
    const stage = el('div', 'ld-stage');
    this.root.append(stage);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'ld-canvas';
    stage.append(this.canvas);
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 400);

    this.world = buildWorld({ makeFx: this.makeFx, sprites: this.sprites });
    this.scene = this.world.scene;
    this.post = new Post(this.renderer, this.scene, this.camera);
    this._resize = new ResizeObserver(() => this.resize());
    this._resize.observe(this.root);
    this.resize();

    this.hud = new Hud(this.root, this.sprites);
    this.dialogue = new Dialogue(this.root, this.sprites);
    this.effects = [];
    this.projectiles = [];
    this.drops = [];
    this.enemies = [];
    this.shake = 0;
    this.hitstop = 0;
    this.hurtFx = 0;
    this.camYaw = 0;
    this.camDist = 8.4;
    this.camPos = new THREE.Vector3(0, 6, 16);
    this.camLook = new THREE.Vector3();
    this.t = 0;
    this._fpsAcc = [];

    // Shared looping pickups (one animation, many drops).
    this.pickupFx = {
      gold: this.makeFx('pickups/coin-spin'),
      crystal: this.makeFx('pickups/crystal-shard'),
      potion: this.makeFx('pickups/potion')
    };

    // The cast.
    this.npcs = Object.entries(R.NPCS).map(([id, n]) => {
      const a = new SpriteActor({ shadow: 0.42 });
      a.group.position.set(n.x, 0, n.z);
      this.scene.add(a.group);
      return { id, ...n, actor: a, face: n.face, talking: false };
    });
    this.heroActor = new SpriteActor({ shadow: 0.45 });
    this.scene.add(this.heroActor.group);
    this.heroPos = { x: R.WORLD.start.x, z: R.WORLD.start.z, face: R.WORLD.start.face };

    // Telegraph shapes, shared.
    this.ringGeo = new THREE.RingGeometry(0.88, 1, 48).rotateX(-Math.PI / 2);
    this.discGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
    this.arcTex = new THREE.CanvasTexture(canvasOf(64, 16, (g) => {
      const grad = g.createLinearGradient(0, 0, 64, 0);
      grad.addColorStop(0, 'rgba(255,220,150,0)');
      grad.addColorStop(0.7, 'rgba(255,240,200,0.7)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 16);
      g.globalCompositeOperation = 'destination-in';
      const v = g.createLinearGradient(0, 0, 0, 16);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(0.75, 'rgba(0,0,0,1)');
      v.addColorStop(1, 'rgba(0,0,0,0.6)');
      g.fillStyle = v;
      g.fillRect(0, 0, 64, 16);
    }));
    this.glowTex = new THREE.CanvasTexture(canvasOf(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.3, 'rgba(255,255,255,0.5)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    }));
    this.projLight = new THREE.PointLight('#ff8a3a', 0, 12, 1.8);
    this.scene.add(this.projLight);
    // The Lampwight carries its own cold light.
    this.bossLight = new THREE.PointLight('#6ad8ff', 0, 16, 1.6);
    this.scene.add(this.bossLight);

    this._bindPointer();
    this.title();
    let last = performance.now();
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.frame(dt);
    };
    this._raf = requestAnimationFrame(loop);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.mode === 'play' || this.mode === 'dead') this.save();
    cancelAnimationFrame(this._raf);
    this._resize?.disconnect();
    window.removeEventListener('blur', this._onBlur);
    for (const e of this.effects ?? []) e.fx.dispose();
    for (const p of this.projectiles ?? []) this._dropProjectile(p);
    for (const d of this.drops ?? []) d.fx.dispose();
    for (const e of this.enemies ?? []) this._disposeEnemy(e);
    for (const n of this.npcs ?? []) n.actor.dispose();
    this.heroActor?.dispose();
    for (const p of Object.values(this.pickupFx ?? {})) p._texture?.dispose();
    this.ringGeo?.dispose();
    this.discGeo?.dispose();
    this.arcTex?.dispose();
    this.glowTex?.dispose();
    this._slashGeo?.dispose();
    this._whirlGeo?.dispose();
    this.world?.dispose();
    this.post?.dispose();
    disposeTextures();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss?.();
    this.root.remove();
    if (window.lanternwood === this) delete window.lanternwood;
    this.onClose?.();
  }

  resize() {
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.setSize(w, h);
    this.post.tiltH.uniforms.uStrength.value = this.post.tiltV.uniforms.uStrength.value = this.pixelRatio;
    this.size = { w, h };
  }

  /* =============================================================== title */

  title() {
    this.mode = 'title';
    this.overlay = null;
    this.dialogue.close();
    this.hud.show(false);
    this.hud.clearWorld();
    this.root.querySelector('.ld-overlay')?.remove();
    const save = storage.load();
    const wrapEl = el('div', 'ld-overlay ld-overlay--title');
    wrapEl.innerHTML = titleHtml(save);
    this.root.append(wrapEl);
    let look = save?.hero.look ?? 'ember';
    const paint = () => {
      for (const b of wrapEl.querySelectorAll('[data-look]')) b.setAttribute('aria-checked', String(b.dataset.look === look));
      this._applyLook(look);
    };
    for (const b of wrapEl.querySelectorAll('[data-look]')) {
      const c = b.querySelector('canvas');
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      const s = this.sprites.hero[b.dataset.look];
      const f = s.front[0], k = s.back[0];
      g.drawImage(f.canvas, 0, 104 - f.height * 1.25, f.width * 1.25, f.height * 1.25);
      g.drawImage(k.canvas, 88 - k.width * 1.0, 104 - k.height * 1.0 - 2, k.width, k.height);
      b.addEventListener('click', () => {
        look = b.dataset.look;
        paint();
      });
    }
    paint();
    wrapEl.querySelector('[data-close]').addEventListener('click', () => this.close());
    wrapEl.querySelector('[data-new]').addEventListener('click', () => {
      wrapEl.remove();
      this.start(R.newGame(look), true);
    });
    wrapEl.querySelector('[data-continue]')?.addEventListener('click', () => {
      wrapEl.remove();
      this.start(save, false);
    });
    this.titleEl = wrapEl;
  }

  _applyLook(look) {
    this.look = look;
    this.heroActor.show(this.sprites.hero[look].back[0]);
  }

  /** Begin play from a game state (fresh or loaded). */
  start(state, fresh) {
    this.state = state;
    this.hero = state.hero;
    this._applyLook(this.hero.look);
    this.hud.setLook(this.hero.look);
    [this.heroPos.x, this.heroPos.z] = state.pos;
    this.heroPos.face = fresh ? R.WORLD.start.face : this.heroPos.face;
    this.camYaw = wrap(this.heroPos.face + Math.PI);
    this.hv = { kx: 0, kz: 0, roll: 0, rdx: 0, rdz: 0, inv: 0, attack: 0, walkT: 0, moving: false, hurtT: 9 };
    this.cd = { slash: 0, fireball: 0, whirl: 0, roll: 0 };
    // World state from the save.
    for (const i of state.herbsTaken) this.world.takeHerb(i);
    for (const id of state.braziers) this.world.lightBrazier(id);
    this.world.setProgress(R.questsDone(state.quests), R.QUESTS.length);
    // Enemies.
    for (const e of this.enemies) this._disposeEnemy(e);
    this.enemies = [];
    for (const kind of ['slime', 'wolf', 'wisp']) for (const s of R.enemySpawns(kind)) this._spawnEnemy(kind, s.x, s.z);
    this.boss = null;
    this.mode = 'play';
    this.overlay = null;
    this.hud.show(true);
    this.hud.tracker(state.quests);
    this._autosave = 15;
    this._snapCamera();
    this.root.focus();
    if (fresh) {
      this.save();
      setTimeout(() => {
        if (this.mode === 'play' && !this.dialogue.open) this.dialogue.play(R.INTRO, () => this.hud.tracker(this.state.quests), this.look);
      }, 600);
    }
  }

  save() {
    if (!this.state) return;
    this.state.pos = [this.heroPos.x, this.heroPos.z];
    storage.save(this.state);
  }

  /* ============================================================== input */

  _key(e) {
    e.stopPropagation();
    const code = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) e.preventDefault();
    if (e.repeat && !['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) return;
    if (this.mode === 'title') {
      if (code === 'Escape') this.close();
      else if (code === 'Enter') this.titleEl?.querySelector('[data-continue]')?.click() ?? this.titleEl?.querySelector('[data-new]')?.click();
      return;
    }
    if (this.mode === 'ending') {
      if (code === 'Escape' || code === 'Enter') this.root.querySelector('[data-keep]')?.click();
      return;
    }
    if (this.mode !== 'play' && this.mode !== 'dead') return;
    if (this.dialogue.open) {
      if (['Space', 'KeyF', 'Enter', 'NumpadEnter'].includes(code)) this.dialogue.advance();
      else if (code === 'Escape') while (this.dialogue.open) this.dialogue.advance(), this.dialogue.advance();
      return;
    }
    if (this.overlay) {
      if (code === 'Escape' || (code === 'KeyM' && this.overlay === 'map') || (code === 'KeyI' && this.overlay === 'info')) this.closeOverlay();
      else if (this.overlay === 'shop' && /^Digit[1-4]$/.test(code)) this.buy(R.SHOP[Number(code.slice(5)) - 1].id);
      else if (this.overlay === 'shop' && code === 'KeyF') this.closeOverlay();
      return;
    }
    this.keys.add(code);
    if (this.mode === 'dead') return;
    switch (code) {
      case 'Space':
        this.slash();
        break;
      case 'Digit1':
        this.fireball();
        break;
      case 'Digit2':
        this.whirl();
        break;
      case 'Digit3':
        this.drink('hp');
        break;
      case 'Digit4':
        this.drink('mp');
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.roll();
        break;
      case 'KeyF':
        this.interact();
        break;
      case 'KeyI':
        this.openInfo();
        break;
      case 'KeyM':
        this.openMap();
        break;
      case 'Escape':
        this.openPause();
        break;
      default:
    }
  }

  _bindPointer() {
    const c = this.canvas;
    let drag = null;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      this.root.focus();
      if (this.mode !== 'play') return;
      if (this.dialogue.open) {
        this.dialogue.advance();
        return;
      }
      if (this.overlay) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      c.setPointerCapture?.(e.pointerId);
      if (e.button === 0) this.slash();
    });
    c.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      drag.y = e.clientY;
      this.camYaw = wrap(this.camYaw - dx * 0.006);
      this._dragT = 0.6;
    });
    const end = (e) => {
      if (drag?.id === e.pointerId) drag = null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDist = Math.max(6, Math.min(11, this.camDist + Math.sign(e.deltaY) * 0.5));
    }, { passive: false });
  }

  /* ============================================================ overlays */

  closeOverlay() {
    this.root.querySelector('.ld-overlay:not(.ld-overlay--title)')?.remove();
    this.overlay = null;
    this.root.focus();
  }

  openPause() {
    const p = panel(this.root, 'ld-overlay--pause', 'Paused');
    this.overlay = 'pause';
    p.body.innerHTML = `<div class="ld-pause">
      <button type="button" class="ld-btn ld-btn--big ld-btn--go" data-resume>Resume</button>
      <button type="button" class="ld-btn ld-btn--big" data-title>Save and return to title</button>
      <button type="button" class="ld-btn ld-btn--big" data-leave>Save and leave Lanternwood</button>
      ${CONTROLS_HTML}</div>`;
    p.x.addEventListener('click', () => this.closeOverlay());
    p.body.querySelector('[data-resume]').addEventListener('click', () => this.closeOverlay());
    p.body.querySelector('[data-title]').addEventListener('click', () => {
      this.save();
      this.closeOverlay();
      this._resetWorldForTitle();
      this.title();
    });
    p.body.querySelector('[data-leave]').addEventListener('click', () => this.close());
  }

  _resetWorldForTitle() {
    // Rebuild the world, so a different save starts from a clean slate.
    for (const e of this.enemies) this._disposeEnemy(e);
    this.enemies = [];
    this.boss = null;
    for (const p of this.projectiles) this._dropProjectile(p);
    this.projectiles = [];
    for (const d of this.drops) d.fx.dispose();
    this.drops = [];
    this.world.reset();
  }

  openInfo() {
    const p = panel(this.root, 'ld-overlay--info', 'Journal');
    this.overlay = 'info';
    p.body.innerHTML = infoHtml(this);
    p.x.addEventListener('click', () => this.closeOverlay());
  }

  openMap() {
    const p = panel(this.root, 'ld-overlay--map', 'Map of Lanternwood');
    this.overlay = 'map';
    const c = document.createElement('canvas');
    c.width = c.height = 620;
    c.className = 'ld-map';
    p.body.append(c);
    const legend = el('p', 'ld-muted');
    legend.innerHTML = 'White arrow: you · gold ring: where your quest leads · <kbd>M</kbd> closes';
    p.body.append(legend);
    drawMap(c, this);
    this._mapCanvas = c;
    p.x.addEventListener('click', () => this.closeOverlay());
  }

  openShop() {
    const p = panel(this.root, 'ld-overlay--shop', 'Pell’s wares');
    this.overlay = 'shop';
    const paint = () => {
      p.body.innerHTML = shopHtml(this.hero);
      for (const b of p.body.querySelectorAll('[data-buy]')) b.addEventListener('click', () => this.buy(b.dataset.buy));
    };
    this._paintShop = paint;
    paint();
    p.x.addEventListener('click', () => this.closeOverlay());
  }

  buy(id) {
    const r = R.buy(this.hero, id);
    const item = R.SHOP.find((s) => s.id === id);
    if (r.ok) this.hud.log(`Bought: ${item.name}`);
    else this.hud.toast(r.reason, 'warn');
    this._paintShop?.();
    this.save();
  }

  /* ============================================================== world */

  markerFor(npcId) {
    return R.npcMarker(this.state.quests, npcId);
  }

  /** Where the current quest points: its area, or the person to hand it to. */
  questTarget() {
    const cur = R.currentQuest(this.state.quests);
    if (!cur) {
      const next = R.QUESTS.find((q) => this.state.quests[q.id].state === 'available');
      return next ? R.NPCS[next.giver] : null;
    }
    if (cur.state === 'ready') return R.NPCS[cur.quest.giver];
    return R.WORLD.areas[cur.quest.area];
  }

  _spawnEnemy(kind, x, z, summoned = false) {
    const def = R.ENEMIES[kind];
    const actor = new SpriteActor({ shadow: def.radius * (kind === 'lampwight' ? 1.2 : 0.95), glow: kind === 'wisp' ? 0.55 : kind === 'lampwight' ? 0.4 : 0, scale: kind === 'lampwight' ? 1.4 : 1 });
    actor.group.position.set(x, 0, z);
    this.scene.add(actor.group);
    const e = {
      kind, def, x, z, hx: x, hz: z, hp: def.hp, alive: true, state: 'idle', timer: Math.random() * 2, cd: 0, kx: 0, kz: 0, vx: 0, vz: 0,
      tx: x, tz: z, actor, frameT: Math.random(), flip: false, respawn: 0, summoned, phase: 0, lastHit: 99, id: Math.random().toString(36).slice(2)
    };
    this.enemies.push(e);
    return e;
  }

  _disposeEnemy(e) {
    e.actor.dispose();
    if (e.tele) {
      e.tele.ring.material.dispose();
      e.tele.disc.material.dispose();
      e.tele.ring.removeFromParent();
      e.tele.disc.removeFromParent();
    }
  }

  _telegraph(e, x, z, r, k) {
    if (!e.tele) {
      const mk = (geo) => {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ff3a2a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 }));
        m.renderOrder = 3;
        this.scene.add(m);
        return m;
      };
      e.tele = { ring: mk(this.ringGeo), disc: mk(this.discGeo) };
    }
    const { ring, disc } = e.tele;
    ring.visible = disc.visible = k != null;
    if (k == null) return;
    ring.position.set(x, 0.05, z);
    disc.position.set(x, 0.045, z);
    ring.scale.setScalar(r);
    disc.scale.setScalar(Math.max(0.01, r * k));
    ring.material.opacity = 0.55 + 0.35 * Math.sin(this.t * 30);
    disc.material.opacity = 0.35;
  }

  fx(id, x, y, z, { pxm = 48, additive = true, color = 1.6, speed = 1, palette, flip } = {}) {
    const f = new FxBillboard(this.makeFx(id, palette ? { palette } : {}), { pxm, additive, color, speed, flip });
    f.mesh.position.set(x, y, z);
    this.scene.add(f.mesh);
    this.effects.push({ fx: f });
    return f;
  }

  /* ============================================================== combat */

  _nearestEnemy(range, cone = Math.PI) {
    let best = null, bd = Infinity;
    const [fx, fz] = dirOf(this.heroPos.face);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.heroPos.x, dz = e.z - this.heroPos.z;
      const d = Math.hypot(dx, dz);
      if (d > range + e.def.radius) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / (d || 1))));
      if (ang > cone / 2) continue;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  _canAct() {
    return this.mode === 'play' && !this.overlay && !this.dialogue.open && this.hv.roll <= 0;
  }

  slash() {
    if (!this._canAct() || this.cd.slash > 0) return;
    const a = R.ABILITIES.slash;
    this.cd.slash = a.cd;
    // A little aim help: turn toward a foe close in front.
    const near = this._nearestEnemy(3.2, Math.PI * 0.9);
    if (near) this.heroPos.face = Math.atan2(near.x - this.heroPos.x, near.z - this.heroPos.z);
    this.hv.attack = 0.22;
    this._slashArc(this.heroPos.face, a.arc, 2.5, false);
    const [fx, fz] = dirOf(this.heroPos.face);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.heroPos.x, dz = e.z - this.heroPos.z;
      const d = Math.hypot(dx, dz);
      if (d > a.range + e.def.radius) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / (d || 1))));
      if (ang <= a.arc / 2 || d < 0.9) this.hitEnemy(e, a.mult, a.knock);
    }
  }

  fireball() {
    const a = R.ABILITIES.fireball;
    if (!this._canAct() || this.cd.fireball > 0) return;
    if (this.hero.mp < a.mp) {
      this.hud.toast('Not enough mana', 'warn');
      return;
    }
    this.hero.mp -= a.mp;
    this.cd.fireball = a.cd;
    const t = this._nearestEnemy(a.range, Math.PI * 0.45);
    if (t) this.heroPos.face = Math.atan2(t.x - this.heroPos.x, t.z - this.heroPos.z);
    const [dx, dz] = dirOf(this.heroPos.face);
    this.hv.attack = 0.18;
    this._projectile('fire', this.heroPos.x + dx * 0.7, 1.0, this.heroPos.z + dz * 0.7, dx, dz, a.speed);
  }

  whirl() {
    const a = R.ABILITIES.whirl;
    if (!this._canAct() || this.cd.whirl > 0) return;
    if (this.hero.mp < a.mp) {
      this.hud.toast('Not enough mana', 'warn');
      return;
    }
    this.hero.mp -= a.mp;
    this.cd.whirl = a.cd;
    this.hv.attack = 0.35;
    this.hv.spin = 0.4;
    this._slashArc(this.heroPos.face, TAU, a.radius, true);
    this.fx('melee/spin-slash', this.heroPos.x, 0.15, this.heroPos.z, { pxm: 40, color: 1.2, speed: 1.4 });
    this.shake = Math.max(this.shake, 0.25);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - this.heroPos.x, e.z - this.heroPos.z) <= a.radius + e.def.radius) this.hitEnemy(e, a.mult, a.knock);
    }
  }

  /** Potions: no cooldown — each press drinks one, if there is one. */
  drink(kind) {
    if (this.mode !== 'play' || this.overlay || this.dialogue.open) return;
    const r = R.drinkPotion(this.hero, kind);
    if (!r.ok) {
      this.hud.toast(kind === 'hp' ? 'No health potions — Pell sells them' : 'No mana potions — Pell sells them', 'warn');
      return;
    }
    const p = { x: this.heroPos.x, y: 1.9, z: this.heroPos.z };
    this.hud.number(`+${r.restored}`, kind === 'hp' ? 'heal' : 'mana', p);
    if (kind === 'hp') this.fx('holy/heal', this.heroPos.x, 0, this.heroPos.z + 0.05, { pxm: 46, color: 1.5, speed: 1.6 });
    else this.fx('arcane/mana-burst', this.heroPos.x, 0.1, this.heroPos.z + 0.05, { pxm: 80, color: 1.3, speed: 1.6 });
  }

  roll() {
    if (this.mode !== 'play' || this.overlay || this.dialogue.open || this.cd.roll > 0 || this.hv.roll > 0) return;
    const a = R.ABILITIES.roll;
    const [mx, mz] = this._moveInput();
    let dx, dz;
    if (mx || mz) [dx, dz] = [mx, mz];
    else [dx, dz] = dirOf(this.heroPos.face);
    this.heroPos.face = Math.atan2(dx, dz);
    this.hv.roll = a.time;
    this.hv.rdx = dx;
    this.hv.rdz = dz;
    this.cd.roll = a.cd;
    this.fx('spawn/poof', this.heroPos.x, 0, this.heroPos.z, { pxm: 140, additive: false, color: 0.7, speed: 2.4 });
  }

  _slashArc(face, arc, radius, full) {
    const SEG = 28;
    const geo = new THREE.BufferGeometry();
    const pos = [], uv = [], idx = [];
    const inner = radius * (full ? 0.62 : 0.72);
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      const a = -arc / 2 + arc * u;
      for (const [r, v] of [[inner, 0], [radius, 1]]) {
        pos.push(Math.sin(a) * r, 0, Math.cos(a) * r);
        uv.push(u, v);
      }
      if (i < SEG) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mat = new THREE.MeshBasicMaterial({ map: this.arcTex, color: new THREE.Color(full ? '#a8e8ff' : '#fff0c8').multiplyScalar(full ? 0.8 : 1.2), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(this.heroPos.x, 0.85, this.heroPos.z);
    m.rotation.set(0, face, 0);
    m.rotateX(full ? 0 : -0.25);
    m.renderOrder = 6;
    geo.setDrawRange(0, 0);
    this.scene.add(m);
    this.effects.push({ arc: m, t: 0, life: full ? 0.38 : 0.26, seg: SEG, full, fx: { dispose: () => { geo.dispose(); mat.dispose(); m.removeFromParent(); } } });
  }

  _projectile(kind, x, y, z, dx, dz, speed) {
    const g = new THREE.Group();
    const fire = kind === 'fire';
    const core = new THREE.Mesh(new THREE.SphereGeometry(fire ? 0.2 : 0.17, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(fire ? '#ffb050' : '#7ff0ff').multiplyScalar(fire ? 3 : 2) }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: new THREE.Color(fire ? '#ff7a2a' : '#4ad8ff').multiplyScalar(fire ? 1.4 : 1.1), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(fire ? 1.1 : 0.7);
    g.add(core, glow);
    g.position.set(x, y, z);
    this.scene.add(g);
    const p = { kind, x, y, z, dx, dz, speed, life: fire ? R.ABILITIES.fireball.range / speed : 3.2, group: g, core, glow, trail: 0 };
    this.projectiles.push(p);
    return p;
  }

  _dropProjectile(p) {
    p.core.geometry.dispose();
    p.core.material.dispose();
    p.glow.material.dispose();
    p.group.removeFromParent();
  }

  hitEnemy(e, mult, knock) {
    if (!e.alive) return;
    const s = R.heroStats(this.hero.level, this.hero.bonus);
    const { amount, crit } = R.damage(s.atk, e.def.def, mult);
    e.hp -= amount;
    e.lastHit = 0;
    e.actor.flash = 0.1;
    const dx = e.x - this.heroPos.x, dz = e.z - this.heroPos.z;
    const d = Math.hypot(dx, dz) || 1;
    const k = e.def.boss ? knock * 0.15 : knock;
    e.kx += (dx / d) * k * 3;
    e.kz += (dz / d) * k * 3;
    if (e.state === 'idle' || e.state === 'return') e.state = 'chase';
    if (e.state === 'windup' && !e.def.boss && crit) e.state = 'recover', e.timer = 0.5, this._telegraph(e, 0, 0, 0, null);
    this.hud.number(String(amount), crit ? 'crit' : 'hit', { x: e.x, y: e.actor.height + 0.4, z: e.z });
    this.fx(crit ? 'impacts/crit-hit' : 'impacts/hit-spark', e.x - Math.sin(this.camYaw) * 0.3, e.actor.height * 0.45, e.z - Math.cos(this.camYaw) * 0.3, { pxm: crit ? 70 : 52, color: 1.8, speed: 1.5, flip: Math.random() < 0.5 });
    this.hitstop = Math.max(this.hitstop, crit ? 0.07 : 0.035);
    this.shake = Math.max(this.shake, crit ? 0.22 : 0.1);
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    e.alive = false;
    e.state = 'dead';
    e.respawn = e.def.respawn;
    e.actor.group.visible = false;
    this._telegraph(e, 0, 0, 0, null);
    this.hero.kills += 1;
    const drops = R.rollDrops(e.kind);
    if (e.summoned) drops.gold = Math.floor(drops.gold / 2);
    const { levels } = R.gainXp(this.hero, drops.xp);
    this.hud.log(`${e.def.name} driven off · +${drops.xp} XP`);
    if (e.def.boss) {
      this.fx('shadow/dark-explosion', e.x, 0, e.z, { pxm: 40, additive: true, color: 1.5 });
      this.shake = 0.8;
      this.state.bossDefeated = true;
      this.hud.boss(null);
      this.hud.toast('<b>The Lampwight is undone.</b> The stolen light pours back toward camp.', 'gold');
      // Every remaining wisp fades with it.
      for (const o of this.enemies) if (o.alive && o.kind === 'wisp') {
        o.alive = false;
        o.state = 'dead';
        o.respawn = Infinity;
        o.actor.group.visible = false;
        this.fx('spawn/soul-rise', o.x, 0, o.z, { pxm: 48, color: 1.6, palette: WISP_RAMP });
      }
    } else this.fx('spawn/poof', e.x, 0, e.z, { pxm: 70, additive: false, color: 0.8, speed: 1.6 });
    // Drops.
    const spot = (i) => [e.x + Math.cos(i * 2.3) * 0.8, e.z + Math.sin(i * 2.3) * 0.8];
    let n = 0;
    if (drops.gold) this._drop('gold', drops.gold, ...spot(n++));
    for (let i = 0; i < drops.crystals; i++) this._drop('crystal', 1, ...spot(n++));
    if (drops.potion) this._drop('potion', drops.potion, ...spot(n++));
    for (const id of R.questEvent(this.state.quests, 'kill', e.kind)) this._questReady(id);
    if (levels) this._levelUp(levels);
  }

  _drop(kind, amount, x, z) {
    const f = new FxBillboard(this.pickupFx[kind], { pxm: kind === 'gold' ? 34 : 52, color: 0.95 });
    f.owner = false;
    f.mesh.position.set(x, 0.05, z);
    this.scene.add(f.mesh);
    this.drops.push({ kind, amount, x, z, fx: f, t: 0 });
  }

  _levelUp(levels) {
    this.fx('ui/level-up', this.heroPos.x, 0, this.heroPos.z + 0.1, { pxm: 64, color: 1.5 });
    const s = R.heroStats(this.hero.level, this.hero.bonus);
    this.hud.toast(`<b>Level ${this.hero.level}!</b> Health ${s.maxHp} · Attack ${s.atk}${levels > 1 ? ` (+${levels} levels)` : ''}`, 'gold');
  }

  _questReady(id) {
    const q = R.questById(id);
    this.hud.toast(`<b>${q.name}</b> — return to ${R.NPCS[q.giver].name}`, 'gold');
    this.hud.tracker(this.state.quests);
    this.save();
  }

  hurtHero(amount, fromX, fromZ, crit = false) {
    if (this.mode !== 'play' || this.hv.inv > 0 || this.hv.roll > 0) return false;
    this.hero.hp -= amount;
    this.hv.inv = 0.45;
    this.hv.hurtT = 0;
    this.heroActor.flash = 0.12;
    const dx = this.heroPos.x - fromX, dz = this.heroPos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    this.hv.kx += (dx / d) * 9;
    this.hv.kz += (dz / d) * 9;
    this.hurtFx = 1;
    this.shake = Math.max(this.shake, crit ? 0.4 : 0.25);
    this.hud.number(String(amount), 'hurt', { x: this.heroPos.x, y: 1.9, z: this.heroPos.z });
    if (this.hero.hp <= 0) this.die();
    return true;
  }

  die() {
    this.hero.hp = 0;
    this.mode = 'dead';
    this.deadT = 0;
    this.hud.toast('You fall… the Hearthlight calls you back.', 'warn');
  }

  _respawn() {
    const lost = R.deathPenalty(this.hero);
    this.heroPos.x = 0;
    this.heroPos.z = 4;
    this.heroPos.face = Math.PI;
    this.camYaw = 0;
    this._snapCamera();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.state = 'return';
      this._telegraph(e, 0, 0, 0, null);
    }
    if (this.boss?.alive) this.boss.hp = this.boss.def.hp;
    this.mode = 'play';
    this.post.fade = 0;
    this.hud.log(`You wake by the fire. ${lost ? `${lost} gold lost in the dark.` : ''}`);
    this.save();
  }

  /* ========================================================= interaction */

  _interactable() {
    const hx = this.heroPos.x, hz = this.heroPos.z;
    let best = null, bd = 2.8;
    for (const n of this.npcs) {
      const d = Math.hypot(n.x - hx, n.z - hz);
      if (d < bd) [best, bd] = [{ type: 'npc', npc: n, label: `Talk to ${n.name}` }, d];
    }
    for (const h of this.world.herbs) {
      if (h.taken) continue;
      const d = Math.hypot(h.x - hx, h.z - hz);
      if (d < Math.min(bd, 2.2)) [best, bd] = [{ type: 'herb', herb: h, label: this.state.quests.embers.state === 'active' ? 'Gather ember-herb' : 'An ember-herb (Wren wants these)' }, d];
    }
    for (const b of this.world.braziers) {
      const d = Math.hypot(b.x - hx, b.z - hz);
      if (d < Math.min(bd, 2.6)) [best, bd] = [{ type: 'brazier', brazier: b, label: b.lit ? 'The brazier burns' : this.state.quests.braziers.state === 'active' ? 'Light the brazier' : 'A cold, old brazier' }, d];
    }
    return best;
  }

  interact() {
    const it = this._interactable();
    if (!it) return;
    if (it.type === 'npc') return this.talk(it.npc);
    if (it.type === 'herb') {
      if (this.state.quests.embers.state !== 'active') {
        this.hud.toast('It glows like a coal. Maybe someone at camp needs these.');
        return;
      }
      this.world.takeHerb(it.herb.i);
      this.state.herbsTaken.push(it.herb.i);
      this.hero.herbs += 1;
      R.gainXp(this.hero, 5);
      this.fx('pickups/collect-burst', it.herb.x, 0.1, it.herb.z, { pxm: 50, color: 1.6, palette: FIRE_RAMP });
      const e = this.state.quests.embers;
      this.hud.log(`Ember-herb gathered (${Math.min(6, e.progress + 1)}/6)`);
      for (const id of R.questEvent(this.state.quests, 'gather', 'herb')) this._questReady(id);
      return;
    }
    if (it.type === 'brazier') {
      const b = it.brazier;
      if (b.lit) return;
      if (this.state.quests.braziers.state !== 'active') {
        this.hud.toast('Cold ash, a hundred years old.');
        return;
      }
      this.world.lightBrazier(b.id);
      this.state.braziers.push(b.id);
      this.fx('explosions/small-explosion', b.x, 1.2, b.z, { pxm: 70, color: 1.4, speed: 2.5 });
      this.shake = 0.2;
      const e = this.state.quests.braziers;
      this.hud.log(`A brazier roars to life (${Math.min(3, e.progress + 1)}/3)`);
      for (const id of R.questEvent(this.state.quests, 'light', 'brazier')) this._questReady(id);
    }
  }

  talk(npc) {
    const { lines, action } = R.dialogueFor(npc.id, this.state.quests);
    npc.talking = true;
    this.heroPos.face = Math.atan2(npc.x - this.heroPos.x, npc.z - this.heroPos.z);
    this.dialogue.play(lines, () => {
      npc.talking = false;
      if (action?.accept && R.acceptQuest(this.state.quests, action.accept)) {
        const q = R.questById(action.accept);
        this.hud.toast(`<small>Quest accepted</small><b>${q.name}</b>`, 'quest');
      } else if (action?.complete) {
        const reward = R.completeQuest(this.state.quests, this.hero, action.complete);
        if (reward) {
          const q = R.questById(action.complete);
          const bits = [`${reward.xp} XP`, reward.gold && `${reward.gold} gold`, reward.crystals && `${reward.crystals} crystal${reward.crystals > 1 ? 's' : ''}`, reward.potions?.hp && `${reward.potions.hp} health potions`, reward.potions?.mp && `${reward.potions.mp} mana potions`].filter(Boolean);
          this.hud.toast(`<small>Quest complete</small><b>${q.name}</b><span>${bits.join(' · ')}</span>`, 'quest');
          this.fx('pickups/collect-burst', this.heroPos.x, 0.2, this.heroPos.z, { pxm: 40, color: 1.6, palette: FIRE_RAMP });
          if (reward.levels) this._levelUp(reward.levels);
          this.world.setProgress(R.questsDone(this.state.quests), R.QUESTS.length);
          const next = R.QUESTS[R.QUESTS.indexOf(q) + 1];
          if (next?.auto && this.state.quests[next.id].state === 'active') this.hud.toast(`<small>New quest</small><b>${next.name}</b>`, 'quest');
          if (R.journeyOver(this.state.quests)) this.ending();
        }
      } else if (action?.shop) this.openShop();
      this.hud.tracker(this.state.quests);
      this.save();
    }, this.look);
  }

  ending() {
    this.state.ended = true;
    this.save();
    setTimeout(() => {
      this.dialogue.play(R.ENDING, () => {
        this.mode = 'ending';
        const w = el('div', 'ld-overlay ld-overlay--end');
        w.innerHTML = `<div class="ld-end"><h1>The lanterns burn again</h1>
          <p>Lanternwood sleeps under its own light tonight, and its fire has a story to tell.</p>
          <dl class="ld-stats"><dt>Level</dt><dd>${this.hero.level}</dd><dt>Foes driven off</dt><dd>${this.hero.kills}</dd><dt>Falls</dt><dd>${this.hero.deaths}</dd><dt>Time</dt><dd>${Math.round(this.state.time / 60)} min</dd></dl>
          <div class="ld-title__go"><button type="button" class="ld-btn ld-btn--big ld-btn--go" data-keep>Keep exploring</button><button type="button" class="ld-btn ld-btn--big" data-home>Back to title</button></div></div>`;
        this.root.append(w);
        w.querySelector('[data-keep]').addEventListener('click', () => {
          w.remove();
          this.mode = 'play';
          this.root.focus();
        });
        w.querySelector('[data-home]').addEventListener('click', () => {
          w.remove();
          this._resetWorldForTitle();
          this.title();
        });
      }, this.look);
    }, 400);
  }

  /* ============================================================== frame */

  _moveInput() {
    const k = this.keys;
    let f = 0, s = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    if (!f && !s) return [0, 0];
    const len = Math.hypot(f, s);
    f /= len;
    s /= len;
    const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
    const rx = Math.cos(this.camYaw), rz = -Math.sin(this.camYaw);
    return [fx * f + rx * s, fz * f + rz * s];
  }

  frame(dt) {
    this.t += dt;
    const sim = (this.mode === 'play' || this.mode === 'dead') && !this.overlay && !this.dialogue.open;
    let sdt = dt;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      sdt = dt * 0.1;
    }
    if (sim) this.simulate(sdt);
    else if (this.mode === 'title') {
      this.camYaw = wrap(this.camYaw + dt * 0.05);
    }
    this.dialogue.update(dt);
    this.updateCamera(dt);
    const yaw = this.camYaw;
    this.world.update(dt, { yaw, hero: this.heroPos, camera: this.camera });
    this.updateActors(dt, yaw);
    // The minimap, ten times a second.
    this._miniT = (this._miniT ?? 0) - dt;
    if (this._miniT <= 0 && this.mode !== 'title') {
      this._miniT = 0.1;
      const mini = this.root.querySelector('[data-mini]');
      if (mini) {
        drawMinimap(mini, this);
        // The N on the rim, where north is.
        const n = this.root.querySelector('[data-mini-n]');
        if (n) {
          const r = 78;
          n.style.transform = `translate(${-Math.sin(-this.camYaw) * r}px, ${-Math.cos(-this.camYaw) * r}px)`;
        }
      }
    }
    this.updateEffects(dt, yaw);
    this.updateHud(dt);
    if (this.overlay === 'map' && this._mapCanvas && Math.floor(this.t * 10) % 3 === 0) drawMap(this._mapCanvas, this);
    this.hurtFx = Math.max(0, this.hurtFx - dt * 2.2);
    this.post.hurt = Math.max(this.hurtFx * 0.8, this.mode === 'play' && this.hero ? Math.max(0, 0.3 - this.hero.hp / R.heroStats(this.hero.level, this.hero.bonus).maxHp) * 1.2 : 0);
    this.post.draw();
    this._watchFps(dt);
  }

  _watchFps(dt) {
    this._fpsAcc.push(dt);
    if (this._fpsAcc.length < 120) return;
    const avg = this._fpsAcc.reduce((a, b) => a + b, 0) / this._fpsAcc.length;
    this._fpsAcc = [];
    this.fps = Math.round(1 / avg);
    // Too slow at this resolution: render fewer pixels (never under 1×).
    if (avg > 1 / 45 && this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
      this.resize();
    }
  }

  simulate(dt) {
    const hv = this.hv;
    const hero = this.hero;
    const stats = R.heroStats(hero.level, hero.bonus);
    for (const k of Object.keys(this.cd)) this.cd[k] = Math.max(0, this.cd[k] - dt);
    hv.inv = Math.max(0, hv.inv - dt);
    hv.attack = Math.max(0, hv.attack - dt);
    hv.spin = Math.max(0, (hv.spin ?? 0) - dt);
    hv.hurtT += dt;
    this._dragT = Math.max(0, (this._dragT ?? 0) - dt);
    this.state.time += dt;

    if (this.mode === 'dead') {
      this.deadT += dt;
      this.post.fade = Math.min(0.85, this.deadT * 0.6);
      if (this.deadT > 2.4) this._respawn();
      return;
    }

    // Move.
    let [mx, mz] = this._moveInput();
    if (this.keys.has('KeyQ')) this.camYaw = wrap(this.camYaw + dt * 1.9);
    if (this.keys.has('KeyE')) this.camYaw = wrap(this.camYaw - dt * 1.9);
    let vx = 0, vz = 0;
    if (hv.roll > 0) {
      hv.roll -= dt;
      vx = hv.rdx * R.ABILITIES.roll.speed;
      vz = hv.rdz * R.ABILITIES.roll.speed;
    } else if (mx || mz) {
      const slow = hv.attack > 0 ? 0.45 : 1;
      vx = mx * stats.speed * slow;
      vz = mz * stats.speed * slow;
      if (hv.attack <= 0) {
        const want = Math.atan2(mx, mz);
        this.heroPos.face = wrap(this.heroPos.face + wrap(want - this.heroPos.face) * Math.min(1, dt * 14));
      }
      // The camera drifts round behind the hero, unless the player is turning it.
      const fwd = -(mx * Math.sin(this.camYaw) + mz * Math.cos(this.camYaw));
      if (this._dragT <= 0 && fwd > -0.3 && !this.keys.has('KeyQ') && !this.keys.has('KeyE')) {
        const behind = wrap(Math.atan2(mx, mz) + Math.PI);
        this.camYaw = wrap(this.camYaw + wrap(behind - this.camYaw) * Math.min(1, dt * 0.9));
      }
    }
    hv.moving = Math.hypot(vx, vz) > 0.1 && hv.roll <= 0;
    vx += hv.kx;
    vz += hv.kz;
    hv.kx *= Math.exp(-dt * 9);
    hv.kz *= Math.exp(-dt * 9);
    const [nx, nz] = R.resolveCollision(this.heroPos.x + vx * dt, this.heroPos.z + vz * dt, HERO_R, this._nearSolids(this.heroPos.x, this.heroPos.z));
    this.heroPos.x = nx;
    this.heroPos.z = nz;

    // Regeneration: slow out of combat, fast by the Hearthlight.
    const nearFire = Math.hypot(nx, nz) < 6.5;
    const calm = hv.hurtT > 5;
    hero.mp = Math.min(stats.maxMp, hero.mp + dt * (nearFire ? 12 : 2.2));
    if (nearFire) hero.hp = Math.min(stats.maxHp, hero.hp + dt * stats.maxHp * 0.1);
    else if (calm) hero.hp = Math.min(stats.maxHp, hero.hp + dt * stats.maxHp * 0.012);
    this._resting = nearFire && (hero.hp < stats.maxHp - 0.5 || hero.mp < stats.maxMp - 0.5);

    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateDrops(dt);
    this.updateBoss(dt);

    this._autosave -= dt;
    if (this._autosave <= 0) {
      this._autosave = 15;
      this.save();
    }
  }

  /** Solid circles near a point (the forest is big; most of it is far away). */
  _nearSolids(x, z) {
    if (!this._grid) {
      this._grid = new Map();
      for (const s of this.world.solids) {
        const key = `${Math.floor(s.x / 8)},${Math.floor(s.z / 8)}`;
        if (!this._grid.has(key)) this._grid.set(key, []);
        this._grid.get(key).push(s);
      }
    }
    const gx = Math.floor(x / 8), gz = Math.floor(z / 8);
    const out = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const c = this._grid.get(`${gx + i},${gz + j}`);
      if (c) out.push(...c);
    }
    return out;
  }

  updateEnemies(dt) {
    const hx = this.heroPos.x, hz = this.heroPos.z;
    for (const e of this.enemies) {
      const def = e.def;
      if (!e.alive) {
        if (e.summoned || def.boss) continue;
        e.respawn -= dt;
        if (e.respawn <= 0 && Math.hypot(hx - e.hx, hz - e.hz) > 16) {
          Object.assign(e, { alive: true, hp: def.hp, x: e.hx, z: e.hz, state: 'idle', timer: 1, kx: 0, kz: 0 });
          e.actor.group.visible = true;
          this.fx('spawn/poof', e.x, 0, e.z, { pxm: 90, additive: false, color: 0.7, speed: 1.8 });
        }
        continue;
      }
      e.lastHit += dt;
      e.cd = Math.max(0, e.cd - dt);
      e.frameT += dt;
      const dx = hx - e.x, dz = hz - e.z;
      const dh = Math.hypot(dx, dz);
      const home = Math.hypot(e.x - e.hx, e.z - e.hz);
      const alive = this.mode === 'play';
      let mvx = 0, mvz = 0, speed = 0;
      e.timer -= dt;
      switch (e.state) {
        case 'idle': {
          if (alive && dh < def.sight) {
            e.state = 'chase';
            this.hud.number('!', 'alert', { x: e.x, y: e.actor.height + 0.5, z: e.z });
            break;
          }
          if (e.timer <= 0) {
            const a = Math.random() * TAU, r = Math.random() * 4;
            e.tx = e.hx + Math.cos(a) * r;
            e.tz = e.hz + Math.sin(a) * r;
            e.timer = 2 + Math.random() * 3;
          }
          const tx = e.tx - e.x, tz = e.tz - e.z, td = Math.hypot(tx, tz);
          if (td > 0.3) [mvx, mvz, speed] = [tx / td, tz / td, def.wander];
          break;
        }
        case 'chase': {
          if (!alive || (home > def.leash && !def.boss) || dh > def.sight * 2.2) {
            e.state = 'return';
            break;
          }
          if (def.attack === 'orb') {
            if (dh < def.keep - 1) [mvx, mvz, speed] = [-dx / dh, -dz / dh, def.speed];
            else if (dh > def.keep + 1.5) [mvx, mvz, speed] = [dx / dh, dz / dh, def.speed];
            else [mvx, mvz, speed] = [-dz / dh, dx / dh, def.speed * 0.5 * Math.sign(Math.sin(this.t * 0.7 + e.hx))];
          } else if (dh > (def.boss ? 2.6 : def.reach * 0.7)) [mvx, mvz, speed] = [dx / dh, dz / dh, def.speed];
          if (def.boss) {
            // Close: a slam. Further off: now and then a volley of wisp-fire, otherwise it closes in.
            if (e.cd <= 0 && dh < 5) this._windup(e, dh);
            else if (e.cd <= 0 && dh < 16) {
              if (Math.random() < 0.55) this._windup(e, dh);
              else e.cd = 0.9;
            }
          } else if (e.cd <= 0 && dh < def.reach + HERO_R) this._windup(e, dh);
          break;
        }
        case 'windup': {
          const k = 1 - Math.max(0, e.timer) / e.wind;
          if (def.attack === 'lunge' || def.attack === 'hop') this._telegraph(e, e.tx, e.tz, def.attack === 'hop' ? 1.4 : 1.2, k);
          else if (def.attack === 'orb') this._telegraph(e, e.x, e.z, 0.9, k);
          else if (e.move === 'slam') this._telegraph(e, e.tx, e.tz, 3.4, k);
          else this._telegraph(e, e.x, e.z, 2.2, k);
          if (e.timer <= 0) this._strike(e);
          break;
        }
        case 'strike': {
          const k = 1 - Math.max(0, e.timer) / e.strikeT;
          if (def.attack === 'hop') {
            e.x = e.sx + (e.tx - e.sx) * k;
            e.z = e.sz + (e.tz - e.sz) * k;
            e.actor.lift = Math.sin(k * Math.PI) * 1.1;
            if (e.timer <= 0) {
              e.actor.lift = 0;
              if (Math.hypot(hx - e.x, hz - e.z) < 1.45) this._enemyHits(e);
              this.fx('spawn/poof', e.x, 0, e.z, { pxm: 140, additive: false, color: 0.6, speed: 2.5 });
            }
          } else if (def.attack === 'lunge') {
            [mvx, mvz, speed] = [e.ldx, e.ldz, 15 * (1 - k * 0.6)];
            if (!e.hitDone && Math.hypot(hx - e.x, hz - e.z) < 1.2) {
              e.hitDone = true;
              this._enemyHits(e);
            }
          }
          if (e.timer <= 0) {
            e.state = 'recover';
            e.timer = def.cooldown;
            e.cd = def.cooldown;
          }
          break;
        }
        case 'recover': {
          if (e.timer <= 0) e.state = 'chase';
          break;
        }
        case 'return': {
          const td = Math.hypot(e.hx - e.x, e.hz - e.z);
          if (td < 1) {
            e.state = 'idle';
            e.hp = def.hp;
          } else [mvx, mvz, speed] = [(e.hx - e.x) / td, (e.hz - e.z) / td, def.speed * 1.15];
          e.hp = Math.min(def.hp, e.hp + def.hp * 0.25 * dt);
          this._telegraph(e, 0, 0, 0, null);
          break;
        }
        default:
      }
      // Move, knockback, keep apart from each other and out of the trees.
      let nx = e.x + (mvx * speed + e.kx) * dt;
      let nz = e.z + (mvz * speed + e.kz) * dt;
      e.kx *= Math.exp(-dt * 7);
      e.kz *= Math.exp(-dt * 7);
      e.vx = mvx * speed;
      e.vz = mvz * speed;
      for (const o of this.enemies) {
        if (o === e || !o.alive) continue;
        const ox = nx - o.x, oz = nz - o.z;
        const od = Math.hypot(ox, oz), min = def.radius + o.def.radius;
        if (od < min && od > 0.001) {
          nx += (ox / od) * (min - od) * 0.5;
          nz += (oz / od) * (min - od) * 0.5;
        }
      }
      if (def.attack !== 'orb' || !def.float) [nx, nz] = R.resolveCollision(nx, nz, def.radius * 0.8, this._nearSolids(nx, nz));
      else [nx, nz] = R.resolveCollision(nx, nz, 0.3, []);
      e.x = nx;
      e.z = nz;
    }
    // Summoned helpers that are gone are removed for good.
    this.enemies = this.enemies.filter((e) => {
      if (e.summoned && !e.alive) {
        this._disposeEnemy(e);
        return false;
      }
      return true;
    });
  }

  _windup(e, dh) {
    const def = e.def;
    e.state = 'windup';
    e.wind = def.windup;
    if (def.boss) {
      e.move = dh < 5 ? 'slam' : 'volley';
      e.wind = e.move === 'slam' ? 1.15 : 0.9;
      if (e.move === 'slam') {
        const d = Math.hypot(this.heroPos.x - e.x, this.heroPos.z - e.z) || 1;
        const reach = Math.min(2.4, d);
        e.tx = e.x + ((this.heroPos.x - e.x) / d) * reach;
        e.tz = e.z + ((this.heroPos.z - e.z) / d) * reach;
      }
    } else if (def.attack === 'hop') {
      const d = Math.min(3.2, dh);
      e.tx = e.x + ((this.heroPos.x - e.x) / (dh || 1)) * d;
      e.tz = e.z + ((this.heroPos.z - e.z) / (dh || 1)) * d;
    } else if (def.attack === 'lunge') {
      e.ldx = (this.heroPos.x - e.x) / (dh || 1);
      e.ldz = (this.heroPos.z - e.z) / (dh || 1);
      e.tx = e.x + e.ldx * 3.6;
      e.tz = e.z + e.ldz * 3.6;
    }
    e.timer = e.wind;
  }

  _strike(e) {
    const def = e.def;
    this._telegraph(e, 0, 0, 0, null);
    e.hitDone = false;
    if (def.attack === 'hop') {
      e.state = 'strike';
      e.strikeT = e.timer = 0.38;
      e.sx = e.x;
      e.sz = e.z;
    } else if (def.attack === 'lunge') {
      e.state = 'strike';
      e.strikeT = e.timer = 0.3;
    } else if (def.attack === 'orb') {
      const dx = this.heroPos.x - e.x, dz = this.heroPos.z - e.z, d = Math.hypot(dx, dz) || 1;
      const p = this._projectile('orb', e.x, 1.2, e.z, dx / d, dz / d, 9);
      p.from = e;
      e.state = 'recover';
      e.timer = def.cooldown;
      e.cd = def.cooldown;
    } else if (def.boss) {
      if (e.move === 'slam') {
        this.fx('impacts/ground-slam', e.tx, 0, e.tz, { pxm: 46, additive: false, color: 0.9, speed: 1.5 });
        this.shake = 0.55;
        if (Math.hypot(this.heroPos.x - e.tx, this.heroPos.z - e.tz) < 3.4 + HERO_R) this._enemyHits(e, 1.25);
      } else {
        const base = Math.atan2(this.heroPos.x - e.x, this.heroPos.z - e.z);
        for (let i = -2; i <= 2; i++) {
          const a = base + i * 0.22;
          const p = this._projectile('orb', e.x, 2.4, e.z, Math.sin(a), Math.cos(a), 10);
          p.from = e;
        }
      }
      e.state = 'recover';
      e.timer = def.cooldown + (e.move === 'slam' ? 0.4 : 0);
      e.cd = def.cooldown;
    }
  }

  _enemyHits(e, mult = 1) {
    const s = R.heroStats(this.hero.level, this.hero.bonus);
    const { amount, crit } = R.damage(e.def.atk, s.def, mult);
    this.hurtHero(amount, e.x, e.z, crit);
  }

  updateBoss(dt) {
    const q = this.state.quests.lampwight;
    const ru = R.WORLD.boss;
    const dist = Math.hypot(this.heroPos.x - ru.x, this.heroPos.z - ru.z);
    if (q.state === 'active' && !this.state.bossDefeated && !this.boss && dist < 22) {
      this.boss = this._spawnEnemy('lampwight', ru.x, ru.z);
      this.boss.state = 'chase';
      this.fx('shadow/dark-explosion', ru.x, 0, ru.z, { pxm: 40, color: 1.3 });
      this.shake = 0.6;
      this.hud.toast('<b>The Lampwight rises from the ruins!</b>', 'warn');
    }
    const b = this.boss;
    this.bossLight.intensity = b?.alive ? 22 + Math.sin(this.t * 5) * 4 : Math.max(0, this.bossLight.intensity - dt * 20);
    if (b?.alive) {
      this.bossLight.position.set(b.x, 3.6, b.z);
      this.hud.boss(dist < 34 ? b.hp / b.def.hp : null);
      // At two thirds and one third, it calls lampwisps.
      const frac = b.hp / b.def.hp;
      const phase = frac < 0.34 ? 2 : frac < 0.67 ? 1 : 0;
      if (phase > b.phase) {
        b.phase = phase;
        for (let i = 0; i < 2; i++) {
          const a = this.t + i * Math.PI;
          const w = this._spawnEnemy('wisp', b.x + Math.cos(a) * 4, b.z + Math.sin(a) * 4, true);
          w.state = 'chase';
          this.fx('spawn/soul-rise', w.x, 0, w.z, { pxm: 48, color: 1.6, palette: WISP_RAMP });
        }
        this.hud.toast('The Lampwight calls its wisps!', 'warn');
      }
      if (b.state === 'return') {
        b.state = 'chase';
        if (dist > 30) {
          b.x = ru.x;
          b.z = ru.z;
          b.hp = Math.min(b.def.hp, b.hp + b.def.hp * 0.2 * dt);
        }
      }
    } else this.hud.boss(null);
  }

  updateProjectiles(dt) {
    this.projectiles = this.projectiles.filter((p) => {
      p.x += p.dx * p.speed * dt;
      p.z += p.dz * p.speed * dt;
      p.life -= dt;
      p.group.position.set(p.x, p.y + Math.sin(this.t * 20) * 0.03, p.z);
      p.glow.material.rotation += dt * 4;
      let hit = p.life <= 0;
      if (!hit) for (const s of this._nearSolids(p.x, p.z)) if (s.r > 0.3 && Math.hypot(p.x - s.x, p.z - s.z) < s.r + 0.1) hit = true;
      if (p.kind === 'fire') {
        if (!hit) for (const e of this.enemies) if (e.alive && Math.hypot(e.x - p.x, e.z - p.z) < 0.55 + e.def.radius) hit = true;
        if (hit) {
          const a = R.ABILITIES.fireball;
          for (const e of this.enemies) if (e.alive && Math.hypot(e.x - p.x, e.z - p.z) < a.radius + e.def.radius) this.hitEnemy(e, a.mult, a.knock);
          this.fx('explosions/small-explosion', p.x, 0, p.z, { pxm: 80, color: 1.3, speed: 2.6, palette: FIRE_RAMP });
        }
      } else if (!hit && Math.hypot(this.heroPos.x - p.x, this.heroPos.z - p.z) < 0.75) {
        if (p.from) this._enemyHits(p.from, p.from.def.boss ? 0.7 : 1);
        hit = true;
      }
      if (hit) this._dropProjectile(p);
      return !hit;
    });
    // The newest fireball lights the woods as it flies.
    const fb = [...this.projectiles].reverse().find((p) => p.kind === 'fire');
    if (fb) {
      this.projLight.position.set(fb.x, fb.y, fb.z);
      this.projLight.intensity = 14;
    } else this.projLight.intensity = Math.max(0, this.projLight.intensity - dt * 60);
  }

  updateDrops(dt) {
    const hx = this.heroPos.x, hz = this.heroPos.z;
    this.drops = this.drops.filter((d) => {
      d.t += dt;
      const dist = Math.hypot(hx - d.x, hz - d.z);
      if (d.t > 0.4 && dist < 3.2) {
        const k = Math.min(1, dt * 9);
        d.x += (hx - d.x) * k;
        d.z += (hz - d.z) * k;
      }
      d.fx.mesh.position.set(d.x, 0.05 + Math.max(0, 0.5 - d.t) * Math.sin(d.t * 12) * 0.4, d.z);
      if (d.t > 0.4 && dist < 0.9) {
        if (d.kind === 'gold') {
          this.hero.gold += d.amount;
          this.hud.number(`+${d.amount}g`, 'gold', { x: hx, y: 1.7, z: hz });
        } else if (d.kind === 'crystal') {
          this.hero.crystals += 1;
          this.hud.number('+1 crystal', 'crystal', { x: hx, y: 1.7, z: hz });
        } else {
          this.hero.potions[d.amount] += 1;
          this.hud.log(d.amount === 'hp' ? 'Found a health potion' : 'Found a mana potion');
        }
        d.fx.dispose();
        return false;
      }
      if (d.t > 60) {
        d.fx.dispose();
        return false;
      }
      return true;
    });
  }

  _snapCamera() {
    this.updateCamera(1, true);
  }

  updateCamera(dt, snap = false) {
    const h = this.heroPos;
    let target, look;
    if (this.mode === 'title') {
      const a = this.camYaw + 0.6;
      target = new THREE.Vector3(Math.sin(a) * 11, 4.2, Math.cos(a) * 11);
      look = new THREE.Vector3(0, 1.4, 0);
    } else {
      const d = this.camDist;
      const [bx, bz] = [Math.sin(this.camYaw), Math.cos(this.camYaw)];
      target = new THREE.Vector3(h.x + bx * d, d * 0.5 + 0.6, h.z + bz * d);
      look = new THREE.Vector3(h.x - bx * 2.2, 1.0, h.z - bz * 2.2);
    }
    const k = snap ? 1 : 1 - Math.exp(-dt * 7);
    this.camPos.lerp(target, k);
    this.camLook.lerp(look, snap ? 1 : 1 - Math.exp(-dt * 9));
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.5;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.5;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.camera.lookAt(this.camLook);
  }

  updateActors(dt, yaw) {
    const light = new THREE.Color();
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    const rgtX = Math.cos(yaw), rgtZ = -Math.sin(yaw);
    // The hero: back view walking away (most of the time), front toward, side otherwise.
    const h = this.heroPos;
    const hv = this.hv ?? { moving: false, attack: 0, roll: 0, spin: 0 };
    const set = this.sprites.hero[this.look ?? 'ember'];
    const [dx, dz] = dirOf(h.face);
    const dot = dx * fwdX + dz * fwdZ;
    const side = dx * rgtX + dz * rgtZ;
    let view = dot > 0.5 ? 'back' : dot < -0.5 ? 'front' : 'side';
    if (hv.spin > 0) view = ['back', 'side', 'front', 'side'][Math.floor(hv.spin * 20) % 4];
    if (hv.moving) hv.walkT = (hv.walkT ?? 0) + dt;
    const frame = hv.moving ? 1 + (Math.floor(hv.walkT / 0.15) % 2) : 0;
    const a = this.heroActor;
    a.group.position.set(h.x, 0, h.z);
    a.lift = hv.moving ? Math.abs(Math.sin((hv.walkT / 0.15) * Math.PI)) * 0.05 : 0;
    a.squash = hv.roll > 0 ? -0.3 : hv.attack > 0 ? 0.06 : Math.sin(this.t * 2.4) * 0.012;
    // Lean into an attack: the sprite steps forward a little.
    a.mesh.position.x = hv.attack > 0 ? dx * 0.15 : 0;
    a.mesh.position.z = hv.attack > 0 ? dz * 0.15 : 0;
    a.facing = h.face + (hv.spin > 0 ? hv.spin * 40 : 0);
    a.show(set.front[frame]);
    void view;
    a.group.visible = this.mode !== 'title';
    const blink = hv.inv > 0 && Math.floor(this.t * 20) % 2 === 0;
    a.material.opacity = 1;
    a.mesh.visible = !blink || this.mode === 'dead';
    a.update(dt, yaw, this.world.lightAt(h.x, h.z, light));
    if (this.mode === 'dead') a.material.color.multiplyScalar(0.5);

    // People: they turn to the hero when near or talking.
    for (const n of this.npcs) {
      const near = Math.hypot(h.x - n.x, h.z - n.z) < 4.5 && this.mode !== 'title';
      const want = near || n.talking ? Math.atan2(h.x - n.x, h.z - n.z) : n.face0 ?? (n.face0 = n.face);
      n.face = wrap(n.face + wrap(want - n.face) * Math.min(1, dt * 6));
      const [nx, nz] = dirOf(n.face);
      const toward = nx * fwdX + nz * fwdZ < 0.2;
      const s = this.sprites.npcs[n.id];
      n.actor.squash = Math.sin(this.t * 2 + n.x) * 0.015 + (n.talking ? Math.abs(Math.sin(this.t * 9)) * 0.02 : 0);
      n.actor.facing = n.face;
      n.actor.show(s.front[0]);
      void toward;
      n.actor.update(dt, yaw, this.world.lightAt(n.x, n.z, light));
    }

    // Enemies.
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const frames = this.sprites.enemies[e.kind];
      const act = e.actor;
      act.group.position.set(e.x, 0, e.z);
      const moving = Math.hypot(e.vx, e.vz) > 0.2;
      let f = 0;
      if (e.kind === 'slime') {
        f = Math.floor(e.frameT / (moving ? 0.18 : 0.4)) % 2;
        act.squash = e.state === 'windup' ? -0.25 * (1 - e.timer / e.wind) : 0;
      } else if (e.kind === 'wolf') {
        f = moving ? 1 + (Math.floor(e.frameT / (e.state === 'strike' ? 0.06 : 0.11)) % 2) : 0;
        const sx = e.vx * rgtX + e.vz * rgtZ;
        const ddx = this.heroPos.x - e.x, ddz = this.heroPos.z - e.z;
        const look = Math.abs(sx) > 0.3 ? sx : ddx * rgtX + ddz * rgtZ;
        e.flip = look < 0;
        act.squash = e.state === 'windup' ? -0.15 : 0;
      } else if (e.kind === 'wisp') {
        f = Math.floor(e.frameT / 0.2) % 2;
        act.lift = (e.def.float ?? 1) + Math.sin(this.t * 2.5 + e.hx) * 0.18;
        act.glow = e.state === 'windup' ? 0.55 + (1 - e.timer / e.wind) * 1.2 : 0.55;
      } else {
        f = Math.floor(e.frameT / 0.35) % 2;
        act.lift = 0.15 + Math.sin(this.t * 1.6) * 0.12;
        act.squash = e.state === 'windup' ? (e.move === 'slam' ? 0.12 : -0.05) * (1 - e.timer / e.wind) : 0;
        act.glow = 0.4 + (e.state === 'windup' ? 0.35 * Math.abs(Math.sin(this.t * 12)) : 0);
      }
      // Facing: where it is going, or the hero when it stands.
      const mvx = e.vx, mvz = e.vz;
      act.facing = Math.hypot(mvx, mvz) > 0.3 ? Math.atan2(mvx, mvz) : Math.atan2(this.heroPos.x - e.x, this.heroPos.z - e.z);
      act.show(frames[f], e.flip);
      act.update(dt, yaw, this.world.lightAt(e.x, e.z, light));
      if (e.state === 'windup' && Math.floor(this.t * 16) % 2 === 0 && act.flash <= 0) act.material.color.setRGB(1.5, 0.5, 0.4);
    }
  }

  updateEffects(dt, yaw) {
    for (const p of Object.values(this.pickupFx)) p.update(dt);
    for (const d of this.drops) d.fx.mesh.rotation.y = yaw;
    this.effects = this.effects.filter((e) => {
      if (e.arc) {
        e.t += dt;
        const k = e.t / e.life;
        const reveal = Math.min(1, k / 0.45);
        e.arc.geometry.setDrawRange(0, Math.ceil(reveal * e.seg) * 6);
        e.arc.material.opacity = k < 0.45 ? 1 : Math.max(0, 1 - (k - 0.45) / 0.55);
        if (e.full) e.arc.rotation.y += dt * 9;
        if (k >= 1) {
          e.fx.dispose();
          return false;
        }
        return true;
      }
      const keep = e.fx.update(dt, yaw);
      if (!keep) e.fx.dispose();
      return keep;
    });
  }

  _project(p) {
    const v = this._v ?? (this._v = new THREE.Vector3());
    v.set(p.x, p.y, p.z).project(this.camera);
    if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) return null;
    return { x: ((v.x + 1) / 2) * this.size.w, y: ((1 - v.y) / 2) * this.size.h };
  }

  updateHud(dt) {
    const hud = this.hud;
    if (this.mode !== 'play' && this.mode !== 'dead') {
      hud.beginWorld();
      hud.endWorld();
      return;
    }
    hud.stats(this.hero, { fireball: this.cd.fireball / R.ABILITIES.fireball.cd, whirl: this.cd.whirl / R.ABILITIES.whirl.cd });
    const area = R.areaAt(this.heroPos.x, this.heroPos.z);
    hud.area(area === 'woods' ? 'Lanternwood' : R.WORLD.areas[area].name);
    hud.resting(this._resting && !this.dialogue.open);
    hud.beginWorld();
    const h = this.heroPos;
    // Markers over people.
    for (const n of this.npcs) {
      const m = this.markerFor(n.id);
      const d = Math.hypot(h.x - n.x, h.z - n.z);
      const p = this._project({ x: n.x, y: n.actor.height + 0.55, z: n.z });
      if (!p || d > 40) continue;
      hud.marker(`npc-${n.id}`, m ?? 'talk', p.x, p.y, n.name, d < 6);
    }
    // Herbs and braziers, while they matter.
    if (this.state.quests.embers.state === 'active') {
      for (const herb of this.world.herbs) {
        if (herb.taken || Math.hypot(h.x - herb.x, h.z - herb.z) > 26) continue;
        const p = this._project({ x: herb.x, y: 1.1, z: herb.z });
        if (p) hud.marker(`herb-${herb.i}`, 'herb', p.x, p.y);
      }
    }
    if (this.state.quests.braziers.state === 'active') {
      for (const b of this.world.braziers) {
        if (b.lit || Math.hypot(h.x - b.x, h.z - b.z) > 40) continue;
        const p = this._project({ x: b.x, y: 2.4, z: b.z });
        if (p) hud.marker(`brazier-${b.id}`, 'fire', p.x, p.y);
      }
    }
    // Health bars over hurt or angry foes.
    for (const e of this.enemies) {
      if (!e.alive || e.def.boss) continue;
      if (e.hp >= e.def.hp && e.state !== 'chase' && e.state !== 'windup') continue;
      if (Math.hypot(h.x - e.x, h.z - e.z) > 24) continue;
      const p = this._project({ x: e.x, y: e.actor.height + e.actor.lift + 0.25, z: e.z });
      if (p) hud.bar(e.id, p.x, p.y, e.hp / e.def.hp, `Lv${e.def.level} ${e.def.name}`);
    }
    hud.endWorld();
    hud.updateNumbers(dt, (a) => this._project(a));
    hud.tracker(this.state.quests);
    const it = this.dialogue.open || this.overlay ? null : this._interactable();
    hud.prompt(it?.label ?? '');
  }
}
