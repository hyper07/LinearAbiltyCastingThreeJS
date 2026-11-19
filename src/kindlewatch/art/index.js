/**
 * Paint every sprite of the keep into the atlas, a few at a time (the
 * loading bar moves and the page stays responsive).
 */
import * as P from './props.js';

const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

export function propJobs() {
  const jobs = [];
  const add = (fn) => jobs.push(fn);
  let seed = 1;
  for (const [key, h, counts] of [['1.7', 1.7, [5, 4]], ['1', 1.0, [3, 3]], ['0.45', 0.45, [3, 3]]]) {
    for (const w of [1, 2]) {
      for (let i = 0; i < counts[w - 1]; i++) {
        const s = seed++;
        add(() => P.block(`wall-${key}-w${w}-${i}`, { frontH: h, w, seed: s * 11, cap: [1, 0.75, 0.5, 0.9, 0.35][i % 5], style: (i + w) % 3 === 2 ? 'rough' : 'brick', ice: h > 1 ? 0.5 : 0.2, inset: 0.02 }));
      }
    }
  }
  for (let i = 0; i < 6; i++) add(() => P.deepTop(`deep-${i}`, { seed: 100 + i }));
  for (let i = 0; i < 3; i++) add(() => P.block(`block-${i}`, { frontH: 1, seed: 200 + i, cap: i === 1 ? 0.7 : 0.95, style: i === 2 ? 'rough' : 'brick', inset: 0.04 }));
  for (let i = 0; i < 2; i++) add(() => P.pillar(`pillar-${i}`, { frontH: 2.4, seed: 300 + i }));
  for (const lit of [false, true]) {
    add(() => P.brazier(`brazier${lit ? '-lit' : ''}`, { lit, seed: 7 }));
    add(() => P.brazier(`greatbrazier${lit ? '-lit' : ''}`, { lit, great: true, seed: 9 }));
    add(() => P.torch(`torch${lit ? '-lit' : ''}`, { lit }));
  }
  for (let i = 0; i < 2; i++) add(() => P.banner(`banner-${i}`, { seed: 400 + i, color: i ? P.RAMPS.cloth : ['#0e1a2e', '#1a2c4e', '#284474', '#3c64a0', '#6a94cc'] }));
  add(() => P.barricade('barricade', { seed: 3 }));
  add(() => P.barricade('barricade-broken', { seed: 4, broken: true }));
  for (let i = 0; i < 3; i++) add(() => P.crate(`crate-${i}`, { seed: 500 + i }));
  for (let i = 0; i < 3; i++) add(() => P.pot(`pot-${i}`, { seed: 600 + i }));
  for (let i = 0; i < 3; i++) add(() => P.fence(`fence-${i}`, { seed: 700 + i }));
  for (let i = 0; i < 3; i++) add(() => P.block(`lowwall-${i}`, { frontH: 0.85, seed: 800 + i, cap: 0.8, style: 'brick', ice: 0.3, inset: 0.02 }));
  for (let i = 0; i < 3; i++) add(() => P.hedge(`hedge-${i}`, { seed: 900 + i }));
  add(() => P.tree('tree', { seed: 31 }));
  add(() => P.statue('statue', { seed: 33 }));
  add(() => P.bench('bench', { seed: 35 }));
  add(() => P.sarcophagus('sarcophagus', { seed: 37 }));
  add(() => P.fountain('fountain', { seed: 39 }));
  add(() => P.throne('throne', { seed: 41 }));
  for (let lit = 0; lit <= 3; lit++) add(() => P.gate(`gate-${lit}`, { lit }));
  add(() => P.gate('gate-open', { lit: 3, open: true }));
  for (let i = 0; i < 3; i++) add(() => P.rubble(`rubble-${i}`, { seed: 1000 + i }));
  for (let i = 0; i < 3; i++) add(() => P.bones(`bones-${i}`, { seed: 1100 + i }));
  for (let i = 0; i < 4; i++) add(() => P.grass(`grass-${i}`, { seed: 1200 + i }));
  add(() => P.footprint('footprint'));
  return jobs;
}

/** Run painting jobs into the atlas, reporting progress (0…1). */
export async function paintAll(atlas, jobs, onProgress) {
  let last = performance.now();
  for (let i = 0; i < jobs.length; i++) {
    atlas.add(jobs[i]());
    if (performance.now() - last > 40) {
      onProgress?.(i / jobs.length);
      await yieldFrame();
      last = performance.now();
    }
  }
  onProgress?.(1);
}
