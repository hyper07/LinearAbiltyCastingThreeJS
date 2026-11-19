/**
 * The parents' weekly report, drawn from rules.js buildReport(): stat tiles,
 * minutes a day by subject (stacked columns), quiz accuracy this week
 * against last (a dot for each week on one 0–100 % axis), what is worth
 * practising, and recent activity. Every chart has hover/focus tooltips and
 * a table view; subject colours are fixed (validated for colour vision,
 * light and dark — see docs/arcademia.md). Used in the game (ParentsView)
 * and on the read-only share page (parent-report.html).
 */
import './report.css';

const SUBJECTS = [
  { id: 'math', name: 'Math' },
  { id: 'history', name: 'History' },
  { id: 'physics', name: 'Physics' }
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const h = (tag, cls = '', text = null, attrs = {}) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
const svgEl = (tag, attrs = {}) => {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : m > 0 && m < 1 ? 'under 1 min' : `${Math.round(m)} min`);
const fmtVal = (m) => (m > 0 && m < 0.5 ? '<1' : m < 10 ? String(Math.round(m * 10) / 10) : String(Math.round(m)));

/** One tooltip per report, values first, labels second (dataviz interaction rules). */
function tooltip(root) {
  const tip = h('div', 'rep-tip', null, { role: 'tooltip' });
  tip.hidden = true;
  root.append(tip);
  return {
    show(x, y, title, rows) {
      tip.replaceChildren(h('div', 'rep-tip__title', title));
      for (const r of rows) {
        const row = h('div', 'rep-tip__row');
        const key = h('i', `rep-key rep-key--${r.id ?? 'none'}`);
        row.append(key, h('strong', null, r.value), h('span', null, r.label));
        tip.append(row);
      }
      tip.hidden = false;
      const box = root.getBoundingClientRect();
      tip.style.left = `${Math.min(box.width - 200, Math.max(8, x - box.left + 12))}px`;
      tip.style.top = `${Math.max(8, y - box.top - 10)}px`;
    },
    hide() {
      tip.hidden = true;
    }
  };
}

function bindTip(el, tip, title, rows) {
  const show = (e) => {
    const r = el.getBoundingClientRect();
    tip.show(e?.clientX ?? r.left + r.width / 2, e?.clientY ?? r.top, title, rows);
    el.classList.add('is-hover');
  };
  const hide = () => {
    tip.hide();
    el.classList.remove('is-hover');
  };
  el.addEventListener('pointermove', show);
  el.addEventListener('pointerleave', hide);
  el.addEventListener('focus', () => show(null));
  el.addEventListener('blur', hide);
}

export function renderReport(host, report, { title = 'Weekly learning report', share = null } = {}) {
  const root = h('section', 'arc-report');
  const tip = tooltip(root);
  const head = h('header', 'rep-head');
  const weekLabel = new Date(`${report.weekOf}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  head.append(h('h2', null, title), h('p', 'rep-sub', `Week of ${weekLabel}`));
  root.append(head);

  // Stat tiles: the numbers that are the story.
  const tiles = h('div', 'rep-tiles');
  const tile = (value, label, sub = '') => {
    const t = h('div', 'rep-tile');
    t.append(h('strong', 'rep-tile__value', value), h('span', 'rep-tile__label', label));
    if (sub) t.append(h('span', 'rep-tile__sub', sub));
    tiles.append(t);
  };
  tile(fmtMin(report.minutes), 'studied this week');
  tile(String(report.lessonsThisWeek), 'lessons finished', report.lessonsLastWeek != null ? `${report.lessonsLastWeek} last week` : '');
  tile(`${report.stars} ★`, 'stars earned', `of ${report.starsOf}`);
  tile(`Floor ${report.floorReached}`, 'reached', `of ${report.floorsOf}`);
  tile(`${report.streak} 🔥`, report.streak === 1 ? 'day streak' : 'days in a row');
  root.append(tiles);

  // Legend (always, for 3 series), shared by both charts.
  const legend = h('ul', 'rep-legend', null, { 'aria-label': 'Subjects' });
  for (const s of SUBJECTS) {
    const li = h('li');
    li.append(h('i', `rep-key rep-key--${s.id} rep-key--box`), h('span', null, s.name));
    legend.append(li);
  }

  // Minutes per day, stacked by subject.
  const c1 = h('figure', 'rep-card');
  c1.append(h('figcaption', 'rep-card__title', 'Minutes studied each day'), legend.cloneNode(true));
  // Narrow screens get a narrower drawing, so the labels stay readable.
  const W = Math.max(330, Math.min(560, (host.clientWidth || 560) - 40)), H = 220, padL = 34, padB = 26, padT = 10;
  const max = Math.max(4, ...report.days.map((d) => SUBJECTS.reduce((s, x) => s + d[x.id], 0)));
  const step = [1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120].find((v) => v * 4 >= max) ?? Math.ceil(max / 4);
  const nice = step * 4;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'rep-chart', role: 'img', 'aria-label': 'Minutes studied each day this week, by subject' });
  for (let k = 0; k <= 4; k++) {
    const y = padT + (H - padT - padB) * (1 - k / 4);
    svg.append(svgEl('line', { x1: padL, x2: W - 6, y1: y, y2: y, class: k ? 'rep-grid' : 'rep-axis' }));
    const t = svgEl('text', { x: padL - 6, y: y + 4, class: 'rep-tick', 'text-anchor': 'end' });
    t.textContent = String(Math.round((nice * k) / 4));
    svg.append(t);
  }
  const band = (W - padL - 6) / 7;
  const bw = Math.min(24, band * 0.5);
  report.days.forEach((d, i) => {
    const x = padL + band * i + (band - bw) / 2;
    let y = H - padB;
    const total = SUBJECTS.reduce((s, x2) => s + d[x2.id], 0);
    const g = svgEl('g', { class: 'rep-col', tabindex: '0', role: 'img', 'aria-label': `${DAYS[i]}: ${Math.round(total)} minutes` });
    const visible = SUBJECTS.filter((s) => d[s.id] > 0);
    visible.forEach((s, k) => {
      const hgt = ((H - padT - padB) * d[s.id]) / nice;
      const top = k === visible.length - 1;
      // A 2px surface gap between segments; the top segment gets the rounded data-end.
      const segH = Math.max(0, hgt - (k ? 2 : 0));
      y -= hgt;
      g.append(top ? svgEl('path', { d: roundTop(x, y, bw, segH, Math.min(4, segH)), class: `rep-fill rep-fill--${s.id}` }) : svgEl('rect', { x, y: y + (k ? 0 : 0), width: bw, height: segH, class: `rep-fill rep-fill--${s.id}` }));
    });
    g.append(svgEl('rect', { x: padL + band * i, y: padT, width: band, height: H - padT - padB, class: 'rep-hit' }));
    const lab = svgEl('text', { x: x + bw / 2, y: H - 8, class: 'rep-tick', 'text-anchor': 'middle' });
    lab.textContent = DAYS[i];
    g.append(lab);
    if (total > 0 && total === Math.max(...report.days.map((dd) => SUBJECTS.reduce((s, x2) => s + dd[x2.id], 0)))) {
      const v = svgEl('text', { x: x + bw / 2, y: H - padB - ((H - padT - padB) * total) / nice - 6, class: 'rep-val', 'text-anchor': 'middle' });
      v.textContent = fmtVal(total);
      g.append(v);
    }
    bindTip(g, tip, `${DAYS[i]} · ${fmtVal(total)} min`, SUBJECTS.map((s) => ({ id: s.id, value: `${fmtVal(d[s.id])} min`, label: s.name })));
    svg.append(g);
  });
  c1.append(svg);
  c1.append(tableView(['Day', ...SUBJECTS.map((s) => `${s.name} (min)`)], report.days.map((d, i) => [DAYS[i], ...SUBJECTS.map((s) => fmtVal(d[s.id]))])));
  root.append(c1);

  // Accuracy: this week (filled) against last week (ring), one 0–100 % axis.
  const c2 = h('figure', 'rep-card');
  c2.append(h('figcaption', 'rep-card__title', 'Quiz accuracy — this week (●) and last week (○)'));
  const W2 = W, rowH = 46, H2 = rowH * 3 + 30, x0 = 90, x1 = W2 - 20;
  const s2 = svgEl('svg', { viewBox: `0 0 ${W2} ${H2}`, class: 'rep-chart', role: 'img', 'aria-label': 'Quiz accuracy by subject, this week compared with last week' });
  for (let k = 0; k <= 4; k++) {
    const x = x0 + ((x1 - x0) * k) / 4;
    s2.append(svgEl('line', { x1: x, x2: x, y1: 6, y2: H2 - 22, class: 'rep-grid' }));
    const t = svgEl('text', { x, y: H2 - 6, class: 'rep-tick', 'text-anchor': 'middle' });
    t.textContent = `${k * 25}%`;
    s2.append(t);
  }
  const X = (p) => x0 + ((x1 - x0) * p) / 100;
  report.accuracy.forEach((a, i) => {
    const y = 26 + i * rowH;
    const g = svgEl('g', { class: 'rep-col', tabindex: '0', role: 'img', 'aria-label': `${a.name}: ${a.this == null ? 'no answers' : `${a.this}%`} this week, ${a.last == null ? 'none' : `${a.last}%`} last week` });
    const lab = svgEl('text', { x: x0 - 10, y: y + 5, class: 'rep-label', 'text-anchor': 'end' });
    lab.textContent = a.name;
    g.append(lab);
    if (a.this != null && a.last != null) g.append(svgEl('line', { x1: X(a.last), x2: X(a.this), y1: y, y2: y, class: `rep-link rep-stroke--${a.subject}` }));
    if (a.last != null) g.append(svgEl('circle', { cx: X(a.last), cy: y, r: 6, class: `rep-dot-last rep-stroke--${a.subject}` }));
    if (a.this != null) {
      g.append(svgEl('circle', { cx: X(a.this), cy: y, r: 7, class: `rep-dot rep-fill--${a.subject}` }));
      const v = svgEl('text', { x: X(a.this), y: y - 13, class: 'rep-val', 'text-anchor': 'middle' });
      v.textContent = `${a.this}%`;
      g.append(v);
    } else {
      const v = svgEl('text', { x: x0 + 6, y: y + 5, class: 'rep-tick' });
      v.textContent = 'no questions yet this week';
      g.append(v);
    }
    g.append(svgEl('rect', { x: 0, y: y - rowH / 2, width: W2, height: rowH, class: 'rep-hit' }));
    bindTip(g, tip, a.name, [
      { id: a.subject, value: a.this == null ? '—' : `${a.this}%`, label: `this week (${a.answers} answers)` },
      { id: 'none', value: a.last == null ? '—' : `${a.last}%`, label: 'last week' }
    ]);
    s2.append(g);
  });
  c2.append(s2);
  c2.append(tableView(['Subject', 'This week', 'Last week', 'Answers'], report.accuracy.map((a) => [a.name, a.this == null ? '—' : `${a.this}%`, a.last == null ? '—' : `${a.last}%`, String(a.answers)])));
  root.append(c2);

  // Worth practising, and recent activity.
  const two = h('div', 'rep-two');
  const c3 = h('section', 'rep-card');
  c3.append(h('h3', 'rep-card__title', 'Worth practising'));
  if (!report.practice.length) c3.append(h('p', 'rep-empty', 'Nothing stands out — every topic tried this fortnight went well.'));
  else {
    const ul = h('ul', 'rep-list');
    for (const p of report.practice) {
      const li = h('li');
      const total = p.right + p.wrong;
      li.append(h('i', `rep-key rep-key--${p.subject} rep-key--box`), h('strong', null, p.name), h('span', null, `${p.subjectName} · ${p.wrong} of ${total} missed`));
      ul.append(li);
    }
    c3.append(ul);
  }
  const c4 = h('section', 'rep-card');
  c4.append(h('h3', 'rep-card__title', 'Recent activity'));
  if (!report.recent.length) c4.append(h('p', 'rep-empty', 'No lessons yet. They will show up here.'));
  else {
    const ul = h('ul', 'rep-list');
    for (const r of report.recent) {
      const li = h('li');
      const when = new Date(r.at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
      li.append(h('i', `rep-key rep-key--${r.subject} rep-key--box`), h('strong', null, r.title), h('span', null, `${r.kind === 'lesson' ? `finished · ${'★'.repeat(r.stars ?? 0)}${'☆'.repeat(3 - (r.stars ?? 0))} · ${r.score}/${r.total}` : 'read the cards'} · ${when}`));
      ul.append(li);
    }
    c4.append(ul);
  }
  two.append(c3, c4);
  root.append(two);
  if (share) root.append(share);
  host.append(root);
  return root;
}

function roundTop(x, y, w, hgt, r) {
  if (hgt <= 0) return '';
  r = Math.min(r, w / 2, hgt);
  return `M${x} ${y + hgt}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + hgt}Z`;
}

function tableView(headers, rows) {
  const d = h('details', 'rep-table');
  d.append(h('summary', null, 'Show as a table'));
  const t = h('table');
  const tr = h('tr');
  for (const c of headers) tr.append(h('th', null, c, { scope: 'col' }));
  const thead = h('thead');
  thead.append(tr);
  const tb = h('tbody');
  for (const r of rows) {
    const row = h('tr');
    r.forEach((c, i) => row.append(h(i ? 'td' : 'th', null, c, i ? {} : { scope: 'row' })));
    tb.append(row);
  }
  t.append(thead, tb);
  d.append(t);
  return d;
}
