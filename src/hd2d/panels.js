/**
 * Lanternwood's windows: the bag and equipment (with the hero turning in
 * their gear), the character sheet, the journal, the realm map, the shops
 * (buy and sell) and the party. Plain DOM over the game; each window opens
 * with panel() from ui.js and closes with the game's closeOverlay().
 */
import * as THREE from 'three';
import * as R from './rules.js';
import { el, esc, panel, ICON, fmtTime, drawMap, KEY_HINTS } from './ui.js';
import { iconCanvas, canvasUrl, skillIcon, heroSpriteFor } from './sprites.js';
import { RigActor } from './rig.js';

/* ------------------------------------------------------------ preview */

/** The hero in their gear, turning slowly on a lit plinth — one small renderer, copied into any window. */
export class HeroPreview {
  constructor(w = 300, h = 340) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
    this.camera.position.set(0, 1.45, 5.2);
    this.camera.lookAt(0, 0.92, 0);
    this.scene.add(new THREE.HemisphereLight('#fff4e0', '#3a3050', 2.2));
    const key = new THREE.DirectionalLight('#ffe0b0', 2.4);
    key.position.set(2, 4, 3);
    const rim = new THREE.DirectionalLight('#8ac8ff', 1.6);
    rim.position.set(-3, 2, -3);
    this.scene.add(key, rim);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 0.16, 24), new THREE.MeshLambertMaterial({ color: '#4a3a30' }));
    plinth.position.y = -0.08;
    this.scene.add(plinth);
    this.plinth = plinth;
    this.actor = new RigActor({ shadow: 0 });
    this.scene.add(this.actor.group);
    this.angle = 0.4;
    this.key = '';
    this.white = new THREE.Color(0.85, 0.85, 0.85);
  }

  /** Dress the figure (a look id and a gear look). */
  set(lookId, gear, scale = 1) {
    const key = JSON.stringify([lookId, gear?.weapon, gear?.offhand, gear?.head, gear?.chest, gear?.cape, gear?.hands, gear?.feet, scale]);
    if (key === this.key) return;
    this.key = key;
    this.actor.scale = scale;
    this.actor.sprite = null;
    this.actor.show(heroSpriteFor(lookId, gear));
    this.actor.setGear(gear);
  }

  /** Turn a little, pose, render, and copy into a 2D canvas. */
  draw(dt, canvas, act = { move: 0 }) {
    this.angle += dt * 0.55;
    this.actor.facing = this.angle;
    this.actor.act = act;
    this.actor.update(dt, 0, this.white);
    this.renderer.render(this.scene, this.camera);
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(this.renderer.domElement, 0, 0, canvas.width, canvas.height);
  }

  dispose() {
    this.actor.dispose();
    this.plinth.geometry.dispose();
    this.plinth.material.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
  }
}

/** After a window re-renders, the button that had focus is gone: give the keyboard back to the game. */
function keepFocus(game, body) {
  const a = document.activeElement;
  if (!a || a === document.body || !body.contains(a)) game.root.focus();
}

/* ------------------------------------------------------------- items */

const statLine = (k, v) => `<li><span>${R.STAT_NAMES[k] ?? k}</span><b>${v > 0 ? '+' : ''}${v}</b></li>`;

/** An item's tooltip: name in its rarity's colour, what it is, its stats, who can use it, and how it compares to what you wear. */
export function itemTip(entry, hero, { price = null, worn = false } = {}) {
  if (!entry) return '';
  if (!entry.base) {
    const c = R.CONSUMABLES[entry.kind];
    return `<h4>${esc(c.name)}${entry.n > 1 ? ` ×${entry.n}` : ''}</h4><p class="ld-tip__kind">Consumable — stacks to ${R.STACK_MAX}</p><p>${esc(c.desc)}</p>${price != null ? `<p class="ld-tip__price">${ICON.gold} ${price}</p>` : ''}`;
  }
  const b = R.BASES[entry.base];
  const rar = R.RARITIES[entry.rarity];
  const usable = R.canUse(entry, hero.cls);
  const who = b.cls.map((c) => R.CLASSES[c].name).join(', ');
  const stats = Object.entries(entry.stats).map(([k, v]) => statLine(k, v)).join('');
  const aff = entry.affixes.length ? `<p class="ld-tip__aff">${entry.affixes.map((a) => esc(R.AFFIXES[a]?.name ?? a)).join(' · ')}</p>` : '';
  let cmp = '';
  if (!worn) {
    const d = R.compareItem(entry, hero.equip);
    const keys = Object.keys(d);
    const wornItem = hero.equip[b.slot];
    cmp = `<div class="ld-tip__cmp"><small>Compared with ${wornItem ? `<i style="color:${R.RARITIES[wornItem.rarity].color}">${esc(wornItem.name)}</i>` : 'nothing worn'}</small>${keys.length ? `<ul>${keys.map((k) => `<li class="${d[k] > 0 ? 'up' : 'down'}"><span>${R.STAT_NAMES[k] ?? k}</span><b>${d[k] > 0 ? '▲ +' : '▼ '}${d[k]}</b></li>`).join('')}</ul>` : '<p>No change.</p>'}</div>`;
  }
  return `<h4 style="color:${rar.color}">${esc(entry.name)}</h4>
    <p class="ld-tip__kind">${rar.name} ${esc(b.name)} · ${R.SLOT_NAMES[b.slot]}${b.weight ? ` · ${b.weight}` : ''}${b.twoHanded ? ' · two-handed' : ''} · item level ${entry.ilvl}</p>
    <ul class="ld-tip__stats">${stats}</ul>${aff}
    <p class="ld-tip__who ${usable ? '' : 'no'}">${usable ? '' : 'Your class cannot use this. '}${esc(who)}</p>
    ${cmp}<p class="ld-tip__price">${price != null ? `${ICON.gold} ${price}` : `Sells for ${ICON.gold} ${R.sellPrice(entry)}`}</p>`;
}

/** A bag cell: the icon, a stack count, a border in the rarity's colour. */
function cellHtml(entry, i, { equipped = false } = {}) {
  if (!entry) return `<button type="button" class="ld-cell ld-cell--empty" data-i="${i}" aria-label="Empty"></button>`;
  const color = entry.base ? R.RARITIES[entry.rarity].color : '#8a8070';
  const glow = entry.base && R.RARITIES[entry.rarity].glow ? ' ld-cell--glow' : '';
  return `<button type="button" class="ld-cell${glow}${equipped ? ' ld-cell--worn' : ''}" data-i="${i}" style="--rc:${color}"><img src="${canvasUrl(iconCanvas(entry))}" alt="">${entry.n > 1 ? `<em>${entry.n}</em>` : ''}</button>`;
}

/** A floating tooltip that follows the pointer over cells. */
function bindTips(root, tipEl, getHtml) {
  root.addEventListener('pointerover', (e) => {
    const c = e.target.closest('[data-i],[data-slot],[data-stock]');
    if (!c || !root.contains(c)) return;
    const html = getHtml(c);
    tipEl.hidden = !html;
    if (html) tipEl.innerHTML = html;
  });
  root.addEventListener('pointermove', (e) => {
    if (tipEl.hidden) return;
    const r = tipEl.parentElement.getBoundingClientRect();
    const x = Math.min(e.clientX - r.left + 18, r.width - tipEl.offsetWidth - 8);
    const y = Math.min(e.clientY - r.top + 12, r.height - tipEl.offsetHeight - 8);
    tipEl.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
  });
  root.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget || !root.contains(e.relatedTarget)) tipEl.hidden = true;
  });
}

/* --------------------------------------------------------- the bag */

const DOLL = [['head', 'Head'], ['amulet', 'Amulet'], ['chest', 'Chest'], ['hands', 'Hands'], ['weapon', 'Weapon'], ['offhand', 'Off hand'], ['ring', 'Ring'], ['feet', 'Feet']];

/** The bag and equipment window (I or B). */
export function openInventory(game) {
  const p = panel(game.root, 'ld-overlay--inv', 'Bag & equipment');
  game.overlay = 'inv';
  p.x.addEventListener('click', () => game.closeOverlay());
  const hero = game.hero;
  let selected = null; // { from: 'bag', i } | { from: 'eq', slot }
  p.body.innerHTML = `<div class="ld-inv">
    <div class="ld-inv__doll"><div class="ld-doll">${DOLL.map(([s, name]) => `<div class="ld-eqslot" data-slot="${s}" title="${name}"><small>${name}</small><div data-cellwrap></div></div>`).join('')}<canvas class="ld-preview ld-preview--inv" width="220" height="250" data-preview></canvas></div>
      <dl class="ld-stats ld-stats--sm" data-stats></dl></div>
    <div class="ld-inv__bag"><header><b data-count></b><span>${ICON.gold} <b data-gold></b> · ${ICON.crystal} <b data-cry></b></span></header><div class="ld-grid" data-grid></div>
      <div class="ld-inv__act" data-act><p class="ld-muted">Click an item to see it; double-click to wear or use it. Hover to compare with what you wear.</p></div></div>
  </div><div class="ld-tip" data-tip hidden></div>`;
  const $ = (s) => p.body.querySelector(s);
  const paint = () => {
    const s = game.stats;
    $('[data-count]').textContent = `Bag ${hero.bag.length} / ${R.BAG_SIZE}`;
    $('[data-gold]').textContent = hero.gold;
    $('[data-cry]').textContent = hero.crystals;
    const cells = [];
    for (let i = 0; i < R.BAG_SIZE; i++) cells.push(cellHtml(hero.bag[i], i));
    $('[data-grid]').innerHTML = cells.join('');
    for (const [slot] of DOLL) {
      const w = p.body.querySelector(`[data-slot="${slot}"] [data-cellwrap]`);
      w.innerHTML = cellHtml(hero.equip[slot], `eq-${slot}`, { equipped: true });
    }
    $('[data-stats]').innerHTML = `<dt>Health</dt><dd>${s.maxHp}</dd><dt>${s.resource === 'energy' ? 'Energy' : 'Mana'}</dt><dd>${s.maxMp}</dd><dt>Attack</dt><dd>${s.atk}</dd><dt>Defence</dt><dd>${s.def}</dd><dt>Critical</dt><dd>${Math.round(s.crit * 100)}%</dd><dt>Spell power</dt><dd>${Math.round(s.spell * 100)}%</dd><dt>Block</dt><dd>${Math.round(s.block * 100)}%</dd><dt>Speed</dt><dd>${(s.speed / 6.2 * 100).toFixed(0)}%</dd>`;
    markSelected();
    actions();
  };
  const markSelected = () => {
    for (const c of p.body.querySelectorAll('.ld-cell')) c.classList.toggle('is-sel', Boolean(selected && ((selected.from === 'bag' && c.dataset.i === String(selected.i)) || (selected.from === 'eq' && c.dataset.i === `eq-${selected.slot}`))));
  };
  const entryOf = (sel) => (sel?.from === 'bag' ? hero.bag[sel.i] : sel?.from === 'eq' ? hero.equip[sel.slot] : null);
  const actions = () => {
    const box = $('[data-act]');
    const e = entryOf(selected);
    if (!e) {
      box.innerHTML = '<p class="ld-muted">Click an item to see it; double-click to wear or use it. Hover to compare with what you wear.</p>';
      return;
    }
    const worn = selected.from === 'eq';
    const btns = [];
    if (worn) btns.push('<button type="button" class="ld-btn" data-do="unequip">Take off</button>');
    else if (e.base) btns.push(`<button type="button" class="ld-btn ld-btn--go" data-do="equip" ${R.canUse(e, hero.cls) ? '' : 'disabled'}>Wear</button>`);
    else btns.push('<button type="button" class="ld-btn ld-btn--go" data-do="use">Use</button>');
    if (!worn && game.shopOpen) btns.push(`<button type="button" class="ld-btn" data-do="sell">Sell for ${ICON.gold} ${e.base ? R.sellPrice(e) : R.sellPrice(e) * e.n}</button>`);
    if (!worn) btns.push('<button type="button" class="ld-btn ld-btn--warn" data-do="drop">Drop</button>');
    box.innerHTML = `<div class="ld-inv__sel">${itemTip(e, hero, { worn })}</div><div class="ld-inv__btns">${btns.join('')}</div>`;
    for (const b of box.querySelectorAll('[data-do]')) b.addEventListener('click', () => act(b.dataset.do));
  };
  const act = (what) => {
    const e = entryOf(selected);
    if (!e) return;
    if (what === 'equip') {
      const r = R.equipFromBag(hero, selected.i);
      if (!r.ok) game.hud.toast(r.reason, 'warn');
      else {
        game.hud.log(`Wearing <span style="color:${R.RARITIES[e.rarity].color}">${esc(e.name)}</span>`);
        selected = { from: 'eq', slot: r.slot };
        game.gearChanged();
      }
    } else if (what === 'unequip') {
      const r = R.unequip(hero, selected.slot);
      if (!r.ok) game.hud.toast(r.reason, 'warn');
      else {
        selected = null;
        game.gearChanged();
      }
    } else if (what === 'use') {
      game.use(e.kind);
      if (!hero.bag.includes(e)) selected = null;
    } else if (what === 'sell') {
      const gold = R.sellFromBag(hero, selected.i);
      game.hud.log(`Sold for ${gold} gold`);
      selected = null;
      game._paintShop?.();
    } else if (what === 'drop') {
      hero.bag.splice(selected.i, 1);
      const [fx, fz] = [Math.sin(game.heroPos.face), Math.cos(game.heroPos.face)];
      game._dropItem(e, game.heroPos.x + fx * 1.4, game.heroPos.z + fz * 1.4);
      game.drops.at(-1).t = -1.5; // not picked straight back up
      selected = null;
    }
    game.save();
    paint();
    keepFocus(game, p.body);
  };
  p.body.querySelector('.ld-inv').addEventListener('click', (ev) => {
    const c = ev.target.closest('.ld-cell');
    if (!c) return;
    const id = c.dataset.i;
    if (id.startsWith('eq-')) selected = hero.equip[id.slice(3)] ? { from: 'eq', slot: id.slice(3) } : null;
    else selected = hero.bag[Number(id)] ? { from: 'bag', i: Number(id) } : null;
    markSelected();
    actions();
  });
  p.body.querySelector('.ld-inv').addEventListener('dblclick', (ev) => {
    const c = ev.target.closest('.ld-cell');
    if (!c) return;
    const id = c.dataset.i;
    if (id.startsWith('eq-')) {
      selected = { from: 'eq', slot: id.slice(3) };
      act('unequip');
    } else if (hero.bag[Number(id)]) {
      selected = { from: 'bag', i: Number(id) };
      act(hero.bag[Number(id)].base ? 'equip' : 'use');
    }
  });
  bindTips(p.body.querySelector('.ld-inv'), $('[data-tip]'), (c) => {
    const id = c.dataset.i ?? (c.dataset.slot ? `eq-${c.dataset.slot}` : null);
    if (!id) return '';
    if (id.startsWith('eq-')) return itemTip(hero.equip[id.slice(3)], hero, { worn: true });
    return itemTip(hero.bag[Number(id)], hero);
  });
  game._refreshBag = () => {
    paint();
    keepFocus(game, p.body);
  };
  game._previewCanvas = $('[data-preview]');
  paint();
}

/* --------------------------------------------------------- the hero */

/** The character sheet (C): class, stats from level and gear, the skills and the combo. */
export function openCharacter(game) {
  const p = panel(game.root, 'ld-overlay--char', 'Your hero');
  game.overlay = 'char';
  p.x.addEventListener('click', () => game.closeOverlay());
  const h = game.hero;
  const c = R.CLASSES[h.cls];
  const base = R.heroStats(h.level, h.bonus, null, h.cls);
  const s = game.stats;
  const gear = R.gearTotals(h.equip);
  const row = (name, b, total, unit = '') => `<tr><th>${name}</th><td>${b}${unit}</td><td class="${total - b > 0 ? 'up' : total - b < 0 ? 'down' : ''}">${total - b > 0 ? '+' : ''}${total - b === 0 ? '—' : `${Math.round((total - b) * 10) / 10}${unit}`}</td><td><b>${total}${unit}</b></td></tr>`;
  const wt = game.weaponType;
  const combo = R.comboFor(wt);
  const look = R.lookById(h.look);
  p.body.innerHTML = `<div class="ld-char">
    <div><canvas class="ld-preview" width="240" height="280" data-preview></canvas>
      <h3>${esc(look?.name ?? 'Wayfarer')}, the ${c.name}</h3><p class="ld-muted">${c.role}. ${esc(c.blurb)}</p></div>
    <div><table class="ld-stattable"><thead><tr><th></th><th>Base</th><th>Gear</th><th>Total</th></tr></thead><tbody>
      ${row('Health', base.maxHp, s.maxHp)}${row(c.resource === 'energy' ? 'Energy' : 'Mana', base.maxMp, s.maxMp)}${row('Attack', base.atk, s.atk)}${row('Defence', base.def, s.def)}
      ${row('Critical', Math.round(base.crit * 100), Math.round(s.crit * 100), '%')}${row('Spell power', 100, Math.round(s.spell * 100), '%')}${row('Block', 0, Math.round(s.block * 100), '%')}${row('Life steal', 0, Math.round(s.leech * 100), '%')}
    </tbody></table>
    <dl class="ld-stats ld-stats--sm"><dt>Level</dt><dd>${h.level}</dd><dt>Experience</dt><dd>${h.xp} / ${R.xpToNext(h.level)}</dd><dt>Charms</dt><dd>${h.bonus.hp} hearth · ${h.bonus.atk} edge</dd><dt>Foes driven off</dt><dd>${h.kills}</dd><dt>Falls</dt><dd>${h.deaths}</dd><dt>Time</dt><dd>${fmtTime(game.state.time)}</dd></dl>
    <p class="ld-muted">Gear adds: ${Object.entries(gear).filter(([, v]) => v).map(([k, v]) => `${R.STAT_NAMES[k]} ${v > 0 ? '+' : ''}${v}`).join(' · ') || 'nothing yet'}</p></div>
    <div><h3>Skills</h3><ul class="ld-skills">${c.skills.map((id, i) => {
      const sk = R.SKILLS[id];
      return `<li><img src="${canvasUrl(skillIcon(sk.icon))}" alt=""><div><b><kbd>${i + 1}</kbd> ${sk.name}</b><small>${sk.cost} ${c.resource} · ${sk.cd} s</small><p>${esc(sk.desc)}</p></div></li>`;
    }).join('')}</ul>
    <h3>Basic attack — ${esc(R.BASES[h.equip.weapon?.base]?.name ?? 'Fists')}</h3><p class="ld-muted">${combo.length} strikes: ${combo.map((st) => st.pose).join(' → ')}. ${{ dagger: 'Quick jabs, short reach.', axe: 'Heavy, slow arcs that knock foes flying.', mace: 'Heavy blows.', spear: 'Long thrusts that reach far.', longsword: 'Wide two-handed arcs.', staff: 'Magic bolts; the third splits in three.', bow: 'Arrows; the third is a piercing power shot.', shortsword: 'A sweep, a backhand and a leaping smash.' }[wt] ?? ''}</p></div>
  </div>`;
  game._previewCanvas = p.body.querySelector('[data-preview]');
}

/* ------------------------------------------------------- the journal */

export function openJournal(game) {
  const p = panel(game.root, 'ld-overlay--info', 'Journal');
  game.overlay = 'journal';
  p.x.addEventListener('click', () => game.closeOverlay());
  const states = { locked: 'Not yet', available: 'Waiting', active: 'In progress', ready: 'Hand in', done: 'Done' };
  const c = R.CLASSES[game.hero.cls];
  p.body.innerHTML = `<div class="ld-journal">${R.REALM_ORDER.map((realm) => {
    const qs = R.questsIn(realm).filter((q) => game.state.quests[q.id].state !== 'locked');
    const open = R.realmUnlocked(game.state.quests, realm);
    return `<section><h3>${R.REALMS[realm].name} <small>${open ? `${R.questsDone(game.state.quests, realm)} / ${R.questsIn(realm).length} done` : 'sealed'}</small></h3><ul class="ld-qlog">${qs.map((q) => {
      const e = game.state.quests[q.id];
      return `<li class="ld-q--${e.state}"><b>${q.name}</b><span>${states[e.state]}${e.state === 'active' ? ` · ${e.progress}/${q.goal.count}` : ''}</span><small>${esc(q.brief)} — ${esc(R.NPCS[q.giver].name)}</small></li>`;
    }).join('') || `<li><small>${open ? 'No quests yet.' : `Opens when ${esc(R.questById(R.REALMS[realm].unlock)?.name ?? '')} is done.`}</small></li>`}</ul></section>`;
  }).join('')}
  <section><h3>${c.name} <small>${c.role}</small></h3><p class="ld-muted">${esc(c.blurb)}</p><ul class="ld-qlog">${c.skills.map((id, i) => `<li><b><kbd>${i + 1}</kbd> ${R.SKILLS[id].name}</b><small>${esc(R.SKILLS[id].desc)}</small></li>`).join('')}</ul></section></div>`;
}

/* ------------------------------------------------------- the realms */

/** The realm map (M), and the waystone's travel window (F at a waystone). */
export function openRealms(game, { atWaystone = false } = {}) {
  const p = panel(game.root, 'ld-overlay--map', atWaystone ? 'The waystone' : 'Realms');
  game.overlay = 'map';
  p.x.addEventListener('click', () => game.closeOverlay());
  let shown = game.realm;
  const guest = game.net?.isGuest;
  p.body.innerHTML = `<div class="ld-realms"><ul class="ld-realmlist" data-list></ul><div class="ld-realmmap"><canvas class="ld-map" width="620" height="620" data-map></canvas><p class="ld-muted" data-legend></p></div></div>`;
  const paint = () => {
    p.body.querySelector('[data-list]').innerHTML = R.REALM_ORDER.map((id) => {
      const r = R.REALMS[id];
      const open = R.realmUnlocked(game.state.quests, id);
      const here = id === game.realm;
      const btn = !open ? `<span class="ld-lock">Sealed — ${esc(R.questById(r.unlock)?.name ?? '')}</span>` : here ? '<span class="ld-here">You are here</span>' : atWaystone ? `<button type="button" class="ld-btn ld-btn--go" data-go="${id}" ${guest ? 'disabled title="The party leader chooses the realm"' : ''}>Travel</button>` : '<span class="ld-muted">Travel from a waystone</span>';
      return `<li class="ld-realm${id === shown ? ' is-sel' : ''}${open ? '' : ' is-locked'}" data-show="${id}"><b>${r.name}</b><small>${r.sub} · levels ${r.levels[0]}–${r.levels[1]}</small><p>${esc(r.blurb)}</p>${btn}</li>`;
    }).join('');
    for (const li of p.body.querySelectorAll('[data-show]')) li.addEventListener('click', () => {
      if (!R.realmUnlocked(game.state.quests, li.dataset.show)) return;
      shown = li.dataset.show;
      paint();
    });
    for (const b of p.body.querySelectorAll('[data-go]')) b.addEventListener('click', (e) => {
      e.stopPropagation();
      game.closeOverlay();
      game.travel(b.dataset.go);
    });
    p.body.querySelector('[data-legend]').innerHTML = shown === game.realm ? 'White arrow: you · gold ring: your quest · cyan: the waystone · gold squares: unopened chests · blue: your party · <kbd>M</kbd> closes' : `${R.REALMS[shown].name} — places and people`;
    drawMap(p.body.querySelector('[data-map]'), game, shown);
  };
  game._mapCanvas = p.body.querySelector('[data-map]');
  game._mapRealm = () => shown;
  paint();
}

/* --------------------------------------------------------- the shops */

/** A trader's or smith's window: their wares on the left, your bag on the right (click to sell). */
export function openShop(game, npcId) {
  const npc = R.NPCS[npcId];
  const p = panel(game.root, 'ld-overlay--shop', `${npc.name}’s wares`);
  game.overlay = 'shop';
  game.shopOpen = npcId;
  p.x.addEventListener('click', () => game.closeOverlay());
  const hero = game.hero;
  const level = Math.max(R.REALMS[npc.realm].levels[0], Math.min(hero.level, R.REALMS[npc.realm].levels[1] + 2));
  // The gear for sale is the same through a visit; it changes each time you come back.
  game._stock ??= {};
  const visit = `${npcId}:${Math.floor(game.state.time / 300)}:${hero.cls}`;
  if (game._stock.key !== visit) game._stock = { key: visit, items: R.vendorStock({ level, cls: hero.cls, smith: npc.shop === 'smith', count: npc.shop === 'smith' ? 9 : 5 }, R.seeded(visit.length * 977 + Math.floor(game.state.time / 300))) };
  const consumables = npc.shop === 'general' ? R.SHOP : [];
  const paint = () => {
    const stock = game._stock.items;
    p.body.innerHTML = `<p class="ld-muted">${esc(npc.lines?.[0] ?? 'Have a look.')} ${ICON.gold}<b>${hero.gold}</b> ${ICON.crystal}<b>${hero.crystals}</b></p>
      <div class="ld-shopwrap"><div><h3>For sale</h3><ul class="ld-shop">${consumables.map((s, i) => {
        const owned = R.CONSUMABLES[s.id] ? `You have ${R.countOf(hero.bag, s.id)}` : s.id === 'charm-hp' ? `${hero.bonus.hp} / 3 worn` : `${hero.bonus.atk} / 3 honed`;
        const cost = s.currency === 'gold' ? `${ICON.gold}${s.price}` : `${ICON.crystal}${s.price}`;
        const can = hero[s.currency] >= s.price && !(s.id === 'charm-hp' && hero.bonus.hp >= 3) && !(s.id === 'charm-atk' && hero.bonus.atk >= 3);
        const icon = R.CONSUMABLES[s.id] ? `<img src="${canvasUrl(iconCanvas({ kind: s.id, n: 1 }))}" alt="">` : s.id === 'charm-hp' ? ICON.fire : ICON.sword;
        return `<li><span class="ld-shop__icon">${icon}</span><div><b>${s.name}</b><small>${s.note} ${owned}.</small></div><button type="button" class="ld-btn" data-buy="${s.id}" ${can ? '' : 'disabled'}>${i < 9 ? `<kbd>${i + 1}</kbd> ` : ''}${cost}</button></li>`;
      }).join('')}${stock.map((it, i) => it ? `<li data-stock="${i}"><span class="ld-shop__icon"><img src="${canvasUrl(iconCanvas(it))}" alt=""></span><div><b style="color:${R.RARITIES[it.rarity].color}">${esc(it.name)}</b><small>${R.RARITIES[it.rarity].name} ${R.BASES[it.base].name} · ${Object.entries(it.stats).map(([k, v]) => `${R.STAT_NAMES[k]} ${v > 0 ? '+' : ''}${v}`).join(', ')}</small></div><button type="button" class="ld-btn" data-gear="${i}" ${hero.gold >= R.buyPrice(it) ? '' : 'disabled'}>${ICON.gold}${R.buyPrice(it)}</button></li>` : '').join('')}</ul></div>
      <div><h3>Your bag <small>(click to sell)</small></h3><div class="ld-grid ld-grid--sell" data-grid>${Array.from({ length: R.BAG_SIZE }, (_, i) => cellHtml(hero.bag[i], i)).join('')}</div></div></div><div class="ld-tip" data-tip hidden></div>`;
    for (const b of p.body.querySelectorAll('[data-buy]')) b.addEventListener('click', () => game.buy(b.dataset.buy));
    for (const b of p.body.querySelectorAll('[data-gear]')) b.addEventListener('click', () => {
      const it = game._stock.items[Number(b.dataset.gear)];
      const r = R.buyEntry(hero, it);
      if (!r.ok) game.hud.toast(r.reason, 'warn');
      else {
        game._stock.items[Number(b.dataset.gear)] = null;
        game.hud.log(`Bought <span style="color:${R.RARITIES[it.rarity].color}">${esc(it.name)}</span>`);
        game.save();
      }
      game._paintShop();
    });
    p.body.querySelector('[data-grid]').addEventListener('click', (ev) => {
      const c = ev.target.closest('.ld-cell');
      if (!c || !hero.bag[Number(c.dataset.i)]) return;
      const e = hero.bag[Number(c.dataset.i)];
      const gold = R.sellFromBag(hero, Number(c.dataset.i));
      game.hud.log(`Sold ${e.base ? `<span style="color:${R.RARITIES[e.rarity].color}">${esc(e.name)}</span>` : esc(R.CONSUMABLES[e.kind].name)} for ${gold} gold`);
      game.save();
      game._paintShop();
    });
    bindTips(p.body.querySelector('.ld-shopwrap'), p.body.querySelector('[data-tip]'), (c) => {
      if (c.dataset.stock != null) {
        const it = game._stock.items[Number(c.dataset.stock)];
        return it ? itemTip(it, hero, { price: R.buyPrice(it) }) : '';
      }
      const e = hero.bag[Number(c.dataset.i)];
      return e ? itemTip(e, hero, { price: e.base ? R.sellPrice(e) : R.sellPrice(e) * e.n }) : '';
    });
  };
  game._paintShop = () => {
    paint();
    keepFocus(game, p.body);
  };
  paint();
}

/* --------------------------------------------------------- the party */

/** Play together (P): make a party (a code for friends), join one, see who is in it, leave. */
export function openParty(game) {
  const p = panel(game.root, 'ld-overlay--party', 'Play together');
  game.overlay = 'party';
  p.x.addEventListener('click', () => game.closeOverlay());
  const paint = () => {
    const net = game.net;
    if (!net.room) {
      p.body.innerHTML = `<p>Up to four players, in the host's world: the host's monsters and realm, everyone's own hero, gear and quests. Every kill counts for everyone there, and each of you gets your own loot.</p>
        <div class="ld-partyform"><button type="button" class="ld-btn ld-btn--big ld-btn--go" data-make>Make a party</button>
        <label>or join with a code <input data-code maxlength="5" placeholder="CODE" autocomplete="off" spellcheck="false"></label><button type="button" class="ld-btn ld-btn--big" data-join>Join</button></div>
        <p class="ld-muted" data-status>${esc(net.status)}</p>`;
      const code = p.body.querySelector('[data-code]');
      code.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') p.body.querySelector('[data-join]').click();
        if (e.key === 'Escape') game.closeOverlay();
      });
      p.body.querySelector('[data-make]').addEventListener('click', async () => {
        p.body.querySelector('[data-status]').textContent = 'Connecting…';
        await net.open('create');
        if (game.overlay === 'party') game._paintParty();
      });
      p.body.querySelector('[data-join]').addEventListener('click', async () => {
        const c = code.value.trim().toUpperCase();
        if (c.length !== 5) {
          p.body.querySelector('[data-status]').textContent = 'A party code has five letters.';
          return;
        }
        p.body.querySelector('[data-status]').textContent = 'Connecting…';
        await net.open('join', c);
        if (game.overlay === 'party') game._paintParty();
      });
      return;
    }
    const me = { name: game.account?.name ?? R.lookById(game.hero.look)?.name ?? 'You', cls: game.hero.cls, level: game.hero.level, realm: game.realm, host: net.isHost };
    const list = [me, ...[...net.peers.values()].map((x) => ({ name: x.name, cls: x.cls, level: x.level, realm: x.realm, host: x.id === net.session.host }))];
    p.body.innerHTML = `<div class="ld-partycode"><small>Party code</small><b data-room>${esc(net.room)}</b><span>${net.isHost ? 'You are the host: the monsters and the realm are yours. Travel at a waystone and the party follows.' : 'You play in the host’s world. The host chooses the realm.'}</span></div>
      <ul class="ld-partylist">${list.map((x) => `<li><b>${esc(x.name)}</b><span>${esc(R.CLASSES[x.cls]?.name ?? '')} · Lv ${x.level} · ${esc(R.REALMS[x.realm]?.name ?? '')}${x.host ? ' · host' : ''}</span></li>`).join('')}</ul>
      <button type="button" class="ld-btn ld-btn--warn" data-leave>Leave the party</button>`;
    p.body.querySelector('[data-leave]').addEventListener('click', () => {
      net.leave();
      game._paintParty();
    });
  };
  game._paintParty = () => {
    paint();
    keepFocus(game, p.body);
  };
  paint();
}

/** The pause screen. */
export function openPause(game) {
  const p = panel(game.root, 'ld-overlay--pause', 'Paused');
  game.overlay = 'pause';
  p.body.innerHTML = `<div class="ld-pause">
    <button type="button" class="ld-btn ld-btn--big ld-btn--go" data-resume>Resume</button>
    <button type="button" class="ld-btn ld-btn--big" data-title>Save and return to title</button>
    <button type="button" class="ld-btn ld-btn--big" data-leave>Save and leave Lanternwood</button>
    <ul class="ld-controls ld-controls--keys">${KEY_HINTS.replace(/<span>/g, '<li>').replace(/<\/span>/g, '</li>')}</ul></div>`;
  p.x.addEventListener('click', () => game.closeOverlay());
  p.body.querySelector('[data-resume]').addEventListener('click', () => game.closeOverlay());
  p.body.querySelector('[data-title]').addEventListener('click', () => {
    game.save();
    game.closeOverlay();
    game.net.close();
    game._resetWorldForTitle();
    game.title();
  });
  p.body.querySelector('[data-leave]').addEventListener('click', () => game.close());
  void el;
}
