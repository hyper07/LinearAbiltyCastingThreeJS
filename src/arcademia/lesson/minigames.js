/**
 * Quick arcade games for practice — short, loud and forgiving:
 *
 *   bubblePop   math: questions at the top, answers float up in bubbles; pop the right one
 *   feedMonster math: the monster wants an exact number of fruit — feed it, then say "Done!"
 *   launch      physics: set the angle and the power, land the ball in the basket
 *   whoSaid     history: who said it? match the line to the guide
 *
 * Each: mount(host, ctx) → Promise<score>, resolving when the round ends.
 */
import { el, button, sparkle } from '../ui/dom.js';
import { makeProblem } from '../content/math.js';
import { t as tr, num, localizeLesson } from '../i18n/index.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Which generators suit a floor's arcade. */
const ARCADE_GENS = { 1: ['add10', 'sub10'], 2: ['tens-ones', 'skip-count', 'add10'], 3: ['times', 'fractions'], 4: ['division', 'times'], 5: ['balance', 'decimals'], 6: ['negatives', 'percent'], 7: ['two-step', 'squares'] };

export function bubblePop(host, { floor = 1, sound, reducedMotion = false, seconds = 45 }) {
  return new Promise((resolve) => {
    const box = el('div', 'arc-mg arc-bubbles');
    const hud = el('div', 'arc-mg__hud');
    const scoreEl = el('span', 'arc-mg__score', '⭐ 0');
    const timeEl = el('span', 'arc-mg__time', `⏱️ ${seconds}`);
    const q = el('div', 'arc-mg__q', '', { 'aria-live': 'polite' });
    hud.append(scoreEl, timeEl);
    const field = el('div', 'arc-bubbles__field');
    box.append(hud, q, field);
    host.append(box);
    const gens = ARCADE_GENS[floor] ?? ARCADE_GENS[1];
    let score = 0, left = seconds, seed = (Math.random() * 1e9) | 0, raf = 0, last = performance.now(), bubbles = [], over = false;
    const next = () => {
      field.replaceChildren();
      const p = makeProblem(gens[Math.floor(Math.random() * gens.length)], seed++);
      q.textContent = p.q.replace(/\s*[🍎⭐🐟🌸🍪🎈🐞🦆]{2,}/u, '');
      bubbles = p.choices.map((c, i) => {
        const b = button('arc-bubble', c, () => {
          if (over) return;
          if (i === p.answer) {
            score++;
            scoreEl.textContent = `⭐ ${score}`;
            sound?.right();
            sparkle(b);
            b.classList.add('is-pop');
            setTimeout(next, 260);
          } else {
            sound?.wrong();
            b.classList.add('is-wrong');
            left = Math.max(0, left - 3);
          }
        });
        b.style.left = `${8 + i * 23}%`;
        const item = { b, y: 0, speed: 26 + Math.random() * 22, wob: Math.random() * 6 };
        b.style.setProperty('--hue', `${(i * 70 + seed * 13) % 360}`);
        field.append(b);
        return item;
      });
    };
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      left -= dt;
      timeEl.textContent = `⏱️ ${Math.ceil(Math.max(0, left))}`;
      const H = field.clientHeight || 300;
      for (const it of bubbles) {
        it.y += it.speed * dt * (reducedMotion ? 0.5 : 1);
        if (it.y > H - 40) it.y = 0;
        it.b.style.transform = `translate(${Math.sin(now / 600 + it.wob) * (reducedMotion ? 0 : 10)}px, ${-it.y}px)`;
      }
      if (left <= 0) {
        over = true;
        cancelAnimationFrame(raf);
        q.textContent = tr('mg.timeUp', { n: score });
        setTimeout(() => {
          box.remove();
          resolve(score);
        }, 1400);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    next();
    raf = requestAnimationFrame(frame);
  });
}

export function feedMonster(host, { floor = 1, sound, rounds = 5 }) {
  return new Promise((resolve) => {
    const box = el('div', 'arc-mg arc-monster');
    const hud = el('div', 'arc-mg__hud');
    const scoreEl = el('span', 'arc-mg__score', '⭐ 0');
    const roundEl = el('span', 'arc-mg__time', '');
    hud.append(scoreEl, roundEl);
    const sign = el('div', 'arc-monster__sign', '', { 'aria-live': 'polite' });
    const mon = el('div', 'arc-monster__mon', '👾', { 'aria-hidden': 'true' });
    const belly = el('div', 'arc-monster__belly', '');
    const fruits = el('div', 'arc-mg__row');
    const done = button('arc-btn arc-btn--primary', tr('mg.done'), () => check());
    const undo = button('arc-btn', tr('mg.takeBack'), () => {
      if (fed > 0) fed--;
      show();
    });
    box.append(hud, sign, mon, belly, fruits, el('div', 'arc-mg__row', null), done, undo);
    host.append(box);
    let score = 0, round = 0, fed = 0, want = 0;
    const kinds = ['🍓', '🍌', '🍇', '🍐'];
    for (const f of kinds) fruits.append(button('arc-fruit', f, (e) => {
      fed++;
      sound?.tap();
      mon.classList.remove('is-chomp');
      void mon.offsetWidth;
      mon.classList.add('is-chomp');
      show();
    }, { 'aria-label': tr('mg.feedOne', { fruit: f }) }));
    const show = () => {
      belly.textContent = fed ? tr('mg.fed', { n: fed }) : tr('mg.tapFruit');
    };
    const ask = () => {
      round++;
      fed = 0;
      roundEl.textContent = tr('mg.round', { n: round, total: rounds });
      let text;
      if (floor <= 1) {
        want = 3 + Math.floor(Math.random() * 8);
        text = tr('mg.feedMe', { what: num(want) });
      } else if (floor <= 2) {
        const a = 2 + Math.floor(Math.random() * 7), b = 1 + Math.floor(Math.random() * 6);
        want = a + b;
        text = tr('mg.feedMe', { what: `${num(a)} + ${num(b)}` });
      } else if (floor <= 4) {
        const a = 2 + Math.floor(Math.random() * 4), b = 2 + Math.floor(Math.random() * 3);
        want = a * b;
        text = tr('mg.feedMe', { what: `${num(a)} × ${num(b)}` });
      } else {
        const b = 2 + Math.floor(Math.random() * 4), q = 2 + Math.floor(Math.random() * 4);
        want = b * q - (floor > 5 ? 3 : 0);
        text = floor > 5 ? `Feed me ${b} × ${q} − 3!` : `Feed me ${b * q}!`;
      }
      sign.textContent = text;
      show();
    };
    const check = async () => {
      if (fed === want) {
        score++;
        scoreEl.textContent = `⭐ ${score}`;
        sound?.right();
        sparkle(mon);
        mon.textContent = '😋';
        sign.textContent = tr('mg.yum');
      } else {
        sound?.wrong();
        mon.textContent = fed > want ? '🤢' : '🥺';
        sign.textContent = tr(fed > want ? 'mg.tooMany' : 'mg.stillHungry', { n: want });
      }
      done.disabled = true;
      await wait(1300);
      done.disabled = false;
      mon.textContent = '👾';
      if (round >= rounds) {
        box.remove();
        resolve(score);
      } else ask();
    };
    ask();
  });
}

export function launch(host, { sound, shots = 6 }) {
  return new Promise((resolve) => {
    const box = el('div', 'arc-mg arc-launch');
    const hud = el('div', 'arc-mg__hud');
    const scoreEl = el('span', 'arc-mg__score', '⭐ 0');
    const shotEl = el('span', 'arc-mg__time', '');
    hud.append(scoreEl, shotEl);
    const canvas = el('canvas', 'arc-launch__canvas');
    canvas.width = 900;
    canvas.height = 420;
    const g = canvas.getContext('2d');
    const row = el('div', 'arc-mg__row');
    let angle = 45, power = 60, score = 0, shot = 0, ball = null, target = 600;
    const sl = (label, min, max, v, set) => {
      const w = el('label', 'arc-slider');
      const o = el('output', null, String(v));
      const i = el('input', null, null, { type: 'range', min, max, value: v });
      i.addEventListener('input', () => {
        set(Number(i.value));
        o.textContent = i.value;
      });
      w.append(el('span', null, label), i, o);
      return w;
    };
    const fire = button('arc-btn arc-btn--primary', tr('mg.launch'), () => {
      if (ball || shot >= shots) return;
      const a = (angle * Math.PI) / 180;
      ball = { x: 60, y: 360, vx: Math.cos(a) * power * 1.6, vy: -Math.sin(a) * power * 1.6, trail: [] };
      shot++;
      shotEl.textContent = tr('mg.shot', { n: shot, total: shots });
      sound?.tap();
    });
    row.append(sl(tr('mg.angle'), 10, 80, angle, (v) => (angle = v)), sl(tr('mg.power'), 20, 100, power, (v) => (power = v)), fire);
    const msg = el('p', 'arc-mg__q', tr('mg.land'), { 'aria-live': 'polite' });
    box.append(hud, msg, canvas, row);
    host.append(box);
    const place = () => (target = 380 + Math.random() * 440);
    place();
    let last = performance.now(), raf;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (ball) {
        ball.vy += 98 * dt * 2.2;
        ball.x += ball.vx * dt * 2.2;
        ball.y += ball.vy * dt * 2.2;
        ball.trail.push([ball.x, ball.y]);
        if (ball.y >= 360) {
          const hit = Math.abs(ball.x - target) < 34;
          if (hit) {
            score++;
            scoreEl.textContent = `⭐ ${score}`;
            msg.textContent = tr('mg.inBasket');
            sound?.right();
            place();
          } else {
            msg.textContent = tr(ball.x < target ? 'mg.tooShort' : 'mg.tooFar');
            sound?.wrong();
          }
          ball = null;
          if (shot >= shots) {
            setTimeout(() => {
              cancelAnimationFrame(raf);
              box.remove();
              resolve(score);
            }, 1200);
          }
        }
      }
      g.fillStyle = '#d9f3ff';
      g.fillRect(0, 0, 900, 420);
      g.fillStyle = '#9fe08f';
      g.fillRect(0, 372, 900, 48);
      g.font = '46px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
      g.textAlign = 'center';
      g.fillText('🧺', target, 372);
      g.fillText('🎯', 60, 380);
      if (ball) {
        g.strokeStyle = 'rgba(255,111,181,0.6)';
        g.lineWidth = 4;
        g.beginPath();
        ball.trail.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
        g.fillStyle = '#ff6fb5';
        g.beginPath();
        g.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
        g.fill();
      } else {
        const a = (angle * Math.PI) / 180;
        g.strokeStyle = '#2c6b62';
        g.setLineDash([6, 8]);
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(60, 360);
        g.lineTo(60 + Math.cos(a) * power * 1.4, 360 - Math.sin(a) * power * 1.4);
        g.stroke();
        g.setLineDash([]);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}

export function whoSaid(host, { lessons, sound, rounds = 6 }) {
  return new Promise((resolve) => {
    const guides = lessons.map((l0) => localizeLesson(l0)).map((l) => ({ name: l.dialogue.npc.name.split(',')[0], role: l.dialogue.npc.role, lines: l.dialogue.topics.map((t) => t.answer) }));
    const box = el('div', 'arc-mg arc-who');
    const hud = el('div', 'arc-mg__hud');
    const scoreEl = el('span', 'arc-mg__score', '⭐ 0');
    const roundEl = el('span', 'arc-mg__time', '');
    hud.append(scoreEl, roundEl);
    const bubble = el('blockquote', 'arc-who__line', '', { 'aria-live': 'polite' });
    const row = el('div', 'arc-who__guides');
    box.append(hud, el('p', 'arc-mg__q', tr('mg.whoSaid')), bubble, row);
    host.append(box);
    let score = 0, round = 0;
    const ask = () => {
      round++;
      roundEl.textContent = tr('mg.round', { n: round, total: rounds });
      const gi = Math.floor(Math.random() * guides.length);
      const line = guides[gi].lines[Math.floor(Math.random() * guides[gi].lines.length)];
      bubble.textContent = tr('mg.quote', { line });
      row.replaceChildren();
      guides.forEach((gd, i) => {
        const b = button('arc-who__guide', null, async () => {
          for (const x of row.children) x.disabled = true;
          if (i === gi) {
            score++;
            scoreEl.textContent = `⭐ ${score}`;
            sound?.right();
            sparkle(b);
            b.classList.add('is-right');
          } else {
            sound?.wrong();
            b.classList.add('is-wrong');
            row.children[gi].classList.add('is-right');
          }
          await wait(1300);
          if (round >= rounds) {
            box.remove();
            resolve(score);
          } else ask();
        });
        b.append(el('strong', null, gd.name), el('span', null, gd.role));
        row.append(b);
      });
    };
    ask();
  });
}
