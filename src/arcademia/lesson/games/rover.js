/**
 * Rover coding (Mars's coding game): a small grid of red sand with rocks, sample tubes and maybe a
 * flag to drive home to. Build a program from blocks — forward, turn left, turn right, pick up,
 * and (for older floors) repeat — then Run it and watch the rover follow it block by block. A bump
 * stops the rover and lights the block that caused it red: that's the bug. Some puzzles start with
 * a buggy program to fix. After a couple of tries the puzzle's hint shows, then the first blocks of
 * a way that works.
 *
 * Keyboard: the palette and the program are buttons; on the map, ↑ adds forward, ← and → add
 * turns, Backspace takes the last block back. Tapping a block in the program removes it; a repeat
 * holds the blocks added while it is open (tap it to open or close it; its ×n changes the count).
 *
 * Data (content/games.js roverProblems): rover { q, puzzles: [{ w, h, start, samples, rocks?, goal?, blocks?, max, hint, program? }] }
 */
import { el, button } from '../../ui/dom.js';
import { t as tr } from '../../i18n/index.js';
import { ROVER_BLOCKS, runRover, countBlocks, solveRover } from '../../content/games.js';
import { gameCard, note, scorer, finish, shake, flash, gate, wait, alive } from './kit.js';

const ICON = { forward: '⬆️', left: '↩️', right: '↪️', repeat: '🔁', pick: '🤏' };
const TURN = { N: 0, E: 90, S: 180, W: 270 };
const clone = (p) => p.map((b) => (typeof b === 'object' ? { repeat: b.repeat, do: [...b.do] } : b));

export async function playRover(r) {
  const data = r.lesson.rover;
  const award = scorer(r);
  const { card, body, fb } = gameCard(r, 'rover', { kicker: tr('act.rover.kicker'), title: data.q, shot: 'board' });
  r.say(tr('act.rover.say'), { line: 't.act.rover.say' });
  for (let i = 0; i < data.puzzles.length; i++) {
    await puzzle(r, data.puzzles[i], i, data.puzzles.length, body, fb, award);
    if (!alive(r)) return;
  }
  note(fb, tr('act.rover.allDone'), 'good');
  await finish(r, card);
}

async function puzzle(r, p, index, total, body, fb, award) {
  body.replaceChildren();
  note(fb, '');
  const blocks = (p.blocks ?? ROVER_BLOCKS).filter((b) => ROVER_BLOCKS.includes(b));
  const fixing = Array.isArray(p.program);
  let program = fixing ? clone(p.program) : [];
  let cursor = null; // the index of the open repeat, or null
  let fails = 0;
  let running = false;
  const best = solveRover(p) ?? [];

  const head = el('div', 'arc-rover__head');
  head.append(el('span', 'arc-rover__badge', tr('act.rover.puzzleOf', { n: index + 1, total })), el('span', 'arc-hint', tr(fixing ? 'act.rover.fixHow' : 'act.rover.how')));
  if (fixing) head.prepend(el('span', 'arc-rover__badge arc-rover__badge--bug', `🐞 ${tr('act.rover.fix')}`));

  // The map.
  const map = el('div', 'arc-rover__map', null, { tabindex: '0', role: 'group' });
  map.style.setProperty('--w', p.w);
  map.style.setProperty('--h', p.h);
  const cellEls = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const c = el('div', 'arc-rover__cell', null, { 'aria-hidden': 'true' });
    if ((x + y) % 2) c.classList.add('is-alt');
    if ((p.rocks ?? []).some((q) => q[0] === x && q[1] === y)) c.append(el('span', 'arc-rover__rock', '🪨'));
    if (p.goal && p.goal[0] === x && p.goal[1] === y) c.append(el('span', 'arc-rover__goal', '🚩'));
    if (p.start[0] === x && p.start[1] === y) c.classList.add('is-start');
    map.append(c);
    cellEls.push(c);
  }
  const sampleEls = p.samples.map(([x, y]) => {
    const s = el('span', 'arc-rover__sample', '🧪');
    cellEls[y * p.w + x].append(s);
    return s;
  });
  const bot = el('div', 'arc-rover__bot', null, { 'aria-hidden': 'true' });
  bot.innerHTML = BOT_SVG;
  map.append(bot);
  const place = (x, y, dir) => {
    bot.style.setProperty('--x', x);
    bot.style.setProperty('--y', y);
    map.setAttribute('aria-label', tr('act.rover.mapAria', { x: x + 1, y: y + 1, dir: tr(`act.dir.${dir.toLowerCase()}`), samples: p.samples.length, rocks: (p.rocks ?? []).length }));
  };
  // Turns take the short way round: keep the angle continuous.
  let angle = TURN[p.start[2] ?? 'E'];
  const turnTo = (dir) => {
    let d = TURN[dir] - (angle % 360);
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    angle += d;
    bot.style.setProperty('--angle', `${angle}deg`);
  };
  const reset = () => {
    bot.classList.remove('is-bump', 'is-done');
    place(p.start[0], p.start[1], p.start[2] ?? 'E');
    angle = TURN[p.start[2] ?? 'E'];
    bot.style.setProperty('--angle', `${angle}deg`);
    sampleEls.forEach((s) => s.classList.remove('is-got'));
  };
  reset();

  // The editor: palette, program, buttons.
  const palette = el('div', 'arc-rover__palette', null, { role: 'group', 'aria-label': tr('act.rover.palette') });
  const pal = blocks.map((b) => {
    const btn = button(`arc-rover__block arc-rover__block--${b}`, null, () => add(b), { 'aria-label': tr('act.rover.addAria', { block: tr(`act.rover.b.${b}`) }) });
    btn.append(el('span', 'arc-rover__icon', ICON[b], { 'aria-hidden': 'true' }), el('span', null, tr(`act.rover.b.${b}`)));
    palette.append(btn);
    return btn;
  });
  const prog = el('ol', 'arc-rover__prog', null, { 'aria-label': tr('act.rover.program') });
  const count = el('span', 'arc-rover__count', '', { 'aria-live': 'polite' });
  const run = button('arc-btn arc-btn--primary arc-btn--big arc-rover__run', tr('act.rover.run'), () => go());
  const undo = button('arc-btn', tr('act.rover.undo'), () => removeLast(false));
  const clear = button('arc-btn arc-btn--ghost', tr('act.rover.clear'), () => {
    program = [];
    cursor = null;
    edited();
  });
  const outBtn = button('arc-btn arc-rover__out', tr('act.rover.out'), () => {
    cursor = null;
    draw();
  }, { hidden: true });
  const progHead = el('div', 'arc-rover__progHead');
  progHead.append(el('strong', null, `🧾 ${tr('act.rover.program')}`), count);
  const ctrl = el('div', 'arc-row arc-rover__ctrl');
  ctrl.append(undo, clear, run);
  const editor = el('div', 'arc-rover__editor');
  editor.append(palette, progHead, prog, outBtn, ctrl);
  const layout = el('div', 'arc-rover');
  const mapBox = el('div', 'arc-rover__mapbox');
  mapBox.append(map, el('p', 'arc-rover__keys', tr('act.rover.keys')));
  layout.append(mapBox, editor);
  body.append(head, layout);
  r.ctx = { step: tr('act.rover.ctx', { n: index + 1 }), hint: p.hint, worked: best.map((b) => tr(`act.rover.b.${b}`)).join(', ') };

  const chipAt = new Map();
  function draw() {
    prog.replaceChildren();
    chipAt.clear();
    let n = 0;
    program.forEach((b, i) => {
      const li = el('li', 'arc-rover__item');
      if (typeof b === 'object') {
        n++;
        const box = el('div', `arc-rover__loop${cursor === i ? ' is-open' : ''}`);
        const top = el('div', 'arc-rover__loopTop');
        const open = button('arc-rover__chip arc-rover__chip--repeat', `${ICON.repeat}`, () => {
          cursor = cursor === i ? null : i;
          draw();
          (cursor === i ? pal[0] : prog.querySelector('button'))?.focus();
        }, { 'aria-label': tr('act.rover.loopAria', { n, count: b.repeat }), 'aria-expanded': String(cursor === i) });
        const times = button('arc-rover__times', tr('act.rover.times', { n: b.repeat }), () => {
          b.repeat = b.repeat >= 5 ? 2 : b.repeat + 1;
          edited();
          prog.querySelectorAll('.arc-rover__times')[program.slice(0, i + 1).filter((x) => typeof x === 'object').length - 1]?.focus();
        }, { 'aria-label': tr('act.rover.timesAria', { n: b.repeat }) });
        const del = button('arc-rover__del', '✕', () => removeAt([i]), { 'aria-label': tr('act.rover.delLoop') });
        top.append(open, times, del);
        const inner = el('div', 'arc-rover__inner');
        b.do.forEach((x, j) => {
          n++;
          const chip = button(`arc-rover__chip arc-rover__chip--${x}`, ICON[x], () => removeAt([i, j]), { 'aria-label': tr('act.rover.chipAria', { n, block: tr(`act.rover.b.${x}`) }) });
          chipAt.set(`${i},${j}`, chip);
          inner.append(chip);
        });
        if (!b.do.length) inner.append(el('span', 'arc-rover__drop', cursor === i ? tr('act.rover.inLoop') : '…'));
        box.append(top, inner);
        chipAt.set(`${i}`, open);
        li.append(box);
      } else {
        n++;
        const chip = button(`arc-rover__chip arc-rover__chip--${b}`, ICON[b], () => removeAt([i]), { 'aria-label': tr('act.rover.chipAria', { n, block: tr(`act.rover.b.${b}`) }) });
        chipAt.set(`${i}`, chip);
        li.append(chip);
      }
      prog.append(li);
    });
    if (!program.length) prog.append(el('li', 'arc-rover__empty', tr('act.rover.empty')));
    const used = countBlocks(program);
    count.textContent = tr('act.rover.blocks', { n: used, max: p.max });
    count.classList.toggle('is-full', used >= p.max);
    outBtn.hidden = cursor == null;
    pal.forEach((b, k) => (b.disabled = running || used >= p.max || (blocks[k] === 'repeat' && cursor != null)));
    run.disabled = running || !program.length;
    undo.disabled = clear.disabled = running || !program.length;
  }
  function edited() {
    if (running) return;
    reset();
    prog.classList.remove('has-bug');
    draw();
  }
  function add(b) {
    if (running) return;
    if (countBlocks(program) >= p.max) {
      note(fb, tr('act.rover.full'));
      shake(count);
      return;
    }
    r.game.sound.tap();
    if (b === 'repeat') {
      program.push({ repeat: 2, do: [] });
      cursor = program.length - 1;
      note(fb, tr('act.rover.inLoop'));
    } else if (cursor != null) program[cursor].do.push(b);
    else program.push(b);
    edited();
  }
  function removeAt([i, j], refocus = true) {
    if (running) return;
    if (j == null) {
      program.splice(i, 1);
      if (cursor === i) cursor = null;
      else if (cursor != null && cursor > i) cursor--;
    } else program[i].do.splice(j, 1);
    r.game.sound.tap();
    edited();
    if (refocus) (prog.querySelector('.arc-rover__chip') ?? pal[0])?.focus();
  }
  /** Take the last block back (Undo, or Backspace on the map: the focus stays where it is). */
  function removeLast(refocus = false) {
    if (!program.length) return;
    const last = program.length - 1;
    if (cursor != null && program[cursor].do.length) removeAt([cursor, program[cursor].do.length - 1], refocus);
    else if (typeof program[last] === 'object' && program[last].do.length && cursor == null) removeAt([last, program[last].do.length - 1], refocus);
    else removeAt([last], refocus);
  }

  // Keyboard on the map: arrows add moves.
  map.addEventListener('keydown', (e) => {
    const b = { ArrowUp: 'forward', ArrowLeft: 'left', ArrowRight: 'right' }[e.key] ?? (e.key === 'p' && 'pick');
    if (b && blocks.includes(b)) add(b);
    else if (e.key === 'Backspace' || e.key === 'Delete') removeLast(false);
    else if (e.key === 'Enter' && program.length) go();
    else return;
    e.preventDefault();
    e.stopPropagation();
  });
  // Delete / Backspace on a program block removes it too.
  prog.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && e.target.matches('.arc-rover__chip')) {
      e.preventDefault();
      e.target.click();
    }
  });

  let solvedGate = gate(r);
  async function go() {
    if (running || !program.length) return;
    running = true;
    cursor = null;
    reset();
    draw();
    prog.classList.remove('has-bug');
    note(fb, tr('act.rover.running'));
    const res = runRover(p, program);
    const stepMs = r.game.reducedMotion ? 220 : 520;
    for (const s of res.trace) {
      if (!alive(r)) return;
      const chip = chipAt.get(s.at.join(','));
      chipAt.forEach((c) => c.classList.remove('is-running'));
      chip?.classList.add('is-running');
      if (s.ev === 'turn') {
        turnTo(s.dir);
        r.game.sound.motor(true);
      } else if (s.ev === 'move') {
        place(s.x, s.y, s.dir);
        r.game.sound.motor(false);
      } else if (s.ev === 'pick') {
        flash(bot, 'is-grab', 500);
        if (!s.got) note(fb, tr('act.rover.noSample'));
      } else {
        bot.classList.add('is-bump');
        chip?.classList.add('is-bug');
        prog.classList.add('has-bug');
        r.game.sound.toy('boing');
      }
      if (s.got) {
        const k = p.samples.findIndex((q) => q[0] === s.x && q[1] === s.y);
        sampleEls[k]?.classList.add('is-got');
        r.game.sound.toy('gem');
      }
      await wait(stepMs);
    }
    if (!alive(r)) return;
    chipAt.forEach((c) => c.classList.remove('is-running'));
    running = false;
    if (res.ok) {
      bot.classList.add('is-done');
      // First time (a fix-the-bug puzzle's first run, which shows the bug, doesn't count).
      if (fails <= (fixing ? 1 : 0)) award();
      pal.forEach((b) => (b.disabled = true));
      run.disabled = undo.disabled = clear.disabled = true;
      r.good(map, fb, tr('act.rover.yay'));
      solvedGate.open();
      return;
    }
    fails++;
    draw();
    // The bug stays lit (draw() made the blocks anew).
    if (res.failAt) chipAt.get(res.failAt.join(','))?.classList.add('is-bug');
    const why = res.reason === 'rock' ? tr('act.rover.bump') : res.reason === 'edge' ? tr('act.rover.edge') : res.reason === 'goal' ? tr('act.rover.goal') : tr('act.rover.left', { count: res.left });
    const more = fails >= 3 && best.length ? ` ${tr('act.rover.tryStart', { blocks: best.slice(0, 3).map((b) => ICON[b]).join(' ') })}` : fails >= 2 ? ` 💡 ${p.hint}` : '';
    r.oops(res.failAt ? null : map, fb, `${why}${more}`);
    (res.failAt ? chipAt.get(res.failAt.join(',')) : run)?.focus({ preventScroll: true });
  }

  draw();
  (fixing ? run : pal[0]).focus({ preventScroll: true });
  if (fixing) note(fb, tr('act.rover.fixSay'));
  await solvedGate.wait;
  solvedGate = null;
  await wait(r.game.reducedMotion ? 400 : 1300);
  if (!alive(r) || index === total - 1) return;
  const next = button('arc-btn arc-btn--primary arc-btn--big', tr('act.rover.nextPuzzle'), null);
  const row = el('div', 'arc-row');
  row.append(next);
  body.append(row);
  next.focus({ preventScroll: true });
  await r.until(next);
  r.game.sound.tap();
}

/** The rover, drawn facing north (the map turns it). */
const BOT_SVG = `<svg viewBox="-50 -50 100 100" aria-hidden="true">
  <rect x="-34" y="-30" width="14" height="22" rx="5" fill="#3d3f4a"/><rect x="20" y="-30" width="14" height="22" rx="5" fill="#3d3f4a"/>
  <rect x="-34" y="10" width="14" height="22" rx="5" fill="#3d3f4a"/><rect x="20" y="10" width="14" height="22" rx="5" fill="#3d3f4a"/>
  <rect x="-24" y="-28" width="48" height="56" rx="14" fill="#f4f1ea" stroke="#2c6b62" stroke-width="4"/>
  <rect x="-16" y="-8" width="32" height="26" rx="7" fill="#2fb5ad"/>
  <path d="M0,-46 L12,-30 L-12,-30 Z" fill="#ff8c42"/>
  <circle cx="0" cy="-18" r="9" fill="#2c3e50"/><circle cx="3" cy="-21" r="3" fill="#fff"/>
</svg>`;
