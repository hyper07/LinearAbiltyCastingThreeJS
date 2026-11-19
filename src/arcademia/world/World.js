/**
 * The diorama: one tall terraced mountain, a themed world on every terrace.
 * Each floor has its three schools in the back row (Math, History,
 * Physics), a front row of places (shop, arcade hall, sticker museum, quest
 * board) round a landmark plaza, toys to poke, hidden gems, a treasure
 * chest, a puzzle boss by the stairs and a portal up.
 *
 * Only the floors near the camera are built in full (lazily, one per frame);
 * the rest show a one-mesh silhouette. Owns the scene, the camera (orbit,
 * zoom, following the buddy loosely), day and night, the floating labels,
 * clicking, hovering and WASD, and the critters who wander about.
 *
 * Events (`on`): enter(subject, floor), place(kind, floor, entry), floor(n),
 * near(building|null), gate(n), npc(npc), chest(n), boss(n), gem(floor, i),
 * toy(kind), floorPick(n), night(k).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { planMountain, buildNavGrid, PLINTH_R, FLOOR_H } from './layout.js';
import { buildTerrain, buildPeaks, buildWater, buildSky, waterClock } from './terrain.js';
import { buildBuilding, BUILDING_NAMES, SUBJECT_ICONS, windowMat, lampMat } from './buildings.js';
import { buildStairs, buildBridge, buildGate, buildChest } from './structures.js';
import { buildTrees, buildGround, buildClouds, buildBirds, buildFireflies, buildMoonProps, windClock, makeSpotCheck } from './nature.js';
import { shop, arcade, museum, board, portal, landmark, toy, gem, silhouette, TOYS_BY_THEME } from './places.js';
import { makeCreature, BUDDY_COLORS } from './figures.js';
import { buildParticles } from './particles.js';
import { WORLDS } from '../quests.js';
import { seeded } from './kit.js';
import { t as tr } from '../i18n/index.js';
import { patchCutout, updateCutout } from './cutout.js';

/** The buddy is a bit bigger than the townsfolk, so it reads from the play camera. */
const KID_SCALE = 1.4;

const DAY = { top: '#8fd3ff', mid: '#d9f3ff', bottom: '#fff4dc', fog: '#d6efff', hemiSky: '#f2fbff', hemiGround: '#9fc79a', hemi: 1.05, sun: '#fff6e0', sunI: 1.9, amb: 0.12 };
const NIGHT = { top: '#0b1636', mid: '#24397a', bottom: '#33478a', fog: '#1d2f66', hemiSky: '#6f84d8', hemiGround: '#1a2350', hemi: 0.9, sun: '#b3c4ff', sunI: 0.6, amb: 0.22 };
const c = (v) => new THREE.Color(v);
/** The places on a floor; names come from the current language (ui.js place.*). */
const placeInfo = (icon, id) => ({ icon, get name() {
  return tr(`place.${id}`);
} });
export const PLACE_INFO = { shop: placeInfo('🎩', 'shop'), arcade: placeInfo('🕹️', 'arcade'), museum: placeInfo('🌈', 'museum'), board: placeInfo('📋', 'board'), portal: placeInfo('🌀', 'portal') };
const LANDMARK_ICONS = { windmill: '🌬️', oasis: '🌴', shrooms: '🍄', snowman: '⛄', rainbow: '🌈', boat: '⛵', rocket: '🚀' };
const landmarkName = (id) => `${LANDMARK_ICONS[id] ?? ''} ${tr(`landmark.${id}`)}`;
const SUBJECTS = ['math', 'history', 'physics'];

export class World {
  constructor({ floors, labels, renderer, reducedMotion = false, buddy = null, on = {} }) {
    this.floors = floors;
    this.labelsEl = labels;
    this.renderer = renderer;
    this.reducedMotion = reducedMotion;
    this.on = on;
    this.buddy = buddy ?? { species: 'fox', color: '#ff9b54', hat: 'party' };
    this.plan = planMountain(floors.length);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(DAY.fog, 160, 600);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 2000);
    this.time = 0;
    this._cut = new THREE.Vector3();
    this.night = 0;
    this.nightTarget = 0;
    this.locked = new Set();
    this.buildings = [];
    this.places = [];
    this.labels = [];
    this.npcs = [];
    this.toys = [];
    this.gems = [];
    this.keys = new Set();
    this.focusFloor = 1;
    this.kidFloor = 1;
    this.found = {};
    this._build();
  }

  /* ================================================================ build */

  _build() {
    const { scene, plan, floors } = this;
    this.hemi = new THREE.HemisphereLight(DAY.hemiSky, DAY.hemiGround, DAY.hemi);
    this.sun = new THREE.DirectionalLight(DAY.sun, DAY.sunI);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 10, far: 260 });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.05;
    this.amb = new THREE.AmbientLight('#ffffff', DAY.amb);
    scene.add(this.hemi, this.sun, this.sun.target, this.amb);
    this.lamps = Array.from({ length: 3 }, () => {
      const l = new THREE.PointLight('#ffb65c', 0, 16, 2);
      scene.add(l);
      return l;
    });
    this.sky = buildSky();
    scene.add(this.sky);
    this.terrain = buildTerrain(plan, floors);
    scene.add(this.terrain);
    scene.add(buildPeaks(plan));
    this.water = buildWater(plan);
    scene.add(this.water);

    // Stairs, gates and bridges: always there (cheap, batched).
    this.gates = [];
    for (const s of plan.stairs) {
      scene.add(buildStairs(s, floors[s.from - 1].look));
      const gate = buildGate(s, floors[s.from - 1].look);
      gate.userData.to = s.to;
      scene.add(gate);
      this.gates.push(gate);
    }
    this.bridges = plan.floors.map((f) => {
      const pz = f.path.reduce((best, q) => (Math.abs(q[0] - f.river.x) < Math.abs(best[0] - f.river.x) ? q : best), f.path[0])[1];
      return { floor: f.n, x: f.river.x, z: pz, y: f.y, width: 2.2, length: 5.6 };
    });
    for (const b of this.bridges) scene.add(buildBridge(b));

    // Every floor: a silhouette now, the full detail when the camera comes near.
    this.floorState = plan.floors.map((f) => {
      const look = floors[f.k];
      const sil = silhouette({ ...look, y: f.y }, f.places);
      scene.add(sil);
      const st = { n: f.n, f, look, sil, detail: null };
      for (const p of f.places) this._place(f, look, p);
      this._floorLabel(f, look);
      return st;
    });
    this._extras();
    // Nature.
    const trees = buildTrees(plan, floors);
    scene.add(trees);
    patchCutout(trees);
    this.moonProps = buildMoonProps(plan, floors);
    scene.add(this.moonProps);
    patchCutout(this.moonProps);
    scene.add(buildGround(plan, floors));
    this.clouds = buildClouds();
    this.birds = buildBirds();
    this.fireflies = buildFireflies(plan, trees.userData.positions);
    this.particles = buildParticles();
    scene.add(this.clouds, this.birds, this.fireflies, this.particles);

    this.ring = new THREE.Mesh(new THREE.RingGeometry(PLINTH_R + 0.25, PLINTH_R + 0.55, 48), new THREE.MeshBasicMaterial({ color: '#ff9ed2', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    scene.add(this.ring);
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.45, 20), new THREE.MeshBasicMaterial({ color: '#fff6dc', transparent: true, opacity: 0.9, depthWrite: false }));
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    scene.add(this.marker);

    // The buddy.
    this.kid = makeCreature({ ...this.buddy, scale: KID_SCALE, lod: 'high' });
    scene.add(this.kid.group);
    const start = plan.floors[0].plinths[1];
    this.kidPos = new THREE.Vector3(start.door.x + 1.5, 0, start.door.z + 3.2);
    this.kidPos.y = plan.height(this.kidPos.x, this.kidPos.z);
    this.kidHeading = Math.PI;
    this.path = null;
    this._people();

    const dom = this.renderer.domElement;
    this.controls = new OrbitControls(this.camera, dom);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 5, maxDistance: 260, minPolarAngle: 0.35, maxPolarAngle: 1.32, rotateSpeed: 0.6, zoomSpeed: 0.9 });
    this.controls.target.copy(this.kidPos).add(new THREE.Vector3(0, 1, 0));
    this.home();
    this._camTween = null;
    this.controls.addEventListener('start', () => (this._camTween = null));
    this._pointer();
    this.setLocked(new Set());
    this._ensureDetail(1);
    this._ensureDetail(2);
  }

  /** A place on a floor: a picking proxy, a label and (later) its model. */
  _place(f, look, p) {
    const subject = SUBJECTS.includes(p.kind);
    const entry = { kind: p.kind, subject: subject ? p.kind : null, floor: f.n, plinth: subject ? f.plinths.find((q) => q.subject === p.kind) : null, p, group: null, wiggle: 9, bounce: 9 };
    entry.at = subject ? { x: p.x, z: p.z + PLINTH_R + 0.8 } : { x: p.x, z: p.z - p.r - 1.2 };
    entry.door = entry.at;
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.8, p.r * 0.8, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.set(p.x, f.y + 4, p.z);
    proxy.userData.place = entry;
    this.scene.add(proxy);
    entry.proxy = proxy;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `arc-pill${subject ? '' : ' arc-pill--place'}`;
    el.innerHTML = '<span class="arc-pill__icon" aria-hidden="true"></span><span class="arc-pill__name"></span><span class="arc-pill__meta"></span>';
    el.querySelector('.arc-pill__icon').textContent = subject ? SUBJECT_ICONS[p.kind] : p.kind === 'landmark' ? '' : PLACE_INFO[p.kind].icon;
    const nameOf = () => (subject ? BUILDING_NAMES[p.kind] : p.kind === 'landmark' ? landmarkName(look.look.landmark) : PLACE_INFO[p.kind].name);
    el.querySelector('.arc-pill__name').textContent = nameOf();
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.select(entry, true);
    });
    this.labelsEl.append(el);
    entry.label = el;
    const top = subject ? 8.5 : p.kind === 'landmark' ? 9.5 : 4.6;
    this.labels.push({ el, entry, extra: !subject, nameOf, pos: new THREE.Vector3(p.x, f.y + top, p.z) });
    this.places.push(entry);
    if (subject) this.buildings.push(entry);
  }

  /** Build a floor in full (once). */
  _ensureDetail(n) {
    const st = this.floorState[n - 1];
    if (!st || st.detail) return;
    const { f, look } = st;
    const g = new THREE.Group();
    g.name = `floor-${n}`;
    for (const e of this.places.filter((x) => x.floor === n)) {
      let m;
      if (e.subject) m = buildBuilding(e.subject, look, { x: e.p.x, y: f.y + 0.55, z: e.p.z });
      else {
        m = e.kind === 'landmark' ? landmark(look.look.landmark, look.look) : { shop, arcade, museum, board }[e.kind](look.look);
        m.position.set(e.p.x, f.y, e.p.z);
      }
      e.group = m;
      e.top = m.userData.top;
      g.add(m);
    }
    // The portal by the stairs up.
    const st2 = this.plan.stairs.find((s) => s.from === n);
    if (st2) {
      const pt = portal();
      pt.position.set(st2.a.x, f.y, st2.a.z + 4.6);
      g.add(pt);
      const entry = { kind: 'portal', floor: n, group: pt, at: { x: st2.a.x, z: st2.a.z + 6.4 }, p: { x: st2.a.x, z: st2.a.z + 4.6, r: 1.4 }, wiggle: 9, bounce: 9 };
      const proxy = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 4, 8), new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.set(entry.p.x, f.y + 1.5, entry.p.z);
      proxy.userData.place = entry;
      g.add(proxy);
      entry.proxy = proxy;
      this.places.push(entry);
      pt.userData.setOn(!this.locked.has(n + 1));
      st.portal = pt;
    }
    // Toys to poke, and three hidden gems.
    const ok = makeSpotCheck(this.plan);
    const r = seeded(n * 97);
    const kinds = TOYS_BY_THEME[look.look.theme] ?? TOYS_BY_THEME.meadow;
    const near = (x, z, d) => this.places.some((p) => p.floor === n && p.p && Math.hypot(p.p.x - x, p.p.z - z) < (p.p.r ?? 2) + d);
    let placed = 0;
    for (let tries = 0; tries < 400 && placed < kinds.length; tries++) {
      const x = f.cx + (r() * 2 - 1) * f.rx * 0.8, z = f.cz + (r() * 1.6 - 0.4) * f.rz;
      if (!ok(x, z, 0.4) || this.plan.floorAt(x, z) !== n || near(x, z, 2.5)) continue;
      const t = toy(kinds[placed], look.look, n * 10 + placed);
      t.position.set(x, this.plan.ground(x, z), z);
      t.rotation.y = r() * 0.6 - 0.3;
      g.add(t);
      this.toys.push({ floor: n, group: t, kind: kinds[placed], x, z });
      placed++;
    }
    const gemSpots = this._gemSpots(f);
    gemSpots.forEach(([x, z], i) => {
      const id = `${n}-${i}`;
      const m = gem(['#7ff7ff', '#ff9ed2', '#ffe066'][i]);
      m.position.set(x, this.plan.ground(x, z), z);
      m.visible = !this.found[id];
      g.add(m);
      this.gems.push({ id, floor: n, group: m, x, z });
    });
    this.scene.add(g);
    patchCutout(g);
    st.detail = g;
    if (this.locked.has(n)) this._dim(g, true);
  }

  /** Gems hide in tricky places: behind the schools, across the stream, at the far ends. */
  _gemSpots(f) {
    const cands = [
      [f.plinths[0].x - 6.5, f.plinths[0].z - 2.5],
      [f.river.x + 3.2, (this.bridges[f.k]?.z ?? f.cz) + 1],
      [f.plinths[1].x + 7, f.plinths[1].z - 3],
      [f.cx - f.rx * 0.78, f.path[0]?.[1] ?? f.cz],
      [f.plinths[2].x + 6.5, f.plinths[2].z - 2]
    ];
    const out = [];
    for (const [x, z] of cands) {
      const spot = this.nav.nearestOpen(x, z);
      if (spot && this.plan.floorAt(spot[0], spot[1]) === f.n) out.push(spot);
      if (out.length === 3) break;
    }
    return out;
  }

  _extras() {
    this.chests = [];
    this.bosses = [];
    for (const f of this.plan.floors) {
      // The chest hides behind a big rock at the far end of the floor.
      const ex = f.k % 2 === 0 ? f.cx + 26 : f.cx - 29;
      const ez = (f.path.find((q) => Math.abs(q[0] - ex) < 1.5)?.[1] ?? f.cz) + 5.5;
      const chest = buildChest();
      chest.position.set(ex, this.plan.height(ex, ez), ez);
      chest.rotation.y = 0.2;
      this.scene.add(chest);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 0), new THREE.MeshToonMaterial({ color: this.floors[f.k].look.rock[0] }));
      rock.scale.set(1.4, 1, 0.9);
      rock.position.set(ex, chest.position.y + 0.8, ez + 1.9);
      rock.castShadow = true;
      this.scene.add(rock);
      const proxy = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.set(ex, chest.position.y + 0.8, ez);
      proxy.userData.chest = f.n;
      this.scene.add(proxy);
      this.chests.push({ floor: f.n, group: chest, proxy, at: { x: ex, z: ez - 1.6 } });
      // The boss waits by the stairs up (on the top floor, by the history hall).
      const st = this.plan.stairs.find((s) => s.from === f.n);
      let bx, bz;
      if (st) {
        bx = st.a.x + (st.a.x < f.cx ? 4.2 : -4.2);
        bz = st.a.z + 2;
      } else {
        bx = f.plinths[1].x + 9;
        bz = f.plinths[1].z;
      }
      const w = WORLDS[f.n];
      const boss = makeCreature({ species: w.boss.species, color: w.boss.color, scale: 2.3, hat: f.n === 7 ? 'crown' : 'none', lod: 'mid', seed: f.n });
      boss.group.position.set(bx, this.plan.height(bx, bz), bz);
      boss.group.rotation.y = 0.3;
      this.scene.add(boss.group);
      const bp = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.6, 8), new THREE.MeshBasicMaterial({ visible: false }));
      bp.position.set(bx, boss.group.position.y + 1.8, bz);
      bp.userData.boss = f.n;
      this.scene.add(bp);
      const entry = { floor: f.n, fig: boss, proxy: bp, at: { x: bx, z: bz + 2.6 }, happy: false };
      this.bosses.push(entry);
      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'arc-pill arc-pill--boss';
      label.innerHTML = '<span class="arc-pill__icon" aria-hidden="true"></span><span class="arc-pill__name"></span><span class="arc-pill__meta"></span>';
      label.querySelector('.arc-pill__icon').textContent = w.boss.emoji;
      label.querySelector('.arc-pill__name').textContent = w.boss.name;
      label.querySelector('.arc-pill__meta').textContent = tr('place.boss');
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        this.goTo(entry.at, () => this.on.boss?.(f.n));
      });
      this.labelsEl.append(label);
      entry.label = label;
      this.labels.push({ el: label, entry: { floor: f.n }, extra: true, nameOf: () => w.boss.name, pos: new THREE.Vector3(bx, boss.group.position.y + 3.3, bz) });
    }
  }

  /** Townsfolk critters of each floor's theme. */
  _people() {
    const r = seeded(42);
    const hats = ['none', 'none', 'party', 'beanie', 'flower', 'propeller'];
    for (const f of this.plan.floors) {
      const kinds = this.floors[f.k].look.critters ?? ['bunny'];
      for (let i = 0; i < 5; i++) {
        const species = kinds[i % kinds.length];
        const fig = makeCreature({ species, color: ['fox', 'puff', 'bunny'].includes(species) ? BUDDY_COLORS[Math.floor(r() * BUDDY_COLORS.length)] : null, hat: hats[Math.floor(r() * hats.length)], scale: 0.75 + r() * 0.25, seed: i + f.n * 7, lod: 'low' });
        this.npcs.push(this._walker(fig, f, 0.9 + r() * 0.8, species));
      }
    }
  }

  _walker(fig, f, speed, species) {
    const pick = () => {
      const p = f.path[Math.floor(Math.random() * f.path.length)];
      return [p[0] + (Math.random() - 0.5) * 3, p[1] + (Math.random() - 0.5) * 2.5];
    };
    const [x, z] = pick();
    fig.group.position.set(x, this.plan.height(x, z), z);
    this.scene.add(fig.group);
    return { fig, floor: f.n, speed, species, path: null, wait: Math.random() * 4, pick, heading: 0 };
  }

  _floorLabel(f, look) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'arc-pill arc-pill--floor';
    el.innerHTML = '<span class="arc-pill__icon" aria-hidden="true"></span><span class="arc-pill__name"></span><span class="arc-pill__meta"></span>';
    el.querySelector('.arc-pill__icon').textContent = look.icon;
    const nameOf = () => tr('hud.navFloor', { n: f.n, name: look.name });
    el.querySelector('.arc-pill__name').textContent = nameOf();
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.on.floorPick?.(f.n);
    });
    this.labelsEl.append(el);
    this.labels.push({ el, floor: f.n, entry: { floor: f.n }, isFloor: true, icon: look.icon, nameOf, pos: new THREE.Vector3(f.cx, f.y + 12, f.plinths[1].z + 6) });
  }

  /* ================================================================ state */

  setLocked(locked, { animate = false } = {}) {
    const before = this.locked;
    this.locked = new Set(locked);
    this.nav = buildNavGrid(this.plan, {
      locked: (n) => this.locked.has(n),
      blockers: [
        ...this.places.filter((p) => p.p && p.kind !== 'portal').map((p) => ({ x: p.p.x, z: p.subject ? p.p.z - 0.4 : p.p.z, r: p.subject ? 3.25 : p.p.r * 0.85 })),
        ...(this.chests ?? []).map((c) => ({ x: c.group.position.x, z: c.group.position.z, r: 0.9 })),
        ...(this.chests ?? []).map((c) => ({ x: c.group.position.x, z: c.group.position.z + 1.9, r: 1.6 })),
        ...(this.bosses ?? []).map((b) => ({ x: b.fig.group.position.x, z: b.fig.group.position.z, r: 1.1 }))
      ],
      bridges: this.bridges
    });
    this.terrain.userData.setLocked((n) => this.locked.has(n));
    for (const g of this.gates) g.userData.setOpen(!this.locked.has(g.userData.to), !animate || !before.has(g.userData.to));
    for (const st of this.floorState ?? []) {
      if (st.detail) this._dim(st.detail, this.locked.has(st.n));
      st.portal?.userData.setOn(!this.locked.has(st.n + 1));
      st.sil.material.color.set(this.locked.has(st.n) ? '#9aa0a8' : '#ffffff');
    }
    for (const L of this.labels) {
      const n = L.entry.floor;
      const lock = this.locked.has(n);
      L.el.classList.toggle('is-locked', lock);
      if (L.isFloor) L.el.querySelector('.arc-pill__icon').textContent = lock ? '🔒' : L.icon;
      else if (L.entry.subject) L.el.querySelector('.arc-pill__icon').textContent = lock ? '🔒' : SUBJECT_ICONS[L.entry.subject];
    }
  }

  _dim(group, dim) {
    group.traverse((o) => {
      if (!o.isMesh || !o.material || o.material === windowMat || Array.isArray(o.material)) return;
      o.userData.orig ??= o.material;
      o.material = dim ? dimmed(o.userData.orig) : o.userData.orig;
    });
  }

  setBuildingStats(fn, floorFn = null) {
    for (const b of this.buildings) b.label.querySelector('.arc-pill__meta').textContent = fn(b.subject, b.floor) ?? '';
    if (floorFn) for (const L of this.labels) if (L.isFloor) L.el.querySelector('.arc-pill__meta').textContent = floorFn(L.floor) ?? '';
  }

  /** The language changed: write every floating label again. */
  relabel() {
    for (const L of this.labels) if (L.nameOf) L.el.querySelector('.arc-pill__name').textContent = L.nameOf();
  }

  /** Turn the see-through circle round the buddy off (lessons and panels use other cameras). */
  cutOff() {
    updateCutout(this.camera, this.renderer, this._cut, 1, false);
  }

  /** Change the player's buddy (species, colour, hat). */
  setBuddy(buddy) {
    this.buddy = buddy;
    this.scene.remove(this.kid.group);
    this.kid = makeCreature({ ...buddy, scale: KID_SCALE, lod: 'high' });
    this.scene.add(this.kid.group);
    this.kid.group.position.copy(this.kidPos);
    this.kid.hop();
  }

  /** Gems already found (ids like "3-1"). */
  setFound(found) {
    this.found = { ...found };
    for (const g of this.gems) g.group.visible = !this.found[g.id];
  }

  setNight(on) {
    this.nightTarget = on ? 1 : 0;
    if (this.reducedMotion) this.night = this.nightTarget;
  }

  /* ================================================================ camera */

  home() {
    const t = this.kidPos.clone().add(new THREE.Vector3(0, 1, 0));
    this._tweenCam(t, new THREE.Vector3(6.2, 7.6, 12.6), 0.9);
  }
  zoom(by) {
    const off = this.camera.position.clone().sub(this.controls.target);
    const len = THREE.MathUtils.clamp(off.length() * by, this.controls.minDistance, this.controls.maxDistance);
    this._tweenCam(this.controls.target.clone(), off.setLength(len), 0.35);
  }
  showFloor(n) {
    const f = this.plan.floors[n - 1];
    if (!f) return;
    this.focusFloor = n;
    this._ensureDetail(n);
    this._tweenCam(new THREE.Vector3(f.cx, f.y + 1, f.plinths[1].z + 9), new THREE.Vector3(22, 36, 56), 1.0);
  }
  closeUp() {
    const t = this.kidPos.clone().add(new THREE.Vector3(0, 0.7, 0));
    this.kidHeading = 0;
    this._tweenCam(t, new THREE.Vector3(1.4, 1.1, 4.2), 0.8);
  }
  showBoss(n) {
    const b = this.bosses.find((x) => x.floor === n);
    if (!b) return;
    const p = b.fig.group.position;
    this._tweenCam(new THREE.Vector3(p.x - 1.2, p.y + 1.6, p.z), new THREE.Vector3(2.5, 2.2, 8.5), 0.9);
  }
  overview() {
    const mid = this.plan.floors[Math.floor(this.plan.floors.length / 2)];
    this._tweenCam(new THREE.Vector3(0, mid.y - 6, mid.cz + 10), new THREE.Vector3(95, 85, 170), 1.2);
  }
  _tweenCam(target, offset, seconds) {
    if (!this._camInit) {
      this._camInit = true;
      this.controls.target.copy(target);
      this.camera.position.copy(target).add(offset);
      this.controls.update();
      return;
    }
    this._camTween = { t: 0, s: this.reducedMotion ? 0.01 : seconds, fromT: this.controls.target.clone(), fromP: this.camera.position.clone(), toT: target.clone(), toP: target.clone().add(offset) };
    this._following = false;
  }

  /* ================================================================ input */

  _pick(e) {
    const dom = this.renderer.domElement;
    const rect = dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this._ray ??= new THREE.Raycaster();
    this._ray.setFromCamera(ndc, this.camera);
    return this._ray;
  }

  _pointer() {
    const dom = this.renderer.domElement;
    let down = null;
    dom.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
    // Buildings wiggle when the pointer is over them.
    let lastHover = 0;
    dom.addEventListener('pointermove', (e) => {
      if (e.buttons || this.paused || performance.now() - lastHover < 90) return;
      lastHover = performance.now();
      const ray = this._pick(e);
      const proxies = this.places.filter((p) => p.group && Math.abs(p.floor - this.focusFloor) <= 1).map((p) => p.proxy);
      const hit = ray.intersectObjects(proxies, false)[0];
      const entry = hit?.object.userData.place ?? null;
      if (entry !== this.hovered) {
        this.hovered = entry;
        if (entry) entry.wiggle = 0;
        dom.style.cursor = entry ? 'pointer' : '';
      }
    });
    dom.addEventListener('pointerup', (e) => {
      if (!down || this.paused) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 7) return;
      const ray = this._pick(e);
      const near = (n) => Math.abs(n - this.focusFloor) <= 1;
      const targets = [
        ...this.places.filter((p) => near(p.floor)).map((p) => p.proxy),
        ...this.chests.filter((c) => near(c.floor)).map((c) => c.proxy),
        ...this.bosses.filter((b) => near(b.floor)).map((b) => b.proxy),
        ...this.toys.filter((t) => near(t.floor)).map((t) => t.group),
        ...this.gems.filter((g) => near(g.floor) && g.group.visible).map((g) => g.group),
        ...this.npcs.filter((n) => n.fig.group.visible).map((n) => n.fig.group),
        this.terrain
      ];
      const hits = ray.intersectObjects(targets, true);
      for (const h of hits) {
        const o = h.object;
        if (o.userData.place) return this.select(o.userData.place, true);
        if (o.userData.chest) {
          const ch = this.chests.find((x) => x.proxy === o);
          return this.goTo(ch.at, () => this.on.chest?.(ch.floor, ch));
        }
        if (o.userData.boss) {
          const b = this.bosses.find((x) => x.proxy === o);
          return this.goTo(b.at, () => this.on.boss?.(b.floor));
        }
        const toyHit = this.toys.find((t) => isChild(t.group, o));
        if (toyHit) {
          toyHit.group.userData.poke?.();
          this.on.toy?.(toyHit.group.userData.sound ?? 'boing', toyHit);
          return;
        }
        const gemHit = this.gems.find((g) => isChild(g.group, o));
        if (gemHit) return this.goTo({ x: gemHit.x, z: gemHit.z }, () => this._collect(gemHit));
        const npc = this.npcs.find((n) => isChild(n.fig.group, o));
        if (npc) {
          npc.fig.wave(2);
          npc.fig.hop();
          this.on.npc?.(npc);
          return;
        }
        if (o === this.terrain) {
          this.select(null);
          this.walkTo(h.point.x, h.point.z);
          return;
        }
      }
    });
  }

  _collect(g) {
    if (this.found[g.id]) return;
    this.found[g.id] = true;
    g.group.userData.collect();
    this.kid.cheer(1.2);
    this.on.gem?.(g.floor, g.id);
  }

  /** Choose a place: a ring under it; `go` walks there and opens it on arrival. */
  select(entry, go = false) {
    this.selected = entry;
    this.ring.visible = Boolean(entry && entry.subject);
    if (entry?.subject) this.ring.position.set(entry.p.x, this.plan.floors[entry.floor - 1].y + PLINTH_H_TOP, entry.p.z);
    this.on.select?.(entry);
    if (entry && go) {
      if (this.locked.has(entry.floor)) return this.on.gate?.(entry.floor);
      const act = () => this.open(entry);
      this.goTo(entry.at, act);
    }
  }

  /** Arrived at a place: doors bounce, then it opens. */
  open(entry) {
    entry.bounce = 0;
    this.kidHeading = entry.subject ? Math.PI : 0;
    this.kid.hop();
    if (entry.kind !== 'landmark') entry.group?.userData.poke?.();
    setTimeout(() => {
      if (entry.subject) this.on.enter?.(entry.subject, entry.floor);
      else {
        if (entry.kind === 'landmark') entry.group?.userData.poke?.();
        this.on.place?.(entry.kind, entry.floor, entry);
      }
    }, this.reducedMotion ? 0 : 420);
  }

  goTo(at, then) {
    this.arrive = then;
    if (!this.walkTo(at.x, at.z)) {
      this.arrive = null;
      if (Math.hypot(this.kidPos.x - at.x, this.kidPos.z - at.z) < 4.5) then();
    }
  }

  walkTo(x, z) {
    const path = this.nav.findPath([this.kidPos.x, this.kidPos.z], [x, z]);
    if (!path) {
      const n = this.plan.floorAt(x, z);
      if (n && this.locked.has(n)) this.on.gate?.(n);
      return false;
    }
    this.path = path.map(([px, pz]) => new THREE.Vector2(px, pz));
    this.pathI = 1;
    const end = path.at(-1);
    this.marker.visible = true;
    this.marker.position.set(end[0], this.plan.height(end[0], end[1]) + 0.08, end[1]);
    this._following = true;
    return true;
  }

  teleport(n) {
    const f = this.plan.floors[n - 1];
    if (!f || this.locked.has(n)) return false;
    const p = f.plinths[1];
    const spot = this.nav.nearestOpen(p.door.x + 1.5, p.door.z + 3.4) ?? [p.door.x, p.door.z + 2.4];
    this.kidPos.set(spot[0], this.plan.height(spot[0], spot[1]), spot[1]);
    this.path = null;
    this.arrive = null;
    this.marker.visible = false;
    this.kidHeading = 0;
    this._ensureDetail(n);
    this.kid.hop();
    this.home();
    return true;
  }

  keyDown(code) {
    this.keys.add(code);
  }
  keyUp(code) {
    this.keys.delete(code);
  }
  clearKeys() {
    this.keys.clear();
  }

  nearDoor() {
    return this.buildings.find((b) => !this.locked.has(b.floor) && Math.hypot(this.kidPos.x - b.at.x, this.kidPos.z - b.at.z) < 2.4) ?? null;
  }

  /* ================================================================ frame */

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.w = w;
    this.h = h;
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    this._moveKid(dt);
    if (this._camTween) {
      const k = this._camTween;
      k.t = Math.min(1, k.t + dt / k.s);
      const e = k.t < 0.5 ? 4 * k.t ** 3 : 1 - (-2 * k.t + 2) ** 3 / 2;
      this.controls.target.lerpVectors(k.fromT, k.toT, e);
      this.camera.position.lerpVectors(k.fromP, k.toP, e);
      if (k.t >= 1) {
        this._camTween = null;
        this._following = true;
      }
    } else if (this._following) {
      const want = this.kidPos.clone().add(new THREE.Vector3(0, 1, 0));
      const delta = want.sub(this.controls.target).multiplyScalar(Math.min(1, dt * 2.2));
      this.controls.target.add(delta);
      this.camera.position.add(delta);
    }
    this.controls.update();
    const dist = this.camera.position.distanceTo(this.controls.target);
    this._cut.copy(this.kidPos).y += 0.62 * KID_SCALE;
    updateCutout(this.camera, this.renderer, this._cut, 1.1 * KID_SCALE, dist < 70 && !this.paused);
    this.scene.fog.near = 80 + dist * 1.2;
    this.scene.fog.far = 360 + dist * 3;
    const tf = Math.max(1, Math.min(this.floors.length, Math.round(this.controls.target.y / FLOOR_H) + 1));
    if (tf !== this.focusFloor) {
      this.focusFloor = tf;
      this.particles.userData.setFloor(this.plan.floors[tf - 1], this.floors[tf - 1].look);
    }
    if (!this._partInit) {
      this._partInit = true;
      this.particles.userData.setFloor(this.plan.floors[tf - 1], this.floors[tf - 1].look);
    }
    // Detail near the camera, silhouettes far away; build one floor a frame at most.
    let built = false;
    for (const st of this.floorState) {
      const near = Math.abs(st.n - this.focusFloor) <= 1 || Math.abs(st.n - this.kidFloor) <= 0;
      if (near && !st.detail && !built) {
        this._ensureDetail(st.n);
        built = true;
      }
      if (st.detail) st.detail.visible = near;
      st.sil.visible = !(near && st.detail);
    }
    if (this.night !== this.nightTarget) {
      this.night += Math.sign(this.nightTarget - this.night) * Math.min(Math.abs(this.nightTarget - this.night), dt / 1.6);
      this._applyNight();
    }
    windClock.uTime.value = this.reducedMotion ? 0 : t;
    this.water.userData.update(this.reducedMotion ? 0 : t);
    this.particles.userData.update(this.reducedMotion ? 0 : dt);
    this.moonProps.userData.update(this.reducedMotion ? 0 : t);
    if (!this.reducedMotion) {
      this.clouds.userData.update(dt);
      this.birds.userData.update(dt, t);
    }
    const md = this.reducedMotion ? 0 : dt;
    for (const e of this.places) {
      if (!e.group || Math.abs(e.floor - this.focusFloor) > 1) continue;
      e.group.userData.update?.(md, t);
      // Hover wiggle and the door bounce.
      e.wiggle += dt;
      e.bounce += dt;
      const w = e.wiggle < 0.6 && !this.reducedMotion ? Math.sin(e.wiggle * 22) * 0.025 * (1 - e.wiggle / 0.6) : 0;
      const b = e.bounce < 0.5 && !this.reducedMotion ? Math.sin(e.bounce * 18) * 0.06 * (1 - e.bounce / 0.5) : 0;
      e.group.rotation.z = w;
      if (e.subject) e.group.scale.set(1 - b, 1 + b * 1.4, 1 - b);
    }
    for (const toyE of this.toys) if (Math.abs(toyE.floor - this.focusFloor) <= 1) toyE.group.userData.update?.(md, t);
    for (const g of this.gems) if (g.group.visible && Math.abs(g.floor - this.focusFloor) <= 1) g.group.userData.update(md);
    for (const g of this.gates) g.userData.update(dt);
    for (const ch of this.chests) if (Math.abs(ch.floor - this.focusFloor) <= 1) ch.group.userData.update(dt);
    for (const b of this.bosses) {
      const near = Math.abs(b.floor - this.focusFloor) <= 1;
      b.fig.group.visible = near;
      if (!near) continue;
      if (!b.happy && b.fig.state.sadT < 0.3) b.fig.state.sadT = 1.2;
      if (b.happy && Math.random() < dt * 0.3) b.fig.hop();
      b.fig.update(dt, {});
    }
    this._npcs(dt);
    this.ring.material.opacity = 0.55 + Math.sin(t * 3) * 0.25;
    this.ring.rotation.z = t * 0.2;
    if (this.marker.visible) this.marker.scale.setScalar(1 + Math.sin(t * 6) * 0.12);
    const ct = this.controls.target;
    this.sun.target.position.copy(ct);
    this.sun.position.copy(ct).add(new THREE.Vector3(45, 80, 50));
    const fl = this.plan.floors[this.focusFloor - 1];
    fl.plinths.forEach((p, i) => this.lamps[i].position.set(p.x, fl.y + 2.4, p.z + PLINTH_R));
    this._labels();
  }

  _moveKid(dt) {
    let speed = 0;
    const kp = this.kidPos;
    let ix = 0, iz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) iz -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) iz += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) ix -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) ix += 1;
    if (ix || iz) {
      this.path = null;
      this.arrive = null;
      this.marker.visible = false;
      this._following = true;
      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      const dir = right.multiplyScalar(ix).add(fwd.multiplyScalar(-iz)).normalize();
      const v = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 7 : 4.6) * dt;
      const nx = kp.x + dir.x * v, nz = kp.z + dir.z * v;
      if (this.nav.canStep(kp.x, kp.z, nx, nz)) kp.set(nx, kp.y, nz);
      else if (this.nav.canStep(kp.x, kp.z, nx, kp.z)) kp.x = nx;
      else if (this.nav.canStep(kp.x, kp.z, kp.x, nz)) kp.z = nz;
      else this._bump(nx, nz);
      this.kidHeading = turn(this.kidHeading, Math.atan2(dir.x, dir.z), dt * 12);
      speed = v / dt;
    } else if (this.path) {
      const target = this.path[this.pathI];
      const dx = target.x - kp.x, dz = target.y - kp.z;
      const d = Math.hypot(dx, dz);
      const v = 5.2 * dt;
      if (d < v) {
        kp.x = target.x;
        kp.z = target.y;
        this.pathI++;
        if (this.pathI >= this.path.length) {
          this.path = null;
          this.marker.visible = false;
          if (this.arrive) {
            const fn = this.arrive;
            this.arrive = null;
            fn();
          }
        }
      } else {
        kp.x += (dx / d) * v;
        kp.z += (dz / d) * v;
        this.kidHeading = turn(this.kidHeading, Math.atan2(dx, dz), dt * 10);
      }
      speed = 5.2;
    }
    kp.y = THREE.MathUtils.lerp(kp.y, this.plan.height(kp.x, kp.z), Math.min(1, dt * 18));
    this.kid.group.position.copy(kp);
    this.kid.group.rotation.y = this.kidHeading;
    this.kid.update(dt, { speed });
    const n = this.plan.floorAt(kp.x, kp.z);
    if (n && n !== this.kidFloor) {
      this.kidFloor = n;
      this.on.floor?.(n);
    }
    const near = this.nearDoor();
    if (near !== this._near) {
      this._near = near;
      this.on.near?.(near);
    }
  }

  _bump(x, z) {
    if (this.time - (this._bumpT ?? -9) < 3) return;
    for (const s of this.plan.stairs) {
      if (this.locked.has(s.to) && Math.hypot(x - s.a.x, z - s.a.z) < 3.5) {
        this._bumpT = this.time;
        this.on.gate?.(s.to);
      }
    }
  }

  _npcs(dt) {
    for (const n of this.npcs) {
      const near = Math.abs(n.floor - this.focusFloor) <= 1;
      n.fig.group.visible = near;
      if (!near) continue;
      const g = n.fig.group;
      let speed = 0;
      if (n.path) {
        const target = n.path[n.i];
        const dx = target[0] - g.position.x, dz = target[1] - g.position.z;
        const d = Math.hypot(dx, dz);
        const v = n.speed * dt;
        if (d < v) {
          n.i++;
          if (n.i >= n.path.length) {
            n.path = null;
            n.wait = 2 + Math.random() * 6;
            if (Math.random() < 0.4) Math.random() < 0.5 ? n.fig.wave(1.5) : n.fig.hop();
          }
        } else {
          g.position.x += (dx / d) * v;
          g.position.z += (dz / d) * v;
          n.heading = turn(n.heading, Math.atan2(dx, dz), dt * 6);
          speed = n.speed;
        }
      } else if ((n.wait -= dt) < 0) {
        const [tx, tz] = n.pick();
        const path = this.nav.findPath([g.position.x, g.position.z], [tx, tz]);
        if (path && this.plan.floorAt(tx, tz) === n.floor) {
          n.path = path;
          n.i = 1;
        } else n.wait = 1;
      } else if (Math.hypot(g.position.x - this.kidPos.x, g.position.z - this.kidPos.z) < 3) {
        n.heading = turn(n.heading, Math.atan2(this.kidPos.x - g.position.x, this.kidPos.z - g.position.z), dt * 4);
      }
      g.position.y = this.plan.height(g.position.x, g.position.z);
      g.rotation.y = n.heading;
      n.fig.update(dt, { speed });
    }
  }

  _labels() {
    const v = new THREE.Vector3();
    const w = this.w ?? 1, h = this.h ?? 1;
    const camDist = this.camera.position.distanceTo(this.controls.target);
    const far = camDist > 95;
    for (const L of this.labels) {
      const df = Math.abs(L.entry.floor - this.focusFloor);
      const show = L.isFloor ? far : L.extra ? !far && df === 0 && camDist < 75 : !far && df === 0;
      v.copy(L.pos).project(this.camera);
      const on = show && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      if (!on) {
        if (!L.hidden) {
          L.el.style.visibility = 'hidden';
          L.hidden = true;
        }
        continue;
      }
      L.hidden = false;
      L.el.style.visibility = 'visible';
      L.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
      L.el.style.opacity = df === 0 || L.isFloor ? '1' : '0.72';
      L.el.classList.toggle('is-near', this._near === L.entry || this.hovered === L.entry);
      L.el.classList.toggle('is-selected', this.selected === L.entry);
    }
  }

  _applyNight() {
    const k = this.night;
    const mix = (a) => c(DAY[a]).lerp(c(NIGHT[a]), k);
    const u = this.sky.userData.uniforms;
    u.uTop.value.copy(mix('top'));
    u.uMid.value.copy(mix('mid'));
    u.uBottom.value.copy(mix('bottom'));
    this.scene.fog.color.copy(mix('fog'));
    this.hemi.color.copy(mix('hemiSky'));
    this.hemi.groundColor.copy(mix('hemiGround'));
    this.hemi.intensity = THREE.MathUtils.lerp(DAY.hemi, NIGHT.hemi, k);
    this.sun.color.copy(mix('sun'));
    this.sun.intensity = THREE.MathUtils.lerp(DAY.sunI, NIGHT.sunI, k);
    this.amb.intensity = THREE.MathUtils.lerp(DAY.amb, NIGHT.amb, k);
    windowMat.emissiveIntensity = k * 1.6;
    lampMat.emissiveIntensity = 0.25 + k * 2.4;
    for (const l of this.lamps) l.intensity = k * 12;
    this.sky.userData.stars.material.opacity = k;
    this.sky.userData.moon.material.opacity = k;
    this.fireflies.userData.material.uniforms.uNight.value = k;
    waterClock.uNight.value = k;
    this.on.night?.(k);
  }

  dispose() {
    this.controls.dispose();
    this.scene.traverse((o) => o.geometry?.dispose?.());
    for (const L of this.labels) L.el.remove();
  }
}

const PLINTH_H_TOP = 0.67;
const dimCache = new Map();
function dimmed(material) {
  if (!dimCache.has(material)) {
    const m = material.clone();
    if (m.color) {
      const hsl = m.color.getHSL({});
      m.color.setHSL(hsl.h, hsl.s * 0.25, hsl.l * 0.72);
    }
    if (m.emissive) m.emissiveIntensity = 0;
    dimCache.set(material, m);
  }
  return dimCache.get(material);
}
function turn(from, to, k) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d * Math.min(1, k);
}
function isChild(root, o) {
  for (let p = o; p; p = p.parent) if (p === root) return true;
  return false;
}
