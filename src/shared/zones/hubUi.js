/**
 * The hub's screens, shared by every game: the Safe label, the guide's
 * board (what's in this zone, what you've found, tips, story hooks), the
 * waystone's list of hubs, the stash (bag on one side, storage on the other:
 * click to move, sort, compare), a small shop for games without one, and a
 * plain stats sheet. DOM only; each game themes them with `accent` and hands
 * them its own words and items.
 *
 * Every panel takes the keyboard while it's open (Esc or its key closes it)
 * and calls onOpen / onClose so the game can hold still behind it.
 */

const CSS = `
.hub-safe{position:absolute;z-index:7;left:50%;top:14px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;padding:5px 14px 5px 10px;border-radius:999px;background:rgba(14,22,14,.72);box-shadow:0 0 0 1.5px rgba(150,240,170,.65) inset,0 4px 14px rgba(0,0,0,.35);color:#dfffe4;font:600 13px/1 system-ui,sans-serif;letter-spacing:.04em;pointer-events:none;transition:opacity .4s ease}
.hub-safe[hidden]{display:flex;opacity:0}
.hub-safe b{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#7ee08f;color:#0c2010;font-size:11px}
.hub-safe span{opacity:.8;font-weight:500}
.hubp{position:absolute;inset:0;z-index:65;display:grid;place-items:center;background:rgba(6,6,10,.5);backdrop-filter:blur(2px);font:14px/1.4 system-ui,sans-serif;color:#f6eedc;--acc:#ffd77a}
.hubp__card{width:min(var(--w,620px),94vw);max-height:88vh;overflow:auto;padding:16px 20px 18px;border-radius:16px;background:rgba(24,20,16,.97);box-shadow:0 0 0 2px color-mix(in srgb,var(--acc) 40%,transparent) inset,0 18px 50px rgba(0,0,0,.55)}
.hubp__head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:8px}
.hubp h2{margin:0;font-size:1.3em;color:var(--acc)}
.hubp h3{margin:12px 0 6px;font-size:.82em;letter-spacing:.08em;text-transform:uppercase;color:var(--acc);opacity:.9}
.hubp p{margin:4px 0}
.hubp ul{margin:0;padding-left:18px}
.hubp button{font:inherit;color:inherit;background:rgba(255,255,255,.08);border:1px solid color-mix(in srgb,var(--acc) 55%,transparent);border-radius:8px;padding:.35em .8em;cursor:pointer}
.hubp button:hover:not(:disabled){background:rgba(255,255,255,.18)}
.hubp button:disabled{opacity:.45;cursor:default}
.hubp button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.hubp__close{flex:none}
.hubp__counts{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}
.hubp__counts div{padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.06)}
.hubp__counts b{display:block;font-size:1.25em;color:var(--acc)}
.hubp__rows{display:grid;gap:6px}
.hubp__row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 10px;border-radius:9px;background:rgba(255,255,255,.06)}
.hubp__row small{display:block;opacity:.7}
.hubp__row.is-here{box-shadow:0 0 0 1px var(--acc) inset}
.hubp__grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.hubp__slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:5px}
.hubp__slot{position:relative;aspect-ratio:1;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);display:grid;place-items:center;padding:0;overflow:hidden;font-size:11px}
.hubp__slot img,.hubp__slot canvas{width:100%;height:100%;object-fit:contain}
.hubp__slot em{position:absolute;right:3px;bottom:1px;font-style:normal;font-weight:700;text-shadow:0 1px 2px #000}
.hubp__slot i{font-style:normal;font-size:20px}
.hubp__slot.is-sel{outline:2px solid var(--acc)}
.hubp__tip{min-height:3.2em;margin-top:10px;padding:8px 10px;border-radius:9px;background:rgba(255,255,255,.05);font-size:.92em;white-space:pre-line}
.hubp__bar{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.hubp__stats{display:grid;grid-template-columns:auto 1fr;gap:3px 14px}
.hubp__stats dt{opacity:.75}
.hubp__stats dd{margin:0;font-weight:600}
.hubp__story{padding:8px 10px;border-radius:9px;border:1px dashed color-mix(in srgb,var(--acc) 45%,transparent);opacity:.9}
@media (max-width:640px){.hubp__grid2{grid-template-columns:1fr}}
`;
let styled = false;
function styles() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.dataset.hubUi = '';
  s.textContent = CSS;
  document.head.append(s);
}

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The Safe label: shown while you stand in a hub. */
export class SafeBadge {
  constructor(host) {
    styles();
    this.el = document.createElement('div');
    this.el.className = 'hub-safe';
    this.el.dataset.hubSafe = '';
    this.el.setAttribute('role', 'status');
    this.el.hidden = true;
    this.el.innerHTML = '<b>✓</b>Safe<span></span>';
    host.append(this.el);
  }

  set(on, name = '') {
    this.el.hidden = !on;
    this.el.lastChild.textContent = on && name ? ` · ${name}` : '';
  }

  get shown() {
    return !this.el.hidden;
  }

  dispose() {
    this.el.remove();
  }
}

/** A hub panel's shell: a card with a title and a close button; keys stay inside; Esc closes. */
export class HubPanel {
  constructor(host, { kind, title, accent = '#ffd77a', width = 620, closeKeys = [], onOpen = () => {}, onClose = () => {} }) {
    styles();
    this.onClose = onClose;
    const el = document.createElement('div');
    el.className = 'hubp';
    el.dataset.hubPanel = kind;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', title);
    el.style.setProperty('--acc', accent);
    el.style.setProperty('--w', `${width}px`);
    el.innerHTML = `<div class="hubp__card"><div class="hubp__head"><h2></h2><button type="button" class="hubp__close" data-hub-close>Close (Esc)</button></div><div class="hubp__body"></div></div>`;
    el.querySelector('h2').textContent = title;
    this.el = el;
    this.body = el.querySelector('.hubp__body');
    el.querySelector('[data-hub-close]').addEventListener('click', () => this.close());
    el.addEventListener('pointerdown', (e) => {
      if (e.target === el) this.close();
      e.stopPropagation();
    });
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.code === 'Escape' || closeKeys.includes(e.code)) {
        e.preventDefault();
        this.close();
      }
    });
    el.addEventListener('keyup', (e) => e.stopPropagation());
    host.append(el);
    onOpen();
    el.tabIndex = -1;
    el.focus();
  }

  get open() {
    return Boolean(this.el.isConnected);
  }

  close() {
    if (!this.el.isConnected) return;
    this.el.remove();
    this.onClose();
  }
}

/**
 * The guide's board. `info`: { zone, sub, about, tips: [], contents: [{ label, items: [] }],
 * counters: [{ kind, done, total }], story: [{ title, text }] }.
 */
export function infoPanel(host, info, opts = {}) {
  const p = new HubPanel(host, { kind: 'info', title: info.title ?? `${info.zone} — guide`, width: 640, ...opts });
  const LABEL = { chests: 'Chests opened', elites: 'Elites defeated', bosses: 'Bosses defeated', nodes: 'Spots gathered', friends: 'Creatures befriended', pois: 'Places found' };
  const counts = (info.counters ?? []).map((c) => `<div data-count="${esc(c.kind)}"><b>${c.done} / ${c.total}</b>${esc(LABEL[c.kind] ?? c.kind)}</div>`).join('');
  const contents = (info.contents ?? []).filter((c) => c.items?.length).map((c) => `<h3>${esc(c.label)}</h3><p>${c.items.map(esc).join(' · ')}</p>`).join('');
  const story = info.story?.length ? info.story.map((s) => `<div class="hubp__story"><b>${esc(s.title)}</b><p>${esc(s.text)}</p></div>`).join('') : '<p class="hubp__story">No stories here yet — this board is where they will be posted.</p>';
  p.body.innerHTML = `<p><i>${esc(info.sub ?? '')}</i></p>${info.about ? `<p>${esc(info.about)}</p>` : ''}
    <h3>Found so far</h3><div class="hubp__counts">${counts || '<div>Nothing to count here.</div>'}</div>
    ${contents}
    ${info.tips?.length ? `<h3>Tips</h3><ul>${info.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <h3>Stories</h3>${story}`;
  return p;
}

/** The waystone: every hub in the network; reached ones you can go to. */
export function waystoneMenu(host, { rows, onPick, accent, ...opts }) {
  const p = new HubPanel(host, { kind: 'waystone', title: 'Waystone', accent, width: 480, ...opts });
  p.body.innerHTML = `<p>Touch the stone and name a hub you have reached.</p><div class="hubp__rows"></div>`;
  const list = p.body.querySelector('.hubp__rows');
  for (const r of rows) {
    const row = document.createElement('div');
    row.className = `hubp__row${r.here ? ' is-here' : ''}`;
    row.dataset.waystone = r.hub;
    row.innerHTML = `<div><b></b><small></small></div><button type="button"></button>`;
    row.querySelector('b').textContent = r.reached ? r.name : '?';
    row.querySelector('small').textContent = r.reached ? r.zoneName : 'Not reached yet';
    const b = row.querySelector('button');
    b.textContent = r.here ? 'You are here' : 'Travel';
    b.disabled = r.here || !r.reached;
    b.addEventListener('click', () => {
      p.close();
      onPick(r.hub);
    });
    list.append(row);
  }
  p.body.querySelector('button:not(:disabled)')?.focus();
  return p;
}

/**
 * The stash. `view(entry)` → { icon (a canvas, an image URL or an emoji), count, name, tip };
 * `move(from, i)` moves bag[i] → stash or stash[i] → bag and returns a message or null;
 * `sort(side)`, `storeAll()`, `compare(entry)` (optional: text comparing with what's worn).
 */
export function stashPanel(host, { title = 'Stash', bag, stash, view, move, sort, storeAll, takeAll, compare = null, note = '', accent, ...opts }) {
  const p = new HubPanel(host, { kind: 'stash', title, accent, width: 760, ...opts });
  p.body.innerHTML = `<p>${esc(note || 'Click something to move it between your bag and the stash. The stash is the same chest in every hub.')}</p>
    <div class="hubp__grid2"><section><h3>Bag <small data-bag-n></small></h3><div class="hubp__slots" data-side="bag"></div><div class="hubp__bar"><button type="button" data-act="sort-bag">Sort bag</button><button type="button" data-act="store-all">Store all</button></div></section>
    <section><h3>Stash <small data-stash-n></small></h3><div class="hubp__slots" data-side="stash"></div><div class="hubp__bar"><button type="button" data-act="sort-stash">Sort stash</button><button type="button" data-act="take-all">Take all</button></div></section></div>
    <div class="hubp__tip" data-stash-tip>Hover something to see it${compare ? ' and how it compares with what you wear' : ''}.</div>`;
  const tip = p.body.querySelector('[data-stash-tip]');
  const draw = () => {
    for (const side of ['bag', 'stash']) {
      const list = side === 'bag' ? bag() : stash();
      const host2 = p.body.querySelector(`[data-side="${side}"]`);
      host2.textContent = '';
      list.forEach((e, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hubp__slot';
        b.dataset.slot = `${side}:${i}`;
        if (e != null) {
          const v = view(e);
          b.title = v.name;
          b.setAttribute('aria-label', `${v.name}${v.count > 1 ? ` ×${v.count}` : ''}`);
          if (v.icon instanceof HTMLCanvasElement || v.icon instanceof HTMLImageElement) b.append(v.icon);
          else if (typeof v.icon === 'string' && /^(data:|blob:|\.?\/|https?:)/.test(v.icon)) {
            const img = document.createElement('img');
            img.src = v.icon;
            img.alt = '';
            b.append(img);
          } else {
            const i2 = document.createElement('i');
            i2.textContent = v.icon ?? '•';
            b.append(i2);
          }
          if (v.color) b.style.borderColor = v.color;
          if (v.count > 1) {
            const n = document.createElement('em');
            n.textContent = String(v.count);
            b.append(n);
          }
          const show = () => {
            tip.textContent = `${v.name}${v.tip ? `\n${v.tip}` : ''}${compare ? `\n${compare(e) ?? ''}` : ''}`;
          };
          b.addEventListener('pointerenter', show);
          b.addEventListener('focus', show);
          b.addEventListener('click', () => {
            const msg = move(side, i);
            if (msg) tip.textContent = msg;
            draw();
          });
        } else b.setAttribute('aria-label', 'Empty');
        host2.append(b);
      });
      p.body.querySelector(`[data-${side}-n]`).textContent = `${list.filter((x) => x != null).length} / ${list.length}`;
    }
  };
  const act = (sel, fn) => p.body.querySelector(sel).addEventListener('click', () => {
    const msg = fn();
    if (typeof msg === 'string') tip.textContent = msg;
    draw();
  });
  act('[data-act="sort-bag"]', () => sort('bag'));
  act('[data-act="sort-stash"]', () => sort('stash'));
  act('[data-act="store-all"]', () => storeAll());
  act('[data-act="take-all"]', () => takeAll());
  draw();
  p.redraw = draw;
  return p;
}

/**
 * A small shop for games without their own: `coins()` the purse; `rows()` →
 * [{ id, name, sub, price, verb: 'Buy' | 'Sell' | 'Refill', disabled }] in sections; `act(id)` → a message.
 */
export function shopPanel(host, { title, coinsLabel = 'Coins', coins, sections, act, accent, ...opts }) {
  const p = new HubPanel(host, { kind: 'merchant', title, accent, width: 560, ...opts });
  const draw = (msg = '') => {
    p.body.innerHTML = `<p data-purse><b>${esc(coinsLabel)}:</b> ${coins()}</p>${sections()
      .map((s) => `<h3>${esc(s.label)}</h3><div class="hubp__rows">${s.rows.map((r) => `<div class="hubp__row" data-shop-row="${esc(r.id)}"><div><b>${esc(r.name)}</b><small>${esc(r.sub ?? '')}</small></div><button type="button" data-shop="${esc(r.id)}"${r.disabled ? ' disabled' : ''}>${esc(r.verb)}${r.price != null ? ` · ${r.price}` : ''}</button></div>`).join('') || '<p>Nothing.</p>'}</div>`)
      .join('')}<div class="hubp__tip" data-shop-msg>${esc(msg)}</div>`;
    for (const b of p.body.querySelectorAll('[data-shop]')) b.addEventListener('click', () => draw(act(b.dataset.shop) ?? ''));
  };
  draw();
  p.redraw = draw;
  return p;
}

/** A plain stats sheet: `rows` [[label, value]], an optional preview element (a canvas). */
export function statsPanel(host, { title, rows, preview = null, note = '', accent, ...opts }) {
  const p = new HubPanel(host, { kind: 'stats', title, accent, width: 620, ...opts });
  p.body.innerHTML = `<div class="hubp__grid2"><div data-preview></div><div><dl class="hubp__stats">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${note ? `<p>${esc(note)}</p>` : ''}</div></div>`;
  if (preview) p.body.querySelector('[data-preview]').append(preview);
  return p;
}
