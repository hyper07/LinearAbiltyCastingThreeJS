import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  CircleGeometry,
  RingGeometry
} from 'three';

import { CharacterController } from '../animation/CharacterController.js';
import { platform } from '../platform/index.js';

/** @typedef {'idle'|'walk'|'run'|'cast'|'attack'} PreviewMode */

export const PREVIEW_MODES = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Walk' },
  { id: 'run', label: 'Run' },
  { id: 'cast', label: 'Cast' },
  { id: 'attack', label: 'Attack Preview' }
];

/**
 * Rotatable 3D character preview for the main menu.
 *
 * Owns an isolated clone of the loaded game character — the live rig never
 * leaves the main scene, which avoids skinned-mesh matrix corruption.
 */
export class CharacterPreview {
  /**
   * @param {HTMLElement} mount
   * @param {{
   *   getEnvironment?: () => import('../world/Environment.js').Environment,
   *   getCharacter?: () => CharacterController|null
   * }} [options]
   */
  constructor(mount, options = {}) {
    this.getEnvironment = options.getEnvironment ?? (() => null);
    this.getCharacter = options.getCharacter ?? (() => null);
    this._visible = false;
    this._raf = 0;
    this._lastTime = 0;
    /** @type {PreviewMode} */
    this._mode = 'idle';
    this._characterId = null;
    this._weaponId = null;
    /** @type {CharacterController|null} */
    this.previewCharacter = null;
    /** @type {string|null} definition id the clone was built from */
    this._cloneSourceId = null;
    this._castTimer = 0;
    this._attackTimer = 0.6;
    /** @type {string|null} last attack label shown in the preview hint */
    this._attackLabel = null;
    this._dragging = false;
    this._lastPointerX = 0;

    this.root = document.createElement('div');
    this.root.className = 'char-preview';
    this.root.innerHTML = `
      <canvas class="char-preview__canvas" aria-label="Character preview"></canvas>
      <div class="char-preview__overlay">
        <span class="char-preview__hint">Drag to rotate · pick a motion below</span>
        <nav class="char-preview__modes" data-modes></nav>
      </div>
      <div class="char-preview__loading is-hidden" data-loading>Loading model…</div>
    `;
    mount.appendChild(this.root);

    this.canvas = this.root.querySelector('.char-preview__canvas');
    this.loadingEl = this.root.querySelector('[data-loading]');
    this.modesEl = this.root.querySelector('[data-modes]');

    this.scene = new Scene();
    this.scene.background = new Color(0x0a1018);

    this.camera = new PerspectiveCamera(36, 1, 0.1, 40);
    this.camera.position.set(0, 1.55, 4.2);
    this.camera.lookAt(0, 1.05, 0);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    const hemi = new AmbientLight(0x8eb4d4, 0.55);
    const key = new DirectionalLight(0xfff0dc, 1.2);
    key.position.set(3, 6, 4);
    const rim = new DirectionalLight(0x7fd6ff, 0.6);
    rim.position.set(-4, 3, -2);
    this.scene.add(hemi, key, rim);

    this.pivot = new Group();
    this.pivot.name = 'PreviewPivot';
    this.scene.add(this.pivot);

    this._buildFloor();
    this._buildModeButtons();
    this._bindPointer();
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this.root);
  }

  get isAttached() {
    return this.previewCharacter !== null;
  }

  _setLoading(visible, message = 'Loading model…') {
    this.loadingEl.textContent = message;
    this.loadingEl.classList.toggle('is-hidden', !visible);
  }

  _buildFloor() {
    const disk = new Mesh(
      new CircleGeometry(1.35, 48),
      new MeshStandardMaterial({ color: 0x141c28, roughness: 0.92, metalness: 0.05 })
    );
    disk.rotation.x = -Math.PI / 2;
    this.scene.add(disk);

    const ring = new Mesh(
      new RingGeometry(1.38, 1.48, 64),
      new MeshStandardMaterial({
        color: 0x7fd6ff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.5,
        metalness: 0.2
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    this.scene.add(ring);
  }

  _buildModeButtons() {
    this.modesEl.innerHTML = PREVIEW_MODES.map(
      (mode) =>
        `<button type="button" class="char-preview__mode" data-mode="${mode.id}">${mode.label}</button>`
    ).join('');

    for (const btn of this.modesEl.querySelectorAll('.char-preview__mode')) {
      btn.addEventListener('click', () => {
        this.setMode(btn.dataset.mode);
      });
    }
    this._updateModeButtons();
  }

  _updateModeButtons() {
    for (const btn of this.modesEl.querySelectorAll('.char-preview__mode')) {
      btn.classList.toggle('is-active', btn.dataset.mode === this._mode);
    }
  }

  _bindPointer() {
    this.canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      this._dragging = true;
      this._lastPointerX = event.clientX;
      this.canvas.setPointerCapture(event.pointerId);
    });

    this.canvas.addEventListener('pointermove', (event) => {
      if (!this._dragging) return;
      const dx = event.clientX - this._lastPointerX;
      this._lastPointerX = event.clientX;
      this.pivot.rotation.y += dx * 0.012;
    });

    const endDrag = () => {
      this._dragging = false;
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);
  }

  /**
   * Build or refresh the isolated preview clone from the live game character.
   *
   * @param {CharacterController} source
   */
  _mountClone(source) {
    // Keyed by class *and* body, so a new look on the same class re-clones.
    const sourceId = `${source.definition?.id ?? 'default'}|${source.definition?.model?.idle ?? ''}`;
    if (this.previewCharacter && this._cloneSourceId === sourceId) {
      this._resetPreviewState();
      this._applyEquippedWeapon();
      this._setLoading(false);
      return true;
    }

    this._disposeClone();

    const environment = this.getEnvironment();
    if (!environment) return false;

    this.previewCharacter = new CharacterController(environment, source.definition);
    this.previewCharacter.loadFromSource(source);
    this.previewCharacter.root.position.set(0, 0, 0);
    this.pivot.add(this.previewCharacter.root);
    this._cloneSourceId = sourceId;

    const weaponId = this._weaponId ?? platform.getActiveWeaponId();
    if (weaponId) this._applyEquippedWeapon(weaponId);

    this._resetPreviewState();
    this.setMode('walk');
    this._setLoading(false);
    this._resize();
    return true;
  }

  _resetPreviewState() {
    const character = this.previewCharacter;
    if (!character?.mixer) return;

    if (character._cast) {
      character.mixer.stopAllAction();
      character._cast = null;
    }
    character.resetToOrigin();
    character.setFacing(0);
    character._lunge = 0;
    character.tilt.quaternion.identity();
    character.tilt.position.set(0, 0, 0);

    if (character.idle) {
      character.idle.reset();
      character.idle.setEffectiveWeight(1);
      character.idle.play();
    }

    this._applyModeMotion();
    this._applyModeIntent();
  }

  _disposeClone() {
    if (!this.previewCharacter) return;
    this.pivot.remove(this.previewCharacter.root);
    this.previewCharacter.dispose();
    this.previewCharacter = null;
    this._cloneSourceId = null;
  }

  /** Pick the gait profile that matches the preview mode. */
  _applyModeMotion() {
    switch (this._mode) {
      case 'walk':
        platform.applyMotion('humanoid-walk');
        break;
      case 'run':
      case 'attack':
        platform.applyMotion('humanoid-sprint');
        break;
      default: {
        const motionId =
          this.previewCharacter?.definition?.motion ??
          platform.getActiveCharacter()?.motion ??
          'humanoid-sprint';
        platform.applyMotion(motionId);
        break;
      }
    }
  }

  _applyEquippedWeapon(weaponId = this._weaponId) {
    if (!weaponId || !this.previewCharacter) return;
    this.previewCharacter.equipWeapon(weaponId);
  }

  setCharacter(characterId) {
    this._characterId = characterId;
    const definition = platform.characters.get(characterId);

    if (this.isAttached) {
      const source = this.getCharacter();
      if (source?.model) {
        this._mountClone(source);
      } else if (this.previewCharacter && definition) {
        this.previewCharacter.definition = definition;
        if (definition.wandSide) this.previewCharacter.locomotion.wandSide = definition.wandSide;
      }
    }

    this._applyModeMotion();
    this._applyModeIntent();
    if (this._weaponId) this._applyEquippedWeapon(this._weaponId);
  }

  setWeapon(weaponId, options = {}) {
    this._weaponId = weaponId;
    this._applyEquippedWeapon(weaponId);
    if (!options.silent) this._castTimer = 0.4;
  }

  /** @param {PreviewMode} mode */
  setMode(mode) {
    if (!PREVIEW_MODES.some((m) => m.id === mode)) return;
    this._mode = mode;
    this._castTimer = 0.35;
    this._attackTimer = 0.6;
    this._attackLabel = null;
    this._updateModeButtons();
    this._applyModeMotion();
    this._applyModeIntent();
  }

  _applyModeIntent() {
    if (!this.previewCharacter) return;
    const loco = this.previewCharacter.locomotion;
    loco.toggleSit(false);

    switch (this._mode) {
      case 'idle':
        loco.setIntent(0, 0);
        break;
      case 'walk':
        loco.setIntent(0, 1, false, true);
        break;
      case 'run':
        loco.setIntent(0, 1, true);
        break;
      case 'cast':
      case 'attack':
        loco.setIntent(0, 0);
        break;
      default:
        break;
    }
  }

  /** Apply preview mode intent before the simulation tick. */
  prepareFrame(dt) {
    this._applyModeIntent();
    this.tickAction(dt);
  }

  tickAction(dt) {
    if (!this.previewCharacter) return;
    const loco = this.previewCharacter.locomotion;
    const clips = this.previewCharacter.definition?.castClips ?? ['cast1', 'cast2', 'cast3'];
    const hintEl = this.root.querySelector('.char-preview__hint');

    if (this._mode === 'cast') {
      loco.setIntent(0, 0);
      if (hintEl) hintEl.textContent = 'Drag to rotate · spell preview';
      this._castTimer -= dt;
      if (!this.previewCharacter.isCasting && this._castTimer <= 0) {
        const clip = clips[Math.floor(Math.random() * clips.length)];
        this.previewCharacter.playCast(clip);
        this.previewCharacter.castLunge();
        this._castTimer = 2.4;
      }
      return;
    }

    if (this._mode === 'attack') {
      loco.setIntent(0, 0);
      this._attackTimer -= dt;
      if (!this.previewCharacter.isCasting && this._attackTimer <= 0) {
        const attack = platform.pickRandomAttack(this._characterId);
        const clip = attack?.castAnim ?? clips[Math.floor(Math.random() * clips.length)];
        this.previewCharacter.playCast(clip);
        this.previewCharacter.castLunge();
        this._attackLabel = attack?.label ?? 'Attack';
        if (hintEl) {
          hintEl.textContent = `Attack preview — ${this._attackLabel}`;
        }
        this._attackTimer = 1.2 + Math.random() * 0.9;
      } else if (hintEl && this._attackLabel) {
        hintEl.textContent = `Attack preview — ${this._attackLabel}`;
      }
    } else if (hintEl) {
      hintEl.textContent = 'Drag to rotate · pick a motion below';
    }
  }

  lockToPedestal() {
    if (!this.previewCharacter) return;
    this.previewCharacter.root.position.set(0, 0, 0);
  }

  _frame = (time) => {
    this._raf = requestAnimationFrame(this._frame);

    if (this._visible && this.previewCharacter) {
      const now = time * 0.001;
      const dt = this._lastTime ? Math.min(0.05, now - this._lastTime) : 0;
      this._lastTime = now;

      this.prepareFrame(dt);
      this.previewCharacter.update(dt);
      this.lockToPedestal();
    }

    this.renderer.render(this.scene, this.camera);
  };

  /**
   * @param {() => CharacterController|null} [getCharacter]
   */
  async show(getCharacter = this.getCharacter) {
    this._visible = true;
    this.root.classList.add('is-active');
    this._setLoading(true);
    this._lastTime = 0;

    if (!this._characterId) {
      this._characterId = platform.getActiveCharacter()?.id ?? 'caster';
    }
    if (!this._weaponId) {
      this._weaponId = platform.getActiveWeaponId() ?? 'arcane-wand';
    }

    let mounted = false;
    for (let i = 0; i < 120; i++) {
      const source = getCharacter();
      if (source?.model && this._mountClone(source)) {
        mounted = true;
        break;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    if (!mounted) {
      this._setLoading(true, 'Character not ready — try refreshing');
      return;
    }

    if (!this._raf) this._raf = requestAnimationFrame(this._frame);
  }

  hide() {
    this._visible = false;
    this.root.classList.remove('is-active');
    this._disposeClone();
    this._setLoading(false);
    this.pivot.rotation.y = 0;

    const motionId = platform.getActiveCharacter()?.motion ?? 'humanoid-sprint';
    platform.applyMotion(motionId);

    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
    this._lastTime = 0;
  }

  _resize() {
    const w = Math.max(1, this.root.clientWidth);
    const h = Math.max(1, this.root.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose() {
    this.hide();
    this._resizeObserver.disconnect();
    this.renderer.dispose();
    this.root.remove();
  }
}
