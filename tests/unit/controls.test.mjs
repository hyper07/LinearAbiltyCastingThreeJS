import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collisions, codesFor, hintItems, shouldAutoOpen, setAutoOpen } from '../../src/shared/helpPanel.js';
import { CAMERA_KEYS } from '../../src/shared/cameraAssist.js';
import { MAP_KEY } from '../../src/shared/worldMap.js';
import { CONTROLS as GR } from '../../src/gloamreach/controls.js';
import { CONTROLS as WH } from '../../src/wyldhunt/controls.js';
import { CONTROLS as KV } from '../../src/kithvale/controls.js';
import { CONTROLS as LW } from '../../src/hd2d/controls.js';
import { CONTROLS as KW } from '../../src/kindlewatch/controls.js';
import { CONTROLS as SP } from '../../src/snowpuff/controls.js';
import { CONTROLS as SB } from '../../src/stoneball/controls.js';
import { CONTROLS as SE } from '../../src/city/controls.js';

const TABLES = { gloamreach: GR, wyldhunt: WH, kithvale: KV, lanternwood: LW, kindlewatch: KW, snowpuff: SP, stoneball: SB, seoul: SE };
const ITEM_ROWS = /^(hpPotion|mpPotion|potion|items|treats|eat)$/;

test('controls: one table per game, nothing bound twice, H is How to play everywhere', () => {
  for (const [id, t] of Object.entries(TABLES)) {
    assert.deepEqual(collisions(t), [], `${id} has a key bound twice`);
    assert.ok(codesFor(t, 'help').includes('KeyH'), `${id}: H opens How to play`);
    assert.ok(t.goal && t.goal.length > 40, `${id}: a how-to-play blurb`);
    for (const g of t.groups) for (const r of g.rows) assert.ok(r.keys.length && r.does, `${id}: ${r.id} says what it does`);
  }
});

test('controls: items and potions on number keys — never Q, E or R', () => {
  for (const [id, t] of Object.entries(TABLES)) {
    for (const g of t.groups) for (const r of g.rows) {
      if (!ITEM_ROWS.test(r.id)) continue;
      for (const c of r.codes) assert.match(c, /^Digit[1-9]$/, `${id}: ${r.id} on ${c}`);
    }
  }
  assert.deepEqual(codesFor(GR, 'hpPotion'), ['Digit5']);
  assert.deepEqual(codesFor(GR, 'mpPotion'), ['Digit6']);
  assert.deepEqual(codesFor(GR, 'skills'), ['Digit1', 'Digit2', 'Digit3', 'Digit4']);
  assert.deepEqual(codesFor(KW, 'summon'), ['Digit1']);
  assert.deepEqual(codesFor(KW, 'potion'), ['Digit5']);
  assert.deepEqual(codesFor(WH, 'items'), ['Digit5', 'Digit6', 'Digit7', 'Digit8']);
  assert.deepEqual(codesFor(LW, 'hpPotion'), ['Digit5']);
});

test('controls: the camera and map keys are the shared ones, and clash with nothing', () => {
  for (const [id, t] of Object.entries({ gloamreach: GR, wyldhunt: WH, kithvale: KV, lanternwood: LW })) {
    const turn = codesFor(t, 'camTurn');
    assert.ok(turn.includes(CAMERA_KEYS.left) && turn.includes(CAMERA_KEYS.right), `${id}: , . turn`);
    assert.deepEqual(codesFor(t, 'camBehind'), [CAMERA_KEYS.recenter]);
    assert.ok(codesFor(t, 'map').includes(MAP_KEY), `${id}: O is the map`);
  }
  assert.ok(codesFor(KW, 'map').includes(MAP_KEY));
  // Gangnam Jarani: the horn moved off H.
  assert.deepEqual(codesFor(SE, 'horn'), ['KeyB']);
});

test('controls: the on-screen hint is drawn from the same rows', () => {
  for (const [id, t] of Object.entries(TABLES)) {
    const items = hintItems(t);
    for (const h of items) assert.ok(h.keys.length && h.does, id);
  }
  assert.ok(hintItems(GR).some((h) => h.keys.join() === '5' && /heal/.test(h.does)));
});

test('help: opens by itself until "don\'t show again", storage that throws still works', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  assert.equal(shouldAutoOpen('gloamreach', { storage }), true);
  setAutoOpen('gloamreach', false, { storage });
  assert.equal(shouldAutoOpen('gloamreach', { storage }), false);
  assert.equal(shouldAutoOpen('kithvale', { storage }), true, 'each game its own');
  setAutoOpen('gloamreach', true, { storage });
  assert.equal(shouldAutoOpen('gloamreach', { storage }), true);
  const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); }, removeItem() { throw new Error('no'); } };
  assert.equal(shouldAutoOpen('x', { storage: broken }), true);
  assert.equal(setAutoOpen('x', false, { storage: broken }), false);
});
