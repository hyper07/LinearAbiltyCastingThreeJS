/**
 * A small SVG line chart for the stock game: one or two series on one axis,
 * a crosshair and a tooltip on hover (and on touch), thin 2px lines, a
 * recessive grid, and the last value labelled at the line's end.
 *
 * Colours are roles (CSS custom properties in market.css), never series rank:
 * `--viz-1` is "you" / the stock, `--viz-2` the market.
 *
 * @param {HTMLElement} host
 * @param {{
 *   labels: string[],                                   // x: one per point (dates)
 *   series: { name: string, values: (number|null)[], color: string }[],
 *   format: (v: number) => string,                       // the y values, in words
 *   height?: number
 * }} data
 */
export function lineChart(host, { labels, series, format, height = 220 }) {
  host.replaceChildren();
  host.classList.add('mk-chart');
  const width = Math.max(280, host.clientWidth || 560);
  const pad = { top: 12, right: 64, bottom: 22, left: 8 };
  const all = series.flatMap((s) => s.values).filter((v) => v != null);
  if (!all.length || labels.length < 1) {
    host.textContent = 'No prices yet.';
    return;
  }
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (lo === hi) {
    lo *= 0.98;
    hi *= 1.02;
  }
  const span = hi - lo;
  lo -= span * 0.06;
  hi += span * 0.06;
  const n = labels.length;
  const x = (i) => pad.left + (n === 1 ? (width - pad.left - pad.right) / 2 : (i / (n - 1)) * (width - pad.left - pad.right));
  const y = (v) => pad.top + (1 - (v - lo) / (hi - lo)) * (height - pad.top - pad.bottom);

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', String(height));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', series.map((s) => `${s.name}: ${format(s.values.findLast((v) => v != null))}`).join('; '));
  const make = (tag, attrs, parent = svg) => {
    const node = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    parent.append(node);
    return node;
  };

  // A recessive grid: three lines, values on the right.
  for (let k = 0; k <= 2; k++) {
    const v = lo + ((hi - lo) * (k + 0.5)) / 3;
    make('line', { x1: pad.left, x2: width - pad.right, y1: y(v), y2: y(v), class: 'mk-chart__grid' });
    make('text', { x: width - pad.right + 6, y: y(v) + 4, class: 'mk-chart__axis' }).textContent = format(v);
  }
  make('text', { x: pad.left, y: height - 6, class: 'mk-chart__axis' }).textContent = labels[0];
  if (n > 1) make('text', { x: width - pad.right, y: height - 6, class: 'mk-chart__axis', 'text-anchor': 'end' }).textContent = labels[n - 1];

  for (const s of series) {
    let d = '';
    s.values.forEach((v, i) => {
      if (v == null) return;
      d += `${d && s.values[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    });
    make('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    const lastIndex = s.values.findLastIndex((v) => v != null);
    if (lastIndex >= 0) make('circle', { cx: x(lastIndex), cy: y(s.values[lastIndex]), r: 4, fill: s.color, class: 'mk-chart__end' });
  }

  // Hover: a crosshair and every series' value that day.
  const cross = make('line', { y1: pad.top, y2: height - pad.bottom, class: 'mk-chart__cross', visibility: 'hidden' });
  const dots = series.map((s) => make('circle', { r: 4, fill: s.color, class: 'mk-chart__dot', visibility: 'hidden' }));
  const hit = make('rect', { x: 0, y: 0, width, height, fill: 'transparent' });
  host.append(svg);
  const tip = document.createElement('div');
  tip.className = 'mk-chart__tip';
  tip.hidden = true;
  host.append(tip);
  const show = (clientX) => {
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * width;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - pad.left) / (width - pad.left - pad.right)) * (n - 1))));
    cross.setAttribute('x1', x(i));
    cross.setAttribute('x2', x(i));
    cross.setAttribute('visibility', 'visible');
    series.forEach((s, k) => {
      const v = s.values[i];
      dots[k].setAttribute('visibility', v == null ? 'hidden' : 'visible');
      if (v != null) {
        dots[k].setAttribute('cx', x(i));
        dots[k].setAttribute('cy', y(v));
      }
    });
    tip.replaceChildren();
    const head = document.createElement('strong');
    head.textContent = labels[i];
    tip.append(head);
    for (const s of series) {
      const row = document.createElement('span');
      const key = document.createElement('i');
      key.style.background = s.color;
      row.append(key, `${s.name} ${s.values[i] == null ? '—' : format(s.values[i])}`);
      tip.append(row);
    }
    tip.hidden = false;
    const left = (x(i) / width) * box.width;
    tip.style.left = `${Math.min(box.width - 170, Math.max(0, left + 12))}px`;
  };
  const hide = () => {
    cross.setAttribute('visibility', 'hidden');
    for (const d of dots) d.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  };
  hit.addEventListener('pointermove', (e) => show(e.clientX));
  hit.addEventListener('pointerdown', (e) => show(e.clientX));
  hit.addEventListener('pointerleave', hide);

  // Two series: a legend (identity never by colour alone).
  if (series.length > 1) {
    const legend = document.createElement('div');
    legend.className = 'mk-chart__legend';
    for (const s of series) {
      const item = document.createElement('span');
      const key = document.createElement('i');
      key.style.background = s.color;
      item.append(key, `${s.name} ${format(s.values.findLast((v) => v != null))}`);
      legend.append(item);
    }
    host.prepend(legend);
  }
}
