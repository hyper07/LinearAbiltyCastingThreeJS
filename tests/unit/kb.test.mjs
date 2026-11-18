import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { loadIndex, search } from '../../scripts/kb.mjs';
import * as art from '../../src/pixel/art.js';

const index = loadIndex();
const records = index.records ?? index;

test('the knowledge index: every record has an id, a kind and a title, and no id twice', () => {
  assert.ok(records.length > 4000);
  const ids = new Set();
  for (const r of records) {
    assert.ok(r.id && r.kind && r.title, JSON.stringify(r).slice(0, 80));
    assert.ok(!ids.has(r.id), r.id);
    ids.add(r.id);
  }
});

test('the knowledge index: what a record points to is in the repo (models are fetched, not kept)', () => {
  for (const r of records) {
    if (!r.path || r.kind === 'model') continue;
    assert.ok(existsSync(r.path), `${r.id} → ${r.path}`);
  }
});

test('search finds the right thing first for plain words', () => {
  const top = (q, o) => search(index, q, o).map((x) => x.r.id);
  assert.ok(top('trauma screen shake').slice(0, 3).includes('tech.trauma-shake'));
  assert.ok(top('flow field navigation crowd').slice(0, 3).includes('tech.flowfield'));
  assert.ok(top('pixel sprite ramp outline').slice(0, 3).includes('own.pixel.art'));
  assert.ok(top('explosion', { kind: 'pixel-effect' }).length > 0);
  // Models only when asked for.
  assert.ok(top('tank').every((id) => !id.startsWith('model.')));
  assert.ok(top('tank', { models: true }).some((id) => id.startsWith('model.')));
});

test('every vendored collection keeps its licence beside it', () => {
  for (const dir of readdirSync('vendor')) {
    if (dir.startsWith('.')) continue;
    assert.ok(existsSync(`vendor/${dir}/LICENSE`), dir);
  }
  for (const e of JSON.parse(readFileSync('knowledge/pixelfx.json', 'utf8')).effects) assert.ok(existsSync(`vendor/pixelfx/fx/${e.id}.js`), e.id);
});

test('pixel art: a ramp runs dark to light, and a shaded sprite is lit from the top left with an outline', () => {
  const lum = (hex) => parseInt(hex.slice(1, 3), 16) * 0.3 + parseInt(hex.slice(3, 5), 16) * 0.59 + parseInt(hex.slice(5, 7), 16) * 0.11;
  for (const [name, r] of Object.entries(art.RAMPS)) {
    assert.equal(r.length, 5, name);
    for (let i = 1; i < 5; i++) assert.ok(lum(r[i]) > lum(r[i - 1]), name);
  }
  const made = art.ramp('#4a8cc4');
  assert.equal(made.length, 5);
  assert.ok(lum(made[4]) > lum(made[0]));
  const s = art.shadeSprite(['.AAAA.', 'AAAAAA', 'AAAAAA', 'AAAAAA', '.AAAA.'], { A: art.RAMPS.stone }, { canvas: (w, h) => ({ width: w, height: h, getContext: () => ({ fillRect() {}, clearRect() {}, set fillStyle(v) {}, createImageData: (a, b) => ({ data: new Uint8ClampedArray(a * b * 4) }), putImageData() {} }) }) });
  assert.ok(s.width >= 6 && s.height >= 5);
  // Lit from the top left: the top-left body pixel is lighter than the bottom-right one.
  const body = s.pixels.flat().filter(Boolean);
  assert.ok(body.length > 20);
  assert.ok(lum(s.pixels[2][2]) > lum(s.pixels[s.pixels.length - 3][s.pixels[0].length - 3]));
});
