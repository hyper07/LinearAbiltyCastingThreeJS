/**
 * Hands-on math: a manipulative for each kind of practice (content/schema.js
 * PRACTICE_KINDS), built around one generated problem. The child plays with
 * it — counts, hops, builds, shades, balances — then answers. Everything is
 * buttons and taps (keyboard and touch alike); nothing needs dragging.
 *
 *   mountPractice(kind, problem, host, { sound }) → { dispose() }
 */
import { el, button } from '../ui/dom.js';

const fmt = (n) => (n < 0 ? `−${-n}` : Number.isInteger(n) ? String(n) : n.toFixed(1));

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
  }, { 'aria-label': `${label} down` });
  const inc = button('arc-step__btn', '+', () => {
    set(Math.min(max, get() + step));
    out.textContent = fmt(get());
  }, { 'aria-label': `${label} up` });
  wrap.append(el('span', 'arc-step__label', label), dec, out, inc);
  return wrap;
};

const KINDS = {
  /** Tap each thing to count it: numbers appear in order. */
  count(box, p, { sound }) {
    const n = p.data.n ?? (p.data.a ?? 0) + (p.data.b ?? 0);
    const emoji = p.data.emoji ?? '🍎';
    box.append(el('p', 'arc-prac__say', 'Tap each one to count it.'));
    const field = el('div', 'arc-count');
    let next = 1;
    const tally = el('div', 'arc-count__tally', 'Counted: 0');
    for (let i = 0; i < n; i++) {
      const b = button('arc-count__item', emoji, () => {
        if (b.dataset.n) return;
        b.dataset.n = String(next);
        b.append(el('span', 'arc-count__n', String(next)));
        tally.textContent = `Counted: ${next}`;
        next++;
        sound?.tap();
      }, { 'aria-label': `${emoji} number ${i + 1}, not counted yet` });
      field.append(b);
    }
    box.append(field, tally, button('arc-btn arc-btn--ghost', '↺ Start again', () => {
      next = 1;
      tally.textContent = 'Counted: 0';
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
    box.append(el('p', 'arc-prac__say', d.by ? `Hop in ${d.by}s. Where does the next hop land?` : `The frog starts at ${fmt(start)}. Hop to find the answer!`));
    const svgWrap = el('div', 'arc-nl');
    const draw = () => {
      const count = Math.round((hi - lo) / step);
      const X = (v) => 30 + ((v - lo) / (hi - lo)) * 640;
      let s = `<svg viewBox="0 0 700 150" role="img" aria-label="Number line, the frog is on ${fmt(at)}"><line x1="10" y1="100" x2="690" y2="100" class="arc-nl__axis"/>`;
      for (let k = 0; k <= count; k++) {
        const v = Math.round((lo + k * step) * 100) / 100;
        const show = count <= 26 || k % 2 === 0;
        s += `<line x1="${X(v)}" y1="90" x2="${X(v)}" y2="110" class="arc-nl__tick"/>${show ? `<text x="${X(v)}" y="134" class="arc-nl__label">${fmt(dec ? Number(v.toFixed(1)) : v)}</text>` : ''}`;
      }
      s += `<circle cx="${X(start)}" cy="100" r="7" class="arc-nl__start"/><text x="${X(at)}" y="78" class="arc-nl__frog">🐸</text></svg>`;
      svgWrap.innerHTML = s;
    };
    draw();
    const pos = el('p', 'arc-prac__pos', `The frog is on ${fmt(at)}`);
    const hop = (k) => {
      at = Math.round(Math.max(lo, Math.min(hi, at + k * step)) * 100) / 100;
      pos.textContent = `The frog is on ${fmt(at)}`;
      draw();
      sound?.tap();
    };
    const row = el('div', 'arc-prac__row');
    row.append(button('arc-btn', `◀ Hop back ${fmt(step)}`, () => hop(-1)), button('arc-btn', `Hop forward ${fmt(step)} ▶`, () => hop(1)));
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
      total.textContent = `${tens} tens and ${ones} ones make ${tens * 10 + ones}`;
    };
    box.append(el('p', 'arc-prac__say', `Build the number ${p.data.n} with sticks of ten and little ones.`), view, total);
    const row = el('div', 'arc-prac__row');
    row.append(
      stepper('Tens', () => tens, (v) => ((tens = v), draw(), sound?.tap()), 0, 9),
      stepper('Ones', () => ones, (v) => ((ones = v), draw(), sound?.tap()), 0, 9)
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
    box.append(el('p', 'arc-prac__say', op === '+' ? 'Add the ones first. Tap the boxes to set each answer digit.' : 'Start with the ones. Borrow a ten if you need to.'));
    const grid = el('div', 'arc-col', null, { role: 'group', 'aria-label': `${a} ${op === '+' ? 'plus' : 'minus'} ${b}` });
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
        s.setAttribute('aria-label', `${['ones', 'tens', 'hundreds'][idx]} digit: ${digits[idx]}. Tap to change`);
        sound?.tap();
      }, { 'aria-label': `${['ones', 'tens', 'hundreds'][idx]} digit. Tap to change` });
      slots.push(s);
      ans.append(s);
    }
    grid.append(ans);
    box.append(grid);
    const hint = button('arc-btn arc-btn--ghost', op === '+' ? '✏️ Show the carry' : '✏️ Show the borrow', () => {
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
      total.textContent = share ? `${rows} groups of ${cols} = ${rows * cols}${rows * cols === d.a ? ' ✓ all shared out!' : ''}` : `${rows} rows of ${cols} = ${rows * cols}`;
    };
    box.append(el('p', 'arc-prac__say', share ? `Share ${d.a} sweets into ${d.b} groups: how many in each group?` : `Make ${d.a} rows of ${d.b}, then count them all.`));
    const row = el('div', 'arc-prac__row');
    row.append(
      stepper(share ? 'Groups' : 'Rows', () => rows, (v) => ((rows = v), draw(), sound?.tap()), 1, 10),
      stepper(share ? 'In each' : 'In each row', () => cols, (v) => ((cols = v), draw(), sound?.tap()), 1, 10)
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
      let s = `<svg viewBox="-110 -110 220 220" role="img" aria-label="Pizza in ${parts} slices, ${on.size} chosen">`;
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
      info.textContent = per ? `${on.size}/${parts} of ${d.whole} = ${on.size * per}` : `${on.size}/${parts} of the pizza has cheese`;
    };
    box.append(el('p', 'arc-prac__say', per ? `Each slice is ${per}. Tap ${d.n} slices to find ${d.n}/${d.d} of ${d.whole}.` : `Tap the slices to put cheese on ${d.shaded} of the ${parts}.`), wrap, info);
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
      scale.innerHTML = `<svg viewBox="0 0 400 200" role="img" aria-label="Scale: left ${left}, right ${target}">
        <polygon points="200,120 180,190 220,190" class="arc-bal__stand"/>
        <g transform="rotate(${tilt} 200 120)"><line x1="60" y1="120" x2="340" y2="120" class="arc-bal__beam"/>
        <rect x="70" y="${120 - 48}" width="100" height="44" rx="8" class="arc-bal__left"/><text x="120" y="${120 - 19}" class="arc-bal__t">${mult > 1 ? mult : ''}x + ${add}</text>
        <rect x="230" y="${120 - 48}" width="100" height="44" rx="8" class="arc-bal__right"/><text x="280" y="${120 - 19}" class="arc-bal__t">${target}</text></g></svg>`;
      info.textContent = left === target ? `Balanced! x = ${x}` : `With x = ${x}, the left side is ${left}${left < target ? ' — too light' : ' — too heavy'}`;
      scale.classList.toggle('is-level', left === target);
    };
    box.append(el('p', 'arc-prac__say', 'Change x until the scale is level.'), scale, info);
    const row = el('div', 'arc-prac__row');
    row.append(stepper('x', () => x, (v) => ((x = v), draw(), sound?.tap()), 0, 40));
    box.append(row);
    draw();
  },

  /** A grid of squares to shade (area, per cent, squares, the grid method). */
  grid(box, p, { sound }) {
    const d = p.data;
    let w = 10, h = 10, say = 'Tap squares to colour them.';
    if (d.w) {
      w = d.w;
      h = d.h;
      say = d.ask === 'area' ? 'Count the squares inside the rectangle (tap to mark them).' : 'Walk round the edge: tap the squares along the outside.';
    } else if (d.p) say = `Colour ${d.p} squares out of 100 — a whole row is 10.`;
    else if (d.n) {
      w = h = d.n;
      say = `A ${d.n} by ${d.n} square: how many tiles?`;
    } else if (d.op === '×') {
      w = Math.min(10, d.b);
      h = Math.min(10, Math.ceil(d.a / 10));
      say = `Split ${d.a} into ${Math.floor(d.a / 10) * 10} and ${d.a % 10}, then multiply each part by ${d.b}.`;
    }
    const on = new Set();
    const grid = el('div', 'arc-grid', null, { role: 'group', 'aria-label': `${w} by ${h} grid` });
    grid.style.setProperty('--cols', w);
    const info = el('p', 'arc-prac__pos', '0 coloured');
    for (let i = 0; i < w * h; i++) {
      const c = button('arc-grid__cell', '', () => {
        on.has(i) ? on.delete(i) : on.add(i);
        c.classList.toggle('is-on', on.has(i));
        info.textContent = `${on.size} coloured`;
        sound?.tap();
      }, { 'aria-label': `square ${i + 1}` });
      grid.append(c);
    }
    box.append(el('p', 'arc-prac__say', say), grid, info);
    if (d.p || (d.w && d.ask === 'area')) {
      box.append(button('arc-btn arc-btn--ghost', d.p ? 'Colour a row of 10' : 'Colour a whole row', () => {
        let added = 0;
        for (let i = 0; i < w * h && added < w; i++) if (!on.has(i)) {
          on.add(i);
          grid.children[i].classList.add('is-on');
          added++;
        }
        info.textContent = `${on.size} coloured`;
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
