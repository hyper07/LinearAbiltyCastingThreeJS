/**
 * The Game Studio page (docs/game-studio.md): make a game by picking how it looks, then grow it
 * map by map in a chat box next to its live preview. Free assets, a character maker, a store to
 * share and (test-mode) sell characters, plans, and classes for educators.
 *
 *   const page = new StudioPage(host, { account, signIn, onClose })
 *   page.open('new' | 'games' | 'assets' | 'characters' | 'store' | 'classes' | 'plan' | 'admin', options)
 *
 * The platform shell loads this lazily (App.openStudio); it never imports a game package —
 * Studio games are data played by src/shared/studio/runtime.js.
 */
import './studio.css';
import { studio, withGuardian } from './studioClient.js';
import { PreviewManager, askPin, button, el, esc, modal, toast, viewSlot, ago } from './ui.js';
import { RENDER_OPTIONS, ANIMATION_OPTIONS, LOOK_OPTIONS } from '../shared/studio/styles.js';
import { SAMPLE_CHARACTER, mountCharacterPreview, sampleGame } from '../shared/studio/preview.js';
import { GameEditor } from './editor.js';
import { AssetBrowser, CharacterMaker, StoreView } from './library.js';
import { ClassesView } from './classes.js';

const TABS = [
  ['new', '✨ New game'],
  ['games', '🎮 My games'],
  ['assets', '🧺 Free assets'],
  ['characters', '🧸 Characters'],
  ['store', '🛍️ Store'],
  ['classes', '🏫 Classes'],
  ['plan', '⭐ Plan']
];

export class StudioPage {
  /**
   * @param {HTMLElement} host
   * @param {{ account: () => object|null, signIn: () => void, onClose?: () => void, onOpen?: () => void }} actions
   */
  constructor(host, actions) {
    this.actions = actions;
    this.previews = new PreviewManager();
    this.root = el('div', { class: 'studio', hidden: true });
    this.root.innerHTML = `
      <header class="studio__bar">
        <div class="studio__brand"><span aria-hidden="true">◆</span> Game Studio</div>
        <nav class="studio__tabs" role="tablist" aria-label="Studio" data-tabs></nav>
        <span class="studio__test" title="No real payments: the store and plans run in test mode">TEST MODE</span>
        <button type="button" class="st-btn studio__close" data-close aria-label="Close the Studio">✕</button>
      </header>
      <main class="studio__main" data-main></main>`;
    host.append(this.root);
    this.main = this.root.querySelector('[data-main]');
    const tabs = this.root.querySelector('[data-tabs]');
    for (const [id, label] of TABS) tabs.append(button(label, () => this.open(id), { data: { tab: id } }));
    this.adminTab = button('🛡️ Review', () => this.open('admin'), { data: { tab: 'admin' } });
    this.adminTab.hidden = true;
    tabs.append(this.adminTab);
    this.root.querySelector('[data-close]').addEventListener('click', () => this.close());
    // Typing here never reaches the game behind; Esc closes (unless a box inside wants it).
    this.root.addEventListener('keydown', (e) => {
      if (e.target.closest?.('.sg-root')) return;
      e.stopPropagation();
      if (e.key === 'Escape' && !this.root.querySelector('.st-modal')) this.close();
    });
    this.choice = { render: 'full3d', animation: 'plush', look: 'cartoon', palette: 'bright', genre: 'collect', title: '' };
  }

  get isOpen() {
    return !this.root.hidden;
  }

  account() {
    return this.actions.account?.() ?? null;
  }

  async meta(fresh = false) {
    // Fetched again after signing in or out (the account decides what the Studio shows).
    const changed = (this._meta?.account?.id ?? null) !== (this.account()?.id ?? null);
    if (!this._meta || fresh || changed || this._meta.error) this._meta = await studio.meta().catch((error) => ({ error: error.message }));
    this.adminTab.hidden = !this._meta?.admin;
    return this._meta;
  }

  async open(tab = 'new', options = {}) {
    this.root.hidden = false;
    document.body.classList.add('is-studio');
    this.actions.onOpen?.();
    this.previews.release();
    this.view?.dispose?.();
    this.view = null;
    this.tab = tab;
    for (const b of this.root.querySelectorAll('[data-tab]')) b.classList.toggle('is-active', b.dataset.tab === tab);
    this.main.replaceChildren(el('p', { class: 'st-note', text: 'Loading…' }));
    const meta = await this.meta(options.fresh);
    if (meta.error) {
      this.main.replaceChildren(el('div', { class: 'st-empty' }, el('p', { text: `The Studio server is not reachable: ${meta.error}` })));
      return;
    }
    const signedOut = !meta.account;
    const needsAccount = !['new', 'assets', 'store'].includes(tab);
    if (signedOut && needsAccount) return this.signInCard();
    switch (tab) {
      case 'new': return this.renderNew();
      case 'games': return this.renderGames();
      case 'editor': return this.openEditor(options.code);
      case 'assets': return this.show(new AssetBrowser(this, options));
      case 'characters': return this.show(new CharacterMaker(this, options));
      case 'store': return this.show(new StoreView(this, options));
      case 'classes': return this.show(new ClassesView(this, options));
      case 'plan': return this.renderPlan();
      case 'admin': return this.renderAdmin();
      default: return this.renderNew();
    }
  }

  show(view) {
    this.view = view;
    this.main.replaceChildren(view.root);
    return view.load?.();
  }

  close() {
    this.previews.release();
    this.view?.dispose?.();
    this.view = null;
    this.root.hidden = true;
    document.body.classList.remove('is-studio');
    this.actions.onClose?.();
  }

  signInCard() {
    this.main.replaceChildren(
      el('div', { class: 'st-empty' },
        el('h2', { text: 'Sign in to make games' }),
        el('p', { text: 'Your games, characters and classes are kept on your account. Making private games is free and unlimited.' }),
        button('Sign in', () => {
          this.close();
          this.actions.signIn?.();
        }, { kind: 'primary' }))
    );
  }

  toast(text, options) {
    toast(this.root, text, options);
  }

  /** Show an error the friendly way: plan limits offer the Plan page, sign-in the sign-in. */
  fail(error) {
    if (error?.cancelled) return;
    if (error?.signIn) return this.signInCard();
    this.toast(error?.message ?? String(error), { error: true, ms: 5000 });
    if (error?.upgrade) {
      const link = button('See plans', () => this.open('plan'), { kind: 'link' });
      this.root.querySelector('.st-toast')?.append(' ', link);
    }
  }

  guardian(fn) {
    return withGuardian(fn, () => askPin(this.root));
  }

  /* ------------------------------------------------------------ new game */

  renderNew() {
    const meta = this._meta;
    const c = this.choice;
    const wrap = el('div', { class: 'st-new' });
    const section = (n, title, sub) => el('section', { class: 'st-section' }, el('h2', {}, el('span', { class: 'st-step', text: n }), ` ${title}`), sub ? el('p', { class: 'st-note', text: sub }) : null);

    // 1. How it is drawn.
    const renders = section('1', 'Game style', 'Hover or tap a card to see it move. One preview runs at a time.');
    const renderGrid = el('div', { class: 'st-cards st-cards--4' });
    renders.append(renderGrid);
    // 2. How characters move.
    const anims = section('2', 'Animation style', 'Each is shown on the same sample character.');
    const animGrid = el('div', { class: 'st-cards st-cards--4' });
    anims.append(animGrid);
    // 3. Look.
    const looks = section('3', 'Look', 'The same scene, lit and shaded three ways.');
    const lookGrid = el('div', { class: 'st-cards st-cards--3' });
    looks.append(lookGrid);

    const card = (grid, option, selected, onPick, mount) => {
      const slot = viewSlot(option.name);
      const node = el('button', { type: 'button', class: `st-card ${selected ? 'is-selected' : ''}`, 'aria-pressed': String(selected) },
        slot,
        el('span', { class: 'st-card__name' }, el('span', { 'aria-hidden': 'true', text: option.icon }), ` ${option.name}`),
        el('span', { class: 'st-card__blurb', text: option.blurb }));
      const live = () => this.previews.activate(slot, mount);
      node.addEventListener('pointerenter', live);
      node.addEventListener('focus', live);
      node.addEventListener('click', () => {
        onPick();
        for (const other of grid.children) {
          other.classList.toggle('is-selected', other === node);
          other.setAttribute('aria-pressed', String(other === node));
        }
        live();
      });
      grid.append(node);
      return { node, slot, live };
    };
    const gameMount = (choices) => async (host) => {
      const { mountStudioGame } = await import('../shared/studio/runtime.js');
      return mountStudioGame(host, sampleGame(choices), { mode: 'preview', fullscreen: false });
    };
    const fill = () => {
      this.previews.release();
      renderGrid.replaceChildren();
      animGrid.replaceChildren();
      lookGrid.replaceChildren();
      const first = [];
      for (const o of RENDER_OPTIONS) {
        const k = card(renderGrid, o, c.render === o.id, () => {
          c.render = o.id;
          if (!this._pickedAnim) c.animation = o.suggests.animation;
          if (!this._pickedLook) c.look = o.suggests.look;
          refreshLower();
        }, gameMount({ render: o.id, animation: c.render === o.id ? c.animation : o.suggests.animation, look: c.look }));
        if (c.render === o.id) first.push(k);
      }
      fillLower();
      first[0]?.live();
    };
    const fillLower = () => {
      animGrid.replaceChildren();
      lookGrid.replaceChildren();
      for (const o of ANIMATION_OPTIONS) {
        card(animGrid, o, c.animation === o.id, () => {
          c.animation = o.id;
          this._pickedAnim = true;
        }, async (host) => mountCharacterPreview(host, SAMPLE_CHARACTER, { look: c.look, animation: o.id, sprite: o.id === 'pixel' && (c.render === 'flat2d' || c.render === 'hd2d') }));
      }
      for (const o of LOOK_OPTIONS) {
        card(lookGrid, o, c.look === o.id, () => {
          c.look = o.id;
          this._pickedLook = true;
        }, gameMount({ render: c.render, animation: c.animation, look: o.id }));
      }
    };
    const refreshLower = () => {
      const keep = this.previews.active?.slot;
      fillLower();
      if (keep && !keep.isConnected) this.previews.release();
    };

    // 4. Starter, name, create.
    const finish = section('4', 'Starter and name', 'A starter sets the first map and the goal. You can change everything later by chatting.');
    const starters = el('div', { class: 'st-chips', role: 'radiogroup', 'aria-label': 'Starter' });
    for (const s of meta.starters ?? []) {
      const chip = button(s.name, () => {
        c.genre = s.id;
        for (const x of starters.children) x.classList.toggle('is-active', x === chip);
      }, { kind: 'chip' });
      chip.classList.toggle('is-active', c.genre === s.id);
      starters.append(chip);
    }
    const name = el('input', { class: 'st-input', placeholder: 'My game’s name', maxlength: '60', value: c.title, 'aria-label': 'Game name' });
    name.addEventListener('input', () => (c.title = name.value));
    const create = button('Create my game', async () => {
      if (!this.account() && !meta.account) return this.signInCard();
      if (name.value.trim().length < 2) {
        name.focus();
        return this.toast('Give your game a name first', { error: true });
      }
      create.disabled = true;
      create.textContent = 'Making it…';
      try {
        const made = await studio.create({ title: name.value.trim(), ...c });
        this.toast(`"${made.game.title}" is ready — it is private until you share it.`);
        this.open('editor', { code: made.game.code });
      } catch (error) {
        this.fail(error);
      } finally {
        create.disabled = false;
        create.textContent = 'Create my game';
      }
    }, { kind: 'primary' });
    finish.append(starters, el('div', { class: 'st-row' }, name, create), el('p', { class: 'st-note', text: meta.git ? 'Private games are free and unlimited on every plan.' : 'Note: this server cannot save games (it is not running from a git checkout).' }));

    wrap.append(renders, anims, looks, finish);
    this.main.replaceChildren(wrap);
    fill();
  }

  /* ------------------------------------------------------------- my games */

  async renderGames() {
    const wrap = el('div', { class: 'st-games' }, el('div', { class: 'st-row st-row--between' }, el('h2', { text: 'My games' }), button('✨ New game', () => this.open('new'), { kind: 'primary' })));
    this.main.replaceChildren(wrap);
    let list;
    try {
      list = await studio.games();
    } catch (error) {
      return this.fail(error);
    }
    if (!list.length) {
      wrap.append(el('div', { class: 'st-empty' }, el('p', { text: 'No games yet. Pick a style and make your first one.' })));
      return;
    }
    const grid = el('div', { class: 'st-cards st-cards--3' });
    for (const g of list) {
      grid.append(el('button', { type: 'button', class: 'st-card st-card--game', onclick: () => this.open('editor', { code: g.code }) },
        el('span', { class: 'st-card__name', text: g.title }),
        el('span', { class: `st-badge st-badge--${g.visibility}`, text: g.visibility === 'public' ? `Public · ${g.public_status}` : g.visibility === 'shared' ? 'Shared with a class' : 'Private' }),
        el('span', { class: 'st-card__blurb', text: `Changed ${ago(Number(g.updated))}` })));
    }
    wrap.append(grid);
  }

  async openEditor(code) {
    const editor = new GameEditor(this, code);
    this.view = editor;
    this.main.replaceChildren(editor.root);
    await editor.load();
  }

  /* ----------------------------------------------------------------- plan */

  async renderPlan() {
    const wrap = el('div', { class: 'st-plan' });
    this.main.replaceChildren(wrap);
    let plan;
    try {
      plan = await studio.plan();
    } catch (error) {
      return this.fail(error);
    }
    const meta = this._meta;
    const meter = (label, used, limit, unit = '') => {
      const frac = limit == null ? 0.05 : limit === 0 ? 1 : Math.min(1, used / limit);
      return el('div', { class: 'st-meter' },
        el('div', { class: 'st-row st-row--between' }, el('span', { text: label }), el('b', { text: `${used}${unit} / ${limit == null ? 'unlimited' : `${limit}${unit}`}` })),
        el('div', { class: 'st-meter__bar' }, el('i', { style: { width: `${Math.round(frac * 100)}%` } })));
    };
    const u = plan.used;
    const l = plan.limits;
    wrap.append(
      el('div', { class: 'st-banner', text: 'Payments are in TEST MODE: plans and store purchases are recorded, but no money is taken and no card is asked for.' }),
      el('h2', { text: `Your plan: ${meta.plans.find((p) => p.id === plan.plan)?.name ?? plan.plan}` }),
      el('div', { class: 'st-meters' },
        meter('Chat changes today', u.chatEditsToday, l.chatEditsPerDay),
        meter('AI generations this month', u.generationsThisMonth, l.generationsPerMonth),
        meter('Public games', u.publicGames, l.publicGames),
        meter('Private and class games', u.privateGames, l.privateGames),
        meter('Classes', u.classes, l.classes),
        meter('Studio space', Math.round((u.storageBytes / 1048576) * 10) / 10, l.storageMB, ' MB'))
    );
    const rows = [
      ['Private & class games', (s) => (s.privateGames == null ? 'Unlimited' : s.privateGames)],
      ['Public games', (s) => (s.publicGames == null ? 'Unlimited' : s.publicGames)],
      ['Chat changes a day', (s) => s.chatEditsPerDay],
      ['AI generations a month', (s) => s.generationsPerMonth],
      ['Paid store items', (s) => (s.assetDiscount ? `${s.assetDiscount}% off` : 'Full price')],
      ['Sell in the store', (s) => (s.sell ? `Yes — you keep ${s.revenueShare}%` : 'Share for free')],
      ['Studio space', (s) => `${s.storageMB >= 1000 ? `${s.storageMB / 1000} GB` : `${s.storageMB} MB`}`],
      ['Classes at once', (s) => s.classes]
    ];
    const table = el('table', { class: 'st-table' });
    const head = el('tr', {}, el('th', { text: '' }));
    for (const p of meta.plans) head.append(el('th', {}, el('div', { text: p.name }), el('small', { text: p.price.krw ? `₩${p.price.krw.toLocaleString()} · $${p.price.usd} / month` : 'Free' })));
    table.append(head);
    for (const [label, f] of rows) {
      const tr = el('tr', {}, el('th', { text: label }));
      for (const p of meta.plans) tr.append(el('td', { text: String(f(p.studio)) }));
      table.append(tr);
    }
    const act = el('tr', {}, el('th', { text: '' }));
    for (const p of meta.plans) {
      const current = p.id === plan.plan;
      act.append(el('td', {}, current ? el('b', { text: 'Your plan' }) : button(p.price.krw ? `Switch (test)` : 'Switch to Free', async () => {
        try {
          await this.guardian(() => studio.upgrade(p.id));
          this.toast(`You are on ${p.name} now (test mode — nothing was charged).`);
          await this.meta(true);
          this.renderPlan();
        } catch (error) {
          this.fail(error);
        }
      }, { kind: p.price.krw ? 'primary' : '' })));
    }
    table.append(act);
    wrap.append(el('h3', { text: 'Plans' }), el('div', { class: 'st-scroll' }, table));
    if (plan.hasPin) wrap.append(el('p', { class: 'st-note', text: 'This account has a family PIN: changing to a paid plan, buying and selling ask a grown-up for it.' }));
  }

  /* ---------------------------------------------------------------- admin */

  async renderAdmin() {
    const wrap = el('div', { class: 'st-admin' }, el('h2', { text: 'Review (admin)' }));
    this.main.replaceChildren(wrap);
    let q;
    try {
      q = await studio.adminQueue();
    } catch (error) {
      return this.fail(error);
    }
    const again = () => this.renderAdmin();
    const act = (fn, done) => async () => {
      try {
        const out = await fn();
        if (out?.next) this.toast(out.next);
        else if (done) this.toast(done);
        again();
      } catch (error) {
        this.fail(error);
      }
    };
    wrap.append(el('h3', { text: `Store items waiting (${q.listings.length})` }));
    if (!q.listings.length) wrap.append(el('p', { class: 'st-note', text: 'Nothing waiting.' }));
    for (const l of q.listings) {
      wrap.append(el('div', { class: 'st-item' },
        el('div', {}, el('b', { text: l.title }), ` by ${l.creator} · ${l.price ? `${l.price} credits` : 'free'} · ${l.status}${l.reports ? ` · ${l.reports} reports` : ''}`, el('div', { class: 'st-note', text: l.summary })),
        el('div', { class: 'st-row' }, button('Approve', act(() => studio.moderate(l.id, 'listed'), 'Listed'), { kind: 'primary' }), button('Hide', act(() => studio.moderate(l.id, 'hidden'), 'Hidden')), button('Reject', act(() => studio.moderate(l.id, 'rejected'), 'Rejected')))));
    }
    wrap.append(el('h3', { text: `Reports (${q.reports.length})` }));
    for (const r of q.reports) {
      wrap.append(el('div', { class: 'st-item' }, el('div', {}, el('b', { text: r.title ?? r.game_code ?? 'game' }), ` — ${r.reason}`), button('Close', act(() => studio.closeReport(r.id), 'Closed'))));
    }
    wrap.append(el('h3', { text: `Games asking to be public (${q.publicGames.length})` }), el('p', { class: 'st-note', text: 'Approve, then open the game on the home page (it shows to you as DRAFT) and use Changes & deploy to release it.' }));
    for (const g of q.publicGames) {
      wrap.append(el('div', { class: 'st-item' }, el('div', {}, el('b', { text: g.title }), ` by ${g.owner} · ${g.code}`),
        el('div', { class: 'st-row' }, button('Approve', act(() => studio.reviewGame(g.code, true)), { kind: 'primary' }), button('Reject', act(() => studio.reviewGame(g.code, false))))));
    }
  }

  /** Play a Studio game full screen (an owner's draft, or a class's shared version). */
  async playFull(code, { classId = null } = {}) {
    try {
      const got = await studio.play(code, classId);
      this.previews.release();
      const { mountStudioGame } = await import('../shared/studio/runtime.js');
      this.root.classList.add('is-playing');
      await mountStudioGame(document.body, got.data, {
        mode: 'play',
        title: got.title,
        onExit: () => {
          this.root.classList.remove('is-playing');
          this.view?.resume?.();
        }
      });
      if (classId) studio.played(code, classId).catch(() => {});
    } catch (error) {
      this.root.classList.remove('is-playing');
      this.fail(error);
    }
  }

  /** A friendly "are you sure" (resolves true/false). */
  async confirm(title, text, ok = 'OK') {
    return (await modal(this.root, { title, body: `<p>${esc(text)}</p>`, buttons: [['Cancel', false], [ok, true, 'primary']] })) === true;
  }
}
