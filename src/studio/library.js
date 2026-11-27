/**
 * The Studio's asset side: the free asset browser (characters, models, backgrounds, sounds,
 * music — each with its licence and credit, previewable, "Use in my game"), the character
 * maker (procedural and instant; heavy AI generation is queued for the generation server),
 * and the store (share for free, or sell on the Creator plan — test-mode payments).
 */
import { studio } from './studioClient.js';
import { button, el, modal, priceText, viewSlot } from './ui.js';
import { ACCESSORIES, BODIES, SFX_EVENTS, bodyColors } from '../shared/studio/spec.js';
import { SOUND_INFO, playSound } from '../shared/studio/sfx.js';
import { characterThumbnail, mountCharacterPreview, mountModelPreview } from '../shared/studio/preview.js';

const KINDS = [['character', 'Characters'], ['model', '3D models'], ['background', 'Backgrounds'], ['sfx', 'Sound effects'], ['music', 'Music']];
const libraryUrl = (file) => `./library/${String(file).split('/').map(encodeURIComponent).join('/')}`;
const BIOME_SWATCH = { meadow: '#7cc45a', forest: '#4f8a3c', snow: '#eef4fb', desert: '#e8c88a', beach: '#f2dca0', cave: '#4a4458', castle: '#8a8478', lava: '#3a2a2a', city: '#a0a4ac', space: '#1a1a3a', swamp: '#5a6a38', candy: '#ffc8e0' };

/** Pick one of my games (and, for some assets, a map/role/event) — resolves { code, … } or null. */
async function pickGame(page, asset) {
  let games;
  try {
    games = await studio.games();
  } catch (error) {
    page.fail(error);
    return null;
  }
  if (!games.length) {
    page.toast('Make a game first (✨ New game).', { error: true });
    return null;
  }
  const select = el('select', { class: 'st-input', 'aria-label': 'Which game' }, games.map((g) => el('option', { value: g.code, text: g.title, selected: g.code === page._lastGame })));
  const body = el('div', {}, el('label', { class: 'st-field' }, 'Game ', select));
  let extra = null;
  if (asset.kind === 'sfx') {
    extra = el('select', { class: 'st-input', 'aria-label': 'Plays when' }, SFX_EVENTS.map((e) => el('option', { value: e, text: e, selected: e === asset.event })));
    body.append(el('label', { class: 'st-field' }, 'Plays when: ', extra));
  } else if (asset.kind === 'character') {
    extra = el('select', { class: 'st-input', 'aria-label': 'Role' }, ['npc', 'enemy', 'boss', 'ally'].map((r) => el('option', { value: r, text: { npc: 'Helper who talks', enemy: 'Monster', boss: 'Boss', ally: 'Friend who follows' }[r], selected: r === (asset.character?.role ?? 'npc') })));
    body.append(el('label', { class: 'st-field' }, 'As: ', extra));
  }
  body.append(el('p', { class: 'st-note', text: `${asset.licenceLabel ?? asset.licence} — ${asset.author}. The credit is added to the game for you.` }));
  const ok = await modal(page.root, { title: `Use “${asset.name}”`, body, buttons: [['Cancel', null], ['Add to game', true, 'primary']] });
  if (!ok) return null;
  page._lastGame = select.value;
  return { code: select.value, event: asset.kind === 'sfx' ? extra.value : undefined, role: asset.kind === 'character' ? extra.value : undefined };
}

async function useInGame(page, asset) {
  const pick = await pickGame(page, asset);
  if (!pick) return;
  try {
    const out = await studio.useAsset(pick.code, asset.id, { event: pick.event, role: pick.role });
    page.toast(out.changes.join(' · ') || 'Already in the game');
  } catch (error) {
    page.fail(error);
  }
}

/* ------------------------------------------------------------------ assets */

export class AssetBrowser {
  constructor(page, { code = null } = {}) {
    this.page = page;
    if (code) page._lastGame = code;
    this.kind = 'character';
    this.q = '';
    this.root = el('div', { class: 'st-assets' });
  }

  load() {
    const tabs = el('div', { class: 'st-subtabs' });
    for (const [id, label] of KINDS) tabs.append(button(label, () => {
      this.kind = id;
      for (const b of tabs.children) b.classList.toggle('is-active', b.dataset.kind === id);
      this.fetch();
    }, { data: { kind: id } }));
    tabs.firstElementChild.classList.add('is-active');
    const search = el('input', { class: 'st-input', type: 'search', placeholder: 'Search (snow, knight, calm…)', 'aria-label': 'Search assets' });
    let typing = null;
    search.addEventListener('input', () => {
      clearTimeout(typing);
      typing = setTimeout(() => {
        this.q = search.value.trim();
        this.fetch();
      }, 250);
    });
    this.grid = el('div', { class: 'st-cards st-cards--4' });
    this.more = el('div', { class: 'st-row' });
    this.root.replaceChildren(
      el('div', { class: 'st-row st-row--between' }, el('h2', { text: 'Free assets' }), search),
      el('p', { class: 'st-note', text: 'Only assets anyone may use in a game they share: CC0, CC BY (credited for you), MIT/Apache, and Gamory’s own. Each shows its licence and who made it.' }),
      tabs, this.grid, this.more);
    return this.fetch();
  }

  async fetch(offset = 0) {
    if (!offset) {
      this.page.previews.release();
      this.grid.replaceChildren(el('p', { class: 'st-note', text: 'Loading…' }));
    }
    let got;
    try {
      got = await studio.assets({ kind: this.kind, q: this.q, offset, limit: 32 });
    } catch (error) {
      return this.page.fail(error);
    }
    if (!offset) this.grid.replaceChildren();
    if (!got.total) this.grid.append(el('p', { class: 'st-note', text: this.kind === 'model' || this.kind === 'background' ? 'Nothing here — the 3D library may not be downloaded on this server yet (npm run library:fetch).' : 'Nothing matches.' }));
    for (const a of got.items) this.grid.append(this.card(a));
    this.more.replaceChildren();
    if (offset + got.items.length < got.total) this.more.append(button(`More (${got.total - offset - got.items.length} left)`, () => this.fetch(offset + got.items.length)));
  }

  card(a) {
    const slot = viewSlot(a.name);
    const live = () => {
      if (a.kind === 'character' && a.character) return this.page.previews.activate(slot, async (host) => mountCharacterPreview(host, { ...a.character, id: 'p', size: 1, speed: 3, health: 1, damage: 0, behaviour: 'idle', line: '', model: null }, { look: a.character.base === 'toon' ? 'cartoon' : 'realistic', animation: a.character.base === 'pixel' ? 'pixel' : a.character.base === 'toon' ? 'toon' : 'plush', sprite: a.character.base === 'pixel' }));
      if ((a.kind === 'character' || a.kind === 'model') && a.file) return this.page.previews.activate(slot, async (host) => mountModelPreview(host, libraryUrl(a.file)));
      return null;
    };
    const still = el('img', { class: 'st-view__still', alt: '', loading: 'lazy' });
    if (a.kind === 'character' && a.character) {
      try {
        still.src = characterThumbnail({ ...a.character, id: 'p', size: 1, speed: 3, health: 1, damage: 0, behaviour: 'idle', line: '', model: null }, { look: a.character.base === 'toon' ? 'cartoon' : 'realistic' });
        slot.prepend(still);
      } catch {
        /* no WebGL: the card still works */
      }
    } else if (a.kind === 'texture' && a.file) {
      still.src = libraryUrl(a.file);
      slot.prepend(still);
    } else if (a.kind === 'backdrop') {
      slot.style.background = `linear-gradient(#9ad0ff, ${BIOME_SWATCH[a.biome] ?? '#7cc45a'} 60%)`;
    }
    const play = a.kind === 'sfx'
      ? button('▶ Play', () => playSound(a.id.slice(4)), { kind: 'small' })
      : a.kind === 'music'
        ? (() => {
            const audio = el('audio', { controls: true, preload: 'none', src: `./${a.file}` });
            audio.addEventListener('play', () => this.page.root.querySelectorAll('audio').forEach((x) => x !== audio && x.pause()));
            return audio;
          })()
        : null;
    const node = el('div', { class: 'st-card st-card--asset' },
      a.kind === 'sfx' || a.kind === 'music' ? el('div', { class: 'st-card__sound', text: a.kind === 'sfx' ? '🔊' : '🎵' }) : slot,
      el('span', { class: 'st-card__name', text: a.name }),
      el('span', { class: 'st-licence', title: a.licence, text: a.licenceLabel ?? a.licence }),
      el('span', { class: 'st-card__blurb' }, a.url ? el('a', { href: a.url, target: '_blank', rel: 'noopener noreferrer', text: a.author }) : a.author),
      el('div', { class: 'st-row' }, play, button('Use in my game', () => useInGame(this.page, a), { kind: 'small' })));
    slot.addEventListener('pointerenter', live);
    slot.addEventListener('click', live);
    return node;
  }

  dispose() {
    this.page.previews.release();
  }
}

/* -------------------------------------------------------------- characters */

const BASES = [['plush', 'Plush', 'realistic', 'plush'], ['pixel', 'Pixel', 'stylized', 'pixel'], ['toon', '3D toon', 'cartoon', 'toon']];

export class CharacterMaker {
  constructor(page) {
    this.page = page;
    this.root = el('div', { class: 'st-maker' });
    this.c = { id: 'new', name: 'Pip', role: 'npc', base: 'plush', body: 'bunny', colors: bodyColors('bunny'), accessories: ['scarf'], size: 1, speed: 3, health: 3, damage: 0, behaviour: 'wander', line: 'Hello!', model: null };
    this.savedId = null;
  }

  async load() {
    const c = this.c;
    const form = el('div', { class: 'st-maker__form' });
    const name = el('input', { class: 'st-input', maxlength: '40', value: c.name, 'aria-label': 'Name' });
    name.addEventListener('input', () => (c.name = name.value));
    const line = el('input', { class: 'st-input', maxlength: '160', value: c.line, 'aria-label': 'What they say' });
    line.addEventListener('input', () => (c.line = line.value));
    const bases = el('div', { class: 'st-chips' });
    for (const [id, label] of BASES) {
      const b = button(label, () => {
        c.base = id;
        for (const x of bases.children) x.classList.toggle('is-active', x === b);
        this.refresh();
      }, { kind: 'chip' });
      b.classList.toggle('is-active', c.base === id);
      bases.append(b);
    }
    const bodies = el('div', { class: 'st-chips st-chips--small' });
    for (const id of BODIES) {
      const b = button(id, () => {
        c.body = id;
        c.colors = bodyColors(id);
        for (const k of ['main', 'second', 'accent']) colorInputs[k].value = c.colors[k];
        for (const x of bodies.children) x.classList.toggle('is-active', x === b);
        this.refresh();
      }, { kind: 'chip' });
      b.classList.toggle('is-active', c.body === id);
      bodies.append(b);
    }
    const colorInputs = {};
    const colors = el('div', { class: 'st-row' });
    for (const [k, label] of [['main', 'Main'], ['second', 'Belly & face'], ['accent', 'Accent']]) {
      const input = el('input', { type: 'color', value: c.colors[k], 'aria-label': label });
      input.addEventListener('change', () => {
        c.colors = { ...c.colors, [k]: input.value };
        this.refresh();
      });
      colorInputs[k] = input;
      colors.append(el('label', { class: 'st-field' }, input, ` ${label}`));
    }
    const acc = el('div', { class: 'st-chips st-chips--small' });
    for (const id of ACCESSORIES) {
      const b = button(id, () => {
        const has = c.accessories.includes(id);
        if (!has && c.accessories.length >= 3) return this.page.toast('Three accessories at most');
        c.accessories = has ? c.accessories.filter((x) => x !== id) : [...c.accessories, id];
        b.classList.toggle('is-active', !has);
        this.refresh();
      }, { kind: 'chip' });
      b.classList.toggle('is-active', c.accessories.includes(id));
      acc.append(b);
    }
    const size = el('input', { type: 'range', min: '0.6', max: '2', step: '0.1', value: String(c.size), 'aria-label': 'Size' });
    size.addEventListener('change', () => {
      c.size = Number(size.value);
    });
    form.append(
      el('label', { class: 'st-field' }, 'Name ', name),
      el('div', { class: 'st-field' }, 'Base kit', bases),
      el('div', { class: 'st-field' }, 'Body', bodies),
      el('div', { class: 'st-field' }, 'Colours', colors),
      el('div', { class: 'st-field' }, 'Accessories (up to 3)', acc),
      el('label', { class: 'st-field' }, 'Size ', size),
      el('label', { class: 'st-field' }, 'Says ', line),
      el('div', { class: 'st-row' },
        button('💾 Save', () => this.save(), { kind: 'primary' }),
        button('➕ Add to a game', async () => {
          const id = await this.save();
          if (id) useInGame(this.page, { id: `chr:${id}`, kind: 'character', name: c.name, licence: 'Your own character', author: 'you', character: c });
        }),
        button('🛍️ Share in the store', () => this.publish())));
    this.view = viewSlot('Your character');
    this.view.classList.add('st-maker__view');
    this.mine = el('div', { class: 'st-cards st-cards--6' });
    this.jobs = el('div', { class: 'st-gen' });
    this.root.replaceChildren(
      el('h2', { text: 'Character maker' }),
      el('div', { class: 'st-maker__grid' }, form, this.view),
      el('h3', { text: 'My characters' }), this.mine,
      el('h3', { text: 'AI generation' }), this.jobs);
    this.refresh();
    this.loadMine();
    this.loadJobs();
  }

  refresh() {
    const [, , look, animation] = BASES.find(([id]) => id === this.c.base);
    const char = { ...this.c, size: 1 };
    if (this.preview && this.page.previews.active?.slot === this.view) {
      this.preview.update(char, { look, animation, sprite: this.c.base === 'pixel' });
      return;
    }
    this.page.previews.activate(this.view, async (host) => (this.preview = mountCharacterPreview(host, char, { look, animation, sprite: this.c.base === 'pixel' })));
  }

  async save() {
    try {
      const out = await studio.saveCharacter({ ...this.c }, this.savedId);
      this.savedId = out.character.id;
      this.page.toast(`Saved ${out.character.name}`);
      this.loadMine();
      return this.savedId;
    } catch (error) {
      this.page.fail(error);
      return null;
    }
  }

  async publish() {
    const id = this.savedId ?? (await this.save());
    if (!id) return;
    const meta = this.page._meta;
    const canSell = meta.plans.find((p) => p.id === meta.account?.plan)?.studio.sell;
    const title = el('input', { class: 'st-input', maxlength: '60', value: this.c.name });
    const summary = el('textarea', { class: 'st-input', maxlength: '400', rows: '2', placeholder: 'What is special about them?' });
    const price = el('input', { class: 'st-input', type: 'number', min: '0', max: '100000', value: '0', disabled: !canSell });
    const terms = el('select', { class: 'st-input' }, el('option', { value: 'standard', text: 'Buyers may use it in any of their games' }), el('option', { value: 'class-only', text: 'Buyers may use it in private and class games only' }));
    const body = el('div', {},
      el('label', { class: 'st-field' }, 'Title ', title),
      el('label', { class: 'st-field' }, 'About ', summary),
      el('label', { class: 'st-field' }, 'Price in credits (0 = free) ', price),
      el('label', { class: 'st-field' }, 'Licence for buyers ', terms),
      el('p', { class: 'st-note', text: canSell ? 'TEST MODE: sales are recorded, no money moves.' : 'Selling is part of the Creator plan; sharing for free is open to everyone. Free items are “free, credit the creator”.' }),
      el('p', { class: 'st-note', text: 'Everything in the store is checked by the platform team before it appears.' }));
    const ok = await modal(this.page.root, { title: 'Share in the store', body, buttons: [['Cancel', null], ['Send for review', true, 'primary']] });
    if (!ok) return;
    try {
      const out = await this.page.guardian(() => studio.publish({ characterId: id, title: title.value, summary: summary.value, price: Number(price.value) || 0, terms: terms.value }));
      this.page.toast(out.note);
    } catch (error) {
      this.page.fail(error);
    }
  }

  async loadMine() {
    let list;
    try {
      list = await studio.characters();
    } catch (error) {
      return this.page.fail(error);
    }
    this.mine.replaceChildren();
    if (!list.length) this.mine.append(el('p', { class: 'st-note', text: 'Saved characters show here.' }));
    for (const ch of list) {
      let src = '';
      try {
        src = characterThumbnail(ch, { look: ch.base === 'toon' ? 'cartoon' : 'realistic' });
      } catch {
        src = '';
      }
      this.mine.append(el('div', { class: 'st-card st-card--mini' },
        src ? el('img', { src, alt: '', class: 'st-thumb' }) : null,
        el('span', { class: 'st-card__name', text: ch.name }),
        el('div', { class: 'st-row' },
          button('Edit', () => {
            this.c = { ...this.c, ...ch, id: 'new' };
            this.savedId = ch.id;
            this.load();
          }, { kind: 'small' }),
          button('✕', async () => {
            if (!(await this.page.confirm('Delete?', `Delete ${ch.name}? Games that use them keep their copy.`, 'Delete'))) return;
            await studio.deleteCharacter(ch.id).catch((e) => this.page.fail(e));
            this.loadMine();
          }, { kind: 'small', title: 'Delete' }))));
    }
  }

  async loadJobs() {
    const meta = this.page._meta;
    const kind = el('select', { class: 'st-input st-input--small', 'aria-label': 'Kind' }, el('option', { value: 'picture-to-3d', text: 'Picture → 3D model' }), el('option', { value: 'voice', text: 'A voice' }), el('option', { value: 'music', text: 'Music' }));
    const prompt = el('input', { class: 'st-input', maxlength: '400', placeholder: 'Describe it (e.g. a cheerful orange fox knight)', 'aria-label': 'Describe it' });
    const list = el('ul', { class: 'st-list' });
    this.jobs.replaceChildren(
      el('p', { class: 'st-note', text: meta.generation ? 'Heavy AI generation runs on our generation server, not here: jobs wait in a queue. Your plan sets how many you get a month.' : 'Coming soon: picture-to-3D, voices and music made by AI on our generation server. The character maker above works now, for free.' }),
      el('div', { class: 'st-row' }, kind, prompt, button('Queue', async () => {
        try {
          await studio.queueJob(kind.value, prompt.value);
          prompt.value = '';
          this.loadJobs();
        } catch (error) {
          if (error.comingSoon) this.page.toast(error.message);
          else this.page.fail(error);
        }
      }, { kind: 'small', disabled: !meta.generation })),
      list);
    try {
      const got = await studio.jobs();
      for (const j of got.jobs) list.append(el('li', { text: `${j.kind}: “${j.prompt}” — ${j.status}` }));
    } catch {
      /* signed out or old server */
    }
  }

  dispose() {
    this.page.previews.release();
    this.preview = null;
  }
}

/* -------------------------------------------------------------------- store */

export class StoreView {
  constructor(page) {
    this.page = page;
    this.root = el('div', { class: 'st-store' });
    this.sub = 'browse';
    this.params = { q: '', sort: 'new', free: '' };
  }

  load() {
    const tabs = el('div', { class: 'st-subtabs' });
    for (const [id, label] of [['browse', 'Browse'], ['purchases', 'My things'], ['sales', 'My sales']]) {
      const b = button(label, () => {
        this.sub = id;
        for (const x of tabs.children) x.classList.toggle('is-active', x === b);
        this.draw();
      });
      b.classList.toggle('is-active', id === this.sub);
      tabs.append(b);
    }
    this.body = el('div');
    this.root.replaceChildren(el('div', { class: 'st-row st-row--between' }, el('h2', { text: 'Store' }), el('span', { class: 'studio__test', text: 'TEST MODE — no real payments' })), tabs, this.body);
    return this.draw();
  }

  async draw() {
    this.page.previews.release();
    if (this.sub === 'purchases') return this.drawPurchases();
    if (this.sub === 'sales') return this.drawSales();
    const search = el('input', { class: 'st-input', type: 'search', placeholder: 'Search the store', value: this.params.q, 'aria-label': 'Search the store' });
    const sort = el('select', { class: 'st-input st-input--small', 'aria-label': 'Sort' }, ['new', 'popular', 'price'].map((s) => el('option', { value: s, text: { new: 'Newest', popular: 'Popular', price: 'Price' }[s], selected: this.params.sort === s })));
    const free = el('select', { class: 'st-input st-input--small', 'aria-label': 'Price' }, [['', 'Free and paid'], ['1', 'Free'], ['0', 'Paid']].map(([v, t]) => el('option', { value: v, text: t, selected: this.params.free === v })));
    const grid = el('div', { class: 'st-cards st-cards--4' });
    const go = async () => {
      this.params = { q: search.value.trim(), sort: sort.value, free: free.value };
      grid.replaceChildren(el('p', { class: 'st-note', text: 'Loading…' }));
      let list;
      try {
        list = await studio.store(this.params);
      } catch (error) {
        return this.page.fail(error);
      }
      grid.replaceChildren();
      if (!list.length) grid.append(el('p', { class: 'st-note', text: 'Nothing here yet. Make a character and share it!' }));
      for (const l of list) grid.append(this.card(l));
    };
    search.addEventListener('change', go);
    sort.addEventListener('change', go);
    free.addEventListener('change', go);
    this.body.replaceChildren(el('div', { class: 'st-row' }, search, sort, free), grid);
    return go();
  }

  card(l) {
    let src = '';
    try {
      src = characterThumbnail(l.data, { look: l.data.base === 'toon' ? 'cartoon' : 'realistic' });
    } catch {
      src = '';
    }
    return el('button', { type: 'button', class: 'st-card', onclick: () => this.detail(l.id) },
      src ? el('img', { src, alt: '', class: 'st-thumb' }) : null,
      el('span', { class: 'st-card__name', text: l.title }),
      el('span', { class: 'st-card__blurb', text: `by ${l.creator}` }),
      el('span', { class: 'st-price', text: priceText(l.display) }));
  }

  async detail(id) {
    let got;
    try {
      got = await studio.listing(id);
    } catch (error) {
      return this.page.fail(error);
    }
    const l = got.listing;
    const slot = viewSlot(l.title);
    slot.classList.add('st-view--big');
    const termsText = { 'free-credit': 'Free — use it anywhere, credit the creator', standard: 'Use it in any of your games (not to resell)', 'class-only': 'Use it in private and class games only' }[l.terms];
    const body = el('div', { class: 'st-detail' }, slot,
      el('div', {},
        el('p', { text: l.summary || 'No description.' }),
        el('p', {}, el('b', { text: 'By ' }), l.creator),
        el('p', {}, el('b', { text: 'Licence: ' }), termsText),
        el('p', {}, el('b', { text: 'Price: ' }), priceText(l.display), got.yourPrice && l.price && got.yourPrice.credits !== l.price ? ` — on your plan: ${priceText(got.yourPrice)}` : ''),
        el('p', { class: 'st-note', text: 'TEST MODE: buying records it on your account; no money moves.' })));
    this.page.previews.activate(slot, async (host) => mountCharacterPreview(host, { ...l.data, size: 1 }, { look: l.data.base === 'toon' ? 'cartoon' : 'realistic', animation: l.data.base === 'pixel' ? 'pixel' : l.data.base === 'toon' ? 'toon' : 'plush', sprite: l.data.base === 'pixel' }));
    const buttons = [['Close', null]];
    if (!l.mine) buttons.push(['Report', 'report']);
    if (got.owned) buttons.push(['Use in my game', 'use', 'primary']);
    else if (!l.mine) buttons.push([l.price ? 'Buy (test mode)' : 'Get it free', 'buy', 'primary']);
    const choice = await modal(this.page.root, { title: l.title, body, buttons, wide: true });
    this.page.previews.release();
    const asset = { id: `mkt:${l.id}`, kind: 'character', name: l.title, licence: termsText, author: l.creator, character: l.data };
    if (choice === 'buy') {
      try {
        const out = await this.page.guardian(() => studio.buy(l.id));
        this.page.toast(out.purchase.paid ? `Bought for ${out.purchase.paid} credits (test mode — nothing was charged).` : 'It is yours!');
        useInGame(this.page, asset);
      } catch (error) {
        this.page.fail(error);
      }
    } else if (choice === 'use') useInGame(this.page, asset);
    else if (choice === 'report') {
      const reason = el('textarea', { class: 'st-input', rows: '3', maxlength: '300', placeholder: 'What is wrong with it?' });
      const why = await modal(this.page.root, { title: 'Report this item', body: el('div', {}, reason), buttons: [['Cancel', null], ['Report', () => reason.value, 'primary']] });
      if (why) {
        try {
          await studio.report(l.id, why);
          this.page.toast('Thank you — the platform team will look at it.');
        } catch (error) {
          this.page.fail(error);
        }
      }
    }
  }

  async drawPurchases() {
    let list;
    try {
      list = await studio.purchases();
    } catch (error) {
      return this.page.fail(error);
    }
    const grid = el('div', { class: 'st-cards st-cards--4' });
    if (!list.length) grid.append(el('p', { class: 'st-note', text: 'Things you get from the store show here.' }));
    for (const p of list) {
      grid.append(el('div', { class: 'st-card' },
        el('span', { class: 'st-card__name', text: p.title }),
        el('span', { class: 'st-card__blurb', text: `by ${p.creator} · ${p.paid ? `${p.paid} credits (test)` : 'free'}` }),
        button('Use in my game', () => useInGame(this.page, { id: `mkt:${p.listing}`, kind: 'character', name: p.title, licence: p.terms, author: p.creator, character: p.data }), { kind: 'small' })));
    }
    this.body.replaceChildren(grid);
  }

  async drawSales() {
    let got;
    try {
      got = await studio.sales();
    } catch (error) {
      return this.page.fail(error);
    }
    const meta = this.page._meta;
    const plan = meta.plans.find((p) => p.id === meta.account?.plan);
    const table = el('table', { class: 'st-table' }, el('tr', {}, ['Item', 'Price', 'Status', 'Sales', 'You earned'].map((h) => el('th', { text: h }))));
    for (const l of got.listings) {
      table.append(el('tr', {}, el('td', { text: l.title }), el('td', { text: l.price ? `${l.price}` : 'free' }), el('td', { text: l.status }), el('td', { text: String(l.sales) }), el('td', { text: `${l.earned} credits` }),
        el('td', {}, l.status !== 'withdrawn' ? button('Withdraw', async () => {
          await studio.withdraw(l.id).catch((e) => this.page.fail(e));
          this.drawSales();
        }, { kind: 'small' }) : null)));
    }
    this.body.replaceChildren(
      el('p', { class: 'st-note', text: plan?.studio.sell ? `On ${plan.name} you keep ${plan.studio.revenueShare}% of each sale. TEST MODE: earnings are recorded, nothing is paid out.` : 'Selling is part of the Creator plan. Free items you share show here too.' }),
      el('p', {}, el('b', { text: `Earned in total: ${got.earned} credits` })),
      el('div', { class: 'st-scroll' }, table));
  }

  dispose() {
    this.page.previews.release();
  }
}

export { SOUND_INFO };
