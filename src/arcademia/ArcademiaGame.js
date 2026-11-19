import { PowerKit } from '../shared/powerKit.js';
import { CameraAssist, loadAssist } from '../shared/cameraAssist.js';
import { HelpPanel } from '../shared/helpPanel.js';
import { controls } from './controls.js';
import { Stage } from './stage.js';
import { World } from './world/World.js';
import { Hud } from './ui/hud.js';
import { el, confetti, prefersReducedMotion } from './ui/dom.js';
import { Progress } from './progress.js';
import { Sound } from './sound.js';
import { GameState } from './gamestate.js';
import { WORLDS } from './quests.js';
import { FLOORS } from './floors.js';
import { LESSONS, lessonsOn } from './content/index.js';
import { floorStars, totalStars } from './rules.js';
import { t, num, loadLocale, setLocale, pickLocale, isLocale, localizeLesson, localeInfo } from './i18n/index.js';
import { startScreen, openSettings } from './ui/settings.js';
import './arcademia.css';

/**
 * AI Arcademia: a learning mountain for kids. Seven floors (FLOORS), each a
 * terrace with a Math school, a History hall and a Physics lab; walk in for
 * a lesson — reading, something to play with, then a short check — and earn
 * stars that open the floor above. Parents get a weekly report behind a PIN.
 *
 *   const game = new ArcademiaGame(document.body, { account, onClose });
 *   await game.open();   …   game.close();
 */
const PREFS_KEY = 'arcademia.prefs';
const prefs = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY)) ?? {};
    } catch {
      return {};
    }
  },
  save(p) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    } catch {
      /* private mode: settings just aren't kept */
    }
  }
};

export class ArcademiaGame {
  constructor(host, { account = null, onClose } = {}) {
    this.host = host ?? document.body;
    this.account = account;
    this.onClose = onClose;
    this.root = el('div', 'arc', null, { role: 'application', 'aria-label': 'AI Arcademia', tabindex: '-1' });
    this.host.append(this.root);
    this.prefs = { night: false, sound: true, bigText: false, ...prefs.load() };
    // The language: saved, else the browser's own (navigator.languages), else English.
    if (!isLocale(this.prefs.lang)) this.prefs.lang = pickLocale(typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : []);
    this.reducedMotion = prefersReducedMotion();
    this.sound = new Sound();
    this.sound.setMuted(!this.prefs.sound);
    this.progress = new Progress({ account });
    this.gs = new GameState(account ? `a${account.id}` : 'guest');
    this.closed = false;
    this.mode = 'loading';
    window.arcademia = this;
  }

  async open() {
    await loadLocale(this.prefs.lang).catch(() => (this.prefs.lang = 'en'));
    setLocale(this.prefs.lang);
    this.root.lang = this.prefs.lang;
    const loading = el('div', 'arc-loading');
    loading.append(el('div', 'arc-loading__owl', '🦉', { 'aria-hidden': 'true' }), el('p', null, t('game.loading')));
    this.root.append(loading);
    this.root.classList.toggle('is-big-text', this.prefs.bigText);
    await new Promise((r) => requestAnimationFrame(r));
    this.stage = new Stage(this.root);
    this.labels = el('div', 'arc-labels');
    this.root.append(this.labels);
    await this.progress.load();
    if (this.closed) return;
    this.world = new World({
      floors: FLOORS,
      labels: this.labels,
      renderer: this.stage.renderer,
      reducedMotion: this.reducedMotion,
      buddy: this.gs.buddy ?? { species: 'fox', color: '#ff9b54', hat: 'party' },
      on: {
        enter: (subject, floor) => this.enter(subject, floor),
        floor: (n) => {
          this.refresh();
          if (this._amb) this.sound.ambient(this.prefs.sound, this.prefs.night ? 1 : 0, FLOORS[n - 1].look.mood);
        },
        near: (b) => this.hud?.setNear(b),
        gate: (n) => this.gateToast(n),
        npc: (n) => this.npcHello(n),
        floorPick: (n) => this.goFloor(n),
        night: (k) => this.stage.setGlow(k),
        chest: (n) => this.openChest(n),
        boss: (n) => this.startBoss(n),
        place: (kind, n, entry) => this.openPlace(kind, n, entry),
        toy: (sound, t) => this.pokeToy(sound, t),
        gem: (n, id) => this.foundGem(n, id)
      }
    });
    this.stage.show(this.world.scene, this.world.camera);
    this.world.camAssist = new CameraAssist(loadAssist('arcademia'), { id: 'arcademia' });
    this._makeHud();
    this.gs.onChange(() => this.hud?.updateGame(this.gs));
    this.world.setFound(this.gs.s.gems);
    this.setNight(this.prefs.night, true);
    this.setSound(this.prefs.sound);
    this.progress.onChange(() => this.refresh());
    this.openBefore = new Set(this.progress.floorsOpen);
    this.world.setLocked(this.lockedSet());
    this.refresh();
    this.refreshGame();
    this._resize = new ResizeObserver(() => this.resize());
    this._resize.observe(this.root);
    this.resize();
    this._keys();
    loading.classList.add('is-done');
    setTimeout(() => loading.remove(), 600);
    this.mode = 'world';
    // Power: a capped loop (60, or 30 on Quiet), stopped in a hidden tab, and only drawn on demand while
    // a window (settings, the start screen, the parents' page…) covers the mountain.
    this.power = new PowerKit('arcademia', { renderer: this.stage.renderer, profile: { quietFps: 30 }, features: { grass: false, ao: false, rays: false, distance: false }, onChange: () => this.applyPower() });
    this.applyPower();
    this.power.start((ms) => {
      this.fps = this.power.loop.fps;
      this.frame(Math.min(0.1, ms / 1000));
    });
    this._modals = new MutationObserver(() => this._menuKind());
    this._modals.observe(this.root, { childList: true });
    this._menuKind();
    this.root.focus();
    this.root.addEventListener('pointerdown', () => {
      this.sound.wake();
      if (!this._amb && this.prefs.sound) {
        this._amb = true;
        this.sound.ambient(true, this.prefs.night ? 1 : 0, FLOORS[this.world.kidFloor - 1].look.mood);
      }
    });
    await startScreen(this);
    if (!this.closed) this.openHelp(true);
    if (this.closed) return;
    if (!this.gs.buddy) await this.openBuddy({ first: true });
    if (this.closed) return;
    if (this.progress.guestToImport) this.offerImport();
    if (!Object.keys(this.progress.stars).length) setTimeout(() => this.hud?.toast(t('game.firstQuest', { story: WORLDS[1].story }), { icon: '🌼', ms: 7000 }), 900);
  }

  /** The HUD (built again when the language changes). */
  _makeHud() {
    this.hud?.dispose();
    this.hud = new Hud(this.root, {
      goFloor: (n) => this.goFloor(n),
      overview: () => this.world.overview(),
      toggleNight: () => this.setNight(!this.prefs.night),
      toggleSound: () => this.setSound(!this.prefs.sound),
      parents: () => this.openParents(),
      close: () => this.close(),
      home: () => this.world.home(),
      help: () => this.openHelp(),
      zoom: (k) => this.world.zoom(k),
      bigText: () => this.setBigText(!this.prefs.bigText),
      continue: () => this.continueLesson(),
      enterNear: () => this.enterNear(),
      buddy: () => this.openBuddy(),
      questbook: () => this.openQuestbook(),
      settings: () => openSettings(this)
    });
    this.hud.textBtn.setAttribute('aria-pressed', String(this.prefs.bigText));
    this.hud.setNight(this.prefs.night);
    this.hud.setSound(this.prefs.sound);
  }

  /** Switch the game's language: load it, save it, redraw what is on screen. */
  async setLanguage(id) {
    if (!isLocale(id)) return;
    await loadLocale(id);
    setLocale(id);
    this.prefs.lang = id;
    prefs.save(this.prefs);
    this.root.lang = id;
    if (this.world) {
      this.world.relabel?.();
      this._makeHud();
      this.refresh();
      this.refreshGame();
    }
  }

  lockedSet() {
    const open = this.progress.floorsOpen;
    return new Set(FLOORS.map((f) => f.n).filter((n) => !open.has(n)));
  }

  /** Progress changed: the HUD, the labels and — if a floor just opened — the gates. */
  refresh() {
    if (!this.world || !this.hud) return;
    const stars = this.progress.stars;
    const open = this.progress.floorsOpen;
    const newly = [...open].filter((n) => !this.openBefore.has(n));
    if (newly.length) {
      this.openBefore = new Set(open);
      this.world.setLocked(this.lockedSet(), { animate: true });
      this.pendingUnlock = newly;
    }
    this.world.setBuildingStats((subject, floor) => {
      const list = lessonsOn(floor, subject);
      const done = list.filter((l) => (stars[l.id] ?? 0) > 0).length;
      return `${done}/${list.length}`;
    }, (n) => (open.has(n) ? `${floorStars(stars, n).have}★` : ''));
    this.hud.update({ stars, open, kidFloor: this.world.kidFloor, focusFloor: this.world.focusFloor, current: this.currentLesson(), total: totalStars(stars) });
  }

  /** The lesson to suggest: the first unstarred one on the kid's floor (math, history, physics in turn). */
  currentLesson() {
    const floor = this.world?.kidFloor ?? 1;
    const here = lessonsOn(floor);
    const order = [];
    const bySubject = ['math', 'history', 'physics'].map((s) => here.filter((l) => l.subject === s));
    for (let i = 0; i < 5; i++) for (const list of bySubject) if (list[i]) order.push(list[i]);
    const todo = order.filter((l) => !(this.progress.stars[l.id] > 0));
    const lesson = todo[0] ?? order.find((l) => (this.progress.stars[l.id] ?? 0) < 3) ?? order[0];
    return { lesson, next: todo[1] ?? null };
  }

  /** Graphics: frame cap, shadows (off / near: a smaller map, redrawn every other frame / full) and the night glow. */
  applyPower() {
    const c = this.power.choices;
    const sun = this.world?.sun;
    if (sun) {
      sun.castShadow = c.shadows !== 'off';
      const size = c.shadows === 'full' ? 2048 : 1024;
      if (sun.shadow.mapSize.x !== size) {
        sun.shadow.mapSize.set(size, size);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
      }
    }
    this.shadowEvery = c.shadows === 'full' ? 1 : 2;
    this.stage.bloomAllowed = c.bloom;
    this.stage.setGlow(this.stage.glow);
    this.stage.renderer.shadowMap.needsUpdate = true;
    this.power.invalidate();
  }

  /** How to play, in the player's language (H or I, the ? chip, Settings); `first`: only if not turned off. */
  openHelp(first = false) {
    this.help?.dispose();
    this.help = new HelpPanel({
      host: this.root,
      id: 'arcademia',
      table: controls(),
      text: { title: t('help.title'), close: t('help.close'), dontShow: t('help.dontShow'), touch: t('help.touch'), gamepad: t('help.pad') },
      onClose: () => this.root.focus()
    });
    if (first) this.help.openFirstTime();
    else this.help.open();
  }

  /** What the loop should do: a window over the mountain — draw on demand; a lesson — at most 30 a second; else play. */
  _menuKind() {
    if (!this.power) return;
    const covered = this.root.querySelector(':scope > .arc-modal, :scope > .arc-start, :scope > .arc-boss, :scope > .arc-parents, :scope > .hp');
    this.power.setMenu(covered ? 'still' : this.mode === 'lesson' ? 'live' : 'none');
  }

  frame(dt) {
    const cam = this.stage.camera?.position;
    if (cam) this.stage.renderer.shadowMap.needsUpdate ||= this.power.shadowDue(this.shadowEvery ?? 1, cam.x, cam.z, 0);
    this.power.showFps(this.root);
    if (this.mode === 'world') {
      this.world.update(dt);
      if (this._hudT === undefined || (this._hudT -= dt) < 0) {
        this._hudT = 0.5;
        if (this.world.focusFloor !== this._lastFocus) {
          this._lastFocus = this.world.focusFloor;
          this.refresh();
        }
      }
      this.stage.render();
    } else if (this.mode === 'lesson' && this.lesson) {
      this.world.cutOff();
      this.lesson.frame(dt);
      if (document.visibilityState === 'visible' && this.lesson.lesson) this.progress.tick(this.lesson.subject, dt);
      this.stage.render();
      this.lesson.portrait?.(this.stage.renderer);
    }
  }

  resize() {
    const w = this.root.clientWidth, h = this.root.clientHeight;
    if (!w || !h) return;
    this.stage.resize(w, h);
    this.world.resize(w, h);
    this.lesson?.resize(w, h);
    this.power?.invalidate();
  }

  /* ---------------------------------------------------------------- the world */

  goFloor(n) {
    if (this.lockedSet().has(n)) {
      this.world.showFloor(n);
      this.gateToast(n);
      return;
    }
    this.world.teleport(n);
    this.world.showFloor(n);
    this.sound.tap();
    this.refresh();
  }

  gateToast(n) {
    const below = n - 1;
    const fs = floorStars(this.progress.stars, below);
    const need = Math.ceil(fs.lessons * (2 / 3));
    this.hud.toast(t('game.gate', { n, need, below, done: fs.done }), { icon: '🔒' });
  }

  npcHello(n) {
    this.sound.toy(n.species === 'robot' ? 'beep' : 'squeak');
    const left = this.world.gems.filter((g) => g.floor === n.floor && !this.gs.s.gems[g.id]).length;
    const lines = Array.from({ length: 10 }, (_, i) => t(`npc.${i}`, { boss: WORLDS[n.floor].boss.name }));
    const tip = left && Math.random() < 0.35 ? t('npc.gems', { count: left }) : lines[Math.floor(Math.random() * lines.length)];
    this.hud.toast(tip, { icon: { bunny: '🐰', mouse: '🐭', duck: '🦆', fox: '🦊', hedgehog: '🦔', frog: '🐸', penguin: '🐧', bear: '🐻', puff: '☁️', crab: '🦀', robot: '🤖' }[n.species] ?? '💬', ms: 4200 });
  }

  enterNear() {
    const b = this.world.nearDoor();
    if (b) this.enter(b.subject, b.floor);
  }

  continueLesson() {
    const { lesson } = this.currentLesson();
    const b = this.world.buildings.find((x) => x.subject === lesson.subject && x.floor === lesson.floor);
    this.pendingLesson = lesson;
    if (b) this.world.select(b, true);
    // Already at the door (or the walk failed): go straight in.
    if (!this.world.path) this.enter(lesson.subject, lesson.floor, lesson);
  }

  /** Into a building: pick the lesson there, then run it. */
  async enter(subject, floor, lesson = null) {
    if (this.mode !== 'world') return;
    if (this.lockedSet().has(floor)) return this.gateToast(floor);
    this.world.clearKeys();
    const pick = lesson ?? (this.pendingLesson?.subject === subject && this.pendingLesson?.floor === floor ? this.pendingLesson : null);
    this.pendingLesson = null;
    this.sound.wake();
    this.sound.door();
    this.mode = 'busy';
    const { openBuilding } = await import('./lesson/LessonRunner.js');
    if (this.closed) return;
    this.lesson = await openBuilding(this, { subject, floor, lesson: pick });
    if (!this.lesson) {
      this.mode = 'world';
      this.stage.show(this.world.scene, this.world.camera);
      return;
    }
    this.mode = 'lesson';
    this._menuKind();
    this.labels.hidden = true;
    this.hud.root.hidden = true;
  }

  /** Back out to the mountain. */
  leaveLesson() {
    this.lesson?.dispose();
    this.lesson = null;
    this.progress.flush();
    this.mode = 'world';
    this._menuKind();
    this.labels.hidden = false;
    this.hud.root.hidden = false;
    this.stage.show(this.world.scene, this.world.camera);
    this.resize();
    this.root.focus();
    this.refresh();
    if (this.pendingUnlock?.length) {
      const n = Math.max(...this.pendingUnlock);
      this.pendingUnlock = null;
      setTimeout(() => this.celebrateUnlock(n), 500);
    }
  }

  celebrateUnlock(n) {
    const f = FLOORS[n - 1];
    const got = this.gs.event('floor', { floor: n });
    if (got.stickers.length) setTimeout(() => this.hud.toast(t('game.newSticker', { list: got.stickers.map((s) => `${s.emoji} ${s.name}`).join(', ') }), { icon: '🌈' }), 1800);
    this.sound.fanfare();
    confetti(this.root, 120);
    const banner = el('div', 'arc-banner', null, { role: 'status' });
    banner.append(el('span', 'arc-banner__icon', f.icon, { 'aria-hidden': 'true' }), el('strong', null, t('game.floorOpen', { n })), el('span', null, t('game.floorOpenStory', { name: f.name, story: WORLDS[n].story })));
    this.root.append(banner);
    setTimeout(() => banner.classList.add('is-out'), 4200);
    setTimeout(() => banner.remove(), 4800);
    this.world.showFloor(n - 1);
  }

  /* ---------------------------------------------------------------- the game layer */

  refreshGame() {
    this.hud?.updateGame(this.gs);
    if (!this.world) return;
    for (const c of this.world.chests) c.group.userData.setOpen(Boolean(this.gs.s.chests[c.floor]), true);
    for (const b of this.world.bosses) {
      b.happy = Boolean(this.gs.s.bosses[b.floor]);
      b.label.querySelector('.arc-pill__meta').textContent = b.happy ? '😊' : t('place.boss');
    }
  }

  /** The places on a floor that aren't schools. */
  openPlace(kind, n, entry) {
    if (kind === 'shop') return this.openBuddy();
    if (kind === 'museum' || kind === 'board') return this.openQuestbook();
    if (kind === 'arcade') return this.openArcadeHall(n);
    if (kind === 'landmark') {
      this.sound.toy('whirl');
      return this.hud.toast(WORLDS[n].story, { icon: FLOORS[n - 1].icon, ms: 4500 });
    }
    if (kind === 'portal') {
      if (this.lockedSet().has(n + 1)) return this.gateToast(n + 1);
      this.sound.toy('gem');
      this.world.teleport(n + 1);
      this.world.showFloor(n + 1);
      this.refresh();
    }
  }

  pokeToy(sound, toyAt) {
    this.sound.wake();
    this.sound.toy(sound);
    const got = this.gs.event('toy', { id: `${toyAt.floor}-${toyAt.kind}-${Math.round(toyAt.x)}` });
    if (got.coins) this.hud.toast(`${t('game.toyCoins', { n: got.coins })}${got.stickers.length ? ` ${t('game.newSticker', { list: `${got.stickers[0].emoji} ${got.stickers[0].name}` })}` : ''}`, { icon: '🎉', ms: 1800 });
  }

  foundGem(n, id) {
    this.sound.toy('gem');
    const got = this.gs.event('gem', { id });
    const left = this.world.gems.filter((g) => g.floor === n && !this.gs.s.gems[g.id]).length;
    this.hud.toast(`${t('game.gem', { n: got.coins })} ${left ? t('game.gemsLeft', { count: left }) : t('game.gemsAll')}${got.stickers.length ? ` ${t('game.newSticker', { list: got.stickers.map((s) => s.emoji).join(' ') })}` : ''}`, { icon: '💎' });
    this.refreshGame();
  }

  /** The arcade hall: pick a quick game, play it over the world. */
  async openArcadeHall(n) {
    const { bubblePop, feedMonster, launch, whoSaid } = await import('./lesson/minigames.js');
    const games = [
      ['🫧', 'bubbles', (host) => bubblePop(host, { floor: n, sound: this.sound, reducedMotion: this.reducedMotion })],
      ['👾', 'monster', (host) => feedMonster(host, { floor: n, sound: this.sound })],
      ['🧺', 'launch', (host) => launch(host, { sound: this.sound })],
      ['💬', 'who', (host) => whoSaid(host, { lessons: lessonsOn(n, 'history'), sound: this.sound })]
    ];
    this.world.clearKeys();
    const box = el('div', 'arc-modal', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('arcade.title') });
    const card = el('div', 'arc-modal__card arc-book');
    const close = () => box.remove();
    const x = el('button', 'arc-boss__x', '✕', { type: 'button', 'aria-label': t('settings.close') });
    x.addEventListener('click', close);
    card.append(x, el('h2', null, `🕹️ ${t('arcade.title')}`));
    const grid = el('div', 'arc-lobby__grid');
    for (const [icon, id, run] of games) {
      const name = t(`arcade.${id}`), what = t(`arcade.${id}.what`);
      const b = el('button', 'arc-quest-card arc-quest-card--arcade', null, { type: 'button' });
      b.append(el('span', 'arc-quest-card__stars', icon), el('strong', null, name), el('span', null, what));
      b.addEventListener('click', async () => {
        card.replaceChildren(el('h2', null, `${icon} ${name}`));
        const score = await run(card);
        if (!box.isConnected) return;
        const got = this.gs.event('arcade', { game: `${id}-${n}`, score });
        this.sound.fanfare();
        this.world.kid.cheer(1.5);
        card.replaceChildren(el('h2', null, `${icon} ${t('arcade.points', { count: score })}`), el('p', 'arc-rewards', t('arcade.rewards', { coins: got.coins, xp: got.xp })));
        const again = el('button', 'arc-btn arc-btn--primary arc-btn--big', t('arcade.again'), { type: 'button' });
        again.addEventListener('click', () => {
          close();
          this.openArcadeHall(n);
        });
        const done = el('button', 'arc-btn', t('arcade.done'), { type: 'button' });
        done.addEventListener('click', close);
        const row = el('div', 'arc-row');
        row.append(done, again);
        card.append(row);
        this.refreshGame();
      });
      grid.append(b);
    }
    card.append(grid);
    box.append(card);
    this.root.append(box);
    grid.querySelector('button').focus();
  }

  savePrefs() {
    prefs.save(this.prefs);
  }

  async openBuddy(opts = {}) {
    if (this.mode !== 'world' && this.mode !== 'loading') return;
    const { openBuddy } = await import('./ui/buddy.js');
    this.world.clearKeys();
    this.hud.root.classList.add('is-dressing');
    await openBuddy(this, opts);
    this.hud.root.classList.remove('is-dressing');
  }

  async openQuestbook() {
    const { openQuestbook } = await import('./ui/questbook.js');
    this.world.clearKeys();
    openQuestbook(this);
  }

  /** A floor's chest opens once, after a lesson on that floor. */
  openChest(n) {
    if (this.gs.s.chests[n]) return this.hud.toast(t('game.chestEmpty'), { icon: '🧰' });
    const done = lessonsOn(n).some((l) => (this.progress.stars[l.id] ?? 0) > 0);
    if (!done) return this.hud.toast(t('game.chestLocked'), { icon: '🔐' });
    const got = this.gs.event('chest', { floor: n });
    this.world.chests.find((c) => c.floor === n)?.group.userData.setOpen(true);
    this.world.kid.cheer(1.6);
    this.sound.fanfare();
    confetti(this.root, 60);
    this.hud.toast(got.stickers.length ? t('game.treasureSticker', { n: got.coins, sticker: `${got.stickers[0].emoji} ${got.stickers[0].name}` }) : t('game.treasure', { n: got.coins }), { icon: '🪙' });
    this.refreshGame();
  }

  /** The floor's puzzle boss: ready once two thirds of the floor's lessons are done. */
  async startBoss(n) {
    if (this.mode !== 'world') return;
    const fs = floorStars(this.progress.stars, n);
    const need = Math.ceil(fs.lessons * (2 / 3));
    const w = WORLDS[n].boss;
    if (this.gs.s.bosses[n]) {
      this.world.bosses.find((b) => b.floor === n)?.fig.hop();
      return this.hud.toast(t('game.bossHappy', { name: w.name }), { icon: w.emoji });
    }
    if (fs.done < need) return this.hud.toast(t('game.bossWait', { name: w.name, need, done: fs.done }), { icon: w.emoji, ms: 5000 });
    this.mode = 'boss';
    this.world.clearKeys();
    const { bossBattle } = await import('./lesson/boss.js');
    this.hud.root.classList.add('is-boss');
    this.labels.hidden = true;
    const prevMode = 'world';
    const done = bossBattle(this, n);
    this.mode = 'world';
    this.world.paused = true;
    await done;
    this.world.paused = false;
    this.mode = prevMode;
    this.labels.hidden = false;
    this.hud.root.classList.remove('is-boss');
    this.progress.flush();
    this.refreshGame();
  }

  /* ---------------------------------------------------------------- settings */

  setNight(on, instant = false) {
    this.prefs.night = on;
    prefs.save(this.prefs);
    this.world.setNight(on);
    if (instant) {
      this.world.night = on ? 1 : 0;
      this.world._applyNight();
    }
    this.hud?.setNight(on);
    this.root.classList.toggle('is-night', on);
    if (this._amb) this.sound.ambient(this.prefs.sound, on ? 1 : 0, FLOORS[this.world.kidFloor - 1].look.mood);
  }

  setSound(on) {
    this.prefs.sound = on;
    prefs.save(this.prefs);
    this.sound.setMuted(!on);
    this.hud?.setSound(on);
    if (this._amb) this.sound.ambient(on, this.prefs.night ? 1 : 0, FLOORS[this.world.kidFloor - 1].look.mood);
  }

  setBigText(on) {
    this.prefs.bigText = on;
    prefs.save(this.prefs);
    this.root.classList.toggle('is-big-text', on);
    this.hud.textBtn.setAttribute('aria-pressed', String(on));
  }

  /* ---------------------------------------------------------------- parents and import */

  async openParents() {
    const { ParentsView } = await import('./ui/parents.js');
    this.world.clearKeys();
    this.parents?.close();
    this.parents = new ParentsView(this.root, { progress: this.progress, account: this.account, onClose: () => (this.parents = null) });
  }

  offerImport() {
    const g = this.progress.guestToImport;
    const card = el('div', 'arc-modal', null, { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('import.aria') });
    const box = el('div', 'arc-modal__card');
    box.append(el('h2', null, t('import.title')), el('p', null, t('import.text', { stars: g.stars, lessons: g.lessons })));
    const row = el('div', 'arc-modal__row');
    const yes = el('button', 'arc-btn arc-btn--primary', t('import.yes'), { type: 'button' });
    const no = el('button', 'arc-btn', t('import.no'), { type: 'button' });
    yes.addEventListener('click', async () => {
      yes.disabled = true;
      try {
        await this.progress.importGuest();
        this.hud.toast(t('import.done'), { icon: '⭐' });
      } catch (error) {
        this.hud.toast(error.message, { icon: '⚠️' });
      }
      card.remove();
    });
    no.addEventListener('click', () => {
      this.progress.skipImport();
      card.remove();
    });
    row.append(no, yes);
    box.append(row);
    card.append(box);
    this.root.append(card);
    yes.focus();
  }

  /* ---------------------------------------------------------------- keys */

  _keys() {
    this._onKey = (e) => {
      if (e.target.closest?.('input, textarea, [contenteditable]')) return;
      if (this.help?.isOpen) {
        if (['KeyH', 'KeyI', 'Escape'].includes(e.code)) {
          e.preventDefault();
          this.help.close();
        }
        return;
      }
      if (this.mode === 'lesson') return this.lesson?.key?.(e);
      if (this.mode !== 'world' || this.parents || this.root.querySelector('.arc-modal, .arc-boss, .arc-side, .hp')) return;
      if (['KeyH', 'KeyI'].includes(e.code)) {
        e.preventDefault();
        this.openHelp();
        return;
      }
      if (this.world.camAssist?.key(e.code, true)) {
        e.preventDefault();
        return;
      }
      const moveKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
      if (moveKeys.includes(e.code) && !e.target.closest?.('button, a, nav')) {
        e.preventDefault();
        this.world.keyDown(e.code);
        return;
      }
      if (e.code === 'Enter' && !e.target.closest?.('button, a')) {
        const b = this.world.nearDoor() ?? this.world.selected;
        if (b) this.world.nearDoor() ? this.enter(b.subject, b.floor) : this.world.select(b, true);
      }
      // B: back to your buddy (H is How to play).
      if (e.code === 'KeyB') this.world.home();
      // O: the whole mountain (the map key in every 3D game).
      if (e.code === 'KeyO') this.world.overview();
      if (e.code === 'KeyN') this.setNight(!this.prefs.night);
      if (e.code === 'KeyM') this.setSound(!this.prefs.sound);
      if (e.code === 'Equal' || e.code === 'NumpadAdd') this.world.zoom(0.75);
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.world.zoom(1.33);
      if (e.code === 'Escape') this.world.select(null);
    };
    this._onKeyUp = (e) => {
      this.world?.keyUp(e.code);
      this.world?.camAssist?.key(e.code, false);
    };
    this._onBlur = () => this.world?.clearKeys();
    this.root.addEventListener('keydown', this._onKey);
    this.root.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.power?.dispose();
    this._modals?.disconnect();
    this.progress.flush();
    this._resize?.disconnect();
    window.removeEventListener('blur', this._onBlur);
    this.lesson?.dispose();
    this.parents?.close();
    this.world?.dispose();
    this.help?.dispose();
    this.hud?.dispose();
    this.stage?.dispose();
    this.sound.dispose();
    this.root.remove();
    if (window.arcademia === this) delete window.arcademia;
    this.onClose?.();
  }
}

export { LESSONS };
