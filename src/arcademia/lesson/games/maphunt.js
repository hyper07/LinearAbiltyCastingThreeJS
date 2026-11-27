/**
 * Map hunt (the Lagoon's geography game): a simple painted map — the world's continents and
 * oceans, a little island, or the lesson's own regions — and a clue at a time ("Where is the
 * Pacific Ocean?"). Tap the place. A miss names the place you tapped and swings the compass
 * needle the right way ("try going north-east!"), then shows the clue's hint; a second miss makes
 * the right place sparkle. Keyboard: Tab to the map, the arrow keys hop to the nearest place that
 * way, Enter or Space taps it.
 *
 * Data (content/games.js maphuntProblems): maphunt { q, map: 'world' | 'island' | { regions }, clues: [{ q, region, hint }] }
 */
import { el } from '../../ui/dom.js';
import { t as tr } from '../../i18n/index.js';
import { mapRegions, MAP_W, MAP_H, MAP_DECOR, centreOf, compassFrom, bearing } from '../../content/games.js';
import { gameCard, note, scorer, finish, flash, dots, gate, wait, alive } from './kit.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};
const LAND = ['#9fd27f', '#b7d97a', '#8fca8a', '#c8d985', '#a7cf6f', '#d2c98a', '#bfe0a0'];
const WATER = ['#7cc4e4', '#8fd0ea', '#6fb8de', '#a3daf0', '#86c9e6'];

export async function playMaphunt(r) {
  const m = r.lesson.maphunt;
  const award = scorer(r);
  const regions = mapRegions(m.map);
  const nameOf = (rg) => (rg.preset ? tr(`act.map.${rg.id}`) : rg.label);
  const { card, body, fb } = gameCard(r, 'maphunt', { kicker: tr('act.map.kicker'), title: m.q });
  r.say(tr('act.map.say'), { line: 't.act.map.say' });

  // The clue, the compass and the map.
  const top = el('div', 'arc-map__top');
  const clueEl = el('div', 'arc-map__clue', null, { 'aria-live': 'polite' });
  const compass = compassRose();
  top.append(clueEl);
  const wrap = el('div', 'arc-map');
  const map = svg('svg', { viewBox: `0 0 ${MAP_W} ${MAP_H}`, class: 'arc-map__svg', role: 'group', 'aria-label': tr('act.map.mapAria') });
  wrap.append(map, compass.root);
  body.append(top, wrap);
  map.append(svg('rect', { x: 0, y: 0, width: MAP_W, height: MAP_H, rx: 2.5, class: 'arc-map__sea' }));

  const shapes = regions.map((rg, i) => {
    const g = svg('g', { class: `arc-map__region arc-map__region--${rg.kind}`, tabindex: i === 0 ? 0 : -1, role: 'button', 'data-region': rg.id });
    const fill = rg.kind === 'water' ? WATER[i % WATER.length] : LAND[i % LAND.length];
    for (const poly of rg.polys) g.append(svg('path', { d: `M${poly.map((p) => p.join(',')).join('L')}Z`, fill }));
    const [lx, ly] = centreOf(rg);
    const label = svg('text', { x: lx, y: ly, class: 'arc-map__name', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
    g.append(label);
    if (rg.emoji) g.append(Object.assign(svg('text', { x: lx, y: ly - 4, class: 'arc-map__emoji', 'text-anchor': 'middle' }), { textContent: rg.emoji }));
    map.append(g);
    return { rg, g, label, at: [lx, ly] };
  });
  // Labels and pictures on top of every shape.
  const labels = svg('g', { class: 'arc-map__labels', 'aria-hidden': 'true' });
  for (const [emoji, x, y] of typeof m.map === 'string' ? MAP_DECOR[m.map] ?? [] : []) labels.append(Object.assign(svg('text', { x, y, class: 'arc-map__decor', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }), { textContent: emoji }));
  for (const s of shapes) labels.append(s.label);
  map.append(labels);

  const ariaOf = (s) => (s.g.classList.contains('is-found') ? nameOf(s.rg) : tr('act.map.placeAria', { dir: tr(`act.dir.${compassFrom([MAP_W / 2, MAP_H / 2], s.at) ?? 'middle'}`) }));
  const relabel = () => shapes.forEach((s) => s.g.setAttribute('aria-label', ariaOf(s)));
  relabel();

  // Keyboard: arrows hop to the nearest place that way.
  const focusShape = (s) => {
    shapes.forEach((x) => x.g.setAttribute('tabindex', x === s ? '0' : '-1'));
    s.g.focus();
  };
  const DIR = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  for (const s of shapes) {
    s.g.addEventListener('click', (e) => tap(s, e));
    s.g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        return tap(s, null);
      }
      const d = DIR[e.key];
      if (!d) return;
      e.preventDefault();
      let best = null, bestScore = Infinity;
      for (const o of shapes) {
        if (o === s) continue;
        const dx = o.at[0] - s.at[0], dy = o.at[1] - s.at[1];
        const along = dx * d[0] + dy * d[1];
        if (along <= 0.5) continue;
        const score = along + Math.abs(dx * d[1] + dy * d[0]) * 2;
        if (score < bestScore) {
          best = o;
          bestScore = score;
        }
      }
      if (best) focusShape(best);
    });
  }

  let i = 0, misses = 0, busy = false;
  let step = null;
  const showClue = () => {
    const c = m.clues[i];
    misses = 0;
    clueEl.replaceChildren(dots(i, m.clues.length, tr('act.map.clueOf', { n: i + 1, total: m.clues.length })), el('span', 'arc-map__kicker', tr('act.map.clueOf', { n: i + 1, total: m.clues.length })), el('strong', 'arc-map__q', `🔎 ${c.q}`));
    r.ctx = { step: tr('act.map.ctx', { q: c.q }), hint: c.hint, worked: nameOf(regions.find((x) => x.id === c.region)) };
    shapes.forEach((s) => s.g.classList.remove('is-hint', 'is-miss'));
    compass.point(null);
    flash(clueEl, 'is-new');
  };

  function tap(s, e) {
    if (busy || i >= m.clues.length) return;
    const c = m.clues[i];
    const target = shapes.find((x) => x.rg.id === c.region);
    // Where the child tapped (the place's middle for a key press).
    let pt = s.at;
    const ctm = e && e.clientX != null && map.getScreenCTM?.();
    if (ctm) {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      pt = [p.x, p.y];
    }
    if (s === target) {
      busy = true;
      s.g.classList.remove('is-hint');
      s.g.classList.add('is-found');
      s.label.textContent = nameOf(s.rg);
      relabel();
      if (!misses) award();
      r.good(s.g, fb, tr('act.map.found', { place: nameOf(s.rg) }));
      compass.point(null);
      i++;
      step?.open();
      return;
    }
    misses++;
    flash(s.g, 'is-miss', 1200);
    const dir = compassFrom(pt, target.at);
    compass.point(bearing(pt, target.at));
    const where = dir ? tr('act.map.go', { dir: tr(`act.dir.${dir}`) }) : tr('act.map.close');
    const that = tr('act.map.thatIs', { place: nameOf(s.rg) });
    if (misses >= 2) {
      target.g.classList.add('is-hint');
      r.oops(null, fb, `${that} ${where} ${tr('act.map.look')}`);
    } else r.oops(null, fb, `${that} ${where} 💡 ${c.hint}`);
  }

  while (i < m.clues.length) {
    showClue();
    step = gate(r);
    if (i === 0) shapes[0].g.focus({ preventScroll: true });
    await step.wait;
    await wait(r.game.reducedMotion ? 500 : 1500);
    if (!alive(r)) return;
    busy = false;
  }
  clueEl.replaceChildren(dots(m.clues.length, m.clues.length, tr('act.map.done')), el('strong', 'arc-map__q', `🏆 ${tr('act.map.done')}`));
  note(fb, tr('act.map.done'), 'good');
  r.buddy.cheer(1.6);
  await finish(r, card);
}

/** A compass rose whose needle can swing toward the answer (null: back to north). */
function compassRose() {
  const root = el('div', 'arc-compass', null, { role: 'img', 'aria-label': tr('act.map.compass') });
  const s = svg('svg', { viewBox: '-50 -50 100 100', class: 'arc-compass__svg' });
  s.append(svg('circle', { r: 46, class: 'arc-compass__face' }), svg('circle', { r: 38, class: 'arc-compass__ring' }));
  for (const [k, x, y] of [['n', 0, -27], ['e', 28, 1], ['s', 0, 29], ['w', -28, 1]]) {
    s.append(Object.assign(svg('text', { x, y, class: `arc-compass__letter arc-compass__letter--${k}`, 'text-anchor': 'middle', 'dominant-baseline': 'middle' }), { textContent: tr(`act.compass.${k}`) }));
  }
  const needle = svg('g', { class: 'arc-compass__needle' });
  needle.append(svg('path', { d: 'M0,-30 L7,0 L-7,0 Z', class: 'arc-compass__north' }), svg('path', { d: 'M0,30 L7,0 L-7,0 Z', class: 'arc-compass__south' }), svg('circle', { r: 4, class: 'arc-compass__pin' }));
  s.append(needle);
  root.append(s);
  return {
    root,
    point(deg) {
      needle.style.transform = `rotate(${deg ?? 0}deg)`;
      root.classList.toggle('is-pointing', deg != null);
    }
  };
}
