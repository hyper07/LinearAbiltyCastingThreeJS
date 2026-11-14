import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { surface, worldBox } from '../../fps/assets.js';
import { loadSoldier, Soldier } from '../../fps/soldier.js';
import { gunModel } from '../../fps/guns.js';
import { dress } from '../../mmo/bodies.js';
import { SquadView } from '../view.js';
import { RANKS, BUILDINGS, GUARDIANS, COLORS, LOOKS } from './rules.js';
import { loadRobot, Robot } from './robot.js';
import { SIZE, RIDGES, ROCKS, STRUCTURES, GUARDS, BASE, BARRACKS, ARMORY, FORGE, PAD, GUNS, HEART, tierAt, foeDef } from './map.js';
import { FORGE_REACH } from './rules.js';
import { pickAt, boxedIn, drawOverlay } from './overlay.js';

/**
 * Grave Purge, drawn: the Gravefield from above — ridges of rock, the
 * dead's crypts, spires and shrines (the KayKit Halloween pieces), the
 * camp (Space Base pieces), soldiers (the animated soldier, in their
 * player's colour, bigger by rank) and the dead (KayKit skeletons). Only
 * what is near the camera is built. It reads snapshots; it decides nothing.
 */

const LIB = './library/kaykit/';
const HALLOWEEN = 'KayKit-Halloween-Bits-1.0/addons/kaykit_halloween_bits/Assets/gltf/';
const SPACE = 'KayKit-Space-Base-Bits-1.0/addons/kaykit_space_base_bits/Assets/gltf/';
const DUNGEON = 'KayKit-Dungeon-Remastered-1.0/addons/kaykit_dungeon_remastered/Assets/gltf/';
const CLIPS = {
  husk: { walk: 'Walking_D_Skeletons', attack: 'Unarmed_Melee_Attack_Punch_A' },
  ravager: { walk: 'Running_A', attack: '1H_Melee_Attack_Stab' },
  hexer: { walk: 'Walking_B', attack: 'Spellcast_Shoot' },
  brute: { walk: 'Walking_A', attack: '2H_Melee_Attack_Chop' },
  wight: { walk: 'Walking_A', attack: '1H_Melee_Attack_Slice_Diagonal' },
  bonecaller: { walk: 'Walking_B', attack: 'Spellcast_Shoot' }
};
const BOSS_CLIPS = { walk: 'Walking_A', attack: '2H_Melee_Attack_Chop', slam: '2H_Melee_Attack_Spin', summon: 'Spellcast_Summon' };
const MAGE_CLIPS = { walk: 'Walking_B', attack: 'Spellcast_Shoot', summon: 'Spellcast_Summon' };
const TINT = { husk: '#d9d4c4', ravager: '#c9b8a8', hexer: '#b9a6d9', brute: '#b8b0a0', wight: '#8a9aa8', bonecaller: '#9a70c0' };
/** The look of each building: a model, how wide, and a glow. */
const LOOK = {
  spire: { model: HALLOWEEN + 'post_skull.gltf', width: 1.6, height: 4.4, glow: '#b060ff' },
  barrow: { model: HALLOWEEN + 'grave_A.gltf', width: 3.6 },
  crypt: { model: HALLOWEEN + 'crypt.gltf', width: 5.6, glow: '#7a40ff' },
  ossuary: { model: HALLOWEEN + 'crypt.gltf', width: 6.6, glow: '#ff3040', dark: true },
  cache: { model: DUNGEON + 'trunk_large_C.gltf.glb', width: 1.8, glow: '#ffd060' },
  node: { model: HALLOWEEN + 'shrine_candles.gltf', width: 4.4, glow: '#40e0ff', orb: '#60f0ff' },
  shrine: { model: HALLOWEEN + 'shrine.gltf', width: 6.4, glow: '#ffb030', orb: '#ffcf60' },
  heart: { model: HALLOWEEN + 'crypt.gltf', width: 10, glow: '#ff2040', orb: '#ff3050', dark: true }
};
const DECOR = ['tree_dead_large.gltf', 'tree_dead_medium.gltf', 'gravestone.gltf', 'gravemarker_A.gltf', 'grave_B.gltf', 'bone_A.gltf', 'ribcage.gltf', 'fence_broken.gltf', 'post_lantern.gltf', 'tree_dead_small.gltf', 'skull.gltf', 'coffin.gltf'];
const BUILD_NEAR = 120;
const BODY_NEAR = 70;
const MAX_BODIES = 140;

export class PurgeView extends SquadView {
  constructor(host) {
    super(host);
    this.target.set(PAD.x, 0, PAD.z + 6);
    this.zoom = 34;
    this.scene.background = new THREE.Color('#1c1820');
    this.scene.fog = new THREE.Fog('#241c26', 110, 230);
    this.camera.far = 700;
    this.selected = new Set();
    this.popups = [];
  }

  /* ------------------------------------------------------------- the land */

  _field() {
    this.sites = new Map(); // building id → { group, built }
    this.sleepers = new Map(); // static guard id → model
    this.decorBuilt = new Set();
    // The ground: dirt, greyer and colder the further out.
    const seg = 96;
    const g = new THREE.PlaneGeometry(SIZE + 120, SIZE + 120, seg, seg).rotateX(-Math.PI / 2).translate(SIZE / 2, 0, SIZE / 2);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const col = [];
    const tint = { 1: new THREE.Color('#b5a593'), 2: new THREE.Color('#a29286'), 3: new THREE.Color('#8f7f86'), 4: new THREE.Color('#7a6576') };
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      uv.setXY(i, x / 7, z / 7);
      const r = Math.hypot(x, z);
      // Blend across each band's edge.
      const t = Math.min(4, Math.max(1, r < 100 ? 1 + Math.max(0, (r - 90) / 20) : r < 165 ? 2 + Math.max(0, (r - 155) / 20) : r < 225 ? 3 + Math.max(0, (r - 215) / 20) : 4));
      c.copy(tint[Math.floor(t)]).lerp(tint[Math.min(4, Math.floor(t) + 1)], t - Math.floor(t));
      if (x >= BASE.x0 && x <= BASE.x1 && z >= BASE.z0 && z <= BASE.z1) c.set('#c8bfb0');
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const dirt = surface('dirt', { color: '#ffffff' }).clone();
    dirt.vertexColors = true;
    const ground = new THREE.Mesh(g, dirt);
    ground.receiveShadow = true;
    this.scene.add(ground);
    // The camp: a plated yard, the barracks, armoury, Forge and healing pad.
    const flat = (w, d, tile) => {
      const p = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
      const u = p.attributes.uv;
      for (let i = 0; i < u.count; i++) u.setXY(i, (u.getX(i) * w) / tile, (u.getY(i) * d) / tile);
      return p;
    };
    const yard = new THREE.Mesh(flat(BASE.x1 - BASE.x0, BASE.z1 - BASE.z0, 2.5), surface('plates', { color: '#8d9198' }));
    yard.position.set((BASE.x0 + BASE.x1) / 2, 0.03, (BASE.z0 + BASE.z1) / 2);
    yard.receiveShadow = true;
    this.scene.add(yard);
    // A low wall on the camp's edges, open where the guns stand.
    for (const [x, z, w, d] of [[BASE.x1, 0, 1, 14], [BASE.x1, 26, 1, 12.5], [0, BASE.z1, 18, 1], [30, BASE.z1, 18.5, 1]]) {
      const m = new THREE.Mesh(worldBox(w, 1.4, d, 2), surface('wall', { color: '#a8a39a' }));
      m.position.set(x + w / 2, 0, z + d / 2);
      m.castShadow = true;
      this.scene.add(m);
    }
    this._space('basemodule_garage', BARRACKS.x, BARRACKS.z, 7);
    this._space('basemodule_E', ARMORY.x, ARMORY.z, 6);
    this._space('landingpad_large', PAD.x, PAD.z, 10);
    this._space('drill_structure', FORGE.x, FORGE.z, 4.6);
    this._space('cargo_A_stacked', 40, 30, 2.4);
    this._space('windturbine_tall', 4, 4, 3);
    this._space('solarpanel', 22, 4, 3);
    this._space('lights', 46, 2, 1.6);
    this._space('lights', 2, 36, 1.6);
    // The Forge's ring: where soldiers stand to be raised.
    this.forgeRing = new THREE.Mesh(new THREE.RingGeometry(FORGE_REACH - 0.4, FORGE_REACH, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#40c0ff', transparent: true, opacity: 0.55, depthWrite: false }));
    this.forgeRing.position.set(FORGE.x, 0.08, FORGE.z);
    this.scene.add(this.forgeRing);
    // Blue crystals round the back of the ring: the Forge's mark, seen from across the camp.
    const crystal = new THREE.MeshStandardMaterial({ color: '#58c8ff', emissive: '#1a70d0', emissiveIntensity: 1.2, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 });
    for (let k = 0; k < 11; k++) {
      const a = Math.PI * 0.55 + (k / 10) * Math.PI * 0.95;
      for (let n = 0; n < 3; n++) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), crystal);
        const h = 1.6 + ((k * 7 + n * 3) % 5) * 0.35;
        c.scale.set(0.7, h, 0.7);
        c.position.set(FORGE.x + Math.cos(a) * (FORGE_REACH + 0.4) + (n - 1) * 0.5, h * 0.4, FORGE.z + Math.sin(a) * (FORGE_REACH + 0.4) + ((n * 5) % 3 - 1) * 0.3);
        c.rotation.set((n - 1) * 0.2, k, (k % 3 - 1) * 0.2);
        c.castShadow = true;
        this.scene.add(c);
      }
    }
    const forgeLight = new THREE.PointLight('#40c0ff', 30, 16, 1.6);
    forgeLight.position.set(FORGE.x, 4, FORGE.z);
    this.scene.add(forgeLight);
    this.padRing = new THREE.Mesh(new THREE.RingGeometry(4.6, 5, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3ddc84', transparent: true, opacity: 0.6, depthWrite: false }));
    this.padRing.position.set(PAD.x, 0.7, PAD.z);
    this.scene.add(this.padRing);
    // The ridges and boulders: one rocky mesh.
    this._rocks();
    // Stand-ins the parent's frame expects.
    this.rifts = [];
    this.core = new THREE.Mesh();
    this.coreLight = new THREE.PointLight();
  }

  _space(name, x, z, width, turn = 0) {
    this._place3(LIB + SPACE + name + '.gltf', x, z, width, turn);
  }

  _gltf(url) {
    if (!this.cache.has(url)) this.cache.set(url, this.loader.loadAsync(url).catch(() => null));
    return this.cache.get(url);
  }

  /** A model at (x, z), scaled to `width` metres across (or `height` tall). */
  _place3(url, x, z, width, turn = 0, { height = 0, parent = this.scene, dark = false } = {}) {
    return this._gltf(url).then((g) => {
      if (!g) return null;
      const m = g.scene.clone(true);
      const box = new THREE.Box3().setFromObject(m);
      const k = height ? height / Math.max(0.1, box.max.y - box.min.y) : width / Math.max(0.1, Math.max(box.max.x - box.min.x, box.max.z - box.min.z));
      m.scale.setScalar(k);
      m.position.set(x, -box.min.y * k, z);
      m.rotation.y = turn;
      m.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        if (dark && o.material) {
          o.material = o.material.clone();
          o.material.color?.multiplyScalar(0.45);
        }
      });
      parent.add(m);
      return m;
    });
  }

  _rocks() {
    const parts = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const lump = (x, z, r, h) => {
      const geo = new THREE.IcosahedronGeometry(1, 1);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const k = 0.78 + rnd() * 0.4;
        p.setXYZ(i, p.getX(i) * r * k, Math.max(-0.2, p.getY(i)) * h * k, p.getZ(i) * r * k);
      }
      geo.computeVertexNormals();
      geo.rotateY(rnd() * 6);
      geo.translate(x, 0, z);
      parts.push(geo.toNonIndexed());
    };
    for (const { pts, w } of RIDGES) {
      for (const [x, z] of pts) lump(x + (rnd() - 0.5) * 1.5, z + (rnd() - 0.5) * 1.5, w / 2 + rnd() * 1.2, 3 + rnd() * 4);
    }
    for (const [x, z, r] of ROCKS) lump(x, z, r, r * (0.9 + rnd() * 0.6));
    const geo = mergeGeometries(parts);
    const mat = new THREE.MeshStandardMaterial({ color: '#6d625c', roughness: 0.95, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    // Scattered dead trees, graves and bones (built when near).
    this.decor = [];
    for (let i = 0; i < 260; i++) {
      const x = 52 + rnd() * (SIZE - 56);
      const z = 4 + rnd() * (SIZE - 8);
      if (x < BASE.x1 + 8 && z < BASE.z1 + 8) continue;
      this.decor.push([x, z, DECOR[Math.floor(rnd() * DECOR.length)], rnd() * 6, 1 + rnd() * 1.6]);
    }
  }

  /* -------------------------------------------------------------- frames */

  /** What just happened. */
  absorb(events, state) {
    const at = new Map(state.ents.map((e) => [e.i, e]));
    const where = (id) => at.get(id) ?? this._siteAt(id);
    for (const e of events) {
      if (e.t === 'shot') {
        const a = at.get(e.id);
        const b = where(e.to);
        if (a && b) this._streak(a.x, a.k === 'gun' ? 2 : 1.25 * (RANKS[a.rank]?.scale ?? 1), a.z, b.x, 1.2, b.z, e.big ? '#9ff0ff' : '#ffe9b0', 0.07);
      } else if (e.t === 'bolt') {
        const a = at.get(e.id) ?? this._siteAt(e.id);
        const b = at.get(e.to);
        if (a && b) this._streak(a.x, e.tower ? 4 : 1.6, a.z, b.x, 1.1, b.z, e.tower ? '#d070ff' : '#c070ff', 0.25, 3);
      } else if (e.t === 'blast') this._burst(e.x, e.z, e.r, '#80e0ff');
      else if (e.t === 'slam') this._ring(e.x, e.z, e.r, '#ff7040', 0.6);
      else if (e.t === 'summon') this._ring(e.x, e.z, 4, '#b060ff', 0.8, true);
      else if (e.t === 'forge') {
        this._ring(e.x, e.z, 4, '#40c0ff', 1, true);
        this._burst(e.x, e.z, 2, '#80e0ff');
      } else if (e.t === 'fall') {
        this._burst(e.x, e.z, (BUILDINGS[e.type]?.r ?? 2) * 1.6, '#c0a080');
        const site = this.sites.get(e.id);
        if (site) site.falling = 0;
      } else if (e.t === 'kill') {
        const m = this.models.get(e.id) ?? this.sleepers.get(e.id);
        if (m?.made) {
          this._play(m, 'Death_C_Skeletons', { once: true });
          this.dying.push({ m, t: 0 });
          this.models.delete(e.id);
          this.sleepers.delete(e.id);
        } else if (m?.soldier) {
          this.dying.push({ m, t: 0, soldier: true });
          this.models.delete(e.id);
        }
      } else if (e.t === 'ore' && e.o === this.mySlot) this.popups.push({ x: e.x, z: e.z, text: `+${e.n}`, t: 0 });
    }
  }

  _siteAt(id) {
    const s = STRUCTURES.find((b) => b.id === id);
    return s ? { x: s.x, z: s.z } : null;
  }

  _troop(e) {
    const def = RANKS[e.rank];
    const look = LOOKS[e.rank];
    const color = COLORS[e.o] ?? '#888';
    const m = { group: new THREE.Group(), kind: 'troop', soldier: null, fall: 0 };
    const stand = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1, 4, 8).translate(0, 0.9, 0), new THREE.MeshStandardMaterial({ color: look.paint }));
    m.group.add(stand);
    m.ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.9, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
    m.ring.position.y = 0.06;
    m.group.add(m.ring);
    m.group.scale.setScalar(def.scale);
    if (look.glow) {
      const aura = new THREE.PointLight(look.glow, 8, 6, 2);
      aura.position.y = 2;
      m.group.add(aura);
    }
    const ready = (body) => {
      if (!body || m.gone) return;
      m.soldier = body;
      m.group.remove(stand);
      m.group.add(body.group);
    };
    if (look.ship) {
      // A flying thing: the lander, hovering and bobbing, an engine glow behind.
      const big = look.ship === 'big';
      const holder = new THREE.Group();
      const hover = big ? 4.2 : 2.6;
      this._place3(LIB + SPACE + (big ? 'lander_B.gltf' : 'lander_A.gltf'), 0, 0, big ? 6.5 : 1.5, Math.PI, { parent: holder }).then((model) => {
        if (!model) return;
        model.position.y += hover;
        const engine = new THREE.PointLight(look.glow, big ? 30 : 6, big ? 10 : 4, 2);
        engine.position.set(0, hover, big ? 3 : 0.8);
        holder.add(engine);
        let t = Math.random() * 6;
        ready({ group: holder, update: (dt) => (holder.position.y = Math.sin((t += dt) * 2) * 0.15) });
      });
    } else if (look.robot) loadRobot().then((gltf) => gltf && ready(new Robot(gltf, { paint: look.paint, team: color })));
    else {
      loadSoldier().then((gltf) => {
        if (!gltf) return;
        const s = new Soldier(gltf, color, look.paint, gunModel(def.weapon));
        if (look.glow) s.model.traverse((o) => o.isMesh && (o.material.emissive = new THREE.Color(look.glow), (o.material.emissiveIntensity = 0.15)));
        ready(s);
      });
    }
    this.scene.add(m.group);
    return m;
  }

  _skeleton(kind, tier = 1) {
    const def = foeDef(kind);
    const guardian = GUARDIANS[kind];
    const tint = guardian?.tint ?? TINT[kind] ?? '#ccc';
    const m = { group: new THREE.Group(), kind: 'foe', foe: kind, made: null, clips: guardian ? (def.ranged ? MAGE_CLIPS : BOSS_CLIPS) : CLIPS[kind] };
    const size = def.size * (guardian ? 1 : 1 + (tier - 1) * 0.06);
    const stand = new THREE.Mesh(new THREE.CapsuleGeometry(0.3 * (size / 1.7), size * 0.5, 4, 8).translate(0, size / 2, 0), new THREE.MeshStandardMaterial({ color: tint }));
    m.group.add(stand);
    dress({ body: def.body, height: size, tint, hat: true, cape: true }).then((made) => {
      if (!made || m.gone) return;
      m.made = made;
      m.group.remove(stand);
      made.model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = Boolean(guardian) || size > 2.3;
        if (guardian || tier >= 3) {
          o.material = o.material.clone();
          o.material.emissive = new THREE.Color(guardian ? guardian.tint : tier >= 4 ? '#601020' : '#302060');
          o.material.emissiveIntensity = guardian ? 0.35 : 0.25;
        }
      });
      m.group.add(made.model);
      this._play(m, 'Idle');
    });
    this.scene.add(m.group);
    return m;
  }

  _gunModel() {
    const s = this._sentry({});
    s.group.scale.setScalar(1.4);
    return s;
  }

  /** Buildings near the camera: built once, sinking away when they fall. */
  _sites(state, dt) {
    const down = new Set(state.down);
    const hurt = new Map(state.hurt.map(([i, hp, max]) => [i, { hp, max }]));
    this.siteHp = hurt;
    for (const s of STRUCTURES) {
      let site = this.sites.get(s.id);
      const near = Math.abs(s.x - this.target.x) < BUILD_NEAR && Math.abs(s.z - this.target.z) < BUILD_NEAR;
      if (!site && near && !down.has(s.id)) {
        site = { group: new THREE.Group(), falling: null };
        const look = LOOK[s.type];
        site.group.position.set(s.x, 0, s.z);
        this.scene.add(site.group);
        this._place3(LIB + look.model, 0, 0, look.width, (s.id * 1.7) % 6.28, { height: look.height ?? 0, parent: site.group, dark: look.dark });
        if (look.glow) {
          const light = new THREE.PointLight(look.glow, s.type === 'heart' ? 160 : 18, s.type === 'heart' ? 40 : 12, 1.8);
          light.position.y = s.type === 'heart' ? 12 : (look.height ?? 3) + 0.5;
          site.group.add(light);
          site.light = light;
        }
        if (look.orb) {
          const orb = new THREE.Mesh(new THREE.OctahedronGeometry(s.type === 'heart' ? 2.4 : 0.9, 0), new THREE.MeshStandardMaterial({ color: look.orb, emissive: look.orb, emissiveIntensity: 2.4, roughness: 0.3 }));
          orb.position.y = s.type === 'heart' ? 12 : s.type === 'shrine' ? 5.2 : 3.6;
          if (s.type === 'heart') orb.scale.set(1, 1.6, 1);
          site.group.add(orb);
          site.orb = orb;
        }
        if (s.type === 'spire') {
          const tip = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), new THREE.MeshBasicMaterial({ color: '#d090ff' }));
          tip.position.y = 4.6;
          site.group.add(tip);
        }
        if (s.type === 'heart') {
          site.seal = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#9040ff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
          site.group.add(site.seal);
        }
        this.sites.set(s.id, site);
      }
      if (!site) continue;
      if (down.has(s.id) && site.falling == null) site.falling = 0;
      if (site.falling != null) {
        site.falling += dt;
        site.group.position.y = -site.falling * 2.2;
        site.group.rotation.z = site.falling * 0.15;
        if (site.falling > 3) {
          this.scene.remove(site.group);
          this.sites.set(s.id, { gone: true, group: site.group, falling: 99 });
        }
        continue;
      }
      if (site.orb) {
        site.orb.rotation.y += dt * 1.2;
        site.orb.position.y += Math.sin(this.time * 2 + s.id) * 0.004;
      }
      if (site.seal) site.seal.visible = state.keysLeft > 0;
      site.group.visible = near || s.type === 'heart';
    }
  }

  /** The dead asleep in their camps (near the camera), and the decor. */
  _sleepers(state, awake) {
    const down = new Set(state.down);
    const want = [];
    for (const g of GUARDS) {
      if (down.has(g.id) || awake.has(g.id)) continue;
      const d = Math.abs(g.x - this.target.x) + Math.abs(g.z - this.target.z);
      if (d < BODY_NEAR * 1.4) want.push([d, g]);
    }
    want.sort((a, b) => a[0] - b[0]);
    const keep = new Set(want.slice(0, Math.max(0, MAX_BODIES - this.models.size)).map(([, g]) => g.id));
    for (const [id, m] of this.sleepers) {
      if (keep.has(id)) continue;
      m.gone = true;
      this.scene.remove(m.group);
      this.sleepers.delete(id);
    }
    for (const [, g] of want) {
      if (!keep.has(g.id) || this.sleepers.has(g.id)) continue;
      const m = this._skeleton(g.kind, g.tier);
      m.group.position.set(g.x, 0, g.z);
      m.group.rotation.y = (g.id * 2.3) % 6.28;
      this.sleepers.set(g.id, m);
    }
    for (const m of this.sleepers.values()) m.made?.mixer.update(1 / 60);
    for (const d of this.decor) {
      if (this.decorBuilt.has(d) || Math.abs(d[0] - this.target.x) > BUILD_NEAR || Math.abs(d[1] - this.target.z) > BUILD_NEAR) continue;
      this.decorBuilt.add(d);
      this._place3(LIB + HALLOWEEN + d[2], d[0], d[1], d[2].startsWith('tree') ? 2.2 * d[4] : 1.1 * d[4], d[3]);
    }
  }

  render(state, dt, { follow = null } = {}) {
    this.time += dt;
    if (follow) this.target.lerp(new THREE.Vector3(follow.x, 0, follow.z + 4), Math.min(1, dt * 5));
    const seen = new Set();
    for (const e of state.ents) {
      seen.add(e.i);
      let m = this.models.get(e.i);
      if (m && e.k === 'troop' && m.rank !== e.rank) {
        this.scene.remove(m.group);
        m.gone = true;
        m = null;
      }
      if (!m) {
        // A sleeper waking: the same body carries on.
        m = this.sleepers.get(e.i);
        if (m) this.sleepers.delete(e.i);
        else if (e.k === 'troop') m = this._troop(e);
        else if (e.k === 'foe') m = this._skeleton(e.kind, e.tier);
        else m = this._gunModel();
        m.rank = e.rank;
        this.models.set(e.i, m);
      }
      m.group.position.set(e.x, 0, e.z);
      if (e.k === 'troop') {
        m.group.rotation.y = e.a + Math.PI;
        m.ring.material.color.set(this.selected.has(e.i) ? '#ffffff' : COLORS[e.o]);
        m.ring.material.opacity = this.selected.has(e.i) ? 1 : 0.6;
        m.soldier?.update(dt, { moving: e.act === 'run', slow: false, pitch: 0, alive: true });
      } else if (e.k === 'foe') {
        m.group.rotation.y = e.a;
        if (m.made) {
          const clips = m.clips;
          if (e.act === 'run') this._play(m, clips.walk, { speed: foeDef(e.kind).speed / 4 });
          else if ((e.act === 'attack' || e.act === 'slam' || e.act === 'summon') && e.aa !== m.aa) {
            m.clip = null;
            this._play(m, clips[e.act] ?? clips.attack, { once: true, speed: 1.3 });
          } else if (e.act === 'idle' && (!m.current || !m.current.isRunning() || m.clip === clips.walk)) this._play(m, 'Idle');
          m.aa = e.aa;
          m.made.mixer.update(dt);
        }
      } else if (m.head) {
        m.head.rotation.y = e.a;
      }
    }
    for (const [id, m] of this.models) {
      if (seen.has(id)) continue;
      m.gone = true;
      this.scene.remove(m.group);
      this.models.delete(id);
    }
    this._sleepers(state, seen);
    this._sites(state, dt);
    this.dying = this.dying.filter((d) => {
      d.t += dt;
      d.m.made?.mixer.update(dt);
      if (d.soldier) {
        d.m.group.rotation.x = -Math.min(1.45, d.t * 3);
        d.m.group.position.y = -Math.max(0, d.t - 1) * 0.8;
      } else if (d.t > 1.6) d.m.group.position.y = -(d.t - 1.6) * 1.2;
      if (d.t < 3) return true;
      d.m.gone = true;
      this.scene.remove(d.m.group);
      return false;
    });
    this.forgeRing.rotation.y = this.time * 0.4;
    this.padRing.rotation.y = this.time * 0.5;
    this.fx = this.fx.filter((f) => {
      f.t += dt;
      const k = f.t / f.life;
      if (f.fade && f.o.material) f.o.material.opacity = Math.max(0, 0.9 * (1 - k));
      if (f.grow) f.o.scale.setScalar(0.3 + k * f.grow);
      if (f.ring) f.o.scale.setScalar(0.2 + k * f.ring);
      if (f.rise) f.o.position.y = 0.15 + k * 2;
      if (k < 1) return true;
      this.scene.remove(f.o);
      f.o.geometry?.dispose();
      return false;
    });
    this.popups = this.popups.filter((p) => (p.t += dt) < 1.4);
    this._place();
    this.renderer.render(this.scene, this.camera);
  }

  pan(dx, dz) {
    this.target.x = Math.max(0, Math.min(SIZE, this.target.x + dx));
    this.target.z = Math.max(0, Math.min(SIZE, this.target.z + dz));
  }

  zoomBy(f) {
    this.zoom = Math.max(16, Math.min(90, this.zoom * f));
  }

  /** What is under a screen point: one of mine (`troop`), or something of the dead's to attack. */
  pick(state, px, py, kind = 'foe', mySlot = -1) {
    return pickAt(this, state, px, py, kind, mySlot);
  }

  /** My soldiers inside a screen rectangle. */
  boxed(state, x0, y0, x1, y1, mySlot) {
    return boxedIn(this, state, x0, y0, x1, y1, mySlot);
  }

  /** Health bars, names, the ore you just earned. */
  overlay(ctx, state) {
    drawOverlay(this, ctx, state);
  }

  dispose() {
    for (const m of this.sleepers.values()) m.gone = true;
    super.dispose();
  }
}

export { tierAt, HEART };
