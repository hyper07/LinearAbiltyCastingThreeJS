import * as THREE from 'three';
import { PowerKit } from '../shared/powerKit.js';
import { CameraAssist, loadAssist, cameraMenu, menuSections, PressDrag } from '../shared/cameraAssist.js';
import { HelpPanel, helpButton } from '../shared/helpPanel.js';
import { GameMusic, lanternwoodTrack } from '../shared/gameMusic.js';
import { CONTROLS } from './controls.js';
import { loadFx, FxPlayer } from '../pixel/fx.js';
import * as R from './rules.js';
import { buildSprites, heroSpriteFor } from './sprites.js';
import { buildWorld } from './world.js';
import { buildRealmWorld } from './realmWorld.js';
import { FxBillboard, disposeTextures, canvasOf } from './gfx.js';
import { RigActor, SwordTrail } from './rig.js';
import { weaponGeometry, disposeGear } from './gear3d.js';
import { Post } from './post.js';
import { Vfx, auraMesh } from './vfx.js';
import { rayToGround, snapToFoe, usesPointer, legMotion, MAX_TWIST } from './aim.js';
import { openPlaced, openChest, chestGone, chestLoot, CHEST_TIERS, CHEST_VANISH } from './chests.js';
import { buildChest, lootBeam } from './props.js';
import { prewarmBeast } from './beasts.js';
import { prewarmSculptedBeast } from './sculpt/beastActor.js';
import { isSculptedBeast } from './sculpt/beasts.js';
import { SCULPTED_FIGURES } from './sculpt/build.js';
import { voxelParts } from './voxel.js';
import { Hud, Dialogue, panel, titleHtml, fillLooks, el, drawMinimap, drawMap } from './ui.js';
import { HeroPreview, openInventory, openCharacter, openJournal, openRealms, openShop, openParty, openPause } from './panels.js';
import { CombatMixin } from './combat.js';
import { FoeMixin } from './foes.js';
import { Coop } from './coop.js';
import './hd2d.css';

/**
 * Lanternwood: an action RPG in the "HD-2D" style — pixel-art people made
 * solid, standing in lit 3D worlds, seen from behind and above the hero.
 * Four classes (Blade, Warden, Seer, Ranger) with their own skills and
 * gear; four realms linked by waystones (the Lanternwood night forest and
 * camp, Sunmeadow Hills, Frostpeak Hollows, Emberfall Caldera), each with
 * its own monsters, hero monsters and a boss; a bag, equipment that shows on
 * the figure, traders and smiths; and co-op for up to four over the
 * platform's party rooms.
 *
 *   const game = new LanternwoodGame(document.body, { onClose });
 *   await game.open();   …   game.close();
 *
 * Rules (classes, items, realms, quests, save) are pure modules — rules.js
 * re-exports them; the fight is split into combat.js (the hero) and foes.js
 * (the monsters); co-op in coop.js; windows in panels.js; the HUD in ui.js.
 */

const FX_IDS = [
  'fire/campfire', 'fire/torch', 'fire/spirit-flame', 'fire/brazier', 'fire/fire-breath', 'fire/flame-pillar', 'fire/meteor', 'impacts/hit-spark', 'impacts/crit-hit', 'impacts/ground-slam',
  'impacts/shield-block', 'ui/level-up', 'pickups/coin-spin', 'pickups/crystal-shard', 'pickups/potion', 'pickups/collect-burst', 'spawn/poof', 'spawn/soul-rise', 'holy/heal', 'holy/heal-aoe',
  'holy/divine-shield', 'holy/blessing', 'arcane/mana-burst', 'arcane/blink-in', 'arcane/blink-out', 'arcane/portal', 'melee/spin-slash', 'melee/heavy-cleave', 'shadow/dark-explosion',
  'explosions/small-explosion', 'explosions/big-explosion', 'explosions/dirt-explosion', 'moves/dash-strike', 'nature/quake', 'nature/healing-bloom', 'nature/root-snare', 'nature/earth-spike',
  'ice/frost-nova', 'ice/ice-shatter', 'ice/blizzard-vortex', 'ice/snowflake-burst', 'ice/icicle-fall', 'ice/frost-breath', 'status/stunned', 'status/rage'
];
const FIRE_RAMP = ['#4a1712', '#8a1f17', '#c9281f', '#f2561d', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6', '#ffffff'];
const TAU = Math.PI * 2;
const wrap = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const dirOf = (a) => [Math.sin(a), Math.cos(a)];
const HERO_R = 0.42;
/** How much daylight each realm has (the additive effects tone down in the sun). */
/** The aim reticle's colour, by class. */
const CLASS_AIM = { seer: '#8ad8ff', ranger: '#c8f07a', blade: '#ffb070', warden: '#a8e070' };
const DAYLIGHT = { lanternwood: 0, sunmeadow: 1, frostpeak: 0.25, emberfall: 0.3 };
/** Footstep dust: its colour and how much shows, per realm. */
const DUST = { lanternwood: ['#6a5848', 0.22], sunmeadow: ['#c8b080', 0.3], frostpeak: ['#eef4ff', 0.45], emberfall: ['#4a3a36', 0.35] };
/** Screen flashes and shake are softened for players who ask for less motion. */
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

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

/** A foe in one of these states is after someone (foes.js): the music goes to battle. */
const FIGHTING = new Set(['chase', 'windup', 'strike', 'recover', 'burrowed']);

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
      this.camAssist.key(e.code, false);
    };
    this._onBlur = () => {
      this.keys.clear();
      this.camAssist.clear();
    };
    // Q / E (or , .) turn the camera, / puts it behind the hero; it eases back by itself after a quiet spell.
    this.camAssist = new CameraAssist(loadAssist('lanternwood'), { id: 'lanternwood' });
    this.root.addEventListener('keydown', this._onKey);
    this.root.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    window.lanternwood = this;
    this.closed = false;
    this.net = new Coop(this);
  }

  /* ================================================================ life */

  async open() {
    this.root.innerHTML = '<div class="ld-loading"><h1>Lanternwood</h1><p>Lighting the lanterns…</p></div>';
    this.root.focus();
    const mods = new Map();
    await Promise.all(FX_IDS.map(async (id) => mods.set(id, await loadFx(id))));
    this._fxMods = mods;
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
    // The moon's shadow is redrawn when due (every other frame on the lighter presets).
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'ld-canvas';
    stage.append(this.canvas);
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 400);

    // Shapes shared by every realm.
    this.ringGeo = new THREE.RingGeometry(0.88, 1, 48).rotateX(-Math.PI / 2);
    this.discGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
    this.rectGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
    this.orbGeo = new THREE.SphereGeometry(0.2, 10, 8);
    this.arrowGeo = weaponGeometry({ shape: 'arrow' });
    this.arrowMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#3a2a1a' });
    this.lanceGeo = new THREE.OctahedronGeometry(0.2, 0).scale(0.7, 0.7, 4);
    this.lanceMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#bff0ff').multiplyScalar(1.8) });
    this.totemGeo = new THREE.CylinderGeometry(0.14, 0.2, 1.4, 6).translate(0, 0.7, 0);
    this.totemMat = new THREE.MeshLambertMaterial({ color: '#7a5434' });
    this.totemTopGeo = new THREE.OctahedronGeometry(0.28, 0);
    this.totemTopMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7aff9a').multiplyScalar(1.8) });
    this.trapGeo = new THREE.RingGeometry(0.25, 0.6, 8).rotateX(-Math.PI / 2);
    this.trapMat = new THREE.MeshLambertMaterial({ color: '#9aa4ac', emissive: '#2a2a20', side: THREE.DoubleSide });
    this.moundGeo = new THREE.SphereGeometry(0.75, 9, 4, 0, TAU, 0, Math.PI / 2);
    this.moundMat = new THREE.MeshLambertMaterial({ color: '#6a5034', flatShading: true });
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
    this.pickupFx = { gold: this.makeFx('pickups/coin-spin'), crystal: this.makeFx('pickups/crystal-shard'), potion: this.makeFx('pickups/potion') };

    // What lives across realms: the hero, their trail, two moving lights.
    this.heroActor = new RigActor({ shadow: 0.45, detail: 1 });
    this.heroActor.onStep = () => this._footDust(this.heroPos.x, this.heroPos.z);
    this.trail = null;
    this.projLight = new THREE.PointLight('#ff8a3a', 0, 12, 1.8);
    this.bossLight = new THREE.PointLight('#6ad8ff', 0, 16, 1.6);
    this.heroPos = { x: R.WORLD.start.x, z: R.WORLD.start.z, face: R.WORLD.start.face };
    this.effects = [];
    this.projectiles = [];
    this.drops = [];
    this.lootChests = [];
    this.enemies = [];
    this.zones = [];
    this.warnings = [];
    this.pending = [];
    this.npcs = [];
    this.buffs = { guard: 0, fury: 0, ward: 0, regen: null };
    this.cd = {};
    this.shake = 0;
    this.pulse = 0;
    this.reducedMotion = REDUCED;
    this.hitstop = 0;
    this.hurtFx = 0;
    this.camYaw = 0;
    this.camDist = 8.4;
    this.camPos = new THREE.Vector3(0, 6, 16);
    this.camLook = new THREE.Vector3();
    this.t = 0;
    this._fpsAcc = [];

    this.buildRealm('lanternwood');
    this.post = new Post(this.renderer, this.scene, this.camera);
    this._resize = new ResizeObserver(() => this.resize());
    this._resize.observe(this.root);
    this.resize();
    this.hud = new Hud(this.root, this.sprites);
    // How to play (H, the ? by the minimap, the pause window): a window, so the world waits while it's up (alone).
    this.help = new HelpPanel({
      host: this.root,
      id: 'lanternwood',
      table: CONTROLS,
      onOpen: () => {
        this.overlay = 'help';
        this.keys.clear();
      },
      onClose: () => {
        if (this.overlay === 'help') this.overlay = null;
        this.root.focus();
      }
    });
    const mini = this.root.querySelector('.ld-mini');
    if (mini) helpButton(mini, () => this.openHelp(), { style: 'left:-4px;top:-4px;width:30px;height:30px;font-size:15px' });
    this.dialogue = new Dialogue(this.root, this.sprites);

    this._bindPointer();
    // Power: a capped loop (60 by default), stopped in a hidden tab, on demand behind the pause window.
    this.power = new PowerKit('lanternwood', { renderer: this.renderer, profile: { quietFps: 45 }, features: { grass: false, ao: false, rays: false, distance: false }, onChange: () => this.applyPower() });
    this.applyPower();
    // The soundtrack (docs/music.md): First Light on the title; in play, by realm — the camp's hearth, the
    // night forest, the sunlit hills, Rime Keep in the snow and the ash — Steel Rain in a fight, Crown of
    // Cinders for a boss. On/off and volume are in the pause menu.
    this.music = new GameMusic('lanternwood', { moods: { battle: 'battle', boss: 'boss' }, hold: 5 });
    this.title();
    this.power.start((ms) => {
      this._menuKind();
      this.frame(Math.min(0.05, ms / 1000));
    });
    // Windows come and go: re-decide whether the world needs drawing.
    this._overlays = new MutationObserver(() => {
      this._menuKind();
      this.power.invalidate();
    });
    this._overlays.observe(this.root, { childList: true });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.music?.dispose();
    if (this.mode === 'play' || this.mode === 'dead') this.save();
    this.net.close();
    this.power?.dispose();
    this._overlays?.disconnect();
    this._resize?.disconnect();
    window.removeEventListener('blur', this._onBlur);
    this._clearRealm();
    this.world?.dispose();
    this.heroActor?.dispose();
    this.trail?.dispose();
    this.vfx?.dispose();
    this.preview?.dispose();
    for (const p of Object.values(this.pickupFx ?? {})) p._texture?.dispose();
    for (const g of [this.ringGeo, this.discGeo, this.rectGeo, this.orbGeo, this.lanceGeo, this.totemGeo, this.totemTopGeo, this.trapGeo, this.moundGeo]) g?.dispose();
    for (const m of [this.arrowMat, this.lanceMat, this.totemMat, this.totemTopMat, this.trapMat, this.moundMat]) m?.dispose();
    for (const g of this._cones?.values() ?? []) g.dispose();
    this.arcTex?.dispose();
    this.glowTex?.dispose();
    this.reticle?.g.children.forEach((m) => m.geometry.dispose());
    this.reticle?.mat.dispose();
    disposeGear();
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
    this.power?.invalidate();
    this.post.tiltH.uniforms.uStrength.value = this.post.tiltV.uniforms.uStrength.value = this.pixelRatio;
    this.size = { w, h };
  }

  fxReady(id) {
    return Boolean(this._fxMods?.get(id));
  }

  rarityColor(r) {
    return R.RARITIES[r]?.color ?? '#ffffff';
  }

  /* ============================================================= realms */

  /** Everything that belongs to the realm being left: monsters, missiles, loot on the ground, people. */
  _clearRealm() {
    for (const e of this.enemies ?? []) this._disposeEnemy(e);
    this.enemies = [];
    this.boss = null;
    for (const p of this.projectiles ?? []) this._dropProjectile(p);
    this.projectiles = [];
    for (const d of this.drops ?? []) this._disposeDrop(d);
    this.drops = [];
    // Reward chests left unopened stay behind in the realm being left (gone).
    for (const c of this.lootChests ?? []) this._disposeLootChest(c);
    this.lootChests = [];
    for (const e of this.effects ?? []) e.fx.dispose();
    this.effects = [];
    for (const z of this.zones ?? []) {
      z.ring.material.dispose();
      z.ring.removeFromParent();
      z.mesh?.removeFromParent();
      z.light?.removeFromParent();
    }
    this.zones = [];
    this.vfx?.clear();
    this.warnings = [];
    for (const m of this._warnPool ?? []) {
      m.ring.material.dispose();
      m.disc.material.dispose();
    }
    this._warnPool = [];
    for (const n of this.npcs ?? []) n.actor.dispose();
    this.npcs = [];
    this.pending = [];
    this.hud?.clearWorld();
  }

  /** Build a realm's world and people (the old one goes). */
  buildRealm(id) {
    this._clearRealm();
    this.world?.dispose();
    this.realm = id;
    this.realmDef = R.realmLayout(id);
    this.world = id === 'lanternwood' ? buildWorld({ makeFx: this.makeFx, sprites: this.sprites }) : buildRealmWorld(id, { makeFx: this.makeFx, sprites: this.sprites });
    this.scene = this.world.scene;
    if (this.post) this.post.render.scene = this.scene;
    this.scene.add(this.heroActor.group, this.projLight, this.bossLight);
    this.trail?.dispose();
    this.trail = new SwordTrail(this.scene);
    if (this.vfx) this.vfx.attach(this.scene);
    else this.vfx = new Vfx(this.scene);
    this.vfx.day = DAYLIGHT[id] ?? 0;
    this._grid = null;
    this.moundMat.color.set({ lanternwood: '#5a4030', sunmeadow: '#7a5a34', frostpeak: '#c8d4e4', emberfall: '#3a2a26' }[id]);
    // The people of this realm, on joints, in their own gear.
    this.npcs = R.npcsIn(id).map((nid) => {
      const n = R.NPCS[nid];
      const a = new RigActor({ shadow: n.child ? 0.32 : 0.42, scale: n.child ? 0.74 : 1, detail: 2 });
      a.show(this.sprites.npcs[nid].front[0]);
      if (n.look?.gear) a.setGear(n.look.gear);
      a.group.position.set(n.x, 0, n.z);
      this.scene.add(a.group);
      return { id: nid, ...n, actor: a, face: n.face, talking: false };
    });
    // Build the fine (near-camera) figures of this realm's people and monsters a few at a time in the
    // background, so none stalls a frame the first time it comes close.
    const jobs = [
      ...this.npcs.map((n) => () => (n.actor.sprite?.person && SCULPTED_FIGURES ? n.actor.prewarm() : voxelParts(n.actor.sprite, { step: 1 }))),
      ...Object.keys(R.ENEMIES).filter((k) => R.ENEMIES[k].realm === id).map((k) => () => (SCULPTED_FIGURES && isSculptedBeast(k) ? prewarmSculptedBeast(k) : prewarmBeast(k, this.sprites.enemies[k]?.[0])))
    ];
    const realmNow = id;
    const run = () => {
      const job = jobs.shift();
      if (!job || this.closed || this.realm !== realmNow) return;
      job();
      setTimeout(run, 40);
    };
    setTimeout(run, 300);
    if (this.power) this.applyPower();
  }

  /** How to play (from play, or the pause window). */
  openHelp() {
    if (this.mode !== 'play' && this.mode !== 'dead') return;
    if (this.overlay && this.overlay !== 'help') this.closeOverlay();
    this.help.open();
  }

  /** Graphics: frame cap, the moon's shadow (off / near: a smaller map, redrawn every other frame / full) and bloom. */
  applyPower() {
    const c = this.power.choices;
    this.scene?.traverse((o) => {
      if (!o.isDirectionalLight) return;
      o.castShadow = c.shadows !== 'off';
      const size = c.shadows === 'full' ? 2048 : 1024;
      if (o.shadow.mapSize.x !== size) {
        o.shadow.mapSize.set(size, size);
        o.shadow.map?.dispose();
        o.shadow.map = null;
      }
    });
    this.shadowEvery = c.shadows === 'full' ? 1 : 2;
    if (this.post) this.post.bloom.enabled = c.bloom;
    this.renderer.shadowMap.needsUpdate = true;
    this.power.invalidate();
  }

  /** What the loop does: the title — at most 30 a second; a window over a paused world — on demand; else play. */
  _menuKind() {
    if (!this.power) return;
    const solo = !this.net?.room;
    let kind = 'none';
    if (this.mode === 'title' || this.mode === 'loading') kind = 'live';
    else if (this.overlay && solo) kind = this.overlay === 'pause' ? 'still' : 'live';
    this.power.setMenu(kind);
  }

  /** Bring the saved state into the world just built: herbs picked, braziers lit, chests opened. */
  _applyWorldState() {
    const s = this.state;
    if (this.realm === 'lanternwood') {
      for (const i of s.herbsTaken) this.world.takeHerb(i);
      for (const bid of s.braziers) this.world.lightBrazier(bid);
      this.world.setProgress(R.questsDone(s.quests, 'lanternwood'), R.questsIn('lanternwood').length);
      this.world.waystoneOn = R.realmUnlocked(s.quests, 'sunmeadow');
    } else for (const i of s.gathered[this.realm] ?? []) this.world.takeHerb(i);
    // Placed chests opened on this journey are gone (they sank away when opened).
    for (const c of this.world.chests) if (s.chests.includes(c.id)) {
      c.opened = true;
      c.group.visible = false;
    }
  }

  /**
   * Go to a realm (through a waystone, by a scroll, or following the party's
   * host): a fade, the new world, the hero at its waystone.
   */
  travel(id, { follow = false, toWaystone = false } = {}) {
    if (!R.REALMS[id]) return;
    if (!follow && !R.realmUnlocked(this.state.quests, id)) {
      this.hud.toast('That realm is sealed.', 'warn');
      return;
    }
    if (this.net.isGuest && !follow && id !== this.realm) {
      this.hud.toast('The party leader chooses the realm.', 'warn');
      return;
    }
    const L = R.realmLayout(id);
    if (id !== this.realm) {
      this.save();
      this.buildRealm(id);
      this._applyWorldState();
      if (!this.net.isGuest) this._spawnRealmFoes();
    }
    void toWaystone;
    // Arrive on the hub's side of the waystone, facing the hub.
    const spot = { x: L.waystone.x, z: L.waystone.z - 8.5, face: Math.PI };
    this.heroPos.x = spot.x;
    this.heroPos.z = spot.z;
    this.heroPos.face = spot.face ?? Math.PI;
    this.camYaw = wrap(this.heroPos.face + Math.PI);
    this._snapCamera();
    this._fade = 1;
    this.hud.toast(`<small>${R.REALMS[id].sub}</small><b>${R.REALMS[id].name}</b>`, 'realm');
    this.music?.jump(this.musicArea(), { fade: 2.5 });
    this.fx('arcane/blink-in', this.heroPos.x, 0, this.heroPos.z, { pxm: 36, color: 1.4 });
    this.state.realm = id;
    this.save();
  }

  /* =============================================================== music */

  /** The realm's track, the camp's hearth while you're round the fire in Lanternwood. */
  musicArea() {
    const camp = this.realm === 'lanternwood' ? this.realmDef?.areas?.camp : null;
    const inCamp = camp && Math.hypot(this.heroPos.x - camp.x, this.heroPos.z - camp.z) < camp.r + 6;
    return lanternwoodTrack({ realm: this.realm, area: inCamp ? 'camp' : null });
  }

  /**
   * The soundtrack's mood: Steel Rain as soon as a foe within 20 m is after
   * you, Crown of Cinders while the realm's boss fights within 32 m, the
   * realm's own track 5 s after the last one breaks off.
   */
  musicFrame(dt) {
    let fight = false;
    let boss = false;
    if (this.mode === 'play') {
      const h = this.heroPos;
      for (const e of this.enemies ?? []) {
        if (!e.alive || !FIGHTING.has(e.state)) continue;
        const d = Math.hypot(e.x - h.x, e.z - h.z);
        if (d < 20) fight = true;
        if (e === this.boss && d < 32) boss = true;
      }
    }
    this.music?.update(dt, { area: this.musicArea(), fight: fight || boss, boss });
  }

  /* =============================================================== title */

  title() {
    this.mode = 'title';
    this.music?.jump('title');
    this.overlay = null;
    this.dialogue.close();
    this.hud.show(false);
    this.hud.clearWorld();
    this.root.querySelector('.ld-overlay')?.remove();
    if (this.realm !== 'lanternwood') this.buildRealm('lanternwood');
    const save = storage.load();
    const wrapEl = el('div', 'ld-overlay ld-overlay--title');
    wrapEl.innerHTML = titleHtml(save);
    this.root.append(wrapEl);
    let cls = save?.hero.cls ?? 'blade';
    let look = save?.hero.look ?? R.defaultLook(cls).id;
    this.preview ??= new HeroPreview();
    const paint = () => {
      for (const b of wrapEl.querySelectorAll('[data-class]')) b.setAttribute('aria-checked', String(b.dataset.class === cls));
      fillLooks(wrapEl.querySelector('[data-looks]'), cls, look, (id) => {
        look = id;
        paint();
      });
      this.preview.set(look, R.gearLook(R.startingGear(cls)));
    };
    for (const b of wrapEl.querySelectorAll('[data-class]')) b.addEventListener('click', () => {
      cls = b.dataset.class;
      look = R.defaultLook(cls).id;
      paint();
    });
    paint();
    this._previewCanvas = wrapEl.querySelector('[data-preview]');
    wrapEl.querySelector('[data-close]').addEventListener('click', () => this.close());
    wrapEl.querySelector('[data-new]').addEventListener('click', () => {
      wrapEl.remove();
      this.start(R.newGame(cls, look), true);
    });
    wrapEl.querySelector('[data-continue]')?.addEventListener('click', () => {
      wrapEl.remove();
      this.start(save, false);
    });
    this.titleEl = wrapEl;
  }

  /** Begin play from a game state (fresh or loaded). */
  start(state, fresh) {
    this.state = state;
    this.hero = state.hero;
    this._previewCanvas = null;
    if (state.realm !== this.realm) this.buildRealm(state.realm);
    else {
      // Rebuild Lanternwood clean, so a different save starts from a clean slate.
      this.world.reset();
    }
    this._applyWorldState();
    this.gearChanged(true);
    [this.heroPos.x, this.heroPos.z] = state.pos;
    this.heroPos.face = fresh ? R.WORLD.start.face : this.heroPos.face;
    this.camYaw = wrap(this.heroPos.face + Math.PI);
    this.hv = { kx: 0, kz: 0, roll: 0, rdx: 0, rdz: 0, inv: 0, attack: 0, walkT: 0, moving: false, hurtT: 9, pose: null, dash: null };
    this.cd = { basic: 0, roll: 0 };
    this.buffs = { guard: 0, fury: 0, ward: 0, regen: null };
    this.chillT = 0;
    this._bossDownUntil = 0;
    this._spawnRealmFoes();
    this.mode = 'play';
    this.music?.jump(this.musicArea(), { fade: 2.5 });
    this.overlay = null;
    this.hud.show(true);
    this.hud.tracker(state.quests, this.realm);
    this._autosave = 15;
    this._snapCamera();
    this.root.focus();
    if (state.migratedFrom) {
      setTimeout(() => this.hud.toast(`<small>Your journey carried over</small><b>You are a ${R.CLASSES[this.hero.cls].name}</b><span>New: classes, realms, a bag and gear (I)</span>`, 'quest'), 900);
      delete state.migratedFrom;
      this.save();
    }
    if (fresh) {
      this.save();
      setTimeout(() => {
        if (this.mode === 'play' && !this.dialogue.open) this.dialogue.play(R.INTRO, () => this.hud.tracker(this.state.quests, this.realm), this._heroLine());
      }, 600);
    }
    this.help.openFirstTime();
  }

  _heroLine() {
    return { name: R.lookById(this.hero.look)?.name ?? 'Wayfarer', role: R.CLASSES[this.hero.cls].name, sprite: this.heroSprite };
  }

  /** The hero's gear changed: the figure, its look on the rig, the stats, the HUD. */
  gearChanged(force = false) {
    this.gearLook = R.gearLook(this.hero.equip);
    this.heroSprite = heroSpriteFor(this.hero.look, this.gearLook);
    if (force) this.heroActor.sprite = null;
    this.heroActor.show(this.heroSprite);
    this.heroActor.setGear(this.gearLook);
    this.hud.setHero(this.hero, this.heroSprite);
    this.stats = R.statsOf(this.hero, this.buffs);
    this.hero.hp = Math.min(this.hero.hp, this.stats.maxHp);
    this.hero.mp = Math.min(this.hero.mp, this.stats.maxMp);
  }

  save() {
    if (!this.state) return;
    this.state.pos = [this.heroPos.x, this.heroPos.z];
    this.state.realm = this.realm;
    storage.save(this.state);
  }

  /* ============================================================== input */

  _key(e) {
    if (e.target?.tagName === 'INPUT') return;
    e.stopPropagation();
    const code = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) e.preventDefault();
    if (e.repeat && !['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) return;
    if (this.mode === 'title') {
      if (code === 'Escape') this.close();
      else if (code === 'Enter') (this.titleEl?.querySelector('[data-continue]') ?? this.titleEl?.querySelector('[data-new]'))?.click();
      return;
    }
    if (this.mode === 'ending') {
      if (code === 'Escape' || code === 'Enter') this.root.querySelector('[data-keep]')?.click();
      return;
    }
    if (this.mode !== 'play' && this.mode !== 'dead') return;
    if (this.dialogue.open) {
      if (['Space', 'KeyF', 'Enter', 'NumpadEnter'].includes(code)) this.dialogue.advance();
      else if (code === 'Escape') {
        while (this.dialogue.open) {
          this.dialogue.advance();
          this.dialogue.advance();
        }
      }
      return;
    }
    if (this.overlay) {
      const toggles = { inv: ['KeyI', 'KeyB'], char: ['KeyC'], journal: ['KeyJ'], map: ['KeyM', 'KeyO'], party: ['KeyP'], shop: ['KeyF'], help: ['KeyH'] };
      if (code === 'Escape' || toggles[this.overlay]?.includes(code)) this.closeOverlay();
      else if (this.overlay === 'shop' && /^Digit[1-9]$/.test(code)) {
        const line = R.SHOP[Number(code.slice(5)) - 1];
        if (line && R.NPCS[this.shopOpen]?.shop === 'general') this.buy(line.id);
      }
      return;
    }
    if (this.camAssist.key(code, true)) return;
    this.keys.add(code);
    if (this.mode === 'dead') return;
    switch (code) {
      case 'Space':
        this.basic();
        break;
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
        this.castSkill(Number(code.slice(5)));
        break;
      case 'Digit5':
        this.drink('hp');
        break;
      case 'Digit6':
        this.drink('mp');
        break;
      case 'Digit7':
        this.eat();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.roll();
        break;
      case 'KeyF':
        this.interact();
        break;
      case 'KeyI':
      case 'KeyB':
        openInventory(this);
        break;
      case 'KeyC':
        openCharacter(this);
        break;
      case 'KeyJ':
        openJournal(this);
        break;
      case 'KeyM':
      case 'KeyO':
        // O is the full map in every 3D game; here it is Lanternwood's own realm map (M as before).
        openRealms(this);
        break;
      case 'KeyP':
        openParty(this);
        break;
      case 'Escape':
        openPause(this);
        break;
      case 'KeyH':
        this.openHelp();
        break;
      default:
    }
  }

  _bindPointer() {
    const c = this.canvas;
    let drag = null;
    // Left mouse (or a finger): a click (or a press held still) attacks; a press that moves first only turns
    // the camera (shared/cameraAssist.js PressDrag). The other buttons drag the camera as before.
    const lmb = (this.lmb = new PressDrag());
    const attack = () => {
      this._updateReticle(0);
      if (!this._clickChest()) this.basic();
    };
    c.style.touchAction = 'none';
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      this.root.focus();
      if (this.mode !== 'play') return;
      if (this.dialogue.open) {
        this.dialogue.advance();
        return;
      }
      if (this.overlay) return;
      if (e.pointerType !== 'touch') track(e, false);
      c.setPointerCapture?.(e.pointerId);
      if (e.button === 0) lmb.down(e.clientX, e.clientY, performance.now());
      else drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    // The pointer over the game: where it is, and when the player last moved it (a pointer that only
    // happens to rest on the canvas — keyboard play — never counts as aiming).
    const track = (e, moving = true) => {
      const b = c.getBoundingClientRect();
      const x = e.clientX - b.left, y = e.clientY - b.top;
      const moved = moving && this.mouse && Math.hypot(x - this.mouse.x, y - this.mouse.y) > 2;
      this.mouse = { x, y, on: true, t: moved ? this.t : this.mouse?.t ?? null };
    };
    c.addEventListener('pointerleave', () => {
      if (this.mouse) this.mouse.on = false;
    });
    c.addEventListener('pointerenter', (e) => track(e, false));
    const turn = (dx) => {
      this.camYaw = wrap(this.camYaw - dx * 0.006);
      this._dragT = 0.6;
      this.camAssist.input();
    };
    c.addEventListener('pointermove', (e) => {
      if (lmb.active) {
        const m = lmb.move(e.clientX, e.clientY, performance.now());
        if (m.kind === 'drag') return turn(m.dx);          // the aim holds still while the view turns
        if (m.kind === 'hold' && !lmb.fired) {
          lmb.fired = true;
          attack();
        }
      }
      if (e.pointerType !== 'touch') track(e);
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      drag.y = e.clientY;
      turn(dx);
    });
    // A press held still attacks once it's a hold (as a press used to at once).
    this._lmbTick = () => {
      if (lmb.tick(performance.now()) === 'hold' && !lmb.fired) {
        lmb.fired = true;
        attack();
      }
    };
    const end = (e) => {
      if (drag?.id === e.pointerId) drag = null;
      if (e.button === 0 || e.type === 'pointercancel') {
        const k = lmb.up(performance.now());
        if ((k === 'click' || k === 'release-late') && e.type !== 'pointercancel') attack();
        lmb.fired = false;
      }
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDist = Math.max(6, Math.min(12, this.camDist + Math.sign(e.deltaY) * 0.5));
    }, { passive: false });
  }

  /* ============================================================ overlays */

  closeOverlay() {
    if (this.help?.isOpen) this.help.close();
    this.root.querySelector('.ld-overlay:not(.ld-overlay--title)')?.remove();
    this.overlay = null;
    this.shopOpen = null;
    this._previewCanvas = null;
    this._refreshBag = null;
    this._paintShop = null;
    this._paintParty = null;
    this._mapCanvas = null;
    this.root.focus();
  }

  refreshParty() {
    if (this.overlay === 'party') this._paintParty?.();
  }

  _resetWorldForTitle() {
    this._clearRealm();
    this.world.reset();
  }

  buy(id) {
    const r = R.buy(this.hero, id);
    const item = R.SHOP.find((s) => s.id === id);
    if (r.ok) this.hud.log(`Bought: ${item.name}`);
    else this.hud.toast(r.reason, 'warn');
    if (id === 'charm-hp' || id === 'charm-atk') this.stats = R.statsOf(this.hero, this.buffs);
    this._paintShop?.();
    this.save();
  }

  /* ============================================================== world */

  markerFor(npcId) {
    return R.npcMarker(this.state.quests, npcId);
  }

  /** Where the quest points, in this realm: its area, the person to hand it to — or the waystone, for a quest in another realm. */
  questTarget() {
    const log = this.state.quests;
    const cur = R.currentQuest(log, this.realm);
    const q = cur?.quest ?? R.QUESTS.find((x) => log[x.id].state === 'available' && x.realm === this.realm) ?? R.QUESTS.find((x) => log[x.id].state === 'available');
    if (!q) return null;
    const giverRealm = R.NPCS[q.giver].realm;
    if (!cur || cur.state === 'ready') return giverRealm === this.realm ? R.NPCS[q.giver] : this.realmDef.waystone;
    if (q.realm !== this.realm) return this.realmDef.waystone;
    return this.realmDef.areas[q.area];
  }

  /** Is a quest asking for what grows here? */
  gatherWanted() {
    const kind = this.realm === 'lanternwood' ? 'herb' : this.realmDef.gather.kind;
    return R.QUESTS.some((q) => q.goal.type === 'gather' && q.goal.target === kind && this.state.quests[q.id].state === 'active');
  }

  fx(id, x, y, z, { pxm = 48, additive = true, color = 1.6, speed = 1, palette, flip } = {}) {
    if (!this.fxReady(id)) return null;
    const f = new FxBillboard(this.makeFx(id, palette ? { palette } : {}), { pxm, additive, color, speed, flip });
    f.mesh.position.set(x, y, z);
    this.scene.add(f.mesh);
    this.effects.push({ fx: f });
    if (this.effects.length > 90) this.effects.shift().fx.dispose();
    return f;
  }

  _questReady(id) {
    const q = R.questById(id);
    this.hud.toast(`<b>${q.name}</b> — return to ${R.NPCS[q.giver].name}`, 'gold');
    this.hud.tracker(this.state.quests, this.realm);
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
    const kind = this.realm === 'lanternwood' ? 'herb' : this.realmDef.gather.kind;
    const gname = this.realm === 'lanternwood' ? 'ember-herb' : this.realmDef.gather.name.toLowerCase();
    for (const h of this.world.gather) {
      if (h.taken) continue;
      const d = Math.hypot(h.x - hx, h.z - hz);
      if (d < Math.min(bd, 2.2)) [best, bd] = [{ type: 'gather', herb: h, kind, label: this.gatherWanted() ? `Gather ${gname}` : `A ${gname} (someone may want these)` }, d];
    }
    for (const b of this.world.braziers) {
      const d = Math.hypot(b.x - hx, b.z - hz);
      if (d < Math.min(bd, 2.6)) [best, bd] = [{ type: 'brazier', brazier: b, label: b.lit ? 'The brazier burns' : this.state.quests.braziers.state === 'active' ? 'Light the brazier' : 'A cold, old brazier' }, d];
    }
    for (const c of this.world.chests) {
      if (c.opened || this.state.chests.includes(c.id)) continue;
      const d = Math.hypot(c.x - hx, c.z - hz);
      if (d < Math.min(bd, 2.4)) [best, bd] = [{ type: 'chest', chest: c, label: 'Open the chest' }, d];
    }
    for (const c of this.lootChests) {
      if (c.opened || !c.landed) continue;
      const d = Math.hypot(c.x - hx, c.z - hz);
      if (d < Math.min(bd, 2.6)) [best, bd] = [{ type: 'lootchest', chest: c, label: c.tier === 'boss' ? 'Open the boss’s hoard' : 'Open the hero monster’s chest' }, d];
    }
    const w = this.realmDef.waystone;
    const dw = Math.hypot(w.x - hx, w.z - hz);
    if (dw < Math.min(bd + 1, 3.6)) best = { type: 'waystone', label: 'Touch the waystone' };
    return best;
  }

  interact() {
    const it = this._interactable();
    if (!it) return;
    if (it.type === 'npc') return this.talk(it.npc);
    if (it.type === 'waystone') {
      if (this.realm === 'lanternwood' && !R.realmUnlocked(this.state.quests, 'sunmeadow')) {
        this.hud.toast('The waystone is cold. Old Hob says it wakes when the woods are safer — help the camp first.');
        return;
      }
      openRealms(this, { atWaystone: true });
      return;
    }
    if (it.type === 'chest') {
      const c = it.chest;
      // Once per journey: marked opened (and saved) before anything is rolled, so it can never give twice.
      if (!openPlaced(this.state.chests, c.id)) return;
      this.world.openChest(c.id);
      c.opened = true;
      c.vanishAt = this.t + CHEST_VANISH;
      this.save();
      const level = Math.max(R.REALMS[this.realm].levels[0], Math.min(this.hero.level, R.REALMS[this.realm].levels[1]));
      const loot = R.rollLoot({ level, tier: 'chest', cls: this.hero.cls });
      this._spill(c, [['gold', 10 + level * 4], ...loot.items, ...loot.consumables]);
      this.hud.log('The chest creaks open');
      this.music?.cue('discovery');
      return;
    }
    if (it.type === 'lootchest') return this._openLootChest(it.chest);
    if (it.type === 'gather') {
      if (!this.gatherWanted()) {
        this.hud.toast('It glows softly. Maybe someone nearby needs these.');
        return;
      }
      const h = it.herb;
      this.world.takeHerb(h.i);
      if (this.realm === 'lanternwood') {
        this.state.herbsTaken.push(h.i);
        this.hero.herbs += 1;
      } else (this.state.gathered[this.realm] ??= []).push(h.i);
      R.gainXp(this.hero, 5 + R.REALMS[this.realm].tier * 10);
      this.fx('pickups/collect-burst', h.x, 0.1, h.z, { pxm: 50, color: 1.6, palette: FIRE_RAMP });
      const q = R.QUESTS.find((x) => x.goal.type === 'gather' && x.goal.target === it.kind && this.state.quests[x.id].state === 'active');
      this.hud.log(`${this.realm === 'lanternwood' ? 'Ember-herb' : this.realmDef.gather.name} gathered (${Math.min(q.goal.count, this.state.quests[q.id].progress + 1)}/${q.goal.count})`);
      for (const id of R.questEvent(this.state.quests, 'gather', it.kind)) this._questReady(id);
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

  /* ============================================================== chests */

  /** A reward chest drops where a hero monster or a boss fell: it falls, bounces, and glows in its colour. */
  _spawnLootChest(chest) {
    const T = CHEST_TIERS[chest.tier];
    const color = R.RARITIES[T.rarity].color;
    const prop = buildChest({ x: chest.x, z: chest.z, rot: Math.random() * Math.PI * 2, wood: chest.tier === 'boss' ? '#4a2a1a' : '#6a3a24', metal: color });
    prop.group.scale.setScalar(T.scale);
    prop.group.position.y = 2.6;
    this.scene.add(prop.group);
    const beam = lootBeam(color, chest.tier === 'boss' ? 0.9 : 0.6);
    beam.group.position.set(chest.x, 0, chest.z);
    beam.group.visible = false;
    this.scene.add(beam.group);
    const c = Object.assign(chest, { prop, beam, color, y: 2.6, vy: 0, landed: false, bounces: 0 });
    this.lootChests.push(c);
    this.vfx.column(chest.x, chest.z, color, { h: chest.tier === 'boss' ? 7 : 4.5, r: 0.5, life: 1.2 });
    return c;
  }

  /** Open a reward chest: once. The lid opens, its loot pops out round it, and soon it sinks away. */
  _openLootChest(c) {
    if (!openChest(c, this.t).ok) return;
    c.prop.open();
    const level = Math.max(this.hero.level, R.REALMS[this.realm].levels[0]);
    const loot = chestLoot(c, { level, cls: this.hero.cls }, R.rollLoot);
    this._spill(c, [['gold', loot.gold], ...loot.items, ...loot.consumables], true);
    this.music?.cue('discovery');
    this.vfx.burst(c.x, 0.8, c.z, { n: 30, color: c.color, color2: '#ffffff', speed: [1, 4], up: 5, life: [0.5, 1.1], size: [0.08, 0.03], shape: 1, grav: 6, drag: 1 });
    this.vfx.ring(c.x, c.z, { color: c.color, r0: 0.3, r1: 2.6, life: 0.6, width: 0.3 });
    this.vfx.flash(c.x, 1.2, c.z, c.color, 30, 0.5);
    this.hud.log(c.tier === 'boss' ? 'The hoard spills open' : 'The chest springs open');
  }

  /** Loot comes out of a chest one piece after another, landing round it. */
  _spill(c, list, pop = false) {
    const n = list.length;
    list.forEach((entry, i) => {
      this._later(0.18 + i * 0.12, () => {
        if (this.closed) return;
        const a = (i / Math.max(1, n)) * Math.PI * 2 + 0.6;
        const r = 1.3 + (i % 2) * 0.4;
        const x = c.x + Math.cos(a) * r, z = c.z + 0.6 + Math.sin(a) * r * 0.8;
        if (Array.isArray(entry)) this._drop(entry[0], entry[1], x, z);
        else this._dropItem(entry, x, z);
        this.vfx.burst(c.x, 0.7, c.z, { n: pop ? 8 : 5, color: '#fff2c0', color2: c.color ?? '#ffd27a', speed: [1, 3], up: 3, life: [0.3, 0.6], size: [0.06, 0.02], shape: 1, grav: 5, drag: 1.5 });
      });
    });
    if (!pop) this.fx('pickups/collect-burst', c.x, 0.6, c.z, { pxm: 36, color: 1.3 });
  }

  _disposeLootChest(c) {
    c.prop.dispose();
    c.beam.dispose();
  }

  /** Reward chests fall and bounce, glow while closed, sink away once opened (or when left too long); placed chests sink once opened. */
  _updateChests(dt) {
    for (const c of this.world.chests) {
      if (c.vanishAt == null || !c.group.visible) continue;
      const k = this.t - c.vanishAt;
      if (k > 0) {
        c.group.position.y = -k * k * 1.6;
        if (Math.random() < dt * 20) this.vfx.dust(c.x, c.z, { n: 1, size: 0.5, alpha: 0.35 });
        if (k > 0.9) c.group.visible = false;
      }
    }
    this.lootChests = this.lootChests.filter((c) => {
      if (!c.landed) {
        c.vy -= 22 * dt;
        c.y += c.vy * dt;
        if (c.y <= 0) {
          c.y = 0;
          if (c.bounces < 2 && Math.abs(c.vy) > 2) {
            c.vy = -c.vy * 0.35;
            c.bounces++;
            this._footDust(c.x, c.z, 1.6);
          } else {
            c.landed = true;
            c.beam.group.visible = true;
            this.vfx.ring(c.x, c.z, { color: c.color, r0: 0.3, r1: 1.8, life: 0.5, width: 0.3 });
          }
        }
        c.prop.group.position.y = c.y;
      }
      if (c.landed && !c.opened) {
        c.beam.material.opacity = 0.55 + Math.sin(this.t * 4) * 0.2;
        if (Math.random() < dt * (c.tier === 'boss' ? 10 : 5)) this.vfx.motes(c.x, c.z, c.color, { r: 0.6, h: 2 });
      }
      if (c.opened) c.beam.material.opacity = Math.max(0, c.beam.material.opacity - dt * 2);
      if (chestGone(c, this.t)) {
        // Sinks into the ground and is gone.
        const k = c.opened ? this.t - c.openedAt - CHEST_VANISH : this.t - c.despawnAt;
        c.prop.group.position.y = -k * k * 1.8;
        if (Math.random() < dt * 20) this.vfx.dust(c.x, c.z, { n: 1, size: 0.55, alpha: 0.35 });
        if (k > 0.9) {
          this._disposeLootChest(c);
          return false;
        }
      }
      c.prop.update(dt);
      return true;
    });
  }

  /** A click on (or right by) a chest the hero stands near opens it instead of swinging. */
  _clickChest() {
    const p = this.aimPoint;
    if (!p) return false;
    const h = this.heroPos;
    const it = this._interactable();
    if (!it || (it.type !== 'chest' && it.type !== 'lootchest')) return false;
    if (Math.hypot(it.chest.x - p.x, it.chest.z - p.z) > 1.4 || Math.hypot(it.chest.x - h.x, it.chest.z - h.z) > 3.2) return false;
    this.interact();
    return true;
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
          if (reward.item) {
            const loot = R.rollLoot({ level: Math.max(this.hero.level, R.REALMS[q.realm].levels[0]), tier: reward.item === 'epic' ? 'boss' : 'elite', cls: this.hero.cls }, Math.random);
            const it = loot.items.find((x) => R.canUse(x, this.hero.cls)) ?? loot.items[0];
            if (it) {
              it.rarity = reward.item;
              const fixed = R.makeItem(it.base, reward.item, it.ilvl);
              if (R.addToBag(this.hero.bag, fixed).ok) bits.push(`<span style="color:${R.RARITIES[fixed.rarity].color}">${fixed.name}</span>`);
              else this._dropItem(fixed, this.heroPos.x, this.heroPos.z + 1);
            }
          }
          this.hud.toast(`<small>Quest complete</small><b>${q.name}</b><span>${bits.join(' · ')}</span>`, 'quest');
          this.fx('pickups/collect-burst', this.heroPos.x, 0.2, this.heroPos.z, { pxm: 40, color: 1.6, palette: FIRE_RAMP });
          if (reward.levels) this._levelUp(reward.levels);
          if (this.realm === 'lanternwood') {
            this.world.setProgress(R.questsDone(this.state.quests, 'lanternwood'), R.questsIn('lanternwood').length);
            this.world.waystoneOn = R.realmUnlocked(this.state.quests, 'sunmeadow');
          }
          for (const id of reward.opened ?? []) {
            const nq = R.questById(id);
            if (nq.auto) this.hud.toast(`<small>New quest</small><b>${nq.name}</b>`, 'quest');
          }
          for (const r of R.REALM_ORDER) if (R.REALMS[r].unlock === action.complete) this.hud.toast(`<small>A waystone wakes</small><b>${R.REALMS[r].name} is open</b><span>Travel from any waystone (F)</span>`, 'realm');
          if (action.complete === 'lampwight') this.ending();
        }
      } else if (action?.shop) openShop(this, npc.id);
      this.hud.tracker(this.state.quests, this.realm);
      this.save();
    }, this._heroLine());
  }

  ending() {
    this.state.ended = true;
    this.save();
    setTimeout(() => {
      this.dialogue.play(R.ENDING, () => {
        this.mode = 'ending';
        const w = el('div', 'ld-overlay ld-overlay--end');
        w.innerHTML = `<div class="ld-end"><h1>The lanterns burn again</h1>
          <p>Lanternwood sleeps under its own light tonight — and the waystone south of camp opens on other realms.</p>
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
          this.net.close();
          this._resetWorldForTitle();
          this.title();
        });
      }, this._heroLine());
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
    // Alone, a window or a conversation pauses the world; in a party it goes on.
    const sim = (this.mode === 'play' || this.mode === 'dead') && ((!this.dialogue.open && !this.overlay) || this.net.room);
    let sdt = dt;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      sdt = dt * 0.1;
    }
    if (sim) {
      this.simulate(sdt);
      this.musicFrame(dt);
    } else if (this.mode === 'title') this.camYaw = wrap(this.camYaw + dt * 0.05);
    if (this.mode !== 'title' && this.mode !== 'loading') this.net.update(dt);
    this.dialogue.update(dt);
    this.updateCamera(dt);
    const yaw = this.camYaw;
    this.world.update(dt, { yaw, hero: this.heroPos, camera: this.camera });
    this.updateActors(dt, yaw);
    this._miniT = (this._miniT ?? 0) - dt;
    if (this._miniT <= 0 && this.mode !== 'title' && this.state) {
      this._miniT = 0.1;
      const mini = this.root.querySelector('[data-mini]');
      if (mini) {
        drawMinimap(mini, this);
        const n = this.root.querySelector('[data-mini-n]');
        if (n) {
          const r = 78;
          n.style.transform = `translate(${-Math.sin(-this.camYaw) * r}px, ${-Math.cos(-this.camYaw) * r}px)`;
        }
      }
    }
    this.updateEffects(dt, yaw);
    this.updateHud(dt);
    if (this.overlay === 'map' && this._mapCanvas && Math.floor(this.t * 10) % 3 === 0) drawMap(this._mapCanvas, this, this._mapRealm?.() ?? this.realm);
    if (this._previewCanvas && this.preview) {
      if (this.mode !== 'title') this.preview.set(this.hero.look, this.gearLook);
      this.preview.draw(dt, this._previewCanvas, { move: 0, guard: this.mode !== 'title' && Boolean(this.gearLook?.offhand?.kind === 'shield') && Math.sin(this.t * 0.7) > 0.6 });
    }
    this.hurtFx = Math.max(0, this.hurtFx - dt * 2.2);
    this._fade = Math.max(0, (this._fade ?? 0) - dt * 1.4);
    const low = this.mode === 'play' && this.hero && this.stats ? Math.max(0, 0.3 - this.hero.hp / this.stats.maxHp) * 1.2 : 0;
    this.post.hurt = Math.max(this.hurtFx * 0.8, low);
    if (this.mode !== 'dead') this.post.fade = this._fade;
    this.pulse = Math.max(0, this.pulse - dt * 5);
    this.post.pulse = this.reducedMotion ? 0 : this.pulse;
    const sh = this.heroPos;
    if (sh) this.renderer.shadowMap.needsUpdate ||= this.power.shadowDue(this.shadowEvery ?? 1, sh.x, sh.z, this.camYaw ?? 0);
    this.power.gpuBegin();
    this.post.draw();
    this.power.gpuEnd();
    this.power.sample(dt * 1000);
    this.power.showFps(this.root);
    this._watchFps(dt);
  }

  _watchFps(dt) {
    // Only judge frames in play: the title and windows run slower on purpose (shared/powerKit.js).
    if (this.power && this.power.menuKind !== 'none') {
      this._fpsAcc = [];
      return;
    }
    this._fpsAcc.push(dt);
    if (this._fpsAcc.length < 120) return;
    const avg = this._fpsAcc.reduce((a, b) => a + b, 0) / this._fpsAcc.length;
    this._fpsAcc = [];
    this.fps = Math.round(1 / avg);
    // Slow means slower than the frame cap allows (a 30 or 45 cap is a choice, not a struggle).
    const cap = this.power?.cap || 0;
    const slow = Math.max(1 / 45, cap ? 1.25 / cap : 0);
    if (avg > slow && this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
      this.resize();
    }
  }

  simulate(dt) {
    const hv = this.hv;
    const hero = this.hero;
    this.stats = R.statsOf(hero, this.buffs);
    const stats = this.stats;
    for (const k of Object.keys(this.cd)) this.cd[k] = Math.max(0, this.cd[k] - dt);
    hv.inv = Math.max(0, hv.inv - dt);
    hv.attack = Math.max(0, hv.attack - dt);
    hv.spin = Math.max(0, (hv.spin ?? 0) - dt);
    hv.cast = Math.max(0, (hv.cast ?? 0) - dt);
    hv.hurt = Math.max(0, (hv.hurt ?? 0) - dt * 4);
    if (hv.swing) {
      hv.swing.t += dt / hv.swing.dur;
      if (hv.swing.t >= 1) hv.swing = null;
    }
    if (hv.pose) {
      hv.pose.t += dt / hv.pose.dur;
      if (hv.pose.t >= 1) hv.pose = null;
    }
    for (const k of ['guard', 'fury', 'ward']) this.buffs[k] = Math.max(0, this.buffs[k] - dt);
    if (this.buffs.regen) {
      this.buffs.regen.t -= dt;
      hero.hp = Math.min(stats.maxHp, hero.hp + this.buffs.regen.rate * dt);
      if (this.buffs.regen.t <= 0) this.buffs.regen = null;
    }
    this.chillT = Math.max(0, (this.chillT ?? 0) - dt);
    if (this.comboHits && (this.comboHitT -= dt) <= 0) {
      this.comboHits = 0;
      this.hud.combo?.(0);
    }
    // What was scheduled (a blow landing as the blade comes through) runs now.
    if (this.pending.length) {
      const due = this.pending.filter((p) => p.at <= this.t);
      this.pending = this.pending.filter((p) => p.at > this.t);
      for (const p of due) p.fn();
    }
    hv.hurtT += dt;
    this._dragT = Math.max(0, (this._dragT ?? 0) - dt);
    this._lmbTick?.();
    this.state.time += dt;

    if (this.mode === 'dead') {
      this.deadT += dt;
      this.post.fade = Math.min(0.85, this.deadT * 0.6);
      if (this.deadT > 2.4) this._respawn();
    } else this._moveHero(dt);

    if (this.net.isGuest) this.net.updateMirrors(dt);
    else this.updateEnemies(dt);
    this.updateWarnings(dt);
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updateDrops(dt);
    this._updateChests(dt);

    this._autosave -= dt;
    if (this._autosave <= 0) {
      this._autosave = 15;
      this.save();
    }
  }

  _moveHero(dt) {
    const hv = this.hv;
    const hero = this.hero;
    const stats = this.stats;
    const [mx, mz] = this._moveInput();
    // Q / E and , . (and a gamepad's right stick) turn the camera.
    const turn = this.camAssist.steer(dt, { extraLeft: this.keys.has('KeyQ'), extraRight: this.keys.has('KeyE') });
    if (turn.yaw) this.camYaw = wrap(this.camYaw + turn.yaw);
    let vx = 0, vz = 0;
    if (hv.dash) {
      // The lunge: a burst forward, striking whatever it passes.
      const d = hv.dash;
      d.t += dt;
      vx = d.dx * d.speed;
      vz = d.dz * d.speed;
      for (const e of this._foesInRadius(this.heroPos.x, this.heroPos.z, 1.3)) {
        if (d.hit.has(e)) continue;
        d.hit.add(e);
        this._hitFoe(e, d.sk.mult, d.sk.knock);
      }
      if (d.t >= d.dur) hv.dash = null;
    } else if (hv.roll > 0) {
      hv.roll -= dt;
      vx = hv.rdx * R.ABILITIES.roll.speed;
      vz = hv.rdz * R.ABILITIES.roll.speed;
    } else if (mx || mz) {
      const slow = (hv.attack > 0 ? 0.45 : 1) * (this.chillT > 0 ? 0.6 : 1) * (this.buffs.guard > 0 ? 0.6 : 1);
      vx = mx * stats.speed * slow;
      vz = mz * stats.speed * slow;
      hv.moveAngle = Math.atan2(mx, mz);
      // The legs turn the way the keys say — unless the hero has turned right round to shoot (a backpedal).
      if (hv.attack <= 0 && !(hv.aimT > 0 && hv.aimFull)) {
        const want = Math.atan2(mx, mz);
        this.heroPos.face = wrap(this.heroPos.face + wrap(want - this.heroPos.face) * Math.min(1, dt * 14));
      }
    }
    hv.moving = Math.hypot(vx, vz) > 0.1 && hv.roll <= 0 && !hv.dash;
    // After a quiet spell with no camera input, ease back behind the hero on the move
    // (not while aiming, guarding or dragging the view).
    this.camYaw = wrap(this.camAssist.step(dt, this.camYaw, wrap(this.heroPos.face + Math.PI), { moving: hv.moving, paused: (hv.aimT ?? 0) > 0 || this._dragT > 0 || this.buffs.guard > 0 }));
    // Holding an aim: the upper body stays on it (within its twist) as the legs turn.
    hv.aimT = Math.max(0, (hv.aimT ?? 0) - dt);
    if (hv.aimT > 0 && hv.aimFace != null) {
      const tw = wrap(hv.aimFace - this.heroPos.face);
      hv.twist = Math.max(-MAX_TWIST, Math.min(MAX_TWIST, tw));
    } else hv.aimFull = false;
    vx += hv.kx;
    vz += hv.kz;
    hv.kx *= Math.exp(-dt * 9);
    hv.kz *= Math.exp(-dt * 9);
    const [nx, nz] = R.resolveCollision(this.heroPos.x + vx * dt, this.heroPos.z + vz * dt, HERO_R, this._nearSolids(this.heroPos.x, this.heroPos.z), this.realmDef.radius);
    this.heroPos.x = nx;
    this.heroPos.z = nz;
    // Regeneration: slow out of combat, fast by the Hearthlight or a waystone; energy comes back quickly.
    const rest = this.realm === 'lanternwood' ? Math.hypot(nx, nz) < 6.5 : Math.hypot(nx - this.realmDef.waystone.x, nz - this.realmDef.waystone.z) < 6;
    const calm = hv.hurtT > 5;
    hero.mp = Math.min(stats.maxMp, hero.mp + dt * (stats.resource === 'energy' ? 14 : rest ? 12 : 2.2));
    if (rest) hero.hp = Math.min(stats.maxHp, hero.hp + dt * stats.maxHp * 0.1);
    else if (calm) hero.hp = Math.min(stats.maxHp, hero.hp + dt * stats.maxHp * 0.012);
    this._resting = rest && (hero.hp < stats.maxHp - 0.5 || hero.mp < stats.maxMp - 0.5);
  }

  /** Solid circles near a point (the realms are big; most of it is far away). */
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
      const k = this.reducedMotion ? 0.15 : 0.5;
      this.camera.position.x += (Math.random() - 0.5) * this.shake * k;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * k;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.camera.lookAt(this.camLook);
  }

  updateActors(dt, yaw) {
    const light = this._lightTmp ?? (this._lightTmp = new THREE.Color());
    const h = this.heroPos;
    const hv = this.hv ?? { moving: false, attack: 0, roll: 0, spin: 0 };
    const a = this.heroActor;
    const cam = this.camera.position;
    a.group.position.set(h.x, 0, h.z);
    a.squash = 0;
    const [dx, dz] = dirOf(h.face);
    a.mesh.position.x = hv.attack > 0 ? dx * 0.15 : 0;
    a.mesh.position.z = hv.attack > 0 ? dz * 0.15 : 0;
    a.facing = hv.roll > 0 && hv.rollFace != null ? hv.rollFace : h.face;
    // Walking one way, aiming another: the legs go where the keys say, the body twists to the aim.
    const legs = hv.moving && hv.moveAngle != null ? legMotion(a.facing, hv.moveAngle) : { back: false, moveYaw: 0 };
    a.act = {
      move: hv.moving ? 1 : 0,
      back: legs.back,
      moveYaw: legs.moveYaw,
      twist: hv.aimT > 0 ? hv.twist ?? 0 : 0,
      swing: hv.swing ? { pose: hv.swing.pose, t: Math.min(1, hv.swing.t) } : null,
      pose: hv.pose ? { id: hv.pose.id, t: Math.min(1, hv.pose.t) } : null,
      spin: hv.spin > 0 ? 1 - hv.spin / 0.4 : null,
      cast: hv.cast > 0 ? 1 - hv.cast / 0.32 : null,
      roll: hv.roll > 0 ? (hv.rollFace != null ? hv.roll / R.ABILITIES.roll.time : 1 - hv.roll / R.ABILITIES.roll.time) : null,
      guard: this.buffs?.guard > 0,
      hurt: hv.hurt ?? 0,
      dead: this.mode === 'dead'
    };
    // The head turns to the nearest foe close by (or whoever is talking).
    let near = null, nd = 8;
    for (const e of this.enemies) {
      if (!e.alive || e.state === 'burrowed') continue;
      const d = Math.hypot(e.x - h.x, e.z - h.z);
      if (d < nd) [near, nd] = [e, d];
    }
    const talking = this.npcs.find((n) => n.talking);
    a.lookAt = talking ? { x: talking.x, z: talking.z } : near ? { x: near.x, z: near.z } : null;
    a.group.visible = this.mode !== 'title' && this.mode !== 'loading';
    const blink = hv.inv > 0 && Math.floor(this.t * 20) % 2 === 0;
    a.mesh.visible = !blink || this.mode === 'dead';
    a.update(dt, yaw, this.world.lightAt(h.x, h.z, light));
    if (this.mode === 'dead') a.material.color.multiplyScalar(0.5);
    const swinging = Boolean(hv.swing && hv.swing.t > 0.12 && hv.swing.t < 0.85 && !['bolt', 'bolt3', 'shot', 'power'].includes(hv.swing.pose)) || hv.spin > 0 || Boolean(hv.dash) || (hv.pose && ['overhead', 'lunge'].includes(hv.pose.id) && hv.pose.t > 0.25 && hv.pose.t < 0.8);
    this.trail?.update(a.tip, a.mid, swinging && Boolean(a.swordTip), hv.swing?.color ?? (hv.spin > 0 ? new THREE.Color(1.2, 2.2, 2.8) : new THREE.Color(2.8, 1.4, 0.5)));
    this._updateReticle(dt);

    // People: they turn to the hero when near or talking, and look at them; fine detail close to the camera.
    for (const n of this.npcs) {
      const dHero = Math.hypot(h.x - n.x, h.z - n.z);
      const close = dHero < 4.5 && this.mode !== 'title';
      const want = close || n.talking ? Math.atan2(h.x - n.x, h.z - n.z) : n.face0 ?? (n.face0 = n.face);
      n.face = wrap(n.face + wrap(want - n.face) * Math.min(1, dt * 6));
      n.actor.squash = n.talking ? Math.abs(Math.sin(this.t * 9)) * 0.02 : 0;
      n.actor.facing = n.face;
      n.actor.lookAt = dHero < 7 && this.mode !== 'title' ? { x: h.x, z: h.z } : null;
      n.actor.act = { move: 0, talk: Boolean(n.talking) };
      const dc = Math.hypot(cam.x - n.x, cam.z - n.z);
      n.actor.detail = dc < 15 ? 1 : 2;
      if (dHero < 70) n.actor.update(dt, yaw, this.world.lightAt(n.x, n.z, light));
    }

    // Monsters.
    for (const e of this.enemies) {
      if (!e.alive) {
        if (e.mound) e.mound.visible = false;
        this._drawTele(e);
        continue;
      }
      this._drawTele(e);
      const act = e.actor;
      // Underground: a mound of earth moves instead.
      if (e.state === 'burrowed') {
        if (!e.mound) {
          e.mound = new THREE.Mesh(this.moundGeo, this.moundMat);
          e.mound.castShadow = true;
          this.scene.add(e.mound);
        }
        e.mound.visible = true;
        e.mound.position.set(e.x, 0, e.z);
        e.mound.scale.setScalar(0.8 + Math.sin(this.t * 14) * 0.08);
        act.group.visible = false;
        if (Math.random() < dt * 8) this.vfx.dust(e.x, e.z, { n: 1, color: DUST[this.realm]?.[0] ?? '#8a7a6a', size: 0.5, alpha: 0.4 });
        continue;
      }
      if (e.mound) e.mound.visible = false;
      if (!act.group.visible) continue;
      act.group.position.set(e.x, 0, e.z);
      const sp = Math.hypot(e.vx, e.vz);
      const moving = sp > 0.2;
      const winding = e.state === 'windup';
      const wk = winding && e.wind ? 1 - Math.max(0, e.timer ?? 0) / e.wind : 0;
      e.reel = Math.max(0, (e.reel ?? 0) - dt * 4);
      act.facing = e.face;
      const dc = Math.hypot(cam.x - e.x, cam.z - e.z);
      act.detail = dc < (e.def.boss ? 26 : 16) ? 1 : 2;
      act.lookAt = e.target ? { x: e.target.x, z: e.target.z } : null;
      if (e.def.rig) {
        // People-shaped: they walk, raise a shield or a staff as they wind up, strike with it.
        const strikePose = e.kind === 'rimeguard' ? 'smash' : 'bolt';
        act.act = {
          move: moving ? 1 : 0,
          guard: e.kind === 'rimeguard' && (e.state === 'chase' || e.state === 'idle') && !moving,
          pose: winding ? { id: e.kind === 'rimeguard' ? 'overhead' : 'raise', t: Math.min(0.5, wk * 0.5) } : null,
          swing: e.state === 'recover' && e.timer > e.st.cooldown - 0.35 ? { pose: strikePose, t: 1 - (e.timer - (e.st.cooldown - 0.35)) / 0.35 } : null,
          hurt: e.reel,
          dead: false
        };
        act.lift = e.lift ?? 0;
      } else {
        const floats = e.def.float != null;
        act.lift = (e.lift ?? 0) + (floats && e.state !== 'strike' ? Math.sin(this.t * 2.5 + e.hx) * 0.18 : 0);
        act.act = { move: moving ? Math.min(1, sp / Math.max(1, e.st.speed * 0.8)) : 0, wind: wk, strike: e.state === 'strike', stun: e.stunT > 0, hurt: e.reel, air: (e.lift ?? 0) - (e.def.float ?? 0) };
        if (e.kind === 'wisp' || e.kind === 'cinderling' || e.kind === 'shardling') act.glow = (e.kind === 'wisp' ? 0.3 : e.kind === 'cinderling' ? 0.04 : 0.12) + (winding ? wk * 0.8 : 0);
        if (e.def.boss) act.glow = 0.2 + (winding ? 0.35 * Math.abs(Math.sin(this.t * 12)) : 0);
        if (e.def.attack === 'bomb') act.squash = winding ? 0.2 * wk + Math.sin(this.t * 30) * 0.05 * wk : 0;
      }
      act.update(dt, yaw, this.world.lightAt(e.x, e.z, light));
      if (winding && Math.floor(this.t * 16) % 2 === 0 && act.flash <= 0) act.material.color.setRGB(1.5, 0.5, 0.4);
      if (e.stunT > 0 && act.flash <= 0) act.material.color.setRGB(0.8, 0.8, 1.3);
      // Hero monsters and bosses: an aura on the ground and motes rising, in their colour.
      if ((e.elite || e.def.boss) && dc < 40) {
        const c = e.def.boss ? e.def.light ?? '#ffd27a' : R.ELITE_AFFIXES[e.elite.affixes[0]]?.color ?? '#ffd27a';
        const r = (e.def.radius ?? 0.6) * (e.def.boss ? 2.2 : 2.4);
        if (!e.aura) {
          e.aura = auraMesh(c, r);
          act.group.add(e.aura);
        }
        e.aura.material.uniforms.uTime.value = this.t;
        e.auraAcc = (e.auraAcc ?? 0) + dt;
        const every = e.def.boss ? 0.04 : 0.09;
        while (e.auraAcc > every) {
          e.auraAcc -= every;
          this.vfx.motes(e.x, e.z, c, { r: r * 0.8, h: e.def.boss ? 3.5 : 2.2, size: e.def.boss ? 0.08 : 0.06 });
        }
      }
    }
    // The boss's own light.
    const b = this.boss;
    this.bossLight.intensity = b?.alive ? 22 + Math.sin(this.t * 5) * 4 : Math.max(0, this.bossLight.intensity - dt * 20);
    if (b?.alive) {
      this.bossLight.color.set(b.def.light ?? '#ffffff');
      this.bossLight.position.set(b.x, 3.6, b.z);
    }
  }

  /** Dust at a footfall (the realm's own ground colour). */
  _footDust(x, z, k = 1) {
    if (!this.vfx) return;
    const [c, alpha] = DUST[this.realm] ?? ['#8a7a6a', 0.3];
    this.vfx.dust(x, z, { color: c, n: Math.round(2 * k), size: 0.32 * k, alpha: alpha * Math.min(1.4, k), speed: 0.7 * k });
  }

  /* --------------------------------------------------------- the pointer */

  /** Where the pointer meets the ground (each frame), and the reticle there for ranged play. */
  _updateReticle(dt) {
    const m = this.mouse;
    this.aimPoint = null;
    if (m?.on && this.size) {
      const v = this._rv ?? (this._rv = new THREE.Vector3());
      v.set((m.x / this.size.w) * 2 - 1, -(m.y / this.size.h) * 2 + 1, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
      this.aimPoint = rayToGround(this.camera.position, v, 0);
    }
    if (!this.reticle) {
      const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4 });
      const g = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 4, 1).rotateX(-Math.PI / 2), mat);
      const inner = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.13, 4, 1).rotateX(-Math.PI / 2), mat);
      g.add(outer, inner);
      g.renderOrder = 6;
      this.reticle = { g, mat, outer };
    }
    const r = this.reticle;
    if (r.g.parent !== this.scene) this.scene.add(r.g);
    const ranged = this.mode === 'play' && this.hero && this._rangedHero();
    const show = ranged && this.aimPoint && usesPointer({ ranged: true, onCanvas: this.mouse?.on, lastMove: this.mouse?.t, now: this.t }) && !this.overlay && !this.dialogue.open;
    r.g.visible = Boolean(show) && !this.lmb?.dragging;
    if (!show) return;
    const foe = snapToFoe(this.aimPoint, this.enemies.filter((e) => e.alive && e.state !== 'burrowed'));
    const p = foe ?? this.aimPoint;
    r.g.position.set(p.x, 0.07, p.z);
    r.g.rotation.y += dt * 0.8;
    const k = foe ? 1.25 + Math.sin(this.t * 10) * 0.06 : 1;
    r.g.scale.setScalar(k * (foe ? Math.max(1, (foe.def.radius ?? 0.6) * 1.6) : 1));
    r.mat.color.set(CLASS_AIM[this.hero.cls] ?? '#ffffff').multiplyScalar(foe ? 1.4 : 0.9);
    r.mat.opacity = foe ? 0.85 : 0.5;
  }

  /** Does the hero fight from range (a staff or a bow, or a ranged class)? */
  _rangedHero() {
    const w = this.weaponType;
    return w === 'staff' || w === 'bow' || this.hero.cls === 'seer' || this.hero.cls === 'ranger';
  }

  updateEffects(dt, yaw) {
    this.vfx.update(dt);
    for (const p of Object.values(this.pickupFx)) p.update(dt);
    for (const d of this.drops) if (d.fx) d.fx.mesh.rotation.y = yaw;
    this.effects = this.effects.filter((e) => {
      if (e.arc) {
        e.t += dt;
        const k = e.t / e.life;
        const reveal = Math.min(1, k / 0.45);
        e.arc.geometry.setDrawRange(0, Math.ceil(reveal * e.seg) * 6);
        e.arc.material.opacity = k < 0.45 ? 1 : Math.max(0, 1 - (k - 0.45) / 0.55);
        if (e.core) {
          // The white-hot core rides the leading edge of the sweep, then fades fast.
          const front = Math.ceil(reveal * e.seg);
          const tail = k < 0.45 ? 12 : Math.max(0, Math.round(12 * (1 - (k - 0.45) / 0.3)));
          e.core.setDrawRange(Math.max(0, front - tail) * 6, Math.min(front, tail) * 6);
          e.coreMat.opacity = k < 0.45 ? 1 : Math.max(0, 1 - (k - 0.45) / 0.3);
        }
        if (e.full) e.arc.rotation.y += dt * 9;
        if (e.full && e.core) e.core.setDrawRange(0, e.seg * 6);
        if (k >= 1) {
          e.fx.dispose();
          return false;
        }
        return true;
      }
      if (e.fall) {
        e.t += dt;
        e.fall.position.y = 8 * (1 - e.t / e.life);
        if (e.t >= e.life) {
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
    const s = this.stats ?? R.statsOf(this.hero, this.buffs);
    hud.stats(this.hero, s, this.cd, { ...this.buffs, chill: this.chillT });
    const area = R.areaIn(this.realmDef, this.heroPos.x, this.heroPos.z);
    hud.area(R.REALMS[this.realm].name, area === 'wilds' ? R.REALMS[this.realm].sub.split(' · ')[0] : this.realmDef.areas[area].name);
    hud.resting(this._resting && !this.dialogue.open, this.realm === 'lanternwood' ? 'Resting by the Hearthlight' : 'Resting by the waystone');
    hud.beginWorld();
    const h = this.heroPos;
    for (const n of this.npcs) {
      const d = Math.hypot(h.x - n.x, h.z - n.z);
      if (d > 40) continue;
      const m = this.markerFor(n.id);
      const p = this._project({ x: n.x, y: n.actor.height + 0.55, z: n.z });
      if (!p) continue;
      hud.marker(`npc-${n.id}`, m === 'shop' ? (n.shop === 'smith' ? 'smith' : 'shop') : m ?? 'talk', p.x, p.y, n.name, d < 6);
    }
    if (this.gatherWanted()) {
      for (const herb of this.world.gather) {
        if (herb.taken || Math.hypot(h.x - herb.x, h.z - herb.z) > 30) continue;
        const p = this._project({ x: herb.x, y: 1.1, z: herb.z });
        if (p) hud.marker(`herb-${herb.i}`, 'herb', p.x, p.y);
      }
    }
    if (this.realm === 'lanternwood' && this.state.quests.braziers.state === 'active') {
      for (const b of this.world.braziers) {
        if (b.lit || Math.hypot(h.x - b.x, h.z - b.z) > 40) continue;
        const p = this._project({ x: b.x, y: 2.4, z: b.z });
        if (p) hud.marker(`brazier-${b.id}`, 'fire', p.x, p.y);
      }
    }
    const w = this.realmDef.waystone;
    const dw = Math.hypot(h.x - w.x, h.z - w.z);
    if (dw < 45) {
      const p = this._project({ x: w.x, y: 5.4, z: w.z });
      if (p) hud.marker('waystone', 'portal', p.x, p.y, 'Waystone', dw < 9);
    }
    for (const c of this.world.chests) {
      if (c.opened || Math.hypot(h.x - c.x, h.z - c.z) > 22) continue;
      const p = this._project({ x: c.x, y: 1.4, z: c.z });
      if (p) hud.marker(`chest-${c.id}`, 'chest', p.x, p.y);
    }
    // Health bars over hurt or angry foes; hero monsters always show their names.
    for (const e of this.enemies) {
      if (!e.alive || e.def.boss || e.state === 'burrowed') continue;
      const d = Math.hypot(h.x - e.x, h.z - e.z);
      if (d > (e.elite ? 30 : 24)) continue;
      if (!e.elite && e.hp >= e.maxHp && e.state !== 'chase' && e.state !== 'windup') continue;
      const p = this._project({ x: e.x, y: e.actor.height + (e.lift ?? 0) + 0.25, z: e.z });
      if (p) hud.bar(e.nid, p.x, p.y, e.hp / e.maxHp, e.elite ? `★ ${e.elite.name}${e.elite.affixes.some((a) => !e.elite.name.includes(R.ELITE_AFFIXES[a].name)) ? ` — ${e.elite.affixes.map((a) => R.ELITE_AFFIXES[a].name).join(', ')}` : ''}` : `Lv${e.def.level} ${e.def.name}`, { elite: Boolean(e.elite), shield: e.st?.shield ? e.shield / e.st.shield : 0 });
    }
    const b = this.boss;
    hud.boss(b?.alive && Math.hypot(h.x - b.x, h.z - b.z) < 40 ? b.hp / b.maxHp : null, b?.def.name ?? '');
    // Loot on the ground: the good things name themselves from afar.
    for (const d of this.drops) {
      if (d.kind !== 'item') continue;
      const dist = Math.hypot(h.x - d.x, h.z - d.z);
      const good = d.entry.base && R.RARITIES[d.entry.rarity].glow;
      if (dist > (good ? 24 : 7)) continue;
      const p = this._project({ x: d.x, y: 1.25, z: d.z });
      if (p) hud.label(`loot-${d.id}`, p.x, p.y, d.entry.base ? d.entry.name : `${R.CONSUMABLES[d.entry.kind].name}${d.entry.n > 1 ? ` ×${d.entry.n}` : ''}`, d.entry.base ? R.RARITIES[d.entry.rarity].color : '#e8dcc0', 'ld-wlabel--loot');
    }
    // The party: names and health over their heads.
    const party = [];
    for (const p of this.net.peers.values()) {
      const here = p.realm === this.realm;
      party.push({ name: p.name, cls: p.cls, level: p.level, hp: p.hp, maxHp: p.maxHp, realm: p.realm, here, host: p.id === this.net.session?.host });
      if (!here || !p.actor) continue;
      const q = this._project({ x: p.dx, y: p.actor.height + 0.5, z: p.dz });
      if (q) hud.bar(`peer-${p.id}`, q.x, q.y, p.hp / p.maxHp, `${p.name} · ${R.CLASSES[p.cls].name} ${p.level}`, { ally: true });
    }
    this._partyT = (this._partyT ?? 0) - dt;
    if (this._partyT <= 0) {
      this._partyT = 0.25;
      hud.party(party);
    }
    hud.endWorld();
    hud.updateNumbers(dt, (a) => this._project(a));
    hud.tracker(this.state.quests, this.realm);
    const it = this.dialogue.open || this.overlay ? null : this._interactable();
    hud.prompt(it?.label ?? '');
  }
}

// The fight, from both sides: the hero's (combat.js) and the monsters' (foes.js).
for (const m of [CombatMixin, FoeMixin]) Object.defineProperties(LanternwoodGame.prototype, Object.getOwnPropertyDescriptors(m));
void panel;
