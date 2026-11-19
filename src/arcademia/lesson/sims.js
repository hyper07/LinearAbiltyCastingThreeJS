/**
 * The physics lab's experiments, each a little 2D world on a canvas
 * (content/schema.js SIMS). Every one can `watch()` — play the scene the
 * lesson's prediction asked about — and then hands the controls to the child.
 *
 *   const sim = createSim(id, setup, { canvas, controls, sound });
 *   await sim.watch();   sim.frame(dt) every frame;   sim.dispose()
 *
 * The physics is real enough to be honest at this scale: a vacuum drop lands
 * together, air slows the feather; a pendulum's swing time follows
 * T = 2π√(L/g); the seesaw balances on moments; the moon orbits under 1/r².
 */
import { el, button } from '../ui/dom.js';
import { MAGNET_ITEMS, CIRCUIT_ITEMS, FLOAT_ITEMS } from '../content/schema.js';
import { t as tr, num } from '../i18n/index.js';

const W = 900, H = 500;
/** A thing's name in the current language. */
const LABEL = (id) => tr(`lab.item.${id}`);
/** A number with a unit, in the language's format: U('m', 1.5, 1) → '1.5 m' / '1,5 m'. */
const U = (unit, v, digits = 0) => tr(`lab.unit.${unit}`, { v: num(v, { minimumFractionDigits: digits, maximumFractionDigits: digits }) });
const ICON = {
  ball: '⚽', feather: '🪶', paper: '📄', 'crumpled-paper': '🗞️', 'bowling-ball': '🎳', hammer: '🔨',
  'paper-clip': '📎', 'iron-nail': '🔩', 'steel-bolt': '🔩', eraser: '🧽', 'wooden-block': '🪵', 'aluminium-can': '🥫', 'glass-marble': '🔮', 'plastic-toy': '🧸', pencil: '✏️', 'rubber-band': '➰',
  'copper-wire': '〰️', 'aluminium-foil': '🪙', 'wooden-stick': '🥢', 'plastic-straw': '🥤', 'paper-strip': '📃',
  apple: '🍎', cork: '🍾', 'rubber-duck': '🦆', 'ice-cube': '🧊', 'candle-wax': '🕯️', stone: '🪨', coin: '🪙', key: '🔑', 'metal-spoon': '🥄'
};
const DRAG = { ball: 0.004, feather: 2.6, paper: 1.6, 'crumpled-paper': 0.12, 'bowling-ball': 0.0006, hammer: 0.001 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function base(canvas) {
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  return g;
}
function bg(g, top = '#e9f4f6', bottom = '#d6e9ec') {
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
}
function text(g, s, x, y, { size = 22, color = '#1f3b36', align = 'center', weight = 800 } = {}) {
  g.font = `${weight} ${size}px "Nunito Variable", "Hiragino Maru Gothic ProN", "Apple SD Gothic Neo", "PingFang SC", "Noto Sans CJK KR", "Microsoft YaHei", system-ui, sans-serif`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillText(s, x, y);
}
function emoji(g, e, x, y, size = 48) {
  g.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(e, x, y);
}
function rrect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h);
}
function chips(host, options, value, onPick, label) {
  const wrap = el('div', 'arc-sim__chips', null, { role: 'radiogroup', 'aria-label': label });
  const bs = options.map(([v, text]) => {
    const b = button(`arc-chipbtn${v === value ? ' is-on' : ''}`, text, () => {
      for (const x of bs) {
        x.classList.toggle('is-on', x === b);
        x.setAttribute('aria-checked', String(x === b));
      }
      onPick(v);
    }, { role: 'radio', 'aria-checked': String(v === value) });
    return b;
  });
  wrap.append(...bs);
  host.append(wrap);
  return wrap;
}
/** `unit` is a unit id from lab.unit.* ('m', 's', 'deg', 'mps') or '' for a bare number. */
function slider(host, label, min, max, step, value, onInput, unit = '') {
  const wrap = el('label', 'arc-slider');
  const digits = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  const show = (v) => (unit ? U(unit, Number(v), digits) : num(Number(v), { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  const out = el('output', null, show(value));
  const input = el('input', null, null, { type: 'range', min, max, step, value });
  input.addEventListener('input', () => {
    out.textContent = show(input.value);
    onInput(Number(input.value));
  });
  wrap.append(el('span', null, label), input, out);
  host.append(wrap);
  return input;
}

const SIMS = {
  /* ---- falling: with air or in a vacuum ---- */
  drop(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    const objs = setup.objects ?? ['ball', 'feather'];
    let air = setup.air === 'off' || setup.air === 'toggle' ? false : true;
    const moon = setup.world === 'moon';
    const gAcc = moon ? 1.62 : 9.8;
    const top = 70, floor = 430, scale = (floor - top) / 2.0; // 2 m drop
    let bodies, running = false, t = 0, done = null;
    const reset = () => {
      bodies = objs.map((o, i) => ({ o, x: 330 + i * 240, y: 0, v: 0, landed: null }));
      t = 0;
      running = false;
    };
    reset();
    const go = () => {
      reset();
      running = true;
      sound?.tap();
      return new Promise((r) => (done = r));
    };
    if (setup.air === 'toggle') chips(controls, [[false, tr('lab.noAir')], [true, tr('lab.withAir')]], air, (v) => ((air = v), reset()), tr('lab.air'));
    controls.append(button('arc-btn arc-btn--primary', tr('lab.drop'), () => go()));
    return {
      watch: () => go().then(() => wait(900)),
      frame(dt) {
        if (running) {
          const step = Math.min(dt, 1 / 60);
          t += step;
          for (const b of bodies) {
            if (b.landed != null) continue;
            const k = air ? DRAG[b.o] ?? 0.01 : 0;
            b.v += (gAcc - k * b.v * b.v * (b.o === 'feather' || b.o === 'paper' ? 6 : 1)) * step;
            b.y += b.v * step;
            if (b.y >= 2) {
              b.y = 2;
              b.landed = t;
              sound?.step();
            }
          }
          if (bodies.every((b) => b.landed != null)) {
            running = false;
            done?.();
          }
        }
        bg(g, air ? '#e9f4f6' : '#1d2a4a', air ? '#d6e9ec' : '#2b3f6b');
        if (!air) for (let i = 0; i < 30; i++) g.fillRect((i * 97) % W, (i * 53) % 300, 2, 2);
        g.fillStyle = air ? '#b98f5f' : '#7a7f8a';
        g.fillRect(0, floor + 22, W, H - floor);
        text(g, tr(air ? 'lab.airTitle' : moon ? 'lab.moonTitle' : 'lab.vacuumTitle'), W / 2, 30, { color: air ? '#1f3b36' : '#ffe9a8' });
        for (const b of bodies) {
          const y = top + b.y * scale;
          const wob = b.o === 'feather' && air && b.landed == null ? Math.sin(t * 6) * 18 : 0;
          emoji(g, ICON[b.o], b.x + wob, y, 54);
          text(g, LABEL(b.o), b.x, floor + 60, { size: 18, color: air ? '#1f3b36' : '#fff' });
          if (b.landed != null) text(g, U('s', b.landed, 2), b.x, floor + 86, { size: 17, color: air ? '#2c6b62' : '#9fe0c8' });
        }
        g.strokeStyle = air ? '#6b8f88' : '#6f86b8';
        g.setLineDash([6, 8]);
        g.beginPath();
        g.moveTo(80, top);
        g.lineTo(W - 80, top);
        g.stroke();
        g.setLineDash([]);
      }
    };
  },

  /* ---- a toy car down a ramp, onto different floors ---- */
  ramp(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    const surfaces = setup.surfaces ?? ['ice', 'wood', 'carpet'];
    const MU = { ice: 0.03, wood: 0.18, carpet: 0.42, sand: 0.65 };
    const COL = { ice: '#cfeefa', wood: '#c69c6d', carpet: '#b85c6e', sand: '#e6cf8f' };
    let surface = surfaces[0], angle = 25;
    const marks = {};
    let car = null, done = null;
    const start = () => {
      const a = (angle * Math.PI) / 180;
      car = { s: 0, v: 0, onFloor: false, x: 0, a };
      sound?.tap();
      return new Promise((r) => (done = r));
    };
    const pick = chips(controls, surfaces.map((s) => [s, tr(`lab.surface.${s}`)]), surface, (v) => (surface = v), tr('lab.floor'));
    slider(controls, tr('lab.tilt'), 10, 45, 1, angle, (v) => (angle = v), 'deg');
    controls.append(button('arc-btn arc-btn--primary', tr('lab.letGo'), () => start()));
    const rampLen = 3; // m
    const px = 80; // px per m
    return {
      async watch() {
        for (const s of surfaces) {
          surface = s;
          for (const b of pick.children) b.classList.toggle('is-on', b.textContent.toLowerCase() === s);
          await start();
          await wait(500);
        }
      },
      frame(dt) {
        const a = (angle * Math.PI) / 180;
        if (car) {
          const step = Math.min(dt, 1 / 60) * 1.4;
          if (!car.onFloor) {
            car.v += 9.8 * (Math.sin(car.a) - 0.03 * Math.cos(car.a)) * step;
            car.s += car.v * step;
            if (car.s >= rampLen) car.onFloor = true;
          } else {
            car.v = Math.max(0, car.v - MU[surface] * 9.8 * step);
            car.x += car.v * step;
            if (car.v <= 0 || car.x > 9.5) {
              marks[surface] = Math.min(car.x, 9.5);
              car = null;
              sound?.step();
              done?.();
            }
          }
        }
        bg(g);
        const baseY = 400, x0 = 60;
        const topX = x0, topY = baseY - Math.sin(a) * rampLen * px * 1.0;
        const footX = x0 + Math.cos(a) * rampLen * px;
        g.fillStyle = '#8a5e3c';
        g.beginPath();
        g.moveTo(topX, topY);
        g.lineTo(footX, baseY);
        g.lineTo(topX, baseY);
        g.closePath();
        g.fill();
        g.fillStyle = COL[surface];
        g.fillRect(footX, baseY, W - footX, 20);
        text(g, tr('lab.floorIs', { surface: tr(`lab.surface.${surface}`) }), footX + 120, baseY + 50, { size: 20 });
        for (const [s, d] of Object.entries(marks)) {
          const mx = footX + d * px;
          g.fillStyle = COL[s];
          g.strokeStyle = '#1f3b36';
          g.fillRect(mx - 2, baseY - 60, 4, 60);
          rrect(g, mx - 34, baseY - 92, 68, 30, 8);
          g.fill();
          g.stroke();
          text(g, tr('lab.mark', { surface: tr(`lab.surface.${s}`), d: U('m', d, 1) }), mx, baseY - 77, { size: 13 });
        }
        let cx, cy, rot = 0;
        if (!car) {
          cx = topX + 24 * Math.cos(a);
          cy = topY + 24 * Math.sin(a);
          rot = a;
        } else if (!car.onFloor) {
          cx = topX + car.s * px * Math.cos(a);
          cy = topY + car.s * px * Math.sin(a);
          rot = a;
        } else {
          cx = footX + car.x * px;
          cy = baseY;
        }
        g.save();
        g.translate(cx, cy);
        g.rotate(rot);
        g.fillStyle = '#e36a5c';
        rrect(g, -26, -30, 52, 22, 6);
        g.fill();
        g.fillStyle = '#2b2b33';
        for (const wx of [-15, 15]) {
          g.beginPath();
          g.arc(wx, -7, 8, 0, Math.PI * 2);
          g.fill();
        }
        g.restore();
      }
    };
  },

  /* ---- pendulums ---- */
  pendulum(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    const bobs = [
      { L: 0.5, m: 'small', th: 0.5, w: 0, swings: 0, last: 0, t: 0 },
      { L: 2.0, m: 'big', th: 0.5, w: 0, swings: 0, last: 0, t: 0 }
    ];
    let running = false;
    const go = () => {
      for (const b of bobs) Object.assign(b, { th: 0.5, w: 0, swings: 0, last: Math.sign(0.5), t: 0 });
      running = true;
      sound?.tap();
    };
    const right = el('div', 'arc-sim__group');
    right.append(el('strong', null, tr('lab.pendulum', { n: 'B' })));
    slider(right, tr('lab.string'), 0.3, 2.5, 0.1, bobs[1].L, (v) => (bobs[1].L = v), 'm');
    chips(right, [['small', tr('lab.light')], ['big', tr('lab.heavy')]], 'big', (v) => (bobs[1].m = v), tr('lab.weight'));
    const left = el('div', 'arc-sim__group');
    left.append(el('strong', null, tr('lab.pendulum', { n: 'A' })));
    slider(left, tr('lab.string'), 0.3, 2.5, 0.1, bobs[0].L, (v) => (bobs[0].L = v), 'm');
    chips(left, [['small', tr('lab.light')], ['big', tr('lab.heavy')]], 'small', (v) => (bobs[0].m = v), tr('lab.weight'));
    controls.append(left, right, button('arc-btn arc-btn--primary', tr('lab.letGo'), go));
    return {
      async watch() {
        go();
        await wait(7000);
      },
      frame(dt) {
        if (running) {
          const n = 8, h = Math.min(dt, 1 / 30) / n;
          for (const b of bobs) for (let i = 0; i < n; i++) {
            b.w += (-9.8 / b.L) * Math.sin(b.th) * h;
            b.th += b.w * h;
            b.t += h;
            const s = Math.sign(b.th);
            if (s > 0 && b.last <= 0) b.swings++;
            b.last = s;
          }
        }
        bg(g);
        g.fillStyle = '#8a5e3c';
        g.fillRect(80, 40, W - 160, 16);
        bobs.forEach((b, i) => {
          const ox = 280 + i * 340, oy = 56, len = 70 + b.L * 140;
          const x = ox + Math.sin(b.th) * len, y = oy + Math.cos(b.th) * len;
          g.strokeStyle = '#4c5560';
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(ox, oy);
          g.lineTo(x, y);
          g.stroke();
          g.fillStyle = i ? '#2a78d6' : '#eb6834';
          g.beginPath();
          g.arc(x, y, b.m === 'big' ? 26 : 15, 0, Math.PI * 2);
          g.fill();
          const T = 2 * Math.PI * Math.sqrt(b.L / 9.8);
          text(g, tr('lab.swingTime', { n: i ? 'B' : 'A', len: U('m', b.L, 1), t: U('s', T, 1) }), ox, 450, { size: 18 });
          text(g, tr('lab.swings', { n: b.swings }), ox, 478, { size: 16, color: '#5b6f69' });
        });
      }
    };
  },

  /* ---- a seesaw ---- */
  lever(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    const slots = [-4, -3, -2, -1, 1, 2, 3, 4];
    let weights = { '-4': 0, '-3': 0, '-2': 0, '-1': 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    let tilt = 0;
    let picked = 1;
    const sideOf = (s) => (s < 0 ? 'left' : 'right');
    chips(controls, [[1, U('kg', 1)], [2, U('kg', 2)], [3, U('kg', 3)]], 1, (v) => (picked = v), tr('lab.place'));
    const pegs = el('div', 'arc-sim__pegs');
    for (const s of slots) pegs.append(button('arc-chipbtn', `${s < 0 ? '◀' : ''}${Math.abs(s)}${s > 0 ? '▶' : ''}`, () => {
      weights[s] = weights[s] ? 0 : picked;
      sound?.tap();
    }, { 'aria-label': tr('lab.pegAria', { n: Math.abs(s), side: tr(`lab.${sideOf(s)}`) }) }));
    controls.append(el('span', 'arc-sim__note', tr('lab.pegNote')), pegs, button('arc-btn', tr('lab.clear'), () => (weights = Object.fromEntries(Object.keys(weights).map((k) => [k, 0])))));
    return {
      async watch() {
        weights = { '-4': 0, '-3': 0, '-2': 2, '-1': 0, 1: 0, 2: 0, 3: 0, 4: 1 };
        await wait(2200);
        weights[4] = 0;
        weights[1] = 0;
        weights[4] = 1;
        await wait(800);
      },
      frame(dt) {
        const moment = slots.reduce((m, s) => m + s * (weights[s] ?? 0), 0);
        const want = Math.max(-0.28, Math.min(0.28, moment * 0.05));
        tilt += (want - tilt) * Math.min(1, dt * 4);
        bg(g);
        const cx = W / 2, cy = 300;
        g.fillStyle = '#8a5e3c';
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx - 40, cy + 110);
        g.lineTo(cx + 40, cy + 110);
        g.closePath();
        g.fill();
        g.save();
        g.translate(cx, cy);
        g.rotate(tilt);
        g.fillStyle = '#c69c6d';
        rrect(g, -380, -14, 760, 20, 6);
        g.fill();
        for (const s of slots) {
          const x = s * 88;
          g.fillStyle = '#5b6f69';
          g.fillRect(x - 2, 6, 4, 10);
          text(g, String(Math.abs(s)), x, 32, { size: 15, color: '#5b6f69' });
          const wgt = weights[s];
          if (wgt) {
            g.fillStyle = ['#2a78d6', '#eb6834', '#1baf7a'][wgt - 1];
            const hgt = 26 + wgt * 14;
            rrect(g, x - 28, -14 - hgt, 56, hgt, 6);
            g.fill();
            text(g, U('kg', wgt), x, -14 - hgt / 2, { size: 16, color: '#fff' });
          }
        }
        g.restore();
        const L = slots.filter((s) => s < 0).reduce((m, s) => m + -s * weights[s], 0);
        const R = slots.filter((s) => s > 0).reduce((m, s) => m + s * weights[s], 0);
        text(g, `${tr('lab.turning', { l: L, r: R })}   ${L === R && L > 0 ? tr('lab.balanced') : ''}`, W / 2, 460, { size: 20 });
        text(g, tr('lab.moment'), W / 2, 488, { size: 15, color: '#5b6f69' });
      }
    };
  },

  /* ---- a magnet and everyday things ---- */
  magnet(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    const items = setup.items.map((id, i) => ({ id, x: 140 + i * (620 / Math.max(1, setup.items.length - 1)), y: 380, stuck: false, magnetic: MAGNET_ITEMS[id] }));
    let mx = 80;
    let target = 80;
    const move = (to) => (target = Math.max(60, Math.min(W - 60, to)));
    controls.append(button('arc-btn', tr('lab.magnetLeft'), () => move(target - 110)), button('arc-btn', tr('lab.magnetRight'), () => move(target + 110)), button('arc-btn', tr('lab.putBack'), () => items.forEach((it, i) => Object.assign(it, { stuck: false, x: 140 + i * (620 / Math.max(1, items.length - 1)), y: 380 }))));
    canvas.addEventListener('pointermove', (e) => {
      if (e.buttons !== 1) return;
      const r = canvas.getBoundingClientRect();
      move(((e.clientX - r.left) / r.width) * W);
    });
    return {
      async watch() {
        target = 60;
        await wait(300);
        target = W - 60;
        await wait(4200);
      },
      frame(dt) {
        mx += (target - mx) * Math.min(1, dt * 1.6);
        for (const it of items) {
          if (!it.magnetic) continue;
          if (!it.stuck && Math.abs(it.x - mx) < 70) {
            it.stuck = true;
            sound?.tap();
          }
          if (it.stuck) {
            it.x += (mx - it.x) * Math.min(1, dt * 10);
            it.y += (215 - it.y) * Math.min(1, dt * 10);
          }
        }
        bg(g);
        g.fillStyle = '#c69c6d';
        g.fillRect(0, 410, W, 90);
        // The horseshoe magnet.
        g.save();
        g.translate(mx, 130);
        g.lineWidth = 34;
        g.strokeStyle = '#d23b3b';
        g.beginPath();
        g.arc(0, 0, 50, Math.PI, 0);
        g.stroke();
        g.fillStyle = '#d23b3b';
        g.fillRect(-67, 0, 34, 50);
        g.fillRect(33, 0, 34, 50);
        g.fillStyle = '#d9dde2';
        g.fillRect(-67, 50, 34, 22);
        g.fillRect(33, 50, 34, 22);
        text(g, 'N', -50, 62, { size: 14 });
        text(g, 'S', 50, 62, { size: 14 });
        g.restore();
        for (const it of items) {
          emoji(g, ICON[it.id], it.x, it.y, 44);
          if (!it.stuck) text(g, LABEL(it.id), it.x, 440, { size: 15 });
        }
        const n = items.filter((i) => i.stuck).length;
        text(g, tr('lab.stuck', { n }), W / 2, 476, { size: 18 });
      }
    };
  },

  /* ---- a torch and a shadow ---- */
  shadow(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    let lx = 200, ly = 300, want = 200;
    slider(controls, tr('lab.torch'), 60, 420, 1, lx, (v) => (want = v));
    const wallX = 820, toyX = 520, toyH = 120, floorY = 420;
    return {
      async watch() {
        want = 420;
        await wait(2200);
        want = 80;
        await wait(2400);
      },
      frame(dt) {
        lx += (want - lx) * Math.min(1, dt * 2.5);
        g.fillStyle = '#2a2f3d';
        g.fillRect(0, 0, W, H);
        // Light cone.
        const grad = g.createRadialGradient(lx, ly, 10, lx, ly, 700);
        grad.addColorStop(0, 'rgba(255,240,180,0.55)');
        grad.addColorStop(1, 'rgba(255,240,180,0.05)');
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(lx, ly);
        g.lineTo(wallX, 0);
        g.lineTo(wallX, floorY);
        g.closePath();
        g.fill();
        g.fillStyle = '#e8dcc4';
        g.fillRect(wallX, 0, W - wallX, floorY);
        g.fillStyle = '#5a4a3a';
        g.fillRect(0, floorY, W, H - floorY);
        // The shadow: the toy's outline projected from the torch onto the wall.
        const top = floorY - toyH;
        const proj = (y) => ly + ((y - ly) * (wallX - lx)) / (toyX - lx);
        const sTop = proj(top), sBot = Math.min(floorY, proj(floorY));
        g.fillStyle = 'rgba(20,20,30,0.75)';
        rrect(g, wallX + 4, sTop, 60 * ((wallX - lx) / (toyX - lx)) * 0.5, sBot - sTop, 10);
        g.fill();
        emoji(g, '🧸', toyX, floorY - toyH / 2, 110);
        emoji(g, '🔦', lx, ly, 52);
        const big = (sBot - sTop) / toyH;
        text(g, tr('lab.shadowSize', { k: num(big, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }), W / 2 - 60, 470, { size: 20, color: '#fff' });
      }
    };
  },

  /* ---- a simple circuit ---- */
  circuit(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    let inGap = null, closed = true;
    const tray = el('div', 'arc-sim__chips');
    for (const id of setup.items) tray.append(button('arc-chipbtn', `${ICON[id] ?? ''} ${LABEL(id)}`, () => {
      inGap = id;
      sound?.tap();
    }));
    controls.append(el('span', 'arc-sim__note', tr('lab.gapNote')), tray, button('arc-btn', tr('lab.switch'), () => {
      closed = !closed;
      sound?.tap();
    }));
    let t = 0;
    return {
      async watch() {
        inGap = setup.items.find((i) => CIRCUIT_ITEMS[i]) ?? null;
        await wait(2000);
        inGap = setup.items.find((i) => !CIRCUIT_ITEMS[i]) ?? null;
        await wait(2000);
        inGap = null;
      },
      frame(dt) {
        t += dt;
        const lit = closed && inGap && CIRCUIT_ITEMS[inGap];
        bg(g, '#f3f1ea', '#e7e2d6');
        g.strokeStyle = lit ? '#e2a33a' : '#7a6a5a';
        g.lineWidth = 8;
        g.lineCap = 'round';
        const L = 150, R = 750, T = 120, B = 380;
        g.beginPath();
        g.moveTo(L, B); g.lineTo(L, T); g.lineTo(380, T);
        g.moveTo(520, T); g.lineTo(R, T); g.lineTo(R, B); g.lineTo(520, B);
        g.moveTo(380, B); g.lineTo(L, B);
        g.stroke();
        // Battery.
        g.fillStyle = '#2b2b33';
        rrect(g, 380, B - 34, 140, 68, 10);
        g.fill();
        g.fillStyle = '#e2a33a';
        g.fillRect(520, B - 14, 12, 28);
        text(g, tr('lab.battery'), 450, B, { size: 16, color: '#fff' });
        // Bulb.
        if (lit) {
          const glow = g.createRadialGradient(R, T + 130, 4, R, T + 130, 120);
          glow.addColorStop(0, 'rgba(255,230,120,0.9)');
          glow.addColorStop(1, 'rgba(255,230,120,0)');
          g.fillStyle = glow;
          g.beginPath();
          g.arc(R, T + 130, 120, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = lit ? '#fff3a8' : '#e6e6e6';
        g.strokeStyle = '#7a6a5a';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(R, T + 120, 34, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        // The gap.
        g.fillStyle = '#d6cfc0';
        rrect(g, 390, T - 30, 120, 60, 10);
        g.fill();
        if (inGap) {
          emoji(g, ICON[inGap] ?? '❔', 450, T, 40);
          text(g, LABEL(inGap), 450, T + 52, { size: 15 });
        } else text(g, tr('lab.gap'), 450, T, { size: 16, color: '#7a6a5a' });
        // Switch.
        g.strokeStyle = '#2b2b33';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(L, 230);
        g.lineTo(L + (closed ? 0 : 40), closed ? 290 : 280);
        g.stroke();
        text(g, tr(closed ? 'lab.switchOn' : 'lab.switchOff'), L + 70, 260, { size: 15, align: 'left' });
        if (lit) for (let k = 0; k < 6; k++) {
          const p = ((t * 0.25 + k / 6) % 1) * 4;
          const pt = p < 1 ? [L, B - p * (B - T)] : p < 2 ? [L + (p - 1) * (R - L), T] : p < 3 ? [R, T + (p - 2) * (B - T)] : [R - (p - 3) * (R - L), B];
          g.fillStyle = '#ffd36b';
          g.beginPath();
          g.arc(pt[0], pt[1], 6, 0, Math.PI * 2);
          g.fill();
        }
        text(g, lit ? tr('lab.lit') : inGap && !CIRCUIT_ITEMS[inGap] ? tr('lab.noLight', { item: LABEL(inGap) }) : !closed ? tr('lab.switchedOff') : tr('lab.hasGap'), W / 2, 460, { size: 19 });
      }
    };
  },

  /* ---- float or sink ---- */
  float(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    const items = setup.items.map((id, i) => ({ id, x: 130 + i * (640 / Math.max(1, setup.items.length - 1)), y: 70, v: 0, inWater: false, dropped: false, floats: FLOAT_ITEMS[id] }));
    const surface = 230, bottom = 440;
    const drop = (it) => {
      it.dropped = true;
      sound?.tap();
    };
    const tray = el('div', 'arc-sim__chips');
    items.forEach((it) => tray.append(button('arc-chipbtn', `${ICON[it.id]} ${LABEL(it.id)}`, () => drop(it))));
    controls.append(el('span', 'arc-sim__note', tr('lab.dropIn')), tray, button('arc-btn', tr('lab.takeOut'), () => items.forEach((it) => Object.assign(it, { y: 70, v: 0, dropped: false, inWater: false }))));
    let t = 0;
    return {
      async watch() {
        for (const it of items) {
          drop(it);
          await wait(700);
        }
        await wait(1500);
      },
      frame(dt) {
        t += dt;
        const h = Math.min(dt, 1 / 30);
        for (const it of items) {
          if (!it.dropped) continue;
          const sub = it.y > surface;
          if (sub && !it.inWater) {
            it.inWater = true;
            sound?.step();
          }
          if (!sub) it.v += 900 * h;
          else if (it.floats) it.v += (-(it.y - surface - 8) * 30 - it.v * 4) * h;
          else it.v += (160 - it.v * 2.5) * h;
          it.y += it.v * h;
          if (it.y > bottom - 22) {
            it.y = bottom - 22;
            it.v = 0;
          }
        }
        bg(g, '#f4efe1', '#efe6d0');
        g.fillStyle = 'rgba(80,170,210,0.45)';
        g.fillRect(70, surface, W - 140, bottom - surface);
        g.strokeStyle = 'rgba(40,90,120,0.6)';
        g.lineWidth = 4;
        g.strokeRect(70, 120, W - 140, bottom - 120);
        g.strokeStyle = 'rgba(255,255,255,0.7)';
        g.beginPath();
        for (let x = 70; x <= W - 70; x += 10) g.lineTo(x, surface + Math.sin(x * 0.05 + t * 3) * 3);
        g.stroke();
        for (const it of items) {
          const bob = it.floats && it.inWater ? Math.sin(t * 3 + it.x) * 3 : 0;
          emoji(g, ICON[it.id], it.x, it.y + bob, 42);
          if (it.inWater && Math.abs(it.v) < 20) text(g, tr(it.floats ? 'lab.floats' : 'lab.sinks'), it.x, it.floats ? surface - 40 : bottom + 30, { size: 15, color: it.floats ? '#2c6b62' : '#9a3b2b' });
        }
      }
    };
  },

  /* ---- a twanging ruler ---- */
  sound(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    let len = 0.25, strength = 0.6, amp = 0, t = 0, f = 0;
    const pluck = () => {
      f = 120 * Math.pow(0.25 / len, 2) * 2.2;
      amp = strength;
      sound?.pluck(Math.min(1400, f), strength);
    };
    slider(controls, tr('lab.sticksOut'), 0.1, 0.35, 0.01, len, (v) => (len = v), 'm');
    slider(controls, tr('lab.howHard'), 0.1, 1, 0.1, strength, (v) => (strength = v));
    controls.append(button('arc-btn arc-btn--primary', tr('lab.twang'), pluck));
    return {
      async watch() {
        len = 0.33;
        pluck();
        await wait(1700);
        len = 0.14;
        pluck();
        await wait(1700);
      },
      frame(dt) {
        t += dt;
        amp *= Math.exp(-dt * 1.6);
        bg(g);
        g.fillStyle = '#8a5e3c';
        g.fillRect(60, 260, 360, 140);
        const out = len * 1300;
        const vib = Math.sin(t * Math.min(60, f * 0.25)) * amp * 60 * (0.35 / len);
        g.save();
        g.strokeStyle = '#d9b44a';
        g.lineWidth = 12;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(200, 258);
        g.quadraticCurveTo(420 + out * 0.5, 258 + vib * 0.4, 420 + out, 258 + vib);
        g.stroke();
        g.restore();
        g.fillStyle = '#5b6f69';
        rrect(g, 330, 230, 90, 26, 6);
        g.fill();
        text(g, '✋', 375, 220, { size: 30 });
        // Sound waves.
        if (amp > 0.03) for (let k = 0; k < 4; k++) {
          g.strokeStyle = `rgba(42,120,214,${amp * (1 - k / 4)})`;
          g.lineWidth = 3;
          g.beginPath();
          g.arc(420 + out, 258, 30 + k * 30 + ((t * 120) % 30), -0.6, 0.6);
          g.stroke();
        }
        text(g, `${tr('lab.sticking', { len: U('cm', Math.round(len * 100)) })} · ${tr(f ? (len < 0.2 ? 'lab.high' : len > 0.28 ? 'lab.low' : 'lab.middle') : 'lab.twangIt')}${f ? ` · ${tr(amp > 0.55 ? 'lab.loud' : amp > 0.2 ? 'lab.medium' : 'lab.soft')}` : ''}`, W / 2, 460, { size: 20 });
      }
    };
  },

  /* ---- ice, water, steam ---- */
  states(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    let temp = -10, heat = 0;
    let latent = 0; // energy soaked up while melting or boiling
    const parts = Array.from({ length: 60 }, (_, i) => ({ gx: (i % 10) * 26, gy: Math.floor(i / 10) * 26, x: 0, y: 0, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40 }));
    slider(controls, tr('lab.heat'), -3, 3, 1, heat, (v) => (heat = v));
    return {
      async watch() {
        temp = -10;
        heat = 3;
        await wait(9000);
        heat = 0;
      },
      frame(dt) {
        // Heat goes into the temperature, except while melting (0 °C) or boiling (100 °C).
        let q = heat * 9 * dt;
        if ((Math.abs(temp) < 0.01 || Math.abs(temp - 100) < 0.01) && q !== 0) {
          latent += q;
          if (latent > 25 || latent < -25) {
            temp += Math.sign(latent) * 0.02;
            latent = 0;
          }
          q = 0;
        } else {
          const next = temp + q;
          if ((temp < 0 && next >= 0) || (temp > 0 && next <= 0)) temp = 0;
          else if ((temp < 100 && next >= 100) || (temp > 100 && next <= 100)) temp = 100;
          else temp = Math.max(-20, Math.min(120, next));
        }
        const state = temp < 0 || (temp === 0 && latent <= 0 && heat <= 0) ? 'ice' : temp < 100 || (temp === 100 && heat <= 0 && latent <= 0) ? 'water' : 'steam';
        const melting = Math.abs(temp) < 0.01 && heat > 0, boiling = Math.abs(temp - 100) < 0.01 && heat > 0;
        bg(g, '#f4efe1', '#efe6d0');
        // Beaker.
        g.strokeStyle = '#7f9fb0';
        g.lineWidth = 5;
        g.strokeRect(220, 120, 300, 300);
        const sp = state === 'ice' ? 4 : state === 'water' ? 60 : 220;
        for (const p of parts) {
          if (state === 'ice') {
            p.x += (260 + p.gx - p.x) * Math.min(1, dt * 6) + (Math.random() - 0.5) * 2;
            p.y += (180 + p.gy - p.y) * Math.min(1, dt * 6) + (Math.random() - 0.5) * 2;
          } else {
            p.vx += (Math.random() - 0.5) * sp * dt * 10;
            p.vy += (Math.random() - 0.5) * sp * dt * 10 + (state === 'water' ? 60 * dt : 0);
            const sn = Math.hypot(p.vx, p.vy) || 1;
            p.vx = (p.vx / sn) * sp;
            p.vy = (p.vy / sn) * sp;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            const minY = state === 'water' ? 280 : 30;
            if (p.x < 232 || p.x > 508) p.vx *= -1, p.x = Math.max(232, Math.min(508, p.x));
            if (p.y < minY || p.y > 408) p.vy *= -1, p.y = Math.max(minY, Math.min(408, p.y));
          }
          g.fillStyle = state === 'ice' ? '#9fd3ff' : state === 'water' ? '#2a78d6' : '#b8c4cc';
          g.beginPath();
          g.arc(p.x, p.y, 9, 0, Math.PI * 2);
          g.fill();
        }
        // Flame or frost under the beaker.
        if (heat > 0) for (let k = 0; k < heat * 3; k++) emoji(g, '🔥', 270 + k * 24, 446, 26);
        if (heat < 0) for (let k = 0; k < -heat * 3; k++) emoji(g, '❄️', 270 + k * 24, 446, 24);
        // Thermometer.
        g.fillStyle = '#fff';
        g.strokeStyle = '#5b6f69';
        rrect(g, 640, 90, 40, 320, 20);
        g.fill();
        g.stroke();
        const level = ((temp + 20) / 140) * 280;
        g.fillStyle = '#d23b3b';
        g.fillRect(648, 400 - level, 24, level);
        for (const [v, lab] of [[0, U('c', 0)], [100, U('c', 100)]]) {
          const y = 400 - ((v + 20) / 140) * 280;
          g.fillStyle = '#5b6f69';
          g.fillRect(684, y - 1, 16, 2);
          text(g, lab, 706, y, { size: 15, align: 'left' });
        }
        text(g, U('c', Math.round(temp)), 660, 440, { size: 20 });
        text(g, tr(melting ? 'lab.melting' : boiling ? 'lab.boiling' : state === 'ice' ? 'lab.ice' : state === 'water' ? 'lab.water' : 'lab.steam'), 370, 70, { size: 24 });
      }
    };
  },

  /* ---- launching a moon ---- */
  orbit(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    const GM = 3.2e6, cx = W / 2, cy = H / 2 + 10, R = 60;
    let speed = 230, moon = null, trail = [], status = tr('lab.setSpeed');
    const launch = () => {
      moon = { x: cx, y: cy - 170, vx: speed, vy: 0, t: 0 };
      trail = [];
      status = tr('lab.flying');
      sound?.tap();
    };
    slider(controls, tr('lab.speed'), 80, 260, 5, speed, (v) => (speed = v));
    controls.append(button('arc-btn arc-btn--primary', tr('lab.launch'), launch));
    const run = async (v, ms) => {
      speed = v;
      launch();
      await wait(ms);
    };
    return {
      async watch() {
        await run(90, 2600);
        await run(137, 4800);
        await run(230, 3000);
      },
      frame(dt) {
        if (moon) {
          const n = 10, h = Math.min(dt, 1 / 30) / n;
          for (let i = 0; i < n && moon; i++) {
            const dx = cx - moon.x, dy = cy - moon.y, r = Math.hypot(dx, dy);
            const a = GM / (r * r);
            moon.vx += (a * dx) / r * h;
            moon.vy += (a * dy) / r * h;
            moon.x += moon.vx * h;
            moon.y += moon.vy * h;
            moon.t += h;
            if (r < R + 10) {
              status = tr('lab.tooSlow');
              moon = null;
              sound?.step();
            } else if (r > 700) {
              status = tr('lab.tooFast');
              moon = null;
            } else if (moon.t > 3.2) status = tr('lab.inOrbit');
          }
          if (moon && (trail.push([moon.x, moon.y]), trail.length > 260)) trail.shift();
        }
        g.fillStyle = '#0f1a33';
        g.fillRect(0, 0, W, H);
        for (let i = 0; i < 60; i++) {
          g.fillStyle = 'rgba(255,255,255,0.7)';
          g.fillRect((i * 151) % W, (i * 89) % H, 2, 2);
        }
        const pg = g.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, R);
        pg.addColorStop(0, '#6fb3ff');
        pg.addColorStop(1, '#2a5fa8');
        g.fillStyle = pg;
        g.beginPath();
        g.arc(cx, cy, R, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(255,230,140,0.6)';
        g.lineWidth = 2;
        g.beginPath();
        trail.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
        if (moon) {
          g.fillStyle = '#e6e2d6';
          g.beginPath();
          g.arc(moon.x, moon.y, 14, 0, Math.PI * 2);
          g.fill();
        }
        text(g, status, W / 2, 470, { size: 20, color: '#fff' });
        text(g, tr('lab.speedIs', { n: speed }), 90, 30, { size: 16, color: '#9fb4d6' });
      }
    };
  },

  /* ---- a mirror and a beam of light ---- */
  mirror(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    let angle = 30; // degrees of the incoming beam from the normal
    let shown = 30;
    slider(controls, tr('lab.beam'), 10, 70, 1, angle, (v) => (angle = v), 'deg');
    return {
      async watch() {
        angle = 30;
        await wait(2500);
        angle = 55;
        await wait(2000);
        angle = 30;
      },
      frame(dt) {
        shown += (angle - shown) * Math.min(1, dt * 4);
        g.fillStyle = '#1d2433';
        g.fillRect(0, 0, W, H);
        const mx = W / 2, my = 400, L = 320;
        const a = (shown * Math.PI) / 180;
        // Mirror and the dashed normal.
        g.fillStyle = '#cfe6f2';
        g.fillRect(mx - 220, my, 440, 12);
        g.setLineDash([8, 8]);
        g.strokeStyle = '#8aa0b8';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(mx, my);
        g.lineTo(mx, my - 330);
        g.stroke();
        g.setLineDash([]);
        const inX = mx - Math.sin(a) * L, inY = my - Math.cos(a) * L;
        const outX = mx + Math.sin(a) * L, outY = my - Math.cos(a) * L;
        g.strokeStyle = '#ffd36b';
        g.lineWidth = 6;
        g.shadowColor = '#ffd36b';
        g.shadowBlur = 14;
        g.beginPath();
        g.moveTo(inX, inY);
        g.lineTo(mx, my);
        g.lineTo(outX, outY);
        g.stroke();
        g.shadowBlur = 0;
        emoji(g, '🔦', inX - 10, inY - 10, 40);
        emoji(g, '⭐', mx + Math.sin((angle * Math.PI) / 180) * L, my - Math.cos((angle * Math.PI) / 180) * L - 10, 40);
        text(g, tr('lab.in', { a: U('deg', shown) }), mx - 90, my - 60, { size: 18, color: '#ffe9a8' });
        text(g, tr('lab.out', { a: U('deg', shown) }), mx + 90, my - 60, { size: 18, color: '#ffe9a8' });
        text(g, tr('lab.normal'), mx, my - 345, { size: 14, color: '#8aa0b8' });
        text(g, tr('lab.law'), W / 2, 460, { size: 20, color: '#fff' });
      }
    };
  },

  /* ---- a race: distance = speed × time ---- */
  race(canvas, controls, setup, { sound }) {
    const g = base(canvas);
    const carts = [{ v: 4, x: 0, c: '#eb6834', n: 'A' }, { v: 2, x: 0, c: '#2a78d6', n: 'B' }];
    let T = 5, t = 0, running = false;
    const go = () => {
      for (const c of carts) c.x = 0;
      t = 0;
      running = true;
      sound?.tap();
    };
    slider(controls, tr('lab.cartSpeed', { n: 'A' }), 1, 8, 1, carts[0].v, (v) => (carts[0].v = v), 'mps');
    slider(controls, tr('lab.cartSpeed', { n: 'B' }), 1, 8, 1, carts[1].v, (v) => (carts[1].v = v), 'mps');
    slider(controls, tr('lab.time'), 1, 8, 1, T, (v) => (T = v), 's');
    controls.append(button('arc-btn arc-btn--primary', tr('lab.go'), go));
    return {
      async watch() {
        carts[0].v = 4;
        T = 5;
        go();
        await wait(T * 1000 * 0.6 + 900);
      },
      frame(dt) {
        if (running) {
          t = Math.min(T, t + dt / 0.6);
          for (const c of carts) c.x = c.v * t;
          if (t >= T) running = false;
        }
        bg(g);
        const px = 12;
        carts.forEach((c, i) => {
          const y = 150 + i * 150;
          g.fillStyle = '#d9d2c2';
          g.fillRect(40, y + 30, W - 80, 8);
          for (let m = 0; m <= 64; m += 8) {
            g.fillStyle = '#7a6a5a';
            g.fillRect(40 + m * px, y + 26, 2, 16);
            text(g, `${m}`, 40 + m * px, y + 58, { size: 13, color: '#7a6a5a' });
          }
          g.fillStyle = c.c;
          rrect(g, 40 + c.x * px - 20, y, 44, 26, 6);
          g.fill();
          text(g, tr('lab.raceLine', { n: c.n, v: U('mps', c.v), t: U('s', t, 1), d: U('m', c.v * t, 1) }), W - 60, y - 22, { size: 18, align: 'right' });
        });
        text(g, tr('lab.raceLaw'), W / 2, 470, { size: 20 });
      }
    };
  }
};

export function createSim(id, setup = {}, { canvas, controls, sound }) {
  const make = SIMS[id];
  if (!make) throw new Error(`no sim ${id}`);
  return make(canvas, controls, setup, { sound });
}
export const SIM_IDS = Object.keys(SIMS);
