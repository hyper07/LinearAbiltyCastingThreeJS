/**
 * Controls: keyboard and mouse (aim at the pointer), a gamepad (left stick
 * moves, right stick aims), and on touch screens a stick and buttons. Each
 * frame `read()` gives move, aim and this frame's presses.
 */

import { CONTROLS } from './controls.js';
import { codesFor } from '../shared/helpPanel.js';

const PAD_DEAD = 0.22;
/** The keys, from the one table (controls.js). */
const C = Object.fromEntries(['attack', 'ranged', 'dash', 'summon', 'potion', 'interact', 'pause', 'map', 'help'].map((id) => [id, codesFor(CONTROLS, id)]));
const any = (set, codes) => codes.some((c) => set.has(c));

export class Input {
  constructor(root, { touch = false } = {}) {
    this.root = root;
    this.keys = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, moved: false };
    this.buttons = new Set();
    this.padPrev = [];
    this.usingPad = false;
    this.touch = touch;
    this.stick = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
    this.enabled = true;
    this._down = (e) => {
      if (!this.enabled) return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      this.usingPad = false;
    };
    this._up = (e) => {
      this.keys.delete(e.code);
      this.released.add(e.code);
    };
    this._move = (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.moved = true;
      this.usingPad = false;
    };
    this._mdown = (e) => {
      if (!this.enabled || e.pointerType === 'touch') return;
      const k = `Mouse${e.button}`;
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    };
    this._mup = (e) => {
      if (e.pointerType === 'touch') return;
      const k = `Mouse${e.button}`;
      this.keys.delete(k);
      this.released.add(k);
    };
    this._ctx = (e) => e.preventDefault();
    this._blur = () => this.keys.clear();
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    window.addEventListener('pointermove', this._move);
    root.addEventListener('pointerdown', this._mdown);
    window.addEventListener('pointerup', this._mup);
    root.addEventListener('contextmenu', this._ctx);
    window.addEventListener('blur', this._blur);
  }

  /** Touch buttons and stick (built by the HUD) feed in here. */
  touchPress(name, down) {
    const k = `Touch${name}`;
    if (down) {
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    } else {
      this.keys.delete(k);
      this.released.add(k);
    }
  }

  /**
   * This frame's controls. `heroScreen` is the hero's position on screen
   * (CSS px), for aiming at the pointer.
   */
  read(heroScreen) {
    const k = this.keys;
    const p = this.pressed;
    let mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let my = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let aim = null;
    if (this.mouse.moved && heroScreen && !this.touch) aim = Math.atan2(-(this.mouse.y - heroScreen[1]), this.mouse.x - heroScreen[0]);
    const out = {
      attack: p.has('Mouse0') || any(p, C.attack) || p.has('TouchAttack'),
      attackHeld: k.has('Mouse0') || any(k, C.attack) || k.has('TouchAttack'),
      ranged: p.has('Mouse2') || any(p, C.ranged) || p.has('TouchRanged'),
      dash: any(p, C.dash) || p.has('TouchDash'),
      summon: any(p, C.summon) || p.has('TouchSummon'),
      potion: any(p, C.potion) || p.has('TouchPotion'),
      interact: any(p, C.interact) || p.has('TouchUse'),
      pause: any(p, C.pause),
      map: any(p, C.map),
      help: any(p, C.help),
      any: p.size > 0
    };
    // Gamepad.
    const pads = navigator.getGamepads?.() ?? [];
    for (const pad of pads) {
      if (!pad) continue;
      const ax = (i) => (Math.abs(pad.axes[i] ?? 0) > PAD_DEAD ? pad.axes[i] : 0);
      const b = (i) => pad.buttons[i]?.pressed ?? false;
      const was = (i) => this.padPrev[i] ?? false;
      const press = (i) => b(i) && !was(i);
      const lx = ax(0);
      const ly = -ax(1);
      const rx = ax(2);
      const ry = -ax(3);
      if (lx || ly || rx || ry || pad.buttons.some((bt) => bt.pressed)) this.usingPad = true;
      if (lx || ly) {
        mx = lx;
        my = ly;
      }
      if (rx || ry) aim = Math.atan2(ry, rx);
      else if ((lx || ly) && this.usingPad) aim = Math.atan2(ly, lx);
      out.attack ||= press(2);
      out.attackHeld ||= b(2);
      out.ranged ||= press(7) || press(5);
      out.dash ||= press(0);
      out.summon ||= press(3);
      out.potion ||= press(4);
      out.interact ||= press(1);
      out.pause ||= press(9);
      out.map ||= press(8);
      out.any ||= pad.buttons.some((bt, i) => bt.pressed && !was(i));
      this.padPrev = pad.buttons.map((bt) => bt.pressed);
      break;
    }
    // Touch stick.
    if (this.stick.id !== null) {
      mx = this.stick.x;
      my = this.stick.y;
      if (Math.hypot(mx, my) > 0.2) aim = Math.atan2(my, mx);
    }
    out.mx = mx;
    out.my = my;
    out.aim = aim;
    this.pressed.clear();
    this.released.clear();
    return out;
  }

  dispose() {
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
    window.removeEventListener('pointermove', this._move);
    this.root.removeEventListener('pointerdown', this._mdown);
    window.removeEventListener('pointerup', this._mup);
    this.root.removeEventListener('contextmenu', this._ctx);
    window.removeEventListener('blur', this._blur);
  }
}
