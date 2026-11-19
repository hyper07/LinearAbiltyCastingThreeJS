/**
 * Hands-on math: a manipulative for each kind of practice (content/schema.js
 * PRACTICE_KINDS), built around one generated problem. The child plays with
 * it — counts, hops, builds, shades, balances — then answers. Everything is
 * buttons and taps (keyboard and touch alike); nothing needs dragging.
 *
 *   mountPractice(kind, problem, host, { sound }) → { dispose() }
 */
import { el, button } from '../ui/dom.js';
import { t as tr, num } from '../i18n/index.js';

/** A number in the current language's format, with a real minus sign. */
const fmt = (n) => (n < 0 ? `−${fmt(-n)}` : num(n, Number.isInteger(n) ? {} : { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export function mountPractice(kind, p, host, ctx = {}) {
  const box = el('div', `arc-prac arc-prac--${kind}`);
  host.append(box);
  const make = KINDS[kind] ?? KINDS.count;
  const api = make(box, p, ctx) ?? {};
  return { dispose: () => box.remove(), ...api };
}

const stepper = (label, get, set, min, max, step = 1) => {
  const wrap = el('div', 'arc-step');
  const out = el('output', 'arc-step__value', String(get()));
  const dec = button('arc-step__btn', '−', () => {
    set(Math.max(min, get() - step));
    out.textContent = fmt(get());
  }, { 'aria-label': tr('practice.down', { label }) });
  const inc = button('arc-step__btn', '+', () => {
    set(Math.min(max, get() + step));
    out.textContent = fmt(get());
  }, { 'aria-label': tr('practice.up', { label }) });
  wrap.append(el('span', 'arc-step__label', label), dec, out, inc);
  return wrap;
};

const KINDS = {
  /** Tap each thing to count it: numbers appear in order. */
  count(box, p, { sound }) {
    const n = p.data.n ?? (p.data.a ?? 0) + (p.data.b ?? 0);
    const emoji = p.data.emoji ?? '🍎';
    box.append(el('p', 'arc-prac__say', tr('practice.tapCount')));
    const field = el('div', 'arc-count');
    let next = 1;
    const tally = el('div', 'arc-count__tally', 'Counted: 0');
    for (let i = 0; i < n; i++) {
      const b = button('arc-count__item', emoji, () => {
        if (b.dataset.n) return;
        b.dataset.n = String(next);
        b.append(el('span', 'arc-count__n', String(next)));
        tally.textContent = tr('practice.counted', { n: next });
        next++;
        sound?.tap();
      }, { 'aria-label': tr('practice.countAria', { emoji, n: i + 1 }) });
      field.append(b);
    }
    box.append(field, tally, button('arc-btn arc-btn--ghost', tr('practice.again'), () => {
      next = 1;
      tally.textContent = tr('practice.counted', { n: 0 });
      for (const b of field.children) {
        delete b.dataset.n;
        b.querySelector('.arc-count__n')?.remove();
      }
    }));
  },

  /** A frog hops along a number line. */
  numberline(box, p, { sound }) {
    const d = p.data;
    let lo = 0, hi = 10, step = 1, start = d.a ?? 0, dec = 0;
    if (d.by) {
      step = d.by;
      lo = d.start;
      hi = d.next + d.by;
      start = d.start;
    } else if (d.s !== undefined && !Number.isInteger(d.a)) {
      step = 0.1;
      hi = 1;
      dec = 1;
    } else if (d.up !== undefined) {
      lo = -12;
      hi = 12;
    }
    let at = start;
    box.append(el('p', 'arc-prac__say', d.by ? tr('practice.hopBy', { by: d.by }) : tr('practice.frogStart', { n: fmt(start) })));
    const svgWrap = el('div', 'arc-nl');
    const draw = () => {
      const count = Math.round((hi - lo) / step);
      const X = (v) => 30 + ((v - lo) / (hi - lo)) * 640;
      let s = `<svg viewBox="0 0 700 150" role="img" aria-label="${tr('practice.lineAria', { n: fmt(at) })}"><line x1="10" y1="100" x2="690" y2="100" class="arc-nl__axis"/>`;
      for (let k = 0; k <= count; k++) {
        const v = Math.round((lo + k * step) * 100) / 100;
        const show = count <= 26 || k % 2 === 0;
        s += `<line x1="${X(v)}" y1="90" x2="${X(v)}" y2="110" class="arc-nl__tick"/>${show ? `<text x="${X(v)}" y="134" class="arc-nl__label">${fmt(dec ? Number(v.toFixed(1)) : v)}</text>` : ''}`;
      }
      s += `<circle cx="${X(start)}" cy="100" r="7" class="arc-nl__start"/><text x="${X(at)}" y="78" class="arc-nl__frog">🐸</text></svg>`;
      svgWrap.innerHTML = s;
    };
    draw();
    const pos = el('p', 'arc-prac__pos', tr('practice.frogOn', { n: fmt(at) }));
    const hop = (k) => {
      at = Math.round(Math.max(lo, Math.min(hi, at + k * step)) * 100) / 100;
      pos.textContent = tr('practice.frogOn', { n: fmt(at) });
      draw();
      sound?.tap();
    };
    const row = el('div', 'arc-prac__row');
    row.append(button('arc-btn', tr('practice.hopBack', { n: fmt(step) }), () => hop(-1)), button('arc-btn', tr('practice.hopForward', { n: fmt(step) }), () => hop(1)));
    box.append(svgWrap, pos, row);
  },

  /** Tens sticks and ones cubes. */
  'place-value'(box, p, { sound }) {
    let tens = 0, ones = 0;
    const view = el('div', 'arc-pv');
    const total = el('p', 'arc-prac__pos');
    const draw = () => {
      view.replaceChildren();
      const t = el('div', 'arc-pv__tens');
      for (let i = 0; i < tens; i++) t.append(el('i', 'arc-pv__rod'));
      const o = el('div', 'arc-pv__ones');
      for (let i = 0; i < ones; i++) o.append(el('i', 'arc-pv__cube'));
      view.append(t, o);
      total.textContent = tr('practice.tensOnes', { tens, ones, n: tens * 10 + ones });
    };
    box.append(el('p', 'arc-prac__say', tr('practice.build', { n: p.data.n })), view, total);
    const row = el('div', 'arc-prac__row');
    row.append(
      stepper(tr('practice.tens'), () => tens, (v) => ((tens = v), draw(), sound?.tap()), 0, 9),
      stepper(tr('practice.ones'), () => ones, (v) => ((ones = v), draw(), sound?.tap()), 0, 9)
    );
    box.append(row);
    draw();
  },

  /** Column sums: tap the digits of the answer, a carry or borrow mark to help. */
  column(box, p, { sound }) {
    const { a, b, op } = p.data;
    const right = op === '+' ? a + b : a - b;
    const digits = [0, 0, 0];
    const cols = String(Math.max(a, b, right)).length;
    box.append(el('p', 'arc-prac__say', tr(op === '+' ? 'practice.colAdd' : 'practice.colSub')));
    const grid = el('div', 'arc-col', null, { role: 'group', 'aria-label': `${fmt(a)} ${op === '+' ? '+' : '−'} ${fmt(b)}` });
    const pad = (n) => String(n).padStart(cols, ' ').split('');
    const row = (chars, sign = '') => {
      const r = el('div', 'arc-col__row');
      r.append(el('span', 'arc-col__sign', sign));
      for (const ch of chars) r.append(el('span', 'arc-col__d', ch.trim()));
      return r;
    };
    const helper = el('div', 'arc-col__row arc-col__help');
    helper.append(el('span', 'arc-col__sign', ''));
    for (let k = 0; k < cols; k++) helper.append(el('span', 'arc-col__d', ''));
    grid.append(helper, row(pad(a)), row(pad(b), op === '+' ? '+' : '−'), el('div', 'arc-col__line'));
    const ans = el('div', 'arc-col__row');
    ans.append(el('span', 'arc-col__sign', '='));
    const slots = [];
    for (let k = 0; k < cols; k++) {
      const idx = cols - 1 - k;
      const s = button('arc-col__slot', '?', () => {
        digits[idx] = (digits[idx] + 1) % 10;
        s.textContent = String(digits[idx]);
        s.setAttribute('aria-label', tr('practice.digitSet', { place: tr(`practice.place${idx}`), n: digits[idx] }));
        sound?.tap();
      }, { 'aria-label': tr('practice.digit', { place: tr(`practice.place${idx}`) }) });
      slots.push(s);
      ans.append(s);
    }
    grid.append(ans);
    box.append(grid);
    const hint = button('arc-btn arc-btn--ghost', tr(op === '+' ? 'practice.showCarry' : 'practice.showBorrow'), () => {
      const cells = helper.querySelectorAll('.arc-col__d');
      if (op === '+') cells[cols - 2].textContent = (a % 10) + (b % 10) >= 10 ? '1' : '';
      else {
        cells[cols - 2].textContent = String(Math.floor(a / 10) % 10 - 1);
        cells[cols - 1].textContent = `1${a % 10}`;
      }
    });
    box.append(hint);
    return {
      /** This kind answers on the board itself. */
      value: () => Number(digits.slice(0, cols).reverse().join('')),
      right
    };
  },

  /** Rows and columns of dots. */
  array(box, p, { sound }) {
    const d = p.data;
    const share = d.op === '÷';
    let rows = share ? 1 : 1, cols = 1;
    const view = el('div', 'arc-arr');
    const total = el('p', 'arc-prac__pos');
    const draw = () => {
      view.replaceChildren();
      view.style.setProperty('--cols', cols);
      for (let i = 0; i < rows * cols; i++) view.append(el('i', 'arc-arr__dot'));
      total.textContent = share ? `${tr('practice.groupsOf', { rows, cols, n: rows * cols })}${rows * cols === d.a ? ` ${tr('practice.shared')}` : ''}` : tr('practice.rowsOf', { rows, cols, n: rows * cols });
    };
    box.append(el('p', 'arc-prac__say', share ? tr('practice.share', { a: d.a, b: d.b }) : tr('practice.makeRows', { a: d.a, b: d.b })));
    const row = el('div', 'arc-prac__row');
    row.append(
      stepper(tr(share ? 'practice.groups' : 'practice.rows'), () => rows, (v) => ((rows = v), draw(), sound?.tap()), 1, 10),
      stepper(tr(share ? 'practice.inEach' : 'practice.inEachRow'), () => cols, (v) => ((cols = v), draw(), sound?.tap()), 1, 10)
    );
    box.append(view, total, row);
    draw();
  },

  /** Shade the slices of a pizza. */
  pizza(box, p, { sound }) {
    const d = p.data;
    const parts = d.parts ?? d.d;
    const per = d.whole ? d.whole / d.d : null;
    let on = new Set();
    const wrap = el('div', 'arc-pizza');
    const info = el('p', 'arc-prac__pos');
    const draw = () => {
      let s = `<svg viewBox="-110 -110 220 220" role="img" aria-label="${tr('practice.pizzaAria', { parts, n: on.size })}">`;
      for (let k = 0; k < parts; k++) {
        const a0 = -Math.PI / 2 + (k / parts) * Math.PI * 2, a1 = -Math.PI / 2 + ((k + 1) / parts) * Math.PI * 2;
        const large = a1 - a0 > Math.PI ? 1 : 0;
        s += `<path data-k="${k}" class="arc-pizza__slice${on.has(k) ? ' is-on' : ''}" d="M0 0 L${Math.cos(a0) * 100} ${Math.sin(a0) * 100} A100 100 0 ${large} 1 ${Math.cos(a1) * 100} ${Math.sin(a1) * 100} Z"/>`;
        if (per) s += `<text class="arc-pizza__val" x="${Math.cos((a0 + a1) / 2) * 62}" y="${Math.sin((a0 + a1) / 2) * 62 + 6}">${per}</text>`;
      }
      s += '</svg>';
      wrap.innerHTML = s;
      for (const path of wrap.querySelectorAll('path')) {
        path.setAttribute('tabindex', '0');
        path.setAttribute('role', 'button');
        const toggle = () => {
          const k = Number(path.dataset.k);
          on.has(k) ? on.delete(k) : on.add(k);
          sound?.tap();
          draw();
        };
        path.addEventListener('click', toggle);
        path.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle()));
      }
      info.textContent = per ? tr('practice.fracOf', { frac: `${fmt(on.size)}/${fmt(parts)}`, whole: d.whole, n: on.size * per }) : tr('practice.cheese', { frac: `${fmt(on.size)}/${fmt(parts)}` });
    };
    box.append(el('p', 'arc-prac__say', per ? tr('practice.slices', { per, n: d.n, frac: `${fmt(d.n)}/${fmt(d.d)}`, whole: d.whole }) : tr('practice.cheeseOn', { n: d.shaded, parts })), wrap, info);
    draw();
  },

  /** A balance scale: change x until both sides weigh the same. */
  balance(box, p, { sound }) {
    const d = p.data;
    const mult = d.c !== undefined ? d.a : 1;
    const add = d.c !== undefined ? d.b : d.a;
    const target = d.c !== undefined ? d.c : d.b;
    let x = 0;
    const scale = el('div', 'arc-bal');
    const info = el('p', 'arc-prac__pos');
    const draw = () => {
      const left = mult * x + add;
      const tilt = Math.max(-14, Math.min(14, (target - left) * 1.5));
      scale.innerHTML = `<svg viewBox="0 0 400 200" role="img" aria-label="${tr('practice.scaleAria', { left, right: target })}">
        <polygon points="200,120 180,190 220,190" class="arc-bal__stand"/>
        <g transform="rotate(${tilt} 200 120)"><line x1="60" y1="120" x2="340" y2="120" class="arc-bal__beam"/>
        <rect x="70" y="${120 - 48}" width="100" height="44" rx="8" class="arc-bal__left"/><text x="120" y="${120 - 19}" class="arc-bal__t">${mult > 1 ? mult : ''}x + ${add}</text>
        <rect x="230" y="${120 - 48}" width="100" height="44" rx="8" class="arc-bal__right"/><text x="280" y="${120 - 19}" class="arc-bal__t">${target}</text></g></svg>`;
      info.textContent = left === target ? tr('practice.balanced', { x }) : tr(left < target ? 'practice.tooLight' : 'practice.tooHeavy', { x, left });
      scale.classList.toggle('is-level', left === target);
    };
    box.append(el('p', 'arc-prac__say', tr('practice.level')), scale, info);
    const row = el('div', 'arc-prac__row');
    row.append(stepper('x', () => x, (v) => ((x = v), draw(), sound?.tap()), 0, 40));
    box.append(row);
    draw();
  },

  /** A grid of squares to shade (area, per cent, squares, the grid method). */
  grid(box, p, { sound }) {
    const d = p.data;
    let w = 10, h = 10, say = tr('practice.gridTap');
    if (d.w) {
      w = d.w;
      h = d.h;
      say = tr(d.ask === 'area' ? 'practice.gridArea' : 'practice.gridPerimeter');
    } else if (d.p) say = tr('practice.gridPercent', { p: d.p });
    else if (d.n) {
      w = h = d.n;
      say = tr('practice.gridSquare', { n: d.n });
    } else if (d.op === '×') {
      w = Math.min(10, d.b);
      h = Math.min(10, Math.ceil(d.a / 10));
      say = tr('practice.gridSplit', { a: d.a, t: Math.floor(d.a / 10) * 10, o: d.a % 10, b: d.b });
    }
    const on = new Set();
    const grid = el('div', 'arc-grid', null, { role: 'group', 'aria-label': tr('practice.gridAria', { w, h }) });
    grid.style.setProperty('--cols', w);
    const info = el('p', 'arc-prac__pos', '0 coloured');
    for (let i = 0; i < w * h; i++) {
      const c = button('arc-grid__cell', '', () => {
        on.has(i) ? on.delete(i) : on.add(i);
        c.classList.toggle('is-on', on.has(i));
        info.textContent = tr('practice.coloured', { n: on.size });
        sound?.tap();
      }, { 'aria-label': tr('practice.squareAria', { n: i + 1 }) });
      grid.append(c);
    }
    box.append(el('p', 'arc-prac__say', say), grid, info);
    if (d.p || (d.w && d.ask === 'area')) {
      box.append(button('arc-btn arc-btn--ghost', tr(d.p ? 'practice.row10' : 'practice.wholeRow'), () => {
        let added = 0;
        for (let i = 0; i < w * h && added < w; i++) if (!on.has(i)) {
          on.add(i);
          grid.children[i].classList.add('is-on');
          added++;
        }
        info.textContent = tr('practice.coloured', { n: on.size });
      }));
    }
    if (d.op === '×') {
      const t = Math.floor(d.a / 10) * 10, o = d.a % 10;
      const parts = el('div', 'arc-prac__row');
      parts.append(button('arc-btn', `${t} × ${d.b} = ?`, (e) => (e.currentTarget.textContent = `${t} × ${d.b} = ${t * d.b}`)), button('arc-btn', `${o} × ${d.b} = ?`, (e) => (e.currentTarget.textContent = `${o} × ${d.b} = ${o * d.b}`)));
      box.append(parts);
    }
  }
};
