import { Vector2 } from 'three';
import { EventEmitter } from '../utils/EventEmitter.js';

/** Spell key per key code: the five slots the class's skill tree fills. */
const SLOT_KEYS = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
  Numpad4: 3,
  Numpad5: 4
};

/** Movement, as `[x, z]` contributions in the camera's frame. */
const MOVE_KEYS = {
  KeyW: [0, 1],
  KeyS: [0, -1],
  KeyA: [-1, 0],
  KeyD: [1, 0]
};

/**
 * Camera, as `[yaw, pitch]` contributions.
 *
 * The arrows used to duplicate WASD, which wasted the only other set of keys a
 * hand already rests on. Orbiting was right-drag only — fine for a sandbox you
 * look at, not for a game you move through, where you want to swing the view
 * *while* running without letting go of the mouse.
 *
 * Q and E are the same yaw, for the hand that keeps its fingers on WASD.
 */
const CAMERA_KEYS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  KeyQ: [-1, 0],
  KeyE: [1, 0]
};

/** Interactive UI that should steal clicks from the arena. */
const BLOCKING_UI =
  '.main-menu.is-visible, .weapon-panel.is-visible, .hud__abilities, .game-menu-btn, .lil-gui, input, textarea, button';

/**
 * Normalises pointer + keyboard input into a small event vocabulary.
 *
 * Events:
 *   `pointer:move` (ndc)          — every move, armed or not
 *   `pointer:attack` (ndc)        — left click on the viewport (direct attacks)
 *   `pointer:cast` (ndc)          — right click on the viewport (spells)
 *   `action` (name, slot)         — everything else, already named by intent.
 *                                   `ability` carries the 0-based slot index,
 *                                   which App maps through the profile's slots.
 *
 * Keys pressed while a text field has focus are dropped before any of this, so
 * typing in a search box never casts.
 *
 * Pointer events that begin on top of DOM UI (the editor, the HUD) are ignored
 * so dragging a slider never fires the ability.
 */
export class InputManager extends EventEmitter {
  constructor(domElement) {
    super();
    this.dom = domElement;
    this.pointer = new Vector2(); // NDC
    this.keys = new Set();
    this.enabled = true;
    /** Left button held down on the arena (automatic weapons keep firing). */
    this.attackHeld = false;

    this._bind();
  }

  _bind() {
    // Capture on window so clicks reach us even when a faded menu overlay sits
    // above the canvas, and so pointerup always pairs with pointerdown.
    window.addEventListener('pointerdown', this._onPointerDown, true);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('contextmenu', this._onContextMenu);
    window.addEventListener('blur', this._onBlur);
  }

  /**
   * True when the click should hit the arena.
   *
   * Walks the hit stack top-down. Decorative HUD layers use `pointer-events:
   * none` on their shell but many children default to `auto`, so they appear
   * in the stack without actually eating clicks — skip them unless they are
   * on the explicit block list (ability bar, menu button, …).
   */
  _isViewportPoint(clientX, clientY) {
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      if (el === this.dom) return true;

      const style = window.getComputedStyle(el);
      if (style.pointerEvents === 'none') continue;

      if (el.closest('.main-menu:not(.is-visible), .weapon-panel:not(.is-visible)')) continue;

      if (el.closest(BLOCKING_UI)) return false;

      if (el.closest('#hud')) continue;

      if (el === document.body || el === document.documentElement) continue;

      return false;
    }
    return false;
  }

  _firePointer(button, clientX, clientY) {
    if (!this._isViewportPoint(clientX, clientY)) return;
    this.pointer.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    if (button === 0) {
      this.attackHeld = true;
      this.emit('pointer:attack', this.pointer);
    }
    else if (button === 2) this.emit('pointer:cast', this.pointer);
  }

  _onPointerUp = (event) => {
    if (event.button === 0) this.attackHeld = false;
  };

  _onBlur = () => {
    this.attackHeld = false;
    this.releaseAll();
  };

  _onContextMenu = (event) => {
    // Keep native menu on search boxes; block it everywhere else so right-click
    // can cast without the browser menu stealing the gesture.
    if (event.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
    event.preventDefault();
  };

  _updatePointer(event) {
    this.pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
  }

  _onPointerDown = (event) => {
    if (!this.enabled) return;
    if (event.button !== 0 && event.button !== 2) return;

    if (event.button === 2) event.preventDefault();

    this._updatePointer(event);
    this._firePointer(event.button, event.clientX, event.clientY);
  };

  _onPointerMove = (event) => {
    this._updatePointer(event);
    this.emit('pointer:move', this.pointer);
  };

  _onKeyDown = (event) => {
    if (event.repeat) return;
    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

    this.keys.add(event.code);

    // Ability slots live on the number row — the letters they used to sit on
    // are movement now. Both the number row and the keypad, because a keypad
    // user should not have to reach.
    const slot = SLOT_KEYS[event.code];
    if (slot !== undefined) {
      this.emit('action', 'ability', slot);
      return;
    }

    switch (event.code) {
      /* --- getting around --- */
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        // Held-key camera control; the scroll they would otherwise do is not
        // wanted, and the actual steering is polled in `readCamera`.
        event.preventDefault();
        break;

      case 'Space':
        // The page scrolls on space by default, and the viewport is the page.
        event.preventDefault();
        this.emit('action', 'jump');
        break;
      case 'KeyC':
        this.emit('action', 'sit');
        break;

      case 'Escape':
        this.emit('action', 'cancel');
        break;
      case 'KeyH':
        this.emit('action', 'toggleHelp');
        break;
      case 'KeyG':
        this.emit('action', 'toggleEditor');
        break;
      case 'Backspace':
        this.emit('action', 'clear');
        break;
      case 'KeyP':
        this.emit('action', 'togglePause');
        break;

      /* --- the run --- */
      case 'KeyN':
        this.emit('action', 'nextWave');
        break;
      case 'KeyM':
        this.emit('action', 'summon');
        break;
      case 'KeyB':
        this.emit('action', 'toggleRunHud');
        break;
      case 'KeyI':
        event.preventDefault(); // the armory focuses its search box: keep the "i" out of it
        this.emit('action', 'toggleWeapons');
        break;

      /* --- items and NPCs --- */
      case 'KeyF':
        this.emit('action', 'interact');
        break;
      case 'KeyR':
        this.emit('action', 'potionHealth');
        break;
      case 'KeyZ':
        this.emit('action', 'potionFocus');
        break;
      case 'KeyK':
        this.emit('action', 'toggleSkills');
        break;
      case 'KeyX':
        this.emit('action', 'reload');
        break;
      case 'Tab':
        // Tab would move focus around the page; here it opens the bag.
        event.preventDefault();
        this.emit('action', 'toggleInventory');
        break;
      case 'Enter':
      case 'NumpadEnter':
        this.emit('action', 'chat');
        break;
      default:
        break;
    }
  };

  _onKeyUp = (event) => {
    this.keys.delete(event.code);
  };

  /**
   * The movement stick, as it is *right now*.
   *
   * Polled once a frame rather than pushed on key events, because movement is a
   * continuous quantity and key events are discrete: a held key produces one
   * `keydown` and then nothing, and the frame loop needs an answer on every one
   * of the frames in between.
   *
   * The result is in the **character's** frame — `x` is the body's right,
   * `z` is forward along its facing — and the caller rotates it into the world.
   *
   * @param {{x:number, z:number, sprint:boolean, active:boolean}} out
   */
  readMovement(out) {
    let x = 0;
    let z = 0;
    for (const code of this.keys) {
      const axis = MOVE_KEYS[code];
      if (axis) {
        x += axis[0];
        z += axis[1];
      }
    }

    // Diagonals must not be faster than the cardinals.
    const length = Math.hypot(x, z);
    if (length > 1) {
      x /= length;
      z /= length;
    }

    out.x = x;
    out.z = z;
    out.sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    // Alt drops to a deliberate walk. Chosen over Ctrl because Ctrl-key is a
    // browser shortcut for half the alphabet and Alt is not.
    out.walk = this.keys.has('AltLeft') || this.keys.has('AltRight');
    out.active = length > 0;
    return out;
  }

  /**
   * The camera stick: `yaw` is screen-left/right, `pitch` is up/down.
   *
   * Polled, for the same reason movement is — the view has to keep swinging for
   * as long as the key is down.
   *
   * @param {{yaw:number, pitch:number, active:boolean}} out
   */
  readCamera(out) {
    let yaw = 0;
    let pitch = 0;
    for (const code of this.keys) {
      const axis = CAMERA_KEYS[code];
      if (axis) {
        yaw += axis[0];
        pitch += axis[1];
      }
    }
    out.yaw = Math.max(-1, Math.min(1, yaw));
    out.pitch = Math.max(-1, Math.min(1, pitch));
    out.active = yaw !== 0 || pitch !== 0;
    return out;
  }

  /**
   * Drop every held key.
   *
   * A window that loses focus never receives the matching `keyup`, so without
   * this the character keeps walking while the player is in another tab.
   */
  releaseAll() {
    this.keys.clear();
  }

  dispose() {
    window.removeEventListener('pointerdown', this._onPointerDown, true);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('contextmenu', this._onContextMenu);
    window.removeEventListener('blur', this._onBlur);
    this.clear();
  }
}
