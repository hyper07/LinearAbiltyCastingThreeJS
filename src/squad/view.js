import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { surface, worldBox, sky } from '../fps/assets.js';
import { loadSoldier, Soldier } from '../fps/soldier.js';
import { gunModel } from '../fps/guns.js';
import { dress } from '../mmo/bodies.js';
import { CLASSES, FOES } from './rules.js';
import { SIZE, WALLS, ROCKS, DECOR, RIFTS, REACTOR_AT, PAD } from './map.js';

/**
 * Bastion Squad, drawn: Kestrel Outpost from above (the KayKit Space Base
 * pieces, ambientCG ground), the soldiers (the animated soldier, tinted by
 * class, weapon in hand), the dead (the KayKit skeletons: rising from the
 * ground, walking, swinging, falling), sentries, healing fields, mines, and
 * the shots and blasts between them. It reads snapshots; it decides nothing.
 */

const LIB = './library/';
const BASE = 'kaykit/KayKit-Space-Base-Bits-1.0/addons/kaykit_space_base_bits/Assets/gltf/';
const CLIPS = {
  husk: { walk: 'Walking_D_Skeletons', attack: 'Unarmed_Melee_Attack_Punch_A' },
  ravager: { walk: 'Running_A', attack: '1H_Melee_Attack_Stab' },
  brute: { walk: 'Walking_A', attack: '2H_Melee_Attack_Chop' },
  hexer: { walk: 'Walking_B', attack: 'Spellcast_Shoot' },
  colossus: { walk: 'Walking_A', attack: '2H_Melee_Attack_Chop', slam: '2H_Melee_Attack_Spin' },
  lich: { walk: 'Walking_B', attack: 'Spellcast_Shoot', summon: 'Spellcast_Summon' },
  graveking: { walk: 'Walking_A', attack: '2H_Melee_Attack_Slice', slam: '2H_Melee_Attack_Spinning', summon: 'Spellcast_Summon' }
};
const TINT = { husk: '#d9d4c4', ravager: '#c9b8a8', brute: '#b8b0a0', hexer: '#b9a6d9', colossus: '#e0c9a0', lich: '#9f86d9', graveking: '#f0d080' };

export class SquadView {
  constructor(host) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'bs__canvas';
    host.prepend(this.canvas);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1420');
    this.scene.fog = new THREE.Fog('#2a1f2c', 90, 200);
    this.camera = new THREE.PerspectiveCamera(42, 1, 1, 600);
    this.target = new THREE.Vector3(70, 0, 76);
    this.zoom = 30;
    this.time = 0;
    this.models = new Map(); // entity id → { group, kind, … }
    this.dying = [];
    this.fx = [];
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this._lights();
    this._field();
    sky(this.renderer, this.scene).then(() => {
      this.scene.background = new THREE.Color('#1a1420');
      this.scene.environmentIntensity = 0.5;
    });
  }

  _lights() {
    // A dim red sun low over the wastes, and cold light from the sky.
    this.scene.add(new THREE.HemisphereLight('#b9c8ff', '#4a3428', 1.3));
    const sun = new THREE.DirectionalLight('#ffd2a8', 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 300 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.3;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  _model(name) {
    if (!this.cache.has(name)) this.cache.set(name, this.loader.loadAsync(`${LIB}${BASE}${name}.gltf`).catch(() => null));
    return this.cache.get(name);
  }

  /** Place a Space Base piece, scaled so its footprint is `width` metres. */
  _piece(name, x, z, width, turn = 0, y = 0) {
    this._model(name).then((g) => {
      if (!g) return;
      const m = g.scene.clone(true);
      const box = new THREE.Box3().setFromObject(m);
      const k = width / Math.max(0.1, Math.max(box.max.x - box.min.x, box.max.z - box.min.z));
      m.scale.setScalar(k);
      m.position.set(x, y - box.min.y * k, z);
      m.rotation.y = turn;
      m.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this.scene.add(m);
    });
  }

  _field() {
    const flat = (w, d, tile) => {
      const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
      return g;
    };
    const ground = new THREE.Mesh(flat(SIZE + 160, SIZE + 160, 7), surface('dirt', { color: '#b89a86' }));
    ground.position.set(SIZE / 2, 0, SIZE / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);
    // The compound: plated floor, concrete walls with a steel cap.
    const floor = new THREE.Mesh(flat(40, 40, 2), surface('plates', { color: '#8d9198' }));
    floor.position.set(70, 0.02, 70);
    floor.receiveShadow = true;
    this.scene.add(floor);
    for (const [x, z, w, d] of WALLS) {
      const m = new THREE.Mesh(worldBox(w, 2.6, d, 2), surface('wall', { color: '#a8a39a' }));
      m.position.set(x + w / 2, 0, z + d / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      const cap = new THREE.Mesh(worldBox(w + 0.2, 0.25, d + 0.2, 1), surface('metal', { color: '#6a7078' }));
      cap.position.set(x + w / 2, 2.6, z + d / 2);
      this.scene.add(cap);
    }
    // The reactor: the drill rig over a glowing core.
    this._piece('drill_structure', REACTOR_AT.x, REACTOR_AT.z, 5.2);
    this.core = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.6, 24), new THREE.MeshStandardMaterial({ color: '#60e0ff', emissive: '#28b8ff', emissiveIntensity: 2.2, transparent: true, opacity: 0.85 }));
    this.core.position.set(REACTOR_AT.x, 1.8, REACTOR_AT.z);
    this.scene.add(this.core);
    this.coreLight = new THREE.PointLight('#5cd8ff', 40, 30, 1.6);
    this.coreLight.position.set(REACTOR_AT.x, 4, REACTOR_AT.z);
    this.scene.add(this.coreLight);
    // The healing pad.
    this._piece('landingpad_small', PAD.x, PAD.z, 6.5);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.6, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3ddc84', transparent: true, opacity: 0.7 }));
    ring.position.set(PAD.x, 0.6, PAD.z);
    this.padRing = ring;
    this.scene.add(ring);
    // The outpost's buildings, and its lights and turbines on the walls' corners.
    for (const [x, z, r, name] of DECOR) this._piece(name, x, z, r * 2, Math.round(x + z) % 4 * (Math.PI / 2));
    for (const [x, z] of [[49, 49], [91, 49], [49, 91], [91, 91]]) this._piece('lights', x, z, 1.6);
    this._piece('windturbine_tall', 100, 46, 3);
    this._piece('solarpanel', 40, 94, 3);
    this._piece('lander_A', 22, 22, 6);
    // The wastes: rock outcrops where the map says.
    ROCKS.forEach(([x, z, r], k) => this._piece(k % 2 ? 'rocks_B' : 'terrain_low_curved', x, z, r * 2.2, k));
    // The rifts: a glowing tear in the ground.
    this.rifts = RIFTS.map((r) => {
      const g = new THREE.Group();
      const glow = new THREE.Mesh(new THREE.CircleGeometry(3.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#a040ff', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.position.y = 0.05;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.18, 8, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#d79bff' }));
      ring.position.y = 0.1;
      const light = new THREE.PointLight('#b060ff', 25, 18, 1.8);
      light.position.y = 2;
      g.add(glow, ring, light);
      g.position.set(r.x, 0, r.z);
      this.scene.add(g);
      return { g, glow, light, from: r.from };
    });
  }

  /* -------------------------------------------------------------- bodies */

  _hero(e) {
    const def = CLASSES[e.cls];
    const m = { group: new THREE.Group(), kind: 'hero', soldier: null, fall: 0 };
    const stand = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1, 4, 8).translate(0, 0.9, 0), new THREE.MeshStandardMaterial({ color: def.color }));
    m.group.add(stand);
    m.ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.85 }));
    m.ring.position.y = 0.05;
    m.group.add(m.ring);
    loadSoldier().then((gltf) => {
      if (!gltf || m.gone) return;
      m.soldier = new Soldier(gltf, def.color, def.color, gunModel(def.weapon));
      m.group.remove(stand);
      m.group.add(m.soldier.group);
    });
    this.scene.add(m.group);
    return m;
  }

  _foe(e) {
    const def = FOES[e.kind];
    const m = { group: new THREE.Group(), kind: 'foe', foe: e.kind, made: null };
    const stand = new THREE.Mesh(new THREE.CapsuleGeometry(0.3 * (def.size / 1.7), def.size * 0.5, 4, 8).translate(0, def.size / 2, 0), new THREE.MeshStandardMaterial({ color: TINT[e.kind] }));
    m.group.add(stand);
    dress({ body: def.body, height: def.size, tint: TINT[e.kind], hat: true, cape: true }).then((made) => {
      if (!made || m.gone) return;
      m.made = made;
      m.group.remove(stand);
      made.model.traverse((o) => {
        if (o.isMesh) o.castShadow = def.boss || e.kind === 'brute';
      });
      m.group.add(made.model);
      if (def.boss) {
        // A boss glows.
        made.model.traverse((o) => {
          if (o.isMesh && o.material) {
            o.material.emissive = new THREE.Color(e.kind === 'lich' ? '#6020a0' : '#a04010');
            o.material.emissiveIntensity = 0.4;
          }
        });
      }
    });
    this.scene.add(m.group);
    return m;
  }

  _sentry(e) {
    const g = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: '#5a626e', metalness: 0.7, roughness: 0.4 });
    const yellow = new THREE.MeshStandardMaterial({ color: '#f5c518', roughness: 0.5 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.6, 12), metal);
    base.position.y = 0.3;
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.8, 6), metal);
    legs.position.y = 0.9;
    const head = new THREE.Group();
    head.position.y = 1.4;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.8), yellow);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8).rotateX(Math.PI / 2), metal);
    barrel.position.set(0.15, 0, -0.75);
    const barrel2 = barrel.clone();
    barrel2.position.x = -0.15;
    head.add(body, barrel, barrel2);
    g.add(base, legs, head);
    g.traverse((o) => (o.castShadow = Boolean(o.isMesh)));
    this.scene.add(g);
    return { group: g, kind: 'sentry', head };
  }

  _play(m, name, { once = false, speed = 1 } = {}) {
    const a = m.made?.actions?.[name];
    if (!a || m.clip === name) return;
    a.reset();
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = once;
    a.timeScale = speed;
    a.play();
    if (m.current && m.current !== a) m.current.crossFadeTo(a, 0.15, false);
    m.current = a;
    m.clip = name;
  }

  /* -------------------------------------------------------------- frames */

  /** What just happened: streaks, bursts, sparkles. */
  absorb(events, state) {
    const at = new Map(state.ents.map((e) => [e.i, e]));
    for (const e of events) {
      if (e.t === 'shot') {
        const a = at.get(e.id);
        const b = at.get(e.to);
        if (a && b) this._streak(a.x, e.sentry ? 1.5 : 1.25, a.z, b.x, 1 + (FOES[b.kind]?.size ?? 1.7) * 0.3, b.z, e.sentry ? '#ffe680' : '#ffe9b0', 0.06);
      } else if (e.t === 'bolt') {
        const a = at.get(e.id);
        const b = e.to === 'reactor' ? { x: REACTOR_AT.x, z: REACTOR_AT.z } : at.get(e.to);
        if (a && b) this._streak(a.x, 1.6, a.z, b.x, 1.1, b.z, '#c070ff', 0.25, 3);
      } else if (e.t === 'blast') this._burst(e.x, e.z, e.r, e.kind === 'mine' ? '#ff4030' : '#ffaa40');
      else if (e.t === 'slam') this._ring(e.x, e.z, e.r, '#ff7040', 0.6);
      else if (e.t === 'heal' || e.t === 'lift' || e.t === 'respawn') {
        const h = at.get(e.id);
        if (h) this._ring(h.x, h.z, 1.4, '#3ddc84', 0.7, true);
      } else if (e.t === 'tend') {
        const a = at.get(e.id);
        const b = at.get(e.to);
        if (a && b) this._streak(a.x, 1.3, a.z, b.x, 1.3, b.z, '#3ddc84', 0.18, 2);
      } else if (e.t === 'pulse') {
        const h = at.get(e.id);
        if (h) this._ring(h.x, h.z, e.r, '#7dffb0', 0.8);
      } else if (e.t === 'taunt') {
        const h = at.get(e.id);
        if (h) this._ring(h.x, h.z, e.r, '#ff8a2a', 0.6);
      } else if (e.t === 'repair') {
        const h = at.get(e.id);
        if (h) this._ring(h.x, h.z, e.r, '#f5c518', 0.7);
      } else if (e.t === 'level') {
        const h = at.get(e.id);
        if (h) this._ring(h.x, h.z, 2, '#ffd400', 1, true);
      } else if (e.t === 'kill') {
        const m = this.models.get(e.id);
        if (m && m.made) {
          this._play(m, 'Death_C_Skeletons', { once: true });
          this.dying.push({ m, t: 0 });
          this.models.delete(e.id);
        }
      }
    }
  }

  _streak(ax, ay, az, bx, by, bz, color, life, width = 1) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz)]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, linewidth: width }));
    this.scene.add(line);
    this.fx.push({ o: line, t: 0, life, fade: true });
  }

  _burst(x, z, r, color) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
    ball.position.set(x, 0.8, z);
    this.scene.add(ball);
    this.fx.push({ o: ball, t: 0, life: 0.45, grow: r * 1.1, fade: true });
    this._ring(x, z, r, color, 0.5);
  }

  _ring(x, z, r, color, life, rise = false) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.set(x, 0.15, z);
    this.scene.add(ring);
    this.fx.push({ o: ring, t: 0, life, ring: r, rise, fade: true });
  }

  render(state, dt, { follow = null } = {}) {
    this.time += dt;
    if (follow) this.target.lerp(new THREE.Vector3(follow.x, 0, follow.z + 4), Math.min(1, dt * 5));
    const seen = new Set();
    for (const e of state.ents) {
      seen.add(e.i);
      let m = this.models.get(e.i);
      if (!m) {
        m = e.k === 'hero' ? this._hero(e) : e.k === 'foe' ? this._foe(e) : this._sentry(e);
        this.models.set(e.i, m);
      }
      m.group.position.set(e.x, 0, e.z);
      if (e.k === 'hero') {
        m.group.rotation.y = e.a + Math.PI;
        const down = e.act === 'down';
        m.fall = down ? Math.min(1, m.fall + dt * 3) : Math.max(0, m.fall - dt * 4);
        m.group.rotation.x = 0;
        if (m.soldier) {
          m.soldier.group.rotation.x = -m.fall * 1.45;
          m.soldier.group.position.y = m.fall * 0.25;
          m.soldier.update(dt, { moving: e.act === 'run', slow: false, pitch: 0, alive: !down });
        }
        m.ring.material.opacity = down ? 0.3 + Math.sin(this.time * 6) * 0.2 : 0.85;
      } else if (e.k === 'foe') {
        m.group.rotation.y = e.a;
        if (m.made) {
          const clips = CLIPS[e.kind];
          if (e.act === 'rise') this._play(m, 'Spawn_Ground_Skeletons', { once: true });
          else if (e.act === 'walk') this._play(m, clips.walk, { speed: FOES[e.kind].speed / 4 });
          else if ((e.act === 'attack' || e.act === 'slam' || e.act === 'summon') && e.aa !== m.aa) {
            m.clip = null;
            this._play(m, clips[e.act] ?? clips.attack, { once: true, speed: 1.3 });
          } else if (e.act === 'idle' && (!m.current || !m.current.isRunning())) this._play(m, 'Idle');
          m.aa = e.aa;
          m.made.mixer.update(dt);
        }
      } else {
        m.head.rotation.y = e.a;
        m.group.scale.setScalar(e.left < 2 ? Math.max(0.01, e.left / 2) : 1);
      }
    }
    for (const [id, m] of this.models) {
      if (seen.has(id)) continue;
      m.gone = true;
      this.scene.remove(m.group);
      this.models.delete(id);
    }
    // The fallen sink away.
    this.dying = this.dying.filter((d) => {
      d.t += dt;
      d.m.made?.mixer.update(dt);
      if (d.t > 1.6) d.m.group.position.y = -(d.t - 1.6) * 1.2;
      if (d.t < 3) return true;
      d.m.gone = true;
      this.scene.remove(d.m.group);
      return false;
    });
    // Fields, mines, the rifts, the reactor's glow.
    this._fields(state);
    for (const r of this.rifts) {
      const open = state.wave + 1 >= r.from;
      r.g.visible = open;
      r.glow.material.opacity = 0.4 + Math.sin(this.time * 3 + r.g.position.x) * 0.15;
    }
    const health = state.reactor.hp / state.reactor.max;
    this.core.material.emissive.setHSL(0.55 * health, 0.9, 0.5);
    this.core.material.emissiveIntensity = 1.6 + Math.sin(this.time * (health < 0.3 ? 9 : 2)) * 0.6;
    this.coreLight.color.setHSL(0.55 * health, 0.9, 0.6);
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
    this._place();
    this.renderer.render(this.scene, this.camera);
  }

  _fields(state) {
    this.fieldMeshes ??= new Map();
    const live = new Set();
    for (const f of [...state.fields.map((x) => ({ ...x, k: 'field' })), ...state.mines.map((x) => ({ ...x, k: 'mine' }))]) {
      live.add(f.i);
      let m = this.fieldMeshes.get(f.i);
      if (!m) {
        m = f.k === 'field'
          ? new THREE.Mesh(new THREE.CircleGeometry(f.r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3ddc84', transparent: true, opacity: 0.28, depthWrite: false }))
          : new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 12), new THREE.MeshStandardMaterial({ color: '#30343a', emissive: '#ff2010', emissiveIntensity: 0 }));
        m.position.set(f.x, f.k === 'field' ? 0.08 : 0.08, f.z);
        this.scene.add(m);
        this.fieldMeshes.set(f.i, m);
      }
      if (f.k === 'mine') m.material.emissiveIntensity = Math.sin(this.time * 6) > 0 ? 2 : 0;
      else m.material.opacity = 0.2 + Math.sin(this.time * 4) * 0.08;
    }
    for (const [i, m] of this.fieldMeshes) {
      if (live.has(i)) continue;
      this.scene.remove(m);
      this.fieldMeshes.delete(i);
    }
  }

  /* -------------------------------------------------------------- camera */

  pan(dx, dz) {
    this.target.x = Math.max(0, Math.min(SIZE, this.target.x + dx));
    this.target.z = Math.max(0, Math.min(SIZE, this.target.z + dz));
  }

  zoomBy(f) {
    this.zoom = Math.max(18, Math.min(80, this.zoom * f));
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.width = w;
    this.height = h;
  }

  _place() {
    const pitch = 1.02;
    this.camera.position.set(this.target.x, Math.sin(pitch) * this.zoom, this.target.z + Math.cos(pitch) * this.zoom);
    this.camera.lookAt(this.target.x, 0, this.target.z - 1);
    this.camera.updateMatrixWorld();
    this.sun.position.set(this.target.x - 30, 70, this.target.z - 40);
    this.sun.target.position.copy(this.target);
    this.sun.target.updateMatrixWorld();
  }

  /** The ground point under a screen position. */
  groundAt(px, py) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1), this.camera);
    const { origin: o, direction: d } = ray.ray;
    if (d.y >= -1e-4) return null;
    const t = -o.y / d.y;
    return { x: o.x + d.x * t, z: o.z + d.z * t };
  }

  toScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.width, y: ((1 - v.y) / 2) * this.height, front: v.z < 1 };
  }

  /** The body under a screen point: one of the dead, or a soldier. */
  pick(state, px, py, kind = 'foe') {
    let best = null;
    let bestD = 34;
    for (const e of state.ents) {
      if (e.k !== kind) continue;
      const h = kind === 'foe' ? FOES[e.kind].size * 0.55 : 0.9;
      const p = this.toScreen(e.x, h, e.z);
      const d = Math.hypot(p.x - px, p.y - py) - (kind === 'foe' && FOES[e.kind].boss ? 30 : 0);
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  /** Health bars and names, over the 3D. */
  overlay(ctx, state, mySlot) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const dpr = ctx.canvas.width / this.width;
    ctx.save();
    ctx.scale(dpr, dpr);
    for (const e of state.ents) {
      const big = e.k === 'hero' || e.k === 'sentry' || (e.k === 'foe' && FOES[e.kind].boss);
      if (e.k === 'foe' && e.hp >= e.max && !FOES[e.kind].boss) continue;
      const h = e.k === 'foe' ? FOES[e.kind].size + 0.4 : e.k === 'hero' ? 2.2 : 2;
      const p = this.toScreen(e.x, h, e.z);
      if (!p.front || p.x < -40 || p.y < -20 || p.x > this.width + 40 || p.y > this.height + 20) continue;
      const w = e.k === 'foe' && FOES[e.kind].boss ? 90 : big ? 46 : 26;
      const k = Math.max(0, e.hp / e.max);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(p.x - w / 2 - 1, p.y - 1, w + 2, big ? 7 : 5);
      ctx.fillStyle = e.k === 'foe' ? '#e0483c' : e.k === 'sentry' ? '#f5c518' : k > 0.5 ? '#4ade80' : k > 0.25 ? '#facc15' : '#ef4444';
      ctx.fillRect(p.x - w / 2, p.y, w * k, big ? 5 : 3);
      if (e.k === 'hero') {
        const hero = state.heroes.find((x) => x.i === e.i);
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = e.slot === mySlot ? '#ffd400' : '#ffffff';
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 3;
        const label = `${hero?.name ?? ''} · ${hero?.level ?? 1}`;
        ctx.strokeText(label, p.x, p.y - 5);
        ctx.fillText(label, p.x, p.y - 5);
        if (hero?.down) {
          const text = hero.respawn != null ? `down · back in ${Math.ceil(hero.respawn)}s` : 'DOWN — stand by to lift';
          ctx.fillStyle = '#ff8a8a';
          ctx.strokeText(text, p.x, p.y + 20);
          ctx.fillText(text, p.x, p.y + 20);
          if (hero.lift > 0) {
            ctx.fillStyle = '#3ddc84';
            ctx.fillRect(p.x - 23, p.y + 26, 46 * Math.min(1, hero.lift / 2.5), 4);
          }
        }
      }
    }
    ctx.restore();
  }

  dispose() {
    for (const m of this.models.values()) m.gone = true;
    this.renderer.dispose();
    this.canvas.remove();
  }
}
