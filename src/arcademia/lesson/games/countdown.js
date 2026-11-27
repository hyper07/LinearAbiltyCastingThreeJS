/**
 * Rocket launch (the Moon's rockets game): a rocket on its pad and an empty fuel tank. Each step —
 * a question, or things to tap in the right order (count back from 5, biggest to smallest, the
 * order of the mission) — pours fuel in. With a full tank the child presses the big button, the
 * countdown beeps down to zero and the rocket lifts off toward its target (the Moon, Mars, orbit or
 * the stars). A miss only shakes and hints; after two the right tile glows.
 *
 * Data (content/games.js countdownProblems): countdown { q, target?, from?, steps: [question | { q, order, hint }] }
 */
import { el, button } from '../../ui/dom.js';
import { t as tr, num } from '../../i18n/index.js';
import { shuffled, orderNext, fuelAfter } from '../../content/games.js';
import { gameCard, note, scorer, finish, shake, flash, rowKeys, gate, wait, alive } from './kit.js';

const SKY = { moon: '🌕', mars: '🔴', orbit: '🛰️', stars: '✨' };
const show = (x) => (typeof x === 'number' ? num(x) : x);

export async function playCountdown(r) {
  const c = r.lesson.countdown;
  const target = c.target ?? 'moon';
  const from = c.from ?? 5;
  const award = scorer(r);
  const { card, body, fb } = gameCard(r, 'countdown', { kicker: tr('act.cd.kicker'), title: c.q });
  r.say(tr('act.cd.say'), { line: 't.act.cd.say' });

  // The pad: sky, target, rocket, tank.
  const pad = el('div', 'arc-cd__pad', null, { role: 'img', 'aria-label': tr('act.cd.padAria', { target: tr(`act.cd.target.${target}`) }) });
  const sky = el('div', 'arc-cd__sky');
  sky.append(el('span', `arc-cd__target arc-cd__target--${target}`, SKY[target], { 'aria-hidden': 'true' }));
  for (let i = 0; i < 14; i++) {
    const s = el('i', 'arc-cd__star');
    s.style.left = `${(i * 37) % 100}%`;
    s.style.top = `${(i * 53) % 70}%`;
    s.style.animationDelay = `${(i % 5) * 0.4}s`;
    sky.append(s);
  }
  const rocket = el('div', 'arc-cd__rocket', null, { 'aria-hidden': 'true' });
  rocket.append(el('span', 'arc-cd__ship', '🚀'), el('span', 'arc-cd__flame'));
  const smoke = el('div', 'arc-cd__smoke', null, { 'aria-hidden': 'true' });
  const tower = el('div', 'arc-cd__tower', null, { 'aria-hidden': 'true' });
  const tank = el('div', 'arc-cd__tank', null, { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-label': tr('act.cd.fuel') });
  const fuel = el('i', 'arc-cd__fuel');
  tank.append(fuel, el('span', 'arc-cd__tankLabel', '⛽', { 'aria-hidden': 'true' }));
  const big = el('div', 'arc-cd__big', '', { 'aria-live': 'assertive' });
  pad.append(sky, tower, smoke, rocket, el('div', 'arc-cd__ground'), tank, big);
  const panel = el('div', 'arc-cd__panel');
  const layout = el('div', 'arc-cd');
  layout.append(pad, panel);
  body.append(layout);

  const setFuel = (k) => {
    fuel.style.setProperty('--k', String(k));
    tank.setAttribute('aria-valuenow', String(Math.round(k * 100)));
    tank.setAttribute('aria-valuetext', tr('act.cd.fuelAria', { pct: Math.round(k * 100) }));
    flash(tank, 'is-fill', 900);
  };
  setFuel(0);

  for (let i = 0; i < c.steps.length; i++) {
    const s = c.steps[i];
    panel.replaceChildren();
    const pfb = el('p', 'arc-feedback', '', { 'aria-live': 'polite' });
    panel.append(el('p', 'arc-card__kicker', tr('act.cd.stepOf', { n: i + 1, total: c.steps.length })), el('h3', 'arc-q arc-cd__q', s.q));
    const step = gate(r);
    if (Array.isArray(s.order)) {
      r.ctx = { step: tr('act.cd.ctxOrder', { q: s.q }), hint: s.hint, worked: s.order.map(show).join(' → ') };
      orderStep(s, panel, pfb, () => step.open());
    } else {
      r.ctx = { step: tr('act.cd.ctxQ', { q: s.q }), hint: s.hint, worked: s.explain };
      panel.append(r.choices(s, pfb, () => step.open(), { practice: true, onResult: (right, m) => right && !m && award() }), pfb);
      panel.querySelector('.arc-choice')?.focus({ preventScroll: true });
    }
    await step.wait;
    // Fuel in.
    r.game.sound.glug();
    setFuel(fuelAfter(i + 1, c.steps.length));
    rocket.classList.add('is-wiggle');
    setTimeout(() => rocket.classList.remove('is-wiggle'), 600);
    await wait(r.game.reducedMotion ? 600 : 1500);
    if (!alive(r)) return;
  }

  // Full tank: the countdown.
  panel.replaceChildren();
  const go = button('arc-btn arc-cd__launch', tr('act.cd.start'), null);
  panel.append(el('h3', 'arc-q arc-cd__q', tr('act.cd.full')), go);
  note(fb, '');
  r.say(tr('act.cd.ready'), { line: 't.act.cd.ready' });
  go.focus({ preventScroll: true });
  await r.until(go);
  // The pad has the countdown; here, the rocket on its way to its target.
  panel.replaceChildren(el('div', 'arc-cd__away', `🚀 ${SKY[target]}`, { 'aria-hidden': 'true' }));
  pad.classList.add('is-counting');
  for (let n = from; n >= 1; n--) {
    big.textContent = num(n);
    flash(big, 'is-pop', 700);
    r.game.sound.beep(false);
    await wait(800);
    if (!alive(r)) return;
  }
  big.textContent = tr('act.cd.liftoff');
  flash(big, 'is-pop', 700);
  r.game.sound.beep(true);
  r.game.sound.rocket();
  pad.classList.add('is-launch');
  r.buddy.cheer(2.2);
  await wait(r.game.reducedMotion ? 800 : 2400);
  if (!alive(r)) return;
  pad.classList.add('is-gone');
  r.good(pad, fb, tr('act.cd.done', { target: tr(`act.cd.target.${target}`) }));
  await finish(r, card);

  /** Tap the things in the right order: each right tap moves its tile onto the line. */
  function orderStep(s, host, pfb, done) {
    const line = el('ol', 'arc-cd__line', null, { 'aria-label': tr('act.cd.lineAria') });
    const tiles = el('div', 'arc-cd__tiles', null, { role: 'group', 'aria-label': tr('act.cd.orderHow') });
    const slots = s.order.map((_, k) => {
      const li = el('li', 'arc-cd__slot', String(k + 1), { 'aria-label': tr('act.cd.slotAria', { n: k + 1 }) });
      line.append(li);
      return li;
    });
    let done0 = 0, miss = 0, missesAll = 0;
    const bs = shuffled(s.order.map((x, k) => ({ x, k }))).map(({ x, k }) => {
      const b = button('arc-cd__tile', show(x), () => tapTile(b, k), { 'aria-label': tr('act.cd.tileAria', { item: show(x) }) });
      tiles.append(b);
      return { b, k };
    });
    rowKeys(bs.map((t) => t.b));
    host.append(el('p', 'arc-hint', tr('act.cd.orderHow')), line, tiles, pfb);
    bs[0].b.focus({ preventScroll: true });
    function tapTile(b, k) {
      if (s.order[k] === orderNext(s.order, done0)) {
        slots[done0].textContent = show(s.order[k]);
        slots[done0].classList.add('is-full');
        flash(slots[done0], 'is-yes');
        b.disabled = true;
        b.classList.add('is-used');
        r.game.sound.tap();
        done0++;
        miss = 0;
        bs.forEach((t) => t.b.classList.remove('is-hint'));
        if (done0 === s.order.length) {
          if (!missesAll) award();
          r.good(line, pfb, tr('act.cd.orderYes'));
          return done();
        }
        note(pfb, '');
        bs.find((t) => !t.b.disabled)?.b.focus({ preventScroll: true });
        return;
      }
      miss++;
      missesAll++;
      shake(b);
      if (miss >= 2) {
        bs.find((t) => t.k === done0)?.b.classList.add('is-hint');
        r.oops(null, pfb, `${tr('act.cd.orderLook')} 💡 ${s.hint}`);
      } else r.oops(null, pfb, tr('act.cd.orderNot'));
    }
  }
}
