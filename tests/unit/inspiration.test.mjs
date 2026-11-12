import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTRIES, featureGaps, likeWork, findWorks, specFrom } from '../../src/catalog/inspiration/index.js';
import { validateEntries } from '../../src/catalog/inspiration/validate.js';
import { normalizeSpec } from '../../src/blueprints/spec.js';

test('every catalog entry uses the shared vocabulary', () => {
  assert.ok(ENTRIES.length >= 40, `only ${ENTRIES.length} entries`);
  assert.deepEqual(validateEntries(ENTRIES), []);
});

test('a work becomes a game spec the builder accepts', () => {
  for (const entry of ENTRIES) {
    const spec = specFrom(entry.id);
    assert.deepEqual(normalizeSpec(spec).genre, entry.blueprint.genre, entry.id);
    assert.ok(!spec.name || !spec.name.includes(entry.title), `${entry.id}: the spec must not carry the work's title`);
  }
});

test('search finds works by title, genre and feature', () => {
  assert.equal(findWorks('solo leveling')[0]?.id, 'solo-leveling');
  assert.ok(findWorks('', { genre: 'rts' }).length >= 2);
  assert.ok(findWorks('', { feature: 'battle-royale-storm' }).length >= 2);
  assert.ok(likeWork('solo-leveling').text.length < 900, 'the AI hint stays short');
});

test('feature gaps rank what we lack by how many works use it', () => {
  const gaps = featureGaps();
  assert.ok(gaps.length > 5);
  assert.ok(gaps.every((g) => g.status !== 'have'));
  for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i - 1].works >= gaps[i].works);
});
