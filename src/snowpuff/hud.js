/**
 * Snowpuff's screens, in plain DOM over the 3D view: the loading card, the
 * menus (title, choose a rider, choose a mountain, race with friends,
 * pause, results, credits) and the race HUD — big position top-left, the
 * course strip with every racer's face across the top (it doubles as the
 * map), a corner course minimap, the timer top-right, two big item
 * slots bottom-centre with their keys (1, 2), the speed dial bottom-right, pop
 * text in the centre, speed lines at the edges — plus the touch controls.
 */
import { SPECIES, SELECTABLE, faceSvg } from './riders.js';
import { GOGGLES, goggleChip, randomGoggle } from './goggleList.js';
import { BOARDS, boardChip, randomBoard, boardInfo } from './boardList.js';
import { MOUNTAINS } from './mountains.js';
import { sectionAt } from './course.js';
import { worldMap } from './worldMap.js';
import { ordinal } from './race.js';
import { hintItems } from '../shared/helpPanel.js';
import { CONTROLS } from './controls.js';
import { PACKS, OWN } from './credits.js';
import { musicMenu } from '../shared/gameMusic.js';

export const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const fmtTime = (t) => {
  if (!Number.isFinite(t)) return '—';
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
};
const MODE_NAMES = { quick: 'Quick', long: 'Long trail', laps: '3 Laps' };
const diffStars = (n) => `<span aria-label="difficulty ${n} of 3">${'❄'.repeat(n)}<i>${'❄'.repeat(3 - n)}</i></span>`;
const SNOWBALL = '<svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="15" fill="#fff"/><circle cx="15" cy="15" r="5" fill="#fff" opacity=".9"/><path d="M8 24 Q20 32 32 24" stroke="#c9d8f2" stroke-width="3" fill="none"/></svg>';
const SHIELD = '<svg viewBox="0 0 40 40"><path d="M20 4 L34 10 V20 C34 29 27 34 20 37 C13 34 6 29 6 20 V10Z" fill="#fff" stroke="#3ab8e8" stroke-width="3"/><path d="M20 12 L22.5 18 L29 18.5 L24 22.5 L25.6 29 L20 25.5 L14.4 29 L16 22.5 L11 18.5 L17.5 18Z" fill="#7fe8ff"/></svg>';
const GIANT = '<svg viewBox="0 0 40 40"><circle cx="20" cy="22" r="16" fill="#fff" stroke="#9db8e8" stroke-width="2"/><path d="M8 26 Q20 34 32 24 M10 16 Q18 12 26 14" stroke="#c9d8f2" stroke-width="3" fill="none"/><path d="M30 6 l2 4 4 1 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -1z" fill="#ffd23f"/></svg>';
const BOOST = '<svg viewBox="0 0 40 40"><path d="M6 26 Q20 30 34 24 L36 28 Q20 36 4 30Z" fill="#ff5a5f"/><path d="M10 25 L14 14 Q20 8 26 14 L30 23Z" fill="#ff8a3d"/><path d="M4 30 L-2 26 M4 32 L-3 33" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="17" r="3" fill="#fff"/></svg>';
const ICE = '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="26" rx="16" ry="8" fill="#bfe9ff" stroke="#5ec8ff" stroke-width="2"/><path d="M12 25 L16 22 L20 27 L25 23 L28 26" stroke="#fff" stroke-width="2" fill="none"/><path d="M20 4 v12 M14 7 l12 6 M26 7 l-12 6" stroke="#5ec8ff" stroke-width="2.5" stroke-linecap="round"/></svg>';
const GIFT = '<svg viewBox="0 0 40 40"><rect x="7" y="16" width="26" height="20" rx="4" fill="#ff4b8b"/><rect x="5" y="12" width="30" height="7" rx="3" fill="#ff6fa8"/><rect x="18" y="12" width="5" height="24" fill="#ffe27a"/><path d="M20 12 Q12 3 9 9 Q10 13 20 12 Q28 3 31 9 Q30 13 20 12Z" fill="#ffe27a"/></svg>';
const ITEM_ICON = { snowballs: SNOWBALL, giant: GIANT, shield: SHIELD, boost: BOOST, ice: ICE, gift: GIFT, pile: SNOWBALL };
const ITEM_LABEL = { snowballs: 'Snowballs', giant: 'Giant snowball', shield: 'Snow shield', boost: 'Rocket sled', ice: 'Ice patch' };
const FLAG = '<svg viewBox="0 0 34 40"><path d="M4 2 V38" stroke="#2a2f4a" stroke-width="3" stroke-linecap="round"/><path d="M5 3 H31 V19 H5Z" fill="#fff" stroke="#2a2f4a" stroke-width="2"/><path d="M5 3h6.5v5.3H5zM18 3h6.5v5.3H18zM11.5 8.3H18v5.3h-6.5zM24.5 8.3H31v5.3h-6.5zM5 13.6h6.5V19H5zM18 13.6h6.5V19H18z" fill="#2a2f4a"/></svg>';

/* ---------------------------------------------------------------- loading */

export class Loading {
  constructor(root) {
    this.el = el('div', 'sp-load', `<div class="sp-load__box"><div class="sp-logo">Snowpuff<small>PEAKS</small></div><div class="sp-load__bar"><i></i></div><div class="sp-load__label">Fluffing the snow…</div></div>`);
    root.append(this.el);
  }

  set(label, k) {
    this.el.querySelector('i').style.width = `${Math.round(k * 100)}%`;
    this.el.querySelector('.sp-load__label').textContent = label;
  }

  show(label = 'Building the mountain…') {
    this.el.style.display = '';
    this.el.style.opacity = '1';
    this.set(label, 0);
  }

  hide() {
    this.el.style.opacity = '0';
    setTimeout(() => (this.el.style.display = 'none'), 600);
  }
}

/* ---------------------------------------------------------------- menus */

export class Menus {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.el = el('div', 'sp-menu');
    root.append(this.el);
  }

  clear() {
    for (const off of this._offs ?? []) off();
    this._offs = [];
    this.el.innerHTML = '';
  }

  click(sel, fn) {
    const b = this.el.querySelector(sel);
    b?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.sound.wake();
      this.game.sound.click();
      fn(e);
    });
    return b;
  }

  title({ onRace, onFriends, onHelp, onCredits, onLeave, quality, onQuality, soundOn, onSound }) {
    this.clear();
    this.el.append(el('div', 'sp-title', '<div class="sp-logo">Snowpuff<small>PEAKS</small></div>'));
    const col = el('div', 'sp-col sp-home', `
      <button class="sp-btn sp-btn--go" data-race>Race!</button>
      <button class="sp-btn sp-btn--blue" data-friends>Race with friends</button>
      <div class="sp-row" style="justify-content:center;margin:0">
        <button class="sp-btn sp-btn--small" data-open-help>How to play</button>
        <button class="sp-btn sp-btn--small" data-credits>Credits</button>
      </div>`);
    this.el.append(col);
    const corner = el('div', 'sp-corner', `<button class="sp-btn sp-btn--small sp-btn--ghost" data-q>Quality: ${esc(quality)}</button><button class="sp-btn sp-btn--small sp-btn--ghost" data-s>Sound: ${soundOn ? 'on' : 'off'}</button><button class="sp-btn sp-btn--small sp-btn--ghost" data-leave>Leave</button>`);
    corner.style.cssText = 'right:18px;top:16px';
    this.el.append(corner);
    this.click('[data-race]', onRace);
    this.click('[data-friends]', onFriends);
    this.click('[data-open-help]', onHelp);
    this.click('[data-credits]', onCredits);
    this.click('[data-leave]', onLeave);
    this.click('[data-q]', (e) => (e.currentTarget.textContent = `Quality: ${onQuality()}`));
    this.click('[data-s]', (e) => (e.currentTarget.textContent = `Sound: ${onSound() ? 'on' : 'off'}`));
    setTimeout(() => this.el.querySelector('[data-race]')?.focus({ preventScroll: true }), 50);
  }

  riders({ picked, onPick, onNext, onBack, name = '', onName, onDice, goggles = 'classic', onGoggles, board = 'classic', onBoard }) {
    this.clear();
    this.el.append(el('div', 'sp-heading', 'Choose your rider'));
    const nameBox = el('div', 'sp-card sp-col sp-name', `<label for="sp-nick">Your name</label><div class="sp-row" style="margin:0;flex-wrap:nowrap"><input id="sp-nick" class="sp-input sp-input--name" maxlength="12" autocomplete="off" spellcheck="false" data-name value="${esc(name)}" placeholder="${esc(SPECIES[picked].name)}"><button class="sp-btn sp-btn--small" data-dice title="A random name" aria-label="A random name">🎲</button></div>`);
    this.el.append(nameBox);
    const input = nameBox.querySelector('[data-name]');
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') input.blur();
    });
    input.addEventListener('change', () => (input.value = onName?.(input.value) ?? input.value));
    input.addEventListener('blur', () => (input.value = onName?.(input.value) ?? input.value));
    nameBox.querySelector('[data-dice]').addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.sound.click();
      input.value = onDice?.() ?? input.value;
    });
    // goggles and boards: tabs, each a strip of round chips and a 🎲; a pick goes on at once
    const kinds = [
      { key: 'goggles', label: 'Goggles', list: GOGGLES, chip: goggleChip, rand: randomGoggle, now: goggles, pick: onGoggles },
      { key: 'board', label: 'Board', list: BOARDS, chip: boardChip, rand: randomBoard, now: board, pick: onBoard }
    ];
    const gBox = el('div', 'sp-goggles', `<div class="sp-goggles__head"><span class="sp-tabs" role="tablist">${kinds.map((k, i) => `<button class="sp-tab" role="tab" data-tab="${k.key}" aria-selected="${i === 0}">${k.label}</button>`).join('')}</span><b data-gname></b></div>${kinds.map((k, i) => `<div class="sp-row sp-goggles__row" data-panel="${k.key}"${i ? ' hidden' : ''}><button class="sp-btn sp-btn--small" data-${k.key}-dice title="Random ${k.label.toLowerCase()}" aria-label="Random ${k.label.toLowerCase()}">🎲</button><div class="sp-goggles__strip" role="listbox" aria-label="${k.label}"></div></div>`).join('')}`);
    nameBox.append(gBox);
    const nameOf = (k, id) => k.list.find((g) => g.id === id)?.name ?? k.list[0].name;
    let tab = kinds[0];
    const showName = () => (gBox.querySelector('[data-gname]').textContent = nameOf(tab, tab.now));
    for (const k of kinds) {
      const strip = gBox.querySelector(`[data-panel="${k.key}"] .sp-goggles__strip`);
      k.strip = strip;
      const choose = (id, scroll = true) => {
        k.now = k.pick?.(id) ?? id;
        showName();
        for (const c of strip.children) {
          const on = c.dataset[k.key] === k.now;
          c.setAttribute('aria-selected', String(on));
          if (on && scroll) c.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
      };
      for (const g of k.list) {
        const c = el('button', 'sp-gchip', k.chip(g.id, 40));
        c.dataset[k.key] = g.id;
        c.title = g.name;
        c.setAttribute('role', 'option');
        c.setAttribute('aria-label', g.name);
        c.setAttribute('aria-selected', String(g.id === k.now));
        c.addEventListener('click', (e) => {
          e.stopPropagation();
          this.game.sound.wake();
          choose(g.id, false);
        });
        strip.append(c);
      }
      strip.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          strip.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      }, { passive: false });
      gBox.querySelector(`[data-${k.key}-dice]`).addEventListener('click', (e) => {
        e.stopPropagation();
        this.game.sound.wake();
        let id = k.rand();
        if (id === k.now) id = k.list[(k.list.findIndex((g) => g.id === id) + 1) % k.list.length].id;
        choose(id);
      });
    }
    for (const t of gBox.querySelectorAll('[data-tab]')) {
      t.addEventListener('click', (e) => {
        e.stopPropagation();
        this.game.sound.click();
        tab = kinds.find((k) => k.key === t.dataset.tab);
        for (const x of gBox.querySelectorAll('[data-tab]')) x.setAttribute('aria-selected', String(x === t));
        for (const k of kinds) gBox.querySelector(`[data-panel="${k.key}"]`).hidden = k !== tab;
        showName();
        tab.strip.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
      });
    }
    showName();
    setTimeout(() => kinds[0].strip.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' }), 0);
    const row = el('div', 'sp-col sp-riders');
    for (const id of SELECTABLE) {
      const sp = SPECIES[id];
      const b = el('button', 'sp-rider', `${faceSvg(id, 72)}${esc(sp.name)}<small>${esc(sp.animal)}</small>`);
      b.dataset.rider = id;
      b.setAttribute('aria-pressed', String(id === picked));
      b.addEventListener('click', () => {
        this.game.sound.wake();
        this.game.sound.click();
        onPick(id);
        for (const x of row.children) x.setAttribute('aria-pressed', String(x.dataset.rider === id));
        about.innerHTML = aboutHtml(id);
        input.placeholder = SPECIES[id].name;
      });
      row.append(b);
    }
    this.el.append(row);
    const about = el('div', 'sp-card sp-col sp-about', aboutHtml(picked));
    this.el.append(about);
    this.el.append(el('div', 'sp-col sp-nav', '<button class="sp-btn sp-btn--go" data-next>Next ›</button>'));
    this.el.append(el('div', 'sp-col sp-back', '<button class="sp-btn sp-btn--small" data-back>‹ Back</button>'));
    this.click('[data-next]', onNext);
    this.click('[data-back]', onBack);
    setTimeout(() => this.el.querySelector('[data-next]')?.focus({ preventScroll: true }), 50);
  }

  mountains({ picked, best, onPick, onGo, onBack, goLabel = 'Race! ›', board = 'classic', mode = 'quick', onMode = null }) {
    this.clear();
    this.el.append(el('div', 'sp-heading sp-heading--map', 'Choose a mountain'));
    const map = worldMap(this.el, {
      picked, best, fmt: fmtTime, ordinal,
      footer: () => `${onMode ? `<div class="sp-modes" role="radiogroup" aria-label="Race length">${[['quick', 'Quick', '1–1½ min'], ['long', 'Long trail', '2½–3 min'], ['laps', '3 Laps', 'with a chairlift']].map(([k, n, d]) => `<button class="sp-mode" role="radio" data-mode="${k}" aria-checked="${k === mode}"><b>${n}</b><small>${d}</small></button>`).join('')}</div>` : ''}<div class="sp-world__ride">${boardChip(board, 30)}<span>Riding the <b>${esc(boardInfo(board).name)}</b> board</span></div>`,
      onPick: (id) => {
        this.game.sound.wake();
        this.game.sound.click();
        onPick(id);
      },
      onGo
    });
    // race length: Quick, Long trail, 3 Laps (remembered; online the host picks)
    const modeClick = (e) => {
      const b = e.target.closest?.('[data-mode]');
      if (!b || !onMode) return;
      e.stopPropagation();
      this.game.sound.click();
      mode = onMode(b.dataset.mode) ?? b.dataset.mode;
      for (const x of this.el.querySelectorAll('[data-mode]')) x.setAttribute('aria-checked', String(x.dataset.mode === mode));
    };
    this.el.addEventListener('click', modeClick);
    (this._offs ??= []).push(() => this.el.removeEventListener('click', modeClick));
    this._offs.push(() => map.dispose());
    this.turnControls({ step: (dir) => map.step(dir) });
    this.el.querySelector('.sp-turn')?.classList.add('sp-turn--side');
    this.el.append(el('div', 'sp-col sp-nav', `<button class="sp-btn sp-btn--go" data-go>${esc(goLabel)}</button>`));
    this.el.append(el('div', 'sp-col sp-back', '<button class="sp-btn sp-btn--small" data-back>‹ Back</button>'));
    this.el.querySelector('.sp-back').style.cssText = 'left:2%;top:14px;bottom:auto';
    this.click('[data-go]', onGo);
    this.click('[data-back]', onBack);
    setTimeout(() => this.el.querySelector('[data-go]')?.focus({ preventScroll: true }), 50);
  }

  /**
   * Looking round the mountains: ◀ ▶ either side (or ← →) step to the previous or next one;
   * dragging on the chosen one with a mouse or a finger turns it round (it keeps a little spin
   * when you let go), and so do Q / E.
   */
  turnControls({ step }) {
    const stage = this.game.stage;
    if (!stage?.turnMountain) return;
    const area = el('div', 'sp-turn', `<div class="sp-turn__drag" data-turn-drag aria-hidden="true"></div>
      <button class="sp-turn__btn sp-turn__btn--l" data-step="-1" aria-label="Previous mountain">◀</button>
      <button class="sp-turn__btn sp-turn__btn--r" data-step="1" aria-label="Next mountain">▶</button>
      <div class="sp-turn__hint">◀ ▶ another mountain · drag or Q / E to turn it round</div>`);
    this.el.prepend(area); // under the cards and buttons
    for (const b of area.querySelectorAll('[data-step]')) {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.game.sound.wake();
        this.game.sound.click();
        step(Number(b.dataset.step));
      });
    }
    const drag = area.querySelector('[data-turn-drag]');
    let last = null;
    drag.addEventListener('pointerdown', (e) => {
      last = { x: e.clientX, t: performance.now() };
      drag.setPointerCapture(e.pointerId);
      drag.classList.add('is-dragging');
    });
    drag.addEventListener('pointermove', (e) => {
      if (!last) return;
      const now = performance.now();
      stage.dragMountain(e.clientX - last.x, (now - last.t) / 1000);
      last = { x: e.clientX, t: now };
    });
    const end = () => {
      last = null;
      drag.classList.remove('is-dragging');
      stage.releaseMountain();
    };
    drag.addEventListener('pointerup', end);
    drag.addEventListener('pointercancel', end);
    const keys = (e) => {
      if (e.target?.closest?.('input, textarea')) return;
      if (e.code === 'KeyQ') stage.turnMountain(-1);
      else if (e.code === 'KeyE') stage.turnMountain(1);
      else if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !e.repeat) {
        e.preventDefault();
        step(e.code === 'ArrowLeft' ? -1 : 1);
      }
    };
    window.addEventListener('keydown', keys);
    this._offs.push(() => window.removeEventListener('keydown', keys), () => stage.releaseMountain());
  }

  /** Race with friends: make a room or join one by its five-letter code. */
  lobby(state, { onCreate, onJoin, onStart, onBack, onMountain, onMode }) {
    this.clear();
    const s = state;
    const card = el('div', 'sp-card sp-lobby');
    if (!s.room) {
      card.innerHTML = `<h2>Race with friends</h2><p>One of you makes a room and shares its code; up to four can race. Empty places get computer riders.</p>
        <div class="sp-row"><button class="sp-btn sp-btn--go" data-create>Make a room</button></div>
        <div class="sp-row"><input class="sp-input" maxlength="5" placeholder="CODE" data-code aria-label="Room code"><button class="sp-btn sp-btn--blue" data-join>Join</button></div>
        ${s.error ? `<p class="sp-err">${esc(s.error)}</p>` : ''}${s.busy ? '<p class="sp-note">Connecting…</p>' : ''}
        <div class="sp-row"><button class="sp-btn sp-btn--small" data-back>‹ Back</button></div>`;
    } else {
      const members = s.members.map((m) => `<span class="sp-member">${faceSvg(m.species, 34)}${esc(m.name)}${m.id === s.host ? ' (host)' : ''}${m.id === s.you ? ' (you)' : ''}</span>`).join('');
      const mtn = MOUNTAINS.find((x) => x.id === s.mountain) ?? MOUNTAINS[0];
      card.innerHTML = `<h2>Your room</h2><p>Share this code:</p><div class="sp-code" data-room>${esc(s.room)}</div>
        <div class="sp-members">${members}</div>
        <p><b>Mountain:</b> ${esc(mtn.name)} ${'❄'.repeat(mtn.difficulty)} · <b>${MODE_NAMES[s.mode] ?? 'Quick'}</b></p>
        ${s.isHost ? `<div class="sp-row">${MOUNTAINS.map((m) => `<button class="sp-btn sp-btn--small${m.id === s.mountain ? ' sp-btn--blue' : ''}" data-m="${m.id}">${esc(m.name)}</button>`).join('')}</div>
        <div class="sp-row">${Object.entries(MODE_NAMES).map(([k, n]) => `<button class="sp-btn sp-btn--small${k === s.mode ? ' sp-btn--blue' : ''}" data-lmode="${k}">${n}</button>`).join('')}</div>
        <div class="sp-row"><button class="sp-btn sp-btn--go" data-start>Start the race</button></div>` : '<p class="sp-note">Waiting for the host to start…</p>'}
        ${s.error ? `<p class="sp-err">${esc(s.error)}</p>` : ''}
        <div class="sp-row"><button class="sp-btn sp-btn--small" data-back>‹ Leave the room</button></div>`;
    }
    this.el.append(card);
    const code = card.querySelector('[data-code]');
    this.click('[data-create]', onCreate);
    this.click('[data-join]', () => onJoin(code?.value ?? ''));
    code?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') onJoin(code.value);
    });
    this.click('[data-start]', onStart);
    this.click('[data-back]', onBack);
    for (const b of card.querySelectorAll('[data-m]')) b.addEventListener('click', () => onMountain(b.dataset.m));
    for (const b of card.querySelectorAll('[data-lmode]')) b.addEventListener('click', () => onMode?.(b.dataset.lmode));
  }

  pause({ onResume, onRestart, onHelp, onCredits, onLeave, onQuality, quality, onSound, soundOn, online }) {
    this.clear();
    this.el.append(el('div', 'sp-dim'));
    const card = el('div', 'sp-card sp-panel', `<h2>Paused</h2>${online ? '<p class="sp-note">Racing with friends: the race keeps going while this is open.</p>' : ''}
      <div class="sp-col" style="gap:10px">
        <button class="sp-btn sp-btn--go" data-resume>Keep riding</button>
        ${online ? '' : '<button class="sp-btn" data-restart>Start again</button>'}
        <button class="sp-btn" data-open-help>How to play (H)</button>
        <div class="sp-switches"><button class="sp-btn sp-btn--small" data-q>Quality: ${esc(quality)}</button><button class="sp-btn sp-btn--small" data-s>Sound: ${soundOn ? 'on' : 'off'}</button><button class="sp-btn sp-btn--small" data-credits>Credits</button></div>
        <div data-music></div>
        <button class="sp-btn sp-btn--small sp-btn--ghost" data-leave>Leave the race</button>
      </div>`);
    this.el.append(card);
    try {
      card.querySelector('[data-music]').append(musicMenu());
    } catch {
      /* no music menu */
    }
    this.click('[data-resume]', onResume);
    this.click('[data-restart]', onRestart);
    this.click('[data-open-help]', onHelp);
    this.click('[data-credits]', onCredits);
    this.click('[data-leave]', onLeave);
    this.click('[data-q]', (e) => (e.currentTarget.textContent = `Quality: ${onQuality()}`));
    this.click('[data-s]', (e) => (e.currentTarget.textContent = `Sound: ${onSound() ? 'on' : 'off'}`));
    setTimeout(() => card.querySelector('[data-resume]')?.focus({ preventScroll: true }), 30);
  }

  results({ rows, mountain, me, onRetry, onNext, onMenu, online, nextName }) {
    this.clear();
    const list = rows.map((r, i) => `<div class="sp-standing${r.me ? ' me' : ''}"><b>${ordinal(i + 1)}</b>${faceSvg(r.species, 42)}<i class="sp-standing__board" title="${esc(boardInfo(r.board).name)}">${boardChip(r.board, 30)}</i><span>${esc(r.name)}${r.human && !r.me ? ' <small>friend</small>' : ''}<small>${r.tricks} tricks · ${r.hits} hits · ${r.gifts} gifts</small></span><span class="sp-t">${fmtTime(r.time)}</span></div>`).join('');
    const card = el('div', 'sp-card sp-results', `<h2>${me.place === 1 ? 'You won!' : me.place <= 3 ? `${ordinal(me.place)} place!` : 'You made it!'}</h2>
      <p>${esc(mountain.name)} · ${fmtTime(me.time)} · ${me.tricks} tricks · ${me.hits} hits${me.newBest ? ' · <b style="color:#ff6fb4">New best!</b>' : ''}</p>
      <div>${list}</div>
      <div class="sp-row">${online ? '' : '<button class="sp-btn sp-btn--go" data-retry>Race again</button>'}${!online && nextName ? `<button class="sp-btn sp-btn--blue" data-next>${esc(nextName)} ›</button>` : ''}<button class="sp-btn sp-btn--small" data-menu>${online ? 'Back to the room' : 'Mountains'}</button></div>`);
    this.el.append(card);
    this.click('[data-retry]', onRetry);
    this.click('[data-next]', onNext);
    this.click('[data-menu]', onMenu);
    setTimeout(() => card.querySelector('[data-retry], [data-menu]')?.focus({ preventScroll: true }), 30);
  }

  credits(onBack) {
    const old = [...this.el.children];
    for (const c of old) c.style.display = 'none';
    const dim = el('div', 'sp-dim');
    const items = PACKS.map((p) => `<li><b><a href="${esc(p.site)}" target="_blank" rel="noopener">${esc(p.name)}</a></b> — ${esc(p.what)} · <a href="${esc(p.licenceUrl ?? p.site)}" target="_blank" rel="noopener">${esc(p.licence)}</a>${p.items ? `<br><small>${p.items.map((i) => `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a>`).join(', ')}</small>` : ''}${p.titles ? `<br><small>Tracks: ${p.titles.map(esc).join(', ')}</small>` : ''}</li>`).join('');
    const card = el('div', 'sp-card sp-panel sp-credits', `<h2>Credits</h2><ul style="padding-left:18px">${items}</ul><p>${esc(OWN)}</p><div class="sp-row"><button class="sp-btn" data-cback>Back</button></div>`);
    card.dataset.creditsPanel = '';
    this.el.append(dim, card);
    const back = () => {
      dim.remove();
      card.remove();
      for (const c of old) c.style.display = '';
      onBack?.();
    };
    card.querySelector('[data-cback]').addEventListener('click', back);
    card.querySelector('[data-cback]').focus({ preventScroll: true });
    this.closeCredits = back;
  }
}

function aboutHtml(id) {
  const sp = SPECIES[id];
  return `<h2>${esc(sp.name)}</h2><p>${esc(sp.blurb)}</p><span class="sp-tag" style="background:${sp.accent}">${esc(sp.accentName)}</span>`;
}

/* ---------------------------------------------------------------- the race HUD */

export class Hud {
  constructor(root, { touch = false } = {}) {
    this.root = root;
    this.touch = touch;
    this.el = el('div', 'sp-hud off');
    this.el.innerHTML = `
      <div class="sp-pos"><b>1</b><sup>st</sup><span>/4</span></div>
      <div class="sp-strip"><canvas class="sp-strip__path" width="1240" height="96" data-overlay aria-hidden="true"></canvas><div class="sp-strip__flag">${FLAG}</div><div class="sp-strip__faces"></div></div>
      <div class="sp-tr"><div class="sp-pill sp-time">0:00.0</div><canvas class="sp-mini" width="300" height="300" aria-label="Course map"></canvas></div>
      <div class="sp-ammo"></div>
      <div class="sp-speed"><svg viewBox="0 0 170 120">
        <path d="M18 104 A68 68 0 0 1 152 104" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="18" stroke-linecap="round"/>
        <path class="sp-arc" d="M18 104 A68 68 0 0 1 152 104" fill="none" stroke="url(#spg)" stroke-width="18" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/>
        <defs><linearGradient id="spg" x1="0" x2="1"><stop offset="0" stop-color="#3fd0b0"/><stop offset=".6" stop-color="#ffd23f"/><stop offset="1" stop-color="#ff6fb4"/></linearGradient></defs>
        <g class="sp-needle" transform="rotate(-90 85 104)"><path d="M85 104 L81 100 L85 44 L89 100Z" fill="#2a2f4a"/><circle cx="85" cy="104" r="9" fill="#fff" stroke="#2a2f4a" stroke-width="4"/></g>
      </svg><div class="sp-kmh">0<small> km/h</small></div></div>
      <div class="sp-pop"></div>
      <div class="sp-toast"></div>
      <div class="sp-hint">${hintItems(CONTROLS).map((h) => h.html).join(' · ')}</div>`;
    root.append(this.el);
    this.lines = el('canvas', 'sp-lines');
    this.lines.dataset.overlay = '';
    root.append(this.lines);
    this.lg = this.lines.getContext('2d');
    this.q = (s) => this.el.querySelector(s);
    this.posEl = this.q('.sp-pos');
    this.faces = this.q('.sp-strip__faces');
    this.path = this.q('.sp-strip__path');
    this.pg = this.path.getContext('2d');
    this.timeEl = this.q('.sp-time');
    // the lap (3 Laps) or the section you're in (Long trail), under the strip
    this.stageEl = el('div', 'sp-stage');
    this.q('.sp-strip').append(this.stageEl);
    // the chairlift between laps: the standings chair by chair, and how to skip
    this.liftEl = el('div', 'sp-lift');
    this.el.append(this.liftEl);

    this.mini = this.q('.sp-mini');
    this.mg = this.mini.getContext('2d');
    this.ammoEl = this.q('.sp-ammo');
    this.needle = this.q('.sp-needle');
    this.arc = this.q('.sp-arc');
    this.kmh = this.q('.sp-kmh');
    this.pop = this.q('.sp-pop');
    this.toastEl = this.q('.sp-toast');
    this.last = {};
    this.faceEls = new Map();
    this.onUse = null;
    this.ammoEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const b = e.target.closest('button');
      if (b) this.onUse?.(Number(b.dataset.slot) || 0);
    });
  }

  show(on) {
    this.el.classList.toggle('off', !on);
    this.lines.style.display = on ? '' : 'none';
  }

  /** Set up for a race: one face per racer on the strip; the course outline on the minimap. */
  start(racers, course, meSlot) {
    this.faces.innerHTML = '';
    this.faceEls.clear();
    for (const r of racers) {
      const f = el('div', `sp-face${r.slot === meSlot ? ' me' : ''}`, faceSvg(r.species, r.slot === meSlot ? 40 : 34));
      f.title = r.me ? `${r.name} (you)` : r.name;
      this.faces.append(f);
      this.faceEls.set(r.slot, f);
    }
    this.course = course;
    this.meSlot = meSlot;
    this.mini.title = racers.map((r) => (r.slot === meSlot ? `${r.name} (you)` : r.name)).join(' · ');
    // the strip draws the run's own bends: the centre line's distance from the start→finish chord
    const L = course.finish;
    const i1 = Math.min(course.n - 1, Math.round(L));
    const ax = course.px[0], az = course.pz[0], bx = course.px[i1], bz = course.pz[i1];
    const cl = Math.hypot(bx - ax, bz - az) || 1;
    const nx = -(bz - az) / cl, nz = (bx - ax) / cl;
    const wave = new Float32Array(121);
    let mx = 1;
    for (let i = 0; i <= 120; i++) {
      const j = Math.min(i1, Math.round((i / 120) * L));
      wave[i] = (course.px[j] - ax) * nx + (course.pz[j] - az) * nz;
      mx = Math.max(mx, Math.abs(wave[i]));
    }
    for (let i = 0; i <= 120; i++) wave[i] /= mx;
    this.wave = wave;
    this.items = null;
    // minimap outline, fitted
    const pts = [];
    for (let i = 0; i < course.n; i += 8) pts.push([course.px[i], course.pz[i]]);
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const pad = 26, S = 300;
    const k = Math.min((S - pad * 2) / Math.max(1, x1 - x0), (S - pad * 2) / Math.max(1, z1 - z0));
    this.map = { x0, z0, k, ox: (S - (x1 - x0) * k) / 2, oz: (S - (z1 - z0) * k) / 2, pts };
    this.last = {};
  }

  /** The chairlift ride: the lap coming, the order chair by chair, and the skip hint. Pass null to hide. */
  lift(state) {
    if (!state) {
      this.liftEl.classList.remove('on');
      this.liftKey = '';
      return;
    }
    const key = `${state.lap}|${state.order.map((r) => r.slot).join(',')}|${state.canSkip}`;
    if (key === this.liftKey) return;
    this.liftKey = key;
    this.liftEl.innerHTML = `<h3>Chairlift · Lap ${state.lap}/${state.laps} next</h3><ol>${state.order.map((r, i) => `<li class="${r.me ? 'me' : ''}"><span class="sp-chair">🪑</span>${faceSvg(r.species, 28)}<b>${i + 1}</b> ${esc(r.name)}${r.liftT > 0 ? ' <small>on the lift</small>' : ''}</li>`).join('')}</ol><p>${state.canSkip ? (this.touch ? 'Tap to skip' : 'Space to skip') : 'Enjoy the view…'}</p>`;
    this.liftEl.classList.add('on');
  }

  mapXY(x, z) {
    const m = this.map;
    return [m.ox + (x - m.x0) * m.k, m.oz + (z - m.z0) * m.k];
  }

  update(dt, { racers, me, place, total, time, speed, slots, course, world }) {
    // position
    if (place !== this.last.place || total !== this.last.total) {
      this.posEl.innerHTML = `<b>${place}</b><sup>${ordinal(place).replace(String(place), '')}</sup><span>/${total}</span>`;
      this.posEl.classList.toggle('first', place === 1);
      if (this.last.place) {
        this.posEl.classList.remove('bump');
        void this.posEl.offsetWidth;
        this.posEl.classList.add('bump');
      }
      this.last.place = place;
      this.last.total = total;
    }
    // strip: the bendy run, your progress, upcoming items as dots, every racer's face on it
    const L = course.finish;
    const sw = this.path.clientWidth || 620;
    const waveAt = (k) => {
      const x = Math.max(0, Math.min(120, k * 120));
      const i = Math.floor(x), f = x - i;
      return this.wave[i] + ((this.wave[Math.min(120, i + 1)] ?? 0) - this.wave[i]) * f;
    };
    for (const r of racers) {
      const f = this.faceEls.get(r.slot);
      if (!f) continue;
      const laps = course.laps ?? 1;
      const lapK = r.finished ? 1 : r.liftT > 0 ? 0 : r.rider.s / L;
      const k = Math.max(0, Math.min(1, ((r.lap ?? 1) - 1 + Math.min(1, lapK)) / laps));
      f.style.left = `${(5 + k * (sw - 30)).toFixed(1)}px`;
      f.style.transform = `translateY(${(waveAt(k) * 11).toFixed(1)}px)`;
      f.classList.toggle('fin', r.finished);
    }
    // Lap 2/3, or the Long trail's section
    const stage = (course.laps ?? 1) > 1 ? `Lap ${Math.min(course.laps, me.lap ?? 1)}/${course.laps}` : course.sections ? (sectionAt(course, me.rider.s)?.name ?? '') : '';
    if (stage !== this.last.stage) {
      this.stageEl.textContent = stage;
      this.stageEl.classList.toggle('on', Boolean(stage));
      if (this.last.stage) {
        this.stageEl.classList.remove('pop');
        void this.stageEl.offsetWidth;
        this.stageEl.classList.add('pop');
      }
      this.last.stage = stage;
    }
    this.frameN = (this.frameN ?? 0) + 1;
    if (this.frameN % 2 === 0) this.drawStrip(me, world, L, waveAt);
    // time
    const ts = fmtTime(time);
    if (ts !== this.last.ts) {
      this.timeEl.textContent = ts;
      this.last.ts = ts;
    }
    // the two item slots: big round picture buttons, the key on each, a count for snowballs
    const ak = (slots ?? []).map((x) => `${x.kind}${x.n}`).join('|');
    if (ak !== this.last.ammo) {
      let h = '';
      for (let i = 0; i < 2; i++) {
        const it = slots?.[i];
        h += it
          ? `<button class="sp-ball ready item-${it.kind}" data-slot="${i}" aria-label="${ITEM_LABEL[it.kind]}">${ITEM_ICON[it.kind]}${it.kind === 'snowballs' ? `<b class="sp-count">${it.n}</b>` : ''}<kbd>${i + 1}</kbd></button>`
          : `<button class="sp-ball empty" data-slot="${i}" aria-label="Empty slot"><kbd>${i + 1}</kbd></button>`;
      }
      this.ammoEl.innerHTML = h;
      this.last.ammo = ak;
    }
    // speed dial: 0–110 km/h
    const kmh = Math.round(speed * 3.6);
    if (kmh !== this.last.kmh) {
      const k = Math.min(1, kmh / 110);
      this.needle.setAttribute('transform', `rotate(${-90 + k * 180} 85 104)`);
      this.arc.setAttribute('stroke-dasharray', `${(k * 100).toFixed(1)} 100`);
      this.kmh.innerHTML = `${kmh}<small> km/h</small>`;
      this.last.kmh = kmh;
    }
    this.drawMini(racers, world);
  }

  drawStrip(me, world, L, waveAt) {
    const g = this.pg;
    const W = this.path.width, H = this.path.height;
    const sx = (W - 60) / 1, cy = H / 2, amp = 22;
    g.clearRect(0, 0, W, H);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const line = (k0, k1, width, style) => {
      g.strokeStyle = style;
      g.lineWidth = width;
      g.beginPath();
      for (let k = k0; k <= k1 + 1e-6; k += 1 / 120) {
        const x = 10 + k * sx, y = cy + waveAt(k) * amp;
        if (k === k0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    };
    line(0, 1, 26, 'rgba(42,47,74,0.18)');
    line(0, 1, 18, 'rgba(255,255,255,0.92)');
    const km = Math.max(0, Math.min(1, me.rider.s / L));
    if (km > 0.002) line(0, km, 12, '#ff6fb4');
    // items still to come, as dots in their colours
    if (world?.items) {
      const col = { gift: '#ff5fa2', pile: '#5ec8ff' };
      for (const it of world.items) {
        if (it.s < me.rider.s || it.s > me.rider.s + 420 || world.taken.has(it.id)) continue;
        const k = it.s / L;
        g.fillStyle = col[it.kind];
        g.strokeStyle = 'rgba(42,47,74,0.55)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(10 + k * sx, cy + waveAt(k) * amp, it.kind === 'gift' ? 6.5 : 5, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
    }
  }

  /** Name tags over riders: [{ key, name, x, y, me }] in screen pixels (others are hidden). */
  tags(list) {
    this.tagEls ??= new Map();
    const seen = new Set();
    for (const t of list) {
      let d = this.tagEls.get(t.key);
      if (!d) {
        d = el('div', `sp-nametag${t.me ? ' me' : ''}`);
        this.root.append(d);
        this.tagEls.set(t.key, d);
      }
      if (d.textContent !== t.name) d.textContent = t.name;
      d.style.transform = `translate(${t.x.toFixed(0)}px, ${t.y.toFixed(0)}px) translate(-50%, -100%)`;
      d.style.opacity = String(t.alpha ?? 1);
      d.style.display = '';
      seen.add(t.key);
    }
    for (const [k, d] of this.tagEls) if (!seen.has(k)) d.style.display = 'none';
  }

  /** A word bubble over a rider ("Hey!", "Woo!"), at screen (x, y). */
  bubble(x, y, text) {
    const d = el('div', 'sp-bubble');
    d.textContent = text;
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    this.root.append(d);
    setTimeout(() => d.remove(), 1100);
  }

  /** An item's icon flying from where you took it to its place in the HUD. */
  fly(kind, x, y) {
    const target = this.ammoEl;
    const r = target.getBoundingClientRect();
    const icon = el('div', 'sp-fly', ITEM_ICON[kind] ?? SNOWBALL);
    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
    this.root.append(icon);
    requestAnimationFrame(() => {
      icon.style.transform = `translate(${r.left + r.width / 2 - x}px, ${r.top + r.height / 2 - y}px) scale(0.6)`;
      icon.style.opacity = '0.2';
    });
    setTimeout(() => {
      icon.remove();
      target.classList.remove('pop');
      void target.offsetWidth;
      target.classList.add('pop');
    }, 560);
  }

  drawMini(racers, world) {
    const g = this.mg;
    const m = this.map;
    if (!m) return;
    g.clearRect(0, 0, 300, 300);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 16;
    g.beginPath();
    m.pts.forEach(([x, z], i) => {
      const [a, b] = this.mapXY(x, z);
      if (i) g.lineTo(a, b);
      else g.moveTo(a, b);
    });
    g.stroke();
    g.strokeStyle = 'rgba(58,134,255,0.35)';
    g.lineWidth = 6;
    g.stroke();
    // finish flag
    const c = this.course;
    const fi = Math.min(c.n - 1, Math.round(c.finish));
    const [fx, fz] = this.mapXY(c.px[fi], c.pz[fi]);
    g.fillStyle = '#2a2f4a';
    g.fillRect(fx - 6, fz - 6, 12, 12);
    // lifts
    g.strokeStyle = 'rgba(42,47,74,0.4)';
    g.lineWidth = 2;
    for (const lf of c.lifts) {
      g.beginPath();
      lf.towers.forEach((t, i) => {
        const [a, b] = this.mapXY(t.x, t.z);
        if (i) g.lineTo(a, b);
        else g.moveTo(a, b);
      });
      g.stroke();
    }
    // racers (you last, on top)
    const order = [...racers].sort((a, b) => (a.slot === this.meSlot) - (b.slot === this.meSlot));
    for (const r of order) {
      const p = r.pos;
      if (!p) continue;
      const [a, b] = this.mapXY(p.x, p.z);
      const me = r.slot === this.meSlot;
      g.fillStyle = SPECIES[r.species]?.color ?? '#fff';
      g.strokeStyle = me ? '#ffd23f' : '#ffffff';
      g.lineWidth = me ? 5 : 3;
      g.beginPath();
      g.arc(a, b, me ? 11 : 8, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
  }

  /** Centre pop text: kind = trick | boost | count | go | info. */
  say(text, kind = 'info', html = false) {
    const d = el('div', kind);
    if (html) d.innerHTML = text;
    else d.textContent = text;
    if (kind === 'count' || kind === 'go') this.pop.innerHTML = '';
    if (kind === 'go') d.classList.add('count');
    this.pop.append(d);
    while (this.pop.children.length > 3) this.pop.firstChild.remove();
    setTimeout(() => d.remove(), kind === 'count' || kind === 'go' ? 950 : 1250);
  }

  /** "BONK!" over a rider, at screen (x, y) in CSS pixels. */
  bonk(x, y, text = 'BONK!', mine = false) {
    const d = el('div', `sp-bonk${mine ? ' mine' : ''}`);
    d.textContent = text;
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    this.root.append(d);
    setTimeout(() => d.remove(), 950);
  }

  toast(text, secs = 2.5) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('on');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('on'), secs * 1000);
  }

  /** Speed lines at the screen edges, only when fast. */
  drawLines(k, w, h, dpr) {
    const cv = this.lines;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const g = this.lg;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (k <= 0.01) return;
    const cx = w / 2, cy = h * 0.46;
    const R = Math.hypot(w, h) * 0.5;
    const n = Math.round(10 + k * 26);
    g.strokeStyle = `rgba(255,255,255,${0.12 + k * 0.32})`;
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r0 = R * (0.62 + Math.random() * 0.25), len = R * (0.08 + Math.random() * 0.22) * k;
      g.lineWidth = 1 + Math.random() * 3 * k;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.8);
      g.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len) * 0.8);
      g.stroke();
    }
  }

  dispose() {
    this.el.remove();
    this.lines.remove();
    for (const d of this.tagEls?.values() ?? []) d.remove();
  }
}

/* ---------------------------------------------------------------- touch */

export class TouchControls {
  constructor(root, input) {
    this.input = input;
    this.el = el('div', 'sp-touch off', `<div class="sp-steer"><div class="sp-steer__knob"><i></i></div></div>
      <button class="sp-tbtn sp-tbtn--tuck" data-t="tuck">TUCK</button>
      <button class="sp-tbtn sp-tbtn--throw" data-t="throw" aria-label="Item 1">1</button>
      <button class="sp-tbtn sp-tbtn--item2" data-t="item2" aria-label="Item 2">2</button>
      <button class="sp-tbtn sp-tbtn--jump" data-t="jump">JUMP</button>`);
    root.append(this.el);
    const zone = this.el.querySelector('.sp-steer');
    const knob = this.el.querySelector('.sp-steer__knob');
    let id = null, ox = 0, oy = 0;
    zone.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      ox = e.clientX;
      oy = e.clientY;
      zone.setPointerCapture(id);
      knob.style.display = 'block';
      knob.style.left = `${e.offsetX}px`;
      knob.style.top = `${e.offsetY}px`;
      knob.firstChild.style.transform = '';
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = Math.max(-60, Math.min(60, e.clientX - ox)), dy = Math.max(-60, Math.min(60, e.clientY - oy));
      input.touchSteer = Math.abs(dx) < 8 ? 0 : dx / 60;
      input.touchFlip = Math.abs(dy) < 14 ? 0 : -dy / 60;
      knob.firstChild.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      input.touchSteer = 0;
      input.touchFlip = 0;
      knob.style.display = 'none';
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    for (const b of this.el.querySelectorAll('[data-t]')) {
      const t = b.dataset.t;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        b.classList.add('held');
        input.touch[t] = true;
        if (t === 'throw' || t === 'item2') input.pressed.add(t);
      });
      const up = () => {
        b.classList.remove('held');
        input.touch[t] = false;
      };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    }
  }

  show(on) {
    this.el.classList.toggle('off', !on);
  }

  dispose() {
    this.el.remove();
  }
}
