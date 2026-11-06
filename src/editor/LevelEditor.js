import {
  CapsuleGeometry,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MOUSE,
  Raycaster,
  RingGeometry,
  Vector2,
  Vector3
} from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { settings } from '../config/settings.js';
import { CATEGORIES } from '../library/categories.js';
import { createLevel, normalizeLevel } from '../levels/Level.js';
import { LevelStore } from '../levels/LevelStore.js';
import { mulberry32 } from '../world/Terrain.js';
import { EditorPanel } from '../ui/EditorPanel.js';
import { PORTAL_COLORS, Portal } from '../world/Portals.js';
import { NPC_ROLES, Npc } from '../npc/Npcs.js';

const _ndc = new Vector2();
const _v = new Vector3();

/** Marker look per monster kind: colour and rough height in metres. */
const MONSTER_MARKERS = {
  grunt: ['#ff7a3d', 1.3],
  wisp: ['#b37bff', 1.6],
  brute: ['#d9483b', 2.2],
  golem: ['#5fd0ff', 3.2],
  dragon: ['#ff3b1f', 5.5]
};

/**
 * The level editor: a free camera over a composed map and a handful of
 * tools to build one by hand — no AI required (AI fill is one button).
 *
 * Objects are edited as individual meshes (selectable, draggable); the game
 * builds the same level with GPU instancing when it is played. Everything the
 * editor changes lives in `this.level`, the same JSON that is saved to
 * `public/levels/<id>.json`.
 *
 * Mouse: left = use the tool, right-drag or middle-drag = orbit, wheel = zoom.
 * Keys:  WASD / arrows pan, 1/2/3 move/rotate/scale, Del delete, Ctrl+D
 *        duplicate, Ctrl+Z / Ctrl+Shift+Z undo/redo, [ ] brush size, Q/E turn.
 */
export class LevelEditor {
  /** @param {import('../core/App.js').App} app */
  constructor(app) {
    this.app = app;
    this.store = new LevelStore();
    this.active = false;
    this.level = createLevel();
    this.focus = new Vector3();
    this.tool = 'select';
    this.brush = { radius: 6, strength: 0.6, mode: 'raise', surface: 'grass' };
    this.scatter = { radius: 8, density: 3, spacing: 1.5, variance: 0.25 };
    this.currentModel = null;
    this.scatterSet = [];
    this.monsterKind = 'grunt';
    this.selected = null;
    /** A selected portal or NPC: { kind: 'portal'|'npc', data } */
    this.selectedMarker = null;
    this._markerVisuals = [];
    this.ghostYaw = 0;
    this.dirty = false;
    this._undo = [];
    this._redo = [];
    this._keys = new Set();
    this._rng = mulberry32((Math.random() * 1e9) | 0);

    this.root = new Group();
    this.root.name = 'level-editor';
    this.objectsGroup = new Group();
    this.markersGroup = new Group();
    this.root.add(this.objectsGroup, this.markersGroup);
    this._proxies = new Map(); // level object → mesh group

    this.raycaster = new Raycaster();
    this._buildGuides();

    this.gizmo = new TransformControls(app.camera, app.canvas);
    this.gizmo.setSize(0.9);
    this.gizmo.addEventListener('dragging-changed', (event) => {
      app.rig.controls.enabled = !event.value;
      if (!event.value) this._commit('transform');
    });
    this.gizmo.addEventListener('objectChange', () => this._readGizmo());

    this.panel = new EditorPanel(document.getElementById('hud'), this);
  }

  get terrain() {
    return this.app.composed.terrain;
  }

  /* -------------------------------------------------------------------- */
  /* Enter / leave                                                         */
  /* -------------------------------------------------------------------- */

  async enter(level = null) {
    if (this.active) return;
    this._activate();
    await this.setLevel(level ?? this.level);
  }

  /** Step aside for a play test, keeping the level and its undo history. */
  suspend() {
    if (!this.active) return;
    this._deactivate();
    this._suspended = true;
  }

  /** Back from a play test, exactly where the editor was. */
  resume() {
    if (!this._suspended) return;
    this._suspended = false;
    this.app.clearEffects();
    this._activate();
    this.root.add(this.terrain.mesh);
    this.app.composed._applyAtmosphere(this.level.world);
    this._restickObjects();
    this.panel.refresh();
  }

  exit() {
    if (!this.active) return;
    this._deactivate();
    this.app.useClassicWorld();
    this.app.showMainMenu();
  }

  _activate() {
    const app = this.app;
    this.active = true;
    app.phase = 'editor';
    app.input.enabled = false;
    app.clearEffects();
    app.director.stop();
    app.mainMenu.hide();
    app.hud.setGameplayVisible(false);
    app.gameHud.setVisible(false);
    app.gameMenu.hide();
    document.body.classList.remove('is-menu');
    document.body.classList.add('is-editor');

    // A free camera: farther zoom, steeper look-down, right-drag to orbit.
    const cam = settings.camera;
    this._camBackup = { distance: cam.distance, maxDistance: cam.maxDistance, minPolar: cam.minPolar, maxPolar: cam.maxPolar, targetHeight: cam.targetHeight };
    Object.assign(cam, { distance: this._editDistance ?? 55, maxDistance: 260, minPolar: 0.08, maxPolar: 1.45, targetHeight: 0 });
    this._buttonsBackup = { ...app.rig.controls.mouseButtons };
    app.rig.controls.mouseButtons = { LEFT: null, MIDDLE: MOUSE.ROTATE, RIGHT: MOUSE.ROTATE };

    // The composed world's instances are for play; the editor draws its own meshes.
    app.composed.clear();
    app._useWorld(app.composed);
    app.scene.add(this.root, this.gizmo.getHelper());
    this._listen(true);
    this.panel.show();
  }

  _deactivate() {
    const app = this.app;
    this.active = false;
    for (const visual of this._markerVisuals) {
      visual.label?.remove();
      visual.object.dispose();
    }
    this._markerVisuals = [];
    this._listen(false);
    this.select(null);
    this.panel.hide();
    this.root.removeFromParent();
    this.gizmo.getHelper().removeFromParent();
    this.terrain.mesh?.removeFromParent();
    this._editDistance = settings.camera.distance;
    Object.assign(settings.camera, this._camBackup);
    app.rig.controls.mouseButtons = this._buttonsBackup;
    app.rig.controls.enabled = true;
    document.body.classList.remove('is-editor');
  }

  /* -------------------------------------------------------------------- */
  /* The level                                                             */
  /* -------------------------------------------------------------------- */

  async setLevel(level, { keepHistory = false } = {}) {
    this.level = normalizeLevel(level);
    this.select(null);
    const world = this.level.world;
    this.terrain.setup({ ground: world.ground, relief: world.relief, seed: world.seed });
    this.terrain.load(world.terrain);
    await this.terrain.build();
    this.root.add(this.terrain.mesh);
    this.app.composed._applyAtmosphere(world);
    await this._syncProxies();
    this._syncMarkers();
    if (!keepHistory) {
      this._undo = [this._snapshot()];
      this._redo = [];
      this.dirty = false;
    }
    this.panel.refresh();
  }

  /** The level as it would be saved: hand-edited terrain folded back in. */
  currentLevel() {
    this.level.world.terrain = this.terrain.serialize();
    return normalizeLevel(this.level);
  }

  /** Change world settings (ground, relief, seed, time, fog). */
  async setWorld(changes) {
    Object.assign(this.level.world, changes);
    const world = this.level.world;
    if ('ground' in changes || 'relief' in changes || 'seed' in changes) {
      this.terrain.setup({ ground: world.ground, relief: world.relief, seed: world.seed });
      await this.terrain.build();
      this._restickObjects();
    }
    if ('timeOfDay' in changes || 'fog' in changes) this.app.composed._applyAtmosphere(world);
    this._commit('world');
  }

  async save() {
    const level = this.currentLevel();
    const campaign = await this.store.save(level);
    this.level.id = level.id;
    this.dirty = false;
    this.panel.refresh();
    return campaign;
  }

  async open(id) {
    await this.setLevel(await this.store.load(id));
  }

  async newLevel(name = 'New level') {
    await this.setLevel(createLevel(name));
  }

  /** Ask the AI (or keywords) for a starting map, keeping rules, story and markers. */
  async aiFill(description) {
    const { plan, source, note } = await this.app.mapPlanner.plan(description);
    const generated = this.app.composed.levelFromPlan(plan, { seed: (Math.random() * 1e9) | 0 });
    const level = this.currentLevel();
    level.world = { ...generated.world, terrain: {} };
    level.objects = generated.objects;
    if (/^new level$/i.test(level.name)) level.name = plan.name;
    await this.setLevel(level, { keepHistory: true });
    this._commit('ai fill');
    return { plan, source, note };
  }

  /* -------------------------------------------------------------------- */
  /* Objects                                                               */
  /* -------------------------------------------------------------------- */

  async _syncProxies() {
    for (const proxy of this._proxies.values()) proxy.removeFromParent();
    this._proxies.clear();
    await Promise.all(this.level.objects.map((object) => this._addProxy(object)));
  }

  async _addProxy(object) {
    const model = this.app.composed.resolveModel(object);
    const proxy = await this.app.modelLibrary.createObject(model);
    if (!proxy || !this.level.objects.includes(object)) return null;
    proxy.userData.object = object;
    proxy.userData.model = model;
    this._place(proxy, object);
    this.objectsGroup.add(proxy);
    this._proxies.set(object, proxy);
    return proxy;
  }

  _place(proxy, object) {
    proxy.position.set(object.x, this.terrain.heightAt(object.x, object.z) + object.yOffset, object.z);
    proxy.rotation.set(0, object.yaw, 0);
    proxy.scale.setScalar(object.scale);
  }

  /** After the ground moves, everything stays at the same height above it. */
  _restickObjects() {
    for (const [object, proxy] of this._proxies) this._place(proxy, object);
    this._syncMarkers();
  }

  /** A sensible default size for a model, the same rules the composer uses. */
  _defaultScale(model, x, z, variance = 0) {
    const composed = this.app.composed;
    const range = CATEGORIES[model.category]?.size ?? [1, 3];
    const r = Math.hypot(x, z);
    const zone = r < 18 ? 'arena' : r < 31 ? 'edge' : r < 75 ? 'outskirts' : 'far';
    let scale = composed._capFootprint(model, composed._scaleFor(model, range, this._rng), model.category, zone);
    if (variance) scale *= 1 + (this._rng() * 2 - 1) * variance;
    return scale;
  }

  async addObject(model, x, z, { yaw = this._rng() * Math.PI * 2, scale, commit = true } = {}) {
    const object = {
      model: model.id,
      category: model.category,
      x,
      z,
      yOffset: model.category === 'rock' || model.category === 'cliff' ? -0.1 : 0,
      yaw,
      scale: scale ?? this._defaultScale(model, x, z)
    };
    this.level.objects.push(object);
    await this._addProxy(object);
    if (commit) this._commit('place');
    return object;
  }

  removeObject(object, { commit = true } = {}) {
    const i = this.level.objects.indexOf(object);
    if (i < 0) return;
    this.level.objects.splice(i, 1);
    this._proxies.get(object)?.removeFromParent();
    this._proxies.delete(object);
    if (this.selected === object) this.select(null);
    if (commit) this._commit('delete');
  }

  async duplicateSelected() {
    const source = this.selected;
    if (!source) return;
    const model = this.app.composed.resolveModel(source);
    const copy = await this.addObject(model, source.x + 1.5, source.z + 1.5, { yaw: source.yaw, scale: source.scale, commit: false });
    copy.yOffset = source.yOffset;
    this._place(this._proxies.get(copy), copy);
    this._commit('duplicate');
    this.select(copy);
  }

  select(object) {
    this.selected = object ?? null;
    const proxy = object ? this._proxies.get(object) : null;
    if (proxy) this.gizmo.attach(proxy);
    else this.gizmo.detach();
    this.panel?.refreshSelection();
  }

  setGizmoMode(mode) {
    this.gizmo.setMode(mode);
    // Objects stand on the ground: they turn about Y only and scale uniformly.
    this.gizmo.showX = mode !== 'rotate';
    this.gizmo.showZ = mode !== 'rotate';
    this.panel?.refreshSelection();
  }

  /** Copy the gizmo's edits on the proxy back into the level object. */
  _readGizmo() {
    const proxy = this.gizmo.object;
    const object = proxy?.userData.object;
    if (!object) return;
    if (this.gizmo.mode === 'scale') {
      const s = Math.max(0.01, (proxy.scale.x + proxy.scale.y + proxy.scale.z) / 3);
      proxy.scale.setScalar(s);
    }
    object.x = proxy.position.x;
    object.z = proxy.position.z;
    object.yOffset = proxy.position.y - this.terrain.heightAt(object.x, object.z);
    object.yaw = proxy.rotation.y;
    object.scale = proxy.scale.x;
    this.panel?.refreshSelection();
  }

  /** Numeric edits from the inspector. */
  updateSelected(changes) {
    const object = this.selected;
    if (!object) return;
    Object.assign(object, changes);
    const proxy = this._proxies.get(object);
    if (proxy) this._place(proxy, object);
    this._commit('edit');
  }

  clearObjects() {
    for (const object of [...this.level.objects]) this.removeObject(object, { commit: false });
    this._commit('clear objects');
  }

  /* -------------------------------------------------------------------- */
  /* Spawn points and pre-placed monsters                                  */
  /* -------------------------------------------------------------------- */

  _syncMarkers() {
    for (const visual of this._markerVisuals) {
      visual.label?.remove();
      visual.mark?.remove();
      visual.object.dispose();
    }
    this._markerVisuals = [];
    for (const child of [...this.markersGroup.children]) {
      child.removeFromParent();
      child.geometry?.dispose();
    }
    const heightAt = (x, z) => this.terrain.heightAt(x, z);
    const labels = this.app.labels;
    for (const data of this.level.portals) {
      const portal = new Portal(data, heightAt);
      portal.open = 1;
      this.markersGroup.add(portal.group);
      const selected = this.selectedMarker?.data === data;
      const label = labels.add(portal.position, `${selected ? '▶ ' : ''}${data.label || 'Portal'}${this._portalTargetText(data)}`, {
        className: 'world-label--portal',
        offset: 3.9,
        maxDistance: 200,
        color: PORTAL_COLORS[data.color]
      });
      this._markerVisuals.push({ kind: 'portal', data, object: portal, label });
    }
    for (const data of this.level.npcs) {
      const npc = new Npc(data, this.app.catalog, heightAt);
      this.markersGroup.add(npc.root);
      const selected = this.selectedMarker?.data === data;
      const label = labels.add(npc.position, `${selected ? '▶ ' : ''}${data.name} · ${NPC_ROLES[data.role]?.label ?? ''}${data.quest ? ' !' : ''}`, {
        className: 'world-label--npc',
        offset: 2.35,
        maxDistance: 200,
        color: NPC_ROLES[data.role]?.color
      });
      this._markerVisuals.push({ kind: 'npc', data, object: npc, label });
    }
    for (const spawn of this.level.spawns) {
      const ring = new Mesh(new RingGeometry(0.9, 1.4, 32), this._spawnMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(spawn.x, this.terrain.heightAt(spawn.x, spawn.z) + 0.06, spawn.z);
      this.markersGroup.add(ring);
    }
    for (const monster of this.level.monsters) {
      const [color, height] = MONSTER_MARKERS[monster.kind] ?? ['#ffffff', 1.5];
      const marker = new Mesh(new CapsuleGeometry(height * 0.22, height * 0.55, 4, 10), this._monsterMaterial(color));
      marker.position.set(monster.x, this.terrain.heightAt(monster.x, monster.z) + height * 0.5, monster.z);
      this.markersGroup.add(marker);
    }
  }

  _monsterMaterial(color) {
    this._monsterMats ??= new Map();
    if (!this._monsterMats.has(color)) this._monsterMats.set(color, new MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    return this._monsterMats.get(color);
  }

  _portalTargetText(data) {
    const t = data.target ?? { type: 'none' };
    if (t.type === 'portal') {
      const other = this.level.portals.find((p) => p.id === t.portal);
      return ` → ${other?.label || t.portal}`;
    }
    if (t.type === 'level') return ` → level: ${t.level}`;
    return '';
  }

  /** Click near a portal/NPC selects it (and starts a drag); elsewhere places a new one. */
  _markerClick(kind, point) {
    const list = kind === 'portal' ? this.level.portals : this.level.npcs;
    const hit = list.find((m) => Math.hypot(m.x - point.x, m.z - point.z) < 2);
    if (hit) {
      this.selectedMarker = { kind, data: hit };
      this._drag = { data: hit, moved: false };
    } else {
      // Inside the area the caster can walk.
      const r = Math.hypot(point.x, point.z);
      const k = r > 21.5 ? 21.5 / r : 1;
      const x = +(point.x * k).toFixed(2);
      const z = +(point.z * k).toFixed(2);
      const n = list.length + 1;
      const yaw = +Math.atan2(-x, -z).toFixed(3);
      const data =
        kind === 'portal'
          ? { id: `portal-${Date.now().toString(36)}`, x, z, yaw, color: 'blue', frame: 'arch', label: `Portal ${n}`, target: { type: 'none' } }
          : {
              id: `npc-${Date.now().toString(36)}`,
              name: ['Old Warden', 'Mira', 'Brother Aldo', 'Tamsin', 'Kael'][(n - 1) % 5],
              role: ['guide', 'merchant', 'healer', 'quest'][(n - 1) % 4],
              model: null,
              x,
              z,
              yaw,
              greeting: 'Well met, caster.',
              lines: [],
              ai: true,
              persona: '',
              gift: { type: 'none', rarity: 'magic', amount: 50 },
              quest: null
            };
      list.push(data);
      this.selectedMarker = { kind, data };
      this._commit(kind === 'portal' ? 'add portal' : 'add npc');
    }
    this._syncMarkers();
    this.panel.renderPane();
  }

  updateMarker(changes) {
    const marker = this.selectedMarker;
    if (!marker) return;
    Object.assign(marker.data, changes);
    this._syncMarkers();
    this._commit('edit marker');
  }

  removeMarker() {
    const marker = this.selectedMarker;
    if (!marker) return;
    const list = marker.kind === 'portal' ? this.level.portals : this.level.npcs;
    list.splice(list.indexOf(marker.data), 1);
    // Portals that led here now lead nowhere.
    if (marker.kind === 'portal') {
      for (const p of this.level.portals) if (p.target?.type === 'portal' && p.target.portal === marker.data.id) p.target = { type: 'none' };
    }
    this.selectedMarker = null;
    this._syncMarkers();
    this._commit('remove marker');
    this.panel.renderPane();
  }

  _toggleNear(list, x, z, make) {
    const i = list.findIndex((p) => Math.hypot(p.x - x, p.z - z) < 1.8);
    if (i >= 0) list.splice(i, 1);
    else list.push(make());
    this._syncMarkers();
    this._commit('markers');
  }

  /* -------------------------------------------------------------------- */
  /* Undo / redo                                                           */
  /* -------------------------------------------------------------------- */

  _snapshot() {
    return {
      level: JSON.stringify({ ...this.level, world: { ...this.level.world, terrain: {} } }),
      terrain: this.terrain.snapshot()
    };
  }

  _commit(label) {
    this._undo.push(this._snapshot());
    if (this._undo.length > 60) this._undo.shift();
    this._redo = [];
    this.dirty = true;
    this._lastAction = label;
    this.panel?.refreshStatus();
  }

  async undo() {
    if (this._undo.length < 2) return;
    this._redo.push(this._undo.pop());
    await this._restore(this._undo[this._undo.length - 1]);
  }

  async redo() {
    const next = this._redo.pop();
    if (!next) return;
    this._undo.push(next);
    await this._restore(next);
  }

  async _restore(snapshot) {
    const level = JSON.parse(snapshot.level);
    this.terrain.restore(snapshot.terrain);
    level.world.terrain = this.terrain.serialize();
    await this.setLevel(level, { keepHistory: true });
    this.dirty = true;
    this.panel.refreshStatus();
  }

  /* -------------------------------------------------------------------- */
  /* Input                                                                 */
  /* -------------------------------------------------------------------- */

  _listen(on) {
    const canvas = this.app.canvas;
    const method = on ? 'addEventListener' : 'removeEventListener';
    canvas[method]('pointerdown', this._onDown);
    window[method]('pointermove', this._onMove);
    window[method]('pointerup', this._onUp);
    window[method]('keydown', this._onKeyDown);
    window[method]('keyup', this._onKeyUp);
    canvas[method]('contextmenu', this._onContext);
    if (!on) this._keys.clear();
  }

  _onContext = (event) => event.preventDefault();

  _ray(event) {
    _ndc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(_ndc, this.app.camera);
  }

  _groundHit(event) {
    if (!this.terrain.mesh) return null;
    this._ray(event);
    return this.raycaster.intersectObject(this.terrain.mesh, false)[0]?.point ?? null;
  }

  _objectHit(event) {
    this._ray(event);
    const hit = this.raycaster.intersectObjects(this.objectsGroup.children, true)[0];
    let node = hit?.object;
    while (node && node.parent !== this.objectsGroup) node = node.parent;
    return node?.userData.object ?? null;
  }

  _onDown = async (event) => {
    if (event.button !== 0) return;
    // The gizmo handles its own drags.
    if (this.tool === 'select' && this.gizmo.axis) return;
    const point = this._groundHit(event);
    this._pointerDown = true;

    switch (this.tool) {
      case 'select':
        this.select(this._objectHit(event));
        break;
      case 'place':
        // Keep placing: each click drops another copy. Switch to Select to adjust one.
        if (point && this.currentModel) await this.addObject(this.currentModel, point.x, point.z, { yaw: this.ghostYaw });
        break;
      case 'scatter':
      case 'erase':
        if (point) {
          this._stroke = { x: point.x, z: point.z, changed: false };
          await this._strokeAt(point);
        }
        break;
      case 'sculpt':
      case 'paint':
        if (point) this._stroke = { x: point.x, z: point.z, changed: false, target: this.terrain.heightAt(point.x, point.z), point };
        break;
      case 'spawns':
        if (point) this._toggleNear(this.level.spawns, point.x, point.z, () => ({ x: +point.x.toFixed(2), z: +point.z.toFixed(2) }));
        break;
      case 'monsters':
        if (point) this._toggleNear(this.level.monsters, point.x, point.z, () => ({ kind: this.monsterKind, x: +point.x.toFixed(2), z: +point.z.toFixed(2) }));
        break;
      case 'portals':
        if (point) this._markerClick('portal', point);
        break;
      case 'npcs':
        if (point) this._markerClick('npc', point);
        break;
    }
  };

  _onMove = async (event) => {
    if (!this.active || event.target !== this.app.canvas) return;
    const point = this._groundHit(event);
    this._hover = point;
    this._updateCursor(point);
    if (this._pointerDown && this._drag && point) {
      const r = Math.hypot(point.x, point.z);
      const k = r > 21.5 ? 21.5 / r : 1;
      this._drag.data.x = +(point.x * k).toFixed(2);
      this._drag.data.z = +(point.z * k).toFixed(2);
      this._drag.moved = true;
      const visual = this._markerVisuals.find((v) => v.data === this._drag.data);
      if (visual) {
        const group = visual.object.group ?? visual.object.root;
        group.position.set(this._drag.data.x, this.terrain.heightAt(this._drag.data.x, this._drag.data.z), this._drag.data.z);
      }
      return;
    }
    if (!this._pointerDown || !this._stroke || !point) return;
    if (this.tool === 'sculpt' || this.tool === 'paint') this._stroke.point = point;
    else if (Math.hypot(point.x - this._stroke.x, point.z - this._stroke.z) > this.scatter.radius * 0.45) {
      this._stroke.x = point.x;
      this._stroke.z = point.z;
      await this._strokeAt(point);
    }
  };

  _onUp = () => {
    if (!this._pointerDown) return;
    this._pointerDown = false;
    if (this._drag) {
      const moved = this._drag.moved;
      this._drag = null;
      if (moved) {
        this._syncMarkers();
        this._commit('move marker');
        this.panel.renderPane();
      }
      return;
    }
    const stroke = this._stroke;
    this._stroke = null;
    if (!stroke?.changed) return;
    if (this.tool === 'sculpt') this._restickObjects();
    this._commit(this.tool);
  };

  async _strokeAt(point) {
    const { radius, density, spacing } = this.scatter;
    if (this.tool === 'erase') {
      for (const object of [...this.level.objects]) {
        if (Math.hypot(object.x - point.x, object.z - point.z) <= radius) {
          this.removeObject(object, { commit: false });
          this._stroke.changed = true;
        }
      }
      return;
    }
    const pool = this.scatterSet.length ? this.scatterSet : this.currentModel ? [this.currentModel] : [];
    if (!pool.length) return;
    const nearby = this.level.objects.filter((o) => Math.hypot(o.x - point.x, o.z - point.z) < radius + spacing);
    for (let i = 0; i < density; i++) {
      const a = this._rng() * Math.PI * 2;
      const r = Math.sqrt(this._rng()) * radius;
      const x = point.x + Math.cos(a) * r;
      const z = point.z + Math.sin(a) * r;
      if (nearby.some((o) => Math.hypot(o.x - x, o.z - z) < spacing)) continue;
      const model = pool[Math.floor(this._rng() * pool.length)];
      const object = await this.addObject(model, x, z, {
        scale: this._defaultScale(model, x, z, this.scatter.variance),
        commit: false
      });
      nearby.push(object);
      this._stroke.changed = true;
    }
  }

  _onKeyDown = (event) => {
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
    const ctrl = event.ctrlKey || event.metaKey;
    if (ctrl && event.code === 'KeyZ') {
      event.preventDefault();
      if (event.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if (ctrl && event.code === 'KeyY') {
      event.preventDefault();
      this.redo();
      return;
    }
    if (ctrl && event.code === 'KeyD') {
      event.preventDefault();
      this.duplicateSelected();
      return;
    }
    if (ctrl && event.code === 'KeyS') {
      event.preventDefault();
      this.panel.saveFromKeyboard();
      return;
    }
    switch (event.code) {
      case 'Digit1':
        this.setGizmoMode('translate');
        break;
      case 'Digit2':
        this.setGizmoMode('rotate');
        break;
      case 'Digit3':
        this.setGizmoMode('scale');
        break;
      case 'Delete':
      case 'Backspace':
        if (this.selected) this.removeObject(this.selected);
        break;
      case 'Escape':
        this.select(null);
        break;
      case 'BracketLeft':
        this.setBrush({ radius: Math.max(1, this.brushRadius - 1) });
        break;
      case 'BracketRight':
        this.setBrush({ radius: Math.min(40, this.brushRadius + 1) });
        break;
      case 'KeyQ':
        this.ghostYaw += Math.PI / 12;
        break;
      case 'KeyE':
        this.ghostYaw -= Math.PI / 12;
        break;
      default:
        this._keys.add(event.code);
        return;
    }
    event.preventDefault();
  };

  _onKeyUp = (event) => this._keys.delete(event.code);

  /* -------------------------------------------------------------------- */
  /* Tools                                                                 */
  /* -------------------------------------------------------------------- */

  setTool(tool) {
    this.tool = tool;
    if (tool !== 'portals' && tool !== 'npcs' && this.selectedMarker) {
      this.selectedMarker = null;
      this._syncMarkers();
    }
    if (tool !== 'select' && tool !== 'place') this.select(null);
    this.panel?.refreshTool();
    this._updateCursor(this._hover);
  }

  get brushRadius() {
    return this.tool === 'scatter' || this.tool === 'erase' ? this.scatter.radius : this.brush.radius;
  }

  setBrush(changes) {
    if (this.tool === 'scatter' || this.tool === 'erase') {
      if ('radius' in changes) this.scatter.radius = changes.radius;
    } else Object.assign(this.brush, changes);
    Object.assign(this.scatter, Object.fromEntries(Object.entries(changes).filter(([k]) => k in this.scatter && k !== 'radius')));
    this.panel?.refreshTool();
    this._updateCursor(this._hover);
  }

  /* -------------------------------------------------------------------- */
  /* Per frame                                                             */
  /* -------------------------------------------------------------------- */

  update(dt) {
    if (!this.active) return;
    const app = this.app;
    // Pan with WASD / arrows, in the camera's frame, faster when zoomed out.
    let fx = 0, fz = 0;
    if (this._keys.has('KeyW') || this._keys.has('ArrowUp')) fz += 1;
    if (this._keys.has('KeyS') || this._keys.has('ArrowDown')) fz -= 1;
    if (this._keys.has('KeyA') || this._keys.has('ArrowLeft')) fx += 1;
    if (this._keys.has('KeyD') || this._keys.has('ArrowRight')) fx -= 1;
    if (fx || fz) {
      const yaw = app.rig.yaw;
      const speed = (12 + app.rig.distance * 0.9) * dt * (this._keys.has('ShiftLeft') || this._keys.has('ShiftRight') ? 2.5 : 1);
      this.focus.x += (Math.sin(yaw) * fz + Math.cos(yaw) * fx) * speed;
      this.focus.z += (Math.cos(yaw) * fz - Math.sin(yaw) * fx) * speed;
      const r = Math.hypot(this.focus.x, this.focus.z);
      if (r > 150) this.focus.multiplyScalar(150 / r);
    }
    this.focus.y = this.terrain.heightAt(this.focus.x, this.focus.z);
    app.rig.setAnchor(this.focus.x, this.focus.y, this.focus.z);

    for (const visual of this._markerVisuals) {
      if (visual.kind === 'portal') visual.object.update(dt, performance.now() / 1000);
      else visual.object.mixer?.update(dt);
    }

    // Terrain brushes run every frame the button is held, like an airbrush.
    const stroke = this._stroke;
    if (this._pointerDown && stroke?.point && (this.tool === 'sculpt' || this.tool === 'paint')) {
      const tool = this.tool === 'paint' ? 'paint' : this.brush.mode;
      const changed = this.terrain.brush(tool, stroke.point.x, stroke.point.z, { ...this.brush, target: stroke.target }, dt);
      if (changed) {
        stroke.changed = true;
        this.terrain.refresh();
        this._updateCursor(stroke.point);
      }
    }
  }

  /* -------------------------------------------------------------------- */
  /* Visual aids                                                           */
  /* -------------------------------------------------------------------- */

  _buildGuides() {
    this._spawnMaterial = new MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.9, depthWrite: false });
    // The fighting circle and the band where waves walk in.
    const arena = new Mesh(
      new RingGeometry(settings.ruins.wallRadius - 0.15, settings.ruins.wallRadius + 0.15, 128),
      new MeshBasicMaterial({ color: '#7fd6ff', transparent: true, opacity: 0.55, depthWrite: false })
    );
    arena.rotation.x = -Math.PI / 2;
    arena.position.y = 0.05;
    const band = new Mesh(
      new RingGeometry(18.2, 22.2, 128),
      new MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.08, depthWrite: false })
    );
    band.rotation.x = -Math.PI / 2;
    band.position.y = 0.04;
    this.root.add(arena, band);

    this.cursor = new Mesh(
      new RingGeometry(0.94, 1, 64),
      new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthTest: false, depthWrite: false })
    );
    this.cursor.rotation.x = -Math.PI / 2;
    this.cursor.renderOrder = 10;
    this.cursorDot = new Mesh(
      new CircleGeometry(0.25, 16),
      new MeshBasicMaterial({ color: '#ffffff', depthTest: false, depthWrite: false })
    );
    this.cursorDot.rotation.x = -Math.PI / 2;
    this.cursorDot.renderOrder = 10;
    this.root.add(this.cursor, this.cursorDot);
  }

  _updateCursor(point) {
    const brushTools = ['scatter', 'erase', 'sculpt', 'paint'];
    const show = Boolean(point) && this.active && this.tool !== 'select';
    this.cursor.visible = show && brushTools.includes(this.tool);
    this.cursorDot.visible = show;
    if (!show) return;
    const y = this.terrain.heightAt(point.x, point.z) + 0.15;
    this.cursor.position.set(point.x, y, point.z);
    this.cursor.scale.setScalar(this.brushRadius);
    this.cursorDot.position.set(point.x, y, point.z);
    const colors = { erase: '#ff6b6b', sculpt: '#ffd166', paint: '#9be37a', scatter: '#7fd6ff' };
    this.cursor.material.color.set(colors[this.tool] ?? '#ffffff');
    _v.copy(point);
  }
}
